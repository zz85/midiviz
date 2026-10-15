// The seated pianist for the concert stage (Experiment #030): torso in a dark
// jacket with a shirt collar and bow tie, head with hair, trousers and shoes.
// The hands and arms are avatar-hands.js; this body follows them.
//
// Modelled like the hands: smooth unions of simple primitives in a signed-
// distance field (sdf-mesh.js), meshed once in a seated rest pose, skinned
// with dual quaternions (dq-skinning.js) on 11 flat bones (pelvis, spine,
// chest, neck, head, and thigh / shin / foot per leg).
//
// Each frame:
//  • the chest follows the two shoulders the arm IK reports (they lean in
//    when a key is far), the spine bends from a pelvis fixed on the bench;
//  • the head looks toward the hands;
//  • the right foot rests heel-down with the ball on the sustain pedal and
//    rides it as the pedal goes down; the left foot sits by the una corda
//    and moves onto it when that pedal is used;
//  • the head (and neck) hide when the camera is close behind it or it
//    would block the camera's view of the keys; in first person (camera
//    where the pianist's eyes are) the torso hides too.
//
// Units: centimetres in the piano's frame (key tops at y = 73, key fronts at
// z = 0, the pianist at +z, floor at y = 0).

import * as THREE from 'three'
import { roundCone, ellipsoid, Field, surfaceNets, smin } from './sdf-mesh.js'
import { useDualQuatSkinning } from './dq-skinning.js'

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const A = v => [v.x, v.y, v.z]
const smax = (a, b, k) => -smin(-a, -b, k)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
const Y = v3(0, 1, 0)

// ── Proportions ────────────────────────────────────────────────────────────
const PELVIS = v3(0, 61, 55)            // hip centre, sitting on the bench (seat top y ≈ 52)
const HIP_W = 9                         // hip joints at ±9 cm
const SHOULDER = [v3(-20, 107, 45), v3(20, 107, 45)]   // L, R rest (as avatar-hands.js)
const THIGH = 43, SHIN = 45             // hip–knee, knee–ankle
const GAZE = v3(0, 76, 2)               // where the eyes rest without hands
// pedals (grand-piano.js): pivots at x = -7.5 / 0 / 7.5, y 5.1, z -7.5, foot plate
// ~0.75 cm above the pivot, tilting down 0.09 rad when pressed
const PEDAL_X = [-7.5, 0, 7.5]
const pedalTop = (i, v, d = 11) => v3(PEDAL_X[i], 5.85 + d * Math.sin(0.05 - 0.09 * v), -7.5 + d * Math.cos(0.05 - 0.09 * v))
const FOOT = 16.5                       // heel contact → ball contact

// ── Bones ──────────────────────────────────────────────────────────────────
const B = { pelvis: 0, spine: 1, chest: 2, neck: 3, head: 4, thigh: s => (s < 0 ? 5 : 8), shin: s => (s < 0 ? 6 : 9), foot: s => (s < 0 ? 7 : 10) }
const NB = 11

function frame(forward, upHint, outSide, outUp) {
  outSide.crossVectors(forward, upHint)
  if (outSide.lengthSq() < 1e-8) outSide.set(1, 0, 0)
  outSide.normalize()
  outUp.crossVectors(outSide, forward).normalize()
}
const _f = v3(), _s = v3(), _u = v3(), _c = v3(), _a = v3(), _b = v3(), _m = new THREE.Matrix4()

function makeJoints() {
  const J = { P: v3(), Lb: v3(), Cb: v3(), N: v3(), Hb: v3(), Ht: v3(), Hc: v3(), fwd: v3(), face: v3(), headUp: v3(), right: v3(), legs: {} }
  for (const s of [-1, 1]) J.legs[s] = { hip: v3(), knee: v3(), ankle: v3(), toe: v3(), heel: v3(), ball: v3(), up: v3(), fw: v3() }
  return J
}

