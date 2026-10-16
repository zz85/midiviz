// Camera director for #032: shots that move, and an automatic editor.
//
// A shot is a camera spot framed on a live subject (the hands, her head, the
// whole figure, the piano, her feet), held in spherical coordinates around it
// (azimuth, elevation, distance, field of view), plus one slow move over the
// shot's length: an orbit, a dolly or zoom in, a dolly or zoom out, a dolly
// zoom (the camera travels while the lens zooms against it, so she keeps her
// size and the hall behind her stretches or closes in), a crane, or a still frame with only a handheld breath. When the shot ends the camera
// either cuts to the next spot or glides into it.
//
// Auto ("the director") plans the whole song from the score: shots are cut on
// phrase starts, short in intense passages and long in quiet ones, the camera
// stays on the hands when they are busy and goes to her face when she looks
// up from the keys, it opens on an establishing shot and pulls out at the end.
// Cuts obey the usual grammar: never to the same spot, never a jump cut
// (a cut needs >= 30° of angle or a clear change of size), alternate sizes,
// don't stay on one subject too long. The plan is a function of song time
// (hashes, no Math.random), so a seek or the offline export replays the same
// film; without a song it runs on its own clock with a generic plan.
//
// Azimuth: 0 = behind her (+z), 90 = her right (the audience side, the open
// lid), 180 = in front of her across the piano (-z), -90 = her left.

import * as THREE from 'three'

const D2R = Math.PI / 180
const clamp = THREE.MathUtils.clamp
const lerp = THREE.MathUtils.lerp
const sstep = THREE.MathUtils.smootherstep
const hash = (k, s = 0) => { const x = Math.sin(k * 127.1 + s * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x) }
const wrap = a => ((a + 540) % 360) - 180

// size: 0 = close, 1 = medium, 2 = wide. moves: what suits the spot.
export const SPOTS = {
  establish: { label: 'From the hall, wide', subj: 'figure', az: 138, el: 9, dist: 700, fov: 24, size: 2, moves: ['dollyIn', 'zoomIn', 'orbit'] },
  audience: { label: 'From the audience', subj: 'head', az: 128, el: 4, dist: 420, fov: 20, size: 1, moves: ['zoomIn', 'dollyIn', 'orbit', 'dollyZoom', 'still'] },
  // flat: square on, so the shot itself doesn't turn (glides into it do).
  // Across the piano is low, under the lid over the strings; minDist keeps
  // its moves from carrying the camera in past the tail
  tail: { label: 'Across the piano', subj: 'head', az: 180, el: 2, dist: 380, fov: 18, size: 1, flat: true, minDist: 320, moves: ['dollyIn', 'zoomIn', 'dollyZoom', 'zoomOut'] },
  front: { label: 'Face, from the piano', subj: 'head', az: 161, el: 8, dist: 106, fov: 34, size: 0, moves: ['dollyIn', 'orbit', 'dollyZoom', 'still'] },
  face: { label: 'Face, close', subj: 'head', az: 198, el: -4, dist: 75, fov: 28, size: 0, moves: ['still', 'orbit', 'dollyOut'] },
  profile: { label: 'Profile', subj: 'head', az: 105, el: 5, dist: 125, fov: 30, size: 0, moves: ['orbit', 'dollyIn', 'dollyZoom', 'still'] },
  headside: { label: 'Profile, close', subj: 'head', az: 96, el: 8, dist: 72, fov: 30, size: 0, moves: ['orbit', 'still'] },
  shoulder: { label: 'Over the shoulder', subj: 'hands', az: -23, el: 37, dist: 160, fov: 40, size: 1, moves: ['dollyIn', 'orbit', 'crane', 'zoomIn'] },
  hands: { label: 'Hands', subj: 'hands', az: -50, el: 34, dist: 90, fov: 40, size: 0, moves: ['orbit', 'dollyOut', 'still'] },
  treble: { label: 'Hands, treble side', subj: 'hands', az: 62, el: 30, dist: 100, fov: 38, size: 0, moves: ['orbit', 'dollyIn', 'still'] },
  keys: { label: 'Along the keys', subj: 'hands', az: 93, el: 7, dist: 120, fov: 30, size: 0, moves: ['zoomIn', 'still', 'dollyOut', 'dollyZoom'], orbitMax: 6 },
  above: { label: 'From above', subj: 'hands', az: -8, el: 72, dist: 150, fov: 38, size: 1, moves: ['orbit', 'dollyIn', 'zoomOut'] },
  side: { label: 'Side, wide', subj: 'figure', az: 90, el: 3, dist: 395, fov: 30, size: 2, flat: true, moves: ['dollyIn', 'zoomOut', 'dollyZoom', 'still'] },
  back: { label: 'Behind', subj: 'figure', az: 3, el: 15, dist: 240, fov: 38, size: 1, moves: ['dollyIn', 'orbit', 'crane'] },
  high: { label: 'High, over the lid', subj: 'piano', az: 120, el: 38, dist: 520, fov: 30, size: 2, moves: ['orbit', 'dollyOut', 'dollyIn'] },
  feet: { label: 'Pedals', subj: 'feet', az: 58, el: 8, dist: 180, fov: 30, size: 1, moves: ['still', 'dollyIn'] },
}
const SUBJ_KIND = { hands: 'hands', feet: 'hands', head: 'pianist', figure: 'pianist', piano: 'piano' }

