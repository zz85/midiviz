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
//    (with `leaps`, a jump instead leaves once the hand's keys are up and
//    lands early: LEAP)
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

// when the finger leaves the key: the fingering may let a held key go early
// (note.release, see fingering.js W.release); the sound can ring on
const up = n => n.release ?? n.off

const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
// a white key whose middle is clear of the black keys beside it (D, G, A): a
// finger may strike it further in, between the black keys
const clearOfBlack = p => [p - 1, p + 1].every(q => !isBlack(q) || Math.abs(keyX(q) - keyX(p)) > 1.15)

// ── Touch: 'fall' (Chopin's: let the finger fall onto the key) ────────────
// With touch 'fall' a finger is not pushed to the key: it rises in the free
// time before its note, by how loud the note is and by its own character,
// and falls, still moving when it meets the key top, and pushes it through
// its travel: TRAVEL.ff s for the piece's loudest notes, TRAVEL.pp for its
// quietest (a soft note is pressed slowly from the key, a loud one struck
// through it), the hammer leaving at STRIKE of the way down, at the onset
// (as with 'press'). The fingertip's speed through the key, KEY.DIP over the
// travel, is the pose's `strike` (cm/s): the sound's velocity, read back
// from the moving finger (pianist/fingertips.js). Each
// finger moves its own way (Chopin's "each finger a different singer"):
//  • thumb: moves from the base of the hand, low and sideways, little lift;
//  • 2nd: light and quick, the hand's sensitive leader;
//  • 3rd: the centre of gravity, steady, the least extra lift;
//  • 4th: tied to the 3rd: when one rises the other follows a little;
//  • 5th: firm, a full fall, carrying the outer voice.
// Only the fingertip paths change (and when a press starts); the wrist and
// arm are pianist/stroke.js's.
export const TOUCH = {
  // the press: the key's travel runs from TRAVEL.pp for the piece's quietest
  // notes to TRAVEL.ff for its loudest (Goebl & Bresin: 20-30 ms at ff, ~100
  // ms at pp); the hammer leaves the key STRIKE of the way down, at the
  // onset, so the finger meets the key top before it and the key bottoms
  // out after. Where the finger's free time before the note is shorter than
  // the travel it wants, the key isn't pressed to the bottom: the dip is
  // shortened to fit the free time less LIFT_MIN (half the free time at
  // least; never below STRIKE, or the note wouldn't sound), at the same
  // speed, so a fast soft run stays soft; only where even that doesn't fit
  // does the finger go faster, and louder.
  TRAVEL: { pp: 0.08, ff: 0.025 }, STRIKE: 0.75,
  LIFT_MIN: 0.04,     // s the finger keeps to come up and over between two of its own keys, at least half its free time
  CONTACT: 0.019, BOTTOM: 0.006,   // (a full ff press, for readers: key top at on − CONTACT, bottom at on + BOTTOM)
  LIFT: [0, 0.45, 1.0, 0.7, 0.6, 0.95],   // per finger, × the note's lift
  QUICK: [0, 1, 0.75, 1, 1, 1],         // approach time per finger (2nd: quicker)
  H0: 0.4, H1: 2.2,   // lift above the key (cm): pp → ff, before the per-finger factor
  RISE: 0.25,         // share of the approach spent rising (then falling)
  TIE: 0.35,          // a free 4th (3rd) rises this share of the 3rd's (4th's) lift
  VMIN: 0.35,         // relative loudness that starts to lift (quieter stays near the key)
  HOVER: 0.35,        // a free finger rests this close above the keys (it rises for its own note)
}

/** The piece's quiet and loud velocities, [vLo, vHi]: its 10th and 95th percentiles (0.4 and 0.8 with no notes). */
export function loudnessScale(notes) {
  const vs = notes.map(n => n.velocity ?? 0.7).sort((a, b) => a - b)
  return vs.length ? [vs[Math.floor(0.1 * (vs.length - 1))], vs[Math.floor(0.95 * (vs.length - 1))]] : [0.4, 0.8]
}
/**
 * The velocity a fingertip's speed through the key (`strike`, cm/s, the
 * pose's) means on the piece's scale: the key travel it took, KEY.DIP /
 * strike, read against TRAVEL.pp and TRAVEL.ff, and that loudness on [vLo,
 * vHi]. A travel the free time cut short reads louder than written.
 */
