// Loop subdivision for the #032 pianist's "smooth" option.
//
// The body and garments are low-poly game-style meshes (MakeHuman's base mesh
// is ~13k vertices); one or two levels of Loop subdivision round off their
// silhouettes and shading for a soft, animated-feature feel.
//
//  • Topology is read welded by position, so UV seams (split vertices) get the
//    same smoothed position on both sides: no cracks. UVs, skin indices and
//    weights are interpolated per split vertex (midpoints on new edge
//    vertices), so seams in UV space stay where they were.
//  • The result is a linear stencil over the source vertices (sparse rows),
//    so a mesh whose vertices move on the CPU every frame (the cloth skirt)
//    is re-smoothed cheaply with apply(); skinned meshes are subdivided once
//    in their rest pose and the GPU skins the result.
//  • Each source triangle t becomes children 4t…4t+3 (in triangle numbers),
//    so a garment hiding body triangles maps directly onto the smooth body.
//
// Loop's rules: a new edge vertex is 3/8 (a + b) + 1/8 (c + d) inside, the
// midpoint on a boundary; an old vertex moves to (1 − nβ) v + β Σ neighbours
// (β = 3/16 for n = 3, else 3/(8n)), or 3/4 v + 1/8 (its two boundary
// neighbours) on a boundary. Subdivision shrinks a convex shape slightly; the
// garments shrink with the body, so their gap is kept.

import * as THREE from 'three'
import { simplifyMesh } from './simplify.js'

