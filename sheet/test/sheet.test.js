// node --test sheet/test/sheet.test.js   (or bun test sheet/test)
// The score-following pieces that don't need a browser: the timeline, the
// placement in a bar, the page reader on a drawn page, and the hands option.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTimeline, expandForm, createMovementTimeline } from '../timeline.js'
import { place, scanLayout, scanLayoutPages } from '../layout.js'
import { detectPage, barsOf } from '../scan.js'
import { assignHands, handOfTrackName, handModeOf, crossings } from '../../fingering/hands.js'

const clock = (ppq, bpm) => k => k / ppq * 60 / bpm

test('timeline: bars, places, and the bar length from the bars played', () => {
  // the Aria's file: 32 bars of 3/4 at a quarter = 960 ticks (ppq 480), 120 bpm
  const tl = createTimeline({ ppq: 480, ticksToSeconds: clock(480, 120), endTick: 92160 }, { meter: [3, 4], played: 32 })
  assert.equal(tl.barTicks, 2880)
  assert.equal(tl.bars.length, 32)
  const a = tl.at(16.4)
  assert.equal(a.bar, 6); assert.ok(Math.abs(a.frac - (16.4 - 15) / 3) < 1e-9)
  assert.equal(tl.at(0).bar, 1); assert.equal(tl.at(95.9).bar, 32); assert.equal(tl.at(500).bar, 32)
  // and back again (a seek)
  assert.equal(tl.at(1).bar, 1)
})

test('timeline: a form plays the repeats on the printed bars', () => {
  assert.deepEqual(expandForm([[1, 2], [1, 2], [3, 4]]), [1, 2, 1, 2, 3, 4])
  const tl = createTimeline({ ppq: 480, ticksToSeconds: clock(480, 60), endTick: 6 * 1440 }, { meter: [3, 4], form: [[1, 2], [1, 2], [3, 4]] })
  assert.deepEqual(tl.bars.map(b => b.bar), [1, 2, 1, 2, 3, 4])
  assert.equal(tl.at(7.5).bar, 1)   // the third bar played is bar 1 again
  assert.equal(tl.mismatch, null)
  // a form that doesn't fit the file says so
  assert.ok(createTimeline({ ppq: 480, ticksToSeconds: clock(480, 60), endTick: 5 * 1440 }, { meter: [3, 4], form: [[1, 4]] }).bars.length === 4)
})

test('place: by onsets where the layout has them, else by time', () => {
  const bars = new Map([
    [1, { system: 0, x0: 0, x1: 100, start: 10, end: 90, onsets: null }],
    [2, { system: 0, x0: 100, x1: 200, start: 110, end: 190, onsets: [{ frac: 0, x: 112 }, { frac: 0.5, x: 120 }, { frac: 0.75, x: 170 }] }],
  ])
  const L = { bars }
  assert.equal(place(L, { bar: 1, frac: 0.5 }).x, 50)
  assert.equal(place(L, { bar: 2, frac: 0.5 }).x, 120)
  assert.equal(place(L, { bar: 2, frac: 0.625 }).x, 145)
  assert.equal(place(L, { bar: 2, frac: 1 }).x, 190)
  assert.equal(place(L, { bar: 9, frac: 0 }), null)
})

// a page drawn in RGBA: two grand-staff systems, barlines through both staves
function drawPage({ width = 900, height = 700, systems = [[100, [200, 420, 640]], [400, [180, 300, 560, 700]]], slope = 0.01 } = {}) {
  const data = new Uint8ClampedArray(width * height * 4).fill(235)
  const ink = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < width && y < height) { const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 20 } }
  const sp = 10, x0 = 60, x1 = 840
  for (const [top, lines] of systems) {
    const staves = [top, top + 90]
    for (const s of staves) for (let l = 0; l < 5; l++) for (let x = x0; x <= x1; x++) { ink(x, s + l * sp + (x - x0) * slope); ink(x, s + l * sp + 1 + (x - x0) * slope) }
    for (const bx of [x0, ...lines, x1]) for (let y = staves[0]; y <= staves[1] + 4 * sp; y++) { ink(bx, y + (bx - x0) * slope); ink(bx + 1, y + (bx - x0) * slope) }
    // note heads and a stem, which aren't barlines
    for (const hx of [120, 260, 480]) for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) ink(hx + dx, staves[0] + 15 + dy + (hx - x0) * slope)
    for (let y = staves[0] - 20; y < staves[0] + 15; y++) ink(265, y + (265 - x0) * slope)
  }
  return { data, width, height }
}

