// Fingering → hand motion (Experiment #029).
//
// Turns fingered notes into continuous trajectories: where each fingertip is,
// how far it is pressed, and where the hand sits, at any time t. Pure
// functions of the note list, so pausing, seeking and changing speed are free.
//
// Scheme (research/02_algorithms.md §8.7, after pianoplayer / PianoMime):
//  • hand anchor = where the middle finger would be if every finger touching
//    a key sat at its rest offset; it moves between chords with an ease that
//    starts as late as it can and arrives a little before the next onset
//  • a finger that plays a note is on that key from onset to release; between
//    notes it lifts, drifts back toward its rest place around the anchor and
//    flies to its next key just before it is needed
//  • a thumb passing under the hand stays low while it travels
//
// Units: centimetres in the piano's frame (x along the keyboard, 0 = middle,
// y up from the white key tops, z toward the player, key fronts at z = 0).

import { keyX, isBlack, WHITE_W } from './keyboard.js'

export const KEY = {
  // where each finger strikes a white key: long fingers reach further in,
  // the thumb and little finger play nearer the front edge
  WHITE_Z: [0, -1.8, -3.4, -3.9, -3.4, -2.4],
  BLACK_Z: -8,       // black keys are struck further in
  BLACK_Y: 1.2,      // black key tops above the white key tops
  DIP: 0.85,         // key travel at the striking point
  HOVER: 1.2,        // fingertips float this high when free
}
const SPACING = WHITE_W * 0.98
/** Rest offset of finger f from the hand anchor (the middle finger), RH; LH is mirrored. */
export const restOffset = (hand, f) => (hand === 'L' ? -1 : 1) * (f - 3) * SPACING

const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

/**
 * Build the motion model for a fingered piece.
 * notes: [{ pitch, on, off, hand: 'L'|'R', finger: 1..5 }]
 * Returns { poseAt(t) → { L, R } , hands }.
 */
export function buildMotion(notes, { approach = 0.09, release = 0.03 } = {}) {
  const hands = {}
  for (const hand of ['L', 'R']) {
    const own = notes.filter(n => n.hand === hand && n.finger >= 1).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    // per finger: the notes it plays, in time order
    const fingers = [1, 2, 3, 4, 5].map(() => [])
    for (const n of own) fingers[n.finger - 1].push(n)
    // anchor keyframes: one per onset group, from every key held at that moment
    const keys = []
    let i = 0
    while (i < own.length) {
      const t = own[i].on
      let j = i
      while (j < own.length && own[j].on - t < 0.03) j++
      let sx = 0, sz = 0, w = 0
      for (let k = Math.max(0, i - 24); k < j; k++) {
        const n = own[k]
        if (k >= i || (n.off > t + 0.02 && n.on <= t)) {
          sx += keyX(n.pitch) - restOffset(hand, n.finger)
          sz += isBlack(n.pitch) ? 1 : 0
          w++
        }
      }
      keys.push({ t, x: sx / w, black: sz / w, end: Math.max(...own.slice(i, j).map(n => n.off)) })
      i = j
    }
    hands[hand] = { hand, fingers, keys, ptr: fingers.map(() => 0), kptr: 0 }
  }

  // binary search: last index with arr[i].t (or .on) <= t
  function lastBefore(arr, t, field) {
    let lo = 0, hi = arr.length - 1, r = -1
    while (lo <= hi) {
      const m = (lo + hi) >> 1
      if (arr[m][field] <= t) { r = m; lo = m + 1 } else hi = m - 1
    }
    return r
  }

  function anchorAt(h, t) {
    const k = h.keys
    if (!k.length) return { x: h.hand === 'L' ? -25 : 25, black: 0, idle: 1 }
    const i = lastBefore(k, t, 't')
    if (i < 0) return { x: k[0].x, black: k[0].black, idle: 1 }
    const a = k[i], b = k[i + 1]
    // idle: the hand has finished its last notes and nothing is coming soon
    const idle = !b ? smooth((t - a.end) / 0.6) : 0
    if (!b) return { x: a.x, black: a.black, idle }
    const gap = b.t - a.t
    // in quick passages the hand glides through the whole gap; after a long
    // note it waits and moves late, arriving just before the next onset
    const dur = gap < 0.3 ? gap : Math.min(0.28, Math.max(0.05, 0.4 * gap))
    const start = b.t - dur
    const u = smooth((t - start) / dur)
    return { x: a.x + (b.x - a.x) * u, black: a.black + (b.black - a.black) * u, idle: 0 }
  }

  function fingerAt(h, f, t, anchor) {
    const list = h.fingers[f - 1]
    const restX = anchor.x + restOffset(h.hand, f)
    const restZ = KEY.WHITE_Z[f] - 2.5 * anchor.black
    const rest = { x: restX, y: KEY.HOVER + 1.5 * anchor.idle, z: restZ + 2 * anchor.idle }
    const i = lastBefore(list, t, 'on')
    const cur = i >= 0 ? list[i] : null
    const next = list[i + 1] || null
    const target = n => {
      const black = isBlack(n.pitch)
      return { x: keyX(n.pitch), y: black ? KEY.BLACK_Y : 0, z: black ? KEY.BLACK_Z + (f === 1 || f === 5 ? 1.2 : 0) : KEY.WHITE_Z[f], black }
    }
    // pressing (or holding) its current key
    if (cur && t < cur.off) {
      const k = target(cur)
      const press = smooth((t - cur.on + 0.012) / 0.03)
      return { ...k, y: k.y - KEY.DIP * press, press, rest: 0, pitch: cur.pitch, vel: cur.velocity ?? 0.7, on: cur.on }
    }
    // free: lift off the last key, rest, then fly to the next one.
    // rest (0..1) says how settled the finger is: 1 = nothing to do, so the
    // renderer may hold it in its natural place relative to the hand
    let pos = rest, restW = 1
    if (cur) {
      const k = target(cur)
      const u = smooth((t - cur.off) / Math.max(0.04, release + 0.05))
      restW = u
      pos = { x: k.x + (rest.x - k.x) * u, y: k.y + (rest.y - k.y + 0.6) * u, z: k.z + (rest.z - k.z) * u }
    }
    if (next) {
      const k = target(next)
      const window = Math.min(approach + 0.004 * Math.abs(k.x - pos.x), Math.max(0.03, next.on - (cur ? cur.off : -1)))
      const u = (t - (next.on - window)) / window
      if (u > 0) {
        const e = smooth(u)
        restW *= 1 - e
        const arc = Math.sin(Math.PI * Math.min(1, u)) * Math.min(2.5, 0.25 * Math.abs(k.x - pos.x))
        // a thumb passing under the hand travels low and tucked
        const under = f === 1 && Math.abs(k.x - pos.x) > 3 ? 1 : 0
        pos = {
          x: pos.x + (k.x - pos.x) * e,
          y: pos.y + (k.y + 0.15 - pos.y) * e + arc * (1 - 0.8 * under),
          z: pos.z + (k.z - pos.z) * e + under * 1.5 * Math.sin(Math.PI * Math.min(1, u)),
        }
      }
    }
    return { ...pos, press: 0, rest: restW }
  }

  function poseAt(t) {
    const out = {}
    for (const hand of ['L', 'R']) {
      const h = hands[hand]
      const anchor = anchorAt(h, t)
      const fingers = [1, 2, 3, 4, 5].map(f => fingerAt(h, f, t, anchor))
      out[hand] = { anchor, fingers }
    }
    return out
  }

  return { poseAt, hands }
}
