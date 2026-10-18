// A black jacket or tailcoat for the VRoid violinists (Experiment #037).
//
// Cut from the character's own skin mesh, the way #032's dress starts from
// the body: every triangle of the body skin (VRoid's "Body" primitive, which
// all the VRoid samples share) whose vertices belong to the torso and arms is
// copied, pushed out along its normals and skinned with the body's own
// weights, so it moves with the rig exactly.
//
//  • jacket: from the neck to just below the seat, sleeves to the wrist; a V
//    opening in front from the collar to the button (the shirt and tie show
//    through), satin lapels along the opening, the collar standing a little
//    off the neck;
//  • tails: the front is cut away at the waist and two tails hang behind to
//    the back of the knees, split up the middle. They take their weights from
//    the hips more than the legs so they hang rather than wrap the thighs.
//
// Everything is in the model's units (metres) in its bind pose, where the
// VRoid figures face −z and stand on y = 0.

import * as THREE from 'three'

const TORSO = /Spine|Chest|Shoulder|UpperArm|LowerArm|Neck|Hips|UpperLeg/

/** Landmarks (bind pose, metres) and the shape of the front opening. */
function cut(skeleton) {
  const bones = skeleton.bones
  const bindPos = name => {
    const i = bones.findIndex(b => b.name.endsWith(name))
    return new THREE.Vector3().setFromMatrixPosition(skeleton.boneInverses[i].clone().invert())
  }
  const yNeck = bindPos('C_Neck').y, yHips = bindPos('C_Hips').y, yKnee = bindPos('L_LowerLeg').y
  const C = {
    yNeck, yHips, yKnee, yChest: bindPos('C_UpperChest').y,
    hem: yHips - 0.11,                 // jacket: just below the seat
    waist: yHips + 0.07,               // tailcoat front cut
    tailEnd: yKnee + 0.04,
    button: yHips + 0.12,              // one button, a little above the hips
    xWrist: Math.abs(bindPos('L_Hand').x) - 0.012,
  }
  /** half width of the V opening at height y (0 below the button) */
  C.vHalf = y => (y <= C.button || y > yNeck + 0.03 ? 0 : 0.006 + 0.075 * Math.min(1, (y - C.button) / (yNeck - C.button)) ** 0.8)
  return C
}

/**
 * The shirt-and-vest mesh under the jacket, trimmed to what still shows (the
 * collar and the V opening; for the tailcoat also the waistcoat below the
 * front cut) so its vest can't poke through the jacket.
 */
export function trimUnder(geo, skeleton, style = 'jacket') {
  const C = cut(skeleton)
  const P = geo.attributes.position, N = geo.attributes.normal
  const show = new Uint8Array(P.count)
  const p = new THREE.Vector3(), n = new THREE.Vector3()
  for (let v = 0; v < P.count; v++) {
    p.fromBufferAttribute(P, v); n.fromBufferAttribute(N, v)
    const front = n.z < 0.1
    show[v] = (p.y > C.yNeck - 0.01 && Math.abs(p.x) < 0.09) ||
      (front && p.y > C.button - 0.01 && Math.abs(p.x) < C.vHalf(p.y) + 0.065) ||
      (style === 'tails' && front && p.y < C.waist + 0.03 && Math.abs(p.x) < 0.2)
  }
  const src = geo.index.array, g0 = geo.groups[0] || { start: 0, count: src.length }, keep = []
  for (let i = g0.start; i < g0.start + g0.count; i += 3) if (show[src[i]] && show[src[i + 1]] && show[src[i + 2]]) keep.push(src[i], src[i + 1], src[i + 2])
  const g = geo.clone()
  g.setIndex(keep); g.clearGroups(); g.addGroup(0, keep.length, 0); g.addGroup(0, keep.length, 1)
  return g
}

/**
 * body: the character's body-skin SkinnedMesh (bound to the character's
 * skeleton). Returns a SkinnedMesh to add next to it.
 * opts: { style: 'jacket' | 'tails', thick, under: geometries worn beneath (the
 * shirt and vest), which the shell is pushed out to clear }
 */
