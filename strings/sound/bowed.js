// Bowed-string synthesis for Experiment #034 (research/03_violin_sound.md §2.2).
//
// Plain JS, no dependencies: the same code runs in the AudioWorklet
// (violin-worklet.js) and in Node (tests, offline renders).
//
// Two string models share one body:
//
//  waveguide  a digital waveguide string per string (Smith; McIntyre,
//             Schumacher & Woodhouse 1983). The bow splits the string into a
//             bridge side and a nut/finger side; velocity waves travel both
//             ways and reflect (inverted, with losses) at the bridge and at
//             the finger. At the bow, a hyperbolic friction curve
//             μ(Δv) = μd + (μs − μd) / (1 + Δv/v0) is solved every sample
//             with Friedlander's hysteresis rule: the string sticks to the
//             bow until the friction force needed exceeds μs·F, then slips
//             until no slipping solution is left. With a bow force inside
//             Schelleng's window this settles into Helmholtz motion by
//             itself, with the scratchy attack, the bow-change transients
//             and the force/contact-point brightness of a real string. All
//             four strings run all the time and are coupled through the
//             bridge, so open strings ring in sympathy.
//
//  source     a source-filter model: the ideal Helmholtz bridge force is a
//             sawtooth (band-limited, PolyBLEP), with its corner rounded by
//             bow force, bow noise gated to the slip phase, a pre-Helmholtz
//             noise burst on attacks and bow changes, and a ring-down when
//             the bow leaves. Always in tune and stable; less "alive".
//
//  body       the bridge force goes through a modal body: the measured
//             signature modes of the instrument (A0 air mode, CBR, B1−, B1+,
//             …) plus dense higher modes shaped by the bridge hill (~2.5 kHz
//             for a violin), drawn from a seeded random generator — one set
//             per ear for a little stereo width.
//
// Control: per string, per frame (FRAME_RATE Hz) the channels of CH. Units:
// f0 Hz, bow velocity m/s (sign = direction), bow force N, beta = bow–bridge
// distance / string length, damp 0…1 (finger lifting / bow resting), tap =
// left-hand finger impact (0…1, a one-frame impulse).

import { TONE, LEVEL } from './tone.js'
import { ConvBody } from './body.js'
import { BODY_IOWA } from './body-iowa.js'
import { BODY_PHIL } from './body-philharmonia.js'

export const FRAME_RATE = 250
export const CH = { f0: 0, vel: 1, force: 2, beta: 3, damp: 4, tap: 5, harm: 6 }
export const NCH = 7

// Instruments: open strings (MIDI), string wave impedance Z (kg/s, from
// tension and linear density: G gut/synthetic … E steel), ring time of the
// open strings, and the body.
export const INSTRUMENTS = {
  violin: {
    open: [55, 62, 69, 76], Z: [0.55, 0.42, 0.3, 0.2], t60: [3.2, 2.8, 2.4, 2.2],
    body: {
      // [Hz, Q, gain]: signature modes after Bissinger 2008 / Woodhouse 2014
      modes: [[275, 18, 0.7], [405, 22, 0.35], [462, 28, 1], [480, 20, 0.45], [545, 30, 1.05], [650, 26, 0.5], [720, 28, 0.55], [830, 30, 0.6], [915, 28, 0.45], [1010, 30, 0.5]],
      dense: { from: 1050, to: 7500, count: 42, hill: 2500, hillWidth: 0.55, hillGain: 2.1, dip: 1500, rolloff: 4200 },
      air: 1, gain: 1,
    },
  },
  viola: {
    open: [48, 55, 62, 69], Z: [0.7, 0.52, 0.38, 0.27], t60: [3.4, 3, 2.6, 2.3],
    body: {
      modes: [[230, 16, 0.75], [345, 22, 0.4], [395, 26, 1], [415, 20, 0.45], [470, 28, 1], [560, 26, 0.5], [630, 28, 0.55], [720, 30, 0.55], [800, 28, 0.45], [890, 30, 0.45]],
      dense: { from: 920, to: 7000, count: 42, hill: 2000, hillWidth: 0.55, hillGain: 1.8, dip: 1300, rolloff: 3600 },
      air: 1, gain: 1.05,
    },
  },
  cello: {
    open: [36, 43, 50, 57], Z: [1.7, 1.25, 0.95, 0.7], t60: [4.5, 4, 3.4, 3],
    body: {
      modes: [[100, 14, 0.8], [145, 20, 0.45], [175, 24, 1], [195, 20, 0.5], [220, 26, 1], [275, 24, 0.55], [320, 26, 0.55], [380, 28, 0.55], [440, 28, 0.45], [510, 30, 0.45]],
      dense: { from: 540, to: 6000, count: 46, hill: 1500, hillWidth: 0.6, hillGain: 1.5, dip: 800, rolloff: 2500 },
      air: 1, gain: 1.1,
    },
  },
}

