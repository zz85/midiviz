// A measured violin body from the Princeton NBody impulse responses, for
// #034's physical models (third option of Timbre → Body; research 05 §4.1b).
//
//   node strings/test/build_nbody.js [--mix=all|pair] [--mics=3,10] [--hi=13000] [--no-eval] [--quick] [--out=body-nbody.json]
//
// NBody (Perry Cook and Dan Trueman, Princeton, 1998; "A Database of Measured
// Musical Instrument Body Radiation Impulse Responses", ISMA 1998): a violin
// held by a player inside an icosahedron of 12 cardioid microphones, its
// bridge struck with a force hammer next to each string (G, D, A, E). Each
// take has the hammer's force signal and the 12 microphone signals, 0.2 s
// at 44.1 kHz. The files carry no licence, so they are downloaded into the
// git-ignored strings/data/NBody/ and the derived response stays there too.
//
// Per microphone and string: the radiation transfer function is the
// microphone spectrum over the hammer spectrum, H = Y·X* / (|X|² + ε), with
// ε = 1e-3 of the hammer's peak power (at most 30 dB of boost where the
// hammer is weak, above ~4 kHz). The four strike points are averaged
// (same microphone, same path: the responses are time-aligned). The result
// is band-limited to 120 Hz – 13 kHz (the takes are 25–30 dB above their
// noise floor up to 8 kHz, ~11 dB at 12 kHz; --hi= to change), turned back
// into an impulse response, the acoustic
// delay to the nearest microphone removed, and cut to 4096 samples (93 ms)
// with a short fade. Unlike the Iowa body it keeps the measured phase: the
// body's ring, not only its average colour. Two microphones are the two
// ears (default: the two that hear the most between 500 Hz and 4 kHz).
//
// The level per string model matches the Iowa body on mezzo-forte notes.
// Then, as a check, every Iowa recording is compared harmonic by harmonic
// with our string through this body (the same residual fit_body.js reports;
// needs the Iowa bank and ffmpeg).
//
// Writes strings/data/NBody/body-nbody.json, which 034_violin_sound.html
// loads when Body is set to "Measured (NBody)".
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fft } from '../sound/body.js'
import { hasBank, hasFfmpeg } from './hybrid-bank.js'
import { SR, renderRaw, collect, spread, bodyResidual, actRms } from './body-eval.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const DIR = here + '../data/NBody/'
const URL0 = 'https://www.cs.princeton.edu/~prc/NBody/violin/'
const STRINGS = ['G', 'D', 'A', 'E']
const RATE = 44100, N = 16384, L = 4096, LO = 120, HI = +arg("hi", 13000)

/** 16-bit AIFF → Float32Array (first channel). */
function readAiff(buf) {
  let i = 12, ch = 1, n = 0, data = null
  while (i < buf.length - 8) {
    const id = buf.toString('ascii', i, i + 4), sz = buf.readUInt32BE(i + 4)
    if (id === 'COMM') { ch = buf.readUInt16BE(i + 8); n = buf.readUInt32BE(i + 10) }
    if (id === 'SSND') data = buf.subarray(i + 16 + buf.readUInt32BE(i + 8), i + 8 + sz)
    i += 8 + sz + (sz & 1)
  }
  const x = new Float32Array(n)
  for (let k = 0; k < n; k++) x[k] = data.readInt16BE(k * 2 * ch) / 32768
  return x
}

async function take(s, name) {
  const rel = `violin${s}-1/${s.toLowerCase()}-${name}`, path = DIR + 'violin/' + rel
  if (!existsSync(path)) {
    mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true })
    const r = await fetch(URL0 + rel)
    if (!r.ok) throw new Error(`${URL0 + rel}: ${r.status}`)
    writeFileSync(path, Buffer.from(await r.arrayBuffer()))
  }
  return readAiff(readFileSync(path))
}
const spectrum = x => { const re = new Float64Array(N), im = new Float64Array(N); re.set(x.subarray(0, N)); fft(re, im); return { re, im } }

