// node --test harmony/test/harmony.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { analyze, nameChord, romanOf, spellChord, keyScores, KEYS, keyName, beatGrid, keySignatureOf, chordIndexAt, toneRole, inversionOf, fifthName, tonicFifth } from '../harmony.js'

const root = new URL('../../', import.meta.url)
const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')

// a block-chord progression: [[pitches], beats], one beat = 0.5 s, 4/4
function blocks(list, { beat = 0.5 } = {}) {
	const notes = [], beats = []
	let t = 0
	for (const [ps, len] of list) {
		for (const p of ps) notes.push({ pitch: p, on: t, off: t + len * beat - 0.02 })
		t += len * beat
	}
	for (let i = 0; i * beat <= t + beat; i++) beats.push({ time: i * beat, strength: i % 4 === 0 ? 1 : i % 2 === 0 ? 0.6 : 0.4 })
	return { notes, beats }
}
const C = [48, 60, 64, 67], F = [53, 60, 65, 69], G = [55, 59, 62, 67], G7 = [55, 59, 62, 65], Am = [57, 60, 64, 69], Dm7 = [50, 60, 65, 69]

test('naming what sounds: triads, sevenths, inversions, spelling', () => {
	assert.equal(nameChord([60, 64, 67])[0].symbol, 'C')
	assert.equal(nameChord([57, 60, 64])[0].symbol, 'Am')
	assert.equal(nameChord([64, 67, 72])[0].symbol, 'C/E')
	assert.equal(nameChord([55, 59, 62, 65])[0].symbol, 'G7')
	assert.equal(nameChord([59, 62, 65, 67])[0].symbol, 'G7/B')
	assert.equal(nameChord([62, 65, 69, 72])[0].symbol, 'Dm7')
	assert.equal(nameChord([60, 64, 67, 71])[0].symbol, 'Cmaj7')
	assert.equal(nameChord([59, 62, 65, 68], { vocabulary: 'classical' })[0].quality, 'd7')
	assert.equal(nameChord([60, 65, 67], { vocabulary: 'pop' })[0].symbol, 'Csus4')
	// spelled from the key: E♭ major, not D♯
	assert.equal(nameChord([63, 67, 70], { key: { tonic: 3, mode: 'major' } })[0].symbol, 'E♭')
	assert.equal(nameChord([54, 58, 61], { key: { tonic: 11, mode: 'major' } })[0].symbol, 'F♯')
})

test('Roman numerals: diatonic, inversions, applied, Neapolitan, mixture', () => {
	const Cmaj = { tonic: 0, mode: 'major' }, cmin = { tonic: 0, mode: 'minor' }
	const rn = (root, quality, bass, key = Cmaj, next = null) => romanOf({ root, quality, bass }, key, next).rn
	assert.equal(rn(0, 'M', 0), 'I')
	assert.equal(rn(0, 'M', 4), 'I6')
	assert.equal(rn(0, 'M', 7), 'I64')
	assert.equal(rn(7, 'D7', 7), 'V7')
	assert.equal(rn(7, 'D7', 11), 'V65')
	assert.equal(rn(7, 'D7', 2), 'V43')
	assert.equal(rn(7, 'D7', 5), 'V42')
	assert.equal(rn(2, 'm7', 2), 'ii7')
	assert.equal(rn(11, 'd', 11), 'vii°')
	assert.equal(rn(11, 'h7', 11), 'viiø7')
	assert.equal(rn(2, 'D7', 2), 'V7/V')
	assert.equal(rn(9, 'D7', 1), 'V65/ii')
	assert.equal(rn(6, 'd7', 6), 'vii°7/V')
	assert.equal(rn(1, 'M', 5, cmin), 'N6')
	assert.equal(rn(8, 'M', 8), '♭VI')
	assert.equal(rn(5, 'm', 5), 'iv')
	assert.equal(rn(7, 'D7', 7, cmin), 'V7')
	assert.equal(rn(3, 'M', 3, cmin), 'III')
	assert.equal(romanOf({ root: 7, quality: 'D7', bass: 7 }, Cmaj).func, 'D')
	assert.equal(romanOf({ root: 5, quality: 'M', bass: 5 }, Cmaj).func, 'PD')
	assert.equal(inversionOf('D7', 7, 5), 3)
})

