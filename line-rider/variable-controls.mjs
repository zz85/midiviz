import { FPS } from '../bosh/physics.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, amount) => a + (b - a) * amount
const smoothstep = value => {
  const x = clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

/**
 * Thin a musically chosen, high-density hit list into a variable-density one.
 *
 * Busy/loud passages approach rateHigh and gapLow. Calm passages approach
 * rateLow and gapHigh. The source list has already been optimized for musical
 * salience, so replacement only swaps a recent hit when the new one is
 * materially stronger.
 */
export function varyHits(hits, {
  rateLow = 0.8,
  rateHigh = 1.8,
  gapLow = 0.25,
  gapHigh = 0.55,
} = {}) {
  if (!hits.length) return []
  rateLow = Math.max(0.1, Math.min(rateLow, rateHigh))
  rateHigh = Math.max(rateLow, rateHigh)
  gapLow = Math.max(1 / FPS, Math.min(gapLow, gapHigh))
  gapHigh = Math.max(gapLow, gapHigh)

  const decorate = hit => {
    const activity = smoothstep(hit.energy ?? hit.strength ?? 0.5)
    const targetRate = lerp(rateLow, rateHigh, activity)
    const gapFloor = lerp(gapHigh, gapLow, activity)
    // The source list is capped at rateHigh. This spacing only thins quieter
    // passages; it cannot invent mechanically impossible extra landings.
    const desiredSpacing = 0.9 / Math.max(0.1, targetRate)
    return {
      ...hit,
      activity,
      targetRate,
      gapFloor,
      controlSpacing: Math.max(gapFloor, desiredSpacing),
    }
  }

  const selected = []
  for (const source of hits) {
    const hit = decorate(source)
    if (!selected.length) {
      selected.push(hit)
      continue
    }
    const previous = selected.at(-1)
    const gap = (hit.frame - previous.frame) / FPS
    if (gap + 1e-9 >= hit.controlSpacing) {
      selected.push(hit)
      continue
    }

    // Prefer a substantially stronger nearby note without violating the
    // previous kept landing's activity-controlled spacing.
    if ((hit.strength ?? 0.5) <= (previous.strength ?? 0.5) + 0.18) continue
    const before = selected.at(-2)
    const replacementGap = before ? (hit.frame - before.frame) / FPS : Infinity
    if (replacementGap + 1e-9 >= hit.controlSpacing) selected[selected.length - 1] = hit
  }

  return selected.map(hit => {
    const clean = { ...hit }
    delete clean.controlSpacing
    // These depend on adjacency and must be recalculated by a caller that
    // explicitly enables take-offs or planned loops.
    delete clean.takeoff
    delete clean.move
    return clean
  })
}
