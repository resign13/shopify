"""Actual storefront route boundary; all fixture writes require local *_test."""
import hashlib
import os
from pathlib import Path
import secrets
import subprocess
import sys
import unittest
import uuid
from unittest.mock import patch
from flask.testing import FlaskClient
from psycopg import sql
import test_style_catalog as fixtures

app, db = fixtures.application, fixtures.db


class StoreExternalAPITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert db.DB_HOST=='127.0.0.1' and db.DB_NAME.endswith('_test')
        cls.role='store_api_'+hashlib.sha256(db.DB_NAME.encode()).hexdigest()[:10]+'_test'
        cls.env=patch.dict(os.environ, {'EXTERNAL_API_DB_USER':cls.role,'EXTERNAL_API_DB_PASSWORD':secrets.token_urlsafe(40)})
        cls.env.start()
        with db._connect() as conn:
            conn.execute(sql.SQL('REVOKE CREATE,TEMP ON DATABASE {} FROM PUBLIC').format(sql.Identifier(db.DB_NAME)))
            conn.execute('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
        result=subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'scripts/provision-external-api-role.py'),
            '--expected-db',db.DB_NAME,'--role',cls.role],capture_output=True,text=True)
        if result.returncode:raise RuntimeError('Store API test-role setup failed: '+result.stderr[-1200:])
        cls.api=app.app.extensions['external_api'];cls.was_enabled=cls.api.enabled
        cls.api.validate_role();cls.api.enabled=True

    @classmethod
    def tearDownClass(cls):
        cls.api.enabled=cls.was_enabled;cls.env.stop()

    def setUp(self):
        self.fixture=fixtures.StyleCatalogTest();self.fixture.setUp()
        self.client=FlaskClient(app.app,app.app.response_class)
        self.key='gapi_'+secrets.token_urlsafe(32)
        with db._connect() as conn:
            conn.execute('TRUNCATE api_call_logs,api_rate_buckets,api_request_leases')
            owner=conn.execute("INSERT INTO admin_users(name,email,password_hash,status,role) VALUES('API fixture',%s,'fixture','active','admin') RETURNING id",(uuid.uuid4().hex+'@fixture.test',)).fetchone()['id']
            self.owner=owner
            conn.execute('INSERT INTO api_integrations(admin_user_id,token_hash,key_id) VALUES(%s,%s,%s)',(owner,hashlib.sha256(self.key.encode()).hexdigest(),uuid.uuid4()))
        self.headers={'Authorization':'Bearer '+self.key}

    def test_actual_store_routes_use_only_machine_key_and_never_browser_cookie(self):
        self.assertEqual(self.client.get('/api/external/v1/products',headers=self.headers).status_code,200)
        for path in ['/api/home','/api/products','/api/catalog/styles','/api/store/orders','/api/auth/me']:
            self.assertEqual(self.client.get(path,headers=self.headers).status_code,401)
        self.client.set_cookie(app.security.cookie,self.fixture.token)
        self.assertEqual(self.client.get('/api/external/v1/products').status_code,401)
        self.assertEqual(self.client.get('/api/catalog/styles').status_code,200)
        self.assertEqual(self.client.post('/api/external/v1/products',headers=self.headers).status_code,405)
        self.assertEqual(self.client.get('/api/external/v1/orders',headers=self.headers).status_code,404)

    def test_safe_data_and_snapshot_no_stock_changes(self):
        before=db._fetch_all('SELECT * FROM product_size_prices ORDER BY id')
        response=self.client.get('/api/external/v1/products?limit=1',headers=self.headers)
        self.assertEqual(response.status_code,200)
        item=response.json['items'][0]
        self.assertEqual(item['sizes'],[{'size':'28/S','stock':0},{'size':'Tall XL','stock':0}])
        self.assertNotIn('price',response.text.lower());self.assertNotIn('contractPending',response.text)
        self.assertNotIn('Access-Control-Allow-Origin',response.headers)
        self.assertEqual(response.headers['Cache-Control'],'no-store')
        inventory=self.client.get('/api/external/v1/inventory?productIds=2,99999',headers=self.headers).json
        self.assertEqual(inventory['notFoundIds'],[99999]);self.assertEqual(inventory['items'][0]['sizes'][0]['stock'],7)
        self.assertEqual(db._fetch_all('SELECT * FROM product_size_prices ORDER BY id'),before)

    def test_disabled_owner_or_removed_permission_revokes_existing_key(self):
        with db._connect() as conn:conn.execute("UPDATE admin_users SET permissions='[\"orders\"]' WHERE id=%s",(self.owner,))
        self.assertEqual(self.client.get('/api/external/v1/products',headers=self.headers).status_code,401)
        with db._connect() as conn:conn.execute('UPDATE admin_users SET permissions=NULL WHERE id=%s',(self.owner,))
        self.assertEqual(self.client.get('/api/external/v1/products',headers=self.headers).status_code,401)


if __name__=='__main__':unittest.main()
