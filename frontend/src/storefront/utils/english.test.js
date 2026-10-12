import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { englishErrorMessage } from './english.js'

test('login and expired-session errors use different English messages', () => {
  const legacy = '\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef'
  assert.equal(englishErrorMessage(legacy, 401, '/api/auth/store/login'), 'Invalid account or password.')
  assert.equal(englishErrorMessage(legacy, 401, '/api/products'), 'Your session has expired. Please sign in again.')
})
test('all error status fallbacks are English and retain useful English server errors', () => {
  for (const status of [0, 400, 401, 403, 404, 409, 500, 503]) {
    assert.doesNotMatch(englishErrorMessage('\u9519\u8bef', status), /[\u3400-\u9fff]/u)
    assert.ok(englishErrorMessage(null, status))
  }
  assert.equal(englishErrorMessage('Insufficient stock', 400), 'Insufficient stock')
})
test('shipped storefront interface sources contain no Chinese literals', () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  function scan(path) {
    for (const file of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, file.name)
      if (file.isDirectory()) scan(full)
      else if (/\.(vue|js)$/.test(file.name) && !file.name.endsWith('.test.js'))
        assert.doesNotMatch(readFileSync(full, 'utf8'), /[\u3400-\u9fff]/u, full)
    }
  }
  scan(root)
})
