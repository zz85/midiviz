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
// right 35 %, Rush E's 7 and 8 %).
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const SECONDS = +(process.env.SECONDS || 90)
const FPS = +(process.env.FPS || 30)
// START: song time to begin at (s); a song may be given as song.mid@start
const START = +(process.env.START || 0)
const DEFAULT = ['Prelude1.mid', 'chpn-p15.mid', 'entertainer.mid', 'rush_e_real.mid']
const TOL = 3, FAR = 10, OUT_SHARE = 0.01, MISS_SHARE = 0.05
// the forearms' centre lines closer than this (cm): one arm through the other
const FOREARMS = 4
const MISSES = { 'entertainer.mid': { L: 0.19, R: 0.37 }, 'rush_e_real.mid': { L: 0.09, R: 0.1 } }

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
    const segDist = (p1, q1, p2, q2) => {
      let best = Infinity
      for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) best = Math.min(best, p1.clone().lerp(q1, i / 10).distanceTo(p2.clone().lerp(q2, j / 10)))
      return best
    }
    for (let t = START; t < dur; t += 1 / FPS) {
      rig.update(t, 1 / FPS); ch.group.updateMatrixWorld(true)
      if (rig.hands.L.visible && rig.hands.R.visible) {
        const WL = wp('wrist.L'), WR = wp('wrist.R')
        both.push([t, WL.x > WR.x, segDist(wp('lowerarm01.L'), WL, wp('lowerarm01.R'), WR)])
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
  }
  if (errors.length) { console.log('FAIL', song, 'page errors:', errors.join(' | ')); failed++ }
  } finally { await page.close().catch(() => {}) }
}
