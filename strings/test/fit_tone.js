// Fit the tone-correction EQ (strings/sound/tone.js) so the synthesised
// violin's long-term average spectrum matches the VSCO 2 CE solo violin
// "Arco Vib" samples (CC0, https://github.com/sgossner/VSCO-2-CE).
//
//   node strings/test/fit_tone.js [folder]      (default: strings/data/VSCO)
//
// The folder holds LLVln_ArcoVib_<note>_<f|p>.wav. Each sample is matched by
// a synthesised note at the same pitch and dynamic; the average spectrum of
// all of them, in third-octave bands, is compared and peaking-EQ gains on
// fixed centres are refined until the difference stops shrinking. Writes
// tone.js and prints the residual.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine, parseNote } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves } from '../sound/bowed.js'
import { INSTRUMENTS } from '../fingering.js'
import { readWav, fft } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const dir = process.argv[2] || here + '../data/VSCO'
if (!existsSync(dir)) {
  console.error(`No samples in ${dir}. Download the Arco Vib folder, e.g.:
  for n in G3 A3 C4 E4 G4 A4 C5 E5 G5 A5 C6 E6 A6 C7; do for d in f p; do
    curl -sfO "https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/Strings/Solo%20Violin/Arco%20Vib/LLVln_ArcoVib_\${n}_\${d}.wav"; done; done`)
  process.exit(1)
}
const SR = 48000
const bands = []; for (let f = 160; f < 14000; f *= 2 ** (1 / 3)) bands.push(f)
const CENTRES = [180, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11300]
const Q = 1.6

function bandPow(x, sr, acc) {
  const n = 4096
  for (let o = 0; o + n <= x.length; o += n / 2) {
    const re = new Float64Array(n), im = new Float64Array(n)
    for (let i = 0; i < n; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)))
    fft(re, im)
    let tot = 0
    for (let k = 1; k < n / 2; k++) tot += re[k] ** 2 + im[k] ** 2
    bands.forEach((f, b) => {
      const k0 = Math.round(f / 2 ** (1 / 6) * n / sr), k1 = Math.max(k0 + 1, Math.round(f * 2 ** (1 / 6) * n / sr))
      let s = 0
      for (let k = k0; k < k1; k++) s += re[k] ** 2 + im[k] ** 2
      acc[b] += s / tot
    })
  }
}
const toDb = a => { const t = a.reduce((x, y) => x + y, 0); return [...a].map(v => 10 * Math.log10(v / t)) }

const files = readdirSync(dir).filter(f => /ArcoVib_[A-G]#?\d_[fp]\.wav$/.test(f))
const accR = new Float64Array(bands.length)
const items = []
for (const f of files) {
  const [, nm, d] = f.match(/ArcoVib_(\w+?)_([fp])/)
  const w = readWav(readFileSync(dir + '/' + f))
  bandPow(w.chans[0].subarray(Math.round(0.4 * w.sr), Math.round(2.4 * w.sr)), w.sr, accR)
  const notes = [{ pitch: parseNote(nm), on: 0.1, off: 3.1, velocity: d === 'f' ? 0.95 : 0.4 }]
  fingerLine(notes, { instrument: 'violin', mode: 'expressive' })
  items.push(renderPerformance(notes))
}
const ref = toDb(accR)
console.log(`${files.length} reference samples`)

function measure(model, eq) {
  const acc = new Float64Array(bands.length)
  for (const perf of items) {
    const [L] = renderCurves(perf, { sampleRate: SR, model, tone: eq })
    bandPow(L.subarray(Math.round(0.5 * SR), Math.round(2.5 * SR)), SR, acc)
  }
  return toDb(acc).map((v, i) => v - ref[i])
}
// how much a band's level moves per dB of each EQ centre (log-frequency Gaussian)
const infl = (f, c) => Math.exp(-0.5 * (Math.log2(f / c) / 0.38) ** 2)
const rmsOf = d => Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length)

