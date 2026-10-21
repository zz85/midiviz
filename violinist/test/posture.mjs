// Left-hand posture test for #037 Violinist (research/04_left_hand.md §4):
// plays pieces headless and checks every 0.25 s that the left hand holds the
// violin as a violinist's does. Exits 1 if any check fails.
//
//   node violinist/test/posture.mjs [song.mid[@model.vrm]] …
//
// Environment as violinist/test/collisions.mjs (BASE, PLAYWRIGHT, CHROME,
// SECONDS). Per frame, for each finger that is pressing a string:
//   the fingertip on its stop (≤ 0.3 cm), the base joint's flexion −15…90°,
//   the finger leaning ≤ 30° out of the plane square to the knuckle line
//   (what reads as a finger bent sideways), the middle joint 25…112° (fingers 1–3; the 4th may lie
//   flatter, ≥ 10°). A stop that #033's own hand cannot reach from its frame
//   (an extension), or one more than 1.5 cm behind its knuckle toward the nut
//   (a finger #033 leaves held down behind a shift), is counted apart as
//   a stretch: the finger reaches toward it, and it is not checked. A finger
//   #033 keeps held down that this hand cannot keep there is lifted by the rig
//   and not checked either;
// and for the hand:
//   the wrist bent ≤ 25° (≤ 15° on 90 % of the frames), the index knuckle
//   within 4 cm of the nut-side contact the posture asks for (it may slide
//   toward the bridge for a short-fingered model), the little knuckle no more
//   than 2 cm above the fingerboard, the thumb's tip within 2 cm of its place
//   under the neck, the elbow under the violin (≥ 8 cm below its top).
// Then 20 s at 60 frames a second, as it plays live: the hand may not turn
// (its knuckle line or its palm) faster than 150°/s on more than 1 % of the
// frames inside a position (it holds its frame there; shifts are left out).
// And the bow hand (research/05_bow_hand.md §4): each fingertip on its contact
// (≤ 0.5 cm), the base joint −15…90°, no finger leaning > 30° out of its
// plane, the middle joint ≥ 25°; the thumb's tip on the frog (≤ 1 cm) and
// bent (≥ 15°); the back of the hand up (palm down onto the stick); the wrist
// within 15° of the research's bend for that part of the bow (≤ 35° in all);
// the elbow bent 60…165°.
// A check fails when more than 2 % of its samples are outside its range, or
// more than 0.5 % are far outside it (FAR); for a fingertip off its stop, 3 %
// and 1.5 %: the fingerings ask for the odd chord, crossed double stop or shift
// no hand makes cleanly, and the VRoid hands are about 0.8 of a man's, so a
// wide chord #033's hand spans can leave one finger short. The percentiles
// are printed per piece.

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const SECONDS = +(process.env.SECONDS || 120)

const DEFAULT = [
  'bach_1006_1_preludio.mid',
  'bach_1004_5_ciaccona.mid',
  'paganini_caprice_24.mid',
  'beethoven_kreutzer_3_presto.mid@vroid-sakurada-fumiriya.vrm',
]

