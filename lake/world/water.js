// Water: the plane y = 0 as a three.js Reflector (re-rendered every sub-frame with the jittered / sheared camera,
// so reflections get the same AA, motion blur and depth of field), shaded with analytic normals:
//   * concentric ring wave packets from an event list, dispersion omega^2 = (g k + (sigma/rho) k^3) tanh(k h_eff):
//     at radius r and age tau the packet carries the wavenumber whose group velocity is r / tau (stationary phase),
//     weighted by a band around the event's nominal wavelength, so the outer rings are longer and the field spreads
//     like water; packets fade out by age (never popped) and taper smoothly at the minimum group speed
//   * continuous micro-ring emitters (legs, bench legs, shoes), lambda ~3.5 cm
//   * a long gentle swell (0.3-1.9 m, finite-depth dispersion) that slices the reflections into horizontal zig-zags
//   * chop (1-2 m) and wavelets (0.15-0.6 m): irregular travelling noise with stretched crests (troughs / slabs)
//   * wind micro-normals: 3 rotated octaves with their own directions and capillary phase speeds
// The reflection is looked up with parallax correction (reflection depth texture -> distance to the reflected
// surface, re-fetched at the perturbed UV), so the piano's reflection breaks into slices with the right lateral
// jitter while the sky reflection moves by the full angular deviation. Glossy blur is PREFILTERED (mipmapped
// reflection target, anisotropic 4-tap lobe), deterministic per pixel: no sampling noise between frames. Slope
// variance removed by the band limit becomes roughness (blur) instead of aliasing.
// Under the reflection: clear shallow water over a dark pebble bed (Beer-Lambert), visible where the reflection
// is dark (under the piano), lit by the sky irradiance and shadowed by whatever darkens the reflection.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GLSL_NOISE, azDir, halton, displayHexToScene } from './util.js';
import { SKY_UNIFORMS_GLSL, SKY_FUNCS_GLSL, SH_GLSL } from './sky.js';
import { ATMOS_UNIFORMS_GLSL, ATMOS_FUNCS_GLSL } from './terrain.js';

export const MAX_EVENTS = 40, MAX_EMITTERS = 16, N_SWELL = 6;
const G = 9.81, SIGMA_RHO = 0.0728 / 1000;
/** angular frequency of the capillary-gravity wave k at depth h (h = Infinity: deep water) */
export const omegaOf = (k, h = Infinity) => Math.sqrt((G * k + SIGMA_RHO * k * k * k) * (Number.isFinite(h) ? Math.tanh(Math.min(k * h, 9)) : 1));
/** group speed at depth h (matches the shader's ag_cg) */
export function groupSpeed(k, h = Infinity) {
  const a = G * k + SIGMA_RHO * k * k * k;
  if (!Number.isFinite(h)) return (G + 3 * SIGMA_RHO * k * k) / (2 * Math.sqrt(a));
  const th = Math.tanh(Math.min(k * h, 9));
  return ((G + 3 * SIGMA_RHO * k * k) * th + a * h * (1 - th * th)) / (2 * Math.sqrt(a * th));
}

