// Liner notes: X-Ray-style background for a piece, written as Markdown
// (format: liner/README.md). This module has no DOM: it parses the notes,
// places them on a MIDI file's bar grid, and writes WebVTT captions and
// YouTube chapters. The page UI is liner/overlay.js.

export const KINDS = ['history', 'analysis', 'trivia', 'listen', 'technique']

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
 *   sections: [{ at, title, text }]; moments: [{ at, until?, kind, caption, detail: string[], source?, screen? }]
 *   intertitles: [{ at, until?, kicker, text, moment? }] — the few lines shown on screen as the
 *   piece plays: the `# Intertitles` part, and every moment with a `screen:` line (moment: its index)
 *   (at / until are parsed anchors; text fields are Markdown, see renderInline)
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
			else if ((m = /^screen:\s*([\s\S]+)$/i.exec(p)) && cur.kind) cur.screen = parseScreen(m[1].replace(/\s*\n\s*/g, ' '))
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
			const h = HEAD.exec(m[1])
			if (!h) { out.warnings.push(`bad anchor in "## ${m[1]}"`); cur = null; continue }
			const at = parseAnchor(h[1]), until = h[2] ? parseAnchor(h[2]) : undefined
			if (part === 'sections') { cur = { head: h[1], at, until, title: h[3].trim() }; out.sections.push(cur) }
			else if (part === 'intertitles') { cur = { head: h[1], at, until, kicker: h[3].trim(), intertitle: true }; out.intertitles.push(cur) }
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
	out.moments.forEach((m, i) => { if (m.screen) out.intertitles.push({ at: m.at, until: m.until, ...m.screen, moment: i }) })
	for (const x of out.intertitles) delete x.intertitle
	for (const x of [...out.sections, ...out.moments, ...out.intertitles]) delete x.head
	return out
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
	// intertitles: fade in, hold for the words plus a breath, fade out; and a
	// clear screen between them (warned about, not moved: the writer decides)
	// (an intertitle from a moment's `screen:` line points at that moment in the sorted list)
	const sorted = new Map(moments.map((m, j) => [m.src, j]))
	const intertitles = (liner.intertitles || []).map(x => { check(x.at); return { ...x } }).filter(played).map(x => ({ ...x, moment: x.moment != null ? sorted.get(x.moment) : undefined, start: at(x.at) })).sort((a, b) => a.start - b.start)
	intertitles.forEach((x, i) => {
		const words = plainText(x.text).split(/\s+/).length
		if (words > INTERTITLE.maxWords) warnings.push(`intertitle at ${mmss(x.start)} has ${words} words (at most ${INTERTITLE.maxWords} read comfortably)`)
		const want = x.until ? at(x.until) - x.start : intertitleSecs(x.text)
		x.end = Math.min(x.start + Math.max(INTERTITLE.min, want), duration + 3)
		const prev = intertitles[i - 1]
		if (prev && x.start - prev.end < INTERTITLE.gap) warnings.push(`intertitles at ${mmss(prev.start)} and ${mmss(x.start)} are ${Math.max(0, x.start - prev.end).toFixed(1)} s apart (leave ${INTERTITLE.gap} s)`)
	})
	return { sections, moments, intertitles, warnings }
}

/** Intertitle timing: fades, breathing room, the clear gap between two, and length. */
export const INTERTITLE = { fadeIn: 1.2, fadeOut: 1.5, breath: 2.5, perWord: 0.3, min: 5, max: 10, gap: 3, maxWords: 14 }
export const intertitleSecs = text => Math.min(INTERTITLE.max, INTERTITLE.fadeIn + INTERTITLE.breath + plainText(text).split(/\s+/).length * INTERTITLE.perWord + INTERTITLE.fadeOut)
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

/**
 * A copy of the timeline with `title` as an intertitle from `start`, held a
 * little longer than the others; the intertitles it would crowd move later
 * (keeping the clear gap). With no timeline, one with just the title.
 */
export function withTitle(tl, title, { start = 0 } = {}) {
	const base = tl || { sections: [], moments: [], intertitles: [], warnings: [] }
	if (!title?.text) return base
	const words = plainText([title.kicker, title.text, title.sub].filter(Boolean).join(' ')).split(/\s+/).length
	const T = { ...title, title: true, start, end: start + Math.min(11, Math.max(7, INTERTITLE.fadeIn + INTERTITLE.breath + 1.5 + words * INTERTITLE.perWord + INTERTITLE.fadeOut)) }
	const out = [T]
	for (const x of base.intertitles || []) {
		const after = out.at(-1).end + INTERTITLE.gap
		out.push(x.start >= after ? x : { ...x, start: after, end: after + (x.end - x.start), moved: true })
	}
	return { ...base, intertitles: out }
}

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
