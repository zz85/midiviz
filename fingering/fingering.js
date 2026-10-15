// Automatic piano fingering (Experiment #029).
//
// Pipeline, after research/02_algorithms.md §8:
//   1. hand split   – notes without a hand get one from a beam search over
//                     onset slices (span, capacity, movement, register prior)
//   2. per hand     – onsets within 30 ms form a slice; a beam search over
//                     "hand configurations" (which finger is on which key,
//                     including keys still held from earlier slices) picks the
//                     cheapest path
//   3. costs        – Parncutt et al. 1997 (12 rules, span table) with the
//                     Jacobs 2001 refinements (physical key distance, only
//                     finger 4 is weak, linear large-span), Al Kasimi et al.
//                     2007 for chords (vertical costs inside a chord, averaged
//                     horizontal costs between chords), and time awareness
//                     (slow passages and rests let the hand move freely, fast
//                     repeated notes want changing fingers)
//
// The left hand is solved as a right hand on a mirrored keyboard: pitch p is
// reflected around D (p → 124 − p). The keyboard is symmetric about D, so
// black/white colours and physical distances carry over exactly and every
// rule only has to be written once, for the right hand.
//
// Pure ES module, no DOM: runs in the browser, a worker or Node (tests).

import { isBlack, keyX, SEMITONE_CM, noteName, parseNote } from './keyboard.js'
import { scaleTemplate, chromaticTemplate } from './templates.js'

// ── Span table (Parncutt et al. 1997, Table 1, right hand, semitones) ──────
// [MinPrac, MinComf, MinRel, MaxRel, MaxComf, MaxPrac]; positive = the second
// finger is higher. Thumb pairs allow negative spans (thumb under / over).
export const SPAN_TABLE = {
  '1-2': [-5, -3, 1, 5, 8, 10],
  '1-3': [-4, -2, 3, 7, 10, 12],
  '1-4': [-3, -1, 5, 9, 12, 14],
  '1-5': [-1, 1, 7, 10, 13, 15],
  '2-3': [1, 1, 1, 2, 3, 5],
  '2-4': [1, 1, 3, 4, 5, 7],
  '2-5': [2, 2, 5, 6, 8, 10],
  '3-4': [1, 1, 1, 2, 2, 4],
  '3-5': [1, 1, 3, 4, 5, 7],
  '4-5': [1, 1, 1, 2, 3, 5],
}
const ZERO = [0, 0, 0, 0, 0, 0]
// widest thumb crossing (units) that still counts as relaxed, per crossing finger
const CROSS_RELAXED = [0, 0, 1, 1, 1, 0]

export const HAND_SIZES = { XS: 0.8, S: 0.9, M: 1, L: 1.1, XL: 1.2 }

export const DEFAULTS = {
  handSize: 1,          // scales every span limit (S 0.9, M 1, L 1.1)
  spanTable: SPAN_TABLE, // finger-pair spans; swap in another hand's (e.g. a robot's)
  distance: 'mixed',    // 'semitone' (Parncutt) | 'physical' (Jacobs) | 'mixed'
  chordTolerance: 0.03, // onsets closer than this (s) form one slice (Nakamura 2020)
  beam: 64,             // hypotheses kept per slice
  weights: {
    // Parncutt 1997 / Jacobs 2001 rules; values tuned on the exercise suite
    // (test/tune.js) starting from the published points.
    stretch: 0.4,       // per unit beyond MinComf / MaxComf
    smallSpan: 1,       // per unit below MinRel (thumb pair; ×2 otherwise)
    largeSpan: 1.75,    // per unit above MaxRel
    largeSpanPair: 1,   // ×this when no thumb is involved (Parncutt 2, Jacobs 1)
    impractical: 5,     // per unit beyond MinPrac / MaxPrac (soft wall)
    posChange: 1,       // half position change (×2 for a full change)
    posChangeSize: 1,   // per unit
    weak4: 2,           // finger 4 used
    weak5: 0,           // finger 5 used (Parncutt 1, Jacobs 0)
    threeFourFive: 0.66,
    threeToFour: 0.25,  // 3→4 is rarer than 4→3 (Sloboda et al. 1998)
    fourOnBlack: 0.5,
    thumbOnBlack: 2,    // thumb on a black key (Parncutt 1) …
    thumbOnBlackNext: 2, // … plus this per white neighbour (Parncutt 2)
    fiveOnBlack: 2.5,   // per white neighbour
    thumbPass: 1.33,    // same-level pass; white finger → black thumb is ×3
    cross: [0, 0, 0.5, 1.33, 1.5, 6], // base cost of a thumb crossing with finger 2/3/4/5 (null = Parncutt's span rules)
    crossDist: 1.1,     // per unit a crossing is wider than relaxed (CROSS_RELAXED)
    turnaround: 3,      // thumb crossed under and straight back over (4-1-4 at a turn)
    repeatShuttle: 0.5, // fast repeated note shuttling between two fingers (2-1-2)
    sameFinger: 4,      // same finger on two different keys (×3 legato)
    repeatSame: 3,      // same finger on a fast repeated note
    repeatChange: 1,    // changing fingers on a slow repeated note
    anchor: 0.25,       // hand-position movement between chords, per unit
    vertical: 1,        // multiplier for the span costs inside a chord
    natural: 0.2,       // per unit a pair deviates from one-white-key-per-finger
    leap: 3,            // jumping instead of stretching (scaled by distance and time)
    consistency: 2,     // repeated melodic context fingered differently
    template: 3,        // per note off the standard scale / chromatic fingering
  },

}