export const midiHz = m => 440 * Math.pow(2, (m - 69) / 12)

/** Peaking-EQ cascade (RBJ), used for the fitted tone correction (tone.js). */
export class EQ {
  constructor(sr, bands = []) {
    this.n = bands.length
    this.c = new Float32Array(5 * this.n)
    this.z = [new Float32Array(2 * this.n), new Float32Array(2 * this.n)]
    bands.forEach(([f, db, q], i) => {
      const A = Math.pow(10, db / 40), w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, al = Math.sin(w) / (2 * q), cw = Math.cos(w)
      const a0 = 1 + al / A
      this.c.set([(1 + al * A) / a0, -2 * cw / a0, (1 - al * A) / a0, -2 * cw / a0, (1 - al / A) / a0], 5 * i)
    })
  }
  reset() { this.z[0].fill(0); this.z[1].fill(0) }
  /** in place, ear k */
  process(x, n, k) {
    const c = this.c, z = this.z[k]
    for (let j = 0; j < this.n; j++) {
      const b0 = c[5 * j], b1 = c[5 * j + 1], b2 = c[5 * j + 2], a1 = c[5 * j + 3], a2 = c[5 * j + 4]
      let z1 = z[2 * j], z2 = z[2 * j + 1]
      for (let i = 0; i < n; i++) {
        const xi = x[i], y = b0 * xi + z1
        z1 = b1 * xi - a1 * y + z2; z2 = b2 * xi - a2 * y
        x[i] = y
      }
      z[2 * j] = z1; z[2 * j + 1] = z2
    }
  }
}
const pow2 = n => 1 << Math.ceil(Math.log2(n + 4))

// seeded RNG (mulberry32) so a body is the same every time
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Delay line with 4-point Hermite interpolation (smooth under modulation). */
class Delay {
  constructor(maxLen) { this.buf = new Float32Array(pow2(maxLen)); this.mask = this.buf.length - 1; this.w = 0 }
  write(x) { this.buf[this.w] = x; this.w = (this.w + 1) & this.mask }
  /** The value written d samples ago (d ≥ 2; the latest write is 1 ago). */
  read(d) {
    const i = d | 0, f = d - i, b = this.buf, m = this.mask, w = this.w
    const xm1 = b[(w - i + 1) & m], x0 = b[(w - i) & m], x1 = b[(w - i - 1) & m], x2 = b[(w - i - 2) & m]
    const c1 = 0.5 * (x1 - xm1), c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2, c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1)
    return ((c3 * f + c2) * f + c1) * f + x0
  }
  clear() { this.buf.fill(0) }
}

// phase delay (samples) of the one-pole low-pass y = (1−a)x + a·y1 at w rad/sample
const onePoleDelay = (a, w) => Math.atan2(a * Math.sin(w), 1 - a * Math.cos(w)) / w

// friction (rosin on gut / synthetic strings)
// (tuned with strings/test/bowed.test.js: Helmholtz motion over the range at p…f)
const MU_S = 1.2, MU_D = 0.3, V0 = 0.3

// interactive bow pressure: a kick of ±14 dB of force, decaying in 25 ms; tuned on
// the Helmholtz sweep (/strings/README.md: 343 → 359 of 369 notes at the default pressure)
const KF_MAX = Math.log(5)
const TOUCH = 1.2                // harmonics: the touching finger's resistance relative to the string (2Z)
const KICKS = 12                 // at most this many kicks per stroke
const KICK_AFTER = 0.1, KICK_COOL = 0.12, SPP_A = 0.2   // s of bowing before the first kick, s between kicks, EMA of slips/period

