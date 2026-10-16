// Mesh simplification for the #032 pianist's "low poly, then smooth" look.
//
// Quadric error metrics (Garland & Heckbert 1997) with half-edge collapses:
// a vertex u is folded onto a neighbour v, so every vertex left is one of the
// source vertices, unchanged. That keeps everything a vertex carries exact —
// UVs, skin indices and weights, colours — with no interpolation, and makes
// the result a plain selection of the source: a mesh whose vertices move on
// the CPU (the cloth skirt) follows with a gather, and the Loop subdivision
// stencil (subdivide.js) composes with it.
//
//  • Topology is read welded by position (as subdivide.js), so UV seams are
//    understood. Seams, open edges and material borders are feature lines: a
//    vertex on one may only fold along it, onto its neighbour on the line
//    (each UV side onto its own copy), and open edges carry extra planes that
//    hold their curve. Corners (where lines meet or end) and non-manifold
//    vertices stay. So the outline, hems and UV layout keep their shape while
//    everything else thins out.
//  • A collapse is refused if it would flip or crush a triangle, or break the
//    link condition (the edge's two sides must share exactly two neighbours),
//    so the mesh stays manifold.
//  • Cost: the summed plane quadrics of both ends at v, plus a little edge
//    length (so flat regions thin out evenly instead of into slivers) and a
//    penalty for folding across a change of skin weights (an elbow keeps the
//    vertices that bend it).
//  • Triangles keep their source order, so material groups stay contiguous,
//    and each output triangle names the source triangle it came from
//    (origin), so a garment hiding body triangles maps onto the low-poly body.

import * as THREE from 'three'

/**
 * ratio: fraction of the triangles to keep (0…1).
 * index / positions: optional full index and topology positions to read
 * instead of the geometry's own (as subdivide()).
 * lock(v): optional, true for source vertices to keep as they are.
 * weight(v): optional multiplier per source vertex (> 1 = fold later, and
 * within maxError / weight: a face, the fingers keep their detail).
 * maxError: the surface may move at most about this far (model units, an
 * RMS distance to the planes it replaces); the mesh goes as low as it can
 * within it, or to ratio, whichever comes first.
 * Returns { geometry, keep, origin, count, update(srcP, srcN) }:
 *   keep[i]   — the source vertex behind output vertex i
 *   origin[j] — the source triangle (index offset, a multiple of 3) behind output triangle j
 */
