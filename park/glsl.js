// Shared GLSL: lighting uniforms, noise, wind, tree shadow lookup, cloud shadows, aerial perspective.
// Every scene material gets these uniforms by reference from `shared` (see makeShared()).
import * as THREE from 'three';

export function makeShared() {
  return {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uAmbient: { value: new THREE.Color(0.4, 0.5, 0.7) },
    uFogColor: { value: new THREE.Color(0.7, 0.8, 1) },
    uFogSunColor: { value: new THREE.Color(1, 0.9, 0.8) },
    uFogDensity: { value: 0.0009 },
    uWind: { value: new THREE.Vector2(1, 0.3) },
    uShadowMap: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uShadowOn: { value: 1 },
    uCloudCover: { value: 0.5 },
    uCloudShadow: { value: 0.5 },
    // cloud clock, separate from uTime so time-lapses can race the clouds
    uCloudT: { value: 0 },
    // 0 no snow … 1 snow everywhere (patchy in between, see snowAt)
    uSnowCover: { value: 0 },
  };
}

export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform float uFogDensity;
uniform vec2 uWind;
uniform float uCloudCover;
uniform float uCloudShadow;
uniform float uCloudT;
uniform float uSnowCover;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm3o(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s / .875; }

// Gust field: a slow noise pattern travelling downwind. 0..1
float gustAt(vec2 xz) {
  float ws = length(uWind) + 1e-4; vec2 wd = uWind / ws;
  vec2 p = xz * 0.045 - wd * uTime * (0.35 + ws * 0.25);
  return smoothstep(0.35, 0.85, fbm3o(p));
}
// Horizontal bend of a plant tip at xz (metres per metre of height)
vec2 windBend(vec2 xz, float seed) {
  float ws = length(uWind) + 1e-4; vec2 wd = uWind / ws;
  float g = gustAt(xz);
  float flutter = sin(uTime * (2.0 + ws) + seed * 6.283 + dot(xz, vec2(0.7, 0.4))) * 0.5 + 0.5;
  return wd * ws * (0.12 + 0.55 * g + 0.12 * flutter) + vec2(-wd.y, wd.x) * (flutter - 0.5) * 0.08 * ws;
}

// Moving cloud shadows on the ground (1 = sunlit)
float cloudShadowAt(vec3 wp) {
  vec2 p = wp.xz * 0.0035 + uWind * uCloudT * 0.0012 + vec2(3.1, 1.7);
  float n = fbm3o(p);
  float c = smoothstep(1.0 - uCloudCover * 0.9, 1.15 - uCloudCover * 0.9, n);
  return 1.0 - c * uCloudShadow;
}

// Snow lying at xz, 0..1. Drifts form and melt in patches, hollows last.
const vec3 SNOW = vec3(0.93, 0.95, 1.0);
float snowAt(vec2 xz) {
  float n = fbm3o(xz * 0.07) * 0.75 + vnoise(xz * 0.7) * 0.25;
  return smoothstep(n - 0.06, n + 0.06, uSnowCover * 1.3 - 0.15);
}

// Aerial perspective: exponential haze tinted toward the sun
vec3 applyFog(vec3 col, vec3 wp) {
  vec3 v = wp - cameraPosition; float d = length(v); vec3 vd = v / max(d, 1e-3);
  float f = 1.0 - exp(-d * uFogDensity);
  float hgt = exp(-max(wp.y, 0.0) * 0.0025);
  f *= mix(0.55, 1.0, hgt);
  float s = pow(max(dot(vd, uSunDir), 0.0), 6.0);
  return mix(col, mix(uFogColor, uFogSunColor, s), f);
}

// Two-tone cel lighting with a soft terminator. lit = 0..1 direct-light visibility.
vec3 celLight(vec3 albedo, float ndl, float shadow, float ao, float soft) {
  float lit = smoothstep(-soft, soft, ndl) * shadow;
  lit = mix(lit, smoothstep(0.35, 0.65, lit), 0.6);
  return albedo * (uAmbient * ao + uSunColor * lit);
}
`;

export const SHADOW = /* glsl */ `
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
float treeShadow(vec3 wp, float bias) {
  vec4 sc = uShadowMatrix * vec4(wp, 1.0);
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if (uShadowOn < 0.5 || c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    float d = texture2D(uShadowMap, c.xy + vec2(x, y) * texel * 1.6).r;
    s += step(c.z - bias, d);
  }
  return s / 9.0;
}
`;
