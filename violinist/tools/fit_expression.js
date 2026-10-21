// Fit strings/expression-model.js on the recorded performances
// (violinist/performances) and check it on pieces it was not fitted on.
//
//   node violinist/tools/fit_expression.js [--lambda=…] [--smooth=…] [--write]
//
// For every recording, the score's onsets (strings/expression-model.js onsets /
// features, read from the Mutopia source as #037 plays it) are paired with the
// MIDI notes the recording is aligned to (violinist/score-play.js matchMidi),
// and two targets are measured per onset:
//   tempo  log(played length / written length at the recording's median tempo),
//          from one onset to the next (both found), clipped to ±0.8
//   level  the Source model's corrected lane (the dynamic the recording plays
//          with on #034) over the onset's notes, less the recording's mean
// Cross-validation leaves out one piece at a time (all its recordings), so a
// piece is never predicted from someone playing that same piece. Reported per
// held-out recording, median over recordings:
//   tempo r   correlation of the predicted and played tempo deviations (per onset)
//   tempo r2  the same on deviations smoothed over ±2 onsets (the tempo curve)
//   level r   correlation of the predicted and played dynamic (per onset)
// The baseline for both is 0: the page plays a piece without a recording as
// written, at one tempo, and its dynamics from rules that do not know the music.
// --write saves the fit on all recordings to violinist/expression-model.json, with
// the gains the pages play it at (--tempo-gain 1.5, --level-gain 2): fitted to
// minimise the error, the predictions are shrunk toward an average player
// (their spread is the correlation times the players'), which sounds flat;
// through the Source model a level gain of 2 also follows the recordings
// better (--render: mean note r 0.217 at 1, 0.239 at 2, 0.240 at 3).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { decodeRecording } from '../../strings/expression.js'
import { readLilyPondFiles } from '../../strings/lilypond.js'
import { planArticulation } from '../../strings/articulation.js'
import { onsets, features, ridge, predictOne, smooth, beatOf, FEATURES } from '../../strings/expression-model.js'
import { matchMidi } from '../score-play.js'
import { midiViolin } from './build_performances.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const V = here + '../'
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const LAMBDA = +arg('lambda', 30), TGAIN = +arg('tempo-gain', 1.5), LGAIN = +arg('level-gain', 2), SMOOTH = +arg('smooth', 1), WIN = +arg('win', 1), WRITE = process.argv.includes('--write')
const index = JSON.parse(readFileSync(V + 'midis/index.json', 'utf8'))
const recs = JSON.parse(readFileSync(V + 'performances/index.json', 'utf8'))
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }
const corr = (a, b) => { const n = a.length; if (n < 3) return NaN; const ma = a.reduce((p, v) => p + v, 0) / n, mb = b.reduce((p, v) => p + v, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2 } return saa && sbb ? sab / Math.sqrt(saa * sbb) : NaN }

const scores = new Map()
function score(e) {
  if (!scores.has(e.file)) {
    const sc = e.score
    const s = readLilyPondFiles(new Map(sc.files.map(f => [f, readFileSync(V + 'scores/' + f, 'utf8')])), { main: sc.main, part: sc.part })
    planArticulation(s.notes, { mode: 'score' })
    scores.set(e.file, s)
  }
  return scores.get(e.file)
}

/** Section ends of a score in quarters: where its repeats and their endings end. */
export const sectionsOf = s => [...new Set((s.repeats || []).flatMap(r => [r.to, ...(r.alts || []).map(a => a[1])]))].sort((a, b) => a - b)

