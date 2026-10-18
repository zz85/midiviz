// Hybrid sampler for Experiment #034 (engine 6), after the way Embertone's
// Joshua Bell Violin works: real recorded notes, with what a sample library
// cannot record (vibrato, slides, legato, phrasing) driven by our own
// performance curves (performance.js).
//
// Samples: the University of Iowa 2012 violin / viola / cello, arco pp / mf /
// ff, recorded chromatically ON EACH STRING without vibrato (the bank is built
// by strings/test/build_iowa.js: Opus files plus a manifest with each note's
// onset, end of attack, release, pitch track and a pitch-synchronous loop).
//
// Per note (a voice), on the string #033 fingered it on:
//
//   sample     that string's recording of the pitch (or the nearest, a
//              semitone off at most for the violin), alternating with a
//              neighbour for repeated notes (round-robin, humanize.js `rr`)
//   pitch      the sample is read at a varying rate so that it follows the
//              string's f0 curve exactly: the recording's own pitch wobble is
//              taken out (its pitch track), our vibrato, slides, attack error
//              and drift are put in. A little amplitude flicker follows the
//              vibrato, as the body resonances do on a real violin
//   dynamics   the two recorded layers around the note's level (pp/mf/ff) are
//              crossfaded per sample by the loudness curve (bow speed and
//              pressure), aligned to the same pitch period first so the mix
//              does not phase; the loudness curve also sets the level
//   sustain    longer than the recording: a crossfaded loop in the steady part
//   start      'attack'  a detached note plays the recorded attack (fast
//                        notes skip into it, like a player's shorter bite)
//              'rebow'   a bow change between connected notes starts into the
//                        attack and overlaps the old note for 25–40 ms
//              'slur'    inside a slur there is no new attack: the old sample
//                        glides along the f0 curve to the new pitch while the
//                        new one fades in from its steady part, phase-aligned
//                        (synthesized true legato)
//   end        when the bow leaves (nothing follows within 150 ms) the voice
//              crossfades into the recording's own release and ring;
//              otherwise it fades under the next note
//
// Plain JS, no Web Audio: the same code renders in the browser (progressively,
// a few notes at a time) and in Node (tests).

import { CH, NCH } from './bowed.js'
import { rng } from './humanize.js'

export const HYBRID_URL = new URL('./samples/iowa/', import.meta.url).href
const LREF = -58.5          // performance.js loudness of a mezzo-forte stroke (dB)
const LSTEP = 9             // dB between the pp, mf and ff layers
const PAN = [-0.22, -0.08, 0.08, 0.22]
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/** A loaded bank: the manifest plus one Float32Array per pack (at manifest.sampleRate). */
export class SampleBank {
  constructor(manifest, pcm) {
    this.m = manifest; this.pcm = pcm; this.sr = manifest.sampleRate
    this.layers = manifest.dynamics.length
  }
  /** Packs a performance needs: `${string}_${dyn}` keys. */
  static packsFor(manifest, perf) {
    const need = new Set()
    for (const n of perf.notes) {
      const s = n.string
      for (const d of manifest.dynamics) if (manifest.packs[`${s}_${d}`]) need.add(`${s}_${d}`)
    }
    return [...need]
  }
  has(key) { return !!this.pcm[key] }
  /** The recording of `pitch` on string s at layer index l (round-robin rr alternates a neighbour). */
  pick(s, pitch, l, rr = 0) {
    // this layer on this string, else the nearest layer that has the pitch
    // (a layer missing a range would otherwise transpose a far note)
    let key = null, pack = null, best = null
    for (const dl of [0, 1, -1, 2, -2]) {
      const d2 = this.m.dynamics[l + dl], k2 = `${s}_${d2}`, p2 = d2 && this.m.packs[k2]
      if (!p2 || !this.pcm[k2]) continue
      let b2 = null
      for (const n of p2.notes) if (n.rms > 0 && n.headEnd > n.attackEnd && (!b2 || Math.abs(n.midi - pitch) < Math.abs(b2.midi - pitch))) b2 = n
      if (!b2) continue
      if (!best || Math.abs(b2.midi - pitch) < Math.abs(best.midi - pitch)) { key = k2; pack = p2; best = b2 }
      if (Math.abs(best.midi - pitch) <= 1) break
    }
    if (!best) return null
    const list = pack.notes
    // round-robin: every other repeat takes the neighbour a semitone away (transposed back),
    // never the open string for a stopped note
    if (rr % 2 === 1) {
      const alt = list.filter(n => n !== best && Math.abs(n.midi - pitch) <= 1 && (n.midi !== this.m.open[s] || pitch === this.m.open[s]))
      if (alt.length) best = alt[rr % 4 === 1 ? 0 : alt.length - 1]
    }
    return { meta: best, pcm: this.pcm[key], key }
  }
}

