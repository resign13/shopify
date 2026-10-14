"""Storefront cookie, CSRF, customer isolation and atomic stock tests.

The imported catalog fixture refuses every database except an explicit local
*_test target. Real FlaskClient cookies are used, never the bearer adapter.
"""
import io
import os
import unittest
from unittest.mock import patch
from flask.testing import FlaskClient
from PIL import Image
from werkzeug.security import generate_password_hash
import test_style_catalog as fixtures
from security_core import token_hash

app, db = fixtures.application, fixtures.db


class StoreSecurityTest(unittest.TestCase):
    def setUp(self):
        self.media_patch = patch.object(app.media, 'mode', 'private')
        self.media_patch.start(); self.addCleanup(self.media_patch.stop)
        fixtures.StyleCatalogTest().setUp()
        with db._connect() as conn:
            conn.execute('TRUNCATE security_file_refs,security_files,security_rate_buckets,security_audit_events,security_request_metrics')
            password = generate_password_hash('Fixture-Strong-Password-2026', method='pbkdf2:sha256:1000')
            conn.execute('UPDATE store_users SET password_hash=%s WHERE id=1', (password,))
            conn.execute("INSERT INTO store_users(name,email,password_hash,status) VALUES('Second fixture','second@catalog.test',%s,'active')", (password,))
        self.client = self.login()

    def bare(self): return FlaskClient(app.app, app.app.response_class)

    def login(self, email='fixture@catalog.test'):
        client = self.bare()
        csrf = client.get('/api/auth/csrf').json['csrfToken']
        response = client.post('/api/auth/store/login', json={'email':email,'password':'Fixture-Strong-Password-2026'},
            headers={'Origin':'http://localhost','X-CSRF-Token':csrf})
        self.assertEqual(response.status_code, 200, response.json)
        self.assertNotIn('token', response.json)
        client.csrf, client.public_id = response.json['csrfToken'], response.json['sessionId']
        return client

    def headers(self, client=None):
        client = client or self.client
        return {'Origin':'http://localhost','X-CSRF-Token':client.csrf,'X-Auth-Session':client.public_id}

    def payload(self, **extra):
        return {'contact':{'value':'fixture@catalog.test'},
            'delivery':{'country':'DE','lastName':'Fixture','address':'Fixture street','city':'Berlin','state':'Berlin','zip':'10000'},
            'items':[{'productId':2,'sizeCode':'28/S','quantity':2}], **extra}

    def stock(self):
        with db._connect() as conn:
            return conn.execute("SELECT stock FROM product_size_prices WHERE product_id=2 AND size_code='28/S'").fetchone()['stock']

    def upload(self):
        photo=io.BytesIO();Image.new('RGB',(4,4),'white').save(photo,format='PNG');photo.seek(0)
        r=self.client.post('/api/order-attachments',data={'files':(photo,'fixture.png')},headers=self.headers())
        self.assertEqual(r.status_code,200,r.json)
        return r.json['urls'][0]

    def test_home_catalog_inventory_require_cookie_and_hide_internal_fields(self):
        guest=self.bare()
        for path in ['/api/home','/api/catalog/styles','/api/products','/api/store/orders']:
            self.assertEqual(guest.get(path).status_code,401)
            self.assertEqual(guest.get(path,headers={'Authorization':'Bearer '+fixtures.application.create_session({'id':2})}).status_code,401)
        response=self.client.get('/api/catalog/styles')
        self.assertEqual(response.status_code,200)
        for field in ['weightGrams','contractPending','pendingInbound','defectivePending','costCny']:
            self.assertNotIn(field,str(response.json))
        self.assertEqual(response.headers['Cache-Control'],'no-store')
        self.assertNotIn('Access-Control-Allow-Origin',response.headers)

    def test_thirty_day_absolute_expiry_single_login_and_logout(self):
        cookie=self.client.get_cookie(app.security.cookie)
        self.assertTrue(cookie.http_only);self.assertEqual(cookie.same_site,'Lax')
        with db._connect() as conn:
            row=conn.execute('SELECT * FROM store_sessions WHERE token_hash=%s',(token_hash(cookie.value),)).fetchone()
        self.assertAlmostEqual((row['expires_at']-row['created_at']).total_seconds(),30*86400,delta=10)
        self.client.get('/api/auth/me')
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT expires_at FROM store_sessions WHERE id=%s',(row['id'],)).fetchone()['expires_at'],row['expires_at'])
        newer=self.login();self.assertEqual(self.client.get('/api/auth/me').status_code,401)
        self.assertEqual(newer.post('/api/auth/logout',headers=self.headers(newer)).status_code,200)
        self.assertEqual(newer.get('/api/auth/me').status_code,401)

    def test_csrf_wrong_origin_stale_session_and_limit_do_not_deduct_stock(self):
        before=self.stock()
        for headers in [{}, {'Origin':'https://outside.test',**{'X-CSRF-Token':self.client.csrf}},
                {**self.headers(),'X-Auth-Session':'another-session'}]:
            r=self.client.post('/api/orders',json=self.payload(),headers=headers)
            self.assertIn(r.status_code,[403,409])
            self.assertEqual(self.stock(),before)
        with patch.dict(os.environ,{'SECURITY_LIMIT_WRITE':'1'}):
            first=self.client.post('/api/orders',json=self.payload(),headers=self.headers())
            self.assertEqual(first.status_code,201,first.json)
            second=self.client.post('/api/orders',json=self.payload(),headers=self.headers())
            self.assertEqual(second.status_code,429,second.json)
            self.assertTrue(int(second.headers['Retry-After'])>0)
        self.assertEqual(self.stock(),before-2)

    def test_unbound_and_order_attachment_customer_isolation_and_cancel(self):
        url=self.upload();other=self.login('second@catalog.test');guest=self.bare()
        self.assertEqual(self.client.get(url).status_code,200)
        self.assertIn(guest.get(url).status_code,[401,404]);self.assertEqual(other.get(url).status_code,404)
        before=self.stock()
        result=self.client.post('/api/orders',json=self.payload(labelImageUrls=[url]),headers=self.headers())
        self.assertEqual(result.status_code,201,result.json)
        oid=result.json['order']['id']
        self.assertEqual(self.stock(),before-2)
        self.assertEqual(len(self.client.get('/api/store/orders').json['items']),1)
        self.assertEqual(other.get('/api/store/orders').json['items'],[])
        self.assertEqual(other.post(f'/api/store/orders/{oid}/cancel',headers=self.headers(other)).status_code,404)
        self.assertEqual(self.stock(),before-2)
        self.assertEqual(self.client.post(f'/api/store/orders/{oid}/cancel',headers=self.headers()).status_code,200)
        self.assertEqual(self.stock(),before)
        self.assertEqual(self.client.get(url).status_code,200);self.assertEqual(other.get(url).status_code,404)

    def test_arbitrary_attachment_rolls_back_order_stock_and_event(self):
        before=self.stock()
        result=self.client.post('/api/orders',json=self.payload(labelImageUrls=['https://outside.test/private.png']),headers=self.headers())
        self.assertEqual(result.status_code,400,result.json);self.assertEqual(self.stock(),before)
        self.assertEqual(self.client.get('/api/store/orders').json['items'],[])
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) AS n FROM order_created_events').fetchone()['n'],0)


if __name__=='__main__': unittest.main()
