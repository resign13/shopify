import test from 'node:test'
import assert from 'node:assert/strict'
import { setAuthSession, csrfHeaders, authenticatedFetch } from '../authTransport.js'

test('store writes carry cookie, CSRF and public identity, never bearer credentials', async () => {
  const previous = global.fetch
  let sent
  try {
    setAuthSession('customer-public-id', 'csrf')
    global.fetch = async (_, options) => { sent = options; return new Response('{}') }
    await authenticatedFetch('/api/orders', {method:'POST',headers:{Authorization:'Bearer obsolete'},body:'{}'})
    assert.equal(sent.credentials, 'same-origin')
    assert.equal(sent.headers.has('Authorization'), false)
    assert.equal(sent.headers.get('X-CSRF-Token'), 'csrf')
    assert.equal(sent.headers.get('X-Auth-Session'), 'customer-public-id')
  } finally { global.fetch = previous; setAuthSession() }
})

test('logout or account change discards an outstanding customer response', async () => {
  const previous = global.fetch
  let complete
  try {
    setAuthSession('old-customer', 'csrf')
    global.fetch = () => new Promise(resolve => { complete = resolve })
    const pending = authenticatedFetch('/api/store/orders')
    setAuthSession()
    complete(new Response('{}'))
    await assert.rejects(pending, error => error.status === 409 && error.code === 'session_changed')
  } finally { global.fetch = previous; setAuthSession() }
})

test('an old CSRF request never changes the next customer session', async () => {
  const previous = global.fetch
  let complete
  try {
    setAuthSession('old-customer')
    global.fetch = () => new Promise(resolve => { complete = resolve })
    const pending = csrfHeaders()
    setAuthSession('new-customer', 'new-csrf')
    complete(new Response(JSON.stringify({csrfToken:'old-csrf'})))
    await assert.rejects(pending, error => error.code === 'session_changed')
    assert.equal((await csrfHeaders())['X-CSRF-Token'], 'new-csrf')
  } finally { global.fetch = previous; setAuthSession() }
})
