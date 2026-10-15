// 2D view for Experiment #029: falling notes coloured by finger, a keyboard,
// and the two hands seen from above (fingertips, fingers, palms) driven by
// the same motion model as the 3D hands.

import { keyX, isBlack, WHITE_W, LOW, HIGH } from './keyboard.js'

const COLORS = ['#777', '#e2483d', '#f0a030', '#48b04c', '#3f8fe0', '#a05ad8']
// knuckle offsets across the hand, same as hands3d.js (cm from the middle knuckle)
const KNUCKLE = [0, -3.4, -2.25, 0, 2.1, 3.9]
const KNUCKLE_Z = [0, 7.8, 3.55, 3.2, 3.55, 4.5]
const FINGER_W = [0, 2.1, 1.7, 1.75, 1.65, 1.45]

export function createRoll(canvas) {
  const g = canvas.getContext('2d')
  let notes = [], sorted = [], range = [LOW, HIGH], expected = null
  const opt = { lookahead: 3, labels: true, hands: true }

  function setNotes(list, { expect = null } = {}) {
    notes = list
    sorted = [...list].sort((a, b) => a.on - b.on)
    expected = expect
    if (list.length) {
      let lo = Math.min(...list.map(n => n.pitch)), hi = Math.max(...list.map(n => n.pitch))
      lo = Math.max(LOW, lo - 5); hi = Math.min(HIGH, hi + 5)
      // keep at least three octaves, snap to white keys
      while (hi - lo < 36) { if (lo > LOW) lo--; if (hi < HIGH) hi++; if (lo === LOW && hi === HIGH) break }
      while (isBlack(lo)) lo--
      while (isBlack(hi)) hi++
      range = [lo, hi]
    } else range = [LOW, HIGH]
  }

  function draw(t, pose, { speed = 1 } = {}) {
    const W = canvas.width, H = canvas.height, dpr = canvas._dpr || 1
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillStyle = '#121214'
    g.fillRect(0, 0, W, H)
    const x0 = keyX(range[0]) - WHITE_W / 2, x1 = keyX(range[1]) + WHITE_W / 2
    const sc = W / (x1 - x0)                       // px per cm
    const px = x => (x - x0) * sc
    const palmH = Math.min(11 * sc, H * 0.24)
    const kbH = Math.min(15 * sc, H * 0.26)
    const kbTop = H - palmH - kbH, kbBot = kbTop + kbH
    const zy = z => kbBot + z * (kbH / 15)          // z = 0 at the key fronts, -15 at the back
    const rollH = kbTop
    const tpx = rollH / opt.lookahead             // px per second of song time

    // ── grid: octave lines ───────────────────────────────────────────────
    g.strokeStyle = 'rgba(255,255,255,0.05)'
    g.lineWidth = 1
    for (let m = range[0]; m <= range[1]; m++) if (m % 12 === 0) { const x = px(keyX(m) - WHITE_W / 2); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, rollH); g.stroke() }

    // ── falling notes ────────────────────────────────────────────────────
    // binary search for the first note that might still be visible
    let lo = 0, hi = sorted.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m].on < t - 12) lo = m + 1; else hi = m }
    g.textAlign = 'center'; g.textBaseline = 'middle'
    for (let i = lo; i < sorted.length; i++) {
      const n = sorted[i]
      if (n.on > t + opt.lookahead) break
      if (n.off < t) continue
      const black = isBlack(n.pitch)
      const w = (black ? 1.25 : 2.0) * sc
      const x = px(keyX(n.pitch)) - w / 2
      const yb = rollH - (n.on - t) * tpx, yt = rollH - (n.off - t) * tpx
      const top = Math.max(-2, yt), bot = Math.min(rollH, yb)
      if (bot <= top) continue
      const c = COLORS[n.finger || 0]
      g.globalAlpha = n.on <= t ? 1 : 0.88
      g.fillStyle = c
      roundRect(g, x, top, w, bot - top, Math.min(4 * dpr, w / 3))
      g.fill()
      // hand: RH light rim, LH dark rim
      g.lineWidth = 1.5 * dpr
      g.strokeStyle = n.hand === 'L' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'
      g.stroke()
      const want = expected?.get(n)
      if (want && want !== n.finger) {
        g.lineWidth = 2.5 * dpr; g.strokeStyle = '#ff2050'
        g.setLineDash([4 * dpr, 3 * dpr]); g.stroke(); g.setLineDash([])
      }
      if (opt.labels && n.finger && w > 9 * dpr && yb - Math.max(top, 0) > 12 * dpr) {
        const fs = Math.min(w * 0.8, 15 * dpr)
        g.font = `bold ${fs}px Helvetica, Arial, sans-serif`
        g.fillStyle = '#fff'
        const ly = Math.min(bot, rollH) - fs * 0.75
        g.fillText(String(n.finger), x + w / 2, ly)
        if (want && want !== n.finger) {
          g.font = `${fs * 0.75}px Helvetica, Arial, sans-serif`
          g.fillStyle = '#ffc0c8'
          g.fillText(`(${want})`, x + w / 2, ly - fs)
        }
      }
    }
    g.globalAlpha = 1

    // ── keyboard ─────────────────────────────────────────────────────────
    const down = new Map()   // pitch → finger colour
    for (const side of ['L', 'R']) for (const [i, f] of (pose?.[side]?.fingers || []).entries()) if (f.press > 0.3 && f.pitch != null) down.set(f.pitch, COLORS[i + 1])
    g.fillStyle = '#000'
    g.fillRect(0, kbTop - 2 * dpr, W, kbH + 2 * dpr)
    for (let m = range[0]; m <= range[1]; m++) {
      if (isBlack(m)) continue
      const x = px(keyX(m) - WHITE_W / 2)
      g.fillStyle = down.has(m) ? mix(down.get(m), '#ffffff', 0.45) : '#f4f1ea'
      g.fillRect(x + 0.5, kbTop, WHITE_W * sc - 1, kbH)
    }
    for (let m = range[0]; m <= range[1]; m++) {
      if (!isBlack(m)) continue
      const x = px(keyX(m) - 0.65)
      g.fillStyle = down.has(m) ? mix(down.get(m), '#000000', 0.25) : '#16161a'
      g.fillRect(x, kbTop, 1.3 * sc, kbH * 0.66)
    }
    g.fillStyle = 'rgba(200,40,40,0.7)'
    g.fillRect(0, kbTop - 2 * dpr, W, 2 * dpr)

    // ── palm strip + hands from above ─────────────────────────────────────
    g.fillStyle = '#1b1a19'
    g.fillRect(0, kbBot, W, palmH)
    if (opt.hands && pose) for (const side of ['L', 'R']) drawHand(side, pose[side])

    function drawHand(side, p) {
      if (!p) return
      const s = side === 'R' ? 1 : -1
      const a = p.anchor
      const kz = -3.2 * a.black + 3 * a.idle
      const kn = f => ({ x: px(a.x + s * KNUCKLE[f]), y: zy(KNUCKLE_Z[f] + kz) })
      const wrist = { x: px(a.x + s * 0.6), y: zy(12 + kz) }
      g.save()
      g.globalAlpha = 0.55
      g.fillStyle = side === 'R' ? '#e7b08f' : '#c99a80'
      g.strokeStyle = 'rgba(60,30,20,0.6)'
      g.lineWidth = 1 * dpr
      // palm polygon: thumb base, knuckles 2..5, wrist corners
      const k = [1, 2, 3, 4, 5].map(kn)
      g.beginPath()
      g.moveTo(px(a.x - s * 3.6), zy(10 + kz))
      g.lineTo(k[1].x, k[1].y); g.lineTo(k[2].x, k[2].y); g.lineTo(k[3].x, k[3].y); g.lineTo(k[4].x, k[4].y)
      g.lineTo(px(a.x + s * 4.3), zy(9 + kz)); g.lineTo(px(a.x + s * 3.4), zy(14 + kz)); g.lineTo(px(a.x - s * 2.6), zy(14 + kz))
      g.closePath(); g.fill(); g.stroke()
      // fingers: knuckle → tip, wider when the finger is down
      g.lineCap = 'round'
      for (const f of [1, 2, 3, 4, 5]) {
        const tip = p.fingers[f - 1]
        const tx = px(tip.x), ty = zy(tip.z)
        g.strokeStyle = side === 'R' ? '#e7b08f' : '#c99a80'
        g.lineWidth = FINGER_W[f] * sc * (0.75 + 0.25 * tip.press)
        g.beginPath(); g.moveTo(k[f - 1].x, k[f - 1].y); g.lineTo(tx, ty); g.stroke()
      }
      g.globalAlpha = 1
      for (const f of [1, 2, 3, 4, 5]) {
        const tip = p.fingers[f - 1]
        const tx = px(tip.x), ty = zy(tip.z)
        const r = Math.max(4 * dpr, 0.85 * sc) * (1 - 0.25 * Math.min(1, tip.y / 2))
        g.beginPath(); g.arc(tx, ty, r, 0, Math.PI * 2)
        g.fillStyle = tip.press > 0.3 ? COLORS[f] : 'rgba(30,30,30,0.55)'
        g.fill()
        g.lineWidth = 1.5 * dpr; g.strokeStyle = COLORS[f]; g.stroke()
        if (r > 6 * dpr) {
          g.fillStyle = '#fff'
          g.font = `bold ${r * 1.15}px Helvetica, Arial, sans-serif`
          g.fillText(String(f), tx, ty + 0.5)
        }
      }
      g.restore()
    }
  }

  return { setNotes, draw, opt, get range() { return range } }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r)
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r)
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y)
}
function mix(a, b, t) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
  const A = p(a), B = p(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}
