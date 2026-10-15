#!/usr/bin/env node
// Evaluate the fingering engine on the PIG dataset.
//
//   node fingering/test/pig.js <PIG folder> [options]
//
// <PIG folder> is the unzipped PianoFingeringDataset (any folder that contains
// the NNN-M_fingering.txt files, e.g. .../FingeringFiles). The dataset is for
// non-commercial academic use and may not be redistributed: keep it outside
// the repo, or in fingering/data/ which is git-ignored.
//
// Options
//   --test=1-30,45      piece numbers of the test set. Default: every piece
//                       with 4 or more annotations, which is how Nakamura 2020
//                       defines it (the Bach, Mozart and Chopin subsets, 30
//                       pieces); the other 120 pieces are the train set
//   --all               report on every piece instead of test / train
//   --preset=parncutt   the published Parncutt model instead of ours
//   --weights='{..}'    override weights
//   --split             also run with our own hand split (hand / joint accuracy)
//   --verbose           one line per piece
//   --tune[=rounds]     coordinate-descent weight tuning on the TRAIN pieces,
//                       then report the test set with the tuned weights
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fingerPiece, DEFAULTS, PARNCUTT } from '../fingering.js'
import { loadPiece, metrics, average, PUBLISHED } from '../pigeval.js'

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
const root = process.argv.slice(2).find(a => !a.startsWith('--'))
if (!root) {
  console.error('usage: node fingering/test/pig.js <PIG folder> [--test=1-30] [--split] [--verbose] [--preset=parncutt] [--tune]')
  process.exit(1)
}

// ── Load ───────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/^\d+-\d+_fingering\.txt$/i.test(f)) out.push(p)
  }
  return out
}
const files = walk(root)
if (!files.length) { console.error(`no NNN-M_fingering.txt files under ${root}`); process.exit(1) }
const byPiece = new Map()
for (const f of files.sort()) {
  const id = +/(\d+)-\d+_fingering\.txt$/i.exec(f)[1]
  if (!byPiece.has(id)) byPiece.set(id, [])
  byPiece.get(id).push(readFileSync(f, 'utf8'))
}
const pieces = [...byPiece].map(([id, texts]) => ({ id, ...loadPiece(texts) }))

const range = s => new Set(String(s).split(',').flatMap(part => {
  const [a, b] = part.split('-').map(Number)
  return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i)
}))
const testIds = args.test ? range(args.test) : new Set(pieces.filter(p => p.truths.length >= 4).map(p => p.id))
const test = args.all ? pieces : pieces.filter(p => testIds.has(p.id))
const train = args.all ? [] : pieces.filter(p => !testIds.has(p.id))
const annCount = ps => { const c = {}; for (const p of ps) c[p.truths.length] = (c[p.truths.length] || 0) + 1; return Object.entries(c).map(([k, v]) => `${v}×${k}`).join(' ') }
console.log(`PIG: ${pieces.length} pieces, ${files.length} fingerings, ${pieces.reduce((s, p) => s + p.notes.length, 0)} notes`)
if (!args.all && !args.test && test.length !== 30) console.log(`note: ${test.length} pieces have 4+ annotations (the paper's test set has 30); pass --test=… to set it explicitly`)
if (!args.all) {
  console.log(`test  ${test.length} pieces [${[...testIds].sort((a, b) => a - b).join(',')}] (annotations per piece: ${annCount(test)})`)
  console.log(`train ${train.length} pieces (annotations per piece: ${annCount(train)})`)
}

// ── Run ────────────────────────────────────────────────────────────────────
function options(weights) {
  const base = args.preset === 'parncutt' ? structuredClone(PARNCUTT) : {}
  return { ...base, weights: { ...base.weights, ...weights } }
}

