// Mechanical Pianist-inspired camera layer: deterministic edit, physical lens,
// and upright interior-shot gating.
import { test, expect, mock } from 'bun:test'
const THREE = await import('./three-shim.mjs')
mock.module('three', () => THREE)
const { Vector3 } = THREE
const { beatTimes, planMusicalCuts, MelodyFocus, assignCinematicCompositions, cinematicFrame } = await import('../cinematic-camera.js')

function score(duration = 72) {
  const notes = []
  for (let t = 0.5, i = 0; t < duration - 1; i++, t += i % 12 === 0 ? 1.6 : 0.5) {
    notes.push({ midi: 48 + i % 25, start: t, end: t + (i % 7 === 0 ? 1.2 : 0.35), velocity: 0.35 + 0.6 * ((i * 7) % 11) / 10, hand: i % 3 ? 'R' : 'L' })
    if (i % 9 === 0) notes.push({ midi: 36 + i % 12, start: t, end: t + 0.8, velocity: 0.85, hand: 'L' })
  }
  return { duration, notes, tempos: [{ time: 0, bpm: 80 }, { time: duration / 2, bpm: 144 }], energyAt: t => 0.3 + 0.6 * Math.abs(Math.sin(t / 9)) }
}

test('tempo map produces denser beats after the tempo change', () => {
  const beats = beatTimes([{ time: 0, bpm: 60 }, { time: 4, bpm: 120 }], 8)
  expect(beats.filter(t => t < 4)).toHaveLength(4)
  expect(beats.filter(t => t >= 4 && t < 8)).toHaveLength(8)
})

test('whole-song cuts are deterministic, land just before attacks and keep cinematic take lengths', () => {
  const song = score(), a = planMusicalCuts(song), b = planMusicalCuts(song)
  expect(a).toEqual(b)
  expect(a[0]).toBe(0); expect(a.at(-1)).toBe(song.duration)
  const onsets = song.notes.map(n => n.start)
  for (const cut of a.slice(1, -1)) expect(Math.min(...onsets.map(t => Math.abs(t - (cut + 0.05))))).toBeLessThan(0.041)
  for (let i = 1; i + 1 < a.length; i++) {
    expect(a[i] - a[i - 1]).toBeGreaterThanOrEqual(2.19)
    expect(a[i] - a[i - 1]).toBeLessThanOrEqual(12.01)
  }
})

test('melody focus anticipates chord tops and has no positional jump', () => {
  const focus = new MelodyFocus([
    { midi: 60, start: 1 }, { midi: 67, start: 1.02 },
    { midi: 76, start: 2 }, { midi: 55, start: 2.5 },
  ])
  expect(focus.at(0)).toBeCloseTo(focus.at(0.5), 6)
  let previous = focus.at(0)
  for (let t = 0.01; t < 3; t += 0.01) {
    const current = focus.at(t)
    expect(Math.abs(current - previous)).toBeLessThan(2)
    previous = current
  }
  expect(Math.abs(focus.at(2.3) - focus.at(0.5))).toBeGreaterThan(5)
})

test('upright interior compositions occur only while its panel is open', () => {
  const song = score(100)
  const base = Array.from({ length: 18 }, (_, i) => ({ i, name: ['keys', 'hands', 'above', 'bust'][i % 4], move: 'still', t0: i * 5, t1: (i + 1) * 5, glide: 0 }))
  const open = assignCinematicCompositions(structuredClone(base), song, { instrument: 'upright', panelOpen: true })
  const closed = assignCinematicCompositions(structuredClone(base), song, { instrument: 'upright', panelOpen: false })
  expect(open[0].composition).toBe('opening'); expect(open.at(-1).composition).toBe('pullback')
  expect(open.some(s => s.composition?.startsWith('inside'))).toBe(true)
  expect(closed.some(s => s.composition?.startsWith('inside'))).toBe(false)
  for (let i = 1; i < open.length; i++) expect(open[i].composition?.startsWith('inside') && open[i - 1].composition?.startsWith('inside')).toBe(false)
})

test('every bespoke composition returns a finite physical camera', () => {
  const anchors = { hands: new Vector3(0, 76, 0), left: new Vector3(-18, 76, -2), right: new Vector3(18, 76, -2), head: new Vector3(0, 125, 35) }
  const melody = { L: { at: () => -25 }, R: { at: () => 30 } }
  const ids = ['opening', 'establishing', 'pullback', 'rise', 'silhouette', 'overhead', 'bassProfile', 'trebleProfile', 'dutch', 'handheld', 'orbit', 'shoulder', 'lowFront', 'keySlider', 'macro', 'dorsal', 'key', 'desk', 'push', 'insideHammers', 'insideAlong', 'insideThrough', 'insidePlate']
  for (const id of ids) {
    const camera = cinematicFrame(id, { t: 5, shot: { i: 2, t0: 2, t1: 8, hand: 'R', keyMidi: 72 }, anchors, melody })
    expect(camera).toBeTruthy()
    for (const value of [...camera.position.toArray(), ...camera.target.toArray(), camera.focalLength, camera.fstop, camera.focusDistance, camera.roll]) expect(Number.isFinite(value)).toBe(true)
    expect(camera.focalLength).toBeGreaterThan(20)
    expect(camera.fstop).toBeGreaterThan(2)
    expect(camera.focusDistance).toBeGreaterThan(0)
  }
})
