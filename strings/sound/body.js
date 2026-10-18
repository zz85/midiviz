// Measured body for #034's physical models (strings/research/05 §4.1a).
//
// A body response is a magnitude curve in dB on a log-frequency grid
// ({ from: Hz, step: octaves, dB: [...] per ear }), estimated by
// strings/test/fit_body.js from the University of Iowa recordings: for every
// recorded note, the ratio of each harmonic in the recording to the same
// harmonic of our string's bridge force, pooled over all notes, strings and
// dynamics. At run time the curve becomes a minimum-phase FIR (cepstral
// method) and is applied with a uniformly partitioned FFT convolution, cheap
// enough for the AudioWorklet (about the cost of the 52-mode modal body).
//
// Plain JS, no dependencies (worklet and Node).

/** In-place radix-2 complex FFT (inverse when inv; unscaled). */
export function fft(re, im, inv = false) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len >> 1
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let j = 0; j < h; j++) {
        const p = i + j, q = p + h
        const vr = re[q] * cr - im[q] * ci, vi = re[q] * ci + im[q] * cr
        re[q] = re[p] - vr; im[q] = im[p] - vi
        re[p] += vr; im[p] += vi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
      }
    }
  }
}

/** dB of a response curve at frequency f (Hz), linear in log-frequency, held at the ends. */
export function curveDb(c, dB, f) {
  const x = (Math.log2(Math.max(1, f)) - Math.log2(c.from)) / c.step
  if (x <= 0) return dB[0]
  if (x >= dB.length - 1) return dB[dB.length - 1]
  const i = x | 0, t = x - i
  return dB[i] + (dB[i + 1] - dB[i]) * t
}

/**
 * Minimum-phase FIR (length L) with the magnitude of curve c (dB array dB) at
 * sample rate sr. Below c.lo and above c.hi (the range the fit saw) it rolls
 * off at 12 dB / octave.
 */
export function minPhaseFIR(c, dB, sr, L = 4096) {
  const N = 16384
  const re = new Float64Array(N), im = new Float64Array(N)
  for (let k = 0; k <= N / 2; k++) {
    const f = Math.max(1, k * sr / N)
    let d = curveDb(c, dB, f) + (c.gainDb ?? 0)
    if (f < c.lo) d -= 12 * Math.log2(c.lo / f)
    if (f > c.hi) d -= 12 * Math.log2(f / c.hi)
    re[k] = Math.max(-120, d) * Math.LN10 / 20
    if (k && k < N / 2) re[N - k] = re[k]
  }
  // real cepstrum, folded onto positive quefrencies
  fft(re, im, true)
  for (let n = 0; n < N; n++) { re[n] /= N; im[n] = 0 }
  for (let n = 1; n < N / 2; n++) { re[n] *= 2; re[N - n] = 0 }
  fft(re, im)
  for (let k = 0; k < N; k++) { const m = Math.exp(re[k]); const p = im[k]; re[k] = m * Math.cos(p); im[k] = m * Math.sin(p) }
  fft(re, im, true)
  const h = new Float32Array(L), T = Math.round(L * 0.15)
  for (let n = 0; n < L; n++) h[n] = re[n] / N * (n > L - T ? 0.5 + 0.5 * Math.cos(Math.PI * (n - (L - T)) / T) : 1)
  return h
}

/**
 * Two-ear body by uniformly partitioned FFT convolution (block B = 128,
 * FFT 256). Same interface as the modal Body: process(x, outL, outR, n), any
 * n; the output lags the input by B samples (2.7 ms at 48 kHz).
 */
/**
 * Resample an impulse response from rate `from` to rate `to` (windowed sinc,
 * low-passed below the lower Nyquist). Scaled by from / to so the frequency
 * response keeps its gain.
 */
