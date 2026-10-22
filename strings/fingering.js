// Automatic violin / viola (and cello) fingering (Experiment #033).
//
// Design after research/02_algorithms.md §12 and the rules of
// research/01_violinist_rules.md §11:
//
//   events   notes whose onsets lie within 30 ms form one event (a single
//            note, a double stop or a 3–4 note chord)
//   states   per event, every playable hand configuration: the hand's frame
//            base b (semitones of finger 1 above the open string, the same
//            on every string since strings are a fifth apart), and per note
//            its string and finger (0 = open). Chord notes go on adjacent
//            strings, low to high
//   decode   exact first-order Viterbi over the events (b in the state makes
//            "the hand stays" the cheap default), with costs that know about
//            time: shifts are hard on fast notes and free-ish during an open
//            string or a rest, open strings are welcome on short notes and
//            avoided on long ones
//
// Distances are physical: a stop n semitones above the open string lies at
// L·(1 − 2^(−n/12)) from the nut, so a shift high up the string is shorter
// than the same interval in 1st position, and stretches get easier there.
// The viola's longer string makes the same frame wider, so extensions cost
// more on it (research 01 §1.3, §9).
//
// Long scale runs also get a soft pull toward the scale-book patterns
// (templates.js).
//
// Pure ES module, no DOM: runs in the browser, a worker or Node (tests).

import { findRuns, runTemplates } from './templates.js'

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
export const noteName = m => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
export function parseNote(s) {
  const m = /^([A-Ga-g])([#♯b♭s]*)(-?\d)$/.exec(String(s).trim())
  if (!m) throw new Error(`bad note "${s}"`)
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()]
  let acc = 0
  for (const c of m[2]) acc += c === 'b' || c === '♭' ? -1 : 1
  return base + acc + 12 * (+m[3] + 1)
}

// ── Instruments ────────────────────────────────────────────────────────────
// open: MIDI pitches of the open strings, low → high. L: vibrating string
// length (mm). maxB: highest frame base per string (research 01 §1.4).
// frame: finger → { offset above finger 1: [shape cost, extension?] }.
const VIOLIN_FRAME = {
  1: { '-1': [1.2, 1], 0: [0, 0], 1: [0.6, 0] },   // 1 back (extension), 1, 1 sharpened (D♯ in 3rd position)
  2: { 1: [0, 0], 2: [0, 0], 3: [1.6, 1] },
  3: { 2: [0.4, 0], 3: [0, 0], 4: [0, 0], 5: [1.8, 1] },
  4: { 3: [1.2, 0], 4: [0.3, 0], 5: [0, 0], 6: [0.6, 0], 7: [2.2, 1], 8: [4, 1], 9: [6, 1] },
}
const CELLO_FRAME = {
  // closed frame 1-2-3-4 = 0,1,2,3 (a minor third); forward extension
  // between 1 and 2 moves 2-3-4 up a semitone; backward extension of 1
  1: { '-1': [0.8, 1], 0: [0, 0] },
  2: { 1: [0, 0], 2: [0.5, 1] },
  3: { 2: [0, 0], 3: [0.5, 1] },
  4: { 3: [0, 0], 4: [0.5, 1] },
}
// Double bass (research 04 §2, §7.2): the frame depends on the position.
// Entries: f finger (5 = thumb), o offset above finger 1 (or above the thumb
// in thumb position), c cost (number or function of b), b range, th = thumb
// position (b is then the thumb's place), ext = extension.
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t))
const BASS_THUMB = [[5, 0, 0], [1, 1, 0], [1, 2, 0], [2, 2, 0.3], [2, 3, 0], [2, 4, 0.4], [3, 3, 0.4], [3, 4, 0], [3, 5, 0.3], [4, 6, 3]]
const BASS_FRAME = [
  // the neck, Simandl 1-2-4: a whole tone under the hand, 3 and 4 move together
  { f: 1, o: 0, c: 0, bMax: 13 }, { f: 1, o: -1, c: 0.8, ext: true, bMax: 8 },
  { f: 2, o: 1, c: 0, bMax: 13 },
  { f: 4, o: 2, c: 0, bMax: 8 }, { f: 4, o: 3, c: 1.2, ext: true, bMax: 8 },
  { f: 3, o: 1, c: 2.5, bMax: 8 }, { f: 3, o: 2, c: 1.5, bMax: 8 },
  // the crook of the neck (b 9–11): 3 takes over from 4; above it 1-2-3 without the thumb
  { f: 3, o: 2, c: b => lerp(1, 0, (b - 9) / 2), bMin: 9, bMax: 13 },
  { f: 4, o: 2, c: b => 0.3 + 0.85 * (b - 9), bMin: 9, bMax: 11 }, { f: 4, o: 3, c: 1.5, bMin: 9, bMax: 11 },
  { f: 2, o: 2, c: 0.8, bMin: 12, bMax: 13 }, { f: 3, o: 3, c: 0.6, bMin: 12, bMax: 13 },
  // thumb position from the octave (Petracchi's frames), and a dearer low thumb from the neck heel
  ...BASS_THUMB.map(([f, o, c]) => ({ f, o, c, th: true, bMin: 12 })),
  ...BASS_THUMB.map(([f, o, c]) => ({ f, o, c: c + 1, th: true, bMin: 7, bMax: 11 })),
]
const BASS_POS = ['', '½', 'I', 'II', 'II½', 'III', 'III½', 'IV', 'V', 'V½', 'VI', 'VI½', 'VII', 'VII½']

export const INSTRUMENTS = {
  violin: { name: 'Violin', open: [55, 62, 69, 76], strings: ['G', 'D', 'A', 'E'], L: 328, maxB: [14, 15, 17, 21], frame: VIOLIN_FRAME, template: 'violin', program: 40 },
  viola: { name: 'Viola', open: [48, 55, 62, 69], strings: ['C', 'G', 'D', 'A'], L: 375, maxB: [13, 14, 15, 19], frame: VIOLIN_FRAME, template: 'violin', program: 41 },
  cello: { name: 'Cello', open: [36, 43, 50, 57], strings: ['C', 'G', 'D', 'A'], L: 690, maxB: [12, 12, 14, 19], frame: CELLO_FRAME, program: 42 },
  // tuned in fourths, sounding an octave below the written part; weights from research 04 §7.3
  bass: {
    name: 'Double bass', open: [28, 33, 38, 43], strings: ['E', 'A', 'D', 'G'], L: 1050, maxB: [9, 12, 19, 26],
    frameList: BASS_FRAME, posNames: BASS_POS, program: 43, shiftNorm: true, flatStretch: true,
    weights: {
      shift: 0.4, shiftSemitone: 0.5, shiftSlide: 0.1, open: -0.3, openAscend: 0.4, openLong: 1.0, openTwice: 0.5, openTop: 0, topString: 0, lowString: 0,
      cross: [0, 0.25, 3, 6], fourth: 0, shape: 1, lowStringHigh: 0.2, posHigh: 0.3,
      // positions are nearly free on the bass (it shifts all the time); a small slope keeps ties low
      pos: [3, 0.04, 0, 0.06, 0.09, 0.12, 0.15, 0.18, 0.24, 0.28, 0.32, 0.36, 0.4],
    },
    modes: { beginner: { maxB: 5, weights: { open: -0.6, openLong: 0, openTwice: 0, openDescend: 0, openAscend: 0 } } },
  },
}
export const REFERENCE_L = 328

/** Distance of a stop n semitones above the open string from the nut (mm). */
export const stopMM = (n, L = REFERENCE_L) => L * (1 - 2 ** (-n / 12))

