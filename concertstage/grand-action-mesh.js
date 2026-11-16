// The hammers of a grand, drawn from grand-action.js's numbers (concert-grand.js).
//
// One instanced mesh for the 88 heads, one for the shanks and knuckles, and an
// additive one for motion blur: a hammer's whole trip from let-off to the
// string and back down to the check takes 5 to 10 ms, less than a frame, so
// at 60 frames a second a strike would mostly not be seen at all. A hammer that
// reached the string during the last frame leaves a faint streak there, as it
// would on a film camera's exposure.
//
// A head, seen from the side (along its string), is pear-shaped: white felt
// over a red underfelt over a wooden core, glued into a moulding whose tail
// points at the player (the backcheck catches it there). Its crown is the
// local origin; the shank runs from the moulding toward the player (+z) to its
// flange, the pivot. At the strike the shank is level and the crown is at the
// string; at rest the hammer has swung down about its flange by the blow
// distance. Heads are graded: the bass ones a third larger than the treble.

import * as THREE from 'three'

export const HAMMER = {
  crown: 0.6,          // crown radius, side view (cm)
  felt: 3.0,           // felt height above the moulding
  base: 1.2,           // half the felt's length along the string at its foot
  under: 0.42,         // outer felt thickness (to the underfelt)
  core: 0.56,          // to the wooden core
  shankDrop: 4.1,      // crown to the shank's centre line
  shank: 12.5,         // strike point to the flange centre, along the string
}

// a closed side profile inset by i from the outer felt: [z, y] points, crown at 0
function profile(i, steps = 20) {
  const { crown: r0, felt: H, base: b } = HAMMER
  const r = Math.max(0.1, r0 - i), half = b - i, pts = []
  const q = (p0, c, p1, n) => { for (let s = 1; s <= n; s++) { const t = s / n, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]) } }
  pts.push([-half, -H])
  q([-half, -H], [-half, -1.35], [-r, -r0], steps)
  for (let s = 1; s < steps; s++) { const a = Math.PI - Math.PI * s / steps; pts.push([r * Math.cos(a), -r0 + r * Math.sin(a)]) }
  pts.push([r, -r0])
  q([r, -r0], [half, -1.35], [half, -H], steps)
  return pts
}

const shapeOf = pts => new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)))

// extruded across x (the hammer's width, 1 unit), its side profile in the z-y
// plane, with one colour; the curved faces smooth, the flanks flat
function slab(shape, width, color, bevel = 0, round = true) {
  let g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 })
  if (g.index) g = g.toNonIndexed()
  // shape x -> z, shape y -> y, extrusion z -> -x (a rotation, so the faces keep their winding), centred
  g.translate(0, 0, -width / 2)
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1))
  if (round) smoothSides(g)
  const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color)
  for (let i = 0; i < n; i++) col.toArray(c, i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(c, 3))
  return g
}

// average the normals of the extrusion's side walls (group 1) where they share
// a corner, so a curved profile shades round; the two flanks (group 0) stay flat
function smoothSides(g) {
  const p = g.attributes.position.array, nor = g.attributes.normal.array
  const side = g.groups.find(x => x.materialIndex === 1)
  if (!side) return
  const key = i => `${p[i * 3].toFixed(4)},${p[i * 3 + 1].toFixed(4)},${p[i * 3 + 2].toFixed(4)}`
  const acc = new Map()
  for (let i = side.start; i < side.start + side.count; i++) {
    const k = key(i)
    const v = acc.get(k) || acc.set(k, new THREE.Vector3()).get(k)
    v.x += nor[i * 3]; v.y += nor[i * 3 + 1]; v.z += nor[i * 3 + 2]
  }
  for (let i = side.start; i < side.start + side.count; i++) {
    const v = acc.get(key(i))
    if (!v || v.lengthSq() < 1e-12) continue
    v.normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z
  }
}

function merge(geos) {
  let n = 0
  for (const g of geos) n += g.attributes.position.count
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3)
  let o = 0
  for (const g of geos) {
    const p = g.attributes.position, m = p.count
    if (!g.attributes.normal) g.computeVertexNormals()
    pos.set(p.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3)
    o += m; g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return out
}

const FELT = 0xf4f1ea, UNDERFELT = 0x9a1420, CORE = 0xc89a62, MOULDING = 0xd0a46a, SHANK = 0xd9b98a, BUCKSKIN = 0x8a6a4c

export function hammerHeadGeometry() {
  const H = HAMMER.felt
  const felt = slab(shapeOf(profile(0)), 1, FELT)
  // the layers show on the head's flanks: each inner layer a hair wider
  const under = slab(shapeOf(profile(HAMMER.under)), 1.012, UNDERFELT)
  const core = slab(shapeOf(profile(HAMMER.core)), 1.024, CORE)
  // the moulding: under the felt, its tail toward the player, holding the shank
  const m = [[-1.25, -H + 0.06], [1.05, -H + 0.06], [2.55, -H - 0.45], [2.45, -H - 1.15], [0.2, -H - 1.6], [-1.05, -H - 1.45], [-1.3, -H - 0.8]]
  const moulding = slab(shapeOf(m), 0.82, MOULDING, 0.04, false)
  return merge([felt, under, core, moulding])
}

