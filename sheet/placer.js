// Automatic placement of the score panel: one place for the whole song, the
// part of the frame the pianist and the piano fill least over the director's
// shots (pathtrace/app.js surveyFrame, with pianist/frame-space.js, the measure
// #045 places its intertitles by), keeping clear of the liner notes.
//
//   const placer = createPlacer(ov, { survey, key })
//   const box = placer(w, h, inset)     where to draw the panel, px
//
// survey(places): app.surveyFrame; key(): app.surveyKey, which changes when
// the answer would (another song or director plan, another view, the liner
// notes arriving or set otherwise). The place is chosen again only then: the
// panel never moves while a song plays.
//
// The liner notes and the panel share the frame. Where the intertitles are
// placed automatically, a panel place costs what it covers of her, plus half
// of what the intertitles would cover in the emptiest place it leaves them
// (they keep off the panel: app.reserve); where they have a fixed place (or
// every note shows as a caption at the bottom), a panel place over it is out.

import { PLACES } from './overlay.js'

export const IT_WEIGHT = 0.5

const overlap = (a, b) => Math.max(0, Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0)) * Math.max(0, Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0)) / ((a.u1 - a.u0) * (a.v1 - a.v0))
export const clashes = (it, panel) => overlap(it, panel) > 0.02

/**
 * The place for the panel: rects { place: { u0, v0, u1, v1 } } (frame fractions),
 * survey { scores: { place: cover }, intertitles: { on, fixed, rects, scores } }.
 * Returns { place, cost } with each place's cost.
 */
export function choosePlace(rects, survey) {
  const it = survey.intertitles || {}, cost = {}
  for (const [p, r] of Object.entries(rects)) {
    let c = survey.scores[p] ?? 0
    if (it.on && it.fixed) { if (it.rects[it.fixed] && clashes(it.rects[it.fixed], r)) c += 100 }
    else if (it.on) {
      const free = Object.entries(it.rects).filter(([k, q]) => k in (it.scores || {}) && !clashes(q, r)).map(([k]) => it.scores[k])
      c += IT_WEIGHT * (free.length ? Math.min(...free) : 100)
    }
    cost[p] = c
  }
  let place = null
  for (const p in cost) if (place == null || cost[p] < cost[place] - 1e-9) place = p
  return { place, cost }
}

export function createPlacer(ov, { survey, key = () => '', reserve = () => {} }) {
  let cur = null, curKey = null, size = ''
  return function placeAt(W, H, inset = {}) {
    const mode = ov.opts.position
    let b
    if (mode !== 'auto') b = ov.box(W, H, mode, inset)
    else {
      // (the panel's size and the frame's shape change the places' rects)
      const k = key(), sz = `${ov.opts.size}|${ov.opts.rows}|${(W / H).toFixed(2)}`
      if (cur == null || k !== curKey || sz !== size) {
        const boxes = {}, rects = {}
        for (const p of PLACES) {
          const r = ov.box(W, H, p, inset)
          // the corners only where the panel leaves a third of the width beside it
          if (p.includes('-') && r.w > W * 0.66) continue
          boxes[p] = r
          rects[p] = { u0: r.x / W, v0: r.y / H, u1: (r.x + r.w) / W, v1: (r.y + r.h) / H }
        }
        let s = null
        try { s = survey(rects) } catch (e) { console.warn(e) }
        cur = s ? choosePlace(rects, s).place : 'bottom'
        curKey = k; size = sz
      }
      b = ov.box(W, H, cur, inset)
    }
    reserve({ u0: b.x / W, v0: b.y / H, u1: (b.x + b.w) / W, v1: (b.y + b.h) / H })
    return b
  }
}
