// Terrain: one deterministic height function h(x, z) built from the layout features (research/refs.md section 4),
// meshed as disjoint polar patches around the piano. Triangles that no camera near the piano can see (under water,
// facing away from the lake, or below the skyline seen from the lake) are culled at build time, which keeps the
// mesh inside the triangle budget (it is drawn twice per sub-frame: main + reflection).
// Shading: rock / granite / snow albedo, sky irradiance (SH9 of the sky model + mirror lake), concavity AO,
// per-pixel detail normals and snow streaks, aerial perspective and the low mist layer (atmosphere GLSL).
import * as THREE from 'three';
import { GLSL_NOISE, makeNoise2D, ridged, billow, fbm, smoothstep, piecewise, azDir, azOf, DEG, halton, hash2i } from './util.js';
import { SKY_UNIFORMS_GLSL, SKY_FUNCS_GLSL, SH_GLSL, ENV_LAYER } from './sky.js';

const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

/**
 * 'chain' features expand into serrated chains of faceted peaks (deterministic, Halton-placed): azimuth A0..A1 every
 * ~spacing deg, distance d0..d1, summit elevation = E(A) x eRange, base radius = Rk x height. The refs' skylines are
 * rows of sharp pyramids, not flat ridges.
 */
export function expandChains(features) {
  const out = [];
  for (const f of features) {
    if (f.kind !== 'chain') { out.push(f); continue; }
    const n = Math.max(1, Math.round((f.A1 - f.A0) / f.spacing));
    const [e0, e1] = f.eRange ?? [0.72, 1.04];
    for (let i = 0; i < n; i++) {
      const s = (f.seed ?? 0) * 97 + i + 1;
      const A = f.A0 + (i + 0.5 + (f.jitter ?? 0.7) * (halton(s, 2) - 0.5)) * (f.A1 - f.A0) / n;
      const d = f.d0 + (f.d1 - f.d0) * halton(s, 3);
      const E = piecewise(f.E, A) * (e0 + (e1 - e0) * halton(s, 5));
      const H = d * Math.tan(E * DEG);
      const R = H * (f.Rk ?? 2.5) * (0.85 + 0.3 * halton(s, 7));
      out.push({ kind: 'peak', A, d, E, R, rough: f.rough ?? 0.4, scale: R * (f.scaleK ?? 0.4), oct: f.oct ?? 6, snow: f.snow,
        facet: (f.facet ?? 0.28) * (0.8 + 0.4 * halton(s, 11)), p: f.p ?? 1.55,
        ribs: f.snow ? [Math.max(250, R * 0.1), f.ribAmp ?? 0.045] : undefined });
    }
  }
  return out;
}

/** the world height function (m above the water) */
export function makeHeightField(T) {
  const nz = makeNoise2D(T.seed), nz2 = makeNoise2D(T.seed + 101), nz3 = makeNoise2D(T.seed + 202);
  // cycle 3: optional mid-ground ridge layers (T.midRidges, off by default until verified on the GPU): sloping spurs at
  // 6-8 km and 11-13 km that run down to the water (the refs' overlapping dark ridge silhouettes between lake and far chain)
  const feats = expandChains([...T.features, ...(T.midRidges?.on ? T.midRidges.features : [])]).map((f, i) => {
    const g = { ...f, i };
    // heights given as elevation angles seen from the piano -> metres at the feature distance
    if (f.E !== undefined) {
      if (Array.isArray(f.E)) g.H = f.E.map(([A, e]) => [A, f.d * Math.tan(e * DEG)]);
      else g.H = f.d * Math.tan(f.E * DEG);
    }
    g.oct = f.oct ?? 8;
    if (f.R !== undefined) g.R = f.R * (f.Rk ?? 1);
    if (f.snow && !f.ribs) g.ribs = [500, 0.05];          // rock ribs between snow gullies on every snowy feature
    if (f.kind === 'peak') { const [dx, dz] = azDir(f.A); g.cx = dx * f.d; g.cz = dz * f.d; }
    if (f.kind === 'peak' && (f.style ?? T.peakStyle ?? 'alpine') === 'alpine') {
      // alpine pyramid: 3-5 aretes radiating from the summit (descending ridge profiles with jagged crests),
      // planar faces falling off on both sides of every arete; the mountain is the (smooth) max of the arete wedges
      g.alpine = true;
      const sd = (i + 1) * 7 + (T.seed ?? 0) * 131;
      // every peak its own character (fix round 1): 3-5 aretes, profile exponent 1.2-1.8, face slope x 0.6-1.4,
      // and 2-3 sub-summits at 0.70-0.85 H, 0.3-0.6 R out along the aretes (multi-peak crests)
      const V = T.peakVariety ?? 1;
      const n = f.nArete ?? (3 + Math.floor(3 * halton(sd, 13)));
      const th0 = 2 * Math.PI * halton(sd, 2);
      const pPeak = f.areteP ?? (V ? 1.2 + 0.6 * halton(sd, 17) : (T.areteP ?? 1.25));
      const facePeak = (f.face ?? T.faceSlope ?? 0.85) * (V ? 0.6 + 0.8 * halton(sd, 19) : 1);
      // fix round 2: sub-summits OFF by default (T.subSummits 0): they made the multi-spire castle crests
      const nSub = V && (T.subSummits ?? 1) ? 2 + (halton(sd, 23) > 0.5 ? 1 : 0) : 0;
      g.ar = [];
      for (let k = 0; k < n; k++) {
        const th = th0 + (k + 0.45 * (halton(sd * 5 + k, 3) - 0.5)) * 2 * Math.PI / n;
        const hh = halton(sd * 5 + k, 5);
        const a = { ux: Math.cos(th), uz: Math.sin(th), len: g.R * (0.7 + 0.55 * hh), p: pPeak * (0.85 + 0.3 * halton(sd * 5 + k, 7)),
          face: facePeak * (0.8 + 0.45 * halton(sd * 5 + k, 11)), sub: null };
        if (k < nSub) a.sub = { s0: g.R * (0.3 + 0.3 * halton(sd * 5 + k, 29)), h: 0.70 + 0.15 * halton(sd * 5 + k, 31), w: g.R * (0.07 + 0.05 * halton(sd * 5 + k, 37)) };
        g.ar.push(a);
      }
      g.jag = f.jag ?? T.areteJag ?? 0.05;
    }
    else { g.Ac = (f.A0 + f.A1) / 2; g.half = (f.A1 - f.A0) / 2; g.edge = f.edge ?? Math.min(6, g.half * 0.3); }
    g.ox = (i * 7919.3) % 1000; g.oz = (i * 104729.7) % 1000;   // decorrelate the features' noise
    return g;
  });
  const g_oct = (f) => f.oct;
  function window1(f, A) { // -> [local azimuth, edge weight] or null
    const d = wrap180(A - f.Ac);
    if (Math.abs(d) > f.half) return null;
    return [f.Ac + d, smoothstep(f.half, f.half - f.edge, Math.abs(d))];
  }
  return function height(x, z) {
    const r = Math.hypot(x, z), A = azOf(x, z);
    let h = -14;
    for (const f of feats) {
      let hf = -1e9;
      if (f.kind === 'peak' && f.alpine) {
        let dx = x - f.cx, dz = z - f.cz;
        const r2 = dx * dx + dz * dz;
        if (r2 > f.R * f.R * 1.6) continue;
        if (f.H * 1.12 + 30 < h) continue;                               // cannot raise the current height
        // gentle warp: aretes are not straight lines
        const wq = f.R * 0.45;
        dx += f.R * 0.07 * nz2((x + f.ox) / wq, (z + f.oz) / wq); dz += f.R * 0.07 * nz2((x - f.oz) / wq + 9.1, (z + f.ox) / wq);
        let best = -1e9;
        for (const a of f.ar) {
          const s = dx * a.ux + dz * a.uz, t = Math.abs(-dx * a.uz + dz * a.ux);
          const u = Math.min(Math.max(s, 0) / a.len, 1);
          let crest = f.H * Math.pow(1 - u, a.p);
          if (a.sub) {   // sub-summit: a rounded bump on the crest line (the faces fall away from it as from the arete)
            const qq = (s - a.sub.s0) / a.sub.w;
            if (qq > -3 && qq < 3) crest = smax(crest, f.H * a.sub.h - f.H * 0.12 * qq * qq, f.H * 0.03);
          }
          let hw = crest - t * a.face - (s < 0 ? -s * a.face * 1.2 : 0);
          if (hw + f.H * f.jag < best - f.H * 0.035) continue;          // this wedge cannot win here
          // jagged crest: gendarmes / notches along the arete, larger further down
          hw += f.H * f.jag * (ridged(nz3, (s + f.ox) / (f.R * 0.09), a.ux * 7.3 + f.i, { oct: 4 }) - 0.55) * Math.min(1, u * 3 + 0.25);
          best = best < -1e8 ? hw : smax(best, hw, f.H * 0.035);
        }
        // base apron: the lower slopes merge between the aretes (no starfish), the upper pyramid stays sharp
        const rr = Math.sqrt(r2) / f.R;
        best = smax(best, f.H * (f.apron ?? T.apron ?? 0.5) * Math.pow(Math.max(0, 1 - rr / 1.05), 1.4), f.H * 0.06);
        // faces: erosion gullies (ridged multifractal) cut into the faces, not into the summit
        const gul = ridged(nz, (x + f.ox) / f.scale, (z + f.oz) / f.scale, { oct: f.oct });
        hf = best - f.H * (f.rough ?? 0.3) * 0.35 * (gul - 0.35) * Math.min(1, rr * 2.5);
        if (f.ribs) hf += f.H * f.ribs[1] * 2 * (ridged(nz3, (x - f.oz) / f.ribs[0], (z + f.ox) / f.ribs[0], { oct: 4 }) - 0.45) * Math.min(1, rr * 3);
        hf = Math.max(hf, -20);
      } else if (f.kind === 'peak') {
        const dx = x - f.cx, dz = z - f.cz;
        if (dx * dx + dz * dz > f.R * f.R * 5.8) continue;   // outside any facet modulation (min facet ~0.42)
        // pyramidal summit: the radius is modulated with direction (3-5 aretes and faces), plus a noise warp
        const th = Math.atan2(dz, dx);
        const facet = 1 + (f.facet ?? 0.22) * Math.cos((f.nArete ?? 3) * th + f.i * 1.7) + 0.08 * Math.cos(5 * th + f.i * 0.9)
          + 0.12 * fbm(nz2, (x + f.ox) / (f.R * 0.6), (z + f.oz) / (f.R * 0.6), 3);
        const rho = Math.hypot(dx, dz) / f.R * facet;
        if (rho >= 1) continue;
        const base = Math.pow(1 - rho, f.p ?? 1.05);
        if (base * f.H * 1.2 + 0.06 * f.H + 30 < h) continue;   // cannot raise the current height
        const N = Math.min(1.15, ridged(nz, (x + f.ox) / f.scale, (z + f.oz) / f.scale, { oct: g_oct(f) }) * 1.25);
        hf = f.H * base * ((1 - f.rough) + f.rough * N);
        if (f.ribs) hf += f.H * f.ribs[1] * 2 * (ridged(nz3, (x - f.oz) / f.ribs[0], (z + f.ox) / f.ribs[0], { oct: 4 }) - 0.45) * Math.min(1, base * 3);
      } else if (f.kind === 'ridge') {
        const w = window1(f, A); if (!w) continue;
        const xc = (r - f.d) / f.width;
        if (Math.abs(xc) >= 1) continue;
        const cross = Math.pow(1 - xc * xc, 1.5);
        const N = Math.min(1.15, ridged(nz, (x + f.ox) / f.scale, (z + f.oz) / f.scale, { oct: g_oct(f) }) * 1.25);
        const Hc = piecewise(f.H, w[0]) * w[1];
        hf = Hc * cross * ((1 - f.rough) + f.rough * N);
        if (f.ribs) hf += Hc * f.ribs[1] * 2 * (ridged(nz3, (x - f.oz) / f.ribs[0], (z + f.ox) / f.ribs[0], { oct: 4 }) - 0.45) * Math.min(1, cross * 3);
      } else if (f.kind === 'shore') {
        const w = window1(f, A); if (!w) continue;
        const s = piecewise(f.shore, w[0]) * (1 + 0.10 * fbm(nz2, x / 260, z / 260, 4));
        const t = (r - s) / f.rise;
        const H = piecewise(f.H, w[0]);
        const S = t <= 0 ? 0 : smoothstep(0, 1, Math.min(t, 1)) * (1 + (f.grow ?? 0) * Math.min(Math.max(t - 1, 0), 3));
        const B = billow(nz3, (x + f.ox) / f.scale, (z + f.oz) / f.scale, 5);
        const fine = fbm(nz2, x / 23, z / 23, 3);
        hf = -2.5 + (H + 2.5) * S * (0.45 + 0.75 * B) + (t < 0 ? 9 * t : 0) + 1.6 * fine * Math.min(1, t * 4 + 0.2);
        hf = hf * w[1] + (-14) * (1 - w[1]);
      }
      h = smax(h, hf, 30);
    }
    return h;
  };
}

