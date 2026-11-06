// The tempo of each movement of the complete Goldberg (midis/bach_goldberg.mid and
// midis/bach_goldberg_repeats.mid).
//
// 13 movements keep the metronome mark their Mutopia editors give (\tempo in the
// LilyPond source): Var. 5, 8, 11, 12, 15, 17, 18, 19, 21, 22, 23, 26 and 29. The
// other 18 have none, and LilyPond's MIDI plays them at its default, a quarter = 60:
// too slow for the fast ones (1, 10, 14, 20, 28) and the compound meters (3, 4, 6,
// 7, 24, 27), three times too fast for the Adagio (25), and one tempo for both
// halves of the Ouverture (16). They take the tempo of their character here: a
// choice for this file (5 Nov 2026), not an edition's. The 1853 edition marks
// only Var. 15 Andante, 22 Alla breve and 25 Adagio.
//
// Each tempo is [the note it counts, as a length in quarters, its beats a minute],
// from a point of the printed music (quarters from the movement's start) on.
// The standalone Aria (midis/bach_goldberg_aria.mid) keeps its ♩=60.
//
// SPEED then plays the whole work faster (1.1: 10 %), every movement alike, the
// editors' marks too; the silences between movements stay as they are.
export const SPEED = 1.1

const Q = 1, E = 0.5, DQ = 1.5, H = 2
// id: [[from (quarters), note, bpm], ...]; a movement not listed keeps its source's tempo
export const TEMPO = {
  aria: [[0, Q, 56]],
  v01: [[0, Q, 100]],
  v02: [[0, Q, 76]],
  v03: [[0, DQ, 50]],
  v04: [[0, DQ, 54]],
  v06: [[0, DQ, 44]],
  v07: [[0, DQ, 56]],
  v09: [[0, Q, 66]],
  v10: [[0, Q, 100]],
  v13: [[0, Q, 54]],
  v14: [[0, Q, 104]],
  // the Ouverture in 2/2, then the fugue in 3/8 from bar 17, the half's second ending (q 64)
  v16: [[0, Q, 60], [64, DQ, 60]],
  v20: [[0, Q, 100]],
  v24: [[0, DQ, 50]],
  v25: [[0, E, 44]],
  v27: [[0, DQ, 56]],
  v28: [[0, Q, 96]],
  v30: [[0, Q, 72]],
}
// the editors' marks, for the record (the sources hold them; nothing reads this)
export const EDITORS = { v05: [Q, 130], v08: [Q, 95], v11: [Q, 93], v12: [Q, 94], v15: [E, 66], v17: [Q, 105], v18: [H, 96], v19: [E, 138], v21: [Q, 34], v22: [H, 90], v23: [Q, 85], v26: [Q, 85], v29: [Q, 84] }

/**
 * Seconds from a movement's start at a point of its printed music (q, quarters),
 * as this file plays it. `spq`: the source's seconds a quarter, which a movement
 * not in TEMPO keeps; both then SPEED times faster. Monotone and piecewise linear.
 */
export function secondsAt(id, q, spq) {
  const tempo = TEMPO[id]
  if (!tempo) return q * spq / SPEED
  let t = 0
  for (let i = 0; i < tempo.length; i++) {
    const [from, note, bpm] = tempo[i], to = tempo[i + 1]?.[0] ?? Infinity
    if (q <= from) break
    t += (Math.min(q, to) - from) * 60 / bpm / note
  }
  return t / SPEED
}

/** The source's seconds a quarter (its one tempo, as LilyPond's MIDI plays it), from readSource's notes. */
export function sourceSpq(notes) {
  const ref = notes.find(n => n.q > 1)
  return ref.on / ref.q
}
