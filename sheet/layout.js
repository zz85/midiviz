// A score as the overlay draws it: a page (an image, or a canvas the engraver
// drew), cut into systems, each system's bars with their x on the page, and,
// where the engraver says, each onset's note heads.
//
//   layout = {
//     page,                                   the image or canvas (or pageOf(system) → it, or null
//                                             while it loads, for a score of many pages)
//     systems: [{ x, y, w, h,                 the slice of the page, page px
//                 staffTop, staffBottom,       the top line of the first staff, the bottom line of the last
//                 bars: [3, 4, 5], space }],      (space: the staff space on its page)
//     bars: Map(bar → { system, x0, x1, start, end, onsets: [{ frac, x, heads: [{ x, y, r }] }] | null  (frac: the onset's place in the bar, 0..1) }),
//     space,                                   staff space, page px
//   }
//   place(layout, at) → { system, x, entry }   at: a timeline.at() answer
//
// scanLayout builds one from a page scan's detected systems (scan.js), as a
// manifest keeps them; engrave.js builds one from nwc-viewer's drawing.

/** x for a place in a bar: between its onsets where the layout has them, else in proportion to the time. */
export function place(layout, at) {
  const e = at && layout.bars.get(at.bar)
  if (!e) return null
  let x
  const o = e.onsets
  if (o && o.length) {
    // anchors: the bar's start, each onset, the bar's end
    const pts = [[0, Math.min(e.start, o[0].x)], ...o.map(n => [n.frac, n.x]), [1, e.end]]
    let k = 0
    while (k < pts.length - 2 && at.frac >= pts[k + 1][0]) k++
    const [ta, xa] = pts[k], [tb, xb] = pts[k + 1]
    x = xa + (xb - xa) * Math.max(0, Math.min(1, (at.frac - ta) / (tb - ta || 1)))
  } else x = e.start + (e.end - e.start) * at.frac
  return { system: e.system, x, entry: e }
}

/**
 * From a scan's detection (sheet/tools/detect.mjs → manifest.scan.detected) and
 * the score's facts: the bars it prints (`bars`, to check the count), and how
 * wide the opening of each system is (clef, key, and on the first one the time
 * signature), in staff spaces, so the cursor starts on the first note.
 */
export function scanLayout(page, det, { header = 5, firstHeader = 7.5, pad = 0.9, scale = 1 } = {}) {
  const sp = det.space * scale
  const systems = [], bars = new Map()
  det.systems.forEach((s, si) => {
    const sys = sliceOf(det, si, scale, page.height)
    s.bars.forEach(([bar, a, b], k) => {
      bars.set(bar, barEntry(si, a * scale, b * scale, (k === 0 ? (si === 0 ? firstHeader : header) : 0) * sp, pad * sp))
      sys.bars.push(bar)
    })
    systems.push(sys)
  })
  return { page, systems, bars, space: sp }
}

// a system's slice of its page: the staves with four spaces above and below for the notes above
// and below them, stopping halfway to the next system
function sliceOf(det, si, scale, height = Infinity) {
  const S = v => v * scale, sp = S(det.space), s = det.systems[si]
  const top = S(s.staves[0].top), bottom = S(s.staves[s.staves.length - 1].bottom)
  const prev = det.systems[si - 1], next = det.systems[si + 1]
  const y0 = Math.max(prev ? (S(prev.staves.at(-1).bottom) + top) / 2 : 0, top - 4.5 * sp)
  const y1 = Math.min(next ? (bottom + S(next.staves[0].top)) / 2 : height ?? Infinity, bottom + 4.5 * sp)
  const x0 = S(s.x0) - 1.6 * sp, x1 = S(s.x1) + 0.8 * sp
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, staffTop: top, staffBottom: bottom, bars: [], space: sp }
}
// (the cursor starts past the clef, the key and the time signature on a system's first bar)
const barEntry = (system, a, b, head, pad) => ({ system, x0: a, x1: b, start: Math.min(a + Math.max(head, pad), (a + b) / 2), end: b - pad, onsets: null })

/**
 * A score of many pages and movements, from a manifest of sheet/tools/goldberg.mjs:
 * `pages` [{ width, height, space, systems }] as scan.pages keeps them, and `movements`
 * [{ id, barAt: [[system, x0, x1]] }], the systems numbered through every page. A bar's key is
 * its place in the whole score (as createMovementTimeline numbers it). `pageOf(i)` gives page
 * i's image, or null while it loads (the overlay skips the system till then); `scales[i]`, the
 * image's width over the page's.
 */
export function scanLayoutPages(pages, movements, { pageOf, scales = [], header = 5, firstHeader = 7.5, pad = 0.9 } = {}) {
  const systems = []
  pages.forEach((p, pi) => p.systems.forEach((_, si) => systems.push({ ...sliceOf(p, si, scales[pi] ?? 1, p.height * (scales[pi] ?? 1)), pageIndex: pi })))
  const bars = new Map()
  let key = 0
  for (const m of movements) {
    m.barAt.forEach(([si, a, b], j) => {
      const s = systems[si], k = scales[s.pageIndex] ?? 1, first = j === 0 || m.barAt[j - 1][0] !== si
      bars.set(key + j + 1, barEntry(si, a * k, b * k, first ? (j === 0 ? firstHeader : header) * s.space : 0, pad * s.space))
      s.bars.push(key + j + 1)
    })
    key += m.barAt.length
  }
  const spaces = systems.map(s => s.space).sort((a, b) => a - b)
  return { pages, pageOf: si => pageOf?.(systems[si].pageIndex, si) ?? null, systems, bars, space: spaces[spaces.length >> 1] }
}

/**
 * The system's ink on a transparent canvas, black, so the overlay can tint it:
 * from a scan, darkness becomes opacity (paper goes, ink stays, in its own
 * weight); from an engraving drawn on a transparent canvas, its alpha as it is.
 */
export function inkOf(page, r, { from = 'luma', light, dark, maxSide = 4096 } = {}) {
  const k = Math.min(1, maxSide / Math.max(r.w, r.h))
  const w = Math.max(1, Math.round(r.w * k)), h = Math.max(1, Math.round(r.h * k))
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(page, r.x, r.y, r.w, r.h, 0, 0, w, h)
  if (from === 'luma') {
    const id = g.getImageData(0, 0, w, h), d = id.data
    // the paper's own level in this slice (an old page darkens toward its edges and the
    // spine): its 70th percentile; ink starts a little below it and is full well below
    const hist = new Uint32Array(256)
    for (let i = 0; i < d.length; i += 16) hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++
    let paper = 255; const total = hist.reduce((a, b) => a + b, 0)
    for (let v = 0, m = 0; v < 256; v++) { m += hist[v]; if (m >= total * 0.7) { paper = v; break } }
    light ??= paper - 28; dark ??= Math.max(20, paper - 125)
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8
      d[i] = d[i + 1] = d[i + 2] = 0
      d[i + 3] = Math.max(0, Math.min(255, (light - l) / (light - dark) * 255))
    }
    g.putImageData(id, 0, 0)
  }
  return { canvas: c, scale: k }
}
