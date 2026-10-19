// Guettler diagram of the bowed waveguide (#034): for a bow starting from rest
// with constant acceleration a and constant force F, how long until Helmholtz
// motion (6 regular periods)? Guettler (Acta Acustica 2002) found a wedge of
// "perfect" attacks in the (a, F) plane: F roughly proportional to a, bounded by
// a raucous edge (too much force) and a loose edge (too little).
//
//   node strings/test/guettler.js [--instrument=violin] [--string=2] [--beta=0.1]
import { fileURLToPath } from 'node:url'
import { ViolinSynth, INSTRUMENTS, NCH, midiHz } from '../sound/bowed.js'

const SR = 48000

/** Pre-Helmholtz time (ms) for one (a, F) start; Infinity if Helmholtz never comes within 0.3 s. */
export function preHelmholtz(instrument, s, f0, beta, a, F, { vmax = 0.4, params = {}, forceRamp = 0 } = {}) {
  const syn = new ViolinSynth(SR, { instrument, model: 'waveguide', bowPress: false, ...params })
  const open = INSTRUMENTS[instrument].open.map(midiHz)
  const src = { at(t, out) {
    for (let k = 0; k < 4; k++) { const o = k * NCH; out[o] = open[k]; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 0.1; out[o + 4] = 0; out[o + 5] = 0; out[o + 6] = 0 }
    const o = s * NCH, tt = Math.max(0, t - 0.01)
    out[o] = f0; out[o + 3] = beta
    out[o + 1] = Math.min(vmax, a * tt)
    // force: constant from the start (forceRamp 0), or rising with the velocity over forceRamp s
    out[o + 2] = t < 0.01 ? 0 : F * (forceRamp ? Math.min(1, tt / forceRamp) : 1)
  } }
  const st = syn.strings[s], orig = st.tick.bind(st)
  const ts = []; let n = 0, was = false, stick = 0
  st.tick = (x, y, z) => { const r = orig(x, y, z); if (!st.slipping) stick++; else if (!was) { if (stick > 0.25 * st.N) ts.push(n / st.sr); stick = 0 } was = st.slipping; n++; return r }
  const L = new Float32Array(128), R = new Float32Array(128)
  let t = 0
  for (let i = 0; i < 0.33 * SR; i += 128) t = syn.process(src, t, 1 / SR, L, R, 128)
  const P = 1 / f0
  let run = 0
  for (let j = 1; j < ts.length; j++) {
    if (Math.abs(ts[j] - ts[j - 1] - P) < 0.12 * P) { if (++run >= 6) return (ts[j - 6] - 0.01) * 1000 } else run = 0
  }
  return Infinity
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const x = process.argv.find(y => y.startsWith(`--${k}=`)); return x ? x.split('=')[1] : d }
  const inst = arg('instrument', 'violin'), s = +arg('string', 2), beta = +arg('beta', 0.1), ramp = +arg('ramp', 0)
  const f0 = midiHz(INSTRUMENTS[inst].open[s] + 5)
  const As = [1, 2, 4, 8, 16, 32]                      // m/s²
  const Fs = Array.from({ length: 14 }, (_, i) => 0.02 * Math.pow(2, i * 0.75))
  console.log(`${inst} string ${s}, β ${beta}, f0 ${f0.toFixed(0)} Hz${ramp ? `, force ramp ${ramp * 1000} ms` : ''}: pre-Helmholtz ms (· = never)`)
  console.log('F \\ a  ' + As.map(a => String(a).padStart(5)).join(''))
  for (const F of Fs) console.log(F.toFixed(3).padStart(6) + ' ' + As.map(a => { const m = preHelmholtz(inst, s, f0, beta, a, F, { forceRamp: ramp }); return (isFinite(m) ? m.toFixed(0) : '·').padStart(5) }).join(''))
}
