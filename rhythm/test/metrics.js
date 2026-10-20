// Beat-tracking metrics after mir_eval.beat (Davies, Degara & Plumbley 2009):
// F-measure (±70 ms), CMLt / AMLt continuity, and tempo accuracy.

/** F-measure with a ±win window, one-to-one matching in time order. */
export function fMeasure(ref, est, win = 0.07) {
  if (!ref.length && !est.length) return 1
  if (!ref.length || !est.length) return 0
  let i = 0, j = 0, hit = 0
  while (i < ref.length && j < est.length) {
    const d = est[j] - ref[i]
    if (Math.abs(d) <= win) { hit++; i++; j++ } else if (d < 0) j++; else i++
  }
  const p = hit / est.length, r = hit / ref.length
  return p + r ? 2 * p * r / (p + r) : 0
}

/** Continuity (Hainsworth / Klapuri): fraction of beats that are correct (phase within 17.5 % of the interval, interval within 17.5 %) — total, not longest run. */
function continuity(ref, est, phaseTol = 0.175, periodTol = 0.175) {
  if (ref.length < 2 || est.length < 2) return 0
  let ok = 0
  for (let j = 1; j < est.length; j++) {
    // nearest reference beat
    let i = 0, best = Infinity
    for (let k = 0; k < ref.length; k++) { const d = Math.abs(est[j] - ref[k]); if (d < best) { best = d; i = k } }
    const ri = i > 0 ? ref[i] - ref[i - 1] : ref[1] - ref[0]
    if (best > phaseTol * ri) continue
    const ei = est[j] - est[j - 1]
    // previous estimated beat must also be near the previous reference beat
    if (i === 0 || Math.abs(est[j - 1] - ref[i - 1]) > phaseTol * ri) continue
    if (Math.abs(ei - ri) > periodTol * ri) continue
    ok++
  }
  return ok / Math.max(ref.length - 1, est.length - 1)
}

export function cmlt(ref, est) { return continuity(ref, est) }

/** AMLt: the best continuity over the allowed metrical variants of the reference (double, half both phases, off-beat). */
export function amlt(ref, est) {
  const variants = [ref]
  const dbl = []; for (let i = 0; i + 1 < ref.length; i++) dbl.push(ref[i], (ref[i] + ref[i + 1]) / 2)
  variants.push(dbl)
  variants.push(ref.filter((_, i) => i % 2 === 0), ref.filter((_, i) => i % 2 === 1))
  variants.push(dbl.filter((_, i) => i % 2 === 1))   // off-beat
  let thirds = []; for (let i = 0; i + 1 < ref.length; i++) thirds.push(ref[i], ref[i] + (ref[i + 1] - ref[i]) / 3, ref[i] + 2 * (ref[i + 1] - ref[i]) / 3)
  variants.push(ref.filter((_, i) => i % 3 === 0))
  return Math.max(...variants.map(v => continuity(v, est)))
}

export function scoreBeats(ref, est, skip = 5) {
  // skip the first seconds of the reference, as mir_eval does
  const r = ref.filter(t => t >= skip), e = est.filter(t => t >= skip)
  return { f: fMeasure(r, e), cmlt: cmlt(r, e), amlt: amlt(r, e) }
}

/** Tempo: Acc1 within ±4 %, Acc2 also allowing ×2, ×3, ×½, ×⅓. */
export function tempoAcc(refBpm, estBpm) {
  const ok = (a, b) => Math.abs(a / b - 1) <= 0.04
  const acc1 = ok(estBpm, refBpm)
  const acc2 = [1, 2, 3, 1 / 2, 1 / 3].some(m => ok(estBpm, refBpm * m))
  return { acc1, acc2 }
}
