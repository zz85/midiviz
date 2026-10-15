#!/usr/bin/env node
// Run every exercise through the engine and print predicted vs textbook fingering.
//   node fingering/test/bench.js [--distance=semitone|physical|mixed] [--only=substr] [--quiet]
import { exercises } from '../exercises.js'
import { fingerPiece, fingerString, PARNCUTT } from '../fingering.js'

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
const opts = args.preset === 'parncutt' ? structuredClone(PARNCUTT) : {}
if (args.distance) opts.distance = args.distance
if (args.weights) opts.weights = { ...opts.weights, ...JSON.parse(args.weights) }

export function runSuite(options = {}, filter = () => true) {
  const rows = []
  for (const ex of exercises().filter(filter)) {
    const notes = ex.notes.map(n => ({ ...n }))
    const r = fingerPiece(notes, options)
    for (const hand of ['R', 'L']) {
      const want = ex.expect?.[hand]
      if (!want) continue
      const got = fingerString(r.notes, hand)
      const accepted = [].concat(want)
      // per-note agreement with the closest accepted fingering
      let best = 0
      for (const w of accepted) {
        let m = 0
        for (let i = 0; i < w.length; i++) if (w[i] === got[i]) m++
        best = Math.max(best, m / w.length)
      }
      rows.push({ id: ex.id, suite: ex.suite || 'core', hand, got, want: accepted, exact: accepted.includes(got), agree: best })
    }
  }
  return rows
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = runSuite(opts, ex => !args.only || ex.id.includes(args.only))
  for (const r of rows) {
    if (args.quiet && r.exact) continue
    console.log(`${r.exact ? '✓' : '✗'} ${r.id.padEnd(18)} ${r.hand} got ${r.got}${r.exact ? '' : `  want ${r.want[0]}${r.want.length > 1 ? ` (+${r.want.length - 1})` : ''}  ${(r.agree * 100).toFixed(0)}%`}`)
  }
  for (const suite of ['core', 'scales']) {
    const s = rows.filter(r => r.suite === suite)
    if (!s.length) continue
    const exact = s.filter(r => r.exact).length
    const agree = s.reduce((a, r) => a + r.agree, 0) / s.length
    console.log(`${suite}: ${exact}/${s.length} exact, ${(agree * 100).toFixed(1)}% notes agree`)
  }
}
