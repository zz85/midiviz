// The park as a stage set (park/stage.js) on the solo pianist pages, headless:
//   node park/test/stage.mjs [out dir]
// Stills of #032, #045 and #049 with ?stage=park / ?scene=park, #032 on the black stage
// to compare, then #032 live: switched to the park, played a little, and back.
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/park_stage'] = process.argv.slice(2)
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
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) log.push('console: ' + m.text().slice(0, 300)) })
  page.setDefaultTimeout(0)
  await page.goto(BASE + url)
  return { page, log }
}
const shotQ = 'shot&q=low&hairsim=0&clothsim=0&song=Prelude1.mid&t=20'
const stills = [
  ['032_stage', `032_pianist.html?${shotQ}&view=shoulder`],
  ['032_park', `032_pianist.html?${shotQ}&view=shoulder&stage=park`],
  ['032_park_wide', `032_pianist.html?${shotQ}&view=audience&stage=park&tod=2&tree=sakura`],
  ['045_park', `045_pathtracer.html?${shotQ}&view=shoulder&scene=park`],
  ['049_park', `049_sheet_scan.html?${shotQ}&view=audience&scene=park`],
]
for (const [name, url] of stills.filter(([n]) => !process.env.ONLY || process.env.ONLY.split(',').includes(n))) {
  const { page, log } = await open(url)
  const t0 = Date.now()
  try {
    await page.waitForFunction(() => window.__shot, null, { timeout: 300000 })
    await page.evaluate(() => window.__shot())
    await page.waitForTimeout(300)
    fs.writeFileSync(`${out}/${name}.png`, await page.screenshot())
    const info = await page.evaluate(() => ({ park: !!document.getElementById('stageSet') && document.getElementById('stageSet').value }))
    console.log(name.padEnd(14), `${((Date.now() - t0) / 1000).toFixed(0)} s`, 'stage:', info.park, log.length ? '\n  ' + log.join('\n  ') : '')
    if (log.length) failed++
  } catch (e) { console.log(name, 'FAILED', e.message, log); failed++ }
  await page.close()
}
// live: on and off again, frames drawn each way
if (!process.env.ONLY) {
  const { page, log } = await open('032_pianist.html?q=low&start=0&sw=0')
  await page.waitForFunction(() => window.__pianist?.hair && document.getElementById('stageSet'), null, { timeout: 300000 })
  await page.waitForTimeout(2000)
  const pick = v => page.evaluate(v => { const s = document.getElementById('stageSet'); s.value = v; s.dispatchEvent(new Event('change')) }, v)
  await pick('park')
  await page.waitForFunction(() => !document.getElementById('stageSet').disabled, null, { timeout: 300000 })
  await page.waitForTimeout(3000)
  fs.writeFileSync(`${out}/032_live_park.png`, await page.screenshot())
  const a = await page.evaluate(() => ({ url: location.search, layer: window.__pianist.ch.group.children.find(o => o.isMesh || o.isSkinnedMesh)?.layers.mask }))
  await page.evaluate(() => { const s = document.getElementById('parkTod'); s.value = '4'; s.dispatchEvent(new Event('change')) })
  await page.waitForTimeout(1500)
  fs.writeFileSync(`${out}/032_live_park_night.png`, await page.screenshot())
  await pick('stage')
  await page.waitForFunction(() => !document.getElementById('stageSet').disabled, null, { timeout: 300000 })
  await page.waitForTimeout(1500)
  fs.writeFileSync(`${out}/032_live_stage_again.png`, await page.screenshot())
  const b = await page.evaluate(() => ({ url: location.search, layer: window.__pianist.ch.group.children.find(o => o.isMesh || o.isSkinnedMesh)?.layers.mask, bg: window.__pianist.scene.background?.getHexString() }))
  console.log('032 live      park:', a, '· back:', b, log.length ? '\n  ' + log.join('\n  ') : '')
  if (log.length || a.layer !== 2 || b.layer !== 1 || !/stage=park/.test(a.url) || /stage=park/.test(b.url)) failed++
}
await browser.close()
console.log(failed ? `${failed} failed` : 'all passed', '· pictures in', out)
process.exit(failed ? 1 : 0)
