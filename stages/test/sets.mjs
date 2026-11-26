// The stage sets live, on #032 and #045: black stage -> park -> lake -> black stage, then the
// lake's Sky menu, checking at each step which set is on, which controls show, that the hall's
// floor is back after and that the page logs no errors. Each step's still goes to OUT.
//   node stages/test/sets.mjs        (the folder served at BASE, as lake/test/shoot.mjs)
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PUP = process.env.PUPPETEER || `${process.env.HOME}/test/afterglow/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js`
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const OUT = process.env.OUT || '/tmp/stage-sets'
const { default: puppeteer } = await import(PUP)
const fs = await import('node:fs'); fs.mkdirSync(OUT, { recursive: true })
process.env.LIBGL_ALWAYS_SOFTWARE ??= '1'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--use-gl=angle', '--use-angle=gl-egl', '--ozone-platform=headless', '--ignore-gpu-blocklist', '--no-sandbox'] })
let fails = 0
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails++ }

for (const [name, url] of [['032', '032_pianist.html?q=low&hairsim=0&clothsim=0&start=0&sw=0'], ['045', '045_pathtracer.html?q=low&hairsim=0&clothsim=0&start=0&sw=0']]) {
  console.log(name)
  const page = await browser.newPage()
  await page.setViewport({ width: 960, height: 540 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text().slice(0, 300)) })
  await page.goto(BASE + url)
  await page.waitForFunction(() => window.__stageSets && window.__pianist?.hair && document.getElementById('stageSet'), { timeout: 300000, polling: 500 })
  const pick = async v => {
    await page.evaluate(v => { const s = document.getElementById('stageSet'); s.value = v; s.dispatchEvent(new Event('change')) }, v)
    await page.waitForFunction(v => !document.getElementById('stageSet').disabled && (window.__stageSets.activeId() ?? document.getElementById('stageSet').value) === v, { timeout: 300000, polling: 300 }, v)
    await new Promise(r => setTimeout(r, 1500))
  }
  const state = () => page.evaluate(() => ({
    active: window.__stageSets.activeId(), menu: document.getElementById('stageSet').value,
    shown: [...document.querySelectorAll('.stageCtl')].filter(b => b.style.display !== 'none').map(b => b.dataset.set),
    floor: window.__pianist.floorVisible ? window.__pianist.floorVisible() : null,
  }))
  for (const v of ['park', 'lake', 'stage']) {
    await pick(v)
    const s = await state()
    const want = v === 'stage' ? null : v
    check(s.active === want && s.menu === v, `${v}: on ${s.active}, menu ${s.menu}`)
    check(JSON.stringify(s.shown) === JSON.stringify(want ? [want] : []), `${v}: controls shown ${JSON.stringify(s.shown)}`)
    if (v === 'stage' && s.floor !== null) check(s.floor === true, 'stage: the floor is back')
    await page.screenshot({ path: `${OUT}/${name}_${v}.png` })
  }
  // the lake again, its sky changed from the menu
  await pick('lake')
  await page.evaluate(() => { const s = document.getElementById('lakeTod'); s.value = '3'; s.dispatchEvent(new Event('change')) })
  await new Promise(r => setTimeout(r, 1500))
  check(await page.evaluate(() => window.__lake.opts.time === 3), 'lake: Sky -> blue hour')
  await page.screenshot({ path: `${OUT}/${name}_lake_blue.png` })
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  await page.close()
}
await browser.close()
console.log(fails ? `${fails} failed` : 'all passed', '- stills in', OUT)
process.exit(fails ? 1 : 0)
