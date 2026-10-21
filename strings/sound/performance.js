// Performance renderer for Experiment #034 (research/03_violin_sound.md §4).
//
// Turns a fingered note list (strings/fingering.js) and its bow strokes
// (strings/motion.js) into what a violinist's hands do, sampled at
// FRAME_RATE per string:
//
//   f0     the stopped pitch, with vibrato on long stopped notes (5–6.5 Hz,
//          ±10–20 cents, irregular from cycle to cycle, starting late and
//          growing, none on open strings),
//          portamento on shifts (the old finger slides, the new one lands; a
//          longer slide for wider and slower shifts), fast finger changes
//          inside a position, a slow intonation drift, and the open pitch
//          once the finger lifts
//   vel    bow velocity (m/s, sign = down/up bow): stroke length / duration
//          from motion.js, an attack ramp at the start of each stroke, a dip
//          through zero at bow changes, a release at the end; phrase arches
//          and messa di voce on long notes
//   force  bow force (N), kept inside Schelleng's window for the velocity
//          and contact point (F ∝ v/β), with a little extra "bite" at
//          détaché attacks; the bow leaves the string in long rests and
//          rests on it (damping it) at short ones
//   beta   bow–bridge distance / vibrating length: nearer the bridge for
//          forte and in high positions, toward the fingerboard for piano
//          Automatic bowing (style.autoBow, after violinists measured by
//          Schoonderwaldt 2009 and the bow hold): within a note the contact
//          point and force keep moving: toward the bridge and heavier as a long
//          note swells (long notes change their dynamic mainly with the
//          contact point, fast ones with bow speed), lighter toward the tip,
//          a little further out on the G string, and a slow wander of both
//          (SWAM's Random Bow)
//   damp   extra string damping when a finger lifts off a stopped note
//   tap    the left-hand finger landing on the string
//
// Also a loudness curve per string (dB, DDSP's scale) for the neural engine.
// Notes are humanized first (humanize.js: timing, velocity, attack pitch, bow
// variance); the returned `notes` are the humanized ones, so the note-based
// engines (samples, GM) play the same performance.
// Pure functions of the note list: seek and speed are free.

import { FRAME_RATE, NCH, midiHz, INSTRUMENTS as SYNTH } from './bowed.js'
import { buildMotion } from '../motion.js'
import { INSTRUMENTS } from '../fingering.js'
import { humanize, HUMANIZE, rng as rngH } from './humanize.js'

export const STYLE = {
  vibrato: 1,        // × depth
  vibratoRate: 6.6,  // Hz (four violinists in the Bach Violin Dataset: median 6.55, strings/test/perf_stats.js)
  portamento: 1,     // × slide length (0 = none)
  portato: 1,        // × depth of portato / louré pulses inside a slur (0 = none)
  dynamics: 1,       // × dynamic range
  phrasing: 1,       // × phrase arches and swells
  bowSpeed: 1,       // × bow speed
  pressure: 1,       // × bow force
  contact: 1,        // × distance from the bridge
  legato: 1,         // legato bow changes (0…1): between connected, unmarked strokes the bow turns quickly and the string keeps sounding; 0 = every stroke starts and ends on its own
  attack: 1,         // how strokes start: < 1 lighter (slower ramp, less bite and press, Baroque), > 1 harder
  autoBow: 1,        // automatic bowing (× the player's continuous bow-pressure / contact-point moves; 0 = static per note)
  ...HUMANIZE,       // timing, intonation, variance (humanize.js)
  // play modes, after SWAM's Right Hand / Polyphony pages
  bowStart: 1,       // first stroke: 1 down-bow, -1 up-bow
  keepBow: false,    // keep alternating across rests (no retake to bowStart)
  bowLift: 'off',    // 'off': the bow leaves the string after a phrase (it rings); 'on': it stays and stops it
  crossMute: 2,      // slurred string crossing: stop the old string's ring when the interval is ≤ this many semitones (0 = never, Infinity = always)
  // SWAM's Left Hand / Right Hand modes
  harmonics: 0,      // 0 off; 2 / 3 / 4: every note a harmonic touching at 1/n of the string (sounding an octave, a 12th, two octaves above the stop); 'auto': only notes above the fingerboard's comfortable range
  tremolo: 'off',    // 'off' | 'slow' | 'fast': bowed tremolo on every note long enough for it
  tremoloMode: 'hz', // 'hz': fixed rate; 'sync': 16ths (slow) / 32nds (fast) of `tempo`; 'acc': sync, accelerating into it
  tremoloMin: 8,     // strokes per second at least (sync modes double the rate until it is reached)
  tempo: null,       // bpm, for the sync modes
}

/** Semitones from the stopped note up to the sounding harmonic n (touch at 1/n of the string). */
export const HARMONIC_UP = { 2: 12, 3: 19, 4: 24 }

/**
 * Turn notes into harmonics (SWAM Harmonics 2 / 3 / 4): the written note is the
 * sounding pitch, the finger stops HARMONIC_UP[n] lower and another touches the
 * string at 1/n. A natural harmonic (the stop is the open string) is preferred,
 * then the note's own string, then the highest string the stop fits on within
 * an octave. Notes too low for it stay ordinary. Mutates and returns notes.
 */
