// The studio's track editor, presets and the park's wind and cloud sliders on #045 and #038,
// headless: a link's ?curves= reaches the rig (the left wrist higher where the curve says, her
// lean too), a click on the editor's canvas adds a keyframe that goes into the address bar, a
// preset saved comes back by name with its link, the wind and clouds reach the park's uniforms.
//   node ui/test/studio-edit.mjs
// Needs the parent folder served (BASE), playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
let fails = 0; const check = (ok, w) => { console.log(ok ? 'ok  ' : 'FAIL', w); if (!ok) fails++ }
const CURVES = 'liftL:10,0;12,6;14,0|lean:10,0;12,0.3;14,0'
for (const [page, q, ready, rigOf, parkOf, t] of [
  ['045_pathtracer.html', `q=low&hairsim=0&clothsim=0&start=0&scene=park&song=midis/bach_goldberg_aria.mid&t=12&shot=1&studio=1&curves=${CURVES}&pwind=2.5&pclouds=0.9`, () => window.__stageSets?.activeId() === 'park' && window.__studio?.tracks && window.__shot, 'window.__pianist.rig', "window.__stageSets.get('park').park", 12],
  ['038_duo.html', `stage=park&studio=1&curves=${CURVES}&pwind=2.5&pclouds=0.9`, () => window.__duo?.park && window.__studio?.tracks, 'window.__duo.pRig', 'window.__duo.park', 12],
]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(0)
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(`${BASE}${page}?${q}`); await p.waitForFunction(ready, null, { timeout: 300000 }); await p.waitForTimeout(2500)
  // the curves reached the rig: the overrides read the link, and the hand driver adds them
  const r = await p.evaluate(([rigOf, parkOf]) => { const rig = eval(rigOf), park = eval(parkOf); const ov = rig.overrides; return { names: ov.names().sort(), liftAt12: ov.at('liftL', 12), leanAt12: ov.at('lean', 12), liftAt20: ov.at('liftL', 20), wind: park.S.wind, clouds: park.S.clouds, uWind: Math.hypot(park.shared.uWind.value.x, park.shared.uWind.value.y), uCover: park.shared.uCloudCover.value, sliders: ['parkWind', 'parkClouds'].map(k => window.__studio.bindings.get(k)?.binding.label) } }, [rigOf, parkOf])
  check(r.names.join() === 'lean,liftL' && r.liftAt12 === 6 && Math.abs(r.leanAt12 - 0.3) < 1e-9 && r.liftAt20 === 0, `${page}: ?curves= read: lift L at 12 s ${r.liftAt12} cm, lean ${r.leanAt12}, outside ${r.liftAt20}`)
  check(r.wind === 2.5 && r.clouds === 0.9 && Math.abs(r.uWind - 2.5) < 1e-6 && r.uCover === 0.9 && r.sliders.join() === 'Wind,Cloud cover', `${page}: wind ${r.wind} (uniform ${r.uWind.toFixed(2)}), clouds ${r.clouds} (uniform ${r.uCover}); sliders ${r.sliders.join(', ')}`)
  // the wrist is higher with the curve than without, at 12 s, posed by the rig
  const lift = await p.evaluate(([rigOf]) => { const rig = eval(rigOf); const pose = () => { rig.update(12, 1 / 60); return rig.hands.L.joints.W.y }; const w1 = pose(); const ov = rig.overrides; const keys = ov.get('liftL'); ov.clear('liftL'); const w0 = pose(); ov.set('liftL', keys); return { w0, w1, d: w1 - w0 } }, [rigOf])
  check(lift.d > 4 && lift.d < 8, `${page}: the left wrist ${lift.d.toFixed(2)} cm higher at 12 s with the curve (${lift.w0.toFixed(1)} -> ${lift.w1.toFixed(1)})`)
  // the editor: open the folder, click a point, a keyframe appears in the store and the address bar
  await p.evaluate(() => { window.__studio.tracks.folder.expanded = true }); await p.waitForTimeout(300)
  const added = await p.evaluate(() => { const ed = window.__studio.tracks, c = ed.canvas, r = c.getBoundingClientRect(); const before = window.__pianist?.rig?.overrides?.get('liftL').length ?? window.__duo.pRig.overrides.get('liftL').length; const ev = o => new PointerEvent(o, { clientX: r.left + r.width * 0.75, clientY: r.top + r.height * 0.3, bubbles: true, pointerId: 1 }); c.dispatchEvent(ev('pointerdown')); c.dispatchEvent(ev('pointerup')); const ov = window.__pianist?.rig?.overrides || window.__duo.pRig.overrides; return { before, after: ov.get('liftL').length, text: window.__settings.get('curves') } })
  check(added.after === added.before + 1 && /liftL:[^|]*;[^|]*;[^|]*;/.test(added.text), `${page}: a click on the editor adds a keyframe (${added.before} -> ${added.after}); curves setting ${added.text.slice(0, 60)}...`)
  await p.waitForTimeout(1500)
  check(/curves=liftL/.test(decodeURIComponent(await p.evaluate(() => location.search))), `${page}: ...and the address bar carries it`)
  // presets: save, change, recall, link
  const pr = await p.evaluate(async () => { const P = window.__studio.presets, S = window.__settings; window.prompt = () => 'test preset'; window.confirm = () => true; S.set('parkWind', 0.5); const btn = k => P.buttons[k].element.querySelector('button'); btn('save').click(); await new Promise(r => setTimeout(r, 100)); const saved = P.presets.map(p => p.name); S.set('parkWind', 1.2); const w0 = S.get('parkWind'); btn('recall').click(); await new Promise(r => setTimeout(r, 300)); return { saved, w0, w1: S.get('parkWind'), link: P.linkOf(P.presets.find(p => p.name === 'test preset').query), q: P.presets[P.presets.length - 1].query } })
  check(pr.saved.includes('test preset') && pr.w0 === 1.2 && pr.w1 === 0.5, `${page}: preset saved (${pr.saved.join(', ')}), wind changed to ${pr.w0}, recalled to ${pr.w1}`)
  check(/pwind=0\.5/.test(pr.link) && /curves=/.test(pr.link) && !/pwind=0\.5/.test(pr.q) === false, `${page}: the preset's link ${pr.link.slice(pr.link.indexOf('?'), pr.link.indexOf('?') + 80)}...`)
  await p.evaluate(() => localStorage.clear())
  await p.screenshot({ path: `/tmp/studio-edit-${page.slice(0, 3)}.png` })
  check(errs.length === 0, `${page}: no page errors ${errs.join(' | ')}`)
  await p.close()
}
await b.close(); console.log(fails ? fails + ' FAILED' : 'all pass'); process.exit(fails ? 1 : 0)
