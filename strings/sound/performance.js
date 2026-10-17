// Performance renderer for Experiment #034 (research/03_violin_sound.md §4).
//
// Turns a fingered note list (strings/fingering.js) and its bow strokes
// (strings/motion.js) into what a violinist's hands do, sampled at
// FRAME_RATE per string:
//
//   f0     the stopped pitch, with vibrato on long stopped notes (5–6.5 Hz,
//          15–35 cents, starting late and growing, none on open strings),
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
//   damp   extra string damping when a finger lifts off a stopped note
//   tap    the left-hand finger landing on the string
//
// Also a loudness curve per string (dB, DDSP's scale) for the neural engine.
// Pure functions of the note list: seek and speed are free.

import { FRAME_RATE, NCH, midiHz, INSTRUMENTS as SYNTH } from './bowed.js'
import { buildMotion } from '../motion.js'
import { INSTRUMENTS } from '../fingering.js'

export const STYLE = {
  vibrato: 1,        // × depth
  vibratoRate: 5.8,  // Hz
  portamento: 1,     // × slide length (0 = none)
  dynamics: 1,       // × dynamic range
  phrasing: 1,       // × phrase arches and swells
  bowSpeed: 1,       // × bow speed
  pressure: 1,       // × bow force
  contact: 1,        // × distance from the bridge
}

// minimum bow force F_min ≈ FMIN·(Z/0.3)^ZEXP·v/β² (fitted on the waveguide)
const FMIN = 0.02, ZEXP = 1.5
const smooth5 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10))
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * notes: fingered notes { pitch, on, off, velocity?, string, finger, base }.
 * Returns { frameRate, frames, duration, data (Float32Array frames·4·NCH),
 *           loudness: [Float32Array × 4], strokes, notes }.
 */
