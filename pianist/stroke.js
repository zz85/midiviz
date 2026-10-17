// Wrist strokes for the #032 pianist: how high the hand is carried above the
// keys, and how the wrist tilts about the knuckles, over a whole song.
// (research/01_biomechanics.md §3)
//
// Loud notes are played from the arm: it lifts in the time it has, falls and
// the finger meets the key with the hand still moving (the struck touch);
// soft and legato notes start from the key (the pressed touch). The wrist
// leads the hand up and down, gives a little on impact, dips under a long
// note and lifts off after the last note before a rest.
//
// Some passages are played from the wrist rather than the fingers or the
// whole arm: repeated notes and octaves bounce the hand about the wrist,
// which stays where it is; a leap carries the hand up in an arc. Running
// notes stay on the keys (fingering and forearm rotation do that work).
//
// Pure functions of the note list (no three.js, no clock), so seeking and the
// MP4 export replay the same motion. Units: cm and radians; lift is the
// knuckles' height above where they sit when playing, tilt > 0 = wrist up.

import { keyX } from '../fingering/keyboard.js'

export const STROKE = {
  HZ: 120,
  CONTACT: 0.012,   // the finger meets the key this long before the onset (fingering/motion.js press start)
  PREP: 14,         // preparation lift at full velocity (cm, × arm weight)
  V0: 0.3,          // absolute velocity below which a note never lifts (pp)
  SPEED: 40,        // lift height per second of free time (an up-and-down at ~80 cm/s average)
  WRIST_LEN: 9.1,   // knuckles to wrist (cm): a wrist stroke pivots the hand about the wrist
  WRIST: 3,         // largest wrist stroke at the knuckles (cm)
  WRIST_SPEED: 45,  // knuckle height per second of free time in a wrist stroke
  LEAP: 0.12,       // arc height per cm the hand travels (cm), up to LEAP_MAX
  LEAP_MAX: 6,
  SHORT: 0.25,      // free time under this lifts less again (fast passages stay on the keys)
  LEAD: 0.007,      // wrist tilt per cm/s of vertical hand speed (× wrist flexibility)
  TILT: [-0.35, 0.6],
}

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
// the fall: from rest at the top, still moving when the key stops it
const fall = u => (u <= 0 ? 1 : u >= 1 ? 0 : 1 - (0.4 * u * u + 0.6 * smooth(u)))

/**
 * notes: one hand's [{ on, off, release?, velocity? (0..1), pitch?, finger? }]
 * (without pitches, no passage is recognised: arm strokes only).
 * opts: { armWeight = 1, flex = 1, liftOff = 1, height = 1 } (0 turns each
 * part off; height scales every lift after the time limits, so it raises
 * fast passages too),
 * velRange: [quiet, loud] velocities of the piece (default: from these notes).
 * MIDI files differ in how loud their velocities run, so a note's loudness is
 * judged half against the piece's own range and half absolutely.
 * Returns { at(t) → [lift, tilt], t0, h, n, lift, tilt, windows }; each
 * window says what played it: kind 'arm' | 'wrist' (repeat / octave) | 'leap' | 'run'.
 */
export function velocityRange(notes) {
  const v = notes.map(n => n.velocity ?? 0.7).sort((a, b) => a - b)
  return v.length ? [v[Math.floor(0.25 * (v.length - 1))], v[Math.floor(0.97 * (v.length - 1))]] : [0.4, 0.8]
}

