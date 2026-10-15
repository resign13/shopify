"""Customer currency display and checkout price authority, isolated local DB only."""
import os
import unittest
import uuid
from contextlib import contextmanager
from unittest.mock import patch
if os.environ.get('PGHOST')!='127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
    raise RuntimeError('Explicit isolated local *_test database required')
import db
from werkzeug.security import generate_password_hash
from test_sales_ownership import Cursor, Connection


class OrderCurrencyTest(unittest.TestCase):
    def test_checkout_does_not_accept_currency_or_negotiated_price_from_client(self):
        cursor=Cursor(None)
        @contextmanager
        def connection():yield Connection(cursor)
        with patch.object(db,'get_connection',connection),patch.object(db.inventory_policy,'adjust_stock'),patch.object(db,'get_order_by_id',return_value={'id':41,'currency':'USD'}):
            result=db.create_order({'userId':1,'contactName':'Fixture','phone':'123','shippingAddress':'Fixture',
                'currency':'CNY','exchangeRate':1,'items':[{'productId':7,'sizeCode':'M','quantity':2,'unitPrice':0,'priceSource':'manual'}]})
        self.assertEqual(result['currency'],'USD')
        insert=next(call for call in cursor.calls if 'INSERT INTO order_items' in call[0])
        self.assertEqual(insert[1][-4:],(12,24,'catalog',12))

    def test_customer_order_serializes_native_currency_without_internal_quotes(self):
        key=uuid.uuid4().hex
        user=db._fetch_one("INSERT INTO store_users(name,email,password_hash,status) VALUES('Currency fixture',%s,%s,'active') RETURNING id",(key+'@fixture.test',generate_password_hash('Fixture-Only',method='pbkdf2:sha256:1000')))
        category=db._fetch_one('INSERT INTO product_categories(category_key,sort_order) VALUES(%s,0) RETURNING id',(key,))
        product=db._fetch_one("INSERT INTO products(category_id,slug,sku,price,stock,main_image_url) VALUES(%s,%s,%s,12,10,'') RETURNING id",(category['id'],key,key))
        order=db._fetch_one("INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount,shipping_fee,currency,exchange_rate) VALUES(%s,%s,'pending_payment','Fixture','123','Fixture',170,10,'CNY',7.2) RETURNING id",('LM-CURRENCY-'+key,user['id']))
        db._fetch_one("INSERT INTO order_items(order_id,product_id,product_name,sku,size_code,quantity,unit_price,total_price,price_source,reference_price_usd) VALUES(%s,%s,'Fixture',%s,'M',2,80,160,'manual',12) RETURNING id",(order['id'],product['id'],key))
        item=db.list_orders(user_id=user['id'])[0]
        self.assertEqual(item['currency'],'CNY');self.assertEqual(item['totalAmount'],170)
        self.assertEqual(item['items'][0]['unitPrice'],80)
        self.assertNotIn('exchangeRate',item)
        self.assertNotIn('referencePriceUsd',item['items'][0]);self.assertNotIn('priceSource',item['items'][0])


if __name__=='__main__':unittest.main()
