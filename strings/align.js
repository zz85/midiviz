// Score-to-audio alignment: where each note of a score is played in a
// recording, for recordings that come without an alignment (the Bach Violin
// Dataset's do; Wikimedia Commons and Library of Congress recordings do not).
//
// After Müller's chroma-based synchronisation (Fundamentals of Music
// Processing, ch. 3) with the onset features of Ewert, Müller & Grosche
// (ICASSP 2009, "decaying locally adaptive normalised chroma onsets"):
//   features  per 20 ms frame: chroma of a log-compressed pitch spectrogram
//             (50 Hz – 5 kHz, 93 ms windows; a 13th "silence" dimension), and chroma onsets
//             (the rise of each pitch's energy, folded to chroma); the score is
//             synthesised into the same features (each note with 4 harmonics),
//             at the tempo that makes it as long as the recording
//   coarse    subsequence DTW at 5 frames a second over the whole recording
//             (the recording may start and end with silence or applause), with
//             step sizes (1,1), (1,2), (2,1): tempo within ½–2× of the average
//             at any moment. Repeats: each way of taking the score's repeats
//             (strings/lilypond.js `repeats`) is aligned and the one that fits
//             best (lowest mean cost on its path) is kept
//   fine      the same DTW at 50 frames a second in a band of ±1.2 s around
//             the coarse path (moving each onset to the strongest rise of its
//             pitch's energy nearby did not help: strings/test/align_eval.js)
// Returns the performed notes in the order played (a repeat's notes twice) with
// their recorded times, and for each score note the first time it was played.
import { fft } from './sound/body.js'

const FPS = 50, COARSE = 10, BAND = 60, DEC = 0.7

const midiHz = m => 440 * 2 ** ((m - 69) / 12)

/** Log pitch energies (MIDI 33…108) every 1/FPS s, from x (mono, sr). */
export function pitchGram(x, sr) {
  const N = 2048, hop = Math.round(sr / FPS), frames = Math.max(1, Math.floor((x.length - N) / hop) + 1)
  const P0 = 33, P1 = 108, NP = P1 - P0 + 1
  const binPitch = new Int16Array(N / 2).fill(-1)
  for (let k = 1; k < N / 2; k++) { const f = k * sr / N; if (f < 50 || f > 5000) continue; const p = Math.round(69 + 12 * Math.log2(f / 440)); if (p >= P0 && p <= P1) binPitch[k] = p - P0 }
  const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)
  const E = new Float32Array(frames * NP), rms = new Float32Array(frames)
  const re = new Float64Array(N), im = new Float64Array(N)
  for (let f = 0; f < frames; f++) {
    const o = f * hop; let s = 0
    for (let i = 0; i < N; i++) { const v = x[o + i] || 0; re[i] = v * win[i]; im[i] = 0 }
    for (let i = N / 2 - hop; i < N / 2 + hop; i++) s += (x[o + i] || 0) ** 2
    rms[f] = s / (2 * hop)
    fft(re, im)
    for (let k = 1; k < N / 2; k++) if (binPitch[k] >= 0) E[f * NP + binPitch[k]] += re[k] * re[k] + im[k] * im[k]
  }
  let mx = 0; for (const v of E) if (v > mx) mx = v
  for (let i = 0; i < E.length; i++) E[i] = Math.log1p(1e4 * E[i] / (mx || 1))
  let rmx = 0; for (const v of rms) if (v > rmx) rmx = v
  // frame f is centred at t0 + f / FPS
  return { E, frames, NP, P0, t0: N / 2 / sr, rms: rms.map(v => 10 * Math.log10(v / (rmx || 1) + 1e-12)) }
}

