// #040 rhythm analyser: audio in, beats / tempo / meter / rhythm out.
//
//   OnsetFrontEnd (onset.js)  SuperFlux onset strength, band fluxes, chroma
//   normalise                 onset strength → [0, 1] against a decaying peak
//   Tempogram (tempo.js)      comb-filtered ACF tempo curve, fed back as a tempo prior
//   BeatTracker (beat.js)     forward-filtered bar-pointer HMM, predicted beats
//   Meter (meter.js)          beats per bar, downbeat, subdivision, swing, step grid
//
// Use: const a = new RhythmAnalyzer(sampleRate); a.push(samples, ev => …)
// Events: { type: 'beat', time, index, bpm, downbeat, barBeat, beatsPerBar, confidence }
//         { type: 'frame', time, obs, rms, bands, nextBeat, bpm, active } every frame
//           when options.frames is set (for displays)
//         { type: 'reset' } after silence, when the tracker starts over
// Times are in seconds of input pushed (sample count / sample rate). A beat is
// emitted when it is due, give or take a frame: its `time` is the predicted
// beat, usually a few ms ahead of the input (lag −4 ms on the test corpus).
//
// Silence: below `floorDb` for `idleSeconds` the analyser stops emitting
// beats; after `resetSeconds` it forgets the tempo and starts over.

import { OnsetFrontEnd } from './onset.js'
import { BeatTracker } from './beat.js'
import { Tempogram } from './tempo.js'
import { Meter } from './meter.js'
import { LevelSelector } from './level.js'

export const DEFAULTS = {
  fps: 100,
  minBpm: 55, maxBpm: 200,  // 215 let busy 160 BPM grooves lock at 4:3 (213)
  transitionLambda: 100,
  observationLambda: 16,
  peakDecay: 4,           // s for the normaliser's running peak to fall to 1/e
  floorDb: -60,           // below this frame level (dBFS RMS) the input counts as silence
  idleSeconds: 1.5,       // silence before beats stop
  resetSeconds: 3,        // silence before the tracker starts over
  gamma: 1,               // o ← o^gamma after normalising
  meanSub: 0.5,           // subtract this × the local mean (≈0.3 s) before normalising
  tempoPriorWeight: 1,
  octaveJump: 0,
  obsBeta: 5,
  levelSelect: 1,         // halve the tracked pulse when every other one is accented (level.js)
  levelThreshold: 1.5,
  levelMinBpm: 105,
  dbDecay: 0.96,          // downbeat evidence kept per beat
  dbMargin: 2,            // evidence needed to move the downbeat
  dbW: [0.5, 0, -0.5, 0.5, 1.5, 0.5], // downbeat accent weights: low, mid, high, onset, harmonic change (2 + 2 beats), change (1 beat)
  centreBpm: 120,
  octaveWidth: 1.4,
  wLow: 1, wMid: 1, wHigh: 1, // band weights of the onset strength
}

export class RhythmAnalyzer {
  constructor(sampleRate, options = {}) {
    const o = this.o = { ...DEFAULTS, ...options }
    this.sr = sampleRate
    this.fe = new OnsetFrontEnd(sampleRate, { fps: o.fps })
    this.fps = this.fe.fps
    // the input runs N/2 samples plus up to a hop ahead of a frame's timestamp
    this.latencyFrames = Math.ceil((this.fe.nfft / 2) / this.fe.hop)
    this._build()
  }

  _build() {
    const o = this.o
    this.bt = new BeatTracker(this.fps, { minBpm: o.minBpm, maxBpm: o.maxBpm, transitionLambda: o.transitionLambda, observationLambda: o.observationLambda, latency: this.latencyFrames, tempoPriorWeight: o.tempoPriorWeight, octaveJump: o.octaveJump, obsBeta: o.obsBeta })
    this.tg = new Tempogram(this.fps, this.bt.intervals, { centreBpm: o.centreBpm, octaveWidth: o.octaveWidth })
    this.meter = new Meter(this.fps, { dbDecay: o.dbDecay, dbMargin: o.dbMargin, dbW: o.dbW })
    this.level = new LevelSelector(this.fps, { threshold: o.levelThreshold, minBpm: o.levelMinBpm })
    this.peak = 1e-3
    this.quiet = this.quiet ?? 0    // frames below the floor
    this.levelOverride = this.levelOverride ?? 0   // 0 auto, 1 as tracked, 2 half
    this.hint = null                // { frames } while a tap tempo prior is held
    this.tapBpm = null
    this.peakDecay = Math.exp(-1 / (o.peakDecay * this.fps))
    this.meanN = Math.max(1, Math.round(0.3 * this.fps))
    this.meanRing = new Float64Array(this.meanN); this.meanSum = 0; this.meanPos = 0
    this.floor = 10 ** (o.floorDb / 20)
    this.beats = []                 // emitted beat times (s)
    this.beatCount = 0
    this.lastObs = 0
    this.frameEvent = { type: 'frame', time: 0, flux: 0, obs: 0, rms: 0, bands: null, nextBeat: 0, bpm: 0, active: false }
  }

  /** Forget tempo, phase and meter (the onset front end keeps running). */
  reset() {
    const frames = this.bt.frame, quiet = this.quiet
    this._build()
    // keep frame numbering continuous so times stay on the same clock, and the silence count
    this.bt.frame = frames
    this.quiet = quiet
  }

