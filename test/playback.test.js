// node --test test/playback.test.js
// PlaybackControls (#014–#024, midiviz_piano) and its MidiClock worklet (#023):
// pedal CCs are never dropped, seeks restore the pedal, pause / resume keeps the position.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { loadWorklet } from './worklet-harness.js'

const root = new URL('../', import.meta.url).pathname
const g = { console, setTimeout }
g.window = g
vm.runInNewContext(fs.readFileSync(root + 'playback_controls.js', 'utf8') + '\nthis.PlaybackControls = PlaybackControls', g)
const { PlaybackControls } = g

const pedal = (time, value, channel = 0) => ({ time, ctrl: 64, controller: 64, value, channel })
const CC = [pedal(1, 127), pedal(2, 0), pedal(3, 127)]

/** A PlaybackControls without DOM or audio; CCs sent to the instrument are collected in `sent`. */
function controls(extra = {}) {
  const pc = Object.create(PlaybackControls.prototype)
  const sent = []
  Object.assign(pc, {
    instrument: { controlChange: (...a) => sent.push(a), resume() {} },
    allNotes: [{ time: 0, midi: 60, duration: 1 }], allCC: CC.map(c => ({ ...c })),
    lastPlayed: -1, lastPlayedCC: -1, playing: false, lapse: 0, duration: 10, speed: 1, start: 0,
    els: {}, onPlay() {}, onNoteOn() {}, trackFilter: () => true, transpose: 0, trackColors: ['#fff'],
    _clock: null, _getAudioContext: () => ({ currentTime: 0 }),
  }, extra)
  return { pc, sent }
}

test('midi_clock_worklet: a stalled clock still sends every CC it passed', () => {
  const w = loadWorklet(root + 'midi_clock_worklet.js')
  w.send({ type: 'load', data: { notes: [{ time: 0, midi: 60, duration: 1 }], cc: CC } })
  w.send({ type: 'play' })
  w.at(2.5) // one 2.5 s stall past the pedal down at 1 s and up at 2 s
  assert.deepEqual(w.ccValues(), [127, 0])
})

test('midi_clock_worklet: seek resumes from the first CC at or after the target', () => {
  const w = loadWorklet(root + 'midi_clock_worklet.js')
  w.send({ type: 'load', data: { notes: [{ time: 0 }], cc: CC } })
  w.send({ type: 'seek', data: { time: 2 } })
  assert.equal(w.p.lastCCIdx, 0) // the CC at 2 s is still to come
  w.send({ type: 'seek', data: { time: 9 } })
  assert.equal(w.p.lastCCIdx, 2)
})

test('midi_clock_worklet: pause and play keep the position', () => {
  const w = loadWorklet(root + 'midi_clock_worklet.js')
  w.send({ type: 'load', data: { notes: [{ time: 0 }], cc: [] } })
  w.send({ type: 'play' }); w.at(3)
  w.send({ type: 'pause' }); w.ctx.currentFrame = 10 * 48000
  w.send({ type: 'play' }); w.at(11)
  assert.equal(w.p.lapseFrames / 48000, 4)
})

test('PlaybackControls: CCs passed in one long frame are all sent', () => {
  const { pc, sent } = controls({ playing: true, _getAudioContext: () => ({ currentTime: 2.5 }) })
  pc.update()
  assert.deepEqual(sent, [[0, 64, 127], [0, 64, 0]])
})

test('PlaybackControls: seek sets the pedal as the song has it there', () => {
  const { pc, sent } = controls()
  pc.seek(1.5)
  assert.deepEqual(sent, [[0, 64, 127]])
  assert.equal(pc.lastPlayedCC, 0)
  sent.length = 0
  pc.seek(0.2) // before any pedal event: pedal up
  assert.deepEqual(sent, [[0, 64, 0]])
  sent.length = 0
  pc.seek(2) // the event at 2 s is left to playback, so the pedal is still down
  assert.deepEqual(sent, [[0, 64, 127]])
  assert.equal(pc.lastPlayedCC, 0)
})

test('PlaybackControls: unloading a song lifts its pedals', () => {
  const { pc, sent } = controls()
  pc._reset()
  assert.deepEqual(sent, [[0, 64, 0], [0, 66, 0], [0, 67, 0]])
})

test('PlaybackControls (#023 background clock): resume keeps the position', async () => {
  const log = []
  const clock = { load: () => log.push('load'), seek: t => log.push('seek ' + t), setSpeed() {}, play: () => log.push('play'), pause: () => log.push('pause') }
  const { pc } = controls({ useBackgroundClock: true, allCC: [] })
  pc._ensureClock = async function () { this._clock = clock }
  const tick = () => new Promise(r => setTimeout(r))
  pc.seek(4); pc.play(); await tick()                       // seek before the clock exists
  pc.pause(); pc.lapse = 6; pc.play(); await tick()          // plain resume: no reload
  pc.pause(); pc.seek(2); pc.play(); await tick()            // seek while paused
  pc.playing = false; pc.lapse = 12; pc.play(); await tick() // play after the end starts over
  pc.allNotes = [{ time: 0 }]; pc.lapse = 0; pc.playing = false; pc.play(); await tick() // new song
  assert.deepEqual(log, ['load', 'seek 4', 'play', 'pause', 'play', 'pause', 'seek 2', 'play', 'seek 0', 'play', 'load', 'play'])
})
