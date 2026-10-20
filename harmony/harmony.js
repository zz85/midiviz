// Harmony analysis of MIDI: local keys, chord segments with symbols, Roman
// numerals, functions and cadences.
//
//   key       pitch-class profiles (Krumhansl–Kessler, Temperley–Kostka–Payne,
//             Aarden–Essen, Bellman–Budge, Sapp) correlated with a smoothed
//             beat-by-beat histogram, then a Viterbi pass over the 24 keys
//             with a modulation cost that grows with distance on the circle
//             of fifths.
//   chords    Pardo & Birmingham's (2002) template scoring (chord tones in,
//             other notes against, missing tones against) over segments, with
//             the segment-level evidence Masada & Bunescu (2018) found
//             matters most: the bass, the root's presence, metrical accent at
//             the boundaries and non-chord tones (passing and neighbour notes,
//             suspensions, appoggiaturas: marked without the chord, excused
//             only when they are not in the chord being scored). Segmentation and labelling are solved together by a
//             semi-Markov Viterbi over onset partition points (a hand-weighted
//             semi-CRF), with a key prior and root-motion preferences.
//   roman     degree in the local key, quality case, inversion figures,
//             applied dominants (V/x, vii°/x), mixture, Neapolitan, augmented
//             sixths; T / PD / D functions; authentic, half, deceptive and
//             plagal cadences.
//
// Times are in any unit (seconds for MIDI, beats for score data) as long as
// notes and beats use the same one.
// See research/01_harmony.md for the theory and how other apps do it.

export const PC = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

// ── Chord vocabulary ───────────────────────────────────────────────────────
// tones: semitones over the root; w: how much each tone is expected to be
// there (a fifth can be left out, a seventh can't); fifths: line-of-fifths
// offset of each tone from the root, for spelling.
const Q = (sym, tones, w, fifths, prior, extra = {}) => ({ sym, tones, w, fifths, prior, ...extra })
export const QUALITIES = {
	M: Q('', [0, 4, 7], [1, 1, 0.5], [0, 4, 1], 0, { upper: true }),
	m: Q('m', [0, 3, 7], [1, 1, 0.5], [0, -3, 1], -0.02),
	d: Q('dim', [0, 3, 6], [1, 1, 1], [0, -3, -6], -0.07, { rn: '°' }),
	a: Q('aug', [0, 4, 8], [1, 1, 1], [0, 4, 8], -0.2, { upper: true, rn: '+' }),
	D7: Q('7', [0, 4, 7, 10], [1, 1, 0.4, 1], [0, 4, 1, -2], -0.02, { upper: true, seventh: true }),
	M7: Q('maj7', [0, 4, 7, 11], [1, 1, 0.4, 1], [0, 4, 1, 5], -0.1, { upper: true, seventh: true, rn: 'M' }),
	m7: Q('m7', [0, 3, 7, 10], [1, 1, 0.4, 1], [0, -3, 1, -2], -0.06, { seventh: true }),
	h7: Q('m7♭5', [0, 3, 6, 10], [1, 1, 1, 1], [0, -3, -6, -2], -0.06, { seventh: true, rn: 'ø' }),
	d7: Q('dim7', [0, 3, 6, 9], [1, 1, 1, 1], [0, -3, -6, -9], -0.03, { seventh: true, rn: '°' }),
	// popular / jazz additions
	sus4: Q('sus4', [0, 5, 7], [1, 1, 0.7], [0, -1, 1], -0.1, { upper: true, pop: true }),
	sus2: Q('sus2', [0, 2, 7], [1, 1, 0.7], [0, 2, 1], -0.12, { upper: true, pop: true }),
	'7sus4': Q('7sus4', [0, 5, 7, 10], [1, 1, 0.4, 1], [0, -1, 1, -2], -0.1, { upper: true, seventh: true, pop: true }),
	M6: Q('6', [0, 4, 7, 9], [1, 1, 0.4, 1], [0, 4, 1, 3], -0.1, { upper: true, pop: true }),
	m6: Q('m6', [0, 3, 7, 9], [1, 1, 0.4, 1], [0, -3, 1, 3], -0.12, { pop: true }),
	add9: Q('add9', [0, 4, 7, 2], [1, 1, 0.4, 0.8], [0, 4, 1, 2], -0.08, { upper: true, pop: true }),
	madd9: Q('m(add9)', [0, 3, 7, 2], [1, 1, 0.4, 0.8], [0, -3, 1, 2], -0.1, { pop: true }),
	D9: Q('9', [0, 4, 7, 10, 2], [1, 1, 0.3, 1, 0.8], [0, 4, 1, -2, 2], -0.1, { upper: true, seventh: true, pop: true }),
	M9: Q('maj9', [0, 4, 7, 11, 2], [1, 1, 0.3, 1, 0.8], [0, 4, 1, 5, 2], -0.12, { upper: true, seventh: true, pop: true, rn: 'M' }),
	m9: Q('m9', [0, 3, 7, 10, 2], [1, 1, 0.3, 1, 0.8], [0, -3, 1, -2, 2], -0.12, { seventh: true, pop: true }),
	P5: Q('5', [0, 7], [1, 1], [0, 1], -0.15, { upper: true, pop: true, power: true }),
}
export const VOCABULARIES = {
	triads: ['M', 'm', 'd', 'a'],
	classical: ['M', 'm', 'd', 'a', 'D7', 'M7', 'm7', 'h7', 'd7'],
	pop: Object.keys(QUALITIES),
}

// ── Key profiles (major, minor; C as tonic) ───────────────────────────────
// Values as in music21's analysis/discrete.py.
export const KEY_PROFILES = {
	krumhansl: { name: 'Krumhansl–Kessler (1982)', major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
	temperley: { name: 'Temperley–Kostka–Payne (2007)', major: [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400], minor: [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330] },
	aarden: { name: 'Aarden–Essen (2003)', major: [17.7661, 0.145624, 14.9265, 0.160186, 19.8049, 11.3587, 0.291248, 22.062, 0.145624, 8.15494, 0.232998, 4.95122], minor: [18.2648, 0.737619, 14.0499, 16.8599, 0.702494, 14.4362, 0.702494, 18.6161, 4.56621, 1.93186, 7.37619, 1.75623] },
	bellman: { name: 'Bellman–Budge (2005)', major: [16.80, 0.86, 12.95, 1.41, 13.49, 11.93, 1.25, 20.28, 1.80, 8.04, 0.62, 10.57], minor: [18.16, 0.69, 12.99, 13.34, 1.07, 11.15, 1.38, 21.07, 7.49, 1.53, 0.92, 10.21] },
	sapp: { name: 'Sapp simple weights (2011)', major: [2, 0, 1, 0, 1, 1, 0, 2, 0, 1, 0, 1], minor: [2, 0, 1, 1, 0, 1, 0, 2, 1, 0, 0.5, 0.5] },
}

export const DEFAULTS = {
	vocabulary: 'classical',
	keyProfile: 'aarden',
	// note weights
	pedalWeight: 0.55, // the part of a note only the sustain pedal holds
	ageBeats: 6, // a held note counts 1 / (1 + age / ageBeats)
	ornaments: true, // mark non-chord-tone candidates (passing, neighbour, suspension, appoggiatura)
	excusePassing: 0.7, // how much of a passing / neighbour note outside the chord is not held against it
	excuseSuspension: 1,
	excuseAppoggiatura: 0.5,
	accentWeight: 0.6, // notes struck on strong beats count more
	// segment fit
	outWeight: 0.75, // other notes against (Pardo's N)
	missWeight: 1.013, // missing chord tones against (Pardo's M)
	rootWeight: 0.08, // the root sounding
	bassRootWeight: 0.147, // the bass on the root (root position preferred)
	bassToneWeight: 0.062, // the bass on a chord tone
	priorWeight: 2.25, // quality priors
	keyWeight: 0.315, // chord tones in the local key
	commonWeight: 0.04, // the chord is a usual one in the local key
	// segmentation
	changeCost: 0.55, // per chord change, in beats of perfect fit
	weakCost: 0.467, // extra for a change off the beat
	strongBonus: 0.6, // less for a change on a strong beat (bar 1, the middle of the bar)
	bassSpan: 9, // semitones above the lowest nearby note that still count as the bass
	fifthBonus: 0.1, // root moves down a fifth
	resolveBonus: 0.27, // a dominant resolves to the chord a fifth below
	stepBonus: 0.013, // root moves by step
	maxBeats: 18, // longest segment considered (longer chords are merged afterwards)
	maxSlices: 40,
	// key
	keySmoothBeats: 6.667, // two-sided exponential window over the beat histograms
	keyChangeCost: 6.75, // per modulation (in beats of correlation)
	keyDistanceCost: 0.9, // per step on the circle of fifths
	keyBassWeight: 0.333,
	externalKeyConf: 1, // how much the chord search trusts keys given in o.keys (as the key passes' confidence)
	keyChordWeight: 0.5, // second key pass: how much the chords count against the profiles
	keyProfileMix: 1,
}

// ── Pitch spelling (line of fifths: F=-1 C=0 G=1 … ) ───────────────────────
const LETTERS = 'FCGDAEB'
export function fifthName(f, { ascii = false } = {}) {
	const letter = LETTERS[((f + 1) % 7 + 7) % 7]
	const acc = Math.floor((f + 1) / 7)
	const sh = ascii ? '#' : '♯', fl = ascii ? 'b' : '♭'
	return letter + (acc > 0 ? (acc === 2 ? (ascii ? '##' : '𝄪') : sh.repeat(acc)) : acc < 0 ? fl.repeat(-acc) : '')
}
export const fifthOfPc = pc => ((pc * 7) % 12 + 12) % 12 // 0..11 (C G D A E B F♯ C♯ G♯ D♯ A♯ E♯)
export const pcOfFifth = f => ((f * 7) % 12 + 12) % 12
/** The spelling of pc nearest to a centre on the line of fifths. */
export function spellNear(pc, centre) {
	let f = fifthOfPc(pc)
	while (f - centre > 6) f -= 12
	while (centre - f > 6) f += 12
	return f
}
// usual tonic spellings (fewest accidentals; ties go to flats in major, sharps in minor)
const MAJOR_TONIC = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5] // C D♭ D E♭ E F F♯ G A♭ A B♭ B
const MINOR_TONIC = [0, 7, 2, -3, 4, -1, 6, 1, 8, 3, -2, 5] // c c♯ d e♭ e f f♯ g g♯ a b♭ b
/** Line-of-fifths index of a key's tonic; sig = sharps (+) / flats (−) in the file's key signature, if any. */
export function tonicFifth(tonic, mode, sig = null) {
	if (sig != null) {
		// the key signature's own tonic: major sig, minor sig − 3
		const f = mode === 'major' ? sig : sig + 3
		if (pcOfFifth(f) === tonic) return f
	}
	return (mode === 'major' ? MAJOR_TONIC : MINOR_TONIC)[tonic]
}
export function keyName(k, o) { return fifthName(k.tf ?? tonicFifth(k.tonic, k.mode), o) + (k.mode === 'major' ? ' major' : ' minor') }
export function keyShort(k, o) { const n = fifthName(k.tf ?? tonicFifth(k.tonic, k.mode), o); return k.mode === 'major' ? n : n.toLowerCase() }