/**
 * Erosion gullies (session 7): slope-aligned stripe noise, octave by octave (after R. S. Johansen's erosion filter):
 * every octave lays stripes ALONG the current fall line (its crests and troughs run downhill: ribs and couloirs), with
 * a random phase per jittered cell blended by a smooth kernel; the blend's phasor is normalised, so where the cells
 * disagree the stripes fork (branching). Each octave adds its own slope to the gradient the next, finer octave
 * follows: the finer gullies run down the flanks of the coarser ribs (dendritic drainage). Amplitude ~ k x wavelength
 * (scale-free slopes), ridge crests sharpened. Octaves are faded by how well the mesh resolves them ACROSS the slope
 * (azimuth / radial cell size at that distance), so nothing aliases. Pure function of (x, z, gradient): deterministic.
 * returns [dh (m), gully (-1 couloir .. +1 rib crest)]
 */
export function erosionAt(x, z, h0, gx, gz, E, out) {
  const r = Math.hypot(x, z) || 1;
  const eRx = x / r, eRz = z / r;                     // radial unit vector (the azimuth tangent is (-eRz, eRx))
  const g0 = Math.hypot(gx, gz);
  const slopeW = smoothstep(E.minSlope[0], E.minSlope[1], g0);
  let dh = 0, gs = 0, gw = 0, Gx = gx, Gz = gz;
  if (slopeW <= 0) { out[0] = 0; out[1] = 0; return out; }
  const cA = r * E.cellA, cR = r * piecewise(E.cellR, r);
  for (let o = 0; o < E.octaves; o++) {
    const lam = E.lambda0 / Math.pow(2, o);
    const gl = Math.hypot(Gx, Gz);
    if (gl < 1e-5) break;
    const cx = -Gz / gl, cz = Gx / gl;                // across the slope (the stripes vary along c)
    const cr = cx * eRx + cz * eRz, ca = -cx * eRz + cz * eRx;
    const cell = Math.sqrt(ca * ca * cA * cA + cr * cr * cR * cR);
    // resolvable by the mesh across the slope, and not deeper than the ground is high (no 2 km ribs on an 80 m hill)
    const wRes = smoothstep(E.resolve[0], E.resolve[1], lam / cell) * smoothstep(1, 0.5, lam / (E.relief * Math.max(h0, 1)));
    if (wRes <= 0) continue;
    const fx = x / lam, fz = z / lam;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    let S = 0, C = 0, W = 0;
    for (let di = -1; di <= 2; di++) for (let dj = -1; dj <= 2; dj++) {
      const h = hash2i(ix + di, iz + dj, E.seed * 31 + o);
      const qx = ix + di + (h & 0xffff) / 65536, qz = iz + dj + (h >>> 16) / 65536;
      const dx = fx - qx, dz = fz - qz, r2 = dx * dx + dz * dz;
      if (r2 >= 2.25) continue;
      const t = 1 - r2 / 2.25, w = t * t * t;
      const ph = 6.283185 * ((dx * cx + dz * cz) + (Math.imul(h, 0x9E3779B1) >>> 0) / 4294967296);
      C += w * Math.cos(ph); S += w * Math.sin(ph); W += w;
    }
    if (W <= 0) continue;
    const m = Math.hypot(C, S) + 1e-6;
    const cv = C / m, sv = S / m;                     // normalised phasor: cos / sin of the stripe phase
    const conf = smoothstep(0.05, 0.35, m / W);       // weak where the cells cancel (forks): fade, no singular kinks
    // sharpened ridge profile: mix(cos, 1 - sqrt(2 (1 - cos)) ~ 1 - 2|sin(phi/2)|)
    const sq = Math.sqrt(Math.max(2 * (1 - cv), 0));
    const f = (1 - E.sharp) * cv + E.sharp * (1 - sq);
    const df = (1 - E.sharp) + E.sharp / Math.max(sq, 0.35);   // d f / d cos (clamped at the crest kink)
    const amp = E.k * lam * Math.pow(E.decay, o) * wRes * slopeW * conf;
    dh += amp * f;
    // d(cos phi)/dp = -sin phi x 2 pi / lam x c  ->  the next octave follows the eroded slope
    const dd = -amp * df * sv * 6.283185 / lam;
    Gx += dd * cx; Gz += dd * cz;
    const gwt = amp / lam; gs += gwt * f; gw += gwt;
  }
  out[0] = dh; out[1] = gw > 0 ? gs / gw : 0;
  return out;
}

