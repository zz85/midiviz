// Headless stills of the lake pages, on whatever GL the host has (a GPU, or Mesa llvmpipe through ANGLE):
//   node lake/test/shoot.mjs <out.png> <url relative to BASE> [waitFor=__done] [W H]
// EVAL='js expression' returns its value as info.
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/), puppeteer-core (PUPPETEER,
// default the copy in ../afterglow/node_modules) and a Chromium (CHROME). GL=swiftshader for SwiftShader.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PUP = process.env.PUPPETEER || `${process.env.HOME}/test/afterglow/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js`
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out, url, waitFor = '__done', W = 960, H = 540] = process.argv.slice(2)
const { default: puppeteer } = await import(PUP)
const gl = process.env.GL === 'swiftshader'
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--use-gl=angle', '--use-angle=gl-egl', '--ozone-platform=headless', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
process.env.LIBGL_ALWAYS_SOFTWARE ??= '1'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: [...gl, '--autoplay-policy=no-user-gesture-required', '--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: +W, height: +H })
const log = []
page.on('pageerror', e => log.push('pageerror: ' + e.message))
page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/favicon|404|GPU stall/.test(m.text())) log.push(m.type() + ': ' + m.text().slice(0, 400)) })
const t0 = Date.now()
await page.goto(BASE + url)
try {
  await page.waitForFunction(w => window[w], { timeout: +(process.env.TIMEOUT || 600000), polling: 500 }, waitFor)
  if (waitFor === '__shot') { await page.evaluate(() => window.__shot()); await new Promise(r => setTimeout(r, 300)) }
  const info = process.env.EVAL ? await page.evaluate(process.env.EVAL) : await page.evaluate(() => window.__info ?? null)
  await page.screenshot({ path: out })
  console.log(JSON.stringify({ out, s: (Date.now() - t0) / 1000, info }))
} catch (e) { console.log('FAILED', e.stack?.slice(0, 900)) }
for (const l of log.slice(0, 20)) console.log('  ' + l)
await browser.close()
