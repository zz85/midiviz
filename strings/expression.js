// Expression from a recording: how a real violinist played the notes of a
// score, measured from the audio and the notes aligned to it (the Bach Violin
// Dataset's alignments), so #034's renderer can play the score with that
// player's timing, dynamics and left hand instead of its own rules.
//
// Measured per recording (analyseRecording):
//   timing    each note's onset and end as played (from the alignment)
//   loudness  the level at RATE frames per second (dB, RMS over 40 ms,
//             0 = the median level inside the notes): the player's dynamics,
//             phrasing, swells and decays
//   pitch     each sustained note's f0 in cents from equal temperament at the
//             recording's own tuning (normalised difference function searched
//             ±150 cents around the note): vibrato as played (rate, width,
//             where it starts and stops), the finger landing and settling, the
//             intonation of each note
// Stored compactly (encodeRecording) and put back on the notes of a piece
// (applyRecording): the notes take the recorded times, the recorded pitch
// curve (n.rec), and the loudness becomes an expression lane of dynamics
// that performance.js plays with the bow (speed, force and contact point
// together, as the CC11 lane does). Bowing (slurs, strokes, bow signs) is
// still planned from the score or an edition: audio does not show it.
import { midiHz } from './sound/bowed.js'

export const RATE = 50
// dB of recorded level per unit of performance.js's dynamic (0.08…1, mf 0.55)
// for the first pass, before the lane is corrected by listening (correctLane):
// the Source engine's notes follow it with a slope near 1 on Ko's Adagio and
// 0.6 on Garner's Allemande (strings/test/expression_ab.js --fit)
export const DB_PER_DYN = 12

const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }

/** f0 (Hz) of x around sample c, searching ±150 cents around f; null when unclear. */
export function f0At(x, sr, c, f, W = Math.round(sr * 0.043)) {
  const a = c - (W >> 1)
  if (a < 0 || a + W + sr / (f * 0.9) >= x.length) return null
  const t0 = Math.floor(sr / (f * 2 ** (150 / 1200))), t1 = Math.ceil(sr / (f * 2 ** (-150 / 1200)))
  let e0 = 0; for (let i = a; i < a + W; i++) e0 += x[i] * x[i]
  if (e0 < 1e-8) return null
  const d = new Float64Array(t1 + 2)
  for (let t = t0 - 1; t <= t1 + 1; t++) { let s = 0, e1 = 0; for (let i = a; i < a + W; i++) { const u = x[i] - x[i + t]; s += u * u; e1 += x[i + t] * x[i + t] } d[t] = s / (e0 + e1) }
  let m = t0; for (let t = t0; t <= t1; t++) if (d[t] < d[m]) m = t
  if (d[m] > 0.35 || m === t0 || m === t1) return null
  const p = (d[m - 1] - d[m + 1]) / (2 * (d[m - 1] - 2 * d[m] + d[m + 1]))
  return sr / (m + p)
}

/** Level (dB) every 1/RATE s: RMS over 40 ms. */
export function levelCurve(x, sr, rate = RATE) {
  const n = Math.ceil(x.length / sr * rate), out = new Float32Array(n), h = Math.round(0.02 * sr)
  for (let k = 0; k < n; k++) {
    const c = Math.round(k * sr / rate); let s = 0, m = 0
    for (let i = Math.max(0, c - h); i < Math.min(x.length, c + h); i++) { s += x[i] * x[i]; m++ }
    out[k] = 10 * Math.log10((m ? s / m : 0) + 1e-12)
  }
  return out
}

/**
 * Measure a recording. x: mono samples at sr; notes: [{ pitch, on, off }] in
 * seconds from the start of x, in the score's pitches; tune: semitones the
 * recording sounds from them (baroque pitch: −1). Returns
 *   { rate, tuning (cents of the whole recording from A = 440 + tune),
 *     loud (Float32Array, dB from the median note level),
 *     cents: per note null or { i0 (frame), c: Float32Array } }
 * The pitch is followed from 40 ms after the onset to 30 ms before the end
 * on notes of 0.12 s or more; gaps are filled; a note with under 60 % of its
 * frames clear has none.
 */
