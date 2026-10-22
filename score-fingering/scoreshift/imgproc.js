// Image processing primitives for ScoreShift. Pure JS, no DOM: runs in a worker, bun and node.
// Images are { w, h, data } with data a Uint8Array: gray 0..255, or binary 1 = ink.

// Sauvola binarisation with integral images: T = m * (1 + k (s/R - 1)).
export function sauvola(g, win = 31, k = 0.25, R = 128, pre = 1) {
  if (pre) g = boxBlur(g, pre); // tame sensor noise before thresholding
  const { w, h, data } = g, W = w + 1;
  const S1 = new Float64Array(W * (h + 1)), S2 = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let a = 0, b = 0;
    for (let x = 0; x < w; x++) {
      const v = data[y * w + x]; a += v; b += v * v;
      S1[(y + 1) * W + x + 1] = S1[y * W + x + 1] + a; S2[(y + 1) * W + x + 1] = S2[y * W + x + 1] + b;
    }
  }
  const r = win >> 1, out = new Uint8Array(w * h), M = new Float32Array(w * h), SD = new Float32Array(w * h);
  let maxSd = 1;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), n = (y1 - y0) * (x1 - x0);
      const s = S1[y1 * W + x1] - S1[y0 * W + x1] - S1[y1 * W + x0] + S1[y0 * W + x0];
      const q = S2[y1 * W + x1] - S2[y0 * W + x1] - S2[y1 * W + x0] + S2[y0 * W + x0];
      const m = s / n, sd = Math.sqrt(Math.max(0, q / n - m * m));
      M[y * w + x] = m; SD[y * w + x] = sd; if (sd > maxSd) maxSd = sd;
    }
  }
  if (R === 'wolf') {
    // Wolf & Jolion (2004): normalises contrast by the image's darkest level and largest local
    // deviation, so faint photographed staff lines survive where Sauvola's fixed R drops them
    const hist = new Uint32Array(256); for (let i = 0; i < w * h; i++) hist[data[i]]++;
    let c = 0, lo = 0; while (lo < 255 && c + hist[lo] < w * h * 0.002) c += hist[lo++];
    for (let i = 0; i < w * h; i++) {
      const m = M[i], T = m - k * (1 - SD[i] / maxSd) * (m - lo);
      out[i] = data[i] < T && SD[i] > 3 ? 1 : 0;
    }
  } else {
    // the absolute cap keeps flat paper with a little noise from turning black
    for (let i = 0; i < w * h; i++) out[i] = data[i] < Math.min(M[i] * (1 + k * (SD[i] / R - 1)), 200) ? 1 : 0;
  }
  return { w, h, data: out };
}

// Most common vertical black run (staff line thickness) and black+white run pair
// (line-to-line distance), Fujinaga / Audiveris style. Samples every `step` columns.
export function staffMetrics(b, step = 3) {
  const { w, h, data } = b, black = new Uint32Array(64), pair = new Uint32Array(256);
  for (let x = 0; x < w; x += step) {
    let y = 0;
    while (y < h && !data[y * w + x]) y++;
    while (y < h) {
      let b0 = y; while (y < h && data[y * w + x]) y++;
      const bl = y - b0; let w0 = y; while (y < h && !data[y * w + x]) y++;
      if (y >= h) break;
      const wl = y - w0;
      if (bl < 64) black[bl]++;
      if (bl < 64 && bl + wl < 256) pair[bl + wl]++;
    }
  }
  const mode = (hist, lo) => { let best = lo; for (let i = lo; i < hist.length; i++) if (hist[i] > hist[best]) best = i; return best; };
  const t = mode(black, 1);
  const d0 = mode(pair, Math.max(4, t * 2 + 1));
  // sub-pixel: weighted mean around the mode
  let sw = 0, sv = 0; for (let i = Math.max(1, d0 - 2); i <= Math.min(255, d0 + 2); i++) { sw += pair[i]; sv += pair[i] * i; }
  let tw = 0, tv = 0; for (let i = Math.max(1, t - 1); i <= Math.min(63, t + 1); i++) { tw += black[i]; tv += black[i] * i; }
  return { thick: tw ? tv / tw : t, space: sw ? sv / sw : d0, votes: pair[d0] };
}

// Dominant skew angle (radians) of long horizontal structure: shear the ink and keep the
// angle whose row histogram is sharpest. Coarse-to-fine.
export function estimateSkew(b, maxDeg = 8) {
  const { w, h, data } = b, pts = [];
  // every pixel row counts (a sub-sampled grid would make angle 0 win on noise)
  let ink = 0; for (let i = 0; i < w * h; i++) ink += data[i];
  const keep = Math.max(1, Math.round(ink / 150000));
  for (let i = 0, c = 0; i < w * h; i++) if (data[i] && ++c % keep === 0) pts.push(i % w, (i / w) | 0);
  const score = (a) => {
    const t = Math.tan(a), hist = new Float64Array(h + 2 * w + 4), off = w + 2;
    for (let i = 0; i < pts.length; i += 2) { const yy = pts[i + 1] - pts[i] * t + off; const k = yy | 0; hist[k] += 1; }
    let s = 0; for (let i = 0; i < hist.length; i++) s += hist[i] * hist[i]; return s;
  };
  let best = 0, bs = -1;
  for (let d = -maxDeg; d <= maxDeg; d += 0.5) { const s = score((d * Math.PI) / 180); if (s > bs) { bs = s; best = d; } }
  for (let d = best - 0.5; d <= best + 0.5; d += 0.05) { const s = score((d * Math.PI) / 180); if (s > bs) { bs = s; best = d; } }
  return (best * Math.PI) / 180;
}

