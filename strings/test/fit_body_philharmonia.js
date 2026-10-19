// Estimate the violin, viola and cello bodies from the Philharmonia Orchestra
// sound samples, for #034's physical models: Timbre → Body → Measured
// (Philharmonia), a second set of real instruments next to the Iowa ones
// (fit_body.js; research 05 §5).
//
//   node strings/test/fit_body_philharmonia.js [--instrument=violin,viola,cello]
//        [--model=source,waveguide] [--quick]
//
// The Philharmonia samples (https://philharmonia.co.uk/resources/sound-samples/)
// are free to use, but must not be made available "as is", so the 171 MB
// Strings.zip is downloaded once into the git-ignored strings/data/Philharmonia/
// and only the derived body curves (strings/sound/body-philharmonia.js) are
// committed. Needs ffmpeg (the samples are MP3).
//
// Same model as fit_body.js:  r = g + s(dyn)·log2 k + B(k·f)  (recorded − our
// string, per harmonic), with two differences forced by the data:
//
//   vibrato   the sustained "arco-normal" notes are played with vibrato, so a
//             note is cut into short frames (≥ 8 periods, ≥ 43 ms) and each
//             frame's f0 is measured from its first harmonics. As the pitch
//             swings, every harmonic sweeps across the body response and
//             samples it at a slightly different frequency: the idea of the
//             2004 Tommasini–Lucato patent. Each frame is one row (its own
//             level g), compared with our string played without vibrato.
//   string    which string each note was played on is not given; our
//             fingering's choice for a held note stands in for it.
//
// Validated as fit_body.js is (2-fold cross-validation by semitone), and
// crossed with the Iowa data: the Iowa body predicting the Philharmonia notes,
// and this body predicting the Iowa notes.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine, parseNote, INSTRUMENTS } from '../fingering.js'
import { midiHz } from '../sound/bowed.js'
import { curveDb } from '../sound/body.js'
import { BODY_IOWA } from '../sound/body-iowa.js'
import { hasBank, hasFfmpeg } from './hybrid-bank.js'
import { SR, FMAX, GRID, median, notched, renderRaw, powerSpec, harmonics, helmholtz, collect, spread, actRms, fit, ripple } from './body-eval.js'
import { fft } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const INSTS = arg('instrument', 'violin,viola,cello').split(',')
const MODELS = arg('model', 'source,waveguide').split(',')
const QUICK = process.argv.includes('--quick')
const DIR = here + '../data/Philharmonia/'
const ZIP = 'https://philharmonia-assets.s3-eu-west-1.amazonaws.com/uploads/2020/02/12112005/Strings.zip'
const OUT = here + '../sound/body-philharmonia.js'
if (!hasFfmpeg()) { console.error('needs ffmpeg'); process.exit(1) }

// dynamics: velocity for our string, and the three brightness classes of fit()
const DYN = {
  pianissimo: [0.3, 'pp'], piano: [0.45, 'pp'], 'mezzo-piano': [0.55, 'mf'],
  'mezzo-forte': [0.68, 'mf'], forte: [0.82, 'ff'], fortissimo: [0.95, 'ff'],
}

async function ensureSamples() {
  if (INSTS.every(i => existsSync(DIR + 'Strings/' + i))) return
  mkdirSync(DIR, { recursive: true })
  const zip = DIR + 'Strings.zip'
  if (!existsSync(zip)) {
    console.log(`downloading ${ZIP} (171 MB)…`)
    const r = await fetch(ZIP)
    if (!r.ok) throw new Error(`${ZIP}: ${r.status}`)
    writeFileSync(zip, Buffer.from(await r.arrayBuffer()))
  }
  execFileSync('unzip', ['-o', '-q', zip, ...INSTS.map(i => `Strings/${i}/*`), '-d', DIR])
}

/** The sustained notes: arco-normal, 1.5 s (or 1 s where no 1.5 s take exists). */
function listNotes(instrument) {
  const files = readdirSync(DIR + 'Strings/' + instrument)
  const pick = new Map()
  for (const f of files) {
    const m = f.match(new RegExp(`^${instrument}_([A-G]s?\\d)_(15|1)_([a-z-]+)_arco-normal\\.mp3$`))
    if (!m || !DYN[m[3]]) continue
    const key = m[1] + '_' + m[3], prev = pick.get(key)
    if (!prev || m[2] === '15') pick.set(key, { file: f, midi: parseNote(m[1]), dyn: m[3] })
  }
  return [...pick.values()].sort((a, b) => a.midi - b.midi)
}

const decode = path => {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 })
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4)
}

