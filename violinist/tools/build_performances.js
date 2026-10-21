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
import { alignScore } from '../../strings/align.js'
import { analyseRecording, encodeRecording, applyRecording, correctLane, f0At, RATE } from '../../strings/expression.js'
import { readLilyPondFiles } from '../../strings/lilypond.js'
import { planArticulation } from '../../strings/articulation.js'
import { fingerLine } from '../../strings/fingering.js'
import { renderPerformance } from '../../strings/sound/performance.js'
import { renderCurves, midiHz } from '../../strings/sound/bowed.js'
import { acousticParams, offlineHall } from '../../concertstage/acoustics.js'
import { matchScore } from '../score-art.js'

const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const here = fileURLToPath(new URL('.', import.meta.url))
const DATA = here + '../../strings/data/BachViolin/', OUT = process.env.OUT || here + '../performances/'
const RECS = here + '../../strings/data/recordings/'
const COLLECTIONS = ['ko-donghwi', 'john-garner', 'minji-kim', 'emil-telmanyi']
const SR = 22050, PASSES = +(process.env.PASSES ?? 3), MODELS = ['source', 'waveguide']

const csv = f => readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(','))
const hms = s => s.split(':').reduce((a, v) => a * 60 + +v, 0)

/**
 * The solo violin's tracks: the one with the index's violinNotes, else the
 * tracks on violinTrack's channel when together they have that many (a part
 * split where it changes instrument: Caprice 24's pizzicato variation, the
 * Tchaikovsky finale), else violinTrack alone.
 */
function soloTracks(e, midi) {
  const one = midi.tracks.filter(t => t.notes.length === e.violinNotes)
  if (one.length === 1) return one
  const ch = midi.tracks[e.violinTrack].channel, same = midi.tracks.filter(t => t.channel === ch && t.notes.length)
  return same.reduce((a, t) => a + t.notes.length, 0) === e.violinNotes ? same : [midi.tracks[e.violinTrack]]
}

/**
 * Every note of the MIDI file (all tracks but drums) with score positions,
 * ordered onset, then pitch; `violin` marks the solo part's (midiViolin's order
 * is the order of the marked notes).
 */
export function midiAll(e, buf) {
  const midi = new Midi(buf)
  const solo = soloTracks(e, midi)
  return midi.tracks.filter(t => t.channel !== 9).flatMap(t => t.notes.map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq, dq: n.durationTicks / midi.header.ppq, violin: solo.includes(t) })))
    .sort((a, b) => a.q - b.q || a.pitch - b.pitch || (b.violin - a.violin))
}

