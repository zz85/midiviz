// Tempogram for #040: autocorrelation of the last few seconds of onset
// strength, read through a comb (the lag and its multiples 2…4, as in
// Davies & Plumbley 2007 and Percival & Tzanetakis 2014) and weighted by a
// log-Gaussian tempo preference around 120 BPM (Ellis 2007; the
// perceptual-resonance prior of van Noorden & Moelants).
//
// Updated every `every` frames. `strength[k]` is the comb score for the
// beat interval of BeatTracker's interval index k, so it can be shown as a
// tempo curve or fed back to the tracker as a tempo prior.

export class Tempogram {
  /**
   * @param {number} fps
   * @param {Int32Array} intervals beat intervals (frames) to score, e.g. BeatTracker.intervals
   * @param {object} [o]
   * @param {number} [o.seconds=8] analysis window
   * @param {number} [o.every=25] frames between updates
   * @param {number} [o.centreBpm=120] tempo preference centre
   * @param {number} [o.octaveWidth=1.4] width of the preference (octaves, σ)
   */
  constructor(fps, intervals, { seconds = 8, every = 25, centreBpm = 120, octaveWidth = 1.4, smooth = 0.6 } = {}) {
    this.fps = fps
    this.intervals = intervals
    this.N = Math.round(seconds * fps)
    this.every = every
    this.smooth = smooth
    this.ring = new Float64Array(this.N)
    this.pos = 0; this.count = 0
    this.maxLag = 4 * intervals[intervals.length - 1] + 2
    this.x = new Float64Array(this.N)
    this.acf = new Float64Array(Math.min(this.N, this.maxLag + 1))
    const K = intervals.length
    this.weight = Float64Array.from(intervals, i => { const b = 60 * fps / i; return Math.exp(-0.5 * (Math.log2(b / centreBpm) / octaveWidth) ** 2) })
    this.raw = new Float64Array(K)
    this.strength = new Float64Array(K)
    this.updated = false
  }

  push(o) {
    this.ring[this.pos] = o; this.pos = (this.pos + 1) % this.N; this.count++
    this.updated = false
    if (this.count % this.every === 0 && this.count >= this.fps * 2) { this._update(); this.updated = true }
  }

  _acfAt(lag) {
    // fractional lag by linear interpolation
    const a = Math.floor(lag), f = lag - a, { acf } = this
    if (a + 1 >= acf.length) return 0
    return acf[a] * (1 - f) + acf[a + 1] * f
  }

  _update() {
    const { N, ring, x, acf } = this
    const n = Math.min(N, this.count)
    let mean = 0
    for (let t = 0; t < n; t++) { x[t] = ring[(this.pos - n + t + N) % N]; mean += x[t] }
    mean /= n
    for (let t = 0; t < n; t++) x[t] -= mean
    for (let L = 0; L < acf.length; L++) {
      let s = 0
      for (let t = L; t < n; t++) s += x[t] * x[t - L]
      acf[L] = s / (n - L)          // unbiased
    }
    const K = this.intervals.length
    let m = 0
    for (let k = 0; k < K; k++) {
      const i = this.intervals[k]
      let s = 0
      for (let h = 1; h <= 4; h++) s += this._acfAt(i * h) / h ** 0.5
      // half the lag (an even subdivision) supports the beat a little
      s += 0.25 * this._acfAt(i / 2)
      s = Math.max(0, s) * this.weight[k]
      this.raw[k] = s; if (s > m) m = s
    }
    for (let k = 0; k < K; k++) {
      const v = m > 0 ? this.raw[k] / m : 0
      this.strength[k] = this.count > this.N ? this.smooth * this.strength[k] + (1 - this.smooth) * v : v
    }
  }

  /** Best interval index and its BPM refined by parabolic interpolation. */
  peak() {
    const s = this.strength, K = s.length
    let b = 0; for (let k = 1; k < K; k++) if (s[k] > s[b]) b = k
    let i = this.intervals[b]
    if (b > 0 && b + 1 < K) {
      const y0 = s[b - 1], y1 = s[b], y2 = s[b + 1], den = y0 - 2 * y1 + y2
      if (den < 0) i += 0.5 * (y0 - y2) / den
    }
    return { index: b, interval: i, bpm: 60 * this.fps / i, strength: s[b] }
  }
}
