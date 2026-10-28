import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drawFingerings, FINGERING_STYLE } from '../overlay.js'

function recordingContext() {
  const calls = { arcs:0, strokes:0, rects:[], text:[] }
  const ctx = {
    globalAlpha:1, fillStyle:'', strokeStyle:'', font:'', lineWidth:1,
    save() {}, restore() {}, scale() {}, beginPath() {}, fill() {},
    stroke() { calls.strokes++ }, moveTo() {}, lineTo() {},
    arc() { calls.arcs++ }, measureText(text) { return { width:String(text).length * 5 } },
    roundRect(x, y, width, height) { calls.rects.push({ x, y, width, height }) },
    fillText(text, x, y) { calls.text.push({ text, x, y, alpha:this.globalAlpha, color:this.fillStyle, font:this.font }) },
  }
  return { ctx, calls }
}

const item = {
  id:'note-1', x:50, y:60, labelX:50, labelY:42, playable:true,
  fingerLabel:'2', stringLabel:'D', positionLabel:'1',
  showString:true, showPosition:true, locked:true, warnings:[],
  assignment:{ string:1, finger:2, base:2, thumb:false },
}

test('playable fingerings are large, dark, uncircled handwritten graphite', () => {
  assert.match(FINGERING_STYLE.font, /cursive/)
  assert.ok(Number(FINGERING_STYLE.font.match(/(\d+)px/)?.[1]) >= 24, 'finger numeral is at least 24 px')
  assert.ok(FINGERING_STYLE.alpha >= 0.78 && FINGERING_STYLE.alpha <= 0.82, 'graphite is slightly softened but remains readable')
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, [item], 1)
  const digits = calls.text.filter(call => call.text === '2')
  assert.equal(calls.arcs, 0, 'ordinary finger numbers have no enclosing circle')
  assert.equal(calls.rects.length, 0, 'string and position badges are hidden by default')
  assert.ok(digits.length >= 2, 'layered strokes give the numeral a pencil texture')
  assert.ok(digits.every(call => call.color === FINGERING_STYLE.graphite && call.alpha < 1))
  assert.ok(digits.every(call => call.font === FINGERING_STYLE.font))
})

test('selection remains visible without restoring a circle', () => {
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, [item], 1, { selectedId:item.id })
  assert.equal(calls.arcs, 0)
  assert.ok(calls.strokes > 0, 'the selected fingering gets a pencil underline')
})

test('optional string and position details sit beside the notehead', () => {
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, [item], 1, { showDetails:true })
  assert.equal(calls.rects.length, 2)
  assert.ok(calls.rects.every(rect => rect.y === item.y - 7), 'detail pills align with the notehead rather than the fingering numeral')
  assert.ok(calls.rects.every(rect => Math.abs(rect.x + rect.width / 2 - item.x) >= 12), 'detail pills clear the notehead')
})

test('divisi chord-capacity advisory does not add a circled warning mark', () => {
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, [{ ...item, divisi:true, warnings:[{ code:'chord-capacity' }] }], 1)
  assert.equal(calls.arcs, 0)
  assert.equal(calls.rects.length, 0)
  assert.ok(calls.text.some(call => call.text === item.fingerLabel))
})

test('top-edge lock, string, position and warning marks remain inside the canvas', () => {
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, [{ ...item, labelY:18, warnings:[{ code:'test' }] }], 1, { showDetails:true })
  assert.ok(calls.rects.length >= 3)
  assert.ok(calls.rects.every(rect => rect.y >= 0), 'metadata and warning pills are not clipped')
  assert.ok(calls.text.find(call => call.text === '◆')?.y >= 0, 'lock mark is not clipped')
})

test('the fingering size slider scales the numeral and keeps it clear of its note', async () => {
  const { labelAt, fingeringFont } = await import('../overlay.js')
  for (const size of [0.5, 1.5, 2]) {
    const { ctx, calls } = recordingContext()
    drawFingerings(ctx, [item], 1, { size })
    const digits = calls.text.filter(call => call.text === '2')
    assert.ok(digits.length && digits.every(call => call.font === fingeringFont(size)))
    assert.equal(Number(digits[0].font.match(/([\d.]+)px/)[1]), 24 * size)
    // a numeral above its note grows upward: its near edge stays the same distance from the note
    const at = labelAt(item, size), half = 0.36 * 24
    assert.ok(Math.abs((item.y - (at.y + half * size)) - (item.y - (item.labelY + half))) < 1e-9)
  }
  assert.deepEqual(labelAt(item, 1), { x:item.labelX, y:item.labelY })
  // a chord stack spreads with the size so its numerals never overlap
  const low = { ...item, id:'low', labelY:42, stackIndex:0 }, high = { ...item, id:'high', labelY:16, stackIndex:1 }
  for (const size of [1, 1.5, 2]) assert.ok(labelAt(low, size).y - labelAt(high, size).y >= 26 * size - 1e-9)
})
