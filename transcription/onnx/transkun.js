// Transkun v2 (Yan & Duan, ISMIR 2024; MIT) piano transcription around an
// ONNX export of its network. The network scores every candidate note
// interval; everything else runs here in plain JS:
//   - the front end: 6 analysis windows (Hann + 5 learned Gaussians), FFT,
//     229-band mel power, log normalisation (transkun/Util.py)
//   - the semi-CRF Viterbi that picks non-overlapping intervals per key / pedal
//     (CRF/NeuralSemiCRFInterval.py viterbiBackward, forced start positions)
//   - velocity and sub-frame onset / offset from the attribute head
//   - the 16 s segments with 8 s hop and their stitching (ModelTransformer.py
//     transcribeFrames + transcribe, resolveOverlapping)
//
// ONNX models (exported by transcription/onnx/tools/export_transkun.py):
//   transkun-core.onnx  features [1, T, 229, 6] → scores [90, T, T] (scores[p, end, begin]), ctx [90, T, 256]
//   transkun-attr.onnx  x [N, 768] = [ctx(begin), ctx(end), product] → velocity [N, 128], refine [N, 2], presence [N, 2]
// The 90 tracks are the sustain pedal (-64), the soft pedal (-67) and keys 21–108.

export const FS = 44100
export const HOP = 1024
export const WIN = 4096
export const N_BINS = WIN / 2 + 1
export const N_MELS = 229
export const N_CH = 6
export const D = 256
export const TRACKS = [-64, -67, ...Array.from({ length: 88 }, (_, i) => 21 + i)]
export const N_TRACKS = TRACKS.length
export const SEG_SEC = 16
export const STEP_SEC = 8
export const FRAME_DUR = HOP / FS

// ── Front end ──────────────────────────────────────────────────────────────
// learned Gaussian windows (sigmoid-parametrised width and centre), from the 2.0 checkpoint
const G_SIGMA = [-1.1706887483596802, -0.8110867142677307, 0.6248952746391296, -0.6810300946235657, -1.212547779083252]
const G_CENTER = [-0.6510074734687805, -0.2153073400259018, -0.031593162566423416, 0.3345024585723877, 0.9446282386779785]
const sigmoid = x => 1 / (1 + Math.exp(-x))

export const WINDOWS = (() => {
  const w = Array.from({ length: N_CH }, () => new Float32Array(WIN))
  for (let n = 0; n < WIN; n++) w[0][n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / WIN)   // torch.hann_window (periodic)
  for (let c = 0; c < 5; c++) {
    const s = sigmoid(G_SIGMA[c]), m = sigmoid(G_CENTER[c])
    for (let n = 0; n < WIN; n++) w[c + 1][n] = Math.exp(-0.5 * ((n - WIN * m) / ((s * WIN) / 2)) ** 2)
  }
  return w
})()

// torchaudio.functional.melscale_fbanks(2049, 30, 8000, 229, 44100), HTK scale, no norm; kept sparse
export const MEL = (() => {
  const hz2mel = f => 2595 * Math.log10(1 + f / 700), mel2hz = m => 700 * (10 ** (m / 2595) - 1)
  const m0 = hz2mel(30), m1 = hz2mel(8000), fp = []
  for (let i = 0; i < N_MELS + 2; i++) fp.push(mel2hz(m0 + ((m1 - m0) * i) / (N_MELS + 1)))
  const bands = []
  for (let m = 0; m < N_MELS; m++) {
    const lo = [], w = []
    for (let k = 0; k < N_BINS; k++) {
      const f = (k * (FS / 2)) / (N_BINS - 1)   // linspace(0, sr // 2, n_freqs)
      const down = (f - fp[m]) / (fp[m + 1] - fp[m]), up = (fp[m + 2] - f) / (fp[m + 2] - fp[m + 1])
      const v = Math.max(0, Math.min(down, up))
      if (v > 0) { lo.push(k); w.push(v) }
    }
    bands.push({ k0: lo.length ? lo[0] : 0, w: Float32Array.from(w) })
  }
  return bands
})()

