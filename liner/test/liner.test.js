// node --test liner/test/liner.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseLiner, parseCard, parseAnchor, barClock, clockOfMidi, buildTimeline, toVTT, toChapters, renderInline, plainText, momentAt, sectionAt, intertitleAt, createLinerLibrary, INTERTITLE, parsePlay, scoreClock, withTitle, titleScreen, parseScreen } from '../liner.js'

const root = new URL('../../', import.meta.url)
const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')
const read = p => readFileSync(new URL(p, root), 'utf8')

test('anchors', () => {
	assert.deepEqual(parseAnchor('m22'), { bar: 22, beat: 1 })
	assert.deepEqual(parseAnchor('m22.3'), { bar: 22, beat: 3 })
	assert.deepEqual(parseAnchor('m22.2.5'), { bar: 22, beat: 2.5 })
	assert.deepEqual(parseAnchor('@1:23.5'), { seconds: 83.5 })
	assert.equal(parseAnchor('bar 3'), null)
})

test('parse: front matter, parts, moments, sources, ranges', () => {
	const l = parseLiner(`---
title: "A, B"
bars: 8   # a comment
cards: [x, y]
---
Intro text.

# Sections
## m1 Start
Opening.
## m5 End

# Moments
## m1 · analysis
Caption one.

More.

source: Someone (2000)
## m3.3–m4 listen
Caption two.
## @7 oddkind
Three.
`)
	assert.equal(l.meta.title, 'A, B')
	assert.equal(l.meta.bars, '8')
	assert.deepEqual(l.meta.cards, ['x', 'y'])
	assert.deepEqual(l.overview, ['Intro text.'])
	assert.deepEqual(l.sections.map(s => s.title), ['Start', 'End'])
	assert.equal(l.sections[0].text, 'Opening.')
	assert.equal(l.moments.length, 3)
	assert.deepEqual(l.moments[0], { at: { bar: 1, beat: 1 }, until: undefined, kind: 'analysis', caption: 'Caption one.', detail: ['More.'], source: 'Someone (2000)' })
	assert.deepEqual(l.moments[1].until, { bar: 4, beat: 1 })
	assert.equal(l.moments[1].kind, 'listen')
	assert.equal(l.moments[2].kind, 'trivia')
	assert.match(l.warnings.join(), /unknown kind "oddkind"/)
})

test('intertitles: the # Intertitles part and screen: lines on moments', () => {
	const l = parseLiner(`# Moments
## m3 · trivia
A caption.

screen: Paris, 1853 | A short line.

More.
## m1 · analysis
First.

# Intertitles
## m1 Opening
Just text.
## m9
No kicker here.
`)
	assert.deepEqual(l.moments[0].detail, ['More.'])
	assert.deepEqual(l.intertitles, [
		{ at: { bar: 1, beat: 1 }, until: undefined, kicker: 'Opening', text: 'Just text.' },
		{ at: { bar: 9, beat: 1 }, until: undefined, kicker: '', text: 'No kicker here.' },
		{ at: { bar: 3, beat: 1 }, until: undefined, kicker: 'Paris, 1853', text: 'A short line.', moment: 0 },
	])
	// 2 s bars: m1 0 s, m3 4 s (too close: warned), m9 16 s; the screen line points at its moment once sorted
	const clock = { bars: 10, seconds: a => (a.bar - 1) * 2 }
	const tl = buildTimeline(l, clock, 20)
	assert.deepEqual(tl.intertitles.map(x => x.start), [0, 4, 16])
	assert.equal(tl.moments[tl.intertitles[1].moment].caption, 'A caption.')
	assert.match(tl.warnings.join(), /intertitles at 0:00 and 0:04 are 0\.0 s apart/)
	assert.ok(tl.intertitles[0].end - tl.intertitles[0].start >= INTERTITLE.min)
	assert.match(toVTT(tl, { from: 'intertitles' }), /00:00:04\.000 --> 00:00:\d\d\.\d{3}\nPARIS, 1853\nA short line\./)
})

