// Score-to-audio alignment (strings/align.js) on synthetic recordings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { alignScore, repeatPlans } from '../align.js'
import { tempoMapOf } from '../expression.js'

const SR = 16000
const midiHz = m => 440 * 2 ** ((m - 69) / 12)
/** Harmonic tones for performed notes { pitch, on, off }, with silence around. */
function render(notes, len) {
  const x = new Float32Array(Math.round(len * SR))
  for (const n of notes) {
    const f = midiHz(n.pitch), a = Math.round(n.on * SR), b = Math.round(n.off * SR)
    for (let i = a; i < b; i++) { const t = (i - a) / SR, g = 0.1 * Math.min(1, t / 0.01, (b - i) / SR / 0.01) * Math.exp(-t / 1.5); x[i] += g * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.3 * Math.sin(6 * Math.PI * f * t)) }
  }
  return x
}
// a tune of 32 eighth notes, the first 16 repeated
const tune = [67, 69, 71, 72, 74, 72, 71, 69, 67, 71, 74, 79, 78, 76, 74, 72, 71, 72, 74, 76, 77, 76, 74, 72, 71, 69, 67, 66, 67, 69, 71, 67]
const score = tune.map((p, i) => ({ pitch: p, q: i / 2, dq: 0.5 }))
const repeats = [{ from: 0, to: 8, alts: [], times: 2 }]

test('repeat plans: each repeat taken or not', () => {
  const plans = repeatPlans(repeats, 16)
  assert.deepEqual(plans.map(p => p.seg), [[[0, 8], [8, 16 + 1e-6]], [[0, 8], [0, 8], [8, 16 + 1e-6]]])
})

test('finds the notes, the repeat and the tempo of a played performance', () => {
  // played with the repeat, slowing from 0.22 to 0.34 s per eighth, 2 s of silence first
  const order = [...score.slice(0, 16), ...score]
  let t = 2
  const played = order.map((n, i) => { const d = 0.22 + 0.12 * i / order.length, on = t; t += d; return { pitch: n.pitch, on, off: on + d * 0.95 } })
  const x = render(played, t + 1.5)
  const r = alignScore(score, x, SR, { repeats })
  assert.deepEqual(r.plan.taken, [true])
  assert.equal(r.played.length, 48)
  const err = r.played.map((p, i) => Math.abs(p.on - played[i].on)).sort((a, b) => a - b)
  assert.ok(err[24] < 0.03 && err[43] < 0.08, `median ${(1000 * err[24]).toFixed(0)} ms, 90th ${(1000 * err[43]).toFixed(0)} ms`)
  // each score note's first performance
  assert.ok(Math.abs(r.played[r.first[20]].on - played[36].on) < 0.08)
})

test('a tempo map from a recording retimes other parts', () => {
  const t = tempoMapOf({ tmap: { q: [0, 480, 960], t: [1000, 1500, 2500] } })
  assert.equal(t(0), 1); assert.equal(t(1.5), 2); assert.equal(t(2), 2.5); assert.equal(t(3), 3.5)
  const u = tempoMapOf(null, [{ q: 0, on: 0 }, { q: 1, on: 0.4 }])
  assert.ok(Math.abs(u(0.5) - 0.2) < 1e-9 && Math.abs(u(2) - 0.8) < 1e-9)
})
