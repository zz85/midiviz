// node --test score-fingering/test/adapter.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sourceNoteId, buildFingeringInput, planFingering, annotationItems, hitAnnotation } from '../adapter.js'
import { makeEvents } from '../../strings/fingering.js'

const pitch = midi => {
  const natural = [0, 2, 4, 5, 7, 9, 11]
  const octave = Math.floor(midi / 12) - 1
  let step = 0
  for (let i = 0; i < natural.length; i++) if (natural[i] <= midi % 12) step = i
  return { d: octave * 7 + step, alter: midi - (12 * (octave + 1) + natural[step]) }
}
const note = (midi, x, y, st) => ({ pitch: pitch(midi), x, y, st, stem: { dir: x % 2 ? -1 : 1 } })
function fixture() {
  const st0 = { index: 0 }, st1 = { index: 1 }
  const a = note(55, 100, 80, st0), b = note(62, 140, 76, st0), c = note(64, 180, 72, st0)
  const other = note(48, 100, 180, st1)
  const measure = (part, st, events) => ({ part, st, index: 0, number: 1, status: 'ok', ticks: 288, events })
  const p0 = { index: 0, staves: [st0], measures: [measure(0, st0, [
    { kind: 'note', notes: [a], dur: 4, dots: 0, voice: 0 },
    { kind: 'note', notes: [b], dur: 4, dots: 0, voice: 0 },
    { kind: 'note', notes: [c], dur: 4, dots: 0, voice: 0 },
  ])] }
  const p1 = { index: 1, staves: [st1], measures: [measure(1, st1, [{ kind: 'note', notes: [other], dur: 2, dots: 1, voice: 0 }])] }
  return { score: { parts: [p0, p1], measures: [...p0.measures, ...p1.measures] }, notes: { a, b, c, other } }
}

test('adapter keeps part order, source identity, timing, pitches and stable coordinate ids', () => {
  const { score, notes } = fixture()
  const built = buildFingeringInput(score, 0, { quarterSeconds: 1 })
  assert.deepEqual(built.notes.map(n => [n.pitch, n.on, n.off]), [[55, 0, 1], [62, 1, 2], [64, 2, 3]])
  assert.deepEqual(built.sources, [notes.a, notes.b, notes.c])
  assert.deepEqual(built.notes.map(n => n.id), ['0:100:80', '0:140:76', '0:180:72'])
  assert.equal(buildFingeringInput(score, 1).notes[0].pitch, 48)
  assert.throws(() => buildFingeringInput(score, 2), /part 2/)
})

test('adapter handles chords, voices, grace durations and manual string locks', () => {
  const st = { index: 0 }, lo = note(55, 100, 90, st), hi = note(62, 100, 70, st), grace = note(64, 120, 65, st), principal = note(65, 140, 64, st)
  const score = { parts: [{ index: 0, staves: [st], measures: [{ st, status: 'ok', ticks: 96, events: [
    { kind: 'note', notes: [lo, hi], dur: 4, dots: 0, voice: 0 },
    { kind: 'note', notes: [grace], dur: 8, dots: 0, grace: true, voice: 1 },
    { kind: 'note', notes: [principal], dur: 4, dots: 0, voice: 1 },
  ] }] }] }
  const locks = new Map([['0:100:90', 0]])
  const built = buildFingeringInput(score, 0, { locks })
  assert.equal(built.notes.length, 4)
  assert.equal(built.notes[0].on, built.notes[1].on)
  assert.equal(built.notes[0].lockString, 0)
  assert.ok(built.notes[2].off > built.notes[2].on)
  assert.ok(built.notes[2].on < built.notes[3].on, 'grace precedes its principal note')
  const fast = buildFingeringInput(score, 0, { quarterSeconds:60 / 260 })
  assert.ok(makeEvents(fast.notes, 0.001).every(event => !event.notes.some(n => n.id === fast.notes[2].id) || event.notes.length === 1), 'grace is not a chord at 260 bpm')
})

test('planning returns alternatives aligned to photographed symbols without mutation', () => {
  const { score, notes } = fixture(), before = JSON.stringify(score)
  const plan = planFingering(score, 0, { instrument: 'violin', limit: 3, minChanges: 1, candidatePool: 32 })
  assert.equal(JSON.stringify(score), before)
  assert.deepEqual(plan.sources, [notes.a, notes.b, notes.c])
  assert.ok(plan.suggestions.length >= 2)
  assert.ok(plan.suggestions.every(s => s.assignments.length === 3))
})


