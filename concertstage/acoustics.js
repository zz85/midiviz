// Concert hall acoustics for #030: room and seat presets, the live
// reverb inserted after the synth, applause and the hall's room tone.
//
// OxiSynth (soundfont-engine) opens its own AudioContext inside its WASM and
// plays into that context's destination, so the page cannot route it into a
// graph of its own. installAcoustics() therefore replaces window.AudioContext
// for exactly one construction: the next context created (the synth's) hands
// out a GainNode as its `destination`, which feeds the reverb worklet and then
// the real speakers. The original constructor is restored straight away.

import { HallReverb } from './hall-reverb.js'

export const ROOMS = {
  dry: { label: 'Dry (no room)', on: false },
  studio: { label: 'Recording studio', rt60: 0.45, pre: 0.004, size: 0.45, damp: 0.6, er: 0.55 },
  club: { label: 'Jazz club', rt60: 0.85, pre: 0.008, size: 0.6, damp: 0.5, er: 0.6 },
  recital: { label: 'Recital room', rt60: 1.3, pre: 0.012, size: 0.75, damp: 0.5, er: 0.45 },
  hall: { label: 'Concert hall', rt60: 2.1, pre: 0.022, size: 1, damp: 0.45, er: 0.4 },
  cathedral: { label: 'Cathedral', rt60: 4.8, pre: 0.04, size: 1.45, damp: 0.35, er: 0.3 },
}
// where you listen from: how much of the piano arrives directly, and how much
// treble the air between takes away
export const SEATS = {
  bench: { label: 'At the piano', dry: 1, wet: 0.45, dryHz: 20000, pre: 0, width: 1 },
  front: { label: 'Front row', dry: 0.85, wet: 0.7, dryHz: 15000, pre: 0.004, width: 1 },
  mid: { label: 'Middle of the hall', dry: 0.6, wet: 0.95, dryHz: 9500, pre: 0.01, width: 1.1 },
  balcony: { label: 'Balcony', dry: 0.38, wet: 1.1, dryHz: 6000, pre: 0.018, width: 1.2 },
}

/**
 * Settings for HallReverb from the UI.
 * amount scales the reverberant level, decay scales the room's RT60 and tone
 * (0 dark … 1 bright) moves the high-frequency damping.
 */
export function acousticParams({ room = 'hall', seat = 'front', amount = 1, decay = 1, tone = 0.5 } = {}) {
  const r = ROOMS[room] || ROOMS.hall, s = SEATS[seat] || SEATS.front
  if (r.on === false) return { on: false, dry: 1, dryHz: 20000, wet: 0, er: 0 }
  return {
    on: true,
    rt60: r.rt60 * decay, pre: r.pre + s.pre, size: r.size, er: r.er,
    damp: Math.min(1, Math.max(0, r.damp + (tone - 0.5) * 0.6)),
    wet: s.wet * amount, dry: s.dry, dryHz: s.dryHz, width: s.width,
  }
}
export const rt60Of = (room, decay) => (ROOMS[room]?.rt60 || 0) * decay