// ── Beat grid ──────────────────────────────────────────────────────────────

/**
 * Beats and bars of a @tonejs/midi file from its tempo map and time signatures.
 * @returns {{ beats: [{ time, strength, bar, beat }], aligned: number, beatSec: number }}
 *   strength 1 bar, 0.6 middle of a 4/4 or 6/8 bar, 0.4 other beats.
 *   aligned: the share of note-ons on a sixteenth or eighth-triplet of the grid
 *   (a performance recorded without a click scores low).
 */
export function beatGrid(midi) {
	const h = midi.header, ppq = h.ppq || 480
	let lastTick = 0, onTicks = []
	for (const t of midi.tracks) for (const n of t.notes) { if (n.channel === 9) continue; lastTick = Math.max(lastTick, n.ticks + n.durationTicks); onTicks.push(n.ticks) }
	const sigs = (h.timeSignatures?.length ? [...h.timeSignatures] : [{ ticks: 0, timeSignature: [4, 4] }]).sort((a, b) => a.ticks - b.ticks)
	if (sigs[0].ticks > 0) sigs.unshift({ ticks: 0, timeSignature: [4, 4] })
	const beats = []
	let bar = 1
	for (let s = 0; s < sigs.length; s++) {
		const [num, den] = sigs[s].timeSignature
		const compound = den === 8 && num % 3 === 0 && num > 3
		const beatTicks = compound ? ppq * 4 / den * 3 : ppq * 4 / den
		const perBar = compound ? num / 3 : num
		const end = s + 1 < sigs.length ? sigs[s + 1].ticks : lastTick + beatTicks
		let i = 0
		for (let tk = sigs[s].ticks; tk < end - 1e-6; tk += beatTicks, i++) {
			const b = i % perBar
			if (b === 0 && i > 0) bar++
			const strength = b === 0 ? 1 : (perBar === 4 || perBar === 2 && false) && b === perBar / 2 ? 0.6 : 0.4
			beats.push({ time: h.ticksToSeconds(tk), ticks: tk, strength, bar, beat: b + 1 })
		}
		bar++
	}
	let ok = 0
	for (const tk of onTicks) {
		const r16 = tk % (ppq / 4), r3 = tk % (ppq / 3), tol = ppq / 32
		if (Math.min(r16, ppq / 4 - r16) <= tol || Math.min(r3, ppq / 3 - r3) <= tol) ok++
	}
	const beatSec = beats.length > 1 ? (beats.at(-1).time - beats[0].time) / (beats.length - 1) : 0.5
	return { beats, aligned: onTicks.length ? ok / onTicks.length : 0, beatSec }
}

/** Key signature of a @tonejs/midi file as sharps (+) / flats (−), or null. */
export function keySignatureOf(midi) {
	const k = midi.header.keySignatures?.[0]
	if (!k) return null
	const f = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 }[k.key]
	if (f == null) return null
	return k.scale === 'minor' ? f - 3 : f
}

// ── Notes → slices ─────────────────────────────────────────────────────────

/** Sustain-pedal ends: pedal = [{ time, value 0-127, channel? }]. Returns a function off(note) → sounding end. */
function pedalOffs(pedal = []) {
	const byCh = new Map()
	for (const e of [...pedal].sort((a, b) => a.time - b.time)) {
		const ch = e.channel ?? 0
		if (!byCh.has(ch)) byCh.set(ch, [])
		const list = byCh.get(ch), down = e.value >= 64
		const last = list.at(-1)
		if (down && (!last || last.up != null)) list.push({ down: e.time, up: null })
		else if (!down && last && last.up == null) last.up = e.time
	}
	for (const list of byCh.values()) for (const p of list) if (p.up == null) p.up = Infinity
	return n => {
		const list = byCh.get(n.channel ?? 0) || byCh.get(0)
		if (!list) return n.off
		for (const p of list) if (p.down <= n.off && n.off < p.up) return Math.min(p.up, n.off + 30)
		return n.off
	}
}

const strengthAt = (grid, t, beatLen) => {
	if (!grid) return 0.3
	const { times, strengths } = grid
	let lo = 0, hi = times.length - 1
	while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (times[mid] <= t + 1e-9) lo = mid; else hi = mid - 1 }
	const b = beatLen(lo)
	const tol = b / 16
	if (Math.abs(t - times[lo]) <= tol) return strengths[lo]
	if (lo + 1 < times.length && Math.abs(times[lo + 1] - t) <= tol) return strengths[lo + 1]
	const frac = (t - times[lo]) / b
	if (Math.abs(frac - 0.5) < 1 / 16) return 0.2
	if (Math.abs(frac - 1 / 3) < 1 / 24 || Math.abs(frac - 2 / 3) < 1 / 24 || Math.abs(frac - 0.25) < 1 / 16 || Math.abs(frac - 0.75) < 1 / 16) return 0.1
	return 0.05
}

// ── Non-chord tones ────────────────────────────────────────────────────────
// Candidates are marked without knowing the chord (the rules of Masada &
// Bunescu 2018, appendix B, plus appoggiaturas); a candidate is only excused
// when it is not in the chord a segment is scored against, so marking a chord
// tone by mistake costs nothing.

const DISSONANT = new Set([1, 2, 6, 10, 11])
const SEVENTHS = [[0, 4, 7, 10], [0, 3, 7, 10], [0, 3, 6, 10], [0, 3, 6, 9], [0, 4, 7, 11]]
const dissonant = (a, b, bassBelow) => { const iv = Math.abs(a - b) % 12; return DISSONANT.has(iv) || (bassBelow && iv === 5 && a > b) }

/**
 * Sets n.orn = { type, from, to } on notes that look like non-chord tones:
 *   passing / neighbour  short, weak, approached and left by step
 *   suspension           held over (or restruck) into a chord it is dissonant with, resolving by step (down, or up a semitone)
 *   appoggiatura         struck on a stronger beat than its resolution, dissonant, resolving by step
 *                        ('accented passing' when also approached by step)
 * from..to is the part of the note that is ornamental (a suspension's preparation is a chord tone).
 */
