// Exercises with known "textbook" fingerings, used by the tests and offered in
// the UI as demo material. Sources: research/01_pianist_rules.md §3.
//
// Every exercise is { id, title, notes: [{ pitch, on, off, velocity, hand }],
// expect?: { R?: string|string[], L?: string|string[] } } where expect lists
// accepted finger strings (onset order, chords bottom → top).

import { parseNote } from './keyboard.js'
import { SCALE_FINGERINGS } from './templates.js'

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12]
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11, 12]

/** Single line from pitches; dur per note in seconds. */
export function line(pitches, { dur = 0.15, hand = 'R', start = 0, legato = 0.95, velocity = 0.7 } = {}) {
  return pitches.map((p, i) => ({
    pitch: typeof p === 'string' ? parseNote(p) : p,
    on: start + i * dur, off: start + i * dur + dur * legato, velocity, hand,
  }))
}

/** Sequence of chords (arrays of pitches). */
export function chords(list, { dur = 0.5, hand = 'R', start = 0, legato = 0.95 } = {}) {
  const out = []
  list.forEach((ch, i) => {
    for (const p of ch) out.push({ pitch: typeof p === 'string' ? parseNote(p) : p, on: start + i * dur, off: start + (i + 1) * dur * legato, velocity: 0.7, hand })
  })
  return out
}

/** Scale up `octaves` octaves and back down. */
export function scale(tonic, { octaves = 2, minor = false, updown = true } = {}) {
  const t = typeof tonic === 'string' ? parseNote(tonic) : tonic
  const steps = minor ? HARMONIC_MINOR : MAJOR
  const up = []
  for (let o = 0; o < octaves; o++) for (let i = 0; i < 7; i++) up.push(t + 12 * o + steps[i])
  up.push(t + 12 * octaves)
  return updown ? up.concat(up.slice(0, -1).reverse()) : up
}

// Textbook scale fingerings (one octave ascending; research §3.1) live in templates.js.
export { SCALE_FINGERINGS }

/**
 * Expected 2-octave up-and-down fingering string for one hand, built from the
 * one-octave pattern as textbooks print it (degrees 1..7 going up, starting
 * finger first). In the middle of a run the tonic takes the "continuing"
 * finger: LH 5 becomes 1 (C-type keys), RH B♭ 2 becomes 4. The RH top note
 * is 5 (or 4 in F) when the pattern starts on the thumb, otherwise the
 * continuing finger; the LH top note is the continuing finger.
 */
export function scaleExpect(pattern, hand) {
  const f = pattern.split('').map(Number)
  let mid = f[0]
  // LH: after 2 on the leading note the tonic falls to the thumb (C 54321321…, B 43214321…)
  if (hand === 'L' && f[6] === 2) mid = 1
  if (hand === 'R' && pattern === '2123123') mid = 4
  const top = hand === 'R' && f[0] === 1 ? f[6] + 1 : mid
  const up = [f[0], ...f.slice(1), mid, ...f.slice(1), top]
  return up.concat(up.slice(0, -1).reverse()).join('')
}

/**
 * Accepted variants: the textbook string first, then the same with the end
 * notes taken by the "end" finger, as teachers allow when a scale starts or
 * turns (RH: 5 on the top note; LH: 5 on the first and last note, 1 on top).
 */
export function scaleAccepted(pattern, hand) {
  const base = scaleExpect(pattern, hand).split('').map(Number)
  const n = base.length, topI = (n - 1) / 2
  const out = new Set([base.join('')])
  const ends = hand === 'R' ? [[topI, 5]] : [[0, 5], [topI, 1]]
  const subsets = [[]]
  for (const e of ends) for (const s of [...subsets]) subsets.push([...s, e])
  for (const s of subsets) {
    const v = base.slice()
    for (const [i, fing] of s) { v[i] = fing; if (i === 0) v[n - 1] = fing }
    // only if the neighbours still make sense (no same finger on different keys)
    if (v.every((x, i) => i === 0 || x !== v[i - 1])) out.add(v.join(''))
  }
  return [...out]
}

const TONIC_OCT = { R: 4, L: 3 }
export function scaleExercise(key, { minor = false, hand = 'R', dur = 0.15 } = {}) {
  const name = key + TONIC_OCT[hand]
  const pitches = scale(name, { minor })
  const pat = SCALE_FINGERINGS[minor ? 'minor' : 'major'][key][hand === 'R' ? 0 : 1]
  return {
    id: `scale-${key}${minor ? 'm' : ''}-${hand}`,
    title: `${key} ${minor ? 'harmonic minor' : 'major'} scale, ${hand === 'R' ? 'RH' : 'LH'}`,
    notes: line(pitches, { dur, hand }),
    expect: { [hand]: scaleAccepted(pat, hand) },
  }
}

