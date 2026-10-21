// #045: a short path-traced export, headless, through the Render menu.
//   node pathtrace/test/video.mjs [song] [out dir]
// env: ENGINE=gpt-webgl SPP=4 RES=426x240 FPS=5 LEN=5 FX=0 DENOISE=0 BOUNCES=3
// Same setup as stills.mjs (BASE, PLAYWRIGHT, CHROME). Writes the MP4 and a log
// of the per-frame status lines.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const [song = 'Prelude1.mid', out = '/tmp/pt_video'] = process.argv.slice(2)
const env = k => process.env[k]
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, acceptDownloads: true })
page.on('pageerror', e => console.log('pageerror:', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)) })
page.setDefaultTimeout(0)
await page.goto(`${BASE}045_pathtracer.html?q=low&hairsim=0&clothsim=0&sw=0&song=${song}`)
await page.waitForFunction(() => window.__pianist?.pt && document.getElementById('songTitle')?.textContent.trim(), null, { timeout: 300000 })
await page.waitForTimeout(3000)
await page.evaluate(o => {
  const set = (id, v) => { const el = document.getElementById(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change')); el.onchange?.() }
  set('exPt', o.engine); set('exPtSpp', o.spp); set('exRes', o.res); set('exFps', o.fps); set('exLen', o.len); set('exAudio', false); set('exTitle', 'none')
  set('ptFx', o.fx); set('ptDenoise', o.denoise); set('ptBounces', o.bounces)
  window.showSaveFilePicker = undefined
}, { engine: env('ENGINE') || 'gpt-webgl', spp: env('SPP') || '4', res: env('RES') || '426x240', fps: env('FPS') || '5', len: env('LEN') || '5', fx: env('FX') === '1', denoise: env('DENOISE') === '1', bounces: env('BOUNCES') || '3' })
const dl = page.waitForEvent('download', { timeout: 0 })
const t0 = Date.now()
await page.evaluate(() => document.getElementById('exStart').onclick())
let last = ''
const poll = setInterval(async () => {
  const s = await page.evaluate(() => document.getElementById('exStatus').textContent).catch(() => '')
  if (s !== last) { last = s; console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, s) }
}, 5000)
const status = await page.waitForFunction(() => /^(Done|Failed|Cancelled)/.test(document.getElementById('exStatus').textContent), null, { timeout: 0, polling: 1000 }).then(h => h.jsonValue())
clearInterval(poll)
console.log('status:', await page.evaluate(() => document.getElementById('exStatus').textContent), `(${((Date.now() - t0) / 1000).toFixed(0)} s)`)
if (/^Done/.test(await page.evaluate(() => document.getElementById('exStatus').textContent))) {
  const d = await dl
  const file = `${out}/${d.suggestedFilename()}`
  await d.saveAs(file)
  console.log('saved', file, fs.statSync(file).size, 'bytes')
}
await browser.close()