export function markOrnaments(notes, accentOf, beatAt, eps, { maxBeats = 2 } = {}) {
	const byOff = [...notes].sort((a, b) => a.off - b.off)
	const byOn = [...notes].sort((a, b) => a.on - b.on)
	const ons = byOn.map(n => n.on)
	const maxLen = notes.reduce((m, n) => Math.max(m, n.off - n.on), 0)
	const lowerOn = x => { let lo = 0, hi = ons.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ons[m] < x) lo = m + 1; else hi = m } return lo }
	const lowerOff = x => { let lo = 0, hi = byOff.length; while (lo < hi) { const m = (lo + hi) >> 1; if (byOff[m].off < x) lo = m + 1; else hi = m } return lo }
	const startingAt = t => { const out = []; for (let i = lowerOn(t - eps); i < byOn.length && byOn[i].on <= t + eps; i++) out.push(byOn[i]); return out }
	const endingAt = t => { const out = []; for (let i = lowerOff(t - eps); i < byOff.length && byOff[i].off <= t + eps; i++) out.push(byOff[i]); return out }
	// notes sounding just after t (held keys only, not the pedal)
	const soundingAt = (t, except) => {
		const out = []
		for (let i = lowerOn(t - maxLen - eps); i < byOn.length && byOn[i].on <= t + eps; i++) { const m = byOn[i]; if (m !== except && m.off > t + eps) out.push(m) }
		return out
	}
	// n is dissonant at t against a voice that holds through R (the resolution):
	// over the bass a 2nd / 9th, 4th or 7th; as the bass, a 2nd or 7th against an upper voice
	const SUS_OVER = new Set([1, 2, 5, 10, 11]), SUS_UNDER = new Set([1, 2, 10, 11])
	const isDissonantAt = (n, t, R) => {
		const others = soundingAt(t, n).filter(m => m.off >= R - eps)
		if (!others.length) return false
		let bass = others[0]
		for (const m of others) if (m.pitch < bass.pitch) bass = m
		let hit = false
		if (bass.pitch < n.pitch) hit = SUS_OVER.has((n.pitch - bass.pitch) % 12)
		else hit = others.some(m => m.pitch > n.pitch && SUS_UNDER.has((m.pitch - n.pitch) % 12))
		if (!hit) return false
		// a chord seventh behaves like a suspension but is part of the chord: if n is the
		// seventh of a seventh chord made of what sounds, it is not marked
		const pcs = new Set(soundingAt(t, n).map(m => m.pitch % 12))
		pcs.add(n.pitch % 12)
		if (pcs.size >= 3) for (const sev of SEVENTHS) {
			const root = (n.pitch - sev[3] + 120) % 12
			const chord = sev.map(x => (root + x) % 12)
			if ([...pcs].every(pc => chord.includes(pc))) return false
		}
		return true
	}
	const consonantWithBass = (r, t) => {
		const others = soundingAt(t, r)
		let bass = null
		for (const m of others) if (!bass || m.pitch < bass.pitch) bass = m
		return !bass || bass.pitch >= r.pitch || !dissonant(r.pitch, bass.pitch, true)
	}
	// figured-bass name of a suspension: 4–3, 9–8, 7–6, or 2–3 in the bass
	const susFigure = (n, T, R) => {
		const others = soundingAt(T, n).filter(m => m.off >= R - eps)
		let bass = null
		for (const m of others) if (!bass || m.pitch < bass.pitch) bass = m
		if (!bass || bass.pitch > n.pitch) return '2–3'
		const iv = (n.pitch - bass.pitch) % 12
		return iv === 5 ? '4–3' : iv === 1 || iv === 2 ? '9–8' : iv === 10 || iv === 11 ? '7–6' : ''
	}
	// the note that takes over the voice of n at time t by step (down 1-2, or up 1 when upOk)
	const resolutionOf = (n, t, upOk) => {
		for (const r of startingAt(t)) {
			const d = r.pitch - n.pitch
			if (r !== n && (d === -1 || d === -2 || (upOk && (d === 1 || d === 2)))) return r
		}
		return null
	}
	for (const n of notes) {
		n.orn = null
		const len = n.off - n.on, beat = beatAt(n.on)
		// passing and neighbour notes
		if (len <= 0.75 * beat) {
			let prev = null
			for (const q of endingAt(n.on)) if (q !== n && q.on < n.on && Math.abs(q.pitch - n.pitch) <= 2 && q.pitch !== n.pitch) { prev = q; break }
			if (prev) {
				let next = null
				for (const q of startingAt(n.off)) if (q !== n && Math.abs(q.pitch - n.pitch) <= 2 && q.pitch !== n.pitch) { next = q; break }
				if (next && !(accentOf(n.on) >= accentOf(prev.on) && accentOf(n.on) > 0.2)) {
					n.orn = { type: Math.sign(prev.pitch - n.pitch) === Math.sign(next.pitch - n.pitch) ? 'neighbour' : 'passing', from: n.on, to: n.off }
					continue
				}
			}
		}
		const R = n.off
		// suspension, held over: a new chord arrives at T while n sounds, n is dissonant with it, then steps down at R
		{
			const r = resolutionOf(n, R, false) || ((n.pitch % 12) && resolutionOf(n, R, true)?.pitch === n.pitch + 1 ? resolutionOf(n, R, true) : null)
			if (r && consonantWithBass(r, R)) {
				let T = null
				for (let i = lowerOn(n.on + eps * 2); i < byOn.length && byOn[i].on < R - eps; i++) {
					const t = byOn[i].on
					if (R - t > maxBeats * beatAt(t)) continue
					if (accentOf(t) >= accentOf(R) && isDissonantAt(n, t, R)) { T = t; break }
				}
				if (T != null) { n.orn = { type: 'suspension', from: T, to: R, figure: susFigure(n, T, R) }; continue }
			}
		}
		if (len > maxBeats * beat) continue
		const r = resolutionOf(n, R, true)
		if (!r || !consonantWithBass(r, R) || !isDissonantAt(n, n.on, R)) continue
		// restruck suspension: the same pitch just ended as n starts
		const prev = endingAt(n.on).filter(q => q !== n && q.on < n.on - eps)
		if (prev.some(q => q.pitch === n.pitch) && r.pitch < n.pitch) { n.orn = { type: 'suspension', from: n.on, to: R, figure: susFigure(n, n.on, R) }; continue }
		// appoggiatura: on a stronger beat than its resolution
		if (accentOf(n.on) > accentOf(R) || (accentOf(n.on) >= 0.4 && accentOf(R) < 0.4)) {
			const step = prev.some(q => Math.abs(q.pitch - n.pitch) <= 2 && q.pitch !== n.pitch)
			n.orn = { type: step ? 'accented passing' : 'appoggiatura', from: n.on, to: R }
		}
	}
}

// ── Template fit ───────────────────────────────────────────────────────────

/** Labels of a vocabulary: [{ root, q, tones[], w[], wsum, prior }]. */
export function labelsOf(vocabulary = 'classical') {
	const names = Array.isArray(vocabulary) ? vocabulary : VOCABULARIES[vocabulary] || VOCABULARIES.classical
	const out = []
	for (const q of names) {
		const d = QUALITIES[q]
		for (let r = 0; r < 12; r++) out.push({ root: r, q, tones: d.tones.map(t => (r + t) % 12), w: d.w, wsum: d.w.reduce((a, b) => a + b, 0), prior: d.prior, mask: d.tones.reduce((m, t) => m | (1 << ((r + t) % 12)), 0) })
	}
	return out
}

// scale degrees allowed in a key (major; minor = natural + raised 6 and 7)
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10, 11, 9] }
const SCALE_MASK = { major: SCALE.major.reduce((m, x) => m | 1 << x, 0), minor: SCALE.minor.reduce((m, x) => m | 1 << x, 0) }
// usual chords: [semitones over the tonic, quality]
const COMMON = {
	major: ['0M', '0M7', '2m', '2m7', '4m', '4m7', '5M', '5M7', '7M', '7D7', '9m', '9m7', '11d', '11h7', '2D7', '4D7', '9D7', '0D7', '11d7', '1d7', '6d7', '8d7', '5m', '8M', '10M', '1M', '0M6', '5M6', '2M', '7sus4', '7'.concat('7sus4'), '0add9', '5add9', '0P5', '7P5', '5P5', '9P5', '9madd9', '0sus2', '0sus4'],
	minor: ['0m', '0m7', '2d', '2h7', '3M', '3M7', '5m', '5m7', '7M', '7D7', '7m', '8M', '8M7', '10M', '10D7', '11d', '11d7', '0D7', '2D7', '5D7', '1M', '5M', '0M', '6d7', '1d7', '0m6', '0P5', '7P5', '0madd9', '0m9', '5m9', '7sus4'],
}
const COMMON_SET = { major: new Set(COMMON.major), minor: new Set(COMMON.minor) }