// Position names from the frame base (research 01 §2.1). Diatonic names are
// key-dependent; this is the usual reading of the semitone anchor.
const POS = ['', '½', '1', '2', '2', '3', '3', '4', '5', '5', '6', '6', '7', '8', '8', '9', '9', '10', '10', '11', '12', '12', '13', '13']
export const positionName = (b, inst = null, thumb = false) => {
  if (inst?.posNames) return thumb ? 'T' : inst.posNames[b] ?? 'VII+'
  return POS[b] ?? String(Math.round(b / 1.75))
}
const ROMAN = { '½': '½', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII' }
export const positionRoman = (b, inst = null, thumb = false) => inst?.posNames ? (thumb ? 'thumb' : positionName(b, inst)) : ROMAN[positionName(b)] ?? positionName(b)
/** Finger label: 0–4, T for the thumb. */
export const fingerLabel = f => (f === 5 ? 'T' : String(f))
// order of the fingers along the string: the thumb sits below finger 1
const rank = f => (f === 5 ? 0 : f)

// ── Weights ────────────────────────────────────────────────────────────────
export const DEFAULTS = {
  instrument: 'violin',
  mode: 'standard',        // 'beginner' | 'standard' | 'expressive' | 'nearest'
  handSize: 1,             // 0.85 small … 1.15 large: scales stretch costs
  chordTolerance: 0.03,    // onsets closer than this (s) form one event
  weights: {
    // Starting points from research 02 §12.3, then tuned by coordinate descent
    // on the TNUA dataset (test/tnua.js --tune --bench=0.08: string+finger
    // agreement with 10 violinists, plus the textbook exercises)
    shift: 0.94,  // per shift
    shiftDist: 0.675,  // per unit of travel (mix of semitones and mm, see shiftUnits)
    shiftFast: 2,  // × up to this on very fast notes
    shiftOpen: 0.047,  // × when an open string sounds before / after (the hand is free)
    shiftOpenDist: 0.399,  // × on the distance part when an open string covers the shift
    shiftRest: 0.6,  // × after a rest
    shiftSlow: 0.8,  // × after a long note (time to place the shift)
    shiftSemitone: 0.998,  // × for a shift on a semitone step
    shiftSlide: 0.3,  // same finger carries the shift to a different pitch (audible slide)
    wrongDir: 0,  // hand moves against the melody on one string
    shiftBack: 0,  // reserved
    // fingers
    slide: 3,  // same finger, different pitch, same string, no shift (×2: beyond a semitone)
    slideSemi: 1.6,  // … by a semitone; allowed, but a stable 1-2-3 frame is usually cleaner
    oblique: 1.746,  // same finger to the next string at another spot
    fifth: 0.13,  // same finger across a perfect fifth (finger lies over both strings)
    crossed: 3,  // fingers out of order inside one frame
    repeatChange: 2.4,  // a repeated pitch moves to another string / finger
    fourth: 0.665,  // finger 4 is the weakest
    stretch: 1,  // × extension costs (also × string length², ÷ hand size²)
    shape: 2.66,  // × non-extension frame shapes (augmented 4th, contracted 3/4)
    // strings
    cross: [0, 0.35, 5, 6],  // by number of strings crossed
    crossFast: 1.995,  // × on fast notes
    crossBack: 5,  // the line rises while the string goes down (or vice versa)
    // open strings
    open: -0.075,  // base
    openLong: 1.6,  // per half second over ¼ s (no vibrato on an open string)
    openFast: 0.45,  // bonus on notes under 0.2 s
    openDescend: 0.2,  // descending: prefer 4 on the lower string (Schroeder)
    openAscend: -0.2,  // ascending: the open string is the natural choice
    openTop: -0.19,  // + on the top string (bright open E)
    openChord: 0.6,  // bonus for an open string inside a double stop / chord
    openTwice: 0,  // two open strings in a row (bass: Morton's rule 7)
    thumbNote: 0.2,  // a note stopped by the thumb (bass / cello thumb position)
    thumbChange: 0.6,  // + on a shift into or out of thumb position
    // diatonic fingers (estimateKeys): off by default — on TNUA they did not
    // help (S+F −0.4 / −0.8 points), see README
    letter: 0,  // per scale step the finger is away from its note letter (×(steps − ½))
    posOffKey: 0,  // finger 1 on a note outside the key
    template: 3,  // a note of a long scale run that follows no scale-book pattern
    topString: 0.3,  // long notes on the top string (per half second, up to 1.5×)
    lowString: -0.04,  // per string below the top, same scaling (negative = prefer low strings)
    // positions: frame base b → preference; higher bases add per step
    pos: [3, 0.45, 0.1, 1.9, 0.5, 0.35, 0.637, 0.6, 0.8, 0.85, 1.5, 0.95, 1.6],
    posHigh: 0.32,  // per base above the table
    lowStringHigh: 0.08,  // per base above 7, per string below the top
  },
}

const MODES = {
  beginner: { maxB: 2, weights: { open: -0.4, openLong: 0, openFast: 0.2, openDescend: 0.4, openAscend: 0.2, openTop: 0, topString: 0, lowString: 0 } },
  standard: {},
  expressive: { weights: { openLong: 3, open: 0.6, openTop: 1.2, shift: 2, shiftDist: 0.7, cross: [0, 0.8, 3, 6], pos: [3, 0.9, 0, 0.7, 0.6, 0.3, 0.6, 0.5, 0.6, 0.6, 0.6, 0.7, 0.7] } },
  nearest: { weights: { shift: 5, shiftDist: 1.6 } },
}


function resolveInstrument(value = DEFAULTS.instrument) {
  if (typeof value === 'string') {
    const inst = INSTRUMENTS[value]
    if (!inst) throw new TypeError(`unknown instrument "${value}"`)
    return inst
  }
  if (!value || typeof value !== 'object') throw new TypeError('instrument must be a preset name or instrument profile')
  return value
}

const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key)

function validateInstrument(inst) {
  const fail = message => { throw new TypeError(`invalid instrument: ${message}`) }
  if (!Array.isArray(inst.open) || !inst.open.length || !inst.open.every(p => Number.isInteger(p))) fail('open must be a non-empty array of integer MIDI pitches')
  if (!inst.open.every((p, i) => i === 0 || p > inst.open[i - 1])) fail('open pitches must be strictly ascending')
  if (!Array.isArray(inst.strings) || inst.strings.length !== inst.open.length || !inst.strings.every(s => typeof s === 'string' && s.length)) fail('strings must name every open string')
  if (!Number.isFinite(inst.L) || inst.L <= 0) fail('L must be a positive number')
  if (!Array.isArray(inst.maxB) || inst.maxB.length !== inst.open.length || !inst.maxB.every(b => Number.isFinite(b) && b >= 1 && b <= 127)) fail('maxB must contain a limit from 1 to 127 for every string')
  if (own(inst, 'weights') && (!inst.weights || typeof inst.weights !== 'object' || Array.isArray(inst.weights))) fail('weights must be an object')
  if (own(inst, 'modes') && (!inst.modes || typeof inst.modes !== 'object' || Array.isArray(inst.modes))) fail('modes must be an object')
  if (!inst.frame && !Array.isArray(inst.frameList)) fail('frame or frameList is required')
  if (inst.frame) {
    if (![1, 2, 3, 4].every(f => inst.frame[f] && typeof inst.frame[f] === 'object')) fail('frame must define fingers 1 through 4')
    for (const f of [1, 2, 3, 4]) for (const [offset, shape] of Object.entries(inst.frame[f])) {
      if (!Number.isInteger(+offset) || !Array.isArray(shape) || !Number.isFinite(shape[0])) fail(`frame finger ${f} offset ${offset} must be an integer with a finite cost`)
    }
  }
  if (inst.frameList) {
    if (!inst.frameList.length) fail('frameList must not be empty')
    inst.frameList.forEach((entry, i) => {
      if (!entry || !Number.isInteger(entry.f) || entry.f < 1 || entry.f > 5) fail(`frameList[${i}].f must be an integer from 1 to 5`)
      if (!Number.isInteger(entry.o)) fail(`frameList[${i}].o must be an integer`)
      if (!(Number.isFinite(entry.c) || typeof entry.c === 'function')) fail(`frameList[${i}].cost must be finite or a function`)
      if (own(entry, 'bMin') && (!Number.isFinite(entry.bMin) || entry.bMin < 1 || entry.bMin > 127)) fail(`frameList[${i}].bMin must be from 1 to 127`)
      if (own(entry, 'bMax') && (!Number.isFinite(entry.bMax) || entry.bMax < 1 || entry.bMax > 127)) fail(`frameList[${i}].bMax must be from 1 to 127`)
      if (Number.isFinite(entry.bMin) && Number.isFinite(entry.bMax) && entry.bMin > entry.bMax) fail(`frameList[${i}] has bMin greater than bMax`)
    })
  }
  return inst
}

