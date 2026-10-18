// Experiment #034 sound engines behind one transport (browser only).
//
// Every engine plays the same performance (performance.js) into one graph:
//
//   engine ─→ bus ─→ hall reverb (concertstage/hall-worklet.js) ─→ master ─→ limiter ─→ out
//                                                                    └→ analyser (spectrum view)
//
//   waveguide, source   ViolinSynth in an AudioWorklet (violin-worklet.js),
//                       real time, also plays live notes
//   ddsp                Magenta's DDSP violin on TensorFlow.js (WebGL),
//                       rendered in 5 s windows ahead of the playhead
//   vsco                VSCO 2 CE solo violin "Arco Vib" samples (CC0), p/f
//                       layers, rendered offline with an OfflineAudioContext
//   gm                  the General MIDI soundfont #033 uses (OxiSynth),
//                       rendered offline through OxiSynthRaw
//   hybrid              University of Iowa non-vibrato samples recorded string
//                       by string, read along our pitch and loudness curves
//                       (hybrid.js), rendered progressively a few notes at a
//                       time; live notes play the samples with their loops
//
// Time: engines work in performance time. The page scales notes by 1/speed
// before rendering, so speed never changes pitch.

import { ddspVoices, DDSPEngine, DDSP_URL, DDSP_SR } from './ddsp.js'
import { midiHz } from './bowed.js'
import { SampleBank, hybridRenderer, predictedRms, HYBRID_URL } from './hybrid.js'

export const ENGINES = {
  waveguide: { label: 'Physical: bowed waveguide', short: 'Waveguide', live: true },
  source: { label: 'Physical: Helmholtz source-filter', short: 'Source', live: true },
  ddsp: { label: 'Neural: DDSP violin (Magenta)', short: 'DDSP', live: false },
  vsco: { label: 'Samples: VSCO 2 CE violin (CC0)', short: 'Samples', live: true },
  gm: { label: 'Baseline: GM soundfont (#033)', short: 'GM', live: false },
  hybrid: { label: 'Hybrid: Iowa samples + our performance', short: 'Hybrid', live: true },
}

const VSCO_URL = 'https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/Strings/Solo%20Violin/Arco%20Vib/'
const VSCO_NOTES = { G3: 55, A3: 57, C4: 60, E4: 64, G4: 67, A4: 69, C5: 72, E5: 76, G5: 79, A5: 81, C6: 84, E6: 88, G6: 91, A6: 93, C7: 96 }
const VSCO_MISSING = new Set(['G6_f'])
const GM_FONT = 'soundfonts/Creative(emu10k1)8MBGMSFX.sf2'
const TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm'

