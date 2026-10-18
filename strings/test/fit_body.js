// Estimate the body of the violin, viola and cello from the University of Iowa
// recordings, for #034's physical models (strings/sound/body.js, research 05 §4.1a).
//
//   node strings/test/fit_body.js [--instrument=violin] [--model=waveguide] [--quick]
//
// Needs the Iowa banks (strings/sound/samples/iowa, see build_iowa.js) and ffmpeg.
//
// Every Iowa recording is a steady, non-vibrato note on a known string at a
// known dynamic. Our string plays the same note on the same string at that
// dynamic, and its bridge force (before any body) is measured the same way.
// For each harmonic k, the level difference recording − ours is the body's
// response at k·f0, plus a per-note level. Chromatic notes on four strings
// put harmonics everywhere from the lowest note to 12 kHz, so the pooled
// differences trace the body densely, as Tommasini & Lucato's 2004 patent and
// Pérez Carrillo et al. (JASA 2011) do with glissandi:
//
//   r(n, k) = g(n) + s(dyn)·log2 k + B(k·f0)
//
// solved by alternating robust estimates: g per note (median), s per dynamic
// layer (a brightness difference between their bow and ours, mean zero), and
// B by kernel regression on a 1/48-octave grid (σ = 1/40 octave), trimming
// residuals beyond 2.5 MAD. Harmonics in a notch of either spectrum (bow
// position, |dB below the local trend| > 10) and below the noise are dropped,
// as are notes our string does not play in Helmholtz motion.
//
// Validated by 2-fold cross-validation over notes (even / odd semitones): the
// held-out harmonic residual is compared with the same residual for the modal
// body (bowed.js Body + the fitted EQ and voicing in tone.js). The second ear
// gets the same curve with ±1.5 dB of smooth seeded ripple above 800 Hz, for
// stereo width. Writes strings/sound/body-iowa.js.
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { ViolinSynth, CurveSource, midiHz } from '../sound/bowed.js'
import { ConvBody } from '../sound/body.js'
import { loadBankNode, hasBank, hasFfmpeg } from './hybrid-bank.js'
import { fft } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const INSTS = arg('instrument', 'violin,viola,cello').split(',')
const MODELS = arg('model', 'waveguide,source').split(',')
const QUICK = process.argv.includes('--quick')
const SR = 48000, NF = 8192, FMAX = 12000
const GRID = { from: 60, step: 1 / 48, to: 16000 }
const SIG = 1 / 40
const VEL = { pp: 0.35, mf: 0.68, ff: 0.95 }
if (!hasFfmpeg()) { console.error('needs ffmpeg'); process.exit(1) }

const median = a => { const s = Float64Array.from(a).sort(); return s.length ? s[s.length >> 1] : 0 }

