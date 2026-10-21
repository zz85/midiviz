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
    composer.addPass(new OutputPass())
    if (withFx && (fx.grain.amount || fx.grain.vig)) {
      const g = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime: { value: fx.grain.time }, uAmount: { value: fx.grain.amount }, uVig: { value: fx.grain.vig } },
        ...fx.grainShader,
      })
      composer.addPass(g)
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