test('spelling follows the function: an applied dominant spells its leading tone', () => {
	const key = { tonic: 0, mode: 'major', tf: 0 }
	const c = { root: 2, quality: 'D7', bass: 2, ...romanOf({ root: 2, quality: 'D7', bass: 2 }, key) }
	spellChord(c, key)
	assert.equal(c.symbol, 'D7'); assert.deepEqual(c.tones, ['D', 'F♯', 'A', 'C'])
	const d = { root: 6, quality: 'd7', bass: 6, ...romanOf({ root: 6, quality: 'd7', bass: 6 }, key) }
	spellChord(d, key)
	assert.equal(d.symbol, 'F♯dim7'); assert.deepEqual(d.tones, ['F♯', 'A', 'C', 'E♭'])
	assert.equal(fifthName(tonicFifth(3, 'major')), 'E♭')
	assert.equal(fifthName(tonicFifth(1, 'minor')), 'C♯')
	assert.equal(fifthName(tonicFifth(6, 'major', 6)), 'F♯')
	assert.equal(fifthName(tonicFifth(6, 'major', -6)), 'G♭')
})

test('key profiles: a C major scale is C major, an A harmonic minor scale is A minor', () => {
	const v = new Array(12).fill(0)
	for (const p of [0, 2, 4, 5, 7, 9, 11]) v[p] = 1
	v[0] = 2; v[7] = 1.5
	for (const prof of ['krumhansl', 'temperley', 'aarden', 'bellman', 'sapp']) {
		const s = keyScores(v, prof)
		assert.equal(keyName(KEYS[s.indexOf(Math.max(...s))]), 'C major', prof)
	}
	const m = new Array(12).fill(0)
	for (const p of [9, 11, 0, 2, 4, 5, 8]) m[p] = 1
	m[9] = 2; m[4] = 1.5
	const s = keyScores(m, 'aarden')
	assert.equal(keyName(KEYS[s.indexOf(Math.max(...s))]), 'A minor')
})

test('a progression: segments, numerals, a cadence', () => {
	const { notes, beats } = blocks([[C, 4], [Am, 4], [Dm7, 4], [G7, 4], [C, 8]])
	const r = analyze(notes, { beats })
	const named = r.chords.filter(c => c.root != null)
	assert.deepEqual(named.map(c => c.symbol), ['C', 'Am', 'Dm7', 'G7', 'C'])
	assert.deepEqual(named.map(c => c.rn), ['I', 'vi', 'ii7', 'V7', 'I'])
	assert.deepEqual(named.map(c => c.func), ['T', 'T', 'PD', 'D', 'T'])
	assert.equal(named.at(-1).cadence, 'PAC')
	assert.equal(keyName(r.global), 'C major')
	assert.equal(r.keys.length, 1)
})

test('an arpeggiated chord is one chord, a passing note does not change it', () => {
	// C major broken over a bar in eighths, with a passing D between C and E in the top voice
	const notes = [], beats = []
	const pat = [48, 55, 60, 64, 67, 64, 60, 55]
	pat.forEach((p, i) => notes.push({ pitch: p, on: i * 0.25, off: i * 0.25 + 0.24 }))
	// then G7 broken, and C again
	;[43, 50, 55, 59, 62, 65, 62, 59].forEach((p, i) => notes.push({ pitch: p, on: 2 + i * 0.25, off: 2 + i * 0.25 + 0.24 }))
	;[48, 55, 60, 62, 64, 67, 64, 60].forEach((p, i) => notes.push({ pitch: p, on: 4 + i * 0.25, off: 4 + i * 0.25 + 0.24 }))
	for (let i = 0; i <= 13; i++) beats.push({ time: i * 0.5, strength: i % 4 === 0 ? 1 : 0.4 })
	const r = analyze(notes, { beats })
	assert.deepEqual(r.chords.filter(c => c.root != null).map(c => c.symbol), ['C', 'G7', 'C'])
	const c = r.chords[chordIndexAt(r.chords, 4.9)]
	assert.equal(toneRole(c, 62), 'nct')
	assert.equal(toneRole(c, 64), 'third')
})

test('modulation: C major to G major through its dominant', () => {
	const D7 = [50, 54, 57, 60], Gm = [43, 55, 59, 62], Em = [52, 55, 59, 64], Am7 = [45, 55, 60, 64]
	const { notes, beats } = blocks([[C, 4], [F, 4], [G7, 4], [C, 4], [Am, 4], [D7, 4], [Gm, 4], [Em, 4], [Am7, 4], [D7, 4], [Gm, 4], [Gm, 4]])
	const r = analyze(notes, { beats })
	assert.equal(keyName(r.keys[0]), 'C major')
	assert.equal(keyName(r.keys.at(-1)), 'G major')
	const last = r.chords.filter(c => c.root != null).at(-1)
	assert.equal(last.rn, 'I'); assert.equal(last.cadence, 'PAC')
})

