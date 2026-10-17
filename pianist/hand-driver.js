// Fingertip → joint driver for the Experiment #032 pianist.
//
// This is the hand and arm solver of concertstage/avatar-hands.js (#030),
// lifted out of its mesh: the #029 motion model gives fingertip targets, the
// hand is fitted to them (position and yaw), each finger is solved with the
// coupled-joint IK of fingering/hands3d.js and the arm with a two-bone IK.
// What changes is the hand: its knuckles, finger lengths, wrist and arm come
// from the MakeHuman skeleton (measureHand() in rig.js), so the joints this
// solves are exactly where the character's bones go.
//
// Units: centimetres in the piano's frame (key tops at y = 73, key fronts at
// z = 0, the pianist at +z).

import * as THREE from 'three'
import { solveFinger } from '../fingering/hands3d.js'
import { buildMotion, KEY, restOffset } from '../fingering/motion.js'
import { planStrokes, velocityRange } from './stroke.js'
import { keyX, isBlack, LOW, HIGH } from '../fingering/keyboard.js'

const KEY_TOP = 73
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
// The top of the keyboard under (x, z), above the white key tops: a black
// key's top where one is (with a fingertip's width of margin), else 0.
// Black keys run from the back to 5.5 cm behind the white key fronts.
const BLACK_XS = []
for (let m = LOW; m <= HIGH; m++) if (isBlack(m)) BLACK_XS.push(keyX(m))
function keySurface(x, z) {
  if (z > -5.1 || z < -16) return 0
  let lo = 0, hi = BLACK_XS.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (BLACK_XS[m] < x) lo = m; else hi = m }
  return Math.min(Math.abs(x - BLACK_XS[lo]), Math.abs(x - BLACK_XS[hi])) < 0.65 + 0.45 ? KEY.BLACK_Y : 0
}
const _f = v3(), _s = v3(), _u = v3(), _m = new THREE.Matrix4(), _a = v3(), _b = v3(), _c = v3()

function chainReach(L, k, p) {
  return Math.hypot(L[0] + L[1] * Math.cos(p) + L[2] * Math.cos((1 + k) * p), L[1] * Math.sin(p) + L[2] * Math.sin((1 + k) * p))
}

/** Orthonormal frame: forward f, up as close to hint as possible, side = f × up. */
function frame(forward, upHint, outSide, outUp) {
  outSide.crossVectors(forward, upHint)
  if (outSide.lengthSq() < 1e-8) outSide.set(1, 0, 0)
  outSide.normalize()
  outUp.crossVectors(outSide, forward).normalize()
}

// ── Joint sets ─────────────────────────────────────────────────────────────
// J = { S, E, W, M, R (palm sideways, toward +x), fingers: {f: [p0..p3]} }
function makeJoints() {
  const J = { S: v3(), E: v3(), W: v3(), M: v3(), R: v3(), U: v3(), fingers: {} }
  for (const f of [1, 2, 3, 4, 5]) J.fingers[f] = [v3(), v3(), v3(), v3()]
  return J
}
// palm "forward point": between index and little knuckles, pulled to the middle one
function palmPoint(J, out) {
  const k2 = J.fingers[2][0], k5 = J.fingers[5][0], k3 = J.fingers[3][0]
  return out.addVectors(k2, k5).multiplyScalar(0.5).lerp(k3, 0.3)
}

/**
 * One hand. dims = { FINGERS, KNUCKLE_Y, KNUCKLE_Z, WRIST, UPPER, FORE, REACH }:
 * FINGERS[f] = { len[3], rad[3], base[3] (from the middle knuckle: toward the
 * little finger, up, toward the wrist), dir[3], k, tilt? }.
 */
