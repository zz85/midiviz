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
import { keyX, isBlack, LOW, HIGH, WHITE_W } from '../fingering/keyboard.js'

const KEY_TOP = 73
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
// How far the hand may bend at the wrist from straight on the forearm
// (radians). A wrist moves ~30–35° toward the little finger (ulnar), ~20°
// toward the thumb (radial), ~70° back and ~80° down; at the piano far less:
// the hand turns with the arm rather than bending sideways, and the wrist
// stays near level. Past these the hand is turned or tilted with the forearm
// (keepWrist), whatever the fit would like.
export const WRIST_RANGE = { ulnar: 25 * Math.PI / 180, radial: 12 * Math.PI / 180, ext: 35 * Math.PI / 180, flex: 45 * Math.PI / 180 }
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
// where on white key p's narrow part, between the black keys beside it, a
// fingertip can rest clear of them (keySurface's margin): x if it already
// is, else the middle of that part
function narrowX(p, x) {
  let lo = keyX(p) - WHITE_W / 2 + 0.2, hi = keyX(p) + WHITE_W / 2 - 0.2
  if (isBlack(p - 1)) lo = Math.max(lo, keyX(p - 1) + 1.15)
  if (isBlack(p + 1)) hi = Math.min(hi, keyX(p + 1) - 1.15)
  return lo <= x && x <= hi ? x : (lo + hi) / 2
}
const _f = v3(), _s = v3(), _u = v3(), _m = new THREE.Matrix4(), _a = v3(), _b = v3(), _c = v3()

function chainReach(L, k, p) {
  return Math.hypot(L[0] + L[1] * Math.cos(p) + L[2] * Math.cos((1 + k) * p), L[1] * Math.sin(p) + L[2] * Math.sin((1 + k) * p))
}

/**
 * Where this hand's fingertips land on a white key (cm into the key, z < 0),
 * from its own measurements: each finger, gently curved (chainReach at
 * 0.5 rad a joint), reaching down from the knuckle line to the key top, lands
 * this far forward of it; the whole set is placed so the thumb plays just
 * inside the key's front edge (THUMB_Z). KEY.WHITE_Z's depths are for the
 * #029 / #030 hand: on a smaller one they put the thumb's key out of its
 * reach, and the slide that rescued it carried the whole hand forward, so
 * the index (and middle) finger pressing a key just under its knuckle hooked.
 * Returns { whiteZ: [, z1..z5], deepZ, knuckleZ } (knuckleZ: the middle knuckle's
 * place at rest, in front of the key fronts when > 0).
 */
