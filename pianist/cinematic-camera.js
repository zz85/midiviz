// Physical camera compositions and music-aware edit helpers for the pianist.
//
// Midiviz's director keeps its existing catalog and screen-time balancing. This
// module supplies the parts worth carrying from The Mechanical Pianist:
// onset/tempo-aware cuts, bespoke moves with a 36 mm physical lens, four shots
// inside an open upright, and a smooth focus path along the melody's hammers.

import * as THREE from 'three'

const clamp = THREE.MathUtils.clamp
const lerp = THREE.MathUtils.lerp
const KEY_Y = 73
const cmY = metres => KEY_Y + metres * 100
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const ease = u => { const c = clamp(u, 0, 1); return 0.5 * c + 0.5 * c * c * (3 - 2 * c) }
const noteTime = n => n.start ?? n.on ?? n.time ?? 0
const noteEnd = n => n.end ?? n.off ?? (noteTime(n) + (n.duration ?? 0))
const noteMidi = n => n.midi ?? n.pitch ?? 60
const noteVelocity = n => n.velocity ?? 0.7
const noteHand = n => n.hand === 'L' ? 'L' : 'R'
const hash = (k, seed = 0) => { const x = Math.sin(k * 127.1 + seed * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x) }

/** Beat times from a tempo map. Times are seconds; tempo entries accept time or t. */
export function beatTimes(tempos, duration) {
  const map = (tempos?.length ? tempos : [{ time: 0, bpm: 120 }])
    .map(x => ({ time: x.time ?? x.t ?? 0, bpm: x.bpm || 120 }))
    .sort((a, b) => a.time - b.time)
  const out = []
  let t = 0, i = 0
  while (t <= duration + 1 && out.length < 20000) {
    while (i + 1 < map.length && map[i + 1].time <= t + 1e-6) i++
    out.push(t)
    t += 60 / Math.max(20, map[i].bpm)
  }
  return out
}

/**
 * Cuts chosen across the whole piece. Each onset is scored for attack,
 * preceding breath, bar/half-bar position and a new bass entry. Dynamic
 * programming chooses a complete edit instead of taking the nearest phrase.
 */
export function planMusicalCuts({ duration, notes = [], tempos = [], energyAt = () => 0.3 }, { pace = 1 } = {}) {
  const D = Math.max(0, duration || 0)
  const sorted = notes.slice().sort((a, b) => noteTime(a) - noteTime(b) || noteMidi(a) - noteMidi(b))
  if (!sorted.length || D < 4) return [0, D]
  const onsets = []
  let lastEnd = -1
  for (const n of sorted) {
    const t = noteTime(n), prev = onsets[onsets.length - 1]
    if (prev && t - prev.t < 0.04) {
      prev.velocity = Math.max(prev.velocity, noteVelocity(n))
      prev.bass ||= noteHand(n) === 'L' && noteMidi(n) < 55
      prev.count++
    } else onsets.push({ t, velocity: noteVelocity(n), bass: noteHand(n) === 'L' && noteMidi(n) < 55, gap: t - lastEnd, count: 1 })
    lastEnd = Math.max(lastEnd, noteEnd(n))
  }
  for (const onset of onsets) onset.dense = onsets.filter(p => Math.abs(p.t - onset.t) < 0.5).length
  const beats = beatTimes(tempos, D)
  const beatQuality = t => {
    let best = Infinity, index = 0
    for (let i = 0; i < beats.length && beats[i] <= t + 1; i++) {
      const d = Math.abs(beats[i] - t)
      if (d < best) { best = d; index = i }
    }
    return best < 0.07 ? (index % 4 === 0 ? 1 : index % 2 === 0 ? 0.5 : 0.15) : 0
  }
  const candidates = [{ t: 0, quality: 0 }]
  for (const onset of onsets) {
    if (onset.t < 1.5 || onset.t > D - 2) continue
    const quality = 0.8 * onset.velocity + 1.2 * clamp(onset.gap / 0.4, 0, 1) + beatQuality(onset.t)
      + (onset.bass ? 0.5 : 0) - Math.max(0, onset.dense - 4) * 0.3
    candidates.push({ t: Math.max(0, onset.t - 0.05), quality })
  }
  candidates.push({ t: D, quality: 0 })
  const n = candidates.length, best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1)
  best[0] = 0
  for (let j = 1; j < n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const length = candidates[j].t - candidates[i].t
      const minLength = 2.2 / Math.sqrt(Math.max(0.25, pace))
      const maxLength = (j === n - 1 ? 30 : 12) / Math.sqrt(Math.max(0.25, pace))
      if (length < minLength) continue
      if (length > maxLength) break
      const t = (candidates[i].t + candidates[j].t) / 2
      const target = lerp(7.5, 3.8, clamp(energyAt(t), 0, 1)) / Math.sqrt(Math.max(0.25, pace))
      const cost = best[i] + (j === n - 1 ? 0.3 * Math.max(0, length - 9) : ((length - target) / 2) ** 2 - candidates[j].quality)
      if (cost < best[j]) { best[j] = cost; from[j] = i }
    }
  }
  if (!Number.isFinite(best[n - 1])) {
    const every = 7 / Math.sqrt(Math.max(0.25, pace)), out = [0]
    for (let t = every; t < D; t += every) out.push(t)
    out.push(D)
    return out
  }
  const cuts = []
  for (let j = n - 1; j > 0; j = from[j]) cuts.push(candidates[j].t)
  cuts.push(0); cuts.reverse()
  return cuts
}

