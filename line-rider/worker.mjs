import { pickHits } from '../bosh/music.js'
import { planTrack, verifyPlan } from '../bosh/planner.js'
import { writeTrack } from '../bosh/track.js'
import { reserveSteepLoops, shapeMusic } from './music-shape.mjs'
import {
  layoutRacePlans,
  varyRacerPace,
} from './race-tracks.mjs'
import { lineLengthForHit } from './structure-lines.mjs'
import { varyHits } from './variable-controls.mjs'

const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function padDetails(result, hit, racerIndex) {
  return {
    ...result,
    racerIndex,
    pitch: hit.pitch,
    strength: hit.strength,
    time: hit.time,
    energy: hit.energy,
    paceFactor: hit.paceFactor,
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
}

function prepareHits(groups, pick, flow) {
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
  return musicalHits.map(hit => {
    const control = lineLengthForHit(hit, flow)
    return {
      ...hit,
      lineLength: control.target,
      lineStructure: control.structure,
    }
  })
}

self.onmessage = ({ data }) => {
  const { id, groups, trackGroups = [], pick, plan: planOptions, label } = data
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
      raceVariance: planOptions.raceVariance,
    }
    const fullHits = prepareHits(groups, pick, flow)
    if (!fullHits.length) throw new Error('no notes to land on')

    const {
      racerCount: requestedRacers = 1,
      raceVariance: requestedVariance = 0.65,
      musicMode = 'full',
      ...physicsOptions
    } = planOptions
    const racerCount = Math.max(1, Math.min(8, Math.round(requestedRacers)))
    const raceVariance = clamp(requestedVariance, 0, 1)
    const plans = []
    const checks = []
    const racerHits = []
    const racerParts = []
    const usableTracks = trackGroups.filter(track => track.groups?.length >= 4)
    let lastProgress = 0
    let nextIdOffset = 0
    for (let racerIndex = 0; racerIndex < racerCount; racerIndex++) {
      const part = musicMode === 'tracks' && usableTracks.length
        ? usableTracks[racerIndex % usableTracks.length]
        : null
      const partHits = part ? prepareHits(part.groups, pick, flow) : fullHits
      const baseHits = partHits.length ? partHits : fullHits
      const individualHits = varyRacerPace(baseHits, racerIndex, racerCount, raceVariance)
      racerParts.push(part?.label ?? 'Full mix')
      const plan = planTrack(individualHits, {
        ...physicsOptions,
        start: { x: 0, y: 0 },
        idOffset: nextIdOffset,
        seed: (physicsOptions.seed || 1) + racerIndex * 1009,
        onProgress: progress => {
          const now = Date.now()
          if (now - lastProgress > 120 || progress.done === progress.total) {
            lastProgress = now
            self.postMessage({
              id,
              progress: {
                ...progress,
                done: racerIndex + progress.done / progress.total,
                total: racerCount,
                racer: racerIndex + 1,
                racers: racerCount,
                landingDone: progress.done,
                landingTotal: progress.total,
              },
            })
          }
        },
      })
      const check = verifyPlan(plan.lines, plan.pads, {
        start: plan.start,
        frames: plan.duration,
      })
      if (check.crash != null || check.exact !== plan.pads.length) {
        throw new Error(
          `racer ${racerIndex + 1} failed its own physics: ` +
          `${check.exact}/${plan.pads.length} exact` +
          `${check.crash == null ? '' : `, crash at frame ${check.crash}`}`,
        )
      }
      plans.push(plan)
      checks.push(check)
      racerHits.push(individualHits)
      nextIdOffset = Math.max(nextIdOffset, ...plan.lines.map(line => line.id))
    }

    const race = layoutRacePlans(plans, 112)

    const lineVarianceApplied = checks.every((check, racerIndex) => (
      check.crash == null && check.exact === race.padsByRacer[racerIndex].length
    ))
    flow.lineVarianceApplied = lineVarianceApplied
    flow.racerCount = racerCount
    flow.raceVariance = raceVariance
    flow.laneOffsets = race.offsets
    flow.musicMode = musicMode
    flow.racerParts = racerParts
    const duration = Math.max(...plans.map(plan => plan.duration))
    const track = writeTrack({
      label,
      creator: 'midiviz #043 variable-flow editor',
      description:
        `${racerCount} independently planned parallel racers with changing pace on ${label}; ` +
        `${musicMode === 'tracks' ? `parts: ${racerParts.join(', ')}; ` : ''}` +
        `${plans.reduce((sum, plan) => sum + plan.stats.loops, 0)} physically ridden loops; ` +
        `music starts at ${Math.min(...racerHits.map(hits => hits[0].leadIn)).toFixed(2)} s`,
      duration,
      riders: race.racers,
      racerDurations: plans.map(plan => plan.duration),
      racerLineRanges: race.lineRanges,
      racerDisplayOffsets: race.offsets,
      racerStaggerFrames: 0,
      lines: race.lines,
    })
    const pads = checks.flatMap((check, racerIndex) => check.results.map(result => (
      padDetails(result, racerHits[racerIndex][result.hit], racerIndex)
    )))
    const skipped = plans.flatMap((plan, racerIndex) => (
      plan.skipped.map(hit => ({ racerIndex, hit }))
    ))
    const exact = checks.reduce((sum, check) => sum + check.exact, 0)
    const stats = {
      racers: racerCount,
      hits: plans.reduce((sum, plan) => sum + plan.stats.hits, 0),
      landed: pads.length,
      skipped: skipped.length,
      frames: plans.reduce((sum, plan) => sum + plan.stats.frames, 0),
      ms: plans.reduce((sum, plan) => sum + plan.stats.ms, 0),
      lines: race.lines.length,
      loops: plans.reduce((sum, plan) => sum + plan.stats.loops, 0),
      exact,
      crash: null,
      laneOffsets: race.offsets,
    }
    self.postMessage({
      id,
      result: {
        track,
        pads,
        hits: racerHits[0],
        skipped,
        stats,
        leadIn: Math.min(...racerHits.map(hits => hits[0].leadIn)),
        flow,
        lineVarianceApplied,
      },
    })
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}