export const MOVES = {
  still: 'Still',
  orbit: 'Slow orbit',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  dollyIn: 'Push in',
  dollyOut: 'Pull out',
  dollyZoom: 'Dolly zoom',
  crane: 'Crane',
}

// the spot's parameters after `u` (0..1) of its move; `amt` scales it
function applyMove(s, move, u, amt, dir, out) {
  out.az = s.az; out.el = s.el; out.dist = s.dist; out.fov = s.fov
  const e = sstep(u, 0, 1)
  switch (move) {
    case 'orbit': out.az += dir * Math.min(s.orbitMax ?? 30, 22 * amt) * (e - 0.5); break
    case 'zoomIn': out.fov *= lerp(1.08, 1.08 - 0.3 * amt, e); break
    case 'zoomOut': out.fov *= lerp(1 - 0.22 * amt, 1.06, e); break
    case 'dollyIn': out.dist *= lerp(1.12, 1.12 - 0.32 * amt, e); break
    case 'dollyOut': out.dist *= lerp(0.92, 0.92 + 0.35 * amt, e); break
    case 'dollyZoom': {
      // dir > 0: push in while zooming out (the hall falls away behind her);
      // dir < 0: pull out while zooming in (it closes in). dist·tan(fov/2) is
      // held, so her size in frame doesn't change
      const f = Math.exp(dir * 0.3 * amt * (0.5 - e) * 2)
      out.dist = s.dist * f
      out.fov = clamp(2 * Math.atan(Math.tan(s.fov * D2R / 2) / f) / D2R, 8, 75)
      break
    }
    case 'crane': out.el += dir * 9 * amt * (e - 0.5); out.az += dir * 4 * amt * (e - 0.5); break
  }
  if (s.minDist && out.dist < s.minDist) {
    if (move === 'dollyZoom') out.fov = 2 * Math.atan(Math.tan(s.fov * D2R / 2) * s.dist / s.minDist) / D2R
    out.dist = s.minDist
  }
  return out
}

