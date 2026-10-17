// node --test strings/test/fingering.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerLine, fingerTokens, lineStats, INSTRUMENTS, positionName, stopMM, parseNote, makeEvents, estimateKeys } from '../fingering.js'
import { exercises, bestMatch, line, melody } from '../exercises.js'
import { findRuns } from '../templates.js'
import { buildMotion } from '../motion.js'
import { parseCSV, align, compare, scorePiece, tnuaPosition } from '../tnua.js'

const EX = Object.fromEntries(exercises().map(e => [e.id, e]))
function run(id, opts = {}) {
  const e = EX[id]
  const notes = e.notes.map(n => ({ ...n }))
  fingerLine(notes, { instrument: e.instrument, mode: e.mode || 'standard', ...opts })
  return { e, notes, got: fingerTokens(notes, e.instrument, { positions: true }) }
}
const exact = id => { const { e, got } = run(id); const r = bestMatch(got, e.expect); assert.ok(r.exact, `${id}: got ${got.join(' ')}, want ${e.expect[0].join(' ')}`) }

test('geometry: fret formula and position names', () => {
  assert.ok(Math.abs(stopMM(12, 328) - 164) < 0.01)               // the octave is half the string
  assert.ok(Math.abs(stopMM(7, 328) - 109.1) < 0.2)
  assert.equal(positionName(2), '1')
  assert.equal(positionName(1), '½')
  assert.equal(positionName(5), '3')
  assert.equal(positionName(12), '7')
  assert.equal(parseNote('C#5'), 73)
  assert.equal(parseNote('Bb3'), 58)
})

test('every fingered note is physically consistent', () => {
  for (const id of ['g3-up', 'a3-up', 'minuet', 'ds-scale', 'bach-chords', 'viola-a2', 'cello-c1', 'gsharp-etude']) {
    const { e, notes } = run(id)
    const I = INSTRUMENTS[e.instrument]
    for (const n of notes) {
      if (n.unplayable) continue
      assert.ok(n.string >= 0 && n.string < 4, id)
      assert.ok(n.finger >= 0 && n.finger <= 4, id)
      const d = n.pitch - I.open[n.string]
      if (n.finger === 0) assert.equal(d, 0, `${id}: open string pitch`)
      else assert.equal(I.open[n.string] + n.base + n.offset, n.pitch, `${id}: stop matches pitch`)
    }
  }
})

test('first position patterns (research 01 §6.1–6.2)', () => {
  for (const id of ['g1-up', 'a1-up', 'c-1st', 'stay-a', 'fast-open', 'climax', 'chrom-g']) exact(id)
})

test('beginner style: Twinkle in first position with open strings (Suzuki)', () => exact('twinkle'))

test('double stops and chords (research 01 §7)', () => {
  for (const id of ['ds-octave', 'ds-fifth', 'ds-third', 'ds-thirds', 'ds-sixth', 'chord-g', 'chord-d']) exact(id)
  // every double stop sits on adjacent strings
  const { notes } = run('ds-scale')
  const ev = makeEvents(notes)
  assert.ok(notes.every(n => !n.unplayable))
  for (const e of ev) if (e.notes.length === 2) assert.equal(e.notes[1].string - e.notes[0].string, 1)
})

test('viola and cello use their own strings and frames', () => {
  for (const id of ['viola-c1', 'viola-ds', 'cello-c1']) exact(id)
})

test('three-octave scales follow a scale-book pattern', () => {
  for (const id of ['g3-up', 'g3-down', 'c3-up', 'd3-up']) exact(id)
  // A major: close to the book, few shifts, the top in a high position on E
  const { e, got, notes } = run('a3-up')
  assert.ok(bestMatch(got, e.expect).agree >= 0.8)
  const st = lineStats(notes)
  assert.ok(st.shifts <= 4, `shifts ${st.shifts}`)
  assert.equal(got[got.length - 1].slice(0, 1), 'E')
})

test('scale runs are detected, chromatic runs are not', () => {
  const ev = makeEvents(EX['g3-up'].notes.map(n => ({ ...n })))
  assert.equal(findRuns(ev).length, 1)
  const chrom = makeEvents(line(Array.from({ length: 20 }, (_, i) => 55 + i)))
  assert.equal(findRuns(chrom).length, 0)
})

test('styles: beginner never leaves first position, fewest-shifts shifts least', () => {
  const notes = EX.minuet.notes.map(n => ({ ...n }))
  fingerLine(notes, { mode: 'beginner' })
  assert.ok(notes.every(n => n.finger === 0 || n.base <= 2))
  const scale = EX['g3-up'].notes
  const a = scale.map(n => ({ ...n })), b = scale.map(n => ({ ...n }))
  fingerLine(a, { mode: 'standard', templates: false }); fingerLine(b, { mode: 'nearest', templates: false })
  assert.ok(lineStats(b).shifts <= lineStats(a).shifts)
})

