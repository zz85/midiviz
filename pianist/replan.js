// Fingering checked against the pianist's own hands (after Mechanical
// Pianist's plan.ts): finger the piece, play it on the #032 hand driver
// (hand-driver.js, measured to the character's hand), and where a fingertip
// leaves a key it is holding, ban that slice's hand shape and finger again.
//
//   const r = await replan(notes, fingerOptions, dims)   // dims: rig.dims.R (measureHand)
//   r.notes (the input, fingered as fingerPiece leaves it), r.bans, r.rounds,
//   r.before / r.after: { frames, missFrames, notes } from checkHands, r.kept
//
// The page (032_pianist.html) runs fingerPiece in a worker and passes it as
// { finger: (notes, options) => Promise<[[hand, finger, release]]> }, and
// { yieldMs } so the check gives the main thread back every few ms.
//
// A miss is the one pianist/test/wrist.mjs counts: a key held down (from 20 ms
// after its onset to 20 ms before its release, else its end) whose finger's
// tip is off the key's width by more than 0.3 cm, or more than 1.9 cm over
// its top. Checked at `fps` (30) over the whole piece, on a fresh driver with
// the rig's defaults and its finger touch (`touch`: no stroke settings,
// posture or crossing lift from the rig: the fingertips only).
//
// Only slices the fingering could do something about are banned: a slice of
// at most five keys, all fingered, one of them missed on `minFrames` (3)
// frames or more (a frame or two is the hand arriving, not a shape it cannot
// hold), not already spread from 1 to 5 across its outer keys (no other
// shape is wider: such a chord is for the hand split or a release to solve),
// and not already banned with this shape.
// After each round the new fingering is checked again and kept only if it
// misses on fewer frames than the best so far, so the result is never worse,
// by this measure, than fingerPiece alone. Up to `rounds` (2) rounds.
//
// Pure apart from three.js (through hand-driver.js): runs on the page or in
// Node (pianist/test/replan.node.mjs maps 'three'). Not in a worker: the
// pages' import map, which resolves 'three', does not reach workers.
import { fingerPiece } from '../fingering/fingering.js'
import { keyX, isBlack } from '../fingering/keyboard.js'
import { createHandsDriver } from './hand-driver.js'

export const REPLAN = { fps: 30, rounds: 2, chordTolerance: 0.03, minFrames: 3 }

const copyNotes = notes => notes.map((n, i) => ({ pitch: n.pitch, on: n.on, off: n.off, velocity: n.velocity, hand: n.hand, finger: n.finger, ...(n.release != null ? { release: n.release } : {}), ...(n.shared ? { shared: n.shared } : {}), i }))

/**
 * Play fingered notes on a fresh hand driver; count the frames a held key's
 * fingertip is off it. Returns { frames, missFrames, notes: Map(input index →
 * frames missed) }. `from` / `to`: the stretch of song time to check.
 */
export async function checkHands(notes, dims, { fps = REPLAN.fps, from = -Infinity, to = Infinity, yieldMs = 0, cancelled = () => false, touch } = {}) {
  const hands = createHandsDriver(dims)
  if (touch) hands.touch = touch
  const own = copyNotes(notes)
  hands.setNotes(own)
  const played = hands.notes   // (with the releases the hands chose)
  const bySide = { L: played.filter(n => n.hand === 'L').sort((a, b) => a.on - b.on), R: played.filter(n => n.hand === 'R').sort((a, b) => a.on - b.on) }
  const maxLen = Math.max(0, ...played.map(n => (n.release ?? n.off) - n.on))
  const t0 = Math.max(from, Math.min(...played.map(n => n.on)) - 1), t1 = Math.min(to, Math.max(...played.map(n => n.release ?? n.off)))
  const missed = new Map()
  let frames = 0, missFrames = 0
  const dt = 1 / fps
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  let slice = now()
  for (let t = t0; t <= t1; t += dt) {
    if (yieldMs && now() - slice > yieldMs) {
      await new Promise(r => setTimeout(r, 0))
      if (cancelled()) return null
      slice = now()
    }
    hands.update(t, dt)
    const tm = t + hands.lead
    let miss = false
    for (const side of ['L', 'R']) {
      const d = hands[side], list = bySide[side]
      // (notes sounding at tm: onsets in [tm - maxLen, tm])
      let lo = 0, hi = list.length
      while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].on < tm - maxLen - 0.05) lo = m + 1; else hi = m }
      for (let k = lo; k < list.length && list[k].on <= tm - 0.02; k++) {
        const n = list[k]
        if ((n.release ?? n.off) <= tm + 0.02) continue
        const T = d.joints.fingers[n.finger][3], black = isBlack(n.pitch)
        if (Math.abs(T.x - keyX(n.pitch)) > (black ? 0.65 : 1.17) + 0.3 || T.y > 73 + (black ? 1.2 : 0) + 1.9) {
          miss = true
          missed.set(n.i, (missed.get(n.i) || 0) + 1)
        }
      }
    }
    frames++
    if (miss) missFrames++
  }
  return { frames, missFrames, notes: missed }
}

