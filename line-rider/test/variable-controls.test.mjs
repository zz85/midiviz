import test from 'node:test'
import assert from 'node:assert/strict'
import { FPS } from '../../bosh/physics.js'
import { varyHits } from '../variable-controls.mjs'

test('varies landing density and gap floor with musical activity', () => {
  const hits = Array.from({ length: 80 }, (_, index) => ({
    frame: index * 10,
    time: index / 4,
    energy: index < 40 ? 0.08 : 0.92,
    strength: 0.45 + (index % 4) * 0.1,
  }))
  const options = { rateLow: 0.8, rateHigh: 2.4, gapLow: 0.25, gapHigh: 0.7 }
  const varied = varyHits(hits, options)
  const calm = varied.filter(hit => hit.time < 10)
  const busy = varied.filter(hit => hit.time >= 10)

  assert.ok(busy.length > calm.length * 1.7, `${calm.length} calm, ${busy.length} busy`)
  assert.ok(calm.every(hit => hit.targetRate >= options.rateLow && hit.targetRate <= options.rateHigh))
  assert.ok(busy.every(hit => hit.gapFloor >= options.gapLow && hit.gapFloor <= options.gapHigh))
  for (let index = 1; index < varied.length; index++) {
    const gap = (varied[index].frame - varied[index - 1].frame) / FPS
    assert.ok(gap + 1e-9 >= varied[index].gapFloor)
  }
  assert.deepEqual(varyHits(hits, options), varied)
})
