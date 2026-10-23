// Optical music recognition for ScoreShift: a classical staff-first pipeline
// (Fujinaga run-lengths -> staff detection -> staff removal -> symbol segmentation),
// limited to what transposition needs: staves, clefs, key signatures, barlines,
// noteheads + stems, accidentals and augmentation dots. Rhythm is never interpreted:
// the page keeps its own layout, so durations do not have to be understood to move notes.
import * as IP from './imgproc.js';
import { CLEFS, readStaff, nameOf, keySigPositions } from './theory.js';
import { readRhythm } from './rhythm.js';
import { classify } from './glyphnet.js';

export const TARGET = 16; // staff space (line to line) in normalized pixels
const odd = (n) => (n | 1);

// ---------- normalisation: scale to TARGET space, deskew ----------
export function normalize(gray) {
  const { w, h } = gray;
  const b0 = IP.sauvola(gray, odd(Math.max(15, Math.round(Math.min(w, h) / 40))), 0.15);
  const m0 = IP.staffMetrics(b0);
  if (!(m0.space >= 5) || m0.votes < 20) throw new Error('No staff lines found');
  const f = TARGET / m0.space;
  const ang = IP.estimateSkew(b0);
  const c = Math.cos(ang), s = Math.sin(ang);
  const ow = Math.ceil(f * (w * Math.abs(c) + h * Math.abs(s))), oh = Math.ceil(f * (w * Math.abs(s) + h * Math.abs(c)));
  const ou = ow / 2, ov = oh / 2, cx = w / 2, cy = h / 2;
  // normalized (u,v) -> original (x,y)
  const A = [c / f, -s / f, cx - (c * ou - s * ov) / f, s / f, c / f, cy - (s * ou + c * ov) / f];
  const src = f < 1 ? IP.boxBlur(gray, Math.round(0.5 / f - 0.5)) : gray;
  const g = IP.resampleAffine(src, ow, oh, A, 255);
  const noise = IP.noiseSigma(g);
  const bin = IP.sauvola(g, 41, 0.2, 'wolf', noise > 3 ? 1 : 0);
  const m = IP.staffMetrics(bin);
  return { g, bin, A, scale: f, angle: ang, noise, space: m.space, thick: Math.max(1, m.thick) };
}

// ---------- staves ----------
export function lineY(st, k, x) {
  const P = st.pts;
  if (x <= P[0].x) return P[0].ys[k] + (P.length > 1 ? (x - P[0].x) * st.slope[k] : 0);
  if (x >= P[P.length - 1].x) return P[P.length - 1].ys[k] + (P.length > 1 ? (x - P[P.length - 1].x) * st.slope[k] : 0);
  let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P[mid].x <= x) lo = mid; else hi = mid; }
  const t = (x - P[lo].x) / (P[hi].x - P[lo].x);
  return P[lo].ys[k] + (P[hi].ys[k] - P[lo].ys[k]) * t;
}
// y of staff position p (0 = bottom line, 8 = top line), extrapolated beyond the staff
export function yOfP(st, p, x) { const y0 = lineY(st, 0, x), y4 = lineY(st, 4, x); return y4 - (p * (y4 - y0)) / 8; }
export function pOfY(st, y, x) { const y0 = lineY(st, 0, x), y4 = lineY(st, 4, x); return ((y4 - y) * 8) / (y4 - y0); }
export const spaceAt = (st, x) => (lineY(st, 4, x) - lineY(st, 0, x)) / 4;

export function findStaves(bin, S, t) {
  const { w, h, data } = bin, SW = Math.round(4 * S), step = Math.round(2 * S), groups = [];
  const maxTh = Math.max(3 * t, t + 4), proj = new Int32Array(h);
  for (let x0 = 0; x0 + SW <= w; x0 += step) {
    proj.fill(0);
    for (let y = 0; y < h; y++) { let n = 0; const r = y * w; for (let x = x0; x < x0 + SW; x++) n += data[r + x]; proj[y] = n; }
    const thr = 0.65 * SW, lines = [];
    for (let y = 0; y < h; y++) {
      if (proj[y] < thr) continue;
      let a = y, sw = 0, sy = 0, pk = 0; while (y < h && proj[y] >= thr) { sw += proj[y]; sy += proj[y] * y; pk = Math.max(pk, proj[y]); y++; }
      if (y - a <= maxTh) lines.push({ y: sy / sw, pk });
    }
    // every run of five evenly spaced lines; where there are more (ledger lines next to a
    // staff) keep the run whose lines are most complete
    const seqs = [];
    for (let i = 0; i < lines.length; i++) {
      const seq = [i];
      for (let j = i + 1; j < lines.length && seq.length < 5; j++) {
        const gap = lines[j].y - lines[seq[seq.length - 1]].y;
        if (gap > 1.3 * S) break;
        if (gap >= 0.75 * S) seq.push(j);
      }
      if (seq.length < 5) continue;
      const gaps = [1, 2, 3, 4].map((k) => lines[seq[k]].y - lines[seq[k - 1]].y);
      if (Math.max(...gaps) / Math.min(...gaps) > 1.3) continue;
      seqs.push({ seq, score: seq.reduce((a, k) => a + Math.min(lines[k].pk, SW), 0) - 0.1 * Math.abs(gaps[0] + gaps[3] - gaps[1] - gaps[2]) });
    }
    seqs.sort((a, b) => b.score - a.score);
    const used = new Set();
    for (const q of seqs) {
      if (q.seq.some((k) => used.has(k))) continue;
      q.seq.forEach((k) => used.add(k));
      groups.push({ x: x0 + SW / 2, ys: q.seq.map((k) => lines[k].y) });
    }
  }
  groups.sort((a, b) => a.x - b.x);
  // link groups across slices
  let staves = [];
  for (const g of groups) {
    let best = null, bd = 0.6 * S;
    for (const s of staves) {
      const last = s.pts[s.pts.length - 1];
      if (g.x === last.x) continue;
      const d = Math.abs(g.ys[2] - last.ys[2]);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) best.pts.push(g); else staves.push({ pts: [g] });
  }
  const span = (s) => s.pts[s.pts.length - 1].x - s.pts[0].x;
  staves = staves.filter((s) => s.pts.length >= 3 && span(s) >= 8 * S);
  for (const s of staves) {
    const P = s.pts, n = P.length;
    // end slopes from a least-squares fit over the outer few points
    s.slope = [0, 1, 2, 3, 4].map((k) => {
      const q = P.length > 6 ? P.slice(0, 3).concat(P.slice(-3)) : P;
      const mx = q.reduce((a, p) => a + p.x, 0) / q.length, my = q.reduce((a, p) => a + p.ys[k], 0) / q.length;
      let sxx = 0, sxy = 0; for (const p of q) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.ys[k] - my); }
      return sxx ? sxy / sxx : 0;
    });
    const has = (x) => {
      let c = 0;
      for (let k = 0; k < 5; k++) {
        const y = Math.round(lineY(s, k, x)); let hit = 0;
        for (let dy = -Math.ceil(t) - 1; dy <= Math.ceil(t) + 1; dy++) if (y + dy >= 0 && y + dy < h && data[(y + dy) * w + x]) hit = 1;
        c += hit;
      }
      return c >= 3;
    };
    // walk outwards along the lines, tolerating short breaks (binarisation gaps in photos)
    const tol = Math.round(1.0 * S);
    let x1 = Math.min(w - 1, Math.round(P[n - 1].x)), miss = 0, last1 = x1;
    while (x1 < w - 1 && miss <= tol) { x1++; if (has(x1)) { miss = 0; last1 = x1; } else miss++; }
    let x0 = Math.max(0, Math.round(P[0].x)), last0 = x0; miss = 0;
    while (x0 > 0 && miss <= tol) { x0--; if (has(x0)) { miss = 0; last0 = x0; } else miss++; }
    s.x0 = last0 + 1; s.x1 = last1 - 1;
  }
  // stacked ledger lines over a run of high (low) notes also look like five lines: such a
  // "staff" sits one space above (below) a real one and is shorter
  const onLedgers = (s, o) => {
    const x = s.pts[0].x, up = (lineY(o, 0, x) - s.pts[0].ys[4]) / S, dn = (s.pts[0].ys[0] - lineY(o, 4, x)) / S;
    const ok = (d) => d > -0.3 && d < 6.5 && Math.abs(d - Math.round(d)) < 0.25;
    return ok(up) || ok(dn);
  };
  staves = staves.filter((s) => !staves.some((o) => o !== s && span(o) > 1.5 * span(s) && o.pts[0].x < s.pts[s.pts.length - 1].x && s.pts[0].x < o.pts[o.pts.length - 1].x && onLedgers(s, o)));
  staves.sort((a, b) => a.pts[0].ys[0] - b.pts[0].ys[0]);
  // drop duplicates (same staff found twice, e.g. a few slices that took a beam or hairpin
  // above it as the top line): the one supported by the most slices wins
  const bySupport = staves.slice().sort((a, b) => b.pts.length - a.pts.length);
  // (staves never overlap: two whose line spans intersect are one staff found twice)
  const keep = bySupport.filter((s, i) => !bySupport.some((o, j) => j < i && Math.abs(lineY(o, 2, s.x0) - lineY(s, 2, s.x0)) < 4.5 * S && o.x0 < s.x1 && s.x0 < o.x1));
  return staves.filter((s) => keep.includes(s));
}

// Clear thin vertical runs crossing a horizontal guide y(x) on [xa, xb].
function clearThinRuns(img, xa, xb, yAt, t, orig = img.data) {
  const { w, h, data } = img, maxRun = Math.ceil(t) + 2, win = Math.ceil(t * 0.5) + 1, cleared = [];
  for (let x = Math.max(0, Math.round(xa)); x <= Math.min(w - 1, Math.round(xb)); x++) {
    const yc = Math.round(yAt(x));
    for (let y = yc - win; y <= yc + win; y++) {
      if (y < 0 || y >= h || !data[y * w + x]) continue;
      let a = y, b = y;
      while (a > 0 && data[(a - 1) * w + x]) a--;
      while (b < h - 1 && data[(b + 1) * w + x]) b++;
      if (b - a + 1 <= maxRun) { for (let yy = a; yy <= b; yy++) { data[yy * w + x] = 0; cleared.push(yy * w + x); } }
      y = b;
    }
  }
  return cleared;
}
export function removeStaves(bin, staves, t) {
  const out = { w: bin.w, h: bin.h, data: new Uint8Array(bin.data) };
  for (const st of staves) for (let k = 0; k < 5; k++) clearThinRuns(out, st.x0 - 2, st.x1 + 2, (x) => lineY(st, k, x), t, bin.data);
  return out;
}

