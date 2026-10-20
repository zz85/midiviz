// Meter, downbeat, subdivision, swing and a step grid for #040, from the
// beats the tracker emits and the frames between them.
//
// Each beat span [t(k−1), t(k)) is summarised once it has been heard:
//   - accents at the beat: the low (kick), mid (snare, chords) and high
//     (hats) band fluxes and the onset strength, each over −1/8 … +1/4 of a beat
//   - harmonic change at beat k (and from beat k−1 alone): 1 − cosine between the chroma of beats k, k+1
//     and of beats k−2, k−1 (two beats each side, so a snare's noise on one
//     beat does not read as a chord change); known one beat later
//   - a 24-bin profile of the onset strength across the beat (1/2, 1/3, 1/4,
//     1/6 of a beat all fall on bins)
// Meter: bars repeat, so the beat summaries are compared with the ones 2, 3
// and 4 beats back (cosine of the centred vectors); a clear lag-3 repeat
// (above 0.45 and 0.25 above lags 2 and 4) means 3 beats to the bar,
// otherwise 4 (2/4 and 4/4 are not told apart).
// Downbeat: the bar phase whose beats carry the most harmonic change (Goto
// 2001; Papadopoulos & Peeters 2011) and the most low-band onset energy
// (kick, bass), with less hi-hat (Davies & Plumbley 2006), accumulated with decay so it
// settles after two or three bars.
// Subdivision and swing: a decaying histogram of the profile; duple vs triple
// from the energy at 1/2, 1/4, 3/4 vs 1/3, 2/3; swing from where the
// off-beat peak sits between 1/2 and 3/4 (ratio p / (1 − p), 2.0 = triplet
// swing, Friberg & Sundström 2002), when there is no 1/3 subdivision.

const BINS = 24

export class Meter {
  constructor(fps, { seconds = 16, memory = 24, dbDecay = 0.92, dbMargin = 0.8, dbW = [0.5, 0, -0.5, 0.5, 1.5, 0.5] } = {}) {
    this.dbDecay = dbDecay; this.dbMargin = dbMargin
    this.dbW = dbW
    this.fps = fps
    this.R = Math.round(seconds * fps)
    this.obs = new Float64Array(this.R)
    this.band = [new Float64Array(this.R), new Float64Array(this.R), new Float64Array(this.R)]
    this.rawBand = [new Float64Array(this.R), new Float64Array(this.R), new Float64Array(this.R)]
    this.chroma = new Float64Array(this.R * 12)
    this.bandPeak = [1e-3, 1e-3, 1e-3]
    this.peakDecay = Math.exp(-1 / (4 * fps))
    this.n = -1                 // last frame index
    this.t0 = null              // time of frame 0
    this.beatTimes = []
    this.feats = []             // per summarised beat: { k, low, mid, high, obs, change, profile, chroma }
    this.memory = memory
    this.hist = new Float64Array(BINS)
    this.histBands = [new Float64Array(BINS), new Float64Array(BINS), new Float64Array(BINS)]
    this.scores = { 3: new Float64Array(3), 4: new Float64Array(4) }
    this.lagSim = { 2: 0, 3: 0, 4: 0 }
    this.beatsPerBar = 4
    this.phase = 0              // beat index k with (k − phase) % beatsPerBar === 0 is a downbeat
    this.sub = 2
    this.swing = 1
    this.grid = null            // { steps, cells: [band][bar step] }
    this._onbeat = []; this._all = []
  }

  frame(f, obs) {
    this.n++
    if (this.t0 === null) this.t0 = f.time
    const i = this.n % this.R
    this.obs[i] = obs
    for (let b = 0; b < 3; b++) {
      this.bandPeak[b] = Math.max(f.bands[b], this.bandPeak[b] * this.peakDecay, 1e-3)
      this.band[b][i] = f.bands[b] / this.bandPeak[b]
      this.rawBand[b][i] = f.bands[b]
    }
    this.chroma.set(f.chroma, i * 12)
  }

  _idx(t) { return Math.round((t - this.t0) * this.fps) }
  _ok(n) { return n >= 0 && n <= this.n && n > this.n - this.R }
  _max(arr, a, b) { let m = 0; for (let n = a; n <= b; n++) if (this._ok(n)) m = Math.max(m, arr[n % this.R]); return m }
  _sum(arr, a, b) { let m = 0; for (let n = a; n <= b; n++) if (this._ok(n)) m += arr[n % this.R]; return m }

  /** A beat at `time` with period `period` (s). Returns this beat's place in the bar. */
  beat(time, period) {
    this.beatTimes.push(time)
    const k = this.beatTimes.length - 1
    if (k >= 1) this._summarise(k - 1, this.beatTimes[k - 1], time)
    if (this.beatTimes.length > 64) this.beatTimes.shift()
    const kk = this._k = (this._k ?? -1) + 1
    const barBeat = ((kk - this.phase) % this.beatsPerBar + this.beatsPerBar) % this.beatsPerBar
    return { downbeat: barBeat === 0, barBeat, beatsPerBar: this.beatsPerBar }
  }

