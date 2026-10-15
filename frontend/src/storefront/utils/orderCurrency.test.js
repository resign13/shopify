import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatOrderCurrency } from './orderCurrency.js';
test('customer orders display their native CNY or USD, legacy orders default to USD',()=>{
  assert.equal(formatOrderCurrency(225),'$225.00');
  assert.equal(formatOrderCurrency(225,'USD'),'$225.00');
  assert.match(formatOrderCurrency(225,'CNY'),/CN¥225\.00/);
  assert.match(formatOrderCurrency(0,'CNY'),/CN¥0\.00/);
});
test('all order totals, shipping and line totals pass the order currency',()=>{
  const view=readFileSync(new URL('../views/OrdersCenterView.vue',import.meta.url),'utf8');
  for(const expression of ['order.totalAmount','order.shippingFee || 0','itemsSubtotal(order)','item.totalPrice']){
    assert.ok(view.includes(`formatCurrency(${expression},order.currency)`));
  }
});
