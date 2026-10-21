// A/B the bowings of Bach's Sonatas and Partitas by ear: the same MIDI notes,
// at the same timing, bowed as Mutopia's score (Bach-Gesellschaft slurs), as
// Herrmann's edition (Schirmer 1900) and as Auer's (Carl Fischer 1917), the
// last two read from their IMSLP scans (violinist/editions). Only the bowing
// differs between the files.
//
//   node strings/test/ab_editions.js [--file=bach_1001_2_fuga.mid] [--from=auto] [--secs=20]
//        [--engine=source] [--body=phil] [--room=recital] [--all]
//
// --from=auto picks the excerpt where Herrmann and Auer slur the most note
// pairs differently. --all renders the default set of movements. Writes,
// level-matched, into the git-ignored strings/data/compare/editions/: one
// file per bowing and one A/B file (Mutopia, Herrmann, Auer, 1 s apart), and
// prints what differs: bow strokes, notes per bow, bow signs, and where the
// two editions disagree.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves } from '../sound/bowed.js'
import { acousticParams, offlineHall } from '../../concertstage/acoustics.js'
import { writeWav, rms } from './audio-util.js'
import { readLilyPondFiles } from '../lilypond.js'
import { planArticulation } from '../articulation.js'
import { matchScore, applyEdition } from '../../violinist/score-art.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const SECS = +arg('secs', 20), ENGINE = arg('engine', 'source'), BODY = arg('body', 'phil'), ROOM = arg('room', 'recital')
const SR = 48000
const V = here + '../../violinist/', OUT = here + '../data/compare/editions/'
const index = JSON.parse(readFileSync(V + 'midis/index.json', 'utf8'))
const ED = Object.fromEntries(['herrmann', 'auer'].map(k => [k, JSON.parse(readFileSync(V + `editions/${k}.json`, 'utf8'))]))
const DEFAULT = ['bach_1001_2_fuga.mid', 'bach_1001_4_presto.mid', 'bach_1002_1_allemanda.mid', 'bach_1004_5_ciaccona.mid', 'bach_1006_1_preludio.mid']

// the violin notes of a MIDI file with times, in the order the edition files use (onset, pitch)
function midiNotes(e) {
  const midi = new Midi(readFileSync(V + 'midis/' + e.file))
  let solo = midi.tracks.filter(t => t.notes.length === e.violinNotes)
  if (solo.length !== 1) solo = [midi.tracks[e.violinTrack]]
  return solo.flatMap(t => t.notes).map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq, on: n.time, off: n.time + n.duration, velocity: n.velocity }))
    .sort((a, b) => a.q - b.q || a.pitch - b.pitch)
}

function bowings(e) {
  const out = {}
  const sc = readLilyPondFiles(new Map(e.score.files.map(f => [f, readFileSync(V + 'scores/' + f, 'utf8')])), { main: e.score.main, part: e.score.part })
  const mut = midiNotes(e); matchScore(mut, sc.notes); planArticulation(mut, { mode: 'score' }); out.mutopia = mut
  for (const k of Object.keys(ED)) {
    const ns = midiNotes(e)
    if (!applyEdition(ED[k].pieces[e.file], ns)) continue
    planArticulation(ns, { mode: 'score' }); out[k] = ns
  }
  return out
}

// stroke starts: the onsets (chords once) where a new bow begins; the notes the edition could
// not find ('?') are left out of the comparison
function starts(ns, piece) {
  const m = new Map()
  ns.forEach((n, k) => {
    const t = Math.round(n.on * 100) / 100
    if (piece && piece.stroke[k] === '?') { m.set(t, null); return }
    if (m.get(t) === null) return
    m.set(t, (m.get(t) || false) || !n.art?.slurPrev)
  })
  return m
}
function differ(B, e, from = 0, to = Infinity) {
  const h = starts(B.herrmann, ED.herrmann.pieces[e.file]), a = starts(B.auer, ED.auer.pieces[e.file]), out = []
  let both = 0
  for (const [t, x] of h) { if (t < from || t >= to) continue; const y = a.get(t); if (x == null || y == null) continue; both++; if (x !== y) out.push(t - from) }
  return { at: out, of: both }
}
// excerpt with the most onsets where Herrmann and Auer differ on starting a new bow
function pickFrom(B, e) {
  const all = differ(B, e).at, end = Math.max(...B.herrmann.map(n => n.off))
  let best = 0, bestN = -1
  for (let t = 0; t + SECS <= end + 0.01; t += 1) { const n = all.filter(x => x >= t && x < t + SECS).length; if (n > bestN) { bestN = n; best = t } }
  return best
}

function excerpt(ns, from) {
  let notes = ns.filter(n => n.on >= from - 1e-3 && n.on < from + SECS - 0.2).map(n => ({ ...n, art: n.art && { ...n.art }, on: n.on - from, off: Math.min(n.off, from + SECS) - from }))
  // chords: the top two notes, as the pages play them (the art of the dropped notes goes with them)
  notes.sort((a, b) => a.on - b.on || b.pitch - a.pitch)
  const thin = []
  for (let i = 0; i < notes.length;) { let j = i; while (j < notes.length && notes[j].on - notes[i].on < 0.03) j++; thin.push(...notes.slice(i, j).slice(0, 2)); i = j }
  return thin
}

