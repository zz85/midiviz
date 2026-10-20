// node --test rhythm/test/rhythm.test.js
//
// Unit tests for #040's analyser on synthetic signals (no soundfont needed):
// the FFT, onset timing, beat tracking on click tracks and the demo loops,
// tempo changes, meter, swing, silence, tap tempo and speed.

import test from 'node:test'
import assert from 'node:assert/strict'
import { FFT, OnsetFrontEnd } from '../onset.js'
import { RhythmAnalyzer } from '../analyzer.js'
import { renderLoop } from '../demo.js'
import { scoreBeats } from './metrics.js'

const SR = 44100

/** Click track: decaying noise bursts at the given times (accent on bar starts). */
function clicks(times, seconds, { accentEvery = 0 } = {}) {
  const x = new Float32Array(Math.round(seconds * SR))
  let s = 12345
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 * 2 - 1 }
  times.forEach((t, k) => {
    const i0 = Math.round(t * SR), g = accentEvery && k % accentEvery === 0 ? 1 : 0.5
    for (let i = 0; i < 0.03 * SR && i0 + i < x.length; i++) x[i0 + i] += g * rnd() * Math.exp(-i / (0.006 * SR))
  })
  return x
}

function analyse(x, opts = {}, sr = SR, onFeed) {
  const a = new RhythmAnalyzer(sr, opts), beats = [], events = []
  for (let p = 0; p < x.length; p += 128) {
    a.push(x.subarray(p, p + 128), e => { if (e.type === 'beat') { beats.push(e.time); events.push(e) } else if (e.type === 'reset') events.push(e) })
    onFeed?.(a, p / sr)
  }
  return { a, beats, events }
}

function loopSamples(L, seconds) {
  const reps = Math.ceil(seconds / L.seconds), x = new Float32Array(reps * L.samples.length), ref = []
  for (let r = 0; r < reps; r++) { x.set(L.samples, r * L.samples.length); for (const b of L.beats) ref.push(r * L.seconds + b) }
  return { x, ref }
}

test('FFT matches a direct DFT', () => {
  const n = 64, f = new FFT(n), x = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 5) / 5)
  f.load(x); f.run()
  for (const k of [0, 1, 7, 31, 32]) {
    let re = 0, im = 0
    for (let i = 0; i < n; i++) { re += x[i] * Math.cos(-2 * Math.PI * k * i / n); im += x[i] * Math.sin(-2 * Math.PI * k * i / n) }
    assert.ok(Math.abs(f.re[k] - re) < 1e-9 && Math.abs(f.im[k] - im) < 1e-9, `bin ${k}`)
  }
})

test('onset strength peaks at the clicks, at most 15 ms early (the window sees a click before its centre does)', () => {
  const times = [0.5, 1.13, 1.71, 2.4]
  const x = clicks(times, 3)
  const fe = new OnsetFrontEnd(SR), F = []
  fe.push(x, f => F.push({ t: f.time, flux: f.flux }))
  const max = Math.max(...F.map(f => f.flux))
  const peaks = F.filter((f, i) => f.flux > 0.3 * max && f.flux >= (F[i - 1]?.flux ?? 0) && f.flux >= (F[i + 1]?.flux ?? 0))
  assert.equal(peaks.length, times.length)
  peaks.forEach((p, i) => assert.ok(p.t - times[i] > -0.015 && p.t - times[i] < 0.005, `click ${times[i]} found at ${p.t.toFixed(3)}`))
})

test('click tracks from 60 to 190 BPM: tempo within 1 %, beats within 70 ms, locked in under 4 s', () => {
  for (const bpm of [60, 84, 100, 120, 142, 165, 190]) {
    const times = []; for (let t = 0.3; t < 20; t += 60 / bpm) times.push(t)
    const { a, beats } = analyse(clicks(times, 20, { accentEvery: 4 }))
    const s = scoreBeats(times, beats, 4)
    assert.ok(s.f > 0.97, `${bpm} BPM: F ${s.f.toFixed(3)}`)
    assert.ok(Math.abs(a.bpm() / bpm - 1) < 0.01, `${bpm} BPM: reported ${a.bpm().toFixed(2)}`)
    const first = beats.find((t, i) => i + 3 < beats.length && [0, 1, 2, 3].every(q => times.some(r => Math.abs(r - beats[i + q]) < 0.07)))
    assert.ok(first < 4, `${bpm} BPM: locked at ${first?.toFixed(2)} s`)
  }
})

test('beats are reported on time: emitted no later than one frame after the beat', () => {
  const times = []; for (let t = 0.3; t < 15; t += 0.5) times.push(t)
  const x = clicks(times, 15), lags = []
  const a = new RhythmAnalyzer(SR)
  for (let p = 0; p < x.length; p += 128) a.push(x.subarray(p, p + 128), e => { if (e.type === 'beat' && e.time > 4) lags.push(a.now - e.time) })
  const mean = lags.reduce((s, v) => s + v, 0) / lags.length
  assert.ok(Math.max(...lags) < 0.015 && mean < 0.01, `mean ${(1000 * mean).toFixed(1)} ms, max ${(1000 * Math.max(...lags)).toFixed(1)} ms`)
})

