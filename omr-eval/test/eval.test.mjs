// node --test omr-eval/test/eval.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { violaTruth, barOf, readMidi, MOVEMENTS } from '../truth.mjs'
import { align, markRepeats, readingOrder, wrongKind, evaluate } from '../eval.mjs'
import { pageMarks, markAt, tableRows } from '../viewer.js'
import fs from 'node:fs'

test('the viola truth: three movements, bars from the time signatures, movement II an octave up', () => {
  const t = violaTruth()
  assert.equal(t.length, 7114)
  const I = t.filter(x => x.mvt === 'I'), II = t.filter(x => x.mvt === 'II')
  assert.equal(I[0].bar, 1); assert.equal(I[0].midi, 54) // F#3, bar 1 beat 4 (the opening upbeat in 6/4)
  assert.equal(I[0].beat, 4); assert.equal(I[0].sig, '6/4')
  assert.ok(II.every(x => x.midi >= 44), 'nothing in movement II below A flat 2 once transposed')
  // no duplicate pitch at one onset (two divisi tracks sharing a note print one head)
  const seen = new Set(); for (const x of t) { const k = x.mvt + x.tick + ':' + x.midi; assert.ok(!seen.has(k)); seen.add(k) }
})

test('readMidi reads every track name of the first movement', () => {
  const m = readMidi(fs.readFileSync(new URL('../midi/' + MOVEMENTS[0].file, import.meta.url)))
  assert.equal(m.tracks.filter(x => /^Viola/.test(x.name)).map(x => x.name).join(), 'Viola 1,Viola 2,Viola 3,Viola 4')
  assert.equal(m.ppq, 240)
})

test('barOf counts bars across time-signature changes', () => {
  const bar = barOf([{ tick: 0, num: 6, den: 4 }, { tick: 2880, num: 4, den: 4 }], 240)
  const r = x => ({ ...x, beat: +x.beat.toFixed(3) })
  assert.deepEqual(r(bar(0)), { bar: 1, beat: 0, sig: '6/4' })
  assert.deepEqual(r(bar(1440 + 240)), { bar: 2, beat: 1, sig: '6/4' })
  assert.deepEqual(r(bar(2880 + 960 + 480)), { bar: 4, beat: 2, sig: '4/4' })
})

test('align: a missed note and an extra head cost locally; a nearby wrong pitch pairs', () => {
  const truth = [60, 62, 64, 65, 67].map(midi => ({ midi }))
  assert.deepEqual(align(truth, [60, 62, 65, 67]), [[0, 0], [1, 1], [2, -1], [3, 2], [4, 3]])
  assert.deepEqual(align(truth, [60, 62, 64, 99, 65, 67]), [[0, 0], [1, 1], [2, 2], [-1, 3], [3, 4], [4, 5]])
  // E read a semitone high pairs with E rather than being a miss plus an extra
  assert.deepEqual(align(truth, [60, 62, 63, 65, 67]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]])
  // a tremolo repeat is cheap to skip
  const trem = [{ midi: 60 }, { midi: 60, repeat: true }, { midi: 60, repeat: true }, { midi: 62 }]
  assert.deepEqual(align(trem, [60, 62]), [[0, 0], [1, -1], [2, -1], [3, 1]])
})

test('markRepeats marks one-note and two-note tremolos written out in the MIDI', () => {
  const t = [{ mvt: 'I', tick: 0, midi: 60 }, { mvt: 'I', tick: 60, midi: 60 }, { mvt: 'I', tick: 120, midi: 60 }, { mvt: 'I', tick: 480, midi: 60 },
    { mvt: 'I', tick: 960, midi: 64 }, { mvt: 'I', tick: 1020, midi: 67 }, { mvt: 'I', tick: 1080, midi: 64 }, { mvt: 'I', tick: 1140, midi: 67 }]
  markRepeats(t, 240)
  assert.deepEqual(t.map(x => !!x.repeat), [false, true, true, false, false, false, true, true])
})

test('wrongKind', () => {
  assert.equal(wrongKind(12), 'octave'); assert.equal(wrongKind(-1), 'semitone'); assert.equal(wrongKind(2), 'step'); assert.equal(wrongKind(7), 'other')
})

test('readingOrder merges a divisi system\'s two staves by x, low to high', () => {
  const page = { space: 10, staves: [
    { i: 0, system: 1, heads: [{ x: 10, midi: 60 }, { x: 50, midi: 62 }] },
    { i: 1, system: 1, heads: [{ x: 12, midi: 55 }, { x: 90, midi: 57 }] },
    { i: 2, system: 2, heads: [{ x: 5, midi: 70 }] }] }
  assert.deepEqual(readingOrder(page).map(([s, h]) => s + ':' + h.midi), ['1:55', '0:60', '0:62', '1:57', '2:70'])
})

test('evaluate on the cached reads: 17 pages, the summary adds up, folded repeats leave the denominator', () => {
  const cached = JSON.parse(fs.readFileSync(new URL('../results.json', import.meta.url))).read
  const r = evaluate({ cached })
  assert.equal(r.pages.length, 17)
  const s = r.summary
  // every head is right, wrong, extra or a chord note; every truth note is matched, misread, missed or folded
  assert.equal(s.match + s.wrong + s.extra + s.chordExtra, s.detected)
  assert.equal(s.match + s.wrong + s.missed + s.folded, s.truth)
  assert.ok(s.pitchCorrect > 85, `pitch ${s.pitchCorrect}`)
  assert.ok(s.headsFound > 97, `heads ${s.headsFound}`)
  const rows = tableRows(r)
  assert.equal(rows.reduce((a, p) => a + p.heads, 0), s.detected)
})

test('viewer: marks include missed notes, markAt finds the nearest', () => {
  const page = { space: 10, staves: [{ i: 0, heads: [{ x: 100, y: 50, midi: 60, name: 'C4', cat: 'match' }], missed: [{ x: 130, y: 50, midi: 62 }] }] }
  assert.equal(pageMarks(page).length, 2)
  assert.equal(markAt(page, 128, 52).cat, 'missed')
  assert.equal(markAt(page, 200, 52), null)
})
