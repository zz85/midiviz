// Procedural violin / viola / cello and bow for three.js (Experiment #033).
//
// Built in the instrument's own frame, in centimetres:
//   x along the strings, nut at x = 0, bridge at x = L (vibrating length),
//     the scroll toward −x, the tail toward +x
//   y up from the ribs' lower edge (top plate faces +y)
//   z across the strings: the lowest string at +z, the highest at −z
// The body is an arched grid over a violin outline (upper bout, C-bouts,
// lower bout), with ribs, a back, purfling and f-holes painted into a
// procedural spruce texture, a flamed maple back, an ebony fingerboard with a
// cambered top, pegbox and scroll, pegs, tailpiece, chin rest and a carved
// bridge. Strings are drawn nut → stop → bridge so a pressed string touches
// the fingerboard; the vibrating part blurs while it sounds.
//
// Sizes follow the instrument: a viola is the violin scaled to its string
// length (≈1.14×), a cello ≈2.1× with a deeper body and an end pin. The
// caller places the frame in the world: a violin / viola lies roughly flat
// (top up), a cello stands on its end pin with the back toward the player.

import * as THREE from 'three'
import { stopMM } from './fingering.js'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

// half width of a violin body (cm) at fraction f of its length from the top (neck end)
// (upper bout 16.8, C-bout waist 11.0, lower bout 20.6, length 35.6: Stradivari-like)
const OUTLINE = [[0, 0], [0.012, 3.2], [0.04, 6.0], [0.09, 7.7], [0.17, 8.4], [0.26, 7.9], [0.33, 6.6], [0.38, 5.7], [0.45, 5.5], [0.52, 5.9], [0.57, 7.1],
  [0.64, 8.9], [0.72, 10.0], [0.79, 10.3], [0.86, 9.9], [0.93, 8.2], [0.975, 5.6], [0.995, 2.6], [1, 0]]
function halfWidth(f) {
  f = clamp(f, 0, 1)
  let i = 0
  while (i < OUTLINE.length - 2 && OUTLINE[i + 1][0] < f) i++
  // Catmull-Rom through the table
  const p0 = OUTLINE[Math.max(0, i - 1)], p1 = OUTLINE[i], p2 = OUTLINE[i + 1], p3 = OUTLINE[Math.min(OUTLINE.length - 1, i + 2)]
  const t = (f - p1[0]) / (p2[0] - p1[0] || 1)
  const t2 = t * t, t3 = t2 * t
  const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  return Math.max(0, y)
}

