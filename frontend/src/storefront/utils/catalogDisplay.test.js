import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogStock, catalogSummary } from './catalogDisplay.js'

test('catalog shows zero for shortages and sums available real sizes without netting shortages', () => {
  assert.equal(catalogStock({stock:-20}),0)
  assert.equal(catalogStock({stock:0}),0)
  assert.equal(catalogStock({stock:9}),9)
  assert.equal(catalogStock({stock:-10,sizePrices:[{stock:7},{stock:-17},{stock:3}]}),10)
  assert.equal(catalogStock({stock:100,sizePrices:[{stock:-17},{stock:0}]}),0)
  assert.equal(catalogStock({stock:4,sizePrices:[]}),4)
  assert.equal(catalogStock({pendingInbound:100,temporaryInbound:50,stock:0}),0)
  assert.equal(catalogStock({sizePrices:[{stock:null},{stock:'12'},{stock:Infinity}]}),12)
})

test('only duplicated titles are removed from catalog summaries', () => {
  assert.equal(catalogSummary({name:'Mercerized Cotton T-Shirt KID',summary:'Mercerized Cotton T-Shirt KID'}),'')
  assert.equal(catalogSummary({name:'Cotton Shirt',summary:'  COTTON   Shirt  '}),'')
  assert.equal(catalogSummary({name:'Cotton Shirt',summary:'150GSM 100% Cotton'}),'150GSM 100% Cotton')
  assert.equal(catalogSummary({name:'Cotton Shirt',summary:''}),'')
})
