// bun test pianist/test
// Regression checks for the camera director (pianist/director.js) on made-up
// songs: phrases of 4–7 s and a rising and falling energy curve.
import { test, expect, mock } from 'bun:test'

// the page gets three.js from a CDN; here a stand-in with the bits the director uses
// (a module object, not import(): a factory that imports hangs bun 1.3 once another test file has mocked 'three')
const shim = await import('./three-shim.mjs')
mock.module('three', () => shim)
const { Vector3 } = shim
const { planShots, planShort, createDirector, SPOTS, stringsShare, STRINGS_LEVELS, showsFeet } = await import('../director.js')

function song(k, duration = 600) {
  const phrases = []
  let t = 1 + k * 0.37
  while (t < duration) { const L = 4 + 3 * Math.abs(Math.sin(t * 1.3 + k)); phrases.push([t, t + L - 0.3, 0]); t += L }
  return { duration, phrases, glances: [], energyAt: t => 0.45 + 0.4 * Math.sin(t / 25 + k) }
}
const songs = Array.from({ length: 20 }, (_, k) => song(k))
const films = songs.map(s => planShots(s))

test('the film covers the song with real spots, and repeats for the same song', () => {
  for (const sh of films) {
    expect(sh[0].t0).toBe(0)
    for (let i = 1; i < sh.length; i++) {
      expect(SPOTS[sh[i].name]).toBeDefined()
      expect(sh[i].t0).toBe(sh[i - 1].t1)
      expect(sh[i].name).not.toBe(sh[i - 1].name)
    }
  }
  expect(planShots(song(3))).toEqual(planShots(song(3)))
  expect(planShots(song(3))[3].name + planShots(song(3))[4].name).not.toBe(planShots(song(4))[3].name + planShots(song(4))[4].name)
})

test('never much more than a minute without a wide shot or her face', () => {
  const faceSeen = s => ['head', 'figure'].includes(s.subj) && Math.abs(((s.az + 540) % 360) - 180) >= 80 && s.el < 45
  for (const sh of films) {
    let wide = 0, face = 0
    for (const s of sh) {
      expect(s.t0 - wide).toBeLessThan(75)
      expect(s.t0 - face).toBeLessThan(75)
      if (SPOTS[s.name].size === 2) wide = s.t1
      if (faceSeen(SPOTS[s.name])) face = s.t1
    }
  }
})

test('Across the piano gets the most screen time; top down stays rare', () => {
  const time = {}
  for (const sh of films) for (const s of sh.slice(1)) time[s.name] = (time[s.name] || 0) + s.t1 - s.t0
  const total = Object.values(time).reduce((a, b) => a + b, 0), pct = n => 100 * (time[n] || 0) / total
  expect(Object.keys(time).sort((a, b) => time[b] - time[a])[0]).toBe('tail')
  expect(pct('top')).toBeLessThan(7)
  expect(pct('shoulder')).toBeLessThan(10)
})

test('the camera stays outside the piano and holds still within a shot', () => {
  const d = createDirector()
  d.setSong(song(2, 120))
  const live = { head: new Vector3(0, 122, 32), hands: new Vector3(0, 76, 0) }
  let shot = null, aim = null
  for (let i = 0; i < 120 * 60; i++) {
    const t = i / 60
    live.head.set(8 * Math.sin(i / 50), 122, 32); live.hands.set(30 * Math.sin(i / 90), 76, 0)
    const o = d.update(t, 1 / 60, live), p = o.pos
    expect(Math.abs(p.x) < 82 && p.y > 58 && p.y < 106 && p.z > -215 && p.z < 4).toBe(false)   // (the case: rim bottom to rim top; under the keybed is open)
    const sh = d.shots.find(s => s.t0 <= t && s.t1 > t)
    if (sh !== shot || t < sh.t0 + sh.glide + 0.05) { shot = sh; aim = o.target.clone() }
    else expect(o.target.distanceTo(aim)).toBeLessThan(2)   // (the handheld sway moves it a few mm)
  }
})

