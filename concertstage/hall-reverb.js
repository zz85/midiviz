// Hall acoustics DSP: a stereo feedback-delay-network reverb with early
// reflections, plus the dry path as heard from a seat in the hall.
//
// Plain JS with no dependencies, so the same code runs in the live
// AudioWorklet (hall-worklet.js) and in the offline video export, and the
// exported MP4 sounds like the page.
//
//   in ─┬─ dry: seat distance (gain + air absorption low-pass) ───────────┬─ out
//       └─ pre-delay ─┬─ early reflections (8 taps, panned) ─────────────┤
//                     └─ high-pass ─ 4 allpass diffusers ─ 8-line FDN ───┘
//                        (Householder feedback, per-line damping, slow
//                         delay modulation against metallic ringing)

const LINES_MS = [31.7, 37.3, 41.9, 46.1, 53.9, 59.3, 67.1, 73.9]
const DIFF_MS = [4.77, 3.59, 12.73, 9.31]
// early reflections: [ms, gain L, gain R]
const ER = [[7.1, 0.84, 0.35], [11.3, 0.32, 0.79], [17.9, 0.62, 0.5], [23.3, 0.41, 0.7],
  [29.7, 0.55, 0.33], [37.1, 0.29, 0.47], [43.9, 0.37, 0.25], [53.3, 0.2, 0.31]]
const MAX_SIZE = 1.6, MAX_PRE = 0.12, MOD_MS = 0.35

const pow2 = n => 1 << Math.ceil(Math.log2(n + 2))
const onePole = (hz, sr) => Math.exp(-2 * Math.PI * Math.min(hz, sr * 0.45) / sr)

export const DEFAULTS = {
  on: true,
  rt60: 2, pre: 0.02, size: 1, damp: 0.45, er: 0.4,
  wet: 0.7, dry: 0.85, dryHz: 16000, width: 1,
}

export class HallReverb {
  constructor(sampleRate) {
    const sr = this.sr = sampleRate
    this.pre = new Float32Array(pow2((MAX_PRE + 0.06 * MAX_SIZE) * sr)); this.preMask = this.pre.length - 1; this.preW = 0
    this.lines = LINES_MS.map(ms => new Float32Array(pow2((ms * MAX_SIZE + MOD_MS * 2) * sr / 1000)))
    this.lw = new Int32Array(8)
    this.lp = new Float32Array(8)
    this.diff = DIFF_MS.map(ms => new Float32Array(pow2(ms * MAX_SIZE * sr / 1000)))
    this.dw = new Int32Array(4)
    this.hp = 0; this.hpX = 0
    this.dryLP = [0, 0]
    this.phase = 0
    this.p = { ...DEFAULTS }
    // smoothed mix gains (settings changes glide instead of clicking)
    this.g = { dry: 0, wet: 0, er: 0 }
    this.set({})
    this.g.dry = this.t.dry; this.g.wet = this.t.wet; this.g.er = this.t.er
  }

  set(p) {
    Object.assign(this.p, p)
    const { sr } = this, q = this.p
    const size = Math.min(MAX_SIZE, Math.max(0.2, q.size))
    this.len = LINES_MS.map(ms => ms * size * sr / 1000)
    // (×1.25: the in-loop damping shortens the broadband decay; this keeps
    // the measured RT60 close to the requested one)
    this.gain = this.len.map(l => Math.pow(10, -3 * l / (Math.max(0.1, q.rt60) * 1.25 * sr)))
    // damping: more absorption (lower damp) = high frequencies die sooner
    this.damp = Math.min(0.85, Math.max(0, 0.08 + (1 - q.damp) * 0.75))
    this.dlen = DIFF_MS.map(ms => Math.max(1, Math.round(ms * Math.sqrt(size) * sr / 1000)))
    this.preLen = Math.max(1, Math.round(Math.min(MAX_PRE, q.pre) * sr))
    // the right ear hears each wall a little later: decorrelated early field
    this.erTaps = ER.map(([ms, l, r]) => [Math.round(ms * size * sr / 1000), l, Math.round((ms * 1.13 + 1.7) * size * sr / 1000), r])
    this.hpA = onePole(110, sr)
    this.dryA = onePole(q.dryHz, sr)
    this.modRate = 2 * Math.PI * 0.43 / sr
    this.modDepth = MOD_MS * sr / 1000
    // calibrated so a hall preset at wet = 1 sits ~5 dB under the dry sound
    const on = q.on ? 1 : 0
    this.t = { dry: on ? q.dry : 1, wet: on * q.wet * 0.42, er: on * q.er * q.wet * 0.55 }
  }