/** Slices of one hand's notes (onsets within tol): [[input index…]] ascending. */
function slicesOf(notes, hand, tol) {
  const own = notes.map((n, i) => [n, i]).filter(([n]) => n.hand === hand).sort((a, b) => a[0].on - b[0].on)
  const out = []
  let cur = null
  for (const [n, i] of own) {
    if (cur && n.on - cur.on <= tol) cur.ids.push(i)
    else out.push(cur = { on: n.on, ids: [i] })
  }
  return out.map(s => s.ids.sort((a, b) => a - b))
}

const rows = notes => notes.map(n => [n.hand, n.finger, n.release, n.shared])
const direct = (notes, options) => { const w = notes.map(n => ({ ...n })); fingerPiece(w, options); return rows(w) }

/**
 * fingerPiece, then the physical check and up to `rounds` re-fingerings with
 * the shapes the hands missed banned. Mutates `notes` as fingerPiece does,
 * with the best fingering found. finger(notes, options): the fingering, as
 * [[hand, finger, release]] in the notes' order (default: fingerPiece here).
 * first: that result for the options alone, if already made. cancelled():
 * true to stop (resolves null; `notes` untouched).
 */
export async function replan(notes, options = {}, dims, { rounds = REPLAN.rounds, fps = REPLAN.fps, minFrames = REPLAN.minFrames, finger = direct, first = null, yieldMs = 0, cancelled = () => false, touch, onRound } = {}) {
  const tol = options.chordTolerance ?? REPLAN.chordTolerance
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const input = notes.map(n => ({ pitch: n.pitch, on: n.on, off: n.off, velocity: n.velocity, ...(n.hand ? { hand: n.hand } : {}) }))
  const apply = r => input.map((n, i) => ({ ...n, hand: r[i][0], finger: r[i][1], ...(r[i][2] != null ? { release: r[i][2] } : {}), ...(r[i][3] ? { shared: r[i][3] } : {}) }))
  let best = first || await finger(input, options)
  let work = apply(best)
  const check = { fps, yieldMs, cancelled, touch }
  const before = await checkHands(work, dims, check)
  if (!before) return null
  let bestCheck = before, last = before
  const bans = new Map()
  let round = 0
  for (; round < rounds && last.missFrames; round++) {
    let added = 0
    for (const hand of ['L', 'R']) for (const ids of slicesOf(work, hand, tol)) {
      if (ids.length > 5 || !ids.some(i => (last.notes.get(i) || 0) >= minFrames) || ids.some(i => !work[i].finger)) continue
      if (ids.length > 1) {
        const byPitch = ids.map(i => work[i]).sort((a, b) => a.pitch - b.pitch)
        const [lo, hi] = hand === 'R' ? [byPitch[0], byPitch.at(-1)] : [byPitch.at(-1), byPitch[0]]
        if (lo.finger === 1 && hi.finger === 5) continue
      }
      const key = ids.join(','), shape = ids.map(i => work[i].finger).join('')
      const list = bans.get(key) || []
      if (list.includes(shape)) continue
      bans.set(key, [...list, shape]); added++
    }
    if (!added) break
    // (fingered again from the input as given: the hand split included)
    const r = await finger(input, { ...options, bans: new Map(bans) })
    if (cancelled()) return null
    work = apply(r)
    last = await checkHands(work, dims, check)
    if (!last) return null
    onRound?.({ round: round + 1, bans: added, missFrames: last.missFrames })
    if (last.missFrames < bestCheck.missFrames) { best = r; bestCheck = last }
  }
  notes.forEach((n, i) => {
    const [h, f, r, sh] = best[i]
    n.hand = h; n.finger = f
    if (r != null) n.release = r; else delete n.release
    if (sh) n.shared = sh; else delete n.shared
  })
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return { notes, rows: best, bans, rounds: round, before, after: bestCheck, kept: bestCheck !== before, ms: t1 - t0 }
}
