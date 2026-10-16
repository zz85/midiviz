#!/usr/bin/env node
// Score the engine on the TNUA violin fingering dataset (10 violinists × 14 excerpts).
//
//   node strings/test/tnua.js [dataset folder] [--mode=standard] [--bpm=N (default: per-piece tempo)] [--verbose]
//                             [--weights='{"shift":3}'] [--tune[=rounds]] [--bench=λ] [--all] [--human]
//
// Folder defaults to strings/data/TNUA/TNUA_violin_fingering_dataset; fetch it with
//   git clone https://github.com/Tsung-Ping/Violin-Fingering-Generation strings/data/TNUA
// (no licence file: keep it in the git-ignored strings/data/).
//
// Scores (mean over the 10 violinists unless stated): string, finger,
// string+finger (S+F), string+position (S+P), all three; high = best
// violinist's S+F, soft = S+F matches at least one violinist.
// --human scores each violinist against the other nine: the ceiling.
// --tune runs coordinate descent on S+F with 2-fold cross-validation by piece
// (tune on half the pieces, report the other half, then swap), and prints the
// weights tuned on everything.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fingerLine, DEFAULTS } from '../fingering.js'
import { runSuite } from './bench.js'
import { PIECES, TEMPO, parseCSV, scorePiece, compare, agreement, align } from '../tnua.js'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const args = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')).map(([k, v]) => [k, v ?? true]))
const dir = argv.find(a => !a.startsWith('--')) || join(here, '../data/TNUA/TNUA_violin_fingering_dataset')
if (!existsSync(dir)) {
  console.error(`TNUA dataset not found in ${dir}\nget it with: git clone --depth 1 https://github.com/Tsung-Ping/Violin-Fingering-Generation ${join(here, '../data/TNUA')}`)
  process.exit(1)
}
const VIOLINISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const data = PIECES.map(p => {
  const raw = VIOLINISTS.map(v => parseCSV(readFileSync(join(dir, `vio${v}_${p}.csv`), 'utf8'), { secPerBeat: 60 / (+args.bpm || TEMPO[p]) }))
  return { piece: p, truths: raw.map(t => align(raw[0], t)) }
})

const baseOpts = { mode: args.mode || 'standard', weights: args.weights ? JSON.parse(args.weights) : {} }

