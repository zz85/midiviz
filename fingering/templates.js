// Fingering templates: what pianists apply when they recognise a scale or a
// chromatic run (research/01_pianist_rules.md §3.1, §3.2, §6.5 rule G2).
//
// A run is a stretch of single notes moving by step in one direction. When
// the notes of a run fit a major / minor scale, every note gets the finger
// the standard (Clementi / ABRSM) fingering gives its scale degree; chromatic
// runs get 1 on white keys and 3 on black keys. fingering.js charges a soft
// cost for deviating, so the ergonomic model can still override a template
// where the context makes it awkward.

import { isBlack } from './keyboard.js'

// One octave ascending from the tonic, [RH, LH].
export const SCALE_FINGERINGS = {
  major: {
    C: ['1231234', '5432132'], G: ['1231234', '5432132'], D: ['1231234', '5432132'],
    A: ['1231234', '5432132'], E: ['1231234', '5432132'], B: ['1231234', '4321432'],
    F: ['1234123', '5432132'], 'F#': ['2341231', '4321321'], Db: ['2312341', '3214321'],
    Ab: ['3412312', '3214321'], Eb: ['3123412', '3214321'], Bb: ['2123123', '3214321'],
  },
  minor: {
    A: ['1231234', '5432132'], E: ['1231234', '5432132'], D: ['1231234', '5432132'],
    G: ['1231234', '5432132'], C: ['1231234', '5432132'], B: ['1231234', '4321432'],
    F: ['1234123', '5432132'], 'F#': ['3412312', '4321321'], 'C#': ['3412312', '3214321'],
    'G#': ['3412312', '3214321'], Eb: ['3123412', '2143213'], Bb: ['2123123', '2132143'],
  },
}
const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
const STEPS = {
  major: [[0, 2, 4, 5, 7, 9, 11]],
  // harmonic, melodic ascending and natural minor share one fingering
  minor: [[0, 2, 3, 5, 7, 8, 11], [0, 2, 3, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]],
}
const pc = p => ((p % 12) + 12) % 12

/** Keys (with their degree map) whose scale contains every pitch class in pcs. */
function candidateKeys(pcs) {
  const out = []
  for (const type of ['major', 'minor']) for (let t = 0; t < 12; t++) {
    for (const steps of STEPS[type]) {
      const set = steps.map(s => (t + s) % 12)
      if (![...pcs].every(x => set.includes(x))) continue
      const accidentals = set.filter(x => isBlack(x)).length
      out.push({ type, tonic: t, degree: x => set.indexOf(x), accidentals, name: (type === 'major' ? MAJOR_NAMES : MINOR_NAMES)[t] })
      break
    }
  }
  return out
}

/**
 * Split a sequence of single notes into stepwise runs. seq: [{ p, on }] in
 * time order (one note per onset). Returns [{ from, to, dir }] index ranges;
 * neighbouring runs share their turning note.
 */
export function findRuns(seq, { maxStep = 3, maxGap = 0.6, minLen = 6 } = {}) {
  const runs = []
  let from = 0, dir = 0
  const close = (to) => { if (dir && to - from + 1 >= minLen) runs.push({ from, to, dir }) }
  for (let i = 1; i < seq.length; i++) {
    const d = seq[i].p - seq[i - 1].p
    const ok = d !== 0 && Math.abs(d) <= maxStep && seq[i].on - seq[i - 1].on <= maxGap && !seq[i].chord && !seq[i - 1].chord
    const s = Math.sign(d)
    if (ok && (dir === 0 || s === dir)) { dir = s; continue }
    close(i - 1)
    if (ok) { from = i - 1; dir = s } else { from = i; dir = 0 }
  }
  close(seq.length - 1)
  return runs
}

/**
 * Scale templates for one hand. seq: that hand's onsets in time order as
 * { p (real pitch), on, chord }. Returns a Map index → [finger, weight].
 */
export function scaleTemplate(seq, hand) {
  const tpl = new Map()
  const H = hand === 'L' ? 1 : 0
  for (const run of findRuns(seq, { maxStep: 3, minLen: 7 })) {
    const ps = seq.slice(run.from, run.to + 1).map(n => n.p)
    if (ps.some((p, i) => i && Math.abs(p - ps[i - 1]) === 3 && run.dir === 0)) continue
    const pcs = new Set(ps.map(pc))
    if (pcs.size < 6) continue
    // chromatic stretches are not scales
    if (ps.some((p, i) => i > 1 && Math.abs(p - ps[i - 2]) === 2 && Math.abs(p - ps[i - 1]) === 1 && Math.abs(ps[i - 1] - ps[i - 2]) === 1)) continue
    const lo = Math.min(...ps), hi = Math.max(...ps)
    let keys = candidateKeys(pcs)
    if (!keys.length) continue
    // the run's lowest or highest note is usually the tonic; then fewer accidentals
    const score = k => (k.tonic === pc(lo) || k.tonic === pc(hi) ? 0 : 10) + (k.type === 'minor' ? 0.5 : 0) + Math.min(k.accidentals, 12 - k.accidentals - 0)
    keys.sort((a, b) => score(a) - score(b))
    const key = keys[0]
    const pat = SCALE_FINGERINGS[key.type][key.name][H].split('').map(Number)
    // the tonic in the middle of a run takes the continuing finger
    let mid = pat[0]
    if (H && pat[6] === 2) mid = 1
    if (!H && pat.join('') === '2123123') mid = 4
    ps.forEach((p, i) => {
      const deg = key.degree(pc(p))
      let f = deg === 0 ? mid : pat[deg]
      const isLo = p === lo && (i === 0 || i === ps.length - 1)
      const isHi = p === hi && (i === 0 || i === ps.length - 1)
      if (deg === 0 && isLo) f = pat[0]                         // a scale starts on its starting finger
      // the outer end (RH top, LH bottom) never lands on the thumb: next finger instead
      if (f === 1 && ((!H && isHi) || (H && isLo))) {
        const nb = ps[i === 0 ? 1 : i - 1], nd = key.degree(pc(nb))
        f = Math.min(5, (nd === 0 ? mid : pat[nd]) + 1)
      }
      const idx = run.from + i
      // the tonic where a scale starts or turns anchors the whole fingering: weigh it double
      const w = deg === 0 && (isLo || isHi) ? 2 : 1
      // a turning note shared by two runs: the outer-end rule wins
      if (!tpl.has(idx) || isLo || isHi) tpl.set(idx, [f, w])
    })
  }
  return tpl
}

/**
 * Chromatic templates in right-hand space (the LH mirrored, see fingering.js):
 * 3 on black keys, 1 on white keys, 2 on a white key whose lower neighbour is
 * also white (F and C in the RH; E and B in the LH), except at the run's
 * lowest note. A white top note (RH top / LH bottom) is left free: pianists
 * turn there with whatever finger avoids putting the thumb on the end. seq: [{ p (RH space), on, chord }]. Returns Map index → [finger, weight].
 */
export function chromaticTemplate(seq) {
  const tpl = new Map()
  for (const run of findRuns(seq, { maxStep: 1, minLen: 6 })) {
    const ps = seq.slice(run.from, run.to + 1).map(n => n.p)
    const lo = Math.min(...ps), hi = Math.max(...ps)
    ps.forEach((p, i) => {
      let f = isBlack(p) ? 3 : 1
      if (!isBlack(p) && !isBlack(p - 1) && p !== lo) f = 2
      // never turn on the thumb at the top: leave that note to the cost model
      if (p === hi && f === 1) return
      tpl.set(run.from + i, [f, 1])
    })
  }
  return tpl
}
