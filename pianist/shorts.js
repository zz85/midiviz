// YouTube Shorts for #032: which part of a piece to cut, and where its edges go.
//
// A Short is judged in its first seconds and watched on a loop, so a good clip
// starts on a phrase that is already going (not a quiet lead-in), holds the
// piece's most intense music, and ends on a breath (a phrase end with a gap
// after it), so the loop back to the start doesn't cut a note off. Everything
// is read from what the page already has: the phrases and the energy curve
// (pianist/rig.js), the liner notes' sections, moments and intertitles, and
// the notes. Deterministic: the same piece always gets the same suggestions.

/** YouTube treats a vertical upload of up to 3 minutes as a Short */
export const SHORT_MAX = 180
export const SHORT_LENGTHS = [15, 30, 45, 60, 90]
/** the default: long enough for a whole musical idea, short enough to keep people */
export const SHORT_DEFAULT = 35

// ── edges on the phrasing ──
/** the phrase start nearest t (a clip's in point) */
export function snapStart(t, phrases) {
  let best = t, d = Infinity
  for (const [a] of phrases) if (Math.abs(a - t) < d) { d = Math.abs(a - t); best = a }
  return best
}
/** the phrase end nearest t (a clip's out point), after `after` */
export function snapEnd(t, phrases, after = -Infinity) {
  let best = t, d = Infinity
  for (const [, b] of phrases) if (b > after && Math.abs(b - t) < d) { d = Math.abs(b - t); best = b }
  return best
}
/** a clip of about `len` seconds from `a`: out on the phrase end nearest a + len */
export function clipOf(a, len, phrases, duration) {
  const b = snapEnd(Math.min(duration, a + len), phrases, a + Math.min(len * 0.5, 8))
  return [a, Math.min(b, a + SHORT_MAX, duration)]
}

/**
 * Suggested clips, best first.
 * song: { duration, phrases: [[start, end], …], energyAt(t) → 0..1,
 *         sections?: [{ start, title }], moments?: [{ start, end, kind }],
 *         intertitles?: [{ start, end }], notes?: [{ on, off }] }
 * opts: { lengths: target seconds to try, count }
 * → [{ a, b, score, reason, parts: { hook, peak, mean, arc, cadence, … } }]
 */
export function suggestClips(song, { lengths = [30, 45], count = 3 } = {}) {
  const { duration, phrases = [], energyAt = () => 0.3, sections = [], moments = [], intertitles = [], notes = [] } = song
  if (!duration || !phrases.length) return []
  // the energy curve at 4 Hz, against the piece's own loud end (95th percentile)
  const DT = 0.25, E = []
  for (let t = 0; t < duration; t += DT) E.push(energyAt(t))
  const sorted = [...E].sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.95)] || 1, peakAll = sorted.at(-1) || 1
  const mean = (a, b) => { let s = 0, n = 0; for (let i = Math.max(0, Math.floor(a / DT)); i < Math.min(E.length, Math.ceil(b / DT)); i++) { s += E[i]; n++ } return n ? s / n : 0 }
  const max = (a, b) => { let m = 0; for (let i = Math.max(0, Math.floor(a / DT)); i < Math.min(E.length, Math.ceil(b / DT)); i++) m = Math.max(m, E[i]); return m }
  const nextStart = b => phrases.find(p => p[0] > b - 0.05)?.[0] ?? duration + 2
  const cands = []
  const tryClip = (a, b, whole = false) => {
    const len = b - a
    if (len < 8) return
    const hook = Math.min(1, mean(a, a + 3) / top)
    const peak = max(a, b) / peakAll
    const avg = Math.min(1, mean(a, b) / top)
    const third = len / 3, arc = Math.tanh(3 * (mean(b - third, b) - mean(a, a + third)) / top)
    // a breath after the out point: the loop doesn't cut into the next phrase
    const cadence = Math.min(1, (nextStart(b) - b) / 0.8)
    const sec = sections.find(s => Math.abs(s.start - a) < 0.6)
    const listen = moments.filter(m => m.start >= a && m.end <= b + 1 && m.kind === 'listen').length
    const its = intertitles.filter(x => x.start >= a + 3.5 && x.end <= b).length
    // a note held over the in point: the Short would open on its tail
    const held = notes.some(n => n.on < a - 0.05 && n.off > a + 0.35)
    const parts = { hook, peak, avg, arc, cadence, section: sec ? 1 : 0, listen, its, held }
    const score = 0.34 * hook + 0.24 * peak + 0.14 * avg + 0.08 * (0.5 + 0.5 * arc) + 0.1 * cadence
      + (sec ? 0.06 : 0) + Math.min(0.08, 0.04 * listen + 0.03 * its) - (held ? 0.08 : 0)
      + (whole ? 0.04 : 0)
    cands.push({ a, b, score, parts, whole, section: sec?.title ?? sections.findLast(s => s.start <= a + len / 2)?.title })
  }
  for (const len of lengths) for (const [a] of phrases) {
    if (a > duration - len * 0.75) break
    const [, b] = clipOf(a, len, phrases, duration)
    if (b - a > len * 0.7 && b - a < len * 1.35) tryClip(a, b)
  }
  // the whole piece, when it fits
  if (duration <= SHORT_MAX) tryClip(phrases[0][0], Math.min(duration, phrases.at(-1)[1]), true)
  cands.sort((x, y) => y.score - x.score || x.a - y.a)
  // the best few that don't mostly cover the same music
  const out = []
  for (const c of cands) {
    // (the whole piece is its own kind of choice: never crowded out by its parts)
    if (!c.whole && out.some(o => !o.whole && Math.min(o.b, c.b) - Math.max(o.a, c.a) > 0.5 * Math.min(o.b - o.a, c.b - c.a))) continue
    out.push({ ...c, score: +c.score.toFixed(3), reason: reasonOf(c) })
    if (out.length >= count) break
  }
  return out
}

function reasonOf(c) {
  const p = c.parts, why = []
  if (c.whole) why.push('the whole piece')
  if (p.hook > 0.75) why.push('opens strong')
  else if (p.hook < 0.4) why.push('quiet start')
  if (p.peak > 0.97) why.push('has the loudest passage')
  else if (p.peak > 0.85) why.push('builds to a peak')
  if (p.arc > 0.3) why.push('rises to the end')
  if (p.cadence >= 1) why.push('ends on a breath')
  if (p.listen) why.push('a “listen” note')
  return `${Math.round(c.b - c.a)} s · ${why.join(', ') || 'steady'}${c.section ? ` · ${c.section}` : ''}`
}

/** the description to paste under the Short */
export function shortDescription({ title, composer, bars, full, tags = [] }) {
  const lines = [[composer, title].filter(Boolean).join(' – ')]
  if (bars) lines.push(bars)
  if (full) lines.push('', `Full performance: ${full}`)
  lines.push('', ['#Shorts', '#piano', ...tags].join(' '))
  return lines.join('\n')
}
