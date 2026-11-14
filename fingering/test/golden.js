#!/usr/bin/env node
// Golden baseline for the fingering engine: what it gives every note today, so
// a change to fingering.js can be checked note by note against it.
//
//   node fingering/test/golden.js record [--set=quick|all] [--only=substr]
//   node fingering/test/golden.js diff   [--set=quick|all] [--only=substr] [--verbose] [--opts='{..}']
//
// Inputs: every exercise of exercises.js, and the song list the pages offer
// (PlaybackControls.defaultMidiFiles, as #032 shows it); --set=quick takes the
// exercises and the "Selections" group only. Each runs as #032 runs it:
// midiToSchedule, channel 10 and keys off the piano dropped, hands from
// fingering/hands.js in the default mode ('crossings'), then fingerPiece in a
// fresh copy, once with the default options and once with CHOPIN.
//
// Recorded per piece and preset: hand and finger of every note (schedule
// order), the early releases, the total cost, the held-key conflicts
// (heldConflicts) and the time it took. Kept in
// fingering/test/golden/<preset>.json. `diff` re-runs and reports, per piece,
// how many notes changed hand or finger, changed releases, the cost, the
// held-key conflicts and the time against the recording; it exits 1 when any note changed (timing alone
// never fails it). --opts adds options on top of each preset (e.g. to try a
// weight before changing DEFAULTS).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { exercises } from '../exercises.js'
import { fingerPiece, CHOPIN } from '../fingering.js'
import { assignHands, DEFAULT_HAND_MODE } from '../hands.js'
import { LOW, HIGH } from '../keyboard.js'
import { midiToSchedule } from '../../notation3d/midi-score.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIR = fileURLToPath(new URL('./golden/', import.meta.url))
const PRESETS = { default: {}, chopin: CHOPIN }
const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')

/** The pieces: [{ id, notes: () => fingerPiece input }]. */
export function pieces(set = 'all') {
  const out = exercises().map(ex => ({ id: 'ex:' + ex.id, notes: () => ex.notes.map(n => ({ ...n })) }))
  const src = readFileSync(ROOT + 'playback_controls.js', 'utf8')
  const list = src.slice(src.indexOf('defaultMidiFiles'), src.indexOf('];', src.indexOf('defaultMidiFiles')))
  let group = ''
  const seen = new Set()
  for (const m of list.matchAll(/\{\s*value:\s*'([^']*)',\s*label:\s*(['"])(.*?)\2/g)) {
    const [, file, , label] = m
    if (!file) { group = label.replace(/=+/g, '').trim(); continue }
    if (set === 'quick' && group !== 'Selections') continue
    if (seen.has(file) || !existsSync(ROOT + file)) continue
    seen.add(file)
    out.push({ id: file, notes: () => songNotes(ROOT + file) })
  }
  return out
}

/** A MIDI file's notes as 032_pianist.html hands them to the fingering worker. */
export function songNotes(path) {
  const s = midiToSchedule(new Midi(readFileSync(path)))
  const notes = s.notes.filter(n => n.channel !== 9 && n.midi >= LOW && n.midi <= HIGH)
  assignHands(notes, s.trackNames, DEFAULT_HAND_MODE)
  return notes.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, velocity: n.velocity, ...(n.hand ? { hand: n.hand } : {}) }))
}

/**
 * Held-key conflicts: a finger that strikes a new key while the key it struck
 * before is still down (more than 0.1 s of ordinary legato overlap left, after
 * any early release). Mechanical Pianist's "no finger is ever holding two
 * keys" test; a quality figure for the diff, lower is better. Not counted: a
 * note with no finger (finger 0: more keys at once than the hand has units,
 * see unfingered), and the keys of one slice that a finger plays together on
 * purpose (n.shared: the thumb across two keys, a cluster under the flat of
 * the hand), and a copy of a key let go as it sounds (release at its onset).
 * Notes need pitch, on, off, hand, finger, release and shared.
 */
export function heldConflicts(notes, slack = 0.1) {
  let bad = 0
  for (const hand of ['L', 'R']) {
    // (a copy of a key struck twice at once that its finger leaves as it
    // sounds, release at its onset, isn't held by anything: fingerPiece's dups)
    const list = notes.filter(n => n.hand === hand && n.finger >= 1 && !(n.release <= n.on)).sort((a, b) => a.on - b.on)
    for (let i = 0; i < list.length; i++) {
      const end = Math.min(list[i].off, list[i].release ?? Infinity)
      for (let j = i + 1; j < list.length && list[j].on < end - slack; j++) {
        const a = list[i], b = list[j]
        if (b.finger !== a.finger || b.pitch === a.pitch) continue
        if ((a.shared || b.shared) && b.on - a.on <= 0.035) continue
        bad++
      }
    }
  }
  return bad
}

/** Notes left without a finger (finger 0). */
export const unfingered = notes => notes.filter(n => !(n.finger >= 1)).length

/** The notes as a recording fingered them (hand, finger, release onto copies). */
function asRecorded(notes, g) {
  return notes.map((n, i) => ({ ...n, hand: g.fingers[2 * i], finger: +g.fingers[2 * i + 1], release: g.release[i], ...(g.shared?.[i] ? { shared: g.shared[i] } : {}) }))
}