// ── The suite ──────────────────────────────────────────────────────────────
export function exercises() {
  const ex = []
  const add = e => (ex.push(e), e)

  add({ id: 'five-finger-C', title: 'Five-finger position C–G, RH', notes: line(['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4']), expect: { R: '123454321' } })
  add({ id: 'five-finger-C-L', title: 'Five-finger position C–G, LH', notes: line(['C3', 'D3', 'E3', 'F3', 'G3', 'F3', 'E3', 'D3', 'C3'], { hand: 'L' }), expect: { L: '543212345' } })
  add({ id: 'chopin-position', title: 'Chopin position E–F♯–G♯–A♯–B, RH', notes: line(['E4', 'F#4', 'G#4', 'A#4', 'B4', 'A#4', 'G#4', 'F#4', 'E4']), expect: { R: '123454321' } })

  add({
    id: 'chromatic-R', title: 'Chromatic scale from C, RH',
    notes: line(Array.from({ length: 13 }, (_, i) => 60 + i)),
    expect: { R: ['1313123131312', '1313123131313', '1313123131342', '1312312313412', '1313121313412'] },
  })

  add({ id: 'arpeggio-C-R', title: 'C major arpeggio, RH (2 octaves)', notes: line(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6']), expect: { R: '1231235' } })
  add({ id: 'arpeggio-C-L', title: 'C major arpeggio, LH (2 octaves)', notes: line(['C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5'], { hand: 'L' }), expect: { L: ['5421421', '5321321'] } })

  add({ id: 'alberti', title: 'Alberti bass C–G–E–G, LH', notes: line(['C3', 'G3', 'E3', 'G3', 'C3', 'G3', 'E3', 'G3'], { hand: 'L', dur: 0.2 }), expect: { L: '51315131' } })

  add({ id: 'triads-R', title: 'Triads C–F–G–C, RH', notes: chords([['C4', 'E4', 'G4'], ['C4', 'F4', 'A4'], ['B3', 'D4', 'G4'], ['C4', 'E4', 'G4']]), expect: { R: ['135135125135', '135135125135', '135135135135', '135125125135'] } })
  add({ id: 'octaves-R', title: 'Octaves C–D–E–F–G, RH', notes: chords([['C4', 'C5'], ['D4', 'D5'], ['E4', 'E5'], ['F4', 'F5'], ['G4', 'G5']], { dur: 0.3 }), expect: { R: '1515151515' } })

  add({ id: 'repeat-fast', title: 'Fast repeated note ×8, RH', notes: line(Array(8).fill('E4'), { dur: 0.09, legato: 0.5 }), expect: { R: ['43214321', '32132132', '32143214', '43213213', '32132131', '43214323', '32132121'] } })
  add({ id: 'repeat-slow', title: 'Slow repeated note ×4, RH', notes: line(Array(4).fill('E4'), { dur: 0.6, legato: 0.8 }) })
  add({ id: 'trill', title: 'Trill C–D, RH', notes: line(Array.from({ length: 16 }, (_, i) => (i % 2 ? 'D5' : 'C5')), { dur: 0.08 }), expect: { R: ['1212121212121212', '1313131313131313', '2323232323232323'] } })

  add({ id: 'leap', title: 'Leap G4 → A5, RH', notes: line(['C4', 'E4', 'G4', 'A5', 'F5', 'D5'], { dur: 0.3 }) })
  add({ id: 'pentatonic', title: 'Black-key pentatonic run, RH', notes: line(['F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5', 'C#6', 'D#6', 'F#6']) })
  add({ id: 'hanon-1', title: 'Hanon No. 1 (two groups), RH', notes: line(['C4', 'E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4', 'D4', 'F4', 'G4', 'A4', 'B4', 'A4', 'G4', 'F4'], { dur: 0.12 }), expect: { R: '1234543212345432' } })

  // Two hands: melody over Alberti bass, no hand given (tests the hand split too)
  {
    const mel = line(['E5', 'D5', 'C5', 'D5', 'E5', 'E5', 'E5'], { dur: 0.4 })
    mel[6].off = mel[6].on + 0.78
    const bass = line(['C3', 'G3', 'E3', 'G3', 'C3', 'G3', 'E3', 'G3', 'C3', 'G3', 'E3', 'G3', 'C3', 'G3'], { dur: 0.2 })
    const notes = [...mel, ...bass]
    for (const n of notes) delete n.hand
    add({ id: 'two-hands', title: 'Melody over Alberti bass (hands split automatically)', notes, expect: { R: '3212333', L: '51315131513151' } })
  }

  // Held note under a moving voice (RH holds C with the thumb while the top voice moves)
  {
    const held = { pitch: 60, on: 0, off: 1.6, velocity: 0.7, hand: 'R' }
    const top = line(['E4', 'F4', 'G4', 'F4'], { dur: 0.4 })
    add({ id: 'held-voice', title: 'Held thumb under a moving voice, RH', notes: [held, ...top], expect: { R: ['13454', '12343', '13453', '12454', '13434'] } })
  }

  // Twelve major + twelve minor scales, both hands
  for (const minor of [false, true]) for (const key of Object.keys(SCALE_FINGERINGS[minor ? 'minor' : 'major'])) for (const hand of ['R', 'L']) {
    const e = scaleExercise(key, { minor, hand })
    e.suite = 'scales'
    ex.push(e)
  }
  return ex
}
