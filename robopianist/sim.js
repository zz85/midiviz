// RoboPianist scene in MuJoCo (Experiment #031), shared by the page and the
// node evaluator.
//
// The scene, meshes and recorded policy actions are RoboPianist's own browser
// demo (kevinzakka/robopianist-demo, Apache-2.0): an 88-key MuJoCo piano with
// two Shadow Dexterous Hands, 19 position actuators per hand, physics at
// 200 Hz. Two ways to drive it:
//
//  • ReplayController: the deep-RL policy (DroQ, trained per song for 5M
//    steps) as recorded by its authors: one 38-wide action every 50 ms,
//    played back open loop through the same physics.
//  • PlannerController: our #029 pipeline. fingering.js picks hand and finger
//    for every note, motion.js turns that into fingertip trajectories, and a
//    damped-least-squares IK on a scratch copy of the model turns fingertip
//    targets into the 38 servo targets every few milliseconds. Nothing is
//    trained; any MIDI works.
//
// Scoring is RoboPianist's (wrappers/evaluation.py): the song becomes a 20 Hz
// piano roll (note_seq frames: start floor, end ceil, a re-struck key is off
// on its onset frame), the keys pressed after each 50 ms control step are
// compared with that frame, and precision / recall / F1 are averaged over the
// frames, with sklearn's zero_division=1 (an empty frame matched by no press
// scores 1).

import { buildMotion } from '../fingering/motion.js'
import { keyX } from '../fingering/keyboard.js'

export const CONTROL_DT = 0.05
export const SCENE_FILES = [
  'scene.xml',
  'f_distal_pst-927e7e0da0ee76e69c0444b22bade45ff20ab5ee.obj',
  'f_knuckle-4e74747ced8908917157e00df691de5cfc71808c.obj',
  'f_middle-c817011a5fccb8dac0f3201f10aa30ffa74db8b6.obj',
  'f_proximal-2b944834ac12ce9bb152073bce3db339405bc76d.obj',
  'forearm_0-20abf0e17ef9afc17a625f75fc0ad21f31b2ff9a.obj',
  'forearm_1-f5b8ac92a6e1b0a6b27c50dac2004867e6c0fb5b.obj',
  'forearm_collision-3ef43cdb2273599be12fc3270639b8782c869cb4.obj',
  'lf_metacarpal-43a8cbd60c754686e733e10c0c28ff082b46a917.obj',
  'palm-20de86ceb3b063e7ca1bf25fa6ddd07c068d6a70.obj',
  'th_distal_pst-c003d5be2d6a841babda3d88c51010617a2ba4bb.obj',
  'th_middle-c6937ecc6bf6b01a854aaffb71f3beeda05f8ac3.obj',
  'th_proximal-836fc483b89bf08806ab50636ab1fe738a54406e.obj',
  'wrist-87545134a753f219a1f55310cc200489b3a03c47.obj',
]
/** Songs the RoboPianist authors recorded policy actions for. */
export const POLICIES = {
  twinkle_twinkle: { title: 'Twinkle Twinkle (Rousseau)', midi: 'twinkle-twinkle-trimmed.mid' },
  nocturne: { title: 'Nocturne Op. 9 No. 2 (Rousseau)', midi: 'nocturne-trimmed.mid' },
  fur_elise: { title: 'Für Elise (PIG)', midi: null },
  turkish_march: { title: 'Turkish March (PIG)', midi: null },
  k545: { title: 'Sonata K545 (PIG)', midi: null },
}
/**
 * Human fingering shipped with RoboPianist for the two Rousseau clips
 * (music/library.py): 0–4 right thumb…little, 5–9 left thumb…little, in
 * onset order (Nocturne ties broken by pitch).
 */
