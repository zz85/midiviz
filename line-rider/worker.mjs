import { pickHits } from '../bosh/music.js'
import { planTrack, verifyPlan } from '../bosh/planner.js'
import { writeTrack } from '../bosh/track.js'
import { reserveSteepLoops, shapeMusic } from './music-shape.mjs'
import { lineLengthForHit } from './structure-lines.mjs'
import { varyHits } from './variable-controls.mjs'

self.onmessage = ({ data }) => {
  const { id, groups, pick, plan: planOptions, label } = data
  try {
    const flow = {
      rateLow: pick.rateLow,
      rateHigh: pick.rateHigh,
      gapLow: pick.gapLow,
      gapHigh: pick.gapHigh,
      speedLow: planOptions.speedLow,
      speedHigh: planOptions.speedHigh,
      phraseLow: planOptions.phraseLow,
      phraseHigh: planOptions.phraseHigh,
      upAngle: planOptions.upAngle,
      downAngle: planOptions.downAngle,
      pitchScale: planOptions.pitchScale,
      lineLow: planOptions.lineLow,
      lineHigh: planOptions.lineHigh,
    }
    const denseHits = pickHits(groups, {
      ...pick,
      rate: flow.rateHigh,
      minGap: flow.gapLow,
    }).map(hit => ({
      ...hit,
      noteLength: groups[hit.event]?.length ?? 0.2,
    }))
    const musicalHits = reserveSteepLoops(
      shapeMusic(varyHits(denseHits, flow), flow),
      flow,
    )
    const hits = musicalHits.map(hit => {
      const control = lineLengthForHit(hit, flow)
      return {
        ...hit,
        lineLength: control.target,
        lineStructure: control.structure,
      }
    })
    if (!hits.length) throw new Error('no notes to land on')

    let lastProgress = 0
    const plan = planTrack(hits, {
      ...planOptions,
      onProgress: progress => {
        const now = Date.now()
        if (now - lastProgress > 120 || progress.done === progress.total) {
          lastProgress = now
          self.postMessage({ id, progress })
        }
      },
    })
    const check = verifyPlan(plan.lines, plan.pads, { frames: plan.duration })
    const lineVarianceApplied = check.crash == null && check.exact === plan.pads.length
    flow.lineVarianceApplied = lineVarianceApplied
    const track = writeTrack({
      label,
      creator: 'midiviz #043 variable-flow editor',
      description:
        `${plan.pads.length} activity-controlled landings in multi-bar phrase gestures on ${label}; ` +
        `${plan.stats.loops} physically ridden loops; ` +
        `music starts at ${hits[0].leadIn.toFixed(2)} s`,
      duration: plan.duration,
      lines: plan.lines,
    })
    const pads = check.results.map(result => {
      const hit = hits[result.hit]
      return {
        ...result,
        pitch: hit.pitch,
        strength: hit.strength,
        time: hit.time,
        energy: hit.energy,
        activity: hit.activity,
        targetRate: hit.targetRate,
        gapFloor: hit.gapFloor,
        contour: hit.contour,
        courseHeight: hit.courseHeight,
        courseHeightSpan: hit.courseHeightSpan,
        targetSlopeAngle: hit.targetSlopeAngle,
        gestureDirection: hit.gestureDirection,
        loopRequested: hit.loopRequested,
        gestureIndex: hit.gestureIndex,
        gestureStartBar: hit.gestureStartBar,
        gestureBars: hit.gestureBars,
        lineLength: hit.lineLength,
        lineStructure: hit.lineStructure,
      }
    })
    self.postMessage({
      id,
      result: {
        track,
        pads,
        hits,
        skipped: plan.skipped,
        stats: { ...plan.stats, exact: check.exact, crash: check.crash },
        leadIn: hits[0].leadIn,
        flow,
        lineVarianceApplied,
      },
    })
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}
