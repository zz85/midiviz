import { ACCEL, SCENERY, SOLID } from '../bosh/physics.js'

const TYPES = new Set([SOLID, ACCEL, SCENERY])

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export function copyLines(lines) {
  return lines.map(line => ({
    id: line.id,
    type: TYPES.has(line.type) ? line.type : SOLID,
    x1: +line.x1,
    y1: +line.y1,
    x2: +line.x2,
    y2: +line.y2,
    flipped: !!line.flipped,
    leftExtended: !!line.leftExtended,
    rightExtended: !!line.rightExtended,
    ...(line.width == null ? {} : { width: +line.width }),
  }))
}

export function nextLineId(lines) {
  return lines.reduce((highest, line) => Math.max(highest, Number(line.id) || 0), 0) + 1
}

export function distanceToSegment(point, line) {
  const vx = line.x2 - line.x1
  const vy = line.y2 - line.y1
  const lengthSq = vx * vx + vy * vy
  const amount = lengthSq
    ? clamp(((point.x - line.x1) * vx + (point.y - line.y1) * vy) / lengthSq, 0, 1)
    : 0
  const x = line.x1 + vx * amount
  const y = line.y1 + vy * amount
  return { distance: Math.hypot(point.x - x, point.y - y), amount, x, y }
}

export function hitTestLine(lines, point, tolerance = 8) {
  let best = null
  for (let index = lines.length - 1; index >= 0; index--) {
    const hit = distanceToSegment(point, lines[index])
    if (hit.distance > tolerance) continue
    if (!best || hit.distance < best.distance) best = { ...hit, index, line: lines[index] }
  }
  return best
}

export function endpointAt(line, point, tolerance = 10) {
  const first = Math.hypot(point.x - line.x1, point.y - line.y1)
  const second = Math.hypot(point.x - line.x2, point.y - line.y2)
  if (first > tolerance && second > tolerance) return null
  return first <= second ? 'start' : 'end'
}

export function connectedEndpoints(lines, selectedIndex, endpoint, epsilon = 0.05) {
  const selected = lines[selectedIndex]
  if (!selected) return []
  const target = endpoint === 'start'
    ? { x: selected.x1, y: selected.y1 }
    : { x: selected.x2, y: selected.y2 }
  const found = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (Math.hypot(line.x1 - target.x, line.y1 - target.y) <= epsilon) found.push({ index, endpoint: 'start' })
    if (Math.hypot(line.x2 - target.x, line.y2 - target.y) <= epsilon) found.push({ index, endpoint: 'end' })
  }
  return found
}

export function moveEndpoints(lines, handles, point) {
  for (const handle of handles) {
    const line = lines[handle.index]
    if (!line) continue
    if (handle.endpoint === 'start') {
      line.x1 = point.x
      line.y1 = point.y
    } else {
      line.x2 = point.x
      line.y2 = point.y
    }
  }
}

export function makeLine(id, start, end, type = SOLID, options = {}) {
  return {
    id,
    type: TYPES.has(type) ? type : SOLID,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    flipped: !!options.flipped,
    leftExtended: !!options.leftExtended,
    rightExtended: !!options.rightExtended,
    ...(type === SCENERY ? { width: options.width ?? 1 } : {}),
  }
}

export function simplifyStroke(points, tolerance = 1.4) {
  if (points.length <= 2) return points.map(point => ({ ...point }))
  const first = points[0]
  const last = points.at(-1)
  const baseline = { x1: first.x, y1: first.y, x2: last.x, y2: last.y }
  let farthest = 0
  let split = 0
  for (let index = 1; index < points.length - 1; index++) {
    const distance = distanceToSegment(points[index], baseline).distance
    if (distance > farthest) {
      farthest = distance
      split = index
    }
  }
  if (farthest <= tolerance) return [{ ...first }, { ...last }]
  const left = simplifyStroke(points.slice(0, split + 1), tolerance)
  const right = simplifyStroke(points.slice(split), tolerance)
  return left.slice(0, -1).concat(right)
}

export function strokeToLines(points, {
  id = 1,
  type = SOLID,
  flipped = false,
  tolerance = 1.4,
  minLength = 1.5,
} = {}) {
  const clean = simplifyStroke(points, tolerance)
  const lines = []
  for (let index = 1; index < clean.length; index++) {
    if (Math.hypot(clean[index].x - clean[index - 1].x, clean[index].y - clean[index - 1].y) < minLength) continue
    lines.push(makeLine(id++, clean[index - 1], clean[index], type, {
      flipped,
      leftExtended: index > 1,
      rightExtended: index < clean.length - 1,
    }))
  }
  return lines
}

export function loopToLines(start, end, {
  id = 1,
  type = SOLID,
  flipped = false,
  segments = 48,
  bulge = -1,
} = {}) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const advance = Math.hypot(dx, dy)
  if (advance < 12) return []
  const tx = dx / advance
  const ty = dy / advance
  const nx = -ty
  const ny = tx
  const radius = clamp(advance / 1.82, 18, 180)
  const points = []
  for (let index = 0; index <= segments; index++) {
    const u = index / segments
    const x = advance * u + radius * Math.sin(Math.PI * 2 * u)
    const y = bulge * radius * (1 - Math.cos(Math.PI * 2 * u))
    points.push({
      x: start.x + tx * x + nx * y,
      y: start.y + ty * x + ny * y,
    })
  }
  return strokeToLines(points, { id, type, flipped, tolerance: 0.1, minLength: 0.5 })
}

export function snapPoint(point, size = 5, enabled = true) {
  if (!enabled || !size) return { ...point }
  return {
    x: Math.round(point.x / size) * size,
    y: Math.round(point.y / size) * size,
  }
}