test('scan: staves, systems and barlines of a drawn page, slanted', () => {
  const p = detectPage(drawPage())
  assert.equal(p.space, 10)
  assert.equal(p.systems.length, 2)
  const bars = barsOf(p)
  assert.deepEqual(bars.map(b => b.length), [4, 5])
  assert.deepEqual(bars.flat().map(b => b.bar), [1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.ok(Math.abs(bars[0][1].x0 - 200.5) <= 1.5, 'bar 2 starts at the first barline')
  // as a layout: each bar's place, after the header on a system's first bar
  const det = { width: p.width, height: p.height, space: p.space, systems: p.systems.map((s, i) => ({ ...s, bars: bars[i].map(b => [b.bar, b.x0, b.x1]) })) }
  const L = scanLayout({ width: p.width, height: p.height }, det, { header: 4, firstHeader: 6 })
  assert.equal(L.systems.length, 2); assert.equal(L.bars.size, 9)
  assert.ok(L.bars.get(1).start > L.bars.get(1).x0 + 50)
  assert.equal(L.bars.get(5).system, 1)
})

test('hands: from the tracks where they name both hands, else automatic', () => {
  assert.equal(handOfTrackName('Right hand'), 'R'); assert.equal(handOfTrackName('Piano LH'), 'L'); assert.equal(handOfTrackName('Left hand · voice 2'), 'L'); assert.equal(handOfTrackName('Piano'), null)
  const notes = [{ midi: 70, track: 0 }, { midi: 50, track: 1 }, { midi: 60, track: 2 }]
  assert.deepEqual(assignHands(notes, ['Right hand', 'Left hand', 'Pedal'], 'tracks'), { source: 'tracks', named: 2 })
  assert.deepEqual(notes.map(n => n.hand), ['R', 'L', undefined])
  // automatic takes them away again
  assert.equal(assignHands(notes, ['Right hand', 'Left hand'], 'auto').source, 'auto')
  assert.deepEqual(notes.map(n => n.hand), [undefined, undefined, undefined])
  // one hand named isn't a split
  assert.equal(assignHands(notes, ['Right hand', 'Piano'], 'tracks').source, 'auto')
  assert.equal(handModeOf('auto'), 'auto'); assert.equal(handModeOf('x'), 'tracks'); assert.equal(handModeOf(null), 'tracks')
})

test('placer: one place for the song, chosen again only when the survey would change', async () => {
  const { createPlacer } = await import('../placer.js')
  const ov = { opts: { position: 'auto', size: 0.2, rows: 1 }, box: (W, H, p) => ({ x: p.endsWith('left') ? 10 : p.endsWith('right') ? W - 310 : (W - 300) / 2, y: p.startsWith('top') ? 10 : H - 110, w: 300, h: 100 }) }
  let scores = { bottom: 0.2, top: 0.1, 'bottom-left': 0.3, 'bottom-right': 0.3, 'top-left': 0.3, 'top-right': 0.3 }, key = 'song A', surveys = 0, reserved = null
  const place = createPlacer(ov, { survey: () => { surveys++; return { scores } }, key: () => key, reserve: r => { reserved = r } })
  assert.equal(place(1000, 600).y, 10, 'the emptiest place over the song, the top')
  assert.ok(reserved.v0 < 0.1, 'held for the intertitles')
  scores = { ...scores, top: 0.9 }
  for (let i = 0; i < 50; i++) assert.equal(place(1000, 600).y, 10, 'and kept while the song plays')
  assert.equal(surveys, 1)
  key = 'song B'
  assert.equal(place(1000, 600).y, 490, 'another song: chosen again')
  ov.opts.position = 'bottom-right'
  assert.equal(place(1000, 600).x, 690, 'a chosen place is kept')
})

test('placer: the panel leaves the liner notes their room', async () => {
  const { choosePlace } = await import('../placer.js')
  const rects = { bottom: { u0: 0.2, v0: 0.76, u1: 0.8, v1: 0.97 }, top: { u0: 0.2, v0: 0.03, u1: 0.8, v1: 0.24 } }
  const itRects = { 'bottom-left': { u0: 0.03, v0: 0.56, u1: 0.5, v1: 0.82 }, 'bottom-right': { u0: 0.5, v0: 0.56, u1: 0.97, v1: 0.82 }, 'top-left': { u0: 0.03, v0: 0.12, u1: 0.5, v1: 0.38 }, 'top-right': { u0: 0.5, v0: 0.12, u1: 0.97, v1: 0.38 }, caption: { u0: 0.2, v0: 0.68, u1: 0.8, v1: 0.93 } }
  const itScores = { 'bottom-left': 0.9, 'bottom-right': 0.9, 'top-left': 0.05, 'top-right': 0.1 }
  // she fills the bottom a little more, but the top is where the intertitles have room
  const base = { scores: { bottom: 0.3, top: 0.25 } }
  assert.equal(choosePlace(rects, base).place, 'top')
  assert.equal(choosePlace(rects, { ...base, intertitles: { on: true, fixed: null, rects: itRects, scores: itScores } }).place, 'bottom')
  // captions at the bottom keep the panel off it
  assert.equal(choosePlace(rects, { scores: { bottom: 0.1, top: 0.6 }, intertitles: { on: true, fixed: 'caption', rects: itRects, scores: itScores } }).place, 'top')
  // no liner notes: her alone decides
  assert.equal(choosePlace(rects, { scores: { bottom: 0.1, top: 0.6 }, intertitles: { on: false } }).place, 'bottom')
})

test('overlay: no score before the first note; it comes up over the half second before it', async () => {
  const { createSheetOverlay } = await import('../overlay.js')
  const { createTimeline } = await import('../timeline.js')
  // a stand-in page and a 2D context that only counts what is drawn
  const page = { width: 100, height: 40 }
  const layout = { page, space: 2, systems: [{ x: 0, y: 0, w: 100, h: 40, staffTop: 10, staffBottom: 30, bars: [1] }], bars: new Map([[1, { system: 0, x0: 0, x1: 100, start: 5, end: 95, onsets: null }]]) }
  const tl = createTimeline({ ppq: 480, ticksToSeconds: k => k / 480, endTick: 4 * 480 }, { meter: [4, 4], played: 1 })
  const ov = createSheetOverlay(layout, tl, { start: 2, style: 'ink', highlight: 'none' })
  const seen = []
  const g = new Proxy({}, { get: (o, k) => k === 'drawImage' ? () => seen.push(g.globalAlpha) : k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true } })
  globalThis.OffscreenCanvas = OffscreenCanvasStub
  ov.draw(g, 1000, 600, 1, { box: { x: 0, y: 0, w: 500, h: 100 } })
  assert.equal(seen.length, 0, 'nothing a second before the first note')
  ov.draw(g, 1000, 600, 1.75, { box: { x: 0, y: 0, w: 500, h: 100 } })
  assert.ok(seen.at(-1) > 0.4 && seen.at(-1) < 0.6, 'half in a quarter second before it: ' + seen.at(-1))
  ov.draw(g, 1000, 600, 2, { box: { x: 0, y: 0, w: 500, h: 100 } })
  assert.equal(seen.at(-1), 1, 'whole as the music starts')
})
// (a canvas for inkOf in node: getImageData of transparent pixels)
class OffscreenCanvasStub {
  constructor(w = 1, h = 1) { this.width = w; this.height = h }
  getContext() { const c = this; return { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(c.width * c.height * 4) }), putImageData() {}, fillRect() {}, set globalCompositeOperation(v) {}, set fillStyle(v) {} } }
}

