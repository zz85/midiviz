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
  expect(maxIn(soft, 1, 4.6)).toBeLessThan(0.05)
})

test('a loud chord is prepared from above, in proportion to its velocity', () => {
  const peak = v => maxIn(planStrokes(chords(4, 0.8, v), { velRange: [0.4, 0.95] }), 1.3, 1.78)
  const ps = [0.5, 0.65, 0.8, 1].map(peak)
  for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1])
  expect(ps[3]).toBeGreaterThan(STROKE.PREP * 0.9)
  expect(ps[0]).toBeLessThan(1.5)
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
  expect(mid).toBeGreaterThan(2)
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
    expect(top).toBeGreaterThan(5)
    expect(p.at(r + 5.5)[0]).toBeGreaterThan(0.95 * top)
    expect(p.at(r + 60)[0]).toBeGreaterThan(0.95 * top)
  }
})
