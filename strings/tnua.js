// TNUA violin fingering dataset: loading and scoring (Experiment #033).
//
// Dataset: github.com/Tsung-Ping/Violin-Fingering-Generation (Cheung, Kao &
// Su, IUI 2021). 10 violinists × 14 excerpts, one CSV per pair:
//   pitch,start,duration,beat_type,string,position,finger
// start = beats within the bar (resets every bar, may be negative for an
// up-beat), duration in quarter notes, string 1 = G … 4 = E (0 = not
// annotated), position 1–12 (diatonic, see POSITION_INDEX), finger 0 = open.
// No licence file: keep it out of the repository (strings/data/ is ignored).
//
// Pure ES module, no DOM.

import { INSTRUMENTS } from './fingering.js'

export const PIECES = ['bach1', 'bach2', 'beeth1', 'beeth2_1', 'beeth2_2', 'elgar', 'flower', 'mend1', 'mend2', 'mend3', 'mozart1', 'mozart2_1', 'mozart2_2', 'wind']
export const TITLES = {
  bach1: 'Bach – Partita No. 2, Allemanda', bach2: 'Bach – Partita No. 3, Preludio',
  beeth1: 'Beethoven – Sonata Op. 24 “Spring”, I', beeth2_1: 'Beethoven – Sonata Op. 30/1, III (theme–var. 3)', beeth2_2: 'Beethoven – Sonata Op. 30/1, III (var. 4–6)',
  elgar: 'Elgar – Salut d’Amour', flower: 'Teng – Ú-iā-hue', wind: 'Teng – Bāng Chhun-hong',
  mend1: 'Mendelssohn – Concerto, I (mm. 2–141)', mend2: 'Mendelssohn – Concerto, I (mm. 141–313)', mend3: 'Mendelssohn – Concerto, I (mm. 313–463)',
  mozart1: 'Mozart – Concerto K. 216, I', mozart2_1: 'Mozart – Concerto K. 216, III (mm. 41–234)', mozart2_2: 'Mozart – Concerto K. 216, III (mm. 252–393)',
}

// Approximate performance tempi (quarter notes per minute) from the score
// markings, so the engine sees roughly the note lengths the violinists played.
export const TEMPO = {
  bach1: 66, bach2: 100, beeth1: 120, beeth2_1: 96, beeth2_2: 96, elgar: 72, flower: 66, wind: 66,
  mend1: 176, mend2: 176, mend3: 176, mozart1: 126, mozart2_1: 160, mozart2_2: 160,
}

// Pitch under finger 1 for each annotated position, per string
// (violin_fingering_model.py, predict_finger). Index 0 = open string.
export const POSITION_INDEX = [
  [55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76],
  [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83],
  [69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89],
  [76, 78, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96],
]

/** TNUA position (1–12) of a frame base b on string s: the position whose finger-1 note is nearest. */
export function tnuaPosition(s, b) {
  const open = INSTRUMENTS.violin.open[s], row = POSITION_INDEX[s]
  let best = 1, bd = Infinity
  for (let P = 1; P < row.length; P++) {
    const d = Math.abs(row[P] - open - b) + (row[P] - open > b ? 0.01 : 0)
    if (d < bd) { bd = d; best = P }
  }
  return best
}

/**
 * Parse one CSV into notes { pitch, on, off, beats, truth: { string, position, finger } }.
 * Bars are glued end to end (a reset of start means a new bar beginning where
 * the previous note ended). secPerBeat: seconds per quarter note.
 */
export function parseCSV(text, { secPerBeat = 0.5 } = {}) {
  const rows = text.trim().split(/\r?\n/).slice(1).map(l => l.split(',').map(Number))
  const notes = []
  let barStart = 0, prev = null
  for (const [pitch, start, duration, beatType, string, position, finger] of rows) {
    if (prev && start < prev.start - 1e-6) barStart = prev.abs + prev.duration - start
    const abs = barStart + start
    const n = { pitch, on: abs * secPerBeat, off: (abs + duration) * secPerBeat, beats: duration, beatType, truth: string ? { string: string - 1, position, finger } : null }
    notes.push(n)
    prev = { start, abs, duration }
  }
  // the first up-beat may start below zero
  const t0 = Math.min(0, ...notes.map(n => n.on))
  if (t0 < 0) for (const n of notes) { n.on -= t0; n.off -= t0 }
  return notes
}

/**
 * Align an annotation to a reference note list (both from the same score but
 * a note may be missing or extra): LCS on pitch. Returns an array the length
 * of ref whose entries are the matching notes, or { pitch, truth: null }.
 */
export function align(ref, other) {
  const n = ref.length, m = other.length
  if (n === m && ref.every((r, i) => r.pitch === other[i].pitch)) return other
  const W = m + 1
  const L = new Uint16Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = ref[i].pitch === other[j].pitch ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1])
  const out = []
  let i = 0, j = 0
  while (i < n) {
    if (j < m && ref[i].pitch === other[j].pitch && L[i * W + j] === L[(i + 1) * W + j + 1] + 1) { out.push(other[j]); i++; j++ }
    else if (j < m && L[i * W + j + 1] >= L[(i + 1) * W + j]) j++
    else { out.push({ pitch: ref[i].pitch, truth: null }); i++ }
  }
  return out
}

/** Per-note agreement of an estimate with one annotation. */
export function compare(est, truth) {
  let n = 0, s = 0, f = 0, sf = 0, p = 0, all = 0
  for (let i = 0; i < est.length; i++) {
    const t = truth[i].truth, e = est[i]
    if (!t || e.string == null) { if (t) n++; continue }
    n++
    const okS = e.string === t.string, okF = e.finger === t.finger
    const okP = e.finger === 0 ? true : tnuaPosition(e.string, e.base) === t.position
    s += okS; f += okF; sf += okS && okF; p += okS && okP; all += okS && okF && okP
  }
  return { n, string: s / n, finger: f / n, stringFinger: sf / n, position: p / n, all: all / n }
}

/** Agreement of two annotations with each other (string + finger). */
export function agreement(a, b) {
  let n = 0, m = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i].truth, y = b[i].truth
    if (!x || !y) continue
    n++
    if (x.string === y.string && x.finger === y.finger) m++
  }
  return m / (n || 1)
}

/** Mean over the annotators (M_gen), best annotator (M_high) and "any annotator agrees" (M_soft). */
export function scorePiece(est, truths) {
  const per = truths.map(t => compare(est, t))
  const mean = k => per.reduce((a, r) => a + r[k], 0) / per.length
  let soft = 0, n = 0
  for (let i = 0; i < est.length; i++) {
    if (est[i].string == null) continue
    const ts = truths.map(t => t[i].truth).filter(Boolean)
    if (!ts.length) continue
    n++
    if (ts.some(t => t.string === est[i].string && t.finger === est[i].finger)) soft++
  }
  return {
    notes: per[0].n,
    string: mean('string'), finger: mean('finger'), stringFinger: mean('stringFinger'), position: mean('position'), all: mean('all'),
    high: Math.max(...per.map(r => r.stringFinger)), soft: soft / (n || 1),
  }
}
