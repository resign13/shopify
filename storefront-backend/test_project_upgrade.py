"""Complete inventories and scoped SQL order pagination in isolated fixtures."""
import unittest
from unittest.mock import patch
from test_style_catalog import StyleCatalogTest, db, application


class ReadUpgradeTest(unittest.TestCase):
    setUp=StyleCatalogTest.setUp
    add=StyleCatalogTest.add
    get=StyleCatalogTest.get

    def test_complete_inventory_matches_catalog_without_heavy_fields(self):
        db._fetch_one("UPDATE product_size_prices SET stock=-5 WHERE product_id=1 AND size_code='28/S' RETURNING id")
        response=self.get('view=inventory&lang=en',path='/api/products')
        self.assertEqual(response.status_code,200,response.json)
        rows=response.json['items']
        self.assertEqual(len(rows),len(db.list_products()))
        source={r['id']:r for r in db.list_products()}
        for row in rows:
            self.assertEqual(row['stock'],source[row['id']]['stock'])
            self.assertEqual([(r['sizeCode'],r['stock']) for r in row['sizePrices']],
                [(r['sizeCode'],r['stock']) for r in source[row['id']]['sizePrices']])
            self.assertFalse({'gallery','description','costCny','contractPending','price'} & row.keys())
        self.assertTrue(all(r['stock']>=0 for row in rows for r in row['sizePrices']))
        with patch.object(db,'list_products',side_effect=AssertionError('Full catalog loaded')):
            detail=self.get('lang=en',path='/api/products/style-a-black')
        self.assertEqual(detail.status_code,200)
        self.assertEqual(len(detail.json['related']),1)

    def test_historical_attachments_are_not_truncated(self):
        links=['https://example.test/'+str(i)+'.png' for i in range(12)]
        self.assertEqual(db._parse_label_image_urls({'label_image_urls':links}),links)

    def test_partial_allocation_filter_ownership_and_repeat_migration(self):
        with db.get_connection() as conn:
            conn.execute("INSERT INTO store_users(name,email,password_hash,status) VALUES('Other','other@partial.test','fixture','active')")
            for user_id in [1, 2]:
                conn.execute("INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount) VALUES(%s,%s,'partially_allocated','Fixture','123','Fixture',10)",
                             ('PARTIAL-'+str(user_id), user_id))
        for query in ['status=partially_allocated', 'page=1&pageSize=25&status=partially_allocated']:
            result = self.get(query, path='/api/store/orders')
            self.assertEqual(result.status_code, 200, result.json)
            self.assertEqual(result.json['total'], 1)
            self.assertEqual(result.json['items'][0]['orderNo'], 'PARTIAL-1')
            self.assertEqual(result.json['items'][0]['status'], 'partially_allocated')
            self.assertFalse(result.json['items'][0]['canCancel'])
        db.ensure_database_ready(); db.ensure_database_ready()
        self.assertEqual(db._fetch_one("SELECT count(*) AS n FROM orders WHERE status='partially_allocated'")['n'], 2)
        import inventory_policy
        inventory_policy.validate_transition('partially_allocated', 'cancelled')
        for previous in ['shipped', 'completed', 'cancelled']:
            with self.assertRaises(ValueError):
                inventory_policy.validate_transition(previous, 'partially_allocated')

    def test_orders_page_filters_ownership_and_direct_detail(self):
        with db.get_connection() as conn:
            conn.execute("INSERT INTO store_users(name,email,password_hash,status) VALUES('Other','other@catalog.test','fixture','active')")
            conn.execute("""INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount,created_at)
              SELECT 'PAGE-'||n,1,CASE WHEN n%2=0 THEN 'paid' ELSE 'pending_payment' END,'Fixture','123','Fixture',10,'2026-01-01 00:00:00+00'::timestamptz+n*interval '1 day' FROM generate_series(1,40) n""")
            conn.execute("INSERT INTO orders(order_no,store_user_id,status,contact_name,phone,shipping_address,total_amount) VALUES('PRIVATE',2,'paid','Other','123','Private',10)")
        first=self.get('page=1&pageSize=25',path='/api/store/orders').json
        second=self.get('page=2&pageSize=25',path='/api/store/orders').json
        self.assertEqual((first['total'],len(first['items']),len(second['items'])),(40,25,15))
        legacy=self.get('',path='/api/store/orders').json
        self.assertEqual((legacy['total'],len(legacy['items'])),(40,40))
        ids=[r['id'] for r in first['items']+second['items']]
        self.assertEqual(len(set(ids)),40)
        paid=self.get('status=paid',path='/api/store/orders').json
        self.assertEqual(paid['total'],20)
        self.assertTrue(all(r['status']=='paid' for r in paid['items']))
        self.assertEqual(self.get('q=PRIVATE',path='/api/store/orders').json['total'],0)
        self.assertEqual(self.get('dateFrom=2026-02-01T00:00:00Z',path='/api/store/orders').json['total'],10)
        self.assertEqual(self.get('pageSize=9999',path='/api/store/orders').status_code,400)
        self.assertEqual(self.get('q='+('a'*201),path='/api/store/orders').status_code,400)
        with patch.object(db,'list_orders',wraps=db.list_orders) as query:
            self.assertEqual(db.get_order_by_id(ids[-1],user_id=1)['id'],ids[-1])
            query.assert_called_once_with(user_id=1,order_ids=[ids[-1]])
        self.assertIsNone(db.get_order_by_id(ids[-1],user_id=2))
