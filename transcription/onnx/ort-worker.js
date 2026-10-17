// Runs the Basic Pitch ONNX model with onnxruntime-web in a module worker, so
// inference never blocks the page. One message in, one out:
//   { type: 'init', ort, wasmPaths, model, ep, threads, simd }
//       → { type: 'ready', ep, threads, crossOriginIsolated, loadMs, warmMs }
//   { type: 'run', id, windows (Float32Array, n * 43844), count, batch }
//       → { type: 'result', id, note, onset, contour, count, ms }   (buffers transferred)
//   errors → { type: 'error', id?, message }

let ort, session, IO, WINDOW

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === 'init') {
      const t0 = performance.now()
      ;({ ONNX_IO: IO, WINDOW } = await import('./basic-pitch.js'))
      ort = await import(m.ort)
      ort.env.wasm.wasmPaths = m.wasmPaths
      ort.env.wasm.numThreads = m.threads
      if (m.simd === false) ort.env.wasm.simd = false
      const bytes = new Uint8Array(await (await fetch(m.model)).arrayBuffer())
      const opts = { executionProviders: [m.ep], graphOptimizationLevel: 'all' }
      if (m.ep === 'webgpu') opts.preferredOutputLocation = 'cpu'
      session = await ort.InferenceSession.create(bytes, opts)
      const loadMs = performance.now() - t0
      // warm-up: the first run compiles kernels / allocates the arena
      const t1 = performance.now()
      await session.run({ [IO.input]: new ort.Tensor('float32', new Float32Array(WINDOW), [1, WINDOW, 1]) })
      self.postMessage({
        type: 'ready', ep: m.ep, threads: ort.env.wasm.numThreads,
        crossOriginIsolated: self.crossOriginIsolated, loadMs, warmMs: performance.now() - t1,
        version: ort.env.versions?.web || '',
      })
    } else if (m.type === 'run') {
      const t0 = performance.now()
      const batch = Math.max(1, m.batch || 1)
      const outs = { note: [], onset: [], contour: [] }
      for (let w = 0; w < m.count; w += batch) {
        const n = Math.min(batch, m.count - w)
        const x = new ort.Tensor('float32', m.windows.subarray(w * WINDOW, (w + n) * WINDOW), [n, WINDOW, 1])
        const r = await session.run({ [IO.input]: x })
        outs.note.push(r[IO.note].data); outs.onset.push(r[IO.onset].data); outs.contour.push(r[IO.contour].data)
        if (m.count > batch) self.postMessage({ type: 'progress', id: m.id, done: w + n, count: m.count })
      }
      const cat = a => { const o = new Float32Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length } return o }
      const note = cat(outs.note), onset = cat(outs.onset), contour = cat(outs.contour)
      self.postMessage({ type: 'result', id: m.id, note, onset, contour, count: m.count, ms: performance.now() - t0 },
        [note.buffer, onset.buffer, contour.buffer])
    }
  } catch (e) {
    self.postMessage({ type: 'error', id: m.id, message: e?.message || String(e) })
  }
}