export function createHandDriver(side, dims) {
  const { FINGERS, KNUCKLE_Y, KNUCKLE_Z, WRIST, UPPER, FORE, REACH } = dims
  const s = side === 'R' ? 1 : -1
  const J = makeJoints()
  const shoulder = v3(), tip = v3(), base = v3()
  const SHOULDER = new THREE.Vector3(s * 20, 107, 45)
  let visible = false, pitch = 0, pitchGoal = 0
  // the wrist stroke (pianist/stroke.js): knuckle lift and wrist tilt over
  // the song; ptot = the crossing pitch plus the stroke's tilt
  let stroke = null, lift = 0, ptot = 0
  const thumbCurl = { side: new THREE.Vector3(s, 0, 0), tilt: FINGERS[1].tilt }
  // Where each fingertip sits in a relaxed hand, relative to the middle
  // knuckle (x across, z forward is negative): the same rest places the
  // motion model uses, so a hand with nothing to do fits itself exactly.
  const REST = [1, 2, 3, 4, 5].map(f => [restOffset(side, f), KEY.WHITE_Z[f] - KNUCKLE_Z])
  // Sideways limits (radians) around each finger's neutral direction: tight
  // for a finger that is not playing, looser while it holds a key; the thumb
  // swings much further (it passes under the hand).
  // free-finger box around its rest tip, in the hand frame: [toward the thumb, toward the little finger, ± forward/back] (cm)
  const FREE_BOX = [null, [-1.2, 5.5, 2.2], [-1, 1, 2], [-0.8, 0.8, 2], [-0.8, 0.8, 2], [-1, 1.2, 2]]
  const SPLAY = { free: [0, 0.4, 0.13, 0.1, 0.12, 0.16], held: [0, 0.95, 0.34, 0.28, 0.3, 0.4], max: [0, 1.2, 0.6, 0.5, 0.55, 0.75] }
  const NEUTRAL = [1, 2, 3, 4, 5].map(f => { const d = FINGERS[f].dir, l = Math.hypot(d[0], d[2]); return [s * d[0] / l, d[2] / l] })
  // smoothed hand placement: middle knuckle (x, z), yaw, plus a reach slide
  const hand = { x: s * 12, z: KNUCKLE_Z, yaw: 0, init: false }
  const slide = v3(), slideGoal = v3()
  const diag = { splay: [0, 0, 0, 0, 0], err: [0, 0, 0, 0, 0], press: [0, 0, 0, 0, 0] }
  // rotate a hand-frame (x, z) offset by the yaw; θ > 0 turns the fingers toward +x
  const rot = (x, z, th) => { const c = Math.cos(th), n = Math.sin(th); return [x * c - z * n, x * n + z * c] }

  function armIK(W, out) {
    // two bones from the shoulder to the wrist; lean in when it cannot reach
    shoulder.copy(SHOULDER)
    const d = _a.subVectors(W, shoulder)
    let L = d.length()
    const maxL = UPPER + FORE - 0.3
    if (L > maxL) { shoulder.addScaledVector(d.normalize(), L - maxL); L = maxL; d.subVectors(W, shoulder) }
    const n = d.normalize()
    const cosA = THREE.MathUtils.clamp((UPPER * UPPER + L * L - FORE * FORE) / (2 * UPPER * L), -1, 1)
    const sinA = Math.sqrt(1 - cosA * cosA)
    const pole = _b.set(s * 0.6, -0.75, 0.3)
    pole.addScaledVector(n, -pole.dot(n)).normalize()
    J.S.copy(shoulder)
    out.copy(shoulder).addScaledVector(n, UPPER * cosA).addScaledVector(pole, UPPER * sinA)
  }

  // Fit the hand to the fingertip targets: the rigid motion (x, z, yaw) that
  // best carries the relaxed fingertips onto the targets, weighted toward
  // the fingers that are pressing (closed-form 2D Procrustes).
  function fitHand(tips, anchor) {
    let W = 0, px = 0, pz = 0, qx = 0, qz = 0
    // pressing fingers count most; a free finger counts where it rests
    // around the motion model's hand anchor, not where it may be flying to
    const w = [], Q = []
    for (let i = 0; i < 5; i++) {
      const t = tips[i], held = t.press > 0.2
      w.push(held ? 0.25 + 1.2 * t.press : 0.12)
      Q.push(held ? [t.x, t.z] : [anchor.x + REST[i][0], KNUCKLE_Z + REST[i][1] - 2.5 * anchor.black + 2 * anchor.idle])
    }
    for (let i = 0; i < 5; i++) { W += w[i]; px += w[i] * REST[i][0]; pz += w[i] * REST[i][1]; qx += w[i] * Q[i][0]; qz += w[i] * Q[i][1] }
    px /= W; pz /= W; qx /= W; qz /= W
    let sc = 0, ss = 0
    for (let i = 0; i < 5; i++) {
      const ax = REST[i][0] - px, az = REST[i][1] - pz, bx = Q[i][0] - qx, bz = Q[i][1] - qz
      sc += w[i] * (ax * bx + az * bz); ss += w[i] * (ax * bz - az * bx)
    }
    let yaw = THREE.MathUtils.clamp(Math.atan2(ss, sc), -0.32, 0.32)
    // the forearm's line pulls the hand round a little (playing far out, the
    // fingers turn with the arm)
    const armYaw = Math.atan2(qx - SHOULDER.x, -(qz - SHOULDER.z))
    yaw = THREE.MathUtils.clamp(0.75 * yaw + 0.3 * armYaw, -0.4, 0.4)
    const [rx, rz] = rot(px, pz, yaw)
    return { x: qx - rx, z: THREE.MathUtils.clamp(qz - rz, -3.5, 7), yaw, y: KEY_TOP + KNUCKLE_Y + 1.2 * anchor.idle }
  }

  function basePos(f, out) {
    const d = FINGERS[f]
    // pitched about the knuckle line with the hand (setPitch)
    const cp = Math.cos(ptot), sp = Math.sin(ptot)
    const by = d.base[1] * cp + d.base[2] * sp, bzp = -d.base[1] * sp + d.base[2] * cp
    const [bx, bz] = rot(s * d.base[0], bzp, hand.yaw)
    return out.set(hand.x + bx, hand.y + by, hand.z + bz).add(slide)
  }

  // What the fit cannot cover, a slide does (and it relaxes back to zero):
  // a held key out of reach, or so far sideways the finger would splay.
  function computeSlideGoal(tips) {
    slideGoal.set(0, 0, 0)
    let worst = 0
    const saved = slide.clone(); slide.set(0, 0, 0)
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f], t = tips[f - 1]
      if (!(t.press > 0.2 || t.y < 0.6)) continue
      basePos(f, base)
      tip.set(t.x, KEY_TOP + t.y + d.rad[2] * 0.9, t.z)
      _a.subVectors(tip, base)
      const e = _a.length() - chainReach(d.len, d.k, 0.5)
      if (e > worst) { worst = e; slideGoal.copy(_a).setLength(e) }
      const [nx, nz] = rot(NEUTRAL[f - 1][0], NEUTRAL[f - 1][1], hand.yaw)
      const ang = Math.atan2(nx * _a.z - nz * _a.x, nx * _a.x + nz * _a.z), over = Math.abs(ang) - SPLAY.held[f]
      if (over > 0) {
        const h = Math.hypot(_a.x, _a.z), e2 = h * Math.sin(over)
        if (e2 > worst) { worst = e2; slideGoal.set(_a.x, 0, _a.z).setLength(e2) }
      }
    }
    slideGoal.y = THREE.MathUtils.clamp(slideGoal.y, -2, 1.5)
    // ...but never forward over the keys: that only hooks every finger
    slideGoal.z = THREE.MathUtils.clamp(slideGoal.z, -4.5, 2)
    slide.copy(saved)
    return slideGoal
  }

  // The hand's placement and slide, baked over the whole song ahead of time.
  // Smoothed as they play (a low-pass each frame) they make the hand trail
  // the notes on runs and leaps; baked, they are smoothed forward and
  // backward, which settles the hand just as well with no lag.
  // (Same as concertstage/avatar-hands.js.)
  let track = null
  const COLS = 6   // x, z, yaw, slide x, y, z
  const trackOut = new Float32Array(COLS)
  function trackAt(t) {
    if (!track || t == null) return null
    const u = (t - track.t0) / track.h, i = Math.floor(u)
    if (i < 0 || i >= track.n - 1) return null
    const a = i * COLS, b = a + COLS, w = u - i, X = track.X
    if (Number.isNaN(X[a]) || Number.isNaN(X[b])) return null
    for (let c = 0; c < COLS; c++) trackOut[c] = X[a + c] + (X[b + c] - X[a + c]) * w
    return trackOut
  }
  // forward-backward one-pole over columns [c0, c1) (zero phase); NaN = no pose
  function zeroPhase(X, n, c0, c1, k) {
    for (let c = c0; c < c1; c++) {
      for (const [from, to, step] of [[0, n, 1], [n - 1, -1, -1]]) {
        let y = NaN
        for (let i = from; i !== to; i += step) {
          const x = X[i * COLS + c]
          if (Number.isNaN(x)) { y = NaN; continue }
          y = Number.isNaN(y) ? x : y + (x - y) * k
          X[i * COLS + c] = y
        }
      }
    }
  }
  /** poseAt(t) → this hand's pose; samples [t0, t0 + (n-1)·h]. */
  function bakeTrack(poseAt, t0, n, h) {
    const X = new Float32Array(n * COLS).fill(NaN)
    const keep = { ...hand }, keepSlide = slide.clone()
    for (let i = 0; i < n; i++) {
      const pose = poseAt(t0 + i * h); if (!pose) continue
      const f = fitHand(pose.fingers, pose.anchor)
      X[i * COLS] = f.x; X[i * COLS + 1] = f.z; X[i * COLS + 2] = f.yaw
    }
    zeroPhase(X, n, 0, 3, 1 - Math.exp(-14 * h))
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(X[i * COLS])) continue
      const pose = poseAt(t0 + i * h)
      hand.x = X[i * COLS]; hand.z = X[i * COLS + 1]; hand.yaw = X[i * COLS + 2]
      hand.y = KEY_TOP + KNUCKLE_Y + 1.2 * pose.anchor.idle
      const g = computeSlideGoal(pose.fingers)
      X[i * COLS + 3] = g.x; X[i * COLS + 4] = g.y; X[i * COLS + 5] = g.z
    }
    zeroPhase(X, n, 3, 6, 1 - Math.exp(-18 * h))
    Object.assign(hand, keep); slide.copy(keepSlide)
    track = { t0, h, n, X }
  }
  function clearTrack() { track = null }
  // where the wrist will be at song time t, from the baked placement (no
  // finger IK: the middle knuckle at the hand's current height); null when
  // nothing is baked there. Lets the body lean in before a leap arrives.
  function wristAt(t, out) {
    const tr = trackAt(t); if (!tr) return null
    const d = FINGERS[3], [bx, bz] = rot(s * d.base[0], d.base[2], tr[2]), [wx, wz] = rot(s * WRIST[0], WRIST[2], tr[2])
    const up = stroke ? stroke.at(t)[0] : 0
    return out.set(tr[0] + bx + tr[3] + wx, hand.y - lift + up + d.base[1] + tr[4] + WRIST[1], tr[1] + bz + tr[5] + wz)
  }

  function update(pose, dt, t) {
    if (!pose) { visible = false; pitch = 0; lift = 0; ptot = 0; return }
    pitch += (pitchGoal - pitch) * Math.min(1, dt / 0.12)
    visible = true
    const { anchor, fingers: tips } = pose
    const fit = fitHand(tips, anchor)
    const tr = trackAt(t)
    if (tr) {
      // the stroke: carried above the keys between notes, the wrist tilting
      const st = stroke ? stroke.at(t) : null
      lift = st ? st[0] : 0
      ptot = THREE.MathUtils.clamp(pitch + (st ? st[1] : 0), -0.5, 1.1)
      hand.x = tr[0]; hand.z = tr[1]; hand.yaw = tr[2]; hand.y = fit.y + lift; hand.init = true
      slide.set(tr[3], tr[4], tr[5])
    } else {
      // live (or outside the baked song): smooth as it plays
      lift = 0; ptot = pitch
      if (!hand.init) { Object.assign(hand, fit, { init: true }) }
      const k = Math.min(1, dt * 14)
      hand.x += (fit.x - hand.x) * k; hand.z += (fit.z - hand.z) * k
      hand.yaw += (fit.yaw - hand.yaw) * k; hand.y = fit.y
      slide.lerp(computeSlideGoal(tips), Math.min(1, dt * 18))
    }
    // fingertip targets in the hand frame (lx toward the little finger = s·x)
    const lx = [], lz = [], held = [], ty = []
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f], t = tips[f - 1]
      const [ax, az] = rot(t.x - hand.x - slide.x, t.z - hand.z - slide.z, -hand.yaw)
      let x = s * ax, z = az
      held.push(t.press > 0.2)
      if (!held[f - 1]) {
        // a free finger moves with the hand: keep it near its relaxed place
        // (the thumb may tuck under toward the fingers)
        const r = REST[f - 1], box = FREE_BOX[f]
        x = s * r[0] + THREE.MathUtils.clamp(x - s * r[0], box[0], box[1])
        z = r[1] + THREE.MathUtils.clamp(z - r[1], -box[2], box[2])
        // a relaxed finger reaches forward from its knuckle in a gentle curve;
        // a tip pulled in close under the knuckle makes it stand up hooked
        if (f > 1) z = Math.min(z, d.base[2] - REACH[f])
      }
      // (a free finger rides up with the hand when the stroke lifts it)
      let y = KEY_TOP + t.y + d.rad[2] * 0.9 + (held[f - 1] ? 0 : lift)
      // a lifted finger stays curled: its tip never rises to knuckle height
      if (!held[f - 1]) y = Math.min(y, hand.y + slide.y + d.base[1] - (f === 1 ? 2.6 : 4.3))
      lx.push(x); lz.push(z); ty.push(y)
    }
    // a free finger's sideways turn from its neutral direction is limited
    // (in the hand frame: knuckle at (base[0], base[2]), lx toward the little finger)
    const turn = (i, lim) => {
      const d = FINGERS[i + 1], l = Math.hypot(d.dir[0], d.dir[2]), nx = d.dir[0] / l, nz = d.dir[2] / l
      const vx = lx[i] - d.base[0], vz = lz[i] - d.base[2]
      const ang = Math.atan2(nx * vz - nz * vx, nx * vx + nz * vz)
      diag.splay[i] = Math.abs(ang)
      if (Math.abs(ang) <= lim) return
      const [cx, cz] = rot(vx, vz, -(ang - Math.sign(ang) * lim))
      lx[i] = d.base[0] + cx; lz[i] = d.base[2] + cz
    }
    for (let i = 0; i < 5; i++) if (!held[i]) turn(i, SPLAY.free[i + 1])
    // a pressed finger may turn further, but not past what a hand can do:
    // when a held key is out of the hand's reach (a long note held while the
    // hand moves on) the limit wins and the finger falls short of the key
    // instead of pointing sideways along the keyboard
    // It falls short sideways, at its key's own depth: swung about the
    // knuckle it would also reach further in, under the black keys
    const offKey = [false, false, false, false, false]
    for (let i = 0; i < 5; i++) if (held[i]) {
      const x0 = lx[i], z0 = lz[i]
      turn(i, SPLAY.max[i + 1])
      if (lx[i] === x0 && lz[i] === z0) continue
      const d = FINGERS[i + 1], bx = d.base[0], bz = d.base[2], vx = lx[i] - bx, vz = lz[i] - bz, r = Math.hypot(vx, vz) || 1
      const ux = vx / r, uz = vz / r, k = (z0 - bz) / uz
      if (Math.abs(uz) > 0.3 && k > 0 && k < 1.6 * r) { lx[i] = bx + k * ux; lz[i] = z0 }
      // off its own key now? then it rests on whatever is under it
      const p = tips[i].pitch
      if (p != null) {
        const [wx, wz] = rot(s * lx[i], lz[i], hand.yaw)
        offKey[i] = Math.abs(hand.x + slide.x + wx - keyX(p)) > (isBlack(p) ? 0.65 : 1.17)
      }
    }
    // a free finger beside a pressed one keeps clear of it: it is swung
    // about its knuckle until its middle and tip lie a finger's width to its
    // own side of the pressed finger's line (a pressed finger reaching
    // sideways pushes its neighbours along, it never sweeps across them)
    const clearOf = (i, j) => {
      const bi = FINGERS[i + 1].base, bj = FINGERS[j + 1].base, side = Math.sign(i - j)
      let hx = lx[j] - bj[0], hz = lz[j] - bj[2]; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl
      const off = (x, z) => side * (hx * (z - bj[2]) - hz * (x - bj[0]))
      const r = Math.hypot(lx[i] - bi[0], lz[i] - bi[2]) || 1
      let ang = Math.atan2(lx[i] - bi[0], bi[2] - lz[i])
      for (let it = 0; it < 24; it++) {
        const sx = Math.sin(ang), cz = Math.cos(ang)
        const ok = off(bi[0] + r * sx, bi[2] - r * cz) >= GAP && off(bi[0] + 0.6 * r * sx, bi[2] - 0.6 * r * cz) >= GAP * 0.9
        if (ok) break
        ang += side * 0.05
      }
      lx[i] = bi[0] + r * Math.sin(ang); lz[i] = bi[2] - r * Math.cos(ang)
    }
    const GAP = 1.75
    // outward from the pressed fingers: each free finger clears the one
    // before it (pressed or already placed)
    for (let i = 2; i < 5; i++) if (!held[i]) clearOf(i, i - 1)
    for (let i = 3; i >= 1; i--) if (!held[i] && held[i + 1]) clearOf(i, i + 1)
    for (let i = 3; i >= 1; i--) if (!held[i] && !held[i + 1] && i < 3 && held[i + 2]) clearOf(i, i + 1)
    // fingers 2–5 keep their order across the hand and never overlap: a
    // pressed finger is a wall, the free fingers between two walls (or a wall
    // and the hand's edge) share the room; squeezed fingers ride higher and
    // tuck back, as a real hand does between a held 2 and 5
    const squeeze = [0, 0, 0, 0, 0]
    for (let i = 1; i < 5;) {
      if (held[i]) { i++; continue }
      let j = i; while (j + 1 < 5 && !held[j + 1]) j++
      const lo = i > 1 ? lx[i - 1] + GAP : -Infinity, hi = j < 4 ? lx[j + 1] - GAP : Infinity
      const n = j - i + 1
      // keep the run's own order with spacing, then fit it between the walls
      for (let m = i + 1; m <= j; m++) lx[m] = Math.max(lx[m], lx[m - 1] + GAP)
      if (lx[i] < lo) { const sh = lo - lx[i]; for (let m = i; m <= j; m++) lx[m] += sh; for (let m = i + 1; m <= j; m++) lx[m] = Math.max(lx[m], lx[m - 1] + GAP) }
      if (lx[j] > hi) { const sh = lx[j] - hi; for (let m = j; m >= i; m--) lx[m] -= sh; for (let m = j - 1; m >= i; m--) lx[m] = Math.min(lx[m], lx[m + 1] - GAP) }
      // (only between two walls: against one wall the shifts above always fit;
      // the tolerance keeps rounding from triggering it)
      if (isFinite(lo) && isFinite(hi) && (lx[i] < lo - 1e-6 || lx[j] > hi + 1e-6)) {
        // not enough room: spread evenly between the walls
        const span = hi - lo + 2 * GAP
        for (let m = i; m <= j; m++) {
          lx[m] = lo - GAP + span * (m - i + 1) / (n + 1)
          squeeze[m] = Math.min(1, ((n + 1) * GAP - span) / GAP)
        }
      }
      i = j + 1
    }
    for (let i = 1; i < 5; i++) if (squeeze[i] > 0) {
      ty[i] += 1.2 * squeeze[i]
      lz[i] = Math.max(lz[i], FINGERS[i + 1].base[2] - REACH[i + 1] + 1.5 * squeeze[i])
    }
    // joint IK per finger
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f], P = J.fingers[f], i = f - 1
      basePos(f, P[0])
      const [wx2, wz2] = rot(s * lx[i], lz[i], hand.yaw)
      tip.set(hand.x + slide.x + wx2, ty[i], hand.z + slide.z + wz2)
      diag.press[i] = tips[i].press
      // a free fingertip never sinks into the keys: it stays a little above
      // the key top under it (a black key's where there is one), even when
      // the hand is carried low (a held key out of reach slides it down)
      const floor = () => KEY_TOP + keySurface(tip.x, tip.z) + d.rad[2] * 0.9 + 0.15
      if (!held[i]) tip.y = Math.max(tip.y, floor())
      else if (offKey[i]) tip.y = floor() - 0.15
      diag.err[i] = solveFinger(P[0].clone(), tip, d.len, d.k, P, f === 1 ? thumbCurl : null)
      // knuckle limit: a finger may not bend back more than ~14° at the MCP.
      // A free finger's target is lowered until it doesn't, down to the keys;
      // there it reaches forward instead. A pressed finger stays on its key.
      if (f > 1 && !held[i]) for (let it = 0; it < 5; it++) {
        const ex = P[1].x - P[0].x, ey = P[1].y - P[0].y, ez = P[1].z - P[0].z
        const fwd = ex * Math.sin(hand.yaw) - ez * Math.cos(hand.yaw)
        if (Math.atan2(ey, fwd) <= 0.25) break
        if (tip.y - 0.8 >= floor()) tip.y -= 0.8
        else { tip.x += 0.7 * Math.sin(hand.yaw); tip.z -= 0.7 * Math.cos(hand.yaw); tip.y = Math.max(tip.y, floor()) }
        diag.err[i] = solveFinger(P[0].clone(), tip, d.len, d.k, P, null)
      }
      // where the fingertip really ended up: a pressed finger that cannot
      // reach its key (or a free one) never sinks into the key it lies over
      for (let it = 0; it < 4; it++) {
        const q = P[3], p = tips[i].pitch
        if (held[i] && p != null && Math.abs(q.x - keyX(p)) < (isBlack(p) ? 0.75 : 1.2) && (isBlack(p) || keySurface(q.x, q.z) === 0)) break
        const fl = KEY_TOP + keySurface(q.x, q.z) + d.rad[2] * 0.9
        if (q.y >= fl - 0.05) break
        tip.y += fl - q.y + 0.05
        diag.err[i] = solveFinger(P[0].clone(), tip, d.len, d.k, P, f === 1 ? thumbCurl : null)
      }
    }
    const k3 = J.fingers[3][0]
    // the wrist, from the middle knuckle; raised by pitching the hand about
    // its knuckles (a hand crossing over the other: the fingers drop onto
    // the keys from a high wrist), set by the rig through setPitch
    const cp = Math.cos(ptot), sp = Math.sin(ptot)
    const wy = WRIST[1] * cp + WRIST[2] * sp, wzp = -WRIST[1] * sp + WRIST[2] * cp
    const [wx, wz] = rot(s * WRIST[0], wzp, hand.yaw)
    J.W.set(k3.x + wx, k3.y + wy, k3.z + wz)
    palmPoint(J, J.M)
    J.R.subVectors(J.fingers[5][0], J.fingers[2][0]).multiplyScalar(s).normalize()
    // a slight roll toward whichever side of the hand is pressing
    const roll = 0.18 * ((tips[4].press + tips[3].press * 0.5) - (tips[0].press + tips[1].press * 0.5)) * s
    J.R.y -= roll
    J.R.normalize()
    armIK(J.W, J.E)
  }
  return { update, bakeTrack, clearTrack, wristAt, setPitch: p => { pitchGoal = p }, get pitch() { return pitch }, setStroke: p => { stroke = p }, get stroke() { return stroke }, get strokeLift() { return lift }, get strokeTilt() { return ptot - pitch }, side, diag, hand, joints: J, shoulder: SHOULDER, get visible() { return visible } }
}


