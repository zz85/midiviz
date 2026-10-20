// Compact Line Rider-style physics.
//
// The integration order, gravity, six solver iterations, one-sided rail
// collision, rider dimensions, and acceleration-line behavior follow the
// MIT-licensed lr-core reference implementation by David Lu:
// https://github.com/conundrumer/lr-core

import { laneOffset, offsetSample } from './track-generator.mjs'

export const PHYSICS_FPS = 40
export const PHYSICS_GRAVITY = 0.175
export const PHYSICS_ITERATIONS = 6
export const PHYSICS_LANE_GAP = 11
export const PHYSICS_CHANNEL_WIDTH = 30

export function physicsLaneGap(racerCount) {
  return Math.min(PHYSICS_LANE_GAP, 27 / Math.max(1, racerCount - 3))
}

const MAX_FORCE_DISTANCE = 12
const POINT_ORDER = [
  'PEG', 'TAIL', 'NOSE', 'STRING',
  'BUTT', 'SHOULDER', 'LHAND', 'RHAND', 'LFOOT', 'RFOOT',
  'SCARF_0', 'SCARF_1', 'SCARF_2', 'SCARF_3', 'SCARF_4',
]

const BODY_POINTS = [
  { id: 'PEG', x: 0, y: 0, friction: 0.8, collidable: true },
  { id: 'TAIL', x: 0, y: 5, friction: 0, collidable: true },
  { id: 'NOSE', x: 15, y: 5, friction: 0, collidable: true },
  { id: 'STRING', x: 17.5, y: 0, friction: 0, collidable: true },
  // The body remains a fully constrained Verlet ragdoll. Collision is
  // limited to the four sled points so automatically generated curls do not
  // pin hands and feet between the powered rail and its safety rail.
  { id: 'BUTT', x: 5, y: 0, friction: 0.8, collidable: false },
  { id: 'SHOULDER', x: 5, y: -5.5, friction: 0.8, collidable: false },
  { id: 'LHAND', x: 11.5, y: -5, friction: 0.1, collidable: false },
  { id: 'RHAND', x: 11.5, y: -5, friction: 0.1, collidable: false },
  { id: 'LFOOT', x: 10, y: 5, friction: 0, collidable: false },
  { id: 'RFOOT', x: 10, y: 5, friction: 0, collidable: false },
]

const SLED_POINTS = new Set(['PEG', 'TAIL', 'NOSE', 'STRING'])

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

function makeConstraint(points, p1, p2, factor = 1) {
  return { p1, p2, length: distance(points.get(p1), points.get(p2)) * factor }
}

function transformPoint(origin, tangent, normal, point) {
  return {
    x: origin.x + tangent.x * point.x + normal.x * point.y,
    y: origin.y + tangent.y * point.x + normal.y * point.y,
  }
}

export function buildPhysicsCourse(track, {
  racerIndex = 0,
  racerCount = 1,
  laneGap = physicsLaneGap(racerCount),
  channelWidth = PHYSICS_CHANNEL_WIDTH,
} = {}) {
  const offset = laneOffset(racerIndex, racerCount, laneGap)
  const points = track.points.map(point => offsetSample(point, offset))
  const segments = []

  for (let index = 0; index < points.length - 1; index++) {
    const p1 = points[index]
    const p2 = points[index + 1]
    const vx = p2.x - p1.x
    const vy = p2.y - p1.y
    const length = Math.hypot(vx, vy)
    if (length < 1e-6) continue
    const tx = vx / length
    const ty = vy / length
    const seconds = Math.max(1e-4, p2.time - p1.time)
    const targetSpeed = length / seconds / PHYSICS_FPS
    const section = track.sections[p1.phraseIndex]
    const curl = ['loop', 'double-loop', 'corkscrew'].includes(section?.feature)
    const climb = section?.feature === 'climb'
    const boost = clamp(
      0.075 + Math.max(0, targetSpeed - 5.4) * 0.018 + (curl ? 0.012 : 0) + (climb ? 0.018 : 0),
      0.06,
      0.16,
    )

    const segment = {
      index,
      p1,
      p2,
      vx,
      vy,
      length,
      invLengthSq: 1 / (length * length),
      tx,
      ty,
      // Clockwise normal: a rider approaching from the left side of the
      // directed line collides after crossing it, like a classic solid line.
      nx: -ty,
      ny: tx,
      boost,
      targetSpeed,
      powered: true,
      phraseIndex: p1.phraseIndex,
      feature: section?.feature || 'wave',
    }
    const guardP1 = {
      x: p2.x - segment.nx * channelWidth,
      y: p2.y - segment.ny * channelWidth,
    }
    const guardP2 = {
      x: p1.x - segment.nx * channelWidth,
      y: p1.y - segment.ny * channelWidth,
    }
    segment.guard = {
      ...segment,
      p1: guardP1,
      p2: guardP2,
      vx: -vx,
      vy: -vy,
      tx: -tx,
      ty: -ty,
      nx: -segment.nx,
      ny: -segment.ny,
      boost: 0,
      powered: false,
      guard: null,
    }
    segments.push(segment)
  }

  return { points, segments, offset }
}