function validateOptions(options, inst) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object')
  const mode = options.mode ?? DEFAULTS.mode
  if (typeof mode !== 'string' || !(own(inst.modes, mode) || own(MODES, mode))) throw new TypeError(`unknown fingering mode "${mode}"`)
  if (options.handSize != null && (!Number.isFinite(options.handSize) || options.handSize <= 0)) throw new TypeError('handSize must be a positive number')
  if (options.chordTolerance != null && (!Number.isFinite(options.chordTolerance) || options.chordTolerance < 0)) throw new TypeError('chordTolerance must be a non-negative number')
  if (options.maxB != null && (!Number.isFinite(options.maxB) || options.maxB < 1 || options.maxB > 127)) throw new TypeError('maxB must be from 1 to 127')
  if (options.preserveHeldNotes != null && typeof options.preserveHeldNotes !== 'boolean') throw new TypeError('preserveHeldNotes must be boolean')
  if (options.weights != null && (typeof options.weights !== 'object' || Array.isArray(options.weights))) throw new TypeError('weights must be an object')
}

function validateNotes(notes, inst) {
  if (!Array.isArray(notes)) throw new TypeError('notes must be an array')
  notes.forEach((n, i) => {
    const at = `notes[${i}]`
    if (!n || typeof n !== 'object' || Array.isArray(n)) throw new TypeError(`${at} must be an object`)
    if (!Number.isFinite(n.pitch)) throw new TypeError(`${at}.pitch must be a finite number`)
    if (!Number.isInteger(n.pitch)) throw new TypeError(`${at}.pitch must be an integer MIDI pitch`)
    if (!Number.isFinite(n.on)) throw new TypeError(`${at}.on must be a finite number`)
    if (!Number.isFinite(n.off)) throw new TypeError(`${at}.off must be a finite number`)
    if (n.off <= n.on) throw new TypeError(`${at}.off must be greater than on`)
    if (n.lockString != null && (!Number.isInteger(n.lockString) || n.lockString < 0 || n.lockString >= inst.open.length)) throw new TypeError(`${at}.lockString must be an integer from 0 to ${inst.open.length - 1}`)
  })
}

export function createModel(options = {}) {
  const inst = validateInstrument(resolveInstrument(options.instrument))
  validateOptions(options, inst)
  const modeName = options.mode ?? DEFAULTS.mode
  const mode = own(inst.modes, modeName) ? inst.modes[modeName] : MODES[modeName]
  if (!mode || typeof mode !== 'object' || Array.isArray(mode)) throw new TypeError(`invalid fingering mode "${modeName}"`)
  if (own(mode, 'maxB') && (!Number.isFinite(mode.maxB) || mode.maxB < 1 || mode.maxB > 127)) throw new TypeError(`invalid fingering mode "${modeName}": maxB must be from 1 to 127`)
  if (own(mode, 'weights') && (!mode.weights || typeof mode.weights !== 'object' || Array.isArray(mode.weights))) throw new TypeError(`invalid fingering mode "${modeName}": weights must be an object`)
  const W = { ...DEFAULTS.weights, ...(inst.weights || {}), ...(mode.weights || {}), ...(options.weights || {}) }
  if (!Array.isArray(W.cross) || W.cross.length < 4 || !W.cross.every(Number.isFinite)) throw new TypeError('invalid fingering weight "cross": expected at least four finite entries')
  if (!Array.isArray(W.pos) || !W.pos.length || !W.pos.every(Number.isFinite)) throw new TypeError('invalid fingering weight "pos": expected a non-empty finite array')
  for (const [key, value] of Object.entries(W)) {
    if (key === 'cross' || key === 'pos') continue
    if (!Number.isFinite(value)) throw new TypeError(`invalid fingering weight "${key}"`)
  }
  const handSize = options.handSize ?? DEFAULTS.handSize
  const maxB = inst.maxB.map(m => Math.min(m, options.maxB ?? mode.maxB ?? 127))
  const tableSize = Math.max(32, Math.ceil(Math.max(...maxB)) + 1)
  // a semitone at frame base b, relative to a semitone in violin 1st position
  const semi = b => inst.L * 2 ** (-b / 12) / (REFERENCE_L * 2 ** (-2 / 12))
  const stretchMul = new Float64Array(tableSize)
  for (let b = 0; b < tableSize; b++) stretchMul[b] = checkedCost(W.stretch * (inst.flatStretch ? 1 : 0.4 + 0.6 * semi(b) ** 2) / handSize ** 2, 'stretch table')
  const posCost = new Float64Array(tableSize)
  for (let b = 0; b < tableSize; b++) posCost[b] = checkedCost(b < W.pos.length ? W.pos[b] : W.pos[W.pos.length - 1] + W.posHigh * (b - W.pos.length + 1), 'position table')
  const frame = []
  if (inst.frameList) for (const e of inst.frameList) frame.push({ ...e, bMin: e.bMin ?? 1, bMax: e.bMax ?? 127, th: !!e.th, ext: !!e.ext })
  else for (const f of [1, 2, 3, 4]) for (const [o, [c, ext]] of Object.entries(inst.frame[f])) frame.push({ f, o: +o, c, ext: !!ext, bMin: 1, bMax: 127, th: false })
  const highest = Math.ceil(Math.max(...maxB))
  for (const [i, entry] of frame.entries()) if (typeof entry.c === 'function') {
    for (let b = Math.max(1, Math.ceil(entry.bMin)); b <= Math.min(highest, Math.floor(entry.bMax)); b++) {
      let cost
      try { cost = entry.c(b) } catch (error) { throw new TypeError(`invalid instrument: frameList[${i}].cost failed at base ${b}: ${error.message}`) }
      if (!Number.isFinite(cost)) throw new TypeError(`invalid instrument: frameList[${i}].cost must be finite at base ${b}`)
    }
  }
  return { inst, W, handSize, maxB, semi, stretchMul, posCost, frame, mode: modeName, chordTolerance: options.chordTolerance ?? DEFAULTS.chordTolerance }
}

// ── Events ─────────────────────────────────────────────────────────────────
/** Group notes into events by onset; each event's notes sorted low → high. */
export function makeEvents(notes, tol = 0.03) {
  const sorted = notes.filter(n => !n.skip).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  const events = []
  for (const n of sorted) {
    const e = events[events.length - 1]
    if (e && n.on - e.on <= tol) e.notes.push(n)
    else events.push({ on: n.on, notes: [n] })
  }
  for (const e of events) refreshEvent(e)
  return events
}

function refreshEvent(e) {
  e.notes.sort((a, b) => a.pitch - b.pitch)
  if (!e.notes.length) { e.off = e.on; e.dur = 0; e.top = null; return e }
  e.on = Math.min(...e.notes.map(n => n.on))
  e.off = Math.max(...e.notes.map(n => n.off))
  e.dur = Math.min(...e.notes.map(n => n.off - n.on))
  e.top = e.notes[e.notes.length - 1].pitch
  return e
}

// ── Keys ───────────────────────────────────────────────────────────────────
// Violinists think in diatonic positions: "to each note in the first position
// belongs its own finger, whether the note is raised or lowered" (Schroeder,
// research 01 §6.2), and finger 1 usually sits on a note of the key. So each
// event gets a local key signature (Krumhansl–Kessler profiles over a window
// of nearby notes) and a diatonic degree for every pitch.
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]

