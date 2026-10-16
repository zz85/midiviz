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
import { bodyIndex, hideBody } from './shell.js'
import { hairCap } from './hair.js'

export function communityList(ch, kind) {
  return (ch.meta.community || []).filter(e => !kind || e.kind === kind)
}

// a grey copy of a texture, so a colour picked in the menu tints it evenly
function greyCopy(tex) {
  const img = tex.image, c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data
  let sum = 0, n = 0
  for (let i = 0; i < a.length; i += 4) if (a[i + 3] > 128) { sum += 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]; n++ }
  const gain = n ? Math.min(3, 200 / (sum / n)) : 1    // mean grey near 0.8 (the tint carries the colour)
  for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) * gain); a[i] = a[i + 1] = a[i + 2] = l }
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
  ])
  const hair = entry.kind === 'hair'
  const alpha = hasAlpha(map)
  const mat = new THREE.MeshPhysicalMaterial({
    map, normalMap, side: THREE.DoubleSide,
    ...(alpha ? { alphaTest: 0.35, alphaToCoverage: true } : {}),
    roughness: hair ? 0.45 : 0.85, metalness: 0,
    ...(hair ? { anisotropy: 0.8, anisotropyRotation: Math.PI / 2, sheen: 0.35, sheenRoughness: 0.35, specularIntensity: 0.6 }
      : { sheen: 0.4, sheenRoughness: 0.5 }),
  })
  if (normalMap) mat.normalScale.set(0.8, 0.8)
  const mesh = ch.addPart(key, mat)
  if (hair || normalMap) mesh.geometry.computeTangents()
  mesh.renderOrder = hair ? 1 : 0
  // fabric over the skin it lies on (sub-millimetre pokes at grazing angles)
  if (!hair) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -2 }

  // the body under it: the asset's delete group, over the body's base vertices
  const delVerts = ch.partArray(key, 'deleteVerts', Uint16Array)
  let hidden = false
  if (delVerts && !hair) {
    const del = new Set(delVerts)
    const src = ch.parts.body.source, idx = bodyIndex(ch), tris = []
    for (let t = 0; t < idx.length; t += 3) if (del.has(src[idx[t]]) || del.has(src[idx[t + 1]]) || del.has(src[idx[t + 2]])) tris.push(t)
    hideBody(ch, key, tris); hidden = true
  }
  const cap = hair ? hairCap(ch) : null

  let grey = null
  function setColor(hex) {
    if (hex == null) return
    if (hair) { mat.color.set(0xffffff); cap.material.color.set(hex).multiplyScalar(0.45); return }
    // dresses: tint a grey copy of their texture (keeps the weave and folds)
    if (map && !grey) { grey = greyCopy(map); mat.map = grey; mat.needsUpdate = true }
    mat.color.set(hex)
    mat.sheenColor.set(hex).lerp(new THREE.Color(0xffffff), 0.3)
  }
  if (hair) cap.material.color.set(0x2a1a10)
  setColor(color)

  const object = new THREE.Group()
  object.name = key
  return {
    kind: hair ? 'mesh' : 'community', entry, object, mesh, cap, simulate: false, mode: 'fitted',
    setColor, setDensity() {}, settle() {}, setMode() {},
    update() { mesh.visible = object.visible; if (cap) cap.visible = object.visible },
    dispose() {
      if (hidden) hideBody(ch, key, null)
      for (const m of [mesh, cap]) if (m) { m.removeFromParent(); m.geometry.dispose() }
      cap?.material.dispose(); mat.dispose(); map?.dispose(); normalMap?.dispose(); grey?.dispose()
    },
  }
}
