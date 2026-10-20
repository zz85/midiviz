// Onset front end for #040: one frame per hop of mono audio in, onset
// strength out. Runs in an AudioWorklet and in Node (no DOM, no allocation
// per frame).
//
//   Hann window (2048 at 44.1 / 48 kHz) → FFT → magnitudes →
//   log-spaced triangular filterbank (24 bands per octave, 30 Hz – 16 kHz) →
//   log(1 + λ·x) → SuperFlux (Böck & Widmer, DAFx 2013): the half-wave
//   rectified rise against a frequency-max-filtered earlier frame, which
//   ignores vibrato and slow pitch glides
//
// Also per frame: the flux in three bands (low < 200 Hz kick, mid 200 Hz –
// 4 kHz snare / chords, high > 4 kHz hats) for the rhythm grid, a 12-bin
// chroma (110 Hz – 2 kHz) for harmonic-change downbeats, and the frame RMS.
//
// Frames are timestamped at the centre of their window: frame n covers input
// samples [n·hop − N, n·hop), so its time is (n·hop − N/2) / sr and the
// analysis lags the input by N/2 samples (21 ms at 48 kHz).

export class FFT {
  constructor(n) {
    this.n = n
    let bits = 0; while ((1 << bits) < n) bits++
    if ((1 << bits) !== n) throw new Error('FFT size must be a power of 2')
    this.rev = new Uint32Array(n)
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); this.rev[i] = r }
    this.cos = new Float64Array(n / 2); this.sin = new Float64Array(n / 2)
    for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos(-2 * Math.PI * i / n); this.sin[i] = Math.sin(-2 * Math.PI * i / n) }
    this.re = new Float64Array(n); this.im = new Float64Array(n)
  }
  /** In-place complex FFT of this.re / this.im (input must already be loaded in bit-reversed order by load()). */
  load(x) { const { rev, re, im, n } = this; for (let i = 0; i < n; i++) { re[rev[i]] = x[i]; im[rev[i]] = 0 } }
  run() {
    const { re, im, cos, sin, n } = this
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size
      for (let s = 0; s < n; s += size) {
        for (let k = 0, t = 0; k < half; k++, t += step) {
          const a = s + k, b = a + half
          const c = cos[t], d = sin[t]
          const xr = re[b] * c - im[b] * d, xi = re[b] * d + im[b] * c
          re[b] = re[a] - xr; im[b] = im[a] - xi
          re[a] += xr; im[a] += xi
        }
      }
    }
  }
}

/** Triangular filters with log-spaced centres; bands that land on the same FFT bins are merged (as madmom does). */
export function logFilterbank(nfft, sr, { bandsPerOctave = 24, fmin = 30, fmax = 16000 } = {}) {
  const nbins = nfft / 2 + 1, binHz = sr / nfft
  fmax = Math.min(fmax, sr / 2 - binHz)
  const centres = []
  for (let f = fmin; f <= fmax * 2 ** (1 / bandsPerOctave); f *= 2 ** (1 / bandsPerOctave)) centres.push(Math.round(f / binHz))
  const bins = [...new Set(centres)].filter(b => b > 0 && b < nbins)
  const filters = []
  for (let i = 1; i + 1 < bins.length; i++) {
    const lo = bins[i - 1], c = bins[i], hi = bins[i + 1]
    const w = []
    for (let b = lo; b <= hi; b++) w.push(b <= c ? (b - lo + 1) / (c - lo + 1) : (hi - b + 1) / (hi - c + 1))
    const sum = w.reduce((s, x) => s + x, 0)
    filters.push({ lo, centre: c, hz: c * binHz, w: Float64Array.from(w, x => x / sum) })
  }
  return filters
}

