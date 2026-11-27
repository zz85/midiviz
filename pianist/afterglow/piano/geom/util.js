// Geometry toolkit for the procedural piano: filleted 2-D profiles with exact normals, profile sweeps along plan
// paths, lathes, ring lofts and rounded slabs (extrusions whose every edge is filleted). Pure functions of their
// inputs (no randomness, no time), so the piano is bit-identical on every build.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// --------------------------------------------------------------------------------------------- deterministic rng
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------------------------------------- 2-D profiles
// A profile is a list of "runs". Inside a run, points share smooth normals; between runs there is a crease
// (same position, different normal). Each point: { p: [x, y], n: [nx, ny], s: arc length from the profile start }.
// Normals point to the RIGHT of the travel direction (outward for a counter-clockwise closed outline).

function norm2(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

/**
 * Round the corners of a polyline/polygon with circular fillets.
 * @param {number[][]} pts  vertices [[x, y], ...] (closed polygons: do not repeat the first point)
 * @param {number|number[]} radii  fillet radius per vertex (0 = sharp crease); clamped to fit the edges
 * @param {{closed?: boolean, seg?: number, maxAngleStep?: number}} o  seg = segments per 90 degrees
 * @returns {{runs: Array<Array<{p:number[], n:number[], s:number}>>, closed: boolean, length: number}}
 */
export function roundProfile(pts, radii = 0, o = {}) {
  const closed = !!o.closed; const seg = o.seg ?? 6;
  const N = pts.length;
  const R = (i) => (Array.isArray(radii) ? (radii[i] ?? 0) : radii);
  const runs = []; let run = [];
  const P = (i) => pts[(i + N) % N];
  const rightN = (d) => [d[1], -d[0]];
  // per-vertex corner geometry
  const corners = [];
  for (let i = 0; i < N; i++) {
    const hasPrev = closed || i > 0, hasNext = closed || i < N - 1;
    const p = pts[i];
    const din = hasPrev ? norm2([p[0] - P(i - 1)[0], p[1] - P(i - 1)[1]]) : null;
    const dout = hasNext ? norm2([P(i + 1)[0] - p[0], P(i + 1)[1] - p[1]]) : null;
    let r = (hasPrev && hasNext) ? R(i) : 0;
    let arc = null;
    if (r > 0) {
      const cosPhi = Math.max(-1, Math.min(1, -(din[0] * dout[0] + din[1] * dout[1])));
      const phi = Math.acos(cosPhi);                     // interior angle between the two edges
      const turn = Math.PI - phi;                        // turning angle
      if (turn > 1e-4) {
        const lenIn = Math.hypot(p[0] - P(i - 1)[0], p[1] - P(i - 1)[1]);
        const lenOut = Math.hypot(P(i + 1)[0] - p[0], P(i + 1)[1] - p[1]);
        let t = r / Math.tan(phi / 2);
        const tmax = 0.5 * Math.min(lenIn, lenOut) * 0.999;
        if (t > tmax) { t = tmax; r = t * Math.tan(phi / 2); }
        const left = din[0] * dout[1] - din[1] * dout[0] > 0;
        const T1 = [p[0] - din[0] * t, p[1] - din[1] * t];
        const T2 = [p[0] + dout[0] * t, p[1] + dout[1] * t];
        const side = left ? [-din[1], din[0]] : [din[1], -din[0]];
        const C = [T1[0] + side[0] * r, T1[1] + side[1] * r];
        arc = { T1, T2, C, r, left, turn };
      }
    }
    corners.push({ p, din, dout, arc });
  }
  const push = (p, n) => run.push({ p: [p[0], p[1]], n: [n[0], n[1]], s: 0 });
  const emitCorner = (c, first) => {
    if (c.arc) {
      const { T1, C, r, left, turn } = c.arc;
      const steps = Math.max(1, Math.ceil(seg * turn / (Math.PI / 2)));
      const a0 = Math.atan2(T1[1] - C[1], T1[0] - C[0]);
      for (let k = 0; k <= steps; k++) {
        const a = a0 + (left ? 1 : -1) * turn * k / steps;
        const q = [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r];
        const radial = [Math.cos(a), Math.sin(a)];
        push(q, left ? radial : [-radial[0], -radial[1]]);
      }
    } else {
      // sharp vertex: end the run with the incoming normal, start a new one with the outgoing normal
      if (c.din && !first) { push(c.p, rightN(c.din)); runs.push(run); run = []; }
      if (c.dout) push(c.p, rightN(c.dout));
      else if (c.din) push(c.p, rightN(c.din));
    }
  };
  if (closed) {
    // start at a sharp corner if there is one so runs do not wrap; else start at corner 0's arc
    let start = corners.findIndex((c) => !c.arc);
    if (start < 0) start = 0;
    for (let k = 0; k <= N; k++) {
      const i = (start + k) % N; const c = corners[i];
      if (k === N) { // close the loop
        if (!c.arc) { push(c.p, rightN(c.din)); runs.push(run); run = []; }
        else { push(c.arc.T1, c.arc.left ? norm2([c.arc.T1[0] - c.arc.C[0], c.arc.T1[1] - c.arc.C[1]]) : norm2([c.arc.C[0] - c.arc.T1[0], c.arc.C[1] - c.arc.T1[1]])); runs.push(run); run = []; }
        break;
      }
      emitCorner(c, k === 0);
    }
  } else {
    for (let i = 0; i < N; i++) emitCorner(corners[i], i === 0);
    if (run.length) runs.push(run);
  }
  // arc length
  let s = 0; let prev = null;
  for (const r of runs) for (const q of r) { if (prev) s += Math.hypot(q.p[0] - prev[0], q.p[1] - prev[1]); q.s = s; prev = q.p; }
  return { runs: runs.filter((r) => r.length >= 2), closed, length: s };
}

/** Flatten a profile into unique points (dropping crease duplicates). */
export function profilePoints(prof) {
  const out = [];
  for (const r of prof.runs) for (const q of r) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(l[0] - q.p[0], l[1] - q.p[1]) > 1e-9) out.push(q.p);
  }
  if (prof.closed && out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) out.pop();
  }
  return out;
}

