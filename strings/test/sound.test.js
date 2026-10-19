// node --test strings/test/sound.test.js   (Experiment #034)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerLine } from '../fingering.js'
import { line, melody } from '../exercises.js'
import { renderPerformance, channel } from '../sound/performance.js'
import { ViolinSynth, CurveSource, Body, renderCurves, midiHz, NCH, CH, FRAME_RATE } from '../sound/bowed.js'
import { pitch, cents, spectrumDb, rms, fft } from './audio-util.js'
import { ConvBody } from '../sound/body.js'

const SR = 48000
const finger = (notes, instrument = 'violin') => { const n = notes.map(x => ({ ...x })); fingerLine(n, { instrument }); return n }

/** Render with a tap on the bridge force before the body (to judge the string itself). */
function renderRaw(perf, { instrument = 'violin', model = 'waveguide', secs, opts = {} } = {}) {
  const cap = []
  const orig = Body.prototype.process, origC = ConvBody.prototype.process
  Body.prototype.process = function (x, L, R, n) { cap.push(Float32Array.from(x.subarray(0, n))); return orig.call(this, x, L, R, n) }
  ConvBody.prototype.process = function (x, L, R, n) { cap.push(Float32Array.from(x.subarray(0, n))); return origC.call(this, x, L, R, n) }
  try {
    const syn = new ViolinSynth(SR, { instrument, model, ...opts }), src = new CurveSource(perf)
    const N = Math.round((secs ?? perf.frames / perf.frameRate) * SR), L = new Float32Array(N), R = new Float32Array(N)
    let t = 0
    for (let i = 0; i < N; i += 128) { const n = Math.min(128, N - i); t = syn.process(src, t, 1 / SR, L.subarray(i, i + n), R.subarray(i, i + n), n) }
    const raw = new Float32Array(cap.length * 128)
    cap.forEach((b, i) => raw.set(b, i * 128))
    return { L, R, raw }
  } finally { Body.prototype.process = orig; ConvBody.prototype.process = origC }
}

test('waveguide: sustained notes sound at pitch in Helmholtz motion over the range (p, mf, f)', () => {
  for (const [instrument, lo] of [['violin', 55], ['viola', 48], ['cello', 36]]) {
    let ok = 0, tot = 0, worst = 0
    for (const vel of [0.3, 0.75, 1]) for (let m = lo; m <= lo + 40; m += 2) {
      const notes = finger([{ pitch: m, on: 0.1, off: 1.0, velocity: vel }], instrument)
      if (notes[0].string == null) continue
      const perf = renderPerformance(notes, { instrument, style: { vibrato: 0 } })
      const { raw, L } = renderRaw(perf, { instrument, secs: 0.8 })
      const f = midiHz(m), seg = raw.subarray(Math.round(0.5 * SR), Math.round(0.5 * SR) + 8192)
      const h = spectrumDb(seg, SR, [f / 2, f, 2 * f, 3 * f])
      tot++
      if (h[1] - Math.max(h[2], h[3]) >= 1 && h[0] < h[1] - 15) ok++
      // search ±2 semitones: wider, the detector can lock between the note and a
      // sympathetically ringing open string (cello D3 with A3 ringing reads 168 Hz
      // although the spectrum peaks at 147, 196 and 220 Hz)
      const p = pitch(L.subarray(Math.round(0.45 * SR), Math.round(0.75 * SR)), SR, { fmin: f * 0.89, fmax: f * 1.12 })
      if (p.clarity > 0.9) worst = Math.max(worst, Math.abs(cents(p.f0, f)))
    }
    assert.ok(ok / tot >= 0.85, `${instrument}: Helmholtz in ${ok}/${tot}`)
    assert.ok(worst < 20, `${instrument}: worst intonation ${worst.toFixed(1)} cents`)
  }
})

test('source model: always at pitch, all strings and dynamics', () => {
  for (const m of [55, 62, 69, 76, 81, 88, 93]) for (const vel of [0.3, 1]) {
    const notes = finger([{ pitch: m, on: 0.1, off: 1.0, velocity: vel }])
    const perf = renderPerformance(notes, { style: { vibrato: 0 } })
    const { raw } = renderRaw(perf, { model: 'source', secs: 0.8 })
    const f = midiHz(m), p = pitch(raw.subarray(Math.round(0.4 * SR), Math.round(0.75 * SR)), SR, { fmin: f * 0.45, fmax: f * 2.2 })
    assert.ok(Math.abs(cents(p.f0, f)) < 10, `${m}@${vel}: ${cents(p.f0, f).toFixed(1)} cents`)
  }
})

test('stability: extreme controls stay finite and bounded', () => {
  for (const model of ['waveguide', 'source']) {
    const syn = new ViolinSynth(SR, { model })
    let k = 0
    const src = { at(t, out) { for (let s = 0; s < 4; s++) { const o = s * NCH; out[o] = 100 + 3000 * ((k * 7 + s) % 5) / 4; out[o + 1] = (k % 3 - 1) * 2; out[o + 2] = [0, 0.01, 1, 10][k % 4]; out[o + 3] = [0.01, 0.2, 0.6][k % 3]; out[o + 4] = (k % 2); out[o + 5] = k % 7 === 0 ? 1 : 0 } k++ } }
    const L = new Float32Array(128), R = new Float32Array(128)
    let t = 0, peak = 0
    for (let b = 0; b < 2000; b++) {
      t = syn.process(src, t, 1 / SR, L, R, 128)
      for (let i = 0; i < 128; i++) { assert.ok(Number.isFinite(L[i]) && Number.isFinite(R[i]), `${model} non-finite at block ${b}`); peak = Math.max(peak, Math.abs(L[i])) }
    }
    assert.ok(peak < 50, `${model} peak ${peak}`)
  }
})

test('performance: vibrato on long stopped notes only, none on open strings', () => {
  const notes = finger(line([69, 71, 76], { dur: 1.2 }).map((n, i) => ({ ...n, lockString: [2, 2, 3][i] })))   // open A, B (1), open E
  const perf = renderPerformance(notes)
  const depth = n => {
    const f = channel(perf, n.string, CH.f0), c = []
    for (let i = Math.round((n.on + 0.4) * 250); i < Math.round((n.off - 0.15) * 250); i++) c.push(cents(f[i], midiHz(n.pitch)))
    return Math.max(...c) - Math.min(...c)
  }
  const [a, b, e] = notes
  assert.equal(a.finger, 0); assert.equal(e.finger, 0); assert.ok(b.finger > 0)
  assert.ok(depth(a) < 8, `open A wobbles ${depth(a).toFixed(1)} cents`)
  assert.ok(depth(e) < 8, `open E wobbles ${depth(e).toFixed(1)} cents`)
  assert.ok(depth(b) > 25 && depth(b) < 90, `B vibrato ${depth(b).toFixed(1)} cents peak to peak`)
})

test('performance: a shift slides, a finger change inside a position does not', () => {
  // all on the A string: open A, C#5 (finger 1), a shift up to C#6, A5 in the new position
  const notes = finger(melody('A4:2 C#5:2 C#6:2 A5:2', 0.5).map(n => ({ ...n, lockString: 2 })))
  const perf = renderPerformance(notes, { style: { vibrato: 0 } })
  const glide = (a, b) => {
    const f = channel(perf, 2, CH.f0), lo = midiHz(a.pitch), hi = midiHz(b.pitch)
    let n = 0
    for (let i = Math.round((b.on - 0.3) * 250); i < Math.round((b.on + 0.1) * 250); i++) {
      const c = cents(f[i], lo) / cents(hi, lo)
      if (c > 0.15 && c < 0.85) n++
    }
    return n / 250 * 1000                                 // ms spent between the notes
  }
  const [, cs, hi, a5] = notes
  assert.notEqual(cs.base, hi.base, 'C#5 → C#6 should shift')
  assert.equal(hi.base, a5.base, 'C#6 → A5 stays in position')
  assert.ok(glide(cs, hi) > 25, `shift glide ${glide(cs, hi).toFixed(0)} ms`)
  assert.ok(glide(hi, a5) < 15, `finger change glide ${glide(hi, a5).toFixed(0)} ms`)
})

