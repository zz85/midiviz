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

// A garment's texture made safe for a hidden body. Two things in the
// community textures show as black on her:
//  • sheer panels (alpha ~0.5, e.g. c806's yoke under the halter and its hem
//    band): drawn with alpha to coverage, but the body under the garment is
//    hidden, so through them is the empty stage;
//  • the atlas background (alpha 0, black once drawn to a canvas, which
//    premultiplies): filtering and mipmaps blend it into the edge of every UV
//    island, so each seam gets a dark line, and where the blended alpha falls
//    under alphaTest, a crack.
// So anything at least a quarter opaque becomes solid, and the islands' colour
// is grown out into the background (opaque: no geometry samples it beyond
// filtering). Transparent holes inside an island narrower than twice the
// padding fill in; wider cut-outs (lace, fringes) stay.
function solidGarmentMap(tex) {
  const img = tex?.image
  if (!img?.width) return tex
  const w = img.width, h = img.height, c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, w, h), a = d.data
  let filled = new Uint8Array(w * h), clear = 0
  const solid = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) if (a[p * 4 + 3] >= 64) solid[p] = 1; else clear++
  if (!clear) return tex
  // (the island's own edge pixels carry the black it was antialiased against:
  // they are left out and grown back from the pixels inside them)
  for (let p = 0; p < w * h; p++) {
    if (!solid[p]) { a[p * 4 + 3] = 0; continue }
    const x = p % w, y = (p - x) / w
    let inner = true
    for (let dy = -1; dy <= 1 && inner; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy
      if (X >= 0 && X < w && Y >= 0 && Y < h && !solid[Y * w + X]) { inner = false; break }
    }
    a[p * 4 + 3] = 255; if (inner) filled[p] = 1
  }
  // grow by one pixel a pass, each new pixel the mean of its filled neighbours
  const passes = Math.max(4, Math.round(8 * Math.max(w, h) / 512))
  let front = []
  for (let p = 0; p < w * h; p++) if (!filled[p]) front.push(p)
  for (let pass = 0; pass < passes && front.length; pass++) {
    const next = filled.slice(), keep = []
    for (const p of front) {
      const x = p % w, y = (p - x) / w
      let r = 0, gg = 0, b = 0, n = 0
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || !filled[q]) continue
        r += a[q * 4]; gg += a[q * 4 + 1]; b += a[q * 4 + 2]; n++
      }
      if (!n) { keep.push(p); continue }
      a[p * 4] = r / n; a[p * 4 + 1] = gg / n; a[p * 4 + 2] = b / n; a[p * 4 + 3] = 255; next[p] = 1
    }
    filled = next; front = keep
  }
  g.putImageData(d, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = tex.colorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT
  t.anisotropy = Math.max(tex.anisotropy, 8)
  tex.dispose()
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
  const hair = entry.kind === 'hair'
  let [map, normalMap] = await Promise.all([
    entry.map ? ch.loadTexture(entry.map) : null,
    entry.normalMap ? ch.loadTexture(entry.normalMap, false) : null,
    ch.ensurePart(key),
  ])
  if (!hair) map = solidGarmentMap(map)
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
    // (pleats about her body axis: the garment's rest centre, x and z)
    setFabric(kind) { if (hair) return; const bb = mesh.geometry.boundingBox || (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox); applyFabric([{ material: mat, scale: 9, center: [(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2] }], kind) },
    update(dt = 1 / 60) { if (cloth) cloth.update(dt, object.visible); else mesh.visible = object.visible; if (cap) cap.visible = object.visible },
    dispose() {
      cloth?.dispose()
      if (hidden) hideBody(ch, hideKey, null)
      for (const m of [mesh, cap]) if (m) { m.removeFromParent(); m.geometry.dispose() }
      cap?.material.dispose(); mat.dispose(); map?.dispose(); normalMap?.dispose(); grey?.dispose()
    },
  }
}