export function planStrokes(notes, { armWeight = 1, flex = 1, liftOff = 1, height = 1, velRange = null } = {}) {
  const up = n => n.release ?? n.off
  const own = notes.filter(n => up(n) > n.on).sort((a, b) => a.on - b.on)
  const empty = { at: () => [0, 0], t0: 0, h: 1 / STROKE.HZ, n: 0, lift: new Float32Array(0), tilt: new Float32Array(0), windows: [] }
  if (!own.length) return empty

  // onset groups (chords): time, loudest velocity, latest release
  const groups = []
  for (let i = 0; i < own.length;) {
    let j = i, v = 0, end = 0, dur = Infinity
    const ps = []
    while (j < own.length && own[j].on - own[i].on < 0.04) { v = Math.max(v, own[j].velocity ?? 0.7); end = Math.max(end, up(own[j])); dur = Math.min(dur, up(own[j]) - own[j].on); if (own[j].pitch != null) ps.push(own[j].pitch); j++ }
    ps.sort((a, b) => a - b)
    groups.push({ t: own[i].on, v, end, dur, ps, x: ps.length ? ps.reduce((a, p) => a + keyX(p), 0) / ps.length : null })
    i = j
  }
  // what kind of passage each group is in (from its predecessor):
  //  repeat — the same key(s) again soon after; octave — an octave (or a
  //  wider two- or three-note shape) in a row of them; leap — the hand
  //  travels further than it spans; run — single notes stepping quickly
  const same = (a, b) => a.length && a.length === b.length && a.every((p, k) => p === b[k])
  const octave = g => g.ps.length >= 2 && g.ps.length <= 3 && g.ps[g.ps.length - 1] - g.ps[0] >= 11 && g.ps[g.ps.length - 1] - g.ps[0] <= 14
  for (let k = 0; k < groups.length; k++) {
    const g = groups[k], p = groups[k - 1], q = groups[k + 1]
    g.kind = 'arm'
    if (!p || g.x == null || p.x == null) continue
    const gap = g.t - p.t
    if (gap < 0.6 && same(g.ps, p.ps)) g.kind = 'wrist'
    else if (octave(g) && ((gap < 0.6 && octave(p)) || (q && q.t - g.t < 0.6 && octave(q)))) g.kind = 'wrist'
    else if (Math.abs(g.x - p.x) > 12) g.kind = 'leap'
    else if (g.ps.length === 1 && p.ps.length === 1 && gap < 0.2 && Math.abs(g.ps[0] - p.ps[0]) <= 4) g.kind = 'run'
  }
  const [vq, vl] = velRange || velocityRange(own)
  const loudness = v => {
    const rel = clamp((v - vq) / Math.max(0.05, vl - vq), 0, 1), abs = clamp((v - STROKE.V0) / (1 - STROKE.V0), 0, 1)
    return v <= STROKE.V0 ? 0 : 0.5 * rel + 0.5 * abs
  }
  const ioi = groups.slice(1).map((g, k) => g.t - groups[k].t).sort((a, b) => a - b)
  const pulse = ioi[Math.floor(ioi.length / 2)] || 0.4

  // held spans (the union of every [onset, release]); the hand may only
  // leave the keys between them
  const spans = []
  for (const n of own) {
    const last = spans[spans.length - 1]
    if (last && n.on <= last[1] + 0.02) last[1] = Math.max(last[1], up(n))
    else spans.push([n.on, up(n)])
  }

  const t0 = own[0].on - 2, t1 = spans[spans.length - 1][1] + 6, h = 1 / STROKE.HZ   // (6 s: room for the final lift-off, held after the end)
  const N = Math.ceil((t1 - t0) / h) + 1
  const lift = new Float32Array(N), raw = new Float32Array(N), tilt = new Float32Array(N), wk = new Float32Array(N)
  const idx = t => Math.round((t - t0) / h)
  // the group that starts a span, and the one that ends the span before it
  let gi = 0
  const windows = []
  for (let k = 0; k <= spans.length; k++) {
    const r = k > 0 ? spans[k - 1][1] : -Infinity            // last release before the window
    const nOn = k < spans.length ? spans[k][0] : Infinity    // next onset after it
    while (gi < groups.length && groups[gi].t < nOn - 1e-6) gi++
    const next = groups[gi] || null, prev = k > 0 ? groups[gi - 1] : null
    const L = nOn - STROKE.CONTACT                           // the finger meets the key
    const w = (isFinite(L) ? L : r + 10) - (isFinite(r) ? r : L - 10)
    if (w < (next?.kind === 'wrist' ? 0.02 : 0.03)) continue
    // preparation: lift as loud as the next note asks, in the time there is
    const loud = next ? loudness(next.v) : 0
    const kind = next?.kind ?? 'arm'
    let P = armWeight * STROKE.PREP * loud ** 1.5
    // running notes stay on the keys
    if (kind === 'run') P *= 0.15
    // rebound after a short (staccato) note: the hand bounces off the key
    const stacc = prev && prev.dur < Math.min(0.2, 0.6 * pulse) ? armWeight * (0.8 + 3.2 * loudness(prev.v)) : 0
    // a leap: the hand travels in an arc over the keys
    const arc = kind === 'leap' ? Math.min(STROKE.LEAP_MAX, STROKE.LEAP * Math.abs(next.x - prev.x)) : 0
    P = Math.min(Math.max(P, stacc, arc), STROKE.SPEED * w * Math.min(1, w / STROKE.SHORT))
    // repeated notes and octaves: the hand bounces from the wrist, quicker
    // than the arm can, and loud ones from higher (the arm adds the rest)
    let Wk = 0
    if (kind === 'wrist' && isFinite(L) && isFinite(r)) {
      Wk = Math.min(STROKE.WRIST, armWeight * (0.9 + 2.1 * loud), STROKE.WRIST_SPEED * w)
      Wk = Math.max(0, Wk - 0.5 * P)
      if (Wk > 0.05) {
        // up from the key at once, down into the next one still moving
        for (let i = Math.max(0, idx(r)); i <= Math.min(N - 1, idx(L)); i++) wk[i] = Wk * Math.sin(Math.PI * clamp((t0 + i * h - r) / w, 0, 1)) ** 0.8
      }
    }
    // lift-off: the last note before a rest, and the piece's last chord
    const rest = isFinite(r) && (!isFinite(nOn) || w >= Math.max(0.5, 2.5 * pulse))
    // Usually the hands leave gently: the wrist rises first, the fingers peel
    // off and the hand floats up over a second or two. Only a loud, short
    // ending (a chord that ends with a bang) throws the hand up quickly.
    const lv = loudness(prev?.v ?? 0.7)
    const bang = prev ? clamp((lv - 0.5) / 0.3, 0, 1) * clamp((0.8 - prev.dur) / 0.5, 0, 1) : 0
    const last = !isFinite(nOn)
    const Hl = !rest ? 0 : last ? liftOff * (2 + 1 * lv + 2.5 * bang) : liftOff * (0.8 + 1.4 * lv) * clamp(w / 1.2, 0.4, 1)
    const tl = last ? 2.4 + (0.45 - 2.4) * bang : Math.min(1 + (0.35 - 1) * bang, 0.6 * w)
    const lead = 0.4 + (0.12 - 0.4) * bang
    windows.push({ r, L, w, prep: P, wrist: Wk, liftOff: Hl, v: next?.v ?? 0, kind })
    if (P < 0.05 && Hl < 0.05) continue
    const fP = Math.min(0.5 * w, clamp(0.06 + 0.012 * P, 0.06, 0.2))
    const fL = Math.min(0.5 * w, clamp(0.1 + 0.012 * Hl, 0.1, 0.3))
    const riseP = stacc > 0 ? Math.max(0.01, w - fP) : Math.min(0.25, w - fP)   // a rebound rises at once
    const rsP = L - fP - riseP
    const a = Math.max(0, idx(isFinite(r) ? r : t0)), b = isFinite(L) ? Math.min(N - 1, idx(L)) : N - 1
    for (let i = a; i <= b; i++) {
      const t = t0 + i * h
      let y = 0
      if (P > 0 && t >= rsP) y = t < L - fP ? P * smooth((t - rsP) / riseP) : P * fall((t - (L - fP)) / fP)
      if (Hl > 0) y = Math.max(y, Hl * smooth((t - r) / tl) * (isFinite(L) ? fall((t - (L - fL)) / fL) : 1))
      lift[i] = y
    }
    // the wrist gives on impact: the hand stops, the wrist sinks a little more
    if (isFinite(L) && P > 0.5) {
      const vc = 0.8 * P / fP, g = -flex * Math.min(0.22, 0.004 * vc)
      const hold = next.end - nOn
      for (let i = idx(L); i <= Math.min(N - 1, idx(L + Math.min(0.3, hold))); i++) raw[i] += g * Math.sin(Math.PI * (t0 + i * h - L) / Math.min(0.3, hold))
    }
    // lift-off: the wrist rises first, while the finger is still on the key
    // (the wrist leads while the finger is still on the key, stays a little
    // raised while the hand floats up, the fingers hanging, then relaxes)
    if (Hl > 0) {
      const A = flex * 0.25 * Math.min(1, Hl / 2.5), end = Math.min(r + 1.5 * tl, isFinite(L) ? L - fL : Infinity)
      for (let i = Math.max(0, idx(r - lead)); i <= Math.min(N - 1, idx(end)); i++) {
        const t = t0 + i * h
        raw[i] += A * (t < r ? smooth((t - (r - lead)) / lead) : 1 - smooth((t - r - 0.4 * tl) / (1.1 * tl)))
      }
    }
  }
  // a long note: the wrist dips under it and rises before the release
  for (const g of groups) {
    const d = g.end - g.t
    if (d < 0.6) continue
    const a = g.t + 0.1, b = g.end - 0.05, amp = -flex * 0.08 * Math.min(1, (d - 0.4) / 1)
    for (let i = idx(a); i <= Math.min(N - 1, idx(b)); i++) raw[i] += amp * Math.sin(Math.PI * (t0 + i * h - a) / (b - a))
  }
  if (height !== 1) for (let i = 0; i < N; i++) { lift[i] *= height; wk[i] = Math.min(STROKE.WRIST * 1.5, wk[i] * height) }
  // the wrist leads: the hand trails its vertical motion (tilt with speed),
  // then a short low-pass so impacts settle instead of snapping
  const k = 1 - Math.exp(-h / 0.06)
  let y = 0
  for (let i = 0; i < N; i++) {
    const v = ((lift[Math.min(N - 1, i + 1)] - lift[Math.max(0, i - 1)]) / (2 * h))
    const goal = clamp(flex * STROKE.LEAD * v + raw[i], STROKE.TILT[0], STROKE.TILT[1])
    y += (goal - y) * k
    tilt[i] = y
  }
  // the wrist strokes on top: the knuckles rise, the wrist stays put (the
  // hand pivots about it), with no low-pass, they are quick
  for (let i = 0; i < N; i++) if (wk[i] > 0) { lift[i] += wk[i]; tilt[i] -= Math.asin(Math.min(0.9, wk[i] / STROKE.WRIST_LEN)) }

  const out = [0, 0]
  function at(t) {
    const u = (t - t0) / h, i = Math.floor(u)
    if (!(i >= 0 && i < N - 1)) { out[0] = i >= N - 1 ? lift[N - 1] : 0; out[1] = 0; return out }
    const w = u - i
    out[0] = lift[i] + (lift[i + 1] - lift[i]) * w
    out[1] = tilt[i] + (tilt[i + 1] - tilt[i]) * w
    return out
  }
  return { at, t0, h, n: N, lift, tilt, windows }
}
