// onnxruntime-web in a module worker, one model per worker, so inference never
// blocks the page.
//
//   { type: 'init', model, ort, wasmPaths, base, ep, threads, simd }
//       → { type: 'ready', model, ep, threads, crossOriginIsolated, loadMs, warmMs, version }
//
// Basic Pitch (activations come back, notes are decoded on the page so the
// threshold sliders are instant):
//   { type: 'run', id, windows (n * 43844 samples at 22 050 Hz), count, batch }
//       → { type: 'result', id, note, onset, contour, count, ms }        (buffers transferred)
//
// Transkun (the 90 x T x T interval scores stay here; notes come back):
//   { type: 'transkun', id, audio (44 100 Hz mono), segSec, stepSec }
//       → { type: 'progress', id, done, count, notes, pedals, timing } per 16 s segment
//       → { type: 'result', id, notes, pedals, timing, segments, ms }
//
// errors → { type: 'error', id?, message }

let ort, model, sessions = {}, mod

const FILES = {
  'basic-pitch': { main: 'basic-pitch-nmp.onnx' },
  transkun: { core: 'transkun-core.onnx', attr: 'transkun-attr.onnx' },
}

async function session(url, ep) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  const opts = { executionProviders: [ep], graphOptimizationLevel: 'all' }
  if (ep === 'webgpu') opts.preferredOutputLocation = 'cpu'
  return ort.InferenceSession.create(bytes, opts)
}

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === 'init') {
      const t0 = performance.now()
      model = m.model
      ort = await import(m.ort)
      ort.env.wasm.wasmPaths = m.wasmPaths
      ort.env.wasm.numThreads = m.threads
      if (m.simd === false) ort.env.wasm.simd = false
      for (const [k, f] of Object.entries(FILES[model])) sessions[k] = await session(new URL(f, m.base).href, m.ep)
      const loadMs = performance.now() - t0
      // warm-up: the first run compiles kernels / allocates the arena
      const t1 = performance.now()
      if (model === 'basic-pitch') {
        mod = await import('./basic-pitch.js')
        await sessions.main.run({ [mod.ONNX_IO.input]: new ort.Tensor('float32', new Float32Array(mod.WINDOW), [1, mod.WINDOW, 1]) })
      } else {
        mod = await import('./transkun.js')
        const T = 32
        await sessions.core.run({ features: new ort.Tensor('float32', new Float32Array(T * mod.N_MELS * mod.N_CH), [1, T, mod.N_MELS, mod.N_CH]) })
        await sessions.attr.run({ x: new ort.Tensor('float32', new Float32Array(768), [1, 768]) })
      }
      self.postMessage({
        type: 'ready', model, ep: m.ep, threads: ort.env.wasm.numThreads,
        crossOriginIsolated: self.crossOriginIsolated, loadMs, warmMs: performance.now() - t1,
        version: ort.env.versions?.web || '',
      })
    } else if (m.type === 'run') {
      const IO = mod.ONNX_IO, WINDOW = mod.WINDOW
      const t0 = performance.now()
      const batch = Math.max(1, m.batch || 1)
      const outs = { note: [], onset: [], contour: [] }
      for (let w = 0; w < m.count; w += batch) {
        const n = Math.min(batch, m.count - w)
        const x = new ort.Tensor('float32', m.windows.subarray(w * WINDOW, (w + n) * WINDOW), [n, WINDOW, 1])
        const r = await sessions.main.run({ [IO.input]: x })
        outs.note.push(r[IO.note].data); outs.onset.push(r[IO.onset].data); outs.contour.push(r[IO.contour].data)
        if (m.count > batch) self.postMessage({ type: 'progress', id: m.id, done: w + n, count: m.count })
      }
      const cat = a => { const o = new Float32Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length } return o }
      const note = cat(outs.note), onset = cat(outs.onset), contour = cat(outs.contour)
      self.postMessage({ type: 'result', id: m.id, note, onset, contour, count: m.count, ms: performance.now() - t0 },
        [note.buffer, onset.buffer, contour.buffer])
    } else if (m.type === 'transkun') {
      const t0 = performance.now()
      const runCore = async (f, T) => {
        const r = await sessions.core.run({ features: new ort.Tensor('float32', f, [1, T, mod.N_MELS, mod.N_CH]) })
        return { scores: r.scores.data, ctx: r.ctx.data }
      }
      const runAttr = async (x, N) => {
        const r = await sessions.attr.run({ x: new ort.Tensor('float32', x, [N, 768]) })
        return { velocity: r.velocity.data, refine: r.refine.data, presence: r.presence.data }
      }
      const res = await mod.transcribe(m.audio, runCore, runAttr, {
        segSec: m.segSec, stepSec: m.stepSec,
        onSegment: s => self.postMessage({ type: 'progress', id: m.id, done: s.index + 1, count: s.count, notes: s.notes, pedals: s.pedals, timing: s.timing }),
      })
      self.postMessage({ type: 'result', id: m.id, ...res, ms: performance.now() - t0 })
    }
  } catch (e) {
    self.postMessage({ type: 'error', id: m.id, message: e?.message || String(e) })
  }
}