export const ROUSSEAU_FINGERING = {
  twinkle_twinkle: [1, 9, 5, 0, 3, 6, 3, 8, 4, 5, 4, 8, 3, 6, 4, 8, 3, 5, 3, 6, 5, 2, 6, 2, 1, 8, 2, 1, 2, 1, 6, 2, 0, 9],
  nocturne: [0, 8, 4, 9, 6, 8, 6, 5, 9, 9, 6, 2, 8, 6, 5, 3, 8, 2, 9, 6, 8, 6, 5, 7, 1, 9, 6, 8, 6, 5, 0, 7, 4, 9, 6, 8, 6, 5, 0, 3, 2, 1, 0, 7, 4, 9, 6, 8, 6, 5, 0, 7, 2, 9, 6, 7, 6, 5, 7, 2, 9, 6, 7, 6, 5, 2, 7, 1, 9, 6, 8, 6, 5, 9, 4, 9, 5, 6, 5, 5, 0, 9, 2, 9, 6, 7, 6, 5, 9, 1, 9, 6, 7, 6, 5, 8, 0, 9, 6, 4, 8, 6, 5, 3, 8, 2, 1, 9, 6, 0, 3, 8, 5, 0, 1, 7, 2],
}
const ROUSSEAU_SORT = { twinkle_twinkle: 'onset', nocturne: 'onset-pitch' }

/** Apply the shipped human fingering to notes loaded from the matching clip. */
export function applyRousseauFingering(song, notes) {
  const labels = ROUSSEAU_FINGERING[song]
  if (!labels || labels.length !== notes.length) return false
  const order = [...notes].sort((a, b) => a.on - b.on || (ROUSSEAU_SORT[song] === 'onset-pitch' ? a.pitch - b.pitch : 0))
  order.forEach((n, i) => { n.hand = labels[i] < 5 ? 'R' : 'L'; n.finger = (labels[i] % 5) + 1 })
  return true
}

/**
 * Hands from the tracks when a file has exactly two (the higher one is the
 * right hand), as the #029 page does. Returns true if it assigned them.
 */
export function handsFromTracks(notes) {
  const ids = [...new Set(notes.map(n => n.track))]
  if (ids.length !== 2) return false
  const mean = ti => { const ns = notes.filter(n => n.track === ti); return ns.reduce((s, n) => s + n.pitch, 0) / ns.length }
  const rt = mean(ids[0]) > mean(ids[1]) ? ids[0] : ids[1]
  for (const n of notes) n.hand = n.track === rt ? 'R' : 'L'
  return true
}

/**
 * Fingering options for the Shadow Hand instead of a pianist's: its span
 * table, measured with this file's IK (white keys, both hands, a fingertip
 * within 8 mm of each key), and no thumb
 * passing under — its thumb cannot reach below the fingers.
 */
export const SHADOW_FINGERING = {
  spanTable: {
    '1-2': [1, 1, 2, 3, 4, 5],
    '1-3': [3, 3, 4, 5, 6, 7],
    '1-4': [3, 4, 5, 6, 7, 8.5],
    '1-5': [5, 5, 7, 8, 9, 10.5],
    '2-3': [1, 1, 1, 2, 2, 2],
    '2-4': [3, 3, 3, 4, 4, 4],
    '2-5': [3, 3, 4, 5, 5, 5],
    '3-4': [1, 1, 1, 2, 2, 2],
    '3-5': [1, 2, 2, 3, 3, 4],
    '4-5': [1, 1, 1, 2, 2, 2],
  },
  weights: { cross: [0, 0, 8, 8, 8, 8], impractical: 10 },
}

/** Minimal .npy reader (float32, C order, 2-D), as the demo ships its actions. */
export function readNpy(buffer) {
  const u8 = new Uint8Array(buffer)
  const hl = u8[8] | (u8[9] << 8)
  const header = new TextDecoder().decode(u8.subarray(10, 10 + hl))
  if (!/'descr': '<f4'/.test(header) || /'fortran_order': True/.test(header)) throw new Error('unsupported npy')
  const shape = header.match(/'shape': \((\d+), (\d+)\)/).slice(1).map(Number)
  const data = new Float32Array(u8.slice(10 + hl).buffer)
  return { shape, data }
}

// ── Scoring ──────────────────────────────────────────────────────────────
/** Shift a note list so its first onset is at 0 (RoboPianist trims leading silence). */
export function trimSilence(notes) {
  const t0 = Math.min(...notes.map(n => n.on))
  for (const n of notes) { n.on -= t0; n.off -= t0 }
  return notes
}

