// Bow-arm motion survey for #037 / #038 (research/06_bow_arm.md §2): plays a
// piece headless at 60 fps and reports how the right elbow moves against the
// hand, per string and per kind of frame (string crossing, stroke, still),
// plus one-frame jumps. It prints; it does not pass or fail (posture.mjs will,
// once the budgets of 06 §2.3 step 5 are in).
//
//   node violinist/test/bowarm.mjs [song.mid[@model.vrm]] …
//
// Environment as collisions.mjs (BASE, PLAYWRIGHT, CHROME, SECONDS).

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const SECONDS = +(process.env.SECONDS || 30)

const { chromium } = await import(PW)
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['bach_1006_1_preludio.mid', 'beethoven_romance_2.mid', 'bach_1001_1_adagio.mid']
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const run of runs) {
  const [song, model] = run.split('@')
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const q = new URLSearchParams({ t: 1, song })
  if (model) q.set('model', model)
  await page.goto(`${BASE}037_violinist.html?shot&${q}`)
  await page.waitForFunction('window.__done', null, { timeout: 240000 })
  const r = await page.evaluate((SECONDS) => {
    const { THREE, vrm, rig, frame, songDuration } = window.__dbg
    const H = n => vrm.humanoid.getNormalizedBoneNode(n)
    const wp = o => o.getWorldPosition(new THREE.Vector3())
    // the bow state the rig was given (string s as a float, pos in cm from the frog)
    const orig = rig.update
    let last = null
    rig.update = (pose, drive, dt) => { last = pose?.bow; return orig(pose, drive, dt) }
    const rows = []
    let prevT = null
    for (let t = 4; t < Math.min(SECONDS + 4, songDuration); t += 1 / 60) {
      frame(t, prevT == null ? 1 / 60 : t - prevT); prevT = t
      vrm.scene.updateMatrixWorld(true)
      rows.push({ t, S: wp(H('rightUpperArm')).toArray(), E: wp(H('rightLowerArm')).toArray(), W: wp(H('rightHand')).toArray(), s: last?.s, pos: last?.pos, playing: last?.playing, cost: rig.st.bh?.cost })
    }
    return { rows, l1: rig.M.R.l1, l2: rig.M.R.l2, height: rig.height }
  }, SECONDS)
  const { rows, l1, l2, height } = r
  const sub = (a, b) => a.map((v, i) => v - b[i]), len = a => Math.hypot(...a), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null }
  const stats = a => `${pct(a, 0.05)} / ${pct(a, 0.5)} / ${pct(a, 0.95)} (max ${pct(a, 1)})`
  const bins = { crossing: { n: 0, e: 0, w: 0 }, stroke: { n: 0, e: 0, w: 0 }, still: { n: 0, e: 0, w: 0 } }
  const upper = { n: 0, e: 0, w: 0 }           // strokes with the bow past 35 cm (the upper half)
  const byString = {}, jumps = [], elbowSpeed = [], wristSpeed = [], flex = [], swivel = [], swivelRate = []
  let elbowPath = 0, wristPath = 0, rev = 0
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i], dt = b.t - a.t
    if (!b.playing) continue
    const dE = len(sub(b.E, a.E)), dW = len(sub(b.W, a.W))
    elbowPath += dE; wristPath += dW; elbowSpeed.push(dE / dt); wristSpeed.push(dW / dt)
    const ds = Math.abs((b.s ?? 0) - (a.s ?? 0)), dp = Math.abs((b.pos ?? 0) - (a.pos ?? 0))
    const k = ds > 0.05 ? 'crossing' : dp > 0.3 ? 'stroke' : 'still'
    bins[k].n++; bins[k].e += dE; bins[k].w += dW
    if (k === 'stroke' && b.pos > 35) { upper.n++; upper.e += dE; upper.w += dW }
    if (dE > 3) jumps.push({ t: +b.t.toFixed(2), cm: +dE.toFixed(1), s: +b.s.toFixed(2), pos: +b.pos.toFixed(1), cost: +(b.cost ?? 0).toFixed(1), costBefore: +(a.cost ?? 0).toFixed(1) })
    ;(byString[Math.round(b.s)] ||= []).push(b.E[1] - b.S[1])
    const u = sub(b.S, b.E), f = sub(b.W, b.E)
    flex.push(Math.acos(dot(u, f) / len(u) / len(f)) * 180 / Math.PI)
    // swivel: the elbow's angle about the shoulder → wrist axis, from straight down (+ toward the audience, +z)
    const ax = sub(b.W, b.S), n = len(ax), axn = ax.map(v => v / n)
    const e = sub(b.E, b.S), ep = sub(e, axn.map(v => v * dot(e, axn)))
    const dn = [0, -1, 0], dp2 = sub(dn, axn.map(v => v * dot(dn, axn)))
    const sw = Math.atan2(dot(ep, cross(axn, dp2)), dot(ep, dp2)) * 180 / Math.PI
    if (swivel.length) swivelRate.push(Math.abs(sw - swivel[swivel.length - 1]) / dt)
    swivel.push(sw)
    if (i > 1) { const d1 = a.E[1] - rows[i - 2].E[1], d2 = b.E[1] - a.E[1]; if (d1 * d2 < 0 && Math.abs(d2) > 0.05) rev++ }
  }
  // the elbow's fast motion: its distance from its own running mean over ±0.1 s
  // (what pumps with the notes; a slow crossing or a stroke passes through)
  const fast = [], fastW = []
  const K = 6
  for (let i = K; i < rows.length - K; i++) {
    if (!rows[i].playing) continue
    const mE = [0, 0, 0], mW = [0, 0, 0]
    for (let j = -K; j <= K; j++) for (let k = 0; k < 3; k++) { mE[k] += rows[i + j].E[k] / (2 * K + 1); mW[k] += rows[i + j].W[k] / (2 * K + 1) }
    fast.push(len(sub(rows[i].E, mE))); fastW.push(len(sub(rows[i].W, mW)))
  }
  const T = rows[rows.length - 1].t - rows[0].t
  console.log(`\n== ${run}  (${rows.length} frames, ${T.toFixed(1)} s, arm ${l1.toFixed(1)} + ${l2.toFixed(1)} cm, model ${height.toFixed(0)} cm)`)
  console.log(`elbow path / wrist path: ${(elbowPath / wristPath).toFixed(2)}  (${elbowPath.toFixed(0)} / ${wristPath.toFixed(0)} cm);  upper-half strokes (pos > 35): ${upper.n ? (upper.e / upper.w).toFixed(2) : 'none'} over ${upper.n} frames`)
  for (const [k, v] of Object.entries(bins)) console.log(`  ${k.padEnd(9)} ${String(v.n).padStart(5)} frames  elbow ${(v.e / Math.max(1, v.n)).toFixed(2)} cm/frame  wrist ${(v.w / Math.max(1, v.n)).toFixed(2)} cm/frame  ratio ${(v.e / Math.max(1e-6, v.w)).toFixed(2)}`)
  console.log(`elbow speed cm/s 5/50/95: ${stats(elbowSpeed)};  wrist: ${stats(wristSpeed)}`)
  console.log(`elbow fast motion (cm from its 0.2 s mean) 50/95/max: ${pct(fast, 0.5)} / ${pct(fast, 0.95)} / ${pct(fast, 1)};  wrist: ${pct(fastW, 0.5)} / ${pct(fastW, 0.95)} / ${pct(fastW, 1)}`)
  console.log(`elbow-height reversals: ${(rev / T).toFixed(1)} /s;  one-frame jumps > 3 cm: ${jumps.length}`)
  for (const j of jumps.slice(0, 8)) console.log('   ', JSON.stringify(j))
  console.log(`elbow flexion (interior °): ${stats(flex)}`)
  console.log(`swivel about the shoulder–wrist axis (° from down): ${stats(swivel)};  rate °/s: ${stats(swivelRate)}`)
  console.log('elbow height below the shoulder by string (0 = G … 3 = E), 5/50/95 %:')
  for (const s of Object.keys(byString).sort()) console.log(`  s=${s}: ${stats(byString[s])}  (${byString[s].length} frames)`)
  await page.close()
}
await browser.close()