export function createRider(course, {
  startSpeed = 6.9,
  boostScale = 1,
} = {}) {
  const first = course.segments[0]
  if (!first) throw new Error('Cannot create a rider without track segments.')
  const tangent = { x: first.tx, y: first.ty }
  const normal = { x: first.nx, y: first.ny }
  // Local sled contact points use y=5, so shift the body five units toward
  // the rideable side and place the runners directly on the first rail.
  const origin = {
    x: first.p1.x - normal.x * 5,
    y: first.p1.y - normal.y * 5,
  }
  const velocity = { x: tangent.x * startSpeed, y: tangent.y * startSpeed }
  const points = new Map()

  for (const definition of BODY_POINTS) {
    const pos = transformPoint(origin, tangent, normal, definition)
    points.set(definition.id, {
      ...definition,
      x: pos.x,
      y: pos.y,
      px: pos.x - velocity.x,
      py: pos.y - velocity.y,
      airFriction: 0,
    })
  }

  let scarfAnchor = points.get('SHOULDER')
  for (let index = 0; index < 5; index++) {
    const pos = {
      x: scarfAnchor.x - tangent.x * 4,
      y: scarfAnchor.y - tangent.y * 4,
    }
    const point = {
      id: `SCARF_${index}`,
      x: pos.x,
      y: pos.y,
      px: pos.x - velocity.x,
      py: pos.y - velocity.y,
      friction: 0,
      airFriction: 0.12,
      collidable: false,
    }
    points.set(point.id, point)
    scarfAnchor = point
  }

  const constraints = [
    makeConstraint(points, 'PEG', 'TAIL'),
    makeConstraint(points, 'TAIL', 'NOSE'),
    makeConstraint(points, 'NOSE', 'STRING'),
    makeConstraint(points, 'STRING', 'PEG'),
    makeConstraint(points, 'PEG', 'NOSE'),
    makeConstraint(points, 'STRING', 'TAIL'),
    makeConstraint(points, 'PEG', 'BUTT'),
    makeConstraint(points, 'TAIL', 'BUTT'),
    makeConstraint(points, 'NOSE', 'BUTT'),
    makeConstraint(points, 'SHOULDER', 'BUTT'),
    makeConstraint(points, 'SHOULDER', 'LHAND'),
    makeConstraint(points, 'SHOULDER', 'RHAND'),
    makeConstraint(points, 'BUTT', 'LFOOT'),
    makeConstraint(points, 'BUTT', 'RFOOT'),
    makeConstraint(points, 'SHOULDER', 'PEG'),
    makeConstraint(points, 'STRING', 'LHAND'),
    makeConstraint(points, 'STRING', 'RHAND'),
    makeConstraint(points, 'LFOOT', 'NOSE'),
    makeConstraint(points, 'RFOOT', 'NOSE'),
  ]
  const scarfConstraints = []
  let previous = 'SHOULDER'
  for (let index = 0; index < 5; index++) {
    const current = `SCARF_${index}`
    scarfConstraints.push(makeConstraint(points, previous, current))
    previous = current
  }

  return {
    points,
    constraints,
    scarfConstraints,
    progress: 0,
    contact: 0,
    airFrames: 0,
    boostScale,
    crashed: false,
  }
}