/** RoboPianist's goal: for each 50 ms frame, the set of keys (0..87) that should be down. */
export function goalFrames(notes, dt = CONTROL_DT) {
  const total = Math.max(...notes.map(n => n.off))
  const T = Math.floor(total / dt + 1)
  const active = Array.from({ length: T }, () => new Set())
  const onset = Array.from({ length: T }, () => new Set())
  for (const n of notes) {
    const k = n.pitch - 21
    if (k < 0 || k > 87) continue
    const s = Math.floor(n.on / dt + 1e-9)
    const e = Math.max(s + 1, Math.ceil(n.off / dt - 1e-9))
    for (let t = s; t < e && t < T; t++) active[t].add(k)
    if (s < T) onset[s].add(k)
  }
  return active.map((keys, t) => {
    const out = new Set()
    for (const k of keys) if (!(t > 0 && active[t - 1].has(k) && onset[t].has(k))) out.add(k)
    return out
  })
}

/** Frame-averaged precision / recall / F1 (sklearn binary, zero_division = 1). */
export function scoreFrames(goal, pressed) {
  const n = Math.min(goal.length, pressed.length)
  let P = 0, R = 0, F = 0
  for (let t = 0; t < n; t++) {
    const g = goal[t], p = pressed[t]
    let tp = 0
    for (const k of p) if (g.has(k)) tp++
    const prec = p.size ? tp / p.size : 1
    const rec = g.size ? tp / g.size : 1
    const f1 = !p.size && !g.size ? 1 : !p.size || !g.size ? 0 : prec + rec ? (2 * prec * rec) / (prec + rec) : 0
    P += prec; R += rec; F += f1
  }
  return { precision: P / n, recall: R / n, f1: F / n, frames: n }
}

/**
 * Notes as the metric sees them: one note per run of goal frames, timed to the
 * middle of the frame edges so a press lands with 25 ms to spare either side.
 * A re-struck key therefore gets the one-frame gap the score demands.
 */
export function framedNotes(notes, dt = CONTROL_DT) {
  const goal = goalFrames(notes, dt)
  const byKey = new Map()
  for (const n of notes) {
    const k = n.pitch - 21
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(n)
  }
  const out = []
  for (const [k, list] of byKey) {
    list.sort((a, b) => a.on - b.on)
    let t = 0
    while (t < goal.length) {
      if (!goal[t].has(k)) { t++; continue }
      let e = t
      while (e < goal.length && goal[e].has(k)) e++
      // the source note this run belongs to: the last one starting by the run's end
      let src = list[0]
      for (const n of list) if (Math.floor(n.on / dt + 1e-9) <= e - 1) src = n
      out.push({ ...src, pitch: k + 21, on: (t + 0.5) * dt, off: (e + 0.5) * dt, src })
      t = e
    }
  }
  return out.sort((a, b) => a.on - b.on || a.pitch - b.pitch)
}

/**
 * Let go of held keys the hand cannot keep while it plays on: when a note
 * starts and a key the same hand is still holding lies more than maxSpan cm
 * away, that key is released just before. Real pianists catch such notes with
 * the pedal; the RL agent simply lets them go too.
 */
export function releaseOutOfReach(notes, maxSpan = 16, gap = 0.03) {
  for (const hand of ['L', 'R']) {
    const own = notes.filter(n => n.hand === hand).sort((a, b) => a.on - b.on)
    for (let i = 0; i < own.length; i++) {
      const n = own[i]
      for (let j = 0; j < i; j++) {
        const h = own[j]
        if (h.off <= n.on || h.on >= n.on) continue
        if (Math.abs(keyX(h.pitch) - keyX(n.pitch)) > maxSpan || h.finger === n.finger) h.off = Math.max(h.on + 0.04, n.on - gap)
      }
    }
  }
  return notes
}