/** One waveguide string with a bow and a finger. */
export class WaveguideString {
  constructor(sr, { open = 55, Z = 0.3, t60 = 2.5, os = 1 } = {}) {
    this.sr = sr
    this.os = os
    this.openHz = midiHz(open)
    this.Z = Z
    this.t60 = t60
    const maxN = sr / (this.openHz * 0.7) + 8
    this.bridge = new Delay(maxN)
    this.nut = new Delay(maxN)
    // harmonics: the nut side split at a lightly touching finger (a lumped
    // damper, after SWAM's Harmonics 2 / 3 / 4). tA: bow → touch, tC: touch →
    // bow, tB: touch → finger or nut → touch. Modes with a node at the touch
    // pass it untouched; the others lose energy there on every pass, so the
    // string sounds its n-th partial
    this.tA = new Delay(maxN); this.tB = new Delay(maxN); this.tC = new Delay(maxN)
    this.harm = 0
    this.lpB = 0; this.lpN = 0
    this.slipping = false
    this.seed = (open * 7919) >>> 0
    this.out = 0           // wave arriving at the bridge (∝ bridge force)
    this.couple = 0        // bridge coupling input (set by the bank)
    // interactive bow pressure (after SWAM's "Interactive BowPress"): count slips
    // per period. Helmholtz motion slips once; two or more is double / multiple
    // slipping, none is a stuck (creaking) bow. These regimes are hysteretic: at
    // the same force the string can settle into either one depending on the
    // attack, and neither more nor less steady force reliably gets it out (see
    // strings/README.md). What does is a short force excursion, as a player
    // "leans in" for a moment: kF is a log-force pulse that decays in ~25 ms,
    // alternating up and down if one kick is not enough, with a cool-down
    this.bowPress = false
    this.kF = 0; this.slips = 0; this.acc = 0; this.spp = 1; this.bowAge = 0; this.cool = 0; this.kick = 1; this.kicks = 0; this.stick = 0
    this.rosin = 1         // × rosin grain (μs jitter)
  }
  reset() { this.bridge.clear(); this.nut.clear(); this.tA.clear(); this.tB.clear(); this.tC.clear(); this.harm = 0; this.lpB = this.lpN = 0; this.slipping = false; this.out = 0; this.kF = 0; this.spp = 1; this.bowAge = 0 }
  noise() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return (this.seed / 4294967296) * 2 - 1 }

  /** Per control step: geometry and losses for the next samples. */
  setup(f0, beta, damp, harm = 0) {
    const sr = this.sr
    // harmonics: f0 is the sounding pitch; the string itself is stopped n times lower
    const n = harm >= 1.5 ? Math.round(harm) : 0
    const fs0 = n ? (f0 || this.openHz) / n : f0
    if (n !== this.harm) {
      // the waves move to the other path (or start fresh in it)
      if (n) { this.tA.clear(); this.tB.clear(); this.tC.clear() } else this.nut.clear()
      this.harm = n; this.lpN = 0
    }
    f0 = Math.max(this.openHz * 0.98, Math.min(fs0 || this.openHz, sr / 12))
    const N = sr / f0, w = 2 * Math.PI * f0 / sr
    const stopped = f0 > this.openHz * 1.01
    // bridge low-pass: duller for low strings, brighter up the string
    // end losses (one-pole low-passes) that track the note: the bridge side
    // cuts off at 2.5·f0, the finger at 4·f0 (the nut at 12·f0). With fixed
    // cutoffs a low note's corners were barely rounded per period, which left
    // the low strings almost no playable window (cello C ×1.2 between F_min
    // and F_max, strings/test/schelleng.js) and raucous, unsettled attacks;
    // tracking widens it on every string (cello C ×2.2, G ×2.9, violin G
    // ×1.9 → ×3.9; attack.js: good attacks 65 → 300 of 432 with the attack
    // force in performance.js)
    const lp = fc => Math.exp(-2 * Math.PI * Math.min(fc, 0.4 * sr / this.os) / (sr / this.os))
    let aB = lp(2.5 * f0 * (stopped ? 1 : 1.25))
    let aN = lp((stopped ? 4 : 12) * f0)
    // loop gain from the ring time; damp shortens it to ~0.12 s
    const t60 = Math.exp(Math.log(this.t60 * (stopped ? 0.6 : 1)) * (1 - damp) + Math.log(0.12) * damp)
    const g = Math.pow(10, -3 / (t60 * f0))
    this.gB = g * 0.998; this.gN = 0.998
    // the loop filters keep their cutoff (in Hz) when the string runs oversampled
    this.aB = aB; this.aN = aN                 // already per string sample (oversampled rate)
    const filt = onePoleDelay(aB, w) + onePoleDelay(aN, w)
    const Lb = Math.max(2.2, Math.min(0.45, Math.max(0.02, beta)) * N)
    this.Lb = Lb
    this.Ln = Math.max(2.2, N - Lb - filt)
    this.N = N
    if (n) {
      // the touch is 1/n of the string from the finger: that segment's round
      // trip is one period of the sounding pitch (filter delay included there)
      const ws = w * n, Ps = N / n
      this.LB = Math.max(2.2, Ps - onePoleDelay(aN, ws))
      this.d1 = Math.max(2.2, (N - Lb - onePoleDelay(aB, ws) - Ps) / 2)
      const r = TOUCH                      // touch resistance / (2Z)
      this.rho = -r / (1 + r); this.tau = 1 / (1 + r)
      this.N = Ps                          // slips are counted per sounding period
    }
    this.kDecay = Math.exp(-1 / (0.025 * sr))
  }

  /** One sample. vb: bow velocity (m/s), F: bow force (N), tap: finger impulse. */
  tick(vb, F, tap) {
    // incoming waves at the bow, after reflection at each end
    const xb = this.bridge.read(this.Lb)
    this.lpB = (1 - this.aB) * xb + this.aB * this.lpB
    const vBr = -this.gB * this.lpB + this.couple
    let vNut
    if (this.harm) {
      const a = this.tA.read(this.d1)
      const xn = this.tB.read(this.LB)
      this.lpN = (1 - this.aN) * xn + this.aN * this.lpN
      const b = -this.gN * this.lpN
      vNut = this.tC.read(this.d1)
      this.tB.write(this.tau * a + this.rho * b)
      this.tC.write(this.tau * b + this.rho * a)
    } else {
      const xn = this.nut.read(this.Ln)
      this.lpN = (1 - this.aN) * xn + this.aN * this.lpN
      vNut = -this.gN * this.lpN
    }
    this.out = xb

    const vh = vBr + vNut
    let dv = 0
    const was = this.slipping
    if (this.bowPress) {
      if (F > 1e-3 && Math.abs(vb) > 0.01) this.bowAge++
      else { this.bowAge = 0; this.kicks = 0 }
      this.kF *= this.kDecay
      if (this.cool > 0) this.cool--
      F *= Math.exp(this.kF)
    }
    if (F > 1e-4) {
      // friction junction (velocity jump dv added to both outgoing waves)
      const c = F / (2 * this.Z)
      const mus = MU_S * (1 + 0.015 * Math.sqrt(this.os) * this.rosin * this.noise())   // rosin grain
      const u = vb - vh
      const au = Math.abs(u)
      if (!this.slipping && au <= c * mus) dv = u                  // stick
      else {
        const b = V0 - au + c * MU_D
        const disc = b * b + 4 * V0 * (au - c * mus)
        const D = disc >= 0 ? (-b + Math.sqrt(disc)) / 2 : -1
        if (D < 0) { dv = u; this.slipping = false }                  // no slip solution left: stick
        else { dv = u - Math.sign(u) * D; this.slipping = true }
      }
    } else this.slipping = true
    if (this.bowPress) {
      // a slip counts when the stick before it lasted ≥ 0.3 period (micro-slips
      // inside one slip phase do not: measured on the sweep, this separates
      // Helmholtz motion from double slipping on 338 of 343 good notes)
      if (!this.slipping) this.stick++
      else if (!was) { if (this.stick > 0.3 * this.N) this.slips++; this.stick = 0 }
      if (++this.acc >= this.N) {
        this.acc -= this.N
        this.spp = (1 - SPP_A) * this.spp + SPP_A * this.slips
        this.slips = 0
        // past the attack (pre-Helmholtz slipping is normal there): kick
        if (this.bowAge > KICK_AFTER * this.sr && this.cool <= 0 && (this.spp > 1.3 || this.spp < 0.7) && this.kicks < KICKS) {
          // up first, then alternate (starting by direction measured worse on the sweep)
          if (this.kicks === 0) this.kick = 1
          this.kF = this.kick * KF_MAX
          this.kick = -this.kick; this.kicks++
          this.cool = Math.round(KICK_COOL * this.sr)
          this.spp = 1
        }
      }
    }
    if (tap) dv += tap
    if (this.harm) this.tA.write(vBr + dv); else this.nut.write(vBr + dv)
    this.bridge.write(vNut + dv)
    return xb
  }
}

