// Music-stand mode geometry: the whole app is drawn rotated a quarter turn so a laptop stood on
// its side shows the page upright, tall and narrow like a printed part. dir = 1: rotated
// clockwise (the laptop turned to the left, keyboard on the right); dir = -1: counter-clockwise.
// The browser still reports pointer and wheel events in screen coordinates, so these map them
// into the app's own (local) frame. vw / vh are the screen viewport's width and height; the app
// is vh wide and vw tall. Pure, no DOM.
//
//   dir  1: transform translateX(100vw) rotate(90deg)   screen (x, y) = (vw - v, u)
//   dir -1: transform translateY(100vh) rotate(-90deg)  screen (x, y) = (v, vh - u)

/** A screen point as a point in the app's frame: { u, v }. */
export function toLocal(x, y, dir, vw, vh) {
  return dir > 0 ? { u:y, v:vw - x } : dir < 0 ? { u:vh - y, v:x } : { u:x, v:y }
}
/** An app-frame point on the screen: { x, y } (the inverse of toLocal). */
export function toScreen(u, v, dir, vw, vh) {
  return dir > 0 ? { x:vw - v, y:u } : dir < 0 ? { x:v, y:vh - u } : { x:u, y:v }
}
/** A screen rectangle (getBoundingClientRect of a rotated element) in the app's frame. */
export function localRect(rect, dir, vw, vh) {
  const a = toLocal(rect.left, rect.top, dir, vw, vh), b = toLocal(rect.right, rect.bottom, dir, vw, vh)
  const left = Math.min(a.u, b.u), top = Math.min(a.v, b.v), right = Math.max(a.u, b.u), bottom = Math.max(a.v, b.v)
  return { left, top, right, bottom, width:right - left, height:bottom - top }
}
/** A screen-axis movement (a wheel or a drag) along the app's axes: { du, dv }. */
export function localDelta(dx, dy, dir) {
  return dir > 0 ? { du:dy, dv:-dx } : dir < 0 ? { du:-dy, dv:dx } : { du:dx, dv:dy }
}

/**
 * Wheel page turns: one turn per gesture, once a gesture has moved `threshold` px with nothing
 * left to scroll. A gesture ends after `gap` ms without wheel events; after a turn, events keep
 * pushing the cooldown back (a trackpad's inertia) so one swipe never turns two pages.
 * Returns -1 / 1 when a page should turn, else 0.
 */
export function wheelTurner({ threshold = 120, gap = 350, settle = 250 } = {}) {
  let sum = 0, last = -Infinity, quietUntil = -Infinity
  return (delta, now) => {
    if (now - last > gap) sum = 0
    last = now
    if (now < quietUntil) { quietUntil = now + settle; return 0 }
    sum += delta
    if (Math.abs(sum) < threshold) return 0
    const step = Math.sign(sum); sum = 0; quietUntil = now + settle
    return step
  }
}
