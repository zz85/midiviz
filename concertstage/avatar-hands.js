// Pianist hands and arms for the concert stage (Experiment #030).
//
// Concert Creator plays every song with an avatar: smooth skinned hands, a
// white shirt cuff and a dark sleeve. This is the procedural version. Each
// hand is ONE SkinnedMesh on 18 bones (upper arm, forearm, palm and three per
// finger). The skin of the hand and forearm is a signed-distance model
// (sdf-mesh.js) meshed once into a single seamless surface, so fingers grow
// out of the palm without seams; skin weights come from each vertex's
// position along the nearest finger, and the skin is blended with dual
// quaternions (dq-skinning.js) so bent knuckles keep their volume. Nails,
// cuff and sleeve are separate parts of the same mesh.
//
// Motion comes from Experiment #029: fingering/motion.js turns the fingered
// notes into fingertip targets, and each finger is solved with the coupled-
// joint IK of fingering/hands3d.js. The arm is a two-bone IK from a seated
// shoulder to the wrist, elbows out; when a key is too far the shoulder leans.
//
// Bones are kept flat (no hierarchy): every frame poseBones() places each
// bone at its joint and aims it at the next one. The bind pose is the same
// function applied to the rest joints, so rest and runtime always agree.
//
// Units: centimetres in the piano's frame (key tops at y = 73, key fronts at
// z = 0, the pianist at +z).

import * as THREE from 'three'
import { solveFinger } from '../fingering/hands3d.js'
import { roundCone, ellipsoid, Field, surfaceNets, smin } from './sdf-mesh.js'
import { useDualQuatSkinning } from './dq-skinning.js'
import { buildMotion, KEY, restOffset } from '../fingering/motion.js'

const KEY_TOP = 73
// Adult hand (as fingering/hands3d.js): segment lengths, radii at each joint,
// knuckle offset from the middle knuckle (x toward the little finger, y up,
// z toward the wrist), DIP/PIP coupling.
const FINGERS = {
  // thumb: from the CMC joint near the wrist; segment 0 is the metacarpal,
  // buried in the thenar pad, so the visible thumb has two joints (MCP, IP)
  1: { len: [4.6, 3.2, 2.6], rad: [1.45, 1.05, 0.92], base: [-3.0, -1.9, 5.0], k: 0.8, tilt: 0.75, dir: [-0.42, -0.3, -0.86] },
  2: { len: [4.4, 2.6, 2.0], rad: [0.92, 0.84, 0.76], base: [-2.25, 0, 0.35], k: 0.7, dir: [-0.06, 0, -1] },
  3: { len: [4.9, 3.0, 2.2], rad: [0.95, 0.87, 0.78], base: [0, 0.25, 0], k: 0.7, dir: [0, 0, -1] },
  4: { len: [4.6, 2.8, 2.1], rad: [0.9, 0.82, 0.74], base: [2.1, 0, 0.35], k: 0.7, dir: [0.05, 0, -1] },
  5: { len: [3.7, 2.1, 1.9], rad: [0.8, 0.72, 0.66], base: [3.9, -0.65, 1.3], k: 0.7, dir: [0.12, 0, -1] },
}
const KNUCKLE_Y = 5.9, KNUCKLE_Z = 3.6   // an arched hand: knuckles high, fingers curved
const BIND_SPREAD = [0, 0, -0.1, 0, 0.08, 0.2]   // extra fan in the bind pose (rad, + toward the little finger)
const UPPER = 29, FORE = 26          // shoulder–elbow, elbow–wrist
const WRIST = [0.6, -0.8, 8.6]       // wrist from the middle-finger knuckle base

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
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
function restJoints(s) {
  const J = makeJoints()
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f], P = J.fingers[f]
    P[0].set(s * d.base[0], d.base[1], d.base[2])
    const dir = new THREE.Vector3(s * d.dir[0], d.dir[1], d.dir[2]).normalize()
    // the bind pose fans the fingers a little wider than d.dir, so the skin
    // is modelled with a gap between them (the mesh is one surface, and
    // fingers modelled touching would be webbed together)
    const a = s * BIND_SPREAD[f], c = Math.cos(a), sn = Math.sin(a)
    dir.set(dir.x * c - dir.z * sn, dir.y, dir.x * sn + dir.z * c)
    for (let i = 0; i < 3; i++) P[i + 1].copy(P[i]).addScaledVector(dir, d.len[i])
  }
  const k3 = J.fingers[3][0]
  J.W.set(k3.x + s * WRIST[0], k3.y + WRIST[1], k3.z + WRIST[2])
  palmPoint(J, J.M)
  J.E.copy(J.W).add(_a.set(0, 0, FORE))
  J.S.copy(J.E).add(_a.set(0, 0, UPPER))
  J.R.subVectors(J.fingers[5][0], J.fingers[2][0]).multiplyScalar(s).normalize()
  return J
}

