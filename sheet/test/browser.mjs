// #049 / #050 in a headless Chromium: the page boots on pathtrace/app.js, the
// score loads for the Goldberg Aria, the overlay is drawn on the page's canvas
// where it should be (bar and cursor), and an exported video carries it.
//   node sheet/test/browser.mjs [out dir]      (EXPORT=0 skips the video)
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT), a Chromium (CHROME) and, for the video, ffmpeg.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1140/chrome-linux/chrome`
const out = process.argv[2] || '/tmp/sheet_test'
mkdirSync(out, { recursive: true })
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
let fails = 0
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++ }
const SONG = 'midis/bach_goldberg_aria.mid'

for (const [file, kind] of [['049_sheet_scan.html', 'scan'], ['050_sheet_engraved.html', 'engraved']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.setDefaultTimeout(0)
  // a still at 16.4 s: bar 6 of 32 (3 s a bar), the first system
  await page.goto(`${BASE}${file}?shot&q=low&hairsim=0&clothsim=0&view=back&song=${SONG}&t=16.4`)
  await page.waitForFunction(() => window.__shot, null, { timeout: 300000 })
  await page.evaluate(() => window.__shot())
  await page.screenshot({ path: `${out}/${kind}.png` })
  const r = await page.evaluate(() => {
    const c = document.getElementById('sheetCanvas'), g = c.getContext('2d')
    const d = g.getImageData(0, 0, c.width, c.height).data
    let ink = 0, lo = c.height, hi = 0
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 40) { ink++; lo = Math.min(lo, y); hi = Math.max(hi, y) }
    return { ink, lo: lo / c.height, hi: hi / c.height, note: document.getElementById('sNote')?.textContent, title: document.querySelector('#title a')?.textContent }
  })
  check(!errors.length, `${kind}: no page errors ${errors.join(' | ')}`)
  check(r.ink > 1000 && r.hi - r.lo < 0.4 && (r.lo > 0.6 || r.hi < 0.4), `${kind}: the score panel drawn at the top or the bottom (${r.ink} px, rows ${r.lo.toFixed(2)}-${r.hi.toFixed(2)}) - ${r.note}`)
  const pos = await page.evaluate(() => [document.getElementById('sPos').value, document.getElementById('sHl').value])
  check(pos[0] === 'auto' && pos[1] === 'bar', `${kind}: automatic position and bar highlight by default (${pos})`)
  check(/#04[59]|#050/.test(r.title), `${kind}: title ${r.title}`)
  if (kind === 'scan') check(/6 systems, 32 bars/.test(r.note), `scan: 6 systems and 32 bars found`)
  if (kind === 'engraved') check(/32 bars/.test(r.note), `engraved: 32 bars engraved`)
  // the cursor at 16.4 s is in bar 6 (the timeline), on the first system
  const at = await page.evaluate(async () => {
    const { timelineOfMidi } = await import('./sheet/timeline.js')
    const midi = new Midi(await (await fetch('midis/bach_goldberg_aria.mid')).arrayBuffer())
    return timelineOfMidi(midi, { meter: [3, 4], played: 32 }).at(16.4)
  })
  check(at.bar === 6 && Math.abs(at.frac - 0.4667) < 0.01, `${kind}: 16.4 s is bar ${at.bar}, ${(at.frac * 100).toFixed(0)} % in`)
  await page.close()
}

// an exported video (the page's own picture, 480p, the first 5 s) carries the score
if (process.env.EXPORT !== '0') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, acceptDownloads: true })
  page.setDefaultTimeout(0)
  await page.goto(`${BASE}049_sheet_scan.html?q=low&hairsim=0&clothsim=0&sw=0&song=${SONG}`)
  await page.waitForFunction(() => window.__pianist?.pt && document.getElementById('songTitle')?.textContent.trim(), null, { timeout: 300000 })
  // load the song (the score comes with it), then export
  await page.evaluate(() => document.getElementById('playBtn').click())
  await page.waitForFunction(() => /systems/.test(document.getElementById('sNote')?.textContent || ''), null, { timeout: 120000 })
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change')); el.onchange?.() }
    set('exRes', '854x480'); set('exFps', '5'); set('exLen', '5'); set('exAudio', false); set('exTitle', 'none')
    window.showSaveFilePicker = undefined
  })
  const dl = page.waitForEvent('download', { timeout: 0 })
  await page.evaluate(() => document.getElementById('exStart').onclick())
  await page.waitForFunction(() => /^(Done|Failed|Cancelled)/.test(document.getElementById('exStatus').textContent), null, { timeout: 0, polling: 1000 })
  const status = await page.evaluate(() => document.getElementById('exStatus').textContent)
  check(/^Done/.test(status), 'export: ' + status)
  if (/^Done/.test(status)) {
    const d = await dl, f = `${out}/export.mp4`
    await d.saveAs(f)
    const png = `${out}/export_frame.png`
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.5', '-i', f, '-frames:v', '1', png])
    check(existsSync(png), 'export: a frame from the end of the video ' + png)
  }
  await page.close()
}
await browser.close()
console.log(fails ? `${fails} failed` : 'all passed')
process.exit(fails ? 1 : 0)