/**
 * The published model, for comparison and for checking the rule code against
 * the paper's worked examples: Parncutt et al. 1997, semitone distances, all
 * twelve rules at their published points, nothing else.
 */
export const PARNCUTT = {
  distance: 'semitone',
  weights: {
    stretch: 2, smallSpan: 1, largeSpan: 1, largeSpanPair: 2, impractical: 1000,
    posChange: 1, posChangeSize: 1, weak4: 1, weak5: 1, threeFourFive: 1, threeToFour: 1,
    fourOnBlack: 1, thumbOnBlack: 1, thumbOnBlackNext: 2, fiveOnBlack: 2, thumbPass: 1,
    cross: null, crossDist: 0, turnaround: 0, repeatShuttle: 0, sameFinger: 1000,
    repeatSame: 0, repeatChange: 0, anchor: 0, leap: 1000, template: 0, vertical: 1, natural: 0, consistency: 0,
  },
}

// ── Geometry helpers ───────────────────────────────────────────────────────
const MIRROR = 124 // reflection around D4 (62)
export const mirror = p => MIRROR - p

function makeDistance(kind) {
  const phys = (a, b) => (keyX(b) - keyX(a)) / SEMITONE_CM
  if (kind === 'semitone') return (a, b) => b - a
  if (kind === 'physical') return phys
  return (a, b) => 0.5 * (b - a + phys(a, b))
}

/** Span limits for finger f1 on the first note → f2 on the second (RH space). */
export function spanLimits(f1, f2, scale = 1, table = SPAN_TABLE) {
  let t
  if (f1 === f2) t = ZERO
  else if (f1 < f2) t = table[`${f1}-${f2}`]
  else { const r = table[`${f2}-${f1}`]; t = [-r[5], -r[4], -r[3], -r[2], -r[1], -r[0]] }
  return scale === 1 ? t : t.map(v => v * scale)
}

// ── Cost model ─────────────────────────────────────────────────────────────
// Every function works in RH space (pitches already mirrored for the LH).
// Notes are { p (RH-space pitch), on, off }.