// ── The world ────────────────────────────────────────────────────────────
const FINGERS = ['th', 'ff', 'mf', 'rf', 'lf'] // finger 1..5
const KEYDIP = 0.0085 // motion.js KEY.DIP in metres
const HANDS = { R: 'rh', L: 'lh' }
const KEY_THRESHOLD = 0.00872665 // 0.5°, RoboPianist's activation threshold

/**
 * Load the scene into a fresh MuJoCo instance.
 * files: Map/array of [name, Uint8Array] for SCENE_FILES (+ any extras).
 */
export function createWorld(mujoco, files) {
  if (!mujoco.FS.analyzePath('/working').exists) {
    mujoco.FS.mkdir('/working')
    mujoco.FS.mount(mujoco.MEMFS, { root: '.' }, '/working')
  }
  for (const [name, bytes] of files) mujoco.FS.writeFile('/working/' + name, bytes)
  const model = mujoco.Model.load_from_xml('/working/scene.xml')
  const state = new mujoco.State(model)
  const sim = new mujoco.Simulation(model, state)
  return new World(mujoco, model, state, sim)
}

export class World {
  constructor(mujoco, model, state, sim) {
    Object.assign(this, { mujoco, model, state, sim })
    const names = model.names()
    const name = (adr, i) => {
      let s = ''
      for (let k = adr[i]; names[k]; k++) s += String.fromCharCode(names[k])
      return s
    }
    this.name = name
    const index = (count, adr) => {
      const m = new Map()
      for (let i = 0; i < count; i++) m.set(name(adr, i), i)
      return m
    }
    this.jointIds = index(model.njnt(), model.name_jntadr())
    this.actIds = index(model.nu(), model.name_actuatoradr())
    this.siteIds = index(model.nsite(), model.name_siteadr())
    this.bodyIds = index(model.nbody(), model.name_bodyadr())
    this.timestep = model.getOptions().timestep
    this.substeps = Math.round(CONTROL_DT / this.timestep)

    // keys: joint, travel, body, world position of the playing surface
    sim.resetData()
    sim.forward()
    const jr = model.jnt_range(), qa = model.jnt_qposadr(), gs = model.geom_size(), gx = sim.geom_xpos()
    this.keys = []
    for (let k = 0; k < 88; k++) {
      const black = [1, 4, 6, 9, 11].includes(k % 12) // A0 = key 0
      const kind = black ? 'black' : 'white'
      const j = this.jointIds.get(`piano/${kind}_joint_${k}`)
      const g = this.geomId(`piano/${kind}_key_geom_${k}`)
      this.keys.push({
        k, black, joint: j, qpos: qa[j], max: jr[2 * j + 1],
        body: this.bodyIds.get(`piano/${kind}_key_${k}`), geom: g,
        x: gx[3 * g], y: gx[3 * g + 1], top: gx[3 * g + 2] + gs[3 * g + 2],
        front: gx[3 * g] + gs[3 * g], halfLength: gs[3 * g],
      })
    }
    const w = this.keys.find(k => !k.black), b = this.keys.find(k => k.black)
    this.whiteTop = w.top
    this.blackTop = b.top
    this.whiteFront = w.front

    // hands: the 19 actuated variables each, and the joints they drive
    this.hands = {}
    const cr = model.actuator_ctrlrange()
    for (const [H, h] of Object.entries(HANDS)) {
      const p = `${h}_shadow_hand/`
      const vars = []
      const add = (act, joints) => {
        const a = this.actIds.get(p + act)
        vars.push({ act: a, q: joints.map(j => qa[this.jointIds.get(p + j)]), lo: cr[2 * a], hi: cr[2 * a + 1] })
      }
      add('forearm_tx', ['forearm_tx'])
      add('forearm_ty', ['forearm_ty'])
      add(`${h}_A_WRJ2`, [`${h}_WRJ2`])
      add(`${h}_A_WRJ1`, [`${h}_WRJ1`])
      add(`${h}_A_THJ4`, [`${h}_THJ4`])
      add(`${h}_A_THJ2`, [`${h}_THJ2`])
      add(`${h}_A_THJ1`, [`${h}_THJ1`])
      for (const f of ['FF', 'MF', 'RF', 'LF']) {
        add(`${h}_A_${f}J4`, [`${h}_${f}J4`])
        add(`${h}_A_${f}J3`, [`${h}_${f}J3`])
        add(`${h}_A_${f}J0`, [`${h}_${f}J2`, `${h}_${f}J1`]) // tendon = J1 + J2
      }
      // each servo is close to first order: τ = damping / (kp · joints driven)
      const gp = model.actuator_gainprm(), NG = gp.length / model.nu(), damp = model.dof_damping()
      for (const v of vars) {
        const dofs = v.q.map(q => { for (let j = 0; j < model.njnt(); j++) if (qa[j] === q) return model.jnt_dofadr()[j] })
        v.tau = damp[dofs[0]] / (gp[NG * v.act] * v.q.length)
      }
      const tips = FINGERS.map(f => this.siteIds.get(`${p}${f}distal_site`))
      // the last knuckle (DIP; the thumb's IP), to keep the end joint above the tip
      const dips = ['TH', 'FF', 'MF', 'RF', 'LF'].map(f => this.siteIds.get(`${p}${h}_${f}J1_site`))
      this.hands[H] = { prefix: p, vars, tips, dips }
    }
  }