function fitLabel(L, V, tot, B, btot, keyTerm, p, F = null, ftot = 0) {
	let inn = 0, miss = 0, fin = 0
	const share = tot / L.tones.length
	for (let k = 0; k < L.tones.length; k++) {
		const v = V[L.tones[k]]
		inn += v
		if (F) fin += F[L.tones[k]]
		const have = v / (0.3 * share)
		if (have < 1) miss += L.w[k] * (1 - have)
	}
	// non-chord-tone candidates outside this chord are (partly) excused
	const out = tot - inn - (ftot - fin)
	let f = (inn - p.outWeight * out) / tot - p.missWeight * miss / L.wsum + p.rootWeight * V[L.root] / tot + p.priorWeight * L.prior
	if (btot > 0) {
		let bin = 0
		for (const t of L.tones) bin += B[t]
		f += p.bassRootWeight * B[L.root] / btot + p.bassToneWeight * bin / btot
	}
	return f + keyTerm
}

/** How well a label sits in a key (without its confidence): scale membership and usual chords. */
function keyFit(L, key, p) {
	const relMask = ((L.mask >> key.tonic) | (L.mask << (12 - key.tonic))) & 0xfff
	let inKey = 0, n = 0
	for (let b = 0; b < 12; b++) if (relMask >> b & 1) { n++; if (SCALE_MASK[key.mode] >> b & 1) inKey++ }
	const rel = (L.root - key.tonic + 12) % 12
	return p.keyWeight * (inKey / n - 1) + (COMMON_SET[key.mode].has(rel + L.q) ? p.commonWeight : 0)
}

// ── Keys ───────────────────────────────────────────────────────────────────

function pearson(a, b) {
	let ma = 0, mb = 0
	for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i] }
	ma /= 12; mb /= 12
	let num = 0, da = 0, db = 0
	for (let i = 0; i < 12; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y }
	return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0
}
const circleDist = (a, b) => {
	// distance between keys on the circle of fifths, relative major/minor = 1 apart
	const fa = fifthOfPc(a.tonic) + (a.mode === 'minor' ? 3 : 0), fb = fifthOfPc(b.tonic) + (b.mode === 'minor' ? 3 : 0)
	let d = Math.abs(fa - fb) % 12
	d = Math.min(d, 12 - d)
	return d + (a.mode !== b.mode ? 1 : 0)
}
export const KEYS = [...Array(24)].map((_, i) => ({ tonic: i % 12, mode: i < 12 ? 'major' : 'minor' }))

/** Correlation of a pitch-class vector with each of the 24 keys. */
export function keyScores(v, profile = 'aarden') {
	const P = KEY_PROFILES[profile] || KEY_PROFILES.aarden
	return KEYS.map(k => {
		const prof = P[k.mode], rot = new Array(12)
		for (let i = 0; i < 12; i++) rot[(i + k.tonic) % 12] = prof[i]
		return pearson(v, rot)
	})
}

/**
 * Local keys over frames (one per beat): smoothed histograms, correlation,
 * Viterbi with a cost per modulation and per step on the circle of fifths.
 * @returns { frameKey: Int8Array (0-23), global: index, scores }
 */
export function findKeys(frames, p) {
	const n = frames.length
	if (!n) return { frameKey: new Int8Array(0), global: 0, conf: new Float32Array(0) }
	const decay = Math.exp(-1 / p.keySmoothBeats)
	const fwd = frames.map(() => new Float64Array(12)), bwd = frames.map(() => new Float64Array(12))
	for (let i = 0; i < n; i++) for (let k = 0; k < 12; k++) fwd[i][k] = frames[i][k] + (i ? fwd[i - 1][k] * decay : 0)
	for (let i = n - 1; i >= 0; i--) for (let k = 0; k < 12; k++) bwd[i][k] = frames[i][k] + (i < n - 1 ? bwd[i + 1][k] * decay : 0)
	const total = new Float64Array(12)
	for (const f of frames) for (let k = 0; k < 12; k++) total[k] += f[k]
	const glob = keyScores(total, p.keyProfile)
	const global = glob.indexOf(Math.max(...glob))
	const em = []
	for (let i = 0; i < n; i++) {
		const s = new Float64Array(12)
		for (let k = 0; k < 12; k++) s[k] = fwd[i][k] + bwd[i][k] - frames[i][k]
		em.push(s.some(x => x > 0) ? keyScores(s, p.keyProfile) : glob)
	}
	const D = KEYS.map(a => KEYS.map(b => a === b ? 0 : p.keyChangeCost + p.keyDistanceCost * circleDist(a, b)))
	let score = em[0].map((e, k) => e + (k === global ? 0.5 : 0))
	const back = []
	for (let i = 1; i < n; i++) {
		const nxt = new Float64Array(24), bp = new Int8Array(24)
		for (let k = 0; k < 24; k++) {
			let best = -Infinity, arg = 0
			for (let j = 0; j < 24; j++) { const s = score[j] - D[j][k]; if (s > best) { best = s; arg = j } }
			nxt[k] = best + em[i][k]; bp[k] = arg
		}
		back.push(bp); score = nxt
	}
	const frameKey = new Int8Array(n)
	let k = score.indexOf(Math.max(...score))
	for (let i = n - 1; i >= 0; i--) { frameKey[i] = k; if (i) k = back[i - 1][k] }
	// confidence: how far the chosen key's correlation is above the runner-up (0..1)
	const conf = new Float32Array(n)
	for (let i = 0; i < n; i++) {
		const e = [...em[i]].sort((a, b) => b - a)
		conf[i] = Math.max(0.3, Math.min(1, (em[i][frameKey[i]] - 0.2) / 0.5))
	}
	return { frameKey, global, conf, em }
}

/**
 * Second key pass, from the chords: a key explains a chord when the chord is
 * diatonic in it, more when it is that key's tonic or dominant, most when a
 * dominant resolves to the tonic. Mixed with the profile correlation of the
 * frames under each chord; Viterbi over chords with the same modulation cost.
 */
function refineKeys(chords, frameEm, frameOf, p) {
	const n = chords.length
	if (!n) return []
	const em = chords.map((c, ci) => {
		const len = Math.max(0.25, Math.min(c.lenBeats, 4))
		const prof = new Float64Array(24)
		const [f0, f1] = c.frames
		for (let f = f0; f <= f1; f++) for (let k = 0; k < 24; k++) prof[k] += frameEm[f][k]
		const nf = f1 - f0 + 1
		const out = new Float64Array(24)
		const nx = chords.slice(ci + 1, ci + 3).find(x => x.root != null)
		for (let k = 0; k < 24; k++) {
			let e = p.keyProfileMix * prof[k] / nf
			if (c.root != null) {
				const key = KEYS[k]
				const rel = (c.root - key.tonic + 12) % 12, q = c.quality
				const dia = DIATONIC[key.mode][rel]?.includes(q)
				const dom = (rel === 7 && (q === 'M' || q === 'D7' || q === 'D9')) || (rel === 11 && (q === 'd' || q === 'd7' || (q === 'h7' && key.mode === 'major')))
				const ton = rel === 0 && (q === 'M' || q === 'm' || q === 'M7' || q === 'add9' || q === 'madd9') && QUALITIES[q].tones.includes(key.mode === 'major' ? 4 : 3)
				let x = dia ? 1 : -0.6
				if (ton) x += 0.6
				if (dom) {
					x += 0.4
					if (nx && (nx.root - key.tonic + 12) % 12 === 0 && (nx.quality === 'M' || nx.quality === 'm') && QUALITIES[nx.quality].tones.includes(key.mode === 'major' ? 4 : 3)) x += 1.2
				}
				// an applied dominant resolving inside the key is fine
				if (!dia && (q === 'M' || q === 'D7' || q === 'd7') && nx && (nx.root - c.root + 12) % 12 === (q === 'd7' ? 1 : 5) && DIATONIC[key.mode][(nx.root - key.tonic + 12) % 12]) x = 0.3
				e += p.keyChordWeight * x
			}
			out[k] = e * len
		}
		return out
	})
	const D = KEYS.map(a => KEYS.map(b => a === b ? 0 : p.keyChangeCost + p.keyDistanceCost * circleDist(a, b)))
	let score = em[0], back = []
	for (let i = 1; i < n; i++) {
		const nxt = new Float64Array(24), bp = new Int8Array(24)
		for (let k = 0; k < 24; k++) {
			let best = -Infinity, arg = 0
			for (let j = 0; j < 24; j++) { const s = score[j] - D[j][k]; if (s > best) { best = s; arg = j } }
			nxt[k] = best + em[i][k]; bp[k] = arg
		}
		back.push(bp); score = nxt
	}
	const out = new Array(n)
	let k = score.indexOf(Math.max(...score))
	for (let i = n - 1; i >= 0; i--) { out[i] = k; if (i) k = back[i - 1][k] }
	return out
}