test('tied equal pitches become one duration-sensitive fingering attack', () => {
  const st = { index:0 }, first = note(69, 100, 80, st), continuation = note(69, 140, 80, st)
  first.tie = true
  const score = { parts:[{ measures:[{ st, status:'ok', ticks:96, events:[
    { kind:'note', notes:[first], dur:8, dots:0, voice:0, tie:true },
    { kind:'note', notes:[continuation], dur:8, dots:0, voice:0, tie:false },
  ] }] }] }
  const built = buildFingeringInput(score, 0, { quarterSeconds:1 })
  assert.equal(built.notes.length, 1)
  assert.equal(built.notes[0].off - built.notes[0].on, 1)
  assert.deepEqual(built.sourceGroups[0], [first, continuation])
})


test('source ids survive pitch correction and collocated-note deletion', () => {
  const st = { index: 2 }, a = note(60, 100, 80, st), b = note(62, 100, 80, st), c = note(64, 100, 80, st)
  const score = { parts: [{ measures: [{ st, status:'ok', ticks:288, events:[a, b, c].map(n => ({ kind:'note', notes:[n], dur:4, dots:0, voice:0 })) }] }] }
  const first = buildFingeringInput(score).notes.map(n => n.id)
  b.y = 72
  assert.equal(sourceNoteId(b), first[1], 'pitch correction keeps identity')
  score.parts[0].measures[0].events.shift()
  const second = buildFingeringInput(score).notes.map(n => n.id)
  assert.deepEqual(second, first.slice(1), 'removing a collocated note does not transfer ids')
})

test('annotation items use finger labels, sparse string/position changes and hit testing', () => {
  const { score } = fixture()
  const plan = planFingering(score, 0, { instrument: 'violin', limit: 2, minChanges: 1, candidatePool: 32 })
  const items = annotationItems(plan, 0, { instrument: 'violin' })
  assert.equal(items.length, 3)
  assert.ok(items.every(i => /^([0-4T]|×)$/.test(i.fingerLabel)))
  assert.ok(items[0].showString)
  assert.ok(items.some(i => i.showPosition))
  assert.equal(hitAnnotation(items, items[1].x + 1, items[1].y - 1), items[1])
  assert.equal(hitAnnotation(items, items[1].labelX, items[1].labelY), items[1])
  assert.equal(hitAnnotation(items, -100, -100), null)
})


test('incompatible overlapping string locks become visible annotation warnings', () => {
  const st = { index:0 }, held = note(55, 100, 80, st), moving = note(62, 140, 75, st)
  const score = { parts:[{ measures:[{ st, status:'ok', ticks:192, events:[
    { kind:'note', notes:[held], dur:2, dots:0, voice:0 },
    { kind:'rest', dur:4, dots:0, voice:1 },
    { kind:'note', notes:[moving], dur:4, dots:0, voice:1 },
  ] }] }] }
  const locks = new Map([['0:100:80', 0], ['0:140:75', 0]])
  const plan = planFingering(score, 0, { locks, limit:2, minChanges:1, candidatePool:16 })
  assert.ok(plan.diagnostics.some(diagnostic => diagnostic.code === 'held-conflict'))
  assert.ok(annotationItems(plan).some(item => item.warnings.some(warning => warning.code === 'held-conflict')))
})


test('an open tie expires when the next same-voice event has another pitch', () => {
  const st = { index:0 }, a1 = note(69, 100, 80, st), b = note(71, 120, 75, st), a2 = note(69, 140, 80, st)
  a1.tie = true
  const score = { parts:[{ measures:[{ st, status:'ok', ticks:144, events:[a1, b, a2].map(source => ({ kind:'note', notes:[source], dur:8, dots:0, voice:0 })) }] }] }
  const built = buildFingeringInput(score, 0, { quarterSeconds:1 })
  assert.deepEqual(built.notes.map(input => input.pitch), [69, 71, 69])
  assert.deepEqual(built.notes.map(input => input.off - input.on), [0.5, 0.5, 0.5])
})