test('play: repeats and spread bars map score bars to file bars', () => {
	assert.deepEqual(parsePlay('1-4, 1-4, 5-6, 7*2, 8'), [{ from: 1, to: 4, span: 1 }, { from: 1, to: 4, span: 1 }, { from: 5, to: 6, span: 1 }, { from: 7, to: 7, span: 2 }, { from: 8, to: 8, span: 1 }])
	assert.throws(() => parsePlay('1-4, x'))
	// file bars of 2 s
	const c = scoreClock({ bars: 13, seconds: a => (a.bar - 1) * 2 + (a.beat - 1) * 0.5 }, parsePlay('1-4, 1-4, 5-6, 7*2, 8'))
	assert.equal(c.bars, 8); assert.equal(c.fileBars, 13)
	assert.equal(c.seconds({ bar: 3, beat: 1 }), 4)
	assert.equal(c.seconds({ bar: 3, beat: 1, pass: 2 }), 12)
	assert.equal(c.seconds({ bar: 5, beat: 2 }), 16.5)
	assert.equal(c.seconds({ bar: 7, beat: 6 }), 22.5)    // beat 6 of a bar spread over two: file bar 12, beat 2
	assert.equal(c.seconds({ bar: 8, beat: 1 }), 24)
	assert.ok(Number.isNaN(c.seconds({ bar: 5, beat: 1, pass: 2 })))
	assert.deepEqual(parseAnchor("m3''"), { bar: 3, beat: 1, pass: 3 })
	const l = parseLiner("---\nplay: 1-4, 1-4, 5-6, 7*2, 8\nbars: 8\n---\n# Moments\n## m3' · trivia\nAgain.\n## m5' · trivia\nNever.")
	const tl = buildTimeline(l, { bars: 13, seconds: a => (a.bar - 1) * 2 + (a.beat - 1) * 0.5 }, 30)
	assert.equal(tl.moments.length, 1)
	assert.equal(tl.moments[0].start, 12)
	assert.match(tl.warnings.join(), /m5' is not played/)
})

test('the title as the first intertitle', () => {
	assert.deepEqual(parseScreen('A | B | C'), { kicker: 'A', text: 'B', sub: 'C' })
	assert.deepEqual(titleScreen({ meta: { composer: 'X', title: 'Y' } }), { kicker: 'X', text: 'Y' })
	assert.deepEqual(titleScreen(null, { text: 'Z' }), { text: 'Z' })
	const tl = { sections: [], moments: [], warnings: [], intertitles: [{ start: 3, end: 9, text: 'a' }, { start: 30, end: 36, text: 'b' }] }
	const t = withTitle(tl, { kicker: 'K', text: 'Title' })
	assert.equal(t.intertitles.length, 3)
	assert.ok(t.intertitles[0].title && t.intertitles[0].start === 0 && t.intertitles[0].end >= 7)
	assert.equal(t.intertitles[1].start, t.intertitles[0].end + INTERTITLE.gap)    // pushed back to leave the gap
	assert.equal(t.intertitles[1].end - t.intertitles[1].start, 6)
	assert.equal(t.intertitles[2].start, 30)
	assert.equal(tl.intertitles[0].start, 3)    // (a copy)
	assert.equal(withTitle(null, { text: 'T' }).intertitles.length, 1)
})

test('inline markdown', () => {
	assert.equal(renderInline('a **b** *c* `d` [e](https://x.org) [[pedal-point]] <x>', (id, t) => `<u data-c="${id}">${t}</u>`),
		'a <b>b</b> <i>c</i> <code>d</code> <a href="https://x.org" target="_blank" rel="noopener">e</a> <u data-c="pedal-point">pedal point</u> &lt;x&gt;')
	assert.equal(plainText('a **b** [[x-y|Z]] [[w-v]] [l](u)'), 'a b Z w v l')
})

test('bar clock: time signatures, tempo, pickup', () => {
	// 480 ppq, 120 bpm (0.5 s a beat): 4/4 for 2 bars, then 3/4
	const header = { ppq: 480, timeSignatures: [{ ticks: 0, timeSignature: [4, 4] }, { ticks: 3840, timeSignature: [3, 4] }], ticksToSeconds: t => t / 480 * 0.5 }
	const c = barClock(header, { lastTick: 3840 + 1440 * 2 + 10 })
	assert.equal(c.seconds({ bar: 1, beat: 1 }), 0)
	assert.equal(c.seconds({ bar: 2, beat: 3 }), 3)
	assert.equal(c.seconds({ bar: 3, beat: 1 }), 4)
	assert.equal(c.seconds({ bar: 4, beat: 2 }), 6)
	assert.equal(c.bars, 5)
	assert.equal(c.barAt(5.9), 4)
	assert.equal(c.barAt(5.4), 3)
	const p = barClock({ ppq: 480, timeSignatures: [], ticksToSeconds: header.ticksToSeconds }, { pickup: 1 })
	assert.equal(p.seconds({ bar: 1, beat: 1 }), 0.5)
	assert.equal(p.seconds({ bar: 0, beat: 4 }), 0)
})

const bach = () => {
	const midi = new Midi(readFileSync(new URL('Prelude1.mid', root)))
	const liner = parseLiner(read('liner/pieces/bach-wtc1-prelude-c.md'))
	const duration = Math.max(...midi.tracks.flatMap(t => t.notes.map(n => n.time + n.duration)))
	return { midi, liner, duration, tl: buildTimeline(liner, clockOfMidi(midi), duration) }
}

test('Bach prelude: notes fit Prelude1.mid', () => {
	const { liner, tl, duration, midi } = bach()
	assert.deepEqual(liner.warnings, [])
	assert.deepEqual(tl.warnings, [])
	assert.equal(clockOfMidi(midi).bars, 35)
	// 72 bpm in 4/4: a bar is 3.33 s until the ritardando in bar 34
	assert.ok(Math.abs(tl.sections.find(s => s.title === 'Dominant pedal').start - 23 * 10 / 3) < 1e-3)
	assert.equal(tl.sections.length, 6)
	assert.ok(tl.moments.length >= 15)
	for (const [i, m] of tl.moments.entries()) {
		assert.ok(m.end > m.start + 1.9, `moment ${i} too short`)
		assert.ok(m.end <= (tl.moments[i + 1]?.start ?? Infinity), `moment ${i} overlaps the next`)
		assert.ok(plainText(m.caption).length <= 110, `caption ${i} is long for a subtitle: ${m.caption}`)
	}
	assert.equal(sectionAt(tl, 80).title, 'Dominant pedal')
	assert.equal(momentAt(tl, 73.5).kind, 'history')    // bar 22: the Schwencke bar
	// intertitles: few, short, with a clear screen between them
	assert.ok(tl.intertitles.length >= 4 && tl.intertitles.length <= 8)
	const shown = tl.intertitles.reduce((a, x) => a + x.end - x.start, 0)
	assert.ok(shown < duration * 0.5, `intertitles on screen ${shown.toFixed(0)} s of ${duration.toFixed(0)}`)
	for (const x of tl.intertitles) assert.ok(plainText(x.text).split(/\s+/).length <= INTERTITLE.maxWords && x.kicker.length <= 24, x.text)
	assert.equal(intertitleAt(tl, 72).kicker, 'Bar 22')
	assert.equal(tl.moments[intertitleAt(tl, 72).moment].at.bar, 22)
	assert.ok(duration > 110 && duration < 125)
})

test('Moonlight Sonata finale: notes fit mond_3.mid (repeat and cadenza mapped)', () => {
	const midi = new Midi(readFileSync(new URL('midis/mond_3.mid', root)))
	const liner = parseLiner(read('liner/pieces/beethoven-op27-2-iii.md'))
	const duration = Math.max(...midi.tracks.flatMap(t => t.notes.map(n => n.time + n.duration)))
	const clock = clockOfMidi(midi), tl = buildTimeline(liner, clock, duration)
	assert.deepEqual(tl.warnings, [])
	assert.equal(clock.bars, 267)
	const fileBar = b => midi.header.ticksToSeconds((b - 1) * 1920)    // (4/4 up to file bar 253)
	const sec = title => tl.sections.find(s => s.title.startsWith(title)).start
	assert.ok(Math.abs(sec('Exposition again') - fileBar(65)) < 1e-6)
	assert.ok(Math.abs(sec('Development') - fileBar(129)) < 1e-6)
	assert.ok(Math.abs(sec('Recapitulation') - fileBar(166)) < 1e-6)
	assert.ok(Math.abs(sec('Coda') - fileBar(221)) < 1e-6)
	// the Adagio octaves (score bar 188) are the file's bar 255, after the 2/4 bar 254
	const adagio = tl.moments.find(m => m.at.bar === 188).start
	const g1 = midi.tracks.flatMap(t => t.notes).findLast(n => n.midi === 31 && n.duration > 2)    // the held low G
	assert.ok(Math.abs(adagio - g1.time) < 0.05, `${adagio} vs ${g1.time}`)
	const t = withTitle(tl, titleScreen(liner))
	assert.equal(t.intertitles[0].text, 'Moonlight Sonata')
	assert.ok(t.intertitles.every(x => !x.moved))
})

test('every piece: captions fit a subtitle, intertitles are short and spaced', () => {
	for (const f of readdirSync(new URL('liner/pieces/', root))) {
		const l = parseLiner(read('liner/pieces/' + f))
		assert.deepEqual(l.warnings, [], f)
		for (const m of l.moments) assert.ok(plainText(m.caption).length <= 110, `${f}: caption is long for a subtitle: ${m.caption}`)
		for (const x of l.intertitles) {
			assert.ok(plainText(x.text).split(/\s+/).length <= INTERTITLE.maxWords && x.kicker.length <= 24, `${f}: ${x.text}`)
			assert.ok(!/[♯♭]/.test(x.text + x.kicker), `${f}: the intertitle fonts have no ♯ / ♭: ${x.text}`)
		}
	}
})

test('every [[card]] and front-matter card exists and parses', () => {
	const cards = new Set(readdirSync(new URL('liner/cards/', root)).map(f => f.replace(/\.md$/, '')))
	for (const f of readdirSync(new URL('liner/pieces/', root))) {
		const text = read('liner/pieces/' + f), l = parseLiner(text)
		for (const id of [...(l.meta.cards || []), ...[...text.matchAll(/\[\[([\w-]+)/g)].map(m => m[1])]) assert.ok(cards.has(id), `${f}: no card ${id}`)
	}
	for (const id of cards) { const c = parseCard(read(`liner/cards/${id}.md`), id); assert.ok(c.title && c.body.length, id) }
	const index = JSON.parse(read('liner/index.json')).files
	for (const [file, id] of Object.entries(index)) {
		readFileSync(new URL(file, root))
		readFileSync(new URL(`liner/pieces/${id}.md`, root))
	}
})

test('VTT and YouTube chapters', () => {
	const { tl } = bach()
	const vtt = toVTT(tl, { offset: 2 })
	assert.match(vtt, /^WEBVTT\n\n1\n00:00:02\.000 --> 00:00:0\d\.\d{3}\n\[history\] Bach finished/)
	assert.equal(vtt.split('-->').length - 1, tl.moments.length)
	const ch = toChapters(tl, { offset: 2 }).split('\n')
	assert.equal(ch[0], '0:00 Home: C major')
	assert.equal(ch.length, 6)
	assert.equal(ch[4], '1:18 Dominant pedal')    // 2 s + 23 bars × 3.33 s
	// a clip of the song (song time 70–100 s): only its cues, cut to it
	const clip = toVTT(tl, { offset: 1 - 70, start: 70, end: 100 })
	assert.match(clip, /^WEBVTT\n\n1\n00:00:01\.000 --> /)
	assert.ok(clip.split('-->').length - 1 < tl.moments.length)
	// sections under 10 s merge away; fewer than three: no chapters
	assert.equal(toChapters({ sections: [{ start: 0, end: 5, title: 'a' }, { start: 5, end: 30, title: 'b' }] }), '')
})

test('library: index lookup by path or file name, cards attached', async () => {
	const lib = createLinerLibrary('liner/', async u => read(u))
	assert.equal((await lib.forFile('Prelude1.mid')).meta.composer, 'Johann Sebastian Bach')
	assert.equal(lib.idOf('./somewhere/Prelude1.mid'), 'bach-wtc1-prelude-c')
	assert.equal(await lib.forFile('nothing.mid'), null)
	const l = await lib.forFile('Prelude1.mid')
	assert.deepEqual(Object.keys(l.cards).sort(), ['ave-maria', 'bach', 'diminished-seventh', 'pedal-point', 'well-tempered-clavier'])
})