// ── Bones ──────────────────────────────────────────────────────────────────
const BONE = { upper: 0, fore: 1, palm: 2, finger: (f, i) => 3 + (f - 1) * 3 + i }
const NBONES = 18
function poseBones(bones, J, s) {
  const place = (b, from, to, upHint) => {
    _f.subVectors(to, from).normalize()
    frame(_f, upHint, _s, _u)
    _m.makeBasis(_s, _u, _c.copy(_f).negate())
    b.position.copy(from)
    b.quaternion.setFromRotationMatrix(_m)
  }
  // palm frame: forward wrist → knuckles, side along the knuckle line
  const F = _a.subVectors(J.M, J.W).normalize()
  const R = _b.copy(J.R).addScaledVector(F, -J.R.dot(F)).normalize()
  J.U.crossVectors(R, F).normalize()
  const up = J.U.clone()
  place(bones[BONE.palm], J.W, J.M, up)
  place(bones[BONE.fore], J.E, J.W, up)
  place(bones[BONE.upper], J.S, J.E, up)
  // the thumb's nail faces partly sideways (away from the palm)
  const thumbUp = up.clone().multiplyScalar(0.55).addScaledVector(R, -s * 0.85).normalize()
  for (const f of [1, 2, 3, 4, 5]) {
    const P = J.fingers[f]
    for (let i = 0; i < 3; i++) place(bones[BONE.finger(f, i)], P[i], P[i + 1], f === 1 ? thumbUp : up)
  }
}