export class Lab {
  constructor() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' })
    this.bus = ctx.createGain()
    this.master = ctx.createGain()
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -3; this.limiter.knee.value = 4; this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.15
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 4096; this.analyser.smoothingTimeConstant = 0.6
    // sordino (mute): a clip on the bridge adds mass, so the bridge hill and
    // everything above it drop (about −12 dB above 2 kHz) and the low mids
    // stand out a little; a filter pair the whole bus goes through
    this.mute = [ctx.createBiquadFilter(), ctx.createBiquadFilter()]
    this.mute[0].type = 'highshelf'; this.mute[0].frequency.value = 1500
    this.mute[1].type = 'peaking'; this.mute[1].frequency.value = 520; this.mute[1].Q.value = 0.9
    this.setSordino(false)
    this.pre = ctx.createGain()
    this.pre.connect(this.mute[0]).connect(this.mute[1]).connect(this.bus)
    this.params = { bowPress: true, rosin: 1, resonance: 1, body: 'iowa' }
    this.liveCtl = { expr: null, vib: null, bend: 0 }
    this.bus.connect(this.master)
    this.master.connect(this.limiter).connect(ctx.destination)
    this.master.connect(this.analyser)
    this.engines = {}
    this.perf = null
    this.playing = false; this.t0 = 0; this.ctx0 = 0; this.pausedAt = 0
    this.listeners = new Set()
    this.ready = this.init()
  }
  async init() {
    const w = this.ctx.audioWorklet
    await Promise.all([
      w.addModule(new URL('./violin-worklet.js', import.meta.url)),
      w.addModule(new URL('../../concertstage/hall-worklet.js', import.meta.url)).then(() => {
        this.hall = new AudioWorkletNode(this.ctx, 'hall-reverb', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' })
        if (this.hallParams) this.hall.port.postMessage(this.hallParams)
        this.bus.disconnect(); this.bus.connect(this.hall).connect(this.master)
      }).catch(e => console.warn('hall reverb unavailable', e)),
    ])
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  emit(e) { for (const f of this.listeners) f(e) }
  setHall(p) { this.hallParams = p; this.hall?.port.postMessage(p) }
  setVolume(v) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03) }
  setSordino(on) {
    this.sordino = on
    const t = this.ctx.currentTime
    this.mute[0].gain.setTargetAtTime(on ? -12 : 0, t, 0.02)
    this.mute[1].gain.setTargetAtTime(on ? 2.5 : 0, t, 0.02)
  }
  /**
   * Physical-model parameters: { bowPress, rosin, resonance, body: 'iowa' |
   * 'modal' | 'nbody' } (bowed.js ViolinSynth.setParams). 'nbody' is the
   * Princeton NBody response built by strings/test/build_nbody.js into the
   * git-ignored strings/data/NBody/ (no licence to redistribute it); it is
   * fetched once and sent to the engines as the impulse responses themselves.
   * Until it arrives, or when it is missing, the Iowa body plays.
   */
  setParams(p) {
    Object.assign(this.params, p)
    const send = () => { for (const e of Object.values(this.engines)) e.setParams?.(this.synthParams()) }
    if (this.params.body === 'nbody' && !this.nbody) this.loadNBody().then(send)
    send()
  }
  /** this.params with body resolved to what ViolinSynth takes. */
  synthParams() {
    const b = this.params.body
    return { ...this.params, body: b === 'nbody' ? (this.nbody?.ir ? this.nbody : 'iowa') : b }
  }
  loadNBody() {
    return this.nbodyLoading ??= fetch(new URL('../data/NBody/body-nbody.json', import.meta.url))
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(j => { this.nbody = { ...j, ir: j.ir.map(h => Float32Array.from(h)) }; this.emit({ type: 'body', body: 'nbody', ok: true, mics: j.mics }) })
      .catch(e => { this.nbody = { missing: true }; this.emit({ type: 'body', body: 'nbody', ok: false, message: 'NBody body not built: run node strings/test/build_nbody.js (it downloads the Princeton responses into strings/data/NBody/)' }) })
  }
  /** Live controllers: expr (CC11 / CC2, 0…1), vib (CC1 vibrato depth, 0…1), bend (cents). */
  setLive(c) { Object.assign(this.liveCtl, c); for (const e of Object.values(this.engines)) e.liveControl?.(this.liveCtl) }
  resume() { return this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume() }

  engine(name) {
    if (!this.engines[name]) {
      const E = { waveguide: PhysicalEngine, source: PhysicalEngine, ddsp: DDSPEngineUI, vsco: SampleEngine, gm: GMEngine, hybrid: HybridEngine }[name]
      this.engines[name] = new E(this, name)
    }
    return this.engines[name]
  }
  /** Current performance time (s). */
  time() { return this.playing ? this.t0 + (this.ctx.currentTime - this.ctx0) : this.pausedAt }

  /** New performance (notes already scaled for speed). Every engine re-renders lazily. */
  setPerformance(perf) {
    this.perf = perf
    for (const e of Object.values(this.engines)) e.invalidate()
    this.current?.prepare(perf)
  }
  async use(name) {
    const was = this.playing, t = this.time()
    if (was) this.current?.stop()
    await this.ready
    this.current = this.engine(name)
    if (this.perf) this.current.prepare(this.perf)
    if (was) this.current.start(t, this.ctx.currentTime + 0.02)
  }
  async play(t = this.pausedAt) {
    await this.resume(); await this.ready
    if (!this.current || !this.perf) return
    const when = this.ctx.currentTime + 0.05
    this.t0 = t; this.ctx0 = when; this.playing = true
    this.current.start(t, when)
  }
  pause() { if (!this.playing) return; this.pausedAt = this.time(); this.playing = false; this.current?.stop() }
  seek(t) { const was = this.playing; if (was) this.pause(); this.pausedAt = t; if (was) this.play(t) }
  noteOn(m) {
    if (!this.current) return false                 // worklets still loading
    const e = this.current
    if (e.noteOn) return e.noteOn(m)
    return this.engine('waveguide').noteOn(m)
  }
  noteOff(id) { for (const e of Object.values(this.engines)) e.noteOff?.(id) }
  /** Offline render of the current engine for the whole piece → { chans: [L, R], sr }. */
  async exportWav() { return this.current?.renderAll?.() }
}

/** Expression controller → gain for sample voices (the GM volume curve, 0 dB at 100). */
const liveExprGain = e => Math.pow(Math.max(0.02, e) / 0.787, 2)

