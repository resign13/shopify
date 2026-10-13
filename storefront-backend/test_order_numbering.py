import unittest
from concurrent.futures import ThreadPoolExecutor
import test_product_weights as helpers
import db
import order_numbering

class StoreOrderNumberTest(unittest.TestCase):
    setUpClass=classmethod(lambda cls:db.ensure_database_ready())
    setUp=helpers.ProductWeightSchemaTest.setUp
    def test_checkout_concurrency_and_schema(self):
        name='Élodie  张三-'+'Long Name '*8
        def create(_):
            return db.create_order({'userId':1,'contactName':name,'phone':'123','shippingAddress':'Street','items':[{'productId':1,'sizeCode':'30/M','quantity':1}]})
        with ThreadPoolExecutor(max_workers=3) as pool: orders=list(pool.map(create,range(3)))
        self.assertEqual(len({o['orderNo'] for o in orders}),3)
        with db._connect() as conn:
            for order in orders:
                row=conn.execute('SELECT id,order_no,created_at,contact_name FROM orders WHERE id=%s',(order['id'],)).fetchone()
                self.assertEqual(row['order_no'],order_numbering.make_order_number(row['id'],row['created_at'],row['contact_name']))
                self.assertEqual(row['order_no'],f"LM-{row['id']:06d}")
            before=conn.execute('SELECT order_no FROM orders ORDER BY id').fetchall()
            order_numbering.migrate(conn.cursor());order_numbering.migrate(conn.cursor())
            self.assertEqual(conn.execute('SELECT order_no FROM orders ORDER BY id').fetchall(),before)

if __name__=='__main__':unittest.main()
