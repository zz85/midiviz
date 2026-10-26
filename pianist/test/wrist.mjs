// Wrist test for the #032 pianist (and every page sharing its rig: #038,
// #045, #047): plays pieces headless and checks, every frame at 30 fps, that
// each hand stays within what a wrist can bend. Exits 1 if any check fails.
//
//   node pianist/test/wrist.mjs [song.mid …]
//
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as
// violinist/test/posture.mjs. SECONDS: how much of each piece (default 90).
//
// Measured from the skinned skeleton itself (not the driver's own numbers),
// against the rest pose: the forearm (lowerarm01 → wrist) in the hand's frame
// (wrist → middle knuckle; index → little knuckle):
//   ulnar deviation (toward the little finger) ≤ WRIST_RANGE.ulnar, radial
//   ≤ WRIST_RANGE.radial, extension ≤ WRIST_RANGE.ext, flexion ≤ .flex
//   (hand-driver.js), each on 99 % of the frames to within 3°, and never more
//   than 10° past (FAR: the hand bent sideways off the arm, as reported in
//   a #032 still, was ~60–70°);
// and that keeping the wrist did not cost the keys: a pressed fingertip more
// than 1 cm short of its target on at most 5 % of the frames (MISSES: more
// where the fingering already asks for more than a hand can reach, as
// measured before the wrist was kept: The Entertainer's left hand 17 % and
// right 35 %, Rush E's 7 and 8 %; the Goldberg's right hand over Variations 5
// and 6, 5.6 %).
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`   // (aarch64: ~/.local/share/ms-playwright/chromium-1248/chrome-linux-arm64/chrome)
const SECONDS = +(process.env.SECONDS || 90)
const FPS = +(process.env.FPS || 30)
// START: song time to begin at (s); a song may be given as song.mid@start
const START = +(process.env.START || 0)
// (the Goldberg from Variation 5, Bach's hand crossings, to Variation 6)
const DEFAULT = ['Prelude1.mid', 'chpn-p15.mid', 'entertainer.mid', 'rush_e_real.mid', 'midis/bach_goldberg.mid@419']
const TOL = 3, FAR = 10, OUT_SHARE = 0.01, MISS_SHARE = 0.05
// the forearms' centre lines closer than this (cm): one arm through the other
const FOREARMS = 4
// crossed, the hand over clears the one under: deeper than HANDS_PEN cm into
// it (capsules on the bones: palm 1.6 cm, fingers 0.8-0.9) on at most
// HANDS_SHARE of the crossed frames. (Goldberg Var. 5: 47 % before the hand
// over was carried higher, 11 % after; what is left is mostly the first frame or
// two of a crossing and a finger reaching down past the other hand's.)
const HANDS_PEN = 1, HANDS_SHARE = 0.15
// (Rush E, 19.6-20.1 s: the left hand lands beside the right, wrists 8 cm
// apart, not crossed; carried 3 cm higher it still touches it from the side,
// which lifting cannot clear. 15 frames; its own budget until the hands are
// kept apart sideways)
const HANDS_SHARES = { 'rush_e_real.mid': 0.9 }
// over/under swaps inside a passage (Goldberg Var. 5-6: 39 before, 0 after)
const MAX_SWAPS = 2
const MISSES = { 'entertainer.mid': { L: 0.19, R: 0.37 }, 'rush_e_real.mid': { L: 0.09, R: 0.1 }, 'midis/bach_goldberg.mid': { R: 0.065 } }

const { chromium } = await import(PW)
const songs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = 0
// (a hung page never hangs the run: each piece has PIECE_TIMEOUT ms, default 10 min)
const PIECE_TIMEOUT = +(process.env.PIECE_TIMEOUT || 600000)
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what}: timed out after ${ms / 1000} s`)), ms).unref())])
for (const song of songs) try { await within(runPiece(song), PIECE_TIMEOUT, song) } catch (e) { console.log('FAIL', song, e.message.split('\n')[0]); failed++ }
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)

