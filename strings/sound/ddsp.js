// DDSP violin (Magenta, research/03_violin_sound.md §2.3) driven by the #034
// performance curves.
//
// The magenta.js `ddsp_violin` checkpoint is a TensorFlow.js graph model:
// f0_hz[1250] + loudness_db[1250] at 250 frames/s → 80 000 samples at 16 kHz
// (5 s), harmonic + filtered-noise synth and the reverb trained with it. We
// call the graph directly instead of magenta.js's DDSP class, which
// re-normalises the whole input and can only render one buffer at once:
//
//   voices   the model is monophonic. Voice 1 follows the loudest bowed
//            string every frame, voice 2 the other string of a double stop
//            (rendered only where one exists)
//   windows  5 s windows with 1 s overlaps, equal-power crossfaded, so a
//            piece renders window by window ahead of the playhead
//   level    our loudness curves (dB, about −60 for mezzo-forte) are mapped
//            onto the range the checkpoint was trained on (settings.json:
//            mean −68.5, mean-of-max −48.6)
//
// tf is passed in (the browser loads it from a CDN, the tests from npm).

export const DDSP_URL = 'https://storage.googleapis.com/magentadata/js/checkpoints/ddsp/violin'
export const DDSP_SR = 16000
const WIN = 1250, HOP_OUT = 64, OVERLAP = 250, STEP = WIN - OVERLAP
const PG = 'StatefulPartitionedCall/autoencoder/StatefulPartitionedCall/processor_group/'
const NODE_HARM = PG + 'mul_4'     // [1, 1250, 60]: amplitude × normalised harmonic distribution
const NODE_NOISE = PG + 'add_4'    // [1, 1250, 65]: filtered-noise magnitudes
const NH = 60, NB = 65, IR = 128

export async function loadDDSP(tf, url = DDSP_URL) {
  if (!tf.getKernel?.('Roll', tf.getBackend())) {
    try {
      tf.registerOp('Roll', node => {
        const parts = tf.split(node.inputs[0], 2, 2)
        const r = tf.concat([parts[1], parts[0]], 2)
        parts.forEach(t => t.dispose())
        return r
      })
    } catch (e) { /* already registered */ }
  }
  const model = await tf.loadGraphModel(`${url}/model.json`)
  let settings = { averageMaxLoudness: -48.6, meanLoudness: -68.5, meanPitch: 62, postGain: 2 }
  try { settings = { ...settings, ...(await (await fetch(`${url}/settings.json`)).json()) } } catch (e) { /* defaults */ }
  return new DDSPEngine(tf, model, settings)
}

export class DDSPEngine {
  constructor(tf, model, settings) { this.tf = tf; this.model = model; this.settings = settings }

  /**
   * One 1250-frame window → Float32Array(80000) at 16 kHz.
   * The graph's own synthesiser (sinusoid bank and FFT noise filter on 80 000
   * samples) is most of its cost on a CPU backend, so only the decoder runs
   * in tfjs and synthesize() below does the same synthesis in plain JS.
   */
  async window(f0, ld) {
    const tf = this.tf
    const a = tf.tensor1d(f0, 'float32'), b = tf.tensor1d(ld, 'float32')
    const outs = this.model.execute({ f0_hz: a, loudness_db: b }, [NODE_HARM, NODE_NOISE])
    const [harm, noise] = await Promise.all(outs.map(t => t.data()))
    a.dispose(); b.dispose(); outs.forEach(t => t.dispose())
    return synthesize(f0, harm, noise, { gain: this.settings.postGain || 1, seed: this.seed = (this.seed || 1) + 1 })
  }

  /** The graph end to end (reference for the tests). */
  async windowGraph(f0, ld) {
    const tf = this.tf
    const a = tf.tensor1d(f0, 'float32'), b = tf.tensor1d(ld, 'float32')
    const out = this.model.execute({ f0_hz: a, loudness_db: b })
    const data = await out.data()
    a.dispose(); b.dispose(); out.dispose()
    return Float32Array.from(data, v => v * (this.settings.postGain || 1))
  }

