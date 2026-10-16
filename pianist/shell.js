// Garments cut out of the body mesh (Experiment #032).
//
// A fitted garment is the skin it covers, pushed out a little: cutShell()
// keeps the body triangles a predicate selects (rest pose), welds the UV
// seams so the cut is one piece, then shrink-wraps it — Laplacian smoothing
// held at least `gap` outside the skin, so the fabric bridges hollows the way
// cloth does — and smooths every cut edge as a curve (no sawtooth along the
// triangle edges). The shell keeps the body's skin weights, so it is a
// SkinnedMesh on the same skeleton and never slides. piping() finishes each
// cut edge with a rolled hem (a thin tube along the edge loop).

import * as THREE from 'three'

// the body's full index (garments hide what they cover: see hideBody)
export function bodyIndex(ch) {
  const g = ch.parts.body.geometry
  return (ch.parts.body.index0 ||= g.index.array.slice())
}

// Drop the body triangles a garment covers completely (no z-fighting, no skin
// poking through the fabric when the body bends). key: the garment.
export function hideBody(ch, key, tris) {
  const g = ch.parts.body.geometry, full = bodyIndex(ch)
  const hidden = (ch.parts.body.hidden ||= new Map())
  if (tris) hidden.set(key, new Set(tris)); else hidden.delete(key)
  const out = [], vis = []
  for (let t = 0; t < full.length; t += 3) {
    let h = false
    for (const set of hidden.values()) if (set.has(t)) { h = true; break }
    if (!h) { out.push(full[t], full[t + 1], full[t + 2]); vis.push(t) }
  }
  g.setIndex(new THREE.BufferAttribute(new full.constructor(out), 1))
  // the smooth (subdivided) body, when shown, hides the same triangles' children
  const sm = ch.parts.body.smooth
  if (sm) sm.geometry.setIndex(new THREE.BufferAttribute(sm.childIndex(vis), 1))
  ch.parts.body.visibleTris = vis
}