  geomId(n) {
    if (!this._geomIds) this._geomIds = new Map(Array.from({ length: this.model.ngeom() }, (_, i) => [this.name(this.model.name_geomadr(), i), i]))
    return this._geomIds.get(n)
  }

  /**
   * A second MuJoCo data for kinematics-only work (the planner's IK). One per
   * world: this binding does not give a deleted Simulation's memory back.
   */
  scratch() {
    if (!this._scratch) {
      this._scratchState = new this.mujoco.State(this.model)
      this._scratch = new this.mujoco.Simulation(this.model, this._scratchState)
    }
    return this._scratch
  }

  reset() {
    this.sim.resetData()
    this.sim.forward()
    this.time = 0
  }

  /** Keys counted as pressed (within 0.5° of the bottom), as indices 0..87. */
  activation(q = this.sim.qpos()) {
    const out = new Set()
    for (const key of this.keys) {
      const v = Math.min(Math.max(q[key.qpos], 0), key.max)
      if (Math.abs(v - key.max) <= KEY_THRESHOLD) out.add(key.k)
    }
    return out
  }

  /** Normalised key depth 0..1 (for drawing). */
  depth(k, q = this.sim.qpos()) {
    const key = this.keys[k]
    return Math.min(Math.max(q[key.qpos] / key.max, 0), 1)
  }
}

// ── Controllers ──────────────────────────────────────────────────────────
/** The recorded RL policy: one 38-wide action per 50 ms frame, held for 10 physics steps. */
export class ReplayController {
  constructor(world, actions) {
    this.world = world
    this.actions = actions
    this.frames = actions.shape[0]
    this.name = 'RoboPianist RL policy (recorded actions)'
  }
  get duration() { return this.frames * CONTROL_DT }
  /** Write the controls for physics time t (s). */
  apply(t) {
    const f = Math.min(this.frames - 1, Math.floor(t / CONTROL_DT + 1e-9))
    const ctrl = this.world.sim.ctrl(), [, w] = this.actions.shape
    for (let i = 0; i < w; i++) ctrl[i] = this.actions.data[f * w + i]
  }
}

// IK tuning, metres and radians. Found with robopianist/eval.js --tune.
export const PLANNER_DEFAULTS = {
  lead: 0.04,         // look this far ahead (s)
  feedforward: 1,     // add τ·q̇ to every servo target (the servos are first order)
  press: 0.016,       // drive a pressing fingertip this far below the key top
  pad: 0.006,         // fingertip site above the skin it touches
  hover: 0.008,       // free fingertips float this high over the white keys
  iters: 3,           // DLS iterations per control update
  rate: 2,            // physics steps per control update (2 → 100 Hz)
  damping: 2e-5,
  wPress: 1, wFree: 0.15, wThumbFree: 0.05,
  wDip: 0.3, dipBack: -0.012, dipBackThumb: 0.015, dipUp: 0.015,
  approach: 0.2, travel: 0.01, // fingers set off for their next key this early (s, s/cm)
  aim: 0.008,         // only push down once the fingertip is this close to its key (m)
  minSeparation: 0,   // keep forearm centres this far apart (m; they collide at ~0.147). Off: it cost F1
  aimDepth: 0.03,     // … and this close in depth
  lift: 0.012,        // a finger still on its way to its key stays this high above it
}

