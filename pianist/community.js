// Garments and hair from the MakeHuman community asset repository (CC0 /
// CC-BY, credits in assets/community/CREDITS.md), fitted to the pianist by
// build-character.mjs exactly like MakeHuman fits them: every vertex is a
// barycentric point on three body vertices plus an offset, and inherits their
// skin weights. So they are skinned, never simulated.
//
// The body under a garment is hidden through the asset's own delete group
// (the base-mesh vertices its author marked as covered).
//
// kind: 'dress' (replaces the whole dress), 'top' (replaces the bodice; our
// skirt stays), 'hair'.

import * as THREE from 'three'
import { bodyIndex, hideBody, underGarment } from './shell.js'
import { hairCap } from './hair.js'
import { createHairCloth } from './hair-cloth.js'
import { applyFabric } from './fabric.js'

let serial = 0

// computeTangents leaves zero tangents where a triangle's UVs are degenerate;
// the shader normalises them to NaN, and bloom spreads that over the whole
// frame (a black picture). Give those a tangent perpendicular to the normal.
function fixTangents(g) {
  const t = g.attributes.tangent, n = g.attributes.normal
  if (!t || !n) return
  const N = new THREE.Vector3(), T = new THREE.Vector3()
  for (let i = 0; i < t.count; i++) {
    if (Math.hypot(t.getX(i), t.getY(i), t.getZ(i)) > 1e-6) continue
    N.fromBufferAttribute(n, i)
    T.set(0, 1, 0).cross(N); if (T.lengthSq() < 1e-6) T.set(1, 0, 0).cross(N)
    T.normalize(); t.setXYZW(i, T.x, T.y, T.z, 1)
  }
  t.needsUpdate = true
}

export function communityList(ch, kind) {
  return (ch.meta.community || []).filter(e => !kind || e.kind === kind)
}

// a grey copy of a texture, so a colour picked in the menu tints it evenly
function greyCopy(tex, target = 200) {
  const img = tex.image, c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data
  // mean grey near target/255 (the tint carries the colour). Dark textures are
  // lifted by a gamma rather than a gain: a gain clips their highlights, so a
  // black-dyed gown with bright sheen in its texture stayed dark whatever the tint
  const L = i => 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]
  const hist = new Float64Array(256)
  let n = 0
  for (let i = 0; i < a.length; i += 4) if (a[i + 3] > 128) { hist[Math.round(L(i))]++; n++ }
  const meanAt = g => { let s = 0; for (let v = 0; v < 256; v++) if (hist[v]) s += hist[v] * 255 * (v / 255) ** g; return s / n }
  let map = l => l
  if (n && meanAt(1) < target) {
    let lo = 0.08, hi = 1
    for (let k = 0; k < 30; k++) { const g = (lo + hi) / 2; if (meanAt(g) < target) hi = g; else lo = g }
    const g = (lo + hi) / 2; map = l => 255 * (l / 255) ** g
  } else if (n) { const gain = target / meanAt(1); map = l => Math.min(255, l * gain) }
  for (let i = 0; i < a.length; i += 4) { const l = map(L(i)); a[i] = a[i + 1] = a[i + 2] = l }
  g.putImageData(d, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; t.anisotropy = 8; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT
  return t
}

function hasAlpha(tex) {
  const img = tex?.image
  if (!img) return false
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64)
  const d = g.getImageData(0, 0, 64, 64).data
  let clear = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] < 128) clear++
  return clear > 64 * 64 * 0.02
}

