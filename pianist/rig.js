// Seated-pianist rig for the Experiment #032 character.
//
// Poses MakeHuman's 163-bone skeleton every frame from a handful of targets:
//  • the hands and arms from the fingering motion (hand-driver.js), measured
//    to this character's own hand so every knuckle and fingertip the solver
//    places is exactly where a bone goes;
//  • the pelvis fixed on the bench, the spine bending forward and leaning /
//    turning toward where the hands are playing (and further when a key is
//    out of the arms' reach), breathing;
//  • the head looking down at the hands (the eyes do the rest of the way);
//  • the legs as two-bone IK onto the pedals: right ball on the sustain,
//    left foot by the una corda, both riding the pedals when they move.
//
// Every bone gets a world rotation; bones that are not driven keep their
// rest pose relative to their parent (face, breasts, toes…). The result is
// written back as local quaternions, so the SkinnedMesh skins normally.
//
// Units: centimetres in the piano's frame (key tops at y = 73, key fronts at
// z = 0, the pianist at +z, floor at y = 0).

import * as THREE from 'three'
import { createHandsDriver } from './hand-driver.js'

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const Y = v3(0, 1, 0)
const clamp = THREE.MathUtils.clamp
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = v3(), _w = v3(), _m = new THREE.Matrix4()

// pedals (concert-grand.js): pivots at x = -7.5 / 0 / 7.5, y 5.1, z -7.5,
// a plate ~11 cm long toward the pianist, tipping 0.09 rad when pressed
const PEDAL_X = [-7.5, 0, 7.5]
const pedalPoint = (i, v, d) => v3(PEDAL_X[i], 5.85 + d * Math.sin(0.05 - 0.09 * v), -7.5 + d * Math.cos(0.05 - 0.09 * v))

/** Measure the character's hand (in the hand frame avatar-hands.js uses). */
export function measureHand(J, side) {
  const S = side === 'R' ? '.R' : '.L', s = side === 'R' ? 1 : -1
  const j = n => J[n]
  const W = j(`wrist${S}____head`), k3 = j(`finger3-1${S}____head`)
  const fwd = _v.subVectors(k3, W).normalize().clone()
  const lat = j(`finger5-1${S}____head`).clone().sub(j(`finger2-1${S}____head`))
  lat.addScaledVector(fwd, -lat.dot(fwd)).normalize()
  const up = new THREE.Vector3().crossVectors(lat, fwd).multiplyScalar(s).normalize()
  const coords = p => { const c = p.clone().sub(k3); return [c.dot(lat), c.dot(up), -c.dot(fwd)] }
  const dirc = d => [d.dot(lat), d.dot(up), -d.dot(fwd)]
  const FINGERS = {}
  const AV = { 1: [1.45, 1.05, 0.92], 2: [0.92, 0.84, 0.76], 3: [0.95, 0.87, 0.78], 4: [0.9, 0.82, 0.74], 5: [0.8, 0.72, 0.66] }
  let mid = 0
  for (const f of [1, 2, 3, 4, 5]) {
    const P = [1, 2, 3].map(i => j(`finger${f}-${i}${S}____head`)).concat([j(`finger${f}-3${S}____tail`)])
    const len = [0, 1, 2].map(i => P[i].distanceTo(P[i + 1]))
    if (f === 3) mid = len[0] + len[1] + len[2]
    const d = P[1].clone().sub(P[0]).normalize()
    FINGERS[f] = { len, rad: AV[f].map(r => r * 0.82), base: coords(P[0]), dir: dirc(d), k: f === 1 ? 0.8 : 0.7, ...(f === 1 ? { tilt: 0.75 } : {}) }
  }
  // the thumb's neutral direction points along the hand, a little across
  FINGERS[1].dir = [-0.42, -0.3, -0.86]
  for (const f of [2, 3, 4, 5]) FINGERS[f].dir[1] = 0
  const r = mid / 10.1                 // vs the #030 avatar's middle finger
  return {
    FINGERS, WRIST: coords(W), KNUCKLE_Y: 5.9 * r, KNUCKLE_Z: 3.6 * r,
    REACH: [0, 0, 7.4, 8, 7.4, 6.2].map(x => x * r),
    UPPER: j(`upperarm01${S}____head`).distanceTo(j(`lowerarm01${S}____head`)),
    FORE: j(`lowerarm01${S}____head`).distanceTo(W),
    frame: { lat, up, back: fwd.clone().negate() },   // rest hand frame (world)
    scale: r,
  }
}

