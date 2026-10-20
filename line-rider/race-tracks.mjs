const TAU = Math.PI * 2
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

export function racePaceFactor(hit, racerIndex, racerCount, variance = 0.65) {
  if (racerCount <= 1 || variance <= 0) return 1
  const phrase = hit.gestureIndex ?? hit.index ?? (hit.time || 0) / 2
  const phase = TAU * racerIndex / racerCount
  const wave = Math.sin(phrase * 1.17 + phase)
  const slowerWave = Math.sin(phrase * 0.43 - phase * 0.7)
  return clamp(1 + variance * (0.24 * wave + 0.1 * slowerWave), 0.72, 1.32)
}

export function varyRacerPace(hits, racerIndex, racerCount, variance) {
  return hits.map(hit => ({
    ...hit,
    paceFactor: racePaceFactor(hit, racerIndex, racerCount, variance),
  }))
}

export function layoutRacePlans(plans, spacing = 112) {
  const offsets = plans.map((_, index) => index * spacing)
  return {
    lines: plans.flatMap(plan => plan.lines),
    racers: plans.map(plan => ({
      start: { ...plan.start },
      velocity: { x: 0.4, y: 0 },
    })),
    padsByRacer: plans.map((plan, racerIndex) => plan.pads.map(pad => ({
      ...pad,
      racerIndex,
    }))),
    lineRanges: plans.map(plan => ({
      first: Math.min(...plan.lines.map(line => line.id)),
      last: Math.max(...plan.lines.map(line => line.id)),
    })),
    offsets,
  }
}