/** One recording's onsets with features and targets. */
function sample(meta) {
  const e = index.find(x => x.file === meta.file)
  if (!e?.score) return null
  const r = decodeRecording(JSON.parse(readFileSync(V + `performances/${meta.rec}.json`, 'utf8')))
  const A = midiViolin(e, readFileSync(V + 'midis/' + e.file))
  if (A.length !== r.on.length) return null
  A.forEach((n, i) => { n.on = r.on[i]; n.off = r.off[i] })
  const S = score(e), notes = S.notes.map(n => ({ ...n }))
  const pairs = matchMidi(A, notes), back = new Map([...pairs].map(([m, s]) => [s, m]))
  const ev = onsets(notes), F = features(ev, { sections: sectionsOf(S) })
  // recorded onset of each score onset: the median of its found notes
  const on = ev.map(x => median(x.notes.map(n => back.get(n)?.on)))
  // the recording's median tempo (seconds per quarter), from consecutive found onsets
  const spq = []
  for (let i = 0; i + 1 < ev.length; i++) if (Number.isFinite(on[i]) && Number.isFinite(on[i + 1]) && on[i + 1] > on[i]) spq.push((on[i + 1] - on[i]) / ev[i].ioiQ)
  const spq0 = median(spq)
  // (over at least WIN beats from the onset: a fast note's own length is mostly alignment noise)
  const beatQ = beatOf(ev)
  const tempo = ev.map((x, i) => {
    if (!Number.isFinite(on[i])) return NaN
    let j = i + 1; while (j < ev.length && (ev[j].q - x.q < WIN * beatQ || !Number.isFinite(on[j]))) j++
    if (j >= ev.length || !Number.isFinite(on[j]) || on[j] <= on[i]) return NaN
    const v = Math.log((on[j] - on[i]) / ((ev[j].q - x.q) * spq0))
    return Math.abs(v) > 1.2 ? NaN : Math.max(-0.8, Math.min(0.8, v))
  })
  // level: the corrected Source lane inside the onset's found notes
  const lane = r.lanes.source
  let level = ev.map(() => NaN)
  if (lane && !meta.ensemble) {
    level = ev.map(x => {
      const v = []
      for (const n of x.notes) { const m = back.get(n); if (!m) continue; for (let k = Math.round((m.on + 0.05) * r.rate); k < Math.round((m.off - 0.03) * r.rate); k++) if (k >= 0 && k < lane.length) v.push(lane[k]) }
      return v.length ? median(v) : NaN
    })
    const m = level.filter(Number.isFinite).reduce((a, v, _, all) => a + v / all.length, 0)
    level = level.map(v => v - m)
  }
  // inside long notes: the lane's shape (relative to the note's median), 11 points
  const swell = []
  if (lane && !meta.ensemble) for (const x of ev) {
    if (x.size > 1) continue
    const m = back.get(x.notes[0]); if (!m || m.off - m.on < 0.8) continue
    const a = Math.round(m.on * r.rate), b = Math.round(m.off * r.rate); if (b >= lane.length) continue
    const seg = Array.from(lane.subarray(a, b)), md = median(seg)
    swell.push(Array.from({ length: 11 }, (_, k) => seg[Math.min(seg.length - 1, Math.round(k / 10 * (seg.length - 1)))] - md))
  }
  return { rec: meta.rec, file: e.file, F, tempo, level, swell, mean: lane && !meta.ensemble ? median(Array.from(lane)) : NaN, n: ev.length, found: on.filter(Number.isFinite).length }
}

const data = recs.map(sample).filter(Boolean)
console.log(`${data.length} recordings of ${new Set(data.map(d => d.file)).size} pieces, ${data.reduce((a, d) => a + d.n, 0)} onsets; λ ${LAMBDA}, smoothing ±${SMOOTH}`)

function fit(train) {
  const Xt = [], yt = [], Xl = [], yl = []
  for (const d of train) d.F.forEach((x, i) => {
    if (Number.isFinite(d.tempo[i])) { Xt.push(x.f); yt.push(d.tempo[i]) }
    if (Number.isFinite(d.level[i])) { Xl.push(x.f); yl.push(d.level[i]) }
  })
  // (a piece with several recordings counts once per recording: the players differ)
  const sw = train.flatMap(d => d.swell), shape = sw.length ? Array.from({ length: 11 }, (_, k) => median(sw.map(s => s[k]))) : null
  const reg = (X, y) => ({ w: ridge(X, y, LAMBDA) })
  return { tempo: { ...reg(Xt, yt), smooth: SMOOTH }, level: { ...reg(Xl, yl), mean: median(train.map(d => d.mean)) }, swell: shape && { minLen: 0.8, shape } }
}
const evaluate = (m, d) => {
  const pt = smooth(d.F.map(x => predictOne(m.tempo, x.f)), m.tempo.smooth), pl = d.F.map(x => predictOne(m.level, x.f))
  const ti = d.tempo.map((v, i) => Number.isFinite(v) ? i : -1).filter(i => i >= 0), li = d.level.map((v, i) => Number.isFinite(v) ? i : -1).filter(i => i >= 0)
  const s2t = smooth(d.tempo.map(v => (Number.isFinite(v) ? v : 0)), 2), s2p = smooth(pt, 2)
  return { tempoR: corr(ti.map(i => pt[i]), ti.map(i => d.tempo[i])), tempoR2: corr(ti.map(i => s2p[i]), ti.map(i => s2t[i])), levelR: li.length ? corr(li.map(i => pl[i]), li.map(i => d.level[i])) : NaN,
    tempoSd: [Math.sqrt(ti.reduce((a, i) => a + pt[i] ** 2, 0) / ti.length), Math.sqrt(ti.reduce((a, i) => a + d.tempo[i] ** 2, 0) / ti.length)] }
}