export function renderPerformance(notesIn, { instrument = 'violin', style = {}, frameRate = FRAME_RATE, seed = 7, tail = 2 } = {}) {
  const S = { ...STYLE, ...style }
  const inst = INSTRUMENTS[instrument] || INSTRUMENTS.violin
  const R = rng(seed)
  const notes = notesIn.filter(n => n.string != null && !n.unplayable).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  const motion = buildMotion(notes, { instrument })
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
        phraseGain.set(n, 1 + S.phrasing * (0.18 * (arch - 0.5) + 0.012 * (n.pitch - mean) - (x > 0.85 ? 0.1 : 0)))
      }
    }
    let lastOff = -Infinity
    notes.forEach((n, i) => {
      if (i && n.on - lastOff > 0.3) { flush(i); start = i }
      lastOff = Math.max(lastOff, n.off)
    })
    flush(notes.length)
  }

  const dynOf = n => {
    const v = n.velocity ?? 0.75
    return clamp(0.55 + (v - 0.7) * 1.2 * S.dynamics, 0.08, 1)
  }

  // ── bow: velocity magnitude per stroke ──
  for (const st of strokes) {
    const D = Math.max(0.04, st.t1 - st.t0)
    st.V = clamp(Math.abs(st.end - st.start) / 100 / D, 0.05, 1.1) * S.bowSpeed
    const n0 = st.events[0].notes[0]
    st.dyn = dynOf(n0)
    st.short = D < 0.18 && st.events.length === 1
  }

  // Write bow controls note by note on their string.
  // A note's bowing segment runs from its onset to the next onset in the same
  // stroke (slurs are continuous) or to its own end (the stroke's end).
  const vel = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const force = [0, 1, 2, 3].map(() => new Float32Array(frames))
  const beta = [0, 1, 2, 3].map(() => new Float32Array(frames).fill(0.11 * S.contact))
  const amp = [0, 1, 2, 3].map(() => new Float32Array(frames))
  for (const st of strokes) {
    const D = Math.max(0.04, st.t1 - st.t0)
    const atk = st.short ? clamp(0.3 * D, 0.012, 0.03) : clamp(0.2 * D, 0.025, 0.07)
    const rel = st.short ? clamp(0.35 * D, 0.015, 0.05) : clamp(0.12 * D, 0.025, 0.06)
    const next = strokes[strokes.indexOf(st) + 1]
    const lifts = !next || next.t0 - st.t1 > 0.35
    for (let k = 0; k < st.events.length; k++) {
      const e = st.events[k], ne = st.events[k + 1]
      const a = e.on, b = ne ? ne.on : st.t1
      for (const n of e.notes) {
        const s = n.string
        const dyn = dynOf(n)
        const pg = phraseGain.get(n) ?? 1
        const nd = n.off - n.on
        const semis = n.pitch - inst.open[s]
        const b0 = (0.125 - 0.06 * dyn) * S.contact * Math.pow(2, semis / 24)
        // a slow bow moves toward the bridge to hold the level (Helmholtz amplitude ∝ v/β)
        const bet = clamp(b0 * clamp(Math.pow(st.V / 0.35, 0.7), 0.4, 1.3) * (1 + (R() - 0.5) * 0.1), 0.03, 0.24)
        // across a crossing inside a slur the force hands over within ~12 ms
        const xIn = k > 0 && st.events[k - 1].notes.every(m => m.string !== s) ? 0.012 : 0
        const xOut = ne && ne.notes.every(m => m.string !== s) ? 0.012 : 0
        const i0 = Math.max(0, Math.floor(fr(a - xIn - 0.004)))
        const i1 = Math.min(frames - 1, Math.ceil(fr(b + (ne ? xOut : (lifts ? 0.05 : 0.02)))))
        for (let i = i0; i <= i1; i++) {
          const t = T(i)
          // stroke envelope: attack at the stroke's start, release into its end (bow change or lift)
          let env = smooth5((t - st.t0) / atk)
          if (!st.short && st.t0 === a) env *= 1 + 0.12 * Math.exp(-(t - st.t0) / 0.05) * (t >= st.t0 ? 1 : 0)
          env *= t > st.t1 ? 0 : smooth5((st.t1 - t) / rel) * 0.85 + 0.15 * (t <= st.t1 ? 1 : 0)
          if (t > st.t1) env = 0
          // messa di voce on long notes, phrase arch
          let sw = 1
          if (nd > 0.7) { const x = clamp((t - n.on) / nd, 0, 1); sw = 1 + S.phrasing * 0.16 * (Math.sin(Math.PI * Math.pow(x, 0.8)) - 0.35) }
          const vmag = st.V * (0.5 + 0.7 * dyn) * pg * sw * env
          // handover across strings inside a slur
          let w = 1
          if (xIn && t < a) w = smooth5((t - (a - xIn)) / xIn)
          if (xOut && t > b - xOut) w = Math.min(w, smooth5((b + xOut - t) / (2 * xOut)))
          if (t < a - xIn) w = 0
          const v = st.dir * vmag
          // Schelleng: F ∝ v/β (geometric middle of the window), a bite on détaché attacks
          const bite = st.short ? 1.5 : 1.2
          const Fk = (0.55 + 0.9 * dyn) * S.pressure * Zs[s] * Math.sqrt(0.1 / bet) * (1 + (bite - 1) * Math.exp(-Math.max(0, t - st.t0) / 0.035))
          let F = Math.max(Math.abs(v), 0.04 + 0.06 * dyn) * Fk
          // stay above Schelleng's minimum (F_min ∝ Z² v / β², measured on the waveguide)
          F = Math.max(F, FMIN * S.pressure * Math.pow(Zr[s], ZEXP) * Math.abs(v) / (bet * bet))
          // between strokes the bow rests on the string (light force); in long rests it lifts
          if (t > st.t1) F = lifts ? 0.25 * smooth5(1 - (t - st.t1) / 0.05) : 0.12
          if (w <= 0) continue
          if (w * F >= force[s][i]) { force[s][i] = w * F; vel[s][i] = v; beta[s][i] = bet }
          amp[s][i] = Math.max(amp[s][i], w * (t <= st.t1 ? (vmag / bet) / 3.2 : 0))
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
      if (shift && S.portamento > 0) {
        const iv = Math.abs(n.pitch - prev.pitch)
        const slow = Math.min(n.off - n.on, prev.off - prev.on) > 0.35
        const pd = clamp(0.03 + 0.011 * iv, 0.035, 0.16) * (slow ? 1.25 : 0.6) * S.portamento
        g0 = n.on - pd * 0.75; g1 = n.on + pd * 0.25
      }
      if (!n.finger) { g0 = n.on - 0.004; g1 = n.on + 0.002 }
      const i0 = Math.max(0, Math.floor(fr(g0))), i1 = Math.min(frames - 1, Math.ceil(fr(holdEnd)))
      for (let i = i0; i <= i1; i++) {
        const t = T(i)
        const x = (t - g0) / Math.max(1e-3, g1 - g0)
        logf[s][i] = fromLog + (target - fromLog) * smooth5(x)
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
      if (n.finger && dur >= 0.22 && S.vibrato > 0) {
        const dyn = dynOf(n)
        const rate = S.vibratoRate * (1 + (R() - 0.5) * 0.08) + (dyn - 0.5) * 0.5
        const depth = S.vibrato * (13 + 19 * dyn) * (dur > 1 ? 1.15 : 1) * (dur < 0.4 ? 0.7 : 1)
        const delay = clamp(0.08 + 0.12 * Math.min(1, dur / 1.2), 0.06, 0.22)
        const ph0 = R() * 2 * Math.PI
        const end = Math.min(n.off, next && next.on - n.off < 0.2 ? next.on - 0.03 : n.off + 0.08)
        for (let i = Math.floor(fr(n.on)); i <= Math.min(frames - 1, Math.ceil(fr(end))); i++) {
          const t = T(i), age = t - n.on - delay
          if (age <= 0) continue
          const env = smooth5(age / 0.28) * (1 + 0.15 * Math.min(1, age / 1.5)) * smooth5((end - t) / 0.08)
          // rate eases in a little (players start slower)
          const ph = ph0 + 2 * Math.PI * rate * (age - 0.06 * (1 - Math.exp(-age / 0.3)))
          vibCents[s][i] = depth * env * Math.sin(ph)
        }
      }
    }
    // slow intonation drift (±2 cents, smooth)
    let d = 0, dv = 0
    for (let i = 0; i < frames; i++) {
      dv += (R() - 0.5) * 0.02 - dv * 0.02
      d += dv; d *= 0.995
      f0[s][i] = Math.pow(2, logf[s][i] + (vibCents[s][i] + clamp(d, -2.5, 2.5)) / 1200)
    }
  }

  // ── pack ──
  for (let i = 0; i < frames; i++) {
    const o = i * W
    for (let s = 0; s < 4; s++) {
      const q = o + s * NCH
      data[q] = f0[s][i]; data[q + 1] = vel[s][i]; data[q + 2] = force[s][i]
      data[q + 3] = beta[s][i]; data[q + 4] = damp[s][i]; data[q + 5] = tap[s][i]
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
      L[i] = a > 1e-6 ? clamp(-60 + 20 * Math.log10(a), -120, -40) : -120
    }
    return L
  })

  return { frameRate, frames, duration, data, loudness, strokes, notes, instrument }
}

/** Read one string's channel back as an array (tests, plots). */
export function channel(perf, s, ch) {
  const out = new Float32Array(perf.frames), W = 4 * NCH
  for (let i = 0; i < perf.frames; i++) out[i] = perf.data[i * W + s * NCH + ch]
  return out
}

/** Time-scale a note list (playback speed): notes at 1/speed. */
export const scaleNotes = (notes, speed) => speed === 1 ? notes : notes.map(n => ({ ...n, on: n.on / speed, off: n.off / speed }))