/** Joint positions from the shoulders, gaze target and pedal values. */
function solveJoints(J, SL, SR, gaze, pedals) {
  // spine: pelvis fixed on the bench (shifting a little with the lean),
  // neck base above the shoulders' midpoint, a gentle S-curve between
  const M = _a.addVectors(SL, SR).multiplyScalar(0.5)
  J.P.copy(PELVIS).x += 0.2 * M.x
  J.N.copy(M).add(_b.set(0, 2.5, 1.5))
  J.Lb.lerpVectors(J.P, J.N, 0.3).z += 1.8
  J.Cb.lerpVectors(J.P, J.N, 0.66).z += 1.2
  // chest frame: right along the shoulder line, up the upper spine
  J.right.subVectors(SR, SL).normalize()
  const up = _c.subVectors(J.N, J.Cb).normalize()
  J.fwd.crossVectors(up, J.right).normalize()
  // head: the neck leans a little toward the hands, the head tilts more
  const look = _b.subVectors(gaze, _c.copy(J.N).addScaledVector(Y, 12)).normalize()
  J.Hb.copy(J.N).addScaledVector(_u.copy(Y).addScaledVector(look, 0.22).normalize(), 8)
  J.headUp.copy(Y).addScaledVector(look, 0.42).normalize()
  J.Ht.copy(J.Hb).addScaledVector(J.headUp, 20)
  J.face.copy(look).addScaledVector(J.headUp, -look.dot(J.headUp)).normalize()
  J.Hc.copy(J.Hb).addScaledVector(J.headUp, 8).addScaledVector(J.face, 1.5)
  // legs
  for (const s of [-1, 1]) {
    const L = J.legs[s]
    L.hip.copy(J.P).add(_a.set(s * HIP_W, 0, -1))
    if (s > 0) {
      // right foot: ball on the sustain pedal, heel on the floor behind it
      L.ball.copy(pedalTop(2, pedals[2]))
      const dy = L.ball.y
      L.heel.set(PEDAL_X[2] + 1, 0, L.ball.z + Math.sqrt(FOOT * FOOT - dy * dy))
    } else {
      // left foot: flat beside the una corda, onto it when it is down
      const v = pedals[0]
      const pb = pedalTop(0, v)
      L.ball.set(lerp(-13, pb.x, smooth(0, 0.3, v)), lerp(0, pb.y, smooth(0, 0.3, v)), lerp(6, pb.z, smooth(0, 0.3, v)))
      const dy = L.ball.y
      L.heel.set(L.ball.x - 1.5, 0, L.ball.z + Math.sqrt(FOOT * FOOT - dy * dy))
    }
    L.fw.subVectors(L.ball, L.heel).normalize()
    frame(L.fw, Y, _s, L.up)
    L.ankle.copy(L.heel).addScaledVector(L.up, 7.8).addScaledVector(L.fw, 3.8)
    L.toe.copy(L.ball).addScaledVector(L.fw, 5.5).addScaledVector(L.up, 1.2)
    // two-bone knee, bending forward and a touch outward
    const d = _a.subVectors(L.ankle, L.hip)
    let len = d.length()
    len = Math.min(len, THIGH + SHIN - 0.5)
    const n = d.normalize()
    const cosA = THREE.MathUtils.clamp((THIGH * THIGH + len * len - SHIN * SHIN) / (2 * THIGH * len), -1, 1)
    const pole = _b.set(s * 0.2, 0.55, -1)
    pole.addScaledVector(n, -pole.dot(n)).normalize()
    L.knee.copy(L.hip).addScaledVector(n, THIGH * cosA).addScaledVector(pole, THIGH * Math.sqrt(1 - cosA * cosA))
  }
}

