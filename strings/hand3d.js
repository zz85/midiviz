// Violinist hands and arms for three.js (Experiment #033).
//
// Built inside the instrument's frame (violin3d.js: x along the strings from
// the nut, y up, z across with the lowest string at +z), so they move with
// the instrument however it is held.
//
// Left hand: the neck lies between the thumb and the base of the index
// finger. The knuckles sit beside the fingerboard on the top-string side,
// over the current frame; the fingers arch over the strings and come down on
// their stops, solved with the coupled-joint planar IK of #029
// (fingering/hands3d.js solveFinger: DIP ≈ 0.7 PIP, bisection on the PIP
// angle). The thumb rests under the neck on the bass side, opposite fingers
// 1–2, and parks at the neck heel in high positions. The forearm runs down to
// an elbow under the instrument that swings toward the bass strings.
//
// Right hand: a bow hold (thumb bent under the stick at the frog, fingers
// draped over the stick, little finger curved on top) carried by the bow,
// with a two-bone arm from a fixed shoulder.

import * as THREE from 'three'
import { solveFinger } from '../fingering/hands3d.js'

export const FINGER_COLORS = ['#d8d2c4', '#e2483d', '#f0a030', '#48b04c', '#3f8fe0']
const Y = new THREE.Vector3(0, 1, 0)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3()

function skinMats() {
  return {
    skin: new THREE.MeshPhysicalMaterial({ color: 0xd9a383, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xff9a85), sheenRoughness: 0.6, clearcoat: 0.06 }),
    ghost: new THREE.MeshPhysicalMaterial({ color: 0x60c0ff, roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false, emissive: 0x003355, emissiveIntensity: 0.6 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.85 }),
  }
}

function makeLabel(text, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = color
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill()
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke()
  g.fillStyle = '#fff'; g.font = 'bold 40px Helvetica, Arial, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 32, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  s.renderOrder = 10
  return s
}

/** Shared mesh helpers. */
function kit(group, mats) {
  const meshes = []
  const cyl = (r0, r1, mat = mats.skin) => {
    const geo = new THREE.CylinderGeometry(r1, r0, 1, 12, 1, true)
    geo.translate(0, 0.5, 0)
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    if (mat === mats.skin) meshes.push(m)
    group.add(m)
    return m
  }
  const ball = (r, mat = mats.skin) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat)
    m.castShadow = true
    if (mat === mats.skin) meshes.push(m)
    group.add(m)
    return m
  }
  const place = (m, a, b) => {
    _a.subVectors(b, a)
    const len = _a.length()
    m.position.copy(a)
    m.scale.set(1, Math.max(1e-3, len), 1)
    m.quaternion.setFromUnitVectors(Y, _a.multiplyScalar(1 / (len || 1)))
  }
  return { meshes, cyl, ball, place }
}

/** Two-bone IK: joint between A and C with segment lengths l1, l2, bending toward pole. */
export function twoBone(A, C, l1, l2, pole, out) {
  _a.subVectors(C, A)
  let d = _a.length()
  const dir = _a.multiplyScalar(1 / (d || 1))
  d = Math.min(d, l1 + l2 - 1e-3)
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x))
  _b.subVectors(pole, A)
  _b.addScaledVector(dir, -_b.dot(dir))
  if (_b.lengthSq() < 1e-6) _b.set(0, -1, 0)
  _b.normalize()
  return out.copy(A).addScaledVector(dir, x).addScaledVector(_b, h)
}

// finger proportions (cm): segment lengths and radii, knuckle spacing
const LEFT = {
  1: { len: [4.2, 2.5, 1.9], rad: [0.92, 0.82, 0.74] },
  2: { len: [4.7, 2.9, 2.1], rad: [0.95, 0.85, 0.76] },
  3: { len: [4.4, 2.7, 2.0], rad: [0.9, 0.8, 0.72] },
  4: { len: [3.5, 2.0, 1.8], rad: [0.8, 0.7, 0.64] },
}