/** Sustain of a recorded note: from 0.12 s after it reaches −6 dB of its top level to 0.1 s before it falls under −10 dB. */
function sustain(x) {
  const H = 2400, env = []
  for (let o = 0; o + H <= x.length; o += H) { let s = 0; for (let i = o; i < o + H; i++) s += x[i] * x[i]; env.push(Math.sqrt(s / H)) }
  const top = Float64Array.from(env).sort()[Math.floor(env.length * 0.8)]
  const a = env.findIndex(v => v > top * 0.5)
  let b = env.length - 1; while (b > a && env[b] < top * 0.316) b--
  return [Math.round((a * H) + 0.12 * SR), Math.round((b + 1) * H - 0.1 * SR)]
}

/** Frame-by-frame harmonics of a recording with vibrato: [{ f0, H }]. */
function frameHarmonics(x, a, b, f0n) {
  let N = 2048; while (N < 8 * SR / f0n) N *= 2
  const bin = SR / N, w = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N))
  const out = []
  for (let o = a; o + N <= b; o += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N)
    for (let i = 0; i < N; i++) re[i] = x[o + i] * w[i]
    fft(re, im)
    const P = new Float64Array(N / 2)
    for (let k = 0; k < N / 2; k++) P[k] = re[k] * re[k] + im[k] * im[k]
    // f0 of this frame: power-weighted mean of the first four harmonic peaks (parabolic)
    let num = 0, den = 0
    for (let k = 1; k <= 4 && k * f0n * 1.04 < SR / 2; k++) {
      const lo = Math.floor(k * f0n * 0.96 / bin), hi = Math.ceil(k * f0n * 1.04 / bin)
      let m = lo; for (let j = lo; j <= hi; j++) if (P[j] > P[m]) m = j
      const l = Math.log(P[m - 1] + 1e-30), c = Math.log(P[m] + 1e-30), r = Math.log(P[m + 1] + 1e-30)
      const d = (l - 2 * c + r) ? 0.5 * (l - r) / (l - 2 * c + r) : 0
      num += P[m] * (m + d) * bin / k; den += P[m]
    }
    const f0 = num / den
    // (a silent frame or a degenerate peak gives NaN or ≤ 0: the comparison must reject it)
    if (!(f0 > 0) || !(Math.abs(1200 * Math.log2(f0 / f0n)) <= 60)) continue
    // harmonic levels with SNR, as body-eval harmonics() but on this frame's grid
    const H = []
    for (let k = 1; k * f0 < FMAX; k++) {
      const c = k * f0 / bin, hw = Math.max(2, c * 0.012)
      let m = Math.round(c)
      for (let j = Math.floor(c - hw); j <= Math.ceil(c + hw); j++) if (P[j] > P[m]) m = j
      let s = 0; for (let j = m - 2; j <= m + 2; j++) s += P[j] || 0
      const g = Math.round((k + 0.5) * f0 / bin), gw = Math.max(1, Math.round(0.15 * f0 / bin))
      const gap = []; for (let j = g - gw; j <= g + gw; j++) if (P[j] != null) gap.push(P[j])
      H.push({ k, f: k * f0, dB: 10 * Math.log10(s + 1e-30), snr: 10 * Math.log10(s / (5 * median(gap) + 1e-30)) })
    }
    out.push({ f0, H })
  }
  return out
}

/** Observations (one row per frame) for an instrument and model. */
function collectPhil(instrument, model) {
  const notes = listNotes(instrument).filter((n, i) => !QUICK || i % 3 === 0)
  const ours = new Map()
  const rows = []
  let used = 0, skipped = 0
  for (const n of notes) {
    const [vel, cls] = DYN[n.dyn]
    const fl = [{ pitch: n.midi, on: 0, off: 1.5, velocity: vel }]
    fingerLine(fl, { instrument })
    const s = fl[0].string
    if (s == null) { skipped++; continue }
    const key = `${n.midi}_${s}_${vel}`
    if (!ours.has(key)) {
      const y = renderRaw(instrument, model, n.midi, s, vel)
      const Ho = harmonics(powerSpec(y, Math.round(0.55 * SR), Math.round(1.55 * SR)), midiHz(n.midi))
      ours.set(key, helmholtz(Ho) ? { H: Ho, notch: notched(Ho) } : null)
    }
    const o = ours.get(key)
    if (!o) { skipped++; continue }
    const x = decode(DIR + `Strings/${instrument}/` + n.file)
    const [a, b] = sustain(x)
    if (b - a < 0.4 * SR) { skipped++; continue }
    let frames = frameHarmonics(x, a, b, midiHz(n.midi))
    if (frames.length < 3) { skipped++; continue }
    if (frames.length > 14) frames = frames.filter((_, i) => i % Math.ceil(frames.length / 14) === 0)
    let got = 0
    for (const fr of frames) {
      const ni = notched(fr.H), obs = []
      for (let j = 0; j < Math.min(fr.H.length, o.H.length); j++) {
        const hi = fr.H[j], ho = o.H[j]
        if (hi.snr < 12 || ho.snr < 12 || ni.has(hi.k) || o.notch.has(ho.k)) continue
        obs.push({ k: hi.k, lf: Math.log2(hi.f), r: hi.dB - ho.dB })
      }
      if (obs.length >= 3) { rows.push({ s, dyn: cls, midi: n.midi, f0: fr.f0, obs }); got++ }
    }
    if (got) used++; else skipped++
  }
  return { rows, used, skipped, files: notes.length }
}