function integrate(point) {
  const damping = 1 - point.airFriction
  const vx = (point.x - point.px) * damping
  const vy = (point.y - point.py) * damping + PHYSICS_GRAVITY
  point.px = point.x
  point.py = point.y
  point.x += vx
  point.y += vy
}

function solveStick(points, constraint) {
  const p1 = points.get(constraint.p1)
  const p2 = points.get(constraint.p2)
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-8) return
  const correction = (length - constraint.length) / length * 0.5
  const cx = dx * correction
  const cy = dy * correction
  p1.x += cx
  p1.y += cy
  p2.x -= cx
  p2.y -= cy
}

function collidePoint(rider, point, course) {
  const vx = point.x - point.px
  const vy = point.y - point.py
  const start = Math.max(0, rider.progress - 10)
  const end = Math.min(course.segments.length - 1, rider.progress + 28)
  let best = null

  for (let index = start; index <= end; index++) {
    const main = course.segments[index]
    for (const segment of [main, main.guard]) {
      const ox = point.x - segment.p1.x
      const oy = point.y - segment.p1.y
      const perpendicular = segment.nx * ox + segment.ny * oy
      if (perpendicular <= 0 || perpendicular >= MAX_FORCE_DISTANCE) continue
      const intoLine = segment.nx * vx + segment.ny * vy
      if (intoLine <= 0) continue
      const linePosition = (segment.vx * ox + segment.vy * oy) * segment.invLengthSq
      if (linePosition < -0.12 || linePosition > 1.12) continue
      const progressPenalty = Math.abs(index - rider.progress) * 0.002
      const score = perpendicular + progressPenalty
      if (!best || score < best.score) best = { segment, perpendicular, score }
    }
  }

  if (!best) return
  const { segment, perpendicular } = best
  point.x -= segment.nx * perpendicular
  point.y -= segment.ny * perpendicular

  let tangentVelocity = vx * segment.tx + vy * segment.ty
  const friction = clamp(point.friction * perpendicular * 0.018, 0, 0.22)
  tangentVelocity *= 1 - friction
  if (segment.powered && SLED_POINTS.has(point.id)) {
    // MIDI-generated powered lines use a physical tangential impulse. They
    // only add energy when the sled falls below the speed designed for this
    // rail segment; the rider is never snapped to the line or moved forward.
    const speedError = Math.max(0, segment.targetSpeed * 1.06 - tangentVelocity)
    const poweredImpulse = clamp(segment.boost * 0.2 + speedError * 0.16, 0, 0.48)
    tangentVelocity += poweredImpulse * rider.boostScale
  }
  const rebound = -Math.max(0, segment.nx * vx + segment.ny * vy) * 0.018
  const correctedVx = segment.tx * tangentVelocity + segment.nx * rebound
  const correctedVy = segment.ty * tangentVelocity + segment.ny * rebound
  point.px = point.x - correctedVx
  point.py = point.y - correctedVy

  rider.progress = Math.max(rider.progress, segment.index)
  rider.contact++
}

export function stepRider(rider, course) {
  rider.contact = 0
  for (const point of rider.points.values()) integrate(point)

  for (let iteration = 0; iteration < PHYSICS_ITERATIONS; iteration++) {
    for (const constraint of rider.constraints) solveStick(rider.points, constraint)
    for (const point of rider.points.values()) {
      if (point.collidable) collidePoint(rider, point, course)
    }
  }
  for (const constraint of rider.scarfConstraints) solveStick(rider.points, constraint)

  rider.airFrames = rider.contact ? 0 : rider.airFrames + 1
  const nose = rider.points.get('NOSE')
  const tail = rider.points.get('TAIL')
  if (![nose.x, nose.y, tail.x, tail.y].every(Number.isFinite)) rider.crashed = true
  return rider
}

function captureFrame(rider, data, frameIndex) {
  for (let pointIndex = 0; pointIndex < POINT_ORDER.length; pointIndex++) {
    const point = rider.points.get(POINT_ORDER[pointIndex])
    const offset = (frameIndex * POINT_ORDER.length + pointIndex) * 2
    data[offset] = point.x
    data[offset + 1] = point.y
  }
}