// ── Geometry ───────────────────────────────────────────────────────────────
class Builder {
  constructor() {
    this.pos = []; this.skinIndex = []; this.skinWeight = []; this.color = []
    this.groups = { skin: [], nail: [], cuff: [], jacket: [] }
    this.fixedNormals = []   // [start, normals] ranges that keep their own normals
  }
  // an indexed mesh with its own (field-gradient) normals; weights(p) → list
  mesh(group, { positions, normals, index }, weights) {
    const start = this.pos.length / 3, P = v3()
    for (let i = 0; i < positions.length; i += 3) this.vertex(P.fromArray(positions, i), weights(P))
    for (const i of index) this.groups[group].push(start + i)
    this.fixedNormals.push([start, normals])
  }
  vertex(p, weights, alpha = 1) {
    // weights: [[bone, w], ...] (up to 4)
    const w = weights.filter(x => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = w.reduce((t, x) => t + x[1], 0) || 1
    this.pos.push(p.x, p.y, p.z)
    for (let i = 0; i < 4; i++) { this.skinIndex.push(w[i]?.[0] ?? 0); this.skinWeight.push(w[i] ? w[i][1] / sum : 0) }
    this.color.push(1, 1, 1, alpha)
    return this.pos.length / 3 - 1
  }
  // A straight tube in rest space. origin + dir * d, cross-section in (side, up).
  // prof(d) → [rx, ry, dy] (dy shifts the section along up); weights(d, θ) → list.
  tube(group, { origin, dir, side, up, d0, d1, rings, seg = 18, prof, weights, alpha, capStart = false, capEnd = false }) {
    const ds = []
    for (let i = 0; i <= rings; i++) ds.push(lerp(d0, d1, i / rings))
    const start = this.pos.length / 3
    const P = v3()
    // optional hemispherical caps: extra rings past each end
    const capRings = 5
    const list = []
    if (capStart) for (let i = capRings; i >= 1; i--) list.push({ d: d0, cap: -i / capRings })
    for (const d of ds) list.push({ d, cap: 0 })
    if (capEnd) for (let i = 1; i <= capRings; i++) list.push({ d: d1, cap: i / capRings })
    for (const r of list) {
      const [rx, ry, dy] = prof(r.d)
      const ang = Math.abs(r.cap) * Math.PI / 2
      const shrink = Math.cos(ang), push = Math.sin(ang) * Math.min(rx, ry) * Math.sign(r.cap)
      for (let j = 0; j < seg; j++) {
        const th = j / seg * Math.PI * 2
        const c = Math.cos(th), sn = Math.sin(th)
        P.copy(origin).addScaledVector(dir, r.d + push)
          .addScaledVector(side, c * rx * shrink).addScaledVector(up, sn * ry * shrink + dy)
        this.vertex(P, weights(r.d, th), alpha ? alpha(r.d) : 1)
      }
    }
    // winding so normals point outward
    _a.crossVectors(dir, up)
    const flip = _a.dot(side) < 0
    const idx = this.groups[group]
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = start + i * seg + j, b = start + (i + 1) * seg + j
        const c = start + i * seg + (j + 1) % seg, d = start + (i + 1) * seg + (j + 1) % seg
        if (!flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d)
      }
    }
  }
  // An ellipsoid (for nails and pads), given its basis and radii.
  ellipsoid(group, center, side, up, fwd, radii, weights) {
    const g = new THREE.SphereGeometry(1, 12, 8)
    const m = new THREE.Matrix4().makeBasis(_a.copy(side).multiplyScalar(radii[0]), _b.copy(up).multiplyScalar(radii[1]), _c.copy(fwd).multiplyScalar(radii[2]))
    m.setPosition(center)
    if (m.determinant() < 0) m.scale(new THREE.Vector3(-1, 1, 1))
    g.applyMatrix4(m)
    const start = this.pos.length / 3, p = g.attributes.position, P = v3()
    for (let i = 0; i < p.count; i++) { P.fromBufferAttribute(p, i); this.vertex(P, weights) }
    for (const i of g.index.array) this.groups[group].push(start + i)
  }
  build() {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIndex, 4))
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinWeight, 4))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 4))
    const index = []
    let at = 0
    ;['skin', 'nail', 'cuff', 'jacket'].forEach((k, mi) => {
      const g = this.groups[k]
      for (const i of g) index.push(i)
      geo.addGroup(at, g.length, mi)
      at += g.length
    })
    geo.setIndex(index)
    geo.computeVertexNormals()
    const N = geo.attributes.normal
    for (const [start, n] of this.fixedNormals) for (let i = 0; i < n.length / 3; i++) N.setXYZ(start + i, n[3 * i], n[3 * i + 1], n[3 * i + 2])
    return geo
  }
}