// radix-2 complex FFT of size WIN
const FFT = (() => {
  const n = WIN, bits = Math.log2(n), rev = new Uint32Array(n), cos = new Float64Array(n / 2), sin = new Float64Array(n / 2)
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r }
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n) }
  return (re, im) => {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size
      for (let s = 0; s < n; s += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = s + j, b = a + half
          const tr = re[b] * cos[k] - im[b] * sin[k], ti = re[b] * sin[k] + im[b] * cos[k]
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti
        }
      }
    }
  }
})()

/** Frames of a segment, as makeFrame: half a window of zeros in front, ceil(n / hop) + 1 frames. */
export const frameCount = n => Math.ceil(n / HOP) + 1

/**
 * Segment audio (44.1 kHz mono) → log-mel features [T][229][6] (Float32Array), as
 * processFramesBatch: gain-normalise over all frame samples, then MelSpectrum.
 */
export function features(x) {
  const T = frameCount(x.length), lPad = WIN / 2
  const at = (t, j) => { const i = t * HOP + j - lPad; return i >= 0 && i < x.length ? x[i] : 0 }
  // mean / unbiased std over every sample of every frame (frames overlap, padding counts)
  let s = 0, s2 = 0
  for (let t = 0; t < T; t++) for (let j = 0; j < WIN; j++) { const v = at(t, j); s += v; s2 += v * v }
  const n = T * WIN, mean = s / n, std = Math.sqrt(Math.max(0, (s2 - s * mean) / (n - 1))), g = 1 / (std + 1e-8)
  const out = new Float32Array(T * N_MELS * N_CH)
  const fr = new Float64Array(WIN), re = new Float64Array(WIN), im = new Float64Array(WIN)
  const pw = Array.from({ length: N_CH }, () => new Float64Array(N_BINS))
  const eps = 1e-5, leps = Math.log(eps)
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < WIN; j++) fr[j] = (at(t, j) - mean) * g
    // two real windows per complex FFT
    for (let c = 0; c < N_CH; c += 2) {
      const wa = WINDOWS[c], wb = WINDOWS[c + 1]
      for (let j = 0; j < WIN; j++) { re[j] = fr[j] * wa[j]; im[j] = fr[j] * wb[j] }
      FFT(re, im)
      const pa = pw[c], pb = pw[c + 1]
      for (let k = 0; k < N_BINS; k++) {
        const k2 = (WIN - k) % WIN
        const ar = (re[k] + re[k2]) / 2, ai = (im[k] - im[k2]) / 2
        const br = (im[k] + im[k2]) / 2, bi = (re[k2] - re[k]) / 2
        pa[k] = (ar * ar + ai * ai) / WIN; pb[k] = (br * br + bi * bi) / WIN   // norm="ortho", |X|²
      }
    }
    for (let m = 0; m < N_MELS; m++) {
      const { k0, w } = MEL[m], o = (t * N_MELS + m) * N_CH
      for (let c = 0; c < N_CH; c++) {
        const p = pw[c]; let v = 0
        for (let i = 0; i < w.length; i++) v += p[k0 + i] * w[i]
        out[o + c] = (Math.log(v + eps) - leps) / -leps
      }
    }
  }
  return { features: out, T }
}

// ── Semi-CRF decoding ──────────────────────────────────────────────────────
/**
 * viterbiBackward for one track. score(e, b) = S[base + e*T + b] for end e >= begin b;
 * the non-event score is 0. Returns intervals [[begin, end], ...] from `start` on.
 */