/** Resample a 2-D polyline (open or closed) to points no farther apart than `step`. */
export function densify(pts, step, closed = false) {
  const out = [];
  const n = pts.length; const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

export function polygonArea(pts) {
  let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
export const ensureCCW = (pts) => (polygonArea(pts) < 0 ? pts.slice().reverse() : pts);
export const ensureCW = (pts) => (polygonArea(pts) > 0 ? pts.slice().reverse() : pts);

/** Per-vertex outward normals of a dense closed CCW polygon (averaged edge normals, miter-corrected). */
export function polygonNormals(pts) {
  const n = pts.length; const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
    const d1 = norm2([p[0] - a[0], p[1] - a[1]]), d2 = norm2([b[0] - p[0], b[1] - p[1]]);
    const n1 = [d1[1], -d1[0]], n2 = [d2[1], -d2[0]];
    let m = norm2([n1[0] + n2[0], n1[1] + n2[1]]);
    const c = m[0] * n1[0] + m[1] * n1[1];
    const scale = 1 / Math.max(0.25, c);       // miter length so a constant-distance offset stays parallel
    out.push([m[0], m[1], scale]);
  }
  return out;
}

// --------------------------------------------------------------------------------------------- mesh assembly
export class MeshBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }
  get count() { return this.pos.length / 3; }
  vert(x, y, z, nx, ny, nz, u = 0, v = 0) {
    this.pos.push(x, y, z); this.nrm.push(nx, ny, nz); this.uv.push(u, v); return this.count - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  /** quad grid (rows x cols vertex indices); orientation fixed later by normals */
  grid(ids, rows, cols, closeCols = false) {
    const cc = closeCols ? cols : cols - 1;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cc; c++) {
      const c1 = (c + 1) % cols;
      const a = ids[r * cols + c], b = ids[r * cols + c1], d = ids[(r + 1) * cols + c], e = ids[(r + 1) * cols + c1];
      this.idx.push(a, d, b, b, d, e);
    }
  }
  append(geo, matrix = null) {
    const g = matrix ? geo.clone().applyMatrix4(matrix) : geo;
    const base = this.count;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const uv = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length / 3; i++) this.vert(p[3 * i], p[3 * i + 1], p[3 * i + 2], n[3 * i], n[3 * i + 1], n[3 * i + 2], uv ? uv[2 * i] : 0, uv ? uv[2 * i + 1] : 0);
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) this.idx.push(base + ix[i]); }
    else for (let i = 0; i < p.length / 3; i++) this.idx.push(base + i);
    if (matrix && matrix.determinant() < 0) {
      for (let i = this.idx.length - (g.index ? g.index.count : p.length / 3); i < this.idx.length; i += 3) {
        const t = this.idx[i + 1]; this.idx[i + 1] = this.idx[i + 2]; this.idx[i + 2] = t;
      }
    }
    if (matrix) g.dispose();
    return this;
  }
  build({ orient = true } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    const IA = this.count > 65535 ? Uint32Array : Uint16Array;
    g.setIndex(new THREE.BufferAttribute(new IA(this.idx), 1));
    if (orient) orientByNormals(g);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** Flip triangles whose geometric normal disagrees with their vertex normals (makes winding robust). */
export function orientByNormals(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i], b = ix[i + 1], c = ix[i + 2];
    const ux = p[3 * b] - p[3 * a], uy = p[3 * b + 1] - p[3 * a + 1], uz = p[3 * b + 2] - p[3 * a + 2];
    const vx = p[3 * c] - p[3 * a], vy = p[3 * c + 1] - p[3 * a + 1], vz = p[3 * c + 2] - p[3 * a + 2];
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
    const sx = n[3 * a] + n[3 * b] + n[3 * c], sy = n[3 * a + 1] + n[3 * b + 1] + n[3 * c + 1], sz = n[3 * a + 2] + n[3 * b + 2] + n[3 * c + 2];
    if (gx * sx + gy * sy + gz * sz < 0) { ix[i + 1] = c; ix[i + 2] = b; }
  }
  g.index.needsUpdate = true;
  return g;
}

