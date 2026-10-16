// Fabric finishes for the #032 pianist's dresses: one switch that restyles
// any garment material (our knit dress or a community one).
//
//  • as made  — the garment's own material (the knit for ours);
//  • satin    — smooth, low roughness, a bright sheen;
//  • velvet   — rough, deep, a strong coloured sheen at grazing angles;
//  • sequins  — Yuja Wang's stage dresses: a tiled normal map of small
//    overlapping discs, each tilted at random, on a metallic, glossy base,
//    so every disc catches the spotlight at its own angle and the dress
//    glitters as she moves. Tiled in the garment's own UVs; `scale` sets the
//    tiles per UV unit (community UVs span 0–1, ours run in 5.6 cm tiles).

import * as THREE from 'three'

let sequinTex = null
function sequinNormal(size = 256, cells = 16) {
  if (sequinTex) return sequinTex
  let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data
  for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 255; d[i + 3] = 255 }
  const cw = size / cells, rad = cw * 0.62
  // rows overlap like scales: draw top row first, later rows on top
  for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
    const cx = (col + (row % 2) * 0.5) * cw, cy = row * cw
    const tx = (r() - 0.5) * 1.1, ty = (r() - 0.5) * 1.1 - 0.25
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = x - cx, dy = y - cy, q = (dx * dx + dy * dy) / (rad * rad)
      if (q > 1) continue
      // a flat disc, tilted, with a dark rim (the gap to the next one)
      let nx = tx, ny = ty, nz = 1
      if (q > 0.8) { nx += dx / rad * 1.5; ny += dy / rad * 1.5 }
      const l = Math.hypot(nx, ny, nz), i = (((y + size) % size) * size + ((x + size) % size)) * 4
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (nz / l * 0.5 + 0.5) * 255
    }
  }
  g.putImageData(img, 0, 0)
  sequinTex = new THREE.CanvasTexture(c)
  sequinTex.wrapS = sequinTex.wrapT = THREE.RepeatWrapping
  sequinTex.colorSpace = THREE.NoColorSpace
  sequinTex.anisotropy = 8
  return sequinTex
}

const KEYS = ['roughness', 'metalness', 'sheen', 'sheenRoughness', 'clearcoat', 'clearcoatRoughness', 'specularIntensity', 'iridescence']

/** Restyle materials. mats: [{ material, scale }]; kind: 'made' | 'satin' | 'velvet' | 'sequin'. */
export function applyFabric(mats, kind = 'made') {
  for (const { material: m, scale = 1 } of mats) {
    const o = (m.userData.fabric0 ||= { ...Object.fromEntries(KEYS.map(k => [k, m[k]])), normalMap: m.normalMap, normalScale: m.normalScale.clone() })
    for (const k of KEYS) m[k] = o[k]
    if (m.normalMap !== o.normalMap) m.normalMap?.dispose()
    m.normalMap = o.normalMap; m.normalScale.copy(o.normalScale)
    if (kind === 'satin') { m.roughness = 0.32; m.sheen = 0.9; m.sheenRoughness = 0.25; m.normalScale.multiplyScalar(0.25); m.specularIntensity = 0.8 }
    if (kind === 'velvet') { m.roughness = 0.95; m.sheen = 1; m.sheenRoughness = 0.65; m.normalScale.multiplyScalar(0.4) }
    if (kind === 'sequin') {
      const t = sequinNormal().clone()
      t.repeat.set(scale, scale); t.needsUpdate = true
      m.normalMap = t; m.normalScale.set(1, 1)
      m.metalness = 0.75; m.roughness = 0.22; m.sheen = 0.2; m.clearcoat = 0.4; m.clearcoatRoughness = 0.1
      m.specularIntensity = 1; m.iridescence = 0.15
    }
    m.needsUpdate = true
  }
}
