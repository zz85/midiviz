// AudioWorklet for Experiment #034: ViolinSynth driven by precomputed
// performance curves (song playback) or by live notes (MIDI keyboard, clicks).
//
// Port messages in:
//   { type: 'instrument', instrument, model }
//   { type: 'curves', frameRate, frames, data }      (data: Float32Array, transferred)
//   { type: 'play', t, speed } | { type: 'pause' } | { type: 'seek', t } | { type: 'speed', speed }
//   { type: 'on', string, f0, dyn, id } | { type: 'off', id } | { type: 'bend', id, f0 }
//   { type: 'level', value }
//   { type: 'params', bowPress, rosin, resonance, body } (ViolinSynth.setParams;
//                                                         body may be a measured IR object)
//   { type: 'live', expr, vib, bend }                   live controllers: expression
//        0…1 or null (CC11 / CC2: the bow's dynamic; velocity then only shapes
//        the attack), vibrato depth 0…1 or null (CC1; null = automatic), bend cents
// Port messages out: { type: 'time', t } every ~40 ms while playing.
import { ViolinSynth, CurveSource, NCH, midiHz, INSTRUMENTS } from './bowed.js'

/** Live control: one bowed note per string, alternating bows, delayed vibrato. */
class LiveSource {
  constructor(instrument) { this.setInstrument(instrument); this.notes = new Map(); this.dir = 1; this.ctl = { expr: null, vib: null, bend: 0 }; this.ex = null }
  setInstrument(instrument) { this.open = (INSTRUMENTS[instrument] || INSTRUMENTS.violin).open.map(midiHz); this.state = this.open.map(f => ({ f0: f, target: f, v: 0, F: 0, beta: 0.1, damp: 0, tap: 0, on: null })) }
  on(m, now) {
    const st = this.state[m.string]
    this.dir = -this.dir
    st.on = { id: m.id, t0: now, dyn: m.dyn ?? 0.7, dir: this.dir }
    st.target = m.f0
    if (m.f0 > this.open[m.string] * 1.01) st.tap = 0.015
    this.notes.set(m.id, m.string)
  }
  off(id) { const s = this.notes.get(id); if (s == null) return; this.notes.delete(id); const st = this.state[s]; if (st.on?.id === id) { st.on.off = true } }
  bend(id, f0) { const s = this.notes.get(id); if (s != null) this.state[s].target = f0 }
  at(t, out) {
    for (let s = 0; s < 4; s++) {
      const st = this.state[s], o = s * NCH
      let v = 0, F = 0, vib = 0
      // expression controller, smoothed (~15 ms at the control rate)
      if (this.ctl.expr != null) this.ex = this.ex == null ? this.ctl.expr : this.ex + (this.ctl.expr - this.ex) * 0.02
      if (st.on) {
        const age = t - st.on.t0
        // with an expression controller the dynamic follows it; the velocity adds a bite to the attack
        const d = this.ex != null ? Math.max(0.05, Math.min(1, this.ex)) * (age < 0.08 ? 0.85 + 0.3 * st.on.dyn : 1) : st.on.dyn
        const atk = Math.min(1, age / 0.05), V = (0.18 + 0.35 * d)
        if (st.on.off) { st.rel = (st.rel ?? 1) * 0.9; if (st.rel < 0.01) { st.on = null; st.rel = 1; st.damp = st.f0 > this.open[s] * 1.01 ? 0.8 : 0 } }
        const rel = st.on ? (st.rel ?? 1) : 0
        v = (st.on?.dir ?? 1) * V * atk * rel
        st.beta = 0.13 - 0.06 * d
        F = Math.max(Math.abs(v) * (0.6 + 0.9 * d) * Math.sqrt(0.1 / st.beta), 0.02 * Math.abs(v) / (st.beta * st.beta) * 1.1)
        // vibrato: CC1 sets the depth directly (0…1 → 0…40 cents); otherwise a delayed automatic one
        if (st.target > this.open[s] * 1.01) {
          if (this.ctl.vib != null) { st.vph = (st.vph ?? 0) + 2 * Math.PI * (5.2 + 1.2 * this.ctl.vib) / 3000; vib = 40 * this.ctl.vib * Math.sin(st.vph) }
          else if (age > 0.35) vib = Math.min(1, (age - 0.35) / 0.4) * (14 + 16 * d) * Math.sin(2 * Math.PI * 5.8 * (age - 0.35))
        }
      } else { st.damp *= 0.995 }
      if (!st.on) st.rel = 1
      // fingers move fast; a slide only when the target jumps far
      st.f0 += (st.target - st.f0) * 0.35
      out[o] = st.f0 * Math.pow(2, (vib + (st.on ? this.ctl.bend : 0)) / 1200); out[o + 1] = v; out[o + 2] = F; out[o + 3] = st.beta
      out[o + 4] = st.on ? 0 : st.damp; out[o + 5] = st.tap; st.tap = 0
      if (!st.on && st.f0 !== this.open[s] && st.damp < 0.05) st.target = this.open[s]
    }
  }
}