/** Merge geometries (all must have position/normal/uv; indexed or not). Optional matrices per geometry. */
export function mergeGeos(list) {
  const mb = new MeshBuilder();
  for (const it of list) {
    if (!it) continue;
    if (it.isBufferGeometry) mb.append(it); else mb.append(it.geo, it.matrix || null);
  }
  return mb.build({ orient: false });
}

/** Recompute smooth normals on an indexed geometry (only where a part has no analytic normals). */
export function smoothNormals(g) { g.computeVertexNormals(); return g; }

// --------------------------------------------------------------------------------------------- sweeps
/**
 * Sweep a 2-D profile along a path. Profile coordinates (u, v) map to P + U*u + V*v, normals (nu, nv) to U*nu + V*nv.
 * @param {Array<{p:THREE.Vector3, U:THREE.Vector3, V:THREE.Vector3, s?:number}>} frames  path frames
 * @param {object} prof  roundProfile() output, or a function (frameIndex) => profile with identical run sizes
 * @param {{closedPath?: boolean}} o
 */
export function sweep(frames, prof, o = {}, mb = new MeshBuilder()) {
  const closedPath = !!o.closedPath;
  const nf = frames.length;
  const getProf = typeof prof === 'function' ? prof : () => prof;
  const p0 = getProf(0);
  // path arc length for uv
  let s = 0; const sv = [0];
  for (let i = 1; i < nf; i++) { s += frames[i].p.distanceTo(frames[i - 1].p); sv.push(s); }
  for (let ri = 0; ri < p0.runs.length; ri++) {
    const nr = p0.runs[ri].length;
    const ids = [];
    for (let i = 0; i < nf; i++) {
      const f = frames[i]; const run = getProf(i).runs[ri];
      for (let k = 0; k < nr; k++) {
        const q = run[k];
        const x = f.p.x + f.U.x * q.p[0] + f.V.x * q.p[1], y = f.p.y + f.U.y * q.p[0] + f.V.y * q.p[1], z = f.p.z + f.U.z * q.p[0] + f.V.z * q.p[1];
        let nx = f.U.x * q.n[0] + f.V.x * q.n[1], ny = f.U.y * q.n[0] + f.V.y * q.n[1], nz = f.U.z * q.n[0] + f.V.z * q.n[1];
        const l = Math.hypot(nx, ny, nz) || 1;
        ids.push(mb.vert(x, y, z, nx / l, ny / l, nz / l, sv[i], q.s));
      }
    }
    // rows = path frames, cols = profile points
    if (closedPath) {
      for (let i = 0; i < nf; i++) for (let k = 0; k < nr - 1; k++) {
        const i1 = (i + 1) % nf;
        const a = ids[i * nr + k], b = ids[i * nr + k + 1], c = ids[i1 * nr + k], d = ids[i1 * nr + k + 1];
        mb.tri(a, c, b); mb.tri(b, c, d);
      }
    } else mb.grid(ids, nf, nr, false);
  }
  return mb;
}