/** Bone origin, direction target and up hint, per bone. */
function boneDefs(J) {
  const d = [
    [J.P, J.Lb, _f.set(0, 0, -1).clone()],
    [J.Lb, J.Cb, J.fwd],
    [J.Cb, J.N, J.fwd],
    [J.N, J.Hb, J.face],
    [J.Hb, J.Ht, J.face],
  ]
  for (const s of [-1, 1]) {
    const L = J.legs[s]
    d[B.thigh(s)] = [L.hip, L.knee, Y]
    d[B.shin(s)] = [L.knee, L.ankle, _c.set(0, 0, -1).clone()]
    d[B.foot(s)] = [L.ankle, L.toe, L.up]
  }
  return d
}
function poseBones(bones, J) {
  const defs = boneDefs(J)
  for (let i = 0; i < NB; i++) {
    const [from, to, hint] = defs[i]
    _f.subVectors(to, from).normalize()
    frame(_f, hint, _s, _u)
    _m.makeBasis(_s, _u, _c.copy(_f).negate())
    bones[i].position.copy(from)
    bones[i].quaternion.setFromRotationMatrix(_m)
  }
}

// ── Geometry ───────────────────────────────────────────────────────────────
/** Mesh one field and skin it to the nearest of the allowed bones. */
function skinPart(field, segs, bones, tau) {
  const { positions, normals, index } = surfaceNets(field)
  const n = positions.length / 3
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
  const p = v3(), ab = v3(), ap = v3()
  const dist = new Float32Array(segs.length)
  for (let i = 0; i < n; i++) {
    p.fromArray(positions, 3 * i)
    let dmin = Infinity
    segs.forEach(([, a, b], k) => {
      ab.subVectors(b, a); ap.subVectors(p, a)
      const t = Math.min(1, Math.max(0, ap.dot(ab) / ab.lengthSq()))
      dist[k] = ap.addScaledVector(ab, -t).length()
      dmin = Math.min(dmin, dist[k])
    })
    const w = segs.map(([bone], k) => [bone, Math.exp(-(dist[k] - dmin) / tau)]).sort((x, y) => y[1] - x[1]).slice(0, 4)
    const sum = w.reduce((t, x) => t + x[1], 0)
    for (let c = 0; c < 4; c++) { si[4 * i + c] = w[c]?.[0] ?? 0; sw[4 * i + c] = w[c] ? w[c][1] / sum : 0 }
  }
  return { positions, normals, index, si, sw }
}

function mergeParts(parts) {
  // parts: [{ part, material index }] → one BufferGeometry with groups
  let nv = 0
  for (const { part } of parts) nv += part.positions.length / 3
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4)
  const index = []
  const geo = new THREE.BufferGeometry()
  const col = parts.some(p => p.alpha) ? new Float32Array(nv * 4).fill(1) : null
  let v0 = 0
  for (const { part, mat, alpha } of parts) {
    pos.set(part.positions, v0 * 3); nor.set(part.normals, v0 * 3); si.set(part.si, v0 * 4); sw.set(part.sw, v0 * 4)
    if (alpha) for (let i = 0, P = part.positions; i < P.length / 3; i++) col[(v0 + i) * 4 + 3] = alpha(P[3 * i], P[3 * i + 1], P[3 * i + 2])
    const start = index.length
    for (const i of part.index) index.push(v0 + i)
    geo.addGroup(start, part.index.length, mat)
    v0 += part.positions.length / 3
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4))
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 4))
  geo.setIndex(index)
  geo.computeBoundingSphere()
  return geo
}

// field helpers
const boundsOf = prims => {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
  for (const p of prims) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p.bound[i]); b[i + 3] = Math.max(b[i + 3], p.bound[i + 3]) }
  return b
}
/** ops: [[prim, combine, grow]] applied in order onto a fresh field. */
function sculpt(ops, h, pad = 4) {
  const F = new Field(boundsOf(ops.filter(o => o[1] !== 'cut').map(o => o[0])), h, pad)
  for (const [prim, op, k = 0] of ops) {
    const f = op === 'cut' ? (a, b) => smax(a, -b, k) : op === 'and' ? (a, b) => smax(a, b, k) : k ? (a, b) => smin(a, b, k) : Math.min
    F.apply(prim, f, Math.max(1.5, 3 * k))   // a smooth blend reaches past the primitive; evaluate wide enough to avoid steps
  }
  return F
}
const sphere = (c, r) => ellipsoid(A(c), [r, r, r])
/** Half-space below a plane (point o, outward normal n): kept where dot(p - o, n) < 0. */
const halfSpace = (o, n, bound) => ({ bound, d: (x, y, z) => (x - o.x) * n.x + (y - o.y) * n.y + (z - o.z) * n.z })

