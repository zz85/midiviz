// The bowing of a violin piece from its Mutopia score: the slurs, marks,
// bowings and slides of the LilyPond source (violinist/scores, read by
// strings/lilypond.js) put on the notes of the MIDI file LilyPond made from it
// (violinist/midis), so the MIDI keeps its timing and the bow follows the
// score. Used by #034, #037 and #038; the scores are listed in
// violinist/midis/index.json (score: { main, files, part }, written by
// violinist/tools/build_scores.js).
import { readLilyPondFiles } from '../strings/lilypond.js'
import { planArticulation } from '../strings/articulation.js'

/**
 * Put the score's marks on the MIDI notes in place. Both carry q (onset in
 * quarter notes from the start); a MIDI note takes the marks of the score note
 * of the same pitch at the same place (within 1/64 of a quarter). Returns
 * { matched, total }.
 */
export function matchScore(notes, scoreNotes) {
  const key = (p, q) => `${p}@${Math.round(q * 64)}`
  const idx = new Map()
  for (const n of scoreNotes) { const k = key(n.pitch, n.q); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n) }
  let matched = 0
  for (const n of notes) {
    if (n.q == null) continue
    let m = idx.get(key(n.pitch, n.q))?.shift()
    if (!m) for (const d of [-1, 1]) { m = idx.get(`${n.pitch}@${Math.round(n.q * 64) + d}`)?.shift(); if (m) break }
    if (!m) continue
    matched++
    const a = m.art
    n.art = { slur: a.slur ?? null, stroke: a.stroke ?? null, bow: a.bow ?? null, source: 'score', ...(a.port ? { port: true } : {}) }
  }
  return { matched, total: notes.length }
}

const cache = new Map()
/** The score of an index.json entry (fetched once): readLilyPondFiles' result, or null. */
export async function loadScore(entry, base = 'violinist/scores/') {
  const sc = entry?.score
  if (!sc) return null
  if (!cache.has(entry.file)) cache.set(entry.file, (async () => {
    const files = new Map(await Promise.all(sc.files.map(async f => [f, await (await fetch(base + f)).text()])))
    return readLilyPondFiles(files, { main: sc.main, part: sc.part })
  })().catch(e => { cache.delete(entry.file); throw e }))
  return cache.get(entry.file)
}

/**
 * The bowing for a piece's violin notes (each with q), planned in place:
 *   'score'   the Mutopia score's slurs and marks (the default; falls back to
 *             'infer' when the entry has no score or it cannot be read)
 *   'infer'   slurs inferred from the music (strings/articulation.js)
 *   'fixed'   no plan: motion.js's fixed rule
 * Returns { mode, matched, total, slurs } (what was used).
 */
export async function bowingFor(entry, notes, mode = 'score', opts = {}) {
  for (const n of notes) delete n.art
  if (mode === 'fixed') return { mode, matched: 0, total: notes.length, slurs: 0 }
  if (mode === 'score') {
    try {
      const s = await loadScore(entry, opts.base)
      if (s) {
        const m = matchScore(notes, s.notes)
        planArticulation(notes, { mode: 'score' })
        return { mode, ...m, slurs: notes.filter(n => n.art?.slurPrev).length }
      }
    } catch (e) { console.warn('score bowing unavailable:', e.message) }
  }
  planArticulation(notes, { mode: 'infer' })
  return { mode: 'infer', matched: 0, total: notes.length, slurs: notes.filter(n => n.art?.slurPrev).length }
}
