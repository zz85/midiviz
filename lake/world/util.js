// World utilities: deterministic noise (JS + GLSL), colour conversion and the inverse of the core's tone map.
// Nothing here uses Math.random, Date or performance.now: every value is a pure function of its inputs.

export const DEG = Math.PI / 180;

// ---------------------------------------------------------------- colour
export function hexToSrgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
export const srgbToLinear1 = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const linearToSrgb1 = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055);
export const hexToLinear = (hex) => hexToSrgb(hex).map(srgbToLinear1);

/** Khronos PBR Neutral (same as three's NeutralToneMapping), display-linear out */
export function neutral(rgb, exposure = 1) {
  let c = rgb.map((v) => v * exposure);
  const x = Math.min(...c);
  const off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  c = c.map((v) => v - off);
  const peak = Math.max(...c);
  const sc = 0.76, d = 0.24;
  if (peak < sc) return c;
  const np = 1 - (d * d) / (peak + d - sc);
  const g = 1 - 1 / (0.15 * (peak - np) + 1);
  return c.map((v) => (v * np) / peak * (1 - g) + np * g);
}

function invToe(c) { // c = colour after the offset subtraction -> x before it
  const cm = Math.min(...c);
  let off;
  if (cm < 0.04) { const xm = Math.sqrt(Math.max(cm, 0) / 6.25); off = xm - Math.max(cm, 0); }
  else off = 0.04;
  return c.map((v) => v + off);
}

/**
 * Inverse of PBR Neutral: scene-linear colour that the core's final pass (exposure, Neutral, sRGB) turns into the
 * given display-linear colour. Out-of-gamut targets (too saturated for their brightness) are clamped.
 */
export function invNeutral(y, exposure = 1, maxPeak = 0.965) {
  let yy = y.map((v) => Math.max(v, 0));
  let np = Math.max(...yy);
  if (np > maxPeak) { yy = yy.map((v) => (v * maxPeak) / np); np = maxPeak; }
  let x;
  if (np < 0.76) x = invToe(yy);
  else {
    const d = 0.24, sc = 0.76;
    const p = (d * d) / (1 - np) - d + sc;
    const g = 1 - 1 / (0.15 * (p - np) + 1);
    const c = yy.map((v) => Math.max(0, ((v - g * np) / (1 - g)) * (p / np)));
    x = invToe(c);
  }
  return x.map((v) => v / exposure);
}
/** display sRGB hex (as it should appear after the core tone map) -> scene-linear [r,g,b] */
export const displayHexToScene = (hex, exposure = 1) => invNeutral(hexToLinear(hex), exposure);

// ---------------------------------------------------------------- deterministic RNG / hashes (JS)
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
export function hash32(x) {
  x = (x ^ (x >>> 16)) >>> 0; x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0; x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export function hash2i(ix, iy, seed = 0) { return hash32((hash32((ix | 0) + 0x9E3779B9 * (seed + 1)) ^ (iy | 0) * 0x85EBCA6B) >>> 0); }
export const hash01 = (ix, iy, seed = 0) => hash2i(ix, iy, seed) / 4294967296;
export function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

// ---------------------------------------------------------------- 2-D gradient noise (JS), range about [-1, 1]
export function makeNoise2D(seed = 1) {
  const rnd = mulberry32(seed);
  const perm = new Uint16Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(256), gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const a = rnd() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  return function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const g = (i, j, dx, dy) => { const h = perm[perm[i] + j]; return gx[h] * dx + gy[h] * dy; };
    const n00 = g(X, Y, xf, yf), n10 = g(X + 1, Y, xf - 1, yf), n01 = g(X, Y + 1, xf, yf - 1), n11 = g(X + 1, Y + 1, xf - 1, yf - 1);
    const nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
    return (nx0 + v * (nx1 - nx0)) * 1.41;
  };
}
export function fbm(noise, x, y, oct = 5, lac = 2.03, gain = 0.5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= lac; }
  return s / n;
}
/** Musgrave ridged multifractal, ~[0, 1+] */
export function ridged(noise, x, y, { oct = 8, lac = 2.07, gain = 2.1, offset = 1.0, H = 1.0 } = {}) {
  let sum = 0, f = 1, w = 1, amp = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    let s = offset - Math.abs(noise(x * f + i * 31.7, y * f - i * 13.3));
    s *= s; s *= w;
    w = Math.min(1, Math.max(0, s * gain));
    const a = Math.pow(f, -H);
    sum += s * a; norm += a; f *= lac; amp *= 0.5;
  }
  return sum / norm;
}
export function billow(noise, x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(noise(x * f + i * 7.7, y * f + i * 3.1))); n += a; a *= 0.5; f *= 2.1; }
  return s / n;
}
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** piecewise-linear interpolation through [[x, y], ...] (sorted by x), clamped at the ends */
export function piecewise(keys, x) {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) { const [x0, y0] = keys[i - 1], [x1, y1] = keys[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return keys[keys.length - 1][1];
}
/** direction (x, z) of world azimuth A (deg): A = 0 is the sun (toward -Z), clockwise seen from above */
export const azDir = (Adeg) => [Math.sin(Adeg * DEG), -Math.cos(Adeg * DEG)];
/** world azimuth (deg, -180..180] of a horizontal vector */
export const azOf = (x, z) => Math.atan2(x, -z) / DEG;

// ---------------------------------------------------------------- GLSL: hashes and noise (deterministic)
export const GLSL_NOISE = /* glsl */`
uint ag_hash(uint x) { x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float ag_h21(vec2 p) {                     // integer-lattice hash -> [0,1)
  ivec2 i = ivec2(floor(p));
  return float(ag_hash(uint(i.x + 1048576) * 0x9E3779B9u ^ ag_hash(uint(i.y + 1048576) + 0x632BE5ABu))) * (1.0 / 4294967296.0);
}
vec2 ag_h22(vec2 p) {
  ivec2 i = ivec2(floor(p));
  uint h = ag_hash(uint(i.x + 1048576) * 0x9E3779B9u ^ ag_hash(uint(i.y + 1048576) + 0x632BE5ABu));
  return vec2(float(h), float(ag_hash(h))) * (1.0 / 4294967296.0);
}
float ag_vnoise(vec2 p) {                  // value noise [0,1]
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = ag_h21(i), b = ag_h21(i + vec2(1, 0)), c = ag_h21(i + vec2(0, 1)), d = ag_h21(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
vec3 ag_vnoised(vec2 p) {                  // value noise + analytic derivative: (n, dn/dx, dn/dy)
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = ag_h21(i), b = ag_h21(i + vec2(1, 0)), c = ag_h21(i + vec2(0, 1)), d = ag_h21(i + vec2(1, 1));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(a + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
}
float ag_fbm(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * ag_vnoise(p); n += a; p = m * p + 3.7; a *= 0.5; }
  return s / n;
}
float ag_worley(vec2 p) {                  // F1 distance, cells of size 1
  vec2 i = floor(p), f = fract(p); float d = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 o = ag_h22(i + g);
    vec2 r = g + o - f; d = min(d, dot(r, r));
  }
  return sqrt(d);
}
`;
