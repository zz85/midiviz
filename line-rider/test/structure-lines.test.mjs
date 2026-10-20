import test from 'node:test'
import assert from 'node:assert/strict'
import { smoothPath } from '../../bosh/geometry.js'
import { lineLengthForHit } from '../structure-lines.mjs'

test('derives shorter rails for runs and boundaries, longer rails for sustains', () => {
  const options = { lineLow: 4, lineHigh: 16 }
  const sustain = lineLengthForHit({ activity: 0.1, noteLength: 2 }, options)
  const busy = lineLengthForHit({ activity: 0.9, noteLength: 0.1 }, options)
  const boundary = lineLengthForHit({ activity: 0.3, slot: 0 }, options)
  const run = lineLengthForHit({ activity: 0.5, hint: 'run' }, options)
  assert.ok(sustain.target > busy.target)
  assert.ok(boundary.target < sustain.target)
  assert.ok(run.target <= options.lineLow * 1.15)
  assert.equal(run.structure, 'run')
})

test('the shared path builder honors line length on straight sections', () => {
  const path = smoothPath({ x: 0, y: 0 }, 0, [{ len: 23 }], { ds: 6 })
  assert.equal(path.pts.length, 5)
  for (let index = 1; index < path.pts.length; index++) {
    const length = Math.hypot(
      path.pts[index].x - path.pts[index - 1].x,
      path.pts[index].y - path.pts[index - 1].y,
    )
    assert.ok(length <= 6 + 1e-9)
  }
})
