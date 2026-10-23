// Experiment #045: the path tracers behind one call.
//
//   const r = await traceStill('mu-webgpu', { scene, camera, width, height, samples, bounces, exposure, denoise, onProgress, signal })
//   r.canvas   a 2D canvas holding the finished picture (AgX, the page's exposure)
//   r.times    { setup, firstSample, trace, denoise, total } in ms; r.samples; r.backend
// and for video, createTraceSession(): the same tracer kept across frames.
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
  const t0 = performance.now()
  const o = { samples: 256, bounces: 6, exposure: 1, denoise: false, toneMapping: 'agx', onProgress: () => {}, ...opts }
  const session = await createTraceSession(key, o)
  try {
    const r = await session.frame(o)
    if (session.times.init != null) r.times.init = session.times.init
    r.times.setup += session.times.create
    r.times.total = Math.round(performance.now() - t0)
    r.engine = key
    return r
  } finally { session.dispose() }
}

/**
 * One tracer kept for many frames (a video): its canvas, renderer / engine and
 * denoiser are made once; each frame() takes a fresh snapshot scene and
 * rebuilds the BVH for it.
 *   const s = await createTraceSession(key, { width, height, bounces, toneMapping, denoise })
 *   const r = await s.frame({ scene, camera, samples, exposure, onProgress, signal })   // r.canvas, r.times, r.samples
 *   s.dispose()
 */
export async function createTraceSession(key, opts) {
  if (!ENGINES[key]) throw new Error('unknown engine ' + key)
  const o = { bounces: 6, denoise: false, toneMapping: 'agx', ...opts }
  const t0 = performance.now()
  const make = { 'gpt-webgpu': gptWebGPU, 'gpt-webgl': gptWebGL, 'mu-webgpu': x => mutracer(x, 'webgpu'), 'mu-webgl': x => mutracer(x, 'webgl') }[key]
  const s = await make(o)
  s.times = { ...s.times, create: Math.round(performance.now() - t0) }
  s.engine = key
  const frame = s.frame
  s.frame = f => frame({ samples: 256, exposure: 1, onProgress: () => {}, ...f })
  return s
}

let ltcReady = false
// three-gpu-pathtracer WebGPU: tracer steps queued between waits for the GPU
const STEPS = 8
const toneOf = m => m === 'linear' ? THREE.NoToneMapping : THREE.AgXToneMapping

// ── three-gpu-pathtracer, WebGL ──────────────────────────────────────────
async function gptWebGL({ width, height, bounces, toneMapping }) {
  const { WebGLPathTracer } = await import(VENDOR + 'three-gpu-pathtracer/three-gpu-pathtracer.js')
  const canvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1); renderer.setSize(width, height, false)
  renderer.toneMapping = toneOf(toneMapping)
  const pt = new WebGLPathTracer(renderer)
  Object.assign(pt, { renderDelay: 0, fadeDuration: 0, minSamples: 0, dynamicLowRes: false, rasterizeScene: false, bounces, filterGlossyFactor: 0.5 })
  pt.tiles.set(2, 2)
  return {
    async frame({ scene, camera, samples, exposure, onProgress, signal }) {
      renderer.toneMappingExposure = exposure
      const times = {}
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
    },
    dispose() { pt.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.() },
  }
}

