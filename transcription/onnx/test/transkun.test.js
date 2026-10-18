// node --test transcription/onnx/test/transkun.test.js
//
// The front end and the semi-CRF decoder are checked against values produced
// by the Python reference (transkun 2.0.1, see transkun-fixture.json). The
// end-to-end test needs onnxruntime-web, as in basic-pitch.test.js
// (ORT_WEB=…/onnxruntime-web/dist/ort.node.min.mjs); it is skipped otherwise.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { features, frameCount, viterbiTrack, resolveOverlapping, transcribe, MEL, WINDOWS, N_MELS, N_CH, FS } from '../transkun.js'
import { renderNotes, testPhrase } from '../test-signal.js'
import { scoreNotes } from '../score.js'

const fx = JSON.parse(fs.readFileSync(new URL('./transkun-fixture.json', import.meta.url)))

test('front end matches transkun MelSpectrum (windows, FFT, mel, log, gain normalisation)', () => {
  const n = fx.tone.samples, x = new Float32Array(n)
  for (let i = 0; i < n; i++) { const t = i / FS; x[i] = (0.3 * Math.sin(2 * Math.PI * 440 * t) + 0.1 * Math.sin(2 * Math.PI * 1250 * t)) * Math.exp(-2 * t) }
  const { features: f, T } = features(x)
  assert.equal(T, fx.tone.frames); assert.equal(T, frameCount(n))
  assert.equal(f.length, T * N_MELS * N_CH)
  let md = 0
  fx.tone.idx.forEach((i, k) => { md = Math.max(md, Math.abs(f[i] - fx.tone.values[k])) })
  assert.ok(md < 2e-3, `max diff ${md}`)   // features are 0..1; torch computes in float32
})

test('mel filterbank and windows have the expected shape', () => {
  assert.equal(MEL.length, N_MELS)
  assert.ok(MEL.every(b => b.w.length > 0))
  assert.equal(WINDOWS.length, N_CH)
  assert.ok(Math.abs(WINDOWS[0][2048] - 1) < 1e-9 && WINDOWS[0][0] === 0)
})

test('semi-CRF Viterbi matches viterbiBackward, with forced start positions', () => {
  const T = fx.T, S = Float32Array.from(fx.scores)
  fx.paths.forEach((want, p) => assert.deepEqual(viterbiTrack(S, p * T * T, T, fx.starts[p]), want, `track ${p}`))
})

test('resolveOverlapping trims a note at the next onset of the same key and drops empty ones', () => {
  const r = resolveOverlapping([{ pitch: 60, start: 0, end: 2 }, { pitch: 60, start: 1, end: 3 }, { pitch: 62, start: 1, end: 1 }])
  assert.deepEqual(r.map(n => [n.pitch, n.start, n.end]), [[60, 0, 1], [60, 1, 3]])
})

let ort = null
try { ort = await import(process.env.ORT_WEB || 'onnxruntime-web') } catch {}

test('ONNX on WASM: transcribes the test phrase with velocities', { skip: !ort && 'onnxruntime-web not installed' }, async () => {
  ort.env.wasm.numThreads = 4
  const dir = new URL('../', import.meta.url)
  const core = await ort.InferenceSession.create(fs.readFileSync(new URL('transkun-core.onnx', dir)))
  const attr = await ort.InferenceSession.create(fs.readFileSync(new URL('transkun-attr.onnx', dir)))
  const ref = testPhrase()
  const audio = renderNotes(ref, { sr: FS })
  let segs = 0
  const res = await transcribe(audio,
    async (f, T) => { const r = await core.run({ features: new ort.Tensor('float32', f, [1, T, N_MELS, N_CH]) }); return { scores: r.scores.data, ctx: r.ctx.data } },
    async (x, N) => { const r = await attr.run({ x: new ort.Tensor('float32', x, [N, 768]) }); return { velocity: r.velocity.data, refine: r.refine.data, presence: r.presence.data } },
    { onSegment: () => segs++ })
  assert.equal(segs, res.segments)
  const s = scoreNotes(ref, res.notes)
  // the simple struck tone is far from a piano; the Python reference finds the same notes
  assert.ok(s.precision >= 0.95, `precision ${s.precision}`)
  assert.ok(s.recall >= 0.6, `recall ${s.recall}`)
  assert.ok(s.meanOnsetError < 0.02, `onset error ${s.meanOnsetError}`)
  assert.ok(res.notes.every(n => n.velocity >= 1 && n.velocity <= 127))
})
