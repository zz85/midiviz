// Procedural concert grand piano for three.js (Experiment #030 - Concert Stage).
//
// Forked from grandpiano/grand-piano.js (#028) and tuned toward the look of
// Concert Creator's renders: a mirror-lacquer fallboard that reflects the keys
// (a real planar reflection), an exposed pin field of tall chrome tuning pins
// standing on red felt, agraffes, a red stringing braid along the hitch pins,
// a polished bronze-gold plate with a hammered casting texture, the red key
// felt visible behind the keys, per-key glow colours (left / right hand), and
// a keyboard-only mode for the falling-notes "lesson" view.
//
// Everything is built from code: no external model. Proportions follow a
// ~211 cm "model B"-sized grand (148 cm wide, keys 73 cm off the floor).
// Units are centimetres. Axes: x = along the keyboard (bass at -x),
// y = up, z = toward the player (the tail points to -z). The front edge of
// the keys is at z = 0.
//
// Parts: S-curved rim and lid (hinged on the spine, with a fold-back front
// flap and prop stick), cheek blocks, fallboard, music desk with sheet music,
// gold cast-iron plate with openings over the soundboard, spruce soundboard
// with long and bass bridges, ~230 overstrung strings (copper-wound bass
// crossing over the tenor), tuning and hitch pins, 88 keys, hammers and
// dampers that move with the keys, turned legs on brass casters, lyre with
// three pedals, and an artist bench.

import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

// ── Dimensions ───────────────────────────────────────────────────────────
export const DIM = {
  WHITE_W: 2.35, WHITE_L: 15, WHITE_H: 2.2, GAP: 0.07,
  BLACK_W: 1.3, BLACK_L: 10.5, BLACK_RISE: 1.2,
  KEY_TOP: 73,           // top of the white keys above the floor
  KEY_BACK: -16,         // keys disappear under the fallboard here
  PIVOT_Z: -42,          // balance point (hidden), so the front dips ~1 cm
  RIM_BOTTOM: 61, RIM_TOP: 97, RIM_T: 4.5,
  LID_T: 2.2,
  CASE_FRONT: -17,       // front of the rim / fallboard line
  FLAP_HINGE: -40,       // front lid flap folds back over the main lid here
  PLATE_Y: 84, PLATE_T: 1.8,
  STRING_Y: 88, BASS_Y: 89.5,
  SOUNDBOARD_Y: 78,
  STRIKE_Z: -36.5, DAMPER_Z: -46,
}
const D = DIM
const IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 }
export const isBlack = m => IS_BLACK[m % 12] === 1
export const LOW = 21, HIGH = 108

// ── 2D helpers (points are [x, z]) ───────────────────────────────────────
// The case outline, traced from spine-front, back along the spine, around
// the tail, then forward along the S-shaped bentside to the treble cheek.
function caseOutline() {
  const pts = []
  const line = (a, b, n) => { for (let i = 0; i < n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]) }
  line([-74, D.CASE_FRONT], [-74, -186], 34)
  const ctrl = [
    [-74, -186], [-73.2, -197], [-68, -205.5], [-58, -210.5], [-45, -211.2], [-31, -207],
    [-17, -197], [-4, -183], [8, -167], [20, -149], [32, -130], [44, -110], [55, -91],
    [64, -76], [70, -64], [73.3, -53], [74, -43],
  ]
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
  for (const p of curve.getSpacedPoints(160)) pts.push([p.x, p.z])
  pts.pop()
  line([74, -43], [74, D.CASE_FRONT], 6)
  pts.push([74, D.CASE_FRONT])
  return pts
}

// Offset an open polyline toward the piano's interior (left of travel).
function offsetPolyline(pts, dist) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
    let tx = b[0] - a[0], tz = b[1] - a[1]
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l
    out.push([pts[i][0] - tz * dist, pts[i][1] + tx * dist])
  }
  return out
}
function cleanSelfIntersections(pts) {
  // Offsetting around the tight tail can fold the curve; drop points that go backwards.
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = out[out.length - 1]
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05) continue
    out.push(p)
  }
  return out
}
function arcLengths(pts) {
  const s = [0]
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return s
}
function sliceByArc(pts, s, s0, s1) {
  const out = []
  for (let i = 0; i < pts.length; i++) if (s[i] >= s0 && s[i] <= s1) out.push(pts[i])
  return out
}
function pointInPoly([x, z], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
// Keep the part of a closed polygon with lo <= z <= hi (Sutherland–Hodgman, two planes).
function clipZ(poly, lo, hi) {
  const clip = (p, inside, cut) => {
    const out = []
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length]
      const ia = inside(a), ib = inside(b)
      if (ia) out.push(a)
      if (ia !== ib) out.push(cut(a, b))
    }
    return out
  }
  const at = z => (a, b) => { const t = (z - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, z] }
  let p = poly
  if (hi != null) p = clip(p, q => q[1] <= hi, at(hi))
  if (lo != null) p = clip(p, q => q[1] >= lo, at(lo))
  return p
}
// THREE.Shape lives in XY; we use (x, -z) and rotate the result flat afterwards.
const toShape = pts => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
const toPath = pts => new THREE.Path(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
// Extrude a top-view shape upward from y0 by height h (bevel included in h).
function extrudeUp(shape, y0, h, bevel = 0, segs = 3, curveSegments = 12) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, h - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: segs, curveSegments,
  })
  geo.rotateX(-Math.PI / 2)    // shape y (= -z) -> world -z, extrusion -> +y
  geo.translate(0, y0 + bevel, 0)
  geo.computeVertexNormals()
  return geo
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function roundedBox(w, h, d, r, segs = 3) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - 2 * r, h - 2 * r, r * 0.5), {
    depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: segs, curveSegments: 4,
  })
  geo.translate(0, 0, -(d - 2 * r) / 2)
  geo.computeVertexNormals()
  return geo
}

