// Liner notes on the page: intertitles (the few lines marked for the screen)
// or every note as a caption while the music plays, a notes panel
// (X-Ray style: what is happening now, the sections, every note, the people
// and terms), section marks on the seek bar, and a peek card when hovering a
// song in a menu. Also draws a caption into an exported video frame.
// The notes themselves: liner/liner.js and liner/README.md.

import { renderInline, plainText, sectionAt, momentAt, intertitleAt, toVTT, toChapters, INTERTITLE, withTitle } from './liner.js'

// ── Intertitle styles ───────────────────────────────────────────────────
// A kicker (small, letter-spaced capitals: a place and year, a term) over one
// line of text. Fonts from fonts/ (OFL, see fonts/README.md), under names of
// their own so a page's @font-face rules don't clash.
const FONT_DIR = new URL('../fonts/', import.meta.url).href
const FACES = [
	['Liner Cormorant', 400, 'normal', 'cormorant-garamond-latin-400-normal'],
	['Liner Cormorant', 500, 'italic', 'cormorant-garamond-latin-500-italic'],
	['Liner Cinzel', 400, 'normal', 'cinzel-latin-400-normal'],
	['Liner Montserrat', 300, 'normal', 'montserrat-latin-300-normal'],
	['Liner Montserrat', 500, 'normal', 'montserrat-latin-500-normal'],
]
// [family, weight, style, letter-spacing in em]; size: of the line, in px at 1080 lines
export const INTERTITLE_STYLES = {
	serif: { label: 'Serif (Cormorant Garamond)', kicker: ['Liner Cinzel', 400, 'normal', 0.3], line: ['Liner Cormorant', 400, 'normal', 0.01], sub: ['Liner Cormorant', 500, 'italic', 0.02], size: 50 },
	italic: { label: 'Serif italic', kicker: ['Liner Cinzel', 400, 'normal', 0.3], line: ['Liner Cormorant', 500, 'italic', 0.01], sub: ['Liner Cormorant', 400, 'normal', 0.04], size: 50 },
	capitals: { label: 'Capitals (Cinzel)', kicker: ['Liner Cinzel', 400, 'normal', 0.42], line: ['Liner Cinzel', 400, 'normal', 0.09], sub: ['Liner Cormorant', 500, 'italic', 0.02], size: 36, upper: true },
	sans: { label: 'Modern sans (Montserrat, spaced)', kicker: ['Liner Montserrat', 500, 'normal', 0.42], line: ['Liner Montserrat', 300, 'normal', 0.07], sub: ['Liner Montserrat', 300, 'normal', 0.2], size: 36 },
}
// colours: kicker, line, small line, the rule under the kicker, the pool behind the words, the glow
export const INTERTITLE_THEMES = {
	mono: { label: 'Black and white (grey headings)', k: '#bfbfbf', l: '#f6f6f6', s: '#b5b5b5', r: 'rgba(255,255,255,0.42)', scrim: 'rgba(0,0,0,0.5)', glow: 'rgba(0,0,0,0.65)' },
	white: { label: 'All white', k: '#ffffff', l: '#ffffff', s: 'rgba(255,255,255,0.82)', r: 'rgba(255,255,255,0.7)', scrim: 'rgba(0,0,0,0.5)', glow: 'rgba(0,0,0,0.65)' },
	ink: { label: 'Black on light (bright scenes)', k: '#4a4a4a', l: '#101010', s: '#3c3c3c', r: 'rgba(0,0,0,0.45)', scrim: 'rgba(255,255,255,0.55)', glow: 'rgba(255,255,255,0.7)' },
	warm: { label: 'Warm gold', k: '#ecd2a4', l: '#f4eee4', s: '#d9c7a6', r: 'rgba(230,196,142,0.55)', scrim: 'rgba(0,0,0,0.5)', glow: 'rgba(0,0,0,0.65)' },
}
export const INTERTITLE_POSITIONS = {
	auto: 'Automatic (away from the pianist)',
	'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right', 'bottom-center': 'Bottom centre',
	'top-left': 'Top left', 'top-right': 'Top right',
}
const posClass = p => ({ 'bottom-left': 'bl', 'bottom-right': 'br', 'bottom-center': 'bc', 'top-left': 'tl', 'top-right': 'tr' })[p] || 'bl'
const fam = f => `'${f[0]}', Georgia, serif`
const cssFont = (f, px) => `${f[2]} ${f[1]} ${px}px ${fam(f)}`
/** wait for a style's fonts (before drawing it into a canvas) */
export function loadIntertitleFonts(style = 'serif') {
	const st = INTERTITLE_STYLES[style] || INTERTITLE_STYLES.serif
	injectFaces()
	return Promise.all([st.kicker, st.line, st.sub].map(f => document.fonts.load(cssFont(f, 40)).catch(() => null)))
}
function injectFaces() {
	if (document.getElementById('ln-faces')) return
	document.head.append(Object.assign(document.createElement('style'), { id: 'ln-faces', textContent: FACES.map(([f, w, st, file]) => `@font-face { font-family: '${f}'; font-weight: ${w}; font-style: ${st}; src: url(${FONT_DIR}${file}.woff2) format('woff2'); font-display: swap; }`).join('\n') }))
}
// opacity of an intertitle at song time t (fades by song time, so pausing and seeking hold it)
const itAlpha = (x, t) => Math.max(0, Math.min(1, (t - x.start) / INTERTITLE.fadeIn, (x.end - t) / INTERTITLE.fadeOut))

