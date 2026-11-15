// Left (fingering) arm survey for #037 / #038: plays a piece headless at 60
// fps and reports where the left elbow sits in the violin's frame (x along the
// strings, 0 at the nut, toward the bridge; y the top-plate normal; z across
// the strings, G at +z, so the player's right is +z) by the string being
// fingered and by position, how still it is within a position, and how it
// moves on a shift. Prints; does not pass or fail.
//
//   node violinist/test/leftarm.mjs [song.mid[@model.vrm]] …
//
// Environment as collisions.mjs (BASE, PLAYWRIGHT, CHROME, SECONDS).

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const SECONDS = +(process.env.SECONDS || 60)

const { chromium } = await import(PW)
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['bach_1006_1_preludio.mid', 'bach_1004_5_ciaccona.mid', 'paganini_caprice_24.mid']
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const run of runs) {
  const [song, model] = run.split('@')
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const q = new URLSearchParams({ t: 1, song })
  if (model) q.set('model', model)
  await page.goto(`${BASE}037_violinist.html?shot&${q}`)
  await page.waitForFunction('window.__done', null, { timeout: 240000 })
  const r = await page.evaluate((SECONDS) => {
    const { THREE, vrm, rig, frame, V, leftHand, songDuration } = window.__dbg
    const H = n => vrm.humanoid.getNormalizedBoneNode(n)
    const wp = o => o.getWorldPosition(new THREE.Vector3())
    const inv = new THREE.Matrix4()
    const orig = rig.update
    let pose = null
    rig.update = (p, d, dt) => { pose = p; return orig(p, d, dt) }
    const rows = []
    let prev = null
    for (let t = 4; t < Math.min(SECONDS + 4, songDuration); t += 1 / 60) {
      frame(t, prev == null ? 1 / 60 : t - prev); prev = t
      vrm.scene.updateMatrixWorld(true); V.group.updateMatrixWorld(true)
      inv.copy(V.group.matrixWorld).invert()
      if (!pose || !leftHand.group.visible) continue
      const E = wp(H('leftLowerArm')).applyMatrix4(inv), S = wp(H('leftUpperArm')).applyMatrix4(inv), W = wp(H('leftHand')).applyMatrix4(inv)
      // the string of the finger that is pressing (the lowest-numbered finger pressing a string; the highest string if several)
      let s = null, n = 0
      for (const f of [1, 2, 3, 4]) { const F = pose.fingers[f]; if (F.press > 0) { s = s == null ? F.s : Math.max(s, F.s); n++ } }
      rows.push({ t, E: E.toArray(), S: S.toArray(), W: W.toArray(), s, base: pose.base, anchorU: pose.anchorU, clav: rig.st.lClav, ref: leftHand.joints.elbow.toArray() })
    }
    return { rows, l1: rig.M.L.l1, l2: rig.M.L.l2, k: V.k, x0: V.x0, L: V.L }
  }, SECONDS)
  const { rows, l1, l2, k, x0 } = r
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null }
  const med = a => pct(a, 0.5)
  // position from base (semitones): 1st ≈ 0–2, 3rd ≈ 3–5, 5th ≈ 7–8, 7th ≈ 10–12 …
  const posOf = b => b < 2.5 ? '1st' : b < 5.5 ? '2nd-3rd' : b < 8.5 ? '4th-5th' : b < 12.5 ? '6th-7th' : '8th+'
  const byS = {}, byP = {}, byRefS = {}
  for (const w of rows) {
    if (w.s == null) continue
    const sk = Math.round(w.s)
    ;(byS[sk] ||= []).push(w); (byP[posOf(w.base)] ||= []).push(w); (byRefS[sk] ||= []).push(w.ref[2])
  }
  const T = rows[rows.length - 1].t - rows[0].t
  console.log(`\n== ${run}  (${rows.length} frames, ${T.toFixed(1)} s, left arm ${l1.toFixed(1)} + ${l2.toFixed(1)} cm, violin k ${k})`)
  console.log('left elbow in the violin frame by string fingered (0 = G … 3 = E): z across (+ toward G / the player\'s right), x along (cm from the nut), y below the top; median [5–95 %]:')
  for (const s of Object.keys(byS).sort()) {
    const a = byS[s]
    console.log(`  s=${s}: z ${med(a.map(w => w.E[2]))} [${pct(a.map(w => w.E[2]), 0.05)}, ${pct(a.map(w => w.E[2]), 0.95)}]  x ${med(a.map(w => w.E[0]))}  y ${med(a.map(w => w.E[1]))}  (#033 reference z ${med(byRefS[s])})  ${a.length} frames`)
  }
  console.log('by position (from pose.base): z, x, y, clavicle protraction (rad):')
  for (const p of ['1st', '2nd-3rd', '4th-5th', '6th-7th', '8th+']) {
    const a = byP[p]; if (!a) continue
    console.log(`  ${p.padEnd(8)} z ${med(a.map(w => w.E[2]))}  x ${med(a.map(w => w.E[0]))}  y ${med(a.map(w => w.E[1]))}  clav ${med(a.map(w => w.clav))}  ${a.length} frames`)
  }
  // stillness within a position: elbow distance from its 0.5 s mean, excluding frames within 0.3 s of a base change > 0.5 semitone
  const shiftAt = new Array(rows.length).fill(false)
  for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i].base - rows[i - 1].base) > 0.5) for (let j = -18; j <= 18; j++) if (shiftAt[i + j] != null) shiftAt[i + j] = true
  const still = [], K = 15
  for (let i = K; i < rows.length - K; i++) {
    if (shiftAt[i]) continue
    const m = [0, 0, 0]; for (let j = -K; j <= K; j++) for (let c = 0; c < 3; c++) m[c] += rows[i + j].E[c] / (2 * K + 1)
    still.push(Math.hypot(...rows[i].E.map((v, c) => v - m[c])))
  }
  console.log(`elbow within a position, distance from its 0.5 s mean: 50/95/max ${pct(still, 0.5)} / ${pct(still, 0.95)} / ${pct(still, 1)} cm`)
  // shifts: when the base moves, how far and how fast does the elbow go, and does it lead the hand?
  const shifts = []
  for (let i = 1; i < rows.length; i++) {
    if (Math.abs(rows[i].base - rows[i - 1].base) <= 0.5) continue
    const a = Math.max(0, i - 12), b = Math.min(rows.length - 1, i + 12)
    const dE = Math.hypot(...rows[b].E.map((v, c) => v - rows[a].E[c])), dW = Math.hypot(...rows[b].W.map((v, c) => v - rows[a].W[c]))
    // lead: the frame (relative to i) where the elbow has done half its move vs where the hand has
    const half = (get) => { const d0 = get(a), d1 = get(b); for (let j = a; j <= b; j++) if (Math.abs(get(j) - d0) >= Math.abs(d1 - d0) / 2) return j - i; return 0 }
    shifts.push({ t: +rows[i].t.toFixed(2), semis: +(rows[i].base - rows[i - 1].base).toFixed(1), dE: +dE.toFixed(1), dW: +dW.toFixed(1), leadFrames: half(j => rows[j].E[0]) - half(j => rows[j].W[0]) })
  }
  const up = shifts.filter(s => s.semis > 0), down = shifts.filter(s => s.semis < 0)
  const sum = (a, f) => a.length ? +(a.reduce((p, s) => p + f(s), 0) / a.length).toFixed(2) : null
  console.log(`shifts: ${shifts.length} (${up.length} up, ${down.length} down); elbow travel / hand travel: up ${sum(up, s => s.dE / Math.max(0.1, s.dW))}, down ${sum(down, s => s.dE / Math.max(0.1, s.dW))}; elbow lead over the hand (frames, + = elbow first): up ${sum(up, s => s.leadFrames)}, down ${sum(down, s => s.leadFrames)}`)
  for (const s of shifts.slice(0, 6)) console.log('   ', JSON.stringify(s))
  await page.close()
}
await browser.close()
