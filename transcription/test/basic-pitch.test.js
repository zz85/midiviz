// node --test transcription/test/basic-pitch.test.js
//
// The model tests need TensorFlow.js; point BP_TFJS at a node_modules folder
// that has @tensorflow/tfjs and @tensorflow/tfjs-backend-wasm (4.x), e.g.
//   (cd /tmp/tfjs && npm i @tensorflow/tfjs@4.22.0 @tensorflow/tfjs-backend-wasm@4.22.0)
//   BP_TFJS=/tmp/tfjs/node_modules node --test transcription/test/basic-pitch.test.js
// Without it they are skipped; everything else runs on synthetic posteriorgrams.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as BP from '../basic-pitch.js'

const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** Posteriorgram with note-like blobs, noise, and values on a coarse grid (so ties happen). */
function synthPG(nRows, seed, { notes = nRows / 20, grid = 32 } = {}) {
  const rnd = rng(seed)
  const pg = new BP.Posteriorgram()
  const fr = new Float32Array(nRows * 88), on = new Float32Array(nRows * 88), co = new Float32Array(nRows * 264)
  for (let i = 0; i < fr.length; i++) fr[i] = rnd() < 0.05 ? rnd() * 0.35 : rnd() * 0.05
  for (let k = 0; k < notes; k++) {
    const p = Math.floor(rnd() * 88), s = Math.floor(rnd() * nRows), len = 3 + Math.floor(rnd() * 60), a = 0.3 + rnd() * 0.7
    for (let r = s; r < Math.min(nRows, s + len); r++) {
      fr[r * 88 + p] = Math.max(fr[r * 88 + p], a * (1 - (0.5 * (r - s)) / len) * (rnd() < 0.08 ? 0.2 : 1))
      if (p < 87 && rnd() < 0.3) fr[r * 88 + p + 1] = Math.max(fr[r * 88 + p + 1], a * 0.4)
      const b = Math.round(3 * (p + (rnd() - 0.5) * 0.4)); if (b >= 0 && b < 264) co[r * 264 + b] = a
    }
    if (rnd() < 0.85) { on[s * 88 + p] = a * (0.6 + rnd() * 0.4); if (s + 1 < nRows) on[(s + 1) * 88 + p] = a * 0.3 }
  }
  for (const a of [fr, on]) for (let i = 0; i < a.length; i++) a[i] = Math.round(a[i] * grid) / grid
  pg.append(fr, on, co)
  return pg
}

test('notesPoly equals the library outputToNotesPoly (options, ties, edges)', () => {
  const combos = [
    [0.5, 0.3, 11, true, null, null, true, 11],
    [0.3, 0.2, 5, true, null, null, true, 11],
    [0.6, 0.4, 3, false, null, null, true, 5],
    [0.5, 0.3, 11, true, null, null, false, 11],
    [0.4, 0.25, 8, false, null, null, false, 20],
    [0.5, 0.3, 11, true, 440 * 2 ** ((84.5 - 69) / 12), 440 * 2 ** ((40.5 - 69) / 12), true, 11],
    [0.5, null, 11, true, null, null, true, 11],
  ]
  let total = 0
  for (const seed of [1, 7, 42, 99]) {
    for (const nRows of [1, 2, 3, 40, 400]) {
      const pg = synthPG(nRows, seed + nRows)
      for (const c of combos) {
        const ref = BP.referenceNotesPoly(pg.frames, pg.onsets, pg.length, ...c)
        const fast = BP.notesPoly(pg.frames, pg.onsets, pg.length, ...c)
        assert.deepEqual(fast, ref, `seed ${seed}, ${nRows} rows, ${JSON.stringify(c)}`)
        total += ref.length
      }
    }
  }
  assert.ok(total > 500, `too few notes to mean anything (${total})`)
})

