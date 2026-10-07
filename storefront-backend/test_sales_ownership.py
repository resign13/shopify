"""Store checkout attribution contract, without a running database or secrets."""
import unittest
from contextlib import contextmanager
from unittest.mock import patch

import db


class Cursor:
    def __init__(self, owner):
        self.calls = []
        self.rows = iter([
            {'id': 1, 'status': 'active', 'linked_admin_user_id': owner},
            {'id': 7, 'sku': 'FIXTURE', 'price': 12, 'stock': 8, 'name': 'Fixture'},
            {'exists': 1}, {'price': 12, 'stock': 8}, {'id': 41},
        ])

    def execute(self, query, params=()):
        self.calls.append((query, params))
        # Catch a column added without its corresponding bound value.
        if params:
            assert query.count('%s') == len(params), query

    def fetchone(self):
        return next(self.rows)

    def __enter__(self): return self
    def __exit__(self, *args): pass


class Connection:
    def __init__(self, cursor): self._cursor = cursor
    def cursor(self): return self._cursor
    def commit(self): pass


class StoreSalesOwnershipTest(unittest.TestCase):
    def test_checkout_uses_locked_account_link_and_ignores_forged_owner(self):
        for linked in [None, 15]:
            with self.subTest(linked=linked):
                cursor = Cursor(linked)
                @contextmanager
                def connection(): yield Connection(cursor)
                with patch.object(db, 'get_connection', connection), \
                     patch.object(db.inventory_policy, 'adjust_stock') as stock, \
                     patch.object(db, 'get_order_by_id', return_value={'id': 41}):
                    result = db.create_order({'userId': 1, 'ownerAdminId': 999, 'createdByAdminId': 999,
                                              'contactName': 'Fixture', 'phone': '123', 'shippingAddress': 'Fixture',
                                              'items': [{'productId': 7, 'sizeCode': 'M', 'quantity': 2}]})
                self.assertEqual(result, {'id': 41})
                self.assertIn('FOR SHARE', cursor.calls[0][0])
                insert = next(call for call in cursor.calls if 'INSERT INTO orders (' in call[0])
                self.assertIn('owner_admin_id', insert[0])
                self.assertEqual(insert[1][2], linked)
                self.assertNotIn('created_by_admin_id', insert[0])
                stock.assert_called_once_with(cursor, {(7, 'M'): -2})


if __name__ == '__main__':
    unittest.main()