const JIT_R = 0.5, JIT_Q = Math.sqrt(1 - JIT_R * JIT_R)   // per-period jitter: correlation between periods

/** Helmholtz source-filter string (sawtooth + bow noise + ring-down). */
export class SourceString {
  constructor(sr, { open = 55, Z = 0.3, t60 = 2.5 } = {}) {
    this.sr = sr; this.openHz = midiHz(open); this.Z = Z; this.t60 = t60
    this.ph = Math.random(); this.env = 0; this.atk = 0; this.lastV = 0
    this.lp1 = 0; this.lp2 = 0; this.nz1 = 0; this.nz2 = 0
    this.seed = (open * 104729) >>> 0
    this.jit = 0
    this.rosin = 1        // × bow noise
    this.out = 0
    this.pj = 0; this.aj = 0; this.cj = 0   // per-period jitter: period, amplitude, corner sharpness
  }
  reset() { this.env = this.atk = this.lp1 = this.lp2 = this.nz1 = this.nz2 = 0; this.out = 0 }
  noise() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return (this.seed / 4294967296) * 2 - 1 }
  setup(f0, beta, damp, harm = 0) {
    this.harm = harm >= 1.5 ? Math.round(harm) : 0
    this.f0 = Math.max(20, f0 || this.openHz)
    const stopped = this.f0 > this.openHz * 1.01
    const t60 = Math.exp(Math.log(this.t60 * (stopped ? 0.6 : 1)) * (1 - damp) + Math.log(0.12) * damp)
    this.rel = Math.exp(-6.9 / (t60 * this.sr))
    this.beta = Math.max(0.02, Math.min(0.45, beta))
  }
  tick(vb, F, tap) {
    const sr = this.sr, av = Math.abs(vb)
    // Helmholtz amplitude ∝ v/β; corners sharpen with force (relative to the Schelleng maximum)
    const target = F > 1e-4 ? av / this.beta : 0
    const fmax = 2 * this.Z * Math.max(av, 1e-3) / ((MU_S - MU_D) * this.beta)
    const fr = Math.min(1.5, F / fmax)
    // attack / bow change: the bow is slow or turning → pre-Helmholtz noise
    if ((Math.sign(vb) !== Math.sign(this.lastV) && av > 0.01) || (av > 0.03 && Math.abs(this.lastV) < 0.015)) this.atk = 1
    this.lastV = vb
    this.atk *= 0.9993
    if (target > this.env) this.env += (target - this.env) * 0.004
    else this.env = target + (this.env - target) * (F > 1e-4 ? 0.996 : this.rel)
    this.jit += (this.noise() * 0.0007 - this.jit) * 0.002
    const f = this.f0 * (1 + this.jit + this.pj + this.atk * 0.004 * this.noise())
    const dt = f / sr
    this.ph += dt
    if (this.ph >= 1) {
      this.ph -= 1
      // a new period: the stick-slip never repeats exactly (rosin, bow hair, the
      // string's own irregularity). Correlated per-period draws, so the jitter has
      // a short memory as on a real string
      // a short memory as on a real string. Tuned so the gap between harmonics
      // (peak/gap, 1–3 and 3–8 kHz) matches the Iowa recordings within 0.5 dB:
      // 0.2 % period, 3 % amplitude, 10 % corner sharpness (rms per period)
      const g = () => (this.noise() + this.noise() + this.noise()) * 0.577
      this.pj = JIT_R * this.pj + JIT_Q * 0.002 * g() * this.rosin
      this.aj = JIT_R * this.aj + JIT_Q * 0.03 * g() * this.rosin
      this.cj = JIT_R * this.cj + JIT_Q * 0.1 * g() * this.rosin
    }
    // band-limited sawtooth
    let saw = 2 * this.ph - 1, t = this.ph
    if (t < dt) { t /= dt; saw -= t + t - t * t - 1 } else if (t > 1 - dt) { t = (t - 1) / dt; saw -= t * t + t + t + 1 }
    // corner rounding: two one-pole low-passes, cutoff up with force and down with beta
    // harmonics: the touch takes most of the upper partials away (a flute-like tone)
    const fc = Math.min(sr * 0.45, (f * (4 + 26 * fr) * (0.1 / Math.max(0.05, this.beta)) ** 0.5 + 800 * fr) * (this.harm ? 0.3 : 1) * Math.exp(this.cj))
    const a = Math.exp(-2 * Math.PI * fc / sr)
    this.lp1 = (1 - a) * saw + a * this.lp1
    this.lp2 = (1 - a) * this.lp1 + a * this.lp2
    // bow noise: band-passed, gated to the slip phase (ph < β), louder on attacks and at low force
    // (0.2 at rest level: it was 0.05, four times too clean between the harmonics)
    const n = this.noise()
    this.nz1 += (n - this.nz1) * 0.35
    this.nz2 += (this.nz1 - this.nz2) * 0.05
    const hp = this.nz1 - this.nz2
    const gate = this.ph < this.beta * 1.4 ? 1 : 0.25
    const nAmp = av * this.rosin * (this.harm ? 0.6 : 1) * (0.2 + 0.6 * this.atk + 0.15 * Math.max(0, 0.4 - fr)) * gate
    const y = this.env * (this.lp2 * 0.065) * (1 + this.aj) + nAmp * hp * 0.5 + (tap ? tap * 0.3 * n : 0)
    this.out = y
    return y
  }
}

