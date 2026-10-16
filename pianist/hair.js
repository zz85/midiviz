// Strand hair for the Experiment #032 pianist.
//
// Concert Creator's pianist wears shoulder-length, highlighted brown hair
// with the top half tied up in a small bun on the crown. This is that groom,
// as strands:
//
//  • Guides (~700): roots scattered over the scalp of the MakeHuman head
//    (the head-weighted skin above a hairline that runs low at the nape and
//    high on the forehead). Three kinds:
//      – loose: the under layer and two face-framing pieces at the temples,
//        combed down out of the scalp and around the head, ~22–28 cm long;
//        these are simulated;
//      – tied: the top layer, drawn tight over the scalp into the bun;
//      – bun: coils wound round a small torus on the crown.
//    Tied and bun guides ride the head rigidly.
//  • Simulation (CPU, every frame): position-based dynamics on the loose
//    guides — Verlet integration under gravity, follow-the-leader length
//    constraints (inextensible, stable at any frame rate), a soft pull back
//    toward the groomed shape that fades toward the tips, and collisions with
//    an ellipsoid around the head and spheres along the neck, shoulders and
//    upper back (all following the skeleton).
//  • Rendering (GPU): the guides go into a float texture each frame; ~30k
//    child strands are instanced camera-facing ribbons whose vertex shader
//    rebuilds each strand from three neighbouring guides (Catmull-Rom along
//    the guide, barycentric across guides) plus the child's own root offset,
//    clumping toward the tips, a little frizz. Shading is Kajiya-Kay with
//    the two Marschner-style shifted highlights (a white R lobe and a
//    coloured, broader TRT lobe), wrapped diffuse, transmission when lit
//    from behind (the rim the stage light puts round her head) and a cheap
//    depth term that darkens the inner hair and the roots. Edges and tips
//    are alpha-to-coverage (the composer renders with MSAA).
//  • A thin hair-coloured cap over the scalp hides the skin between strands
//    and casts the hair's shadow onto the neck.
//
// Units: centimetres in the piano's frame.

import * as THREE from 'three'
import { cutShell, skinned, bodyIndex } from './shell.js'

const NP = 16                 // points per guide
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }

// style: 'halfup' (the reference: top half in a bun, the rest loose and
// simulated) or 'updo' (everything drawn up into the bun: no simulation).
export function createHair(ch, rig, { density = 1, color = '#5a3e2a', style = 'halfup' } = {}) {
  const rand = rng(12345)
  const headI = ch.bones.findIndex(b => b.name === 'head')
  const headBone = ch.bones[headI]
  const restHead = ch.restWorld[headI].clone(), restHeadInv = restHead.clone().invert()
  const body = ch.parts.body.geometry
  const P = body.attributes.position.array, Nn = body.attributes.normal.array
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array
  const index = bodyIndex(ch)
  const headW = i => { let w = 0; for (let k = 0; k < 4; k++) if (SI[i * 4 + k] === headI) w += SW[i * 4 + k]; return w }

  // ── Head shape (rest, world) ──
  const lo = v3(1e9, 1e9, 1e9), hi = v3(-1e9, -1e9, -1e9)
  for (let i = 0; i < P.length / 3; i++) {
    if (headW(i) < 0.95 || P[i * 3 + 1] < ch.joints['head____head'].y + 2) continue
    lo.min(v3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])); hi.max(v3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]))
  }
  const C = lo.clone().add(hi).multiplyScalar(0.5)
  const R = hi.clone().sub(lo).multiplyScalar(0.5)
  // the box top is the crown; the ellipsoid sits a little lower, with the
  // radii of the skull (the face is narrower, the back rounder)
  C.y = hi.y - R.y * 1.0
  const ER = v3(R.x * 1.08, R.y * 1.05, R.z * 0.98)
  const Cl = C.clone().applyMatrix4(restHeadInv)
  // ellipsoid in head-local terms: center Cl, radii ER (head bone axes are
  // not world axes, so collide in a frame aligned with the rest world axes)
  const restRot = new THREE.Quaternion().setFromRotationMatrix(restHead)

  // ── Scalp triangles and regions ──
  const rel = v3()
  function region(p) {
    rel.copy(p).sub(C)
    const a = Math.atan2(rel.x, -rel.z)                  // 0 = front (face is -z)
    const ny = rel.y / ER.y
    // low at the nape, round the ears, a natural (irregular) line over the forehead
    const hairline = -0.62 + 0.74 * Math.max(0, Math.cos(a)) ** 1.4 - 0.25 * Math.max(0, -Math.cos(a))
      + 0.025 * Math.sin(a * 13) + 0.015 * Math.sin(a * 31 + 1)
    if (ny < hairline) return null
    if (style === 'updo') return 'tied'
    // ears: keep the patch just above and behind them sparse
    const temple = Math.abs(a) > 0.55 && Math.abs(a) < 1.45 && ny < hairline + 0.3 && Math.cos(a) > 0
    if (temple) return 'frame'
    if (ny > -0.12 + 0.15 * Math.cos(a)) return 'tied'
    return 'loose'
  }
  const tris = { loose: [], tied: [], frame: [], all: [] }
  const _a = v3(), _b = v3(), _c = v3(), _n = v3()
  for (let t = 0; t < index.length; t += 3) {
    const i0 = index[t], i1 = index[t + 1], i2 = index[t + 2]
    if (headW(i0) < 0.9 || headW(i1) < 0.9 || headW(i2) < 0.9) continue
    _a.fromArray(P, i0 * 3); _b.fromArray(P, i1 * 3); _c.fromArray(P, i2 * 3)
    const cen = _a.clone().add(_b).add(_c).multiplyScalar(1 / 3)
    const r = region(cen)
    const any = region(_a) || region(_b) || region(_c)
    if (!any) continue
    const area = _b.clone().sub(_a).cross(_c.clone().sub(_a)).length() / 2
    tris.all.push({ i: [i0, i1, i2], area })
    if (r) tris[r].push({ i: [i0, i1, i2], area })
  }
  function sampler(list) {
    const cdf = []; let s = 0
    for (const t of list) { s += t.area; cdf.push(s) }
    return () => {
      const x = rand() * s
      let lo2 = 0, hi2 = cdf.length - 1
      while (lo2 < hi2) { const m = (lo2 + hi2) >> 1; if (cdf[m] < x) lo2 = m + 1; else hi2 = m }
      const t = list[lo2]
      let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v }
      const p = v3(), n = v3()
      for (const [k, w] of [[0, 1 - u - v], [1, u], [2, v]]) {
        p.addScaledVector(_a.fromArray(P, t.i[k] * 3), w)
        n.addScaledVector(_n.fromArray(Nn, t.i[k] * 3), w)
      }
      return { p, n: n.normalize() }
    }
  }
  // sample a region by its exact (smooth) boundary, not by whole triangles
  const sampleAll = sampler(tris.all)
  const byRegion = kind => () => { for (let i = 0; i < 400; i++) { const s = sampleAll(); if (region(s.p) === kind) return s } return sampleAll() }
  const sample = { loose: byRegion('loose'), tied: byRegion('tied'), frame: byRegion('frame') }
  const totalArea = k => tris[k].reduce((s, t) => s + t.area, 0)

  // ── Collision shapes (rest world → bone local) ──
  const spheres = []   // { bone, local: Vector3, r }
  function addSphere(boneName, worldP, r) {
    const bi = ch.bones.findIndex(b => b.name === boneName)
    spheres.push({ bone: ch.bones[bi], local: worldP.clone().applyMatrix4(ch.restWorld[bi].clone().invert()), r })
  }
  const J = ch.joints
  const mid = (a, b, t = 0.5) => J[a].clone().lerp(J[b], t)
  // neck, shoulders, upper back and chest: spheres just inside the skin
  // (radius = distance to the nearest skin vertex)
  const nearSkin = c => { let m = 1e9; for (let i = 0; i < P.length; i += 3) { const dx = P[i] - c.x, dy = P[i + 1] - c.y, dz = P[i + 2] - c.z, d = dx * dx + dy * dy + dz * dz; if (d < m) m = d } return Math.sqrt(m) }
  const auto = (bone, c, k = 0.98) => addSphere(bone, c, nearSkin(c) * k)
  auto('neck01', J['neck01____head'].clone())
  auto('neck02', mid('neck02____head', 'neck02____tail'))
  auto('neck03', mid('neck03____head', 'neck03____tail'))
  // the torso, neck and shoulders as a surface: skin points with normals,
  // each carried rigidly by its main bone, hashed into a grid every frame;
  // a hair point closer to the skin than its margin is pushed out along the
  // nearest normal
  const SURF_BONES = /^(spine0[123]|neck0[123]|clavicle|shoulder01|upperarm01|breast)/
  const surf = { bone: [], p: [], n: [] }
  {
    const boneI = new Map()
    for (let i = 0; i < P.length / 3; i += 2) {
      let bi = SI[i * 4], bw = SW[i * 4]
      for (let k = 1; k < 4; k++) if (SW[i * 4 + k] > bw) { bw = SW[i * 4 + k]; bi = SI[i * 4 + k] }
      const b = ch.bones[bi]
      if (!SURF_BONES.test(b.name)) continue
      if (P[i * 3 + 1] < J['spine03____head'].y - 4) continue
      if (!boneI.has(bi)) boneI.set(bi, ch.restWorld[bi].clone().invert())
      const inv = boneI.get(bi)
      surf.bone.push(b)
      surf.p.push(v3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(inv))
      surf.n.push(v3(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]).transformDirection(inv))
    }
  }
  const NS = surf.p.length
  const SW_ = new Float32Array(NS * 3), SN_ = new Float32Array(NS * 3)
  const CELL = 2.5, grid = new Map()
  const key = (x, y, z) => ((Math.floor(x / CELL) + 512) * 1024 + (Math.floor(y / CELL) + 512)) * 1024 + (Math.floor(z / CELL) + 512)
  function updateSurface() {
    grid.clear()
    for (let i = 0; i < NS; i++) {
      const m = surf.bone[i].matrixWorld
      tmp.copy(surf.p[i]).applyMatrix4(m); tmp.toArray(SW_, i * 3)
      tmp.copy(surf.n[i]).transformDirection(m); tmp.toArray(SN_, i * 3)
      const k = key(SW_[i * 3], SW_[i * 3 + 1], SW_[i * 3 + 2])
      let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i)
    }
  }
  function collideSurface(p, margin) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL)
    let best = -1, bd = 9
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = grid.get(((cx + dx + 512) * 1024 + (cy + dy + 512)) * 1024 + (cz + dz + 512))
      if (!l) continue
      for (const i of l) {
        const ex = p.x - SW_[i * 3], ey = p.y - SW_[i * 3 + 1], ez = p.z - SW_[i * 3 + 2]
        const d2 = ex * ex + ey * ey + ez * ez
        if (d2 < bd) { bd = d2; best = i }
      }
    }
    if (best < 0) return
    const i = best
    const d = (p.x - SW_[i * 3]) * SN_[i * 3] + (p.y - SW_[i * 3 + 1]) * SN_[i * 3 + 1] + (p.z - SW_[i * 3 + 2]) * SN_[i * 3 + 2]
    if (d < margin && d > -6) { const k = margin - d; p.x += SN_[i * 3] * k; p.y += SN_[i * 3 + 1] * k; p.z += SN_[i * 3 + 2] * k }
  }
  for (const s of ['.L', '.R']) {
    for (const t of [0.3, 0.7]) auto('clavicle' + s, mid('clavicle' + s + '____head', 'clavicle' + s + '____tail', t))
    auto('shoulder01' + s, mid('shoulder01' + s + '____head', 'shoulder01' + s + '____tail', 0.5))
    auto('upperarm01' + s, J['upperarm01' + s + '____head'].clone())
    auto('upperarm02' + s, mid('upperarm02' + s + '____head', 'upperarm02' + s + '____tail', 0.3))
  }
  // the ears: hair is tucked behind them
  for (const sx of [-1, 1]) addSphere('head', C.clone().add(v3(sx * ER.x * 0.97, -ER.y * 0.42, ER.z * 0.08)), 2.3)
  const sphW = spheres.map(() => v3())

  // ── Groom ──
  const guides = []   // { kind, rest: [Vector3 head-local]×NP, len }
  const down = v3(0, -1, 0)
  const toLocal = p => p.clone().applyMatrix4(restHeadInv)
  // push p out of the head ellipsoid (rest world) with a margin
  function outOfHead(p, margin) {
    rel.copy(p).sub(C)
    const q = v3(rel.x / (ER.x + margin), rel.y / (ER.y + margin), rel.z / (ER.z + margin))
    const l = q.length()
    if (l < 1) { q.multiplyScalar(1 / l); p.set(C.x + q.x * (ER.x + margin), C.y + q.y * (ER.y + margin), C.z + q.z * (ER.z + margin)) }
  }
  function outOfBody(p, margin) {
    for (const s of spheres) {
      const c = s.local.clone().applyMatrix4(ch.restWorld[ch.bones.indexOf(s.bone)])
      const d = p.clone().sub(c), l = d.length(), r = s.r + margin
      if (l < r) p.copy(c).addScaledVector(d, r / (l || 1))
    }
  }
  // nothing loose hangs in front of the face: below the brow and inside the
  // face's width, hair is kept behind the ears (head rest frame)
  const FACE_Z = C.z - ER.z * 0.05, FACE_Y = C.y + ER.y * 0.15
  function faceGuard(p) {
    const dx = Math.abs(p.x - C.x) / (ER.x * 1.25)
    if (p.y > FACE_Y || dx > 1) return
    const zMax = FACE_Z + ER.z * 0.25 * dx * dx      // curving back round the cheeks
    if (p.z < zMax) p.z = zMax
  }
  function growLoose(root, n, len, layer) {
    const pts = [root.clone()]
    const seg = len / (NP - 1)
    // combed down and back; in front of the ears swept back over them
    rel.copy(root).sub(C)
    const front = THREE.MathUtils.clamp(-rel.z / ER.z + 0.3, 0, 1)
    const comb = v3(0, -1, 0.42 + 0.9 * front).normalize()
    // leave the scalp almost tangent (no ledge where the layer starts)
    const dir = comb.clone().addScaledVector(n, -comb.dot(n)).normalize().addScaledVector(n, 0.3).normalize()
    // the lengths fall back, behind the shoulders (more so at the sides)
    const side = Math.min(1, Math.abs(rel.x) / ER.x)
    const fall = v3(0, -1, 0.25 + 0.45 * side).normalize()
    const p = root.clone()
    for (let k = 1; k < NP; k++) {
      dir.lerp(k < 6 ? comb : fall, 0.22 + 0.1 * Math.min(1, k / 4)).normalize()
      p.addScaledVector(dir, seg)
      outOfHead(p, 0.3 + layer)
      outOfBody(p, 0.4 + layer * 0.6)
      if (k > 1) faceGuard(p)
      // keep the segment length after the projection
      const prev = pts[k - 1], d = p.clone().sub(prev).setLength(seg)
      p.copy(prev).add(d)
      dir.copy(d).normalize()
      pts.push(p.clone())
    }
    return pts
  }
  // bun: on the crown, toward the back
  const bunDir = v3(0, 0.82, 0.57).normalize()
  const bunBase = C.clone().add(v3(bunDir.x * ER.x, bunDir.y * ER.y, bunDir.z * ER.z))
  const bunC = bunBase.clone().addScaledVector(bunDir, 2.2)
  // the head's own skin (the ellipsoid is only an approximation of it)
  const scalpV = []
  for (let i = 0; i < P.length / 3; i++) if (headW(i) > 0.9 && P[i * 3 + 1] > C.y - ER.y * 0.7) scalpV.push(i)
  function hug(p, margin) {
    let best = -1, bd = 1e9
    for (const i of scalpV) { const d = (P[i * 3] - p.x) ** 2 + (P[i * 3 + 1] - p.y) ** 2 + (P[i * 3 + 2] - p.z) ** 2; if (d < bd) { bd = d; best = i } }
    const nx = Nn[best * 3], ny = Nn[best * 3 + 1], nz = Nn[best * 3 + 2]
    const h = (p.x - P[best * 3]) * nx + (p.y - P[best * 3 + 1]) * ny + (p.z - P[best * 3 + 2]) * nz
    p.x -= nx * (h - margin); p.y -= ny * (h - margin); p.z -= nz * (h - margin)
  }
  function growTied(root) {
    // over the scalp from the root to the bun's base, hugging the head
    const pts = []
    const d0 = root.clone().sub(C), d1 = bunBase.clone().addScaledVector(bunDir, 0.5).sub(C)
    for (let k = 0; k < NP; k++) {
      const t = k / (NP - 1)
      const d = d0.clone().lerp(d1, t)
      const nd = v3(d.x / ER.x, d.y / ER.y, d.z / ER.z)
      const l = nd.length()
      // radius: from the root out to the hair surface (a little proud of the
      // skull), gathering into the bun at the end
      const margin = 0.28 + 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.2))
      const q = nd.multiplyScalar(1 / l)
      const p = v3(C.x + q.x * (ER.x + margin), C.y + q.y * (ER.y + margin), C.z + q.z * (ER.z + margin))
      if (k === 0) p.copy(root)
      // hug the skull, then lift into the bun over the last stretch
      else if (t < 0.9) { const pe = p.clone(); hug(p, margin); hug(p, margin); p.lerp(pe, THREE.MathUtils.smoothstep(t, 0.6, 0.9)) }
      pts.push(p)
    }
    return pts
  }
  function growBun(i, n) {
    // a coil round a small torus around bunDir
    const ax = bunDir, u = v3(1, 0, 0).addScaledVector(ax, -ax.x).normalize(), w = ax.clone().cross(u)
    const th0 = (i / n) * Math.PI * 2 + rand() * 0.3, span = Math.PI * (1.1 + rand() * 0.6)
    const R1 = 1.9 + rand() * 0.5, r1 = 1.1 + rand() * 0.7, ps0 = rand() * 6.3, twist = 1.4 + rand() * 0.6
    const pts = []
    for (let k = 0; k < NP; k++) {
      const t = k / (NP - 1), th = th0 + span * t, ps = ps0 + th * twist
      const ring = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th))
      const p = bunC.clone().addScaledVector(ring, R1 + r1 * Math.cos(ps)).addScaledVector(ax, r1 * Math.sin(ps) * 0.9)
      pts.push(p)
    }
    return pts
  }

  const G = style === 'updo' ? { loose: 0, frame: 0, tied: 420, bun: 90 } : { loose: 300, frame: 40, tied: 220, bun: 70 }
  const roots = { loose: [], frame: [], tied: [] }
  function poisson(kind, n, minD) {
    const out = []
    for (let tries = 0; out.length < n && tries < n * 40; tries++) {
      const s = sample[kind]()
      if (out.some(o => o.p.distanceToSquared(s.p) < minD * minD)) continue
      out.push(s)
    }
    return out
  }
  for (const kind of ['loose', 'frame', 'tied']) {
    const minD = Math.sqrt(totalArea(kind) / G[kind]) * 0.7
    roots[kind] = poisson(kind, G[kind], minD)
    for (const r of roots[kind]) {
      rel.copy(r.p).sub(C)
      let pts
      if (kind === 'tied') pts = growTied(r.p)
      else {
        // longer at the back, shorter round the face; the higher roots lie on top
        const back = Math.max(0, rel.z / ER.z)
        const len = kind === 'frame' ? 24 + rand() * 4 : 29 + 4 * back + rand() * 4
        const layer = 0.1 + 0.45 * THREE.MathUtils.clamp((rel.y / ER.y + 0.7) / 0.8, 0, 1)
        pts = growLoose(r.p, r.n, len, layer)
      }
      guides.push({ kind, rest: pts.map(toLocal), root: r.p.clone(), len: pts[0].distanceTo(pts[1]) })
    }
  }
  for (let i = 0; i < G.bun; i++) { const pts = growBun(i, G.bun); guides.push({ kind: 'bun', rest: pts.map(toLocal), root: pts[0].clone() }) }
  const NG = guides.length

  // ── Simulation state ──
  const X = new Float32Array(NG * NP * 3), Xp = new Float32Array(NG * NP * 3)
  const segLen = new Float32Array(NG * NP)
  const loose = guides.map(g => g.kind === 'loose' || g.kind === 'frame')
  guides.forEach((g, gi) => { for (let k = 1; k < NP; k++) segLen[gi * NP + k] = g.rest[k].distanceTo(g.rest[k - 1]) })
  const M = new THREE.Matrix4(), Minv = new THREE.Matrix4(), Q = new THREE.Quaternion()
  const tmp = v3(), tmp2 = v3(), tgt = v3()
  let first = true
  function headMatrix() { return M.copy(headBone.matrixWorld) }
  function placeRigid(gi) {
    const g = guides[gi]
    for (let k = 0; k < NP; k++) { tmp.copy(g.rest[k]).applyMatrix4(M); tmp.toArray(X, (gi * NP + k) * 3); tmp.toArray(Xp, (gi * NP + k) * 3) }
  }
  // head ellipsoid now: rest-world-aligned frame carried by the head's motion
  const headDelta = new THREE.Matrix4(), headDeltaInv = new THREE.Matrix4()
  function collide(p, margin) {
    // ellipsoid
    tmp2.copy(p).applyMatrix4(headDeltaInv).sub(C)
    const ex = ER.x + margin, ey = ER.y + margin, ez = ER.z + margin
    const qx = tmp2.x / ex, qy = tmp2.y / ey, qz = tmp2.z / ez, l = Math.hypot(qx, qy, qz)
    if (l < 1) { tmp2.set(qx / l * ex, qy / l * ey, qz / l * ez).add(C).applyMatrix4(headDelta); p.copy(tmp2) }
    collideSurface(p, 0.8 + margin * 0.6)   // (clear of the dress, ~0.5 cm proud of the skin)
    tmp2.copy(p).applyMatrix4(headDeltaInv); const pz = tmp2.z
    faceGuard(tmp2); if (tmp2.z !== pz) p.copy(tmp2.applyMatrix4(headDelta))
    for (let s = 0; s < spheres.length; s++) {
      const c = sphW[s], r = spheres[s].r + margin * 0.6
      const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z, d2 = dx * dx + dy * dy + dz * dz
      if (d2 < r * r) { const d = Math.sqrt(d2) || 1; p.set(c.x + dx / d * r, c.y + dy / d * r, c.z + dz / d * r) }
    }
  }
  const api = { simulate: true }
  const GRAV = -980
  const uaL = ch.byName['upperarm01.L'], uaR = ch.byName['upperarm01.R']
  let tuckZ = 0, tuckY = 0
  function step(dt) {
    headMatrix()
    headDelta.multiplyMatrices(M, restHeadInv); headDeltaInv.copy(headDelta).invert()
    Q.setFromRotationMatrix(M)
    spheres.forEach((s, i) => sphW[i].copy(s.local).applyMatrix4(s.bone.matrixWorld))
    // styling: below the shoulders the lengths are kept behind them (the
    // reference wears it down the back; bowed over the keys it would fall forward)
    tuckZ = 0.5 * (uaL.matrixWorld.elements[14] + uaR.matrixWorld.elements[14]) + 2
    tuckY = 0.5 * (uaL.matrixWorld.elements[13] + uaR.matrixWorld.elements[13]) + 5
    updateSurface()
    for (let gi = 0; gi < NG; gi++) {
      if (!loose[gi] || first) { placeRigid(gi); continue }
      if (!api.simulate) { placeRigid(gi); continue }
      const g = guides[gi], o = gi * NP
      // pinned root and first segment
      for (let k = 0; k < 2; k++) { tmp.copy(g.rest[k]).applyMatrix4(M); tmp.toArray(X, (o + k) * 3); tmp.toArray(Xp, (o + k) * 3) }
      const sub = 2, h = dt / sub
      for (let s = 0; s < sub; s++) {
        for (let k = 2; k < NP; k++) {
          const j = (o + k) * 3
          const x = X[j], y = X[j + 1], z = X[j + 2]
          const damp = 0.975
          X[j] += (x - Xp[j]) * damp; X[j + 1] += (y - Xp[j + 1]) * damp + GRAV * h * h; X[j + 2] += (z - Xp[j + 2]) * damp
          Xp[j] = x; Xp[j + 1] = y; Xp[j + 2] = z
        }
        for (let k = 2; k < NP; k++) {
          const j = (o + k) * 3, jp = j - 3
          tmp.fromArray(X, j)
          const bx = tmp.x, by = tmp.y, bz = tmp.z
          // pull toward the groomed shape, relative to the parent point
          const stiff = 0.12 * (1 - k / NP) ** 2
          tgt.copy(g.rest[k]).sub(g.rest[k - 1]).applyQuaternion(Q).add(tmp2.fromArray(X, jp))
          tmp.lerp(tgt, stiff)
          // follow the leader: exact length from the parent
          tmp2.fromArray(X, jp)
          tmp.sub(tmp2).setLength(segLen[o + k]).add(tmp2)
          // collisions last (the margin grows down the strand: hair has volume)
          if (k > 4 && tmp.y < tuckY && tmp.z < tuckZ) tmp.z += Math.min(tuckZ - tmp.z, 0.35)
          collide(tmp, 0.35 + 0.05 * k)
          // most of what the constraints moved does not become velocity
          // (the follow-the-leader damping of Müller et al. 2012, in Verlet form)
          Xp[j] += (tmp.x - bx) * 0.85; Xp[j + 1] += (tmp.y - by) * 0.85; Xp[j + 2] += (tmp.z - bz) * 0.85
          tmp.toArray(X, j)
        }
      }
    }
    first = false
  }

  // ── Render: children instanced ribbons ──
  const tex = new THREE.DataTexture(new Float32Array(NP * NG * 4), NP, NG, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  function upload() {
    const d = tex.image.data
    for (let i = 0; i < NG * NP; i++) { d[i * 4] = X[i * 3]; d[i * 4 + 1] = X[i * 3 + 1]; d[i * 4 + 2] = X[i * 3 + 2]; d[i * 4 + 3] = 1 }
    tex.needsUpdate = true
  }
  const SEG = 22
  const strip = new THREE.BufferGeometry()
  {
    const t = [], side = [], idx = []
    for (let k = 0; k <= SEG; k++) for (const s of [-1, 1]) { t.push(k / SEG); side.push(s) }
    for (let k = 0; k < SEG; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    strip.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1))
    strip.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
    strip.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3))
    strip.setIndex(idx)
  }
  const byKind = { loose: [], frame: [], tied: [], bun: [] }
  guides.forEach((g, i) => byKind[g.kind].push(i))
  const guideRootL = guides.map(g => g.rest[0])
  function nearest3(pL, list) {
    const best = [[-1, 1e9], [-1, 1e9], [-1, 1e9]]
    for (const gi of list) {
      const d = guideRootL[gi].distanceToSquared(pL)
      if (d < best[2][1]) { best[2] = [gi, d]; best.sort((a, b) => a[1] - b[1]) }
    }
    const w = best.map(([, d]) => 1 / (Math.sqrt(d) + 0.15) ** 2)
    const s = w.reduce((a, b) => a + b, 0)
    return { g: best.map(b => Math.max(0, b[0])), w: w.map(x => x / s) }
  }
  let mesh = null
  function buildChildren(dens) {
    const counts = style === 'updo' ? { loose: 0, frame: 0, tied: 30000, bun: 5000 } : { loose: 26000, frame: 2500, tied: 14000, bun: 3500 }
    const aG = [], aW = [], aO = [], aR = []
    for (const kind of Object.keys(counts)) {
      const n = Math.round(counts[kind] * dens)
      for (let c = 0; c < n; c++) {
        if (kind === 'bun') {
          const gi = byKind.bun[c % byKind.bun.length]
          aG.push(gi, gi, gi); aW.push(1, 0, 0)
          const o = v3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.9)
          aO.push(o.x, o.y, o.z)
        } else {
          const s = sample[kind](), pL = toLocal(s.p.addScaledVector(s.n, 0.05))
          const nb = nearest3(pL, byKind[kind])
          const base = v3()
          for (let k = 0; k < 3; k++) base.addScaledVector(guideRootL[nb.g[k]], nb.w[k])
          const o = pL.sub(base)
          aG.push(...nb.g); aW.push(...nb.w); aO.push(o.x, o.y, o.z)
        }
        // random: width, colour variation, frizz phase, kind (0 loose, 1 tied, 2 bun)
        aR.push(rand(), rand(), rand(), kind === 'tied' ? 1 : kind === 'bun' ? 2 : 0)
      }
    }
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = strip.index
    for (const k of ['aT', 'aSide', 'position']) geo.setAttribute(k, strip.attributes[k])
    geo.setAttribute('aG', new THREE.InstancedBufferAttribute(new Float32Array(aG), 3))
    geo.setAttribute('aW', new THREE.InstancedBufferAttribute(new Float32Array(aW), 3))
    geo.setAttribute('aO', new THREE.InstancedBufferAttribute(new Float32Array(aO), 3))
    geo.setAttribute('aR', new THREE.InstancedBufferAttribute(new Float32Array(aR), 4))
    geo.instanceCount = aR.length / 4
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo }
    return geo
  }

  const MAXL = 4
  const uniforms = {
    uGuides: { value: tex }, uNP: { value: NP },
    uHeadRot: { value: new THREE.Matrix3() },
    uWidth: { value: 0.035 },
    uRoot: { value: new THREE.Color() }, uTip: { value: new THREE.Color() }, uHi: { value: new THREE.Color(0xc9a27a) },
    uLightPos: { value: Array.from({ length: MAXL }, () => v3()) },
    uLightCol: { value: Array.from({ length: MAXL }, () => v3()) },
    uLightDir: { value: Array.from({ length: MAXL }, () => v3()) },
    uLightCone: { value: Array.from({ length: MAXL }, () => new THREE.Vector2()) },
    uAmbient: { value: new THREE.Color(0x1a1410) },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      precision highp float;
      precision highp sampler2D;
      uniform sampler2D uGuides; uniform float uNP; uniform mat3 uHeadRot; uniform float uWidth;
      attribute float aT; attribute float aSide; attribute vec3 aG; attribute vec3 aW; attribute vec3 aO; attribute vec4 aR;
      varying vec3 vT; varying vec3 vP; varying float vAcross; varying float vAlong; varying vec4 vR; varying vec3 vN;
      vec3 gp(float g, float i) { return texelFetch(uGuides, ivec2(int(clamp(i, 0.0, uNP - 1.0)), int(g)), 0).xyz; }
      vec3 cr(float g, float u) {
        float i = floor(u), f = u - i;
        vec3 p0 = gp(g, i - 1.0), p1 = gp(g, i), p2 = gp(g, i + 1.0), p3 = gp(g, i + 2.0);
        if (i < 1.0) p0 = 2.0 * p1 - p2;
        if (i + 2.0 > uNP - 1.0) p3 = 2.0 * p2 - p1;
        float f2 = f * f, f3 = f2 * f;
        return 0.5 * ((2.0 * p1) + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f3);
      }
      vec3 strand(float t) {
        float u = t * (uNP - 1.0);
        vec3 p = cr(aG.x, u) * aW.x + cr(aG.y, u) * aW.y + cr(aG.z, u) * aW.z;
        float kind = aR.w;
        // clump toward the tips (loose), gather into the bun (tied)
        float keep = kind < 0.5 ? 1.0 - 0.55 * pow(t, 1.3) : kind < 1.5 ? 1.0 - 0.85 * t : 1.0;
        vec3 o = uHeadRot * aO * keep;
        // a little frizz and waviness along loose hair
        if (kind < 0.5) {
          float ph = aR.z * 40.0;
          o += uHeadRot * vec3(sin(t * 23.0 + ph), cos(t * 17.0 + ph * 1.3), sin(t * 29.0 + ph * 0.7)) * 0.12 * t;
        }
        return p + o;
      }
      void main() {
        float t = aT;
        // shorter children here and there
        float len = aR.w < 0.5 ? 0.72 + 0.28 * pow(aR.x, 0.6) : 1.0;
        t *= len;
        vec3 p = strand(t);
        vec3 pn = strand(min(t + 0.02, 1.0)), pb = strand(max(t - 0.02, 0.0));
        vec3 T = normalize(pn - pb);
        vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
        vec3 V = normalize(cameraPosition - wp);
        vec3 S = normalize(cross(T, V));
        float w = uWidth * (0.7 + 0.6 * aR.x) * (1.0 - 0.8 * pow(aT, 1.6));
        // keep at least ~0.7 px wide so strands do not alias away
        vec4 cv = viewMatrix * vec4(wp, 1.0);
        float px = -cv.z * 0.0012;
        w = max(w, px);
        wp += S * aSide * w;
        vT = T; vP = wp; vAcross = aSide; vAlong = aT; vR = aR;
        vN = normalize(cross(S, T));
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      #define MAXL ${MAXL}
      uniform vec3 uRoot, uTip, uHi, uAmbient;
      uniform vec3 uLightPos[MAXL]; uniform vec3 uLightCol[MAXL]; uniform vec3 uLightDir[MAXL]; uniform vec2 uLightCone[MAXL];
      varying vec3 vT; varying vec3 vP; varying float vAcross; varying float vAlong; varying vec4 vR; varying vec3 vN;
      void main() {
        vec3 T = normalize(vT);
        vec3 V = normalize(cameraPosition - vP);
        // round the ribbon into a fibre: normal across it
        float a = vAcross;
        vec3 N = normalize(vN * sqrt(max(0.0, 1.0 - a * a)) + normalize(cross(T, V)) * a);
        // colour: dark roots, lighter lengths, sun-bleached highlights on some strands
        float hi = smoothstep(0.5, 1.0, vR.y) * smoothstep(0.1, 0.8, vAlong);
        vec3 base = mix(uRoot, uTip, smoothstep(0.0, 0.9, vAlong));
        base = mix(base, uHi, hi * 0.5);
        base *= 0.96 + 0.08 * vR.x;
        // self-shadowing stand-in: inner and root hair darker
        float occ = vR.w > 0.5 ? (vR.w > 1.5 ? 0.82 : 0.92) : mix(0.8, 1.0, smoothstep(0.0, 0.25, vAlong));
        vec3 col = uAmbient * base * occ * 2.0;
        for (int i = 0; i < MAXL; i++) {
          vec3 L = uLightPos[i] - vP; float d = length(L); L /= d;
          float cosd = dot(-L, uLightDir[i]);
          float cone = smoothstep(uLightCone[i].x, uLightCone[i].y, cosd);
          if (cone <= 0.0) continue;
          vec3 E = uLightCol[i] * cone;
          float TL = dot(T, L), TV = dot(T, V);
          float sinTL = sqrt(max(0.0, 1.0 - TL * TL));
          // Kajiya-Kay diffuse, wrapped a little
          float diff = mix(0.25, 1.0, sinTL) * clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
          // two shifted lobes (Marschner R / TRT): cone around the fibre
          float s1 = TL + 0.12, s2 = TL - 0.1;
          float h1 = sqrt(max(0.0, 1.0 - s1 * s1)) * sqrt(max(0.0, 1.0 - TV * TV)) - s1 * TV;
          float h2 = sqrt(max(0.0, 1.0 - s2 * s2)) * sqrt(max(0.0, 1.0 - TV * TV)) - s2 * TV;
          float spec1 = pow(max(h1, 0.0), 90.0) * 0.55;
          float spec2 = pow(max(h2, 0.0), 22.0) * 0.5;
          // transmission: light from behind glows through the strands (TT)
          float tt = pow(max(0.0, dot(-L, V)), 6.0) * 0.9;
          col += E * occ * (base * diff + vec3(spec1) + base * 1.6 * spec2 * (0.6 + hi) + base * 1.8 * tt);
        }
        // coverage: soft across the ribbon, thinning at the tips
        float cov = (1.0 - smoothstep(0.45, 1.0, abs(a))) * (1.0 - smoothstep(0.6, 1.0, vAlong)) * (vR.w > 1.5 ? 1.0 : smoothstep(0.0, vR.w > 0.5 ? 0.07 : 0.05, vAlong) * 0.85 + 0.15);
        gl_FragColor = vec4(col, cov);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const geo = buildChildren(density)
  mesh = new THREE.Mesh(geo, material)
  mesh.frustumCulled = false
  mesh.name = 'hair'

  // hair-coloured cap over the scalp (hides skin between strands, casts the
  // hair's shadow): the head skin above the hairline, pushed out a little
  const cap = (() => {
    const shell = cutShell(ch, v => headW(v) > 0.9 && !!region(_a.fromArray(P, v * 3)), { gap: 0.1, offset: 0.15, iterations: 4, edgeIterations: 40 })
    return skinned(ch, shell.geometry, new THREE.MeshStandardMaterial({ color: 0x1c120b, roughness: 0.75 }))
  })()

  // the hair throws its shadow too: a coarse shadow-only proxy of the loose
  // guides (tubes rebuilt each frame would be costly; a cloud of the guide
  // points as small spheres is enough at shadow-map resolution)
  const shadowGeo = new THREE.SphereGeometry(0.9, 6, 4)
  const shadowMesh = new THREE.InstancedMesh(shadowGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), NG * 4)
  shadowMesh.castShadow = true; shadowMesh.frustumCulled = false
  const shadowList = []
  guides.forEach((g, gi) => { if (g.kind !== 'tied') for (let k = 3; k < NP; k += 3) shadowList.push(gi * NP + k) })
  shadowMesh.count = shadowList.length
  const _mm = new THREE.Matrix4()

  const object = new THREE.Group()
  object.add(mesh, shadowMesh)
  object.name = 'hair'

  function setColor(hex) {
    const c = new THREE.Color(hex)
    uniforms.uRoot.value.copy(c).multiplyScalar(0.35)
    uniforms.uTip.value.copy(c).lerp(new THREE.Color(0x9c7550), 0.3)
    cap.material.color.copy(c).multiplyScalar(0.32)
  }
  setColor(color)

  // lights the shader knows about: the scene's spot lights (up to MAXL)
  const _lp = v3(), _lt = v3()
  function updateLights() {
    const scene = mesh.parent?.parent
    if (!scene) return
    const lights = []
    scene.traverse(o => { if (o.isSpotLight && o.visible && o.intensity > 0) lights.push(o) })
    lights.sort((a, b) => b.intensity - a.intensity)
    for (let i = 0; i < MAXL; i++) {
      const l = lights[i]
      if (!l) { uniforms.uLightCol.value[i].set(0, 0, 0); continue }
      l.getWorldPosition(_lp); l.target.getWorldPosition(_lt)
      uniforms.uLightPos.value[i].copy(_lp)
      uniforms.uLightDir.value[i].copy(_lt).sub(_lp).normalize()
      uniforms.uLightCol.value[i].set(l.color.r, l.color.g, l.color.b).multiplyScalar(l.intensity * 0.11)
      uniforms.uLightCone.value[i].set(Math.cos(l.angle), Math.cos(l.angle * (1 - l.penumbra)))
    }
  }

  Object.assign(api, {
    kind: 'strands', style, object, guides, cap, X, spheres, sphW,
    penetration() { let n = 0, m = 0; for (let i = 0; i < NG * NP; i++) { if (!loose[Math.floor(i / NP)]) continue; m++; for (let q = 0; q < spheres.length; q++) { const c = sphW[q]; if ((X[i * 3] - c.x) ** 2 + (X[i * 3 + 1] - c.y) ** 2 + (X[i * 3 + 2] - c.z) ** 2 < spheres[q].r ** 2 * 0.9) { n++; break } } } return n + ' / ' + m },
    get count() { return mesh.geometry.instanceCount },
    setColor,
    setDensity(d) { buildChildren(d) },
    dispose() {
      object.removeFromParent(); cap.removeFromParent()
      mesh.geometry.dispose(); material.dispose(); tex.dispose(); cap.geometry.dispose(); cap.material.dispose(); shadowGeo.dispose()
    },
    /** run the simulation for a while without rendering (after a pose jump) */
    settle(seconds = 4) { for (let i = 0; i < seconds * 60; i++) step(1 / 60) },
    update(dt) {
      step(Math.min(dt, 1 / 30))
      upload()
      uniforms.uHeadRot.value.setFromMatrix4(M)
      for (let i = 0; i < shadowList.length; i++) {
        const j = shadowList[i] * 3
        _mm.makeTranslation(X[j], X[j + 1], X[j + 2]); shadowMesh.setMatrixAt(i, _mm)
      }
      shadowMesh.instanceMatrix.needsUpdate = true
      cap.visible = object.visible
      updateLights()
    },
  })
  return api
}

// A hair-coloured scalp (the skin above the hairline, pushed out a little),
// for the mesh hair styles: no skin shows between their cards.
// hairGeo (mesh hair): the scalp only where the cards lie over it (within
// 1.2 cm), so a style that leaves the forehead bare (a ponytail pulled back)
// does not get a dark band of scalp below its hairline
// Sample each hair triangle (corners, edges, centre and more for big ones)
// and keep the points whose texel is opaque. Without a readable texture every
// vertex counts.
function opaqueHairPoints(geo, map) {
  const P = geo.attributes.position.array
  const img = map?.image
  if (!img || !geo.attributes.uv) return P
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H)
  const A = g.getImageData(0, 0, W, H).data
  const UV = geo.attributes.uv.array, idx = geo.index ? geo.index.array : null
  const nT = (idx ? idx.length : P.length / 3) / 3, out = []
  const flipY = map.flipY !== false
  const N = 4
  for (let t = 0; t < nT; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, cc = idx ? idx[t * 3 + 2] : t * 3 + 2
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
      const u = i / N, v = j / N, w = 1 - u - v
      const tu = UV[a * 2] * w + UV[b * 2] * u + UV[cc * 2] * v, tv = UV[a * 2 + 1] * w + UV[b * 2 + 1] * u + UV[cc * 2 + 1] * v
      const px = Math.min(W - 1, Math.max(0, Math.floor((tu - Math.floor(tu)) * W)))
      const fy = tv - Math.floor(tv), py = Math.min(H - 1, Math.max(0, Math.floor((flipY ? 1 - fy : fy) * H)))
      if (A[(py * W + px) * 4 + 3] < 160) continue
      for (let k = 0; k < 3; k++) out.push(P[a * 3 + k] * w + P[b * 3 + k] * u + P[cc * 3 + k] * v)
    }
  }
  return out.length ? out : P
}

