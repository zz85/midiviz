// node --test strings/test/fingering.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { solveFingering, suggestFingerings, fingerLine, fingerHeld, fingerTokens, lineStats, onePlayerNotes, INSTRUMENTS, DEFAULTS, positionName, stopMM, parseNote, makeEvents, estimateKeys } from '../fingering.js'
import { exercises, bestMatch, line, melody } from '../exercises.js'
import { findRuns } from '../templates.js'
import { buildMotion } from '../motion.js'
import { parseCSV, writeFingeringCSV, align, compare, scorePiece, tnuaPosition } from '../tnua.js'

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

test('semitone figure keeps a stable 1-2-3 frame instead of sliding one finger', () => {
  const notes = line('D#4 E4 F4 E4 D#4 F4 E4 F4 G4 F4 E4 G4'.split(' '), { dur:0.25 })
    .map(note => ({ ...note, lockString:0 }))
  const result = solveFingering(notes, { templates:false })
  assert.deepEqual(result.assignments.slice(0, 7).map(assignment => assignment.finger), [1, 2, 3, 2, 1, 3, 2])
  assert.equal(new Set(result.assignments.slice(0, 7).map(assignment => assignment.base)).size, 1)
})

test('viola page-2 phrases use chromatic and printed-diatonic finger patterns', () => {
  const pitches = [54, 56, 54, 52, 54, 52, 54, 56, 52, 54, 50, 53, 54, 57, 57, 56, 61, 59, 64, 62, 61, 57, 58, 61, 61, 60, 65, 63, 68, 67]
  const diatonic = [24, 25, 24, 23, 24, 23, 24, 25, 23, 24, 22, 23, 24, 26, 26, 25, 28, 27, 30, 29, 28, 26, 27, 29, 29, 28, 31, 30, 33, 32]
  const onsets = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6.5, 7, 7.5, 8, 8.5, 9, 9.25, 9.75, 10.25, 10.5, 11.5, 12, 12.5, 13, 13.5, 14.5, 15, 15.5, 16]
  const notes = pitches.map((pitch, index) => ({ pitch, diatonic:diatonic[index], on:onsets[index], off:onsets[index] + ([16, 19].includes(index) ? 0.25 : 0.5) }))
  const result = solveFingering(notes, { instrument:'viola', templates:false })
  assert.deepEqual(result.assignments.slice(11, 14).map(assignment => assignment.finger), [2, 3, 1])
  assert.deepEqual(result.assignments.slice(11, 14).map(assignment => assignment.base), [2, 2, 2])
  assert.deepEqual(result.assignments.slice(21, 26).map(assignment => assignment.finger), [1, 2, 4, 4, 3])
  assert.deepEqual(result.assignments.slice(21, 26).map(assignment => assignment.base), [2, 2, 2, 2, 2])

  const unspelled = notes.map(({ diatonic:_, ...note }) => note)
  assert.deepEqual(solveFingering(unspelled, { instrument:'viola', templates:false }).assignments.slice(21, 26).map(assignment => assignment.finger), [1, 2, 3, 3, 3])

  const beginner = solveFingering(notes, { instrument:'viola', mode:'beginner', templates:false })
  const beginnerUnspelled = solveFingering(unspelled, { instrument:'viola', mode:'beginner', templates:false })
  assert.ok(beginner.assignments.filter(assignment => assignment.playable).every(assignment => !assignment.extension))
  assert.deepEqual(beginner.assignments.map(({ finger, base, string }) => ({ finger, base, string })), beginnerUnspelled.assignments.map(({ finger, base, string }) => ({ finger, base, string })))
  assert.deepEqual(beginner.assignments.slice(11, 14).map(assignment => assignment.finger), [3, 4, 1])

  const violin = solveFingering(notes.map(note => ({ ...note, pitch:note.pitch + 7, diatonic:note.diatonic + 4 })), { instrument:'violin', templates:false })
  assert.deepEqual(violin.assignments.slice(11, 14).map(assignment => assignment.finger), [3, 4, 1])

  const custom = structuredClone(INSTRUMENTS.viola); custom.modes = { beginner:{ maxB:2 } }
  const inherited = solveFingering(notes, { instrument:custom, mode:'beginner', templates:false })
  assert.ok(inherited.assignments.filter(assignment => assignment.playable).every(assignment => !assignment.extension))
  custom.modes.beginner.allowExtensions = true
  const explicit = solveFingering(notes, { instrument:custom, mode:'beginner', templates:false })
  assert.deepEqual(explicit.assignments.slice(11, 14).map(assignment => assignment.finger), [2, 3, 1])

  const bass = solveFingering([{ pitch:51, on:0, off:1 }], { instrument:'bass', mode:'beginner', templates:false })
  assert.ok(bass.assignments.every(assignment => !assignment.playable || !assignment.extension))
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

test('double bass: Simandl 1-2-4 low down, 1-2-3 at the crook, thumb position from the octave (research 04 §7.4)', () => {
  for (const id of ['bass-1st', 'bass-half', 'bass-3rd', 'bass-d', 'bass-d-beg', 'bass-g', 'bass-4th', 'bass-crook', 'bass-thumb', 'bass-thumb3']) exact(id)
  // finger 3 never plays alone in the lower positions (b ≤ 8), and the thumb only from the neck heel up
  for (const id of ['bass-walk', 'bass-solo']) {
    const { notes } = run(id)
    for (const n of notes) {
      if (n.finger === 3 && !n.thumb) assert.ok(n.base >= 9, `${id}: 3 at b${n.base}`)
      if (n.thumb) assert.ok(n.base >= 7)
      assert.equal(INSTRUMENTS.bass.open[n.string] + (n.finger ? n.base + n.offset : 0), n.pitch)
    }
  }
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

test('out-of-range notes are rejected while oversized chord notes receive divisi fingerings', () => {
  const notes = line([40, 55, 62, [55, 62, 69, 76, 83]], { dur:0.5 })
  const result = solveFingering(notes)
  assert.equal(result.assignments[0].reason, 'range')
  const divisi = result.assignments.filter(assignment => assignment.divisi)
  assert.ok(divisi.length >= 1)
  assert.ok(divisi.every(assignment => assignment.playable && assignment.advisory === 'chord-capacity'))
  assert.ok(divisi.every(assignment => Number.isInteger(assignment.string) && Number.isInteger(assignment.finger)))
})

test('hand-incompatible simultaneous notes retain independent divisi fingerings', () => {
  const notes = line([[55, 56, 57]], { dur:1 })
  const result = solveFingering(notes, { preserveHeldNotes:false, templates:false })
  assert.ok(result.assignments.every(assignment => assignment.playable))
  assert.equal(result.assignments.filter(assignment => assignment.divisi).length, 2)
  assert.equal(result.diagnostics.filter(diagnostic => diagnostic.code === 'chord-capacity').length, 2)
  const alternatives = suggestFingerings(notes, { preserveHeldNotes:false, templates:false, limit:3, candidatePool:24 })
  assert.ok(alternatives.suggestions.length >= 2, 'fixed divisi fallbacks do not consume k-best diversity')
  assert.ok(alternatives.suggestions.every(suggestion => suggestion.assignments.every(assignment => assignment.playable)))
  assert.ok(alternatives.suggestions.every(suggestion => suggestion.assignments.filter(assignment => assignment.divisi).length === 2))
  const publicNotes = notes.map((note, index) => ({ ...note, ...result.assignments[index] }))
  assert.deepEqual(onePlayerNotes(publicNotes).map(note => note.pitch), [57], 'immutable divisi assignments stay out of one-player consumers')
  const roundTrip = parseCSV(writeFingeringCSV(publicNotes, { secPerBeat:0.6 }), { secPerBeat:0.6 })
  assert.deepEqual(roundTrip.map(note => note.pitch), notes.map(note => note.pitch))
  assert.ok(roundTrip.every((note, index) => Math.abs(note.on - notes[index].on) < 0.001 && Math.abs(note.off - notes[index].off) < 0.001))
  assert.deepEqual(roundTrip.map(note => note.truth?.finger), result.assignments.map(assignment => assignment.finger))
  assert.equal(roundTrip.filter(note => note.divisi && note.advisory === 'chord-capacity').length, 2)
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

test('motion excludes independent divisi fallbacks from one-player animation', () => {
  const notes = line([[55, 56, 57]], { dur:1 })
  fingerLine(notes, { templates:false })
  assert.equal(notes.filter(note => note.divisi && Number.isInteger(note.string)).length, 2)
  const retained = onePlayerNotes(notes).map(note => note.pitch)
  assert.deepEqual(fingerTokens(notes).length, retained.length)
  const sounding = buildMotion(notes).poseAt(0.5).sounding.map(note => note.pitch)
  assert.deepEqual(sounding, retained)
})

test('legacy pages share the one-player filter and CSV preserves divisi metadata', () => {
  const transport = [{ pitch:57, on:0, off:1, string:0 }, { pitch:55, on:0, off:10, string:0, divisi:true }]
  assert.equal(Math.max(...onePlayerNotes(transport).map(note => note.off)), 1, 'a divisi-only tail cannot extend one-player transport')
  const source = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  for (const file of ['033_violin_fingering.html', '037_violinist.html', '038_duo.html']) {
    assert.match(source(file), /onePlayerNotes/, `${file} must exclude divisi-only notes from one-player output`)
  }
  const page33 = source('033_violin_fingering.html'), page37 = source('037_violinist.html'), page38 = source('038_duo.html')
  assert.match(page33, /state\.duration = playerNotes\.reduce/)
  assert.match(page37, /notes:playerNotes/)
  assert.match(page38, /violin:playerViolin/)
  assert.match(page33, /writeFingeringCSV/)
  assert.match(page33, /divisi-only chord notes/)
  const csvModule = fs.readFileSync(new URL('../tnua.js', import.meta.url), 'utf8')
  assert.match(csvModule, /pitch,start,duration,beat_type,string,position,finger,divisi,advisory/)
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


test('out-of-range notes do not evict playable notes from oversized chords', () => {
  const notes = line([[55, 62, 69, 76, 120]], { dur:1 })
  const result = solveFingering(notes)
  assert.equal(result.assignments[4].reason, 'range')
  assert.ok(result.assignments.slice(0, 4).every(assignment => assignment.playable))
})

test('solveFingering is immutable and returns input-aligned frozen assignments', () => {
  const notes = [{ id: 'later', pitch: 71, on: 0.5, off: 1 }, { id: 'first', pitch: 69, on: 0, off: 0.45 }]
  const before = structuredClone(notes)
  const r = solveFingering(notes, { instrument: 'violin' })
  assert.deepEqual(notes, before)
  assert.deepEqual(r.assignments.map(a => a.id), ['later', 'first'])
  assert.ok(r.assignments.every(a => a.playable && Number.isInteger(a.string) && Number.isInteger(a.finger)))
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.assignments) && r.assignments.every(Object.isFrozen))
  assert.throws(() => { r.assignments[0].finger = 9 }, TypeError)
})

test('the exact instrument model determines range, including extended fourth finger', () => {
  const notes = [{ pitch: 105, on: 0, off: 1 }]
  const r = solveFingering(notes, { instrument: 'violin', templates: false })
  assert.equal(r.assignments[0].playable, true)
  assert.equal(INSTRUMENTS.violin.open[r.assignments[0].string] + r.assignments[0].base + r.assignments[0].offset, 105)
})

test('legacy repeated solves clear every computed field', () => {
  const notes = [{ pitch: 76, on: 0, off: 1 }]
  fingerLine(notes)
  assert.ok(notes[0].position != null)
  notes[0].pitch = 20
  fingerLine(notes)
  assert.equal(notes[0].unplayable, 'range')
  for (const key of ['string', 'finger', 'base', 'offset', 'position', 'ext', 'thumb', 'heldLock']) assert.equal(key in notes[0], false, key)
})

test('diagnostics distinguish range, chord capacity, constraints and skipped notes', () => {
  const notes = [
    { id: 'low', pitch: 20, on: 0, off: 1 },
    { id: 'locked', pitch: 83, on: 1, off: 2, lockString: 0 },
    ...[55, 62, 69, 76, 83].map((pitch, i) => ({ id: `chord-${i}`, pitch, on: 2, off: 3 })),
    { id: 'skip', pitch: 69, on: 3, off: 4, skip: true },
  ]
  const r = solveFingering(notes)
  const byId = new Map(r.assignments.map(a => [a.id, a]))
  assert.equal(byId.get('low').reason, 'range')
  assert.equal(byId.get('locked').reason, 'constraint')
  assert.equal(byId.get('skip').reason, 'skipped')
  const divisi = [...byId.values()].filter(assignment => assignment.divisi)
  assert.ok(divisi.length >= 1)
  assert.ok(divisi.every(assignment => assignment.playable && assignment.advisory === 'chord-capacity'))
  assert.deepEqual(r.diagnostics.filter(d => d.code !== 'chord-capacity').map(d => d.code), r.assignments.filter(a => !a.playable).map(a => a.reason))
  assert.equal(r.diagnostics.filter(d => d.code === 'chord-capacity').length, divisi.length)
})

test('validated inputs fail early with stable messages', () => {
  assert.throws(() => solveFingering(null), /notes must be an array/)
  assert.throws(() => solveFingering([{ pitch: 69, on: 1, off: 0 }]), /off must be greater than on/)
  assert.throws(() => solveFingering([{ pitch: NaN, on: 0, off: 1 }]), /pitch must be a finite number/)
  assert.throws(() => solveFingering([{ pitch: 69, on: 0, off: 1 }], { instrument: 'kazoo' }), /unknown instrument/)
  assert.throws(() => solveFingering([{ pitch:69, on:0, off:1, lockString:4 }]), /lockString/)
  const invalidMode = structuredClone(INSTRUMENTS.violin); invalidMode.modes = { beginner:{ allowExtensions:'sometimes' } }
  assert.throws(() => solveFingering([{ pitch:69, on:0, off:1 }], { instrument:invalidMode, mode:'beginner' }), /allowExtensions/)
})

test('equivalent custom instruments keep preset behavior, including templates', () => {
  const custom = structuredClone(INSTRUMENTS.viola)
  const notes = EX['viola-a2'].notes
  const named = solveFingering(notes, { instrument: 'viola' })
  const supplied = solveFingering(notes, { instrument: custom })
  assert.deepEqual(supplied.assignments, named.assignments)
})

test('held-note planning is immutable, works with custom instruments, and leaves no generated locks', () => {
  const custom = structuredClone(INSTRUMENTS.violin)
  const notes = [{ id: 'held', pitch: 55, on: 0, off: 2 }, { id: 'moving', pitch: 62, on: 0.5, off: 1 }]
  const before = structuredClone(notes)
  const r = solveFingering(notes, { instrument: custom })
  assert.deepEqual(notes, before)
  const held = r.assignments[0]
  assert.ok(r.assignments.slice(1).every(a => a.string !== held.string))
  const legacy = structuredClone(notes)
  assert.ok(fingerHeld(legacy, { instrument: custom }) > 0)
  assert.ok(legacy.every(n => !n.heldLock && n.lockString == null))
})


test('event duration is recomputed after an oversize chord is thinned', () => {
  const notes = [
    { pitch: 55, on: 0, off: 0.1 },
    ...[62, 69, 76, 83].map(pitch => ({ pitch, on: 0, off: 2 })),
  ]
  const r = fingerLine(notes)
  assert.equal(notes[0].unplayable, 'chord')
  assert.ok(Number.isInteger(notes[0].string), 'pruned note keeps an independent divisi fingering')
  assert.equal(r.events[0].dur, 2)
})


test('held-note re-solving cannot move the held note onto the relocated voice', () => {
  const notes = [{ pitch: 63, on: 0, off: 2 }, { pitch: 62, on: 0.5, off: 1 }]
  const r = solveFingering(notes)
  assert.equal(r.assignments.every(a => a.playable), true)
  assert.notEqual(r.assignments[0].string, r.assignments[1].string)
})

test('held-note relocation preserves every otherwise-playable chord note', () => {
  const notes = [{ pitch: 69, on: 0, off: 2 }, { pitch: 75, on: 0.5, off: 1 }, { pitch: 83, on: 0.5, off: 1 }]
  const plain = solveFingering(notes, { preserveHeldNotes: false })
  const held = solveFingering(notes)
  assert.ok(plain.assignments.every(a => a.playable))
  assert.ok(held.assignments.every(a => a.playable))
  assert.notEqual(held.assignments[0].string, held.assignments[1].string)
  assert.notEqual(held.assignments[0].string, held.assignments[2].string)
})

test('custom profile validation rejects incomplete frames and keeps costs finite', () => {
  const note = [{ pitch: 57, on: 0, off: 1 }]
  assert.throws(() => solveFingering(note, { instrument: { open: [55], strings: ['X'], L: 328, maxB: [14], frameList: [{ f: 1, o: 0 }] } }), /frameList.*cost/)
  const wide = { ...structuredClone(INSTRUMENTS.violin), open: [40], strings: ['X'], maxB: [40] }
  const r = solveFingering([{ pitch: 73, on: 0, off: 1 }], { instrument: wide })
  assert.ok(r.assignments[0].playable && Number.isFinite(r.cost))
})

test('event onset is recomputed when its earliest note is removed', () => {
  const notes = [{ pitch: 69, on: 0, off: 0.05 }, { pitch: 20, on: 0.08, off: 0.2 }, { pitch: 76, on: 0.105, off: 0.3 }]
  const r = fingerLine(notes)
  assert.equal(notes[1].unplayable, 'range')
  assert.equal(r.events[1].on, 0.105)
})

test('held-note detection follows chordTolerance instead of a fixed onset threshold', () => {
  const notes = [{ pitch: 55, on: 0, off: 1 }, { pitch: 62, on: 0.01, off: 0.5 }]
  const r = solveFingering(notes, { chordTolerance: 0 })
  assert.notEqual(r.assignments[0].string, r.assignments[1].string)
  assert.equal(r.movedHeldNotes, 1)
})

test('mode validation rejects inherited object property names', () => {
  const notes = [{ pitch: 69, on: 0, off: 1 }]
  for (const mode of ['toString', 'constructor', '__proto__', '']) assert.throws(() => solveFingering(notes, { mode }), /unknown fingering mode/)
})


test('held conflicts use event membership for chained onset groups', () => {
  const notes = [55, 62, 69].map((pitch, i) => ({ pitch, on: i * 0.02, off: 1 }))
  const r = solveFingering(notes)
  assert.equal(r.assignments.every(a => a.playable), true)
  assert.notEqual(r.assignments[1].string, r.assignments[2].string)
})

test('held-note search backtracks across multiple conflicts', () => {
  const notes = [
    { pitch: 69, on: 0, off: 1.01 },
    { pitch: 67, on: 0.2, off: 0.41 },
    { pitch: 68, on: 0.4, off: 0.61 },
    { pitch: 76, on: 0.6, off: 1.01 },
  ]
  const r = solveFingering(notes)
  assert.equal(r.assignments.every(a => a.playable), true)
  for (let i = 0; i < notes.length; i++) for (let j = 0; j < i; j++) {
    if (notes[j].off > notes[i].on + 0.001) assert.notEqual(r.assignments[j].string, r.assignments[i].string)
  }
})


test('weight and frame shapes that cannot produce finite states are rejected', () => {
  const notes = [{ pitch: 55, on: 0, off: 1 }, { pitch: 76, on: 1, off: 2 }]
  for (const cross of [1, [0]]) assert.throws(() => solveFingering(notes, { weights: { cross } }), /weight "cross"/)
  const fractional = { open: [55], strings: ['X'], L: 328, maxB: [14], frameList: [{ f: 1, o: 0.5, c: 0 }] }
  assert.throws(() => solveFingering([{ pitch: 57, on: 0, off: 1 }], { instrument: fractional }), /frameList\[0\]\.o must be an integer/)
})


test('unresolvable user-locked held conflicts are explicit diagnostics', () => {
  const notes = [{ pitch: 55, on: 0, off: 1, lockString: 0 }, { pitch: 62, on: 0.5, off: 1, lockString: 0 }]
  const r = solveFingering(notes)
  assert.equal(r.unresolvedHeldConflicts, 1)
  assert.deepEqual(r.diagnostics.map(d => d.code), ['held-conflict'])
  assert.deepEqual({ index: r.diagnostics[0].index, relatedIndex: r.diagnostics[0].relatedIndex }, { index: 1, relatedIndex: 0 })
})


test('merged custom configuration either stays finite or fails explicitly', () => {
  const note = [{ pitch: 69, on: 0, off: 2 }]
  const badMode = { ...structuredClone(INSTRUMENTS.violin), modes: { broken: { maxB: 'bad' } } }
  assert.throws(() => solveFingering(note, { instrument: badMode, mode: 'broken' }), /mode "broken".*maxB/)
  const badBounds = { open: [55], strings: ['X'], L: 328, maxB: [14], frameList: [{ f: 1, o: 0, c: () => NaN, bMin: undefined }] }
  assert.throws(() => solveFingering([{ pitch: 57, on: 0, off: 1 }], { instrument: badBounds }), /bMin must be from 1 to 127/)
  assert.throws(() => solveFingering([{ pitch: 76, on: 0, off: 2 }], { weights: { openLong: Number.MAX_VALUE } }), /non-finite fingering cost/)
  const frame = Object.fromEntries([1, 2, 3, 4].map(f => [f, { 0: [0, 0] }]))
  const wide = { open: [0], strings: ['X'], L: 328, maxB: [127], frame }
  const r = solveFingering([{ pitch: 100, on: 0, off: 1 }], { instrument: wide })
  assert.ok(r.assignments[0].playable && Number.isFinite(r.cost))
})


test('suggestFingerings returns ranked, distinct, immutable alternatives', () => {
  const notes = melody('G4 A4 B4 C5 D5 E5 F#5 G5 A5 B5', 0.3)
  const before = structuredClone(notes)
  const r = suggestFingerings(notes, { limit: 4, minChanges: 2, candidatePool: 80 })
  assert.deepEqual(notes, before)
  assert.ok(r.suggestions.length >= 2 && r.suggestions.length <= 4)
  assert.equal(r.suggestions[0].label, 'Recommended')
  assert.deepEqual(r.suggestions[0].assignments, solveFingering(notes).assignments)
  for (let i = 0; i < r.suggestions.length; i++) {
    const s = r.suggestions[i]
    assert.equal(s.rank, i + 1)
    assert.ok(Number.isFinite(s.cost) && s.costDelta >= 0)
    if (i) assert.ok(s.cost >= r.suggestions[i - 1].cost && s.changes.notes >= 2)
  }
  const keys = r.suggestions.map(s => s.assignments.map(a => a.playable ? `${a.string}/${a.finger}/${a.base}` : `x:${a.reason}`).join('|'))
  assert.equal(new Set(keys).size, keys.length)
  for (let i = 0; i < r.suggestions.length; i++) for (let j = 0; j < i; j++) {
    const changed = r.suggestions[i].assignments.filter((a, k) => {
      const b = r.suggestions[j].assignments[k]
      return a.playable !== b.playable || a.reason !== b.reason || a.string !== b.string || a.finger !== b.finger || a.base !== b.base || a.thumb !== b.thumb
    }).length
    assert.ok(changed >= 2, `suggestions ${j + 1} and ${i + 1}: ${changed} changes`)
  }
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.suggestions) && r.suggestions.every(s => Object.isFrozen(s) && Object.isFrozen(s.assignments) && Object.isFrozen(s.changes)))
})

test('suggestion limits and cost windows are enforced', () => {
  const notes = melody('G4 B4 D5 G5 F#5 D5 B4 G4', 0.35)
  const one = suggestFingerings(notes, { limit: 1 })
  assert.equal(one.suggestions.length, 1)
  const tight = suggestFingerings(notes, { limit: 8, maxCostDelta: 0 })
  assert.ok(tight.suggestions.every(s => s.costDelta <= 1e-9))
  assert.throws(() => suggestFingerings(notes, { limit: 0 }), /limit/)
  assert.throws(() => suggestFingerings(notes, { minChanges: 0 }), /minChanges/)
  assert.throws(() => suggestFingerings(notes, { candidatePool: 1 }), /candidatePool/)
  assert.throws(() => suggestFingerings(notes, { maxCostDelta: -1 }), /maxCostDelta/)
})

test('suggestions preserve locks, diagnostics, held voices and input order', () => {
  const notes = [
    { id: 'late', pitch: 62, on: 0.5, off: 1, lockString: 1 },
    { id: 'held', pitch: 55, on: 0, off: 2 },
    { id: 'bad', pitch: 20, on: 2, off: 3 },
    { id: 'tail', pitch: 67, on: 1, off: 1.5 },
  ]
  const r = suggestFingerings(notes, { limit: 4, minChanges: 1 })
  assert.ok(r.diagnostics.some(d => d.id === 'bad' && d.code === 'range'))
  for (const suggestion of r.suggestions) {
    assert.deepEqual(suggestion.assignments.map(a => a.id), notes.map(n => n.id))
    assert.equal(suggestion.assignments[0].string, 1)
    const held = suggestion.assignments[1]
    for (const i of [0, 3]) if (notes[i].on < notes[1].off && notes[i].off > notes[1].on) assert.notEqual(suggestion.assignments[i].string, held.string)
  }
})


test('suggestion costs use the exact solve recurrence and never rank below recommended', () => {
  const notes = [80, 59].map((pitch, i) => ({ pitch, on: i * 0.25, off: i * 0.25 + 0.2 }))
  const r = suggestFingerings(notes, { limit: 10, minChanges: 1, candidatePool: 128, preserveHeldNotes: false, templates: false })
  const best = solveFingering(notes, { preserveHeldNotes: false, templates: false })
  assert.equal(r.suggestions[0].cost, best.cost)
  for (let i = 0; i < r.suggestions.length; i++) {
    assert.equal(r.suggestions[i].costDelta, r.suggestions[i].cost - best.cost)
    assert.ok(r.suggestions[i].cost >= best.cost)
    if (i) assert.ok(r.suggestions[i].cost >= r.suggestions[i - 1].cost)
  }
})

test('maximum candidate pool reconstructs deterministic zero-cost ties', () => {
  const weights = Object.fromEntries(Object.entries(DEFAULTS.weights).map(([key, value]) => [key, Array.isArray(value) ? value.map(() => 0) : 0]))
  const notes = melody('G4 A4 B4 C5', 0.3)
  const r = suggestFingerings(notes, { limit: 10, minChanges: 1, candidatePool: 128, weights, templates: false, preserveHeldNotes: false })
  assert.equal(r.candidatePaths, 128)
  assert.ok(r.suggestions.length > 1)
  assert.ok(r.suggestions.every(s => s.cost === 0 && s.costDelta === 0))
})


test('finite path costs never expose an overflowing cost delta', () => {
  const weights = Object.fromEntries(Object.entries(DEFAULTS.weights).map(([key, value]) => [key, Array.isArray(value) ? value.map(() => 0) : 0]))
  weights.pos = Array(128).fill(9e307); weights.pos[5] = -9e307
  const r = suggestFingerings([{ pitch: 75, on: 0, off: 1 }], { limit: 10, minChanges: 1, candidatePool: 128, weights, templates: false, preserveHeldNotes: false })
  assert.ok(r.suggestions.length >= 1)
  assert.ok(r.suggestions.every(s => Number.isFinite(s.cost) && Number.isFinite(s.costDelta)))
})


test('held-safe fallback resolves long overlapping passages beyond the cost-search cap', () => {
  const notes = Array.from({ length:12 }, (_, i) => ({ pitch:76, on:i * 0.2, off:i * 0.2 + 0.79 }))
  const result = solveFingering(notes)
  assert.ok(result.assignments.every(assignment => assignment.playable))
  assert.equal(result.unresolvedHeldConflicts, 0)
  for (let i = 0; i < notes.length; i++) for (let j = 0; j < i; j++) {
    if (notes[j].off > notes[i].on + 0.001) assert.notEqual(result.assignments[j].string, result.assignments[i].string)
  }
})

test('held-note planning stays fast on a long two-voice line (windowed search)', () => {
  // 400 notes: a held note every bar under a moving voice that keeps landing on
  // its string (98 overlaps), as a concerto's double-stop passages. The search
  // over the whole line took about 130 s here (and hours on a concerto
  // movement, which read as a hang); windowed, about 2.5 s
  const notes = []
  const scale = [71, 73, 74, 76, 78, 76, 74, 73]
  for (let bar = 0; bar < 50; bar++) {
    const t = bar * 2
    notes.push({ pitch: [69, 71, 66][bar % 3], on: t, off: t + 1.9 })
    for (let k = 0; k < 7; k++) notes.push({ pitch: scale[(bar + k) % 8], on: t + 0.25 * (k + 1), off: t + 0.25 * (k + 1) + 0.24 })
  }
  const t0 = performance.now()
  const r = solveFingering(notes)
  const ms = performance.now() - t0
  assert.ok(ms < 15000, `took ${ms.toFixed(0)} ms`)
  assert.equal(r.unresolvedHeldConflicts, 0)
  assert.ok(r.assignments.every(a => a.playable))
})
