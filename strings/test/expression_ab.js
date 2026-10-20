// How close #034 gets to a real violinist when it plays with that player's
// expression (strings/expression.js, violinist/performances) against the same
// notes at the player's timing with our own rules for dynamics and the left
// hand (what strings/test/ab_recording.js does). Bowing from the Mutopia score
// in both. The renders go through the #030 hall and are measured with the same
// analysis as the recording.
//
//   node strings/test/expression_ab.js [--recs=ko-donghwi_bwv1001_mov1,…] [--model=source] [--body=phil] [--secs=90] [--fit] [--loop=N] [--wav]
//
// Per recording, for "rules" (recorded timing only) and "recorded" (timing,
// loudness lane and pitch curves):
//   level r     correlation of the level with the recording's, 0.25 s frames
//               inside the notes (phrasing and dynamics)
//   note r      correlation of the notes' levels (median of each note's middle)
//   spread      the notes' level spread (dB, robust SD), ours / the recording's
//   vib width   median vibrato width (cents) on single notes of 0.5 s or more, ours / the recording's
//   pitch err   RMS difference of the pitch curves (cents), median over the single notes
//               (nothing else sounding) pitched in both
// --fit plays the lane made from the recorded level alone at several scales
// (DB_PER_DYN); --loop=N makes it so and corrects it N times here.
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analyseRecording, decodeRecording, correctLane, DB_PER_DYN, RATE } from '../expression.js'
import { playedNotes, renderNotes } from '../../violinist/tools/build_performances.js'
import { writeWav } from './audio-util.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const RECS = arg('recs', 'ko-donghwi_bwv1001_mov1,ko-donghwi_bwv1001_mov3,john-garner_bwv1002_mov1,minji-kim_bwv1003_mov3,emil-telmanyi_bwv1004_mov3').split(',')
const MODEL = arg('model', 'source'), BODY = arg('body', 'phil'), SECS = +arg('secs', 90)
const LOOP = +arg('loop', 0), FIT = process.argv.includes('--fit'), WAV = process.argv.includes('--wav')
const SR = 22050, PERF = here + '../../violinist/performances/', DATA = here + '../data/BachViolin/'
const index = JSON.parse(readFileSync(here + '../../violinist/midis/index.json', 'utf8'))
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }
const corr = (a, b) => { const n = a.length, ma = a.reduce((p, v) => p + v, 0) / n, mb = b.reduce((p, v) => p + v, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2 } return sab / Math.sqrt(saa * sbb) }
const rsd = a => { const m = median(a); return 1.4826 * median(a.map(v => Math.abs(v - m))) }

/** Vibrato width (cents, half the swing) of a pitch curve at RATE: the strongest 3.5–9 Hz component. */
function vibWidth(c) {
  const N = c.length; if (N < 20) return NaN
  const m = c.reduce((p, v) => p + v, 0) / N, mx = (N - 1) / 2
  let sxy = 0, sxx = 0; for (let i = 0; i < N; i++) { sxy += (i - mx) * (c[i] - m); sxx += (i - mx) ** 2 }
  const z = Array.from(c, (v, i) => v - m - sxy / sxx * (i - mx))
  let best = 0
  for (let r = 3.5; r <= 9; r += 0.1) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)), ph = 2 * Math.PI * r * i / RATE; re += w * z[i] * Math.cos(ph); im -= w * z[i] * Math.sin(ph) } best = Math.max(best, 4 * Math.hypot(re, im) / N) }
  return best
}

/** Per-note levels and pitch curves of an analysis, and 0.25 s level frames inside notes. */
function measures(an, notes) {
  const lv = notes.map(n => { const a = Math.round((n.on + 0.05) * RATE), b = Math.round((n.off - 0.03) * RATE); return b > a ? median(Array.from(an.loud.subarray(a, b))) : NaN })
  const inside = new Uint8Array(an.loud.length)
  for (const n of notes) for (let k = Math.round((n.on + 0.05) * RATE); k < Math.round((n.off - 0.03) * RATE); k++) if (k < inside.length) inside[k] = 1
  const B = Math.round(0.25 * RATE), frames = []
  for (let k = 0; k + B <= an.loud.length; k += B) { let s = 0, c = 0; for (let j = k; j < k + B; j++) if (inside[j]) { s += an.loud[j]; c++ } frames.push(c >= B / 2 ? s / c : NaN) }
  return { lv, frames }
}

