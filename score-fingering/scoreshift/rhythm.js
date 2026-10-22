// Rhythm symbols on the staff-removed page (pixel side, runs inside analyze in the worker):
//  - beams and flags on every stem -> the written value of each chord
//  - rests, time signatures and tuplet numbers, by template matching against the SMuFL glyphs
//    of five engraving fonts (glyphs.js), rasterized at the normalized staff space
//  - ties (arcs joining two heads at the same position) and grace notes (small heads)
// Results are annotations on the analysis model: note.dur/beams/flags/grace/tie, st.rests,
// st.times, st.tuplets. Measures and bar-fill repair are built from these in score.js.
import { GLYPHS } from './glyphs.js';
import { rasterGlyph, descriptor, shapeDistance } from './raster.js';
import { lineY, yOfP, pOfY, spaceAt, TARGET } from './omr.js';
import { classify } from './glyphnet.js';
import { DYN_TEMPLATES } from './dynamics.js';
import { shapeDistance as shapeDist } from './raster.js';

const CLASSES = {
  rest: ['restWhole', 'restQuarter', 'rest8th', 'rest16th', 'rest32nd'],
  digit: ['timeSig0', 'timeSig1', 'timeSig2', 'timeSig3', 'timeSig4', 'timeSig5', 'timeSig6', 'timeSig7', 'timeSig8', 'timeSig9'],
  meterSym: ['timeSigCommon', 'timeSigCutCommon'],
  tuplet: ['tuplet3', 'tuplet5', 'tuplet6'],
  bow: ['stringsDownBow', 'stringsUpBow'],
};
let TEMPLATES = null;
export function templates() {
  if (TEMPLATES) return TEMPLATES;
  TEMPLATES = [];
  for (const font of Object.keys(GLYPHS)) for (const [cls, names] of Object.entries(CLASSES)) for (const name of names) {
    const g = GLYPHS[font][name]; if (!g) continue;
    const r = rasterGlyph(g.d, TARGET), dsc = descriptor(r.m, r.w, r.h);
    if (dsc) TEMPLATES.push({ font, cls, name, dsc, hS: dsc.bh / TARGET, wS: dsc.bw / TARGET });
  }
  return TEMPLATES;
}

// best template of a class family for a component mask: { name, dist, cls }
function match(mask, cw, ch, families, S) {
  const d = descriptor(mask, cw, ch); if (!d) return null;
  let best = null; const all = {};
  for (const T of templates()) {
    if (!families.includes(T.cls)) continue;
    // size matters within a family (a 16th rest is taller than an 8th); across fonts it varies
    const dist = shapeDistance(d, T.dsc) + 0.25 * Math.abs(Math.log(d.bh / S / T.hS));
    if (!(T.name in all) || dist < all[T.name]) all[T.name] = dist;
    if (!best || dist < best.dist) best = { name: T.name, cls: T.cls, dist };
  }
  if (best) best.all = all; // best distance per glyph name
  return best;
}

// Meters that actually occur, for choosing between digit readings of similar distance
const COMMON_METERS = new Set(['2/2', '3/2', '4/2', '2/4', '3/4', '4/4', '5/4', '6/4', '3/8', '6/8', '9/8', '12/8', '5/8', '7/8', '2/8', '4/8', '6/16', '9/16', '12/16', '7/4', '1/4']);
function readMeter(top, bot) {
  if (!top.length || !bot.length || top.length > 2 || bot.length > 2 || [...top, ...bot].some((d) => !d)) return null;
  const opts = (ds) => { // candidate numbers with their worst digit distance
    let out = [['', 0]];
    for (const d of ds) { const nx = []; for (const [s, w] of out) for (let v = 0; v <= 9; v++) { const dist = d.all['timeSig' + v]; if (dist != null && dist < d.dist + 0.12) nx.push([s + v, Math.max(w, dist)]); } out = nx; }
    return out.filter(([s]) => s[0] !== '0');
  };
  let best = null;
  for (const [b, db] of opts(top)) for (const [u, du] of opts(bot)) {
    if (![1, 2, 4, 8, 16, 32].includes(+u)) continue;
    const dist = Math.max(db, du), score = dist + (COMMON_METERS.has(b + '/' + u) ? 0 : 0.1);
    if (!best || score < best.score) best = { beats: +b, unit: +u, dist, score };
  }
  return best && best.dist < 0.5 ? { beats: best.beats, unit: best.unit, dist: best.dist } : null;
}

const RARE_DYN = new Set(['rf', 'rfz', 'sffz', 'sfp']); // read only when clearly better
const REST_DUR = { restWhole: 1, restQuarter: 4, rest8th: 8, rest16th: 16, rest32nd: 32 };
const DIGIT = (name) => +name.slice(-1);