function buildBodyGeometry(J) {
  const segs = {}
  for (const [i, [a, b]] of boneDefs(J).entries()) segs[i] = [i, a.clone(), b.clone()]
  const S = SHOULDER
  const up = v3().subVectors(J.N, J.Cb).normalize(), back = J.fwd.clone().negate()
  const parts = []

  // ── jacket: abdomen, chest, shoulders, skirt over the seat, front panels on the lap
  {
    const chestC = v3().copy(J.Cb).addScaledVector(up, 5)
    const ops = [
      [roundCone(A(v3().copy(J.P).add(v3(0, 2, 1))), A(J.Cb), 14.2, 15.2, { up: [0, 0, 1], sy: 0.72 }), 'min'],
      [ellipsoid(A(chestC), [17.2, 13.2, 11.2], A(J.right), A(up), A(back)), 'min', 4],
      [ellipsoid(A(v3().copy(chestC).addScaledVector(up, 4).addScaledVector(J.fwd, -2.5)), [16.5, 9, 9], A(J.right), A(up), A(back)), 'min', 5],   // upper back
      [ellipsoid([0, 60.5, 57], [17.5, 7.5, 13.5]), 'min', 4],
    ]
    for (const s of [-1, 1]) {
      const Sh = S[s < 0 ? 0 : 1]
      // tailored shoulder: a padded yoke, flat on top and squashed vertically,
      // sloping from the collar a little past the arm's pivot, so it overhangs
      // the sleeve head like a jacket's shoulder line instead of the sleeve
      // standing proud of it
      ops.push([roundCone(A(v3().copy(J.N).add(v3(s * 2, -4.2, 0.6))), A(v3().copy(Sh).add(v3(s * 0.6, 0.3, 0.3))), 5.6, 4.9, { up: [0, 1, 0], sy: 0.64 }), 'min', 3])
      ops.push([ellipsoid([s * 8, 58.4, 45], [8.6, 4.2, 9.5]), 'min', 3])
    }
    // the lapels' V, open over the shirt front: narrow at the button, wide at the collar
    {
      const top = v3().copy(J.N).addScaledVector(up, -1), bot = v3().copy(J.N).addScaledVector(up, -21)
      const r = J.right, f = J.fwd, H = top.distanceTo(bot)
      const vee = {
        bound: [top.x - 12, bot.y - 4, top.z - 22, top.x + 12, top.y + 6, top.z + 4],   // forward is -z
        d(x, y, z) {
          const p = _a.set(x, y, z).sub(bot)
          const pu = p.dot(up), px = Math.abs(p.dot(r)), pf = p.dot(f)
          const w = 5.6 * Math.pow(Math.min(1, Math.max(0, pu / H)), 0.8) - 0.3
          return Math.max(px - w, -pu, 7 - pf - 0.2 * pu)
        },
      }
      ops.push([vee, 'cut', 0.6])
    }
    parts.push({ part: skinPart(sculpt(ops, 0.95), [segs[B.pelvis], segs[B.spine], segs[B.chest]], null, 3), mat: 0 })
  }
  // ── shirt: collar ring and the front between the lapels
  {
    const a = v3().copy(J.N).add(v3(0, -1.8, 0.4)), b = v3().copy(J.N).add(v3(0, 3.6, 1.3))
    const front = v3().copy(J.N).addScaledVector(J.fwd, 4.6).addScaledVector(up, -10)
    const ops = [
      [roundCone(A(a), A(b), 6.1, 5.8), 'min'],
      [roundCone(A(v3().copy(a).addScaledVector(up, -2)), A(v3().copy(b).addScaledVector(up, 2)), 4.7, 4.4), 'cut', 0.5],
      [ellipsoid(A(front), [6.5, 10.5, 4.8], A(J.right), A(up), A(back)), 'min', 1.5],
    ]
    parts.push({ part: skinPart(sculpt(ops, 0.3), [segs[B.chest], segs[B.neck]], null, 2), mat: 2 })
  }
  // ── bow tie
  {
    const c = v3().copy(J.N).add(v3(0, 0.4, 0)).addScaledVector(J.fwd, 6.4)
    const ops = [[ellipsoid(A(c), [0.75, 0.75, 0.6], A(J.right), A(up), A(back)), 'min']]
    for (const s of [-1, 1]) ops.push([ellipsoid(A(v3().copy(c).addScaledVector(J.right, s * 1.9).addScaledVector(J.fwd, -0.3)), [1.75, 1.15, 0.55], A(J.right), A(up), A(back)), 'min', 0.5])
    parts.push({ part: skinPart(sculpt(ops, 0.25, 1), [segs[B.neck]], null, 1), mat: 4 })
  }
  // ── trousers: seat, thighs, shins
  {
    const ops = [[ellipsoid([0, 58.8, 56.5], [16.5, 6.8, 12.5]), 'min']]
    for (const s of [-1, 1]) {
      const L = J.legs[s]
      ops.push([roundCone(A(L.hip), A(L.knee), 8.0, 6.1, { up: [0, 1, 0], sy: 0.86 }), 'min', 4])
      ops.push([roundCone(A(L.knee), A(v3().copy(L.ankle).addScaledVector(L.up, -1.5)), 5.9, 4.6), 'min', 2.5])
    }
    parts.push({ part: skinPart(sculpt(ops, 1.0), [segs[B.pelvis], segs[B.thigh(-1)], segs[B.shin(-1)], segs[B.thigh(1)], segs[B.shin(1)]], null, 2.2), mat: 0 })
  }
  // ── shoes
  for (const s of [-1, 1]) {
    const L = J.legs[s]
    const side = v3().crossVectors(L.fw, L.up).normalize()
    const heelC = v3().copy(L.heel).addScaledVector(L.up, 2.9).addScaledVector(L.fw, 0.6)
    const toeC = v3().copy(L.ball).addScaledVector(L.fw, 5.2).addScaledVector(L.up, 2.0)
    const ops = [
      [roundCone(A(heelC), A(toeC), 3.1, 3.7, { up: A(L.up), sy: 0.6 }), 'min'],
      [roundCone(A(heelC), A(v3().copy(L.ankle).addScaledVector(L.up, 1)), 3.3, 3.6), 'min', 1.5],
      [halfSpace(L.heel, L.up.clone().negate(), [L.heel.x - 8, -1, Math.min(L.heel.z, L.ball.z) - 10, L.heel.x + 8, 12, Math.max(L.heel.z, L.ball.z) + 8]), 'and', 0.4],
    ]
    void side
    parts.push({ part: skinPart(sculpt(ops, 0.45), [segs[B.shin(s)], segs[B.foot(s)]], null, 1.2), mat: 3 })
  }
  return mergeParts(parts)
}