export function createModel(options = {}) {
  const opts = { ...DEFAULTS, ...options, weights: { ...DEFAULTS.weights, ...options.weights } }
  const W = opts.weights
  const dist = makeDistance(opts.distance)
  const S = opts.handSize
  const limitCache = new Map()
  const lim = (f1, f2) => {
    const k = f1 * 8 + f2
    let v = limitCache.get(k)
    if (!v) limitCache.set(k, v = spanLimits(f1, f2, S, opts.spanTable))
    return v
  }

  // Slow passages and rests let the hand move: scale movement costs down.
  function movement(dt, gap) {
    let m = dt <= 0.3 ? 1 : Math.max(0.25, 0.3 / dt)
    if (gap > 0.12) m *= 0.4
    return m
  }

  /**
   * Span part of a transition: Parncutt rules 1, 2, 3 (+ the soft practical wall).
   * Thumb crossings (thumb under going up, finger over going down) get their own
   * curve instead of Parncutt's large-span points, which charge 5-9 points for
   * every ordinary scale pass and so push the thumb onto black keys to shorten
   * passes; pianists treat a short pass as routine.
   */
  function spanCost(d, f1, f2, n1, n2) {
    // Rules are stated for the lower finger first; a reverse pair is the same
    // pair with the interval negated (so a cramped 3→1 is a small span, not a large one)
    if (f1 > f2) return spanCost(-d, f2, f1, n2, n1)
    const [minP, minC, minR, maxR, maxC, maxP] = lim(f1, f2)
    const thumb = f1 === 1 || f2 === 1
    // a long finger on a black key sits further in, so it reaches over a
    // thumb on the neighbouring white key without cramping (chromatic 1-3)
    const tucked = thumb && n1 && f1 !== f2 && !isBlack((f1 === 1 ? n1 : n2).p) && isBlack((f1 === 1 ? n2 : n1).p)
    let c = 0
    if (W.cross && thumb && f1 !== f2 && (f2 - f1) * d < 0) {
      const other = f1 === 1 ? f2 : f1
      c += W.cross[other] + W.crossDist * Math.max(0, Math.abs(d) - CROSS_RELAXED[other] * S)
    } else {
      if (d > maxC) c += W.stretch * (d - maxC)
      else if (d < minC) c += W.stretch * (minC - d)
      if (d < minR) c += W.smallSpan * (thumb ? (tucked ? 0.25 : 1) : 2) * (minR - d)
      else if (d > maxR) c += W.largeSpan * (thumb ? 1 : W.largeSpanPair) * (d - maxR)
    }
    if (d > maxP) c += W.impractical * (d - maxP)
    else if (d < minP) c += W.impractical * (minP - d)
    return c
  }

  /** Repeated note: same finger is fine when slow, fast repetitions want a change (4-3-2-1). */
  function repeatCost(f1, f2, dt) {
    if (f1 === f2) return dt < 0.14 ? W.repeatSame : dt < 0.22 ? W.repeatSame / 3 : 0
    let c = dt >= 0.22 ? W.repeatChange : 0
    if (f2 > f1) c += 0.3                 // descending order (4-3-2-1) is the norm
    c += 0.25 * (Math.abs(f1 - f2) - 1)   // neighbouring fingers
    return c
  }

  /** The hand jumps |d| units in dt seconds (gap = time with no key down). */
  function leapCost(d, dt, gap) {
    const t = Math.max(0.04, Math.min(dt, gap + 0.1))
    return W.leap * (0.5 + 0.05 * d) * Math.min(4, 0.25 / t)
  }

  /** Two consecutive notes a → b (rules 1-3, 8, 9, 12, same finger, repeats). */
  function pairCost(a, fa, b, fb, chordal = false) {
    const dt = b.on - a.on
    if (a.p === b.p) return repeatCost(fa, fb, dt)
    const gap = b.on - a.off
    const d = dist(a.p, b.p)
    if (fa === fb) {
      // a glide or a hop: only with a gap (staccato / rest) or time to spare.
      // Parncutt forbids it outright; we keep it soft so detached and slow music can use it.
      // between chords a moving finger is routine (pedal or a slight lift covers it)
      const legato = gap < 0.05 && !chordal
      const speed = dt < 0.3 ? 1 : 0.3 / dt
      const c = W.sameFinger * (legato ? 3 : 0.35) * speed + 0.1 * Math.abs(d)
      return Math.abs(d) >= 7 ? Math.min(c, leapCost(Math.abs(d), dt, gap)) : c
    }
    let c = spanCost(d, fa, fb, a, b) * movement(dt, gap)
    // a leap: rather than stretch, the hand lifts and jumps (cheaper with time)
    const [, minC, , , maxC] = lim(fa, fb)
    if ((d > maxC || d < minC) && Math.abs(d) >= 7) c = Math.min(c, leapCost(Math.abs(d), dt, gap))
    // natural hand frame: neighbouring fingers about one white key apart
    if ((fb - fa) * d > 0) c += W.natural * Math.abs(Math.abs(d) - 1.85 * Math.abs(fb - fa))
    if (fa === 3 && fb === 4) c += W.threeToFour
    if ((fa === 3 && fb === 4) || (fa === 4 && fb === 3)) {
      const three = fa === 3 ? a : b, four = fa === 4 ? a : b
      if (!isBlack(three.p) && isBlack(four.p)) c += W.fourOnBlack
    }
    // thumb passing: thumb under going up, finger over going down
    if ((fb === 1 && fa !== 1 && d > 0) || (fa === 1 && fb !== 1 && d < 0)) {
      const thumbNote = fb === 1 ? b : a, fingerNote = fb === 1 ? a : b
      const tb = isBlack(thumbNote.p), fbk = isBlack(fingerNote.p)
      if (tb === fbk) c += W.thumbPass
      else if (tb && !fbk) c += 3 * W.thumbPass
    }
    return c
  }

  /** Three consecutive single notes (rules 4, 5, 7, plus thumb turnarounds). */
  function tripleCost(a, fa, b, fb, c, fc) {
    let cost = 0
    if (fa !== fb && fb !== fc && fa !== fc && fa + fb + fc === 12) cost += W.threeFourFive
    // crossing under the thumb and straight back over it (e.g. 4-1-4 around a turn)
    if (fb === 1 && fa !== 1 && fc !== 1 && b.p > a.p && b.p > c.p) cost += W.turnaround
    // fast repeated note: rotate three fingers (3-2-1) rather than shuttle two (2-1-2)
    if (a.p === b.p && b.p === c.p && fa === fc && fa !== fb && c.on - a.on < 0.4) cost += W.repeatShuttle
    if (a.p === c.p) return cost   // back on the same key: no position change
    // the chromatic glide: thumb on two white keys a tone apart, a long finger on
    // the black key between; the hand stays put while the thumb slides
    // (and the mirror case: the long finger on two black keys around the thumb)
    if (Math.abs(c.p - a.p) <= 2 && fa === fc && ((fa === 1 && fb > 1 && fb < 5 && isBlack(b.p) && !isBlack(a.p) && !isBlack(c.p)) ||
      (fb === 1 && fa > 1 && fa < 5 && !isBlack(b.p) && isBlack(a.p) && isBlack(c.p)))) return cost
    const d = dist(a.p, c.p)
    const [minP, minC, , , maxC, maxP] = lim(fa, fc)
    if (d > maxC || d < minC) {
      const between = (b.p - a.p) * (c.p - b.p) > 0
      const full = fb === 1 && between && (d > maxP || d < minP)
      const size = d > maxC ? d - maxC : minC - d
      // chromatic steps pivoting on a thumb on a white key (C2 B1 B♭3): the hand
      // creeps by a semitone rather than changing position
      const creep = fb === 1 && !isBlack(b.p) && Math.abs(b.p - a.p) === 1 && b.p - a.p === c.p - b.p ? 0.2 : 1
      cost += creep * movement(c.on - a.on, 0) * (W.posChange * (full ? 2 : 1) + W.posChangeSize * size)
    }
    return cost
  }

  /** Cost of finger f on note n alone, given whether its neighbours are white (rules 6, 10, 11). */
  function noteCost(n, f, prevWhite, nextWhite) {
    let c = 0
    if (f === 4) c += W.weak4
    else if (f === 5) c += W.weak5
    if (isBlack(n.p)) {
      const whites = (prevWhite ? 1 : 0) + (nextWhite ? 1 : 0)
      if (f === 1) c += W.thumbOnBlack + W.thumbOnBlackNext * whites
      else if (f === 5) c += W.fiveOnBlack * whites
    }
    return c
  }

  /** Two notes sounding together, lo below hi, fingers flo < fhi. */
  function chordPairCost(lo, flo, hi, fhi) {
    return W.vertical * spanCost(dist(lo.p, hi.p), flo, fhi)
  }

  /** Where the hand is: mean over fingers of key position minus that finger's rest offset. */
  function anchor(cfg) {
    let s = 0
    for (const [n, f] of cfg) s += n.p - 1.85 * (f - 1)
    return s / cfg.length
  }

  return { opts, W, dist, lim, movement, leapCost, spanCost, pairCost, tripleCost, noteCost, chordPairCost, anchor, repeatCost }
}