export function viterbiTrack(S, base, T, start = 0) {
  const q = new Float64Array(T), ptr = new Int32Array(T)   // ptr[j]: chosen end - (j+1), or -1 to skip
  const d = i => S[base + i * T + i]
  q[T - 1] = d(T - 1) > 0 ? d(T - 1) : 0
  for (let j = T - 2; j >= 0; j--) {
    let best = q[j + 1], sel = -1
    for (let e = j + 1; e < T; e++) {
      const v = q[e] + S[base + e * T + j]
      if (v > best) { best = v; sel = e - (j + 1) }
    }
    ptr[j] = sel
    q[j] = best + (d(j) > 0 ? d(j) : 0)
  }
  const res = []
  let j = start
  while (j < T - 1) {
    if (d(j) > 0) res.push([j, j])
    const sel = ptr[j]
    if (sel < 0) j++
    else { const i = sel + j + 1; res.push([j, i]); j = i }
  }
  if (d(T - 1) > 0) res.push([T - 1, T - 1])
  return res
}

/** All tracks of one segment. */
export function decodeSegment(S, T, startPos) {
  const paths = []
  for (let p = 0; p < N_TRACKS; p++) paths.push(viterbiTrack(S, p * T * T, T, startPos ? startPos[p] : 0))
  return paths
}

/** Attribute-head input for every interval: [ctx(begin), ctx(end), ctx(begin) * ctx(end)]. */
export function attributeInput(ctx, T, paths) {
  const N = paths.reduce((s, p) => s + p.length, 0), x = new Float32Array(N * 3 * D)
  let n = 0
  for (let p = 0; p < N_TRACKS; p++) {
    for (const [b, e] of paths[p]) {
      const ia = (p * T + b) * D, ib = (p * T + e) * D, o = n * 3 * D
      for (let k = 0; k < D; k++) { const a = ctx[ia + k], c = ctx[ib + k]; x[o + k] = a; x[o + D + k] = c; x[o + 2 * D + k] = a * c }
      n++
    }
  }
  return { x, N }
}

// mean of a continuous Bernoulli with these logits (torch.distributions.ContinuousBernoulli)
function cbMean(logit) {
  const p = sigmoid(logit)
  if (p <= 0.499 || p > 0.501) return p / (2 * p - 1) + 1 / (Math.log1p(-p) - Math.log(p))
  const x = p - 0.5
  return 0.5 + (1 / 3 + (16 / 45) * x * x) * x
}

/** transcribeFrames: intervals + attributes → events (segment-relative seconds) and the last offset per track. */
export function segmentEvents(paths, attr, lastFrameIdx) {
  const events = [], lastP = new Array(N_TRACKS).fill(0)
  let n = 0
  for (let p = 0; p < N_TRACKS; p++) {
    let lastEnd = 0
    for (const [b, e] of paths[p]) {
      let vel = 0, best = -Infinity
      for (let k = 0; k < 128; k++) { const v = attr.velocity[n * 128 + k]; if (v > best) { best = v; vel = k } }
      const of0 = Math.max(-0.5, Math.min(0.5, (cbMean(attr.refine[n * 2]) - 0.5) / 0.99))
      const of1 = Math.max(-0.5, Math.min(0.5, (cbMean(attr.refine[n * 2 + 1]) - 0.5) / 0.99))
      let start = (b + of0) * FRAME_DUR, end = (e + of1) * FRAME_DUR
      const hasOnset = b > 0 || attr.presence[n * 2] > 0
      const hasOffset = e < lastFrameIdx || attr.presence[n * 2 + 1] > 0
      start = Math.max(start, lastEnd); end = Math.max(end, start + 1e-8); lastEnd = end
      events.push({ pitch: TRACKS[p], start, end, velocity: vel, hasOnset, hasOffset })
      if (hasOffset) lastP[p] = e
      n++
    }
  }
  events.sort((a, b) => a.start - b.start || a.end - b.end || a.pitch - b.pitch)
  return { events, lastP }
}

/**
 * Whole-recording driver (transcribe() in ModelTransformer.py): 16 s segments every 8 s over the
 * audio padded by 8 s each side; each segment's decoding starts where the previous one's notes ended.
 * runCore(features, T) → { scores, ctx }; runAttr(x, N) → { velocity, refine, presence }.
 * onSegment({ index, count, notes, pedals }) is called after every segment with the result so far.
 */
