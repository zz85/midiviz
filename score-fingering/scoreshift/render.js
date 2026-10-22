// In-place transposition renderer (browser canvas). The photo itself is the layout: every
// pitched symbol (head, stem, flag, beam, dots) is cut out of the page and pasted back
// shifted by the transposition, accidentals and key signatures are rewritten, ledger lines
// regenerated, and erased paper is refilled with the page's own local paper colour.
import { lineY, yOfP, pOfY, spaceAt, keyAt } from './omr.js';
import { CLEFS, instrument, partInterval, transposePitch, pOfD, spellStaff, keySigPositions, nameOf, keyName, midiOf, bestOctave } from './theory.js';
import { GLYPHS } from './glyphs.js';

const ACC_GLYPH = { '-2': 'doubleFlat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'doubleSharp' };
const CLEF_GLYPH = { G: 'gClef', F: 'fClef', C: 'cClef' };
// DOM canvas on the page, OffscreenCanvas in a worker (whole-PDF export renders in workers)
const canvas = (w, h) => {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

// ---------- transposition plan (pure, also used by the UI text and tests) ----------
export function plan(model, opts) {
  const from = instrument(opts.from), to = instrument(opts.to);
  const out = { staves: [], from, to };
  // automatic octave: keep the most notes inside the target's written range
  // automatic octave, per staff: keep the most of that staff's notes inside the target's
  // written range (in a score each staff is a different instrument)
  const auto = opts.octave == null || opts.octave === 'auto';
  out.octave = auto ? 'auto' : opts.octave;
  // A part (one staff per system) gets one octave for the whole page; in a score each row of
  // the system is a different instrument and gets its own.
  const bySys = new Map(); for (const st of model.staves) bySys.set(st.system, [...(bySys.get(st.system) || []), st]);
  const rowOf = new Map(); for (const g of bySys.values()) g.forEach((st, i) => rowOf.set(st, i));
  const isScore = [...bySys.values()].some((g) => g.length > 1);
  const autoOct = new Map();
  if (auto) {
    const groups = new Map();
    for (const st of model.staves) { const k = isScore ? rowOf.get(st) : 0; groups.set(k, [...(groups.get(k) || []), st]); }
    for (const [k, sts] of groups) {
      const midis = sts.flatMap((st) => { const iv0 = partInterval(from, to, st.key.fifths, 0); return st.notes.map((n) => midiOf(transposePitch(n.pitch, iv0))); });
      autoOct.set(k, bestOctave(midis, to.range));
    }
  }
  for (const st of model.staves) {
    const octave = auto ? autoOct.get(isScore ? rowOf.get(st) : 0) : opts.octave;
    const iv = partInterval(from, to, st.key.fifths, octave);
    const clefId = opts.clef && opts.clef !== 'auto' ? (opts.clef === 'keep' ? st.clef.type : opts.clef) : to.id === 'C' ? st.clef.type : to.clef;
    const clef = CLEFS[clefId], srcClef = CLEFS[st.clef.type];
    // a key change inside the staff gets its own interval (it may respell enharmonically)
    const ivAt = new Map([[st.key.fifths, iv]]);
    const ivOf = (f) => { if (!ivAt.has(f)) ivAt.set(f, partInterval(from, to, f, octave)); return ivAt.get(f); };
    const changes = (st.keyChanges || []).map((k) => ({ ...k, src: k.fifths, fifths: ivOf(k.fifths).fifths, prev: ivOf(k.from ?? st.key.fifths).fifths }));
    const pitches = st.notes.map((n) => transposePitch(n.pitch, ivOf(keyAt(st, n.x))));
    const accs = spellStaff(pitches, st.notes.map((n) => ({ acc: n.accid ? n.accid.type : null, bar: n.bar, fifths: ivOf(keyAt(st, n.x)).fifths })), iv.fifths);
    out.staves.push({
      st, iv, octave, clefId, clef, clefChanged: clef.sign !== srcClef.sign || clef.line !== srcClef.line,
      fifths: iv.fifths, changes, keyChanged: iv.fifths !== st.key.fifths || clef.sign !== srcClef.sign || clef.line !== srcClef.line,
      notes: st.notes.map((n, i) => ({ n, pitch: pitches[i], p: pOfD(clef, pitches[i].d), acc: accs[i], name: nameOf(pitches[i]) })),
    });
  }
  return out;
}

export function describe(model, pl) {
  const st = model.staves[0]; if (!st) return '';
  const s0 = pl.staves[0], iv = s0.iv;
  const names = ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'];
  const dd = iv.dd, dir = dd > 0 || (dd === 0 && iv.ds > 0) ? 'up' : 'down';
  const abs = Math.abs(dd), oct = Math.floor(abs / 7), rem = abs % 7;
  let ivName = rem === 0 && oct ? `${oct > 1 ? oct + ' octaves' : 'an octave'}` : names[rem] + (oct ? ` + ${oct} oct` : '');
  if (dd === 0 && iv.ds === 0) ivName = 'no change';
  return `${keyName(st.key.fifths)} → ${keyName(s0.fifths)} · ${dd === 0 && iv.ds === 0 ? 'unchanged' : `${dir} ${ivName} (${Math.abs(iv.ds)} semitones)`}`;
}

// ---------- rendering ----------
export class Renderer {
  constructor(img, model) {
    this.img = img; this.m = model;
    const { w, h } = model;
    // output scale: back to roughly the photo's own resolution, capped for memory
    this.r = Math.max(1, Math.min(3, 1 / model.scale, Math.sqrt(14e6 / (w * h))));
    this.W = Math.round(w * this.r); this.H = Math.round(h * this.r);
    this.src = canvas(this.W, this.H);
    this.drawWarped(this.src.getContext('2d'), this.r);
    // normalized-resolution copy for colour statistics
    this.small = canvas(w, h);
    const sc = this.small.getContext('2d', { willReadFrequently: true });
    this.drawWarped(sc, 1);
    this.smallData = sc.getImageData(0, 0, w, h).data;
    this.colours();
  }

  drawWarped(ctx, r) {
    const [a, b, c, d, e, f] = this.m.A, det = a * e - b * d;
    ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform((r * e) / det, (-r * d) / det, (-r * b) / det, (r * a) / det, (r * (b * f - e * c)) / det, (r * (d * c - a * f)) / det);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.img, 0, 0);
    ctx.restore();
  }

  // ink colour (median of ink) and a coarse local paper-colour map
  colours() {
    const { w, h, bin } = this.m, D = this.smallData, B = 8;
    const ink = [[], [], []];
    for (let i = 0; i < w * h; i += 7) if (bin[i]) for (let k = 0; k < 3; k++) ink[k].push(D[i * 4 + k]);
    const med = (a) => { a.sort((x, y) => x - y); return a.length ? a[Math.floor(a.length * 0.25)] : 40; }; // dark quartile: the median is pulled up by antialiased edges
    this.ink = `rgb(${med(ink[0])},${med(ink[1])},${med(ink[2])})`;
    // staff lines are thinner and photograph lighter than heads: sample their own colour
    const li = [[], [], []];
    for (const st of this.m.staves) for (let k = 0; k < 5; k++) for (let x = st.x0; x < st.x1; x += 5) {
      const i = Math.round(lineY(st, k, x)) * w + x; if (!bin[i]) continue;
      for (let q = 0; q < 3; q++) li[q].push(D[i * 4 + q]);
    }
    const md = (a) => { a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 60; };
    this.lineInk = `rgb(${md(li[0])},${md(li[1])},${md(li[2])})`;
    const pw = Math.ceil(w / B), ph = Math.ceil(h / B), P = new Float32Array(pw * ph * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (bin[i]) continue;
      // skip pixels next to ink (antialiased edges are darker than paper)
      if ((x > 0 && bin[i - 1]) || (x < w - 1 && bin[i + 1]) || (y > 0 && bin[i - w]) || (y < h - 1 && bin[i + w])) continue;
      const j = ((y / B) | 0) * pw + ((x / B) | 0);
      P[j * 4] += D[i * 4]; P[j * 4 + 1] += D[i * 4 + 1]; P[j * 4 + 2] += D[i * 4 + 2]; P[j * 4 + 3]++;
    }
    // fill empty blocks from neighbours (blocks inside large symbols)
    for (let pass = 0; pass < 8; pass++) {
      let empty = 0;
      for (let j = 0; j < pw * ph; j++) {
        if (P[j * 4 + 3] >= 4) continue; empty++;
        const x = j % pw, y = (j / pw) | 0; let s0 = 0, s1 = 0, s2 = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= pw || yy >= ph) continue;
          const k = yy * pw + xx; if (P[k * 4 + 3] < 4) continue;
          s0 += P[k * 4] / P[k * 4 + 3]; s1 += P[k * 4 + 1] / P[k * 4 + 3]; s2 += P[k * 4 + 2] / P[k * 4 + 3]; n++;
        }
        if (n) { P[j * 4] = (s0 / n) * 4; P[j * 4 + 1] = (s1 / n) * 4; P[j * 4 + 2] = (s2 / n) * 4; P[j * 4 + 3] = 4; }
      }
      if (!empty) break;
    }
    this.paper = canvas(pw, ph);
    const pc = this.paper.getContext('2d'), id = pc.createImageData(pw, ph);
    for (let j = 0; j < pw * ph; j++) {
      const n = P[j * 4 + 3] || 1;
      id.data[j * 4] = P[j * 4] / n; id.data[j * 4 + 1] = P[j * 4 + 1] / n; id.data[j * 4 + 2] = P[j * 4 + 2] / n; id.data[j * 4 + 3] = 255;
      if (!P[j * 4 + 3]) { id.data[j * 4] = id.data[j * 4 + 1] = id.data[j * 4 + 2] = 245; }
    }
    pc.putImageData(id, 0, 0);
  }

  // binary mask (normalized res) of the given component ids, dilated by `grow` px
  // paperOnly: grow only into paper (the antialiased halo), never into neighbouring ink such
  // as the staff line a stem crosses, which would otherwise travel with the stem
  maskOf(idsList, grow = 1, extraPx, paperOnly = false, st = null) {
    const { w, h, labels, comps, bin } = this.m, mask = new Uint8Array(w * h);
    for (const id of idsList) {
      const c = comps[id]; if (!c) continue;
      for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (labels[y * w + x] === id) mask[y * w + x] = 1;
    }
    if (extraPx) for (const i of extraPx) mask[i] = 1;
    if (st) this.stripLineStubs(mask, idsList, st);
    let m = mask;
    for (let g = 0; g < grow; g++) {
      const o = new Uint8Array(m);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!m[i] && (!paperOnly || !bin[i]) && (m[i - 1] || m[i + 1] || m[i - w] || m[i + w])) o[i] = 1; }
      m = o;
    }
    return m;
  }
  // Pixels of a symbol lying in a staff-line band with nothing of the symbol directly above or
  // below are line remnants (blurred lines next to a stem survive staff removal): drop them.
  stripLineStubs(mask, ids, st) {
    const { w, h, comps, thick } = this.m, half = thick / 2 + 1.5, off = Math.ceil(thick / 2 + 2);
    for (const id of ids) {
      const c = comps[id]; if (!c) continue;
      for (let k = 0; k < 5; k++) for (let x = c.x0; x <= c.x1; x++) {
        const yl = lineY(st, k, x);
        if (yl < c.y0 - half || yl > c.y1 + half) continue;
        const up = Math.round(yl - off), dn = Math.round(yl + off);
        const sup = (up >= 0 && mask[up * w + x]) || (dn < h && mask[dn * w + x]);
        if (sup) continue;
        for (let y = Math.ceil(yl - half); y <= Math.floor(yl + half); y++) if (y >= 0 && y < h) mask[y * w + x] = 0;
      }
    }
  }
  // Staff removal also removes a symbol's own ink where it lies on a staff line (a stem crossing
  // a line, the top or bottom of a head ring touching one), so a moved symbol comes out broken.
  // Put those pixels back: in the symbol's columns, a staff-line band whose ink run is thicker
  // than a bare line is line plus symbol; take the run (minus columns where another symbol
  // passes straight through the line).
  fillBands(mask, ids, st) {
    const { w, h, comps, thick, bin, labels } = this.m, S = spaceAt(st, (st.x0 + st.x1) / 2), lim = Math.round(0.45 * S);
    const own = new Set(ids);
    for (const id of ids) {
      const c = comps[id]; if (!c) continue;
      for (let k = 0; k < 5; k++) for (let x = c.x0; x <= c.x1; x++) {
        const yl = Math.round(lineY(st, k, x));
        if (yl < c.y0 - thick - 2 || yl > c.y1 + thick + 2 || yl < 0 || yl >= h || !bin[yl * w + x]) continue;
        let a = yl, b = yl; while (a > 0 && bin[(a - 1) * w + x] && yl - a < lim) a--; while (b < h - 1 && bin[(b + 1) * w + x] && b - yl < lim) b++;
        if (b - a + 1 <= Math.round(thick) + 1) continue;
        const la = a > 0 ? labels[(a - 1) * w + x] : 0, lb = b < h - 1 ? labels[(b + 1) * w + x] : 0;
        if ((la && !own.has(la)) || (lb && !own.has(lb))) continue;
        for (let y = a; y <= b; y++) mask[y * w + x] = 1;
      }
    }
  }
  // Same mask as maskOf, but only for the crop (x0, y0, cw, ch): per-symbol work stays
  // proportional to the symbol, not the page (a full-page mask per pasted note made a
  // 350-note score page take ~9 s).
  maskCrop(ids, grow, paperOnly, st, x0, y0, cw, ch) {
    const { w, h, labels, comps, bin } = this.m, sc = (this.scratch ||= new Uint8Array(w * h));
    for (const id of ids) { const c = comps[id]; if (!c) continue; for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (labels[y * w + x] === id) sc[y * w + x] = 1; }
    if (st) { this.stripLineStubs(sc, ids, st); this.fillBands(sc, ids, st); }
    let m = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) { const yy = y + y0; if (yy < 0 || yy >= h) continue; for (let x = 0; x < cw; x++) { const xx = x + x0; if (xx >= 0 && xx < w) m[y * cw + x] = sc[yy * w + xx]; } }
    for (let y = Math.max(0, y0 - 12); y < Math.min(h, y0 + ch + 12); y++) sc.fill(0, y * w + Math.max(0, x0 - 2), y * w + Math.min(w, x0 + cw + 2));
    for (let g = 0; g < grow; g++) {
      const o = new Uint8Array(m);
      for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
        const i = y * cw + x, gi = (y + y0) * w + x + x0;
        if (!m[i] && (!paperOnly || !bin[gi]) && (m[i - 1] || m[i + 1] || m[i - cw] || m[i + cw])) o[i] = 1;
      }
      m = o;
    }
    return m;
  }
  cropCanvas(m, cw, ch) {
    const c = canvas(cw, ch), ctx = c.getContext('2d'), id = ctx.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) if (m[i]) id.data[i * 4 + 3] = 255;
    ctx.putImageData(id, 0, 0);
    return c;
  }
  maskCanvas(mask, x0 = 0, y0 = 0, cw = this.m.w, ch = this.m.h) {
    const { w } = this.m, c = canvas(cw, ch), ctx = c.getContext('2d'), id = ctx.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const v = mask[(y + y0) * w + x + x0]; if (v) id.data[(y * cw + x) * 4 + 3] = 255; }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  // draw a glyph from the page (sample) or from a font, origin at (x, yRef) in normalized coords
  glyph(ctx, name, x, yRef, S, font, warp) {
    const sample = this.samples && this.samples[name];
    const X = warp ? warp(x) : x, r = this.r;
    if (sample) {
      const { box, ref, ids, S: sS } = sample, sc = S / sS;
      const bw = box[2] - box[0] + 3, bh = box[3] - box[1] + 3;
      const tmp = canvas(bw * r, bh * r), t = tmp.getContext('2d');
      t.drawImage(this.src, (box[0] - 1) * r, (box[1] - 1) * r, bw * r, bh * r, 0, 0, bw * r, bh * r);
      t.globalCompositeOperation = 'destination-in';
      t.imageSmoothingEnabled = true;
      t.drawImage(sample.mask, 0, 0, bw * r, bh * r);
      ctx.save(); ctx.globalCompositeOperation = 'darken';
      ctx.drawImage(tmp, X * r, (yRef - (ref - box[1] + 1) * sc) * r, bw * r * sc, bh * r * sc);
      ctx.restore();
      return (box[2] - box[0]) * sc;
    }
    const g = (GLYPHS[font] && GLYPHS[font][name]) || GLYPHS.Bravura[name];
    ctx.save(); ctx.fillStyle = this.ink;
    ctx.setTransform((r * S) / 250, 0, 0, (-r * S) / 250, (X - g.box[0] * S) * r, yRef * r);
    ctx.fill(new Path2D(g.d));
    ctx.restore();
    return (g.box[2] - g.box[0]) * S;
  }
  glyphWidth(name, S, font) {
    const s = this.samples && this.samples[name];
    if (s) return (s.box[2] - s.box[0]) * (S / s.S);
    const g = (GLYPHS[font] && GLYPHS[font][name]) || GLYPHS.Bravura[name];
    return (g.box[2] - g.box[0]) * S;
  }

  // page samples of accidentals (key signatures are the cleanest), to draw new ones in the page's own typeface
  collectSamples() {
    this.samples = {};
    const take = (type, ids, box, ref, S) => {
      const name = ACC_GLYPH[type]; if (this.samples[name]) return;
      const cw = box[2] - box[0] + 3, ch = box[3] - box[1] + 3, mc = this.cropCanvas(this.maskCrop(ids, 1, true, null, box[0] - 1, box[1] - 1, cw, ch), cw, ch);
      this.samples[name] = { box, ref, ids, S, mask: mc };
    };
    for (const st of this.m.staves) {
      const S = spaceAt(st, st.x0 + 4 * 16);
      st.key.glyphs?.forEach((g, i) => {
        const type = Math.sign(st.key.detected), ids = st.key.idsPer?.[i];
        if (ids) take(type, ids, g.box, type < 0 ? g.box[3] - 0.45 * S : (g.box[1] + g.box[3]) / 2, S);
      });
      for (const n of st.notes) if (n.accid && Math.abs(n.accid.type) < 2) {
        const b = n.accid.box, S2 = spaceAt(st, n.x);
        take(n.accid.type, n.accid.ids, b, n.accid.type < 0 ? b[3] - 0.45 * S2 : (b[1] + b[3]) / 2, S2);
      }
    }
  }

  render(ctx, pl, opts = {}) {
    const m = this.m, r = this.r, font = opts.font || 'Bravura';
    if (opts.useSamples !== false) this.collectSamples(); else this.samples = {};
    ctx.canvas.width = this.W; ctx.canvas.height = this.H;
    ctx.drawImage(this.src, 0, 0);
    // ---- what moves and what goes ----
    const erase = [], moves = []; this.arcStats = { moved: 0, kept: 0 };
    for (const sp of pl.staves) {
      const st = sp.st, byComp = new Map();
      for (const nn of sp.notes) {
        const n = nn.n; if (!n.comp) continue;
        if (!byComp.has(n.comp)) byComp.set(n.comp, []);
        byComp.get(n.comp).push(nn);
        if (n.accid) erase.push(...n.accid.ids);
      }
      if (sp.keyChanged) erase.push(...st.key.ids);
      for (const k of sp.changes) if (k.fifths !== k.src || sp.clefChanged) erase.push(...k.ids);
      if (sp.clefChanged && st.clef.ids) erase.push(...st.clef.ids);
      for (const [comp, nns] of byComp) {
        const n0 = nns[0], dp = n0.p - n0.n.p;
        const dy = yOfP(st, n0.p, n0.n.x) - yOfP(st, n0.n.p, n0.n.x);
        if (dp === 0 && !sp.clefChanged) continue;
        // (staccatos, tenutos, accents and bowing marks are part of the note: they move with it,
        // or a stacked accent would run into a bowing mark left behind)
        const ids = [comp, ...(this.m.attach?.[comp] || []), ...new Set(nns.flatMap((q) => [...(q.n.articIds || []), ...(q.n.bowIds || [])]))];
        erase.push(...ids);
        const dots = [];
        for (const nn of nns) for (const d of nn.n.dots || []) {
          erase.push(...d.ids);
          // a dot stays in a space: shift with the note, then off a line if the note lands on one
          const pOld = d.p, pNew = nn.p % 2 === 0 ? nn.p + (pOld >= nn.n.p ? 1 : -1) : nn.p;
          dots.push({ ids: d.ids, dy: yOfP(st, pNew, nn.n.x) - (d.box[1] + d.box[3]) / 2 + 0 });
        }
        moves.push({ st, ids, dy, dots, stems: nns.filter((q) => q.n.stem).map((q) => q.n.stem.x), heads: nns.map((q) => q.n.box) });
      }
      // ties and slurs move with their notes: every note of a staff moves by the same number of
      // steps, so an arc moves by that too (an arc fused with a note already travels with it)
      const ref = sp.notes.find((nn) => nn.n.comp), dp = ref ? ref.p - ref.n.p : 0;
      if (ref && (dp !== 0 || sp.clefChanged)) {
        const moving = new Set(moves.flatMap((q) => q.ids)), arcs = [];
        for (const n of st.notes) if (n.tie && n.tieIds) arcs.push({ ids: n.tieIds, x: n.x, p: n.p });
        for (const sl of st.slurs || []) { const e = sl.from || sl.to; if (e) arcs.push({ ids: sl.ids, x: (sl.box[0] + sl.box[2]) / 2, p: e.p }); }
        const heads = new Set(m.notes.map((n) => n.comp)), S = spaceAt(st, (st.x0 + st.x1) / 2), pad = m.thick + 3;
        for (const a of arcs) {
          // the pieces staff lines cut the arc into: small components inside its box
          const own = a.ids.map((i) => m.comps[i]).filter(Boolean); if (!own.length) continue;
          const bx = [Math.min(...own.map((c) => c.x0)) - pad, Math.min(...own.map((c) => c.y0)) - pad, Math.max(...own.map((c) => c.x1)) + pad, Math.max(...own.map((c) => c.y1)) + pad];
          const all = new Set(a.ids);
          const inHead = (c) => st.notes.some((n) => c.cx >= n.box[0] - 2 && c.cx <= n.box[2] + 2 && c.cy >= n.box[1] - 2 && c.cy <= n.box[3] + 2);
          for (const c of m.comps) if (c && !heads.has(c.id) && !inHead(c) && c.x0 >= bx[0] && c.x1 <= bx[2] && c.y0 >= bx[1] && c.y1 <= bx[3] && c.x1 - c.x0 < 1.6 * S && c.y1 - c.y0 < 0.9 * S) all.add(c.id);
          // only an arc that is all there: its pieces cover the ink in its box off the staff lines
          // (an arc partly fused with something else would be torn apart)
          let ink = 0, got = 0;
          for (let y = Math.max(0, bx[1] + pad); y <= Math.min(m.h - 1, bx[3] - pad); y++) for (let x = Math.max(0, bx[0] + pad); x <= Math.min(m.w - 1, bx[2] - pad); x++) {
            const i = y * m.w + x; if (!m.bin[i]) continue;
            if ([0, 1, 2, 3, 4].some((k) => Math.abs(lineY(st, k, x) - y) <= m.thick / 2 + 1.5)) continue;
            const l = m.labels[i]; if (l && !all.has(l)) continue;
            ink++; if (l) got++;
          }
          if (ink && got < 0.93 * ink) { this.arcStats.kept++; continue; }
          const ids = [...all].filter((i) => !moving.has(i)); if (!ids.length) continue;
          ids.forEach((i) => moving.add(i)); erase.push(...ids);
          moves.push({ st, ids, dy: yOfP(st, a.p + dp, a.x) - yOfP(st, a.p, a.x), dots: [], stems: [] }); this.arcStats.moved++;
        }
      }
    }
    // old ledger lines of moved notes
    const ledger = this.m.ledgerPx;
    // (the ink a moved symbol had on staff lines goes too; the lines are restored below)
    const byStaff = new Map();
    for (const id of erase) { const c = m.comps[id]; if (!c) continue; const st = m.staves.find((q) => c.cy >= q.band[0] && c.cy < q.band[1]); if (st) { if (!byStaff.has(st)) byStaff.set(st, []); byStaff.get(st).push(id); } }
    const eraseMask = this.maskOf(erase, 0, ledger);
    for (const [st, ids] of byStaff) this.fillBands(eraseMask, ids, st);
    { const { w: W0, h: H0, bin } = m, o = new Uint8Array(eraseMask); for (let y = 1; y < H0 - 1; y++) for (let x = 1; x < W0 - 1; x++) { const i = y * W0 + x; if (!eraseMask[i] && (eraseMask[i - 1] || eraseMask[i + 1] || eraseMask[i - W0] || eraseMask[i + W0])) o[i] = 1; } eraseMask.set(o); }
    const eraseCanvas = this.maskCanvas(eraseMask);
    // ---- erase: refill with local paper colour, then restore staff lines under the cuts ----
    const lay = canvas(this.W, this.H), lc = lay.getContext('2d');
    lc.imageSmoothingEnabled = true;
    lc.drawImage(this.paper, 0, 0, this.W, this.H);
    // staff lines under the cuts: copy each line's own pixels in from the nearest uncut
    // columns on the same row (looks like the photo, unlike a synthetic stroke)
    const { w, h, thick } = m, D = this.smallData, fill = new ImageData(w, h), F = fill.data;
    const half = thick / 2 + 1.5;
    for (const st of m.staves) for (let k = 0; k < 5; k++) for (let x = st.x0; x <= st.x1; x++) {
      const yl = lineY(st, k, x);
      for (let y = Math.ceil(yl - half); y <= Math.floor(yl + half); y++) {
        const i = y * w + x; if (y < 0 || y >= h || !eraseMask[i]) continue;
        let xl = x, xr = x;
        while (xl > st.x0 && eraseMask[y * w + xl] && x - xl < 60) xl--;
        while (xr < st.x1 && eraseMask[y * w + xr] && xr - x < 60) xr++;
        const a = eraseMask[y * w + xl] ? null : y * w + xl, b = eraseMask[y * w + xr] ? null : y * w + xr;
        const t = a != null && b != null ? (x - xl) / (xr - xl) : a != null ? 0 : 1;
        const ia = a ?? b, ib = b ?? a; if (ia == null) continue;
        for (let q = 0; q < 3; q++) F[i * 4 + q] = D[ia * 4 + q] * (1 - t) + D[ib * 4 + q] * t;
        F[i * 4 + 3] = 255;
      }
    }
    const lines = canvas(w, h); lines.getContext('2d').putImageData(fill, 0, 0);
    lc.drawImage(lines, 0, 0, this.W, this.H);
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(eraseCanvas, 0, 0, this.W, this.H);
    ctx.drawImage(lay, 0, 0);

    // ---- key signature room: squeeze the rest of the line if the new key is wider ----
    // One squeeze per system (staves joined by barlines move together, or the bars would shear).
    const warps = (this.warps = new Map()), need = new Map();
    for (const sp of pl.staves) {
      const st = sp.st; if (!sp.keyChanged) continue;
      const S = spaceAt(st, st.key.x0), n = Math.abs(sp.fifths), step = (sp.fifths > 0 ? 1.0 : 0.9) * S;
      const want = n ? n * step + 0.4 * S : 0, nextX = this.nextAfterKey(st), have = nextX - st.key.x0 - 0.5 * S;
      const g = need.get(st.system) || { xs: 0, extra: 0, staves: [] };
      g.staves.push(st);
      if (want > have) { g.extra = Math.max(g.extra, want - have); g.xs = Math.max(g.xs, Math.max(st.key.x0, Math.min(nextX - 0.3 * S, st.key.x1 + 1))); }
      need.set(st.system, g);
    }
    for (const g of need.values()) {
      if (!(g.extra > 0)) continue;
      const all = m.staves.filter((s2) => s2.system === g.staves[0].system);
      const x1 = Math.max(...all.map((s2) => s2.x1)) + 2, xs = g.xs, extra = g.extra, k = (x1 - xs - extra) / (x1 - xs);
      const warp = (x) => (x < xs ? x : xs + extra + (x - xs) * k);
      const b0 = Math.min(...all.map((s2) => s2.band[0])), b1 = Math.max(...all.map((s2) => s2.band[1]));
      for (const s2 of all) warps.set(s2, { warp, k });
      const snap = canvas((x1 - xs) * r, (b1 - b0) * r);
      snap.getContext('2d').drawImage(ctx.canvas, xs * r, b0 * r, (x1 - xs) * r, (b1 - b0) * r, 0, 0, (x1 - xs) * r, (b1 - b0) * r);
      ctx.save(); ctx.beginPath(); ctx.rect(xs * r, b0 * r, (x1 - xs) * r, (b1 - b0) * r); ctx.clip();
      ctx.drawImage(this.paper, 0, 0, this.W, this.H);
      ctx.drawImage(snap, (xs + extra) * r, b0 * r, (x1 - xs) * k * r, (b1 - b0) * r);
      // the opened gap: stretch the strip's first column across it, so the staff lines
      // continue with exactly the photo's own weight and colour
      ctx.drawImage(snap, 0, 0, Math.max(1, Math.round(r)), snap.height, xs * r, b0 * r, extra * r + 1, (b1 - b0) * r);
      ctx.restore();
    }
    for (const sp of pl.staves) if (sp.keyChanged) this.drawKey(ctx, sp.st, sp, null, font);
    for (const sp of pl.staves) for (const k of sp.changes) if (k.fifths !== k.src || sp.clefChanged) this.drawKeyChange(ctx, sp.st, sp, k, warps.get(sp.st)?.warp, font);

    // ---- clefs ----
    for (const sp of pl.staves) {
      if (!sp.clefChanged) continue;
      const st = sp.st, x = st.clef.box ? st.clef.box[0] : st.x0 + 0.5 * 16, S = spaceAt(st, x);
      this.glyph(ctx, CLEF_GLYPH[sp.clef.sign], x, yOfP(st, (sp.clef.line - 1) * 2, x), S, font, null);
    }

    // ---- ledger lines + accidentals for the new pitches ----
    ctx.save(); ctx.strokeStyle = this.lineInk; ctx.lineWidth = m.thick * r * 1.15;
    for (const sp of pl.staves) {
      const st = sp.st, wp = warps.get(st), X = (x) => (wp ? wp.warp(x) : x);
      const done = new Set();
      for (const nn of sp.notes) {
        const n = nn.n, S = spaceAt(st, n.x), hw = n.box[2] - n.box[0];
        const qs = [];
        if (nn.p <= -2) for (let q = -2; q >= nn.p; q -= 2) qs.push(q);
        if (nn.p >= 10) for (let q = 10; q <= nn.p; q += 2) qs.push(q);
        for (const q of qs) {
          const key = n.chord + ':' + q; if (done.has(key)) continue; done.add(key);
          const xa = X(n.box[0] - 0.3 * S), xb = X(n.box[2] + 0.3 * S), y = yOfP(st, q, n.x) + (nn.p - n.p ? 0 : 0);
          ctx.beginPath(); ctx.moveTo(xa * r, y * r); ctx.lineTo(xb * r, y * r); ctx.stroke();
        }
        void hw;
      }
      // accidentals, stacked leftwards inside a chord
      const byChord = new Map();
      sp.notes.forEach((nn) => { if (nn.acc == null) return; (byChord.get(nn.n.chord) || byChord.set(nn.n.chord, []).get(nn.n.chord)).push(nn); });
      for (const nns of byChord.values()) {
        nns.sort((a, b) => b.p - a.p);
        const placed = [];
        for (const nn of nns) {
          const n = nn.n, S = spaceAt(st, n.x), name = ACC_GLYPH[nn.acc]; if (!name) continue;
          const gw = this.glyphWidth(name, S, font);
          let xr = Math.min(...sp.notes.filter((o) => o.n.chord === n.chord).map((o) => o.n.box[0])) - 0.2 * S;
          for (const p of placed) if (Math.abs(p.p - nn.p) < 6) xr = Math.min(xr, p.x - 0.15 * S);
          const x = xr - gw, y = yOfP(st, nn.p, n.x);
          this.glyph(ctx, name, x, y, S, font, wp ? wp.warp : null);
          placed.push({ p: nn.p, x });
        }
      }
    }
    ctx.restore();
    // ---- paste moved notes (after the ledger lines, so heads sit on top) ----
    for (const mv of moves) {
      const wp = warps.get(mv.st);
      this.paste(ctx, mv.ids, mv.dy, wp, mv.st, mv.stems, mv.heads);
      for (const d of mv.dots) this.paste(ctx, d.ids, d.dy, wp, mv.st);
    }
  }

  nextAfterKey(st) {
    // first symbol right of the key signature: time signature, first note or its accidental, barline
    const { comps, labels, w } = this.m, S = spaceAt(st, st.key.x0);
    const ya = lineY(st, 0, st.key.x0) - 0.2 * S, yb = lineY(st, 4, st.key.x0) + 0.2 * S, keyIds = new Set(st.key.ids);
    let best = st.x1;
    for (const c of comps) {
      if (!c || keyIds.has(c.id) || c.x0 <= st.key.x0 + 1 || c.x0 > best || c.y1 < ya || c.y0 > yb) continue;
      if (c.x1 - c.x0 < 0.15 * S && c.y1 - c.y0 < 0.3 * S) continue; // specks
      if (st.clef.box && c.x1 <= st.clef.box[2] + 1) continue;
      best = c.x0;
    }
    void labels; void w;
    return best;
  }

  drawKey(ctx, st, sp, warp, font) {
    const n = Math.abs(sp.fifths); if (!n) return;
    const S = spaceAt(st, st.key.x0), name = sp.fifths > 0 ? 'sharp' : 'flat';
    const ps = keySigPositions(sp.clef, sp.fifths), step = (sp.fifths > 0 ? 1.0 : 0.9) * S;
    let x = st.key.x0 + 0.3 * S;
    for (const p of ps) { this.glyph(ctx, name, x, yOfP(st, p, x), S, font, null); x += step; }
    void warp;
  }

  // A key change inside the staff, rewritten where the old one stood: naturals cancelling the
  // previous (target) key where the new one drops or flips its accidentals, then the new key.
  // It reuses the old glyphs' space; a longer signature runs towards the music.
  drawKeyChange(ctx, st, sp, k, warp, font) {
    const S = spaceAt(st, k.x0), X = warp || ((x) => x);
    const prev = keySigPositions(sp.clef, k.prev), next = keySigPositions(sp.clef, k.fifths);
    const keep = Math.sign(k.prev) === Math.sign(k.fifths) ? Math.min(prev.length, next.length) : 0;
    const nats = prev.slice(keep).filter(() => k.glyphs.some((g) => g.type === 0) || k.fifths === 0 || Math.sign(k.prev) !== Math.sign(k.fifths));
    const step = 0.95 * S;
    let x = X(k.x0);
    for (const p of nats) { this.glyph(ctx, 'natural', x, yOfP(st, p, x), S, font, null); x += step; }
    const name = k.fifths > 0 ? 'sharp' : 'flat';
    for (const p of next) { this.glyph(ctx, name, x, yOfP(st, p, x), S, font, null); x += step; }
  }

  paste(ctx, ids, dy, wp, st, stems = [], heads = []) {
    const { comps } = this.m, r = this.r;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const id of ids) { const c = comps[id]; if (!c) continue; x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); }
    if (x1 < 0) return;
    x0 -= 1; y0 -= 1; x1 += 1; y1 += 1;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const mask = this.cropCanvas(this.maskCrop(ids, 1, true, st, x0, y0, bw, bh), bw, bh);
    const tmp = canvas(bw * r, bh * r), t = tmp.getContext('2d');
    t.drawImage(this.src, x0 * r, y0 * r, bw * r, bh * r, 0, 0, bw * r, bh * r);
    t.globalCompositeOperation = 'destination-in'; t.imageSmoothingEnabled = true;
    t.drawImage(mask, 0, 0, bw * r, bh * r);
    // where a staff line crossed the symbol its pixels are darker (line + stem): replace each
    // line band with the rows just above it so the moved stem does not carry dark dots
    if (st && stems.length) {
      const half = this.m.thick / 2 + 1, snap = canvas(tmp.width, tmp.height); snap.getContext('2d').drawImage(tmp, 0, 0);
      for (let k = 0; k < 5; k++) {
        const yl = lineY(st, k, (x0 + x1) / 2); if (yl - half < y0 + 2 || yl + half > y1 - 2) continue;
        // (not where the line runs through a head: the rows above are the head's edge or paper)
        if (heads.some((b) => yl + half > b[1] - 1 && yl - half < b[3] + 1)) continue;
        const a = (yl - half - y0) * r, bandH = 2 * half * r;
        t.save(); t.beginPath(); for (const sx of stems) t.rect((sx - 2 - x0) * r, a, 5 * r, bandH); t.clip(); t.globalCompositeOperation = 'copy';
        t.drawImage(snap, 0, a - bandH, tmp.width, bandH, 0, a, tmp.width, bandH); t.restore();
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'darken';
    const X = wp ? wp.warp(x0) : x0, kx = wp ? wp.k : 1;
    ctx.drawImage(tmp, X * r, (y0 + dy) * r, bw * kx * r, bh * r);
    ctx.restore();
  }
}

