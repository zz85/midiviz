import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { analyzeMidi, buildTrack } from '../track-generator.mjs'
import {
  PHYSICS_FPS,
  buildPhysicsCourse,
  sampleSimulation,
  simulateRace,
  simulateRider,
} from '../physics.mjs'

const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const midi = new Midi(readFileSync(new URL('../../minute_waltz.mid', import.meta.url)))
const analysis = analyzeMidi(midi)
const track = buildTrack(analysis, { seed: 64, loopiness: 0.76 })

test('turns the generated spline into directed collision rails', () => {
  const course = buildPhysicsCourse(track)
  assert.ok(course.segments.length > 2500)
  assert.ok(course.segments.every(segment =>
    Number.isFinite(segment.nx) &&
    Number.isFinite(segment.ny) &&
    segment.length > 0 &&
    segment.boost > 0))
})

test('simulates a constrained rider under gravity and rail collisions', () => {
  const simulation = simulateRider(track, { duration: analysis.duration })
  const start = sampleSimulation(simulation, 0)
  const afterOneSecond = sampleSimulation(simulation, 1)
  assert.equal(simulation.fps, PHYSICS_FPS)
  assert.ok(afterOneSecond.position.x > start.position.x + 1)
  assert.ok(simulation.contacts.some(value => value > 0))
  assert.ok(Number.isFinite(afterOneSecond.points.SHOULDER.x))
  assert.ok(Number.isFinite(afterOneSecond.points.SCARF_4.y))
})

test('calibrates every default racer to finish the Minute Waltz course', () => {
  const simulations = simulateRace(track, {
    racerCount: 6,
    seed: 64,
    duration: analysis.duration,
  })
  assert.equal(simulations.length, 6)
  for (const simulation of simulations) {
    assert.ok(simulation.finishTime > analysis.duration - 15)
    assert.ok(simulation.finishTime <= analysis.duration + 1)
    assert.ok(simulation.finalProgress >= simulation.course.segments.length - 2)
  }
})
