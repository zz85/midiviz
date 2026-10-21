// Standing-violinist rig for Experiment #037.
//
// Poses a VRM humanoid (three-vrm's normalised bones) every frame around the
// #033 violin, bow and hand models:
//  • legs: feet planted (left a little forward), two-bone IK, soft knees;
//    the hips sway and shift weight;
//  • spine: a lean that follows the phrase and loudness, a turn that follows
//    the bow (toward the tip on a down-bow), breathing;
//  • the violin rides on the chest: tail on the left collarbone, the long axis
//    ~40° left of the facing direction, scroll a little up, rolled ~30° so the
//    E side is lower (Margulies 2023, research/01 §2); the head turns and
//    tilts onto the chin rest;
//  • the left hand: the #033 left-hand model (strings/hand3d.js) is solved
//    first in the instrument frame (knuckle line, wrist, fingertip targets);
//    the character's hand is placed on its knuckle line, the arm is two-bone
//    IK with the elbow under the instrument (swinging toward the G string)
//    and a straight wrist (forearm and hand on one line to the knuckles),
//    and each finger is solved from the character's own knuckle to the #033
//    fingertip target with the character's own segment lengths;
//  • the bow: placed as in #033 from motion.js (contact point near the bridge,
//    tilted to the bowed string, bow position along the hair); the right hand
//    takes a Franco-Belgian hold (grip(): palm over the stick, fingers draped over
//    it), the arm is two-bone IK with the elbow in the bow plane, the
//    clavicle comes forward when the tip is out of reach.
//
// Every driven bone gets a world rotation built from an aim direction and a
// reference direction (basis()), relative to the same basis measured in the
// rest pose, so any VRM / glTF humanoid with a T-pose rest works.
//
// Units: centimetres, y up, the player facing +z (the audience), his left at +x.

import * as THREE from 'three'
import { solveFinger } from '../fingering/hands3d.js'
import { twoBone } from '../strings/hand3d.js'

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const X = v3(1, 0, 0), Y = v3(0, 1, 0), Z = v3(0, 0, 1)
const clamp = THREE.MathUtils.clamp
const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4()
const _a = v3(), _b = v3(), _c = v3()

/** Rotation basis: x along dir, z = ref made perpendicular, y = z × x. */
function basis(dir, ref, out = new THREE.Matrix4()) {
  const x = _a.copy(dir).normalize()
  const z = _b.copy(ref).addScaledVector(x, -ref.dot(x))
  if (z.lengthSq() < 1e-8) z.copy(Math.abs(x.y) < 0.9 ? Y : Z).addScaledVector(x, -(Math.abs(x.y) < 0.9 ? x.y : x.z))
  z.normalize()
  const y = _c.crossVectors(z, x)
  return out.makeBasis(x, y, z)
}

const FINGERS = ['Index', 'Middle', 'Ring', 'Little']

/**
 * One finger in the hand's frame (research/04_left_hand.md §1): it splays at
 * the base joint (about the back-of-hand axis N, at most ±35°) and then bends
 * as a hinge in its own plane; the end joint follows the middle joint (DIP =
 * k·PIP). The splay is chosen to put the target in that plane, so a stop
 * behind the knuckle is reached by curling under, not by turning the finger
 * round. B, T: knuckle and target; d: the hand's long axis (wrist → knuckles),
 * N: the back of the hand; L: [proximal, middle, distal] lengths. Writes the
 * four joint points to out; returns { flex, splay, pip, lean } in degrees and
 * miss (cm short of the target). lean is what the eye reads as a finger bent
 * sideways: the angle of the knuckle-to-tip chord out of the plane square to
 * the knuckle line (the hinge of an unsplayed finger).
 */
const _fa = new THREE.Vector3(), _fd = new THREE.Vector3(), _fl = new THREE.Vector3(), _fu = new THREE.Vector3(), _fv = new THREE.Vector3()
export function handFinger(B, T, L, k, d, N, out, spMax = 0.61) {
  _fa.subVectors(T, B)
  _fd.copy(d).addScaledVector(N, -d.dot(N)).normalize()
  _fl.crossVectors(_fd, N)
  const f = _fa.dot(_fd), l = _fa.dot(_fl)
  const sp = Math.abs(f) < 1e-6 ? Math.sign(l) * spMax : Math.max(-spMax, Math.min(spMax, Math.atan(l / f)))
  _fu.copy(_fd).multiplyScalar(Math.cos(sp)).addScaledVector(_fl, Math.sin(sp))      // in-plane forward
  _fv.copy(N).negate()                                                                // in-plane toward the palm
  const tu = _fa.dot(_fu), tv = _fa.dot(_fv), r = Math.hypot(tu, tv)
  const shape = p => {
    const x = L[0] + L[1] * Math.cos(p) + L[2] * Math.cos((1 + k) * p), y = L[1] * Math.sin(p) + L[2] * Math.sin((1 + k) * p)
    return [Math.hypot(x, y), Math.atan2(y, x)]
  }
  const PMAX = 1.95                    // 112°
  const rMax = shape(0)[0], rMin = shape(PMAX)[0]
  const rr = Math.max(rMin, Math.min(rMax, r))
  let lo = 0, hi = PMAX
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (shape(m)[0] > rr) lo = m; else hi = m }
  const p = (lo + hi) / 2
  // (the base joint stays within its range, −15…90°; a stop it cannot reach
  // from there is missed rather than reached by turning the finger round)
  const a = Math.max(-0.26, Math.min(1.57, Math.atan2(tv, tu) - shape(p)[1]))
  const ang = [a, a + p, a + (1 + k) * p]
  out[0].copy(B)
  for (let i = 0; i < 3; i++) out[i + 1].copy(out[i]).addScaledVector(_fu, L[i] * Math.cos(ang[i])).addScaledVector(_fv, L[i] * Math.sin(ang[i]))
  const R2D = 180 / Math.PI
  _fa.subVectors(out[3], out[0])
  const lean = Math.asin(Math.max(-1, Math.min(1, _fa.dot(_fl) / (_fa.length() || 1)))) * R2D
  return { flex: a * R2D, splay: sp * R2D, pip: p * R2D, lean, miss: out[3].distanceTo(T) }
}

export const HOLD = {
  yaw: 40,        // violin long axis, degrees left of facing
  pitch: 4,       // scroll up
  roll: 30,       // E side down
  // where the instrument's tail (the end button, chin-rest side) sits, relative
  // to the neck base, in the chest's frame (cm): left, up, forward
  anchor: [7.5, -2.5, 6.5],
  headTurn: 26, headTilt: 14, headNod: 14,
}

/**
 * vrm: a loaded VRM (three-vrm), already in the scene, scaled to cm.
 * V: buildViolin(), bow: buildBow() (its group a child of V.group),
 * leftHand: buildLeftHand(V) (hidden; used for its solution),
 * bowHand: buildBowHand(bow, V.group) (hidden; no longer used: the grip is grip() below).
 */