// Mechanical Pianist's four action sections, converted from metres to cm.
const HAMMER_X = []
{
  let x = -57
  const sections = [[20, 1.32], [24, 1.24], [28, 1.18], [16, 1.15]], gaps = [4.5, 4, 3.5]
  sections.forEach(([count, pitch], section) => {
    for (let i = 0; i < count; i++) HAMMER_X.push(x + pitch * (i + 0.5))
    x += count * pitch
    if (section < gaps.length) x += gaps[section]
  })
}
export const hammerX = midi => HAMMER_X[clamp(Math.round(noteMidi({ midi })) - 21, 0, 87)]

/** A continuous Hermite focus pull to the top note of each chord. */
export class MelodyFocus {
  constructor(notes = []) {
    this.times = []; this.targets = []; this.from = []; this.speed = []; this.duration = []
    const sorted = notes.slice().sort((a, b) => noteTime(a) - noteTime(b) || noteMidi(b) - noteMidi(a))
    for (let i = 0; i < sorted.length;) {
      let j = i, top = sorted[i]
      while (j < sorted.length && noteTime(sorted[j]) - noteTime(sorted[i]) < 0.04) { if (noteMidi(sorted[j]) > noteMidi(top)) top = sorted[j]; j++ }
      const x = hammerX(noteMidi(top))
      if (!this.targets.length || Math.abs(x - this.targets.at(-1)) > 1e-6) { this.times.push(noteTime(sorted[i]) - 0.08); this.targets.push(x) }
      i = j
    }
    let position = this.targets[0] ?? 0, speed = 0
    for (let i = 0; i < this.times.length; i++) {
      if (i) [position, speed] = this.pull(i - 1, this.times[i])
      this.from.push(position); this.speed.push(speed); this.duration.push(clamp(0.2 + 0.018 * Math.abs(this.targets[i] - position), 0.2, 0.8))
    }
  }
  pull(i, t) {
    const T = this.duration[i], u = (t - this.times[i]) / T
    if (u >= 1) return [this.targets[i], 0]
    if (u <= 0) return [this.from[i], this.speed[i]]
    const p0 = this.from[i], m0 = this.speed[i] * T, p1 = this.targets[i], u2 = u * u, u3 = u2 * u
    const p = (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1
    const dp = (6 * u2 - 6 * u) * p0 + (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) * p1
    return [p, dp / T]
  }
  at(t) {
    if (!this.times.length) return 0
    if (t <= this.times[0]) return this.targets[0]
    let lo = 0, hi = this.times.length - 1
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.times[m] <= t) lo = m; else hi = m - 1 }
    return this.pull(lo, t)[0]
  }
}