/**
 * Our planner: #029 fingering + motion, fingertip IK, servo targets.
 * notes: [{ pitch, on, off, hand: 'L'|'R', finger: 1..5 }] in seconds.
 */
export class PlannerController {
  constructor(world, notes, options = {}) {
    this.world = world
    this.opts = { ...PLANNER_DEFAULTS, ...options }
    this.notes = notes
    this.motion = buildMotion(notes, { approach: this.opts.approach, travel: this.opts.travel, glide: true })
    this.duration = Math.max(...notes.map(n => n.off)) + 0.3
    this.name = 'Our planner (#029 fingering + IK)'
    this.scratch = world.scratch()
    this.scratch.resetData()
    this.scratch.forward()
    // solution vectors, warm-started from a relaxed playing posture
    this.q = {}
    for (const H of ['L', 'R']) {
      const vars = world.hands[H].vars
      const q = new Float64Array(vars.length)
      this.q[H] = q
      this.rest(H, q)
    }
    this.lastT = -1
    // map from our keyboard frame (cm, 0 = middle) to the world's y
    this.yAt = xcm => xcm / 100 // both are 2.35 cm white keys centred on the middle
    this.targets = { L: [], R: [] }
  }

  dispose() { this.scratch = null }

  rest(H, q) {
    const vars = this.world.hands[H].vars
    vars.forEach((v, i) => { q[i] = Math.min(v.hi, Math.max(v.lo, 0)) })
    q[0] = H === 'R' ? 0.0 : 0.0
    q[3] = 0.0
    for (let f = 0; f < 4; f++) { q[7 + 3 * f + 1] = 0.6; q[7 + 3 * f + 2] = 1.0 }
    q[4] = 0.9; q[5] = 0.3; q[6] = 0.3
  }

  /** Fingertip targets (world) and weights for both hands at time t. */
  targetsAt(t) {
    const W = this.world, o = this.opts
    const pose = this.motion.poseAt(t)
    const sx = W.sim.site_xpos()
    const out = {}
    for (const H of ['L', 'R']) {
      out[H] = pose[H].fingers.map((p, i) => {
        const f = i + 1
        let y = this.yAt(p.x)
        if (p.pitch != null) y = W.keys[p.pitch - 21].y
        // closed loop: a finger that has not arrived over its key hovers instead
        // of pressing (pressing on the way drags it and plays the neighbours)
        let press = p.press || 0
        const tip = W.hands[H].tips[i]
        const x = W.whiteFront + p.z / 100
        if (press && (Math.abs(sx[3 * tip + 1] - y) > o.aim || Math.abs(sx[3 * tip] - x) > o.aimDepth)) press = 0
        let z = W.whiteTop + p.y / 100 + o.pad - (press ? o.press * press : 0) + (p.press ? 0 : o.hover - 0.012)
        if (p.press && !press) z = W.keys[p.pitch - 21].top + o.pad + o.lift
        const w = p.press ? o.wPress : f === 1 ? o.wThumbFree : o.wFree
        return { x, y, z, w, press, want: p.press || 0 }
      })
    }
    return out
  }

  /** Run the IK for time t and write the servo targets. */
  apply(t, stepIndex = 0) {
    if (stepIndex % this.opts.rate !== 0 && this.lastT >= 0) return
    this.lastT = t
    const tg = this.targetsAt(t + this.opts.lead)
    this.targets = tg
    const prev = { L: this.q.L.slice(), R: this.q.R.slice() }
    for (let it = 0; it < this.opts.iters; it++) this.solve(tg)
    const ctrl = this.world.sim.ctrl()
    const dt = this.prevT != null ? t - this.prevT : 0
    this.prevT = t
    for (const H of ['L', 'R']) {
      const vars = this.world.hands[H].vars, q = this.q[H]
      vars.forEach((v, i) => {
        const vel = dt > 0 ? (q[i] - prev[H][i]) / dt : 0
        ctrl[v.act] = Math.min(v.hi, Math.max(v.lo, q[i] + this.opts.feedforward * v.tau * vel))
      })
    }
  }

