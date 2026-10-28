import { lineY } from '../../random-sketches/vibes/scoreshift/omr.js'
import { DIGIT_HEIGHT, STACK_GAP } from './adapter.js'

// Canvas overlay for experiment #046. Coordinates are ScoreShift-normalized.
const STRING_COLOURS = ['#9f1239', '#b45309', '#047857', '#1d4ed8']

export const FINGERING_STYLE = Object.freeze({
  graphite:'#333330',
  font:'600 24px "Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive',
  alpha:0.8,
})

const pencilJitter = id => {
  let hash = 2166136261
  for (const char of String(id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return [((hash & 255) / 255 - 0.5) * 0.55, (((hash >>> 8) & 255) / 255 - 0.5) * 0.4]
}

/** The numeral's font at `size` times the 24 px default. */
export const fingeringFont = (size = 1) => FINGERING_STYLE.font.replace('24px', `${Math.round(24 * size * 10) / 10}px`)

const pencilNumeral = (ctx, text, x, y, id, selected, size = 1) => {
  const [jx, jy] = pencilJitter(id)
  ctx.fillStyle = FINGERING_STYLE.graphite
  ctx.font = fingeringFont(size)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.globalAlpha = selected ? 0.94 : FINGERING_STYLE.alpha
  ctx.fillText(text, x + jx, y + jy)
  ctx.globalAlpha = selected ? 0.28 : 0.22
  ctx.fillText(text, x - jx * 0.7 + 0.25, y - jy * 0.7 + 0.2)
}

const pill = (ctx, text, x, y, { background = '#fff', color = '#172033', border = '#bcc5d0', font = '600 8px system-ui' } = {}) => {
  ctx.font = font
  const width = ctx.measureText(text).width + 6
  ctx.fillStyle = background; ctx.strokeStyle = border; ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - 7, width, 11, 3); ctx.fill(); ctx.stroke()
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 1.5)
}

export function drawRecognition(ctx, model, scale, score, selectedSource = null) {
  ctx.save(); ctx.scale(scale, scale)
  ctx.font = '600 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const note of model.notes) {
    const selected = note === selectedSource
    ctx.strokeStyle = selected ? '#e11d48' : 'rgba(14,116,144,.68)'
    ctx.lineWidth = selected ? 2.2 : 1
    ctx.beginPath(); ctx.ellipse(note.x, note.y, 7, 5.5, -0.25, 0, Math.PI * 2); ctx.stroke()
    pill(ctx, note.name || '?', note.x, note.y - 10, { color: '#0e7490', border: '#a5d8df' })
  }
  for (const measure of score?.measures || []) {
    if (measure.status !== 'under' && measure.status !== 'over') continue
    const cx = (measure.x0 + measure.x1) / 2
    const cy = lineY(measure.st, 4, cx) + 24
    pill(ctx, `bar ${measure.number}: ${measure.status}`, cx, cy, { color: '#b91c1c', border: '#fecaca', background: '#fff7f7' })
  }
  ctx.restore()
}

/**
 * Where a label sits at `size` times the default: its bottom edge stays the same distance above
 * its note, so bigger numerals grow upward instead of into the notehead, and a chord's stack
 * spreads only by the numerals' own growth, keeping the gap between them constant. A nudge from
 * placeLabels for this size moves it off printed markings.
 */
export function labelAt(item, size = 1) {
  const nudge = item.placed?.size === size ? item.placed : { dx:0, dy:0 }
  if (size === 1) return { x:item.labelX + nudge.dx, y:item.labelY + nudge.dy }
  const above = item.labelY < item.y
  const grow = 0.36 * 24 * (size - 1)
  const stack = (item.stackIndex || 0) * DIGIT_HEIGHT * (size - 1)
  let y = item.labelY + (above ? -grow - stack : grow + stack)
  if (above) {
    // a large numeral near the top of the page is pushed down, its whole stack with it
    const fromTop = (item.stackCount || 1) - 1 - (item.stackIndex || 0)
    const topY = y - fromTop * (DIGIT_HEIGHT * size + STACK_GAP)
    y += Math.max(0, DIGIT_HEIGHT / 2 * size + 2 - topY)
  }
  return { x:item.labelX + nudge.dx, y:y + nudge.dy }
}

/** Half extents of a finger numeral at `size`, in normalized page pixels. */
export const numeralBox = (size = 1) => ({ hw:7 * size + 2.5, hh:DIGIT_HEIGHT / 2 * size + 2 })

/**
 * Move labels that would be written over printed ink (text such as "div.", dynamics, other
 * notes) or over another label to the nearest clear spot, preferring a little higher, then a
 * little to the side. `isInk(x, y)` samples the page in normalized pixels with staff lines
 * removed. A chord's stack moves as one. Sets `item.placed` for this size.
 */