// ── three-gpu-pathtracer, WebGPU ─────────────────────────────────────────
async function gptWebGPU({ width, height, bounces, toneMapping, denoise }) {
  const TG = await import('three/webgpu')
  const { WebGPUPathTracer, OIDNDenoiser } = await import(VENDOR + 'three-gpu-pathtracer/webgpu.js')
  // (the tracer rasterises the scene too, for the denoiser's albedo and normal
  // buffers: three/webgpu draws the snapshot's area lights only with the LTC
  // tables loaded, else every frame logs "reading 'LTC_FLOAT_1'")
  if (!ltcReady) {
    const { RectAreaLightTexturesLib } = await import('three/addons/lights/RectAreaLightTexturesLib.js')
    TG.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
    ltcReady = true
  }
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const renderer = new TG.WebGPURenderer({ canvas, antialias: false })
  await renderer.init()
  if (!renderer.backend?.isWebGPUBackend) { renderer.dispose(); throw new Error('no WebGPU here (three/webgpu fell back to WebGL 2)') }
  renderer.setPixelRatio(1); renderer.setSize(width, height, false)
  renderer.toneMapping = toneOf(toneMapping)
  const pt = new WebGPUPathTracer(renderer)
  Object.assign(pt, { renderDelay: 0, fadeDuration: 0, minSamples: 0, dynamicLowRes: false, maxBounces: bounces })
  // frameBudget: path slots per renderSample() (the wavefront tracer's pool,
  // 250 000 by default, sized to keep an interactive page at 60 fps). Offline
  // there is no frame rate to keep: one slot per pixel, so a sample is one
  // step instead of ~8 at 1080p. The library caps the pool by its buffer
  // limit (~0.9 M slots, ~128 MB). ?ptbudget=<n> on the page overrides it.
  const want = +new URLSearchParams(location.search).get('ptbudget')
  pt.frameBudget = want > 0 ? want : width * height
  let den = null
  if (denoise) {
    const { initUNetFromURL } = await import(VENDOR + 'three-gpu-pathtracer/oidn-web.js')
    den = new OIDNDenoiser({ initUNetFromURL, auxWeightsUrl: VENDOR + 'mutracer/oidn/weights/rt_hdr_alb_nrm.tza' })
    pt.setDenoiser(den)
  }
  return {
    async frame({ scene, camera, samples, exposure, onProgress, signal }) {
      renderer.toneMappingExposure = exposure
      pt.maxSamples = samples
      const times = {}
      let t = performance.now()
      pt.setScene(scene, camera)
      times.setup = Math.round(performance.now() - t); t = performance.now()
      // Paced by the GPU, not the display: each renderSample() is one step of
      // the tracer's task (a tile or a wavefront pass, several per sample), and
      // waiting for an animation frame after each capped it at 60 steps a
      // second (16 spp at 1080p: ~2.5 s, whatever the GPU). Here a batch of
      // steps is queued, then we wait for the GPU to finish it; the page gets
      // a turn every ~50 ms. (pt.maxSamples stops the work at `samples`, so a
      // batch running past it costs only the present.)
      const device = renderer.backend.device, done = () => device.queue.onSubmittedWorkDone()
      const yieldUI = () => new Promise(r => setTimeout(r, 0))
      let got = 0, lastYield = performance.now()
      for (let i = 0; ; i++) {
        aborted(signal)
        pt.renderSample()
        // (the sample counts: every few steps)
        if (i % STEPS === STEPS - 1 || samples <= 4) {
          await done()
          const c = await pt.getSampleCountsAsync()
          got = c.min
          if (times.firstSample == null && got >= 1) times.firstSample = Math.round(performance.now() - t)
          onProgress({ samples: c.avg, of: samples, status: 'tracing' })
          if (got >= samples) break
          if (performance.now() - lastYield > 50) { await yieldUI(); lastYield = performance.now() }
        }
      }
      times.trace = Math.round(performance.now() - t); t = performance.now()
      if (den) {
        for (let i = 0; !den.complete; i++) {
          aborted(signal); pt.renderSample()
          if (i % 4 === 3) { await done(); onProgress({ samples, of: samples, status: 'denoising' }); await yieldUI() }
        }
        times.denoise = Math.round(performance.now() - t)
      }
      pt.renderSample()   // present, then copy in the same task
      const out = copyCanvas(canvas, width, height)
      return { canvas: out, samples: got, backend: 'webgpu', times }
    },
    dispose() { pt.dispose(); renderer.dispose() },
  }
}