/** Scale (pitch classes of the key signature, as the tonic of the relative major) per event. */
export function estimateKeys(events, window = 16) {
  const N = events.length
  const hist = events.map(e => { const h = new Float64Array(12); for (const n of e.notes) h[((n.pitch % 12) + 12) % 12] += Math.min(1, Math.max(0.1, n.off - n.on)); return h })
  const out = new Array(N)
  for (let i = 0; i < N; i++) {
    const h = new Float64Array(12)
    for (let j = Math.max(0, i - window); j < Math.min(N, i + window + 1); j++) {
      const w = 1 - Math.abs(j - i) / (window + 1)
      for (let k = 0; k < 12; k++) h[k] += hist[j][k] * w
    }
    let best = -Infinity, tonic = 0
    for (let t = 0; t < 12; t++) for (const [prof, rel] of [[KK_MAJOR, 0], [KK_MINOR, 3]]) {
      let c = 0
      for (let k = 0; k < 12; k++) c += h[(t + k) % 12] * prof[k]
      if (c > best) { best = c; tonic = (t + rel) % 12 }
    }
    out[i] = tonic
  }
  return out
}
// degree (in scale steps, fractional for chromatic notes) of pitch p in the major scale on tonic t
const DEG = []
for (let t = 0; t < 12; t++) {
  const row = new Float64Array(12)
  for (let pc = 0; pc < 12; pc++) {
    const r = (pc - t + 12) % 12
    const i = MAJOR_STEPS.indexOf(r)
    row[pc] = i >= 0 ? i : MAJOR_STEPS.findIndex(x => x > r) - 0.5
  }
  DEG.push(row)
}
const degree = (p, t) => 7 * Math.floor((p - t) / 12) + DEG[t][((p % 12) + 12) % 12]
const inKey = (p, t) => Number.isInteger(DEG[t][((p % 12) + 12) % 12])

// ── States ─────────────────────────────────────────────────────────────────
// A state: { b, n: [{ s, f, o }] per note (low → high), open: all open?, u: unary cost }

const SLIDE_CROSS = 6

const checkedCost = (value, where) => {
  if (!Number.isFinite(value)) throw new RangeError(`non-finite fingering cost in ${where}`)
  return value
}

function noteOptions(M, p, s, lock) {
  // ways to play pitch p on string s: [{ f, o, b, c }] (f = 0: open, b free)
  const { inst } = M
  if (lock != null && lock !== s) return []
  const d = p - inst.open[s]
  if (d < 0) return []
  const out = []
  if (d === 0) return [{ f: 0, o: 0, b: -1, c: 0, ext: false }]   // (a finger at the nut is the open string)
  for (const fr of M.frame) {
    const b = d - fr.o
    if (b < 1 || b > M.maxB[s] || b < fr.bMin || b > fr.bMax) continue
    const c = checkedCost(typeof fr.c === 'function' ? fr.c(b) : fr.c, 'frame')
    const total = checkedCost(c * (fr.ext ? M.stretchMul[b] : M.W.shape) + (fr.f === 5 ? M.W.thumbNote : 0), 'frame shape')
    out.push({ f: fr.f, o: fr.o, b, th: fr.th, c: total, ext: fr.ext })
  }
  return out
}

function openCost(M, ev, prevTop, s) {
  const W = M.W
  // in a chord an open string rings and frees a finger
  if (ev.notes.length > 1) return W.open - W.openChord
  let c = W.open + W.openLong * Math.max(0, ev.dur - 0.25) / 0.5
  if (ev.dur < 0.2) c -= W.openFast
  if (prevTop != null) {
    if (prevTop > ev.top) c += W.openDescend
    else if (prevTop < ev.top) c -= W.openAscend
  }
  if (s === M.inst.open.length - 1) c += W.openTop * Math.min(1, ev.dur / 0.4)
  return c
}

// tone colour: long notes sound warmer on a lower string (sul D / sul G
// cantabile), so the top string costs a little more as notes get longer
function colour(M, ev, s) {
  const top = M.inst.open.length - 1
  return M.W.topString * (s === top ? 1 : 0) * Math.min(1.5, ev.dur / 0.5) + M.W.lowString * (top - s) * Math.min(1.5, ev.dur / 0.5)
}

 // finger by note letter: finger f should sit (f − 1) scale steps above finger 1
function letterCost(M, ev, p, s, b, f) {
  const t = ev.key
  if (t == null || !f) return 0
  const W = M.W
  const f1 = M.inst.open[s] + b
  let c = inKey(f1, t) ? 0 : W.posOffKey
  const steps = degree(p, t) - degree(f1, t)
  const miss = Math.abs(f - 1 - steps)
  if (miss > 0.5) c += W.letter * (miss - 0.5)
  return c
}

const tmplCost = (M, ev, s, f) => (ev.tmpl && !ev.tmpl.some(t => t.s === s && t.f === f) ? M.W.template : 0)

function stoppedUnary(M, b, s, f) {
  let c = M.posCost[b]
  if (f === 4) c += M.W.fourth
  if (b > 7) c += M.W.lowStringHigh * (b - 7) * (M.inst.open.length - 1 - s)
  return c
}

// a hand placement: frame base b, and whether it is a thumb position
const hkey = (b, th) => 2 * b + (th ? 1 : 0)

/** Every state for one event. carryB: hand placements (hkey) an all-open state may keep. */
function eventStates(M, ev, prevTop, carryB) {
  const k = ev.notes.length
  const S = M.inst.open.length
  const states = []
  for (let s0 = 0; s0 + k <= S; s0++) {
    const opts = ev.notes.map((n, i) => noteOptions(M, n.pitch, s0 + i, n.lockString))
    if (opts.some(o => !o.length)) continue
    // candidate bases: those of any stopped option
    const bases = new Set()
    for (const o of opts) for (const x of o) if (x.f) bases.add(hkey(x.b, x.th))
    const allOpenPossible = opts.every(o => o.some(x => x.f === 0))
    if (allOpenPossible) {
      const u = ev.notes.reduce((a, n, i) => a + openCost(M, ev, prevTop, s0 + i), 0) + (k === 1 ? colour(M, ev, s0) + tmplCost(M, ev, s0, 0) : 0)
      for (const key of carryB) states.push({ b: key >> 1, th: !!(key & 1), n: ev.notes.map((_, i) => ({ s: s0 + i, f: 0, o: 0 })), open: true, u: checkedCost(u, 'open-string state') })
    }
    for (const key of bases) {
      const b = key >> 1, th = !!(key & 1)
      const per = opts.map(o => o.filter(x => x.f === 0 || (x.b === b && !!x.th === th)))
      if (per.some(o => !o.length)) continue
      // combinations (k ≤ 4, few options each)
      const pick = new Array(k)
      const rec = (i, cost) => {
        if (i === k) {
          if (pick.every(x => x.f === 0)) return
          // fingers: distinct, or the same finger lying across a fifth (same offset)
          let c = cost, ok = true, stopped = 0, lo = 99, hi = -99
          for (let a = 0; a < k && ok; a++) {
            const A = pick[a]
            if (!A.f) continue
            stopped++
            lo = Math.min(lo, A.o); hi = Math.max(hi, A.o)
            for (let z = a + 1; z < k; z++) {
              const Z = pick[z]
              if (!Z.f) continue
              if (A.f === Z.f) { if (A.o !== Z.o) ok = false; else c += M.W.fifth; continue }
              // higher finger number must sit further up the string
              if ((rank(A.f) - rank(Z.f)) * (A.o - Z.o) < 0) ok = false
              else if (A.o === Z.o) c += 1.5
            }
          }
          if (!ok) return
          if (stopped > 1 && hi - lo > 7) return
          let u = c + (k === 1 ? colour(M, ev, s0) + tmplCost(M, ev, s0, pick[0].f) : 0)
          let first = true
          for (let a = 0; a < k; a++) {
            const A = pick[a]
            if (A.f) u += letterCost(M, ev, ev.notes[a].pitch, s0 + a, b, A.f)
            if (A.f) { u += first ? stoppedUnary(M, b, s0 + a, A.f) : (A.f === 4 ? M.W.fourth : 0); first = false }
            else u += openCost(M, ev, prevTop, s0 + a)
          }
          states.push({ b, th, n: pick.map((x, a) => ({ s: s0 + a, f: x.f, o: x.o, ext: x.ext })), open: false, u: checkedCost(u, 'stopped state') })
          return
        }
        for (const x of per[i]) { pick[i] = x; rec(i + 1, cost + x.c) }
      }
      rec(0, 0)
    }
  }
  return states
}

