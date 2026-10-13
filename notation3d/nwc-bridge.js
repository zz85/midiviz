/**
 * nwc-bridge.js — Loads Joshua's nwc-viewer ("Notably") engraving engine and
 * runs it headlessly to produce a single-line (scroll layout) score.
 *
 * nwc-viewer is imported straight from its own checkout (default
 * `../nwc-viewer/`, override with `?nwc=<url>`), which resolves both locally
 * (serve the parent directory) and on GitHub Pages (zz85.github.io/midiviz and
 * zz85.github.io/nwc-viewer are siblings).
 */

export const NWC_BASE = new URL(
	new URLSearchParams(location.search).get('nwc') || '../nwc-viewer/',
	location.href
).href

let engine = null

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const s = document.createElement('script')
		s.src = src
		s.onload = resolve
		s.onerror = () => reject(new Error(`Failed to load ${src}`))
		document.head.appendChild(s)
	})
}

/**
 * nwc-viewer modules touch a few DOM ids at import / layout time (file
 * opener, #score container, spacer canvas, footer). Provide hidden stubs.
 */
function ensureDomStubs() {
	if (document.getElementById('nwc-stubs')) return
	const host = document.createElement('div')
	host.id = 'nwc-stubs'
	host.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:400px;overflow:hidden;visibility:hidden;pointer-events:none'
	host.innerHTML = `
		<input type="file" id="opener">
		<button id="open"></button>
		<div id="score" style="width:800px;height:400px;overflow:hidden"><canvas id="invisible_canvas"></canvas></div>
		<div id="footer"></div>`
	document.body.appendChild(host)
}

export async function loadNotationEngine() {
	if (engine) return engine
	ensureDomStubs()
	if (!window.opentype) await loadScript(NWC_BASE + 'vendor/opentype.min.js')
	if (!window.Zlib) await loadScript(NWC_BASE + 'vendor/inflate.min.js').catch(() => {})

	const src = p => import(NWC_BASE + 'src/' + p)
	const [constants, drawing, interp, typeset, context, audio, nwc, musicxml] = await Promise.all([
		src('constants.js'), src('drawing.js'), src('interpreter.js'), src('layout/typeset.js'),
		src('context.js'), src('audio.js'), src('nwc.js'), src('musicxml-import.js'),
	])

	constants.setLayoutMode('scroll')

	// Text glyphs (tempo marks etc.) use the BravuraText family
	try {
		const ff = new FontFace('BravuraText', `url(${NWC_BASE}vendor/bravura-1.211/otf/BravuraText.otf)`)
		document.fonts.add(await ff.load())
	} catch (e) { console.warn('BravuraText not loaded', e) }

	// Load the SMuFL music font through nwc-viewer's own loader
	await new Promise(resolve => {
		drawing.setup(resolve, NWC_BASE + 'vendor/bravura-1.211/otf/Bravura.otf', canvas => {
			document.getElementById('score').insertBefore(canvas, document.getElementById('invisible_canvas'))
		})
	})

	engine = { constants, drawing, interp, typeset, context, audio, nwc, musicxml, opentype: window.opentype }
	return engine
}

/**
 * Interpret + typeset a score. Returns the drawing elements (in insertion
 * order) and the staves (tokens now carry drawingNoteHead etc.).
 */
export function engrave(eng, data, { layout = 'scroll', pageWidth = 1000 } = {}) {
	// layout: 'scroll' = one endless line; 'wrap' = systems broken to pageWidth (score px)
	// like a long sheet; 'pages' = Letter pages laid side by side (nwc-viewer page mode)
	const C = eng.constants
	const mode = layout === 'pages' ? 'page' : layout === 'wrap' ? 'wrap' : 'scroll'
	C.setLayoutMode(mode)
	if (mode === 'page') { C.setPageSize?.('letter'); C.setPageOrientation?.('portrait'); C.setPageViewMode?.('horizontal') }
	const scoreEl = document.getElementById('score')
	// wrap mode reads the available width from the #score container (score px at zoom 1)
	const prevWidth = scoreEl.style.width
	const zoom = C.getZoomLevel?.() || 1
	if (mode === 'wrap') scoreEl.style.width = Math.round((pageWidth + C.getFontSize() * 1.5) * zoom) + 'px'
	window._pageGeometry = null
	try {
		const mc = new eng.context.MusicContext(data, window.canvas)
		if (data._source !== 'musescore' && data._source !== 'musicxml') eng.interp.interpret(mc)
		eng.typeset.score(mc)
	} finally {
		scoreEl.style.width = prevWidth
		C.setLayoutMode('scroll')
	}
	const elements = [...window.drawing.set]
	// staff rectangles (score px): one per staff per system in wrap/page mode
	const staveRects = mode === 'scroll' ? [] : elements
		.filter(e => e.constructor?.name === 'Stave')
		.map(e => ({ x: (e.x || 0) + (e.offsetX || 0), y: (e.y || 0) + (e.offsetY || 0), width: e.width, size: e.size }))
	const pg = mode === 'page' && window._pageGeometry
	const pages = pg ? pg.pagePositions.map(p => ({ x: p.x, y: p.y, width: pg.pageWidth, height: pg.pageHeight })) : null
	return { elements, staves: data.score.staves, fontSize: C.getFontSize(), layout: { mode: layout, staveRects, pages, pageWidth } }
}

/** Decode a non-MIDI notation file into nwc-viewer data. */
export async function decodeNotationFile(eng, buffer, filename) {
	if (eng.musicxml.isMusicXMLFile(buffer, filename)) return eng.musicxml.parseMusicXML(buffer, filename)
	return eng.nwc.decodeNwcArrayBuffer(buffer)
}
