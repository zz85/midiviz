// Image-only ScoreShift recognition worker for experiment #046.
import { normalize, analyze, findStaves } from './scoreshift/omr.js'
import { sauvola, staffMetrics } from './scoreshift/imgproc.js'

self.onmessage = event => {
  const { gray, w, h, f } = event.data
  try {
  if (event.data.probe) {
    try {
      const binary = sauvola({ w, h, data:gray }, 31, 0.2, 'wolf', 0), metrics = staffMetrics(binary)
      const staves = metrics.space >= 4 && metrics.votes >= 20 ? findStaves(binary, metrics.space, Math.max(1, metrics.thick)) : []
      self.postMessage({ probe:true, staves:staves.length })
    } catch (error) { self.postMessage({ error:error?.message || String(error), stage:'probe' }) }
    return
  }
    const t0 = performance.now()
    const norm = normalize({ w, h, data: gray })
    const model = analyze(norm)
    // normalize() saw the reduced analysis image. Map its coordinates back to
    // the retained UI image, as ScoreShift's original worker does.
    model.A = model.A.map(value => value / f)
    model.scale *= f
    model.ms = performance.now() - t0
    model.noise = norm.noise
    for (const note of model.notes) note.si = note.st.index
    self.postMessage({ model }, [model.labels.buffer, model.bin.buffer])
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) })
  }
}
