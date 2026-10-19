// Measure the bowed waveguide's playable window (Schelleng diagram) for #034.
//
//   node strings/test/schelleng.js [--instrument=violin] [--json=out.json]
//
// For each string, contact point β, bow speed v and a stopped note, scan the
// bow force on a log grid and keep the forces at which the string settles into
// Helmholtz motion (≥ 90 % regular slip intervals over 0.35–0.75 s). The
// window's ends are the measured F_min and F_max. Controls are constant after
// a 40 ms ramp of v (the force ramps with it), so this is the steady-state window.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ViolinSynth, WaveguideString, INSTRUMENTS, NCH, midiHz } from '../sound/bowed.js'

const SR = 48000
const FS = Array.from({ length: 30 }, (_, i) => 0.01 * Math.pow(10, i * 3.5 / 29))   // 0.01 … 31.6 N

/** Is (s, f0, β, v, F) Helmholtz in steady state? */
export function helmholtz(instrument, s, f0, beta, v, F, { secs = 0.75, params = {} } = {}) {
  const syn = new ViolinSynth(SR, { instrument, model: 'waveguide', bowPress: false, ...params })
  const open = INSTRUMENTS[instrument].open.map(midiHz)
  const src = { at(t, out) {
    for (let k = 0; k < 4; k++) { const o = k * NCH; out[o] = open[k]; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 0.1; out[o + 4] = 0; out[o + 5] = 0; out[o + 6] = 0 }
    const r = Math.min(1, t / 0.04), o = s * NCH
    out[o] = f0; out[o + 1] = v * r; out[o + 2] = F * r; out[o + 3] = beta
  } }
  const st = syn.strings[s], orig = st.tick.bind(st)
  const ts = []; let n = 0, was = false, stick = 0
  st.tick = (a, b, c) => { const y = orig(a, b, c); if (!st.slipping) stick++; else if (!was) { if (stick > 0.25 * st.N) ts.push(n / st.sr); stick = 0 } was = st.slipping; n++; return y }
  const L = new Float32Array(128), R = new Float32Array(128)
  let t = 0
  for (let i = 0; i < secs * SR; i += 128) t = syn.process(src, t, 1 / SR, L, R, 128)
  const P = 1 / f0, list = ts.filter(x => x > 0.35)
  if (list.length < 10) return false
  let reg = 0
  for (let j = 1; j < list.length; j++) if (Math.abs(list[j] - list[j - 1] - P) < 0.1 * P) reg++
  return reg / (list.length - 1) >= 0.9
}

/** The window [F_min, F_max] (the longest run of Helmholtz forces on the grid), or null. */
export function windowAt(instrument, s, f0, beta, v, opts) {
  const ok = FS.map(F => helmholtz(instrument, s, f0, beta, v, F, opts))
  let best = null, a = -1
  for (let i = 0; i <= ok.length; i++) {
    if (ok[i] && a < 0) a = i
    if (!ok[i] && a >= 0) { if (!best || i - a > best[1] - best[0]) best = [a, i]; a = -1 }
  }
  return best ? { Fmin: FS[best[0]], Fmax: FS[best[1] - 1], n: best[1] - best[0] } : null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
  const inst = arg('instrument', 'violin'), s = arg('string', null)
  const rows = []
  for (const k of s != null ? [+s] : [0, 1, 2, 3]) for (const semis of [0, 5]) for (const beta of [0.06, 0.1, 0.16]) for (const v of [0.1, 0.3, 0.6]) {
    const f0 = midiHz(INSTRUMENTS[inst].open[k] + semis)
    const w = windowAt(inst, k, f0, beta, v)
    rows.push({ inst, s: k, semis, f0, beta, v, Z: INSTRUMENTS[inst].Z[k], ...(w || { Fmin: null, Fmax: null }) })
    console.log(JSON.stringify(rows[rows.length - 1]))
  }
  if (arg('json')) writeFileSync(arg('json'), JSON.stringify(rows))
}
