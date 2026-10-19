// Liner notes: X-Ray-style background for a piece, written as Markdown
// (format: liner/README.md). This module has no DOM: it parses the notes,
// places them on a MIDI file's bar grid, and writes WebVTT captions and
// YouTube chapters. The page UI is liner/overlay.js.

export const KINDS = ['history', 'analysis', 'trivia', 'listen', 'technique']
// the two voices of the intertitles: the story (history, trivia) and the commentary on the music
export const voiceOf = kind => ['analysis', 'listen', 'technique'].includes(kind) ? 'analysis' : 'story'

// ── Parsing ─────────────────────────────────────────────────────────────

// The front matter is a small YAML subset: `key: value` per line, `[a, b]`
// lists, quotes optional, `#` comments after a space. Numbers stay strings
// except where a caller converts them.
function parseFrontMatter(text) {
	const meta = {}
	for (const raw of text.split('\n')) {
		const line = raw.replace(/\s+#.*$/, '').trimEnd()
		const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
		if (!m) continue
		let v = m[2].trim()
		if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(Boolean)
		else v = unquote(v)
		meta[m[1]] = v
	}
	return meta
}
const unquote = s => /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s

function splitFrontMatter(text) {
	text = text.replace(/\r\n?/g, '\n')
	const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
	return m ? [parseFrontMatter(m[1]), text.slice(m[0].length)] : [{}, text]
}

const paragraphs = s => s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

// An anchor is a place in the music: `m22` (bar 22), `m22.3` (beat 3 of
// it, decimals allowed: `m22.2.5`), `m22'` (bar 22 the second time through,
// when the file plays a repeat: see `play:`), or a time `@83.4` / `@1:23.4`
// for files without a usable bar grid.
const ANCHOR = String.raw`(?:m\d+(?:\.\d+(?:\.\d+)?)?'*|@(?:\d+:)?\d+(?:\.\d+)?)`
export function parseAnchor(s) {
	let m = /^m(\d+)(?:\.(\d+(?:\.\d+)?))?('*)$/.exec(s)
	if (m) return m[3] ? { bar: +m[1], beat: m[2] ? +m[2] : 1, pass: m[3].length + 1 } : { bar: +m[1], beat: m[2] ? +m[2] : 1 }
	m = /^@(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s)
	if (m) return { seconds: (m[1] ? +m[1] * 60 : 0) + +m[2] }
	return null
}
const HEAD = new RegExp(String.raw`^(${ANCHOR})(?:\s*[-–]\s*(${ANCHOR}))?\s*(?:[·:|-]\s*)?(.*)$`)

// `screen: Kicker | Line` (or `screen: Line`, or `screen: Kicker | Line | Small line`): an intertitle
export function parseScreen(s) {
	const p = String(s).split('|').map(x => x.trim())
	if (p.length === 1) return { kicker: '', text: p[0] }
	return p[2] ? { kicker: p[0], text: p[1], sub: p.slice(2).join(' | ') } : { kicker: p[0], text: p[1] }
}

/**
 * Parse a piece's liner notes.
 * @returns {{ meta, overview: string[], sections, moments, intertitles, warnings: string[] }}
 *   sections: [{ at, title, text }]; moments: [{ at, until?, kind, caption, detail: string[], source?, screen?, aside? }]
 *   intertitles: [{ at?, until?, float?, from?, to?, kind, voice, kicker, text, sub?, moment? }] — the
 *   few lines shown on screen as the piece plays: the `# Intertitles` part, and every moment with a
 *   `screen:` line (pinned to the music) or an `aside:` line (floating: placed by layoutScreen)
 *   (at / until / from / to are parsed anchors; text fields are Markdown, see renderInline)
 */
export function parseLiner(text) {
	const [meta, body] = splitFrontMatter(text)
	const out = { meta, overview: [], sections: [], moments: [], intertitles: [], warnings: [] }
	let part = 'overview', cur = null, buf = []
	const flush = () => {
		const ps = paragraphs(buf.join('\n')); buf = []
		if (!cur) { if (part === 'overview') out.overview.push(...ps); return }
		// a `source:` line anywhere in an entry is its citation, a `screen:` line its intertitle
		const rest = []
		for (const p of ps) {
			let m
			if ((m = /^source:\s*([\s\S]+)$/i.exec(p))) cur.source = m[1].trim()
			else if ((m = /^(screen|aside):\s*([\s\S]+)$/i.exec(p)) && cur.kind) cur[m[1].toLowerCase()] = parseScreen(m[2].replace(/\s*\n\s*/g, ' '))
			else rest.push(p)
		}
		if (cur.intertitle) { cur.text = rest.join(' ').replace(/\s*\n\s*/g, ' '); if (!cur.text) out.warnings.push(`intertitle at ${cur.head} has no text`) }
		else if (cur.title !== undefined) cur.text = rest.join('\n\n')
		else { cur.caption = rest[0] || ''; cur.detail = rest.slice(1); if (!cur.caption) out.warnings.push(`moment at ${cur.head} has no caption`) }
		cur = null
	}
	for (const line of body.split('\n')) {
		let m
		if ((m = /^#\s+(.+?)\s*$/.exec(line))) {
			flush()
			const name = m[1].toLowerCase()
			part = name.startsWith('section') ? 'sections' : name.startsWith('moment') ? 'moments' : name.startsWith('intertitle') || name.startsWith('on screen') ? 'intertitles' : 'overview'
			if (part === 'overview' && !/^overview/.test(name)) out.warnings.push(`unknown part "# ${m[1]}"`)
			continue
		}
		if ((m = /^##\s+(.+?)\s*$/.exec(line)) && part !== 'overview') {
			flush()
			// an intertitle that floats: `## ~ Kicker`, or `## ~m1-m64 Kicker` (somewhere in those bars)
			const fl = part === 'intertitles' && new RegExp(String.raw`^~\s*(?:(${ANCHOR})\s*[-–]\s*(${ANCHOR}))?\s*(?:[·:|-]\s*)?(.*)$`).exec(m[1])
			if (fl) {
				cur = { head: '~', float: true, ...(fl[1] ? { from: parseAnchor(fl[1]), to: parseAnchor(fl[2]) } : {}), ...kindKicker(fl[3], 'history'), intertitle: true }
				out.intertitles.push(cur)
				continue
			}
			const h = HEAD.exec(m[1])
			if (!h) { out.warnings.push(`bad anchor in "## ${m[1]}"`); cur = null; continue }
			const at = parseAnchor(h[1]), until = h[2] ? parseAnchor(h[2]) : undefined
			if (part === 'sections') { cur = { head: h[1], at, until, title: h[3].trim() }; out.sections.push(cur) }
			else if (part === 'intertitles') { cur = { head: h[1], at, until, ...kindKicker(h[3], 'history'), intertitle: true }; out.intertitles.push(cur) }
			else {
				let kind = h[3].trim().toLowerCase()
				if (!KINDS.includes(kind)) { if (kind) out.warnings.push(`unknown kind "${kind}" at ${h[1]}`); kind = 'trivia' }
				cur = { head: h[1], at, until, kind }
				out.moments.push(cur)
			}
			continue
		}
		buf.push(line)
	}
	flush()
	out.moments.forEach((m, i) => {
		if (m.screen) out.intertitles.push({ at: m.at, until: m.until, kind: m.kind, ...m.screen, moment: i })
		if (m.aside) out.intertitles.push({ float: true, kind: m.kind, ...m.aside, moment: i })
	})
	for (const x of out.intertitles) { delete x.intertitle; x.voice = voiceOf(x.kind) }
	for (const x of [...out.sections, ...out.moments, ...out.intertitles]) delete x.head
	return out
}

// `analysis · Kicker` in an intertitle heading: its kind (and so its voice), then the kicker
function kindKicker(s, kind) {
	const m = new RegExp(String.raw`^(${KINDS.join('|')})\b\s*(?:[·:|-]\s*)?(.*)$`, 'i').exec(String(s).trim())
	return m ? { kind: m[1].toLowerCase(), kicker: m[2].trim() } : { kind, kicker: String(s).trim() }
}

/** A card: something the notes link to with [[id]] (a person, a work, a term). */
export function parseCard(text, id) {
	const [meta, body] = splitFrontMatter(text)
	const ps = paragraphs(body)
	const src = ps.findIndex(p => /^source:/i.test(p))
	const source = src >= 0 ? ps.splice(src, 1)[0].replace(/^source:\s*/i, '') : undefined
	return { id, title: meta.title || id, kind: meta.kind || '', subtitle: meta.subtitle || '', body: ps, source, piece: meta.piece || '' }
}

// ── Inline Markdown ─────────────────────────────────────────────────────

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/**
 * Inline Markdown to HTML: **bold**, *italic*, `code`, [text](url) and
 * [[card]] / [[card|text]] (a link to a card; `card(id, text)` returns the
 * HTML for it, or omit it to keep the text only).
 */
export function renderInline(s, card) {
	const parts = []
	s = String(s).replace(/\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g, (_, id, text) => {
		parts.push(card ? card(id, esc(text || id.replace(/-/g, ' '))) : esc(text || id.replace(/-/g, ' ')))
		return `\u0000${parts.length - 1}\u0000`
	})
	s = esc(s)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
		.replace(/\*([^*]+)\*/g, '<i>$1</i>')
		.replace(/\[([^\]]+)\]\((https?:[^)\s]+|[\w./#-]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
	return s.replace(/\u0000(\d+)\u0000/g, (_, i) => parts[+i])
}

/** Inline Markdown to plain text (captions, canvas, VTT). */
export function plainText(s) {
	return String(s)
		.replace(/\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g, (_, id, text) => text || id.replace(/-/g, ' '))
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g, (_, a, b, c) => a || b || c)
}

// ── Bar grid ────────────────────────────────────────────────────────────

/**
 * Bars and beats of a MIDI file, from its time signatures and tempo map.
 * @param header a @tonejs/midi Header (ppq, timeSignatures, ticksToSeconds)
 * @param o.pickup beats before bar 1 (an anacrusis); o.lastTick: the last note-on
 * @returns {{ bars: number, seconds(anchor): number, barAt(seconds): number }}
 */
export function barClock(header, { pickup = 0, lastTick = 0 } = {}) {
	const ppq = header.ppq || 480
	const sigs = (header.timeSignatures?.length ? [...header.timeSignatures] : [{ ticks: 0, timeSignature: [4, 4] }]).sort((a, b) => a.ticks - b.ticks)
	if (sigs[0].ticks > 0) sigs.unshift({ ticks: 0, timeSignature: [4, 4] })
	const segs = []
	for (const s of sigs) {
		const [num, den] = s.timeSignature
		const beat = ppq * 4 / den, bar = beat * num
		const prev = segs.at(-1)
		const startBar = prev ? prev.startBar + (s.ticks - prev.ticks) / prev.bar : 1 - pickup / num
		if (prev && prev.ticks === s.ticks) segs.pop()
		segs.push({ ticks: s.ticks, startBar, beat, bar })
	}
	const ticksOf = (bar, beat = 1) => {
		let s = segs[0]
		for (const x of segs) if (bar >= x.startBar - 1e-9) s = x
		return s.ticks + (bar - s.startBar) * s.bar + (beat - 1) * s.beat
	}
	const barOfTicks = t => {
		let s = segs[0]
		for (const x of segs) if (t >= x.ticks) s = x
		return s.startBar + (t - s.ticks) / s.bar
	}
	const secs = t => header.ticksToSeconds ? header.ticksToSeconds(t) : t / ppq * 0.5
	return {
		bars: lastTick > 0 ? Math.floor(barOfTicks(lastTick) + 1e-6) : 0,
		seconds: a => a.seconds ?? secs(Math.max(0, ticksOf(a.bar, a.beat))),
		barAt: s => {
			// (seconds → ticks by bisection: the tempo map only goes one way)
			let lo = 0, hi = Math.max(lastTick, ppq * 4) * 4
			for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (secs(mid) < s) lo = mid; else hi = mid }
			return Math.floor(barOfTicks(lo) + 1e-6)
		},
	}
}

/** The bar clock of a @tonejs/midi Midi (last note-on included). */
export function clockOfMidi(midi, o = {}) {
	let last = 0
	for (const t of midi.tracks) for (const n of t.notes) if (n.channel !== 9) last = Math.max(last, n.ticks)
	return barClock(midi.header, { lastTick: last, ...o })
}

// ── Repeats and other differences between the score and the file ───────

/**
 * `play:` in the front matter says which score bars the file plays, in order,
 * when that differs from 1, 2, 3…: `1-64, 1-64, 65-186, 187*4, 188-200`
 * is a written-out repeat of bars 1–64, and one score bar (187, a cadenza)
 * that the file spreads over four of its own bars.
 * @returns [{ from, to, span }] (span: file bars per score bar), or null
 */
export function parsePlay(s) {
	if (!s) return null
	const out = []
	for (const part of String(Array.isArray(s) ? s.join(',') : s).split(',').map(x => x.trim()).filter(Boolean)) {
		const m = /^(\d+)(?:\s*[-–]\s*(\d+))?(?:\s*\*\s*(\d+(?:\.\d+)?))?$/.exec(part)
		if (!m) throw new Error(`bad play range "${part}"`)
		out.push({ from: +m[1], to: m[2] ? +m[2] : +m[1], span: m[3] ? +m[3] : 1 })
	}
	return out
}

/**
 * A clock in score bars over a clock in file bars: anchors name score bars
 * (m22, or m22' for the second time through), the file plays `play`.
 */
export function scoreClock(clock, play) {
	if (!play) return clock
	const runs = []
	let fileBar = 1
	for (const r of play) { runs.push({ ...r, fileBar }); fileBar += (r.to - r.from + 1) * r.span }
	const fileBars = fileBar - 1
	return {
		bars: Math.max(...play.map(r => r.to)),
		fileBars,
		fileClockBars: clock.bars,
		seconds(a) {
			if (a.seconds != null) return a.seconds
			let pass = a.pass || 1
			for (const r of runs) {
				if (a.bar < r.from || a.bar > r.to || --pass > 0) continue
				// (in a score bar spread over several file bars, beats count on through them)
				const b = a.beat - 1, per = r.span > 1 ? 4 : Infinity
				return clock.seconds({ bar: r.fileBar + (a.bar - r.from) * r.span + (r.span > 1 ? Math.floor(b / per) : 0), beat: 1 + (r.span > 1 ? b % per : b) })
			}
			return NaN
		},
	}
}

// ── Timeline ────────────────────────────────────────────────────────────

// how long a caption stays: ~3 words a second plus a beat to look up,
// 4–9 s, and never into the next one
const readSecs = s => Math.min(9, Math.max(4, plainText(s).split(/\s+/).length / 3 + 1.5))

/**
 * Place the notes on a file: every section and moment gets start / end
 * seconds. `duration` is the song's length (the last section ends there).
 * @returns {{ sections, moments, warnings }}
 */
export function buildTimeline(liner, clock, duration) {
	const warnings = [...liner.warnings]
	let play = null
	try { play = parsePlay(liner.meta.play) } catch (e) { warnings.push(e.message) }
	if (play) {
		const fileBars = clock.bars
		clock = scoreClock(clock, play)
		if (fileBars && clock.fileBars !== fileBars) warnings.push(`play: covers ${clock.fileBars} bars of the file, it has ${fileBars}`)
	}
	const want = +liner.meta.bars
	if (want && clock.bars && want !== clock.bars) warnings.push(`the notes are for ${want} bars, this file has ${clock.bars}`)
	const check = a => {
		if (a?.bar && clock.bars && a.bar > clock.bars) warnings.push(`m${a.bar} is past the last bar (${clock.bars})`)
		else if (a?.bar && !Number.isFinite(clock.seconds(a))) warnings.push(`m${a.bar}${"'".repeat((a.pass || 1) - 1)} is not played`)
	}
	const at = a => Math.min(duration, clock.seconds(a))
	const played = x => { const ok = Number.isFinite(clock.seconds(x.at)); if (ok && x.until && !Number.isFinite(clock.seconds(x.until))) delete x.until; return ok }
	// (anything at a bar the file does not play is warned about and left out)
	const sections = liner.sections.map(s => { check(s.at); return { ...s } }).filter(played).map(s => ({ ...s, start: at(s.at) })).sort((a, b) => a.start - b.start)
	sections.forEach((s, i) => { s.end = s.until ? at(s.until) : sections[i + 1]?.start ?? duration })
	const moments = liner.moments.map((m, src) => { check(m.at); return { ...m, src } }).filter(played).map(m => ({ ...m, start: at(m.at) })).sort((a, b) => a.start - b.start)
	moments.forEach((m, i) => {
		const next = moments[i + 1]?.start ?? Infinity
		const want = m.until ? at(m.until) : m.start + readSecs(m.caption)
		m.end = Math.min(next, Math.max(want, m.start + 2), duration + 3)
	})
	// intertitles. Pinned ones (`screen:`) appear at their bar, or, given a
	// range (m188-m190), when it ends: after the listener has heard it. Floating
	// ones (`aside:`, `## ~`) are placed by layoutScreen. Each fades in, holds
	// for the words plus a breath, and fades out.
	const sorted = new Map(moments.map((m, j) => [m.src, j]))
	const words = x => plainText(x.text).split(/\s+/).length
	const all = (liner.intertitles || []).map(x => ({ ...x, moment: x.moment != null ? sorted.get(x.moment) : undefined }))
	for (const x of all) if (words(x) > INTERTITLE.maxWords) warnings.push(`intertitle "${plainText(x.text).slice(0, 30)}…" has ${words(x)} words (at most ${INTERTITLE.maxWords} read comfortably)`)
	const pins = all.filter(x => !x.float).map(x => { check(x.at); if (x.until) check(x.until); return x }).filter(played).map(x => {
		const start = x.until ? at(x.until) : at(x.at)
		return { ...x, start, end: Math.min(start + intertitleSecs(x.text), duration + 3) }
	}).sort((a, b) => a.start - b.start)
	pins.forEach((x, i) => { const prev = pins[i - 1]; if (prev && x.start - prev.end < INTERTITLE.gap) warnings.push(`pinned intertitles at ${mmss(prev.start)} and ${mmss(x.start)} are ${Math.max(0, x.start - prev.end).toFixed(1)} s apart (leave ${INTERTITLE.gap} s)`) })
	const floats = all.filter(x => x.float).map(x => {
		const w = x.from ? [at(x.from), at(x.to)] : [0, Infinity]
		return { ...x, len: intertitleSecs(x.text), from: w[0], to: w[1] }
	})
	const screen = { id: liner.id || liner.meta.id || liner.meta.title || '', pins, floats, duration }
	const tl = { sections, moments, warnings, screen }
	tl.intertitles = layoutScreen(tl).intertitles
	return tl
}

/** Intertitle timing: fades, breathing room, the clear gap between two, and length. */
export const INTERTITLE = { fadeIn: 1.2, fadeOut: 1.5, breath: 2.5, perWord: 0.3, min: 5, max: 10, gap: 3, maxWords: 14 }
/**
 * Where floating intertitles go: the first a few seconds in, then one every
 * 20–30 s through the opening (when attention is highest), then the rest
 * spread over what is left, each ±30 %; never over a pinned one or within
 * the gap of it, never in the last 10 s. Floats keep their written order.
 */
export const LAYOUT = { first: [3, 6], opening: 100, openingGap: [20, 30], minGap: 18, spread: 0.3, endClear: 10 }

// a small seeded generator (mulberry32) and a string hash, so a layout is the same on the page and in the export
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

/**
 * The intertitles as they show: the pinned ones, the title (if given) at the
 * start, and the floating ones placed by a seeded generator (LAYOUT). `seed`
 * picks the take: the same seed always gives the same placement.
 * @returns a copy of the timeline with `intertitles` (and `dropped`: floats that did not fit)
 */
export function layoutScreen(tl, { seed = 1, title = null, start = 0 } = {}) {
	const base = tl || { sections: [], moments: [], intertitles: [], warnings: [] }
	const sc = base.screen || { id: '', pins: base.intertitles || [], floats: [], duration: Infinity }
	const rnd = mulberry32(hashStr(sc.id) ^ Math.imul(seed | 0, 0x9E3779B1))
	const between = ([a, b]) => a + rnd() * (b - a)
	const G = INTERTITLE.gap, L = LAYOUT
	let pins = sc.pins.map(x => ({ ...x }))
	if (title?.text) {
		// the title from the first note, larger, held `title.hold` seconds (else a little longer
		// than a line: 7–11 s by its words), fading in slower; pins it would crowd move later
		const T = { ...title, title: true, voice: 'story', start, end: start + titleSecs(title), fadeIn: TITLE.fadeIn, fadeOut: TITLE.fadeOut }
		const moved = [T]
		for (const x of pins) { const after = moved.at(-1).end + G; moved.push(x.start >= after ? x : { ...x, start: after, end: after + (x.end - x.start), moved: true }) }
		pins = moved
	}
	const out = [...pins]
	const D = Number.isFinite(sc.duration) ? sc.duration : Infinity, lastAt = D - L.endClear
	const clash = (a, b) => out.filter(p => p.start < b + G && p.end + G > a)
	let t = title?.text ? pins[0].end + G : start + between(L.first)
	let dropped = 0, prev = -Infinity
	sc.floats.forEach((f, i) => {
		t = Math.max(t, f.from ?? 0)
		// in the way of a pinned one: before it if there is room (the rhythm holds), else after it
		const c0 = clash(t, t + f.len)
		if (c0.length) {
			const early = Math.min(...c0.map(p => p.start)) - G - f.len
			if (early >= Math.max(prev + L.minGap * 0.8, f.from ?? 0, start + L.first[0]) && !clash(early, early + f.len).length) t = early
		}
		for (let c, n = 0; (c = clash(t, t + f.len)).length && n < 100; n++) t = Math.max(...c.map(p => p.end)) + G + rnd() * 2
		if (t > Math.min(lastAt, (f.to ?? Infinity))) { dropped++; return }
		out.push({ ...f, start: t, end: t + f.len })
		prev = t
		const left = sc.floats.length - i - 1
		t += t < start + L.opening ? between(L.openingGap) : Math.max(L.minGap, (lastAt - t) / (left + 1) * (1 - L.spread + 2 * L.spread * rnd()))
	})
	out.sort((a, b) => a.start - b.start)
	return { ...base, intertitles: out, dropped }
}


export const intertitleSecs = text => Math.min(INTERTITLE.max, Math.max(INTERTITLE.min, INTERTITLE.fadeIn + INTERTITLE.breath + plainText(text).split(/\s+/).length * INTERTITLE.perWord + INTERTITLE.fadeOut))
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
/**
 * The song title as the first intertitle: `screen:` in the front matter
 * (Kicker | Title | Small line), else the composer over the title; for a
 * song without notes, `fallback` ({ kicker, text, sub }).
 */
export function titleScreen(liner, fallback) {
	const m = liner?.meta
	if (m?.screen) return parseScreen(m.screen)
	if (m?.title) return { kicker: m.composer || '', text: m.title }
	return fallback || null
}

/** The song title as an intertitle: its fades, and the hold when it has none of its own. */
export const TITLE = { fadeIn: 2.5, fadeOut: 2, min: 7, max: 11, extra: 1.5 }
export function titleSecs(title) {
	if (title?.hold > 0) return Math.max(title.hold, TITLE.fadeIn + TITLE.fadeOut + 1)
	const words = plainText([title?.kicker, title?.text, title?.sub].filter(Boolean).join(' ')).split(/\s+/).length
	return Math.min(TITLE.max, Math.max(TITLE.min, INTERTITLE.fadeIn + INTERTITLE.breath + TITLE.extra + words * INTERTITLE.perWord + INTERTITLE.fadeOut))
}

/** The timeline with `title` as an intertitle from `start` (see layoutScreen). */
export const withTitle = (tl, title, { start = 0, seed = 1 } = {}) => layoutScreen(tl, { title, start, seed })

export const intertitleAt = (tl, t) => tl?.intertitles?.find(x => t >= x.start - 0.05 && t < x.end) || null

export const sectionAt = (tl, t) => tl?.sections.findLast(s => t >= s.start - 0.05) || null
export const momentAt = (tl, t) => tl?.moments.find(m => t >= m.start - 0.05 && t < m.end) || null

// ── Export: WebVTT captions and YouTube chapters ────────────────────────

const pad = (n, w = 2) => String(n).padStart(w, '0')
const vttTime = s => { s = Math.max(0, s); const ms = Math.round(s * 1000); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}` }

/**
 * WebVTT for the moments. `offset`: video time of song time 0 (a title card
 * and a pre-roll push the music later); `speed`: playback speed.
 */
export function toVTT(tl, { offset = 0, speed = 1, kinds = true, from = 'moments', start: clipA = -Infinity, end: clipB = Infinity } = {}) {
	const out = ['WEBVTT', '']
	const cues = from === 'intertitles'
		? tl.intertitles.map(x => ({ start: x.start, end: x.end, text: (x.kicker ? plainText(x.kicker).toUpperCase() + '\n' : '') + plainText(x.text) + (x.sub ? '\n' + plainText(x.sub) : '') }))
		: tl.moments.map(m => ({ start: m.start, end: m.end, text: (kinds ? `[${m.kind}] ` : '') + plainText(m.caption).replace(/\n+/g, ' ') }))
	// (a clip of the song, start..end in song time: only the cues in it, cut to it)
	cues.filter(c => c.end > clipA && c.start < clipB).forEach((c, i) => out.push(String(i + 1), `${vttTime(offset + Math.max(c.start, clipA) / speed)} --> ${vttTime(offset + Math.min(c.end, clipB) / speed)}`, c.text, ''))
	return out.join('\n')
}

/**
 * YouTube chapters for a video description: the sections as `m:ss Title`
 * lines. YouTube wants the first at 0:00, at least three, each ≥ 10 s, so
 * shorter sections merge into the one before them.
 */
export function toChapters(tl, { offset = 0, speed = 1, total = Infinity, intro = 'Intro' } = {}) {
	let ch = tl.sections.map(s => ({ t: offset + s.start / speed, title: plainText(s.title) }))
	if (!ch.length) return ''
	if (ch[0].t > 10 && intro) ch.unshift({ t: 0, title: intro })
	ch[0].t = 0
	const end = Number.isFinite(total) ? total : offset + (tl.sections.at(-1).end) / speed
	for (let i = ch.length - 1; i > 0; i--) if ((ch[i + 1]?.t ?? end) - ch[i].t < 10) ch.splice(i, 1)
	if (ch.length > 1 && (ch[1]?.t ?? end) - ch[0].t < 10) ch.splice(1, 1)
	if (ch.length < 3) return ''
	const fmt = t => { t = Math.floor(t); return t >= 3600 ? `${Math.floor(t / 3600)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}` : `${Math.floor(t / 60)}:${pad(t % 60)}` }
	return ch.map(c => `${fmt(c.t)} ${c.title}`).join('\n')
}

// ── Library: which file has notes, fetched on demand ────────────────────

/**
 * The notes collection under `base` (liner/ by default): index.json maps
 * song files to pieces/<id>.md, cards live in cards/<id>.md.
 */
export function createLinerLibrary(base = new URL('./', import.meta.url).href, fetchText = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.text() }) {
	const pieces = new Map(), cards = new Map()
	let index = {}
	const ready = fetchText(base + 'index.json').then(t => { index = JSON.parse(t).files || {} }).catch(e => console.warn('[liner] no index:', e.message))
	const idOf = file => {
		if (!file) return null
		const f = String(file).replace(/^\.?\//, '')
		if (index[f]) return index[f]
		const leaf = f.split('/').pop()
		for (const [k, v] of Object.entries(index)) if (k.split('/').pop() === leaf) return v
		return null
	}
	const card = id => {
		if (!cards.has(id)) cards.set(id, fetchText(`${base}cards/${id}.md`).then(t => parseCard(t, id)).catch(() => null))
		return cards.get(id)
	}
	const piece = id => {
		if (!pieces.has(id)) pieces.set(id, fetchText(`${base}pieces/${id}.md`).then(t => {
			const liner = parseLiner(t)
			liner.id = id
			// the cards named in the front matter and every [[card]] in the text
			const ids = new Set(liner.meta.cards || [])
			for (const m of t.matchAll(/\[\[([\w-]+)/g)) ids.add(m[1])
			return Promise.all([...ids].map(card)).then(cs => { liner.cards = Object.fromEntries(cs.filter(Boolean).map(c => [c.id, c])); return liner })
		}))
		return pieces.get(id)
	}
	return {
		ready,
		/** the piece id for a song file (after `ready`), or null */
		idOf,
		/** the parsed notes (with their cards) for a song file, or null */
		async forFile(file) { await ready; const id = idOf(file); return id ? piece(id).catch(e => { console.warn('[liner]', e); return null }) : null },
		piece, card,
	}
}