function buildHeadGeometry(J) {
  const segs = {}
  for (const [i, [a, b]] of boneDefs(J).entries()) segs[i] = [i, a.clone(), b.clone()]
  const u = J.headUp, f = J.face, r = v3().crossVectors(f, u).normalize()
  // head-frame point: (right, up, forward) from the head centre
  const H = (x, y, z) => v3().copy(J.Hc).addScaledVector(r, x).addScaledVector(u, y).addScaledVector(f, z)
  const E = (c, rad) => ellipsoid(A(c), rad, A(r), A(u), A(f))
  const EYE = s => H(s * 3.1, -0.35, 6.95)
  const parts = []
  {
    const ops = [
      [E(H(0, 2, -0.5), [7.3, 8.9, 9.5]), 'min'],                       // cranium
      [E(H(0, -4, 2.6), [5.9, 6.4, 6.5]), 'min', 3],                     // face and jaw
      [E(H(0, -9, 5.3), [2.7, 2.3, 2.3]), 'min', 2],                     // chin
      [E(H(0, 1.9, 7.5), [5.2, 1.3, 1.8]), 'min', 1.2],                  // brow
      [roundCone(A(H(0, 0.4, 8.3)), A(H(0, -3.0, 10.2)), 0.75, 1.25, { up: A(u) }), 'min', 0.9],   // nose
      [E(H(0, -5.0, 7.75), [1.95, 0.5, 0.75]), 'min', 0.9],              // lips
      [E(H(0, -5.95, 7.45), [1.65, 0.55, 0.75]), 'min', 0.9],
      // neck, from inside the collar to under the skull
      [roundCone(A(v3().copy(J.N).add(v3(0, -3, 0))), A(H(0, -4, -1.5)), 5.3, 5.0), 'min', 3],
    ]
    for (const s of [-1, 1]) {
      ops.push([E(H(s * 4.0, -1.6, 5.0), [2.3, 1.7, 2.3]), 'min', 3])   // cheekbones
      ops.push([E(H(s * 1.05, -3.2, 9.3), [0.9, 0.7, 0.9]), 'min', 0.5])  // nostrils
      {   // ears: a thin shell, tilted back, close to the head, with a hollow
        const c = H(s * 6.95, -0.9, -1.3), ax = v3().copy(r).multiplyScalar(s)
        const ay = v3().copy(u).applyAxisAngle(ax, 0.25), az = v3().crossVectors(ax, ay)
        ops.push([ellipsoid(A(c), [0.62, 2.6, 1.45], A(ax), A(ay), A(az)), 'min', 0.5])
        ops.push([ellipsoid(A(v3().copy(c).addScaledVector(ax, 0.75).addScaledVector(ay, -0.3)), [0.5, 1.5, 0.85], A(ax), A(ay), A(az)), 'cut', 0.35])
      }
      ops.push([sphere(H(s * 3.1, -0.1, 8.6), 1.3), 'cut', 0.9])          // eye sockets
    }
    // eyelids from the skin itself: a mound over each eyeball, opened by an
    // almond slot set low, because he looks down at the keys
    for (const s of [-1, 1]) {
      const c = EYE(s), ax = v3().copy(r).multiplyScalar(s)
      ops.push([sphere(c, 1.42), 'min', 0.5])
      const ay = v3().copy(u).applyAxisAngle(f, -s * 0.08), az = v3().crossVectors(ax, ay)
      ops.push([ellipsoid(A(v3().copy(c).addScaledVector(f, 1.45).addScaledVector(u, -0.42)), [1.2, 0.46, 0.8], A(ax), A(ay), A(az)), 'cut', 0.25])
    }
    parts.push({ part: skinPart(sculpt(ops, 0.28), [segs[B.chest], segs[B.neck], segs[B.head]], null, 1.6), mat: 0 })
  }
  // eyes: sclera, then iris and pupil as discs on the ball along the gaze
  {
    const ops = [-1, 1].map(s => [sphere(EYE(s), 1.2), 'min'])
    parts.push({ part: skinPart(sculpt(ops, 0.18, 1), [segs[B.head]], null, 1), mat: 2 })
    const g = v3().copy(f).applyAxisAngle(r, -0.38), gu = v3().crossVectors(g, r).negate()
    const disc = (rad, out, th) => [-1, 1].map(s => [ellipsoid(A(v3().copy(EYE(s)).addScaledVector(g, out)), [rad, rad, th], A(r), A(gu), A(g)), 'min'])
    parts.push({ part: skinPart(sculpt(disc(0.58, 1.02, 0.2), 0.06, 1), [segs[B.head]], null, 1), mat: 3 })
    parts.push({ part: skinPart(sculpt(disc(0.26, 1.12, 0.12), 0.05, 1), [segs[B.head]], null, 1), mat: 5 })
  }
  // hair: a cap over the cranium above a hairline that drops toward the back, and brows
  {
    const shell = E(H(0, 2.0, -0.8), [7.95, 9.55, 10.05])
    const lift = E(H(0.8, 6.2, 3.4), [5.6, 3.2, 5.6])        // a little volume over the front
    const capD = (x, y, z) => smin(shell.d(x, y, z), lift.d(x, y, z), 2.5)
    const PART = -2.7                                          // side part, on the left
    const cap = {
      bound: shell.bound,
      d(x, y, z) {
        const p = _b.set(x, y, z).sub(J.Hc)
        const pr = p.dot(r), pu = p.dot(u), pf = p.dot(f)
        // strands run front to back; their phase is the angle around that
        // axis, measured from the part so both sides comb away from it
        const a = Math.atan2(pr - PART, Math.max(pu + 2, 0.5))
        const sweep = 0.06 * pf
        const g = 0.05 * Math.sin(a * 40 + sweep) + 0.09 * Math.sin(a * 17 + 0.6 + 0.11 * pf) * smooth(-4, 4, pu)
        const part = 0.45 * Math.exp(-((pr - PART) ** 2) / 0.12) * smooth(2, 6, pf) * smooth(4, 7, pu)
        // feathered edge: toward the hairline the shell settles onto the
        // skin and (see alpha below) thins out instead of ending in a step
        const t = smooth(-1.2, 2.4, pu - hairCut(pr, pf))
        return capD(x, y, z) + g * t + part + 0.4 * (1 - t)
      },
    }
    // the line: low at the nape, up at the temples, over the forehead
    function hairCut(prS, pf) {
      const pr = Math.abs(prS)
      return lerp(-6.5, 3.6, smooth(-3, 7.5, pf)) - 1.8 * smooth(4, 7, pr) * (1 - smooth(1, 5, pf)) + 0.9 * smooth(5.5, 7.5, pr) * smooth(2, 5, pf)
    }
    const hairline = {
      bound: cap.bound,
      d(x, y, z) {
        const p = _a.set(x, y, z).sub(J.Hc)
        return hairCut(p.dot(r), p.dot(f)) - 1.3 - p.dot(u)
      },
    }
    const ops = [[cap, 'min'], [hairline, 'and', 0.6]]
    for (const s of [-1, 1]) ops.push([E(H(s * 2.9, 1.95, 8.35), [1.45, 0.26, 0.55]), 'min'])
    const hairAlpha = (x, y, z) => {
      const p = _a.set(x, y, z).sub(J.Hc)
      return smooth(-0.9, 0.8, p.dot(u) - hairCut(p.dot(r), p.dot(f)))
    }
    parts.push({ part: skinPart(sculpt(ops, 0.28), [segs[B.head]], null, 1), mat: 1, alpha: hairAlpha })
  }
  return mergeParts(parts)
}