  _summarise(k, t, tEnd) {
    const p = tEnd - t
    if (!(p > 0.15 && p < 2)) return
    const a = this._idx(t - p / 8), b = this._idx(t + p / 4)
    const kAbs = this._k ?? 0                 // absolute index of beat k (the one before the latest)
    const f = {
      k: kAbs,
      // accents: band flux summed over the window (log, so z-scores are not ruled by one loud hit)
      low: Math.log1p(this._sum(this.rawBand[0], a, b)), mid: Math.log1p(this._sum(this.rawBand[1], a, b)), high: Math.log1p(this._sum(this.rawBand[2], a, b)),
      obs: this._max(this.obs, a, b),
      profile: new Float64Array(BINS), bands: [new Float64Array(BINS), new Float64Array(BINS), new Float64Array(BINS)],
      chroma: new Float64Array(12), change: 0, change1: 0,
    }
    // profile over the beat, bin j centred on t + j/BINS·p
    // (the loudest of the onset strength and the three peak-normalised bands, so hi-hats count as much as kicks)
    for (let j = 0; j < BINS; j++) {
      const c0 = this._idx(t + (j - 0.5) * p / BINS), c1 = Math.max(c0, this._idx(t + (j + 0.5) * p / BINS) - 1)
      let v = this._max(this.obs, c0, c1)
      for (let q = 0; q < 3; q++) { f.bands[q][j] = this._max(this.band[q], c0, c1); v = Math.max(v, f.bands[q][j]) }
      f.profile[j] = v
    }
    // chroma over the beat
    const s0 = this._idx(t), s1 = this._idx(tEnd) - 1
    let cnt = 0
    for (let n = s0; n <= s1; n++) if (this._ok(n)) { const o = (n % this.R) * 12; for (let c = 0; c < 12; c++) f.chroma[c] += this.chroma[o + c]; cnt++ }
    let norm = 0; for (let c = 0; c < 12; c++) norm += f.chroma[c] ** 2
    norm = Math.sqrt(norm) || 1; for (let c = 0; c < 12; c++) f.chroma[c] /= norm
    const prev = this.feats[this.feats.length - 1]
    if (prev && prev.k === kAbs - 1) { let d = 0; for (let c = 0; c < 12; c++) d += f.chroma[c] * prev.chroma[c]; f.change1 = 1 - d } else f.change1 = 0
    this.feats.push(f)
    const F = this.feats, n = F.length
    if (n >= 4 && F[n - 1].k - F[n - 4].k === 3) {
      const a = new Float64Array(12), b = new Float64Array(12)
      for (let c = 0; c < 12; c++) { a[c] = F[n - 4].chroma[c] + F[n - 3].chroma[c]; b[c] = F[n - 2].chroma[c] + F[n - 1].chroma[c] }
      let d = 0, na = 0, nb = 0; for (let c = 0; c < 12; c++) { d += a[c] * b[c]; na += a[c] ** 2; nb += b[c] ** 2 }
      F[n - 2].change = na && nb ? 1 - d / Math.sqrt(na * nb) : 0
    }
    if (this.feats.length > this.memory) this.feats.shift()
    // beat-strength statistics for confidence
    let between = 0, nb = 0
    for (let j = 3; j < BINS - 3; j++) { between += f.profile[j]; nb++ }
    this._onbeat.push(Math.max(f.profile[0], f.profile[1], f.profile[BINS - 1])); this._all.push(between / nb)
    if (this._onbeat.length > 8) { this._onbeat.shift(); this._all.shift() }
    // subdivision histogram
    const dec = 0.85
    for (let j = 0; j < BINS; j++) {
      this.hist[j] = dec * this.hist[j] + f.profile[j]
      for (let q = 0; q < 3; q++) this.histBands[q][j] = dec * this.histBands[q][j] + f.bands[q][j]
    }
    this._subdivision()
    this._meter()
    this._grid()
  }

  _vec(f) {
    // beat summary used for bar-repetition: accents, profile, chroma
    const v = [2 * f.low, 2 * f.mid, 2 * f.high, f.change * 3]
    for (let j = 0; j < BINS; j += 2) v.push(Math.max(f.profile[j], f.profile[j + 1]))
    for (const c of f.chroma) v.push(c * 1.5)
    return v
  }

