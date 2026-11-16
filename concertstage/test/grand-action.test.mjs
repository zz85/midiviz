// node --test concertstage/test/grand-action.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGrandAction, hammerSpeed, REGULATION as R } from '../grand-action.js'

const C4 = 60 - 21, LEAD = 0.03

// Play a list of events [{ t, k, on, vel }] at a fixed frame rate; returns the
// strikes and a trace of key k's state per frame
function play(events, { fps = 60, until = 1, trace = null, setup } = {}) {
  const strikes = []
  const A = createGrandAction({ onStrike: (k, t, v) => strikes.push({ k, t, v }) })
  setup?.(A)
  const ev = [...events].sort((a, b) => a.t - b.t)
  const frames = []
  let i = 0
  for (let f = 0; f * (1 / fps) <= until + 1e-9; f++) {
    const t = f / fps
    // events fall between frames: step up to each one, then apply it
    while (i < ev.length && ev[i].t <= t + 1e-12) {
      A.step(ev[i].t - A.now)
      const e = ev[i++]
      e.on ? A.press(e.k, e.vel ?? 0.7, e.lead ?? LEAD) : e.pedal != null ? A.setSustain(e.pedal) : A.release(e.k)
    }
    A.step(t - A.now)
    if (trace != null) { const a = A.keys[trace]; frames.push({ t, h: a.h, dip: A.dipShare(trace), dy: a.dy, mode: a.mode, hMax: a.hMax }) }
  }
  return { A, strikes, frames }
}
const note = (k, on, off, vel = 0.7) => [{ t: on - LEAD, k, on: true, vel }, { t: off, k, on: false }]

test('the hammer reaches the string at the note, at every velocity and frame rate', () => {
  for (const fps of [24, 30, 60, 144])
    for (const vel of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const { strikes } = play(note(C4, 0.2, 0.6, vel), { fps })
      assert.equal(strikes.length, 1, `one strike at fps ${fps} vel ${vel}`)
      assert.ok(Math.abs(strikes[0].t - 0.2) < 0.0006, `on time (${(strikes[0].t - 0.2) * 1000} ms) fps ${fps} vel ${vel}`)
      const want = hammerSpeed(vel)
      assert.ok(Math.abs(strikes[0].v - want) / want < 0.06, `speed ${strikes[0].v} vs ${want}`)
    }
})

test('hammer speeds span pp to ff as measured (about 1 to 6.5 m/s), louder is faster', () => {
  let last = 0
  for (let v = 0; v <= 1.0001; v += 0.1) {
    const { strikes } = play(note(C4, 0.2, 0.5, v))
    assert.ok(strikes[0].v > last); last = strikes[0].v
  }
  assert.ok(play(note(C4, 0.2, 0.5, 0)).strikes[0].v < 110)
  assert.ok(last > 600 && last < 700)
})

test('a held key: the backcheck holds the hammer about 15 mm under the string', () => {
  const { frames, A } = play(note(C4, 0.1, 0.8), { trace: C4, fps: 240 })
  const at = t => frames.find(f => f.t >= t)
  const held = at(0.5)
  assert.equal(held.mode, 'check')
  assert.ok(Math.abs(A.keys[C4].blow - held.h - R.check) < 0.01, `check gap ${A.keys[C4].blow - held.h}`)
  assert.equal(held.dip, 1)
})

test('let go a little: the repetition lever lifts the hammer off the check, and it can strike again from partway up', () => {
  const strikes = []
  const A2 = createGrandAction({ onStrike: (k, t) => strikes.push(t) })
  A2.press(C4, 0.6, LEAD); A2.step(0.2)
  const k = A2.keys[C4]
  assert.equal(k.mode, 'check')
  const checked = k.h
  // release, and press again as the key passes half its dip on the way up
  A2.release(C4)
  let top = 0
  while (A2.dipShare(C4) > 0.5) { A2.step(0.001); top = Math.max(top, k.h) }
  assert.ok(top > checked + 0.4, `lifted from ${checked} to ${top}`)
  const before = A2.now
  A2.press(C4, 0.6, LEAD); A2.step(0.1)
  assert.equal(strikes.length, 2)
  assert.ok(Math.abs(strikes[1] - (before + LEAD)) < 0.0006)
})

test('fast repeated notes (a 16 Hz repetition) each strike on time', () => {
  const ev = []
  for (let i = 0; i < 12; i++) ev.push(...note(C4, 0.1 + i / 16, 0.1 + i / 16 + 0.03, 0.6))
  const { strikes } = play(ev, { fps: 60, until: 1.2 })
  assert.equal(strikes.length, 12)
  strikes.forEach((s, i) => assert.ok(Math.abs(s.t - (0.1 + i / 16)) < 0.0006, `strike ${i} at ${s.t}`))
})

test('a staccato note: the hammer falls back to its rest rail and the key, the damper and the hammer settle', () => {
  const { frames } = play(note(C4, 0.1, 0.12), { trace: C4, until: 1.5 })
  const end = frames.at(-1)
  assert.ok(end.h < 1e-3 && end.dip < 1e-3 && end.dy < 1e-3, JSON.stringify(end))
  assert.ok(frames.every(f => f.h >= -1e-9 && f.dip >= -1e-9), 'never below rest')
})

test('the damper leaves the string before the hammer strikes it, and drops on release', () => {
  const { frames } = play(note(C4, 0.2, 0.5), { trace: C4, fps: 1000 })
  const before = frames.find(f => f.t >= 0.199)
  assert.ok(before.dy > 0.5 * R.damperLift, `damper ${before.dy} just before the strike`)
  const after = frames.find(f => f.t >= 0.7)
  assert.ok(after.dy < 0.01, `damper back down: ${after.dy}`)
})

test('the right pedal keeps the dampers up after the keys rise', () => {
  const ev = [{ t: 0, pedal: 1 }, ...note(C4, 0.1, 0.2), { t: 0.6, pedal: 0 }]
  const { frames } = play(ev, { trace: C4, until: 1.2 })
  assert.ok(frames.find(f => f.t >= 0.5).dy > 0.85)
  assert.ok(frames.at(-1).dy < 0.01)
})

test('the keys above E6 have no dampers', () => {
  const A = createGrandAction()
  assert.equal(A.keys[88 - 21].damper, true)
  assert.equal(A.keys[89 - 21].damper, false)
})

test('the same performance gives the same motion at 30 and at 240 frames a second', () => {
  const ev = [...note(C4, 0.1, 0.4, 0.8), ...note(C4, 0.45, 0.47, 0.3), ...note(C4, 0.55, 0.9, 1)]
  const a = play(ev, { fps: 30, trace: C4, until: 1 })
  const b = play(ev, { fps: 240, trace: C4, until: 1 })
  for (const f of a.frames) {
    const g = b.frames.find(x => Math.abs(x.t - f.t) < 1e-9)
    assert.ok(Math.abs(f.h - g.h) < 0.02 && Math.abs(f.dip - g.dip) < 1e-3, `t ${f.t}: ${f.h} vs ${g.h}`)
  }
  assert.deepEqual(a.strikes.map(s => s.t.toFixed(4)), b.strikes.map(s => s.t.toFixed(4)))
})