// ---------- symbol helpers ----------
export function compMask(labels, w, c) { // binary mask of a component (or a group: c.ids)
  const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, m = new Uint8Array(cw * ch), ids = c.ids || [c.id];
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (ids.includes(labels[y * w + x])) m[(y - c.y0) * cw + x - c.x0] = 1;
  return { m, cw, ch };
}

// Vertical strokes (columns whose longest run >= minLen), grouped.
export function strokes(mask, minLen, gapMax = 0) {
  const { m, cw, ch } = mask, cols = [];
  for (let x = 0; x < cw; x++) {
    // longest run in the column, bridging gaps of up to gapMax px (strokes broken in photos)
    // ... but only runs that are mostly ink: bridging must not turn the stack of crossbars
    // between a sharp's two stems into a third "stem"
    let best = 0, bt = 0, start = -1, last = -1, ink = 0;
    for (let y = 0; y < ch; y++) {
      if (!m[y * cw + x]) continue;
      if (start < 0 || y - last - 1 > gapMax) { start = y; ink = 0; }
      last = y; ink++;
      if (last - start + 1 > best && ink >= 0.7 * (last - start + 1)) { best = last - start + 1; bt = start; }
    }
    cols.push(best >= minLen ? { x, top: bt, bot: bt + best - 1 } : null);
  }
  const out = [];
  for (let x = 0; x < cw; x++) {
    if (!cols[x]) continue;
    const s = { x0: x, x1: x, top: cols[x].top, bot: cols[x].bot };
    while (x + 1 < cw && cols[x + 1]) { x++; s.x1 = x; s.top = Math.min(s.top, cols[x].top); s.bot = Math.max(s.bot, cols[x].bot); }
    out.push(s);
  }
  return out;
}

// Accidental classifier from stroke structure. Returns { type: alter, ref: y of the pitch it marks } or null.
export function classifyAccidental(labels, w, c, S, t = 0.13 * S) {
  const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, W = cw / S, H = ch / S;
  if (W < 0.3 || W > 2.2 || H < 0.5 || H > 3.8) return null;
  const narrow = (s) => s.x1 - s.x0 + 1 <= 0.35 * S + 1;
  const mask = compMask(labels, w, c);
  let st = strokes(mask, Math.max(1.1 * S, 0.62 * ch), Math.round(0.15 * S + t)); // gaps: photo breaks + removed staff lines
  // heavy fonts and scans: a flat's stem and its bowl's right side bridge into one wide
  // "stroke"; without gap bridging the bowl's hole separates them again
  let flatOnly = false;
  // bold sharps and naturals on scans: crossbars as thick as the gap between the stems bridge
  // both stems into one wide "stroke" too. The stems are still the columns with the most ink
  // over the glyph's height; two such groups are two strokes.
  if (st.length === 1 && !narrow(st[0])) {
    const { m } = mask, cov = [];
    for (let x = 0; x < cw; x++) { let k = 0; for (let y = 0; y < ch; y++) k += m[y * cw + x]; cov.push(k / ch); }
    const top = Math.max(...cov), grp = [];
    for (let x = 0; x < cw; x++) if (cov[x] >= Math.max(0.6, 0.85 * top)) { const g = grp[grp.length - 1]; if (g && x - g.x1 <= 1) g.x1 = x; else grp.push({ x0: x, x1: x }); }
    if (grp.length === 2 && grp[1].x0 - grp[0].x1 >= 0.2 * S && grp.every(narrow)) {
      st = grp.map((g) => { let a = ch, b = -1; for (let x = g.x0; x <= g.x1; x++) for (let y = 0; y < ch; y++) if (m[y * cw + x]) { a = Math.min(a, y); b = Math.max(b, y); } return { ...g, top: a, bot: b }; });
    }
  }
  if (st.length === 1 && !narrow(st[0])) { const g = strokes(mask, 1.1 * S, 0).filter(narrow); if (g.length) { st = g; flatOnly = true; } }
  const fill = c.n / (cw * ch);
  if (st.length === 0) {
    // double sharp: small square X, centre ink, edge midpoints empty
    if (W > 0.55 && W < 1.3 && H > 0.55 && H < 1.3 && fill < 0.75) {
      const { m } = mask, at = (fx, fy) => m[Math.min(ch - 1, Math.round(fy * (ch - 1))) * cw + Math.min(cw - 1, Math.round(fx * (cw - 1)))];
      if (at(0.5, 0.5) && !at(0.5, 0.05) && !at(0.05, 0.5) && at(0.1, 0.1) && at(0.9, 0.9)) return { type: 2, ref: (c.y0 + c.y1) / 2 };
    }
    return null;
  }
  if (H < 1.6) return null;
  // ink right of the first stroke, top vs bottom half: flats are bottom-heavy (bowl)
  const right = (s) => {
    let top = 0, bot = 0, cap = 0; const { m } = mask;
    for (let y = 0; y < ch; y++) for (let x = s.x1 + 2; x < cw; x++) if (m[y * cw + x]) { if (y < ch * 0.55) top++; else bot++; if (y < ch * 0.3) cap++; }
    return { top, bot, cap };
  };
  // a flat's bowl can read as a short second stroke: only strokes near full height count
  let stv = st;
  if (st.length >= 2) { const L0 = Math.max(...st.map((s) => s.bot - s.top)); stv = st.filter((s) => s.bot - s.top >= 0.6 * L0); }
  if (stv.length === 1) {
    const s = stv[0], r = right(s);
    if (s.x0 <= 0.3 * cw && (r.bot > 1.5 * r.top || (r.cap <= 0.02 * cw * ch && r.bot > r.top)) && W >= 0.45 && W <= 1.3 && H >= 1.8 && H <= 3.4 && s.top <= 0.15 * ch)
      return { type: -1, ref: c.y1 - 0.45 * S };
    return null;
  }
  if (flatOnly) return null;
  if (stv.length === 2) {
    const [a, b] = stv, la = a.bot - a.top, lb = b.bot - b.top;
    const ov = Math.min(a.bot, b.bot) - Math.max(a.top, b.top);
    const ra = right(a);
    if (W >= 1.0 && ra.bot > 1.5 * ra.top && Math.abs(a.top - b.top) < 0.4 * S && a.x0 <= 0.2 * cw) return { type: -2, ref: c.y1 - 0.45 * S };
    if (H < 2.0 || H > 3.8) return null;
    if (b.top - a.top > 0.35 * S && b.bot - a.bot > 0.35 * S && ov < 0.85 * Math.min(la, lb)) return { type: 0, ref: (c.y0 + c.y1) / 2 };
    if (ov >= 0.7 * Math.min(la, lb) && W >= 0.55 && W <= 1.9) return { type: 1, ref: (c.y0 + c.y1) / 2 };
  }
  return null;
}

// Clef from a tall component near the start of the staff.
function classifyClef(c, st, labels, w) {
  const xm = (c.x0 + c.x1) / 2, y0 = lineY(st, 0, xm), y4 = lineY(st, 4, xm), s = (y4 - y0) / 4;
  const top = (y0 - c.y0) / s, bot = (c.y1 - y4) / s, H = (c.y1 - c.y0 + 1) / s;
  if (H >= 5 && top >= 0.6 && bot >= 0.5) return 'treble';
  if (H >= 2.2 && H < 5 && top > -0.7 && top < 1.4) {
    // C clefs stand on a solid bar as tall as the clef; the F clef is a curl
    const st2 = strokes(compMask(labels, w, c), 0.8 * (c.y1 - c.y0 + 1));
    if (st2.length && H >= 3.4) return top >= 0.6 && bot < -0.4 ? 'tenor' : 'alto';
    if (bot < -0.2 && H < 4.2) return 'bass';
  }
  return H >= 5 ? 'treble' : null;
}

