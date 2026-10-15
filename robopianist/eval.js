#!/usr/bin/env node
// Head-to-head on RoboPianist's own physics and metric (Experiment #031).
//
//   node robopianist/eval.js                 RL replay vs our planner on the two
//                                            Rousseau clips that ship with MIDI
//   node robopianist/eval.js song.mid …      our planner on any MIDI file
//   --human        also run our planner with the clip's human fingering
//   --verbose      per-frame misses
//   --tune         small coordinate search over the planner's IK settings
//
// Prints precision / recall / F1 exactly as robopianist/wrappers/evaluation.py
// computes them, plus how often our fingering agrees with the human labels.

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename } from 'node:path'
import {
  SCENE_FILES, POLICIES, createWorld, readNpy, trimSilence, goalFrames, scoreFrames, framedNotes,
  ReplayController, PlannerController, releaseOutOfReach, PLANNER_DEFAULTS, rollout, applyRousseauFingering, handsFromTracks, SHADOW_FINGERING, CONTROL_DT,
} from './sim.js'
import { fingerPiece } from '../fingering/fingering.js'

const here = new URL('./', import.meta.url)
const args = process.argv.slice(2)
const flag = f => args.includes(f)
const opt = (name, d) => { const a = args.find(x => x.startsWith(name + '=')); return a ? +a.split('=')[1] : d }
const files = args.filter(a => !a.startsWith('--'))
const fingerOpts = { handSize: opt('--hand-size', 1), ...(flag('--human-hand') ? {} : SHADOW_FINGERING) }
const plannerOpts = JSON.parse((args.find(a => a.startsWith('--opts=')) || '--opts={}').slice(7))

const load = (await import(new URL('mujoco/mujoco_wasm.js', here))).default
const log = console.log
console.log = () => {} // the wasm prints its version banner
const mujoco = await load()
console.log = log
const world = createWorld(mujoco, SCENE_FILES.map(f => [f, readFileSync(new URL('scene/' + f, here))]))

const { Midi } = createRequire(import.meta.url)('../tonejs-midi.js')
function loadMidi(path) {
  const midi = new Midi(readFileSync(path))
  const notes = []
  midi.tracks.forEach((t, ti) => t.notes.forEach(n => notes.push({ pitch: n.midi, on: n.time, off: n.time + n.duration, velocity: n.velocity, track: ti })))
  return trimSilence(notes)
}

const pct = v => (100 * v).toFixed(1).padStart(5)
const row = (label, s, extra = '') => log(`  ${label.padEnd(34)} P ${pct(s.precision)}  R ${pct(s.recall)}  F1 ${pct(s.f1)}${extra}`)

function runPlanner(notes, options) {
  const framed = releaseOutOfReach(framedNotes(notes), opt('--span', 16))
  const t0 = performance.now()
  const ctl = new PlannerController(world, framed, { ...plannerOpts, ...options })
  const goal = goalFrames(notes)
  const pressed = rollout(world, ctl, { frames: goal.length })
  ctl.dispose()
  return { score: scoreFrames(goal, pressed), ms: performance.now() - t0, pressed, goal }
}

function fingerAgreement(ours, human) {
  let hand = 0, both = 0
  ours.forEach((n, i) => {
    if (n.hand === human[i].hand) hand++
    if (n.hand === human[i].hand && n.finger === human[i].finger) both++
  })
  return { hand: hand / ours.length, finger: both / ours.length }
}

function misses(goal, pressed) {
  const lines = []
  for (let t = 0; t < goal.length; t++) {
    const g = goal[t], p = pressed[t] ?? new Set()
    const fn = [...g].filter(k => !p.has(k)), fp = [...p].filter(k => !g.has(k))
    if (fn.length || fp.length) lines.push(`    ${(t * CONTROL_DT).toFixed(2)}s  missed ${fn.map(k => k + 21).join(',') || '-'}  extra ${fp.map(k => k + 21).join(',') || '-'}`)
  }
  return lines.join('\n')
}

if (flag('--tune')) {
  // coordinate search on the two clips, our fingering
  const songs = ['twinkle_twinkle', 'nocturne'].map(s => {
    const notes = loadMidi(new URL('midi/' + POLICIES[s].midi, here))
    fingerPiece(notes, { ...fingerOpts, splitHands: !handsFromTracks(notes) })
    return notes
  })
  const evalOpts = o => songs.reduce((a, n) => a + runPlanner(n, o).score.f1, 0) / songs.length
  let best = { ...PLANNER_DEFAULTS }, bestF = evalOpts(best)
  log(`start F1 ${pct(bestF)}`)
  const steps = { lead: 0.01, press: 0.004, pad: 0.002, hover: 0.004, wFree: 0.05, wThumbFree: 0.03, aim: 0.002, approach: 0.04, travel: 0.004, wDip: 0.1, dipUp: 0.004, lift: 0.004 }
  for (let round = 0; round < 2; round++) {
    for (const [k, d] of Object.entries(steps)) {
      for (const dir of [-1, 1]) {
        const cand = { ...best, [k]: Math.max(0, best[k] + dir * d) }
        const f = evalOpts(cand)
        if (f > bestF + 1e-4) { best = cand; bestF = f; log(`  ${k} = ${cand[k].toFixed(4)}  F1 ${pct(f)}`) }
      }
    }
  }
  log(JSON.stringify(best))
  process.exit(0)
}

if (files.length) {
  for (const f of files) {
    const notes = loadMidi(f)
    const fp = fingerPiece(notes, { ...fingerOpts, splitHands: !handsFromTracks(notes) })
    const r = runPlanner(notes)
    log(`${basename(f)}  (${notes.length} notes, ${(goalFrames(notes).length * CONTROL_DT).toFixed(1)} s)`)
    row('our planner', r.score, `   fingering ${fp.ms.toFixed(0)} ms, sim ${(r.ms / 1000).toFixed(1)} s`)
    if (flag('--verbose')) log(misses(r.goal, r.pressed))
  }
  process.exit(0)
}

log('RoboPianist physics (MuJoCo 2.3.1 wasm, 200 Hz), RoboPianist metric (20 Hz frames)\n')
for (const song of ['twinkle_twinkle', 'nocturne']) {
  const info = POLICIES[song]
  const notes = loadMidi(new URL('midi/' + info.midi, here))
  const goal = goalFrames(notes)
  log(`${info.title}: ${notes.length} notes, ${goal.length} frames (${(goal.length * CONTROL_DT).toFixed(1)} s)`)

  const actions = readNpy(readFileSync(new URL(`scene/${song}_actions.npy`, here)))
  const replay = new ReplayController(world, actions)
  const pressedRL = rollout(world, replay)
  row('RL policy (recorded actions)', scoreFrames(goal, pressedRL), `   ${actions.shape[0]} frames recorded`)

  const human = notes.map(n => ({ ...n }))
  applyRousseauFingering(song, human)
  const ours = notes.map(n => ({ ...n }))
  const fp = fingerPiece(ours, { ...fingerOpts, splitHands: !handsFromTracks(ours) })
  const agree = fingerAgreement(ours, human)
  const r = runPlanner(ours)
  row('our planner, our fingering', r.score, `   fingering ${fp.ms.toFixed(0)} ms, sim ${(r.ms / 1000).toFixed(1)} s`)
  if (flag('--human')) row('our planner, human fingering', runPlanner(human).score)
  log(`  our fingering vs the human labels: hand ${pct(agree.hand)}%, hand+finger ${pct(agree.finger)}%`)
  if (flag('--verbose')) log(misses(goal, r.pressed))
  log('')
}
