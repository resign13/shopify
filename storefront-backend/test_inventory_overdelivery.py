"""Public boundary and deployment copy of the overdelivery policy."""
import unittest
import os
import inventory_policy
import inventory_overdelivery as policy


class OverdeliveryBoundaryTest(unittest.TestCase):
    def test_internal_ledger_is_never_sellable_or_public(self):
        fields=policy.internal(100, {'used':15,'inspection':10,'qualified':5,'normal_received':100})
        value={'stock':0,'sizePrices':[{'stock':0,**fields}],**fields}
        result=inventory_policy.public_inventory(value)
        self.assertEqual(result,{'stock':0,'sizePrices':[{'stock':0}]})
        self.assertEqual(fields['overdeliveryUsed'],15)

    def test_shared_policy_preserves_cumulative_budget(self):
        row=policy.attach({'contract_pending':100,'pending_inspection':0,'pending_inbound':0},100)
        p,i,b,extra=policy.transition(row,{'pendingInspection':115})
        self.assertEqual((p,i,b,extra['overdeliveryUsed']),(0,115,0,15))
        with self.assertRaises(ValueError):policy.transition(row,{'pendingInspection':116})

    def test_fresh_storefront_stages_and_repeat_migrations_preserve_data(self):
        if os.environ.get('PGHOST')!='127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
            raise RuntimeError('Explicit local *_test database required')
        import db
        db.ensure_database_ready()
        with db._connect() as conn:
            columns={r['column_name'] for r in conn.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='product_size_prices'").fetchall()}
            self.assertTrue({'stock','contract_pending','pending_inspection','pending_inbound','temporary_inbound','defective_pending'}.issubset(columns))
            before=conn.execute('SELECT product_id,size_code,stock,contract_pending,pending_inspection,pending_inbound,temporary_inbound,defective_pending FROM product_size_prices ORDER BY product_id,size_code').fetchall()
            ledger=conn.execute('SELECT * FROM inventory_overdelivery ORDER BY product_id,size_code').fetchall()
        db.ensure_database_ready();db.ensure_database_ready()
        # A standalone storefront can now execute the same production smoke
        # boundary read, rather than only constructing hypothetical payloads.
        self.assertIsInstance(db.list_products(),list)
        with db._connect() as conn:
            self.assertEqual(conn.execute('SELECT product_id,size_code,stock,contract_pending,pending_inspection,pending_inbound,temporary_inbound,defective_pending FROM product_size_prices ORDER BY product_id,size_code').fetchall(),before)
            self.assertEqual(conn.execute('SELECT * FROM inventory_overdelivery ORDER BY product_id,size_code').fetchall(),ledger)


if __name__=='__main__':unittest.main()
