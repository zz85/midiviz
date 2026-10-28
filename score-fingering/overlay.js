import { lineY } from '../../random-sketches/vibes/scoreshift/omr.js'

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
 * spreads to keep its numerals apart.
 */
export function labelAt(item, size = 1) {
  if (size === 1) return { x:item.labelX, y:item.labelY }
  const above = item.labelY < item.y
  // half the numeral height (24 px font, ~0.72 of its size) is what grows on the near side
  const grow = 0.36 * 24 * (size - 1)
  const stack = item.stackIndex ? item.stackIndex * 26 * (size - 1) : 0
  return { x:item.labelX, y:item.labelY + (above ? -grow : grow) - (above ? stack : -stack) }
}

export function drawFingerings(ctx, items, scale, { selectedId = null, showDetails = false, size = 1 } = {}) {
  ctx.save(); ctx.scale(scale, scale)
  for (const item of items) {
    ctx.save()
    const { x, y } = labelAt(item, size), selected = item.id === selectedId
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
