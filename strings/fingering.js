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
export const INSTRUMENTS = {
  violin: { name: 'Violin', open: [55, 62, 69, 76], strings: ['G', 'D', 'A', 'E'], L: 328, maxB: [14, 15, 17, 21], frame: VIOLIN_FRAME, program: 40 },
  viola: { name: 'Viola', open: [48, 55, 62, 69], strings: ['C', 'G', 'D', 'A'], L: 375, maxB: [13, 14, 15, 19], frame: VIOLIN_FRAME, program: 41 },
  cello: { name: 'Cello', open: [36, 43, 50, 57], strings: ['C', 'G', 'D', 'A'], L: 690, maxB: [12, 12, 14, 19], frame: CELLO_FRAME, program: 42 },
}
export const REFERENCE_L = 328

/** Distance of a stop n semitones above the open string from the nut (mm). */
export const stopMM = (n, L = REFERENCE_L) => L * (1 - 2 ** (-n / 12))

// Position names from the frame base (research 01 §2.1). Diatonic names are
// key-dependent; this is the usual reading of the semitone anchor.
const POS = ['', '½', '1', '2', '2', '3', '3', '4', '5', '5', '6', '6', '7', '8', '8', '9', '9', '10', '10', '11', '12', '12', '13', '13']
export const positionName = b => POS[b] ?? String(Math.round(b / 1.75))
const ROMAN = { '½': '½', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII' }
export const positionRoman = b => ROMAN[positionName(b)] ?? positionName(b)

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
    slideSemi: 1.5,  // … by a semitone (Galamian allows it, e.g. 3–3 for D–D♯)
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

export function createModel(options = {}) {
  const mode = MODES[options.mode || DEFAULTS.mode] || {}
  const inst = typeof options.instrument === 'object' ? options.instrument : INSTRUMENTS[options.instrument || DEFAULTS.instrument]
  const W = { ...DEFAULTS.weights, ...(mode.weights || {}), ...(options.weights || {}) }
  const handSize = options.handSize ?? DEFAULTS.handSize
  const maxB = inst.maxB.map(m => Math.min(m, options.maxB ?? mode.maxB ?? 99))
  // a semitone at frame base b, relative to a semitone in violin 1st position
  const semi = b => inst.L * 2 ** (-b / 12) / (REFERENCE_L * 2 ** (-2 / 12))
  const stretchMul = new Float64Array(32)
  for (let b = 0; b < 32; b++) stretchMul[b] = W.stretch * (0.4 + 0.6 * semi(b) ** 2) / handSize ** 2
  const posCost = new Float64Array(32)
  for (let b = 0; b < 32; b++) posCost[b] = b < W.pos.length ? W.pos[b] : W.pos[W.pos.length - 1] + W.posHigh * (b - W.pos.length + 1)
  const frame = []
  for (const f of [1, 2, 3, 4]) for (const [o, [c, ext]] of Object.entries(inst.frame[f])) frame.push({ f, o: +o, c, ext: !!ext })
  return { inst, W, handSize, maxB, semi, stretchMul, posCost, frame, mode: options.mode || DEFAULTS.mode, chordTolerance: options.chordTolerance ?? DEFAULTS.chordTolerance }
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
  for (const e of events) {
    e.notes.sort((a, b) => a.pitch - b.pitch)
    e.off = Math.max(...e.notes.map(n => n.off))
    e.dur = Math.min(...e.notes.map(n => n.off - n.on))
    e.top = e.notes[e.notes.length - 1].pitch
  }
  return events
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
    if (b < 1 || b > M.maxB[s]) continue
    out.push({ f: fr.f, o: fr.o, b, c: fr.c * (fr.ext ? M.stretchMul[b] : M.W.shape), ext: fr.ext })
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

/** Every state for one event. carryB: frame bases an all-open state may keep. */
function eventStates(M, ev, prevTop, carryB) {
  const k = ev.notes.length
  const S = M.inst.open.length
  const states = []
  for (let s0 = 0; s0 + k <= S; s0++) {
    const opts = ev.notes.map((n, i) => noteOptions(M, n.pitch, s0 + i, n.lockString))
    if (opts.some(o => !o.length)) continue
    // candidate bases: those of any stopped option
    const bases = new Set()
    for (const o of opts) for (const x of o) if (x.f) bases.add(x.b)
    const allOpenPossible = opts.every(o => o.some(x => x.f === 0))
    if (allOpenPossible) {
      const u = ev.notes.reduce((a, n, i) => a + openCost(M, ev, prevTop, s0 + i), 0) + (k === 1 ? colour(M, ev, s0) + tmplCost(M, ev, s0, 0) : 0)
      for (const b of carryB) states.push({ b, n: ev.notes.map((_, i) => ({ s: s0 + i, f: 0, o: 0 })), open: true, u })
    }
    for (const b of bases) {
      const per = opts.map(o => o.filter(x => x.f === 0 || x.b === b))
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
              if ((A.f - Z.f) * (A.o - Z.o) < 0) ok = false
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
          states.push({ b, n: pick.map((x, a) => ({ s: s0 + a, f: x.f, o: x.o, ext: x.ext })), open: false, u })
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
  const mm = Math.abs(stopMM(b2, M.inst.L) - stopMM(b1, M.inst.L)) / (stopMM(3) - stopMM(2))
  return 0.5 * Math.abs(b2 - b1) + 0.5 * mm
}

const center = st => { let s = 0; for (const x of st.n) s += x.s; return s / st.n.length }

function transition(M, A, B, pa, pb, dt, gap) {
  const W = M.W
  let c = 0
  const fast = dt < 0.12
  // the hand
  if (A.b !== B.b) {
    let k = W.shift + W.shiftDist * shiftUnits(M, A.b, B.b)
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
        if (A.b !== B.b) continue                              // a guided shift: priced above
        if (a.s !== b.s) c += a.o === b.o && Math.abs(a.s - b.s) === 1 ? W.fifth : W.oblique
        else c += Math.abs(dp) > 1 ? W.slide * 2 : W.slideSemi
      } else if (A.b === B.b && (b.f - a.f) * (b.o - a.o) < 0 && Math.abs(b.f - a.f) === 1 && a.s === b.s) c += W.crossed
      else if (dp === 0) c += W.repeatChange
    }
  }
  return c
}

// ── Decoding ───────────────────────────────────────────────────────────────
/** Viterbi over events; with write, the best path is stored on the notes. */
function solve(M, evs, write) {
  // states; all-open events may keep any frame base their neighbours use
  const lists = []
  let prevTop = null
  for (let i = 0; i < evs.length; i++) { lists.push(eventStates(M, evs[i], prevTop, [2])); prevTop = evs[i].top }
  prevTop = null
  for (let i = 0; i < evs.length; i++) {
    if (lists[i].some(s => s.open)) {
      const carry = new Set([2])
      for (const j of [i - 1, i + 1, i - 2, i + 2]) for (const s of lists[j] || []) if (!s.open) carry.add(s.b)
      lists[i] = eventStates(M, evs[i], prevTop, [...carry])
    }
    prevTop = evs[i].top
  }
  const N = evs.length
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
          const v = cp[r] + transition(M, P[r], S[s], pa, pb, dt, gap)
          if (v < best) { best = v; arg = r }
        }
        ci[s] = best + S[s].u; bi[s] = arg
      }
    }
    cost.push(ci); back.push(bi)
  }
  if (!N) return { cost: 0 }
  let s = 0
  const last = cost[N - 1]
  for (let k = 1; k < last.length; k++) if (last[k] < last[s]) s = k
  const total = last[s]
  if (write) for (let i = N - 1; i >= 0; i--) {
    const st = lists[i][s]
    evs[i].state = st
    evs[i].notes.forEach((n, j) => {
      const x = st.n[j]
      n.string = x.s; n.finger = x.f; n.offset = x.o; n.base = st.b; n.ext = !!x.ext
      n.position = positionName(st.b)
    })
    s = back[i][s]
  }
  return { cost: total }
}