// bow strokes: a new stroke on every note not slurred to the one before (chords count once)
function strokes(notes) {
  const ons = [], bows = { up: 0, down: 0 }
  let last = -1
  for (const n of notes) {
    if (n.art?.bow) bows[n.art.bow]++
    if (Math.abs(n.on - last) < 0.03) continue
    last = n.on; if (!n.art?.slurPrev) ons.push(n.on)
  }
  const chords = new Set(notes.map(n => Math.round(n.on * 30))).size
  return { strokes: ons.length, perBow: chords / Math.max(1, ons.length), bows }
}

function render(notes) {
  const perf = renderPerformance(notes, { instrument: 'violin', seed: 7 })
  const [L, R] = renderCurves(perf, { sampleRate: SR, model: ENGINE, params: { body: BODY } })
  const N = Math.round((SECS + 1.5) * SR), P = new Float32Array(2 * N)
  P.set(L.subarray(0, N), 0); P.set(R.subarray(0, N), N)
  if (ROOM !== 'dry') offlineHall(acousticParams({ room: ROOM, seat: 'front' }), SR)(P, N)
  return [P.subarray(0, N), P.subarray(N)]
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
mkdirSync(OUT, { recursive: true })
const files = process.argv.includes('--all') ? DEFAULT : [arg('file', 'bach_1001_2_fuga.mid')]
const made = []
for (const file of files) {
  const e = index.find(x => x.file === file)
  if (!e?.score) { console.warn(file, ': no score'); continue }
  const B = bowings(e)
  if (!B.herrmann || !B.auer) { console.warn(file, ': not in both editions'); continue }
  const fa = arg('from', 'auto'), from = fa === 'auto' ? pickFrom(B, e) : +fa
  const tag = `${file.replace('.mid', '')}_${from}-${from + SECS}s`
  console.log(`\n${e.title}, ${fmt(from)}–${fmt(from + SECS)}`)
  const parts = [], stats = {}
  const ex = Object.fromEntries(Object.entries(B).map(([k, ns]) => [k, excerpt(ns, from)]))
  // where the two editions differ, as times in the excerpt
  const D = differ(B, e, from, from + SECS - 0.2), dif = D.at
  for (const [k, notes] of Object.entries(ex)) {
    fingerLine(notes, { instrument: 'violin' })
    const s = strokes(notes); stats[k] = s
    const [L, R] = render(notes), g = 0.08 / (rms(L) || 1)
    parts.push([k, L.map(v => v * g), R.map(v => v * g)])
    console.log(`  ${k.padEnd(9)} ${String(s.strokes).padStart(4)} bow strokes, ${s.perBow.toFixed(2)} notes per bow, signs ${s.bows.down}⊓ ${s.bows.up}V`)
  }
  console.log(`  Herrmann and Auer differ on a new bow at ${dif.length} of ${D.of} onsets` + (dif.length ? `, first at ${dif.slice(0, 6).map(t => t.toFixed(1) + ' s').join(', ')}` : ''))
  for (const [k, L, R] of parts) writeWav(`${OUT}${tag}_${k}.wav`, [L, R], SR)
  const total = parts.reduce((a, p) => a + p[1].length + SR, 0), AL = new Float32Array(total), AR = new Float32Array(total)
  let o = 0; for (const [, L, R] of parts) { AL.set(L, o); AR.set(R, o); o += L.length + SR }
  writeWav(`${OUT}${tag}_AB.wav`, [AL, AR], SR)
  made.push({ tag, title: e.title, from, secs: SECS, order: parts.map(p => p[0]), stats, differ: dif.length, pairs: D.of })
}

// a section on the comparison page (strings/data/compare/index.html)
const listFile = OUT + 'list.json'
const list = existsSync(listFile) ? JSON.parse(readFileSync(listFile, 'utf8')).filter(x => !made.some(m => m.tag === x.tag)) : []
list.push(...made); writeFileSync(listFile, JSON.stringify(list, null, 1))
const page = here + '../data/compare/index.html'
if (existsSync(page)) {
  let html = readFileSync(page, 'utf8').replace(/<!-- editions -->[\s\S]*<!-- \/editions -->\n?/, '')
  const sec = `<!-- editions -->\n<h2>Bowing editions by ear: Mutopia (Bach-Gesellschaft), Herrmann 1900, Auer 1917</h2>\n<p><small>The same MIDI notes and timing on ${ENGINE} + ${BODY} body, ${ROOM} hall; only the bowing differs. Each A/B file plays Mutopia, then Herrmann, then Auer, 1 s apart. Herrmann and Auer are read from their IMSLP scans by OMR.</small></p>\n` +
    list.map(m => `<div class="f"><b>${m.title}, ${fmt(m.from)}–${fmt(m.from + m.secs)}</b> <small>(strokes: ${m.order.map(k => `${k} ${m.stats[k].strokes}`).join(', ')}; editions differ on a new bow at ${m.differ} of ${m.pairs} onsets)</small><br><audio controls preload="none" src="editions/${m.tag}_AB.wav"></audio><br><small>${m.order.map(k => `<a href="editions/${m.tag}_${k}.wav">${k}</a>`).join(' · ')}</small></div>`).join('\n') + '\n<!-- /editions -->\n'
  html = html.replace(/(<h2>)/, sec + '$1')
  writeFileSync(page, html)
}
console.log('\nwrote', OUT)