  /**
   * Plan the windows of one voice: { f0, ld } at 250 frames/s → list of
   * { start (frame), f0[1250], ld[1250], silent }.
   */
  plan({ f0, ld }) {
    const n = f0.length, wins = []
    for (let s = 0; s < n; s += STEP) {
      const F = new Float32Array(WIN), L = new Float32Array(WIN).fill(-120)
      let loud = false
      for (let i = 0; i < WIN; i++) {
        const k = s + i
        F[i] = k < n ? f0[k] : f0[n - 1]
        if (k < n) { L[i] = ld[k]; if (ld[k] > -100) loud = true }
      }
      wins.push({ start: s, f0: F, ld: L, silent: !loud })
      if (s + WIN >= n) break
    }
    return wins
  }

  /** Mix window outputs into a buffer (equal-power crossfades over the overlap). */
  static place(buf, start, y, first, last) {
    const o = start * HOP_OUT, X = OVERLAP * HOP_OUT
    for (let i = 0; i < y.length && o + i < buf.length; i++) {
      let g = 1
      if (!first && i < X) g = Math.sin(0.5 * Math.PI * i / X)
      if (!last && i >= y.length - X) g = Math.cos(0.5 * Math.PI * (i - (y.length - X)) / X)
      buf[o + i] += g * y[i]
    }
  }

  /** Render whole voices (tests, offline). onWindow(done, total) for progress. */
  async renderVoices(voices, { onWindow } = {}) {
    const n = voices[0].f0.length
    const out = new Float32Array(Math.ceil(n * HOP_OUT))
    const jobs = voices.flatMap(v => this.plan(v).map((w, i, all) => ({ w, first: i === 0, last: i === all.length - 1 })))
    let done = 0
    for (const j of jobs) {
      if (!j.w.silent) DDSPEngine.place(out, j.w.start, await this.window(j.w.f0, j.w.ld), j.first, j.last)
      onWindow?.(++done, jobs.length)
    }
    return out
  }
  dispose() { this.model.dispose() }
}

/**
 * Mono voices from a performance (strings/sound/performance.js):
 * voice 1 = the loudest string each frame, voice 2 = the second string where
 * two are bowed together (null when the piece has no double stops).
 * Loudness is mapped onto the checkpoint's range; f0 holds through silences.
 */
export function ddspVoices(perf, { settings = { averageMaxLoudness: -48.6, meanLoudness: -68.5 }, gainDb = 0 } = {}) {
  const { frames, data, loudness } = perf, W = 24
  const v1 = { f0: new Float32Array(frames), ld: new Float32Array(frames).fill(-120) }
  const v2 = { f0: new Float32Array(frames), ld: new Float32Array(frames).fill(-120) }
  let has2 = false, last1 = 0, last2 = 0, s1 = -1
  // our −60 dB ≈ mezzo-forte → the model's mean; our −45 → its loud end
  const top = settings.averageMaxLoudness, mid = settings.meanLoudness
  const map = d => d <= -110 ? -120 : Math.max(-120, Math.min(top + 3, mid + (d + 60 + gainDb) * (top - mid) / 15))
  for (let i = 0; i < frames; i++) {
    const order = [0, 1, 2, 3].filter(s => loudness[s][i] > -100).sort((a, b) => loudness[b][i] - loudness[a][i])
    // keep the same string on voice 1 while it is close to the loudest (no flapping)
    let a = order[0]
    if (s1 >= 0 && order.includes(s1) && loudness[s1][i] > loudness[a][i] - 6) a = s1
    if (a != null) { s1 = a; last1 = data[i * W + a * 6]; v1.ld[i] = map(loudness[a][i]) }
    v1.f0[i] = last1 || data[i * W + 2 * 6]
    // a second voice only for a string the bow is actually on (a double stop), not one ringing on
    const bowed = s => data[i * W + s * 6 + 2] > 0.05 && Math.abs(data[i * W + s * 6 + 1]) > 0.02
    const b = order.find(s => s !== a && bowed(s) && bowed(a) && loudness[s][i] > loudness[a][i] - 18)
    if (b != null) { has2 = true; last2 = data[i * W + b * 6]; v2.ld[i] = map(loudness[b][i]) }
    v2.f0[i] = last2 || v1.f0[i]
  }
  return has2 ? [v1, v2] : [v1]
}