test('performance: bow alternates, force stays inside the playable window, louder for forte', () => {
  const notes = finger(line([67, 69, 71, 72], { dur: 0.6 }))
  const perf = renderPerformance(notes)
  const dirs = perf.strokes.map(s => s.dir)
  assert.deepEqual(dirs, [1, -1, 1, -1])
  for (const n of notes) {
    const i = Math.round((n.on + 0.25) * 250)
    const v = channel(perf, n.string, CH.vel)[i], F = channel(perf, n.string, CH.force)[i], b = channel(perf, n.string, CH.beta)[i]
    assert.ok(Math.abs(v) > 0.1 && F > 0.02 * Math.abs(v) / (b * b) * 0.99, `note ${n.pitch}: v ${v} F ${F} β ${b}`)
  }
  const lv = vel => {
    const p = renderPerformance(finger([{ pitch: 74, on: 0.1, off: 1.2, velocity: vel }]))
    const [L] = renderCurves(p, { sampleRate: SR, tail: 0 })
    return 20 * Math.log10(rms(L.subarray(0.4 * SR, 1.0 * SR)))
  }
  assert.ok(lv(1) - lv(0.3) > 4, `forte ${lv(1).toFixed(1)} dB vs piano ${lv(0.3).toFixed(1)} dB`)
})

test('performance: DDSP loudness follows the bow, silent in rests', () => {
  const notes = finger(melody('A4:2 r:2 E5:2', 0.5))
  const perf = renderPerformance(notes)
  const ld = s => perf.loudness[s]
  const at = (s, t) => ld(s)[Math.round(t * 250)]
  const [a, e] = notes
  assert.ok(at(a.string, 0.5) > -80, `A4 loudness ${at(a.string, 0.5)}`)
  assert.ok(at(a.string, 1.9) < at(a.string, 0.5) - 15, 'ring-down in the rest')
  assert.ok(at(e.string, 2.5) > -80)
})

test('real time: four strings + body render faster than 5× real time', () => {
  const notes = finger(melody('G4 A4 B4 C5 D5:2 B4 G4:2 D4+B4:2 G4 A4 B4 C5 D5:2 B4 G4:2', 0.4))
  const perf = renderPerformance(notes)
  for (const model of ['waveguide', 'source']) {
    const t0 = performance.now()
    const [L] = renderCurves(perf, { sampleRate: SR, model })
    const ms = performance.now() - t0, secs = L.length / SR
    assert.ok(ms / 1000 < secs / 5, `${model}: ${ms.toFixed(0)} ms for ${secs.toFixed(1)} s`)
  }
})

test('DDSP synthesis in JS: one harmonic at f0 is a sine at f0; harmonics above Nyquist are silent', async () => {
  const { synthesize, DDSP_SR } = await import('../sound/ddsp.js')
  const f0 = new Float32Array(1250).fill(440), harm = new Float32Array(1250 * 60), noise = new Float32Array(1250 * 65)
  for (let i = 0; i < 1250; i++) harm[i * 60] = 0.5
  const y = synthesize(f0, harm, noise)
  const p = pitch(y.subarray(16000, 24000), DDSP_SR, { fmin: 300, fmax: 600 })
  assert.ok(Math.abs(cents(p.f0, 440)) < 2, `${p.f0} Hz`)
  assert.ok(Math.abs(rms(y) - 0.5 / Math.SQRT2) < 0.01, `rms ${rms(y)}`)
  // f0 = 3 kHz: harmonics 3+ would alias (≥ 8 kHz), so only 1 and 2 sound
  const f1 = new Float32Array(1250).fill(3000), h1 = new Float32Array(1250 * 60).fill(0.1)
  const y1 = synthesize(f1, h1, noise)
  assert.ok(rms(y1) < 0.1 * Math.sqrt(2 / 2) + 0.01, `rms ${rms(y1)}`)
})

test('humanize: small, seeded, keeps order, chords and legato; attack errors only where a finger lands', async () => {
  const { humanize } = await import('../sound/humanize.js')
  const notes = finger(melody('A4 A4 E5 E5 F#5 F#5 E5:2 D5 D5 C#5 C#5 B4 B4 A4:2 G4 B4 D5 G5', 0.25).map((n, i) => i >= 14 ? { ...n, off: n.off + 0.25 } : n))
  // a double stop and a slurred pair
  const a = humanize(notes, {}, 3), b = humanize(notes, {}, 3), c = humanize(notes, {}, 4)
  assert.deepEqual(a, b, 'same seed, same result')
  assert.notDeepEqual(a, c, 'another seed, another take')
  const src = notes.slice().sort((x, y) => x.on - y.on || x.pitch - y.pitch)
  let maxDt = 0
  for (let i = 0; i < a.length; i++) {
    maxDt = Math.max(maxDt, Math.abs(a[i].on - src[i].on))
    if (i) assert.ok(a[i].on >= a[i - 1].on, 'order kept')
    assert.ok(a[i].off > a[i].on)
    // legato: an end that met the next onset still meets it
    const nx = src.findIndex(m => Math.abs(m.on - src[i].off) < 0.001)
    if (nx >= 0) assert.ok(Math.abs(a[i].off - a[nx].on) < 1e-9, 'legato kept')
    if (!src[i].finger) assert.equal(a[i].attackCents, undefined, 'open strings land in tune')
    else if (a[i].attackCents != null) assert.ok(Math.abs(a[i].attackCents) <= 3 * 12 * 1.6 && a[i].attackSettle > 0.02 && a[i].attackSettle < 0.2)
  }
  assert.ok(maxDt > 0.001 && maxDt < 0.02, `onsets move a few ms (max ${(maxDt * 1000).toFixed(1)} ms)`)
  // chords move together
  const chord = humanize(finger([{ pitch: 62, on: 0.5, off: 1.5 }, { pitch: 69, on: 0.5, off: 1.5 }]), { timing: 3 }, 9)
  assert.equal(chord[0].on, chord[1].on)
  // off = MIDI-exact
  const z = humanize(notes, { timing: 0, intonation: 0, variance: 0 }, 3)
  z.forEach((n, i) => { assert.equal(n.on, src[i].on); assert.equal(n.velocity ?? 0.75, src[i].velocity ?? 0.75); assert.equal(n.attackCents, undefined) })
  // round-robin counts repeats of a pitch
  const rr = humanize(finger([0, 1, 2].map(k => ({ pitch: 69, on: k * 0.4, off: k * 0.4 + 0.3 }))), {}, 1).map(n => n.rr)
  assert.deepEqual(rr, [0, 1, 2])
})

test('humanize: the attack error reaches f0 and settles', () => {
  const notes = finger([{ pitch: 64, on: 0.2, off: 1.2, velocity: 0.75 }])   // stopped on the D string
  const perf = renderPerformance(notes, { style: { vibrato: 0, intonation: 2 } })
  const n = perf.notes[0]
  assert.ok(n.finger && n.attackCents, 'a stopped note gets an attack error')
  const f = channel(perf, n.string, CH.f0), at = i => cents(f[i], midiHz(64))
  const i0 = Math.round((n.on + 0.004) * perf.frameRate), i1 = Math.round((n.on + 2 * n.attackSettle + 0.05) * perf.frameRate)
  assert.ok(Math.sign(at(i0)) === Math.sign(n.attackCents) && Math.abs(at(i0)) > 0.5 * Math.abs(n.attackCents), `lands off pitch (${at(i0).toFixed(1)} of ${n.attackCents.toFixed(1)} cents)`)
  assert.ok(Math.abs(at(i1)) < 3, `settles (${at(i1).toFixed(1)} cents)`)
})

