// Approach 1 (#049): the score from a page scan. The song's manifest
// (sheet/scores/<song>.json) names the page image and keeps where its
// systems and bars are (sheet/tools/detect.mjs found them with scan.js); a
// manifest without them has the page read here, in the browser, as it loads.
//
//   const build = scanBuilder()       // for sheetPlugin({ build })

import { scanLayout, scanLayoutPages } from './layout.js'
import { detectPage, barsOf } from './scan.js'
import { timelineOfMidi, timelineOfMovements } from './timeline.js'
import { manifestFor } from './scores.js'

export function scanBuilder() {
  const pages = new Map()
  return async (song, midi, file) => {
    const m = await manifestFor(file)
    if (!m?.scan) return null
    if (m.scan.pages) return pagesBuild(m, midi)
    const url = m.base + m.scan.image
    if (!pages.has(url)) pages.set(url, (async () => { const im = new Image(); im.src = url; await im.decode(); return im })())
    const img = await pages.get(url)
    let det = m.scan.detected
    if (!det) det = detectIn(img)
    const layout = scanLayout(img, det, { header: m.scan.header, firstHeader: m.scan.firstHeader, scale: img.naturalWidth / det.width })
    const timeline = timelineOfMidi(midi, { meter: m.meter, form: m.form, played: m.played || m.bars })
    const n = layout.bars.size
    return { layout, timeline, inkFrom: 'luma', note: `${m.scan.edition.split(',')[0]}: ${det.systems.length} systems, ${n} bars${m.bars && n !== m.bars ? ` (the score has ${m.bars})` : ''}` }
  }
}

// a work of many pages (the complete Goldberg, sheet/tools/goldberg.mjs): each page's image
// loaded as a system on it first shows, with the page after it, and a few kept
function pagesBuild(m, midi) {
  const imgs = new Map(), KEEP = 6, pages = m.scan.pages
  function load(pi) {
    if (pi < 0 || pi >= pages.length) return null
    if (!imgs.has(pi)) {
      const im = new Image(), e = { im, ok: false }
      im.src = m.base + pages[pi].image
      im.decode().then(() => { e.ok = true }, () => {})
      imgs.set(pi, e)
      while (imgs.size > KEEP) imgs.delete(imgs.keys().next().value)
    }
    const e = imgs.get(pi)
    imgs.delete(pi); imgs.set(pi, e)
    return e.ok ? e.im : null
  }
  const decoded = pi => { load(pi); const e = imgs.get(pi); return e ? e.im.decode().catch(() => {}) : null }
  const pageOf = pi => { const im = load(pi); load(pi + 1); return im }
  const layout = scanLayoutPages(pages, m.movements, { pageOf, header: m.scan.header, firstHeader: m.scan.firstHeader })
  const timeline = timelineOfMovements(midi, m)
  // the pages the score shows at song time t, and the one after: loaded before a still, and as
  // a video starts
  const ready = t => {
    const at = timeline.at(Math.max(t, timeline.bars[0]?.t0 ?? 0)), e = at && layout.bars.get(at.bar)
    const pi = e ? layout.systems[e.system].pageIndex : 0
    return Promise.all([decoded(pi), decoded(pi + 1)])
  }
  const n = m.movements.length, bars = layout.bars.size
  return { layout, timeline, ready, inkFrom: 'luma', note: `${m.scan.edition.split(',')[0]}: ${n} movements, ${pages.length} pages, ${bars} bars${timeline.mismatch ? ` (the file plays ${timeline.mismatch.performed} movements of ${timeline.mismatch.form})` : ''}` }
}

function detectIn(img) {
  const c = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight }), g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const p = detectPage(g.getImageData(0, 0, c.width, c.height)), bars = barsOf(p)
  return { width: p.width, height: p.height, space: p.space, systems: p.systems.map((s, i) => ({ x0: s.x0, x1: s.x1, staves: s.staves.map(t => ({ top: t.top, bottom: t.bottom, x0: t.x0, x1: t.x1 })), bars: bars[i].map(b => [b.bar, b.x0, b.x1]) })) }
}
