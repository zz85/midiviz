// Procedural pianist hands for three.js (Experiment #029).
//
// Each hand is a palm, a forearm, four three-joint fingers and a thumb, built
// from tapered cylinders with spheres at the joints. Every frame the motion
// model (motion.js) gives a fingertip target per finger; each finger is then
// solved with an exact planar IK:
//   - the finger turns (abducts) toward its target and bends in that plane
//   - the distal joint is coupled to the middle one (DIP ≈ 0.7 PIP, as in
//     real fingers), which leaves one unknown: the PIP angle p. The reach
//     |L1 + L2·e^{ip} + L3·e^{i(1+k)p}| falls monotonically with p, so p comes
//     from a bisection and the knuckle angle from the remaining direction.
// When a pressed key is out of reach the whole hand slides toward it.
//
// Units are centimetres in the grand piano's frame (see grand-piano.js): key
// tops at y = 73, key fronts at z = 0, the player sits at +z.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const FINGER_COLORS = ['#000', '#e2483d', '#f0a030', '#48b04c', '#3f8fe0', '#a05ad8']
const KEY_TOP = 73

// Adult hand, ~19 cm long (Buchholz et al. 1992 proportions, rounded).
// Per finger: segment lengths, radii, knuckle offset (x across the hand toward
// the little finger, y up, z toward the wrist) from the middle-finger knuckle.
const FINGERS = {
  1: { len: [4.3, 3.1, 2.6], rad: [1.15, 1.0, 0.9], base: [-3.4, -2.2, 4.6], k: 0.8 },
  2: { len: [4.4, 2.6, 2.0], rad: [0.92, 0.84, 0.76], base: [-2.25, 0, 0.35], k: 0.7 },
  3: { len: [4.9, 3.0, 2.2], rad: [0.95, 0.87, 0.78], base: [0, 0.25, 0], k: 0.7 },
  4: { len: [4.6, 2.8, 2.1], rad: [0.9, 0.82, 0.74], base: [2.1, 0, 0.35], k: 0.7 },
  5: { len: [3.7, 2.1, 1.9], rad: [0.8, 0.72, 0.66], base: [3.9, -0.65, 1.3], k: 0.7 },
}
const KNUCKLE_Y = 4.9, KNUCKLE_Z = 3.2   // middle knuckle above the key tops / in front of the key fronts

const Y = new THREE.Vector3(0, 1, 0)
const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3()

/** Reach of a coupled 3-link finger bent by PIP angle p: [forward, down]. */
function chain(L, k, p) {
  return [L[0] + L[1] * Math.cos(p) + L[2] * Math.cos((1 + k) * p), L[1] * Math.sin(p) + L[2] * Math.sin((1 + k) * p)]
}
const P_MIN = 0.08, P_MAX = 1.65

/**
 * Solve one finger: base B, target T (Vector3). Writes joint positions into
 * out[0..3] (out[0] = B). Returns how far short the tip falls (0 when reached).
 */
export function solveFinger(B, T, L, k, out) {
  _v.subVectors(T, B)
  const dx = Math.hypot(_v.x, _v.z), dy = _v.y
  if (dx > 1e-6) _u.set(_v.x / dx, 0, _v.z / dx); else _u.set(0, 0, -1)
  const r = Math.hypot(dx, dy)
  const rMax = Math.hypot(...chain(L, k, P_MIN)), rMin = Math.hypot(...chain(L, k, P_MAX))
  const rr = Math.min(rMax, Math.max(rMin, r))
  let lo = P_MIN, hi = P_MAX
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2
    if (Math.hypot(...chain(L, k, m)) > rr) lo = m; else hi = m
  }
  const p = (lo + hi) / 2
  const [cf, cd] = chain(L, k, p)
  const alpha = Math.atan2(-dy, dx), beta = Math.atan2(cd, cf)
  const a = alpha - beta
  const angles = [a, a + p, a + (1 + k) * p]
  out[0].copy(B)
  for (let i = 0; i < 3; i++) {
    out[i + 1].copy(out[i]).addScaledVector(_u, L[i] * Math.cos(angles[i])).addScaledVector(Y, -L[i] * Math.sin(angles[i]))
  }
  return Math.max(0, r - rMax)
}

