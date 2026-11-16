// Experiment #045: the page's own effects (bloom, AgX, grain and vignette) on a
// path-traced still.
//
// The tracers hand back an 8-bit canvas, so for this they render with no tone
// mapping at exposure 1 / HDR_SCALE: the canvas then holds the scene's linear
// light (sRGB-encoded) up to HDR_SCALE, where the page's bloom threshold
// (0.92) and its highlights live. Here it is decoded back to linear, scaled up
// and run through the same chain as the page's composer, in the same order:
// bloom on linear light, then AgX at the page's exposure (OutputPass), then
// grain and vignette on the display picture. Depth of field is not applied
// (a tracer would do that with its camera) and the dust motes are not traced.
//
// The cost of the 8-bit capture: below about 1/500 of the clip level the
// steps get coarse (deep shadows can band), and light above HDR_SCALE clips.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

export const HDR_SCALE = 8

const LUT = new Float32Array(256)

// The selected WebGPU looks use ACES. Path tracers return linear light, so a
// selected cinematic grade can run here after bloom with the same operations
// as grade-gpu.js. The neutral Stage look keeps OutputPass's exact AgX path.
const CINEMATIC_GRADE = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2() }, uExposure: { value: 1 }, uCurve: { value: 2 },
    uContrast: { value: 1 }, uSaturation: { value: 1 }, uAccent: { value: 0 }, uWarmth: { value: 0 }, uRolloff: { value: 0 }, uFade: { value: 0 },
    uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    uShadowTint: { value: new THREE.Vector3(1, 1, 1) }, uHighlightTint: { value: new THREE.Vector3(1, 1, 1) }, uBlackTint: { value: new THREE.Vector3() },
    uAberration: { value: 0 }, uStreaks: { value: 0 }, uStreakThreshold: { value: 1.2 }, uVignette: { value: 0 }, uGrain: { value: 0 }, uTime: { value: 0 }, uLetterbox: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uExposure, uCurve, uContrast, uSaturation, uAccent, uWarmth, uRolloff, uFade;
    uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighlightTint, uBlackTint;
    uniform float uAberration, uStreaks, uStreakThreshold, uVignette, uGrain, uTime, uLetterbox; varying vec2 vUv;
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    vec3 fit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.432951) + 0.238081; return a / b; }
    vec3 aces(vec3 c) { mat3 A = mat3(0.59719,0.076,0.0284, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777); mat3 B = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602); return clamp(B * fit(A * c), 0.0, 1.0); }
    vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    float noise(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    void main() {
      vec2 d = vUv - 0.5; float aspect = uRes.x / uRes.y; float r2 = dot(d * vec2(aspect, 1.0), d * vec2(aspect, 1.0)); vec2 ca = d * uAberration * r2;
      vec3 c = vec3(texture2D(tDiffuse, vUv - ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + ca).b);
      if (uStreaks > 0.0) { vec3 streak = vec3(0.0); float weights = 0.0; for (int i = -12; i <= 12; i++) { float x = float(i), w = exp(-abs(x) * 0.18); vec3 s = texture2D(tDiffuse, vUv + vec2(x * 5.0 / uRes.x, 0.0)).rgb; float l = dot(s, LUMA); streak += s * max(l - uStreakThreshold, 0.0) / max(l, 1e-4) * w; weights += w; } c += streak / weights * vec3(0.75, 0.9, 1.25) * uStreaks; }
      c *= uExposure * vec3(1.0 + uWarmth * 0.12, 1.0 + uWarmth * 0.015, 1.0 - uWarmth * 0.12);
      c /= 1.0 + uRolloff * max(dot(c, LUMA) - 0.35, 0.0); c = uCurve > 1.5 ? aces(c) : clamp(c, 0.0, 1.0); c = c * uGain + uLift * (1.0 - c); c = pow(max(c, 0.0), 1.0 / uGamma);
      c *= mix(uShadowTint, uHighlightTint, smoothstep(0.05, 0.7, dot(c, LUMA))); float l = dot(c, LUMA); vec3 chroma = c - vec3(l);
      float cyan = smoothstep(0.55, 0.85, dot(chroma / max(length(chroma), 1e-5), vec3(-0.85, 0.3, 0.43))) * smoothstep(0.015, 0.06, length(chroma));
      c = max(mix(vec3(l), c, max(uSaturation, uAccent * cyan * 1.2)), 0.0); vec3 s = srgb(clamp(c, 0.0, 1.0)); s = clamp((s - 0.5) * uContrast + 0.5, 0.0, 1.0);
      float sl = dot(s, vec3(0.333)); s += uBlackTint * pow(1.0 - sl, 5.0); s = s * (1.0 - 0.13 * uFade) + vec3(0.095, 0.08, 0.065) * uFade;
      s *= 1.0 - uVignette * dot(d, d) * 1.6; float g = noise(floor(vUv * uRes) + uTime * 17.31) - 0.5; s += g * uGrain;
      float bar = max(0.0, 0.5 * (1.0 - aspect / max(uLetterbox, 0.001))); if (uLetterbox > 0.0 && (vUv.y < bar || vUv.y > 1.0 - bar)) s = vec3(0.0);
      gl_FragColor = vec4(s, 1.0);
    }`,
}
for (let i = 0; i < 256; i++) { const c = i / 255; LUT[i] = (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * HDR_SCALE }

let gl = null   // one renderer for every still (software WebGL runs out of contexts)

/**
 * hdr: the tracer's canvas (linear, sRGB-encoded, exposure 1 / HDR_SCALE)
 * fx: { exposure, bloom: { strength, radius, threshold } | null, grain: { amount, vig, time }, grainShader: { vertexShader, fragmentShader } }
 * returns { fx: canvas with the effects, plain: canvas with AgX only, stats: { clipped (fraction of pixels at the ceiling), mean (linear luminance) } }
 */
export function finishTrace(hdr, fx) {
  const w = hdr.width, h = hdr.height
  const src = hdr.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  const lin = new Float32Array(w * h * 4)
  // (canvas rows run top-down, a DataTexture's bottom-up)
  for (let y = 0; y < h; y++) {
    const s = y * w * 4, d = (h - 1 - y) * w * 4
    for (let x = 0; x < w * 4; x += 4) {
      lin[d + x] = LUT[src[s + x]]; lin[d + x + 1] = LUT[src[s + x + 1]]; lin[d + x + 2] = LUT[src[s + x + 2]]; lin[d + x + 3] = 1
    }
  }
  // how much of the picture sits at the capture's ceiling, and the average light
  let clipped = 0, sum = 0
  for (let i = 0; i < src.length; i += 4) { if (src[i] === 255 || src[i + 1] === 255 || src[i + 2] === 255) clipped++; sum += 0.2126 * LUT[src[i]] + 0.7152 * LUT[src[i + 1]] + 0.0722 * LUT[src[i + 2]] }
  const stats = { clipped: clipped / (w * h), mean: sum / (w * h) }
  const tex = new THREE.DataTexture(lin, w, h, THREE.RGBAFormat, THREE.FloatType)
  tex.colorSpace = THREE.LinearSRGBColorSpace; tex.needsUpdate = true

  gl ||= new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: false, preserveDrawingBuffer: true })
  gl.setPixelRatio(1); gl.setSize(w, h, false)
  gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = fx.exposure
  const copy = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(gl.domElement, 0, 0); return c }

  const run = withFx => {
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType })
    const composer = new EffectComposer(gl, rt)
    composer.setPixelRatio(1); composer.setSize(w, h)
    composer.addPass(new TexturePass(tex))
    if (withFx && fx.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), fx.bloom.strength, fx.bloom.radius, fx.bloom.threshold))
    const cinematic = withFx && fx.grade && fx.grade.id !== 'stage'
    if (cinematic) {
      const grade = fx.grade, pass = new ShaderPass(CINEMATIC_GRADE), u = pass.uniforms
      u.uRes.value.set(w, h); u.uExposure.value = fx.exposure; u.uCurve.value = grade.curve === 'aces' ? 2 : 0
      for (const key of ['contrast', 'saturation', 'accent', 'warmth', 'rolloff', 'fade', 'aberration', 'streaks', 'streakThreshold', 'letterbox']) u['u' + key[0].toUpperCase() + key.slice(1)].value = grade[key] ?? CINEMATIC_GRADE.uniforms['u' + key[0].toUpperCase() + key.slice(1)].value
      for (const key of ['lift', 'gamma', 'gain', 'shadowTint', 'highlightTint', 'blackTint']) u['u' + key[0].toUpperCase() + key.slice(1)].value.fromArray(grade[key])
      u.uVignette.value = fx.grain.vig * (grade.vignette ?? 1); u.uGrain.value = fx.grain.amount * (grade.grain ?? 1); u.uTime.value = fx.grain.time
      pass.material.toneMapped = false; composer.addPass(pass)
    } else {
      composer.addPass(new OutputPass())
      if (withFx && (fx.grain.amount || fx.grain.vig)) {
        const g = new ShaderPass({
          uniforms: { tDiffuse: { value: null }, uTime: { value: fx.grain.time }, uAmount: { value: fx.grain.amount }, uVig: { value: fx.grain.vig }, uRes: { value: new THREE.Vector2(w, h) } },
          ...fx.grainShader,
        })
        composer.addPass(g)
      }
    }
    composer.render()
    const out = copy()
    for (const p of composer.passes) p.dispose?.()
    composer.dispose(); rt.dispose()
    return out
  }
  try { return { fx: run(true), plain: run(false), stats } }
  finally { tex.dispose() }
}