/** Frames along a plan path (points in x-z at height y0): U = outward (right of travel when CCW), V = +y. */
export function planFrames(pts2d, { closed = false, y0 = 0, inward = false } = {}) {
  const n = pts2d.length; const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts2d[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts2d[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const p = pts2d[i];
    const d1 = norm2([p[0] - a[0], p[1] - a[1]]), d2 = norm2([b[0] - p[0], b[1] - p[1]]);
    const da = (i === 0 && !closed) ? d2 : (i === n - 1 && !closed) ? d1 : d1;
    const db = (i === 0 && !closed) ? d2 : (i === n - 1 && !closed) ? d1 : d2;
    const n1 = [da[1], -da[0]], n2 = [db[1], -db[0]];
    const m = norm2([n1[0] + n2[0], n1[1] + n2[1]]);
    const c = Math.max(0.3, m[0] * n1[0] + m[1] * n1[1]);
    const sc = (inward ? -1 : 1) / c;
    // plan (x, z): a CCW polygon in (x, z) with z "up" in the 2-D sense
    out.push({ p: new THREE.Vector3(p[0], y0, p[1]), U: new THREE.Vector3(m[0] * sc, 0, m[1] * sc), V: new THREE.Vector3(0, 1, 0) });
  }
  return out;
}

// --------------------------------------------------------------------------------------------- lathe
/**
 * Revolve a profile in (r, y) about the y axis. Profile normals (nr, ny).
 * @param {object} prof roundProfile() output (open), r >= 0
 */
export function lathe(prof, { segments = 32, phi0 = 0, phiLen = TAU } = {}, mb = new MeshBuilder()) {
  const full = Math.abs(phiLen - TAU) < 1e-9;
  const cols = full ? segments : segments + 1;
  for (const run of prof.runs) {
    const nr = run.length; const ids = [];
    for (let k = 0; k < nr; k++) {
      const q = run[k];
      for (let j = 0; j < cols; j++) {
        const a = phi0 + phiLen * j / segments; const c = Math.cos(a), s = Math.sin(a);
        ids.push(mb.vert(q.p[0] * c, q.p[1], q.p[0] * s, q.n[0] * c, q.n[1], q.n[0] * s, j / segments, q.s));
      }
    }
    mb.grid(ids, nr, cols, full);
  }
  return mb;
}

// --------------------------------------------------------------------------------------------- rounded slab
/**
 * A slab: closed outline (in the a-b plane) extruded along c from 0 to h, with every edge filleted.
 * outline: dense, CCW, already corner-rounded (radius >= r). holes: optional array of inner rings (any orientation).
 * Local axes: a -> x, b -> z, c -> y (plan extrusion). Use `matrix` to place it.
 * rTop/rBot: fillet radii of the top/bottom edges (0 allowed). Returns MeshBuilder.
 */
/** Cap triangulations whose area does not match the inset outline (tools/piano/check_caps.mjs prints them). */
export const SLAB_WARNINGS = [];
export const SLAB_CLEANED = { rings: 0, vertices: 0 };

/**
 * Remove the little bow-ties an inset ring forms where short outline edges meet at a corner (the miter offset of a
 * short edge overshoots and the inset edge runs backwards). Earcut on a self-intersecting ring returns garbage
 * (measured: the plate web cap grew a 1.65 m2 triangle over the strike gap and the soundboard windows).
 * inset: [Vector2...]. Local loop removal: when edge i crosses a later edge j within a short window, the vertices
 * between them (the swallowtail loop) are replaced by the crossing point; then degenerate edges are dropped.
 * (A first version dropped both ends of every reversed edge and cascaded: it ate whole sides of the pinblock cap.)
 */
export function cleanInsetRing(orig, inset, window = 24) {
  void orig;
  let pts = inset.slice();
  const cross = (a, b, c, d) => {
    const r1x = b.x - a.x, r1y = b.y - a.y, r2x = d.x - c.x, r2y = d.y - c.y;
    const den = r1x * r2y - r1y * r2x; if (Math.abs(den) < 1e-18) return null;
    const t = ((c.x - a.x) * r2y - (c.y - a.y) * r2x) / den, u = ((c.x - a.x) * r1y - (c.y - a.y) * r1x) / den;
    return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9 ? new THREE.Vector2(a.x + r1x * t, a.y + r1y * t) : null;
  };
  let removed = 0;
  // one lap over the ring; after a fix the ring is rotated so the fixed edge is first and the lap restarts there
  // (the edges already verified come last), so the cost is about one lap per fix plus one clean lap
  let i = 0, clean = 0;
  for (let guard = 0; guard < 400 && pts.length >= 5 && clean < pts.length; guard++) {
    const n = pts.length; let hit = null;
    for (let d = 2; d <= Math.min(window, n - 2) && !hit; d++) {
      const X = cross(pts[i], pts[(i + 1) % n], pts[(i + d) % n], pts[(i + d + 1) % n]);
      if (X) hit = { d, X };
    }
    if (!hit) { i = (i + 1) % n; clean++; guard--; continue; }
    const { d, X } = hit;
    const rot = [...pts.slice(i), ...pts.slice(0, i)];          // rot[0] = edge start, rot[d] = start of the crossed edge
    pts = [rot[0], X, ...rot.slice(d + 1)];
    removed += d - 1; i = 0; clean = 0;
  }
  const out = [];
  for (const p of pts) { const l = out[out.length - 1]; if (!l || l.distanceTo(p) > 1e-7) out.push(p); }
  if (out.length > 3 && out[0].distanceTo(out[out.length - 1]) <= 1e-7) out.pop();
  if (removed) { SLAB_CLEANED.rings++; SLAB_CLEANED.vertices += removed; }
  return out;
}

export function roundedSlab(outline, h, { rTop = 0.003, rBot = 0.003, seg = 4, holes = [], mb = new MeshBuilder(), capTop = true, capBot = true, wallOnly = false } = {}) {
  const rings = [ensureCCW(outline), ...holes.map((hh) => ensureCW(hh))];
  const capRings = [];
  for (const ring of rings) {
    const nrm = polygonNormals(ring);
    // vertical wall profile: u = outward offset from the outline, v = c (height); one smooth run
    // (bottom fillet arc -> wall -> top fillet arc); creases only where a radius is 0
    const rb = Math.min(rBot, h / 2 - 1e-6), rt = Math.min(rTop, h / 2 - 1e-6);
    const run = [];
    const pushQ = (u, v, nu, nv) => run.push({ p: [u, v], n: [nu, nv], s: 0 });
    const runs = [];
    if (rb > 0) {
      for (let k = 0; k <= seg; k++) { const a = -Math.PI / 2 + (Math.PI / 2) * k / seg; pushQ(-rb + Math.cos(a) * rb, rb + Math.sin(a) * rb, Math.cos(a), Math.sin(a)); }
    } else pushQ(0, 0, 1, 0);
    if (rt > 0) {
      for (let k = 0; k <= seg; k++) { const a = (Math.PI / 2) * k / seg; pushQ(-rt + Math.cos(a) * rt, h - rt + Math.sin(a) * rt, Math.cos(a), Math.sin(a)); }
    } else pushQ(0, h, 1, 0);
    let sacc = 0; for (let k = 1; k < run.length; k++) { sacc += Math.hypot(run[k].p[0] - run[k - 1].p[0], run[k].p[1] - run[k - 1].p[1]); run[k].s = sacc; }
    runs.push(run);
    const profT = { runs, closed: false };
    const frames = ring.map((p, i) => ({
      p: new THREE.Vector3(p[0], 0, p[1]),
      U: new THREE.Vector3(nrm[i][0] * nrm[i][2], 0, nrm[i][1] * nrm[i][2]),
      V: new THREE.Vector3(0, 1, 0),
    }));
    // normals must not carry the miter scale: sweep normalises them
    sweep(frames, profT, { closedPath: true }, mb);
    capRings.push({ ring, nrm, insetTop: rt, insetBot: rb });
  }
  if (wallOnly) return mb;
  // caps: rings inset by the fillet radii; outer ring CCW, holes CW
  const cap = (y, which, up) => {
    const contour = []; const holesV = [];
    let expect = 0;
    capRings.forEach((cr, ci) => {
      const ins = which === 'top' ? cr.insetTop : cr.insetBot;
      const pts = cleanInsetRing(cr.ring, cr.ring.map((p, i) => new THREE.Vector2(p[0] - cr.nrm[i][0] * cr.nrm[i][2] * ins, p[1] - cr.nrm[i][1] * cr.nrm[i][2] * ins)));
      expect += Math.abs(THREE.ShapeUtils.area(pts)) * (ci === 0 ? 1 : -1);
      if (ci === 0) contour.push(...pts); else holesV.push(pts);
    });
    const tris = THREE.ShapeUtils.triangulateShape(contour, holesV);
    const all = contour.concat(...holesV);
    let got = 0;
    for (const t of tris) got += Math.abs(THREE.ShapeUtils.area([all[t[0]], all[t[1]], all[t[2]]]));
    if (Math.abs(got - expect) > 0.01 * Math.abs(expect) + 1e-7) SLAB_WARNINGS.push({ which, expect, got, n: contour.length, at: (new Error().stack || '').split('\n').slice(3, 6).join(' <- ') });
    const base = mb.count;
    for (const v of all) mb.vert(v.x, y, v.y, 0, up ? 1 : -1, 0, v.x, v.y);
    for (const t of tris) mb.tri(base + t[0], base + t[1], base + t[2]);
  };
  if (capTop) cap(h, 'top', true);
  if (capBot) cap(0, 'bot', false);
  return mb;
}

/** Rounded-corner closed outline (CCW) from a polygon with per-corner radii; returns dense points. */
export function roundedOutline(pts, radii, seg = 6, step = 0) {
  const prof = roundProfile(ensureCCW(pts), radii, { closed: true, seg });
  let out = profilePoints(prof);
  if (step > 0) out = densify(out, step, true);
  return out;
}

export function roundedRect(x0, y0, x1, y1, r, seg = 6) {
  return roundedOutline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [r, r, r, r], seg);
}

