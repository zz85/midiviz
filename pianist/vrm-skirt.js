// Cloth skirt for a VRM pianist's concert dress (Experiment #032, ?model=vroida).
//
// The dress (pianist/build/build-vroid-dress.mjs) is a SkinnedMesh on the
// VRM's own bones, its skirt weighted to the hips and thighs so that, seated,
// it already lies roughly over the lap. This makes the skirt cloth:
//
//  • Guides: the skirt vertices (below the waist) clustered on a 2.5 cm grid
//    in the bind pose, one particle per cell at the vertex nearest its
//    centroid. Edges of the mesh become stretch constraints (firm against
//    stretching, soft against bunching), two hops along them a weak bend
//    constraint, and each particle is tied to the occupied neighbouring
//    cells, so the front, sides and back move as one sheet.
//  • Targets: every frame the whole dress is skinned on the CPU; a particle's
//    target is its vertex's skinned position. Particles at the waistband are
//    pinned there; below, each is pulled toward its target less and less
//    with how far it hangs (so the hem swings and settles, the hips carry
//    the top).
//  • Collisions: capsules for the thighs (hip to knee) and shins, a capsule
//    across the hips, measured from her body skin, and the bench top.
//  • Rendering: a plain Mesh with the dress's own MToon materials (and
//    outline) takes the skinned positions plus the blended offsets of each
//    vertex's nearest guides (up to four); normals are recomputed. The
//    SkinnedMesh is hidden while the simulation runs.
//
// Verlet integration, six constraint iterations (collisions after each of the
// last two), a few hundred particles: about a millisecond a frame.
//
// Units: centimetres in the piano's frame (the world).

import * as THREE from 'three'

const G = 2.5           // guide spacing (cm)
// clearance over the legs: the guides are 2.5 cm apart and the cloth between
// them is interpolated, so it needs room to stay outside a curved thigh
const MARGIN = 1.6

