// Recorded performances of Bach's Sonatas and Partitas for #034: how four
// violinists in the Bach Violin Dataset (Dong et al., ICASSP 2022) played
// the notes of our MIDI files, measured from their recordings
// (strings/expression.js): timing, loudness and each note's pitch curve.
// Writes violinist/performances/<recording>.json and index.json, read by
// strings/expression.js applyRecording (#034: Performance menu).
//
//   node violinist/tools/build_performances.js [recording …]
//
// Needs the dataset in strings/data/BachViolin (node strings/test/ab_recording.js
// downloads it) and ffmpeg. Only the collections whose recordings may be
// shared with attribution are used: Emil Telmányi (public domain), John Garner,
// Ko Donghwi (Team DR) and MinJi Kim (CC BY 3.0). The data written are
// measurements of the recordings, no audio.
//
// The dataset's score notes are aligned to each recording; they are matched to
// the MIDI file's violin notes by pitch sequence (alignPitches). Where the
// player takes a repeat our MIDI does not, one pass is kept: the clock skips
// the other (the time between two MIDI notes whose recorded notes are not
// neighbours is the local tempo's), and the loudness is read through the same
// map. MIDI notes the alignment did not find are placed between their found
// neighbours by score position.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { alignPitches } from './build_editions.js'
import { analyseRecording, encodeRecording, applyRecording, correctLane, RATE } from '../../strings/expression.js'
import { readLilyPondFiles } from '../../strings/lilypond.js'
import { planArticulation } from '../../strings/articulation.js'
import { fingerLine } from '../../strings/fingering.js'
import { renderPerformance } from '../../strings/sound/performance.js'
import { renderCurves } from '../../strings/sound/bowed.js'
import { acousticParams, offlineHall } from '../../concertstage/acoustics.js'
import { matchScore } from '../score-art.js'

const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const here = fileURLToPath(new URL('.', import.meta.url))
const DATA = here + '../../strings/data/BachViolin/', OUT = here + '../performances/'
const COLLECTIONS = ['ko-donghwi', 'john-garner', 'minji-kim', 'emil-telmanyi']
const SR = 22050, PASSES = +(process.env.PASSES ?? 3)

const csv = f => readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(','))
const hms = s => s.split(':').reduce((a, v) => a * 60 + +v, 0)

/** The MIDI file's violin notes with score positions (quarters), ordered onset, then pitch. */
export function midiViolin(e, buf) {
  const midi = new Midi(buf)
  let solo = midi.tracks.filter(t => t.notes.length === e.violinNotes)
  if (solo.length !== 1) solo = [midi.tracks[e.violinTrack]]
  return solo.flatMap(t => t.notes).map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq, dq: n.durationTicks / midi.header.ppq })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
}

const scores = new Map()
/** A piece's Mutopia score (violinist/scores), read once. */
export function scoreFor(e) {
  if (!scores.has(e.file)) { const sc = e.score; scores.set(e.file, readLilyPondFiles(new Map(sc.files.map(f => [f, readFileSync(here + '../scores/' + f, 'utf8')])), { main: sc.main, part: sc.part })) }
  return scores.get(e.file)
}

/**
 * A piece's violin notes played as the recording did (mode 'recorded': its
 * timing, pitch curves and lane; 'rules': its timing only), bowed from the
 * score, the first `secs` seconds, chords thinned to two notes as #034 does,
 * fingered. Returns { notes, expression }.
 */
export function playedNotes(rec, e, { mode = 'recorded', secs = Infinity, dbPerDyn, vibGain } = {}) {
  const notes = midiViolin(e, readFileSync(here + '../midis/' + e.file)).map(n => ({ ...n, velocity: 0.7 }))
  const expression = applyRecording(rec, notes, { dbPerDyn, vibGain })
  if (mode === 'rules') for (const n of notes) delete n.rec
  if (e.score) { matchScore(notes, scoreFor(e).notes); planArticulation(notes, { mode: 'score' }) }
  const play = notes.filter(n => n.on < secs).map(n => ({ ...n, off: Math.min(n.off, secs + 0.5) })).sort((a, b) => a.on - b.on || b.pitch - a.pitch)
  const thin = []
  for (let i = 0; i < play.length;) { let j = i; while (j < play.length && play[j].on - play[i].on < 0.03) j++; thin.push(...play.slice(i, j).slice(0, 2)); i = j }
  fingerLine(thin, { instrument: 'violin' })
  return { notes: thin, expression: mode === 'rules' ? null : expression }
}

/** Render notes on a physical model through the #030 hall (recital, front); mono. */
export function renderNotes(notes, expression, { sr = SR, model = 'source', body = 'phil' } = {}) {
  const perf = renderPerformance(notes, { instrument: 'violin', seed: 7, expression })
  const [L, R] = renderCurves(perf, { sampleRate: sr, model, params: { body }, tail: 1 })
  const P = new Float32Array(2 * L.length); P.set(L, 0); P.set(R, L.length)
  offlineHall(acousticParams({ room: 'recital', seat: 'front' }), sr)(P, L.length)
  return P.subarray(0, L.length)
}

