// Skin shading: pre-integrated subsurface scattering (Penner and Borshukov,
// "Pre-Integrated Skin Shading", GPU Pro 2, 2011).
//
// Light that enters skin comes out again a few millimetres away, so the edge
// between lit and shadowed skin is soft and red where the surface curves
// tightly (the nose, lips, ears, fingers) and nearly Lambertian where it is
// flat (the cheek, the back). Each fragment's direct diffuse light is read from
// a table of the skin's diffusion profile integrated round a ring of the
// surface's radius, by the light's angle (N.L) and the surface's curvature.
//
// - The profile: d'Eon and Luebke's six Gaussians fitted to measured skin
//   ("Advanced Techniques for Realistic Real-Time Skin Rendering", GPU Gems 3,
//   ch. 14), variances in mm^2, weights per colour channel.
// - The curvature: computed once per vertex from the rest mesh (|dN|/|dP|
//   along its edges), in 1/cm, as the attribute `curvature`. Loop subdivision
//   (pianist/subdivide.js) carries it; a mesh without it reads 0, flat skin.
// - ?skinshade=plain|wrap|curve|sss chooses the mode (SKIN_SHADES below).
//
// Units: centimetres in the scene, millimetres in the profile.

import * as THREE from 'three'
import { tagTSL, untagTSL } from './tsl-tags.js'

// d'Eon and Luebke's skin profile: [variance mm^2, [r, g, b] weight]
const PROFILE = [
  [0.0064, [0.233, 0.455, 0.649]],
  [0.0484, [0.100, 0.336, 0.344]],
  [0.187, [0.118, 0.198, 0.0]],
  [0.567, [0.113, 0.007, 0.007]],
  [1.99, [0.358, 0.004, 0.0]],
  [7.41, [0.078, 0.0, 0.0]],
]
const R = (d, ch) => { let s = 0; for (const [v, w] of PROFILE) s += w[ch] * Math.exp(-d * d / (2 * v)) / (2 * Math.PI * v); return s }

// The profile's distances are measured skin's; SPREAD widens them 3x. At 1
// the soft edge is under a millimetre on this mesh's curvatures, and hardly
// shows (compared under a hard side light, 25 Nov 2026); ?skinspread= to try others
export const SPREAD = +(typeof location !== 'undefined' && new URLSearchParams(location.search).get('skinspread')) || 3

/** The table's curvature axis: 0 at v = 0 to CURV_MAX (1/cm, a 2.5 mm radius) at v = 1. */
export const CURV_MAX = 4

let lut = null
/** The pre-integrated table, N.L across (-1..1), curvature up (0..CURV_MAX), linear RGB. */
export function skinLUT(W = 128, H = 64) {
  if (lut) return lut
  const data = new Uint8Array(W * H * 4), STEPS = 256
  for (let y = 0; y < H; y++) {
    const c = (y + 0.5) / H * CURV_MAX, r = c > 1e-4 ? 10 / c / SPREAD : Infinity   // ring radius, mm (in the profile's units)
    for (let x = 0; x < W; x++) {
      const theta = Math.acos(THREE.MathUtils.clamp((x + 0.5) / W * 2 - 1, -1, 1))
      for (let ch = 0; ch < 3; ch++) {
        let num = 0, den = 0
        if (r === Infinity) { num = Math.max(0, Math.cos(theta)); den = 1 }
        else for (let i = 0; i < STEPS; i++) {
          const a = -Math.PI + (i + 0.5) / STEPS * 2 * Math.PI, w = R(Math.abs(2 * r * Math.sin(a / 2)), ch)
          num += Math.max(0, Math.cos(theta + a)) * w; den += w
        }
        // (stored as sqrt for 8 bits' precision in the shadows; squared in the shader)
        data[(y * W + x) * 4 + ch] = Math.round(Math.sqrt(num / den) * 255)
      }
      data[(y * W + x) * 4 + 3] = 255
    }
  }
  lut = new THREE.DataTexture(data, W, H, THREE.RGBAFormat)
  lut.magFilter = lut.minFilter = THREE.LinearFilter
  lut.wrapS = lut.wrapT = THREE.ClampToEdgeWrapping
  lut.needsUpdate = true
  return lut
}

/** Per-vertex curvature of g (1/cm), as the attribute `curvature`: the mean of
 * |dN|/|dP| over each vertex's edges, the copies along UV seams welded, and
 * one pass of smoothing. `index` is the whole index (a garment may hide part). */
