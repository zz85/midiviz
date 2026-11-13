// Draw the score over the picture as the music plays: the system being played
// in a panel, the bar lit, a cursor at the place in it, the next system
// scrolling up into the panel just before the music reaches it (after a repeat,
// the system the repeat goes back to). The same drawing goes on the page's own
// canvas, live, and on each frame of an exported video.
//
//   const ov = createSheetOverlay(layout, timeline, { style, rows, size, position, highlight })
//   ov.box(w, h, place, { bottom, top })  the panel's rectangle in px at a place (POSITIONS but auto)
//   ov.draw(g, w, h, t, { bottom, top, box })   g: a 2D context of w × h; t: song seconds; bottom, top: px
//                                       kept clear; box: where to draw it (default: ov.box at opts.position)
//
// layout: layout.js; timeline: timeline.js.

export const STYLES = {
  glass: { label: 'Glass (light ink on dark)', panel: 'rgba(12, 10, 8, 0.62)', ink: '#f3e9d6', bar: 'rgba(255, 196, 110, 0.16)', cursor: '#ffc870', head: '255, 205, 120', edge: 'rgba(255, 230, 190, 0.14)' },
  paper: { label: 'Paper', panel: 'rgba(244, 236, 216, 0.94)', ink: '#1c1813', bar: 'rgba(214, 150, 60, 0.22)', cursor: '#b83a1e', head: '200, 70, 30', edge: 'rgba(60, 40, 20, 0.25)' },
  ink: { label: 'Ink only', panel: null, ink: '#ffffff', bar: 'rgba(255, 196, 110, 0.14)', cursor: '#ffc870', head: '255, 205, 120', shadow: 'rgba(0, 0, 0, 0.85)' },
}
export const POSITIONS = { auto: 'Automatic (away from the pianist)', bottom: 'Bottom', top: 'Top', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right', 'top-left': 'Top left', 'top-right': 'Top right' }
// the places Automatic chooses among: the corners only where the panel leaves room beside it
export const PLACES = ['bottom', 'top', 'bottom-left', 'bottom-right', 'top-left', 'top-right']
export const HIGHLIGHTS = { bar: 'Bar', both: 'Bar and cursor', cursor: 'Cursor', none: 'Nothing' }
// systems: the system being played, the next one coming up into the panel before it is reached;
// scroll: the bars in the order played on one line moving right to left behind a cursor that
// stays put, the clef and the key held at the left (sheet/README.md, Scroll)
export const MODES = { systems: 'Systems, one after another', scroll: 'Scroll, one long line' }

import { place, inkOf } from './layout.js'

export function createSheetOverlay(layout, timeline, opts = {}) {
  const o = { mode: 'systems', style: 'glass', rows: 1, size: 0.2, position: 'bottom', highlight: 'bar', heads: true, opacity: 1, inkFrom: 'luma', ...opts }
  // (each system's ink, tinted, made as it first shows: kept for the last few systems alone, as a
  // score of many pages would hold hundreds of them)
  const masks = new Map(), tints = new Map(), KEEP = 12
  const pageOf = si => layout.pageOf ? layout.pageOf(si) : layout.page
  const keep = (map, key, make) => {
    if (map.has(key)) { const v = map.get(key); map.delete(key); map.set(key, v); return v }
    const v = make()
    if (v == null) return null
    map.set(key, v)
    while (map.size > KEEP * (map === tints ? 3 : 1)) map.delete(map.keys().next().value)
    return v
  }
  const maskOf = si => keep(masks, si, () => { const pg = pageOf(si); return pg ? inkOf(pg, layout.systems[si], { from: o.inkFrom }) : null })
  function tinted(si, color) {
    return keep(tints, si + color, () => {
      const m = maskOf(si)?.canvas
      if (!m) return null
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(m.width, m.height) : Object.assign(document.createElement('canvas'), { width: m.width, height: m.height })
      const g = c.getContext('2d')
      g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height)
      return c
    })
  }
  // (the widest and the tallest system: again as a layout that grows, engraved a movement at a time, adds systems)
  let maxW = 0, maxH = 0, seen = 0
  // (or the size the layout fixes, `layout.size` { w, h }, so the panel doesn't grow as it does)
  const measure = () => {
    if (layout.size) { maxW = layout.size.w; maxH = layout.size.h; return }
    for (; seen < layout.systems.length; seen++) { maxW = Math.max(maxW, layout.systems[seen].w); maxH = Math.max(maxH, layout.systems[seen].h) }
  }
  measure()
  // the systems played after performed bar i, each with the time it starts: [{ system, t }]
  function upcoming(i, count) {
    const out = [], bars = timeline.bars
    let cur = layout.bars.get(bars[i].bar)?.system
    for (let j = i + 1; j < bars.length && out.length < count; j++) {
      const s = layout.bars.get(bars[j].bar)?.system
      if (s != null && s !== cur) { out.push({ system: s, t: bars[j].t0 }); cur = s }
    }
    return out
  }
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)

  function box(W, H, place = o.position, { bottom = 0, top = 0 } = {}) {
    measure()
    if (o.mode === 'scroll') return ribbonBox(W, H, place, { bottom, top })
    const rows = Math.max(1, Math.min(3, o.rows | 0))
    const k = Math.min(H * o.size / maxH, W * 0.94 / maxW)
    const rowH = maxH * k, w = maxW * k, h = rowH * rows
    // (the panel's frame reaches 10 px past the systems' sides, 6 px above and below)
    const mx = Math.round(W * 0.03) + 10, my = Math.round(H * 0.025) + 6
    const [v, side = 'center'] = String(place || 'bottom').split('-')
    const x = side === 'left' ? mx : side === 'right' ? W - mx - w : (W - w) / 2
    const y = v === 'top' ? top + my : H - bottom - my - h
    return { x, y, w, h, k, rowH, rows }
  }

  // (o.start: the first note's time; before it, in a video's lead-in, the panel waits, and comes up
  // over the APPEAR seconds before the note so it is whole as the music starts)
  const APPEAR = 0.5
  function draw(g, W, H, t, { bottom = 0, top = 0, box: b = null } = {}) {
    const start = o.start ?? 0
    if (t < start - APPEAR) return
    const appear = Math.min(1, (t - (start - APPEAR)) / APPEAR)
    const at = timeline.at(Math.max(t, start)), p = at && place(layout, at)
    if (!p) return
    const st = STYLES[o.style] || STYLES.glass
    if (o.mode === 'scroll') return drawRibbon(g, W, H, t, at, p, st, appear, b, { bottom, top })
    const bb = box(W, H, o.position === 'auto' ? 'bottom' : o.position, { bottom, top })
    const { k, rowH, rows } = bb, pw = bb.w, ph = bb.h
    const px = b ? b.x : bb.x, py = b ? b.y : bb.y
    // the scroll: the next system comes up over the last `lead` seconds before it is played
    const next = upcoming(at.i, rows + 1), lead = Math.min(0.7, (at.t1 - at.t0) * 0.5)
    const sp = next[0] ? ease(1 - (next[0].t - t) / lead) : 0
    g.save()
    g.globalAlpha = o.opacity * appear
    if (st.panel) {
      g.fillStyle = st.panel
      round(g, px - 10, py - 6, pw + 20, ph + 12, Math.min(14, rowH * 0.12)); g.fill()
      if (st.edge) { g.strokeStyle = st.edge; g.lineWidth = 1; g.stroke() }
    }
    g.beginPath(); g.rect(px - 10, py - 6, pw + 20, ph + 12); g.clip()
    const list = [{ system: p.system }, ...next]
    list.forEach((it, r) => {
      const y = py + (r - sp) * rowH
      if (y > py + ph || y + rowH < py) return
      const s = layout.systems[it.system], sw = s.w * k, sx = px + (pw - sw) / 2, sy = y + (rowH - s.h * k) / 2
      const X = v => sx + (v - s.x) * k, Y = v => sy + (v - s.y) * k
      // in one row, the system leaving dims as the next comes up
      g.globalAlpha = o.opacity * appear * (rows > 1 ? 1 : r === 0 ? 1 - sp * 0.6 : Math.max(0.15, sp))
      const ink = tinted(it.system, st.ink)
      if (!ink) return
      if (r === 0 && o.highlight !== 'none' && o.highlight !== 'cursor') {
        const e = p.entry, a = s.space ?? layout.space
        g.fillStyle = st.bar
        g.fillRect(X(e.x0), Y(s.staffTop - a * 1.6), (e.x1 - e.x0) * k, (s.staffBottom - s.staffTop + a * 3.2) * k)
      }
      if (st.shadow) { g.shadowColor = st.shadow; g.shadowBlur = Math.max(2, rowH * 0.03) }
      g.drawImage(ink, X(s.x), Y(s.y), s.w * k, s.h * k)
      g.shadowBlur = 0
      if (r !== 0) return
      // the notes just played glow, and fade over a third of a second (engraved scores know their heads)
      if (o.heads && p.entry.onsets) {
        for (const n of p.entry.onsets) {
          const age = (at.frac - n.frac) * (at.t1 - at.t0)
          if (age < -0.02 || age > 0.45) continue
          const a = 1 - Math.max(0, age) / 0.45
          for (const hd of n.heads) {
            const r0 = Math.max(3, hd.r * k * 1.9)
            const gr = g.createRadialGradient(X(hd.x), Y(hd.y), 0, X(hd.x), Y(hd.y), r0)
            gr.addColorStop(0, `rgba(${st.head}, ${0.85 * a})`); gr.addColorStop(1, `rgba(${st.head}, 0)`)
            g.fillStyle = gr; g.fillRect(X(hd.x) - r0, Y(hd.y) - r0, r0 * 2, r0 * 2)
          }
        }
      }
      if (o.highlight === 'both' || o.highlight === 'cursor') {
        const a = s.space ?? layout.space, cx = X(p.x)
        g.strokeStyle = st.cursor; g.lineWidth = Math.max(1.5, rowH * 0.012)
        g.shadowColor = st.cursor; g.shadowBlur = Math.max(4, rowH * 0.05)
        g.beginPath(); g.moveTo(cx, Y(s.staffTop - a * 1.4)); g.lineTo(cx, Y(s.staffBottom + a * 1.4)); g.stroke()
        g.shadowBlur = 0
      }
    })
    g.restore()
  }

  // ── Scroll: one long line ───────────────────────────────────────────────────────
  // The bars in the order the music plays them, each cut from its system, laid end to end:
  // the clef, the key (and the first system's time signature) cut off each system's first
  // bar, and the current system's own drawn once at the left, where it stays. Each system is
  // scaled so its staves are as tall as the score's usual (the median of its systems), so the
  // staves of one system join the next's. The line moves under a cursor a third of the way
  // in. The scroll goes at the bar's own speed, its width over its time, smoothed over the
  // 0.8 s around now, so it doesn't jerk where a printed bar is narrower than the one before;
  // the cursor goes from note to note on top of that and so moves a little about its place.
  const SCROLL = { at: 0.3, smooth: 0.4, gapSpaces: 8, fade: 0.06, headFade: 0.35 }
  let refSpan = 0, refSpace = 0, refN = -1
  const ref = () => {
    if (refN === layout.systems.length) return
    refN = layout.systems.length
    const spans = layout.systems.map(s => s.staffBottom - s.staffTop).sort((a, b) => a - b)
    const sps = layout.systems.map(s => (s.space ?? layout.space) / (s.staffBottom - s.staffTop)).sort((a, b) => a - b)
    refSpan = spans[spans.length >> 1] || 1
    refSpace = (sps[sps.length >> 1] || 0.1) * refSpan
  }
  // a performed bar on the line: its system, the part of the page it takes (the first bar of a
  // system without the clef and the key) and how wide it is on the line, in line units
  function seg(j) {
    const b = timeline.bars[j], e = b && layout.bars.get(b.bar)
    if (!e) return null
    const s = layout.systems[e.system], sp = s.space ?? layout.space
    const first = s.bars[0] === b.bar
    const a = first ? Math.max(e.x0, e.start - sp * 0.9) : e.x0
    const k = refSpan / (s.staffBottom - s.staffTop)
    return { b, e, s, si: e.system, a, k, w: (e.x1 - a) * k, first, head: headEnd(s) }
  }
  // where a system's clef and key end: just before its first bar's first note
  const headEnd = s => { const e = layout.bars.get(s.bars[0]), sp = s.space ?? layout.space; return e ? Math.max(e.x0, e.start - sp * 0.9) : s.x }
  // where performed bar j starts on the line, from bar i's start (a gap between movements)
  function offsets(i, lo, hi) {
    const out = new Map([[i, 0]]), gap = refSpace * SCROLL.gapSpaces
    let u = 0
    for (let j = i; j < hi; j++) {
      const sj = seg(j), sn = timeline.bars[j + 1]
      u += sj ? sj.w : 0
      if (sn && timeline.bars[j].movement !== sn.movement) u += gap
      out.set(j + 1, u)
    }
    u = 0
    for (let j = i - 1; j >= lo; j--) {
      const sj = seg(j), sn = timeline.bars[j + 1]
      if (timeline.bars[j].movement !== sn.movement) u -= gap
      u -= sj ? sj.w : 0
      out.set(j, u)
    }
    return out
  }
  // the scroll at song time t, from bar i's start: in proportion to time within each bar
  function scrollAt(i, t, off) {
    let j = i
    const bars = timeline.bars
    while (j > 0 && t < bars[j].t0) j--
    while (j < bars.length - 1 && t >= bars[j].t1) j++
    if (!off.has(j)) return null
    const b = bars[j], sj = seg(j), f = Math.max(0, Math.min(1, (t - b.t0) / (b.t1 - b.t0 || 1)))
    return off.get(j) + (sj ? sj.w * f : 0)
  }
  function ribbonBox(W, H, place = o.position, { bottom = 0, top = 0 } = {}) {
    const mx = Math.round(W * 0.03) + 10, my = Math.round(H * 0.025) + 6
    const [v, side = 'center'] = String(place || 'bottom').split('-')
    const w = side === 'center' ? W - 2 * mx : Math.round(W * 0.55), h = Math.round(H * o.size)
    const x = side === 'left' ? mx : side === 'right' ? W - mx - w : mx
    const y = v === 'top' ? top + my : H - bottom - my - h
    return { x, y, w, h, k: 1, rowH: h, rows: 1 }
  }
  let layer = null
  function drawRibbon(g, W, H, t, at, p, st, appear, b, { bottom, top }) {
    ref()
    const bb = ribbonBox(W, H, o.position === 'auto' ? 'bottom' : o.position, { bottom, top })
    const px = b ? b.x : bb.x, py = b ? b.y : bb.y, pw = bb.w, ph = bb.h
    // line units to px: the staves and 4.5 spaces above and below them fill the panel's height
    const kr = ph / (refSpan + refSpace * 9), staffY = refSpace * 4.5 * kr
    const i = at.i, cur = seg(i)
    if (!cur) return
    // the header at the left: the clef and the key of the system being played, crossfaded from
    // the last system's over the first bar of a new one
    const headOf = sg => sg && { sg, w: (sg.head - sg.s.x) * sg.k * kr }
    const hNow = headOf(cur)
    let hPrev = null, mix = 1
    if (i > 0) {
      const pv = seg(i - 1), f = (t - at.t0) / Math.min(SCROLL.headFade, (at.t1 - at.t0) * 0.5)
      if (pv && pv.si !== cur.si && f < 1) { hPrev = headOf(pv); mix = ease(f) }
    }
    const hw = hPrev ? hPrev.w + (hNow.w - hPrev.w) * mix : hNow.w
    const mx0 = px + hw, mw = pw - hw, cx = mx0 + mw * SCROLL.at
    // the bars in view, and the scroll, smoothed: the mean of the scroll over the window around now
    const span = mw / kr
    const tl = timeline.bars
    let lo = i, hi = i
    const off0 = offsets(i, Math.max(0, i - 40), Math.min(tl.length - 1, i + 40))
    while (lo > 0 && off0.has(lo - 1) && off0.get(lo) > -span) lo--
    while (hi < tl.length - 1 && off0.has(hi + 1) && off0.get(hi) < span) hi++
    let u = 0, n = 0
    for (let d = -SCROLL.smooth; d <= SCROLL.smooth + 1e-9; d += SCROLL.smooth / 4) {
      const v = scrollAt(i, t + d, off0); if (v != null) { u += v; n++ }
    }
    u = n ? u / n : scrollAt(i, t, off0) ?? 0
    const X = (j, sg, x) => cx + (off0.get(j) - u + (x - sg.a) * sg.k) * kr
    const Y = (sg, y) => py + staffY + (y - sg.s.staffTop) * sg.k * kr
    // the line drawn on a layer of its own, so its two ends can fade (the panel's style or none)
    const LW = Math.ceil(pw), LH = Math.ceil(ph)
    if (!layer || layer.width !== LW || layer.height !== LH) layer = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(LW, LH) : Object.assign(document.createElement('canvas'), { width: LW, height: LH })
    const L = layer.getContext('2d')
    L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, LW, LH)
    L.translate(-px, -py)
    L.save(); L.beginPath(); L.rect(mx0, py, mw, ph); L.clip()
    for (let j = lo; j <= hi; j++) {
      const sg = seg(j)
      if (!sg) continue
      const x0 = X(j, sg, sg.a), x1 = X(j, sg, sg.e.x1)
      if (x1 < mx0 || x0 > px + pw) continue
      // the bar being played, lit
      if (j === i && o.highlight !== 'none' && o.highlight !== 'cursor') {
        const sp = sg.s.space ?? layout.space
        L.fillStyle = st.bar
        L.fillRect(X(j, sg, sg.e.x0 > sg.a ? sg.e.x0 : sg.a), Y(sg, sg.s.staffTop - sp * 1.6), (sg.e.x1 - Math.max(sg.e.x0, sg.a)) * sg.k * kr, (sg.s.staffBottom - sg.s.staffTop + sp * 3.2) * sg.k * kr)
      }
      inkSlice(L, sg, sg.a, sg.e.x1, x0, st)
      // the notes just played glow
      if (j === i && o.heads && sg.e.onsets) {
        for (const nn of sg.e.onsets) {
          const age = (at.frac - nn.frac) * (at.t1 - at.t0)
          if (age < -0.02 || age > 0.45) continue
          const a = 1 - Math.max(0, age) / 0.45
          for (const hd of nn.heads) {
            const hx = X(j, sg, hd.x), hy = Y(sg, hd.y), r0 = Math.max(3, hd.r * sg.k * kr * 1.9)
            const gr = L.createRadialGradient(hx, hy, 0, hx, hy, r0)
            gr.addColorStop(0, `rgba(${st.head}, ${0.85 * a})`); gr.addColorStop(1, `rgba(${st.head}, 0)`)
            L.fillStyle = gr; L.fillRect(hx - r0, hy - r0, r0 * 2, r0 * 2)
          }
        }
      }
    }
    // the cursor: at the note being played, on the line
    if (o.highlight === 'both' || o.highlight === 'cursor') {
      const sp = cur.s.space ?? layout.space, x = X(i, cur, Math.max(p.x, cur.a))
      L.strokeStyle = st.cursor; L.lineWidth = Math.max(1.5, ph * 0.012)
      L.shadowColor = st.cursor; L.shadowBlur = Math.max(4, ph * 0.05)
      L.beginPath(); L.moveTo(x, Y(cur, cur.s.staffTop - sp * 1.4)); L.lineTo(x, Y(cur, cur.s.staffBottom + sp * 1.4)); L.stroke()
      L.shadowBlur = 0
    }
    L.restore()
    // the two ends fade out: the left one where the line meets the clef, the right one at the edge
    L.setTransform(1, 0, 0, 1, 0, 0)
    L.globalCompositeOperation = 'destination-out'
    const fw = Math.max(8, pw * SCROLL.fade)
    let gr = L.createLinearGradient(hw, 0, hw + fw, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    L.fillStyle = gr; L.fillRect(hw, 0, fw, LH)
    gr = L.createLinearGradient(LW - fw, 0, LW, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)')
    L.fillStyle = gr; L.fillRect(LW - fw, 0, fw, LH)
    L.globalCompositeOperation = 'source-over'
    // the header, held at the left
    L.translate(-px, -py)
    for (const [h, a] of hPrev ? [[hPrev, 1 - mix], [hNow, mix]] : [[hNow, 1]]) {
      L.globalAlpha = a
      inkSlice(L, h.sg, h.sg.s.x, h.sg.head, px + 2, st, (x, sg) => px + 2 + (x - sg.s.x) * sg.k * kr, Y)
    }
    L.globalAlpha = 1
    L.setTransform(1, 0, 0, 1, 0, 0)
    // onto the frame: the panel, then the layer
    g.save()
    g.globalAlpha = o.opacity * appear
    if (st.panel) {
      g.fillStyle = st.panel
      round(g, px - 10, py - 6, pw + 20, ph + 12, Math.min(14, ph * 0.12)); g.fill()
      if (st.edge) { g.strokeStyle = st.edge; g.lineWidth = 1; g.stroke() }
    }
    if (st.shadow) { g.shadowColor = st.shadow; g.shadowBlur = Math.max(2, ph * 0.03) }
    g.drawImage(layer, px, py)
    g.restore()

    // the part of a system's ink from page x a to b, drawn at px x (its staves on the line's)
    function inkSlice(L, sg, a, b2, x, st, xAt = null, yAt = Y) {
      const ink = tinted(sg.si, st.ink), m = maskOf(sg.si)
      if (!ink || !m) return
      const s = sg.s, ms = m.scale
      const sx = (a - s.x) * ms, sw = (b2 - a) * ms
      if (sw <= 0) return
      const dx = xAt ? xAt(a, sg) : x
      L.drawImage(ink, sx, 0, sw, ink.height, dx, yAt(sg, s.y), (b2 - a) * sg.k * kr, s.h * sg.k * kr)
    }
  }
  return { draw, box, opts: o, set(x) { Object.assign(o, x) }}
}

function round(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