export function velocityFromStrike(strike, [vLo, vHi]) {
  const T = TOUCH.TRAVEL, tv = KEY.DIP / Math.max(1e-6, strike)
  const L = Math.min(1, Math.max(0, (T.pp - tv) / (T.pp - T.ff)))
  return vLo + L * Math.max(0.05, vHi - vLo)
}

/**
 * Build the motion model for a fingered piece.
 * notes: [{ pitch, on, off, hand: 'L'|'R', finger: 1..5 }]
 * whiteZ[f]: how far into a white key finger f strikes (default KEY.WHITE_Z,
 * sized for the #029 / #030 hand; a smaller hand passes its own); deepZ[f]:
 * the same on a white key it can reach between the black keys (D, G, A)
 * Returns { poseAt(t) → { L, R } , hands }.
 */
// Leaps planned ahead (buildMotion's `leaps`): the hand leaves as soon as its
// last keys are up and gets there early, as a pianist prepares a jump. A move
// of LEAP_MIN cm or more (fully from LEAP_FULL) takes LEAP_T0 + LEAP_TV s a
// cm when there is time; it starts LIFT_OFF s after the hand's last key is
// up, or later where that would land it more than EARLY s ahead, and ends
// ARRIVE s before the onset, so the fingers fall onto the keys from above
// them. Where the free time is shorter it all happens in that time, quicker
// (the hands driver lets go early enough that it needn't be faster than VMAX
// cm/s at its fastest, where the notes leave time for that).
export const LEAP = { MIN: 4, FULL: 8, T0: 0.08, TV: 0.005, LIFT_OFF: 0.03, EARLY: 0.4, ARRIVE: 0.06, VMAX: 200 }