// ── Transitions ────────────────────────────────────────────────────────────
function shiftUnits(M, b1, b2) {
  // half semitones, half millimetres (in violin-1st-position semitones)
  // the bass hand moves a whole arm's length more often: its distances are
  // read on a violin-sized string (research 04 §7.3)
  const L = M.inst.shiftNorm ? REFERENCE_L : M.inst.L
  const mm = Math.abs(stopMM(b2, L) - stopMM(b1, L)) / (stopMM(3) - stopMM(2))
  return 0.5 * Math.abs(b2 - b1) + 0.5 * mm
}

const center = st => { let s = 0; for (const x of st.n) s += x.s; return s / st.n.length }

function transition(M, A, B, pa, pb, dt, gap) {
  const W = M.W
  let c = 0
  const fast = dt < 0.12
  // the hand
  if (A.b !== B.b || A.th !== B.th) {
    let k = W.shift + W.shiftDist * shiftUnits(M, A.b, B.b) + (A.th !== B.th ? W.thumbChange : 0)
    let mul = 1 + (W.shiftFast - 1) * Math.max(0, Math.min(1, (0.3 - dt) / 0.2))
    if (dt > 0.45) mul *= W.shiftSlow
    if (A.open || B.open) { k = W.shift * W.shiftOpen + (k - W.shift) * W.shiftOpenDist; mul = 1 }
    else if (gap > 0.1) mul *= W.shiftRest
    if (A.n.length === 1 && B.n.length === 1 && !A.open && !B.open) {
      const a = A.n[0], b = B.n[0], dp = pb[0] - pa[0]
      if (Math.abs(dp) === 1) mul *= W.shiftSemitone
      if (a.f === b.f && dp !== 0) k += W.shiftSlide
      if (a.s === b.s && dp !== 0 && Math.sign(B.b - A.b) !== Math.sign(dp)) k += W.wrongDir
    }
    c += k * mul
  }
  if (A.open && B.open && W.openTwice && pa[0] !== pb[0]) c += W.openTwice
  // strings
  const ds = Math.abs(center(A) - center(B))
  if (ds > 0) {
    const i = Math.min(2, Math.floor(ds)), t = ds - i
    c += (W.cross[i] + (W.cross[i + 1] - W.cross[i]) * t) * (fast ? W.crossFast : 1)
    // a rising line moving to a lower string (or falling to a higher one)
    if (A.n.length === 1 && B.n.length === 1 && pb[0] !== pa[0] && Math.sign(pb[0] - pa[0]) !== Math.sign(B.n[0].s - A.n[0].s)) c += W.crossBack
  }
  // fingers
  for (let i = 0; i < A.n.length; i++) {
    const a = A.n[i]
    if (!a.f) continue
    for (let j = 0; j < B.n.length; j++) {
      const b = B.n[j]
      if (!b.f) continue
      const dp = pb[j] - pa[i]
      if (a.f === b.f) {
        if (dp === 0) { if (a.s !== b.s) c += W.repeatChange; continue }
        if (A.b !== B.b || A.th !== B.th) continue             // a guided shift: priced above
        if (a.s !== b.s) c += a.o === b.o && Math.abs(a.s - b.s) === 1 ? W.fifth : W.oblique
        else c += Math.abs(dp) > 1 ? W.slide * 2 : W.slideSemi
      } else if (A.b === B.b && A.th === B.th && (rank(b.f) - rank(a.f)) * (b.o - a.o) < 0 && Math.abs(rank(b.f) - rank(a.f)) === 1 && a.s === b.s) c += W.crossed
      else if (dp === 0) c += W.repeatChange
    }
  }
  return checkedCost(c, 'transition')
}

// ── Decoding ───────────────────────────────────────────────────────────────
function stateLists(M, evs) {
  // All-open events may keep any frame base their neighbours use.
  const lists = []
  let prevTop = null
  for (let i = 0; i < evs.length; i++) { lists.push(eventStates(M, evs[i], prevTop, [hkey(2, false)])); prevTop = evs[i].top }
  prevTop = null
  for (let i = 0; i < evs.length; i++) {
    if (lists[i].some(s => s.open)) {
      const carry = new Set([hkey(2, false)])
      for (const j of [i - 1, i + 1, i - 2, i + 2]) for (const s of lists[j] || []) if (!s.open) carry.add(hkey(s.b, s.th))
      lists[i] = eventStates(M, evs[i], prevTop, [...carry])
    }
    prevTop = evs[i].top
  }
  return lists
}

function extendPathCost(previous, edge, slide, unary, where) {
  let cost = checkedCost(previous + edge, `${where} path`)
  if (slide) cost = checkedCost(cost + SLIDE_CROSS, `${where} slide path`)
  return checkedCost(cost + unary, `${where} state path`)
}

/** Viterbi over events; with write, the best path is stored on the notes. */
function solve(M, evs, write) {
  const lists = stateLists(M, evs)
  const N = evs.length
  const slideTo = evs.map(e => e.notes.length === 1 && !!e.notes[0].art?.port)
  const cost = [], back = []
  for (let i = 0; i < N; i++) {
    const S = lists[i], pb = evs[i].notes.map(n => n.pitch)
    const ci = new Float64Array(S.length), bi = new Int32Array(S.length)
    if (i === 0) for (let s = 0; s < S.length; s++) { ci[s] = S[s].u; bi[s] = -1 }
    else {
      const P = lists[i - 1], cp = cost[i - 1], pa = evs[i - 1].notes.map(n => n.pitch)
      const dt = evs[i].on - evs[i - 1].on, gap = evs[i].on - evs[i - 1].off
      for (let s = 0; s < S.length; s++) {
        let best = Infinity, arg = 0
        for (let r = 0; r < P.length; r++) {
          const edge = transition(M, P[r], S[s], pa, pb, dt, gap)
          const slide = slideTo[i] && P[r].n.length === 1 && S[s].n.length === 1 && (P[r].n[0].s !== S[s].n[0].s || S[s].open)
          const v = extendPathCost(cp[r], edge, slide, S[s].u, 'viterbi')
          if (v < best) { best = v; arg = r }
        }
        ci[s] = best; bi[s] = arg
      }
    }
    cost.push(ci); back.push(bi)
  }
  if (!N) return { cost: 0 }
  let s = 0
  const last = cost[N - 1]
  for (let k = 1; k < last.length; k++) if (last[k] < last[s]) s = k
  const total = checkedCost(last[s], 'solution')
  if (write) for (let i = N - 1; i >= 0; i--) {
    const st = lists[i][s]
    evs[i].state = st
    evs[i].notes.forEach((n, j) => {
      const x = st.n[j]
      n.string = x.s; n.finger = x.f; n.offset = x.o; n.base = st.b; n.ext = !!x.ext
      n.thumb = !!st.th
      n.position = positionName(st.b, M.inst, st.th)
    })
    s = back[i][s]
  }
  return { cost: total }
}

