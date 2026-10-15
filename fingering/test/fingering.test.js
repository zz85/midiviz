// Tests for the fingering engine.  Run: node --test fingering/test/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { keyX, isBlack, parseNote, noteName, WHITE_W } from '../keyboard.js'
import {
  SPAN_TABLE, spanLimits, mirror, createModel, makeSlices, splitHands, fingerPiece, fingerString,
  costOf, toPIG, fromPIG, PARNCUTT,
} from '../fingering.js'
import { exercises, scale, scaleExpect } from '../exercises.js'
import { runSuite } from './bench.js'

const ex = id => exercises().find(e => e.id === id)
const run = (id, opts) => {
  const e = ex(id)
  const notes = e.notes.map(n => ({ ...n }))
  fingerPiece(notes, opts)
  return { e, notes }
}
const accepts = (want, got) => [].concat(want).includes(got)

// ── Geometry ───────────────────────────────────────────────────────────────
test('keyboard geometry matches the 028 grand piano', () => {
  assert.equal(keyX(21), -52 * WHITE_W / 2 + WHITE_W / 2)     // A0 is the first white key
  assert.ok(Math.abs(keyX(108) - (52 * WHITE_W / 2 - WHITE_W / 2)) < 1e-9)
  assert.ok(Math.abs(keyX(72) - keyX(60) - 7 * WHITE_W) < 1e-9) // an octave is 7 white keys
  assert.ok(keyX(61) > keyX(60) && keyX(61) < keyX(62))
})

test('mirroring around D keeps key colours and physical distances', () => {
  for (let p = 0; p < 128; p++) {
    assert.equal(isBlack(mirror(p)), isBlack(p), `colour of ${p}`)
    const d1 = keyX(p + 1) - keyX(p), d2 = keyX(mirror(p)) - keyX(mirror(p + 1))
    assert.ok(Math.abs(d1 - d2) < 1e-9, `distance at ${p}`)
  }
})

test('note names round-trip', () => {
  for (const [s, m] of [['C4', 60], ['A0', 21], ['C8', 108], ['F#3', 54], ['Bb2', 46], ['Cb4', 59], ['E#4', 65]]) assert.equal(parseNote(s), m)
  for (let m = 21; m <= 108; m++) assert.equal(parseNote(noteName(m)), m)
})

// ── Span table and Parncutt's rules ────────────────────────────────────────
test('span table: MaxComf = MaxPrac − 2 for every pair (Parncutt 1997)', () => {
  for (const [k, [, , , , maxC, maxP]] of Object.entries(SPAN_TABLE)) assert.equal(maxC, maxP - 2, k)
})

test('reverse finger pairs negate and swap the limits', () => {
  assert.deepEqual(spanLimits(2, 1), [-10, -8, -5, -1, 3, 5])
  assert.deepEqual(spanLimits(1, 2), SPAN_TABLE['1-2'])
  assert.deepEqual(spanLimits(3, 3), [0, 0, 0, 0, 0, 0])
  assert.deepEqual(spanLimits(1, 5, 1.1).map(v => +v.toFixed(2)), [-1.1, 1.1, 7.7, 11, 14.3, 16.5])
})