const WATER_FRAG = /* glsl */`
#include <logdepthbuf_pars_fragment>
uniform sampler2D tDiffuse; uniform sampler2D tReflDepth;
uniform mat4 uWorldToRefl; uniform mat4 uReflInvVP; uniform float uHasDepth; uniform vec2 uReflSize;
uniform float uTime;
uniform vec4 uEvA[${MAX_EVENTS}]; uniform vec4 uEvB[${MAX_EVENTS}]; uniform int uNumEv;
uniform vec4 uEmA[${MAX_EMITTERS}]; uniform vec4 uEmB[${MAX_EMITTERS}]; uniform int uNumEm;
uniform vec4 uSwell[${N_SWELL}]; uniform float uSwellW[${N_SWELL}]; uniform vec2 uSwellFade;
uniform vec4 uWind;           // strength (low cameras), scale (m), strength (looking down), scale (looking down)
uniform float uRingSharp;     // cycle 3 round 2: Stokes-like second harmonic of the ring packets (cusped crests, flat troughs; critic: rings x0.5 contrast)
uniform float uWindOmegaMax;  // cycle 3 round 2: cap of the wind octaves' angular frequency (rad/s): the capillary octaves
                              // changed phase by up to 74 deg per 60 fps frame (critic: static-camera water decorrelates every
                              // frame, lag-1 ACF of the diffs -0.3): art-directed slower ripples, same still look
uniform vec3 uChop;           // slope amplitude, scale (m), crest stretch
uniform vec2 uChopFade;       // chop fades out between these distances (m)
uniform vec4 uWavelet;        // RMS slope, longest wavelength (m), crest stretch, fade start (m)
uniform vec3 uWaveletDir;     // travel azimuths (deg) of the 3 octaves
uniform float uHEff;          // effective depth for the long waves' dispersion (m)
uniform float uFarFadeK;      // 0 low cameras .. 1 elevated cameras (swell / chop fade much nearer: ref 5's mirror)
uniform vec3 uTintDark;
uniform float uF0, uF0High, uReflGain, uReflGainHigh, uReflGainFar; uniform vec2 uHighDep; uniform vec3 uTint; uniform vec3 uDeep;
uniform float uRoughNear, uRoughFar, uRoughDist, uPixelAngleW;
uniform vec3 uAbsorb; uniform vec3 uBedAlb; uniform float uDepthPiano, uDepthSlope, uDepthMax, uPebble, uBedVar;
uniform vec2 uBedCenter; uniform float uBedGain, uBedOccMin; uniform float uRingDamp, uRingField, uRingNear, uRingMaxAge, uRingClip, uGlitter, uGlitterK;
uniform vec2 uGlitterFade; uniform vec3 uFarMirror; uniform vec2 uLostCap; uniform vec3 uReflSharp; uniform vec3 uRingCalm; uniform vec2 uRingSteep; uniform float uTapFar; uniform vec2 uBandLim;
uniform int uDebug;           // 0 normal; 1 raw reflection at the flat UV; 2 log10(D)/5; 3 glossy reflection; 4 reflection depth; 7 slope; 8 roughness
varying vec3 vW;

const float Gc = 9.81; const float SR = 7.28e-5;
float ag_gDist = 0.0;          // camera distance of the shaded point (set in main)
float ag_fpLat = 0.0, ag_fpAlong = 0.0; vec2 ag_vH = vec2(0.0, 1.0);   // pixel footprint across / along the view
float ag_dep = 0.0;            // depression of the view ray at this pixel (deg)
// footprint seen by a wave travelling along kdir (foreshortening only shrinks the along-view direction)
float ag_fpDir(vec2 kdir) { return mix(ag_fpLat, ag_fpAlong, abs(dot(kdir, ag_vH))); }
// footprint for the isotropic noise octaves (wind, chop, wavelets): lat^(1-a) along^a; a = 0.5 is the geometric mean
// (keeps the refs' fine horizontal glint streaks at grazing views, slightly aliased: supersampling integrates them),
// a = 1 the along-view footprint (no aliasing at all, but the low-shot water turns into a smooth smear)
uniform float uFpAniso;
uniform vec4 uShortCrest;     // cycle 3: short-crest patch envelope: lateral scale (m), amount, fade-in distance (m), wind share
uniform vec2 uReflFloor;      // cycle 3: reflection floor from above: x zenith colour, from depression (deg)
uniform float uRingLow;       // cycle 3: ring gain below 10-20 deg depression
// cycle 3 round 2 (critic: the piano's mirror image dissolves into grey-lavender ripples; reflbox L<20 share 0.07 vs ref 0.34):
// near reflected objects (D < y..z m) use x times the slope for the lookup (dark broken bands, the ray no longer escapes to
// the sky past the legs) and, in low views, the lit bed under them is occluded down to w (was uBedOccMin)
uniform vec4 uNearRefl;
uniform vec2 uSunSide;       // cycle 3 round 2: reflection gain toward the sun azimuth (x within |A| ~ y deg; col_p90 #EC9067 vs #FD9E6D)
float ag_fpMax() { return pow(ag_fpLat, 1.0 - uFpAniso) * pow(ag_fpAlong, uFpAniso); }
float ag_band(float k, float fp) { return 1.0 - smoothstep(uBandLim.x, uBandLim.y, k * fp / 3.14159); }
// capillary-gravity dispersion at the effective depth: omega^2 = (g k + sigma/rho k^3) tanh(k h)
float ag_th(float k) { return tanh(min(k * uHEff, 9.0)); }
float ag_omega(float k) { return sqrt((Gc * k + SR * k * k * k) * ag_th(k)); }
float ag_cg(float k) {
  float th = ag_th(k), a = Gc * k + SR * k * k * k;
  return ((Gc + 3.0 * SR * k * k) * th + a * uHEff * (1.0 - th * th)) / (2.0 * sqrt(a * th));
}
mat2 ag_rot(float deg) { float c = cos(radians(deg)), s = sin(radians(deg)); return mat2(c, s, -s, c); }
vec2 ag_azDir(float deg) { return vec2(sin(radians(deg)), -cos(radians(deg))); }

// slope of the surface (dh/dx, dh/dz); lostVar = slope variance removed by the band limit (-> roughness)
vec2 ag_waterGrad(vec2 x, out float lostVar) {
  vec2 g = vec2(0.0); lostVar = 0.0;
  // ring packets (stationary phase: the wavenumber whose group speed is r / tau)
  vec2 gRing = vec2(0.0);
  for (int i = 0; i < ${MAX_EVENTS}; i++) {
    if (i >= uNumEv) break;
    vec4 A = uEvA[i]; vec4 B = uEvB[i];
    float tau = uTime - A.z; if (tau <= 0.02 || tau >= uRingMaxAge) continue;
    vec2 dv = x - A.xy; float r = length(dv);
    if (r < 1e-3 || r > 4.0 * uRingField || r > B.z * tau) continue;   // beyond the field / ahead of the fastest group
    float v = r / tau;
    if (v < 0.178) continue;                       // inside the packet's quiet centre (below the minimum group speed)
    float k = Gc / (4.0 * v * v);                  // gravity-branch guess, then Newton on cg(k) = v
    for (int it = 0; it < 3; it++) {
      float c = ag_cg(k); float dc = (ag_cg(k * 1.01) - c) / (0.01 * k);
      k = clamp(k - (c - v) / (abs(dc) > 1e-6 ? dc : -1e-6), 2.0, 140.0);
    }
    float k0 = B.x;
    float env = exp(-pow((k - k0) / (B.y * k0), 2.0));
    float band = ag_band(k, ag_fpDir(dv / r));
    float amp = A.w * env * inversesqrt(1.0 + r / uRingNear) * exp(-r / uRingField) * exp(-uRingDamp * k * k * tau * 1e-3);
    amp *= smoothstep(0.178, 0.215, v);            // smooth caustic taper (no hard inner edge)
    amp *= 1.0 - smoothstep(uRingMaxAge - 3.0, uRingMaxAge, tau);   // old packets fade out (never pop)
    float ph = k * r - ag_omega(k) * tau;
    float prof = sin(ph);
    if (uRingSharp > 0.0) prof += uRingSharp * sin(2.0 * ph) * ag_band(2.0 * k, ag_fpDir(dv / r)) / max(band, 1e-3);
    vec2 gr = -amp * k * prof * (dv / r);
    gRing += gr * band; lostVar += dot(gr, gr) * (1.0 - band) * 0.5;
  }
  // continuous micro emitters
  for (int j = 0; j < ${MAX_EMITTERS}; j++) {
    if (j >= uNumEm) break;
    vec4 A = uEmA[j]; vec4 B = uEmB[j];
    vec2 dv = x - A.xy; float r = length(dv); if (r < 1e-3 || r > B.x * 2.5) continue;
    float k = A.w;
    float band = ag_band(k, ag_fpDir(dv / r));
    float amp = A.z * exp(-r / B.x) * inversesqrt(1.0 + r / 0.03);
    float ph = k * r - B.z * uTime + B.y;
    vec2 gr = -amp * k * sin(ph) * (dv / r);
    gRing += gr * band; lostVar += dot(gr, gr) * (1.0 - band) * 0.5;
  }
  // soft slope clip: near-source rings cannot tilt the reflection onto the piano's black underside as solid ink
  float gl = length(gRing);
  // fix round 2: steep views (drone, ref 6 / S20): lower knee and amplitude (uRingSteep: clip scale, amplitude scale
  // above ~25 deg depression): summed rings tilted the reflection onto the piano's underside as black ink
  float wSteep = smoothstep(12.0, 30.0, ag_dep);
  float clipR = uRingClip * mix(1.0, uRingSteep.x, wSteep);
  gRing *= mix(1.0, uRingSteep.y, wSteep) * mix(uRingLow, 1.0, smoothstep(10.0, 20.0, ag_dep)); gl = length(gRing);   // cycle 3: uRingLow = ring gain for grazing / oblique views (ref 5: 14+ crisp rings, ours almost none)
  if (gl > 1e-6) gRing *= clipR * tanh(gl / clipR) / gl;
  g += gRing;
  float farK = uFarFadeK;
  // fix round 2: wind and chop calm down inside the ring field around the piano (the rings were swamped by the chop)
  float calm = mix(uRingCalm.z, 1.0, smoothstep(uRingCalm.x, uRingCalm.y, length(x - uBedCenter)));
  // swell (finite-depth dispersion), fades out toward the far, mirror-flat water
  float swEnd = mix(uSwellFade.y, 25.0, farK);
  // cycle 3 short crests (critic: far water = full-width continuous scan lines; ref = short broken glint dashes with
  // calm open patches): the swell and chop slopes are modulated by a patch envelope uShortCrest.x m across the view
  // (WORLD-fixed frame of the main swell, which travels toward the camera in the sunset-facing shots: stretched along
  // it so a far pixel row keeps one envelope value; a view-aligned frame would swim when the camera pans), from uShortCrest.z m
  vec2 scA = uSwell[0].xy, scL = vec2(-scA.y, scA.x);
  float scN = ag_vnoise(vec2(dot(x, scL) / uShortCrest.x, dot(x, scA) / (uShortCrest.x * 6.0)) + 17.3);
  float scN2 = ag_vnoise(vec2(dot(x, scL) / (uShortCrest.x * 0.45), dot(x, scA) / (uShortCrest.x * 2.7)) + 5.1);
  float scEnv = mix(1.0, 2.2 * smoothstep(0.35, 0.95, 0.65 * scN + 0.35 * scN2), uShortCrest.y * smoothstep(uShortCrest.z, uShortCrest.z * 3.0, ag_gDist));
  float swf = smoothstep(uSwellFade.x * 0.3, uSwellFade.x, ag_gDist) * (1.0 - smoothstep(swEnd * 0.25, swEnd, ag_gDist)) * scEnv;
  for (int s = 0; s < ${N_SWELL}; s++) {
    vec4 S = uSwell[s];
    float ph = S.z * dot(S.xy, x) - uSwellW[s] * uTime + float(s) * 2.39996;
    float band = ag_band(S.z, ag_fpDir(S.xy));
    float sl = S.w * S.z;
    g += -sl * sin(ph) * S.xy * swf * band;
    lostVar += sl * sl * 0.5 * (1.0 - band) * swf;
  }
  // irregular wind-wave chop on top of the swell (breaks the regular sinusoid lines; crests stretched across)
  {
    vec2 dT = uSwell[0].xy, dC = vec2(-dT.y, dT.x);
    float a = 1.0, sc = uChop.y;
    vec2 cf = mix(uChopFade, vec2(25.0, 60.0), farK);
    float fade = (1.0 - smoothstep(cf.x, cf.y, ag_gDist)) * smoothstep(0.3, 1.5, ag_gDist) * calm * scEnv;
    for (int o = 0; o < 2; o++) {
      vec2 q = vec2(dot(x, dT) / sc, dot(x, dC) / (sc * uChop.z)) + vec2(0.35, 0.1) * uTime / sc;
      vec3 n = ag_vnoised(q + float(o) * 7.3);
      vec2 gx = n.y * dT / sc + n.z * dC / (sc * uChop.z);
      float band = ag_band(6.2832 / sc, ag_fpMax());
      g += gx * uChop.x * sc * a * band * fade;
      lostVar += pow(uChop.x * a * 0.45, 2.0) * (1.0 - band) * fade;
      a *= 0.55; sc *= 0.5;
    }
  }
  // wavelets 0.15-0.6 m (the refs' rounded wavelets and deep troughs in the near water): 3 octaves, each travelling
  // in its own direction at its own phase speed, two crossing noise layers per octave (the pattern evolves)
  if (uWavelet.x > 0.0) {
    // (steep views keep only a quarter: from above the refs' lake shows legible cloud reflections, ref 6)
    float fade = (1.0 - smoothstep(uWavelet.w, uWavelet.w * 2.0, ag_gDist)) * smoothstep(0.2, 0.8, ag_gDist) * (1.0 - 0.75 * smoothstep(10.0, 25.0, ag_dep));
    float lam = uWavelet.y;
    for (int o = 0; o < 3; o++) {
      float az = o == 0 ? uWaveletDir.x : (o == 1 ? uWaveletDir.y : uWaveletDir.z);
      float k = 6.2832 / lam; float c = ag_omega(k) / k;
      float cell = lam * 0.5;
      float ampH = 0.098 * cell * uWavelet.x / 0.078;          // height amplitude -> ~uWavelet.x / sqrt(3) RMS slope per octave
      float band = ag_band(k, ag_fpMax());
      for (int l = 0; l < 2; l++) {
        float azl = az + (l == 0 ? 14.0 : -14.0);
        vec2 dT = ag_azDir(azl), dC = vec2(-dT.y, dT.x);
        vec2 q = vec2(dot(x, dT) / cell - c * uTime / cell, dot(x, dC) / (cell * uWavelet.z)) + float(o * 2 + l) * 13.7;
        vec3 n = ag_vnoised(q);
        vec2 gx = n.y * dT / cell + n.z * dC / (cell * uWavelet.z);
        g += gx * ampH * 0.7071 * band * fade;
      }
      lostVar += pow(uWavelet.x * 0.577, 2.0) * (1.0 - band) * fade * 0.25;   // unresolved wavelets: a mild blur only
      lam *= 0.5;
    }
  }
  // wind micro-normals: 3 octaves, rotated lattices, own directions and capillary phase speeds, two crossing layers
  float wDown = smoothstep(12.0, 30.0, ag_dep);
  float wStr = mix(uWind.x, uWind.z, wDown) * calm, sc = mix(uWind.y, uWind.w, wDown);
  vec2 wg = vec2(0.0); float a = 1.0; float f = 1.0;
  for (int o = 0; o < 3; o++) {
    float az = 195.0 + (o == 0 ? 37.0 : (o == 1 ? -51.0 : 73.0));
    float cell = sc / f; float k = 3.14159 / cell; float c = min(ag_omega(k), uWindOmegaMax) / k;
    float band = ag_band(6.2832 * f / sc, ag_fpMax());
    vec2 acc = vec2(0.0);
    for (int l = 0; l < 2; l++) {
      mat2 Rm = ag_rot(az + (l == 0 ? 0.0 : 31.0));
      vec2 q = Rm * x / cell - vec2(0.0, c * uTime / cell) + float(o * 2 + l) * 9.1;
      vec3 n1 = ag_vnoised(q);
      acc += (transpose(Rm) * n1.yz) * 0.7071;
    }
    wg += acc * a * band; lostVar += pow(wStr * a * 0.6 * 0.57, 2.0) * (1.0 - band);
    f *= 2.3; a *= 0.5;
  }
  g += wg * wStr * 0.6 * mix(1.0, scEnv, uShortCrest.w);
  return g;
}

// rounded dark pebbles (Worley cells): returns albedo, writes the pebble normal
vec3 ag_pebbles(vec2 x, float fp, out vec3 nb) {
  vec2 p = x / uPebble;
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0; vec2 c1 = vec2(0.0), r1 = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int xx = -1; xx <= 1; xx++) {
    vec2 g = vec2(float(xx), float(y)); vec2 o = 0.15 + 0.7 * ag_h22(i + g);
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; c1 = i + g; r1 = r; } else if (d < d2) d2 = d;
  }
  d1 = sqrt(d1); d2 = sqrt(d2);
  float edge = d2 - d1;                                // 0 at the cell boundary
  float fine = 1.0 - smoothstep(0.3, 1.0, fp / uPebble);
  float dome = smoothstep(0.0, 0.35, edge);
  vec2 sl = -r1 / max(d1, 1e-3) * (1.0 - dome) * 1.4 * fine;   // the dome slopes away from the pebble centre
  nb = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec2 h = ag_h22(c1 + 17.0);
  vec3 alb = uBedAlb * (1.0 + uBedVar * (h.x - 0.5)) * mix(vec3(1.0), vec3(1.05, 0.97, 0.92), h.y);
  float gap = mix(1.0, mix(0.35, 1.0, smoothstep(0.0, 0.12, edge)), fine);
  return alb * gap;
}

uniform mat3 uCamRot; uniform vec4 uProjXY; uniform vec4 uViewport;
// exact water point under this pixel: ray from the camera through the pixel centre, intersected with y = 0.
// (Interpolating vW over the 120 km quad clipped by the near plane is off by metres on ANGLE/D3D11 and the error
// changes with the sub-frame jitter: the reflection then smeared and the piano's mirror image vanished.)
vec3 ag_waterPoint() {
  vec2 ndc = (gl_FragCoord.xy - uViewport.xy) / uViewport.zw * 2.0 - 1.0;
  vec3 dv = vec3((ndc.x + uProjXY.z) / uProjXY.x, (ndc.y + uProjXY.w) / uProjXY.y, -1.0);
  vec3 d = normalize(uCamRot * dv);
  float t = d.y < -1e-7 ? -cameraPosition.y / d.y : 1.0e5;
  vec3 P = cameraPosition + d * min(t, 1.0e5); P.y = 0.0;
  return P;
}
// distance from the water point P to the reflected surface seen at reflection-UV uv (1e5 = open sky)
float ag_reflDist(vec2 uv, vec3 P) {
  if (uHasDepth < 0.5) return 1e5;
  float zd = texture2D(tReflDepth, uv).x;
  if (zd >= 0.99999) return 1e5;
  vec4 hw = uReflInvVP * vec4(uv * 2.0 - 1.0, zd * 2.0 - 1.0, 1.0);
  return min(length(hw.xyz / hw.w - P), 1e5);
}
vec2 ag_reflUV(vec3 P, vec3 R, float D) {
  vec4 cp = uWorldToRefl * vec4(P + R * D, 1.0);
  return clamp(cp.xy / cp.w, vec2(0.0005), vec2(0.9995));
}
vec3 ag_reflDir(vec3 V, vec2 grad) {
  vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 R = reflect(-V, N); R.y = max(R.y, 0.0015); return normalize(R);
}
void main() {
  #include <logdepthbuf_fragment>
  vec3 P = uViewport.z > 0.0 ? ag_waterPoint() : vec3(vW.x, 0.0, vW.z);
  vec3 Vv = cameraPosition - P; float dist = length(Vv); vec3 V = Vv / dist;
  float cosV = max(V.y, 0.015);
  float fp = dist * uPixelAngleW / cosV;               // footprint along the view on the water (m)
  ag_gDist = dist; ag_fpLat = dist * uPixelAngleW; ag_fpAlong = fp; ag_vH = normalize(-V.xz + vec2(1e-6));
  ag_dep = degrees(asin(clamp(V.y, 0.0, 1.0)));
  float lostVar;
  vec2 grad = ag_waterGrad(P.xz, lostVar);
  vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
  // parallax-corrected reflection lookup: distance to the reflected surface from the reflection depth at the flat
  // UV, then again at the perturbed UV (a ray that escaped past a near object sees the sky / far terrain)
  vec4 cf = uWorldToRefl * vec4(P, 1.0); vec2 uvF = cf.xy / cf.w;
  float D = ag_reflDist(uvF, P);
  float nearObj = 1.0 - smoothstep(uNearRefl.y, uNearRefl.z, D);
  vec2 gradR = grad * mix(1.0, uNearRefl.x, nearObj);
  vec3 R = ag_reflDir(V, gradR);
  vec2 uv = ag_reflUV(P, R, D);
  float D2 = ag_reflDist(uv, P);
  if (D2 > 4.0 * D) { D = D2; uv = ag_reflUV(P, R, D); }
  // glossy reflection, prefiltered (no stochastic taps: the lake must not boil between frames): the Reflector
  // target is mipmapped every sub-frame; the slope distribution (sub-pixel ripples + the variance removed by the
  // band limit) is projected along / across the view; 4 fixed taps along the long (vertical) axis of the lobe,
  // each read at the LOD of the short axis
  float rough = mix(uRoughNear, uRoughFar, smoothstep(0.0, uRoughDist, dist)) + min(sqrt(lostVar) * 0.7, mix(uLostCap.x, uLostCap.y, smoothstep(30.0, 300.0, dist)));
  rough *= mix(uReflSharp.z, 1.0, smoothstep(uReflSharp.x, uReflSharp.y, D));   // fix round 2: near reflected objects stay sharp
  vec3 refl;
  if (rough > 1e-5) {
    vec2 tA = ag_vH, tL = vec2(-ag_vH.y, ag_vH.x);
    vec2 duvA = ag_reflUV(P, ag_reflDir(V, gradR + rough * tA), D) - uv;
    vec2 duvL = ag_reflUV(P, ag_reflDir(V, gradR + rough * tL), D) - uv;
    float sA = length(duvA * uReflSize), sL = length(duvL * uReflSize);
    float lod = log2(max(max(2.0 * sL, 0.8 * sA), 1.0));
    duvA *= mix(1.0, uTapFar, smoothstep(150.0, 250.0, dist));   // fix round 2: far taps closer (gaps printed as vertical rectangles)
    refl = (textureLod(tDiffuse, clamp(uv - 1.2 * duvA, vec2(0.0005), vec2(0.9995)), lod).rgb
          + textureLod(tDiffuse, clamp(uv - 0.4 * duvA, vec2(0.0005), vec2(0.9995)), lod).rgb
          + textureLod(tDiffuse, clamp(uv + 0.4 * duvA, vec2(0.0005), vec2(0.9995)), lod).rgb
          + textureLod(tDiffuse, clamp(uv + 1.2 * duvA, vec2(0.0005), vec2(0.9995)), lod).rgb) * 0.25;
  } else refl = textureLod(tDiffuse, uv, 0.0).rgb;
  // art-directed glitter (docs/WORLD.md): where the reflection sees open sky just above the horizon (wave faces
  // tilted toward the camera), add the extra glow seen at a compressed (lower) elevation: lights the wave tops
  if (uGlitter > 0.0) {
    vec3 Rl = normalize(vec3(R.x, R.y * uGlitterK, R.z));
    vec2 aeR = ag_skyAE(R);
    float wg = smoothstep(300.0, 3000.0, D) * smoothstep(0.3, 1.0, aeR.y) * (1.0 - smoothstep(2.0, 3.5, aeR.y)) * exp(-pow(aeR.x / 24.0, 2.0))
             * (1.0 - smoothstep(uGlitterFade.x, uGlitterFade.y, dist));
    float lumR = dot(refl, vec3(0.2126, 0.7152, 0.0722)), lumS = dot(clearSky(R), vec3(0.2126, 0.7152, 0.0722)) + 1e-4;
    wg *= smoothstep(0.25, 0.7, lumR / lumS);
    refl += max(clearSky(Rl) - clearSky(R), vec3(0.0)) * uGlitter * wg;
  }
  // cycle 3 (I-13, ref 6 / ref 1 / S20: pure-black ink blotches from above; the refs' water never goes below L 11-14):
  // seen from above, the reflected radiance is floored at uReflFloor.x x the clear sky's zenith colour (ring / chop
  // slopes that tilt the ray onto the piano's underside or out of the mirror frustum no longer print black)
  if (uReflFloor.x > 0.0) {
    float wF = smoothstep(uReflFloor.y, uReflFloor.y + 15.0, ag_dep);
    vec3 zen = clearSky(vec3(0.0, 1.0, 0.0)) * uReflFloor.x;
    refl = mix(refl, max(refl, zen), wF);
  }
  if (uDebug == 1) { gl_FragColor = vec4(texture2D(tDiffuse, uvF).rgb, 1.0); return; }
  if (uDebug == 2) { float l = clamp(log(D) / log(10.0) / 5.0, 0.0, 1.0); gl_FragColor = vec4(vec3(l), 1.0); return; }
  if (uDebug == 3) { gl_FragColor = vec4(refl, 1.0); return; }
  if (uDebug == 5) { gl_FragColor = vec4(uvF, cf.w * 0.01, 1.0); return; }
  if (uDebug == 6) { gl_FragColor = vec4(P.x * 0.01, P.z * 0.01, dist * 0.01, 1.0); return; }
  if (uDebug == 4) { gl_FragColor = vec4(vec3(texture2D(tReflDepth, uvF).x), 1.0); return; }
  if (uDebug == 7) { gl_FragColor = vec4(abs(grad) * 5.0, 0.0, 1.0); return; }
  if (uDebug == 8) { gl_FragColor = vec4(vec3(rough * 20.0), 1.0); return; }
  // Fresnel with an exposed F0 that depends on the view ray's own depression (stable under camera rotation):
  // the refs' lake is a far brighter mirror seen steeply from above (ref 6) than from low cameras (refs 2/3/10)
  float wHigh = smoothstep(uHighDep.x, uHighDep.y, ag_dep);
  float F0 = mix(uF0, uF0High, wHigh);
  float F = F0 + (1.0 - F0) * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
  // look (docs/WORLD.md): the refs' lake is a near-perfect mirror from ~20 m out (ref 5's mid water, ref 10's far
  // water match the sky they reflect) but clearly darker close to the camera (refs 2/3/10 near water ~0.6 x)
  F = mix(F, 1.0, uFarMirror.z * smoothstep(uFarMirror.x, uFarMirror.y, dist));
  // the refs' water darkens and reddens the bright glow (#FEC391 -> #D16A56) but keeps the violet/navy mid-tones
  float rl = dot(refl, vec3(0.2126, 0.7152, 0.0722));
  float gain = mix(mix(uReflGain, uReflGainFar, smoothstep(uFarMirror.x, uFarMirror.y, dist)), uReflGainHigh, wHigh);
  float aSun = ag_skyAE(R).x / max(uSunSide.y, 1.0);
  gain *= mix(1.0, uSunSide.x, exp(-aSun * aSun) * smoothstep(0.08, 0.4, rl));
  vec3 Rc = refl * mix(uTintDark, uTint, smoothstep(0.08, 0.6, rl)) * gain;
  // transmitted part: pebble bed through clear shallow water
  float depth = clamp(uDepthPiano + uDepthSlope * length(P.xz - uBedCenter), 0.005, uDepthMax);
  vec3 Tr = refract(-V, N, 1.0 / 1.333);
  vec3 B = P + Tr * (depth / max(-Tr.y, 0.05));
  vec3 nb;
  vec3 balb = ag_pebbles(B.xz, fp, nb);
  float skyL = dot(clearSky(R), vec3(0.2126, 0.7152, 0.0722)) + 1e-4;
  float occMin = mix(uBedOccMin, uNearRefl.w, nearObj * (1.0 - smoothstep(12.0, 25.0, ag_dep)));
  float occ = clamp(dot(refl, vec3(0.2126, 0.7152, 0.0722)) / skyL, occMin, 1.0);   // what darkens the reflection shades the bed
  vec3 Eb = max(ag_shIrr(nb), vec3(0.0)) * occ * uBedGain;
  vec3 Tw = exp(-uAbsorb * (depth + depth / max(-Tr.y, 0.05)));
  vec3 below = balb * Eb * Tw + uDeep * (1.0 - Tw);
  vec3 col = Rc * F + below * (1.0 - F);
  col = ag_atmosphere(col, P, cameraPosition);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function makeWater(P, shared, { width, height, reflScale }) {
  const W = P.water;
  const hEff = W.depthEff ?? 0.15;
  const wl = W.wavelets ?? { slope: 0, lambda: 0.6, stretch: 1.8, fade: 30, dirs: [207, 175, 220] };
  const R = W.ring;
  const uniforms = {
    ...shared,
    color: { value: new THREE.Color(1, 1, 1) }, tDiffuse: { value: null }, textureMatrix: { value: null },
    tReflDepth: { value: null }, uWorldToRefl: { value: new THREE.Matrix4() }, uReflInvVP: { value: new THREE.Matrix4() },
    uHasDepth: { value: 1 }, uTime: { value: 0 }, uReflSize: { value: new THREE.Vector2(1, 1) },
    uEvA: { value: Array.from({ length: MAX_EVENTS }, () => new THREE.Vector4()) },
    uEvB: { value: Array.from({ length: MAX_EVENTS }, () => new THREE.Vector4(60, 0.4, 1, 0)) }, uNumEv: { value: 0 },
    uEmA: { value: Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4()) },
    uEmB: { value: Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(0.4, 0, 40, 0)) }, uNumEm: { value: 0 },
    uSwell: { value: Array.from({ length: N_SWELL }, () => new THREE.Vector4()) },
    uSwellW: { value: Array.from({ length: N_SWELL }, () => 0) }, uSwellFade: { value: new THREE.Vector2(...W.swellFade) },
    uWind: { value: new THREE.Vector4(W.wind.strength, W.wind.scale, W.wind.strengthDown ?? W.wind.strength, W.wind.scaleDown ?? W.wind.scale) },
    uWindOmegaMax: { value: W.wind.omegaMax ?? 1e4 }, uRingSharp: { value: W.ringSharp ?? 0 },
    uWavelet: { value: new THREE.Vector4(wl.slope, wl.lambda, wl.stretch, wl.fade) },
    uWaveletDir: { value: new THREE.Vector3(...wl.dirs) }, uHEff: { value: hEff }, uFarFadeK: { value: 0 },
    uF0: { value: W.F0 }, uF0High: { value: W.F0High ?? W.F0 }, uHighDep: { value: new THREE.Vector2(...(W.highDepression ?? [10, 30])) },
    uReflGain: { value: W.reflGain }, uReflGainHigh: { value: W.reflGainHigh ?? W.reflGain }, uReflGainFar: { value: W.reflGainFar ?? W.reflGain },
    uTint: { value: new THREE.Vector3(...W.tint) },
    uDeep: { value: new THREE.Vector3(...displayHexToScene(W.deep, P.exposure)) },
    uRoughNear: { value: W.roughNear }, uRoughFar: { value: W.roughFar },
    uRoughDist: { value: W.roughDist }, uPixelAngleW: { value: 0.0005 },
    uAbsorb: { value: new THREE.Vector3(...W.absorb) }, uBedAlb: { value: new THREE.Vector3(...W.bedAlbedo) },
    uDepthPiano: { value: W.depthAtPiano }, uDepthSlope: { value: W.depthSlope }, uDepthMax: { value: W.depthMax },
    uPebble: { value: W.pebbleSize }, uBedVar: { value: W.bedVar }, uBedCenter: { value: new THREE.Vector2(0, 0) },
    uRingDamp: { value: R.damping }, uRingField: { value: R.fieldRadius ?? 8 }, uRingNear: { value: R.nearRadius ?? 0.8 },
    uRingMaxAge: { value: R.maxAge ?? 16 }, uRingClip: { value: R.slopeClip ?? 0.12 },
    uGlitter: { value: W.glitter ?? 0 }, uGlitterK: { value: W.glitterK ?? 0.4 },
    uChop: { value: new THREE.Vector3(...(W.chop ?? [0.0, 1.2, 3.0])) }, uChopFade: { value: new THREE.Vector2(...(W.chopFade ?? [40, 160])) },
    uTintDark: { value: new THREE.Vector3(...(W.tintDark ?? [1, 1, 1])) },
    uBedGain: { value: W.bedGain ?? 1 }, uBedOccMin: { value: W.bedOccMin ?? 0.1 }, uDebug: { value: 0 },
    uGlitterFade: { value: new THREE.Vector2(...(W.glitterFade ?? [80, 250])) }, uFarMirror: { value: new THREE.Vector3(...(W.farMirror ?? [12, 60, 0])) },
    uLostCap: { value: new THREE.Vector2(...(W.lostRoughCap ?? [0.03, 0.02])) }, uReflSharp: { value: new THREE.Vector3(...(W.reflSharp ?? [0, 1, 1])) }, uRingCalm: { value: new THREE.Vector3(...(W.ringCalm ?? [3, 9, 1])) }, uRingSteep: { value: new THREE.Vector2(...(W.ringSteep ?? [1, 1])) }, uTapFar: { value: W.tapFar ?? 1.0 }, uBandLim: { value: new THREE.Vector2(...(W.bandLimit ?? [0.5, 1.0])) },
    uFpAniso: { value: W.footprintAniso ?? 1.0 },
    uShortCrest: { value: new THREE.Vector4(...(W.shortCrest ?? [2.5, 0, 40, 0])) }, uReflFloor: { value: new THREE.Vector2(...(W.reflFloor ?? [0, 20])) },
    uRingLow: { value: W.ringLow ?? 1.0 },
    uNearRefl: { value: new THREE.Vector4(...(W.nearRefl ?? [1, 3, 8, 0.4])) }, uSunSide: { value: new THREE.Vector2(...(W.sunSide ?? [1, 25])) },
    uCamRot: { value: new THREE.Matrix3() }, uProjXY: { value: new THREE.Vector4(1, 1, 0, 0) }, uViewport: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  W.swell.slice(0, N_SWELL).forEach(([az, lambda, amp], i) => {
    const k = (2 * Math.PI) / lambda; const [dx, dz] = azDir(az);
    uniforms.uSwell.value[i].set(dx, dz, k, amp);
    uniforms.uSwellW.value[i] = omegaOf(k, hEff);
  });
  const shader = {
    name: 'AG.world.water', uniforms,
    vertexShader: /* glsl */`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: GLSL_NOISE + SKY_UNIFORMS_GLSL + SKY_FUNCS_GLSL + SH_GLSL + ATMOS_UNIFORMS_GLSL + ATMOS_FUNCS_GLSL + WATER_FRAG,
  };
  const tw = Math.max(16, Math.round(width * reflScale)), th = Math.max(16, Math.round(height * reflScale));
  const water = new Reflector(new THREE.PlaneGeometry(W.size, W.size, 1, 1), { textureWidth: tw, textureHeight: th, clipBias: W.clipBias ?? 0.0, shader, multisample: 0 });
  water.rotation.x = -Math.PI / 2;
  water.name = 'AG.world.water';
  water.frustumCulled = false;
  // a depth texture on the reflection target, for the parallax-corrected lookup; mipmaps (rebuilt by three after
  // every reflection render) for the prefiltered glossy lookup
  const rt = water.getRenderTarget();
  rt.depthTexture = new THREE.DepthTexture(tw, th, THREE.UnsignedIntType);
  rt.texture.generateMipmaps = true;
  rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  const U = water.material.uniforms;
  // the Reflector cloned the uniforms: re-link the shared ones (sky / SH / atmosphere) so updates propagate
  for (const k of Object.keys(shared)) U[k] = shared[k];
  U.tReflDepth.value = rt.depthTexture;
  U.uReflSize.value.set(tw, th);
  const base = water.onBeforeRender;
  const tmp = new THREE.Matrix4(), inv = new THREE.Matrix4(), _vp = new THREE.Vector4();
  water.onBeforeRender = function (renderer, scene, camera, ...rest) {
    base.call(this, renderer, scene, camera, ...rest);
    const rc = this.getReflectionCamera(camera);
    // world -> reflection UV (projective), and the inverse of the oblique VP for depth reconstruction
    inv.copy(this.matrixWorld).invert();
    U.uWorldToRefl.value.copy(U.textureMatrix.value).multiply(inv);
    tmp.multiplyMatrices(rc.projectionMatrix, rc.matrixWorldInverse);
    U.uReflInvVP.value.copy(tmp).invert();
    // exact per-pixel water point (see ag_waterPoint): camera rotation, projection x/y terms (incl. jitter / lens
    // shear), current viewport in pixels
    const pe = camera.projectionMatrix.elements;
    if (camera.isPerspectiveCamera && Math.abs(pe[11] + 1) < 1e-6) {
      U.uCamRot.value.setFromMatrix4(camera.matrixWorld);
      U.uProjXY.value.set(pe[0], pe[5], pe[8], pe[9]);
      renderer.getCurrentViewport(_vp);
      U.uViewport.value.copy(_vp);
    } else U.uViewport.value.set(0, 0, 0, 0);
    if (globalThis.__AG_WATER_DEBUG) globalThis.__AG_WATER_DEBUG(this, renderer, camera, rc);   // look-dev only
  };
  return { water, uniforms: U };
}