/** build the culled polar patches -> one BufferGeometry (position, normal, aAO, aSnowable) */
export function buildTerrainGeometry(P, height, { eyeHeight = 12, horizonMargin = 0.06 } = {}) {
  const T = P.terrain;
  const pos = [], nrm = [], nsm = [], ao = [], snw = [], crs = [], gul = [], idx = [];
  let vbase = 0, trisIn = 0;
  const snowFeat = T.features.filter((f) => f.snow);
  // cycle 3 round 2 (critic: 19 km seam, height gap max 172 m, normal jump p90 43 deg, AO / crest-flag jumps): where
  // another patch adjoins, the grid extends by a GUARD band (radially min(metres, frac x d), sideways deg); every
  // post-process (local max, erosion, crest opening, normals, AO, crest flag) runs on the extended grid, only the core
  // cells are emitted, and a patch's inner boundary row is WELDED to the previous patch's outer row (linear in azimuth,
  // the difference faded over weldRows rows), so both sides meet without a step or a crack.
  const G = T.guard ?? { on: 0 };
  const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a));
  const azOverlap = (p, o) => p.A0 < o.A1 && o.A0 < p.A1;
  const azAdj = (a, b) => { const r = ((a - b) % 360 + 360) % 360; return r < 1e-6 || r > 360 - 1e-6; };
  const outerRows = [];      // { d, A0, dA, n, H } of the patches built so far
  const patchRanges = [];
  for (const pt of T.patches) {
    const cA = Math.max(8, Math.round(pt.nA * T.detail)), cD = Math.max(4, Math.round(pt.nD * T.detail));
    const q = Math.pow(pt.d1 / pt.d0, 1 / cD);
    const dAdeg = (pt.A1 - pt.A0) / cA;
    const others = T.patches.filter((o) => o !== pt);
    const hasIn = !!G.on && others.some((o) => near(o.d1, pt.d0) && azOverlap(o, pt));
    const hasOut = !!G.on && others.some((o) => near(o.d0, pt.d1) && azOverlap(o, pt));
    const hasSide = !!G.on && others.some((o) => azAdj(o.A1, pt.A0) || azAdj(o.A0, pt.A1));
    const gm = (d) => Math.min(G.metres ?? 2000, (G.frac ?? 0.2) * d);
    const gIn = hasIn ? Math.ceil(Math.log(pt.d0 / (pt.d0 - gm(pt.d0))) / Math.log(q)) : 0;
    const gOut = hasOut ? Math.ceil(Math.log((pt.d1 + gm(pt.d1)) / pt.d1) / Math.log(q)) : 0;
    const gA = hasSide ? Math.ceil((G.deg ?? 3) / dAdeg) : 0;
    const nA = cA + 2 * gA, nD = cD + gIn + gOut;          // extended grid
    const NA = nA + 1, ND = nD + 1;
    const dOf = (j) => pt.d0 * Math.pow(q, j - gIn);
    const AOf = (i) => pt.A0 + dAdeg * (i - gA);
    const H = new Float32Array(NA * ND), X = new Float32Array(NA * ND), Z = new Float32Array(NA * ND);
    // coarse-to-fine (session 6): the height function is evaluated exactly on every refine-th row; the rows between are
    // evaluated only where a bracketing coarse vertex (or a neighbouring column's) can be seen from the lake with a
    // generous margin, and interpolated elsewhere (those triangles are culled below anyway: a linear interpolation of
    // two vertices under the skyline stays under it). ~3-5x faster for the dense far patches.
    const rf = Math.max(1, pt.refine ?? T.refine ?? 4);
    const rmod = (j) => (((j - gIn) % rf) + rf) % rf;
    const exact = (j) => rf === 1 || rmod(j) === 0 || j === 0 || j === nD || j === gIn + cD;
    for (let i = 0; i < NA; i++) {
      const A = AOf(i);
      const [dx, dz] = azDir(A);
      for (let j = 0; j < ND; j++) {
        const d = dOf(j);
        const k = i * ND + j;
        X[k] = dx * d; Z[k] = dz * d;
        if (exact(j)) H[k] = height(X[k], Z[k]);
      }
    }
    if (rf > 1) {
      const cvis = new Uint8Array(NA * ND);
      const mrg = T.refineMarginDeg ?? 0.7;
      for (let i = 0; i < NA; i++) {
        let maxE = -1e9;
        for (let j = 0; j < ND; j++) {
          if (!exact(j)) continue;
          const k = i * ND + j; const d = dOf(j);
          const e = Math.atan2(H[k] - eyeHeight, d) / DEG;
          cvis[k] = e >= maxE - mrg ? 1 : 0;
          if (e > maxE) maxE = e;
        }
      }
      for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
        if (exact(j)) continue;
        let j0 = Math.max(0, j - rmod(j)); while (j0 > 0 && !exact(j0)) j0--;
        let j1 = j + 1; while (j1 < nD && !exact(j1)) j1++;
        const k = i * ND + j;
        let need = false;
        for (let ii = Math.max(0, i - 1); ii <= Math.min(nA, i + 1) && !need; ii++) need = cvis[ii * ND + j0] === 1 || cvis[ii * ND + j1] === 1;
        if (need) H[k] = height(X[k], Z[k]);
        else { const t = (j - j0) / (j1 - j0); H[k] = H[i * ND + j0] * (1 - t) + H[i * ND + j1] * t; }
      }
    }
    // fix round 2: local crest height (sliding max over ~CS.win metres, azimuth then radius, on the macro height):
    // erosion fades to 0 over the top ER.topFade of the relief and the crests are smoothed (no needle spires)
    const CS = T.crestSmooth;
    const cellsAt = (j, m) => { const d = dOf(j); return [Math.max(1, Math.round(m / (d * dAdeg * DEG))), Math.max(1, Math.round(m / (d * (q - 1))))]; };
    // sliding max of src over ~CS.win m (separable: azimuth, then radius); vertices below lowH keep their own value
    const slideMax = (src) => {
      const out = new Float32Array(NA * ND), tmp = new Float32Array(NA * ND), lowH = CS.minH * 0.5;
      const dq = new Int32Array(NA);
      for (let j = 0; j < ND; j++) {        // azimuth pass: constant window per row -> monotonic deque, O(NA)
        const wi = Math.min(cellsAt(j, CS.win)[0], 240);
        let head = 0, tail = 0, next = 0;
        for (let i = 0; i < NA; i++) {
          const hi = Math.min(nA, i + wi);
          while (next <= hi) {
            const v = src[next * ND + j];
            while (tail > head && src[dq[tail - 1] * ND + j] <= v) tail--;
            dq[tail++] = next++;
          }
          while (dq[head] < i - wi) head++;
          const k = i * ND + j;
          tmp[k] = H[k] < lowH ? src[k] : src[dq[head] * ND + j];
        }
      }
      for (let j = 0; j < ND; j++) {
        const wj = Math.min(cellsAt(j, CS.win)[1], 120);
        for (let i = 0; i < NA; i++) {
          const k = i * ND + j;
          if (H[k] < lowH) { out[k] = src[k]; continue; }
          let m = -1e9;
          for (let jj = Math.max(0, j - wj), j1 = Math.min(nD, j + wj); jj <= j1; jj++) { const v = tmp[i * ND + jj]; if (v > m) m = v; }
          out[k] = m;
        }
      }
      return out;
    };
    const Hmax = CS && CS.on ? slideMax(H) : null;
    const topW = (k, top) => (Hmax && H[k] > 0 ? smoothstep(1 - top, 1 - 0.15 * top, H[k] / Math.max(Hmax[k], 1)) : 0);
    // erosion gullies (session 7, erosionAt): the gradient of the macro height from the grid (2x2 solve on the
    // azimuth / radial tangents), then the slope-aligned octaves on every vertex above the shore band
    const GU = new Float32Array(NA * ND);
    const ER = T.erosion;
    if (ER && ER.on) {
      const dH = new Float32Array(NA * ND);
      const eo = [0, 0];
      for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
        const k = i * ND + j;
        if (H[k] < ER.heightFade[0]) continue;
        const r = Math.hypot(X[k], Z[k]);
        if (r < ER.minDist) continue;
        const i0 = Math.max(0, i - 1), i1 = Math.min(nA, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nD, j + 1);
        const ka0 = i0 * ND + j, ka1 = i1 * ND + j, kd0 = i * ND + j0, kd1 = i * ND + j1;
        const ax = X[ka1] - X[ka0], az = Z[ka1] - Z[ka0], ah = H[ka1] - H[ka0];
        const bx = X[kd1] - X[kd0], bz = Z[kd1] - Z[kd0], bh = H[kd1] - H[kd0];
        const det = ax * bz - az * bx;
        if (Math.abs(det) < 1e-9) continue;
        const gx = (ah * bz - az * bh) / det, gz = (ax * bh - ah * bx) / det;
        erosionAt(X[k], Z[k], H[k], gx, gz, ER, eo);
        const fade = smoothstep(ER.heightFade[0], ER.heightFade[1], H[k]) * smoothstep(ER.minDist, ER.minDist * 1.6, r)
          * (1 - topW(k, ER.topFade ?? 0));
        dH[k] = eo[0] * fade; GU[k] = eo[1] * fade;
      }
      for (let k = 0; k < NA * ND; k++) H[k] += dH[k];
    }
    // crest smoothing (fix round 2): near every local crest the height is blended toward a ~CS.radius m low-pass
    // (2 separable box passes): the gendarmes / notches / needles of aretes, ribs and erosion go, the massive shape stays
    if (Hmax && CS.mode === 'open') {
      // cycle 3: grayscale OPENING with an L1 cone of slope CS.slope (separable: azimuth, then radius): the result is the
      // upper envelope of all slope-s pyramids that fit under the terrain, so spikes / gendarmes steeper than s are cut to
      // straight-flanked points and every apex whose flanks are shallower than s stays exactly as built (a pointed pyramid,
      // not the dome the 160 m low-pass made: apex exponent 2.4 vs ref 1.3). Anti-extensive: never raises the terrain.
      const s = CS.slope ?? 1.5, n = NA * ND;
      let hTop = -1e9; for (let k = 0; k < n; k++) if (H[k] > hTop) hTop = H[k];
      if (hTop >= CS.minH && (CS.cone ?? 'chamfer') === 'chamfer') {
        // cycle 3 round 2: EUCLIDEAN cone (critic: the separable L1 passes built diamond pyramids aligned to the polar grid,
        // ~14 evenly spaced teeth on flanks oblique to it). Two-pass chamfer on the anisotropic polar grid: lateral step
        // (i +- 1) plus every (di, dj +- 1) link with |di| <= K (K ~ 3 x radial / azimuth cell, so the ray directions are
        // < ~18 deg apart: cone anisotropy ~1-2 %), costs s x Euclidean length. Erosion = min(O[n] + c); dilation = the
        // erosion of -O. Then the cut D = min(O, H) - H is widened by a 5-tap binomial blur (D = min(D, blur D): spikes keep
        // their full cut, the rim of the cut region gets a soft one) and applied only where it exceeds cutMin (m): no
        // partially blended band that prints teeth.
        const O = new Float32Array(H);
        const dAr = dAdeg * DEG, KM = CS.chamferK ?? 48;
        const cl = new Float32Array(ND), Kj = new Int32Array(ND), cst = new Array(ND).fill(null);
        for (let j = 0; j < ND; j++) {
          cl[j] = s * dOf(j) * dAr;
          if (j === 0) continue;
          const dm = 0.5 * (dOf(j) + dOf(j - 1)), dd = dOf(j) - dOf(j - 1), az = dm * dAr;
          const K = Math.min(KM, Math.max(1, Math.ceil(3 * dd / az)));
          const c = new Float32Array(2 * K + 1);
          for (let di = -K; di <= K; di++) c[di + K] = s * Math.hypot(di * az, dd);
          Kj[j] = K; cst[j] = c;
        }
        const erode = () => {
          for (let j = 0; j < ND; j++) {            // forward: from (i - 1, j) and (i + di, j - 1)
            const c = cst[j], K = Kj[j], cj = cl[j];
            for (let i = 0; i < NA; i++) {
              const k = i * ND + j; let v = O[k], w;
              if (i > 0 && (w = O[k - ND] + cj) < v) v = w;
              if (c) for (let di = Math.max(-K, -i), d1 = Math.min(K, NA - 1 - i); di <= d1; di++) if ((w = O[k + di * ND - 1] + c[di + K]) < v) v = w;
              O[k] = v;
            }
          }
          for (let j = ND - 1; j >= 0; j--) {       // backward: from (i + 1, j) and (i + di, j + 1)
            const c = j + 1 < ND ? cst[j + 1] : null, K = j + 1 < ND ? Kj[j + 1] : 0, cj = cl[j];
            for (let i = NA - 1; i >= 0; i--) {
              const k = i * ND + j; let v = O[k], w;
              if (i < NA - 1 && (w = O[k + ND] + cj) < v) v = w;
              if (c) for (let di = Math.max(-K, -i), d1 = Math.min(K, NA - 1 - i); di <= d1; di++) if ((w = O[k + di * ND + 1] + c[di + K]) < v) v = w;
              O[k] = v;
            }
          }
        };
        erode();
        for (let k = 0; k < n; k++) O[k] = -O[k];
        erode();
        for (let k = 0; k < n; k++) O[k] = -O[k];
        const D = new Float32Array(n), Bt = new Float32Array(n);
        for (let k = 0; k < n; k++) D[k] = Math.min(O[k], H[k]) - H[k];
        const bw = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
        for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
          let a = 0; for (let t = -2; t <= 2; t++) a += bw[t + 2] * D[Math.min(nA, Math.max(0, i + t)) * ND + j]; Bt[i * ND + j] = a;
        }
        for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
          let a = 0; for (let t = -2; t <= 2; t++) a += bw[t + 2] * Bt[i * ND + Math.min(nD, Math.max(0, j + t))];
          const k = i * ND + j; D[k] = Math.min(D[k], a);
        }
        const cm = CS.cutMin ?? [1, 3];
        for (let k = 0; k < n; k++) {
          if (H[k] < CS.minH) continue;
          const t = topW(k, CS.top) * CS.amount * smoothstep(CS.minH, CS.minH * 2, H[k]) * smoothstep(cm[0], cm[1], -D[k]);
          H[k] += D[k] * t;
        }
        // crest anti-aliasing (cycle 3 round 2): a sharp arete crossing the radial rows obliquely is cut by the triangles at
        // every row crossing -> a regular saw-tooth silhouette (CPU teeth_cpu.py: runs of 6-10 evenly spaced teeth on the
        // left peak's flank). In the crest zone the height is blended (weight crestAA x topW) toward a 3-tap radial
        // [1 2 1] / 4 average: the arete is rounded over ~2 radial cells, the silhouette loses the row-crossing teeth.
        const caa = CS.crestAA ?? 0;
        if (caa > 0) {
          // cycle 4 (critic teeth4: the left peak's long flank keeps a regular saw-tooth, skyline residual 0.9-1.05 px vs refs
          // 2.5-6.7): topW is small low on a long flank arete (local max 1.2 km up the ridge), so the AA also follows the
          // radial CONVEXITY (ridgeAA: weight, convexity from / to m: every arete crossing a row), aaPasses times
          const rAA = CS.ridgeAA ?? [0, 2, 10], passes = CS.aaPasses ?? 1;
          for (let pass = 0; pass < passes; pass++) {
            const Hc = new Float32Array(H);
            for (let i = 0; i < NA; i++) for (let j = 1; j < nD; j++) {
              const k = i * ND + j; if (Hc[k] < CS.minH) continue;
              const cvx = Hc[k] - 0.5 * (Hc[k - 1] + Hc[k + 1]);
              const w = caa * Math.max(topW(k, CS.top), rAA[0] * smoothstep(rAA[1], rAA[2], cvx)) * smoothstep(CS.minH, CS.minH * 2, Hc[k]);
              H[k] += (0.25 * (Hc[k - 1] + 2 * Hc[k] + Hc[k + 1]) - Hc[k]) * w;
            }
          }
        }
      } else if (hTop >= CS.minH) {
        // cycle 3 round 1: L1 cone (separable azimuth / radius passes), kept for A/B (crestSmooth.cone 'l1')
        const O = new Float32Array(n); O.set(H);
        const dA = dAdeg * DEG;
        const passA = (sgn) => {           // sgn -1: erosion (min with +s d), +1: dilation (max with -s d)
          for (let j = 0; j < ND; j++) {
            const c = s * dOf(j) * dA;
            for (let i = 1; i < NA; i++) { const k = i * ND + j, v = O[k - ND] - sgn * c; if (sgn < 0 ? v < O[k] : v > O[k]) O[k] = v; }
            for (let i = NA - 2; i >= 0; i--) { const k = i * ND + j, v = O[k + ND] - sgn * c; if (sgn < 0 ? v < O[k] : v > O[k]) O[k] = v; }
          }
        };
        const passD = (sgn) => {
          for (let i = 0; i < NA; i++) {
            const b = i * ND;
            for (let j = 1; j < ND; j++) { const c = s * (dOf(j) - dOf(j - 1)), v = O[b + j - 1] - sgn * c; if (sgn < 0 ? v < O[b + j] : v > O[b + j]) O[b + j] = v; }
            for (let j = ND - 2; j >= 0; j--) { const c = s * (dOf(j + 1) - dOf(j)), v = O[b + j + 1] - sgn * c; if (sgn < 0 ? v < O[b + j] : v > O[b + j]) O[b + j] = v; }
          }
        };
        passA(-1); passD(-1); passA(1); passD(1);
        for (let k = 0; k < n; k++) {
          if (H[k] < CS.minH) continue;
          const t = topW(k, CS.top) * CS.amount * smoothstep(CS.minH, CS.minH * 2, H[k]);
          H[k] += (Math.min(O[k], H[k]) - H[k]) * t;
        }
      }
    } else if (Hmax) {
      const A1 = new Float32Array(NA * ND), B1 = new Float32Array(NA * ND);
      A1.set(H);
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < ND; j++) {
          const wi = cellsAt(j, CS.radius)[0];
          for (let i = 0; i < NA; i++) {
            const k = i * ND + j; if (H[k] < CS.minH * 0.5) { B1[k] = A1[k]; continue; }
            let s = 0, c = 0;
            for (let ii = Math.max(0, i - wi), i1 = Math.min(nA, i + wi); ii <= i1; ii++) { s += A1[ii * ND + j]; c++; }
            B1[k] = s / c;
          }
        }
        for (let j = 0; j < ND; j++) {
          const wj = cellsAt(j, CS.radius)[1];
          for (let i = 0; i < NA; i++) {
            const k = i * ND + j; if (H[k] < CS.minH * 0.5) { A1[k] = B1[k]; continue; }
            let s = 0, c = 0;
            for (let jj = Math.max(0, j - wj), j1 = Math.min(nD, j + wj); jj <= j1; jj++) { s += B1[i * ND + jj]; c++; }
            A1[k] = s / c;
          }
        }
      }
      // summit-preserving: the low-pass is lifted by the local drop of the crest height (local max of H minus local max
      // of the low-pass), so the summits keep their plate-matched elevation angles; only the spikes and notches go
      const mH = slideMax(H), mA = slideMax(A1);
      for (let k = 0; k < NA * ND; k++) {
        if (H[k] < CS.minH) continue;
        const t = topW(k, CS.top) * CS.amount * smoothstep(CS.minH, CS.minH * 2, H[k]);
        H[k] += (A1[k] + Math.max(0, mH[k] - mA[k]) * (CS.lift ?? 1) - H[k]) * t;
      }
    }
    // weld (cycle 3 round 2): the inner core row takes the previous patch's outer-row heights (linear in azimuth, so the
    // vertices lie on that patch's boundary edges), the difference fading over G.weldRows rows to both sides
    if (hasIn && (G.weldRows ?? 4) > 0) {
      const wr = Math.max(1, G.weldRows ?? 4);
      for (const r of outerRows) {
        if (!near(r.d, pt.d0)) continue;
        for (let i = 0; i < NA; i++) {
          const u = (AOf(i) - r.A0) / r.dA; if (u < 0 || u > r.n) continue;
          const u0 = Math.min(r.n - 1, Math.floor(u)), f = u - u0;
          const k0 = i * ND + gIn, delta = r.H[u0] * (1 - f) + r.H[u0 + 1] * f - H[k0];
          for (let m = -wr + 1; m < wr; m++) { const j = gIn + m; if (j < 0 || j > nD) continue; H[i * ND + j] += delta * (1 - Math.abs(m) / wr); }
        }
      }
    }
    let outerRow = null;
    if (hasOut) {
      const Ho = new Float32Array(cA + 1);
      for (let i = 0; i <= cA; i++) Ho[i] = H[(i + gA) * ND + gIn + cD];
      outerRow = { d: pt.d1, A0: pt.A0, dA: dAdeg, n: cA, H: Ho };
      outerRows.push(outerRow);
    }
    // skyline seen from the lake (eye at the origin, eyeHeight): a vertex is hidden if a nearer vertex in its
    // azimuth column subtends a higher elevation angle
    const vis = new Uint8Array(NA * ND);
    for (let i = 0; i < NA; i++) {
      let maxE = -1e9;
      for (let j = 0; j < ND; j++) {
        const k = i * ND + j; const d = dOf(j);
        const e = Math.atan2(H[k] - eyeHeight, d) / DEG;
        vis[k] = e >= maxE - horizonMargin ? 1 : 0;
        if (e > maxE) maxE = e;
      }
    }
    // normals from the grid (central differences in the local polar frame)
    const N = new Float32Array(NA * ND * 3);
    const g = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
      const k = i * ND + j;
      const i0 = Math.max(0, i - 1), i1 = Math.min(nA, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nD, j + 1);
      const ka0 = i0 * ND + j, ka1 = i1 * ND + j, kd0 = i * ND + j0, kd1 = i * ND + j1;
      a.set(X[ka1] - X[ka0], H[ka1] - H[ka0], Z[ka1] - Z[ka0]);
      b.set(X[kd1] - X[kd0], H[kd1] - H[kd0], Z[kd1] - Z[kd0]);
      g.crossVectors(b, a).normalize();
      if (g.y < 0) g.negate();
      N[k * 3] = g.x; N[k * 3 + 1] = g.y; N[k * 3 + 2] = g.z;
    }
    // stencils at a METRIC scale (session 6: the cell-based 2-cell stencil changed meaning with the mesh resolution):
    // steps (in cells) across / along the radius that span ~m metres at row j
    const steps = (j, m) => { const d = dOf(j); return [Math.max(1, Math.round(m / (d * dAdeg * DEG))), Math.max(1, Math.round(m / (d * (q - 1))))]; };
    // smoothed normal (~snowNormalScaleM) for the snow mask: snowfields follow the large-scale slope and the gullies,
    // not every 20 m bump of the finer mesh (which speckled the snow)
    const NS = new Float32Array(NA * ND * 3);
    const snM = T.snowNormalScaleM ?? 150;
    for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
      const k = i * ND + j; const [si, sj] = steps(j, snM);
      const i0 = Math.max(0, i - si), i1 = Math.min(nA, i + si), j0 = Math.max(0, j - sj), j1 = Math.min(nD, j + sj);
      const ka0 = i0 * ND + j, ka1 = i1 * ND + j, kd0 = i * ND + j0, kd1 = i * ND + j1;
      a.set(X[ka1] - X[ka0], H[ka1] - H[ka0], Z[ka1] - Z[ka0]);
      b.set(X[kd1] - X[kd0], H[kd1] - H[kd0], Z[kd1] - Z[kd0]);
      g.crossVectors(b, a).normalize();
      if (g.y < 0) g.negate();
      NS[k * 3] = g.x; NS[k * 3 + 1] = g.y; NS[k * 3 + 2] = g.z;
    }
    // concavity AO / convexity from a ~curvatureScaleM neighbourhood (valleys and gullies darker, crests lit)
    const AO = new Float32Array(NA * ND), CR = new Float32Array(NA * ND);
    const cvM = T.curvatureScaleM ?? 120;
    for (let i = 0; i < NA; i++) for (let j = 0; j < ND; j++) {
      const k = i * ND + j; let s = 0, c = 0;
      const [si, sj] = steps(j, cvM);
      for (const [di, dj] of [[-si, 0], [si, 0], [0, -sj], [0, sj], [-si, -sj], [si, sj], [-si, sj], [si, -sj]]) {
        const ii = i + di, jj = j + dj; if (ii < 0 || ii > nA || jj < 0 || jj > nD) continue;
        s += H[ii * ND + jj]; c++;
      }
      const d = dOf(j);
      const cell = Math.max(si * d * dAdeg * DEG, sj * d * (q - 1));
      const lap = (s / Math.max(c, 1) - H[k]) / cell;
      AO[k] = Math.min(1, Math.max(0.35, 1 - T.aoStrength * lap));
      CR[k] = smoothstep(0.03, 0.30, -lap);          // convexity: crests / aretes / spurs
    }
    // seam shading weld (cycle 3 round 2): the two grids resolve the fine relief differently (normal jump p90 11-14 deg
    // even with a shared guard band), so the inner core row also takes the previous patch's outer-row normals / AO /
    // convexity / gully, blended back to this patch's own values over weldRows rows
    if (outerRow) {
      const sh = { N: new Float32Array((cA + 1) * 3), NS: new Float32Array((cA + 1) * 3), AO: new Float32Array(cA + 1), CR: new Float32Array(cA + 1), GU: new Float32Array(cA + 1) };
      for (let i = 0; i <= cA; i++) {
        const k = (i + gA) * ND + gIn + cD;
        for (let c = 0; c < 3; c++) { sh.N[i * 3 + c] = N[k * 3 + c]; sh.NS[i * 3 + c] = NS[k * 3 + c]; }
        sh.AO[i] = AO[k]; sh.CR[i] = CR[k]; sh.GU[i] = GU[k];
      }
      outerRow.sh = sh;
    }
    if (hasIn && (G.weldRows ?? 4) > 0) {
      const wr = Math.max(1, G.weldRows ?? 4);
      for (const r of outerRows) {
        if (!near(r.d, pt.d0) || !r.sh) continue;
        for (let i = 0; i < NA; i++) {
          const u = (AOf(i) - r.A0) / r.dA; if (u < 0 || u > r.n) continue;
          const u0 = Math.min(r.n - 1, Math.floor(u)), f = u - u0, lerp = (A, s, c) => A[u0 * s + c] * (1 - f) + A[(u0 + 1) * s + c] * f;
          for (let m = 0; m < wr; m++) {
            const j = gIn + m; if (j > nD) break;
            const w = 1 - m / wr, k = i * ND + j;
            for (const [Dst, Src] of [[N, r.sh.N], [NS, r.sh.NS]]) {
              let x = Dst[k * 3] * (1 - w) + lerp(Src, 3, 0) * w, y = Dst[k * 3 + 1] * (1 - w) + lerp(Src, 3, 1) * w, z = Dst[k * 3 + 2] * (1 - w) + lerp(Src, 3, 2) * w;
              const l = Math.hypot(x, y, z) || 1; Dst[k * 3] = x / l; Dst[k * 3 + 1] = y / l; Dst[k * 3 + 2] = z / l;
            }
            AO[k] = AO[k] * (1 - w) + lerp(r.sh.AO, 1, 0) * w; CR[k] = CR[k] * (1 - w) + lerp(r.sh.CR, 1, 0) * w; GU[k] = GU[k] * (1 - w) + lerp(r.sh.GU, 1, 0) * w;
          }
        }
      }
    }
    // map from grid vertex to output vertex (only vertices used by kept triangles)
    const remap = new Int32Array(NA * ND).fill(-1);
    const use = (k) => {
      if (remap[k] < 0) {
        remap[k] = vbase++;
        pos.push(X[k], H[k], Z[k]); nrm.push(N[k * 3], N[k * 3 + 1], N[k * 3 + 2]); nsm.push(NS[k * 3], NS[k * 3 + 1], NS[k * 3 + 2]); ao.push(AO[k]); crs.push(CR[k]); gul.push(GU[k]);
        // snow allowed on the snowy features' footprints (distance > 4 km so the near hills never get snow)
        const r = Math.hypot(X[k], Z[k]);
        snw.push(snowFeat.length && r > 4000 ? 1 : 0);
      }
      return remap[k];
    };
    const vStart = vbase, tStart = idx.length / 3;
    for (let i = gA; i < gA + cA; i++) for (let j = gIn; j < gIn + cD; j++) {
      const k00 = i * ND + j, k10 = (i + 1) * ND + j, k01 = i * ND + j + 1, k11 = (i + 1) * ND + j + 1;
      for (const tri of [[k00, k01, k10], [k10, k01, k11]]) {
        trisIn++;
        if (H[tri[0]] < -0.8 && H[tri[1]] < -0.8 && H[tri[2]] < -0.8) continue;         // under water
        if (!vis[tri[0]] && !vis[tri[1]] && !vis[tri[2]]) continue;                       // behind the skyline
        // facing away from the lake: back-facing for every camera near the origin
        const cx = (X[tri[0]] + X[tri[1]] + X[tri[2]]) / 3, cz = (Z[tri[0]] + Z[tri[1]] + Z[tri[2]]) / 3;
        const ch = (H[tri[0]] + H[tri[1]] + H[tri[2]]) / 3;
        a.set(X[tri[1]] - X[tri[0]], H[tri[1]] - H[tri[0]], Z[tri[1]] - Z[tri[0]]);
        b.set(X[tri[2]] - X[tri[0]], H[tri[2]] - H[tri[0]], Z[tri[2]] - Z[tri[0]]);
        g.crossVectors(a, b);
        if (g.y < 0) g.negate();
        const toEye = new THREE.Vector3(-cx, eyeHeight - ch, -cz);
        if (g.dot(toEye) < -0.02 * g.length() * toEye.length()) continue;
        // winding: counter-clockwise seen from above (normal +y)
        a.set(X[tri[1]] - X[tri[0]], 0, Z[tri[1]] - Z[tri[0]]); b.set(X[tri[2]] - X[tri[0]], 0, Z[tri[2]] - Z[tri[0]]);
        const up = a.z * b.x - a.x * b.z;
        const t0 = use(tri[0]), t1 = use(tri[1]), t2 = use(tri[2]);
        if (up > 0) idx.push(t0, t1, t2); else idx.push(t0, t2, t1);
      }
    }
    patchRanges.push({ v0: vStart, v1: vbase, t0: tStart, t1: idx.length / 3, guard: [gIn, gOut, gA] });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('aNs', new THREE.Float32BufferAttribute(nsm, 3));
  geo.setAttribute('aAO', new THREE.Float32BufferAttribute(ao, 1));
  geo.setAttribute('aSnowable', new THREE.Float32BufferAttribute(snw, 1));
  geo.setAttribute('aCrest', new THREE.Float32BufferAttribute(crs, 1));
  geo.setAttribute('aGully', new THREE.Float32BufferAttribute(gul, 1));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return { geometry: geo, triangles: idx.length / 3, trianglesBeforeCull: trisIn, vertices: pos.length / 3, patchRanges };
}

