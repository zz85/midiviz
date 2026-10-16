// Scale templates (Experiment #033): long scale runs are pulled toward the
// fingerings of the scale books (research/01_violinist_rules.md §6.3–6.5).
//
// A three-octave scale is taught as a fixed pattern of fingers per string —
// four notes on the lower strings, then shifts on the upper ones — that
// depends only on where it starts: on an open string, or with finger 1 or 2
// on the G or D string (Galamian, Flesch; Cora Cooper's sheet gives one
// pattern for every key in a group, and the viola uses the same patterns a
// fifth lower). A run of 15+ diatonic steps in one direction gets each
// applicable pattern laid over it, low note first; the solver then pays a
// soft cost for every note that matches none of them, so the ergonomic
// model can still overrule a pattern that does not suit the passage.
//
// Patterns are blocks of fingers, one block per string, low to high.

// start: 'open' (the run starts on an open string) or the finger on the first note
const PATTERNS = [
  // starting on the open string (G major on G, D major on D …)
  { start: 'open', strings: 4, blocks: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3, 1, 2, 3, 4], [1, 2, 1, 2, 3, 4]] },   // Galamian G
  { start: 'open', strings: 4, blocks: [[0, 1, 2, 3, 4], [1, 2, 1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 1, 2, 3, 4, 4]] },   // Cooper G
  { start: 'open', strings: 3, blocks: [[0, 1, 2, 3, 4], [1, 2, 1, 2, 3, 4], [1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 4]] },     // Cooper D
  // starting with finger 1 on the lowest string used
  { start: 1, strings: 4, blocks: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 1, 2, 3, 4], [1, 2, 3, 1, 2, 3, 4, 4]] },        // Cooper A♭–C♯
  { start: 1, strings: 4, blocks: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 1, 2, 1, 2, 1, 2, 3, 4]] },        // Galamian C
  { start: 1, strings: 3, blocks: [[1, 2, 3, 4], [1, 2, 3, 1, 2, 3, 4], [1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 4]] },          // Cooper E♭–F♯ (D string)
  // starting with finger 2 (Galamian D major, from 2 on the G string in 3rd position)
  { start: 2, strings: 4, blocks: [[2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 1, 2, 1, 2, 1, 2, 3, 4, 4]] },
]

/** Monotonic runs of 1–2 semitone steps among single-note events, at least minLen notes. */
export function findRuns(events, { minLen = 15, maxGap = 0.7 } = {}) {
  const runs = []
  let i = 0
  while (i < events.length - 1) {
    if (events[i].notes.length !== 1) { i++; continue }
    const dir = Math.sign(events[i + 1].top - events[i].top)
    let j = i
    while (j + 1 < events.length && events[j + 1].notes.length === 1 && events[j + 1].on - events[j].on <= maxGap) {
      const d = events[j + 1].top - events[j].top
      if (Math.sign(d) !== dir || Math.abs(d) > 2 || d === 0) break
      j++
    }
    if (dir !== 0 && j - i + 1 >= minLen) {
      // diatonic: no two semitone steps in a row (that would be chromatic)
      let chromatic = false
      for (let k = i + 2; k <= j; k++) if (Math.abs(events[k].top - events[k - 1].top) === 1 && Math.abs(events[k - 1].top - events[k - 2].top) === 1) chromatic = true
      if (!chromatic) runs.push({ from: i, to: j, dir })
    }
    i = Math.max(j, i + 1)
  }
  return runs
}

/**
 * Template fingerings for a run, as arrays of { s, f } aligned to the run's
 * events (in event order). canPlay(pitch, s, f) checks a note is playable so;
 * lowStart the same for the first note, which must sit in a low position.
 */
export function runTemplates(inst, events, run, canPlay, lowStart = canPlay) {
  const idx = []
  for (let k = run.from; k <= run.to; k++) idx.push(k)
  if (run.dir < 0) idx.reverse()                          // lay patterns from the low note up
  const pitches = idx.map(k => events[k].top)
  const out = []
  for (const pat of PATTERNS) {
    const flat = []
    pat.blocks.forEach((b, si) => b.forEach(f => flat.push({ si, f })))
    if (pitches.length > flat.length) continue
    // lowest string: the open string for 'open', otherwise every string the first finger can start from
    const starts = []
    for (let s0 = 0; s0 + pat.strings <= inst.open.length; s0++) {
      if (pat.start === 'open' ? pitches[0] === inst.open[s0] : lowStart(pitches[0], s0, pat.start)) starts.push(s0)
    }
    for (const s0 of starts) {
      const t = pitches.map((p, i) => ({ s: s0 + flat[i].si, f: flat[i].f }))
      // coming down, an open string inside the run becomes 4 on the string below (Schroeder)
      if (run.dir < 0) for (let i = 1; i < t.length; i++) if (t[i].f === 0 && t[i].s > 0 && canPlay(pitches[i], t[i].s - 1, 4)) t[i] = { s: t[i].s - 1, f: 4 }
      if (t.every((x, i) => canPlay(pitches[i], x.s, x.f))) {
        const aligned = new Array(idx.length)
        idx.forEach((k, i) => { aligned[k - run.from] = t[i] })
        out.push(aligned)
      }
    }
  }
  return out
}