export function readRhythm({ w, h, S0, t, staves, notes, L, comps, accs, dots, headComps, bin, useNet = true, textIds = new Set() }) {
  const ink = (x, y) => x >= 0 && y >= 0 && x < w && y < h && L[y * w + x] > 0;
  // ---------------------------------------------------------------- stems: beams and flags
  // vertical ink runs in column x between y0 and y1 (either order), as [start, len] from y0
  const runs = (x, y0, y1) => {
    const dir = y1 >= y0 ? 1 : -1, out = []; let s = -1;
    for (let y = Math.round(y0), k = 0; dir > 0 ? y <= y1 : y >= y1; y += dir, k++) {
      if (ink(x, y)) { if (s < 0) s = k; } else if (s >= 0) { out.push([s, k - s]); s = -1; }
    }
    if (s >= 0) out.push([s, Math.round(Math.abs(y1 - y0)) + 1 - s]);
    return out;
  };
  // head widths per staff: grace notes are clearly smaller than the staff's typical head
  for (const st of staves) {
    const ws = notes.filter((n) => n.st === st && n.kind === 'black').map((n) => n.box[2] - n.box[0]).sort((a, b) => a - b);
    st.headW = ws.length ? ws[ws.length >> 1] : 1.2 * S0;
  }
  const chords = new Map();
  for (const n of notes) { const k = n.st.index + ':' + n.chord; if (!chords.has(k)) chords.set(k, []); chords.get(k).push(n); }
  for (const ch of chords.values()) {
    const st = ch[0].st, S = spaceAt(st, ch[0].x);
    const withStem = ch.filter((n) => n.stem);
    // grace (cue) notes: smaller heads on shorter stems than the staff's own
    const grace = withStem.length > 0 && ch.every((n) => n.small || n.box[2] - n.box[0] < 0.86 * st.headW) && Math.max(...withStem.map((n) => n.stem.len)) < (ch.every((n) => n.small) ? 2.75 : 2.7) * S;
    let dur, beams = 0, flags = 0, beamed = false;
    if (!withStem.length) dur = 1;
    else if (ch.every((n) => n.kind === 'half')) dur = 2;
    else {
      const dir = withStem[0].stem.dir, sx = withStem[0].stem.x;
      const tip = dir < 0 ? Math.min(...withStem.map((n) => n.stem.tip)) : Math.max(...withStem.map((n) => n.stem.tip));
      const near = Math.min(...ch.map((n) => Math.abs(n.y - tip))); // head closest to the tip
      // scan from just beyond the tip toward the heads, stopping a space short of them
      const a = tip + dir * 0.25 * S, len = Math.max(0, near - 1.0 * S + 0.25 * S), b = a - dir * len;
      const k = (r) => Math.max(1, Math.round((r + 0.25 * S) / (0.75 * S)));
      const side = (sd) => {
        const cols = [0.6, 1.1, 1.6].map((o) => runs(Math.round(sx + sd * o * S), a, b).filter((r) => r[1] >= 0.3 * S));
        const isBeam = cols.every((c) => c.length && c[0][0] <= 1.4 * S);
        // beams stack from the stem end, a quarter space apart: a run further off (a slur
        // passing over the beam) ends the stack
        let count = 0, end = -Infinity;
        for (const r of cols[0]) { if (r[0] > 3.2 * S || (count && r[0] - end > 0.33 * S)) break; if (r[1] < 0.36 * S) continue; count += k(r[1]); end = r[0] + r[1]; }
        return { isBeam, count };
      };
      const L_ = side(-1), R_ = side(1);
      if (L_.isBeam || R_.isBeam) { beamed = true; beams = Math.max(L_.isBeam ? L_.count : 0, R_.isBeam ? R_.count : 0); }
      else { // flags hang on the right of the stem, one crossing each in a column beside it
        flags = Math.max(...[0.55, 0.75, 0.95].map((o) => runs(Math.round(sx + o * S), a, b).filter((r) => r[1] >= 0.2 * S && r[0] <= 2.2 * S).length));
      }
      dur = 4 * 2 ** Math.min(3, beams + flags);
    }
    // a head found only by the small-head pass must look like a grace note: short stem with a
    // flag, beam or slash; anything else there is a fragment (flag piece, dot, letter) and is dropped
    // ... and must not sit against another note's stem (beam stubs, flags of a full-size note)
    const onStem = ch.some((n) => notes.some((o) => !o.small && o.stem && o.st === st && o.stem.x >= n.box[0] - 0.45 * S && o.stem.x <= n.box[2] + 0.45 * S &&
      n.y > Math.min(o.y, o.stem.tip) - 0.3 * S && n.y < Math.max(o.y, o.stem.tip) + 0.3 * S));
    if (ch.every((n) => n.small) && (!grace || (!flags && !beamed) || onStem)) { for (const n of ch) n.dropSmall = true; continue; }
    // a small head in a chord with full-size ones is a fragment beside the chord, never a note
    if (ch.some((n) => n.small) && ch.some((n) => !n.small)) for (const n of ch) if (n.small) n.dropSmall = true;
    // acciaccatura (slashed) or appoggiatura: a slash crosses the grace stem, so there is ink on
    // the side of the stem away from the flag, between the head and the stem end
    let slash = null;
    if (grace) {
      const n = withStem[0], sm = n.stem, side = sm.dir < 0 ? -1 : 1; // flags hang right of an up-stem
      const ya = Math.min(n.y + sm.dir * 0.55 * S, sm.tip), yb = Math.max(n.y + sm.dir * 0.55 * S, sm.tip);
      let ink = 0;
      for (let y = Math.round(ya); y <= Math.round(yb); y++) {
        if ([0, 1, 2, 3, 4].some((k) => Math.abs(lineY(st, k, sm.x) - y) <= t / 2 + 1.5)) continue; // (staff lines, ledgers aside)
        for (let x = Math.round(sm.x + side * 0.7 * S); side < 0 ? x <= sm.x - 2 : x >= sm.x + 2; x -= side) { const l = L[y * w + x]; if (l || (bin && bin.data[y * w + x])) ink++; }
      }
      slash = ink >= Math.max(2, 0.007 * S * S); // (a slash is thin: a few pixels clear of the stem)
    }
    const nd = Math.min(2, Math.max(0, ...ch.map((n) => (n.dots || []).length)));
    for (const n of ch) Object.assign(n, { dur, dots: n.dots, ndots: nd, beams, flags, beamed, grace, graceKind: grace ? (slash ? 'acc' : 'app') : undefined });
  }

  for (let k = notes.length - 1; k >= 0; k--) if (notes[k].dropSmall) { const n = notes[k], i = n.st.notes.indexOf(n); if (i >= 0) n.st.notes.splice(i, 1); headComps.delete(n.comp); notes.splice(k, 1); }
  // ---------------------------------------------------------------- free symbols
  const used = new Set([...headComps, ...textIds]); // (letters of words are never rests, digits or marks)
  for (const st of staves) { st.key.ids.forEach((i) => used.add(i)); (st.keyChanges || []).forEach((k) => k.ids.forEach((i) => used.add(i))); st.bars.forEach((b) => b.ids.forEach((i) => used.add(i))); (st.clef.ids || []).forEach((i) => used.add(i)); }
  // accidentals that belong to a note (an unattached "flat" is often an 8th rest)
  for (const n of notes) n.accid?.ids.forEach((i) => used.add(i));
  for (const n of notes) n.dots?.forEach((d) => d.ids.forEach((i) => used.add(i)));
  const staffOf = (c) => staves.find((st) => c.cx >= st.x0 - S0 && c.cx <= st.x1 + S0 && c.cy >= st.band[0] && c.cy < st.band[1]);
  // mask of a component or a group (c.ids); rows a removed staff line cut out of a symbol are
  // filled back where there is ink just above and just below them
  const maskOf = (c) => {
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, m = new Uint8Array(cw * ch), ids = c.ids || [c.id];
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (ids.includes(L[y * w + x])) m[(y - c.y0) * cw + x - c.x0] = 1;
    if (ids.length > 1) {
      const gap = Math.ceil(t) + 3;
      for (let x = 0; x < cw; x++) for (let y = 1; y < ch; y++) {
        if (m[y * cw + x] || !m[(y - 1) * cw + x]) continue;
        let e = y; while (e < ch && !m[e * cw + x] && e - y < gap) e++;
        if (e < ch && m[e * cw + x]) for (let k = y; k < e; k++) m[k * cw + x] = 1;
      }
    }
    return { m, cw, ch };
  };
  // a hairpin: two thin strokes meeting at one end; the open end has two ink runs a good half
  // space apart, the closed end one, the middle two
  const hairpinForm = (c, S) => {
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1;
    if (cw < 2.5 * S || ch > 1.8 * S || ch < 0.35 * S || c.n / (cw * ch) > 0.45) return null;
    // the gap between the two strokes grows steadily from one end to the other
    const M = maskOf(c).m, at = (fx) => { const x = Math.min(cw - 1, Math.max(0, Math.round(fx * (cw - 1)))); let a = -1, b = -1, n = 0, inside = false; for (let y = 0; y < ch; y++) { const v = M[y * cw + x]; if (v) { if (a < 0) a = y; b = y; if (!inside) n++; } inside = !!v; } return { n, span: a < 0 ? null : b - a }; };
    const xs = [0.12, 0.3, 0.5, 0.7, 0.88].map(at);
    if (xs.some((q) => q.span == null) || at(0.5).n !== 2) return null;
    const sp = xs.map((q) => q.span), inc = sp.every((v, i) => !i || v >= sp[i - 1] - 1), dec = sp.every((v, i) => !i || v <= sp[i - 1] + 1);
    const lo = Math.min(sp[0], sp[4]), hi = Math.max(sp[0], sp[4]);
    if (hi - lo < 0.45 * S || lo > 0.45 * S) return null;
    return inc && sp[4] > sp[0] ? 'cresc' : dec && sp[0] > sp[4] ? 'dim' : null;
  };
  // an accent wedge (or a small hairpin): two strokes meeting at a point, so one end of the box
  // has two separate runs of ink a column, the other one; an arc has one run in every column
  const wedgeForm = (c, S) => {
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1;
    if (cw > 2.5 * S || ch < 0.3 * S) return false;
    const M = maskOf(c).m, runs = (x) => { let n = 0, inside = false; for (let y = 0; y < ch; y++) { const v = M[y * cw + x]; if (v && !inside) n++; inside = !!v; } return n; };
    const two = (a, b) => { let k = 0, t = 0; for (let x = Math.round(a * (cw - 1)); x <= Math.round(b * (cw - 1)); x++) { t++; if (runs(x) >= 2) k++; } return k / Math.max(1, t); };
    const L = two(0, 0.3), R = two(0.7, 1);
    return (L > 0.6 && R < 0.3) || (R > 0.6 && L < 0.3);
  };
  for (const st of staves) { st.rests = []; st.times = []; st.tuplets = []; }
  readTimes();
  const arcs = [];
  // Time signatures: right after the key signature, or right after a barline. The two digits
  // touch the middle line, so staff removal fuses them (and can split one): read the ink of
  // the region as a top half and a bottom half, each a number of column-separated digits.
  // A second pass at the start of a staff lets the digits take components already read as
  // noteheads (a 4's closed triangle passes for a filled head); those notes are then dropped.
  function readTimes() {
    const fixed = new Set(); // key signatures, barlines, clefs: never part of a time signature
    for (const st of staves) { st.key.ids.forEach((i) => fixed.add(i)); (st.keyChanges || []).forEach((k) => k.ids.forEach((i) => fixed.add(i))); st.bars.forEach((b) => b.ids.forEach((i) => fixed.add(i))); (st.clef.ids || []).forEach((i) => fixed.add(i)); }
    for (const st of staves) {
      const S = spaceAt(st, st.x0), anchors = [st.key.x1 + 1, ...st.bars.map((b) => b.x1 + 1)];
      for (const [ai, ax] of anchors.entries()) for (const heads of ai === 0 ? [false, true] : [false]) {
        if (heads && st.times.length) continue;
        const firstNote = heads ? st.x1 : Math.min(st.x1, ...st.notes.filter((n) => n.box[0] > ax).map((n) => n.box[0] - 0.2 * S));
        const xl = ax, xr = Math.min(firstNote, ax + 4.5 * S);
        const yt = lineY(st, 0, ax), yb = lineY(st, 4, ax), ym = lineY(st, 2, ax);
        const cl = comps.filter((c) => c && (!used.has(c.id) || (heads && !fixed.has(c.id))) && c.x0 >= xl - 0.2 * S && c.x0 < xr && c.x1 < xr + 2 * S && c.y1 > yt - 0.6 * S && c.y0 < yb + 0.6 * S && c.y1 - c.y0 < 7.5 * S);
        if (!cl.length) continue;
        // keep the run of glyphs starting at the anchor (no wide gaps)
        cl.sort((a, b) => a.x0 - b.x0);
        const grp = []; let gx = xl;
        for (const c of cl) { if (c.x0 - gx > 1.2 * S) break; grp.push(c); gx = Math.max(gx, c.x1); }
        if (!grp.length) continue;
        const X0 = Math.min(...grp.map((c) => c.x0)), X1 = Math.max(...grp.map((c) => c.x1)), Y0 = Math.min(...grp.map((c) => c.y0)), Y1 = Math.max(...grp.map((c) => c.y1));
        if (X1 - X0 > 3.6 * S || Y1 - Y0 < 1.5 * S) continue;
        const ids = new Set(grp.map((c) => c.id));
        const half = (ya, yz) => { // one number in rows [ya, yz): one digit, or two side by side
          ya = Math.round(ya); yz = Math.round(yz);
          const cw = X1 - X0 + 1, ch = Math.max(1, yz - ya), m = new Uint8Array(cw * ch), colInk = new Uint16Array(cw);
          for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const yy = ya + y; if (yy >= 0 && yy < h && ids.has(L[yy * w + X0 + x])) { m[y * cw + x] = 1; colInk[x]++; } }
          const cut = (s0, s1) => { const dw = s1 - s0, dm = new Uint8Array(dw * ch); for (let y = 0; y < ch; y++) for (let k = 0; k < dw; k++) dm[y * dw + k] = m[y * cw + s0 + k]; return match(dm, dw, ch, ['digit'], S); };
          const pieces = []; let x = 0;
          while (x < cw) { while (x < cw && colInk[x] === 0) x++; if (x >= cw) break; const s0 = x; while (x < cw && colInk[x] > 0) x++; pieces.push([s0, x]); }
          if (!pieces.length) return [];
          const one = [cut(pieces[0][0], pieces[pieces.length - 1][1])];
          // two digits: split at the widest gap, both halves digit-sized
          let two = null;
          if (pieces.length >= 2) {
            let g = 1; for (let k = 2; k < pieces.length; k++) if (pieces[k][0] - pieces[k - 1][1] > pieces[g][0] - pieces[g - 1][1]) g = k;
            const a = [pieces[0][0], pieces[g - 1][1]], b = [pieces[g][0], pieces[pieces.length - 1][1]];
            if (a[1] - a[0] >= 0.45 * S && b[1] - b[0] >= 0.45 * S) two = [cut(...a), cut(...b)];
          }
          const worst = (ds) => Math.max(...ds.map((d) => (d ? d.dist : 9)));
          return two && worst(two) < worst(one) ? two : one;
        };
        const top = half(Math.min(Y0, yt - 0.3 * S), ym), bot = half(ym, Math.max(Y1, yb + 0.3 * S) + 1);
        let tsig;
        tsig = readMeter(top, bot);
        if (tsig && ai > 0 && tsig.dist > 0.42) tsig = null; // a change mid-staff must read cleanly
        if (!tsig && Y1 - Y0 > 1.6 * S && Y1 - Y0 < 2.7 * S && X1 - X0 > 1.0 * S && X1 - X0 < 2.4 * S && Math.abs((Y0 + Y1) / 2 - ym) < 0.6 * S) { // C, cut C
          const cw = X1 - X0 + 1, ch = Y1 - Y0 + 1, m = new Uint8Array(cw * ch);
          for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) if (ids.has(L[y * w + x])) m[(y - Y0) * cw + x - X0] = 1;
          const g = match(m, cw, ch, ['meterSym', 'digit', 'rest'], S);
          if (g && g.cls === 'meterSym' && g.dist < (ai ? 0.3 : 0.4)) tsig = g.name === 'timeSigCommon' ? { beats: 4, unit: 4, sym: 'common', dist: g.dist } : { beats: 2, unit: 2, sym: 'cut', dist: g.dist };
        }
        if (!tsig) continue;
        if (heads && tsig.dist > 0.36) continue;
        // the stroke of a cut C passes for a barline
        if (tsig.sym === 'common') { const k = st.bars.findIndex((b) => Math.abs(b.x - (X0 + X1) / 2) < 0.3 * (X1 - X0)); if (k >= 0) { tsig = { beats: 2, unit: 2, sym: 'cut' }; grp.push(...st.bars[k].ids.map((i) => comps[i])); st.bars.splice(k, 1); } }
        for (const c of grp) ids.add(c.id);
        st.times.push({ x: (X0 + X1) / 2, x0: X0, x1: X1, ...tsig, ids: [...ids] });
        for (const i of ids) used.add(i);
        // accidentals in it are gone with it, notes are dropped
        for (let k = accs.length - 1; k >= 0; k--) if (accs[k].c.ids.some((i) => ids.has(i))) accs.splice(k, 1);
        if (heads) for (let k = notes.length - 1; k >= 0; k--) if (ids.has(notes[k].comp)) { st.notes.splice(st.notes.indexOf(notes[k]), 1); headComps.delete(notes[k].comp); notes.splice(k, 1); }
      }
    }
  }
  // pieces of one symbol split by staff-line removal: overlapping columns, a line-thick gap
  // between them at a staff line
  const free = comps.filter((c) => c && (!used.has(c.id) || textIds.has(c.id)) && c.n >= 3).sort((a, b) => a.y0 - b.y0);
  const parent = new Map(free.map((c) => [c.id, c]));
  const root = (c) => { while (parent.get(c.id) !== c) c = parent.get(c.id); return c; };
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    const a = free[i], b = free[j];
    if (b.y0 - a.y1 > Math.ceil(t) + 3) continue;
    if (b.y0 < a.y1 - 2 || Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) < 0.25 * Math.min(a.x1 - a.x0 + 1, b.x1 - b.x0 + 1)) continue;
    const st = staffOf(b); if (!st) continue;
    const yg = (a.y1 + b.y0) / 2;
    if (b.y0 - a.y1 > 1 && ![0, 1, 2, 3, 4].some((k) => Math.abs(lineY(st, k, (b.x0 + b.x1) / 2) - yg) <= t + 1)) continue; // (or touching corners)
    const ra = root(a), rb = root(b); if (ra !== rb) parent.set(rb.id, ra);
  }
  const groups = new Map();
  for (const c of free) { const r = root(c); if (!groups.has(r.id)) groups.set(r.id, []); groups.get(r.id).push(c); }
  const syms = [...groups.values()].map((cs) => cs.length === 1 ? cs[0] : {
    id: cs[0].id, ids: cs.map((c) => c.id), x0: Math.min(...cs.map((c) => c.x0)), y0: Math.min(...cs.map((c) => c.y0)), x1: Math.max(...cs.map((c) => c.x1)), y1: Math.max(...cs.map((c) => c.y1)),
    n: cs.reduce((s, c) => s + c.n, 0), cx: cs.reduce((s, c) => s + c.cx * c.n, 0) / cs.reduce((s, c) => s + c.n, 0), cy: cs.reduce((s, c) => s + c.cy * c.n, 0) / cs.reduce((s, c) => s + c.n, 0) });
  // Articulations: staccato dot, tenuto dash, accent wedge, centred on a chord, beyond its
  // outermost head on the side away from the stem (or past a whole note, either side), within
  // 2.6 spaces (accents 3.4, they go above the staff); an accent may also sit beyond the stem end. Read before the other free
  // symbols so the dots and dashes are not taken for anything else.
  for (const n of notes) { n.artic = []; n.articIds = []; n.bowIds = []; }
  const marked = new Set(); // components taken as articulations (never words or dynamics)
  const chordsOf = new Map(); for (const n of notes) { const k = n.st.index + ':' + n.chord; if (!chordsOf.has(k)) chordsOf.set(k, []); chordsOf.get(k).push(n); }
  const markKind = (c, S) => {
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, W = cw / S, H = ch / S, fill = c.n / (cw * ch);
    if (W >= 0.2 && W <= 0.6 && H >= 0.2 && H <= 0.75 && fill > 0.5 && W / H > 0.6 && W / H < 1.7) return "stacc";
    if (W >= 0.65 && W <= 1.7 && ch <= Math.max(0.36 * S, 2.2 * t + 2) && H >= 0.08 && fill > 0.7) return 'ten';
    if (W >= 0.75 && W <= 1.9 && H >= 0.4 && H <= 1.45 && fill > 0.12 && fill < 0.6) {
      // a wedge opening left: the right end's ink sits at mid height, the left end's at top and bottom
      const M = maskOf(c).m, col = (fx) => { const x = Math.min(cw - 1, Math.round(fx * (cw - 1))), ys = []; for (let y = 0; y < ch; y++) if (M[y * cw + x]) ys.push(y / (ch - 1)); return ys; };
      const r = col(0.95), l = col(0.05), mid = (ys) => ys.length && ys.every((y) => y > 0.25 && y < 0.75), ends = (ys) => ys.some((y) => y < 0.3) && ys.some((y) => y > 0.7) && !ys.some((y) => y > 0.4 && y < 0.6);
      if (mid(r) && ends(l)) return 'acc';
    }
    // bowing: a down-bow (a bar with two legs, open below) or an up-bow (a V), about a space
    // wide; told apart by template against the SMuFL glyphs of the five fonts, and by shape:
    // a down-bow's top row is solid across, an up-bow's bottom is one narrow point
    if (W >= 0.55 && W <= 1.7 && H >= 0.6 && H <= 2.4 && fill > 0.1 && fill < 0.7) {
      const M = maskOf(c).m, row = (fy) => { const y = Math.min(ch - 1, Math.round(fy * (ch - 1))); let n = 0; for (let x = 0; x < cw; x++) n += M[y * cw + x]; return n / cw; };
      const g = match(M, cw, ch, ['bow'], S);
      const top = Math.max(row(0.04), row(0.1)), bot = Math.max(row(0.94), row(0.99)), mid = row(0.6);
      const dn = top > 0.75 && bot < 0.6 && mid < 0.6, up = top < 0.75 && bot < 0.45 && row(0.1) > bot;
      if (g) c.bowDist = g.dist;
      if (g && g.dist < 0.42 && g.name === 'stringsDownBow' && dn) return 'dnbow';
      if (g && g.dist < 0.42 && g.name === 'stringsUpBow' && up && !dn) return 'upbow';
    }
    return null;
  };
  const BOW = new Set(['upbow', 'dnbow']);
  // two passes: bowing marks first, then dots, dashes and accents, which may sit beyond a bowing
  // mark (stacked marks)
  for (const pass of [0, 1]) for (const c of syms) {
    if (!c) continue;
    // (bowing marks above the staff can be grouped into a "word" with each other: take them back)
    const textOnly = (c.ids || [c.id]).every((i) => textIds.has(i));
    if (used.has(c.id) && !textOnly) continue;
    const st = staffOf(c); if (!st) continue;
    const S = spaceAt(st, c.cx), kind = markKind(c, S); if (!kind || (textOnly && !BOW.has(kind)) || BOW.has(kind) !== (pass === 0)) continue;
    // (a letter of a word that passes for a bowing mark must look like one clearly: c, r, n)
    if (textOnly && c.bowDist > 0.32) continue;
    let best = null;
    // a bowing mark above the stems of the staff below lies in the band of the staff above:
    // look there too
    // (not when it hangs just under this staff: there it is more likely a piece of its stems)
    const k0 = staves.indexOf(st), below = c.y0 - lineY(st, 4, c.cx) > 1.5 * S;
    const bowStaves = BOW.has(kind) && below ? [st, staves[k0 + 1]].filter(Boolean) : [st];
    for (const ns of chordsOf.values()) {
      if (!bowStaves.includes(ns[0].st) || ns.every((n) => n.grace)) continue; // (a grace note's slash and slur pieces are not marks)
      if (BOW.has(kind)) {
        // above the chord's highest point (head or stem end) and above the staff, centred on it
        // (over the head, or over an up-stem's end)
        const x = ns.reduce((q, n) => q + n.x, 0) / ns.length, sx = ns.find((n) => n.stem && n.stem.dir < 0)?.stem.x;
        const off = Math.min(Math.abs(c.cx - x), sx != null ? Math.abs(c.cx - sx) : Infinity);
        if (off > 0.8 * S) continue;
        const st = ns[0].st;
        const hi = Math.min(...ns.flatMap((n) => [n.y, n.stem ? n.stem.tip : n.y]), lineY(st, 0, x));
        const d = hi - c.y1;
        if (d < 0.1 * S || d > 3.2 * S) continue;
        if (!best || off + 0.1 * d < best.d) best = { d: off + 0.1 * d, ns };
        continue;
      }
      const x = ns.reduce((q, n) => q + n.x, 0) / ns.length;
      if (Math.abs(c.cx - x) > (kind === 'stacc' ? 0.5 : 0.7) * S) continue;
      const stem = ns.find((n) => n.stem)?.stem, top = Math.min(...ns.map((n) => n.y)), bot = Math.max(...ns.map((n) => n.y));
      // head side: below when the stem goes up, above when it goes down; past the stem end otherwise
      const sides = stem ? (stem.dir < 0 ? [c.cy - bot, top - c.cy - (top - stem.tip)] : [top - c.cy, c.cy - bot - (stem.tip - bot)]) : [c.cy - bot, top - c.cy];
      // (dots and dashes beyond the stem end are mostly pieces of tuplet numbers and fingerings)
      const d = kind === 'acc' || !stem ? Math.max(...sides) : sides[0];
      // beyond a bowing mark already on this chord, on the same side: allowed further away
      const bow = ns.find((n) => n.bowBox)?.bowBox, past = bow && c.y1 <= bow[1] + 0.3 * S ? bow[3] - bow[1] + 0.8 * S : 0;
      if (d < 0.45 * S || d > (kind === "acc" ? 3.4 : 2.6) * S + past) continue;
      if (!best || d < best.d) best = { d, ns };
    }
    if (!best) continue;
    for (const n of best.ns) { if (!n.artic.includes(kind)) n.artic.push(kind); if (BOW.has(kind)) { n.bowBox = [c.x0, c.y0, c.x1, c.y1]; (n.bowIds ||= []).push(...(c.ids || [c.id])); } else (n.articIds ||= []).push(...(c.ids || [c.id])); }
    used.add(c.id); (c.ids || [c.id]).forEach((i) => { used.add(i); marked.add(i); });
  }
  // ---------------------------------------------------------------- dynamics and words
  // Expression text outside the staff: components grouped into words (similar height band,
  // gaps under half a space), each word matched against the dynamics and expression-word templates.
  // A dynamic that matches clearly better than any word attaches to the chord it starts under.
  for (const st of staves) { st.dynamics = []; st.words = []; }
  const isText = (c) => (c.ids || [c.id]).some((i) => textIds.has(i));
  const cand = syms.filter((c) => c && (!used.has(c.id) || isText(c)) && !headComps.has(c.id) && !(c.ids || [c.id]).some((i) => marked.has(i))).filter((c) => {
    const st = staffOf(c); if (!st) return false;
    const S = spaceAt(st, c.cx), H = (c.y1 - c.y0 + 1) / S, W = (c.x1 - c.x0 + 1) / S;
    if (H < 0.35 || H > 3.2 || W > 3.8) return false;
    // (ties, slurs and hairpins are not text: thin, wide, mostly empty boxes)
    const fill = c.n / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1));
    if (!isText(c) && W >= 0.9 && H <= Math.max(1.4, 0.35 * W) && fill < 0.5 && c.n / (c.x1 - c.x0 + 1) < 0.45 * S) return false;
    return (c.y0 > lineY(st, 4, c.cx) - 0.1 * S && c.cy > lineY(st, 4, c.cx) + 0.6 * S) || (c.y1 < lineY(st, 0, c.cx) + 0.1 * S && c.cy < lineY(st, 0, c.cx) - 0.6 * S);
  }).sort((a, b) => a.x0 - b.x0);
  // A dynamic touching a stem that runs below (or above) the staff is part of that note's
  // component: cut the stem's columns out and take what is left beyond the staff as candidates.
  for (const n of notes) {
    const sm = n.stem; if (!sm || n.chord == null) continue;
    const st = n.st, S = spaceAt(st, n.x), yb = lineY(st, 4, sm.x), yt = lineY(st, 0, sm.x);
    const lo = sm.dir > 0 ? Math.max(yb + 0.5 * S, n.y + 0.8 * S) : sm.tip - 2.5 * S, hi = sm.dir > 0 ? sm.tip + 2.5 * S : Math.min(yt - 0.5 * S, n.y - 0.8 * S);
    if (hi - lo < 0.8 * S) continue;
    const x0 = Math.round(sm.x - 2.2 * S), x1 = Math.round(sm.x + 2.2 * S), px = [];
    for (let y = Math.round(lo); y <= Math.round(hi); y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= w || y < 0 || y >= h || L[y * w + x] !== n.comp || Math.abs(x - sm.x) <= Math.ceil(t) + 1) continue;
      // (not a beam: long horizontal runs)
      let a = x, b = x; while (a > 0 && L[y * w + a - 1] === n.comp && x - a < 2 * S) a--; while (b < w - 1 && L[y * w + b + 1] === n.comp && b - x < 2 * S) b++;
      if (b - a > 1.3 * S) continue;
      px.push([x, y]);
    }
    if (px.length < 0.25 * S * S) continue;
    const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]);
    const q = { id: -n.comp, px, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), n: px.length };
    q.cx = (q.x0 + q.x1) / 2; q.cy = (q.y0 + q.y1) / 2;
    if ((q.y1 - q.y0) / S < 0.8 || (q.x1 - q.x0) / S < 0.5 || cand.some((c) => c.id === q.id)) continue;
    cand.push(q);
  }
  cand.sort((a, b) => a.x0 - b.x0);
  const taken = new Set();
  for (const c0 of cand) {
    if (taken.has(c0)) continue;
    const st = staffOf(c0), S = spaceAt(st, c0.cx), word = [c0];
    let box = [c0.x0, c0.y0, c0.x1, c0.y1];
    for (const q of cand) {
      if (taken.has(q) || word.includes(q) || staffOf(q) !== st || q.x0 < box[0]) continue;
      if (q.x0 - box[2] > 0.5 * S) continue;
      const ov = Math.min(box[3], q.y1) - Math.max(box[1], q.y0);
      if (ov < 0.3 * Math.min(box[3] - box[1], q.y1 - q.y0)) continue;
      word.push(q); box = [Math.min(box[0], q.x0), Math.min(box[1], q.y0), Math.max(box[2], q.x1), Math.max(box[3], q.y1)];
    }
    word.forEach((q) => taken.add(q));
    const cw = box[2] - box[0] + 1, ch = box[3] - box[1] + 1, m = new Uint8Array(cw * ch), ids = new Set(word.filter((q) => !q.px).flatMap((q) => q.ids || [q.id]));
    for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) if (ids.has(L[y * w + x])) m[(y - box[1]) * cw + x - box[0]] = 1;
    for (const q of word) if (q.px) for (const [x, y] of q.px) m[(y - box[1]) * cw + x - box[0]] = 1;
    const d = descriptor(m, cw, ch); if (!d) continue;
    let bestD = null, bestW = null;
    for (const T of DYN_TEMPLATES) {
      const dist = shapeDist(d, { g: T.g, bw: T.ar, bh: 1 }) + (T.hS ? 0.2 * Math.abs(Math.log(d.bh / S / T.hS)) : 0);
      if (T.dyn) { const dd = dist + (RARE_DYN.has(T.text) ? 0.05 : 0); if (!bestD || dd < bestD.dist) bestD = { text: T.text, dist: dd }; } else if (!bestW || dist < bestW.dist) bestW = { text: T.text, dist };
    }
    // a lone digit (a tuplet number, a fingering) is not a word
    if (word.length === 1) { const gd = match(m, cw, ch, ['tuplet', 'digit'], S); if (gd && (!bestD || gd.dist < bestD.dist + 0.03)) { word.forEach((q) => taken.delete(q)); continue; } }
    const below = box[1] > lineY(st, 4, (box[0] + box[2]) / 2) - 0.2 * S;
    if (globalThis.DYN) globalThis.DYN.push({ st: st.index, box, d: bestD, w: bestW });
    if (bestD && bestD.dist < 0.3 && (!bestW || bestD.dist < bestW.dist - 0.02) && (box[3] - box[1]) / S < 3.3) {
      // the chord at (or the first after) the dynamic's left part
      let n = null; for (const q of st.notes) if (q.x > box[0] - 1.0 * S && (!n || q.x < n.x)) n = q;
      st.dynamics.push({ text: bestD.text, dist: bestD.dist, box, note: n, below, ids: [...ids] });
    } else if (word.length >= 2 || (bestW && bestW.dist < 0.3)) st.words.push({ box, guess: bestW?.text, ids: [...ids] });
    ids.forEach((i) => used.add(i));
  }
  for (const c of syms) {
    if (!c || used.has(c.id)) continue;
    const st = staffOf(c); if (!st) continue;
    const S = spaceAt(st, c.cx), cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1, W = cw / S, H = ch / S;
    const yt = lineY(st, 0, c.cx), yb = lineY(st, 4, c.cx), fill = c.n / (cw * ch);
    if (st.clef.box && c.x1 < st.clef.box[2]) continue;
    const inside = c.cy > yt - 0.5 * S && c.cy < yb + 0.5 * S;
    // arcs (ties and slurs): wide, flat, thin
    // (a short flat tie fills most of its box; what makes an arc is that it is thin)
    // (a grace note's slur into its note is short)
    const nearGrace = W >= 0.6 && notes.some((n) => n.grace && n.st === st && Math.abs(n.x - c.x0) < 1.3 * S && Math.abs(n.y - c.cy) < 1.6 * S);
    if ((W >= 0.9 || nearGrace) && H <= Math.max(1.4, 0.4 * W) && (fill < 0.5 || (H <= 0.75 && fill < 0.9)) && c.n / cw < 0.45 * S && !hairpinForm(c, S) && !wedgeForm(c, S)) { arcs.push({ st, c }); continue; }
    // a group joined across a staff line can hold an arc and something that only touched the
    // same line (a staccato dot, a stem end): an arc among its members is still an arc
    if (c.ids && c.ids.length > 1 && W >= 0.9) {
      const arcMember = (q) => { const qw = q.x1 - q.x0 + 1, qh = q.y1 - q.y0 + 1, qW = qw / S, qH = qh / S, qf = q.n / (qw * qh);
        return qW >= 1.3 && qH <= Math.max(1.4, 0.4 * qW) && (qf < 0.5 || (qH <= 0.75 && qf < 0.9)) && q.n / qw < 0.45 * S && !hairpinForm(q, S) && !wedgeForm(q, S); };
      const ms = c.ids.map((i) => comps[i]).filter((q) => q && arcMember(q));
      if (ms.length) { for (const q of ms) arcs.push({ st, c: q }); continue; }
    }
    // steep arcs: a slur joining two voices runs nearly vertically, from a bass note up to the
    // melody (or down), so it is taller than it is wide; read along its long axis it is one
    // thin run per row, bowing to one side of the line between its ends
    // (a shorter one is a piece of a slur a staff line cut: kept only if it joins another piece)
    const sa = steepArc(c, S) || steepArc(c, S, 1.5);
    if (sa) { arcs.push({ st, c: { ...c, arcEnds: sa.ends, steep: true, bulgeUp: sa.up, piece: Math.hypot(sa.ends[1][0] - sa.ends[0][0], sa.ends[1][1] - sa.ends[0][1]) < 2.5 * S } }); continue; }
    // whole / half rests: a solid slab hanging from a line (whole) or sitting on one (half); the
    // 4th and middle lines normally, any line or ledger position when a second voice moves it
    const near = c.cy > yt - 2.2 * S && c.cy < yb + 2.2 * S;
    if (near && W >= 0.8 && W <= 1.9 && H >= 0.3 && H <= 0.8 && fill > 0.88 && W / H >= 1.6) {
      const on = (y) => { for (let k = -2; k <= 6; k++) if (Math.abs(y - (yt + ((yb - yt) / 4) * k)) < 0.3 * S) return k; return null; };
      const top = on(c.y0), bot = on(c.y1);
      const whole = top != null && bot == null, half = bot != null && top == null;
      // usual places first: whole from the 2nd line, half on the 3rd
      const usual = (whole && top === 1) || (half && bot === 2);
      if ((whole || half) && (usual || !inside || Math.abs(c.cy - lineY(st, 2, c.cx)) > 0.8 * S)) st.rests.push({ x: c.cx, y: c.cy, dur: whole ? 1 : 2, box: [c.x0, c.y0, c.x1, c.y1], ids: c.ids || [c.id], displaced: !usual });
      continue;
    }
    if (W < 0.35 || W > 2.4 || H < 0.7 || H > 4.8) continue;
    const { m } = maskOf(c);
    // rests
    if (inside && H >= 1.2 && H <= 4.6 && W <= 1.7) {
      // competing readings of the value: template distances and the classifier's probabilities
      // combine into a score per value; the runners-up are kept as alternatives (a cost per
      // value) for the bar check to choose from
      const g = match(m, cw, ch, ['rest'], S);
      const pr = useNet && bin ? classify(bin, [c.x0, c.y0, c.x1, c.y1]) : null;
      const pRest = pr ? pr.rest4 + pr.rest8 + pr.rest16 : 0;
      if (g && g.name !== 'restWhole' && (g.dist < 0.36 || (pr && pRest > 0.95 && g.dist < 0.5))) {
        const sc = {};
        for (const [nm, d] of Object.entries(REST_DUR)) if (d >= 4) sc[d] = -6 * (g.all[nm] ?? 1) + (pr ? Math.log((pr['rest' + Math.min(16, d)] ?? 0) + 1e-3) : 0);
        const best = +Object.keys(sc).reduce((a, b) => (sc[b] > sc[a] ? b : a));
        const alt = {}; for (const d in sc) if (+d !== best) alt[d] = +(sc[best] - sc[d]).toFixed(2);
        st.rests.push({ x: c.cx, y: c.cy, dur: best, alt, box: [c.x0, c.y0, c.x1, c.y1], ids: c.ids || [c.id], dist: g.dist });
        continue;
      }
    }
    // tuplet numbers: small digits outside (or at the edge of) the staff
    if (H >= 0.7 && H <= 1.9 && W <= 1.5 && (c.y1 < yt + 0.6 * S || c.y0 > yb - 0.6 * S)) {
      const g = match(m, cw, ch, ['tuplet', 'digit'], S);
      if (g && g.dist < 0.36) { const v = DIGIT(g.name); if (v === 3 || v === 5 || v === 6) st.tuplets.push({ x: c.cx, y: c.cy, n: v, box: [c.x0, c.y0, c.x1, c.y1], ids: c.ids || [c.id], dist: g.dist }); }
    }
  }
  // dotted rests: an augmentation dot right of a rest
  for (const st of staves) for (const r of st.rests) {
    const S = spaceAt(st, r.x);
    r.dots = dots.filter((d) => d.st === st && !used.has(d.c.ids[0]) && d.c.cx > r.box[2] && d.c.cx - r.box[2] < 1.2 * S && d.c.cy > r.box[1] - 0.3 * S && d.c.cy < r.box[3] &&
      // (not the staccato of the next note: just above or below its head)
      !st.notes.some((n) => Math.abs(n.x - d.c.cx) < 0.8 * S && Math.abs(n.y - d.c.cy) < 1.6 * S)).length > 0 ? 1 : 0;
  }
  function steepArc(c, S, min = 2.5) {
    const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1
    if (Math.max(cw, ch) < min * S || ch <= 0.4 * cw || cw < 0.9 * S || ch > 12 * S || cw > 12 * S) return null
    const { m } = maskOf(c), pts = [], byRow = ch >= cw, N = byRow ? ch : cw, M = byRow ? cw : ch
    const at = (i, j) => (byRow ? m[i * cw + j] : m[j * cw + i])
    // read across the long axis: one thin run in each row (or column); a letter, a rest or a
    // bracket's corner has rows of two runs. (A run is wider where the arc turns flat, but its
    // centre still follows the arc, so the length and the thickness below stay right.)
    let multi = 0, ink = 0
    for (let i = 0; i < N; i++) {
      const runs = []
      for (let j = 0; j < M;) { if (!at(i, j)) { j++; continue } let e = j; while (e < M && at(i, e)) e++; runs.push([j, e]); j = e }
      if (!runs.length) continue
      ink++
      if (runs.length > 1) { multi++; continue }
      const mid = (runs[0][0] + runs[0][1] - 1) / 2
      pts.push(byRow ? [c.x0 + mid, c.y0 + i] : [c.x0 + i, c.y0 + mid])
    }
    if (ink < 0.9 * N || multi > 0.12 * N || pts.length < 10) return null
    let len = 0
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    len *= ink / pts.length
    const [xa, ya] = pts[0], [xb, yb] = pts[pts.length - 1], chord = Math.hypot(xb - xa, yb - ya)
    // long enough to join two voices, not curled up, a thin line
    if (chord < min * S || chord < 0.6 * len || c.n / len > 0.4 * S) return null
    // signed distance from the chord: one side only, enough to be a curve and not a stem
    const dist = (p) => ((xb - xa) * (p[1] - ya) - (yb - ya) * (p[0] - xa)) / chord
    let kmax = 0, kmin = 0
    for (let i = 0; i < pts.length; i++) { if (dist(pts[i]) > dist(pts[kmax])) kmax = i; if (dist(pts[i]) < dist(pts[kmin])) kmin = i }
    const dmax = Math.max(0, dist(pts[kmax])), dmin = Math.min(0, dist(pts[kmin])), pos = dmax >= -dmin
    const bow = pos ? dmax : -dmin, other = pos ? -dmin : dmax
    // (a piece may be the straight part of a slur: it is kept only if it continues an arc)
    if (min >= 2.5 ? bow < Math.max(0.3 * S, 0.08 * chord) || other > 0.3 * bow : other > 0.15 * S && other > 0.3 * bow) return null
    // (a flag cut from its stem curves too, and starts at the stem's end)
    if (notes.some((n) => n.stem && [[xa, ya], [xb, yb]].some(([x, y]) => Math.abs(x - n.stem.x) < 0.7 * S && Math.abs(y - n.stem.tip) < 1.0 * S))) return null
    // (an 8th rest's stroke curves too: its head is a blob at one end)
    if (ch <= 4.6 * S && cw <= 1.7 * S) { const g = match(m, cw, ch, ['rest'], S); if (g && g.dist < 0.4) return null }
    // the side it bulges to: the point furthest from the chord, against the chord's midpoint
    const kb = pos ? kmax : kmin
    const ends = xa <= xb ? [[xa, ya], [xb, yb]] : [[xb, yb], [xa, ya]]
    return { ends, up: pts[kb][1] < (ya + yb) / 2 }
  }
  // Ties merged with something else (a phrase slur, a hairpin) are not components of their own:
  // between two neighbouring chords sharing a pitch, look for a thin curve of ink starting next
  // to the first head and ending next to the second, bowing away from the heads on one side.
  const tieBetween = (a, b, S) => {
    const xa = Math.round(a.box[2] + 0.1 * S), xb = Math.round(b.box[0] - 0.1 * S);
    if (xb - xa < 0.6 * S || xb - xa > 12 * S) return false;
    for (const side of [-1, 1]) {
      let hit = 0, last = null, ok = true, ys = [];
      for (let x = xa; x <= xb; x++) {
        // nearest ink beyond the head on this side, within 1.8 spaces
        let found = null;
        for (let d = Math.round(0.25 * S); d <= Math.round(1.8 * S); d++) { const y = Math.round(a.y + side * d); if (y >= 0 && y < h && L[y * w + x] && !headComps.has(L[y * w + x])) { found = y; break; } }
        if (found == null) continue;
        let run = 0; while (run < S && L[(found + side * run) * w + x]) run++;
        if (run > 0.45 * S) continue; // a stem, a thick symbol
        if (last != null && Math.abs(found - last) > 0.35 * S) { ok = false; break; }
        last = found; hit++; ys.push(Math.abs(found - a.y));
      }
      // (the curve's ends merge into the heads, which are skipped)
      if (!ok || hit < 0.6 * (xb - xa + 1) || ys.length < 3) continue;
      // a curve: nearer the heads at both ends than in the middle
      const n3 = Math.max(1, Math.floor(ys.length / 4)), ends = (ys.slice(0, n3).reduce((q, v) => q + v, 0) + ys.slice(-n3).reduce((q, v) => q + v, 0)) / (2 * n3), midv = Math.max(...ys);
      if (ys[0] < 1.3 * S && ys[ys.length - 1] < 1.3 * S && midv - ends > 0.08 * S) return true;
    }
    return false;
  };
  // ties: an arc from just right of one head to just left of the next head at the same position
  // (on the next chord of the staff). An arc running off the end of the staff ties over the
  // system break to the same note at the start of the next one.
  for (const n of notes) n.tie = false;
  for (const st of staves) {
    const S = spaceAt(st, (st.x0 + st.x1) / 2);
    for (const a of st.notes) {
      if (a.tie) continue;
      const b = st.notes.find((q) => q.chord === a.chord + 1 && q.p === a.p);
      if (b && tieBetween(a, b, S)) a.tie = true;
    }
  }
  for (const { st, c } of arcs) {
    if (c.steep) continue;
    const S = spaceAt(st, c.cx);
    const col = (x) => { for (let y = c.y0; y <= c.y1; y++) if (L[y * w + x] === c.id) return y; return c.cy; };
    const yl = col(c.x0), yr = col(c.x1);
    const ns = st.notes;
    for (const a of ns) {
      if (Math.abs(c.x0 - a.box[2]) > 1.2 * S && Math.abs(c.x0 - a.x) > 0.9 * S) continue;
      if (Math.abs(yl - a.y) > 2.0 * S) continue;
      const next = ns.filter((b) => b.chord === a.chord + 1);
      const b = next.find((q) => q.p === a.p && Math.abs(c.x1 - q.box[0]) < 1.4 * S && Math.abs(yr - q.y) < 2.0 * S);
      if (b) { a.tie = true; a.tieIds = [c.id]; c.isTie = true; break; }
      if (!next.length && c.x1 > st.x1 - 1.8 * S) { a.tie = true; a.tieIds = [c.id]; c.isTie = true; break; }
    }
  }

  // ---------------------------------------------------------------- arcs merged into notes
  // A slur that starts or ends on a stem, a head or a beam is part of that note's component
  // (in tightly engraved editions most are), so it never reached the arcs above. In each
  // note component, take away the heads, every thick run (stems, beams: an arc is a thin
  // line) and look at what is left: a long, thin, curved piece is an arc.
  for (const a of mergedArcs()) arcs.push(a);
  function mergedArcs() {
    const out = [], groups = []
    // note components (with their heads) …
    const byComp = new Map()
    for (const n of notes) { if (!byComp.has(n.comp)) byComp.set(n.comp, []); byComp.get(n.comp).push(n) }
    for (const [id, ns] of byComp) if (comps[id]) groups.push({ ids: new Set([id]), c: comps[id], st: ns[0].st, ns })
    // … and what is still unread and wide: stems and beams cut from their heads, with a slur on them
    const isArc = new Set(arcs.map((a) => a.c)), arcIds = new Set(arcs.flatMap((a) => a.c.ids || [a.c.id]))
    // (rests, tuplet numbers and dots read above are not arc pieces)
    const taken = new Set([...staves.flatMap((st) => [...st.rests.flatMap((r) => r.ids || []), ...st.tuplets.flatMap((q) => q.ids || [])]), ...dots.flatMap((d) => d.c?.ids || [])])
    for (const c of syms) {
      if (!c || used.has(c.id) || isArc.has(c) || (c.ids || [c.id]).some((i) => taken.has(i))) continue
      const st = staffOf(c); if (!st) continue
      if (c.x1 - c.x0 < 1.6 * spaceAt(st, c.cx)) continue
      groups.push({ ids: new Set(c.ids || [c.id]), c, st, ns: st.notes.filter((n) => n.x > c.x0 - S0 && n.x < c.x1 + S0 && n.y > c.y0 - S0 && n.y < c.y1 + S0) })
    }
    let seq = 0
    const superseded = new Set()
    for (const { ids, c, st, ns } of groups) {
      const S = spaceAt(st, c.cx)
      if (c.x1 - c.x0 < 1.6 * S) continue
      const x0 = c.x0, y0 = c.y0, cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1
      // with the small unread pieces inside the box: an arc crossing stems is cut into the pieces
      // between them, and its ink at each stem belongs to the stem
      const take = new Set(ids)
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const l = L[(y + y0) * w + x + x0]
        if (l && !take.has(l) && !used.has(l) && !taken.has(l) && !headComps.has(l) && comps[l] && comps[l].n < 30 * S && comps[l].y1 - comps[l].y0 < 1.2 * S) take.add(l)
      }
      const m = new Uint8Array(cw * ch)
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (take.has(L[(y + y0) * w + x + x0])) m[y * cw + x] = 1
      // heads, a little beyond their box
      for (const n of ns) {
        const b = n.box, e = 0.05 * S
        for (let y = Math.max(0, Math.floor(b[1] - e - y0)); y <= Math.min(ch - 1, Math.ceil(b[3] + e - y0)); y++) for (let x = Math.max(0, Math.floor(b[0] - e - x0)); x <= Math.min(cw - 1, Math.ceil(b[2] + e - x0)); x++) m[y * cw + x] = 0
      }
      // thick vertical runs (stems, beams, flags near the stem); the run's column neighbours too
      const thick = Math.max(3, 0.6 * S), cut = new Uint8Array(cw * ch)
      for (let x = 0; x < cw; x++) for (let y = 0; y < ch;) {
        if (!m[y * cw + x]) { y++; continue }
        let e = y; while (e < ch && m[e * cw + x]) e++
        if (e - y > thick) for (let k = y; k < e; k++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < cw) cut[k * cw + x + dx] = 1
        y = e
      }
      for (let i = 0; i < m.length; i++) if (cut[i]) m[i] = 0
      // what is left, in pieces (8-connected), each a thin run per column: x → [top, bottom]
      const lab = new Int32Array(cw * ch), stack = [], pieces = []
      for (let i0 = 0; i0 < m.length; i0++) {
        if (!m[i0] || lab[i0]) continue
        const L2 = ++seq, px = []
        lab[i0] = L2; stack.push(i0)
        while (stack.length) {
          const i = stack.pop(); px.push(i)
          const x = i % cw, y = (i / cw) | 0
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue
            const j = yy * cw + xx; if (m[j] && !lab[j]) { lab[j] = L2; stack.push(j) }
          }
        }
        if (px.length < 3) continue
        const col = new Map(), labs = new Set()
        for (const i of px) { const x = i % cw, y = (i / cw) | 0, q = col.get(x); labs.add(L[(y + y0) * w + x + x0]); if (!q) col.set(x, [y, y, 1]); else { q[0] = Math.min(q[0], y); q[1] = Math.max(q[1], y); q[2]++ } }
        const xs = [...col.keys()].sort((p, q) => p - q)
        pieces.push({ col, labs, x0: xs[0], x1: xs[xs.length - 1], n: px.length, yl: col.get(xs[0])[0], yr: col.get(xs[xs.length - 1])[0] })
      }
      // pieces cut apart by stems (an arc crossing a beamed group) join again: one begins just
      // after the other ends, at the height where it left off
      pieces.sort((p, q) => p.x0 - q.x0)
      const chains = []
      for (const p of pieces) {
        const k = chains.findIndex((c) => p.x0 > c.x1 && p.x0 - c.x1 <= 1.6 * S && Math.abs(p.yl - c.yr) <= 0.5 * S)
        if (k >= 0) { const c = chains[k]; for (const [x, v] of p.col) c.col.set(x, v); for (const l of p.labs) c.labs.add(l); c.x1 = p.x1; c.yr = p.yr; c.n += p.n; c.parts++ }
        else chains.push({ ...p, col: new Map(p.col), labs: new Set(p.labs), parts: 1 })
      }
      for (const ch2 of chains) {
        const xs = [...ch2.col.keys()].sort((p, q) => p - q), span = ch2.x1 - ch2.x0 + 1
        let ay0 = ch, ay1 = 0
        for (const v of ch2.col.values()) { ay0 = Math.min(ay0, v[0]); ay1 = Math.max(ay1, v[1]) }
        const W = span / S, H = (ay1 - ay0 + 1) / S
        if (W < 1.6 || H > Math.max(1.4, 0.4 * W)) continue
        // ink in most columns (the gaps are the stems it crossed), thin everywhere
        if (xs.length < 0.7 * span) continue
        if (ch2.n / xs.length > 0.4 * S || [...ch2.col.values()].some((v) => v[1] - v[0] > 0.65 * S)) continue
        // curved: the middle bows away from the line between the ends, all to one side
        const top = (x) => ch2.col.get(x)[0], ya = top(xs[0]), yb = top(xs[xs.length - 1])
        let dmax = 0, dmin = 0
        for (const x of xs) { const d = top(x) - (ya + (yb - ya) * (x - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])); dmax = Math.max(dmax, d); dmin = Math.min(dmin, d) }
        const bow = Math.abs(dmax) > Math.abs(dmin) ? dmax : dmin
        if (Math.abs(bow) < Math.max(0.15 * S, 0.03 * W * S) || Math.min(Math.abs(dmax), Math.abs(dmin)) > 0.35 * Math.abs(bow)) continue
        // a chain of one piece that is an arc already is that arc; one of several replaces the
        // pieces read as arcs on their own
        if (ch2.parts === 1 && [...ch2.labs].every((l) => arcIds.has(l))) continue
        for (const l of ch2.labs) if (arcIds.has(l)) superseded.add(l)
        // the arc's height in every column of its span (across the gaps too)
        const colY = new Map()
        for (let i = 0, x = xs[0]; x <= xs[xs.length - 1]; x++) { while (xs[i + 1] <= x) i++; colY.set(x + x0, (xs[i] === x ? top(x) : top(xs[i]) + (top(xs[i + 1] ?? xs[i]) - top(xs[i])) * (x - xs[i]) / Math.max(1, (xs[i + 1] ?? xs[i]) - xs[i])) + y0) }
        out.push({ st, from: [...take], c: { id: 'm' + seq++, merged: true, colY, x0: ch2.x0 + x0, x1: ch2.x1 + x0, y0: ay0 + y0, y1: ay1 + y0, n: ch2.n, cx: (ch2.x0 + ch2.x1) / 2 + x0, cy: (ay0 + ay1) / 2 + y0 } })
      }
    }
    // drop the arcs a longer merged one replaces
    for (let i = arcs.length - 1; i >= 0; i--) if ((arcs[i].c.ids || [arcs[i].c.id]).some((l) => superseded.has(l))) arcs.splice(i, 1)
    return out
  }

  // ---------------------------------------------------------------- slurs
  // Every other arc is a slur, from the chord nearest its left end to the one nearest its right
  // end (heads or stem ends within reach). An arc running off the end of the staff continues on
  // the next system; one starting at the left edge comes from the previous one.
  for (const st of staves) st.slurs = [];
  const ends = (st, x, y, S) => {
    let best = null;
    for (const n of st.notes) {
      const ys = [n.y, n.stem ? n.stem.tip : n.y], dx = Math.abs(n.x - x), dy = Math.min(...ys.map((v) => Math.abs(v - y)));
      if (dx > 2.2 * S || dy > 4.5 * S) continue;
      const d = dx + 0.5 * dy; if (!best || d < best.d) best = { d, n };
    }
    return best?.n || null;
  };
  // the pieces of one arc cut apart by a staff line or a barline, where one is steep (a slur
  // between voices turning flat at its top) or too short to reach a note on its own: an end of
  // one meets the start of the next, heading the same way
  for (const a of joinArcPieces()) arcs.push(a);
  function joinArcPieces() {
    const colOf = (c, x) => { if (c.colY) return c.colY.get(x) ?? c.cy; const ids = c.ids || [c.id]; for (let y = c.y0; y <= c.y1; y++) if (ids.includes(L[y * w + x])) return y; return c.cy; };
    // ends and the direction the arc heads in at each (outward)
    const geo = (c) => {
      if (c.arcEnds) {
        const [[xa, ya], [xb, yb]] = c.arcEnds, ids = c.ids || [c.id], near = (x0, y0, x1, y1) => { // the ink a little way in from the end
          const tx = x0 + (x1 - x0) * 0.2, ty = y0 + (y1 - y0) * 0.2; let best = null
          for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (ids.includes(L[y * w + x])) { const d = Math.hypot(x - tx, y - ty); if (!best || d < best[2]) best = [x, y, d] }
          return best ? [x0 - best[0], y0 - best[1]] : [x0 - x1, y0 - y1] }
        return { l: [xa, ya], r: [xb, yb], dl: near(xa, ya, xb, yb), dr: near(xb, yb, xa, ya) }
      }
      const k = Math.max(1, Math.round(0.2 * (c.x1 - c.x0)))
      return { l: [c.x0, colOf(c, c.x0)], r: [c.x1, colOf(c, c.x1)], dl: [-k, colOf(c, c.x0) - colOf(c, c.x0 + k)], dr: [k, colOf(c, c.x1) - colOf(c, c.x1 - k)] }
    }
    const inkOf = (c) => {
      if (c.parts) return c.parts.flatMap(inkOf)
      if (c.colY) return [...c.colY].map(([x, y]) => [x, y])
      const set = new Set(c.ids || [c.id]), out = []
      for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (set.has(L[y * w + x])) out.push([x, y])
      return out
    }
    const curved = (cs, [xa, ya], [xb, yb], S) => {
      const chord = Math.hypot(xb - xa, yb - ya); let dmax = 0, dmin = 0
      for (const c of cs) for (const [x, y] of inkOf(c)) { const d = ((xb - xa) * (y - ya) - (yb - ya) * (x - xa)) / chord; if (d > dmax) dmax = d; if (d < dmin) dmin = d }
      const bow = Math.max(dmax, -dmin), other = Math.min(dmax, -dmin)
      return bow >= Math.max(0.3 * S, 0.06 * chord) && other <= Math.max(0.3 * bow, 0.2 * S)
    }
    const items = arcs.filter((a) => !a.c.isTie).map((a) => ({ a, g: geo(a.c) }))
    const out = [], gone = new Set()
    const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1))))
    for (const p of items) {
      if (gone.has(p)) continue
      let cur = p
      for (let grew = true; grew;) {
        grew = false
        const S = spaceAt(cur.a.st, cur.g.r[0])
        for (const q of items) {
          if (q === cur || q === p || gone.has(q) || q.a.st !== cur.a.st && Math.abs(q.g.l[1] - cur.g.r[1]) > 2 * S) continue
          // (two long flat pieces: the slur stage joins them, once each reaches its notes)
          if (!cur.a.c.steep && !q.a.c.steep && !cur.join && Math.min(cur.a.c.x1 - cur.a.c.x0, q.a.c.x1 - q.a.c.x0) > 2.5 * S) continue
          if (q.g.r[0] <= cur.g.r[0] || Math.hypot(q.g.l[0] - cur.g.r[0], q.g.l[1] - cur.g.r[1]) > 1.0 * S) continue
          // continuing the same way: the outward direction at cur's end against q's inward one
          if (ang(cur.g.dr, [-q.g.dl[0], -q.g.dl[1]]) > 0.9) continue
          const A = cur.a.c, B = q.a.c, ids = [...(A.ids || [A.id]), ...(B.ids || [B.id])]
          // together a curve: the ink bows to one side of the line between the two far ends
          // (an underline or a line of a bracket in pieces does not)
          if (!curved([A, B], cur.g.l, q.g.r, S)) continue
          const c = { id: A.id, ids, joined: true, x0: Math.min(A.x0, B.x0), y0: Math.min(A.y0, B.y0), x1: Math.max(A.x1, B.x1), y1: Math.max(A.y1, B.y1), n: A.n + B.n, cx: (A.cx * A.n + B.cx * B.n) / (A.n + B.n), cy: (A.cy * A.n + B.cy * B.n) / (A.n + B.n), arcEnds: [cur.g.l, q.g.r], steep: true, parts: [A, B] }
          gone.add(cur); gone.add(q)
          cur = { a: { st: cur.a.st, c }, g: { l: cur.g.l, r: q.g.r, dl: cur.g.dl, dr: q.g.dr }, join: true }
          grew = true; break
        }
      }
      if (cur !== p) out.push(cur.a)
    }
    for (let i = arcs.length - 1; i >= 0; i--) if (items.some((it) => gone.has(it) && it.a === arcs[i])) arcs.splice(i, 1)
    return out
  }
  for (let { st, c } of arcs) {
    if (c.isTie) continue;
    const S = spaceAt(st, c.cx), col = (x) => { if (c.colY) return c.colY.get(x) ?? c.cy; for (let y = c.y0; y <= c.y1; y++) if (L[y * w + x] === c.id) return y; return c.cy; };
    // a slur cut into pieces by staff lines and barlines: follow small fragments along its
    // direction from the right end
    let ex = c.arcEnds ? c.arcEnds[1][0] : c.x1, ey = c.arcEnds ? c.arcEnds[1][1] : col(c.x1); const frags = [];
    const slope = (ey - col(Math.max(c.x0, Math.round(c.x1 - 0.2 * (c.x1 - c.x0))))) / Math.max(1, 0.2 * (c.x1 - c.x0));
    for (let grew = !c.merged && !c.arcEnds; grew;) {
      grew = false;
      for (const q of comps) {
        if (!q || q.id === c.id || used.has(q.id) || headComps.has(q.id) || q.n > 120 || q.x0 <= ex - 1 || q.x0 - ex > 1.6 * S || q.y1 - q.y0 > 0.8 * S) continue;
        const py = ey + slope * ((q.x0 + q.x1) / 2 - ex);
        if (Math.abs((q.y0 + q.y1) / 2 - py) > 0.6 * S) continue;
        ex = q.x1; ey = (q.y0 + q.y1) / 2; grew = true; used.add(q.id); frags.push(q.id); break;
      }
    }
    const lx = c.arcEnds ? c.arcEnds[0][0] : c.x0, ly = c.arcEnds ? c.arcEnds[0][1] : col(c.x0);
    let a = ends(st, lx, ly, S), b = ends(st, ex, ey, S);
    // an arc between two staves belongs to the one whose notes it joins (a slur above the
    // stems of the staff below lies in the band of the staff above)
    if (!a || !b) {
      const k = staves.indexOf(st);
      for (const st2 of [staves[k + 1], staves[k - 1]]) {
        if (!st2) continue;
        const a2 = ends(st2, lx, ly, S), b2 = ends(st2, ex, ey, S);
        if (a2 && b2 && a2.chord !== b2.chord) { a = a2; b = b2; st = st2; break; }
      }
    }
    const fromEdge = c.x0 < (st.key?.x1 ?? st.x0) + 1.5 * S, toEdge = ex > st.x1 - 1.8 * S;
    if ((!a && !fromEdge) || (!b && !toEdge) || (a && b && a.chord === b.chord)) continue;
    // (a merged arc between two heads of one pitch already read as a tie is that tie)
    if (c.merged && a && b && a.tie && a.p === b.p && b.chord === a.chord + 1) continue;
    // (a steep slur between voices: on the side it bulges to; it never reaches a note on the
    // same chord, and its ends are its own, not the edge of the staff)
    if (c.piece) continue;
    if (c.steep && (!a || !b || b.x - a.x < 0.8 * S || ex - lx < 0.35 * (b.x - a.x))) continue;
    const yl = ly, yr = ey, above = c.steep && !c.joined ? !!c.bulgeUp : c.y0 < Math.min(yl, yr) - 2;
    st.slurs.push({ from: a, to: b, open: !b, cont: !a, box: [c.x0, c.y0, ex, Math.max(c.y1, ey)], yl, yr, peak: above ? c.y0 : c.y1, above, ...(c.steep ? { steep: true } : {}), ids: [...(c.ids || [c.id]), ...frags] });
    used.add(c.id);
  }

  // a slur broken into pieces (a staff line, a barline, a head in the way): consecutive pieces
  // on one side of the staff whose ends meet are one slur
  for (const st of staves) {
    const sl = st.slurs.sort((p, q) => p.box[0] - q.box[0]), S = spaceAt(st, (st.x0 + st.x1) / 2);
    for (let i = 0; i + 1 < sl.length; i++) {
      const p = sl[i], q = sl[i + 1];
      if (p.above !== q.above || q.box[0] - p.box[2] > 2 * S || q.box[0] < p.box[2] - 3 * S || q.box[2] <= p.box[2] || Math.abs(q.yl - p.yr) > 0.8 * S) continue;
      sl.splice(i, 2, { ...p, to: q.to, open: q.open, box: [p.box[0], Math.min(p.box[1], q.box[1]), q.box[2], Math.max(p.box[3], q.box[3])], yr: q.yr, peak: p.above ? Math.min(p.peak, q.peak) : Math.max(p.peak, q.peak), ids: [...p.ids, ...q.ids] });
      i--;
    }
  }

  // ---------------------------------------------------------------- hairpins
  // Two thin strokes meeting at one end: wide, short, outside the staff. The open end has two ink
  // runs a good half space apart, the closed end one.
  for (const st of staves) st.hairpins = [];
  for (const c of syms) {
    if (!c || used.has(c.id)) continue;
    const st = staffOf(c); if (!st) continue;
    const S = spaceAt(st, c.cx);
    const yt = lineY(st, 0, c.cx), yb = lineY(st, 4, c.cx); if (c.y1 > yt - 0.3 * S && c.y0 < yb + 0.3 * S) continue;
    const form = hairpinForm(c, S);
    if (!form) continue;
    const near = (x) => { let best = null; for (const n of st.notes) { const d = Math.abs(n.x - x); if (!best || d < best.d) best = { d, n }; } return best && best.d < 3 * S ? best.n : null; };
    st.hairpins.push({ form, from: near(c.x0), to: near(c.x1), box: [c.x0, c.y0, c.x1, c.y1], ids: c.ids || [c.id] });
    used.add(c.id);
  }

}