/** Sum two control sources: playback strings and live strings (live wins on a string it plays). */
class Mix {
  constructor(a, b) { this.a = a; this.b = b; this.tmp = new Float32Array(4 * NCH); this.now = 0; this.aOn = false }
  at(t, out) {
    this.a.at(t, out)
    // paused: keep the pitches (strings ring on) but lift the bow
    if (!this.aOn) for (let s = 0; s < 4; s++) { out[s * NCH + 1] = 0; out[s * NCH + 2] = 0; out[s * NCH + 5] = 0 }
    this.b.at(this.now, this.tmp)
    for (let s = 0; s < 4; s++) {
      const o = s * NCH
      if (this.b.state[s].on || this.tmp[o + 2] > 0) for (let k = 0; k < NCH; k++) out[o + k] = this.tmp[o + k]
    }
  }
}

class ViolinProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.syn = new ViolinSynth(sampleRate, { instrument: 'violin', model: 'waveguide' })
    this.curves = new CurveSource(null)
    this.live = new LiveSource('violin')
    this.mix = new Mix(this.curves, this.live)
    this.t = 0; this.speed = 1; this.playing = false; this.lastReport = 0
    this.liveT = 0
    this.port.onmessage = e => this.onMsg(e.data)
  }
  onMsg(m) {
    switch (m.type) {
      case 'instrument': this.syn.setInstrument(m.instrument, m.model); this.live.setInstrument(m.instrument); break
      case 'curves': this.curves.set(m); break
      case 'play': this.t = m.t ?? this.t; this.speed = m.speed ?? this.speed; this.startAt = m.at ?? 0; this.playing = true; this.curves.seek(); break
      case 'pause': this.playing = false; break
      case 'seek': this.t = m.t; this.curves.seek(); break
      case 'speed': this.speed = m.speed; break
      case 'on': this.live.on(m, this.liveT); break
      case 'off': this.live.off(m.id); break
      case 'bend': this.live.bend(m.id, m.f0); break
      case 'level': this.syn.level = m.value; break
      case 'params': this.syn.setParams(m); break
      case 'live': Object.assign(this.live.ctl, m); if (m.expr == null) this.live.ex = null; break
      case 'reset': this.syn.reset(); break
    }
  }
  process(inputs, outputs) {
    const out = outputs[0], L = out[0], R = out[1] || out[0], n = L.length
    const dt = 1 / sampleRate
    this.mix.now = this.liveT
    if (this.playing && this.startAt && currentTime + n * dt <= this.startAt) { this.mix.aOn = false; this.syn.process(this.mix, this.t, 0, L, R, n); this.liveT += n * dt; return true }
    this.startAt = 0
    this.mix.aOn = this.playing
    if (this.playing) this.t = this.syn.process(this.mix, this.t, dt * this.speed, L, R, n)
    else this.syn.process(this.mix, this.t, 0, L, R, n)     // time stands still: the bow is off, strings ring
    this.liveT += n * dt
    if (this.playing && currentTime - this.lastReport > 0.04) { this.lastReport = currentTime; this.port.postMessage({ type: 'time', t: this.t }) }
    return true
  }
}
registerProcessor('violin-synth', ViolinProcessor)
