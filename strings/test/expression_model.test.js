// The expression model (strings/expression-model.js, violinist/expression-model.json):
// what it does to a score, and how well it predicts players it was not fitted on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readLilyPond } from '../lilypond.js'
import { planArticulation } from '../articulation.js'
import { predictExpression, FEATURES, onsets } from '../expression-model.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const model = JSON.parse(readFileSync(root + 'violinist/expression-model.json', 'utf8'))

test('the model file matches the features the code computes', () => {
  assert.deepEqual(model.features, FEATURES)
  assert.equal(model.tempo.w.length, FEATURES.length)
  assert.equal(model.level.w.length, FEATURES.length)
})

test('a score played by the model: its length kept, onsets in order, a final ritardando, the lane in range, written dynamics heard', () => {
  // eight bars of running eighths, four p then four f, ending on a long note
  const bar = "c8 d e f g a b c, "
  const src = String.raw`\score { \new Staff \relative c'' { \time 4/4 \tempo 4 = 90 c8\p d e f g a b c, ${bar.repeat(3)}c8\f d e f g a b c, ${bar.repeat(3)}c1 } \midi { } }`
  const s = readLilyPond(src)
  const notes = s.notes.map(n => ({ ...n, art: { ...n.art } }))
  planArticulation(notes, { mode: 'score' })
  const end0 = Math.max(...notes.map(n => n.off)), on0 = notes.map(n => n.on)
  const ex = predictExpression(notes, model)
  assert.ok(ex && ex.timing && ex.phrased && !ex.recorded)
  assert.ok(Math.abs(Math.max(...notes.map(n => n.off)) - end0) < 0.05, 'same length')
  for (let i = 1; i < notes.length; i++) assert.ok(notes[i].on >= notes[i - 1].on)
  assert.ok(notes.some((n, i) => Math.abs(n.on - on0[i]) > 0.01), 'retimed')
  // the last bar's eighths are slower than the piece's middle
  const ev = onsets(notes), ioi = i => ev[i + 1].notes[0].on - ev[i].notes[0].on
  const mid = ioi(Math.floor(ev.length / 2)), last = ioi(ev.length - 3)
  assert.ok(last > mid * 1.02, `last ${last.toFixed(3)} vs middle ${mid.toFixed(3)}`)
  assert.ok(ex.dyn.every(v => v >= 0.08 && v <= 1))
  // p notes softer than f notes
  const v = notes.map(n => n.velocity), half = Math.floor(v.length / 2)
  const avg = a => a.reduce((p, x) => p + x, 0) / a.length
  assert.ok(avg(v.slice(0, half - 4)) < avg(v.slice(half + 4)) - 0.05, `${avg(v.slice(0, half - 4))} vs ${avg(v.slice(half + 4))}`)
  // the tempo map runs through the new onsets
  for (const e of ev) assert.ok(Math.abs(ex.tmap(e.q) - e.notes[0].on) < 1e-6)
  // before the first onset, a part keeps its own time, moved with the first onset
  assert.equal(ex.tmap(-4, -2.5), -2.5 + (ev[0].notes[0].on - on0[0]))
})

test('players the model was not fitted on: leave-one-piece-out over the recordings', () => {
  const out = execFileSync(process.execPath, [root + 'violinist/tools/fit_expression.js'], { encoding: 'utf8' })
  const m = /held out \(median of (\d+)\): tempo r ([\d.-]+), tempo curve r ([\d.-]+), level r ([\d.-]+)/.exec(out)
  assert.ok(m, out.slice(-300))
  assert.ok(+m[1] >= 60)
  assert.ok(+m[2] >= 0.2, `tempo r ${m[2]}`)
  assert.ok(+m[4] >= 0.33, `level r ${m[4]}`)
})
