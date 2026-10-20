// Scores #040's analyser on the corpus (corpus.js), clean and through the
// microphone model, as it runs live: audio in 128-sample blocks, beats as
// they are emitted.
//
//   node rhythm/test/eval.js [--clean|--mic|--both] [--only=name,…] [--set=synth|midi|all] [key=value …]
//
// key=value overrides analyser options (analyzer.js DEFAULTS). Renders are
// cached in /tmp/rhythm-corpus.

import fs from 'node:fs'
import { RhythmAnalyzer } from '../analyzer.js'
import { loadSynth, render, synthetic, midiSong, mic, STYLES, MIDI_SET } from './corpus.js'
import { scoreBeats, fMeasure, tempoAcc } from './metrics.js'

const SR = 44100
const CACHE = '/tmp/rhythm-corpus'
fs.mkdirSync(CACHE, { recursive: true })

export async function corpus(set = 'all') {
  const songs = []
  if (set !== 'midi') for (const name of Object.keys(STYLES)) songs.push(synthetic(name, { seconds: 30, seed: name.length * 7 + 3 }))
  if (set !== 'synth') for (const f of MIDI_SET) songs.push(midiSong(f, { seconds: 40 }))
  return songs
}

export async function audioFor(song, cond) {
  const file = `${CACHE}/${song.name}.${cond}.f32`
  if (fs.existsSync(file)) return new Float32Array(fs.readFileSync(file).buffer.slice(0))
  await loadSynth()
  const clean = `${CACHE}/${song.name}.clean.f32`
  let x
  if (fs.existsSync(clean)) x = new Float32Array(fs.readFileSync(clean).buffer.slice(0))
  else { x = render(song.notes, song.seconds, SR, song.programs); fs.writeFileSync(clean, Buffer.from(x.buffer)) }
  if (cond === 'mic') { x = mic(x, SR, { seed: song.name.length }); fs.writeFileSync(file, Buffer.from(x.buffer)) }
  return x
}

export function run(x, opts = {}) {
  const a = new RhythmAnalyzer(SR, opts)
  const beats = [], downbeats = [], lags = [], bpms = []
  const meters = []
  for (let p = 0; p < x.length; p += 128) {
    a.push(x.subarray(p, p + 128), e => {
      if (e.type !== 'beat') return
      beats.push(e.time); if (e.downbeat) downbeats.push(e.time)
      lags.push(a.now - e.time)
      bpms.push([e.time, e.bpm])
      meters.push([e.time, a.meter.beatsPerBar, a.meter.sub, a.meter.swing])
    })
  }
  return { beats, downbeats, lags, bpms, meters, analyzer: a }
}

function refBpmAt(song, t) {
  const b = song.beats
  for (let i = 1; i < b.length; i++) if (b[i] >= t) return 60 / (b[i] - b[i - 1])
  return 60 / (b[b.length - 1] - b[b.length - 2])
}

export function evaluate(song, r) {
  const s = scoreBeats(song.beats, r.beats)
  // tempo: fraction of beats after 8 s whose reported BPM is right
  let a1 = 0, a2 = 0, n = 0
  for (const [t, bpm] of r.bpms) if (t > 8) { const acc = tempoAcc(refBpmAt(song, t), bpm); a1 += acc.acc1; a2 += acc.acc2; n++ }
  // downbeats: only meaningful when the beat level is right (F of downbeats)
  const db = fMeasure(song.downbeats.filter(t => t > 8), r.downbeats.filter(t => t > 8))
  // meter: the last reported beats per bar and subdivision
  const last = r.meters[r.meters.length - 1] || [0, 0, 0, 1]
  // lock: the time of the first of 4 consecutive estimated beats that each match a reference beat (±70 ms) in a row
  let lock = NaN
  for (let j = 0; j + 3 < r.beats.length && isNaN(lock); j++) {
    const idx = r.beats.slice(j, j + 4).map(t => song.beats.findIndex(b => Math.abs(b - t) <= 0.07))
    if (idx.every((v, q) => v >= 0 && (q === 0 || v === idx[q - 1] + 1))) lock = r.beats[j] - song.beats[0]
  }
  const lag = r.lags.length ? r.lags.reduce((x, y) => x + y, 0) / r.lags.length : NaN
  return { ...s, lock, acc1: n ? a1 / n : 0, acc2: n ? a2 / n : 0, db, meter: last[1], sub: last[2], swing: last[3], lag }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const conds = args.includes('--mic') ? ['mic'] : args.includes('--clean') ? ['clean'] : ['clean', 'mic']
  const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',')
  const set = args.find(a => a.startsWith('--set='))?.slice(6) || 'all'
  const opts = {}
  for (const a of args) { const m = a.match(/^(\w+)=(.+)$/); if (m) opts[m[1]] = m[2].includes(',') ? m[2].split(',').map(Number) : Number(m[2]) }
  const songs = (await corpus(set)).filter(s => !only || only.includes(s.name))
  for (const cond of conds) {
    const tot = { lock: 0, nLock: 0, f: 0, cmlt: 0, amlt: 0, acc1: 0, acc2: 0, db: 0, meterOk: 0, n: 0, lag: 0, dbOk: 0, nOk: 0 }
    console.log(`\n== ${cond} ==`)
    console.log('song'.padEnd(22), '   F  CMLt  AMLt  Acc1  Acc2    DB  meter    sub swing  lag ms  lock s')
    for (const song of songs) {
      const x = await audioFor(song, cond)
      const r = run(x, opts)
      const e = evaluate(song, r)
      const meterOk = e.meter === (song.meter === 2 ? 4 : song.meter) || (song.meter === 2 && e.meter === 4) || (song.meter === 4 && e.meter === 4)
      for (const k of ['f', 'cmlt', 'amlt', 'acc1', 'acc2', 'db', 'lag']) tot[k] += e[k]
      tot.meterOk += meterOk; tot.n++
      if (!isNaN(e.lock)) { tot.lock += e.lock; tot.nLock++ }
      if (e.cmlt > 0.8) { tot.dbOk += e.db; tot.nOk++ }
      const pct = v => (100 * v).toFixed(1).padStart(5)
      console.log(song.name.padEnd(22), pct(e.f), pct(e.cmlt), pct(e.amlt), pct(e.acc1), pct(e.acc2), pct(e.db),
        `${e.meter}/${song.meter}`.padStart(6), `${e.sub}/${song.sub}`.padStart(6), e.swing.toFixed(2).padStart(5) + (song.swing ? `/${song.swing}` : '  '), (1000 * e.lag).toFixed(0).padStart(6), e.lock.toFixed(1).padStart(7))
    }
    const pct = v => (100 * v / tot.n).toFixed(1).padStart(5)
    console.log('MEAN'.padEnd(22), pct(tot.f), pct(tot.cmlt), pct(tot.amlt), pct(tot.acc1), pct(tot.acc2), pct(tot.db), `${tot.meterOk}/${tot.n}`.padStart(6), '', '', '', (1000 * tot.lag / tot.n).toFixed(0).padStart(6), (tot.lock / tot.nLock).toFixed(1).padStart(7))
    console.log(`downbeat F on the ${tot.nOk} songs tracked at the right level (CMLt > 80): ${(100 * tot.dbOk / tot.nOk).toFixed(1)}`)
  }
}
