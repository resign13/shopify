const imageHosts = new Set(['img.smawell.shop', 'admin.smawell.shop', 'api-admin.smawell.shop', 'admin.gingtto.store'])
const widths = [160, 320, 640, 960, 1600]
const imageOrigin = (import.meta.env?.VITE_IMAGE_BASE_URL || 'https://admin.gingtto.store').replace(/\/$/, '')

export function imageUrl(source, width = 640) {
  if (!source) return source
  try {
    const url = new URL(source, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash) return source
    if (!imageHosts.has(url.hostname)) return source
    if (!url.pathname.startsWith('/uploads/') || !/\.(jpe?g|png|webp|avif)$/i.test(url.pathname)) return source
    const size = widths.find(value => value >= width) || 1600
    return `${imageOrigin}${url.pathname}?w=${size}`
  } catch {
    return source
  }
}
