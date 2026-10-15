// AudioWorklet wrapper around HallReverb: stereo in, stereo out.
// Settings arrive on the port as plain objects (see HallReverb.set).
import { HallReverb } from './hall-reverb.js'

class HallProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.rv = new HallReverb(sampleRate)
    this.port.onmessage = e => {
      if (e.data === 'reset') this.rv.reset()
      else this.rv.set(e.data)
    }
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0]
    const n = out[0].length
    const l = inp[0] || (this.zero ||= new Float32Array(n)), r = inp[1] || l
    this.rv.process(l, r, out[0], out[1] || out[0], n)
    return true
  }
}
registerProcessor('hall-reverb', HallProcessor)
