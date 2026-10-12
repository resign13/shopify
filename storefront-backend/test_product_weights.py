"""Storefront migration and public boundary; explicit local *_test only."""
import os
if os.environ.get('PGHOST') != '127.0.0.1' or not os.environ.get('PGDATABASE', '').endswith('_test'):
    raise RuntimeError('Explicit isolated local *_test database required')
import unittest
from psycopg.errors import CheckViolation
import db
import product_weights


class ProductWeightSchemaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.ensure_database_ready()

    def setUp(self):
        with db._connect() as conn:
            conn.execute('TRUNCATE orders,products,store_users,product_categories RESTART IDENTITY CASCADE')
            conn.execute("INSERT INTO product_categories(category_key) VALUES('fixture')")
            conn.execute("INSERT INTO product_category_translations(category_id,lang_code,label) VALUES(1,'en','Fixture')")
            conn.execute("INSERT INTO products(category_id,slug,sku,price,stock,main_image_url) VALUES(1,'weight-fixture','WEIGHT-FIXTURE',12,20,'/uploads/fixture.jpg')")
            conn.execute("INSERT INTO product_translations(product_id,lang_code,name) VALUES(1,'en','Weight fixture'),(1,'zh','Weight fixture')")
            conn.execute("INSERT INTO product_sizes(product_id,size_code,sort_order) VALUES(1,'30/M',1),(1,'Tall XL',2)")
            conn.execute("INSERT INTO product_size_prices(product_id,size_code,price,stock,weight_grams,contract_pending,pending_inspection,pending_inbound,temporary_inbound,defective_pending) VALUES(1,'30/M',12,10,350,12,4,2,3,1),(1,'Tall XL',12,10,NULL,0,0,0,0,0)")
            conn.execute("INSERT INTO store_users(name,email,password_hash,status) VALUES('Fixture','fixture@weight.test','fixture-only','active')")

    def test_repeat_and_legacy_migration_preserve_weight_and_stock(self):
        with db._connect() as conn:
            before=conn.execute('SELECT * FROM product_size_prices ORDER BY id').fetchall()
        db.ensure_database_ready(); db.ensure_database_ready()
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT * FROM product_size_prices ORDER BY id').fetchall(),before)
            # Simulate an old schema, then run the standalone additive migration.
            conn.execute('ALTER TABLE product_size_prices DROP COLUMN weight_grams')
            product_weights.migrate(conn.cursor()); product_weights.migrate(conn.cursor())
            self.assertTrue(all(r['weight_grams'] is None for r in conn.execute('SELECT weight_grams FROM product_size_prices')))
            self.assertEqual(conn.execute('SELECT stock FROM products WHERE id=1').fetchone()['stock'],20)

    def test_constraints_null_and_public_customer_boundary(self):
        for invalid in (0,-1):
            with self.assertRaises(CheckViolation):
                with db._connect() as conn:
                    conn.execute('UPDATE product_size_prices SET weight_grams=%s WHERE product_id=1',(invalid,))
        for product in (db.list_products()[0],db.get_product_by_slug('weight-fixture')):
            self.assertTrue(all('weightGrams' not in row for row in product['sizePrices']))
            self.assertFalse(any('weight' in key.lower() for key in product))

    def test_store_checkout_missing_weight_allowed_and_latest_is_readable(self):
        payload={'userId':1,'contactName':'Fixture','phone':'123','shippingAddress':'Fixture',
                 'items':[{'productId':1,'sizeCode':'30/M','quantity':2},{'productId':1,'sizeCode':'Tall XL','quantity':1}]}
        order=db.create_order(payload)
        self.assertFalse(any('weight' in key.lower() for key in order))
        self.assertNotIn('unitWeightGrams',order['items'][0])
        with db._connect() as conn:
            rows=conn.execute('SELECT quantity,weight_grams FROM order_items i LEFT JOIN product_size_prices p ON p.product_id=i.product_id AND p.size_code=i.size_code WHERE i.order_id=%s',(order['id'],)).fetchall()
            result=product_weights.summary([{'quantity':r['quantity'],'unitWeightGrams':r['weight_grams']} for r in rows])
            self.assertEqual(result['knownWeightGrams'],'700');self.assertEqual(result['missingWeightQuantity'],1)
            conn.execute("UPDATE product_size_prices SET weight_grams=500 WHERE size_code='30/M'")
        with db._connect() as conn:
            self.assertEqual(conn.execute("SELECT i.quantity*p.weight_grams AS g FROM order_items i JOIN product_size_prices p ON p.product_id=i.product_id AND p.size_code=i.size_code WHERE i.order_id=%s AND i.size_code='30/M'",(order['id'],)).fetchone()['g'],1000)
        self.assertEqual(db.get_order_by_id(order['id'],user_id=1)['totalAmount'],36)


if __name__=='__main__': unittest.main()
