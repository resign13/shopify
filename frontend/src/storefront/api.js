const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001'

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