// ── Physical models (real time) ────────────────────────────────────────────
class PhysicalEngine {
  constructor(lab, model) {
    this.lab = lab; this.model = model
    this.node = new AudioWorkletNode(lab.ctx, 'violin-synth', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
    this.out = lab.ctx.createGain(); this.out.gain.value = model === 'source' ? 1.2 : 1
    this.node.connect(this.out).connect(lab.pre)
    this.setParams(lab.synthParams()); this.liveControl(lab.liveCtl)
    this.sent = null; this.instrument = null
  }
  invalidate() { this.sent = null }
  prepare(perf) {
    if (this.instrument !== perf.instrument) { this.instrument = perf.instrument; this.node.port.postMessage({ type: 'instrument', instrument: perf.instrument, model: this.model }) }
    if (this.sent === perf) return
    this.sent = perf
    this.node.port.postMessage({ type: 'curves', frameRate: perf.frameRate, frames: perf.frames, data: perf.data.slice() })
    this.lab.emit({ type: 'ready', engine: this.model })
  }
  start(t, when) { this.prepare(this.lab.perf); this.node.port.postMessage({ type: 'play', t, speed: 1, at: when }) }
  stop() { this.node.port.postMessage({ type: 'pause' }) }
  noteOn(m) {
    if (this.lab.perf && this.instrument !== this.lab.perf.instrument) this.prepare(this.lab.perf)
    // attack error (humanize.js): land off pitch, then bend to the note once it has settled
    const f0 = m.attackCents ? m.f0 * Math.pow(2, m.attackCents / 1200) : m.f0
    this.node.port.postMessage({ type: 'on', ...m, f0 })
    if (m.attackCents) setTimeout(() => this.node.port.postMessage({ type: 'bend', id: m.id, f0: m.f0 }), 1000 * m.attackSettle * 0.5)
    return true
  }
  noteOff(id) { this.node.port.postMessage({ type: 'off', id }) }
  setParams(p) { this.node.port.postMessage({ type: 'params', ...p }) }
  liveControl(c) { this.node.port.postMessage({ type: 'live', ...c }) }
  async renderAll() {
    const { renderCurves } = await import('./bowed.js')
    const sr = this.lab.ctx.sampleRate
    return { chans: renderCurves(this.lab.perf, { sampleRate: sr, instrument: this.lab.perf.instrument, model: this.model, params: this.lab.synthParams() }), sr }
  }
}

// ── Pre-rendered engines: a piece buffer in 1 s blocks, played block by block ──
class BufferEngine {
  constructor(lab, name) {
    this.lab = lab; this.name = name
    this.out = lab.ctx.createGain(); this.out.connect(lab.pre)
    this.blocks = []; this.sources = []; this.timer = null; this.job = 0
  }
  invalidate() { this.job++; this.blocks = []; this.rendered = null; this.preparing = null }
  /** Subclasses fill this.blocks[k] = AudioBuffer (1 s each, any sample rate). */
  prepare(perf) {
    if (this.preparing && this.perfFor === perf) return this.preparing
    this.perfFor = perf
    const job = ++this.job
    this.blocks = []
    this.preparing = this.render(perf, job).catch(e => { console.error(e); this.lab.emit({ type: 'error', engine: this.name, message: e.message }) })
    return this.preparing
  }
  setBlocks(L, R, sr, job, from = 0, to = Infinity) {
    if (job !== this.job) return
    const n = Math.ceil(L.length / sr)
    for (let k = from; k < Math.min(n, to); k++) {
      const a = k * sr, b = Math.min(L.length, a + sr)
      const buf = this.lab.ctx.createBuffer(2, b - a, sr)
      buf.copyToChannel(L.subarray(a, b), 0); buf.copyToChannel(R.subarray(a, b), 1)
      this.blocks[k] = buf
      // a block that became ready while it should already be sounding joins in
      if (this.lab.playing && this.lab.current === this) this.schedule()
    }
  }
  start(t, when) {
    this.stop()
    this.startT = t; this.startCtx = when; this.scheduled = new Set()
    this.schedule()
    this.timer = setInterval(() => this.schedule(), 100)
  }
  schedule() {
    if (this.startCtx == null) return
    const ctx = this.lab.ctx, now = ctx.currentTime
    const tNow = this.startT + Math.max(0, now - this.startCtx)
    for (let k = Math.floor(tNow); k < tNow + 1.5; k++) {
      const buf = this.blocks[k]
      if (!buf || this.scheduled.has(k)) continue
      const when = this.startCtx + (k - this.startT)
      const offset = Math.max(0, now + 0.01 - when, this.startT - k)
      if (offset >= buf.duration) continue
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(this.out)
      src.start(Math.max(when + offset, now + 0.005), offset)
      this.scheduled.add(k); this.sources.push(src)
      src.onended = () => { const i = this.sources.indexOf(src); if (i >= 0) this.sources.splice(i, 1) }
    }
    const k = Math.floor(tNow)
    if (this.lab.perf && k < this.lab.perf.frames / this.lab.perf.frameRate && !this.blocks[k]) this.lab.emit({ type: 'starved', engine: this.name, t: tNow })
  }
  stop() {
    clearInterval(this.timer); this.timer = null; this.startCtx = null
    const now = this.lab.ctx.currentTime
    for (const s of this.sources) { try { s.stop(now + 0.01) } catch (e) { /* not started */ } }
    this.sources = []
  }
  async renderAll() { await this.preparing; return this.rendered }
}

/** RMS over the sounding part, for loudness matching between engines. */
function activeRms(L) {
  let s = 0, n = 0
  for (let i = 0; i < L.length; i += 4) { const v = L[i] * L[i]; if (v > 1e-7) { s += v; n++ } }
  return Math.sqrt(s / Math.max(1, n))
}
const TARGET_RMS = 0.05

// ── DDSP ─────────────────────────────────────────────────────────────────
class DDSPEngineUI extends BufferEngine {
  /** The model lives in a module worker; the main thread plans windows and mixes. */
  async model() {
    if (!this.loading) this.loading = new Promise((resolve, reject) => {
      this.lab.emit({ type: 'progress', engine: 'ddsp', text: 'Loading TensorFlow.js and the DDSP violin (3.9 MB)…' })
      const w = this.worker = new Worker(new URL('./ddsp-worker.js', import.meta.url), { type: 'module' })
      this.pending = new Map(); this.nextId = 0
      w.onmessage = e => {
        const m = e.data
        if (m.type === 'ready') { this.backend = m.backend; const eng = new DDSPEngine(null, null, m.settings); eng.window = (f0, ld) => this.call(f0, ld); resolve(eng) }
        else if (m.type === 'audio') { this.pending.get(m.id)?.resolve(m); this.pending.delete(m.id) }
        else if (m.type === 'error') { if (this.pending.has(m.id)) { this.pending.get(m.id).reject(new Error(m.message)); this.pending.delete(m.id) } else reject(new Error(m.message)) }
      }
      w.onerror = e => reject(new Error(e.message || 'DDSP worker failed'))
      w.postMessage({ type: 'init', tfjs: TFJS, url: DDSP_URL })
    })
    return this.loading
  }
  call(f0, ld) {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: m => { this.lastMs = m.ms; resolve(m.y) }, reject })
      this.worker.postMessage({ type: 'window', id, f0, ld })
    })
  }
  async render(perf, job) {
    const m = await this.model()
    if (job !== this.job) return
    const voices = ddspVoices(perf, { settings: m.settings })
    const n = Math.ceil(perf.frames * 64)
    const L = new Float32Array(n)
    const wins = voices.flatMap((v, voice) => m.plan(v).map((w, i, all) => ({ w, voice, first: i === 0, last: i === all.length - 1, done: false })))
    const span = j => [j.w.start * 64, (j.w.start + 1250) * 64]
    const blocksDone = () => {
      // a 1 s block is final once every window overlapping it is placed
      const nb = Math.ceil(n / DDSP_SR), ready = []
      for (let k = 0; k < nb; k++) {
        const a = k * DDSP_SR, b = a + DDSP_SR
        ready.push(wins.every(j => j.done || j.w.silent || span(j)[1] <= a || span(j)[0] >= b))
      }
      return ready
    }
    let done = 0
    const t0 = performance.now()
    while (true) {
      if (job !== this.job) return
      // next: the first undone window at or after the playhead, else the earliest
      const tNow = this.lab.time() * perf.frameRate
      const todo = wins.filter(j => !j.done && !j.w.silent)
      if (!todo.length) break
      const ahead = todo.filter(j => j.w.start + 1250 > tNow).sort((a, b) => a.w.start - b.w.start || a.voice - b.voice)
      const j = ahead[0] || todo[0]
      const y = await m.window(j.w.f0, j.w.ld)
      if (job !== this.job) return
      for (let i = 0; i < y.length; i++) y[i] *= 0.4
      DDSPEngine.place(L, j.w.start, y, j.first, j.last)
      j.done = true; done++
      const ready = blocksDone()
      for (let k = 0; k < ready.length; k++) if (ready[k] && !this.blocks[k]) this.setBlocks(L, L, DDSP_SR, job, k, k + 1)
      const secs = (performance.now() - t0) / 1000
      this.lab.emit({ type: 'progress', engine: 'ddsp', text: `DDSP (${this.backend}): ${done}/${wins.filter(x => !x.w.silent).length} windows, ${(this.lastMs / 1000).toFixed(1)} s per 5 s window`, done, total: wins.length })
    }
    this.setBlocks(L, L, DDSP_SR, job)
    this.rendered = { chans: [L, L], sr: DDSP_SR }
    this.lab.emit({ type: 'ready', engine: 'ddsp' })
  }
}

