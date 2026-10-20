const TAU = Math.PI * 2

export const FEATURE_LABELS = {
  launch: 'Launch ramp',
  loop: 'Loop-the-loop',
  'double-loop': 'Double loop',
  corkscrew: 'Corkscrew',
  ribbon: 'Ribbon curl',
  climb: 'Melodic climb',
  dive: 'Melodic dive',
  scallops: 'Waltz hills',
  wave: 'Long wave',
  finish: 'Final jump',
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = t => t * t * (3 - 2 * t)
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function hash01(seed, index) {
  let value = (Number(seed) || 1) ^ Math.imul(index + 1, 0x9e3779b1)
  value ^= value >>> 16
  value = Math.imul(value, 0x21f0aaad)
  value ^= value >>> 15
  value = Math.imul(value, 0x735a2d97)
  value ^= value >>> 15
  return (value >>> 0) / 4294967296
}

function normalizeMetrics(phrases, key, outputKey) {
  const values = phrases.map(phrase => phrase[key])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low
  for (const phrase of phrases) {
    phrase[outputKey] = span > 1e-9 ? (phrase[key] - low) / span : 0.5
  }
}

function notesByOnset(notes, select) {
  const groups = new Map()
  for (const note of notes) {
    const existing = groups.get(note.ticks)
    if (!existing || select(note.midi, existing.midi)) groups.set(note.ticks, note)
  }
  return [...groups.values()].sort((a, b) => a.ticks - b.ticks)
}

function voiceAt(voice, tick, fallback) {
  if (!voice.length) return fallback
  let low = 0
  let high = voice.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (voice[middle].ticks <= tick) low = middle
    else high = middle - 1
  }
  const left = voice[low]
  const right = voice[Math.min(low + 1, voice.length - 1)]
  if (!right || right.ticks === left.ticks || tick <= left.ticks) return left.midi
  return lerp(left.midi, right.midi, clamp((tick - left.ticks) / (right.ticks - left.ticks), 0, 1))
}

/**
 * Reduce a parsed tonejs-midi Midi into phrase-level controls for a race.
 * The highest pitched track becomes the curling melody and the lowest
 * pitched track supplies the waltz foundation.
 */
export function analyzeMidi(midi, { phraseBars = 4 } = {}) {
  const pitchedTracks = midi.tracks.filter(track => !track.instrument?.percussion && track.notes.length)
  if (!pitchedTracks.length) throw new Error('The MIDI file has no pitched notes.')

  const rankedTracks = pitchedTracks
    .map((track, index) => ({ track, index, pitch: median(track.notes.map(note => note.midi)) }))
    .sort((a, b) => a.pitch - b.pitch)
  const bassTrack = rankedTracks[0].track
  const melodyTrack = rankedTracks.at(-1).track
  const melody = notesByOnset(melodyTrack.notes, (next, current) => next > current)
  const bass = notesByOnset(bassTrack.notes, (next, current) => next < current)

  const signature = midi.header.timeSignatures[0]?.timeSignature || [4, 4]
  const ticksPerBeat = midi.header.ppq * 4 / signature[1]
  const ticksPerBar = ticksPerBeat * signature[0]
  const phraseTicks = Math.max(ticksPerBar, ticksPerBar * phraseBars)
  const durationTicks = midi.durationTicks
  const phrases = []

  for (let startTick = 0, index = 0; startTick < durationTicks; startTick += phraseTicks, index++) {
    const endTick = Math.min(durationTicks, startTick + phraseTicks)
    const melodyNotes = melody.filter(note => note.ticks >= startTick && note.ticks < endTick)
    const bassNotes = bass.filter(note => note.ticks >= startTick && note.ticks < endTick)
    const pitches = melodyNotes.map(note => note.midi)
    const intervals = pitches.slice(1).map((pitch, i) => Math.abs(pitch - pitches[i]))
    const firstPitch = mean(pitches.slice(0, 4))
    const lastPitch = mean(pitches.slice(-4))
    const startTime = midi.header.ticksToSeconds(startTick)
    const endTime = midi.header.ticksToSeconds(endTick)
    const seconds = Math.max(0.05, endTime - startTime)

    phrases.push({
      index,
      startTick,
      endTick,
      startTime,
      endTime,
      seconds,
      melodyNotes,
      bassNotes,
      meanPitch: pitches.length ? mean(pitches) : 72,
      meanBass: bassNotes.length ? mean(bassNotes.map(note => note.midi)) : 48,
      density: melodyNotes.length / seconds,
      motion: mean(intervals),
      range: pitches.length ? Math.max(...pitches) - Math.min(...pitches) : 0,
      trend: pitches.length > 1 ? clamp((lastPitch - firstPitch) / 12, -1, 1) : 0,
      velocity: melodyNotes.length ? mean(melodyNotes.map(note => note.velocity)) : 0.5,
    })
  }

  normalizeMetrics(phrases, 'density', 'densityNorm')
  normalizeMetrics(phrases, 'motion', 'motionNorm')
  normalizeMetrics(phrases, 'range', 'rangeNorm')
  for (const phrase of phrases) {
    phrase.energy = clamp(
      phrase.velocity * 0.35 +
      phrase.densityNorm * 0.3 +
      phrase.motionNorm * 0.2 +
      phrase.rangeNorm * 0.15,
      0,
      1,
    )
  }

  const allNotes = pitchedTracks
    .flatMap((track, trackIndex) => track.notes.map(note => ({
      midi: note.midi,
      velocity: note.velocity,
      time: note.time,
      duration: note.duration,
      ticks: note.ticks,
      durationTicks: note.durationTicks,
      trackIndex,
    })))
    .sort((a, b) => a.time - b.time || b.midi - a.midi)
  const accentTimes = []
  for (const note of allNotes) {
    if (note.velocity < 0.5) continue
    if (!accentTimes.length || note.time - accentTimes.at(-1) > 0.16) accentTimes.push(note.time)
  }

  return {
    name: midi.name || 'Untitled MIDI',
    duration: midi.duration,
    durationTicks,
    ppq: midi.header.ppq,
    signature,
    ticksPerBar,
    phraseBars,
    phrases,
    melody,
    bass,
    melodyTrackIndex: rankedTracks.at(-1).index,
    bassTrackIndex: rankedTracks[0].index,
    tracks: pitchedTracks.length,
    notes: allNotes,
    accentTimes,
    tempoEvents: midi.header.tempos.length,
    header: midi.header,
  }
}