export function createSkirtCloth({ mesh, body, H, waistDrop = 3 }) {
  const geo = mesh.geometry
  const NV = geo.attributes.position.count
  const I = geo.index.array
  const v3 = () => new THREE.Vector3()

  // world scale of the bind space (the model is scaled from metres to cm)
  mesh.updateMatrixWorld(true)
  const scale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld).x
  // bind-pose height of the hips (mesh bind space, metres)
  const hipIdx = mesh.skeleton.bones.findIndex(b => b === H.hips)
  const hipBind = new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[hipIdx].clone().invert())
  const P0 = geo.attributes.position
  const waistY = hipBind.y + 0.02, pinY = waistY - waistDrop / scale

  // ── guides ──
  const gk = (x, y, z) => ((Math.floor(x / G) + 512) * 1024 + Math.floor(y / G) + 512) * 1024 + Math.floor(z / G) + 512
  const cells = new Map(), cellOf = new Int32Array(NV).fill(-1)
  for (let v = 0; v < NV; v++) {
    if (P0.getY(v) > waistY) continue
    const x = P0.getX(v) * scale, y = P0.getY(v) * scale, z = P0.getZ(v) * scale, k = gk(x, y, z)
    let c = cells.get(k); if (!c) cells.set(k, c = { id: cells.size, k, verts: [], cx: 0, cy: 0, cz: 0 })
    c.verts.push(v); c.cx += x; c.cy += y; c.cz += z; cellOf[v] = c.id
  }
  const N = cells.size
  const rep = new Int32Array(N), rest = new Float32Array(N * 3), byKey = new Map()
  for (const c of cells.values()) {
    const n = c.verts.length, cx = c.cx / n, cy = c.cy / n, cz = c.cz / n
    let best = c.verts[0], bd = Infinity
    for (const v of c.verts) { const d = (P0.getX(v) * scale - cx) ** 2 + (P0.getY(v) * scale - cy) ** 2 + (P0.getZ(v) * scale - cz) ** 2; if (d < bd) { bd = d; best = v } }
    rep[c.id] = best
    rest[c.id * 3] = P0.getX(best) * scale; rest[c.id * 3 + 1] = P0.getY(best) * scale; rest[c.id * 3 + 2] = P0.getZ(best) * scale
    byKey.set(c.k, c.id)
  }
  const dist = (a, b) => Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2])
  const nb = Array.from({ length: N }, () => new Map())
  const link = (a, b, k) => { if (a < 0 || b < 0 || a === b) return; if ((nb[a].get(b) || 0) < k) { nb[a].set(b, k); nb[b].set(a, k) } }
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) link(cellOf[I[t + e]], cellOf[I[t + (e + 1) % 3]], 1)
  for (const c of cells.values()) {
    const x = rest[c.id * 3], y = rest[c.id * 3 + 1], z = rest[c.id * 3 + 2]
    for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) { const o = byKey.get(gk(x + dx * G, y + dy * G, z + dz * G)); if (o !== undefined) link(c.id, o, 0.7) }
  }
  const cons = []
  for (let a = 0; a < N; a++) for (const [b, k] of nb[a]) if (a < b) cons.push([a, b, dist(a, b), k, k * 0.25])
  for (let b = 0; b < N; b++) {
    const l = [...nb[b]].filter(([, k]) => k === 1).map(([a]) => a)
    for (const a of l) {
      let best = -1, bc = -0.75
      const ux = rest[a * 3] - rest[b * 3], uy = rest[a * 3 + 1] - rest[b * 3 + 1], uz = rest[a * 3 + 2] - rest[b * 3 + 2], ul = Math.hypot(ux, uy, uz) || 1
      for (const c of l) {
        if (c === a) continue
        const vx = rest[c * 3] - rest[b * 3], vy = rest[c * 3 + 1] - rest[b * 3 + 1], vz = rest[c * 3 + 2] - rest[b * 3 + 2]
        const cs = (ux * vx + uy * vy + uz * vz) / (ul * (Math.hypot(vx, vy, vz) || 1))
        if (cs < bc) { bc = cs; best = c }
      }
      if (best > a) cons.push([a, best, dist(a, best), 0.1, 0.1])
    }
  }
  const NC = cons.length
  const CI = new Int32Array(NC * 2), CL = new Float32Array(NC), CK = new Float32Array(NC), CC = new Float32Array(NC)
  cons.forEach(([a, b, l, k, c], i) => { CI[i * 2] = a; CI[i * 2 + 1] = b; CL[i] = l; CK[i] = k; CC[i] = c })
  const pinned = new Uint8Array(N), PULL = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const hang = (pinY * scale - rest[i * 3 + 1])            // cm below the pin line
    if (hang <= 0) pinned[i] = 1
    PULL[i] = 0.3 * Math.exp(-Math.max(0, hang) / 6) + 0.02
  }

  // ── per-vertex guide weights (skirt vertices; the bodice follows the skin) ──
  const gi = new Int32Array(NV * 4).fill(-1), gw = new Float32Array(NV * 4)
  for (let v = 0; v < NV; v++) {
    if (cellOf[v] < 0) continue
    const x = P0.getX(v) * scale, y = P0.getY(v) * scale, z = P0.getZ(v) * scale, found = []
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const o = byKey.get(gk(x + dx * G, y + dy * G, z + dz * G)); if (o === undefined) continue
      const d = Math.hypot(rest[o * 3] - x, rest[o * 3 + 1] - y, rest[o * 3 + 2] - z)
      found.push([o, Math.max(0, 1 - d / (1.8 * G)) ** 2 + (o === cellOf[v] ? 1e-3 : 0)])
    }
    found.sort((a, b) => b[1] - a[1])
    const top = found.slice(0, 4), s = top.reduce((a, f) => a + f[1], 0) || 1
    top.forEach(([o, w], k) => { gi[v * 4 + k] = o; gw[v * 4 + k] = w / s })
  }

  // ── the rendered mesh ──
  const out = new THREE.BufferGeometry()
  const OP = new Float32Array(NV * 3)
  out.setAttribute('position', new THREE.BufferAttribute(OP, 3).setUsage(THREE.DynamicDrawUsage))
  out.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(NV * 3), 3).setUsage(THREE.DynamicDrawUsage))
  if (geo.attributes.uv) out.setAttribute('uv', geo.attributes.uv)
  out.setIndex(geo.index)
  for (const g of geo.groups) out.addGroup(g.start, g.count, g.materialIndex)
  const cloth = new THREE.Mesh(out, mesh.material)
  cloth.name = 'concert-dress-cloth'
  cloth.castShadow = cloth.receiveShadow = true
  cloth.frustumCulled = false
  cloth.visible = false
  cloth.matrixAutoUpdate = false     // positions are written in world space

  // ── collision shapes, measured from her body skin ──
  const legs = ['left', 'right'].map(s => ({ up: H[s + 'UpperLeg'], low: H[s + 'LowerLeg'], foot: H[s + 'Foot'], r: 6, rs: 4 }))
  const caps = []       // { a, b, r } world, rebuilt every frame
  function measure() {
    const p = v3(), a = v3(), b = v3()
    for (const L of legs) {
      L.up.getWorldPosition(a); L.low.getWorldPosition(b)
      const ax = b.clone().sub(a), len = ax.length(); ax.normalize()
      const dd = [], bi = body.skeleton.bones.indexOf(L.up)
      const SI = body.geometry.attributes.skinIndex, SW = body.geometry.attributes.skinWeight
      for (let v = 0; v < SI.count; v += 2) {
        let w = 0; for (let k = 0; k < 4; k++) if (SI.getComponent(v, k) === bi) w += SW.getComponent(v, k)
        if (w < 0.9) continue
        p.fromBufferAttribute(body.geometry.attributes.position, v); body.applyBoneTransform(v, p); p.applyMatrix4(body.matrixWorld)
        const r = p.clone().sub(a), u = r.dot(ax)
        if (u > 0.3 * len && u < 0.7 * len) dd.push(r.addScaledVector(ax, -u).length())
      }
      dd.sort((x, y) => x - y)
      if (dd.length) { L.r = dd[Math.floor(dd.length * 0.85)]; L.rs = L.r * 0.7 }
    }
  }
  const _a = v3(), _b = v3(), _c = v3()
  function shapes() {
    caps.length = 0
    for (const L of legs) {
      const h = L.up.getWorldPosition(v3()), k = L.low.getWorldPosition(v3()), f = L.foot.getWorldPosition(v3())
      caps.push({ a: h, b: k, r: L.r + MARGIN }, { a: k, b: f, r: L.rs + MARGIN })
    }
    caps.push({ a: legs[0].up.getWorldPosition(v3()), b: legs[1].up.getWorldPosition(v3()), r: legs[0].r * 1.15 + MARGIN })
  }
  let bench = null
  const X = new Float32Array(N * 3), Xp = new Float32Array(N * 3), T = new Float32Array(N * 3)
  function collide(i) {
    const j = i * 3
    _c.set(X[j], X[j + 1], X[j + 2])
    for (const s of caps) {
      _a.subVectors(s.b, s.a); const L2 = _a.lengthSq()
      const t = Math.max(0, Math.min(1, _b.subVectors(_c, s.a).dot(_a) / L2))
      _b.copy(s.a).addScaledVector(_a, t)
      const d = _c.distanceTo(_b)
      if (d < s.r && d > 1e-4) _c.sub(_b).multiplyScalar(s.r / d).add(_b)
    }
    if (bench && _c.x > bench.min.x && _c.x < bench.max.x && _c.z > bench.min.z && _c.z < bench.max.z && _c.y < bench.max.y + 0.4 && _c.y > bench.max.y - 6) _c.y = bench.max.y + 0.4
    if (_c.x !== X[j] || _c.y !== X[j + 1] || _c.z !== X[j + 2]) {
      X[j] = _c.x; X[j + 1] = _c.y; X[j + 2] = _c.z
      // friction on contact
      Xp[j] += (X[j] - Xp[j]) * 0.5; Xp[j + 1] += (X[j + 1] - Xp[j + 1]) * 0.5; Xp[j + 2] += (X[j + 2] - Xp[j + 2]) * 0.5
    }
  }

  // ── skinning on the CPU (every dress vertex, world space) ──
  const SK = new Float32Array(NV * 3), _p = v3()
  function skin() {
    mesh.skeleton.update()
    for (let v = 0; v < NV; v++) {
      // (not getVertexPosition: on a SkinnedMesh that already applies the bones)
      _p.fromBufferAttribute(P0, v)
      mesh.applyBoneTransform(v, _p); _p.applyMatrix4(mesh.matrixWorld)
      SK[v * 3] = _p.x; SK[v * 3 + 1] = _p.y; SK[v * 3 + 2] = _p.z
    }
    for (let i = 0; i < N; i++) { const v = rep[i]; T[i * 3] = SK[v * 3]; T[i * 3 + 1] = SK[v * 3 + 1]; T[i * 3 + 2] = SK[v * 3 + 2] }
  }
  const GRAV = -980
  function step(dt) {
    skin(); shapes()
    const h2 = dt * dt
    for (let i = 0; i < N; i++) {
      const j = i * 3
      if (pinned[i]) { for (let k = 0; k < 3; k++) X[j + k] = Xp[j + k] = T[j + k]; continue }
      for (let k = 0; k < 3; k++) {
        const x = X[j + k]
        X[j + k] += (x - Xp[j + k]) * 0.96 + (k === 1 ? GRAV * h2 : 0)
        Xp[j + k] = x
        X[j + k] += (T[j + k] - X[j + k]) * PULL[i]
      }
    }
    for (let it = 0; it < 6; it++) {
      for (let q = 0; q < NC; q++) {
        const a = CI[q * 2], b = CI[q * 2 + 1], ja = a * 3, jb = b * 3
        const dx = X[jb] - X[ja], dy = X[jb + 1] - X[ja + 1], dz = X[jb + 2] - X[ja + 2]
        const d = Math.hypot(dx, dy, dz) || 1e-6
        const e = (d - CL[q]) / d * (d > CL[q] ? CK[q] : CC[q])
        const wa = pinned[a] ? 0 : 1, wb = pinned[b] ? 0 : 1, ws = wa + wb
        if (!ws) continue
        const ka = e * wa / ws, kb = e * wb / ws
        X[ja] += dx * ka; X[ja + 1] += dy * ka; X[ja + 2] += dz * ka
        X[jb] -= dx * kb; X[jb + 1] -= dy * kb; X[jb + 2] -= dz * kb
      }
      if (it >= 3) for (let i = 0; i < N; i++) if (!pinned[i]) collide(i)
    }
  }
  function draw() {
    for (let v = 0; v < NV; v++) {
      let x = SK[v * 3], y = SK[v * 3 + 1], z = SK[v * 3 + 2]
      for (let k = 0; k < 4; k++) {
        const o = gi[v * 4 + k]; if (o < 0) break
        const w = gw[v * 4 + k], j = o * 3
        x += (X[j] - T[j]) * w; y += (X[j + 1] - T[j + 1]) * w; z += (X[j + 2] - T[j + 2]) * w
      }
      OP[v * 3] = x; OP[v * 3 + 1] = y; OP[v * 3 + 2] = z
    }
    out.attributes.position.needsUpdate = true
    out.computeVertexNormals()
    // the positions are in world space: undo the parent's transform
    if (cloth.parent) { cloth.matrix.copy(cloth.parent.matrixWorld).invert(); cloth.matrixWorld.identity() }
  }

  let started = false
  const api = {
    mesh: cloth, guides: N, constraints: NC, active: true,
    setBench(box) { bench = box },
    settle(seconds = 1.5) {
      skin(); measure(); shapes()
      X.set(T); Xp.set(T)
      for (let i = 0; i < seconds * 60; i++) step(1 / 60)
      started = true
      draw()
    },
    update(dt, visible = true) {
      const on = api.active && visible
      cloth.visible = on
      mesh.visible = visible && !on
      if (!on) { started = false; return }
      if (!started) api.settle(1.5)
      else step(Math.min(dt, 1 / 30))
      draw()
    },
    /** largest guide offset from the skinned skirt (cm) */
    maxOffset() { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.hypot(X[i * 3] - T[i * 3], X[i * 3 + 1] - T[i * 3 + 1], X[i * 3 + 2] - T[i * 3 + 2])); return m },
    dispose() { cloth.removeFromParent(); out.dispose() },
  }
  return api
}
