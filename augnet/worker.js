// AugmentedNet on onnxruntime-web in a module worker.
//
//   { type: 'init', ort, wasmPaths, ep, base }            → { type: 'ready', ep, version, loadMs, warmMs }
//   { type: 'analyze', id, notes: [{ pitch, on, dur }], measures: [{ offset, number, quarters, barQuarters }], spell }
//       times in quarter notes; spell 'key' (two passes: keys from a music21-style spelling, then
//       each note spelled in its key) or 'music21' (sharps C♯ F♯ G♯, flats E♭ B♭, as music21 reads a MIDI file)
//       → { type: 'result', id, chords, keys, frames, prob, satb, ms }
//   errors → { type: 'error', id?, message }
import * as A from './augnet.js'

let ort, session, V

async function pass(notes, measures) {
	return A.analyzeSpelled(V, session, ort.Tensor, notes, measures)
}

self.onmessage = async ({ data: m }) => {
	try {
		if (m.type === 'init') {
			const t0 = performance.now()
			ort = await import(m.ort)
			ort.env.wasm.wasmPaths = m.wasmPaths
			ort.env.wasm.numThreads = 1 // a 460 KB model: one thread is plenty and needs no cross-origin isolation
			const [bytes, vocab] = await Promise.all([
				fetch(new URL('augmentednet.onnx', m.base)).then(r => r.arrayBuffer()),
				fetch(new URL('vocabulary.json', m.base)).then(r => r.json()),
			])
			V = vocab
			session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: [m.ep], graphOptimizationLevel: 'all', ...(m.ep === 'webgpu' ? { preferredOutputLocation: 'cpu' } : {}) })
			const loadMs = performance.now() - t0
			const t1 = performance.now()
			await pass([{ on: 0, dur: 4, name: 'C4' }], [{ offset: 0, number: 1, quarters: 4, barQuarters: 4 }])
			self.postMessage({ type: 'ready', ep: m.ep, version: ort.env.versions?.web || '', loadMs, warmMs: performance.now() - t1, vocabVersion: V.version })
		} else if (m.type === 'analyze') {
			const t0 = performance.now()
			if (m.quantize !== false) m.notes = A.quantize(m.notes)
			const m21 = m.notes.map(n => ({ on: n.on, dur: n.dur, name: A.music21Name(n.pitch) }))
			let r = await pass(m21, m.measures)
			const t0q = r.frames.length ? m.measures[0]?.offset ?? 0 : 0
			let names = m21.map(n => n.name)
			if (m.spell === 'key') {
				const keys = A.keyRegions(V, r.dec, { t0: t0q, T: r.enc.frames })
				const keyAt = t => keys.find(k => k.start <= t && t < k.end) || keys.at(-1)
				names = A.spellMidi(m.notes, { keyAt })
				r = await pass(m.notes.map((n, i) => ({ on: n.on, dur: n.dur, name: names[i] })), m.measures)
			}
			const T = r.enc.frames
			const chords = A.toChords(r.dec, { t0: t0q, T })
			const keys = A.keyRegions(V, r.dec, { t0: t0q, T })
			// frame-wise confidence (lowest of the Roman numeral, key and chord heads) and the predicted voicing
			const prob = new Float32Array(T)
			const f = r.dec.frames
			for (let t = 0; t < T; t++) prob[t] = Math.min(f.RomanNumeral31.prob[t], f.LocalKey38.prob[t], f.PitchClassSet121.prob[t])
			self.postMessage({ type: 'result', id: m.id, chords, keys, names, frames: { t0: t0q, frame: 0.125, T }, prob, ms: { ...r.ms, total: performance.now() - t0 } }, [prob.buffer])
		}
	} catch (e) {
		self.postMessage({ type: 'error', id: m.id, message: e.message || String(e) })
	}
}
