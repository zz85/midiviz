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
// Pure functions of the note list (no three.js, no clock), so seeking and the
// MP4 export replay the same motion. Units: cm and radians; lift is the
// knuckles' height above where they sit when playing, tilt > 0 = wrist up.

export const STROKE = {
  HZ: 120,
  CONTACT: 0.012,   // the finger meets the key this long before the onset (fingering/motion.js press start)
  PREP: 7,          // preparation lift at full velocity (cm, × arm weight)
  V0: 0.3,          // absolute velocity below which a note never lifts (pp)
  SPEED: 20,        // lift height per second of free time (an up-and-down at ~40 cm/s average)
  SHORT: 0.25,      // free time under this lifts less again (fast passages stay on the keys)
  LEAD: 0.007,      // wrist tilt per cm/s of vertical hand speed (× wrist flexibility)
  TILT: [-0.35, 0.6],
}

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
// the fall: from rest at the top, still moving when the key stops it
const fall = u => (u <= 0 ? 1 : u >= 1 ? 0 : 1 - (0.4 * u * u + 0.6 * smooth(u)))

/**
 * notes: one hand's [{ on, off, release?, velocity? (0..1) }].
 * opts: { armWeight = 1, flex = 1, liftOff = 1 } (0 turns each part off),
 * velRange: [quiet, loud] velocities of the piece (default: from these notes).
 * MIDI files differ in how loud their velocities run, so a note's loudness is
 * judged half against the piece's own range and half absolutely.
 * Returns { at(t) → [lift, tilt], t0, h, n, lift, tilt, windows }.
 */
export function velocityRange(notes) {
  const v = notes.map(n => n.velocity ?? 0.7).sort((a, b) => a - b)
  return v.length ? [v[Math.floor(0.25 * (v.length - 1))], v[Math.floor(0.97 * (v.length - 1))]] : [0.4, 0.8]
}

export function planStrokes(notes, { armWeight = 1, flex = 1, liftOff = 1, velRange = null } = {}) {
  const up = n => n.release ?? n.off
  const own = notes.filter(n => up(n) > n.on).sort((a, b) => a.on - b.on)
  const empty = { at: () => [0, 0], t0: 0, h: 1 / STROKE.HZ, n: 0, lift: new Float32Array(0), tilt: new Float32Array(0), windows: [] }
  if (!own.length) return empty

  // onset groups (chords): time, loudest velocity, latest release
  const groups = []
  for (let i = 0; i < own.length;) {
    let j = i, v = 0, end = 0, dur = Infinity
    while (j < own.length && own[j].on - own[i].on < 0.04) { v = Math.max(v, own[j].velocity ?? 0.7); end = Math.max(end, up(own[j])); dur = Math.min(dur, up(own[j]) - own[j].on); j++ }
    groups.push({ t: own[i].on, v, end, dur })
    i = j
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

  const t0 = own[0].on - 2, t1 = spans[spans.length - 1][1] + 4, h = 1 / STROKE.HZ
  const N = Math.ceil((t1 - t0) / h) + 1
  const lift = new Float32Array(N), raw = new Float32Array(N), tilt = new Float32Array(N)
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
    if (w < 0.03) continue
    // preparation: lift as loud as the next note asks, in the time there is
    const loud = next ? loudness(next.v) : 0
    let P = armWeight * STROKE.PREP * loud ** 1.5
    // rebound after a short (staccato) note: the hand bounces off the key
    const stacc = prev && prev.dur < Math.min(0.2, 0.6 * pulse) ? armWeight * (0.4 + 1.6 * loudness(prev.v)) : 0
    P = Math.min(Math.max(P, stacc), STROKE.SPEED * w * Math.min(1, w / STROKE.SHORT))
    // lift-off: the last note before a rest, and the piece's last chord
    const rest = isFinite(r) && (!isFinite(nOn) || w >= Math.max(0.5, 2.5 * pulse))
    const Hl = !rest ? 0 : !isFinite(nOn) ? liftOff * (8 + 6 * loudness(prev?.v ?? 0.7)) : liftOff * (2.5 + 4 * loudness(prev?.v ?? 0.7)) * clamp(w / 1.2, 0.4, 1)
    windows.push({ r, L, w, prep: P, liftOff: Hl, v: next?.v ?? 0 })
    if (P < 0.05 && Hl < 0.05) continue
    const fP = Math.min(0.5 * w, clamp(0.06 + 0.012 * P, 0.06, 0.2))
    const fL = Math.min(0.5 * w, clamp(0.1 + 0.012 * Hl, 0.1, 0.3))
    const riseP = stacc > 0 ? Math.max(0.01, w - fP) : Math.min(0.25, w - fP)   // a rebound rises at once
    const rsP = L - fP - riseP, tl = Math.min(0.6, 0.4 * w)
    const a = Math.max(0, idx(isFinite(r) ? r : t0)), b = Math.min(N - 1, idx(isFinite(L) ? L : t1))
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
    if (Hl > 0) for (let i = Math.max(0, idx(r - 0.18)); i <= Math.min(N - 1, idx(r)); i++) raw[i] += flex * 0.25 * Math.min(1, Hl / 6) * smooth((t0 + i * h - (r - 0.18)) / 0.18)
  }
  // a long note: the wrist dips under it and rises before the release
  for (const g of groups) {
    const d = g.end - g.t
    if (d < 0.6) continue
    const a = g.t + 0.1, b = g.end - 0.05, amp = -flex * 0.08 * Math.min(1, (d - 0.4) / 1)
    for (let i = idx(a); i <= Math.min(N - 1, idx(b)); i++) raw[i] += amp * Math.sin(Math.PI * (t0 + i * h - a) / (b - a))
  }
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
