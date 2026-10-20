// Expression from a recording (strings/expression.js): measuring, storing and
// playing back a violinist's timing, dynamics and pitch.
import test from 'node:test'
import assert from 'node:assert/strict'
import { analyseRecording, encodeRecording, decodeRecording, applyRecording, correctLane, RATE } from '../expression.js'
import { renderPerformance } from '../sound/performance.js'
import { midiHz, NCH } from '../sound/bowed.js'
import { fingerLine } from '../fingering.js'

const SR = 16000
/** A test "recording": harmonic tones at the notes' pitches, levels in dB, optional vibrato. */
function tones(notes, len) {
  const x = new Float32Array(Math.round(len * SR))
  for (const n of notes) {
    let ph = 0
    for (let i = Math.round(n.on * SR); i < Math.round(n.off * SR); i++) {
      const t = i / SR - n.on, f = midiHz(n.pitch) * 2 ** (((n.vib || 0) * Math.sin(2 * Math.PI * 6 * t) + (n.cents || 0)) / 1200)
      ph += 2 * Math.PI * f / SR
      const g = 0.1 * 10 ** ((n.db || 0) / 20) * Math.min(1, t / 0.01, (n.off - n.on - t) / 0.01)
      x[i] += g * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph))
    }
  }
  return x
}
const amp = a => { const m = a.reduce((p, v) => p + v, 0) / a.length; return Math.sqrt(2 * a.reduce((p, v) => p + (v - m) ** 2, 0) / a.length) }

test('a recording is measured: level per note, vibrato and intonation in cents', () => {
  const notes = [{ pitch: 69, on: 0.2, off: 1.4 }, { pitch: 71, on: 1.45, off: 2.8, db: 6, vib: 20 }, { pitch: 72, on: 2.85, off: 3.6, cents: 15 }]
  const an = analyseRecording(tones(notes, 4), SR, notes)
  const mid = (n) => { const a = Math.round((n.on + 0.3) * RATE), b = Math.round((n.off - 0.2) * RATE); return an.loud.slice(a, b).reduce((p, v) => p + v, 0) / (b - a) }
  assert.ok(Math.abs(mid(notes[1]) - mid(notes[0]) - 6) < 0.8, `level step ${(mid(notes[1]) - mid(notes[0])).toFixed(1)} dB`)
  assert.ok(Math.abs(amp(Array.from(an.cents[0].c))) < 1.5, 'a steady note is steady')
  const w = amp(Array.from(an.cents[1].c.slice(5, -5)))
  assert.ok(w > 16 && w < 21, `vibrato width ±${w.toFixed(1)} c`)
  // tuning is taken from the whole recording (here A = 440), the third note sits 15 cents sharp of it
  const c3 = an.cents[2].c.reduce((p, v) => p + v, 0) / an.cents[2].c.length
  assert.ok(Math.abs(c3 - 15) < 2, `intonation ${c3.toFixed(1)} c`)
})

test('stored and read back compactly; played back in onset, then pitch, order', () => {
  const notes = [{ pitch: 64, on: 0.1, off: 0.9 }, { pitch: 67, on: 1, off: 2, vib: 15 }]
  const an = analyseRecording(tones(notes, 2.5), SR, notes)
  const r = decodeRecording(JSON.parse(JSON.stringify(encodeRecording(an, notes))))
  assert.deepEqual(r.on, [0.1, 1]); assert.deepEqual(r.off, [0.9, 2])
  for (let k = 0; k < an.loud.length; k++) if (an.loud[k] > -32) assert.ok(Math.abs(r.loud[k] - an.loud[k]) <= 0.4)
  an.cents[1].c.forEach((v, k) => assert.ok(Math.abs(r.cents[1].c[k] - v) <= 0.06))
  // a piece's notes, listed in another order, with score positions
  const piece = [{ pitch: 67, q: 1 }, { pitch: 64, q: 0 }]
  const ex = applyRecording(r, piece)
  assert.equal(piece[1].on, 0.1); assert.equal(piece[0].on, 1)
  assert.ok(piece[0].rec && Math.abs(piece[0].rec.t0 - 1.04) < 0.011)
  assert.ok(ex.recorded && ex.dyn.length === r.loud.length)
  assert.equal(applyRecording(r, [{ pitch: 60, q: 0 }]), null, 'another note count: not this piece')
  // lanes corrected per engine: each physical model gets its own, the others the Source model's
  const lanes = { source: new Float32Array(r.loud.length).fill(0.3), waveguide: new Float32Array(r.loud.length).fill(0.7) }
  const r2 = decodeRecording(JSON.parse(JSON.stringify(encodeRecording({ ...an, lanes }, notes))))
  const lane = engine => applyRecording(r2, [{ pitch: 67, q: 1 }, { pitch: 64, q: 0 }], { engine })
  assert.ok(Math.abs(lane('waveguide').dyn[5] - 0.7) < 0.02 && lane('waveguide').engine === 'waveguide')
  assert.ok(Math.abs(lane('source').dyn[5] - 0.3) < 0.02 && Math.abs(lane('hybrid').dyn[5] - 0.3) < 0.02 && lane('hybrid').engine === 'source')
})

test('the renderer plays a recorded pitch curve and a lane of dynamics', () => {
  const c = Float32Array.from({ length: 80 }, (_, k) => 10 + 18 * Math.sin(2 * Math.PI * 6 * k / RATE))
  const notes = [{ pitch: 76, on: 0.5, off: 2.2, velocity: 0.7 }]
  fingerLine(notes, { instrument: 'violin' })
  notes[0].rec = { t0: 0.54, rate: RATE, c }
  const dyn = new Float32Array(150).fill(0.4); dyn.fill(0.8, 75)
  const perf = renderPerformance(notes, { instrument: 'violin', expression: { recorded: true, rate: RATE, t0: 0, dyn } })
  const s = notes[0].string, at = t => perf.data[Math.round(t * perf.frameRate) * 4 * NCH + s * NCH]
  for (const t of [0.8, 1.0, 1.23, 1.5]) {
    const want = 10 + 18 * Math.sin(2 * Math.PI * 6 * (t - 0.54)), got = 1200 * Math.log2(at(t) / midiHz(76))
    assert.ok(Math.abs(got - want) < 1.5, `${t} s: ${got.toFixed(1)} c, recorded ${want.toFixed(1)}`)
  }
  // the recorded timing is kept (no humanized onset)
  assert.equal(perf.notes[0].on, 0.5)
  // louder in the second half: the bow is faster
  const v = t => Math.abs(perf.data[Math.round(t * perf.frameRate) * 4 * NCH + s * NCH + 1])
  assert.ok(v(1.9) > 1.3 * v(1.1), `bow speed ${v(1.1).toFixed(3)} → ${v(1.9).toFixed(3)}`)
})

test('listening and correcting moves the lane toward the recording', () => {
  const notes = [{ on: 0, off: 2 }]
  const dyn = new Float32Array(100).fill(0.55)
  // ours came out 4 dB too loud early on and 4 dB too soft late (the overall level does not count)
  const rec = Float32Array.from({ length: 100 }, (_, k) => k < 40 ? -4 : k < 60 ? 0 : 4), ours = new Float32Array(100).fill(7)
  correctLane(dyn, rec, ours, notes)
  assert.ok(Math.abs(dyn[20] - 0.15) < 0.01 && Math.abs(dyn[50] - 0.55) < 0.01 && Math.abs(dyn[80] - 0.95) < 0.01, `${dyn[20].toFixed(2)} / ${dyn[50].toFixed(2)} / ${dyn[80].toFixed(2)}`)
})
