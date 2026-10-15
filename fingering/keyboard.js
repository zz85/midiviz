// Keyboard geometry shared by the fingering engine, the 2D roll and the 3D hands.
//
// Same layout as grandpiano/grand-piano.js: centimetres, x along the keyboard,
// 0 at the middle of the 88 keys, white keys 2.35 cm wide, black keys offset
// inside their gap the way real keyboards are (C#/D# lean outwards, F#/A# too).
// keyX() works for any integer MIDI number, not just 21..108, so the engine can
// mirror left-hand music around D (see fingering.js) and still measure it.

export const WHITE_W = 2.35
export const OCTAVE_CM = WHITE_W * 7
/** Average semitone in cm (an octave is 12 of them). */
export const SEMITONE_CM = OCTAVE_CM / 12
export const LOW = 21, HIGH = 108

const IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
const WHITE_INDEX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 }
const mod12 = m => ((m % 12) + 12) % 12

export const isBlack = m => IS_BLACK[mod12(m)] === 1
/** Index of a white key counted from C-1 (works for negative octaves too). */
const whiteOrdinal = m => Math.floor(m / 12) * 7 + WHITE_INDEX[mod12(m)]
const A0_ORDINAL = whiteOrdinal(LOW)
const HALF_SPAN = 52 * WHITE_W / 2

/** Centre of key m in cm (front of the key), 0 = middle of the 88-key keyboard. */
export function keyX(m) {
  if (!isBlack(m)) return -HALF_SPAN + WHITE_W * (whiteOrdinal(m) - A0_ORDINAL + 0.5)
  return keyX(m - 1) + WHITE_W / 2 + BLACK_OFFSET[mod12(m)] * WHITE_W
}

// ── Names ────────────────────────────────────────────────────────────────
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const noteName = m => NAMES[mod12(m)] + (Math.floor(m / 12) - 1)

/** 'C4' → 60, 'F#3' → 54, 'Bb2' → 46, 'C##4' / 'Dbb4' work too. */
export function parseNote(s) {
  const r = /^([A-Ga-g])([#bx♯♭]*)(-?\d+)$/.exec(String(s).trim())
  if (!r) throw new Error(`bad note name: ${s}`)
  let m = STEP[r[1].toUpperCase()] + (+r[3] + 1) * 12
  for (const c of r[2]) m += c === '#' || c === '♯' ? 1 : c === 'x' ? 2 : -1
  return m
}