// Bilinear resample through an affine map from output (u,v) to input (x,y):
// x = a*u + b*v + c, y = d*u + e*v + f. Outside pixels get `fill`.
export function resampleAffine(g, ow, oh, [a, b, c, d, e, f], fill = 255) {
  const { w, h, data } = g, out = new Uint8Array(ow * oh);
  for (let v = 0; v < oh; v++) {
    for (let u = 0; u < ow; u++) {
      const x = a * u + b * v + c, y = d * u + e * v + f;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) { out[v * ow + u] = fill; continue; }
      const fx = x - x0, fy = y - y0, i = y0 * w + x0;
      const top = data[i] + (data[i + 1] - data[i]) * fx, bot = data[i + w] + (data[i + w + 1] - data[i + w]) * fx;
      out[v * ow + u] = top + (bot - top) * fy + 0.5;
    }
  }
  return { w: ow, h: oh, data: out };
}

// Box downscale by an integer-free factor (area average), for huge photos.
export function downscale(g, f) {
  if (f >= 1) return g;
  const ow = Math.max(1, Math.round(g.w * f)), oh = Math.max(1, Math.round(g.h * f));
  return resampleAffine(boxBlur(g, Math.max(0, Math.round(0.5 / f - 0.5))), ow, oh, [1 / f, 0, 0.5 / f - 0.5, 0, 1 / f, 0.5 / f - 0.5]);
}

export function boxBlur(g, r) {
  if (r < 1) return g;
  const { w, h } = g; let src = g.data, tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { tmp[row + x] = s / (2 * r + 1); s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return { w, h, data: out };
}

// Binary morphology with a rectangle (kw x kh) via prefix sums. erode: all ink; dilate: any ink.
function morph(b, kw, kh, erode) {
  const { w, h, data } = b, tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const rx0 = kw >> 1, rx1 = kw - 1 - rx0, ry0 = kh >> 1, ry1 = kh - 1 - ry0;
  const pre = new Int32Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + data[y * w + x];
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, x - rx0), z = Math.min(w, x + rx1 + 1), s = pre[z] - pre[a];
      tmp[y * w + x] = erode ? (s === z - a && z - a === kw ? 1 : 0) : s > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const a = Math.max(0, y - ry0), z = Math.min(h, y + ry1 + 1), s = pre[z] - pre[a];
      out[y * w + x] = erode ? (s === z - a && z - a === kh ? 1 : 0) : s > 0 ? 1 : 0;
    }
  }
  return { w, h, data: out };
}
export const erode = (b, kw, kh = kw) => morph(b, kw, kh, true);
export const dilate = (b, kw, kh = kw) => morph(b, kw, kh, false);
export const open = (b, kw, kh = kw) => dilate(erode(b, kw, kh), kw, kh);

// 8-connected components. Returns { labels: Int32Array (0 = background), comps: [{id,x0,y0,x1,y1,n,sx,sy}] }.
export function components(b, want = 1) {
  const { w, h, data } = b, labels = new Int32Array(w * h), comps = [null];
  const stack = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i] !== want || labels[i]) continue;
    const id = comps.length; let sp = 0; stack[sp++] = i; labels[i] = id;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0, sx = 0, sy = 0;
    while (sp) {
      const j = stack[--sp], x = j % w, y = (j - x) / w;
      n++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          if (want === 0 && dx && dy) continue; // white is 4-connected (dual of 8-connected ink)
          const k = yy * w + xx;
          if (data[k] === want && !labels[k]) { labels[k] = id; stack[sp++] = k; }
        }
      }
    }
    comps.push({ id, x0, y0, x1, y1, n, cx: sx / n, cy: sy / n });
  }
  return { labels, comps };
}

export function integral(b) {
  const { w, h, data } = b, W = w + 1, I = new Int32Array(W * (h + 1));
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += data[y * w + x]; I[(y + 1) * W + x + 1] = I[y * W + x + 1] + s; } }
  return { W, w, h, I, sum(x0, y0, x1, y1) { // inclusive-exclusive, clamped
    x0 = Math.max(0, Math.min(w, Math.round(x0))); x1 = Math.max(0, Math.min(w, Math.round(x1)));
    y0 = Math.max(0, Math.min(h, Math.round(y0))); y1 = Math.max(0, Math.min(h, Math.round(y1)));
    return I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0];
  } };
}

// Sensor noise estimate (sigma, gray levels) from horizontal neighbour differences (MAD).
export function noiseSigma(g) {
  const { w, h, data } = g, hist = new Uint32Array(256); let n = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w - 1; x += 2) { hist[Math.abs(data[y * w + x] - data[y * w + x + 1])]++; n++; }
  let c = 0, m = 0; while (m < 255 && c + hist[m] < n / 2) c += hist[m++];
  return (m * 1.4826) / Math.SQRT2;
}
