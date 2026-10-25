// AudioWorklet processor for the bowed-string model.
import { ViolinModel } from './violin-core.js';

class PhysicalViolinProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.model = new ViolinModel(sampleRate);
    this.statsEvery = Math.floor(sampleRate / 10);
    this.sinceStats = 0;
    // optional deterministic event script for offline rendering: [{ t: seconds, type, midi?, params? }]
    this.events = (options?.processorOptions?.events || []).slice().sort((a, b) => a.t - b.t);
    this.port.onmessage = ({ data }) => this.apply(data);
  }

  apply(ev) {
    if (ev.type === 'params') this.model.setParams(ev.params);
    else if (ev.type === 'noteOn') this.model.noteOnMidi(ev.midi);
    else if (ev.type === 'noteOff') this.model.noteOffMidi();
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    while (this.events.length && this.events[0].t * sampleRate <= currentFrame + out.length) this.apply(this.events.shift());
    this.model.process(out, out.length);
    this.sinceStats += out.length;
    if (this.sinceStats >= this.statsEvery) {
      const s = this.model.stats();
      const periods = (this.sinceStats / sampleRate) * s.f0;
      this.port.postMessage({ slipsPerPeriod: s.slips / periods, f0: s.f0, string: s.string, noteOn: this.model.noteOn });
      this.sinceStats = 0;
    }
    return true;
  }
}

// 4-line feedback delay network: prime-length delays, Householder mixing,
// per-line damping, RT60-derived feedback gains. Mirrors SimdFdnReverb in spirit.
class FdnRoomProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rt60', defaultValue: 1.6, minValue: 0.1, maxValue: 8 },
      { name: 'damping', defaultValue: 0.35, minValue: 0, maxValue: 0.95 },
      { name: 'size', defaultValue: 1, minValue: 0.3, maxValue: 2 },
    ];
  }

  constructor() {
    super();
    const base = [1499, 1889, 2311, 2729];
    this.maxLen = 2729 * 3;
    this.lines = base.map(() => new Float32Array(this.maxLen));
    this.base = base;
    this.w = 0;
    this.lp = new Float32Array(4);
    this.lens = new Int32Array(4);
    this.gains = new Float32Array(4);
    this.y = new Float32Array(4);
  }

  process(inputs, outputs, params) {
    const input = inputs[0][0];
    const [outL, outR] = outputs[0];
    const n = outL.length;
    const rt60 = params.rt60[0];
    const damp = params.damping[0];
    const size = params.size[0];
    const scale = (sampleRate / 48000) * size;
    const lens = this.lens, gains = this.gains, y = this.y;
    for (let k = 0; k < 4; k++) {
      lens[k] = Math.min(this.maxLen - 1, Math.floor(this.base[k] * scale));
      gains[k] = Math.pow(10, (-3 * lens[k]) / (sampleRate * rt60));
    }
    const m = this.maxLen;
    for (let i = 0; i < n; i++) {
      const x = input ? input[i] : 0;
      for (let k = 0; k < 4; k++) {
        const v = this.lines[k][(this.w - lens[k] + m) % m];
        this.lp[k] = v - (v - this.lp[k]) * damp;
        y[k] = this.lp[k] * gains[k];
      }
      const sum = (y[0] + y[1] + y[2] + y[3]) * 0.5;           // Householder reflection
      for (let k = 0; k < 4; k++) this.lines[k][this.w] = x + (y[k] - sum);
      outL[i] = (y[0] + y[2]) * 0.5;
      outR[i] = (y[1] + y[3]) * 0.5;
      this.w = (this.w + 1) % m;
    }
    return true;
  }
}

registerProcessor('physical-violin', PhysicalViolinProcessor);
registerProcessor('fdn-room', FdnRoomProcessor);
