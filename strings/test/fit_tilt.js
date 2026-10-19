// Fit the bow-force brightness tilt (strings/sound/bowed.js TILT) for #034's
// physical models, against the Philharmonia Orchestra recordings.
//
//   node strings/test/fit_tilt.js [--instrument=violin,viola,cello] [--quick]
//
// A violinist's strongest timbre control is bow force: within the playable
// window the spectral centroid moves from about 0.8 to 3 kHz, mostly with
// force (Schoonderwaldt 2009). Our string models brighten far too little with
// force by themselves: from pianissimo to fortissimo the recordings brighten
// by ~520 cents (violin, median spectral centroid), our models by 15–60. That
// is the "same tone at every dynamic", sawtooth-like quality.
//
// ViolinSynth tilts each string above ~3·f0 by k = exp(c·(r − r0)) − 1, where
// r = log10(bow force / (Z/0.3)^1.5), the force on the string's own scale (the
// performance keeps it near the minimum force, which scales so). r0 is set to
// the median r of mezzo-forte notes, so the
// average tone (what the measured bodies were fitted to) stays put; c is
// searched per instrument so the median pp → ff brightening matches its
// recordings. Needs ffmpeg and the Philharmonia samples
// (fit_body_philharmonia.js downloads them into strings/data/Philharmonia/).
// Prints the result per instrument and rewrites TILT in bowed.js.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine, parseNote } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { ViolinSynth, CurveSource, TILT } from '../sound/bowed.js'
import { fft } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const INSTS = arg('instrument', 'violin,viola,cello').split(',')
const QUICK = process.argv.includes('--quick')
const SR = 48000, DIR = here + '../data/Philharmonia/Strings/'
const VEL = { pianissimo: 0.3, 'mezzo-forte': 0.68, fortissimo: 0.95 }
if (!INSTS.every(i => existsSync(DIR + i))) { console.error('run node strings/test/fit_body_philharmonia.js first (it downloads the samples)'); process.exit(1) }

const centroid = (x, a, b) => {
  const N = 4096; let s = 0, w = 0
  for (let o = a; o + N <= b; o += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N)
    for (let i = 0; i < N; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N))
    fft(re, im)
    for (let k = 1; k < N / 2; k++) { const p = re[k] ** 2 + im[k] ** 2; s += p * k; w += p }
  }
  return s / w * SR / N
}
const decode = p => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const steady = x => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); let a = 0; while (Math.abs(x[a]) < pk * 0.3) a++; let b = x.length - 1; while (Math.abs(x[b]) < pk * 0.3) b--; return [a + Math.round(0.15 * SR), b - Math.round(0.1 * SR)] }
const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1]

/** Pairs of recorded pp / ff notes per instrument: { midi, rec: cents ff − pp }. */
function recorded(instrument) {
  const files = readdirSync(DIR + instrument), by = {}
  for (const f of files) { const m = f.match(new RegExp(`^${instrument}_([A-G]s?\\d)_(15|1)_(pianissimo|fortissimo)_arco-normal\\.mp3$`)); if (m) (by[m[1]] ??= {})[m[3]] = f }
  const out = []
  for (const [note, d] of Object.entries(by)) {
    if (!d.pianissimo || !d.fortissimo) continue
    const c = {}
    for (const dyn of ['pianissimo', 'fortissimo']) { const x = decode(DIR + `${instrument}/` + d[dyn]); const [a, b] = steady(x); c[dyn] = b - a >= 8192 ? centroid(x, a, b) : null }
    if (c.pianissimo && c.fortissimo) out.push({ midi: parseNote(note.replace('s', '#')), rec: 1200 * Math.log2(c.fortissimo / c.pianissimo) })
  }
  return QUICK ? out.filter((_, i) => i % 3 === 0) : out
}

/** Our note through the model with a given tilt: centroid, and the median relative force r over the steady part. */
const perfCache = new Map()
function ours(instrument, model, midi, dyn) {
  const key = `${instrument}${midi}${dyn}`
  if (!perfCache.has(key)) {
    const notes = [{ pitch: midi, on: 0.1, off: 1.6, velocity: VEL[dyn] }]
    fingerLine(notes, { instrument })
    perfCache.set(key, { perf: renderPerformance(notes, { instrument }), s: notes[0].string })
  }
  const { perf, s } = perfCache.get(key)
  const syn = new ViolinSynth(SR, { instrument, model, body: 'phil' })
  const src = new CurveSource(perf), N = Math.round(1.6 * SR), L = new Float32Array(N), R = new Float32Array(N), rs = []
  let t = 0
  for (let i = 0; i < N; i += 128) { t = syn.process(src, t, 1 / SR, L.subarray(i, i + 128), R.subarray(i, i + 128), 128); if (i > 0.4 * SR) rs.push(syn.relF[s]) }
  return { c: centroid(L, Math.round(0.4 * SR), Math.round(1.5 * SR)), r: median(rs) }
}

const recs = Object.fromEntries(INSTS.map(i => [i, recorded(i)]))
for (const i of INSTS) console.log(`${i}: ${recs[i].length} recorded pp/ff pairs, median brightening ${median(recs[i].map(x => x.rec)).toFixed(0)} cents`)
const result = {}
for (const model of ['waveguide', 'source']) {
  // r0: median relative force of mezzo-forte notes (tilt off)
  TILT[model] = { c: 0, r0: 0.5 }
  const rMf = []
  for (const i of INSTS) for (const n of recs[i]) rMf.push(ours(i, model, n.midi, 'mezzo-forte').r)
  const r0 = +median(rMf).toFixed(3)
  console.log(`${model}: mezzo-forte r median ${r0}`)
  result[model] = {}
  for (const i of INSTS) {
    const rec = median(recs[i].map(x => x.rec))
    const err = c => {
      TILT[model] = { [i]: { c, r0 } }
      const d = median(recs[i].map(n => 1200 * Math.log2(ours(i, model, n.midi, 'fortissimo').c / ours(i, model, n.midi, 'pianissimo').c)))
      return { e: (d - rec) ** 2, d }
    }
    // golden-section search on c
    let lo = 0, hi = 5
    const g = (Math.sqrt(5) - 1) / 2
    let a = hi - g * (hi - lo), b = lo + g * (hi - lo), fa = err(a), fb = err(b)
    for (let it = 0; it < 11; it++) {
      if (fa.e < fb.e) { hi = b; b = a; fb = fa; a = hi - g * (hi - lo); fa = err(a) } else { lo = a; a = b; fa = fb; b = lo + g * (hi - lo); fb = err(b) }
    }
    const c = +((lo + hi) / 2).toFixed(2), fin = err(c), off = err(0)
    result[model][i] = { c, r0 }
    console.log(`${model} ${i}: r0 ${r0}, c ${c}; pp → ff brightening ${off.d.toFixed(0)} → ${fin.d.toFixed(0)} cents (recordings ${rec.toFixed(0)})`)
  }
}
const file = here + '../sound/bowed.js'
const src = readFileSync(file, 'utf8').replace(/export const TILT = \{[^\n]*\}/, `export const TILT = ${JSON.stringify(result)}`)
writeFileSync(file, src)
console.log('wrote TILT to', file)
