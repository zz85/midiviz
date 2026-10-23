// node --test liner/test/liner.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { layoutClip, parseLiner, parseCard, parseAnchor, barClock, clockOfMidi, buildTimeline, toVTT, toChapters, renderInline, plainText, momentAt, sectionAt, intertitleAt, createLinerLibrary, INTERTITLE, LAYOUT, layoutScreen, parsePlay, scoreClock, withTitle, titleScreen, parseScreen, titleSecs, TITLE } from '../liner.js'

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

test('intertitles: pinned (screen:, ## mN) and floating (aside:, ## ~), kinds and voices', () => {
	const l = parseLiner(`# Moments
## m3 · trivia
A caption.

screen: Paris, 1853 | A short line.

More.
## m5-m7 · analysis
Heard.

screen: Two bars | Shown when they are over.
## m1 · history
First.

aside: 1801 | A fact for any time.

# Intertitles
## m1 Opening
Just text.
## m9 listen · Bass
No kicker? No: a kind and a kicker.
## ~ Floating
Any time.
## ~m10-m12 analysis · In a window
Somewhere in bars 10 to 12.
`)
	assert.deepEqual(l.moments[0].detail, ['More.'])
	assert.deepEqual(l.intertitles.map(x => [x.kicker, x.kind, x.voice, !!x.float]), [
		['Opening', 'history', 'story', false], ['Bass', 'listen', 'analysis', false], ['Floating', 'history', 'story', true],
		['In a window', 'analysis', 'analysis', true], ['Paris, 1853', 'trivia', 'story', false], ['Two bars', 'analysis', 'analysis', false], ['1801', 'history', 'story', true],
	])
	assert.deepEqual(l.intertitles[3].from, { bar: 10, beat: 1 })
	// 10 s bars over 200 s: a range shows when it ends (m7 = 60 s), not when it starts
	const clock = { bars: 20, seconds: a => (a.bar - 1) * 10 }
	const tl = buildTimeline(l, clock, 200)
	const by = k => tl.intertitles.find(x => x.kicker === k)
	assert.equal(by('Two bars').start, 60)
	assert.equal(by('Paris, 1853').start, 20)
	assert.equal(tl.moments[by('Paris, 1853').moment].caption, 'A caption.')
	assert.deepEqual(tl.warnings, [])
	// floats: in written order, never over a pinned one or within the gap of it, the windowed one in its window
	const fl = tl.intertitles.filter(x => x.float)
	assert.deepEqual(fl.map(x => x.kicker), ['Floating', 'In a window', '1801'])
	assert.ok(fl[1].start >= 90 && fl[1].start <= 110)
	const all = tl.intertitles
	for (let i = 1; i < all.length; i++) assert.ok(all[i].start >= all[i - 1].end + INTERTITLE.gap - 1e-9, `${all[i - 1].kicker} / ${all[i].kicker}`)
	// the same take, the same places; another take, other places
	assert.deepEqual(layoutScreen(tl, { seed: 1 }).intertitles.map(x => x.start), tl.intertitles.map(x => x.start))
	assert.notDeepEqual(layoutScreen(tl, { seed: 2 }).intertitles.map(x => x.start), tl.intertitles.map(x => x.start))
	assert.match(toVTT(tl, { from: 'intertitles' }), /00:00:20\.000 --> 00:00:\d\d\.\d{3}\nPARIS, 1853\nA short line\./)
})

