// #038's address bar, headless: load each link, wait for the page, nudge one control so
// saveUrl runs, and record what the address bar becomes. Run before and after a change to
// the settings wiring and diff the two files: a link keeps meaning the same thing.
//   node ui/test/duo-url.mjs out.json
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/duo-url.json'] = process.argv.slice(2)
const { chromium } = await import(PW)
const fs = await import('node:fs')
const LINKS = [
  '',
  'view=hands&notes=off&room=dry&bowing=infer&intro=0',
  'stage=park&tod=3&tree=sakura&amb=0&ppaint=1&pscale=0.5',
  'stage=park',
  'piano=upright&panel=closed&layout=curve&vdress=navy&outfit=concert',
  'vol=-6,0&psynth=wavetable&pprog=1&speed=0.75',
  'model=,&violin=hybrid&src=midi',
]
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const res = {}
for (const q of LINKS) {
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); p.setDefaultTimeout(0)
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(`${BASE}038_duo.html${q ? '?' + q : ''}`)
  await p.waitForFunction(() => window.__duo && document.getElementById('room')?.options.length, null, { timeout: 240000 })
  await p.waitForTimeout(1500)
  // the same change on every link, undone: the address bar is rewritten
  await p.evaluate(() => { const e = document.getElementById('intro'); e.checked = !e.checked; e.dispatchEvent(new Event('change')); e.checked = !e.checked; e.dispatchEvent(new Event('change')) })
  await p.waitForTimeout(300)
  const got = await p.evaluate(() => ({
    search: location.search,
    controls: Object.fromEntries([...document.querySelectorAll('select[id], input[id]')].filter(e => e.type !== 'file').map(e => [e.id, e.type === 'checkbox' ? e.checked : e.value])),
    hidden: [...document.querySelectorAll('[id][hidden]')].map(e => e.id).sort(),
  }))
  got.errors = errs
  res[q] = got
  console.log(q || '(none)', '->', got.search, errs.length ? errs : '')
  await p.close()
}
await b.close()
fs.writeFileSync(out, JSON.stringify(res, null, 1))
console.log('wrote', out)