// leave one piece out
const res = []
for (const file of [...new Set(data.map(d => d.file))]) {
  const m = fit(data.filter(d => d.file !== file))
  for (const d of data.filter(d => d.file === file)) res.push({ rec: d.rec, ...evaluate(m, d) })
}
for (const r of res) console.log(`  ${r.rec.padEnd(36)} tempo r ${r.tempoR.toFixed(2)} (curve ${r.tempoR2.toFixed(2)}, sd ${r.tempoSd[0].toFixed(2)} / ${r.tempoSd[1].toFixed(2)}), level r ${Number.isFinite(r.levelR) ? r.levelR.toFixed(2) : '–'}`)
const med = k => median(res.map(r => r[k])).toFixed(3)
console.log(`held out (median of ${res.length}): tempo r ${med('tempoR')}, tempo curve r ${med('tempoR2')}, level r ${med('levelR')}`)
// the same recordings, fitted on everything (how much is left to generalise)
const all = fit(data), ins = data.map(d => evaluate(all, d))
console.log(`fitted on all (in-sample): tempo r ${median(ins.map(x => x.tempoR)).toFixed(3)}, level r ${median(ins.map(x => x.levelR)).toFixed(3)}`)
if (process.argv.includes('--weights')) for (const k of ['tempo', 'level']) console.log(k, FEATURES.map((f, i) => `${f} ${all[k].w[i].toFixed(3)}`).join(', '))
if (WRITE) {
  const out = { about: 'strings/expression-model.js, fitted by violinist/tools/fit_expression.js on violinist/performances', features: FEATURES, recordings: data.length, pieces: new Set(data.map(d => d.file)).size,
    heldOut: { tempoR: +med('tempoR'), tempoCurveR: +med('tempoR2'), levelR: +med('levelR') },
    tempo: { w: all.tempo.w.map(v => +v.toFixed(5)), smooth: SMOOTH, gain: TGAIN }, level: { w: all.level.w.map(v => +v.toFixed(5)), mean: +all.level.mean.toFixed(4), gain: LGAIN }, swell: all.swell && { minLen: 0.8, shape: all.swell.shape.map(v => +v.toFixed(4)) } }
  writeFileSync(V + 'expression-model.json', JSON.stringify(out, null, 1))
  console.log('wrote', V + 'expression-model.json')
}

// --agree: how much two players of one piece agree (the ceiling for any prediction from the score)
if (process.argv.includes('--agree')) {
  const byFile = new Map(); for (const d of data) { if (!byFile.has(d.file)) byFile.set(d.file, []); byFile.get(d.file).push(d) }
  const rt = [], rl = [], rt2 = []
  for (const [f, ds] of byFile) for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++) {
    const A = ds[a], B = ds[b], ti = A.tempo.map((v, i) => Number.isFinite(v) && Number.isFinite(B.tempo[i]) ? i : -1).filter(i => i >= 0)
    const li = A.level.map((v, i) => Number.isFinite(v) && Number.isFinite(B.level[i]) ? i : -1).filter(i => i >= 0)
    const sa = smooth(A.tempo.map(v => (Number.isFinite(v) ? v : 0)), 2), sb = smooth(B.tempo.map(v => (Number.isFinite(v) ? v : 0)), 2)
    rt.push(corr(ti.map(i => A.tempo[i]), ti.map(i => B.tempo[i]))); rt2.push(corr(ti.map(i => sa[i]), ti.map(i => sb[i])))
    if (li.length) rl.push(corr(li.map(i => A.level[i]), li.map(i => B.level[i])))
    console.log(`  ${A.rec} × ${B.rec}: tempo r ${rt.at(-1).toFixed(2)} (curve ${rt2.at(-1).toFixed(2)}), level r ${li.length ? rl.at(-1).toFixed(2) : '–'}`)
  }
  console.log(`two players of one piece (median of ${rt.length} pairs): tempo r ${median(rt).toFixed(3)}, curve ${median(rt2).toFixed(3)}, level r ${median(rl).toFixed(3)}`)
}