test('out-of-range notes and oversize chords are flagged, not fingered', () => {
  const notes = line([40, 55, 62, [55, 62, 69, 76, 83]], { dur: 0.5 })
  fingerLine(notes)
  assert.equal(notes[0].unplayable, 'range')
  assert.ok(notes.filter(n => n.unplayable === 'chord').length >= 1)
  assert.ok(notes.filter(n => !n.unplayable).every(n => n.string != null))
})

test('string locks are honoured (sul G)', () => {
  const notes = melody('G4 A4 B4 C5 D5:2', 0.5).map(n => ({ ...n, lockString: 0 }))
  fingerLine(notes)
  assert.ok(notes.every(n => n.string === 0))
  assert.ok(Math.max(...notes.map(n => n.base)) >= 7)
})

test('key estimation finds the key of a scale', () => {
  const ev = makeEvents(line([62, 64, 66, 67, 69, 71, 73, 74]))
  assert.ok(estimateKeys(ev).every(k => k === 2))   // D major
})

test('motion: shifts land before the note, bow strokes alternate', () => {
  const notes = EX['g3-up'].notes.map(n => ({ ...n }))
  fingerLine(notes)
  const m = buildMotion(notes)
  for (const n of notes) {
    if (!n.finger) continue
    const p = m.poseAt(n.on + 0.005)
    assert.ok(Math.abs(p.base - n.base) < 1e-6, 'hand in place at the onset')
    assert.equal(p.fingers[n.finger].press > 0, true)
    assert.equal(Math.round(p.fingers[n.finger].s), n.string)
  }
  for (let i = 1; i < m.strokes.length; i++) if (m.strokes[i].t0 - m.strokes[i - 1].t1 < 0.5) assert.equal(m.strokes[i].dir, -m.strokes[i - 1].dir)
  for (const st of m.strokes) { assert.ok(st.end >= 3 && st.end <= 62); assert.ok(st.start >= 3 && st.start <= 62) }
})

test('motion: a repeated note keeps the finger down, a different note or open string lifts it', () => {
  // A3 A3 (D5, finger 3 twice) then A2: finger 3 stays down between the D5s
  const notes = melody('D5 D5 C#5 A4 A4', 0.5).map(n => ({ ...n }))
  fingerLine(notes, { mode: 'beginner' })
  assert.deepEqual(fingerTokens(notes), ['A3', 'A3', 'A2', 'A0', 'A0'])
  const m = buildMotion(notes)
  const gap = (notes[0].off + notes[1].on) / 2
  assert.ok(m.poseAt(gap).fingers[3].press > 0, 'finger 3 held between the repeated D5s')
  // after the C♯ (finger 2) comes open A: finger 2 lifts in the gap
  const gap2 = (notes[2].off + notes[3].on) / 2 + 0.02
  assert.equal(m.poseAt(gap2).fingers[2].press, 0)
})

test('TNUA format: bars glued, alignment, scoring', () => {
  const csv = 'pitch,start,duration,beat_type,string,position,finger\n' +
    '62,-0.5,0.5,4,2,1,0\n64,0,1,4,2,1,1\n66,1,1,4,2,1,2\n67,0,2,3,2,1,3\n69,2,2,3,3,1,0\n'
  const a = parseCSV(csv, { secPerBeat: 0.5 })
  assert.deepEqual(a.map(n => n.on), [0, 0.25, 0.75, 1.25, 2.25])
  assert.equal(a[1].truth.string, 1)
  const b = parseCSV(csv.replace('66,1,1,4,2,1,2\n', ''), { secPerBeat: 0.5 })
  const al = align(a, b)
  assert.equal(al.length, 5)
  assert.equal(al[2].truth, null)
  const est = a.map(n => ({ ...n, string: n.truth.string, finger: n.truth.finger, base: 2 }))
  assert.equal(compare(est, a).stringFinger, 1)
  assert.equal(scorePiece(est, [a, al]).soft, 1)
  assert.equal(tnuaPosition(0, 2), 1)
  assert.equal(tnuaPosition(2, 5), 3)
})

test('whole pieces are fast', () => {
  const ps = []
  let p = 67
  for (let i = 0; i < 2000; i++) { p = Math.max(55, Math.min(96, p + [-2, -1, 1, 2, 3, -3, 5, -5][(i * 7 + (i >> 3)) % 8])); ps.push(p) }
  const notes = line(ps, { dur: 0.15 })
  const r = fingerLine(notes)
  assert.ok(notes.every(n => n.string != null))
  assert.ok(r.ms < 2000, `${r.ms} ms`)
})