// ── Slicing ────────────────────────────────────────────────────────────────
/** Group notes (sorted by onset) into slices of near-simultaneous onsets. */
export function makeSlices(notes, tol = 0.03) {
  const sorted = [...notes].sort((a, b) => a.on - b.on || a.p - b.p)
  const slices = []
  for (const n of sorted) {
    const last = slices[slices.length - 1]
    if (last && n.on - last.on <= tol) last.notes.push(n)
    else slices.push({ on: n.on, notes: [n] })
  }
  for (const s of slices) s.notes.sort((a, b) => a.p - b.p)
  return slices
}

// k-combinations of the given (sorted) finger list
function combos(list, k) {
  const out = []
  const rec = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return }
    for (let i = start; i <= list.length - (k - acc.length); i++) { acc.push(list[i]); rec(i + 1, acc); acc.pop() }
  }
  rec(0, [])
  return out
}
const COMBOS = new Map()
function combosFor(freeMask, k) {
  const key = freeMask * 8 + k
  if (!COMBOS.has(key)) {
    const free = [1, 2, 3, 4, 5].filter(f => freeMask & (1 << f))
    COMBOS.set(key, combos(free, k))
  }
  return COMBOS.get(key)
}

// ── One hand ───────────────────────────────────────────────────────────────
/**
 * Finger one hand. notes: [{ p, on, off }] in RH space (mirror LH pitches first).
 * Writes n.finger (1..5, or 0 when a slice has more than five new notes) and
 * returns { cost, slices }.
 */