const labels = {
  opening: 'Along the keys, into the light', establishing: 'Establishing crane', pullback: 'Pull-back reveal', rise: 'Crane up', silhouette: 'Into the light',
  overhead: 'Overhead, turning', bassProfile: 'Down the keys from the bass', trebleProfile: 'Down the keys from the treble', dutch: 'Dutch angle', handheld: 'Handheld', orbit: 'Orbit',
  shoulder: 'Over the shoulder', lowFront: 'Low, from the key slip', keySlider: 'Slider along the keys', macro: 'Macro on the fingers', dorsal: 'The back of the hand', key: 'Waiting on a key', desk: 'From the music desk', push: 'Slow push-in',
  insideHammers: 'The hammers', insideAlong: 'Along the hammer line', insideThrough: 'Through the action', insidePlate: 'The plate and the pins',
}
export const compositionLabel = id => labels[id] || id

const variants = {
  establish: ['establishing'], high: ['rise', 'silhouette'], above: ['overhead'], bassKeys: ['bassProfile'], keys: ['trebleProfile', 'keySlider'], handsRight: ['dutch'],
  lowRight: ['handheld', 'orbit'], shoulder: ['shoulder'], keysFrontClose: ['lowFront'], hands: ['macro', 'dorsal'], treble: ['macro'], keysTop: ['key'], overKeys: ['desk'], bust: ['push'],
}

function insideMoments(shots, notes, seed) {
  const wanted = shots.length >= 6 ? Math.max(1, Math.round(shots.length / 6.5)) : 0, scored = []
  for (let i = 2; i < shots.length - 1; i++) {
    const shot = shots[i], inShot = notes.filter(n => noteTime(n) >= shot.t0 && noteTime(n) < shot.t1)
    if (shot.t1 - shot.t0 < 3.2 || !inShot.length) continue
    const attack = inShot.filter(n => noteTime(n) - shot.t0 < 0.12)
    const held = inShot.reduce((sum, n) => sum + Math.min(1, (noteEnd(n) - noteTime(n)) / 1.2), 0) / inShot.length
    const big = clamp((attack.length - 2) / 3, 0, 1) * attack.reduce((m, n) => Math.max(m, noteVelocity(n)), 0)
    const first = Math.min(...inShot.map(noteTime)), gap = first - Math.max(-1, ...notes.filter(n => noteEnd(n) <= first).map(noteEnd))
    scored.push({ i, score: 0.35 * held + 0.35 * big + 0.35 * clamp(gap / 0.5, 0, 1) + 0.12 * hash(i, seed) })
  }
  scored.sort((a, b) => b.score - a.score || a.i - b.i)
  const out = new Set()
  for (const x of scored) {
    if (out.size >= wanted) break
    if ([...out].every(i => Math.abs(i - x.i) >= 4)) out.add(x.i)
  }
  return out
}

/** Attach deterministic bespoke compositions to an existing Midiviz shot plan. */
export function assignCinematicCompositions(shots, song, { instrument = 'grand', panelOpen = false } = {}) {
  if (!shots.length) return shots
  const notes = song?.notes || [], seed = Math.round(notes.reduce((sum, n) => sum + noteMidi(n) * 7 + noteTime(n) * 13, 17))
  const inside = instrument === 'upright' && panelOpen ? insideMoments(shots, notes, seed) : new Set()
  const insideIds = ['insideHammers', 'insideAlong', 'insideThrough', 'insidePlate']
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    shot.hand = (() => {
      const ns = notes.filter(n => noteTime(n) >= shot.t0 && noteTime(n) < shot.t1)
      const energy = { L: 0, R: 0 }
      for (const n of ns) energy[noteHand(n)] += 0.3 + noteVelocity(n)
      return energy.L > energy.R ? 'L' : 'R'
    })()
    if (i === 0) shot.composition = 'opening'
    else if (i === shots.length - 1) shot.composition = 'pullback'
    else if (inside.has(i)) shot.composition = insideIds[Math.floor(hash(i, seed + 11) * insideIds.length) % insideIds.length]
    else {
      const list = variants[shot.name]
      if (list?.length) shot.composition = list[Math.floor(hash(i, seed + 7) * list.length) % list.length]
    }
    if (shot.composition) {
      shot.compositionLabel = compositionLabel(shot.composition)
      shot.glide = 0
      const ns = notes.filter(n => noteTime(n) >= shot.t0 + 0.4 && noteTime(n) < shot.t1 - 0.2 && noteHand(n) === shot.hand)
      if (ns.length) shot.keyMidi = noteMidi(ns.reduce((best, n) => noteVelocity(n) > noteVelocity(best) ? n : best))
    }
  }
  return shots
}