/** Chroma (12 + silence) and chroma-onset (12 + constant) features, L2-normalised, from pitch energies. */
function features(E, frames, NP, P0, silent) {
  const C = new Float32Array(frames * 13), O = new Float32Array(frames * 13)
  for (let f = 0; f < frames; f++) {
    for (let p = 0; p < NP; p++) {
      const pc = (p + P0) % 12, v = E[f * NP + p]
      C[f * 13 + pc] += v
      if (f) O[f * 13 + pc] += Math.max(0, v - E[(f - 1) * NP + p])
    }
  }
  // onsets decay over ~100 ms (so a slightly early or late onset still meets its note)
  for (let f = 1; f < frames; f++) for (let c = 0; c < 12; c++) O[f * 13 + c] = Math.max(O[f * 13 + c], DEC * O[(f - 1) * 13 + c])
  let oMax = 0; for (const v of O) if (v > oMax) oMax = v
  for (let f = 0; f < frames; f++) {
    C[f * 13 + 12] = silent[f] ? 3 : 0
    O[f * 13 + 12] = 0.15 * oMax
    norm(C, f * 13); norm(O, f * 13)
  }
  return { C, O, frames }
}
const norm = (a, o) => { let s = 0; for (let i = 0; i < 13; i++) s += a[o + i] * a[o + i]; s = Math.sqrt(s) || 1; for (let i = 0; i < 13; i++) a[o + i] /= s }

/** The recording's features. */
export function audioFeatures(x, sr) {
  const g = pitchGram(x, sr)
  const silent = g.rms.map(v => v < -45)
  return { ...features(g.E, g.frames, g.NP, g.P0, silent), gram: g }
}

/** A score (notes with u = quarters in performed order, du) synthesised into features at spq seconds per quarter. */
function scoreFeatures(notes, spq, frames) {
  const NP = 76, P0 = 33, E = new Float32Array(frames * NP)
  const sounding = new Uint8Array(frames)
  for (const n of notes) {
    const f0 = Math.round(n.u * spq * FPS), f1 = Math.max(f0 + 1, Math.round((n.u + n.du) * spq * FPS))
    for (let h = 1; h <= 4; h++) {
      const p = Math.round(n.pitch + 12 * Math.log2(h)) - P0
      if (p < 0 || p >= NP) continue
      const w = 0.6 ** (h - 1)
      for (let f = Math.max(0, f0); f < Math.min(frames, f1); f++) E[f * NP + p] += w * (1 - 0.5 * Math.min(1, (f - f0) / (1.5 * FPS)))
    }
    for (let f = Math.max(0, f0); f < Math.min(frames, f1); f++) sounding[f] = 1
  }
  for (let i = 0; i < E.length; i++) E[i] = Math.log1p(4 * E[i])
  return features(E, frames, NP, P0, sounding.map(v => !v))
}

/** Average features over k frames (and renormalise). */
function pool({ C, O, frames }, k) {
  const n = Math.ceil(frames / k), C2 = new Float32Array(n * 13), O2 = new Float32Array(n * 13)
  for (let f = 0; f < frames; f++) { const g = Math.floor(f / k); for (let c = 0; c < 13; c++) { C2[g * 13 + c] += C[f * 13 + c]; O2[g * 13 + c] += O[f * 13 + c] } }
  for (let g = 0; g < n; g++) { norm(C2, g * 13); norm(O2, g * 13) }
  return { C: C2, O: O2, frames: n }
}

const W_ON = 0.7
const cost = (S, i, A, j) => {
  let c = 0, o = 0
  for (let k = 0; k < 13; k++) { c += S.C[i * 13 + k] * A.C[j * 13 + k]; o += S.O[i * 13 + k] * A.O[j * 13 + k] }
  return (1 - c) + W_ON * (1 - o)
}

/**
 * Subsequence DTW of score rows against audio columns, in a band (lo[i]…hi[i]
 * of audio frames per score row; the whole recording if omitted). Steps (1,1),
 * (1,2), (2,1). Returns { path: audio frame per score row, mean (cost per row) }.
 */