export const KIND_COLORS = { history: '#e8b46a', analysis: '#7cc6c0', trivia: '#e79aa6', listen: '#b7a6f0', technique: '#9fd38a' }
const KIND_LABEL = { history: 'History', analysis: 'Analysis', trivia: 'Trivia', listen: 'Listen', technique: 'Technique' }

const CSS = `
.ln-cap { position: absolute; left: 50%; bottom: 132px; transform: translate(-50%, 8px); max-width: min(760px, 86vw); padding: 10px 18px 11px; border-radius: 12px;
  background: rgba(16, 16, 16, 0.62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #f4f1ea; text-align: center; cursor: pointer;
  font: 400 17px/1.4 Inter, system-ui, sans-serif; opacity: 0; pointer-events: none; transition: opacity 0.35s, transform 0.35s, bottom 0.6s; box-shadow: 0 6px 24px rgba(0,0,0,0.35); z-index: 5; }
.ln-cap.show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
body.idle .ln-cap { bottom: 46px; }
body.idle .ln-cap.show { cursor: none; }
.ln-cap .ln-kind { display: block; font: 600 10.5px/1 Inter, system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; }
.ln-cap .ln-more { margin-left: 8px; opacity: 0.55; font-weight: 600; }
.ln-i { display: inline-block; width: 13px; height: 13px; margin-right: 4px; border: 1.3px solid currentColor; border-radius: 50%; font: italic 700 9px/13px Georgia, serif; text-align: center; vertical-align: -2px; box-sizing: content-box; }
.ln-cap b { font-weight: 600; }
.ln-it { position: absolute; color: var(--l); pointer-events: none; opacity: 0; z-index: 5; isolation: isolate;
  text-shadow: 0 1px 2px var(--glow), 0 0 22px var(--glow); will-change: opacity, filter; }
.ln-it.bl, .ln-it.tl { left: 6vw; max-width: min(46vw, 820px); text-align: left; }
.ln-it.br, .ln-it.tr { right: 6vw; max-width: min(46vw, 820px); text-align: right; }
.ln-it.bl, .ln-it.br, .ln-it.bc { bottom: 21%; }
.ln-it.tl, .ln-it.tr { top: 15%; }
.ln-it.bc { left: 50%; transform: translateX(-50%); width: min(88vw, 1100px); text-align: center; }
/* a soft pool behind the words, so they read over a white dress or a lit keyboard */
.ln-it::before { content: ''; position: absolute; inset: -1.6em -2.4em; z-index: -1; border-radius: 3em; background: var(--scrim); filter: blur(28px); pointer-events: none; }
.ln-it.bl::before, .ln-it.tl::before { left: -12vw; }
.ln-it.br::before, .ln-it.tr::before { right: -12vw; }
.ln-it.live { pointer-events: auto; cursor: pointer; }
body.idle .ln-it.live { cursor: none; }
.ln-it .k { display: block; color: var(--k); text-transform: uppercase; }
.ln-it .r { display: block; width: 40px; height: 1px; margin: 0.9em 0 0.75em; background: var(--r); }
.ln-it.br .r, .ln-it.tr .r { margin-left: auto; }
.ln-it.bc .r { margin-left: auto; margin-right: auto; }
.ln-it .l { display: block; max-width: 24em; line-height: 1.28; text-wrap: balance; }
.ln-it.br .l, .ln-it.tr .l { margin-left: auto; }
.ln-it.bc .l { margin: 0 auto; }
.ln-it .s { display: block; margin-top: 0.55em; color: var(--s); text-wrap: balance; }
/* (letter-spacing pads the right of each letter: right-aligned headings would sit in from the edge) */
.ln-it.br .k, .ln-it.tr .k { margin-right: -0.3em; }
.ln-strip { position: relative; height: 12px; margin: 0 0 3px; display: none; }
.ln-strip.on { display: block; }
.ln-seg { position: absolute; top: 4px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.18); cursor: pointer; transition: background 0.2s, top 0.15s, height 0.15s; }
.ln-seg:hover { background: rgba(255,255,255,0.45); top: 3px; height: 6px; }
.ln-seg.cur { background: rgba(243,165,58,0.75); }
.ln-dot { position: absolute; top: 0; width: 2px; height: 3px; margin-left: -1px; border-radius: 1px; opacity: 0.85; pointer-events: none; }
.ln-tip { position: fixed; z-index: 40; transform: translate(-50%, -100%); padding: 5px 9px; border-radius: 7px; background: rgba(24,24,24,0.94); color: #eee; font: 500 11.5px/1.3 system-ui, sans-serif; white-space: nowrap; pointer-events: none; display: none; }
.ln-tip small { color: #999; margin-left: 6px; }
.ln-sub { text-align: center; margin: -3px 0 6px; font: 500 11px/1.3 system-ui, sans-serif; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 14px; }
.ln-sub button { background: none; border: 1px solid rgba(255,255,255,0.3); color: #f3d6a8; border-radius: 9px; padding: 1px 8px; margin-left: 8px; font: 600 10.5px/1.3 system-ui, sans-serif; cursor: pointer; }
.ln-sub button:hover { background: rgba(255,255,255,0.1); }
.ln-panel { position: absolute; top: 56px; right: 12px; bottom: 140px; width: min(400px, calc(100vw - 24px)); overflow: auto; z-index: 25; display: none;
  background: rgba(22, 22, 22, 0.95); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); color: #e6e3dc; font: 400 13.5px/1.55 Inter, system-ui, sans-serif; }
.ln-panel.open { display: block; }
body.hideui .ln-panel, body.hideui .ln-tip { display: none !important; }
.ln-panel header { position: sticky; top: 0; padding: 14px 44px 10px 18px; background: rgba(22,22,22,0.98); border-bottom: 1px solid rgba(255,255,255,0.07); z-index: 1; }
.ln-panel h2 { margin: 0; font: 600 16px/1.3 Inter, system-ui, sans-serif; color: #fff; }
.ln-panel header .by { color: #bdb6a8; font-size: 12.5px; margin-top: 2px; }
.ln-panel .x { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 0; border-radius: 50%; background: rgba(255,255,255,0.08); color: #ddd; font-size: 16px; cursor: pointer; }
.ln-panel .tabs { display: flex; gap: 4px; margin-top: 10px; }
.ln-panel .tabs button { border: 0; background: none; color: #aaa; font: 600 11.5px/1 system-ui, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; padding: 6px 9px; border-radius: 8px; cursor: pointer; }
.ln-panel .tabs button.on { background: rgba(255,255,255,0.1); color: #fff; }
.ln-panel .body { padding: 6px 18px 18px; }
.ln-panel p { margin: 8px 0; }
.ln-panel h3 { margin: 16px 0 4px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: #8f8a80; }
.ln-panel .src { font-size: 11.5px; color: #8f8a80; margin-top: 4px; }
.ln-panel a, .ln-panel .card-ln { color: #f3c98a; text-decoration: none; border-bottom: 1px dotted rgba(243,201,138,0.6); cursor: pointer; }
.ln-panel .row { display: flex; gap: 10px; padding: 8px 8px; margin: 0 -8px; border-radius: 8px; cursor: pointer; }
.ln-panel .row:hover { background: rgba(255,255,255,0.05); }
.ln-panel .row.cur { background: rgba(243,165,58,0.12); }
.ln-panel .row .t { flex: none; width: 44px; color: #8f8a80; font: 500 11.5px/1.9 ui-monospace, Menlo, monospace; }
.ln-panel .row .k { font: 600 9.5px/1 system-ui, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin: 3px 0 3px; }
.ln-panel .row .more { display: none; }
.ln-panel .row.open .more { display: block; }
.ln-panel .now { padding: 10px 12px; margin: 10px 0 4px; border-radius: 10px; background: rgba(255,255,255,0.05); }
.ln-panel .now .k { font: 600 10px/1 system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; }
.ln-panel .now .cap { font-weight: 600; color: #fff; margin: 6px 0 2px; }
.ln-panel .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.ln-panel .chips span { padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,0.07); cursor: pointer; font-size: 12.5px; }
.ln-panel .chips span:hover { background: rgba(255,255,255,0.14); }
.ln-panel .chips small { color: #8f8a80; margin-left: 5px; }
.ln-panel .back { border: 0; background: none; color: #aaa; cursor: pointer; padding: 10px 0 0; font: 600 12px system-ui, sans-serif; }
.ln-panel .tools { display: flex; gap: 8px; margin-top: 16px; }
.ln-panel .tools button { flex: 1; padding: 7px; border-radius: 8px; border: 0; background: #3a3a3a; color: #eee; font: 600 12px system-ui, sans-serif; cursor: pointer; }
.ln-panel .warn { color: #d9a36b; font-size: 11.5px; }
.ln-peek { position: fixed; z-index: 40; width: 280px; padding: 12px 14px; border-radius: 12px; background: rgba(28,28,28,0.97); box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  color: #ddd; font: 400 12.5px/1.5 Inter, system-ui, sans-serif; pointer-events: none; opacity: 0; transition: opacity 0.15s; }
.ln-peek.show { opacity: 1; }
.ln-peek b { display: block; color: #fff; font-size: 13.5px; font-weight: 600; }
.ln-peek .by { color: #bdb6a8; margin-bottom: 6px; display: block; }
.ln-peek .n { color: #8f8a80; font-size: 11.5px; margin-top: 6px; display: block; }
.item .ln-has { margin-left: 8px; color: #f3c98a; opacity: 0.8; line-height: 1; }
@media (max-width: 640px) { .ln-cap { font-size: 14.5px; bottom: 150px; } .ln-panel { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 72vh; border-radius: 16px 16px 0 0; } }
`