export function placeLabels(items, size, isInk, { showRepeats = false, ceiling = () => 2 } = {}) {
  const { hw, hh } = numeralBox(size), units = new Map(), placed = []
  for (const item of items) {
    delete item.placed
    if (!item.playable || (item.repeat && !showRepeats)) continue
    const key = item.stackKey || item.id
    units.set(key, [...(units.get(key) || []), item])
  }
  const inkIn = (x0, y0, x1, y1) => {
    let count = 0
    for (let y = y0; y <= y1; y += 1.5) for (let x = x0; x <= x1; x += 1.5) if (isInk(x, y)) count++
    return count
  }
  const step = Math.max(2, 2 * size), reach = 48 * size, side = 18 * size, sides = [0]
  for (let dx = 3 * size; dx <= side + 1e-9; dx += 3 * size) sides.push(-dx, dx)
  for (const group of units.values()) {
    const at = group.map(item => labelAt(item, size))
    const box = { x0:Math.min(...at.map(p => p.x)) - hw, x1:Math.max(...at.map(p => p.x)) + hw, y0:Math.min(...at.map(p => p.y)) - hh, y1:Math.max(...at.map(p => p.y)) + hh }
    const clash = (dx, dy) => placed.some(b => b.x0 < box.x1 + dx && b.x1 > box.x0 + dx && b.y0 < box.y1 + dy && b.y1 > box.y0 + dy)
    const score = (dx, dy) => inkIn(box.x0 + dx, box.y0 + dy, box.x1 + dx, box.y1 + dy) * 20 + (clash(dx, dy) ? 400 : 0)
    // never lift a label into the staff above: its notes would read as this one's
    const top = Math.max(2, ...group.map(item => ceiling(item)))
    let best = { dx:0, dy:0, cost:score(0, 0) }
    if (best.cost > 0) {
      for (let dy = 0; dy >= -reach - 1e-9; dy -= step) for (const dx of sides) {
        if (box.y0 + dy < top) continue
        const cost = score(dx, dy) + Math.abs(dy) * 0.4 + Math.abs(dx) * 0.8
        if (cost < best.cost) best = { dx, dy, cost }
      }
    }
    for (const item of group) item.placed = { size, dx:best.dx, dy:best.dy }
    placed.push({ x0:box.x0 + best.dx, x1:box.x1 + best.dx, y0:box.y0 + best.dy, y1:box.y1 + best.dy })
  }
  return items
}

export function drawFingerings(ctx, items, scale, { selectedId = null, showDetails = false, size = 1, showRepeats = false } = {}) {
  ctx.save(); ctx.scale(scale, scale)
  for (const item of items) {
    const selected = item.id === selectedId
    if (item.repeat && !showRepeats && !selected) continue
    ctx.save()
    const { x, y } = labelAt(item, size)
    if (item.playable) {
      pencilNumeral(ctx, item.fingerLabel, x, y, item.id, selected, size)
      ctx.globalAlpha = selected ? 0.82 : 0.58
      ctx.strokeStyle = FINGERING_STYLE.graphite
      if (selected) {
        ctx.lineWidth = 1.25; ctx.beginPath()
        ctx.moveTo(x - 8 * size, y + 11 * size); ctx.lineTo(x + 8 * size, y + 10.2 * size); ctx.stroke()
      }
      if (item.locked) {
        ctx.globalAlpha = 0.7; ctx.fillStyle = FINGERING_STYLE.graphite
        ctx.font = '700 5px system-ui'; ctx.fillText('◆', x + 11 * size, y - 9 * size)
      }
      if (showDetails) {
        const defaultSide = item.source?.stem?.dir < 0 ? -1 : 1
        const side = item.labelX < item.x ? -1 : item.labelX > item.x ? 1 : defaultSide
        const stringX = item.x + side * 14
        const positionX = item.x + side * (item.showString ? 39 : 25)
        ctx.globalAlpha = 0.8
        const colour = STRING_COLOURS[item.assignment.string % STRING_COLOURS.length]
        if (item.showString) pill(ctx, item.stringLabel, stringX, item.y, { color:colour, border:colour, background:'rgba(255,255,255,.82)' })
        if (item.showPosition) pill(ctx, item.assignment.thumb ? 'thumb' : `pos ${item.positionLabel}`, positionX, item.y, { color:'#59616a', border:'#c4c8cc', background:'rgba(255,255,255,.82)', font:'600 6.5px system-ui' })
      }
    } else {
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff1f2'; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = selected ? 2.2 : 1.2
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#b91c1c'; ctx.font = `800 ${Math.round(9 * size)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×', x, y)
    }
    const visibleWarnings = item.warnings.filter(warning => warning.code !== 'chord-capacity')
    if (visibleWarnings.length) {
      ctx.globalAlpha = 1
      pill(ctx, '!', x + 14 * size, y - 11 * size, { color:'#b91c1c', border:'#b91c1c', background:'#fff1f2', font:'800 7px system-ui' })
    }
    ctx.restore()
  }
  ctx.restore()
}