// ------------------------------------------------------------------------------------------------ atmosphere
export const ATMOS_UNIFORMS_GLSL = /* glsl */`
uniform float uHazeElevSun, uValleyWarm;
uniform float uHazeDensity, uHazeH, uHazeElev, uHazeFar, uHazeStart, uHaze2Density, uHaze2H, uHaze2Start, uHazePhase, uHazePhaseW, uHazePhaseBase;
uniform vec3 uHazeGain, uHazeGain2; uniform vec4 uHazeAnti;
uniform vec3 uMistColor, uMistColorSun;
uniform float uMistDensity, uMistH, uMistStart, uMistFull; uniform vec2 uMistFade;
`;
export const ATMOS_FUNCS_GLSL = /* glsl */`
float ag_expIntegral(float y0, float y1, float H) {   // mean of exp(-y/H) along a straight segment y0 -> y1
  float dy = y1 - y0;
  if (abs(dy) < 1e-3 * H) return exp(-0.5 * (y0 + y1) / H);
  return (exp(-y0 / H) - exp(-y1 / H)) * H / dy;
}
vec3 ag_hazeSky(vec3 d, float warm) {
  vec2 ae = ag_skyAE(d);
  // in-scatter of the shadowed air: the blue-violet sky colour higher up in the same azimuth, brighter toward
  // the sun (forward scattering) and taken from lower, warmer sky there (mauve-red haze around the glow)
  float sunw = exp(-pow(ae.x / uHazePhaseW, 2.0)) * warm;
  float e = mix(uHazeElev, uHazeElevSun, sunw) * uArch;
  float phase = uHazePhaseBase + uHazePhase * sunw;
  return ag_skyTable(ae.x, e) * mix(uGainBase, uGainGlow, ag_glowWeight(ae.x, e)) * phase * mix(vec3(1.0), uHazeAnti.rgb, smoothstep(uHazeAnti.w, uHazeAnti.w + 25.0, ae.x));
}
vec3 ag_hazeColor(vec3 d, float dist) {
  vec3 c = ag_hazeSky(d, 1.0) * uHazeGain2;
  return mix(c, clearSky(vec3(d.x, max(d.y, 0.002), d.z)), smoothstep(0.35, 1.0, dist / (uHazeFar * 1000.0)));
}
// apply aerial perspective + low mist to a surface colour seen from the camera (works for the mirror camera too:
// the medium is mirror-symmetric about the water plane). Two haze layers: a dense low valley layer and a thin
// high one (scale heights uHazeH, uHaze2H).
vec3 ag_atmosphere(vec3 col, vec3 P, vec3 camPos) {
  vec3 V = P - camPos; float L = length(V); vec3 d = V / max(L, 1e-4);
  float y0 = abs(camPos.y), y1 = abs(P.y);
  // valley layer (dense, low, from uHazeStart; darker navy in-scatter: the shadowed valley air) and a distance
  // layer (thin, high, only beyond uHaze2Start: the far ranges wash to violet while 10-20 km ridges stay dark)
  // each layer integrates only the part of the path beyond its start distance (the height there is ys)
  float ys1 = mix(y0, y1, clamp(uHazeStart / max(L, 1.0), 0.0, 1.0));
  float ys2 = mix(y0, y1, clamp(uHaze2Start / max(L, 1.0), 0.0, 1.0));
  float tau1 = max(L - uHazeStart, 0.0) * uHazeDensity * ag_expIntegral(ys1, y1, uHazeH);
  float tau2 = max(L - uHaze2Start, 0.0) * uHaze2Density * ag_expIntegral(ys2, y1, uHaze2H);
  float tauH = tau1 + tau2;
  float Th = exp(-tauH);
  vec3 hs = ag_hazeSky(d, uValleyWarm);     // the low valley air stays cooler (the 10-15 km ridges stay navy)
  vec3 inS = (hs * uHazeGain * tau1 + ag_hazeColor(d, L) * tau2) / max(tauH, 1e-6);
  col = col * Th + inS * (1.0 - Th);
  float Lm = max(L - uMistStart, 0.0) * smoothstep(uMistStart, uMistFull, L);
  float ysM = mix(y0, y1, clamp(uMistStart / max(L, 1.0), 0.0, 1.0));
  float tauM = uMistDensity * Lm * ag_expIntegral(ysM, y1, uMistH) * (L > 1.0 ? 1.0 : 0.0);
  float Tm = exp(-tauM);
  vec2 ae = ag_skyAE(d);
  // the mist colour fades with the height of the point (the mist hugs the water; ridge bases do not brighten)
  vec3 mist = mix(uMistColor, uMistColorSun, exp(-pow(ae.x / 28.0, 2.0))) * mix(uGainBase, uGainGlow, 0.4) * mix(1.0, uMistFade.y, smoothstep(0.0, uMistFade.x, y1));
  return col * Tm + mist * (1.0 - Tm);
}
`;

