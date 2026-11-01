// node --test sheet/test/sheet.test.js   (or bun test sheet/test)
// The score-following pieces that don't need a browser: the timeline, the
// placement in a bar, the page reader on a drawn page, and the hands option.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTimeline, expandForm } from '../timeline.js'
import { place, scanLayout } from '../layout.js'
import { detectPage, barsOf } from '../scan.js'
import { assignHands, handOfTrackName, handModeOf } from '../../fingering/hands.js'

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

test('placer: automatic placement stays put, then moves; a cut moves it at once', async () => {
  const { createPlacer, DWELL } = await import('../placer.js')
  const ov = { opts: { position: 'auto' }, box: (W, H, p) => ({ x: p.endsWith('left') ? 10 : p.endsWith('right') ? W - 310 : (W - 300) / 2, y: p.startsWith('top') ? 10 : H - 110, w: 300, h: 100 }) }
  let scores = { bottom: 0.2, top: 0.1, 'bottom-left': 0.3, 'bottom-right': 0.3, 'top-left': 0.3, 'top-right': 0.3 }, reserved = null
  const pick = (places, prefer, margin) => {
    let best = null; for (const k in places) if (best == null || scores[k] < scores[best]) best = k
    if (prefer in places && scores[prefer] <= scores[best] + margin) best = prefer
    return { place: best, scores }
  }
  const place = createPlacer(ov, { pick, reserve: r => { reserved = r } })
  assert.equal(place(1000, 600, 0).y, 10, 'starts at the emptiest place, the top')
  assert.ok(reserved.v0 < 0.1, 'and holds it for the intertitles')
  scores = { ...scores, top: 0.3, bottom: 0.1 }
  assert.equal(place(1000, 600, 1).y, 10, 'stays: not there DWELL seconds yet')
  place(1000, 600, DWELL + 0.1)
  assert.equal(place(1000, 600, DWELL + 0.1 + 1).y, 490, 'then moves to the bottom (gliding there)')
  scores = { ...scores, top: 0.1, bottom: 0.9 }
  place(1000, 600, DWELL + 2)
  assert.equal(place(1000, 600, DWELL + 2.6).y, 10, 'a cut that puts her behind it moves it at once')
  ov.opts.position = 'bottom-right'
  assert.equal(place(1000, 600, 9).x, 690, 'a chosen place is kept')
})
