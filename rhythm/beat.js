// Online beat tracker for #040: a forward-filtered HMM over the bar-pointer
// beat state space of Krebs, Böck & Widmer (ISMIR 2015), as in madmom's
// DBNBeatTrackingProcessor, run causally (filtering, not Viterbi) on a
// normalised onset strength in [0, 1].
//
// States: for every beat interval i (frames per beat, integer, one per
// tempo between minBpm and maxBpm) the positions p = 0 … i−1. Each frame p
// advances by one; at the end of a beat the chain may jump to another
// interval j with probability ∝ exp(−λ·|j/i − 1|) (λ = 100: tempo changes
// are small and happen only on beats). The observation model makes the
// frames around p = 0 (a 1/16-of-a-beat window centred on the beat) likely
// for strong onsets and the rest likely for weak ones.
//
// Every frame the posterior gives the distribution of frames until the next
// beat. The most likely value is the predicted next beat; a beat is
// reported once the prediction reaches the present (the analysis lags the
// input by `latency` frames, so a beat is emitted when it is due now or a
// little in the past and is timestamped at the predicted time). The
// prediction itself is what a metronome or a light should be scheduled from.

export class BeatTracker {
  /**
   * @param {number} fps frames per second of the onset strength
   * @param {object} [o]
   * @param {number} [o.minBpm=55]
   * @param {number} [o.maxBpm=215]
   * @param {number} [o.transitionLambda=100]
   * @param {number} [o.observationLambda=16]
   * @param {number} [o.latency=0] frames the analysis lags the input
   */
  constructor(fps, { minBpm = 55, maxBpm = 215, transitionLambda = 100, observationLambda = 16, latency = 0, tempoPriorWeight = 0, octaveJump = 0, obsBeta = 0 } = {}) {
    this.obsBeta = obsBeta
    this.fps = fps
    this.latency = latency
    this.tempoPriorWeight = tempoPriorWeight
    const iMin = Math.max(2, Math.floor(60 * fps / maxBpm)), iMax = Math.ceil(60 * fps / minBpm)
    this.intervals = Int32Array.from({ length: iMax - iMin + 1 }, (_, k) => iMin + k)
    const K = this.intervals.length
    this.K = K
    this.offset = new Int32Array(K + 1)
    for (let k = 0; k < K; k++) this.offset[k + 1] = this.offset[k] + this.intervals[k]
    this.S = this.offset[K]
    // transition matrix between intervals at the end of a beat
    this.lambda = transitionLambda
    this.trans = new Float64Array(K * K)
    for (let a = 0; a < K; a++) {
      let s = 0
      for (let b = 0; b < K; b++) {
        const r = this.intervals[b] / this.intervals[a]
        let v = Math.exp(-transitionLambda * Math.abs(r - 1))
        // rare jumps to double / half / 3:2 the tempo, so a wrong metrical level can be left
        if (octaveJump) for (const m of [2, 0.5, 1.5, 2 / 3, 3, 1 / 3]) v += octaveJump * Math.exp(-transitionLambda * Math.abs(r / m - 1))
        this.trans[a * K + b] = v; s += v
      }
      for (let b = 0; b < K; b++) this.trans[a * K + b] /= s
    }
    // beat states: a window of max(1, i/λobs) positions centred on p = 0
    this.isBeat = new Uint8Array(this.S)
    this.obsLambda = observationLambda
    for (let k = 0; k < K; k++) {
      const i = this.intervals[k], w = Math.max(1, Math.round(i / observationLambda))
      const after = Math.ceil(w / 2), before = w - after
      for (let p = 0; p < i; p++) if (p < after || p >= i - before) this.isBeat[this.offset[k] + p] = 1
    }
    this.alpha = new Float64Array(this.S).fill(1 / this.S)
    this.next = new Float64Array(this.S)
    this.ends = new Float64Array(K)
    this.prior = new Float64Array(K).fill(1)
    this.until = new Float64Array(this.intervals[K - 1] + 1)
    this.tempoMarginal = new Float64Array(K)
    this.frame = -1
    this.lastBeatFrame = -Infinity
    /** Frames until the predicted next beat (from the current analysis frame) and its posterior mass. */
    this.prediction = { frames: 0, mass: 0 }
  }

  /** BPM of interval index k. */
  bpm(k) { return 60 * this.fps / this.intervals[k] }