export function fingerHand(notes, model, hand = 'R') {
  if (!notes.length) return { cost: 0, slices: 0 }
  const { opts } = model
  const slices = makeSlices(notes, opts.chordTolerance)

  // Templates (research §6.5 G2): standard fingerings for recognised scale and
  // chromatic runs, as a soft per-slice target finger.
  const target = new Int8Array(slices.length), targetW = new Float32Array(slices.length)
  if (model.W.template) {
    const seq = slices.map(s => ({ p: s.notes[0].p, on: s.on, chord: s.notes.length > 1 }))
    for (const [i, [f, w]] of chromaticTemplate(seq)) { target[i] = f; targetW[i] = w }
    const real = seq.map(n => ({ ...n, p: hand === 'L' ? mirror(n.p) : n.p }))
    for (const [i, [f, w]] of scaleTemplate(real, hand)) { target[i] = f; targetW[i] = w }
  }

  // neighbour colours for the black-key rules: nearest-pitch note of the previous / next slice
  const nearestWhite = (sl, p) => {
    if (!sl) return true   // a hand arriving from rest comes from outside the black keys
    let best = sl.notes[0]
    for (const n of sl.notes) if (Math.abs(n.p - p) < Math.abs(best.p - p)) best = n
    return !isBlack(best.p)
  }

  // Pattern consistency (research §6.5 G1): a single note whose melodic context
  // (pitch class, one interval before, two after) repeats an earlier note's
  // within the last few bars should take the same finger. This is what makes
  // the second octave of a scale or the next bar of an Alberti bass copy the
  // first instead of picking an equally cheap variant.
  const ref = new Int32Array(slices.length).fill(-1)
  {
    const mono = i => slices[i] && slices[i].notes.length === 1
    const seen = new Map()
    const p = j => slices[j].notes[0].p
    const ctx = (a, b, c, d) => `${((p(b) % 12) + 12) % 12},${p(b) - p(a)},${p(c) - p(b)},${p(d) - p(c)}`
    for (let i = 0; i < slices.length; i++) {
      if (!mono(i) || !mono(i - 1) || !mono(i + 1) || p(i) === p(i - 1) || p(i) === p(i + 1)) continue
      const fwd = mono(i + 2) ? ctx(i - 1, i, i + 1, i + 2) : null
      // the same figure played backwards (scales go down with the fingers they went up with)
      const rev = mono(i - 2) ? ctx(i + 1, i, i - 1, i - 2) : null
      const j = seen.get(fwd) ?? seen.get(rev)
      if (j !== undefined && i - j <= 48) ref[i] = j
      if (fwd) seen.set(fwd, i)
    }
  }

  // hypothesis: { cost, down: [[note, finger]] sorted by pitch, struck: [[note, finger]], parent, fingers }
  let beam = [{ cost: 0, down: [], struck: null, parent: null, fingers: null, mono: false }]
  slices.forEach((sl, si) => {
    const prevSl = slices[si - 1], nextSl = slices[si + 1]
    let fresh = sl.notes
    if (fresh.length > 5) {
      // more than five keys at once: finger the outer five, leave the rest unfingered
      fresh = [...fresh.slice(0, 3), ...fresh.slice(-2)]
      for (const n of sl.notes) if (!fresh.includes(n)) n.finger = 0
    }
    const k = fresh.length
    const minDur = Math.min(...fresh.map(n => n.off - n.on))
    const holdTol = Math.max(0.08, 0.5 * minDur)
    const unary = fresh.map(n => {
      const pw = nearestWhite(prevSl, n.p), nw = nearestWhite(nextSl, n.p)
      return [0, 1, 2, 3, 4, 5].map(f => (f ? model.noteCost(n, f, pw, nw) : 0))
    })
    const next = new Map()
    for (const h of beam) {
      // keys still held down from earlier slices keep their finger
      let held = h.down.filter(([n]) => n.off - sl.on > holdTol && !fresh.includes(n))
      if (held.length + k > 5) held = held.sort((a, b) => b[0].off - a[0].off).slice(0, 5 - k).sort((a, b) => a[0].p - b[0].p)
      let mask = 0b111110
      for (const [, f] of held) mask &= ~(1 << f)
      for (const fs of combosFor(mask, k)) {
        // fingers must rise with pitch across held and new keys alike
        const cfg = held.concat(fresh.map((n, i) => [n, fs[i]])).sort((a, b) => a[0].p - b[0].p || a[1] - b[1])
        let ok = true
        for (let i = 1; i < cfg.length; i++) if (cfg[i][1] <= cfg[i - 1][1] || cfg[i][0].p === cfg[i - 1][0].p) { ok = false; break }
        if (!ok) continue
        let c = h.cost
        for (let i = 0; i < k; i++) c += unary[i][fs[i]]
        if (target[si] && k === 1 && fs[0] !== target[si]) c += model.W.template * targetW[si]
        // vertical: every pair that includes a new key
        for (let i = 0; i < cfg.length; i++) for (let j = i + 1; j < cfg.length; j++) {
          if (!fresh.includes(cfg[i][0]) && !fresh.includes(cfg[j][0])) continue
          c += model.chordPairCost(cfg[i][0], cfg[i][1], cfg[j][0], cfg[j][1])
        }
        const struck = fresh.map((n, i) => [n, fs[i]])
        if (h.struck) {
          // horizontal: average over (previous key, new key) pairs (Al Kasimi et al.)
          let hsum = 0
          const chordal = h.struck.length > 1 || k > 1
          const blocks = h.struck.length > 1 && k > 1   // chord to chord
          for (const [a, fa] of h.struck) for (const [b, fb] of struck) hsum += model.pairCost(a, fa, b, fb, blocks)
          c += hsum / (h.struck.length * k)
          if (chordal) {
            const dt = sl.on - h.struck[0][0].on
            const gap = sl.on - Math.max(...h.struck.map(([n]) => n.off))
            c += model.W.anchor * Math.abs(model.anchor(struck) - model.anchor(h.struck)) * model.movement(dt, gap)
          }
          // three single notes in a row: position changes, 3-4-5
          const g = h.parent?.struck
          if (k === 1 && h.struck.length === 1 && g && g.length === 1) {
            c += model.tripleCost(g[0][0], g[0][1], h.struck[0][0], h.struck[0][1], struck[0][0], struck[0][1])
          }
          if (ref[si] >= 0) {
            let a = h
            for (let s = si - 1; s > ref[si] && a; s--) a = a.parent
            if (a && a.fingers && a.fingers.length === 1 && a.fingers[0] !== fs[0]) c += model.W.consistency
          }
        }
        const key = cfg.map(([n, f]) => n.p * 8 + f).join(',') + '|' + fs.join('') + '|' + (h.struck && h.struck.length === 1 ? h.struck[0][1] : '')
        const old = next.get(key)
        if (!old || c < old.cost) next.set(key, { cost: c, down: cfg, struck, parent: h, fingers: fs, fresh })
      }
    }
    if (!next.size) {
      // nothing fits (shouldn't happen: held keys are dropped first); restart the hand
      const fs = combosFor(0b111110, k)[0]
      const struck = fresh.map((n, i) => [n, fs[i]])
      beam = [{ cost: beam[0].cost + 50, down: struck, struck, parent: beam[0], fingers: fs, fresh }]
      return
    }
    beam = [...next.values()].sort((a, b) => a.cost - b.cost).slice(0, opts.beam)
  })
  // back-trace
  const best = beam[0]
  for (let h = best; h && h.fingers; h = h.parent) h.fresh.forEach((n, i) => { n.finger = h.fingers[i] })
  return { cost: best.cost, slices: slices.length }
}