/** One level. geo: indexed BufferGeometry. Returns { geometry, apply, rows }. */
export function loopOnce(geo) {
  const P = geo.attributes.position.array, NV = P.length / 3
  const I = geo.index.array, NT = Math.floor(I.length / 3)
  for (let k = 0; k < I.length; k++) if (I[k] >= NV) throw new Error(`index ${I[k]} ≥ ${NV} vertices`)
  // weld by position
  const weld = new Int32Array(NV), rep = [], key = new Map()
  for (let v = 0; v < NV; v++) {
    const k = `${Math.round(P[v * 3] * 1e3)},${Math.round(P[v * 3 + 1] * 1e3)},${Math.round(P[v * 3 + 2] * 1e3)}`
    let w = key.get(k)
    if (w === undefined) { w = rep.length; key.set(k, w); rep.push(v) }
    weld[v] = w
  }
  const NW = rep.length
  // welded edges: how many triangles, and the vertices opposite
  const ek = (a, b) => a < b ? a * NW + b : b * NW + a
  const edges = new Map()
  const nb = Array.from({ length: NW }, () => new Set())
  for (let t = 0; t < NT; t++) {
    for (let j = 0; j < 3; j++) {
      const a = weld[I[t * 3 + j]], b = weld[I[t * 3 + (j + 1) % 3]], c = weld[I[t * 3 + (j + 2) % 3]]
      if (a === b) continue
      const k = ek(a, b)
      let e = edges.get(k)
      if (!e) edges.set(k, e = { n: 0, opp: [] })
      e.n++; e.opp.push(c)
      nb[a].add(b); nb[b].add(a)
    }
  }
  // boundary neighbours per welded vertex
  const bnb = Array.from({ length: NW }, () => [])
  for (const [k, e] of edges) if (e.n !== 2) { const a = Math.floor(k / NW), b = k % NW; bnb[a].push(b); bnb[b].push(a) }

  // stencil rows (source vertex ids, weights)
  const rowIdx = [], rowW = []
  // even vertices: one per source vertex (split copies share a welded row)
  const evenRow = new Map()
  for (let v = 0; v < NV; v++) {
    const w = weld[v]
    let r = evenRow.get(w)
    if (!r) {
      if (!nb[w].size) r = [[rep[w]], [1]]          // not in any triangle
      else if (bnb[w].length) {
        r = bnb[w].length === 2 ? [[rep[w], rep[bnb[w][0]], rep[bnb[w][1]]], [0.75, 0.125, 0.125]] : [[rep[w]], [1]]
      } else {
        const n = nb[w].size, beta = n === 3 ? 3 / 16 : 3 / (8 * n)
        const ids = [rep[w]], ws = [1 - n * beta]
        for (const u of nb[w]) { ids.push(rep[u]); ws.push(beta) }
        r = [ids, ws]
      }
      evenRow.set(w, r)
    }
    rowIdx.push(r[0]); rowW.push(r[1])
  }
  // odd vertices: one per split edge (a seam edge gets two, same position)
  const odd = new Map(), oddEnds = []
  const splitKey = (a, b) => a < b ? a * NV + b : b * NV + a
  const oddOf = (a, b) => {
    const k = splitKey(a, b)
    let id = odd.get(k)
    if (id !== undefined) return id
    id = NV + oddEnds.length / 2
    odd.set(k, id); oddEnds.push(a, b)
    const wa = weld[a], wb = weld[b], e = edges.get(ek(wa, wb))
    if (e && e.n === 2) { rowIdx.push([rep[wa], rep[wb], rep[e.opp[0]], rep[e.opp[1]]]); rowW.push([0.375, 0.375, 0.125, 0.125]) }
    else { rowIdx.push([a, b]); rowW.push([0.5, 0.5]) }
    return id
  }
  const out = new Uint32Array(NT * 12)
  for (let t = 0; t < NT; t++) {
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2]
    const ab = oddOf(a, b), bc = oddOf(b, c), ca = oddOf(c, a)
    out.set([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca], t * 12)
  }
  const NN = NV + oddEnds.length / 2
  // CSR
  const start = new Uint32Array(NN + 1)
  for (let r = 0; r < NN; r++) start[r + 1] = start[r] + rowIdx[r].length
  const col = new Uint32Array(start[NN]), wt = new Float32Array(start[NN])
  for (let r = 0; r < NN; r++) { col.set(rowIdx[r], start[r]); wt.set(rowW[r], start[r]) }

  function apply(src, dst, size = 3, normalize = false) {
    for (let r = 0; r < NN; r++) {
      let x = 0, y = 0, z = 0
      for (let k = start[r]; k < start[r + 1]; k++) { const s = col[k] * size, w = wt[k]; x += src[s] * w; y += src[s + 1] * w; z += src[s + 2] * w }
      if (normalize) { const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l }
      dst[r * size] = x; dst[r * size + 1] = y; dst[r * size + 2] = z
    }
  }

  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(NN * 3)
  apply(P, pos)
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  if (geo.attributes.normal) {
    const n = new Float32Array(NN * 3)
    apply(geo.attributes.normal.array, n, 3, true)
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  }
  // per split vertex: copy on even vertices, midpoint on odd ones
  for (const name of ['uv', 'uv1', 'color']) {
    const A = geo.attributes[name]; if (!A) continue
    const s = A.itemSize, src = A.array, d = new Float32Array(NN * s)
    d.set(src.subarray(0, NV * s))
    for (let o = 0; o < oddEnds.length / 2; o++) for (let k = 0; k < s; k++) d[(NV + o) * s + k] = (src[oddEnds[o * 2] * s + k] + src[oddEnds[o * 2 + 1] * s + k]) / 2
    g.setAttribute(name, new THREE.BufferAttribute(d, s))
  }
  if (geo.attributes.skinIndex) {
    const SI = geo.attributes.skinIndex.array, SW = geo.attributes.skinWeight.array
    const si = new Uint16Array(NN * 4), sw = new Float32Array(NN * 4)
    si.set(SI.subarray(0, NV * 4)); sw.set(SW.subarray(0, NV * 4))
    const acc = new Map()
    for (let o = 0; o < oddEnds.length / 2; o++) {
      acc.clear()
      for (const v of [oddEnds[o * 2], oddEnds[o * 2 + 1]]) for (let k = 0; k < 4; k++) { const w = SW[v * 4 + k]; if (w) acc.set(SI[v * 4 + k], (acc.get(SI[v * 4 + k]) || 0) + w / 2) }
      const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((s, x) => s + x[1], 0) || 1
      top.forEach(([b, w], k) => { si[(NV + o) * 4 + k] = b; sw[(NV + o) * 4 + k] = w / sum })
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  }
  g.setIndex(new THREE.BufferAttribute(out, 1))
  g.groups = geo.groups.map(gr => ({ start: gr.start * 4, count: gr.count * 4, materialIndex: gr.materialIndex }))
  return { geometry: g, apply, count: NN }
}

// face normals of the mesh as it is, averaged across welded positions (so a
// UV seam does not crease)
function cageNormals(g) {
  g.computeVertexNormals()
  const P = g.attributes.position.array, N = g.attributes.normal.array, acc = new Map()
  const key = v => `${Math.round(P[v * 3] * 1e3)},${Math.round(P[v * 3 + 1] * 1e3)},${Math.round(P[v * 3 + 2] * 1e3)}`
  for (let v = 0; v < P.length / 3; v++) {
    const k = key(v), a = acc.get(k) || [0, 0, 0]
    a[0] += N[v * 3]; a[1] += N[v * 3 + 1]; a[2] += N[v * 3 + 2]; acc.set(k, a)
  }
  for (let v = 0; v < P.length / 3; v++) {
    const a = acc.get(key(v)), l = Math.hypot(a[0], a[1], a[2]) || 1
    N[v * 3] = a[0] / l; N[v * 3 + 1] = a[1] / l; N[v * 3 + 2] = a[2] / l
  }
}