// ---------- full analysis ----------
export function analyze(norm, opts = {}) {
  const { bin } = norm, { w, h } = bin;
  const S0 = norm.space, t = norm.thick;
  const staves = findStaves(bin, S0, t);
  if (!staves.length) throw new Error('No staves detected');
  const sym0 = removeStaves(bin, staves, t);
  const bandOf = (st, i) => {
    const prev = staves[i - 1], next = staves[i + 1], xm = (st.x0 + st.x1) / 2;
    const top = prev ? (lineY(prev, 4, xm) + lineY(st, 0, xm)) / 2 : lineY(st, 0, xm) - 8 * S0;
    const bot = next ? (lineY(st, 4, xm) + lineY(next, 0, xm)) / 2 : lineY(st, 4, xm) + 8 * S0;
    return [Math.max(0, top), Math.min(h - 1, bot)];
  };
  staves.forEach((st, i) => { st.index = i; st.band = bandOf(st, i); st.notes = []; st.bars = []; });
  const staffAt = (x, y) => staves.find((st) => x >= st.x0 - S0 && x <= st.x1 + S0 && y >= st.band[0] && y < st.band[1]);

  // components before ledger removal (for clefs). Scanned systems often have the clefs touching
  // the system bracket or the barline at the start of the staff, making clef + bracket one
  // component spanning the whole system. Cut long vertical runs in the clef zone first: runs
  // longer than any clef anywhere in it, and long ones at the very start of the staff.
  // Only components too big to be a clef are cut, so a clef standing alone (a C clef's bars
  // also span the staff) is never touched.
  const clefImg = { w, h, data: new Uint8Array(sym0.data) };
  const c0 = IP.components(sym0), big = new Uint8Array(c0.comps.length);
  for (const c of c0.comps) if (c && (c.y1 - c.y0 > 8.5 * S0 || c.x1 - c.x0 > 4 * S0)) big[c.id] = 1;
  for (const st of staves) {
    const [b0, b1] = st.band;
    for (let x = Math.max(0, Math.round(st.x0 - 3 * S0)); x <= Math.min(w - 1, Math.round(st.x0 + 4.5 * S0)); x++) {
      const lim = x < st.x0 + 1.5 * S0 ? 3.5 * S0 : 9 * S0; // (the opening barline spans 4 spaces)
      for (let y = Math.max(0, Math.round(b0 - 6 * S0)); y < Math.min(h, Math.round(b1 + 6 * S0)); y++) {
        if (!clefImg.data[y * w + x] || !big[c0.labels[y * w + x]]) continue;
        let e = y; while (e < h && sym0.data[e * w + x]) e++;
        if (e - y > lim) for (let yy = y; yy < e; yy++) clefImg.data[yy * w + x] = 0;
        y = e;
      }
    }
  }
  let cc = IP.components(clefImg);
  const used = new Set();
  for (const st of staves) {
    // (system brackets and braces are taller than any clef, or a thin line)
    const cands = cc.comps.filter((c) => c && c.x0 < st.x0 + 4.5 * S0 && c.x1 > st.x0 && c.y1 - c.y0 > 2.2 * S0 && c.y1 - c.y0 < 8.5 * S0 &&
      (c.x1 - c.x0 >= 0.8 * S0 || (Math.abs(c.y0 - lineY(st, 0, c.cx)) < 0.6 * S0 && Math.abs(c.y1 - lineY(st, 4, c.cx)) < 0.6 * S0)) && c.cy > st.band[0] && c.cy < st.band[1] && c.x1 - c.x0 < 4 * S0).sort((a, b) => a.x0 - b.x0);
    st.clef = { type: opts.clef || 'treble', detected: null, box: null };
    for (const c of cands) {
      const type = classifyClef(c, st, cc.labels, w);
      if (!type) continue;
      const box = [c.x0, c.y0, c.x1, c.y1], S = spaceAt(st, c.cx);
      // C clefs come in pieces (thick bar, thin bar, the two curls); F clefs have two dots
      const inBox = new Set([c.id]);
      for (let grew = true; grew;) { // repeat: pieces are found left to right in any id order
        grew = false;
        for (const q of cc.comps) {
          if (!q || inBox.has(q.id) || q.x0 < box[0] || q.x0 - box[2] > 1.0 * S || q.y1 < box[1] || q.y0 > box[3]) continue;
          const qh = q.y1 - q.y0 + 1, qw = q.x1 - q.x0 + 1;
          // a C clef's bars span the staff (~4 spaces); a sharp or natural right after it is
          // ~3 spaces tall and must stay out, or the key signature loses its first glyph
          const span = lineY(st, 4, q.cx) - lineY(st, 0, q.cx);
          if (((type === 'alto' || type === 'tenor') && qh >= 0.85 * span && q.y0 <= lineY(st, 0, q.cx) + 0.3 * S && q.y1 >= lineY(st, 4, q.cx) - 0.3 * S && q.x1 - box[0] < 5 * S) || (type === 'bass' && qh <= 0.8 * S && qw <= 0.8 * S)) {
            box[0] = Math.min(box[0], q.x0); box[1] = Math.min(box[1], q.y0); box[2] = Math.max(box[2], q.x1); box[3] = Math.max(box[3], q.y1);
            inBox.add(q.id); grew = true;
          }
        }
      }
      if (type === 'alto' || type === 'tenor') { // the two curls right of the bars
        const ya = lineY(st, 0, c.cx), yb = lineY(st, 4, c.cx);
        for (const q of cc.comps) {
          if (!q || inBox.has(q.id) || q.x0 < box[2] - 0.2 * S || q.x1 > box[0] + 3.2 * S || q.y0 < ya - 0.5 * S || q.y1 > yb + 0.5 * S) continue;
          if (q.y1 - q.y0 < 0.5 * S || classifyAccidental(cc.labels, w, q, S, t)) continue;
          box[2] = Math.max(box[2], q.x1); inBox.add(q.id);
        }
      }
      st.clef = { type: opts.clef || type, detected: type, box }; break;
    }
  }

  // ---- filled heads: opening removes stems, beams, lines, thin strokes ----
  const k = Math.max(3, Math.round(0.55 * S0));
  const opened = IP.open(sym0, k);
  const oc = IP.components(opened);
  const heads = [];
  for (const b of oc.comps) {
    if (!b) continue;
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const st = staffAt(b.cx, b.cy); if (!st) continue;
    const S = spaceAt(st, b.cx);
    if (bw < 0.75 * S || bh < 0.6 * S || bw > 3 * S || bh > 6.5 * S) continue;
    if (st.clef.box && b.cx < st.clef.box[2] + 0.3 * S && b.cx > st.clef.box[0] - 0.3 * S) continue;
    if (bw > 2.2 * S && bh < 1.5 * S) continue; // beam-ish slab
    // columns: a blob wider than ~1.8 heads is a chord with seconds, analyse halves
    const cols = bw > 1.85 * S ? [[b.x0, Math.round((b.x0 + b.x1) / 2)], [Math.round((b.x0 + b.x1) / 2) + 1, b.x1]] : [[b.x0, b.x1]];
    for (const [cx0, cx1] of cols) {
      const xm = (cx0 + cx1) / 2;
      const pTop = Math.ceil(pOfY(st, b.y1, xm) - 0.3), pBot = Math.floor(pOfY(st, b.y0, xm) + 0.3);
      const sc = [];
      for (let p = pTop; p <= pBot; p++) {
        const yc = yOfP(st, p, xm); let n = 0, tot = 0;
        for (let y = Math.round(yc - 0.3 * S); y <= Math.round(yc + 0.3 * S); y++) for (let x = cx0; x <= cx1; x++) { tot++; if (y >= 0 && y < h && oc.labels[y * w + x] === b.id) n++; }
        sc.push({ p, s: n / tot });
      }
      sc.sort((a, b2) => b2.s - a.s);
      const acc = [];
      for (const q of sc) { if (q.s < 0.55) break; if (acc.some((a) => Math.abs(a.p - q.p) < 2)) continue; acc.push(q); }
      for (const q of acc) {
        const yc = yOfP(st, q.p, xm);
        // row extent of the head at its centre
        let l = Math.round(xm), r = l; const yy = Math.round(yc);
        while (l > cx0 && oc.labels[yy * w + l - 1] === b.id) l--;
        while (r < cx1 && oc.labels[yy * w + r + 1] === b.id) r++;
        if (r - l + 1 < 0.6 * S) continue;
        // a head is about a space tall; a beam slab that survives the opening is ~half that
        const xc = Math.round((l + r) / 2); let u = yy, dn = yy;
        while (u > 0 && oc.labels[(u - 1) * w + xc] === b.id) u--;
        while (dn < h - 1 && oc.labels[(dn + 1) * w + xc] === b.id) dn++;
        if (dn - u + 1 < 0.72 * S) continue;
        heads.push({ st, p: q.p, x: (l + r) / 2, y: yc, box: [l - 1, yc - 0.5 * S, r + 1, yc + 0.5 * S], kind: 'black' });
      }
    }
  }

  // ---- small filled heads (grace and cue notes): a finer opening keeps heads the main one
  // erases; only blobs clearly smaller than a head, at a staff position, away from other heads,
  // are kept here (they still need a stem, checked below like every head)
  const k2 = Math.max(2, Math.round(0.32 * S0)), opened2 = IP.open(sym0, k2), oc2 = IP.components(opened2);
  const medW = new Map(); for (const st of staves) { const ws = heads.filter((o) => o.st === st).map((o) => o.box[2] - o.box[0]).sort((a, b) => a - b); medW.set(st, ws.length ? ws[ws.length >> 1] : 1.3 * S0); }
  for (const b of oc2.comps) {
    if (!b) continue;
    const st = staffAt(b.cx, b.cy); if (!st) continue;
    const S = spaceAt(st, b.cx), bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    // a grace head is about two thirds the size of the staff's heads (flat bowls, flags and dots
    // are smaller or another shape), and a full-size note follows it closely
    const mw = medW.get(st) + 2;
    if (bw < 0.5 * mw || bw > 0.86 * mw || bh < 0.4 * S || bh > 1.0 * S || b.n / (bw * bh) < 0.62) continue;
    if (!heads.some((o) => o.st === st && !o.small && o.x - b.cx > 0.7 * S && o.x - b.cx < 3.2 * S && Math.abs(o.y - b.cy) < 4.5 * S)) continue;
    if (st.clef.box && b.cx < st.clef.box[2] + 0.9 * S) continue;
    if (heads.some((o) => o.st === st && Math.abs(o.x - b.cx) < 0.9 * S && Math.abs(o.y - b.cy) < 0.9 * S)) continue;
    const p = Math.round(pOfY(st, b.cy, b.cx));
    heads.push({ st, p, x: b.cx, y: b.cy, box: [b.x0 - 1, b.cy - 0.4 * S, b.x1 + 1, b.cy + 0.4 * S], kind: 'black', small: true });
  }

  // ---- hollow heads: enclosed holes with a thick ring, on the binary with staff lines ----
  const wc = IP.components(bin, 0);
  const holes = [];
  for (const c of wc.comps) {
    if (!c || c.x0 === 0 || c.y0 === 0 || c.x1 === w - 1 || c.y1 === h - 1) continue;
    const hw = c.x1 - c.x0 + 1, hh = c.y1 - c.y0 + 1;
    if (hw > 1.2 * S0 || hh > 0.9 * S0 || hw < 0.15 * S0 || c.n < 3) continue;
    holes.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, n: c.n });
  }
  // merge hole halves split by a staff or ledger line
  holes.sort((a, b) => a.y0 - b.y0);
  for (let i = 0; i < holes.length; i++) {
    const a = holes[i]; if (!a) continue;
    for (let j = i + 1; j < holes.length; j++) {
      const b = holes[j]; if (!b) continue;
      if (b.y0 - a.y1 > t + 3) break;
      const ov = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      if (b.y0 > a.y1 && ov > -0.25 * S0) { // tilted ovals: the halves need not overlap
        a.x0 = Math.min(a.x0, b.x0); a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1); a.n += b.n; a.split = true; holes[j] = null;
      }
    }
  }
  const black = (x, y) => x >= 0 && y >= 0 && x < w && y < h && bin.data[y * w + x] === 1;
  const runFrom = (x, y, dx, dy, max) => { let n = 0; while (n < max && black(x + dx * (n + 1), y + dy * (n + 1))) n++; return n; };
  for (const hl of holes) {
    if (!hl) continue;
    const hw = hl.x1 - hl.x0 + 1, hh = hl.y1 - hl.y0 + 1;
    if (hh > 1.05 * S0 || hw > 1.3 * S0) continue; // (tilted holes of some fonts are wide)
    if (hl.n / (hw * hh) > 0.86 && !hl.split) continue; // rectangular pocket between stems and lines, not an oval
    const cx = Math.round((hl.x0 + hl.x1) / 2), cy = Math.round((hl.y0 + hl.y1) / 2);
    const st = staffAt(cx, cy); if (!st) continue;
    const S = spaceAt(st, cx);
    if (st.clef.box && cx <= st.clef.box[2] + 0.9 * S) continue; // (the curls of a C clef, the gap to the key)
    // a row inside the hole (the centre row may be a staff line through it)
    let ry = cy; if (black(cx, ry)) { for (let d = 1; d < hh; d++) { if (!black(cx, cy - d)) { ry = cy - d; break; } if (!black(cx, cy + d)) { ry = cy + d; break; } } }
    let lx = cx; while (lx > hl.x0 && !black(lx - 1, ry)) lx--;
    let rx = cx; while (rx < hl.x1 && !black(rx + 1, ry)) rx++;
    const tl = runFrom(lx, ry, -1, 0, S), tr = runFrom(rx, ry, 1, 0, S);
    let tu = runFrom(cx, hl.y0, 0, -1, S), td = runFrom(cx, hl.y1, 0, 1, S);
    // a filled head of the other voice touching the ring above or below (two voices a third apart
    // in one column): take the ring's thickness from the free side
    const headAt = (y) => heads.some((o) => o.kind === 'black' && o.st === st && Math.abs(o.x - cx) < 0.8 * S && Math.abs(o.y - y) < 0.45 * S);
    if (tu > 0.55 * S && td <= 0.55 * S && headAt(hl.y0 - 0.6 * S)) tu = td; else if (td > 0.55 * S && tu <= 0.55 * S && headAt(hl.y1 + 0.6 * S)) td = tu;
    const ow = (rx - lx + 1) + tl + tr, oh = hh + tu + td;
    if (tl < 0.08 * S || tr < 0.08 * S || tl > 0.7 * S || tr > 0.7 * S) continue;
    if (ow < 0.95 * S || ow > 2.3 * S || oh < 0.65 * S || oh > 1.45 * S) continue;
    if (tu > 0.55 * S || td > 0.55 * S) continue;
    const x0 = lx - tl, x1 = rx + tr;
    // flats: the stem rises from the left side of the bowl
    const up = runFrom(x0 + 1, hl.y0, 0, -1, 3 * S), upIn = runFrom(x0 + Math.round(0.15 * S), hl.y0, 0, -1, 3 * S);
    if (Math.max(up, upIn) > 1.3 * S && runFrom(x1 - 1, hl.y0, 0, -1, 3 * S) < 0.8 * S && ow < 1.25 * S) continue;
    const ym = (hl.y0 - tu + hl.y1 + td) / 2, p = Math.round(pOfY(st, ym, cx));
    heads.push({ st, p, x: (x0 + x1) / 2, y: yOfP(st, p, cx), box: [x0, ym - oh / 2, x1, ym + oh / 2], kind: 'hollow' });
  }
  // dedupe
  heads.sort((a, b) => (a.kind === 'hollow' ? 0 : 1) - (b.kind === 'hollow' ? 0 : 1));
  const uniq = [];
  for (const hd of heads) if (!uniq.some((u) => u.st === hd.st && Math.abs(u.x - hd.x) < 0.6 * S0 && Math.abs(u.p - hd.p) < 1)) uniq.push(hd);

  // ---- stems ----
  const maxGap = Math.max(1, Math.round(0.2 * S0));
  const vrun = (x, y, dir) => { // vertical ink from near y in direction dir on sym0, tolerating small gaps and a 1px wobble
    let yy = Math.round(y), gap = 0, last = yy;
    for (; yy >= 0 && yy < h; yy += dir) { if (sym0.data[yy * w + x] || (x > 0 && sym0.data[yy * w + x - 1]) || (x < w - 1 && sym0.data[yy * w + x + 1])) { last = yy; gap = 0; } else if (++gap > maxGap) break; }
    return Math.abs(last - y);
  };
  for (const hd of uniq) {
    const S = spaceAt(hd.st, hd.x); let best = null;
    const tryCol = (x, dir) => {
      if (x < 0 || x >= w) return;
      let y = -1;
      for (let d = 0; d <= Math.round(0.4 * S) && y < 0; d++) for (const sg of [1, -1]) {
        const yy = Math.round(hd.y + sg * d);
        if (yy >= 0 && yy < h && sym0.data[yy * w + x]) { y = yy; break; }
      }
      if (y < 0) return;
      const tip = y + dir * vrun(x, y, dir), len = (tip - hd.y) * dir;
      if (!bestOf[dir] || len > bestOf[dir].len) bestOf[dir] = { x, len, dir, tip };
    };
    const bestOf = {};
    for (let x = Math.round(hd.box[2] - 0.35 * S); x <= Math.round(hd.box[2] + 0.2 * S); x++) tryCol(x, -1);
    for (let x = Math.round(hd.box[0] - 0.2 * S); x <= Math.round(hd.box[0] + 0.35 * S); x++) tryCol(x, 1);
    // A stem up from the right and one down from the left: two voices meet at this head's column.
    // The stem that passes through another head on its way belongs to that head (a chord's stem
    // runs through all its heads, but then there is no second stem the other way).
    const through = (sm) => uniq.some((o) => o !== hd && o.st === hd.st && Math.abs(o.x - hd.x) < 0.9 * S && (o.y - hd.y) * sm.dir > 0.6 * S && (o.y - hd.y) * sm.dir < sm.len - 0.5 * S);
    const up = bestOf[-1], dn = bestOf[1];
    best = up && (!dn || up.len >= dn.len) ? up : dn;
    if (up && dn && up.len >= 2.5 * S && dn.len >= 2.5 * S && through(best) && !through(best === up ? dn : up)) best = best === up ? dn : up;
    hd.stem = best && best.len >= (hd.small ? 1.5 : 2.0) * S ? best : null;
    if (hd.stem) { // stem is thin: neighbours 0.4S away must not run as long
      const off = Math.round(0.45 * S) * (hd.stem.dir < 0 ? -1 : 1), x2 = hd.stem.x + off;
      if (x2 >= 0 && x2 < w && vrun(x2, hd.y + hd.stem.dir * 0.6 * S, hd.stem.dir) > 0.8 * hd.stem.len) hd.stem = null;
    }
  }
  // a head beyond the staff stands on ledger lines: the first one must be under it
  // (rejects letters of tempo marks, lyrics and dynamics that look like noteheads)
  const ledgerUnder = (hd) => {
    if (hd.p > -3 && hd.p < 11) return true;
    // every ledger between the staff and the head (a dynamic's bowl below the staff has none)
    const S = spaceAt(hd.st, hd.x), qs = [];
    if (hd.p >= 11) for (let q = 10; q <= hd.p - 1; q += 2) qs.push(q);
    else for (let q = -2; q >= hd.p + 1; q -= 2) qs.push(q);
    return qs.every((q) => {
      const y = Math.round(yOfP(hd.st, q, hd.x));
      for (let dy = -Math.ceil(t) - 1; dy <= Math.ceil(t) + 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        let run = 0, best = 0;
        for (let x = Math.round(hd.box[0] - 0.6 * S); x <= Math.round(hd.box[2] + 0.6 * S); x++) { if (x >= 0 && x < w && bin.data[yy * w + x]) { run++; best = Math.max(best, run); } else run = 0; }
        if (best >= 0.9 * (hd.box[2] - hd.box[0])) return true;
      }
      return false;
    });
  };
  // a stem going up from the left of a "head" is a flat (its bowl survives the opening in
  // bold engravings); real up-stems stand on the right
  const flatLike = (hd) => hd.kind === 'black' && hd.stem && hd.stem.dir < 0 && hd.stem.x < (hd.box[0] + hd.box[2]) / 2;
  let notes = uniq.filter((hd) => (hd.kind === 'hollow' || hd.stem) && ledgerUnder(hd) && !flatLike(hd));
  // a stem carries one duration: a "half note" sharing its stem with black heads is the
  // loop of a curly flag
  // loop of a curly flag: a "half note" sharing a stem with black heads, or threaded on one
  notes = notes.filter((n) => n.kind === 'black' || !notes.some((o) => o.kind === 'black' && o.stem && o.st === n.st &&
    ((n.stem && Math.abs(o.stem.x - n.stem.x) <= 0.35 * S0) ||
     (o.stem.x >= n.box[0] - 0.45 * S0 && o.stem.x <= n.box[2] + 0.45 * S0 && n.y > Math.min(o.y, o.stem.tip) + 0.5 * S0 && n.y < Math.max(o.y, o.stem.tip) + 0.3 * S0))));
  for (const n of notes) n.kind = n.kind === 'black' ? 'black' : n.stem ? 'half' : 'whole';

  // ---- ledger lines around heads beyond the staff, then final components ----
  const sym = { w, h, data: new Uint8Array(sym0.data) };
  const ledgerPx = [];
  for (const n of notes) {
    const S = spaceAt(n.st, n.x), qs = [];
    if (n.p <= -2) for (let q = -2; q >= n.p - 1; q -= 2) qs.push(q);
    if (n.p >= 10) for (let q = 10; q <= n.p + 1; q += 2) qs.push(q);
    n.ledgers = qs;
    for (const q of qs) ledgerPx.push(...clearThinRuns(sym, n.box[0] - 1.8 * S, n.box[2] + 0.7 * S, (x) => yOfP(n.st, q, x), t));
  }
  cc = IP.components(sym);
  const L = cc.labels;
  const labelNear = (x, y, r) => {
    for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && L[yy * w + xx]) return L[yy * w + xx];
    }
    return 0;
  };
  for (const n of notes) n.comp = labelNear(n.x, n.y, Math.round(0.4 * S0)) || labelNear(n.box[2], n.y, 2);
  // Text: letters stand in rows of similar-sized components with tight gaps (words of a tempo
  // mark, an expression, lyrics, a dynamic like "pp"). Notes are rarely like that: a stemmed
  // note is a tall component, beamed notes are one component, whole notes stand far apart. A
  // note whose component is in such a row ("o", "p", "d" read as whole or half notes) is text.
  // (pieces of a head split by staff removal count as the note)
  const noteParts = new Set(notes.map((n) => n.comp));
  for (const q of cc.comps) if (q && notes.some((n) => q.cx >= n.box[0] - 2 && q.cx <= n.box[2] + 2 && q.cy >= n.box[1] - 2 && q.cy <= n.box[3] + 2)) noteParts.add(q.id);
  const textIds = findText(cc.comps, S0, noteParts, staves);
  notes = notes.filter((n) => !textIds.has(n.comp));
  // whole notes / time-signature digits: a stemless ring must be its own small component
  notes = notes.filter((n) => {
    if (n.kind !== 'whole') return true;
    const c = cc.comps[n.comp]; if (!c) return false;
    const S = spaceAt(n.st, n.x);
    return c.y1 - c.y0 < 1.7 * S && c.x1 - c.x0 < 3 * S && n.box[2] - n.box[0] >= 1.15 * S; // (a whole note is wide; the bowl of a dynamic p is not)
  });
  // holes inside sharps, naturals and double sharps pass the ring test: drop those
  notes = notes.filter((n) => {
    const c = cc.comps[n.comp]; if (!c) return n.kind === 'black';
    const S = spaceAt(n.st, n.x), a = classifyAccidental(L, w, c, S, t);
    // also filled: a sharp's crossings and a flat's bowl survive the opening in heavy scans.
    // (A real note never classifies as a flat: its stem is on the right going up, or on the
    // left going down with the head at the top, where a flat's bowl is at the bottom.)
    // (a grace note's stem, flag and slash can pass for an accidental; accidentals are taller)
    if (a && !(n.small && c.y1 - c.y0 + 1 < 2.4 * S)) return false;
    if (n.kind === 'black') return true;
    // A hole's nearest ink can be another component: an accidental-shaped component around the
    // hole, or one that is the head's "stem" (a ring closed by a sharp's stroke, a staff line
    // and the next symbol), makes it part of that accidental, not a note.
    for (const q of cc.comps) {
      if (!q || q === c || q.y0 > n.y || q.y1 < n.y) continue;
      const inHole = q.x0 <= n.x && q.x1 >= n.x, stemOf = n.stem && n.stem.x >= q.x0 && n.stem.x <= q.x1;
      if (!inHole && !stemOf) continue;
      // (a flat too: its bowl is a ring with a stem rising from its left; a real half note's
      // stem rises from the right, or falls from the left with the head on top)
      const qa = classifyAccidental(L, w, q, S, t);
      if (qa) return false;
    }
    // time-signature digits: two spaces tall, hanging from the top line or standing on the bottom one
    const ch = c.y1 - c.y0 + 1, ya = lineY(n.st, 0, n.x), yb = lineY(n.st, 4, n.x);
    if (ch > 1.6 * S && ch < 2.4 * S && (Math.abs(c.y0 - ya) < 0.35 * S || Math.abs(c.y1 - yb) < 0.35 * S) && c.x1 - c.x0 > 1.0 * S) return false;
    return true;
  });
  // a "whole note" right in front of another head at its height is an accidental (a double
  // sharp's hole, a natural's box)
  notes = notes.filter((n) => n.kind !== 'whole' || !notes.some((o) => o !== n && o.st === n.st && Math.abs(o.p - n.p) <= 1 &&
    o.box[0] - n.box[2] > -0.2 * S0 && o.box[0] - n.box[2] < 1.0 * S0));
  const headComps = new Set(notes.map((n) => n.comp));

  // ---- other symbols per staff ----
  // Staff removal cuts a flat where its thin bowl joins the stem on a line: re-pair a thin
  // tall stroke with the bowl fragment hugging its right side (lower part).
  const groups = new Map();
  for (const c of cc.comps) if (c && !headComps.has(c.id)) groups.set(c.id, { ...c, ids: [c.id] });
  const isStroke = (g) => g.x1 - g.x0 + 1 <= 0.45 * S0 && g.y1 - g.y0 + 1 >= 1.5 * S0;
  // a half of a sharp or natural whose crossbars were erased with thick staff lines keeps
  // stubs of them, so it can be most of a space wide
  const isHalf = (g) => g.x1 - g.x0 + 1 <= 0.95 * S0 && g.y1 - g.y0 + 1 >= 1.8 * S0 && g.y1 - g.y0 + 1 <= 3.8 * S0;
  for (const g of groups.values()) {
    if (!(isStroke(g) || isHalf(g)) || g.merged) continue;
    for (const q of groups.values()) {
      if (q === g || q.merged || q.x0 - g.x1 < -1 || q.x0 - g.x1 > 0.6 * S0 || q.x1 - q.x0 > 1.4 * S0) continue;
      const ov = Math.min(g.y1, q.y1) - Math.max(g.y0, q.y0);
      const bowl = isStroke(g) && q.y0 >= g.y0 + 0.4 * S0 && q.y1 <= g.y1 + 0.3 * S0 && q.x0 - g.x1 <= 0.5 * S0; // flat: bowl fragment
      const pair = (isStroke(q) || isHalf(q)) && ov > 0.6 * Math.min(g.y1 - g.y0, q.y1 - q.y0) && q.x1 - g.x0 <= 1.9 * S0; // sharp / natural halves
      if (!bowl && !pair) continue;
      const m = { ...g, ids: [...g.ids, ...q.ids], x1: Math.max(g.x1, q.x1), y0: Math.min(g.y0, q.y0), y1: Math.max(g.y1, q.y1), n: g.n + q.n, cx: (g.cx * g.n + q.cx * q.n) / (g.n + q.n), cy: (g.cy * g.n + q.cy * q.n) / (g.n + q.n) };
      const a = classifyAccidental(L, w, m, S0, t);
      if (a && (bowl ? a.type < 0 : a.type >= 0)) { Object.assign(g, m); q.merged = true; break; }
    }
  }
  for (const [k, g] of groups) if (g.merged) groups.delete(k);
  // a double sharp cut through its middle by a staff line comes apart into two small halves side
  // by side; the classifier reads the pair
  if (opts.glyphnet !== false) {
    const small = [...groups.values()].filter((g) => g.x1 - g.x0 + 1 <= 0.7 * S0 && g.y1 - g.y0 + 1 <= 1.4 * S0 && g.y1 - g.y0 + 1 >= 0.5 * S0);
    for (const g of small) for (const q of small) {
      if (g === q || g.merged || q.merged || q.x0 <= g.x1 || q.x0 - g.x1 > 0.35 * S0 || Math.abs(q.cy - g.cy) > 0.3 * S0) continue;
      const box = [g.x0, Math.min(g.y0, q.y0), q.x1, Math.max(g.y1, q.y1)];
      if (box[2] - box[0] + 1 > 1.4 * S0) continue;
      const pr = classify(bin, box);
      if (pr.dsharp < 0.9) continue;
      Object.assign(g, { ids: [...g.ids, ...q.ids], x1: box[2], y0: box[1], y1: box[3], n: g.n + q.n, cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, pairDsharp: true }); q.merged = true;
    }
    for (const [k, g] of groups) if (g.merged) groups.delete(k);
  }
  // Competing readings of an accidental-sized symbol: the stroke rules (classifyAccidental) and
  // the learned classifier (glyphnet.js) each give evidence; the reading with the most combined
  // support wins. The rules carry a fixed prior weight, so the classifier overrides them only
  // when it is confident (a double sharp the rules miss, a sharp cut up in a phone photo).
  // A narrow piece the rules could not pair with its neighbour is also tried as a pair.
  const ACC_OF = { sharp: 1, flat: -1, natural: 0, dsharp: 2, dflat: -2 }, NAME_OF = { 1: 'sharp', '-1': 'flat', 0: 'natural', 2: 'dsharp', '-2': 'dflat' };
  const RULE_W = Math.log(opts.ruleWeight ?? 8), useNet = opts.glyphnet !== false;
  const readAccidental = (c, S, st) => {
    const rule = classifyAccidental(L, w, c, S, t);
    const W = (c.x1 - c.x0 + 1) / S, H = (c.y1 - c.y0 + 1) / S;
    if (!useNet || W < 0.3 || W > 2.2 || H < (c.pairDsharp ? 0.5 : 0.8) || H > 3.8) return rule;
    const pr = classify(bin, [c.x0, c.y0, c.x1, c.y1]);
    const pNone = Math.max(1e-4, 1 - Object.keys(ACC_OF).reduce((q, k) => q + pr[k], 0));
    // (the classifier may add or retype an accidental but not delete one the rules found: on real
    // scans unlike its synthetic training pages it is less sure of what is not a symbol)
    let best = { type: null, s: rule ? -Infinity : Math.log(pNone) + RULE_W };
    for (const [k, v] of Object.entries(ACC_OF)) { const agree = rule && rule.type === v; if (!agree && pr[k] < 0.9) continue; const sc = Math.log(pr[k] + 1e-4) + (agree ? RULE_W : 0); if (sc > best.s) best = { type: v, s: sc }; }
    c.readings = { rule: rule ? NAME_OF[rule.type] : null, net: Object.entries(pr).sort((x, y) => y[1] - x[1])[0], chose: best.type == null ? null : NAME_OF[best.type] };
    if (best.type == null) return null;
    if (rule && rule.type === best.type) return rule;
    const ref = best.type === -1 || best.type === -2 ? c.y1 - 0.45 * S : (c.y0 + c.y1) / 2;
    return { type: best.type, ref, net: true };
  };
  const accs = [], dots = [];
  for (const c of groups.values()) {
    if (!c || headComps.has(c.id)) continue;
    const st = staffAt(c.cx, c.cy); if (!st) continue;
    const S = spaceAt(st, c.cx), cw = c.x1 - c.x0 + 1, chh = c.y1 - c.y0 + 1;
    if (st.clef.box && c.x1 <= st.clef.box[2] + 0.2 * S) continue;
    const ya = lineY(st, 0, c.cx), yb = lineY(st, 4, c.cx);
    // (a stem cut off its hollow head by staff removal is not a barline)
    const stemOf = notes.some((n) => n.stem && n.st === st && Math.abs(n.stem.x - c.cx) <= 0.4 * S && Math.min(n.y, n.stem.tip) <= c.y0 + 0.5 * S && Math.max(n.y, n.stem.tip) >= c.y1 - 1.0 * S);
    if (!stemOf && cw <= 0.75 * S && c.y0 <= ya + 0.4 * S && c.y1 >= yb - 0.4 * S && (c.n / chh <= Math.max(0.35 * S, 2.5 * t) || (c.n / (cw * chh) > 0.7 && c.n / chh <= 0.65 * S)) && c.n / chh >= 0.6 * t && // (or a thick, solid final / repeat bar)

      (chh <= (yb - ya) + 1.2 * S || staves.some((o) => o !== st && (c.y1 >= lineY(o, 0, c.cx) || c.y0 <= lineY(o, 4, c.cx)) && Math.abs(lineY(o, 2, c.cx) - lineY(st, 2, c.cx)) < 20 * S))) { // thin; may span a whole system
      for (const o of staves) { // a system barline counts for every staff it crosses
        if (c.cx < o.x0 - S || c.cx > o.x1 + S) continue;
        if (c.y0 <= lineY(o, 0, c.cx) + 0.4 * S && c.y1 >= lineY(o, 4, c.cx) - 0.4 * S) o.bars.push({ x: c.cx, x0: c.x0, x1: c.x1, ids: c.ids });
      }
      continue;
    }
    const a = readAccidental(c, S, st);
    if (a) { accs.push({ st, c, ...a, p: Math.round(pOfY(st, a.ref, c.cx)) }); continue; }
    if (cw >= 0.2 * S && cw <= 0.75 * S && chh >= 0.2 * S && chh <= 0.75 * S && c.n / (cw * chh) > 0.5 && cw / chh > 0.55 && cw / chh < 1.8) {
      // a dot stands alone; pieces of a tie or slur cut up by staff-line removal have neighbours
      // just across the removed line
      const r = Math.ceil(t) + 2; let near = 0;
      for (let y = Math.max(0, c.y0 - r); y <= Math.min(h - 1, c.y1 + r); y++) for (let x = Math.max(0, c.x0 - r); x <= Math.min(w - 1, c.x1 + r); x++) {
        const l = L[y * w + x]; if (l && !c.ids.includes(l)) near++;
      }
      const onLine = [0, 1, 2, 3, 4].some((k) => { const yl = lineY(st, k, c.cx); return c.y0 - yl <= t + 2 && yl - c.y1 <= t + 2; });
      if (near < 3 || !onLine) dots.push({ st, c });
    }
  }
  // Barlines touched by a slur or a hairpin are part of a bigger component and fail the shape
  // test above: find them as columns of ink covering the whole staff inside such components,
  // thin, and not the stem of a note.
  for (const st of staves) {
    const S = spaceAt(st, (st.x0 + st.x1) / 2), x0 = Math.round((st.clef.box ? st.clef.box[2] : st.x0) + S);
    let run = 0;
    for (let x = x0; x <= st.x1 + 1; x++) {
      const ya = Math.round(lineY(st, 0, x)), yb = Math.round(lineY(st, 4, x));
      let miss = 0;
      for (let y = ya + 1; miss <= 2 && y < yb; y++) if (!L[y * w + x]) miss++;
      const full = x <= st.x1 && miss <= 2;
      if (full) { run++; continue; }
      if (run && run <= 0.45 * S) {
        const xb = x - run, xc = (xb + x - 1) / 2;
        let id = 0; for (let y = ya + 1; !id && y < yb; y++) id = L[y * w + Math.round(xc)];
        const c = cc.comps[id];
        const big = c && !headComps.has(id) && (c.x1 - c.x0 > 0.75 * S || c.y1 - c.y0 > (yb - ya) + 2.5 * S);
        const stem = notes.some((n) => n.stem && Math.abs(n.stem.x - xc) <= 0.5 * S && n.st === st);
        const near = st.bars.some((b) => Math.abs(b.x - xc) < 1.5 * S);
        // nothing pokes out sideways along most of it (a slur crossing it touches it at one place)
        let side = 0; for (let y = ya; y <= yb; y++) if (L[y * w + xb - 2] === id || L[y * w + x + 1] === id) side++;
        if (big && !stem && !near && side < 0.35 * (yb - ya)) st.bars.push({ x: xc, x0: xb, x1: x - 1, ids: [], merged: true });
      }
      run = 0;
    }
  }
  for (const st of staves) {
    st.bars.sort((a, b) => a.x - b.x);
    // double / final bar = one, marked (a piece or section may end on a short bar)
    st.bars = st.bars.filter((b, i, arr) => { if (i > 0 && b.x - arr[i - 1].x < 1.5 * S0) { arr[i - 1].double = true; arr[i - 1].ids = [...arr[i - 1].ids, ...b.ids]; return false; } return true; });
    for (const b of st.bars) if (!b.double && b.x1 - b.x0 + 1 > 2.2 * t + 2) b.double = true; // a thick (final) bar
  }

  // key signature: accidentals right after the clef, same type, closely spaced
  for (const st of staves) {
    const S = spaceAt(st, st.x0 + 4 * S0);
    const firstNote = Math.min(...notes.filter((n) => n.st === st).map((n) => n.box[0]), st.x1);
    let x = st.clef.box ? st.clef.box[2] : st.x0 + 2 * S;
    const mine = accs.filter((a) => a.st === st && a.c.x0 > x - 0.3 * S && a.c.x1 < firstNote && (a.type === 1 || a.type === -1 || a.type === 0) && a.p >= -2 && a.p <= 10).sort((a, b) => a.c.x0 - b.c.x0);
    const key = [];
    for (const a of mine) {
      if (a.c.x0 - x > 2.0 * S || key.length >= 14) break;
      // a local accidental hugs its note (~0.2-0.3 spaces); a key signature keeps a full space
      // or more before the music, so an accidental with a head at its pitch right after it ends the key
      const localGap = a.type === 0 ? 3.0 * S : 0.55 * S;
      if (notes.some((n) => n.st === st && Math.abs(n.p - a.p) <= 0 && n.box[0] - a.c.x1 > -0.3 * S && n.box[0] - a.c.x1 < localGap && !(key.length && n.kind === 'whole'))) break;
      const replacementType = key.find(item => item.type !== 0)?.type;
      if (a.type === 0 ? replacementType != null : replacementType != null && a.type !== replacementType) break;
      // glyphs of one signature are one size (a C or cut-C time signature can read as a sharp)
      const sameType = key.find(item => item.type === a.type);
      if (sameType && (a.c.x1 - a.c.x0) > 1.35 * (sameType.c.x1 - sameType.c.x0) + 1) break;
      // key signature glyphs are evenly spaced; a wider jump is the time signature or the music
      if (key.length >= 2) { const d = (key[key.length - 1].c.x0 - key[0].c.x0) / (key.length - 1); if (a.c.x0 - key[key.length - 1].c.x0 > 1.4 * d) break; }
      key.push(a); x = a.c.x1;
    }
    // Naturals may cancel the old key before a replacement sharp/flat signature.
    const clef = CLEFS[st.clef.type];
    let naturalCount = key.findIndex(a => a.type !== 0); if (naturalCount < 0) naturalCount = key.length;
    if (naturalCount < key.length) {
      const replacement = key.slice(naturalCount), exp = keySigPositions(clef, replacement[0].type * replacement.length);
      let n = 0; while (n < replacement.length && Math.abs(replacement[n].p - exp[n]) <= 1) n++;
      key.length = naturalCount + n;
    }
    naturalCount = Math.min(naturalCount, key.length);
    const replacement = key.slice(naturalCount);
    const cancellation = key.length > 0 && replacement.length === 0;
    const detected = replacement.length ? replacement[0].type * replacement.length : 0;
    key.forEach((a) => (a.isKey = true));
    st.key = { fifths: cancellation ? 0 : detected || (opts.fifths ?? 0), detected, cancellation,
      ids: key.flatMap((a) => a.c.ids), idsPer: key.map((a) => a.c.ids), glyphs: key.map((a) => ({ p:a.p, type:a.type, box:[a.c.x0, a.c.y0, a.c.x1, a.c.y1] })), x0: st.clef.box ? st.clef.box[2] + 1 : st.x0 + 2 * S, x1: key.length ? key[key.length - 1].c.x1 : (st.clef.box ? st.clef.box[2] + 1 : st.x0 + 2 * S) };
  }

  // a double flat engraved as two flat glyphs side by side: two separate components
  for (const a of accs) {
    if (a.type !== -1 || a.isKey || a.merged) continue;
    const S = spaceAt(a.st, a.c.cx);
    const b = accs.find((q) => q !== a && q.st === a.st && q.type === -1 && !q.isKey && !q.merged && q.p === a.p && q.c.x0 > a.c.x0 && q.c.x0 - a.c.x1 < 0.35 * S && Math.abs(q.c.y1 - a.c.y1) < 0.3 * S);
    if (!b) continue;
    a.type = -2; a.c = { ...a.c, ids: [...a.c.ids, ...b.c.ids], x1: b.c.x1, y0: Math.min(a.c.y0, b.c.y0) }; b.merged = true;
  }
  for (let k = accs.length - 1; k >= 0; k--) if (accs[k].merged) accs.splice(k, 1);
  // ... or a flat plus a leftover piece of the second one (staff removal cut it): the classifier
  // reads the extended box
  if (opts.glyphnet !== false) for (const a of accs) {
    if (a.type !== -1 || a.isKey || a.merged) continue;
    const S = spaceAt(a.st, a.c.cx);
    const extra = cc.comps.filter((q) => q && !headComps.has(q.id) && !a.c.ids.includes(q.id) && q.x0 > a.c.x0 && q.x0 - a.c.x1 < 0.3 * S && q.x1 - a.c.x0 < 2.1 * S && q.y0 >= a.c.y0 - 0.3 * S && q.y1 <= a.c.y1 + 0.3 * S && !accs.some((o) => o !== a && o.c.ids.includes(q.id)));
    if (!extra.length) continue;
    const box = [a.c.x0, Math.min(a.c.y0, ...extra.map((q) => q.y0)), Math.max(a.c.x1, ...extra.map((q) => q.x1)), Math.max(a.c.y1, ...extra.map((q) => q.y1))];
    if (classify(bin, box).dflat >= 0.9) { a.type = -2; a.c = { ...a.c, ids: [...a.c.ids, ...extra.map((q) => q.id)], x1: box[2] }; }
  }
  // Key changes inside a staff (a new section after a double bar, Telemann's minore / maggiore):
  // a run of accidentals right after a barline, not hugging a note at its pitch, optionally
  // naturals cancelling the old key first, then sharps or flats of one kind at the key-signature
  // positions for the clef. Only the run's first glyphs need to be found right after the bar.
  for (const st of staves) {
    st.keyChanges = [];
    const clef = CLEFS[st.clef.type];
    let cur = st.key.fifths;
    for (const b of st.bars) {
      const S = spaceAt(st, b.x), xs = b.x1;
      const run = [];
      let x = xs;
      // (inside the staff, like any signature: text such as "[Minore]" above it is not part of it)
      for (const a of accs.filter((q) => q.st === st && !q.isKey && q.c.x0 > xs && q.c.x0 - xs < 6 * S && q.p >= -2 && q.p <= 10).sort((p, q) => p.c.x0 - q.c.x0)) {
        // (a repeat sign's thin line and dots stand between the barline and the key)
        if (a.c.x0 - x > (run.length ? 1.6 : b.double ? 3.4 : 2.2) * S || run.length >= 11) break;
        if (notes.some((n) => n.st === st && n.box[0] > xs && n.box[2] < a.c.x0)) break; // music started
        if (notes.some((n) => n.st === st && n.p === a.p && n.box[0] - a.c.x1 > -0.3 * S && n.box[0] - a.c.x1 < 0.55 * S)) break; // hugs a note
        run.push(a); x = a.c.x1;
      }
      if (!run.length) continue;
      let i = 0; while (i < run.length && run[i].type === 0) i++;
      const nat = run.slice(0, i), acc = run.slice(i);
      // the new signature is the prefix of one kind at its positions; it ends at the first glyph
      // that is not (the first accidental of the music)
      let j = 0; while (j < acc.length && Math.abs(acc[j].type) === 1 && acc[j].type === acc[0].type && Math.abs(acc[j].p - keySigPositions(clef, acc[0].type * (j + 1))[j]) <= 1) j++;
      acc.length = j; run.length = nat.length + j;
      if (run.length) x = run[run.length - 1].c.x1;
      // naturals stand where the old key's glyphs were; the new glyphs where the new key's go
      const oldPos = keySigPositions(clef, cur);
      if (nat.length && (!cur || nat.some((a) => !oldPos.some((p) => Math.abs(p - a.p) <= 1)))) continue;
      const nf = acc.length ? acc[0].type * acc.length : 0, exp = keySigPositions(clef, nf);
      if (acc.some((a, k) => Math.abs(a.p - exp[k]) > 1)) continue;
      if (!nat.length && !acc.length) continue;
      // a lone sharp or flat with no naturals is only a key change if it differs from the key
      // and keeps clear of the music like a signature does
      const next = Math.min(st.x1, ...notes.filter((n) => n.st === st && n.box[0] > x).map((n) => n.box[0]));
      if (next - x < 0.5 * S || next >= st.x1) continue; // (one at the very end, with no music after, is not trusted)
      if (nf === cur) continue;
      // plausibility, from false positives on IMSLP pages: a lone accidental after a plain barline
      // is a local one (its note can be a grace note, which is not detected); naturals alone must
      // cancel the whole old key; fewer accidentals of the same kind need naturals to say so
      if (run.length < 2 && !b.double) continue;
      if (!acc.length && nat.length !== Math.abs(cur)) continue;
      if (Math.sign(nf) === Math.sign(cur) && Math.abs(nf) < Math.abs(cur) && !nat.length) continue;
      run.forEach((a) => (a.isKey = true));
      st.keyChanges.push({ x: b.x, x0: run[0].c.x0, x1: x, detected: nf, fifths: nf, from: cur,
        ids: run.flatMap((a) => a.c.ids), glyphs: run.map((a) => ({ p: a.p, type: a.type, box: [a.c.x0, a.c.y0, a.c.x1, a.c.y1] })) });
      cur = nf;
    }
  }

  // local accidentals: nearest head to the right at the same position
  for (const a of accs) {
    if (a.isKey) continue;
    const S = spaceAt(a.st, a.c.cx);
    let best = null, bd = 3 * S;
    for (const n of notes) {
      if (n.st !== a.st || Math.abs(n.p - a.p) > 0) continue;
      const dx = n.box[0] - a.c.x1;
      if (dx > -0.4 * S && dx < bd) { bd = dx; best = n; }
    }
    if (best && (!best.accid || bd < best.accidDx)) { best.accid = { type: a.type, ids: a.c.ids, box: [a.c.x0, a.c.y0, a.c.x1, a.c.y1] }; best.accidDx = bd; }
  }
  // augmentation dots and staccato dots travel with their note
  for (const d of dots) {
    const S = spaceAt(d.st, d.c.cx);
    let best = null, bd = 1e9;
    for (const n of notes) {
      if (n.st !== d.st) continue;
      const dx = d.c.cx - n.box[2], dy = Math.abs(d.c.cy - n.y);
      if (dx > 0 && dx < 1.6 * S && dy < 0.8 * S && dx < bd) { bd = dx; best = n; }
    }
    if (best) (best.dots ||= []).push({ ids: d.c.ids, box: [d.c.x0, d.c.y0, d.c.x1, d.c.y1], p: pOfY(d.st, d.c.cy, d.c.cx) });
  }

  // A page usually has one key, and the staves of one system always share theirs. Scanned key
  // signatures get misread (a glyph lost to noise or touching the clef, one extra picked up from
  // the music, none found at all), so a staff takes the key most staves of its system, else of
  // the page, actually read: plurality among the staves that read one, at least two of them and
  // half of those. Applied to staves that read nothing (when there is ink where a key would be)
  // or the same kind of accidental in another number; never against a sharp/flat contradiction.
  const plural = (sts) => {
    const v = new Map(); let tot = 0;
    for (const st of sts) if (st.key.detected) { v.set(st.key.detected, (v.get(st.key.detected) || 0) + 1); tot++; }
    // ties go to the longer signature: a glyph lost to noise is likelier than one invented
    const [k, n] = [...v].sort((a, b) => b[1] - a[1] || Math.abs(b[0]) - Math.abs(a[0]))[0] || [0, 0];
    return n >= 2 && n >= 0.5 * tot ? k : 0;
  };
  const sysOf = (st) => staves.filter((o) => Math.abs(o.x0 - st.x0) < 2 * S0 && o.bars.some((b) => st.bars.some((q) => q.ids[0] === b.ids[0])));
  // A page can hold several pieces in different keys (audition sheets, études): a key that
  // two or more staves read is real and is never voted away. A staff whose reading nobody
  // shares takes the confirmed key of the same kind closest in count, then the nearest staff's.
  const count = new Map(); for (const st of staves) if (st.key.detected) count.set(st.key.detected, (count.get(st.key.detected) || 0) + 1);
  const confirmed = [...count].filter(([, n]) => n >= 2).map(([k]) => k);
  const nearestKey = (st, ok) => {
    for (let d = 1; d < staves.length; d++) for (const o of [staves[st.index + d], staves[st.index - d]]) if (o && ok(o.key.detected)) return o.key.detected;
    return 0;
  };
  // Distinguish a genuinely keyless C/a-minor section from a signature merely missed on a scan.
  // The explicit marker survives the prior-page pass as authoritative zero-key evidence.
  const keyInk = (st) => {
    const S = spaceAt(st, st.key.x0), first = Math.min(st.x1, ...notes.filter((n) => n.st === st).map((n) => n.box[0]));
    const ya = lineY(st, 0, st.key.x0), yb = lineY(st, 4, st.key.x0);
    return cc.comps.some((c) => {
      if (!c || c.x0 < st.key.x0 - 0.2 * S || c.x1 > Math.min(first, st.key.x0 + 3 * S) || c.y1 - c.y0 < 1.2 * S || c.x1 - c.x0 > 1.6 * S || c.y1 <= ya || c.y0 >= yb) return false;
      if (opts.glyphnet === false) return true;
      const pr = classify(bin, [c.x0, c.y0, c.x1, c.y1]); // time-signature digits are not sharps or flats
      return pr.sharp + pr.flat > 0.5;
    });
  };
  for (const st of staves) {
    if (st.key.cancellation) continue;
    const sys = sysOf(st);
    let k = sys.length >= 3 && plural(sys);
    // in a part, a key change inside the previous staff carries into this one (its signature is
    // the strongest evidence there is, stronger than what the rest of the page reads)
    const prev = staves[st.index - 1], endK = sys.length < 2 && prev?.keyChanges?.length ? prev.keyChanges[prev.keyChanges.length - 1].fifths : null;
    if (!k && endK != null && st.key.detected !== endK && (!st.key.detected || (Math.sign(st.key.detected) === Math.sign(endK) && Math.abs(st.key.detected) < Math.abs(endK)))) k = endK;
    const fromPrev = k === endK && k != null;
    if (!k && st.key.detected && confirmed.includes(st.key.detected)) continue;
    // Consecutive single-staff systems with no signature and no accidental-like ink start a
    // genuine C/a-minor section. Mark zero as authoritative so a prior PDF page cannot fill it.
    if (!k && sys.length < 2 && !st.key.detected && !keyInk(st) && [staves[st.index - 1], staves[st.index + 1]].some((o) => o && sysOf(o).length < 2 && !o.key.detected && !o.keyChanges?.length && !keyInk(o))) {
      st.key.fifths = 0; st.key.keylessSection = true; continue;
    }
    if (!k && st.key.detected) {
      const same = confirmed.filter((c) => Math.sign(c) === Math.sign(st.key.detected));
      const best = Math.min(...same.map((c) => Math.abs(Math.abs(c) - Math.abs(st.key.detected))));
      const near = same.filter((c) => Math.abs(Math.abs(c) - Math.abs(st.key.detected)) === best);
      k = near.length === 1 ? near[0] : near.length ? nearestKey(st, (v) => near.includes(v)) : 0;
    }
    if (!k) k = nearestKey(st, (v) => confirmed.includes(v)) || plural(staves);
    if (!k || st.key.detected === k) continue;
    if (Math.sign(st.key.detected) === Math.sign(k)) {
      st.key.fifths = k; st.key.inferred = true;
      // one glyph too many read: it is something else (a time signature), not part of the key
      const n = Math.abs(k), K = st.key;
      let naturalCount = K.glyphs.findIndex(glyph => glyph.type !== 0); if (naturalCount < 0) naturalCount = K.glyphs.length;
      const replacementCount = K.glyphs.length - naturalCount;
      if (replacementCount > n) {
        const keep = naturalCount + n;
        K.idsPer = K.idsPer.slice(0, keep); K.glyphs = K.glyphs.slice(0, keep); K.ids = K.idsPer.flat(); K.x1 = K.glyphs[keep - 1].box[2];
      }
      continue;
    }
    if (st.key.detected) continue;
    const S = spaceAt(st, st.key.x0), first = Math.min(st.x1, ...notes.filter((q) => q.st === st).map((q) => q.box[0]));
    const ya = lineY(st, 0, st.key.x0), yb = lineY(st, 4, st.key.x0);
    const something = cc.comps.some((c) => c && c.x0 >= st.key.x0 - 0.2 * S && c.x1 <= Math.min(first, st.key.x0 + 1.5 * S * Math.abs(k) + S) &&
      c.y1 - c.y0 >= 1.2 * S && c.x1 - c.x0 <= 1.6 * S && c.y1 > ya && c.y0 < yb);
    if (something || fromPrev) { st.key.fifths = k; st.key.inferred = true; }
  }

  // ---- assemble per staff: chords, bars, pitches ----
  for (const st of staves) {
    const ns = notes.filter((n) => n.st === st).sort((a, b) => a.x - b.x || a.p - b.p);
    for (const n of ns) n.bar = st.bars.filter((b) => b.x < n.x).length;
    let chord = 0;
    ns.forEach((n, i) => {
      const prev = ns[i - 1];
      const same = prev && ((n.stem && prev.stem && Math.abs(n.stem.x - prev.stem.x) <= 0.35 * S0 && n.stem.dir === prev.stem.dir) || (!n.stem && !prev.stem && Math.abs(n.x - prev.x) < 0.6 * S0));
      if (!same) chord++;
      n.chord = chord;
    });
    st.notes = ns;
    interpret(st);
  }
  // fragments that belong to a note but lost contact with it (thin stems and flags broken
  // up by binarisation in photos): they travel with the note's component
  const taken = new Set([...headComps]);
  for (const st of staves) { st.key.ids.forEach((i) => taken.add(i)); st.keyChanges.forEach((k) => k.ids.forEach((i) => taken.add(i))); st.bars.forEach((b) => b.ids.forEach((i) => taken.add(i))); }
  for (const n of notes) { n.accid?.ids.forEach((i) => taken.add(i)); n.dots?.forEach((d) => d.ids.forEach((i) => taken.add(i))); }
  const attach = {};
  const byComp = new Map(); for (const n of notes) { if (!byComp.has(n.comp)) byComp.set(n.comp, []); byComp.get(n.comp).push(n); }
  for (const [id, ns] of byComp) {
    const c = cc.comps[id]; if (!c) continue;
    const S = spaceAt(ns[0].st, ns[0].x), pad = 0.25 * S, out = [];
    for (const q of cc.comps) {
      if (!q || taken.has(q.id)) continue;
      if (q.x1 < c.x0 - S || q.x0 > c.x1 + S || q.y1 < c.y0 - 2 * S || q.y0 > c.y1 + 2 * S) continue;
      const small = q.x1 - q.x0 < 1.2 * S && q.y1 - q.y0 < 1.2 * S && q.x0 >= c.x0 - pad && q.x1 <= c.x1 + pad && q.y0 >= c.y0 - pad && q.y1 <= c.y1 + pad;
      const onStem = ns.some((n) => n.stem && Math.abs((q.x0 + q.x1) / 2 - n.stem.x) <= 0.35 * S && q.x1 - q.x0 < 0.5 * S &&
        q.y0 >= Math.min(n.y, n.stem.tip) - 0.4 * S && q.y1 <= Math.max(n.y, n.stem.tip) + 0.4 * S);
      // pieces of the head itself (a hollow head's ring cut in two where it touches staff lines)
      const inHead = ns.some((n) => q.x0 >= n.box[0] - 2 && q.x1 <= n.box[2] + 2 && q.y0 >= n.box[1] - 2 && q.y1 <= n.box[3] + 2);
      if (small || onStem || inHead) { out.push(q.id); taken.add(q.id); }
    }
    if (out.length) attach[id] = out;
  }

  // systems: staves bound by shared barlines (they must stay aligned when a staff is squeezed)
  let sys = 0;
  staves.forEach((st, i) => {
    const prev = staves[i - 1];
    const shared = prev && Math.abs(prev.x0 - st.x0) < 2 * S0 && st.bars.some((b) => prev.bars.some((q) => Math.abs(q.x - b.x) < 0.5 * S0 && q.ids[0] === b.ids[0]));
    if (!shared) sys++;
    st.system = sys;
  });

  // clef pieces in the final labelling (for erasing on a clef change)
  for (const st of staves) {
    const b = st.clef.box;
    st.clef.ids = b ? cc.comps.filter((c) => c && c.cx >= b[0] && c.cx <= b[2] && c.cy >= b[1] && c.cy <= b[3] &&
      c.x1 - c.x0 <= b[2] - b[0] + 4 && c.y1 - c.y0 <= b[3] - b[1] + 4 && !headComps.has(c.id)).map((c) => c.id) : [];
  }
  readRhythm({ w, h, S0, t, staves, notes, L, comps: cc.comps, accs, dots, headComps, bin, useNet: opts.glyphnet !== false, textIds });
  // the same part on the previous system (ties over the system break), then pitches again with ties
  for (const st of staves) {
    const row = staves.filter((o) => o.system === st.system).indexOf(st);
    st.prevStaff = staves.filter((o) => o.system === st.system - 1)[row] || null;
  }
  for (const st of staves) interpret(st);
  return { w, h, space: S0, thick: t, staves, labels: L, comps: cc.comps, ledgerPx: Int32Array.from(ledgerPx), notes, attach, bin: bin.data, A: norm.A, scale: norm.scale, angle: norm.angle };
}

