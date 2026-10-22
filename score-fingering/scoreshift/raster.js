// Tiny SVG path rasterizer (no canvas needed: runs in workers and under bun). Used to turn the
// SMuFL glyph outlines in glyphs.js into bitmaps for template matching. Paths: M L H V C S Q T Z
// (absolute and relative), no arcs. Fill rule nonzero, sampled at pixel centres.

function polygons(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];
  const polys = []; let cur = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, prev = '';
  const num = () => +toks[i++];
  const isNum = () => i < toks.length && !/[a-zA-Z]/.test(toks[i]);
  const line = (nx, ny) => { cur.push(nx, ny); x = nx; y = ny; };
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    const n = 8;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.push(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
    }
    cx = x2; cy = y2; x = x3; y = y3;
  };
  const quad = (x1, y1, x2, y2) => { cubic(x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y), x2 + (2 / 3) * (x1 - x2), y2 + (2 / 3) * (y1 - y2), x2, y2); cx = x1; cy = y1; };
  while (i < toks.length) {
    if (!isNum()) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { if (cur) { x = sx; y = sy; } prev = 'Z'; continue; }
    if (C === 'M') { cur = []; polys.push(cur); x = num() + ox; y = num() + oy; sx = x; sy = y; cur.push(x, y); cmd = rel ? 'l' : 'L'; prev = 'M'; continue; }
    if (!cur) { cur = [x, y]; polys.push(cur); }
    if (C === 'L') line(num() + ox, num() + oy);
    else if (C === 'H') line(num() + ox, y);
    else if (C === 'V') line(x, num() + oy);
    else if (C === 'C') { const a = num() + ox, b = num() + oy, c = num() + ox, e = num() + oy; cubic(a, b, c, e, num() + ox, num() + oy); }
    else if (C === 'S') { const r1 = 'CS'.includes(prev) ? 2 * x - cx : x, r2 = 'CS'.includes(prev) ? 2 * y - cy : y; const c = num() + ox, e = num() + oy; cubic(r1, r2, c, e, num() + ox, num() + oy); }
    else if (C === 'Q') { const a = num() + ox, b = num() + oy; quad(a, b, num() + ox, num() + oy); }
    else if (C === 'T') { const a = 'QT'.includes(prev) ? 2 * x - cx : x, b = 'QT'.includes(prev) ? 2 * y - cy : y; quad(a, b, num() + ox, num() + oy); }
    else { i++; continue; }
    prev = C;
  }
  return polys;
}

/**
 * Rasterize a glyph (path d in font units, 250 per staff space, y up) at `S` px per staff space.
 * Returns { w, h, m (Uint8Array 0/1), x0, y0 } where (x0, y0) is the bitmap's origin in staff
 * spaces relative to the glyph origin, y down.
 */
export function rasterGlyph(d, S) {
  const polys = polygons(d).map((p) => p.map((v, k) => (k % 2 ? -v : v) * (S / 250)));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (let k = 0; k < p.length; k += 2) { x0 = Math.min(x0, p[k]); x1 = Math.max(x1, p[k]); y0 = Math.min(y0, p[k + 1]); y1 = Math.max(y1, p[k + 1]); }
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  const w = Math.max(1, Math.ceil(x1) - x0), h = Math.max(1, Math.ceil(y1) - y0), m = new Uint8Array(w * h);
  const edges = [];
  for (const p of polys) for (let k = 0; k < p.length; k += 2) {
    const n = (k + 2) % p.length, ax = p[k] - x0, ay = p[k + 1] - y0, bx = p[n] - x0, by = p[n + 1] - y0;
    if (ay !== by) edges.push(ay < by ? [ax, ay, bx, by, 1] : [bx, by, ax, ay, -1]);
  }
  for (let yy = 0; yy < h; yy++) {
    const yc = yy + 0.5, xs = [];
    for (const [ax, ay, bx, by, wd] of edges) if (yc >= ay && yc < by) xs.push([ax + ((yc - ay) * (bx - ax)) / (by - ay), wd]);
    xs.sort((a, b) => a[0] - b[0]);
    let wind = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      wind += xs[k][1];
      if (!wind) continue;
      for (let xx = Math.max(0, Math.ceil(xs[k][0] - 0.5)); xx < Math.min(w, Math.ceil(xs[k + 1][0] - 0.5)); xx++) m[yy * w + xx] = 1;
    }
  }
  return { w, h, m, x0: x0 / S, y0: y0 / S };
}

// Shape descriptor of a binary bitmap's ink bounding box: an N x N grid of ink coverage.
export const GRID = 10;
export function descriptor(m, w, h) {
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  if (bx1 < 0) return null;
  const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, g = new Float32Array(GRID * GRID), cnt = new Float32Array(GRID * GRID);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const k = Math.min(GRID - 1, Math.floor(((y - by0) * GRID) / bh)) * GRID + Math.min(GRID - 1, Math.floor(((x - bx0) * GRID) / bw));
    cnt[k]++; if (m[y * w + x]) g[k]++;
  }
  for (let k = 0; k < g.length; k++) g[k] = cnt[k] ? g[k] / cnt[k] : 0;
  return { g, bw, bh };
}
export function shapeDistance(a, b) {
  let s = 0; for (let k = 0; k < a.g.length; k++) s += Math.abs(a.g[k] - b.g[k]);
  return s / a.g.length + 0.35 * Math.abs(Math.log((a.bw / a.bh) / (b.bw / b.bh)));
}
