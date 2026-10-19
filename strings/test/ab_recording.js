// A/B #034's engines against a real violinist playing the same notes at the
// same times (the Bach Violin Dataset, Dong et al., ICASSP 2022:
// https://github.com/salu133445/bach-violin-dataset, recordings of BWV
// 1001–1006 with score notes aligned to each recording).
//
//   node strings/test/ab_recording.js [--rec=ko-donghwi_bwv1001_mov1] [--from=0] [--secs=20]
//        [--engines=waveguide,source,hybrid] [--bodies=iowa,phil] [--room=recital]
//
// The dataset (265 MB, licences per collection: public domain, CC BY 3.0, some
// NC / ND) is downloaded once into the git-ignored strings/data/BachViolin/.
// Default: Ko Donghwi, Sonata No. 1, Adagio (Team DR, CC BY 3.0).
//
// The aligned notes give our performance the violinist's own timing (onsets
// and offsets as played); our renderer adds bowing, vibrato and dynamics as
// it does for any MIDI file. Chords are thinned to two notes as the page does.
// The recording was made in a room, so ours goes through the #030 hall
// (--room=dry for none). Writes, level-matched, into strings/data/compare/
// recording/: the recording excerpt, each engine × body, and one A/B file
// (recording, then each render, 1 s apart), and adds them to the comparison
// page. Prints each render's distance from the recording's long-term spectrum
// and their brightness (spectral centroid).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { renderCurves } from '../sound/bowed.js'
import { acousticParams, offlineHall } from '../../concertstage/acoustics.js'
import { writeWav, fft, rms } from './audio-util.js'
import { hasBank, loadBankNode, hasFfmpeg } from './hybrid-bank.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const REC = arg('rec', 'ko-donghwi_bwv1001_mov1'), FROM = +arg('from', 0), SECS = +arg('secs', 20)
const ENGINES = arg('engines', 'waveguide,source,hybrid').split(','), BODIES = arg('bodies', 'iowa,phil').split(',')
const ROOM = arg('room', 'recital')
const SR = 48000
const DIR = here + '../data/BachViolin/', OUT = here + '../data/compare/recording/'
const ZIP = 'https://zenodo.org/api/records/6050245/files/bach-violin-dataset-v1.0.zip/content'
if (!hasFfmpeg()) { console.error('needs ffmpeg'); process.exit(1) }

if (!existsSync(DIR + 'info.csv')) {
  mkdirSync(DIR, { recursive: true })
  console.log(`downloading the Bach Violin Dataset (265 MB) into ${DIR}…`)
  const r = await fetch(ZIP); if (!r.ok) throw new Error(`${ZIP}: ${r.status}`)
  writeFileSync(DIR + 'ds.zip', Buffer.from(await r.arrayBuffer()))
  execFileSync('unzip', ['-o', '-q', DIR + 'ds.zip', '-d', DIR])
}
const csv = f => readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(','))
const info = csv(DIR + 'info.csv'), head = info[0], row = info.find(r => r[0] === REC)
if (!row) throw new Error(`no recording ${REC} in info.csv`)
const I = Object.fromEntries(head.map((k, i) => [k, row[i]]))
const hms = s => s.split(':').reduce((a, v) => a * 60 + +v, 0)
const licence = readFileSync(DIR + `audio/${I.collection}/LICENSE`, 'utf8').trim()
console.log(`${I.violinist_name}: ${I.title}, ${I.movement} (${I.source_filename}); ${licence.split('\n')[0]}`)

// recording excerpt (the alignment's times are from the movement's start)
const t0 = hms(I.start) + FROM
const b = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(SECS), '-i', DIR + `audio/${I.collection}/${I.source_filename}`, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
const st = new Float32Array(b.buffer, b.byteOffset, b.length / 4)
const recL = new Float32Array(st.length / 2), recR = new Float32Array(st.length / 2)
for (let i = 0; i < recL.length; i++) { recL[i] = st[2 * i]; recR[i] = st[2 * i + 1] }

// aligned notes in the excerpt
const notesCsv = csv(DIR + `notes/${I.collection}/${REC}.csv`).slice(1), al = csv(DIR + `alignments/${I.collection}/${REC}.csv`).slice(1)
let notes = notesCsv.map((n, i) => ({ pitch: +n[2], on: +al[i][0] - FROM, off: +al[i][1] - FROM, velocity: 0.7 }))
  .filter(n => n.on >= 0 && n.on < SECS - 0.2).map(n => ({ ...n, off: Math.min(n.off, SECS) }))