// fingering/motion.js: a press runs from 12 ms before to 18 ms after the
// note; the hands run this far ahead so the fingertip bottoms out on it
const PRESS_LEAD = 0.018

/** Both hands, driven by a fingered song. */
export function createHandsDriver(dims) {
  const L = createHandDriver('L', dims), R = createHandDriver('R', dims)
  let motion = buildMotion([]), own = []
  // wrist strokes: { armWeight, flex, liftOff, height } (research/01_biomechanics.md §3.5)
  const strokeOpts = { armWeight: 1, flex: 1, liftOff: 1, height: 1 }
  const plan = () => { for (const d of [L, R]) d.setStroke(own.length ? planStrokes(own.filter(n => n.hand === d.side), { ...strokeOpts, velRange: velocityRange(own) }) : null) }
  return {
    L, R,
    strokeOpts,
    get notes() { return own },
    /** Change the stroke settings (re-plans the strokes only, a few ms). */
    setStrokeOpts(o) { Object.assign(strokeOpts, o); plan() },
    setNotes(notes) {
      own = notes.filter(n => n.finger >= 1)
      motion = buildMotion(own)
      plan()
      // bake the hands' placement over the song (60 Hz, interpolated)
      if (!own.length) { L.clearTrack(); R.clearTrack(); return }
      const h = 1 / 60
      let t0 = Infinity, t1 = -Infinity
      for (const m of own) { t0 = Math.min(t0, m.on - 2); t1 = Math.max(t1, m.off + 6) }   // (to the end of the final lift-off)
      const n = Math.ceil((t1 - t0) / h) + 1, poses = []
      for (let i = 0; i < n; i++) poses.push(motion.poseAt(t0 + i * h))
      L.bakeTrack(t => poses[Math.round((t - t0) / h)]?.L, t0, n, h)
      R.bakeTrack(t => poses[Math.round((t - t0) / h)]?.R, t0, n, h)
    },
    clear() { motion = buildMotion([]); own = []; plan(); L.clearTrack(); R.clearTrack() },
    lead: PRESS_LEAD,
    update(t, dt) { const tm = t + PRESS_LEAD, p = motion.poseAt(tm); L.update(p.L, dt, tm); R.update(p.R, dt, tm) },
  }
}
