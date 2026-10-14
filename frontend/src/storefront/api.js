import { authenticatedFetch } from './authTransport'
import { englishErrorMessage } from './utils/english'

function resolveApiBase() {

  if (typeof window !== 'undefined') {
    // Vite proxies /api during development; a local built preview and production
    // both use their own origin, never an unrelated previously running service.
    return window.location.origin
  }

  return 'http://127.0.0.1:5001'
}

export const API_BASE = resolveApiBase()

export async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  let response
  try {
    response = await authenticatedFetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    if (error.name === 'AbortError' || error.status) throw error
    throw new Error('Connection failed. Please check your network and try again.')
  }

  const raw = await response.text()
  let data = {}

  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      if (!response.ok) {
        throw new Error('Server returned an invalid response')
      }
      throw new Error('Server returned a non-JSON response')
    }
  }

  if (!response.ok) {
    const error = new Error(englishErrorMessage(data.message, response.status, path))
    error.status = response.status
    error.code = data.code
    error.retryAfter = Number(response.headers.get('Retry-After') || 0)
    throw error
  }

  return data
}