/**
 * default ring events (deterministic): one packet every `period` s, from the given sources in turn (Halton-picked,
 * the first source = the lyre gets `lyreShare` of them). Sources are { x, z } in whatever space the caller uses;
 * events carry the source index `src` so the caller can re-project them every frame.
 */
export function defaultRippleEvents(P, sources, t0 = -40, t1 = 300) {
  const out = [];
  const nS = sources.length;
  for (const [D, seed] of [[P.water.defaultEvents, 0], [P.water.defaultLongEvents, 5000]]) {
    if (!D) continue;
    let i = 0;
    for (let t = t0; t < t1; t += D.period) {
      const n = i + 1 + seed;
      const j = (halton(n, 2) - 0.5) * D.jitter * D.period;
      const lam = D.wavelength[0] + (D.wavelength[1] - D.wavelength[0]) * halton(n, 3);
      const u = halton(n, 7); const ls = D.lyreShare ?? 0.5;
      const src = nS <= 1 || u < ls ? 0 : 1 + Math.min(nS - 2, Math.floor((u - ls) / (1 - ls) * (nS - 1)));
      out.push({ t: t + j, src, x: sources[src].x, z: sources[src].z, amp: D.amplitude * (0.75 + 0.5 * halton(n, 5)), wavelength: lam });
      i++;
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