/**
 * levels of Loop subdivision. full: an optional full index (the body's,
 * before garments hid triangles) to subdivide instead of geo.index.
 * simplify: fold the mesh to a low-poly cage first (simplify.js), the surface
 * moving at most this far (cm), so the subdivision rounds off the cage
 * (0 = as modelled).
 * Returns { geometry, levels, update(srcPositions, srcNormals?), childIndex(visibleTris) }.
 */
export function subdivide(geo, levels = 1, full = null, ref = null, simplify = 0, weight = null, lock = null) {
  // ref: positions to read the topology from, for a mesh whose current
  // vertices are not yet meaningful (the cloth before its first step)
  let g = geo
  if (full || ref) g = geo.clone()
  if (full) g.setIndex(new THREE.BufferAttribute(full.slice(), 1))
  if (ref) g.setAttribute('position', new THREE.BufferAttribute(ref.slice(), 3))
  // low-poly cage: a selection of the source vertices (see simplify.js)
  let simp = null, simpOf = null
  if (simplify > 0) {
    simp = simplifyMesh(g, { ratio: 0.002, maxError: simplify, weight, lock })
    g = simp.geometry
    // the kept vertices still carry the modelled mesh's normals, which point
    // into folds the cage no longer has (eye sockets, the lip crease): long
    // cage triangles would shade dark across. Shade the cage as it is.
    cageNormals(g)
    simpOf = new Int32Array(Math.floor((full || geo.index.array).length / 3)).fill(-1)
    simp.origin.forEach((t, j) => { simpOf[t / 3] = j })
  }
  const simpP = simp && new Float32Array(simp.count * 3), simpN = simp && new Float32Array(simp.count * 3)
  const steps = []
  for (let l = 0; l < levels; l++) { const s = loopOnce(g); steps.push(s); g = s.geometry }
  const tmpP = steps.map(s => new Float32Array(s.count * 3)), tmpN = steps.map(s => new Float32Array(s.count * 3))
  const fullOut = g.index.array
  // a mesh that only gets normals later (the cloth computes them per step)
  if (!g.attributes.normal) g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3))
  return {
    geometry: g, levels, cageTris: simp ? simp.geometry.index.count / 3 : null,
    /** re-smooth from moved source positions (and normals) */
    update(srcP, srcN) {
      let p = srcP, n = srcN
      if (simp) {
        const last = !steps.length
        const dp = last ? g.attributes.position.array : simpP, dn = last ? g.attributes.normal?.array : simpN
        simp.update(p, n, dp, dn); p = dp; if (n) n = dn
      }
      for (let l = 0; l < steps.length; l++) {
        const last = l === steps.length - 1
        const dp = last ? g.attributes.position.array : tmpP[l]
        steps[l].apply(p, dp); p = dp
        if (n && g.attributes.normal) { const dn = last ? g.attributes.normal.array : tmpN[l]; steps[l].apply(n, dn, 3, true); n = dn }
      }
      g.attributes.position.needsUpdate = true
      if (n && g.attributes.normal) g.attributes.normal.needsUpdate = true
    },
    /** the subdivided index for a list of visible source triangles (index offsets, multiples of 3) */
    childIndex(tris) {
      // source triangles → the cage's (a folded-away triangle has none)
      if (simpOf) { const c = []; for (const t of tris) { const j = simpOf[t / 3]; if (j >= 0) c.push(j * 3) } tris = c }
      const per = 4 ** levels * 3, out = new fullOut.constructor(tris.length * per)
      let o = 0
      for (const t of tris) { const s = (t / 3) * per; out.set(fullOut.subarray(s, s + per), o); o += per }
      return out
    },
  }
}

/**
 * The "smooth" option for a whole character: swaps each eligible mesh's
 * geometry for its subdivided one (cached per level), and keeps CPU-animated
 * meshes (the cloth skirt) re-smoothed every frame. Alpha-card meshes (mesh
 * hair, brows, lashes), the eyes and the strand hair are left alone.
 */
