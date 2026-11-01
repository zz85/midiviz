// Automatic placement of the score panel: the part of the frame the pianist
// and the piano fill least, as #045 places its intertitles (pianist/frame-space.js),
// and steady, so the panel doesn't wander while she plays.
//
//   const placer = createPlacer(ov, { pick, reserve })
//   const box = placer(w, h, now, { bottom, top })     box: where to draw the panel, px
//
// pick(places, prefer, margin): app.pickPlace, the emptiest place; reserve(rect):
// app.reserve, so intertitles placed automatically keep off the panel.
// `now` is seconds on any clock that runs forward: the wall clock on the page,
// the song's time in an export (a placer per export, so a video places the
// panel the same way every time it is made).
//
// Every CHECK seconds the places are scored afresh. The panel moves where it
// has stayed at least DWELL seconds and another place is emptier by MARGIN,
// and glides there over GLIDE seconds; or it jumps where she now fills its
// place by URGENT more than the best (a cut to a shot that puts her there).

import { PLACES } from './overlay.js'

export const CHECK = 0.5, DWELL = 3, MARGIN = 0.06, URGENT = 0.25, GLIDE = 0.6

export function createPlacer(ov, { pick, reserve = () => {} }) {
  let cur = null, since = 0, checked = -Infinity, from = null, glideAt = 0, last = null
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)
  return function placeAt(W, H, now, inset = {}) {
    const mode = ov.opts.position
    if (mode !== 'auto') { cur = null; return finish(ov.box(W, H, mode, inset), W, H) }
    // (a clock that went back, as an export starting or a seek: choose afresh)
    if (now < checked) { cur = null; checked = -Infinity; from = null }
    if (cur == null || now - checked >= CHECK) {
      checked = now
      const boxes = {}, places = {}
      for (const p of PLACES) {
        const b = ov.box(W, H, p, inset)
        // the corners only where the panel leaves a third of the width beside it
        if (p.includes('-') && b.w > W * 0.66) continue
        boxes[p] = b
        places[p] = { u0: b.x / W, v0: b.y / H, u1: (b.x + b.w) / W, v1: (b.y + b.h) / H }
      }
      let r = null
      try { r = pick(places, cur || 'bottom', MARGIN) } catch (e) { console.warn(e) }
      const best = r?.place || cur || 'bottom'
      if (cur == null || !(cur in places)) { cur = best; since = now; from = null }
      else if (best !== cur) {
        const worse = (r.scores[cur] ?? 0) - (r.scores[best] ?? 0)
        // (after a cut it jumps, as the picture did; else it glides)
        if (worse > URGENT) { from = null; cur = best; since = now }
        else if (now - since >= DWELL) { from = last; glideAt = now; cur = best; since = now }
      }
    }
    let b = ov.box(W, H, cur, inset)
    if (from) {
      const k = ease((now - glideAt) / GLIDE)
      if (k >= 1) from = null
      else b = { ...b, x: from.x + (b.x - from.x) * k, y: from.y + (b.y - from.y) * k }
    }
    return finish(b, W, H)
  }
  function finish(b, W, H) {
    last = b
    reserve({ u0: b.x / W, v0: b.y / H, u1: (b.x + b.w) / W, v1: (b.y + b.h) / H })
    return b
  }
}
