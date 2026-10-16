#!/usr/bin/env node
// Run every exercise with a known answer and print predicted vs textbook fingering.
//   node strings/test/bench.js [--only=substr] [--quiet] [--weights='{…}'] [--mode=…]
import { exercises, bestMatch } from '../exercises.js'
import { fingerLine, fingerTokens } from '../fingering.js'

export function runSuite(options = {}, filter = () => true) {
  const rows = []
  for (const ex of exercises().filter(e => e.expect && filter(e))) {
    const notes = ex.notes.map(n => ({ ...n }))
    fingerLine(notes, { ...options, instrument: ex.instrument, mode: options.mode || ex.mode || 'standard' })
    const got = fingerTokens(notes, ex.instrument, { positions: true })
    rows.push({ id: ex.id, suite: ex.suite, got, want: ex.expect, ...bestMatch(got, ex.expect) })
  }
  return rows
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
  const opts = { weights: args.weights ? JSON.parse(args.weights) : {}, ...(args.mode ? { mode: args.mode } : {}) }
  const rows = runSuite(opts, ex => !args.only || ex.id.includes(args.only))
  for (const r of rows) {
    if (args.quiet && r.exact) continue
    console.log(`${r.exact ? '✓' : '✗'} ${r.id.padEnd(12)} ${r.got.join(' ')}`)
    if (!r.exact) console.log(`  ${''.padEnd(12)} ${r.want[0].join(' ')}  ${(r.agree * 100).toFixed(0)}%${r.want.length > 1 ? ` (+${r.want.length - 1} accepted)` : ''}`)
  }
  for (const suite of ['core', 'scales']) {
    const s = rows.filter(r => r.suite === suite)
    if (!s.length) continue
    console.log(`${suite}: ${s.filter(r => r.exact).length}/${s.length} exact, ${(100 * s.reduce((a, r) => a + r.agree, 0) / s.length).toFixed(1)}% notes agree`)
  }
}
