// Experiment #045: the path tracers behind one call.
//
//   const r = await traceStill('mu-webgpu', { scene, camera, width, height, samples, bounces, exposure, denoise, onProgress, signal })
//   r.canvas   a 2D canvas holding the finished picture (AgX, the page's exposure)
//   r.times    { setup, firstSample, trace, denoise, total } in ms; r.samples; r.backend
//
// Each run makes its own canvas, renderer / engine and BVH and disposes of
// them after, so the timings include building the acceleration structures
// (what a still costs), and runs never share GPU state with the page.
//
// Engines
//  gpt-webgpu  three-gpu-pathtracer's WebGPUPathTracer on three/webgpu (r185)
//  gpt-webgl   three-gpu-pathtracer's WebGLPathTracer (deprecated upstream)
//  mu-webgpu   MuTracer on WebGPU
//  mu-webgl    MuTracer's WebGL 2 fallback

import * as THREE from 'three'

const VENDOR = new URL('../vendor/', import.meta.url).href
export const ENGINES = {
  'gpt-webgpu': { label: 'three-gpu-pathtracer · WebGPU', short: 'gpt WebGPU', webgpu: true, denoiser: 'OIDN' },
  'gpt-webgl': { label: 'three-gpu-pathtracer · WebGL (deprecated)', short: 'gpt WebGL', webgpu: false, denoiser: null },
  'mu-webgpu': { label: 'MuTracer · WebGPU', short: 'MuTracer WebGPU', webgpu: true, denoiser: 'OIDN' },
  'mu-webgl': { label: 'MuTracer · WebGL 2', short: 'MuTracer WebGL', webgpu: false, denoiser: 'JNLM' },
}
export const hasWebGPU = async () => { try { return !!(navigator.gpu && await navigator.gpu.requestAdapter()) } catch { return false } }

const frame = () => new Promise(r => requestAnimationFrame(() => r()))
// (CPU-backed, so the picture survives a GPU reset)
const copyCanvas = (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0, w, h); return c }
function aborted(signal) { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError') }

export async function traceStill(key, opts) {
  if (!ENGINES[key]) throw new Error('unknown engine ' + key)
  const run = { 'gpt-webgpu': gptWebGPU, 'gpt-webgl': gptWebGL, 'mu-webgpu': o => mutracer(o, 'webgpu'), 'mu-webgl': o => mutracer(o, 'webgl') }[key]
  const t0 = performance.now()
  const r = await run({ samples: 256, bounces: 6, exposure: 1, denoise: false, toneMapping: 'agx', onProgress: () => {}, ...opts })
  r.times.total = Math.round(performance.now() - t0)
  r.engine = key
  return r
}

// ── three-gpu-pathtracer, WebGL ──────────────────────────────────────────
async function gptWebGL({ scene, camera, width, height, samples, bounces, exposure, toneMapping, onProgress, signal }) {
  const { WebGLPathTracer } = await import(VENDOR + 'three-gpu-pathtracer/three-gpu-pathtracer.js')
  const canvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1); renderer.setSize(width, height, false)
  renderer.toneMapping = toneMapping === 'linear' ? THREE.NoToneMapping : THREE.AgXToneMapping; renderer.toneMappingExposure = exposure
  const pt = new WebGLPathTracer(renderer)
  Object.assign(pt, { renderDelay: 0, fadeDuration: 0, minSamples: 0, dynamicLowRes: false, rasterizeScene: false, bounces, filterGlossyFactor: 0.5 })
  pt.tiles.set(2, 2)
  const times = {}
  try {
    let t = performance.now()
    pt.setScene(scene, camera)
    times.setup = Math.round(performance.now() - t); t = performance.now()
    while (pt.samples < samples) {
      aborted(signal)
      pt.renderSample()
      if (times.firstSample == null && pt.samples >= 1) times.firstSample = Math.round(performance.now() - t)
      onProgress({ samples: pt.samples, of: samples, status: pt.isCompiling ? 'compiling' : 'tracing' })
      await frame()
    }
    // (reading the canvas back waits for the GPU to finish)
    const out = copyCanvas(canvas, width, height)
    times.trace = Math.round(performance.now() - t)
    return { canvas: out, samples: pt.samples, backend: 'webgl', times }
  } finally { pt.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.() }
}