  /** Optional tempo prior over the intervals (e.g. from a tempogram); weights ≥ 0, any scale. */
  setTempoPrior(w) {
    let m = 0; for (let k = 0; k < this.K; k++) m = Math.max(m, w[k])
    for (let k = 0; k < this.K; k++) this.prior[k] = m > 0 ? (0.05 + w[k] / m) : 1
  }

  /**
   * One frame of observation o ∈ [0, 1]. Returns the beat it emits, if any:
   * { frame } where frame is the (fractional) analysis frame index of the beat.
   */
  step(o) {
    this.frame++
    const { K, intervals, offset, alpha, next, ends, trans, isBeat, S } = this
    // end-of-beat mass per interval
    for (let k = 0; k < K; k++) ends[k] = alpha[offset[k] + intervals[k] - 1]
    for (let k = 0; k < K; k++) {
      const o0 = offset[k], i = intervals[k]
      for (let p = i - 1; p > 0; p--) next[o0 + p] = alpha[o0 + p - 1]
      let s = 0
      for (let a = 0; a < K; a++) s += ends[a] * trans[a * K + k]
      next[o0] = s
    }
    // observation
    // madmom's model (for beat activations): p(beat) = o, p(no beat) = (1 − o) / (λ − 1);
    // for a raw onset strength a likelihood ratio exp(β·o) penalises off-beat onsets less
    let pb, pn
    if (this.obsBeta) { pb = Math.exp(this.obsBeta * o); pn = 1 }
    else { pb = Math.min(1, Math.max(1e-4, o)); pn = Math.max(1e-4, (1 - pb) / (this.obsLambda - 1)) }
    let sum = 0
    if (this.tempoPriorWeight) {
      // the tempo prior acts at the same rate for every tempo: prior^w per second
      const e = this.tempoPriorWeight / this.fps
      for (let k = 0; k < K; k++) { const g = this.prior[k] ** e, o0 = offset[k]; for (let p = 0; p < intervals[k]; p++) next[o0 + p] *= g }
    }
    for (let s = 0; s < S; s++) { const v = next[s] * (isBeat[s] ? pb : pn); alpha[s] = v; sum += v }
    if (!(sum > 0)) { alpha.fill(1 / S); sum = 1 } else for (let s = 0; s < S; s++) alpha[s] /= sum
    // frames until the next beat (p = 0), and the tempo marginal
    const until = this.until; until.fill(0)
    for (let k = 0; k < K; k++) {
      const o0 = offset[k], i = intervals[k]
      let m = 0
      for (let p = 0; p < i; p++) { const v = alpha[o0 + p]; m += v; until[p === 0 ? 0 : i - p] += v }
      this.tempoMarginal[k] = m
    }
    // most likely number of frames until the beat, smoothed over ±1 frame;
    // a beat just passed (d = interval − 1 … ) is folded back to a negative d
    let best = 0, bestV = -1
    for (let d = 0; d < until.length; d++) {
      const v = until[d] + 0.5 * ((d > 0 ? until[d - 1] : until[until.length - 1]) + (d + 1 < until.length ? until[d + 1] : 0))
      if (v > bestV) { bestV = v; best = d }
    }
    let d = best
    // "the beat is 1 frame ago" shows up as d = i − 1: take it as −1
    const ik = this.intervals[this.argmaxTempo()]
    if (d > ik - 1 - Math.max(1, Math.round(ik / this.obsLambda))) d -= ik
    this.prediction.frames = d
    this.prediction.mass = bestV
    // emit when the beat is due (the input runs `latency` frames ahead of the analysis)
    const beatFrame = this.frame + d
    if (d <= this.latency && beatFrame - this.lastBeatFrame > 0.6 * ik) {
      this.lastBeatFrame = beatFrame
      return { frame: beatFrame }
    }
    return null
  }

  argmaxTempo() {
    let b = 0; for (let k = 1; k < this.K; k++) if (this.tempoMarginal[k] > this.tempoMarginal[b]) b = k
    return b
  }

  /** Posterior-mean beat interval (frames), from the tempo marginal around its mode. */
  meanInterval() {
    const b = this.argmaxTempo(); let s = 0, w = 0
    for (let k = Math.max(0, b - 3); k <= Math.min(this.K - 1, b + 3); k++) { s += this.tempoMarginal[k] * this.intervals[k]; w += this.tempoMarginal[k] }
    return w > 0 ? s / w : this.intervals[b]
  }
}
