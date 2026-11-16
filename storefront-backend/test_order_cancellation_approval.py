import unittest
from concurrent.futures import ThreadPoolExecutor
import test_style_catalog as fixtures
import test_order_cancellation as helpers
import order_cancel_policy as policy

db,application=fixtures.db,fixtures.application


class StoreCancellationApprovalTest(unittest.TestCase):
    stock=helpers.CustomerCancellationTest.stock

    def setUp(self):
        helpers.CustomerCancellationTest.setUp(self)
        self.token=application.create_session({'id':self.user})

    def call(self,path,method='GET',body=None,token=None):
        with application.app.test_client() as client:
            return client.open('/api/store/'+path,method=method,json=body,headers={'Authorization':'Bearer '+(token or self.token)})

    def test_customer_can_directly_cancel_pending_and_partial_but_not_paid(self):
        db._fetch_one("UPDATE orders SET status='partially_allocated' WHERE id=%s RETURNING id",(self.oid,))
        self.assertEqual(self.call(f'orders/{self.oid}/cancel','POST').status_code,200)
        self.assertEqual(self.stock(),10)
        db._fetch_one("UPDATE orders SET status='paid' WHERE id=%s RETURNING id",(self.oid,))
        before=self.stock()
        r=self.call(f'orders/{self.oid}/cancel','POST')
        self.assertEqual(r.status_code,400,r.json)
        self.assertIn('approval',r.json['message'])
        self.assertEqual(self.stock(),before)

    def test_request_and_withdraw_freeze_without_stock_or_private_metadata(self):
        db._fetch_one("UPDATE orders SET status='paid' WHERE id=%s RETURNING id",(self.oid,))
        before=self.stock()
        r=self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':'Changed plans'})
        self.assertEqual(r.status_code,200,r.json);item=r.json['item']
        self.assertTrue(item['canWithdraw'])
        for key in ['requesterName','reviewerName','requesterKind','requesterId']:
            self.assertNotIn(key,item)
        orders=self.call('orders?page=1&pageSize=25').json['items'];order=next(r for r in orders if r['id']==self.oid)
        self.assertEqual(order['status'],'paid');self.assertFalse(order['canCancel']);self.assertFalse(order['canRequestCancellation'])
        self.assertEqual(order['cancelRequest']['state'],'pending')
        self.assertEqual(self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':'Again'}).status_code,409)
        self.assertEqual(self.call(f'orders/{self.oid}/cancel','POST').status_code,409)
        self.assertEqual(self.stock(),before)
        r=self.call(f'orders/cancellation-requests/{item["id"]}/withdraw','POST',{'version':item['version']})
        self.assertEqual(r.status_code,200,r.json)
        self.assertEqual(self.stock(),before)
        self.assertEqual(self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':'New reason'}).status_code,200)

    def test_internal_admin_cancellation_reasons_remain_private(self):
        db._fetch_one("UPDATE orders SET status='paid' WHERE id=%s RETURNING id",(self.oid,))
        row=db._fetch_one("SELECT updated_at::text AS version,order_no FROM orders WHERE id=%s",(self.oid,))
        db._fetch_one("""INSERT INTO order_cancellation_requests(order_id,order_no,requester_kind,requester_id,requester_name,reason,order_status,order_version,state,review_note)
          VALUES(%s,%s,'admin',999,'Private staff','Internal cancel note','paid',%s,'rejected','Internal review') RETURNING id""",(self.oid,row['order_no'],row['version']))
        order=next(r for r in self.call('orders?page=1&pageSize=25').json['items'] if r['id']==self.oid)
        self.assertEqual(order['cancelRequest']['state'],'rejected')
        self.assertEqual(order['cancelRequest']['reason'],'')
        self.assertEqual(order['cancelRequest']['reviewNote'],'')
        self.assertNotIn('requesterName',order['cancelRequest'])

    def test_ownership_invalid_reason_and_concurrent_submit(self):
        db._fetch_one("UPDATE orders SET status='shipped' WHERE id=%s RETURNING id",(self.oid,))
        other=db._fetch_one("INSERT INTO store_users(name,email,password_hash,status) VALUES('Other',%s,'fixture','active') RETURNING id",(str(self.user)+'other@fixture.test',))
        token=application.create_session({'id':other['id']})
        self.assertEqual(self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':'Wrong owner'},token).status_code,404)
        for value in ['',None,[], 'x'*501]:
            self.assertEqual(self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':value}).status_code,400)
        with ThreadPoolExecutor(2) as pool:
            results=list(pool.map(lambda _:self.call(f'orders/{self.oid}/cancellation-requests','POST',{'reason':'One request'}),range(2)))
        self.assertEqual(sorted(r.status_code for r in results),[200,409],[r.json for r in results])
        item=next(r.json['item'] for r in results if r.status_code==200)
        self.assertEqual(self.call(f'orders/cancellation-requests/{item["id"]}/withdraw','POST',{'version':item['version']},token).status_code,404)
        self.assertEqual(self.stock(),8)