export function cutShell(ch, keep, { gap = 0.25, offset = 0.3, iterations = 24, edgeIterations = 30, obstacleSmooth = 0, minLoop = 12, part = 'body', spatial = 0, fillHoles = 0, dropIslands = 0, close = 0, smoothCut = 0, tidy = 0 } = {}) {
  const body = ch.parts[part].geometry
  const P = body.attributes.position.array
  let Nn = body.attributes.normal.array
  if (part !== 'body') Nn = borrowNormals(ch, P)
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array
  const UV = body.attributes.uv.array
  const index = part === 'body' ? bodyIndex(ch) : body.index.array
  const NV = P.length / 3

  // weld by position
  const key = v => `${Math.round(P[v * 3] * 200)},${Math.round(P[v * 3 + 1] * 200)},${Math.round(P[v * 3 + 2] * 200)}`
  const wid = new Int32Array(NV), wfirst = []
  {
    const m = new Map()
    for (let v = 0; v < NV; v++) { const k = key(v); let id = m.get(k); if (id === undefined) { id = wfirst.length; m.set(k, id); wfirst.push(v) } wid[v] = id }
  }
  const W = wfirst.length
  const wkeep = new Uint8Array(W)
  const arrs = { P, SI, SW }
  for (let v = 0; v < NV; v++) if (keep(v, arrs)) wkeep[wid[v]] = 1
  // holes and specks: a predicate on weights leaves small islands where a
  // vertex's weights tip it the other way (slits by the armpits); fill
  // unkept components under `fillHoles` welded vertices, drop kept ones
  // under `dropIslands`
  if (fillHoles || dropIslands || close || smoothCut) {
    const adj = Array.from({ length: W }, () => [])
    for (let t = 0; t < index.length; t += 3) {
      const a = wid[index[t]], b = wid[index[t + 1]], c = wid[index[t + 2]]
      adj[a].push(b, c); adj[b].push(a, c); adj[c].push(a, b)
    }
    // a smooth cut: blur the kept / not-kept field over the mesh and take
    // the half level, so the line runs as a curve and not along the weights'
    // staircase
    if (smoothCut) {
      let f = Float32Array.from(wkeep)
      for (let it = 0; it < smoothCut; it++) {
        const o = f; f = new Float32Array(W)
        for (let a = 0; a < W; a++) { const l = adj[a]; if (!l.length) { f[a] = o[a]; continue } let x = 0; for (const b of l) x += o[b]; f[a] = 0.5 * o[a] + 0.5 * x / l.length }
      }
      for (let a = 0; a < W; a++) if (adj[a].length) wkeep[a] = f[a] >= 0.5 ? 1 : 0
    }
    // closing: notches (a vertex or two wide) along the cut are filled — a
    // vertex joins when most of its neighbours are kept
    for (let it = 0; it < close; it++) {
      const add = []
      for (let a = 0; a < W; a++) {
        if (wkeep[a] || !adj[a].length) continue
        let k = 0; for (const b of adj[a]) k += wkeep[b]
        if (k / adj[a].length >= 0.5) add.push(a)
      }
      for (const a of add) wkeep[a] = 1
    }
    const comp = new Int32Array(W).fill(-1)
    for (let s0 = 0; s0 < W; s0++) {
      if (comp[s0] >= 0 || !adj[s0].length) continue
      const val = wkeep[s0], stack = [s0], members = []
      comp[s0] = s0
      while (stack.length) { const a = stack.pop(); members.push(a); for (const b of adj[a]) if (comp[b] < 0 && wkeep[b] === val) { comp[b] = s0; stack.push(b) } }
      const lim = val ? dropIslands : fillHoles
      if (members.length < lim) for (const a of members) wkeep[a] = val ? 0 : 1
    }
  }

  const tri = [], triAt = []
  const tk = new Uint8Array(index.length / 3)
  for (let t = 0; t < index.length; t += 3) tk[t / 3] = wkeep[wid[index[t]]] && wkeep[wid[index[t + 1]]] && wkeep[wid[index[t + 2]]] ? 1 : 0
  // tidy: a clean cut line, a triangle at a time. A cut along the mesh's
  // own triangles is a staircase with teeth (a triangle hanging on by one
  // edge), notches (a missing one between two kept) and bowties (two
  // stretches of edge through one vertex); those break the edge into
  // pieces the edge smoothing cannot straighten. Fill the notches, drop
  // the teeth, then untie the bowties.
  if (tidy) {
    const NT = tk.length, ekey = (a, b) => a < b ? a * W + b : b * W + a
    const eTris = new Map()
    for (let i = 0; i < NT; i++) for (let e = 0; e < 3; e++) {
      const k = ekey(wid[index[i * 3 + e]], wid[index[i * 3 + (e + 1) % 3]])
      let l = eTris.get(k); if (!l) eTris.set(k, l = []); l.push(i)
    }
    const keptOn = k => { let c = 0; for (const i of eTris.get(k)) c += tk[i]; return c }
    const edgesOf = i => [0, 1, 2].map(e => ekey(wid[index[i * 3 + e]], wid[index[i * 3 + (e + 1) % 3]]))
    for (let it = 0; it < tidy; it++) {
      let changed = 0
      // notches in, teeth out
      for (let i = 0; i < NT; i++) if (!tk[i] && edgesOf(i).filter(k => keptOn(k) > 0).length >= 2) { tk[i] = 1; changed++ }
      for (let i = 0; i < NT; i++) if (tk[i] && edgesOf(i).filter(k => keptOn(k) === 1).length >= 2) { tk[i] = 0; changed++ }
      // bowties: a vertex on more than two boundary edges
      const bdeg = new Map()
      for (const [k, l] of eTris) if (keptOn(k) === 1) { const a = Math.floor(k / W), b = k % W; bdeg.set(a, (bdeg.get(a) || 0) + 1); bdeg.set(b, (bdeg.get(b) || 0) + 1) }
      for (let i = 0; i < NT; i++) {
        if (!tk[i]) continue
        const vs = [wid[index[i * 3]], wid[index[i * 3 + 1]], wid[index[i * 3 + 2]]]
        if (vs.some(a => bdeg.get(a) > 2) && edgesOf(i).some(k => keptOn(k) === 1)) { tk[i] = 0; changed++ }
      }
      if (!changed) break
    }
  }
  for (let t = 0; t < index.length; t += 3) if (tk[t / 3]) { tri.push(index[t], index[t + 1], index[t + 2]); triAt.push(t) }

  // boundary edges (welded): used by exactly one kept triangle
  const ecount = new Map()
  const ek = (a, b) => a < b ? a * W + b : b * W + a
  for (let t = 0; t < tri.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = wid[tri[t + e]], b = wid[tri[t + (e + 1) % 3]], k = ek(a, b)
    ecount.set(k, (ecount.get(k) || 0) + 1)
  }
  const bnb = new Map()     // boundary vertex → its two neighbours along the edge
  for (const [k, c] of ecount) {
    if (c !== 1) continue
    const a = Math.floor(k / W), b = k % W
    if (!bnb.has(a)) bnb.set(a, []); if (!bnb.has(b)) bnb.set(b, [])
    bnb.get(a).push(b); bnb.get(b).push(a)
  }
  // chain the boundary into loops; small ones are seams between mesh islands
  // (e.g. the nipples), not cuts: those vertices count as interior
  const small = [], smallOf = new Map()
  {
    const seen0 = new Set()
    for (const s0 of [...bnb.keys()]) {
      if (seen0.has(s0)) continue
      const loop = [s0]; seen0.add(s0)
      let prev = -1, cur = s0
      for (;;) {
        const nx = bnb.get(cur).find(b => b !== prev && !seen0.has(b))
        if (nx === undefined) break
        loop.push(nx); seen0.add(nx); prev = cur; cur = nx
      }
      let len = 0
      for (let i = 0; i < loop.length; i++) { const a = wfirst[loop[i]], b = wfirst[loop[(i + 1) % loop.length]]; len += Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]) }
      if (len < minLoop) { const id = small.length; small.push(loop); for (const a of loop) { bnb.delete(a); smallOf.set(a, id) } }
    }
  }
  const nb = new Map()
  for (let t = 0; t < tri.length; t += 3) {
    const ids = [wid[tri[t]], wid[tri[t + 1]], wid[tri[t + 2]]]
    for (const a of ids) { if (!nb.has(a)) nb.set(a, new Set()); for (const b of ids) if (b !== a) nb.get(a).add(b) }
  }
  // stitch islands: each vertex of a small loop to the nearest vertex of
  // another small loop next to it (the nipple disc and the ring round it)
  for (const [a, la] of smallOf) {
    const va = wfirst[a]; let best = -1, bd = 0.6 * 0.6
    for (const [b, lb] of smallOf) {
      if (lb === la) continue
      const vb = wfirst[b], d = (P[va * 3] - P[vb * 3]) ** 2 + (P[va * 3 + 1] - P[vb * 3 + 1]) ** 2 + (P[va * 3 + 2] - P[vb * 3 + 2]) ** 2
      if (d < bd) { bd = d; best = b }
    }
    if (best >= 0 && nb.has(a) && nb.has(best)) { nb.get(a).add(best); nb.get(best).add(a) }
  }
  const used = [...nb.keys()]
  const bnbHas = a => bnb.has(a)
  // positions per welded vertex
  const wp = new Float32Array(W * 3), w0 = new Float32Array(W * 3), wn = new Float32Array(W * 3)
  for (const a of used) {
    const v = wfirst[a]
    for (let k = 0; k < 3; k++) { w0[a * 3 + k] = P[v * 3 + k]; wn[a * 3 + k] = Nn[v * 3 + k]; wp[a * 3 + k] = P[v * 3 + k] + Nn[v * 3 + k] * offset }
  }
  // the obstacle itself can be smoothed first (fabric does not follow small
  // bumps of the skin; the skin under it is hidden anyway)
  for (let it = 0; it < obstacleSmooth; it++) {
    const o = w0.slice()
    for (const a of used) {
      if (bnbHas(a)) continue
      let x = 0, y = 0, z = 0, c = 0
      for (const b of nb.get(a)) { x += o[b * 3]; y += o[b * 3 + 1]; z += o[b * 3 + 2]; c++ }
      w0[a * 3] = (o[a * 3] + x / c) / 2; w0[a * 3 + 1] = (o[a * 3 + 1] + y / c) / 2; w0[a * 3 + 2] = (o[a * 3 + 2] + z / c) / 2
      // (the skin under the garment is hidden, so the obstacle may dip below it)
    }
  }
  // gap may be a function of the body vertex (more room where the skin moves
  // most under the fabric)
  const gapOf = new Float32Array(W)
  for (const a of used) gapOf[a] = typeof gap === 'function' ? gap(wfirst[a], arrs) : gap
  if (typeof gap === 'function') for (let it = 0; it < 8; it++) {
    const o = gapOf.slice()
    for (const a of used) { let x = 0, c = 0; for (const b of nb.get(a)) { x += o[b]; c++ } gapOf[a] = 0.5 * o[a] + 0.5 * x / (c || 1) }
  }
  const tmp = new Float32Array(W * 3)
  const smooth = (ids, list, f) => {
    for (const a of ids) {
      const l = list(a)
      let x = 0, y = 0, z = 0
      for (const b of l) { x += wp[b * 3]; y += wp[b * 3 + 1]; z += wp[b * 3 + 2] }
      const c = l.length || 1
      tmp[a * 3] = wp[a * 3] * (1 - f) + x / c * f; tmp[a * 3 + 1] = wp[a * 3 + 1] * (1 - f) + y / c * f; tmp[a * 3 + 2] = wp[a * 3 + 2] * (1 - f) + z / c * f
    }
    for (const a of ids) {
      // stay outside the skin (along its normal)
      const dx = tmp[a * 3] - w0[a * 3], dy = tmp[a * 3 + 1] - w0[a * 3 + 1], dz = tmp[a * 3 + 2] - w0[a * 3 + 2]
      const d = dx * wn[a * 3] + dy * wn[a * 3 + 1] + dz * wn[a * 3 + 2]
      const k = d < gapOf[a] ? gapOf[a] - d : 0
      wp[a * 3] = tmp[a * 3] + wn[a * 3] * k; wp[a * 3 + 1] = tmp[a * 3 + 1] + wn[a * 3 + 1] * k; wp[a * 3 + 2] = tmp[a * 3 + 2] + wn[a * 3 + 2] * k
    }
  }
  const edgeIds = [...bnb.keys()].filter(a => bnb.get(a).length === 2)
  // (junctions of boundary edges are not part of a clean cut: smooth them as surface)
  const interior = used.filter(a => !bnb.has(a) || bnb.get(a).length !== 2)
  // cut edges as smooth curves first, then the surface with the edges held
  // (tidy cuts: Taubin's λ|μ steps, so a long smoothing does not shrink the line)
  for (let i = 0; i < edgeIterations; i++) smooth(edgeIds, a => bnb.get(a), tidy && i % 2 ? -0.53 : 0.5)
  for (let i = 0; i < iterations; i++) smooth(interior, a => [...nb.get(a)], 0.5)
  // spatial smoothing (by distance, not by connectivity): irons out small
  // features the mesh models as separate islands (the nipples)
  if (spatial > 0) {
    const cell = spatial, grid = new Map(), gk = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
    for (let pass = 0; pass < 3; pass++) {
      grid.clear()
      for (const a of used) { const k = gk(wp[a * 3], wp[a * 3 + 1], wp[a * 3 + 2]); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(a) }
      const out = wp.slice()
      for (const a of interior) {
        const x = wp[a * 3], y = wp[a * 3 + 1], z = wp[a * 3 + 2]
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell)
        let sx = 0, sy = 0, sz = 0, sw = 0
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!l) continue
          for (const b of l) {
            // same side of the body only (normals agree)
            if (wn[a * 3] * wn[b * 3] + wn[a * 3 + 1] * wn[b * 3 + 1] + wn[a * 3 + 2] * wn[b * 3 + 2] < 0.3) continue
            const d2 = (wp[b * 3] - x) ** 2 + (wp[b * 3 + 1] - y) ** 2 + (wp[b * 3 + 2] - z) ** 2
            if (d2 > cell * cell) continue
            const w = 1 - d2 / (cell * cell)
            sx += wp[b * 3] * w; sy += wp[b * 3 + 1] * w; sz += wp[b * 3 + 2] * w; sw += w
          }
        }
        if (sw) { out[a * 3] = sx / sw; out[a * 3 + 1] = sy / sw; out[a * 3 + 2] = sz / sw }
      }
      wp.set(out)
    }
  }

  // compact to the output geometry (unwelded, UVs kept)
  const map = new Int32Array(NV).fill(-1), src = []
  for (const v of tri) if (map[v] < 0) { map[v] = src.length; src.push(v) }
  const n = src.length
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
  src.forEach((v, i) => {
    const a = wid[v]
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = wp[a * 3 + k]
    uv[i * 2] = UV[v * 2]; uv[i * 2 + 1] = UV[v * 2 + 1]
    for (let k = 0; k < 4; k++) { si[i * 4 + k] = SI[v * 4 + k]; sw[i * 4 + k] = SW[v * 4 + k] }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  g.setIndex(tri.map(v => map[v]))
  g.computeVertexNormals()
  weld(g)
  if (part !== 'body') {
    // helper meshes do not keep a consistent winding: orient every vertex
    // normal by the body's, and the faces with it
    const n = g.attributes.normal.array, ix = g.index.array
    for (let i = 0; i < src.length; i++) {
      const v = src[i], d = n[i * 3] * Nn[v * 3] + n[i * 3 + 1] * Nn[v * 3 + 1] + n[i * 3 + 2] * Nn[v * 3 + 2]
      if (!(d > 0.3)) for (let k = 0; k < 3; k++) n[i * 3 + k] = Nn[v * 3 + k]
    }
    void ix
  }

  // edge loops (welded ids in order) with position, outward normal, weights
  const loops = []
  const seen = new Set()
  for (const s of edgeIds) {
    if (seen.has(s)) continue
    const loop = [s]; seen.add(s)
    let prev = -1, cur = s
    for (;;) {
      const nx = bnb.get(cur).find(b => b !== prev && !seen.has(b) && bnb.get(b)?.length === 2)
      if (nx === undefined) break
      loop.push(nx); seen.add(nx); prev = cur; cur = nx
    }
    if (loop.length < 6) continue
    loops.push(loop.map(a => {
      const v = wfirst[a]
      return {
        p: new THREE.Vector3(wp[a * 3], wp[a * 3 + 1], wp[a * 3 + 2]),
        n: new THREE.Vector3(wn[a * 3], wn[a * 3 + 1], wn[a * 3 + 2]),
        si: [SI[v * 4], SI[v * 4 + 1], SI[v * 4 + 2], SI[v * 4 + 3]],
        sw: [SW[v * 4], SW[v * 4 + 1], SW[v * 4 + 2], SW[v * 4 + 3]],
      }
    }))
  }
  // body triangles fully under the garment (not touching its edge)
  const covered = []
  for (let i = 0; i < triAt.length; i++) if (!bnb.has(wid[tri[i * 3]]) && !bnb.has(wid[tri[i * 3 + 1]]) && !bnb.has(wid[tri[i * 3 + 2]])) covered.push(triAt[i])
  // all kept triangles, including the ring along the cut (the skin there
  // pokes through when the arms move; the hem covers the edge)
  const coveredAll = triAt.slice()
  return { geometry: g, loops, covered, coveredAll }
}

// A rolled hem along each loop: a tube of radius r, skinned like the edge.
// open: the loops are paths (not closed), e.g. a trim across the front.
export function piping(loops, r = 0.3, sides = 6, open = false) {
  const pos = [], nor = [], si = [], sw = [], uv = [], idx = []
  const T = new THREE.Vector3(), B = new THREE.Vector3(), q = new THREE.Vector3()
  for (const loop of loops) {
    const L = loop.length, base = pos.length / 3
    for (let i = 0; i < L; i++) {
      const a = open ? loop[Math.max(0, i - 1)] : loop[(i + L - 1) % L], c = open ? loop[Math.min(L - 1, i + 1)] : loop[(i + 1) % L], e = loop[i]
      T.copy(c.p).sub(a.p).normalize()
      B.copy(T).cross(e.n).normalize()
      const N = e.n.clone().addScaledVector(T, -e.n.dot(T)).normalize()
      for (let s = 0; s < sides; s++) {
        const th = s / sides * Math.PI * 2
        q.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th))
        pos.push(e.p.x + q.x * r + N.x * r * 0.3, e.p.y + q.y * r + N.y * r * 0.3, e.p.z + q.z * r + N.z * r * 0.3)
        nor.push(q.x, q.y, q.z)
        si.push(...e.si); sw.push(...e.sw)
        uv.push(i * 0.05, s / sides)
      }
    }
    for (let i = 0; i < (open ? L - 1 : L); i++) for (let s = 0; s < sides; s++) {
      const a = base + i * sides + s, b = base + i * sides + (s + 1) % sides
      const c = base + ((i + 1) % L) * sides + s, d = base + ((i + 1) % L) * sides + (s + 1) % sides
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  g.setIndex(idx)
  return g
}

export function skinned(ch, geometry, material) {
  const m = new THREE.SkinnedMesh(geometry, material)
  m.castShadow = m.receiveShadow = true
  m.frustumCulled = false
  ch.group.add(m)
  m.bind(ch.skeleton, new THREE.Matrix4())
  return m
}

// normals for a helper shell: those of the nearest body vertex
function borrowNormals(ch, P) {
  const b = ch.parts.body.geometry, BP = b.attributes.position.array, BN = b.attributes.normal.array
  const out = new Float32Array(P.length)
  const CELL = 2, grid = new Map(), key = (x, y, z) => `${x},${y},${z}`
  for (let i = 0; i < BP.length / 3; i++) {
    const k = key(Math.floor(BP[i * 3] / CELL), Math.floor(BP[i * 3 + 1] / CELL), Math.floor(BP[i * 3 + 2] / CELL))
    let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i)
  }
  for (let v = 0; v < P.length / 3; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]
    let best = -1, bd = 1e9
    for (let r = 1; r <= 4 && best < 0; r++) {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL)
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue
        for (const i of l) { const d = (BP[i * 3] - x) ** 2 + (BP[i * 3 + 1] - y) ** 2 + (BP[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i } }
      }
    }
    if (best >= 0) for (let k = 0; k < 3; k++) out[v * 3 + k] = BN[best * 3 + k]
  }
  return out
}

