// bun test pianist/test
// The wrist stroke planner (pianist/stroke.js) on made-up passages.
import { test, expect } from 'bun:test'
import { planStrokes, STROKE } from '../stroke.js'

const chords = (n, gap, v, dur = 0.25, t = 1) => Array.from({ length: n }, (_, i) => ({ on: t + i * gap, off: t + i * gap + dur, velocity: v }))
const legato = (n, ioi, v, t = 1) => Array.from({ length: n }, (_, i) => ({ on: t + i * ioi, off: t + (i + 1) * ioi + 0.01, velocity: v }))
const maxIn = (p, a, b) => { let m = -Infinity; for (let t = a; t <= b; t += 0.002) m = Math.max(m, p.at(t)[0]); return m }

test('legato and soft playing stay on the keys', () => {
  expect(maxIn(planStrokes(legato(16, 0.12, 1)), 1, 2.9)).toBe(0)
  const soft = planStrokes(chords(8, 0.5, 0.35))
  expect(maxIn(soft, 1, 4.6)).toBeLessThan(0.15)
})

test('a loud chord is prepared from above, in proportion to its velocity', () => {
  const peak = v => maxIn(planStrokes(chords(4, 0.8, v), { velRange: [0.4, 0.95] }), 1.3, 1.78)
  const ps = [0.5, 0.65, 0.8, 1].map(peak)
  for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1])
  expect(ps[3]).toBeGreaterThan(STROKE.PREP * 0.9)
  expect(ps[0]).toBeLessThan(3)
})

test('the hand meets the key on time and never lifts off a held key', () => {
  for (const notes of [chords(6, 0.6, 0.95), chords(20, 0.15, 0.9, 0.08), legato(10, 0.3, 0.9).concat(chords(3, 0.7, 1, 0.3, 5))]) {
    const p = planStrokes(notes)
    for (const n of notes) {
      expect(p.at(n.on - STROKE.CONTACT + 0.004)[0]).toBeLessThan(0.05)
      for (let t = n.on; t <= n.off; t += 0.01) expect(p.at(t)[0]).toBeLessThan(0.05)   // (within one 120 Hz sample of a release)
    }
    // still moving when it lands (a fall, not a careful placement)
    const n = notes[3], L = n.on - STROKE.CONTACT
    if (p.windows.find(w => Math.abs(w.L - L) < 1e-6)?.prep > 2) expect(p.at(L - 0.01)[0]).toBeGreaterThan(0.2)
  }
})

test('fast passages stay close to the keys', () => {
  const p = planStrokes(chords(40, 0.1, 1, 0.07))
  expect(maxIn(p, 1.5, 4.5)).toBeLessThanOrEqual(STROKE.SPEED * 0.03 + 0.01)
})

test('lift-off after a phrase and a bigger one after the last chord', () => {
  const notes = legato(8, 0.25, 0.3).concat(legato(8, 0.25, 0.3, 5))   // pp: no preparation lift
  const p = planStrokes(notes)
  const mid = maxIn(p, 3.05, 4.9), end = p.at(8.5)[0]
  expect(mid).toBeGreaterThan(0.6)   // a small lift between phrases
  expect(end).toBeGreaterThan(mid)
  expect(maxIn(planStrokes(notes, { liftOff: 0 }), 3.05, 4.9)).toBeLessThan(0.05)
  // the wrist rises before the release, the hand after it
  const r = 3.01
  expect(p.at(r - 0.02)[1]).toBeGreaterThan(0.05)
  expect(p.at(r - 0.02)[0]).toBe(0)
})

test('the settings scale each part', () => {
  const notes = chords(4, 0.8, 1)
  expect(maxIn(planStrokes(notes, { armWeight: 0, liftOff: 0 }), 1.3, 3.5)).toBeLessThan(0.05)
  expect(maxIn(planStrokes(notes, { armWeight: 2 }), 1.3, 1.78)).toBeGreaterThan(maxIn(planStrokes(notes), 1.3, 1.78) * 1.5)
  const tiltRange = o => { const p = planStrokes(notes, o); let m = 0; for (let t = 1; t < 4; t += 0.005) m = Math.max(m, Math.abs(p.at(t)[1])); return m }
  expect(tiltRange({ flex: 0 })).toBe(0)
  expect(tiltRange({ flex: 1 })).toBeGreaterThan(0.1)
})