  writeScratch() {
    const qp = this.scratch.qpos()
    for (const H of ['L', 'R']) {
      const vars = this.world.hands[H].vars, q = this.q[H]
      vars.forEach((v, i) => {
        if (v.q.length === 1) qp[v.q[0]] = q[i]
        else { qp[v.q[0]] = q[i] / 2; qp[v.q[1]] = q[i] / 2 }
      })
    }
  }

  /** Fingertips (rows 0..14) then last knuckles (rows 15..29) of the scratch model. */
  tips(H, out) {
    const sx = this.scratch.site_xpos(), { tips, dips } = this.world.hands[H]
    for (let f = 0; f < 5; f++) for (let d = 0; d < 3; d++) {
      out[3 * f + d] = sx[3 * tips[f] + d]
      if (out.length > 15) out[15 + 3 * f + d] = sx[3 * dips[f] + d]
    }
    return out
  }

  /** One damped-least-squares step for both hands (Jacobian by grouped finite differences). */
  solve(tg) {
    const eps = 1e-4, o = this.opts
    const groups = [[0], [1], [2], [3], 'k0', 'k1', 'k2'] // k: joint slot within each finger
    const n = 19
    this.writeScratch()
    this.scratch.kinematics()
    const ROWS = 30
    const base = { L: this.tips('L', new Float64Array(ROWS)), R: this.tips('R', new Float64Array(ROWS)) }
    const J = { L: new Float64Array(ROWS * n), R: new Float64Array(ROWS * n) }
    const tmp = new Float64Array(ROWS)
    for (const g of groups) {
      const cols = typeof g === 'string' ? fingerSlots(+g[1]) : g
      for (const H of ['L', 'R']) for (const c of cols) this.q[H][c] += eps
      this.writeScratch()
      this.scratch.kinematics()
      for (const H of ['L', 'R']) {
        this.tips(H, tmp)
        for (const c of cols) {
          this.q[H][c] -= eps
          const finger = c < 4 ? -1 : c < 7 ? 0 : 1 + Math.floor((c - 7) / 3)
          for (let r = 0; r < ROWS; r++) {
            if (finger >= 0 && Math.floor((r % 15) / 3) !== finger) continue
            J[H][r * n + c] = (tmp[r] - base[H][r]) / eps
          }
        }
      }
    }
    for (const H of ['L', 'R']) {
      const q = this.q[H], vars = this.world.hands[H].vars
      // normal equations: (JᵀWJ + D) dq = JᵀW e + D' (rest − q)
      const A = new Float64Array(n * n), b = new Float64Array(n)
      for (let row = 0; row < 10; row++) {
        const f = row % 5, t = tg[H][f], knuckle = row >= 5
        // the knuckle should sit above and a little behind the tip (a curved,
        // not clawed, finger striking with its pad)
        const g = knuckle ? [t.x + (f === 0 ? o.dipBackThumb : o.dipBack), t.y, t.z + o.dipUp] : [t.x, t.y, t.z]
        const r0 = 3 * row
        const e = [g[0] - base[H][r0], g[1] - base[H][r0 + 1], g[2] - base[H][r0 + 2]]
        // pressing: the key's height matters most, but lateral misses press the neighbour
        const ww = knuckle ? t.w * o.wDip : t.w
        const wd = [ww, ww * 1.5, ww]
        for (let d = 0; d < 3; d++) {
          const r = r0 + d, w = wd[d]
          for (let i = 0; i < n; i++) {
            const ji = J[H][r * n + i]
            if (!ji) continue
            b[i] += w * ji * e[d]
            for (let j = 0; j < n; j++) A[i * n + j] += w * ji * J[H][r * n + j]
          }
        }
      }
      const rest = new Float64Array(n)
      this.rest(H, rest)
      for (let i = 0; i < n; i++) {
        const reg = i === 0 ? 1e-7 : i === 1 ? 1e-4 : i < 4 ? 3e-5 : 4e-6
        A[i * n + i] += o.damping + reg
        b[i] += reg * (rest[i] - q[i]) * 0.2
      }
      // active set: a joint sitting on its limit that the step would push
      // further out is frozen, and the rest re-solved without it
      let dq = solveLinear(A, b, n)
      for (let pass = 0; pass < 3; pass++) {
        let frozen = 0
        for (let i = 0; i < n; i++) {
          const v = vars[i]
          const out = (q[i] <= v.lo + 1e-6 && dq[i] < 0) || (q[i] >= v.hi - 1e-6 && dq[i] > 0)
          if (!out || A[i * n + i] === 1) continue
          for (let j = 0; j < n; j++) { A[i * n + j] = 0; A[j * n + i] = 0 }
          A[i * n + i] = 1; b[i] = 0
          frozen++
        }
        if (!frozen) break
        dq = solveLinear(A, b, n)
      }
      for (let i = 0; i < n; i++) {
        const v = vars[i]
        q[i] = Math.min(v.hi, Math.max(v.lo, q[i] + dq[i]))
      }
    }
    // The forearms are wide: they collide when their centres come closer than
    // ~14.7 cm. Keep the plan apart, half the overlap each.
    const over = this.opts.minSeparation - this.separation()
    if (over > 0) {
      this.q.R[0] += over / 2
      this.q.L[0] -= over / 2
    }
  }

