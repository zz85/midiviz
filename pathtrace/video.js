// Experiment #045: path-traced frames for the video export.
//
// notation3d/video-export.js asks for each picture through o.frameSource after
// the page has stepped to that frame's song time (body, hands, keys, hair,
// director camera). This snapshots that moment, traces it with one tracer kept
// for the whole export (createTraceSession), and optionally runs the page's
// effects on it (post.js). The scene and BVH are rebuilt every frame: simple,
// and the cost is printed per frame so it can be judged before optimising.
// Each frame's copy is freed after it is traced (disposeSnapshot), and the
// tracer itself is replaced every RECYCLE frames.
//
//   const pt = pathTracedFrames(stage, { engine, samples, bounces, denoise, hairFraction, fx, width, height, signal })
//   exportVideo({ ..., frameSource: pt.frame })   then   pt.dispose()
//
// stage: the same adapter as still.js (scene, camera, hair(), envScene,
// envIntensity, fx()), plus liveExposure(): the exposure the page draws this
// frame with (the director's fades included).

import { snapshotScene, snapshotCamera, bakeEnvironment, disposeSnapshot } from './snapshot.js'
import { createTraceSession } from './engines.js'
import { finishTrace, HDR_SCALE } from './post.js'

// a new tracer (renderer, pipelines) every this many frames: whatever a
// tracer keeps from one setScene to the next is then freed with it
const RECYCLE = 24

export function pathTracedFrames(stage, o) {
  const { engine, width, height, samples, bounces, denoise, hairFraction = 0.5, fx = false, signal } = o
  let session = null, env = null, used = 0
  const stats = { frames: 0, ms: 0, last: null }

  async function frame() {
    const t0 = performance.now()
    if (session && used >= RECYCLE) { session.dispose(); session = null }
    if (!session) { session = await createTraceSession(engine, { width, height, bounces, denoise, toneMapping: fx ? 'linear' : 'agx' }); used = 0 }
    used++
    env ||= stage.envScene ? bakeEnvironment(stage.envScene, { intensity: stage.envIntensity }) : null
    const camera = snapshotCamera(stage.camera, width / height)
    const snap = snapshotScene(stage.scene, { camera, hair: stage.hair(), envMap: env, hairFraction })
    const exposure = stage.liveExposure()
    try {
      const r = await session.frame({ scene: snap.scene, camera, samples, exposure: fx ? 1 / HDR_SCALE : exposure, signal })
      const out = fx ? finishTrace(r.canvas, { ...stage.fx(), exposure }).fx : r.canvas
      const ms = performance.now() - t0
      stats.frames++; stats.ms += ms
      stats.last = { ms: Math.round(ms), snapshot: snap.stats.ms, setup: r.times.setup, trace: r.times.trace, denoise: r.times.denoise }
      // (Chrome: the JS heap, to see whether it still grows frame by frame)
      const mem = performance.memory
      console.log(`[pt video] frame ${stats.frames}: ${(ms / 1000).toFixed(1)} s (snapshot ${snap.stats.ms} ms, scene ${r.times.setup} ms, trace ${r.times.trace} ms)` + (mem ? ` · JS heap ${(mem.usedJSHeapSize / 2 ** 20).toFixed(0)} MB of ${(mem.jsHeapSizeLimit / 2 ** 20).toFixed(0)} MB` : ''))
      o.onFrame?.(stats)
      return out
    } finally {
      disposeSnapshot(snap)
    }
  }
  return { frame, stats, dispose() { session?.dispose(); session = null } }
}
