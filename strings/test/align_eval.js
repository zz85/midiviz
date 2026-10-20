// How well strings/align.js finds the notes of our MIDI files in recordings,
// measured on the Bach Violin Dataset, whose recordings come with their own
// alignments (Dong et al. 2022). Our aligner sees only the MIDI file's violin
// notes, the Mutopia score's repeats and the audio.
//
//   node strings/test/align_eval.js [--recs=…]
//
// Per recording: which repeats it found the player took (the dataset's
// info.csv says), and the onset error against the dataset's alignment for the
// notes both have (the first time each is played): median, and the share
// within 50, 100 and 250 ms. That alignment is itself estimated, so also a
// check that needs no reference: how often the note's pitch is sounding in the
// middle of where each alignment places the note.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { alignScore, repeatPlans, unfold } from '../align.js'
import { f0At } from '../expression.js'
import { midiHz } from '../sound/bowed.js'
import { alignPitches } from '../../violinist/tools/build_editions.js'
import { midiViolin, scoreFor } from '../../violinist/tools/build_performances.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const RECS = arg('recs', 'ko-donghwi_bwv1001_mov1,ko-donghwi_bwv1001_mov4,john-garner_bwv1002_mov1,john-garner_bwv1002_mov3,john-garner_bwv1002_mov5,minji-kim_bwv1003_mov3,minji-kim_bwv1003_mov2,emil-telmanyi_bwv1004_mov1,emil-telmanyi_bwv1005_mov3,emil-telmanyi_bwv1006_mov1,emil-telmanyi_bwv1006_mov3,emil-telmanyi_bwv1006_mov7').split(',')
const DATA = here + '../data/BachViolin/', SR = 22050
const csv = f => readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(','))
const info = csv(DATA + 'info.csv'), H = info[0]
const index = JSON.parse(readFileSync(here + '../../violinist/midis/index.json', 'utf8'))
const hms = s => s.split(':').reduce((a, v) => a * 60 + +v, 0)
const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1] }