function buildHandGeometry(s, J, bones) {
  const B = new Builder()
  const boneOf = (f, i) => BONE.finger(f, i)
  // ── skin: one seamless surface ──
  // The hand, wrist and forearm skin is a signed-distance model (tapered
  // capsules for the phalanges and metacarpals, pads for the thenar and
  // hypothenar), meshed once with surface nets. Fingers join the palm through
  // a smooth union, so the knuckles and the web between the fingers flow
  // instead of showing seams; fingers are kept apart from each other.
  const A = v => [v.x, v.y, v.z]
  const fingerUp = f => v3(0, 1, 0).applyQuaternion(bones[boneOf(f, 0)].quaternion)
  const chains = {}
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f], P = J.fingers[f]
    const rTip = d.rad[2] * 0.88
    const dir = v3().subVectors(P[1], P[0]).normalize()
    const start = v3().copy(P[0]).addScaledVector(dir, f === 1 ? -0.3 : -1.0)
    chains[f] = {
      pts: [start, P[1], P[2], P[3]],
      rad: [d.rad[0] * 1.05, d.rad[1], d.rad[2], rTip],
      cum: [0, d.len[0], d.len[0] + d.len[1], d.len[0] + d.len[1] + d.len[2]],
      off: f === 1 ? 0.3 : 1.0,          // how far start sits behind P[0]
      up: fingerUp(f),
    }
  }
  // grid bounds
  const lo = v3(Infinity, Infinity, Infinity), hi = v3(-Infinity, -Infinity, -Infinity)
  for (const f in chains) for (const p of chains[f].pts) { lo.min(p); hi.max(p) }
  lo.min(v3(J.W.x - 3.4, J.W.y - 2.4, J.W.z - 2)); hi.max(v3(J.W.x + 3.4, J.W.y + 2.4, J.W.z + 11))
  const H = 0.16              // grid spacing (cm): ~65k triangles a hand
  const box = [lo.x, lo.y, lo.z, hi.x, hi.y, hi.z]
  const palmF = new Field(box, H, 1.6), fingF = new Field(box, H, 1.6)
  const min = Math.min, sm = k => (a, b) => smin(a, b, k)
  // fingers (hard union between fingers: no webbing)
  for (const f in chains) {
    const c = chains[f]
    for (let i = 0; i < 3; i++) fingF.apply(roundCone(A(c.pts[i]), A(c.pts[i + 1]), c.rad[i], c.rad[i + 1], { up: A(c.up), sy: f === '1' ? 0.92 : 0.88 }), min)
  }
  // palm: four flattened capsules from the wrist to the knuckles, blended
  const Wb = (f, dz = -0.6) => { const t = (f - 2) / 3; return [J.W.x + s * lerp(-2.2, 2.2, t), J.W.y + 0.15, J.W.z + dz] }
  for (const f of [2, 3, 4, 5]) {
    const K = J.fingers[f][0]
    palmF.apply(roundCone(Wb(f), [K.x, K.y - 0.25, K.z + 0.2], 1.5, 1.08, { sy: 0.82 }), sm(1.6), 1.6)
    // knuckle bump on the back of the hand
    const u = chains[f].up
    palmF.apply(ellipsoid([K.x + u.x * 0.55, K.y + u.y * 0.55, K.z + u.z * 0.55 + 0.25], [0.62, 0.42, 0.7]), sm(0.45), 0.5)
  }
  {
    // thenar: the muscle around the thumb's metacarpal, toward the palm
    const T = J.fingers[1], tf = v3().subVectors(T[1], T[0]).normalize()
    const tside = v3().crossVectors(tf, v3(0, 1, 0)).normalize(), tup = v3().crossVectors(tside, tf).normalize()
    const tc = v3().lerpVectors(T[0], T[1], 0.4); tc.x += s * 0.75; tc.y -= 0.3
    palmF.apply(ellipsoid(A(tc), [1.55, 1.15, FINGERS[1].len[0] * 0.56], A(tside), A(tup), A(tf)), sm(1.2), 1.2)
    // hypothenar: the little-finger edge of the palm
    const K5 = J.fingers[5][0], w5 = Wb(5, -0.2)
    const hc = [lerp(K5.x, w5[0], 0.55) + s * 0.35, lerp(K5.y, w5[1], 0.55) - 0.45, lerp(K5.z, w5[2], 0.55)]
    palmF.apply(ellipsoid(hc, [1.0, 0.85, 2.7]), sm(1.0), 1.0)
  }
  // wrist and forearm
  palmF.apply(roundCone([J.W.x, J.W.y, J.W.z - 1.2], [J.W.x, J.W.y + 0.05, J.W.z + 10.5], 2.4, 3.0, { sy: 0.66 }), sm(1.8), 1.8)
  // the thumb joins the palm softly over its metacarpal, the fingers at the knuckles
  palmF.merge(fingF, sm(0.85))
  const skin = surfaceNets(palmF)

  // ── skin weights, from the bind-pose geometry ──
  // Each vertex finds the finger chains it is nearest (softly, so the webs
  // between fingers split evenly), how far along that chain it sits, and
  // how much it belongs to the finger rather than the palm. Joint blends
  // are about a joint-radius wide, centred on the joint.
  const q = v3(), ab = v3(), ap = v3()
  function chainHit(f, p) {
    const c = chains[f]
    let best = Infinity, x = 0
    for (let i = 0; i < 3; i++) {
      const a0 = c.pts[i], b0 = c.pts[i + 1]
      ab.subVectors(b0, a0); ap.subVectors(p, a0)
      const L2 = ab.lengthSq(), tRaw = ap.dot(ab) / L2, t = Math.min(1, Math.max(0, tRaw))
      q.copy(a0).addScaledVector(ab, t)
      const dd = p.distanceTo(q) - lerp(c.rad[i], c.rad[i + 1], t)
      if (dd < best) {
        best = dd
        const segLen = Math.sqrt(L2)
        // along-chain position, measured from the knuckle (P[0]); behind the
        // chain start it keeps going negative so the palm side is graded
        x = (i === 0 ? (tRaw < 0 ? tRaw : t) * segLen - c.off : c.cum[i] + t * segLen)
      }
    }
    return { d: best, x }
  }
  const skinWeights = p => {
    const hits = [1, 2, 3, 4, 5].map(f => chainHit(f, p))
    const dmin = Math.min(...hits.map(h => h.d))
    const soft = hits.map(h => Math.exp(-(h.d - dmin) / 0.22))
    const tot = soft.reduce((a, b) => a + b, 0)
    const w = []
    let fingerSum = 0
    for (const f of [1, 2, 3, 4, 5]) {
      const h = hits[f - 1], d = FINGERS[f], L = d.len
      const share = soft[f - 1] / tot
      if (share < 0.02) continue
      // finger vs palm: fingers 2–5 leave the palm at the knuckle; the thumb
      // carries its metacarpal (and the thenar with it) from the CMC out
      let m = f === 1 ? smooth(0.6, 3.6, h.x) : smooth(-1.0, 0.7, h.x)
      m *= 1 - smooth(f === 1 ? 0.5 : 0.35, f === 1 ? 1.6 : 1.3, h.d)
      const own = share * m
      if (own < 1e-3) continue
      fingerSum += own
      const j1 = L[0], j2 = L[0] + L[1]
      const w1 = 1.35 * d.rad[1], w2 = 1.2 * d.rad[2]
      const k1 = smooth(j1 - w1, j1 + w1, h.x), k2 = smooth(j2 - w2, j2 + w2, h.x)
      w.push([boneOf(f, 0), own * (1 - k1)], [boneOf(f, 1), own * k1 * (1 - k2)], [boneOf(f, 2), own * k2])
    }
    // the rest is palm, handing over to the forearm across the wrist
    const rest = Math.max(0, 1 - fingerSum)
    const e = p.z - J.W.z
    const fore = smooth(-1.2, 1.8, e)
    w.push([BONE.palm, rest * (1 - fore)], [BONE.fore, rest * fore])
    // merge duplicates (vertex() keeps the four heaviest)
    const m = new Map()
    for (const [b, x] of w) m.set(b, (m.get(b) || 0) + x)
    return [...m]
  }
  B.mesh('skin', skin, skinWeights)

  // ── nails ──
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f], P = J.fingers[f], L = d.len
    const b2 = bones[boneOf(f, 2)]
    const nside = v3().set(1, 0, 0).applyQuaternion(b2.quaternion), nup = v3().set(0, 1, 0).applyQuaternion(b2.quaternion)
    const nf = v3().set(0, 0, -1).applyQuaternion(b2.quaternion)
    const r2 = lerp(d.rad[2], d.rad[2] * 0.88, 0.6) * (f === 1 ? 0.92 : 0.88)
    const c = v3().copy(P[2]).addScaledVector(nf, L[2] * 0.55).addScaledVector(nup, r2 * 0.93)
    B.ellipsoid('nail', c, nside, nup, nf, [r2 * 0.72, 0.16, L[2] * 0.4], [[boneOf(f, 2), 1]])
  }
  // ── wrist, forearm, cuff, sleeve ──
  {
    const origin = J.W, dir = v3(0, 0, 1), side = v3(1, 0, 0), up = v3(0, 1, 0)
    const skinR = e => [lerp(2.42, 3.0, smooth(-1, 10.5, e)), lerp(1.6, 1.98, smooth(-1, 10.5, e)), 0.05]
    // shirt cuff: rolled front edge
    B.tube('cuff', {
      origin, dir, side, up, d0: 5.2, d1: 10, rings: 10, seg: 24,
      prof: e => { const [rx, ry] = skinR(e); const roll = 0.42 - 0.22 * (1 - smooth(5.2, 5.8, e)); return [rx + roll, ry + roll, 0.05] },
      weights: e => [[BONE.palm, 0.25 * (1 - smooth(5, 7, e))], [BONE.fore, 1]],
    })
    // jacket sleeve, past the elbow and up the upper arm, fading toward the shoulder (capped there when the body is on)
    const E = FORE, S = FORE + UPPER
    B.tube('jacket', {
      origin, dir, side, up, d0: 8.4, d1: S + 1.2, rings: 54, seg: 26,
      prof: e => {
        const r = e < E ? lerp(3.45, 4.1, smooth(8.4, E, e)) : lerp(4.1, 4.6, smooth(E, S, e))
        const lip = 0.18 * (1 - smooth(8.4, 9.2, e))
        // the top rounds over into the shoulder: a cap that turns with the arm
        // (the deltoid), so the body's shoulder needs no ball of its own
        const c = Math.min(1, Math.max(0, (e - (S - 4.6)) / 5.8)), cap = Math.sqrt(Math.max(0.0025, 1 - c * c))
        return [r * 1.08 * cap - lip, r * 0.95 * cap - lip, 0.05]
      },
      weights: e => [[BONE.fore, 1 - smooth(E - 3, E + 3, e)], [BONE.upper, smooth(E - 3, E + 3, e)]],
      alpha: e => 1 - smooth(E + 9, S - 2, e),
    })
  }
  return B.build()
}