export function analyseRecording(x, sr, notes, { tune = 0, rate = RATE } = {}) {
  const raw = levelCurve(x, sr, rate)
  const frame = t => Math.round(t * rate)
  // the level inside the notes (not the silences between movements)
  const inside = []
  for (const n of notes) for (let k = frame(n.on + 0.04); k < frame(n.off - 0.03); k++) if (raw[k] != null) inside.push(raw[k])
  const ref = median(inside)
  const loud = raw.map(v => Math.max(-60, v - ref))
  const track = (n, off) => {
    const f = midiHz(n.pitch + tune) * 2 ** (off / 1200), out = []
    for (let k = frame(n.on + 0.04); k <= frame(n.off - 0.03); k++) {
      const p = f0At(x, sr, Math.round(k * sr / rate), f)
      out.push(p ? 1200 * Math.log2(p / midiHz(n.pitch + tune)) : NaN)
    }
    return out
  }
  const long = notes.map(n => n.off - n.on >= 0.12)
  // the recording's tuning from its longer notes
  const sample = notes.filter((n, i) => long[i] && n.off - n.on >= 0.3).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 150)) === 0)
  const tuning = median(sample.flatMap(n => track(n, 0)).filter(Number.isFinite)) || 0
  const cents = notes.map((n, i) => {
    if (!long[i]) return null
    const c = track(n, tuning).map(v => v - tuning)
    const ok = c.filter(Number.isFinite).length
    if (ok < 4 || ok < 0.6 * c.length) return null
    // fill gaps from the neighbours; an octave or a fifth jump is not this note
    let last = median(c)
    const y = c.map(v => (Number.isFinite(v) && Math.abs(v - last) < 60 ? (last = v) : last))
    return { i0: frame(n.on + 0.04), c: Float32Array.from(y) }
  })
  return { rate, tuning, loud, cents }
}

// ── compact storage: one character per loudness frame (0.75 dB steps from
// −33 to +14 dB of the median), two per pitch frame (0.1 cent steps, ±204.8) ──
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const IDX = Object.fromEntries([...ABC].map((c, i) => [c, i]))
const enc1 = v => ABC[Math.max(0, Math.min(63, Math.round(v)))]
const enc2 = v => { const q = Math.max(0, Math.min(4095, Math.round(v))); return ABC[q >> 6] + ABC[q & 63] }

/** A recording's analysis, for JSON: notes in the given order (onset, then pitch). */
export function encodeRecording(an, notes) {
  return {
    rate: an.rate, tuning: +an.tuning.toFixed(1),
    on: notes.map(n => Math.round(n.on * 1000)), off: notes.map(n => Math.round(n.off * 1000)),
    loud: [...an.loud].map(v => enc1((v + 33) / 0.75)).join(''),
    cents: an.cents.map(c => c ? [c.i0, [...c.c].map(v => enc2(v * 10 + 2048)).join('')] : 0),
    ...(an.dyn ? { dyn: [...an.dyn].map(v => enc1((v - 0.08) / 0.92 * 63)).join('') } : {}),
  }
}
export function decodeRecording(r) {
  return {
    rate: r.rate, tuning: r.tuning, on: r.on.map(v => v / 1000), off: r.off.map(v => v / 1000),
    loud: Float32Array.from(r.loud, ch => IDX[ch] * 0.75 - 33),
    cents: r.cents.map(c => {
      if (!c) return null
      const s = c[1], out = new Float32Array(s.length / 2)
      for (let k = 0; k < out.length; k++) out[k] = ((IDX[s[2 * k]] << 6 | IDX[s[2 * k + 1]]) - 2048) / 10
      return { i0: c[0], c: out }
    }),
    dyn: r.dyn ? Float32Array.from(r.dyn, ch => 0.08 + IDX[ch] / 63 * 0.92) : null,
  }
}

// The measured vibrato is narrower than played: the 43 ms analysis window and
// the room's reverberation (earlier pitches still sounding) average the swing.
// On our own render with a known vibrato (±14 cents, 6 Hz, through the #030
// hall) the analysis reads ±11.3; so the fast part of a recorded curve
// (above its 0.3 s average) is widened by this much when played. One-frame
// spikes are removed first
export const VIB_GAIN = 1.25
function widen(c0, rate, g) {
  // a one-frame jump is the tracker, not the finger: 3-point median first
  const c = c0.map((v, k) => k && k < c0.length - 1 ? [c0[k - 1], v, c0[k + 1]].sort((a, b) => a - b)[1] : v)
  if (g === 1) return c
  const H = Math.round(0.15 * rate), out = new Float32Array(c.length)
  for (let k = 0; k < c.length; k++) {
    let s = 0, m = 0
    for (let j = Math.max(0, k - H); j <= Math.min(c.length - 1, k + H); j++) { s += c[j]; m++ }
    const slow = s / m
    out[k] = slow + g * (c[k] - slow)
  }
  return out
}