/** Matrix mapping local slab axes (a->x, b->z, c->y) onto arbitrary world axes. ax/bx/cx are THREE.Vector3. */
export function basisMatrix(A, B, C, origin = new THREE.Vector3()) {
  // local x (a) -> A, local z (b) -> B, local y (c) -> C
  const m = new THREE.Matrix4();
  m.set(A.x, C.x, B.x, origin.x,
    A.y, C.y, B.y, origin.y,
    A.z, C.z, B.z, origin.z,
    0, 0, 0, 1);
  return m;
}

/** Build a geometry from a MeshBuilder with an optional placement matrix (fixes winding if mirrored). */
export function finish(mb, matrix = null) {
  const g = mb.build();
  if (matrix) {
    g.applyMatrix4(matrix);
    if (matrix.determinant() < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; }
    // re-normalise normals after non-uniform matrices
    const n = g.attributes.normal; const v = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  }
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

// --------------------------------------------------------------------------------------------- tubes
/**
 * Tube along a polyline of THREE.Vector3 with constant or per-point radius. Analytic normals, uv.x = arc length,
 * uv.y = angle / 2pi. Ends optionally capped with hemispheres (round=true) or flat discs.
 */
export function tube(points, radius, { radial = 8, caps = 'flat', mb = new MeshBuilder(), uvScale = 1, twist = 0, helix = 0 } = {}) {
  const n = points.length;
  const rad = (i) => (typeof radius === 'function' ? radius(i, n) : radius);
  // parallel-transport frames
  const T = [], Nn = [], Bn = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    T.push(new THREE.Vector3().subVectors(b, a).normalize());
  }
  let up = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  Nn.push(new THREE.Vector3().crossVectors(T[0], up).normalize());
  Bn.push(new THREE.Vector3().crossVectors(T[0], Nn[0]).normalize());
  for (let i = 1; i < n; i++) {
    const nn = Nn[i - 1].clone().sub(T[i].clone().multiplyScalar(Nn[i - 1].dot(T[i]))).normalize();
    Nn.push(nn); Bn.push(new THREE.Vector3().crossVectors(T[i], nn).normalize());
  }
  let s = 0; const ids = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) s += points[i].distanceTo(points[i - 1]);
    const r = rad(i);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU + twist * s;
      const c = Math.cos(a), sn = Math.sin(a);
      const nx = Nn[i].x * c + Bn[i].x * sn, ny = Nn[i].y * c + Bn[i].y * sn, nz = Nn[i].z * c + Bn[i].z * sn;
      ids.push(mb.vert(points[i].x + nx * r, points[i].y + ny * r, points[i].z + nz * r, nx, ny, nz, s * uvScale + helix * (j / radial), j / radial));
    }
  }
  mb.grid(ids, n, radial + 1, false);
  if (caps) {
    for (const end of [0, n - 1]) {
      const sign = end === 0 ? -1 : 1; const t = T[end]; const r = rad(end);
      if (caps === 'round') {
        const rings = Math.max(2, radial >> 2); const base = [];
        for (let k = 1; k <= rings; k++) {
          const th = (k / rings) * Math.PI / 2; const cr = Math.cos(th) * r, off = Math.sin(th) * r * sign;
          const row = [];
          for (let j = 0; j <= radial; j++) {
            const a = (j / radial) * TAU + twist * (end === 0 ? 0 : s);
            const c = Math.cos(a), sn = Math.sin(a);
            const dx = Nn[end].x * c + Bn[end].x * sn, dy = Nn[end].y * c + Bn[end].y * sn, dz = Nn[end].z * c + Bn[end].z * sn;
            const px = points[end].x + dx * cr + t.x * off, py = points[end].y + dy * cr + t.y * off, pz = points[end].z + dz * cr + t.z * off;
            const nx = dx * Math.cos(th) + t.x * Math.sin(th) * sign, ny = dy * Math.cos(th) + t.y * Math.sin(th) * sign, nz = dz * Math.cos(th) + t.z * Math.sin(th) * sign;
            row.push(mb.vert(px, py, pz, nx, ny, nz, 0, 0));
          }
          base.push(row);
        }
        const first = ids.slice(end * (radial + 1), end * (radial + 1) + radial + 1);
        const allRows = [first, ...base];
        for (let k = 0; k < allRows.length - 1; k++) for (let j = 0; j < radial; j++) {
          const a = allRows[k][j], b = allRows[k][j + 1], c = allRows[k + 1][j], d = allRows[k + 1][j + 1];
          mb.tri(a, c, b); mb.tri(b, c, d);
        }
      } else {
        const base = mb.count; const c0 = mb.vert(points[end].x, points[end].y, points[end].z, t.x * sign, t.y * sign, t.z * sign);
        for (let j = 0; j <= radial; j++) {
          const id = ids[end * (radial + 1) + j];
          mb.vert(mb.pos[3 * id], mb.pos[3 * id + 1], mb.pos[3 * id + 2], t.x * sign, t.y * sign, t.z * sign);
        }
        for (let j = 0; j < radial; j++) mb.tri(c0, base + 1 + j, base + 2 + j);
      }
    }
  }
  return mb;
}