// ── Takes on a fixed view (sequence) ──
// The director's cut works from the chosen view's angle but changes the
// framing take by take, weaving far and close: the whole scene, the piano,
// her fingers, her face (or, from behind, her figure) and the view's own
// framing. The size alternates (a wide take is never followed by another wide
// one), every subject gets its turn, and a change of size is a cut while
// takes of the same size glide into each other. Moves: mostly a slow orbit,
// sometimes a zoom in or out, a crane rarely (and only on medium or wide).
// Random keeps the view's framing and draws any move.
const CUT_MOVES = [['orbit', 0.5], ['zoom', 0.37], ['dollyIn', 0.06], ['crane', 0.07]]
const ANY_MOVES = Object.keys({ orbit: 1, zoomIn: 1, zoomOut: 1, dollyIn: 1, dollyOut: 1, dollyZoom: 1, crane: 1, still: 1 })
// framings: base weight (balance), label
const FRAMES = { home: [1.3, 'the view'], scene: [0.8, 'the scene'], piano: [0.9, 'the piano'], fingers: [1.1, 'fingers'], face: [1.1, 'face'], figure: [0.8, 'her figure'] }
export const FRAME_LABELS = Object.fromEntries(Object.entries(FRAMES).map(([k, [, l]]) => [k, l]))
// size class from the half-height of the frame at the subject (cm)
const sizeOf = (dist, fov) => { const h = dist * Math.tan(fov * D2R / 2); return h < 45 ? 0 : h < 110 ? 1 : 2 }
function frameBase(f, s) {
  // the framing's distance / fov / elevation from the view's angle
  switch (f) {
    case 'scene': return { az: s.az, el: clamp(s.el, 6, 70), dist: Math.max(600, s.dist * 1.5), fov: 28 }
    case 'piano': return { az: s.az, el: clamp(s.el, 8, 70), dist: 300, fov: 30 }
    // from behind her own shoulders hide the hands: beside her, from above
    case 'fingers': { const az = wrap(s.az), sg = az > 0 ? 1 : -1; return { az: Math.abs(az) < 60 ? sg * 60 : az, el: clamp(s.el, 38, 52), dist: 85, fov: 34 } }
    case 'face': return { az: s.az, el: clamp(s.el, -4, 20), dist: 80, fov: 30 }
    case 'figure': return { az: s.az, el: clamp(s.el, 8, 40), dist: 175, fov: 32 }
    default: return { az: s.az, el: s.el, dist: s.dist, fov: s.fov }
  }
}
// which framings work from this angle: her face only from the front half and
// not from high up; her fingers only from behind or beside her (from the
// front the music desk is in the way); her figure when her face can't be seen
function framesFor(s, pov) {
  if (pov) return ['home']
  const faceOk = Math.abs(wrap(s.az - 180)) < 115 && s.el < 45
  const fs = ['home', 'scene', 'piano']
  if (Math.abs(wrap(s.az)) <= 105) fs.push('fingers')
  fs.push(faceOk ? 'face' : 'figure')
  return fs
}
function addTake(q, mode, s, view) {
  const i = q.takes.length, prev = q.takes[i - 1], t0 = prev ? prev.t1 : 0
  const r = n => mode === 'random' ? Math.random() : hash(q.seed + i, n)
  let frame = 'home'
  if (mode === 'cut' && i > 0) {
    const fs = framesFor(s, view.pov)
    const size = f => { const b = frameBase(f, s); return sizeOf(b.dist, b.fov) }
    q.uses ??= {}
    let cand = fs.filter(f => f !== prev.frame && size(f) !== prev.size)
    if (!cand.length) cand = fs.filter(f => f !== prev.frame)
    if (!cand.length) cand = fs
    const w = cand.map(f => FRAMES[f][0] / (1 + (q.uses[f] || 0))
      * (Math.abs(size(f) - prev.size) === 2 ? 1.5 : 1)          // far ↔ close
      * (q.takes[i - 2]?.frame === f ? 0.4 : 1))
    let x = r(7) * w.reduce((a, b) => a + b, 0), j = 0
    while (j < cand.length - 1 && (x -= w[j]) > 0) j++
    frame = cand[j]
  }
  const base = frameBase(frame, s), size = sizeOf(base.dist, base.fov)
  if (mode === 'cut') { q.uses ??= {}; q.uses[frame] = (q.uses[frame] || 0) + 1 }
  let move, tries = 0
  if (mode === 'random') { do move = ANY_MOVES[Math.floor(r(1) * ANY_MOVES.length)]; while (prev && move === prev.move && move !== 'orbit') }
  else {
    do {
      // a fresh draw on every retry (the hash alone would repeat the same pick)
      let x = hash(q.seed + i, 1 + 10 * tries++) * CUT_MOVES.reduce((a, [, w]) => a + w, 0), j = 0
      while (j < CUT_MOVES.length - 1 && (x -= CUT_MOVES[j][1]) > 0) j++
      move = CUT_MOVES[j][0]
      if (move === 'zoom') move = hash(q.seed + i, 5 + 10 * tries) < 0.5 ? 'zoomIn' : 'zoomOut'
      if (view.pov && (move === 'crane' || move === 'dollyIn')) move = 'orbit'
      if (tries > 20) break
    // never two cranes or two zooms in a row, no crane close up, no more than
    // three orbits running; the first take is an orbit
    } while ((move === 'crane' && size === 0) || (prev && (move !== 'orbit' ? move === prev.move || (move.startsWith('zoom') && prev.move.startsWith('zoom')) : q.takes.slice(-3).filter(t => t.move === 'orbit').length === 3)))
    if (!i) move = 'orbit'
  }
  const len = mode === 'random' ? 7 + 9 * r(2)
    : (size === 0 ? 7 + 4 * r(2) : size === 1 ? 9 + 5 * r(2) : 10 + 5 * r(2)) + (move === 'orbit' ? 3 : 0)
  // orbits keep turning the same way for a while, then swing back
  const dir = move === 'orbit' && prev?.move === 'orbit' && r(3) < 0.7 ? prev.dir : r(3) < 0.5 ? -1 : 1
  q.takes.push({
    i, t0, t1: t0 + len, move, dir, frame, size,
    amt: view.pov ? 0.4 : mode === 'random' ? 0.6 + 0.6 * r(4) : 0.8 + 0.3 * r(4),
    // a change of size is a cut; the same size glides
    blend: !!prev && prev.size === size,
    onHer: mode === 'cut' && frame === 'home' && move.startsWith('zoom'),
  })
}
// a take's camera at u (0..1): its framing plus its move, centred on the move's middle
const _P = {}, _P0 = {}
function takeAt(s, tk, u, out) {
  const b = frameBase(tk.frame, s); b.orbitMax = s.orbitMax
  applyMove(b, tk.move, u, tk.amt, tk.dir, _P); applyMove(b, tk.move, 0.5, tk.amt, tk.dir, _P0)
  out.az = b.az + _P.az - _P0.az; out.el = b.el + _P.el - _P0.el
  out.dist = b.dist * _P.dist / _P0.dist; out.fov = b.fov * _P.fov / _P0.fov
  return out
}

