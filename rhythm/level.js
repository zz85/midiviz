// Beat-level selection for #040. The HMM locks onto the fastest regular
// pulse the onsets support, which on busy music is often the eighth note
// (funk at 192 instead of 96, a ballad at 140 instead of 70). Listeners tap
// the slower level when every other pulse is accented: kick and snare on
// the beats, hats or an oom-pah bass in between (Parncutt 1994; Moelants &
// McKinney 2004: preferred tempo near 100–120 BPM).
//
// For every tracked pulse k the selector measures three accents around it:
// the onset strength and the low (kick, bass) and mid (snare, chords) band
// fluxes, each normalised by its running peak. Once 12 pulses are known it
// compares even with odd pulses per accent. Only when all three favour the
// same parity (each by at least `agree`) and their geometric-mean ratio is
// above a threshold that falls as the tracked tempo rises, it reports the
// stronger parity alone (half the tempo); hysteresis keeps it from
// flapping. The low band must favour the strong parity by `lowRatio`: the
// bass or kick has to mark the slower level, as in a ballad's eighth-note
// hats over kick and snare. A drum & bass break at 172 (snare on 2 and 4,
// hats on every quarter) has all bands mildly favouring the snares and is
// left alone, since halving it would put the beats on the backbeat.

export class LevelSelector {
  constructor(fps, { minBpm = 105, threshold = 1.5, slope = 0.004, memory = 16, hysteresis = 0.15, agree = 1.1, lowRatio = 2.5 } = {}) {
    this.agree = agree; this.lowRatio = lowRatio
    this.fps = fps
    this.minBpm = minBpm; this.threshold = threshold; this.slope = slope; this.memory = memory; this.hysteresis = hysteresis
    this.R = Math.round(3 * fps)
    this.acc = [new Float64Array(this.R), new Float64Array(this.R), new Float64Array(this.R)]
    this.n = -1; this.t0 = null
    this.peaks = [1e-3, 1e-3, 1e-3]; this.decay = Math.exp(-1 / (4 * fps))
    this.pending = []            // { k, time, period }
    this.accents = []            // { k, a }
    this.k = -1
    this.factor = 1
    this.parity = 0
    this.ratio = 1
  }

  frame(f, obs) {
    this.n++
    if (this.t0 === null) this.t0 = f.time
    const v = [obs, f.bands[0], f.bands[1]]
    for (let q = 0; q < 3; q++) { this.peaks[q] = Math.max(v[q], this.peaks[q] * this.decay, 1e-3); this.acc[q][this.n % this.R] = v[q] / this.peaks[q] }
    while (this.pending.length && this._idx(this.pending[0].time + this.pending[0].period / 4) <= this.n) {
      const p = this.pending.shift()
      const lo = this._idx(p.time - p.period / 8), hi = this._idx(p.time + p.period / 4)
      const a = [0, 0, 0]
      for (let j = lo; j <= hi; j++) if (j >= 0 && j > this.n - this.R && j <= this.n) for (let q = 0; q < 3; q++) a[q] = Math.max(a[q], this.acc[q][j % this.R])
      this.accents.push({ k: p.k, a })
      if (this.accents.length > this.memory) this.accents.shift()
    }
  }

  _idx(t) { return Math.round((t - this.t0) * this.fps) }

  /** A tracked pulse at `time` with period `period` (s) and tempo `bpm`. Returns true when it is a reported beat. */
  pulse(time, period, bpm, auto = true) {
    this.k++
    this.pending.push({ k: this.k, time, period })
    if (auto) this._decide(bpm)
    else if (this.factor === 2 && this.accents.length >= 4) {
      // forced halving: keep the parity with more accent (onset strength, low and mid bands)
      const s = [0, 0], c = [0, 0]
      for (const { k, a } of this.accents) { s[k % 2] += a[0] + a[1] + a[2]; c[k % 2]++ }
      this.parity = s[0] / Math.max(1, c[0]) >= s[1] / Math.max(1, c[1]) ? 0 : 1
    }
    return this.factor === 1 || (this.k % 2) === this.parity
  }

  _decide(bpm) {
    const A = this.accents
    if (A.length < 12) return
    const s = [[0, 0], [0, 0], [0, 0]], c = [0, 0]
    for (const { k, a } of A) { for (let q = 0; q < 3; q++) s[q][k % 2] += a[q]; c[k % 2]++ }
    // log ratio even / odd per accent
    const lr = s.map(([e, o]) => Math.log(Math.max(1e-6, e / c[0]) / Math.max(1e-6, o / c[1])))
    const strong = lr[0] >= 0 ? 0 : 1, sign = strong ? -1 : 1
    const agree = lr.every(x => sign * x >= Math.log(this.agree)) && sign * lr[1] >= Math.log(this.lowRatio)
    this.ratio = agree ? Math.exp(sign * (lr[0] + lr[1] + lr[2]) / 3) : 1
    const th = this.threshold - this.slope * (bpm - this.minBpm)
    if (bpm < this.minBpm) { this.factor = 1; return }
    if (this.factor === 1 && this.ratio > th + this.hysteresis) { this.factor = 2; this.parity = strong }
    else if (this.factor === 2 && this.ratio < th - this.hysteresis) this.factor = 1
    else if (this.factor === 2 && strong !== this.parity && this.ratio > th + this.hysteresis) this.parity = strong
  }
}
