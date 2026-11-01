// Approach 1 (#049): the score from a page scan. The song's manifest
// (sheet/scores/<song>.json) names the page image and keeps where its
// systems and bars are (sheet/tools/detect.mjs found them with scan.js); a
// manifest without them has the page read here, in the browser, as it loads.
//
//   const build = scanBuilder()       // for sheetPlugin({ build })

import { scanLayout } from './layout.js'
import { detectPage, barsOf } from './scan.js'
import { timelineOfMidi } from './timeline.js'
import { manifestFor } from './scores.js'

export function scanBuilder() {
  const pages = new Map()
  return async (song, midi, file) => {
    const m = await manifestFor(file)
    if (!m?.scan) return null
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

function detectIn(img) {
  const c = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight }), g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const p = detectPage(g.getImageData(0, 0, c.width, c.height)), bars = barsOf(p)
  return { width: p.width, height: p.height, space: p.space, systems: p.systems.map((s, i) => ({ x0: s.x0, x1: s.x1, staves: s.staves.map(t => ({ top: t.top, bottom: t.bottom, x0: t.x0, x1: t.x1 })), bars: bars[i].map(b => [b.bar, b.x0, b.x1]) })) }
}
