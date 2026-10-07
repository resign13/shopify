"""Public storefront serialization does not expose internal temporary inventory."""
import copy
import unittest
import inventory_policy


class TemporaryInventoryBoundaryTest(unittest.TestCase):
    def test_nested_internal_quantity_is_removed_and_not_sellable(self):
        internal = {'items': [{'stock': 0, 'temporaryInbound': 80, 'sizePrices': [
            {'sizeCode': 'S', 'stock': 10, 'temporaryInbound': 30},
            {'sizeCode': 'M', 'stock': -10, 'temporaryInbound': 50}]}],
            'summary': {'stock': 0, 'availableStock': 10, 'temporaryInbound': 80}}
        before = copy.deepcopy(internal)
        public = inventory_policy.public_inventory(internal)
        self.assertNotIn('temporaryInbound', repr(public))
        self.assertEqual(public['items'][0]['stock'], 10)
        self.assertEqual(public['items'][0]['sizePrices'][1]['stock'], 0)
        self.assertEqual(public['summary']['stock'], 10)
        self.assertEqual(internal, before)

    def test_actual_receipt_balance_is_available_not_staging_quantity(self):
        self.assertEqual(inventory_policy.public_inventory({'stock': -5, 'temporaryInbound': 8})['stock'], 0)
        self.assertEqual(inventory_policy.public_inventory({'stock': 3, 'temporaryInbound': 0})['stock'], 3)


if __name__ == '__main__': unittest.main()
