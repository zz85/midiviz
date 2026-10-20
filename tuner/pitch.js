// Pitch detection for the #039 tuner. No DOM: runs in the AudioWorklet
// (tuner-worklet.js), on the main thread and under node (test/pitch.test.js).
//
// PitchDetector   McLeod's normalised square difference function (NSDF,
//                 McLeod & Wyvill 2005) computed by FFT autocorrelation, the
//                 first key maximum above k × the highest one, parabolic
//                 interpolation, then refined on the peaks at 2, 4, 8 … periods
//                 (the interpolation error stays a fraction of a sample, so
//                 dividing by the multiple shrinks it), and finally by a joint
//                 weighted least-squares fit of DC and the first 8 harmonics
//                 (the frequency that explains the most energy).
// PitchTracker    a ring buffer that runs the detector every hop on a window
//                 sized to the note (RESPONSE: `periods` periods within
//                 minLen … maxLen, trimmed to the onset after silence), with
//                 a level gate, a clarity gate, a median of 3 and exponential
//                 smoothing in cents that jumps on note changes.
// noteInfo, stringTargets   note names, cents, and instrument string targets
//                 (equal tempered or tuned in pure fifths / fourths).

// ---------------------------------------------------------------------------
// FFT (radix-2, in place)

const plans = new Map()

function plan(n) {
  let p = plans.get(n)
  if (p) return p
  const bits = Math.log2(n) | 0
  const rev = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    let r = 0
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b)
    rev[i] = r
  }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2)
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / n); sin[i] = -Math.sin(2 * Math.PI * i / n) }
  p = { n, rev, cos, sin }
  plans.set(n, p)
  return p
}

function fft(re, im, p) {
  const { n, rev, cos, sin } = p
  for (let i = 0; i < n; i++) {
    const j = rev[i]
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size
    for (let start = 0; start < n; start += size) {
      for (let k = 0, w = 0; k < half; k++, w += step) {
        const a = start + k, b = a + half
        const wr = cos[w], wi = sin[w]
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr
        re[b] = re[a] - xr; im[b] = im[a] - xi
        re[a] += xr; im[a] += xi
      }
    }
  }
}

/**
 * r[0 … M) = autocorrelation of x[0 … len) zero padded to M, using two
 * complex FFTs of M / 2 (a real signal packed as even + i · odd samples).
 */
export function autocorr(x, len, M, re, im, r) {
  const N = M >> 1, p = plan(N)
  for (let k = 0; k < N; k++) {
    const a = 2 * k, b = a + 1
    re[k] = a < len ? x[a] : 0
    im[k] = b < len ? x[b] : 0
  }
  fft(re, im, p)
  // unpack the spectrum X[k], k = 0 … N, of the real signal, and square it
  const tw = plan(M)
  const P = r   // power spectrum, temporarily in r[0 … N]
  for (let k = 0; k <= N; k++) {
    const k1 = k % N, k2 = (N - k) % N
    const zr = re[k1], zi = im[k1], cr = re[k2], ci = -im[k2]
    const er = 0.5 * (zr + cr), ei = 0.5 * (zi + ci)
    const or_ = 0.5 * (zi - ci), oi = -0.5 * (zr - cr)    // (Z - conj Z') / 2i
    const wr = k < N ? tw.cos[k] : -1, wi = k < N ? tw.sin[k] : 0   // e^{-2πik/M}
    const xr = er + wr * or_ - wi * oi, xi = ei + wr * oi + wi * or_
    P[k] = xr * xr + xi * xi
  }
  // inverse real FFT of the real, even spectrum: pack again and run the
  // forward FFT on the conjugate
  for (let k = 0; k < N; k++) {
    const a = P[k], b = P[N - k]
    const er = 0.5 * (a + b)
    const dr = 0.5 * (a - b)
    // Fo = (X[k] - conj X[N-k]) / 2 · e^{+2πik/M}
    const wr = tw.cos[k], wi = -tw.sin[k]
    const orr = dr * wr, oi = dr * wi
    // Z = Fe + i Fo, conjugated for the forward transform
    re[k] = er - oi
    im[k] = -(orr)
  }
  fft(re, im, p)
  const s = 1 / N
  for (let n = 0; n < N; n++) {
    r[2 * n] = re[n] * s
    r[2 * n + 1] = -im[n] * s
  }
}

export function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p }