/**
 * Decimate by os: a windowed-sinc low-pass (cutoff 0.45 of the output rate,
 * Blackman, 16·os taps) computed only for the samples that are kept.
 */
function decimator(os) {
  const T = 16 * os + 1, h = new Float32Array(T), fc = 0.45 / os
  let sum = 0
  for (let i = 0; i < T; i++) {
    const x = i - (T - 1) / 2
    const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (T - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (T - 1))
    h[i] = w * (x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x)); sum += h[i]
  }
  for (let i = 0; i < T; i++) h[i] /= sum
  const buf = new Float32Array(2 * T)
  let w = 0, last = 0
  return {
    push(x, out) {
      buf[w] = buf[w + T] = x; w = w + 1 === T ? 0 : w + 1
      if (!out) return last
      let y = 0
      for (let i = 0; i < T; i++) y += h[i] * buf[w + i]
      return (last = y)
    },
  }
}

/** Modal body: signature modes + dense bridge-hill modes, two ears. */
export class Body {
  constructor(sr, spec, seed = 1) {
    this.sr = sr
    this.ears = [this.build(spec, seed), this.build(spec, seed + 101)]
    this.gain = spec.gain ?? 1
  }
  build(spec, seed) {
    const sr = this.sr, R = rng(seed), modes = []
    for (const [f, q, g] of spec.modes) modes.push([f * (1 + (R() - 0.5) * 0.01), q, g * (R() < 0.5 ? -1 : 1)])
    const d = spec.dense
    for (let k = 0; k < d.count; k++) {
      const x = (k + R()) / d.count
      const f = d.from * Math.pow(d.to / d.from, x)
      const oct = Math.log2(f / d.hill)
      let env = 0.35 + d.hillGain * Math.exp(-0.5 * (oct / d.hillWidth) ** 2)
      env *= 1 - 0.55 * Math.exp(-0.5 * (Math.log2(f / d.dip) / 0.2) ** 2)
      if (f > d.rolloff) env *= Math.pow(d.rolloff / f, 1.6)
      const gain = env * Math.exp((R() - 0.5) * 1.1) * (R() < 0.5 ? -1 : 1)
      modes.push([f, 22 + R() * 25, gain])
    }
    // RBJ band-pass resonators (0 dB peak), as flat arrays for speed
    const n = modes.length
    const b0 = new Float32Array(n), a1 = new Float32Array(n), a2 = new Float32Array(n), g = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const [f, q, gg] = modes[i]
      const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al
      b0[i] = al / a0; a1[i] = -2 * Math.cos(w) / a0; a2[i] = (1 - al) / a0; g[i] = gg
    }
    return { n, b0, a1, a2, g, x1: 0, x2: 0, y1: new Float32Array(n), y2: new Float32Array(n), modes }
  }
  reset() { for (const e of this.ears) { e.y1.fill(0); e.y2.fill(0); e.x1 = e.x2 = 0 } }
  /** x: bridge force samples → outL / outR. */
  process(x, outL, outR, n) {
    const G = this.gain
    for (let k = 0; k < 2; k++) {
      const e = this.ears[k], out = k ? outR : outL
      const { b0, a1, a2, g, y1, y2 } = e, m = e.n
      let x1 = e.x1, x2 = e.x2
      for (let i = 0; i < n; i++) {
        const xi = x[i], xd = xi - x2
        let s = 0
        for (let j = 0; j < m; j++) {
          const y = b0[j] * xd - a1[j] * y1[j] - a2[j] * y2[j]
          y2[j] = y1[j]; y1[j] = y
          s += g[j] * y
        }
        // a little of the direct bridge force keeps the top end alive
        out[i] = G * (s * 0.5 + 0.08 * (xi - x1))
        x2 = x1; x1 = xi
      }
      e.x1 = x1; e.x2 = x2
    }
  }
}