function weld(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array
  const map = new Map()
  for (let i = 0; i < p.length / 3; i++) {
    const k = `${Math.round(p[i * 3] * 1000)},${Math.round(p[i * 3 + 1] * 1000)},${Math.round(p[i * 3 + 2] * 1000)}`
    let l = map.get(k); if (!l) map.set(k, l = []); l.push(i)
  }
  for (const l of map.values()) {
    if (l.length < 2) continue
    let x = 0, y = 0, z = 0
    for (const i of l) { x += n[i * 3]; y += n[i * 3 + 1]; z += n[i * 3 + 2] }
    const len = Math.hypot(x, y, z) || 1
    for (const i of l) { n[i * 3] = x / len; n[i * 3 + 1] = y / len; n[i * 3 + 2] = z / len }
  }
}

// Body triangles lying just under a garment that its author's delete group
// missed (they poke through the fabric: the turtleneck's chest). A body
// vertex is under the garment when the nearest garment vertex (not within `rings`
// rings of the garment's open edges) is within `reach` cm and lies out along the skin's normal; a
// triangle goes when all three of its vertices are. Rest pose for both.
export function underGarment(ch, gg, already = [], { rings = 2, reach = 2 } = {}) {
  const GP = gg.attributes.position.array
  const n = GP.length / 3, q = 0.01
  // weld by position, count edge uses: vertices on an open edge are skipped
  const wid = new Int32Array(n), keyOf = new Map()
  for (let i = 0; i < n; i++) { const k = `${Math.round(GP[i * 3] / q)},${Math.round(GP[i * 3 + 1] / q)},${Math.round(GP[i * 3 + 2] / q)}`; let w = keyOf.get(k); if (w === undefined) keyOf.set(k, w = keyOf.size); wid[i] = w }
  const ix = gg.index ? gg.index.array : [...Array(n).keys()], edges = new Map()
  for (let t = 0; t < ix.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = wid[ix[t + k]], b = wid[ix[t + (k + 1) % 3]], e = a < b ? a * 1e7 + b : b * 1e7 + a
    edges.set(e, (edges.get(e) || 0) + 1)
  }
  const open = new Set()
  for (const [e, c] of edges) if (c === 1) { open.add(Math.floor(e / 1e7)); open.add(e % 1e7) }
  // two rings in from the open edge too (the hem: skin past it must stay)
  for (let ring = 0; ring < rings; ring++) {
    const add = []
    for (const e of edges.keys()) { const a = Math.floor(e / 1e7), b = e % 1e7; if (open.has(a) !== open.has(b)) add.push(open.has(a) ? b : a) }
    for (const v of add) open.add(v)
  }
  const CELL = 2, grid = new Map(), gk = (x, y, z) => `${x},${y},${z}`
  for (let i = 0; i < n; i++) {
    if (open.has(wid[i])) continue
    const k = gk(Math.floor(GP[i * 3] / CELL), Math.floor(GP[i * 3 + 1] / CELL), Math.floor(GP[i * 3 + 2] / CELL))
    let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i)
  }
  const BP = ch.parts.body.geometry.attributes.position.array, BN = ch.parts.body.geometry.attributes.normal.array, NB = BP.length / 3
  const under = new Uint8Array(NB)
  for (let v = 0; v < NB; v++) {
    const x = BP[v * 3], y = BP[v * 3 + 1], z = BP[v * 3 + 2]
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL)
    let best = -1, bd = reach * reach
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const i of grid.get(gk(cx + dx, cy + dy, cz + dz)) || []) {
      const d = (GP[i * 3] - x) ** 2 + (GP[i * 3 + 1] - y) ** 2 + (GP[i * 3 + 2] - z) ** 2
      if (d < bd) { bd = d; best = i }
    }
    if (best < 0) continue
    // the garment point lies out from the skin (along the body's normal), not beside it
    const s = (GP[best * 3] - x) * BN[v * 3] + (GP[best * 3 + 1] - y) * BN[v * 3 + 1] + (GP[best * 3 + 2] - z) * BN[v * 3 + 2]
    if (s > -0.25 && s * s > bd * 0.25) under[v] = 1
  }
  const idx = bodyIndex(ch), have = new Set(already), out = []
  for (let t = 0; t < idx.length; t += 3) if (!have.has(t) && under[idx[t]] && under[idx[t + 1]] && under[idx[t + 2]]) out.push(t)
  return out
}