/**
 * Times for the MIDI notes A (ordered, with q, dq) from the recorded notes B
 * ({ on, off }, ordered) and pair (A index → B index or −1). Returns
 * { on, off, src (recorded time of each MIDI onset, for reading the audio), found }.
 */
export function performedTimes(A, B, pair) {
  const N = A.length, on = new Float64Array(N), off = new Float64Array(N), src = new Float64Array(N)
  // unique onsets in A, each with its found notes
  const groups = []
  for (let i = 0; i < N;) { let j = i; while (j < N && Math.abs(A[j].q - A[i].q) < 1e-6) j++; groups.push({ q: A[i].q, idx: [...Array(j - i).keys()].map(k => i + k) }); i = j }
  for (const g of groups) {
    const f = g.idx.filter(i => pair[i] >= 0)
    g.rec = f.length ? f.map(i => B[pair[i]].on).sort((a, b) => a - b)[f.length >> 1] : null
    g.b = f.length ? Math.min(...f.map(i => pair[i])) : null
    g.b1 = f.length ? Math.max(...f.map(i => pair[i])) : null
  }
  // seconds per quarter around each group, from found neighbours that are contiguous
  const spq = k => {
    const pts = []
    for (let d = 1; d <= 8 && pts.length < 4; d++) for (const j of [k - d, k + d]) {
      const a = groups[j], b = groups[j + 1]
      if (a?.rec != null && b?.rec != null && b.b - a.b1 <= 3 && b.b > a.b1 && b.rec > a.rec) pts.push((b.rec - a.rec) / (b.q - a.q))
    }
    pts.sort((x, y) => x - y)
    return pts.length ? pts[pts.length >> 1] : 0.6
  }
  // the clock, from one found group to the next (A → B, with unfound groups U
  // between them):
  //   the recording has about as many notes between them as U: the same music,
  //     the recorded step (U's notes were misread, or not quite matched)
  //   it has none but U is long: music our MIDI has and the player skipped (a
  //     first-time bar), the recorded step plus U at the local tempo
  //   it has many more, or goes back: a repeat the player took (or one our
  //     MIDI writes out and the player did not), the local tempo
  const F = groups.map((g, k) => g.rec != null ? k : -1).filter(k => k >= 0)
  if (!F.length) throw new Error('no notes found in the recording')
  let t = groups[F[0]].rec
  for (let k = 0; k <= F[0]; k++) { groups[k].t = t - spq(F[0]) * (groups[F[0]].q - groups[k].q); groups[k].s = groups[k].t }
  for (let f = 1; f < F.length; f++) {
    const a = groups[F[f - 1]], b = groups[F[f]], U = groups.slice(F[f - 1] + 1, F[f])
    const nU = U.reduce((p, g) => p + g.idx.length, 0), between = b.b - a.b1 - 1, step = b.rec - a.rec, tempo = spq(F[f])
    let dt, sA = a.rec, sB = b.rec
    if (step > 0 && between <= nU + 3 && (between >= nU - 3 || nU <= 3) && step < 4 * tempo * (b.q - a.q) + 0.5) dt = step
    else if (step > 0 && between <= 3 && step < 4 * tempo * (U[0]?.q - a.q || b.q - a.q) + 0.5) dt = step + tempo * (b.q - U[0].q)
    else { dt = tempo * (b.q - a.q); sB = sA + dt }
    b.t = a.t + dt
    U.forEach(g => { const w = (g.q - a.q) / (b.q - a.q); g.t = a.t + w * dt; g.s = sA + w * (sB - sA) })
    b.s = b.rec
  }
  const last = F[F.length - 1]
  for (let k = last + 1; k < groups.length; k++) { groups[k].t = groups[last].t + spq(last) * (groups[k].q - groups[last].q); groups[k].s = groups[last].s + (groups[k].t - groups[last].t) }
  for (const g of groups) for (const i of g.idx) {
    on[i] = g.t; src[i] = g.s
    const m = pair[i] >= 0 ? B[pair[i]] : null
    const d = m && m.off > m.on ? m.off - m.on : spq(groups.indexOf(g)) * A[i].dq * 0.95
    off[i] = g.t + d
  }
  return { on, off, src, found: pair.filter(p => p >= 0).length }
}

