"""Checkout does not reserve stock after the coordinated payment-stock cutover."""
import os
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

if os.environ.get('PGHOST') != '127.0.0.1' or not os.environ.get('PGDATABASE', '').endswith('_test'):
    raise RuntimeError('Explicit isolated local *_test database required')

import db


class StoreOrderStockPaymentTest(unittest.TestCase):
    def setUp(self):
        self.marker = 'order-stock-on-payment-v1'
        self.existing_marker = db._fetch_one('SELECT 1 FROM inventory_policy_versions WHERE version=%s', (self.marker,))
        db._fetch_one('INSERT INTO inventory_policy_versions(version) VALUES(%s) ON CONFLICT DO NOTHING RETURNING version', (self.marker,))
        key = uuid.uuid4().hex
        self.user = db._fetch_one("INSERT INTO store_users(name,email,password_hash,status) VALUES('Fixture',%s,'fixture','active') RETURNING id", (key+'@fixture.test',))['id']
        category = db._fetch_one('INSERT INTO product_categories(category_key,sort_order) VALUES(%s,0) RETURNING id', (key,))['id']
        self.pid = db._fetch_one("INSERT INTO products(category_id,slug,sku,price,stock,main_image_url) VALUES(%s,%s,%s,12,10,'') RETURNING id", (category,key,key))['id']
        db._fetch_one("INSERT INTO product_translations(product_id,lang_code,name,summary) VALUES(%s,'en','Fixture','Fixture') RETURNING id", (self.pid,))
        db._fetch_one("INSERT INTO product_size_prices(product_id,size_code,price,stock,contract_pending,pending_inspection) VALUES(%s,'M',12,10,20,3) RETURNING id", (self.pid,))

    def tearDown(self):
        if self.existing_marker:
            db._fetch_one('INSERT INTO inventory_policy_versions(version) VALUES(%s) ON CONFLICT DO NOTHING RETURNING version', (self.marker,))
        else:
            db._fetch_one('DELETE FROM inventory_policy_versions WHERE version=%s RETURNING version', (self.marker,))

    def checkout(self, quantity=8):
        return db.create_order({'userId':self.user,'contactName':'Fixture','phone':'123','shippingAddress':'Fixture',
            'items':[{'productId':self.pid,'sizeCode':'M','quantity':quantity}]})

    def balances(self):
        row = db._fetch_one("SELECT stock,contract_pending,pending_inspection FROM product_size_prices WHERE product_id=%s AND size_code='M'", (self.pid,))
        total = db._fetch_one('SELECT stock FROM products WHERE id=%s', (self.pid,))['stock']
        return row, total

    def test_two_pending_orders_do_not_deduct_or_reserve(self):
        first, second = self.checkout(8), self.checkout(6)
        self.assertNotEqual(first['id'],second['id'])
        self.assertEqual((first['status'],second['status']),('pending_payment','pending_payment'))
        self.assertFalse(first['cancelReturnsStock'])
        self.assertEqual(self.balances(),({'stock':10,'contract_pending':20,'pending_inspection':3},10))

    def test_pending_cancellation_and_repeated_cancel_do_not_return_stock(self):
        order = self.checkout()
        with ThreadPoolExecutor(2) as pool:
            result = list(pool.map(lambda _:db.cancel_order(order['id'],user_id=self.user),range(2)))
        self.assertTrue(all(row['status']=='cancelled' for row in result))
        self.assertEqual(self.balances()[0]['stock'],10)

    def test_partially_allocated_cancellation_returns_deducted_stock_once(self):
        order = self.checkout()
        # Simulate the admin's atomic allocation transition, not another checkout.
        with db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE orders SET status='partially_allocated' WHERE id=%s", (order['id'],))
                db.inventory_policy.adjust_stock(cur,{(self.pid,'M'):-8})
        self.assertEqual(self.balances()[0]['stock'],2)
        self.assertTrue(db.get_order_by_id(order['id'],user_id=self.user)['cancelReturnsStock'])
        with ThreadPoolExecutor(2) as pool:
            list(pool.map(lambda _:db.cancel_order(order['id'],user_id=self.user),range(2)))
        self.assertEqual(self.balances()[0]['stock'],10)

    def test_insufficient_stock_check_remains_before_checkout(self):
        with self.assertRaisesRegex(RuntimeError,'Insufficient stock'):
            self.checkout(11)
        self.assertEqual(self.balances()[0]['stock'],10)
        self.assertEqual(db.list_orders(user_id=self.user),[])

    def test_failed_checkout_leaves_no_order_or_stock_change(self):
        with patch.object(db.order_numbering,'make_order_number',side_effect=ValueError('fixture after insert')):
            with self.assertRaisesRegex(ValueError,'fixture after insert'):
                self.checkout()
        self.assertEqual(db.list_orders(user_id=self.user),[])
        self.assertEqual(self.balances()[0]['stock'],10)

    def test_ownership_and_paid_approval_rules_remain(self):
        order = self.checkout()
        with self.assertRaises(LookupError):
            db.cancel_order(order['id'],user_id=self.user+999999)
        db._fetch_one("UPDATE orders SET status='paid' WHERE id=%s RETURNING id", (order['id'],))
        with self.assertRaisesRegex(RuntimeError,'requires approval'):
            db.cancel_order(order['id'],user_id=self.user)
        self.assertEqual(self.balances()[0]['stock'],10)

    def test_legacy_behavior_remains_until_marker_is_applied(self):
        db._fetch_one('DELETE FROM inventory_policy_versions WHERE version=%s RETURNING version', (self.marker,))
        order = self.checkout(8)
        self.assertEqual(self.balances()[0]['stock'],2)
        db.cancel_order(order['id'],user_id=self.user)
        self.assertEqual(self.balances()[0]['stock'],10)


if __name__ == '__main__':
    unittest.main()