/**
 * Finger a monophonic or double-stop line for one instrument.
 * notes: [{ pitch, on, off, lockString? }] (seconds). Writes per note:
 *   string (0 = lowest), finger (0 = open … 4), base (frame base b),
 *   offset, position (name), ext, unplayable.
 * Returns { notes, events, cost, ms }.
 */
export function fingerLine(notes, options = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const M = createModel(options)
  for (const n of notes) { delete n.unplayable; delete n.string; delete n.finger }
  const raw = makeEvents(notes, M.chordTolerance)
  // reduce oversize chords (top four) and drop notes no string can play
  const events = []
  for (const ev of raw) {
    while (ev.notes.length > M.inst.open.length) ev.notes.shift().unplayable = 'chord'
    for (const n of ev.notes) if (n.pitch < M.inst.open[0] || n.pitch > M.inst.open[M.inst.open.length - 1] + M.maxB[M.inst.open.length - 1] + 7) n.unplayable = 'range'
    ev.notes = ev.notes.filter(n => !n.unplayable)
    if (ev.notes.length) { ev.top = ev.notes[ev.notes.length - 1].pitch; events.push(ev) }
  }
  if (M.W.letter || M.W.posOffKey) { const keys = estimateKeys(events); events.forEach((e, i) => { e.key = keys[i] }) }
  // states, with an infeasible chord thinned from the bottom until it fits
  const playable = []
  let prevTop = null
  for (const ev of events) {
    let st = eventStates(M, ev, prevTop, [2])
    while (!st.length && ev.notes.length > 1) {
      ev.notes.shift().unplayable = 'chord'
      ev.top = ev.notes[ev.notes.length - 1].pitch
      st = eventStates(M, ev, prevTop, [2])
    }
    if (!st.length) { for (const n of ev.notes) n.unplayable = 'range'; continue }
    playable.push(ev)
    prevTop = ev.top
  }
  const evs = playable
  // scale-book patterns for long scale runs: each run keeps the one pattern
  // that makes its stretch of the piece cheapest (patterns are not mixed)
  if (M.W.template && options.templates !== false && M.inst.frame === VIOLIN_FRAME) {
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

// ── Helpers ────────────────────────────────────────────────────────────────
/** "G0 G1 D3 …" (string letter + finger, onset order, chords low → high). */
export function fingerTokens(notes, instrument = 'violin', { positions = false } = {}) {
  const inst = typeof instrument === 'object' ? instrument : INSTRUMENTS[instrument]
  return notes.filter(n => n.string != null).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    .map(n => inst.strings[n.string] + n.finger + (positions && n.finger ? '@' + positionName(n.base) : ''))
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
  const fingers = [0, 0, 0, 0, 0], positions = {}
  for (const n of ns) {
    fingers[n.finger]++
    if (!n.finger) open++
    if (n.ext) ext++
    if (n.finger) positions[n.position] = (positions[n.position] || 0) + 1
    if (prev && n.on - prev.on > 0.03) {
      if (n.finger && prev.finger && n.base !== prev.base) shifts++
      if (n.string !== prev.string) crossings++
    }
    if (n.finger) prev = n; else if (prev) prev = { ...prev, string: n.string, on: n.on }
  }
  return { notes: ns.length, shifts, crossings, open, ext, fingers, positions }
}