// --------------------------------------------------------------------------------------------- ring loft
/**
 * Loft between closed rings (arrays of THREE.Vector3 with equal counts). Smooth normals from the mesh.
 * capStart/capEnd: fan caps with the given normal sign.
 */
export function loftRings(rings, { capStart = false, capEnd = false } = {}) {
  const rows = rings.length, cols = rings[0].length;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(rows * cols * 3 + (capStart ? (cols + 1) * 3 : 0) + (capEnd ? (cols + 1) * 3 : 0));
  let k = 0;
  for (const r of rings) for (const p of r) { pos[k++] = p.x; pos[k++] = p.y; pos[k++] = p.z; }
  const idx = [];
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) {
    const j1 = (j + 1) % cols;
    const a = i * cols + j, b = i * cols + j1, c = (i + 1) * cols + j, d = (i + 1) * cols + j1;
    idx.push(a, c, b, b, c, d);
  }
  let base = rows * cols;
  const capFan = (ring, flip) => {
    const c = new THREE.Vector3(); ring.forEach((p) => c.add(p)); c.multiplyScalar(1 / ring.length);
    const b0 = base; pos[3 * base] = c.x; pos[3 * base + 1] = c.y; pos[3 * base + 2] = c.z; base++;
    for (let j = 0; j < cols; j++) { const p = ring[j]; pos[3 * base] = p.x; pos[3 * base + 1] = p.y; pos[3 * base + 2] = p.z; base++; }
    for (let j = 0; j < cols; j++) { const a = b0 + 1 + j, b = b0 + 1 + ((j + 1) % cols); if (flip) idx.push(b0, b, a); else idx.push(b0, a, b); }
  };
  if (capStart) capFan(rings[0], true);
  if (capEnd) capFan(rings[rows - 1], false);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
}