/** The k cheapest complete state paths under the same model as solve(). */
function kBestPaths(M, evs, limit) {
  if (!evs.length) return [{ cost: 0, states: [] }]
  const lists = stateLists(M, evs)
  const rows = []
  const slideTo = evs.map(e => e.notes.length === 1 && !!e.notes[0].art?.port)
  const less = (a, b) => a.cost < b.cost || (a.cost === b.cost && (a.state < b.state || a.state === b.state && a.rank < b.rank))
  const push = (heap, item) => {
    heap.push(item)
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1
      if (!less(heap[i], heap[p])) break
      ;[heap[i], heap[p]] = [heap[p], heap[i]]; i = p
    }
  }
  const pop = heap => {
    const first = heap[0], last = heap.pop()
    if (heap.length) {
      heap[0] = last
      for (let i = 0;;) {
        let c = i * 2 + 1
        if (c >= heap.length) break
        if (c + 1 < heap.length && less(heap[c + 1], heap[c])) c++
        if (!less(heap[c], heap[i])) break
        ;[heap[i], heap[c]] = [heap[c], heap[i]]; i = c
      }
    }
    return first
  }
  for (let i = 0; i < evs.length; i++) {
    const S = lists[i]
    const row = new Array(S.length)
    if (i === 0) {
      for (let s = 0; s < S.length; s++) row[s] = { cost: Float64Array.of(S[s].u), prevState: Int32Array.of(-1), prevRank: Int16Array.of(-1) }
    } else {
      const P = lists[i - 1], prev = rows[i - 1]
      const pa = evs[i - 1].notes.map(n => n.pitch), pb = evs[i].notes.map(n => n.pitch)
      const dt = evs[i].on - evs[i - 1].on, gap = evs[i].on - evs[i - 1].off
      for (let s = 0; s < S.length; s++) {
        const heap = []
        let total = 0
        for (let r = 0; r < P.length; r++) {
          if (!prev[r].cost.length) continue
          const edge = transition(M, P[r], S[s], pa, pb, dt, gap)
          const slide = slideTo[i] && P[r].n.length === 1 && S[s].n.length === 1 && (P[r].n[0].s !== S[s].n[0].s || S[s].open)
          const cost = extendPathCost(prev[r].cost[0], edge, slide, S[s].u, 'k-best')
          push(heap, { cost, state: r, rank: 0, edge, slide, unary: S[s].u })
          total += prev[r].cost.length
        }
        const count = Math.min(limit, total), cost = new Float64Array(count), prevState = new Int32Array(count), prevRank = new Int16Array(count)
        for (let q = 0; q < count; q++) {
          const best = pop(heap)
          cost[q] = best.cost; prevState[q] = best.state; prevRank[q] = best.rank
          const next = best.rank + 1
          if (next < prev[best.state].cost.length) push(heap, {
            cost: extendPathCost(prev[best.state].cost[next], best.edge, best.slide, best.unary, 'k-best'),
            state: best.state, rank: next, edge: best.edge, slide: best.slide, unary: best.unary,
          })
        }
        row[s] = { cost, prevState, prevRank }
      }
    }
    rows.push(row)
  }
  const last = rows[rows.length - 1]
  const finals = []
  for (let state = 0; state < last.length; state++) for (let rank = 0; rank < last[state].cost.length; rank++) finals.push({ cost: last[state].cost[rank], state, rank })
  finals.sort((a, b) => a.cost - b.cost || a.state - b.state || a.rank - b.rank)
  return finals.slice(0, limit).map(final => {
    const states = new Array(evs.length)
    let state = final.state, rank = final.rank
    for (let i = evs.length - 1; i >= 0; i--) {
      states[i] = lists[i][state]
      const entry = rows[i][state]
      state = entry.prevState[rank]; rank = entry.prevRank[rank]
    }
    return { cost: checkedCost(final.cost, 'k-best solution'), states }
  })
}

/** Fields written by the compatibility API. */
const OUTPUT_FIELDS = ['unplayable', 'string', 'finger', 'offset', 'base', 'ext', 'thumb', 'position']
function clearOutput(n) {
  // heldLock was written by older versions of fingerHeld. Treat it as an internal
  // marker and remove the lock it introduced before solving the note again.
  if (n.heldLock) delete n.lockString
  delete n.heldLock
  for (const key of OUTPUT_FIELDS) delete n[key]
}

const canPlayPitch = (M, n, lock = n.lockString) => {
  const strings = lock == null ? M.inst.open.map((_, s) => s) : [lock]
  return strings.some(s => noteOptions(M, n.pitch, s, lock).length)
}

/** Mutating implementation shared by the legacy wrappers and immutable API. */
function fingerMutable(notes, options = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const M = createModel(options)
  validateNotes(notes, M.inst)
  for (const n of notes) clearOutput(n)
  const raw = makeEvents(notes, M.chordTolerance)
  // Reduce oversize chords (top strings retained), then test exact model
  // playability. This replaces the old approximate maxB + 7 range shortcut.
  const events = []
  for (const ev of raw) {
    for (const n of ev.notes) {
      if (!canPlayPitch(M, n, null)) n.unplayable = 'range'
      else if (n.lockString != null && !canPlayPitch(M, n)) n.unplayable = 'constraint'
    }
    ev.notes = ev.notes.filter(n => !n.unplayable)
    while (ev.notes.length > M.inst.open.length) ev.notes.shift().unplayable = 'chord'
    refreshEvent(ev)
    if (ev.notes.length) events.push(ev)
  }
  if (M.W.letter || M.W.posOffKey) { const keys = estimateKeys(events); events.forEach((e, i) => { e.key = keys[i] }) }
  // States, with an infeasible chord thinned from the bottom until it fits.
  const playable = []
  let prevTop = null
  for (const ev of events) {
    let st = eventStates(M, ev, prevTop, [hkey(2, false)])
    while (!st.length && ev.notes.length > 1) {
      ev.notes.shift().unplayable = 'chord'
      refreshEvent(ev)
      st = eventStates(M, ev, prevTop, [hkey(2, false)])
    }
    if (!st.length) {
      for (const n of ev.notes) n.unplayable = n.lockString != null ? 'constraint' : 'no-state'
      continue
    }
    playable.push(ev)
    prevTop = ev.top
  }
  const evs = playable
  // Scale-book patterns for long scale runs: each run keeps the one pattern
  // that makes its stretch of the piece cheapest (patterns are not mixed).
  if (M.W.template && options.templates !== false && (M.inst.template === 'violin' || M.inst.frame === VIOLIN_FRAME)) {
    const canPlay = (p, s, f) => noteOptions(M, p, s).some(o => o.f === f)
    for (const run of findRuns(evs)) {
      const lowStart = (p, s, f) => noteOptions(M, p, s).some(o => o.f === f && o.b <= 5)
      const ts = runTemplates(M.inst, evs, run, canPlay, lowStart)
      if (!ts.length) continue
      const lo = Math.max(0, run.from - 6), hi = Math.min(evs.length, run.to + 7)
      let best = null
      for (const t of ts) {
        for (let k = run.from; k <= run.to; k++) evs[k].tmpl = [t[k - run.from]]
        const c = solve(M, evs.slice(lo, hi), false).cost
        if (!best || c < best.c) best = { c, t }
      }
      for (let k = run.from; k <= run.to; k++) evs[k].tmpl = [best.t[k - run.from]]
    }
  }
  const total = solve(M, evs, true).cost
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return { notes, events: evs, cost: total, ms: t1 - t0, model: M }
}

/**
 * Finger a line in place. This compatibility API retains the experiment's
 * existing note fields and return shape. New integrations should use
 * solveFingering(), which never mutates its inputs.
 */
export function fingerLine(notes, options = {}) {
  return fingerMutable(notes, options)
}

// ── Helpers ────────────────────────────────────────────────────────────────
/** "G0 G1 D3 …" (string letter + finger, onset order, chords low → high). */

/**
 * fingerLine for music with held notes (two voices: a note sustained while
 * the other voice moves). fingerLine only sees notes that start together, so
 * it can put a moving note on the string a held note is sounding on, which
 * cuts the held note off. Each such note is tried again on another string
 * (beyond the held note when possible, and playable under the instrument model),
 * constrained there, and the complete line is solved again. Candidate solves
 * are rejected if they lose a note that was playable before. A note with its
 * own lockString is left alone. Returns the number of relocated notes.
 */
function heldConflicts(notes, tolerance) {
  const eventOf = new Map()
  makeEvents(notes, tolerance).forEach((event, i) => event.notes.forEach(note => eventOf.set(note, i)))
  const playable = notes.filter(n => n.string != null && !n.unplayable).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  const out = []
  for (let i = 0; i < playable.length; i++) for (let j = 0; j < i; j++) {
    const n = playable[i], h = playable[j]
    if (eventOf.get(n) === eventOf.get(h) || h.off <= n.on + 0.001 || h.string !== n.string) continue
    out.push({ h, n })
  }
  return out
}

