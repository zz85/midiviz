// node --test score-fingering/test/reader.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { decodeGray } from './png.js'
import { normalize, analyze, lineY } from '../../../random-sketches/vibes/scoreshift/omr.js'
import { buildScore } from '../../../random-sketches/vibes/scoreshift/score.js'
import { performance } from '../../../random-sketches/vibes/scoreshift/export.js'
import { fromScoreShift } from '../../../random-sketches/vibes/notation-ir/adapters/scoreshift.js'
import { photoSurface } from '../../../random-sketches/vibes/scoreshift/surface.js'
import { attachStrokes, resolveAnnotation, itemsOf } from '../../../random-sketches/vibes/notation-ir/annotations.js'
import { measureStarts, measureAt, soundingHeads, annotationKey, loadAnnotations, saveAnnotations } from '../reader.js'

const model = analyze(normalize(decodeGray(fs.readFileSync(new URL('./fixtures/minuet.png', import.meta.url)))))
const score = buildScore(model)

test('bar starts follow the playback clock, and a tap finds its bar', () => {
  const starts = measureStarts(score), { events } = performance(model, score)
  for (const measure of score.measures) {
    const first = events.find(event => event.m === measure)
    if (first) assert.equal(starts.get(measure), first.tick, `bar ${measure.index}`)
  }
  const measure = score.measures[5], staff = measure.st, x = (measure.x0 + measure.x1) / 2
  assert.equal(measureAt(score, { x, y:(lineY(staff, 0, x) + lineY(staff, 4, x)) / 2 }), measure)
  assert.equal(measureAt(score, { x, y:lineY(staff, 0, x) - 40 * model.space }), null, 'far from every staff')
})

test('the sounding noteheads are those of the events under the playhead', () => {
  const { events } = performance(model, score)
  const note = events.find(event => event.e.kind === 'note' && event.tick > 0)
  const heads = soundingHeads(events, note.tick)
  assert.ok(note.e.notes.every(head => heads.includes(head)))
  assert.ok(heads.every(head => head.x != null && head.y != null && head.st))
  assert.deepEqual(soundingHeads(events, -1), [])
})

test('ink attaches to a recognized note and survives storage', () => {
  const irc = fromScoreShift(model, score), items = itemsOf(irc.score)
  const surface = photoSurface({ model, score, irc, view:() => ({ X:x => x, Y:y => y, sp:model.space }) })
  const head = score.measures[2].events.find(event => event.kind === 'note').notes[0]
  const stroke = [0, 1, 2, 3].map(k => ({ x:head.x - 4 + 3 * k, y:head.y - 2.5 * model.space + k }))
  const mark = attachStrokes(surface, items, [stroke], { id:'a1' })
  assert.equal(mark.anchor.kind, 'event')
  const store = new Map(), storage = { getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, v), removeItem:k => store.delete(k) }
  const key = annotationKey('score.pdf:123', 2)
  assert.ok(saveAnnotations(storage, key, [mark]))
  const [back] = loadAnnotations(storage, key)
  const drawn = resolveAnnotation(surface, back, items)
  assert.equal(drawn.lost, false)
  assert.ok(Math.abs(drawn.pieces[0].points[0].x - stroke[0].x) < 1e-6 && Math.abs(drawn.pieces[0].points[0].y - stroke[0].y) < 1e-6)
  saveAnnotations(storage, key, []); assert.equal(store.has(key), false)
  assert.deepEqual(loadAnnotations({ getItem:() => '{broken' }, key), [])
  assert.equal(saveAnnotations({ setItem:() => { throw new Error('quota') } }, key, [mark]), false)
})

test('a part on only some systems starts its bars with the bars it stands under', () => {
  const m = (part, ticks, at) => ({ part, ticks, status:'ok', ...(at != null ? { at } : {}) })
  const upper = [m(0, 288), m(0, 288), m(0, 288)], lower = [m(1, 288, 288), m(1, 288, 576)]
  const starts = measureStarts({ parts:[{ measures:upper }, { measures:lower }] })
  assert.deepEqual(upper.map(x => starts.get(x)), [0, 288, 576])
  assert.deepEqual(lower.map(x => starts.get(x)), [288, 576])
})

test('a note is read from the recording on its fingered string, else the closest one', async () => {
  const { pickSample } = await import('../sound.js')
  const note = (midi, extra = {}) => ({ midi, rms:0.03, attackEnd:10, headEnd:100, ...extra })
  const bank = { manifest:{ open:[48, 55, 62, 69] }, packs:new Map([
    [0, { pack:{ notes:[48, 50, 52, 55, 57, 60].map(n => note(n)) } }],
    [1, { pack:{ notes:[55, 57, 59, 62].map(n => note(n)) } }],
    [2, { pack:{ notes:[62, 64, 70].map(n => note(n)) } }],
  ]) }
  assert.equal(pickSample(bank, 57, 0).string, 0, 'the fingered string')
  assert.equal(pickSample(bank, 57, null).string, 1, 'unfingered: the higher string (lower position)')
  assert.equal(pickSample(bank, 66, 2).string, 2, 'nearest on the fingered string when within reach')
  assert.equal(pickSample(bank, 47, null), null, 'below the lowest string')
  assert.equal(pickSample(bank, 66, 1).string, 2, 'the fingered string has nothing close: the closest elsewhere')
})
