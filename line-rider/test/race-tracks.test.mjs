import test from 'node:test'
import assert from 'node:assert/strict'
import { planTrack, verifyPlan } from '../../bosh/planner.js'
import {
  layoutRacePlans,
  racePaceFactor,
  varyRacerPace,
} from '../race-tracks.mjs'

test('race pace changes leadership across musical phrases', () => {
  const hits = Array.from({ length: 12 }, (_, gestureIndex) => ({ gestureIndex }))
  const first = varyRacerPace(hits, 0, 2, 1).map(hit => hit.paceFactor)
  const second = varyRacerPace(hits, 1, 2, 1).map(hit => hit.paceFactor)
  assert.ok(first.some((factor, index) => factor > second[index]))
  assert.ok(first.some((factor, index) => factor < second[index]))
  assert.equal(racePaceFactor(hits[0], 0, 2, 0), 1)
})

test('visual layout keeps close lanes and preserves ownership', () => {
  const plan = {
    start: { x: 0, y: 0 },
    lines: [{ id: 7, type: 0, x1: 0, y1: 5, x2: 30, y2: 10, flipped: false }],
    pads: [{ lineId: 7, frame: 20 }],
  }
  const second = {
    ...plan,
    lines: [{ ...plan.lines[0], id: 20 }],
    pads: [{ lineId: 20, frame: 20 }],
  }
  const race = layoutRacePlans([plan, second], 112)
  assert.deepEqual(race.racers.map(racer => racer.start.y), [0, 0])
  assert.deepEqual(race.lines.map(line => [line.id, line.y1]), [[7, 5], [20, 5]])
  assert.deepEqual(race.lineRanges, [{ first: 7, last: 7 }, { first: 20, last: 20 }])
  assert.deepEqual(race.offsets, [0, 112])
})

test('track JSON preserves independent racer durations', async () => {
  const { readTrack, writeTrack } = await import('../../bosh/track.js')
  const riders = [
    { start: { x: 0, y: -56 }, velocity: { x: 0.4, y: 0 } },
    { start: { x: 0, y: 56 }, velocity: { x: 0.4, y: 0 } },
  ]
  const parsed = readTrack(writeTrack({
    duration: 120,
    riders,
    racerDurations: [100, 120],
    racerLineRanges: [{ first: 1, last: 10 }, { first: 11, last: 20 }],
    racerDisplayOffsets: [0, 112],
    lines: [],
  }))
  assert.deepEqual(parsed.racerDurations, [100, 120])
  assert.deepEqual(parsed.racerLineRanges, [{ first: 1, last: 10 }, { first: 11, last: 20 }])
  assert.deepEqual(parsed.racerDisplayOffsets, [0, 112])
})

test('the planner builds and verifies directly in a final parallel lane', () => {
  const hits = [80, 110, 150, 195].map((frame, index) => ({
    frame,
    strength: 0.5,
    energy: index / 3,
    contour: index % 2 ? 3 : -2,
    paceFactor: index % 2 ? 1.15 : 0.85,
  }))
  const plan = planTrack(hits, {
    seed: 7,
    start: { x: 0, y: 280 },
    idOffset: 1000,
  })
  const check = verifyPlan(plan.lines, plan.pads, {
    start: plan.start,
    frames: plan.duration,
  })
  assert.deepEqual(plan.start, { x: 0, y: 280 })
  assert.ok(plan.lines.every(line => line.id > 1000))
  assert.equal(check.crash, null)
  assert.equal(check.exact, plan.pads.length)
})
