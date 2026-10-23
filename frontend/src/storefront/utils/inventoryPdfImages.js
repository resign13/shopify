import { imageUrl } from '../imageUrl.js'

export function inventoryImageSources(source) {
  const thumbnail = imageUrl(source, 160)
  // Distinct export URL requests the backend's scoped anonymous Canvas access.
  return [...new Set([thumbnail !== source ? `${thumbnail}&pdf=1` : source, source])]
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
}

export async function loadInventoryImage(source, signal) {
  for (const url of inventoryImageSources(source)) {
    abortIfNeeded(signal)
    const image = await new Promise(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const finish = value => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', cancel)
        img.onload = img.onerror = null
        if (!value) img.src = ''
        resolve(value)
      }
      const cancel = () => finish(null)
      const timer = setTimeout(cancel, 8000)
      signal?.addEventListener('abort', cancel, { once: true })
      img.onload = () => {
        // Check canvas readability here, so a bad CORS image cannot taint a PDF page.
        try {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          canvas.getContext('2d').drawImage(img, 0, 0, 1, 1)
          canvas.toDataURL()
          finish(img)
        } catch { finish(null) }
      }
      img.onerror = cancel
      img.src = url
    })
    if (image) return image
  }
  abortIfNeeded(signal)
  return null
}


export async function loadInventoryPageImages(rows, images, signal) {
  const sources = [...new Set(rows.map(row => row.image).filter(Boolean))].filter(source => !images.has(source))
  for (let start = 0; start < sources.length; start += 6) {
    await Promise.all(sources.slice(start, start + 6).map(async source => {
      const image = await loadInventoryImage(source, signal)
      if (image) images.set(source, image)
    }))
  }
  abortIfNeeded(signal)
  const failed = rows.filter(row => row.image && !images.has(row.image))
  if (failed.length) {
    const skus = [...new Set(failed.map(row => row.colorSku || row.id))].join(', ')
    throw new Error(`Image download failed for SKU: ${skus}. Please retry. No PDF was downloaded.`)
  }
}
