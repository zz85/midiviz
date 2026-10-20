import test from 'node:test'
import assert from 'node:assert/strict'
import {
  connectedEndpoints,
  hitTestLine,
  loopToLines,
  moveEndpoints,
  simplifyStroke,
  strokeToLines,
} from '../editor-model.mjs'

test('selects the nearest line and moves a shared joint together', () => {
  const lines = [
    { id: 1, type: 0, x1: 0, y1: 0, x2: 10, y2: 0 },
    { id: 2, type: 0, x1: 10, y1: 0, x2: 20, y2: 5 },
  ]
  assert.equal(hitTestLine(lines, { x: 4, y: 1 }, 3).line.id, 1)
  const handles = connectedEndpoints(lines, 0, 'end')
  assert.equal(handles.length, 2)
  moveEndpoints(lines, handles, { x: 12, y: -3 })
  assert.deepEqual([lines[0].x2, lines[0].y2, lines[1].x1, lines[1].y1], [12, -3, 12, -3])
})

test('turns a human pencil gesture into a connected polyline', () => {
  const points = Array.from({ length: 40 }, (_, index) => ({
    x: index * 2,
    y: Math.sin(index / 5) * 12,
  }))
  const simplified = simplifyStroke(points, 1)
  const lines = strokeToLines(points, { id: 7, tolerance: 1 })
  assert.ok(simplified.length > 3)
  assert.ok(simplified.length < points.length)
  assert.equal(lines[0].id, 7)
  assert.equal(lines.at(-1).x2, points.at(-1).x)
  for (let index = 1; index < lines.length; index++) {
    assert.equal(lines[index - 1].x2, lines[index].x1)
    assert.equal(lines[index - 1].y2, lines[index].y1)
  }
})

test('creates a closed, genuinely curling loop between two endpoints', () => {
  const lines = loopToLines({ x: 0, y: 0 }, { x: 100, y: 0 }, { segments: 40 })
  assert.equal(lines.length, 40)
  const xs = [lines[0].x1, ...lines.map(line => line.x2)]
  assert.ok(xs.some((x, index) => index > 0 && x < xs[index - 1]))
  assert.ok(Math.max(...lines.flatMap(line => [line.y1, line.y2])) - Math.min(...lines.flatMap(line => [line.y1, line.y2])) > 80)
  assert.ok(Math.abs(lines[0].x1) < 1e-8)
  assert.ok(Math.abs(lines.at(-1).x2 - 100) < 1e-8)
})