function state(position, target, focalLength, fstop, focusAt = target, roll = 0) {
  const dx = target.x - position.x, dy = target.y - position.y, dz = target.z - position.z, length = Math.hypot(dx, dy, dz) || 1
  const fx = focusAt.x - position.x, fy = focusAt.y - position.y, fz = focusAt.z - position.z
  const focusDistance = Math.max(1, (fx * dx + fy * dy + fz * dz) / length)
  return { position, target, focalLength, fstop, focusDistance, roll }
}
const around = (target, azimuth, distance, height) => V(target.x + Math.sin(azimuth) * distance, height, target.z + Math.cos(azimuth) * distance)

/** Evaluate one bespoke composition in Midiviz centimetres. */
export function cinematicFrame(id, { t, shot, anchors, melody }) {
  const u = ease((t - shot.t0) / Math.max(0.001, shot.t1 - shot.t0)), side = shot.hand === 'L' ? -1 : 1
  const hand = (shot.hand === 'L' ? anchors.left : anchors.right) || anchors.hands
  const both = anchors.hands, c = hand || both, melodyX = melody?.[shot.hand]?.at(t) ?? c.x
  switch (id) {
    case 'opening': { const target = V(both.x - 3, cmY(0.03), -4); return state(around(target, 1.22, lerp(105, 84, u), lerp(cmY(0.2), cmY(0.155), u)), target, lerp(50, 60, u), 4, anchors.right || both, -0.008) }
    case 'establishing': { const position = V(both.x + lerp(16, 6, u), lerp(cmY(1.12), cmY(0.78), u), 33), target = V(both.x - 4, lerp(cmY(0.24), cmY(0.05), u), lerp(-20, -7, u)); return state(position, target, 28, 6.3, both) }
    case 'pullback': { const position = V(both.x + lerp(10, 2, u), lerp(cmY(0.42), cmY(1.2), u), lerp(24, 30, u)), target = V(both.x, lerp(cmY(0), cmY(0.1), u), lerp(-5, -16, u)); return state(position, target, lerp(42, 26, u), 6.3, both) }
    case 'rise': { const target = V(both.x, cmY(0.02), -6); return state(around(target, 1.38, 78, lerp(cmY(0.05), cmY(0.36), u)), target, 46, 5.6, hand) }
    case 'silhouette': { const target = V(both.x - 25, cmY(0.08), -8); return state(around(target, lerp(1.46, 1.4, u), 125, cmY(0.11)), target, 85, 4, hand) }
    case 'overhead': { const target = V(both.x, KEY_Y, -4), position = V(both.x + 3, lerp(cmY(0.8), cmY(0.68), u), 20); return state(position, target, 30, 7, target, lerp(-0.1, 0.1, u)) }
    case 'bassProfile': { const target = V(both.x + 5, cmY(0.02), -5), focus = hand; return state(around(target, -1.33, lerp(95, 80, u), cmY(0.17)), target, 62, 5, focus, 0.01) }
    case 'trebleProfile': { const target = V(both.x - 5, cmY(0.02), -5); return state(around(target, 1.36, lerp(85, 72, u), cmY(0.19)), target, 66, 5, hand, -0.012) }
    case 'dutch': return state(around(c, side * 1.18, lerp(62, 50, u), cmY(0.2)), c, 45, 5.6, c, -side * 0.13)
    case 'handheld': { const j = (k, a) => (Math.sin(t * 0.9 + k * 2.1 + shot.i) + 0.4 * Math.sin(t * 2.6 + k * 1.7)) * a; const position = around(c, side * 1.08, 55, cmY(0.15)).add(V(j(1, 0.6), j(2, 0.5), j(3, 0.6))); return state(position, c.clone().add(V(j(4, 0.4), j(5, 0.3), 0)), 50, 5.6, c, j(6, 0.012)) }
    case 'orbit': return state(around(c, side * lerp(1.25, 0.6, u), 45, cmY(0.13)), c, 50, 6.3, c)
    case 'shoulder': { const position = V(c.x + side * lerp(13, 10, u), lerp(cmY(0.4), cmY(0.34), u), c.z + lerp(27, 22, u)); return state(position, c, 34, 6.3, c) }
    case 'lowFront': { const position = V(c.x + side * lerp(17, 12, u), cmY(0.028), 24), target = c.clone().add(V(0, 1.5, 0)); return state(position, target, 45, 11, c) }
    case 'keySlider': { const position = V(c.x + side * lerp(36, 22, u), cmY(0.045), 17), target = c.clone().add(V(-side * 3, 1, 0)); return state(position, target, 55, 14, c) }
    case 'macro': { const target = c.clone().add(V(0, 0.8, 0)); return state(around(c, side * lerp(0.98, 0.78, u), 40, cmY(0.07)), target, 75, 16, c) }
    case 'dorsal': { const target = c.clone().add(V(0, 1, -7)), position = c.clone().add(V(side * lerp(16, 12, u), 20, lerp(12, 9, u))); return state(position, target, 62, 16, target) }
    case 'key': { const x = hammerX(shot.keyMidi ?? 60), black = [1, 3, 6, 8, 10].includes((shot.keyMidi ?? 60) % 12), target = V(x, KEY_Y + (black ? 2 : 0.8), black ? -8 : -3.5), position = V(x + side * 20, KEY_Y + 5, 22); return state(position, target, 85, 16, target) }
    case 'desk': { const position = V(c.x - side * 12, cmY(0.25 - 0.03 * u), -13), target = c.clone().add(V(0, 0, 5)); return state(position, target, 50, 14, c) }
    case 'push': return state(around(c, side * 1.3, lerp(85, 42, u), lerp(cmY(0.18), cmY(0.12), u)), c, lerp(55, 70, u), 9, c)
    case 'insideHammers': { const target = V(c.x + side * lerp(-1, 1, u), cmY(0.255) - 0.4, -30.8), position = V(target.x + side * 7, lerp(cmY(0.42), cmY(0.405), u), lerp(-10, -12, u)), focus = V(clamp(melodyX, target.x - 7.5, target.x + 7.5), cmY(0.255), -30.7); return state(position, target, 50, 5.6, focus) }
    case 'insideAlong': { const end = c.x > 0 ? -1 : 1, position = V(end * lerp(60, 55, u), lerp(cmY(0.405), cmY(0.395), u), -13), target = V(c.x, cmY(0.245), -29.5), focus = V(melodyX, cmY(0.255), -30.7); return state(position, target, 40, 4, focus) }
    case 'insideThrough': { const position = V(c.x + side * 5, lerp(cmY(0.4), cmY(0.425), u), -30.4); return state(position, c, 30, 2.8, c) }
    case 'insidePlate': { const position = V(both.x * 0.5 + side * 8, lerp(cmY(0.6), cmY(0.48), u), lerp(10, 2, u)), target = V(both.x * 0.6, lerp(cmY(0.45), cmY(0.25), u), -33); return state(position, target, 30, 5.6, target) }
    default: return null
  }
}
