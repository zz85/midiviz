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
export function createRig(ch, { seat: seat0 = v3(0, 64, 42) } = {}) {
  const seatP = v3()
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
    const hinge = new THREE.Vector3().crossVectors(el.clone().sub(ua), wr.clone().sub(el))
    // a straight arm (a T-pose model): the elbow bends the forearm forward
    if (hinge.length() < 0.05 * el.distanceTo(ua) * wr.distanceTo(el)) hinge.crossVectors(el.clone().sub(ua), v3(0, 0, -1))
    hinge.normalize()
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

  // ── Torso proxy: the elbows steer around the chest and ribs ──
  // Points on the body skin over the ribs and breasts (one per 2.5 cm cell),
  // each with its outward normal, carried by its bone; and each arm's
  // thickness, both measured from this character's mesh in the bind pose.
  // Each frame armPose swings the elbow round the shoulder–wrist line
  // (the wrist and hand stay put), keeping it low and letting the arm rest
  // lightly against the body (steerElbow); only a real overlap lifts it.
  const CLEAR = 0.3, CONTACT = 0.5
  const torso = (() => {
    const m = ch.meshes?.body, g = m?.geometry, si = g?.attributes.skinIndex, sw = g?.attributes.skinWeight
    if (!si || !sw || !ch.skeleton) return null
    const P = g.attributes.position, Nn = g.attributes.normal, sb = ch.skeleton.bones
    const dom = i => { let b = 0, w = -1; for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > w) { w = x; b = si.getComponent(i, k) } } return idx[sb[b].name] }
    const TORSO = /^(breast\.[LR]|spine0[123])$/, cells = new Set(), bi = [], lp = [], ln = []
    const rad = { L: [[], []], R: [[], []] }, p = v3(), nn = v3(), qi = new THREE.Quaternion()
    for (let i = 0; i < P.count; i++) {
      const b = dom(i), name = bones[b].name
      p.fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix)
      const am = name.match(/^(upper|lower)arm0[12]\.([LR])$/)
      if (am) { rad[am[2]][am[1] === 'upper' ? 0 : 1].push(p.clone()); continue }
      if (!TORSO.test(name)) continue
      const key = `${Math.floor(p.x / 2.5)},${Math.floor(p.y / 2.5)},${Math.floor(p.z / 2.5)}`
      if (cells.has(key)) continue
      cells.add(key)
      qi.copy(restQ[b]).invert()
      nn.fromBufferAttribute(Nn, i).normalize().applyQuaternion(qi)
      p.sub(restHead[b]).applyQuaternion(qi)
      bi.push(b); lp.push(p.x, p.y, p.z); ln.push(nn.x, nn.y, nn.z)
    }
    if (!bi.length) return null
    // arm radius: median distance of its skin from the bone line (rest pose)
    const radius = (pts, a0, a1) => {
      const A = restHead[B(a0)], ax = restHead[B(a1)].clone().sub(A), len = ax.length(); ax.normalize()
      const d = []
      for (const q of pts) { const r = q.clone().sub(A), u = r.dot(ax); if (u > 0.25 * len && u < 0.85 * len) d.push(r.addScaledVector(ax, -u).length()) }
      d.sort((x, y) => x - y); return d[d.length >> 1] || 4
    }
    for (const sd of ['L', 'R']) {
      arm[sd].rU = radius(rad[sd][0], 'upperarm01.' + sd, 'lowerarm01.' + sd)
      arm[sd].rF = radius(rad[sd][1], 'lowerarm01.' + sd, 'wrist.' + sd)
      arm[sd].phi = 0; arm[sd].protract = 0
      arm[sd].clavLen = Math.hypot(restHead[B('upperarm01.' + sd)].x - restHead[B('clavicle.' + sd)].x, restHead[B('upperarm01.' + sd)].z - restHead[B('clavicle.' + sd)].z) || 14
    }
    const n = bi.length
    return { n, bi: Int16Array.from(bi), lp: Float32Array.from(lp), ln: Float32Array.from(ln), wp: new Float32Array(n * 3), wn: new Float32Array(n * 3), cand: new Int32Array(n) }
  })()
  const _tp = v3(), _tn = v3()
  // the proxy in world space, after the spine is posed
  function placeTorso() {
    if (!torso) return
    const { n, bi, lp, ln, wp, wn } = torso
    let last = -1
    for (let j = 0; j < n; j++) {
      const b = bi[j]; if (b !== last) { solve(b); last = b }
      _tp.set(lp[j * 3], lp[j * 3 + 1], lp[j * 3 + 2]).applyQuaternion(wQ[b]).add(wP[b])
      _tn.set(ln[j * 3], ln[j * 3 + 1], ln[j * 3 + 2]).applyQuaternion(wQ[b])
      wp[j * 3] = _tp.x; wp[j * 3 + 1] = _tp.y; wp[j * 3 + 2] = _tp.z
      wn[j * 3] = _tn.x; wn[j * 3 + 1] = _tn.y; wn[j * 3 + 2] = _tn.z
    }
  }
  // how far a ball of radius r at (x, y, z) sinks below the skin (cm, > 0 =
  // inside), from the nearest proxy point and its normal; among cand[0..nc)
  function sinkAt(x, y, z, r, nc) {
    const { cand, wp, wn } = torso
    let bd = Infinity, bj = -1
    for (let k = 0; k < nc; k++) {
      const j = cand[k] * 3, dx = x - wp[j], dy = y - wp[j + 1], dz = z - wp[j + 2], d = dx * dx + dy * dy + dz * dz
      if (d < bd) { bd = d; bj = j }
    }
    if (bj < 0 || bd > (r + 6) ** 2) return -Infinity
    return r - ((x - wp[bj]) * wn[bj] + (y - wp[bj + 1]) * wn[bj + 1] + (z - wp[bj + 2]) * wn[bj + 2])
  }
  // the deepest the arm sinks with its elbow at E: along the upper arm from
  // 55% out (nearer the shoulder the arm rests against the side of the chest,
  // as a real one does) and the
  // first third of the forearm
  const U_AT = [0.55, 0.7, 0.85, 1], F_AT = [0.15, 0.3]
  function armSink(a, S, E, W, nc) {
    let worst = -Infinity
    for (const u of U_AT) worst = Math.max(worst, sinkAt(S.x + (E.x - S.x) * u, S.y + (E.y - S.y) * u, S.z + (E.z - S.z) * u, a.rU, nc))
    for (const u of F_AT) worst = Math.max(worst, sinkAt(E.x + (W.x - E.x) * u, E.y + (W.y - E.y) * u, E.z + (W.z - E.z) * u, a.rF, nc))
    return worst
  }
  const PHIS = Array.from({ length: 25 }, (_, i) => (i - 12) * 0.1)
  const _bn = v3(), _p0 = v3(), _E = v3()
  /** Swing the elbow (pole0 ⟂ n) round n until the arm clears the torso. */
  function steerElbow(a, S, W, n, U, cosA, sinA, pole0, dt) {
    if (!torso || sinA < 0.05) { a.phi = 0; a.sink = -Infinity; if (torso) a.protract = Math.max(0, a.protract - dt * 4); return pole0 }
    // the proxy points this arm can touch
    const { n: N, wp, cand } = torso, R2 = (U + 12) ** 2
    let nc = 0
    for (let j = 0; j < N; j++) { const dx = wp[j * 3] - S.x, dy = wp[j * 3 + 1] - S.y, dz = wp[j * 3 + 2] - S.z; if (dx * dx + dy * dy + dz * dz < R2) cand[nc++] = j }
    _bn.crossVectors(n, pole0).normalize()
    const elbow = (phi, out) => out.copy(S).addScaledVector(n, U * cosA)
      .addScaledVector(pole0, U * sinA * Math.cos(phi)).addScaledVector(_bn, U * sinA * Math.sin(phi))
    // Elbows stay low (a pianist's upper arm hangs, "an egg under the
    // arm"), the forearm passing under the bust. So the angle is chosen by
    // cost: the arm resting against the body (up to CONTACT cm into the
    // skin: soft tissue gives) is cheap, sinking deeper is dear, and every
    // centimetre the elbow rises above where it would hang costs about as
    // much as a centimetre of that light contact. Swinging out or back
    // costs a little, and changing course a little more.
    const y0 = elbow(0, _E).y
    let best = a.phi, bestCost = Infinity
    for (const phi of PHIS) {
      elbow(phi, _E)
      const sink = armSink(a, S, _E, W, nc)
      const cost = 3 * Math.max(0, sink + CLEAR) + 40 * Math.max(0, sink - CONTACT)
        + 2.5 * Math.max(0, _E.y - y0) + 0.3 * Math.abs(phi) + 0.5 * Math.abs(phi - a.phi)
      if (cost < bestCost) { bestCost = cost; best = phi }
    }
    a.phi += (best - a.phi) * (dt > 0 ? 1 - Math.exp(-dt / 0.06) : 1)
    a.sink = armSink(a, S, elbow(a.phi, _E), W, nc)
    // what the elbow cannot clear, the shoulder does: it rolls forward
    // (protraction, up to 7 cm), which also lets the elbow bend more. Fed
    // back into the next frame's clavicle (pose)
    if (a.sink > CONTACT) a.protract = Math.min(7, a.protract + dt * 25 * (a.sink - CONTACT))
    else if (a.sink < 0) a.protract = Math.max(0, a.protract - dt * 4)
    return _p0.copy(pole0).multiplyScalar(Math.cos(a.phi)).addScaledVector(_bn, Math.sin(a.phi))
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
    pedal: [0, 0, 0], leftOnUna: 0, eyeLimit: 0.16, lidClose: 0.56, lidSign: -1, gaze: v3(0, 76, 2), t: 0,
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
    const seat = seatP.copy(seat0); seat.z -= state.reachSlide || 0
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
      // the shoulder rolled forward to keep the upper arm off the chest (steerElbow)
      const am = arm[sd[1]]
      if (am.protract) tmpQ.premultiply(_q.setFromAxisAngle(Y, (sd === '.L' ? -1 : 1) * am.protract / am.clavLen))
      setQ(c, tmpQ)
    }

    // arms and hands
    placeTorso()
    for (const side of ['L', 'R']) armPose(arm[side], dt)
    // head: look toward the hands, partly (the eyes take the rest)
    headPose(dt)
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
  function armPose(a, dt) {
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
    a.deficit = L - maxL   // > 0: the wrist is out of this arm's reach (body() leans in)
    a.deficitDir = (a.deficitDir || v3()).copy(v).divideScalar(L || 1)   // ...and which way
    if (L > maxL) { tW.copy(S).addScaledVector(v.normalize(), maxL); L = maxL }
    const n = dir.subVectors(tW, S).normalize()
    const cosA = clamp((a.UPPER ** 2 + L * L - a.FORE ** 2) / (2 * a.UPPER * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA)
    pole.set(a.s * 0.6, -0.75, 0.3).addScaledVector(n, -pole.dot(n)).normalize()
    pole.copy(steerElbow(a, S, tW, n, a.UPPER, cosA, sinA, pole, dt))
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

  const look = v3(), handsAt = v3(0, 76, 2), glanceP = v3(), eyeT = v3(0, 76, 2), _d1 = v3(), _d2 = v3()
  // glance targets, by kind: the audience (her right, past the lid), the far
  // wall over the piano, up and away to the left
  const GLANCE_AT = [[0.3, v3(300, 150, -160)], [0.55, v3(-20, 160, -520)], [0.7, v3(-220, 168, -420)]]
  // or a slow sweep across the hall, far left to far right (or back)
  const SWEEP = [v3(-420, 162, -300), v3(-60, 158, -520), v3(380, 150, -180)]
  const sweepAt = (u, out) => { const x = u * 2, k = Math.min(1, Math.floor(x)); return out.lerpVectors(SWEEP[k], SWEEP[k + 1], x - k) }
  let glanceW = 0, lastSong = 0
  function headPose(dt) {
    // the hands: between them (or where they rest)
    const L = arm.L.drv, R = arm.R.drv
    if (L.visible || R.visible) {
      handsAt.set(0, 0, 0); let n = 0
      for (const d of [L, R]) if (d.visible) { handsAt.add(d.joints.M); n++ }
      handsAt.multiplyScalar(1 / n)
    }
    // a glance away while the music lets go of the keys
    const gl = state.playing && state.gazeMode !== 'hands' ? glanceAt(state.songT) : null
    let w = 0, inner = 0
    if (gl) {
      const k = gl.g.kind
      if (gl.g.quiet && hash(gl.g.a, 10) < 0.3) inner = gl.w          // eyes nearly closed, inward
      else {
        w = gl.w
        // horizon mode: one very slow pan across the hall, left to right and
        // back (~45 s a round trip), wherever she happens to look up
        if (state.gazeMode === 'horizon') sweepAt(0.5 - 0.5 * Math.cos(state.songT * 2 * Math.PI / 45), glanceP)
        else if (k < 0.7) glanceP.copy(GLANCE_AT.find(([lim]) => k < lim)[1])
        else { const u = THREE.MathUtils.smootherstep(gl.u, 0.1, 0.9); sweepAt(hash(gl.g.a, 9) < 0.5 ? u : 1 - u, glanceP) }
      }
    }
    const slow = state.gazeMode === 'horizon'
    glanceW += (w - glanceW) * (1 - Math.exp(-dt * (slow ? 1.6 : 6)))
    state.lidDrop += (inner * 0.8 - state.lidDrop) * (1 - Math.exp(-dt * 3))
    look.copy(handsAt).lerp(glanceP, glanceW)
    // eyes: a quick saccade when the target jumps, smooth pursuit otherwise;
    // the head follows more slowly. A big gaze shift often comes with a blink
    const top = pos('neck01')
    const shift = _d1.subVectors(eyeT, top).normalize().angleTo(_d2.subVectors(look, top).normalize())
    eyeT.lerp(look, 1 - Math.exp(-dt * (shift > 0.06 ? 28 : 7)))
    if (shift > 0.3) blinkSoon(0.5)
    if (slow) {
      // the head turns no faster than ~14°/s (the eyes lead, as they do)
      const g0 = _d1.subVectors(state.gaze, top), d0 = g0.length()
      state.gaze.lerp(look, 1 - Math.exp(-dt * 1.4))
      const g1 = _d2.subVectors(state.gaze, top), d1 = g1.length(), ang = g0.angleTo(g1), lim = 0.25 * dt
      if (ang > lim && d0 > 1) state.gaze.copy(top).add(g0.normalize().lerp(g1.normalize(), lim / ang).normalize().multiplyScalar(THREE.MathUtils.lerp(d0, d1, lim / ang)))
    } else state.gaze.lerp(look, 1 - Math.exp(-dt * (2.2 + 1.5 * glanceW)))
    // a blink at the end of most phrases
    const sT = state.songT
    if (state.playing) for (const [k, [, b]] of phrases.entries()) { if (b + 0.12 > lastSong && b + 0.12 <= sT && hash(k, 8) < 0.4) blinkSoon(1) }
    lastSong = sT
    const want = _v.subVectors(state.gaze, top).normalize()
    // current face direction (rest faces -z) after the spine
    const q0 = base(NECK[0], new THREE.Quaternion())
    const face = v3(0, 0, -1).applyQuaternion(q0.clone().multiply(restQ[NECK[0]].clone().invert()))
    let yaw = Math.atan2(-want.x, -want.z) - Math.atan2(-face.x, -face.z)
    let pitch = Math.asin(clamp(want.y, -1, 1)) - Math.asin(clamp(face.y, -1, 1))
    // the head takes a larger share of a glance than of looking at the keys
    yaw = clamp(yaw * (0.7 + 0.1 * glanceW), -0.55, 0.55); pitch = clamp(pitch * (0.5 + 0.25 * glanceW), -0.36, 0.2 + 0.15 * glanceW)
    // inward moments: the head drops and tilts a little
    pitch -= 0.08 * state.lidDrop
    const kh = 1 - Math.exp(-dt * 4.5)
    state.headYaw += (yaw - state.headYaw) * kh
    state.headPitch += (pitch - state.headPitch) * kh
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
      const d = _v.subVectors(eyeT, wP[i]).normalize()
      const cur = _w.copy(Y).applyQuaternion(q)
      const sw = _q.setFromUnitVectors(cur, d)
      // limit how far the eyes turn
      const ang = 2 * Math.acos(clamp(sw.w, -1, 1))
      const lim = state.eyeLimit + 0.12 * glanceW
      if (ang > lim) sw.slerp(new THREE.Quaternion(), 1 - lim / ang)
      // world centre stays where the unturned eye had it
      const c0 = eyeCenterLocal[k].clone().applyQuaternion(q).add(wP[i])
      setQ(i, q.premultiply(sw))
      wP[i].copy(c0).sub(eyeCenterLocal[k].clone().applyQuaternion(wQ[i]))
      eyeMoved[i] = 1
    }
    lidPose(dt)
  }

  // ── Blinks and lids ──
  // Blinks: ~every 4.5 s while playing (concentration lowers the rate), ~3 s
  // at rest, an occasional double blink, plus blinks on big gaze shifts and at
  // phrase ends. The shape is asymmetric: shut in ~75 ms, open over ~170 ms.
  // The upper lid also follows the eye's pitch (looking down at the keys
  // lowers it), and drops for the inward, eyes-closed moments.
  const LIDS = [['orbicularis03.L', 1], ['orbicularis03.R', 1], ['orbicularis04.L', -1], ['orbicularis04.R', -1]].map(([n, up]) => [B(n), up]).filter(([i]) => i !== undefined)
  let seed = 9371
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const blk = { t0: -9, next: 1.5 }
  function blinkSoon(p) { if (state.t - blk.t0 > 0.7 && rnd() < p) blk.next = Math.min(blk.next, state.t + 0.03 + 0.05 * rnd()) }
  function lidPose(dt) {
    const t = state.t
    if (t >= blk.next) {
      blk.t0 = t
      const mean = state.playing ? 5.5 : 3.4
      blk.next = t + 0.8 + mean * 0.8 * -Math.log(1 - 0.97 * rnd())
      if (rnd() < 0.12) blk.next = t + 0.36     // double blink
    }
    const d = t - blk.t0
    const b = d < 0.075 ? (d / 0.075) ** 2 : d < 0.11 ? 1 : d < 0.28 ? (1 - (d - 0.11) / 0.17) ** 2 : 0
    state.blink = b
    // eye pitch in the head's frame, from the left eye
    const hq = _q.copy(wQ[HEAD]).multiply(restQ[HEAD].clone().invert()).invert()
    const ed = _v.copy(Y).applyQuaternion(wQ[EYES[0]]).applyQuaternion(hq)
    const er = _w.copy(Y).applyQuaternion(restQ[EYES[0]])
    const ePitch = Math.asin(clamp(ed.y, -1, 1)) - Math.asin(clamp(er.y, -1, 1))
    const shut = Math.max(b, state.lidDrop)
    // the head's x axis (world) to swing the lids about
    const ax = v3(1, 0, 0).applyQuaternion(_q.copy(wQ[HEAD]).multiply(restQ[HEAD].clone().invert()))
    for (const [i, up] of LIDS) {
      base(i, tmpQ)
      // + closes: the upper lid comes down, the lower one up a little
      const close = up > 0
        ? state.lidClose * shut + (1 - shut) * (-0.6 * Math.min(0, ePitch) - 0.25 * Math.max(0, ePitch))
        : 0.12 * shut + (1 - shut) * 0.15 * Math.min(0, ePitch)
      const a = up * state.lidSign * close
      tmpQ.premultiply(_q.setFromAxisAngle(ax, a))
      setQ(i, tmpQ)
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
    analyseForm(on)
  }

  // ── Phrases, glances and weight moves, read from the score ──
  // All deterministic in song time (a hash per phrase / window, no Math.random),
  // so a seek or an export replays the same performance.
  let phrases = [], glances = [], hipMoves = [], free = new Uint8Array(1)
  const hash = (k, s = 0) => { const x = Math.sin(k * 127.1 + s * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x) }
  function analyseForm(on) {
    // onset clusters (chords) with their range, per hand
    const cl = []
    for (let i = 0; i < on.length;) {
      let j = i, end = 0
      const h = { L: [], R: [] }
      while (j < on.length && on[j].on - on[i].on < 0.04) { h[on[j].hand === 'L' ? 'L' : 'R'].push(on[j].pitch); end = Math.max(end, on[j].off ?? on[j].on + 0.3); j++ }
      cl.push({ t: on[i].on, end, h, mean: on.slice(i, j).reduce((s, n) => s + n.pitch, 0) / (j - i) })
      i = j
    }
    phrases = []; glances = []; hipMoves = []
    if (!cl.length) return
    // phrase boundaries: a gap that is long for the local pulse, or a long
    // note followed by a breath; phrases shorter than 1.5 s are merged
    const ioi = cl.slice(1).map((c, k) => c.t - cl[k].t).sort((a, b) => a - b)
    const med = ioi[Math.floor(ioi.length / 2)] || 0.25
    let start = cl[0].t, lastSplit = cl[0].t
    for (let k = 1; k < cl.length; k++) {
      const gap = cl[k].t - cl[k - 1].t, held = cl[k - 1].end - cl[k - 1].t
      const brk = gap > Math.max(0.32, 2.6 * med) || (held > Math.max(0.6, 3 * med) && gap > 1.6 * med)
      // never longer than ~9 s without a breath: split at the biggest gap
      if ((brk && cl[k].t - start > 1.5) || cl[k].t - lastSplit > 9) {
        phrases.push([start, cl[k - 1].end, k]); start = lastSplit = cl[k].t
      }
    }
    phrases.push([start, cl[cl.length - 1].end, cl.length])
    // free time: no leap coming, not too busy, so the eyes can leave the keys
    const N = energy.length
    free = new Uint8Array(N)
    const busy = new Float32Array(N), need = new Uint8Array(N)
    const prev = { L: null, R: null }
    for (const c of cl) {
      const i = Math.round(c.t * ER_HZ); if (i >= N) break
      busy[i] += 1
      for (const s of ['L', 'R']) {
        const ps = c.h[s]; if (!ps.length) continue
        const m = ps.reduce((a, b) => a + b, 0) / ps.length
        // a jump of more than ~a sixth, or a hand coming in after a rest: look
        if (prev[s] === null || Math.abs(m - prev[s][0]) > 9 || c.t - prev[s][1] > 2.5) {
          for (let k = Math.max(0, i - Math.round(0.8 * ER_HZ)); k <= Math.min(N - 1, i + Math.round(0.25 * ER_HZ)); k++) need[k] = 1
        }
        prev[s] = [m, c.t]
      }
    }
    // onsets per second, over a second
    let acc = 0; const W = ER_HZ
    for (let i = 0; i < N; i++) {
      acc += busy[i] - (i >= W ? busy[i - W] : 0)
      free[i] = !need[i] && acc < 7 ? 1 : 0
    }
    // glances: candidate windows inside free runs of at least a second
    for (let i = 0, run = 0; i <= N; i++) {
      if (i < N && free[i]) { run++; continue }
      // a long run is cut into 3.5–6.5 s candidates, each its own chance; in
      // horizon mode they join up, with a quick check of the keys between
      if (run >= ER_HZ) {
        const A = (i - run) / ER_HZ, B = i / ER_HZ
        for (let a = A; B - a >= 1;) {
          const key = Math.round(a * 10), b = B - a < 8 ? B : a + 3.5 + 3 * hash(key, 7)
          glances.push({ a: a + 0.15, b: b - 0.2, r: hash(key, 1), quiet: energyAt((a + b) / 2) < 0.35, kind: hash(key, 2) })
          a = b
        }
      }
      run = 0
    }
    // weight moves: each phrase settles onto a sit bone — usually toward the
    // register it is played in, sometimes away (or back to centre)
    for (const [k, [a, b, ci]] of phrases.entries()) {
      let m = 0, n = 0
      for (const c of cl) { if (c.t < a) continue; if (c.t > b) break; m += c.mean; n++ }
      const reg = n ? Math.tanh((m / n - 62) / 10) : 0
      const r = hash(k, 3), dir = r < 0.15 ? 0 : r < 0.32 ? -Math.sign(reg || 1) : Math.sign(reg || (hash(k, 4) - 0.5))
      hipMoves.push([a - 0.35, dir * (0.5 + 0.5 * hash(k, 5))])
    }
  }
  const isFree = t => { const i = Math.round(t * ER_HZ); return i >= 0 && i < free.length && free[i] === 1 }
  // the current weight move (smoothed over ~0.8 s around each phrase start)
  function hipMoveAt(t) {
    let v = 0
    for (const [a, d] of hipMoves) { if (a > t) break; v = v + (d - v) * THREE.MathUtils.smootherstep(t, a, a + 0.8) }
    return v
  }
  // phrase shape for the lean: in during a phrase, a small release at its end
  function phraseEndAt(t) {
    let s = 0
    for (const [, b] of phrases) { const d = t - b; if (d < -0.8) break; if (d > 1.5) continue; s = Math.max(s, Math.exp(-0.5 * ((d - 0.2) / 0.45) ** 2)) }
    return s
  }
  // where the eyes go: 0 = the hands, 1 = the glance target (with its kind)
  const GLANCE = { music: 0.5, horizon: 0.92, hands: 0 }
  function glanceAt(t) {
    // glances: how often she looks up (× the gaze mode's own rate)
    const p = Math.min(1, (GLANCE[state.gazeMode] ?? 0.5) * state.glances)
    const horizon = state.gazeMode === 'horizon'
    for (const [gi, g] of glances.entries()) {
      if (g.a > t) break
      if (t > g.b || g.r > p) continue
      if (horizon) {
        // back-to-back windows join into one held look (no quick checks of
        // the keys between them), eased in and out over ~1 s
        let a = g.a, b = g.b
        for (let j = gi - 1; j >= 0 && glances[j].b > a - 0.5 && glances[j].r <= p; j--) a = glances[j].a
        for (let j = gi + 1; j < glances.length && glances[j].a < b + 0.5 && glances[j].r <= p; j++) b = glances[j].b
        const e = Math.min(1, (b - a) / 3)
        const w = THREE.MathUtils.smoothstep(t, a, a + e) * (1 - THREE.MathUtils.smoothstep(t, b - e, b))
        return { w, g, u: clamp((t - a) / (b - a), 0, 1) }
      }
      // a held glance (horizon mode) or a 1.2–3 s one (music)
      const b = state.gazeMode === 'horizon' ? g.b : Math.min(g.b, g.a + (g.kind >= 0.7 ? 2.6 : 1.2) + 1.8 * hash(g.a * 7, 6))
      if (t > b) continue
      const w = THREE.MathUtils.smoothstep(t, g.a, g.a + 0.3) * (1 - THREE.MathUtils.smoothstep(t, b - 0.25, b))
      return { w, g, u: clamp((t - g.a) / (b - g.a), 0, 1) }
    }
    return null
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
    // style: rock (forward / back), sway (side to side), nod (the head)
    state.exLean = spring('lean', g * state.rock * (0.11 * (E - 0.45) + 0.07 * A + 0.03 * wander(t * 0.7, 1) - 0.06 * phraseEndAt(t)), dt, 1.1, 0.5)
    // slow side-to-side sway, larger when the music is moving
    state.exSide = spring('side', g * state.sway * (0.03 + 0.04 * E) * wander(t * 0.35, 4), dt, 0.8, 0.6)
    state.exTurn = spring('turn', g * state.sway * 0.05 * wander(t * 0.27, 7), dt, 0.8, 0.6)
    // the head nods into accents and lags the torso (follow-through)
    state.exNod = spring('nod', g * state.nod * (0.09 * A + 0.04 * (E - 0.4) + 0.025 * wander(t * 0.9, 9)), dt, 2.2, 0.45)
    state.exRoll = spring('roll', g * (-0.6 * state.exSide + 0.04 * state.nod * wander(t * 0.5, 12)), dt, 1.2, 0.5)
    // rocking onto one buttock: committed to a side (tanh) toward the register
    // the hands are working in, plus slow expressive rocking in moving passages
    // the reach (where the hands are) and the phrase's own weight move, which
    // may go toward the register or away from it
    const reach = Math.tanh(state.handSide / 0.04)
    const move = playing ? hipMoveAt(t) : 0
    state.hipRoll = spring('hip', x * state.hipShift * (0.045 * reach * Math.min(1.5, state.reach) + 0.05 * move + state.sway * (playing ? 0.02 + 0.02 * E : 0.01) * wander(t * 0.22, 15)), dt, 0.55, 0.7)
    // shoulders lift a little in loud passages, drop on the accent
    state.exShrug = spring('shrug', g * (0.02 * E - 0.025 * A), dt, 2.5, 0.6)
    // breathing deepens with the phrase
    state.breathAmp = 1 + 1.2 * x * E
  }
  Object.assign(state, { songT: 0, playing: false, exLean: 0, exSide: 0, exTurn: 0, exNod: 0, exRoll: 0, exShrug: 0, breathAmp: 1, hipRoll: 0, hipShift: 1, posture: 0.5, reach: 1, rock: 1, sway: 1, nod: 1, glances: 1, gazeMode: 'music', blink: 0, lidDrop: 0 })

  const LOOK = 0.4, _fw = v3(), _sd = v3(), TURN_R = 25   // s ahead the body watches for keys out of reach
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
    // out of reach (a far or high bench, a wide leap): come forward until the
    // arms reach again, then ease back. Fed back from last frame's arms, in
    // cm of shoulder travel, settling with a centimetre to spare: first lean
    // in (1/40 rad per cm), then slide forward on the bench (up to 12 cm),
    // then lean further
    let short = -Infinity, shortA = null
    const sd = _sd.set(0, 0, -1)
    for (const a of [arm.L, arm.R]) if (a.drv.visible && a.deficit != null && a.deficit > short) { short = a.deficit; sd.copy(a.deficitDir); shortA = a }
    // ...and ahead of a wide leap: how far short each arm would be over the
    // next LOOK seconds from where her shoulders are now, nearer moments
    // counting a little more, so she is already forward when it lands
    if (state.playing) for (const a of [arm.L, arm.R]) {
      if (!a.drv.visible) continue
      const S = pos(bones[a.ua1].name), maxL = a.UPPER + a.FORE - 0.05
      for (let j = 1; j <= 12; j++) {
        const tau = LOOK * j / 12
        if (!a.drv.wristAt(state.songT + hands.lead + tau, _fw)) break
        const d = _fw.distanceTo(S), sh = d - maxL - 2 * tau / LOOK
        if (sh > short) { short = sh; sd.subVectors(_fw, S).divideScalar(d); shortA = a }
      }
    }
    // Three ways to bring the short arm's shoulder toward its keys, each in
    // cm of shoulder travel, and each grown by how much it helps (the
    // shortfall direction sd projected on the way it moves the shoulder):
    //  • lean in (then slide forward on the bench): toward the keys, -z;
    //  • lean sideways (about 45 cm of spine above the seat): ±x;
    //  • turn the torso about the spine (turn = cm / TURN_R rad): the
    //    shoulder swings round the spine, so turning toward the keys at one
    //    end brings the other shoulder forward, and a hand crossing over
    //    gets its shoulder brought round.
    // Each settles with a centimetre to spare. Once the keys are in reach
    // they ease back slowly (a few cm/s, the slide slower still), so she
    // stays forward through a passage instead of bobbing between its leaps.
    const err = short === -Infinity ? -2 : clamp(short + 1, -2, 15)
    let rin = state.reachIn ?? 0, rs = state.reachSide ?? 0, rt = state.reachTurn ?? 0
    if (err > 0 && shortA) {
      const S = pos(bones[shortA.ua1].name), c = pos('spine05')
      // (leaning in also lowers the shoulders, so it helps keys below them
      // even when they are not ahead: a close, high bench)
      const hIn = clamp(-sd.z + 0.5 * Math.max(0, -sd.y), 0.3, 1)
      let hSide = sd.x
      let hTurn = ((S.z - c.z) * sd.x - (S.x - c.x) * sd.z) / TURN_R
      // the sideways lean only for keys that are off to the side (for a
      // shortfall straight down or back it wanders and sticks); the turn
      // wherever it helps
      const sw = clamp((Math.abs(sd.x) - 0.35) / 0.3, 0, 1)
      hSide *= sw
      const g = hIn * hIn + hSide * hSide + hTurn * hTurn || 1, k = dt * 10 * err / g
      rin += k * hIn; rs += k * hSide; rt += k * hTurn
    } else {
      const r = dt * 2.5 * Math.min(2, -err)
      for (const [x, set] of [[rin, v => rin = v], [rs, v => rs = v], [rt, v => rt = v]]) set(x - Math.sign(x) * Math.min(Math.abs(x), r))
    }
    state.reachIn = rin = clamp(rin, 0, 34)
    state.reachSide = clamp(rs, -12, 12)
    state.reachTurn = clamp(rt, -8, 8)
    // the bench slide is a slow move (a pianist does not scoot for each
    // leap): it follows what the lean cannot cover in about a second and
    // gives it back over several; the lean covers the difference meanwhile
    const slideGoal = clamp(rin - 8, 0, 12), sl = state.reachSlide ?? 0
    state.reachSlide = sl + (slideGoal - sl) * (1 - Math.exp(-dt / (slideGoal > sl ? 0.8 : 5)))
    state.reachLean = (Math.min(rin, 8) + Math.max(0, rin - 8 - state.reachSlide)) / 40
    let lean = 0.02 + 0.28 * state.posture, side = 0, turn = 0
    if (n) {
      mx /= n
      // posture: 0 upright (just off vertical) … 1 well over the keys
      // (the slider goes past both: −0.5 leaning back, 1.6 hunched over)
      const base = 0.02 + 0.28 * state.posture
      lean = clamp(base + Math.max(0, -dz) * 0.02, base - 0.06, 0.65)
      // reach: how far she leans and turns toward the register being played
      // (0 = stays square to the keyboard, 2 = leans well into it)
      side = clamp(mx * 0.004 + dx * 0.01, -0.16, 0.16) * state.reach
      turn = clamp(mx * 0.004, -0.2, 0.2) * state.reach
    }
    state.handLean = (state.handLean ?? 0.2) + (lean - (state.handLean ?? 0.2)) * k
    state.handSide = (state.handSide ?? 0) + (side - (state.handSide ?? 0)) * k
    state.handTurn = (state.handTurn ?? 0) + (turn - (state.handTurn ?? 0)) * k
    express(dt)
    state.lean = Math.min(0.9, state.handLean + state.exLean + state.reachLean)
    state.side = clamp(state.handSide + state.exSide + state.reachSide / 45, -0.4, 0.4)
    state.turn = state.handTurn + state.exTurn + state.reachTurn / TURN_R
  }

  return {
    hands, state, dims: handDims, form: () => ({ phrases, glances, hipMoves }),
    /** the music as read from the notes (for the camera director) */
    music: { energyAt: t => energyAt(t), accentAt: t => accentAt(t), glanceAt: t => glanceAt(t) },
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
