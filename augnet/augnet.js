// AugmentedNet (Nápoles López, Gotham & Fujinaga, ISMIR 2021; v1.9, MIT) in
// the browser: the input encoding, batching and output decoding of
// AugmentedNet/inference.py ported to JS, so any ONNX runtime can run the
// network (onnxruntime-web here). tools/export_augmentednet.py makes the model
// and vocabulary.json.
//
//   notes ──encode──▶ 3 inputs × T frames (32nd notes) ──network──▶ 9 outputs ──decode──▶ chords, keys
//
// The network wants spelled pitches (C♯ and D♭ are different inputs); a MIDI
// file has none, so spellMidi() names them: as music21 reads a MIDI file
// (sharps for C♯ F♯ G♯, flats for E♭ B♭), or from the key.

/** @typedef {{ on: number, dur: number, name: string, tie?: 'start'|'continue'|'stop'|null }} SpelledNote  times in quarter notes, name like 'C#4' / 'B-3' (music21) */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
export const pcOfName = name => { const m = /^([A-G])(#{1,2}|-{1,2})?/.exec(name); return (LETTER_PC[m[1]] + (m[2] ? (m[2][0] === '#' ? 1 : -1) * m[2].length : 0) + 12) % 12 }
const letterOf = name => LETTERS.indexOf(name[0])
const nameOf = name => /^[A-G](#{1,2}|-{1,2})?/.exec(name)[0]
const octaveOf = name => +name.slice(nameOf(name).length) // 'C-5' is C♭ in octave 5
/** MIDI number of a spelled name (C4 = 60; B#3 = 60). */
export const midiOfName = name => { const acc = name.slice(1, nameOf(name).length); return 12 * (octaveOf(name) + 1) + LETTER_PC[name[0]] + (acc[0] === '#' ? acc.length : -acc.length) }

// ── Spelling MIDI ──────────────────────────────────────────────────────────

const M21 = ['C', 'C#', 'D', 'E-', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B-', 'B']
/** music21's spelling of a MIDI number (what AugmentedNet sees when it reads a .mid). */
export const music21Name = midi => M21[midi % 12] + (Math.floor(midi / 12) - 1)
const FIFTH_LETTER = 'FCGDAEB'
/** Spelled name of a pitch at a line-of-fifths position f (C = 0, G = 1, F = -1). */
export function nameAtFifth(midi, f) {
	const letter = FIFTH_LETTER[((f + 1) % 7 + 7) % 7]
	const acc = Math.floor((f + 1) / 7)
	// the octave follows the letter: B♯3 is MIDI 60, C♭5 is MIDI 71
	const natural = LETTER_PC[letter]
	const oct = Math.round((midi - acc - natural) / 12) - 1
	return letter + (acc > 0 ? '#'.repeat(acc) : '-'.repeat(-acc)) + oct
}
/**
 * Spelled names for MIDI notes.
 * @param mode 'music21' (as AugmentedNet's own MIDI reading), or 'key': each note
 *   nearest the local key on the line of fifths (keyAt(time) → { tonic, mode }),
 *   which is what an analyst writes.
 */
export function spellMidi(notes, { mode = 'key', keyAt = null } = {}) {
	if (mode === 'music21' || !keyAt) return notes.map(n => music21Name(n.pitch))
	return notes.map(n => {
		const k = keyAt(n.on)
		// the tonic's own spelling when the key has one (C♯ minor, not D♭ minor), else the fewest accidentals
		const pf = ((k.tonic * 7) % 12 + 12) % 12
		const tf = k.tf ?? (k.mode === 'minor' ? (pf > 9 ? pf - 12 : pf) : (pf > 6 ? pf - 12 : pf))
		let centre = tf + (k.mode === 'minor' ? -3 : 0) // tonic of the relative major
		centre += k.mode === 'minor' ? 2.5 : 1.5 // C major spans F … B; a minor key also reaches its raised 7th (G♯ in A minor)
		let f = ((n.pitch % 12) * 7) % 12
		while (f - centre > 6) f -= 12
		while (centre - f > 6) f += 12
		return nameAtFifth(n.pitch, f)
	})
}

// ── Encoding (score_parser.py + input_representations.py) ──────────────────

/**
 * Snap MIDI times to the score grid, as music21 does when it reads a MIDI file
 * (quarterLengthDivisors 4 and 3: sixteenths and eighth-note triplets). The
 * network was trained on scores; unquantized onsets never land on a frame, so
 * it would see no onsets at all.
 */
export function quantize(notes, { divisors = [4, 3] } = {}) {
	const snap = q => { let best = q, d = Infinity; for (const k of divisors) { const v = Math.round(q * k) / k; if (Math.abs(v - q) < d) { d = Math.abs(v - q); best = v } } return Math.round(best * 1e4) / 1e4 }
	return notes.map(n => {
		const on = snap(n.on)
		let off = snap(n.on + n.dur)
		if (off <= on) off = on + 1 / Math.max(...divisors)
		return { ...n, on, dur: Math.round((off - on) * 1e4) / 1e4 }
	})
}

const PATTERN = [...Array(64)].map((_, x) => { const p = [...(x.toString(2).padStart(6, '0') + '0')].reverse().map(Number); return p })
PATTERN[0][0] = 1

/**
 * Salami slices and fixed 32nd-note frames, as AugmentedNet's parseScore does
 * with music21's chordify.
 * @param notes SpelledNote[] (all parts), times in quarters
 * @param measures [{ offset, quarters, barQuarters? }] in order; the score ends at the last
 *   measure's offset + its full bar length (music21 pads an incomplete last bar)
 * @returns frames: [{ notes: string[] (ascending), onsets: boolean[], measure }]
 */
export function frames(notes, measures, { frame = 0.125 } = {}) {
	const r4 = x => Math.round(x * 1e4) / 1e4
	const ns = notes.filter(n => n.dur > 0).map(n => ({ ...n, on: r4(n.on), off: r4(n.on + n.dur), midi: midiOfName(n.name) }))
	const lastOffset = measures.length ? r4(measures.at(-1).offset + (measures.at(-1).barQuarters ?? measures.at(-1).quarters)) : Math.max(...ns.map(n => n.off))
	// slice boundaries
	const cuts = new Set([0])
	for (const n of ns) { cuts.add(n.on); cuts.add(n.off) }
	const times = [...cuts].filter(t => t < lastOffset).sort((a, b) => a - b)
	const measureAt = t => { let lo = 0, hi = measures.length - 1, a = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (measures[m].offset <= t + 1e-9) { a = m; lo = m + 1 } else hi = m - 1 } return a }
	// the bar pattern restarts when the measure *number* changes (a bar split at a repeat sign is one bar)
	const mnum = t => { const m = measures[measureAt(t)]; return m ? (m.number ?? measureAt(t)) : 0 }
	const byOn = [...ns].sort((a, b) => a.on - b.on)
	const slices = []
	let k = 0
	const active = []
	for (let i = 0; i < times.length; i++) {
		const t = times[i]
		while (k < byOn.length && byOn[k].on <= t) active.push(byOn[k++])
		for (let j = active.length - 1; j >= 0; j--) if (active[j].off <= t) active.splice(j, 1)
		if (!active.length) { slices.push({ t, rest: true, measure: mnum(t) }); continue }
		// chordify: ascending pitch, redundant pitches removed (the first one kept)
		const seen = new Map()
		for (const n of [...active].sort((a, b) => a.midi - b.midi)) {
			const onset = n.on === t && n.tie !== 'continue' && n.tie !== 'stop'
			if (seen.has(n.name)) { if (onset) seen.get(n.name).onset = true; continue }
			seen.set(n.name, { name: n.name, onset })
		}
		const list = [...seen.values()]
		slices.push({ t, notes: list.map(x => x.name), onsets: list.map(x => x.onset), measure: mnum(t) })
	}
	// music21 merges consecutive rests; the first rest of a run is what remains
	const rows = slices.filter((s, i) => !(s.rest && i > 0 && slices[i - 1].rest))
	// fixed frames: forward-fill the slice that starts at or before each frame;
	// a frame only carries onsets when a slice starts exactly on it
	const out = []
	const t0 = rows[0].t
	let r = 0, lastNotes = null
	const firstNotes = rows.find(x => !x.rest)?.notes || []
	const n = Math.round((lastOffset - t0) / frame)
	for (let f = 0; f < n; f++) {
		const t = r4(t0 + f * frame)
		while (r + 1 < rows.length && rows[r + 1].t <= t + 1e-9) r++
		const row = rows[r]
		if (!row.rest) lastNotes = row.notes
		const notesHere = row.rest ? (lastNotes || firstNotes) : row.notes
		const onsets = !row.rest && Math.abs(row.t - t) < 1e-9 ? row.onsets : notesHere.map(() => false)
		out.push({ notes: notesHere, onsets, measure: row.measure })
	}
	return out
}

/** The three input arrays (Bass19, Chromagram19, MeasureNoteOnset14) as Float32Array[T × F]. */
export function encode(fr) {
	const T = fr.length
	const bass = new Float32Array(T * 19), chroma = new Float32Array(T * 19), onset = new Float32Array(T * 14)
	let mIdx = 0, nIdx = 0, prevMeasure = -1
	for (let t = 0; t < T; t++) {
		const { notes, onsets, measure } = fr[t]
		const b = notes[0]
		bass[t * 19 + letterOf(b)] = 1
		bass[t * 19 + 7 + pcOfName(b)] = 1
		for (const x of notes) { chroma[t * 19 + letterOf(x)] = 1; chroma[t * 19 + 7 + pcOfName(x)] = 1 }
		if (measure !== prevMeasure) { mIdx = 0; prevMeasure = measure }
		if (onsets.some(Boolean)) nIdx = 0
		for (let i = 0; i < 7; i++) { onset[t * 14 + i] = PATTERN[mIdx][i]; onset[t * 14 + 7 + i] = PATTERN[nIdx][i] }
		mIdx = Math.min(mIdx + 1, 63); nIdx = Math.min(nIdx + 1, 63)
	}
	return { X_Bass19: bass, X_Chromagram19: chroma, X_MeasureNoteOnset14: onset, frames: T }
}

/** Pads to whole sequences of `seq` frames with −1 (as inference.py does): [{ name, data, dims }]. */
export function batches(enc, seq = 640) {
	const T = enc.frames, B = Math.ceil(T / seq) || 1
	return { batch: B, inputs: Object.entries({ X_Bass19: 19, X_Chromagram19: 19, X_MeasureNoteOnset14: 14 }).map(([name, F]) => {
		const data = new Float32Array(B * seq * F).fill(-1)
		data.set(enc[name])
		return { name, data, dims: [B, seq, F] }
	}) }
}

// ── Decoding (inference.py) ────────────────────────────────────────────────

const INVERSIONS = { triad: ['', '6', '64'], seventh: ['7', '65', '43', '2'] }

function argmaxRows(data, T, C) {
	const idx = new Int16Array(T), prob = new Float32Array(T)
	for (let t = 0; t < T; t++) {
		let best = -Infinity, arg = 0
		for (let c = 0; c < C; c++) { const v = data[t * C + c]; if (v > best) { best = v; arg = c } }
		// softmax probability of the winner
		let z = 0
		for (let c = 0; c < C; c++) z += Math.exp(data[t * C + c] - best)
		idx[t] = arg; prob[t] = 1 / z
	}
	return { idx, prob }
}

function forceTonicization(V, localKey, candidates) {
	let best = 1337, out = ''
	for (const c of candidates) {
		let d = V.weber[localKey][c]
		const deg = V.tonicization[localKey][c]
		if (!['i', 'III'].includes(deg)) d *= 1.05
		if (!['i', 'I', 'III', 'iv', 'IV', 'v', 'V'].includes(deg)) d *= 1.05
		if (d < best) { out = c; best = d }
	}
	return out
}

const pcsetKeys = new WeakMap()
function resolveRomanNumeralCosine(V, b, t, a, s, pcs, key, numerator, tonicizedKey) {
	const v = new Float64Array(12)
	for (const x of [b, t, a, s]) v[pcOfName(x)]++
	for (const pc of pcs) v[pc]++
	for (const pc of V.rnPcs[numerator]?.[tonicizedKey] || []) v[pc]++
	let keys = pcsetKeys.get(V)
	if (!keys) { keys = Object.keys(V.frompcset).map(k => ({ k, pcs: k.split(',').map(Number) })); pcsetKeys.set(V, keys) }
	const nv = Math.hypot(...v)
	let bestSim = -2, pcset = null
	for (const { k, pcs: p } of keys) {
		let dot = 0
		for (const x of p) dot += v[x]
		const sim = dot / (nv * Math.sqrt(p.length))
		if (sim > bestSim) { bestSim = sim; pcset = k }
	}
	const entries = V.frompcset[pcset]
	if (!entries[tonicizedKey]) tonicizedKey = forceTonicization(V, key, Object.keys(entries))
	let { rn: rnfigure, chord, quality } = entries[tonicizedKey]
	const chordtype = pcset.split(',').length === 4 ? 'seventh' : 'triad'
	const inv = chord.includes(b) ? chord.indexOf(b) : 0
	const invfigure = INVERSIONS[chordtype][inv]
	if (['65', '43', '2'].includes(invfigure)) rnfigure = rnfigure.replace('7', invfigure)
	else if (['6', '64'].includes(invfigure)) rnfigure += invfigure
	let rn = rnfigure
	if (numerator === 'Cad' && inv === 2) rn = 'Cad64'
	if (tonicizedKey !== key) rn = `${rn}/${V.tonicization[key][tonicizedKey]}`
	let label = chord[0] + quality
	if (inv !== 0) label += '/' + chord[inv]
	return { rn, label, chord, quality, inversion: inv, tonicizedKey, pcset }
}

/**
 * Network outputs → per-frame labels and chords.
 * @param out { [outputName]: Float32Array (B × seq × C) } logits
 * @param T the real number of frames
 * @returns { frames: { [name]: { idx, prob } }, chords: [{ frame, key, rn, label, chord[], quality, inversion, tonicizedKey, satb, prob }] }
 */
export function decode(V, out, T) {
	const C = { Alto35: 35, Bass35: 35, Tenor35: 35, Soprano35: 35, HarmonicRhythm7: 7, LocalKey38: 38, PitchClassSet121: 121, RomanNumeral31: 31, TonicizedKey38: 38 }
	const fr = {}
	for (const [name, c] of Object.entries(C)) fr[name] = argmaxRows(out[name], T, c)
	const cls = {
		Bass35: V.spellings, Tenor35: V.spellings, Alto35: V.spellings, Soprano35: V.spellings, HarmonicRhythm7: V.noteDurations,
		LocalKey38: V.keys, TonicizedKey38: V.keys, PitchClassSet121: V.pcsets, RomanNumeral31: V.romanNumerals,
	}
	const at = (name, t) => cls[name][fr[name].idx[t]]
	const chords = []
	for (let t = 0; t < T; t++) {
		if (at('HarmonicRhythm7', t) !== 0) continue
		const key = at('LocalKey38', t)
		const r = resolveRomanNumeralCosine(V, at('Bass35', t), at('Tenor35', t), at('Alto35', t), at('Soprano35', t), at('PitchClassSet121', t), key, at('RomanNumeral31', t), at('TonicizedKey38', t))
		chords.push({ frame: t, key, ...r, satb: ['Bass35', 'Tenor35', 'Alto35', 'Soprano35'].map(n => at(n, t)), prob: Math.min(fr.RomanNumeral31.prob[t], fr.LocalKey38.prob[t], fr.PitchClassSet121.prob[t]) })
	}
	return { frames: fr, chords, at }
}

// ── For the players: AugmentedNet's labels in harmony.js's shape ────────────

const QMAP = { maj: 'M', min: 'm', dim: 'd', aug: 'a', '7': 'D7', maj7: 'M7', min7: 'm7', hdim7: 'h7', dim7: 'd7', aug6: null, aug7: null }
const QSYM = { maj: '', min: 'm', dim: 'dim', aug: 'aug', '7': '7', maj7: 'maj7', min7: 'm7', hdim7: 'm7♭5', dim7: 'dim7', aug6: '+6', aug7: 'aug7' }
/** 'B-' → 'B♭', 'F##' → 'F𝄪' */
export const pretty = s => s.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/--/g, '𝄫').replace(/-/g, '♭')
/** A music21 key name ('E-', 'c#') → { tonic, mode, name } */
const FIFTH_OF_LETTER = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 }
/** Line-of-fifths position of a music21 key's tonic ('E-' → −3, 'c#' → 7), as harmony.js's tf. */
export const keyFifth = k => { const n = k[0].toUpperCase() + k.slice(1); const acc = n.slice(1); return FIFTH_OF_LETTER[n[0]] + 7 * (acc[0] === '#' ? acc.length : -acc.length) }
export const keyOf = k => ({ tf: keyFifth(k), tonic: pcOfName(k[0].toUpperCase() + k.slice(1)), mode: k[0] === k[0].toUpperCase() ? 'major' : 'minor', name: pretty(k[0].toUpperCase() + k.slice(1)) + (k[0] === k[0].toUpperCase() ? ' major' : ' minor'), short: pretty(k) })

function functionOf(rn) {
	if (/^(It|Ger|Fr|N)/.test(rn)) return 'PD'
	if (/^Cad/.test(rn)) return 'D'
	const [num, den] = rn.split('/')
	if (den) return /^(V|vii)/i.test(num) ? 'D' : 'PD'
	const m = /^(b|#)?(i{1,3}|iv|v|vi{0,2})/i.exec(num)
	if (!m) return '?'
	const d = m[2].toUpperCase()
	return { I: 'T', VI: 'T', III: 'T', II: 'PD', IV: 'PD', V: 'D', VII: 'D' }[d] || '?'
}

/**
 * Chords as harmony.js gives them ({ start, end, root, quality, bass, key, rn, symbol, func, tones, … })
 * with times in seconds through `timeOf(quarters)`.
 * @param framesQ the quarter-note time of frame 0 and the frame length
 */
export function toChords(dec, { t0 = 0, frame = 0.125, T, timeOf = q => q }) {
	const out = []
	for (let i = 0; i < dec.chords.length; i++) {
		const c = dec.chords[i]
		const endFrame = i + 1 < dec.chords.length ? dec.chords[i + 1].frame : T
		const key = keyOf(c.key)
		const rootName = c.chord[0]
		out.push({
			start: timeOf(t0 + c.frame * frame), end: timeOf(t0 + endFrame * frame),
			root: pcOfName(rootName), quality: QMAP[c.quality] ?? null, aquality: c.quality, inversion: c.inversion, bass: pcOfName(c.chord[c.inversion]),
			pcs: c.chord.map(pcOfName), tones: c.chord.map(pretty),
			key: { tonic: key.tonic, mode: key.mode, label: c.key }, keyName: key.name,
			rn: pretty(c.rn).replace(/o/g, '°').replace(/(^|[^4])2(?=\/|$)/, '$142'), func: functionOf(c.rn), // music21 writes V2 for V42
			symbol: pretty(rootName) + QSYM[c.quality] + (c.inversion ? '/' + pretty(c.chord[c.inversion]) : ''),
			satb: c.satb.map(pretty), confidence: c.prob, frame: c.frame,
		})
	}
	// merge the same label repeated (the network marks every onset of a held harmony)
	const merged = []
	for (const c of out) {
		const p = merged.at(-1)
		if (p && p.rn === c.rn && p.key.label === c.key.label && p.symbol === c.symbol) { p.end = c.end; continue }
		merged.push(c)
	}
	return merged
}

/** Local-key regions from the frame-wise LocalKey38 output. */
export function keyRegions(V, dec, { t0 = 0, frame = 0.125, T, timeOf = q => q }) {
	const out = []
	const idx = dec.frames.LocalKey38.idx
	for (let t = 0; t < T; t++) {
		const k = V.keys[idx[t]]
		const last = out.at(-1)
		if (last && last.label === k) { last.endFrame = t + 1; continue }
		out.push({ label: k, startFrame: t, endFrame: t + 1 })
	}
	return out.map(r => { const k = keyOf(r.label); return { ...k, label: r.label, start: timeOf(t0 + r.startFrame * frame), end: timeOf(t0 + r.endFrame * frame) } })
}

/** Role of a pitch in an AugmentedNet chord: 'root' | 'third' | 'fifth' | 'seventh' | 'nct'. */
export function roleIn(chord, pitch) {
	if (!chord) return 'nct'
	const k = chord.pcs.indexOf(pitch % 12)
	return k < 0 ? 'nct' : ['root', 'third', 'fifth', 'seventh'][k] || 'ext'
}

/**
 * Run the whole pipeline with a session-like `run(feeds) → outputs` (onnxruntime's InferenceSession.run).
 * @param Tensor the runtime's Tensor class
 */
export async function analyzeSpelled(V, session, Tensor, notes, measures) {
	const t0 = performance.now()
	const fr = frames(notes, measures)
	const enc = encode(fr)
	const { inputs } = batches(enc, V.sequenceLength)
	const feeds = {}
	for (const i of inputs) feeds[i.name] = new Tensor('float32', i.data, i.dims)
	const t1 = performance.now()
	const res = await session.run(feeds)
	const t2 = performance.now()
	const out = {}
	for (const name of V.outputs) out[name] = res[name].data
	const dec = decode(V, out, enc.frames)
	return { frames: fr, enc, dec, ms: { encode: t1 - t0, network: t2 - t1, decode: performance.now() - t2 } }
}

/** Bars of a @tonejs/midi file in quarter notes, from its time signatures: [{ offset, number, quarters, barQuarters }]. */
export function measuresOfMidi(midi) {
	const h = midi.header, ppq = h.ppq
	let lastTick = 0
	for (const t of midi.tracks) for (const n of t.notes) lastTick = Math.max(lastTick, n.ticks + n.durationTicks)
	const sigs = (h.timeSignatures?.length ? [...h.timeSignatures] : [{ ticks: 0, timeSignature: [4, 4] }]).sort((a, b) => a.ticks - b.ticks)
	if (sigs[0].ticks > 0) sigs.unshift({ ticks: 0, timeSignature: [4, 4] })
	const out = []
	let number = 1
	for (let s = 0; s < sigs.length; s++) {
		const [num, den] = sigs[s].timeSignature, bar = ppq * 4 / den * num
		const end = s + 1 < sigs.length ? sigs[s + 1].ticks : lastTick
		for (let tk = sigs[s].ticks; tk < end - 1e-6; tk += bar) out.push({ offset: tk / ppq, number: number++, quarters: Math.min(bar, Math.max(end, tk + bar) - tk) / ppq, barQuarters: bar / ppq })
	}
	return out
}