test('the tilt stays in range and changes smoothly', () => {
  const notes = chords(30, 0.22, 1, 0.1).concat(legato(6, 0.9, 0.8, 9))
  const p = planStrokes(notes, { flex: 2, armWeight: 2 })
  let last = p.at(0)[1]
  for (let t = 0; t < 16; t += 1 / 120) {
    const [y, a] = p.at(t)
    expect(a).toBeGreaterThanOrEqual(STROKE.TILT[0] - 1e-6); expect(a).toBeLessThanOrEqual(STROKE.TILT[1] + 1e-6)
    expect(Math.abs(a - last)).toBeLessThan(0.1)   // under 12 rad/s at twice the default settings
    expect(y).toBeGreaterThanOrEqual(0)
    last = a
  }
})

test('the last note: a gentle float up, quick only after a loud short chord', () => {
  const rise = notes => { const p = planStrokes(notes, { velRange: [0.4, 0.95] }), r = Math.max(...notes.map(n => n.off)), top = p.at(r + 4)[0]; let t = r; while (p.at(t)[0] < 0.8 * top) t += 0.01; return [t - r, top] }
  const [soft, hs] = rise(legato(8, 0.4, 0.45).concat([{ on: 4.6, off: 7, velocity: 0.4 }]))
  const [bang, hb] = rise(chords(3, 0.5, 0.6).concat([{ on: 2.6, off: 2.9, velocity: 1 }]))
  expect(soft).toBeGreaterThan(1.2)
  expect(bang).toBeLessThan(0.45)
  expect(hb).toBeGreaterThan(hs)
})

test('lift height scales every lift', () => {
  const notes = chords(30, 0.12, 1, 0.06).concat(legato(4, 0.3, 0.7, 6))
  const a = planStrokes(notes), b = planStrokes(notes, { height: 2 })
  for (const t of [2, 3.03, 4.5, 8, 9]) expect(b.at(t)[0]).toBeCloseTo(2 * a.at(t)[0], 4)
  expect(maxIn(planStrokes(notes, { height: 0 }), 0, 12)).toBe(0)
})

test('the final lift-off reaches its height and holds after the song', () => {
  for (const notes of [legato(8, 0.25, 0.7), chords(4, 0.5, 1, 0.1)]) {
    const p = planStrokes(notes), r = Math.max(...notes.map(n => n.off))
    const top = maxIn(p, r, r + 5.5)
    expect(top).toBeGreaterThan(1.5)
    expect(p.at(r + 5.5)[0]).toBeGreaterThan(0.95 * top)
    expect(p.at(r + 60)[0]).toBeGreaterThan(0.95 * top)
  }
})

// passages: pitches and fingers, one hand
const seq = (ps, ioi, v, dur = 0.08, t = 1) => ps.map((p, i) => ({ pitch: p, on: t + i * ioi, off: t + i * ioi + dur, velocity: v }))
const chordSeq = (shapes, ioi, v, dur = 0.08, t = 1) => shapes.flatMap((sh, i) => sh.map(p => ({ pitch: p, on: t + i * ioi, off: t + i * ioi + dur, velocity: v })))
const wristY = (p, t) => { const [y, a] = p.at(t); return y + STROKE.WRIST_LEN * Math.sin(a) }

test('repeated notes and octaves bounce from the wrist, the wrist staying put', () => {
  for (const notes of [seq(Array(16).fill(64), 0.12, 0.8), chordSeq([[60, 72], [62, 74], [64, 76], [65, 77], [67, 79], [65, 77], [64, 76], [62, 74]], 0.15, 0.8)]) {
    const p = planStrokes(notes, { velRange: [0.4, 0.95] })
    const mid = p.windows.filter(w => isFinite(w.L) && isFinite(w.r)).slice(2, -2)
    expect(mid.every(w => w.kind === 'wrist')).toBe(true)
    let knuckle = 0, wrist = 0
    for (let t = notes[3].on; t < notes[notes.length - 4].on; t += 0.002) { knuckle = Math.max(knuckle, p.at(t)[0]); wrist = Math.max(wrist, Math.abs(wristY(p, t) - wristY(p, notes[3].on - 0.013))) }
    expect(knuckle).toBeGreaterThan(0.8)
    expect(wrist).toBeLessThan(0.6 * knuckle)
    // and still on every key in time
    for (const n of notes) expect(p.at(n.on - STROKE.CONTACT + 0.004)[0]).toBeLessThan(0.3)
  }
})

