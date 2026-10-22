// node --test score-fingering/test/integration.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { decodeGray } from './png.js'
import { normalize, analyze } from '../scoreshift/omr.js'
import { buildScore } from '../scoreshift/score.js'
import { midiOf } from '../scoreshift/theory.js'
import { makeEvents } from '../../strings/fingering.js'
import { planFingering, annotationItems } from '../adapter.js'

const fixture = new URL('./fixtures/minuet.png', import.meta.url)

test('local ScoreShift snapshot recognizes and fingers a complete engraved page', () => {
  const image = decodeGray(fs.readFileSync(fixture))
  const model = analyze(normalize(image))
  const score = buildScore(model)
  const plan = planFingering(score, 0, { instrument:'violin', limit:3, minChanges:1, candidatePool:32 })
  const annotations = annotationItems(plan)
  assert.equal(model.staves.length, 4)
  assert.equal(model.notes.length, 96)
  assert.equal(score.measures.length, 24)
  assert.equal(plan.notes.length, 96)
  assert.equal(plan.suggestions[0].assignments.filter(assignment => assignment.playable).length, 96)
  assert.equal(plan.diagnostics.length, 0)
  assert.equal(annotations.length, 96)
  assert.ok(plan.suggestions.length >= 2)
  assert.ok(annotations.some(item => item.showString) && annotations.some(item => item.showPosition))
})


test('recognized grace notes are sequenced before principals, not fingered as double stops', () => {
  const image = decodeGray(fs.readFileSync(new URL('./fixtures/grace.png', import.meta.url)))
  const truth = JSON.parse(fs.readFileSync(new URL('./fixtures/grace.json', import.meta.url)))
  const norm = normalize(image), model = analyze(norm), score = buildScore(model)
  assert.equal(truth.notes.length, 30); assert.equal(truth.notes.filter(note => note.grace).length, 8)
  assert.equal(model.notes.length, 29, 'snapshot has one known missed head')
  assert.equal(model.notes.filter(note => note.grace).length, 7, 'snapshot finds seven of eight graces')
  // Consume the fixture coordinates and pitch oracle: one omission and two
  // accidental disagreements are known for this font, but spatial recall is high.
  const [a, b, c, d, e, f] = norm.A, det = a * e - b * d
  const toNorm = (x, y) => [(e * (x - c) - b * (y - f)) / det, (-d * (x - c) + a * (y - f)) / det]
  const used = new Set(), matchedTruth = new Set(); let matched = 0, pitchMatches = 0
  for (const expected of truth.notes) {
    const [x, y] = toNorm(expected.x, expected.y)
    let best = null, distance = 0.7 * 16
    for (const found of model.notes) if (!used.has(found)) {
      const candidate = Math.hypot(found.x - x, found.y - y)
      if (candidate < distance) { distance = candidate; best = found }
    }
    if (!best) continue
    used.add(best); matchedTruth.add(expected); matched++
    if (midiOf(best.pitch) === expected.midi) pitchMatches++
  }
  assert.ok(matched >= 28, `${matched}/30 noteheads tightly matched`)
  assert.ok(pitchMatches >= 26, `${pitchMatches}/30 pitches tightly matched`)
  const unmatched = model.notes.filter(note => !used.has(note)), missed = truth.notes.filter(note => !matchedTruth.has(note))
  const displacedPairs = unmatched.flatMap(found => missed.flatMap(expected => {
    const [x, y] = toNorm(expected.x, expected.y)
    return !!expected.grace && found.grace && midiOf(found.pitch) === expected.midi && Math.hypot(found.x - x, found.y - y) < 1.5 * 16 ? [{ found, expected }] : []
  }))
  assert.equal(displacedPairs.length, 1, 'one known grace is displaced by about 1.3 staff spaces')
  assert.deepEqual(displacedPairs[0].expected.ev, [4, 0]); assert.equal(displacedPairs[0].expected.midi, 76)
  const omitted = missed.filter(expected => expected !== displacedPairs[0].expected)
  assert.equal(omitted.length, 1, 'one grace head remains omitted')
  assert.ok(omitted[0].grace); assert.deepEqual(omitted[0].ev, [2, 0]); assert.equal(omitted[0].midi, 71)
  const plan = planFingering(score, 0, { instrument:'violin', quarterSeconds:60 / 260, limit:2, minChanges:1, candidatePool:24 })
  const sourceById = new Map(plan.notes.map((input, index) => [input.id, plan.sources[index]]))
  const events = makeEvents(plan.notes, 0.001)
  const graceEvents = events.filter(event => event.notes.some(input => sourceById.get(input.id)?.grace))
  assert.equal(graceEvents.length, 7)
  assert.ok(graceEvents.every(event => event.notes.every(input => sourceById.get(input.id)?.grace)), 'no grace/principal mixed solver event')
  for (const event of graceEvents) {
    const grace = event.notes[0]
    assert.ok(plan.notes.some(note => note.on > grace.on && note.on - grace.on <= 0.081), `principal after grace ${grace.id}`)
  }
  // Moving the grace back must not leave the previous same-voice note held under it.
  for (const event of graceEvents) for (const grace of event.notes) {
    assert.ok(!plan.notes.some(note => note !== grace && note.on < grace.on && note.off > grace.on + 0.001), `no false sustain under ${grace.id}`)
  }
})
