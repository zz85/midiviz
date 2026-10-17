// Module worker for the DDSP violin (#034): keeps TensorFlow.js inference off
// the main thread so the page and the audio scheduling stay smooth.
//   in:  { type: 'init', tfjs, url }  → out: { type: 'ready', backend, settings }
//   in:  { type: 'window', id, f0, ld } → out: { type: 'audio', id, y, ms }   (y transferred)
import { loadDDSP } from './ddsp.js'

let engine = null, tfMod = null
self.onmessage = async e => {
  const m = e.data
  try {
    if (m.type === 'init') {
      tfMod = await import(m.tfjs)
      let backend = 'webgl'
      try { if (!(await tfMod.setBackend('webgl'))) throw new Error('no webgl') } catch (err) { backend = 'cpu'; await tfMod.setBackend('cpu') }
      await tfMod.ready()
      engine = await loadDDSP(tfMod, m.url)
      const t0 = performance.now()
      await engine.window(new Float32Array(1250).fill(440), new Float32Array(1250).fill(-120))
      self.postMessage({ type: 'ready', backend: tfMod.getBackend(), settings: engine.settings, warmup: performance.now() - t0 })
    } else if (m.type === 'window') {
      const t0 = performance.now()
      const y = await engine.window(m.f0, m.ld)
      self.postMessage({ type: 'audio', id: m.id, y, ms: performance.now() - t0 }, [y.buffer])
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, message: err.message || String(err) })
  }
}