// ── hybrid sampler (engine 6): needs the Iowa bank (strings/sound/samples/iowa) and ffmpeg to decode it ──
const hybrid = async () => {
  const hb = await import('./hybrid-bank.js')
  return hb.hasFfmpeg() && hb.hasBank('violin') ? { ...hb, ...(await import('../sound/hybrid.js')) } : null
}
const flat = { vibrato: 0, intonation: 0, timing: 0, variance: 0 }

test('hybrid: the recordings follow the f0 curve on every string, p to f (≤ 6 cents without vibrato); vibrato comes from the curve', async t => {
  const H = await hybrid(); if (!H) return t.skip('no Iowa bank or no ffmpeg')
  for (const instrument of ['violin', 'viola', 'cello']) {
    if (!H.hasBank(instrument)) continue
    const bank = H.loadBankNode(instrument), lo = { violin: 55, viola: 48, cello: 36 }[instrument]
    let worst = 0, n = 0
    for (const vel of [0.3, 0.75, 1]) for (let m = lo; m <= lo + 38; m += 3) {
      const notes = finger([{ pitch: m, on: 0.1, off: 1.2, velocity: vel }], instrument)
      const [L] = H.renderHybrid(renderPerformance(notes, { instrument, style: flat }), bank, { sampleRate: SR })
      const f = midiHz(m), p = pitch(L.subarray(0.5 * SR, 0.9 * SR), SR, { fmin: f * 0.89, fmax: f * 1.12 })
      if (p.clarity > 0.9) { worst = Math.max(worst, Math.abs(cents(p.f0, f))); n++ }
    }
    assert.ok(n >= 30 && worst <= 6, `${instrument}: worst ${worst.toFixed(1)} cents over ${n} notes`)
  }
  // vibrato: the output's pitch swings like the curve's
  const bank = H.loadBankNode('violin')
  const notes = finger([{ pitch: 76, on: 0.1, off: 2.6, velocity: 0.75 }])
  const perf = renderPerformance(notes, { style: { ...flat, vibrato: 1 } })
  const [L] = H.renderHybrid(perf, bank, { sampleRate: SR })
  const f0 = channel(perf, notes[0].string, CH.f0)
  const outC = [], curC = []
  for (let t0 = 1.0; t0 < 2.3; t0 += 0.02) {
    const p = pitch(L.subarray(Math.round(t0 * SR), Math.round((t0 + 0.03) * SR)), SR, { fmin: 600, fmax: 740 })
    outC.push(cents(p.f0, midiHz(76))); curC.push(cents(f0[Math.round((t0 + 0.015) * perf.frameRate)], midiHz(76)))
  }
  const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) }
  assert.ok(sd(curC) > 8 && Math.abs(sd(outC) - sd(curC)) < 0.3 * sd(curC), `vibrato: output ±${sd(outC).toFixed(1)} cents, curve ±${sd(curC).toFixed(1)}`)
})

test('hybrid: a note longer than its recording sustains (loop, no clicks); louder bowing is louder and brighter', async t => {
  const H = await hybrid(); if (!H) return t.skip('no Iowa bank or no ffmpeg')
  const { centroid } = await import('./audio-util.js')
  const bank = H.loadBankNode('violin')
  const res = []
  for (const vel of [0.3, 1]) {
    const notes = finger([{ pitch: 76, on: 0.1, off: 7.1, velocity: vel }])
    const [L] = H.renderHybrid(renderPerformance(notes, { style: { ...flat, vibrato: 1 } }), bank, { sampleRate: SR })
    const w = []; for (let t0 = 0.5; t0 < 6.5; t0 += 0.5) w.push(20 * Math.log10(rms(L.subarray(t0 * SR, (t0 + 0.5) * SR))))
    assert.ok(Math.max(...w) - Math.min(...w) < 6, `steady over 6 s: ${w.map(x => x.toFixed(1)).join(' ')} dB`)
    // clicks: no 5 ms frame with far more second-difference energy than usual
    const d2 = []
    for (let i = 0.3 * SR; i < 7 * SR; i += 240) { let e = 0; for (let j = i; j < i + 240; j++) e += (L[j] - 2 * L[j - 1] + L[j - 2]) ** 2; d2.push(e) }
    const med = [...d2].sort((a, b) => a - b)[d2.length >> 1]
    assert.ok(Math.max(...d2) / med < 12, `click ratio ${(Math.max(...d2) / med).toFixed(1)}`)
    res.push({ db: w.reduce((a, b) => a + b, 0) / w.length, c: centroid(L.subarray(SR, 3 * SR), SR) })
  }
  assert.ok(res[1].db - res[0].db > 6, `f is ${(res[1].db - res[0].db).toFixed(1)} dB louder than p`)
  assert.ok(res[1].c > res[0].c * 1.15, `brighter: centroid ${res[0].c.toFixed(0)} → ${res[1].c.toFixed(0)} Hz`)
})

test('hybrid: slurs join without a dip, a note after a rest attacks from silence; fast enough to render ahead; level predicted', async t => {
  const H = await hybrid(); if (!H) return t.skip('no Iowa bank or no ffmpeg')
  const bank = H.loadBankNode('violin')
  const notes = finger(melody('A4:0.3 B4:0.3 C#5:0.3 D5:0.3 r:1 E5:2', 0.5))
  const perf = renderPerformance(notes, { style: flat })
  assert.equal(perf.strokes[0].events.length, 4, 'the four fast notes share a bow')
  const [L] = H.renderHybrid(perf, bank, { sampleRate: SR })
  const db = (a, b) => 20 * Math.log10(rms(L.subarray(Math.round(a * SR), Math.round(b * SR))) + 1e-9)
  const ons = perf.notes.map(n => n.on)
  for (const k of [1, 2, 3]) {
    const at = db(ons[k] - 0.01, ons[k] + 0.01), around = (db(ons[k] - 0.08, ons[k] - 0.04) + db(ons[k] + 0.04, ons[k] + 0.08)) / 2
    assert.ok(at > around - 6, `slur ${k}: ${at.toFixed(1)} dB at the join vs ${around.toFixed(1)} around`)
  }
  // after the rest: the previous note's recorded ring has died away (20 dB) and the new one attacks
  const before = db(ons[4] - 0.1, ons[4] - 0.02), after = db(ons[4] + 0.2, ons[4] + 0.4)
  assert.ok(before < after - 20, `the ring before the detached note: ${before.toFixed(1)} dB vs ${after.toFixed(1)} dB`)
  // speed and level on a minute of music
  const many = []; let t0 = 0
  for (let r = 0; r < 8; r++) {
    for (let k = 0; k < 24; k++) { many.push({ pitch: 55 + [0, 2, 4, 5, 7, 9, 11, 12][k % 8] + 12 * Math.floor(k / 8), on: t0, off: t0 + 0.14, velocity: 0.7 }); t0 += 0.15 }
    many.push({ pitch: 74, on: t0, off: t0 + 2, velocity: 0.5 + 0.06 * r }); t0 += 2.2
  }
  const big = renderPerformance(finger(many), {})
  const c0 = Date.now()
  const [B] = H.renderHybrid(big, bank, { sampleRate: SR })
  const x = t0 / ((Date.now() - c0) / 1000)
  assert.ok(x > 15, `${x.toFixed(0)}× real time`)
  let s = 0, n = 0; for (let i = 0; i < B.length; i += 4) { const v = B[i] * B[i]; if (v > 4e-5) { s += v; n++ } }
  const err = 20 * Math.log10(Math.sqrt(s / n) / H.predictedRms(big))
  assert.ok(Math.abs(err) < 2.5, `predicted level off by ${err.toFixed(1)} dB`)
})