// ---------------------------------------------------------------------------
// Detector

export class PitchDetector {
  /**
   * @param {object} o
   * @param {number} o.sampleRate
   * @param {number} [o.maxSize=4096]  longest window in samples
   * @param {number} [o.minFreq=25]
   * @param {number} [o.maxFreq=4500]
   * @param {number} [o.k=0.9]         MPM peak threshold (fraction of the highest key maximum)
   * @param {number} [o.harmonics=8]   harmonics in the final refinement (0: NSDF only)
   */
  constructor({ sampleRate, maxSize = 4096, minFreq = 25, maxFreq = 4500, k = 0.9, harmonics = 8 }) {
    this.harmonics = harmonics
    this.refineSteps = 1
    this.sampleRate = sampleRate
    this.maxSize = maxSize
    this.minFreq = minFreq
    this.maxFreq = maxFreq
    this.k = k
    const m = nextPow2(2 * maxSize)
    this.re = new Float64Array(m / 2 + 1)
    this.im = new Float64Array(m / 2 + 1)
    this.r = new Float64Array(m)
    this.x = new Float64Array(maxSize)
    this.n = new Float64Array(maxSize)
  }

  /**
   * Pitch of x[off … off+len).
   * @returns {{ freq: number, period: number, clarity: number, multiple: number } | null}
   */
  detect(x, off = 0, len = x.length - off) {
    len = Math.min(len, this.maxSize)
    const sr = this.sampleRate, xs = this.x, n = this.n
    // copy, without DC
    let mean = 0
    for (let i = 0; i < len; i++) mean += x[off + i]
    mean /= len
    let energy = 0
    for (let i = 0; i < len; i++) { const v = x[off + i] - mean; xs[i] = v; energy += v * v }
    if (energy < 1e-12) return null

    // autocorrelation r(τ) = IFFT |FFT x|², zero padded to M ≥ 2 len
    const M = nextPow2(2 * len), r = this.r
    autocorr(xs, len, M, this.re, this.im, r)

    // NSDF n(τ) = 2 r(τ) / m(τ), m(τ) = Σ x_j² + x_{j+τ}² over the overlap
    const tauMax = Math.min(len - 2, Math.floor(len * 0.75))
    let m = 2 * energy
    for (let t = 0; t <= tauMax; t++) {
      n[t] = m > 1e-12 ? 2 * r[t] / m : 0
      m -= xs[t] * xs[t] + xs[len - 1 - t] * xs[len - 1 - t]
    }

    // key maxima: the highest point of each positive lobe after the first
    const tauLo = Math.max(2, Math.floor(sr / this.maxFreq))
    const tauHi = Math.min(Math.ceil(sr / this.minFreq), Math.floor(len / 2), tauMax - 1)
    let t = 1
    while (t < tauHi && n[t] > 0) t++
    // (compared after interpolation: a high note's peak can fall between
    // two samples, well below its true height)
    const peaks = []
    let top = 0
    while (t < tauHi) {
      while (t < tauHi && n[t] <= 0) t++
      let best = -Infinity, bt = -1
      while (t < tauHi && n[t] > 0) {
        if (t >= tauLo && n[t] > best) { best = n[t]; bt = t }
        t++
      }
      if (bt > 0 && n[bt] >= n[bt - 1] && n[bt] >= n[bt + 1]) {
        const pk = interp(n, bt)
        peaks.push(pk)
        if (pk[1] > top) top = pk[1]
      }
    }
    if (!peaks.length) return null
    const thresh = this.k * top
    let pk = peaks[0]
    for (const q of peaks) if (q[1] >= thresh) { pk = q; break }

    let [period, clarity] = pk
    let multiple = 1

    // refine on multiples of the period: 2, 4, 8 … then the largest that fits
    const tryMultiple = (k2) => {
      const c = Math.round(k2 * period)
      if (c + 2 > tauMax) return false
      let bi = -1, bv = -Infinity
      for (let i = Math.max(1, c - 2); i <= Math.min(tauMax - 1, c + 2); i++) if (n[i] > bv) { bv = n[i]; bi = i }
      if (bi < 0 || !(n[bi] >= n[bi - 1] && n[bi] >= n[bi + 1])) return false
      const [tk, vk] = interp(n, bi)
      if (vk < 0.8 * clarity) return false
      period = tk / k2
      multiple = k2
      return true
    }
    for (let k2 = 2; k2 * period + 2 <= tauMax; k2 *= 2) if (!tryMultiple(k2)) break
    const kMax = Math.floor((tauMax - 2) / period)
    if (kMax > multiple) tryMultiple(kMax)

    let freq = sr / period
    if (this.harmonics > 0) freq = this.refine(xs, len, freq)
    return { freq, period: sr / freq, clarity, multiple }
  }