// ── VSCO samples ─────────────────────────────────────────────────────────
class SampleEngine extends BufferEngine {
  constructor(lab, name) { super(lab, name); this.cache = new Map(); this.live = new Map() }
  async sample(key) {
    if (!this.cache.has(key)) this.cache.set(key, (async () => {
      const r = await fetch(`${VSCO_URL}LLVln_ArcoVib_${key}.wav`)
      if (!r.ok) throw new Error(`sample ${key}: ${r.status}`)
      const buf = await this.lab.ctx.decodeAudioData(await r.arrayBuffer())
      // onset: first sample above −40 dB of the peak
      const x = buf.getChannelData(0)
      let peak = 0; for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
      let on = 0; while (on < x.length && Math.abs(x[on]) < peak * 0.01) on++
      return { buf, onset: Math.max(0, on / buf.sampleRate - 0.005) }
    })())
    return this.cache.get(key)
  }
  /** Sample roots around a pitch: nearest root (by semitones) with p/f layers. */
  rootFor(pitch) {
    let best = null
    for (const [name, m] of Object.entries(VSCO_NOTES)) if (!best || Math.abs(m - pitch) < Math.abs(best[1] - pitch) || (Math.abs(m - pitch) === Math.abs(best[1] - pitch) && m < pitch)) best = [name, m]
    return best
  }
  /**
   * Round-robin: VSCO has one take per note, so a repeated pitch alternates
   * between its nearest root and the next nearest within 3 semitones
   * (transposed), and enters each take a few ms later or earlier.
   */
  rootRR(pitch, rr = 0) {
    const near = Object.entries(VSCO_NOTES).filter(([, m]) => Math.abs(m - pitch) <= 3)
      .sort((a, b) => Math.abs(a[1] - pitch) - Math.abs(b[1] - pitch) || a[1] - b[1])
    if (near.length < 2) return this.rootFor(pitch)
    return rr % 2 ? near[1] : near[0]
  }
  layers(name) { return ['p', 'f'].filter(d => !VSCO_MISSING.has(`${name}_${d}`)) }
  async render(perf, job) {
    const notes = perf.notes
    const need = new Set()
    for (const n of notes) { const [name] = this.rootRR(n.pitch, n.rr); for (const d of this.layers(name)) need.add(`${name}_${d}`) }
    let got = 0
    this.lab.emit({ type: 'progress', engine: 'vsco', text: `Loading ${need.size} VSCO samples…` })
    await Promise.all([...need].map(k => this.sample(k).then(() => this.lab.emit({ type: 'progress', engine: 'vsco', text: `Samples ${++got}/${need.size}` }))))
    if (job !== this.job) return
    const sr = this.lab.ctx.sampleRate, dur = perf.frames / perf.frameRate
    const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr)
    const list = notes.slice().sort((a, b) => a.on - b.on)
    for (let i = 0; i < list.length; i++) {
      const n = list[i]
      await this.voice(oc, oc.destination, n, n.on, n.off + this.legatoTail(list, i))
    }
    const out = await oc.startRendering()
    if (job !== this.job) return
    const L = out.getChannelData(0), R = out.getChannelData(1)
    const g = TARGET_RMS / (activeRms(L) || 1)
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g }
    this.gain = g
    this.rendered = { chans: [L, R], sr }
    this.setBlocks(L, R, sr, job)
    this.lab.emit({ type: 'ready', engine: 'vsco' })
  }
  legatoTail(list, i) {
    const n = list[i], next = list.find((m, j) => j > i && m.string === n.string && m.on >= n.off - 0.01)
    return next && next.on - n.off < 0.05 ? 0.06 : 0
  }
  /** Schedule one note (both layers, crossfaded by velocity) into ctx. */
  async voice(ctx, dest, n, on, off, { live = false } = {}) {
    const [name, root] = live ? this.rootFor(n.pitch) : this.rootRR(n.pitch, n.rr)
    const layers = this.layers(name)
    const v = n.velocity ?? 0.75
    const x = layers.length > 1 ? Math.max(0, Math.min(1, (v - 0.35) / 0.55)) : 1
    const nodes = []
    for (const d of layers) {
      const { buf, onset } = await this.sample(`${name}_${d}`)
      const g = d === 'f' ? Math.sqrt(x) : Math.sqrt(1 - x)
      if (g < 0.02) continue
      const src = ctx.createBufferSource(); src.buffer = buf
      const rate = Math.pow(2, (n.pitch - root) / 12)
      // the finger lands off pitch and settles (humanize.js)
      if (n.attackCents) {
        src.playbackRate.setValueAtTime(rate * Math.pow(2, n.attackCents / 1200), on)
        src.playbackRate.setTargetAtTime(rate, on + 0.01, Math.max(0.005, (n.attackSettle ?? 0.06) / 3))
      } else src.playbackRate.value = rate
      const env = ctx.createGain()
      const level = g * (0.35 + 0.65 * v) * (d === 'p' ? 2.2 : 1)
      env.gain.setValueAtTime(0, on)
      env.gain.linearRampToValueAtTime(level, on + 0.025)
      if (off != null) {
        env.gain.setValueAtTime(level, off)
        env.gain.setTargetAtTime(0, off, 0.08)
      }
      // bowed tremolo (performance.js): a dip at every bow turn; harmonics: the
      // touch takes the upper partials away (no recorded harmonics in VSCO)
      let head = src
      if (n.harm) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(16000, 440 * Math.pow(2, (n.pitch - 69) / 12) * 2.5); lp.Q.value = 0.5; src.connect(lp); head = lp }
      if (n.trem && off != null) {
        const tg = ctx.createGain(), dur = off - on, N = Math.max(2, Math.ceil(dur * 200))
        const curve = new Float32Array(N)
        for (let k = 0; k < N; k++) { const q = Math.sin(Math.PI * n.trem.r * (on + k * dur / (N - 1) - n.trem.t0)); curve[k] = 0.35 + 0.65 * Math.abs(Math.tanh(2.2 * q) / Math.tanh(2.2)) }
        tg.gain.setValueCurveAtTime(curve, on, dur)
        head.connect(tg); head = tg
      }
      head.connect(env).connect(dest)
      src.start(on, onset + [0, 0.006, 0.003][(n.rr ?? 0) % 3])
      if (off != null) src.stop(off + 0.6)
      nodes.push({ src, env, level, live })
    }
    return nodes
  }
  async noteOn(m) {
    const ctx = this.lab.ctx
    const p = 69 + 12 * Math.log2(m.f0 / 440)
    const nodes = await this.voice(ctx, this.out, { pitch: Math.round(p), velocity: m.dyn, attackCents: m.attackCents, attackSettle: m.attackSettle }, ctx.currentTime + 0.005, null, { live: true })
    this.live.set(m.id, nodes)
    this.liveControl(this.lab.liveCtl)
    return true
  }
  // live controllers: expression scales the level (velocity stays the attack), pitch bend detunes
  liveControl(c) {
    const t = this.lab.ctx.currentTime
    for (const nodes of this.live.values()) for (const v of nodes) {
      if (c.expr != null) v.env.gain.setTargetAtTime(v.level * liveExprGain(c.expr), t, 0.02)
      v.src.detune.setTargetAtTime(c.bend || 0, t, 0.01)
    }
  }
  noteOff(id) {
    const nodes = this.live.get(id); if (!nodes) return
    this.live.delete(id)
    const t = this.lab.ctx.currentTime
    for (const { src, env } of nodes) { env.gain.cancelScheduledValues(t); env.gain.setValueAtTime(env.gain.value, t); env.gain.setTargetAtTime(0, t, 0.08); src.stop(t + 0.6) }
  }
}

