const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, amount) => a + (b - a) * amount

export function lineLengthForHit(hit, {
  lineLow = 4,
  lineHigh = 14,
} = {}) {
  lineLow = Math.max(1, Math.min(lineLow, lineHigh))
  lineHigh = Math.max(lineLow, lineHigh)
  const activity = clamp(hit?.activity ?? hit?.energy ?? 0.5, 0, 1)
  const sustain = clamp((hit?.noteLength ?? 0.2) / 1.4, 0, 1)
  let target = lerp(lineHigh, lineLow, activity)
  let structure = activity > 0.7 ? 'busy run' : activity < 0.3 ? 'open phrase' : 'flow'

  // Long-held notes support cleaner, longer editable rails. Structural
  // boundaries and runs keep extra vertices because their changes of
  // direction carry musical and physical meaning.
  target *= 1 + sustain * 0.2
  if (sustain > 0.65) structure = 'sustain'
  if (hit?.slot != null && hit.slot <= 2) {
    target *= 0.72
    structure = 'bar edge'
  }
  if (hit?.hint === 'run' || hit?.move === 'loop') {
    target = Math.min(target, lineLow * 1.15)
    structure = hit.move === 'loop' ? 'loop' : 'run'
  } else if (hit?.hint === 'repeat' || hit?.sameAs) {
    target *= 1.08
    structure = 'repeated phrase'
  }

  return {
    target: clamp(target, lineLow, lineHigh),
    structure,
  }
}