// ── Materials ──────────────────────────────────────────────────────────────
function makeMaterials(skin) {
  const cloth = new THREE.MeshPhysicalMaterial({ color: 0x101114, roughness: 0.78, sheen: 1, sheenRoughness: 0.55, sheenColor: 0x4a4d58 })
  const satin = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.38, sheen: 1, sheenRoughness: 0.3, sheenColor: 0x5a5c66 })
  const shirt = new THREE.MeshPhysicalMaterial({ color: 0xf1efea, roughness: 0.82, sheen: 0.8, sheenRoughness: 0.5, sheenColor: 0xffffff })
  const shoes = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 })
  const hair = new THREE.MeshPhysicalMaterial({ color: 0x241913, vertexColors: true, alphaHash: true, roughness: 0.55, sheen: 1, sheenRoughness: 0.4, sheenColor: 0x6b5040 })
  const eye = new THREE.MeshPhysicalMaterial({ color: 0xbdb2a6, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 })
  const iris = new THREE.MeshPhysicalMaterial({ color: 0x4a2f1c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })
  const pupil = new THREE.MeshPhysicalMaterial({ color: 0x050403, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 })
  // the face shares the hands' tone but not their strong red glow, which on
  // the big shadowed planes under the jaw read as paint
  const face = new THREE.MeshPhysicalMaterial({
    color: skin.color.clone(), roughness: 0.55, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xff9a80),
    clearcoat: 0.08, clearcoatRoughness: 0.5, emissive: 0x1a0805, emissiveIntensity: 0.35,
  })
  for (const m of [cloth, satin, shirt, shoes, hair, eye, iris, pupil, face]) useDualQuatSkinning(m)
  return { cloth, satin, shirt, shoes, hair, eye, iris, pupil, face, skin }
}