export function addCurvature(g, index = g.index.array) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, NV = P.length / 3
  const wid = new Int32Array(NV), ids = new Map(); let W = 0
  for (let v = 0; v < NV; v++) { const k = `${Math.round(P[v * 3] * 200)},${Math.round(P[v * 3 + 1] * 200)},${Math.round(P[v * 3 + 2] * 200)}`; let w = ids.get(k); if (w === undefined) ids.set(k, w = W++); wid[v] = w }
  const sum = new Float32Array(W), cnt = new Float32Array(W), nb = Array.from({ length: W }, () => new Set())
  for (let t = 0; t < index.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = index[t + k], b = index[t + (k + 1) % 3], wa = wid[a], wb = wid[b]
    if (wa === wb || nb[wa].has(wb)) continue
    nb[wa].add(wb); nb[wb].add(wa)
    const dp = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2])
    if (dp < 1e-4) continue
    const dn = Math.hypot(N[a * 3] - N[b * 3], N[a * 3 + 1] - N[b * 3 + 1], N[a * 3 + 2] - N[b * 3 + 2])
    const c = dn / dp
    sum[wa] += c; cnt[wa]++; sum[wb] += c; cnt[wb]++
  }
  const c0 = sum.map((s, w) => (cnt[w] ? s / cnt[w] : 0)), c1 = new Float32Array(W)
  for (let w = 0; w < W; w++) { let s = c0[w] * 2, n = 2; for (const u of nb[w]) { s += c0[u]; n++ } c1[w] = s / n }
  const out = new Float32Array(NV)
  for (let v = 0; v < NV; v++) out[v] = c1[wid[v]]
  g.setAttribute('curvature', new THREE.BufferAttribute(out, 1))
  return out
}

/** The skin's shading modes: plain (three.js's Lambert), wrap (a wrapped,
 * red-shifted diffuse, the shading before 25 Nov 2026), curve (pre-integrated
 * by curvature, with soft red shadow edges), sss (curve, and blurred under
 * the skin on screen by pianist/skin-sss.js where the page runs it). */
export const SKIN_SHADES = ['plain', 'wrap', 'curve', 'sss']
export const skinShadeFromUrl = () => {
  const v = typeof location !== 'undefined' && new URLSearchParams(location.search).get('skinshade')
  return SKIN_SHADES.includes(v) ? v : 'curve'
}
/** Switch a skin material (useSkinWrap) to a mode; recompiles it. */
export function setSkinShading(material, mode) {
  const d = (material.defines ||= {})
  delete d.SKIN_WRAP; delete d.SKIN_PREINT
  if (mode === 'wrap') d.SKIN_WRAP = ''
  if (mode === 'curve' || mode === 'sss') d.SKIN_PREINT = ''
  untagTSL(material, 'skinWrap'); untagTSL(material, 'skinPreint')
  if (mode === 'wrap') tagTSL(material, 'skinWrap')
  if (d.SKIN_PREINT !== undefined) tagTSL(material, 'skinPreint', { lut: skinLUT() })
  material.userData.skinShade = mode
  material.needsUpdate = true
}

// The screen-space pass (pianist/skin-sss.js) draws the skin a second time
// with only its diffuse light, where the scene's depth shows the skin itself:
// these uniforms are shared by every skin material
export const SKIN_PASS = { value: 0 }, SKIN_SCENE_DEPTH = { value: null }, SKIN_RES = { value: new THREE.Vector2(1, 1) }