export async function createCommunity(ch, key, { color = null } = {}) {
  const entry = ch.meta.community.find(e => e.key === key)
  if (!entry) throw new Error('no community asset ' + key)
  const [map, normalMap] = await Promise.all([
    entry.map ? ch.loadTexture(entry.map) : null,
    entry.normalMap ? ch.loadTexture(entry.normalMap, false) : null,
    ch.ensurePart(key),
  ])
  const hair = entry.kind === 'hair'
  const alpha = hasAlpha(map)
  const mat = new THREE.MeshPhysicalMaterial({
    map, normalMap, side: THREE.DoubleSide,
    ...(alpha ? { alphaTest: 0.35, alphaToCoverage: true } : {}),
    roughness: hair ? 0.45 : 0.85, metalness: 0,
    ...(hair ? { anisotropy: 0.8, anisotropyRotation: Math.PI / 2, sheen: 0.15, sheenRoughness: 0.35, specularIntensity: 0.45 }
      : { sheen: 0.4, sheenRoughness: 0.5 }),
  })
  if (normalMap) mat.normalScale.set(0.8, 0.8)
  const mesh = ch.addPart(key, mat)
  if (hair) mesh.name = 'hair-' + key   // (styles key off the name: no smoothing, no outline)
  if (hair || normalMap) { mesh.geometry.computeTangents(); fixTangents(mesh.geometry) }
  mesh.renderOrder = hair ? 1 : 0
  // fabric over the skin it lies on (sub-millimetre pokes at grazing angles)
  if (!hair) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -2 }

  // the body under it: the asset's delete group, over the body's base vertices
  const delVerts = ch.partArray(key, 'deleteVerts', Uint16Array)
  let hidden = false
  const hideKey = key + '#' + (++serial)   // (the old garment and the new overlap while switching)
  if (!hair) {
    // (some assets ship no delete group: then only what lies under the fabric)
    const del = new Set(delVerts || [])
    const src = ch.parts.body.source, idx = bodyIndex(ch), tris = []
    if (del.size) for (let t = 0; t < idx.length; t += 3) if (del.has(src[idx[t]]) || del.has(src[idx[t + 1]]) || del.has(src[idx[t + 2]])) tris.push(t)
    hideBody(ch, hideKey, [...new Set([...tris, ...underGarment(ch, mesh.geometry, tris)])]); hidden = true
  }
  const cap = hair ? hairCap(ch, undefined, mesh.geometry, alpha ? map : null) : null

  let grey = null
  function setColor(hex) {
    if (hex == null) return
    if (hair) {
      // a grey copy tinted by the picker, like the mesh hair (their own colours vary)
      if (map && !grey) { grey = greyCopy(map, 140); mat.map = grey; mat.needsUpdate = true }
      mat.color.set(hex)
      mat.sheenColor.set(hex).lerp(new THREE.Color(0xffffff), 0.15)
      cap.material.color.set(hex).multiplyScalar(0.45); return
    }
    // dresses: tint a grey copy of their texture (keeps the weave and folds)
    if (map && !grey) { grey = greyCopy(map); mat.map = grey; mat.needsUpdate = true }
    mat.color.set(hex)
    mat.sheenColor.set(hex).lerp(new THREE.Color(0xffffff), 0.3)
  }
  if (hair) cap.material.color.set(0x2a1a10)
  setColor(color)

  const object = new THREE.Group()
  object.name = key
  // hair: simulated like a piece of cloth pinned at the scalp (hair-cloth.js)
  const cloth = hair ? createHairCloth(ch, mesh) : null
  return {
    kind: hair ? 'mesh' : 'community', entry, object, mesh, cap, cloth, mode: 'fitted',
    get simulate() { return !!cloth?.active }, set simulate(v) { if (cloth) cloth.active = v },
    setColor, setDensity() {}, settle() {}, setMode() {},
    setFabric(kind) { if (!hair) applyFabric([{ material: mat, scale: 9 }], kind) },
    update(dt = 1 / 60) { if (cloth) cloth.update(dt, object.visible); else mesh.visible = object.visible; if (cap) cap.visible = object.visible },
    dispose() {
      cloth?.dispose()
      if (hidden) hideBody(ch, hideKey, null)
      for (const m of [mesh, cap]) if (m) { m.removeFromParent(); m.geometry.dispose() }
      cap?.material.dispose(); mat.dispose(); map?.dispose(); normalMap?.dispose(); grey?.dispose()
    },
  }
}