export function createViolinistRig({ vrm, V, bow, leftHand, bowHand }) {
  const H = name => vrm.humanoid.getNormalizedBoneNode(name)
  const root = vrm.scene
  root.updateMatrixWorld(true)
  const wp = b => b.getWorldPosition(v3())
  const wq = b => b.getWorldQuaternion(new THREE.Quaternion())

  // ── rest measurements ──
  const rest = new Map()      // bone → { q (world), B (basis matrix) , local }
  const restLocal = new Map()
  vrm.humanoid.normalizedHumanBonesRoot?.traverse?.(o => restLocal.set(o, o.quaternion.clone()))
  for (const name of Object.keys(vrm.humanoid.humanBones)) { const b = H(name); if (b && !restLocal.has(b)) restLocal.set(b, b.quaternion.clone()) }
  const restPos = new Map()
  for (const b of restLocal.keys()) restPos.set(b, b.position.clone())
  function measure(b, dir, ref) { rest.set(b, { q: wq(b), B: basis(dir, ref) }) }
  const sides = { L: 'left', R: 'right' }
  const M = { L: {}, R: {} }
  for (const S of ['L', 'R']) {
    const s = sides[S], m = M[S]
    m.upper = H(s + 'UpperArm'); m.lower = H(s + 'LowerArm'); m.hand = H(s + 'Hand'); m.shoulder = H(s + 'Shoulder')
    const pU = wp(m.upper), pL = wp(m.lower), pH = wp(m.hand)
    m.l1 = pU.distanceTo(pL); m.l2 = pL.distanceTo(pH)
    measure(m.upper, pL.clone().sub(pU), Z)
    measure(m.lower, pH.clone().sub(pL), Z)
    const kI = wp(H(s + 'IndexProximal')), kL = wp(H(s + 'LittleProximal'))
    const kMid = kI.clone().add(kL).multiplyScalar(0.5)
    m.side = kI.clone().sub(kL)                     // rest index side
    measure(m.hand, kMid.clone().sub(pH), m.side)
    m.knuckleOff = kMid.clone().sub(pH)            // rest wrist → knuckle midpoint (world)
    m.handB = rest.get(m.hand).B.clone()
    // rest offsets from the wrist (world): each knuckle, the thumb's root; the
    // back of the hand (the basis' y: side × long axis)
    m.kRest = FINGERS.map(F => wp(H(s + F + 'Proximal')).sub(pH))
    m.thumbRest = wp(H(s + 'ThumbMetacarpal')).sub(pH)
    // (index − little × wrist → knuckles is the back of the left hand, the palm of the right)
    m.dorsalRest = m.side.clone().cross(m.knuckleOff).normalize().multiplyScalar(S === 'L' ? 1 : -1)
    m.klineRest = m.kRest[3].clone().sub(m.kRest[0]).normalize()
    m.fingers = FINGERS.map(F => {
      const bs = ['Proximal', 'Intermediate', 'Distal'].map(k => H(s + F + k))
      const P = bs.map(wp)
      const len = [P[0].distanceTo(P[1]), P[1].distanceTo(P[2])]
      len.push(len[1] * 0.85)
      measure(bs[0], P[1].clone().sub(P[0]), m.side)
      measure(bs[1], P[2].clone().sub(P[1]), m.side)
      measure(bs[2], P[2].clone().sub(P[1]), m.side)
      return { bones: bs, len, pts: [v3(), v3(), v3(), v3()] }
    })
    {
      const bs = ['Metacarpal', 'Proximal', 'Distal'].map(k => H(s + 'Thumb' + k))
      const P = bs.map(wp)
      const l1 = P[1].distanceTo(P[2])
      m.thumb = { bones: bs, len: [l1, l1 * 0.85] }
      measure(bs[0], P[1].clone().sub(P[0]), Y)
      measure(bs[1], P[2].clone().sub(P[1]), Y)
      measure(bs[2], P[2].clone().sub(P[1]), Y)
    }
    // legs
    m.thigh = H(s + 'UpperLeg'); m.shin = H(s + 'LowerLeg'); m.foot = H(s + 'Foot')
    const pT = wp(m.thigh), pK = wp(m.shin), pF = wp(m.foot)
    m.lt1 = pT.distanceTo(pK); m.lt2 = pK.distanceTo(pF)
    measure(m.thigh, pK.clone().sub(pT), Z)
    measure(m.shin, pF.clone().sub(pK), Z)
    rest.set(m.foot, { q: wq(m.foot) })
    m.footRest = pF
  }
  const bowReach = clamp((M.R.l1 + M.R.l2) / 58, 0.72, 1)
  const middleLen = M.L.fingers[1].len.reduce((a, b) => a + b, 0)
  const handScale = middleLen / 9.7          // vs the #033 left hand's middle finger
  const B = {
    hips: H('hips'), spine: H('spine'), chest: H('chest'), upperChest: H('upperChest'), neck: H('neck'), head: H('head'),
  }
  const chestBone = B.upperChest || B.chest
  rest.set(chestBone, { q: wq(chestBone) })
  const height = new THREE.Box3().setFromObject(root).max.y
  const hipsRestY = wp(B.hips).y

  // ── posing helpers ──
  const parentQ = b => (b.parent ? b.parent.getWorldQuaternion(_q2) : _q2.identity())
  function setWorldQ(b, q) {
    const p = parentQ(b)
    b.quaternion.copy(p.invert().multiply(q))
    b.updateMatrixWorld(true)
  }
  const _Bd = new THREE.Matrix4(), _R = new THREE.Quaternion(), _qq = new THREE.Quaternion()
  /** World rotation that takes the rest basis of b to basis(dir, ref). */
  function rotFor(b, dir, ref, out = new THREE.Quaternion()) {
    basis(dir, ref, _Bd)
    _m.copy(rest.get(b).B).transpose()
    _m2.multiplyMatrices(_Bd, _m)
    return out.setFromRotationMatrix(_m2)
  }
  function orient(b, dir, ref) {
    rotFor(b, dir, ref, _R)
    setWorldQ(b, _qq.copy(_R).multiply(rest.get(b).q))
    return _R
  }
  /** Turn bone b (from its rest pose relative to its parent) by world-axis angles. */
  function turn(b, eulerWorld) {
    b.quaternion.copy(restLocal.get(b))
    if (eulerWorld) {
      b.updateMatrixWorld(true)
      const base = wq(b)
      const R = new THREE.Quaternion().setFromEuler(eulerWorld)
      setWorldQ(b, R.multiply(base))
    } else b.updateMatrixWorld(true)
  }
  const toWorld = (p, mat) => p.clone().applyMatrix4(mat)
  const toLocalM = new THREE.Matrix4()

  // his left and his facing at rest (for a bow, whichever way he stands)
  const side0 = wp(M.L.upper).sub(wp(M.R.upper)).setY(0).normalize()
  const fwd0 = v3().crossVectors(side0, Y).normalize()

  // ── state that smooths over frames ──
  const st = { sway: 0, lean: 0, turn: 0, rClav: 0, lookT: v3() }
  const opts = { sway: 1, lean: 1, expression: 1 }

  /**
   * pose: motion.js poseAt(t). drive: { t, energy (0..1), phrase (0..1 through
   * the phrase), breath (0..1, a cue before a phrase), playing,
   * rest (violin and bow lowered in his hands), bend (a bow from the hips,
   * radians), nod (radians, a cue with the violin up), look (world point for
   * the eyes) }.
   */
  function update(pose, drive, dt = 1 / 60) {
    const t = drive.t
    const k = Math.min(1, dt * 4)
    blinks(dt, !drive.rest && !!pose?.bow?.playing)
    // ── hips: weight on the left, sway, a dip with the energy ──
    const sway = opts.sway * (2.2 * Math.sin(2 * Math.PI * t / 4.3) + 0.8 * Math.sin(2 * Math.PI * t / 2.1 + 1))
    st.sway += (sway - st.sway) * k
    const energy = drive.energy ?? 0.5
    const leanT = opts.lean * (0.05 + 0.07 * energy - 0.08 * (drive.breath || 0))
    st.lean += (leanT - st.lean) * Math.min(1, dt * 3)
    // the VRoid arms are short (shoulder to wrist ~47 cm against ~60 for a
    // 180 cm man, research/05_bow_hand.md §2): he uses the lower part of the
    // bow in proportion, so the arm can still bend at the elbow
    const bw = pose?.bow && { ...pose.bow, pos: (pose.bow.pos ?? 30) * bowReach }
    const turnT = bw ? 0.06 * ((bw.pos ?? 32) / 65 - 0.5) : 0
    st.turn += (turnT - st.turn) * Math.min(1, dt * 3)
    B.hips.position.copy(restPos.get(B.hips))
    B.hips.updateMatrixWorld(true)
    {
      // offset in world, converted to the hips' parent space
      const want = wp(B.hips).add(v3(1.5 + st.sway, -2.2 - 0.6 * energy, -1))
      B.hips.parent.worldToLocal(want)
      B.hips.position.copy(want)
    }
    turn(B.hips, new THREE.Euler(0, 0.1, -st.sway * 0.006, 'YXZ'))
    // ── spine ──
    const breath = Math.sin(2 * Math.PI * t / 4.2) * 0.012
    turn(B.spine, new THREE.Euler(st.lean * 0.35 + breath, -0.05 + st.turn * 0.3, st.sway * 0.004, 'YXZ'))
    if (B.chest && B.chest !== chestBone) turn(B.chest, new THREE.Euler(st.lean * 0.35, st.turn * 0.35, 0, 'YXZ'))
    turn(chestBone, new THREE.Euler(st.lean * 0.3 - breath, st.turn * 0.35, 0.03, 'YXZ'))
    if (drive.rest) { restPose(drive); return }

    // ── the violin on the chest ──
    const chestQ = wq(chestBone).multiply(_q.copy(rest.get(chestBone).q).invert())
    const neckP = wp(B.neck)
    const yaw = THREE.MathUtils.degToRad(HOLD.yaw), pitch = THREE.MathUtils.degToRad(HOLD.pitch + 8 * (drive.breath || 0)) - (drive.nod || 0), roll = THREE.MathUtils.degToRad(HOLD.roll)
    const d = v3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(chestQ)
    const xI = d.clone().negate()
    // z (G side): horizontal, perpendicular to the axis, then rolled up about the axis
    let zI = v3().crossVectors(xI, Y).normalize()
    zI.applyAxisAngle(xI, -roll)
    if (zI.y < 0) zI.applyAxisAngle(xI, 2 * roll)
    const yI = v3().crossVectors(zI, xI).normalize()
    _m.makeBasis(xI, yI, zI)
    V.group.quaternion.setFromRotationMatrix(_m)
    const anchor = neckP.clone().add(v3(...HOLD.anchor).applyQuaternion(chestQ))
    const tailLocal = v3(V.x0 + V.bodyLen - 2.5 * V.k, -0.3, 3.2 * V.k)
    V.group.position.copy(anchor).sub(tailLocal.applyQuaternion(V.group.quaternion))
    V.group.updateMatrixWorld(true)

    // ── neck and head onto the chin rest ──
    const ht = THREE.MathUtils.degToRad
    turn(B.neck, new THREE.Euler(ht(HOLD.headNod) * 0.4, ht(HOLD.headTurn) * 0.4, -ht(HOLD.headTilt) * 0.4, 'YXZ'))
    const nod = ht(HOLD.headNod) * 0.6 + (drive.nod || 0) * 0.5 + 0.05 * Math.sin(2 * Math.PI * t / 3.1) * opts.expression
    turn(B.head, new THREE.Euler(nod, ht(HOLD.headTurn) * 0.6, -ht(HOLD.headTilt) * 0.6, 'YXZ'))

    if (!pose) { relaxArms(); legs(); return }

    // ── strings and the bow (instrument frame, as #033) ──
    const stops = new Array(V.S).fill(null), vib = new Array(V.S).fill(0)
    for (const f of [1, 2, 3, 4]) {
      const F = pose.fingers[f]
      if (F.press > 0) { const s = Math.round(F.s); if (stops[s] == null || F.u > stops[s]) stops[s] = F.u }
    }
    for (const so of pose.sounding) vib[so.s] = bw.playing ? Math.min(1, 0.35 + Math.abs(bw.speed) / 80) : 0.25
    V.layoutStrings(stops, vib, performance.now() / 1000)
    leftHand.update(pose, dt)
    placeBow(bw)

    // ── left arm and hand (research/04_left_hand.md) ──
    {
      const m = M.L, J = leftHand.joints, mat = V.group.matrixWorld
      const high = clamp((pose.anchorU - V.x0 * 0.62) / (V.x0 * 0.5), 0, 1)
      const { W, E, R } = leftHandPose(m, J, pose, high, dt)
      setArm(m, wp(m.upper), E, W, R)
      fingersTo(m, mat, J, R)
    }
    // ── right arm and the bow hand (research/05_bow_hand.md) ──
    {
      const m = M.R
      bow.group.updateMatrixWorld(true)
      const mat = bow.group.matrixWorld
      // which side of the stick the player is on (bow frame z)
      const bz = v3(0, 0, 1).applyQuaternion(wq(bow.group))
      const n = bz.dot(wp(chestBone).sub(wp(bow.group))) < 0 ? -1 : 1
      const tip = clamp((bw.pos ?? 30) / (65 * bowReach), 0, 1)
      bowHandPose(m, mat, n, tip, bw, dt)
    }
    legs()

    // eyes on the left hand (or on the bow when it travels)
    if (vrm.lookAt) {
      const goal = toWorld(V.bowContact(bw.s ?? 1.5), V.group.matrixWorld).lerp(toWorld(leftHand.joints.knuckle, V.group.matrixWorld), 0.55)
      gazeShift(drive.look || goal)
      st.lookT.lerp(drive.look || goal, Math.min(1, dt * (drive.look ? 6 : 3)))
      lookObj.position.copy(st.lookT)
    }
  }

  // ── at rest: the violin by its neck in the left hand, the bow in the right,
  // and a bow from the hips ──
  function restPose(drive) {
    const bend = drive.bend || 0
    if (bend) {
      setWorldQ(B.hips, _qq.setFromAxisAngle(side0, bend * 0.8).multiply(wq(B.hips)))
      B.hips.updateMatrixWorld(true)
      turn(B.spine, null); setWorldQ(B.spine, _qq.setFromAxisAngle(side0, bend * 0.12).multiply(wq(B.spine)))
    }
    turn(B.neck, null); setWorldQ(B.neck, _qq.setFromAxisAngle(side0, 0.05 + bend * 0.15).multiply(wq(B.neck)))
    turn(B.head, null); setWorldQ(B.head, _qq.setFromAxisAngle(side0, 0.04 + bend * 0.2).multiply(wq(B.head)))
    turn(M.L.shoulder, null)                 // (the clavicle back from its playing protraction)
    st.lClav = 0
    relaxArms()
    legs()
    const down = v3(0, -1, 0)
    // the violin hangs from his left hand, body down, a little forward and out
    const gL = wp(M.L.hand).addScaledVector(down, 7 * V.k).addScaledVector(fwd0, 2)
    const xI = down.clone().addScaledVector(fwd0, 0.3).addScaledVector(side0, 0.15).normalize()
    const yI = side0.clone().addScaledVector(xI, -side0.dot(xI)).normalize()
    const zI = v3().crossVectors(xI, yI)
    _m.makeBasis(xI, yI, zI)
    V.group.quaternion.setFromRotationMatrix(_m)
    V.group.position.copy(gL).sub(v3(V.x0 * 0.55, 0.8 * V.k, 0).applyQuaternion(V.group.quaternion))
    V.group.updateMatrixWorld(true)
    V.layoutStrings(new Array(V.S).fill(null), new Array(V.S).fill(0), 0)
    leftHand.update(null)
    // the bow from the right hand, the tip down and forward
    const gR = wp(M.R.hand).addScaledVector(down, 6 * V.k)
    const bx = down.clone().multiplyScalar(0.8).addScaledVector(fwd0, 0.6).normalize()
    const bz = side0.clone(), by = v3().crossVectors(bz, bx)
    _m.makeBasis(bx, by, bz)
    bow.group.quaternion.setFromRotationMatrix(_m).premultiply(_q.copy(V.group.quaternion).invert())
    bow.group.position.copy(V.group.worldToLocal(gR))
    bow.group.updateMatrixWorld(true)
    if (vrm.lookAt) {
      const goal = drive.look || wp(B.head).addScaledVector(fwd0, 400).add(v3(0, -60 - 200 * bend, 0))
      gazeShift(goal)
      st.lookT.lerp(goal, 0.1)
      lookObj.position.copy(st.lookT)
    }
  }

  // ── the left hand's posture (research/04_left_hand.md §3) ──
  // The index knuckle is pinned where the crease at the base of the index
  // rests on the E side of the neck. The hand turns about it by three angles,
  // searched every frame (violin frame):
  //   th   the knuckle line's slant: the little knuckle higher and further
  //        along the neck (the hand slants back, the wrist toward the bridge),
  //   ya   the little knuckle out from the side of the neck (−z),
  //   ro   the roll of the palm about the knuckle line (0: palm square to the
  //        side of the neck; +: turned up toward the strings).
  // The hand's own shape (its knuckle line against its long axis) comes from
  // the model. For each, the wrist follows from the pinned knuckle and the
  // elbow is the point on the two-bone circle (shoulder → wrist) nearest the
  // straight line through the hand. The best one bends the wrist least, keeps
  // every stop within easy reach of its finger, lets the thumb reach under the
  // neck, keeps the elbow under the violin and the wrist out of its body, and
  // does not jump from the last frame.
  const LH = { th: 0.35, ya: 0.5, ro: 0.15, sh: 1, init: false, n: 0 }
  // how far each finger may fan at its base joint (index … little, radians):
  // the little finger abducts furthest
  const SPLAY = [0.55, 0.55, 0.66, 0.75]
  const _qf = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _o = v3(), _fp = [v3(), v3(), v3(), v3()]
  const _l = v3(), _n = v3(), _bt = new THREE.Matrix4(), _br = new THREE.Matrix4(), _pp = v3()
  function handFrame(th, ya, ro, mat) {
    const m = M.L
    // little − index knuckle, and the back of the hand, in the violin frame
    _l.set(Math.cos(th) * Math.cos(ya), Math.sin(th), -Math.cos(th) * Math.sin(ya)).normalize()
    _n.set(0, 0, -1).addScaledVector(_l, _l.z).normalize()             // back of the hand away from the neck
    const up = v3().crossVectors(_l, _n)                                  // toward the strings, or away
    if (up.y > 0) up.negate()
    _n.multiplyScalar(Math.cos(ro)).addScaledVector(up, Math.sin(ro)).normalize()   // + turns the palm up
    const l = _l.clone().transformDirection(mat), n = _n.clone().transformDirection(mat)
    basis(l, n, _bt)
    basis(m.klineRest, m.dorsalRest, _br)
    _br.transpose()
    return new THREE.Quaternion().setFromRotationMatrix(_bt.multiply(_br))
  }
  function leftHandPose(m, J, pose, high, dt) {
    const mat = V.group.matrixWorld
    toLocalM.copy(mat).invert()
    const s = handScale, k = V.k
    // the contact point: #033's index knuckle along the neck (near the nut in
    // first position), beside the E edge; the search may slide it up to 3.5 cm
    // toward the bridge for a hand whose fingers are short for the violin, or
    // 1.5 cm toward the scroll for a stop close to the nut
    const contact = sh => {
      const x1 = J.fingers[1].base.x + sh
      return v3(x1, V.fbY(x1, 0) - (1.0 - 0.4 * high) * s, -(V.fbHalf(x1) + (1.1 + 0.3 * high) * s)).applyMatrix4(mat)
    }
    const K1 = contact(0)
    // the left shoulder comes forward (the clavicle protracts, up to 25°) until
    // the elbow can bend to about 110°, as a violinist's does in first position:
    // the model's arms are shorter than the violin is long
    {
      const W0 = K1.clone().addScaledVector(v3(0, -1, 0).transformDirection(mat), 8 * s)
      const want = Math.sqrt(m.l1 ** 2 + m.l2 ** 2 + 2 * m.l1 * m.l2 * Math.cos(THREE.MathUtils.degToRad(70)))
      let pr = 0
      for (pr = 0; pr < 0.43; pr += 0.04) {
        turn(m.shoulder, new THREE.Euler(0, -pr, 0, 'YXZ'))
        if (wp(m.upper).distanceTo(W0) <= want) break
      }
      st.lClav = st.lClav == null || !LH.init ? pr : st.lClav + (pr - st.lClav) * Math.min(1, dt * 6)
      turn(m.shoulder, new THREE.Euler(0, -st.lClav, 0, 'YXZ'))
    }
    const S = wp(m.upper)
    // (a finger #033 keeps down from an earlier note, 'held', is let go when
    // the hand needs to be elsewhere: it counts for much less than the note
    // being played)
    const targets = [1, 2, 3, 4].map(f => ({ T: J.fingers[f].cur.clone().applyMatrix4(mat), on: pose.fingers[f].press > 0, held: !!pose.fingers[f].held, len: m.fingers[f - 1].len.reduce((a, b) => a + b, 0) }))
    const thumbT = J.thumb.target.clone().applyMatrix4(mat)
    const thumbLen = (m.thumb.len[0] + m.thumb.len[1]) + m.thumbRest.distanceTo(m.kRest[0]) * 0.55
    const elbowRef = J.elbow.clone().applyMatrix4(mat)
    const l1 = m.l1, l2 = m.l2
    const th0 = THREE.MathUtils.degToRad(24 - 14 * high)
    const evaluate = (th, ya, ro, sh, keep, why = null) => {
      const add = (k, v) => { if (why) why[k] = (why[k] || 0) + v; return v }
      const R = handFrame(th, ya, ro, mat)
      const W = contact(sh).sub(_pp.copy(m.kRest[0]).applyQuaternion(R))
      const h = m.knuckleOff.clone().applyQuaternion(R).normalize()       // straight-wrist line
      // the elbow: on the circle of the two-bone chain, nearest the line
      const ax = W.clone().sub(S), dist = ax.length(); ax.normalize()
      const dd = Math.min(dist, l1 + l2 - 1e-3)
      const xC = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), rC = Math.sqrt(Math.max(0, l1 * l1 - xC * xC))
      const C = S.clone().addScaledVector(ax, xC)
      const want = W.clone().addScaledVector(h, -l2)
      const radial = want.clone().sub(C); radial.addScaledVector(ax, -radial.dot(ax))
      if (radial.lengthSq() < 1e-8) radial.set(0, -1, 0).addScaledVector(ax, ax.y).normalize(); else radial.normalize()
      // the line's best elbow, and one turned down under the violin; keep the better
      const down = v3(0, -1, 0).transformDirection(mat).addScaledVector(ax, 0); down.addScaledVector(ax, -down.dot(ax)).normalize()
      let best = null
      const u2 = ax.clone().cross(radial).normalize()
      const ring = [0, 0.5, -0.5, 1.1, -1.1, 1.8, -1.8, 2.6, -2.6].map(t => radial.clone().multiplyScalar(Math.cos(t)).addScaledVector(u2, Math.sin(t)))
      for (const r of [...ring, down]) {
        const Ec = C.clone().addScaledVector(r, rC)
        const fa = W.clone().sub(Ec).normalize()
        const bend = THREE.MathUtils.radToDeg(Math.acos(clamp(fa.dot(h), -1, 1)))
        const El = Ec.clone().applyMatrix4(toLocalM)
        let c = bend * (bend > 12 ? 3 : 1) + 10 * Math.max(0, bend - 25)
        c += 4 * Math.max(0, El.y + 8 * k)                    // the elbow under the violin
        // the forearm and the upper arm (with a sleeve) clear of the violin's body
        const Wl = W.clone().applyMatrix4(toLocalM), Sl = S.clone().applyMatrix4(toLocalM)
        for (let j = 1; j <= 9; j++) {
          if (inBody(_pp.lerpVectors(El, Wl, j / 9), 4.6 * k)) c += 400          // (j = 9: the wrist itself)
          if (inBody(_pp.lerpVectors(Sl, El, j / 9), 5.6 * k)) c += 400
        }
        c += 0.25 * Ec.distanceTo(elbowRef)
        if (!best || c < best.c) best = { c, E: Ec, bend }
      }
      let c = add('arm', best.c) + add('reach', Math.max(0, dist - (l1 + l2)) * 20)
      // each finger, solved as it will be drawn: its base joint within a hand's
      // range (flexion −10…85°, splay ≤ 22°), its stop within reach
      const N = m.dorsalRest.clone().applyQuaternion(R)
      for (let i = 0; i < 4; i++) {
        const Kf = W.clone().add(_pp.copy(m.kRest[i]).applyQuaternion(R))
        // (a finger in the air barely moves the hand: a violinist's hand stays
        // put as fingers lift and fall; it hovers where the hand leaves it)
        const tg = targets[i], w = tg.on ? (tg.held ? 0.2 : 1) : 0.05
        const q = handFinger(Kf, tg.T, m.fingers[i].len, 0.72, h, N, _fp, SPLAY[i])
        // (past a centimetre the stop is an extension the hand cannot make: reach
        // toward it, but not at the cost of the whole hand)
        c += add('f' + (i + 1) + 'reach', w * (150 * Math.min(q.miss, 0.6) + 25 * clamp(q.miss - 0.6, 0, 1.4) + 3 * Math.max(0, q.miss - 2)))
        // base joint flexion −10…85°, splay ≤ 22°, middle joint 30…100°
        c += add('f' + (i + 1) + 'shape', w * (3 * Math.max(0, q.flex - 80) + 6 * Math.max(0, q.flex - 88) + 3 * Math.max(0, -5 - q.flex) + 6 * Math.max(0, -12 - q.flex) + 3 * Math.max(0, Math.abs(q.lean) - 20) + 0.6 * Math.max(0, 30 - q.pip)))
        if (why) why['f' + (i + 1)] = [Math.round(q.flex), Math.round(q.splay), Math.round(q.pip), +q.miss.toFixed(2)]
        if (i === 3) { const kl = Kf.applyMatrix4(toLocalM); c += add('little', 70 * Math.max(0, kl.y - (V.fbY(kl.x, 0) + 1.0 * s))) }
      }
      // the thumb reaches under the neck
      const Tb = W.clone().add(_pp.copy(m.thumbRest).applyQuaternion(R))
      c += add('thumb', 6 * Math.max(0, Tb.distanceTo(thumbT) - thumbLen))
      // the wrist stays out of the violin's body (high positions)
      const Wl = W.clone().applyMatrix4(toLocalM)
      if (Wl.x > V.x0 - 1 && Wl.x < V.x0 + V.bodyLen) c += add('body', 15 * Math.max(0, Wl.y + 2.2 * k))
      // posture preferences, and no jumps
      c += add('pref', 12 * Math.abs(th - th0) + 6 * Math.abs(ya - 0.5) + 6 * Math.abs(ro - 0.15) + 3 * Math.abs(sh) / s)
      if (why) { why.bend = best.bend; why.total = c }
      if (keep) c += 30 * (Math.abs(th - LH.th) + Math.abs(ya - LH.ya) + Math.abs(ro - LH.ro)) + 4 * Math.abs(sh - LH.sh)
      return { c, th, ya, ro, sh, R, W, E: best.E, bend: best.bend }
    }
    // a coarse grid (the first frame, and every 20th), else a local search
    // around the last pose; then a finer step around the best
    const D = THREE.MathUtils.degToRad
    let best = null
    const tryP = (th, ya, ro, sh) => { const r = evaluate(th, ya, ro, sh, LH.init); if (!best || r.c < best.c) best = r }
    const grid = () => { for (const th of [0, 12, 24, 36, 48]) for (const ya of [15, 35, 55]) for (const ro of [-10, 10, 30]) for (const sh of [-1, 0.8, 2.6]) tryP(D(th), D(ya), D(ro), sh * s) }
    tryP(LH.th, LH.ya, LH.ro, LH.sh)
    // the whole grid on the first frame, every 20th, and whenever the hand's
    // last shape no longer suits the stops (a shift, a chord, a new string)
    // (for a poor fit at most ten times a second: the grid costs ~135 evaluations)
    LH.clock = (LH.clock ?? 0) + dt
    if (!LH.init || LH.clock - (LH.gridAt ?? -9) >= 0.5 || ((best.c > (LH.cost ?? 0) * 1.4 + 12 || best.c > 60) && LH.clock - LH.gridAt >= 0.1)) { grid(); LH.gridAt = LH.clock }
    // coordinate descent, halving the steps
    const STEP = [D(6), D(8), D(8), 0.6 * s]
    for (const step of [1, 0.5, 0.25]) for (let k = 0; k < 4; k++) for (const sg of [-1, 1]) {
      const c0 = best, v = [c0.th, c0.ya, c0.ro, c0.sh]
      v[k] += sg * step * STEP[k]
      tryP(v[0], v[1], v[2], Math.max(-1.5 * s, Math.min(3.5 * s, v[3])))
    }
    // smooth the chosen pose (a hand does not snap to a new shape)
    // (a hand turns at most ~80°/s within a position, faster while it shifts;
    // the fingers then reach for the stops from wherever the hand is)
    const a = LH.init ? Math.min(1, dt * 10) : 1
    const shifting = LH.u != null && Math.abs(pose.anchorU - LH.u) > 0.02
    LH.u = pose.anchorU
    // (faster when the hand left where it is would leave a pressed finger
    // off its stop: last frame's fit, against a good one's ~20–40)
    // How much worse would the hand be, held where it is, than the best pose?
    // Little (a finger lifting, a neighbour landing): it turns slowly, at
    // most ~90°/s. A lot (a pressed finger would miss its stop): it moves as
    // fast as it needs, as a player's hand does to reach a note
    const held = LH.init ? evaluate(LH.th, LH.ya, LH.ro, LH.sh, false).c : Infinity
    const urge = 1 + clamp((held - best.c - 15) / 25, 0, 4)
    const rate = (shifting ? 3.2 : 1.6 * urge) * dt, srate = (shifting ? 30 : 6 * urge) * dt
    for (const k of ['th', 'ya', 'ro', 'sh']) {
      const lim = LH.init ? (k === 'sh' ? srate : rate) : Infinity
      LH[k] += clamp((best[k] - LH[k]) * a, -lim, lim)
    }
    LH.init = true
    const out = evaluate(LH.th, LH.ya, LH.ro, LH.sh, false)
    LH.cost = out.c
    st.lh = { th: LH.th, ya: LH.ya, ro: LH.ro, sh: LH.sh, cost: out.c, bend: out.bend }
    st.lhWhy = (th, ya, ro, sh = LH.sh) => { const w = {}; evaluate(th, ya, ro, sh, false, w); for (const k in w) if (typeof w[k] === 'number') w[k] = +w[k].toFixed(1); return w }
    return out
  }
  // a point (violin frame) inside the violin's body, grown by r
  function inBody(q, r) {
    if (q.x < V.x0 + r || q.x > V.x0 + V.bodyLen - r) return false
    // (the body's outline is about 20 cm across; a sleeve may touch the back
    // and the ribs, as a violinist's wrist does in the high positions)
    return Math.abs(q.z) < 10 * V.k - r + 0.5 && q.y > -1 + r * 0.3 - 0.8 && q.y < V.rib + 1.6 * V.k - r * 0.3 + 0.5
  }
  function setArm(m, S, E, W, R) {
    orient(m.upper, E.clone().sub(S), W.clone().sub(E))
    const side = m.side.clone().applyQuaternion(R)
    orient(m.lower, W.clone().sub(E), side)
    setWorldQ(m.hand, _qq.copy(R).multiply(rest.get(m.hand).q))
  }

  // ── pieces ──
  function arm(m, S, W, pole, R, side) {
    const E = twoBone(S.clone(), W.clone(), m.l1, m.l2, pole, v3())
    orient(m.upper, E.clone().sub(S), W.clone().sub(E))
    orient(m.lower, W.clone().sub(E), side)
    setWorldQ(m.hand, _qq.copy(R).multiply(rest.get(m.hand).q))
  }
  function relaxArms() {
    for (const S of ['L', 'R']) {
      const m = M[S], s = S === 'L' ? 1 : -1
      const Sp = wp(m.upper)
      const W = Sp.clone().add(v3(s * 6, -m.l1 - m.l2 + 4, 4))
      const E = twoBone(Sp.clone(), W.clone(), m.l1, m.l2, Sp.clone().add(v3(s * 10, -20, -20)), v3())
      orient(m.upper, E.clone().sub(Sp), W.clone().sub(E))
      orient(m.lower, W.clone().sub(E), v3(0, 0, 1))
      setWorldQ(m.hand, rotFor(m.hand, W.clone().sub(E), v3(0, 0, 1)).multiply(rest.get(m.hand).q))
    }
  }
  /**
   * Fingers from the character's knuckles to the #033 fingertip targets, each
   * bending in its own plane: through its knuckle, its target and the back of
   * the hand (so it may splay at the base joint but never bends sideways at
   * the middle and end joints), with the end joint coupled to the middle one.
   */
  // A finger that is not pressing hovers over its slot, curled, a little above
  // the strings (#033's target). When that slot is out of comfortable reach of
  // this hand (the finger would have to straighten, or fan past its range, to
  // get there), it keeps a violinist's relaxed curl instead (base 35°, middle
  // 75°, end 54°), fanned toward the slot as far as it goes, rather than
  // reaching out flat across the neck
  const _fq = [v3(), v3(), v3(), v3()]
  const smoothstep = x => x * x * (3 - 2 * x)
  function freeTarget(m, i, JF, base, d, N, on) {
    const T = JF.cur
    if (on) return T
    const F = m.fingers[i]
    const q = handFinger(base, T, F.len, 0.72, d, N, _fq, SPLAY[i])
    const bad = clamp(Math.max((55 - q.pip) / 25, (Math.abs(q.splay) - THREE.MathUtils.radToDeg(SPLAY[i]) + 2) / 6, q.miss / 1.2), 0, 1)
    if (bad <= 0) return T
    const fd = d.clone().addScaledVector(N, -d.dot(N)).normalize(), fl = fd.clone().cross(N)
    const sp = THREE.MathUtils.degToRad(q.splay)
    const u = fd.clone().multiplyScalar(Math.cos(sp)).addScaledVector(fl, Math.sin(sp)), w = N.clone().negate()
    const D = Math.PI / 180, a = [35 * D, 110 * D, 164 * D]
    const tip = base.clone()
    for (let j = 0; j < 3; j++) tip.addScaledVector(u, F.len[j] * Math.cos(a[j])).addScaledVector(w, F.len[j] * Math.sin(a[j]))
    return T.clone().lerp(tip, smoothstep(bad))
  }
  function fingersTo(m, mat, J, R) {
    toLocalM.copy(mat).invert()
    const handR = R || wq(m.hand).multiply(_q.copy(rest.get(m.hand).q).invert())
    const side = m.side.clone().applyQuaternion(handR)
    // the hand's axes, in the violin frame
    const N = m.dorsalRest.clone().applyQuaternion(handR).transformDirection(toLocalM).normalize()
    const d = m.knuckleOff.clone().applyQuaternion(handR).transformDirection(toLocalM).normalize()
    for (let i = 0; i < 4; i++) {
      const F = m.fingers[i], f = i + 1
      const base = wp(F.bones[0]).applyMatrix4(toLocalM)
      // a held finger out of this hand's easy reach is lifted (it curls, as a free one)
      const JF = J.fingers[f], held = JF.dot.material.opacity > 0 && JF.dot.material.opacity < 0.9
      let on = JF.dot.material.opacity > 0
      if (held) { const q = handFinger(base, JF.cur, F.len, 0.72, d, N, _fq, SPLAY[i]); if (q.miss > 0.3 || q.pip < 30) on = false }
      F.held = held && !on
      F.q = handFinger(base, freeTarget(m, i, JF, base, d, N, on), F.len, 0.72, d, N, F.pts, SPLAY[i])
      // roll each phalanx about the finger's own hinge (its side, as the knuckle line's)
      const W = F.pts.map(p => p.clone().applyMatrix4(mat))
      const hinge = W[1].clone().sub(W[0]).cross(W[2].clone().sub(W[1]))
      const ref = hinge.lengthSq() > 1e-6 ? hinge.normalize() : side.clone()
      if (ref.dot(side) < 0) ref.negate()
      chain(F.bones, W, ref)
    }
    // thumb: under the neck. It opposes at its base (CMC) joint, up to 50°,
    // toward the target, then its two joints bend toward the palm
    const T = m.thumb
    setWorldQ(T.bones[0], _qq.copy(handR).multiply(rest.get(T.bones[0]).q))
    const tip = toWorld(J.thumb.target, mat)
    let J1 = wp(T.bones[1])
    const reach = T.len[0] + T.len[1]
    if (J1.distanceTo(tip) > 0.9 * reach) {
      const C = wp(T.bones[0]), a = J1.clone().sub(C).normalize(), b = tip.clone().sub(C).normalize()
      const full = Math.acos(clamp(a.dot(b), -1, 1))
      if (full > 1e-3) {
        // just enough to bring it within reach, no more than 50°
        let lo = 0, hi = Math.min(full, 0.87)
        const axis = a.clone().cross(b).normalize(), L = J1.distanceTo(C)
        for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; const p = C.clone().addScaledVector(a.clone().applyAxisAngle(axis, mid), L); if (p.distanceTo(tip) > 0.9 * reach) lo = mid; else hi = mid }
        const q = new THREE.Quaternion().setFromAxisAngle(axis, hi)
        setWorldQ(T.bones[0], q.multiply(wq(T.bones[0])))
        J1 = wp(T.bones[1])
      }
    }
    // bend toward the palm (away from the back of the hand)
    const Nw = m.dorsalRest.clone().applyQuaternion(handR)
    const pole = J1.clone().lerp(tip, 0.5).addScaledVector(Nw, -6)
    const mid = twoBone(J1.clone(), tip.clone(), T.len[0], T.len[1], pole, v3())
    // (where the thumb's tip ends up, for the posture test)
    T.tip = mid.clone().addScaledVector(tip.clone().sub(mid).normalize(), T.len[1])
    const back = Y.clone().applyQuaternion(handR)
    orient(T.bones[1], mid.clone().sub(wp(T.bones[1])), back)
    orient(T.bones[2], tip.clone().sub(mid), back)
  }
  // ── the bow hand (research/05_bow_hand.md §3) ──
  // Contacts in the bow frame (x along the stick toward the tip from the
  // frog's front, y from the hair up past the stick at y ≈ 1.6, z toward the
  // player when n = 1), for a Franco-Belgian hold: the bent thumb's tip in the
  // corner of the frog and the stick on the player's side, the middle finger
  // opposite it over the far side, the ring finger over the frog's eye, the
  // index on the stick at its middle phalanx, the little finger's tip on top.
  // The hand's pose around them is searched each frame like the left hand's:
  // its position and orientation (6 numbers) are chosen so each fingertip
  // reaches its contact with a natural finger shape, the thumb stays bent, the
  // wrist bends as the research says for that part of the bow (flexed ~22° at
  // the frog, straight in the middle, extended a little at the tip), the hand
  // pronates toward the tip, and the elbow sits at the string's level.
  const BH = { x: null, init: false }
  const BOW_TIPS = [[3.0, 0.75, -1.15], [0.75, 0.85, -0.95], [-1.15, 0.7, -0.95], [-2.6, 2.3, -0.1]]
  const BOW_THUMB = [0.55, 1.05, 0.55]
  function bowFrame(G, x, n, mat) {
    // nominal hand axes in the bow frame (grip()), turned by the rotation vector x[3..5]
    const fwd = v3(G.fwd[0], G.fwd[1], G.fwd[2] * n), side = v3(G.side[0], G.side[1], G.side[2] * n)
    const rv = v3(x[3], x[4], x[5] * n), ang = rv.length()
    if (ang > 1e-6) { const q = new THREE.Quaternion().setFromAxisAngle(rv.multiplyScalar(1 / ang), ang); fwd.applyQuaternion(q); side.applyQuaternion(q) }
    return rotFor(M.R.hand, fwd.transformDirection(mat), side.transformDirection(mat), new THREE.Quaternion())
  }
  function bowHandPose(m, mat, n, tip, bw, dt) {
    toLocalM.copy(mat).invert()
    const s = handScale
    const G = grip(n, tip, s)
    const L = p => v3(p[0], p[1], p[2] * n)
    const tipsW = BOW_TIPS.map(p => L(p).applyMatrix4(mat)), thumbW = L(BOW_THUMB).applyMatrix4(mat)
    const stickA = v3(-4, 1.6, 0).applyMatrix4(mat), stickB = v3(8, 1.62, 0).applyMatrix4(mat)
    const thumbLen = m.thumb.len[0] + m.thumb.len[1]
    // out of reach (toward the tip): bring the clavicle forward and in
    const Wnom = L(G.knuckle).applyMatrix4(mat).sub(m.knuckleOff.clone().applyQuaternion(bowFrame(G, [0, 0, 0, 0, 0, 0], n, mat)))
    turn(m.shoulder, null)
    const reach = m.l1 + m.l2
    const need = clamp((wp(m.upper).distanceTo(Wnom) - 0.9 * reach) / 8, 0, 1)
    st.rClav += (need - st.rClav) * Math.min(1, dt * 10)
    turn(m.shoulder, new THREE.Euler(0, 0.35 * st.rClav, -0.08 * st.rClav, 'YXZ'))
    const S = wp(m.upper)
    const sb = bw.s ?? 1.5
    const level = 1 - sb / Math.max(1, V.S - 1)                // 1 = G string: elbow high
    // pole low enough that the elbow sits near the measured heights per string
    // (research 01 §4.3: upper arm 30–40° from the body on E, 60–75° on G)
    const pole = S.clone().add(v3(-30, -55 + 22 * level + 12 * tip, -12))
    const bendWant = 22 - 30 * tip                               // + flexed, − extended (degrees)
    const proWant = THREE.MathUtils.degToRad(25) * tip           // extra pronation toward the tip
    const stickDir = stickB.clone().sub(stickA).normalize()
    // the torso (a capsule from the hips to the neck, r ≈ 13 cm) for the forearm to clear
    const tA = wp(B.hips).add(v3(0, 8, 0)), tB = wp(B.neck), tD = tB.clone().sub(tA), tL2 = tD.lengthSq()
    const toTorso = p => { const u = clamp(p.clone().sub(tA).dot(tD) / tL2, 0, 1); return p.distanceTo(tA.clone().addScaledVector(tD, u)) }
    const CLEAR = 13 + 3.5 + 1.5 + 1.5
    const elbowFor = W => {
      // the pole's elbow, swung out from the body as far as the forearm needs
      let E = twoBone(S.clone(), W.clone(), m.l1, m.l2, pole, v3()), gap = 99
      for (let k = 0; k < 4; k++) {
        gap = 99
        for (let j = 0; j <= 4; j++) gap = Math.min(gap, toTorso(E.clone().lerp(W, j / 4)) - CLEAR)
        if (gap >= 0) break
        const out = E.clone().sub(tA).setY(0).normalize()
        E = twoBone(S.clone(), W.clone(), m.l1, m.l2, E.clone().addScaledVector(out, 25 * (k + 1)), v3())
      }
      return { E, gap }
    }
    const evaluate = (x, why = null) => {
      const add = (k, v) => { if (why) why[k] = (why[k] || 0) + v; return v }
      const R = bowFrame(G, x, n, mat)
      const K = L([G.knuckle[0] + x[0], G.knuckle[1] + x[1], G.knuckle[2] + x[2] * n]).applyMatrix4(mat)
      const W = K.clone().sub(m.knuckleOff.clone().applyQuaternion(R))
      const { E, gap } = elbowFor(W)
      let c = add('reach', 40 * Math.max(0, S.distanceTo(W) - 0.985 * reach))
      c += add('torso', 30 * Math.max(0, -gap))
      // the wrist: flexion (+, toward the palm) and side bend against the forearm
      const fa = W.clone().sub(E).normalize(), h = m.knuckleOff.clone().applyQuaternion(R).normalize()
      const Nb = m.dorsalRest.clone().applyQuaternion(R)                 // the back of the hand
      const bend = THREE.MathUtils.radToDeg(Math.acos(clamp(fa.dot(h), -1, 1)))
      const sgn = h.clone().sub(fa.clone().multiplyScalar(h.dot(fa))).dot(Nb) < 0 ? 1 : -1   // + flexed
      const wb = sgn * bend
      c += add('wrist', 0.06 * (wb - bendWant) ** 2 + 3 * Math.max(0, Math.abs(wb - bendWant) - 12) + 4 * Math.max(0, bend - 35))
      // fingers onto their contacts
      for (let i = 0; i < 4; i++) {
        const Kf = W.clone().add(_pp.copy(m.kRest[i]).applyQuaternion(R))
        const q = handFinger(Kf, tipsW[i], m.fingers[i].len, i === 3 ? 0.5 : 0.75, h, Nb, _fp)
        c += add('f' + (i + 1), 60 * Math.min(q.miss, 1) + 15 * Math.max(0, q.miss - 1))
        c += add('f' + (i + 1) + 'shape', 3 * Math.max(0, q.flex - 85) + 3 * Math.max(0, -10 - q.flex) + 2 * Math.max(0, Math.abs(q.lean) - 25) + 0.6 * Math.max(0, (i === 3 ? 55 : 60) - q.pip))
        if (why) why['f' + (i + 1) + 'q'] = [Math.round(q.flex), Math.round(q.lean), Math.round(q.pip), +q.miss.toFixed(2)]
        // the index rests on the stick near its middle phalanx
        if (i === 0) { const mid = _fp[1].clone().lerp(_fp[2], 0.6); const dS = mid.clone().sub(stickA); dS.addScaledVector(stickDir, -dS.dot(stickDir)); c += add('index', 20 * Math.max(0, dS.length() - 1.4)) }
      }
      // the thumb: its root within reach of the frog corner, and bent (not straight)
      const Tb = W.clone().add(_pp.copy(m.thumbRest).applyQuaternion(R))
      const dT = Tb.distanceTo(thumbW) / (thumbLen + m.thumbRest.distanceTo(m.kRest[0]) * 0.45)
      c += add('thumb', 40 * Math.max(0, dT - 0.92) + 20 * Math.max(0, 0.55 - dT))
      // palm down onto the stick: the back of the hand up (bow frame +y), the
      // knuckles above the stick
      const up = Nb.clone().transformDirection(toLocalM)
      c += add('palm', 30 * Math.max(0, 0.6 - up.y))
      const Kl = K.clone().applyMatrix4(toLocalM)
      c += add('above', 15 * Math.max(0, 1.6 + 2.0 * s - Kl.y))
      // pronation toward the tip, and the elbow at the string's level (from the pole)
      const pro = x[3]
      c += add('pref', 4 * Math.abs(pro - proWant) + 1.5 * (Math.abs(x[4]) + Math.abs(x[5])) + 0.3 * (Math.abs(x[0]) + Math.abs(x[1]) + Math.abs(x[2])) / s + 4 * Math.max(0, Math.abs(x[2]) / s - 1.5))
      if (why) { why.wrist_deg = Math.round(wb); why.want = Math.round(bendWant); why.total = c }
      return { c, x, R, W, E, wb, up: up.y }
    }
    const STEP = [0.8 * s, 0.8 * s, 0.8 * s, 0.18, 0.18, 0.18]
    const descend = (from, rounds) => {
      let best = evaluate(from)
      for (let it = 0; it < rounds; it++) for (const k of [1, 0.5, 0.25]) for (let d = 0; d < 6; d++) for (const sg of [-1, 1]) {
        const x = best.x.slice(); x[d] += sg * k * STEP[d]
        const r = evaluate(x)
        if (r.c < best.c) best = r
      }
      return best
    }
    // from the last pose; on the first frame, or when the bow has moved on far
    // enough that it fits badly (a retake, a fast stroke), also from the
    // nominal hold for this part of the bow, with more rounds
    const nominal = [0, 0, 0, proWant, 0, 0]
    if (!BH.init) BH.x = nominal
    let best = descend(BH.init ? BH.x : nominal, BH.init ? 1 : 4)
    if (BH.init && best.c > 40) { const r = descend(nominal, 3); if (r.c < best.c) best = r; if (best.c > 40) { const r2 = descend(best.x, 2); if (r2.c < best.c) best = r2 } }
    const a = BH.init ? Math.min(1, dt * 16) : 1
    BH.x = BH.x.map((v, i) => v + (best.x[i] - v) * a); BH.init = true
    const out = evaluate(BH.x)
    st.bh = { cost: out.c, x: BH.x, wrist: out.wb, want: bendWant, up: out.up, tip }
    st.bhWhy = (x = BH.x) => { const w = {}; evaluate(x, w); for (const k in w) if (typeof w[k] === 'number') w[k] = +w[k].toFixed(1); return w }
    // the arm, then the fingers and the thumb onto their contacts
    setArm(m, S, out.E, out.W, out.R)
    bowFingers(m, mat, n, out.R, tipsW, thumbW)
  }
  function bowFingers(m, mat, n, R, tipsW, thumbW) {
    const h = m.knuckleOff.clone().applyQuaternion(R).normalize()
    const Nb = m.dorsalRest.clone().applyQuaternion(R)
    const side = m.side.clone().applyQuaternion(R)
    for (let i = 0; i < 4; i++) {
      const F = m.fingers[i]
      F.q = handFinger(wp(F.bones[0]), tipsW[i], F.len, i === 3 ? 0.5 : 0.75, h, Nb, F.pts)
      const Wp = F.pts
      const hinge = Wp[1].clone().sub(Wp[0]).cross(Wp[2].clone().sub(Wp[1]))
      const ref = hinge.lengthSq() > 1e-6 ? hinge.normalize() : side.clone()
      if (ref.dot(side) < 0) ref.negate()
      chain(F.bones, Wp, ref)
    }
    // thumb: bent, its tip in the corner of the frog and the stick
    const T = m.thumb
    setWorldQ(T.bones[0], _qq.copy(R).multiply(rest.get(T.bones[0]).q))
    let J1 = wp(T.bones[1])
    const reach = T.len[0] + T.len[1]
    if (J1.distanceTo(thumbW) > 0.88 * reach) {
      const C = wp(T.bones[0]), a = J1.clone().sub(C).normalize(), b = thumbW.clone().sub(C).normalize()
      const full = Math.acos(clamp(a.dot(b), -1, 1))
      if (full > 1e-3) {
        let lo = 0, hi = Math.min(full, 0.87)
        const axis = a.clone().cross(b).normalize(), Lc = J1.distanceTo(C)
        for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; const p = C.clone().addScaledVector(a.clone().applyAxisAngle(axis, mid), Lc); if (p.distanceTo(thumbW) > 0.88 * reach) lo = mid; else hi = mid }
        setWorldQ(T.bones[0], new THREE.Quaternion().setFromAxisAngle(axis, hi).multiply(wq(T.bones[0])))
        J1 = wp(T.bones[1])
      }
    }
    // the thumb bends outward (convex toward the tip of the bow), away from the palm
    const pole = J1.clone().lerp(thumbW, 0.5).addScaledVector(h, 3).addScaledVector(Nb, 2)
    const mid = twoBone(J1.clone(), thumbW.clone(), T.len[0], T.len[1], pole, v3())
    T.tip = mid.clone().addScaledVector(thumbW.clone().sub(mid).normalize(), T.len[1])
    T.target = thumbW.clone()
    T.bend = THREE.MathUtils.radToDeg(mid.clone().sub(J1).angleTo(thumbW.clone().sub(mid)))
    const back = Nb.clone()
    orient(T.bones[1], mid.clone().sub(J1), back)
    orient(T.bones[2], thumbW.clone().sub(mid), back)
  }
  /**
   * A Franco-Belgian bow hold in the bow frame (x along the stick toward the
   * tip, y from the hair up past the stick at y = 1.7, z toward the player
   * when n = 1): the hand over the stick, palm down onto it, knuckles on the
   * player's side; index, middle and ring fingers draped over to the far side
   * (the index in front of the frog, the middle opposite the thumb, the ring
   * over the frog), the little finger curved on top of the stick, the thumb
   * bent under the stick against the frog. Toward the tip the hand pronates
   * (the index sinks into the stick) and flattens.
   */
  function grip(n, tip, s) {
    return {
      knuckle: [0.3, 1.7 + 3.4 * s, 2.0 * s],
      side: [1, -(0.12 + 0.3 * tip), 0.08],
      fwd: [0.12, -(0.42 - 0.25 * tip), -0.9],
      tips: [[3.3, 1.05, -0.95], [0.7, 0.95, -0.8], [-1.1, 1.05, -0.75], [-2.7, 2.35, 0.05]],
      thumb: [0.35, 1.15, 0.6], thumbPole: [1.8, 2.4, 3.0],
    }
  }
  function chain(bones, pts, side) {
    for (let j = 0; j < 3; j++) orient(bones[j], pts[j + 1].clone().sub(pts[j]), side)
  }
  // bow: hair on the bowed string near the bridge, tilted to it (as #033)
  const _x = v3(), _y = v3(), _z = v3()
  function placeBow(bw) {
    const C = V.bowContact(bw.s, (2.6 + 0.6 * (1 - Math.min(1, Math.abs(bw.speed) / 60))) * V.k)
    C.y += 0.12 * V.k + bw.lift * 1.6 * V.k
    const th = V.bowTilt(bw.s)
    _x.set(0, Math.sin(th), Math.cos(th)); _z.set(-1, 0, 0)
    _y.crossVectors(_z, _x)
    _m.makeBasis(_x, _y, _z)
    bow.group.quaternion.setFromRotationMatrix(_m)
    bow.group.position.copy(C).addScaledVector(_x, -bw.pos * bow.hairLen / 65)
    bow.group.updateMatrixWorld(true)
  }
  // legs: feet planted, left forward, two-bone IK
  const feet = {
    L: M.L.footRest.clone().add(v3(4, 0, 7)),
    R: M.R.footRest.clone().add(v3(-4, 0, -3)),
  }
  function legs() {
    for (const S of ['L', 'R']) {
      const m = M[S], s = S === 'L' ? 1 : -1
      const T = wp(m.thigh), A = feet[S]
      const pole = T.clone().add(v3(s * 6, -20, 40))
      const K = twoBone(T.clone(), A.clone(), m.lt1, m.lt2, pole, v3())
      orient(m.thigh, K.clone().sub(T), v3(s * 0.15, 0, 1))
      orient(m.shin, A.clone().sub(K), v3(s * 0.15, 0, 1))
      setWorldQ(m.foot, _qq.setFromAxisAngle(Y, s * 0.12).multiply(rest.get(m.foot).q))
    }
  }
  // ── blinks: the VRM's 'blink' expression (pianist/rig.js's model) ──
  // ~every 5.5 s while bowing (concentration lowers the rate), ~3.4 s otherwise,
  // never closer than 1.8 s apart except a rare (5%) double blink, which is
  // never followed by another. A big gaze shift can bring the next blink
  // forward, but only once 2.5 s have passed since the last one. The lids
  // close to 80–95% (the anime eye fully shut reads as heavy), shutting in
  // ~60 ms and opening over ~140 ms, eased at both ends. Runs on its own clock
  // (the sum of dt), so he keeps blinking while paused; the first blink is
  // 1.5 s in, which keeps the headless shots (one settled second) open-eyed.
  let seed = 9371
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const blk = { now: 0, t0: -9, next: 1.5, amp: 0.9, dbl: false }
  function blinkSoon(p) { if (blk.now - blk.t0 > 2.5 && rnd() < p) blk.next = Math.min(blk.next, blk.now + 0.05 + 0.1 * rnd()) }
  function gazeShift(goal) {
    const h = wp(B.head)
    if (!st.looked) { st.looked = true; st.lookT.copy(goal); return }     // the first frame: no jump to blink at
    if (_d1.subVectors(st.lookT, h).angleTo(_d2.subVectors(goal, h)) > 0.45) blinkSoon(0.3)
  }
  const ease = x => x * x * (3 - 2 * x)
  function blinks(dt, playing) {
    const t = (blk.now += dt)
    if (t >= blk.next) {
      blk.t0 = t
      blk.amp = 0.8 + 0.15 * rnd()
      const mean = playing ? 5.5 : 3.4
      blk.next = t + 1.8 + mean * 0.7 * -Math.log(1 - 0.97 * rnd())
      if (!blk.dbl && rnd() < 0.05) { blk.next = t + 0.38; blk.dbl = true } else blk.dbl = false
    }
    const d = t - blk.t0
    const b = blk.amp * (d < 0.06 ? ease(d / 0.06) : d < 0.08 ? 1 : d < 0.22 ? ease(1 - (d - 0.08) / 0.14) : 0)
    st.blink = b
    vrm.expressionManager?.setValue('blink', b)
  }
  const _d1 = v3(), _d2 = v3()

  const lookObj = new THREE.Object3D()
  if (vrm.lookAt) { vrm.lookAt.target = lookObj; vrm.lookAt.autoUpdate = true }
  root.parent?.add(lookObj)

  return { update, opts, M, handScale, height, B, lookObj, hipsRestY, st }
}