function makeLabel(text, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = color
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill()
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke()
  g.fillStyle = '#fff'
  g.font = 'bold 40px Helvetica, Arial, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, 32, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  s.scale.setScalar(2.4)
  s.renderOrder = 10
  return s
}

/**
 * Build one hand. side: 'R' or 'L'. Returns { group, update(pose, dt), setStyle, setScale }.
 */
export function buildHand(side, { scale = 1 } = {}) {
  const s = side === 'R' ? 1 : -1
  const group = new THREE.Group()
  group.name = `hand${side}`
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xd9a383, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xff9a85), sheenRoughness: 0.6, clearcoat: 0.08 })
  const ghost = new THREE.MeshPhysicalMaterial({ color: side === 'R' ? 0xffa060 : 0x60c0ff, roughness: 0.3, transparent: true, opacity: 0.38, depthWrite: false, emissive: side === 'R' ? 0x552200 : 0x003355, emissiveIntensity: 0.6 })
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.85 })
  let mat = skin

  const meshes = []   // all skin meshes, for restyling
  const cyl = (r0, r1) => {
    const geo = new THREE.CylinderGeometry(r1, r0, 1, 14, 1, true)
    geo.translate(0, 0.5, 0)
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    meshes.push(m); group.add(m)
    return m
  }
  const ball = r => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat)
    m.castShadow = true
    meshes.push(m); group.add(m)
    return m
  }
  const place = (m, a, b) => {
    _a.subVectors(b, a)
    const len = _a.length()
    m.position.copy(a)
    m.scale.set(1, Math.max(1e-3, len), 1)
    m.quaternion.setFromUnitVectors(Y, _a.multiplyScalar(1 / (len || 1)))
  }

  const fingers = {}
  for (const f of [1, 2, 3, 4, 5]) {
    const d = FINGERS[f]
    const segs = d.len.map((_, i) => cyl(d.rad[i], d.rad[i + 1] ?? d.rad[i] * 0.85))
    const joints = d.rad.map(r => ball(r))
    const tip = ball(d.rad[2] * 0.88)
    // a coloured nail-side dot that lights up while the finger is down
    const dot = new THREE.Mesh(new THREE.SphereGeometry(d.rad[2] * 0.55, 12, 8), new THREE.MeshBasicMaterial({ color: FINGER_COLORS[f], transparent: true, opacity: 0 }))
    group.add(dot)
    const label = makeLabel(String(f), FINGER_COLORS[f])
    label.material.opacity = 0
    group.add(label)
    fingers[f] = { d, segs, joints, tip, dot, label, pts: [0, 1, 2, 3].map(() => new THREE.Vector3()), base: new THREE.Vector3(), target: new THREE.Vector3() }
  }
  // palm, thenar pad, wrist and forearm
  const palm = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.35), mat)
  palm.castShadow = true
  meshes.push(palm); group.add(palm)
  const thenar = ball(1)
  const wristBall = ball(2.1)
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.1, 1, 18, 1, true).translate(0, 0.5, 0), sleeve)
  group.add(forearm)
  const cuffWrist = ball(1)
  cuffWrist.visible = false

  let size = scale
  const offset = new THREE.Vector3()        // reach compensation, smoothed
  const knuckle = new THREE.Vector3(), wrist = new THREE.Vector3(), elbow = new THREE.Vector3()
  let showLabels = true

  function update(pose, dt = 1 / 60) {
    if (!pose) { group.visible = false; return }
    group.visible = true
    const { anchor, fingers: tips } = pose
    // where the hand would be: middle knuckle above the anchor, a little further in over black keys
    knuckle.set(anchor.x, KEY_TOP + KNUCKLE_Y * size + 1.2 * anchor.idle, (KNUCKLE_Z - 3.2 * anchor.black) * size + 3 * anchor.idle)
    // reach compensation: slide toward any pressed key the fingers cannot reach
    const need = _b.set(0, 0, 0)
    let worst = 0
    for (const f of [1, 2, 3, 4, 5]) {
      const F = fingers[f], d = F.d, t = tips[f - 1]
      F.base.set(knuckle.x + s * d.base[0] * size, knuckle.y + d.base[1] * size, knuckle.z + d.base[2] * size).add(offset)
      F.target.set(t.x, KEY_TOP + t.y + d.rad[2] * 0.9, t.z)
      if (t.press > 0.2 || t.y < 0.6) {
        const rMax = Math.hypot(...chain(d.len.map(l => l * size), d.k, 0.5))
        _v.subVectors(F.target, F.base)
        const e = _v.length() - rMax
        if (e > worst) { worst = e; need.copy(_v).setLength(e) }
      }
    }
    const target = _a.copy(offset).add(need)
    target.y = Math.max(-2, Math.min(1.5, target.y))
    offset.lerp(target, Math.min(1, dt * 18))
    for (const f of [1, 2, 3, 4, 5]) {
      const F = fingers[f], d = F.d, t = tips[f - 1]
      F.base.set(knuckle.x + s * d.base[0] * size, knuckle.y + d.base[1] * size, knuckle.z + d.base[2] * size).add(offset)
      solveFinger(F.base, F.target, d.len.map(l => l * size), d.k, F.pts)
      for (let i = 0; i < 3; i++) {
        place(F.segs[i], F.pts[i], F.pts[i + 1])
        F.joints[i].position.copy(F.pts[i])
      }
      F.tip.position.copy(F.pts[3])
      F.dot.position.copy(F.pts[3]).y += d.rad[2] * 0.55
      F.dot.material.opacity = t.press
      F.label.position.copy(F.pts[3]).y += 3.2 + (f === 1 ? 0 : 0.6)
      F.label.material.opacity = showLabels ? t.press : 0
    }
    // palm: from the wrist to the knuckle line
    const k2 = fingers[2].base, k5 = fingers[5].base, k3 = fingers[3].base
    wrist.set(k3.x + s * 0.6 * size, k3.y - 0.8 * size, k3.z + 8.6 * size)
    const mid = _a.addVectors(k2, k5).multiplyScalar(0.5).lerp(k3, 0.3)
    _v.subVectors(mid, wrist)
    palm.position.addVectors(mid, wrist).multiplyScalar(0.5).y -= 0.35 * size
    palm.scale.set(k2.distanceTo(k5) + 2.0 * size, 2.5 * size, _v.length() + 1.4 * size)
    palm.lookAt(mid.x, mid.y - 0.35 * size, mid.z)
    // tilt across the hand so the little-finger side drops a little
    palm.rotateZ(-s * Math.atan2(k2.y - k5.y, Math.abs(k5.x - k2.x)))
    const tb = fingers[1].base
    thenar.position.lerpVectors(tb, wrist, 0.45).y += 0.2 * size
    thenar.scale.set(1.9 * size, 1.4 * size, 2.6 * size)
    wristBall.position.copy(wrist).y -= 0.3 * size
    wristBall.scale.set(1.6 * size, 1.05 * size, 1.1 * size)
    elbow.set(wrist.x + s * 9, wrist.y - 11, wrist.z + 30)
    place(forearm, _b.copy(wrist).addScaledVector(_v.subVectors(elbow, wrist).normalize(), 2.2 * size), elbow)
  }

  return {
    group, side,
    update,
    setStyle(style) {
      mat = style === 'ghost' ? ghost : skin
      for (const m of meshes) m.material = mat
      forearm.visible = style !== 'ghost'
    },
    setScale(v) { size = v },
    setLabels(on) { showLabels = on },
  }
}