// ── GM soundfont (OxiSynth, offline) ─────────────────────────────────────
class GMEngine extends BufferEngine {
  async synth(sr) {
    if (!this.loading) this.loading = (async () => {
      this.lab.emit({ type: 'progress', engine: 'gm', text: 'Loading the GM soundfont…' })
      const mod = await import(new URL('../../vendor/oxisynth/oxisynth.js', import.meta.url).href)
      await mod.default()
      const s = new mod.OxiSynthRaw(sr)
      s.add_soundfont(new Uint8Array(await (await fetch(new URL('../../' + GM_FONT, import.meta.url))).arrayBuffer()))
      return s
    })()
    return this.loading
  }
  async render(perf, job) {
    const sr = this.lab.ctx.sampleRate
    const s = await this.synth(sr)
    if (job !== this.job) return
    const program = { violin: 40, viola: 41, cello: 42 }[perf.instrument] ?? 40
    // each note on its own channel (rotating, drums skipped) so its tuning can
    // carry the attack error (humanize.js) without detuning its neighbours.
    // OxiSynthRaw has no pitch bend; RPN 1 (channel fine tuning, ±100 cents)
    // retunes sounding voices too.
    const CHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]
    const tune = (ch, v) => { s.control_change(ch, 101, 0); s.control_change(ch, 100, 1); s.control_change(ch, 6, v >> 7); s.control_change(ch, 38, v & 127) }
    for (let ch = 0; ch < 16; ch++) { s.all_sound_off(ch); tune(ch, 8192) }
    for (const ch of CHS) s.program_change(ch, program)
    const bend = c => Math.max(0, Math.min(16383, Math.round(8192 + c / 100 * 8192)))
    const ev = []
    perf.notes.forEach((n, k) => {
      n.gmCh = CHS[k % CHS.length]
      ev.push([n.on, 2, n, bend(n.attackCents ?? 0)])
      ev.push([n.on, 1, n])
      if (n.attackCents) {
        const ts = Math.max(0.01, n.attackSettle ?? 0.06)
        for (let t = 0.01; t <= 1.6 * ts; t += 0.008) ev.push([n.on + t, 2, n, bend(n.attackCents * Math.exp(-3 * t / ts))])
        ev.push([n.on + 1.6 * ts + 0.008, 2, n, 8192])
      }
      ev.push([n.off, 0, n])
    })
    ev.sort((a, b) => a[0] - b[0] || (b[1] === 2) - (a[1] === 2) || a[1] - b[1])
    const N = Math.ceil(perf.frames / perf.frameRate * sr)
    const L = new Float32Array(N), R = new Float32Array(N)
    let i = 0, e = 0
    while (i < N) {
      while (e < ev.length && ev[e][0] * sr <= i) {
        const [, kind, n, val] = ev[e++]
        if (kind === 2) tune(n.gmCh, val)
        else if (kind === 1) s.note_on(n.gmCh, n.pitch, Math.max(1, Math.round((n.velocity ?? 0.75) * 127)))
        else s.note_off(n.gmCh, n.pitch)
      }
      const until = Math.min(N, e < ev.length ? Math.max(i + 1, Math.ceil(ev[e][0] * sr)) : N, i + 4096)
      const out = s.render(until - i)
      for (let k = 0; k < until - i; k++) { L[i + k] = out[2 * k]; R[i + k] = out[2 * k + 1] }
      i = until
    }
    const g = TARGET_RMS / (activeRms(L) || 1)
    for (let k = 0; k < N; k++) { L[k] *= g; R[k] *= g }
    this.rendered = { chans: [L, R], sr }
    this.setBlocks(L, R, sr, job)
    this.lab.emit({ type: 'ready', engine: 'gm' })
  }
}

