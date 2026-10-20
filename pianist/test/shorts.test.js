// bun test pianist/test
// YouTube Shorts: the clip recommender (pianist/shorts.js) and the director's
// Short mode (planShort in pianist/director.js), on made-up songs.
import { test, expect, mock } from 'bun:test'

import * as shim from './three-shim.mjs'
// (a module object, not import(): a second test file importing it again under the same mock hangs bun 1.3)
mock.module('three', () => shim)
const { Vector3 } = shim
const { planShort, createDirector, SPOTS, PORTRAIT, spotFor } = await import('../director.js')
const { suggestClips, snapStart, snapEnd, clipOf, SHORT_MAX } = await import('../shorts.js')

// phrases of 4–7 s with a short breath between; a quiet song with one loud
// passage from `peak` to `peak + 30`
function song(k, duration = 240, peak = 120) {
  const phrases = []
  let t = 1 + k * 0.37
  while (t < duration - 3) { const L = 4 + 3 * Math.abs(Math.sin(t * 1.3 + k)); phrases.push([t, t + L - 0.4, 0]); t += L }
  const energyAt = t => 0.25 + 0.05 * Math.sin(t / 7 + k) + (t > peak && t < peak + 30 ? 0.55 : 0)
  return { duration, phrases, glances: [], energyAt }
}
const kind = n => ({ hands: 'hands', feet: 'hands', head: 'her', figure: 'her' })[SPOTS[n].subj] || 'piano'

test('suggestions start on phrase starts, end on phrase ends, and find the loud passage', () => {
  for (let k = 0; k < 10; k++) {
    const s = song(k), sug = suggestClips(s)
    expect(sug.length).toBe(3)
    for (const c of sug) {
      expect(s.phrases.some(p => Math.abs(p[0] - c.a) < 1e-9)).toBe(true)
      expect(s.phrases.some(p => Math.abs(p[1] - c.b) < 1e-9)).toBe(true)
      expect(c.b - c.a).toBeGreaterThan(20)
      expect(c.b - c.a).toBeLessThan(62)
      expect(typeof c.reason).toBe('string')
    }
    // the best one is in the loud passage, and opens there
    expect(sug[0].a).toBeGreaterThan(118)
    expect(sug[0].a).toBeLessThan(150)
    // the three don't cover the same music
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const [x, y] = [sug[i], sug[j]]
      expect(Math.min(x.b, y.b) - Math.max(x.a, y.a)).toBeLessThan(0.5 * Math.min(x.b - x.a, y.b - y.a) + 1e-9)
    }
  }
  expect(suggestClips(song(3))).toEqual(suggestClips(song(3)))
})

test('a piece under three minutes can be a Short whole; a held note over the in point counts against it', () => {
  const s = song(1, 150, 60), sug = suggestClips(s, { lengths: [30, 45], count: 6 })
  expect(sug.some(c => c.whole)).toBe(true)
  const whole = sug.find(c => c.whole)
  expect(whole.b - whole.a).toBeLessThanOrEqual(SHORT_MAX)
  const a = s.phrases[15][0]
  const free = suggestClips({ ...s, notes: [] }, { lengths: [30], count: 100 }).find(c => c.a === a)
  const held = suggestClips({ ...s, notes: [{ on: a - 2, off: a + 2 }] }, { lengths: [30], count: 100 }).find(c => c.a === a)
  if (free && held) expect(held.score).toBeLessThan(free.score)
})

test('snapping goes to the nearest phrase edge; a clip keeps to its length', () => {
  const s = song(2)
  const p = s.phrases[10]
  expect(snapStart(p[0] + 0.7, s.phrases)).toBe(p[0])
  expect(snapEnd(p[1] - 0.6, s.phrases)).toBe(p[1])
  const [a, b] = clipOf(p[0], 30, s.phrases, s.duration)
  expect(a).toBe(p[0])
  expect(Math.abs(b - a - 30)).toBeLessThan(4)
})