  _meter() {
    const F = this.feats
    if (F.length < 6) return
    const V = F.map(f => this._vec(f)), D = V[0].length
    const mu = new Float64Array(D)
    for (const v of V) for (let d = 0; d < D; d++) mu[d] += v[d] / V.length
    const C = V.map(v => v.map((x, d) => x - mu[d]))
    const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (let d = 0; d < D; d++) { s += a[d] * b[d]; na += a[d] ** 2; nb += b[d] ** 2 } return na && nb ? s / Math.sqrt(na * nb) : 0 }
    for (const L of [2, 3, 4]) {
      let s = 0, c = 0
      for (let i = L; i < C.length; i++) if (F[i].k - F[i - L].k === L) { s += cos(C[i], C[i - L]); c++ }
      if (c) this.lagSim[L] = 0.8 * this.lagSim[L] + 0.2 * (s / c)
    }
    // waltzes repeat at lag 3 with similarity 0.7–0.9 and anti-correlate at 2 and 4;
    // 4/4 songs with a busy texture reach 0.2–0.35 at lag 3, so demand a clear margin
    const other = Math.max(this.lagSim[2], this.lagSim[4])
    const want3 = this.lagSim[3] > 0.45 && this.lagSim[3] > other + 0.25
    const keep3 = this.lagSim[3] > 0.35 && this.lagSim[3] > other + 0.1
    const m = this.beatsPerBar === 3 ? (keep3 ? 3 : 4) : (want3 ? 3 : 4)
    // downbeat phase: accumulate accent per bar position (decayed)
    const f = F[F.length - 2]
    const G = F.slice(0, -1)   // the last beat's change is not known yet
    const z = (key) => { let s = 0, s2 = 0; for (const g of G) { s += g[key]; s2 += g[key] ** 2 } const mean = s / G.length, sd = Math.sqrt(Math.max(1e-9, s2 / G.length - mean * mean)); return (f[key] - mean) / sd }
    // weights fitted with the true beats on the test corpus and the demo loops
    // (the snare's mid band on 2 and 4 rules mid out); dbW = low, mid, high, onset, change over
    // 2 + 2 beats, change from the last beat
    const W = this.dbW
    const accent = W[0] * z('low') + W[1] * z('mid') + W[2] * z('high') + W[3] * z('obs') + W[4] * z('change') + W[5] * z('change1')
    for (const M of [3, 4]) {
      const sc = this.scores[M]
      for (let ph = 0; ph < M; ph++) sc[ph] *= this.dbDecay
      sc[((f.k % M) + M) % M] += accent        // phase = k mod M when beat k is a downbeat
    }
    const sc = this.scores[m]
    let best = 0; for (let ph = 1; ph < m; ph++) if (sc[ph] > sc[best]) best = ph
    const cur = ((this.phase % m) + m) % m
    if (m !== this.beatsPerBar || sc[best] > sc[cur] + this.dbMargin) this.phase = best
    this.beatsPerBar = m
  }

  _subdivision() {
    const h = this.hist, at = j => Math.max(h[j - 1] ?? 0, h[j], h[j + 1] ?? 0)
    const ref = Math.max(1e-9, at(0) || h[0])
    const half = at(12) / ref, third = (at(8) + at(16)) / 2 / ref, quarter = (at(6) + at(18)) / 2 / ref
    this.sub = third > 1.15 * Math.max(half, quarter) && Math.min(at(8), at(16)) / ref > 0.12 ? 3 : 2
    // swing: the off-beat peak between 1/2 and 3/4 when 1/3 is empty
    // (search 1/2 … 17/24 = ratio 1 … 2.4); not with a sixteenth-note grid, where 3/4 is a straight note
    let pk = 12; for (let j = 12; j <= 17; j++) if (h[j] > h[pk]) pk = j
    let s = 0, w = 0; for (let j = Math.max(12, pk - 1); j <= Math.min(17, pk + 1); j++) { s += j * h[j]; w += h[j] }
    const pos = w > 0 ? s / w / BINS : 0.5
    const offbeat = h[pk] / ref
    const sixteenths = Math.min(at(6), at(18)) > 0.5 * h[pk]
    this.swing = this.sub === 2 && !sixteenths && offbeat > 0.15 && at(8) / ref < 0.5 * offbeat ? Math.max(1, pos / (1 - pos)) : 1
    this.subStrength = { half, third, quarter }
  }

  _grid() {
    const m = this.beatsPerBar, steps = this.sub === 3 ? 3 : 4, per = BINS / steps
    const cells = [0, 1, 2].map(() => new Float64Array(m * steps))
    const cnt = new Float64Array(m * steps)
    for (const f of this.feats.slice(-m * 4)) {
      const bb = ((f.k - this.phase) % m + m) % m
      for (let s = 0; s < steps; s++) {
        const j0 = Math.round(s * per)
        const span = [j0 - 1, j0, j0 + 1].map(j => (j + BINS) % BINS)
        for (let q = 0; q < 3; q++) cells[q][bb * steps + s] += Math.max(...span.map(j => j === BINS - 1 && s === 0 ? 0 : f.bands[q][j]))
        cnt[bb * steps + s]++
      }
    }
    for (let q = 0; q < 3; q++) for (let i = 0; i < cells[q].length; i++) cells[q][i] = cnt[i] ? cells[q][i] / cnt[i] : 0
    this.grid = { beatsPerBar: m, steps, cells }
  }

  /** e.g. 4/4, 3/4, 6/8, 12/8 */
  timeSignature() {
    const m = this.beatsPerBar
    if (this.sub === 3) return m === 3 ? '9/8' : m === 4 ? '12/8' : '6/8'
    return `${m}/4`
  }

  confidence() {
    if (this._onbeat.length < 3) return 0
    const a = this._onbeat.reduce((s, x) => s + x, 0) / this._onbeat.length
    const b = this._all.reduce((s, x) => s + x, 0) / this._all.length
    return Math.max(0, Math.min(1, (a - b) / Math.max(0.05, a)))
  }
}