test('Parncutt rules reproduce the published points', () => {
  const m = createModel(PARNCUTT)
  const n = (s, on = 0) => ({ p: parseNote(s), on, off: on + 0.2 })
  // Rule 1 + 3: D4→C5 with 2-5 is 10 semitones: 2 beyond MaxComf (×2) and 4 beyond MaxRel (×2, no thumb)
  assert.equal(m.spanCost(10, 2, 5), 2 * 2 + 2 * 4)
  // Rule 2: C4→D4 with 1-3 is 2 semitones, 1 below MinRel, thumb pair
  assert.equal(m.spanCost(2, 1, 3), 1)
  // Rule 6: weak fingers
  assert.equal(m.noteCost(n('C4'), 4, true, true), 1)
  assert.equal(m.noteCost(n('C4'), 5, true, true), 1)
  // Rule 10: thumb on black, 1 + 2 per white neighbour (C#4 between C4 and E4 = 5)
  assert.equal(m.noteCost(n('C#4'), 1, true, true), 5)
  assert.equal(m.noteCost(n('C#4'), 1, false, false), 1)
  // Rule 11: five on black, 0 + 2 per white neighbour
  assert.equal(m.noteCost(n('Bb4'), 5, false, false), 1)   // (+1 weak finger)
  assert.equal(m.noteCost(n('Bb4'), 5, true, false), 3)
  // Rule 8: 3 followed by 4 (here a comfortable whole tone: only rule 8 fires)
  assert.equal(m.pairCost(n('C4'), 3, n('D4', 0.2), 4), 1)
  assert.equal(m.pairCost(n('D4'), 4, n('C4', 0.2), 3), 0)
  // Rule 9: 3 on white next to 4 on black (+ rule 8 when 3→4)
  assert.equal(m.pairCost(n('E4'), 3, n('F#4', 0.2), 4), 2)
  // Rule 12: A#3 → C#4 played 2-1 is a black-black thumb pass: 1 point on top of the span rules
  const pass = m.pairCost(n('A#3'), 2, n('C#4', 0.2), 1)
  assert.equal(pass - m.spanCost(3, 2, 1), 1)
  // ... and white finger → black thumb costs 3
  assert.equal(m.pairCost(n('B3'), 2, n('C#4', 0.2), 1) - m.spanCost(2, 2, 1), 3)
  // Rule 7: 3-4-5 in any order
  assert.equal(m.tripleCost(n('C4'), 3, n('D4', 0.2), 4, n('E4', 0.4), 5), 1)
})

test('our model: same finger on different keys costs much more legato than detached', () => {
  const m = createModel()
  const a = { p: 60, on: 0, off: 0.2 }, b = { p: 62, on: 0.2, off: 0.4 }
  const detached = { p: 62, on: 0.6, off: 0.8 }
  assert.ok(m.pairCost(a, 2, b, 2) > 3 * m.pairCost(a, 2, detached, 2))
})

test('our model: fast repeated notes want changing fingers, slow ones do not', () => {
  const m = createModel()
  assert.ok(m.repeatCost(3, 3, 0.09) > m.repeatCost(3, 2, 0.09))
  assert.ok(m.repeatCost(3, 3, 0.6) < m.repeatCost(3, 2, 0.6))
  assert.ok(m.repeatCost(3, 2, 0.09) < m.repeatCost(2, 3, 0.09), '4-3-2-1 order is preferred')
})

test('costOf ranks the textbook C major RH fingering below bad alternatives', () => {
  const p = scale('C4', { octaves: 1, updown: false })
  const good = costOf(p, [1, 2, 3, 1, 2, 3, 4, 5])
  assert.ok(good < costOf(p, [1, 2, 3, 4, 5, 1, 2, 3]), 'thumb under the 5th')
  assert.ok(good < costOf(p, [1, 1, 1, 1, 1, 1, 1, 1]), 'all thumbs')
  assert.ok(good < costOf(p, [2, 3, 4, 1, 2, 3, 4, 5]), 'more weak 4s')
})

// ── Slicing and polyphony constraints ─────────────────────────────────────
test('onsets within 30 ms form one slice, sorted by pitch', () => {
  const s = makeSlices([{ p: 64, on: 0.01 }, { p: 60, on: 0 }, { p: 67, on: 0.02 }, { p: 62, on: 0.1 }])
  assert.equal(s.length, 2)
  assert.deepEqual(s[0].notes.map(n => n.p), [60, 64, 67])
})

test('chords: fingers rise with pitch in the RH and fall in the LH, all distinct', () => {
  const notes = [
    ...['C4', 'E4', 'G4'].map(s => ({ pitch: parseNote(s), on: 0, off: 0.5, hand: 'R' })),
    ...['C3', 'E3', 'G3'].map(s => ({ pitch: parseNote(s), on: 0, off: 0.5, hand: 'L' })),
  ]
  fingerPiece(notes)
  assert.equal(fingerString(notes, 'R'), '135')
  assert.equal(fingerString(notes, 'L'), '531')
})

