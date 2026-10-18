// Collision sweep for #037 Violinist: plays pieces headless and checks every
// 0.25 s that the bow, the arms, the violin and the body stay clear of each
// other. Exits 1 if any check fails.
//
//   node violinist/test/collisions.mjs [song.mid[@model.vrm][@outfit]] …
//
// Needs the repo's parent folder served over http (BASE, default
// http://127.0.0.1:8000/midiviz/), playwright-core (PLAYWRIGHT, default
// /tmp/pw/node_modules/playwright-core/index.mjs; `npm i playwright-core` in
// any folder) and a Chromium (CHROME, default playwright's chromium-1134).
// The body is approximated by a sphere for the head (r 11 cm, centred 9 cm
// above the head bone) and a capsule for the torso (r 13 cm, hips + 8 cm to
// the neck); the arms are segments between their joints, with the sleeve
// thickness of the outfit added. These are coarse: a pass means no gross
// interpenetration, not that no polygon touches another.

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const SECONDS = +(process.env.SECONDS || 240)       // per piece (at most)

// minimum clearances (cm) that count as a pass
const LIMITS = {
  bowHead: 3,        // bow stick to the head sphere
  bowTorso: 3,       // bow stick to the torso capsule
  foreTorso: 1,      // right forearm (with sleeve) to the torso
  elbowMidline: 3,   // right elbow stays this far right of the body's midline
  leftElbowBack: 1.5, // left elbow below the violin's back
}

const DEFAULT = [
  'bach_1006_1_preludio.mid',
  'bach_1004_5_ciaccona.mid',
  'paganini_caprice_24.mid',
  'vivaldi_spring_1.mid@vroid-sakurada-fumiriya.vrm@tails',
]

const { chromium } = await import(PW)
const runs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = 0
for (const run of runs) {
  const [song, model, outfit] = run.split('@')
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const q = new URLSearchParams({ t: 1, song })
  if (model) q.set('model', model)
  if (outfit) q.set('outfit', outfit)
  await page.goto(`${BASE}037_violinist.html?shot&${q}`)
  await page.waitForFunction('window.__done', null, { timeout: 240000 })
  const r = await page.evaluate(([SECONDS, sleeve]) => {
    const { THREE, vrm, V, bow, frame, songDuration } = window.__dbg
    const H = n => vrm.humanoid.getNormalizedBoneNode(n)
    const wp = n => H(n).getWorldPosition(new THREE.Vector3())
    const segDist = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)) }
    const segSeg = (a, b, c, d) => { let m = 1e9; for (let i = 0; i <= 20; i++) m = Math.min(m, segDist(a.clone().lerp(b, i / 20), c, d)); return m }
    const inv = new THREE.Matrix4()
    const inViolin = (p, r) => {
      const q = p.clone().applyMatrix4(inv)
      if (q.x < V.x0 + r || q.x > V.x0 + V.bodyLen - r) return false
      return Math.abs(q.z) < 10 * V.k - r && q.y > -1 + r * 0.3 && q.y < V.rib + 1.6 * V.k - r * 0.3
    }
    const min = {}, at = {}, hits = { armInViolin: [] }
    const note = (k, v, t) => { if (!(k in min) || v < min[k]) { min[k] = +v.toFixed(1); at[k] = +t.toFixed(1) } }
    let frames = 0, prev = 0
    const end = Math.min(SECONDS, songDuration)
    for (let t = 2; t < end; t += 0.25) {
      frame(t, t - prev > 0.3 ? 1 / 60 : 0.25); prev = t
      vrm.scene.updateMatrixWorld(true); V.group.updateMatrixWorld(true); bow.group.updateMatrixWorld(true)
      inv.copy(V.group.matrixWorld).invert()
      frames++
      const frog = new THREE.Vector3(-6, 1.7, 0).applyMatrix4(bow.group.matrixWorld), tip = new THREE.Vector3(72, 1.9, 0).applyMatrix4(bow.group.matrixWorld)
      const head = wp('head').add(new THREE.Vector3(0, 9, 2))
      const tA = wp('hips').add(new THREE.Vector3(0, 8, 0)), tB = wp('neck')
      note('bowHead', segDist(head, frog, tip) - 11, t)
      note('bowTorso', segSeg(frog, tip, tA, tB) - 13, t)
      note('foreTorso', segSeg(wp('rightLowerArm'), wp('rightHand'), tA, tB) - 13 - 3.5 - sleeve, t)
      const mid = (wp('neck').x + wp('hips').x) / 2          // his left is +x
      note('elbowMidline', mid - wp('rightLowerArm').x, t)
      note('leftElbowBack', -wp('leftLowerArm').applyMatrix4(inv).y - 4 - sleeve, t)
      for (const S of ['left', 'right']) {
        const a = wp(S + 'UpperArm'), e = wp(S + 'LowerArm'), w = wp(S + 'Hand')
        for (let i = 0; i <= 12; i++) if (inViolin(a.clone().lerp(e, i / 12), 4 + sleeve) || inViolin(e.clone().lerp(w, i / 12), 3 + sleeve)) { hits.armInViolin.push(`${S} ${t.toFixed(1)}`); break }
      }
    }
    return { frames, min, at, hits }
  }, [SECONDS, outfit === 'vest' || outfit === 'school' ? 0 : 1.5])
  const bad = Object.entries(LIMITS).filter(([k, lim]) => !(r.min[k] >= lim)).map(([k, lim]) => `${k} ${r.min[k]} cm at ${r.at[k]} s (limit ${lim})`)
  if (r.hits.armInViolin.length) bad.push(`arm through the violin at ${r.hits.armInViolin.slice(0, 5).join(', ')}${r.hits.armInViolin.length > 5 ? '…' : ''}`)
  if (errors.length) bad.push('page errors: ' + errors.join('; '))
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${run} — ${r.frames} frames; closest (cm): ${Object.entries(r.min).map(([k, v]) => `${k} ${v}`).join(', ')}`)
  for (const b of bad) console.log('     ' + b)
  failed += bad.length ? 1 : 0
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