export function hammerShankGeometry() {
  const { shank: L, shankDrop: y } = HAMMER
  const s = new THREE.CylinderGeometry(0.27, 0.3, L + 0.4, 8)
  s.rotateX(Math.PI / 2); s.translate(0, -y, (L + 0.4) / 2 - 0.4)
  // the knuckle: a buckskin-covered roll under the shank that the jack pushes
  const k = new THREE.CylinderGeometry(0.55, 0.55, 0.85, 12)
  k.rotateZ(Math.PI / 2); k.translate(0, -y - 0.6, L - 3.4)
  const paint = (g, color) => {
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color)
    for (let i = 0; i < n; i++) col.toArray(c, i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g.index ? g.toNonIndexed() : g
  }
  return merge([paint(s, SHANK), paint(k, BUCKSKIN)])
}

// The row of hammers. `list`: per key { x, y, z } of the strike point (the
// crown at the string), `rotY` (the string's direction), `width`, `grade`.
export function createHammerRow(list, { feltMaterial, woodMaterial, blow } = {}) {
  const group = new THREE.Group()
  group.name = 'hammers'
  const headMat = feltMaterial ?? new THREE.MeshPhysicalMaterial({ roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: 0xffffff })
  headMat.vertexColors = true
  const shankMat = woodMaterial ?? new THREE.MeshStandardMaterial({ roughness: 0.6 })
  shankMat.vertexColors = true
  const n = list.length
  const heads = new THREE.InstancedMesh(hammerHeadGeometry(), headMat, n)
  const shanks = new THREE.InstancedMesh(hammerShankGeometry(), shankMat, n)
  const blurMat = new THREE.MeshBasicMaterial({ color: 0x8a8780, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true })
  const blur = new THREE.InstancedMesh(heads.geometry.clone(), blurMat, n * 2)
  blur.count = 0; blur.visible = false; blur.castShadow = false; blur.frustumCulled = false
  for (const m of [heads, shanks]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false }
  group.add(heads, shanks, blur)

  const M = new THREE.Matrix4(), T = new THREE.Matrix4(), Rx = new THREE.Matrix4(), S = new THREE.Matrix4()
  const keys = list.map(e => {
    const g = e.grade ?? 1
    const d = HAMMER.shankDrop * g, L = HAMMER.shank * g
    // the shanks run with the keys, straight back from the player; the bass
    // heads are turned on their shanks to meet their slanting strings
    const base = new THREE.Matrix4().makeTranslation(e.x, e.y, e.z)
    const turn = new THREE.Matrix4().makeRotationY(e.rotY)
    return { ...e, g, d, L, r: Math.hypot(d, L), phi: Math.atan2(d, L), base, turn }
  })
  // the swing about the flange that puts the crown `lift` cm above rest
  const angle = (e, lift) => Math.asin(THREE.MathUtils.clamp((e.d + lift - blow) / e.r, -1, 1)) - e.phi
  const place = (e, lift, shift, head) => {
    const a = angle(e, lift)
    M.makeTranslation(shift, 0, 0).multiply(e.base)
    T.makeTranslation(0, -e.d, e.L); M.multiply(T)
    Rx.makeRotationX(a); M.multiply(Rx)
    T.makeTranslation(0, e.d, -e.L); M.multiply(T)
    if (head) M.multiply(e.turn)
    S.makeScale(head ? e.width : 1, e.g, e.g); M.multiply(S)
    return M
  }

  const api = {
    group, heads, shanks, blur, motionBlur: true,
    // lifts: hammer lift (cm from rest) per key; ranges: [min, max] over the
    // last frame per key, or null; shift: una corda (cm to the treble)
    update(state, shift = 0) {
      let b = 0
      for (let i = 0; i < n; i++) {
        const e = keys[i], a = state.keys[i]
        heads.setMatrixAt(i, place(e, a.h, shift, true))
        shanks.setMatrixAt(i, place(e, a.h, shift, false))
        if (api.motionBlur && a.hMax - a.hMin > 0.8) {
          // a streak where it was during the frame: at its highest, and halfway
          blur.setMatrixAt(b++, place(e, a.hMax, shift, true))
          blur.setMatrixAt(b++, place(e, (a.hMax + a.hMin) / 2, shift, true))
        }
      }
      blur.count = b
      blur.visible = b > 0
      heads.instanceMatrix.needsUpdate = shanks.instanceMatrix.needsUpdate = true
      if (b) blur.instanceMatrix.needsUpdate = true
    },
  }
  return api
}