// ── transfer functions, averaged over the four strike points ──
const H = Array.from({ length: 12 }, () => ({ re: new Float64Array(N), im: new Float64Array(N) }))
for (const s of STRINGS) {
  const X = spectrum(await take(s, 'hammerB'))
  let pk = 0
  for (let k = 0; k < N; k++) pk = Math.max(pk, X.re[k] ** 2 + X.im[k] ** 2)
  const eps = 1e-3 * pk
  for (let m = 0; m < 12; m++) {
    const Y = spectrum(await take(s, String(m + 1)))
    for (let k = 0; k < N; k++) {
      const d = X.re[k] ** 2 + X.im[k] ** 2 + eps
      H[m].re[k] += (Y.re[k] * X.re[k] + Y.im[k] * X.im[k]) / d / 4
      H[m].im[k] += (Y.im[k] * X.re[k] - Y.re[k] * X.im[k]) / d / 4
    }
  }
}
console.log(`NBody violin: ${STRINGS.length} strike points × 12 microphones`)

// band limit (zero phase): 4th-order roll-off below LO and above HI
for (const h of H) for (let k = 0; k <= N / 2; k++) {
  const f = Math.max(1, k * RATE / N)
  const w = 1 / Math.sqrt(1 + (LO / f) ** 4) / Math.sqrt(1 + (f / HI) ** 8)
  h.re[k] *= w; h.im[k] *= w
  if (k && k < N / 2) { h.re[N - k] = h.re[k]; h.im[N - k] = -h.im[k] }
}
const bandDb = (h, a, b) => { let s = 0; for (let k = Math.round(a * N / RATE); k < Math.round(b * N / RATE); k++) s += h.re[k] ** 2 + h.im[k] ** 2; return 10 * Math.log10(s) }
const loud = H.map((h, m) => ({ m, dB: bandDb(h, 500, 4000) })).sort((a, b) => b.dB - a.dB)
const mics = arg('mics', `${loud[0].m + 1},${loud[1].m + 1}`).split(',').map(v => +v - 1)
console.log('microphones (500 Hz – 4 kHz, dB):', loud.map(x => `${x.m + 1}:${x.dB.toFixed(1)}`).join(' '), '→ ears', mics.map(m => m + 1).join(' + '))

// --mix=all: each ear's magnitude becomes the power average of all 12
// directions (a listener in a room hears a blend of every direction the
// violin radiates in), while keeping the ear's own measured phase character.
// The correction |avg| / |H_ear| is smoothed over 1/6 octave, limited to
// ±18 dB and applied as a minimum-phase (causal) filter, so nothing rings
// before the strike. --mix=pair: the two microphones as they are.
const MIX = arg('mix', 'all')
const avgPow = new Float64Array(N / 2 + 1)
for (const h of H) for (let k = 0; k <= N / 2; k++) avgPow[k] += (h.re[k] ** 2 + h.im[k] ** 2) / H.length
/** Smooth a power spectrum over ±1/12 octave (bins 0…N/2). */
function smooth(P) {
  const c = new Float64Array(P.length + 1); for (let k = 0; k < P.length; k++) c[k + 1] = c[k] + P[k]
  return Float64Array.from(P, (_, k) => { const a = Math.max(0, Math.floor(k / 1.0595)), b = Math.min(P.length - 1, Math.ceil(k * 1.0595)); return (c[b + 1] - c[a]) / (b - a + 1) })
}
/** Minimum-phase spectrum (N bins) with the log-magnitude lm[0…N/2] (cepstral folding). */
function minPhase(lm) {
  const re = new Float64Array(N), im = new Float64Array(N)
  for (let k = 0; k <= N / 2; k++) { re[k] = lm[k]; if (k && k < N / 2) re[N - k] = lm[k] }
  fft(re, im, true)
  for (let n = 0; n < N; n++) { re[n] /= N; im[n] = 0 }
  for (let n = 1; n < N / 2; n++) { re[n] *= 2; re[N - n] = 0 }
  fft(re, im)
  return { re: Float64Array.from(re, (_, k) => Math.exp(re[k]) * Math.cos(im[k])), im: Float64Array.from(im, (_, k) => Math.exp(re[k]) * Math.sin(im[k])) }
}
const sAvg = smooth(avgPow)
const irs = mics.map(m => {
  const re = Float64Array.from(H[m].re), im = Float64Array.from(H[m].im)
  if (MIX === 'all') {
    const own = smooth(Float64Array.from({ length: N / 2 + 1 }, (_, k) => re[k] ** 2 + im[k] ** 2))
    const lim = 18 * Math.LN10 / 20
    const C = minPhase(Float64Array.from(own, (p, k) => Math.max(-lim, Math.min(lim, 0.5 * Math.log((sAvg[k] + 1e-30) / (p + 1e-30))))))
    for (let k = 0; k < N; k++) { const a = re[k], b = im[k]; re[k] = a * C.re[k] - b * C.im[k]; im[k] = a * C.im[k] + b * C.re[k] }
  }
  fft(re, im, true)
  return Float64Array.from(re, v => v / N)
})
let peak = 0
for (const h of irs) for (const v of h) peak = Math.max(peak, Math.abs(v))
let onset = Infinity
for (const h of irs) { const i = h.findIndex(v => Math.abs(v) > 0.05 * peak); if (i >= 0) onset = Math.min(onset, i) }
const start = Math.max(0, onset - 24), fade = Math.round(L * 0.15)
const ir = irs.map(h => {
  const out = new Float32Array(L)
  for (let n = 0; n < L; n++) out[n] = h[start + n] * (n > L - fade ? 0.5 + 0.5 * Math.cos(Math.PI * (n - (L - fade)) / fade) : 1) / peak
  return out
})
const energyMs = h => { let e = 0, c = 0; for (const v of h) e += v * v; for (let n = 0; n < h.length; n++) { c += h[n] * h[n]; if (c > 0.95 * e) return n / RATE * 1000 } }
console.log(`delay removed ${(start / RATE * 1000).toFixed(2)} ms; 95 % of the energy within ${ir.map(h => energyMs(h).toFixed(0)).join(' / ')} ms`)

