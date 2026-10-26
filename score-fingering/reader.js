// Pure helpers for reading and playing a recognized page: where each bar starts in playback
// ticks, which bar is under a point on the page, which noteheads sound at a tick, and where a
// page's pen annotations are stored. No DOM, so they run under node --test.
import { lineY, spaceAt } from '../../random-sketches/vibes/scoreshift/omr.js'

/** Start tick of every measure, on the same clock as ScoreShift's timeline() / performance(). */
export function measureStarts(score) {
  const starts = new Map()
  for (const part of score?.parts || []) {
    let t0 = 0
    for (const measure of part.measures) {
      if (measure.at != null) t0 = measure.at // a part on only some systems (divisi): under the first part's bars
      starts.set(measure, t0)
      t0 += measure.status === 'rest' ? measure.cap : measure.ticks
    }
  }
  return starts
}

/** The measure under a point (normalized page px), within `reach` staff spaces of its staff, or null. */
export function measureAt(score, { x, y }, reach = 2.5) {
  let best = null, bestDistance = Infinity
  for (const measure of score?.measures || []) {
    const staff = measure.st
    if (!staff || x < measure.x0 || x >= measure.x1) continue
    const space = spaceAt(staff, x), top = lineY(staff, 0, x) - reach * space, bottom = lineY(staff, 4, x) + reach * space
    const distance = y < top ? top - y : y > bottom ? y - bottom : 0
    if (distance === 0 && Math.abs(y - (top + bottom) / 2) < bestDistance) { best = measure; bestDistance = Math.abs(y - (top + bottom) / 2) }
  }
  return best
}

/** The recognized noteheads of the performance() events ({ tick, dur, e }) sounding at `tick`. */
export function soundingHeads(events, tick) {
  const heads = []
  for (const event of events || []) {
    if (event.tick > tick) break
    if (event.e?.kind !== 'note' || tick >= event.tick + Math.max(1, event.dur)) continue
    for (const note of event.e.notes || []) heads.push(note)
  }
  return heads
}

// Pen annotations are kept per source file (name + size) and page, in localStorage, so they come
// back when the same score is opened again. A full or unavailable storage never breaks reading.
export const annotationKey = (sourceKey, page) => `score-fingering:ink:${sourceKey}:${page}`

export function loadAnnotations(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem(key) || 'null')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export function saveAnnotations(storage, key, list) {
  try {
    if (list.length) storage?.setItem(key, JSON.stringify(list)); else storage?.removeItem(key)
    return true
  } catch { return false }
}