function dtw(S, A, lo = null, hi = null) {
  const N = S.frames, M = A.frames
  const L = i => lo ? Math.max(0, lo[i]) : 0, H = i => hi ? Math.min(M - 1, hi[i]) : M - 1
  const off = new Int32Array(N + 1); for (let i = 0; i < N; i++) off[i + 1] = off[i] + Math.max(0, H(i) - L(i) + 1)
  const D = new Float32Array(off[N]).fill(Infinity), B = new Uint8Array(off[N])
  const at = (i, j) => (i < 0 || j < L(i) || j > H(i)) ? Infinity : D[off[i] + j - L(i)]
  for (let i = 0; i < N; i++) {
    for (let j = L(i); j <= H(i); j++) {
      const c = cost(S, i, A, j)
      let best, b
      if (i === 0) { best = 0; b = 0 }
      else {
        const a1 = at(i - 1, j - 1), a2 = at(i - 2, j - 1), a3 = at(i - 1, j - 2)
        best = a1; b = 1
        if (a2 < best) { best = a2; b = 2 }
        if (a3 < best) { best = a3; b = 3 }
      }
      D[off[i] + j - L(i)] = c + best; B[off[i] + j - L(i)] = b
    }
  }
  let jEnd = L(N - 1); for (let j = L(N - 1); j <= H(N - 1); j++) if (at(N - 1, j) < at(N - 1, jEnd)) jEnd = j
  const path = new Float32Array(N).fill(NaN)
  let i = N - 1, j = jEnd, sum = 0, cells = 0
  while (i >= 0) {
    path[i] = j; sum += cost(S, i, A, j); cells++
    const b = B[off[i] + j - L(i)]
    if (b === 0 || !Number.isFinite(at(i, j))) break
    if (b === 1) { i--; j-- } else if (b === 2) { path[i - 1] = j - 0.5; i -= 2; j-- } else { i--; j -= 2 }
  }
  for (let k = 1; k < N; k++) if (!Number.isFinite(path[k])) path[k] = path[k - 1]
  return { path, mean: sum / cells, start: path[0], end: jEnd }
}

/**
 * The ways of playing a score's repeats: each a list of [q0, q1) segments in
 * performed order. repeats: [{ from, to, alts: [[q0, q1]…] }] (quarters);
 * end: the score's last quarter. Each repeat taken or not: all 2^R plans for
 * R ≤ 4; for more (a theme and variations: Caprice 24 has 12) every repeat
 * taken, none, and each one alone flipped from those two (2R + 2 plans), since
 * players mostly take all of them or none.
 */
export function repeatPlans(repeats, end) {
  const R = (repeats || []).filter(r => r.to > r.from + 1e-6)
  const all = 2 ** R.length - 1
  const masks = R.length <= 4 ? Array.from({ length: all + 1 }, (_, m) => m)
    : [0, all, ...R.map((_, k) => 1 << k), ...R.map((_, k) => all ^ (1 << k))]
  const plans = []
  for (const mask of masks) {
    const seg = []; let q = 0
    R.forEach((r, k) => {
      const on = Math.floor(mask / 2 ** k) % 2
      if (r.unfolded) {
        // written out in the score: taken is as written, not taken keeps one pass
        if (r.from > q) seg.push([q, r.from])
        if (on) seg.push([r.from, Math.min(r.to, end)]); else for (const [a, b] of r.keep) if (Math.min(b, end) > a) seg.push([a, Math.min(b, end)])
        q = Math.max(q, r.to)
        return
      }
      const to = Math.min(r.to, end), alts = r.alts.map(([a, b]) => [a, Math.min(b, end)]).filter(([a, b]) => b > a)
      const after = alts.length ? alts[alts.length - 1][1] : to
      if (r.from > q) seg.push([q, r.from])
      if (on) {
        seg.push([r.from, to]); if (alts[0]) seg.push(alts[0])
        seg.push([r.from, to]); if (alts.length > 1) seg.push(alts[alts.length - 1])
      } else { seg.push([r.from, to]); if (alts.length) seg.push(alts[alts.length - 1]) }
      q = Math.max(q, after)
    })
    if (end > q) seg.push([q, end + 1e-6])
    plans.push({ taken: R.map((_, k) => !!(Math.floor(mask / 2 ** k) % 2)), seg })
  }
  return plans
}