const body = { id: `nbody-violin-${MIX}`, instrument: 'violin', rate: RATE, mix: MIX, mics: mics.map(m => m + 1), gainDb: {}, ir }

// ── level per string model: match the Iowa body on mezzo-forte notes ──
const open = [55, 62, 69, 76]
for (const model of ['waveguide', 'source']) {
  let gi = 0, gn = 0
  for (let s = 0; s < 4; s++) for (const d of [2, 5, 9]) {
    gi += actRms(renderRaw('violin', model, open[s] + d, s, 0.68, 1.6, 'iowa').subarray(0.5 * SR))
    gn += actRms(renderRaw('violin', model, open[s] + d, s, 0.68, 1.6, { ...body, gainDb: { [model]: 0 } }).subarray(0.5 * SR))
  }
  body.gainDb[model] = Math.round(20 * Math.log10(gi / gn) * 100) / 100
}
console.log('level vs the Iowa body (dB):', JSON.stringify(body.gainDb))

// ── check against the Iowa recordings ──
if (!process.argv.includes('--no-eval') && hasBank('violin') && hasFfmpeg()) {
  const stats = {}
  for (const model of ['waveguide', 'source']) {
    const t0 = Date.now()
    const { rows } = collect('violin', model, { quick: process.argv.includes('--quick') })
    const r = spread(bodyResidual('violin', model, rows, body), (row, o) => o.m)
    const m = spread(bodyResidual('violin', model, rows, 'modal'), (row, o) => o.m)
    stats[model] = { mad: +r.mad.toFixed(2), p90: +r.p90.toFixed(2), modalMad: +m.mad.toFixed(2), modalP90: +m.p90.toFixed(2) }
    console.log(`${model}: harmonic residual vs the Iowa recordings ${r.mad.toFixed(2)} dB median / ${r.p90.toFixed(2)} p90 (modal body ${m.mad.toFixed(2)} / ${m.p90.toFixed(2)}); ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  }
  body.stats = stats
} else console.log('(skipped the check against the Iowa recordings: needs the Iowa bank and ffmpeg)')

writeFileSync(DIR + arg('out', 'body-nbody.json'), JSON.stringify({ ...body, ir: body.ir.map(h => Array.from(h, v => +v.toPrecision(5))) }))
console.log('wrote', DIR + arg('out', 'body-nbody.json'))