/**
 * Play the notes as the recording did, in place: notes (each with q and
 * pitch) are put in the order onset, then pitch, the order the recording's
 * notes were stored in. Each note takes the recorded on / off and its pitch
 * curve n.rec = { t0 (s), rate, c (cents) }. Returns the expression lane for
 * renderPerformance ({ recorded, rate, t0, dyn: Float32Array }) or null when
 * the note count differs. The lane is the one stored with the recording
 * (corrected by listening, correctLane), else the recorded level inside the
 * notes (laneFromLevel).
 */
export function applyRecording(rec, notes, { dbPerDyn = DB_PER_DYN, vibGain = VIB_GAIN } = {}) {
  const r = rec.loud instanceof Float32Array ? rec : decodeRecording(rec)
  if (r.on.length !== notes.length) return null
  const order = notes.map((n, i) => i).sort((a, b) => (notes[a].q - notes[b].q) || (notes[a].pitch - notes[b].pitch))
  order.forEach((ni, k) => {
    const n = notes[ni]
    n.on = r.on[k]; n.off = Math.max(r.on[k] + 0.03, r.off[k])
    if (r.cents[k]) n.rec = { t0: r.cents[k].i0 / r.rate, rate: r.rate, c: widen(r.cents[k].c, r.rate, vibGain) }
    else delete n.rec
  })
  return { recorded: true, rate: r.rate, t0: 0, dyn: r.dyn ? Float32Array.from(r.dyn) : laneFromLevel(r.loud, r.rate, notes, dbPerDyn) }
}

/**
 * Dynamics from a level curve (dB, RATE): the level where notes sound
 * (attacks and the last 30 ms left out: the bow model makes its own), held
 * across the gaps between them, eased over 60 ms, dbPerDyn dB per unit of
 * performance.js's dynamic around mf (0.55).
 */
export function laneFromLevel(L, rate, notes, dbPerDyn = DB_PER_DYN) {
  const N = L.length, mask = new Uint8Array(N)
  for (const n of notes) for (let k = Math.round((n.on + 0.05) * rate); k < Math.round((n.off - 0.03) * rate); k++) if (k >= 0 && k < N) mask[k] = 1
  // a gap takes the level before it on its first half and the next note's on the second
  const dyn = new Float32Array(N)
  for (let k = 0; k < N;) {
    if (mask[k]) { dyn[k] = L[k]; k++; continue }
    let j = k; while (j < N && !mask[j]) j++
    const before = k ? dyn[k - 1] : j < N ? L[j] : 0, after = j < N ? L[j] : before
    for (let m = k; m < j; m++) dyn[m] = m - k < (j - k) / 2 ? before : after
    k = j
  }
  const a = 1 - Math.exp(-1 / (0.06 * rate))
  let y = dyn[0]
  for (let k = 0; k < N; k++) { y += (dyn[k] - y) * a; dyn[k] = Math.max(0.08, Math.min(1, 0.55 + y / dbPerDyn)) }
  return dyn
}

/**
 * Listen and correct, in place: move the lane by the difference between the
 * recording's level and the rendered one inside the notes (dB, its median
 * removed, averaged over ±0.15 s), as a player who hears a note come out too
 * soft plays it louder. recL / ourL: level curves (levelCurve, dB) in
 * performance time. Two passes bring the rendered notes' levels to r ≈ 0.8–0.95
 * with the recording's (strings/test/expression_ab.js).
 */
export function correctLane(dyn, recL, ourL, notes, { rate = RATE, dbPerDyn = 10 } = {}) {
  const N = dyn.length, d = new Float64Array(N), w = new Uint8Array(N)
  for (const n of notes) for (let k = Math.round((n.on + 0.05) * rate); k < Math.round((n.off - 0.03) * rate); k++) if (k >= 0 && k < N && k < ourL.length && k < recL.length) { d[k] = recL[k] - ourL[k]; w[k] = 1 }
  const ds = [...d].filter((_, k) => w[k]).sort((a, b) => a - b), off = ds[ds.length >> 1] || 0
  const H = Math.round(0.15 * rate), out = Float32Array.from(dyn)
  for (let k = 0; k < N; k++) {
    let s = 0, c = 0
    for (let j = Math.max(0, k - H); j <= Math.min(N - 1, k + H); j++) if (w[j]) { s += d[j] - off; c++ }
    if (c) out[k] = Math.max(0.08, Math.min(1, dyn[k] + s / c / dbPerDyn))
  }
  dyn.set(out)
  return dyn
}