/** Averaged Hann power spectrum of x[a, b). */
function powerSpec(x, a, b) {
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
function harmonics(P, f0) {
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
const notched = H => new Set(H.filter((h, i) => {
  const nb = H.slice(Math.max(0, i - 2), i + 3).map(x => x.dB)
  return h.dB < median(nb) - 10
}).map(h => h.k))

/** Our string's bridge force for one note on string s (no body, no EQ, no voicing). */
function renderRaw(instrument, model, midi, s, vel, secs = 1.6, body = null) {
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
const helmholtz = (H) => H.length >= 3 && H[0].dB > H[1].dB - 3 && H[0].snr > 15

/** All observations for an instrument and model. */
function collect(instrument, model) {
  const bank = loadBankNode(instrument)
  const rows = []
  let used = 0, skipped = 0
  for (const [key, pack] of Object.entries(bank.m.packs)) {
    const [s, dyn] = key.split('_'), x = bank.pcm[key]
    for (const m of pack.notes) {
      if (QUICK && m.midi % 3) continue
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

const G0 = Math.log2(GRID.from), NG = Math.ceil((Math.log2(GRID.to) - G0) / GRID.step) + 1
/** Fit B (grid dB), g per row, s per dynamic. */
function fit(rows) {
  const B = new Float64Array(NG), S = { pp: 0, mf: 0, ff: 0 }
  const Bat = lf => { const x = (lf - G0) / GRID.step, i = Math.max(0, Math.min(NG - 2, Math.floor(x))), t = Math.max(0, Math.min(1, x - i)); return B[i] + (B[i + 1] - B[i]) * t }
  let cut = Infinity
  for (let it = 0; it < 25; it++) {
    for (const row of rows) row.g = median(row.obs.map(o => o.r - Bat(o.lf) - S[row.dyn] * Math.log2(o.k)))
    // per-dynamic brightness, mean zero
    for (const d of Object.keys(S)) {
      let sxy = 0, sxx = 0
      for (const row of rows) if (row.dyn === d) for (const o of row.obs) { const e = o.r - row.g - Bat(o.lf), lk = Math.log2(o.k); if (Math.abs(e - S[d] * lk) < cut) { sxy += e * lk; sxx += lk * lk } }
      S[d] = sxx ? sxy / sxx : 0
    }
    const mS = (S.pp + S.mf + S.ff) / 3; for (const d of Object.keys(S)) S[d] -= mS
    // kernel regression on the grid
    const num = new Float64Array(NG), den = new Float64Array(NG), res = []
    for (const row of rows) for (const o of row.obs) {
      const e = o.r - row.g - S[row.dyn] * Math.log2(o.k)
      const old = e - Bat(o.lf)
      res.push(Math.abs(old))
      if (Math.abs(old) > cut) continue
      const c = (o.lf - G0) / GRID.step, R = Math.ceil(3 * SIG / GRID.step)
      for (let i = Math.max(0, Math.floor(c) - R); i <= Math.min(NG - 1, Math.ceil(c) + R); i++) {
        const w = Math.exp(-0.5 * ((i - c) * GRID.step / SIG) ** 2); num[i] += w * e; den[i] += w
      }
    }
    cut = 2.5 * 1.4826 * median(res)
    // bins with little data: interpolate from their neighbours
    const ok = i => den[i] > 0.5
    for (let i = 0; i < NG; i++) B[i] = ok(i) ? num[i] / den[i] : NaN
    let first = B.findIndex(v => !isNaN(v)), last = NG - 1; while (isNaN(B[last])) last--
    for (let i = 0; i < first; i++) B[i] = B[first]
    for (let i = last + 1; i < NG; i++) B[i] = B[last]
    for (let i = first; i <= last; i++) if (isNaN(B[i])) { let j = i; while (isNaN(B[j])) j++; for (let q = i; q < j; q++) B[q] = B[i - 1] + (B[j] - B[i - 1]) * (q - i + 1) / (j - i + 1); i = j }
    fit.lo = 2 ** (G0 + first * GRID.step); fit.hi = 2 ** (G0 + last * GRID.step)
  }
  return { B, S, Bat, lo: fit.lo, hi: fit.hi }
}
/** Robust spread (dB) of r − g − model over rows, g refit per row. */
function spread(rows, pred) {
  const res = []
  for (const row of rows) {
    const e = row.obs.map(o => o.r - pred(row, o))
    const g = median(e)
    for (const v of e) res.push(Math.abs(v - g))
  }
  return { mad: median(res), p90: Float64Array.from(res).sort()[Math.floor(res.length * 0.9)] }
}
/** The same observations through the modal body chain (Body + EQ + voicing): its residual as a model. */
function modalResidual(instrument, model, rows) {
  const out = []
  for (const row of rows) {
    const y = renderRaw(instrument, model, row.midi, row.s, VEL[row.dyn], 1.6, 'modal')
    const Ho = harmonics(powerSpec(y, Math.round(0.55 * SR), Math.round(1.55 * SR)), midiHz(row.midi))
    const byK = new Map(Ho.map(h => [h.k, h.dB]))
    const raw = new Map(harmonics(powerSpec(renderRaw(instrument, model, row.midi, row.s, VEL[row.dyn]), Math.round(0.55 * SR), Math.round(1.55 * SR)), midiHz(row.midi)).map(h => [h.k, h.dB]))
    // modal "B" for this observation: radiated − bridge force
    out.push({ ...row, obs: row.obs.filter(o => byK.has(o.k) && raw.has(o.k)).map(o => ({ ...o, m: byK.get(o.k) - raw.get(o.k) })) })
  }
  return out
}

function ripple(seed) {
  let a = seed >>> 0
  const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const w = Array.from({ length: NG }, () => R() - 0.5)
  const sm = w.map((_, i) => { let s = 0, n = 0; for (let j = i - 8; j <= i + 8; j++) if (w[j] != null) { s += w[j]; n++ } return s / n })
  const sd = Math.sqrt(sm.reduce((x, y) => x + y * y, 0) / NG)
  return sm.map((v, i) => { const f = 2 ** (G0 + i * GRID.step); return f < 800 ? 0 : 1.5 * v / sd * Math.min(1, (f - 800) / 800) })
}
const actRms = L => { let s = 0, n = 0; for (let i = 0; i < L.length; i++) { const v = L[i] * L[i]; if (v > 1e-9) { s += v; n++ } } return Math.sqrt(s / Math.max(1, n)) }

const OUT = here + '../sound/body-iowa.js'
const data = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8').match(/BODY_IOWA = (\{[\s\S]*\})\n/)?.[1] ?? '{}') : {}
for (const instrument of INSTS) {
  if (!hasBank(instrument)) { console.warn(`no ${instrument} bank`); continue }
  for (const model of MODELS) {
    const t0 = Date.now()
    const { rows, used, skipped } = collect(instrument, model)
    const nObs = rows.reduce((a, r) => a + r.obs.length, 0)
    // cross-validation: fit on even semitones, test on odd, and back
    const cv = []
    for (const p of [0, 1]) {
      const tr = rows.filter(r => r.midi % 2 === p), te = rows.filter(r => r.midi % 2 !== p)
      const F = fit(tr)
      cv.push(spread(te, (row, o) => F.Bat(o.lf) + F.S[row.dyn] * Math.log2(o.k)))
    }
    const modal = spread(modalResidual(instrument, model, rows.filter((r, i) => !QUICK || i % 2 === 0)), (row, o) => o.m)
    const F = fit(rows)
    const dB0 = Array.from(F.B, v => Math.round(v * 100) / 100)
    const rp = ripple(instrument.length * 977 + model.length)
    const spec = { from: GRID.from, step: GRID.step, lo: Math.round(F.lo), hi: Math.round(Math.min(F.hi, FMAX)), gainDb: 0, dB: [dB0, dB0.map((v, i) => Math.round((v + rp[i]) * 100) / 100)] }
    // level: match the modal body chain on a few mezzo-forte notes
    const open = { violin: [55, 62, 69, 76], viola: [48, 55, 62, 69], cello: [36, 43, 50, 57] }[instrument]
    let gm = 0, gi = 0
    for (let s = 0; s < 4; s++) for (const d of [2, 5, 9]) {
      gm += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, 'modal').subarray(0.5 * SR))
      gi += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, spec).subarray(0.5 * SR))
    }
    spec.gainDb = Math.round(20 * Math.log10(gm / gi) * 100) / 100
    spec.stats = { notes: used, skipped, harmonics: nObs, heldOutMad: +((cv[0].mad + cv[1].mad) / 2).toFixed(2), heldOutP90: +((cv[0].p90 + cv[1].p90) / 2).toFixed(2), modalMad: +modal.mad.toFixed(2), modalP90: +modal.p90.toFixed(2), brightness: Object.fromEntries(Object.entries(F.S).map(([k, v]) => [k, +v.toFixed(2)])) }
    ;(data[instrument] ??= {})[model] = spec
    console.log(`${instrument} ${model}: ${used} notes (${skipped} skipped), ${nObs} harmonics, ${F.lo.toFixed(0)}–${F.hi.toFixed(0)} Hz; held-out residual ${spec.stats.heldOutMad} dB median / ${spec.stats.heldOutP90} p90 (modal body ${spec.stats.modalMad} / ${spec.stats.modalP90}); dyn brightness dB/oct ${JSON.stringify(spec.stats.brightness)}; level ${spec.gainDb} dB; ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  }
}
writeFileSync(OUT, `// Generated by strings/test/fit_body.js from the University of Iowa recordings. Do not edit.
// Per instrument and model: { from, step (octaves), lo, hi (Hz, the fitted range), gainDb, dB: [ear 0, ear 1], stats }.
export const BODY_IOWA = ${JSON.stringify(data)}
`)
console.log('wrote', OUT)