// ---------- interpretation overlay ----------
const PC_COLOURS = ['#e6194b', '#f58231', '#ffe119', '#3cb44b', '#42d4f4', '#4363d8', '#911eb4'];
export function drawOverlay(ctx, model, r, pl, mode, sel) {
  ctx.save(); ctx.scale(r, r);
  ctx.lineWidth = 1.2 / r * 1.5;
  for (const st of model.staves) {
    ctx.strokeStyle = 'rgba(0,120,255,.55)';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let x = st.x0; x <= st.x1; x += 8) { const y = lineY(st, k, x); x === st.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,190,190,.9)'; ctx.lineWidth = 2;
    for (const b of st.bars) { ctx.beginPath(); ctx.moveTo(b.x, lineY(st, 0, b.x) - 4); ctx.lineTo(b.x, lineY(st, 4, b.x) + 4); ctx.stroke(); }
    if (st.clef.box) { ctx.strokeStyle = 'rgba(255,140,0,.9)'; const b = st.clef.box; ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
  }
  const sps = pl ? pl.staves : model.staves.map((st) => ({ st, notes: st.notes.map((n) => ({ n, p: n.p, name: n.name })) }));
  ctx.font = '600 9px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const sp of sps) {
    for (const nn of sp.notes) {
      const n = nn.n, st = sp.st, y = mode === 'transposed' ? yOfP(st, nn.p, n.x) : n.y;
      const pc = ((nn.pitch || n.pitch).d % 7 + 7) % 7;
      ctx.strokeStyle = PC_COLOURS[pc]; ctx.lineWidth = n === sel ? 3 : 1.6;
      ctx.beginPath(); ctx.ellipse(n.x, y, (n.box[2] - n.box[0]) / 2 + 2, 8, -0.35, 0, Math.PI * 2); ctx.stroke();
      if (n.accid && mode !== 'transposed') { ctx.strokeStyle = 'rgba(255,0,255,.8)'; ctx.lineWidth = 1; const b = n.accid.box; ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
      const label = nn.name.replace(/(\d)$/, '$1');
      const ly = n.stem && n.stem.dir < 0 ? y + 17 : y - 11;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(label, n.x, ly);
      ctx.fillStyle = '#123'; ctx.fillText(label, n.x, ly);
    }
  }
  ctx.restore();
}
export { pOfY };
