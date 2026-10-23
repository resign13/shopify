import { loadInventoryPageImages } from './inventoryPdfImages.js'

const WIDTH = 1320
const HEIGHT = WIDTH * 210 / 297
const MARGIN = 30
const ROW_HEIGHT = 90
const HEADER_HEIGHT = 62
const BOTTOM = HEIGHT - 46
const FONT = '"Avenir Next", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif'

// A4 landscape pages, complete rows only. Additional real sizes get separate
// panels with repeated identity columns, rather than being clipped or omitted.
export function inventoryPdfPages(rows, columns) {
  const panels = []
  for (let i = 0; i < columns.length; i += 6) panels.push(columns.slice(i, i + 6))
  if (!panels.length) panels.push([])
  const pages = []
  panels.forEach((panel, panelIndex) => {
    let offset = 0
    do {
      const first = pages.length === 0
      const tableTop = first ? 208 : 106
      const capacity = Math.floor((BOTTOM - tableTop - HEADER_HEIGHT) / ROW_HEIGHT)
      const pageRows = rows.slice(offset, offset + capacity)
      pages.push({ rows: pageRows, columns: panel, panelIndex, panels: panels.length, tableTop, first })
      offset += capacity
    } while (offset < rows.length)
  })
  return pages
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
}


function text(ctx, value, x, y, width, { size = 14, bold = false, color = '#111', align = 'center', lines = 3, family = FONT } = {}) {
  ctx.save()
  ctx.font = `${bold ? 700 : 400} ${size}px ${family}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  // Character-aware wrapping handles long SKUs and Chinese SKU suffixes, using
  // the browser's own fonts instead of PDF's Latin-only built-in font set.
  const wrapped = []
  for (const paragraph of String(value ?? '').split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && ctx.measureText(`${line} ${word}`).width > width) {
        wrapped.push(line)
        line = ''
      }
      // Split only single overlong tokens (e.g. a SKU or unspaced Unicode),
      // not English words that can move intact to the following line.
      if (ctx.measureText(word).width > width) {
        for (const char of word) {
          if (line && ctx.measureText(line + char).width > width) {
            wrapped.push(line)
            line = ''
          }
          line += char
        }
      } else line += `${line ? ' ' : ''}${word}`
    }
    wrapped.push(line)
  }
  const display = wrapped.slice(0, lines)
  if (wrapped.length > lines) {
    let last = display[display.length - 1]
    while (last && ctx.measureText(last + '...').width > width) last = last.slice(0, -1)
    display[display.length - 1] = last + '...'
  }
  display.forEach((line, index) => ctx.fillText(line, align === 'left' ? x : x + width / 2, y + (index - (display.length - 1) / 2) * size * 1.35))
  ctx.restore()
}

function rounded(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fill()
}

function drawPage(page, snapshot, images, index, pageCount, timestamp) {
  const canvas = document.createElement('canvas')
  // High-resolution browser rasterization preserves Unicode and the on-screen
  // font/stock pills, without giant full-catalog canvases or screenshot cut rows.
  canvas.width = WIDTH * 2
  canvas.height = Math.ceil(HEIGHT * 2)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('PDF rendering is not supported in this browser.')
  ctx.scale(2, 2)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  text(ctx, 'GINGTTO', MARGIN, 44, 300, { size: 32, bold: true, align: 'left', family: '"Times New Roman", Georgia, serif' })
  text(ctx, 'INVENTORY', WIDTH - 330, 35, 300, { size: 16, bold: true })
  text(ctx, timestamp, WIDTH - 330, 60, 300, { size: 12, color: '#6f6f6f' })
  if (page.first) {
    const stats = [['COLOR SKUS', snapshot.rows.length], ['TOTAL AVAILABLE STOCK', snapshot.totalStock], ['SIZE COLUMNS', snapshot.columns.length]]
    const width = (WIDTH - MARGIN * 2 - 28) / 3
    stats.forEach(([label, value], i) => {
      const x = MARGIN + i * (width + 14)
      ctx.fillStyle = '#fbf7f2'
      ctx.fillRect(x, 92, width, 94)
      ctx.strokeStyle = '#e8e8e8'
      ctx.strokeRect(x, 92, width, 94)
      text(ctx, label, x + 22, 118, width - 44, { size: 13, color: '#6f6f6f', align: 'left' })
      text(ctx, value, x + 22, 155, width - 44, { size: 30, bold: true, align: 'left' })
    })
  }
  const scope = snapshot.scopeLabel || 'All products'
  const detail = [snapshot.filterSummary, page.panels > 1 ? `Size panel ${page.panelIndex + 1} of ${page.panels} - totals cover all sizes; do not add totals across panels` : ''].filter(Boolean).join(' | ')
  if (detail) text(ctx, detail, MARGIN, page.tableTop - 13, WIDTH - MARGIN * 2, { size: 12, color: '#6f6f6f', align: 'left', lines: 1 })
  const widths = [236, 120, 84, 105, 150, ...page.columns.map(() => 70), 110]
  const factor = (WIDTH - MARGIN * 2) / widths.reduce((a, b) => a + b, 0)
  const cells = widths.map(width => width * factor)
  const headers = ['PRODUCT TITLE', 'COLOR SKU', 'IMAGE', 'COLOR', 'CATEGORY', ...page.columns.map(c => c.label), 'AVAILABLE\nSTOCK']
  ctx.fillStyle = '#f6efe8'
  ctx.fillRect(MARGIN, page.tableTop, WIDTH - MARGIN * 2, HEADER_HEIGHT)
  let x = MARGIN
  headers.forEach((header, i) => {
    text(ctx, header, x + 8, page.tableTop + HEADER_HEIGHT / 2, cells[i] - 16, { size: 12, bold: true, align: i === 0 ? 'left' : 'center' })
    x += cells[i]
  })
  page.rows.forEach((row, rowIndex) => {
    const y = page.tableTop + HEADER_HEIGHT + rowIndex * ROW_HEIGHT
    const values = [row.name, row.colorSku, '', row.colorName || '-', row.categoryLabel, ...page.columns.map(c => row.sizeStocks[c.key] || 0), row.totalStock]
    let x = MARGIN
    values.forEach((value, i) => {
      const centerY = y + ROW_HEIGHT / 2
      if (i === 2) {
        const image = images.get(row.image)
        const left = x + (cells[i] - 58) / 2
        rounded(ctx, left, centerY - 29, 58, 58, 14, '#f3f0ed')
        if (image) {
          const scale = Math.min(58 / image.naturalWidth, 58 / image.naturalHeight)
          const w = image.naturalWidth * scale, h = image.naturalHeight * scale
          ctx.drawImage(image, left + (58 - w) / 2, centerY - h / 2, w, h)
        } else text(ctx, 'No Image', left + 2, centerY, 54, { size: 10, color: '#6f6f6f' })
      } else if (i >= 5 && i < values.length - 1) {
        if (value > 0) {
          const pillWidth = Math.min(cells[i] - 10, Math.max(46, String(value).length * 9 + 18))
          const left = x + (cells[i] - pillWidth) / 2
          rounded(ctx, left, centerY - 16, pillWidth, 32, 16, '#f4ece6')
          text(ctx, value, left, centerY, pillWidth, { bold: true })
        } else text(ctx, '-', x, centerY, cells[i], { color: '#b6aea8' })
      } else text(ctx, value, x + 12, centerY, cells[i] - 24, { size: 14, bold: i < 2 || i === values.length - 1, color: i === values.length - 1 ? '#b66b3f' : '#111', align: i === 0 ? 'left' : 'center' })
      x += cells[i]
    })
    ctx.strokeStyle = '#e8e8e8'
    ctx.beginPath()
    ctx.moveTo(MARGIN, y + ROW_HEIGHT)
    ctx.lineTo(WIDTH - MARGIN, y + ROW_HEIGHT)
    ctx.stroke()
  })
  text(ctx, `${scope} | Negative stock shown as 0 | Stock at export time`, MARGIN, HEIGHT - 22, 850, { size: 12, color: '#6f6f6f', align: 'left' })
  text(ctx, `Page ${index + 1} of ${pageCount}`, WIDTH - 230, HEIGHT - 22, 200, { size: 12, color: '#6f6f6f' })
  return canvas
}

export async function exportInventoryPdf(snapshot, { signal, onProgress = () => {}, save = true, now = new Date() } = {}) {
  abortIfNeeded(signal)
  if (!snapshot.rows.length) throw new Error('No inventory records match your filters. Nothing to export.')
  if (document.fonts?.ready) await document.fonts.ready
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: 'GINGTTO Inventory', subject: snapshot.filterSummary || 'Available stock by color SKU and size', author: 'GINGTTO' })
  const pages = inventoryPdfPages(snapshot.rows, snapshot.columns)
  const images = new Map()
  const timestamp = now.toLocaleString('en-GB', { hour12: false })
  for (let index = 0; index < pages.length; index++) {
    abortIfNeeded(signal)
    // Stop before downloading a partial PDF if a configured product image fails.
    await loadInventoryPageImages(pages[index].rows, images, signal)
    const canvas = drawPage(pages[index], snapshot, images, index, pages.length, timestamp)
    if (index) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 297, 210)
    canvas.width = canvas.height = 0
    onProgress(index + 1, pages.length)
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  abortIfNeeded(signal)
  if (save) await pdf.save(`GINGTTO-Inventory-${stamp}.pdf`, { returnPromise: true })
  return { pdf, pageCount: pages.length, rowCount: snapshot.rows.length, missingImages: 0 }
}