// ── Roman numerals ─────────────────────────────────────────────────────────

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
// semitones over the tonic → [degree index, accidental] in each mode
const DEG = {
	major: { 0: [0, ''], 1: [1, '♭'], 2: [1, ''], 3: [2, '♭'], 4: [2, ''], 5: [3, ''], 6: [3, '♯'], 7: [4, ''], 8: [5, '♭'], 9: [5, ''], 10: [6, '♭'], 11: [6, ''] },
	// minor: either form of 6 and 7 is unmarked (VI and vi°, VII and vii°), as in Kostka–Payne
	minor: { 0: [0, ''], 1: [1, '♭'], 2: [1, ''], 3: [2, ''], 4: [2, '♯'], 5: [3, ''], 6: [3, '♯'], 7: [4, ''], 8: [5, ''], 9: [5, ''], 10: [6, ''], 11: [6, ''] },
}
// diatonic triad / seventh qualities by semitones over the tonic
const DIATONIC = {
	major: { 0: ['M', 'M7', 'M6', 'add9', 'M9', 'sus2', 'sus4', 'P5'], 2: ['m', 'm7', 'm9', 'sus4', 'sus2', 'P5', 'madd9'], 4: ['m', 'm7', 'P5'], 5: ['M', 'M7', 'M6', 'add9', 'M9', 'sus2', 'P5'], 7: ['M', 'D7', 'sus4', '7sus4', 'D9', 'P5', 'add9'], 9: ['m', 'm7', 'm9', 'madd9', 'P5'], 11: ['d', 'h7'] },
	minor: { 0: ['m', 'm7', 'm6', 'm9', 'madd9', 'P5'], 2: ['d', 'h7'], 3: ['M', 'M7', 'a', 'P5'], 5: ['m', 'm7', 'M', 'D7', 'm9', 'P5'], 7: ['M', 'D7', 'm', 'm7', 'sus4', '7sus4', 'D9', 'P5'], 8: ['M', 'M7', 'P5', 'add9', 'M9'], 10: ['M', 'D7', 'P5'], 11: ['d', 'd7'] },
}
const FIGURES = { triad: ['', '6', '64'], seventh: ['7', '65', '43', '42'] }

/** Inversion 0-3 from the bass's interval over the root. */
export function inversionOf(q, root, bass) {
	if (bass == null) return 0
	const iv = (bass - root + 12) % 12
	const tones = QUALITIES[q].tones
	const k = tones.indexOf(iv)
	if (k <= 0) return 0
	if (tones[k] === 2) return 0 // a ninth in the bass is not an inversion
	return Math.min(k, QUALITIES[q].seventh ? 3 : 2)
}

function numeral(relDeg, mode, q, inv) {
	const [d, acc] = DEG[mode][relDeg]
	const def = QUALITIES[q]
	let s = NUMERALS[d]
	if (!def.upper) s = s.toLowerCase()
	const fig = def.seventh ? FIGURES.seventh[inv] : (FIGURES.triad[inv] ?? '')
	let qual = def.rn || ''
	if (q === 'D7' || q === 'm7') qual = ''
	if (q === 'D9' || q === 'M9' || q === 'm9') return acc + s + (q === 'M9' ? 'M9' : '9')
	// added-tone and sus chords: no figured-bass inversion (the symbol carries the bass)
	if (def.pop && !def.seventh) return acc + s + ({ P5: '5', M6: '6', m6: '6', sus4: 'sus4', sus2: 'sus2', add9: 'add9', madd9: 'add9' }[q] || '')
	if (q === '7sus4') return acc + s + '7sus4'
	return acc + s + qual + fig
}

/**
 * Roman numeral of a chord in a key: { rn, func ('T'|'PD'|'D'|'?'), applied?, kind }
 * kind: 'diatonic' | 'applied' | 'mixture' | 'neapolitan' | 'aug6' | 'chromatic'
 */
export function romanOf(ch, key, next = null) {
	const rel = (ch.root - key.tonic + 12) % 12
	const inv = inversionOf(ch.quality, ch.root, ch.bass)
	const q = ch.quality, mode = key.mode
	const func = r => ({ 0: 'T', 9: mode === 'major' ? 'T' : 'PD', 8: mode === 'minor' ? 'T' : 'PD', 4: 'T', 3: 'T', 2: 'PD', 5: 'PD', 7: 'D', 11: 'D', 10: mode === 'minor' ? 'D' : 'PD', 1: 'PD' }[r] ?? '?')
	// augmented sixth: a dominant-seventh sound on ♭6 going to V (or the cadential 6/4)
	const nrel = next ? (next.root - key.tonic + 12) % 12 : -1
	const nbass = next ? ((next.bass ?? next.root) - key.tonic + 12) % 12 : -1
	if (rel === 8 && (q === 'D7' || q === 'M') && next && (nrel === 7 || nbass === 7) && ch.bass != null && (ch.bass - key.tonic + 12) % 12 === 8) {
		if (q === 'D7') return { rn: ch.hasFifth === false ? 'It+6' : 'Ger+6', func: 'PD', kind: 'aug6' }
	}
	const dia = DIATONIC[mode][rel]
	if (dia && dia.includes(q)) {
		let f = func(rel)
		if (rel === 0 && inv === 2 && next && nrel === 7) f = 'D' // cadential 6/4
		return { rn: numeral(rel, mode, q, inv), func: f, kind: 'diatonic' }
	}
	// Neapolitan
	if (rel === 1 && q === 'M') return { rn: inv === 1 ? 'N6' : 'N' + (FIGURES.triad[inv] || ''), func: 'PD', kind: 'neapolitan' }
	// applied dominants and leading-tone chords
	const isDom = q === 'M' || q === 'D7' || q === 'D9'
	const isLT = q === 'd' || q === 'd7' || q === 'h7'
	if (isDom || isLT) {
		const target = isDom ? (rel + 5) % 12 : (rel + 1) % 12
		const tq = DIATONIC[mode][target]
		if (target !== 0 && tq && (tq.includes('M') || tq.includes('m'))) {
			const tqq = tq.includes('M') && !(mode === 'major' && [2, 4, 9].includes(target)) ? 'M' : 'm'
			const tnum = numeral(target, mode, tqq, 0)
			const head = isDom ? numeral(7, 'major', q, inv) : numeral(11, 'major', q, inv)
			return { rn: head + '/' + tnum, func: 'D', kind: 'applied', target }
		}
	}
	// mixture: chords of the parallel mode
	const other = mode === 'major' ? 'minor' : 'major'
	const odia = DIATONIC[other][rel]
	if (odia && odia.includes(q)) {
		const [d] = DEG[other][rel]
		const acc = mode === 'major' ? DEG.major[rel][1] : DEG.minor[rel][1]
		let s = numeral(rel, other, q, inv)
		s = s.replace(/^[♭♯]/, '')
		return { rn: acc + s, func: func(rel), kind: 'mixture' }
	}
	return { rn: numeral(rel, mode, q, inv), func: func(rel), kind: 'chromatic' }
}

// ── Analysis ───────────────────────────────────────────────────────────────

/**
 * @param notes [{ pitch, on, off, velocity?, channel? }] (drums excluded by the caller)
 * @param o.beats [{ time, strength? }] in the same unit as the notes (one per beat)
 * @param o.aligned share of onsets on the grid (from beatGrid); below 0.6 the metre is ignored
 * @param o.pedal [{ time, value, channel? }] sustain pedal (CC64)
 * @param o.keySig sharps (+) / flats (−) of the file's key signature, for spelling
 * @param o.keys [{ start, end, tonic, mode, tf? }] local keys from elsewhere (e.g. AugmentedNet):
 *   they replace both key passes; tf (line-of-fifths tonic) keeps their spelling
 * @returns {{ chords, keys, global, slices, ms }}
 */
