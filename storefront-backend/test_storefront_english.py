"""English storefront boundary; shared business fixtures write only *_test DBs."""
import unittest
from unittest.mock import patch
import test_style_catalog as fixtures
application = fixtures.application
db = fixtures.db


class StorefrontEnglishTest(unittest.TestCase):
    setUp = fixtures.StyleCatalogTest.setUp
    add = fixtures.StyleCatalogTest.add
    get = fixtures.StyleCatalogTest.get

    def test_login_failure_english_no_session(self):
        with application.app.test_client() as client, patch.object(application, 'create_session') as create:
            result = client.post('/api/auth/store/login', json={'email':'missing@fixture.test','password':'wrong'})
        self.assertEqual(result.status_code, 401)
        self.assertEqual(result.json['message'], 'Invalid account or password.')
        create.assert_not_called()

    def test_language_is_always_english_and_category_product_queries_use_english(self):
        with db._connect() as conn:
            conn.execute("INSERT INTO product_category_translations(category_id,lang_code,label) VALUES(1,'zh',%s)", ('\u4e0a\u8863',))
            conn.execute("UPDATE product_translations SET name=%s WHERE lang_code='zh'", ('\u5546\u54c1',))
        for query in ('', 'lang=zh', 'lang=invalid'):
            group = self.get(query).json['items'][0]
            self.assertEqual(group['name'], 'Identical title')
            self.assertEqual(group['variants'][0]['categoryLabel'], 'Pants')
        self.assertEqual(self.get('lang=zh',path='/api/catalog/categories').json['items'][1]['label'], 'Tops')
        with application.app.test_request_context(headers={'X-Lang':'zh'}):
            self.assertEqual(application.pick_language(), 'en')

    def test_missing_english_copy_never_falls_back_to_chinese(self):
        db._fetch_one("DELETE FROM product_translations WHERE product_id=1 AND lang_code='en' RETURNING id")
        db._fetch_one("UPDATE product_translations SET name=%s,summary=%s WHERE product_id=1 AND lang_code='zh' RETURNING id", ('\u5546\u54c1','\u7b80\u4ecb'))
        product = self.get('lang=zh',path='/api/products/style-a-black').json['product']
        self.assertEqual(product['name'], 'STYLE-A-Black')
        self.assertEqual(product['summary'], '')
        self.assertEqual(product['sku'], 'STYLE-A-Black')

    def test_home_stats_and_errors_are_english(self):
        home = self.get('lang=zh',path='/api/home',auth=False).json
        self.assertEqual([item['label'] for item in home['stats']], ['Live SKUs','Units in stock'])
        with application.app.test_client() as client, patch.object(application, 'cancel_order', side_effect=ValueError('\u9519\u8bef')):
            result = client.post('/api/store/orders/1/cancel',headers={'Authorization':'Bearer fixture-catalog-token'})
        self.assertEqual(result.status_code, 400)
        self.assertNotRegex(result.json['message'], r'[\u3400-\u9fff]')
        with application.app.test_request_context():
            response = application.english_system_messages(application.jsonify({'message':'\u9519\u8bef'}))
            # Successful user data is untouched; only system error responses are guarded.
            self.assertEqual(response.json['message'], '\u9519\u8bef')
            response.status_code = 400
            self.assertNotRegex(application.english_system_messages(response).json['message'], r'[\u3400-\u9fff]')

    def test_health_does_not_display_localized_database_details(self):
        with application.app.test_client() as client, patch.object(application, 'verify_database_connection',side_effect=RuntimeError('\u6570\u636e\u5e93\u9519\u8bef')):
            result=client.get('/api/health')
        self.assertEqual(result.status_code, 500)
        self.assertEqual(result.json['message'], 'Database is temporarily unavailable')

    def test_historical_chinese_order_title_displays_english_without_rewriting_snapshot(self):
        original='\u5546\u54c1'
        with db._connect() as conn:
            order=conn.execute("INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount) VALUES('EN-FIXTURE',1,'pending_payment','Fixture','123','Fixture address',10) RETURNING id").fetchone()
            conn.execute("INSERT INTO order_items(order_id,product_id,product_name,sku,size_code,quantity,unit_price,total_price) VALUES(%s,1,%s,'STYLE-A-Black','28/S',1,10,10)",(order['id'],original))
        self.assertEqual(db.list_orders(user_id=1)[0]['items'][0]['productName'],'Identical title')
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT product_name FROM order_items').fetchone()['product_name'],original)
            conn.execute("DELETE FROM product_translations WHERE product_id=1 AND lang_code='en'")
        self.assertEqual(db.list_orders(user_id=1)[0]['items'][0]['productName'],'STYLE-A-Black')

if __name__ == '__main__': unittest.main()
