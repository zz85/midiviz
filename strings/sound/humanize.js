// Humanization for Experiment #034, after Embertone's "Intuition" page
// (Joshua Bell Violin): a player is never MIDI-exact. Applied to the fingered
// note list before the performance is rendered, so every engine hears it.
//
//   timing      onsets move a few ms (less in fast passages, where players
//               are even); chords and double stops move together, and a note
//               that ends where the next one starts still ends there (legato
//               stays legato); the order of notes is kept
//   velocity    a little variance per note
//   attack      the finger lands slightly off pitch and settles in 40–120 ms
//               (`attackCents`, `attackSettle`): stopped notes only, more
//               after a shift, an undershoot more often than an overshoot,
//               less on fast notes
//   bowVar      per-note variance (−1…1) for bow speed and pressure
//   rr          round-robin index: how many times this pitch has sounded
//               before, so sample engines can alternate samples
//
// Pure and seeded: the same notes and settings give the same result.

export const HUMANIZE = {
  timing: 1,      // × onset jitter (1 ≈ 6 ms standard deviation)
  intonation: 1,  // × attack pitch error (1 ≈ 4–12 cents, more after shifts)
  variance: 1,    // × velocity and bow variance
}

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const gauss = R => { const u = Math.max(1e-9, R()), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

/** One attack error for a finger landing: { cents, settle } (also used for live notes). */
export function attackError(R, { amount = 1, shift = 0, dur = 1 } = {}) {
  if (amount <= 0) return { cents: 0, settle: 0 }
  // undershoot more often after a shift (shift = signed semitones moved)
  const pUnder = shift ? 0.7 : 0.5
  const dir = shift ? -Math.sign(shift) : 1
  const sign = R() < pUnder ? dir : -dir
  const fast = clamp(dur / 0.25, 0.3, 1)
  const cents = sign * amount * (4 + 8 * R()) * (shift ? 1.6 : 1) * fast
  const settle = (0.04 + 0.08 * R()) * (shift ? 1.2 : 1) * (0.6 + 0.4 * fast)
  return { cents, settle }
}

/**
 * notes: fingered notes { pitch, on, off, velocity?, string, finger, base }.
 * Returns new note objects (the input is untouched) with the changes above.
 */
export function humanize(notesIn, settings = {}, seed = 11) {
  const H = { ...HUMANIZE, ...settings }
  const R = rng(seed)
  const notes = notesIn.map(n => ({ ...n })).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  if (!notes.length) return notes

  // ── timing: one shift per distinct onset time ──
  const times = [...new Set(notes.map(n => Math.round(n.on * 1000)))].sort((a, b) => a - b).map(t => t / 1000)
  const moved = new Array(times.length)
  for (let k = 0; k < times.length; k++) {
    const gap = Math.min(k ? times[k] - times[k - 1] : 1, k < times.length - 1 ? times[k + 1] - times[k] : 1)
    const sd = H.timing * Math.min(0.006, 0.08 * gap)
    let t = times[k] + clamp(gauss(R), -2.5, 2.5) * sd
    // keep the order, and at least 70 % of each gap
    if (k) t = Math.max(t, moved[k - 1] + 0.7 * (times[k] - times[k - 1]))
    moved[k] = Math.max(0, t)
  }
  const find = t => {
    let lo = 0, hi = times.length - 1
    while (lo < hi) { const m = (lo + hi) >> 1; if (times[m] < t - 0.0005) lo = m + 1; else hi = m }
    return Math.abs(times[lo] - t) <= 0.003 ? lo : -1
  }
  for (const n of notes) {
    const k = find(n.on), d = moved[k] - times[k]
    const j = find(n.off)
    // an end that meets another onset stays on it (legato), otherwise it moves with its own onset
    const off = j >= 0 ? moved[j] : n.off + d
    n.on = moved[k]
    n.off = Math.max(n.on + 0.02, off)
  }

  // ── velocity, bow variance, round-robin ──
  const seen = new Map()
  for (const n of notes) {
    if (H.variance > 0) {
      n.velocity = clamp((n.velocity ?? 0.75) + clamp(gauss(R), -2.5, 2.5) * 0.035 * H.variance, 0.05, 1)
      n.bowVar = clamp(gauss(R) * 0.5, -1, 1) * H.variance
    }
    const c = seen.get(n.pitch) ?? 0
    n.rr = c; seen.set(n.pitch, c + 1)
  }

  // ── attack pitch: where a finger lands ──
  const prevOn = [null, null, null, null]
  for (const n of notes) {
    const s = n.string
    const prev = s != null ? prevOn[s] : null
    if (s != null) prevOn[s] = n
    if (!n.finger || H.intonation <= 0) continue
    // the same finger kept down on the same note does not land again
    if (prev && prev.finger === n.finger && prev.pitch === n.pitch && n.on - prev.off < 0.6) continue
    const shift = prev && prev.finger && prev.base != null && n.base != null && prev.base !== n.base && n.on - prev.off < 0.2 ? n.pitch - prev.pitch : 0
    const { cents, settle } = attackError(R, { amount: H.intonation, shift, dur: n.off - n.on })
    n.attackCents = cents; n.attackSettle = settle
  }
  return notes
}
