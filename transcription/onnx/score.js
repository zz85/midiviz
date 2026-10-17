// Note-level transcription scores in the style of mir_eval.transcription:
// a detected note matches a reference note of the same pitch whose onset is
// within `onsetTol` (50 ms); with offsets, its offset must also be within
// max(offsetTol, 20 % of the reference duration). Greedy one-to-one matching
// by onset distance (mir_eval uses maximum bipartite matching; the two agree
// except on rare crowded cases).

export function scoreNotes(ref, est, { onsetTol = 0.05, offsetRatio = 0.2, offsetMin = 0.05, offsets = false } = {}) {
  const pairs = []
  for (let i = 0; i < ref.length; i++) {
    for (let j = 0; j < est.length; j++) {
      if (ref[i].pitch !== est[j].pitch) continue
      const d = Math.abs(ref[i].start - est[j].start)
      if (d > onsetTol) continue
      if (offsets) {
        const tol = Math.max(offsetMin, offsetRatio * (ref[i].end - ref[i].start))
        if (Math.abs(ref[i].end - est[j].end) > tol) continue
      }
      pairs.push([d, i, j])
    }
  }
  pairs.sort((a, b) => a[0] - b[0])
  const ur = new Uint8Array(ref.length), ue = new Uint8Array(est.length)
  const matches = []
  for (const [d, i, j] of pairs) if (!ur[i] && !ue[j]) { ur[i] = ue[j] = 1; matches.push([i, j, d]) }
  const tp = matches.length
  const p = est.length ? tp / est.length : 0, r = ref.length ? tp / ref.length : 0
  return {
    precision: p, recall: r, f1: p + r ? (2 * p * r) / (p + r) : 0,
    tp, fp: est.length - tp, fn: ref.length - tp,
    meanOnsetError: tp ? matches.reduce((s, m) => s + m[2], 0) / tp : 0,
    matchedRef: ur, matchedEst: ue,
  }
}