// ── Materials ──────────────────────────────────────────────────────────────
function makeMaterials() {
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xd9a080, roughness: 0.5, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xff8a70),
    clearcoat: 0.12, clearcoatRoughness: 0.45, emissive: 0x2a0904, emissiveIntensity: 0.6,
  })
  // A cheap subsurface hint: light wraps a little further round the form and
  // comes back reddish, so the shadow side of a finger is warm rather than grey.
  skin.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.indirectDiffuse += vec3(0.10, 0.025, 0.012) * diffuseColor.rgb * (1.0 - saturate(dot(normal, normalize(vViewPosition))));`)
  }
  useDualQuatSkinning(skin)    // bent knuckles keep their volume
  const nail = new THREE.MeshPhysicalMaterial({ color: 0xf2c7ba, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: 0xffffff })
  const cuff = new THREE.MeshPhysicalMaterial({ color: 0xf1efea, roughness: 0.82, sheen: 0.8, sheenRoughness: 0.5, sheenColor: 0xffffff, side: THREE.DoubleSide })
  const jacket = new THREE.MeshPhysicalMaterial({
    color: 0x101114, roughness: 0.78, sheen: 1, sheenRoughness: 0.55, sheenColor: 0x4a4d58,
    side: THREE.DoubleSide, vertexColors: true, alphaHash: true,
  })
  return { skin, nail, cuff, jacket }
}

// ── One hand ───────────────────────────────────────────────────────────────
function buildHand(side, mats) {
  const s = side === 'R' ? 1 : -1
  const group = new THREE.Group()
  group.name = 'avatar' + side
  const rig = new THREE.Group()
  const bones = []
  for (let i = 0; i < NBONES; i++) { const b = new THREE.Bone(); bones.push(b); rig.add(b) }
  const rest = restJoints(s)
  poseBones(bones, rest, s)
  rig.updateMatrixWorld(true)
  const geo = buildHandGeometry(s, rest, bones)
  const mesh = new THREE.SkinnedMesh(geo, [mats.skin, mats.nail, mats.cuff, mats.jacket])
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  group.add(rig, mesh)
  group.updateMatrixWorld(true)
  mesh.bind(new THREE.Skeleton(bones), new THREE.Matrix4())

  const J = makeJoints()
  const shoulder = v3(), tip = v3(), base = v3()
  const SHOULDER = new THREE.Vector3(s * 20, 107, 45)
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
  const REACH = [0, 0, 7.4, 8, 7.4, 6.2]   // relaxed tip, cm forward of its knuckle (cf. #029 LIMITS.rest)
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
    const [bx, bz] = rot(s * d.base[0], d.base[2], hand.yaw)
    return out.set(hand.x + bx, hand.y + d.base[1], hand.z + bz).add(slide)
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

  // The hand's placement and slide, baked over the whole song ahead of time
  // (see bakeTrack). Smoothing them as they play (a low-pass on each frame)
  // makes the hand trail the notes: on a fast run or a leap it is still
  // travelling when the key goes down. Baked, they are smoothed forward and
  // backward, which settles the hand just as well with no lag at all.
  let track = null
  const COLS = 6   // x, z, yaw, slide x, y, z
  function trackAt(t) {
    if (!track || t == null) return null
    const u = (t - track.t0) / track.h, i = Math.floor(u)
    if (i < 0 || i >= track.n - 1) return null
    const a = i * COLS, b = a + COLS, w = u - i, X = track.X
    if (Number.isNaN(X[a]) || Number.isNaN(X[b])) return null
    for (let c = 0; c < COLS; c++) trackOut[c] = X[a + c] + (X[b + c] - X[a + c]) * w
    return trackOut
  }
  const trackOut = new Float32Array(COLS)
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
    const keep = { ...hand }
    // pass 1: where the fit puts the hand
    for (let i = 0; i < n; i++) {
      const pose = poseAt(t0 + i * h); if (!pose) continue
      const f = fitHand(pose.fingers, pose.anchor)
      X[i * COLS] = f.x; X[i * COLS + 1] = f.z; X[i * COLS + 2] = f.yaw
    }
    // the same settling as the live filters (14/s), run both ways
    zeroPhase(X, n, 0, 3, 1 - Math.exp(-14 * h))
    // pass 2: the slide the smoothed hand still needs
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(X[i * COLS])) continue
      const pose = poseAt(t0 + i * h)
      hand.x = X[i * COLS]; hand.z = X[i * COLS + 1]; hand.yaw = X[i * COLS + 2]
      hand.y = KEY_TOP + KNUCKLE_Y + 1.2 * pose.anchor.idle
      const g = computeSlideGoal(pose.fingers)
      X[i * COLS + 3] = g.x; X[i * COLS + 4] = g.y; X[i * COLS + 5] = g.z
    }
    zeroPhase(X, n, 3, 6, 1 - Math.exp(-18 * h))
    Object.assign(hand, keep)
    track = { t0, h, n, X }
  }
  function clearTrack() { track = null }

  function update(pose, dt, t) {
    if (!pose) { group.visible = false; return }
    group.visible = true
    const { anchor, fingers: tips } = pose
    const fit = fitHand(tips, anchor)
    const tr = trackAt(t)
    if (tr) {
      hand.x = tr[0]; hand.z = tr[1]; hand.yaw = tr[2]; hand.y = fit.y; hand.init = true
      slide.set(tr[3], tr[4], tr[5])
    } else {
      // live (or outside the baked song): smooth as it plays
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
      let y = KEY_TOP + t.y + d.rad[2] * 0.9
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
    for (let i = 0; i < 5; i++) if (held[i]) turn(i, SPLAY.max[i + 1])
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
      diag.err[i] = solveFinger(P[0].clone(), tip, d.len, d.k, P, f === 1 ? thumbCurl : null)
      // knuckle limit: a finger may not bend back more than ~14° at the MCP;
      // lower its target until it doesn't (pressed fingers already point down)
      if (f > 1) for (let it = 0; it < 4; it++) {
        const ex = P[1].x - P[0].x, ey = P[1].y - P[0].y, ez = P[1].z - P[0].z
        const fwd = ex * Math.sin(hand.yaw) - ez * Math.cos(hand.yaw)
        if (Math.atan2(ey, fwd) <= 0.25) break
        tip.y -= 0.8
        diag.err[i] = solveFinger(P[0].clone(), tip, d.len, d.k, P, null)
      }
    }
    const k3 = J.fingers[3][0]
    const [wx, wz] = rot(s * WRIST[0], WRIST[2], hand.yaw)
    J.W.set(k3.x + wx, k3.y + WRIST[1], k3.z + wz)
    palmPoint(J, J.M)
    J.R.subVectors(J.fingers[5][0], J.fingers[2][0]).multiplyScalar(s).normalize()
    // a slight roll toward whichever side of the hand is pressing
    const roll = 0.18 * ((tips[4].press + tips[3].press * 0.5) - (tips[0].press + tips[1].press * 0.5)) * s
    J.R.y -= roll
    J.R.normalize()
    armIK(J.W, J.E)
    poseBones(bones, J, s)
  }
  return { group, update, bakeTrack, clearTrack, side, diag, hand, joints: J }
}

// ── Both hands, driven by a fingered song ──────────────────────────────────
export function buildAvatarHands() {
  const mats = makeMaterials()
  const group = new THREE.Group()
  group.name = 'avatar-hands'
  const L = buildHand('L', mats), R = buildHand('R', mats)
  group.add(L.group, R.group)
  let motion = buildMotion([])
  let sleeves = true
  return {
    group, materials: mats,
    /** notes: [{ pitch, on, off, hand, finger, velocity }] */
    setNotes(notes) {
      const own = notes.filter(n => n.finger >= 1)
      motion = buildMotion(own)
      // bake the hands' placement over the song (60 Hz, interpolated): ~0.1 s
      // for five minutes of music
      if (!own.length) { L.clearTrack(); R.clearTrack(); return }
      const h = 1 / 60
      let t0 = Infinity, t1 = -Infinity
      for (const m of own) { t0 = Math.min(t0, m.on - 2); t1 = Math.max(t1, m.off + 2) }
      const n = Math.ceil((t1 - t0) / h) + 1
      const poses = []
      for (let i = 0; i < n; i++) poses.push(motion.poseAt(t0 + i * h))
      L.bakeTrack(t => poses[Math.round((t - t0) / h)]?.L, t0, n, h)
      R.bakeTrack(t => poses[Math.round((t - t0) / h)]?.R, t0, n, h)
    },
    clear() { motion = buildMotion([]); L.clearTrack(); R.clearTrack() },
    setSleeves(on) { sleeves = on; mats.jacket.visible = on; mats.cuff.visible = on },
    /** With a body the sleeve runs solid to the shoulder (no fade). */
    setBody(on) { mats.jacket.vertexColors = !on; mats.jacket.transparent = !on; mats.jacket.needsUpdate = true },
    /** Shoulder and wrist joints, for the body to follow: { L: { S, W }, R: { S, W } }. */
    joints: { L: L.joints, R: R.joints },
    update(t, dt) {
      const pose = motion.poseAt(t)
      L.update(pose.L, dt, t); R.update(pose.R, dt, t)
    },
    get sleeves() { return sleeves },
    hands: { L, R },
  }
}