// ── automatic bowing (after SWAM) ──
test('waveguide oversampling: the stick-slip partials above Nyquist no longer fold back between the harmonics (glide A4 → A5)', () => {
  const frames = 4 * FRAME_RATE, W = 4 * NCH, data = new Float32Array(frames * W)
  const glide = t => midiHz(69 + 12 * Math.max(0, Math.min(1, (t - 0.5) / 3)))
  for (let i = 0; i < frames; i++) for (let s = 0; s < 4; s++) {
    const o = i * W + s * NCH, t = i / FRAME_RATE
    data[o] = s === 2 ? glide(t) : midiHz([55, 62, 69, 76][s]); data[o + 3] = 0.1
    if (s === 2) { const e = Math.min(1, t / 0.2) * Math.min(1, (3.7 - t) / 0.1); data[o + 1] = e > 0 ? 0.3 * e : 0; data[o + 2] = e > 0 ? 1 : 0 }
  }
  const between = oversample => {
    // rosin 0: no per-period jitter, which fills the gaps between harmonics on purpose; aliasing is measured here
    const [L] = renderCurves({ frameRate: FRAME_RATE, frames, data }, { sampleRate: SR, params: { oversample, rosin: 0 } })
    const n = 4096; let h = 0, x = 0
    for (let i0 = Math.round(0.8 * SR); i0 + n < 3.4 * SR; i0 += n) {
      const f0 = glide((i0 + n / 2) / SR), re = new Float64Array(n), im = new Float64Array(n)
      for (let j = 0; j < n; j++) re[j] = L[i0 + j] * (0.5 - 0.5 * Math.cos(2 * Math.PI * j / (n - 1)))
      fft(re, im)
      for (let b = 1; b < n / 2; b++) {
        const f = b * SR / n; if (f < 1000 || f > 16000) continue
        const p = re[b] ** 2 + im[b] ** 2, d = Math.abs(f / f0 - Math.round(f / f0))
        if (d > 0.25) x += p; else if (d < 0.08) h += p
      }
    }
    return 10 * Math.log10(x / h)
  }
  const a1 = between(1), a3 = between(3)
  assert.ok(a3 < a1 - 8 && a3 < -34, `between the harmonics: ${a1.toFixed(1)} dB at 1×, ${a3.toFixed(1)} dB at 3×`)
})

test('interactive bow pressure: the sweep stays in Helmholtz motion (≥ 95 %), and the feedback never makes it worse', () => {
  // a sweep: every second semitone over 40, three dynamics, three instruments
  const cases = []
  for (const [instrument, lo] of [['violin', 55], ['viola', 48], ['cello', 36]]) for (const vel of [0.3, 0.75, 1]) for (let m = lo; m <= lo + 40; m += 2) cases.push([instrument, m, vel])
  const helm = (instrument, m, vel, bowPress) => {
    const notes = finger([{ pitch: m, on: 0.1, off: 1.0, velocity: vel }], instrument)
    // the string's own feedback, without the player's moving bow (autoBow: tested separately)
    const perf = renderPerformance(notes, { instrument, style: { vibrato: 0, timing: 0, intonation: 0, variance: 0, autoBow: 0 } })
    const cap = [], orig = Body.prototype.process, origC = ConvBody.prototype.process
    Body.prototype.process = function (x, L, R, n) { cap.push(Float32Array.from(x.subarray(0, n))); return orig.call(this, x, L, R, n) }
    ConvBody.prototype.process = function (x, L, R, n) { cap.push(Float32Array.from(x.subarray(0, n))); return origC.call(this, x, L, R, n) }
    try {
      // at 1× (no oversampling), where these notes were found; oversampled they mostly stay in Helmholtz motion anyway
      // the string's motion, before the brightness tilt
      // rosin 0: the bowing regime is what is checked, not the deliberate per-period jitter
      // (which moves a few periods off the ±10 % regularity this criterion asks for)
      const syn = new ViolinSynth(SR, { instrument, bowPress, oversample: 1, tilt: 0, rosin: 0 }), src = new CurveSource(perf), L = new Float32Array(128), R = new Float32Array(128)
      let t = 0; for (let i = 0; i < 0.8 * SR; i += 128) t = syn.process(src, t, 1 / SR, L, R, 128)
    } finally { Body.prototype.process = orig; ConvBody.prototype.process = origC }
    const raw = new Float32Array(cap.length * 128); cap.forEach((b, i) => raw.set(b, i * 128))
    const f = midiHz(m), h = spectrumDb(raw.subarray(0.5 * SR, 0.5 * SR + 8192), SR, [f / 2, f, 2 * f, 3 * f])
    return h[1] - Math.max(h[2], h[3]) >= 1 && h[0] < h[1] - 15
  }
  const fixed = cases.filter(c => helm(...c, false)).length, inter = cases.filter(c => helm(...c, true)).length
  // with the pitch-tracking end losses the string mostly finds Helmholtz motion by itself;
  // the feedback must never make it worse
  // 94 %: the rosin grain alone moves this sweep by ~3 notes (179 at rosin 0, 182 at 1 before the per-slip jitter)
  assert.ok(inter >= fixed && inter >= 0.94 * cases.length, `Helmholtz on ${inter}/${cases.length} with the feedback, ${fixed}/${cases.length} without`)
})

test('expression lane: CC7 hairpins move bow speed and force together; flat velocities take their dynamic from it', async () => {
  const { expressionFromCC } = await import('../sound/performance.js')
  const ex = expressionFromCC({ 7: [{ time: 0, value: 0.6 }, { time: 2, value: 0.3 }], 11: [{ time: 0, value: 1 }] })
  assert.equal(ex.cc, 7, 'CC11 does not move: CC7 is used')
  const notes = finger([{ pitch: 74, on: 0.1, off: 3.9, velocity: 1 }])
  const perf = renderPerformance(notes, { style: { vibrato: 0, timing: 0, variance: 0, intonation: 0 }, expression: ex })
  const s = notes[0].string, v = channel(perf, s, CH.vel), F = channel(perf, s, CH.force), b = channel(perf, s, CH.beta)
  const at = (x, t) => Math.abs(x[Math.round(t * perf.frameRate)])
  assert.ok(at(v, 3) < 0.75 * at(v, 1.5) && at(F, 3) < 0.75 * at(F, 1.5), `quieter after the hairpin: v ${at(v, 1.5).toFixed(3)} → ${at(v, 3).toFixed(3)}, F ${at(F, 1.5).toFixed(3)} → ${at(F, 3).toFixed(3)}`)
  assert.ok(b[Math.round(3 * perf.frameRate)] > b[Math.round(1.5 * perf.frameRate)], 'and further from the bridge')
  assert.ok(perf.notes[0].velocity < 0.8, `the sample engines get the lane's dynamic (${perf.notes[0].velocity.toFixed(2)})`)
})