  /** Clear every buffer (after a seek, or when the tail should stop). */
  reset() {
    this.pre.fill(0); for (const l of this.lines) l.fill(0); for (const d of this.diff) d.fill(0)
    this.lp.fill(0); this.hp = this.hpX = 0; this.dryLP[0] = this.dryLP[1] = 0
  }

  /** Process n frames. Outputs may alias the inputs. */
  process(inL, inR, outL, outR, n) {
    const { pre, preMask, lines, lw, lp, diff, dw, len, gain, damp, dlen, preLen, erTaps } = this
    const g = this.g, t = this.t, k = 1 - Math.exp(-1 / (0.05 * this.sr))   // 50 ms glide
    const hpA = this.hpA, dryA = this.dryA, width = this.p.width
    const x = this._x || (this._x = new Float32Array(8))
    const bypass = !this.p.on && g.wet < 1e-5 && g.er < 1e-5
    let preW = this.preW, ph = this.phase
    for (let i = 0; i < n; i++) {
      g.dry += (t.dry - g.dry) * k; g.wet += (t.wet - g.wet) * k; g.er += (t.er - g.er) * k
      const l = inL[i], r = inR[i]
      // dry, as heard from the seat: distance and air absorption
      this.dryLP[0] = l + (this.dryLP[0] - l) * dryA
      this.dryLP[1] = r + (this.dryLP[1] - r) * dryA
      let oL = this.dryLP[0] * g.dry, oR = this.dryLP[1] * g.dry
      if (bypass) { outL[i] = oL; outR[i] = oR; continue }
      // pre-delay
      pre[preW & preMask] = (l + r) * 0.5
      const tapBase = preW - preLen
      // early reflections, read from the pre-delay line
      let eL = 0, eR = 0
      for (let j = 0; j < 8; j++) {
        const tp = erTaps[j]
        eL += pre[(tapBase - tp[0]) & preMask] * tp[1]
        eR += pre[(tapBase - tp[2]) & preMask] * tp[3]
      }
      // into the tank: high-passed, diffused
      const s0 = pre[tapBase & preMask]
      this.hp = hpA * (this.hp + s0 - this.hpX); this.hpX = s0
      let d = this.hp
      for (let j = 0; j < 4; j++) {
        const buf = diff[j], m = buf.length - 1, w = dw[j]
        const v = buf[(w - dlen[j]) & m]
        const u = d + v * 0.62
        buf[w & m] = u
        d = v - u * 0.62
        dw[j] = w + 1
      }
      // read the 8 lines (modulated, linear interpolation), damp, scale
      let sum = 0
      for (let j = 0; j < 8; j++) {
        const buf = lines[j], m = buf.length - 1
        const pos = lw[j] - len[j] - this.modDepth * (1 + Math.sin(ph + j * 0.785))
        const i0 = Math.floor(pos), f = pos - i0
        const v = buf[i0 & m] * (1 - f) + buf[(i0 + 1) & m] * f
        lp[j] = v + (lp[j] - v) * damp
        x[j] = lp[j] * gain[j]
        sum += x[j]
      }
      sum *= 0.25   // Householder reflection: y = x - (2/N)·Σx
      let lL = 0, lR = 0
      for (let j = 0; j < 8; j++) {
        const buf = lines[j], m = buf.length - 1
        buf[lw[j] & m] = x[j] - sum + d * 0.35
        lw[j]++
        if (j & 1) lR += (j & 2 ? -x[j] : x[j]); else lL += (j & 2 ? -x[j] : x[j])
      }
      ph += this.modRate
      // stereo width on the reverberant part
      let wL = lL * g.wet + eL * g.er, wR = lR * g.wet + eR * g.er
      if (width !== 1) { const mid = (wL + wR) * 0.5, side = (wL - wR) * 0.5 * width; wL = mid + side; wR = mid - side }
      outL[i] = oL + wL; outR[i] = oR + wR
      preW++
    }
    this.preW = preW & 0x3fffffff
    this.phase = ph % (2 * Math.PI * 1000)
    for (let j = 0; j < 8; j++) lw[j] &= 0x3fffffff
    for (let j = 0; j < 4; j++) dw[j] &= 0x3fffffff
  }
}