// Rows of letter-like components (see analyze). Returns a Set of component ids.
export function findText(comps, S, noteComps = new Set(), staves = []) {
  // text sits outside the five lines (tempo, expressions, lyrics); inside are digits and music
  const inStaff = (q) => staves.some((st) => q.cx >= st.x0 && q.cx <= st.x1 && q.cy > lineY(st, 0, q.cx) - 0.2 * S && q.cy < lineY(st, 4, q.cx) + 0.2 * S);
  const c = comps.filter((q) => q && q.y1 - q.y0 + 1 >= 0.45 * S && q.y1 - q.y0 + 1 <= 2.3 * S && q.x1 - q.x0 + 1 >= 0.15 * S && q.x1 - q.x0 + 1 <= 2.4 * S && q.n >= 6)
    .sort((a, b) => a.x0 - b.x0);
  const next = new Map();
  // link each to the nearest component on its right that overlaps it vertically and looks alike
  for (let i = 0; i < c.length; i++) {
    const a = c[i], ha = a.y1 - a.y0 + 1; let best = null;
    for (let j = i + 1; j < c.length && c[j].x0 - a.x1 <= 0.9 * S; j++) {
      const b = c[j], hb = b.y1 - b.y0 + 1, gap = b.x0 - a.x1;
      if (gap < -0.15 * S) continue;
      const ov = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      // letters share an x-height band: most of the smaller one overlaps the other
      if (ov < 0.55 * Math.min(ha, hb) || Math.max(ha, hb) > 2.6 * Math.min(ha, hb)) continue;
      if (!best || gap < best.gap) best = { b, gap };
    }
    if (best) next.set(a, best);
  }
  const prevOf = new Map(); for (const [a, { b }] of next) if (!prevOf.has(b) || prevOf.get(b).gap > next.get(a).gap) prevOf.set(b, { a, gap: next.get(a).gap });
  const out = new Set();
  for (const a of c) {
    if (prevOf.has(a) && prevOf.get(a).a && next.get(prevOf.get(a).a)?.b === a) continue; // not a chain start
    const chain = [a]; let gaps = [];
    for (let q = a; next.has(q) && prevOf.get(next.get(q).b)?.a === q; ) { gaps.push(next.get(q).gap); q = next.get(q).b; chain.push(q); }
    // three or more letters; or two tightly set (a dynamic "pp", "mf")
    // (and most of the row is not read as notes: a row of letters around the "o" that passed)
    const others = chain.filter((q) => !noteComps.has(q.id)).length;
    if (chain.filter(inStaff).length * 2 > chain.length) continue;
    if ((chain.length >= 3 && others >= 2) || (chain.length === 2 && others >= 1 && Math.max(...gaps) <= 0.35 * S)) for (const q of chain) out.add(q.id);
  }
  return out;
}