/**
 * The body. skin: the hands' skin material (shared). Returns { group,
 * update(shoulders [L, R], wrists [L, R] | null, pedals [3], camera?, dt) }.
 * pedals: how far each pedal should be down (0..1, or booleans); the feet
 * ease toward it at the piano's own pedal rate.
 */
export function buildAvatarBody({ skin }) {
  const mats = makeMaterials(skin)
  const group = new THREE.Group()
  group.name = 'avatar-body'
  const rig = new THREE.Group()
  const bones = []
  for (let i = 0; i < NB; i++) { const b = new THREE.Bone(); bones.push(b); rig.add(b) }
  const rest = makeJoints()
  solveJoints(rest, SHOULDER[0], SHOULDER[1], GAZE, [0, 0, 0])
  poseBones(bones, rest)
  group.add(rig)
  group.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)
  const body = new THREE.SkinnedMesh(buildBodyGeometry(rest), [mats.cloth, mats.satin /* unused slot */, mats.shirt, mats.shoes, mats.satin])
  const head = new THREE.SkinnedMesh(buildHeadGeometry(rest), [mats.face, mats.hair, mats.eye, mats.iris, mats.satin, mats.pupil])
  for (const m of [body, head]) {
    m.castShadow = m.receiveShadow = true
    m.frustumCulled = false
    group.add(m)
    m.bind(skeleton, new THREE.Matrix4())
  }

  const J = makeJoints()
  const gaze = v3().copy(GAZE), want = v3(), toHead = v3(), dir = v3()
  const ped = [0, 0, 0]
  function update(shoulders, wrists, pedals = [0, 0, 0], camera = null, dt = 1 / 60) {
    // look at the hands, smoothly
    if (wrists) want.addVectors(wrists[0], wrists[1]).multiplyScalar(0.5).add(_a.set(0, -2, -9))
    else want.copy(GAZE)
    gaze.lerp(want, Math.min(1, dt * 3))
    for (let i = 0; i < 3; i++) ped[i] += (+pedals[i] - ped[i]) * Math.min(1, dt * 18)
    solveJoints(J, shoulders[0], shoulders[1], gaze, ped)
    poseBones(bones, J)
    // the head steps out of the way of a camera right behind it
    if (camera) {
      camera.getWorldPosition(toHead).negate().add(J.Hc)       // camera → head
      camera.getWorldDirection(dir)
      const along = toHead.dot(dir), off = Math.sqrt(Math.max(0, toHead.lengthSq() - along * along))
      const behind = camera.position.z > J.Hc.z - 6        // on the pianist's side of the head
      head.visible = !(toHead.length() < 28 || (behind && along > 0 && toHead.length() < 110 && off < 13 + along * 0.1))
      // a camera in the pianist's own place (first person) sees no torso either
      body.visible = !(!head.visible && camera.position.distanceTo(J.N) < 50 && behind)
      // without the head the collar is an open ring; from behind, drop the shirt
      mats.shirt.visible = head.visible || !behind
    }
  }
  return { group, update, materials: mats, meshes: { body, head }, joints: J }
}