  /**
   * Final refinement: the frequency that maximises the summed power of the
   * first harmonics in the Hann-weighted frame (a harmonic-sum least-squares fit,
   * close to the maximum-likelihood estimate in white noise), found by two
   * rounds of parabolic search around the NSDF estimate.
   */
  refine(xs, len, f0) {
    const sr = this.sampleRate
    let w = this.hann
    if (!w || w.length !== len) {
      w = this.hann = new Float64Array(len)
      for (let i = 0; i < len; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / len)
    }
    const xw = this.xw ??= new Float64Array(this.maxSize)
    for (let i = 0; i < len; i++) xw[i] = xs[i] * w[i]
    const H = Math.max(1, Math.min(this.harmonics, Math.floor(0.45 * sr / f0)))
    // S(f): energy of the weighted least-squares fit of DC plus cos / sin at
    // f, 2f … Hf, jointly (so neighbouring harmonics and the negative-frequency
    // images, which overlap when the window holds few periods, do not pull
    // the estimate)
    // G's entries are weighted sums of products of sinusoids at h·f and k·f,
    // i.e. of sinusoids at (h ± k)·f, so 2H + 1 weighted sums Σ w e^{imωi}
    // and H projections Σ xw e^{ihωi} give the whole system
    const K = 2 * H + 1
    const G = new Float64Array(K * K), q = new Float64Array(K)
    const Wc = new Float64Array(2 * H + 1), Ws = new Float64Array(2 * H + 1)
    const sum = (om, v, out, m) => {
      const c = Math.cos(om), sn = Math.sin(om)
      let pr = 1, pi = 0, ar = 0, ai = 0
      for (let i = 0; i < len; i++) {
        const x = v[i]
        ar += x * pr; ai += x * pi
        const t = pr * c - pi * sn
        pi = pr * sn + pi * c
        pr = t
      }
      out[0][m] = ar; out[1][m] = ai
    }
    const Qc = new Float64Array(H + 1), Qs = new Float64Array(H + 1)
    const S = (f) => {
      const om = 2 * Math.PI * f / sr
      for (let m = 0; m <= 2 * H; m++) hannSum(m * om, len, Wc, Ws, m)
      for (let h = 1; h <= H; h++) sum(h * om, xw, [Qc, Qs], h)
      let qd = 0
      for (let i = 0; i < len; i++) qd += xw[i]
      // basis order: 1, cos f, sin f, cos 2f, sin 2f …
      const C = (m) => (m < 0 ? Wc[-m] : Wc[m]), Sn = (m) => (m < 0 ? -Ws[-m] : Ws[m])
      q[0] = qd
      G[0] = Wc[0]
      for (let h = 1; h <= H; h++) {
        const jc = 2 * h - 1, js = 2 * h
        q[jc] = Qc[h]; q[js] = Qs[h]
        G[jc * K] = Wc[h]; G[js * K] = Ws[h]
        for (let k = 1; k <= h; k++) {
          const kc = 2 * k - 1, ks = 2 * k
          G[jc * K + kc] = 0.5 * (C(h - k) + C(h + k))
          G[js * K + ks] = 0.5 * (C(h - k) - C(h + k))
          G[js * K + kc] = 0.5 * (Sn(h + k) + Sn(h - k))   // sin h · cos k
          if (k < h) G[jc * K + ks] = 0.5 * (Sn(h + k) - Sn(h - k))   // cos h · sin k
        }
      }
      return quadInverse(G, q, K)
    }
    let f = f0, d = 0.25 * sr / (len * H), sc = S(f)
    for (let it = 0; it < this.refineSteps; it++) {
      const sl = S(f - d), sh = S(f + d)
      const den = sl - 2 * sc + sh
      if (den >= 0) break
      let o = 0.5 * (sl - sh) / den
      if (o > 1) o = 1; else if (o < -1) o = -1
      f += o * d
      d /= 4
      if (it + 1 < this.refineSteps) sc = S(f)
    }
    return f
  }
}