const WRAP = /* glsl */`
  {
    float nl = dot( geometryNormal, directLight.direction );
    vec3 w = vec3( 0.5, 0.24, 0.16 );
    vec3 wd = clamp( ( vec3( nl ) + w ) / ( 1.0 + w ), 0.0, 1.0 );
    wd *= wd * ( 3.0 - 2.0 * wd ) * 0.35 + 0.65;   // soften the falloff a little
    reflectedLight.directDiffuse += wd * directLight.color * BRDF_Lambert( material.diffuseColor );
  }
`
/** onBeforeCompile's work for a skin material: every mode, chosen by its defines. */
export function patchSkinShader(shader) {
  const lambert = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );'
  Object.assign(shader.uniforms, { skinLUT: { value: skinLUT() }, skinPass: SKIN_PASS, skinSceneDepth: SKIN_SCENE_DEPTH, skinRes: SKIN_RES })
  const direct = `#if defined( SKIN_PREINT )\n${SKIN_PREINT_DIRECT}\n#elif defined( SKIN_WRAP )\n${WRAP}\n#else\n  ${lambert}\n#endif\n`
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <lights_physical_pars_fragment>', SKIN_SHADOW_PARS + SKIN_PREINT_PARS + THREE.ShaderChunk.lights_physical_pars_fragment.replace(lambert, direct))
    .replace('#include <lights_fragment_begin>', skinShadowChunk(THREE.ShaderChunk.lights_fragment_begin))
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if ( skinPass > 0.5 && gl_FragCoord.z > texture2D( skinSceneDepth, gl_FragCoord.xy / skinRes ).r + 1e-5 ) discard;   // (behind what the scene shows)`)
    .replace('#include <opaque_fragment>', `if ( skinPass > 0.5 ) outgoingLight = totalDiffuse;   // (the diffuse light alone, for pianist/skin-sss.js)
#include <opaque_fragment>
  skinAlbedo = vec4( diffuseColor.rgb, 1.0 );   // (its second target: the colour the light is blurred under)`)
  shader.fragmentShader = 'uniform float skinPass;\nuniform sampler2D skinSceneDepth;\nuniform vec2 skinRes;\nlayout(location = 1) out highp vec4 skinAlbedo;\n' + shader.fragmentShader
  shader.vertexShader = SKIN_PREINT_VERTEX_PARS + shader.vertexShader.replace('#include <begin_vertex>', 'vSkinCurv = curvature;\n#include <begin_vertex>')
}

// Soft red shadow edges (Penner's penumbra scattering): light scatters under
// the skin into a cast shadow, red furthest, so across a shadow's penumbra the
// skin's diffuse takes the shadow's value s as s^SHADOW_EXP per channel: red
// rises first and blue last. The specular keeps the shadow as it is. The
// shadow test of each light (three.js lights_fragment_begin) keeps its value
// for the diffuse as skinTint, the factor over the plain shadow.
// Skin's shadows are also filtered SKIN_PENUMBRA shadow-map texels wider
// than the light's own (its PCF disc), since a hard edge has no penumbra for
// the tint to colour: a few millimetres at the stage's map sizes
export const SHADOW_EXP = [0.4, 0.8, 1.0]
export const SKIN_PENUMBRA = +(typeof location !== 'undefined' && new URLSearchParams(location.search).get('skinpenumbra')) || 2.5
export const SKIN_SHADOW_PARS = /* glsl */`
vec3 skinTint = vec3( 1.0 );
#ifdef SKIN_PREINT
#define SKIN_PENUMBRA ${SKIN_PENUMBRA.toFixed(2)}
#else
#define SKIN_PENUMBRA 0.0
#endif
vec3 skinShadow( float s ) {
#ifndef SKIN_PREINT
  return vec3( 1.0 );
#endif
  s = clamp( s, 0.0, 1.0 );
  return pow( vec3( s ), vec3( ${SHADOW_EXP.map(x => x.toFixed(2)).join(', ')} ) ) / max( s, 1e-3 );
}
`
/** lights_fragment_begin with each light's shadow kept for the skin's diffuse */
export function skinShadowChunk(chunk) {
  let n = 0
  const out = chunk.replace(/directLight\.color \*= (\( directLight\.visible && receiveShadow \) \? .*? : 1\.0);/g,
    (m, sh) => { n++; return `{ float skinSh = ${sh.replace(/(\w+)\.shadowRadius/g, '$1.shadowRadius + SKIN_PENUMBRA')}; directLight.color *= skinSh; skinTint = skinShadow( skinSh ); }` })
  if (!n) console.warn('skin: no shadow tests found in lights_fragment_begin')
  return out
}
// the GLSL: the direct diffuse of the physical model, from the table
export const SKIN_PREINT_PARS = /* glsl */`
uniform sampler2D skinLUT;
varying float vSkinCurv;
vec3 skinDiffuse( float nl ) {
  vec3 s = texture2D( skinLUT, vec2( nl * 0.5 + 0.5, clamp( vSkinCurv / ${CURV_MAX.toFixed(1)}, 0.0, 1.0 ) ) ).rgb;
  return s * s;
}
`
export const SKIN_PREINT_DIRECT = /* glsl */`
  reflectedLight.directDiffuse += skinDiffuse( dot( geometryNormal, directLight.direction ) ) * directLight.color * skinTint * BRDF_Lambert( material.diffuseColor );
  skinTint = vec3( 1.0 );
`
export const SKIN_PREINT_VERTEX_PARS = /* glsl */`
attribute float curvature;
varying float vSkinCurv;
`