// ── Hand split ─────────────────────────────────────────────────────────────
/**
 * Assign 'L' / 'R' to notes that have no hand yet. Beam search over onset
 * slices: in each slice the sorted notes are cut once (below → LH). Costs:
 * more than five keys or a span beyond an octave-and-a-bit in one hand, hand
 * movement (cheaper with time), a weak register prior (LH low, RH high), and
 * the hands crossing.
 */
export function splitHands(notes, { handSize = 1, beam = 32, chordTolerance = 0.03 } = {}) {
  const todo = notes.filter(n => n.hand !== 'L' && n.hand !== 'R')
  if (!todo.length) return notes
  const slices = makeSlices(todo.map(n => ({ p: n.pitch, on: n.on, off: n.off, src: n })), chordTolerance)
  const maxSpan = 12 * handSize + 2
  const handCost = (ns, last, t, side) => {
    if (!ns.length) return 0
    let c = 0
    if (ns.length > 5) c += 30 * (ns.length - 5)
    const span = ns[ns.length - 1].p - ns[0].p
    if (span > maxSpan - 2) c += 1.5 * (span - maxSpan + 2)
    if (span > maxSpan + 1) c += 15 * (span - maxSpan - 1)
    const mean = ns.reduce((s, n) => s + n.p, 0) / ns.length
    // register prior: LH lives below ~E4, RH above ~G3
    c += side === 'L' ? 0.04 * Math.max(0, mean - 60) : 0.04 * Math.max(0, 64 - mean)
    if (last) {
      const move = Math.abs(mean - last.p)
      const dt = Math.max(0.05, t - last.t)
      c += 0.25 * Math.max(0, move - 5) * Math.min(2, 0.5 / dt)
    } else c += 0.03 * Math.abs(mean - (side === 'L' ? 48 : 72))
    return c
  }
  const pos = ns => ns.length ? { p: ns.reduce((s, n) => s + n.p, 0) / ns.length, lo: ns[0].p, hi: ns[ns.length - 1].p } : null
  let hyps = [{ cost: 0, L: null, R: null, parent: null, cut: 0, slice: null }]
  for (const sl of slices) {
    const k = sl.notes.length
    const next = []
    for (const h of hyps) for (let cut = 0; cut <= k; cut++) {
      const L = sl.notes.slice(0, cut), R = sl.notes.slice(cut)
      let c = h.cost + handCost(L, h.L, sl.on, 'L') + handCost(R, h.R, sl.on, 'R')
      const pl = pos(L), pr = pos(R)
      // crossing: this LH above where the RH is (or vice versa)
      const rRef = pr || h.R, lRef = pl || h.L
      if (lRef && rRef && lRef.p > rRef.p) c += 4 + 0.5 * (lRef.p - rRef.p)
      // a single line handed over to the other hand while the first could still reach it
      if (k === 1 && h.single && h.single.hand !== (cut ? 'L' : 'R') && Math.abs(sl.notes[0].p - h.single.p) <= 9 && sl.on - h.single.t < 0.6) c += 3
      next.push({
        cost: c, parent: h, cut, slice: sl,
        single: k === 1 ? { hand: cut ? 'L' : 'R', p: sl.notes[0].p, t: sl.on } : null,
        L: pl ? { p: pl.p, t: sl.on } : h.L,
        R: pr ? { p: pr.p, t: sl.on } : h.R,
      })
    }
    // recombine: same cut and similar hand positions
    const best = new Map()
    for (const h of next) {
      const key = `${h.cut}|${h.single?.hand}|${h.L ? Math.round(h.L.p / 3) : '-'}|${h.R ? Math.round(h.R.p / 3) : '-'}`
      const o = best.get(key)
      if (!o || h.cost < o.cost) best.set(key, h)
    }
    hyps = [...best.values()].sort((a, b) => a.cost - b.cost).slice(0, beam)
  }
  for (let h = hyps[0]; h && h.slice; h = h.parent) h.slice.notes.forEach((n, i) => { n.src.hand = i < h.cut ? 'L' : 'R' })
  return notes
}

