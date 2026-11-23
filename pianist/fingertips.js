// Notes from the fingertips (Experiment #032, Performance > Piano plays >
// Her fingertips).
//
// The hand driver (hand-driver.js) solves each finger to the key the motion
// plan gives it; where the hand can't reach, the fingertip stays beside or
// above the key instead of sinking into it. This reads those solved
// fingertips each frame and fires a key when a finger is down on it: the
// planned press past PRESS_ON and the tip within the key's width (plus
// X_SLACK) and no more than Y_OVER cm over its top, the test pianist/replan.js
// counts a miss by, the other way round. The key is let go when the press
// falls under PRESS_OFF, the tip leaves the key, or the finger's note changes
// (a repeated note on one key: off, then on again). A planned press that
// never meets its key is a miss: the note stays silent.
//
// The velocity is the note's written one, or, with a scale given, read from
// the fingertip's speed through the key (the pose's `strike`, cm/s:
// fingering/motion.js makes a quiet note's travel slow and a loud one's
// fast) on the piece's own scale (velocityFromStrike), so a travel the free
// time cut short sounds louder than written.
//
// Units as hand-driver.js: cm in the piano's frame, key tops at y = 73.

import { createHandsDriver } from './hand-driver.js'
import { keyX, isBlack } from '../fingering/keyboard.js'
import { loudnessScale, velocityFromStrike } from '../fingering/motion.js'

export const CONTACT = {
  PRESS_ON: 0.75,   // the planned press (0..1) at which a key down counts: where the hammer leaves (motion.js TOUCH.STRIKE), at the onset
  PRESS_OFF: 0.4,   // ...and under which it is let go (of the note's dip, where the key isn't pressed to the bottom)
  X_SLACK: 0.3,     // cm the tip may be off the key's half width
  Y_OVER: 1.9,      // cm the tip may be over the key's top
  KEY_TOP: 73,
}

/** whether a fingertip at T is on key p (replan.js checkHands's test, inverted) */
export function onKey(T, p) {
  const black = isBlack(p)
  return Math.abs(T.x - keyX(p)) <= (black ? 0.65 : 1.17) + CONTACT.X_SLACK && T.y <= CONTACT.KEY_TOP + (black ? 1.2 : 0) + CONTACT.Y_OVER
}

/**
 * A detector over a pair of hands (createHandsDriver, updated by its owner).
 * `fire.on(pitch, velocity, hand, finger)` and `fire.off(pitch)` are called as
 * keys go down and up; a key two fingers hold goes up with the last. `scale`,
 * [vLo, vHi] (loudnessScale of the notes), reads each velocity from the
 * fingertip's speed through the key; without it the written velocity is used.
 * `setScale` changes it (for the next piece).
 */
export function createContactDetector(hands, fire, scale = null) {
  const cur = { L: [null, null, null, null, null], R: [null, null, null, null, null] }   // per finger: { pitch, on } sounding
  const tried = { L: [null, null, null, null, null], R: [null, null, null, null, null] } // per finger: the onset of the press under way, and whether it met its key
  const down = new Map()   // pitch → how many fingers hold it
  const stats = { onsets: 0, missed: 0 }
  const keyOn = (p, v, side, f) => { down.set(p, (down.get(p) || 0) + 1); if (down.get(p) === 1) fire.on(p, v, side, f) }
  const keyOff = p => { const k = (down.get(p) || 1) - 1; if (k <= 0) { down.delete(p); fire.off(p) } else down.set(p, k) }
  function update() {
    for (const side of ['L', 'R']) {
      const d = hands[side], D = d.diag, C = cur[side], A = tried[side]
      for (let i = 0; i < 5; i++) {
        const c = C[i]
        const p = D.pitch[i], on = D.on[i], press = D.press[i]
        const planned = d.visible && p != null && press >= (c ? CONTACT.PRESS_OFF * (D.dip?.[i] ?? 1) : CONTACT.PRESS_ON - 1e-6)
        const touching = planned && onKey(d.joints.fingers[i + 1][3], p)
        // the press under way: counted as a miss once it passes with no contact
        const a = A[i]
        if (a && (!planned || a.on !== on || a.pitch !== p)) { if (!a.met) stats.missed++; A[i] = null }
        if (planned && !A[i]) A[i] = { pitch: p, on, met: false }
        if (c && (!touching || c.pitch !== p || c.on !== on)) { keyOff(c.pitch); C[i] = null }
        if (!C[i] && touching) { C[i] = { pitch: p, on }; A[i].met = true; stats.onsets++; keyOn(p, scale ? velocityFromStrike(D.strike[i], scale) : D.vel[i], side, i + 1) }
      }
    }
  }
  function reset() {
    for (const side of ['L', 'R']) for (let i = 0; i < 5; i++) { if (cur[side][i]) keyOff(cur[side][i].pitch); cur[side][i] = null; tried[side][i] = null }
    down.clear()
  }
  return { update, reset, stats, setScale: s => { scale = s }, /** the keys down now */ get down() { return [...down.keys()] } }
}

/**
 * Play fingered notes on a fresh pair of hands offline and collect what the
 * fingertips sound: a schedule { notes: [{ midi, time, duration, velocity, channel }], stats }
 * for the video export. `notes` as rig.hands.notes (pitch, on, off, release,
 * hand, finger, velocity). Steps at `fps`; yields every `yieldMs` ms where set;
 * `strikeVelocity` reads each velocity from the fingertip's speed in place of the written one.
 */
export async function simulateContacts(notes, dims, { touch, fps = 60, from = -Infinity, to = Infinity, yieldMs = 0, cancelled = () => false, strikeVelocity = false } = {}) {
  const hands = createHandsDriver(dims)
  if (touch) hands.touch = touch
  hands.setNotes(notes.map(n => ({ ...n })))
  const own = hands.notes
  if (!own.length) return { notes: [], stats: { onsets: 0, missed: 0 } }
  const t0 = Math.max(from, Math.min(...own.map(n => n.on)) - 1), t1 = Math.min(to, Math.max(...own.map(n => n.release ?? n.off)) + 0.5)
  const out = [], open = new Map()
  let t = t0
  const det = createContactDetector(hands, {
    on: (p, v) => open.set(p, { midi: p, time: Math.max(0, t), velocity: v, channel: 0 }),
    off: p => { const n = open.get(p); if (n) { n.duration = Math.max(0.03, t - n.time); out.push(n); open.delete(p) } },
  }, strikeVelocity ? loudnessScale(own) : null)
  const dt = 1 / fps
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  let slice = now()
  for (; t <= t1; t += dt) {
    if (yieldMs && now() - slice > yieldMs) { await new Promise(r => setTimeout(r, 0)); if (cancelled()) return null; slice = now() }
    hands.update(t, dt)
    det.update()
  }
  det.reset()
  out.sort((a, b) => a.time - b.time || a.midi - b.midi)
  return { notes: out, stats: det.stats }
}

/** one line for the panel: "412 sounded, 7 missed" */
export function describeContacts(stats) {
  if (!stats) return ''
  return `${stats.onsets} sounded${stats.missed ? `, ${stats.missed} missed` : ''}`
}