/**
 * Read one recording into `out` (length N, starting at output sample o0).
 *   src     { meta, pcm }
 *   pos0    starting position (note-local source samples)
 *   fT      Float32Array target frequency per output sample (Hz)
 *   rel     output index at which to crossfade into the release tail (or -1)
 * Cubic (Hermite) interpolation; the loop crossfades over 60 ms.
 */
function readVoice(src, pos0, fT, N, srOut, rel = -1, jump = -1) {
  const m = src.meta, x = src.pcm, base = m.offset, sr = 48000
  const out = new Float32Array(N)
  const hop = 480
  const k = sr / srOut
  // loop: the measured one, or the middle of the steady part
  let lp = m.loop
  if (!lp) {
    const a = m.attackEnd + 0.3 * (m.headEnd - m.attackEnd), b = m.headEnd - 0.03 * sr
    lp = b - a > 0.1 * sr ? [a, b] : [m.attackEnd, m.headEnd - 0.01 * sr]
  }
  const L0 = lp[0], L1 = lp[1], LL = Math.max(1, L1 - L0)
  const XF = Math.min(0.06 * sr, 0.4 * LL)
  const centsAt = p => {
    // the first 60 ms are left alone (the bite); after that the recording is held to its median pitch
    const q = (Math.max(p, m.onset + 2880) - m.onset) / hop
    const i = Math.floor(q), c = m.cents
    if (i >= c.length - 1) return c[c.length - 1] ?? 0
    return c[i] + (c[i + 1] - c[i]) * (q - i)
  }
  const tap = p => {
    const i = Math.floor(p), f = p - i
    const j = base + i
    const xm = x[j - 1] ?? 0, x0 = x[j] ?? 0, x1 = x[j + 1] ?? 0, x2 = x[j + 2] ?? 0
    const c1 = 0.5 * (x1 - xm), c2 = xm - 2.5 * x0 + 2 * x1 - 0.5 * x2, c3 = 0.5 * (x2 - xm) + 1.5 * (x0 - x1)
    return ((c3 * f + c2) * f + c1) * f + x0
  }
  let pos = pos0, tpos = m.tail, inTail = false
  // attack splice: at output index `jump` the head crossfades (30 ms) from the
  // recorded attack to the steady part, at the point there that best matches
  // the waveform (pitch-synchronous), so a slow recorded swell becomes a bite
  let jpos = -1
  const JX = Math.round(0.03 * srOut)
  const period = sr / m.f0
  const tailF = m.f0 * Math.pow(2, (m.tailCents ?? 0) / 1200)
  const tailEnd = m.length - 2
  const RX = Math.round(0.04 * srOut)
  for (let i = 0; i < N; i++) {
    let y = 0
    if (i === jump && pos < m.attackEnd) {
      const W = Math.round(2 * period)
      let bv = -Infinity
      for (let c = m.attackEnd; c < m.attackEnd + period * 1.5; c += 0.5) {
        let sc = 0, e2 = 0
        for (let j = 0; j < W; j += 2) { const u = tap(pos + j), v2 = tap(c + j); sc += u * v2; e2 += v2 * v2 }
        sc /= Math.sqrt(e2 + 1e-20)
        if (sc > bv) { bv = sc; jpos = c }
      }
    }
    if (!inTail || i < rel + RX) {
      // head (with the loop)
      let v = tap(pos)
      if (jpos >= 0) {
        const w = (i - jump) / JX
        v = v * Math.cos(w * Math.PI / 2) + tap(jpos) * Math.sin(w * Math.PI / 2)
        const fs2 = m.f0 * Math.pow(2, centsAt(jpos) / 1200)
        jpos += k * fT[i] / fs2
        if (i - jump >= JX - 1) { pos = jpos; jpos = -1 }
      }
      if (pos > L1 - XF && pos < L1) {
        const w = (pos - (L1 - XF)) / XF
        v = v * Math.cos(w * Math.PI / 2) + tap(pos - LL) * Math.sin(w * Math.PI / 2)
      }
      const fs = m.f0 * Math.pow(2, centsAt(pos) / 1200)
      pos += k * fT[i] / fs
      if (pos >= L1) pos -= LL
      if (pos >= m.headEnd - 2) pos = m.headEnd - 2
      y = v
    }
    if (rel >= 0 && i >= rel) {
      inTail = true
      if (tpos < tailEnd) {
        const v = tap(tpos)
        tpos += k * fT[i] / tailF
        const w = Math.min(1, (i - rel) / RX)
        y = y * Math.cos(w * Math.PI / 2) + v * Math.sin(w * Math.PI / 2)
        if (i >= rel + RX) y = v
      } else if (i >= rel + RX) y = 0
    }
    out[i] = y
  }
  return out
}