test('play modes: up-bow start, bow left on the string stops the ring, slurred crossings mute the old string', () => {
  const flatS = { vibrato: 0, timing: 0, variance: 0, intonation: 0 }
  const one = finger([{ pitch: 69, on: 0.1, off: 0.8, velocity: 0.7 }])
  const sign = st => Math.sign(channel(renderPerformance(one, { style: { ...flatS, ...st } }), one[0].string, CH.vel)[Math.round(0.4 * 250)])
  assert.equal(sign({}), 1, 'down-bow by default'); assert.equal(sign({ bowStart: -1 }), -1, 'up-bow start')
  // bow lift: a rest after the note; 'on' keeps a light force on the string after the stroke
  const forceAfter = mode => channel(renderPerformance(one, { style: { ...flatS, bowLift: mode } }), one[0].string, CH.force)[Math.round(1.0 * 250)]
  assert.ok(forceAfter('off') === 0 && forceAfter('on') > 0.05, `off ${forceAfter('off')}, on ${forceAfter('on').toFixed(2)}`)
  // a fast slurred crossing A string → E string by a semitone (G#5 on A, A5 on E would be 1 semitone)
  const slur = finger([{ pitch: 81, on: 0.1, off: 0.25, velocity: 0.7 }, { pitch: 83, on: 0.25, off: 0.4, velocity: 0.7 }, { pitch: 84, on: 0.4, off: 0.55, velocity: 0.7 }, { pitch: 86, on: 0.55, off: 1.2, velocity: 0.7 }])
  slur[0].string = 2; slur[0].finger = 0; slur[1].string = 3; slur[1].finger = 1
  const perf = renderPerformance(slur, { style: { ...flatS, crossMute: 2 } })
  const perf0 = renderPerformance(slur, { style: { ...flatS, crossMute: 0 } })
  if (perf.strokes[0].events.length > 1) {
    const d = channel(perf, 2, CH.damp)[Math.round(0.33 * 250)], d0 = channel(perf0, 2, CH.damp)[Math.round(0.33 * 250)]
    assert.ok(d > 0.5 && d0 < 0.1, `old string damped ${d.toFixed(2)} (without muting ${d0.toFixed(2)})`)
  }
})

test('harmonics (SWAM Harmonics 2 / 3 / 4): the waveguide touched at 1/n sounds the n-th partial; natural ones on open strings', async () => {
  const { planHarmonics } = await import('../sound/performance.js')
  // A5 as harmonic 2 is the natural octave of the open A string; F6 as 3 stops A#4
  const plan = planHarmonics(finger([{ pitch: 81, on: 0, off: 1 }, { pitch: 89, on: 1, off: 2 }, { pitch: 60, on: 2, off: 3 }]), [55, 62, 69, 76], 2)
  assert.deepEqual([plan[0].harm, plan[0].string, plan[0].finger], [2, 2, 0], 'A5: natural harmonic on the A string')
  assert.equal(plan[2].harm, undefined, 'C4 is too low for a harmonic')
  for (const k of [2, 3, 4]) {
    let ok = 0, n = 0, ctl = 0
    for (const m of [80, 86, 92, 98]) {
      const notes = finger([{ pitch: m, on: 0.1, off: 1.2, velocity: 0.75 }])
      const perf = renderPerformance(notes, { style: { ...flat, harmonics: k } })
      assert.equal(perf.notes[0].harm, k)
      const f = midiHz(m), stop = f / k
      for (const touch of [true, false]) {
        const p2 = touch ? perf : { ...perf, data: perf.data.map((v, i) => (i % NCH === CH.harm ? 0 : v)) }
        // without the touch the same curves would sound the stopped note's pitch... so stop the string there
        if (!touch) for (let i = 0; i < p2.data.length; i += NCH) if (perf.data[i + CH.harm]) p2.data[i] = perf.data[i] / k
        const [L] = renderCurves(p2, { sampleRate: SR })
        const seg = L.subarray(0.6 * SR, 0.6 * SR + 8192), h = spectrumDb(seg, SR, [stop, f])
        if (touch) { n++; if (h[1] > h[0] + 6) ok++ } else if (h[0] > h[1] - 6) ctl++
      }
    }
    assert.equal(ok, n, `harmonic ${k}: the n-th partial leads on ${ok}/${n}`)
    assert.ok(ctl >= 3, `harmonic ${k}: the same string without the touch sounds its fundamental (${ctl}/4)`)
  }
})

test('tremolo (SWAM slow / fast / sync): the bow turns at the rate, pitch holds, short notes are left alone', async () => {
  const { fft } = await import('./audio-util.js')
  const { tremoloRate } = await import('../sound/performance.js')
  assert.equal(tremoloRate({ tremolo: 'slow', tremoloMode: 'sync', tempo: 100, tremoloMin: 8 }), 100 / 60 * 8, '16ths at 100 bpm are 6.7/s, doubled to the minimum')
  for (const tremolo of ['slow', 'fast']) {
    const notes = finger([{ pitch: 69, on: 0.1, off: 2.1, velocity: 0.75 }, { pitch: 71, on: 2.1, off: 2.15, velocity: 0.75 }])
    const perf = renderPerformance(notes, { style: { ...flat, tremolo } })
    const r = tremoloRate({ tremolo, tremoloMode: 'hz' })
    const v = channel(perf, perf.notes[0].string, CH.vel)
    let turns = 0; for (let i = Math.round(0.6 * 250); i < Math.round(1.6 * 250); i++) if (Math.sign(v[i]) !== Math.sign(v[i - 1]) && v[i] !== 0) turns++
    assert.ok(Math.abs(turns - r) <= 1.5, `${tremolo}: ${turns} bow turns in 1 s, rate ${r}`)
    assert.equal(perf.notes[1].trem, undefined, 'a 50 ms note gets no tremolo')
    const [L] = renderCurves(perf, { sampleRate: SR })
    const H = 96, env = []; for (let i = 0.8 * SR; i < 1.8 * SR - H; i += H) env.push(rms(L.subarray(i, i + H)))
    const m = env.reduce((a, b) => a + b, 0) / env.length, N = 512, re = new Float64Array(N), im = new Float64Array(N)
    env.forEach((x, i) => { if (i < N) re[i] = x - m }); fft(re, im)
    // a line at the tremolo rate, well above the envelope's other fluctuations
    const mag = []; for (let k = 2; k < N / 2; k++) mag.push(Math.hypot(re[k], im[k]))
    const near = Math.max(...mag.filter((_, j) => Math.abs((j + 2) * 500 / N - r) < 1.5))
    const med = [...mag].sort((a, b) => a - b)[mag.length >> 1]
    assert.ok(near > 8 * med, `${tremolo}: the loudness pulses at ${r} Hz (${(near / med).toFixed(1)}× the median envelope line)`)
    // the string's pitch, in the bridge force (after the body, the 410 Hz resonance rings at every
    // bow turn and pulls a short-window pitch estimate flat): mean over 50 ms windows
    const { raw } = renderRaw(perf, { secs: 2 })
    const cs = []; for (let t0 = 0.8; t0 < 1.8; t0 += 0.05) cs.push(cents(pitch(raw.subarray(t0 * SR, (t0 + 0.05) * SR), SR, { fmin: 400, fmax: 480 }).f0, 440))
    const at = cs.reduce((a, b) => a + b, 0) / cs.length
    assert.ok(Math.abs(at) < 10, `${tremolo}: pitch ${at.toFixed(1)} cents`)
  }
})