/** Read the recording's loudness frames through the output → recording map (onsets of both). */
export function warp(loud, rate, outOn, srcOn, duration) {
  const n = Math.ceil(duration * rate), out = new Float32Array(n)
  const idx = [...outOn.keys()].sort((a, b) => outOn[a] - outOn[b])
  let j = 0
  for (let k = 0; k < n; k++) {
    const t = k / rate
    while (j + 1 < idx.length && outOn[idx[j + 1]] <= t) j++
    const i = idx[j]
    // the recording's clock runs on from the last onset (straight through, or after a skipped repeat)
    const r = srcOn[i] + (t - outOn[i])
    const u = Math.max(0, Math.min(loud.length - 1, r * rate)), f = Math.floor(u)
    out[k] = loud[f] + ((loud[f + 1] ?? loud[f]) - loud[f]) * (u - f)
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(DATA + 'info.csv')) { console.error('no dataset: run node strings/test/ab_recording.js first'); process.exit(1) }
  const info = csv(DATA + 'info.csv'), H = info[0]
  const audioCsv = csv(DATA + 'audio.csv'), AH = audioCsv[0]
  const index = JSON.parse(readFileSync(here + '../midis/index.json', 'utf8')).filter(e => e.group === 'bach-solo')
  const want = process.argv.slice(2)
  mkdirSync(OUT, { recursive: true })
  const list = existsSync(OUT + 'index.json') ? JSON.parse(readFileSync(OUT + 'index.json', 'utf8')) : []
  for (const row of info.slice(1)) {
    const I = Object.fromEntries(H.map((k, i) => [k, row[i]]))
    if (!COLLECTIONS.includes(I.collection) || (want.length && !want.includes(I.filename))) continue
    const e = index.find(x => x.file.startsWith(`bach_${I.work.slice(3)}_${I.mov}_`))
    if (!e) continue
    const t0 = performance.now()
    const A = midiViolin(e, readFileSync(here + '../midis/' + e.file))
    const notes = csv(DATA + `notes/${I.collection}/${I.filename}.csv`).slice(1), al = csv(DATA + `alignments/${I.collection}/${I.filename}.csv`).slice(1)
    const B = notes.map((n, i) => ({ q: +n[0] / 24, pitch: +n[2], on: +al[i][0], off: +al[i][1] })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
    const pair = alignPitches(A.map(n => n.pitch), B.map(n => n.pitch))
    const T = performedTimes(A, B, pair)
    // the movement's audio (alignment times are from its start)
    const start = hms(I.start), dur = hms(I.end) - start
    const buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', String(dur + 1), '-i', DATA + `audio/${I.collection}/${I.source_filename}`, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
    const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length >> 2)
    // measured in recording time: each MIDI note at its recorded place
    const recNotes = A.map((n, i) => ({ pitch: n.pitch, on: T.src[i], off: T.src[i] + (T.off[i] - T.on[i]) }))
    const an = analyseRecording(x, SR, recNotes, { tune: I.baroque_tuning === '1' ? -1 : 0 })
    // into performance time: pitch curves move with their note, loudness through the map
    const duration = Math.max(...T.off) + 1
    const out = A.map((n, i) => ({ on: T.on[i], off: T.off[i] }))
    const moved = { ...an, loud: warp(an.loud, RATE, T.on, T.src, duration), cents: an.cents.map((c, i) => c && { i0: c.i0 + Math.round((T.on[i] - T.src[i]) * RATE), c: c.c }) }
    // listen and correct (strings/expression.js correctLane): play it on the
    // Source model, compare the level with the recording's, move the lane; three times
    let rec = encodeRecording(moved, out)
    const { notes: played, expression } = playedNotes(rec, e)
    for (let pass = 0; pass < PASSES; pass++) {
      const y = renderNotes(played, expression)
      correctLane(expression.dyn, moved.loud, analyseRecording(y, SR, played).loud, played)
    }
    rec = encodeRecording({ ...moved, dyn: expression.dyn }, out)
    const a = audioCsv.find(r => r[0] === I.source_filename), Aud = a ? Object.fromEntries(AH.map((k, i) => [k, a[i]])) : {}
    const meta = {
      rec: I.filename, violinist: I.violinist_name, file: e.file, title: `${I.title}, ${I.movement}`,
      licence: Aud.license || '', url: Aud.url || '', dataset: 'Bach Violin Dataset (Dong, Wu, Chen & McAuley, ICASSP 2022), https://github.com/salu133445/bach-violin-dataset',
      notes: A.length, found: +(T.found / A.length).toFixed(3), pitched: an.cents.filter(Boolean).length, seconds: +(Math.max(...T.off)).toFixed(1),
    }
    writeFileSync(OUT + I.filename + '.json', JSON.stringify({ ...meta, ...rec }) + '\n')
    const k = list.findIndex(r => r.rec === meta.rec); if (k >= 0) list[k] = meta; else list.push(meta)
    console.log(I.filename.padEnd(32), `${(100 * meta.found).toFixed(1)} % found, pitch on ${meta.pitched} of ${A.length} notes, tuning ${an.tuning.toFixed(1)} c, ${meta.seconds} s (recorded ${dur} s), ${((performance.now() - t0) / 1000).toFixed(1)} s`)
  }
  list.sort((a, b) => a.file.localeCompare(b.file) || a.violinist.localeCompare(b.violinist))
  writeFileSync(OUT + 'index.json', JSON.stringify(list, null, 1) + '\n')
}
