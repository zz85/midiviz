// AudioWorklet for #039 Tuner: runs tuner/pitch.js's PitchTracker on the
// input (first channel, or the sum of the first two) and posts one reading
// per hop. Messages in: { type: 'config', ...PitchTracker options } and
// { type: 'reset' }. Out: { type: 'pitch', readings: [...] } per render block
// that completed a hop, and { type: 'load', ms } (analysis time per second of
// audio) once a second.

import { PitchTracker } from './pitch.js'

class TunerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const o = options.processorOptions ?? {}
    this.tracker = new PitchTracker({ sampleRate, ...o })
    this.mono = new Float32Array(128)
    this.busy = 0
    this.audio = 0
    this.port.onmessage = (e) => {
      const m = e.data
      if (m.type === 'config') this.tracker.configure(m)
      else if (m.type === 'reset') this.tracker.reset()
    }
  }

  process(inputs, outputs) {
    const ch = inputs[0]
    if (outputs[0]?.[0]) outputs[0][0].fill(0)
    if (!ch || !ch.length) return true
    let x = ch[0]
    if (ch.length > 1) {
      if (this.mono.length !== x.length) this.mono = new Float32Array(x.length)
      const a = ch[0], b = ch[1], m = this.mono
      for (let i = 0; i < m.length; i++) m[i] = 0.5 * (a[i] + b[i])
      x = m
    }
    const t0 = Date.now()
    const readings = this.tracker.push(x)
    this.busy += Date.now() - t0
    if (readings.length) this.port.postMessage({ type: 'pitch', readings })
    this.audio += x.length
    if (this.audio >= sampleRate) {
      this.port.postMessage({ type: 'load', ms: (1000 * this.busy) / (1000 * this.audio / sampleRate) })
      this.busy = 0
      this.audio = 0
    }
    return true
  }
}

registerProcessor('tuner-processor', TunerProcessor)