/** The MIDI file's violin notes with score positions (quarters), ordered onset, then pitch. */
export function midiViolin(e, buf) {
  const midi = new Midi(buf)
  const solo = soloTracks(e, midi)
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
export function playedNotes(rec, e, { mode = 'recorded', secs = Infinity, dbPerDyn, vibGain, engine } = {}) {
  const notes = midiViolin(e, readFileSync(here + '../midis/' + e.file)).map(n => ({ ...n, velocity: 0.7 }))
  const expression = applyRecording(rec, notes, { dbPerDyn, vibGain, engine })
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

/**
 * Measure a recording on the MIDI notes A (violin, ordered) played at times T
 * (performedTimes) in audio x, correct the lanes by listening, and write it.
 * opts.ensemble: timing only (opts.tmap: the tempo map of all the parts).
 */
function write(e, A, T, x, meta, { tune = 0, ensemble = false, tmap = null, list, check = false }) {
  const duration = Math.max(...T.off) + 1
  const out = A.map((n, i) => ({ on: T.on[i], off: T.off[i] }))
  let rec, pitched = 0, tuning = 0
  if (ensemble) rec = { rate: RATE, tuning: 0, on: out.map(n => Math.round(n.on * 1000)), off: out.map(n => Math.round(n.off * 1000)), loud: '', cents: [], tmap }
  else {
    // measured in recording time: each MIDI note at its recorded place
    const recNotes = A.map((n, i) => ({ pitch: n.pitch, on: T.src[i], off: T.src[i] + (T.off[i] - T.on[i]) }))
    const an = analyseRecording(x, SR, recNotes, { tune })
    pitched = an.cents.filter(Boolean).length; tuning = an.tuning
    // the violin's pitch where it was placed (at the recording's tuning), against chance
    if (check) meta = { ...meta, check: +pitchCheck(A, T, x, tune + tuning / 100).toFixed(3), chance: +pitchCheck(A, T, x, tune + tuning / 100, 1.5).toFixed(3) }
    // into performance time: pitch curves move with their note, loudness through the map
    const moved = { ...an, loud: warp(an.loud, RATE, T.on, T.src, duration), cents: an.cents.map((c, i) => c && { i0: c.i0 + Math.round((T.on[i] - T.src[i]) * RATE), c: c.c }) }
    // listen and correct (strings/expression.js correctLane), once per physical
    // model: play it, compare the level with the recording's, move the lane; three times
    rec = encodeRecording(moved, out)
    const lanes = {}
    for (const model of MODELS) {
      const { notes: played, expression } = playedNotes(rec, e)
      for (let pass = 0; pass < PASSES; pass++) {
        const y = renderNotes(played, expression, { model })
        correctLane(expression.dyn, moved.loud, analyseRecording(y, SR, played).loud, played)
      }
      lanes[model] = expression.dyn
    }
    rec = encodeRecording({ ...moved, lanes }, out)
  }
  meta = { ...meta, file: e.file, notes: A.length, pitched, seconds: +(Math.max(...T.off)).toFixed(1), ...(ensemble ? { ensemble: true } : {}) }
  writeFileSync(OUT + meta.rec + '.json', JSON.stringify({ ...meta, ...rec }) + '\n')
  // the index as it is now (another build may have written to it meanwhile)
  const now = existsSync(OUT + 'index.json') ? JSON.parse(readFileSync(OUT + 'index.json', 'utf8')) : list
  const k = now.findIndex(r => r.rec === meta.rec); if (k >= 0) now[k] = meta; else now.push(meta)
  now.sort((a, b) => a.file.localeCompare(b.file) || a.violinist.localeCompare(b.violinist))
  writeFileSync(OUT + 'index.json', JSON.stringify(now, null, 1) + '\n')
  return { meta, tuning }
}

// Recordings with no alignment, aligned here (strings/align.js) to the MIDI
// file's notes and its Mutopia score's repeats. Fetched from Wikimedia Commons
// and the Library of Congress National Jukebox (via the Internet Archive) by
// `node violinist/tools/fetch_recordings.js` into strings/data/recordings
// (sources.json there holds each file's page, licence and credit).
// ensemble: the violin plays with others (orchestra, string quartet, voice):
// the alignment uses every part's notes, and only the timing is kept, with a
// tempo map for the accompaniment.
export const RECORDINGS = [
  { id: 'heifetz_bwv1004_mov5', midi: 'bach_1004_5_ciaccona.mid', violinist: 'Jascha Heifetz', year: 1952 },
  { id: 'menuhin_bwv1006_mov1', midi: 'bach_1006_1_preludio.mid', violinist: 'Yehudi Menuhin', year: 1948 },
  { id: 'goodenough_bwv1001_mov1', midi: 'bach_1001_1_adagio.mid', violinist: 'A violinist at Goodenough College', year: 2014 },
  { id: 'qmul_allemanda', midi: ['bach_1002_1_allemanda.mid', 'bach_1004_1_allemanda.mid'], violinist: 'A violinist at Queen Mary University of London', year: 2013 },
  { id: 'vicond_bwv1001_mov1', midi: 'bach_1001_1_adagio.mid', violinist: 'Vicond' },
  { id: 'vicond_bwv1004_mov1', midi: 'bach_1004_1_allemanda.mid', violinist: 'Vicond', year: 2012 },
  { id: 'vicond_bwv1004_mov2', midi: 'bach_1004_2_corrente.mid', violinist: 'Vicond' },
  { id: 'vicond_bwv1004_mov4', midi: 'bach_1004_4_giga.mid', violinist: 'Vicond' },
  { id: 'vicond_bwv1006_mov4', midi: 'bach_1006_4_menuet_1.mid', violinist: 'Vicond' },
  { id: 'kreisler-zimbalist_bwv1043_mov1', midi: 'bach_1043_1_vivace.mid', violinist: 'Fritz Kreisler and Efrem Zimbalist', year: 1915, ensemble: true },
  { id: 'commons_beethoven_op61_mov3', midi: 'beethoven_concerto_3.mid', violinist: 'Unnamed soloist (IMSLP #77611)', ensemble: true },
  // beyond Bach
  { id: 'qmul_paganini_caprice24', midi: 'paganini_caprice_24.mid', violinist: 'A violinist at Queen Mary University of London', year: 2014 },
  { id: 'kulenkampff_beethoven_romance2', midi: 'beethoven_romance_2.mid', violinist: 'Georg Kulenkampff', year: 1932, ensemble: true },
  { id: 'airforce_vivaldi_winter1', midi: 'vivaldi_winter_1.mid', violinist: 'Jessica Dan (Air Force Strings)', year: 1999, ensemble: true },
  { id: 'milman_vivaldi_winter1', midi: 'vivaldi_winter_1.mid', violinist: 'Soloist with Philip Milman\'s orchestra', year: 2022, ensemble: true },
  // not used: Menuhin's Caprice 24 with Adolph Baller (Concert Films, 1948; Commons) does not
  // align (pitch where placed 7 %, chance 2 %): an arrangement with piano, not the solo caprice
  // not used: Albert Spalding's obbligato to Marie Rappold's Ave Maria (Edison cylinder,
  // 1911; Commons) does not align: another arrangement, and the cylinder's speed is unknown
]

/** Share of single notes (0.15 s or more) whose pitch sounds in the middle of where they were placed: a check needing no reference. */
export function pitchCheck(A, T, x, tune = 0, shift = 0) {
  let hit = 0, n = 0
  for (let i = 0; i < A.length; i++) {
    const a = T.src[i] + shift, j = A.findIndex((m, jj) => jj > i && m.q > A[i].q + 1e-6); if (j < 0) continue
    if (A.some((m, jj) => jj !== i && Math.abs(m.q - A[i].q) < 1e-6)) continue
    const b = T.src[j] + shift; if (b - a < 0.15 || b - a > 3) continue
    const f = midiHz(A[i].pitch + tune)
    for (const w of [0.3, 0.5, 0.7]) { const p = f0At(x, SR, Math.round((a + w * (b - a)) * SR), f); n++; if (p && Math.abs(1200 * Math.log2(p / f)) < 60) hit++ }
  }
  return n ? hit / n : NaN
}

const decode = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length >> 2) }