// ── MuTracer ─────────────────────────────────────────────────────────────
async function mutracer({ width, height, bounces, toneMapping, denoise }, backend) {
  const MU = await import(VENDOR + 'mutracer/lib/mutracer.js')
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const engine = new MU.Engine({ canvas, backend })
  const errors = []
  engine.on('error', e => errors.push(e))
  let info, init, last = null
  try {
    const t = performance.now()
    info = await engine.init()
    init = Math.round(performance.now() - t)
  } catch (e) { engine.dispose(); throw e }
  engine.display.setSize(width, height)
  return {
    times: { init },
    async frame({ scene, camera, samples, exposure, onProgress, signal }) {
      const times = {}
      let t = performance.now()
      // MuTracer reads an equirect's first row as the zenith (theta = acos(y)), three.js
      // a DataTexture's first row as the nadir (v = asin(y) / pi + 0.5): hand it the rows
      // upside down, or the stage is lit from the floor
      const env = scene.environment
      if (env?.isDataTexture && !env.flipY) scene.environment = flipRows(env)
      let muScene
      try { muScene = MU.fromTHREEScene(scene, { convertLight: l => l.isSpotLight ? muSpot(MU, l) : undefined }) }
      finally { if (scene.environment !== env) { scene.environment.dispose(); scene.environment = env } }
      // the BVH, built in workers, ahead of the first update
      await engine.prepare(muScene)
      engine.scene = muScene
      engine.camera = MU.fromTHREECamera(camera)
      Object.assign(engine.display, { toneMapping, toneMappingExposure: exposure })
      last?.dispose?.()
      const render = last = new MU.Render(engine, { width, height, bounces, maxSamples: samples, allowMultipleSamplesPerFrame: true })
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
    },
    dispose() { try { last?.dispose?.() } catch { /* engine.dispose takes it */ } engine.dispose() },
  }
}

// MuTracer 0.1.3 fades a spot as smoothstep(cos(outer), cos(outer) + (1 − inner/outer), cos θ)
// (lightsUtil.js packs 1 − inner/outer, rayTraceCore's spot falloff adds it to the cosine),
// three.js as smoothstep(cos(outer), cos(inner), cos θ). Its own conversion sets
// inner = outer·(1 − penumbra), so a soft spot never reaches full strength: the stage's key
// light (angle 0.3, penumbra 0.8) peaks at about 1 %. Choosing inner so that 1 − inner/outer
// = cos(inner₃) − cos(outer) gives three's curve exactly.
function muSpot(MU, l) {
  const cosOuter = Math.cos(l.angle), cosInner = Math.cos(l.angle * (1 - l.penumbra))
  const outer = l.angle * 180 / Math.PI
  const light = new MU.SpotLight({
    color: l.color.toArray(), intensity: l.intensity, radius: l.userData.mutracerRadius ?? 0.01,
    outerAngle: outer, innerAngle: outer * (1 - Math.min(1, cosInner - cosOuter)),
  })
  light.transform = Array.from(light.transform)
  light.position = l.getWorldPosition(new THREE.Vector3()).toArray()
  light.lookAt(l.target.getWorldPosition(new THREE.Vector3()).toArray())
  return light
}

const flipped = new WeakMap()
function flipRows(tex) {
  if (flipped.has(tex)) return flipped.get(tex).clone()
  const { data, width: w, height: h } = tex.image, c = data.length / (w * h), out = new data.constructor(data.length)
  for (let j = 0; j < h; j++) out.set(data.subarray(j * w * c, (j + 1) * w * c), (h - 1 - j) * w * c)
  const t = new THREE.DataTexture(out, w, h, tex.format, tex.type)
  Object.assign(t, { mapping: tex.mapping, colorSpace: tex.colorSpace, minFilter: tex.minFilter, magFilter: tex.magFilter, generateMipmaps: false })
  t.needsUpdate = true
  flipped.set(tex, t)
  return t.clone()
}