test("Director's cut: orbit first, no two zooms or cranes in a row, a new framing every take", () => {
  const d = createDirector(), live = { head: new Vector3(0, 122, 32), hands: new Vector3(0, 76, 0) }
  const view = { pos: [-42, 178, 104], target: [8, 82, -12], fov: 40 }, takes = []
  for (let i = 0; i < 300 * 30; i++) { const o = d.sequence(view, 'cut', i / 30, live); if (o.shot !== takes.at(-1)) takes.push(o.shot) }
  expect(takes[0].move).toBe('orbit')
  for (let i = 1; i < takes.length; i++) {
    const a = takes[i - 1], b = takes[i]
    expect(a.move.startsWith('zoom') && b.move.startsWith('zoom')).toBe(false)
    expect(a.move === 'crane' && b.move === 'crane').toBe(false)
    expect(b.frame).not.toBe(a.frame)
  }
})

test('Inside the piano: avoided, every shot keeps the strings under its limit, and there is still a film', () => {
  // (the estimate itself: the hammers close-up is mostly strings, along the keys none)
  expect(stringsShare('hammers')).toBeGreaterThan(0.5)
  expect(stringsShare('keys')).toBeLessThan(0.01)
  expect(stringsShare('lowRight')).toBeLessThan(0.01)
  for (const [level, max] of Object.entries(STRINGS_LEVELS)) {
    for (let k = 1; k <= 4; k++) {
      const s = song(k, 300)
      const shots = planShots(s, { strings: max })
      expect(shots.length).toBeGreaterThan(10)
      for (const sh of shots) expect(stringsShare(sh.name)).toBeLessThanOrEqual(max)
      // her face and the keys both still get screen time
      expect(shots.some(sh => SPOTS[sh.name].subj === 'head')).toBe(true)
      expect(shots.some(sh => SPOTS[sh.name].subj === 'hands')).toBe(true)
      // a Short, one picture or each half of a stacked one
      for (const o of [{}, { half: 'her' }, { half: 'hands' }]) {
        const sh2 = planShort(s, { window: [60, 120], strings: max, ...o })
        expect(sh2.length).toBeGreaterThan(3)   // (her half cuts every 6–11 s)
        for (const x of sh2) expect(stringsShare(x.name, !o.half)).toBeLessThanOrEqual(max)
      }
    }
  }
})

test('Pedal shots off: no feet or pedal shots in the film or a Short', () => {
  for (let k = 1; k <= 4; k++) {
    const s = song(k, 600)
    const on = planShots(s), off = planShots(s, { pedals: false })
    expect(off.length).toBeGreaterThan(20)
    expect(off.some(sh => sh.name === 'feet' || sh.name === 'pedalsClose')).toBe(false)
    for (const o of [{}, { half: 'hands' }]) expect(planShort(s, { window: [60, 150], pedals: false, ...o }).some(sh => sh.name === 'pedalsClose' || sh.name === 'feet')).toBe(false)
    if (k === 1) expect(on.length).toBeGreaterThan(20)
  }
  // (with them on, some film of these four songs does use them)
  expect([1, 2, 3, 4].some(k => planShots(song(k, 600)).some(sh => sh.name === 'feet' || sh.name === 'pedalsClose'))).toBe(true)
})

test('Feet off: no planned shot shows her feet; opening wide: the first shot is the whole stage', () => {
  for (let k = 1; k <= 4; k++) {
    const s = song(k, 300)
    for (const sh of planShots(s, { pedals: false })) expect(showsFeet(sh.name, false)).toBe(false)
    for (const sh of planShort(s, { window: [60, 120], pedals: false })) expect(showsFeet(sh.name, true)).toBe(false)
    // the pedal spots themselves count as showing the feet
    expect(showsFeet('pedalsClose')).toBe(true); expect(showsFeet('feet')).toBe(true)
    // her face and the keys still both filmed in a Short without the feet
    const sh = planShort(s, { window: [60, 120], pedals: false })
    expect(sh.some(x => SPOTS[x.name].subj === 'head')).toBe(true)
    expect(sh.some(x => SPOTS[x.name].subj === 'hands')).toBe(true)
    // opening wide
    const film = planShots(s, { opening: 'wide' }), short = planShort(s, { window: [60, 120], opening: 'wide' })
    expect(film[0].name).toBe('stage'); expect(film[0].t1 - film[0].t0).toBeGreaterThanOrEqual(7)
    expect(short[0].name).toBe('stage'); expect(short[0].t1 - short[0].t0).toBeGreaterThanOrEqual(5.5)
    expect(film.slice(1).some(x => x.name === 'stage')).toBe(false)
    // never drawn otherwise
    expect(planShots(s).some(x => x.name === 'stage')).toBe(false)
    expect(planShort(s, { window: [60, 120] }).some(x => x.name === 'stage')).toBe(false)
  }
})
