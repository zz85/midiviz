// pianist/overrides.js: the curves through their keyframes, 0 outside, monotone between (no
// overshoot), the text form round-trips, a key at a time replaces, an unknown curve is dropped.
//   node --test pianist/test/overrides.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOverrides, CURVES } from '../overrides.js'

test('through the keys, zero outside, monotone between', () => {
  const ov = createOverrides()
  ov.set('liftL', [[16, 0], [12, 0], [14, 3]])
  assert.deepEqual(ov.get('liftL'), [[12, 0], [14, 3], [16, 0]], 'sorted by time')
  assert.equal(ov.at('liftL', 14), 3); assert.equal(ov.at('liftL', 12), 0); assert.equal(ov.at('liftL', 16), 0)
  assert.equal(ov.at('liftL', 5), 0); assert.equal(ov.at('liftL', 20), 0)
  const mid = ov.at('liftL', 13); assert.ok(mid > 0 && mid < 3, `rising between: ${mid}`)
  ov.set('lean', [[0, 0], [1, 1], [2, 1], [3, 0]])
  for (let t = 1; t <= 2; t += 0.1) assert.ok(ov.at('lean', t) <= 1 + 1e-9, 'no overshoot on a flat run')
  assert.equal(ov.at('liftR', 14), 0, 'another curve is empty')
  assert.equal(ov.at('nothing', 14), 0)
})

test('the text form round-trips; an unknown curve or a bad key is dropped', () => {
  const ov = createOverrides()
  ov.set('liftL', [[12.345, 0], [14, 3.006]]); ov.set('lean', [[30, 0.2]])
  const text = ov.toText()
  assert.equal(text, 'liftL:12.35,0;14,3.01|lean:30,0.2')
  const ov2 = createOverrides().fromText(text + '|bogus:1,2|liftR:x,1;5,2')
  assert.deepEqual(ov2.names().sort(), ['lean', 'liftL', 'liftR'])
  assert.deepEqual(ov2.get('liftR'), [[5, 2]], 'the bad key dropped, the good one kept')
  assert.equal(ov2.at('lean', 30), 0.2)
  assert.equal(createOverrides().toText(), '')
  assert.ok(Object.keys(CURVES).includes('lean'))
})

test('a second key at one time replaces; clear; subscribers hear each change', () => {
  const ov = createOverrides(); let n = 0; ov.subscribe(() => n++)
  ov.set('liftL', [[10, 1], [10, 2], [12, 0]])
  assert.deepEqual(ov.get('liftL'), [[10, 2], [12, 0]])
  ov.clear('liftL'); assert.equal(ov.empty(), true)
  assert.equal(n, 2)
})