/**
 * opts.pace: 0.5 (long takes) .. 2 (lively); opts.bias: -1 (hands) .. 1 (pianist);
 * opts.trans: 'mix' | 'cuts' | 'glides'
 */
export function planShots({ duration, phrases = [], glances = [], energyAt = () => 0.3 }, opts = {}) {
  const pace = opts.pace ?? 1, bias = opts.bias ?? 0, trans = opts.trans ?? 'mix'
  const starts = phrases.map(p => p[0]).filter(t => t > 0.5)
  const mean = (a, b) => { let s = 0, n = 0; for (let t = a; t < b; t += 0.25) { s += energyAt(t); n++ } return n ? s / n : 0 }
  const lookUp = (a, b) => glances.some(g => g.a < b - 1 && g.b > a + 0.5 && !g.quiet)
  const names = Object.keys(SPOTS)
  const shots = []
  let t = 0
  for (let i = 0; t < duration; i++) {
    const E = mean(t, t + 6)
    const h = hash(i, 1)
    let L = lerp(13, 4.5, clamp(E, 0, 1)) * (0.8 + 0.45 * h) / pace
    // cut on a phrase start near the planned length
    let end = t + L
    const cand = starts.filter(s => s > t + 0.6 * L && s < t + 1.6 * L)
    if (cand.length) end = cand.reduce((b, s) => Math.abs(s - t - L) < Math.abs(b - t - L) ? s : b)
    end = Math.min(end, t + 16 / pace)
    const last = duration - end < Math.max(4, 0.5 * L)
    if (last) end = duration + 6
    const prev = shots[i - 1], prev2 = shots[i - 2]
    let name, move
    if (i === 0) { name = hash(7, 2) < 0.6 ? 'establish' : 'audience'; move = 'dollyIn' }
    else {
      // score every spot for this stretch of music
      const up = lookUp(t, end)
      const w = names.map(n => {
        const s = SPOTS[n], kind = SUBJ_KIND[s.subj]
        let x = kind === 'hands' ? 0.35 + 0.7 * E - 0.3 * bias : kind === 'pianist' ? 0.5 - 0.25 * E + 0.3 * bias : 0.18
        if (n === 'feet') x *= 0.25
        if (n === 'establish') x = 0   // only to open and close
        // she looks up from the keys: be on her face
        if (up) x *= s.subj === 'head' ? 4 : 0.12
        // the last shot pulls out wide
        if (last) x = s.size === 2 || n === 'audience' || n === 'tail' ? 1 : 0
        if (prev) {
          const ps = SPOTS[prev.name]
          if (n === prev.name) return 0
          if (prev2 && n === prev2.name) x *= 0.3
          if (prev2 && SUBJ_KIND[ps.subj] === kind && SUBJ_KIND[SPOTS[prev2.name].subj] === kind) x *= 0.35
          if (s.size !== ps.size) x *= 1.4
          // no jump cuts: too little change of angle and size
          const dAz = Math.abs(wrap(s.az - ps.az)), dSize = Math.abs(Math.log(s.dist / ps.dist))
          if (dAz < 30 && dSize < 0.4) x *= 0.15
        }
        return Math.max(0, x)
      })
      let r = hash(i, 3) * w.reduce((a, b) => a + b, 0), k = 0
      while (k < w.length - 1 && (r -= w[k]) > 0) k++
      name = names[k]
      // a move: mostly continuous ones, a still frame now and then
      const ms = SPOTS[name].moves
      const mw = ms.map(m => m === 'still' ? 0.25 : m === 'dollyZoom' ? 0.45 : 1)
      let q = hash(i, 4) * mw.reduce((a, b) => a + b, 0), j = 0
      while (j < ms.length - 1 && (q -= mw[j]) > 0) j++
      move = last ? 'dollyOut' : ms[j]
    }
    // into this shot: a cut, or a glide when the two spots are on the same side
    let glide = 0
    if (prev) {
      const dAz = Math.abs(wrap(SPOTS[name].az - SPOTS[prev.name].az)), dD = Math.abs(Math.log(SPOTS[name].dist / SPOTS[prev.name].dist))
      // glide only between spots on the same side and of not too different size;
      // a flat spot is reached (or left) by turning, so it glides further and more often
      const flat = SPOTS[name].flat || SPOTS[prev.name].flat
      const canGlide = dAz <= (flat ? 100 : 80) && dD < (flat ? 1.4 : 1.1) && trans !== 'cuts'
      const wantGlide = trans === 'glides' || hash(i, 5) < (E < 0.55 ? 0.75 : 0.4) + (flat ? 0.2 : 0)
      if (canGlide && wantGlide) glide = clamp((lerp(3.5, 1.8, E) + 0.012 * dAz + 1.2 * dD) / Math.sqrt(pace), 1.4, Math.min(5, 0.5 * (end - t)))
    }
    shots.push({
      i, name, move, t0: t, t1: end, glide,
      amt: clamp((end - t) / 10, 0.45, 1.3) * (0.7 + 0.5 * E),
      dir: hash(i, 6) < 0.5 ? -1 : 1,
    })
    t = end
  }
  return shots
}