function compare(recAn, recM, ourAn, ourM, notes) {
  const fi = recM.frames.map((v, i) => Number.isFinite(v) && Number.isFinite(ourM.frames[i]) ? i : -1).filter(i => i >= 0)
  const ni = notes.map((n, i) => Number.isFinite(recM.lv[i]) && Number.isFinite(ourM.lv[i]) ? i : -1).filter(i => i >= 0)
  // pitch on single notes (nothing else sounding): in chords both trackers lose the note
  const vr = [], vo = [], perr = []
  notes.forEach((n, i) => {
    const a = recAn.cents[i], b = ourAn.cents[i]
    if (!a || !b || notes.some(m => m !== n && m.on < n.off - 0.02 && m.off > n.on + 0.02)) return
    if (n.off - n.on >= 0.5) { vr.push(vibWidth(a.c)); vo.push(vibWidth(b.c)) }
    const L = Math.min(a.c.length, b.c.length); let e = 0; for (let k = 0; k < L; k++) e += (a.c[k] - b.c[k]) ** 2
    perr.push(Math.sqrt(e / L))
  })
  return {
    levelR: corr(fi.map(i => recM.frames[i]), fi.map(i => ourM.frames[i])),
    noteR: corr(ni.map(i => recM.lv[i]), ni.map(i => ourM.lv[i])),
    slope: corr(ni.map(i => recM.lv[i]), ni.map(i => ourM.lv[i])) * rsd(ni.map(i => ourM.lv[i])) / rsd(ni.map(i => recM.lv[i])),
    spread: [rsd(ni.map(i => ourM.lv[i])), rsd(ni.map(i => recM.lv[i]))],
    vib: [median(vo), median(vr)],
    pitchErr: median(perr), pitched: perr.length,
  }
}

const pooled = { rules: [], recorded: [] }
for (const id of RECS) {
  const rec = JSON.parse(readFileSync(PERF + id + '.json', 'utf8')), r = decodeRecording(rec)
  const e = index.find(x => x.file === rec.file)
  // the recording in performance time: its measured lane is already there; the
  // pitch curves too. Re-analysing the audio would need the warp, so compare
  // against the stored measurement (what the renderer is asked to play)
  console.log(`${id} (${rec.violinist}, ${rec.title}), first ${SECS} s`)
  // the lane as stored (corrected by listening on the Source model), or with
  // --fit / --loop from the recorded level alone at a given scale
  const fresh = FIT || LOOP > 0
  for (const mode of FIT ? ['recorded'] : ['rules', 'recorded']) for (const k of FIT ? [6, 9, 12, 16] : [DB_PER_DYN]) {
    const src = fresh ? { ...rec, dyn: undefined } : rec
    const { notes, expression } = playedNotes(src, e, { mode, secs: SECS, dbPerDyn: k })
    let y = renderNotes(notes, expression, { sr: SR, model: MODEL, body: BODY })
    let ourAn = analyseRecording(y, SR, notes)
    for (let it = 0; mode === 'recorded' && it < LOOP; it++) {
      correctLane(expression.dyn, r.loud, ourAn.loud, notes)
      y = renderNotes(notes, expression, { sr: SR, model: MODEL, body: BODY }); ourAn = analyseRecording(y, SR, notes)
    }
    // the recording's measurement per note, in the same order (its pitch curves ride on the notes)
    const recAn = { loud: r.loud, cents: playedNotes(rec, e, { secs: SECS, vibGain: 1 }).notes.map(n => n.rec ? { c: n.rec.c } : null) }
    // the pitch analysis of ours starts 40 ms after the onset, as the recording's did
    const res = compare(recAn, measures(recAn, notes), ourAn, measures(ourAn, notes), notes)
    pooled[mode].push(res)
    console.log(`  ${(FIT ? `${mode} ${k} dB/dyn` : mode).padEnd(18)} level r ${res.levelR.toFixed(2)}, note r ${res.noteR.toFixed(2)} (slope ${res.slope.toFixed(2)}), spread ${res.spread[0].toFixed(1)} / ${res.spread[1].toFixed(1)} dB, vib width ±${res.vib[0].toFixed(1)} / ±${res.vib[1].toFixed(1)} c, pitch err ${res.pitchErr.toFixed(1)} c (${res.pitched} notes)`)
    if (WAV) { mkdirSync(here + '../data/compare/expression/', { recursive: true }); const g = 0.1 / Math.sqrt(y.reduce((p, v) => p + v * v, 0) / y.length); writeWav(here + `../data/compare/expression/${id}_${mode}.wav`, [y.map(v => v * g)], SR) }
  }
}
if (!FIT) {
  const m = (L, f) => median(L.map(f)).toFixed(2)
  for (const mode of ['rules', 'recorded']) console.log(`median ${mode.padEnd(9)} level r ${m(pooled[mode], x => x.levelR)}, note r ${m(pooled[mode], x => x.noteR)}, pitch err ${m(pooled[mode], x => x.pitchErr)} c`)
}
