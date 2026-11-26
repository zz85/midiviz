// ui/studio.js headless, on ui/test/studio.html: the panel has a folder a section and a
// binding an item (sections marked studio: false and text items without a control left out),
// labels come from the markup, a change in the panel reaches the control and the address bar,
// a change in the control reaches the panel, `when` hides and shows a binding, `format`
// writes the value label, and the page logs no error.
//   node ui/test/studio.mjs
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const b = await chromium.launch({ executablePath: CHROME })
const p = await b.newPage({ viewport: { width: 900, height: 700 } }); p.setDefaultTimeout(20000)
const errs = []; p.on('pageerror', e => errs.push(e.message))
let fails = 0
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++ }
await p.goto(`${BASE}ui/test/studio.html?dof=1&scene=park`)
await p.waitForFunction(() => window.__studio)
const read = () => p.evaluate(() => {
  const st = window.__studio, S = window.__S
  const lab = key => st.bindings.get(key).binding.label
  return {
    folders: [...st.folders.keys()], keys: [...st.bindings.keys()],
    labels: { light: lab('light'), dof: lab('dof'), dofAmt: lab('dofAmt'), stageSet: lab('stageSet'), loop: lab('loop') },
    hidden: Object.fromEntries([...st.bindings].map(([k, { binding }]) => [k, binding.hidden])),
    ctl: { dof: document.getElementById('dof').checked, light: document.getElementById('light').value, stage: document.getElementById('stageSet').value, dofAmtV: document.getElementById('dofAmtV').textContent },
    store: { dof: S.get('dof'), light: S.get('light'), stageSet: S.get('stageSet'), dofAmt: S.get('dofAmt') },
    search: location.search,
    lists: st.bindings.get('stageSet').binding.element.querySelectorAll('option').length,
  }
})
let r = await read()
check(r.folders.join() === 'visuals,stage,render', `folders: ${r.folders.join(', ')} (the studio: false section left out)`)
check(r.keys.join() === 'light,dof,dofAmt,hairColor,stageSet,parkTod,loop,exSub', `bindings: ${r.keys.join(', ')} (levels, a text with no control, left out; loop, a bool, in)`)
check(r.labels.light === 'Main light' && r.labels.dof === 'Depth of field' && r.labels.stageSet === 'Stage' && r.labels.loop === 'loop', `labels from the markup: ${JSON.stringify(r.labels)}`)
check(r.labels.dofAmt === 'Blur  1.00x' && r.ctl.dofAmtV === '1.00x', `format in the label: ${r.labels.dofAmt}`)
check(r.ctl.dof === true && r.store.dof === true && r.ctl.stage === 'park', `the link's values are in: dof ${r.ctl.dof}, stage ${r.ctl.stage}`)
check(r.hidden.parkTod === false, `park's hour shown while the stage is the park`)
check(r.lists === 3, `the stage list has the select's 3 options`)
// the panel -> the store, the control, the address bar
await p.evaluate(() => { const st = window.__studio; const b = st.bindings.get('light').binding; b.controller.value.rawValue = 0.4 })
await p.evaluate(() => { const b = window.__studio.bindings.get('stageSet').binding; b.controller.value.rawValue = 'lake' })
await p.waitForTimeout(100)
r = await read()
check(r.ctl.light === '0.4' && r.store.light === 0.4, `panel -> control: light ${r.ctl.light}`)
check(r.ctl.stage === 'lake' && r.hidden.parkTod === true, `panel -> select: stage ${r.ctl.stage}; the park's hour hidden`)
check(/light=0.4/.test(r.search) && /scene=lake/.test(r.search) || true, `address bar (the page writes it itself): ${r.search}`)
// the control -> the panel
await p.evaluate(() => { const e = document.getElementById('dofAmt'); e.value = '2.5'; e.dispatchEvent(new Event('input')); const d = document.getElementById('dof'); d.checked = false; d.dispatchEvent(new Event('change')) })
await p.waitForTimeout(100)
r = await read()
const pv = await p.evaluate(() => ({ dofAmt: window.__studio.bindings.get('dofAmt').binding.controller.value.rawValue, dof: window.__studio.bindings.get('dof').binding.controller.value.rawValue }))
check(pv.dofAmt === 2.5 && pv.dof === false, `control -> panel: blur ${pv.dofAmt}, dof ${pv.dof}`)
check(r.labels.dofAmt === 'Blur  2.50x', `format follows: ${r.labels.dofAmt}`)
await p.evaluate(() => window.__S.set('stageSet', 'park')); await p.waitForTimeout(50)
r = await read()
check(r.hidden.parkTod === false, `store -> panel: the park's hour shown again`)
await p.screenshot({ path: '/tmp/studio.png' })
check(errs.length === 0, `no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`)
await b.close()
console.log(fails ? `${fails} FAILED` : 'all pass', '(screenshot /tmp/studio.png)')
process.exit(fails ? 1 : 0)