/** Σ_{i<L} e^{jθi} as [re, im] (geometric series). */
function geo(theta, L) {
  const c = Math.cos(theta), sn = Math.sin(theta)
  const dr = 1 - c, di = -sn
  const den = dr * dr + di * di
  if (den < 1e-20) return [L, 0]
  const nr = 1 - Math.cos(theta * L), ni = -Math.sin(theta * L)
  return [(nr * dr + ni * di) / den, (ni * dr - nr * di) / den]
}

/** Σ_{i<L} w_i e^{jθi} for the periodic-shifted Hann window w_i = ½ − ½ cos(2π(i + ½)/L), in closed form. */
function hannSum(theta, L, outRe, outIm, m) {
  const ph = 2 * Math.PI / L
  const [ar, ai] = geo(theta, L), [br, bi] = geo(theta + ph, L), [cr, ci] = geo(theta - ph, L)
  const e = Math.cos(ph / 2), f = Math.sin(ph / 2)
  // 0.5 A − 0.25 e^{jφ/2} B − 0.25 e^{−jφ/2} C
  outRe[m] = 0.5 * ar - 0.25 * (e * br - f * bi) - 0.25 * (e * cr + f * ci)
  outIm[m] = 0.5 * ai - 0.25 * (e * bi + f * br) - 0.25 * (e * ci - f * cr)
}

/** qᵀ G⁻¹ q for the symmetric positive definite K × K G (lower triangle), by Cholesky. Overwrites G and q. */
function quadInverse(G, q, K) {
  for (let j = 0; j < K; j++) {
    let d = G[j * K + j]
    for (let k = 0; k < j; k++) d -= G[j * K + k] * G[j * K + k]
    if (!(d > 1e-12 * (Math.abs(G[j * K + j]) + 1e-30))) return 0
    d = Math.sqrt(d)
    G[j * K + j] = d
    for (let i = j + 1; i < K; i++) {
      let v = G[i * K + j]
      for (let k = 0; k < j; k++) v -= G[i * K + k] * G[j * K + k]
      G[i * K + j] = v / d
    }
  }
  // ‖L⁻¹ q‖²
  let e = 0
  for (let i = 0; i < K; i++) {
    let v = q[i]
    for (let k = 0; k < i; k++) v -= G[i * K + k] * q[k]
    v /= G[i * K + i]
    q[i] = v
    e += v * v
  }
  return e
}

/** Parabolic peak interpolation at index i: [position, value]. */
function interp(n, i) {
  const a = n[i - 1], b = n[i], c = n[i + 1]
  const d = a - 2 * b + c
  if (d >= 0) return [i, b]
  const o = 0.5 * (a - c) / d
  return [i + o, b - 0.25 * (a - c) * o]
}

// ---------------------------------------------------------------------------
// Tracker

export const RESPONSE = {
  // window: `periods` periods, between minLen and maxLen seconds, and never
  // fewer than 3 periods; smooth: time constant of the smoothing, seconds
  // hop: analysis interval, seconds
  fast: { periods: 8, minLen: 0.02, maxLen: 0.035, smooth: 0.02, hop: 0.005 },
  balanced: { periods: 16, minLen: 0.03, maxLen: 0.05, smooth: 0.05, hop: 0.005 },
  precise: { periods: 32, minLen: 0.06, maxLen: 0.1, smooth: 0.15, hop: 0.01 },
}

export class PitchTracker {
  /**
   * @param {object} o
   * @param {number} o.sampleRate
   * @param {number} [o.maxLen=0.1]      longest window, seconds (low notes and the search after silence)
   * @param {number} [o.hop]            analysis interval, seconds (default: the response's)
   * @param {string} [o.response='balanced']  fast | balanced | precise (RESPONSE)
   * @param {number} [o.gateDb=-60]      level gate, dBFS RMS
   * @param {number} [o.minClarity=0.8]  NSDF peak below this is not a pitch
   * @param {number} [o.minFreq=25]
   * @param {number} [o.maxFreq=4500]
   */
  constructor(o) {
    this.sampleRate = o.sampleRate
    const sr = this.sampleRate
    this.maxWin = Math.round((o.maxLen ?? 0.1) * sr)
    this.size = nextPow2(this.maxWin)
    this.ring = new Float32Array(this.size)
    this.frame = new Float32Array(this.maxWin)
    this.w = 0
    this.filled = 0
    this.since = 0
    this.samples = 0
    this.detector = new PitchDetector({ sampleRate: sr, maxSize: this.maxWin, minFreq: o.minFreq ?? 25, maxFreq: o.maxFreq ?? 4500 })
    this.configure(o)
    this.reset()
  }

