// Image-only ScoreShift recognition worker for experiment #046.
import { normalize, analyze, findStaves, interpret } from './scoreshift/omr.js'
import { applyPriorFifths } from './document.js'
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
    const fifths = event.data.fifths
    let model = analyze(norm)
    const printed = model.staves.filter(staff => staff.key.cancellation || staff.key.detected || staff.key.glyphs?.length)
    const missing = model.staves.some(staff => !staff.key.cancellation && !staff.key.detected && !staff.key.glyphs?.length)
    if (Number.isInteger(fifths) && missing && printed.every(staff => staff.key.fifths === fifths)) model = analyze(norm, { fifths })
    applyPriorFifths(model.staves, fifths, interpret)
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