function woodTexture({ base = '#b8651f', dark = '#6a2c08', light = '#e2a04a', w = 512, h = 1024, flame = false, top = false, paint = null } = {}) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, w, h)
  // varnish shading: darker toward the edges
  const rg = g.createRadialGradient(w / 2, h * 0.55, w * 0.1, w / 2, h * 0.55, w * 0.75)
  rg.addColorStop(0, 'rgba(255,190,90,0.35)'); rg.addColorStop(1, 'rgba(60,15,0,0.45)')
  g.fillStyle = rg; g.fillRect(0, 0, w, h)
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  if (top) {
    // spruce: fine straight grain along the length, wider near the edges
    for (let x = 0; x < w; x += 1) {
      const d = Math.abs(x - w / 2) / (w / 2)
      if (rnd() < 0.35 + 0.25 * d) {
        g.fillStyle = `rgba(70,25,0,${0.08 + 0.18 * rnd()})`
        g.fillRect(x, 0, 1 + (rnd() < 0.2 ? 1 : 0), h)
      }
    }
  } else if (flame) {
    // flamed maple: soft diagonal bands mirrored about the centre joint
    for (let y = -w; y < h + w; y += 6 + rnd() * 10) {
      const a = 0.05 + 0.16 * rnd()
      for (const side of [-1, 1]) {
        g.strokeStyle = `rgba(${rnd() < 0.5 ? '255,215,150' : '70,25,0'},${a})`
        g.lineWidth = 3 + rnd() * 7
        g.beginPath()
        g.moveTo(w / 2, y)
        g.lineTo(w / 2 + side * w / 2, y - 0.35 * w)
        g.stroke()
      }
    }
  } else {
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,20,0,${0.05 * rnd()})`; g.fillRect(rnd() * w, 0, 1 + 2 * rnd(), h) }
  }
  if (paint) paint(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/**
 * Build an instrument. instrument: an INSTRUMENTS entry. Returns
 * { group, stringY(s, x), stringZ(s, x), fbY(x, z), setPose(pose), L, … }.
 */
export function buildViolin(instrument, { finish = 'amber' } = {}) {
  const L = instrument.L / 10                 // vibrating length (cm)
  const S = instrument.open.length
  const k = L / 32.8                          // scale against a violin
  const cello = instrument.L > 500          // upright: cello and double bass
  const bass = instrument.L > 900
  const group = new THREE.Group()
  group.name = 'violin'

  const bodyLen = 35.6 * k, neckLen = 13.0 * k * (cello ? 1.12 : 1)
  const x0 = neckLen                            // top of the body
  const rib = (cello ? 12 : 3.1) * (cello ? k / 2.1 : k) * (bass ? 1.05 : 1)
  const archTop = (cello ? 2.4 : 1.6) * k, archBack = (cello ? 2.2 : 1.5) * k
  const hw = x => {
    const f = (x - x0) / bodyLen
    // the bass's viol-like sloping shoulders: the upper bout narrows toward the neck
    const slope = bass && f < 0.34 ? 0.5 + 0.5 * Math.sin(Math.PI / 2 * f / 0.34) : 1
    return halfWidth(f) * k * slope
  }
  const arch = (x, t) => {
    const f = (x - x0) / bodyLen
    const along = Math.sin(Math.PI * clamp(f, 0, 1)) ** 0.6
    const a = clamp(1 - t * t, 0, 1)
    // flat channel near the edge, then the long arch
    return along * (a ** 1.6)
  }

  // ── materials ──
  const colors = {
    amber: { base: '#b45a1c', dark: '#5a2206', light: '#e09b48' },
    red: { base: '#8f2a12', dark: '#3c0a02', light: '#c4552a' },
    golden: { base: '#c98a35', dark: '#6b3a0e', light: '#efc070' },
    dark: { base: '#4a1e0c', dark: '#1d0802', light: '#7a3a1a' },
  }[finish] || { base: '#b45a1c' }
  const N = 120, M = 40   // grid resolution along / across
  const uvOf = (x, z) => [(x - x0) / bodyLen, 0.5 + 0.5 * z / Math.max(0.01, hw(x))]
  const topTex = woodTexture({ ...colors, top: true, paint: (g, w, h) => {
    // purfling: a black/white/black line ~4 mm inside the edge
    const pathAt = inset => {
      g.beginPath()
      for (let i = 0; i <= 200; i++) {
        const f = i / 200, x = x0 + f * bodyLen, half = hw(x)
        const v = half > inset ? 0.5 + 0.5 * (half - inset) / half : 0.5
        const px = v * w, py = f * h
        i ? g.lineTo(px, py) : g.moveTo(px, py)
      }
      for (let i = 200; i >= 0; i--) {
        const f = i / 200, x = x0 + f * bodyLen, half = hw(x)
        const v = half > inset ? 0.5 - 0.5 * (half - inset) / half : 0.5
        g.lineTo(v * w, f * h)
      }
      g.closePath()
    }
    g.lineWidth = 3; g.strokeStyle = 'rgba(20,8,2,0.9)'; pathAt(0.42 * k); g.stroke()
    g.lineWidth = 1; g.strokeStyle = 'rgba(240,220,190,0.6)'; pathAt(0.42 * k); g.stroke()
    // f-holes: centred on the bridge line, either side of the centre
    const bx = L
    for (const side of [-1, 1]) {
      const toPx = (x, z) => { const [u, v] = uvOf(x, z); return [v * w, u * h] }
      const zc = side * 3.9 * k
      const pts = []
      // an "f": upper eye, stem, lower eye
      const len = 7.4 * k
      for (let i = 0; i <= 30; i++) {
        const t = i / 30
        const x = bx - len * 0.5 + len * t
        const z = zc + side * (0.9 * k) * Math.sin(Math.PI * (t - 0.5)) * -1 + side * 0.15 * k * Math.sin(2 * Math.PI * t)
        pts.push([x, z, 0.12 * k + 0.12 * k * Math.sin(Math.PI * t)])
      }
      g.fillStyle = '#0c0502'
      g.beginPath()
      pts.forEach(([x, z, r], i) => { const [px, py] = toPx(x, z + r); i ? g.lineTo(px, py) : g.moveTo(px, py) })
      for (let i = pts.length - 1; i >= 0; i--) { const [x, z, r] = pts[i]; const [px, py] = toPx(x, z - r); g.lineTo(px, py) }
      g.closePath(); g.fill()
      for (const t of [0, 1]) {
        const [x, z] = pts[t ? pts.length - 1 : 0]
        const [px, py] = toPx(x + (t ? 0.25 : -0.25) * k, z)
        g.beginPath(); g.arc(px, py, 0.33 * k / bodyLen * h, 0, Math.PI * 2); g.fill()
      }
      // the notches
      const [nx, ny] = toPx(bx, zc)
      g.fillRect(nx - 6, ny - 1, 12, 2)
    }
  } })
  const varnish = map => new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2, sheenColor: new THREE.Color(0xffc080) })
  const topMat = varnish(topTex)
  const backMat = varnish(woodTexture({ ...colors, flame: true }))
  const ribMat = varnish(woodTexture({ ...colors, flame: true, w: 256, h: 256 }))
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x141110, roughness: 0.38, clearcoat: 0.3 })
  const maple = new THREE.MeshStandardMaterial({ color: 0xd9b47c, roughness: 0.6 })
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfcfd4, metalness: 0.95, roughness: 0.25 })
  const gut = new THREE.MeshStandardMaterial({ color: 0xa88c6c, metalness: 0.7, roughness: 0.35 })
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m }

  // ── body: arched top, back, ribs ──
  function plate(sign, height, archH, mat) {
    const pos = [], uv = [], idx = []
    for (let i = 0; i <= N; i++) {
      const f = i / N, x = x0 + f * bodyLen, half = hw(x)
      for (let j = 0; j <= M; j++) {
        const t = -1 + 2 * j / M
        const z = t * half
        pos.push(x, height + sign * (0.15 * k + archH * arch(x, t)), z)
        uv.push(0.5 + 0.5 * t, 1 - f)
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + M + 1
      if (sign > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return shadowy(new THREE.Mesh(geo, mat))
  }
  const top = plate(1, rib, archTop, topMat)
  topTex.flipY = false
  // the plate's uv: u across (0..1), v along — repaint orientation: our canvas has x = across, y = along
  top.geometry.attributes.uv.array.forEach((_, i, a) => { if (i % 2 === 1) a[i] = 1 - a[i] })
  group.add(top)
  group.add(plate(-1, 0, archBack, backMat))
  {
    // ribs: a band around the outline with a slight overhang of the plates
    const pos = [], uv = [], idx = []
    const ring = []
    for (let i = 0; i <= N; i++) { const x = x0 + i / N * bodyLen; ring.push([x, -hw(x) + 0.12 * k]) }
    for (let i = N; i >= 0; i--) { const x = x0 + i / N * bodyLen; ring.push([x, hw(x) - 0.12 * k]) }
    ring.forEach(([x, z], i) => { pos.push(x, 0.1 * k, z, x, rib + 0.1 * k, z); uv.push(i / ring.length, 0, i / ring.length, 1) })
    for (let i = 0; i < ring.length - 1; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const ribs = shadowy(new THREE.Mesh(geo, ribMat))
    ribs.material.side = THREE.DoubleSide
    group.add(ribs)
  }
  const topY = (x, z) => { const half = hw(x); return rib + 0.15 * k + archTop * arch(x, half ? z / half : 1) }

  // ── strings geometry: heights and spacing ──
  const bridgeH = (cello ? 9.0 : 3.3) * k * (cello ? 0.55 : 1)
  const yBridge = topY(L, 0) + bridgeH
  const yNut = yBridge - (cello ? 4.2 : 4.3) * k
  const nutSpread = 1.65 * k * (cello ? 0.95 : 1), bridgeSpread = 3.4 * k * (cello ? 0.95 : 1)
  const sFrac = s => (S === 1 ? 0 : 0.5 - s / (S - 1))        // +0.5 lowest string … −0.5 highest
  const stringZ = (s, x) => sFrac(s) * lerp(nutSpread, bridgeSpread, clamp(x / L, 0, 1.2))
  const crown = s => 0.32 * k * (1 - (2 * sFrac(s)) ** 2)      // bridge curvature: middle strings higher
  const stringYraw = (s, x) => lerp(yNut + 0.04 * k, yBridge + crown(s), x / L)
  // fingerboard: under the strings, clearance grows toward its end; cambered top
  const fbEnd = 27 * k * (cello ? 0.98 : 1)
  const clearance = x => lerp(0.06, 0.42, clamp(x / fbEnd, 0, 1)) * k * (cello ? 1.4 : 1)
  const fbHalf = x => lerp(1.2, 2.1, clamp(x / fbEnd, 0, 1)) * k
  const fbY = (x, z) => {
    const yc = lerp(yNut, yBridge, x / L) - clearance(x) + 0.32 * k * (x / L) * 0.6
    const r = z / fbHalf(x)
    return yc - 0.22 * k * r * r
  }
  const stringY = (s, x) => Math.max(stringYraw(s, x), fbY(x, stringZ(s, x)) + clearance(x) * 0.95)

  // ── neck, fingerboard, pegbox, scroll ──
  {
    // fingerboard: lofted cross-sections from the nut to its end
    const pos = [], idx = []
    const NX = 40, NZ = 12
    for (let i = 0; i <= NX; i++) {
      const x = -0.1 + (fbEnd + 0.1) * i / NX, half = fbHalf(x)
      const ring = []
      for (let j = 0; j <= NZ; j++) { const z = -half + 2 * half * j / NZ; ring.push([z, fbY(x, z)]) }
      const th = 0.65 * k
      ring.push([half, fbY(x, half) - th], [-half, fbY(x, -half) - th])
      for (const [z, y] of ring) pos.push(x, y, z)
    }
    const R = NZ + 3
    for (let i = 0; i < NX; i++) for (let j = 0; j < R; j++) {
      const a = i * R + j, b = a + R, a2 = i * R + (j + 1) % R, b2 = a2 + R
      idx.push(a, b, a2, a2, b, b2)
    }
    const end = NX * R
    for (let j = 1; j < R - 1; j++) idx.push(end, end + j, end + j + 1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    group.add(shadowy(new THREE.Mesh(geo, ebony)))
  }
  {
    // neck: a rounded "D" under the fingerboard from the pegbox to the heel
    const pts = []
    const NX = 24
    const pos = [], idx = []
    for (let i = 0; i <= NX; i++) {
      const x = -1.5 * k + (x0 + 0.5 * k + 1.5 * k) * i / NX
      const half = fbHalf(Math.max(0, x)) * 0.98
      const yTop = fbY(Math.max(0, x), 0) - 0.6 * k
      const depth = lerp(1.9, 2.5, clamp(x / x0, 0, 1)) * k * (cello ? 1.2 : 1) + (x > x0 - 2 * k ? (x - (x0 - 2 * k)) * 0.9 : 0)
      for (let j = 0; j <= 16; j++) {
        const a = Math.PI * j / 16
        pos.push(x, yTop - depth * Math.sin(a), half * Math.cos(a))
      }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < 16; j++) { const a = i * 17 + j, b = a + 17; idx.push(a, a + 1, b, a + 1, b + 1, b) }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    group.add(shadowy(new THREE.Mesh(geo, backMat)))
    void pts
  }
  // nut
  {
    const nut = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.5 * k, 0.5 * k, fbHalf(0) * 2), ebony))
    nut.position.set(-0.25 * k, yNut - 0.2 * k, 0)
    group.add(nut)
  }
  // pegbox: two cheeks and a back, rising toward the scroll
  const pegLen = 7.5 * k * (cello ? 1.05 : 1)
  const pegbox = new THREE.Group()
  pegbox.position.set(-0.5 * k, yNut - 0.6 * k, 0)
  pegbox.rotation.z = -0.24     // the pegbox tilts back
  group.add(pegbox)
  for (const side of [-1, 1]) {
    const cheek = shadowy(new THREE.Mesh(new THREE.BoxGeometry(pegLen, 2.2 * k, 0.32 * k), backMat))
    cheek.position.set(-pegLen / 2, -0.8 * k, side * 1.0 * k)
    pegbox.add(cheek)
  }
  {
    const floor = shadowy(new THREE.Mesh(new THREE.BoxGeometry(pegLen, 0.35 * k, 2.3 * k), backMat))
    floor.position.set(-pegLen / 2, -1.75 * k, 0)
    pegbox.add(floor)
    const inside = new THREE.Mesh(new THREE.BoxGeometry(pegLen * 0.95, 0.05, 1.7 * k), new THREE.MeshBasicMaterial({ color: 0x120804 }))
    inside.position.set(-pegLen / 2, -1.55 * k, 0)
    pegbox.add(inside)
  }
  // scroll: a volute on each side and a fluted spine, from a spiral
  {
    const scroll = new THREE.Group()
    scroll.position.set(-pegLen - 0.6 * k, -0.3 * k, 0)
    pegbox.add(scroll)
    const spiral = []
    for (let i = 0; i <= 80; i++) {
      const a = i / 80 * Math.PI * 2 * 2.3
      const r = 2.3 * k * Math.exp(-a * 0.16)
      spiral.push(new THREE.Vector3(-Math.sin(a) * r, Math.cos(a) * r - 0.6 * k, 0))
    }
    const curve = new THREE.CatmullRomCurve3(spiral)
    for (const side of [-1, 1]) {
      const tube = shadowy(new THREE.Mesh(new THREE.TubeGeometry(curve, 140, 0.32 * k, 10, false), backMat))
      tube.position.z = side * 0.95 * k
      tube.scale.z = 1.6
      scroll.add(tube)
      const eye = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.42 * k, 0.42 * k, 0.5 * k, 16), backMat))
      eye.rotation.x = Math.PI / 2
      eye.position.set(spiral[80].x, spiral[80].y, side * 1.05 * k)
      scroll.add(eye)
    }
    const spine = shadowy(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral.slice(0, 45)), 80, 0.75 * k, 12, false), backMat))
    spine.scale.z = 1.25
    scroll.add(spine)
  }
  // pegs: two per side, alternating, with the strings wound on them
  const pegXs = []
  for (let s = 0; s < S; s++) {
    const side = s % 2 === 0 ? 1 : -1
    const px = -1.6 * k - (s >= 2 ? 3.3 : 1.4) * k - (s % 2) * 1.1 * k
    pegXs.push(px)
    const peg = new THREE.Group()
    peg.position.set(px, -1.0 * k, 0)
    pegbox.add(peg)
    const shaft = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.33 * k, 4.4 * k, 12), ebony))
    shaft.rotation.x = Math.PI / 2
    shaft.position.z = side * 1.6 * k
    peg.add(shaft)
    const head = shadowy(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), ebony))
    head.scale.set(0.9 * k, 1.35 * k, 0.32 * k)
    head.position.z = side * 3.9 * k
    peg.add(head)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3 * k, 0.07 * k, 8, 16), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 }))
    collar.position.z = side * 3.4 * k
    peg.add(collar)
  }
  // tailpiece, saddle, end button, chin rest
  const tailX0 = L + 3.6 * k, tailX1 = x0 + bodyLen - 1.2 * k
  {
    const shape = new THREE.Shape()
    const wN = 2.0 * k, wE = 3.6 * k
    shape.moveTo(0, -wN / 2); shape.lineTo(tailX1 - tailX0, -wE / 2 + 0.4 * k)
    shape.quadraticCurveTo(tailX1 - tailX0 + 0.6 * k, 0, tailX1 - tailX0, wE / 2 - 0.4 * k)
    shape.lineTo(0, wN / 2); shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.45 * k, bevelEnabled: true, bevelThickness: 0.12 * k, bevelSize: 0.12 * k, bevelSegments: 2 })
    geo.rotateX(Math.PI / 2)
    const tail = shadowy(new THREE.Mesh(geo, ebony))
    tail.position.set(tailX0, topY(tailX0, 0) + 1.3 * k, 0)
    tail.rotation.z = -0.07
    group.add(tail)
    // fine tuner on the top string
    const tuner = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * k, 0.18 * k, 0.9 * k, 10), steel)
    tuner.position.set(tailX0 + 1.0 * k, topY(tailX0, 0) + 1.8 * k, stringZ(S - 1, tailX0 + 1 * k) * 0.55)
    group.add(tuner)
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.45 * k, 14, 10), ebony)
    button.position.set(x0 + bodyLen + 0.2 * k, rib / 2, 0)
    group.add(button)
    if (!cello) {
      // chin rest (Guarneri-style, over the tailpiece's bass side)
      const cr = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ebony)
      cr.scale.set(3.4 * k, 1.0 * k, 4.2 * k)
      cr.position.set(x0 + bodyLen - 3.6 * k, rib + 1.0 * k, 3.9 * k)
      cr.rotation.z = 0.15
      shadowy(cr)
      group.add(cr)
    } else {
      const pinLen = bass ? 30 : 45
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(bass ? 0.6 : 0.4, bass ? 0.4 : 0.25, pinLen, 10), steel)
      pin.rotation.z = Math.PI / 2
      pin.position.set(x0 + bodyLen + pinLen / 2 - 0.5, rib / 2, 0)
      group.add(pin)
    }
  }
  // bridge: maple, curved top, with heart and kidneys cut out
  {
    const bw = 4.2 * k * (cello ? 0.95 : 1), bh = bridgeH
    const sh = new THREE.Shape()
    sh.moveTo(-bw / 2, 0)
    sh.lineTo(-bw * 0.36, 0)
    sh.quadraticCurveTo(-bw * 0.24, bh * 0.18, -bw * 0.12, 0)
    sh.lineTo(bw * 0.12, 0)
    sh.quadraticCurveTo(bw * 0.24, bh * 0.18, bw * 0.36, 0)
    sh.lineTo(bw / 2, 0)
    sh.quadraticCurveTo(bw * 0.42, bh * 0.55, bw * 0.47, bh * 0.82)
    sh.quadraticCurveTo(0, bh * 1.12, -bw * 0.47, bh * 0.82)
    sh.quadraticCurveTo(-bw * 0.42, bh * 0.55, -bw / 2, 0)
    const heart = new THREE.Path()
    heart.absellipse(0, bh * 0.56, bw * 0.07, bh * 0.1, 0, Math.PI * 2, false)
    sh.holes.push(heart)
    for (const side of [-1, 1]) {
      const kid = new THREE.Path()
      kid.absellipse(side * bw * 0.25, bh * 0.4, bw * 0.06, bh * 0.14, 0, Math.PI * 2, false)
      sh.holes.push(kid)
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.38 * k, bevelEnabled: false, curveSegments: 16 })
    geo.translate(0, 0, -0.19 * k)
    const bridge = shadowy(new THREE.Mesh(geo, maple))
    bridge.rotation.y = Math.PI / 2
    bridge.position.set(L, topY(L, 0) - 0.05 * k, 0)
    group.add(bridge)
  }

  // ── strings: nut → stop → bridge, then afterlength to the tailpiece, and from the nut to the peg ──
  const strMats = [], strings = []
  const stringRadius = s => (cello ? 0.075 : 0.04) * k * (1.35 - 0.25 * s / Math.max(1, S - 1))
  for (let s = 0; s < S; s++) {
    const mat = (s === S - 1 && !cello ? steel : gut).clone()
    strMats.push(mat)
    const seg = () => {
      const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true)
      geo.translate(0, 0.5, 0)
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = true
      group.add(m)
      return m
    }
    const blurMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0, depthWrite: false })
    const blurGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0)
    const blur = new THREE.Mesh(blurGeo, blurMat)
    blur.renderOrder = 2
    group.add(blur)
    strings.push({ a: seg(), b: seg(), tail: seg(), head: seg(), blur, r: stringRadius(s) })
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0)
  const place = (m, a, b, r) => {
    _d.subVectors(b, a)
    const len = _d.length()
    m.position.copy(a)
    m.scale.set(r, Math.max(1e-4, len), r)
    m.quaternion.setFromUnitVectors(Y, _d.multiplyScalar(1 / (len || 1)))
  }
  const pegWorld = new THREE.Vector3()
  function layoutStrings(stops = [], vib = [], time = 0) {
    for (let s = 0; s < S; s++) {
      const st = strings[s]
      const nut = new THREE.Vector3(0, stringY(s, 0), stringZ(s, 0))
      const br = new THREE.Vector3(L, stringY(s, L), stringZ(s, L))
      let stop = nut
      if (stops[s] != null && stops[s] > 0.05) {
        const x = stops[s]
        stop = new THREE.Vector3(x, fbY(x, stringZ(s, x)) + st.r, stringZ(s, x))
      }
      place(st.a, nut, stop, st.r)
      place(st.b, stop, br, st.r)
      const tl = new THREE.Vector3(tailX0 + 0.4 * k, topY(tailX0, 0) + 1.55 * k, stringZ(s, L) * 0.6)
      place(st.tail, br, tl, st.r)
      pegbox.updateMatrix()
      pegWorld.set(pegXs[s], -1.0 * k, 0).applyMatrix4(pegbox.matrix)
      place(st.head, new THREE.Vector3(-0.3 * k, yNut + 0.05, stringZ(s, 0)), pegWorld, st.r)
      // vibration: a translucent envelope over the sounding part
      const amp = vib[s] || 0
      if (amp > 0.01) {
        st.blur.visible = true
        place(st.blur, stop, br, st.r * (1.4 + 3.2 * amp * (0.85 + 0.15 * Math.sin(time * 90 + s))))
        st.blur.material.opacity = 0.22 + 0.25 * amp
      } else st.blur.visible = false
    }
  }
  layoutStrings()

  return {
    group, L, S, k, x0, bodyLen, rib, cello,
    // tip of the cello's end pin (on the floor), in the instrument frame
    endPin: new THREE.Vector3(x0 + bodyLen + (bass ? 29.5 : 44.5), rib / 2, 0), bass,
    // the back of the neck under the fingerboard centre line (where a thumb rests)
    neckBackY: x => fbY(Math.max(0, x), 0) - 0.6 * k - (lerp(1.9, 2.5, clamp(x / x0, 0, 1)) * k * (cello ? 1.2 : 1)),
    stringY, stringZ, fbY, topY, fbHalf, fbEnd, yBridge, layoutStrings,
    uOfSemis: n => stopMM(n, instrument.L) / 10,
    bowContact(s, beta = 2.6 * k) {
      // a point on string s (float) at beta cm from the bridge
      const x = L - beta
      const s0 = clamp(Math.floor(s), 0, S - 1), s1 = clamp(Math.ceil(s), 0, S - 1), t = s - s0
      return new THREE.Vector3(x, lerp(stringY(s0, x), stringY(s1, x), t), lerp(stringZ(s0, x), stringZ(s1, x), t))
    },
    // bow tilt across the strings that touches string s (radians about x): tangent of the bridge arc
    bowTilt(s) {
      const f = S === 1 ? 0 : s / (S - 1)
      return lerp(-0.3, 0.3, f)
    },
  }
}

/**
 * The bow: stick, frog, tip and hair. Its frame: origin at the frog end of
 * the hair, +x along the hair toward the tip, hair surface at y = 0, stick
 * above (+y). Returns { group, hairLen }.
 */
export function buildBow({ scale = 1 } = {}) {
  const k = scale
  const hairLen = 65 * k
  const group = new THREE.Group()
  group.name = 'bow'
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x5a2410, roughness: 0.35, clearcoat: 0.6 })
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x0e0b0a, roughness: 0.3, clearcoat: 0.4 })
  const silver = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.25 })
  const hair = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.85, side: THREE.DoubleSide })
  // stick: cambered (bends toward the hair in the middle), tapering to the tip
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const x = -6 * k + (hairLen + 7.5 * k) * t
    const y = (1.6 - 1.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x + 2) / (hairLen + 2)))) + 0.4 * t) * k
    pts.push(new THREE.Vector3(x, y, 0))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const geo = new THREE.TubeGeometry(curve, 120, 0.4 * k, 10, false)
  // taper toward the tip
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const t = Math.min(1, Math.max(0, (x + 6 * k) / (hairLen + 7.5 * k)))
    const r = 1 - 0.45 * t
    const c = curve.getPointAt(t)
    p.setY(i, c.y + (p.getY(i) - c.y) * r)
    p.setZ(i, p.getZ(i) * r)
  }
  geo.computeVertexNormals()
  const stick = new THREE.Mesh(geo, wood)
  stick.castShadow = true
  group.add(stick)
  // frog with a silver ferrule and a pearl eye; screw button
  const frog = new THREE.Mesh(new THREE.BoxGeometry(4.8 * k, 1.7 * k, 1.05 * k), ebony)
  frog.position.set(-1.6 * k, 0.75 * k, 0)
  frog.castShadow = true
  group.add(frog)
  const ferrule = new THREE.Mesh(new THREE.BoxGeometry(0.4 * k, 0.5 * k, 1.1 * k), silver)
  ferrule.position.set(0.85 * k, 0.15 * k, 0)
  group.add(ferrule)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.28 * k, 16), new THREE.MeshPhysicalMaterial({ color: 0xf6f1ff, iridescence: 1, roughness: 0.2 }))
    eye.position.set(-2.2 * k, 0.8 * k, side * 0.53 * k)
    eye.rotation.y = side > 0 ? 0 : Math.PI
    group.add(eye)
  }
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * k, 0.42 * k, 1.8 * k, 12), silver)
  button.rotation.z = Math.PI / 2
  button.position.set(-6.9 * k, 1.6 * k, 0)
  group.add(button)
  // tip (head) with an ivory-coloured plate
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1 * k, 2.0 * k, 0.75 * k), wood)
  head.position.set(hairLen + 0.4 * k, 1.0 * k, 0)
  group.add(head)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3 * k, 1.9 * k, 0.78 * k), new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.4 }))
  plate.position.set(hairLen + 1.0 * k, 0.95 * k, 0)
  group.add(plate)
  // hair: a flat ribbon
  const hairMesh = new THREE.Mesh(new THREE.PlaneGeometry(hairLen, 0.95 * k), hair)
  hairMesh.rotation.x = -Math.PI / 2
  hairMesh.position.set(hairLen / 2, 0, 0)
  group.add(hairMesh)
  return { group, hairLen }
}
