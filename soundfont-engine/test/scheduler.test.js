// node --test soundfont-engine/test/scheduler.test.js
// MidiScheduler and its worklet: pedal CCs are never dropped and seeks restore
// controller state; OxiSynth itself sustains on CC64 >= 64.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadWorklet } from '../../test/worklet-harness.js'
import { MidiScheduler } from '../src/scheduler.js'

const here = new URL('./', import.meta.url).pathname
const pedal = (time, value, channel = 0) => ({ time, channel, controller: 64, value })
const CC = [pedal(1, 127), pedal(2, 0), pedal(3, 127)]

test('scheduler-worklet: a stalled clock still sends every CC it passed', () => {
  const w = loadWorklet(here + '../src/scheduler-worklet.js')
  w.send({ type: 'load', data: { notes: [{ time: 0, midi: 60, duration: 1 }], cc: CC } })
  w.send({ type: 'play' })
  w.at(2.5)
  assert.deepEqual(w.ccValues(), [127, 0])
})

test('scheduler-worklet: seek resumes from the first CC at or after the target', () => {
  const w = loadWorklet(here + '../src/scheduler-worklet.js')
  w.send({ type: 'load', data: { notes: [{ time: 0 }], cc: CC } })
  w.send({ type: 'seek', data: { time: 2 } })
  assert.equal(w.p.lastCCIdx, 0)
  w.send({ type: 'seek', data: { time: 9 } })
  assert.equal(w.p.lastCCIdx, 2)
})

test('MidiScheduler.seek restores each channel\'s controllers and emits them', () => {
  const calls = [], emitted = []
  const s = new MidiScheduler({ controlChange: (...a) => calls.push(a), allSoundOff() {} })
  s.on('cc', c => emitted.push([c.channel, c.controller, c.value]))
  s.load({ notes: [], controlChanges: [...CC, { time: 1, channel: 1, controller: 7, value: 90 }] })
  s.seek(1.5)
  assert.deepEqual(calls, [[0, 64, 127], [1, 7, 90]])
  assert.deepEqual(emitted, calls)
  calls.length = 0
  s.seek(0.5) // pedal back to its default; volume has no default, so it is left alone
  assert.deepEqual(calls, [[0, 64, 0]])
  calls.length = 0
  s.seek(2) // the event at 2 s is left to the worklet
  assert.deepEqual(calls, [[0, 64, 127], [1, 7, 90]])
})

test('OxiSynth sustains a released note while CC64 >= 64 and releases it when the pedal lifts', async () => {
  const mod = await import('../vendor/oxisynth/oxisynth.js')
  await mod.default({ module_or_path: fs.readFileSync(here + '../vendor/oxisynth/oxisynth_bg.wasm') })
  const font = new Uint8Array(fs.readFileSync(here + '../../soundfonts/Full Grand Piano.sf2'))
  const sr = 44100, block = sr / 10
  // level (dB) of each 100 ms block of a middle C released at 0.3 s
  const render = (events, blocks = 30) => {
    const s = new mod.OxiSynthRaw(sr)
    s.add_soundfont(font); s.program_change(0, 0)
    const db = []
    for (let t = 0; t < blocks; t++) {
      if (t === 0) s.note_on(0, 60, 100)
      if (t === 3) s.note_off(0, 60)
      for (const [at, ch, v] of events) if (at === t) s.control_change(ch, 64, v)
      const b = s.render(block)
      let e = 0
      for (const x of b) e += x * x
      db.push(10 * Math.log10(e / b.length + 1e-20))
    }
    s.free?.()
    return db
  }
  const dry = render([]), held = render([[0, 0, 127]]), lifted = render([[0, 0, 127], [15, 0, 0]])
  const below = render([[0, 0, 63]]), at = render([[0, 0, 64]]), other = render([[0, 1, 127]])
  const late = render([[5, 0, 127]]) // pressed after the key came up: nothing to catch
  assert.ok(held[20] - dry[20] > 40, `held ${held[20].toFixed(0)} dB vs dry ${dry[20].toFixed(0)} dB at 2 s`)
  assert.ok(held[29] > -60, 'still ringing at 3 s with the pedal down')
  assert.ok(lifted[29] < held[29] - 40, 'pedal up releases the note')
  assert.ok(Math.abs(below[20] - dry[20]) < 1, 'CC64 = 63 is pedal up')
  assert.ok(Math.abs(at[20] - held[20]) < 1, 'CC64 = 64 is pedal down')
  assert.ok(Math.abs(other[20] - dry[20]) < 1, 'a pedal on another channel does not sustain')
  assert.ok(Math.abs(late[20] - dry[20]) < 1, 'pedal after key up does not catch the note')
})