// two movements, the first played again after the second (a da capo), 2.5 s apart
const MOVES = {
  movements: [
    { id: 'a', title: 'A', bars: 3, starts: [0, 2, 4], end: 6, barAt: [[0, 100, 300], [0, 300, 500], [1, 100, 500]] },
    { id: 'b', title: 'B', bars: 2, starts: [0, 1.5], end: 3, barAt: [[2, 120, 400], [2, 400, 700]] },
  ],
  sequence: ['a', 'b', 'a'],
}
const notesOf = (t0, starts, end) => starts.map((s, i) => ({ time: t0 + s, duration: (starts[i + 1] ?? end) - s }))

test('movements: each found by the silence before it, the da capo on the same bars', () => {
  const notes = [...notesOf(0, [0, 2, 4], 6), ...notesOf(8.5, [0, 1.5], 3), ...notesOf(14, [0, 2, 4], 6)]
  const tl = createMovementTimeline(notes, MOVES)
  assert.equal(tl.mismatch, null)
  assert.deepEqual(tl.bars.map(b => b.bar), [1, 2, 3, 4, 5, 1, 2, 3])
  assert.deepEqual(tl.movements.map(m => [m.id, m.t0]), [['a', 0], ['b', 8.5], ['a', 14]])
  assert.equal(tl.at(9).bar, 4)
  assert.ok(Math.abs(tl.at(9).frac - 1 / 3) < 1e-9)
  // in the silence between two movements: the last bar, held at its end
  const gap = tl.at(7.2)
  assert.equal(gap.bar, 3); assert.equal(gap.frac, 1)
  assert.equal(tl.at(16.5).bar, 2); assert.equal(tl.at(16.5).movement, 'a')
  // (and back, as a seek goes)
  assert.equal(tl.at(1).bar, 1)
  // a file that plays fewer movements than the sequence lists says so
  assert.deepEqual(createMovementTimeline(notes.slice(0, 5), MOVES).mismatch, { performed: 2, form: 3 })
})