test('layout: floats open the piece densely, then spread out, and all fit', () => {
	const floats = Array.from({ length: 10 }, (_, i) => ({ float: true, kicker: 'F' + i, text: 'A line of about eight words to read here.', len: 7, from: 0, to: Infinity }))
	for (const seed of [1, 2, 3, 4, 5]) {
		const x = layoutScreen({ sections: [], moments: [], warnings: [], screen: { id: 'test', pins: [{ start: 40, end: 48, text: 'pin' }], floats, duration: 420 } }, { seed })
		const f = x.intertitles.filter(i => i.float).map(i => i.start)
		assert.equal(x.dropped, 0)
		assert.ok(f[0] >= LAYOUT.first[0] && f[0] <= LAYOUT.first[1], `first at ${f[0]}`)
		const gaps = f.slice(1).map((t, i) => t - f[i])
		assert.ok(gaps.slice(0, 2).every(g => g <= 40), `opening gaps ${gaps.slice(0, 2)}`)
		assert.ok(f.at(-1) <= 420 - LAYOUT.endClear)
	}
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
	// a hold of its own (the Title hold setting), and slower fades than a line's
	const h = withTitle(tl, { kicker: 'K', text: 'Title', hold: 15 }).intertitles
	assert.equal(h[0].end, 15)
	assert.ok(h[0].fadeIn > INTERTITLE.fadeIn)
	assert.equal(h[1].start, 15 + INTERTITLE.gap)
	assert.equal(titleSecs({ text: 'T', hold: 2 }), TITLE.fadeIn + TITLE.fadeOut + 1)    // (never shorter than its fades)
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
	assert.equal(momentAt(tl, 71).kind, 'history')    // bar 22: the Schwencke bar
	// intertitles: few, short, with a clear screen between them
	assert.ok(tl.intertitles.length >= 4 && tl.intertitles.length <= 8)
	assert.equal(tl.intertitles[0].voice, 'story')    // (a fact opens it, a few seconds in)
	assert.ok(tl.intertitles[0].start < 8)
	const shown = tl.intertitles.reduce((a, x) => a + x.end - x.start, 0)
	assert.ok(shown < duration * 0.5, `intertitles on screen ${shown.toFixed(0)} s of ${duration.toFixed(0)}`)
	for (const x of tl.intertitles) assert.ok(plainText(x.text).split(/\s+/).length <= INTERTITLE.maxWords && x.kicker.length <= 24, x.text)
	// the bar 22 line comes as bar 23 begins (after the jump the editors smoothed)
	assert.equal(intertitleAt(tl, 75).kicker, 'Bar 22')
	assert.ok(Math.abs(intertitleAt(tl, 75).start - 22 * 10 / 3) < 1e-3)
	assert.equal(tl.moments[intertitleAt(tl, 75).moment].at.bar, 22)
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

test('Gounod Ave Maria (#038): notes fit violinist/midis/gounod_ave_maria.mid', () => {
	const midi = new Midi(readFileSync(new URL('violinist/midis/gounod_ave_maria.mid', root)))
	const liner = parseLiner(read('liner/pieces/gounod-ave-maria.md'))
	const tl = buildTimeline(liner, clockOfMidi(midi), 266.4)
	assert.deepEqual(tl.warnings, [])
	// the extra bar (27): the piano's G-E flat over G, the melody's high C; its line shows as bar 28 begins
	const bar = b => (b - 1) * 4 * 60 / 66
	const piano = midi.tracks.slice(1).flatMap(t => t.notes)
	const in27 = new Set(piano.filter(n => n.time >= bar(27) - 0.01 && n.time < bar(28) - 0.01).map(n => n.midi))
	assert.ok(in27.has(43) && in27.has(51))    // G2 and E flat 3
	assert.ok(midi.tracks[0].notes.some(n => Math.abs(n.time - bar(27)) < 0.01 && n.midi === 84))    // C6
	assert.ok(Math.abs(tl.intertitles.find(x => x.kicker === 'The extra bar').start - bar(28)) < 1e-3)
	// the violin's last note is its open G
	assert.equal(midi.tracks[0].notes.at(-1).midi, 55)
	assert.equal(new Set(tl.intertitles.map(x => x.voice)).size, 2)
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

test('Bach BWV 850 (a MAESTRO recording, no bar grid): notes placed by time land on the music', () => {
	const midi = new Midi(readFileSync(new URL('midis/maestro_bach_850.mid', root)))
	const liner = parseLiner(read('liner/pieces/bach-wtc1-850.md'))
	const notes = midi.tracks.flatMap(t => t.notes).sort((a, b) => a.time - b.time)
	const duration = Math.max(...notes.map(n => n.time + n.duration))
	const tl = buildTimeline(liner, clockOfMidi(midi), duration)
	assert.deepEqual(liner.warnings, [])
	assert.deepEqual(tl.warnings, [])
	const at = (k, s) => tl.intertitles.find(x => x.kicker === k)
	// the prelude's pedal: the low A held from 0:45; the free ending's held chord from 0:56
	assert.ok(notes.some(n => n.midi === 45 && Math.abs(n.time - 45.5) < 0.5 && n.duration > 4))
	assert.ok(notes.some(n => n.time > 56 && n.time < 57 && n.duration > 1.5) || notes.filter(n => n.time > 56.9 && n.time < 58.7).length === 0)
	// the fugue: silence before it, then the subject in the bass (D3) at 1:15
	assert.equal(notes.filter(n => n.time > 68 && n.time < 75).length, 0)
	const first = notes.find(n => n.time > 70)
	assert.equal(first.midi, 50); assert.ok(Math.abs(first.time - 75.27) < 0.1)
	// the sections follow the music: prelude, then the fugue at 1:15
	assert.ok(tl.sections.some(s => s.title.startsWith('Fugue') && Math.abs(s.start - 75) < 0.5))
	assert.ok(at('Both hands').start < duration - 10)
	assert.ok(tl.intertitles.length >= 5)
})

test('layoutClip: a Short gets the pinned lines inside it and floating stories placed into it', () => {
	const midi = new Midi(readFileSync(new URL('midis/maestro_bach_850.mid', root)))
	const liner = parseLiner(read('liner/pieces/bach-wtc1-850.md'))
	const tl = buildTimeline(liner, clockOfMidi(midi), 208.6)
	for (const [a, b] of [[0, 30], [110, 145], [160, 205], [60, 105]]) {
		const its = layoutClip(tl, a, b).intertitles
		assert.ok(its.length >= 1, `${a}-${b}: no intertitles`)
		let shown = 0
		its.forEach((x, i) => {
			assert.ok(x.start >= a + 4 && x.end <= b - 0.3, `${a}-${b}: ${x.text} at ${x.start}`)
			if (i) assert.ok(x.start - its[i - 1].end >= INTERTITLE.gap - 1e-9, `${a}-${b}: too close`)
			shown += x.end - x.start
		})
		assert.ok(shown <= 0.5 * (b - a) + 10, `${a}-${b}: ${shown} s on screen`)
		// a pinned line inside the clip is kept at its place
		for (const p of tl.screen.pins) if (p.start >= a + 4 && p.end <= b - 0.3) assert.ok(its.some(x => x.text === p.text && x.start === p.start))
	}
})
