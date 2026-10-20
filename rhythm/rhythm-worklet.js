// AudioWorklet for #040 Rhythm: runs rhythm/analyzer.js on the input (first
// channel, or the mean of the first two) and posts what the page draws.
//
// In:  { type: 'tap', bpm }            bias the tracker toward a tapped tempo
//      { type: 'level', value }        'auto' | 1 | 2 (metrical level)
//      { type: 'reset' }               forget tempo, phase and meter
// Out: { type: 'start', contextTime }  context time of input sample 0 (first estimate;
//                                       every 'frames' message carries it again)
//      { type: 'beat', ...event, meter } on every beat, with the meter state
//      { type: 'frames', data, contextTime } per render block that completed frames:
//                                       Float32Array of [time, obs, low, mid, high, rms, nextBeat, bpm, active] per frame
//      { type: 'tempogram', bpm, strength } four times a second
//      { type: 'reset' }                after silence
//      { type: 'load', percent }        analysis time per second of audio, once a second
// Times are seconds of input; add contextTime for AudioContext time.

import { RhythmAnalyzer } from './analyzer.js'

const FIELDS = 9

class RhythmProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.a = new RhythmAnalyzer(sampleRate, { ...(options.processorOptions ?? {}), frames: true })
    this.mono = new Float32Array(128)
    this.buf = new Float32Array(FIELDS * 8)
    this.n = 0
    this.started = false
    this.busy = 0; this.audio = 0
    this.lastTg = 0
    this.port.onmessage = (e) => {
      const m = e.data
      if (m.type === 'tap') this.a.setTempoHint(m.bpm)
      else if (m.type === 'level') this.a.setLevel(m.value)
      else if (m.type === 'reset') { this.a.reset(); this.port.postMessage({ type: 'reset' }) }
    }
    this.emit = (e) => {
      if (e.type === 'frame') {
        if ((this.n + 1) * FIELDS > this.buf.length) { const b = new Float32Array(this.buf.length * 2); b.set(this.buf); this.buf = b }
        const o = this.n++ * FIELDS, b = this.buf
        b[o] = e.time; b[o + 1] = e.obs; b[o + 2] = e.bands[0]; b[o + 3] = e.bands[1]; b[o + 4] = e.bands[2]
        b[o + 5] = e.rms; b[o + 6] = e.nextBeat; b[o + 7] = e.bpm; b[o + 8] = e.active ? 1 : 0
      } else if (e.type === 'beat') {
        const m = this.a.meter
        this.port.postMessage({
          ...e,
          meter: {
            beatsPerBar: m.beatsPerBar, sub: m.sub, swing: m.swing, timeSignature: m.timeSignature(),
            grid: m.grid && { steps: m.grid.steps, beatsPerBar: m.grid.beatsPerBar, cells: m.grid.cells.map(c => Array.from(c)) },
            level: this.a.factor,
          },
        })
      } else this.port.postMessage(e)
    }
  }

  process(inputs, outputs) {
    for (const out of outputs[0] ?? []) out.fill(0)
    // with nothing connected the input has no channels: analyse silence, so
    // input time stays equal to context time minus contextTime
    const ch = inputs[0]?.length ? inputs[0] : [this.zero || (this.zero = new Float32Array(128))]
    if (!this.started) { this.started = true; this.port.postMessage({ type: 'start', contextTime: currentTime }) }
    let x = ch[0]
    if (ch.length > 1) {
      if (this.mono.length !== x.length) this.mono = new Float32Array(x.length)
      const a = ch[0], b = ch[1], m = this.mono
      for (let i = 0; i < m.length; i++) m[i] = 0.5 * (a[i] + b[i])
      x = m
    }
    const t0 = Date.now()
    this.a.push(x, this.emit)
    this.busy += Date.now() - t0
    // contextTime: the context time of input sample 0. Not simply the currentTime of the
    // first call: Chrome does not always run a new node's first render blocks
    const contextTime = currentTime + x.length / sampleRate - this.a.now
    if (this.n) { this.port.postMessage({ type: 'frames', data: this.buf.slice(0, this.n * FIELDS), contextTime }); this.n = 0 }
    this.audio += x.length
    if (this.a.tg.count < this.lastTg) this.lastTg = 0   // the analyser was reset
    if (this.a.tg.count - this.lastTg >= 25) {
      this.lastTg = this.a.tg.count
      const tg = this.a.tg
      this.port.postMessage({ type: 'tempogram', bpm: Float32Array.from(tg.intervals, i => 60 * this.a.fps / i), strength: Float32Array.from(tg.strength), tracker: Float32Array.from(this.a.bt.tempoMarginal) })
    }
    if (this.audio >= sampleRate) {
      this.port.postMessage({ type: 'load', percent: 100 * this.busy / (1000 * this.audio / sampleRate) })
      this.busy = 0; this.audio = 0
    }
    return true
  }
}

registerProcessor('rhythm-processor', RhythmProcessor)
