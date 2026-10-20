import test from 'node:test'
import assert from 'node:assert/strict'
import { reserveSteepLoops, shapeMusic } from '../music-shape.mjs'

test('groups a melody into alternating multi-bar rollercoaster slopes', () => {
  const hits = Array.from({ length: 32 }, (_, index) => ({
    time: index * 0.5,
    bar: Math.floor(index / 2),
    contour: (index - 16) * 0.015,
    activity: index < 16 ? 0.15 : 0.8,
  }))
  const shaped = shapeMusic(hits, {
    phraseLow: 2,
    phraseHigh: 6,
    upAngle: 14,
    downAngle: 24,
    pitchScale: 3,
  })
  const directions = [...new Map(shaped.map(hit => [hit.gestureIndex, hit.gestureDirection])).values()]
  assert.ok(directions.includes('uphill'))
  assert.ok(directions.includes('downhill'))
  assert.ok(shaped[0].courseHeightSpan > 100)
  assert.ok(shaped[0].gestureBars > shaped.at(-1).gestureBars)
  assert.ok(new Set(shaped.map(hit => hit.gestureIndex)).size < hits.length / 3)
})

test('a perfectly flat melody still receives visible hills and valleys', () => {
  const hits = Array.from({ length: 24 }, (_, index) => ({
    time: index,
    bar: index,
    contour: 0,
    activity: 0.4,
  }))
  const shaped = shapeMusic(hits, { phraseLow: 3, phraseHigh: 3, upAngle: 18, downAngle: 40 })
  const heights = shaped.map(hit => hit.courseHeight)
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 150)
  assert.ok(shaped.every(hit => hit.gestureBars === 3))
})

test('steep climbs reserve enough time for real planner loops', () => {
  const hits = Array.from({ length: 60 }, (_, index) => ({
    frame: 80 + index * 10,
    time: index * 0.25,
    gestureIndex: Math.floor(index / 6),
    gestureDirection: Math.floor(index / 6) % 2 ? 'downhill' : 'uphill',
  }))
  const looped = reserveSteepLoops(hits, { upAngle: 70, loopGap: 1.5 })
  const entries = looped.filter(hit => hit.move === 'loop')
  assert.ok(entries.length >= 2)
  for (const entry of entries) {
    const previous = looped[looped.indexOf(entry) - 1]
    const next = looped[looped.indexOf(entry) + 1]
    assert.ok(!previous || (entry.frame - previous.frame) / 40 >= 1.5)
    assert.ok((next.frame - entry.frame) / 40 >= 1.5)
  }
})