// ── three-gpu-pathtracer, WebGPU ─────────────────────────────────────────
async function gptWebGPU({ scene, camera, width, height, samples, bounces, exposure, toneMapping, denoise, onProgress, signal }) {
  const TG = await import('three/webgpu')
  const { WebGPUPathTracer, OIDNDenoiser } = await import(VENDOR + 'three-gpu-pathtracer/webgpu.js')
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const renderer = new TG.WebGPURenderer({ canvas, antialias: false })
  await renderer.init()
  if (!renderer.backend?.isWebGPUBackend) { renderer.dispose(); throw new Error('no WebGPU here (three/webgpu fell back to WebGL 2)') }
  renderer.setPixelRatio(1); renderer.setSize(width, height, false)
  renderer.toneMapping = toneMapping === 'linear' ? THREE.NoToneMapping : THREE.AgXToneMapping; renderer.toneMappingExposure = exposure
  const pt = new WebGPUPathTracer(renderer)
  Object.assign(pt, { renderDelay: 0, fadeDuration: 0, minSamples: 0, dynamicLowRes: false, maxBounces: bounces, maxSamples: samples })
  let den = null
  if (denoise) {
    const { initUNetFromURL } = await import(VENDOR + 'three-gpu-pathtracer/oidn-web.js')
    den = new OIDNDenoiser({ initUNetFromURL, auxWeightsUrl: VENDOR + 'mutracer/oidn/weights/rt_hdr_alb_nrm.tza' })
    pt.setDenoiser(den)
  }
  const times = {}
  try {
    let t = performance.now()
    pt.setScene(scene, camera)
    times.setup = Math.round(performance.now() - t); t = performance.now()
    let got = 0
    for (let i = 0; ; i++) {
      aborted(signal)
      pt.renderSample()
      // (the sample counts are a GPU readback: every few frames)
      if (i % 8 === 7 || got >= samples) {
        const c = await pt.getSampleCountsAsync()
        got = c.min
        if (times.firstSample == null && got >= 1) times.firstSample = Math.round(performance.now() - t)
        onProgress({ samples: c.avg, of: samples, status: 'tracing' })
        if (got >= samples) break
      }
      await frame()
    }
    times.trace = Math.round(performance.now() - t); t = performance.now()
    if (den) {
      while (!den.complete) { aborted(signal); pt.renderSample(); onProgress({ samples, of: samples, status: 'denoising' }); await frame() }
      times.denoise = Math.round(performance.now() - t)
    }
    pt.renderSample()   // present, then copy in the same task
    const out = copyCanvas(canvas, width, height)
    return { canvas: out, samples: got, backend: 'webgpu', times }
  } finally { pt.dispose(); renderer.dispose() }
}

// ── MuTracer ─────────────────────────────────────────────────────────────
async function mutracer({ scene, camera, width, height, samples, bounces, exposure, toneMapping, denoise, onProgress, signal }, backend) {
  const MU = await import(VENDOR + 'mutracer/lib/mutracer.js')
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const engine = new MU.Engine({ canvas, backend })
  const errors = []
  engine.on('error', e => errors.push(e))
  const times = {}
  try {
    let t = performance.now()
    const info = await engine.init()
    times.init = Math.round(performance.now() - t); t = performance.now()
    const muScene = MU.fromTHREEScene(scene)
    // the BVH, built in workers, ahead of the first update
    await engine.prepare(muScene)
    engine.scene = muScene
    engine.camera = MU.fromTHREECamera(camera)
    Object.assign(engine.display, { toneMapping, toneMappingExposure: exposure })
    engine.display.setSize(width, height)
    const render = new MU.Render(engine, { width, height, bounces, maxSamples: samples, allowMultipleSamplesPerFrame: true })
    if (denoise) await render.setDenoiser(info.backend === 'webgpu' ? { type: 'oidn', model: 'standard' } : { type: 'jnlm' })
    engine.update()
    times.setup = Math.round(performance.now() - t); t = performance.now()
    let tracedAt = 0, out = null
    for (;;) {
      aborted(signal)
      if (errors.length) throw errors[0]
      const st = render.refine()
      engine.display.present(render)
      if (times.firstSample == null && render.samples >= 1) times.firstSample = Math.round(performance.now() - t)
      if (!tracedAt && render.samples >= samples) tracedAt = performance.now()
      onProgress({ samples: render.samples, of: samples, status: st })
      // the canvas copied in the same task as its last present (display.toBlob
      // re-composes the picture: minutes on a software GPU)
      if (st === 'finished') { out = copyCanvas(engine.display.canvas, width, height); if (errors.length) throw errors[0]; break }
      if (st === 'error') throw errors[0] || new Error('MuTracer: render error')
      await frame()
    }
    times.trace = Math.round((tracedAt || performance.now()) - t)
    if (denoise) times.denoise = Math.round(performance.now() - (tracedAt || performance.now()))
    return { canvas: out, samples: render.samples, backend: info.backend, times }
  } finally { engine.dispose() }
}
