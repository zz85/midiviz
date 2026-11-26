// The hall of water (waterhall/) as a stage set on #032, headless:
//   node waterhall/test/stage.mjs [out dir]
// Stills of #032 with ?stage=hall from a few of the director's views, the traced light's statistics read
// back from each lamp (mean about 1 over the footprint, high variance, bright peaks, changing with time),
// then #032 live: switched to the hall, to the black stage and back.
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as park/test/stage.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/waterhall_stage'] = process.argv.slice(2)
const W = +(process.env.W || 960), H = +(process.env.H || 540)
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
let failed = 0
async function open(url) {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  const log = []
  page.on('pageerror', e => log.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) log.push('console: ' + m.text().slice(0, 400)) })
  page.setDefaultTimeout(0)
  await page.goto(BASE + url)
  return { page, log }
}
// the traced light of each lamp, read back: its mean over the texels that hold light, how they spread, and the
// share of the light in the brightest 5%, at two times
const stats = () => (async () => {
  const P = window.__pianist, r = P.renderer, hall = P.stageProps?.hall
  if (!hall) return null
  const THREE = P.THREE, res = []
  for (const l of hall.lamps) {
    const one = t => {
      l.update(t)
      const w = l.rt.width, h = l.rt.height, px = new Uint16Array(w * h * 4)
      r.readRenderTargetPixels(l.rt, 0, 0, w, h, px)
      const v = []; for (let i = 0; i < w * h; i++) { const x = THREE.DataUtils.fromHalfFloat(px[i * 4]); if (x > 0.02) v.push(x) }
      v.sort((a, b) => a - b)
      const n = v.length, mean = v.reduce((a, b) => a + b, 0) / Math.max(1, n), sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n))
      const top = v.slice(Math.floor(n * 0.95)).reduce((a, b) => a + b, 0) / Math.max(1e-9, mean * n)
      return { lit: +(n / (w * h)).toFixed(3), mean: +mean.toFixed(2), cv: +(sd / mean).toFixed(2), top5: +top.toFixed(2), p99: +(v[Math.floor(n * 0.99)] || 0).toFixed(2), px: Float32Array.from(px, x => THREE.DataUtils.fromHalfFloat(x)) }
    }
    const a = one(3), b = one(9)
    // how much of the light moved between the two times: the mean change of a texel over the mean
    let d = 0, m = 0; for (let i = 0; i < a.px.length; i += 4) { d += Math.abs(a.px[i] - b.px[i]); m += a.px[i] }
    delete a.px
    res.push({ ...a, moved: +(d / Math.max(1e-9, m)).toFixed(2) })
  }
  return res
})()
const shotQ = 'shot&q=low&hairsim=0&clothsim=0&song=Prelude1.mid&t=20&stage=hall'
const stills = [
  ['hall_audience', `032_pianist.html?${shotQ}&view=audience`],
  ['hall_establish', `032_pianist.html?${shotQ}&view=establish`],
  ['hall_side', `032_pianist.html?${shotQ}&view=hallSide`],
  ['hall_tail', `032_pianist.html?${shotQ}&view=tail`],
  ['hall_high_behind', `032_pianist.html?${shotQ}&view=highBehind`],
  ['hall_bust', `032_pianist.html?${shotQ}&view=bust`],
]
let statsDone = false
for (const [name, url] of stills.filter(([n]) => !process.env.ONLY || process.env.ONLY.split(',').includes(n))) {
  const { page, log } = await open(url)
  const t0 = Date.now()
  try {
    await page.waitForFunction(() => window.__shot, null, { timeout: 300000 })
    await page.evaluate(() => window.__shot())
    await page.waitForTimeout(300)
    fs.writeFileSync(`${out}/${name}.png`, await page.screenshot())
    const info = await page.evaluate(() => ({ stage: document.getElementById('stageSet').value, floor: window.__pianist.floorVisible?.() }))
    console.log(name.padEnd(18), `${((Date.now() - t0) / 1000).toFixed(0)} s`, 'stage:', info.stage, log.length ? '\n  ' + log.join('\n  ') : '')
    if (log.length || info.stage !== 'hall') failed++
    if (!statsDone) {
      statsDone = true
      const s = await page.evaluate(stats)
      console.log('traced light per lamp (lit share, mean, cv, top 5% share, p99, change 3 s -> 9 s):')
      for (const x of s || []) console.log('  ', JSON.stringify(x))
      // flat water would give 1 over the footprint: the mean stays near it, the waves gather the light into lines
      if (!s?.length || s.some(x => !(x.mean > 0.4 && x.mean < 2.5 && x.cv > 0.4 && x.top5 > 0.08 && x.p99 > 2 * x.mean && x.moved > 0.1 && x.lit > 0.05))) { console.log('  traced light FAILED'); failed++ }
    }
  } catch (e) { console.log(name, 'FAILED', e.message, log); failed++ }
  await page.close()
}
if (!process.env.ONLY || process.env.LIVE) {
  const { page, log } = await open('032_pianist.html?q=low&start=0&sw=0')
  await page.waitForFunction(() => window.__pianist?.hair && document.getElementById('stageSet'), null, { timeout: 300000 })
  await page.waitForTimeout(2000)
  const pick = async v => { await page.evaluate(v => { const s = document.getElementById('stageSet'); s.value = v; s.dispatchEvent(new Event('change')) }, v); await page.waitForFunction(() => !document.getElementById('stageSet').disabled, null, { timeout: 300000 }); await page.waitForTimeout(2500) }
  await pick('hall')
  fs.writeFileSync(`${out}/032_live_hall.png`, await page.screenshot())
  const a = await page.evaluate(() => ({ url: location.search, bg: window.__pianist.scene.background?.getHexString(), hall: window.__pianist.stageProps.hall?.root.visible }))
  await pick('stage')
  const b = await page.evaluate(() => ({ url: location.search, hall: window.__pianist.stageProps.hall?.root.visible }))
  await pick('hall')
  const c = await page.evaluate(() => ({ hall: window.__pianist.stageProps.hall?.root.visible }))
  console.log('032 live hall:', a, '· stage:', b, '· hall again:', c, log.length ? '\n  ' + log.join('\n  ') : '')
  if (log.length || !a.hall || !/stage=hall/.test(a.url) || b.hall || /stage=hall/.test(b.url) || !c.hall) failed++
}
await browser.close()
console.log(failed ? `${failed} failed` : 'all passed', '· pictures in', out)
process.exit(failed ? 1 : 0)
