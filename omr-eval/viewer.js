// #053: the viewer's logic, apart from the page. Loads a run (omr-eval/results.json), draws the
// heads of one page over its image by category, and builds the per-page table.
export const CATEGORIES = {
  match: { label: 'right pitch', color: 'rgba(0, 150, 60, 0.75)' },
  wrong: { label: 'wrong pitch', color: 'rgba(220, 40, 40, 0.85)' },
  extra: { label: 'no such note', color: 'rgba(230, 140, 0, 0.9)' },
  chord: { label: 'chord note the MIDI lacks', color: 'rgba(120, 90, 200, 0.8)' },
  missed: { label: 'printed, not found', color: 'rgba(0, 110, 220, 0.9)' },
}

/** Heads of a page with their category, in reading order, missed notes among them. */
export function pageMarks(page) {
  const marks = []
  for (const st of page.staves) {
    for (const h of st.heads) marks.push({ ...h, cat: h.cat || 'extra', staff: st.i })
    for (const m of st.missed || []) marks.push({ ...m, cat: 'missed', staff: st.i })
  }
  return marks
}

/** Draw the marks on a canvas that shows the page at `scale` (canvas px per page px). */
export function drawMarks(ctx, page, scale, { show = Object.keys(CATEGORIES), radius = 0.55 } = {}) {
  const r = Math.max(4, radius * page.space * scale)
  ctx.save()
  ctx.lineWidth = Math.max(1.5, 0.12 * page.space * scale)
  for (const m of pageMarks(page)) {
    if (!show.includes(m.cat)) continue
    const x = m.x * scale, y = m.y * scale, c = CATEGORIES[m.cat].color
    ctx.strokeStyle = c; ctx.fillStyle = c
    ctx.beginPath()
    if (m.cat === 'missed') { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke() }
    else if (m.cat === 'match') { ctx.globalAlpha = 0.35; ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1 }
    else { ctx.arc(x, y, r * 1.2, 0, 2 * Math.PI); ctx.stroke() }
    if (m.cat === 'wrong' && m.truth) {
      ctx.font = `${Math.max(9, 0.9 * page.space * scale)}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(`${m.name}→${noteName(m.truth.midi)}`, x, y - 1.6 * r)
    }
  }
  for (const st of page.staves) for (const k of st.clefChanges || []) {
    ctx.strokeStyle = 'rgba(0, 160, 200, 0.9)'; ctx.setLineDash([4, 3])
    ctx.strokeRect(k.box[0] * scale, k.box[1] * scale, (k.box[2] - k.box[0]) * scale, (k.box[3] - k.box[1]) * scale); ctx.setLineDash([])
  }
  ctx.restore()
}

export const noteName = midi => ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][midi % 12] + (Math.floor(midi / 12) - 1)

/** The mark nearest a page point within `within` page px, or null. */
export function markAt(page, x, y, within = 1.2 * page.space) {
  let best = null, bd = within
  for (const m of pageMarks(page)) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m } }
  return best
}

/** Rows for the per-page table: page, staves, heads, each category, pitch %, ms. */
export function tableRows(run) {
  return run.pages.map(p => ({ page: p.page, staves: p.staves, heads: p.heads, match: p.match, wrong: p.wrong, extra: p.extra, chord: p.chord || 0, missed: p.missed, pitch: p.pitchCorrect, ms: p.ms, error: p.error || '' }))
}

/** The summary as one line, for the header. */
export function summaryLine(s) {
  return `${s.truth - s.folded} printed notes (${s.folded} tremolo repeats folded) · ${s.detected} heads read · pitch right ${s.pitchCorrect}% · heads found ${s.headsFound}% · ${s.wrong} wrong (${s.wrongKinds.semitone} semitone, ${s.wrongKinds.octave} octave, ${s.wrongKinds.step} step, ${s.wrongKinds.other} other) · ${s.extra} extra · ${s.missed} missed · ${(s.ms / 1000).toFixed(1)} s`
}
