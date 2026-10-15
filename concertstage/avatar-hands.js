// Pianist hands and arms for the concert stage (Experiment #030).
//
// Concert Creator plays every song with an avatar: smooth skinned hands, a
// white shirt cuff and a dark sleeve. This is the procedural version. Each
// hand is ONE continuous SkinnedMesh (palm, thenar pad, five tapered fingers
// with knuckle bumps and nails, wrist, cuff and jacket sleeve) on 18 bones:
// upper arm, forearm, palm and three per finger.
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
import { buildMotion } from '../fingering/motion.js'

const KEY_TOP = 73
// Adult hand (as fingering/hands3d.js): segment lengths, radii at each joint,
// knuckle offset from the middle knuckle (x toward the little finger, y up,
// z toward the wrist), DIP/PIP coupling.
const FINGERS = {
  1: { len: [4.3, 3.1, 2.6], rad: [1.15, 1.0, 0.9], base: [-3.4, -2.2, 4.6], k: 0.8, dir: [-0.5, -0.22, -0.84] },
  2: { len: [4.4, 2.6, 2.0], rad: [0.92, 0.84, 0.76], base: [-2.25, 0, 0.35], k: 0.7, dir: [-0.06, 0, -1] },
  3: { len: [4.9, 3.0, 2.2], rad: [0.95, 0.87, 0.78], base: [0, 0.25, 0], k: 0.7, dir: [0, 0, -1] },
  4: { len: [4.6, 2.8, 2.1], rad: [0.9, 0.82, 0.74], base: [2.1, 0, 0.35], k: 0.7, dir: [0.05, 0, -1] },
  5: { len: [3.7, 2.1, 1.9], rad: [0.8, 0.72, 0.66], base: [3.9, -0.65, 1.3], k: 0.7, dir: [0.12, 0, -1] },
}
const KNUCKLE_Y = 4.9, KNUCKLE_Z = 3.2
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
      index.push(...g)
      geo.addGroup(at, g.length, mi)
      at += g.length
    })
    geo.setIndex(index)
    geo.computeVertexNormals()
    return geo
  }
}