// ── DDSP synthesis in JS (ddsp.synths.Harmonic + FilteredNoise) ─────────────
let hann128 = null, irPlan = null
/**
 * f0[1250] Hz, harm[1250·60] harmonic amplitudes, noise[1250·65] noise band
 * magnitudes → 80 000 samples at 16 kHz.
 *   harmonic  amplitudes interpolated per sample, phase = Σ 2π f0 / sr,
 *             harmonics at or above Nyquist are silent
 *   noise     per 64-sample frame a zero-phase FIR from the 65 magnitudes
 *             (inverse real DFT, centred, Hann-windowed, 128 taps) filters
 *             uniform noise; frames overlap-add
 */
export function synthesize(f0, harm, noise, { gain = 1, seed = 1 } = {}) {
  const N = WIN * HOP_OUT, y = new Float32Array(N), nyq = DDSP_SR / 2
  // harmonic bank
  const amp = new Float32Array(NH)
  let phase = 0
  for (let fr = 0; fr < WIN; fr++) {
    const fA = f0[fr], fB = f0[Math.min(WIN - 1, fr + 1)]
    const hA = fr * NH, hB = Math.min(WIN - 1, fr + 1) * NH
    for (let i = 0; i < HOP_OUT; i++) {
      const k = i / HOP_OUT, f = fA + (fB - fA) * k
      phase += 2 * Math.PI * f / DDSP_SR
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI
      let s = 0
      const kmax = Math.min(NH, Math.floor((nyq - 1) / Math.max(1, f)))
      // sin(k·φ) by the Chebyshev recurrence: one sin/cos per sample
      const c2 = 2 * Math.cos(phase)
      let sPrev = 0, sCur = Math.sin(phase)
      for (let h = 0; h < kmax; h++) {
        const a = harm[hA + h] + (harm[hB + h] - harm[hA + h]) * k
        s += a * sCur
        const sNext = c2 * sCur - sPrev
        sPrev = sCur; sCur = sNext
      }
      y[fr * HOP_OUT + i] = s
    }
  }
  // filtered noise
  if (!hann128) {
    hann128 = Float32Array.from({ length: IR }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / IR))
    // inverse real DFT basis: ir[n] = Σ_k w_k m_k cos(2π k n / 128), n centred
    irPlan = new Float32Array(NB * IR)
    for (let k = 0; k < NB; k++) for (let n = 0; n < IR; n++) {
      const w = k === 0 || k === NB - 1 ? 1 : 2
      irPlan[k * IR + n] = w * Math.cos(2 * Math.PI * k * (n - IR / 2) / IR) / IR
    }
  }
  let r = seed >>> 0 || 1
  const rnd = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return ((r >>> 0) / 4294967296) * 2 - 1 }
  const ir = new Float32Array(IR), nz = new Float32Array(HOP_OUT)
  for (let fr = 0; fr < WIN; fr++) {
    ir.fill(0)
    const m = noise.subarray(fr * NB, fr * NB + NB)
    for (let k = 0; k < NB; k++) { const mk = m[k]; if (mk < 1e-7) continue; const row = k * IR; for (let n = 0; n < IR; n++) ir[n] += mk * irPlan[row + n] }
    for (let n = 0; n < IR; n++) ir[n] *= hann128[n]
    for (let i = 0; i < HOP_OUT; i++) nz[i] = rnd()
    const o = fr * HOP_OUT - IR / 2
    for (let i = 0; i < HOP_OUT; i++) {
      const x = nz[i]
      for (let n = 0; n < IR; n++) { const j = o + i + n; if (j >= 0 && j < N) y[j] += x * ir[n] }
    }
  }
  if (gain !== 1) for (let i = 0; i < N; i++) y[i] *= gain
  return y
}
