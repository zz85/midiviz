import { lineY } from './scoreshift/omr.js'

// Canvas overlay for experiment #046. Coordinates are ScoreShift-normalized.
const STRING_COLOURS = ['#9f1239', '#b45309', '#047857', '#1d4ed8']

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

export function drawFingerings(ctx, items, scale, { selectedId = null } = {}) {
  ctx.save(); ctx.scale(scale, scale)
  for (const item of items) {
    const above = item.labelY < item.y
    const x = item.labelX, y = item.labelY
    const colour = item.playable ? STRING_COLOURS[item.assignment.string % STRING_COLOURS.length] : '#b91c1c'
    ctx.fillStyle = item.playable ? 'rgba(255,255,255,.95)' : '#fff1f2'
    ctx.strokeStyle = colour; ctx.lineWidth = item.id === selectedId ? 2.6 : item.locked ? 2.1 : 1.3
    ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = colour; ctx.font = '800 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.fingerLabel, x, y + 0.2)
    ctx.strokeStyle = colour; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + (above ? 7.5 : -7.5)); ctx.lineTo(item.x, item.y + (above ? -5 : 5)); ctx.stroke()
    if (item.showString) pill(ctx, item.stringLabel, x - 11, y, { color: colour, border: colour, background: '#fff' })
    if (item.showPosition) pill(ctx, item.assignment.thumb ? 'thumb' : `pos ${item.positionLabel}`, x + 16, y, { color: '#475569', border: '#cbd5e1', background: '#f8fafc', font: '600 6.5px system-ui' })
    if (item.locked) { ctx.fillStyle = colour; ctx.font = '700 5px system-ui'; ctx.fillText('◆', x, y - 10) }
    if (item.warnings.length) pill(ctx, '!', x + 9, y - 8, { color:'#b91c1c', border:'#b91c1c', background:'#fff1f2', font:'800 7px system-ui' })
  }
  ctx.restore()
}
