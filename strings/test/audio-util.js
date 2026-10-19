// Small audio analysis helpers for the #034 tests (Node).
import { writeFileSync } from 'node:fs'

/** Fundamental by normalised autocorrelation over [fmin, fmax], parabolic refinement. Returns { f0, clarity }. */
export function pitch(x, sr, { fmin = 80, fmax = 3000 } = {}) {
  const n = x.length
  const lo = Math.floor(sr / fmax), hi = Math.min(n >> 1, Math.ceil(sr / fmin))
  let e0 = 0
  for (let i = 0; i < n - hi; i++) e0 += x[i] * x[i]
  const r = new Float64Array(hi + 2)
  for (let l = lo; l <= hi + 1; l++) {
    let s = 0, e1 = 0
    for (let i = 0; i < n - hi; i++) { s += x[i] * x[i + l]; e1 += x[i + l] * x[i + l] }
    r[l] = s / Math.sqrt(e0 * e1 + 1e-20)
  }
  // first peak above 0.9 × max (avoids octave errors)
  let max = 0
  for (let l = lo; l <= hi; l++) max = Math.max(max, r[l])
  let best = lo
  for (let l = lo + 1; l <= hi; l++) if (r[l] >= 0.92 * max && r[l] >= r[l - 1] && r[l] >= r[l + 1]) { best = l; break }
  const a = r[best - 1], b = r[best], c = r[best + 1]
  const d = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0
  return { f0: sr / (best + d), clarity: b }
}

export const cents = (f, ref) => 1200 * Math.log2(f / ref)
export const rms = x => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / Math.max(1, x.length))

/** Magnitude spectrum (dB) of one Hann-windowed frame by plain DFT on a log grid of bins. */
export function spectrumDb(x, sr, freqs) {
  const n = x.length, out = new Float64Array(freqs.length)
  for (let k = 0; k < freqs.length; k++) {
    const w = 2 * Math.PI * freqs[k] / sr
    let re = 0, im = 0
    for (let i = 0; i < n; i++) {
      const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))
      re += x[i] * h * Math.cos(w * i); im -= x[i] * h * Math.sin(w * i)
    }
    out[k] = 20 * Math.log10(Math.hypot(re, im) / n + 1e-12)
  }
  return out
}

/** Spectral centroid (Hz) via radix-2 FFT of the first 2^k samples. */
export function centroid(x, sr) {
  let n = 1
  while (n * 2 <= x.length && n < 16384) n *= 2
  const re = new Float64Array(n), im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)))
  fft(re, im)
  let s = 0, w = 0
  for (let k = 1; k < n / 2; k++) { const m = Math.hypot(re[k], im[k]); s += m * k * sr / n; w += m }
  return s / (w || 1)
}

export function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j]
        const vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci
        const vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr
        re[i + j] = ur + vr; im[i + j] = ui + vi
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
      }
    }
  }
}

/** 16-bit stereo WAV. */
export function writeWav(path, chans, sr) {
  const n = chans[0].length, C = chans.length
  let peak = 0
  for (const c of chans) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(c[i]))
  const g = peak > 0.98 ? 0.98 / peak : 1
  const buf = Buffer.alloc(44 + n * C * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * C * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(C, 22); buf.writeUInt32LE(sr, 24)
  buf.writeUInt32LE(sr * C * 2, 28); buf.writeUInt16LE(C * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * C * 2, 40)
  let o = 44
  for (let i = 0; i < n; i++) for (const c of chans) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c[i] * g)) * 32767), o); o += 2 }
  writeFileSync(path, buf)
  return { peak, gain: g }
}

/** Read a PCM WAV (16/24-bit) → { sr, chans }. */
export function readWav(buf) {
  let i = 12, fmt = null, data = null
  while (i < buf.length - 8) {
    const id = buf.toString('ascii', i, i + 4), sz = buf.readUInt32LE(i + 4)
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(i + 10), sr: buf.readUInt32LE(i + 12), bits: buf.readUInt16LE(i + 22) }
    if (id === 'data') data = buf.subarray(i + 8, i + 8 + sz)
    i += 8 + sz + (sz & 1)
  }
  const B = fmt.bits / 8, n = Math.floor(data.length / (B * fmt.ch))
  const chans = Array.from({ length: fmt.ch }, () => new Float32Array(n))
  for (let k = 0; k < n; k++) for (let c = 0; c < fmt.ch; c++) {
    const o = (k * fmt.ch + c) * B
    chans[c][k] = B === 2 ? data.readInt16LE(o) / 32768 : data.readIntLE(o, 3) / 8388608
  }
  return { sr: fmt.sr, chans }
}

/**
 * Loudness (LKFS) of channels at sr: ITU-R BS.1770-4 K-weighting, 400 ms
 * blocks with 75 % overlap, the absolute (−70) and relative (−10 LU) gates.
 * A signal shorter than one block is measured as a whole.
 */
export function kLoudness(chans, sr) {
  const biq = (x, [b0, b1, b2, a1, a2]) => { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v } return y }
  let K = Math.tan(Math.PI * 1681.974450955533 / sr), Q = 0.7071752369554196, Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K
  const s1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
  K = Math.tan(Math.PI * 38.13547087602444 / sr); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K
  const s2 = [1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
  const ys = chans.map(x => biq(biq(x, s1), s2)), n = ys[0].length
  const B = Math.min(n, Math.round(0.4 * sr)), H = Math.max(1, Math.round(B / 4)), z = []
  for (let s = 0; s + B <= n; s += H) { let e = 0; for (const y of ys) for (let i = s; i < s + B; i++) e += y[i] * y[i]; z.push(e / B) }
  const L = e => -0.691 + 10 * Math.log10(e)
  let g = z.filter(e => L(e) > -70); if (!g.length) return -Infinity
  const m = g.reduce((a, b) => a + b, 0) / g.length
  g = g.filter(e => L(e) > L(m) - 10)
  return L(g.reduce((a, b) => a + b, 0) / g.length)
}
