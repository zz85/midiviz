const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, amount) => a + (b - a) * amount

function percentile(values, amount) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.round((sorted.length - 1) * amount)]
}

/** Group landings into multi-bar gestures that alternate uphill and downhill. */
export function shapeMusic(hits, {
  phraseLow = 2,
  phraseHigh = 6,
  upAngle = 48,
  downAngle = 78,
  pitchScale = 6,
  speedLow = 5.5,
  speedHigh = 12,
  descent = 0.3,
} = {}) {
  if (!hits.length) return []
  phraseLow = Math.max(1, Math.round(Math.min(phraseLow, phraseHigh)))
  phraseHigh = Math.max(phraseLow, Math.round(phraseHigh))
  upAngle = clamp(upAngle, 0, 75)
  downAngle = clamp(downAngle, 0, 88)
  pitchScale = Math.max(0, pitchScale)
  speedLow = Math.max(0.5, Math.min(speedLow, speedHigh))
  speedHigh = Math.max(speedLow, speedHigh)
  descent = Math.max(0, descent)

  const shaped = []
  let gestureIndex = -1
  let gestureStart = -Infinity
  let gestureBars = phraseLow
  for (const source of hits) {
    const activity = clamp(source.activity ?? source.energy ?? 0.5, 0, 1)
    const bar = Number.isFinite(source.bar) ? source.bar : Math.floor((source.time ?? 0) / 2)
    if (!shaped.length || bar >= gestureStart + gestureBars) {
      gestureIndex++
      gestureStart = bar
      gestureBars = Math.round(lerp(phraseHigh, phraseLow, activity))
    }
    shaped.push({
      ...source,
      gestureIndex,
      gestureStartBar: gestureStart,
      gestureBars,
      naturalContour: source.contour ?? 0,
    })
  }

  const gestures = []
  for (const hit of shaped) {
    const group = gestures[hit.gestureIndex] ??= []
    group.push(hit)
  }
  const naturalAnchors = gestures.map(group =>
    group.reduce((sum, hit) => sum + hit.naturalContour, 0) / group.length,
  )
  const starts = gestures.map(group => group[0].time ?? 0)
  const ends = gestures.map((group, index) =>
    starts[index + 1] ?? Math.max(group.at(-1).time ?? starts[index], starts[index] + 0.5),
  )
  const heightAnchors = [0]
  const angles = []
  let direction = 1
  for (let index = 0; index < gestures.length; index++) {
    const group = gestures[index]
    const activity = group.reduce((sum, hit) => sum + (hit.activity ?? 0.5), 0) / group.length
    const speed = lerp(speedLow, speedHigh, activity)
    const duration = Math.max(0.25, ends[index] - starts[index])
    const horizontal = speed * 40 * duration
    const angle = direction > 0 ? upAngle : downAngle
    const rise = Math.min(1600, horizontal * Math.tan(angle * Math.PI / 180))
    const current = heightAnchors.at(-1)
    if (current > 300) direction = -1
    else if (current < -300) direction = 1
    angles.push(direction * angle)
    heightAnchors.push(current + direction * rise)
    direction *= -1
  }

  const courseHeights = shaped.map(hit => {
    const index = hit.gestureIndex
    const duration = Math.max(0.25, ends[index] - starts[index])
    const into = clamp(((hit.time ?? starts[index]) - starts[index]) / duration, 0, 1)
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * into)
    const rollerHeight = lerp(heightAnchors[index], heightAnchors[index + 1], eased)
    const pitchDetail = (hit.naturalContour - naturalAnchors[index]) * pitchScale * 0.3
    return rollerHeight + pitchDetail
  })
  const heightLow = percentile(courseHeights, 0.1)
  const heightHigh = percentile(courseHeights, 0.9)

  return shaped.map((hit, index) => ({
    ...hit,
    courseHeight: courseHeights[index],
    // The planner normally lets the course drift down with gravity. Include
    // that baseline in its contour input so the requested angle describes
    // the visible rail rather than being swallowed by the default descent.
    contour: pitchScale > 0
      ? (courseHeights[index] + descent * ((hit.frame ?? 0) - (shaped[0].frame ?? 0))) / pitchScale
      : hit.naturalContour,
    courseHeightSpan: heightHigh - heightLow,
    targetSlopeAngle: angles[hit.gestureIndex],
    gestureDirection: angles[hit.gestureIndex] >= 0 ? 'uphill' : 'downhill',
  }))
}

/**
 * Very steep climbs become genuine planner loops. A loop needs enough frames
 * to enter, go over the top, and land, so intermediate musical landings are
 * removed around a few uphill phrase boundaries.
 */
export function reserveSteepLoops(hits, {
  upAngle = 48,
  loopThreshold = 45,
  loopLead = 1.5,
  loopGap = 1.7,
} = {}) {
  if (upAngle < loopThreshold || hits.length < 3) return hits
  const maxLoops = clamp(1 + Math.floor((upAngle - loopThreshold) / 10), 1, 4)
  const selected = []
  let loops = 0
  for (let index = 0; index < hits.length;) {
    const hit = hits[index]
    const endsGesture = index === hits.length - 1 || hits[index + 1].gestureIndex !== hit.gestureIndex
    if (
      loops < maxLoops &&
      endsGesture &&
      hit.gestureDirection === 'uphill' &&
      index > 0 &&
      (hit.time ?? 0) >= (hits[0].time ?? 0) + 4
    ) {
      let after = index + 1
      while (after < hits.length && (hits[after].frame - hit.frame) / 40 < loopGap) after++
      if (after < hits.length) {
        while (selected.length && (hit.frame - selected.at(-1).frame) / 40 < loopLead) selected.pop()
        selected.push({ ...hit, move: 'loop', loopRequested: true })
        loops++
        index = after
        continue
      }
    }
    selected.push(hit)
    index++
  }
  return selected
}