export function buildJacket(body, { style = 'jacket', thick = 0.008, under = [] } = {}) {
  const geo = body.geometry
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight
  const bones = body.skeleton.bones
  const boneName = i => bones[i]?.name || ''
  const idxOf = re => bones.findIndex(b => re.test(b.name))
  const HIPS = idxOf(/C_Hips$/)
  const nv = P.count
  // dominant bone of each vertex, and how much of it is hand / head / leg below the knee
  const dom = new Array(nv), wOf = (v, re) => { let w = 0; for (let k = 0; k < 4; k++) if (re.test(boneName(SI.getComponent(v, k)))) w += SW.getComponent(v, k); return w }
  for (let v = 0; v < nv; v++) {
    let b = 0, w = -1
    for (let k = 0; k < 4; k++) if (SW.getComponent(v, k) > w) { w = SW.getComponent(v, k); b = SI.getComponent(v, k) }
    dom[v] = boneName(b)
  }
  const C = cut(body.skeleton)
  const { yNeck, yChest, hem, waist, tailEnd, button, xWrist } = C
  // which vertices the garment keeps
  const keep = new Uint8Array(nv), tail = new Float32Array(nv)
  const _p = new THREE.Vector3(), _n = new THREE.Vector3()
  for (let v = 0; v < nv; v++) {
    const d = dom[v]
    if (!TORSO.test(d)) continue
    _p.fromBufferAttribute(P, v); _n.fromBufferAttribute(N, v)
    if (/Neck/.test(d) && _p.y > yNeck + 0.025) continue            // collar stands a little up the neck
    if (Math.abs(_p.x) > xWrist) continue                              // sleeves end at the wrist
    if (wOf(v, /Hand|Thumb|Index|Middle|Ring|Little/) > 0.2) continue
    const front = _n.z < -0.15, back = _n.z > 0.15
    if (style === 'tails') {
      if (_p.y < waist && !back) continue
      if (_p.y < waist) {
        if (_p.y < tailEnd || Math.abs(_p.x) < 0.012) continue        // the split up the middle
        tail[v] = (waist - _p.y) / (waist - tailEnd)
      }
    } else if (_p.y < hem) continue
    // V opening in front: from the sides of the collar down to the button
    if (front && Math.abs(_p.x) < C.vHalf(_p.y)) continue
    keep[v] = 1
  }

  // clearance: how far each kept vertex must move out along its normal to clear
  // the clothes beneath (nearest of their vertices within 3 cm sideways)
  const clear = new Float32Array(nv)
  {
    const U = []
    for (const g of under) { const A = g.attributes.position; for (let i = 0; i < A.count; i++) U.push(A.getX(i), A.getY(i), A.getZ(i)) }
    const cell = 0.03, grid = new Map()
    const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
    for (let i = 0; i < U.length; i += 3) { const k = key(U[i], U[i + 1], U[i + 2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i) }
    const q = new THREE.Vector3()
    for (let v = 0; v < nv; v++) {
      if (!keep[v]) continue
      _p.fromBufferAttribute(P, v); _n.fromBufferAttribute(N, v)
      let best = 0
      const cx = Math.floor(_p.x / cell), cy = Math.floor(_p.y / cell), cz = Math.floor(_p.z / cell)
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const list = grid.get(`${cx + a},${cy + b},${cz + c}`)
        if (list) for (const i of list) {
          q.set(U[i] - _p.x, U[i + 1] - _p.y, U[i + 2] - _p.z)
          const along = q.dot(_n)
          if (along <= 0 || along > 0.06) continue
          const side = Math.sqrt(Math.max(0, q.lengthSq() - along * along))
          if (side < 0.025) best = Math.max(best, along)
        }
      }
      clear[v] = best
    }
  }

  // compact the vertex set
  const map = new Int32Array(nv).fill(-1)
  const pos = [], nor = [], si = [], sw = [], lapV = []
  for (let v = 0; v < nv; v++) {
    if (!keep[v]) continue
    map[v] = pos.length / 3
    _p.fromBufferAttribute(P, v); _n.fromBufferAttribute(N, v)
    // a little looser over the chest and back and round the upper arm; tails hang free
    const t = tail[v]
    const loose = clear[v] + thick * (1 + (/UpperArm/.test(dom[v]) ? 0.3 : 0) + (/Chest/.test(dom[v]) ? 0.3 : 0)) + 0.06 * t * t
    _p.addScaledVector(_n, loose)
    if (t) _p.z += 0.02 * t
    pos.push(_p.x, _p.y, _p.z); nor.push(_n.x, _n.y, _n.z)
    let ids = [0, 1, 2, 3].map(k => SI.getComponent(v, k)), ws = [0, 1, 2, 3].map(k => SW.getComponent(v, k))
    if (t) {
      // tails: mostly the hips, a little of the legs
      const keepLeg = 0.35 * (1 - t)
      ws = ws.map((w, k) => (/UpperLeg|LowerLeg/.test(boneName(ids[k])) ? w * keepLeg : w))
      const s = ws.reduce((a, b) => a + b, 0)
      ids = [HIPS, ...ids.slice(0, 3)]
      ws = [1 - s, ...ws.slice(0, 3)]
      const s2 = ws.reduce((a, b) => a + b, 0)
      ws = ws.map(w => w / s2)
    }
    si.push(...ids); sw.push(...ws)
    // lapels: the band along the V opening, satin black
    const front = _n.z < -0.15
    let lap = 0
    if (front && _p.y > yChest - 0.12 && _p.y < yNeck + 0.03) lap = Math.abs(_p.x) < C.vHalf(_p.y) + 0.045 ? 1 : 0
    lapV.push(lap)
  }
  const cloth = [], lapels = []
  const src = geo.index.array, g0 = geo.groups[0] || { start: 0, count: src.length }
  for (let i = g0.start; i < g0.start + g0.count; i += 3) {
    const a = map[src[i]], b = map[src[i + 1]], c = map[src[i + 2]]
    if (a >= 0 && b >= 0 && c >= 0) (lapV[a] && lapV[b] && lapV[c] ? lapels : cloth).push(a, b, c)
  }
  const index = [...cloth, ...lapels]
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  out.setIndex(index)
  // smooth the cut: average normals at shared positions so the shell has no seams
  out.computeVertexNormals()
  // groups: cloth (material 0), lapels (material 2), the outline over all (material 1)
  out.addGroup(0, cloth.length, 0)
  out.addGroup(cloth.length, lapels.length, 2)
  out.addGroup(0, index.length, 1)
  return { geometry: out, stats: { verts: pos.length / 3, tris: index.length / 3 } }
}

/** MToon materials cloned from a cloth material pair: [cloth, outline, lapel satin]. */
export function jacketMaterials(srcMats, { color = 0x1a1a20, lapel = 0x07070a } = {}) {
  const mk = (m, col) => {
    const c = m.clone()
    c.map = null
    if (c.shadeMultiplyTexture !== undefined) c.shadeMultiplyTexture = null
    if (c.normalMap !== undefined) c.normalMap = null
    if (c.matcapTexture !== undefined) c.matcapTexture = null
    if (c.rimMultiplyTexture !== undefined) c.rimMultiplyTexture = null
    c.color.setHex(col)
    if (c.shadeColorFactor) c.shadeColorFactor.setHex(col).multiplyScalar(0.45)
    c.needsUpdate = true
    return c
  }
  const lap = mk(srcMats[0], lapel)
  // satin: a stronger warm rim on the lapels
  if (lap.parametricRimColorFactor) { lap.parametricRimColorFactor.setRGB(0.16, 0.14, 0.13); lap.parametricRimFresnelPowerFactor = 3 }
  return [mk(srcMats[0], color), srcMats[1] ? srcMats[1].clone() : mk(srcMats[0], 0), lap]
}