/**
 * The live director. update() gives the camera for song time t:
 *   { pos, target, fov, focus: 'hands' | 'head', wide: bool, shot }
 * anchors: { hands, head } (Vector3, live); smoothed here like an operator.
 */
export function createDirector(opts = {}) {
  // follow: false = each shot frames her where she is when it starts and
  // holds that framing (her rocking and sway move within a still frame)
  const o = { pace: 1, bias: 0, trans: 'mix', follow: false, ...opts }
  let shots = planShots({ duration: 600 }, o), source = null, idleT = 0
  const anchor = { hands: new THREE.Vector3(0, 76, 0), head: new THREE.Vector3(0, 122, 32), figure: new THREE.Vector3(), piano: new THREE.Vector3(), feet: new THREE.Vector3(0, 12, 18) }
  let primed = false
  const seqs = {}   // take lists for sequence(): random / the director's cut
  const A = {}, B = {}, out = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 34, focus: 'head', wide: false, shot: null }
  const ta = new THREE.Vector3(), tb = new THREE.Vector3()

  function replan() {
    shots = source ? planShots(source, o) : planShots({ duration: 600 }, o)
  }
  function shotAt(t) {
    let lo = 0, hi = shots.length - 1
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (shots[m].t0 <= t) lo = m; else hi = m - 1 }
    return lo
  }
  function subjectPoint(s, target, sh) {
    const a = anchor[s.subj]
    // not following: every subject is where it was when the shot began
    if (!o.follow && sh?.lock) {
      const H = sh.lockHands ?? anchor.hands
      if (s.subj === 'head') return target.copy(sh.lock)
      if (s.subj === 'hands') return target.copy(H)
      if (s.subj === 'figure') return target.lerpVectors(H, sh.lock, 0.55).add(tb.set(0, -6, 4))
      if (s.subj === 'piano') return target.set(H.x * 0.3, 90, -70)
    }
    return target.copy(a)
  }
  let lockIdx = -1
  function shotParams(sh, t, P, target) {
    const s = SPOTS[sh.name]
    applyMove(s, sh.move, clamp((t - sh.t0) / (sh.t1 - sh.t0), 0, 1), sh.amt, sh.dir, P)
    subjectPoint(s, target, sh)
    return P
  }
  function place(P, target, pos) {
    const az = P.az * D2R, el = P.el * D2R
    return pos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(P.dist).add(target)
  }

  return {
    opts: o,
    get shots() { return shots },
    /** song: { duration, phrases, glances, energyAt } or null for the idle plan */
    setSong(song) { source = song; replan() },
    set(k, v) { o[k] = v; if (k !== 'follow') { replan(); lockIdx = -1 } },
    /** t: song time, or null to run on the director's own clock */
    update(t, dt, live) {
      // the operator follows the subjects with a little lag (~0.5 s)
      const k = primed ? 1 - Math.exp(-dt / 0.5) : 1
      anchor.hands.lerp(live.hands, k)
      anchor.head.lerp(live.head, primed ? 1 - Math.exp(-dt / 0.35) : 1)
      anchor.figure.lerpVectors(anchor.hands, anchor.head, 0.55).add(ta.set(0, -6, 4))
      anchor.piano.set(anchor.hands.x * 0.3, 90, -70)
      primed = true
      if (t == null) { idleT += dt; t = idleT % shots[shots.length - 1].t1 }
      const idx = shotAt(t), sh = shots[idx]
      // a new shot locks onto where she is now (the shot gliding out keeps its own)
      if (idx !== lockIdx) {
        for (const x of shots) if (x !== sh && x !== shots[idx - 1]) x.lock = null
        sh.lock = anchor.head.clone(); sh.lockHands = anchor.hands.clone()
        if (idx > 0 && !shots[idx - 1].lock) { shots[idx - 1].lock = anchor.head.clone(); shots[idx - 1].lockHands = anchor.hands.clone() }
        lockIdx = idx
      }
      shotParams(sh, t, A, ta)
      const u = sh.glide ? clamp((t - sh.t0) / sh.glide, 0, 1) : 1
      if (u < 1 && idx > 0) {
        // glide from the previous shot (still running its own move) into this one
        shotParams(shots[idx - 1], t, B, tb)
        const e = sstep(u, 0, 1)
        A.az = B.az + wrap(A.az - B.az) * e
        A.el = lerp(B.el, A.el, e)
        // a little lift away from her in the middle of the move
        A.dist = Math.exp(lerp(Math.log(B.dist), Math.log(A.dist), e)) * (1 + 0.12 * Math.sin(Math.PI * e))
        A.fov = lerp(B.fov, A.fov, e)
        ta.lerpVectors(tb, ta, e)
      }
      out.target.copy(ta)
      place(A, ta, out.pos)
      // handheld breath, scaled to the framing
      const w = performance.now() / 1000, amp = 0.0035 * A.dist * (A.fov / 34)
      out.pos.x += amp * (Math.sin(w * 0.53) + 0.5 * Math.sin(w * 1.31 + 1))
      out.pos.y += amp * 0.7 * (Math.sin(w * 0.71 + 2) + 0.4 * Math.sin(w * 1.7))
      out.target.x += amp * 0.25 * Math.sin(w * 0.43 + 3)
      out.pos.y = Math.max(out.pos.y, 8)
      out.fov = A.fov
      const cur = u < 0.5 && idx > 0 ? shots[idx - 1] : sh
      const subj = SPOTS[cur.name].subj
      out.focus = subj === 'hands' || subj === 'feet' ? 'hands' : 'head'
      out.wide = SPOTS[cur.name].size === 2
      out.shot = cur
      return out
    },
    /** a fixed view with a looping move: pos/target arrays, move name, wall time */
    fixed(view, move, w, res = out) {
      ta.fromArray(view.target); tb.fromArray(view.pos).sub(ta)
      const dist = tb.length()
      const s = { az: Math.atan2(tb.x, tb.z) / D2R, el: Math.asin(tb.y / dist) / D2R, dist, fov: view.fov, minDist: view.minDist }
      // there and back over ~28 s
      const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * w / 28)
      applyMove(s, move, u, 1, 1, A)
      if (move === 'orbit') A.az = s.az + 14 * Math.sin(2 * Math.PI * w / 60)
      res.target.copy(ta); place(A, ta, res.pos); res.fov = A.fov
      return res
    },
    /**
     * A fixed view whose move changes take by take. mode 'random': any move,
     * any length; 'cut' (the director's cut): mostly a slow orbit, now and then
     * a zoom in or out on her face, a crane only sparingly. Each take's move is
     * centred on the view's own framing; the first 3 s of a take glide out of
     * where the last one ended. w: seconds on this view, live: { head }.
     */
    sequence(view, mode, w, live, res = out) {
      const q = seqs[mode] ??= { takes: [], seed: 0 }
      ta.fromArray(view.target); tb.fromArray(view.pos).sub(ta)
      const dist = tb.length()
      const s = { az: Math.atan2(tb.x, tb.z) / D2R, el: Math.asin(tb.y / dist) / D2R, dist, fov: view.fov, orbitMax: view.orbitMax }
      // a new view (or going back in time) starts the takes again
      const key = view.pov ? 'pov' : view.pos.join() + view.target.join()
      if (w < q.lastW || !q.takes.length || q.key !== key) { q.takes = []; q.uses = {}; q.key = key; q.seed = mode === 'random' ? Math.random() * 1000 : 17; q.hands = null }
      const dw = clamp(w - (q.lastW ?? w), 0, 0.1)
      q.lastW = w
      while (!q.takes.length || q.takes[q.takes.length - 1].t1 <= w) addTake(q, mode, s, view)
      // the operator follows the hands with a little lag
      if (live?.hands) { if (!q.hands) q.hands = live.hands.clone(); else q.hands.lerp(live.hands, 1 - Math.exp(-dw / 0.6)) }
      // she can be seen from the front half: zooms there frame her face
      const facing = Math.abs(wrap(s.az)) > 75
      let k = 0
      while (q.takes[k].t1 <= w) k++
      const tk = q.takes[k]
      // (each take locks onto her head where it starts, unless following)
      if (live?.head && !tk.lock) tk.lock = live.head.clone()
      if (!tk.lockHands && q.hands) tk.lockHands = q.hands.clone()
      const headAt = () => o.follow || !tk.lock ? live?.head ?? tk.lock : tk.lock
      const targetOf = (t, out) => {
        // not following: the hands are where they were when the take began
        const hands = (o.follow ? q.hands : t.lockHands ?? q.hands) ?? ta
        switch (t.frame) {
          case 'scene': return out.set(0, 80, -55)
          case 'piano': return out.set(0.4 * hands.x, 86, -45)
          case 'fingers': return out.copy(hands)
          case 'face': return out.copy(t.lock ?? headAt())
          case 'figure': return out.copy(t.lock ?? headAt()).lerp(hands, 0.45)
          default: {
            out.fromArray(view.target)
            const h = t.onHer && facing ? sstep((w - t.t0) / (t.t1 - t.t0), 0, 0.35) : 0
            if (h > 0 && live?.head) out.lerp(o.follow ? live.head : t.lock ?? live.head, h)
            return out
          }
        }
      }
      takeAt(s, tk, (w - tk.t0) / (tk.t1 - tk.t0), A)
      targetOf(tk, res.target)
      const g = k > 0 && tk.blend ? sstep(w - tk.t0, 0, 3) : 1
      if (g < 1) {
        const pk = q.takes[k - 1]
        takeAt(s, pk, 1, B)
        A.az = B.az + wrap(A.az - B.az) * g; A.el = lerp(B.el, A.el, g)
        A.dist = Math.exp(lerp(Math.log(B.dist), Math.log(A.dist), g)); A.fov = lerp(B.fov, A.fov, g)
        res.target.lerpVectors(targetOf(pk, tb), res.target, g)
      }
      A.el = clamp(A.el, -10, 86); A.fov = clamp(A.fov, 8, 75)
      place(A, res.target, res.pos); res.fov = A.fov
      res.shot = tk; res.move = tk.move; res.frame = tk.frame
      res.focus = tk.frame === 'fingers' || tk.frame === 'piano' ? 'hands' : tk.frame === 'home' ? null : 'head'
      res.wide = tk.size === 2
      return res
    },
  }
}