export function resampleIR(h, from, to) {
  if (from === to) return Float32Array.from(h)
  const r = to / from, n = Math.ceil(h.length * r), out = new Float32Array(n)
  const fc = Math.min(1, r) * 0.95, W = 16           // cutoff (× the source Nyquist), half-width in source samples
  for (let i = 0; i < n; i++) {
    const t = i / r, k0 = Math.ceil(t - W / fc), k1 = Math.floor(t + W / fc)
    let s = 0
    for (let k = Math.max(0, k0); k <= Math.min(h.length - 1, k1); k++) {
      const x = (t - k) * fc, w = 0.5 + 0.5 * Math.cos(Math.PI * (t - k) * fc / W)
      s += h[k] * (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * w
    }
    out[i] = s * fc / r
  }
  return out
}

export class ConvBody {
  /**
   * spec: a magnitude curve (fit_body.js: { from, step, lo, hi, gainDb, dB:
   * [ear 0, ear 1] }) made into minimum-phase FIRs, or measured impulse
   * responses ({ ir: [ear 0, ear 1], rate, gainDb }, build_nbody.js) used as
   * they are, resampled to sr.
   */
  constructor(sr, spec, { length = 4096 } = {}) {
    const B = this.B = 128, M = 2 * B
    const g = spec.ir ? Math.pow(10, (spec.gainDb ?? 0) / 20) : 1
    const irs = spec.ir ? spec.ir.map(h => resampleIR(h, spec.rate, sr).map(v => v * g)) : null
    this.P = Math.ceil((irs ? Math.max(...irs.map(h => h.length)) : length) / B)
    this.H = (irs || spec.dB).map(d => {
      const h = irs ? d : minPhaseFIR(spec, d, sr, this.P * B), parts = []
      for (let p = 0; p < this.P; p++) {
        const re = new Float64Array(M), im = new Float64Array(M)
        for (let i = 0; i < B; i++) re[i] = h[p * B + i] ?? 0
        fft(re, im)
        parts.push({ re: re.slice(0, B + 1), im: im.slice(0, B + 1) })
      }
      return parts
    })
    if (this.H.length < 2) this.H.push(this.H[0])
    this.X = Array.from({ length: this.P }, () => ({ re: new Float64Array(B + 1), im: new Float64Array(B + 1) }))
    this.x = 0
    this.prev = new Float64Array(B); this.cur = new Float64Array(B); this.fill = 0
    this.out = [new Float32Array(B), new Float32Array(B)]; this.read = 0   // last finished block (starts silent)
    this.re = new Float64Array(M); this.im = new Float64Array(M)
  }
  reset() { for (const X of this.X) { X.re.fill(0); X.im.fill(0) } this.prev.fill(0); this.fill = 0; this.read = 0; this.out[0].fill(0); this.out[1].fill(0) }
  block() {
    const B = this.B, M = 2 * B, re = this.re, im = this.im
    for (let i = 0; i < B; i++) { re[i] = this.prev[i]; re[B + i] = this.cur[i]; im[i] = im[B + i] = 0 }
    fft(re, im)
    this.x = (this.x + this.P - 1) % this.P
    const X = this.X[this.x]
    X.re.set(re.subarray(0, B + 1)); X.im.set(im.subarray(0, B + 1))
    for (let e = 0; e < 2; e++) {
      const H = this.H[e]
      re.fill(0); im.fill(0)
      for (let p = 0; p < this.P; p++) {
        const Xp = this.X[(this.x + p) % this.P], Hp = H[p]
        for (let k = 0; k <= B; k++) {
          const a = Xp.re[k], b = Xp.im[k], c = Hp.re[k], d = Hp.im[k]
          re[k] += a * c - b * d; im[k] += a * d + b * c
        }
      }
      for (let k = 1; k < B; k++) { re[M - k] = re[k]; im[M - k] = -im[k] }
      fft(re, im, true)
      const o = this.out[e]
      for (let i = 0; i < B; i++) o[i] = re[B + i] / M
    }
    this.prev.set(this.cur)
  }
  process(x, outL, outR, n) {
    const B = this.B
    for (let i = 0; i < n; i++) {
      outL[i] = this.out[0][this.fill]; outR[i] = this.out[1][this.fill]
      this.cur[this.fill] = x[i]
      if (++this.fill === B) { this.block(); this.fill = 0 }
    }
  }
}