/**
 * Build the rig for a loaded character (character.js).
 * opts: { seat: Vector3 (hip centre), lean }
 */
export function createRig(ch, { seat = v3(0, 64, 42) } = {}) {
  const { bones, restWorld, joints: J } = ch
  const N = bones.length
  const idx = Object.fromEntries(bones.map((b, i) => [b.name, i]))
  const parent = bones.map(b => (b.parent && b.parent.isBone ? idx[b.parent.name] : -1))
  const restQ = [], restLocalQ = [], restLocalP = [], restHead = []
  for (let i = 0; i < N; i++) {
    const p = v3(), q = new THREE.Quaternion(), s = v3()
    restWorld[i].decompose(p, q, s)
    restQ.push(q); restHead.push(p)
    restLocalQ.push(bones[i].quaternion.clone()); restLocalP.push(bones[i].position.clone())
  }
  const wQ = Array.from({ length: N }, () => new THREE.Quaternion())
  const wP = Array.from({ length: N }, () => v3())
  const set = new Uint8Array(N)
  let stamp = 0
  const done = new Uint32Array(N)
  // world transform of bone i (computed lazily, parents first)
  function solve(i) {
    if (done[i] === stamp) return
    const p = parent[i]
    if (p < 0) { done[i] = stamp; return }
    solve(p)
    wP[i].copy(restLocalP[i]).applyQuaternion(wQ[p]).add(wP[p])
    if (!set[i]) wQ[i].multiplyQuaternions(wQ[p], restLocalQ[i])
    done[i] = stamp
  }
  const B = n => idx[n]
  const pos = n => { const i = B(n); solve(i); return wP[i] }
  const quat = n => { const i = B(n); solve(i); return wQ[i] }
  /** base orientation of bone i: its parent's now times its rest offset */
  function base(i, out) { const p = parent[i]; solve(p); return out.multiplyQuaternions(wQ[p], restLocalQ[i]) }
  function setQ(i, q) { solve(parent[i]); wQ[i].copy(q); set[i] = 1; done[i] = 0; solve(i) }
  /** aim bone i's y axis along dir; optionally turn its hinge (a local axis) toward hingeTo. */
  function aim(i, dir, hingeLocal = null, hingeTo = null, q = new THREE.Quaternion()) {
    base(i, q)
    const cur = _w.copy(Y).applyQuaternion(q)
    _q.setFromUnitVectors(cur, _v.copy(dir).normalize())
    q.premultiply(_q)
    if (hingeLocal) twistToward(q, _v, hingeLocal, hingeTo)
    setQ(i, q)
    return q
  }
  function twistToward(q, axis, local, to) {
    const h = _w.copy(local).applyQuaternion(q)
    h.addScaledVector(axis, -h.dot(axis))
    const t = to.clone().addScaledVector(axis, -to.dot(axis))
    if (h.lengthSq() < 1e-8 || t.lengthSq() < 1e-8) return
    h.normalize(); t.normalize()
    const ang = Math.atan2(axis.dot(new THREE.Vector3().crossVectors(h, t)), h.dot(t))
    q.premultiply(_q2.setFromAxisAngle(axis, ang))
  }
  // hinge axes in each bone's local frame, from the rest pose
  const localOf = (i, worldVec) => worldVec.clone().applyQuaternion(restQ[i].clone().invert()).normalize()

  // ── Arms ──
  const handDims = { L: measureHand(J, 'L'), R: measureHand(J, 'R') }
  // the hand driver uses one set of dims for both hands; take the right one
  // (the build is symmetric)
  const hands = createHandsDriver(handDims.R)
  const arm = {}
  for (const side of ['L', 'R']) {
    const S = side === 'R' ? '.R' : '.L', s = side === 'R' ? 1 : -1
    const ua = J[`upperarm01${S}____head`], el = J[`lowerarm01${S}____head`], wr = J[`wrist${S}____head`]
    const hinge = new THREE.Vector3().crossVectors(el.clone().sub(ua), wr.clone().sub(el)).normalize()
    const f = handDims[side].frame
    const restBasis = new THREE.Matrix4().makeBasis(f.lat, f.up, f.back)
    const i = n => B(n + S)
    arm[side] = {
      s, S, restBasis, restBasisInv: restBasis.clone().invert(),
      ua1: i('upperarm01'), ua2: i('upperarm02'), la1: i('lowerarm01'), la2: i('lowerarm02'), wrist: i('wrist'),
      hingeUA: localOf(i('upperarm01'), hinge), hingeUA2: localOf(i('upperarm02'), hinge),
      hingeLA: localOf(i('lowerarm01'), hinge), hingeLA2: localOf(i('lowerarm02'), hinge),
      UPPER: handDims[side].UPPER, FORE: handDims[side].FORE,
      fingers: [1, 2, 3, 4, 5].map(fg => [1, 2, 3].map(k => i(`finger${fg}-${k}`))),
      drv: hands[side],
    }
  }

  // ── Legs ──
  const leg = {}
  for (const side of ['L', 'R']) {
    const S = side === 'R' ? '.R' : '.L'
    const i = n => B(n + S)
    const hip = J[`upperleg01${S}____head`], knee = J[`lowerleg01${S}____head`], ank = J[`foot${S}____head`], ball = J[`toe2-1${S}____head`]
    leg[side] = {
      ul1: i('upperleg01'), ul2: i('upperleg02'), ll1: i('lowerleg01'), ll2: i('lowerleg02'), foot: i('foot'),
      T: hip.distanceTo(knee), Sh: knee.distanceTo(ank), F: ank.distanceTo(ball),
      footRest: ball.clone().sub(ank).normalize(),   // ankle → ball, world rest
      hingeX: [i('upperleg01'), i('upperleg02'), i('lowerleg01'), i('lowerleg02'), i('foot')].map(b => localOf(b, v3(1, 0, 0))),
      heelDrop: ank.y,                               // ankle above the floor with the foot flat
    }
  }

  // ── Spine, neck, head ──
  const SPINE = ['spine05', 'spine04', 'spine03', 'spine02', 'spine01'].map(B)
  const NECK = ['neck01', 'neck02', 'neck03'].map(B), HEAD = B('head')
  const EYES = [B('eye.L'), B('eye.R')]
  // the eyeballs turn about their centres (the eye bones sit at the cornea)
  const eyeCenter = [v3(), v3()]
  {
    const p = ch.parts.eyes.geometry.attributes.position.array, n = [0, 0]
    for (let i = 0; i < p.length; i += 3) { const k = p[i] < 0 ? 0 : 1; eyeCenter[k].x += p[i]; eyeCenter[k].y += p[i + 1]; eyeCenter[k].z += p[i + 2]; n[k]++ }
    eyeCenter.forEach((c, k) => c.multiplyScalar(1 / n[k]))
  }
  // centre in the eye bone's own frame (rest)
  const eyeCenterLocal = EYES.map((i, k) => eyeCenter[k].clone().sub(restHead[i]).applyQuaternion(restQ[i].clone().invert()))
  const eyeMoved = new Uint8Array(N)
  const ROOT = B('root')
  const rootRestP = restHead[ROOT].clone()
  const hipMid = J['upperleg01.L____head'].clone().add(J['upperleg01.R____head']).multiplyScalar(0.5)
  const rootFromHip = rootRestP.clone().sub(hipMid)
  const state = {
    lean: 0.2, side: 0, turn: 0, demand: v3(), headYaw: 0, headPitch: 0, breath: 0,
    pedal: [0, 0, 0], leftOnUna: 0, eyeLimit: 0.16, gaze: v3(0, 76, 2), t: 0,
  }
  const Rb = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ')
  const tmpQ = new THREE.Quaternion()
  const bodyRot = (f, out) => out.setFromEuler(e.set(0, state.turn * f, 0, 'YXZ'))
    .multiply(_q2.setFromEuler(new THREE.Euler(-state.lean * f, 0, -state.side * f, 'YXZ')))

  function pose(dt) {
    stamp++
    set.fill(0)
    state.t += dt
    // root: hips on the bench, a slight forward tilt of the pelvis
    const r = ROOT
    const pelvisTilt = 0.06 + state.lean * 0.25
    wQ[r].setFromEuler(new THREE.Euler(-pelvisTilt, state.turn * 0.25, 0, 'YXZ')).multiply(restQ[r])
    wP[r].copy(rootFromHip).applyQuaternion(_q.setFromEuler(new THREE.Euler(-pelvisTilt, 0, 0))).add(seat)
    // weight on one sit bone: the pelvis rolls about the loaded one (7 cm off
    // centre, on the bench), so the other hip lifts
    const hr = state.hipRoll
    if (hr) {
      const pivot = v3(Math.sign(hr) * 7, seat.y - 8.6, seat.z), Rz = _q.setFromAxisAngle(v3(0, 0, 1), -hr)
      wQ[r].premultiply(Rz)
      wP[r].sub(pivot).applyQuaternion(Rz).add(pivot)
    }
    set[r] = 1; done[r] = stamp
    // spine: the bend is spread up the column (more in the chest), breathing in the chest
    const fr = [0.12, 0.3, 0.52, 0.78, 1.0]
    const breath = Math.sin(state.t * 2 * Math.PI * 0.23) * state.breathAmp
    for (let k = 0; k < 5; k++) {
      const i = SPINE[k]
      bodyRot(fr[k], Rb)
      if (hr) Rb.premultiply(_q.setFromAxisAngle(v3(0, 0, 1), -hr * (1 - 0.75 * fr[k])))
      if (k === 3) Rb.multiply(_q.setFromAxisAngle(v3(1, 0, 0), 0.012 * breath))
      if (k === 4) Rb.multiply(_q.setFromAxisAngle(v3(1, 0, 0), -0.008 * breath))
      wQ[i].multiplyQuaternions(Rb, restQ[i])
      wQ[i].premultiply(_q.setFromEuler(new THREE.Euler(-pelvisTilt, 0, 0)))
      set[i] = 1; done[i] = 0
      solve(i)
    }
    // shoulders rise a hair with each breath
    for (const sd of ['.L', '.R']) {
      const c = B('clavicle' + sd)
      base(c, tmpQ)
      tmpQ.premultiply(_q.setFromAxisAngle(v3(0, 0, 1).applyQuaternion(wQ[SPINE[4]]), (sd === '.L' ? 1 : -1) * -(0.01 * (breath + 1) + state.exShrug)))
      setQ(c, tmpQ)
    }

    // arms and hands
    for (const side of ['L', 'R']) armPose(arm[side])
    // head: look toward the hands, partly (the eyes take the rest)
    headPose()
    // legs onto the pedals
    for (const side of ['L', 'R']) legPose(side)
    // write locals
    for (let i = 0; i < N; i++) {
      solve(i)
      const p = parent[i]
      if (p < 0) { bones[i].position.copy(wP[i]); bones[i].quaternion.copy(wQ[i]); continue }
      bones[i].quaternion.multiplyQuaternions(_q.copy(wQ[p]).invert(), wQ[i])
      if (eyeMoved[i]) bones[i].position.copy(wP[i]).sub(wP[p]).applyQuaternion(_q)
    }
  }

  const tE = v3(), tW = v3(), dir = v3(), pole = v3(), hingeNow = v3()
  function armPose(a) {
    const S = pos(bones[a.ua1].name)
    const d = a.drv
    d.shoulder.copy(S)
    const Jd = d.joints
    if (!d.visible) { restArm(a); return }
    // two-bone IK, elbows out and down, as the driver
    tW.copy(Jd.W)
    const v = _v.subVectors(tW, S)
    let L = v.length()
    const maxL = a.UPPER + a.FORE - 0.05
    if (L > maxL) { tW.copy(S).addScaledVector(v.normalize(), maxL); L = maxL }
    const n = dir.subVectors(tW, S).normalize()
    const cosA = clamp((a.UPPER ** 2 + L * L - a.FORE ** 2) / (2 * a.UPPER * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA)
    pole.set(a.s * 0.6, -0.75, 0.3).addScaledVector(n, -pole.dot(n)).normalize()
    tE.copy(S).addScaledVector(n, a.UPPER * cosA).addScaledVector(pole, a.UPPER * sinA)
    hingeNow.crossVectors(_v.subVectors(tE, S), _w.subVectors(tW, tE)).normalize()
    const up = tE.clone().sub(S)
    aim(a.ua1, up, a.hingeUA, hingeNow)
    aim(a.ua2, up, a.hingeUA2, hingeNow)
    const fo = tW.clone().sub(tE)
    aim(a.la1, fo, a.hingeLA, hingeNow)
    aim(a.la2, fo, a.hingeLA2, hingeNow)
    // hand: map the rest hand frame onto the driver's (yaw only, plus a slight roll)
    const yaw = d.hand.yaw, c = Math.cos(yaw), sn = Math.sin(yaw)
    const e0 = v3(a.s * c, 0, a.s * sn), e1 = v3(0, 1, 0), e2 = v3(-sn, 0, c)
    // roll toward the side that presses (the driver's J.R carries it)
    const Rr = Jd.R.clone().multiplyScalar(a.s)   // toward the little finger
    const roll = Math.asin(clamp(-Rr.y, -0.3, 0.3))
    const fwdAxis = e2.clone().negate()
    const qr = _q.setFromAxisAngle(fwdAxis, roll)
    e0.applyQuaternion(qr); e1.applyQuaternion(qr)
    const Mh = new THREE.Matrix4().makeBasis(e0, e1, e2).multiply(a.restBasisInv)
    const qh = new THREE.Quaternion().setFromRotationMatrix(Mh).multiply(restQ[a.wrist])
    // forearm pronation: spread the twist between hand and forearm along the forearm
    const qb = base(a.wrist, new THREE.Quaternion())
    const D = qh.clone().multiply(qb.clone().invert())
    const ax = fo.clone().normalize()
    const proj = D.x * ax.x + D.y * ax.y + D.z * ax.z
    let tw = 2 * Math.atan2(proj, D.w)
    if (tw > Math.PI) tw -= 2 * Math.PI
    if (tw < -Math.PI) tw += 2 * Math.PI
    for (const [bi, f] of [[a.la1, 0.45], [a.la2, 0.85]]) {
      const q = wQ[bi].clone().premultiply(_q2.setFromAxisAngle(ax, tw * f))
      setQ(bi, q)
    }
    setQ(a.wrist, qh)
    // fingers: aim each phalanx along the driver's joints
    for (let f = 0; f < 5; f++) {
      const P = Jd.fingers[f + 1]
      for (let k = 0; k < 3; k++) aim(a.fingers[f][k], _w.subVectors(P[k + 1], P[k]).clone())
    }
  }
  function restArm(a) {
    // no song: hands in the lap
    const S = pos(bones[a.ua1].name)
    const lap = v3(a.s * 9, 62, 26)
    const v = _v.subVectors(lap, S), L = Math.min(v.length(), a.UPPER + a.FORE - 1)
    const n = v.normalize().clone()
    const cosA = clamp((a.UPPER ** 2 + L * L - a.FORE ** 2) / (2 * a.UPPER * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA)
    pole.set(a.s * 0.5, -0.4, 0.8).addScaledVector(n, -pole.dot(n)).normalize()
    tE.copy(S).addScaledVector(n, a.UPPER * cosA).addScaledVector(pole, a.UPPER * sinA)
    tW.copy(S).addScaledVector(n, L)
    hingeNow.crossVectors(_v.subVectors(tE, S), _w.subVectors(tW, tE)).normalize()
    const up = tE.clone().sub(S), fo = tW.clone().sub(tE)
    aim(a.ua1, up, a.hingeUA, hingeNow); aim(a.ua2, up, a.hingeUA2, hingeNow)
    aim(a.la1, fo, a.hingeLA, hingeNow); aim(a.la2, fo, a.hingeLA2, hingeNow)
  }

  const look = v3()
  function headPose() {
    // gaze: between the hands (or where they rest)
    const L = arm.L.drv, R = arm.R.drv
    if (L.visible || R.visible) {
      look.set(0, 0, 0); let n = 0
      for (const d of [L, R]) if (d.visible) { look.add(d.joints.M); n++ }
      look.multiplyScalar(1 / n)
      state.gaze.lerp(look, 0.06)
    }
    const top = pos('neck01')
    const want = _v.subVectors(state.gaze, top).normalize()
    // current face direction (rest faces -z) after the spine
    const q0 = base(NECK[0], new THREE.Quaternion())
    const face = v3(0, 0, -1).applyQuaternion(q0.clone().multiply(restQ[NECK[0]].clone().invert()))
    let yaw = Math.atan2(-want.x, -want.z) - Math.atan2(-face.x, -face.z)
    let pitch = Math.asin(clamp(want.y, -1, 1)) - Math.asin(clamp(face.y, -1, 1))
    yaw = clamp(yaw * 0.7, -0.6, 0.6); pitch = clamp(pitch * 0.5, -0.36, 0.2)
    state.headYaw += (yaw - state.headYaw) * 0.08
    state.headPitch += (pitch - state.headPitch) * 0.08
    const fr = [0.18, 0.18, 0.2, 0.44]
    const list = [...NECK, HEAD]
    for (let k = 0; k < 4; k++) {
      const i = list[k]
      base(i, tmpQ)
      _q.setFromEuler(new THREE.Euler((state.headPitch - state.exNod) * fr[k], state.headYaw * fr[k], state.exRoll * fr[k], 'YXZ'))
      // rotate about world axes through the body frame
      tmpQ.premultiply(_q)
      setQ(i, tmpQ)
    }
    // eyes onto the gaze point
    for (const [k, i] of EYES.entries()) {
      solve(i)
      const q = base(i, new THREE.Quaternion())
      const d = _v.subVectors(state.gaze, wP[i]).normalize()
      const cur = _w.copy(Y).applyQuaternion(q)
      const sw = _q.setFromUnitVectors(cur, d)
      // limit how far the eyes turn
      const ang = 2 * Math.acos(clamp(sw.w, -1, 1))
      if (ang > state.eyeLimit) sw.slerp(new THREE.Quaternion(), 1 - state.eyeLimit / ang)
      // world centre stays where the unturned eye had it
      const c0 = eyeCenterLocal[k].clone().applyQuaternion(q).add(wP[i])
      setQ(i, q.premultiply(sw))
      wP[i].copy(c0).sub(eyeCenterLocal[k].clone().applyQuaternion(wQ[i]))
      eyeMoved[i] = 1
    }
  }

  const hipP = v3(), ank = v3(), ball = v3(), knee = v3()
  function legPose(side) {
    const l = leg[side], s = side === 'R' ? 1 : -1
    hipP.copy(pos(bones[l.ul1].name))
    // where the ball of the foot goes
    if (side === 'R') ball.copy(pedalPoint(2, state.pedal[2], 8.5)).add(v3(0.5, 1.2, 0))
    else {
      const una = pedalPoint(0, state.pedal[0], 8.5).add(v3(-1, 1.2, 0))
      const floor = v3(-17, 2.4, 6)
      state.leftOnUna += ((state.pedal[0] > 0.05 ? 1 : 0) - state.leftOnUna) * 0.1
      ball.lerpVectors(floor, una, state.leftOnUna)
    }
    // ankle: back from the ball along the foot, heel resting on the floor
    const F = l.F, hy = l.heelDrop
    const dy = clamp(hy - ball.y, -F * 0.9, F * 0.9)
    ank.set(ball.x + s * 1.2, ball.y + dy, ball.z + Math.sqrt(F * F - dy * dy))
    // two-bone IK, knee forward and up
    const v = _v.subVectors(ank, hipP)
    let L = v.length()
    const maxL = l.T + l.Sh - 0.1
    if (L > maxL) { ank.copy(hipP).addScaledVector(v.normalize(), maxL); L = maxL }
    const n = dir.subVectors(ank, hipP).normalize()
    const cosA = clamp((l.T ** 2 + L * L - l.Sh ** 2) / (2 * l.T * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA)
    pole.set(s * 0.18, 0.55, -1).addScaledVector(n, -pole.dot(n)).normalize()
    knee.copy(hipP).addScaledVector(n, l.T * cosA).addScaledVector(pole, l.T * sinA)
    const th = knee.clone().sub(hipP), sh = ank.clone().sub(knee)
    const hinge = new THREE.Vector3().crossVectors(th, sh).negate().normalize()
    aim(l.ul1, th, l.hingeX[0], hinge); aim(l.ul2, th, l.hingeX[1], hinge)
    aim(l.ll1, sh, l.hingeX[2], hinge); aim(l.ll2, sh, l.hingeX[3], hinge)
    // foot: rest ankle→ball direction onto the target one
    const qb = base(l.foot, new THREE.Quaternion())
    const cur = l.footRest.clone().applyQuaternion(qb.clone().multiply(restQ[l.foot].clone().invert()))
    const want = ball.clone().sub(pos(bones[l.foot].name)).normalize()
    qb.premultiply(_q.setFromUnitVectors(cur, want))
    const ax = want
    twistToward(qb, ax, l.hingeX[4], hinge)
    setQ(l.foot, qb)
  }

  // ── Expression: the torso moves with the music, not only with the hands ──
  // From the notes: an energy curve (loudness × density, ~1.5 s window,
  // normalised by the piece's own range) and the accents (onsets clearly
  // louder than their surroundings, and chords). Both are functions of song
  // time, so seeking and the offline export reproduce the same motion.
  const ER_HZ = 20
  let energy = new Float32Array(1), accents = []
  function analyse(notes) {
    const end = notes.reduce((m, n) => Math.max(m, n.off ?? n.on), 0) + 2
    const N = Math.ceil(end * ER_HZ) + 1
    const raw = new Float32Array(N)
    for (const n of notes) { const i = Math.round(n.on * ER_HZ); if (i < N) raw[i] += (n.velocity ?? 0.7) }
    // gaussian window
    const W = Math.round(0.75 * ER_HZ), ker = []
    for (let k = -2 * W; k <= 2 * W; k++) ker.push(Math.exp(-0.5 * (k / W) ** 2))
    const sm = new Float32Array(N)
    for (let i = 0; i < N; i++) { if (!raw[i]) continue; for (let k = 0; k < ker.length; k++) { const j = i + k - 2 * W; if (j >= 0 && j < N) sm[j] += raw[i] * ker[k] } }
    const sorted = [...sm].filter(x => x > 0).sort((a, b) => a - b)
    const lo = sorted[Math.floor(sorted.length * 0.1)] || 0, hi = sorted[Math.floor(sorted.length * 0.95)] || 1
    energy = sm.map(x => clamp((x - lo) / (hi - lo || 1), 0, 1.2))
    // accents: group onsets within 40 ms; strong = loud for the context or a full chord
    const on = [...notes].sort((a, b) => a.on - b.on)
    accents = []
    for (let i = 0; i < on.length;) {
      let j = i, v = 0, c = 0
      while (j < on.length && on[j].on - on[i].on < 0.04) { v = Math.max(v, on[j].velocity ?? 0.7); c++; j++ }
      const e = energy[Math.min(N - 1, Math.round(on[i].on * ER_HZ))]
      const a = clamp((v - 0.55 - 0.25 * e) * 3 + (c >= 3 ? 0.35 : 0) + (c >= 5 ? 0.25 : 0), 0, 1)
      if (a > 0.15) accents.push([on[i].on, a])
      i = j
    }
  }
  const energyAt = t => { const x = t * ER_HZ, i = Math.floor(x); if (i < 0 || i >= energy.length - 1) return 0; return energy[i] + (energy[i + 1] - energy[i]) * (x - i) }
  function accentAt(t) {
    // impulse response of a quick dip: rises in ~60 ms, decays over ~0.35 s
    let lo = 0, hi = accents.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (accents[m][0] <= t) lo = m + 1; else hi = m }
    let s = 0
    for (let k = lo - 1; k >= 0; k--) {
      const d = t - accents[k][0]; if (d > 1.5) break
      s += accents[k][1] * (1 - Math.exp(-d / 0.06)) * Math.exp(-d / 0.35)
    }
    return Math.min(1.2, s)
  }
  // smooth noise from incommensurate sines (deterministic in song time)
  const wander = (t, s) => (Math.sin(t * 0.61 + s) + 0.6 * Math.sin(t * 1.37 + 2.1 * s) + 0.35 * Math.sin(t * 2.71 + 3.3 * s)) / 1.95
  // an underdamped spring per channel gives the torso some weight
  const spr = { lean: [0, 0], side: [0, 0], turn: [0, 0], nod: [0, 0], roll: [0, 0], shrug: [0, 0], hip: [0, 0] }
  function spring(ch, target, dt, f = 1.6, z = 0.55) {
    const w = 2 * Math.PI * f, st = spr[ch], h = Math.min(dt, 1 / 30)
    st[1] += (w * w * (target - st[0]) - 2 * z * w * st[1]) * h
    st[0] += st[1] * h
    return st[0]
  }
  state.expression = 1
  function express(dt) {
    const t = state.songT, x = state.expression
    const E = energyAt(t), A = accentAt(t), playing = state.playing
    const g = x * (playing ? 1 : 0.35)
    // into the keys with the energy (back off in quiet passages), dips on accents
    state.exLean = spring('lean', g * (0.11 * (E - 0.45) + 0.07 * A + 0.03 * wander(t * 0.7, 1)), dt, 1.1, 0.5)
    // slow side-to-side sway, larger when the music is moving
    state.exSide = spring('side', g * (0.03 + 0.04 * E) * wander(t * 0.35, 4), dt, 0.8, 0.6)
    state.exTurn = spring('turn', g * 0.05 * wander(t * 0.27, 7), dt, 0.8, 0.6)
    // the head nods into accents and lags the torso (follow-through)
    state.exNod = spring('nod', g * (0.09 * A + 0.04 * (E - 0.4) + 0.025 * wander(t * 0.9, 9)), dt, 2.2, 0.45)
    state.exRoll = spring('roll', g * (-0.6 * state.exSide + 0.04 * wander(t * 0.5, 12)), dt, 1.2, 0.5)
    // rocking onto one buttock: committed to a side (tanh) toward the register
    // the hands are working in, plus slow expressive rocking in moving passages
    const reach = Math.tanh(state.handSide / 0.04)
    state.hipRoll = spring('hip', x * (state.hipShift * (0.07 * reach + (playing ? 0.035 + 0.03 * E : 0.01) * wander(t * 0.22, 15))), dt, 0.55, 0.7)
    // shoulders lift a little in loud passages, drop on the accent
    state.exShrug = spring('shrug', g * (0.02 * E - 0.025 * A), dt, 2.5, 0.6)
    // breathing deepens with the phrase
    state.breathAmp = 1 + 1.2 * x * E
  }
  Object.assign(state, { songT: 0, playing: false, exLean: 0, exSide: 0, exTurn: 0, exNod: 0, exRoll: 0, exShrug: 0, breathAmp: 1, hipRoll: 0, hipShift: 1 })

  /** Posture from the hands: lean / turn toward them, further when out of reach. */
  function body(dt) {
    const L = arm.L.drv, R = arm.R.drv
    let mx = 0, mz = 0, n = 0, dz = 0, dx = 0
    for (const d of [L, R]) {
      if (!d.visible) continue
      mx += d.joints.W.x; mz += d.joints.W.z; n++
      // the driver moves its shoulder when a key is out of reach
      dz += d.joints.S.z - d.shoulder.z; dx += d.joints.S.x - d.shoulder.x
    }
    const k = 1 - Math.exp(-dt * 3)
    let lean = 0.2, side = 0, turn = 0
    if (n) {
      mx /= n
      lean = clamp(0.16 + Math.max(0, -dz) * 0.02, 0.1, 0.5)
      side = clamp(mx * 0.004 + dx * 0.01, -0.16, 0.16)
      turn = clamp(mx * 0.004, -0.2, 0.2)
    }
    state.handLean = (state.handLean ?? 0.2) + (lean - (state.handLean ?? 0.2)) * k
    state.handSide = (state.handSide ?? 0) + (side - (state.handSide ?? 0)) * k
    state.handTurn = (state.handTurn ?? 0) + (turn - (state.handTurn ?? 0)) * k
    express(dt)
    state.lean = state.handLean + state.exLean
    state.side = state.handSide + state.exSide
    state.turn = state.handTurn + state.exTurn
  }

  return {
    hands, state, dims: handDims,
    setNotes: notes => { hands.setNotes(notes); analyse(notes) },
    clear: () => hands.clear(),
    setPedals(una, sost, sus) { const k = 0.35; state.pedal[0] += ((una ? 1 : 0) - state.pedal[0]) * k; state.pedal[1] += ((sost ? 1 : 0) - state.pedal[1]) * k; state.pedal[2] += ((sus ? 1 : 0) - state.pedal[2]) * k },
    /** t: song time (s), dt: frame time */
    update(t, dt, playing = true) {
      state.playing = playing && t !== state.songT
      state.songT = t
      hands.update(t, dt)
      body(dt)
      pose(dt)
    },
    pos, quat, bone: n => bones[idx[n]],
  }
}