test('a held key keeps its finger while other voices move', () => {
  const { e, notes } = run('held-voice')
  const held = notes.find(n => n.pitch === 60)
  assert.equal(held.finger, 1)
  assert.ok(accepts(e.expect.R, fingerString(notes, 'R')))
})

test('more than five simultaneous keys in one hand leaves the extras unfingered', () => {
  const notes = [60, 62, 64, 65, 67, 69].map(p => ({ pitch: p, on: 0, off: 0.5, hand: 'R' }))
  fingerPiece(notes)
  assert.equal(notes.filter(n => n.finger === 0).length, 1)
  assert.deepEqual(notes.filter(n => n.finger).map(n => n.finger), [1, 2, 3, 4, 5])
})

// ── Exercises with textbook answers ───────────────────────────────────────
const CORE = ['five-finger-C', 'five-finger-C-L', 'chopin-position', 'arpeggio-C-R', 'arpeggio-C-L', 'alberti',
  'triads-R', 'octaves-R', 'repeat-fast', 'trill', 'hanon-1']
for (const id of CORE) {
  test(`exercise: ${ex(id).title}`, () => {
    const { e, notes } = run(id)
    for (const hand of Object.keys(e.expect)) {
      const got = fingerString(notes, hand)
      assert.ok(accepts(e.expect[hand], got), `${hand}: got ${got}, want ${[].concat(e.expect[hand]).join(' | ')}`)
    }
  })
}

test('C major scale, both hands, two octaves up and down: textbook fingering', () => {
  for (const [id, pat, hand] of [['scale-C-R', '1231234', 'R'], ['scale-C-L', '5432132', 'L']]) {
    const { notes } = run(id)
    assert.equal(fingerString(notes, hand), scaleExpect(pat, hand))
  }
})

test('slow repeated note may keep one finger', () => {
  const { notes } = run('repeat-slow')
  assert.equal(new Set(notes.map(n => n.finger)).size, 1)
})

test('a leap beyond the hand span starts a new position on each side', () => {
  const { notes } = run('leap')   // C4 E4 G4 | A5 F5 D5: 14 semitones from G4 to A5
  const f = notes.map(n => n.finger)
  assert.ok(f[0] < f[1] && f[1] < f[2], `before the leap ${f}`)
  assert.ok(f[3] > f[4] && f[4] > f[5], `after the leap ${f}`)
})

test('black-key pentatonic run stays playable (≤ 3 thumbs on black: there are no white keys)', () => {
  const { notes } = run('pentatonic')
  assert.ok(notes.filter(n => n.finger === 1 && isBlack(n.pitch)).length <= 3, fingerString(notes))
})

test('chromatic scale: thumb only on white keys (known divergence: groups instead of 1-3)', () => {
  const { notes } = run('chromatic-R')
  for (const n of notes) if (n.finger === 1) assert.ok(!isBlack(n.pitch), noteName(n.pitch))
})

// ── All 24 scales, both hands (benchmark with floors) ─────────────────────
test('24 scales × 2 hands: ≥ 90 % of notes and ≥ 22 of 48 scales match the textbook', () => {
  const rows = runSuite({}, e => e.suite === 'scales')
  const exact = rows.filter(r => r.exact).length
  const agree = rows.reduce((a, r) => a + r.agree, 0) / rows.length
  assert.ok(agree >= 0.9, `agreement ${(agree * 100).toFixed(1)} %`)
  assert.ok(exact >= 22, `exact ${exact}/48`)
})

test('our model beats the published Parncutt model on the exercise suite', () => {
  const score = opts => { const r = runSuite(opts); return r.reduce((a, x) => a + x.agree, 0) / r.length }
  assert.ok(score({}) > score(structuredClone(PARNCUTT)) + 0.1)
})

