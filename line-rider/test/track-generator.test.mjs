import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  analyzeMidi,
  buildTrack,
  laneOffset,
  sampleTrackAtTime,
} from '../track-generator.mjs'

const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const midi = new Midi(readFileSync(new URL('../../minute_waltz.mid', import.meta.url)))

test('analyzes Minute Waltz into musical phrases', () => {
  const analysis = analyzeMidi(midi)
  assert.equal(analysis.signature.join('/'), '3/8')
  assert.equal(analysis.tracks, 2)
  assert.ok(analysis.duration > 90 && analysis.duration < 92)
  assert.ok(analysis.phrases.length > 30)
  assert.ok(analysis.notes.length > 1400)
  assert.ok(analysis.notes.every(note => Number.isFinite(note.time) && note.duration > 0))
  assert.ok(analysis.accentTimes.length > 100)
  assert.ok(analysis.tempoEvents > 100)
})

test('builds a finite, monotonic, curly track', () => {
  const analysis = analyzeMidi(midi)
  const track = buildTrack(analysis, { seed: 64, loopiness: 1 })
  assert.ok(track.points.length > 2000)
  assert.equal(track.sections.length, analysis.phrases.length)
  assert.ok((track.featureCounts.loop || 0) + (track.featureCounts['double-loop'] || 0) > 4)

  for (let index = 1; index < track.points.length; index++) {
    const point = track.points[index]
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y))
    assert.ok(point.time >= track.points[index - 1].time)
  }
})

test('samples tracks and lane offsets deterministically', () => {
  const track = buildTrack(analyzeMidi(midi), { seed: 22 })
  const middle = sampleTrackAtTime(track, track.duration / 2)
  assert.ok(Number.isFinite(middle.x) && Number.isFinite(middle.y))
  assert.ok(Math.abs(Math.hypot(middle.dx, middle.dy) - 1) < 1e-6)
  assert.equal(laneOffset(0, 5), -36)
})