/**
 * Four strings + body. Controls come from a source with
 * at(t, out) → fills out[string * NCH + channel] for time t (s).
 */
export class ViolinSynth {
  constructor(sr, { instrument = 'violin', model = 'waveguide', tone = null, bowPress = true, rosin = 1, resonance = 1, body = 'iowa', oversample = 3 } = {}) {
    this.sr = sr
    this.opts = { bowPress, rosin, resonance, body }
    this.oversample = oversample
    this.toneBands = tone
    this.block = 16                       // control interpolation step (samples)
    this.cur = new Float32Array(4 * NCH)
    this.nxt = new Float32Array(4 * NCH)
    this.bridgeBuf = new Float32Array(128)
    this.level = 1
    this.setInstrument(instrument, model)
  }
  setInstrument(instrument, model = this.model) {
    const I = INSTRUMENTS[instrument] || INSTRUMENTS.violin
    this.instrument = instrument; this.model = model; this.spec = I
    const S = model === 'source' ? SourceString : WaveguideString
    // the stick-slip junction makes partials far above Nyquist that fold back
    // (heard as a scratchy, inharmonic hiss moving against the vibrato), so the
    // waveguide strings run oversampled (×3 by default) and are decimated
    // before the body: 13 dB less of that hiss on a glide, at about half the speed
    this.os = model === 'source' ? 1 : Math.max(1, Math.round(this.oversample))
    this.strings = I.open.map((open, s) => new S(this.sr * this.os, { open, Z: I.Z[s], t60: I.t60[s], os: this.os }))
    this.dec = this.os > 1 ? decimator(this.os) : null
    this.setParams(this.opts)
    // sympathetic open strings for the source model
    this.symp = model === 'source' ? I.open.map((open, s) => new WaveguideString(this.sr, { open, Z: I.Z[s], t60: I.t60[s] * 1.3 })) : null
    if (this.symp) for (const st of this.symp) st.setup(st.openHz, 0.1, 0)
    this.makeBody()
    this.sgain = new Float32Array(4).fill(1)
    // output scale per model (so engines A/B at similar loudness)
    this.scale = model === 'source' ? 1.35 : 0.16
    this.cur.fill(0); this.nxt.fill(0)
    for (let s = 0; s < 4; s++) { this.cur[s * NCH] = this.nxt[s * NCH] = midiHz(I.open[s]); this.cur[s * NCH + 3] = this.nxt[s * NCH + 3] = 0.1 }
  }
  /** bowPress (interactive bow pressure, waveguide), rosin (× grain / bow noise), resonance (× sympathetic coupling). */
  setParams(p) {
    const key = b => (typeof b === 'object' && b ? b.id ?? b : b)
    const was = key(this.opts.body)
    Object.assign(this.opts, p)
    for (const st of this.strings) { st.bowPress = !!this.opts.bowPress; st.rosin = this.opts.rosin }
    if (this.body && p.body != null && key(p.body) !== was) this.makeBody()
  }
  /**
   * body: 'iowa' — the response estimated from the Iowa recordings (body.js,
   * body-iowa.js; it replaces the modal body, the tone EQ and the voicing,
   * and so does 'phil', from the Philharmonia samples, body-philharmonia.js;
   * since the fit covers all three); 'modal' — 10 signature + 42 random modes,
   * the fitted EQ and voicing (tone.js); a spec object (fit_body.js); or a
   * measured impulse-response object ({ id, instrument, rate, ir: [L, R],
   * gainDb: { waveguide, source } }, build_nbody.js), applied as it is.
   */
  makeBody() {
    const { instrument, model } = this, I = this.spec, b = this.opts.body
    // 'phil': estimated from the Philharmonia samples (fit_body_philharmonia.js);
    // a model not fitted yet plays the Iowa body
    let spec = typeof b === 'object' && b ? b : b === 'iowa' ? BODY_IOWA[instrument]?.[model]
      : b === 'phil' ? BODY_PHIL[instrument]?.[model] ?? BODY_IOWA[instrument]?.[model] : null
    // a measured impulse response (NBody, build_nbody.js) is per instrument; its
    // gain per string model. Another instrument falls back to the Iowa body.
    if (spec?.ir) {
      spec = spec.instrument === instrument ? { ...spec, gainDb: spec.gainDb?.[model] ?? 0 } : BODY_IOWA[instrument]?.[model]
    }
    this.bodyKind = spec?.ir ? 'nbody' : spec?.id?.startsWith('phil-') ? 'phil' : spec ? 'iowa' : 'modal'
    if (spec) {
      this.body = new ConvBody(this.sr, spec)
      this.eq = new EQ(this.sr, [])
      this.voicing = null
    } else {
      this.body = new Body(this.sr, I.body, instrument.length * 31 + 7)
      this.eq = new EQ(this.sr, this.toneBands ?? TONE[instrument]?.[model] ?? TONE.violin[model] ?? [])
      // voicing: per-pitch gain that evens out the body's peaks and dips (tone.js)
      this.voicing = this.toneBands ? null : LEVEL[instrument]?.[model] ?? null
    }
    this.sgain?.fill(1)
  }
  reset() { for (const s of this.strings) s.reset(); if (this.symp) for (const s of this.symp) s.reset(); this.body.reset(); this.eq.reset() }