const THUMB_Z = -0.8
export function handDepths(dims) {
  const { FINGERS, KNUCKLE_Y } = dims
  const nat = [0]
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f], dy = KNUCKLE_Y + d.base[1] - d.rad[2] * 0.9, r = chainReach(d.len, d.k, 0.5)
    nat.push(d.base[2] - Math.sqrt(Math.max(0, r * r - dy * dy)))
  }
  // (no deeper than the black keys start, -5.1 less a fingertip: a finger
  // on a white key there would land on the black key beside it)
  const whiteZ = nat.map((z, f) => (f ? Math.min(-0.6, Math.max(-4.6, THUMB_Z + z - nat[1])) : 0))
  // ...except on a key clear of the black keys (D, G, A: deepZ)
  const deepZ = nat.map((z, f) => (f ? Math.min(-0.6, Math.max(-9, THUMB_Z + z - nat[1])) : 0))
  return { whiteZ, deepZ, knuckleZ: THUMB_Z - nat[1] }
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
  const { FINGERS, KNUCKLE_Y, WRIST, UPPER, FORE, REACH } = dims
  // this hand's own strike depths and knuckle line (handDepths)
  const { whiteZ: WHITE_Z, knuckleZ: KNUCKLE_Z } = handDepths(dims)
  const s = side === 'R' ? 1 : -1
  const J = makeJoints()
  const shoulder = v3(), tip = v3(), base = v3()
  const SHOULDER = new THREE.Vector3(s * 20, 107, 45)
  let visible = false, pitch = 0, pitchGoal = 0
  // the end of the piece: as the hands lift off the last chord they come in
  // to the middle, square to the keys, a hand's width either side of her
  // (ending(t) → 0..1, from the hands driver; null: never)
  let ending = null
  const END_X = s * 14
  const endBlend = (tr, t) => {
    const u = ending ? ending(t) : 0
    if (u <= 0) return tr
    return [tr[0] + (END_X - tr[0]) * u, tr[1], tr[2] * (1 - u), tr[3] * (1 - u), tr[4] * (1 - u), tr[5] * (1 - u)]
  }
  // the wrist stroke (pianist/stroke.js): knuckle lift and wrist tilt over
  // the song; ptot = the crossing pitch plus the stroke's tilt
  let stroke = null, lift = 0, ptot = 0
  // forearm rotation (roll about the hand's long axis, through the middle
  // knuckle and the wrist): positive = the little-finger side down
  let hroll = 0
  // The hand's axes in the world for a yaw, pitch (ptot) and forearm roll:
  // toward the little finger, out of the back of the hand, toward the wrist
  // (the rig maps the rest hand frame onto these)
  const _hq = new THREE.Quaternion(), _hv = v3()
  function handAxes(yaw = hand.yaw, p = ptot, roll = hroll, out = { lat: v3(), up: v3(), back: v3() }) {
    const c = Math.cos(yaw), sn = Math.sin(yaw)
    out.lat.set(s * c, 0, s * sn); out.up.set(0, 1, 0); out.back.set(-sn, 0, c)
    if (p) { _hq.setFromAxisAngle(_hv.set(c, 0, sn), -p); out.up.applyQuaternion(_hq); out.back.applyQuaternion(_hq) }
    // (the rest frame's lateral axis points toward each hand's own little
    // finger, so the left hand's turn about the forward axis is mirrored)
    _hq.setFromAxisAngle(_hv.copy(out.back).negate(), s * roll)
    out.lat.applyQuaternion(_hq); out.up.applyQuaternion(_hq)
    return out
  }
  // The elbow (the rig's last frame: setElbow), null when unknown. The
  // hand's yaw and pitch are kept within WRIST_RANGE of straight on the
  // forearm, from there to the wrist: a wrist bent further turns or tilts
  // the hand with the arm.
  let elbow = null
  const FORE_DEV = dims.FORE_DEV ?? 0, FORE_ELEV = dims.FORE_ELEV ?? 0
  const wristBend = { ulnar: 0, ext: 0 }
  const _ax = { lat: v3(), up: v3(), back: v3() }
  // the wrist's bend for a yaw and pitch: ulnar (> 0 toward the little
  // finger, < 0 radial) and extension (> 0 the back of the hand up), radians
  function bendAt(yaw, p, out, fv, roll = hroll) {
    handAxes(yaw, p, roll, _ax)
    const f = -fv.dot(_ax.back)
    out.ulnar = FORE_DEV - Math.atan2(fv.dot(_ax.lat), f)
    out.ext = FORE_ELEV - Math.atan2(fv.dot(_ax.up), f)
    return out
  }
  // turn placement P ({ x, z, yaw }: the middle knuckle) by δ about pivot
  // (hand frame): where the fingertips are rather than the knuckle, so they
  // stay over their keys
  function turnAbout(P, pivot, d) {
    const [ax, az] = rot(pivot[0], pivot[1], P.yaw)
    P.yaw += d
    const [bx, bz] = rot(pivot[0], pivot[1], P.yaw)
    P.x += ax - bx; P.z += az - bz
  }
  // The same while baking, where the arm is not known yet: the forearm from
  // this driver's own arm IK (from the shoulder as last placed), on a level
  // hand with no roll. The fit then places the hand for the yaw it will
  // play with (and the slide reaches from there); keepWrist only corrects
  // what the rig's arm does differently.
  const _bw = v3(), _be = v3(), _bf = v3(), _bb = { ulnar: 0, ext: 0 }
  function bakeWrist(P) {
    const d = FINGERS[3]
    for (let it = 0; it < 4; it++) {
      const [bx, bz] = rot(s * d.base[0], d.base[2], P.yaw), [wx, wz] = rot(s * WRIST[0], WRIST[2], P.yaw)
      _bw.set(P.x + bx + wx, P.y + d.base[1] + WRIST[1], P.z + bz + wz)
      armIK(_bw, _be)
      bendAt(P.yaw, 0, _bb, _bf.subVectors(_bw, _be).normalize(), 0)
      const du = _bb.ulnar - THREE.MathUtils.clamp(_bb.ulnar, -WRIST_RANGE.radial, WRIST_RANGE.ulnar)
      if (Math.abs(du) < 1e-3) break
      turnAbout(P, [P.px, P.pz], -s * du)
    }
    return P
  }
  // the wrist, from the middle knuckle (basePos); raised by pitching the
  // hand about its knuckles (a hand crossing over the other: the fingers
  // drop onto the keys from a high wrist, setPitch; the stroke's tilt)
  const _k3 = v3()
  function wristOf(out) {
    basePos(3, _k3)
    const cp = Math.cos(ptot), sp = Math.sin(ptot)
    const wy = WRIST[1] * cp + WRIST[2] * sp, wzp = -WRIST[1] * sp + WRIST[2] * cp
    const [wx, wz] = rot(s * WRIST[0], wzp, hand.yaw)
    return out.set(_k3.x + wx, _k3.y + wy, _k3.z + wz)
  }
  const _kw = v3(), _kf = v3(), _ke = v3(), elbowOff = v3(), _kb = { ulnar: 0, ext: 0 }
  function keepWrist(pivot) {
    if (!elbow) { wristBend.ulnar = wristBend.ext = 0; return }
    const R = WRIST_RANGE, clamp = THREE.MathUtils.clamp
    const keep = [hand.x, hand.z, hand.yaw, ptot]
    // A few damped Newton steps, the forearm re-aimed from the elbow at
    // each: turning the hand by δ about the vertical changes its ulnar bend
    // by about s·δ (and a little more, as the wrist swings the other way and
    // takes the forearm with it); raising the wrist by δ lowers the
    // extension by about δ. The elbow: where the rig put it last frame...
    // ...moved with the wrist since as this driver's own arm IK has it
    // (the rig's elbow differs from that by elbowOff: steered round the
    // body, leading the hand). What that misses, the rig's redo catches.
    for (let it = 0; it < 8; it++) {
      wristOf(_kw); armIK(_kw, _ke).add(elbowOff)
      bendAt(hand.yaw, ptot, wristBend, _kf.subVectors(_kw, _ke).normalize())
      const du = wristBend.ulnar - clamp(wristBend.ulnar, -R.radial, R.ulnar)
      const de = wristBend.ext - clamp(wristBend.ext, -R.flex, R.ext)
      if (Math.abs(du) < 2e-3 && Math.abs(de) < 2e-3) break
      turnAbout(hand, pivot, -s * du * 0.7); ptot += de * 0.8
    }
    // (a degenerate arm, the elbow on the wrist: leave the hand as fitted)
    if (![hand.x, hand.z, hand.yaw, ptot].every(Number.isFinite)) { [hand.x, hand.z, hand.yaw, ptot] = keep; wristBend.ulnar = wristBend.ext = 0 }
  }
  const knuckleUp = d => d.base[1] * Math.cos(hroll) - d.base[0] * Math.sin(hroll)
  const thumbCurl = { side: new THREE.Vector3(s, 0, 0), tilt: FINGERS[1].tilt }
  // Where each fingertip sits in a relaxed hand, relative to the middle
  // knuckle (x across, z forward is negative): the same rest places the
  // motion model uses, so a hand with nothing to do fits itself exactly.
  const REST = [1, 2, 3, 4, 5].map(f => [restOffset(side, f), WHITE_Z[f] - KNUCKLE_Z])
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
    return out.copy(shoulder).addScaledVector(n, UPPER * cosA).addScaledVector(pole, UPPER * sinA)
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
    return { x: qx - rx, z: THREE.MathUtils.clamp(qz - rz, KNUCKLE_Z - 6.5, KNUCKLE_Z + 4), yaw, y: KEY_TOP + KNUCKLE_Y + 1.2 * anchor.idle, px, pz }
  }

  function basePos(f, out) {
    const d = FINGERS[f]
    // rolled with the forearm, then pitched about the knuckle line (setPitch)
    const cr = Math.cos(hroll), sr = Math.sin(hroll)
    const lf = d.base[0] * cr + d.base[1] * sr, up = d.base[1] * cr - d.base[0] * sr
    const cp = Math.cos(ptot), sp = Math.sin(ptot)
    const by = up * cp + d.base[2] * sp, bzp = -up * sp + d.base[2] * cp
    const [bx, bz] = rot(s * lf, bzp, hand.yaw)
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
      // (a free finger only when it is about to land: one resting near the
      // keys, as the 'fall' touch holds them, is not reaching for anything)
      if (!(t.press > 0.2 || (t.y < 0.6 && (t.rest ?? 0) < 0.3))) continue
      basePos(f, base)
      tip.set(t.x, KEY_TOP + t.y + d.rad[2] * 0.9, t.z)
      _a.subVectors(tip, base)
      // (out of reach = beyond a nearly straight finger, 0.3 rad a joint: the
      // hand is placed for the gently curved one, 0.5, so the fit's own
      // compromises do not count)
      const e = _a.length() - chainReach(d.len, d.k, 0.3)
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
      const f = bakeWrist(fitHand(pose.fingers, pose.anchor))
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
    let tr = trackAt(t); if (!tr) return null
    tr = endBlend(tr, t)
    const d = FINGERS[3], [bx, bz] = rot(s * d.base[0], d.base[2], tr[2]), [wx, wz] = rot(s * WRIST[0], WRIST[2], tr[2])
    const up = stroke ? stroke.at(t)[0] : 0
    return out.set(tr[0] + bx + tr[3] + wx, hand.y - lift + up + d.base[1] + tr[4] + WRIST[1], tr[1] + bz + tr[5] + wz)
  }

  // live (no plan): a slight roll toward whichever side of the hand presses
  let pr = 0
  function pressRoll(tips, dt) {
    const goal = 0.18 * ((tips[4].press + tips[3].press * 0.5) - (tips[0].press + tips[1].press * 0.5))
    pr += (goal - pr) * Math.min(1, dt / 0.05)
    return pr
  }

  let lastPose = null, lastT = 0
  function update(pose, dt, t) {
    lastPose = pose; lastT = t
    if (!pose) { visible = false; pitch = 0; lift = 0; ptot = 0; hroll = 0; elbow = null; return }
    pitch += (pitchGoal - pitch) * Math.min(1, dt / 0.12)
    visible = true
    const { anchor, fingers: tips } = pose
    const fit = fitHand(tips, anchor)
    const tr0 = trackAt(t), tr = tr0 && endBlend(tr0, t)
    if (tr) {
      // the stroke: carried above the keys between notes, the wrist tilting
      const st = stroke ? stroke.at(t) : null
      lift = st ? st[0] : 0
      ptot = THREE.MathUtils.clamp(pitch + (st ? st[1] : 0), -0.5, 1.1)
      // the forearm's rotation, planned from the fingering (stroke.js)
      hroll = st ? st[2] : pressRoll(tips, dt)
      hand.x = tr[0]; hand.z = tr[1]; hand.yaw = tr[2]; hand.y = fit.y + lift; hand.init = true
      slide.set(tr[3], tr[4], tr[5])
    } else {
      // live (or outside the baked song): smooth as it plays
      lift = 0; ptot = pitch
      hroll = pressRoll(tips, dt)
      if (!hand.init) { Object.assign(hand, fit, { init: true }) }
      const k = Math.min(1, dt * 14)
      hand.x += (fit.x - hand.x) * k; hand.z += (fit.z - hand.z) * k
      hand.yaw += (fit.yaw - hand.yaw) * k; hand.y = fit.y
      slide.lerp(computeSlideGoal(tips), Math.min(1, dt * 18))
    }
    // never past what a wrist can bend: the hand turns and tilts with the
    // forearm where the fit alone would bend it further
    keepWrist([fit.px, fit.pz])
    // fingertip targets in the hand frame (lx toward the little finger = s·x)
    const lx = [], lz = [], held = [], ty = []
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f]
      let t = tips[f - 1]
      let [ax, az] = rot(t.x - hand.x - slide.x, t.z - hand.z - slide.z, -hand.yaw)
      // A finger pressing a key that lies too close under its knuckle (the
      // hand brought well in for a thumb on a black key, say) strikes it
      // further in instead of hooking back under itself: up to its natural
      // reach. A white key, between the black keys if it must (then on its
      // narrow part, clear of them); a black key, along its length.
      if (f > 1 && t.press > 0.2 && t.pitch != null && az > REST[f - 1][1] + 1.2) {
        const black = isBlack(t.pitch)
        const z = Math.max(black ? -12.5 : -11, t.z - (az - REST[f - 1][1] - 1.2) / Math.max(0.6, Math.cos(hand.yaw)))
        t = { ...t, z, x: !black && z < -4.6 ? narrowX(t.pitch, t.x) : t.x }
        ;[ax, az] = rot(t.x - hand.x - slide.x, t.z - hand.z - slide.z, -hand.yaw)
      }
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
      // (a free finger rides with its knuckle as the forearm rolls)
      let y = KEY_TOP + t.y + d.rad[2] * 0.9 + (held[f - 1] ? 0 : lift + knuckleUp(d) - d.base[1])
      // ...where the arm already carries the hand up for the note, the
      // finger's own fall (fingering/motion.js touch 'fall') gives way to it
      if (!held[f - 1] && t.lift && lift > 0) y -= t.lift * Math.min(1, lift / 3)
      // a lifted finger stays curled: its tip never rises to knuckle height
      // (one rising for its own note may lift higher, raised from the knuckle
      // like a real finger: up to ~2 cm more)
      if (!held[f - 1]) y = Math.min(y, hand.y + slide.y + knuckleUp(d) - (f === 1 ? 2.6 : 4.3 - Math.min(2.1, t.lift || 0)))
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
        // (a finger raised to fall onto its next key extends further, to ~35°)
        if (Math.atan2(ey, fwd) <= 0.25 + 0.36 * Math.min(1, (tips[i].lift || 0) / 1.5)) break
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
    wristOf(J.W)
    palmPoint(J, J.M)
    // (the knuckle line carries the forearm's roll: basePos)
    J.R.subVectors(J.fingers[5][0], J.fingers[2][0]).multiplyScalar(s).normalize()
    armIK(J.W, J.E)
  }
  return { update, bakeTrack, clearTrack, wristAt, setEnding: f => { ending = f }, setPitch: p => { pitchGoal = p },
    /** where the elbow is (the rig's arm; null: unknown): the wrist is kept within WRIST_RANGE of straight on the forearm */
    setElbow: v => { if (!v) { elbow = null; return } elbow = (elbow || v3()).copy(v); elbowOff.subVectors(v, J.E) },
    /** how far (radians) the wrist is bent past WRIST_RANGE on a forearm from elbow E to this frame's wrist */
    wristExcess(E) {
      if (!visible) return 0
      bendAt(hand.yaw, ptot, _kb, _kf.subVectors(J.W, E).normalize())
      const R = WRIST_RANGE
      return Math.max(_kb.ulnar - R.ulnar, -R.radial - _kb.ulnar, _kb.ext - R.ext, -R.flex - _kb.ext, 0)
    },
    /** this frame again (no time passing), for the elbow last given to setElbow */
    redo() { if (lastPose) update(lastPose, 0, lastT) }, wristBend, handAxes, get pitch() { return pitch }, setStroke: p => { stroke = p }, get stroke() { return stroke }, get strokeLift() { return lift }, get strokeTilt() { return ptot - pitch }, get handRoll() { return hroll }, side, diag, hand, joints: J, shoulder: SHOULDER, get visible() { return visible } }
}