/** Patch AudioContext so the next context built gets the hall in its output. */
export function installAcoustics() {
  const Base = window.AudioContext || window.webkitAudioContext
  const api = {
    ctx: null, node: null, input: null, out: null, params: acousticParams(),
    ready: null,
    set(p) { this.params = p; this.node?.port.postMessage(p) },
    reset() { this.node?.port.postMessage('reset') },
    applause(opts) { if (this.ctx) playApplause(this.ctx, this.input, opts) },
    setAmbience(level) { ambience(this, level) },
  }
  let resolve
  api.ready = new Promise(r => { resolve = r })
  class HallContext extends Base {
    constructor(...a) {
      super(...a)
      window.AudioContext = Base   // one-shot: later contexts are ordinary
      const real = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination').get.call(this)
      const input = this.createGain()
      input.channelCount = 2; input.channelCountMode = 'explicit'
      input.connect(real)
      Object.defineProperty(this, 'destination', { get: () => input, configurable: true })
      api.ctx = this; api.input = input; api.out = real
      this.audioWorklet.addModule(new URL('./hall-worklet.js', import.meta.url)).then(() => {
        const node = new AudioWorkletNode(this, 'hall-reverb', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' })
        node.port.postMessage(api.params)
        input.disconnect()
        input.connect(node)
        node.connect(real)
        api.node = node
        resolve(api)
      }).catch(e => { console.warn('hall reverb unavailable', e); resolve(api) })
    }
  }
  window.AudioContext = HallContext
  return api
}

/** The same reverb for the offline export: process planar [L…, R…] chunks in place. */
export function offlineHall(params, sampleRate) {
  const rv = new HallReverb(sampleRate)
  rv.set(params)
  rv.g.dry = rv.t.dry; rv.g.wet = rv.t.wet; rv.g.er = rv.t.er
  return (data, n) => {
    const L = data.subarray(0, n), R = data.subarray(n, 2 * n)
    rv.process(L, R, L, R, n)
  }
}

// ── Applause ───────────────────────────────────────────────────────────────
// A few dozen people clapping: each a short band-passed noise burst at their
// own rate and pitch, swelling in, holding, then dropping out one by one.
// Played into the hall input, so it gets the same reverb as the piano.
export function makeApplause(ctx, { seconds = 7, people = 70, seed = 1 } = {}) {
  const sr = ctx.sampleRate, N = Math.round(seconds * sr)
  const buf = ctx.createBuffer(2, N, sr), L = buf.getChannelData(0), R = buf.getChannelData(1)
  let s = seed * 9301 + 49297
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let p = 0; p < people; p++) {
    const rate = 3.2 + rnd() * 2.6, fc = 900 + rnd() * 1900, q = 1.2 + rnd() * 1.8
    const pan = rnd() * 2 - 1, gl = Math.sqrt((1 - pan) / 2), gr = Math.sqrt((1 + pan) / 2)
    const vol = 0.35 + rnd() * 0.65
    const start = rnd() * 0.7 + (rnd() < 0.2 ? rnd() * 0.8 : 0)
    const stop = seconds * (0.45 + rnd() * 0.5)
    // biquad band-pass (RBJ), per clapper
    const w = 2 * Math.PI * fc / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al
    const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0
    for (let t = start; t < stop; t += (1 + (rnd() - 0.5) * 0.25) / rate) {
      const env = Math.min(1, (t - start) / 0.35) * Math.min(1, (stop - t) / 0.6)
      const amp = vol * env * (0.6 + rnd() * 0.4) * 0.05
      const i0 = Math.round(t * sr), len = Math.round((0.004 + rnd() * 0.008) * sr), tail = Math.round(0.03 * sr)
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < len + tail && i0 + i < N; i++) {
        const x = i < len ? (rnd() * 2 - 1) * Math.exp(-i / (len * 0.35)) : 0
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1; x1 = x; y2 = y1; y1 = y
        L[i0 + i] += y * amp * gl * 24; R[i0 + i] += y * amp * gr * 24
      }
    }
  }
  return buf
}
let applauseSeed = 1
function playApplause(ctx, dest, { level = 1, seconds = 7 } = {}) {
  const src = ctx.createBufferSource(), g = ctx.createGain()
  src.buffer = makeApplause(ctx, { seconds, seed: applauseSeed++ })
  g.gain.value = level
  src.connect(g).connect(dest)
  src.start(ctx.currentTime + 0.35)
}

// ── Room tone ──────────────────────────────────────────────────────────────
// The quiet air of an occupied hall: low, soft rumble with a little breath
// of high air, looped. Level 0 stops it.
function ambience(api, level) {
  const ctx = api.ctx
  if (!ctx) return
  if (!api._amb) {
    const sr = ctx.sampleRate, N = sr * 6, buf = ctx.createBuffer(2, N, sr)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let b0 = 0, b1 = 0, b2 = 0, lo = 0
      for (let i = 0; i < N; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527
        const pink = (b0 + b1 + b2 + w * 0.1848) * 0.12
        lo += (pink - lo) * 0.02
        d[i] = lo * 2.2 + pink * 0.05
      }
      // crossfade the loop seam
      const F = sr * 0.5
      for (let i = 0; i < F; i++) { const k = i / F; d[i] = d[i] * k + d[N - F + i] * (1 - k) }
    }
    const src = ctx.createBufferSource(), g = ctx.createGain()
    src.buffer = buf; src.loop = true; src.loopStart = 0; src.loopEnd = 6 - 0.5
    g.gain.value = 0
    src.connect(g).connect(api.input)
    src.start()
    api._amb = g
  }
  api._amb.gain.setTargetAtTime(level * 0.09, ctx.currentTime, 0.3)
}
