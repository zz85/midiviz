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
const smooth01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

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
    // ── hips: weight on the left, sway, a dip with the energy ──
    const sway = opts.sway * (2.2 * Math.sin(2 * Math.PI * t / 4.3) + 0.8 * Math.sin(2 * Math.PI * t / 2.1 + 1))
    st.sway += (sway - st.sway) * k
    const energy = drive.energy ?? 0.5
    const leanT = opts.lean * (0.05 + 0.07 * energy - 0.08 * (drive.breath || 0))
    st.lean += (leanT - st.lean) * Math.min(1, dt * 3)
    const bw = pose?.bow
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

    // ── left arm and hand ──
    {
      const m = M.L, J = leftHand.joints, mat = V.group.matrixWorld
      const k1 = toWorld(J.fingers[1].base, mat), k4 = toWorld(J.fingers[4].base, mat)
      const knuckle = k1.clone().add(k4).multiplyScalar(0.5)
      const side = k1.clone().sub(k4)
      const S = wp(m.upper)
      const sMean = [1, 2, 3, 4].reduce((a, f) => a + pose.fingers[f].s, 0) / 4
      const swing = 1 - sMean / Math.max(1, V.S - 1)          // 1 on the G string
      const high = clamp((pose.anchorU - V.x0 * 0.62) / (V.x0 * 0.5), 0, 1)
      const pole = S.clone().add(v3(-14 - 10 * swing - 6 * high, -45, 18))
      // a straight wrist: the forearm and the hand form one segment from the
      // elbow to the knuckles, so solve the arm to the knuckles with the hand's
      // length added to the forearm, then put the wrist on that line
      const hl = m.knuckleOff.length()
      const E = twoBone(S.clone(), knuckle.clone(), m.l1, m.l2 + hl, pole.clone(), v3())
      // the hand's own orientation (which way the fingers point) comes from
      // #033's knuckle line; only its direction follows the forearm
      let R = rotFor(m.hand, knuckle.clone().sub(E), side, new THREE.Quaternion())
      const W = knuckle.clone().sub(m.knuckleOff.clone().applyQuaternion(R))
      // high positions: the knuckles are over the upper bout, and the straight
      // line from the elbow would put the wrist inside the body. The wrist stays
      // under the back instead (the heel of the hand against the shoulder of the
      // violin) and bends just that much
      toLocalM.copy(mat).invert()
      const Wl = W.clone().applyMatrix4(toLocalM)
      const over = smooth01((Wl.x - V.x0) / (3 * V.k))
      const yMax = -2.2 * V.k
      if (over > 0 && Wl.y > yMax) {
        Wl.y += (yMax - Wl.y) * over
        W.copy(Wl.applyMatrix4(mat))
        R = rotFor(m.hand, knuckle.clone().sub(W), side, new THREE.Quaternion())
      }
      arm(m, S, W, pole, R, side)
      fingersTo(m, mat, J)
    }
    // ── right arm and the bow hand ──
    {
      const m = M.R
      bow.group.updateMatrixWorld(true)
      const mat = bow.group.matrixWorld
      // which side of the stick the player is on (bow frame z)
      const bz = v3(0, 0, 1).applyQuaternion(wq(bow.group))
      const n = bz.dot(wp(chestBone).sub(wp(bow.group))) < 0 ? -1 : 1
      const tip = clamp((bw.pos ?? 30) / 65, 0, 1)
      const G = grip(n, tip, handScale)
      const P = p => v3(p[0], p[1], p[2] * n).applyMatrix4(mat)
      const D = d => v3(d[0], d[1], d[2] * n).transformDirection(mat)
      const knuckle = P(G.knuckle), side = D(G.side)
      const R = rotFor(m.hand, D(G.fwd), side, new THREE.Quaternion())
      const W = knuckle.clone().sub(m.knuckleOff.clone().applyQuaternion(R))
      // out of reach (toward the tip): bring the clavicle forward and in
      let S = wp(m.upper)
      const reach = m.l1 + m.l2
      const need = clamp((S.distanceTo(W) - 0.96 * reach) / 8, 0, 1)
      st.rClav += (need - st.rClav) * Math.min(1, dt * 10)
      turn(m.shoulder, new THREE.Euler(0, 0.35 * st.rClav, -0.08 * st.rClav, 'YXZ'))
      S = wp(m.upper)
      const sb = bw.s ?? 1.5
      const level = 1 - sb / Math.max(1, V.S - 1)                // 1 = G string: elbow high
      // pole low enough that the elbow sits near the measured heights per string
      // (research 01 §4.3: upper arm 30–40° from the body on E, 60–75° on G)
      const pole = S.clone().add(v3(-30, -55 + 22 * level + 12 * tip, -12))
      arm(m, S, W, pole, R, side)
      gripTo(m, mat, G, n)
    }
    legs()

    // eyes on the left hand (or on the bow when it travels)
    if (vrm.lookAt) {
      const goal = toWorld(V.bowContact(bw.s ?? 1.5), V.group.matrixWorld).lerp(toWorld(leftHand.joints.knuckle, V.group.matrixWorld), 0.55)
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
      st.lookT.lerp(drive.look || wp(B.head).addScaledVector(fwd0, 400).add(v3(0, -60 - 200 * bend, 0)), 0.1)
      lookObj.position.copy(st.lookT)
    }
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
  /** Fingers from the character's knuckles to the #033 fingertip targets. */
  function fingersTo(m, mat, J) {
    toLocalM.copy(mat).invert()
    const handR = wq(m.hand).multiply(_q.copy(rest.get(m.hand).q).invert())
    const side = m.side.clone().applyQuaternion(handR)
    for (let i = 0; i < 4; i++) {
      const F = m.fingers[i], f = i + 1
      const base = wp(F.bones[0]).applyMatrix4(toLocalM)
      solveFinger(base, J.fingers[f].cur, F.len, 0.72, F.pts, null)
      chain(F.bones, F.pts.map(p => p.clone().applyMatrix4(mat)), side)
    }
    // thumb: under the neck, two-bone onto its target
    const T = m.thumb
    setWorldQ(T.bones[0], _qq.copy(handR).multiply(rest.get(T.bones[0]).q))
    const tip = toWorld(J.thumb.target, mat)
    // out of reach: the metacarpal swings toward the target at the CMC joint
    // (up to 35°), as a real thumb opposes under the neck
    let J1 = wp(T.bones[1])
    if (J1.distanceTo(tip) > 0.97 * (T.len[0] + T.len[1])) {
      const C = wp(T.bones[0]), a = J1.clone().sub(C).normalize(), b = tip.clone().sub(C).normalize()
      const full = Math.acos(clamp(a.dot(b), -1, 1))
      if (full > 1e-3) {
        const q = new THREE.Quaternion().setFromAxisAngle(a.clone().cross(b).normalize(), Math.min(full, 0.6))
        setWorldQ(T.bones[0], q.multiply(wq(T.bones[0])))
        J1 = wp(T.bones[1])
      }
    }
    const pole = toWorld(J.thumb.base.clone().add(v3(-6, 0, 6)), mat)
    const mid = twoBone(J1.clone(), tip.clone(), T.len[0], T.len[1], pole, v3())
    const back = Y.clone().applyQuaternion(handR)
    orient(T.bones[1], mid.clone().sub(wp(T.bones[1])), back)
    orient(T.bones[2], tip.clone().sub(mid), back)
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
  /** Right fingers onto the bow grip. */
  function gripTo(m, mat, G, n) {
    toLocalM.copy(mat).invert()
    const L = p => v3(p[0], p[1], p[2] * n)
    const handR = wq(m.hand).multiply(_q.copy(rest.get(m.hand).q).invert())
    const side = m.side.clone().applyQuaternion(handR)
    for (let i = 0; i < 4; i++) {
      const F = m.fingers[i]
      const base = wp(F.bones[0]).applyMatrix4(toLocalM)
      solveFinger(base, L(G.tips[i]), F.len, i === 3 ? 0.5 : 0.8, F.pts, null)
      chain(F.bones, F.pts.map(p => p.clone().applyMatrix4(mat)), side)
    }
    const T = m.thumb
    setWorldQ(T.bones[0], _qq.copy(handR).multiply(rest.get(T.bones[0]).q))
    const J1 = wp(T.bones[1])
    const tip = L(G.thumb).applyMatrix4(mat), pole = L(G.thumbPole).applyMatrix4(mat)
    const mid = twoBone(J1.clone(), tip.clone(), T.len[0], T.len[1], pole, v3())
    const back = Y.clone().applyQuaternion(handR)
    orient(T.bones[1], mid.clone().sub(J1), back)
    orient(T.bones[2], tip.clone().sub(mid), back)
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
  const lookObj = new THREE.Object3D()
  if (vrm.lookAt) { vrm.lookAt.target = lookObj; vrm.lookAt.autoUpdate = true }
  root.parent?.add(lookObj)

  return { update, opts, M, handScale, height, B, lookObj, hipsRestY }
}
