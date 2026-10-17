// Synthetic test audio with known notes, for scoring a transcriber against
// ground truth: a plucked / struck tone (inharmonic partials, two-stage
// decay, a soft hammer click) rendered straight into a Float32Array.

import { SAMPLE_RATE } from './basic-pitch.js'

const midiHz = m => 440 * 2 ** ((m - 69) / 12)

/**
 * notes: [{ pitch, start, end, velocity (0..1) }] → mono Float32Array.
 * timbre: 'piano' (struck, inharmonic, decays) | 'organ' (sustained, harmonic) | 'sine'
 */
export function renderNotes(notes, { sr = SAMPLE_RATE, timbre = 'piano', tail = 0.6, seed = 1 } = {}) {
  const dur = notes.reduce((m, n) => Math.max(m, n.end), 0) + tail
  const out = new Float32Array(Math.ceil(dur * sr))
  let s = seed
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (const n of notes) {
    const f0 = midiHz(n.pitch), v = n.velocity ?? 0.7
    const i0 = Math.round(n.start * sr), i1 = Math.round(n.end * sr)
    const rel = 0.08, iEnd = Math.min(out.length, i1 + Math.round(rel * sr))
    const B = timbre === 'piano' ? 0.0004 * 2 ** ((n.pitch - 60) / 24) : 0
    const nP = timbre === 'sine' ? 1 : Math.max(1, Math.min(12, Math.floor(8000 / f0)))
    const parts = []
    for (let k = 1; k <= nP; k++) {
      const fk = f0 * k * Math.sqrt(1 + B * k * k)
      if (fk > sr / 2 - 500) break
      const amp = timbre === 'organ' ? 1 / k : (1 / k ** 1.1) * (0.6 + 0.8 * v * Math.min(1, k / 3))
      const dec = timbre === 'piano' ? (0.6 + 0.012 * n.pitch) * k ** 0.5 : 0
      parts.push({ w: (2 * Math.PI * fk) / sr, a: amp, dec, ph: rnd() * 6.283 })
    }
    const norm = 0.22 * v / parts.reduce((t, p) => t + p.a, 0) * 3
    for (let i = i0; i < iEnd; i++) {
      const t = (i - i0) / sr
      const att = Math.min(1, t / (timbre === 'organ' ? 0.02 : 0.003))
      const r = i < i1 ? 1 : Math.max(0, 1 - (i - i1) / (rel * sr))
      let y = 0
      for (const p of parts) y += p.a * Math.exp(-p.dec * t * (timbre === 'piano' ? 1 : 0)) * Math.sin(p.w * (i - i0) + p.ph)
      if (timbre === 'piano' && t < 0.004) y += (rnd() - 0.5) * 0.6 * (1 - t / 0.004)
      out[i] += y * norm * att * r
    }
  }
  return out
}

/** A short two-hand test phrase: a C-major melody over held chords, with repeated notes and a run. */
export function testPhrase() {
  const notes = []
  const q = 0.42
  const mel = [72, 74, 76, 77, 79, 79, 77, 76, 74, 72, 71, 72]
  mel.forEach((p, i) => notes.push({ pitch: p, start: 0.2 + i * q, end: 0.2 + i * q + q * 0.9, velocity: 0.75 }))
  const chords = [[48, 55, 64], [53, 57, 65], [55, 59, 62], [48, 55, 64]]
  chords.forEach((c, i) => c.forEach(p => notes.push({ pitch: p, start: 0.2 + i * 4 * q, end: 0.2 + (i + 1) * 4 * q - 0.05, velocity: 0.55 })))
  const run0 = 0.2 + 12 * q + 0.3
  ;[60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84].forEach((p, i) =>
    notes.push({ pitch: p, start: run0 + i * 0.14, end: run0 + i * 0.14 + 0.13, velocity: 0.7 }))
  notes.push({ pitch: 36, start: run0, end: run0 + 2.4, velocity: 0.7 })
  notes.push({ pitch: 84, start: run0 + 2.4, end: run0 + 3.6, velocity: 0.8 })
  notes.push({ pitch: 72, start: run0 + 2.4, end: run0 + 3.6, velocity: 0.8 })
  return notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch)
}
