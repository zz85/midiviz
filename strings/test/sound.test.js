// node --test strings/test/sound.test.js   (Experiment #034)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerLine } from '../fingering.js'
import { line, melody } from '../exercises.js'
import { renderPerformance, channel } from '../sound/performance.js'
import { ViolinSynth, CurveSource, Body, renderCurves, midiHz, NCH, CH } from '../sound/bowed.js'
import { pitch, cents, spectrumDb, rms } from './audio-util.js'

const SR = 48000
const finger = (notes, instrument = 'violin') => { const n = notes.map(x => ({ ...x })); fingerLine(n, { instrument }); return n }

/** Render with a tap on the bridge force before the body (to judge the string itself). */
function renderRaw(perf, { instrument = 'violin', model = 'waveguide', secs } = {}) {
  const cap = []
  const orig = Body.prototype.process
  Body.prototype.process = function (x, L, R, n) { cap.push(Float32Array.from(x.subarray(0, n))); return orig.call(this, x, L, R, n) }
  try {
    const syn = new ViolinSynth(SR, { instrument, model }), src = new CurveSource(perf)
    const N = Math.round((secs ?? perf.frames / perf.frameRate) * SR), L = new Float32Array(N), R = new Float32Array(N)
    let t = 0
    for (let i = 0; i < N; i += 128) { const n = Math.min(128, N - i); t = syn.process(src, t, 1 / SR, L.subarray(i, i + n), R.subarray(i, i + n), n) }
    const raw = new Float32Array(cap.length * 128)
    cap.forEach((b, i) => raw.set(b, i * 128))
    return { L, R, raw }
  } finally { Body.prototype.process = orig }
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
