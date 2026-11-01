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

import { place, inkOf } from './layout.js'

export function createSheetOverlay(layout, timeline, opts = {}) {
  const o = { style: 'glass', rows: 1, size: 0.2, position: 'bottom', highlight: 'bar', heads: true, opacity: 1, inkFrom: 'luma', ...opts }
  const masks = new Map(), tints = new Map()
  const maskOf = si => {
    if (!masks.has(si)) masks.set(si, inkOf(layout.page, layout.systems[si], { from: o.inkFrom }))
    return masks.get(si)
  }
  function tinted(si, color) {
    const key = si + color
    if (!tints.has(key)) {
      const m = maskOf(si).canvas, c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(m.width, m.height) : Object.assign(document.createElement('canvas'), { width: m.width, height: m.height })
      const g = c.getContext('2d')
      g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height)
      tints.set(key, c)
    }
    return tints.get(key)
  }
  const maxW = Math.max(...layout.systems.map(s => s.w)), maxH = Math.max(...layout.systems.map(s => s.h))
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

  function draw(g, W, H, t, { bottom = 0, top = 0, box: b = null } = {}) {
    const at = timeline.at(t), p = at && place(layout, at)
    if (!p) return
    const st = STYLES[o.style] || STYLES.glass
    const bb = box(W, H, o.position === 'auto' ? 'bottom' : o.position, { bottom, top })
    const { k, rowH, rows } = bb, pw = bb.w, ph = bb.h
    const px = b ? b.x : bb.x, py = b ? b.y : bb.y
    // the scroll: the next system comes up over the last `lead` seconds before it is played
    const next = upcoming(at.i, rows + 1), lead = Math.min(0.7, (at.t1 - at.t0) * 0.5)
    const sp = next[0] ? ease(1 - (next[0].t - t) / lead) : 0
    g.save()
    g.globalAlpha = o.opacity
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
      g.globalAlpha = o.opacity * (rows > 1 ? 1 : r === 0 ? 1 - sp * 0.6 : Math.max(0.15, sp))
      if (r === 0 && o.highlight !== 'none' && o.highlight !== 'cursor') {
        const e = p.entry, a = layout.space
        g.fillStyle = st.bar
        g.fillRect(X(e.x0), Y(s.staffTop - a * 1.6), (e.x1 - e.x0) * k, (s.staffBottom - s.staffTop + a * 3.2) * k)
      }
      if (st.shadow) { g.shadowColor = st.shadow; g.shadowBlur = Math.max(2, rowH * 0.03) }
      g.drawImage(tinted(it.system, st.ink), X(s.x), Y(s.y), s.w * k, s.h * k)
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
        const a = layout.space, cx = X(p.x)
        g.strokeStyle = st.cursor; g.lineWidth = Math.max(1.5, rowH * 0.012)
        g.shadowColor = st.cursor; g.shadowBlur = Math.max(4, rowH * 0.05)
        g.beginPath(); g.moveTo(cx, Y(s.staffTop - a * 1.4)); g.lineTo(cx, Y(s.staffBottom + a * 1.4)); g.stroke()
        g.shadowBlur = 0
      }
    })
    g.restore()
  }
  return { draw, box, opts: o, set(x) { Object.assign(o, x) } }
}

function round(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