export async function transcribe(audio, runCore, runAttr, { onSegment, segSec = SEG_SEC, stepSec = STEP_SEC } = {}) {
  const padSec = segSec - stepSec
  const pad = Math.ceil(padSec * FS)
  const nSample = audio.length + 2 * pad
  const stepSize = Math.ceil((stepSec * FS) / HOP) * HOP
  const segSize = Math.ceil(segSec * FS)
  const stepFrames = stepSize / HOP
  const lastFrameIdx = Math.round(segSize / HOP)
  let startPos = new Array(N_TRACKS).fill(Math.floor((padSec * FS) / HOP))
  const byPitch = new Map()
  const count = Math.ceil(nSample / stepSize)
  const timing = { features: 0, core: 0, decode: 0, attr: 0 }
  const seg = new Float32Array(segSize)
  for (let s = 0, i = 0; i < nSample; s++, i += stepSize) {
    // the padded signal is [pad zeros, audio, pad zeros]
    seg.fill(0)
    const a0 = i - pad
    for (let k = Math.max(0, -a0); k < segSize && a0 + k < audio.length; k++) seg[k] = audio[a0 + k]
    let t0 = performance.now()
    const { features: f, T } = features(seg)
    timing.features += performance.now() - t0; t0 = performance.now()
    const { scores, ctx } = await runCore(f, T)
    timing.core += performance.now() - t0; t0 = performance.now()
    const paths = decodeSegment(scores, T, startPos)
    timing.decode += performance.now() - t0; t0 = performance.now()
    const { x, N } = attributeInput(ctx, T, paths)
    let events = [], lastP = new Array(N_TRACKS).fill(0)
    if (N > 0) ({ events, lastP } = segmentEvents(paths, await runAttr(x, N), lastFrameIdx))
    timing.attr += performance.now() - t0
    startPos = lastP.map(k => Math.max(k - stepFrames, 0))
    const begin = i / FS - padSec
    for (const e of events) {
      e.start = Math.max(e.start + begin, 0); e.end = Math.max(e.end + begin, e.start)
      const list = byPitch.get(e.pitch) || byPitch.set(e.pitch, []).get(e.pitch)
      const last = list[list.length - 1]
      if (last && e.start < last.end) {
        if (e.hasOnset) list[list.length - 1] = e
        else { last.hasOffset = e.hasOffset; last.end = Math.max(e.end, last.end) }
        continue
      }
      if (e.hasOnset) list.push(e)
    }
    onSegment?.({ index: s, count, ...finish(byPitch, false), timing })
  }
  return { ...finish(byPitch, true), timing, segments: count }
}

// end of transcribe(): close the last event per track, keep complete events, resolveOverlapping
function finish(byPitch, final) {
  let all = []
  for (const list of byPitch.values()) {
    const l = list.map(e => ({ ...e }))
    if (l.length) l[l.length - 1].hasOffset = true
    all.push(...(final ? l.filter(e => e.hasOffset) : l))
  }
  all = resolveOverlapping(all)
  const notes = [], pedals = []
  for (const e of all) (e.pitch < 0 ? pedals : notes).push({ pitch: e.pitch, start: e.start, end: e.end, velocity: Math.max(1, e.velocity) })
  return { notes, pedals }
}

export function resolveOverlapping(events) {
  events.sort((a, b) => a.start - b.start || a.end - b.end || a.pitch - b.pitch)
  const last = new Map()
  for (const e of events) {
    const prev = last.get(e.pitch)
    if (prev && prev.end > e.start) prev.end = e.start
    last.set(e.pitch, e)
  }
  return events.filter(e => e.start < e.end).sort((a, b) => a.start - b.start || a.end - b.end || a.pitch - b.pitch)
}

/** Downmix and resample to 44.1 kHz mono is left to the caller (OfflineAudioContext in the browser). */