  configure(o) {
    const sr = this.sampleRate
    if (o.response) this.response = o.response
    if (!this.response) this.response = 'balanced'
    if (o.hop !== undefined) this.hopOverride = o.hop
    const r = RESPONSE[this.response] ?? RESPONSE.balanced
    this.hop = Math.max(32, Math.round((this.hopOverride ?? r.hop) * sr))
    this.periods = o.periods ?? r.periods
    this.minLen = Math.min(this.maxWin, Math.round((o.minLen ?? r.minLen) * sr))
    this.trackLen = Math.min(this.maxWin, Math.max(this.minLen, Math.round((o.trackLen ?? r.maxLen) * sr)))
    this.smooth = o.smooth ?? r.smooth
    if (o.gateDb != null) this.gateDb = o.gateDb
    if (this.gateDb == null) this.gateDb = -60
    if (o.minClarity != null) this.minClarity = o.minClarity
    if (this.minClarity == null) this.minClarity = 0.8
    if (o.minFreq != null) this.detector.minFreq = o.minFreq
    if (o.maxFreq != null) this.detector.maxFreq = o.maxFreq
  }

  reset() {
    this.recent = []        // last raw estimates, cents above A0-ish reference (log domain)
    this.smoothed = null    // cents
    this.lastPeriod = 0
    this.lostFor = 0
    this.onset = -1
  }

  /** RMS level of the newest hop, dBFS. */
  hopLevel() {
    const ring = this.ring, mask = this.size - 1
    let sum = 0
    for (let i = 1; i <= this.hop; i++) { const v = ring[(this.w - i) & mask]; sum += v * v }
    return 10 * Math.log10(sum / this.hop + 1e-20)
  }

  /** Feed samples; returns one result per completed hop. */
  push(input) {
    const out = []
    const ring = this.ring, size = this.size
    for (let i = 0; i < input.length; i++) {
      ring[this.w] = input[i]
      this.w = (this.w + 1) & (size - 1)
      if (this.filled < size) this.filled++
      this.samples++
      if (++this.since >= this.hop) {
        this.since = 0
        out.push(this.analyze())
      }
    }
    return out
  }

  analyze() {
    const sr = this.sampleRate
    const P = this.lastPeriod
    const want = P
      ? Math.max(Math.min(Math.max(this.minLen, Math.ceil(P * this.periods)), this.trackLen), Math.ceil(3.2 * P))
      : this.maxWin
    // after silence, the window starts at the onset (the hop where the level
    // came above the gate), so a new note is not diluted by the quiet before it
    const hopDb = this.hopLevel()
    if (hopDb < this.gateDb - 6) this.onset = -1
    else if (this.onset < 0) this.onset = this.samples - this.hop
    const sinceOnset = this.onset >= 0 ? this.samples - this.onset : 0
    const len = Math.min(this.filled, want, this.maxWin, Math.max(sinceOnset, 64))
    // latest len samples in order
    const f = this.frame, ring = this.ring, mask = this.size - 1
    let start = (this.w - len) & mask
    let sum = 0, peak = 0
    for (let i = 0; i < len; i++) {
      const v = ring[(start + i) & mask]
      f[i] = v
    }
    // level over the newest 20 ms
    const lv = Math.min(len, Math.round(0.02 * sr))
    for (let i = len - lv; i < len; i++) { const v = f[i]; sum += v * v; const a = v < 0 ? -v : v; if (a > peak) peak = a }
    const rmsDb = 10 * Math.log10(sum / Math.max(1, lv) + 1e-20)
    const res = { time: this.samples / sr, rmsDb, peak, len, raw: 0, clarity: 0, freq: 0 }

    let d = null
    if (len >= 64 && rmsDb >= this.gateDb) d = this.detector.detect(f, 0, len)
    if (d && d.clarity >= this.minClarity) {
      res.raw = d.freq
      res.clarity = d.clarity
      res.multiple = d.multiple
      this.lastPeriod = d.period
      this.lostFor = 0
      const c = 1200 * Math.log2(d.freq / 440)
      const recent = this.recent
      recent.push(c)
      if (recent.length > 3) recent.shift()
      // median of 3 drops one-frame octave slips and pops
      let med = c
      if (recent.length === 3) {
        const [a, b, e] = recent
        med = Math.max(Math.min(a, b), Math.min(Math.max(a, b), e))
      }
      if (this.smoothed == null || Math.abs(med - this.smoothed) > 35) this.smoothed = med
      else {
        const alpha = this.smooth > 0 ? 1 - Math.exp(-(this.hop / sr) / this.smooth) : 1
        this.smoothed += alpha * (med - this.smoothed)
      }
      res.freq = 440 * Math.pow(2, this.smoothed / 1200)
    } else {
      this.lastPeriod = 0     // search the whole range again next hop
      this.lostFor += this.hop / sr
      if (this.lostFor > 0.08) { this.recent.length = 0; this.smoothed = null }
      if (d) res.clarity = d.clarity
    }
    return res
  }
}

