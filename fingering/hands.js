// Which hand plays each note, before the fingering (fingering.js) runs.
//
//   const r = assignHands(notes, trackNames, mode)   // mode: 'tracks' | 'auto' | 'crossings'
//   r.source  'tracks' (the file's own split was used), 'crossings' (in its hand crossings
//             alone) or 'auto' (fingering.js decides); r.passages, for 'crossings': [[t0, t1]]
//
// 'tracks': where the file names its tracks for the hands ("Right hand" / "Left
// hand", RH / LH, treble / bass, upper / lower), each note of such a track takes
// that hand: the edition's split, Bach's hand crossings included (the Bach files
// in midis/ are written this way by midis/tools/bach_hands.mjs). Notes of other
// tracks, and files without such names, are left to the fingering.
// 'auto': every note is left to the fingering's own split (splitHands, the
// split whose fingering costs least), whatever the tracks say.
// 'crossings': the fingering's split, except where the tracks cross: a passage where the
// left hand's track plays above the right hand's (the Goldberg's variations for two
// manuals, where one hand reaches over the other). There the tracks' split holds, from a
// second before the first crossing to a second after the last; elsewhere the fingering
// splits as in 'auto', carrying on from where each hand left the passage. A crossing is a
// left-hand note above a right-hand note sounding with it; crossings less than 2 s apart are
// one passage, and a passage needs 4 of them (a held tenor note under a brief low treble one,
// as the Aria has, isn't a crossing).
//
// Notes are the schedule's ({ midi, track, ... }); assignHands sets or deletes
// n.hand on each, so switching modes on the same notes works.
// Used by pathtrace/app.js (#045, #049, #050) and 032_pianist.html.


export const HAND_MODES = { tracks: 'From the score\'s tracks (when named)', auto: 'Automatic (best fit for the fingers)', crossings: 'Automatic, with the tracks\' hand crossings' }

const RIGHT = /\b(right|rh|r\.?h\.?|treble|upper)\b/i
const LEFT = /\b(left|lh|l\.?h\.?|bass|lower)\b/i

/** The hand a track's name gives it: 'R', 'L' or null. */
export function handOfTrackName(name) {
  name = String(name || '')
  return RIGHT.test(name) ? 'R' : LEFT.test(name) ? 'L' : null
}

/** Do the tracks the notes use name both hands? */
export function tracksNameHands(notes, trackNames = []) {
  const hand = trackNames.map(handOfTrackName), used = new Set(notes.map(n => n.track))
  return [...used].some(t => hand[t] === 'R') && [...used].some(t => hand[t] === 'L')
}

export function assignHands(notes, trackNames = [], mode = 'tracks', opts = {}) {
  for (const n of notes) delete n.hand
  if (mode === 'auto' || !tracksNameHands(notes, trackNames)) return { source: 'auto', named: 0 }
  const hand = trackNames.map(handOfTrackName)
  if (mode === 'crossings') {
    const passages = crossings(notes, hand, opts)
    let named = 0, k = 0
    for (const n of [...notes].sort((a, b) => a.time - b.time)) {
      while (k < passages.length && passages[k][1] < n.time) k++
      if (hand[n.track] && k < passages.length && n.time >= passages[k][0]) { n.hand = hand[n.track]; named++ }
    }
    return { source: passages.length ? 'crossings' : 'auto', named, passages }
  }
  let named = 0
  for (const n of notes) if (hand[n.track]) { n.hand = hand[n.track]; named++ }
  return { source: 'tracks', named }
}

/**
 * The passages where the tracks cross: [[t0, t1]] in seconds, each padded by `pad` on both
 * sides. `hand[track]` is 'L', 'R' or null; notes are { midi, time, duration, track }.
 */
export function crossings(notes, hand, { gap = 2, pad = 1, least = 4 } = {}) {
  const L = notes.filter(n => hand[n.track] === 'L').sort((a, b) => a.time - b.time)
  const R = notes.filter(n => hand[n.track] === 'R').sort((a, b) => a.time - b.time)
  // (the right-hand notes sounding with each left-hand one: a window that moves on with it)
  const maxDur = R.reduce((m, n) => Math.max(m, n.duration), 0)
  const ev = []
  let j0 = 0
  for (const l of L) {
    const a = l.time, b = l.time + l.duration
    while (j0 < R.length && R[j0].time + maxDur < a) j0++
    for (let j = j0; j < R.length && R[j].time < b; j++) {
      const r = R[j]
      if (r.time + r.duration > a && l.midi > r.midi) ev.push(Math.max(a, r.time))
    }
  }
  ev.sort((a, b) => a - b)
  const runs = []
  for (const t of ev) { const p = runs.at(-1); if (p && t - p.t1 < gap) { p.t1 = t; p.k++ } else runs.push({ t0: t, t1: t, k: 1 }) }
  const out = []
  for (const p of runs) {
    if (p.k < least) continue
    const q = out.at(-1), a = p.t0 - pad, b = p.t1 + pad
    if (q && a <= q[1]) q[1] = b; else out.push([a, b])
  }
  return out
}

/** ?hands=auto|tracks, else 'tracks'. */
export const handModeOf = v => (v in HAND_MODES ? v : 'tracks')