// chords: the top two notes (as the page's Voices: melody + double stops)
notes.sort((a, b) => a.on - b.on || b.pitch - a.pitch)
const thin = []
for (let i = 0; i < notes.length;) { let j = i; while (j < notes.length && notes[j].on - notes[i].on < 0.03) j++; thin.push(...notes.slice(i, j).slice(0, 2)); i = j }
notes = thin
fingerLine(notes, { instrument: 'violin' })
console.log(`${notes.length} notes in ${FROM}–${FROM + SECS} s`)
const perf = renderPerformance(notes, { instrument: 'violin', seed: 7 })

// renders
const hall = ROOM === 'dry' ? null : acousticParams({ room: ROOM, seat: 'front' })
const N = recL.length
const renders = []
for (const engine of ENGINES) {
  for (const body of engine === 'hybrid' ? ['recorded'] : BODIES) {
    let L, R
    if (engine === 'hybrid') {
      if (!hasBank('violin')) { console.warn('no Iowa bank: skipping hybrid'); continue }
      const { renderHybrid } = await import('../sound/hybrid.js');
      [L, R] = renderHybrid(perf, loadBankNode('violin'), { sampleRate: SR })
    } else [L, R] = renderCurves(perf, { sampleRate: SR, model: engine, params: { body } })
    const P = new Float32Array(2 * N); P.set(L.subarray(0, N), 0); P.set(R.subarray(0, N), N)
    if (hall) offlineHall(hall, SR)(P, N)
    renders.push({ name: `${engine}-${body}`, L: P.subarray(0, N), R: P.subarray(N) })
  }
}

// long-term spectrum (third octaves) and centroid
const bands = []; for (let f = 160; f < 12000; f *= 2 ** (1 / 3)) bands.push(f)
function ltas(x) {
  const n = 4096, acc = new Float64Array(bands.length); let s = 0, w = 0
  for (let o = 0; o + n <= x.length; o += n / 2) {
    const re = new Float64Array(n), im = new Float64Array(n)
    for (let i = 0; i < n; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n))
    fft(re, im)
    for (let k = 1; k < n / 2; k++) { const p = re[k] ** 2 + im[k] ** 2; s += p * k; w += p }
    bands.forEach((f, j) => { for (let k = Math.round(f / 2 ** (1 / 6) * n / SR); k < Math.round(f * 2 ** (1 / 6) * n / SR); k++) acc[j] += re[k] ** 2 + im[k] ** 2 })
  }
  const tot = acc.reduce((a, v) => a + v, 0)
  return { dB: [...acc].map(v => 10 * Math.log10(v / tot)), centroid: s / w * SR / n }
}
const ref = ltas(recL)
console.log(`recording: centroid ${ref.centroid.toFixed(0)} Hz`)
const show = [250, 500, 1000, 2000, 4000, 8000].map(f => bands.findIndex(x => Math.abs(Math.log2(x / f)) < 0.17))
console.log('band dB vs the recording'.padEnd(26), show.map(i => String(Math.round(bands[i])).padStart(6)).join(''))
for (const r of renders) {
  const m = ltas(r.L), d = m.dB.map((v, i) => v - ref.dB[i])
  r.dist = Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length)
  console.log(r.name.padEnd(26), show.map(i => d[i].toFixed(1).padStart(6)).join(''), ` rms ${r.dist.toFixed(1)} dB, centroid ${m.centroid.toFixed(0)} Hz`)
}

// files, level-matched on the sounding RMS
mkdirSync(OUT, { recursive: true })
const level = (L, R) => { const g = 0.08 / (rms(L) || 1); return [L.map(v => v * g), R.map(v => v * g)] }
const tag = `${REC}_${FROM}-${FROM + SECS}s`
const parts = [['recording', ...level(recL, recR)], ...renders.map(r => [r.name, ...level(r.L, r.R)])]
for (const [name, L, R] of parts) writeWav(`${OUT}${tag}_${name}.wav`, [L, R], SR)
const total = parts.reduce((a, p) => a + p[1].length + SR, 0), AL = new Float32Array(total), AR = new Float32Array(total)
let o = 0; for (const [, L, R] of parts) { AL.set(L, o); AR.set(R, o); o += L.length + SR }
writeWav(`${OUT}${tag}_AB.wav`, [AL, AR], SR)
writeFileSync(`${OUT}${tag}.json`, JSON.stringify({ rec: REC, violinist: I.violinist_name, title: `${I.title}, ${I.movement}`, from: FROM, secs: SECS, room: ROOM, licence, source: `https://github.com/salu133445/bach-violin-dataset`, order: parts.map(p => p[0]), renders: renders.map(r => ({ name: r.name, dist: +r.dist.toFixed(2) })) }, null, 1))
console.log('wrote', OUT + tag + '_*.wav')