export function analyze(notes, o = {}) {
	const t0 = (typeof performance !== 'undefined' ? performance : Date).now()
	const p = { ...DEFAULTS, ...o.params, ...(o.vocabulary ? { vocabulary: o.vocabulary } : {}), ...(o.keyProfile ? { keyProfile: o.keyProfile } : {}) }
	const ns = notes.map((n, idx) => ({ ...n, idx })).filter(n => n.off > n.on)
	if (!ns.length) return { chords: [], keys: [], global: null, ms: 0 }
	ns.sort((a, b) => a.on - b.on || a.pitch - b.pitch)
	const start = ns[0].on
	// beats: given, or a steady grid from the median inter-onset interval
	let beats = (o.beats || []).map(b => ({ time: b.time ?? b, strength: b.strength ?? 0.4 }))
	if (beats.length < 2) {
		const span = Math.max(...ns.map(n => n.off)) - start
		const step = o.beatLen || 0.5
		beats = []
		for (let t = start; t <= start + span + step; t += step) beats.push({ time: t, strength: 0.4 })
	}
	const useMetre = o.aligned == null || o.aligned >= 0.6
	const times = beats.map(b => b.time), strengths = beats.map(b => useMetre ? b.strength : 0.4)
	const beatLen = i => i + 1 < times.length ? times[i + 1] - times[i] : i > 0 ? times[i] - times[i - 1] : 0.5
	const idxAt = t => { let lo = 0, hi = times.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (times[m] <= t) lo = m; else hi = m - 1 } return lo }
	const beatAt = t => beatLen(idxAt(t))
	const grid = useMetre ? { times, strengths } : null
	const accentOf = t => strengthAt(grid, t, beatLen)
	// beat position (fractional) of a time: durations in beats make every piece alike
	const beatPos = t => {
		if (t <= times[0]) return (t - times[0]) / beatLen(0)
		const i = idxAt(t)
		return i + (t - times[i]) / beatLen(i)
	}
	const eps = Math.min(0.03, beatLen(0) / 24)

	// sounding ends with the pedal
	const soff = pedalOffs(o.pedal)
	for (const n of ns) { n.soff = Math.max(n.off, soff(n)); n.acc = accentOf(n.on) }
	if (p.ornaments) markOrnaments(ns, accentOf, beatAt, eps); else for (const n of ns) n.orn = null

	// partition points: note onsets (chords struck together count once), and the end
	const pts = []
	for (const n of ns) if (!pts.length || n.on - pts.at(-1) > eps) pts.push(n.on)
	const end = Math.max(...ns.map(n => n.soff))
	pts.push(end)
	const P = pts.length - 1 // slices
	const bpos = pts.map(beatPos)
	const V = new Float64Array((P + 1) * 12), B = new Float64Array((P + 1) * 12), Fx = new Float64Array((P + 1) * 12) // prefix sums
	const slice = new Float64Array(P * 12), sbass = new Float64Array(P * 12), sfx = new Float64Array(P * 12)
	const EXCUSE = { passing: p.excusePassing, neighbour: p.excusePassing, suspension: p.excuseSuspension, appoggiatura: p.excuseAppoggiatura, 'accented passing': p.excuseAppoggiatura }
	const lowest = new Float64Array(P).fill(999), lowestHeld = new Float64Array(P).fill(999)
	const sliceOf = t => { let lo = 0, hi = P - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pts[m] <= t + eps) lo = m; else hi = m - 1 } return lo }
	for (const n of ns) {
		const pc = n.pitch % 12
		const wNote = 1 + p.accentWeight * (n.acc - 0.3)
		const ex = n.orn ? EXCUSE[n.orn.type] : 0
		for (let s = sliceOf(n.on); s < P && pts[s] < n.soff - eps; s++) {
			const a = Math.max(pts[s], n.on), bEnd = Math.min(pts[s + 1], n.soff)
			if (bEnd <= a) continue
			const held = Math.max(0, Math.min(bEnd, n.off) - a), ped = (bEnd - a) - held
			const mid = (a + bEnd) / 2
			const age = beatPos(mid) - beatPos(n.on)
			const dur = beatPos(bEnd) - beatPos(a)
			const frac = dur / Math.max(1e-9, bEnd - a)
			const w = wNote * (held + p.pedalWeight * ped) * frac / (1 + age / p.ageBeats)
			slice[s * 12 + pc] += w
			if (ex && a >= n.orn.from - eps && a < n.orn.to - eps) sfx[s * 12 + pc] += ex * w
			if (n.on <= pts[s] + eps && n.pitch < lowest[s]) lowest[s] = n.pitch
			if (n.pitch < lowestHeld[s]) lowestHeld[s] = n.pitch
		}
	}
	// the bass: a slice's lowest struck note votes only when it is near the lowest
	// note of the surrounding beat (so the upper notes of a broken chord don't)
	const lowAround = new Float64Array(P).fill(999)
	for (let s = 0, a = 0, b = 0; s < P; s++) {
		while (bpos[a] < bpos[s] - 1) a++
		while (b < P && bpos[b] <= bpos[s] + 1) b++
		for (let k = a; k < b; k++) if (lowest[k] < lowAround[s]) lowAround[s] = lowest[k]
	}
	for (let s = 0; s < P; s++) {
		const low = lowest[s] < 999 && lowest[s] <= lowAround[s] + p.bassSpan ? lowest[s] : lowestHeld[s] < 999 && lowestHeld[s] <= lowAround[s] + p.bassSpan ? lowestHeld[s] : null
		const dur = bpos[s + 1] - bpos[s]
		if (low != null) sbass[s * 12 + low % 12] += dur
		for (let k = 0; k < 12; k++) {
			V[(s + 1) * 12 + k] = V[s * 12 + k] + slice[s * 12 + k]
			B[(s + 1) * 12 + k] = B[s * 12 + k] + sbass[s * 12 + k]
			Fx[(s + 1) * 12 + k] = Fx[s * 12 + k] + sfx[s * 12 + k]
		}
	}

	// ── keys, one frame per beat ──
	const nFrames = Math.max(1, Math.ceil(beatPos(end)) - Math.floor(beatPos(start)) + 1)
	const f0 = Math.floor(beatPos(start))
	const frames = [...Array(nFrames)].map(() => new Float64Array(12))
	for (let s = 0; s < P; s++) {
		const fi = Math.min(nFrames - 1, Math.max(0, Math.floor(bpos[s]) - f0))
		for (let k = 0; k < 12; k++) frames[fi][k] += slice[s * 12 + k] + p.keyBassWeight * sbass[s * 12 + k]
	}
	const K = findKeys(frames, p)
	// keys from elsewhere (AugmentedNet in #041): they replace both key passes
	const ext = o.keys?.length ? [...o.keys].sort((a, b) => a.start - b.start) : null
	const extAt = t => { let k = ext[0]; for (const x of ext) { if (x.start <= t + 1e-9) k = x; else break } return k }
	const extIndex = k => KEYS.findIndex(x => x.tonic === k.tonic && x.mode === k.mode)
	if (ext) {
		for (let i = 0; i < nFrames; i++) {
			// the key at the middle of the beat
			const bp = f0 + i + 0.5
			const ti = Math.min(times.length - 1, Math.max(0, Math.floor(bp)))
			const t = ti < times.length - 1 ? times[ti] + (bp - ti) * beatLen(ti) : times[ti]
			K.frameKey[i] = extIndex(extAt(t)); K.conf[i] = p.externalKeyConf
		}
	}
	const keyAtBeat = bp => {
		const i = Math.min(nFrames - 1, Math.max(0, Math.floor(bp) - f0))
		const k = KEYS[K.frameKey[i]]
		return { ...k, conf: K.conf[i] }
	}

	// ── chords: semi-Markov Viterbi over the partition points ──
	const labels = labelsOf(p.vocabulary)
	const NL = labels.length
	const KT = new Float64Array(24 * NL)
	for (let k = 0; k < 24; k++) for (let l = 0; l < NL; l++) KT[k * NL + l] = keyFit(labels[l], KEYS[k], p)
	const frameAt = bp => Math.min(nFrames - 1, Math.max(0, Math.floor(bp) - f0))
	const TOP = 5, BEAM = 6
	// states[j] = [{ score, label, from, prevState }] best ways to end a segment at point j
	const states = [[{ score: 0, label: -1, from: -1, prev: null }]]
	const segV = new Float64Array(12), segB = new Float64Array(12), segF = new Float64Array(12)
	const fits = new Float64Array(NL)
	const changeCost = j => {
		const acc = useMetre ? accentOf(pts[j]) : 0.4
		return p.changeCost + p.weakCost * Math.max(0, 0.4 - acc) / 0.4 * (useMetre ? 1 : 0.3) - (useMetre ? p.strongBonus * Math.max(0, acc - 0.4) / 0.6 : 0)
	}
	const trans = (a, b) => {
		if (a < 0) return 0
		const A = labels[a], Bl = labels[b]
		const iv = (Bl.root - A.root + 12) % 12
		let s = 0
		if (iv === 5) s += p.fifthBonus + ((A.q === 'D7' || A.q === 'M' || A.q === 'D9') && (Bl.q === 'M' || Bl.q === 'm' || Bl.q === 'M7' || Bl.q === 'm7') ? p.resolveBonus : 0)
		else if (iv === 1 && (A.q === 'd7' || A.q === 'd')) s += p.resolveBonus
		else if (iv === 2 || iv === 10) s += p.stepBonus
		if (a === b) s -= 0.3
		return s
	}
	for (let j = 1; j <= P; j++) {
		const cand = []
		for (let i = j - 1; i >= 0; i--) {
			const len = bpos[j] - bpos[i]
			if (j - i > p.maxSlices || (len > p.maxBeats && i < j - 1)) break
			if (!states[i]?.length) continue
			let tot = 0, btot = 0, ftot = 0
			for (let k = 0; k < 12; k++) { segV[k] = V[j * 12 + k] - V[i * 12 + k]; segB[k] = B[j * 12 + k] - B[i * 12 + k]; segF[k] = Fx[j * 12 + k] - Fx[i * 12 + k]; tot += segV[k]; btot += segB[k]; ftot += segF[k] }
			let top
			if (tot < 1e-6) top = [{ l: -2, s: 0 }] // silence: no chord
			else {
				const fi = frameAt((bpos[i] + bpos[j]) / 2), ko = K.frameKey[fi] * NL, kc = K.conf[fi]
				for (let l = 0; l < NL; l++) fits[l] = fitLabel(labels[l], segV, tot, segB, btot, kc * KT[ko + l], p, segF, ftot)
				top = []
				for (let l = 0; l < NL; l++) {
					if (top.length < TOP || fits[l] > top[top.length - 1].s) {
						top.push({ l, s: fits[l] }); top.sort((a, b) => b.s - a.s); if (top.length > TOP) top.pop()
					}
				}
			}
			const cc = i > 0 ? changeCost(i) : 0
			for (const { l, s } of top) {
				const segScore = len * s
				for (const st of states[i]) {
					const sc = st.score + segScore - cc + (l >= 0 ? trans(st.label, l) : 0)
					cand.push({ score: sc, label: l, from: i, prev: st, fit: s })
				}
			}
		}
		// keep the best state per label, then the best BEAM of those
		const best = new Map()
		for (const c of cand) { const b = best.get(c.label); if (!b || c.score > b.score) best.set(c.label, c) }
		states[j] = [...best.values()].sort((a, b) => b.score - a.score).slice(0, BEAM)
	}
	// back-trace
	let st = states[P][0]
	const segs = []
	while (st && st.from >= 0) { segs.push({ i: st.from, j: segs.length ? segs.at(-1).i : P, label: st.label, fit: st.fit }); st = st.prev }
	segs.reverse()
	// fix the ends (back-trace built j from the following segment)
	for (let k = 0; k < segs.length; k++) segs[k].j = k + 1 < segs.length ? segs[k + 1].i : P

	// ── segments → chords (merge repeats, details, spelling, numerals) ──
	const chords = []
	for (const s of segs) {
		const last = chords.at(-1)
		if (last && last.label === s.label) { last.j = s.j; continue }
		chords.push({ ...s })
	}
	for (const c of chords) {
		c.start = pts[c.i]; c.end = pts[c.j]
		if (c.label < 0) { Object.assign(c, { root: null, quality: null, symbol: 'N.C.' }); continue }
		const L = labels[c.label]
		let tot = 0, btot = 0, ftot = 0
		for (let k = 0; k < 12; k++) { segV[k] = V[c.j * 12 + k] - V[c.i * 12 + k]; segB[k] = B[c.j * 12 + k] - B[c.i * 12 + k]; segF[k] = Fx[c.j * 12 + k] - Fx[c.i * 12 + k]; tot += segV[k]; btot += segB[k]; ftot += segF[k] }
		c.root = L.root; c.quality = L.q
		c.pcs = [...segV]
		// bass: the lowest chord tone sounding in the segment (a broken chord's
		// lowest note, not whichever note happens to be struck alone)
		c.bass = L.root
		{
			let low = 999
			const minLen = 0.2 * (beatPos(c.end) > beatPos(c.start) ? 1 : 0)
			for (const n of ns) {
				if (n.on >= c.end - eps) break
				if (n.soff <= c.start + eps || n.pitch >= low) continue
				const a = Math.max(n.on, c.start), b = Math.min(n.soff, c.end)
				if (beatPos(b) - beatPos(a) < minLen && b - a < 0.5 * (c.end - c.start)) continue
				if (!L.tones.includes(n.pitch % 12)) continue
				low = n.pitch
			}
			if (low < 999) c.bass = low % 12
		}
		c.hasFifth = segV[(L.root + 7) % 12] > 0.05 * tot
		const key = keyAtBeat((bpos[c.i] + bpos[c.j]) / 2)
		c.key = { tonic: key.tonic, mode: key.mode }
		c.fit = fitLabel(L, segV, tot, segB, btot, 0, p, segF, ftot)
		// alternatives for this span
		const fi = frameAt((bpos[c.i] + bpos[c.j]) / 2), ko = K.frameKey[fi] * NL, kc = K.conf[fi]
		const alt = labels.map((l, k) => ({ k, s: fitLabel(l, segV, tot, segB, btot, kc * KT[ko + k], p, segF, ftot) })).sort((a, b) => b.s - a.s)
		c.alts = alt.slice(0, 4).filter(a => a.k !== c.label).slice(0, 3).map(a => ({ root: labels[a.k].root, quality: labels[a.k].q, score: a.s }))
		c.confidence = Math.max(0, Math.min(1, (alt[0].s - (alt[1]?.s ?? 0)) * 4 + 0.5 * Math.max(0, c.fit)))
	}
	// diminished sevenths (and augmented triads) are symmetric: pick the root that resolves
	const d7roots = (c, step) => [0, step, 2 * step, 3 * step].slice(0, 12 / step).map(x => (c.root + x) % 12)
	for (let k = 0; k < chords.length; k++) {
		const c = chords[k], nx = chords[k + 1]
		if (c.quality !== 'd7' && c.quality !== 'a') continue
		const opts = c.quality === 'd7' ? d7roots(c, 3) : d7roots(c, 4)
		let pick = null
		if (nx && nx.root != null) pick = opts.find(r => c.quality === 'd7' ? (r + 1) % 12 === nx.root : (r + 5) % 12 === nx.root)
		if (pick == null) pick = opts.find(r => (r - c.key.tonic + 12) % 12 === 11)
		if (pick == null && c.bass != null) pick = opts.find(r => r === c.bass)
		if (pick != null && pick !== c.root) {
			const L2 = labels.findIndex(l => l.root === pick && l.q === c.quality)
			c.root = pick; c.label = L2
			c.bass = c.bass != null && QUALITIES[c.quality].tones.map(t => (pick + t) % 12).includes(c.bass) ? c.bass : pick
		}
	}
	if (ext) {
		// each chord in the external key it overlaps most
		for (const c of chords) {
			let best = null, bo = -1
			for (const k of ext) { const ov = Math.min(k.end, c.end) - Math.max(k.start, c.start); if (ov > bo) { bo = ov; best = k } }
			c.key = { tonic: best.tonic, mode: best.mode, tf: best.tf }
		}
	} else if (p.keyChordWeight > 0) {
		for (const c of chords) { c.lenBeats = beatPos(c.end) - beatPos(c.start); c.frames = [frameAt(beatPos(c.start)), frameAt(Math.max(beatPos(c.start), beatPos(c.end) - 1e-6))] }
		const ks = refineKeys(chords, K.em, frameAt, p)
		chords.forEach((c, i) => { c.key = { tonic: KEYS[ks[i]].tonic, mode: KEYS[ks[i]].mode }; delete c.frames; delete c.lenBeats })
	}
	// key regions, extended to chord boundaries
	const keys = []
	for (const c of chords) {
		const kk = c.key
		if (!kk) continue
		const last = keys.at(-1)
		if (last && last.tonic === kk.tonic && last.mode === kk.mode) last.end = c.end
		else keys.push({ tonic: kk.tonic, mode: kk.mode, ...(kk.tf != null ? { tfExt: kk.tf } : {}), start: c.start, end: c.end })
	}
	const sig = o.keySig ?? null
	// home key: the key with most time, spelled by the key signature or the fewest accidentals
	const timeIn = new Map()
	for (const k of keys) { const id = k.tonic + k.mode; timeIn.set(id, (timeIn.get(id) || 0) + k.end - k.start) }
	const home = keys.length ? keys.find(k => k.tonic + k.mode === [...timeIn].sort((a, b) => b[1] - a[1])[0][0]) : KEYS[K.global]
	const global = { tonic: home.tonic, mode: home.mode, tf: home.tfExt ?? tonicFifth(home.tonic, home.mode, sig) }
	// local keys spelled near the home key (A♭ minor in A♭ major, not G♯ minor)
	const homeRef = global.tf + (global.mode === 'minor' ? -3 : 0) // its relative major
	for (const k of keys) {
		// an external key already spelled (AugmentedNet names E♭ and D♯ apart) keeps its spelling
		if (k.tfExt != null) { k.tf = k.tfExt; delete k.tfExt; continue }
		if (k.tonic === global.tonic && k.mode === global.mode) { k.tf = global.tf; continue }
		const off = k.mode === 'minor' ? 3 : 0 // compare relative majors
		k.tf = spellNear(k.tonic, homeRef + off)
		// keep keys readable: no more than 7 sharps or flats in the signature
		const sigOf = k.tf - off
		if (sigOf > 7) k.tf -= 12
		if (sigOf < -7) k.tf += 12
	}
	// numerals, functions, spelling
	for (let k = 0; k < chords.length; k++) {
		const c = chords[k]
		if (c.root == null) continue
		const reg = keys.find(r => c.start >= r.start - 1e-9 && c.start < r.end) || keys.at(-1)
		c.key = reg
		const nx = chords.slice(k + 1).find(x => x.root != null)
		Object.assign(c, romanOf(c, reg, nx))
		spellChord(c, reg)
	}
	markCadences(chords, accentOf, useMetre)
	for (const c of chords) { delete c.i; delete c.j; delete c.label }
	const ornaments = ns.filter(n => n.orn).map(n => ({ index: n.idx, ...n.orn }))
	return { chords, keys, global, ornaments, metre: useMetre, ms: ((typeof performance !== 'undefined' ? performance : Date).now() - t0) }
}