// ── Procedural textures ──────────────────────────────────────────────────
function rand(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647 }
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}
// Quarter-sawn spruce: straight, tight grain lines.
function spruceTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rand(11)
    g.fillStyle = '#d6b072'; g.fillRect(0, 0, w, h)
    let x = 0
    while (x < w) {
      const step = 3 + r() * 9
      g.fillStyle = `rgba(${150 + r() * 30},${95 + r() * 25},${40 + r() * 20},${0.25 + r() * 0.45})`
      g.fillRect(x, 0, 0.8 + r() * 1.8, h)
      x += step
    }
    // board joints and slight colour variation between boards
    for (let b = 0; b < 8; b++) {
      g.fillStyle = `rgba(255,230,180,${r() * 0.12})`; g.fillRect(b * 128, 0, 128, h)
      g.fillStyle = 'rgba(90,55,20,0.35)'; g.fillRect(b * 128, 0, 1, h)
    }
  })
}
// Long, wavy grain (walnut / mahogany / maple), running along u.
function woodTexture(base, light, dark, seed = 7, w = 1024, h = 512) {
  return canvasTex(w, h, (g) => {
    const r = rand(seed)
    g.fillStyle = base; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 420; i++) {
      const y = r() * h, amp = 1 + r() * 7, freq = 0.002 + r() * 0.008, ph = r() * 6.28
      g.strokeStyle = r() < 0.45 ? light.replace('A', (0.04 + r() * 0.12).toFixed(3)) : dark.replace('A', (0.06 + r() * 0.2).toFixed(3))
      g.lineWidth = 0.4 + r() * 2.4
      g.beginPath()
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph * 2) * amp * 0.35
        x ? g.lineTo(x, yy) : g.moveTo(x, yy)
      }
      g.stroke()
    }
  })
}
function noiseTexture(seed = 3, lo = 120, hi = 170) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rand(seed), img = g.createImageData(w, h)
    for (let i = 0; i < w * h; i++) {
      const v = lo + r() * (hi - lo)
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
  }, false)
}
// Tileable normal map from a height field of soft dimples. Big, shallow
// dimples read as the sand-cast, hammered surface of the plate; tiny dense ones
// as the "orange peel" of hand-rubbed lacquer.
function dimpleNormalMap({ size = 512, count = 900, rMin = 6, rMax = 22, strength = 2.5, seed = 9 } = {}) {
  const r = rand(seed), h = new Float32Array(size * size)
  for (let i = 0; i < count; i++) {
    const cx = r() * size, cy = r() * size, rad = rMin + r() * (rMax - rMin), depth = 0.4 + r() * 0.6
    const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad), y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / rad
      if (d >= 1) continue
      const s = 0.5 + 0.5 * Math.cos(d * Math.PI)
      h[((y % size + size) % size) * size + ((x % size + size) % size)] -= depth * s * s
    }
  }
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), img = g.createImageData(size, size)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255
    img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}
// Gold lettering on transparent ground (fallboard and plate).
function logoTexture(title, sub, tone = 'gold') {
  return canvasTex(1024, 256, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'
    const grad = g.createLinearGradient(0, 40, 0, 200)
    if (tone === 'gold') { grad.addColorStop(0, '#fff0b8'); grad.addColorStop(0.5, '#d8a845'); grad.addColorStop(1, '#9a6a1c') }
    else { grad.addColorStop(0, '#7a5216'); grad.addColorStop(1, '#5a3a0c') }
    g.fillStyle = grad
    g.font = '600 118px "Didot", "Bodoni 72", "Times New Roman", Georgia, serif'
    g.save(); g.scale(1.25, 1); g.fillText(title, w / 2 / 1.25, 108); g.restore()
    g.font = '500 30px "Times New Roman", Georgia, serif'
    if (sub) g.fillText(sub.split('').join(String.fromCharCode(8202)), w / 2, 200)
  })
}
// Engraved sheet music on cream paper.
function sheetTexture(seed, title) {
  return canvasTex(768, 1024, (g, w, h) => {
    const r = rand(seed)
    g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, w, h)
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,90,40,0.18)')
    g.fillStyle = vg; g.fillRect(0, 0, w, h)
    g.fillStyle = '#222'; g.strokeStyle = '#222'
    if (title) { g.font = 'italic 36px Georgia, serif'; g.textAlign = 'center'; g.fillText(title, w / 2, 70) }
    const top0 = title ? 120 : 70
    for (let sys = 0; sys < 6; sys++) {
      const y0 = top0 + sys * 148
      for (const staff of [0, 1]) {
        const sy = y0 + staff * 58
        g.lineWidth = 1.2
        for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(50, sy + l * 8); g.lineTo(w - 40, sy + l * 8); g.stroke() }
        g.font = `${staff ? 34 : 52}px serif`; g.textAlign = 'left'
        g.fillText(staff ? '\u{1D122}' : '\u{1D11E}', 54, sy + (staff ? 14 : 28))
        let x = 110
        while (x < w - 60) {
          const bar = r() < 0.12
          if (bar) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, sy); g.lineTo(x, sy + 32); g.stroke(); x += 14; continue }
          const pos = Math.floor(r() * 11) - 1, ny = sy + 32 - pos * 4
          g.beginPath(); g.ellipse(x, ny, 5.5, 4, -0.35, 0, Math.PI * 2)
          r() < 0.2 ? (g.lineWidth = 1.5, g.stroke()) : g.fill()
          g.lineWidth = 1.3; g.beginPath()
          if (pos < 4) { g.moveTo(x + 5, ny); g.lineTo(x + 5, ny - 26) } else { g.moveTo(x - 5, ny); g.lineTo(x - 5, ny + 26) }
          g.stroke()
          x += 16 + r() * 18
        }
      }
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(50, y0); g.lineTo(50, y0 + 90); g.stroke()
    }
  })
}