const { chromium } = await import(PW)
const runs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = 0
for (const run of runs) {
  const [song, model] = run.split('@')
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const q = new URLSearchParams({ t: 1, song })
  if (model) q.set('model', model)
  await page.goto(`${BASE}037_violinist.html?shot&${q}`)
  await page.waitForFunction('window.__done', null, { timeout: 240000 })
  const r = await page.evaluate((SECONDS) => {
    const { THREE, vrm, V, rig, leftHand, frame, songDuration } = window.__dbg
    const H = n => vrm.humanoid.getNormalizedBoneNode(n)
    const wp = o => o.getWorldPosition(new THREE.Vector3())
    const J = leftHand.joints, m = rig.M.L
    const inv = new THREE.Matrix4(), L = p => p.clone().applyMatrix4(inv)
    const NAMES = ['Index', 'Middle', 'Ring', 'Little']
    const vals = { tip: [], flex: [], lean: [], pip: [], pip4: [], bend: [], contact: [], little: [], thumb: [], elbow: [], bTip: [], bFlex: [], bLean: [], bPip: [], bThumb: [], bThumbBend: [], bPalm: [], bWrist: [], bElbow: [] }
    let stretches = 0, pressed = 0
    const LEN033 = [8.6, 9.7, 9.1, 7.3]           // #033's finger lengths (strings/hand3d.js LEFT), × its scale
    const FAR = { tip: 1, flex: 30, lean: 8, pip: 20, pip4: 10, bend: 15, contact: 2, little: 1.5, thumb: 1.5, elbow: 4, bTip: 1, bFlex: 30, bLean: 10, bPip: 15, bThumb: 1, bThumbBend: 10, bPalm: 0.3, bWrist: 15, bElbow: 15 }
    const worst = {}, out = {}, far = {}
    const note = (k, v, t, bad) => {
      vals[k].push(v)
      if (bad) {
        out[k] = (out[k] || 0) + 1
        if (bad > FAR[k]) far[k] = (far[k] || 0) + 1
        if (!worst[k] || bad > worst[k].by) worst[k] = { v: +v.toFixed(1), t: +t.toFixed(2), by: +bad.toFixed(1) }
      }
    }
    let prev = 0, frames = 0
    const end = Math.min(SECONDS, songDuration)
    for (let t = 2; t < end; t += 0.25) {
      frame(t, t - prev > 0.3 ? 1 / 60 : 0.25); prev = t
      vrm.scene.updateMatrixWorld(true); V.group.updateMatrixWorld(true)
      inv.copy(V.group.matrixWorld).invert()
      if (!leftHand.group.visible) continue           // nothing fingered (rests)
      frames++
      for (let i = 0; i < 4; i++) {
        const F = m.fingers[i], q = F.q, f = i + 1
        if (!q || !(J.fingers[f].dot.material.opacity > 0) || F.held) continue     // pressing a string (a held finger the rig let go is lifted)
        pressed++
        const stretch = J.fingers[f].base.distanceTo(J.fingers[f].cur) > 0.98 * LEN033[i] * rig.handScale || J.fingers[f].cur.x < J.fingers[f].base.x - 1.5
        const tip = F.pts[3].distanceTo(J.fingers[f].cur)
        if (stretch) { stretches++; continue }
        note('tip', tip, t, tip > 0.3 && tip)
        note('flex', q.flex, t, (q.flex > 90 && q.flex - 90) || (q.flex < -15 && -15 - q.flex))
        note('lean', Math.abs(q.lean), t, Math.abs(q.lean) > 30 && Math.abs(q.lean) - 30)
        if (f < 4) note('pip', q.pip, t, (q.pip < 25 && 25 - q.pip) || (q.pip > 112 && q.pip - 112))
        else note('pip4', q.pip, t, q.pip < 10 && 10 - q.pip)
      }
      const lh = rig.st.lh
      note('bend', lh.bend, t, lh.bend > 25 && lh.bend - 25)
      const k1 = L(wp(H('leftIndexProximal'))), k4 = L(wp(H('leftLittleProximal')))
      const c = J.fingers[1].base, dc = Math.hypot(k1.x - c.x, k1.y - (V.fbY(c.x, 0) - 1), k1.z + V.fbHalf(c.x) + 1.1)
      note('contact', dc, t, dc > 4 && dc - 4)
      const up = k4.y - V.fbY(k4.x, 0)
      note('little', up, t, up > 2 && up - 2)
      const th = m.thumb.tip ? L(m.thumb.tip).distanceTo(J.thumb.target) : 0
      note('thumb', th, t, th > 2 && th - 2)
      const ey = L(wp(H('leftLowerArm'))).y
      note('elbow', ey, t, ey > -8 && ey + 8)
      // the bow hand
      const R = rig.M.R, bh = rig.st.bh
      if (bh) {
        for (let i = 0; i < 4; i++) {
          const q = R.fingers[i].q
          if (!q) continue
          note('bTip', q.miss, t, q.miss > 0.5 && q.miss - 0.5)
          note('bFlex', q.flex, t, (q.flex > 90 && q.flex - 90) || (q.flex < -15 && -15 - q.flex))
          note('bLean', Math.abs(q.lean), t, Math.abs(q.lean) > 30 && Math.abs(q.lean) - 30)
          note('bPip', q.pip, t, q.pip < 25 && 25 - q.pip)
        }
        const td = R.thumb.tip && R.thumb.target ? R.thumb.tip.distanceTo(R.thumb.target) : 0
        note('bThumb', td, t, td > 1 && td - 1)
        note('bThumbBend', R.thumb.bend ?? 0, t, (R.thumb.bend ?? 0) < 15 && 15 - R.thumb.bend)
        note('bPalm', bh.up, t, bh.up < 0.3 && 0.3 - bh.up)
        const dw = Math.abs(bh.wrist - bh.want)
        note('bWrist', bh.wrist, t, (dw > 15 && dw - 15) || (Math.abs(bh.wrist) > 35 && Math.abs(bh.wrist) - 35))
        const S = wp(H('rightUpperArm')), E = wp(H('rightLowerArm')), Wr = wp(H('rightHand'))
        const ea = S.clone().sub(E).angleTo(Wr.clone().sub(E)) * 180 / Math.PI
        note('bElbow', ea, t, (ea > 165 && ea - 165) || (ea < 60 && 60 - ea))
      }
    }
    // live rate: 20 s at 60 fps from 4 s
    let lastK = null, lastP = null, prevT = null
    const turn = []
    for (let t = 4; t < Math.min(24, songDuration); t += 1 / 60) {
      frame(t, prevT == null ? 1 / 60 : t - prevT); prevT = t
      vrm.scene.updateMatrixWorld(true); V.group.updateMatrixWorld(true); inv.copy(V.group.matrixWorld).invert()
      const k1 = L(wp(H('leftIndexProximal'))), k4 = L(wp(H('leftLittleProximal'))), w = L(wp(H('leftHand')))
      const kl = k4.clone().sub(k1).normalize(), pal = kl.clone().cross(k1.clone().lerp(k4, 0.5).sub(w)).normalize()
      // (only within a position: while the hand shifts it may turn faster)
      const fx = J.fingers[1].base.x, still = window.__fx != null && Math.abs(fx - window.__fx) < 0.02 && Math.abs(fx - (window.__fx2 ?? fx)) < 0.02
      window.__fx2 = window.__fx; window.__fx = fx
      if (lastK && still) turn.push(Math.max(kl.angleTo(lastK), pal.angleTo(lastP)) * 180 / Math.PI * 60)
      lastK = kl; lastP = pal
    }
    vals.turn = turn
    const fast = turn.filter(x => x > 150).length / Math.max(1, turn.length)
    if (fast > 0.01) { out.turn = turn.filter(x => x > 150).length; worst.turn = { v: Math.max(...turn), t: 0, by: 0 } }
    const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null }
    const stats = {}
    for (const [k, a] of Object.entries(vals)) stats[k] = [pct(a, 0.05), pct(a, 0.5), pct(a, 0.95)]
    const bend90 = pct(vals.bend, 0.9)
    const frac = Object.fromEntries(Object.entries(out).map(([k, n]) => [k, +(100 * n / vals[k].length).toFixed(1)]))
    const farFrac = Object.fromEntries(Object.entries(far).map(([k, n]) => [k, +(100 * n / vals[k].length).toFixed(2)]))
    return { frames, stats, worst, frac, farFrac, bend90, stretch: +(100 * stretches / Math.max(1, pressed)).toFixed(1) }
  }, SECONDS)
  const FRACMAX = { tip: 3, turn: 1 }, FARMAX = { tip: 1.5, turn: 100 }
  const over = k => r.frac[k] > (FRACMAX[k] ?? 2) || (r.farFrac[k] || 0) > (FARMAX[k] ?? 0.5)
  const bad = Object.entries(r.worst).filter(([k]) => over(k)).map(([k, w]) => `${k}: ${r.frac[k]} % of samples out of range (${r.farFrac[k] || 0} % far), worst ${w.v} at ${w.t} s`)
  const notes = Object.entries(r.worst).filter(([k]) => !over(k)).map(([k, w]) => `${k} ${r.frac[k]} %`)
  if (r.bend90 > 15) bad.push(`wrist bent more than 15° on over 10 % of frames (90th percentile ${r.bend90}°)`)
  if (errors.length) bad.push('page errors: ' + errors.join('; '))
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${run} — ${r.frames} frames, stretches ${r.stretch} % of stops; 5/50/95 %: ${Object.entries(r.stats).map(([k, v]) => `${k} ${v.join('/')}`).join(', ')}`)
  for (const b of bad) console.log('     ' + b)
  if (notes.length) console.log('     within budget: ' + notes.join(', '))
  failed += bad.length ? 1 : 0
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
