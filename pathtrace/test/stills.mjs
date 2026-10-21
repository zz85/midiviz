// #045: the same frame from the raster page and each path tracer, headless.
//   node pathtrace/test/stills.mjs [song] [t] [view] [out dir]
// env: ENGINES=gpt-webgl,mu-webgl (default: every one the browser can run)
//      FX=1 (the page's bloom / grain on the traces, plus *_plain.png without)
//      SPP=64 BOUNCES=4 W=640 H=360 DENOISE=1 HAIR=0.5 MODEL= (?model=…) EXTRA= (more query)
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pianist/test/shorts_sheet.mjs.
// Without a GPU it runs on SwiftShader (WebGL, and WebGPU when the Chromium
// has it): slow, but the pictures are the ones a GPU makes.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const [song = 'Prelude1.mid', T = '20', view = 'shoulder', out = '/tmp/pt_stills'] = process.argv.slice(2)
const W = +(process.env.W || 640), H = +(process.env.H || 360)
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan'] })
const page = await browser.newPage({ viewport: { width: W, height: H } })
const log = []
page.on('pageerror', e => log.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') log.push('console: ' + m.text().slice(0, 300)) })
page.setDefaultTimeout(0)
const q = `shot&q=low&hairsim=0&clothsim=0&view=${view}&song=${song}&t=${T}${process.env.MODEL ? '&model=' + process.env.MODEL : ''}${process.env.EXTRA || ''}`
await page.goto(`${BASE}045_pathtracer.html?${q}`)
await page.waitForFunction(() => window.__shot && window.__pianist?.pt, null, { timeout: 300000 })
await page.evaluate(() => window.__shot())
const gpu = await page.evaluate(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))
const keys = (process.env.ENGINES || (gpu ? 'gpt-webgpu,gpt-webgl,mu-webgpu,mu-webgl' : 'gpt-webgl,mu-webgl')).split(',')
console.log('WebGPU:', gpu, '· engines:', keys.join(' '))
const res = await page.evaluate(async ({ keys, s }) => {
  const r = await window.__pianist.pt.run(keys, s, { headless: true })
  return (r || []).map(x => ({ engine: x.engine, info: x.info, png: x.canvas?.toDataURL('image/png'), plain: x.plainCanvas?.toDataURL('image/png') }))
}, { keys, s: { samples: +(process.env.SPP || 64), bounces: +(process.env.BOUNCES || 4), denoise: process.env.DENOISE !== '0', fx: process.env.FX === '1', hairFraction: +(process.env.HAIR || 0.5), size: [W, H] } })
const tag = `${song.replace(/\W+/g, '_')}_${T}_${view}`
const report = []
for (const r of res) {
  if (r.png) fs.writeFileSync(`${out}/${tag}_${r.engine}.png`, Buffer.from(r.png.split(',')[1], 'base64'))
  if (r.plain) fs.writeFileSync(`${out}/${tag}_${r.engine}_plain.png`, Buffer.from(r.plain.split(',')[1], 'base64'))
  console.log(r.engine.padEnd(11), r.info)
  report.push({ engine: r.engine, info: r.info })
}
fs.writeFileSync(`${out}/${tag}.json`, JSON.stringify({ song, t: T, view, W, H, gpu, report, log }, null, 1))
if (log.length) console.log(log.join('\n'))
await browser.close()
