// Hands at rest after the end (pianist/rig.js restPose / toLap), for #032
// and every page sharing its rig: plays the last seconds of a piece headless
// and checks, every frame from the last note to 6 s after it, that her hands
// stay out of her thighs and the bench, and that at the end they rest on
// them rather than float. Exits 1 if any check fails.
//
//   node pianist/test/rest.mjs [song.mid …]
//
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pianist/test/wrist.mjs.
//
// Measured on the skinned body mesh itself: each hand vertex (its strongest
// bone the wrist or a finger) against the thigh's own surface where it is
// (the thigh's vertices binned along the thigh bone and round it, the
// furthest out in each bin), and against the bench top (55.4 cm, 76 × 34 cm
// round the seat). A hand vertex more than SINK cm inside fails; at rest
// (from 4.5 s after the last note) the hand must be within FLOAT cm of what it
// rests on. Modes: 'lap' (on her thighs) and 'sides' (on the bench).
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
// (FLOAT: the rig keeps 1.2 cm for a dress over her thighs, rig.js PAD)
const SINK = 0.5, FLOAT = 2, FPS = 15
const songs = process.argv.slice(2).length ? process.argv.slice(2) : ['Prelude1.mid', 'midis/maestro_bach_850.mid']

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = false
for (const song of songs) {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } })
  page.on('pageerror', e => console.log('pageerror:', e.message))
  page.setDefaultTimeout(0)
  await page.goto(`${BASE}032_pianist.html?shot&q=low&hairsim=0&clothsim=0&song=${encodeURIComponent(song)}&t=0`)
  await page.waitForFunction(() => window.__shot, null, { timeout: 180000 })
  await page.evaluate(() => window.__shot())
  await page.waitForFunction(() => window.__pianist.rig.hands.notes.length > 0, null, { timeout: 240000 })
  const res = await page.evaluate(async ([FPS]) => {
    const { ch, rig } = window.__pianist
    const THREE = await import('three')
    const body = ch.meshes.body, g = body.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, sb = ch.skeleton.bones
    const dom = i => { let b = 0, w = -1; for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > w) { w = x; b = si.getComponent(i, k) } } return sb[b].name }
    const hand = { L: [], R: [] }, thigh = { L: [], R: [] }
    for (let i = 0; i < g.attributes.position.count; i++) {
      const n = dom(i), sd = n.endsWith('.L') ? 'L' : n.endsWith('.R') ? 'R' : null
      if (!sd) continue
      if (/^(wrist|finger|metacarpal)/.test(n)) hand[sd].push(i)
      else if (/^upperleg0[12]/.test(n)) thigh[sd].push(i)
    }
    const bone = n => sb.find(b => b.name === n)
    const v = new THREE.Vector3(), H = new THREE.Vector3(), K = new THREE.Vector3(), T = new THREE.Vector3(), U = new THREE.Vector3(), S = new THREE.Vector3(), q = new THREE.Vector3()
    const world = i => body.getVertexPosition(i, v).applyMatrix4(body.matrixWorld)
    const end = rig.hands.endT, out = []
    for (const mode of ['lap', 'sides']) {
      rig.state.restAfter = mode
      let worst = { sink: -Infinity }, rest = { L: Infinity, R: Infinity }, pathSink = -Infinity
      for (let t = end - 1; t <= end + 6; t += 1 / FPS) {
        rig.update(t, 1 / FPS, true); ch.group.updateMatrixWorld(true)
        // each thigh's surface: the furthest-out vertex per (along, round) bin
        const grids = {}
        for (const sd of ['L', 'R']) {
          bone('upperleg01.' + sd).getWorldPosition(H); bone('lowerleg01.' + sd).getWorldPosition(K)
          const len = H.distanceTo(K); T.subVectors(K, H).normalize()
          U.set(0, 1, 0).addScaledVector(T, -T.y).normalize(); S.crossVectors(T, U).normalize()
          const fr = { H: H.clone(), T: T.clone(), U: U.clone(), S: S.clone(), len, bins: new Map() }
          const key = (u, a) => `${Math.round(u / 2)},${Math.round(a / 0.17)}`
          for (const i of thigh[sd]) {
            q.subVectors(world(i), fr.H); const u = q.dot(fr.T); q.addScaledVector(fr.T, -u)
            const a = Math.atan2(q.dot(fr.S), q.dot(fr.U)), r = q.length(), k = key(u, a)
            if (!(fr.bins.get(k) >= r)) fr.bins.set(k, r)
          }
          fr.key = key; grids[sd] = fr
        }
        // how far a point is outside a thigh (null: not over it)
        let what = null
        const outside = p => {
          let best = null
          for (const sd of ['L', 'R']) {
            const fr = grids[sd]; q.subVectors(p, fr.H); const u = q.dot(fr.T)
            if (u < 2 || u > fr.len - 2) continue
            q.addScaledVector(fr.T, -u)
            const a = Math.atan2(q.dot(fr.S), q.dot(fr.U)), r = q.length(), R = fr.bins.get(fr.key(u, a))
            if (R == null) continue
            const d = r - R; if (best == null || d < best) { best = d; what = 'thigh ' + sd }
          }
          return best
        }
        const benchOut = p => Math.abs(p.x) < 38 && Math.abs(p.z - 44) < 17 ? p.y - 55.4 : null
        for (const sd of ['L', 'R']) {
          let sink = -Infinity, near = Infinity, on = null
          for (const i of hand[sd]) {
            const p = world(i)
            const o = outside(p), oWhat = what, b = benchOut(p)
            if (o != null) { if (-o > sink) { sink = -o; on = oWhat } near = Math.min(near, o) }
            if (b != null) { if (-b > sink) { sink = -b; on = 'the bench' } near = Math.min(near, b) }
          }
          if (sink > worst.sink) worst = { sink, side: sd, t: +(t - end).toFixed(2), on }
          if (t > end + 4.5) rest[sd] = Math.min(rest[sd], near)
        }
      }
      out.push({ mode, worstSink: +worst.sink.toFixed(2), at: worst.t, side: worst.side, on: worst.on, restGap: { L: +rest.L.toFixed(2), R: +rest.R.toFixed(2) } })
    }
    return out
  }, [FPS])
  for (const r of res) {
    const sinkOk = r.worstSink <= SINK, restOk = r.restGap.L <= FLOAT && r.restGap.R <= FLOAT
    console.log(`${song} ${r.mode.padEnd(5)}: deepest into her or the bench ${r.worstSink} cm (${r.side} hand into ${r.on}, ${r.at} s after the end) ${sinkOk ? 'ok' : 'FAIL'}; at rest, nearest gap L ${r.restGap.L} cm, R ${r.restGap.R} cm ${restOk ? 'ok' : 'FAIL'}`)
    failed ||= !sinkOk || !restOk
  }
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