export function simulateRider(track, {
  racerIndex = 0,
  racerCount = 1,
  seed = 1,
  duration = track.duration,
  fps = PHYSICS_FPS,
  extraSeconds = 1,
  laneGap = physicsLaneGap(racerCount),
  startSpeed: startSpeedOverride,
  boostScale: boostScaleOverride,
} = {}) {
  const course = buildPhysicsCourse(track, { racerIndex, racerCount, laneGap })
  const personality = Math.sin((seed + 1) * (racerIndex + 3) * 12.9898)
  const startSpeed = startSpeedOverride ?? 6.85 + personality * 0.08
  const boostScale = boostScaleOverride ?? 23.4 + racerIndex * 0.24 + personality * 0.12
  const rider = createRider(course, { startSpeed, boostScale })
  const frameCount = Math.ceil((duration + extraSeconds) * fps) + 1
  const data = new Float32Array(frameCount * POINT_ORDER.length * 2)
  const progress = new Uint32Array(frameCount)
  const contacts = new Uint8Array(frameCount)

  captureFrame(rider, data, 0)
  for (let frame = 1; frame < frameCount; frame++) {
    stepRider(rider, course)
    captureFrame(rider, data, frame)
    progress[frame] = rider.progress
    contacts[frame] = Math.min(255, rider.contact)
    if (rider.crashed) break
  }

  return {
    fps,
    frameCount,
    pointOrder: POINT_ORDER,
    data,
    progress,
    contacts,
    course,
    crashed: rider.crashed,
    finalProgress: rider.progress,
  }
}

export function simulateRace(track, {
  racerCount = 6,
  seed = 1,
  duration = track.duration,
  laneGap = physicsLaneGap(racerCount),
  calibrate = true,
} = {}) {
  const simulations = []
  const boostCandidates = calibrate ? [14, 18, 22, 24, 26, 28, 32] : [24]

  for (let racerIndex = 0; racerIndex < racerCount; racerIndex++) {
    const targetJitter = Math.sin((seed + 7) * (racerIndex + 5) * 4.123) * 0.9
    const targetFinish = Math.max(1, duration - 2 + targetJitter)
    let best = null

    for (const boostScale of boostCandidates) {
      const simulation = simulateRider(track, {
        racerIndex,
        racerCount,
        seed,
        duration,
        laneGap,
        boostScale,
      })
      let finishTime = -1
      for (let frame = 0; frame < simulation.frameCount; frame++) {
        if (simulation.progress[frame] >= simulation.course.segments.length - 2) {
          finishTime = frame / simulation.fps
          break
        }
      }
      const completion = simulation.finalProgress / Math.max(1, simulation.course.segments.length - 1)
      const score = finishTime >= 0
        ? Math.abs(finishTime - targetFinish)
        : 100 + (1 - completion) * 100
      simulation.finishTime = finishTime
      simulation.boostScale = boostScale
      simulation.calibrationScore = score
      if (!best || score < best.calibrationScore) best = simulation
    }
    simulations.push(best)
  }
  return simulations
}

export function sampleSimulation(simulation, time) {
  const exactFrame = clamp(time * simulation.fps, 0, simulation.frameCount - 1)
  const frameA = Math.floor(exactFrame)
  const frameB = Math.min(simulation.frameCount - 1, frameA + 1)
  const amount = exactFrame - frameA
  const points = {}

  for (let pointIndex = 0; pointIndex < simulation.pointOrder.length; pointIndex++) {
    const id = simulation.pointOrder[pointIndex]
    const offsetA = (frameA * simulation.pointOrder.length + pointIndex) * 2
    const offsetB = (frameB * simulation.pointOrder.length + pointIndex) * 2
    points[id] = {
      x: simulation.data[offsetA] + (simulation.data[offsetB] - simulation.data[offsetA]) * amount,
      y: simulation.data[offsetA + 1] + (simulation.data[offsetB + 1] - simulation.data[offsetA + 1]) * amount,
    }
  }

  const tail = points.TAIL
  const nose = points.NOSE
  const position = { x: (tail.x + nose.x) / 2, y: (tail.y + nose.y) / 2 }
  return {
    points,
    position,
    angle: Math.atan2(nose.y - tail.y, nose.x - tail.x),
    progress: simulation.progress[frameA],
    contact: simulation.contacts[frameA],
    airborne: simulation.contacts[frameA] === 0,
  }
}

