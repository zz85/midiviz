// Detect the systems and barlines of page scans (sheet/scan.js) in a headless
// Chromium, which decodes the images. A module for the score tools:
//   const pages = await detectPages(['sheet/scores/bga988/p263.webp', ...], { marked: '/tmp/marked' })
// returns, for each page, { width, height, space, systems: [{ x0, x1, staves, barlines, bars: [[n, x0, x1]] }] }
// (bars numbered from 1 on each page), with a PNG of each page with its bars marked where `marked` is a folder.
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
import { writeFileSync, mkdirSync } from 'node:fs'
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1140/chrome-linux/chrome`

export async function detectPages(images, { marked = null, stavesPerSystem = 0 } = {}) {
  const { chromium } = await import(PW)
  const browser = await chromium.launch({ executablePath: CHROME })
  const page = await browser.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  await page.goto(BASE + 'sheet/test/blank.html')
  if (marked) mkdirSync(marked, { recursive: true })
  const out = []
  for (const image of images) {
    const r = await page.evaluate(async ({ image, mark, stavesPerSystem }) => {
      const { detectPage, barsOf } = await import('../scan.js')
      const im = new Image(); im.src = '../../' + image; await im.decode()
      const c = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight }), g = c.getContext('2d')
      g.drawImage(im, 0, 0)
      const p = detectPage(g.getImageData(0, 0, c.width, c.height), { stavesPerSystem })
      const bars = barsOf(p)
      let png = null
      if (mark) {
        g.lineWidth = 3
        p.systems.forEach((s, i) => {
          g.strokeStyle = 'rgba(0,120,255,.8)'; g.strokeRect(s.x0, s.top, s.x1 - s.x0, s.bottom - s.top)
          for (const b of bars[i]) { g.fillStyle = b.bar % 2 ? 'rgba(255,80,0,.2)' : 'rgba(0,200,80,.2)'; g.fillRect(b.x0, s.top, b.x1 - b.x0, s.bottom - s.top); g.fillStyle = '#c00'; g.font = '30px sans-serif'; g.fillText(i + '.' + b.bar, b.x0 + 6, s.top - 8) }
        })
        png = c.toDataURL('image/jpeg', 0.7)
      }
      const r3 = v => Math.round(v * 1000) / 1000
      return { width: p.width, height: p.height, space: r3(p.space), png,
        systems: p.systems.map((s, i) => ({ x0: s.x0, x1: s.x1, staves: s.staves.map(t => ({ top: r3(t.top), bottom: r3(t.bottom), x0: t.x0, x1: t.x1 })), bars: bars[i].map(b => [b.bar, r3(b.x0), r3(b.x1)]) })) }
    }, { image, mark: !!marked, stavesPerSystem })
    if (marked) writeFileSync(`${marked}/${image.split('/').pop().replace(/\.\w+$/, '')}.jpg`, Buffer.from(r.png.split(',')[1], 'base64'))
    delete r.png
    // (bars counted from 1 on each page; the tools number them through the piece)
    let n = 0
    for (const s of r.systems) for (const b of s.bars) b[0] = ++n
    out.push(r)
    console.error(image.split('/').pop(), r.systems.length, 'systems:', r.systems.map(s => s.bars.length).join(' '))
  }
  await browser.close()
  return out
}