// Key in effect at x on a staff: the signature, then any key changes inside the staff.
export function keyAt(st, x) {
  let f = st.key.fifths;
  for (const k of st.keyChanges || []) if (k.x0 <= x) f = k.fifths;
  return f;
}
// Pitches from clef + key + accidentals (re-run after a manual correction).
// A tied note keeps the pitch it is tied from, also across a barline or a system break where the
// bar's accidentals no longer apply (F♯ tied into the next bar stays F♯ without a new sharp).
export function interpret(st) {
  const clef = CLEFS[st.clef.type];
  const ps = readStaff(st.notes.map((n) => ({ p: n.p, acc: n.accid ? n.accid.type : null, bar: n.bar, fifths: keyAt(st, n.x) })), clef, st.key.fifths);
  st.notes.forEach((n, i) => { n.pitch = ps[i]; n.name = nameOf(ps[i]); });
  const tied = (n) => (n.fix && n.fix.tie !== undefined ? n.fix.tie : n.tie);
  // ties into the first chord of this staff from the end of the previous one (same part)
  let from = st.prevStaff ? st.prevStaff.notes.filter((n) => n.chord === Math.max(...st.prevStaff.notes.map((q) => q.chord)) && tied(n)) : [];
  const chords = [...new Set(st.notes.map((n) => n.chord))].sort((a, b) => a - b);
  for (const c of chords) {
    const ns = st.notes.filter((n) => n.chord === c);
    for (const n of ns) {
      if (n.accid) continue;
      const src = from.find((q) => (q.st === st ? q.p === n.p : q.pitch.d === n.pitch.d));
      if (src && src.pitch.alter !== n.pitch.alter) { n.pitch = { d: n.pitch.d, alter: src.pitch.alter }; n.name = nameOf(n.pitch); }
    }
    from = ns.filter(tied);
  }
}