test('a Short: portrait spots only, the hands first, cuts every few seconds, back where it began', () => {
  for (let k = 0; k < 20; k++) {
    const s = song(k), a = s.phrases[12 + k][0], b = a + 30 + k
    const sh = planShort(s, { window: [a, b] })
    expect(sh[0].t0).toBeLessThanOrEqual(a - 1)
    expect(sh.at(-1).t1).toBeGreaterThanOrEqual(b + 2)
    expect(kind(sh[0].name)).toBe('hands')
    expect(SPOTS[sh[0].name].size).toBe(0)
    expect(sh.at(-1).name).toBe(sh[0].name)
    for (let i = 0; i < sh.length; i++) {
      expect(PORTRAIT[sh[i].name]?.p).toBeGreaterThan(0)
      if (i) { expect(sh[i].t0).toBe(sh[i - 1].t1); expect(sh[i].name).not.toBe(sh[i - 1].name) }
      // (inside the clip; the first and last carry the pre-roll and the tail)
      const len = Math.min(sh[i].t1, b) - Math.max(sh[i].t0, a)
      if (i && i < sh.length - 1) { expect(len).toBeGreaterThan(2.1); expect(len).toBeLessThan(9.5) }
      expect(spotFor(sh[i].name, true).size).toBeLessThan(2)
    }
    expect(sh.length).toBeGreaterThan(4)
  }
  const s = song(5), w = { window: [s.phrases[20][0], s.phrases[20][0] + 40] }
  expect(planShort(s, w)).toEqual(planShort(s, w))
  // another clip of the same piece: another film
  const w2 = { window: [s.phrases[28][0], s.phrases[28][0] + 40] }
  expect(planShort(s, w).map(x => x.name).slice(1, 4).join()).not.toBe(planShort(s, w2).map(x => x.name).slice(1, 4).join())
})

test('a Short ends on the framing it opened with', () => {
  const s = song(4), a = s.phrases[15][0], b = a + 32
  const d = createDirector({ portrait: true, window: [a, b] })
  d.setSong(s)
  const live = { head: new Vector3(0, 122, 32), hands: new Vector3(0, 76, 0) }
  for (let t = a - 1; t < a; t += 1 / 30) d.update(t, 1 / 30, live)
  const start = d.update(a, 1 / 30, live)
  const p0 = start.pos.clone(), f0 = start.fov
  const last = d.shots.at(-1)
  for (let t = a; t < last.t0; t += 1 / 30) d.update(t, 1 / 30, live)
  // (the last shot's move runs over its whole length, padding included)
  let o = null
  for (let t = last.t0; t <= last.t1; t += 1 / 30) o = d.update(t, 1 / 30, live)
  expect(o.pos.distanceTo(p0)).toBeLessThan(0.08 * spotFor(last.name, true).dist)
  expect(Math.abs(o.fov - f0)).toBeLessThan(1)
  expect(d.update(a, 1 / 30, live).fade).toBe(1)
})

test('a stacked Short: her above and the hands below, each on its own plan, never cutting together', () => {
  // (her: close or medium, from the front half; not from the hall)
  const { HALVES } = { HALVES: { her: n => ['head', 'figure'].includes(SPOTS[n].subj), hands: n => ['hands', 'hammers'].includes(SPOTS[n].subj) } }
  for (let k = 0; k < 20; k++) {
    const s = song(k), a = s.phrases[10 + k][0], b = a + 35 + k
    const lo = planShort(s, { window: [a, b], half: 'hands' })
    const cuts = lo.slice(1).map(x => x.t0)
    const hi = planShort(s, { window: [a, b], half: 'her', avoid: cuts })
    for (const [plan, f] of [[lo, HALVES.hands], [hi, HALVES.her]]) {
      for (const x of plan) {
        expect(f(x.name)).toBe(true)
        expect(SPOTS[x.name].size).toBeLessThan(2)
      }
      expect(plan.at(-1).name).toBe(plan[0].name)
      expect(plan[0].t0).toBeLessThanOrEqual(a - 1)
    }
    // her face shows: nothing from behind
    for (const x of hi) expect(Math.abs(((SPOTS[x.name].az + 540) % 360) - 180)).toBeGreaterThanOrEqual(60)
    // the top cuts less often, and never with the bottom
    const her = hi.slice(1).map(x => x.t0)
    expect(her.length).toBeLessThan(cuts.length)
    for (const t of her) for (const c of cuts) expect(Math.abs(t - c)).toBeGreaterThanOrEqual(0.8 - 1e-9)
  }
  const d = createDirector({ half: 'her', window: [20, 50] })
  d.setSong(song(1))
  expect(d.update(20, 1 / 30, { head: new Vector3(0, 122, 32), hands: new Vector3(0, 76, 0) }).fade).toBe(1)
})
