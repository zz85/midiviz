// bun test pianist/test
// The schedule of what the hands play (pianist/performed.js), from a file and the hands' notes.
import { test, expect } from 'bun:test'
import { performedSchedule, describePerformed, MIN_SOUND } from '../performed.js'

const file = notes => ({ notes, controlChanges: [{ time: 0, controller: 64, value: 127 }], duration: 10, title: 't' })
const n = (midi, time, duration, velocity = 0.7) => ({ midi, time, duration, velocity, channel: 0 })
const h = (pitch, on, off, hand, finger, extra = {}) => ({ pitch, on, off, hand, finger, velocity: 0.7, ...extra })

test('a note the hands play as written is the file\'s own object; the pedal is kept', () => {
  const s = file([n(60, 1, 1), n(64, 1, 1)])
  const p = performedSchedule(s, [h(60, 1, 2, 'R', 1), h(64, 1, 2, 'R', 3)])
  expect(p.notes).toEqual(s.notes)
  expect(p.notes[0]).toBe(s.notes[0])
  expect(p.controlChanges).toBe(s.controlChanges)
  expect(p.duration).toBe(10)
  expect(p.stats).toEqual({ written: 2, played: 2, silent: 0, early: 0, cut: 0 })
  expect(describePerformed(p.stats)).toBe('as written')
})

test('a let-go key stops sounding at its release; a release past the written end changes nothing', () => {
  const s = file([n(60, 1, 2), n(62, 1, 2)])
  const p = performedSchedule(s, [h(60, 1, 3, 'R', 1, { release: 1.5 }), h(62, 1, 3, 'R', 2, { release: 4 })])
  expect(p.notes[0]).toEqual({ ...s.notes[0], duration: 0.5 })
  expect(p.notes[1]).toBe(s.notes[1])
  expect(p.stats.early).toBe(1)
  expect(p.stats.cut).toBeCloseTo(1.5)
  expect(describePerformed(p.stats)).toBe('1 let go early (1.5 s)')
})

test('an unfingered key is silent; a release before MIN_SOUND still sounds that long', () => {
  const s = file([n(60, 1, 1), n(62, 1, 1), n(64, 1, 1)])
  const p = performedSchedule(s, [h(60, 1, 2, 'R', 0), h(62, 1, 2, 'R', 2, { release: 1.001 }), h(64, 1, 2, 'R', 3)])
  expect(p.notes.map(x => x.midi)).toEqual([62, 64])
  expect(p.notes[0].duration).toBeCloseTo(MIN_SOUND)
  expect(p.stats.silent).toBe(1)
  expect(describePerformed(p.stats)).toBe('1 silent, 1 let go early (1.0 s)')
})

test('a shared key sounds, held as long as the finger that leads it', () => {
  const s = file([n(60, 1, 2), n(62, 1, 2)])
  const p = performedSchedule(s, [h(60, 1, 3, 'L', 1, { release: 1.4 }), h(62, 1, 3, 'L', 1, { shared: 'thumb' })])
  expect(p.notes.length).toBe(2)
  expect(p.notes[1].duration).toBeCloseTo(0.4)
})

test('two written notes of one pitch at one onset take the hands\' notes in order; a third is silent', () => {
  const s = file([n(60, 1, 1), n(60, 1, 2), n(60, 1, 3)])
  const p = performedSchedule(s, [h(60, 1, 2, 'R', 1, { release: 1.2 }), h(60, 1, 3, 'L', 5)])
  expect(p.notes[0].duration).toBeCloseTo(0.2); expect(p.notes[1].duration).toBe(2)
  expect(p.stats.silent).toBe(1)
})

test('a note matched only by pitch and onset: another onset of the same pitch is not taken', () => {
  const s = file([n(60, 1, 1), n(60, 2.5, 1)])
  const p = performedSchedule(s, [h(60, 2.5, 3.5, 'R', 1)])
  expect(p.notes).toEqual([s.notes[1]])
  expect(p.stats.silent).toBe(1)
})