function evalPiece(p, opts, { split = false } = {}) {
  // given hands: the first annotator's channels (as the literature does)
  const notes = p.notes.map((n, i) => ({ pitch: n.pitch, on: n.on, off: n.off, velocity: n.velocity, hand: split ? undefined : p.hands[0][i] }))
  const r = fingerPiece(notes, opts)
  const est = notes.map(n => n.finger)
  const m = metrics(est, p.truths)
  if (split) {
    const hand = notes.filter((n, i) => n.hand === p.hands[0][i]).length / notes.length
    // joint: hand and finger right, against the best-matching annotator
    const joint = Math.max(...p.truths.map((g, k) => notes.filter((n, i) => n.hand === p.hands[k][i] && n.finger === g[i]).length / notes.length))
    Object.assign(m, { hand, joint })
  }
  return { id: p.id, n: notes.length, K: p.truths.length, ms: r.ms, ...m }
}

function evalSet(set, opts, extra) { return set.map(p => evalPiece(p, opts, extra)) }

const pct = x => (x == null ? '   –  ' : (100 * x).toFixed(1).padStart(6))
function report(title, rows) {
  const a = average(rows)
  const ms = rows.reduce((s, r) => s + r.ms, 0)
  if (args.verbose) for (const r of rows) console.log(`  ${String(r.id).padStart(3, '0')}  ${String(r.n).padStart(5)} notes  K=${r.K}  gen${pct(r.gen)} high${pct(r.high)} soft${pct(r.soft)} rec${pct(r.rec)}${r.hand != null ? `  hand${pct(r.hand)} joint${pct(r.joint)}` : ''}`)
  console.log(`${title.padEnd(26)} M_gen${pct(a.gen)}  M_high${pct(a.high)}  M_soft${pct(a.soft)}  M_rec${pct(a.rec)}${a.hand != null ? `   hand${pct(a.hand)}  joint${pct(a.joint)}` : ''}   (${(ms / 1000).toFixed(1)} s)`)
  return a
}

let weights = args.weights ? JSON.parse(args.weights) : {}

if (args.tune) {
  if (!train.length) { console.error('--tune needs a train set (do not use --all)'); process.exit(1) }
  const rounds = args.tune === true ? 2 : +args.tune
  const score = w => average(evalSet(train, options(w))).gen
  const keys = []
  for (const [k, v] of Object.entries(DEFAULTS.weights)) {
    if (Array.isArray(v)) v.forEach((x, i) => { if (x) keys.push([k, i]) })
    else keys.push([k])
  }
  const get = (w, [k, i]) => (i === undefined ? w[k] : w[k][i])
  const set = (w, [k, i], v) => { if (i === undefined) w[k] = v; else w[k][i] = v }
  let best = { ...structuredClone(DEFAULTS.weights), ...weights }, bestScore = score(best)
  console.log(`tuning on ${train.length} train pieces: start M_gen ${pct(bestScore)}`)
  for (let r = 0; r < rounds; r++) {
    let improved = false
    for (const key of keys) for (const f of [0, 0.5, 0.75, 1.33, 2]) {
      const w = structuredClone(best), v = get(best, key)
      set(w, key, f === 0 ? 0 : v * f || (f > 1 ? 0.5 : 0))
      const s = score(w)
      if (s > bestScore + 1e-5) { best = w; bestScore = s; improved = true; console.log(`  r${r} ${key.join('.')} → ${+get(w, key).toFixed(3)}  train M_gen ${pct(s)}`) }
    }
    if (!improved) break
  }
  weights = best
  console.log('tuned weights:', JSON.stringify(best))
}

console.log('')
const model = args.preset === 'parncutt' ? 'Parncutt 1997' : 'ours'
if (train.length) report(`${model}, train (given hands)`, evalSet(train, options(weights)))
report(`${model}, ${args.all ? 'all' : 'test'} (given hands)`, evalSet(test, options(weights)))
if (args.split) report(`… with our hand split`, evalSet(test, options(weights), { split: true }))
if (!args.all) {
  console.log('\npublished, same test set (Nakamura et al. 2020, Table 2):')
  for (const [name, ...v] of PUBLISHED) console.log(`${name.padEnd(26)} M_gen${v[0].toFixed(1).padStart(6)}  M_high${v[1].toFixed(1).padStart(6)}  M_soft${v[2].toFixed(1).padStart(6)}  M_rec${v[3].toFixed(1).padStart(6)}`)
}