test('pages: systems through every page, bars keyed through every movement', () => {
  const sys = (top, x0 = 100, x1 = 700) => ({ x0, x1, staves: [{ top, bottom: top + 40 }, { top: top + 100, bottom: top + 140 }] })
  const pages = [{ width: 800, height: 1000, space: 10, systems: [sys(100), sys(300)] }, { width: 800, height: 1000, space: 12, systems: [sys(150)] }]
  const asked = []
  const L = scanLayoutPages(pages, MOVES.movements, { pageOf: (pi, si) => { asked.push([pi, si]); return pi === 0 ? 'page0' : null }, header: 5, firstHeader: 7.5 })
  assert.equal(L.systems.length, 3)
  assert.deepEqual(L.systems.map(s => s.pageIndex), [0, 0, 1])
  assert.deepEqual(L.systems.map(s => s.bars), [[1, 2], [3], [4, 5]])
  assert.equal(L.systems[2].space, 12)
  // a slice stops halfway to the next system on its page, and at the page's own top
  assert.equal(L.systems[0].y + L.systems[0].h, (240 + 300) / 2)
  assert.equal(L.systems[2].y, 150 - 4.5 * 12)
  // the cursor starts past the opening: the time signature on a movement's first bar, the clef and key on a system's first
  assert.equal(L.bars.get(1).start, 100 + 7.5 * 10)
  assert.equal(L.bars.get(3).start, 100 + 5 * 10)
  assert.equal(L.bars.get(2).start, 300 + 0.9 * 10)
  assert.equal(L.bars.get(4).start, 120 + 7.5 * 12)
  assert.equal(L.bars.get(5).system, 2)
  assert.equal(L.pageOf(1), 'page0'); assert.equal(L.pageOf(2), null)
  assert.deepEqual(asked, [[0, 1], [1, 2]])
  const p = place(L, { bar: 4, frac: 0 })
  assert.equal(p.system, 2)
})

test('hands: automatic, with the tracks where they cross', async () => {
  const { fingerPiece } = await import('../../fingering/fingering.js')
  // 0-4 s: the hands apart; 4-6 s: the left hand reaches over the right, 6 times; 6-10 s: apart
  // again; and at 8 s a held tenor note under one brief low treble note (once: no crossing)
  const notes = []
  for (let i = 0; i < 40; i++) {
    const t = i * 0.25, over = t >= 4 && t < 5.5
    notes.push({ midi: over ? 62 : 72 + (i % 5), time: t, duration: 0.25, track: 0 })
    if (i % 2 === 0) notes.push({ midi: over ? 76 + (i % 3) : 48 + (i % 4), time: t, duration: 0.5, track: 1 })
  }
  notes.push({ midi: 58, time: 8, duration: 1, track: 1 }, { midi: 57, time: 8.1, duration: 0.1, track: 0 })
  const names = ['Right hand', 'Left hand']
  const hand = names.map(handOfTrackName)
  const ps = crossings(notes, hand)
  assert.equal(ps.length, 1)
  assert.ok(Math.abs(ps[0][0] - 3) < 1e-9 && Math.abs(ps[0][1] - 6.25) < 1e-9, JSON.stringify(ps))
  const r = assignHands(notes, names, 'crossings')
  assert.equal(r.source, 'crossings')
  // the tracks' hands from 3 to 6.25 s, none elsewhere (the fingering's)
  for (const n of notes) assert.equal(n.hand, n.time >= 3 && n.time <= 6.25 ? hand[n.track] : undefined)
  const f = fingerPiece(notes.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, ...(n.hand ? { hand: n.hand } : {}) })))
  f.notes.forEach((n, i) => { if (notes[i].time >= 4 && notes[i].time < 5.5) assert.equal(n.hand, hand[notes[i].track]) })
  // a file whose tracks never cross: automatic throughout
  const apart = notes.filter(n => n.time < 4)
  assert.deepEqual(assignHands(apart, names, 'crossings'), { source: 'auto', named: 0, passages: [] })
  assert.equal(handModeOf('crossings'), 'crossings')
})
