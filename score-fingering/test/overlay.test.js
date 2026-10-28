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
  // a chord stack keeps the same small gap between its numerals at every size
  const { stackStep, DIGIT_HEIGHT } = await import('../adapter.js')
  const low = { ...item, id:'low', labelY:42, stackIndex:0 }, high = { ...item, id:'high', labelY:42 - stackStep(1), stackIndex:1 }
  for (const size of [0.5, 1, 1.5, 2]) {
    const gap = labelAt(low, size).y - labelAt(high, size).y - DIGIT_HEIGHT * size
    assert.ok(Math.abs(gap - (stackStep(1) - DIGIT_HEIGHT)) < 1e-9, `gap at ${size}`)
  }
})

test('labels move off printed ink and other labels, and a stack moves together', async () => {
  const { placeLabels, labelAt } = await import('../overlay.js')
  const { DIGIT_HEIGHT, stackStep } = await import('../adapter.js')
  // printed text ("div.") right where the numeral would go
  const isInk = (x, y) => x >= 40 && x <= 60 && y >= 38 && y <= 48
  const a = { ...item, id:'a' }, clear = { ...item, id:'clear', x:150, labelX:150 }
  placeLabels([a, clear], 1, isInk)
  const at = labelAt(a, 1), half = DIGIT_HEIGHT / 2
  let inked = 0
  for (let y = at.y - half; y <= at.y + half; y++) for (let x = at.x - 8; x <= at.x + 8; x++) if (isInk(x, y)) inked++
  assert.equal(inked, 0, `moved clear of the text (${at.x}, ${at.y})`)
  assert.ok(Math.abs(at.y - a.labelY) <= 48 && Math.abs(at.x - a.labelX) <= 18, 'stays close to its note')
  assert.deepEqual(labelAt(clear, 1), { x:150, y:42 }, 'a label over blank paper stays put')
  const low = { ...item, id:'low', stackKey:'s', stackIndex:0 }, high = { ...item, id:'high', labelY:42 - stackStep(1), stackKey:'s', stackIndex:1 }
  placeLabels([low, high], 1, isInk)
  assert.equal(labelAt(low, 1).y - labelAt(high, 1).y, stackStep(1))
  assert.equal(labelAt(low, 1).x, labelAt(high, 1).x)
  // two labels that would collide are separated
  const p = { ...item, id:'p' }, q = { ...item, id:'q', x:60, labelX:60 }
  placeLabels([p, q], 1, () => false)
  const P = labelAt(p, 1), Q = labelAt(q, 1)
  assert.ok(Math.abs(P.x - Q.x) >= 14 || Math.abs(P.y - Q.y) >= DIGIT_HEIGHT, 'labels do not overlap')
})

test('repeated fingers are written once, and again after a rest, a new system or a long run', async () => {
  const { markRepeats } = await import('../adapter.js')
  const st0 = { index:0 }, st1 = { index:1 }
  const make = (on, finger, st = st0, off = on + 0.5) => ({ on, off, finger, st })
  const seq = [make(0, 3), make(0.5, 3), make(1, 3), make(1.5, 4), make(2, 4), make(3, 4), make(3.5, 4, st1), make(4, 4, st1)]
  for (let t = 4.5; t < 8.5; t += 0.5) seq.push(make(t, 4, st1))
  const notes = seq.map(n => ({ on:n.on, off:n.off }))
  const items = seq.map((n, index) => ({ index, id:`n${index}`, playable:true, locked:false, warnings:[], source:{ st:n.st }, assignment:{ finger:n.finger, string:1, base:1 } }))
  markRepeats(items, notes, { quarterSeconds:0.5 })
  const shown = items.filter(item => !item.repeat).map(item => item.index)
  // 0: first 3; 3: change to 4; 5: after a beat's rest; 6: new system; 12: six beats after 6
  assert.deepEqual(shown, [0, 3, 5, 6, 12])
  const { ctx, calls } = recordingContext()
  drawFingerings(ctx, items.map(it => ({ ...it, fingerLabel:String(it.assignment.finger), labelX:it.index * 30, labelY:20, x:it.index * 30, y:40 })), 1)
  assert.equal(calls.text.length, shown.length * 2, 'only the shown numerals are drawn (two pencil layers each)')
})

test('a repeated double stop is written once', async () => {
  const { markRepeats } = await import('../adapter.js')
  const st = { index:0 }, items = [], notes = []
  for (let k = 0; k < 3; k++) for (const [finger, string] of [[3, 1], [1, 2]]) {
    const index = items.length
    notes.push({ on:k * 0.5, off:k * 0.5 + 0.5 })
    items.push({ index, id:`c${index}`, stackKey:`s${k}`, playable:true, locked:false, warnings:[], source:{ st }, assignment:{ finger, string, base:1 } })
  }
  markRepeats(items, notes)
  assert.deepEqual(items.map(item => item.repeat), [false, false, true, true, true, true])
})

test('large numerals near the top of the page stay on the page, stacks included', async () => {
  const { labelAt } = await import('../overlay.js')
  const { DIGIT_HEIGHT, stackStep } = await import('../adapter.js')
  const top = { ...item, id:'t', y:40, labelY:18 }
  for (const size of [1, 2, 3]) assert.ok(labelAt(top, size).y - DIGIT_HEIGHT / 2 * size >= 1.9, `inside at ${size}`)
  const hi = { ...item, id:'h', y:60, labelY:18, stackIndex:1, stackCount:2 }, lo = { ...item, id:'l', y:70, labelY:18 + stackStep(1), stackIndex:0, stackCount:2 }
  const H = labelAt(hi, 2), L = labelAt(lo, 2)
  assert.ok(H.y - DIGIT_HEIGHT >= 1.9)
  assert.ok(Math.abs(L.y - H.y - stackStep(2)) < 1e-9, 'the stack keeps its spacing')
})

test('a label is never lifted above its ceiling (the staff above)', async () => {
  const { placeLabels, labelAt } = await import('../overlay.js')
  const { DIGIT_HEIGHT } = await import('../adapter.js')
  const isInk = (x, y) => y >= 30 && y <= 50   // ink all around the label
  const a = { ...item, id:'c' }
  placeLabels([a], 1, isInk, { ceiling:() => 25 })
  assert.ok(labelAt(a, 1).y - DIGIT_HEIGHT / 2 - 2 >= 25 - 1e-9 || labelAt(a, 1).y === a.labelY)
})