if (import.meta.url === `file://${process.argv[1]}`) {
  const want = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const only = process.argv.includes('--aligned') ? 'aligned' : process.argv.includes('--dataset') ? 'dataset' : null
  const index = JSON.parse(readFileSync(here + '../midis/index.json', 'utf8'))
  mkdirSync(OUT, { recursive: true })
  const list = existsSync(OUT + 'index.json') ? JSON.parse(readFileSync(OUT + 'index.json', 'utf8')) : []
  // ── the Bach Violin Dataset: its own alignments ──
  if (only !== 'aligned' && existsSync(DATA + 'info.csv')) {
    const info = csv(DATA + 'info.csv'), H = info[0]
    const audioCsv = csv(DATA + 'audio.csv'), AH = audioCsv[0]
    for (const row of info.slice(1)) {
      const I = Object.fromEntries(H.map((k, i) => [k, row[i]]))
      if (!COLLECTIONS.includes(I.collection) || (want.length && !want.includes(I.filename))) continue
      const e = index.find(x => x.group === 'bach-solo' && x.file.startsWith(`bach_${I.work.slice(3)}_${I.mov}_`))
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
      const a = audioCsv.find(r => r[0] === I.source_filename), Aud = a ? Object.fromEntries(AH.map((k, i) => [k, a[i]])) : {}
      const { meta, tuning } = write(e, A, T, x, {
        rec: I.filename, violinist: I.violinist_name, title: `${I.title}, ${I.movement}`,
        licence: Aud.license || '', url: Aud.url || '', dataset: 'Bach Violin Dataset (Dong, Wu, Chen & McAuley, ICASSP 2022), https://github.com/salu133445/bach-violin-dataset',
        found: +(T.found / A.length).toFixed(3),
      }, { tune: I.baroque_tuning === '1' ? -1 : 0, list })
      console.log(I.filename.padEnd(32), `${(100 * meta.found).toFixed(1)} % found, pitch on ${meta.pitched} of ${A.length} notes, tuning ${tuning.toFixed(1)} c, ${meta.seconds} s (recorded ${dur} s), ${((performance.now() - t0) / 1000).toFixed(1)} s`)
    }
  }
  // ── other recordings: aligned here ──
  if (only !== 'dataset' && existsSync(RECS + 'sources.json')) {
    const src = JSON.parse(readFileSync(RECS + 'sources.json', 'utf8'))
    for (const R of RECORDINGS) {
      if (want.length && !want.includes(R.id)) continue
      const S = src[R.id]
      if (!S || !existsSync(RECS + S.file)) { console.warn(R.id, ': not fetched'); continue }
      const t0 = performance.now()
      const x = decode(RECS + S.file)
      // the piece: the one given, or the best fitting of several
      let best = null
      for (const file of [R.midi].flat()) {
        const e = index.find(y => y.file === file)
        const all = midiAll(e, readFileSync(here + '../midis/' + file))
        const notes = R.ensemble ? all : all.filter(n => n.violin)
        const r = alignScore(notes, x, SR, { repeats: e.score ? scoreFor(e).repeats : [], transpose: R.ensemble || R.year < 1930 ? [-2, -1, 0, 1, 2] : [-1, 0, 1] })
        if (!best || r.cost < best.r.cost) best = { e, notes, r }
      }
      const { e, notes, r } = best
      // every note at its first performance: performedTimes keeps one pass of a repeat
      const T0 = performedTimes(notes, r.played, Array.from(r.first))
      const vi = notes.map((n, i) => n.violin ? i : -1).filter(i => i >= 0)
      const A = vi.map(i => notes[i])
      const pick = a => Float64Array.from(vi, i => a[i])
      const T = { on: pick(T0.on), off: pick(T0.off), src: pick(T0.src), found: A.length }
      let tmap = null
      if (R.ensemble) {
        const q = [], t = []
        notes.forEach((n, i) => { const k = Math.round(n.q * 480); if (q[q.length - 1] !== k) { q.push(k); t.push(Math.round(T0.on[i] * 1000)) } })
        tmap = { q, t }
      }
      // the violin's pitch where it was placed, against the same with every note 1.5 s late (chance);
      // for a solo recording measured again at its own tuning (write)
      const check = pitchCheck(A, T, x, r.transpose), chance = pitchCheck(A, T, x, r.transpose, 1.5)
      const { meta, tuning } = write(e, A, T, x, {
        rec: R.id, violinist: R.violinist, title: e.title, year: R.year,
        licence: S.licence, url: S.page, source: S.credit, aligned: 'strings/align.js', repeats: r.plan.taken, transpose: r.transpose,
        found: 1, check: +check.toFixed(3), chance: +chance.toFixed(3),
      }, { tune: r.transpose, ensemble: !!R.ensemble, tmap, list, check: !R.ensemble })
      console.log(R.id.padEnd(34), e.file.padEnd(30), `repeats ${JSON.stringify(r.plan.taken)}, ${r.transpose ? `${r.transpose > 0 ? '+' : ''}${r.transpose} st, ` : ''}cost ${r.cost.toFixed(3)}, pitch where placed ${(100 * (meta.check ?? check)).toFixed(0)} % (chance ${(100 * (meta.chance ?? chance)).toFixed(0)} %)${R.ensemble ? ', timing only' : `, pitch on ${meta.pitched} notes, tuning ${tuning.toFixed(0)} c`}, ${meta.seconds} s, ${((performance.now() - t0) / 1000).toFixed(1)} s`)
    }
  }
}
