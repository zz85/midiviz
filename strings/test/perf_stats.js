// How real violinists play long notes, against how #034 plays them: vibrato
// rate, width and onset, note-level spread and swells, measured on the Bach
// Violin Dataset's recordings at the notes aligned to them (ab_recording.js
// downloads it into strings/data/BachViolin/).
//
//   node strings/test/perf_stats.js [--recs=ko-donghwi_bwv1001_mov1,…] [--model=source] [--body=phil] [--style={"vibrato":1}]
//
// Per sustained single note (≥ 0.5 s, no other note sounding with it):
//   pitch    f0 every 10 ms (normalised difference function around the note's
//            pitch), cents from the note's own median, linear trend removed
//   vibrato  rate and width (half the swing, cents) of the strongest 3.5–9 Hz
//            component; onset delay = when the demodulated width first reaches
//            half its median; a note "has vibrato" when the width is ≥ 6 cents
//   level    frame RMS (dB): the note's level (median of its middle), its swell
//            (middle − ends) and slope (last third − first third)
// The same notes rendered by our engine (same timing, same hall) are measured
// the same way. Prints medians per recording and pooled, and the model's.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves, midiHz } from '../sound/bowed.js'
import { acousticParams, offlineHall } from '../../concertstage/acoustics.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const RECS = arg('recs', 'ko-donghwi_bwv1001_mov1,ko-donghwi_bwv1001_mov3,john-garner_bwv1002_mov1,john-garner_bwv1002_mov5,minji-kim_bwv1003_mov1,minji-kim_bwv1003_mov3,emil-telmanyi_bwv1001_mov1,emil-telmanyi_bwv1004_mov3').split(',')
const MODEL = arg('model', 'source'), BODY = arg('body', 'phil'), STYLE = JSON.parse(arg('style', '{}'))
const SR = 24000, HOP = 240, DIR = here + '../data/BachViolin/'
if (!existsSync(DIR + 'info.csv')) { console.error('run node strings/test/ab_recording.js first (it downloads the dataset)'); process.exit(1) }

const csv = f => readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(','))
const info = csv(DIR + 'info.csv'), H = info[0]
const hms = s => s.split(':').reduce((a, v) => a * 60 + +v, 0)
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }

/** f0 (Hz) at frame centre c, searching ±150 cents around f; null when unclear. */
function f0At(x, c, f) {
  const W = 1024, a = c - W / 2
  if (a < 0 || a + W + SR / (f * 0.9) >= x.length) return null
  const t0 = Math.floor(SR / (f * 2 ** (150 / 1200))), t1 = Math.ceil(SR / (f * 2 ** (-150 / 1200)))
  let e0 = 0; for (let i = a; i < a + W; i++) e0 += x[i] * x[i]
  if (e0 < 1e-8) return null
  const d = new Float64Array(t1 + 2)
  for (let t = t0 - 1; t <= t1 + 1; t++) { let s = 0, e1 = 0; for (let i = a; i < a + W; i++) { const u = x[i] - x[i + t]; s += u * u; e1 += x[i + t] * x[i + t] } d[t] = s / (e0 + e1) }
  let m = t0; for (let t = t0; t <= t1; t++) if (d[t] < d[m]) m = t
  if (d[m] > 0.35 || m === t0 || m === t1) return null
  const p = (d[m - 1] - d[m + 1]) / (2 * (d[m - 1] - 2 * d[m] + d[m + 1]))
  return SR / (m + p)
}
const frameDb = (x, c) => { let s = 0; for (let i = c - 240; i < c + 240; i++) s += (x[i] || 0) ** 2; return 10 * Math.log10(s / 480 + 1e-12) }

/** Stats of one note (times in s) in x. */
function noteStats(x, n) {
  const f = midiHz(n.pitch), a = n.on + 0.08, b = n.off - 0.08, cents = [], lv = []
  for (let t = a; t < b; t += HOP / SR) {
    const c = Math.round(t * SR), p = f0At(x, c, f)
    cents.push(p ? 1200 * Math.log2(p / f) : NaN); lv.push(frameDb(x, c))
  }
  const ok = cents.filter(Number.isFinite)
  if (ok.length < 30 || ok.length < 0.7 * cents.length) return null
  // fill gaps, remove the median and a linear trend
  const med = median(ok); let last = med
  const y = cents.map(v => (Number.isFinite(v) ? (last = v) : last) - med)
  const N = y.length, mx = (N - 1) / 2; let sxy = 0, sxx = 0
  y.forEach((v, i) => { sxy += (i - mx) * v; sxx += (i - mx) ** 2 }); const k = sxy / sxx
  const z = y.map((v, i) => v - k * (i - mx))
  // strongest 3.5–9 Hz component
  const fs = SR / HOP
  let best = { A: 0, r: 0 }
  for (let r = 3.5; r <= 9; r += 0.05) {
    let re = 0, im = 0
    for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)), ph = 2 * Math.PI * r * i / fs; re += w * z[i] * Math.cos(ph); im -= w * z[i] * Math.sin(ph) }
    const A = 4 * Math.hypot(re, im) / N           // Hann window: ×2 for its mean of 0.5
    if (A > best.A) best = { A, r }
  }
  // onset: demodulate at the rate, smooth 0.2 s, first time at half the median width
  let delay = NaN
  if (best.A >= 6) {
    const L = Math.round(0.2 * fs), env = []
    for (let i = 0; i < N; i++) { let re = 0, im = 0, c = 0; for (let j = Math.max(0, i - L); j <= Math.min(N - 1, i + L); j++) { const ph = 2 * Math.PI * best.r * j / fs; re += z[j] * Math.cos(ph); im += z[j] * Math.sin(ph); c++ } env.push(2 * Math.hypot(re, im) / c) }
    const half = median(env) / 2, i0 = env.findIndex(v => v >= half)
    delay = i0 >= 0 ? 0.08 + i0 / fs : NaN
  }
  const third = Math.max(1, Math.floor(lv.length / 3))
  const mean = v => v.reduce((p, q) => p + q, 0) / v.length
  const first = mean(lv.slice(0, third)), mid = mean(lv.slice(third, 2 * third)), end = mean(lv.slice(-third))
  return { dur: n.off - n.on, rate: best.r, width: best.A, vib: best.A >= 6, delay, level: median(lv.slice(third, 2 * third)), swell: mid - (first + end) / 2, slope: end - first }
}

