// node --test transcription/onnx/test/basic-pitch.test.js
//
// Post-processing tests run anywhere. The end-to-end tests need
// onnxruntime-web, which the repo does not vendor: install it next to the
// repo (`npm i --no-save onnxruntime-web@1.30.0`) or point ORT_WEB at its
// entry, e.g. ORT_WEB=/tmp/x/node_modules/onnxruntime-web/dist/ort.node.min.mjs;
// otherwise they are skipped.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  Transcriber, notesFromOutput, frameTime, windowCount, framesFor,
  WINDOW, HOP, KEEP, PAD, N_NOTES, N_CONTOUR, FRAMES_PER_WINDOW, SAMPLE_RATE, FFT_HOP, ONNX_IO,
} from '../basic-pitch.js'
import { renderNotes, testPhrase } from '../test-signal.js'
import { scoreNotes } from '../score.js'

const MODEL = new URL('../basic-pitch-nmp.onnx', import.meta.url)

/** Fake model output: activations for the given notes ({ pitch, f0, f1 } in output frames). */
function fakeOutput(T, notes) {
  const note = new Float32Array(T * N_NOTES), onset = new Float32Array(T * N_NOTES), contour = new Float32Array(T * N_CONTOUR)
  for (const n of notes) {
    const f = n.pitch - 21
    for (let t = n.f0; t < n.f1; t++) { note[t * N_NOTES + f] = 0.8; contour[t * N_CONTOUR + 3 * f] = 0.9 }
    onset[(n.f0) * N_NOTES + f] = 0.9
    if (n.f0 > 0) onset[(n.f0 - 1) * N_NOTES + f] = 0.4
    onset[(n.f0 + 1) * N_NOTES + f] = 0.4
  }
  return { frames: T, note, onset, contour }
}

test('windowing matches inference.py: count, offsets, zero padding', () => {
  for (const n of [1000, WINDOW, HOP * 3 + 17, SAMPLE_RATE * 10]) {
    const audio = Float32Array.from({ length: n }, (_, i) => (i % 97) / 97 + 0.001)
    const tr = new Transcriber(); tr.push(audio)
    const { windows, count } = tr.take(true)
    assert.equal(count, windowCount(n))
    // window k starts at k*HOP in [PAD zeros, audio]
    for (let k = 0; k < count; k++) {
      for (const j of [0, 1, PAD - 1, PAD, WINDOW - 1]) {
        const src = k * HOP + j - PAD
        const want = src >= 0 && src < n ? audio[src] : 0
        assert.equal(windows[k * WINDOW + j], want, `window ${k} sample ${j}`)
      }
    }
  }
})

test('streaming in chunks gives the same windows as all at once', () => {
  const n = SAMPLE_RATE * 7 + 123
  const audio = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.01))
  const a = new Transcriber(); a.push(audio); const all = a.take(true)
  const b = new Transcriber(), got = []
  for (let p = 0; p < n; p += 1287) { b.push(audio.subarray(p, p + 1287)); const w = b.take(false); if (w.count) got.push(w.windows) }
  const tail = b.take(true); if (tail.count) got.push(tail.windows)
  const cat = new Float32Array(got.reduce((s, x) => s + x.length, 0)); let p = 0
  for (const x of got) { cat.set(x, p); p += x.length }
  assert.deepEqual(cat, all.windows)
})

test('unwrap keeps the middle 142 frames of each window, in order', () => {
  const tr = new Transcriber(), count = 3
  const mk = bins => Float32Array.from({ length: count * FRAMES_PER_WINDOW * bins }, (_, i) => Math.floor(i / bins))
  tr.append(mk(N_NOTES), mk(N_NOTES), mk(N_CONTOUR), count)
  assert.equal(tr.frames, count * KEEP)
  for (const f of [0, 141, 142, 300, 425]) {
    const w = Math.floor(f / KEEP)
    assert.equal(tr.note[f * N_NOTES], w * FRAMES_PER_WINDOW + 15 + (f % KEEP))
  }
})

test('frame times follow the window geometry', () => {
  assert.ok(Math.abs(frameTime(0)) < 1e-9)
  assert.ok(Math.abs(frameTime(10) - 10 * FFT_HOP / SAMPLE_RATE) < 1e-9)
  // first frame of window 1 sits exactly at its place in the audio
  assert.ok(Math.abs(frameTime(KEEP) - (HOP - PAD + 15 * FFT_HOP) / SAMPLE_RATE) < 1e-9)
  for (let f = 1; f < 2000; f++) assert.ok(frameTime(f) > frameTime(f - 1))
  assert.equal(framesFor(HOP * 10), KEEP * 10)
})

test('note creation: onsets, lengths, minimum length, amplitude', () => {
  const out = fakeOutput(400, [{ pitch: 60, f0: 20, f1: 80 }, { pitch: 64, f0: 20, f1: 80 }, { pitch: 72, f0: 100, f1: 105 }, { pitch: 48, f0: 200, f1: 300 }])
  const notes = notesFromOutput(out, { melodia: false })
  assert.deepEqual(notes.map(n => [n.pitch, n.startFrame, n.endFrame]), [[60, 20, 80], [64, 20, 80], [48, 200, 300]])
  assert.ok(notes.every(n => Math.abs(n.amplitude - 0.8) < 1e-6 && n.velocity === 102))
  assert.ok(notes.every(n => n.bends.every(b => b === 0)))
})