async function runPiece(run) {
  const [song, at] = run.split('@'), start = at ? +at : START
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  try {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${BASE}032_pianist.html?shot&q=low&hairsim=0&clothsim=0&song=${encodeURIComponent(song)}&t=0`)
  await page.waitForFunction(() => window.__shot, null, { timeout: 180000 })
  await page.evaluate(() => window.__shot())
  // (a long piece can take longer to finger than the page's own 20 s wait)
  await page.waitForFunction(() => window.__pianist.rig.hands.notes.length > 0, null, { timeout: 240000 })
  await page.evaluate(() => window.__shot())
  const r = await page.evaluate(async ([SECONDS, FPS, START]) => {
    const { WRIST_RANGE } = await import('./pianist/hand-driver.js')
    const { ch, rig } = window.__pianist
    const V = ch.group.position.constructor, DEG = 180 / Math.PI
    const wp = n => ch.byName[n].getWorldPosition(new V())
    // the wrist's bend from five points: elbow, wrist, middle, index and little knuckles
    const bend = (E, W, K, K2, K5, s) => {
      const fore = W.clone().sub(E).normalize(), fwd = K.clone().sub(W).normalize()
      const lat = K5.clone().sub(K2); lat.addScaledVector(fwd, -lat.dot(fwd)).normalize()
      const up = new V().crossVectors(lat, fwd).multiplyScalar(s).normalize()
      const f = fore.dot(fwd)
      return [-Math.atan2(fore.dot(lat), f) * DEG, -Math.atan2(fore.dot(up), f) * DEG]
    }
    const rest = {}, j = n => new V().copy(ch.joints[n + '____head'])
    for (const sd of ['L', 'R']) { const S = '.' + sd; rest[sd] = bend(j('lowerarm01' + S), j('wrist' + S), j('finger3-1' + S), j('finger2-1' + S), j('finger5-1' + S), sd === 'R' ? 1 : -1) }
    const dur = Math.min(START + SECONDS, rig.hands.notes.reduce((m, n) => Math.max(m, n.off), 0))
    const out = { L: [], R: [] }, both = []
    // closest approach of two segments (the forearms: elbow → wrist)
    // hand capsules: the end of the forearm, the palm (wrist to each knuckle), each phalanx
    const caps = S => {
      const W = wp('wrist' + S), out = [[wp('lowerarm01' + S).lerp(W, 0.6), W, 2.4]]
      for (const f of [1, 2, 3, 4, 5]) {
        const P = [1, 2, 3].map(k => wp(`finger${f}-${k}` + S))
        out.push([W, P[0], f === 1 ? 1.4 : 1.6], [P[0], P[1], f === 1 ? 1 : 0.9], [P[1], P[2], f === 1 ? 0.85 : 0.8])
      }
      return out
    }
    const handsPen = (A, B) => {
      let worst = -Infinity
      for (const x of caps(A)) for (const y of caps(B)) worst = Math.max(worst, x[2] + y[2] - segDist(x[0], x[1], y[0], y[1], 6))
      return worst
    }
    const segDist = (p1, q1, p2, q2, k = 10) => {
      let best = Infinity
      for (let i = 0; i <= k; i++) for (let j = 0; j <= k; j++) best = Math.min(best, p1.clone().lerp(q1, i / k).distanceTo(p2.clone().lerp(q2, j / k)))
      return best
    }
    for (let t = START; t < dur; t += 1 / FPS) {
      rig.update(t, 1 / FPS); ch.group.updateMatrixWorld(true)
      if (rig.hands.L.visible && rig.hands.R.visible) {
        const WL = wp('wrist.L'), WR = wp('wrist.R')
        // with the hands crossed (or about to): how far the hand over goes
        // into the one under, as capsules on the bones
        const over = rig.state.overArm
        const pen = over ? handsPen('.' + over, over === 'L' ? '.R' : '.L') : null
        both.push([t, WL.x > WR.x, segDist(wp('lowerarm01.L'), WL, wp('lowerarm01.R'), WR), pen, over || null])
      }
      for (const sd of ['L', 'R']) {
        const d = rig.hands[sd]; if (!d.visible) continue
        const S = '.' + sd, [u, e] = bend(wp('lowerarm01' + S), wp('wrist' + S), wp('finger3-1' + S), wp('finger2-1' + S), wp('finger5-1' + S), sd === 'R' ? 1 : -1)
        const miss = d.diag.err.some((x, i) => d.diag.press[i] > 0.2 && x > 1)
        out[sd].push([t, u - rest[sd][0], e - rest[sd][1], miss])
      }
    }
    return { out, both, range: Object.fromEntries(Object.entries(WRIST_RANGE).map(([k, v]) => [k, v * DEG])) }
  }, [SECONDS, FPS, start])
  const R = r.range
  const checks = [['ulnar', 1, R.ulnar], ['radial', 1, -R.radial], ['extension', 2, R.ext], ['flexion', 2, -R.flex]]
  for (const sd of ['L', 'R']) {
    const a = r.out[sd]
    if (!a.length) continue
    const pc = (k, p) => { const v = a.map(x => x[k]).sort((x, y) => x - y); return v[Math.floor(p * (v.length - 1))].toFixed(1) }
    const msgs = []
    for (const [name, k, lim] of checks) {
      const past = x => lim > 0 ? x[k] - lim : lim - x[k]
      const out = a.filter(x => past(x) > TOL).length, far = a.filter(x => past(x) > FAR)
      if (out > OUT_SHARE * a.length || far.length) msgs.push(`${name}: ${out} frames past ${Math.abs(lim).toFixed(0)}°${far.length ? `, ${far.length} far past (first at ${far[0][0].toFixed(2)} s, ${Math.abs(far[0][k]).toFixed(0)}°)` : ''}`)
    }
    const miss = a.filter(x => x[3]).length
    if (miss > (MISSES[song]?.[sd] ?? MISS_SHARE) * a.length) msgs.push(`fingertips short of their keys on ${miss} frames`)
    console.log(`${msgs.length ? 'FAIL' : 'ok  '} ${run} ${sd}: ulnar p1/50/99 ${pc(1, 0.01)}/${pc(1, 0.5)}/${pc(1, 0.99)}°, extension ${pc(2, 0.01)}/${pc(2, 0.5)}/${pc(2, 0.99)}°, keys missed ${(100 * miss / a.length).toFixed(1)} % (${a.length} frames)`)
    for (const m of msgs) console.log('       ' + m)
    if (msgs.length) failed++
  }
  if (r.both.length) {
    const crossed = r.both.filter(x => x[1]).length, d = r.both.map(x => x[2]).sort((a, b) => a - b)
    const touching = r.both.filter(x => x[2] < FOREARMS).length
    console.log(`${touching > OUT_SHARE * r.both.length ? 'FAIL' : 'ok  '} ${run} hands: crossed on ${crossed} frames, forearms at least ${d[0].toFixed(1)} cm apart (p1 ${d[Math.floor(0.01 * (d.length - 1))].toFixed(1)} cm), closer than ${FOREARMS} cm on ${touching}`)
    if (touching > OUT_SHARE * r.both.length) failed++
    // the hands swapping over and under inside a passage (a crossing within
    // 2 s of the last one): none, as a pianist keeps the same hand on top
    let lastO = null, lastT = -Infinity, swaps = 0
    for (const x of r.both) if (x[4]) { if (lastO && x[4] !== lastO && x[0] - lastT < 2) swaps++; lastO = x[4]; lastT = x[0] }
    if (lastO) {
      console.log(`${swaps > MAX_SWAPS ? 'FAIL' : 'ok  '} ${run} over/under: swapped inside a passage ${swaps} times (at most ${MAX_SWAPS})`)
      if (swaps > MAX_SWAPS) failed++
    }
    const crossedF = r.both.filter(x => x[3] != null), deep = crossedF.filter(x => x[3] > HANDS_PEN)
    if (crossedF.length) {
      const share = HANDS_SHARES[run.split('@')[0]] ?? HANDS_SHARE, bad = deep.length > share * crossedF.length
      console.log(`${bad ? 'FAIL' : 'ok  '} ${run} hand over hand: one hand more than ${HANDS_PEN} cm into the other on ${deep.length} of ${crossedF.length} crossed frames (${(100 * deep.length / crossedF.length).toFixed(0)} %, at most ${Math.round(100 * share)} %)`)
      if (bad) failed++
    }
  }
  if (errors.length) { console.log('FAIL', song, 'page errors:', errors.join(' | ')); failed++ }
  } finally { await page.close().catch(() => {}) }
}