test('follows a tempo ramp (100 → 130 BPM over 30 s) and a jump (110 → 140)', () => {
  const ramp = []; for (let t = 0.3; t < 30;) { ramp.push(t); t += 60 / (100 + 30 * t / 30) }
  assert.ok(scoreBeats(ramp, analyse(clicks(ramp, 30, { accentEvery: 4 })).beats).f > 0.95)
  const jump = []; for (let t = 0.3; t < 30;) { jump.push(t); t += 60 / (t < 15 ? 110 : 140) }
  const { beats } = analyse(clicks(jump, 30, { accentEvery: 4 }))
  assert.ok(scoreBeats(jump.filter(t => t > 20), beats.filter(t => t > 20), 0).f > 0.95, 'after the jump')
})

test('demo loops at 48 kHz: rock, shuffle, waltz, 6/8 — beats, meter and feel', () => {
  const cases = [['rock', 120, '4/4', 1], ['shuffle', 100, '4/4', 2], ['waltz', 144, '3/4', 1], ['sixeight', 80, '12/8', 1]]
  for (const [style, bpm, sig, swing] of cases) {
    const L = renderLoop(style, bpm, 48000, 4), { x, ref } = loopSamples(L, 24)
    const { a, beats } = analyse(x, {}, 48000)
    const s = scoreBeats(ref, beats)
    assert.ok(s.f > 0.95, `${style}: F ${s.f.toFixed(3)}`)
    assert.ok(Math.abs(a.bpm() - bpm) < 1, `${style}: ${a.bpm().toFixed(1)} BPM`)
    assert.equal(a.meter.timeSignature(), sig, style)
    if (swing > 1) assert.ok(Math.abs(a.meter.swing - swing) < 0.25, `${style}: swing ${a.meter.swing.toFixed(2)}`)
    else assert.ok(a.meter.swing < 1.25, `${style}: swing ${a.meter.swing.toFixed(2)}`)
  }
})

test('downbeats: the rock loop\'s bar starts are found', () => {
  const L = renderLoop('rock', 120, 48000, 4), { x } = loopSamples(L, 24)
  const { events } = analyse(x, {}, 48000)
  const downs = events.filter(e => e.type === 'beat' && e.downbeat && e.time > 10).map(e => e.time)
  const bar = L.meter * 60 / 120
  assert.ok(downs.length >= 5)
  for (const t of downs) { const r = ((t % bar) + bar) % bar; assert.ok(Math.min(r, bar - r) < 0.07, `downbeat at ${t.toFixed(3)}`) }
})

test('silence: beats stop, then the tracker resets and locks onto a new tempo', () => {
  const a1 = []; for (let t = 0.3; t < 10; t += 0.5) a1.push(t)
  const a2 = []; for (let t = 15; t < 28; t += 60 / 90) a2.push(t)
  const { beats, events } = analyse(clicks([...a1, ...a2], 28, { accentEvery: 4 }))
  assert.ok(!beats.some(t => t > 11.6 && t < 14.95), `no beats in the gap: ${beats.filter(t => t > 11 && t < 16).map(t => t.toFixed(3))}`)
  assert.ok(events.some(e => e.type === 'reset' && e.time > 12 && e.time < 14), 'reset after 3 s')
  assert.ok(scoreBeats(a2.filter(t => t > 20), beats.filter(t => t > 20), 0).f > 0.95, 'second tempo')
  const last = events.filter(e => e.type === 'beat').pop()
  assert.ok(Math.abs(last.bpm - 90) < 1, `${last.bpm.toFixed(1)} BPM`)
})

test('tap tempo moves the beat level: the house loop at 80 tracks at 160 until tapped', () => {
  const L = renderLoop('house', 80, 48000, 4), { x, ref } = loopSamples(L, 30)
  const plain = analyse(x, {}, 48000)
  assert.ok(Math.abs(plain.a.bpm() - 160) < 2, `untapped ${plain.a.bpm().toFixed(1)}`)
  let tapped = false
  const { a, beats } = analyse(x, {}, 48000, (an, t) => { if (!tapped && t > 10) { tapped = true; an.setTempoHint(80) } })
  assert.ok(Math.abs(a.bpm() - 80) < 1, `tapped ${a.bpm().toFixed(1)}`)
  assert.ok(scoreBeats(ref.filter(t => t > 16), beats.filter(t => t > 16), 0).f > 0.95)
})

test('runs at least 20× faster than real time', () => {
  const L = renderLoop('funk', 100, 48000, 4), { x } = loopSamples(L, 20)
  const t0 = performance.now(); analyse(x, { frames: true }, 48000)
  const speed = 20 / ((performance.now() - t0) / 1000)
  assert.ok(speed > 20, `${speed.toFixed(0)}× real time`)
})