test('a leap travels in an arc; running notes stay on the keys', () => {
  const leap = planStrokes(seq([48, 50, 52, 76, 74, 72], 0.4, 0.5, 0.2), { velRange: [0.4, 0.95] })
  expect(leap.windows.find(w => w.kind === 'leap')).toBeDefined()
  expect(maxIn(leap, 2.0, 2.2)).toBeGreaterThan(2)
  const run = planStrokes(seq([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], 0.11, 0.85, 0.07), { velRange: [0.4, 0.95] })
  expect(run.windows.slice(2).filter(w => isFinite(w.L)).every(w => w.kind === 'run')).toBe(true)
  expect(maxIn(run, 1.3, 2.5)).toBeLessThan(0.5)
})

// forearm rotation: fingered notes
const fing = (ps, fs, ioi, v, dur = 0.08, t = 1) => ps.map((p, i) => ({ pitch: p, finger: fs[i], on: t + i * ioi, off: t + i * ioi + dur, velocity: v }))
const rollAt = (p, t) => p.at(t)[2]

test('the forearm rocks toward the finger about to play', () => {
  // a tremolo 1-5-1-5 (C-G) and an Alberti bass 5-1-3-1
  const trem = fing(Array.from({ length: 16 }, (_, i) => i % 2 ? 67 : 60), Array.from({ length: 16 }, (_, i) => i % 2 ? 5 : 1), 0.12, 0.7)
  const p = planStrokes(trem, { velRange: [0.4, 0.95] })
  for (const n of trem.slice(2, -2)) {
    const r = rollAt(p, n.on)
    expect(Math.sign(r)).toBe(n.finger === 5 ? 1 : -1)
    expect(Math.abs(r)).toBeGreaterThan(0.12)
  }
  const alb = fing(Array.from({ length: 16 }, (_, i) => [48, 55, 52, 55][i % 4]), Array.from({ length: 16 }, (_, i) => [5, 1, 3, 1][i % 4]), 0.15, 0.55, 0.12)
  const q = planStrokes(alb, { velRange: [0.4, 0.95] })
  expect(rollAt(q, alb[4].on)).toBeGreaterThan(0.08)
  expect(rollAt(q, alb[5].on)).toBeLessThan(-0.08)
  expect(Math.abs(rollAt(q, alb[6].on))).toBeLessThan(0.03)
})

test('chords stay nearly level; slow notes settle back; the setting scales it', () => {
  const ch = [0, 1, 2, 3].flatMap(i => [[60, 1], [64, 3], [67, 5]].map(([p, f]) => ({ pitch: p, finger: f, on: 1 + i * 0.5, off: 1.4 + i * 0.5, velocity: 0.8 })))
  const pc = planStrokes(ch)
  for (let t = 1; t < 3; t += 0.01) expect(Math.abs(rollAt(pc, t))).toBeLessThan(0.02)
  const slow = [{ pitch: 72, finger: 5, on: 1, off: 1.3, velocity: 0.7 }, { pitch: 60, finger: 1, on: 4, off: 4.3, velocity: 0.7 }]
  const ps = planStrokes(slow)
  expect(Math.abs(rollAt(ps, 1))).toBeGreaterThan(0.05)
  expect(Math.abs(rollAt(ps, 2.5))).toBeLessThan(0.005)
  expect(rollAt(ps, 4)).toBeLessThan(-0.05)
  const trem = fing([60, 67, 60, 67, 60, 67], [1, 5, 1, 5, 1, 5], 0.12, 0.7)
  expect(Math.abs(rollAt(planStrokes(trem, { rotation: 0 }), trem[3].on))).toBe(0)
  expect(Math.abs(rollAt(planStrokes(trem, { rotation: 2 }), trem[3].on))).toBeCloseTo(2 * Math.abs(rollAt(planStrokes(trem), trem[3].on)), 4)
})

test('the roll stays in range and changes smoothly', () => {
  const notes = fing(Array.from({ length: 60 }, (_, i) => i % 2 ? 72 : 60), Array.from({ length: 60 }, (_, i) => i % 2 ? 5 : 1), 0.06, 1, 0.04)
  const p = planStrokes(notes, { rotation: 2.5 })
  let last = 0
  for (let t = 0; t < 6; t += 1 / 240) {
    const r = rollAt(p, t)
    expect(Math.abs(r)).toBeLessThanOrEqual(STROKE.ROLL_MAX + 1e-6)
    expect(Math.abs(r - last)).toBeLessThan(0.06)
    last = r
  }
})