function fingerHeldMutable(notes, options = {}) {
  let result = fingerMutable(notes, options)
  const M = result.model
  const baselineStrings = notes.map(n => n.string)
  const baselinePlayable = notes.map(n => n.string != null)
  const userLocked = new Set(notes.flatMap((n, i) => n.lockString == null ? [] : [i]))

function heldSafeFallback(notes, model, result, evaluate, maxNodes = 100000) {
  const noteIndex = new Map(notes.map((note, index) => [note, index]))
  const events = result.events
  const domains = events.map(event => {
    const seen = new Set(), layouts = []
    for (const state of eventStates(model, event, null, [hkey(2, false)])) {
      const strings = state.n.map(note => note.s), key = strings.join(',')
      if (!seen.has(key)) { seen.add(key); layouts.push(strings) }
    }
    const baseline = event.notes.map(note => note.string)
    layouts.sort((a, b) => b.filter((string, i) => string === baseline[i]).length - a.filter((string, i) => string === baseline[i]).length)
    return layouts
  })
  if (domains.some(domain => !domain.length)) return null
  const overlap = (a, b) => a.on < b.off - 0.001 && b.on < a.off - 0.001
  const degree = events.map((event, i) => events.reduce((sum, other, j) => sum + Number(i !== j && event.notes.some(a => other.notes.some(b => overlap(a, b)))), 0))
  const order = events.map((_, i) => i).sort((a, b) => domains[a].length - domains[b].length || degree[b] - degree[a])
  const chosen = new Array(events.length)
  let visited = 0
  const compatible = (eventIndex, strings) => {
    for (let otherIndex = 0; otherIndex < events.length; otherIndex++) {
      const otherStrings = chosen[otherIndex]
      if (!otherStrings) continue
      for (let i = 0; i < events[eventIndex].notes.length; i++) for (let j = 0; j < events[otherIndex].notes.length; j++) {
        if (strings[i] === otherStrings[j] && overlap(events[eventIndex].notes[i], events[otherIndex].notes[j])) return false
      }
    }
    return true
  }
  const search = depth => {
    if (++visited > maxNodes) return false
    if (depth === order.length) return true
    const eventIndex = order[depth]
    for (const strings of domains[eventIndex]) {
      if (!compatible(eventIndex, strings)) continue
      chosen[eventIndex] = strings
      if (search(depth + 1)) return true
      chosen[eventIndex] = null
    }
    return false
  }
  if (!search(0)) return null
  const constraints = new Map()
  events.forEach((event, eventIndex) => event.notes.forEach((note, i) => constraints.set(noteIndex.get(note), chosen[eventIndex][i])))
  const candidate = evaluate(constraints)
  return candidate && !candidate.conflicts.length ? candidate : null
}
  const evaluate = constraints => {
    const work = notes.map(note => ({ ...note }))
    for (const [i, string] of constraints) work[i].lockString = string
    const trial = fingerMutable(work, options)
    if (baselinePlayable.some((was, i) => was && work[i].string == null)) return null
    return { constraints, work, result: trial, conflicts: heldConflicts(work, M.chordTolerance) }
  }
  const start = evaluate(new Map())
  let best = start
  const queue = start ? [start] : []
  const seen = new Set([''])
  const signature = constraints => [...constraints].sort((a, b) => a[0] - b[0]).map(([i, s]) => `${i}:${s}`).join(',')
  // Four strings make the branch factor small. Best-first search retains
  // alternatives instead of committing to a locally cheap relocation that
  // can make a later overlap impossible. The cap bounds malformed/extreme input.
  for (let explored = 0; queue.length && explored < 512; explored++) {
    queue.sort((a, b) => a.result.cost - b.result.cost || a.conflicts.length - b.conflicts.length || a.constraints.size - b.constraints.size)
    const node = queue.shift()
    if (!node.conflicts.length) { best = node; break }
    if (!best || node.conflicts.length < best.conflicts.length || (node.conflicts.length === best.conflicts.length && node.result.cost < best.result.cost)) best = node
    const { h, n } = node.conflicts[0]
    const hi = node.work.indexOf(h), ni = node.work.indexOf(n)
    const branch = (target, anchor) => {
      if (userLocked.has(target) || node.constraints.has(target)) return
      const targetNote = node.work[target], anchorNote = node.work[anchor]
      for (let string = 0; string < M.inst.open.length; string++) {
        if (string === anchorNote.string || !noteOptions(M, targetNote.pitch, string, string).length) continue
        const next = new Map(node.constraints)
        next.set(target, string)
        const key = signature(next)
        if (seen.has(key)) continue
        seen.add(key)
        const child = evaluate(next)
        if (child) queue.push(child)
      }
    }
    branch(ni, hi)
    branch(hi, ni)
  }
  if (best?.conflicts.length) {
    const fallback = heldSafeFallback(notes, M, result, evaluate)
    if (fallback) best = fallback
  }
  if (best?.constraints.size) {
    try {
      for (const [i, string] of best.constraints) notes[i].lockString = string
      result = fingerMutable(notes, options)
    } finally {
      for (const i of best.constraints.keys()) if (!userLocked.has(i)) delete notes[i].lockString
    }
  }
  const conflicts = heldConflicts(notes, M.chordTolerance)
  const moved = notes.reduce((count, n, i) => count + Number(baselinePlayable[i] && n.string !== baselineStrings[i]), 0)
  return { moved, result, conflicts, constraints: best?.constraints || new Map() }
}

/**
 * Compatibility helper for held voices. It still writes fingering fields to
 * each note and returns the number moved, but no longer leaks generated locks.
 */
export function fingerHeld(notes, options = {}) {
  return fingerHeldMutable(notes, options).moved
}

const REASON = { chord: 'chord-capacity', range: 'range', constraint: 'constraint', 'no-state': 'no-state' }
const REASON_MESSAGE = {
  range: 'Pitch is outside the instrument model.',
  'chord-capacity': 'The simultaneous notes cannot fit on the available strings and hand frame.',
  constraint: 'The note cannot be played with its requested string constraint.',
  'no-state': 'The instrument model has no playable state for this note.',
  'held-conflict': 'Overlapping notes remain assigned to the same string.',
  skipped: 'The note was explicitly skipped.',
}
const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)))

function publicAssignments(work) {
  return work.map((n, index) => {
    const identity = n.id === undefined ? { index } : { index, id: n.id }
    if (n.skip) return { ...identity, playable: false, reason: 'skipped' }
    if (n.string == null) return { ...identity, playable: false, reason: REASON[n.unplayable] || 'no-state' }
    return {
      ...identity, playable: true, string: n.string, finger: n.finger, base: n.base,
      offset: n.offset, position: n.position, extension: !!n.ext, thumb: !!n.thumb,
    }
  })
}

function publicDiagnostics(notes, work, assignments, conflicts) {
  const diagnostics = assignments.filter(a => !a.playable).map(a => ({
    index: a.index, ...(a.id === undefined ? {} : { id: a.id }), code: a.reason, message: REASON_MESSAGE[a.reason],
  }))
  const workIndex = new Map(work.map((note, index) => [note, index]))
  for (const { h, n } of conflicts) {
    const index = workIndex.get(n), relatedIndex = workIndex.get(h), id = notes[index].id
    diagnostics.push({ index, ...(id === undefined ? {} : { id }), relatedIndex, code: 'held-conflict', message: REASON_MESSAGE['held-conflict'] })
  }
  return diagnostics
}

/**
 * Immutable library API.
 *
 * Input notes are { pitch, on, off, id?, lockString?, skip?, art? }. The
 * returned assignments stay aligned with input order and contain no internal
 * event or model objects. Held-note protection is enabled by default.
 */
export function solveFingering(notes, options = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const inst = validateInstrument(resolveInstrument(options.instrument))
  validateOptions(options, inst)
  validateNotes(notes, inst)
  const work = notes.map(n => ({ ...n }))
  let held
  if (options.preserveHeldNotes === false) {
    const result = fingerMutable(work, options)
    held = { moved: 0, result, conflicts: heldConflicts(work, result.model.chordTolerance) }
  } else held = fingerHeldMutable(work, options)
  const assignments = publicAssignments(work)
  const diagnostics = publicDiagnostics(notes, work, assignments, held.conflicts)
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return Object.freeze({
    assignments: freezeList(assignments),
    cost: held.result.cost,
    diagnostics: freezeList(diagnostics),
    movedHeldNotes: held.moved,
    unresolvedHeldConflicts: held.conflicts.length,
    ms: t1 - t0,
  })
}