  /**
   * Render n samples (n ≤ 128) from a control source starting at time t,
   * advancing dt per sample. Returns the new time.
   */
  process(src, t, dt, outL, outR, n) {
    const B = this.block, cur = this.cur, nxt = this.nxt, strs = this.strings
    if (this.bridgeBuf.length < n) this.bridgeBuf = new Float32Array(n)
    const br = this.bridgeBuf
    for (let i0 = 0; i0 < n; i0 += B) {
      const m = Math.min(B, n - i0)
      cur.set(nxt)
      src.at(t + dt * m, nxt)
      for (let s = 0; s < 4; s++) {
        const o = s * NCH
        // geometry from the average over the step (pitch glides stay smooth at 3 kHz)
        const f = 0.5 * (cur[o] + nxt[o])
        strs[s].setup(f, 0.5 * (cur[o + 3] + nxt[o + 3]), 0.5 * (cur[o + 4] + nxt[o + 4]), nxt[o + 6])
        const V = this.voicing
        if (V) {
          const p = Math.max(0, Math.min(V.dB.length - 1.001, 69 + 12 * Math.log2(f / 440) - V.from)), j = p | 0
          const g = Math.pow(10, (V.dB[j] + (V.dB[j + 1] - V.dB[j]) * (p - j)) / 20)
          this.sgain[s] += (g - this.sgain[s]) * 0.3
        }
      }
      const sg = this.sgain
      const os = this.os, dec = this.dec, invOs = 1 / (m * os)
      for (let i = 0; i < m; i++) {
        let sum = 0
        // os string samples per output sample (os = 1: no oversampling)
        for (let q = 0; q < os; q++) {
          const k = (i * os + q + 1) * invOs
          sum = 0
          for (let s = 0; s < 4; s++) {
            const o = s * NCH
            const vb = cur[o + 1] + (nxt[o + 1] - cur[o + 1]) * k
            const F = cur[o + 2] + (nxt[o + 2] - cur[o + 2]) * k
            const tap = i === 0 && q === 0 ? nxt[o + 5] : 0
            sum += strs[s].tick(vb, F, tap) * this.spec.Z[s] * sg[s]
          }
          if (this.model === 'waveguide') {
            // bridge coupling: every string feels the others' bridge force a little
            const kc = 0.0025 * this.opts.resonance
            for (let s = 0; s < 4; s++) strs[s].couple = kc * (sum / this.spec.Z[s] - strs[s].out * sg[s])
          }
          if (dec) sum = dec.push(sum, q === os - 1)
        }
        if (this.symp) {
          let sy = 0
          for (let s = 0; s < 4; s++) { const st = this.symp[s]; st.couple = 0.004 * sum; sy += st.tick(0, 0, 0) }
          sum += sy * 0.35 * this.opts.resonance
        }
        br[i0 + i] = sum * this.scale
      }
      t += dt * m
    }
    this.body.process(br, outL, outR, n)
    this.eq.process(outL, n, 0); this.eq.process(outR, n, 1)
    if (this.level !== 1) for (let i = 0; i < n; i++) { outL[i] *= this.level; outR[i] *= this.level }
    return t
  }
}

