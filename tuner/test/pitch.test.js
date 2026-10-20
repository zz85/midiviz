// node --test tuner/test/pitch.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { PitchDetector, PitchTracker, autocorr, noteInfo, parseNote, stringTargets, nearestString, midiFreq } from '../pitch.js'

const SR = 48000
const SAW = Array.from({ length: 20 }, (_, i) => 1 / (i + 1))

/** Harmonic tone: amplitudes per harmonic, optional noise (seeded), vibrato and a start offset. */
function tone(f, seconds, { harm = SAW, noise = 0, amp = 0.3, sr = SR, vibrato = 0, rate = 5.5, start = 0, seed = 1 } = {}) {
  const n = Math.round(seconds * sr), x = new Float32Array(n)
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647 - 0.5
  let ph = 0
  for (let i = 0; i < n; i++) {
    if (i < start * sr) { x[i] = noise * rnd(); continue }
    const fi = f * Math.pow(2, vibrato * Math.sin(2 * Math.PI * rate * i / sr) / 1200)
    ph += 2 * Math.PI * fi / sr
    let v = 0
    for (let h = 0; h < harm.length; h++) if (f * (h + 1) < sr / 2) v += harm[h] * Math.sin((h + 1) * ph + h * 0.7)
    x[i] = amp * v + noise * rnd()
  }
  return x
}
const cents = (a, b) => 1200 * Math.log2(a / b)

test('FFT autocorrelation matches the direct sum', () => {
  const len = 300, M = 1024
  const x = Float64Array.from({ length: len }, (_, i) => Math.sin(i * 0.37) + 0.3 * Math.cos(i * 1.91))
  const r = new Float64Array(M)
  autocorr(x, len, M, new Float64Array(M / 2 + 1), new Float64Array(M / 2 + 1), r)
  for (let t = 0; t < len; t += 7) {
    let s = 0
    for (let j = 0; j + t < len; j++) s += x[j] * x[j + t]
    assert.ok(Math.abs(s - r[t]) < 1e-9, `lag ${t}`)
  }
})

test('detector: sine and sawtooth from C1 to C8 within 0.2 cents, any window of 3 periods or more', () => {
  for (const harm of [[1], SAW]) {
    for (let midi = 24; midi <= 108; midi += 3) {
      const f = midiFreq(midi + 0.237)
      const det = new PitchDetector({ sampleRate: SR, maxSize: 4800 })
      for (const periods of [3.2, 8, 30]) {
        const len = Math.min(4800, Math.max(64, Math.ceil(periods * SR / f)))
        const x = tone(f, len / SR + 0.001, { harm })
        const d = det.detect(x, 0, len)
        assert.ok(d, `${midi} no pitch`)
        assert.ok(Math.abs(cents(d.freq, f)) < 0.2, `${midi} ${periods} periods: ${cents(d.freq, f).toFixed(3)} cents`)
        assert.ok(d.clarity > 0.95)
      }
    }
  }
})

test('detector: weak fundamental (missing-fundamental timbre) is not an octave off', () => {
  const harm = [0.15, 1, 0.8, 0.5, 0.4, 0.3, 0.2, 0.1]
  for (let midi = 28; midi <= 96; midi += 4) {
    const f = midiFreq(midi + 0.1)
    const len = Math.min(4800, Math.ceil(16 * SR / f) + 2400)
    const d = new PitchDetector({ sampleRate: SR, maxSize: 4800 }).detect(tone(f, 0.11, { harm }), 0, Math.min(len, 4800))
    assert.ok(Math.abs(cents(d.freq, f)) < 1, `${midi}: ${cents(d.freq, f).toFixed(1)}`)
  }
})

test('detector: silence and noise give no confident pitch', () => {
  const det = new PitchDetector({ sampleRate: SR, maxSize: 4800 })
  assert.equal(det.detect(new Float32Array(2400)), null)
  const d = det.detect(tone(440, 0.05, { amp: 0, noise: 0.5 }))
  assert.ok(!d || d.clarity < 0.8, `clarity ${d?.clarity}`)
})

