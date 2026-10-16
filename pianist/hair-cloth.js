// Cloth-like hair for the #032 pianist's mesh hairstyles (MakeHuman's and the
// community's): instead of simulating strands, the hair mesh itself is a
// piece of fabric pinned at the scalp.
//
//  • Particles: a coarse sheet of guides over the hair — its vertices
//    clustered on a 2 cm grid (layers and neighbouring cards that close
//    merge, which is what makes it one fabric), each guide carrying the
//    skin weights of its cluster's central vertex.
//  • Fabric: every mesh edge is a distance constraint (stretch resisted
//    firmly, compression weakly, so locks can bunch), every pair of edges
//    across a vertex a soft bend constraint, and each particle is tied
//    softly to the nearest particle of a neighbouring card — so the cards
//    move together as one sheet (a curtain of hair) instead of as loose
//    ribbons.
//  • Roots: particles near the scalp are pinned to the skinned shape; the
//    rest are pulled toward it with a stiffness that falls off with the
//    distance from the roots along the sheet, so the crown holds the groom
//    and the lengths swing, drape over the shoulders and settle.
//  • Collisions: the skin of the head, neck, shoulders, back and chest, as
//    points with normals carried by their bones (hashed every frame — as
//    the skirt does), so the hair lies on the shoulders and the back.
//  • Rendering: the hairstyle stays a SkinnedMesh; each guide's offset from
//    its skinned position goes into a float texture every frame, and the
//    vertex shader adds to every hair vertex, after skinning, the offsets
//    of its nearest guides (up to four, smooth weights) — in the colour
//    pass and in the shadow pass. Nothing per vertex runs on the CPU.
//
// Verlet integration, four constraint iterations (collisions on the last)
// over ~1–2k guides: a few ms a frame.

import * as THREE from 'three'

const G = 2              // guide spacing (cm)
const TEXW = 128         // displacement texture width (guides per row)
const patched = new WeakSet()