test('notesPoly is linear: 5 minutes in well under a second', () => {
  const pg = synthPG(86 * 300, 3)
  const t0 = performance.now()
  const ev = BP.notesPoly(pg.frames, pg.onsets, pg.length)
  const ms = performance.now() - t0
  assert.ok(ev.length > 500)
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`)
})

test('extractNotes: times, MIDI range limits, pitch bends', () => {
  const pg = synthPG(600, 5)
  const all = BP.extractNotes(pg)
  assert.ok(all.length > 10)
  for (const n of all) {
    assert.ok(n.off > n.on && n.on >= 0)
    assert.ok(n.pitch >= 21 && n.pitch <= 108)
    assert.equal(n.bends.length, n.durationFrames)
  }
  const lim = BP.extractNotes(pg, { minMidi: 50, maxMidi: 70 })
  assert.ok(lim.length > 0 && lim.every(n => n.pitch >= 50 && n.pitch <= 70))
  assert.ok(lim.some(n => n.pitch === 50 || n.pitch === 70) || lim.length < 5)
  // a sub-range keeps absolute times
  const part = BP.extractNotes(pg, {}, 300, 600)
  assert.ok(part.every(n => n.startFrame >= 300 && n.on >= BP.frameToTime(300) - 1e-9))
})

test('window arithmetic matches the library', () => {
  assert.equal(BP.WIN, 43844); assert.equal(BP.STEP, 36164); assert.equal(BP.KEEP, 142)
  // tf.signal.frame(pad_end) over PAD + n samples
  for (const n of [1, 1000, BP.STEP - BP.PAD, BP.STEP - BP.PAD + 1, 22050 * 10, 22050 * 61 + 17]) {
    assert.equal(BP.windowCount(n), Math.ceil((BP.PAD + n) / BP.STEP))
    assert.ok(BP.windowCount(n) * BP.KEEP >= BP.framesForSamples(n), `enough rows for ${n}`)
  }
  const a = Float32Array.from({ length: 50000 }, (_, i) => i + 1)
  const w0 = BP.sliceWindow(a, 0)
  assert.equal(w0[BP.PAD - 1], 0); assert.equal(w0[BP.PAD], 1)
  const w1 = BP.sliceWindow(a, 1, 45000)
  assert.equal(w1[0], BP.windowStart(1) + 1); assert.equal(w1[45000 - BP.windowStart(1)], 0)
})

test('scoreNotes: one-to-one matching within 50 ms, offsets optional', () => {
  const ref = [{ pitch: 60, on: 1, off: 2 }, { pitch: 60, on: 1.03, off: 1.5 }, { pitch: 64, on: 3, off: 4 }]
  const est = [{ pitch: 60, on: 1.02, off: 1.99 }, { pitch: 64, on: 3.06, off: 4 }, { pitch: 67, on: 5, off: 6 }]
  const s = BP.scoreNotes(est, ref)
  assert.equal(s.tp, 1); assert.equal(s.fp, 2); assert.equal(s.fn, 2)
  assert.equal(s.refMatch[1], 0) // the closer reference onset wins (1.03 vs 1.00)
  assert.equal(BP.scoreNotes(est, ref, { offsets: true }).tp, 1)
  assert.equal(BP.scoreNotes([{ pitch: 60, on: 1, off: 1.2 }], ref, { offsets: true }).tp, 0)
})

test('Resampler: 44.1 kHz → 22.05 kHz keeps pitch and level, streams in chunks', () => {
  const f = 440, n = 44100
  const x = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / 44100))
  const rs = new BP.Resampler(44100)
  const parts = []
  for (let i = 0; i < n; i += 1000) parts.push(rs.push(x.subarray(i, i + 1000)))
  const y = Float32Array.from(parts.flatMap(p => Array.from(p)))
  assert.ok(Math.abs(y.length - 22050) < 40, `${y.length}`)
  let err = 0
  for (let i = 100; i < y.length - 100; i++) err = Math.max(err, Math.abs(y[i] - Math.sin((2 * Math.PI * f * i) / 22050)))
  assert.ok(err < 0.02, `max error ${err}`)
})

test('encodeWav writes a valid 16-bit mono header', () => {
  const b = BP.encodeWav(new Float32Array([0, 0.5, -1, 1]))
  const v = new DataView(b.buffer)
  assert.equal(String.fromCharCode(...b.subarray(0, 4)), 'RIFF')
  assert.equal(v.getUint32(24, true), 22050)
  assert.equal(v.getInt16(44 + 2 * 2, true), -32767)
})

// ── With the model ──────────────────────────────────────────────────────────
const TFJS = process.env.BP_TFJS
async function loadTf() {
  const tf = await import(`${TFJS}/@tensorflow/tfjs/dist/tf.node.js`)
  await import(`${TFJS}/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.node.js`)
  await tf.setBackend('wasm'); await tf.ready()
  const dir = new URL('../vendor/basic-pitch/', import.meta.url)
  const mj = JSON.parse(fs.readFileSync(new URL('model.json', dir)))
  const w = fs.readFileSync(new URL('group1-shard1of1.bin', dir))
  const model = await BP.loadModel(tf, tf.io.fromMemory({ modelTopology: mj.modelTopology, weightSpecs: mj.weightsManifest[0].weights, weightData: w.buffer.slice(w.byteOffset, w.byteOffset + w.length), format: mj.format, signature: mj.signature }))
  return { tf, model }
}
function tones(notes, dur) {
  const a = new Float32Array(Math.round(dur * BP.SR))
  for (const n of notes) {
    const f = 440 * 2 ** ((n.pitch - 69) / 12)
    for (let s = Math.floor(n.on * BP.SR); s < Math.min(a.length, n.off * BP.SR); s++) {
      const t = s / BP.SR - n.on
      let v = 0
      for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * t) / h
      a[s] += 0.2 * v * Math.exp(-3 * t)
    }
  }
  return a
}

test('model: harmonic tones are transcribed (onset F1 > 0.75)', { skip: !TFJS && 'set BP_TFJS' }, async () => {
  const { tf, model } = await loadTf()
  const ref = Array.from({ length: 16 }, (_, i) => ({ pitch: 48 + ((i * 5) % 24), on: 0.3 + i * 0.5, off: 0.7 + i * 0.5 }))
  const { pg } = await BP.transcribe(tf, model, tones(ref, 9))
  assert.equal(pg.length, BP.framesForSamples(9 * BP.SR))
  const s = BP.scoreNotes(BP.extractNotes(pg), ref)
  assert.ok(s.recall > 0.9 && s.f1 > 0.75, JSON.stringify({ p: s.precision, r: s.recall }))
})

test('model: streaming in random chunks gives the same rows as one pass', { skip: !TFJS && 'set BP_TFJS' }, async () => {
  const { tf, model } = await loadTf()
  const rnd = rng(11)
  const ref = Array.from({ length: 20 }, () => { const on = rnd() * 6; return { pitch: 40 + Math.floor(rnd() * 40), on, off: on + 0.2 + rnd() * 0.6 } })
  const a = tones(ref, 7.3)
  const { pg } = await BP.transcribe(tf, model, a, { batch: 3 })
  const st = new BP.StreamTranscriber(tf, model, { batch: 2 })
  let peeks = 0
  for (let i = 0; i < a.length;) {
    const n = Math.min(a.length - i, 500 + Math.floor(rnd() * 9000))
    st.push(a.subarray(i, i + n)); i += n
    await st.step()
    if (rnd() < 0.3) { const p = await st.peek(); if (p) { peeks++; assert.equal(p.from, st.pg.length) } }
  }
  await st.finish()
  assert.ok(peeks > 0)
  assert.equal(st.pg.length, pg.length)
  assert.deepEqual(st.pg.frames.subarray(0, pg.length * 88), pg.frames.subarray(0, pg.length * 88))
  assert.deepEqual(st.pg.onsets.subarray(0, pg.length * 88), pg.onsets.subarray(0, pg.length * 88))
  // and on real model output the fast decoder still equals the library's
  for (const o of [[0.5, 0.3, 11], [0.3, 0.2, 5, false]]) {
    const ref2 = BP.referenceNotesPoly(pg.frames, pg.onsets, pg.length, ...o)
    assert.ok(ref2.length > 10)
    assert.deepEqual(BP.notesPoly(pg.frames, pg.onsets, pg.length, ...o), ref2)
  }
})
