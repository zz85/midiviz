// Detect the systems and barlines of a page scan (sheet/scan.js) in a headless
// Chromium, which decodes the image, and print them as JSON, or write them into
// a score manifest's scan entry (--write sheet/scores/x.json).
//   node sheet/tools/detect.mjs sheet/scores/bga_aria_p263.jpg [--write sheet/scores/bach_goldberg_aria.json] [--png /tmp/marked.png]
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
import { readFileSync, writeFileSync } from 'node:fs'
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1140/chrome-linux/chrome`
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
const image = args[0]
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage()
page.on('pageerror', e => console.error('pageerror', e.message))
await page.goto(BASE + 'sheet/test/blank.html')
const r = await page.evaluate(async ({ image, mark }) => {
  const { detectPage, barsOf } = await import('../scan.js')
  const im = new Image(); im.src = '../../' + image; await im.decode()
  const c = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight }), g = c.getContext('2d')
  g.drawImage(im, 0, 0)
  const p = detectPage(g.getImageData(0, 0, c.width, c.height))
  const bars = barsOf(p)
  let png = null
  if (mark) {
    g.lineWidth = 3
    p.systems.forEach((s, i) => {
      g.strokeStyle = 'rgba(0,120,255,.8)'; g.strokeRect(s.x0, s.top, s.x1 - s.x0, s.bottom - s.top)
      for (const b of bars[i]) { g.fillStyle = b.bar % 2 ? 'rgba(255,80,0,.18)' : 'rgba(0,200,80,.18)'; g.fillRect(b.x0, s.top, b.x1 - b.x0, s.bottom - s.top); g.fillStyle = '#c00'; g.font = '28px sans-serif'; g.fillText(b.bar, b.x0 + 6, s.top - 6) }
    })
    png = c.toDataURL('image/png')
  }
  const r3 = v => Math.round(v * 1000) / 1000
  return { width: p.width, height: p.height, space: r3(p.space), threshold: p.threshold, png,
    systems: p.systems.map((s, i) => ({ x0: s.x0, x1: s.x1, staves: s.staves.map(t => ({ top: r3(t.top), bottom: r3(t.bottom), x0: t.x0, x1: t.x1 })), barlines: s.barlines.map(b => ({ x: r3(b.x), w: b.w })), bars: bars[i].map(b => [b.bar, r3(b.x0), r3(b.x1)]) })) }
}, { image, mark: !!opt('--png') })
await browser.close()
if (opt('--png')) writeFileSync(opt('--png'), Buffer.from(r.png.split(',')[1], 'base64'))
delete r.png
console.error(`${r.systems.length} systems, ${r.systems.reduce((n, s) => n + s.bars.length, 0)} bars, space ${r.space} px: ` + r.systems.map(s => s.bars.length).join(' + '))
if (opt('--write')) {
  const f = opt('--write'), m = JSON.parse(readFileSync(f, 'utf8'))
  m.scan.detected = { width: r.width, height: r.height, space: r.space, systems: r.systems }
  writeFileSync(f, JSON.stringify(m, null, 1) + '\n')
  console.error('wrote', f)
} else console.log(JSON.stringify(r, null, 1))