/** The score's notes as performed under a plan: { pitch, q, dq, u (performed quarters), du, k (score note index), pass }. */
export function unfold(notes, plan) {
  const out = []; let u = 0
  const seen = new Map()
  for (const [q0, q1] of plan.seg) {
    for (let k = 0; k < notes.length; k++) {
      const n = notes[k]
      if (n.q < q0 - 1e-6 || n.q >= q1 - 1e-6) continue
      const pass = seen.get(k) || 0; seen.set(k, pass + 1)
      out.push({ pitch: n.pitch, q: n.q, dq: n.dq, u: u + n.q - q0, du: Math.min(n.dq, q1 - n.q + 0.25), k, pass })
    }
    u += q1 - q0
  }
  return { notes: out.sort((a, b) => a.u - b.u || a.pitch - b.pitch), length: u }
}

/**
 * Align a score to a recording. notes: [{ pitch, q, dq }] (quarters, any
 * order); repeats as strings/lilypond.js gives them; x: mono samples at sr.
 * transpose: semitone shifts to try (the recording may sound higher or lower).
 * Returns { played: [{ pitch, q, k, pass, on, off }] in performed order,
 * first: per score note the index in played of its first performance (or −1),
 * plan (which repeats were taken), transpose (semitones it sounds from the
 * score), cost, coarse: [{ taken, transpose, cost }] }.
 */
export function alignScore(notes, x, sr, { repeats = [], audio = null, transpose = [0] } = {}) {
  const A = audio || audioFeatures(x, sr)
  const Ac = pool(A, COARSE)
  // where the music is: the recording's sounding span sets the average tempo
  const loud = A.gram.rms.map(v => v > -40)
  let a0 = loud.indexOf(true), a1 = loud.lastIndexOf(true); if (a0 < 0) { a0 = 0; a1 = A.frames - 1 }
  const end = Math.max(...notes.map(n => n.q + n.dq))
  // every way of taking the repeats, at every transposition asked for (an old
  // recording played back at the wrong speed, a different tuning)
  const results = repeatPlans(repeats, end).flatMap(plan => transpose.map(tr => {
    const U = unfold(notes, plan)
    if (tr) for (const n of U.notes) n.pitch += tr
    const spq = (a1 - a0) / FPS / U.length
    const SF = Math.max(2, Math.ceil(U.length * spq * FPS) + 1)
    const S = scoreFeatures(U.notes, spq, SF)
    const coarse = dtw(pool(S, COARSE), Ac)
    return { plan, U, spq, S, coarse, tr }
  }))
  results.sort((a, b) => a.coarse.mean - b.coarse.mean)
  const best = results[0]
  // fine: a band around the coarse path
  const { S, U, spq } = best, N = S.frames, lo = new Int32Array(N), hi = new Int32Array(N)
  for (let i = 0; i < N; i++) {
    const c = i / COARSE, k = Math.min(best.coarse.path.length - 1, Math.floor(c)), w = c - k
    const j = COARSE * (best.coarse.path[k] + ((best.coarse.path[k + 1] ?? best.coarse.path[k]) - best.coarse.path[k]) * w) + COARSE / 2
    lo[i] = Math.round(j - BAND); hi[i] = Math.round(j + BAND)
  }
  const fine = dtw(S, A, lo, hi)
  const tOf = u => { const f = u * spq * FPS, i = Math.max(0, Math.min(N - 1, Math.floor(f))), w = f - i; return A.gram.t0 + (fine.path[i] + ((fine.path[i + 1] ?? fine.path[i]) - fine.path[i]) * w) / FPS }
  const played = U.notes.map(n => ({ pitch: n.pitch - best.tr, q: n.q, k: n.k, pass: n.pass, on: tOf(n.u), off: tOf(n.u + n.du) }))
  const first = new Int32Array(notes.length).fill(-1)
  played.forEach((p, i) => { if (first[p.k] < 0) first[p.k] = i })
  return { played, first, plan: best.plan, transpose: best.tr, cost: fine.mean, coarse: results.map(r => ({ taken: r.plan.taken, transpose: r.tr, cost: +r.coarse.mean.toFixed(4) })) }
}