/** Long single notes of a recording and their aligned times. */
function loadRec(rec) {
  const row = info.find(r => r[0] === rec), I = Object.fromEntries(H.map((k, i) => [k, row[i]]))
  const notes = csv(DIR + `notes/${I.collection}/${rec}.csv`).slice(1), al = csv(DIR + `alignments/${I.collection}/${rec}.csv`).slice(1)
  const all = notes.map((n, i) => ({ pitch: +n[2], on: +al[i][0], off: +al[i][1], velocity: 0.7 }))
  // baroque tuning (A = 415): the recording sounds a semitone low
  const tune = I.baroque_tuning === '1' ? -1 : 0
  return { I, all, tune }
}
const single = all => all.filter(n => n.off - n.on >= 0.5 && !all.some(m => m !== n && m.on < n.off - 0.02 && m.off > n.on + 0.02))

function summary(st) {
  const v = st.filter(s => s.vib), long = st.filter(s => s.dur >= 0.8 && s.vib)
  const levels = st.map(s => s.level), mL = median(levels)
  return {
    notes: st.length, vibShare: v.length / st.length,
    rate: median(v.map(s => s.rate)), width: median(v.map(s => s.width)), widthLong: median(long.map(s => s.width)),
    delay: median(v.map(s => s.delay)),
    spread: median(levels.map(l => Math.abs(l - mL))) * 1.4826, swell: median(st.map(s => s.swell)), slope: median(st.map(s => s.slope)),
  }
}
const fmt = s => `${String(s.notes).padStart(3)} notes, vibrato on ${(100 * s.vibShare).toFixed(0).padStart(3)} %, rate ${s.rate.toFixed(2)} Hz, width ±${s.width.toFixed(1)} c (long ±${(s.widthLong || NaN).toFixed(1)}), onset ${s.delay.toFixed(2)} s, level spread ${s.spread.toFixed(1)} dB, swell ${s.swell.toFixed(1)} dB, slope ${s.slope.toFixed(1)} dB`

const pooled = { rec: [], ours: [] }
for (const rec of RECS) {
  const { I, all, tune } = loadRec(rec)
  const t0 = hms(I.start), dur = hms(I.end) - t0
  const b = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(dur), '-i', DIR + `audio/${I.collection}/${I.source_filename}`, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4)
  const longs = single(all)
  const recSt = longs.map(n => noteStats(x, { ...n, pitch: n.pitch + tune })).filter(Boolean)
  // ours: the whole movement (chords thinned to two notes), at the recording's timing
  const play = all.slice().sort((a, b) => a.on - b.on || b.pitch - a.pitch), thin = []
  for (let i = 0; i < play.length;) { let j = i; while (j < play.length && play[j].on - play[i].on < 0.03) j++; thin.push(...play.slice(i, j).slice(0, 2)); i = j }
  const notes = thin.map(n => ({ ...n }))
  fingerLine(notes, { instrument: 'violin' })
  const perf = renderPerformance(notes, { instrument: 'violin', seed: 7, style: STYLE })
  const [L, R] = renderCurves(perf, { sampleRate: SR, model: MODEL, params: { body: BODY }, tail: 1 })
  const P = new Float32Array(2 * L.length); P.set(L, 0); P.set(R, L.length)
  offlineHall(acousticParams({ room: 'recital', seat: 'front' }), SR)(P, L.length)
  const y = P.subarray(0, L.length)
  const ourSt = longs.map(n => noteStats(y, n)).filter(Boolean)
  pooled.rec.push(...recSt); pooled.ours.push(...ourSt)
  console.log(`${rec} (${I.violinist_name}, ${I.movement})\n  recording ${fmt(summary(recSt))}\n  ours      ${fmt(summary(ourSt))}`)
}
console.log(`\npooled\n  recordings ${fmt(summary(pooled.rec))}\n  ours (${MODEL}+${BODY}) ${fmt(summary(pooled.ours))}`)