function assignmentsFromPath(work, events, states, inst) {
  const chosen = new Map()
  events.forEach((event, i) => event.notes.forEach((note, j) => chosen.set(note, { state: states[i], note: states[i].n[j] })))
  return work.map((n, index) => {
    const identity = n.id === undefined ? { index } : { index, id: n.id }
    if (n.skip) return { ...identity, playable: false, reason: 'skipped' }
    if (n.unplayable) return { ...identity, playable: false, reason: REASON[n.unplayable] || 'no-state' }
    const pick = chosen.get(n)
    if (!pick) return { ...identity, playable: false, reason: 'no-state' }
    return {
      ...identity, playable: true, string: pick.note.s, finger: pick.note.f, base: pick.state.b,
      offset: pick.note.o, position: positionName(pick.state.b, inst, pick.state.th),
      extension: !!pick.note.ext, thumb: !!pick.state.th,
    }
  })
}

function assignmentChanges(base, candidate) {
  const changes = { notes: 0, strings: 0, fingers: 0, positions: 0 }
  for (let i = 0; i < base.length; i++) {
    const a = base[i], b = candidate[i]
    const string = a.string !== b.string, finger = a.finger !== b.finger
    const position = a.base !== b.base || a.thumb !== b.thumb
    if (a.playable !== b.playable || a.reason !== b.reason || string || finger || position) changes.notes++
    if (string) changes.strings++
    if (finger) changes.fingers++
    if (position) changes.positions++
  }
  return changes
}

const assignmentPathKey = assignments => assignments.map(a => a.playable ? `${a.string}/${a.finger}/${a.base}/${Number(a.thumb)}` : `x:${a.reason}`).join('|')
const alternativeLabel = changes => {
  const parts = []
  if (changes.strings) parts.push(`${changes.strings} string`)
  if (changes.positions) parts.push(`${changes.positions} position`)
  if (changes.fingers) parts.push(`${changes.fingers} finger`)
  return parts.length ? `Alternative · ${parts.slice(0, 2).join(', ')}` : 'Alternative'
}

function validateSuggestionOptions(options) {
  const limit = options.limit ?? 3
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new TypeError('limit must be an integer from 1 to 10')
  const candidatePool = options.candidatePool ?? Math.max(24, limit * 8)
  if (!Number.isInteger(candidatePool) || candidatePool < limit || candidatePool > 128) throw new TypeError('candidatePool must be an integer from limit to 128')
  const maxCostDelta = options.maxCostDelta ?? Infinity
  if (!(maxCostDelta === Infinity || Number.isFinite(maxCostDelta) && maxCostDelta >= 0)) throw new TypeError('maxCostDelta must be a non-negative number')
  if (options.minChanges != null && (!Number.isInteger(options.minChanges) || options.minChanges < 1)) throw new TypeError('minChanges must be a positive integer')
  return { limit, candidatePool, maxCostDelta, minChanges: options.minChanges }
}

/**
 * Ranked, distinct alternatives under the same cost model as solveFingering.
 * The first suggestion is the ordinary solution. Later suggestions are the
 * cheapest k-best paths that satisfy minChanges against every earlier result.
 */
export function suggestFingerings(notes, options = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const inst = validateInstrument(resolveInstrument(options.instrument))
  validateOptions(options, inst)
  validateNotes(notes, inst)
  const config = validateSuggestionOptions(options)
  const work = notes.map(n => ({ ...n }))
  let held
  if (options.preserveHeldNotes === false) {
    const result = fingerMutable(work, options)
    held = { moved: 0, result, conflicts: heldConflicts(work, result.model.chordTolerance), constraints: new Map() }
  } else held = fingerHeldMutable(work, options)
  const baseAssignments = publicAssignments(work)
  const diagnostics = publicDiagnostics(notes, work, baseAssignments, held.conflicts)
  const generated = [...held.constraints.keys()].filter(i => notes[i].lockString == null)
  let paths
  try {
    for (const [i, string] of held.constraints) work[i].lockString = string
    paths = kBestPaths(held.result.model, held.result.events, config.candidatePool)
  } finally {
    for (const i of generated) delete work[i].lockString
  }
  const minChanges = config.minChanges ?? Math.min(2, Math.max(1, baseAssignments.filter(a => a.playable).length))
  const selected = [{ assignments: baseAssignments, cost: held.result.cost, costDelta: 0, changes: { notes: 0, strings: 0, fingers: 0, positions: 0 } }]
  const keys = new Set([assignmentPathKey(baseAssignments)])
  for (const path of paths) {
    if (selected.length >= config.limit) break
    const assignments = assignmentsFromPath(work, held.result.events, path.states, held.result.model.inst)
    const key = assignmentPathKey(assignments)
    const costDelta = path.cost - held.result.cost
    if (keys.has(key) || !Number.isFinite(costDelta) || costDelta < 0 || costDelta > config.maxCostDelta + 1e-9) continue
    const diverse = selected.every(s => assignmentChanges(s.assignments, assignments).notes >= minChanges)
    if (!diverse) continue
    const scratch = work.map((n, i) => ({ ...n, string: assignments[i].playable ? assignments[i].string : undefined }))
    if (heldConflicts(scratch, held.result.model.chordTolerance).length > held.conflicts.length) continue
    keys.add(key)
    selected.push({ assignments, cost: path.cost, costDelta, changes: assignmentChanges(baseAssignments, assignments) })
  }
  const suggestions = Object.freeze(selected.map((suggestion, i) => Object.freeze({
    rank: i + 1,
    label: i ? alternativeLabel(suggestion.changes) : 'Recommended',
    assignments: freezeList(suggestion.assignments),
    cost: suggestion.cost,
    costDelta: suggestion.costDelta,
    changes: Object.freeze(suggestion.changes),
  })))
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return Object.freeze({
    suggestions,
    diagnostics: freezeList(diagnostics),
    candidatePaths: paths.length,
    exhausted: suggestions.length < config.limit,
    ms: t1 - t0,
  })
}

export function fingerTokens(notes, instrument = 'violin', { positions = false } = {}) {
  const inst = typeof instrument === 'object' ? instrument : INSTRUMENTS[instrument]
  return notes.filter(n => n.string != null).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    .map(n => inst.strings[n.string] + fingerLabel(n.finger) + (positions && n.finger ? '@' + positionName(n.base, inst, n.thumb) : ''))
}

/** Does a fingering match an expectation token list ("A1@4" also checks the position)? */
export function matchTokens(got, want) {
  let m = 0
  for (let i = 0; i < want.length; i++) {
    const w = want[i], g = got[i]
    if (!g) continue
    const [ws, wp] = w.split('@')
    const [gs, gp] = g.split('@')
    if (ws === gs && (!wp || wp === gp)) m++
  }
  return m
}

/** Shifts, crossings and open strings of a fingered line (for stats and tests). */
export function lineStats(notes) {
  const ns = notes.filter(n => n.string != null).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  let shifts = 0, crossings = 0, open = 0, ext = 0, prev = null
  const fingers = [0, 0, 0, 0, 0, 0], positions = {}
  for (const n of ns) {
    fingers[n.finger]++
    if (!n.finger) open++
    if (n.ext) ext++
    if (n.finger) positions[n.position] = (positions[n.position] || 0) + 1
    if (prev && n.on - prev.on > 0.03) {
      if (n.finger && prev.finger && (n.base !== prev.base || !!n.thumb !== !!prev.thumb)) shifts++
      if (n.string !== prev.string) crossings++
    }
    if (n.finger) prev = n; else if (prev) prev = { ...prev, string: n.string, on: n.on }
  }
  return { notes: ns.length, shifts, crossings, open, ext, fingers, positions }
}