test('tracker: guitar strings in noise, steady reading within 0.5 cents (balanced)', () => {
  for (const s of stringTargets('guitar')) {
    const f = s.freq * Math.pow(2, 3.3 / 1200)
    const tr = new PitchTracker({ sampleRate: SR })
    const r = tr.push(tone(f, 0.6, { noise: 0.05 })).slice(-40)
    for (const q of r) assert.ok(q.freq && Math.abs(cents(q.freq, f)) < 0.5, `${s.label}: ${q.freq && cents(q.freq, f).toFixed(2)}`)
  }
})

test('tracker: first reading within 40 ms of the onset (fast), within 5 cents', () => {
  for (const midi of [40, 57, 69, 88]) {
    const f = midiFreq(midi - 0.21)
    const tr = new PitchTracker({ sampleRate: SR, response: 'fast' })
    const r = tr.push(tone(f, 0.5, { start: 0.2, noise: 0.002 }))
    const first = r.find((q) => q.freq && q.time > 0.2)
    assert.ok(first, `${midi}: no reading`)
    assert.ok(first.time - 0.2 < 0.04, `${midi}: ${(1000 * (first.time - 0.2)).toFixed(0)} ms`)
    const settled = r.filter((q) => q.time > first.time + 0.01)
    for (const q of settled) assert.ok(Math.abs(cents(q.freq, f)) < 5, `${midi} at ${q.time.toFixed(3)}: ${cents(q.freq, f).toFixed(2)}`)
  }
})

test('tracker: follows a note change without lag from the smoothing', () => {
  const a = tone(220, 0.3), b = tone(midiFreq(64), 0.3)
  const tr = new PitchTracker({ sampleRate: SR, response: 'precise' })
  tr.push(a)
  const r = tr.push(b)
  const after = r.filter((q) => q.time > 0.3 + 0.1)
  for (const q of after) assert.ok(Math.abs(cents(q.freq, midiFreq(64))) < 1)
})

test('tracker: vibrato is followed (fast), smoothed toward the centre (precise)', () => {
  const f = 440, x = tone(f, 1.5, { vibrato: 20 })
  const span = (resp) => {
    const r = new PitchTracker({ sampleRate: SR, response: resp }).push(x).filter((q) => q.time > 0.5)
    const c = r.map((q) => cents(q.freq, f))
    return Math.max(...c) - Math.min(...c)
  }
  const fast = span('fast'), precise = span('precise')
  assert.ok(fast > 30, `fast span ${fast}`)
  assert.ok(precise < fast * 0.7, `precise ${precise} vs fast ${fast}`)
})

test('tracker: 44.1 kHz and the level gate', () => {
  const tr = new PitchTracker({ sampleRate: 44100, gateDb: -40 })
  const quiet = tr.push(tone(330, 0.3, { sr: 44100, amp: 0.002 }))
  assert.ok(quiet.every((q) => !q.freq))
  const loud = tr.push(tone(330, 0.3, { sr: 44100 })).slice(-10)
  for (const q of loud) assert.ok(Math.abs(cents(q.freq, 330)) < 0.5)
})

test('notes and strings', () => {
  assert.equal(parseNote('A4'), 69)
  assert.equal(parseNote('C#4'), 61)
  assert.equal(parseNote('Bb0'), 22)
  const n = noteInfo(442, 440)
  assert.equal(n.name, 'A'); assert.equal(n.octave, 4)
  assert.ok(Math.abs(n.cents - 7.85) < 0.01)
  assert.equal(noteInfo(440, 442).cents < 0, true)
  // violin in pure fifths from A: D = 293.33, G = 195.56, E = 660
  const v = stringTargets('violin', 440, true)
  assert.deepEqual(v.map((s) => s.label), ['G3', 'D4', 'A4', 'E5'])
  assert.ok(Math.abs(v[0].freq - 440 / 1.5 / 1.5) < 1e-9)
  assert.ok(Math.abs(v[3].freq - 660) < 1e-9)
  // guitar stays equal tempered even with pure on
  const g = stringTargets('guitar', 440, true)
  assert.ok(Math.abs(g[0].freq - midiFreq(40)) < 1e-9)
  const ns = nearestString(197, v)
  assert.equal(ns.label, 'G3')
  assert.ok(Math.abs(ns.cents - cents(197, 440 / 2.25)) < 1e-9)
})
