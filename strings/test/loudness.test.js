// Loudness across the range and between engines (strings/sound/level-body.js,
// LEVEL_TRIM in strings/sound/engines.js; measured by strings/test/loudness.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves } from '../sound/bowed.js'
import { kLoudness } from './audio-util.js'
import { LEVEL_BODY } from '../sound/level-body.js'

const SR = 48000
const level = (pitch, model, body) => {
  const notes = [{ pitch, on: 0.1, off: 1.6, velocity: 0.6 }]
  fingerLine(notes, { instrument: 'violin' })
  const perf = renderPerformance(notes, { style: { vibrato: 0, timing: 0, intonation: 0, variance: 0 } })
  return kLoudness(renderCurves(perf, { sampleRate: SR, model, tail: 0, params: { body, oversample: 2 } }).map(c => c.subarray(0.5 * SR, 1.4 * SR)), SR)
}

test('level by pitch: with a measured body the top of the E string stays within 6 dB of G4 (the Iowa recordings are level there; it was 9–13 dB down)', () => {
  for (const instrument of ['violin', 'viola', 'cello']) for (const body of ['iowa', 'phil']) for (const model of ['waveguide', 'source']) {
    const v = LEVEL_BODY[instrument]?.[body]?.[model]
    assert.ok(v && v.dB.length > 30 && v.dB.every(x => Math.abs(x) <= 12), `${instrument} ${body} ${model}`)
  }
  for (const body of ['phil', 'iowa']) for (const model of ['source', 'waveguide']) {
    const g4 = level(67, model, body)
    for (const p of [88, 91]) {
      const d = level(p, model, body) - g4
      assert.ok(d > -6 && d < 6, `${body} ${model} pitch ${p}: ${d.toFixed(1)} dB re G4`)
    }
  }
})
