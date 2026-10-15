// Evaluation against the PIG fingering dataset (Nakamura, Saito & Yoshii 2020).
//
// Pure functions, no file system: test/pig.js does the I/O. The metrics follow
// the paper (§6.2); with ground truths G_1..G_K of one piece and an estimate E:
//   M_gen  mean over k of the match rate with G_k
//   M_high best match rate over k
//   M_soft fraction of notes where E matches at least one G_k
//   M_rec  1 − E_rec / N, E_rec the cheapest edit cost against a "recombined"
//          truth that may switch from G_k to G_l (cost 1) at notes where the
//          two agree, every mismatch costing 1
// Fingers compare as absolute values (1..5); a substitution such as "1_2" is
// represented by its first finger (fromPIG does that).

import { fromPIG } from './fingering.js'

/** Parse every annotation of a piece and align them note by note. */
export function loadPiece(texts) {
  const anns = texts.map(t => fromPIG(t))
  const base = anns[0]
  const key = n => `${Math.round(n.on * 1000)}|${n.pitch}`
  const truths = anns.map(a => {
    if (a.length === base.length && a.every((n, i) => n.pitch === base[i].pitch)) return a.map(n => n.truth)
    // different note order or count: align by (onset, pitch), unknown = 0
    const m = new Map()
    for (const n of a) if (!m.has(key(n))) m.set(key(n), n.truth)
    return base.map(n => m.get(key(n)) ?? 0)
  })
  const hands = anns.map(a => a.map(n => n.hand))
  return { notes: base, truths, hands }
}

export function metrics(est, truths) {
  const N = est.length, K = truths.length
  if (!N) return { gen: 0, high: 0, soft: 0, rec: 0 }
  const rates = truths.map(g => g.reduce((s, f, i) => s + (f === est[i] ? 1 : 0), 0) / N)
  let soft = 0
  for (let i = 0; i < N; i++) if (truths.some(g => g[i] === est[i])) soft++
  return { gen: rates.reduce((a, b) => a + b, 0) / K, high: Math.max(...rates), soft: soft / N, rec: 1 - recombinedCost(est, truths) / N }
}

/** Edit cost against the best recombination of the ground truths (Nakamura 2020, App. A). */
export function recombinedCost(est, truths) {
  const K = truths.length, N = est.length
  let d = truths.map(g => (g[0] === est[0] ? 0 : 1))
  for (let n = 1; n < N; n++) {
    const nd = new Array(K)
    for (let k = 0; k < K; k++) {
      let best = d[k]
      // switch at note n−1, allowed where the two truths agree there
      for (let l = 0; l < K; l++) if (l !== k && truths[l][n - 1] === truths[k][n - 1]) best = Math.min(best, d[l] + 1)
      nd[k] = best + (truths[k][n] === est[n] ? 0 : 1)
    }
    d = nd
  }
  return Math.min(...d)
}

/** Mean of each metric over pieces (the paper averages per piece). */
export function average(rows) {
  const out = {}
  for (const k of ['gen', 'high', 'soft', 'rec', 'hand', 'joint']) {
    const v = rows.map(r => r[k]).filter(x => x != null)
    if (v.length) out[k] = v.reduce((a, b) => a + b, 0) / v.length
  }
  return out
}

/** Published results on the 30-piece test set (Nakamura 2020 Table 2), in %. */
export const PUBLISHED = [
  ['1st-order HMM', 61.7, 68.3, 82.8, 74.0],
  ['3rd-order HMM', 64.5, 71.0, 85.5, 77.8],
  ['Chord HMM', 61.2, 67.7, 81.7, 73.8],
  ['DNN (LSTM)', 61.3, 66.1, 82.8, 69.5],
  ['Human', 71.4, 79.1, 90.8, 84.3],
]