/** Chord symbol with spelling from the key: C, Dm7/C, G7/B, F♯dim7, B♭maj7 … */
export function spellChord(c, key) {
	const tf = key.tf ?? tonicFifth(key.tonic, key.mode)
	// the diatonic window of the key on the line of fifths, centred
	let centre = key.mode === 'major' ? tf + 1.5 : tf - 1
	if (c.kind === 'applied' && c.target != null) {
		const tgt = spellNear((key.tonic + c.target) % 12, centre)
		centre = tgt + (QUALITIES[c.quality].tones.includes(3) && c.quality !== 'd7' && c.quality !== 'd' && c.quality !== 'h7' ? 1 : 1)
		c.rootF = (c.quality === 'd' || c.quality === 'd7' || c.quality === 'h7') ? tgt + 5 : tgt + 1
	} else if (c.kind === 'aug6') c.rootF = tf - 4 // ♭6
	else if (c.kind === 'neapolitan') c.rootF = tf - 5 // ♭2
	else c.rootF = spellNear(c.root, centre)
	const def = QUALITIES[c.quality]
	c.tones = def.fifths.map(x => fifthName(c.rootF + x))
	const rootName = fifthName(c.rootF)
	let bassName = ''
	if (c.bass != null && c.bass !== c.root) {
		const k = def.tones.indexOf((c.bass - c.root + 12) % 12)
		bassName = k >= 0 ? fifthName(c.rootF + def.fifths[k]) : fifthName(spellNear(c.bass, c.rootF))
	}
	c.symbol = rootName + def.sym + (bassName ? '/' + bassName : '')
	c.name = rootName + def.sym
	return c
}

