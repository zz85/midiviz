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
// The hand is also checked against the dress where it lies over her thighs:
// DRESS_SINK cm into it at most (and at rest within FLOAT of the dress or
// her). OUTFIT=braid-halter CLOTH=1: in that outfit, its skirt simulated
// (stepped every frame here, as on the page)
const OUTFIT = process.env.OUTFIT || '', CLOTH = process.env.CLOTH === '1', DRESS_SINK = 0.5
const MODES = (process.env.MODES || 'lap,clasp,sides').split(',')
const songs = process.argv.slice(2).length ? process.argv.slice(2) : ['Prelude1.mid', 'midis/maestro_bach_850.mid']

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = false
for (const song of songs) {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } })
  page.on('pageerror', e => console.log('pageerror:', e.message))
  page.setDefaultTimeout(0)
  await page.goto(`${BASE}032_pianist.html?shot&q=low&hairsim=0&clothsim=${CLOTH ? 1 : 0}${OUTFIT ? '&outfit=' + OUTFIT : ''}&song=${encodeURIComponent(song)}&t=0`)
  await page.waitForFunction(() => window.__shot, null, { timeout: 180000 })
  await page.evaluate(() => window.__shot())
  await page.waitForFunction(() => window.__pianist.rig.hands.notes.length > 0, null, { timeout: 240000 })
  const res = await page.evaluate(async ([FPS, MODES, CLOTH]) => {
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
    for (const mode of MODES) {
      rig.state.restAfter = mode
      let worst = { sink: -Infinity }, rest = { L: Infinity, R: Infinity }, dressWorst = { sink: -Infinity }
      // (the skirt settles over a few seconds before the end)
      const dress = window.__pianist.dress, t0 = end - (CLOTH ? 4 : 1)
      for (let t = t0; t <= end + 6; t += 1 / FPS) {
        rig.update(t, 1 / FPS, true); ch.group.updateMatrixWorld(true)
        if (CLOTH) { window.__pianist.dress.update?.(1 / FPS); window.__pianist.dress.object.updateMatrixWorld(true) }
        if (t < end - 1) continue
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
          // the skirt over it: per bin, its layer nearest the thigh (single-layer
          // cloth; the furthest out would be the skirt across the other thigh)
          fr.dress = new Map()
          if (window.__pianist.dress?.object?.visible) window.__pianist.dress.object.traverse(o => {
            if (!o.isMesh || !o.visible || !o.geometry?.attributes.position) return
            for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) {
              o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld)
              q.subVectors(v, fr.H); const u = q.dot(fr.T); if (u < 0 || u > len) continue
              q.addScaledVector(fr.T, -u); const r = q.length()
              if (r > 20) continue
              const k = key(u, Math.atan2(q.dot(fr.S), q.dot(fr.U)))
              if (!(fr.dress.get(k) <= r)) fr.dress.set(k, r)
            }
          })
        }
        // how far a point is outside the skirt over a thigh (null: no skirt there)
        const outsideDress = p => {
          let best = null
          for (const sd of ['L', 'R']) {
            const fr = grids[sd]; q.subVectors(p, fr.H); const u = q.dot(fr.T)
            if (u < 2 || u > fr.len - 2) continue
            q.addScaledVector(fr.T, -u)
            const a = Math.atan2(q.dot(fr.S), q.dot(fr.U)); if (Math.abs(a) > 0.8) continue   // (the top of the thigh, where a hand lies)
            const R = fr.dress.get(fr.key(u, a)); if (R == null) continue
            const d = q.length() - R; if (best == null || d < best) { best = d; outsideDress.info = { sd, u: +u.toFixed(1), a: +a.toFixed(2), r: +q.length().toFixed(1), R: +R.toFixed(1) } }
          }
          return best
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
          // (clasped: the right hand rests on the left: its nearest vertex to it)
          if (mode === 'clasp' && sd === 'R' && t > end + 4.5) {
            let m = Infinity; const w = new THREE.Vector3()
            for (let j = 0; j < hand.R.length; j += 3) { const p = world(hand.R[j]).clone(); for (let k = 0; k < hand.L.length; k += 3) { body.getVertexPosition(hand.L[k], w).applyMatrix4(body.matrixWorld); m = Math.min(m, p.distanceTo(w)) } }
            rest.R = Math.min(rest.R, m)
          }
          if (t > end + 4.5) for (const i of hand[sd]) { const d = outsideDress(world(i)); if (d != null) rest[sd] = Math.min(rest[sd], d); if (d != null && -d > dressWorst.sink) dressWorst = { sink: -d, side: sd, t: +(t - end).toFixed(2), info: outsideDress.info, meshes: (() => { const l = []; window.__pianist.dress.object.traverse(o => o.isMesh && o.visible && l.push((o.name || o.type) + ':' + o.geometry.attributes.position.count)); return l.join(' ') })() } }
          if (t > end + 4.5) rest[sd] = Math.min(rest[sd], near)
        }
      }
      out.push({ mode, worstSink: +worst.sink.toFixed(2), at: worst.t, side: worst.side, on: worst.on, dress: dressWorst.sink > -Infinity ? { sink: +dressWorst.sink.toFixed(2), side: dressWorst.side, at: dressWorst.t, info: dressWorst.info, meshes: dressWorst.meshes } : null, restGap: { L: +rest.L.toFixed(2), R: +rest.R.toFixed(2) } })
    }
    return out
  }, [FPS, MODES, CLOTH])
  for (const r of res) {
    // (a dress: a skirt drawn across between her thighs, which the rig rests on
    // and this does not measure, leaves up to ~3 cm to the parts it does)
    const fl = r.dress ? 3 : FLOAT
    const sinkOk = r.worstSink <= SINK, restOk = r.restGap.L <= fl && r.restGap.R <= fl
    console.log(`${song} ${r.mode.padEnd(5)}: deepest into her or the bench ${r.worstSink} cm (${r.side} hand into ${r.on}, ${r.at} s after the end) ${sinkOk ? 'ok' : 'FAIL'}; at rest, nearest gap L ${r.restGap.L} cm, R ${r.restGap.R} cm ${restOk ? 'ok' : 'FAIL'}`)
    if (r.dress) {
      const ok = r.dress.sink <= DRESS_SINK
      console.log(`${' '.repeat(song.length)} ${r.mode.padEnd(5)}  at rest, deepest into ${CLOTH ? 'the simulated skirt' : 'the dress'} over her thighs: ${r.dress.sink} cm (${r.dress.side} hand) ${ok ? 'ok' : 'FAIL'}${process.env.DEBUG ? ' ' + JSON.stringify([r.dress.info, r.dress.meshes]) : ''}`)
      failed ||= !ok
    }
    failed ||= !sinkOk || !restOk
  }
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