if (arg('look', '')) {
  const [ra, rb] = arg('look', '').split(',')
  const A = data.find(d => d.rec === ra), B = data.find(d => d.rec === rb)
  const S = score(index.find(x => x.file === A.file)), ev = onsets(S.notes.map(n => ({ ...n })))
  const both = A.tempo.map((v, i) => [i, (v + B.tempo[i]) / 2]).filter(([, v]) => Number.isFinite(v)).sort((x, y) => y[1] - x[1])
  const show = ([i, v]) => { const e = ev[i], n = e.notes[0]; return `bar ${n.measure} beat ${n.beat.toFixed(2)} ioiQ ${e.ioiQ} size ${e.size} next ${ev[i + 1]?.size} top ${e.top} dev ${v.toFixed(2)} (${A.tempo[i].toFixed(2)}, ${B.tempo[i].toFixed(2)})` }
  console.log('slowest:'); both.slice(0, 25).forEach(x => console.log('  ' + show(x)))
  console.log('fastest:'); both.slice(-10).forEach(x => console.log('  ' + show(x)))
}

// --render[=rec,rec…]: through #034's Source model, how close the rendered notes' levels
// come to the recording's: our rules (as a piece without a recording plays today), the
// model fitted without that piece, and the recording's own lane (the ceiling). All three
// at the recording's timing, so only the dynamics differ.
if (arg('render', null) != null || process.argv.includes('--render')) {
  const { playedNotes, renderNotes } = await import('./build_performances.js')
  const { analyseRecording, RATE: R } = await import('../../strings/expression.js')
  const { predictExpression } = await import('../../strings/expression-model.js')
  const SECS = +arg('secs', 60), SR = 22050
  const pick = (arg('render', '') || '').split(',').filter(Boolean)
  const list = pick.length ? pick : ['ko-donghwi_bwv1001_mov1', 'john-garner_bwv1002_mov1', 'minji-kim_bwv1003_mov3', 'emil-telmanyi_bwv1004_mov3', 'vicond_bwv1004_mov2', 'emil-telmanyi_bwv1005_mov3', 'menuhin_bwv1006_mov1', 'emil-telmanyi_bwv1006_mov6', 'qmul_paganini_caprice24']
  const lvOf = (L, notes) => notes.map(n => { const a = Math.round((n.on + 0.05) * R), b = Math.round((n.off - 0.03) * R); return b > a ? median(Array.from(L.subarray(a, Math.min(b, L.length)))) : NaN })
  const out = { rules: [], model: [], recorded: [] }
  for (const id of list) {
    const d = data.find(x => x.rec === id); if (!d) { console.warn('no', id); continue }
    const meta = recs.find(x => x.rec === id), e = index.find(x => x.file === meta.file)
    const rec = JSON.parse(readFileSync(V + `performances/${id}.json`, 'utf8')), r = decodeRecording(rec)
    const m = fit(data.filter(x => x.file !== d.file))
    const S = score(e)
    const row = []
    for (const mode of arg('modes', 'rules,model,recorded').split(',')) {
      const { notes, expression } = playedNotes(rec, e, { mode: mode === 'recorded' ? 'recorded' : 'rules', secs: SECS })
      let ex = expression
      if (mode === 'model') {
        // the score's place in the bar, marks and written dynamics on the played notes
        const pairs = matchMidi(notes, S.notes)
        for (const [n, s] of pairs) { n.beat = s.beat; n.beatsPerBar = s.beatsPerBar; n.measure = s.measure; n.velocity = s.velocity; n.art = { ...(n.art || {}), ...(s.art?.orn ? { orn: s.art.orn } : {}), ...(s.art?.fermata ? { fermata: true } : {}) } }
        ex = predictExpression(notes, m, { keepTiming: true, sections: sectionsOf(S), levelGain: +arg('gain', LGAIN) })
      }
      const y = renderNotes(notes, ex, { sr: SR, model: 'source', body: 'phil' })
      const ours = lvOf(analyseRecording(y, SR, notes).loud, notes), theirs = lvOf(r.loud, notes)
      const ii = ours.map((v, i) => Number.isFinite(v) && Number.isFinite(theirs[i]) ? i : -1).filter(i => i >= 0)
      const rr = corr(ii.map(i => ours[i]), ii.map(i => theirs[i]))
      out[mode].push(rr); row.push(`${mode} ${rr.toFixed(2)}`)
    }
    console.log(`  ${id.padEnd(34)} note level r: ${row.join(', ')}`)
  }
  const mean = a => a.reduce((p, v) => p + v, 0) / a.length
  console.log(`rendered (${out.rules.length} recordings): mean rules ${mean(out.rules).toFixed(3)}, model ${mean(out.model).toFixed(3)} (higher on ${out.model.filter((v, i) => v > out.rules[i] + 0.005).length}, lower on ${out.model.filter((v, i) => v < out.rules[i] - 0.005).length}), recorded lane ${mean(out.recorded).toFixed(3)}; medians ${median(out.rules).toFixed(3)} / ${median(out.model).toFixed(3)} / ${median(out.recorded).toFixed(3)}`)
}
