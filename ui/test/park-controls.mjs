// The park's studio-only controls (park/controls.js: the sun's bearing ?psun=, the ambience's level
// ?pamb=, the size ?pscale=) on #045 and #038, headless: a link's values reach the park, the three
// show as sliders in the studio and nowhere in the menus, the store moves the sun and the level and
// the address bar follows, and the size reloads the page with the rest kept.
//   node ui/test/park-controls.mjs
// Needs the parent folder served (BASE), playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
let fails = 0; const check = (ok, w) => { console.log(ok ? 'ok  ' : 'FAIL', w); if (!ok) fails++ }
for (const [page, q, ready, parkOf] of [
  ['045_pathtracer.html', 'q=low&hairsim=0&clothsim=0&start=0&scene=park&psun=120&pamb=1.5&studio=1', () => window.__stageSets?.activeId() === 'park' && window.__studio, "window.__stageSets.get('park').park"],
  ['038_duo.html', 'stage=park&psun=120&pamb=1.5&studio=1', () => window.__duo?.park && window.__studio, "window.__duo.park"],
]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(0)
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(`${BASE}${page}?${q}`); await p.waitForFunction(ready, null, { timeout: 300000 }); await p.waitForTimeout(2500)
  const r = await p.evaluate(parkOf => { const park = eval(parkOf); const st = window.__studio; const b = k => st.bindings.get(k)?.binding; return { az: park.S.azimuth, amb: park.S.ambience, sunX: +park.shared.uSunDir.value.x.toFixed(3), studio: ['parkSun', 'parkAmbience', 'parkScale'].map(k => b(k) ? b(k).label + (b(k).hidden ? ' (hidden)' : '') : 'missing'), menu: !!document.getElementById('parkSun') } }, parkOf)
  check(r.az === 120 && r.amb === 1.5, `${page}: a link's ?psun=120&pamb=1.5 reach the park (azimuth ${r.az}, ambience ${r.amb})`)
  check(r.studio.join(' | ') === 'Sun bearing | Birds and wind level | Park size' && !r.menu, `${page}: studio sliders ${r.studio.join(', ')}; no control in the menus`)
  const r2 = await p.evaluate(parkOf => { const park = eval(parkOf); const x0 = park.shared.uSunDir.value.x; window.__settings.set('parkSun', 300); window.__settings.set('parkAmbience', 0.2); return { az: park.S.azimuth, moved: park.shared.uSunDir.value.x !== x0, amb: park.S.ambience, changed: park.sun.changed } }, parkOf)
  check(r2.az === 300 && r2.moved && r2.amb === 0.2, `${page}: the store moves the sun (${r2.az}, direction changed ${r2.moved}) and the level (${r2.amb})`)
  await p.waitForTimeout(1500)
  const sr = await p.evaluate(() => location.search)
  check(/psun=300/.test(sr) && /pamb=0\.2/.test(sr), `${page}: address bar ${sr}`)
  // the size: a reload item; set it and the page reloads with ?pscale=
  const nav = p.waitForNavigation(); await p.evaluate(() => window.__settings.set('parkScale', document.getElementById('pscale') ? '0.75' : 0.75)); await nav; await p.waitForFunction(ready, null, { timeout: 300000 }); await p.waitForTimeout(1500)
  const r3 = await p.evaluate(parkOf => ({ scale: eval(parkOf).scale, search: location.search }), parkOf)
  check(Math.abs(r3.scale - 0.75) < 1e-9 && /pscale=0\.75/.test(r3.search) && /psun=300/.test(r3.search), `${page}: size 0.75 reloads the park at ${r3.scale} with the rest kept: ${r3.search}`)
  check(errs.length === 0, `${page}: no page errors ${errs.join(' | ')}`)
  await p.close()
}
await b.close(); console.log(fails ? fails + ' FAILED' : 'all pass'); process.exit(fails ? 1 : 0)