const all = []
let repOk = 0
const pitchHits = { ours: [], ds: [] }
for (const id of RECS) {
  const I = Object.fromEntries(H.map((k, i) => [k, info.find(r => r[0] === id)[i]]))
  const e = index.find(x => x.file.startsWith(`bach_${I.work.slice(3)}_${I.mov}_`))
  const A = midiViolin(e, readFileSync(here + '../../violinist/midis/' + e.file))
  const sc = scoreFor(e)
  // a little before and after the movement, as a downloaded file would have
  const start = Math.max(0, hms(I.start) - 2), dur = hms(I.end) - hms(I.start) + 4
  const b = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', String(dur), '-i', DATA + `audio/${I.collection}/${I.source_filename}`, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  const x = new Float32Array(b.buffer, b.byteOffset, b.length >> 2)
  const t0 = performance.now()
  const r = alignScore(A, x, SR, { repeats: sc.repeats })
  const secs = (performance.now() - t0) / 1000
  // the dataset's notes, first performances, in movement time (+ the 2 s we added)
  const notes = csv(DATA + `notes/${I.collection}/${id}.csv`).slice(1), al = csv(DATA + `alignments/${I.collection}/${id}.csv`).slice(1)
  const off = hms(I.start) - start
  const B = notes.map((n, i) => ({ q: +n[0] / 24, pitch: +n[2], on: +al[i][0] + off })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
  // the dataset's notes are the score as the player took its repeats: unfold ours the
  // same way (info.csv), match the two sequences, and keep each score note's first time
  const flags = [I.repeat1, I.repeat2].filter(f => f !== '-').map(f => f === '1')
  const end = Math.max(...A.map(n => n.q + n.dq))
  const plans = repeatPlans(sc.repeats, end)
  const plan = plans.find(p => p.taken.length === flags.length && p.taken.every((t, k) => t === flags[k])) || plans[0]
  const U = unfold(A, plan).notes
  const pair = alignPitches(U.map(n => n.pitch), B.map(n => n.pitch))
  const truth = new Float64Array(A.length).fill(NaN)
  U.forEach((n, i) => { if (pair[i] >= 0 && Number.isNaN(truth[n.k])) truth[n.k] = B[pair[i]].on })
  const err = [], signed = []
  A.forEach((n, i) => { const k = r.first[i]; if (Number.isFinite(truth[i]) && k >= 0) { err.push(Math.abs(r.played[k].on - truth[i])); signed.push([truth[i], r.played[k].on - truth[i]]) } })
  // a check that needs no reference: is the note's pitch sounding in the middle of
  // where each alignment puts it? (single notes of 0.15 s or more, 3 points each)
  const tune = I.baroque_tuning === '1' ? -1 : 0
  const hit = (pitch, a, b) => { let h = 0; for (const w of [0.3, 0.5, 0.7]) { const t = a + w * (b - a), f = f0At(x, SR, Math.round(t * SR), midiHz(pitch + tune)); if (f && Math.abs(1200 * Math.log2(f / midiHz(pitch + tune))) < 60) h++ } return h / 3 }
  const hr = { ours: [], ds: [] }
  A.forEach((n, i) => {
    const k = r.first[i]; if (k < 0 || !Number.isFinite(truth[i])) return
    const p = r.played[k], nx = r.played[k + 1]
    const single = !A.some((m, j) => j !== i && Math.abs(m.q - n.q) < 1e-6)
    if (!single || !nx || nx.on - p.on < 0.15) return
    hr.ours.push(hit(n.pitch, p.on, nx.on))
    const j = A.findIndex((m, jj) => jj > i && m.q > n.q + 1e-6); if (j < 0 || !Number.isFinite(truth[j])) { hr.ours.pop(); return }
    hr.ds.push(hit(n.pitch, truth[i], truth[j]))
  })
  const mean = a => a.reduce((p, v) => p + v, 0) / (a.length || 1)
  pitchHits.ours.push(...hr.ours); pitchHits.ds.push(...hr.ds)
  repOk += plan.taken.length === r.plan.taken.length && plan.taken.every((t, k) => t === r.plan.taken[k]) ? 1 : 0
  if (process.env.SHOW) { console.log(JSON.stringify(r.coarse)); for (let k = 0; k < signed.length; k += Math.ceil(signed.length / 40)) console.log('   ', signed[k][0].toFixed(1), (1000 * signed[k][1]).toFixed(0)) }
  const sh = d => (100 * err.filter(v => v <= d).length / err.length).toFixed(0).padStart(3)
  all.push(...err)
  console.log(`${id.padEnd(30)} repeats ${JSON.stringify(r.plan.taken).padEnd(14)} (dataset ${I.repeat1}/${I.repeat2})  median ${(1000 * median(err)).toFixed(0).padStart(4)} ms, ≤50 ms ${sh(0.05)} %, ≤100 ${sh(0.1)} %, ≤250 ${sh(0.25)} %  (${err.length} notes, ${secs.toFixed(1)} s), pitch there ${(100 * mean(hr.ours)).toFixed(0)} % (dataset's ${(100 * mean(hr.ds)).toFixed(0)} %)`)
}
const sh = d => (100 * all.filter(v => v <= d).length / all.length).toFixed(1)
const mean = a => a.reduce((p, v) => p + v, 0) / (a.length || 1)
console.log(`\nthe note's pitch sounding where it is placed (${pitchHits.ours.length} single notes): ours ${(100 * mean(pitchHits.ours)).toFixed(1)} %, the dataset's alignment ${(100 * mean(pitchHits.ds)).toFixed(1)} %`)
console.log(`repeats as the dataset says: ${repOk} of ${RECS.length}`)
console.log(`onsets against the dataset's alignment, ${all.length} notes: median ${(1000 * median(all)).toFixed(0)} ms, ≤50 ms ${sh(0.05)} %, ≤100 ms ${sh(0.1)} %, ≤250 ms ${sh(0.25)} %`)