/** Mark cadences on the chord that ends a phrase: PAC, IAC, HC, DC, PC. */
function markCadences(chords, accentOf, useMetre) {
	const isTonic = c => c.root != null && (c.root - c.key.tonic + 12) % 12 === 0 && (c.quality === 'M' || c.quality === 'm' || c.quality === 'M7' || c.quality === 'add9' || c.quality === 'madd9')
	const isDom = c => c.root != null && (c.root - c.key.tonic + 12) % 12 === 7 && (c.quality === 'M' || c.quality === 'D7' || c.quality === 'D9' || c.quality === '7sus4')
	const root = c => c.bass == null || c.bass === c.root
	const strong = c => !useMetre || accentOf(c.start) >= 0.6
	const len = c => c.end - c.start
	for (let k = 1; k < chords.length; k++) {
		const a = chords[k - 1], b = chords[k]
		if (a.root == null || b.root == null || a.key !== b.key) continue
		const rel = (b.root - b.key.tonic + 12) % 12
		if (isDom(a) && isTonic(b) && strong(b)) b.cadence = root(a) && root(b) ? 'PAC' : 'IAC'
		else if (isDom(a) && rel === 9 && b.quality[0] === 'm' && b.key.mode === 'major' && strong(b)) b.cadence = 'DC'
		else if (isDom(a) && rel === 8 && b.key.mode === 'minor' && b.quality === 'M' && strong(b)) b.cadence = 'DC'
		else if (isTonic(b) && (a.root - a.key.tonic + 12) % 12 === 5 && root(b) && strong(b) && len(b) >= len(a)) b.cadence = 'PC'
		// half cadence: a root-position V held at least as long as what came before, then a new phrase (rest or tonic)
		const nx = chords[k + 1]
		if (isDom(b) && root(b) && strong(b) && (!nx || nx.root == null || isTonic(nx)) && len(b) >= 1.5 * len(a) && !b.cadence && a.root != null && !isDom(a)) b.half = true
	}
	for (const c of chords) if (c.half) { c.cadence = c.cadence || 'HC'; delete c.half }
}

// ── Naming what sounds now (no context) ────────────────────────────────────

/**
 * Name a set of sounding pitches, like a DAW's chord display or tonal.js's
 * Chord.detect: every root and quality of the vocabulary scored on the set,
 * bass preferred as root. @returns [{ root, quality, bass, symbol, score }] best first.
 */
export function nameChord(pitches, { vocabulary = 'pop', key = null, params } = {}) {
	const ps = [...new Set(pitches)].sort((a, b) => a - b)
	if (!ps.length) return []
	const p = { ...DEFAULTS, ...params }
	const V = new Float64Array(12), Bv = new Float64Array(12)
	for (const x of ps) V[x % 12] += 1
	Bv[ps[0] % 12] = 1
	const tot = [...V].reduce((a, b) => a + b, 0)
	const pcs = new Set(ps.map(x => x % 12))
	const out = []
	for (const L of labelsOf(vocabulary)) {
		if (!pcs.has(L.root) && pcs.size > 1) continue
		const needed = L.tones.filter((t, k) => L.w[k] >= 0.8)
		if (pcs.size >= 2 && needed.some(t => !pcs.has(t))) continue
		if (pcs.size === 1 && L.q !== 'M') continue
		const s = fitLabel(L, V, tot, Bv, 1, key ? keyFit(L, key, p) : 0, p)
		const extra = [...pcs].filter(x => !L.tones.includes(x)).length
		out.push({ root: L.root, quality: L.q, bass: ps[0] % 12, score: s - 0.4 * extra, extra })
	}
	out.sort((a, b) => b.score - a.score)
	const k = key ? { ...key, tf: tonicFifth(key.tonic, key.mode) } : { tonic: 0, mode: 'major', tf: 0 }
	for (const c of out) { c.kind = 'diatonic'; spellChord(c, k); if (c.extra) c.symbol += ' (+' + c.extra + ')' }
	if (pcs.size === 1) return [{ root: ps[0] % 12, quality: null, bass: ps[0] % 12, symbol: fifthName(spellNear(ps[0] % 12, k.tf + 1.5)), score: 1, single: true }]
	return out.filter(c => !c.extra).concat(out.filter(c => c.extra)).slice(0, 5)
}

// ── Helpers for players ────────────────────────────────────────────────────

/** Index of the chord sounding at time t (binary search), or -1. */
export function chordIndexAt(chords, t) {
	let lo = 0, hi = chords.length - 1, ans = -1
	while (lo <= hi) { const m = (lo + hi) >> 1; if (chords[m].start <= t + 1e-9) { ans = m; lo = m + 1 } else hi = m - 1 }
	return ans >= 0 && t < chords[ans].end + 1e-9 ? ans : -1
}

/** Role of a pitch in a chord: 'root' | 'third' | 'fifth' | 'seventh' | 'ext' | 'nct' (non-chord tone). */
export function toneRole(chord, pitch) {
	if (!chord || chord.root == null) return 'nct'
	const iv = (pitch - chord.root + 120) % 12
	const def = QUALITIES[chord.quality]
	const k = def.tones.indexOf(iv)
	if (k < 0) return 'nct'
	if (k === 0) return 'root'
	if (def.tones[k] === 2 || (k === 3 && !def.seventh)) return 'ext'
	return ['root', 'third', 'fifth', 'seventh', 'ext'][k]
}

/** The commonest chord-to-chord moves, as Roman numerals: [{ from, to, count }]. */
export function progressions(chords, n = 8) {
	const m = new Map()
	const rnOf = c => c.rn?.replace(/(6|64|7|65|43|42)$/, '').replace(/(6|64|7|65|43|42)(?=\/)/, '')
	for (let k = 1; k < chords.length; k++) {
		const a = chords[k - 1], b = chords[k]
		if (a.root == null || b.root == null) continue
		const key = rnOf(a) + ' → ' + rnOf(b)
		m.set(key, (m.get(key) || 0) + 1)
	}
	return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, count]) => ({ move: k, count }))
}