const merge = (preset, extra) => ({ ...preset, ...extra, weights: { ...preset.weights, ...extra.weights } })

/** Run one piece: { fingers: 'R3L1…', release: { i: t }, cost, ms, n }. */
export function runPiece(notes, options) {
  const r = fingerPiece(notes, options)
  let fingers = ''
  const release = {}, shared = {}
  notes.forEach((n, i) => {
    fingers += (n.hand || '?') + (n.finger || 0)
    if (n.release != null) release[i] = +n.release.toFixed(4)
    if (n.shared) shared[i] = n.shared
  })
  return { n: notes.length, fingers, release, shared, cost: +r.cost.toFixed(3), ms: Math.round(r.ms), held: heldConflicts(notes), unfingered: unfingered(notes) }
}

function compare(a, b) {
  let hand = 0, finger = 0
  const where = []
  for (let i = 0; i < a.n; i++) {
    const [ha, fa, hb, fb] = [a.fingers[2 * i], a.fingers[2 * i + 1], b.fingers[2 * i], b.fingers[2 * i + 1]]
    if (ha !== hb) hand++
    else if (fa !== fb) finger++
    else continue
    if (where.length < 8) where.push(`#${i} ${ha}${fa}→${hb}${fb}`)
  }
  const ks = new Set([...Object.keys(a.release), ...Object.keys(b.release)])
  let release = 0
  for (const k of ks) if (a.release[k] !== b.release[k]) release++
  return { hand, finger, release, where }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd = 'diff', ...rest] = process.argv.slice(2)
  const args = Object.fromEntries(rest.map(a => a.replace(/^--/, '').split(/=(.*)/s)).map(([k, v]) => [k, v ?? true]))
  const extra = args.opts ? JSON.parse(args.opts) : {}
  const set = args.set || 'all'
  const list = pieces(set).filter(p => !args.only || p.id.includes(args.only))
  if (cmd !== 'record' && cmd !== 'diff') { console.error('usage: golden.js record|diff [--set=quick|all] [--only=..] [--opts=..] [--verbose]'); process.exit(2) }
  mkdirSync(DIR, { recursive: true })
  let changedPieces = 0, changedNotes = 0, totalNotes = 0
  for (const [name, preset] of Object.entries(PRESETS)) {
    const file = DIR + name + '.json'
    const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { pieces: {} }
    const now = { ...old, pieces: { ...old.pieces } }
    let msOld = 0, msNew = 0, costOld = 0, costNew = 0, heldOld = 0, heldNew = 0, zeroOld = 0, zeroNew = 0, relOld = 0, relNew = 0
    console.log(`── ${name} (${list.length} pieces) ──`)
    for (const p of list) {
      const notes = p.notes()
      const r = runPiece(notes, merge(preset, extra))
      totalNotes += r.n
      if (cmd === 'record') { now.pieces[p.id] = r; if (args.verbose) console.log(`  ${p.id}  ${r.n} notes  ${r.ms} ms`); continue }
      const g = old.pieces[p.id]
      if (!g) { console.log(`  ? ${p.id}: not recorded`); continue }
      if (g.n !== r.n) { console.log(`  ✗ ${p.id}: ${g.n} notes recorded, ${r.n} now (input changed?)`); changedPieces++; continue }
      const d = compare(g, r)
      const held = heldConflicts(asRecorded(p.notes(), g)), zero = g.unfingered ?? g.fingers.split('').filter((c, k) => k % 2 && c === '0').length
      msOld += g.ms; msNew += r.ms; costOld += g.cost; costNew += r.cost; heldOld += held; heldNew += r.held; zeroOld += zero; zeroNew += r.unfingered
      relOld += Object.keys(g.release).length; relNew += Object.keys(r.release).length
      const moved = d.hand + d.finger
      if (moved || d.release) {
        changedPieces++; changedNotes += moved
        console.log(`  ✗ ${p.id}: ${d.finger} finger, ${d.hand} hand, ${d.release} release changes of ${r.n}  cost ${g.cost} → ${r.cost}  held ${held} → ${r.held}  unfingered ${zero} → ${r.unfingered}  ${g.ms} → ${r.ms} ms${args.verbose ? '\n      ' + d.where.join('  ') : ''}`)
      } else if (args.verbose) console.log(`  ✓ ${p.id}  ${g.ms} → ${r.ms} ms`)
    }
    if (cmd === 'record') {
      // a partial record (--only, --set=quick) updates those pieces and keeps the rest
      now.recorded = new Date().toISOString()
      writeFileSync(file, JSON.stringify(now, null, 0).replace(/\},"/g, '},\n"'))
      console.log(`  recorded ${list.length} pieces → ${file.replace(ROOT, '')}`)
    } else console.log(`  time ${(msOld / 1000).toFixed(1)} s → ${(msNew / 1000).toFixed(1)} s, cost ${costOld.toFixed(0)} → ${costNew.toFixed(0)}, held-key conflicts ${heldOld} → ${heldNew}, unfingered ${zeroOld} → ${zeroNew}, early releases ${relOld} → ${relNew}`)
  }
  if (cmd === 'diff') {
    console.log(changedPieces ? `\n${changedPieces} piece/preset runs changed, ${changedNotes} notes of ${totalNotes}` : `\nidentical: ${totalNotes} notes`)
    process.exit(changedPieces ? 1 : 0)
  }
}
