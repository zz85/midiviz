// 2D view (Experiment #033): a scrolling string tablature above a fingerboard map.
//
// Tab: one lane per string (top string on top, as in tablature); each note is
// a bar in its string's lane, coloured by finger, with the finger number and,
// where the hand moves, the new position in roman numerals. A slanted line
// joins the two notes of a shift. Time runs right to left through the "now"
// line. Notes that differ from an expected fingering get a dashed red outline.
//
// Fingerboard: the neck seen from above, nut on the left, stops spaced by
// the fret formula; the hand's frame (finger 1's base to finger 4's natural
// place) as a band, fingers as coloured dots (pressed / held / hovering),
// sounding strings vibrating, and the bow crossing the strings with its
// direction.

import { stopMM, positionRoman, noteName } from './fingering.js'

export const FINGER_COLORS = ['#d8d2c4', '#e2483d', '#f0a030', '#48b04c', '#3f8fe0']

export function createBoard(canvas) {
  const g = canvas.getContext('2d')
  const opt = { labels: true, window: 4, lead: 0.28 }
  let notes = [], inst = null, expect = null
  function setNotes(list, { instrument, expectMap = null } = {}) {
    notes = list.filter(n => n.string != null).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    inst = instrument
    expect = expectMap
  }
  function draw(t, pose) {
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth, H = canvas.clientHeight
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr) }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, H)
    g.fillStyle = 'rgba(12,11,10,0.92)'
    g.fillRect(0, 0, W, H)
    if (!inst) return
    const S = inst.open.length
    const tabH = Math.round(H * 0.56), boardY = tabH + 8, boardH = H - boardY - 8
    // ── tab ──
    const laneH = (tabH - 22) / S
    const laneY = s => 14 + (S - 1 - s) * laneH + laneH / 2
    const x0 = Math.max(110, W * opt.lead)
    const pxs = (W - x0) / opt.window
    const tx = tt => x0 + (tt - t) * pxs
    g.font = '11px Helvetica, Arial, sans-serif'
    for (let s = 0; s < S; s++) {
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(40, laneY(s)); g.lineTo(W, laneY(s)); g.stroke()
      g.fillStyle = '#a9a196'; g.textAlign = 'left'; g.textBaseline = 'middle'
      g.fillText(inst.strings[s], 14, laneY(s))
    }
    let prev = null
    const visible = []
    for (const n of notes) {
      if (n.off < t - (x0 - 40) / pxs) { prev = n; continue }
      if (n.on > t + opt.window) break
      visible.push(n)
    }
    // shift connectors
    let p0 = prev
    for (const n of visible) {
      if (p0 && n.finger && p0.finger && n.base !== p0.base && n.on - p0.on > 0.02) {
        g.strokeStyle = 'rgba(243,230,196,0.45)'; g.lineWidth = 1.5; g.setLineDash([3, 3])
        g.beginPath(); g.moveTo(tx(p0.off), laneY(p0.string)); g.lineTo(tx(n.on), laneY(n.string)); g.stroke()
        g.setLineDash([])
      }
      if (n.finger) p0 = n
    }
    let lastBase = prev?.finger ? prev.base : null
    for (const n of visible) {
      const xa = Math.max(40, tx(n.on)), xb = tx(n.off)
      if (xb < 40) continue
      const y = laneY(n.string), h = Math.min(18, laneH * 0.62)
      const active = t >= n.on && t < n.off
      g.fillStyle = FINGER_COLORS[n.finger]
      g.globalAlpha = active ? 1 : 0.78
      roundRect(g, xa, y - h / 2, Math.max(4, xb - xa), h, 4)
      g.fill()
      g.globalAlpha = 1
      const want = expect?.get(n)
      if (want && want !== `${inst.strings[n.string]}${n.finger}`) {
        g.strokeStyle = '#ff4d6a'; g.setLineDash([3, 2]); g.lineWidth = 1.5
        roundRect(g, xa - 2, y - h / 2 - 2, Math.max(4, xb - xa) + 4, h + 4, 5); g.stroke(); g.setLineDash([])
        g.fillStyle = '#ff8095'; g.textAlign = 'left'; g.font = '10px Helvetica, Arial'
        g.fillText(want, xa, y + h / 2 + 8)
      }
      if (opt.labels) {
        g.fillStyle = n.finger === 0 ? '#222' : '#fff'
        g.font = 'bold 12px Helvetica, Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'
        g.fillText(n.finger === 0 ? '0' : String(n.finger), xa + 4, y + 0.5)
      }
      if (n.finger && n.base !== lastBase) {
        g.fillStyle = '#f3e6c4'; g.font = '11px Georgia, serif'; g.textAlign = 'left'
        g.fillText(positionRoman(n.base), xa, y - h / 2 - 7)
        lastBase = n.base
      }
      if (n.unplayable) { g.strokeStyle = '#777'; g.strokeRect(xa, y - h / 2, xb - xa, h) }
    }
    g.strokeStyle = 'rgba(243,230,196,0.8)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(x0, 6); g.lineTo(x0, tabH - 4); g.stroke()

    // ── fingerboard ──
    const L = inst.L / 10
    const bx0 = 40, bx1 = W - 20
    const span = L * 0.86                       // show up to ~2 octaves + a fifth
    const X = u => bx0 + (u / span) * (bx1 - bx0)
    const by0 = boardY + 6, by1 = boardY + boardH - 6
    const sy = s => by1 - (by1 - by0) * (s + 0.5) / S
    // board
    g.fillStyle = '#1b1815'
    g.beginPath(); g.moveTo(X(0), by0 + 4); g.lineTo(X(span), by0 - 2); g.lineTo(X(span), by1 + 2); g.lineTo(X(0), by1 - 4); g.closePath(); g.fill()
    // semitone ticks and position marks
    for (let n = 1; n <= 30; n++) {
      const u = stopMM(n, inst.L) / 10
      if (u > span) break
      g.strokeStyle = [5, 7, 12, 17, 19, 24].includes(n) ? 'rgba(243,230,196,0.28)' : 'rgba(255,255,255,0.07)'
      g.lineWidth = 1
      g.beginPath(); g.moveTo(X(u), by0); g.lineTo(X(u), by1); g.stroke()
      if ([5, 7, 12, 17, 19, 24].includes(n)) { g.fillStyle = '#6f685d'; g.font = '9px Helvetica'; g.textAlign = 'center'; g.fillText({ 5: '4th', 7: '5th', 12: '8ve', 17: '11th', 19: '12th', 24: '2 8ve' }[n], X(u), by1 + 1 + 8) }
    }
    // hand frame
    if (pose) {
      const u1 = stopMM(pose.base, inst.L) / 10 + pose.vib, u4 = stopMM(pose.base + 5, inst.L) / 10 + pose.vib
      g.fillStyle = 'rgba(243,200,140,0.12)'; g.strokeStyle = 'rgba(243,200,140,0.4)'
      roundRect(g, X(u1) - 6, by0 - 3, X(u4) - X(u1) + 12, by1 - by0 + 6, 6); g.fill(); g.stroke()
      g.fillStyle = '#f3e6c4'; g.font = '11px Georgia, serif'; g.textAlign = 'left'
      g.fillText(`${positionRoman(Math.round(pose.base))} position`, X(u1) - 4, boardY + 2)
    }
    // strings, vibrating where they sound
    const vib = pose ? pose.sounding : []
    for (let s = 0; s < S; s++) {
      const sound = vib.find(v => v.s === s)
      g.strokeStyle = s === S - 1 ? '#d9d9de' : '#b89a72'
      g.lineWidth = 1 + (S - 1 - s) * 0.35
      g.beginPath(); g.moveTo(X(0), sy(s)); g.lineTo(X(span), sy(s)); g.stroke()
      if (sound) {
        const a = X(sound.u), b = X(span)
        g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 3
        g.beginPath()
        for (let i = 0; i <= 40; i++) {
          const x = a + (b - a) * i / 40
          const y = sy(s) + Math.sin(Math.PI * i / 40) * 2.4 * Math.sin(performance.now() / 9 + i * 0.5)
          i ? g.lineTo(x, y) : g.moveTo(x, y)
        }
        g.stroke()
        g.fillStyle = '#f3e6c4'; g.font = '10px Helvetica'; g.textAlign = 'left'
        g.fillText(noteName(sound.pitch), Math.min(b - 26, a + 6), sy(s) - 6)
      }
      g.fillStyle = '#a9a196'; g.font = '11px Helvetica'; g.textAlign = 'right'; g.textBaseline = 'middle'
      g.fillText(inst.strings[s], bx0 - 8, sy(s))
    }
    // nut
    g.fillStyle = '#e8e0d0'; g.fillRect(X(0) - 3, by0, 3, by1 - by0)
    // fingers
    if (pose) for (const f of [1, 2, 3, 4]) {
      const F = pose.fingers[f]
      const x = X(F.u), y = sy(F.s)
      g.globalAlpha = F.press > 0 ? (F.held ? 0.55 : 1) : 0.28
      g.fillStyle = FINGER_COLORS[f]
      g.beginPath(); g.arc(x, y, F.press > 0 ? 8 : 6, 0, Math.PI * 2); g.fill()
      if (F.press > 0) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke() }
      g.globalAlpha = 1
      if (opt.labels && F.press > 0) { g.fillStyle = '#fff'; g.font = 'bold 10px Helvetica'; g.textAlign = 'center'; g.fillText(String(f), x, y + 0.5) }
    }
    // bow
    if (pose?.bow) {
      const bw = pose.bow
      const bxp = X(span) - 26
      const s = bw.s
      g.strokeStyle = bw.lift > 0.5 ? 'rgba(242,234,216,0.35)' : '#f2ead8'
      g.lineWidth = 4
      const yc = sy(0) + (sy(S - 1) - sy(0)) * (s / Math.max(1, S - 1))
      g.beginPath(); g.moveTo(bxp - 6, yc + 26); g.lineTo(bxp + 6, yc - 26); g.stroke()
      if (bw.playing) {
        g.fillStyle = '#f3e6c4'; g.font = 'bold 13px Helvetica'; g.textAlign = 'center'
        g.fillText(bw.dir > 0 ? '⊓' : 'V', bxp + 16, boardY + 2)
      }
      // position along the hair
      g.fillStyle = 'rgba(242,234,216,0.25)'; g.fillRect(W - 14, by0, 4, by1 - by0)
      g.fillStyle = '#f2ead8'; g.fillRect(W - 16, by0 + (by1 - by0) * Math.max(0, Math.min(1, bw.pos / 65)) - 2, 8, 4)
    }
  }
  return { setNotes, draw, opt }
}

function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