  /**
   * Tap tempo: the tracker is pulled to `bpm` (its belief is reweighted now,
   * and the tempogram's tempo preference moves there with a width of a
   * quarter octave, so neighbouring tempos stay reachable), and the reported
   * level follows the taps: a pulse near twice the tapped tempo is halved.
   * Lasts until reset() or setTempoHint(null).
   */
  setTempoHint(bpm) {
    this.tapBpm = bpm || null
    const tg = this.tg
    const centre = bpm || this.o.centreBpm, width = bpm ? 0.25 : this.o.octaveWidth
    tg.weight = Float64Array.from(tg.intervals, i => Math.exp(-0.5 * (Math.log2(60 * tg.fps / i / centre) / width) ** 2))
    if (!bpm) return
    const w = Float64Array.from(this.bt.intervals, i => Math.exp(-0.5 * (Math.log2(60 * this.fps / i / bpm) / 0.04) ** 2))
    this.bt.setTempoPrior(w)
    this.hint = { frames: Math.round(2 * this.fps) }   // until the tempogram has refilled with the new weights
    const { alpha, offset, intervals, K } = this.bt
    let sum = 0
    for (let k = 0; k < K; k++) for (let p = 0; p < intervals[k]; p++) { alpha[offset[k] + p] *= 1e-4 + w[k]; sum += alpha[offset[k] + p] }
    for (let s = 0; s < alpha.length; s++) alpha[s] /= sum
  }

  /** Metrical level: 'auto', 1 (the pulse as tracked) or 2 (every other pulse). */
  setLevel(v) { this.levelOverride = v === 'auto' ? 0 : v; if (v !== 'auto') this.level.factor = v }

  get factor() { return this.o.levelSelect || this.levelOverride || this.tapBpm ? this.level.factor : 1 }

  /** Current time of the input (s): what has been pushed so far. */
  get now() { return this.fe.total / this.sr }

  push(samples, emit = () => {}) {
    this.fe.push(samples, f => this._frame(f, emit))
  }

  _frame(f, emit) {
    const o = this.o
    // normalise the onset strength
    let x = f.rms < this.floor ? 0 : o.wLow * f.bands[0] + o.wMid * f.bands[1] + o.wHigh * f.bands[2]
    const mean = this.meanSum / this.meanN
    this.meanSum += x - this.meanRing[this.meanPos]; this.meanRing[this.meanPos] = x; this.meanPos = (this.meanPos + 1) % this.meanN
    let y = Math.max(0, x - o.meanSub * mean)
    this.peak = Math.max(y, this.peak * this.peakDecay, 1e-3)
    let obs = y / this.peak
    if (o.gamma !== 1) obs = obs ** o.gamma
    this.lastObs = obs
    // silence: stop emitting, then start over
    this.quiet = f.rms < this.floor ? this.quiet + 1 : 0
    const active = this.quiet < o.idleSeconds * this.fps
    if (this.quiet === Math.round(o.resetSeconds * this.fps)) { this.reset(); emit({ type: 'reset', time: f.time }); return }
    this.tg.push(x / this.peak)
    if (this.hint) { if (--this.hint.frames <= 0) this.hint = null }
    else if (this.tg.updated && o.tempoPriorWeight) this.bt.setTempoPrior(this.tg.strength)
    let beat = this.bt.step(obs)
    this.meter.frame(f, obs)
    this.level.frame(f, obs)
    const frameTime = f.time
    if (beat) {
      const time = frameTime + (beat.frame - this.bt.frame) / this.fps
      const pulseBpm = 60 * this.fps / this.bt.meanInterval()
      let forced = this.levelOverride
      if (!forced && this.tapBpm) forced = Math.abs(pulseBpm / this.tapBpm / 2 - 1) < 0.12 ? 2 : 1
      if (forced) this.level.factor = forced
      const auto = o.levelSelect && !forced
      const keep = this.level.pulse(time, 60 / pulseBpm, pulseBpm, auto)
      if (!keep || !active) beat = null
      else this.beats.push(time)
    }
    if (beat) {
      const time = this.beats[this.beats.length - 1]
      const bpm = this.bpm()
      const m = this.meter.beat(time, 60 / bpm)
      emit({ type: 'beat', time, index: this.beatCount++, bpm, downbeat: m.downbeat, barBeat: m.barBeat, beatsPerBar: m.beatsPerBar, confidence: this.confidence() })
    }
    if (o.frames) {
      const e = this.frameEvent
      e.time = frameTime; e.flux = f.flux; e.obs = obs; e.rms = f.rms; e.bands = f.bands
      // the next reported beat: the predicted pulse, or the one after when halving skips it
      const ip = this.bt.meanInterval()
      let d = this.bt.prediction.frames
      if (d < -this.latencyFrames) d += ip
      if (this.factor === 2 && (this.level.k + 1) % 2 !== this.level.parity) d += ip
      e.nextBeat = frameTime + d / this.fps
      e.active = active
      e.bpm = this.bpm()
      emit(e)
    }
  }

  /** Tempo (BPM): a line fitted to the last 8 beats when they agree with the tracker, else the tracker's interval. */
  bpm() {
    const hmm = 60 * this.fps / this.bt.meanInterval() / this.factor
    const b = this.beats, n = Math.min(8, b.length)
    if (n >= 4) {
      const t = b.slice(-n)
      let sx = 0, sy = 0, sxx = 0, sxy = 0
      for (let i = 0; i < n; i++) { sx += i; sy += t[i]; sxx += i * i; sxy += i * t[i] }
      const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
      const fit = 60 / slope
      if (Math.abs(fit / hmm - 1) < 0.04) return fit
    }
    return hmm
  }

  /** 0…1: how much stronger the onsets are on the beats than between them, over the last bars. */
  confidence() { return this.meter.confidence() }
}