const out = {}
for (const model of ['waveguide', 'source']) {
  let gains = CENTRES.map(() => 0)
  let diff = measure(model, [])
  console.log(`${model}: before ${rmsOf(diff).toFixed(2)} dB rms`)
  let best = { gains: gains.slice(), r: rmsOf(diff) }
  for (let it = 0; it < 6; it++) {
    // each centre takes the weighted mean of the error around it
    gains = gains.map((g, j) => {
      let s = 0, w = 0
      bands.forEach((f, i) => { const k = infl(f, CENTRES[j]); s += k * diff[i]; w += k })
      return Math.max(-18, Math.min(18, g - 0.8 * s / w))
    })
    diff = measure(model, CENTRES.map((c, j) => [c, gains[j], Q]))
    const r = rmsOf(diff)
    console.log(`  iteration ${it + 1}: ${r.toFixed(2)} dB rms`)
    if (r < best.r) best = { gains: gains.slice(), r }
  }
  out[model] = CENTRES.map((c, j) => [c, +best.gains[j].toFixed(1), Q])
  console.log('  residual per band:', bands.map((f, i) => `${Math.round(f)}:${diff[i].toFixed(0)}`).join(' '))
}

// ── voicing: per-pitch gain that takes out 70 % of the level unevenness ──
// (sustained mf notes, no vibrato, each on the string the fingering picks)
const level = {}
const toneFor = (instrument, model) => instrument === 'violin' ? out[model] : out[model]
for (const instrument of ['violin', 'viola', 'cello']) {
  level[instrument] = {}
  const I = INSTRUMENTS[instrument], from = I.open[0], to = I.open[3] + 24
  for (const model of ['waveguide', 'source']) {
    const dB = []
    for (let m = from; m <= to; m++) {
      const notes = [{ pitch: m, on: 0.1, off: 1.4, velocity: 0.75 }]
      fingerLine(notes, { instrument })
      const perf = renderPerformance(notes, { instrument, style: { vibrato: 0 } })
      const [L] = renderCurves(perf, { sampleRate: SR, instrument, model, tail: 0.1, tone: toneFor(instrument, model) })
      const x = L.subarray(Math.round(0.45 * SR), Math.round(1.35 * SR))
      const e = x.reduce((a, v) => a + v * v, 0) / x.length
      dB.push(notes[0].string == null || notes[0].unplayable || !(e > 1e-12) ? null : 10 * Math.log10(e))
    }
    // unplayable pitches take their neighbour's level
    for (let i = 0; i < dB.length; i++) if (dB[i] == null) dB[i] = dB[i - 1] ?? dB.find(v => v != null)
    // smooth over ±1 semitone, then take out 70 % of the deviation from the mean
    const sm = dB.map((v, i) => (dB[Math.max(0, i - 1)] + 2 * v + dB[Math.min(dB.length - 1, i + 1)]) / 4)
    const mean = sm.reduce((a, v) => a + v, 0) / sm.length
    level[instrument][model] = { from, dB: sm.map(v => +(-0.7 * (v - mean)).toFixed(1)) }
    const spread = Math.max(...dB) - Math.min(...dB)
    console.log(`voicing ${instrument} ${model}: spread ${spread.toFixed(1)} dB`)
  }
}

const file = here + '../sound/tone.js'
writeFileSync(file, `// Tone correction per instrument and string model: peaking EQ bands
// [Hz, dB, Q] after the modal body, fitted so the long-term spectrum of
// sustained notes matches the VSCO 2 CE solo violin (CC0) recordings.
// Regenerate with: node strings/test/fit_tone.js <VSCO "Arco Vib" folder>
// (${files.length} samples, ${new Date().toISOString().slice(0, 10)})
export const TONE = {
  violin: {
    waveguide: ${JSON.stringify(out.waveguide)},
    source: ${JSON.stringify(out.source)},
  },
}
// Voicing: dB per semitone from \`from\` (MIDI), evening out the body's peaks and dips.
export const LEVEL = ${JSON.stringify(level)}
`)
console.log('wrote', file)