export function makeTerrainMaterial(P, shared) {
  const T = P.terrain;
  const mat = new THREE.ShaderMaterial({
    name: 'AG.world.terrain',
    uniforms: {
      ...shared,
      uRock: { value: new THREE.Vector3(...T.rockAlbedo) }, uGranite: { value: new THREE.Vector3(...T.graniteAlbedo) }, uGraniteTop: { value: T.graniteTop ?? 1e5 },
      uSnow: { value: new THREE.Vector3(...T.snowAlbedo) }, uSnowLine: { value: T.snowLine }, uSnowFeather: { value: T.snowFeather },
      uSnowSlope: { value: new THREE.Vector2(...T.snowSlope) }, uIrrGain: { value: T.irradianceGain },
      uSnowConcave: { value: T.snowConcave ?? 2.0 },
      uRimGain: { value: T.rimGain ?? 0.6 }, uBumpNear: { value: T.bumpNear ?? 55 }, uBumpFar: { value: T.bumpFar ?? 25 },
      uRibScale: { value: T.ribScale ?? 90 }, uRibAmp: { value: T.ribAmp ?? 0.9 }, uRibRelief: { value: T.ribRelief ?? 25 },
      uRockSnow: { value: new THREE.Vector4(...(T.rockInSnow ?? [0.55, 160, 4, 1])) },
      uAntiAmb: { value: new THREE.Vector4(...(T.antiAmbient ?? [1, 1, 1, 0])) }, uAntiSnow: { value: T.antiSnow ?? 1 }, uSnowWarp: { value: T.snowWarp ?? 1 },
      uSnowLook: { value: new THREE.Vector4(...(T.snowLook ?? [0, 1, 1, 0])) }, uSnowLedge: { value: new THREE.Vector2(...(T.snowLedge ?? [45, 0.55])) }, uStreak: { value: new THREE.Vector2(...(T.streakPx ?? [2, 5])) }, uMidMottle: { value: new THREE.Vector2(...(T.midMottle ?? [0, 150])) }, uAlpenSmooth: { value: T.alpenglow?.smooth ?? 0 },
      uNearHill: { value: new THREE.Vector4(...(T.nearHill ?? [1, 0, 40, 0])) },
      uSnowBreak: { value: new THREE.Vector4(...(T.snowBreak ?? [0, 90, 0.62, 0.25])) },
      uRockFar: { value: new THREE.Vector4(...(T.rockFar ?? [0.09, 0.11, 0.12, 0])) }, uRockFarD: { value: new THREE.Vector3(...(T.rockFarD ?? [12000, 16000, 0])) },
      uAlpen: { value: new THREE.Vector3(...(T.alpenglow?.color ?? [0, 0, 0])) },
      uAlpenH: { value: new THREE.Vector2(...(T.alpenglow?.heights ?? [300, 1200])) },
      uGully: { value: new THREE.Vector2(...(T.gullySnow ?? [0, 0])) },
      uAlpenRefr: { value: (T.alpenglow?.refractionDeg ?? 0.55) * DEG }, uAlpenRock: { value: T.alpenglow?.rock ?? 1.0 }, uAlpenWrap: { value: T.alpenglow?.wrap ?? 0.0 },
    },
    vertexShader: /* glsl */`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      attribute float aAO; attribute float aSnowable; attribute float aCrest; attribute vec3 aNs; attribute float aGully;
      varying vec3 vW; varying vec3 vN; varying vec3 vNs; varying float vAO; varying float vSnowable; varying float vCrest; varying float vMir; varying float vGully;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        // env-only mirror copy (scale.y = -1): shade with the original normal; the position stays mirrored (path length)
        vNs = normalize(mat3(modelMatrix) * aNs);
        vMir = modelMatrix[1][1] < 0.0 ? 1.0 : 0.0; if (vMir > 0.5) { vN.y = -vN.y; vNs.y = -vNs.y; }
        vAO = aAO; vSnowable = aSnowable; vCrest = aCrest; vGully = aGully;
        gl_Position = projectionMatrix * viewMatrix * w;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: GLSL_NOISE + SKY_UNIFORMS_GLSL + SKY_FUNCS_GLSL + SH_GLSL + ATMOS_UNIFORMS_GLSL + ATMOS_FUNCS_GLSL + /* glsl */`
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uRock, uGranite, uSnow; uniform float uGraniteTop; uniform float uSnowLine, uSnowFeather, uIrrGain, uSnowConcave; uniform vec2 uSnowSlope;
      uniform float uPixelAngleT; uniform vec3 uDarkFloor; uniform float uMirrorRefl;
      varying vec3 vW; varying vec3 vN; varying vec3 vNs; varying float vAO; varying float vSnowable; varying float vCrest; varying float vMir; varying float vGully;
      uniform vec2 uGully;         // erosion ribs (vGully > 0) -> rock, couloirs (< 0) -> snow: offsets of the effective slope
      uniform float uRimGain, uBumpNear, uBumpFar, uRibScale, uRibAmp, uRibRelief;
      uniform float uAlpenSmooth;
      uniform vec2 uMidMottle;     // fix round 2: mid-ridge albedo mottling amount, scale (m)
      uniform vec2 uStreak;        // fall-line streaks: octaves fade in between uStreak.x and uStreak.y px of across-slope period
      uniform vec4 uRockSnow;      // rock in the snow zone: rib-crest threshold, rib scale (m), streak stretch, strength
      uniform vec4 uSnowLook;      // cycle 3: planar (no fall-line streaks in snow), sun-aspect gain, anti-sun gain, ledge weight
      uniform vec4 uSnowBreak;     // cycle 4: fractured snow faces: amount, scale (m), rock threshold, crest weight
      uniform vec4 uRockFar;       // cycle 4: navy rock albedo rgb of the far ranges, weight
      uniform vec3 uRockFarD;      // ... from d0 to d1 (m); sun-facing faces keep (1 - z) of it
      uniform vec4 uAntiAmb;       // cycle 3 round 2: sky irradiance multiplier rgb on anti-sun faces of the far ranges, weight
      uniform float uAntiSnow;     // ... and the extra factor for shaded snow there
      uniform float uSnowWarp;     // cycle 3 round 2: scale of the domain warps of the rock-in-snow / ledge masks (critic: 'marbled wax', massif hp 14.9 vs 8.2)
      uniform vec2 uSnowLedge;     // cycle 3: ledge height period (m), rock threshold
      uniform vec4 uNearHill;      // near hills / headlands: albedo gain, mottling amount, mottling scale (m), lit-face gain
      uniform vec3 uAlpen; uniform vec2 uAlpenH; uniform float uAlpenRefr, uAlpenRock, uAlpenWrap;   // alpenglow (see main)
      vec3 ag_detailGrad(vec2 p, float fp) {           // fBm of value noise with derivatives, band-limited by footprint
        vec3 s = vec3(0.0); float a = 1.0, f = 1.0 / 240.0;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 6; i++) {
          float wl = 1.0 / f;
          float k = smoothstep(2.0 * fp, 6.0 * fp, wl);
          vec3 n = ag_vnoised(p * f);
          s += vec3(n.x, n.yz * f) * a * k;
          p = m * p; f *= 2.0; a *= 0.5;
        }
        return s;
      }
      void main() {
        #include <logdepthbuf_fragment>
        vec3 Pw = vec3(vW.x, abs(vW.y), vW.z);           // shading position (the mirror copy shades as the original)
        float dist = length(cameraPosition - vW);
        float fp = dist * uPixelAngleT;
        vec3 n = normalize(vN);
        vec3 ng = normalize(vNs);                         // smoothed (~150 m) normal: snow mask and fall-line streaks
        vec3 det = ag_detailGrad(Pw.xz, fp);
        float bump = uBumpNear * smoothstep(9000.0, 500.0, dist) + uBumpFar;
        // rock ribs and couloirs along the fall line (the refs' snow lies in streaks between dark ribs): band-limited
        // value-noise fBm stretched along the downslope direction of the (smooth) mesh normal, with its gradient
        // used as relief on the shading normal
        vec2 dn = ng.xz / max(length(ng.xz), 1e-4); vec2 ac = vec2(-dn.y, dn.x);
        float steep = smoothstep(0.08, 0.35, 1.0 - ng.y);
        vec2 ruv = vec2(dot(Pw.xz, ac) / uRibScale + 2.5 * ag_fbm(Pw.xz / 700.0, 3), dot(Pw.xz, dn) / (uRibScale * 5.0));
        float rib = 0.0, rw = 0.0; vec2 rg = vec2(0.0);
        { float a = 1.0, f = 1.0;
          for (int i = 0; i < 4; i++) {
            float k = smoothstep(uStreak.x, uStreak.y, uRibScale / (f * fp));    // fade octaves finer than uStreak px across (fix round 2: 2-5 px made the combed striation)
            vec3 nn = ag_vnoised(ruv * f + float(i) * 5.3);
            rib += nn.x * a * k; rw += a * k; rg += nn.yz * f * a * k;
            f *= 2.1; a *= 0.5;
          } }
        rib = rw > 1e-3 ? rib / rw : 0.5; rg /= max(rw, 1e-3);
        vec2 rgw = rg.x * ac / uRibScale + rg.y * dn / (uRibScale * 5.0);
        float sn = ag_fbm(Pw.xz / 420.0, 4);
        float snowH = smoothstep(uSnowLine - uSnowFeather, uSnowLine + uSnowFeather, Pw.y + 420.0 * (sn - 0.5));
        // cycle 3 (uSnowLook.x 'planar'): inside the snow zone the fall-line streak relief / snow-edge modulation go (the
        // 'marbled wax' worms); the snowfields follow slope + concavity + gullies + contour ledges (broad planar fields)
        float planar = uSnowLook.x * snowH;
        n = normalize(n - vec3(det.y, 0.0, det.z) * bump * (0.4 + 0.6 * (1.0 - n.y)) - vec3(rgw.x, 0.0, rgw.y) * uRibRelief * steep * min(rw, 1.0) * (1.0 - planar));
        float slope = 1.0 - n.y;
        // snow sits on gentle and concave ground (gullies, bowls) and in the couloirs; ribs and steep convex ground
        // stay rock. Crisp edges.
        float concave = (1.0 - vAO) * uSnowConcave;
        float sl = (1.0 - ng.y) - concave * 0.25 + uRibAmp * (rib - 0.5) * (0.4 + 0.6 * steep) * (1.0 - planar)
          + uGully.x * max(vGully, 0.0) + uGully.y * min(vGully, 0.0);
        float snowS = 1.0 - smoothstep(uSnowSlope.x, uSnowSlope.y, sl);
        // rock broken through the snow (fix round 1): dark rock ribs along the fall line at 80-250 m and bare rock on
        // the rib crests, so the snow zone is 35-50 % rock (the refs' massif: snow in couloirs between dark ribs)
        vec2 rq = vec2(dot(Pw.xz, ac) / uRockSnow.y + 1.7 * uSnowWarp * ag_fbm(Pw.xz / 900.0 + 3.1, 3), dot(Pw.xz, dn) / (uRockSnow.y * uRockSnow.z));
        float rfp = fp / uRockSnow.y;
        float rn = mix(0.5, ag_fbm(rq, 3), smoothstep(uStreak.x, uStreak.y, 1.0 / max(rfp, 1e-4)));
        float rn2 = mix(0.5, ag_fbm(rq * 2.7 + 5.3, 2), smoothstep(uStreak.x, uStreak.y, 1.0 / max(2.7 * rfp, 1e-4)));
        float rockRib = smoothstep(uRockSnow.x - 0.06, uRockSnow.x + 0.06, rn * 0.75 + rn2 * 0.25 + 0.35 * vCrest);
        // cycle 3: contour LEDGES instead of fall-line worms: noise stretched along the contour (across-slope 600 m, height
        // uSnowLedge.x m), so steep faces show horizontal snow ledges between dark rock bands; band-limited by the footprint
        {
          vec2 lq = vec2(dot(Pw.xz, ac) / 600.0 + 0.8 * uSnowWarp * ag_fbm(Pw.xz / 1500.0 + 1.9, 2), (Pw.y + 50.0 * uSnowWarp * ag_fbm(Pw.xz / 400.0 + 4.4, 3)) / uSnowLedge.x);
          float lk = smoothstep(uStreak.x, uStreak.y, uSnowLedge.x / max(fp, 1e-3));
          float ln = mix(0.5, ag_fbm(lq, 3), lk);
          float ledgeRock = smoothstep(uSnowLedge.y - 0.05, uSnowLedge.y + 0.05, ln + 0.30 * vCrest) * steep;
          rockRib = mix(rockRib, ledgeRock, uSnowLook.w);
        }
        snowS *= 1.0 - uRockSnow.w * rockRib * (0.5 + 0.5 * steep);
        // cycle 4 (critic c4m: massif faces = smooth gradients + a few long snow streaks, loc9 contrast 0.5-0.7x the refs, while the
        // 1-px detail is too strong): FRACTURED faces = a net of rock outcrops / small snowfields at uSnowBreak.y m in FACE
        // coordinates (biplanar x|z vs height: isotropic on steep faces, no fall-line stretch), band-limited by the footprint
        if (uSnowBreak.x > 0.0) {
          vec2 wb = ng.xz * ng.xz; wb /= max(wb.x + wb.y, 1e-4);
          float bs = uSnowBreak.y;
          float bA = wb.x * ag_fbm(vec2(Pw.z, Pw.y) / bs + 9.7, 3) + wb.y * ag_fbm(vec2(Pw.x, Pw.y) / bs + 3.1, 3);
          float bB = wb.x * ag_fbm(vec2(Pw.z, Pw.y) / (bs * 0.42) + 1.3, 2) + wb.y * ag_fbm(vec2(Pw.x, Pw.y) / (bs * 0.42) + 6.6, 2);
          float bRidge = 1.0 - abs(2.0 * bA - 1.0);
          float bk = smoothstep(uStreak.x, uStreak.y, bs / max(fp, 1e-3));
          float bN = mix(0.5, 0.6 * bRidge + 0.4 * bB, bk);
          float sbRock = smoothstep(uSnowBreak.z - 0.06, uSnowBreak.z + 0.06, bN + uSnowBreak.w * vCrest + 0.2 * (steep - 0.5));
          snowS *= 1.0 - uSnowBreak.x * sbRock;
        }
        float snow = clamp(snowH * snowS * vSnowable, 0.0, 1.0);
        snow = smoothstep(0.25, 0.75, snow);
        float r = length(Pw.xz);
        float granite = (1.0 - smoothstep(2500.0, 4500.0, r)) * smoothstep(-1.0, 2.0, Pw.y) * (1.0 - smoothstep(uGraniteTop * 0.5, uGraniteTop, Pw.y)) * (0.55 + 0.45 * ag_fbm(Pw.xz / 35.0, 3));
        // cycle 4 (critic c4m: massif rock violet-grey hue 238 sat 0.53 red/blue 0.47 vs ref navy hue 222-228 sat 0.65-0.79): far rock (beyond
        // ~15 km) takes a navy albedo, mostly on the faces turned away from the sun (the near hills / headlands keep uRock)
        float aspF = dot(ng.xz / max(length(ng.xz), 1e-4), normalize(uSunDir.xz + vec2(1e-7)));
        float farRockW = uRockFar.w * smoothstep(uRockFarD.x, uRockFarD.y, r) * (1.0 - uRockFarD.z * smoothstep(-0.35, 0.65, aspF));
        vec3 alb = mix(mix(uRock, uRockFar.rgb, farRockW), uGranite, granite) * (0.75 + 0.5 * det.x);
        // near hills and headlands (< 3-6 km): brighter, mottled rock (lichen / scree / heather at 20-80 m)
        float nearW = 1.0 - smoothstep(3000.0, 6500.0, r);
        float mott = ag_fbm(Pw.xz / uNearHill.z, 4) * 0.7 + ag_fbm(Pw.xz / (uNearHill.z * 0.35) + 7.7, 3) * 0.3;
        alb *= mix(1.0, uNearHill.x * (1.0 + uNearHill.y * 2.0 * (mott - 0.5)), nearW);
        // fix round 2: mid ridges (5-26 km) albedo mottling (+-uMidMottle.x at ~uMidMottle.y m; midbase hp 0.8 vs ref 2.2)
        float midW = smoothstep(4500.0, 6500.0, r) * (1.0 - smoothstep(24000.0, 30000.0, r));
        if (uMidMottle.x > 0.0 && midW > 0.0) alb *= 1.0 + uMidMottle.x * 2.0 * (ag_fbm(Pw.xz / uMidMottle.y + 11.3, 3) - 0.5) * midW;
        // cycle 3: snow albedo by ASPECT (the ~150 m smoothed normal): faces turned toward the sun's azimuth are bright
        // (x uSnowLook.y), faces turned away dark (x uSnowLook.z): the refs' bright sun-side snowfields vs navy anti-sun faces
        float asp = dot(ng.xz / max(length(ng.xz), 1e-4), normalize(uSunDir.xz + vec2(1e-7)));
        float aspW = smoothstep(-0.35, 0.65, asp) * smoothstep(0.03, 0.15, 1.0 - ng.y) + 0.5 * (1.0 - smoothstep(0.03, 0.15, 1.0 - ng.y));
        alb = mix(alb, uSnow * mix(uSnowLook.z, uSnowLook.y, aspW), snow);
        vec3 E = max(ag_shIrr(n), vec3(0.0)) * uIrrGain;
        // cycle 3 round 2 (critic: massif rock #1F1E34 hue 243 sat 0.26 vs ref #0C1C3E hue 221 sat 0.66; shaded snow mauve
        // hue 285 vs blue-white hue 224): faces turned away from the sun (beyond 5-8 km) are lit by the zenith / anti-sun
        // sky, not the horizon glow the SH holds: navy irradiance, shaded snow x uAntiSnow
        float wAnti = uAntiAmb.w * (1.0 - smoothstep(-0.45, 0.15, asp)) * smoothstep(0.03, 0.15, 1.0 - ng.y) * smoothstep(5000.0, 8000.0, r);
        E *= mix(vec3(1.0), uAntiAmb.rgb * mix(1.0, uAntiSnow, snow), wAnti);
        float ao = mix(vAO, 1.0, 0.25) * (0.75 + 0.25 * smoothstep(-0.2, 0.4, n.y));
        // neutral dark floor: pre-compensates the PBR Neutral toe, which would crush and over-saturate the
        // physically dark sky-lit rock (refs: near headlands #0C0F1D-#101323, near-neutral)
        // h06: the anti-sun tint on E alone barely moved the massif (#232036 -> #211F36): its rock radiance is mostly this
        // neutral floor, so the floor takes the same navy tint there
        vec3 col = alb * E * ao + uDarkFloor * ao * mix(vec3(1.0), uAntiAmb.rgb, wAnti);
        // crest light: aretes / spurs catch the glow-side sky (the refs' lit ridgelines)
        vec3 sunH = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + 1e-5);
        vec3 Es = max(ag_shIrr(normalize(sunH + vec3(0.0, 0.6, 0.0))), vec3(0.0));
        col += alb * Es * uRimGain * vCrest * (0.6 + 0.4 * det.x) * (1.0 - 0.85 * snow);
        // lit faces of the near hills: slopes turned toward the glow catch it (lit / shadow variation on the shores)
        col += alb * Es * uNearHill.w * nearW * pow(max(dot(n, normalize(sunH + vec3(0.0, 0.35, 0.0))), 0.0), 2.0);
        // alpenglow (fix round 1): the refracted low sun still lights the high ground above the Earth's shadow (the
        // terminator height falls toward the sun: hNeed), grazing from the sun's azimuth. Sun-facing snow turns pink,
        // the slopes turned away stay sky-lit lavender: the refs' strongest internal contrast on the massifs, and it
        // survives the haze. uAlpenH: the light reaches the ground only from these heights above the terminator (the
        // ranges beyond the visible ones shade the lower slopes)
        {
          vec2 sh2 = normalize(uSunDir.xz + vec2(1e-7));
          float sLoc = uSunElevRad + uAlpenRefr + dot(Pw.xz, sh2) / 6371000.0;
          float hNeed = 0.5 * 6371000.0 * pow(min(sLoc, 0.0), 2.0);
          float litA = smoothstep(hNeed + uAlpenH.x, hNeed + uAlpenH.y, Pw.y);
          vec3 Ls = normalize(vec3(sh2.x, max(sLoc, 0.004), sh2.y));
          // fix round 2: uAlpenSmooth > 0 lights by the ~150 m smoothed normal (one lit facet read as a salmon hole in ref 10's massif)
          float ndl = max((dot(normalize(mix(n, ng, uAlpenSmooth)), Ls) + uAlpenWrap) / (1.0 + uAlpenWrap), 0.0);   // wrapped: the glow-lit air around the sun lights the faces too
          col += alb * uAlpen * ndl * litA * mix(uAlpenRock, 1.0, snow);
        }
        col *= mix(1.0, uMirrorRefl, vMir);
        col = ag_atmosphere(col, vW, cameraPosition);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  if (!mat.uniforms.uPixelAngleT) mat.uniforms.uPixelAngleT = { value: 0.0004 };
  return mat;
}

export function makeTerrain(P, shared, height) {
  const { geometry, triangles, trianglesBeforeCull, vertices } = buildTerrainGeometry(P, height);
  const mesh = new THREE.Mesh(geometry, makeTerrainMaterial(P, shared));
  mesh.name = 'AG.world.terrain';
  mesh.frustumCulled = false;
  mesh.layers.enable(ENV_LAYER);
  return { mesh, stats: { triangles, trianglesBeforeCull, vertices } };
}
