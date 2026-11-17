import test from 'node:test';
import assert from 'node:assert/strict';
import {orderStatusSequence} from './orderStatusSequence.js';

test('paid appears before partial and full allocation',()=>{
  assert.deepEqual(orderStatusSequence,['pending_payment','paid','partially_allocated','allocated','shipped','completed','cancelled']);
});