export function hairCap(ch, color = 0x1c120b, hairGeo = null, hairMap = null) {
  const headI = ch.bones.findIndex(b => b.name === 'head')
  const body = ch.parts.body.geometry
  const P = body.attributes.position.array
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array
  const headW = i => { let w = 0; for (let k = 0; k < 4; k++) if (SI[i * 4 + k] === headI) w += SW[i * 4 + k]; return w }
  const lo = v3(1e9, 1e9, 1e9), hi = v3(-1e9, -1e9, -1e9)
  for (let i = 0; i < P.length / 3; i++) {
    if (headW(i) < 0.95 || P[i * 3 + 1] < ch.joints['head____head'].y + 2) continue
    lo.min(v3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])); hi.max(v3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]))
  }
  const C = lo.clone().add(hi).multiplyScalar(0.5), R = hi.clone().sub(lo).multiplyScalar(0.5)
  C.y = hi.y - R.y
  const ERy = R.y * 1.05
  let nearHair = null
  const REACH = 0.7
  if (hairGeo) {
    // (measured to the cards' own points, not cells: the cards fade out at
    // the hairline, so the scalp stops a little inside it)
    // Points where the cards are actually opaque: the front cards run to the
    // old hairline but their texture is transparent there, so their vertices
    // alone would keep the band.
    const HP = opaqueHairPoints(hairGeo, hairMap), CELL = 1.5, R2 = REACH * REACH, grid = new Map(), k = (x, y, z) => `${x},${y},${z}`
    for (let i = 0; i < HP.length / 3; i++) { const key = k(Math.floor(HP[i * 3] / CELL), Math.floor(HP[i * 3 + 1] / CELL), Math.floor(HP[i * 3 + 2] / CELL)); let l = grid.get(key); if (!l) grid.set(key, l = []); l.push(i) }
    nearHair = v => {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const i of grid.get(k(cx + dx, cy + dy, cz + dz)) || []) if ((HP[i * 3] - x) ** 2 + (HP[i * 3 + 1] - y) ** 2 + (HP[i * 3 + 2] - z) ** 2 < R2) return true
      return false
    }
  }
  const shell = cutShell(ch, v => {
    if (headW(v) < 0.9) return false
    if (nearHair && !nearHair(v)) return false
    const x = P[v * 3] - C.x, y = P[v * 3 + 1] - C.y, z = P[v * 3 + 2] - C.z
    const a = Math.atan2(x, -z)
    return y / ERy > -0.62 + 0.74 * Math.max(0, Math.cos(a)) ** 1.4 - 0.25 * Math.max(0, -Math.cos(a))
  }, { gap: 0.1, offset: 0.15, iterations: 4, edgeIterations: 40, ...(hairGeo ? { fillHoles: 200, dropIslands: 40, smoothCut: 4 } : {}) })
  return skinned(ch, shell.geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))
}
