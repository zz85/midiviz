// node --test score-fingering/test/stand.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toLocal, toScreen, localRect, localDelta, wheelTurner } from '../stand.js'

const vw = 1400, vh = 900

test('screen and app frames are inverse quarter turns', () => {
  for (const dir of [1, -1, 0]) for (const [u, v] of [[0, 0], [120, 40], [vh, vw], [333, 1001]]) {
    const s = toScreen(u, v, dir, vw, vh), back = toLocal(s.x, s.y, dir, vw, vh)
    assert.deepEqual([back.u, back.v], [u, v])
  }
  // clockwise: the app's top-left is the screen's top-right; its top edge runs down the right side
  assert.deepEqual(toScreen(0, 0, 1, vw, vh), { x:vw, y:0 })
  assert.deepEqual(toScreen(vh, 0, 1, vw, vh), { x:vw, y:vh })
  // counter-clockwise: the app's top-left is the screen's bottom-left
  assert.deepEqual(toScreen(0, 0, -1, vw, vh), { x:0, y:vh })
})

test('a rotated element\'s screen box is its box in the app frame', () => {
  // an element at app (100, 200) sized 300 x 50
  for (const dir of [1, -1]) {
    const a = toScreen(100, 200, dir, vw, vh), b = toScreen(400, 250, dir, vw, vh)
    const screen = { left:Math.min(a.x, b.x), right:Math.max(a.x, b.x), top:Math.min(a.y, b.y), bottom:Math.max(a.y, b.y) }
    assert.deepEqual(localRect(screen, dir, vw, vh), { left:100, top:200, right:400, bottom:250, width:300, height:50 })
  }
})

test('wheel and drag movements follow the rotated page', () => {
  for (const dir of [1, -1]) {
    // moving 10 px down the page in the app frame, as the screen sees it
    const a = toScreen(50, 50, dir, vw, vh), b = toScreen(50, 60, dir, vw, vh)
    const d = localDelta(b.x - a.x, b.y - a.y, dir); assert.equal(d.du + 0, 0); assert.equal(d.dv, 10)
  }
  assert.deepEqual(localDelta(3, 4, 0), { du:3, dv:4 })
})

test('one page turn per wheel gesture, inertia included', () => {
  const turn = wheelTurner({ threshold:100, gap:300, settle:200 })
  let t = 0, turns = []
  // a swipe of 15 events, then its inertia tail, all within 30 ms of each other
  for (let i = 0; i < 15; i++) { const s = turn(30, t); if (s) turns.push(s); t += 16 }
  for (let i = 0; i < 20; i++) { const s = turn(8, t); if (s) turns.push(s); t += 16 }
  assert.deepEqual(turns, [1])
  // a pause, then a swipe back
  t += 500
  for (let i = 0; i < 10; i++) { const s = turn(-30, t); if (s) turns.push(s); t += 16 }
  assert.deepEqual(turns, [1, -1])
  // small nudges never turn
  t += 500; assert.equal(turn(40, t), 0); t += 400; assert.equal(turn(40, t), 0)
})