test('Bach, Prelude in C (BWV 846): the textbook opening', () => {
	const m = new Midi(readFileSync(new URL('midis/bach_846.mid', root)))
	const notes = [], pedal = []
	for (const t of m.tracks) {
		for (const n of t.notes) notes.push({ pitch: n.midi, on: n.time, off: n.time + n.duration, channel: t.channel })
		for (const e of t.controlChanges[64] || []) pedal.push({ time: e.time, value: e.value * 127, channel: t.channel })
	}
	const g = beatGrid(m)
	const r = analyze(notes, { beats: g.beats, aligned: g.aligned, pedal, keySig: keySignatureOf(m) })
	const bar = b => g.beats.find(x => x.bar === b && x.beat === 1).time + 0.1
	const at = b => r.chords[chordIndexAt(r.chords, bar(b))]
	// bars 1-11: C, Dm7/C, G7/B, C, Am/C, D7/C, G/B, Cmaj7/B, Am7, D7, G
	assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(b => at(b).symbol), ['C', 'Dm7/C', 'G7/B', 'C', 'Am/C', 'D7/C', 'G/B', 'Cmaj7/B', 'Am7', 'D7', 'G'])
	assert.equal(at(6).rn, 'V42/V')
	assert.equal(at(12).quality, 'd7') // C♯dim7/G, vii°43/ii
	assert.equal(keyName(r.global), 'C major')
})

test('suspensions and appoggiaturas: marked, excused, not mistaken for the chord', () => {
	// G7 → C with a 4–3 suspension: F held over into the C chord, resolving to E on beat 3
	const beats = [...Array(17)].map((_, i) => ({ time: i * 0.5, strength: i % 4 === 0 ? 1 : i % 2 === 0 ? 0.6 : 0.4 }))
	const notes = [
		{ pitch: 43, on: 0, off: 1.98 }, { pitch: 59, on: 0, off: 1.98 }, { pitch: 62, on: 0, off: 1.98 }, { pitch: 65, on: 0, off: 3 }, // G7, the F held
		{ pitch: 48, on: 2, off: 3.98 }, { pitch: 55, on: 2, off: 3.98 }, { pitch: 60, on: 2, off: 3.98 }, { pitch: 64, on: 3, off: 3.98 }, // C, E arrives late
		// then an appoggiatura: D struck over a C chord on the downbeat, resolving to C
		{ pitch: 48, on: 4, off: 7.98 }, { pitch: 55, on: 4, off: 7.98 }, { pitch: 64, on: 4, off: 7.98 }, { pitch: 74, on: 4, off: 4.98 }, { pitch: 72, on: 5, off: 7.98 },
	]
	const r = analyze(notes, { beats })
	const sus = r.ornaments.find(o => o.index === 3), app = r.ornaments.find(o => o.index === 11)
	assert.equal(sus?.type, 'suspension'); assert.equal(sus.figure, '4–3'); assert.equal(sus.from, 2); assert.equal(sus.to, 3)
	assert.equal(app?.type, 'appoggiatura')
	const named = r.chords.filter(c => c.root != null).map(c => c.symbol)
	assert.deepEqual(named, ['G7', 'C'])
})

test('a chord seventh is not marked as a suspension', () => {
	const beats = [...Array(9)].map((_, i) => ({ time: i * 0.5, strength: i % 4 === 0 ? 1 : 0.4 }))
	// C held as the seventh of D7 (prepared), resolving to B over G
	const notes = [
		{ pitch: 48, on: 0, off: 0.98 }, { pitch: 64, on: 0, off: 0.98 }, { pitch: 72, on: 0, off: 2 }, { pitch: 67, on: 0, off: 0.98 },
		{ pitch: 50, on: 1, off: 1.98 }, { pitch: 66, on: 1, off: 1.98 }, { pitch: 69, on: 1, off: 1.98 },
		{ pitch: 43, on: 2, off: 3.98 }, { pitch: 71, on: 2, off: 3.98 }, { pitch: 62, on: 2, off: 3.98 }, { pitch: 67, on: 2, off: 3.98 },
	]
	const r = analyze(notes, { beats })
	assert.equal(r.ornaments.find(o => o.index === 2), undefined)
	assert.deepEqual(r.chords.filter(c => c.root != null).map(c => c.symbol), ['C', 'D7', 'G'])
})

test('keys from elsewhere (o.keys) replace the key passes and keep their spelling', () => {
	const { notes, beats } = blocks([[C, 4], [F, 4], [G7, 4], [C, 4]])
	// the same chords read in G major (a wrong key on purpose), spelled as G
	const r = analyze(notes, { beats, keys: [{ start: 0, end: 8, tonic: 7, mode: 'major', tf: 1 }] })
	assert.equal(keyName(r.global), 'G major')
	assert.deepEqual(r.chords.filter(c => c.root != null).map(c => c.rn), ['IV', '♭VII', 'V7/IV', 'IV'])
	// a D♭ major key named as such stays D♭, not C♯
	const r2 = analyze(notes, { beats, keys: [{ start: 0, end: 8, tonic: 1, mode: 'major', tf: -5 }] })
	assert.equal(keyName(r2.global), 'D♭ major')
})