export function buildMotion(notes, { approach = 0.09, release = 0.03, travel = 0.004, glide = false, touch = 'press', whiteZ = KEY.WHITE_Z, deepZ = null, leaps = false } = {}) {
  const hands = {}
  const fall = touch === 'fall'
  // loudness relative to the piece (MIDI files run their velocities at
  // different levels): 0 = its quiet notes, 1 = its loud ones
  const [vLo, vHi] = loudnessScale(notes)
  const loud = n => Math.min(1, Math.max(0, ((n.velocity ?? 0.7) - vLo) / Math.max(0.05, vHi - vLo)))
  // each note's press (pressOf): the travel it wants from its loudness, and
  // what fits its finger's free time
  const presses = new Map()
  const wantedTravel = n => TOUCH.TRAVEL.pp + (TOUCH.TRAVEL.ff - TOUCH.TRAVEL.pp) * loud(n)
  // the press curve, 0..1 over the travel: 'press' eases from rest to rest;
  // 'fall' arrives moving, so the key goes down fast and slows at the bottom
  // (the louder, the more so)
  const curve = (n, u) => {
    if (!fall) return smooth(u)
    if (u <= 0) return 0
    if (u >= 1) return 1
    const hit = 1 - (1 - u) ** 2, L = loud(n)
    return smooth(u) * (1 - L) + hit * L
  }
  // { t: the travel (s), dip: how far down the key goes (0..1), u0: the share
  // of the travel at the onset, where the hammer leaves (press STRIKE),
  // strike: the fingertip's speed through the key (cm/s) }
  function planPress(n, free) {
    const tw = wantedTravel(n), S = TOUCH.STRIKE, fits = Math.max(0.5 * free, free - TOUCH.LIFT_MIN)
    let dip = Math.min(1, Math.max(S, fits / tw)), t = dip * tw
    if (t > fits) t = Math.max(TOUCH.TRAVEL.ff * dip, fits)   // (even STRIKE of the travel doesn't fit: faster)
    // u0: curve(u0) = STRIKE / dip, by bisection
    const goal = S / dip
    let lo = 0, hi = 1
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (curve(n, m) < goal) lo = m; else hi = m }
    return { t, dip, u0: (lo + hi) / 2, strike: KEY.DIP * dip / t }
  }
  const pressOf = n => presses.get(n) ?? (presses.set(n, planPress(n, Infinity)), presses.get(n))
  const contact = n => { const p = pressOf(n); return p.u0 * p.t }
  for (const hand of ['L', 'R']) {
    // (a key a finger shares with another, n.shared: the finger goes to the
    // one leading it, fingering.js sharedUnits; the hand covers the rest)
    const own = notes.filter(n => n.hand === hand && n.finger >= 1 && !n.shared).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    // per finger: the notes it plays, in time order
    const fingers = [1, 2, 3, 4, 5].map(() => [])
    for (const n of own) fingers[n.finger - 1].push(n)
    for (const list of fingers) for (let j = 0; j < list.length; j++) {
      const n = list[j], free = j ? Math.max(0.01, n.on - up(list[j - 1])) : Infinity
      presses.set(n, planPress(n, free))
    }
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
        if (k >= i || (up(n) > t + 0.02 && n.on <= t)) {
          sx += keyX(n.pitch) - restOffset(hand, n.finger)
          sz += isBlack(n.pitch) ? 1 : 0
          w++
        }
      }
      keys.push({ t, x: sx / w, black: sz / w, end: Math.max(...own.slice(i, j).map(up)) })
      i = j
    }
    // (leaps: when each move between onset groups leaves and lands, from the
    // moment every key struck before it is up)
    if (leaps) {
      let up0 = -Infinity, ni = 0
      for (let k = 1; k < keys.length; k++) {
        const a = keys[k - 1], b = keys[k], dx = Math.abs(b.x - a.x)
        while (ni < own.length && own[ni].on < b.t - 0.02) up0 = Math.max(up0, up(own[ni++]))
        if (dx < LEAP.MIN) continue
        const r = Math.min(up0, b.t), arrive = b.t - LEAP.ARRIVE, w = arrive - r
        if (w < 0.05) continue
        const T = LEAP.T0 + LEAP.TV * dx
        const depart = w >= T ? Math.max(r + LEAP.LIFT_OFF, arrive - T - LEAP.EARLY) : r, end = w >= T ? depart + T : arrive
        b.move = { depart, end, w: smooth((dx - LEAP.MIN) / (LEAP.FULL - LEAP.MIN)), r, x0: a.x, x1: b.x }
      }
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
    // (glide: always use the whole gap, for hands slower than a pianist's)
    const dur = glide || gap < 0.3 ? gap : Math.min(0.28, Math.max(0.05, 0.4 * gap))
    const start = b.t - dur
    let u = smooth((t - start) / dur)
    // a leap planned ahead: off as soon as the keys are up, there early
    const m = b.move
    if (m) u += (smooth((t - m.depart) / (m.end - m.depart)) - u) * m.w
    return { x: a.x + (b.x - a.x) * u, black: a.black + (b.black - a.black) * u, idle: 0 }
  }

  function fingerAt(h, f, t, anchor) {
    const list = h.fingers[f - 1]
    const restX = anchor.x + restOffset(h.hand, f)
    const restZ = whiteZ[f] - 2.5 * anchor.black
    const rest = { x: restX, y: (fall ? TOUCH.HOVER : KEY.HOVER) + 1.5 * anchor.idle, z: restZ + 2 * anchor.idle }
    const i = lastBefore(list, t, 'on')
    const cur = i >= 0 ? list[i] : null
    const next = list[i + 1] || null
    const target = n => {
      const black = isBlack(n.pitch)
      return { x: keyX(n.pitch), y: black ? KEY.BLACK_Y : 0, z: black ? KEY.BLACK_Z + (f === 1 || f === 5 ? 1.2 : 0) : deepZ && clearOfBlack(n.pitch) ? deepZ[f] : whiteZ[f], black }
    }
    // pressing (or holding) its current key
    if (cur && t < up(cur)) {
      const k = target(cur)
      const P = pressOf(cur), p = pressAt(cur, t)
      return { ...k, y: k.y - KEY.DIP * p, press: p, dip: P.dip, strike: P.strike, rest: 0, pitch: cur.pitch, vel: cur.velocity ?? 0.7, on: cur.on }
    }
    // pressing the next key already: on its top, the onset just ahead ('fall'
    // falls onto it; 'press' pushes it from the key)
    if (next && t >= next.on - contact(next)) {
      const k = target(next), P = pressOf(next), p = pressAt(next, t)
      return { ...k, y: k.y - KEY.DIP * p, press: p, dip: P.dip, strike: P.strike, rest: 0, pitch: next.pitch, vel: next.velocity ?? 0.7, on: next.on }
    }
    // free: lift off the last key, rest, then fly to the next one.
    // rest (0..1) says how settled the finger is: 1 = nothing to do, so the
    // renderer may hold it in its natural place relative to the hand
    let pos = rest, restW = 1
    if (cur) {
      const k = target(cur)
      const u = smooth((t - up(cur)) / Math.max(0.04, release + 0.05))
      restW = u
      pos = { x: k.x + (rest.x - k.x) * u, y: k.y + (rest.y - k.y + (fall ? 0.15 : 0.6)) * u, z: k.z + (rest.z - k.z) * u }
    }
    if (next && fall) {
      // rise and fall onto the key, arriving at its top CONTACT early
      const k = target(next), arrive = next.on - contact(next)
      const free = Math.max(0.03, arrive - (cur ? up(cur) : -1))
      const window = Math.min((approach + travel * Math.abs(k.x - pos.x)) * TOUCH.QUICK[f] * (1 + 0.6 * loud(next)), free)
      const u = (t - (arrive - window)) / window
      if (u > 0) {
        const e = smooth(u)
        restW *= 1 - e
        // the lift: louder notes from higher, in the time there is (a quick
        // finger cannot rise far), and by the finger's character
        const L = loud(next), lift = TOUCH.LIFT[f] * (TOUCH.H0 + (TOUCH.H1 - TOUCH.H0) * Math.max(0, (L - TOUCH.VMIN) / (1 - TOUCH.VMIN))) * Math.min(1, window / 0.12)
        // (a finger travelling to a key further off arcs a little higher; the
        // hand carries most of the travel)
        const top = Math.max(pos.y, k.y + lift + Math.min(1.5, 0.12 * Math.abs(k.x - pos.x)))
        const r = TOUCH.RISE
        // up to the top (eased), then a fall that speeds up into the key
        const y = u < r ? pos.y + (top - pos.y) * smooth(u / r) : top - (top - k.y) * ((u - r) / (1 - r)) ** 2
        const under = f === 1 && Math.abs(k.x - pos.x) > 3 ? 1 : 0
        pos = {
          x: pos.x + (k.x - pos.x) * e,
          y: under ? Math.min(y, pos.y + (k.y + 0.3 - pos.y) * e) : y,
          z: pos.z + (k.z - pos.z) * e + under * 1.5 * Math.sin(Math.PI * Math.min(1, u)),
        }
        return { ...pos, press: 0, rest: restW, lift: Math.max(0, y - k.y) }
      }
    } else if (next) {
      const k = target(next)
      // (arriving on the key top as its press starts, contact before the onset)
      const arrive = next.on - contact(next)
      const window = Math.min(approach + travel * Math.abs(k.x - pos.x), Math.max(0.03, arrive - (cur ? up(cur) : -1)))
      const u = (t - (arrive - window)) / window
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

  // how far the key is down (0..1) at t: its press's curve over its travel,
  // the onset at u0 (press STRIKE), scaled to its dip
  function pressAt(n, t) {
    const P = pressOf(n)
    return P.dip * curve(n, (t - n.on) / P.t + P.u0)
  }

  function poseAt(t) {
    const out = {}
    for (const hand of ['L', 'R']) {
      const h = hands[hand]
      const anchor = anchorAt(h, t)
      const fingers = [1, 2, 3, 4, 5].map(f => fingerAt(h, f, t, anchor))
      if (fall) {
        // the 3rd and 4th share a tendon: a free one rises a little with the
        // other's lift (and never below where it is)
        const [, , f3, f4] = fingers
        if (f4.press === 0 && f3.lift) f4.y += TOUCH.TIE * f3.lift
        if (f3.press === 0 && f4.lift) f3.y += TOUCH.TIE * f4.lift
      }
      out[hand] = { anchor, fingers }
    }
    return out
  }

  // the planned leaps of each hand, in time order: { t (the onset it lands
  // on), depart, end, r (its last key up), x0, x1 (the anchor, cm) }
  const moves = {}
  for (const hand of ['L', 'R']) moves[hand] = hands[hand].keys.filter(k => k.move && k.move.w > 0.5).map(k => ({ t: k.t, ...k.move }))
  return { poseAt, hands, moves }
}
