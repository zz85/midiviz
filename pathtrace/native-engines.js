// Experiment #045: the native renderers as engines of engines.js, inside the desktop app.
//   mu-native  MuTracer's native SDK (Rust on wgpu: Metal, Vulkan or DX12), ray queries where the GPU has them
//   rt-native  ThreeRT (meshy-dev/ThreeRT, Rust on wgpu), ray queries where the GPU has them
// Both trace the scene native-scene.js encodes: MuTracer's own conversion of the page's snapshot, the one the
// mu-webgpu / mu-webgl engines trace. A page can't start a program, so pathtrace/desktop's preload gives it
// window.midivizNative, and the app's main process runs the renderer and hands the PNG back (desktop/native.cjs).
// A session has the interface of engines.js's others (frame / dispose / times), so stills (still.js) and
// videos (video.js) take them as they are.
import { encodeScene } from './native-scene.js'

export const nativeBridge = () => globalThis.midivizNative || null

export async function nativeSession(key, { width, height, bounces, toneMapping, denoise }, { VENDOR, muLens }) {
  const bridge = nativeBridge()
  if (!bridge) throw new Error(`${key} runs in the desktop app only (node pathtrace/desktop/run.mjs)`)
  const MU = await import(VENDOR + 'mutracer/lib/mutracer.js')
  return {
    times: {},
    async frame({ scene, camera, samples, exposure, onProgress, signal, dof = null }) {
      const times = {}
      let t = performance.now()
      // (the camera and lens as the page's MuTracer engines take them: engines.js)
      const cam = MU.fromTHREECamera(camera, muLens(camera, dof))
      const { manifest, buffer, stats } = await encodeScene(MU, scene, cam, { width, height, exposure, toneMapping })
      times.encode = Math.round(performance.now() - t)
      onProgress({ samples: 0, of: samples, status: 'tracing natively' })
      const cancel = () => bridge.cancel(key)
      signal?.addEventListener('abort', cancel)
      let r
      const sent = performance.now()
      try { r = await bridge.render(key, manifest, buffer, { samples, bounces, width, height, denoise }) }
      finally { signal?.removeEventListener('abort', cancel) }
      const ipc = performance.now() - sent - r.report.wall
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      const rep = r.report, T = rep.timings
      t = performance.now()
      const bmp = await createImageBitmap(new Blob([r.png], { type: 'image/png' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
      const canvas = document.createElement('canvas'); canvas.width = bmp.width; canvas.height = bmp.height
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0); bmp.close()
      // setup: the page's conversion, the hand-over to the app, the native scene and device; trace: the GPU's
      // work from the first sample to the last, as the renderer timed it (GPU-fenced)
      times.setup = Math.round(times.encode + ipc + T.files + T.scene + T.setup)
      times.firstSample = T.firstSample
      times.trace = T.trace
      if (T.denoise != null) times.denoise = T.denoise
      times.readback = Math.round(T.encode + performance.now() - t)
      onProgress({ samples, of: samples, status: 'finished' })
      return { canvas, samples: rep.samples, backend: `${rep.adapter}, ${rep.hwrt ? 'ray queries' : 'own BVH'}`, times, native: { ...rep, scene: stats } }
    },
    dispose() {},
  }
}