// fingering/motion.js: a press runs from 12 ms before to 18 ms after the
// note; the hands run this far ahead so the fingertip bottoms out on it
const PRESS_LEAD = 0.018

/** Both hands, driven by a fingered song. */
// the end of the piece, after the last key is let go: from, to (s), with the
// final lift-off (stroke.js, ~2.4 s) and inside a film's 2 s tail at most of it
export const ENDING = [0.1, 2.2]

export function createHandsDriver(dims) {
  const L = createHandDriver('L', dims), R = createHandDriver('R', dims)
  let motion = buildMotion([]), own = [], endT = Infinity
  // 0 while she plays, rising to 1 as the hands lift off the last chord
  // (the lift-off takes ~2.4 s, stroke.js): she comes back to the middle
  const endingAt = t => THREE.MathUtils.smootherstep(t, endT + ENDING[0], endT + ENDING[1])
  L.setEnding(endingAt); R.setEnding(endingAt)
  // wrist strokes: { armWeight, flex, liftOff, height } (research/01_biomechanics.md §3.5)
  const strokeOpts = { armWeight: 1, flex: 1, liftOff: 1, height: 1, rotation: 1 }
  const plan = () => { for (const d of [L, R]) d.setStroke(own.length ? planStrokes(own.filter(n => n.hand === d.side), { ...strokeOpts, velRange: velocityRange(own) }) : null) }
  return {
    L, R,
    strokeOpts,
    /** 'fall' (fingers fall onto the keys, each its own way) or 'press' (as #029/#030); set before setNotes */
    touch: 'fall',
    get notes() { return own },
    /** Change the stroke settings (re-plans the strokes only, a few ms). */
    setStrokeOpts(o) { Object.assign(strokeOpts, o); plan() },
    setNotes(notes) {
      own = notes.filter(n => n.finger >= 1)
      // fingers fall onto the keys, each in its own way (motion.js TOUCH)
      motion = buildMotion(own, { touch: this.touch, ...handDepths(dims) })
      plan()
      // bake the hands' placement over the song (60 Hz, interpolated)
      if (!own.length) { L.clearTrack(); R.clearTrack(); endT = Infinity; return }
      // the piece's end: the last key let go (its release, else its off)
      endT = own.reduce((e, m) => Math.max(e, m.release ?? m.off), -Infinity)
      const h = 1 / 60
      let t0 = Infinity, t1 = -Infinity
      for (const m of own) { t0 = Math.min(t0, m.on - 2); t1 = Math.max(t1, m.off + 6) }   // (to the end of the final lift-off)
      const n = Math.ceil((t1 - t0) / h) + 1, poses = []
      for (let i = 0; i < n; i++) poses.push(motion.poseAt(t0 + i * h))
      L.bakeTrack(t => poses[Math.round((t - t0) / h)]?.L, t0, n, h)
      R.bakeTrack(t => poses[Math.round((t - t0) / h)]?.R, t0, n, h)
    },
    clear() { motion = buildMotion([]); own = []; endT = Infinity; plan(); L.clearTrack(); R.clearTrack() },
    /** 0 while she plays, 1 once she has lifted off the last chord and come back to the middle */
    endingAt,
    /** song time of the last key let go (Infinity with no notes) */
    get endT() { return endT },
    lead: PRESS_LEAD,
    update(t, dt) { const tm = t + PRESS_LEAD, p = motion.poseAt(tm); L.update(p.L, dt, tm); R.update(p.R, dt, tm) },
  }
}
