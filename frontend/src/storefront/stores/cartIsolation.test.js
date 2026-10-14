import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

test('cart is empty before account identification and persists independently per customer', async () => {
  const previous = globalThis.localStorage
  const values = new Map([['gingtto-cart-owner','1'], ['gingtto-cart',JSON.stringify([
    {id:7,sizeCode:'M',quantity:2,stock:10,price:15}
  ])]])
  globalThis.localStorage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}
  const server = await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,ws:false}})
  try {
    const { useCartStore } = await server.ssrLoadModule('/src/storefront/stores/cart.js')
    setActivePinia(createPinia())
    const cart = useCartStore()
    assert.deepEqual(cart.items, [])
    cart.attachAccount(1)
    assert.equal(cart.items[0].id,7)
    cart.attachAccount(2)
    assert.deepEqual(cart.items,[])
    cart.addItem({id:8,sizeCode:'L',stock:10,price:20},3,'L')
    cart.attachAccount(null)
    assert.deepEqual(cart.items,[])
    cart.attachAccount(1)
    assert.equal(cart.items[0].id,7);assert.equal(cart.items[0].quantity,2)
    cart.attachAccount(2)
    assert.equal(cart.items[0].id,8);assert.equal(cart.items[0].quantity,3)
  } finally { globalThis.localStorage=previous; await server.close() }
})