export class OnsetFrontEnd {
  /**
   * @param {number} sr sample rate
   * @param {object} [o]
   * @param {number} [o.fps=100] frames per second (hop = sr / fps, rounded)
   * @param {number} [o.lambda=1] log compression log(1 + λx)
   * @param {number} [o.maxBins=3] SuperFlux frequency max-filter width (bands)
   * @param {number} [o.lag=1] SuperFlux frame lag
   */
  constructor(sr, { fps = 100, lambda = 1, maxBins = 3, lag = 1 } = {}) {
    this.sr = sr
    this.hop = Math.round(sr / fps)
    this.fps = sr / this.hop
    this.nfft = sr > 64000 ? 4096 : 2048
    this.lambda = lambda; this.maxBins = maxBins; this.lag = lag
    this.fft = new FFT(this.nfft)
    this.window = Float64Array.from({ length: this.nfft }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / this.nfft))
    this.filters = logFilterbank(this.nfft, sr)
    this.nb = this.filters.length
    this.band = Uint8Array.from(this.filters, f => f.hz < 200 ? 0 : f.hz < 4000 ? 1 : 2)
    this.ring = new Float64Array(this.nfft)      // last N input samples
    this.ringPos = 0
    this.fill = 0                                 // samples since the last frame
    this.total = 0                                // samples seen
    this.frames = 0
    this.buf = new Float64Array(this.nfft)
    this.mag = new Float64Array(this.nfft / 2 + 1)
    this.hist = Array.from({ length: lag + 1 }, () => new Float64Array(this.nb))
    this.maxed = new Float64Array(this.nb)
    // chroma: bin → pitch class weight for 110 Hz – 2 kHz
    const binHz = sr / this.nfft
    this.chromaBins = []
    for (let b = Math.ceil(110 / binHz); b <= Math.floor(2000 / binHz); b++) {
      const midi = 69 + 12 * Math.log2(b * binHz / 440)
      this.chromaBins.push({ b, pc: ((Math.round(midi) % 12) + 12) % 12 })
    }
    /** The latest frame's results (reused object). */
    this.out = { index: 0, time: 0, flux: 0, bands: new Float64Array(3), chroma: new Float64Array(12), rms: 0 }
  }

  /** Time (s) of frame n: the centre of its window. */
  frameTime(n) { return (n * this.hop - this.nfft / 2) / this.sr }

  /**
   * Push mono samples; onFrame(out) is called for every completed frame
   * (out is reused, copy what you keep).
   */
  push(x, onFrame) {
    const { ring, nfft, hop } = this
    for (let i = 0; i < x.length; i++) {
      ring[this.ringPos] = x[i]
      this.ringPos = (this.ringPos + 1) % nfft
      this.total++
      if (++this.fill >= hop) { this.fill = 0; this._frame(); onFrame(this.out) }
    }
  }

  _frame() {
    const { ring, nfft, buf, window, fft, mag, filters, nb, lambda } = this
    let sq = 0
    for (let i = 0; i < nfft; i++) { const v = ring[(this.ringPos + i) % nfft]; sq += v * v; buf[i] = v * window[i] }
    fft.load(buf); fft.run()
    const { re, im } = fft
    for (let k = 0; k <= nfft / 2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k])
    // filterbank + log
    const cur = this.hist[this.frames % this.hist.length]
    for (let j = 0; j < nb; j++) {
      const f = filters[j]; let s = 0
      for (let k = 0; k < f.w.length; k++) s += f.w[k] * mag[f.lo + k]
      cur[j] = Math.log10(1 + lambda * s)
    }
    // SuperFlux against the max-filtered frame `lag` frames back
    const out = this.out
    out.bands[0] = out.bands[1] = out.bands[2] = 0
    let flux = 0
    if (this.frames >= this.lag) {
      const prev = this.hist[(this.frames - this.lag) % this.hist.length]
      const h = this.maxBins >> 1, maxed = this.maxed
      for (let j = 0; j < nb; j++) {
        let m = -Infinity
        for (let d = -h; d <= h; d++) { const q = j + d; if (q >= 0 && q < nb && prev[q] > m) m = prev[q] }
        maxed[j] = m
      }
      for (let j = 0; j < nb; j++) {
        const d = cur[j] - maxed[j]
        if (d > 0) { flux += d; out.bands[this.band[j]] += d }
      }
    }
    // chroma
    const ch = out.chroma; ch.fill(0)
    for (const { b, pc } of this.chromaBins) ch[pc] += mag[b] * mag[b]
    for (let i = 0; i < 12; i++) ch[i] = Math.sqrt(ch[i])
    let cs = 0; for (let i = 0; i < 12; i++) cs += ch[i] * ch[i]
    if (cs > 0) { cs = 1 / Math.sqrt(cs); for (let i = 0; i < 12; i++) ch[i] *= cs }
    this.frames++
    out.index = this.frames - 1
    out.time = this.frameTime(this.frames)
    out.flux = flux
    out.rms = Math.sqrt(sq / nfft)
  }
}