function run(pieces, opts) {
  const rows = []
  for (const d of pieces) {
    const est = d.truths[0].map(n => ({ pitch: n.pitch, on: n.on, off: n.off }))
    const r = fingerLine(est, opts)
    rows.push({ piece: d.piece, ms: r.ms, ...scorePiece(est, d.truths) })
  }
  return rows
}
const avg = (rows, k) => rows.reduce((a, r) => a + r[k] * r.notes, 0) / rows.reduce((a, r) => a + r.notes, 0)
const pct = x => (100 * x).toFixed(1).padStart(5)
function report(rows, label) {
  if (args.verbose) for (const r of rows.filter(r => r.piece)) console.log(`  ${r.piece.padEnd(10)} n=${String(r.notes).padStart(4)}  S ${pct(r.string)}  F ${pct(r.finger)}  S+F ${pct(r.stringFinger)}  S+P ${pct(r.position)}  all ${pct(r.all)}  high ${pct(r.high)}  soft ${pct(r.soft)}  ${r.ms.toFixed(0)} ms`)
  console.log(`${label.padEnd(22)} string ${pct(avg(rows, 'string'))}  finger ${pct(avg(rows, 'finger'))}  S+F ${pct(avg(rows, 'stringFinger'))}  S+P ${pct(avg(rows, 'position'))}  all ${pct(avg(rows, 'all'))}  high ${pct(avg(rows, 'high'))}  soft ${pct(avg(rows, 'soft'))}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.human) {
    // each violinist vs the other nine
    const rows = []
    for (const d of data) for (let v = 0; v < d.truths.length; v++) {
      const est = d.truths[v].map(n => n.truth ? { pitch: n.pitch, string: n.truth.string, finger: n.truth.finger, base: null } : { pitch: n.pitch })
      const others = d.truths.filter((_, i) => i !== v)
      const per = others.map(t => compare(est.map(e => ({ ...e, finger: e.finger, base: 2 })), t))
      const n = per[0].n
      rows.push({ notes: n, string: per.reduce((a, r) => a + r.string, 0) / per.length, finger: per.reduce((a, r) => a + r.finger, 0) / per.length, stringFinger: per.reduce((a, r) => a + r.stringFinger, 0) / per.length, position: 0, all: 0, high: Math.max(...per.map(r => r.stringFinger)), soft: 0 })
    }
    report(rows, 'violinist vs others')
    let pa = 0, pn = 0
    for (const d of data) for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) { pa += agreement(d.truths[a], d.truths[b]); pn++ }
    console.log(`pairwise S+F agreement between violinists ${(100 * pa / pn).toFixed(1)} %`)
  }
  const t0 = Date.now()
  const rows = run(data, baseOpts)
  report(rows, `engine (${baseOpts.mode})`)
  console.log(`  ${rows.reduce((a, r) => a + r.notes, 0)} notes × 10 annotations, fingering took ${rows.reduce((a, r) => a + r.ms, 0).toFixed(0)} ms (${Date.now() - t0} ms with scoring)`)

  if (args.tune) {
    const rounds = +args.tune || 2
    const tune = (pieces, start) => {
      let w = structuredClone(start)
      // --bench=λ adds λ × the fraction of textbook exercises fingered exactly
      const lam = +args.bench || 0
      const score = ww => avg(run(pieces, { ...baseOpts, weights: ww }), 'stringFinger') + (lam ? lam * runSuite({ weights: ww }).filter(r => r.exact).length / 28 : 0)
      let best = score(w)
      // every number, array entries included ("pos.3")
      const keys = []
      for (const [k, v] of Object.entries(DEFAULTS.weights)) {
        if (['letter', 'posOffKey', 'template'].includes(k)) continue   // off / not observable on TNUA
        if (typeof v === 'number') keys.push([k])
        else if (Array.isArray(v)) v.forEach((_, i) => keys.push([k, i]))
      }
      const get = (ww, [k, i]) => { const v = ww[k] ?? DEFAULTS.weights[k]; return i == null ? v : v[i] }
      const set = (ww, [k, i], x) => {
        const out = { ...ww }
        if (i == null) out[k] = x
        else { out[k] = [...(ww[k] ?? DEFAULTS.weights[k])]; out[k][i] = x }
        return out
      }
      for (let r = 0; r < rounds; r++) {
        for (const key of keys) {
          const v = get(w, key)
          const trials = v === 0 ? [-0.3, -0.1, 0.1, 0.3] : [v * 0.5, v * 0.75, v * 1.33, v * 2, -v * 0.5]
          for (const x of trials) {
            const ww = set(w, key, x)
            const s = score(ww)
            if (s > best + 1e-5) { best = s; w = ww; if (args.verbose) console.log(`    ${key.join('.')} → ${x.toFixed(3)}  ${pct(s)}`) }
          }
        }
        console.log(`  round ${r + 1}: train S+F ${pct(best)}  ${JSON.stringify(w)}`)
      }
      return w
    }
    if (args.all) { tune(data, baseOpts.weights); process.exit(0) }
    const half = [data.filter((_, i) => i % 2 === 0), data.filter((_, i) => i % 2 === 1)]
    const test = []
    for (let k = 0; k < 2; k++) {
      console.log(`fold ${k + 1}: tune on ${half[k].map(d => d.piece).join(' ')}`)
      const w = tune(half[k], baseOpts.weights)
      test.push(...run(half[1 - k], { ...baseOpts, weights: w }))
    }
    report(test, 'tuned, held-out folds')
    const all = tune(data, baseOpts.weights)
    console.log('weights tuned on all pieces:', JSON.stringify(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, Array.isArray(v) ? v : +v.toFixed(3)]))))
  }
}