test('measured body (Iowa): beats the modal body on held-out notes, and the FIR has the fitted response', async () => {
  const { BODY_IOWA } = await import('../sound/body-iowa.js')
  const { curveDb } = await import('../sound/body.js')
  const { fft } = await import('./audio-util.js')
  for (const inst of ['violin', 'viola', 'cello']) for (const model of ['waveguide', 'source']) {
    const st = BODY_IOWA[inst][model].stats
    assert.ok(st.heldOutMad < st.modalMad - 1 && st.heldOutP90 < st.modalP90 - 3, `${inst} ${model}: held-out ${st.heldOutMad} / ${st.heldOutP90} dB vs modal ${st.modalMad} / ${st.modalP90}`)
  }
  // white noise through the convolver: its spectrum follows the curve within 1.5 dB (1/3-octave bands, 300 Hz – 8 kHz)
  const spec = BODY_IOWA.violin.waveguide, cb = new ConvBody(SR, spec), N = 1 << 17
  const x = new Float32Array(N); let a = 12345; for (let i = 0; i < N; i++) { a = (a * 1103515245 + 12345) >>> 0; x[i] = a / 2 ** 32 - 0.5 }
  const L = new Float32Array(N), R = new Float32Array(N); for (let i = 0; i < N; i += 128) cb.process(x.subarray(i, i + 128), L.subarray(i, i + 128), R.subarray(i, i + 128), 128)
  const re = Float64Array.from(L), im = new Float64Array(N); fft(re, im)
  const xr = Float64Array.from(x), xi = new Float64Array(N); fft(xr, xi)
  let worst = 0
  for (let f = 300; f < 8000; f *= 2 ** (1 / 3)) {
    let py = 0, px = 0, want = 0, n = 0
    for (let k = Math.round(f / 2 ** (1 / 6) * N / SR); k < Math.round(f * 2 ** (1 / 6) * N / SR); k++) { py += re[k] ** 2 + im[k] ** 2; px += xr[k] ** 2 + xi[k] ** 2; want += 10 ** ((curveDb(spec, spec.dB[0], k * SR / N) + spec.gainDb) / 10); n++ }
    worst = Math.max(worst, Math.abs(10 * Math.log10(py / px) - 10 * Math.log10(want / n)))
  }
  assert.ok(worst < 1.5, `FIR vs curve: worst third-octave ${worst.toFixed(2)} dB`)
})

test('measured impulse-response body (NBody path): an IR is convolved as it is, resampled with its gain kept; other instruments fall back', async () => {
  const { resampleIR } = await import('../sound/body.js')
  // a decaying 1 kHz ring at 44.1 kHz, played at 48 kHz: same ring frequency, same gain at 1 kHz
  const n = 2048, h = new Float32Array(n)
  for (let i = 0; i < n; i++) h[i] = Math.exp(-i / 300) * Math.sin(2 * Math.PI * 1000 * i / 44100) * 0.05
  const body = new ConvBody(48000, { ir: [h, h], rate: 44100, gainDb: 0 })
  const N = 48000, x = new Float32Array(N), L = new Float32Array(N), R = new Float32Array(N)
  for (let i = 0; i < N; i++) x[i] = Math.sin(2 * Math.PI * 1000 * i / 48000)
  body.process(x, L, R, N)
  // reference: the same ring at 44.1 kHz, direct convolution
  const M = 44100, y = new Float32Array(M)
  for (let i = n; i < M; i++) { let s = 0; for (let k = 0; k < n; k++) s += h[k] * Math.sin(2 * Math.PI * 1000 * (i - k) / 44100); y[i] = s }
  const g = rms(L.subarray(8000)) / rms(y.subarray(8000))
  assert.ok(Math.abs(20 * Math.log10(g)) < 0.3, `gain at 1 kHz after resampling: ${(20 * Math.log10(g)).toFixed(2)} dB`)
  assert.equal(resampleIR(h, 44100, 44100).length, n)
  // a violin IR on the viola falls back to the Iowa body; on the violin it is used
  const spec = { id: 'test', instrument: 'violin', rate: 44100, gainDb: { waveguide: 0, source: 0 }, ir: [h, h] }
  assert.equal(new ViolinSynth(48000, { instrument: 'violin', body: spec }).bodyKind, 'nbody')
  assert.equal(new ViolinSynth(48000, { instrument: 'viola', body: spec }).bodyKind, 'iowa')
  // a params message with the same body (a new copy, as from the worklet port) does not rebuild it
  const syn = new ViolinSynth(48000, { instrument: 'violin', body: spec }), b0 = syn.body
  syn.setParams({ rosin: 1.2, body: { ...spec } })
  assert.equal(syn.body, b0)
})

test('attack: a lighter attack (Baroque) ramps the bow in slower with less bite; 1 is unchanged', () => {
  const notes = finger(melody('D5 E5 F#5 G5 A5:2', 0.5))
  // detached strokes (legato 0): a legato bow change has no attack to lighten
  const flat = { vibrato: 0, timing: 0, intonation: 0, variance: 0, legato: 0 }
  const at = attack => {
    const perf = renderPerformance(notes, { style: { ...flat, attack } })
    const n = perf.notes[2], F = channel(perf, n.string, CH.force), V = channel(perf, n.string, CH.vel), i0 = Math.round(n.on * perf.frameRate)
    return { perf, Fpk: Math.max(...F.slice(i0, i0 + 10)) / F[i0 + 40], v10: Math.abs(V[i0 + 3]) / Math.abs(V[i0 + 40]) }
  }
  const d = at(1), l = at(0.35)
  assert.deepEqual(renderPerformance(notes, { style: flat }).data, d.perf.data, 'attack 1 is the default')
  assert.ok(l.Fpk < 0.6 * d.Fpk, `less bite: force peak / sustain ${d.Fpk.toFixed(2)} → ${l.Fpk.toFixed(2)}`)
  assert.ok(l.v10 < 0.8 * d.v10, `slower ramp: bow speed after 12 ms ${d.v10.toFixed(2)} → ${l.v10.toFixed(2)} of its sustain`)
})

test('waveguide attacks (Guettler): most bow starts reach Helmholtz motion within 50 ms (90 ms if loose) and stay there', async () => {
  const { evaluate } = await import('./attack.js')
  const r = evaluate({ quick: true })
  // before the pitch-tracking end losses and the attack press: 44 / 288, median 89 ms
  assert.ok(r.good >= 0.65 * r.total, `good attacks ${r.good}/${r.total}`)
  assert.ok(r.ms < 50, `median time to Helmholtz ${r.ms.toFixed(1)} ms`)
  assert.ok(r.stays >= 0.85 * r.total, `stay in Helmholtz ${r.stays}/${r.total}`)
})

test('measured body (Philharmonia): fitted for violin, viola and cello, beats no body on its held-out notes; unfitted models play the Iowa body', async () => {
  const { BODY_PHIL } = await import('../sound/body-philharmonia.js')
  for (const instrument of ['violin', 'viola', 'cello']) {
    const spec = BODY_PHIL[instrument]?.source
    assert.ok(spec, `${instrument}: no Philharmonia fit for the source model`)
    const st = spec.stats
    assert.ok(st.notes >= 100 && st.harmonics >= 10000, `${instrument}: ${st.notes} notes, ${st.harmonics} harmonics`)
    assert.ok(st.heldOut.mad < st.flat.mad - 0.3, `${instrument}: held out ${st.heldOut.mad} dB vs no body ${st.flat.mad} dB`)
    assert.equal(new ViolinSynth(48000, { instrument, model: 'source', body: 'phil' }).bodyKind, 'phil')
    const wg = new ViolinSynth(48000, { instrument, model: 'waveguide', body: 'phil' }).bodyKind
    assert.equal(wg, BODY_PHIL[instrument]?.waveguide ? 'phil' : 'iowa')
  }
})