// ---------------------------------------------------------------------------
// Notes and strings

export const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

export function midiFreq(midi, a4 = 440) { return a4 * Math.pow(2, (midi - 69) / 12) }

export function noteName(midi, flats = false) {
  return { name: (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1 }
}

/** Nearest equal-tempered note and the deviation in cents. */
export function noteInfo(freq, a4 = 440, flats = false) {
  const m = 69 + 12 * Math.log2(freq / a4)
  const midi = Math.round(m)
  return { midi, cents: (m - midi) * 100, ...noteName(midi, flats), target: midiFreq(midi, a4) }
}

/** Parse "E2", "C#4", "Bb3" to MIDI. */
export function parseNote(s) {
  const m = /^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec(s.trim())
  if (!m) throw new Error(`bad note ${s}`)
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()]
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0
  return base + acc + 12 * (Number(m[3]) + 1)
}

// pure: tuned in pure fifths / fourths from the A (or the string named in `anchor`)
export const INSTRUMENTS = {
  chromatic: { label: 'Chromatic' },
  guitar: { label: 'Guitar', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  bass: { label: 'Bass guitar', strings: ['E1', 'A1', 'D2', 'G2'] },
  bass5: { label: 'Bass (5-string)', strings: ['B0', 'E1', 'A1', 'D2', 'G2'] },
  ukulele: { label: 'Ukulele', strings: ['G4', 'C4', 'E4', 'A4'] },
  violin: { label: 'Violin', strings: ['G3', 'D4', 'A4', 'E5'], pure: true },
  viola: { label: 'Viola', strings: ['C3', 'G3', 'D4', 'A4'], pure: true },
  cello: { label: 'Cello', strings: ['C2', 'G2', 'D3', 'A3'], pure: true },
  doublebass: { label: 'Double bass', strings: ['E1', 'A1', 'D2', 'G2'], pure: true },
  mandolin: { label: 'Mandolin', strings: ['G3', 'D4', 'A4', 'E5'], pure: true },
}

/**
 * Target frequency of each string. With pure, neighbouring strings a fifth
 * (7 semitones) apart are 3 : 2 and a fourth (5) apart 4 : 3, chained from the
 * A string; other intervals stay equal tempered.
 */
export function stringTargets(instrument, a4 = 440, pure = false) {
  const inst = INSTRUMENTS[instrument]
  if (!inst?.strings) return []
  const midis = inst.strings.map(parseNote)
  const freqs = midis.map((m) => midiFreq(m, a4))
  if (pure && inst.pure) {
    let anchor = midis.findIndex((m) => m % 12 === 9)
    if (anchor < 0) anchor = 0
    const ratio = (d) => (d === 7 ? 1.5 : d === 5 ? 4 / 3 : Math.pow(2, d / 12))
    for (let i = anchor + 1; i < midis.length; i++) freqs[i] = freqs[i - 1] * ratio(midis[i] - midis[i - 1])
    for (let i = anchor - 1; i >= 0; i--) freqs[i] = freqs[i + 1] / ratio(midis[i + 1] - midis[i])
  }
  return midis.map((midi, i) => ({ label: inst.strings[i], midi, freq: freqs[i] }))
}

/** Nearest string (by cents) and the deviation from it. */
export function nearestString(freq, targets) {
  let best = null
  for (const s of targets) {
    const cents = 1200 * Math.log2(freq / s.freq)
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { ...s, cents }
  }
  return best
}
