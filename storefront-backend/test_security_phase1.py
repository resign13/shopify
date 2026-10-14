"""Storefront phase-one scope; fixtures are guarded by test_style_catalog."""
import io
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from flask.testing import FlaskClient
from PIL import Image
from werkzeug.security import generate_password_hash
import test_style_catalog as fixtures

app, db = fixtures.application, fixtures.db


class StorePhaseOneTest(unittest.TestCase):
    def setUp(self):
        fixtures.StyleCatalogTest().setUp()
        self.mode = patch.object(app.media, 'mode', 'legacy')
        self.mode.start(); self.addCleanup(self.mode.stop)
        self.login_gate = patch.object(app.security, 'login_protection', False)
        self.login_gate.start(); self.addCleanup(self.login_gate.stop)
        with db._connect() as conn:
            conn.execute('TRUNCATE security_rate_buckets,security_audit_events,security_request_metrics')
            conn.execute('UPDATE store_users SET password_hash=%s WHERE id=1', (generate_password_hash('Fixture-2026', method='pbkdf2:sha256:1000'),))
        self.client = FlaskClient(app.app, app.app.response_class)
        csrf = self.client.get('/api/auth/csrf').json['csrfToken']
        self.pre = {'Origin': 'http://localhost', 'X-CSRF-Token': csrf}

    def login(self):
        r = self.client.post('/api/auth/store/login', json={'email': 'fixture@catalog.test', 'password': 'Fixture-2026'}, headers=self.pre)
        self.assertEqual(r.status_code, 200, r.json)
        self.headers = {'Origin': 'http://localhost', 'X-CSRF-Token': r.json['csrfToken'], 'X-Auth-Session': r.json['sessionId']}

    def test_login_cooldown_and_ip_request_cap_remain_deferred(self):
        for _ in range(101):
            r = self.client.post('/api/auth/store/login', json={'email': 'fixture@catalog.test', 'password': 'wrong'}, headers=self.pre)
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r.json['message'], 'Invalid account or password.')
            self.assertNotIn('Retry-After', r.headers)
        self.login()
        keys = [app.security.digest('quota:store:login-ip:127.0.0.1'), app.security.digest('login-account:store:fixture@catalog.test')]
        with db._connect() as conn:
            self.assertIsNone(conn.execute('SELECT 1 FROM security_rate_buckets WHERE bucket_key=ANY(%s)', (keys,)).fetchone())

    def test_new_uploads_keep_legacy_urls_and_existing_preview_policy(self):
        self.login()
        image = io.BytesIO(); Image.new('RGB', (4, 4), 'blue').save(image, format='PNG')
        with TemporaryDirectory() as directory, patch.dict(app.media.uploads, {'store': Path(directory)}):
            r = self.client.post('/api/order-attachments', data={'files': (io.BytesIO(image.getvalue()), 'fixture.png')}, headers=self.headers)
            self.assertEqual(r.status_code, 200, r.json)
            url = r.json['urls'][0]
            self.assertIn('/uploads/', url)
            guest = FlaskClient(app.app, app.app.response_class)
            response = guest.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, image.getvalue()); response.close()
            original = {'labelImageUrls': [url]}
            self.assertIs(app.media.rewrite(original), original)

    def test_home_auth_csrf_and_upload_type_checks_still_apply(self):
        self.assertEqual(self.client.get('/api/home').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/store/login', json={}).status_code, 403)
        self.login()
        r = self.client.post('/api/order-attachments', data={'files': (io.BytesIO(b'MZ executable'), 'bad.png')}, headers=self.headers)
        self.assertEqual(r.status_code, 400, r.json)
        self.assertEqual(self.client.get('/api/home').headers['Cache-Control'], 'no-store')


if __name__ == '__main__':
    unittest.main()
