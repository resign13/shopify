function resolveApiBase() {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (envBase) return envBase

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const protocol = window.location.protocol || 'https:'

    if (host === 'gingtto.store' || host === 'www.gingtto.store') {
      return `${protocol}//api.gingtto.store`
    }

    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:5001'
    }
  }

  return 'http://127.0.0.1:5001'
}

export const API_BASE = resolveApiBase()

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

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
    throw new Error(data.message || 'Request failed')
  }

  return data
}
