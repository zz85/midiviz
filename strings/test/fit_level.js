// Fit the level-by-pitch voicing of the physical models with a measured body
// (strings/sound/level-body.js) so a note's loudness follows the recorded
// instrument's across the range.
//
//   node strings/test/fit_level.js [--instrument=violin]
//
// The measured bodies (fit_body.js, fit_body_philharmonia.js) are fitted to the
// shape of each recorded note's harmonics, not to its level, so the level from
// note to note can drift: through the Iowa and Philharmonia violin bodies our
// notes above D6 came out ~10 dB quieter (relative to G4) than the Iowa
// recordings, which stay level there. For every note of the Iowa bank (University of Iowa MIS,
// arco non-vibrato, mf, the string it was played on) this renders the same
// pitch on the same string, measures both as K-weighted loudness (ITU-R
// BS.1770) over the steady part, and writes the smoothed difference (±5
// semitones, Gaussian), with its mean removed so the overall level stays the
// engines' business (strings/sound/engines.js LEVEL_TRIM). Only the broad trend is
// corrected: the note-to-note peaks and dips are the body's own.
// Needs ffmpeg and the bank in strings/sound/samples/iowa (build_iowa.js).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves } from '../sound/bowed.js'
import { kLoudness } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]
const OUT = here + '../sound/level-body.js'
const SR = 48000
const BODIES = ['iowa', 'phil'], MODELS = ['waveguide', 'source']
const instruments = arg('instrument') ? [arg('instrument')] : ['violin', 'viola', 'cello']
const VEL = 0.6   // the performance renderer's mezzo-forte

const prev = existsSync(OUT) ? (await import(OUT + '?' + Date.now())).LEVEL_BODY : {}
const res = JSON.parse(JSON.stringify(prev ?? {}))

for (const instrument of instruments) {
  const dir = here + `../sound/samples/iowa/${instrument}/`
  if (!existsSync(dir + 'manifest.json')) { console.warn(`${instrument}: no bank in ${dir}, skipped`); continue }
  const M = JSON.parse(readFileSync(dir + 'manifest.json'))
  // the recordings: K-weighted loudness of each mf note's steady part
  const rec = []
  for (const [key, p] of Object.entries(M.packs)) {
    const [s, d] = key.split('_')
    if (d !== 'mf') continue
    const raw = execFileSync('ffmpeg', ['-v', 'quiet', '-i', dir + p.file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
    const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2)
    for (const n of p.notes) {
      const a = n.offset + n.attackEnd, z = n.offset + Math.min(n.tail, n.attackEnd + Math.round(1.2 * SR))
      if (z - a < 0.25 * SR) continue
      rec.push({ s: +s, midi: n.midi, L: kLoudness([x.subarray(a, z)], SR) })
    }
  }
  const from = Math.min(...rec.map(r => r.midi)), to = Math.max(...rec.map(r => r.midi))
  res[instrument] ??= {}
  for (const body of BODIES) for (const model of MODELS) {
    // ours: the same pitch on the same string, 1.2 s at mezzo-forte, no vibrato
    const diff = []
    for (const r of rec) {
      const notes = [{ pitch: r.midi, on: 0.1, off: 1.6, velocity: VEL, lockString: r.s }]
      fingerLine(notes, { instrument })
      if (notes[0].string !== r.s) continue
      const perf = renderPerformance(notes, { instrument, style: { vibrato: 0, timing: 0, intonation: 0, variance: 0, autoBow: 0 } })
      const ch = renderCurves(perf, { sampleRate: SR, instrument, model, tail: 0, params: { body, oversample: 2 } })
      diff.push({ midi: r.midi, d: r.L - kLoudness(ch.map(c => c.subarray(0.45 * SR, 1.45 * SR)), SR) })
    }
    // smooth over pitch (Gaussian, σ = 2.5 semitones, ±5 window), mean removed
    let dB = []
    for (let p = from; p <= to; p++) {
      let w = 0, s = 0
      for (const q of diff) { const k = Math.abs(q.midi - p); if (k <= 5) { const g = Math.exp(-0.5 * (k / 2.5) ** 2); w += g; s += g * q.d } }
      dB.push(w ? s / w : NaN)
    }
    for (let i = 0; i < dB.length; i++) if (!isFinite(dB[i])) dB[i] = dB[i - 1] ?? 0
    const mean = dB.reduce((a, b) => a + b, 0) / dB.length
    dB = dB.map(v => +Math.max(-12, Math.min(12, v - mean)).toFixed(1))
    // what it corrects: the spread of (recording − ours) per note before and after
    const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) }
    const after = diff.map(q => q.d - dB[Math.max(0, Math.min(dB.length - 1, q.midi - from))])
    const top = diff.filter(q => q.midi >= to - 12)
    console.log(`${instrument} ${body} ${model}: ${diff.length} notes, recording − ours spread ${sd(diff.map(q => q.d)).toFixed(1)} → ${sd(after).toFixed(1)} dB, top octave ${(top.reduce((a, q) => a + q.d, 0) / top.length - mean).toFixed(1)} dB re mean`)
    ;(res[instrument][body] ??= {})[model] = { from, dB }
  }
}
writeFileSync(OUT, `// Level-by-pitch voicing for the physical models with a measured body
// (dB, one value per semitone from 'from'), fitted by strings/test/fit_level.js
// to the Iowa recordings' loudness (K-weighted, mf, same string). Applied by
// ViolinSynth as the string gain from its current pitch.
export const LEVEL_BODY = ${JSON.stringify(res)}
`)
console.log('wrote', OUT)
