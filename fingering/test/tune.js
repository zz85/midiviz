#!/usr/bin/env node
// Coordinate-descent weight tuner over the exercise suite.
//   node fingering/test/tune.js [--rounds=4] [--suite=all|core|scales]
// Prints the best weights as JSON; paste the ones you like into DEFAULTS.weights.
import { DEFAULTS } from '../fingering.js'
import { runSuite } from './bench.js'

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
const rounds = +(args.rounds || 4)

function score(weights) {
  const rows = runSuite({ weights })
  const by = s => rows.filter(r => r.suite === s)
  const part = s => { const r = by(s); return r.reduce((a, x) => a + x.agree, 0) / r.length + 0.5 * r.filter(x => x.exact).length / r.length }
  return part('core') + part('scales')
}

// flatten weights (arrays become name[i])
const keys = []
const base = structuredClone(DEFAULTS.weights)
for (const [k, v] of Object.entries(base)) {
  if (Array.isArray(v)) v.forEach((x, i) => { if (x) keys.push([k, i]) })
  else keys.push([k])
}
const get = (w, [k, i]) => (i === undefined ? w[k] : w[k][i])
const set = (w, [k, i], v) => { if (i === undefined) w[k] = v; else w[k][i] = v }

let best = structuredClone(base), bestScore = score(best)
console.error('start', bestScore.toFixed(4))
for (let r = 0; r < rounds; r++) {
  let improved = false
  for (const key of keys) {
    for (const f of [0, 0.5, 0.75, 1.33, 2]) {
      const w = structuredClone(best)
      const v = get(best, key)
      set(w, key, f === 0 ? 0 : v * f || (f > 1 ? 0.5 : 0))
      const s = score(w)
      if (s > bestScore + 1e-6) { best = w; bestScore = s; improved = true; console.error(`r${r} ${key.join('.')} → ${get(w, key)}  ${s.toFixed(4)}`) }
    }
  }
  if (!improved) break
}
console.log(JSON.stringify(best))
