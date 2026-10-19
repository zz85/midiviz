// Estimate the body of the violin, viola and cello from the University of Iowa
// recordings, for #034's physical models (strings/sound/body.js, research 05 §4.1a).
//
//   node strings/test/fit_body.js [--instrument=violin] [--model=waveguide] [--quick]
//
// Needs the Iowa banks (strings/sound/samples/iowa, see build_iowa.js) and ffmpeg.
//
// Every Iowa recording is a steady, non-vibrato note on a known string at a
// known dynamic. Our string plays the same note on the same string at that
// dynamic, and its bridge force (before any body) is measured the same way.
// For each harmonic k, the level difference recording − ours is the body's
// response at k·f0, plus a per-note level. Chromatic notes on four strings
// put harmonics everywhere from the lowest note to 12 kHz, so the pooled
// differences trace the body densely, as Tommasini & Lucato's 2004 patent and
// Pérez Carrillo et al. (JASA 2011) do with glissandi:
//
//   r(n, k) = g(n) + s(dyn)·log2 k + B(k·f0)
//
// solved by alternating robust estimates: g per note (median), s per dynamic
// layer (a brightness difference between their bow and ours, mean zero), and
// B by kernel regression on a 1/48-octave grid (σ = 1/40 octave), trimming
// residuals beyond 2.5 MAD. Harmonics in a notch of either spectrum (bow
// position, |dB below the local trend| > 10) and below the noise are dropped,
// as are notes our string does not play in Helmholtz motion.
//
// Validated by 2-fold cross-validation over notes (even / odd semitones): the
// held-out harmonic residual is compared with the same residual for the modal
// body (bowed.js Body + the fitted EQ and voicing in tone.js). The second ear
// gets the same curve with ±1.5 dB of smooth seeded ripple above 800 Hz, for
// stereo width. Writes strings/sound/body-iowa.js.
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hasBank, hasFfmpeg } from './hybrid-bank.js'
import { SR, FMAX, VEL, GRID, G0, NG, renderRaw, collect, spread, bodyResidual, actRms, fit, ripple, powerSpec, median } from './body-eval.js'
import { loadBankNode } from './hybrid-bank.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const INSTS = arg('instrument', 'violin,viola,cello').split(',')
const MODELS = arg('model', 'waveguide,source').split(',')
const QUICK = process.argv.includes('--quick')
if (!hasFfmpeg()) { console.error('needs ffmpeg'); process.exit(1) }

// ── energy match ──
// The fit matches the median level of each harmonic (in dB). Loudness and
// brightness follow the power, and above ~2 kHz the recordings' harmonics
// scatter much more than ours (a real body has sharp resonances that a
// harmonic sometimes hits), so at an equal median the recordings carry up to
// 10 dB more energy at 5–13 kHz: our tone was duller than the violin's. Here
// the bodies are corrected so the long-term power in third-octave bands
// matches the recordings, over every other note: per note the band powers are
// normalised to its 300 Hz – 2 kHz total, averaged as powers (5 % trimmed), compared; the
// difference above 1.25 kHz becomes a smooth correction (±10 dB at most
// per step, 80 % of it), three times over.
const BANDS = []; for (let f = 250; f < 13000; f *= 2 ** (1 / 3)) BANDS.push(f)
function bandLevels(P) {
  const bin = SR / 8192
  const b = BANDS.map(f => { let s = 0; for (let k = Math.round(f / 2 ** (1 / 6) / bin); k < Math.round(f * 2 ** (1 / 6) / bin); k++) s += P[k]; return s })
  let ref = 0; for (let k = Math.round(300 / bin); k < Math.round(2000 / bin); k++) ref += P[k]
  return ref > 0 ? b.map(v => v / ref) : null
}
/** Mean band powers (dB) of the recordings and of our renders through `spec`. */
function ltas(instrument, model, spec, bank) {
  const R = BANDS.map(() => []), O = BANDS.map(() => [])
  for (const [key, pack] of Object.entries(bank.m.packs)) {
    const [s, dyn] = key.split('_'), x = bank.pcm[key]
    for (const m of pack.notes) {
      if (m.midi % 2 || (QUICK && m.midi % 3)) continue
      const a = m.offset + m.attackEnd + Math.round(0.05 * SR), b = m.offset + Math.min(m.headEnd, m.attackEnd + Math.round(1.4 * SR))
      const Pi = powerSpec(x, a, b); if (!Pi) continue
      const Po = powerSpec(renderRaw(instrument, model, m.midi, +s, VEL[dyn], 1.6, spec), Math.round(0.55 * SR), Math.round(1.55 * SR))
      const bi = bandLevels(Pi), bo = bandLevels(Po)
      if (!bi || !bo || bo.some(v => !isFinite(v))) continue
      bi.forEach((v, j) => { R[j].push(v); O[j].push(bo[j]) })
    }
  }
  // power mean without the top and bottom 5 % of notes (one raucous note must not set a band)
  const tmean = a => { const s = Float64Array.from(a).sort(), k = Math.floor(s.length * 0.05); let t = 0; for (let i = k; i < s.length - k; i++) t += s[i]; return t / (s.length - 2 * k) }
  return BANDS.map((f, j) => 10 * Math.log10(tmean(O[j]) / tmean(R[j])))
}
function energyMatch(instrument, model, spec) {
  const bank = loadBankNode(instrument)
  const before = ltas(instrument, model, spec, bank)
  let d = before
  for (let it = 0; it < 3; it++) {
    // correction per band: none below 1 kHz, full from 1.6 kHz, ±10 dB, smoothed over neighbours
    const c0 = BANDS.map((f, j) => -0.8 * Math.max(-10, Math.min(10, d[j])) * Math.max(0, Math.min(1, Math.log2(f / 1000) / Math.log2(1.6))))
    const c = c0.map((v, j) => 0.25 * (c0[j - 1] ?? v) + 0.5 * v + 0.25 * (c0[j + 1] ?? v))
    const at = lf => { const x = (lf - Math.log2(BANDS[0])) * 3; if (x <= 0) return c[0]; if (x >= c.length - 1) return c[c.length - 1]; const i = x | 0; return c[i] + (c[i + 1] - c[i]) * (x - i) }
    for (const ear of spec.dB) for (let i = 0; i < NG; i++) ear[i] = Math.round((ear[i] + at(G0 + i * GRID.step)) * 100) / 100
    d = ltas(instrument, model, spec, bank)
  }
  return { before: before.map(v => +v.toFixed(1)), after: d.map(v => +v.toFixed(1)) }
}