function buildHandGeometry(s, J, bones) {
  const B = new Builder()
  const boneOf = (f, i) => BONE.finger(f, i)
  // ── fingers ──
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f], P = J.fingers[f], L = d.len
    const b0 = bones[boneOf(f, 0)]
    const side = v3().set(1, 0, 0).applyQuaternion(b0.quaternion)
    const up = v3().set(0, 1, 0).applyQuaternion(b0.quaternion)
    const dir = v3().subVectors(P[1], P[0]).normalize()
    const j1 = L[0], j2 = L[0] + L[1], end = L[0] + L[1] + L[2]
    const rTip = d.rad[2] * 0.88
    const radiusAt = x => {
      if (x < j1) return lerp(d.rad[0] * 1.05, d.rad[1], smooth(0, j1, x))
      if (x < j2) return lerp(d.rad[1], d.rad[2], (x - j1) / L[1])
      return lerp(d.rad[2], rTip, smooth(j2, end, x))
    }
    const thumb = f === 1
    B.tube('skin', {
      origin: P[0], dir, side, up, d0: thumb ? -1.6 : -1.4, d1: end, rings: 30, seg: 16, capStart: true, capEnd: true,
      prof: x => {
        const r = radiusAt(x)
        // knuckle bumps on top, a fuller pad under the last segment
        const bump = 0.09 * (Math.exp(-(((x - j1) / 0.55) ** 2)) + Math.exp(-(((x - j2) / 0.45) ** 2))) + (x < 0.6 ? 0.12 * Math.exp(-((x / 0.8) ** 2)) : 0)
        const pad = x > j2 ? 0.06 * Math.sin(Math.PI * smooth(j2, end, x)) : 0
        return [r * (thumb ? 1.08 : 1.1), r * (thumb ? 0.95 : 0.9) + bump * 0.5, bump * 0.5 - pad]
      },
      weights: x => {
        // linear blend across each joint, over about a radius
        const w = []
        const k0 = smooth(-1.1, 0.5, x)                       // palm → proximal
        const k1 = smooth(j1 - 0.45, j1 + 0.45, x), k2 = smooth(j2 - 0.4, j2 + 0.4, x)
        w.push([BONE.palm, 1 - k0])
        w.push([boneOf(f, 0), k0 * (1 - k1)])
        w.push([boneOf(f, 1), k1 * (1 - k2)])
        w.push([boneOf(f, 2), k2])
        return w
      },
    })
    // nail on the last segment
    const b2 = bones[boneOf(f, 2)]
    const nside = v3().set(1, 0, 0).applyQuaternion(b2.quaternion), nup = v3().set(0, 1, 0).applyQuaternion(b2.quaternion)
    const nf = v3().set(0, 0, -1).applyQuaternion(b2.quaternion)
    const r2 = radiusAt(j2 + L[2] * 0.6)
    const c = v3().copy(P[2]).addScaledVector(nf, L[2] * 0.62).addScaledVector(nup, r2 * 0.86)
    B.ellipsoid('nail', c, nside, nup, nf, [r2 * 0.74, 0.2, L[2] * 0.42], [[boneOf(f, 2), 1]])
  }
  // ── palm: a loft from the knuckles to the wrist ──
  {
    const k2 = J.fingers[2][0], k5 = J.fingers[5][0], k1 = J.fingers[1][0]
    const front = Math.min(k2.z, J.fingers[3][0].z) - 0.15, back = J.W.z + 0.6
    const xc0 = (k2.x + k5.x) / 2, xc1 = J.W.x
    const half0 = Math.abs(k5.x - k2.x) / 2 + 0.95
    const N = 22, SEG = 28
    const start = B.pos.length / 3
    const P = v3()
    for (let i = 0; i <= N; i++) {
      const u = i / N
      // rounded front edge: the first rings shrink in height
      const z = lerp(front, back, u)
      const roundF = Math.sqrt(Math.max(0, 1 - ((1 - smooth(0, 0.12, u)) ** 2))) * 0.6 + 0.4
      const roundB = Math.sqrt(Math.max(0, 1 - (smooth(0.9, 1, u) ** 2))) * 0.35 + 0.65
      const half = lerp(half0, 2.9, smooth(0.35, 1, u)) + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.6))
      const h = lerp(1.3, 1.05, u) * roundF * roundB
      const cx = lerp(xc0, xc1, u), cy = lerp(-0.4, J.W.y + 0.05, u)
      for (let j = 0; j < SEG; j++) {
        const th = j / SEG * Math.PI * 2
        const c = Math.cos(th), sn = Math.sin(th)
        const ex = Math.sign(c) * Math.abs(c) ** (2 / 2.8), ey = Math.sign(sn) * Math.abs(sn) ** (2 / 2.4)
        let x = cx + ex * half * roundF
        // thumb side bulges into the thenar pad underneath
        const thumbSide = Math.max(0, -s * ex)
        let y = cy + ey * h * (ey < 0 ? 0.85 + 0.35 * thumbSide * Math.sin(Math.PI * smooth(0.15, 0.85, u)) : 1)
        y += -0.13 * (x - cx) * s * (1 - u)     // little-finger side a touch lower
        P.set(x, y, z)
        const w = [[BONE.palm, 1]]
        // near the knuckles, follow the nearest finger a little
        if (u < 0.28) {
          let best = 2, bd = 1e9
          for (const f of [2, 3, 4, 5]) { const dd = Math.abs(J.fingers[f][0].x - x); if (dd < bd) { bd = dd; best = f } }
          w.push([BONE.finger(best, 0), 0.35 * (1 - u / 0.28)])
        }
        // the thumb side of the palm moves with the thumb
        if (thumbSide > 0.3 && u > 0.15 && u < 0.85) w.push([BONE.finger(1, 0), 0.25 * thumbSide * Math.sin(Math.PI * (u - 0.15) / 0.7)])
        if (u > 0.85) w.push([BONE.fore, smooth(0.85, 1.05, u) * 0.5])
        B.vertex(P, w)
      }
    }
    const idx = B.groups.skin
    for (let i = 0; i < N; i++) for (let j = 0; j < SEG; j++) {
      const a = start + i * SEG + j, b = start + (i + 1) * SEG + j, c = start + i * SEG + (j + 1) % SEG, d = start + (i + 1) * SEG + (j + 1) % SEG
      idx.push(a, c, b, b, c, d)
    }
    // close the front with a fan
    const ctr = B.vertex(P.set(xc0, -0.4, front - 0.1), [[BONE.palm, 1]])
    for (let j = 0; j < SEG; j++) idx.push(ctr, start + (j + 1) % SEG, start + j)
    // thenar pad (thumb muscle) between the thumb root and the wrist
    const tc = v3().lerpVectors(k1, J.W, 0.42); tc.y += 0.35
    B.ellipsoid('skin', tc, v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1), [1.9, 1.35, 2.7], [[BONE.palm, 0.6], [BONE.finger(1, 0), 0.4]])
  }
  // ── wrist, forearm, cuff, sleeve ──
  {
    const origin = J.W, dir = v3(0, 0, 1), side = v3(1, 0, 0), up = v3(0, 1, 0)
    const skinR = e => [lerp(2.5, 3.0, smooth(0, 10, e)), lerp(1.55, 2.15, smooth(0, 10, e)), 0.05]
    B.tube('skin', {
      origin, dir, side, up, d0: -1.6, d1: 10.5, rings: 16, seg: 22, prof: skinR,
      weights: e => [[BONE.palm, 1 - smooth(-1.4, 1.6, e)], [BONE.fore, smooth(-1.4, 1.6, e)]],
    })
    // shirt cuff: rolled front edge
    B.tube('cuff', {
      origin, dir, side, up, d0: 5.2, d1: 10, rings: 10, seg: 24,
      prof: e => { const [rx, ry] = skinR(e); const roll = 0.42 - 0.22 * (1 - smooth(5.2, 5.8, e)); return [rx + roll, ry + roll, 0.05] },
      weights: e => [[BONE.palm, 0.25 * (1 - smooth(5, 7, e))], [BONE.fore, 1]],
    })
    // jacket sleeve, past the elbow and up the upper arm, fading toward the shoulder
    const E = FORE, S = FORE + UPPER
    B.tube('jacket', {
      origin, dir, side, up, d0: 8.4, d1: S - 1, rings: 48, seg: 26,
      prof: e => {
        const r = e < E ? lerp(3.45, 4.1, smooth(8.4, E, e)) : lerp(4.1, 4.6, smooth(E, S, e))
        const lip = 0.18 * (1 - smooth(8.4, 9.2, e))
        return [r * 1.08 - lip, r * 0.95 - lip, 0.05]
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
  const knuckle = v3(), offset = v3(), need = v3(), target = v3(), tip = v3(), shoulder = v3()
  const SHOULDER = new THREE.Vector3(s * 20, 107, 45)

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

  function update(pose, dt) {
    if (!pose) { group.visible = false; return }
    group.visible = true
    const { anchor, fingers: tips } = pose
    knuckle.set(anchor.x, KEY_TOP + KNUCKLE_Y + 1.2 * anchor.idle, KNUCKLE_Z - 3.2 * anchor.black + 3 * anchor.idle)
    // slide toward any pressed key the fingers cannot reach (as hands3d.js)
    need.set(0, 0, 0)
    let worst = 0
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f], t = tips[f - 1], P = J.fingers[f]
      P[0].set(knuckle.x + s * d.base[0], knuckle.y + d.base[1], knuckle.z + d.base[2]).add(offset)
      tip.set(t.x, KEY_TOP + t.y + d.rad[2] * 0.9, t.z)
      if (t.press > 0.2 || t.y < 0.6) {
        _a.subVectors(tip, P[0])
        const e = _a.length() - chainReach(d.len, d.k, 0.5)
        if (e > worst) { worst = e; need.copy(_a).setLength(e) }
      }
    }
    target.copy(offset).add(need)
    target.y = Math.max(-2, Math.min(1.5, target.y))
    offset.lerp(target, Math.min(1, dt * 18))
    for (const f of [1, 2, 3, 4, 5]) {
      const d = FINGERS[f], t = tips[f - 1], P = J.fingers[f]
      P[0].set(knuckle.x + s * d.base[0], knuckle.y + d.base[1], knuckle.z + d.base[2]).add(offset)
      tip.set(t.x, KEY_TOP + t.y + d.rad[2] * 0.9, t.z)
      solveFinger(P[0].clone(), tip, d.len, d.k, P)
    }
    const k3 = J.fingers[3][0]
    J.W.set(k3.x + s * WRIST[0], k3.y + WRIST[1], k3.z + WRIST[2])
    palmPoint(J, J.M)
    J.R.subVectors(J.fingers[5][0], J.fingers[2][0]).multiplyScalar(s).normalize()
    // a slight roll toward whichever side of the hand is pressing
    const roll = 0.18 * ((tips[4].press + tips[3].press * 0.5) - (tips[0].press + tips[1].press * 0.5)) * s
    J.R.y -= roll
    J.R.normalize()
    armIK(J.W, J.E)
    poseBones(bones, J, s)
  }
  return { group, update, side }
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
    setNotes(notes) { motion = buildMotion(notes.filter(n => n.finger >= 1)) },
    clear() { motion = buildMotion([]) },
    setSleeves(on) { sleeves = on; mats.jacket.visible = on; mats.cuff.visible = on },
    update(t, dt) {
      const pose = motion.poseAt(t)
      L.update(pose.L, dt); R.update(pose.R, dt)
    },
    get sleeves() { return sleeves },
  }
}