// ── Hybrid sampler (hybrid.js) ───────────────────────────────────────────
// Output level: the renderer normalises every recording to its sustain RMS and
// scales by the loudness curve (≈ 1 at mezzo-forte). A render is levelled to
// the other engines from the loudness curves before it starts (predictedRms,
// within ±1.5 dB of the measured level), so blocks can play as they finish.
const HYBRID_GAIN = 0.05
class HybridEngine extends BufferEngine {
  constructor(lab, name) { super(lab, name); this.banks = new Map(); this.live = new Map(); this.offBeforeOn = new Set() }
  /** Manifest and decoded packs for an instrument (packs load on demand). */
  async bank(instrument, keys) {
    if (!this.banks.has(instrument)) this.banks.set(instrument, (async () => {
      const r = await fetch(`${HYBRID_URL}${instrument}/manifest.json`)
      if (!r.ok) throw new Error(`no ${instrument} samples (${r.status}): run node strings/test/build_iowa.js --instrument=${instrument}`)
      return { m: await r.json(), pcm: {}, loading: {} }
    })())
    const b = await this.banks.get(instrument)
    const need = keys.filter(k => b.m.packs[k] && !b.pcm[k])
    let got = 0
    if (need.length) this.lab.emit({ type: 'progress', engine: 'hybrid', text: `Loading ${need.length} sample packs (${instrument})…` })
    await Promise.all(need.map(k => {
      if (!b.loading[k]) b.loading[k] = (async () => {
        const r = await fetch(`${HYBRID_URL}${instrument}/${b.m.packs[k].file}`)
        if (!r.ok) throw new Error(`sample pack ${k}: ${r.status}`)
        // decode at the bank's rate so the manifest's sample positions hold
        const oc = new OfflineAudioContext(1, 1, b.m.sampleRate)
        const buf = await oc.decodeAudioData(await r.arrayBuffer())
        b.pcm[k] = buf.getChannelData(0)
        this.lab.emit({ type: 'progress', engine: 'hybrid', text: `Sample packs ${++got}/${need.length}` })
      })()
      return b.loading[k]
    }))
    return new SampleBank(b.m, b.pcm)
  }
  async render(perf, job) {
    const inst = perf.instrument || 'violin'
    const head = await this.bank(inst, [])
    const bank = await this.bank(inst, SampleBank.packsFor(head.m, perf))
    if (job !== this.job) return
    const sr = this.lab.ctx.sampleRate
    const r = hybridRenderer(perf, bank, { sampleRate: sr })
    let published = 0
    const g = TARGET_RMS / Math.max(0.05, predictedRms(perf))
    const publish = through => {
      const upto = Math.min(Math.ceil(r.L.length / sr), Math.floor(through))
      if (upto <= published) return
      for (let i = published * sr; i < Math.min(r.L.length, upto * sr); i++) { r.L[i] *= g; r.R[i] *= g }
      this.setBlocks(r.L, r.R, sr, job, published, upto)
      published = upto
    }
    const t0 = performance.now()
    while (true) {
      const st = r.step(25)
      if (job !== this.job) return
      publish(st.done ? Infinity : st.through)
      this.lab.emit({ type: 'progress', engine: 'hybrid', text: `Hybrid: ${st.count}/${r.total} notes (${((performance.now() - t0) / 1000).toFixed(1)} s)` })
      if (st.done) break
      await new Promise(res => setTimeout(res, 0))
    }
    this.rendered = { chans: [r.L, r.R], sr }
    this.lab.emit({ type: 'ready', engine: 'hybrid' })
  }
  // live: the recording on that string, looped, pitched to the note
  async noteOn(m) {
    const ctx = this.lab.ctx
    const inst = this.lab.perf?.instrument || 'violin'
    const p = 69 + 12 * Math.log2(m.f0 / 440)
    const l = m.dyn < 0.45 ? 0 : m.dyn < 0.8 ? 1 : 2
    const head = await this.bank(inst, [])
    const dyn = head.m.dynamics[l]
    const bank = await this.bank(inst, [`${m.string}_${dyn}`])
    const pick = bank.pick(m.string, Math.round(p), l)
    if (!pick) return false
    // released while the samples were loading
    if (this.offBeforeOn.delete(m.id)) return true
    const { meta } = pick
    if (!this.liveBufs) this.liveBufs = new Map()
    const bk = inst + pick.key
    if (!this.liveBufs.has(bk)) {
      const b = ctx.createBuffer(1, pick.pcm.length, bank.sr); b.copyToChannel(pick.pcm, 0); this.liveBufs.set(bk, b)
    }
    const src = ctx.createBufferSource(); src.buffer = this.liveBufs.get(bk)
    const sec = x => (meta.offset + x) / bank.sr
    const lp = meta.loop || [meta.attackEnd, meta.headEnd - 480]
    src.loop = true; src.loopStart = sec(lp[0]); src.loopEnd = sec(lp[1])
    const rate = m.f0 / meta.f0, now = ctx.currentTime + 0.005
    if (m.attackCents) {
      src.playbackRate.setValueAtTime(rate * Math.pow(2, m.attackCents / 1200), now)
      src.playbackRate.setTargetAtTime(rate, now + 0.01, Math.max(0.005, (m.attackSettle ?? 0.06) / 3))
    } else src.playbackRate.value = rate
    const env = ctx.createGain()
    const level = HYBRID_GAIN * (0.5 + 0.7 * m.dyn) / Math.max(1e-4, meta.rms)
    env.gain.setValueAtTime(level, now)
    src.connect(env).connect(this.out)
    src.start(now, sec(meta.onset))
    this.live.set(m.id, { src, env, level })
    this.liveControl(this.lab.liveCtl)
    return true
  }
  liveControl(c) {
    const t = this.lab.ctx.currentTime
    for (const v of this.live.values()) {
      if (c.expr != null) v.env.gain.setTargetAtTime(v.level * liveExprGain(c.expr), t, 0.02)
      v.src.detune.setTargetAtTime(c.bend || 0, t, 0.01)
    }
  }
  noteOff(id) {
    const v = this.live.get(id)
    if (!v) { if (this.lab.current === this) this.offBeforeOn.add(id); return }
    this.live.delete(id)
    const t = this.lab.ctx.currentTime
    v.env.gain.cancelScheduledValues(t); v.env.gain.setValueAtTime(v.env.gain.value, t); v.env.gain.setTargetAtTime(0, t, 0.06); v.src.stop(t + 0.5)
  }
}