// Known divergence: B♭ minor LH turns on the top B♭ with the thumb (book: 2).
test('no scale puts the thumb on a black key in the middle of a run (turning notes excepted)', () => {
  for (const e of exercises().filter(x => x.suite === 'scales')) {
    const notes = e.notes.map(n => ({ ...n }))
    fingerPiece(notes)
    const sorted = notes.sort((a, b) => a.on - b.on)
    const top = (sorted.length - 1) / 2
    sorted.slice(1, -1).forEach((n, i) => {
      if (n.finger === 1 && i + 1 !== top) assert.ok(!isBlack(n.pitch), `${e.id} note ${i + 1} ${noteName(n.pitch)}: ${fingerString(sorted)}`)
    })
  }
})

// ── Hand split ─────────────────────────────────────────────────────────────
test('hand split: melody over an Alberti bass separates by voice', () => {
  const e = ex('two-hands')
  const notes = e.notes.map(n => ({ ...n }))
  splitHands(notes)
  for (const n of notes) assert.equal(n.hand, n.pitch >= 60 ? 'R' : 'L', noteName(n.pitch))
})

test('hand split: a single line crossing middle C stays in one hand', () => {
  const notes = [55, 57, 59, 60, 62, 64, 65, 67].map((p, i) => ({ pitch: p, on: i * 0.15, off: i * 0.15 + 0.14 }))
  splitHands(notes)
  assert.equal(new Set(notes.map(n => n.hand)).size, 1)
})

test('hand split: wide chords are divided between the hands', () => {
  const notes = [36, 43, 48, 64, 67, 72].map(p => ({ pitch: p, on: 0, off: 1 }))
  splitHands(notes)
  assert.deepEqual(notes.map(n => n.hand), ['L', 'L', 'L', 'R', 'R', 'R'])
})

test('hand split keeps hands that are already assigned', () => {
  const notes = [{ pitch: 40, on: 0, off: 1, hand: 'R' }, { pitch: 80, on: 0, off: 1 }]
  splitHands(notes)
  assert.equal(notes[0].hand, 'R')
})

// ── Real music ────────────────────────────────────────────────────────────
function loadMidi(file) {
  const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')
  const midi = new Midi(readFileSync(new URL(`../../${file}`, import.meta.url)))
  const tracks = midi.tracks.filter(t => t.notes.length && t.channel !== 9)
  const notes = []
  tracks.forEach((t, ti) => t.notes.forEach(n => notes.push({ pitch: n.midi, on: n.time, off: n.time + n.duration, velocity: n.velocity, track: ti })))
  return notes
}

test('real pieces: every note fingered, held keys never share a finger, chords ordered', () => {
  for (const file of ['Prelude1.mid', 'chpn-p15.mid', 'midis/elise.mid']) {
    const notes = loadMidi(file)
    const r = fingerPiece(notes)
    assert.ok(r.ms < 3000, `${file} took ${r.ms} ms`)
    assert.equal(notes.filter(n => !(n.finger >= 1 && n.finger <= 5)).length, 0, file)
    for (const hand of ['L', 'R']) {
      const own = notes.filter(n => n.hand === hand).sort((a, b) => a.on - b.on)
      // at every onset, the keys struck there plus the keys still clearly held use distinct fingers
      for (const s of makeSlices(own.map(n => ({ ...n, p: n.pitch })))) {
        const struck = s.notes
        const sorted = [...struck].sort((a, b) => a.pitch - b.pitch)
        for (let i = 1; i < sorted.length; i++) {
          const ok = hand === 'R' ? sorted[i].finger > sorted[i - 1].finger : sorted[i].finger < sorted[i - 1].finger
          assert.ok(ok, `${file} ${hand} chord at ${s.on.toFixed(2)}: ${sorted.map(n => noteName(n.pitch) + n.finger).join(' ')}`)
        }
      }
    }
  }
})

test('PIG format round-trip', () => {
  const { notes } = run('two-hands')
  const back = fromPIG(toPIG(notes))
  assert.equal(back.length, notes.length)
  const sorted = [...notes].sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  back.forEach((n, i) => {
    assert.equal(n.pitch, sorted[i].pitch)
    assert.equal(n.hand, sorted[i].hand)
    assert.equal(n.truth, sorted[i].finger)
  })
})