export function createHairCloth(ch, skinnedMesh, { rootDist = 2.2 } = {}) {
  const geo = skinnedMesh.geometry
  const P = geo.attributes.position.array, NV = P.length / 3
  const SI = geo.attributes.skinIndex.array, SW = geo.attributes.skinWeight.array
  const I = geo.index.array
  const gk = (x, y, z, c = G) => ((Math.floor(x / c) + 512) * 1024 + Math.floor(y / c) + 512) * 1024 + Math.floor(z / c) + 512

  // ── guides: one per occupied 1.5 cm cell, at the vertex nearest its centroid ──
  const cellOf = new Int32Array(NV)
  const cells = new Map()
  for (let v = 0; v < NV; v++) {
    const k = gk(P[v * 3], P[v * 3 + 1], P[v * 3 + 2])
    let c = cells.get(k); if (!c) cells.set(k, c = { id: cells.size, k, verts: [], cx: 0, cy: 0, cz: 0 })
    c.verts.push(v); c.cx += P[v * 3]; c.cy += P[v * 3 + 1]; c.cz += P[v * 3 + 2]
    cellOf[v] = c.id
  }
  const N = cells.size
  const rest = new Float32Array(N * 3), skI = new Uint16Array(N * 4), skW = new Float32Array(N * 4)
  const byKey = new Map()
  for (const c of cells.values()) {
    const n = c.verts.length, cx = c.cx / n, cy = c.cy / n, cz = c.cz / n
    let best = c.verts[0], bd = Infinity
    for (const v of c.verts) { const d = (P[v * 3] - cx) ** 2 + (P[v * 3 + 1] - cy) ** 2 + (P[v * 3 + 2] - cz) ** 2; if (d < bd) { bd = d; best = v } }
    for (let k = 0; k < 3; k++) rest[c.id * 3 + k] = P[best * 3 + k]
    for (let k = 0; k < 4; k++) { skI[c.id * 4 + k] = SI[best * 4 + k]; skW[c.id * 4 + k] = SW[best * 4 + k] }
    byKey.set(c.k, c.id)
  }
  const dist = (a, b) => Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2])

  // ── the sheet: guides joined along the mesh's edges, and to every occupied
  //    neighbouring cell (that ties neighbouring cards and layers together) ──
  const nb = Array.from({ length: N }, () => new Map())   // b → stiffness
  const link = (a, b, k) => { if (a === b) return; if ((nb[a].get(b) || 0) < k) { nb[a].set(b, k); nb[b].set(a, k) } }
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) link(cellOf[I[t + e]], cellOf[I[t + (e + 1) % 3]], 1)
  for (const c of cells.values()) {
    const x = rest[c.id * 3], y = rest[c.id * 3 + 1], z = rest[c.id * 3 + 2]
    for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const o = byKey.get(gk(x + dx * G, y + dy * G, z + dz * G)); if (o !== undefined) link(c.id, o, 0.8)
    }
  }
  const cons = []   // [a, b, length, stretch, compression]
  for (let a = 0; a < N; a++) for (const [b, k] of nb[a]) if (a < b) cons.push([a, b, dist(a, b), k, k * 0.3])
  // bending: two hops along the mesh edges
  // (for each neighbour, the one most nearly opposite it across b)
  const bendSeen = new Set()
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
      if (best < 0) continue
      const key = Math.min(a, best) * N + Math.max(a, best)
      if (!bendSeen.has(key)) { bendSeen.add(key); cons.push([a, best, dist(a, best), 0.12, 0.12]) }
    }
  }
  const NC = cons.length
  const CI = new Int32Array(NC * 2), CL = new Float32Array(NC), CK = new Float32Array(NC), CC = new Float32Array(NC)
  cons.forEach(([a, b, l, k, c], i) => { CI[i * 2] = a; CI[i * 2 + 1] = b; CL[i] = l; CK[i] = k; CC[i] = c })

  // ── roots: guides within rootDist of the scalp (head-weighted skin above the ears) ──
  const body = ch.parts.body.geometry, BP = body.attributes.position.array, BN = body.attributes.normal.array
  const BSI = body.attributes.skinIndex.array, BSW = body.attributes.skinWeight.array
  const headI = ch.bones.findIndex(b => b.name === 'head')
  const earY = ch.joints['head____head'].y + 3
  const scalp = new Map()
  for (let v = 0; v < BP.length / 3; v++) {
    let w = 0; for (let k = 0; k < 4; k++) if (BSI[v * 4 + k] === headI) w += BSW[v * 4 + k]
    if (w < 0.9 || BP[v * 3 + 1] < earY) continue
    const k = gk(BP[v * 3], BP[v * 3 + 1], BP[v * 3 + 2]); let l = scalp.get(k); if (!l) scalp.set(k, l = []); l.push(v)
  }
  const nearScalp = i => {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2], r = Math.ceil(rootDist / G)
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const l = scalp.get(gk(x + dx * G, y + dy * G, z + dz * G)); if (!l) continue
      for (const v of l) if ((BP[v * 3] - x) ** 2 + (BP[v * 3 + 1] - y) ** 2 + (BP[v * 3 + 2] - z) ** 2 < rootDist * rootDist) return true
    }
    return false
  }
  // distance from the roots along the sheet
  const S = new Float32Array(N).fill(Infinity), queue = []
  for (let i = 0; i < N; i++) if (nearScalp(i)) { S[i] = 0; queue.push(i) }
  for (let qi = 0; qi < queue.length; qi++) {
    const a = queue[qi]
    for (const b of nb[a].keys()) { const d = S[a] + dist(a, b); if (d < S[b] - 1e-3) { S[b] = d; queue.push(b) } }
  }
  const pinned = new Uint8Array(N), PULL = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (S[i] < 0.5) pinned[i] = 1
    // firm over the crown, free past ~10 cm of length
    PULL[i] = S[i] === Infinity ? 0.05 : 0.6 * Math.exp(-S[i] / 3.5) + 0.03
  }
  const roots = pinned.reduce((s, x) => s + x, 0)

  // ── skinned guide positions (CPU) ──
  const target = new Float32Array(N * 3)
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Vector3()
  function skinTarget() {
    ch.skeleton.update()
    const BM = ch.skeleton.boneMatrices
    for (let i = 0; i < N; i++) {
      _p.fromArray(rest, i * 3); let x = 0, y = 0, z = 0
      for (let k = 0; k < 4; k++) {
        const w = skW[i * 4 + k]; if (!w) continue
        _m.fromArray(BM, skI[i * 4 + k] * 16); _q.copy(_p).applyMatrix4(_m)
        x += _q.x * w; y += _q.y * w; z += _q.z * w
      }
      target[i * 3] = x; target[i * 3 + 1] = y; target[i * 3 + 2] = z
    }
  }

  // ── collision surface: skin of the head, neck, shoulders, back and chest ──
  const SURF = /^(head|neck|spine0[1-3]|clavicle|shoulder|breast|upperarm01)/
  const surf = { bone: [], p: [], n: [] }
  {
    const inv = new Map()
    const lowY = ch.joints['spine03____head']?.y ?? earY - 50
    for (let v = 0; v < BP.length / 3; v += 2) {
      if (BP[v * 3 + 1] < lowY) continue
      let bi = BSI[v * 4], bw = BSW[v * 4]
      for (let k = 1; k < 4; k++) if (BSW[v * 4 + k] > bw) { bw = BSW[v * 4 + k]; bi = BSI[v * 4 + k] }
      if (!SURF.test(ch.bones[bi].name)) continue
      if (!inv.has(bi)) inv.set(bi, ch.restWorld[bi].clone().invert())
      surf.bone.push(ch.bones[bi])
      surf.p.push(new THREE.Vector3(BP[v * 3], BP[v * 3 + 1], BP[v * 3 + 2]).applyMatrix4(inv.get(bi)))
      surf.n.push(new THREE.Vector3(BN[v * 3], BN[v * 3 + 1], BN[v * 3 + 2]).transformDirection(inv.get(bi)))
    }
  }
  const NS = surf.p.length, SP = new Float32Array(NS * 3), SN = new Float32Array(NS * 3)
  const SC = 2.5, sgrid = new Map()
  const _t = new THREE.Vector3()
  function updateSurface() {
    sgrid.clear()
    for (let i = 0; i < NS; i++) {
      const m = surf.bone[i].matrixWorld
      _t.copy(surf.p[i]).applyMatrix4(m); _t.toArray(SP, i * 3)
      _t.copy(surf.n[i]).transformDirection(m); _t.toArray(SN, i * 3)
      const k = gk(SP[i * 3], SP[i * 3 + 1], SP[i * 3 + 2], SC); let l = sgrid.get(k); if (!l) sgrid.set(k, l = []); l.push(i)
    }
  }
  const nearestSkin = (x, y, z) => {
    let best = -1, bd = 9
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = sgrid.get(gk(x + dx * SC, y + dy * SC, z + dz * SC, SC)); if (!l) continue
      for (const s of l) { const d2 = (x - SP[s * 3]) ** 2 + (y - SP[s * 3 + 1]) ** 2 + (z - SP[s * 3 + 2]) ** 2; if (d2 < bd) { bd = d2; best = s } }
    }
    return best
  }
  const THICK = 0.5
  const X = new Float32Array(N * 3), Xp = new Float32Array(N * 3)
  // how far proud of the skin each guide sits in the groom (layers keep their depth)
  const depth = new Float32Array(N).fill(THICK)
  function collide(i) {
    const j = i * 3, x = X[j], y = X[j + 1], z = X[j + 2]
    const s = nearestSkin(x, y, z); if (s < 0) return
    const d = (x - SP[s * 3]) * SN[s * 3] + (y - SP[s * 3 + 1]) * SN[s * 3 + 1] + (z - SP[s * 3 + 2]) * SN[s * 3 + 2]
    const want = depth[i]
    if (d < want && d > -4) {
      const k = want - d
      X[j] += SN[s * 3] * k; X[j + 1] += SN[s * 3 + 1] * k; X[j + 2] += SN[s * 3 + 2] * k
      // friction
      Xp[j] += (X[j] - Xp[j]) * 0.4; Xp[j + 1] += (X[j + 1] - Xp[j + 1]) * 0.4; Xp[j + 2] += (X[j + 2] - Xp[j + 2]) * 0.4
    }
  }

  // ── rendering: per-vertex guide weights, a displacement texture ──
  {
    const gi = new Float32Array(NV * 4), gw = new Float32Array(NV * 4), R = 1.8 * G
    for (let v = 0; v < NV; v++) {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], found = []
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const o = byKey.get(gk(x + dx * G, y + dy * G, z + dz * G)); if (o === undefined) continue
        const d = Math.hypot(rest[o * 3] - x, rest[o * 3 + 1] - y, rest[o * 3 + 2] - z)
        found.push([o, Math.max(0, 1 - d / R) ** 2 + (o === cellOf[v] ? 1e-3 : 0)])
      }
      found.sort((a, b) => b[1] - a[1])
      const top = found.slice(0, 4), sum = top.reduce((s, f) => s + f[1], 0) || 1
      top.forEach(([o, w], k) => { gi[v * 4 + k] = o; gw[v * 4 + k] = w / sum })
    }
    geo.setAttribute('clothIdx', new THREE.BufferAttribute(gi, 4))
    geo.setAttribute('clothW', new THREE.BufferAttribute(gw, 4))
  }
  const TEXH = Math.ceil(N / TEXW)
  const dispData = new Float32Array(TEXW * TEXH * 4)
  const disp = new THREE.DataTexture(dispData, TEXW, TEXH, THREE.RGBAFormat, THREE.FloatType)
  disp.minFilter = disp.magFilter = THREE.NearestFilter
  disp.needsUpdate = true
  const U = { clothDisp: { value: disp }, clothOn: { value: 0 } }
  const VERT = /* glsl */`
    #ifdef HAIR_CLOTH
    {
      vec3 dsp = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        float id = clothIdx[k];
        vec2 uv = vec2((mod(id, ${TEXW}.0) + 0.5) / ${TEXW}.0, (floor(id / ${TEXW}.0) + 0.5) / ${TEXH}.0);
        dsp += texture2D(clothDisp, uv).xyz * clothW[k];
      }
      transformed += dsp * clothOn;
    }
    #endif`
  function patch(m) {
    if (!m || patched.has(m)) return
    patched.add(m)
    const prev = m.onBeforeCompile
    m.onBeforeCompile = (sh, r) => {
      prev?.call(m, sh, r)
      Object.assign(sh.uniforms, U)
      sh.vertexShader = 'attribute vec4 clothIdx;\nattribute vec4 clothW;\nuniform sampler2D clothDisp;\nuniform float clothOn;\n' +
        sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>' + VERT)
    }
    m.defines = { ...(m.defines || {}), HAIR_CLOTH: '' }
    const key = m.customProgramCacheKey?.bind(m)
    m.customProgramCacheKey = () => (key ? key() : '') + '|haircloth' + TEXH
    m.needsUpdate = true
  }
  // the shadow follows the simulated hair too
  const src = skinnedMesh.material
  skinnedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: src.map, alphaTest: src.alphaTest || 0.35 })
  patch(skinnedMesh.material); patch(skinnedMesh.customDepthMaterial)

  function upload(on) {
    U.clothOn.value = on ? 1 : 0
    if (!on) return
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) dispData[i * 4 + k] = pinned[i] ? 0 : X[i * 3 + k] - target[i * 3 + k]
    disp.needsUpdate = true
  }

  let started = false
  function start() {
    skinTarget(); updateSurface()
    X.set(target); Xp.set(target)
    for (let i = 0; i < N; i++) {
      const j = i * 3, s = nearestSkin(X[j], X[j + 1], X[j + 2])
      depth[i] = s < 0 ? THICK : THREE.MathUtils.clamp((X[j] - SP[s * 3]) * SN[s * 3] + (X[j + 1] - SP[s * 3 + 1]) * SN[s * 3 + 1] + (X[j + 2] - SP[s * 3 + 2]) * SN[s * 3 + 2], THICK, 2.5)
    }
    started = true
  }
  const GRAV = -980
  function step(dt) {
    skinTarget(); updateSurface()
    const sub = 1, h = dt / sub
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < N; i++) {
        const j = i * 3
        if (pinned[i]) { X[j] = Xp[j] = target[j]; X[j + 1] = Xp[j + 1] = target[j + 1]; X[j + 2] = Xp[j + 2] = target[j + 2]; continue }
        const x = X[j], y = X[j + 1], z = X[j + 2]
        X[j] += (x - Xp[j]) * 0.97; X[j + 1] += (y - Xp[j + 1]) * 0.97 + GRAV * h * h; X[j + 2] += (z - Xp[j + 2]) * 0.97
        Xp[j] = x; Xp[j + 1] = y; Xp[j + 2] = z
        const k = PULL[i]
        X[j] += (target[j] - X[j]) * k; X[j + 1] += (target[j + 1] - X[j + 1]) * k; X[j + 2] += (target[j + 2] - X[j + 2]) * k
      }
      for (let it = 0; it < 4; it++) {
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
        if (it === 3) for (let i = 0; i < N; i++) if (!pinned[i]) collide(i)
      }
    }
  }

  return {
    guides: N, roots, constraints: NC, active: false,
    /** run the simulation for a while (load, seek) */
    settle(seconds = 1.5) { start(); for (let i = 0; i < seconds * 60; i++) step(1 / 60); upload(true) },
    update(dt, visible) {
      skinnedMesh.visible = visible
      patch(skinnedMesh.material)          // (a new look swaps the material)
      if (!this.active || !visible) { started = false; upload(false); return }
      if (!started) this.settle(1.5)
      else step(Math.min(dt, 1 / 30))
      upload(true)
    },
    /** largest guide offset from the skinned groom (cm) */
    maxOffset() { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.hypot(X[i * 3] - target[i * 3], X[i * 3 + 1] - target[i * 3 + 1], X[i * 3 + 2] - target[i * 3 + 2])); return m },
    dispose() { disp.dispose(); skinnedMesh.customDepthMaterial?.dispose() },
  }
}
