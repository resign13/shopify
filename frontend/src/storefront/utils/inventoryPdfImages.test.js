import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inventoryImageSources, loadInventoryImage, loadInventoryPageImages } from './inventoryPdfImages.js'

const source = 'https://img.smawell.shop/uploads/migrated/example.jpg'
const thumbnail = 'https://admin.gingtto.store/uploads/migrated/example.jpg?w=160&pdf=1'

function browser(t, outcome = () => 'ok', readable = true) {
  const requests = []
  const previous = { window: globalThis.window, Image: globalThis.Image, document: globalThis.document }
  globalThis.window = { location: { origin: 'https://gingtto.store' } }
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage() {} }),
    toDataURL() { if (!readable) throw new Error('Tainted canvas'); return 'data:' },
  }) }
  globalThis.Image = class {
    set src(url) {
      if (!url) return
      assert.equal(this.crossOrigin, 'anonymous')
      requests.push(url)
      const result = outcome(url)
      if (result !== 'timeout') queueMicrotask(() => result === 'ok' ? this.onload?.() : this.onerror?.())
    }
  }
  t.after(() => Object.assign(globalThis, previous))
  return requests
}

test('PDF thumbnail has a separate scoped CORS URL; external signed URLs remain intact', t => {
  browser(t)
  assert.deepEqual(inventoryImageSources(source), [thumbnail, source])
  const signed = 'https://res.cloudinary.com/demo/image/upload/a.jpg?signature=abc'
  assert.deepEqual(inventoryImageSources(signed), [signed])
})

test('successful image is Canvas-readable and reused across rows and size panels', async t => {
  const requests = browser(t)
  const cache = new Map()
  const rows = [{ image: source, colorSku: 'A' }, { image: source, colorSku: 'B' }, { image: '', colorSku: 'C' }]
  await loadInventoryPageImages(rows, cache)
  await loadInventoryPageImages(rows, cache)
  assert.deepEqual(requests, [thumbnail])
  assert.equal(cache.size, 1)
})

test('original is a bounded fallback when thumbnail fails', async t => {
  const requests = browser(t, url => url === thumbnail ? 'error' : 'ok')
  assert.ok(await loadInventoryImage(source))
  assert.deepEqual(requests, [thumbnail, source])
})

test('failed configured images stop export with affected SKUs; never memoize failure', async t => {
  browser(t, () => 'error')
  const cache = new Map()
  await assert.rejects(loadInventoryPageImages([{ image: source, colorSku: 'ZM4744' }], cache), /ZM4744.*No PDF was downloaded/)
  assert.equal(cache.size, 0)
  await loadInventoryPageImages([{ image: '', colorSku: 'NO-PHOTO' }], cache)
})

test('a loaded but tainted image also fails instead of losing all page images', async t => {
  browser(t, () => 'ok', false)
  await assert.rejects(loadInventoryPageImages([{ image: source, colorSku: 'A' }], new Map()), /Image download failed/)
})

test('timeouts are bounded and aborts stop without attempting the fallback', async t => {
  const requests = browser(t, () => 'timeout')
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const timed = loadInventoryImage(source)
  t.mock.timers.tick(8000)
  await Promise.resolve(); await Promise.resolve()
  t.mock.timers.tick(8000)
  assert.equal(await timed, null)
  assert.deepEqual(requests, [thumbnail, source])
  requests.length = 0
  const controller = new AbortController()
  const aborted = loadInventoryImage(source, controller.signal)
  controller.abort()
  await assert.rejects(aborted, { name: 'AbortError' })
  assert.deepEqual(requests, [thumbnail])
})
