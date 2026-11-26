// Sky: art-directed clear-sky model (a LUT built from the measured plate table, skytable.js), a 2-D altocumulus
// layer, and the per-output-frame bakes:
//   * view bake   : sky+clouds for the frame camera's own frustum (+margin), at output resolution
//   * mirror bake : the same for the water's mirror camera (reflection pass)
//   * sky cube    : sky+clouds cube (fallback for every other camera, PMREM source)
//   * env cube    : sky + terrain + fake mirror water captured at the piano -> PMREM -> world.envMap (IBL)
// The dome (a sphere that follows whatever camera renders it) samples the view bake, then the mirror bake, then
// the cube, so sub-frames and the Reflector pay ~nothing for the clouds.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SKY_A, SKY_E, SKY_ROWS } from './skytable.js';
import { COV_W, COV_H, COV_ROWS } from './cloudmap.js';
import { GLSL_NOISE, hexToLinear, invNeutral, displayHexToScene, DEG, smoothstep, lerp } from './util.js';

export const ENV_LAYER = 5;   // world objects that appear in the environment capture

// ------------------------------------------------------------------------------------------------ LUT
/** build the clear-sky LUT: a = |azimuth from sun| 0..180 (linear), e = 0..90 (v = sqrt(e/90)), scene-linear RGB */
export function buildSkyLUT(P) {
  const [W, H] = P.sky.lutSize;
  const G = SKY_ROWS.map((row) => row.map((hx) => hexToLinear(hx).map((v) => Math.log(v + 0.002))));
  const find = (grid, x) => {
    let i = 0; while (i < grid.length - 2 && x > grid[i + 1]) i++;
    return [i, Math.min(1, Math.max(0, (x - grid[i]) / (grid[i + 1] - grid[i])))];
  };
  const tableRaw = (a, e) => {
    const [ia, ta] = find(SKY_A, a), [ie, te] = find(SKY_E, e);
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const g0 = G[ie][ia][c] * (1 - ta) + G[ie][ia + 1][c] * ta;
      const g1 = G[ie + 1][ia][c] * (1 - ta) + G[ie + 1][ia + 1][c] * ta;
      out[c] = g0 * (1 - te) + g1 * te;
    }
    return out;
  };
  // near the zenith every azimuth must converge to one colour (the measured rows e 65 / 90 vary with azimuth, which
  // made a 4 deg sector seam at the zenith): blend toward the row's azimuth mean (log space) above e 60
  const tableDisplay = (a, e) => {
    const r = tableRaw(a, e);
    const w = smoothstep(60, 90, e);
    if (w > 0) {
      const m = [0, 0, 0]; const n = 36;
      for (let i = 0; i <= n; i++) { const v = tableRaw((i / n) * 180, e); for (let c = 0; c < 3; c++) m[c] += v[c] / (n + 1); }
      for (let c = 0; c < 3; c++) r[c] = lerp(r[c], m[c], w);
    }
    return r.map((g) => Math.exp(g) - 0.002);
  };
  const data = new Float32Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const v = j / (H - 1); const e = v * v * 90;
    for (let i = 0; i < W; i++) {
      const a = (i / (W - 1)) * 180;
      const sc = invNeutral(tableDisplay(a, e), P.exposure);
      const o = (j * W + i) * 4;
      data[o] = sc[0]; data[o + 1] = sc[1]; data[o + 2] = sc[2]; data[o + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false; tex.needsUpdate = true; tex.name = 'AG.world.skyLUT';
  /** CPU bilinear lookup identical to the shader's (for SH irradiance) */
  const sample = (a, e) => {
    const x = Math.min(W - 1, Math.max(0, (a / 180) * (W - 1)));
    const y = Math.min(H - 1, Math.max(0, Math.sqrt(Math.max(e, 0) / 90) * (H - 1)));
    const i0 = Math.min(W - 2, Math.floor(x)), j0 = Math.min(H - 2, Math.floor(y)), tx = x - i0, ty = y - j0;
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const v00 = data[(j0 * W + i0) * 4 + c], v10 = data[(j0 * W + i0 + 1) * 4 + c];
      const v01 = data[((j0 + 1) * W + i0) * 4 + c], v11 = data[((j0 + 1) * W + i0 + 1) * 4 + c];
      out[c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
    }
    return out;
  };
  return { texture: tex, data, W, H, sample };
}

/** coverage map texture from cloudmap.js (R channel, 0..1), optional gain / bias for look-dev */
function buildCloudMap(gain = 1, bias = 0) {
  const data = new Float32Array(COV_W * COV_H * 4);
  for (let j = 0; j < COV_H; j++) {
    const row = COV_ROWS[j];
    for (let i = 0; i < COV_W; i++) {
      const v = parseInt(row.slice(i * 2, i * 2 + 2), 16) / 255;
      const o = (j * COV_W + i) * 4;
      data[o] = Math.min(1, Math.max(0, v * gain + bias)); data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, COV_W, COV_H, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false; tex.needsUpdate = true; tex.name = 'AG.world.cloudMap';
  return tex;
}

// ------------------------------------------------------------------------------------------------ GLSL
export const SKY_UNIFORMS_GLSL = /* glsl */`
uniform sampler2D tSkyLUT;
uniform vec2 uSkyLUTSize;
uniform vec3 uSunDir;          // world, unit
uniform float uSunElevRad;
uniform float uArch;           // e_table = e * uArch
uniform vec3 uGainBase, uGainGlow;
uniform float uGlowW, uGlowH, uBelowFade;
uniform vec4 uCore;            // glow-core boost: gain, extra green, azimuth width (deg), centre elevation (deg)
`;
export const SKY_FUNCS_GLSL = /* glsl */`
vec2 ag_skyAE(vec3 d) {        // (|azimuth from sun|, elevation) in degrees
  vec2 h = d.xz; float hl = length(h);
  vec2 sh = normalize(uSunDir.xz + vec2(1e-7));
  float ca = hl > 1e-6 ? dot(h / hl, sh) : 1.0;
  return vec2(degrees(acos(clamp(ca, -1.0, 1.0))), degrees(asin(clamp(d.y, -1.0, 1.0))));
}
vec3 ag_skyTable(float a, float e) {
  vec2 uv = vec2(a / 180.0, sqrt(clamp(e / 90.0, 0.0, 1.0)));
  uv = (uv * (uSkyLUTSize - 1.0) + 0.5) / uSkyLUTSize;
  return texture2D(tSkyLUT, uv).rgb;
}
float ag_glowWeight(float a, float e) { return exp(-pow(a / uGlowW, 2.0)) * exp(-max(e, 0.0) / uGlowH); }
// clear sky (no clouds), scene-linear, any direction (below the horizon: the horizon colour, faded)
vec3 clearSky(vec3 d) {
  vec2 ae = ag_skyAE(d);
  float e = max(ae.y, 0.0) * uArch;
  vec3 c = ag_skyTable(ae.x, e) * mix(uGainBase, uGainGlow, ag_glowWeight(ae.x, e));
  // hot glow core a little higher, brighter and yellower (plate: brightest 0.5 % #FDC38A at e 3-4.5 deg)
  float wc = exp(-pow(ae.x / uCore.z, 2.0)) * exp(-pow((ae.y - uCore.w) / 1.4, 2.0));
  c *= 1.0 + wc * vec3(uCore.x, (1.0 + uCore.x) * (1.0 + uCore.y) - 1.0, uCore.x);
  if (ae.y < 0.0) c *= mix(1.0, uBelowFade, smoothstep(0.0, 6.0, -ae.y));
  return c;
}
`;

export const CLOUD_UNIFORMS_GLSL = /* glsl */`
uniform float uCloudTime, uCloudAlt, uCover, uCoverTop, uSoft, uBandScale, uTuftScale, uOpacity, uLightStep, uLightAbsorb;
uniform int uCloudDebug; uniform float uLitHiLo, uTuft2W, uIsoRim, uMapGain, uMapBias, uBandStretch, uLobStretch;
uniform float uRimStep, uRimK, uRimFloor, uTopLo, uTopGain, uFadeKm, uSunW, uShadowLo, uShadowHi, uRefr, uEvolve, uPixelAngle;
uniform vec2 uBandDir, uCloudOffset, uCloudWind;
uniform vec3 uLitLo, uLitLoDim, uLitHi, uLitHiDim, uBodyLo, uBodyHi, uBodyAnti, uLitAnti, uLitTop, uLitTopDim;
`;
export const CLOUD_FUNCS_GLSL = /* glsl */`
uniform sampler2D tCloudMap; uniform vec2 uCloudMapSize; uniform float uCovRefT, uEnvSoft, uEnvW;
uniform vec4 uTopCov;          // overhead coverage prior: coverage, |A| half width, e from, e to (deg)
uniform vec4 uClearBand;       // clear band above the ridges: |A| half width, e full, e none (deg), max coverage
uniform vec2 uEdgeEro;         // fix round 2: edge-erosion octave amplitude (field units), scale (km)
uniform vec3 uSunBody;         // fix round 2: body gain near the sun (gain, |A| from, e from)
uniform vec4 uLitGate;         // fix round 2: rims fade between |A| x..y deg and e z..w deg
uniform vec4 uLitBand;         // underside band: width (km), density edge threshold, |A| rim cut-off (deg), overhead lit floor
uniform float uLitEnv;         // 1: the band is measured from the clump envelope's sun-side edge (session 6), 0: from the full density
uniform float uTopRim;         // 14-32 deg toward the sun: how much of the base is lit through (not only the rim)
uniform vec4 uSlab;            // cloud slab: thickness (km, 0 = flat layer), march step (km along the ray), heap exponent, wall darkening
// cycle 3 round 2 (critic: flat mauve cut-outs, lit holes inside the bodies, rims 2x too wide and too bright, no dark cores,
// no interior texture, texel steps of the coverage map at 4K)
uniform vec2 uHoleFill;        // density floor x envelope density inside the clumps (visible), and for the rim edge search (no lit holes)
uniform float uRimPx;          // lit underside band at most this many output pixels wide (0 = off)
uniform vec4 uCloudCore;       // dark cores: body multiplier rgb deep inside dense clumps (far from the sun-side edge), weight
uniform vec3 uInner;           // interior lumps: amplitude, cell size (km), share lit from below (lumps also brighten the lit band)
uniform float uMapCubic;       // 1: B-spline bicubic sampling of the coverage map (no texel stair-steps)
uniform vec3 uLowSky;          // h06: rimPx / cores / opacity apply to the LOW sky only (full below x deg, none above y); opacity above y = z
                               // (h06 fold: ref 6 60.3 -> 54.9, its overhead peach reflection patches went dark)
uniform float uQFine[33], uQCoarse[33];   // field quantiles (sandbox/world/tools/cloudcalib.py): threshold for coverage i/32
float ag_fieldThr(float c, float fine) {
  float x = clamp(c, 0.0, 1.0) * 32.0; int i = int(min(floor(x), 31.0)); float f = x - float(i);
  return mix(mix(uQCoarse[i], uQCoarse[i + 1], f), mix(uQFine[i], uQFine[i + 1], f), fine);
}
float ag_cover = 0.5;          // coverage (0..1) for the current ray, from the art-directed map (cloudmap.js)
float ag_thr = 0.5;            // the field threshold that gives that coverage
// art-directed coverage at layer point p0 (km from the piano, at the reference time): signed azimuth x elevation map
float ag_coverageAt(vec2 p0) {
  float r = max(length(p0), 1e-3);
  float A = degrees(atan(p0.x, -p0.y));
  float e = degrees(atan((uCloudAlt - r * r / 12742.0) / r));
  vec2 uv = vec2((A + 180.0) / 360.0, sqrt(clamp(e / 90.0, 0.0, 1.0)));
  uv = (uv * (uCloudMapSize - 1.0) + 0.5) / uCloudMapSize;
  float cm;
  if (uMapCubic > 0.5) {
    // cubic B-spline from 4 bilinear taps (C2-smooth coverage: no stair-stepped rim ends along the 181 x 64 map texels)
    vec2 tc = uv * uCloudMapSize - 0.5, f = fract(tc), i0 = tc - f;
    vec2 f2 = f * f, f3 = f2 * f;
    vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0, w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0, w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0, w3 = f3 / 6.0;
    vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (i0 - 1.0 + w1 / g0 + 0.5) / uCloudMapSize, h1 = (i0 + 1.0 + w3 / g1 + 0.5) / uCloudMapSize;
    cm = g0.y * (g0.x * texture2D(tCloudMap, vec2(h0.x, h0.y)).r + g1.x * texture2D(tCloudMap, vec2(h1.x, h0.y)).r)
       + g1.y * (g0.x * texture2D(tCloudMap, vec2(h0.x, h1.y)).r + g1.x * texture2D(tCloudMap, vec2(h1.x, h1.y)).r);
  } else cm = texture2D(tCloudMap, uv).r;
  float c = clamp(cm * uMapGain + uMapBias, 0.0, 1.0);
  // overhead prior (the plates do not constrain it; ref 6's lake reflects a half-covered sky toward the sun)
  float wTopA = 1.0 - smoothstep(uTopCov.y, uTopCov.y + 20.0, abs(A));
  float wTopE = smoothstep(uTopCov.z - 5.0, uTopCov.z, e) * (1.0 - smoothstep(uTopCov.w, uTopCov.w + 12.0, e));
  c = max(c, uTopCov.x * wTopA * wTopE);
  // the coral band right above the far ridges stays open
  float wClr = (1.0 - smoothstep(uClearBand.x, uClearBand.x + 10.0, abs(A))) * (1.0 - smoothstep(uClearBand.y, uClearBand.z, e));
  return mix(c, min(c, uClearBand.w), wClr);
}
// the large-scale part of the field (clumps in loose bands x lobes), ~[0, 1]; also used by the light march
float ag_cloudEnvF(vec2 bw, vec2 w, float fine) {
  float cl = ag_fbm(vec2(bw.x / (uBandScale * uBandStretch), bw.y / uBandScale), 5);
  float lob = mix(0.5, ag_fbm(vec2(bw.x / uLobStretch, bw.y) / (uTuftScale * 2.2) + w * 2.0, 4), mix(0.6, 1.0, fine));
  return cl * 0.68 + lob * 0.32;
}
void ag_cloudFrame(vec2 p, out vec2 bw, out vec2 w) {
  vec2 b = vec2(dot(p, uBandDir), dot(p, vec2(-uBandDir.y, uBandDir.x)));     // along / across the bands
  float tw = uCloudTime * uEvolve;
  w = vec2(ag_fbm(p * 0.45 + vec2(1.7, tw), 3), ag_fbm(p * 0.45 + vec2(-3.1, 5.2 - tw), 3)) - 0.5;
  bw = b + w * vec2(1.4, 0.8);
}
// density of the altocumulus layer at p (km, drifted layer coordinates); lod = km per pixel along the layer.
// The field (clumps x lobes x floccus tufts) is thresholded at ag_thr, set from the coverage map: dense where the
// plate is cloudy, clear where it is clear; the tufts break the clump edges into cauliflower puffs.
float ag_envRaw = 0.0;         // the clump envelope's field value at the last ag_cloudDensity point (before threshold)
float ag_cloudDensity(vec2 p, float lod, out float envD) {
  vec2 bw, w; ag_cloudFrame(p, bw, w);
  float fine = 1.0 - smoothstep(0.35, 1.2, lod / uTuftScale);    // fade small-scale detail when a pixel spans a cell
  float fine2 = 1.0 - smoothstep(0.35, 1.2, lod / (uTuftScale * 0.42));
  float envF = ag_cloudEnvF(bw, w, fine);
  ag_envRaw = envF * uEnvW + (1.0 - uEnvW) * 0.5;
  vec2 tq = vec2(bw.x * 0.85, bw.y * 1.2) / uTuftScale + w * 1.2;
  float t1 = 1.0 - smoothstep(0.08, 0.85, ag_worley(tq));
  float t2 = 1.0 - smoothstep(0.08, 0.85, ag_worley(tq * 2.4 + vec2(5.1, 1.3)));
  float tuft = mix(0.5, t1, fine) * (1.0 - uTuft2W) + mix(0.5, t2, fine2) * uTuft2W;
  float F = envF * uEnvW + tuft * (1.0 - uEnvW);
  // fix round 2: edge-erosion octave (~60-120 m): billowy, frayed edges instead of cut-out outlines
  if (uEdgeEro.x > 0.0) { float fe = 1.0 - smoothstep(0.35, 1.2, lod / uEdgeEro.y); F += uEdgeEro.x * (ag_fbm(p / uEdgeEro.y + 3.7, 2) - 0.5) * 2.0 * fe; }
  envD = smoothstep(ag_thr, ag_thr + uEnvSoft, envF * uEnvW + (1.0 - uEnvW) * 0.5);
  return smoothstep(ag_thr, ag_thr + uSoft, F);
}
float ag_cloudEnvAt(vec2 p, float fine) {  // envelope density only (light march)
  vec2 bw, w; ag_cloudFrame(p, bw, w);
  return smoothstep(ag_thr, ag_thr + uEnvSoft, ag_cloudEnvF(bw, w, fine) * uEnvW + (1.0 - uEnvW) * 0.5);
}
// cloud layer seen along direction d from the lake: rgb (scene-linear) and alpha (already faded with distance)
vec4 ag_clouds(vec3 d) {
  if (d.y <= 0.0005) return vec4(0.0);
  const float R = 6371.0;
  float H = uCloudAlt;
  float sinE = d.y;
  float s = -R * sinE + sqrt(R * R * sinE * sinE + 2.0 * R * H + H * H);    // km along the ray to the layer
  vec2 p = d.xz * s;
  vec2 sunH = normalize(uSunDir.xz + vec2(1e-7));
  vec2 q = p + uCloudOffset + uCloudWind * uCloudTime;
  float lod = s * uPixelAngle / max(sinE, 0.02);
  // coverage from the art-directed map, sampled where this piece of cloud was at the reference time (the map
  // drifts with the clouds), mapped to the field threshold
  vec2 p0 = p + uCloudWind * (uCloudTime - uCovRefT);
  ag_cover = clamp(ag_coverageAt(p0), 0.005, 0.995);
  float fine = 1.0 - smoothstep(0.35, 1.2, lod / uTuftScale);
  // threshold at the field's (1 - cover) quantile (narrower distribution when the tufts are filtered out), minus a
  // quarter of the soft edge
  ag_thr = ag_fieldThr(ag_cover, fine) - 0.25 * uSoft;
  float envD;
  float D = ag_cloudDensity(q, lod, envD);
  D = max(D, uHoleFill.x * envD);      // cycle 3 round 2: no see-through holes inside a clump
  if (uCloudDebug == 1) return vec4(vec3(ag_cover, D, envD) * 0.5, 1.0);
  // ---- cloud SLAB (session 8): the layer has a thickness. Every clump is a column whose height grows with its
  // envelope density (heaps: uSlab.z shapes the dome). A ray that passes the base between clumps is marched up through
  // the slab (front to back: higher = farther) and stops at the first column WALL it meets. Near the horizon the walls
  // turn the zero-thickness streaks of the 2-D layer into the refs' big dark masses; the base (underside) keeps the lit
  // band. Walls are shaded at their own point (the sun-ward edge search below runs there: a wall facing the camera
  // toward the sun is the shadow side), darkened with height (uSlab.w).
  float wallF = 0.0;
  if (uSlab.x > 0.0 && D < 0.6) {
    float Dbase = D;
    int M = int(clamp(ceil(uSlab.x / max(sinE, 0.03) / uSlab.y), 2.0, 12.0));
    float Ep = envD;
    for (int i = 1; i <= 12; i++) {
      if (i > M) break;
      float hf = float(i) / float(M);
      float Hi = H + uSlab.x * hf;
      float si = -R * sinE + sqrt(R * R * sinE * sinE + 2.0 * R * Hi + Hi * Hi);
      vec2 pS = d.xz * si;
      vec2 qS = pS + uCloudOffset + uCloudWind * uCloudTime;
      float lodi = si * uPixelAngle / max(sinE, 0.02);
      float finei = 1.0 - smoothstep(0.35, 1.2, lodi / uTuftScale);
      float Ei = ag_cloudEnvAt(qS, finei);
      float need = pow(hf, 1.0 / uSlab.z);            // column height uSlab.x x Ei^heap reaches hf
      if (Ei > need) {
        // refine the crossing between the previous step and this one (linear in the envelope excess)
        float ePrev = Ep - pow(float(i - 1) / float(M), 1.0 / uSlab.z), eCur = Ei - need;
        float fr = clamp(ePrev / max(ePrev - eCur, 1e-4), 0.0, 1.0);
        float hh = (float(i - 1) + fr) / float(M);
        float Hh = H + uSlab.x * hh;
        s = -R * sinE + sqrt(R * R * sinE * sinE + 2.0 * R * Hh + Hh * Hh);
        p = d.xz * s; q = p + uCloudOffset + uCloudWind * uCloudTime;
        lod = s * uPixelAngle / max(sinE, 0.02);
        float envW; float Dw = ag_cloudDensity(q, lod, envW);
        // a wall is mostly opaque (the column's depth along the ray), the tufts only fray it
        D = max(Dbase, mix(envW, max(Dw, envW), 0.5) * smoothstep(0.0, 0.15, Ei - need + 0.05));
        wallF = hh;
        break;
      }
      Ep = Ei;
    }
  }
  if (D <= 0.002) return vec4(0.0);
  // lit underside band (fix round 1): distance from this point to the clump's sun-side edge, marched on the full
  // density toward the sun azimuth; within uLitBand.x of that edge the cloud is lit (salmon-peach lower edges seen
  // from below), deeper inside it is the dark plum body
  // (the edge is where the density falls below min(threshold, 0.6 D): a thin fringe on the NEAR side, where the
  // density grows toward the sun, stays dark; only the far, sun-side fringe is lit)
  float envRaw = ag_envRaw;
  float Wb = uLitBand.x;
  float lowSky = 1.0 - smoothstep(uLowSky.x, max(uLowSky.y, uLowSky.x + 0.1), degrees(asin(clamp(d.y, 0.0, 1.0))));
  if (uRimPx > 0.0) Wb = mix(Wb, min(Wb, uRimPx * lod), lowSky);   // cycle 3 round 2: the rim is a thin continuous gradient on screen
  float stp = Wb * 0.3, dEdge = Wb * 1.6, Dp = D, thrE = min(uLitBand.y, 0.6 * D);
  float isoW = 1.0;
  if (uLitEnv > 0.5) {
    // session 6: the band follows the clump ENVELOPE's sun-side edge (a continuous salmon underside along every clump,
    // with the tufts modulating it), not every tuft's own edge (which lit the clumps as pink dots). Tufts sticking
    // out of the envelope are lit fringe; isolated puffs far from any clump (envelope field well below the threshold)
    // stay dark.
    float Ep = envD, thrV = 0.5;
    if (envD < thrV) dEdge = 0.0;
    else for (int j = 1; j <= 5; j++) {
      float Ej = ag_cloudEnvAt(q + sunH * (stp * float(j)), fine);
      if (Ej < thrV) { dEdge = stp * (float(j - 1) + clamp((Ep - thrV) / max(Ep - Ej, 1e-3), 0.0, 1.0)); break; }
      Ep = Ej;
    }
    isoW = smoothstep(ag_thr - 0.10, ag_thr - 0.01, envRaw);
  } else {
    for (int j = 1; j <= 5; j++) {
      float dumE; float Dj = ag_cloudDensity(q + sunH * (stp * float(j)), lod, dumE);
      Dj = max(Dj, uHoleFill.y * dumE);    // a hole inside the clump envelope is not a sun-side edge (no lit holes)
      if (Dj < thrE) { dEdge = stp * (float(j - 1) + clamp((Dp - thrE) / max(Dp - Dj, 1e-3), 0.0, 1.0)); break; }
      Dp = Dj;
    }
    isoW = smoothstep(0.05, 0.4, envD);
  }
  float Tl = 1.0 - smoothstep(0.0, Wb, dEdge);
  // Earth's shadow on the layer: height of the ray toward the sun at its tangent point (refraction included)
  float xs = dot(p, sunH);
  float sLoc = uSunElevRad + uRefr + xs / R;
  float ht = H - 0.5 * R * pow(min(sLoc, 0.0), 2.0);
  float lit = smoothstep(uShadowLo, uShadowHi, ht);
  vec2 ae = ag_skyAE(d);
  float wE = smoothstep(uLitHiLo, uLitHiLo + 8.0, ae.y);
  float wS = exp(-pow(ae.x / uSunW, 2.0));
  vec3 litC = mix(mix(uLitLoDim, uLitLo, Tl), mix(uLitHiDim, uLitHi, Tl), wE);
  // overhead clouds: undersides lit almost horizontally by the low sun -> bright peach again (ref 6 reflections)
  // 14-32 deg toward the sun: undersides lit almost horizontally -> bright peach (ref 6 reflections); higher: dim
  float wTop = smoothstep(uTopLo, uTopLo + 10.0, ae.y) * (1.0 - smoothstep(uTopLo + 22.0, uTopLo + 40.0, ae.y));
  litC = mix(litC, mix(uLitTopDim, uLitTop * uTopGain, Tl), wTop);
  litC = mix(litC, uLitHiDim * 0.75, smoothstep(36.0, 58.0, ae.y));
  litC = mix(uLitAnti, litC, wS);
  litC *= mix(vec3(1.0, 0.42, 0.38), vec3(1.0), smoothstep(uShadowLo, uShadowHi + 1.5, ht));   // reddening at the terminator
  vec3 body = mix(mix(uBodyLo, uBodyHi, wE), uBodyAnti, 1.0 - wS);
  body *= mix(1.0, uSunBody.x, (1.0 - smoothstep(uSunBody.y, uSunBody.y + 10.0, ae.x)) * (1.0 - smoothstep(uSunBody.z, uSunBody.z + 4.0, ae.y)));
  // cycle 3 round 2: dark navy cores deep inside dense clumps (refs: body p10 #26264B; ours #3A2C4A) and interior lumps
  // (cauliflower relief lit from below; refs' inner texture 9.0 vs 7.2)
  float deep = smoothstep(0.55, 0.95, envD) * smoothstep(0.6, 1.0, dEdge / max(1.6 * Wb, 1e-4));
  body = mix(body, body * uCloudCore.rgb, uCloudCore.w * deep * lowSky);
  float lumpF = 1.0 - smoothstep(0.35, 1.2, lod / max(uInner.y, 1e-3));
  float lump = (1.0 - smoothstep(0.1, 0.9, ag_worley(q / max(uInner.y, 1e-3) + vec2(7.3, 2.1)))) - 0.5;
  body *= 1.0 + uInner.x * 2.0 * lump * lumpF;
  float rim = Tl * (0.6 + 0.4 * Tl);
  rim *= 1.0 + uInner.z * lump * lumpF;
  rim *= mix(uIsoRim, 1.0, isoW);   // isolated small puffs (no clump around them) stay dark
  rim *= 1.0 - smoothstep(uLitBand.z - 15.0, uLitBand.z, ae.x);   // no lit rims far from the sun (no pink dots)
  // fix round 2: lit lower edges only on the sun side, low (refs: lit fraction 0.014, anti-sun third 8x too lit)
  rim *= (1.0 - smoothstep(uLitGate.x, uLitGate.y, ae.x)) * (1.0 - smoothstep(uLitGate.z, uLitGate.w, ae.y));
  rim = mix(rim, 0.7 + 0.3 * rim, wTop * wS * uTopRim);   // 14-32 deg sun side: bases lit through, not only rims
  lit = max(lit, uLitBand.w * wTop * wS);        // blue hour: a faint warm underside overhead stays (ref 1's glints)
  rim *= 1.0 - smoothstep(0.0, 0.35, wallF) * 0.85;       // walls: only their foot keeps the underside light
  vec3 col = mix(body * mix(uGainBase, uGainGlow, 0.5 * wS), litC * uGainGlow, rim * lit);
  col *= 1.0 - uSlab.w * wallF;                            // higher on the wall: darker (self-shadowed toward the camera)
  float alpha = (1.0 - exp(-D * mix(uLowSky.z, uOpacity, lowSky))) * exp(-s / uFadeKm);
  return vec4(col, alpha);
}
vec3 skyFull(vec3 d) {
  vec3 c = clearSky(d);
  vec4 cl = ag_clouds(d);
  return mix(c, cl.rgb, cl.a);
}
`;

// ------------------------------------------------------------------------------------------------ system
export class SkySystem {
  constructor(renderer, P, { width, height }) {
    this.renderer = renderer; this.P = P; this.width = width; this.height = height;
    this.lut = buildSkyLUT(P);
    const C = P.clouds;
    const col = (hx) => new THREE.Vector3(...displayHexToScene(hx, P.exposure));
    const bandA = C.bandAzimuthDeg * DEG;
    this.uniforms = {
      tSkyLUT: { value: this.lut.texture }, uSkyLUTSize: { value: new THREE.Vector2(this.lut.W, this.lut.H) },
      uSunDir: { value: new THREE.Vector3(0, -0.017, -1).normalize() }, uSunElevRad: { value: -1 * DEG },
      uArch: { value: 1 }, uGainBase: { value: new THREE.Vector3(1, 1, 1) }, uGainGlow: { value: new THREE.Vector3(1, 1, 1) },
      uGlowW: { value: P.sky.glowWidthDeg }, uGlowH: { value: P.sky.glowHeightDeg }, uBelowFade: { value: P.sky.belowHorizonFade },
      uCloudTime: { value: 0 }, uCloudAlt: { value: C.altitudeKm }, uCover: { value: C.cover }, uCoverTop: { value: C.coverOverhead ?? C.cover }, uSoft: { value: C.softness },
      uBandScale: { value: C.bandScaleKm }, uTuftScale: { value: C.tuftScaleKm }, uOpacity: { value: C.opacity },
      uLightStep: { value: C.lightStepKm }, uLightAbsorb: { value: C.lightAbsorb }, uFadeKm: { value: C.fadeKm },
      uSunW: { value: C.sunWidthDeg }, uShadowLo: { value: C.shadowLoKm }, uShadowHi: { value: C.shadowHiKm },
      uRefr: { value: C.refractionDeg * DEG }, uEvolve: { value: C.evolve }, uPixelAngle: { value: 0.0005 },
      uBandDir: { value: new THREE.Vector2(Math.sin(bandA), -Math.cos(bandA)) },
      uCloudOffset: { value: new THREE.Vector2(...C.offsetKm) },
      uCloudWind: { value: new THREE.Vector2(Math.sin(bandA) * C.windKmPerS + Math.cos(bandA) * C.windAcrossKmPerS,
        -Math.cos(bandA) * C.windKmPerS + Math.sin(bandA) * C.windAcrossKmPerS) },
      uLitLo: { value: col(C.litLow).multiplyScalar(C.litLowGain?.[0] ?? 1) }, uLitLoDim: { value: col(C.litLowDim).multiplyScalar(C.litLowGain?.[1] ?? 1) }, uLitHi: { value: col(C.litHigh).multiplyScalar(C.litHighGain?.[0] ?? 1) },
      uLitHiDim: { value: col(C.litHighDim).multiplyScalar(C.litHighGain?.[1] ?? 1) }, uBodyLo: { value: col(C.bodyLow).multiplyScalar(C.bodyGain ?? 1) }, uBodyHi: { value: col(C.bodyHigh).multiplyScalar(C.bodyGain ?? 1) },
      uBodyAnti: { value: col(C.bodyAnti) }, uLitAnti: { value: col(C.litAnti) }, uLitTop: { value: col(C.litTop) }, uLitTopDim: { value: col(C.litTopDim ?? C.litTop) }, uTopGain: { value: C.topGain ?? 1 }, uTopLo: { value: C.topLoDeg ?? 12 },
      uCloudDebug: { value: C.debug ?? 0 }, uLitHiLo: { value: C.litHighFromDeg ?? 3.5 }, uTuft2W: { value: C.tuft2Weight ?? 0.38 }, uIsoRim: { value: C.isolatedRim ?? 1.0 }, uRimStep: { value: C.rimStepKm ?? 0.08 }, uRimK: { value: C.rimK ?? 2.5 }, uRimFloor: { value: C.rimFloor ?? 0.15 },
      // art-directed coverage map (cloudmap.js) and the coverage -> threshold mapping of the field
      tCloudMap: { value: buildCloudMap(1, 0) }, uMapGain: { value: C.mapGain ?? 1 }, uMapBias: { value: C.mapBias ?? 0 }, uCloudMapSize: { value: new THREE.Vector2(COV_W, COV_H) },
      uCovRefT: { value: C.mapRefTime ?? 10 }, uEnvW: { value: C.envWeight ?? 0.72 },
      uQFine: { value: C.fieldQuantFine.slice() }, uQCoarse: { value: C.fieldQuantCoarse.slice() },
      uEnvSoft: { value: C.envSoft ?? 0.10 }, uBandStretch: { value: C.bandStretch ?? 3.2 }, uLobStretch: { value: C.lobStretch ?? 1.6667 },
      uTopCov: { value: new THREE.Vector4(...(C.topCoverage ?? [0, 60, 18, 60])) },
      uClearBand: { value: new THREE.Vector4(...(C.clearBand ?? [25, 2.5, 4.0, 1.0])) },
      uLitBand: { value: new THREE.Vector4(...(C.litBand ?? [0.25, 0.35, 60, 0])) }, uLitGate: { value: new THREE.Vector4(...(C.litGate ?? [180, 181, 90, 91])) }, uEdgeEro: { value: new THREE.Vector2(...(C.edgeErosion ?? [0, 0.09])) }, uSunBody: { value: new THREE.Vector3(...(C.sunBody ?? [1, 30, 10])) },
      uLitEnv: { value: C.litFromEnvelope ?? 1 }, uTopRim: { value: C.topRim ?? 1 },
      uSlab: { value: new THREE.Vector4(...(C.slab ?? [0, 1.5, 1, 0])) },
      uHoleFill: { value: new THREE.Vector2(...(C.holeFill ?? [0, 0])) }, uRimPx: { value: C.rimPx ?? 0 },
      uCloudCore: { value: new THREE.Vector4(...(C.core ?? [1, 1, 1, 0])) }, uInner: { value: new THREE.Vector3(...(C.inner ?? [0, 0.4, 0])) },
      uMapCubic: { value: C.mapCubic ?? 0 }, uLowSky: { value: new THREE.Vector3(...(C.lowSky ?? [90, 91, C.opacity])) },
      uCore: { value: new THREE.Vector4(...(P.sky.core ?? [0, 0, 6, 3.75])) },
    };
    const U = this.uniforms;
    const fullFrag = GLSL_NOISE + SKY_UNIFORMS_GLSL + SKY_FUNCS_GLSL + CLOUD_UNIFORMS_GLSL + CLOUD_FUNCS_GLSL;

    // ---- view bakes (fullscreen quad: direction from the bake camera)
    const B = P.bake;
    const mk = (w, h) => new THREE.WebGLRenderTarget(Math.max(4, w), Math.max(4, h), {
      type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
    });
    const m = 1 + B.viewMargin;
    this.bakeA = mk(Math.round(width * B.viewScale * m), Math.round(height * B.viewScale * m));
    if (B.viewScale > 1.01) {   // supersampled view bake: mipmapped, the dome's derivatives pick the level (AA'd cloud edges)
      this.bakeA.texture.generateMipmaps = true; this.bakeA.texture.minFilter = THREE.LinearMipmapLinearFilter;
    }
    this.lodScale = { A: B.viewScale, B: 1 };   // cloud LOD from the OUTPUT pixel, not the bake texel
    this.bakeB = mk(Math.round(width * B.reflScale * m), Math.round(height * B.reflScale * m));
    this.bakeA.texture.name = 'AG.world.skyBakeView'; this.bakeB.texture.name = 'AG.world.skyBakeMirror';
    this.bakeQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      name: 'AG.world.skyBake',
      uniforms: { ...U, uInvProj: { value: new THREE.Matrix4() }, uCamRot: { value: new THREE.Matrix3() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: fullFrag + /* glsl */`
        uniform mat4 uInvProj; uniform mat3 uCamRot; varying vec2 vUv;
        void main() {
          vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
          vec3 d = normalize(uCamRot * normalize(v.xyz / v.w));
          gl_FragColor = vec4(d.y > -0.02 ? skyFull(d) : clearSky(d), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    }));
    this.bakeAVP = new THREE.Matrix4(); this.bakeBVP = new THREE.Matrix4();
    this.bakeAOn = { value: 0 }; this.bakeBOn = { value: 0 };

    // ---- sky cube (CubeCamera rendering a sphere with the full analytic sky)
    this.cubeRT = new THREE.WebGLCubeRenderTarget(B.cubeSize, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter });
    this.cubeRT.texture.name = 'AG.world.skyCube';
    this.cubeCam = new THREE.CubeCamera(0.5, 50, this.cubeRT);
    this.cubeScene = new THREE.Scene();
    const sphMat = new THREE.ShaderMaterial({
      name: 'AG.world.skyCubeBake', uniforms: U, side: THREE.BackSide, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: fullFrag + 'varying vec3 vW; void main(){ vec3 d = normalize(vW - cameraPosition); gl_FragColor = vec4(d.y > -0.02 ? skyFull(d) : clearSky(d), 1.0); }',
    });
    this.cubeScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), sphMat));
    this.cubeScene.add(this.cubeCam);

    // ---- dome: follows the rendering camera, samples bakes / cube
    const W = P.water;
    this.domeUniforms = {
      ...U,
      tBakeA: { value: this.bakeA.texture }, tBakeB: { value: this.bakeB.texture },
      uBakeAVP: { value: this.bakeAVP }, uBakeBVP: { value: this.bakeBVP }, uBakeAOn: this.bakeAOn, uBakeBOn: this.bakeBOn,
      tSkyCube: { value: this.cubeRT.texture }, uCubeOn: { value: 0 }, uDomeMode: { value: 0 },
      uFakeF0: { value: W.F0 }, uFakeGain: { value: W.reflGain }, uFakeTint: { value: new THREE.Vector3(...W.tint) },
      uFakeDeep: { value: new THREE.Vector3(...displayHexToScene(W.deep, P.exposure)) },
    };
    this.domeMat = new THREE.ShaderMaterial({
      name: 'AG.world.skyDome', uniforms: this.domeUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */`
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vW;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: fullFrag + /* glsl */`
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D tBakeA, tBakeB; uniform mat4 uBakeAVP, uBakeBVP; uniform float uBakeAOn, uBakeBOn;
        uniform samplerCube tSkyCube; uniform float uCubeOn; uniform int uDomeMode;
        uniform float uFakeF0, uFakeGain; uniform vec3 uFakeTint, uFakeDeep;
        varying vec3 vW;
        bool ag_bake(sampler2D t, mat4 vp, vec3 d, out vec3 c) {
          vec4 q = vp * vec4(d, 0.0);
          if (q.w <= 0.0) return false;
          vec2 uv = q.xy / q.w * 0.5 + 0.5;
          if (any(lessThan(uv, vec2(0.001))) || any(greaterThan(uv, vec2(0.999)))) return false;
          c = texture2D(t, uv).rgb; return true;
        }
        vec3 ag_skyLookup(vec3 d) {
          vec3 c;
          if (uBakeAOn > 0.5 && ag_bake(tBakeA, uBakeAVP, d, c)) return c;
          if (uBakeBOn > 0.5 && ag_bake(tBakeB, uBakeBVP, d, c)) return c;
          if (uCubeOn > 0.5) return textureCube(tSkyCube, d).rgb;
          return skyFull(d);
        }
        void main(){
          #include <logdepthbuf_fragment>
          vec3 d = normalize(vW - cameraPosition);
          vec3 c;
          if (uDomeMode == 1 && d.y < 0.0) {           // environment capture: the lake as a dark mirror
            vec3 r = vec3(d.x, -d.y, d.z);
            float F = (uFakeF0 + (1.0 - uFakeF0) * pow(1.0 - clamp(-d.y, 0.0, 1.0), 5.0)) * uFakeGain;
            c = textureCube(tSkyCube, r).rgb * uFakeTint * F + uFakeDeep * (1.0 - F);
          } else c = ag_skyLookup(d);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), this.domeMat);
    this.dome.name = 'AG.world.skyDome'; this.dome.frustumCulled = false; this.dome.renderOrder = -1000;
    this.dome.layers.enable(ENV_LAYER);
    this.dome.onBeforeRender = (r, s, camera) => {   // follow the camera; radius inside its far plane
      const R = Math.min(0.9 * camera.far, 50000);
      this.dome.position.setFromMatrixPosition(camera.matrixWorld);
      this.dome.scale.setScalar(R);
      this.dome.updateMatrixWorld(true);
    };

    this._v = new THREE.Vector3(); this._m3 = new THREE.Matrix3(); this._m4 = new THREE.Matrix4();
    this._mirrorCam = new THREE.PerspectiveCamera();
  }

  /** sun elevation (deg) -> uniforms (gains, arch); returns the sun direction */
  setSun(elevDeg) {
    const P = this.P.sky, U = this.uniforms;
    const s = elevDeg;
    U.uSunElevRad.value = s * DEG;
    U.uSunDir.value.set(0, Math.sin(s * DEG), -Math.cos(s * DEG));
    U.uArch.value = Math.exp(-P.archK * (s + 1));
    const blue = smoothstep(-2.0, -4.5, s);
    const gb = Math.exp(P.gainBaseK * (s + 1)), gg = Math.exp(P.gainGlowK * (s + 1));
    U.uGainBase.value.set(...P.blueHourTintBase.map((t) => gb * lerp(1, t, blue)));
    U.uGainGlow.value.set(...P.blueHourTintGlow.map((t) => gg * lerp(1, t, blue)));
    return U.uSunDir.value;
  }
  setTime(t) { this.uniforms.uCloudTime.value = t; }

  /** CPU clear sky (matches the shader's clearSky) for direction (x,y,z) */
  clearSkyCPU(x, y, z) {
    const U = this.uniforms;
    const hl = Math.hypot(x, z);
    const sx = U.uSunDir.value.x, sz = U.uSunDir.value.z, sl = Math.hypot(sx, sz) || 1;
    const ca = hl > 1e-6 ? (x * sx + z * sz) / (hl * sl) : 1;
    const a = Math.acos(Math.max(-1, Math.min(1, ca))) / DEG;
    const eRaw = Math.asin(Math.max(-1, Math.min(1, y))) / DEG;
    const e = Math.max(eRaw, 0) * U.uArch.value;
    const c = this.lut.sample(a, e);
    const gw = Math.exp(-Math.pow(a / U.uGlowW.value, 2)) * Math.exp(-e / U.uGlowH.value);
    const gb = U.uGainBase.value, gg = U.uGainGlow.value;
    const out = [c[0] * lerp(gb.x, gg.x, gw), c[1] * lerp(gb.y, gg.y, gw), c[2] * lerp(gb.z, gg.z, gw)];
    const K = U.uCore.value;
    const wc = Math.exp(-Math.pow(a / K.z, 2)) * Math.exp(-Math.pow((eRaw - K.w) / 1.4, 2));
    out[0] *= 1 + wc * K.x; out[1] *= 1 + wc * ((1 + K.x) * (1 + K.y) - 1); out[2] *= 1 + wc * K.x;
    if (eRaw < 0) { const f = lerp(1, U.uBelowFade.value, smoothstep(0, 6, -eRaw)); out[0] *= f; out[1] *= f; out[2] *= f; }
    return out;
  }

  _bakeInto(rt, camera, vpOut, scaleFov, lodScale = 1) {
    const r = this.renderer;
    // projection with a wider field of view (margin), direction-only view (rotation)
    const Pm = this._m4.copy(camera.projectionMatrix);
    Pm.elements[0] /= scaleFov; Pm.elements[5] /= scaleFov;
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const viewRot = rot.clone().transpose();
    vpOut.multiplyMatrices(Pm, viewRot);
    const u = this.bakeQuad.material.uniforms;
    u.uInvProj.value.copy(Pm).invert();
    u.uCamRot.value.setFromMatrix4(rot);
    // pixel footprint for the cloud LOD
    this.uniforms.uPixelAngle.value = (2 / Pm.elements[5]) / rt.height * lodScale;
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    this.bakeQuad.render(r);
    r.setRenderTarget(prev);
  }

  /** the water's mirror camera (same construction as three's Reflector, plane y = 0) */
  mirrorCamera(camera) {
    const mc = this._mirrorCam;
    const cp = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cp);
    const up = new THREE.Vector3(0, 1, 0).applyMatrix4(rot);
    mc.position.set(cp.x, -cp.y, cp.z);
    mc.up.set(up.x, -up.y, up.z);
    mc.lookAt(look.x, -look.y, look.z);
    mc.updateMatrixWorld(true);
    mc.projectionMatrix.copy(camera.projectionMatrix);
    return mc;
  }

  /** once per output frame */
  bake(camera, { view = true, mirror = true, cube = true } = {}) {
    const m = 1 + this.P.bake.viewMargin;
    camera.updateMatrixWorld(true);
    if (cube) {
      const r = this.renderer;
      this.cubeCam.position.set(0, 0, 0);
      this.cubeCam.update(r, this.cubeScene);
      this.domeUniforms.uCubeOn.value = 1;
    }
    if (view && camera) { this._bakeInto(this.bakeA, camera, this.bakeAVP, m, this.lodScale.A); this.bakeAOn.value = 1; } else this.bakeAOn.value = 0;
    if (mirror && camera) { this._bakeInto(this.bakeB, this.mirrorCamera(camera), this.bakeBVP, m); this.bakeBOn.value = 1; } else this.bakeBOn.value = 0;
  }

  /** SH9 (irradiance-convolved, divided by pi: E(n)/pi = sum c_i Y_i(n)) of the clear sky + mirror lake below */
  irradianceSH(out, { lakeReflect = 0.45, lakeDeep = [0.004, 0.004, 0.008], cloudDim = 0.92 } = {}) {
    const NT = 48, NP = 96;
    const c = Array.from({ length: 9 }, () => [0, 0, 0]);
    for (let i = 0; i < NT; i++) {
      const th = ((i + 0.5) / NT) * Math.PI; const st = Math.sin(th), ct = Math.cos(th);
      const dw = (Math.PI / NT) * (2 * Math.PI / NP) * st;
      for (let j = 0; j < NP; j++) {
        const ph = ((j + 0.5) / NP) * 2 * Math.PI;
        const x = st * Math.cos(ph), y = ct, z = st * Math.sin(ph);
        let L;
        if (y >= 0) { L = this.clearSkyCPU(x, y, z); L = L.map((v) => v * cloudDim); }
        else {
          const s = this.clearSkyCPU(x, -y, z);
          const F = lakeReflect * (0.06 + 0.94 * Math.pow(1 - Math.min(1, -y), 5));
          L = s.map((v, k) => v * F + lakeDeep[k]);
        }
        const Y = [0.282095, 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z,
          0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)];
        for (let k = 0; k < 9; k++) for (let ch = 0; ch < 3; ch++) c[k][ch] += L[ch] * Y[k] * dw;
      }
    }
    const A = [Math.PI, 2 * Math.PI / 3, 2 * Math.PI / 3, 2 * Math.PI / 3, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
    for (let k = 0; k < 9; k++) out[k].set(c[k][0] * A[k] / Math.PI, c[k][1] * A[k] / Math.PI, c[k][2] * A[k] / Math.PI);
    return out;
  }

  dispose() {
    this.bakeA.dispose(); this.bakeB.dispose(); this.cubeRT.dispose(); this.lut.texture.dispose();
    this.bakeQuad.material.dispose(); this.bakeQuad.dispose(); this.domeMat.dispose(); this.dome.geometry.dispose();
  }
}

// SH evaluation (matches irradianceSH's basis); include in shaders that want sky irradiance
export const SH_GLSL = /* glsl */`
uniform vec3 uSH[9];
vec3 ag_shIrr(vec3 n) {   // E(n) / pi
  float x = n.x, y = n.y, z = n.z;
  return uSH[0] * 0.282095 + uSH[1] * (0.488603 * y) + uSH[2] * (0.488603 * z) + uSH[3] * (0.488603 * x)
       + uSH[4] * (1.092548 * x * y) + uSH[5] * (1.092548 * y * z) + uSH[6] * (0.315392 * (3.0 * z * z - 1.0))
       + uSH[7] * (1.092548 * x * z) + uSH[8] * (0.546274 * (x * x - y * y));
}
`;