// ── Whole piece ────────────────────────────────────────────────────────────
/**
 * Finger a piece. notes: [{ pitch, on, off, hand? ('L'|'R'), ... }] (seconds).
 * Returns the same note objects with .hand and .finger set, plus stats.
 */
export function fingerPiece(notes, options = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const model = createModel(options)
  if (options.splitHands !== false) splitHands(notes, model.opts)
  const out = {}
  for (const hand of ['R', 'L']) {
    const own = notes.filter(n => n.hand === hand)
    const rh = own.map(n => ({ p: hand === 'L' ? mirror(n.pitch) : n.pitch, on: n.on, off: n.off, src: n }))
    out[hand] = fingerHand(rh, model, hand)
    for (const n of rh) n.src.finger = n.finger ?? 0
  }
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return { notes, cost: out.R.cost + out.L.cost, ms: t1 - t0, hands: out }
}

// ── Helpers for tests and the UI ───────────────────────────────────────────
/** Fingers as a string per hand, in onset order (chords bottom → top). */
export function fingerString(notes, hand) {
  return notes.filter(n => !hand || n.hand === hand).sort((a, b) => a.on - b.on || a.pitch - b.pitch).map(n => n.finger).join('')
}

/** Cost of a given fingering (for checking the rules against Parncutt's worked examples). */
export function costOf(pitches, fingers, options = {}, { dt = 0.25, hand = 'R' } = {}) {
  const model = createModel(options)
  const ns = pitches.map((p, i) => {
    const m = typeof p === 'string' ? parseNote(p) : p
    return { p: hand === 'L' ? mirror(m) : m, on: i * dt, off: (i + 1) * dt }
  })
  let c = 0
  ns.forEach((n, i) => {
    c += model.noteCost(n, fingers[i], i > 0 && !isBlack(ns[i - 1].p), i < ns.length - 1 && !isBlack(ns[i + 1].p))
    if (i > 0) c += model.pairCost(ns[i - 1], fingers[i - 1], n, fingers[i])
    if (i > 1) c += model.tripleCost(ns[i - 2], fingers[i - 2], ns[i - 1], fingers[i - 1], n, fingers[i])
  })
  return c
}

// ── PIG dataset format (Nakamura et al. 2020) ──────────────────────────────
// id  onset  offset  spelledPitch  onVel  offVel  channel(0=RH,1=LH)  finger(LH negative)
export function toPIG(notes) {
  const lines = ['//Version: PianoFingering_v170101']
  const sorted = [...notes].sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  sorted.forEach((n, i) => {
    const ch = n.hand === 'L' ? 1 : 0
    const f = n.finger ? (ch ? -n.finger : n.finger) : 0
    lines.push([i, n.on.toFixed(6), n.off.toFixed(6), noteName(n.pitch), Math.round((n.velocity ?? 0.7) * 127), 80, ch, f].join('\t'))
  })
  return lines.join('\n') + '\n'
}

export function fromPIG(text) {
  const notes = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('//')) continue
    const c = line.trim().split(/\s+/)
    const finger = parseInt(String(c[7]).split('_')[0], 10)
    notes.push({ pitch: parseNote(c[3]), on: +c[1], off: +c[2], velocity: +c[4] / 127, hand: c[6] === '1' ? 'L' : 'R', truth: Math.abs(finger) })
  }
  return notes
}