test('note creation: frequency limits and the melodia pass', () => {
  const out = fakeOutput(400, [{ pitch: 40, f0: 20, f1: 80 }, { pitch: 90, f0: 20, f1: 80 }])
  // energy with no onset is only picked up by the melodia trick
  for (let t = 150; t < 230; t++) out.note[t * N_NOTES + (67 - 21)] = 0.7
  const all = notesFromOutput(out)
  assert.deepEqual(all.map(n => n.pitch).sort(), [40, 67, 90])
  const m = all.find(n => n.pitch === 67)
  assert.ok(Math.abs(m.startFrame - 150) <= 1 && Math.abs(m.endFrame - 230) <= 1)
  // (inferred onsets also catch its rise from 0, so turn those off too)
  assert.deepEqual(notesFromOutput(out, { melodia: false, inferOnsets: false }).map(n => n.pitch).sort(), [40, 90])
  assert.deepEqual(notesFromOutput(out, { melodia: false }).map(n => n.pitch).sort(), [40, 67, 90])
  assert.deepEqual(notesFromOutput(out, { minFreq: 100, maxFreq: 1000 }).map(n => n.pitch), [67])
})

test('note creation does not modify the model output', () => {
  const out = fakeOutput(300, [{ pitch: 60, f0: 20, f1: 80 }])
  const before = Float32Array.from(out.note)
  notesFromOutput(out); assert.deepEqual(out.note, before)
})

test('scoring: onset tolerance, pitch, one-to-one', () => {
  const ref = [{ pitch: 60, start: 1, end: 2 }, { pitch: 62, start: 2, end: 3 }]
  const s = scoreNotes(ref, [{ pitch: 60, start: 1.04, end: 2 }, { pitch: 60, start: 1.01, end: 2 }, { pitch: 62, start: 2.2, end: 3 }])
  assert.equal(s.tp, 1); assert.equal(s.fp, 2); assert.equal(s.fn, 1)
  assert.ok(Math.abs(s.meanOnsetError - 0.01) < 1e-9)
})

// ── End to end on onnxruntime-web (WASM) ─────────────────────────────────
let ort = null
try { ort = await import(process.env.ORT_WEB || 'onnxruntime-web') } catch {}

async function transcribeAudio(session, audio) {
  const tr = new Transcriber(); tr.push(audio)
  const { windows, count } = tr.take(true)
  const r = await session.run({ [ONNX_IO.input]: new ort.Tensor('float32', windows, [count, WINDOW, 1]) })
  tr.append(r[ONNX_IO.note].data, r[ONNX_IO.onset].data, r[ONNX_IO.contour].data, count)
  return tr.output()
}

test('ONNX model on WASM: transcribes the synthetic test phrase', { skip: !ort && 'onnxruntime-web not installed' }, async () => {
  ort.env.wasm.numThreads = 1
  const session = await ort.InferenceSession.create(fs.readFileSync(MODEL))
  const ref = testPhrase()
  for (const [timbre, minF1] of [['piano', 0.7], ['organ', 0.7]]) {
    const out = await transcribeAudio(session, renderNotes(ref, { timbre }))
    const notes = notesFromOutput(out)
    const s = scoreNotes(ref, notes)
    assert.ok(s.recall >= 0.95, `${timbre}: recall ${s.recall}`)
    assert.ok(s.f1 >= minF1, `${timbre}: F1 ${s.f1}`)
    assert.ok(s.meanOnsetError < 0.025, `${timbre}: onset error ${s.meanOnsetError}`)
  }
})

test('ONNX model on WASM: faster than real time, streaming = offline', { skip: !ort && 'onnxruntime-web not installed' }, async () => {
  const session = await ort.InferenceSession.create(fs.readFileSync(MODEL))
  const audio = renderNotes(testPhrase())
  const t = performance.now()
  const off = await transcribeAudio(session, audio)
  const ms = performance.now() - t
  assert.ok(ms < (audio.length / SAMPLE_RATE) * 1000, `took ${ms} ms`)
  // stream the same audio in 128-sample chunks: every complete window gives identical activations
  const tr = new Transcriber()
  for (let p = 0; p < audio.length; p += 128) {
    tr.push(audio.subarray(p, p + 128))
    const { windows, count } = tr.take(false)
    if (!count) continue
    const r = await session.run({ [ONNX_IO.input]: new ort.Tensor('float32', windows, [count, WINDOW, 1]) })
    tr.append(r[ONNX_IO.note].data, r[ONNX_IO.onset].data, r[ONNX_IO.contour].data, count)
  }
  const live = tr.output()
  assert.ok(live.frames > 0 && live.frames <= off.frames)
  let md = 0
  for (let i = 0; i < live.frames * N_NOTES; i++) md = Math.max(md, Math.abs(live.note[i] - off.note[i]))
  assert.ok(md < 1e-5, `max diff ${md}`)
})
