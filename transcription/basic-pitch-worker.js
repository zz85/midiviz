// Module worker for #035: runs the Basic Pitch model off the main thread.
//   in  { type: 'init', tfjs, backend, modelUrl, batch }   out { type: 'ready', backend, loadMs, warmMs }
//   in  { type: 'file', job, audio }   (Float32 22050 Hz mono, transferred)
//        out { type: 'rows', job, from, frames, onsets, contours, progress } … { type: 'done', job, length, ms }
//   in  { type: 'start' }              start a live stream
//   in  { type: 'push', samples }      out { type: 'rows', … } for every newly completed window
//   in  { type: 'peek' }               out { type: 'peek', from, frames, onsets, contours, n, peekMs } | { type: 'peek', n: 0 }
//   in  { type: 'finish' }             out { type: 'rows', … } then { type: 'done', length, ms }
// Messages are handled one at a time, in order.
import * as BP from './basic-pitch.js'

const CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow'
let tf = null, model = null, batch = 4, stream = null, sent = 0
let queue = Promise.resolve()

self.onmessage = e => { queue = queue.then(() => handle(e.data)).catch(err => self.postMessage({ type: 'error', message: err.message || String(err), op: e.data.type })) }

function postRows(pg, from, to, extra = {}) {
  if (to <= from) return
  const frames = pg.frames.slice(from * BP.NOTES, to * BP.NOTES)
  const onsets = pg.onsets.slice(from * BP.NOTES, to * BP.NOTES)
  const contours = pg.contours.slice(from * BP.BINS, to * BP.BINS)
  self.postMessage({ type: 'rows', from, frames, onsets, contours, ...extra }, [frames.buffer, onsets.buffer, contours.buffer])
}

async function setBackend(name) {
  if (name === 'wasm') {
    const wasm = await import(`${CDN}/tfjs-backend-wasm@${tf.version_core}/+esm`)
    wasm.setWasmPaths(`${CDN}/tfjs-backend-wasm@${tf.version_core}/dist/`)
  } else if (name === 'webgpu') {
    if (!self.navigator?.gpu) throw new Error('WebGPU is not available in this browser')
    await import(`${CDN}/tfjs-backend-webgpu@${tf.version_core}/+esm`)
  }
  if (!(await tf.setBackend(name))) throw new Error(`backend ${name} failed to initialise`)
  await tf.ready()
}

async function handle(m) {
  if (m.type === 'init') {
    const t0 = performance.now()
    tf = await import(m.tfjs)
    batch = m.batch || 4
    try { await setBackend(m.backend) } catch (err) {
      self.postMessage({ type: 'warn', message: `${m.backend}: ${err.message}; using cpu` })
      await setBackend('cpu')
    }
    model?.dispose?.()
    model = await BP.loadModel(tf, m.modelUrl)
    const loadMs = performance.now() - t0
    const t1 = performance.now()
    await BP.runWindows(tf, model, [new Float32Array(BP.WIN)]) // compile shaders / warm up
    self.postMessage({ type: 'ready', backend: tf.getBackend(), loadMs, warmMs: performance.now() - t1 })
  } else if (m.type === 'file') {
    const t0 = performance.now()
    let sentRows = 0
    // report rows as each batch lands so the page can draw them while the rest runs
    const st = new BP.StreamTranscriber(tf, model, { batch })
    st.audio = m.audio; st.n = m.audio.length
    const total = BP.windowCount(m.audio.length), keep = BP.framesForSamples(m.audio.length)
    while (st.next < total) {
      const k = Math.min(batch, total - st.next)
      const res = await st._run(k, st.n)
      for (let j = 0; j < k; j++) { const r = BP.keptRows(res, j); st.pg.append(r.frames, r.onsets, r.contours) }
      st.next += k
      const to = Math.min(st.pg.length, keep)
      postRows(st.pg, sentRows, to, { job: m.job, progress: st.next / total })
      sentRows = to
    }
    self.postMessage({ type: 'done', job: m.job, length: keep, ms: st.ms, wall: performance.now() - t0 })
  } else if (m.type === 'start') {
    stream = new BP.StreamTranscriber(tf, model, { batch: 1 }); sent = 0
  } else if (m.type === 'push') {
    if (!stream) return
    stream.push(m.samples)
    await stream.step()
    postRows(stream.pg, sent, stream.pg.length, { ms: stream.ms, samples: stream.n })
    sent = stream.pg.length
  } else if (m.type === 'peek') {
    const t0 = performance.now()
    const p = stream && await stream.peek()
    if (!p || !p.n) { self.postMessage({ type: 'peek', n: 0 }); return }
    const frames = p.frames.slice(), onsets = p.onsets.slice(), contours = p.contours.slice()
    self.postMessage({ type: 'peek', from: p.from, n: p.n, frames, onsets, contours, ms: stream.ms, peekMs: performance.now() - t0 }, [frames.buffer, onsets.buffer, contours.buffer])
  } else if (m.type === 'finish') {
    if (!stream) return
    await stream.finish()
    postRows(stream.pg, sent, stream.pg.length, { ms: stream.ms })
    self.postMessage({ type: 'done', length: stream.pg.length, ms: stream.ms })
    stream = null
  }
}
