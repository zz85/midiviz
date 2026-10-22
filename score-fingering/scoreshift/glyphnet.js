// A small learned glyph classifier: 24 x 40 crop of the binarized page (staff lines in) around a
// candidate symbol, 3 x 5 staff spaces at the normalized 16 px space, plus its box size ->
// MLP 962-96-48-12 -> probabilities for sharp, flat, natural, double sharp / flat, black and
// hollow head, rests and "other". ~100k parameters, int8, ~0.1 ms a glyph in plain JS.
// Trained by tools/glyphnet.mjs; used as one source of evidence among competing readings.
import { GLYPHNET } from './glyphnet-weights.js';

export const GW = 24, GH = 40, NF = GW * GH + 2;
export const LABELS = GLYPHNET.labels;
const dec = (s, T) => { const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); const u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
let NET = null;
function net() {
  if (!NET) NET = GLYPHNET.layers.map((L) => { const q = dec(L.W, Int8Array), s = dec(L.s, Float32Array), W = new Float32Array(q.length); for (let o = 0; o < L.nout; o++) for (let i = 0; i < L.nin; i++) W[o * L.nin + i] = q[o * L.nin + i] * s[o]; return { nin: L.nin, nout: L.nout, W, b: dec(L.b, Float32Array) }; });
  return NET;
}
export function crop(bin, box) {
  const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, x0 = Math.round(cx - 24), y0 = Math.round(cy - 40), f = new Float32Array(NF);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let s = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const X = x0 + 2 * x + dx, Y = y0 + 2 * y + dy; if (X >= 0 && Y >= 0 && X < bin.w && Y < bin.h) s += bin.data[Y * bin.w + X]; }
    f[y * GW + x] = s / 4;
  }
  f[GW * GH] = (box[2] - box[0]) / 16; f[GW * GH + 1] = (box[3] - box[1]) / 16;
  return f;
}
export function forward(x, layers = net()) {
  let h = x;
  layers.forEach((L, li) => { const a = new Float32Array(L.nout); for (let o = 0; o < L.nout; o++) { let v = L.b[o]; const r = o * L.nin; for (let i = 0; i < L.nin; i++) v += L.W[r + i] * h[i]; a[o] = li < layers.length - 1 ? Math.max(0, v) : v; } h = a; });
  let mx = -Infinity; for (const v of h) mx = Math.max(mx, v);
  let z = 0; for (const v of h) z += Math.exp(v - mx);
  return Array.from(h, (v) => Math.exp(v - mx) / z);
}
/** { label: probability } for a candidate box on the normalized binary page. */
export function classify(bin, box) { const p = forward(crop(bin, box)); const o = {}; LABELS.forEach((l, i) => (o[l] = p[i])); return o; }