export function planHarmonics(notes, open, mode) {
  if (!mode || mode === 'off' || mode === '0') return notes
  for (const n of notes) {
    let ks
    if (mode === 'auto') {
      // only above the comfortable range of the top string, and long enough to speak
      if (n.pitch <= open[3] + 19 || n.off - n.on < 0.25) continue
      ks = [4, 3, 2]
    } else ks = [+mode]
    let best = null
    for (const k of ks) {
      const stop = n.pitch - HARMONIC_UP[k]
      const fits = [0, 1, 2, 3].filter(s => stop >= open[s] && stop - open[s] <= 12)
      if (!fits.length) continue
      const s = fits.find(s => stop === open[s]) ?? (fits.includes(n.string) ? n.string : fits[fits.length - 1])
      const c = { k, stop, s, natural: stop === open[s] }
      if (!best || (c.natural && !best.natural)) best = c
      if (best.natural) break
    }
    if (!best) continue
    n.harm = best.k; n.stop = best.stop; n.string = best.s
    n.finger = best.natural ? 0 : 1; n.base = Math.max(1, best.stop - open[best.s])
    if (best.natural) { delete n.attackCents; delete n.attackSettle }
  }
  return notes
}

/** Tremolo rate (strokes / s) for the style, or 0. */
export function tremoloRate(S) {
  if (!S.tremolo || S.tremolo === 'off') return 0
  const fast = S.tremolo === 'fast'
  if (S.tremoloMode !== 'hz' && S.tempo > 0) {
    let r = S.tempo / 60 * (fast ? 8 : 4)
    while (r < (S.tremoloMin || 0)) r *= 2
    while (r > 24) r /= 2
    return r
  }
  return Math.max(fast ? 15 : 9, S.tremoloMode === 'hz' ? 0 : S.tremoloMin || 0)
}
/** Tremolo stroke phase (in strokes) τ s into a note; 'acc' starts at 55 % of the rate and reaches it in 0.35 s. */
const tremPhase = (tau, r, acc) => {
  if (!acc) return r * tau
  const A = 0.35
  return tau < A ? r * (0.55 * tau + 0.45 * tau * tau / (2 * A)) : r * (0.55 * A + 0.45 * A / 2 + (tau - A))
}
const TQ = Math.tanh(2.2)

/**
 * Expression lane from MIDI controllers (SWAM's Expression, the player's one
 * continuous dynamic): CC11 when it moves, else CC7 (MuseScore and LilyPond
 * write dynamics and hairpins there), else CC2 (breath). `ccs` is a map
 * number → [{ time, value 0…1 }] (Tone.js Midi `track.controlChanges`).
 * Returns { cc, points: [[t, v]] } or null when no controller moves.
 */
export function expressionFromCC(ccs) {
  for (const cc of [11, 7, 2]) {
    const list = (ccs?.[cc] || []).slice().sort((a, b) => a.time - b.time)
    if (new Set(list.map(e => Math.round(e.value * 127))).size >= 2) return { cc, points: list.map(e => [e.time, e.value]) }
  }
  return null
}

/** The GM volume curve (40·log10 v dB) as a dynamic (≈19 dB per unit, see dynOf), 0.08…1. */
const ccDyn = v => clamp(1 + 40 * Math.log10(Math.max(0.05, v)) / 19, 0.08, 1)

// minimum bow force F_min ≈ FMIN·(Z/0.3)^ZEXP·v/β² (fitted on the waveguide)
// fitted to four violinists in the Bach Violin Dataset (Ko, Garner, Kim, Telmányi;
// strings/test/perf_stats.js, pooled over ~300 sustained notes): vibrato on ~70 % of
// them, ±13–14 cents, 6.5 Hz, present from the start of the note (continuous
// vibrato, not a late bloom), notes swelling ~1.5 dB and ending a little louder
const VIB_W = 1.5       // × (12 + 3·dynamic) cents: measured ±13–14 like the recordings (was (8 + 10·dyn): ±7.4 measured)
const VIB_ON = 0.06     // onset delay scale (was 0.2: vibrato bloomed after ~0.3 s; players start at once)
const VIB_EASE = 0.06   // the rate starts this much slower and eases in (was 0.12)
const VIB_GROW = 0.1    // widening through a long note (was 0.45: long notes got wider than players')
const VIB_SKIP = 0.25   // share of notes with almost no vibrato (players leave some plain)
const SWELL = 0.4, SWELL_P = 1.0   // messa di voce on notes ≥ 0.45 s, less on very long ones (was 0.16 from 0.7 s, peak at 42 %); none on harmonics
const ARCH = 0.6, HEIGHT = 0.03    // phrase arch and higher-is-louder per semitone (were 0.18, 0.012)
const FMIN = 0.02, ZEXP = 1.5
// steady force scale and the attack press (×ATK_F decaying in ATK_T s), tuned on
// strings/test/attack.js with the waveguide's pitch-tracking end losses
// stroke types: spiccato's contact time and martelé's bowing time (fractions of the
// time to the next stroke), martelé's pinch (× the stroke's force) and its rest on the string
// legato bow change: the bow turns in about LEG_T each side; the new stroke keeps
// 70 % of its attack press (Guettler: the string still has to re-form Helmholtz
// motion the other way) but none of its bite or swell. Short strokes (fast
// détaché) get LEG_SHORT of it, keeping a little articulation
const LEG_T = 0.008, LEG_PRESS = 0.7, LEG_SHORT = 0.5
const SPIC = 0.5, MART = 0.6, MART_PINCH = 2.2, MART_REST = 0.35
// depth of the bow-speed dip at a portato (dots under a slur) and a louré
// (a line under a slur, or a repeated note in one bow) pulse
const PORTATO = 0.55, LOURE = 0.35
const PRESS = 2, ATK_F = 2, ATK_T = 0.04
// short strokes (< 180 ms, one note) press less and speed up half as fast: with
// the full ×2 press on top of their bite they peaked at 4–8.7 N at forte, above
// a player's 3–4 N accents, and cracked (the Tchaikovsky concerto's chord
// strokes, strings/README.md "Short strokes")
const ATK_F_SHORT = 1.5, ATK_SHORT_RAMP = 2
const HARM_F = 0.6   // harmonics are bowed lighter (the touch takes energy; at full force they crack)
const smooth5 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10))
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

const rng = rngH

