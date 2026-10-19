// Evaluate the articulation planner's inference (strings/articulation.js,
// Layer 2) against the slurs in real scores: the Bach Violin Dataset's
// MusicXML editions of BWV 1001–1006 (strings/data/BachViolin/scores).
//
//   node strings/test/articulation.js [--tune] [--verbose]
//
// For every consecutive pair of onsets the question is: does the second
// continue the first's bow (slurred) or start a new one? Scored as precision /
// recall / F1 of "slurred" and overall agreement, against the score's own
// slurs, for the planner and for #033's built-in rule (motion.js without a
// plan). --tune searches INFER on even-numbered movements and reports the
// odd-numbered ones as held out.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { readMXL } from '../score.js'
import { planArticulation, INFER } from '../articulation.js'
import { fingerLine } from '../fingering.js'
import { buildMotion } from '../motion.js'

const here = fileURLToPath(new URL('.', import.meta.url))
export const DIR = here + '../data/BachViolin/scores/'
export const hasScores = () => existsSync(DIR)

/** All movements: { name, notes (with the score's art), meter, tempo }. Skips the "_00 / _10" variants. */
export function loadMovements() {
  const out = []
  for (const w of readdirSync(DIR).filter(d => /^bwv/.test(d)).sort()) for (const f of readdirSync(DIR + w).filter(f => /_mov\d+\.mxl$/.test(f)).sort()) {
    const s = readMXL(readFileSync(DIR + w + '/' + f), b => inflateRawSync(b))
    if (s.notes.length < 20) continue
    out.push({ name: f.replace('.mxl', ''), ...s })
  }
  return out
}

/** Truth per onset after the first: slurred to the previous onset? (from the score's own slur ids) */
function truth(mv) {
  const notes = mv.notes.map(n => ({ ...n, art: { ...n.art } }))
  planArticulation(notes, { mode: 'score' })
  return pairsOf(notes, n => n.art.slurPrev)
}
function pairsOf(notes, f) {
  const ns = notes.slice().sort((a, b) => a.on - b.on || a.pitch - b.pitch), out = []
  let last = -1
  for (const n of ns) { if (n.on - last < 0.03) continue; last = n.on; out.push(!!f(n)) }
  return out.slice(1)
}
function score(pred, gold) {
  let tp = 0, fp = 0, fn = 0, ok = 0
  for (let i = 0; i < gold.length; i++) { const p = pred[i], g = gold[i]; if (p && g) tp++; else if (p) fp++; else if (g) fn++; if (p === g) ok++ }
  return { tp, fp, fn, ok, n: gold.length }
}
const sum = rs => rs.reduce((a, r) => ({ tp: a.tp + r.tp, fp: a.fp + r.fp, fn: a.fn + r.fn, ok: a.ok + r.ok, n: a.n + r.n }), { tp: 0, fp: 0, fn: 0, ok: 0, n: 0 })
export const f1 = r => ({ P: r.tp / Math.max(1, r.tp + r.fp), R: r.tp / Math.max(1, r.tp + r.fn), F1: 2 * r.tp / Math.max(1, 2 * r.tp + r.fp + r.fn), acc: r.ok / Math.max(1, r.n) })

/** Planner (inference only, slurs stripped) on one movement. */
export function inferred(mv, params = {}) {
  const notes = mv.notes.map(n => ({ pitch: n.pitch, on: n.on, off: n.off, velocity: n.velocity }))
  planArticulation(notes, { mode: 'infer', meter: mv.meter, tempo: mv.tempo, ...params })
  return score(pairsOf(notes, n => n.art.slurPrev), truth(mv))
}
/** #033's built-in slur rule (motion.js without a plan). */
export function builtin(mv) {
  const notes = mv.notes.map(n => ({ pitch: n.pitch, on: n.on, off: n.off, velocity: n.velocity }))
  fingerLine(notes, { instrument: 'violin' })
  const { strokes } = buildMotion(notes, { instrument: 'violin' })
  const slurred = new Set()
  for (const st of strokes) st.events.forEach((e, k) => { if (k) for (const n of e.notes) slurred.add(n) })
  return score(pairsOf(notes, n => slurred.has(n)), truth(mv))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!hasScores()) { console.error(`no scores in ${DIR} (the Bach Violin Dataset)`); process.exit(1) }
  const mvs = loadMovements()
  const fmt = r => { const m = f1(r); return `slurred P ${(100 * m.P).toFixed(1)} R ${(100 * m.R).toFixed(1)} F1 ${(100 * m.F1).toFixed(1)}, agreement ${(100 * m.acc).toFixed(1)} %` }
  const gold = sum(mvs.map(mv => { const g = truth(mv); return { tp: 0, fp: 0, fn: 0, ok: 0, n: g.length, s: g.filter(Boolean).length } }))
  console.log(`${mvs.length} movements, ${gold.n} onset pairs; slurred in the scores: ${(100 * mvs.reduce((a, mv) => a + truth(mv).filter(Boolean).length, 0) / gold.n).toFixed(1)} %`)
  console.log('all separate bows    ', fmt(sum(mvs.map(mv => score(truth(mv).map(() => false), truth(mv))))))
  console.log('motion.js rule       ', fmt(sum(mvs.map(builtin))))
  console.log('planner (inference)  ', fmt(sum(mvs.map(mv => inferred(mv)))))
  if (process.argv.includes('--verbose')) for (const mv of mvs) console.log('  ', mv.name.padEnd(18), fmt(inferred(mv)), '| rule', fmt(builtin(mv)))
  if (process.argv.includes('--tune')) {
    const tr = mvs.filter((_, i) => i % 2 === 0), te = mvs.filter((_, i) => i % 2 === 1)
    let best = null
    for (const maxDur of [0.2, 0.26, 0.34, 0.45, 0.6]) for (const maxRatio of [1.5, 2.1, 3, 5]) for (const maxLeap of [5, 7, 9, 12, 19]) for (const maxGroup of [2, 3, 4, 6, 8, 16]) for (const beatBreak of [true, false]) {
      const p = { maxDur, maxRatio, maxLeap, maxGroup, beatBreak }
      const r = f1(sum(tr.map(mv => inferred(mv, p))))
      const obj = r.acc
      if (!best || obj > best.obj) best = { obj, p }
    }
    console.log('tuned on even movements:', JSON.stringify(best.p))
    console.log('  train', fmt(sum(tr.map(mv => inferred(mv, best.p)))))
    console.log('  held out', fmt(sum(te.map(mv => inferred(mv, best.p)))), '| defaults held out', fmt(sum(te.map(mv => inferred(mv)))), '| rule held out', fmt(sum(te.map(builtin))))
  }
}
