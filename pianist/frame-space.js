// Where on screen the pianist and the piano are, for placing intertitles
// (#045: Automatic intertitle position). Not the pianist alone: a line in the
// corner away from her can still sit across the lid or the tail.
//
//   const space = createFrameSpace({ objects: [piano.root], skeleton: ch.skeleton })
//   space.measure(camera)                        // once, when an intertitle appears
//   space.cover({ u0, v0, u1, v1 })              // 0..1: how much of that part of the frame they fill
//   space.pick(camera, PLACES, fallback)         // the place they fill least
//
// The objects (the piano, its bench) are sampled once: points spread over
// their surfaces by area, in each mesh's own space, so the lid and keys follow
// the meshes as they move. The pianist is skinned, so she is taken from her
// skeleton instead: each bone to its parent as a thick segment (her body,
// arms and hair are a few centimetres to a hand's width around the bones).
// Both are projected into a coarse grid over the frame; a cell she covers
// counts double, her head three times (a line over her face is the worst).
// Frame coordinates: u from the left, v from the top, 0..1.

import * as THREE from 'three'

const GX = 48, GY = 27

export function createFrameSpace({ objects = [], skeleton = null, samples = 4000, seed = 7 } = {}) {
  const grid = new Float32Array(GX * GY)
  // a small seeded generator, so the same frame always gives the same answer
  let a = seed >>> 0
  const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }

  // ── surface samples of the rigid objects ──
  let pts = null   // [{ mesh, local: Float32Array }]
  function sample() {
    const meshes = []
    for (const root of objects) root?.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry?.attributes.position) meshes.push(o) })
    const tris = [], P = new THREE.Vector3(), Q = new THREE.Vector3(), R = new THREE.Vector3(), s = new THREE.Vector3()
    let total = 0
    for (const m of meshes) {
      const g = m.geometry, pos = g.attributes.position, idx = g.index
      const n = idx ? idx.count / 3 : pos.count / 3
      m.updateWorldMatrix(true, false); s.setFromMatrixScale(m.matrixWorld)
      const k = Math.abs(s.x * s.y * s.z) ** (2 / 3) || 1
      // (big meshes: every few triangles, enough to find their area)
      const step = Math.max(1, Math.floor(n / 4000))
      for (let t = 0; t < n; t += step) {
        const i0 = idx ? idx.getX(3 * t) : 3 * t, i1 = idx ? idx.getX(3 * t + 1) : 3 * t + 1, i2 = idx ? idx.getX(3 * t + 2) : 3 * t + 2
        P.fromBufferAttribute(pos, i0); Q.fromBufferAttribute(pos, i1); R.fromBufferAttribute(pos, i2)
        const area = Q.sub(P).cross(R.sub(P)).length() / 2 * k * step
        if (!(area > 0)) continue
        total += area; tris.push([m, i0, i1, i2, total])
      }
    }
    const byMesh = new Map()
    if (!tris.length) return []
    for (let j = 0; j < samples; j++) {
      // a triangle by area, a point in it
      const x = rnd() * total
      let lo = 0, hi = tris.length - 1
      while (lo < hi) { const md = (lo + hi) >> 1; if (tris[md][4] < x) lo = md + 1; else hi = md }
      const [m, i0, i1, i2] = tris[lo], pos = m.geometry.attributes.position
      let r1 = rnd(), r2 = rnd(); if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2 }
      P.fromBufferAttribute(pos, i0); Q.fromBufferAttribute(pos, i1).sub(P); R.fromBufferAttribute(pos, i2).sub(P)
      P.addScaledVector(Q, r1).addScaledVector(R, r2)
      if (!byMesh.has(m)) byMesh.set(m, [])
      byMesh.get(m).push(P.x, P.y, P.z)
    }
    return [...byMesh].map(([mesh, l]) => ({ mesh, local: Float32Array.from(l) }))
  }
  const visible = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true }

  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Vector3()
  function mark(u, v, w) {
    const i = Math.floor(u * GX), j = Math.floor(v * GY)
    if (i < 0 || j < 0 || i >= GX || j >= GY) return
    const c = j * GX + i; if (grid[c] < w) grid[c] = w
  }
  // a world point's place in the frame, and its depth; null behind the camera
  function toFrame(p, camera) {
    _c.copy(p).applyMatrix4(camera.matrixWorldInverse)
    if (_c.z > -1) return null
    _v.copy(p).project(camera)
    return { u: (_v.x + 1) / 2, v: (1 - _v.y) / 2, depth: -_c.z }
  }
  // a ball of radius r (cm) at p: every cell it covers
  function ball(p, r, w, camera) {
    const f = toFrame(p, camera); if (!f) return
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (camera.zoom || 1)
    const rv = r / (f.depth * tanY) / 2, ru = rv / camera.aspect
    const i0 = Math.floor((f.u - ru) * GX), i1 = Math.floor((f.u + ru) * GX), j0 = Math.floor((f.v - rv) * GY), j1 = Math.floor((f.v + rv) * GY)
    for (let j = Math.max(0, j0); j <= Math.min(GY - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(GX - 1, i1); i++) {
      const du = ((i + 0.5) / GX - f.u) / ru, dv = ((j + 0.5) / GY - f.v) / rv
      if (du * du + dv * dv <= 1.3) { const c = j * GX + i; if (grid[c] < w) grid[c] = w }
    }
  }

  function measure(camera) {
    grid.fill(0)
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    pts ||= sample()
    for (const { mesh, local } of pts) {
      if (!visible(mesh)) continue
      mesh.updateWorldMatrix(true, false)
      for (let k = 0; k < local.length; k += 3) {
        const f = toFrame(_w.set(local[k], local[k + 1], local[k + 2]).applyMatrix4(mesh.matrixWorld), camera)
        if (f) mark(f.u, f.v, 1)
      }
    }
    // the samples are points: close one-cell gaps inside the silhouette
    // (a cell between two covered neighbours, across or down, is covered)
    const g0 = grid.slice()
    for (let j = 1; j < GY - 1; j++) for (let i = 1; i < GX - 1; i++) {
      const c = j * GX + i
      if (!g0[c] && ((g0[c - 1] && g0[c + 1]) || (g0[c - GX] && g0[c + GX]))) grid[c] = Math.min(g0[c - 1] || g0[c - GX], 1)
    }
    if (skeleton && visible(skeleton.bones[0])) {
      for (const b of skeleton.bones) {
        b.getWorldPosition(_w)
        const name = b.name.toLowerCase(), head = /head|neck/.test(name)
        const r = head ? 13 : /finger|toe|eye|jaw|tongue|special|breast/.test(name) ? 3 : /hand|wrist|foot/.test(name) ? 5 : 11
        ball(_w, r, head ? 3 : 2, camera)
        // along to its parent, every few centimetres
        if (b.parent?.isBone) {
          const p = b.parent.getWorldPosition(new THREE.Vector3()), d = p.distanceTo(_w), n = Math.ceil(d / 6)
          for (let k = 1; k < n; k++) ball(_v.lerpVectors(_w, p, k / n).clone(), r, head ? 3 : 2, camera)
        }
      }
    }
    return grid
  }

  /**
   * how much of the rectangle (frame fractions) they fill, weighted, plus a
   * fixed cost for her being in it at all (a small figure in a wide shot is
   * still not to be written over): 0 .. ~3.4
   */
  function cover({ u0, v0, u1, v1 }) {
    let s = 0, n = 0, top = 0
    for (let j = Math.max(0, Math.floor(v0 * GY)); j < Math.min(GY, Math.ceil(v1 * GY)); j++)
      for (let i = Math.max(0, Math.floor(u0 * GX)); i < Math.min(GX, Math.ceil(u1 * GX)); i++) { const w = grid[j * GX + i]; s += w; n++; if (w > top) top = w }
    return n ? s / n + (top >= 2 ? 0.15 * (top - 1) : 0) : 0
  }

  /**
   * places: { name: { u0, v0, u1, v1 } }. The emptiest; `prefer` (a name) wins
   * unless another is clearly emptier (by `margin`), so the choice doesn't
   * flip on a few cells.
   */
  function pick(camera, places, prefer = null, margin = 0.04) {
    measure(camera)
    let best = null, bs = Infinity
    const sc = {}
    for (const [k, r] of Object.entries(places)) { sc[k] = cover(r); if (sc[k] < bs) { bs = sc[k]; best = k } }
    if (prefer in sc && sc[prefer] <= bs + margin) best = prefer
    return { place: best, scores: sc }
  }

  return { measure, cover, pick, grid, size: [GX, GY] }
}

/**
 * The parts of the frame each intertitle place takes (liner/overlay.js
 * drawIntertitle: corners 6 % in, up to 46 % wide, the bottom block ending
 * 21 % up, the top one starting 15 % down), with a little room around.
 */
export const LANDSCAPE_PLACES = {
  'bottom-left': { u0: 0.03, v0: 0.56, u1: 0.5, v1: 0.82 },
  'bottom-right': { u0: 0.5, v0: 0.56, u1: 0.97, v1: 0.82 },
  'top-left': { u0: 0.03, v0: 0.12, u1: 0.5, v1: 0.38 },
  'top-right': { u0: 0.5, v0: 0.12, u1: 0.97, v1: 0.38 },
}
/** a tall frame's two places, inside its safe area (fractions) */
export const portraitPlaces = safe => ({
  'top-center': { u0: safe.x0, v0: safe.y0, u1: safe.x1, v1: safe.y0 + 0.13 },
  'bottom-center': { u0: safe.x0, v0: safe.y1 - 0.13, u1: safe.x1, v1: safe.y1 },
})