/**
 * Left hand. violin: buildViolin() result. Returns { group, update(pose, dt), setStyle, setScale, setLabels }.
 * pose: motion.js poseAt(t).
 */
export function buildLeftHand(violin, { scale = 1 } = {}) {
  const group = new THREE.Group()
  group.name = 'leftHand'
  const mats = skinMats()
  const { meshes, cyl, ball, place } = kit(group, mats)
  let size = scale, showLabels = true
  const fingers = {}
  for (const f of [1, 2, 3, 4]) {
    const d = LEFT[f]
    const segs = d.len.map((_, i) => cyl(d.rad[i], d.rad[i + 1] ?? d.rad[i] * 0.88))
    const joints = d.rad.map(r => ball(r))
    const tip = ball(d.rad[2] * 0.9)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(d.rad[2] * 0.5, 10, 8), new THREE.MeshBasicMaterial({ color: FINGER_COLORS[f], transparent: true, opacity: 0, depthTest: false }))
    dot.renderOrder = 5
    group.add(dot)
    const label = makeLabel(String(f), FINGER_COLORS[f])
    label.material.opacity = 0
    group.add(label)
    fingers[f] = { d, segs, joints, tip, dot, label, pts: [0, 1, 2, 3].map(() => new THREE.Vector3()), base: new THREE.Vector3(), target: new THREE.Vector3(), cur: new THREE.Vector3(), init: false }
  }
  const thumb = { segs: [cyl(1.15, 0.95), cyl(0.95, 0.85)], joints: [ball(1.15), ball(0.95)], tip: ball(0.82), mid: new THREE.Vector3() }
  const palm = ball(1)
  const wristBall = ball(1)
  const forearm = cyl(3.2, 2.6, mats.sleeve)
  const upper = cyl(3.6, 3.3, mats.sleeve)
  const elbowBall = ball(3.3, mats.sleeve)
  const knuckle = new THREE.Vector3(), wrist = new THREE.Vector3(), elbow = new THREE.Vector3(), shoulder = new THREE.Vector3()
  const anchorSmooth = { u: null }

  function update(pose, dt = 1 / 60) {
    if (!pose) { group.visible = false; return }
    group.visible = true
    const V = violin, k = V.k
    // the frame: finger 1 at u1, finger 4's natural place 5 semitones above
    const u1 = pose.anchorU
    if (anchorSmooth.u == null) anchorSmooth.u = u1
    anchorSmooth.u += (u1 - anchorSmooth.u) * Math.min(1, dt * 30)
    const uA = anchorSmooth.u
    const high = Math.max(0, Math.min(1, (uA - V.x0 * 0.62) / (V.x0 * 0.5)))     // 0 low positions … 1 at the body
    const half = V.fbHalf(uA)
    const yFB = V.fbY(uA, 0)
    // knuckle line: beside the top-string edge, a little toward the nut from the stops
    for (const f of [1, 2, 3, 4]) {
      const F = fingers[f]
      const spread = 1.85 * size * (1 - 0.25 * high)
      F.base.set(uA - 0.8 * size + (f - 1) * spread, yFB - (1.9 - 0.8 * high) * size, -half - (2.3 + 0.4 * high) * size)
      const P = pose.fingers[f]
      const s = P.s
      const s0 = Math.max(0, Math.min(V.S - 1, Math.floor(s))), s1 = Math.min(V.S - 1, s0 + 1), t = s - s0
      const x = P.u - 0.25 * k
      const zS = V.stringZ(s0, x) * (1 - t) + V.stringZ(s1, x) * t
      const surf = V.fbY(x, zS)
      const r = F.d.rad[2] * size
      if (P.press > 0) F.target.set(x, surf + r * 0.8, zS)
      else F.target.set(x, V.stringY(s0, x) + r + (0.25 + 0.9 * P.lift) * size, zS - 0.15 * size)
      // fingers move quickly but not instantly when free
      if (!F.init) { F.cur.copy(F.target); F.init = true }
      if (P.press > 0) F.cur.copy(F.target)
      else F.cur.lerp(F.target, Math.min(1, dt * 28))
      const L = F.d.len.map(l => l * size)
      solveFinger(F.base, F.cur, L, 0.72, F.pts, null)
      for (let i = 0; i < 3; i++) { place(F.segs[i], F.pts[i], F.pts[i + 1]); F.joints[i].position.copy(F.pts[i]); F.joints[i].scale.setScalar(size) }
      for (const sg of F.segs) { sg.scale.x = sg.scale.z = size }
      F.tip.position.copy(F.pts[3]); F.tip.scale.setScalar(size)
      F.dot.position.copy(F.pts[3]).y += r * 0.6
      F.dot.material.opacity = P.press > 0 ? (P.held ? 0.45 : 1) : 0
      F.label.position.copy(F.pts[3]).y += 2.2 * size
      F.label.scale.setScalar(1.6 * size)
      F.label.material.opacity = showLabels && P.press > 0 && !P.held ? 1 : 0
    }
    // palm: from the knuckles down to the wrist, under the neck
    const k1 = fingers[1].base, k4 = fingers[4].base
    knuckle.addVectors(k1, k4).multiplyScalar(0.5)
    wrist.set(uA + (1.8 + 2.5 * high) * size, yFB - (7.4 - 1.2 * high) * size, -half - (0.9 + 1.6 * high) * size)
    _c.subVectors(knuckle, wrist)
    palm.position.addVectors(knuckle, wrist).multiplyScalar(0.5).addScaledVector(_d.set(0, 0, -1), 0.6 * size)
    palm.quaternion.setFromUnitVectors(Y, _c.clone().normalize())
    palm.scale.set(1.3 * size, _c.length() * 0.5 + 0.3 * size, k1.distanceTo(k4) * 0.5 + 0.7 * size)
    wristBall.position.copy(wrist)
    wristBall.scale.set(1.9 * size, 1.4 * size, 1.9 * size)
    // thumb: under the neck on the bass side opposite finger 1–2, parked at the heel when high
    const thumbU = Math.min(uA + 0.8 * size, V.x0 - 1.2 * k)
    const tipT = new THREE.Vector3(thumbU, V.fbY(thumbU, 0) - (1.3 + 0.5 * high) * k, half * (0.75 - 0.6 * high) + 0.4)
    const tB = wrist.clone().add(new THREE.Vector3(-0.6 * size, 1.4 * size, 1.4 * size))
    twoBone(tB, tipT, 3.6 * size, 3.1 * size, new THREE.Vector3(tB.x - 6, tB.y, tB.z + 6), thumb.mid)
    place(thumb.segs[0], tB, thumb.mid); place(thumb.segs[1], thumb.mid, tipT)
    thumb.joints[0].position.copy(tB); thumb.joints[1].position.copy(thumb.mid); thumb.tip.position.copy(tipT)
    for (const m of [...thumb.segs]) { m.scale.x = m.scale.z = size }
    for (const m of [...thumb.joints, thumb.tip]) m.scale.setScalar(size)
    // arm: the elbow under the instrument, swinging toward the bass strings
    const sMean = pose.fingers.slice(1).reduce((a, F) => a + F.s, 0) / 4
    const swing = 1 - sMean / Math.max(1, V.S - 1)
    elbow.set(V.x0 + V.bodyLen * 0.25 - 4 * high, -24 * size, -9 - 6 * swing)
    shoulder.set(V.x0 + V.bodyLen + 6, -26, 16)
    const fa = wrist.clone().addScaledVector(elbow.clone().sub(wrist).normalize(), 1.6 * size)
    place(forearm, fa, elbow)
    place(upper, elbow, shoulder)
    elbowBall.position.copy(elbow)
  }

  return {
    group, update,
    setStyle(style) { for (const m of meshes) m.material = style === 'ghost' ? mats.ghost : mats.skin },
    setScale(v) { size = v },
    setLabels(on) { showLabels = on },
  }
}