function chooseFeature(phrase, phraseCount, seed, loopiness) {
  if (phrase.index === 0) return 'launch'
  if (phrase.index === phraseCount - 1) return 'finish'

  const roll = hash01(seed, phrase.index * 13 + 5)
  const curlScore = clamp(
    loopiness * (0.56 + phrase.motionNorm * 0.24 + phrase.densityNorm * 0.2),
    0,
    1,
  )
  if (roll < curlScore * 0.34) {
    return phrase.rangeNorm > 0.58 || hash01(seed, phrase.index * 17) > 0.62
      ? 'double-loop'
      : 'loop'
  }
  if (roll < curlScore * 0.72) return 'corkscrew'
  if (roll < curlScore * 0.9) return 'ribbon'
  if (phrase.trend > 0.18) return 'climb'
  if (phrase.trend < -0.18) return 'dive'
  if (phrase.energy > 0.68) return 'scallops'
  return 'wave'
}

function modulePoint(feature, u, geometry, phrase, analysis) {
  const { advance, radius, delta } = geometry
  const envelope = Math.sin(Math.PI * u) ** 2
  const pitch = voiceAt(
    phrase.melodyNotes,
    lerp(phrase.startTick, phrase.endTick, u),
    phrase.meanPitch,
  )
  const melodicBend = clamp((pitch - phrase.meanPitch) * -1.7, -22, 22) * envelope
  let x = advance * u
  let y = delta * smoothstep(u)

  switch (feature) {
    case 'launch':
      y += -radius * 0.58 * envelope
      break
    case 'loop':
      x += radius * Math.sin(TAU * u)
      y += -radius * (1 - Math.cos(TAU * u))
      break
    case 'double-loop':
      x += radius * 0.82 * Math.sin(TAU * 2 * u)
      y += -radius * 0.82 * (1 - Math.cos(TAU * 2 * u))
      break
    case 'corkscrew':
      x += radius * Math.sin(TAU * 2 * u)
      y += -radius * (1 - Math.cos(TAU * 2 * u))
      break
    case 'ribbon':
      x += radius * 0.42 * Math.sin(TAU * 2 * u) * envelope
      y += -radius * 1.05 * Math.sin(TAU * u) * envelope
      break
    case 'climb':
      y += -radius * 0.38 * envelope
      break
    case 'dive':
      y += radius * 0.38 * envelope
      break
    case 'scallops':
      y += -radius * 0.64 * Math.sin(Math.PI * 3 * u) ** 2
      break
    case 'finish':
      y += -radius * 0.82 * envelope + Math.sin(TAU * 2 * u) * radius * 0.12 * envelope
      break
    default:
      y += -radius * 0.72 * Math.sin(TAU * u) * envelope
      break
  }

  // The phrase chooses the big gesture; the actual melody adds a smaller,
  // note-by-note bend so two files never generate the same line.
  y += melodicBend

  // A quiet bass line opens the curves, while a busy one tightens them.
  const bassPitch = voiceAt(
    phrase.bassNotes,
    lerp(phrase.startTick, phrase.endTick, u),
    phrase.meanBass,
  )
  y += clamp((phrase.meanBass - bassPitch) * 0.75, -8, 8) * envelope

  return { x, y }
}