export function simplifyMesh(geo, { ratio = 0.5, index = null, positions = null, weightCost = 1, lengthCost = 0.02, minCos = 0.2, lock = null, weight = null, maxError = Infinity } = {}) {
  const P = positions || geo.attributes.position.array, NV = P.length / 3
  const I = index || geo.index.array, NT = Math.floor(I.length / 3)
  const SW = geo.attributes.skinWeight?.array, SI = geo.attributes.skinIndex?.array

  // weld by position
  const weld = new Int32Array(NV), rep = [], copies = [], key = new Map()
  for (let v = 0; v < NV; v++) {
    const k = `${Math.round(P[v * 3] * 1e3)},${Math.round(P[v * 3 + 1] * 1e3)},${Math.round(P[v * 3 + 2] * 1e3)}`
    let w = key.get(k)
    if (w === undefined) { w = rep.length; key.set(k, w); rep.push(v); copies.push(0) }
    weld[v] = w
  }
  const NW = rep.length
  const used = new Uint8Array(NV)
  for (let k = 0; k < NT * 3; k++) used[I[k]] = 1
  for (let v = 0; v < NV; v++) if (used[v]) copies[weld[v]]++

  // triangles, as split indices (T) and welded (W); groups per triangle
  const T = new Uint32Array(I.subarray(0, NT * 3)), alive = new Uint8Array(NT).fill(1)
  const grp = new Int32Array(NT)
  for (const [gi, g] of (geo.groups || []).entries()) for (let t = g.start / 3; t < Math.min(NT, (g.start + g.count) / 3); t++) grp[t] = gi
  const W = t => [weld[T[t * 3]], weld[T[t * 3 + 1]], weld[T[t * 3 + 2]]]
  // welded vertex → its triangles
  const vt = Array.from({ length: NW }, () => [])
  let NA = 0
  for (let t = 0; t < NT; t++) {
    const [a, b, c] = W(t)
    if (a === b || b === c || c === a) { alive[t] = 0; continue }
    vt[a].push(t); vt[b].push(t); vt[c].push(t); NA++
  }

  // feature lines: open edges, seams (the two sides use different split
  // vertices) and material borders. feat[w]: w's neighbours along them.
  const locked = new Uint8Array(NW)
  const ek = (a, b) => a < b ? a * NW + b : b * NW + a
  const edgeT = new Map()
  for (let t = 0; t < NT; t++) {
    if (!alive[t]) continue
    const w = W(t)
    for (let j = 0; j < 3; j++) { const k = ek(w[j], w[(j + 1) % 3]); let e = edgeT.get(k); if (!e) edgeT.set(k, e = []); e.push(t) }
  }
  const feat = Array.from({ length: NW }, () => new Set()), open = new Set()
  const splitOf = (t, w) => { for (let j = 0; j < 3; j++) if (weld[T[t * 3 + j]] === w) return T[t * 3 + j]; return -1 }
  for (const [k, ts] of edgeT) {
    const a = Math.floor(k / NW), b = k % NW
    if (ts.length > 2) { locked[a] = locked[b] = 1; continue }
    const isFeat = ts.length === 1 || grp[ts[0]] !== grp[ts[1]] || splitOf(ts[0], a) !== splitOf(ts[1], a) || splitOf(ts[0], b) !== splitOf(ts[1], b)
    if (!isFeat) continue
    feat[a].add(b); feat[b].add(a)
    if (ts.length === 1) open.add(k)
  }
  // and whatever the caller keeps as modelled (lock(sourceVertex) → true)
  if (lock) for (let v = 0; v < NV; v++) if (used[v] && lock(v)) locked[weld[v]] = 1
  // corners: a feature line ends, branches or turns material
  for (let w = 0; w < NW; w++) if (feat[w].size && feat[w].size !== 2) locked[w] = 1
  const mult = new Float32Array(NW).fill(1)
  if (weight) for (let v = 0; v < NV; v++) if (used[v]) mult[weld[v]] = Math.max(mult[weld[v]], weight(v))

  // plane quadrics (area weighted), 10 floats per welded vertex
  const Q = new Float64Array(NW * 10), AR = new Float64Array(NW)
  const px = w => P[rep[w] * 3], py = w => P[rep[w] * 3 + 1], pz = w => P[rep[w] * 3 + 2]
  const _n = [0, 0, 0]
  function normalOf(a, b, c, out) {   // unnormalised (length = 2 · area)
    const ux = px(b) - px(a), uy = py(b) - py(a), uz = pz(b) - pz(a)
    const vx = px(c) - px(a), vy = py(c) - py(a), vz = pz(c) - pz(a)
    out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx
    return out
  }
  for (let t = 0; t < NT; t++) {
    if (!alive[t]) continue
    const [a, b, c] = W(t)
    normalOf(a, b, c, _n)
    const l = Math.hypot(_n[0], _n[1], _n[2]); if (!l) continue
    const nx = _n[0] / l, ny = _n[1] / l, nz = _n[2] / l, d = -(nx * px(a) + ny * py(a) + nz * pz(a)), ar = l / 2
    const q = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d]
    for (const w of [a, b, c]) { for (let k = 0; k < 10; k++) Q[w * 10 + k] += q[k] * ar; AR[w] += ar }
  }
  // an open edge: a plane through it, perpendicular to its triangle, weighted
  // like a steep fold, so the outline's curve resists folding
  for (const k of open) {
    const a = Math.floor(k / NW), b = k % NW, t = edgeT.get(k)[0], w = W(t)
    normalOf(w[0], w[1], w[2], _n)
    const ex = px(b) - px(a), ey = py(b) - py(a), ez = pz(b) - pz(a), el = Math.hypot(ex, ey, ez) || 1
    let nx = ey * _n[2] - ez * _n[1], ny = ez * _n[0] - ex * _n[2], nz = ex * _n[1] - ey * _n[0]
    const l = Math.hypot(nx, ny, nz); if (!l) continue
    nx /= l; ny /= l; nz /= l
    const d = -(nx * px(a) + ny * py(a) + nz * pz(a)), wt = el * el * 4
    const q = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d]
    for (const x of [a, b]) for (let i = 0; i < 10; i++) Q[x * 10 + i] += q[i] * wt
  }
  const qerr = (u, v, x, y, z) => {
    let e = 0
    for (const w of [u, v]) {
      const q = w * 10
      e += Q[q] * x * x + 2 * Q[q + 1] * x * y + 2 * Q[q + 2] * x * z + 2 * Q[q + 3] * x
        + Q[q + 4] * y * y + 2 * Q[q + 5] * y * z + 2 * Q[q + 6] * y + Q[q + 7] * z * z + 2 * Q[q + 8] * z + Q[q + 9]
    }
    return Math.max(0, e)
  }
  // skin weights as a sparse bone → weight difference (0…2)
  const wdiff = (u, v) => {
    if (!SW) return 0
    const a = rep[u] * 4, b = rep[v] * 4
    let d = 0
    for (let i = 0; i < 4; i++) {
      let m = 0
      for (let j = 0; j < 4; j++) if (SI[b + j] === SI[a + i]) m = SW[b + j]
      d += Math.abs(SW[a + i] - m)
    }
    for (let j = 0; j < 4; j++) {
      let found = false
      for (let i = 0; i < 4; i++) if (SI[a + i] === SI[b + j] && SW[a + i]) found = true
      if (!found) d += SW[b + j]
    }
    return d
  }

  const neighbours = u => {
    const s = new Set()
    for (const t of vt[u]) if (alive[t]) for (const w of W(t)) if (w !== u) s.add(w)
    return s
  }
  // can u fold onto v? (link condition, no flipped or crushed triangle)
  const _o = [0, 0, 0]
  function valid(u, v, Nu) {
    // a vertex on a feature line folds only along it
    if (feat[u].size && !feat[u].has(v)) return false
    let shared = 0, onEdge = 0
    for (const w of neighbours(v)) if (Nu.has(w)) shared++
    for (const t of vt[u]) if (alive[t] && W(t).includes(v)) onEdge++
    if (shared !== onEdge) return false
    for (const t of vt[u]) {
      if (!alive[t]) continue
      const w = W(t)
      if (w.includes(v)) continue
      normalOf(w[0], w[1], w[2], _o)
      const m = w.map(x => x === u ? v : x)
      normalOf(m[0], m[1], m[2], _n)
      const lo = Math.hypot(..._o), ln = Math.hypot(..._n)
      if (ln < 1e-9 * (lo + 1e-9)) return false
      if ((_o[0] * _n[0] + _o[1] * _n[1] + _o[2] * _n[2]) / (lo * ln) < minCos) return false
    }
    return true
  }
  function best(u) {
    // cheapest first; the (costlier) validity test only until one passes
    const Nu = neighbours(u), cand = []
    for (const v of Nu) {
      const x = px(v), y = py(v), z = pz(v)
      const l2 = (x - px(u)) ** 2 + (y - py(u)) ** 2 + (z - pz(u)) ** 2
      const qe = qerr(u, v, x, y, z)
      // how far the surface moves (RMS over the area folded), against the tolerance
      if (maxError < Infinity && Math.sqrt(qe / (AR[u] + AR[v] + 1e-12)) * mult[u] > maxError) continue
      cand.push([(qe + lengthCost * l2 + weightCost * wdiff(u, v) * l2) * mult[u], v])
    }
    cand.sort((a, b) => a[0] - b[0])
    for (const [c, v] of cand) if (valid(u, v, Nu)) return [c, v]
    return [Infinity, -1]
  }

  // binary min-heap of [cost, u, stamp]
  const hc = [], hu = [], hs = []
  const swap = (i, j) => { [hc[i], hc[j]] = [hc[j], hc[i]]; [hu[i], hu[j]] = [hu[j], hu[i]]; [hs[i], hs[j]] = [hs[j], hs[i]] }
  function push(c, u, s) {
    let i = hc.length; hc.push(c); hu.push(u); hs.push(s)
    while (i) { const p = (i - 1) >> 1; if (hc[p] <= hc[i]) break; swap(i, p); i = p }
  }
  function pop() {
    const top = [hc[0], hu[0], hs[0]], last = hc.length - 1
    swap(0, last); hc.pop(); hu.pop(); hs.pop()
    let i = 0
    for (;;) {
      const l = 2 * i + 1, r = l + 1; let m = i
      if (l < hc.length && hc[l] < hc[m]) m = l
      if (r < hc.length && hc[r] < hc[m]) m = r
      if (m === i) break
      swap(i, m); i = m
    }
    return top
  }
  const stamp = new Uint32Array(NW), target = new Int32Array(NW).fill(-1)
  const consider = u => {
    if (locked[u] || !vt[u].length) return
    stamp[u]++
    const [c, v] = best(u)
    target[u] = v
    if (v >= 0) push(c, u, stamp[u])
  }
  for (let u = 0; u < NW; u++) consider(u)

  // the ratio applies to what may be simplified: triangles with a locked
  // corner mostly stay, so they would otherwise push the rest far lower
  let fixed = 0
  for (let t = 0; t < NT; t++) if (alive[t]) { const [x, y, z] = W(t); if (locked[x] && locked[y] && locked[z]) fixed++ }
  const goal = Math.max(4, Math.round(fixed + (NA - fixed) * ratio))
  const gone = new Uint8Array(NW)
  while (NA > goal && hc.length) {
    const [, u, s] = pop()
    if (s !== stamp[u] || gone[u]) continue
    const v = target[u]
    if (v < 0 || gone[v] || !valid(u, v, neighbours(u))) { consider(u); continue }
    // each split copy of u folds onto v's copy on its side of the seam (read
    // off the triangles along the edge); an interior u has one copy
    const map = new Map()
    for (const t of vt[u]) if (alive[t] && W(t).includes(v)) map.set(splitOf(t, u), splitOf(t, v))
    let ok = true
    for (const t of vt[u]) if (alive[t] && !map.has(splitOf(t, u))) {
      if (map.size === 1 && !feat[u].size) { map.set(splitOf(t, u), [...map.values()][0]); continue }
      ok = false; break
    }
    if (!ok) { consider(u); continue }
    const touched = new Set(neighbours(u))
    for (const t of vt[u]) {
      if (!alive[t]) continue
      const w = W(t)
      if (w.includes(v)) { alive[t] = 0; NA--; continue }
      for (let j = 0; j < 3; j++) { const m = map.get(T[t * 3 + j]); if (m !== undefined && weld[T[t * 3 + j]] === u) T[t * 3 + j] = m }
      vt[v].push(t)
    }
    // the feature line now runs through v instead of u
    for (const x of feat[u]) { feat[x].delete(u); if (x !== v) { feat[x].add(v); feat[v].add(x) } }
    feat[v].delete(u); feat[u].clear()
    vt[u] = []; gone[u] = 1
    for (let k = 0; k < 10; k++) Q[v * 10 + k] += Q[u * 10 + k]
    AR[v] += AR[u]
    vt[v] = vt[v].filter(t => alive[t])
    touched.add(v)
    for (const w of touched) consider(w)
  }

  // compact: the vertices still used, triangles in source order
  const newOf = new Int32Array(NV).fill(-1), keep = [], tris = [], origin = []
  for (let t = 0; t < NT; t++) {
    if (!alive[t]) continue
    for (let j = 0; j < 3; j++) { const s = T[t * 3 + j]; if (newOf[s] < 0) { newOf[s] = keep.length; keep.push(s) } tris.push(newOf[s]) }
    origin.push(t * 3)
  }
  const K = Uint32Array.from(keep), N = K.length
  const g = new THREE.BufferGeometry()
  for (const [name, A] of Object.entries(geo.attributes)) {
    const s = A.itemSize, src = A.array, d = new src.constructor(N * s)
    for (let i = 0; i < N; i++) for (let k = 0; k < s; k++) d[i * s + k] = src[K[i] * s + k]
    const B = new THREE.BufferAttribute(d, s, A.normalized); B.usage = A.usage
    g.setAttribute(name, B)
  }
  if (positions) {   // the geometry's own positions may not be meaningful yet (the cloth)
    const d = g.attributes.position.array
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) d[i * 3 + k] = positions[K[i] * 3 + k]
  }
  g.setIndex(new THREE.BufferAttribute(N > 65535 ? Uint32Array.from(tris) : Uint16Array.from(tris), 1))
  // groups: count the surviving triangles of each source group
  if (geo.groups?.length) {
    let o = 0
    for (const gr of geo.groups) {
      let n = 0
      for (const t of origin) if (t >= gr.start && t < gr.start + gr.count) n++
      g.addGroup(o * 3, n * 3, gr.materialIndex); o += n
    }
  }
  const Org = Int32Array.from(origin)
  return {
    geometry: g, keep: K, origin: Org, count: N,
    /** gather moved source positions (and normals) into the simplified mesh */
    update(srcP, srcN, dstP = g.attributes.position.array, dstN = g.attributes.normal?.array) {
      for (let i = 0; i < N; i++) { const s = K[i] * 3; dstP[i * 3] = srcP[s]; dstP[i * 3 + 1] = srcP[s + 1]; dstP[i * 3 + 2] = srcP[s + 2] }
      if (srcN && dstN) for (let i = 0; i < N; i++) { const s = K[i] * 3; dstN[i * 3] = srcN[s]; dstN[i * 3 + 1] = srcN[s + 1]; dstN[i * 3 + 2] = srcN[s + 2] }
    },
  }
}
