// node --test augnet/test/augnet.test.js
// The end-to-end test needs onnxruntime-web (not vendored): `npm i --no-save
// onnxruntime-web@1.30.0` next to the repo, or ORT_WEB=<path to ort.node.min.mjs or ort.wasm.min.mjs>.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { frames, encode, batches, decode, spellMidi, music21Name, nameAtFifth, midiOfName, pcOfName, toChords } from '../augnet.js'

const fx = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url)))
const V = JSON.parse(readFileSync(new URL('../vocabulary.json', import.meta.url)))
const onnxPath = new URL('../augmentednet.onnx', import.meta.url)

test('pitch names', () => {
	assert.equal(midiOfName('C4'), 60); assert.equal(midiOfName('B#3'), 60); assert.equal(midiOfName('C-5'), 71); assert.equal(midiOfName('E-4'), 63)
	assert.equal(pcOfName('F##'), 7); assert.equal(pcOfName('B--'), 9)
	assert.equal(music21Name(61), 'C#4'); assert.equal(music21Name(70), 'B-4')
	assert.equal(nameAtFifth(60, 12), 'B#3'); assert.equal(nameAtFifth(71, -7), 'C-5'); assert.equal(nameAtFifth(63, -3), 'E-4'); assert.equal(nameAtFifth(63, 9), 'D#4')
	// in E♭ major E♭ is E-, in E major D♯ is D#
	const ns = [{ pitch: 63, on: 0 }]
	assert.equal(spellMidi(ns, { keyAt: () => ({ tonic: 3, mode: 'major' }) })[0], 'E-4')
	assert.equal(spellMidi(ns, { keyAt: () => ({ tonic: 4, mode: 'major' }) })[0], 'D#4')
	// G♯ in A minor (raised 7), not A♭; B♭ in D minor
	assert.equal(spellMidi([{ pitch: 68, on: 0 }], { keyAt: () => ({ tonic: 9, mode: 'minor' }) })[0], 'G#4')
	assert.equal(spellMidi([{ pitch: 70, on: 0 }], { keyAt: () => ({ tonic: 2, mode: 'minor' }) })[0], 'B-4')
	// C♯ minor (from its spelled name, or by default): B♯, not C
	assert.equal(spellMidi([{ pitch: 60, on: 0 }], { keyAt: () => ({ tonic: 1, mode: 'minor', tf: 7 }) })[0], 'B#3')
	assert.equal(spellMidi([{ pitch: 60, on: 0 }], { keyAt: () => ({ tonic: 1, mode: 'minor' }) })[0], 'B#3')
})

test('encoding matches the Python pipeline frame for frame (Bach, BWV 269)', () => {
	const fr = frames(fx.notes, fx.measures)
	assert.equal(fr.length, fx.frames)
	const enc = encode(fr)
	const F = { Bass19: ['X_Bass19', 19], Chromagram19: ['X_Chromagram19', 19], MeasureNoteOnset14: ['X_MeasureNoteOnset14', 14] }
	for (const [k, [name, n]] of Object.entries(F)) {
		let bad = 0
		fx.inputs[k].forEach((want, t) => {
			const got = []
			for (let i = 0; i < n; i++) if (enc[name][t * n + i]) got.push(i)
			if (got.join() !== want.join()) bad++
		})
		assert.equal(bad, 0, `${k}: ${bad} frames differ`)
	}
	const { batch, inputs } = batches(enc, V.sequenceLength)
	assert.equal(batch, 1); assert.deepEqual(inputs[0].dims, [1, 640, 19]); assert.equal(inputs[0].data[fx.frames * 19], -1)
})

test('decoding Keras outputs gives the Python analysis', () => {
	// rebuild one-hot logits from the stored argmax
	const out = {}
	const C = { Alto35: 35, Bass35: 35, Tenor35: 35, Soprano35: 35, HarmonicRhythm7: 7, LocalKey38: 38, PitchClassSet121: 121, RomanNumeral31: 31, TonicizedKey38: 38 }
	for (const [name, c] of Object.entries(C)) {
		const a = new Float32Array(fx.frames * c)
		fx.argmax[name].forEach((k, t) => { a[t * c + k] = 10 })
		out[name] = a
	}
	const dec = decode(V, out, fx.frames)
	assert.deepEqual(dec.chords.map(c => [c.frame, c.key, c.rn, c.label]), fx.chords.map(c => [c.frame, c.key, c.rn, c.label]))
	const ch = toChords(dec, { T: fx.frames })
	assert.equal(ch[0].symbol, 'G'); assert.equal(ch[0].rn, 'I'); assert.equal(ch[0].keyName, 'G major')
})

let ort = null
try { ort = await import(process.env.ORT_WEB || 'onnxruntime-web') } catch {}
test('onnxruntime-web: the network gives Keras\'s outputs', { skip: !ort && 'onnxruntime-web not installed' }, async () => {
	const session = await ort.InferenceSession.create(new Uint8Array(readFileSync(onnxPath)), { executionProviders: ['wasm'] })
	const enc = encode(frames(fx.notes, fx.measures))
	const feeds = {}
	for (const i of batches(enc, V.sequenceLength).inputs) feeds[i.name] = new ort.Tensor('float32', i.data, i.dims)
	const res = await session.run(feeds)
	for (const name of V.outputs) {
		const C = res[name].dims[2], want = fx.outputs[name]
		let max = 0
		for (let t = 0; t < want.length; t++) for (let c = 0; c < C; c++) max = Math.max(max, Math.abs(res[name].data[t * C + c] - want[t][c]))
		assert.ok(max < 2e-3, `${name}: max difference ${max}`)
	}
	const dec = decode(V, Object.fromEntries(V.outputs.map(n => [n, res[n].data])), enc.frames)
	assert.deepEqual(dec.chords.map(c => c.rn), fx.chords.map(c => c.rn))
})