// ── Materials ────────────────────────────────────────────────────────────
export const FINISHES = {
  ebony: { label: 'Polished ebony', color: 0x050505, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.025 },
  satin: { label: 'Satin ebony', color: 0x0a0a0a, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  white: { label: 'Polished white', color: 0xefece6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
  walnut: { label: 'Figured walnut', wood: ['#4a2a16', 'rgba(150,95,55,A)', 'rgba(20,8,2,A)'], roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 },
  mahogany: { label: 'Mahogany', wood: ['#5a1f10', 'rgba(170,70,40,A)', 'rgba(30,5,0,A)'], roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 },
  red: { label: 'Lacquer red', color: 0x6a0a0c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
}

function makeMaterials() {
  const m = {}
  const peel = dimpleNormalMap({ size: 256, count: 2600, rMin: 1.5, rMax: 4, strength: 1.4, seed: 4 })
  peel.repeat.set(1 / 6, 1 / 6)
  m.case = new THREE.MeshPhysicalMaterial({
    color: 0x040404, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.012,
    clearcoatNormalMap: peel, clearcoatNormalScale: new THREE.Vector2(0.025, 0.025),
  })
  // Bronze-gold plate: polished metallic lacquer over a sand-cast, hammered surface
  const cast = dimpleNormalMap({ size: 512, count: 1400, rMin: 4, rMax: 16, strength: 1.6, seed: 12 })
  cast.repeat.set(1 / 22, 1 / 22)
  m.plate = new THREE.MeshPhysicalMaterial({
    color: 0xc38a3e, metalness: 0.92, roughness: 0.3, roughnessMap: noiseTexture(5, 110, 190),
    normalMap: cast, normalScale: new THREE.Vector2(0.55, 0.55),
    clearcoat: 1, clearcoatRoughness: 0.06,
  })
  m.plate.roughnessMap.repeat.set(0.05, 0.05)
  m.steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.34, envMapIntensity: 0.55 })
  m.copper = new THREE.MeshStandardMaterial({ color: 0xc8804a, metalness: 1, roughness: 0.38, envMapIntensity: 0.6 })
  m.pins = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.1 })
  m.agraffe = new THREE.MeshStandardMaterial({ color: 0xf0d79a, metalness: 1, roughness: 0.16 })
  m.brass = new THREE.MeshPhysicalMaterial({ color: 0xf0c060, metalness: 1, roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.1 })
  const spruce = spruceTexture(); spruce.repeat.set(1 / 70, 1 / 70); spruce.rotation = 0.55
  m.soundboard = new THREE.MeshPhysicalMaterial({ map: spruce, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 })
  const maple = woodTexture('#b98b52', 'rgba(230,190,130,A)', 'rgba(90,55,20,A)', 21)
  maple.repeat.set(1 / 40, 1 / 40)
  m.bridge = new THREE.MeshPhysicalMaterial({ map: maple, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2, color: 0x9a7040 })
  m.wood = new THREE.MeshStandardMaterial({ map: maple, roughness: 0.55, color: 0xe0c090 })
  const raw = woodTexture('#3a2414', 'rgba(110,70,40,A)', 'rgba(10,4,0,A)', 31)
  raw.repeat.set(1 / 80, 1 / 80)
  m.raw = new THREE.MeshStandardMaterial({ map: raw, roughness: 0.85 })
  m.felt = new THREE.MeshPhysicalMaterial({ color: 0x6a0610, roughness: 1, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xa01c28) })
  m.damperFelt = new THREE.MeshPhysicalMaterial({ color: 0xe9e3d6, roughness: 1, sheen: 1, sheenRoughness: 0.7, sheenColor: 0xffffff })
  m.hammerFelt = new THREE.MeshPhysicalMaterial({ color: 0xf1ede2, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: 0xffffff })
  const ivoryRough = noiseTexture(17, 70, 110); ivoryRough.repeat.set(1 / 3, 1 / 3)
  m.whiteKey = new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, roughness: 0.85, roughnessMap: ivoryRough, clearcoat: 0.7, clearcoatRoughness: 0.08, sheen: 0.25, sheenColor: 0xfff8e8 })
  m.whiteKeySide = new THREE.MeshPhysicalMaterial({ color: 0xcfc8ba, roughness: 0.5, clearcoat: 0.4 })
  m.blackKey = new THREE.MeshPhysicalMaterial({ color: 0x060606, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.06 })
  m.leather = new THREE.MeshPhysicalMaterial({ color: 0x0c0b0a, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.4, sheenColor: 0x555555, clearcoat: 0.15, clearcoatRoughness: 0.5 })
  m.paper = new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide })
  m.logo = new THREE.MeshPhysicalMaterial({ map: logoTexture('MIDIVIZ', 'EXPERIMENT · N° 030'), transparent: true, metalness: 0.75, roughness: 0.3, clearcoat: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  m.plateLogo = new THREE.MeshPhysicalMaterial({ map: logoTexture('MIDIVIZ', 'CONCERT GRAND', 'dark'), transparent: true, metalness: 0.8, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  m.shadowBlob = null
  return m
}

// Additive Fresnel-weighted planar reflection (used on top of the lacquer).
// Rendered into the linear HDR buffer, so no tone mapping here.
const LACQUER_MIRROR = {
  name: 'LacquerMirror',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 1 } },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv; varying vec3 vN; varying vec3 vV;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength;
    varying vec4 vUv; varying vec3 vN; varying vec3 vV;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec3 base = texture2DProj(tDiffuse, vUv).rgb;
      float c = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
      float F = 0.045 + 0.955 * pow(1.0 - c, 5.0);
      gl_FragColor = vec4(base * color * F * strength, 1.0);
    }`,
}

// ── Key geometry ─────────────────────────────────────────────────────────
const KB = 0.12   // key bevel
const keyGeoCache = new Map()
function whiteKeyGeometry(leftCut, rightCut, L) {
  const id = `${leftCut.toFixed(3)}|${rightCut.toFixed(3)}`
  if (keyGeoCache.has(id)) return keyGeoCache.get(id)
  const hw = D.WHITE_W / 2 - D.GAP / 2 - KB, Lb = L - KB
  const notch = D.BLACK_L + 0.3
  const xl = leftCut ? -D.WHITE_W / 2 + leftCut + D.GAP + KB : -hw
  const xr = rightCut ? D.WHITE_W / 2 - rightCut - D.GAP - KB : hw
  const s = new THREE.Shape()     // (x, z): back of key at z = 0, front at z = L
  s.moveTo(xl, KB); s.lineTo(xr, KB)
  if (rightCut) { s.lineTo(xr, notch); s.lineTo(hw, notch) }
  s.lineTo(hw, Lb); s.lineTo(-hw, Lb)
  if (leftCut) { s.lineTo(-hw, notch); s.lineTo(xl, notch) }
  s.lineTo(xl, KB)
  const geo = new THREE.ExtrudeGeometry(s, { depth: D.WHITE_H - 2 * KB, bevelEnabled: true, bevelThickness: KB, bevelSize: KB, bevelSegments: 3, curveSegments: 1 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, D.WHITE_H - KB, 0)
  geo.computeVertexNormals()
  keyGeoCache.set(id, geo)
  return geo
}
function blackKeyGeometry() {
  if (keyGeoCache.has('black')) return keyGeoCache.get('black')
  const b = 0.1, top = D.WHITE_H + D.BLACK_RISE - b, bottom = D.WHITE_H * 0.3, L = D.BLACK_L - b
  const s = new THREE.Shape()   // (z, y) side profile, sloped front
  s.moveTo(b, bottom); s.lineTo(L, bottom); s.lineTo(L, top - 0.9)
  s.quadraticCurveTo(L - 0.12, top - 0.05, L - 1.15, top); s.lineTo(b, top); s.lineTo(b, bottom)
  // the top narrows: real black keys taper toward the top surface
  const geo = new THREE.ExtrudeGeometry(s, { depth: D.BLACK_W - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 })
  geo.rotateY(-Math.PI / 2)
  geo.translate(D.BLACK_W / 2 - b, 0, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = THREE.MathUtils.clamp((y - bottom) / (top - bottom), 0, 1)
    pos.setX(i, pos.getX(i) * (1 - 0.14 * t))
  }
  geo.computeVertexNormals()
  keyGeoCache.set('black', geo)
  return geo
}

// ── Lathe-turned parts ───────────────────────────────────────────────────
function lathe(profile, segs = 48) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs)
  geo.computeVertexNormals()
  return geo
}
function legGeometry(h) {
  // Floor to the rim bottom, minus the caster (8 cm). Classic turned leg.
  const H = h - 8
  return lathe([
    [0, 0], [3.6, 0], [3.9, 0.4], [3.9, 2.2], [3.5, 2.8], [3.6, 3.6], [4.3, 4.2], [4.3, 5.2],
    [3.9, 6], [4.1, 0.25 * H], [4.6, 0.55 * H], [5.4, 0.78 * H], [5.9, 0.86 * H], [6.9, 0.875 * H],
    [7.1, 0.9 * H], [6.4, 0.915 * H], [6.6, 0.95 * H], [7.6, 0.965 * H], [7.8, H], [0, H],
  ])
}
function casterGroup(mat, brass) {
  const g = new THREE.Group()
  const cup = new THREE.Mesh(lathe([[0, 0], [3.4, 0], [3.8, 0.6], [3.6, 1.6], [2.2, 2], [0, 2]], 32), brass)
  cup.position.y = 6
  const fork = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4, 2.2), brass)
  fork.position.set(0, 4, 0)
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 32), brass)
  wheel.rotation.z = Math.PI / 2
  wheel.position.set(0, 2.45, 1.2)
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.28, 10, 32), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }))
  tyre.rotation.y = Math.PI / 2
  tyre.position.copy(wheel.position)
  g.add(cup, fork, wheel, tyre)
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
  return g
}

// ── The piano ────────────────────────────────────────────────────────────
export function buildGrandPiano({ bench = true, mirror = true } = {}) {
  let fallMirror = null
  const mat = makeMaterials()
  const root = new THREE.Group()
  root.name = 'grand-piano'
  const add = (mesh, parent = root, cast = true, receive = true) => {
    mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh
  }
  const kb = o => { o.userData.kb = true; return o }   // part of the bare keyboard (lesson view)
  const caseMeshes = []   // meshes that take the case finish
  const addCase = (geo, parent = root) => { const m = add(new THREE.Mesh(geo, mat.case), parent); caseMeshes.push(m); return m }

  // Outline and its offsets
  const outer = caseOutline()                         // open polyline, spine-front -> cheek-front
  const sOuter = arcLengths(outer)
  const inner = cleanSelfIntersections(offsetPolyline(outer, D.RIM_T))
  const closed = p => [...p]                          // implicit closing edge along the front
  const insideRim = closed(inner)

  // Rim: a C-shaped wall, open at the front where the keyboard enters
  {
    const shape = toShape([...outer, ...[...inner].reverse()])
    addCase(extrudeUp(shape, D.RIM_BOTTOM, D.RIM_TOP - D.RIM_BOTTOM, 0.7, 4, 1))
    // a thin lacquered moulding along the bottom edge
    const lip = toShape([...offsetPolyline(outer, -0.6), ...[...offsetPolyline(outer, 1.5)].reverse()])
    addCase(extrudeUp(lip, D.RIM_BOTTOM - 1.2, 2.4, 0.5, 3, 1))
  }
  // Bottom board (raw wood) and the keybed under the keys
  add(new THREE.Mesh(extrudeUp(toShape(clipZ(insideRim, null, D.CASE_FRONT)), D.RIM_BOTTOM - 0.5, 3, 0, 1, 1), mat.raw))
  {
    const keybed = new THREE.Mesh(new THREE.BoxGeometry(148, 4.5, 45), mat.case)
    keybed.position.set(0, 63.5, -21)
    kb(add(keybed)); caseMeshes.push(keybed)
    // Key frame under the keys (dark wood) and a red felt strip at the back of the keys
    const fh = D.KEY_TOP - D.WHITE_H - 66 - 0.2
    const frame = new THREE.Mesh(new THREE.BoxGeometry(124, fh, 26), mat.raw)
    frame.position.set(0, 66 + fh / 2, -30)
    add(frame)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(124, 3.4, 2), mat.raw)
    rail.position.set(0, 66 + 1.7, -1.2)
    kb(add(rail))
    // The red key felt: a thin strip just above the back of the keys, along the
    // foot of the fallboard. It is the red line every close-up of a grand shows.
    const felt = new THREE.Mesh(roundedBox(123.2, 0.45, 0.7, 0.12, 2), mat.felt)
    felt.position.set(0, D.KEY_TOP + 0.6, D.KEY_BACK - 0.45)
    kb(add(felt, root, false, true))
  }
  // Key slip in front of the keys
  {
    const slip = new THREE.Mesh(roundedBox(124, 5.6, 1.8, 0.35), mat.case)
    slip.position.set(0, 68.3, 1.1)
    kb(add(slip)); caseMeshes.push(slip)
  }
  // Cheek blocks: low arms either side of the keyboard sweeping up into the rim
  {
    const s = new THREE.Shape()  // (z, y) side profile; z positive toward the player
    const zf = 2.1, zb = D.CASE_FRONT - 0.5, yb = 63, yt = 77.2
    s.moveTo(zb, yb); s.lineTo(zf, yb); s.lineTo(zf, yt - 1.2)
    s.quadraticCurveTo(zf, yt, zf - 1.2, yt)
    s.lineTo(-7, yt)
    s.bezierCurveTo(-11, yt, -12.5, D.RIM_TOP - 6, zb, D.RIM_TOP)
    s.lineTo(zb, yb)
    for (const side of [-1, 1]) {
      const w = 74 - 61.8
      const geo = new THREE.ExtrudeGeometry(s, { depth: w - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 4, curveSegments: 16 })
      geo.rotateY(-Math.PI / 2)        // shape (z, y, extrude) -> world (-extrude -> x, y, z)
      geo.computeVertexNormals()
      kb(addCase(geo)).position.x = side > 0 ? 74 - 0.6 : -61.8 - 0.6
    }
  }
  // Fallboard (open, resting against the nameboard), with the gold logo
  {
    const fb = new THREE.Group()
    const board = new THREE.Mesh(roundedBox(123.4, 12.5, 2.2, 0.6, 4), mat.case)
    board.position.set(0, 6.25, 0)
    fb.add(board); caseMeshes.push(board)
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), mat.logo)
    logo.position.set(0, 6.6, 1.15)
    logo.renderOrder = 3
    fb.add(logo)
    // Mirror: polished black lacquer is a dark mirror, and on a fallboard it
    // shows the keys (and the pianist's hands) upside down. A planar reflection
    // added on top of the lacquer, weighted by Fresnel.
    if (mirror) {
      const w = Math.round(mirror.width ?? 1024), h = Math.round(mirror.height ?? 512)
      fallMirror = new Reflector(new THREE.PlaneGeometry(122, 11.4), {
        textureWidth: w, textureHeight: h, clipBias: 0.002, shader: LACQUER_MIRROR, color: 0xffffff, multisample: 0,
      })
      Object.assign(fallMirror.material, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      fallMirror.position.set(0, 6.25, 1.115)
      fallMirror.renderOrder = 2
      fb.add(fallMirror)
    }
    fb.position.set(0, D.KEY_TOP + 2.0, D.KEY_BACK - 1.1)
    fb.rotation.x = -0.12
    fb.traverse(o => { if (o.isMesh) { o.castShadow = o === board; o.receiveShadow = true } })
    kb(fb)
    root.add(fb)
    // Nameboard top: closes the gap behind the fallboard up to the pin field
    const top = new THREE.Mesh(roundedBox(123.4, 7.5, 4.5, 0.4), mat.case)
    top.position.set(0, 88.1, -20.6)
    add(top); caseMeshes.push(top)
  }

  // Soundboard
  {
    const sb = toShape(clipZ(insideRim, null, -30))
    const geo = new THREE.ShapeGeometry(sb, 24)
    geo.rotateX(-Math.PI / 2)
    const m = add(new THREE.Mesh(geo, mat.soundboard), root, false, true)
    m.position.y = D.SOUNDBOARD_Y
  }

  // Plate openings: a band of windows along the bentside and tail, over the bridges.
  const band = (s0, s1, d0, d1) => {
    const a = sliceByArc(offsetPolyline(outer, d0), sOuter, s0, s1)
    const b = sliceByArc(offsetPolyline(outer, d1), sOuter, s0, s1).reverse()
    return [...a, ...b]
  }
  const totalS = sOuter[sOuter.length - 1]
  const holes = [
    band(176, 224, 9, 22), band(229, 279, 9, 27),
    band(286, 336, 9, 25), band(343, 388, 9, 21), band(394, Math.min(totalS - 40, 420), 9, 17),
  ]
  // Bridges sit on the soundboard under the windows
  {
    const bridge = (s0, s1, d, w = 2.6) => {
      const h = D.STRING_Y - D.SOUNDBOARD_Y - 0.3
      const geo = extrudeUp(toShape(band(s0, s1, d - w / 2, d + w / 2)), D.SOUNDBOARD_Y, h, 0.3, 2, 1)
      return add(new THREE.Mesh(geo, mat.bridge))
    }
    bridge(178, 238, 15, 3.4)   // bass bridge, across the tail
    bridge(232, Math.min(totalS - 42, 418), 15)  // long bridge
  }
  // Cast-iron plate
  {
    const platePoly = clipZ(cleanSelfIntersections(offsetPolyline(outer, D.RIM_T + 0.6)), null, D.CASE_FRONT - 2)
    const shape = toShape(platePoly)
    const xAt = z => {  // inner width of the plate at depth z
      let lo = 74, hi = -74
      for (const [x, zz] of platePoly) if (Math.abs(zz - z) < 2.5) { lo = Math.min(lo, x); hi = Math.max(hi, x) }
      return [lo, hi]
    }
    // Strike slot: the hammers reach the strings through here
    const [sl, sr] = xAt(D.STRIKE_Z)
    shape.holes.push(toPath([[sl + 3, D.STRIKE_Z + 3.2], [sr - 3, D.STRIKE_Z + 3.2], [sr - 3, D.STRIKE_Z - 3.2], [sl + 3, D.STRIKE_Z - 3.2]]))
    for (const h of holes) shape.holes.push(toPath(h))
    // round lightening holes in the solid field near the spine
    for (const [cx, cz, r] of [[-56, -80, 4.5], [-56, -112, 4.5], [-56, -144, 4.5], [-22, -62, 5], [8, -62, 5], [36, -60, 4]]) {
      const p = new THREE.Path(); p.absellipse(cx, -cz, r, r * 1.25, 0, Math.PI * 2, true); shape.holes.push(p)
    }
    const geo = extrudeUp(shape, D.PLATE_Y, D.PLATE_T, 0.4, 3, 24)
    add(new THREE.Mesh(geo, mat.plate))
    // cast lettering
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), mat.plateLogo)
    logo.rotation.x = -Math.PI / 2
    logo.position.set(-12, D.PLATE_Y + D.PLATE_T + 0.02, -51)
    add(logo, root, false, true)
    // the plate is bolted down with big round-headed bolts
    const boltGeo = new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    for (const [x, z] of [[-60, -60], [-30, -100], [0, -88], [-40, -160], [20, -50], [50, -52], [-60, -190], [-10, -130]]) {
      if (!pointInPoly([x, z], platePoly) || holes.some(h => pointInPoly([x, z], h))) continue
      const b = new THREE.Mesh(boltGeo, mat.plate)
      b.position.set(x, D.PLATE_Y + D.PLATE_T, z); b.scale.y = 0.5
      add(b, root, true, false)
    }
  }

  // ── Strings, pins, hammers and dampers ──────────────────────────────────
  // Hitch pins stand just inside the rim; strings end there.
  const hitchPoly = clipZ(cleanSelfIntersections(offsetPolyline(outer, D.RIM_T + 2.8)), null, D.CASE_FRONT)
  const notes = []   // per key: geometry of its strings
  for (let k = 0; k < 88; k++) {
    let fx, ang, y, count, r, wound
    if (k < 20) {          // overstrung bass: copper-wound, fanning right over the tenor
      fx = -67 + k * (24 / 19)
      ang = THREE.MathUtils.degToRad(9 + k * 0.2)
      y = D.BASS_Y; count = k < 8 ? 1 : 2; r = 0.26 - k * 0.006; wound = true
    } else {               // tenor + treble: steel trichords
      const t = (k - 20) / 67
      fx = -34 + t * 98
      ang = THREE.MathUtils.degToRad(-9 * Math.max(0, 1 - t * 2.2))
      y = D.STRING_Y; count = k < 28 ? 2 : 3; r = k < 28 ? 0.12 : 0.055 + (1 - t) * 0.03; wound = k < 28
    }
    const dir = [Math.sin(ang), -Math.cos(ang)]
    const front = [fx, -31.2 - (k % 2) * 0.5]   // agraffe / capo line
    // march until the string leaves the hitch-pin line
    let len = 10
    while (len < 260 && pointInPoly([front[0] + dir[0] * len, front[1] + dir[1] * len], hitchPoly)) len += 1
    let a = len - 1, b = len
    for (let i = 0; i < 12; i++) { const m = (a + b) / 2; pointInPoly([front[0] + dir[0] * m, front[1] + dir[1] * m], hitchPoly) ? a = m : b = m }
    len = a
    const at = z => (z - front[1]) / dir[1]    // distance along the string to depth z
    notes.push({ k, front, dir, len, y, count, r, wound, spacing: k < 20 ? 24 / 19 : 98 / 67, at })
  }
  {
    const strGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
    strGeo.rotateX(Math.PI / 2)   // along z
    const steelList = [], copperList = [], pinList = [], hitchList = [], agraffeList = []
    const PIN_TOP = D.PLATE_Y + D.PLATE_T
    const COIL_Y = PIN_TOP + 1.7
    for (const n of notes) {
      const perp = [-n.dir[1], n.dir[0]]
      for (let i = 0; i < n.count; i++) {
        const o = (i - (n.count - 1) / 2) * Math.min(0.42, n.spacing / (n.count + 0.6))
        const sx = n.front[0] + perp[0] * o, sz = n.front[1] + perp[1] * o
        const ex = sx + n.dir[0] * n.len, ez = sz + n.dir[1] * n.len
        const list = n.wound ? copperList : steelList
        list.push({ sx, sz, sy: n.y, ex, ez, ey: n.y, r: n.r })
        // Tuning pins stand in three staggered rows; a short length of string
        // runs from each pin's coil to the agraffe / capo bar.
        const row = (n.k * 3 + i) % 3
        const px = sx + (i - (n.count - 1) / 2) * 0.18, pz = -24.4 - row * 2.05
        pinList.push([px, pz])
        list.push({ sx: px, sz: pz, sy: COIL_Y, ex: sx, ez: sz, ey: n.y, r: n.r * 0.8 })
        hitchList.push([ex, ez, n.y])
      }
      if (n.k < 52) agraffeList.push([n.front[0], n.front[1], n.y, n.spacing])
    }
    const dummy = new THREE.Object3D()
    const _a = new THREE.Vector3(), _b = new THREE.Vector3()
    const build = (list, material) => {
      const im = new THREE.InstancedMesh(strGeo, material, list.length)
      list.forEach((s, i) => {
        _a.set(s.sx, s.sy, s.sz); _b.set(s.ex, s.ey, s.ez)
        dummy.position.copy(_a).add(_b).multiplyScalar(0.5)
        dummy.lookAt(_b)
        dummy.scale.set(s.r, s.r, _a.distanceTo(_b))
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix)
      })
      im.castShadow = true; im.receiveShadow = true
      root.add(im)
      return im
    }
    build(steelList, mat.steel)
    build(copperList, mat.copper)
    // Tuning pins: blued-steel shaft, a three-turn coil of string, polished top
    const pinGeo = lathe([
      [0, 0], [0.38, 0], [0.38, 1.05], [0.52, 1.2], [0.4, 1.38], [0.53, 1.55], [0.4, 1.72], [0.53, 1.9], [0.4, 2.08],
      [0.38, 2.3], [0.38, 3.2], [0.34, 3.35], [0.2, 3.45], [0, 3.48],
    ], 14)
    const pins = new THREE.InstancedMesh(pinGeo, mat.pins, pinList.length)
    pinList.forEach(([x, z], i) => { dummy.position.set(x, PIN_TOP + 0.05, z); dummy.rotation.set(0, i * 2.4, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); pins.setMatrixAt(i, dummy.matrix) })
    pins.castShadow = true; pins.receiveShadow = true
    root.add(pins)
    // The pins stand on a band of red felt
    {
      const xs = pinList.map(p => p[0])
      const x0 = Math.min(...xs) - 1.6, x1 = Math.max(...xs) + 1.6
      const band = new THREE.Mesh(roundedBox(x1 - x0, 0.4, 7.6, 0.15, 2), mat.felt)
      band.position.set((x0 + x1) / 2, PIN_TOP + 0.2, -26.45)
      add(band, root, false, true)
    }
    // Agraffes (bass and tenor): little brass blocks the strings pass through
    {
      const g = roundedBox(1, 1.3, 1.1, 0.2, 2)
      const ag = new THREE.InstancedMesh(g, mat.agraffe, agraffeList.length)
      agraffeList.forEach(([x, z, y, sp], i) => { dummy.position.set(x, y - 0.25, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(Math.min(1.1, sp * 0.8), 1, 1); dummy.updateMatrix(); ag.setMatrixAt(i, dummy.matrix) })
      ag.castShadow = true; ag.receiveShadow = true
      root.add(ag)
    }
    const hitchGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.4, 8)
    const hitch = new THREE.InstancedMesh(hitchGeo, mat.pins, hitchList.length)
    hitchList.forEach(([x, z, y], i) => { dummy.position.set(x, y - 0.6, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); hitch.setMatrixAt(i, dummy.matrix) })
    root.add(hitch)
    // Capo bar (pressure bar) across the treble strings at the speaking-length line
    const bar = new THREE.Mesh(roundedBox(70, 1.2, 2.2, 0.35, 2), mat.plate)
    bar.position.set(30, D.STRING_Y + 0.75, -31.6)
    add(bar)
    // Red stringing braid woven through the strings just inside the hitch pins
    {
      const s0 = 175, s1 = Math.min(totalS - 40, 425)
      const braid = toShape(band(s0, s1, D.RIM_T + 4.6, D.RIM_T + 6.4))
      add(new THREE.Mesh(extrudeUp(braid, D.STRING_Y - 0.15, 0.7, 0.2, 2, 1), mat.felt), root, false, true)
    }
  }

  // Hammers (under the strings at the strike slot) and dampers (on top)
  const hammerGeo = roundedBox(1, 2.4, 1.8, 0.4, 3)
  const damperFeltGeo = new THREE.BoxGeometry(1, 0.9, 4.2)
  const damperHeadGeo = roundedBox(1, 2.2, 4.6, 0.25, 2)
  const action = []
  for (const n of notes) {
    const midi = LOW + n.k
    const tH = n.at(D.STRIKE_Z), tD = n.at(D.DAMPER_Z)
    const hx = n.front[0] + n.dir[0] * tH, dx = n.front[0] + n.dir[0] * tD
    const w = n.spacing * 0.86
    const hammer = new THREE.Group()
    const head = new THREE.Mesh(hammerGeo, mat.hammerFelt)
    head.scale.x = w
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 6), mat.wood)
    shank.rotation.x = Math.PI / 2; shank.position.set(0, -1.6, 4)
    hammer.add(head, shank)
    hammer.rotation.y = Math.atan2(n.dir[0], -n.dir[1]) * -1
    const restY = n.y - n.r - 3.6, strikeY = n.y - n.r - 1.2
    hammer.position.set(hx, restY, D.STRIKE_Z)
    hammer.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
    root.add(hammer)
    let damper = null, dRestY = 0
    if (midi <= 88) {
      damper = new THREE.Group()
      const f = new THREE.Mesh(damperFeltGeo, mat.damperFelt); f.scale.x = w * 0.96; f.position.y = 0.45
      const h = new THREE.Mesh(damperHeadGeo, mat.bridge); h.scale.x = w * 0.96; h.position.y = 0.9 + 1.1
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), mat.pins); wire.position.y = 5
      damper.add(f, h, wire)
      damper.rotation.y = hammer.rotation.y
      dRestY = n.y + n.r
      damper.position.set(dx, dRestY, D.DAMPER_Z)
      damper.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
      root.add(damper)
    }
    action.push({ hammer, restY, strikeY, damper, dRestY, hv: 0, hy: restY, dy: 0 })
  }
  // Damper rail and the guide rail above the dampers
  {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(105, 1.2, 1.2), mat.raw)
    rail.position.set(-8, D.STRING_Y + 8.5, D.DAMPER_Z)
    add(rail)
  }

  // ── Keys ───────────────────────────────────────────────────────────────
  const keys = new Map()
  const keyMeshes = []
  {
    const whites = []
    for (let m = LOW; m <= HIGH; m++) if (!isBlack(m)) whites.push(m)
    const totalW = whites.length * D.WHITE_W
    const whiteX = new Map()
    whites.forEach((m, i) => whiteX.set(m, -totalW / 2 + D.WHITE_W * (i + 0.5)))
    const blackX = m => (whiteX.get(m - 1)) + D.WHITE_W / 2 + BLACK_OFFSET[m % 12] * D.WHITE_W
    const L = -D.KEY_BACK
    for (let m = LOW; m <= HIGH; m++) {
      const black = isBlack(m)
      const x = black ? blackX(m) : whiteX.get(m)
      let mesh
      if (black) {
        mesh = new THREE.Mesh(blackKeyGeometry(), mat.blackKey.clone())
      } else {
        const cut = side => {
          const n = m + side
          if (n < LOW || n > HIGH || !isBlack(n)) return 0
          const edge = blackX(n) - side * D.BLACK_W / 2
          return Math.max(0, side > 0 ? x + D.WHITE_W / 2 - edge : edge - (x - D.WHITE_W / 2))
        }
        mesh = new THREE.Mesh(whiteKeyGeometry(cut(-1), cut(1), L), [mat.whiteKey.clone(), mat.whiteKeySide])
      }
      mesh.castShadow = mesh.receiveShadow = true
      mesh.position.z = D.KEY_BACK - D.PIVOT_Z
      mesh.userData.midi = m
      const pivot = new THREE.Group()
      pivot.position.set(x, D.KEY_TOP - D.WHITE_H, D.PIVOT_Z)
      pivot.add(mesh)
      kb(pivot)
      root.add(pivot)
      keyMeshes.push(mesh)
      const top = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      keys.set(m, { pivot, mesh, black, angle: 0, held: false, vel: 0, top, tint: null, glow: 0, x })
    }
  }

  // ── Music desk with sheet music ─────────────────────────────────────────
  let deskRef = null, deskCover = null, showDesk = false
  {
    const desk = new THREE.Group()
    const panel = new THREE.Mesh(roundedBox(88, 30, 1.6, 0.5, 3), mat.case)
    panel.position.set(0, 15, 0)
    caseMeshes.push(panel)
    const ledge = new THREE.Mesh(roundedBox(90, 1.8, 4.4, 0.4, 3), mat.case)
    ledge.position.set(0, 0.9, 1.6)
    caseMeshes.push(ledge)
    const lip = new THREE.Mesh(roundedBox(90, 2.2, 0.8, 0.3, 2), mat.case)
    lip.position.set(0, 2.2, 3.6)
    caseMeshes.push(lip)
    desk.add(panel, ledge, lip)
    // two pages, slightly curled
    const pageGeo = new THREE.PlaneGeometry(21.6, 28, 12, 1)
    const pp = pageGeo.attributes.position
    for (let i = 0; i < pp.count; i++) { const u = pp.getX(i) / 10.8; pp.setZ(i, 0.6 * (1 - u * u)) }
    pageGeo.computeVertexNormals()
    for (const [i, title] of [[-1, 'Nocturne'], [1, '']]) {
      const page = new THREE.Mesh(pageGeo, mat.paper.clone())
      page.material.map = sheetTexture(41 + i, title)
      page.position.set(i * 11.2, 16.4, 1.05)
      page.rotation.y = i * 0.04
      desk.add(page)
    }
    // Pin cover: the flat panel the desk slides on. It hides the pin field, so
    // it only comes out with the desk.
    const cover = new THREE.Mesh(roundedBox(127, 1.4, 15, 0.4), mat.case)
    cover.position.set(0, 91.6, D.CASE_FRONT - 10)
    caseMeshes.push(cover)
    deskCover = add(cover)
    cover.visible = false
    desk.position.set(0, 92.3, -26)
    desk.rotation.x = -0.3
    desk.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
    root.add(desk)
    deskRef = desk
    // desk rails resting on the case sides
  }

  // ── Lid with folding flap, hinges and prop stick ───────────────────────
  const fullPoly = clipZ([...outer], null, D.CASE_FRONT)
  const HINGE_X = -74.8
  const lid = new THREE.Group()
  lid.position.set(HINGE_X, D.RIM_TOP + 0.05, 0)
  root.add(lid)
  {
    const main = toShape(clipZ(fullPoly, null, D.FLAP_HINGE).map(([x, z]) => [x - HINGE_X, z]))
    addCase(extrudeUp(main, 0, D.LID_T, 0.55, 4, 1), lid)
  }
  const flap = new THREE.Group()
  flap.position.set(0, D.LID_T, D.FLAP_HINGE)
  lid.add(flap)
  {
    const poly = clipZ(fullPoly, D.FLAP_HINGE + 0.15, D.CASE_FRONT).map(([x, z]) => [x - HINGE_X, z - D.FLAP_HINGE])
    addCase(extrudeUp(toShape(poly), -D.LID_T, D.LID_T, 0.55, 4, 1), flap)
    for (const x of [30, 74.8, 120]) {   // flap hinges
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12), mat.brass)
      h.rotation.z = Math.PI / 2; h.position.set(x, 0, 0)
      add(h, flap)
    }
  }
  for (const z of [-55, -120, -175]) {   // brass hinges on the spine
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 16), mat.brass)
    h.rotation.x = Math.PI / 2
    h.position.set(HINGE_X, D.RIM_TOP + 0.4, z)
    add(h)
  }
  const stickBase = new THREE.Vector3(35.2, D.RIM_TOP + 0.4, -121)
  {
    // a socket cup on the rim
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.8, 16), mat.brass)
    cup.position.copy(stickBase); cup.position.y = D.RIM_TOP + 0.3
    add(cup)
  }
  const stick = new THREE.Group()
  {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1, 16), mat.case)
    rod.position.y = 0.5
    caseMeshes.push(rod)
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2, 16), mat.brass)
    tip.name = 'tip'
    stick.add(rod, tip)
    stick.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
    root.add(stick)
  }
  const stickTopLocal = new THREE.Vector3(stickBase.x - HINGE_X - 1.5, 0, stickBase.z)

  // ── Legs, lyre and pedals ──────────────────────────────────────────────
  {
    const legGeo = legGeometry(D.RIM_BOTTOM - 2.2)
    for (const [x, z] of [[-66.5, -12], [66.5, -12], [-36, -185]]) {
      const leg = addCase(legGeo)
      leg.position.set(x, 8, z)
      const block = new THREE.Mesh(roundedBox(14, 3, 14, 0.6), mat.case)
      block.position.set(x, D.RIM_BOTTOM - 1.4, z)
      add(block); caseMeshes.push(block)
      const c = casterGroup(mat.case, mat.brass)
      c.position.set(x, 0, z)
      root.add(c)
    }
  }
  const pedals = []
  {
    const lyre = new THREE.Group()
    lyre.position.set(0, 0, -11)
    root.add(lyre)
    const top = 61, boxY = 6.5
    // two curved lyre posts
    for (const s of [-1, 1]) {
      const crv = new THREE.CubicBezierCurve3(
        new THREE.Vector3(s * 9, top, 0), new THREE.Vector3(s * 15, top - 18, 0),
        new THREE.Vector3(s * 4, boxY + 26, 0), new THREE.Vector3(s * 8, boxY + 5, 0))
      const tube = new THREE.Mesh(new THREE.TubeGeometry(crv, 48, 1.6, 16, false), mat.case)
      lyre.add(tube); caseMeshes.push(tube)
    }
    const plateTop = new THREE.Mesh(roundedBox(30, 2.4, 9, 0.6), mat.case)
    plateTop.position.y = top - 1.2
    lyre.add(plateTop); caseMeshes.push(plateTop)
    const box = new THREE.Mesh(roundedBox(36, 7, 10, 1.2, 4), mat.case)
    box.position.y = boxY
    lyre.add(box); caseMeshes.push(box)
    // diagonal braces back to the case
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(s * 12, boxY + 2, -4), b = new THREE.Vector3(s * 18, D.RIM_BOTTOM - 1, -48)
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, a.distanceTo(b), 12), mat.case)
      rod.position.copy(a).add(b).multiplyScalar(0.5)
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
      lyre.add(rod)
    }
    // three brass pedals pivoting inside the box
    const ps = new THREE.Shape()       // top view (x, z): narrow neck widening to a rounded foot
    ps.moveTo(-1.1, 0); ps.lineTo(1.1, 0); ps.lineTo(1.4, 7); ps.quadraticCurveTo(3.1, 9, 2.6, 13.5)
    ps.quadraticCurveTo(0, 15.8, -2.6, 13.5); ps.quadraticCurveTo(-3.1, 9, -1.4, 7); ps.lineTo(-1.1, 0)
    const pg = new THREE.ExtrudeGeometry(ps, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 3, curveSegments: 12 })
    pg.rotateX(Math.PI / 2)
    pg.computeVertexNormals()
    for (const [i, x] of [[0, -7.5], [1, 0], [2, 7.5]]) {
      const pivot = new THREE.Group()
      pivot.position.set(x, boxY - 1.4, 3.5)
      const p = new THREE.Mesh(pg, mat.brass)
      p.position.y = 0.4
      p.castShadow = p.receiveShadow = true
      pivot.add(p)
      pivot.rotation.x = -0.05
      lyre.add(pivot)
      pedals.push({ pivot, value: 0, target: 0 })
    }
    lyre.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
  }

  // ── Bench ──────────────────────────────────────────────────────────────
  const benchGroup = new THREE.Group()
  if (bench) {
    const seatY = 50
    const frame = new THREE.Mesh(roundedBox(76, 6, 36, 0.8, 3), mat.case)
    frame.position.y = seatY - 3
    caseMeshes.push(frame)
    const cushion = new THREE.Mesh(roundedBox(74, 6, 34, 2.4, 6), mat.leather)
    cushion.position.y = seatY + 2.4
    benchGroup.add(frame, cushion)
    const legGeo = lathe([[0, 0], [1.9, 0], [2.1, 1], [2.3, 30], [2.9, 38], [3.2, 41], [3.2, seatY - 6], [0, seatY - 6]], 32)
    for (const [x, z] of [[-33, -14], [33, -14], [-33, 14], [33, 14]]) {
      const l = new THREE.Mesh(legGeo, mat.case); l.position.set(x, 0, z)
      benchGroup.add(l); caseMeshes.push(l)
    }
    for (const s of [-1, 1]) {  // adjustment knobs
      const k = new THREE.Mesh(lathe([[0, 0], [2.4, 0], [2.6, 1], [2.2, 2.4], [0, 2.6]], 24), mat.brass)
      k.rotation.z = s * Math.PI / 2; k.position.set(s * 38, seatY - 3, 0)
      benchGroup.add(k)
    }
    benchGroup.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
    benchGroup.position.set(0, 0, 52)
    root.add(benchGroup)
  }

  // ── State and animation ────────────────────────────────────────────────
  let lidAngle = 0, lidTarget = THREE.MathUtils.degToRad(32), flapAngle = Math.PI, sustain = false
  const PRESS_W = 0.95 / (0 - D.PIVOT_Z), PRESS_B = 0.95 / (0 - D.PIVOT_Z)   // ~0.95 cm key dip

  const api = {
    root, keys, keyMeshes, materials: mat, bench: benchGroup, lid, get desk() { return deskRef },
    outline: fullPoly, feet: [[-66.5, -12], [66.5, -12], [-36, -185], [0, -8]],
    noteOn(midi, velocity = 0.7) {
      const k = keys.get(midi); if (!k) return
      k.held = true; k.vel = velocity
      const a = action[midi - LOW]
      a.hv = 60 + 220 * velocity    // hammer flies up (cm/s) and rebounds off the string
    },
    noteOff(midi) {
      const k = keys.get(midi); if (!k) return
      k.held = false
    },
    setSustain(on) { sustain = on; pedals[2].target = on ? 1 : 0 },
    // Colour a key while it is down (hand colours); null clears it.
    setKeyTint(midi, color) { const k = keys.get(midi); if (k) k.tint = color ? new THREE.Color(color) : null },
    keyGlow: 0,           // emissive strength of tinted keys (0 = realistic)
    setDesk(on) { showDesk = on },
    keyboardOnly: false,  // lesson view: only the keyboard, cheeks and fallboard
    mirror: fallMirror,
    keyX: m => keys.get(m)?.x ?? 0,
    setPedal(i, on) { pedals[i].target = on ? 1 : 0 },
    setLid(mode) {
      // 'full' | 'half' | 'closed'
      lidTarget = THREE.MathUtils.degToRad(mode === 'full' ? 32 : mode === 'half' ? 13 : 0)
      api.lidMode = mode
    },
    lidMode: 'full',
    setFinish(name) {
      const f = FINISHES[name] || FINISHES.ebony
      const m = mat.case
      m.map?.dispose(); m.map = null
      if (f.wood) { m.map = woodTexture(...f.wood, 77); m.map.repeat.set(1 / 90, 1 / 90); m.color.set(0xffffff) }
      else m.color.set(f.color)
      m.roughness = f.roughness; m.clearcoat = f.clearcoat; m.clearcoatRoughness = f.clearcoatRoughness
      m.needsUpdate = true
    },
    update(dt) {
      dt = Math.min(dt, 0.05)
      // keys: fast down, spring back up
      for (const [m, k] of keys) {
        const target = k.held ? (k.black ? PRESS_B : PRESS_W) : 0
        const rate = k.held ? 70 : 28
        k.angle += (target - k.angle) * Math.min(1, dt * rate)
        k.pivot.rotation.x = k.angle
        const g = k.held && k.tint && api.keyGlow > 0 ? 1 : 0
        k.glow += (g - k.glow) * Math.min(1, dt * (g ? 40 : 6))
        if (k.glow > 0.002 || k.top.emissiveIntensity) {
          if (k.tint) k.top.emissive.copy(k.tint)
          k.top.emissiveIntensity = k.glow > 0.002 ? k.glow * api.keyGlow * (k.black ? 1.6 : 1) : 0
        }
        const a = action[m - LOW]
        // hammer: ballistic up, falls back; rests a little raised (checked) while held
        const rest = k.held ? a.restY + 0.9 : a.restY
        if (a.hv > 0) {
          a.hy += a.hv * dt
          if (a.hy >= a.strikeY) { a.hy = a.strikeY; a.hv = -40 }
        } else {
          a.hv = 0
          a.hy += (rest - a.hy) * Math.min(1, dt * 14)
        }
        a.hammer.position.y = a.hy
        if (a.damper) {
          const up = k.held || sustain ? 0.85 : 0
          a.dy += (up - a.dy) * Math.min(1, dt * (up ? 40 : 18))
          a.damper.position.y = a.dRestY + a.dy
        }
      }
      for (const p of pedals) {
        p.value += (p.target - p.value) * Math.min(1, dt * 18)
        p.pivot.rotation.x = -0.05 + p.value * 0.09
      }
      // lid: fold the flap first when opening, unfold last when closing
      const flapTarget = lidTarget > 0.01 ? Math.PI : (lidAngle < 0.01 ? 0 : Math.PI)
      flapAngle += (flapTarget - flapAngle) * Math.min(1, dt * 3)
      const canMove = Math.abs(flapAngle - Math.PI) < 0.05 || lidTarget > 0.01
      if (canMove) lidAngle += (lidTarget - lidAngle) * Math.min(1, dt * 2.2)
      lid.rotation.z = lidAngle
      deskRef.visible = showDesk && lidTarget > 0.01 && !api.keyboardOnly
      deskCover.visible = showDesk
      flap.rotation.x = -flapAngle
      // prop stick from the rim cup to the lid's underside
      stick.visible = lidAngle > 0.02
      if (stick.visible) {
        lid.updateMatrixWorld()
        const top = lid.localToWorld(stickTopLocal.clone()).sub(root.position)
        const dir = top.clone().sub(stickBase), L = dir.length()
        stick.position.copy(stickBase)
        stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
        stick.children[0].scale.y = L
        stick.children[0].position.y = L / 2
        stick.children[1].position.y = L - 1
      }
      if (api.keyboardOnly) for (const c of root.children) { if (!c.userData.kb) c.visible = false }
      else if (wasKeyboardOnly) for (const c of root.children) if (!c.userData.kb && c !== stick && c !== deskRef && c !== deskCover) c.visible = c !== benchGroup || benchVisible
      if (api.keyboardOnly !== wasKeyboardOnly) wasKeyboardOnly = api.keyboardOnly
    },
    set benchVisible(v) { benchVisible = v; benchGroup.visible = v && !api.keyboardOnly },
  }
  let wasKeyboardOnly = false, benchVisible = true
  api.setFinish('ebony')
  lidAngle = lidTarget
  return api
}