/**
 * notes: fingered notes { pitch, on, off, velocity?, string, finger, base }.
 * Returns { frameRate, frames, duration, data (Float32Array frames·4·NCH),
 *           loudness: [Float32Array × 4], strokes, notes }.
 */
export function renderPerformance(notesIn, { instrument = 'violin', style = {}, frameRate = FRAME_RATE, seed = 7, tail = 2, expression = null } = {}) {
  const S = { ...STYLE, ...style }
  const inst = INSTRUMENTS[instrument] || INSTRUMENTS.violin
  const R = rng(seed)
  const playable = notesIn.filter(n => n.string != null && !n.unplayable)
  // a recorded performance (strings/expression.js) brings its own timing,
  // intonation, dynamics and phrasing: no humanized timing or attack pitch,
  // no rule-made phrase arches and swells
  // (a recording of an ensemble brings only its timing: expression.timing)
  const REC = !!expression?.recorded
  const notes = planHarmonics(humanize(playable, REC ? { ...S, timing: 0, intonation: 0 } : expression?.timing ? { ...S, timing: 0 } : S, seed + 101), inst.open, S.harmonics)
  const PH = REC ? 0 : S.phrasing
  // one note at a time on a string: a note held into the next one on its string
  // ends there (a held voice the fingering put on the same string as the moving one)
  {
    const per = [[], [], [], []]
    for (const n of notes) if (n.string != null) per[n.string].push(n)
    for (const list of per) { list.sort((a, b) => a.on - b.on); for (let k = 1; k < list.length; k++) if (list[k - 1].off > list[k].on) list[k - 1].off = Math.max(list[k - 1].on + 0.03, list[k].on) }
  }
  const motion = buildMotion(notes, { instrument, bowStart: S.bowStart < 0 ? -1 : 1, keepBow: !!S.keepBow })
  const strokes = motion.strokes
  const duration = notes.reduce((m, n) => Math.max(m, n.off), 0)
  const frames = Math.max(2, Math.ceil((duration + tail) * frameRate) + 1)
  const W = 4 * NCH
  const data = new Float32Array(frames * W)
  const fr = t => t * frameRate
  const T = i => i / frameRate
  const open = inst.open.map(midiHz)
  // heavier strings need more force for the same Helmholtz motion (Schelleng: F ∝ Z)
  const Zr = (SYNTH[instrument] || SYNTH.violin).Z.map(z => z / 0.3)
  const Zs = Zr.map(z => Math.sqrt(z * 0.3 / 0.37))
  // automatic bowing: a slow, smooth wander of contact point and force per string
  // (two first-order lowpasses of seeded noise, ~0.6 s and ~0.9 s), unit RMS
  const AB = Math.max(0, S.autoBow ?? 1)
  // contact point: × swell of a long note (÷ string weight), + on the lowest string,
  // wander; force: frog → tip lightening, wander
  const K_SW = 0.9, K_G = 0.06, K_WB = 0.07, K_TIP = 0.12, K_WF = 0.05
  const wander = (sd, tau) => {
    const Rn = rngH(seed * 977 + sd), out = new Float32Array(frames), a = Math.exp(-1 / (tau * frameRate))
    let x = 0, y = 0
    for (let i = 0; i < frames; i++) { x = a * x + (1 - a) * (Rn() - 0.5); y = a * y + (1 - a) * x; out[i] = y }
    let e = 0; for (let i = 0; i < frames; i++) e += out[i] * out[i]
    const g = 1 / Math.sqrt(e / frames || 1); for (let i = 0; i < frames; i++) out[i] *= g
    return out
  }
  const wB = [0, 1, 2, 3].map(s => wander(11 + s, 0.6)), wF = [0, 1, 2, 3].map(s => wander(29 + s, 0.9))

  // ── per-note context ──
  const byString = [[], [], [], []]
  for (const n of notes) byString[n.string].push(n)
  const noteStroke = new Map()
  for (const st of strokes) for (const e of st.events) for (const n of e.notes) noteStroke.set(n, st)

  // phrases: split at rests > 0.3 s; arch over each phrase, a lift toward its highest note
  const phraseGain = new Map()
  {
    let start = 0
    const flush = end => {
      const ph = notes.slice(start, end)
      if (!ph.length) return
      const t0 = ph[0].on, t1 = Math.max(...ph.map(n => n.off)), D = Math.max(0.3, t1 - t0)
      const mean = ph.reduce((a, n) => a + n.pitch, 0) / ph.length
      for (const n of ph) {
        const x = (n.on - t0) / D
        const arch = Math.sin(Math.PI * clamp(x * 0.9 + 0.05, 0, 1))
        phraseGain.set(n, 1 + PH * (ARCH * (arch - 0.5) + HEIGHT * (n.pitch - mean) - (x > 0.85 ? 0.1 : 0)))
      }
    }
    let lastOff = -Infinity
    notes.forEach((n, i) => {
      if (i && n.on - lastOff > 0.3) { flush(i); start = i }
      lastOff = Math.max(lastOff, n.off)
    })
    flush(notes.length)
  }

  // expression lane (expressionFromCC, times in performance time): a dynamic
  // offset per frame. When every note has the same velocity (files that write
  // dynamics only as CC7) the lane is the dynamic; otherwise it moves the
  // velocity's dynamic by its deviation from its own median
  const vels = playable.map(n => n.velocity ?? 0.75)
  const flatVel = vels.length > 0 && Math.max(...vels) - Math.min(...vels) < 0.03
  const E = new Float32Array(frames)
  let hasE = false
  if (expression?.dyn) {
    // a lane of dynamics (a recording's level, strings/expression.js), rate frames per second from t0
    const D = expression.dyn, r = expression.rate, t0 = expression.t0 || 0
    for (let i = 0; i < frames; i++) {
      const u = (T(i) - t0) * r, k = Math.floor(u), w = u - k
      const d = k < 0 ? D[0] : k >= D.length - 1 ? D[D.length - 1] : D[k] + (D[k + 1] - D[k]) * w
      E[i] = S.dynamics * (d - 0.55)
    }
    hasE = true
  } else if (expression?.points?.length) {
    const P = expression.points
    const dA = P.map(([, v]) => ccDyn(v))
    const ref = flatVel ? 0.55 : [...dA].sort((a, b) => a - b)[dA.length >> 1]
    let j = 0
    for (let i = 0; i < frames; i++) {
      const t = T(i)
      while (j + 1 < P.length && P[j + 1][0] <= t) j++
      // controllers step; smooth the step over ~60 ms as a player would
      const target = t < P[0][0] ? (flatVel ? dA[0] : ref) : dA[j]
      const prev = i ? E[i - 1] : target - ref
      E[i] = prev + (S.dynamics * (target - ref) - prev) * (1 - Math.exp(-1 / (0.06 * frameRate)))
    }
    hasE = true
  }
  const dynOf = n => {
    if (hasE && flatVel) return 0.55
    const v = n.velocity ?? 0.75
    return clamp(0.55 + (v - 0.7) * 1.2 * S.dynamics, 0.08, 1)
  }

  // ── bow: velocity magnitude per stroke ──
  for (const st of strokes) {
    const D = Math.max(0.04, st.t1 - st.t0)
    const n0 = st.events[0].notes[0]
    st.V = clamp(Math.abs(st.end - st.start) / 100 / D, 0.05, 1.1) * S.bowSpeed * (1 + 0.06 * (n0.bowVar ?? 0))
    st.dyn = dynOf(n0)
    st.short = D < 0.18 && st.events.length === 1
  }
  // Legato bow changes. A stroke that starts where the last one ended (the
  // notes touch: a gap of at most 8 % of the note, or 15 ms), neither stroke
  // marked (spiccato, martelé, staccato), is a bow change inside a legato
  // line, not a new attack: the old stroke runs on to the change and slows only
  // in its last few ms, the bow turns through zero at once, and the new stroke
  // speeds up as fast without a new bite. Before, every stroke started and
  // ended as if detached, and the sound dipped ~27 dB for ~30 ms at each change
  // (strings/README.md "Legato bow changes")
  const LEG = clamp(S.legato ?? 1, 0, 1)
  const marked = st => st.events.some(e => e.notes.some(n => n.art?.stroke))
  for (let k = 1; k < strokes.length; k++) {
    const a = strokes[k - 1], b = strokes[k]
    const gap = b.t0 - a.t1, ioi = b.t0 - a.events[a.events.length - 1].on
    if (LEG <= 0 || gap > Math.max(0.015, 0.08 * ioi) || marked(a) || marked(b)) continue
    b.legIn = a.legOut = LEG * (a.short || b.short ? LEG_SHORT : 1)
    // the old note sounds until the bow changes
    if (gap > 0) a.t1 = b.t0
  }

  // Write bow controls note by note on their string.
  // A note's bowing segment runs from its onset to the next onset in the same
  // stroke (slurs are continuous) or to its own end (the stroke's end).
  const vel = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const force = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const beta = [0, 1, 2, 3].map(() => new Float32Array(frames).fill(0.11 * S.contact))
  const amp = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const tremR = tremoloRate(S), tremAcc = S.tremoloMode === 'acc'
  const trm = [0, 1, 2, 3].map(() => new Float32Array(frames).fill(1))
  for (const st of strokes) {
    const D = Math.max(0.04, st.t1 - st.t0)
    // tremolo: separately bowed notes long enough for two strokes at least
    st.trem = tremR && D >= 2 / tremR && st.events.length === 1 ? tremR : 0   // not inside slurs
    if (st.trem) for (const e of st.events) for (const n of e.notes) n.trem = { t0: st.t0, r: tremR, acc: tremAcc }
    const atkK = Math.max(0.05, S.attack ?? 1)
    // stroke types from the articulation plan (strings/articulation.js): a single-note stroke
    //   spiccato  the bow drops onto the string and bounces off within SPIC of the note:
    //             speed and force rise and fall together, then the bow is off and the string rings
    //   martele   pinched: force on the string before the bow moves, a bitten fast start, the
    //             bow stops after MART of the note and rests on the string (it is stopped)
    const sk0 = st.events.length === 1 ? st.events[0].notes[0].art?.stroke : null
    const sk = S.strokes === 0 ? null : sk0 === 'spiccato' || sk0 === 'martele' ? sk0 : null
    st.kind = sk
    const nextOn = strokes[strokes.indexOf(st) + 1]?.t0 ?? st.t1 + 0.3
    const span = Math.max(0.04, Math.min(nextOn, st.t1 + 0.05) - st.t0)
    const spC = clamp(SPIC * span, 0.03, 0.1)
    const maC = clamp(MART * span, 0.05, Math.max(0.05, span - 0.04))
    // portato / louré inside the stroke (strings/articulation.js: marks under a
    // slur, repeated notes): the bow eases just before the note and presses into
    // it, so the note speaks without a bow change. Width from the note before
    const pulses = S.portato > 0 ? st.events.flatMap((e, k) => {
      const kind = k > 0 && e.notes[0].art?.portato
      if (!kind) return []
      return [{ t: e.on, d: Math.min(0.95, (kind === 'portato' ? PORTATO : LOURE) * S.portato), w: clamp(0.15 * (e.on - st.events[k - 1].on), 0.012, 0.04) }]
    }) : []
    const pulse = t => { let g = 1; for (const p of pulses) { const u = (t - p.t + 0.8 * p.w) / p.w; if (u > -4 && u < 4) g *= 1 - p.d * Math.exp(-0.5 * u * u) } return g }
    const press = t => { let g = 1; for (const p of pulses) { const u = t - p.t + 0.003; if (u >= 0 && u < 0.2) g *= 1 + 0.6 * p.d * Math.exp(-u / 0.03) } return g }
    const lgI = st.legIn || 0, lgO = st.legOut || 0
    const atk0 = (st.short ? clamp(0.3 * D, 0.012, 0.03) * ATK_SHORT_RAMP : clamp(0.2 * D, 0.025, 0.07)) / Math.sqrt(atkK)
    const rel0 = st.short ? clamp(0.35 * D, 0.015, 0.05) : clamp(0.12 * D, 0.025, 0.06)
    // a legato bow change turns the bow in about LEG_T each side
    const atk = atk0 + (Math.min(atk0, LEG_T) - atk0) * lgI
    const rel = rel0 + (Math.min(rel0, LEG_T) - rel0) * lgO
    const next = strokes[strokes.indexOf(st) + 1]
    const rest = !next || next.t0 - st.t1 > 0.35
    // bow lift 'off string': the bow leaves after a phrase and the string rings;
    // 'on string': it stays on the string (light, still) and stops it
    const onString = S.bowLift === 'on'
    const lifts = rest && !onString
    for (let k = 0; k < st.events.length; k++) {
      const e = st.events[k], ne = st.events[k + 1]
      const a = e.on, b = ne ? ne.on : st.t1
      for (const n of e.notes) {
        const s = n.string
        const dynN = dynOf(n), ex0 = hasE ? E[Math.min(frames - 1, Math.round(fr(n.on)))] : 0
        const dyn0 = clamp(dynN + ex0, 0.08, 1)
        const pg = phraseGain.get(n) ?? 1
        const nd = n.off - n.on
        const semis = (n.harm ? n.stop : n.pitch) - inst.open[s]
        const b0 = (0.125 - 0.06 * dyn0) * S.contact * Math.pow(2, semis / 24)
        // a slow bow moves toward the bridge to hold the level (Helmholtz amplitude ∝ v/β)
        const bet0 = clamp(b0 * clamp(Math.pow(st.V / 0.35, 0.7), 0.4, 1.3) * (1 + (R() - 0.5) * 0.1), 0.03, 0.24)
        // across a crossing inside a slur the force hands over within ~12 ms
        const xIn = k > 0 && st.events[k - 1].notes.every(m => m.string !== s) ? 0.012 : 0
        // a note held on through the next notes of its slur (a held voice under a
        // moving one) keeps its bow until it ends; a note that ends before its
        // stroke does (that, or the shorter note of a double stop) loses the bow
        // at its own end: the bow leaves its string and plays on on the other
        const held = !!ne && n.off > ne.on + 0.03
        const bN = held ? Math.min(n.off, st.t1) : b
        const own = held ? n.off < st.t1 - 0.03 : !ne && e.notes.some(m => m !== n && m.off > n.off + 0.03)
        const tE = own ? Math.max(a + 0.02, n.off) : st.t1   // where this note's bowing ends
        const xOut = ne && !held && ne.notes.every(m => m.string !== s) ? 0.012 : 0
        const i0 = Math.max(0, Math.floor(fr(a - xIn - (sk === 'martele' ? 0.016 : 0.004))))
        const i1 = Math.min(frames - 1, Math.ceil(fr(own ? tE + 0.015 : bN + (ne && !held ? xOut : (lifts ? 0.05 : rest ? 0.3 : 0.02)))))
        for (let i = i0; i <= i1; i++) {
          const t = T(i)
          // stroke envelope: attack at the stroke's start, release into its end (bow change or lift)
          // the bow speeds up fast and then settles (1 − (1 − x)²): a quick, clean
          // start (Guettler: a fast acceleration with enough force; strings/test/attack.js)
          const xa = (t - st.t0) / atk
          let env = xa <= 0 ? 0 : xa >= 1 ? 1 : 1 - (1 - xa) * (1 - xa)
          if (!st.short && st.t0 === a) env *= 1 + 0.12 * atkK * (1 - lgI) * Math.exp(-(t - st.t0) / 0.05) * (t >= st.t0 ? 1 : 0)
          env *= t > tE ? 0 : smooth5((tE - t) / rel) * 0.85 + 0.15 * (t <= tE ? 1 : 0)
          if (t > tE) env = 0
          if (sk === 'spiccato') { const x = (t - st.t0) / spC; env = x <= 0 || x >= 1 ? 0 : Math.pow(Math.sin(Math.PI * x), 0.6) }
          else if (sk === 'martele') { const x = t - st.t0; env = x <= 0 ? 0 : x < 0.008 ? x / 0.008 : x < maC ? 1 : Math.max(0, 1 - (x - maC) / 0.02) }
          // messa di voce on long notes, phrase arch
          let sw = 1
          if (nd > 0.45 && !n.harm) { const x = clamp((t - n.on) / nd, 0, 1); sw = 1 + PH * SWELL * Math.min(1, 1.5 / nd) * (Math.sin(Math.PI * Math.pow(x, SWELL_P)) - 0.35) }
          // the expression lane moves the bow with the dynamic: faster, heavier and
          // nearer the bridge when louder (SWAM: "the speed of the bow in relation to the pressure")
          const ex = hasE ? E[i] : 0
          const dyn = hasE ? clamp(dynN + ex, 0.08, 1) : dyn0
          let bet = hasE ? clamp(bet0 * (1 - 0.35 * (ex - ex0)), 0.03, 0.24) : bet0
          // automatic bowing: the contact point follows the swell of a long note
          // (messa di voce sw, phrase arch pg: toward the bridge as it grows),
          // sits a little further out on the lowest string, and wanders slowly;
          // the force is lighter toward the tip (the bow's weight is at the frog,
          // only partly made up by the arm) and wanders too
          let fAuto = 1
          if (AB > 0 && t >= st.t0 && t <= st.t1) {
            const L = clamp((nd - 0.25) / 0.9, 0, 1)
            const swell = sw * Math.pow(pg, 0.5) - 1
            const bowAt = st.start + (st.end - st.start) * clamp((t - st.t0) / D, 0, 1)
            bet = clamp(bet * clamp(1 - AB * K_SW * L * swell / Zr[s], 0.88, 1.12) * (1 + AB * (s === 0 ? K_G : 0)) * (1 + AB * K_WB * (0.4 + 0.6 * L) * wB[s][i]), 0.03, 0.24)
            // the moves stay where the string speaks easily: they may not take a note
            // planned near the bridge closer to it (forte on a heavy string) or one
            // planned far out (high positions) further out (subharmonics, strings/test/sound.test.js)
            bet = clamp(bet, bet0 * (Zr[s] > 2 ? 0.97 : 0.85), bet0 > 0.13 ? bet0 : Math.min(0.13, bet0 * 1.15))
            fAuto = (1 + AB * K_TIP * (0.5 - bowAt / 65)) * (1 + AB * K_WF * wF[s][i])
          }
          if (pulses.length) env *= pulse(t)
          const vmag = st.V * (0.5 + 0.7 * dyn) * pg * sw * env
          // handover across strings inside a slur
          let w = 1
          if (xIn && t < a) w = smooth5((t - (a - xIn)) / xIn)
          if (xOut && t > bN - xOut) w = Math.min(w, smooth5((bN + xOut - t) / (2 * xOut)))
          if (t < a - xIn - (sk === 'martele' && k === 0 ? 0.016 : 0)) w = 0   // martelé: the pinch comes before the note
          let v = st.dir * vmag
          // tremolo: the bow turns every 1/r s (rounded square wave); the force
          // follows the stroke's speed, not the turns, so each change bites
          let vF = Math.abs(v)
          if (st.trem && t >= st.t0 && t <= st.t1) {
            const q = Math.tanh(2.2 * Math.sin(Math.PI * tremPhase(t - st.t0, st.trem, tremAcc))) / TQ
            v *= 1.15 * q
            trm[s][i] = Math.min(trm[s][i], 0.4 + 0.6 * Math.abs(q))
          }
          // Schelleng: F ∝ v/β (geometric middle of the window), a bite on détaché attacks
          const bite = 1 + (st.short ? 0.5 : 0.2) * atkK * (1 - lgI)
          // harmonics are bowed lighter (HARM_F, measured on the waveguide); tremolo a little lighter
          const Fk = (0.55 + 0.9 * dyn) * S.pressure * (n.harm ? HARM_F : 1) * (st.trem ? 0.85 : 1) * (1 + 0.05 * (n.bowVar ?? 0)) * Zs[s] * Math.sqrt(0.1 / bet) * (1 + (bite - 1) * Math.exp(-Math.max(0, t - st.t0) / 0.035))
          let F = Math.max(vF, 0.04 + 0.06 * dyn) * Fk * PRESS * fAuto
          // stay above Schelleng's minimum (F_min ∝ Z² v / β², measured on the waveguide)
          F = Math.max(F, FMIN * S.pressure * (n.harm ? HARM_F : 1) * Math.pow(Zr[s], ZEXP) * vF / (bet * bet))
          // the bow presses in to catch the string and eases off: ×2 at the start, back in ~40 ms
          if (t >= st.t0 - 0.004 && !sk) F *= 1 + ((st.short ? ATK_F_SHORT : ATK_F) - 1) * atkK * (1 - (1 - LEG_PRESS) * lgI) * Math.exp(-Math.max(0, t - st.t0) / ATK_T)
          // the force follows the dip less than the speed does (the bow grips
          // as it slows: the articulation) and presses into the new note
          if (pulses.length) F *= press(t) * Math.pow(Math.max(0.25, pulse(t)), -0.6)
          if (sk) {
            // the stroke's full-speed force, for the pinch and the rest on the string
            const vS = st.V * (0.5 + 0.7 * dyn) * pg
            const Fs = Math.max(Math.max(vS, 0.04 + 0.06 * dyn) * Fk * PRESS, FMIN * S.pressure * Math.pow(Zr[s], ZEXP) * vS / (bet * bet))
            if (sk === 'spiccato') { const x = (t - st.t0) / spC; F = x <= 0 || x >= 1 ? 0 : Fs * Math.pow(Math.sin(Math.PI * x), 0.8) }
            else {
              const x = t - st.t0
              F = x < 0 ? MART_PINCH * Fs * smooth5((x + 0.016) / 0.012)
                : x < maC + 0.02 ? Fs * (1 + (MART_PINCH - 1) * Math.exp(-x / 0.03) * atkK)
                : MART_REST * Fs
            }
          }
          // between strokes the bow rests on the string (light force); in long rests it lifts
          if (own && t > tE) F = sk === 'martele' ? F : 0.12 * smooth5(1 - (t - tE) / 0.015)   // the bow rolls off this string
          else if (t > st.t1 && sk !== 'martele') F = sk === 'spiccato' ? 0 : lifts ? 0.25 * smooth5(1 - (t - st.t1) / 0.05) : 0.12
          if (w <= 0) continue
          if (w * F >= force[s][i]) { force[s][i] = w * F; vel[s][i] = v; beta[s][i] = bet }
          amp[s][i] = Math.max(amp[s][i], w * (t <= tE ? (vmag / bet) / 3.2 : 0))
        }
      }
    }
  }

  // ── left hand: f0, vibrato, portamento, damping, taps ──
  const f0 = [0, 1, 2, 3].map(s => new Float32Array(frames).fill(open[s]))
  const damp = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const tap = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const logf = [0, 1, 2, 3].map(s => new Float32Array(frames).fill(Math.log2(open[s])))
  const vibCents = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const harmC = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const recM = [0, 1, 2, 3].map(() => new Uint8Array(frames))
  for (let s = 0; s < 4; s++) {
    const list = byString[s]
    // unique onsets (a double stop never puts two notes on one string)
    for (let k = 0; k < list.length; k++) {
      const n = list[k], prev = list[k - 1], next = list[k + 1]
      const target = Math.log2(midiHz(n.pitch))
      // the finger holds until the next note on this string, or lifts a little after the note
      const holdEnd = next && next.on - n.off < 0.6 ? next.on : n.off + 0.12
      // transition into this note
      let g0 = n.on - 0.006, g1 = n.on + 0.004
      const fromLog = prev && n.on - prev.off < 0.6 ? Math.log2(midiHz(prev.pitch)) : Math.log2(open[s])
      const shift = prev && n.finger && prev.finger && prev.base !== n.base && n.on - prev.off < 0.2
      // a slide the plan asks for (strings/articulation.js: a score's slide or
      // glissando mark, a quiet overlap in a MIDI performance, a slow slurred
      // leap): heard, longer than a shift's, also without a change of position
      const port = n.art?.port && prev && n.finger && n.on - prev.off < 0.2 && prev.pitch !== n.pitch
      if ((shift || port) && S.portamento > 0) {
        const iv = Math.abs(n.pitch - prev.pitch)
        const slow = Math.min(n.off - n.on, prev.off - prev.on) > 0.35
        let pd = clamp(0.03 + 0.011 * iv, 0.035, 0.16) * (slow ? 1.25 : 0.6) * S.portamento
        if (port) pd = clamp(0.07 + 0.012 * iv, 0.09, 0.22) * S.portamento
        // across a bow change (a plan that says so) the shift hides in the change: half as long
        else if (n.art?.source && !n.art.slurPrev) pd *= 0.5
        g0 = n.on - pd * 0.75; g1 = n.on + pd * 0.25
        n.slide = port ? 'expressive' : 'shift'
      }
      if (!n.finger) { g0 = n.on - 0.004; g1 = n.on + 0.002 }
      const i0 = Math.max(0, Math.floor(fr(g0))), i1 = Math.min(frames - 1, Math.ceil(fr(holdEnd)))
      // the finger lands a little off pitch and settles (humanize.js)
      const ac = (n.attackCents ?? 0) / 1200, ast = Math.max(0.01, n.attackSettle ?? 0.05)
      // a recorded pitch curve (cents from the note, strings/expression.js): the
      // player's landing, vibrato and intonation, held at its ends, while the note sounds
      const rc = n.rec, recAt = rc ? t => { const u = clamp((t - rc.t0) * rc.rate, 0, rc.c.length - 1), k = Math.floor(u), w = u - k; return (rc.c[k] + ((rc.c[k + 1] ?? rc.c[k]) - rc.c[k]) * w) / 1200 } : null
      const recEnd = Math.min(holdEnd, n.off + 0.05)
      for (let i = i0; i <= i1; i++) {
        const t = T(i)
        const x = (t - g0) / Math.max(1e-3, g1 - g0)
        const err = recAt ? (t <= recEnd ? recAt(t) * S.vibrato : 0) : ac ? ac * (1 - smooth5((t - g1) / ast)) : 0
        logf[s][i] = fromLog + (target + err - fromLog) * smooth5(x)
        if (recAt && t <= recEnd) recM[s][i] = 1
        harmC[s][i] = n.harm || 0
      }
      // the finger lifts after a stopped note with no follower: damp, then back to open
      if (n.finger && holdEnd === n.off + 0.12) {
        for (let i = Math.floor(fr(n.off + 0.02)); i < Math.min(frames, Math.ceil(fr(n.off + 0.5))); i++) {
          const t = T(i)
          damp[s][i] = Math.max(damp[s][i], t < n.off + 0.12 ? smooth5((t - n.off - 0.02) / 0.1) * 0.85 : 0.85 * (1 - smooth5((t - n.off - 0.12) / 0.38)))
        }
        for (let i = Math.ceil(fr(holdEnd)); i < frames && (!next || T(i) < next.on - 0.01); i++) logf[s][i] = Math.log2(open[s])
      }
      // finger tap when a finger lands (not for the same finger staying down)
      if (n.finger && !(prev && prev.finger === n.finger && prev.pitch === n.pitch && n.on - prev.off < 0.6)) {
        const i = Math.max(0, Math.round(fr(n.on - 0.006)))
        if (i < frames) tap[s][i] += 0.012 + 0.006 * n.finger / 4
      }
      // vibrato: stopped notes long enough to feel it
      const dur = n.off - n.on
      if (n.finger && dur >= 0.22 && S.vibrato > 0 && !rc) {
        const dyn = clamp(dynOf(n) + (hasE ? E[Math.min(frames - 1, Math.round(fr(n.on)))] : 0), 0.08, 1)
        const rate = S.vibratoRate * (1 + (R() - 0.5) * 0.08) + (dyn - 0.5) * 0.5
        // depth (cents, half the swing): ±12–15 nominal, measured ±13–14 like the Bach Violin Dataset players
        const depth = S.vibrato * VIB_W * (R() < VIB_SKIP ? 0.3 : 1) * (12 + 3 * dyn) * (n.harm ? 0.6 : 1) * (dur < 0.4 ? 0.7 : 1)
        const delay = clamp(VIB_ON * (0.08 + 0.12 * Math.min(1, dur / 1.2)) / 0.2, 0.01, 0.22)
        const ph0 = R() * 2 * Math.PI
        const end = Math.min(n.off, next && next.on - n.off < 0.2 ? next.on - 0.03 : n.off + 0.08)
        // a player's vibrato is not a sine: each cycle comes a little faster or
        // slower (±8 %) and wider or narrower (±12 %), slowly wandering (two
        // smoothed random walks of unit spread, ~1.5 Hz); it starts slow and narrow and widens
        // through a long note (up to +30 % after 1.5 s)
        let ph = ph0, rw = 0, rv = 0, dw = 0, dv2 = 0
        const kW = 2 * Math.PI * 1.5 / frameRate
        for (let i = Math.floor(fr(n.on)); i <= Math.min(frames - 1, Math.ceil(fr(end))); i++) {
          const t = T(i), age = t - n.on - delay
          if (age <= 0) continue
          rv += kW * ((R() - 0.5) * 20 - rw - 0.6 * rv); rw += kW * rv
          dv2 += kW * ((R() - 0.5) * 20 - dw - 0.6 * dv2); dw += kW * dv2
          const env = smooth5(age / (0.35 * VIB_ON / 0.2 + 0.05)) * (0.85 + VIB_GROW * smooth5(age / 1.5)) * smooth5((end - t) / 0.08)
          // the rate eases in (players start slower) and wanders
          const r = rate * (1 - VIB_EASE * Math.exp(-age / 0.3)) * (1 + 0.08 * clamp(rw, -1.5, 1.5))
          ph += 2 * Math.PI * r / frameRate
          vibCents[s][i] = depth * env * (1 + 0.12 * clamp(dw, -1.5, 1.5)) * Math.sin(ph)
        }
      }
    }
    // slow intonation drift (±2 cents, smooth)
    let d = 0, dv = 0
    for (let i = 0; i < frames; i++) {
      dv += (R() - 0.5) * 0.02 - dv * 0.02
      d += dv; d *= 0.995
      f0[s][i] = Math.pow(2, logf[s][i] + (vibCents[s][i] + (recM[s][i] ? 0 : clamp(d, -2.5, 2.5))) / 1200)
    }
  }

  // ── mono string crossing (SWAM "Mono CrossString Muting"): inside a slur,
  // a crossing to another string by a small interval stops the old string, so
  // the two notes do not ring together ──
  if (S.crossMute > 0) {
    for (const st of strokes) for (let k = 1; k < st.events.length; k++) {
      const e = st.events[k], pe = st.events[k - 1]
      for (const o of pe.notes) {
        if (e.notes.some(m => m.string === o.string)) continue
        if (!e.notes.some(m => Math.abs(m.pitch - o.pitch) <= S.crossMute)) continue
        const s = o.string, nx = byString[s].find(m => m.on > o.on + 0.01)
        const end = nx ? nx.on - 0.03 : e.on + 0.4
        for (let i = Math.max(0, Math.floor(fr(e.on + 0.01))); i < Math.min(frames, Math.ceil(fr(end))); i++) {
          damp[s][i] = Math.max(damp[s][i], 0.9 * smooth5((T(i) - e.on - 0.01) / 0.03))
        }
      }
    }
  }

  // engines that read note velocities (samples, GM) hear the expression lane too
  if (hasE) for (const n of notes) {
    const d = clamp(dynOf(n) + E[Math.min(frames - 1, Math.round(fr(n.on)))], 0.08, 1)
    n.velocity = clamp(0.7 + (d - 0.55) / 1.2, 0.05, 1)
  }

  // ── pack ──
  for (let i = 0; i < frames; i++) {
    const o = i * W
    for (let s = 0; s < 4; s++) {
      const q = o + s * NCH
      data[q] = f0[s][i]; data[q + 1] = vel[s][i]; data[q + 2] = force[s][i]
      data[q + 3] = beta[s][i]; data[q + 4] = damp[s][i]; data[q + 5] = tap[s][i]; data[q + 6] = harmC[s][i]
    }
  }

  // ── loudness per string for DDSP: the bowed level, a ring-down after the bow leaves ──
  const loudness = [0, 1, 2, 3].map(s => {
    const L = new Float32Array(frames)
    const ring = Math.pow(10, -60 / 20 / (SYNTH[instrument]?.t60[s] ?? 2.5) / frameRate)
    let a = 0
    for (let i = 0; i < frames; i++) {
      const target = amp[s][i]
      const dk = 1 - 0.8 * damp[s][i]
      a = target >= a * ring * dk ? a + (target - a) * 0.6 : a * ring * dk * (force[s][i] > 0.05 && vel[s][i] === 0 ? 0.8 : 1)
      const at = a * trm[s][i]
      L[i] = at > 1e-6 ? clamp(-60 + 20 * Math.log10(at), -120, -40) : -120
    }
    return L
  })

  return { frameRate, frames, duration, data, loudness, strokes, notes, instrument, expression: hasE ? E : null, modes: { bowLift: S.bowLift, tremolo: tremR } }
}

/** Read one string's channel back as an array (tests, plots). */
export function channel(perf, s, ch) {
  const out = new Float32Array(perf.frames), W = 4 * NCH
  for (let i = 0; i < perf.frames; i++) out[i] = perf.data[i * W + s * NCH + ch]
  return out
}

/** Time-scale a note list (playback speed): notes at 1/speed. */
export const scaleNotes = (notes, speed) => speed === 1 ? notes : notes.map(n => ({ ...n, on: n.on / speed, off: n.off / speed, ...(n.rec ? { rec: { ...n.rec, t0: n.rec.t0 / speed, rate: n.rec.rate * speed } } : {}) }))
/** Time-scale an expression lane (expressionFromCC) the same way. */
// (a recording of an ensemble brings only its timing: no lane, no points)
export const scaleExpression = (ex, speed) => !ex || speed === 1 ? ex : ex.dyn ? { ...ex, rate: ex.rate * speed, t0: (ex.t0 || 0) / speed } : ex.points ? { ...ex, points: ex.points.map(([t, v]) => [t / speed, v]) } : ex