  /** Distance between the forearm centres (world y) implied by the plan. */
  separation() {
    // each forearm slides along world y with its tx: y = y0 + tx (both hands)
    const W = this.world
    if (W._forearmY0 == null) {
      W.sim.forward()
      const xp = W.sim.xpos(), q = W.sim.qpos()
      const y = H => xp[3 * W.bodyIds.get(`${HANDS[H]}_shadow_hand/${HANDS[H]}_forearm`) + 1] - q[W.hands[H].vars[0].q[0]]
      W._forearmY0 = { L: y('L'), R: y('R') }
    }
    return (W._forearmY0.R + this.q.R[0]) - (W._forearmY0.L + this.q.L[0])
  }
}

function fingerSlots(k) {
  const out = [4 + k]
  for (let f = 0; f < 4; f++) out.push(7 + 3 * f + k)
  return out
}

function solveLinear(A, b, n) {
  // Gaussian elimination with partial pivoting (19×19)
  const M = A.slice(), x = b.slice()
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r * n + c]) > Math.abs(M[p * n + c])) p = r
    if (p !== c) {
      for (let j = 0; j < n; j++) { const t = M[c * n + j]; M[c * n + j] = M[p * n + j]; M[p * n + j] = t }
      const t = x[c]; x[c] = x[p]; x[p] = t
    }
    const d = M[c * n + c] || 1e-12
    for (let r = c + 1; r < n; r++) {
      const m = M[r * n + c] / d
      if (!m) continue
      for (let j = c; j < n; j++) M[r * n + j] -= m * M[c * n + j]
      x[r] -= m * x[c]
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = x[r]
    for (let j = r + 1; j < n; j++) s -= M[r * n + j] * x[j]
    x[r] = s / (M[r * n + r] || 1e-12)
  }
  return x
}

/**
 * Run a controller headless for its whole duration (or `frames` control
 * frames) and return the keys pressed after every 50 ms frame.
 */
export function rollout(world, controller, { frames, onFrame } = {}) {
  world.reset()
  const total = frames ?? Math.ceil(controller.duration / CONTROL_DT)
  const pressed = []
  let step = 0
  for (let f = 0; f < total; f++) {
    for (let s = 0; s < world.substeps; s++, step++) {
      controller.apply(step * world.timestep, step)
      world.sim.step()
    }
    const act = world.activation()
    pressed.push(act)
    onFrame?.(f, act)
  }
  return pressed
}
