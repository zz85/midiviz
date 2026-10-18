// Shared by fit_body.js and build_nbody.js: our string's bridge force for one
// note, the harmonics of a recording and of a render, the observations
// recording − ours for every Iowa note, and the robust residual of a body
// model against them (strings/research/05_commercial_violins.md §4.1).
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { ViolinSynth, CurveSource, midiHz } from '../sound/bowed.js'
import { loadBankNode } from './hybrid-bank.js'
import { fft } from './audio-util.js'

export const SR = 48000, NF = 8192, FMAX = 12000
export const VEL = { pp: 0.35, mf: 0.68, ff: 0.95 }

export const median = a => { const s = Float64Array.from(a).sort(); return s.length ? s[s.length >> 1] : 0 }

/** Averaged Hann power spectrum of x[a, b). */
export function powerSpec(x, a, b) {
  const P = new Float64Array(NF / 2), w = new Float64Array(NF)
  for (let i = 0; i < NF; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF)
  let n = 0
  for (let o = a; o + NF <= b; o += NF / 2) {
    const re = new Float64Array(NF), im = new Float64Array(NF)
    for (let i = 0; i < NF; i++) re[i] = x[o + i] * w[i]
    fft(re, im)
    for (let k = 0; k < NF / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k]
    n++
  }
  for (let k = 0; k < NF / 2; k++) P[k] /= Math.max(1, n)
  return n ? P : null
}
/** Harmonic levels (dB) of f0 up to FMAX, with their SNR against the gaps between harmonics. */
export function harmonics(P, f0) {
  const bin = SR / NF, out = []
  for (let k = 1; k * f0 < FMAX; k++) {
    const c = k * f0 / bin, w = Math.max(2, c * 0.012)
    let m = Math.round(c)
    for (let j = Math.floor(c - w); j <= Math.ceil(c + w); j++) if (P[j] > P[m]) m = j
    let s = 0; for (let j = m - 2; j <= m + 2; j++) s += P[j] || 0
    const g = Math.round((k + 0.5) * f0 / bin), gw = Math.max(1, Math.round(0.15 * f0 / bin))
    const gap = []; for (let j = g - gw; j <= g + gw; j++) if (P[j] != null) gap.push(P[j])
    out.push({ k, f: k * f0, dB: 10 * Math.log10(s + 1e-30), snr: 10 * Math.log10(s / (5 * median(gap) + 1e-30)) })
  }
  return out
}
/** Harmonics k that sit in a notch (more than 10 dB under the median of k±2). */
export const notched = H => new Set(H.filter((h, i) => {
  const nb = H.slice(Math.max(0, i - 2), i + 3).map(x => x.dB)
  return h.dB < median(nb) - 10
}).map(h => h.k))

/** Our string's bridge force for one note on string s (no body, no EQ, no voicing). */
export function renderRaw(instrument, model, midi, s, vel, secs = 1.6, body = null) {
  const notes = [{ pitch: midi, on: 0.1, off: secs, velocity: vel }]
  fingerLine(notes, { instrument })
  const open = { violin: [55, 62, 69, 76], viola: [48, 55, 62, 69], cello: [36, 43, 50, 57] }[instrument]
  notes[0].string = s; notes[0].finger = midi === open[s] ? 0 : (notes[0].finger || 1)
  const perf = renderPerformance(notes, { instrument, style: { vibrato: 0, timing: 0, intonation: 0, variance: 0 } })
  const syn = new ViolinSynth(SR, { instrument, model, body: body ?? 'modal' })
  if (!body) {
    syn.body = { process(x, L, R, n) { L.set(x.subarray(0, n)); R.set(x.subarray(0, n)) }, reset() {} }
    syn.eq = { process() {}, reset() {} }
    syn.voicing = null
  }
  const src = new CurveSource(perf), N = Math.round((secs + 0.1) * SR), L = new Float32Array(N), R = new Float32Array(N)
  let t = 0
  for (let i = 0; i < N; i += 128) { const n = Math.min(128, N - i); t = syn.process(src, t, 1 / SR, L.subarray(i, i + n), R.subarray(i, i + n), n) }
  return L
}
export const helmholtz = (H) => H.length >= 3 && H[0].dB > H[1].dB - 3 && H[0].snr > 15

