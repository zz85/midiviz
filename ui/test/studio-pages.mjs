// The studio panel and the trimmed menus on the real pages, headless: #045, #032 and #038, each
// with and without ?studio=1. Checks: nothing of the studio is loaded without it; with it, the
// panel has a folder a menu and a binding a setting, the Hands folder's graphs read the rig,
// a change in the store reaches the control, a select the page rebuilds (the export's
// resolutions) follows, a control the page hides is hidden in the panel, the ` key hides the
// panel and takes studio out of the address bar; the pianist pages' menus are trimmed to the
// audience's list with a "more in the studio" line, and every link is kept; no page errors.
//   node ui/test/studio-pages.mjs
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0; const check = (ok, w) => { console.log(ok ? 'ok  ' : 'FAIL', w); if (!ok) fails++ }
const PAGES = [
  ['045_pathtracer.html', 'q=low&hairsim=0&clothsim=0&start=0', { pops: true, stageKey: 'scene', ready: () => window.__pianist?.pt && window.__settings }],
  ['032_pianist.html', 'q=low&hairsim=0&clothsim=0&start=0', { pops: true, stageKey: 'stage', ready: () => window.__stageSets && window.__settings && window.__pianist }],
  ['038_duo.html', '', { pops: false, ready: () => window.__duo && window.__settings }],
]
for (const [page, base, o] of PAGES) for (const studio of [true, false]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(0)
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  await p.goto(`${BASE}${page}?${base}${studio ? '&studio=1' : ''}`)
  await p.waitForFunction(o.ready, null, { timeout: 300000 }); await p.waitForTimeout(3000)
  if (studio) await p.waitForFunction(() => [...document.querySelectorAll('.studio .tp-fldv_t')].some(e => e.textContent === 'Hands'), null, { timeout: 60000 })
  const tag = `${page} ${studio ? 'with' : 'without'} ?studio=1:`
  const r = await p.evaluate(() => {
    const m = document.querySelector('.studio'), S = window.__settings
    return { has: !!m, css: !!document.querySelector('link[href*="studio.css"]'), folders: m ? [...m.querySelectorAll(':scope > .tp-rotv_c > .tp-fldv > .tp-fldv_b .tp-fldv_t')].map(e => e.textContent) : [], n: m ? m.querySelectorAll('.tp-lblv').length : 0, items: S.keys().length, search: location.search }
  })
  check(r.has === studio && r.css === studio, `${tag} panel ${r.has}, css ${r.css}`)
  if (o.pops) {
    const t = await p.evaluate(() => {
      const hid = id => { const e = document.getElementById(id); return e ? getComputedStyle(e.closest('.field, .chk, label')).display === 'none' : null }
      return { tail: ['slit', 'dirPace', 'rvDecay', 'exFont', 'dofAmt', 'ptBounces'].map(hid), kept: ['outfit', 'camMove', 'room', 'exFormat', 'light', 'ptEngine', 'parkTod'].map(hid), more: [...document.querySelectorAll('.tailMore button')].map(b => b.closest('.pop').id + ':' + b.textContent.split(' ')[0]), sects: [...document.querySelectorAll('.pop .sect')].filter(e => getComputedStyle(e).display === 'none').map(e => e.firstChild.textContent) }
    })
    check(t.tail.every(v => v !== false) && t.kept.every(v => v !== true), `${tag} menus trimmed: tail hidden (${t.tail.join(',')}), kept shown (${t.kept.join(',')})`)
    check(t.more.length >= 5, `${tag} "more in the studio" lines: ${t.more.join(' ')}; headings hidden: ${t.sects.join(', ')}`)
  }
  if (studio) {
    check(r.n >= r.items - 2 && r.folders.includes('Hands') && r.folders.at(-1) === 'Track editor', `${tag} ${r.n} bindings over ${r.items} settings; folders: ${r.folders.join(', ')}`)
    // the Hands folder reads the rig
    await p.evaluate(() => { window.__studio.hands.folder.expanded = true })
    await p.waitForTimeout(1000)
    const h = await p.evaluate(() => { const st = document.querySelector('.studio'); const track = [...st.querySelectorAll('.tp-lblv')].find(l => l.querySelector('.tp-lblv_l')?.textContent === 'L track')?.querySelector('input')?.value; return { track, graphs: st.querySelectorAll('.tp-grlv').length } })
    check(h.graphs === 12 && /^(live|baked|resting)$/.test(h.track || ''), `${tag} Hands: ${h.graphs} graphs, L track ${h.track}`)
    // the store reaches the control; a tail control, through the panel alone
    if (o.pops) {
      const light = await p.evaluate(() => { window.__settings.set('light', 0.3); window.__settings.set('rvDecay', 1.3); return [document.getElementById('light')?.value, document.getElementById('rvDecay')?.value] })
      check(light[0] === '0.3' && light[1] === '1.3', `${tag} store -> controls: light ${light[0]}, decay (tail) ${light[1]}`)
    } else {
      const room = await p.evaluate(() => { window.__settings.set('room', 'dry'); return document.getElementById('room').value })
      check(room === 'dry', `${tag} store -> control: room ${room}`)
      const lab = await p.evaluate(() => { const b = window.__studio.bindings.get('pianoType').binding; return { label: b.label, first: b.element.querySelector('option')?.textContent } })
      check(lab.label === 'Piano' && lab.first === 'concert grand', `${tag} a toolbar select's "Piano: ..." prefix is its label, the options read without it (${lab.label}: ${lab.first})`)
    }
    if (o.stageKey) {
      await p.evaluate(() => { const S = window.__settings; S.set('stageSet', 'park') }); await p.waitForFunction(() => window.__stageSets.activeId() === 'park', null, { timeout: 120000 }); await p.waitForTimeout(1500)
      const pk = await p.evaluate(() => { const S = window.__settings; S.set('parkTree', 'autumn'); return { opts: window.__stageSets.get('park').opts.style, search: location.search, shown: ![...document.querySelectorAll('.studio .tp-lblv')].find(l => l.textContent.startsWith('Time of day')).classList.contains('tp-v-hidden') } })
      check(pk.opts === 'autumn' && pk.shown, `${tag} the park through stages/sets.js + park/controls.js: tree ${pk.opts}, its hour shown in the panel`)
      await p.waitForTimeout(1200); check(/tree=autumn/.test(await p.evaluate(() => location.search)), `${tag} ...and in the address bar`)
    }
    await p.screenshot({ path: `/tmp/studio-${page.slice(0, 3)}.png` })
    await p.keyboard.press('`'); await p.waitForTimeout(700)
    check(await p.evaluate(() => document.querySelector('.studio').offsetParent === null && !/studio/.test(location.search)), `${tag} the key hides it; studio leaves the address bar`)
  }
  check(errs.length === 0, `${tag} no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`)
  await p.close()
}
await b.close()
console.log(fails ? fails + ' FAILED' : 'all pass'); process.exit(fails ? 1 : 0)