const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const barOf = a => a?.bar ? `m${a.bar}` : ''
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
const escAttr = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/**
 * @param o.seek     the seek <input type=range> (the section strip goes above it)
 * @param o.title    the song-title element (the "now" line goes under it)
 * @param o.onSeek   (seconds) => void
 * @param o.host     where the caption and panel go (default document.body)
 * @param o.download (filename, text) => void, for the panel's .vtt button
 */
export function createLinerOverlay({ seek, title, onSeek, host = document.body, download, autoPosition = () => 'bottom-left' }) {
	if (!document.getElementById('ln-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'ln-css', textContent: CSS }))
	injectFaces()
	const it = el('div', 'ln-it bl'), cap = el('div', 'ln-cap'), strip = el('div', 'ln-strip'), tip = el('div', 'ln-tip'), sub = el('div', 'ln-sub'), panel = el('div', 'ln-panel'), peek = el('div', 'ln-peek')
	host.append(it, cap, panel, tip, peek)
	seek.parentNode.insertBefore(strip, seek)
	title.after(sub)

	let liner = null, tl = null, itl = null, songTitle = null, duration = 0, mode = 'intertitles', style = 'serif', theme = 'mono', position = 'auto', kickers = true, curIt = null, curPos = 'bottom-left', curM = null, curS = null, capTimer = 0, tab = 'now', cardView = null, lastT = 0
	const cardLink = (id, text) => liner?.cards?.[id] ? `<span class="card-ln" data-card="${id}">${text}</span>` : text
	const md = s => renderInline(s, cardLink)

	// ── caption ──
	function showCaption(m) {
		clearTimeout(capTimer)
		cap.classList.remove('show')
		if (!m || mode !== 'notes') return
		capTimer = setTimeout(() => {
			cap.innerHTML = `<span class="ln-kind" style="color:${KIND_COLORS[m.kind]}">${KIND_LABEL[m.kind]} · ${barOf(m.at) || mmss(m.start)}</span>${renderInline(m.caption)}${m.detail.length || m.source ? '<span class="ln-more">›</span>' : ''}`
			cap.classList.add('show')
		}, cap.innerHTML ? 260 : 0)
	}
	cap.onclick = () => { if (curM) open('now') }

	// ── intertitle ──
	function styleIntertitle() {
		const st = INTERTITLE_STYLES[style] || INTERTITLE_STYLES.serif, th = INTERTITLE_THEMES[theme] || INTERTITLE_THEMES.mono
		for (const k of ['k', 'l', 's', 'r', 'scrim', 'glow']) it.style.setProperty('--' + k, th[k])
		const big = curIt?.title ? 1.3 : 1
		const vh = s => `clamp(${Math.round(s * 0.5)}px, ${(s / 10.8).toFixed(2)}vh, ${s}px)`
		const set = (sel, f, size, upper) => { const e = it.querySelector(sel); if (e) Object.assign(e.style, { font: `${f[2]} ${f[1]} ${vh(size)} ${fam(f)}`, letterSpacing: f[3] + 'em', textTransform: upper ? 'uppercase' : 'none' }) }
		set('.k', st.kicker, st.size * 0.42, true)
		set('.l', st.line, st.size * big, st.upper)
		set('.s', st.sub, st.size * 0.52)
	}
	function showIntertitle(x) {
		if (!x) { it.innerHTML = ''; it.style.opacity = 0; return }
		// (where it goes is decided once, as it appears, so it never jumps)
		curPos = position === 'auto' ? autoPosition() || 'bottom-left' : position
		it.className = 'ln-it ' + posClass(curPos) + (x.title ? ' title' : '')
		const k = x.kicker && (kickers || x.title)
		it.innerHTML = (k ? `<span class="k">${renderInline(x.kicker)}</span><span class="r"></span>` : '') + `<span class="l">${renderInline(x.text)}</span>` + (x.sub ? `<span class="s">${renderInline(x.sub)}</span>` : '')
		styleIntertitle()
	}
	function fadeIntertitle(t) {
		const a = curIt && (mode === 'intertitles' || curIt.title) && mode !== 'off' ? itAlpha(curIt, t) : 0
		it.style.opacity = a.toFixed(3)
		it.style.filter = a > 0.995 ? '' : `blur(${((1 - a) * 5).toFixed(2)}px)`
		const k = it.querySelector('.k')
		if (k) k.style.letterSpacing = ((INTERTITLE_STYLES[style] || INTERTITLE_STYLES.serif).kicker[3] + (1 - a) * 0.12).toFixed(3) + 'em'
		it.classList.toggle('live', a > 0.5)
	}
	const rebuildScreen = () => { itl = songTitle ? withTitle(tl, songTitle) : tl; curIt = null; showIntertitle(null) }
	it.onclick = () => { if (curIt && liner) curIt.moment != null ? open('notes', curIt.moment) : open(curIt.title ? 'about' : 'now') }

	// ── seek strip ──
	function buildStrip() {
		strip.innerHTML = ''
		strip.classList.toggle('on', !!tl?.sections.length)
		if (!tl || !duration) return
		for (const [i, s] of tl.sections.entries()) {
			const seg = el('div', 'ln-seg')
			seg.style.left = `calc(${s.start / duration * 100}% + 1px)`
			seg.style.width = `calc(${(s.end - s.start) / duration * 100}% - 2px)`
			seg.dataset.i = i
			seg.onclick = () => onSeek(s.start)
			seg.onpointerenter = ev => { tip.innerHTML = `${md(s.title)}<small>${barOf(s.at)} · ${mmss(s.start)}</small>`; tip.style.display = 'block'; placeTip(ev) }
			seg.onpointermove = placeTip
			seg.onpointerleave = () => { tip.style.display = 'none' }
			strip.append(seg)
		}
		for (const m of tl.moments) {
			const d = el('div', 'ln-dot')
			d.style.left = (m.start / duration * 100) + '%'
			d.style.background = KIND_COLORS[m.kind]
			strip.append(d)
		}
	}
	const placeTip = ev => { const r = strip.getBoundingClientRect(); tip.style.left = ev.clientX + 'px'; tip.style.top = (r.top - 6) + 'px' }

	function showSub() {
		if (!liner) { sub.innerHTML = ''; return }
		const s = curS ? `${md(curS.title)} · ${barOf(curS.at)}` : escAttr(liner.meta.composer || '')
		sub.innerHTML = `${s}<button title="Notes about this piece (I)"><span class="ln-i">i</span>Notes</button>`
		sub.querySelector('button').onclick = ev => { ev.stopPropagation(); toggle() }
	}

	// ── panel ──
	function header() {
		const m = liner.meta
		const life = m.born ? ` (${m.born}–${m.died || ''})` : ''
		const facts = [m.collection, m.year && `composed ${m.year}`, m.key, m.meter].filter(Boolean).map(escAttr).join(' · ')
		return `<header><button class="x" title="Close (I)">×</button><h2>${escAttr(m.title || liner.id)}</h2><div class="by">${escAttr(m.composer || '')}${life}</div><div class="by">${facts}</div>
			<div class="tabs">${[['now', 'Now'], ['about', 'About'], ['notes', 'All notes'], ['cards', 'People & terms']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div></header>`
	}
	const detailHTML = m => m.detail.map(p => `<p>${md(p)}</p>`).join('') + (m.source ? `<div class="src">Source: ${md(m.source)}</div>` : '')
	function bodyNow() {
		const s = curS, m = curM || tl.moments.findLast(x => x.start <= lastT)
		let h = ''
		if (s) h += `<h3>Section · ${barOf(s.at)}${(() => { const n = tl.sections[tl.sections.indexOf(s) + 1]?.at?.bar; return n && s.at?.bar && n - 1 > s.at.bar ? '–' + (n - 1) : '' })()}</h3><p><b>${md(s.title)}</b>${s.text ? ' — ' + md(s.text) : ''}</p>`
		if (m) h += `<div class="now"><span class="k" style="color:${KIND_COLORS[m.kind]}">${KIND_LABEL[m.kind]} · ${barOf(m.at) || mmss(m.start)}</span><div class="cap">${md(m.caption)}</div>${detailHTML(m)}</div>`
		const ids = new Set(); for (const x of [s?.text, m?.caption, ...(m?.detail || [])]) for (const k of String(x || '').matchAll(/\[\[([\w-]+)/g)) ids.add(k[1])
		if (ids.size) h += `<h3>In this moment</h3>` + chips([...ids])
		if (!h) h = `<p>${md(liner.overview[0] || '')}</p>`
		return h
	}
	const chips = ids => `<div class="chips">${ids.map(id => liner.cards[id]).filter(Boolean).map(c => `<span data-card="${c.id}">${escAttr(c.title)}<small>${escAttr(c.kind)}</small></span>`).join('')}</div>`
	function bodyAbout() {
		let h = liner.overview.map(p => `<p>${md(p)}</p>`).join('')
		h += `<h3>Sections</h3>` + tl.sections.map((s, i) => `<div class="row${s === curS ? ' cur' : ''}" data-seek="${s.start}"><span class="t">${mmss(s.start)}</span><div><b>${md(s.title)}</b> <span style="color:#8f8a80">${barOf(s.at)}</span><div>${md(s.text || '')}</div></div></div>`).join('')
		if (itl?.intertitles.length) h += `<h3>On screen</h3>` + itl.intertitles.map(x => `<div class="row" data-seek="${x.start}"><span class="t">${mmss(x.start)}</span><div>${x.kicker ? `<span class="k" style="color:#a9a49a">${md(x.kicker)}</span>` : ''}${md(x.text)}</div></div>`).join('')
		h += `<div class="tools"><button data-act="chapters">Copy YouTube chapters</button><button data-act="vtt">Download .vtt</button></div>`
		if (tl.warnings.length) h += `<p class="warn">${tl.warnings.map(escAttr).join('<br>')}</p>`
		return h
	}
	let focusM = null
	function bodyNotes() {
		const onScreen = new Set(tl.intertitles.map(x => x.moment))
		return tl.moments.map((m, i) => `<div class="row${m === curM ? ' cur' : ''}${m === curM || i === focusM ? ' open' : ''}" data-m="${i}"><span class="t">${mmss(m.start)}</span><div><span class="k" style="color:${KIND_COLORS[m.kind]}">${KIND_LABEL[m.kind]} · ${barOf(m.at)}${onScreen.has(i) ? ' <span style="color:#8f8a80">· on screen</span>' : ''}</span>${md(m.caption)}<div class="more">${detailHTML(m)}<p><span class="card-ln" data-seek="${m.start}">▶ Play from here</span></p></div></div></div>`).join('')
	}
	function bodyCard(c) {
		return `<button class="back">‹ Back</button><h3>${escAttr(c.kind)}</h3><p style="font-size:16px;color:#fff;margin:4px 0 0"><b>${escAttr(c.title)}</b></p>${c.subtitle ? `<div class="by" style="color:#bdb6a8">${escAttr(c.subtitle)}</div>` : ''}${c.body.map(p => `<p>${md(p)}</p>`).join('')}${c.source ? `<div class="src">Source: ${md(c.source)}</div>` : ''}`
	}
	function render() {
		if (!liner || !panel.classList.contains('open')) return
		const scroll = panel.scrollTop
		const b = cardView ? bodyCard(cardView) : tab === 'now' ? bodyNow() : tab === 'about' ? bodyAbout() : tab === 'notes' ? bodyNotes() : chips(Object.keys(liner.cards)) + Object.values(liner.cards).map(c => `<p><span class="card-ln" data-card="${c.id}">${escAttr(c.title)}</span> — ${md(c.body[0] || '')}</p>`).join('')
		panel.innerHTML = header() + `<div class="body">${b}</div>`
		panel.scrollTop = tab === 'now' ? 0 : scroll
		if (focusM != null && tab === 'notes') { panel.querySelector(`[data-m="${focusM}"]`)?.scrollIntoView({ block: 'center' }); focusM = null }
	}
	panel.onclick = ev => {
		const t = ev.target.closest('[data-tab], [data-card], [data-seek], [data-m], [data-act], .x, .back')
		if (!t) return
		if (t.classList.contains('x')) return close()
		if (t.classList.contains('back')) { cardView = null; return render() }
		if (t.dataset.tab) { tab = t.dataset.tab; cardView = null; panel.scrollTop = 0; return render() }
		if (t.dataset.card) { cardView = liner.cards[t.dataset.card]; panel.scrollTop = 0; return render() }
		if (t.dataset.seek) return onSeek(+t.dataset.seek)
		if (t.dataset.m) { t.classList.toggle('open'); return }
		if (t.dataset.act === 'chapters') { navigator.clipboard?.writeText(toChapters(tl)); t.textContent = 'Copied'; setTimeout(() => { t.textContent = 'Copy YouTube chapters' }, 1500) }
		if (t.dataset.act === 'vtt') download?.(`${liner.id}.vtt`, toVTT(mode === 'notes' ? tl : itl, { from: mode === 'notes' ? 'moments' : 'intertitles' }))
	}
	const open = (t = tab, m = null) => { if (!liner) return; tab = t; cardView = null; focusM = m; panel.classList.add('open'); render() }
	const close = () => panel.classList.remove('open')
	const toggle = () => panel.classList.contains('open') ? close() : open()

	addEventListener('keydown', ev => {
		if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return
		if (ev.key === 'i' || ev.key === 'I') { if (liner) toggle() }
		else if (ev.key === 'Escape' && panel.classList.contains('open')) { close(); ev.stopImmediatePropagation() }
	}, true)

	// ── menu peek ──
	function attachMenu(list, lib) {
		const mark = () => { for (const it of list.querySelectorAll('.item[data-file]')) if (lib.idOf(it.dataset.file) && !it.querySelector('.ln-has')) it.insertBefore(el('span', 'ln-has', '<span class="ln-i">i</span>'), it.querySelector('.dot')) }
		lib.ready.then(mark)
		let hoverFile = null
		list.addEventListener('pointerover', async ev => {
			if (ev.pointerType === 'touch') return
			const it = ev.target.closest('.item[data-file]')
			if (!it || it.dataset.file === hoverFile) return
			hoverFile = it.dataset.file
			peek.classList.remove('show')
			if (!lib.idOf(hoverFile)) return
			const l = await lib.forFile(hoverFile)
			if (!l || hoverFile !== it.dataset.file) return
			const m = l.meta
			peek.innerHTML = `<b>${escAttr(m.title || '')}</b><span class="by">${escAttr(m.composer || '')}${m.year ? ' · ' + escAttr(m.year) : ''}</span>${renderInline(l.overview[0] || '')}<span class="n">${l.sections.length} sections · ${l.moments.length} notes · press I while it plays</span>`
			const r = it.getBoundingClientRect(), pr = list.closest('.pop')?.getBoundingClientRect() || r
			const left = pr.right + 8 + 280 < innerWidth ? pr.right + 8 : Math.max(8, pr.left - 288)
			peek.style.left = left + 'px'
			peek.style.top = Math.min(innerHeight - peek.offsetHeight - 8, Math.max(8, r.top - 8)) + 'px'
			peek.classList.add('show')
		})
		list.addEventListener('pointerleave', () => { hoverFile = null; peek.classList.remove('show') })
		return { refresh: mark }
	}

	return {
		/** show a piece's notes on its timeline (or null to clear) */
		set(l, timeline, dur) {
			liner = l; tl = l ? timeline : null; duration = dur || 0; curM = curS = null; lastT = 0; cardView = null
			cap.innerHTML = ''; showCaption(null); rebuildScreen(); buildStrip(); showSub()
			if (!l) close(); else render()
			if (tl?.warnings.length) console.warn('[liner]', l.id, tl.warnings)
		},
		/** call every frame (or on every clock tick) with the song time */
		update(t) {
			lastT = t
			const x = intertitleAt(itl, t)
			if (x !== curIt) { curIt = x; showIntertitle(x) }
			fadeIntertitle(t)
			if (!tl) return
			const m = momentAt(tl, t), s = sectionAt(tl, t)
			if (m !== curM) { curM = m; showCaption(m); if (tab === 'now' && !cardView) render(); else if (tab === 'notes') render() }
			if (s !== curS) {
				curS = s; showSub()
				for (const seg of strip.children) if (seg.dataset.i != null) seg.classList.toggle('cur', tl.sections[+seg.dataset.i] === s)
				if (tab === 'about') render()
			}
		},
		/** what shows on screen as it plays: 'intertitles' (the few marked lines), 'notes' (every note as a caption) or 'off' */
		get mode() { return mode },
		set mode(v) { mode = ['intertitles', 'notes', 'off'].includes(v) ? v : 'intertitles'; showCaption(curM); fadeIntertitle(lastT) },
		/** where intertitles sit: a key of INTERTITLE_POSITIONS ('auto' asks autoPosition() as each appears) */
		get position() { return position },
		set position(v) { position = INTERTITLE_POSITIONS[v] ? v : 'auto'; const x = curIt; curIt = null; showIntertitle(x); curIt = x; fadeIntertitle(lastT) },
		get theme() { return theme },
		set theme(v) { theme = INTERTITLE_THEMES[v] ? v : 'mono'; styleIntertitle() },
		/** show the small headings (kickers) over the lines (the title keeps its own) */
		get kickers() { return kickers },
		set kickers(v) { kickers = !!v; const x = curIt; curIt = null; showIntertitle(x); curIt = x; fadeIntertitle(lastT) },
		/** the song title as the first intertitle ({ kicker, text, sub }), or null */
		setTitle(x) { songTitle = x?.text ? x : null; rebuildScreen() },
		/** the intertitles as they show, the title included (for the export) */
		get screenTimeline() { return itl },
		get style() { return style },
		set style(v) { style = INTERTITLE_STYLES[v] ? v : 'serif'; loadIntertitleFonts(style); styleIntertitle() },
		get timeline() { return tl },
		get liner() { return liner },
		open, close, toggle, attachMenu,
	}
}

// ── Burned-in captions for video export ────────────────────────────────

// wrapped to the fewest lines, then as even as they go (no one-word last line), as text-wrap: balance
function balanced(g, text, maxW) {
	const n = wrap(g, text, maxW).length
	if (n < 2) return wrap(g, text, maxW)
	let lo = maxW / n, hi = maxW
	for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(g, text, mid).length > n) lo = mid; else hi = mid }
	return wrap(g, text, hi)
}

function wrap(g, text, maxW) {
	const lines = []
	let line = ''
	for (const w of text.split(/\s+/)) {
		const next = line ? line + ' ' + w : w
		if (g.measureText(next).width > maxW && line) { lines.push(line); line = w } else line = next
	}
	if (line) lines.push(line)
	return lines
}

/**
 * Draw the caption for song time `t` into a 2D canvas of w × h (a frame of
 * the exported video). Fades in and out over `fade` seconds.
 */
export function drawLinerCaption(g, w, h, tl, t, { fade = 0.4, font = 'Inter, system-ui, sans-serif', bottom = 0.085 } = {}) {
	const m = momentAt(tl, t)
	if (!m) return
	const a = Math.max(0, Math.min(1, (t - m.start) / fade, (m.end - t) / fade))
	if (a <= 0) return
	const k = h / 1080, size = Math.round(34 * k), kindSize = Math.round(19 * k), lh = size * 1.32, pad = 26 * k
	g.save()
	g.globalAlpha = a
	g.font = `400 ${size}px ${font}`
	const lines = wrap(g, plainText(m.caption), w * 0.62)
	const boxW = Math.max(...lines.map(l => g.measureText(l).width)) + pad * 2
	const boxH = kindSize + 10 * k + lines.length * lh + pad * 1.4
	const x = (w - boxW) / 2, y = h * (1 - bottom) - boxH + (1 - a) * 10 * k
	g.fillStyle = 'rgba(16, 16, 16, 0.62)'
	g.beginPath(); g.roundRect ? g.roundRect(x, y, boxW, boxH, 18 * k) : g.rect(x, y, boxW, boxH); g.fill()
	g.textAlign = left ? 'left' : 'center'; g.textBaseline = 'top'
	g.font = `600 ${kindSize}px ${font}`
	g.fillStyle = KIND_COLORS[m.kind]
	const label = `${KIND_LABEL[m.kind]} · ${barOf(m.at) || mmss(m.start)}`.toUpperCase()
	if ('letterSpacing' in g) g.letterSpacing = `${2.2 * k}px`
	g.fillText(label, w / 2, y + pad * 0.7)
	if ('letterSpacing' in g) g.letterSpacing = '0px'
	g.font = `400 ${size}px ${font}`
	g.fillStyle = '#f4f1ea'
	lines.forEach((l, i) => g.fillText(l, w / 2, y + pad * 0.7 + kindSize + 10 * k + i * lh))
	g.restore()
}

/**
 * Draw the intertitle for song time `t` into a 2D canvas of w × h (a frame of
 * the exported video): the same layout, fonts, colours and fades as on the
 * page. `position` is one of INTERTITLE_POSITIONS but 'auto' (decide it per
 * intertitle and pass it in). Call loadIntertitleFonts(style) first.
 */
export function drawIntertitle(g, w, h, tl, t, { style = 'serif', theme = 'mono', position = 'bottom-left', kickers = true } = {}) {
	const x = intertitleAt(tl, t)
	if (!x) return
	const a = itAlpha(x, t)
	if (a <= 0) return
	const st = INTERTITLE_STYLES[style] || INTERTITLE_STYLES.serif, th = INTERTITLE_THEMES[theme] || INTERTITLE_THEMES.mono, k = h / 1080
	const pc = posClass(typeof position === 'function' ? position(x) : position)
	const side = pc[1] === 'l' ? 'left' : pc[1] === 'r' ? 'right' : 'center', top = pc[0] === 't'
	const lineSize = st.size * k * (x.title ? 1.3 : 1), kickSize = st.size * 0.42 * k, subSize = st.size * 0.52 * k
	const track = (f, size, extra = 0) => { if ('letterSpacing' in g) g.letterSpacing = `${((f[3] + extra) * size).toFixed(2)}px` }
	const maxW = Math.min(side === 'center' ? w * 0.8 : Math.min(w * 0.46, 820 * k), lineSize * 24)
	g.save()
	g.font = cssFont(st.line, lineSize); track(st.line, lineSize)
	const text = plainText(x.text), lines = balanced(g, st.upper ? text.toUpperCase() : text, maxW)
	const lineW = Math.max(...lines.map(l => g.measureText(l).width))
	let subLines = [], subW = 0
	if (x.sub) { g.font = cssFont(st.sub, subSize); track(st.sub, subSize); subLines = balanced(g, plainText(x.sub), maxW); subW = Math.max(...subLines.map(l => g.measureText(l).width)) }
	const kick = x.kicker && (kickers || x.title)
	const lh = lineSize * 1.28, kickH = kick ? kickSize + kickSize * 0.9 * 2 + 1 : 0, subH = subLines.length ? subSize * 0.55 + subLines.length * subSize * 1.3 : 0
	const blockH = kickH + lines.length * lh + subH
	const textW = Math.max(lineW, subW)
	const y0 = top ? h * 0.15 : h * (1 - 0.21) - blockH
	const ax = side === 'left' ? w * 0.06 : side === 'right' ? w * 0.94 : w / 2
	// the pool behind the words (as the page's ::before), out to the edge on a side
	g.globalAlpha = a
	g.save()
	const pad = lineSize * 0.8, blur = 28 * k
	if ('filter' in g) g.filter = `blur(${blur}px)`
	g.fillStyle = th.scrim
	const bx = side === 'left' ? -blur * 2 : side === 'right' ? ax - textW - pad * 1.5 : ax - textW / 2 - pad * 1.5
	const bw = side === 'left' ? ax + textW + pad * 1.5 + blur * 2 : side === 'right' ? w - bx + blur * 2 : textW + pad * 3
	g.beginPath(); g.roundRect ? g.roundRect(bx, y0 - pad, bw, blockH + pad * 2, pad * 1.5) : g.rect(bx, y0 - pad, bw, blockH + pad * 2); g.fill()
	g.restore()
	if (a < 0.995 && 'filter' in g) g.filter = `blur(${((1 - a) * 5 * k).toFixed(2)}px)`
	g.textAlign = side; g.textBaseline = 'top'
	g.shadowColor = th.glow; g.shadowBlur = 24 * k
	let y = y0
	if (kick) {
		g.font = cssFont(st.kicker, kickSize); track(st.kicker, kickSize, (1 - a) * 0.12)
		g.fillStyle = th.k
		// (letter-spacing pads the right of every letter: pull right-aligned capitals back by one)
		g.fillText(plainText(x.kicker).toUpperCase(), side === 'right' ? ax + (st.kicker[3] + (1 - a) * 0.12) * kickSize : ax, y)
		y += kickSize + kickSize * 0.9
		g.fillStyle = th.r; g.shadowBlur = 0
		g.fillRect(side === 'left' ? ax : side === 'right' ? ax - 40 * k : ax - 20 * k, y, 40 * k, Math.max(1, k))
		y += kickSize * 0.9 + 1
		g.shadowBlur = 24 * k
	}
	g.font = cssFont(st.line, lineSize); track(st.line, lineSize)
	g.fillStyle = th.l
	lines.forEach((l, i) => g.fillText(l, ax, y + i * lh))
	y += lines.length * lh
	if (subLines.length) {
		y += subSize * 0.55
		g.font = cssFont(st.sub, subSize); track(st.sub, subSize)
		g.fillStyle = th.s
		subLines.forEach((l, i) => g.fillText(l, ax, y + i * subSize * 1.3))
	}
	g.restore()
}