/** All observations for an instrument and model. */
export function collect(instrument, model, { quick = false } = {}) {
  const bank = loadBankNode(instrument)
  const rows = []
  let used = 0, skipped = 0
  for (const [key, pack] of Object.entries(bank.m.packs)) {
    const [s, dyn] = key.split('_'), x = bank.pcm[key]
    for (const m of pack.notes) {
      if (quick && m.midi % 3) continue
      const a = m.offset + m.attackEnd + Math.round(0.05 * SR), b = m.offset + Math.min(m.headEnd, m.attackEnd + Math.round(1.4 * SR))
      const Pi = powerSpec(x, a, b)
      if (!Pi) { skipped++; continue }
      const Hi = harmonics(Pi, m.f0)
      const y = renderRaw(instrument, model, m.midi, +s, VEL[dyn])
      const Po = powerSpec(y, Math.round(0.55 * SR), Math.round(1.55 * SR))
      const Ho = harmonics(Po, midiHz(m.midi))
      if (!helmholtz(Ho)) { skipped++; continue }
      const ni = notched(Hi), no = notched(Ho)
      const obs = []
      for (let j = 0; j < Math.min(Hi.length, Ho.length); j++) {
        const hi = Hi[j], ho = Ho[j]
        if (hi.snr < 12 || ho.snr < 12 || ni.has(hi.k) || no.has(ho.k)) continue
        obs.push({ k: hi.k, lf: Math.log2(hi.f), r: hi.dB - ho.dB })
      }
      if (obs.length < 3) { skipped++; continue }
      rows.push({ s: +s, dyn, midi: m.midi, f0: m.f0, obs })
      used++
    }
  }
  return { rows, used, skipped }
}

/** Robust spread (dB) of r − g − model over rows, g refit per row. */
export function spread(rows, pred) {
  const res = []
  for (const row of rows) {
    const e = row.obs.map(o => o.r - pred(row, o))
    const g = median(e)
    for (const v of e) res.push(Math.abs(v - g))
  }
  return { mad: median(res), p90: Float64Array.from(res).sort()[Math.floor(res.length * 0.9)] }
}
/**
 * The same observations through a body chain ('modal': Body + EQ + voicing;
 * or any ViolinSynth body option): its radiated − bridge-force level per
 * harmonic, as o.m, for spread().
 */
export function bodyResidual(instrument, model, rows, body = 'modal') {
  const out = []
  for (const row of rows) {
    const y = renderRaw(instrument, model, row.midi, row.s, VEL[row.dyn], 1.6, body)
    const Ho = harmonics(powerSpec(y, Math.round(0.55 * SR), Math.round(1.55 * SR)), midiHz(row.midi))
    const byK = new Map(Ho.map(h => [h.k, h.dB]))
    const raw = new Map(harmonics(powerSpec(renderRaw(instrument, model, row.midi, row.s, VEL[row.dyn]), Math.round(0.55 * SR), Math.round(1.55 * SR)), midiHz(row.midi)).map(h => [h.k, h.dB]))
    // the body's "B" for this observation: radiated − bridge force
    out.push({ ...row, obs: row.obs.filter(o => byK.has(o.k) && raw.has(o.k)).map(o => ({ ...o, m: byK.get(o.k) - raw.get(o.k) })) })
  }
  return out
}

export const actRms = L => { let s = 0, n = 0; for (let i = 0; i < L.length; i++) { const v = L[i] * L[i]; if (v > 1e-9) { s += v; n++ } } return Math.sqrt(s / Math.max(1, n)) }