/**
 * Build a continuous centerline. Every point has an exact music time, so
 * rendering and the fixed-step physics calibration use the same representation.
 */
export function buildTrack(analysis, {
  seed = 64,
  loopiness = 0.76,
  samplesPerPhrase = 88,
  targetSpeed = 300,
} = {}) {
  const points = []
  const sections = []
  let originX = 0
  let originY = 0

  for (const phrase of analysis.phrases) {
    const feature = chooseFeature(phrase, analysis.phrases.length, seed, clamp(loopiness, 0, 1))
    const durationScale = clamp(phrase.seconds / 2.5, 0.72, 1.42)
    const targetLength = phrase.seconds * targetSpeed
    const turns = feature === 'loop' ? 1 : ['double-loop', 'corkscrew'].includes(feature) ? 2 : 0
    const curl = turns > 0
    const radius = curl
      ? clamp(targetLength / (turns * TAU + 1.82), turns === 1 ? 72 : 43, turns === 1 ? 118 : 72)
      : (72 + phrase.energy * 42 + phrase.rangeNorm * 18) * durationScale
    const advance = curl
      ? radius * 1.82
      : targetLength * (feature === 'ribbon' ? 0.78 : 0.94)
    let delta = 0
    if (feature === 'climb') delta = -(55 + phrase.rangeNorm * 50)
    if (feature === 'dive') delta = 55 + phrase.rangeNorm * 50
    if (Math.abs(originY + delta) > 190) delta *= -0.72

    const geometry = { advance, radius, delta }
    const startPoint = points.length
    const count = Math.max(24, Math.round(samplesPerPhrase * clamp(phrase.seconds / 2.5, 0.7, 1.5)))
    for (let index = 0; index < count; index++) {
      if (points.length && index === 0) continue
      const u = index / (count - 1)
      const local = modulePoint(feature, u, geometry, phrase, analysis)
      points.push({
        x: originX + local.x,
        y: originY + local.y,
        time: lerp(phrase.startTime, phrase.endTime, u),
        tick: lerp(phrase.startTick, phrase.endTick, u),
        phraseIndex: phrase.index,
        u,
      })
    }
    sections.push({
      ...phrase,
      feature,
      label: FEATURE_LABELS[feature],
      pointStart: startPoint,
      pointEnd: points.length - 1,
      radius,
    })
    originX += advance
    originY += delta
  }

  // Tangents are stored once and reused for lane offsets and rider poses.
  for (let index = 0; index < points.length; index++) {
    const before = points[Math.max(0, index - 2)]
    const after = points[Math.min(points.length - 1, index + 2)]
    const dx = after.x - before.x
    const dy = after.y - before.y
    const length = Math.hypot(dx, dy) || 1
    points[index].dx = dx / length
    points[index].dy = dy / length
  }

  const featureCounts = {}
  for (const section of sections) featureCounts[section.feature] = (featureCounts[section.feature] || 0) + 1
  return {
    seed: Number(seed) || 1,
    loopiness: clamp(loopiness, 0, 1),
    duration: analysis.duration,
    points,
    sections,
    featureCounts,
    bounds: boundsOf(points),
  }
}

export function boundsOf(points) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function sampleTrackAtTime(track, time) {
  const points = track.points
  if (!points.length) return { x: 0, y: 0, dx: 1, dy: 0, time: 0, phraseIndex: 0 }
  if (time <= points[0].time) return { ...points[0], pointIndex: 0 }
  if (time >= points.at(-1).time) return { ...points.at(-1), pointIndex: points.length - 1 }

  let low = 0
  let high = points.length - 1
  while (low + 1 < high) {
    const middle = (low + high) >> 1
    if (points[middle].time <= time) low = middle
    else high = middle
  }
  const left = points[low]
  const right = points[high]
  const amount = (time - left.time) / Math.max(1e-9, right.time - left.time)
  let dx = lerp(left.dx, right.dx, amount)
  let dy = lerp(left.dy, right.dy, amount)
  const length = Math.hypot(dx, dy) || 1
  dx /= length
  dy /= length
  return {
    x: lerp(left.x, right.x, amount),
    y: lerp(left.y, right.y, amount),
    dx,
    dy,
    time,
    tick: lerp(left.tick, right.tick, amount),
    phraseIndex: amount < 0.5 ? left.phraseIndex : right.phraseIndex,
    pointIndex: low,
  }
}

export function offsetSample(sample, offset) {
  return {
    ...sample,
    x: sample.x - sample.dy * offset,
    y: sample.y + sample.dx * offset,
  }
}

export function laneOffset(racerIndex, racerCount, gap = 18) {
  return (racerIndex - (racerCount - 1) / 2) * gap
}