const curvePred = (spec, S) => (row, o) => curveDb(spec, spec.dB[0], 2 ** o.lf) + (S?.[row.dyn] ?? 0) * Math.log2(o.k)

await ensureSamples()
const data = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8').match(/BODY_PHIL = (\{[\s\S]*\})\n/)?.[1] ?? '{}') : {}
for (const instrument of INSTS) {
  for (const model of MODELS) {
    const t0 = Date.now()
    const { rows, used, skipped, files } = collectPhil(instrument, model)
    const nObs = rows.reduce((a, r) => a + r.obs.length, 0)
    // cross-validation by semitone, as fit_body.js
    const cv = []
    for (const p of [0, 1]) {
      const tr = rows.filter(r => r.midi % 2 === p), te = rows.filter(r => r.midi % 2 !== p)
      const F = fit(tr)
      cv.push(spread(te, (row, o) => F.Bat(o.lf) + F.S[row.dyn] * Math.log2(o.k)))
    }
    const F = fit(rows)
    const dB0 = Array.from(F.B, v => Math.round(v * 100) / 100)
    const rp = ripple(instrument.length * 1213 + model.length + 5)
    const spec = { id: `phil-${instrument}-${model}`, from: GRID.from, step: GRID.step, lo: Math.round(F.lo), hi: Math.round(Math.min(F.hi, FMAX)), gainDb: 0, dB: [dB0, dB0.map((v, i) => Math.round((v + rp[i]) * 100) / 100)] }
    // crossed: the Iowa body on these notes, and this body on the Iowa notes
    const iowa = BODY_IOWA[instrument]?.[model]
    const flat = spread(rows, () => 0)
    const iowaOnPhil = iowa ? spread(rows, curvePred(iowa, iowa.stats?.brightness)) : null
    let philOnIowa = null, iowaOnIowa = null
    if (iowa && hasBank(instrument)) {
      const { rows: ir } = collect(instrument, model, { quick: true })
      philOnIowa = spread(ir, curvePred(spec, F.S))
      iowaOnIowa = spread(ir, curvePred(iowa, iowa.stats?.brightness))
    }
    // level: match the Iowa body (the default) on mezzo-forte notes
    const open = INSTRUMENTS[instrument].open
    let gi = 0, gp = 0
    for (let s = 0; s < 4; s++) for (const d of [2, 5, 9]) {
      gi += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, iowa ? 'iowa' : 'modal').subarray(0.5 * SR))
      gp += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, spec).subarray(0.5 * SR))
    }
    spec.gainDb = Math.round(20 * Math.log10(gi / gp) * 100) / 100
    const r2 = v => v && { mad: +v.mad.toFixed(2), p90: +v.p90.toFixed(2) }
    spec.stats = {
      files, notes: used, skipped, frames: rows.length, harmonics: nObs,
      heldOut: { mad: +((cv[0].mad + cv[1].mad) / 2).toFixed(2), p90: +((cv[0].p90 + cv[1].p90) / 2).toFixed(2) },
      flat: r2(flat), iowaOnPhil: r2(iowaOnPhil), philOnIowa: r2(philOnIowa), iowaOnIowa: r2(iowaOnIowa),
      brightness: Object.fromEntries(Object.entries(F.S).map(([k, v]) => [k, +v.toFixed(2)])),
    }
    ;(data[instrument] ??= {})[model] = spec
    const fmt = v => v ? `${v.mad.toFixed(2)} / ${v.p90.toFixed(2)}` : '—'
    console.log(`${instrument} ${model}: ${used} of ${files} notes (${skipped} skipped), ${rows.length} frames, ${nObs} harmonics, ${F.lo.toFixed(0)}–${F.hi.toFixed(0)} Hz, level ${spec.gainDb} dB, ${((Date.now() - t0) / 1000).toFixed(0)} s
  Philharmonia notes: this body held out ${fmt(spec.stats.heldOut)}, Iowa body ${fmt(iowaOnPhil)}, no body ${fmt(flat)}  (dB, median / p90)
  Iowa notes:         this body ${fmt(philOnIowa)}, Iowa body (fitted on them) ${fmt(iowaOnIowa)}`)
    writeFileSync(OUT, `// Generated by strings/test/fit_body_philharmonia.js from the Philharmonia Orchestra sound samples. Do not edit.
// Per instrument and model: { id, from, step (octaves), lo, hi (Hz, the fitted range), gainDb, dB: [ear 0, ear 1], stats }.
// A model missing here plays the Iowa body.
export const BODY_PHIL = ${JSON.stringify(data)}
`)
  }
}
console.log('wrote', OUT)
