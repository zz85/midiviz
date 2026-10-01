/**
 * midi-score.js — Convert a parsed MIDI (tonejs-midi `Midi`) into the
 * nwc-viewer token format so that nwc-viewer's interpreter + typesetter can
 * engrave it.
 *
 * Why not nwc-viewer's own midi-import.js?  That importer serialises every
 * channel as one monophonic voice, so overlapping (legato / pedalled) notes
 * push later notes out of time, and piano parts are never split into a grand
 * staff.  Here we:
 *   - keep one staff per track (or split a wide-range piano track into a
 *     treble + bass grand staff),
 *   - clip each onset group's duration to the next onset in that staff so the
 *     notation's tick positions stay locked to the MIDI ticks,
 *   - decompose spans into exact (tied) note values, split at barlines,
 *   - track running accidentals per bar so spelling is correct,
 *   - tag every token with `_tick` (MIDI ticks) so the visualiser can map
 *     notation back to seconds via the MIDI tempo map.
 */

const SHARP_SPELLING = [
	['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
	['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
]
const FLAT_SPELLING = [
	['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
	['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
]
const NOTE_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }
const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const CLEF_OFFSETS = { treble: 34, bass: 22 }
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
const FLAT_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
const ACC_STR = { '-2': 'v', '-1': 'b', 0: 'n', 1: '#', 2: 'x' }
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]

// tonejs-midi key names → circle-of-fifths value
const KEY_TO_FIFTHS = {
	Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0,
	G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
}
const MINOR_TO_FIFTHS = {
	Ab: -7, Eb: -6, Bb: -5, F: -4, C: -3, G: -2, D: -1, A: 0,
	E: 1, B: 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7,
}

/** Key signature description for a circle-of-fifths value. */
function keyInfo(fifths) {
	const alter = {} // note letter → -1/0/1
	for (const n of 'CDEFGAB') alter[n] = 0
	if (fifths > 0) SHARP_ORDER.slice(0, fifths).forEach(n => { alter[n] = 1 })
	if (fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach(n => { alter[n] = -1 })
	const token = fifths >= 0
		? { type: 'KeySignature', key: SHARP_KEYS[fifths], sharps: SHARP_ORDER.slice(0, fifths), flats: [] }
		: { type: 'KeySignature', key: FLAT_KEYS[-fifths], sharps: [], flats: FLAT_ORDER.slice(0, -fifths).map(f => f + 'b') }
	if (fifths === 0) token.accidentals = ['C']
	return { fifths, alter, token }
}

/**
 * Pick a key signature: use the MIDI key signature event when it's not the
 * (frequently bogus) default C major, otherwise estimate from the pitch-class
 * histogram (best-fitting diatonic collection, ties → fewer accidentals).
 */
function chooseKey(midi, allNotes) {
	const ks = midi.header.keySignatures?.[0]
	if (ks) {
		const map = ks.scale === 'minor' ? MINOR_TO_FIFTHS : KEY_TO_FIFTHS
		const f = map[ks.key]
		if (f !== undefined && f !== 0) return f
	}
	const hist = new Array(12).fill(0)
	for (const n of allNotes) hist[n.midi % 12] += n.durationTicks || 1
	let best = 0, bestScore = -Infinity
	for (let f = -7; f <= 7; f++) {
		const tonic = ((f * 7) % 12 + 12) % 12
		let score = 0
		for (const s of MAJOR_SCALE) score += hist[(tonic + s) % 12]
		score -= Math.abs(f) * 1e-6 * score // tie-break: fewer accidentals
		if (score > bestScore) { bestScore = score; best = f }
	}
	return best
}

/** Spell a MIDI note in a key: returns { name, octave, alter }. */
function spell(midiNote, fifths) {
	const pc = midiNote % 12
	const [name, alter] = (fifths < 0 ? FLAT_SPELLING : SHARP_SPELLING)[pc]
	return { name, octave: Math.floor(midiNote / 12) - 1, alter }
}

/** Greedy decomposition of a tick span into note values (largest first). */
function makeDurationTable(ppq) {
	const whole = ppq * 4
	const out = []
	for (const d of [1, 2, 4, 8, 16, 32]) {
		const base = whole / d
		if (d <= 16) out.push({ ticks: base * 1.5, duration: d, dots: 1 })
		out.push({ ticks: base, duration: d, dots: 0 })
	}
	return out.sort((a, b) => b.ticks - a.ticks)
}

function decompose(span, table) {
	const parts = []
	let rem = span
	while (rem > 0) {
		const e = table.find(c => c.ticks <= rem + 1e-6)
		if (!e) break
		parts.push(e)
		rem -= e.ticks
	}
	return parts
}

/** Split [start,end) at barlines → [{start, end}] */
function splitAtBars(start, end, barTicks) {
	const out = []
	let s = start
	while (s < end) {
		const nextBar = (Math.floor(s / barTicks) + 1) * barTicks
		const e = Math.min(end, nextBar)
		out.push({ start: s, end: e })
		s = e
	}
	return out
}

/**
 * Decide staves. Returns [{ name, clef, notes, channel, program, brace }].
 *
 * mode: 'tracks' — one staff per track (a lone wide-range keyboard track is
 *                  split into a grand staff)
 *       'piano'  — reduce everything (except drums) onto one grand staff
 *       'auto'   — 'tracks' unless that yields more than MAX_AUTO_STAVES
 */
const MAX_AUTO_STAVES = 4
const isKeyboardProgram = p => p < 8 || (p >= 16 && p < 24)

function grandStaff(name, notes, channel, program) {
	const treble = [], bass = []
	for (const n of notes) (n.midi >= 60 ? treble : bass).push(n)
	return [
		{ name, clef: 'treble', notes: treble, channel, program, brace: true },
		{ name: '', clef: 'bass', notes: bass, channel, program, brace: false },
	]
}

function assignStaves(midi, mode = 'auto') {
	const tracks = midi.tracks.filter(t => t.notes.length && t.channel !== 9)
	if (!tracks.length) return []

	if (mode !== 'piano') {
		const keyboardTracks = tracks.filter(t => isKeyboardProgram(t.instrument?.number ?? 0))
		const staves = []
		for (const t of tracks) {
			const notes = t.notes
			const name = t.name || t.instrument?.name || `Track ${staves.length + 1}`
			const program = t.instrument?.number ?? 0
			const below = notes.filter(n => n.midi < 60).length
			const wide = below > notes.length * 0.12 && notes.length - below > notes.length * 0.12
			const loneKeyboard = tracks.length === 1 || (keyboardTracks.length === 1 && keyboardTracks[0] === t)
			if (wide && loneKeyboard) {
				staves.push(...grandStaff(name, notes, t.channel, program))
			} else {
				const sorted = notes.map(n => n.midi).sort((a, b) => a - b)
				const median = sorted[sorted.length >> 1]
				staves.push({ name, clef: median < 57 ? 'bass' : 'treble', notes, channel: t.channel, program, brace: false })
			}
		}
		if (mode === 'tracks' || staves.length <= MAX_AUTO_STAVES) return staves
	}

	const all = tracks.flatMap(t => t.notes)
	return grandStaff('', all, tracks[0].channel, tracks[0].instrument?.number ?? 0)
}

/** Beaming: mark runs of ≥2 eighth-or-shorter notes within a beat. */
function applyBeaming(tokens, beatTicks) {
	let run = []
	const flush = () => {
		if (run.length >= 2) run.forEach((t, i) => { t.beam = i === 0 ? 1 : i === run.length - 1 ? 3 : 2 })
		run = []
	}
	let beat = -1
	for (const t of tokens) {
		const beamable = (t.type === 'Note' || t.type === 'Chord') && t.duration >= 8
		if (!beamable) { flush(); beat = -1; continue }
		const b = Math.floor(t._tick / beatTicks)
		if (b !== beat) { flush(); beat = b }
		run.push(t)
	}
	flush()
}

function buildStaffTokens(st, ctx) {
	const { ppq, grid, barTicks, beatTicks, table, key, timeSig, bpm, totalTicks } = ctx
	const clefOffset = CLEF_OFFSETS[st.clef]

	const tokens = [
		{ type: 'Clef', clef: st.clef, octave: 0, _tick: 0 },
		{ ...key.token, _tick: 0 },
		{ type: 'TimeSignature', signature: `${timeSig[0]}/${timeSig[1]}`, group: timeSig[0], beat: timeSig[1], _tick: 0 },
	]
	if (ctx.withTempo) tokens.push({ type: 'Tempo', duration: Math.round(bpm), note: 'Quarter', position: 0, placement: 'bestFit', _tick: 0 })

	// Quantise and group by onset
	const q = st.notes.map(n => {
		const s = Math.round(n.ticks / grid) * grid
		const e = Math.max(s + grid, Math.round((n.ticks + n.durationTicks) / grid) * grid)
		return { midi: n.midi, start: s, end: e, src: n }
	}).sort((a, b) => a.start - b.start || a.midi - b.midi)

	const groups = []
	for (const n of q) {
		const g = groups[groups.length - 1]
		if (g && g.start === n.start) {
			if (!g.notes.some(m => m.midi === n.midi)) g.notes.push(n)
			g.end = Math.max(g.end, n.end)
		} else groups.push({ start: n.start, end: n.end, notes: [n] })
	}
	for (let i = 0; i < groups.length - 1; i++) {
		groups[i].end = Math.min(groups[i].end, groups[i + 1].start)
	}

	const body = []
	let cursor = 0
	let barIndex = -1
	let running = {} // absPitch → alter, reset each bar

	const pushRests = (from, to) => {
		for (const seg of splitAtBars(from, to, barTicks)) {
			let t = seg.start
			for (const p of decompose(seg.end - seg.start, table)) {
				body.push({ type: 'Rest', position: 0, duration: p.duration, dots: p.dots, triplet: 0, _tick: t })
				t += p.ticks
			}
		}
	}

	const noteFields = (n, tick, tie, tieEnd) => {
		const bar = Math.floor(tick / barTicks)
		if (bar !== barIndex) { barIndex = bar; running = {} }
		const sp = spell(n.midi, key.fifths)
		const abs = sp.octave * 7 + NOTE_INDEX[sp.name]
		const current = abs in running ? running[abs] : key.alter[sp.name]
		let accidental = ''
		// A tied continuation inherits its pitch; never re-mark it
		if (!tieEnd && current !== sp.alter) accidental = ACC_STR[sp.alter]
		running[abs] = sp.alter
		return {
			position: abs - clefOffset, accidental, tie, tieEnd,
			slur: 0, beam: 0, stem: 0, staccato: 0, accent: 0, grace: 0, tenuto: 0,
			_midi: n.midi,
		}
	}

	for (const g of groups) {
		if (g.start > cursor) pushRests(cursor, g.start)
		g.notes.sort((a, b) => a.midi - b.midi)
		const pieces = []
		for (const seg of splitAtBars(g.start, g.end, barTicks)) {
			let t = seg.start
			for (const p of decompose(seg.end - seg.start, table)) {
				pieces.push({ tick: t, p })
				t += p.ticks
			}
		}
		pieces.forEach(({ tick, p }, i) => {
			const tie = i < pieces.length - 1 ? 1 : 0
			const tieEnd = i > 0 ? 1 : 0
			const kids = g.notes.map(n => noteFields(n, tick, tie, tieEnd))
			const base = {
				duration: p.duration, dots: p.dots, triplet: 0, tie, tieEnd,
				slur: 0, beam: 0, stem: 0, staccato: 0, accent: 0, grace: 0, tenuto: 0,
				_tick: tick, _onset: i === 0,
			}
			if (kids.length === 1) {
				body.push({ type: 'Note', ...kids[0], ...base, position: kids[0].position, accidental: kids[0].accidental })
			} else {
				body.push({ type: 'Chord', ...base, position: kids[0].position, accidental: kids[0].accidental, notes: kids, chords: kids.length })
			}
		})
		cursor = g.end
	}
	if (cursor < totalTicks) pushRests(cursor, totalTicks)

	// Barlines
	const out = []
	let lastBar = 0
	for (const tok of body) {
		const bar = Math.floor(tok._tick / barTicks)
		while (lastBar < bar) { lastBar++; out.push({ type: 'Barline', barline: 0, _tick: lastBar * barTicks }) }
		out.push(tok)
	}
	applyBeaming(out, beatTicks)
	return tokens.concat(out)
}

/**
 * @param {Midi} midi - tonejs-midi parsed file
 * @param {string} title
 * @returns {{ data, staffMeta, ppq }}
 */
export function midiToScore(midi, title = 'MIDI', { staffMode = 'auto' } = {}) {
	const ppq = midi.header.ppq
	const grid = ppq / 4 // 16th-note grid
	const ts = midi.header.timeSignatures?.[0]?.timeSignature || [4, 4]
	const timeSig = [ts[0] || 4, ts[1] || 4]
	const barTicks = ppq * 4 * timeSig[0] / timeSig[1]
	const beatTicks = timeSig[1] === 8 && timeSig[0] % 3 === 0 ? ppq * 1.5 : ppq * 4 / timeSig[1]
	const bpm = midi.header.tempos?.[0]?.bpm || 120
	const all = midi.tracks.filter(t => t.channel !== 9).flatMap(t => t.notes)
	const key = keyInfo(chooseKey(midi, all))
	let totalTicks = 0
	for (const n of all) totalTicks = Math.max(totalTicks, n.ticks + n.durationTicks)
	totalTicks = Math.ceil(Math.round(totalTicks / grid) * grid / barTicks) * barTicks || barTicks

	const plan = assignStaves(midi, staffMode)
	if (!plan.length) throw new Error('MIDI file has no pitched notes to engrave')
	const ctx = { ppq, grid, barTicks, beatTicks, table: makeDurationTable(ppq), key, timeSig, bpm, totalTicks }

	const staves = plan.map((st, i) => ({
		staff_name: st.name,
		staff_label: '',
		group_name: 'Standard',
		channel: st.channel,
		bracketWithNext: false,
		braceWithNext: st.brace,
		connectBarsWithNext: i < plan.length - 1,
		layerWithNext: false,
		boundaryTop: 0,
		boundaryBottom: 0,
		endingBar: 0,
		lines: 5,
		lyrics: [],
		tokens: buildStaffTokens(st, { ...ctx, withTempo: i === 0 }),
	}))

	return {
		ppq,
		staffMeta: plan.map(p => ({ channel: p.channel, program: p.program, clef: p.clef })),
		data: {
			header: { version: 0, company: '[MIDI Import]', product: '[MidiViz]' },
			info: { title, author: '', lyricist: '', copyright1: '', copyright2: '', comments: '' },
			score: { allowLayering: false, staves },
		},
	}
}

/** Flatten a tonejs Midi into MidiScheduler notes + controlChanges. */
export function midiToSchedule(midi) {
	const notes = []
	const controlChanges = []
	const programs = new Map()
	midi.tracks.forEach((t, ti) => {
		const ch = t.channel ?? ti
		if (t.instrument && ch !== 9) programs.set(ch, t.instrument.number)
		for (const n of t.notes) notes.push({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity, channel: ch })
		for (const [num, list] of Object.entries(t.controlChanges || {})) {
			const c = +num
			if (![7, 10, 11, 64, 66, 67].includes(c)) continue
			for (const e of list) controlChanges.push({ time: e.time, channel: ch, controller: c, value: Math.round(e.value * 127) })
		}
	})
	notes.sort((a, b) => a.time - b.time)
	controlChanges.sort((a, b) => a.time - b.time)
	return { notes, controlChanges, programs }
}