// the body's detail: what the face rig, the fingers and the toes move folds
// later and within a DETAIL_COST times tighter tolerance, so a low cage keeps
// a face and hands while the limbs and torso go to a few planes
const DETAIL = /^(jaw|levator|oculi|orbicularis|oris|risorius|temporalis|special0|eye|tongue|finger|metacarpal|toe)/
const DETAIL_COST = 8
// the lids and lips stay as modelled: they carry the blink and the mouth,
// and folding across their rims opens the lips and pulls the lids back
const EXPRESSION = /^(orbicularis|oris|special0[14])/
function expressionLock(geo, skeleton) {
  const SI = geo.attributes.skinIndex?.array, SW = geo.attributes.skinWeight?.array
  if (!SI || !skeleton) return null
  const on = skeleton.bones.map(b => EXPRESSION.test(b.name))
  return v => { let w = 0; for (let k = 0; k < 4; k++) if (on[SI[v * 4 + k]]) w += SW[v * 4 + k]; return w > 0.25 }
}
function detailWeight(geo, skeleton) {
  const SI = geo.attributes.skinIndex?.array, SW = geo.attributes.skinWeight?.array
  if (!SI || !skeleton) return null
  const fine = skeleton.bones.map(b => DETAIL.test(b.name))
  return v => { let w = 0; for (let k = 0; k < 4; k++) if (fine[SI[v * 4 + k]]) w += SW[v * 4 + k]; return 1 + (DETAIL_COST - 1) * Math.min(1, w * 2) }
}

export function createSmoother(ch) {
  const SKIP = /eyes|eyebrows|eyelashes|hair|cap|outline/
  let level = 0, simplify = 0
  const info = { cageTris: null }
  const dynamic = new Set()
  function eligible(o) {
    if (!(o.isMesh || o.isSkinnedMesh) || o.isInstancedMesh || o.userData.outline) return false
    const m = o.material
    if (!m || m.isShaderMaterial || m.alphaTest > 0 || m.transparent) return false
    if (SKIP.test(o.name) || SKIP.test(o.parent?.name || '')) return false
    const g = o.userData.baseGeo || o.geometry
    return !!(g.index && g.attributes.position)
  }
  function list(extra) {
    const out = new Set()
    const add = root => root?.traverse?.(o => { if (eligible(o)) out.add(o) })
    add(ch.group); for (const x of extra) add(x)
    return [...out]
  }
  // lv: subdivision levels; simp: keep this fraction of the triangles first
  // (a low-poly cage for the subdivision to round off), 0 = as modelled
  function apply(lv, extra = [], simp = simplify) {
    level = lv; simplify = simp
    dynamic.clear()
    for (const o of list(extra)) {
      const base = o.userData.baseGeo || o.geometry, isBody = o === ch.meshes.body
      // the cage is the body's: the garments are shells fitted to the
      // modelled skin and keep its vertices, and the face and hands keep
      // the detail their expressions and fingers move
      const sr = isBody ? simp : 0
      if (!lv && !sr) { if (o.userData.baseGeo) { o.geometry = base; delete o.userData.baseGeo } if (isBody) ch.parts.body.smooth = null; continue }
      const cache = (base.userData.smooth ||= {}), ck = sr ? `${lv}:${sr}` : lv
      let sub = cache[ck]
      // a slider makes many cages: keep only the current one
      if (sr) for (const k of Object.keys(cache)) if (k.includes(':') && k !== String(ck)) delete cache[k]
      if (!sub) {
        try { sub = cache[ck] = subdivide(base, lv, isBody ? (ch.parts.body.index0 || base.index.array) : null, base.userData.topologyFrom || null, sr, isBody ? detailWeight(base, o.skeleton) : null, isBody ? expressionLock(base, o.skeleton) : null) }
        catch (e) { console.warn('smooth: skipped', o.name || o.parent?.name, e.message); continue }
        sub.geometry.userData.isSmooth = true
      }
      if (o === ch.meshes.body) {
        ch.parts.body.smooth = sub
        if (ch.parts.body.visibleTris) sub.geometry.setIndex(new THREE.BufferAttribute(sub.childIndex(ch.parts.body.visibleTris), 1))
      }
      if (isBody) info.cageTris = sub.cageTris ?? null
      o.userData.baseGeo = base
      o.geometry = sub.geometry
      // vertices moved on the CPU (not skinned): follow the source each frame
      if (!o.isSkinnedMesh && base.attributes.position.usage === THREE.DynamicDrawUsage) { dynamic.add([base, sub]); sub.update(base.attributes.position.array, base.attributes.normal?.array) }
    }
    if (!lv && !simp) ch.parts.body.smooth = null
  }
  return {
    get level() { return level },
    get simplify() { return simplify },
    /** triangles in the body's low-poly cage (null = not simplified) */
    get cageTris() { return simplify ? info.cageTris : null },
    apply,
    update() { for (const [base, sub] of dynamic) sub.update(base.attributes.position.array, base.attributes.normal?.array) },
  }
}