const OUT = arg('out', here + '../sound/body-iowa.js')
const data = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8').match(/BODY_IOWA = (\{[\s\S]*\})\n/)?.[1] ?? '{}') : {}
for (const instrument of INSTS) {
  if (!hasBank(instrument)) { console.warn(`no ${instrument} bank`); continue }
  for (const model of MODELS) {
    const t0 = Date.now()
    const { rows, used, skipped } = collect(instrument, model, { quick: QUICK })
    const nObs = rows.reduce((a, r) => a + r.obs.length, 0)
    // cross-validation: fit on even semitones, test on odd, and back
    const cv = []
    for (const p of [0, 1]) {
      const tr = rows.filter(r => r.midi % 2 === p), te = rows.filter(r => r.midi % 2 !== p)
      const F = fit(tr)
      cv.push(spread(te, (row, o) => F.Bat(o.lf) + F.S[row.dyn] * Math.log2(o.k)))
    }
    const modal = spread(bodyResidual(instrument, model, rows.filter((r, i) => !QUICK || i % 2 === 0)), (row, o) => o.m)
    const F = fit(rows)
    const dB0 = Array.from(F.B, v => Math.round(v * 100) / 100)
    const rp = ripple(instrument.length * 977 + model.length)
    const spec = { from: GRID.from, step: GRID.step, lo: Math.round(F.lo), hi: Math.round(Math.min(F.hi, FMAX)), gainDb: 0, dB: [dB0, dB0.map((v, i) => Math.round((v + rp[i]) * 100) / 100)] }
    const em = process.argv.includes('--no-energy') ? null : energyMatch(instrument, model, spec)
    // level: match the modal body chain on a few mezzo-forte notes
    const open = { violin: [55, 62, 69, 76], viola: [48, 55, 62, 69], cello: [36, 43, 50, 57] }[instrument]
    let gm = 0, gi = 0
    for (let s = 0; s < 4; s++) for (const d of [2, 5, 9]) {
      gm += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, 'modal').subarray(0.5 * SR))
      gi += actRms(renderRaw(instrument, model, open[s] + d, s, 0.68, 1.6, spec).subarray(0.5 * SR))
    }
    spec.gainDb = Math.round(20 * Math.log10(gm / gi) * 100) / 100
    spec.stats = { notes: used, skipped, harmonics: nObs, heldOutMad: +((cv[0].mad + cv[1].mad) / 2).toFixed(2), heldOutP90: +((cv[0].p90 + cv[1].p90) / 2).toFixed(2), modalMad: +modal.mad.toFixed(2), modalP90: +modal.p90.toFixed(2), brightness: Object.fromEntries(Object.entries(F.S).map(([k, v]) => [k, +v.toFixed(2)])), ...(em ? { energy: { bands: BANDS.map(Math.round), before: em.before, after: em.after } } : {}) }
    ;(data[instrument] ??= {})[model] = spec
    console.log(`${instrument} ${model}: ${used} notes (${skipped} skipped), ${nObs} harmonics, ${F.lo.toFixed(0)}–${F.hi.toFixed(0)} Hz; held-out residual ${spec.stats.heldOutMad} dB median / ${spec.stats.heldOutP90} p90 (modal body ${spec.stats.modalMad} / ${spec.stats.modalP90}); dyn brightness dB/oct ${JSON.stringify(spec.stats.brightness)}; level ${spec.gainDb} dB; ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    if (em) console.log(`  energy (ours − recordings, dB) ${BANDS.map((f, j) => f >= 1000 ? `${(f / 1000).toFixed(1)}k ${em.before[j]}→${em.after[j]}` : '').filter(Boolean).join('  ')}`)
  }
}
writeFileSync(OUT, `// Generated by strings/test/fit_body.js from the University of Iowa recordings. Do not edit.
// Per instrument and model: { from, step (octaves), lo, hi (Hz, the fitted range), gainDb, dB: [ear 0, ear 1], stats }.
export const BODY_IOWA = ${JSON.stringify(data)}
`)
console.log('wrote', OUT)