/** Rounded rectangle ring (in a local u-v plane) as Vector3 points via a mapping function. n points total. */
export function roundedRectRing(hw, hh, r, n, map) {
  r = Math.min(r, hw - 1e-6, hh - 1e-6);
  const per = (2 * (hw - r) + 2 * (hh - r)) * 2 + TAU * r;
  const pts = [];
  for (let i = 0; i < n; i++) {
    let s = (i / n) * per;
    const segs = [
      ['l', hh - r], ['a', Math.PI / 2 * r, 0], ['t', 2 * (hw - r)], ['a', Math.PI / 2 * r, 1], ['l2', 2 * (hh - r)],
      ['a', Math.PI / 2 * r, 2], ['t2', 2 * (hw - r)], ['a', Math.PI / 2 * r, 3], ['l3', hh - r],
    ];
    let u = 0, v = 0;
    for (const sg of segs) {
      const L = sg[1];
      if (s <= L + 1e-12) {
        const f = L > 0 ? s / L : 0;
        switch (sg[0]) {
          case 'l': u = hw; v = f * (hh - r); break;
          case 't': u = hw - r - f * 2 * (hw - r); v = hh; break;
          case 'l2': u = -hw; v = hh - r - f * 2 * (hh - r); break;
          case 't2': u = -hw + r + f * 2 * (hw - r); v = -hh; break;
          case 'l3': u = hw; v = -hh + r + f * (hh - r); break;
          case 'a': {
            const q = sg[2]; const a0 = q * Math.PI / 2; const a = a0 + f * Math.PI / 2;
            const cx = [hw - r, -hw + r, -hw + r, hw - r][q], cy = [hh - r, hh - r, -hh + r, -hh + r][q];
            u = cx + Math.cos(a) * r; v = cy + Math.sin(a) * r; break;
          }
        }
        break;
      }
      s -= L;
    }
    pts.push(map(u, v));
  }
  return pts;
}

export function disposeAll(obj) {
  obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