/** Best lag d in [-P, P] (samples) aligning b to a around index c (window W): max Σ a[c+j]·b[c+j+d]. */
function bestLag(a, b, c, P, W) {
  let best = 0, bv = -Infinity
  for (let d = -P; d <= P; d++) {
    let s = 0
    for (let j = 0; j < W; j++) { const u = a[c + j], v = b[c + j + d]; if (u !== undefined && v !== undefined) s += u * v }
    if (s > bv) { bv = s; best = d }
  }
  return best
}

/**
 * Plan and render a performance with the bank. Returns a renderer:
 *   { L, R, sampleRate, total, step(maxMs) → { done, through } }
 * step renders notes in onset order for about maxMs; `through` is the time (s)
 * up to which the output is final.
 */
export function hybridRenderer(perf, bank, { sampleRate = 48000, tail = 1.2, seed = 3, vibAM = 1 } = {}) {
  const sr = sampleRate
  const N = Math.ceil((perf.frames / perf.frameRate + tail) * sr)
  const L = new Float32Array(N), R = new Float32Array(N)
  const W = 4 * NCH, fr = perf.frameRate
  const notes = perf.notes.slice().sort((a, b) => a.on - b.on || a.string - b.string)
  const Rn = rng(seed)
  const curve = (s, ch, t) => {
    const q = clamp(t * fr, 0, perf.frames - 1.001), i = Math.floor(q), f = q - i
    const a = perf.data[i * W + s * NCH + ch], b = perf.data[(i + 1) * W + s * NCH + ch]
    return a + (b - a) * f
  }
  const loud = (s, t) => {
    const q = clamp(t * fr, 0, perf.frames - 1.001), i = Math.floor(q), f = q - i, Ls = perf.loudness[s]
    return Ls[i] + (Ls[i + 1] - Ls[i]) * f
  }
  // stroke of each note, its index inside the stroke
  const strokeOf = new Map()
  for (const st of perf.strokes || []) st.events.forEach((e, k) => { for (const n of e.notes) strokeOf.set(n, { st, k }) })
  // per string: previous / next note
  const byString = [[], [], [], []]
  for (const n of notes) byString[n.string].push(n)
  const prevOn = new Map(), nextOn = new Map()
  for (const list of byString) list.forEach((n, i) => { prevOn.set(n, list[i - 1]); nextOn.set(n, list[i + 1]) })
  // what ended last before each onset (any string), for "connected" notes
  const offs = notes.map(n => n.off).sort((a, b) => a - b)
  const connected = n => { for (const o of offs) if (o > n.on - 0.035 && o <= n.on + 0.02) return true; return false }
  const startsNear = (t, dt) => notes.some(m => m.on >= t - 0.005 && m.on < t + dt)

  // the previous voice's buffer per string (for phase-aligned legato)
  const lastVoice = [null, null, null, null]
  let idx = 0

  function voice(n) {
    const s = n.string
    const sk = strokeOf.get(n)
    const prev = prevOn.get(n), next = nextOn.get(n)
    const inSlur = sk && sk.k > 0
    const prevSame = inSlur && prev && sk.st.events[sk.k - 1].notes.includes(prev)
    const mode = prevSame ? 'slur' : inSlur ? 'cross' : connected(n) ? 'rebow' : 'attack'
    // where the voice ends
    const nextSk = next && strokeOf.get(next)
    const nextSlur = next && nextSk && nextSk.k > 0 && nextSk.st.events[nextSk.k - 1].notes.includes(n)
    const dur = n.off - n.on
    const xfIn = mode === 'slur' ? clamp(0.3 * Math.min(dur, prev ? prev.off - prev.on : dur), 0.018, 0.06) : mode === 'cross' ? 0.014 : 0
    let tEnd, fadeOut, useTail = false
    const slurOn = sk && sk.k < sk.st.events.length - 1
    if (next && next.on - n.off < 0.05) {
      // into a slurred note on this string: an equal-power crossfade centred on its onset
      if (nextSlur) { const xn = clamp(0.3 * Math.min(dur, next.off - next.on), 0.018, 0.06); tEnd = next.on - xn / 2; fadeOut = xn }
      else { tEnd = next.on; fadeOut = 0.035 }                       // bow change: under the new attack
    } else if (slurOn) { tEnd = n.off; fadeOut = 0.02 }               // the slur crosses to another string
    else if (!startsNear(n.off, 0.15)) { tEnd = n.off; useTail = true; fadeOut = 0 }
    else { tEnd = n.off + 0.01; fadeOut = 0.06 }
    const tStart = n.on - xfIn / 2
    const RXT = useTail ? 0.75 : fadeOut
    const i0 = Math.max(0, Math.round(tStart * sr)), i1 = Math.min(N, Math.round((tEnd + RXT) * sr))
    if (i1 <= i0 + 8) return
    const Nv = i1 - i0
    // target f0 per output sample; level and layer position per sample
    const fT = new Float32Array(Nv), lev = new Float32Array(Nv), lay = new Float32Array(Nv)
    const nominal = 440 * Math.pow(2, (n.pitch - 69) / 12)
    const amSign = Rn() < 0.5 ? -1 : 1, amK = vibAM * (0.035 + 0.04 * Rn())
    // the level is held through the attack (the recording has its own) and after the bow leaves
    const atkHold = mode === 'attack' || mode === 'rebow' ? 0.07 : 0
    const relT = useTail ? n.off - 0.01 : Infinity
    for (let i = 0; i < Nv; i++) {
      const t = (i0 + i) / sr
      fT[i] = curve(s, CH.f0, t)
      const tl = clamp(t, n.on + atkHold, Math.min(relT, n.off + 0.02))
      const Ld = Math.max(loud(s, tl), LREF - 30)
      const dev = 1200 * Math.log2(fT[i] / nominal)
      lev[i] = Math.pow(10, (Ld - LREF + amSign * amK * clamp(dev, -40, 40)) / 20)
      lay[i] = clamp(1 + (Ld - LREF) / LSTEP, 0, bank.layers - 1)
    }
    // two layers around the note's mean position
    let pm = 0; const a0 = Math.round((n.on - tStart + atkHold) * sr), a1 = Math.max(a0 + 1, Math.round((Math.min(n.off, tEnd) - tStart) * sr))
    for (let i = a0; i < Math.min(Nv, a1); i++) pm += lay[i]
    pm /= Math.max(1, Math.min(Nv, a1) - a0)
    const lo = clamp(Math.floor(pm), 0, bank.layers - 2), hi = lo + 1
    const A = bank.pick(s, n.pitch, lo, n.rr), B = bank.pick(s, n.pitch, hi, n.rr)
    if (!A && !B) return
    // where to start reading
    const startPos = src => {
      const m = src.meta
      if (mode === 'slur' || mode === 'cross') return m.attackEnd
      const atk = m.attackEnd - m.onset
      // fast notes and bow changes bite in later
      const skip = mode === 'rebow' ? 0.45 : clamp(1 - dur / 0.35, 0, 0.6) * 0.6
      return m.onset + skip * atk
    }
    const P = Math.round(sr / nominal) + 1
    const rel = useTail ? Math.round((relT - tStart) * sr) : -1
    // how much of the recorded attack to keep before splicing to the steady part
    const keep = mode === 'attack' ? clamp(0.3 * dur, 0.06, 0.15) : mode === 'rebow' ? 0.05 : 0
    const render = src => {
      const m = src.meta, p0 = startPos(src)
      // the splice, in output samples from the voice's start (if the recording's attack is longer)
      const left = (m.attackEnd - p0) / 48000
      const jump = keep && left > keep + 0.03 ? Math.round(keep * sr) + P : -1
      // render P extra samples on both sides so the voice can be shifted for alignment
      const f = new Float32Array(Nv + 2 * P)
      f.fill(fT[0], 0, P); f.set(fT, P); f.fill(fT[Nv - 1], P + Nv)
      const y = readVoice(src, Math.max(0, p0 - P * 48000 / sr * fT[0] / m.f0), f, Nv + 2 * P, sr, rel >= 0 ? rel + P : -1, jump)
      return { y, g: 1 / Math.max(1e-4, src.meta.rms) }
    }
    const ya = A && render(A), yb = B && render(B)
    // align B to A one pitch period at most, in the steady part
    let dB = 0
    if (ya && yb) {
      const c = P + clamp(Math.round((n.on - tStart + 0.12) * sr), 0, Math.max(0, Nv - 1200))
      dB = bestLag(ya.y, yb.y, c, P - 1, Math.min(1024, Nv))
    }
    const y = new Float32Array(Nv + 2 * P)
    for (let i = 0; i < Nv; i++) {
      const w = clamp(lay[i] - lo, 0, 1)
      const wa = Math.cos(w * Math.PI / 2), wb = Math.sin(w * Math.PI / 2)
      y[i + P] = (ya ? wa * ya.g * ya.y[i + P] : 0) + (yb ? wb * yb.g * (yb.y[i + P + dB] ?? 0) : 0)
    }
    // legato: align the new voice to the old one in the crossfade, then crossfade
    let dV = 0
    const old = lastVoice[s]
    if (mode === 'slur' && old && old.i1 > i0) {
      const W = Math.min(Math.round(xfIn * sr), old.i1 - i0, 768)
      if (W > 32) {
        const a = new Float32Array(W + 2 * P)
        for (let j = 0; j < W + 2 * P; j++) a[j] = old.y[i0 - old.i0 + j - P] ?? 0
        dV = bestLag(a, y, P, P - 1, W)
      }
    }
    // envelope: fade in (crossfade partner), fade out
    const nIn = Math.round(xfIn * sr), nOut = Math.round(fadeOut * sr), iEnd = Math.round((tEnd - tStart) * sr)
    const pan = PAN[s], gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2
    const out = new Float32Array(Nv)
    for (let i = 0; i < Nv; i++) {
      let e = lev[i]
      if (nIn) e *= Math.sin(clamp(i / nIn, 0, 1) * Math.PI / 2)
      else e *= smooth(i / 48)                                     // click guard
      if (!useTail && i > iEnd) e *= nOut ? Math.cos(clamp((i - iEnd) / nOut, 0, 1) * Math.PI / 2) : 0
      if (useTail && i > Nv - 480) e *= (Nv - i) / 480
      const v = e * (y[i + P + dV] ?? 0)
      out[i] = v
      L[i0 + i] += gl * v; R[i0 + i] += gr * v
    }
    // the old voice's crossfade out (it was rendered up to its tEnd = our crossfade middle)
    lastVoice[s] = { y: out, i0, i1 }
  }

  return {
    L, R, sampleRate: sr, total: notes.length,
    step(maxMs = 30) {
      const t0 = Date.now()
      while (idx < notes.length && Date.now() - t0 < maxMs) voice(notes[idx++])
      const through = idx < notes.length ? Math.max(0, notes[idx].on - 0.1) : Infinity
      return { done: idx >= notes.length, through, count: idx }
    },
  }
}

/** Render a whole performance (Node, export). Returns [L, R]. */
export function renderHybrid(perf, bank, opts = {}) {
  const r = hybridRenderer(perf, bank, opts)
  while (!r.step(1e9).done) { /* all at once */ }
  return [r.L, r.R]
}

/**
 * The output's expected active RMS, from the loudness curves alone (before
 * rendering): every recording is normalised to its sustain RMS, so a string
 * sounds at about 10^((L − LREF)/20). Lets a progressive render be levelled
 * like the other engines without waiting for the end.
 */
export function predictedRms(perf) {
  let s = 0, n = 0
  for (let i = 0; i < perf.frames; i++) {
    let p = 0, on = false
    for (let k = 0; k < 4; k++) { const L = perf.loudness[k][i]; if (L > LREF - 30) { on = true; p += Math.pow(10, (L - LREF) / 10) } }
    if (on) { s += p; n++ }
  }
  return Math.sqrt(s / Math.max(1, n))
}