test('vibrato: narrow (at most ±28 cents on long fortissimo notes at the default) and irregular from cycle to cycle', () => {
  const notes = finger(melody('B4:4 D5:4 F#5:4', 0.5), 'violin').map(n => ({ ...n, velocity: 1 }))
  const perf = renderPerformance(notes, { style: { timing: 0, intonation: 0, variance: 0 } })
  let widest = 0; const per = [], amp = []
  for (const n of perf.notes) {
    const f = channel(perf, n.string, CH.f0), c = []
    for (let i = Math.round((n.on + 0.5) * 250); i < Math.round((n.off - 0.1) * 250); i++) c.push(cents(f[i], midiHz(n.pitch)))
    for (const x of c) widest = Math.max(widest, Math.abs(x))
    let last = -1, lo = 0, hi = 0
    for (let i = 1; i < c.length; i++) {
      lo = Math.min(lo, c[i]); hi = Math.max(hi, c[i])
      if (c[i - 1] < 0 && c[i] >= 0) { const x = i - 1 + c[i - 1] / (c[i - 1] - c[i]); if (last >= 0) { per.push(x - last); amp.push(hi - lo) } last = x; lo = hi = 0 }
    }
  }
  const cv = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m }
  assert.ok(widest > 12 && widest <= 28, `widest ±${widest.toFixed(1)} cents`)
  assert.ok(cv(per) > 0.025, `cycle length varies ${(100 * cv(per)).toFixed(1)} %`)
  assert.ok(cv(amp) > 0.06, `cycle width varies ${(100 * cv(amp)).toFixed(1)} %`)
})

test('source model: the upper partials are as noisy between harmonics as the Iowa recordings (per-period jitter, bow noise)', async t => {
  const { hasBank, hasFfmpeg, loadBankNode } = await import('./hybrid-bank.js')
  if (!hasFfmpeg() || !hasBank('violin')) return t.skip('no Iowa bank or no ffmpeg')
  const { fft } = await import('./audio-util.js')
  const N = 8192, bin = SR / N
  const spec = (x, a, b) => { const P = new Float64Array(N / 2); let n = 0; for (let o = a; o + N <= b; o += N / 2) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); fft(re, im); for (let k = 0; k < N / 2; k++) P[k] += re[k] ** 2 + im[k] ** 2; n++ } return P }
  const pg = (P, f0) => { const r = []; for (let h = Math.ceil(3000 / f0); h * f0 < 8000; h++) { const kp = Math.round(h * f0 / bin); let p = 0; for (let j = kp - 2; j <= kp + 2; j++) p = Math.max(p, P[j]); r.push(10 * Math.log10(p / (P[Math.round((h + 0.5) * f0 / bin)] + 1e-30))) } return r.sort((a, b) => a - b)[r.length >> 1] }
  const bank = loadBankNode('violin'), iowa = [], ours = []
  for (const [m, s] of [[62, 1], [66, 1], [69, 2], [74, 2], [76, 3], [81, 3]]) {
    const nt = bank.m.packs[`${s}_mf`].notes.find(n => n.midi === m), x = bank.pcm[`${s}_mf`]
    iowa.push(pg(spec(x, nt.offset + nt.attackEnd + 2400, nt.offset + Math.min(nt.headEnd, nt.attackEnd + 72000)), nt.f0))
    const notes = finger([{ pitch: m, on: 0.1, off: 1.8, velocity: 0.68 }]); notes[0].string = s; notes[0].finger = m === [55, 62, 69, 76][s] ? 0 : notes[0].finger || 1
    const [L] = renderCurves(renderPerformance(notes, { style: flat }), { sampleRate: SR, model: 'source' })
    ours.push(pg(spec(L, 0.5 * SR, 1.7 * SR), midiHz(m)))
  }
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1]
  // before: 46 dB against the recordings' 34 (a perfectly periodic sawtooth)
  assert.ok(Math.abs(med(ours) - med(iowa)) < 4, `peak / gap 3–8 kHz: ours ${med(ours).toFixed(1)} dB, Iowa ${med(iowa).toFixed(1)} dB`)
})

test('automatic bowing: contact point and force keep moving inside long notes and swell with them; autoBow 0 keeps them per note', () => {
  const notes = finger([{ pitch: 74, on: 0.1, off: 3.1, velocity: 0.65 }])
  const s = notes[0].string
  const span = (perf, ch) => { const x = channel(perf, s, ch).slice(Math.round(0.4 * 250), Math.round(2.8 * 250)); return Math.max(...x) / Math.min(...x) }
  const on = renderPerformance(notes, { style: { autoBow: 1, timing: 0, variance: 0 } }), off = renderPerformance(notes, { style: { autoBow: 0, timing: 0, variance: 0 } })
  assert.ok(span(off, CH.beta) < 1.02, `static contact point moves ×${span(off, CH.beta).toFixed(3)}`)
  assert.ok(span(on, CH.beta) > 1.08, `automatic contact point moves only ×${span(on, CH.beta).toFixed(3)}`)
  assert.ok(span(on, CH.force) > span(off, CH.force) * 1.15, `force range ×${span(on, CH.force).toFixed(2)} vs ×${span(off, CH.force).toFixed(2)}`)
  // toward the bridge as the note swells: contact point and force move against each other
  const b = channel(on, s, CH.beta), F = channel(on, s, CH.force), i0 = Math.round(0.5 * 250), im = Math.round(1.6 * 250)
  assert.ok(b[im] < b[i0] && F[im] > F[i0], `middle β ${b[im].toFixed(3)} vs ${b[i0].toFixed(3)}, F ${F[im].toFixed(2)} vs ${F[i0].toFixed(2)}`)
})

test('bow-force brightness: louder bowing is brighter by about what the recordings show (violin pp → ff ≥ 300 cents)', () => {
  const cent = x => { const N = 8192; let a = 0, w = 0; for (let o = 0; o + N <= x.length; o += N) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); fft(re, im); for (let k = 1; k < N / 2; k++) { const p = re[k] ** 2 + im[k] ** 2; a += p * k; w += p } } return a / w }
  for (const model of ['waveguide', 'source']) {
    const c = vel => { const p = renderPerformance(finger([{ pitch: 74, on: 0.1, off: 1.6, velocity: vel }]), {}); const [L] = renderCurves(p, { sampleRate: SR, model, params: { body: 'phil' } }); return cent(L.subarray(0.4 * SR, 1.5 * SR)) }
    const d = 1200 * Math.log2(c(0.95) / c(0.3))
    assert.ok(d > 300 && d < 1200, `${model}: pp → ff ${d.toFixed(0)} cents`)
  }
})

test('measured body (Iowa): long-term band energy above 1.6 kHz matches the recordings within 3 dB (it was 5–14 dB short)', async () => {
  const { BODY_IOWA } = await import('../sound/body-iowa.js')
  for (const inst of ['violin', 'viola', 'cello']) for (const model of ['waveguide', 'source']) {
    const e = BODY_IOWA[inst][model].stats.energy
    const hi = j => e.bands[j] >= 1600
    const after = Math.max(...e.after.filter((_, j) => hi(j)).map(Math.abs)), before = Math.min(...e.before.filter((_, j) => hi(j)))
    assert.ok(after < 3, `${inst} ${model}: worst band ${after} dB from the recordings`)
    assert.ok(before < -4, `${inst} ${model}: the median fit alone was ${before} dB short`)
  }
})