/** Control source over precomputed curves ({ frameRate, frames, data: Float32Array(frames·4·NCH) }). */
export class CurveSource {
  constructor(curves) { this.set(curves) }
  set(c) { this.c = c; this.lastTapFrame = -1 }
  at(t, out) {
    const c = this.c
    if (!c || !c.frames) { for (let s = 0; s < 4; s++) { out[s * NCH + 1] = 0; out[s * NCH + 2] = 0; out[s * NCH + 5] = 0 } return }
    const p = Math.max(0, Math.min(c.frames - 1.001, t * c.frameRate)), i = p | 0, f = p - i
    const d = c.data, W = 4 * NCH, a = i * W, b = a + W
    for (let j = 0; j < W; j++) out[j] = d[a + j] + (d[b + j] - d[a + j]) * f
    // the harmonic number steps, it is not interpolated
    for (let s = 0; s < 4; s++) out[s * NCH + 6] = d[(f < 0.5 ? a : b) + s * NCH + 6]
    // taps fire once, when their frame is reached
    for (let s = 0; s < 4; s++) out[s * NCH + 5] = 0
    if (i !== this.lastTapFrame) {
      for (let fr = Math.max(this.lastTapFrame + 1, i - 2); fr <= i; fr++) for (let s = 0; s < 4; s++) out[s * NCH + 5] += d[fr * W + s * NCH + 5]
      this.lastTapFrame = i
    }
    if (t * c.frameRate >= c.frames - 1) for (let s = 0; s < 4; s++) { out[s * NCH + 1] = 0; out[s * NCH + 2] = 0 }
  }
  seek() { this.lastTapFrame = -1 }
}

/** Render curves offline (Node tests, export). Returns [L, R]. */
export function renderCurves(curves, { sampleRate = 48000, instrument = 'violin', model = 'waveguide', tail = 1.5, tone = null, params = {} } = {}) {
  const syn = new ViolinSynth(sampleRate, { instrument, model, tone, ...params })
  const src = new CurveSource(curves)
  const N = Math.ceil((curves.frames / curves.frameRate + tail) * sampleRate)
  const L = new Float32Array(N), R = new Float32Array(N)
  let t = 0
  for (let i = 0; i < N; i += 128) {
    const n = Math.min(128, N - i)
    t = syn.process(src, t, 1 / sampleRate, L.subarray(i, i + n), R.subarray(i, i + n), n)
  }
  return [L, R]
}
