"""Cancellation data remains internal; automated writes only on local *_test DB."""
import os
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
if os.environ.get('PGHOST') != '127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
    raise RuntimeError('Explicit isolated local *_test database required')
import db
import order_cancellation


class CustomerCancellationTest(unittest.TestCase):
    def setUp(self):
        key = uuid.uuid4().hex
        self.user = db._fetch_one("INSERT INTO store_users(name,email,password_hash,status) VALUES('Fixture',%s,'fixture','active') RETURNING id",(key+'@fixture.test',))['id']
        cat = db._fetch_one('INSERT INTO product_categories(category_key,sort_order) VALUES(%s,0) RETURNING id',(key,))
        self.pid = db._fetch_one("INSERT INTO products(category_id,slug,sku,price,stock,main_image_url) VALUES(%s,%s,%s,12,8,'') RETURNING id",(cat['id'],key,key))['id']
        db._fetch_one("INSERT INTO product_size_prices(product_id,size_code,price,stock) VALUES(%s,'M',12,8) RETURNING id",(self.pid,))
        self.oid = db._fetch_one("INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount,cancellation_note) VALUES(%s,%s,'pending_payment','Fixture','123','Fixture',24,'internal stale note') RETURNING id",('LM-CANCEL-'+key,self.user))['id']
        db._fetch_one("INSERT INTO order_items(order_id,product_id,product_name,sku,size_code,quantity,unit_price,total_price) VALUES(%s,%s,'Fixture',%s,'M',2,12,24) RETURNING id",(self.oid,self.pid,key))

    def stock(self):
        return db._fetch_one("SELECT stock FROM product_size_prices WHERE product_id=%s AND size_code='M'",(self.pid,))['stock']

    def test_customer_serialization_hides_cancel_note_and_private_quote_fields(self):
        detail = db.get_order_by_id(self.oid,user_id=self.user)
        self.assertNotIn('cancelNote',detail)
        self.assertNotIn('cancellation_note',detail)
        self.assertNotIn('internal stale note',str(detail))
        self.assertNotIn('internal stale note',str(db.list_orders(user_id=self.user)))

    def test_customer_cancel_clears_internal_note_returns_stock_once(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _:db.cancel_order(self.oid,user_id=self.user),range(2)))
        self.assertTrue(all(r['status']=='cancelled' for r in results))
        self.assertTrue(all('cancelNote' not in r for r in results))
        self.assertEqual(self.stock(),10)
        self.assertEqual(db._fetch_one('SELECT cancellation_note FROM orders WHERE id=%s',(self.oid,))['cancellation_note'],'')
        with db.get_connection() as conn:
            for _ in range(2): order_cancellation.migrate(conn.cursor())
        self.assertEqual(self.stock(),10)

    def test_ownership_and_failure_do_not_write_status_or_note(self):
        with self.assertRaises(LookupError): db.cancel_order(self.oid,user_id=self.user+999999)
        original = db.inventory_policy.return_order_stock
        def fail(cur, ids):
            original(cur,ids)
            raise ValueError('fixture after-stock failure')
        with patch.object(db.inventory_policy,'return_order_stock',side_effect=fail), self.assertRaises(ValueError):
            db.cancel_order(self.oid,user_id=self.user)
        self.assertEqual(self.stock(),8)
        row = db._fetch_one('SELECT status,cancellation_note FROM orders WHERE id=%s',(self.oid,))
        self.assertEqual(row,{'status':'pending_payment','cancellation_note':'internal stale note'})


if __name__=='__main__': unittest.main()