/**
 * Right hand holding the bow, plus the arm. bow: buildBow() result; the hand
 * is a child of the bow group, the arm is placed every frame in the parent
 * (instrument) frame. Returns { hand, arm, update(shoulderInParent) }.
 */
export function buildBowHand(bow, parent, { scale = 1 } = {}) {
  const mats = skinMats()
  const hand = new THREE.Group()
  hand.name = 'bowHand'
  bow.group.add(hand)
  const { meshes, cyl, ball, place } = kit(hand, mats)
  const s = scale
  // in the bow frame: x along the hair (frog at 0), y up toward the stick, z: +z = toward the player
  const stickY = 1.7
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const palmC = V(-1.0 * s, stickY + 3.6 * s, 2.6 * s)
  const palm = ball(1)
  palm.position.copy(palmC)
  palm.scale.set(3.4 * s, 1.5 * s, 2.6 * s)
  palm.rotation.set(0.5, 0, -0.25)
  // fingers draped over the stick: knuckle → over the stick → down the far side
  const fingerPath = [
    [V(1.6, 3.4, 1.6), V(2.6, 2.9, 0.4), V(2.9, 1.9, -0.7), V(2.9, 0.9, -0.9)],     // index, pressing the stick
    [V(0.0, 3.6, 2.3), V(0.3, 3.0, 0.6), V(0.4, 1.7, -0.6), V(0.3, 0.5, -0.7)],     // middle, opposite the thumb
    [V(-1.6, 3.6, 2.4), V(-1.8, 3.0, 0.9), V(-2.0, 1.8, -0.4), V(-2.0, 0.8, -0.5)], // ring, over the frog
    [V(-3.0, 3.8, 2.1), V(-3.4, 3.4, 1.2), V(-3.6, 2.7, 0.4), V(-3.6, 2.15, 0.15)], // little finger, curved on top
  ]
  const rad = [0.8, 0.85, 0.78, 0.66]
  fingerPath.forEach((pts, i) => {
    const P = pts.map(p => p.clone().multiplyScalar(s).add(V(0, stickY * (1 - s), 0)))
    for (let j = 0; j < 3; j++) place(cyl(rad[i] * (1 - 0.08 * j), rad[i] * (0.92 - 0.08 * j)), P[j], P[j + 1])
    for (let j = 0; j < 4; j++) ball(rad[i] * (1 - 0.08 * j)).position.copy(P[j])
  })
  // thumb: bent, its tip under the stick between frog and grip
  {
    const P = [V(-1.4, 2.6, 2.8), V(-0.2, 1.4, 2.2), V(0.6, 0.9, 0.9), V(0.8, 1.0, 0.25)].map(p => p.multiplyScalar(s))
    for (let j = 0; j < 3; j++) place(cyl(1.0 - 0.1 * j, 0.9 - 0.1 * j), P[j], P[j + 1])
    for (let j = 0; j < 4; j++) ball(1.0 - 0.1 * j).position.copy(P[j])
  }
  const wristLocal = V(-2.4 * s, stickY + 5.6 * s, 4.2 * s)
  const wristBall = ball(2.1)
  wristBall.position.copy(wristLocal)
  // arm in the parent frame
  const arm = new THREE.Group()
  arm.name = 'bowArm'
  parent.add(arm)
  const armKit = kit(arm, mats)
  const fore = armKit.cyl(2.6, 3.2, mats.sleeve), up = armKit.cyl(3.3, 3.8, mats.sleeve), elbowBall = armKit.ball(3.3, mats.sleeve)
  const wrist = new THREE.Vector3(), elbow = new THREE.Vector3()
  return {
    hand, arm,
    update(shoulder, pole) {
      bow.group.updateMatrix()
      wrist.copy(wristLocal).applyMatrix4(bow.group.matrix)
      twoBone(shoulder.clone(), wrist.clone(), 30, 27, pole.clone(), elbow)
      armKit.place(fore, wrist, elbow)
      armKit.place(up, elbow, shoulder)
      elbowBall.position.copy(elbow)
    },
    setStyle(style) { for (const m of [...meshes, ...armKit.meshes]) m.material = style === 'ghost' ? mats.ghost : mats.skin },
  }
}
