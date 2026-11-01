// Which hand plays each note, before the fingering (fingering.js) runs.
//
//   const r = assignHands(notes, trackNames, mode)   // mode: 'tracks' | 'auto'
//   r.source  'tracks' (the file's own split was used) or 'auto' (fingering.js decides)
//
// 'tracks': where the file names its tracks for the hands ("Right hand" / "Left
// hand", RH / LH, treble / bass, upper / lower), each note of such a track takes
// that hand: the edition's split, Bach's hand crossings included (the Bach files
// in midis/ are written this way by midis/tools/bach_hands.mjs). Notes of other
// tracks, and files without such names, are left to the fingering.
// 'auto': every note is left to the fingering's own split (splitHands, the
// split whose fingering costs least), whatever the tracks say.
//
// Notes are the schedule's ({ midi, track, ... }); assignHands sets or deletes
// n.hand on each, so switching modes on the same notes works.
// Used by pathtrace/app.js (#045, #049, #050) and 032_pianist.html.

export const HAND_MODES = { tracks: 'From the score\'s tracks (when named)', auto: 'Automatic (best fit for the fingers)' }

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

export function assignHands(notes, trackNames = [], mode = 'tracks') {
  for (const n of notes) delete n.hand
  if (mode === 'auto' || !tracksNameHands(notes, trackNames)) return { source: 'auto', named: 0 }
  const hand = trackNames.map(handOfTrackName)
  let named = 0
  for (const n of notes) if (hand[n.track]) { n.hand = hand[n.track]; named++ }
  return { source: 'tracks', named }
}

/** ?hands=auto|tracks, else 'tracks'. */
export const handModeOf = v => (v in HAND_MODES ? v : 'tracks')
