// Liner notes on the page: captions that follow the music, a notes panel
// (X-Ray style: what is happening now, the sections, every note, the people
// and terms), section marks on the seek bar, and a peek card when hovering a
// song in a menu. Also draws a caption into an exported video frame.
// The notes themselves: liner/liner.js and liner/README.md.

import { renderInline, plainText, sectionAt, momentAt, toVTT, toChapters } from './liner.js'

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
export function createLinerOverlay({ seek, title, onSeek, host = document.body, download }) {
	if (!document.getElementById('ln-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'ln-css', textContent: CSS }))
	const cap = el('div', 'ln-cap'), strip = el('div', 'ln-strip'), tip = el('div', 'ln-tip'), sub = el('div', 'ln-sub'), panel = el('div', 'ln-panel'), peek = el('div', 'ln-peek')
	host.append(cap, panel, tip, peek)
	seek.parentNode.insertBefore(strip, seek)
	title.after(sub)

	let liner = null, tl = null, duration = 0, captions = true, curM = null, curS = null, capTimer = 0, tab = 'now', cardView = null, lastT = 0
	const cardLink = (id, text) => liner?.cards?.[id] ? `<span class="card-ln" data-card="${id}">${text}</span>` : text
	const md = s => renderInline(s, cardLink)

	// ── caption ──
	function showCaption(m) {
		clearTimeout(capTimer)
		cap.classList.remove('show')
		if (!m || !captions) return
		capTimer = setTimeout(() => {
			cap.innerHTML = `<span class="ln-kind" style="color:${KIND_COLORS[m.kind]}">${KIND_LABEL[m.kind]} · ${barOf(m.at) || mmss(m.start)}</span>${renderInline(m.caption)}${m.detail.length || m.source ? '<span class="ln-more">›</span>' : ''}`
			cap.classList.add('show')
		}, cap.innerHTML ? 260 : 0)
	}
	cap.onclick = () => { if (curM) open('now') }

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
		h += `<div class="tools"><button data-act="chapters">Copy YouTube chapters</button><button data-act="vtt">Download .vtt</button></div>`
		if (tl.warnings.length) h += `<p class="warn">${tl.warnings.map(escAttr).join('<br>')}</p>`
		return h
	}
	function bodyNotes() {
		return tl.moments.map((m, i) => `<div class="row${m === curM ? ' cur open' : ''}" data-m="${i}"><span class="t">${mmss(m.start)}</span><div><span class="k" style="color:${KIND_COLORS[m.kind]}">${KIND_LABEL[m.kind]} · ${barOf(m.at)}</span>${md(m.caption)}<div class="more">${detailHTML(m)}<p><span class="card-ln" data-seek="${m.start}">▶ Play from here</span></p></div></div></div>`).join('')
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
		if (t.dataset.act === 'vtt') download?.(`${liner.id}.vtt`, toVTT(tl))
	}
	const open = (t = tab) => { if (!liner) return; tab = t; cardView = null; panel.classList.add('open'); render() }
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
			cap.innerHTML = ''; showCaption(null); buildStrip(); showSub()
			if (!l) close(); else render()
			if (tl?.warnings.length) console.warn('[liner]', l.id, tl.warnings)
		},
		/** call every frame (or on every clock tick) with the song time */
		update(t) {
			if (!tl) return
			lastT = t
			const m = momentAt(tl, t), s = sectionAt(tl, t)
			if (m !== curM) { curM = m; showCaption(m); if (tab === 'now' && !cardView) render(); else if (tab === 'notes') render() }
			if (s !== curS) {
				curS = s; showSub()
				for (const seg of strip.children) if (seg.dataset.i != null) seg.classList.toggle('cur', tl.sections[+seg.dataset.i] === s)
				if (tab === 'about') render()
			}
		},
		get captions() { return captions },
		set captions(v) { captions = !!v; showCaption(captions ? curM : null) },
		get timeline() { return tl },
		get liner() { return liner },
		open, close, toggle, attachMenu,
	}
}

// ── Burned-in captions for video export ────────────────────────────────

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
	g.textAlign = 'center'; g.textBaseline = 'top'
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