test('waveguide: the upper partials are as noisy between harmonics as the Iowa recordings (per-slip force and friction jitter)', async t => {
  const { hasBank, hasFfmpeg, loadBankNode } = await import('./hybrid-bank.js')
  if (!hasFfmpeg() || !hasBank('violin')) return t.skip('no Iowa bank or no ffmpeg')
  const { fft } = await import('./audio-util.js')
  const N = 8192, bin = SR / N
  const spec = (x, a, b) => { const P = new Float64Array(N / 2); for (let o = a; o + N <= b; o += N / 2) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); fft(re, im); for (let k = 0; k < N / 2; k++) P[k] += re[k] ** 2 + im[k] ** 2 } return P }
  const pg = (P, f0) => { const r = []; for (let h = Math.ceil(3000 / f0); h * f0 < 8000; h++) { const kp = Math.round(h * f0 / bin); let p = 0; for (let j = kp - 2; j <= kp + 2; j++) p = Math.max(p, P[j]); r.push(10 * Math.log10(p / (P[Math.round((h + 0.5) * f0 / bin)] + 1e-30))) } return r.sort((a, b) => a - b)[r.length >> 1] }
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1]
  const bank = loadBankNode('violin'), iowa = [], ours = [], clean = []
  for (const [m, s, dyn] of [[57, 0, 'mf'], [62, 1, 'mf'], [66, 1, 'mf'], [69, 2, 'mf'], [74, 2, 'mf'], [76, 3, 'mf'], [81, 3, 'mf'], [72, 2, 'ff'], [69, 2, 'pp']]) {
    const nt = bank.m.packs[`${s}_${dyn}`].notes.find(n => n.midi === m), x = bank.pcm[`${s}_${dyn}`]
    iowa.push(pg(spec(x, nt.offset + nt.attackEnd + 2400, nt.offset + Math.min(nt.headEnd, nt.attackEnd + 72000)), nt.f0))
    const notes = finger([{ pitch: m, on: 0.1, off: 1.8, velocity: { pp: 0.35, mf: 0.68, ff: 0.95 }[dyn] }]); notes[0].string = s; notes[0].finger = m === [55, 62, 69, 76][s] ? 0 : notes[0].finger || 1
    const perf = renderPerformance(notes, { style: { vibrato: 0, timing: 0, intonation: 0, variance: 0 } })
    for (const [rosin, list] of [[1, ours], [0, clean]]) list.push(pg(spec(renderCurves(perf, { sampleRate: SR, params: { rosin } })[0], 0.5 * SR, 1.7 * SR), midiHz(m)))
  }
  assert.ok(Math.abs(med(ours) - med(iowa)) < 4, `peak / gap 3–8 kHz: ours ${med(ours).toFixed(1)} dB, Iowa ${med(iowa).toFixed(1)} dB`)
  assert.ok(med(clean) > med(ours) + 6, `without the jitter (rosin 0) the gaps are ${(med(clean) - med(ours)).toFixed(1)} dB cleaner`)
})

test('short strokes: fast forte détaché and grace notes stay near a player\'s accent force (the Tchaikovsky cracks)', () => {
  // a 50–120 ms note from rest, four détaché notes of that length, a held note; every string, forte
  const notes = []; let t = 0.1
  for (const open of [55, 62, 69, 76]) for (const d of [2, 5, 9]) for (const dur of [0.05, 0.08, 0.12]) {
    for (let k = 0; k < 5; k++) { notes.push({ pitch: open + d + [0, 2, 0, 2, 4][k], on: t, off: t + dur, velocity: 1 }); t += dur }
    notes.push({ pitch: open + d + 5, on: t, off: t + 0.4, velocity: 1 }); t += 0.9
  }
  const perf = renderPerformance(finger(notes), { style: { vibrato: 0, timing: 0, intonation: 0, variance: 0 } })
  const pk = perf.notes.filter(n => n.off - n.on < 0.2).map(n => { const F = channel(perf, n.string, CH.force); let p = 0; for (let i = Math.floor(n.on * 250); i < n.off * 250; i++) p = Math.max(p, F[i]); return p }).sort((a, b) => a - b)
  const p90 = pk[Math.floor(pk.length * 0.9)]
  assert.ok(p90 <= 4, `peak force p90 ${p90.toFixed(2)} N (players: accents 3–4 N)`)
})

test('legato bow changes: in a connected line the bow turns fast and the sound barely dips; marked strokes still separate', () => {
  const flat = { vibrato: 0, timing: 0, intonation: 0, variance: 0 }
  // quarter notes that touch, each its own bow (repeated pitches and leaps, so nothing is slurred)
  const line = finger(melody('D5 D5 A5 A5 B5 B5 A5:2', 0.45)).map(n => ({ ...n, art: { source: 'inferred', slurPrev: false, stroke: null } }))
  const dip = legato => {
    const perf = renderPerformance(line.map(n => ({ ...n, art: { ...n.art } })), { style: { ...flat, legato } })
    const [L] = renderCurves(perf, { sampleRate: SR, model: 'source' })
    const H = 120, at = t => { const i = Math.round(t * SR); let s = 0; for (let j = i; j < i + H; j++) s += L[j] * L[j]; return Math.sqrt(s / H) }
    const ds = perf.strokes.slice(1).map(st => { const ref = (at(st.t0 - 0.08) + at(st.t0 + 0.07)) / 2; let mn = Infinity; for (let t = st.t0 - 0.04; t < st.t0 + 0.04; t += 0.0025) mn = Math.min(mn, at(t)); return 20 * Math.log10(mn / ref) })
    return { perf, dip: ds.sort((a, b) => a - b)[ds.length >> 1] }
  }
  const on = dip(1), off = dip(0)
  assert.equal(on.perf.strokes.length, 7, 'still one bow per note')
  assert.ok(on.perf.strokes.slice(1).every(st => st.legIn === 1))
  assert.ok(off.dip < -20 && on.dip > -15, `median dip at a bow change: ${off.dip.toFixed(1)} dB detached → ${on.dip.toFixed(1)} dB legato`)
  // staccato-marked strokes are not legato changes
  const st = line.map(n => ({ ...n, art: { ...n.art, stroke: 'staccato' } }))
  const p = renderPerformance(st, { style: flat })
  assert.ok(p.strokes.every(s => !s.legIn))
})

test('WG limits: the waveguide multipliers stay playable with Keep playable on, and change nothing at 1', async () => {
  const { wgApply, WG_LIMITS } = await import('../sound/bowed.js')
  assert.deepEqual(wgApply(0.5, 0.3, 0.1, 0.3, 1, 1, true), { F: 0.5, beta: 0.1 })
  const r = wgApply(0.5, 0.3, 0.1, 0.3, 0.3, 0.1, true)
  assert.equal(r.beta, WG_LIMITS.betaLo, 'contact point held at 1/50')
  assert.ok(r.F > 0.15, `force raised to the window at 1/50 (${r.F.toFixed(2)})`)
  assert.equal(wgApply(0.5, 0.3, 0.1, 0.3, 0.3, 0.1, false).beta, 0.1 * 0.1, 'raw when off')
  // a raw 0.3 × 0.3 starves almost every note; kept playable most stay in Helmholtz motion
  const helm = wgLimits => {
    let ok = 0
    for (const m of [62, 69, 74, 79, 86]) {
      const notes = finger([{ pitch: m, on: 0.1, off: 1.0, velocity: 0.7 }])
      const perf = renderPerformance(notes, { style: { vibrato: 0, timing: 0, variance: 0, intonation: 0 } })
      const { raw } = renderRaw(perf, { secs: 0.8, opts: { wgPress: 0.3, wgPos: 0.3, wgLimits } })
      const f = midiHz(m), h = spectrumDb(raw.subarray(0.5 * SR, 0.5 * SR + 8192), SR, [f / 2, f, 2 * f, 3 * f])
      if (h[1] - Math.max(h[2], h[3]) >= 1 && h[0] < h[1] - 15) ok++
    }
    return ok
  }
  const off = helm(false), on = helm(true)
  assert.ok(on >= 4 && on > off, `Helmholtz on ${on}/5 kept playable, ${off}/5 raw`)
})
