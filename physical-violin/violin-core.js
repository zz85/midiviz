// Physical bowed-violin model. The plain ES module runs both inside an
// AudioWorklet and under Node for offline verification.

const HERMITE = 3;

// Fractional delay line: read at (write - delay), cubic Hermite or linear
// interpolation, then write and advance.
export class FracDelay {
  constructor(size) {
    this.buf = new Float32Array(size);
    this.w = 0;
    this.delay = 2;
    this.mode = HERMITE;
  }

  tick(x) {
    const buf = this.buf;
    const n = buf.length;
    let rp = this.w - this.delay;
    if (rp < 0) rp += n;
    const i = Math.floor(rp);
    const f = rp - i;
    let y;
    if (this.mode === HERMITE) {
      const xm1 = buf[(i - 1 + n) % n];
      const x0 = buf[i];
      const x1 = buf[(i + 1) % n];
      const x2 = buf[(i + 2) % n];
      const c1 = 0.5 * (x1 - xm1);
      const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
      const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
      y = ((c3 * f + c2) * f + c1) * f + x0;
    } else {
      y = x0Linear(buf, i, f, n);
    }
    buf[this.w] = x;
    this.w = this.w + 1 >= n ? 0 : this.w + 1;
    return y;
  }

  clear() {
    this.buf.fill(0);
  }
}

function x0Linear(buf, i, f, n) {
  const a = buf[i];
  return a + (buf[(i + 1) % n] - a) * f;
}

// One-pole low-pass: y = x - (x - y1) * a.
export class OnePole {
  constructor(a = 0.5) {
    this.a = a;
    this.y = 0;
  }

  tick(x) {
    this.y = x - (x - this.y) * this.a;
    return this.y;
  }
}

// Linear ramp toward a target at a fixed rate, the smoother used for most
// model values (target ± rate·step, clamped).
export class Ramp {
  constructor(value = 0, ratePerSample = 0.001) {
    this.value = value;
    this.target = value;
    this.rate = ratePerSample;
  }

  tick() {
    const d = this.target - this.value;
    if (Math.abs(d) <= this.rate) this.value = this.target;
    else this.value += Math.sign(d) * this.rate;
    return this.value;
  }
}

// RBJ "Audio EQ Cookbook" biquad, direct form I.
export class Biquad {
  constructor() {
    this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }

  design(type, f0, q, fs, gainDb = 0) {
    const w = (2 * Math.PI * Math.min(f0, fs * 0.49)) / fs;
    const cs = Math.cos(w);
    const sn = Math.sin(w);
    const alpha = sn / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lowpass':
        b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2;
        a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2;
        a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'highshelf': {
        const sq = 2 * Math.sqrt(A) * (sn / 2) * Math.SQRT2;
        b0 = A * ((A + 1) + (A - 1) * cs + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sq);
        a0 = (A + 1) - (A - 1) * cs + sq; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sq;
        break;
      }
      case 'peaking':
        b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A;
        break;
      default:
        throw new Error(`unknown biquad type ${type}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }

  tick(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

const rand = () => Math.random() * 2 - 1;

// Phase delay (samples) at ω of the termination shelf H = ½·(1 + LP), LP = (1-a)/(1 - a z⁻¹)
export function shelfDelay(a, w) {
  const re1 = 1 - a * Math.cos(w), im1 = a * Math.sin(w), den = re1 * re1 + im1 * im1;
  const lr = ((1 - a) * re1) / den, li = (-(1 - a) * im1) / den;
  return -Math.atan2(0.5 * li, 0.5 * (1 + lr)) / w;
}

// Pole of y = x - (x - y1)·a tuned at 48 kHz, mapped to rate fs so the response in Hz is unchanged.
const pole = (a, fs) => Math.pow(a, 48000 / fs);

// Bow–string junction. The string sticks while the required velocity change is
// below Coulomb's static-friction limit. Once it slips, a Friedlander/Stribeck
// curve falls from static to dynamic friction as relative velocity increases.
// These values are dimensionless coefficients; STRING_IMPEDANCE converts bow
// force to the velocity-wave units used by the digital waveguide.
const STRING_IMPEDANCE = 0.3;
const STATIC_FRICTION = 1.2;
const DYNAMIC_FRICTION = 0.3;
const STRIBECK_VELOCITY = 0.3;

export class Bow {
  constructor(fs) {
    this.fs = fs;
    this.stick = true;
    this.cycleGain = 1;        // re-randomised on every stick/slip transition
    this.noiseLp = new OnePole(Math.exp((-2 * Math.PI * 4) / fs));   // slow bow-speed wobble
    this.outRamp = new OnePole(pole(0.2, fs));
    this.slips = 0;            // diagnostics
    this.sinceSlip = 0;        // samples since last slip
    this.periodSamples = 100;  // expected period
    this.boost = 1;            // Helmholtz supervision for early slips
    this.supervise = true;
    this.cycleJitter = 0.005;  // per-transition random gain
    this.frictionNoise = 0.2;  // broadband noise proportional to friction force
    // Share of the string's velocity the bow contact sees. Below 1, the hair's
    // compliance and the bow's width soften the contact; this damps the secondary
    // slips that otherwise trap an attack in multiple slipping for many periods.
    this.coupling = 0.9;
    // parameters (set via setParams)
    this.stickiness = 0;
    this.noiseAmp = 0.144;
    this.noiseRand = 0.5;
    this.forceScale = 0.14;
    this.normalForce = 0;
    this.staticFriction = STATIC_FRICTION;
  }

  // Update the slowly changing physical controls. `force` is the normalized
  // bow force produced by the performance controls; forceScale converts that
  // unitless gesture into the normal force used by the junction.
  update(vBow, force, f0) {
    this.normalForce = Math.max(0, force) * this.forceScale;
    this.staticFriction = STATIC_FRICTION * (1 + 0.35 * this.stickiness);
    this.periodSamples = this.fs / f0;
  }

  // vString = rA + rC (sum of incoming waves at the bow); returns the excitation
  tick(vBow, vString) {
    const noise = this.noiseLp.tick(rand() * this.noiseAmp * this.noiseRand);
    const relativeVelocity = vBow * (1 + noise) - this.coupling * vString;
    const speed = Math.abs(relativeVelocity);
    const forceAsVelocity = this.normalForce * this.boost / (2 * STRING_IMPEDANCE);
    const staticLimit = forceAsVelocity * this.staticFriction * this.cycleGain;
    const wasSticking = this.stick;
    this.sinceSlip++;

    let excitation;
    if (this.stick && speed <= staticLimit) {
      excitation = relativeVelocity;
    } else {
      // Solve D = |u - dv| against
      // μ(D) = μd + (μs - μd)·v0/(v0 + D).
      const b = STRIBECK_VELOCITY - speed + forceAsVelocity * DYNAMIC_FRICTION;
      const discriminant = b * b
        + 4 * STRIBECK_VELOCITY * (speed - staticLimit);
      const slipSpeed = discriminant >= 0
        ? (-b + Math.sqrt(discriminant)) / 2
        : -1;
      if (slipSpeed < 0) {
        excitation = relativeVelocity;
        this.stick = true;
      } else {
        excitation = relativeVelocity - Math.sign(relativeVelocity) * slipSpeed;
        this.stick = false;
      }
    }

    if (wasSticking !== this.stick) {
      this.cycleGain = 1 + rand() * this.cycleJitter;
    }
    if (wasSticking && !this.stick) {
      this.slips++;
      // A second slip before the expected Helmholtz period means the bow broke
      // free too early. Briefly raising normal force helps the next cycle hold.
      if (!this.supervise) this.boost = 1;
      else if (this.sinceSlip < 0.79 * this.periodSamples) {
        this.boost = Math.min(this.boost * 1.1 + 0.05, 2.5);
      } else {
        this.boost = 1 + (this.boost - 1) * 0.8;
      }
      this.sinceSlip = 0;
    }

    // Add broadband bow noise scaled by the friction force.
    const frictionMagnitude = Math.abs(excitation);
    const noiseEnvelope = this.noiseRand * frictionMagnitude * (this.stick ? 0.3 : 1);
    const frictionNoise = rand() * this.frictionNoise * noiseEnvelope;
    this.lastNoiseEnv = noiseEnvelope;   // for the direct (radiated) path
    return this.outRamp.tick(excitation * 0.99) + frictionNoise;
  }
}

// One bowed waveguide string: two round-trip segments split at the bow point.
export class BowedString {
  constructor(fs, openMidi) {
    this.fs = fs;
    this.openMidi = openMidi;
    const max = Math.ceil(fs / 25);  // room for the double bass's low E (41 Hz) with vibrato and jitter
    this.dlA = new FracDelay(max);   // bow-to-bridge segment
    this.dlC = new FracDelay(max);   // bow-to-finger segment
    this.lpA = new OnePole(0);       // termination loss filters
    this.lpC = new OnePole(0);
    this.setLoss(8020, 6100);
    this.lpExc = new OnePole(pole(0.6, fs));
    this.lpY = new OnePole(pole(0.9, fs));
    this.rA = 0;
    this.rC = 0;
    this.R = 0.4997;                 // finger-end reflection
    this.period = 1 / 196;
    this.bowPos = 0.1;
    this.jitter = new OnePole(pole(0.999, fs));
    this.jitterAmp = 0;
    this.compExtra = 0.92;           // remaining loop-delay compensation, in samples
  }

  // Termination low-pass cutoffs in Hz (bridge side A, finger side C).
  setLoss(fcA, fcC) {
    this.lpA.a = Math.exp((-2 * Math.PI * Math.min(fcA, 0.45 * this.fs)) / this.fs);
    this.lpC.a = Math.exp((-2 * Math.PI * Math.min(fcC, 0.45 * this.fs)) / this.fs);
  }

  setLengths(periodSec, bowPos) {
    this.period = periodSec;
    this.bowPos = bowPos;
  }

  // Per-sample length update, including random bow-position jitter.
  updateLengths() {
    const fs = this.fs;
    const j = this.jitter.tick(rand() * this.jitterAmp) * (this.period + 0.003);
    const lA = this.bowPos * this.period * fs;
    // Compensate the loss filters' phase delay so tuning holds for any cutoff.
    const w0 = (2 * Math.PI) / (this.period * fs);
    const comp = shelfDelay(this.lpA.a, w0) + shelfDelay(this.lpC.a, w0) + this.compExtra;
    const lC = (1 - this.bowPos) * this.period * fs - comp + j * fs;
    this.dlA.delay = Math.max(2, Math.min(lA, this.dlA.buf.length - 3));
    this.dlC.delay = Math.max(2, Math.min(lC, this.dlC.buf.length - 3));
  }

  vAtBow() {
    return this.rA + this.rC;
  }

  // returns bridge output
  tick(exc) {
    this.updateLengths();
    const inA = this.rC + exc;                                   // toward bridge
    const yA = this.dlA.tick(inA);
    this.rA = -0.4997 * (yA + this.lpA.tick(yA));                // bridge reflection with loss
    const inC = this.rA + exc;                                   // toward finger
    const yC = this.dlC.tick(inC);
    this.rC = -this.R * (yC + this.lpC.tick(yC));                // finger reflection
    return -(inA + 0.66 * (this.lpExc.tick(exc) + 0.1 * yA - this.lpY.tick(yA)));
  }

  clear() {
    this.dlA.clear(); this.dlC.clear();
    this.rA = 0; this.rC = 0;
  }
}

// Sympathetic open-string resonator: a tuned, filtered feedback delay.
class Resonator {
  constructor(fs, midi) {
    this.d = new FracDelay(Math.ceil(fs / 25));
    this.d.delay = fs / midiToHz(midi);
    this.lp = new OnePole(pole(0.3, fs));
    this.y = 0;
  }

  tick(x) {
    this.y = this.d.tick(x + 0.985 * this.lp.tick(this.y));
    return this.y;
  }
}

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Smooth random wander with unit RMS: white noise through two one-poles at `hz`.
// Models the slow, continuous drift of a player's bow speed, pressure and contact point.
export class SlowNoise {
  constructor(fs, hz) {
    const a = Math.exp((-2 * Math.PI * hz) / fs);
    this.a = a; this.y1 = 0; this.y2 = 0;
    // calibrate output RMS numerically once
    let e = 0; const n = Math.floor(fs * 20 / hz) + 50000;
    for (let i = 0; i < n; i++) { this.step(); if (i > n / 4) e += this.y2 * this.y2; }
    this.scale = 1 / Math.sqrt(e / (n - Math.floor(n / 4)));
    this.y1 = 0; this.y2 = 0;
  }
  step() { const x = Math.random() * 2 - 1; this.y1 = x + (this.y1 - x) * this.a; this.y2 = this.y1 + (this.y2 - this.y1) * this.a; return this.y2; }
  tick() { return this.step() * this.scale; }
}

// Violin open strings G3, D4, A4 and E5.
export const OPEN_STRINGS = [55, 62, 69, 76];

// The bowed-string family: one model, per-instrument settings. openStrings are
// MIDI notes (fifths, or fourths for the double bass), range is the playable
// MIDI range, hpHz the output DC/rumble high-pass (below the lowest open
// string). `defaults` override the violin's parameters. Texture, noise and loss were
// fitted to each instrument's University of Iowa recordings; forceScale is set so
// the heavier strings stay in Helmholtz motion (Schelleng's minimum bow force rises
// with string impedance, so the cello and bass need more than the violin's 0.22).
export const INSTRUMENTS = {
  violin: { name: 'Violin', openStrings: OPEN_STRINGS, range: [55, 101], hpHz: 60 },
  // The Iowa viola is steadier than the violin: about half the bow wander.
  viola: { name: 'Viola', openStrings: [48, 55, 62, 69], range: [48, 96], hpHz: 60,
    defaults: { bowWander: 0.07, pressureWander: 0.055 } },
  // Cello: string loss tracks pitch less steeply (the Iowa fit preferred 0.4; 0.7
  // keeps the low strings stable), steady low register, livelier from about F3 up,
  // and less per-cycle jitter (the low register was too rough).
  cello: { name: 'Cello', openStrings: [36, 43, 50, 57], range: [36, 89], hpHz: 30,
    defaults: { vibratoRate: 5.6, forceScale: 0.5, lossSlope: 0.7, bowWander: 0.07, pressureWander: 0.055,
      wanderRefHz: 175, wanderSlope: 1.2, cycleJitter: 0.002, frictionNoise: 0.2 } },
  // Double bass, tuned in fourths: the steadiest wander of the family and a
  // little less friction noise, matching the real noise-to-harmonic ratio.
  bass: { name: 'Double Bass', openStrings: [28, 33, 38, 43], range: [28, 80], hpHz: 20,
    defaults: { vibratoRate: 5.6, forceScale: 0.38, bowWander: 0.05, pressureWander: 0.04,
      wanderRefHz: 110, wanderSlope: 1.2, cycleJitter: 0.002, frictionNoise: 0.15 } },
};

export class ViolinModel {
  constructor(fs, os = 2, instrument = 'violin') {
    this.fs = fs;
    this.os = os;
    this.instrument = INSTRUMENTS[instrument] ? instrument : 'violin';
    this.openStrings = INSTRUMENTS[this.instrument].openStrings;
    const fi = fs * os;                      // internal (oversampled) rate
    this.fi = fi;
    this.strings = this.openStrings.map((m) => new BowedString(fi, m));
    this.bows = this.openStrings.map(() => new Bow(fi));
    this.sym = this.openStrings.map((m) => new Resonator(fi, m));
    this.dec1 = new Biquad().design('lowpass', 0.45 * fs, 0.5412, fi);
    this.dec2 = new Biquad().design('lowpass', 0.45 * fs, 1.3066, fi);
    this.active = 0;
    this.exc = 0;
    this.f0 = 196;
    this.periodRamp = new Ramp(1 / 196, 0);
    this.vBowRate = 1 / fi;
    this.vBow = new Ramp(0, this.vBowRate);  // bow velocity ramp
    this.forceRate = 2 / fi;
    this.force = new Ramp(0, this.forceRate); // pressure ramp
    this.onset = false;                      // pressure and bow speed building at a detached note's start
    this.noteOn = false;
    this.vibPhase = 0;
    this.vibRate = 5.8;
    this.vibDepthCents = 0;
    this.vibFade = 0;
    this.vibFadeRate = 1 / (0.25 * fi);      // 250 ms vibrato fade-in
    this.counter = 0;
    this.controlEvery = 32 * os;
    this.outHp = new Biquad().design('highpass', INSTRUMENTS[this.instrument].hpHz, 0.7, fs);
    this.outLp = new Biquad().design('lowpass', 16000, 0.7, fs);
    this.params = {
      expression: 0.6, bowForce: 0.5, bowPosition: 0.1, stickiness: 0.5, bowNoise: 0.5,
      bowRandomPos: 0.5, vibratoDepth: 0.3, vibratoRate: 5.8, stringRes: 0.5,
      portamentoTime: 0.06, forceScale: 0.22, volume: 0.5,
      bowCoupling: 0.9,                    // see Bow.coupling
      // Seconds for bow pressure to build at the start of a detached note. Pressure
      // that creeps up with the bow already moving sits below Schelleng's minimum
      // force and plays multiple slips first; players set the bow, then draw.
      pressureOnset: 0.004,
      bowOnset: 0.06,                      // seconds for the bow to reach speed at a detached note's start
      // Players never hold bow speed, pressure or contact point perfectly still.
      bowWander: 0.15, pressureWander: 0.12, positionWander: 0.07,   // contact wander eased: ±20% swept the bow-position notch (flanger-like, metallic)
      // Optional growth of speed/pressure wander above wanderRefHz, by
      // wanderSlope per octave (at most two octaves). Off for the violin.
      wanderRefHz: 440, wanderSlope: 0,
      // Bow noise split: inside the string loop versus radiated directly.
      directNoise: 0,
      // String HF loss: cutoff fc(f0) = lossFc · (f0/440)^lossSlope.
      lossFc: 10000, lossSlope: 1,         // fitted 13000 to Iowa (≤16 kHz); eased to 10000 by ear: less edge
      // Pitch-tracking source shelf at srcShelfMul · f0 (0 dB turns it off).
      srcShelfMul: 2.0, srcShelfDb: -3,    // fitted to Iowa
      srcShelfSlope: 0,                    // shelf gain change per octave of f0 above A4 (dB/oct)
    };
    this.srcShelf = new Biquad();
    this.wanderV = new SlowNoise(fi, 2.5);
    this.noiseHp = { x1: 0, y1: 0, tick(x) { const y = 0.99 * (this.y1 + x - this.x1); this.x1 = x; this.y1 = y; return y; } };   // DC block
    this.wanderF = new SlowNoise(fi, 1.7);
    this.wanderP = new SlowNoise(fi, 1.1);
    this.setParams({ ...(INSTRUMENTS[this.instrument].defaults || {}) });
  }

  setParams(p) {
    Object.assign(this.params, p);
    const q = this.params;
    for (const b of this.bows) {
      b.stickiness = q.stickiness - 0.5;
      b.noiseAmp = (0.7 * q.bowNoise + 0.4) * 0.16;
      b.noiseRand = q.bowNoise;
      b.forceScale = q.forceScale;
      b.coupling = q.bowCoupling;
      if (q.frictionNoise != null) b.frictionNoise = q.frictionNoise;
      if (q.supervise != null) b.supervise = q.supervise;
      if (q.cycleJitter != null) b.cycleJitter = q.cycleJitter;
    }
    for (const s of this.strings) {
      s.bowPosBase = Math.min(Math.max(0.02 + 0.9 * q.bowPosition, 0.03), 0.45);
      s.bowPos = s.bowPosBase;
      // Zero means no contact-point jitter; the previous fixed floor made the
      // supposedly disabled control keep perturbing short high-note periods.
      s.jitterAmp = q.bowRandomPos * 0.0006;
    }
    this.applyLoss();
    this.vibRate = q.vibratoRate;
    this.vibDepthCents = q.vibratoDepth * 30;
    this.applyExpression();
  }

  applyExpression() {
    if (!this.noteOn) return;
    // Expression drives bow velocity (dynamics). Pressure varies mildly with it,
    // while bowForce selects the position inside the playable stick/slip band.
    const e = this.params.expression;
    const x = (0.25 + 0.6 * this.params.bowForce) * (0.75 + 0.25 * e);
    this.vBow.target = 0.01 + 0.29 * e;
    this.force.target = 0.5 * Math.max(0, x + x * x);
  }

  applyLoss() {
    const q = this.params;
    const fcA = q.lossFc * Math.pow(this.f0 / 440, q.lossSlope);
    for (const s of this.strings) s.setLoss(fcA, fcA * 0.76);
    // Retune the pitch-tracking shelf for each note.
    if (this.srcShelf) this.srcShelf.design('highshelf', q.srcShelfMul * this.f0, 0.707, this.fs, q.srcShelfDb + q.srcShelfSlope * Math.log2(this.f0 / 440));
  }

  pickString(midi) {
    let s = 0;
    for (let i = 0; i < this.openStrings.length; i++) if (midi >= this.openStrings[i]) s = i;
    return s;
  }

  // stringIndex (0 = lowest … 3 = highest string) forces a string; the default picks automatically.
  noteOnMidi(midi, stringIndex = null) {
    const legato = this.noteOn;
    const s = stringIndex ?? this.pickString(midi);
    this.f0 = midiToHz(midi);
    const period = 1 / this.f0;
    if (s !== this.active) {
      this.active = s;
      this.periodRamp.value = period;
    } else if (!legato) {
      this.periodRamp.value = period;
    }
    this.periodRamp.target = period;
    const steps = Math.max(1, this.params.portamentoTime * this.fi);
    this.periodRamp.rate = Math.abs(this.periodRamp.target - this.periodRamp.value) / steps;
    this.noteOn = true;
    this.applyLoss();
    if (!legato) this.vibFade = 0;
    this.applyExpression();
    if (!legato) {
      this.force.rate = Math.max(this.forceRate, this.force.target / Math.max(1, this.params.pressureOnset * this.fi));
      this.vBow.rate = Math.max(this.vBowRate, this.vBow.target / Math.max(1, this.params.bowOnset * this.fi));
      this.onset = true;
    }
  }

  noteOffMidi() {
    this.noteOn = false;
    this.onset = false;                      // release at the usual rates, even mid-onset
    this.force.rate = this.forceRate;
    this.vBow.rate = this.vBowRate;
    this.vBow.target = 0;
    this.force.target = 0;
  }

  process(out, n) {
    const q = this.params;
    for (let i = 0; i < n; i++) {
      let y = 0;
      for (let o = 0; o < this.os; o++) y = this.dec2.tick(this.dec1.tick(this.tickInternal()));
      if (q.srcShelfDb !== 0 || q.srcShelfSlope !== 0) y = this.srcShelf.tick(y);
      y = this.outLp.tick(this.outHp.tick(y)) * q.volume;
      out[i] = Math.max(-0.9999, Math.min(0.9999, y));
    }
  }

  // one sample at the internal (oversampled) rate
  tickInternal() {
    const q = this.params;
    {
      // Apply the same physical movement in bow units across the register.
      // Multiplying wander by pitch made short high-note periods much more
      // likely to fall into a subharmonic even though the player's motion had
      // not changed. Instruments may opt into livelier upper registers with
      // wanderSlope; the violin leaves it at 0.
      const hw = 1 + q.wanderSlope * Math.min(Math.max(Math.log2(this.f0 / q.wanderRefHz), 0), 2);
      const vBow = this.vBow.tick() * Math.max(0, 1 + q.bowWander * hw * this.wanderV.tick());
      const force = this.force.tick() * Math.max(0, 1 + q.pressureWander * hw * this.wanderF.tick());
      if (this.onset) {   // back to the usual ramps once the note has started
        if (this.force.value === this.force.target) this.force.rate = this.forceRate;
        if (this.vBow.value === this.vBow.target) this.vBow.rate = this.vBowRate;
        if (this.force.rate === this.forceRate && this.vBow.rate === this.vBowRate) this.onset = false;
      }
      const wp = 1 + q.positionWander * (0.5 + q.bowRandomPos) * this.wanderP.tick();
      let period = this.periodRamp.tick();

      // Vibrato with a slightly randomised rate and a gentle fade-in.
      this.vibFade = Math.min(1, this.vibFade + (this.noteOn ? this.vibFadeRate : 0));
      this.vibPhase += (2 * Math.PI * this.vibRate * (1 + 0.03 * rand())) / this.fi;
      const cents = this.vibDepthCents * this.vibFade * Math.sin(this.vibPhase);
      period *= Math.pow(2, -cents / 1200);

      const str = this.strings[this.active];
      const bow = this.bows[this.active];
      str.setLengths(period, str.bowPosBase * wp);
      if (this.counter++ % this.controlEvery === 0) bow.update(vBow, force, 1 / period);

      this.exc = vBow > 1e-4 ? bow.tick(vBow, str.vAtBow()) : 0;
      const dn = vBow > 1e-4 ? q.directNoise * this.noiseHp.tick(rand()) * (bow.lastNoiseEnv || 0) : 0;
      let y = 0;
      for (let k = 0; k < this.strings.length; k++) {
        const s = this.strings[k];
        if (k === this.active) y += s.tick(this.exc);
      }
      // Sympathetic resonance of the open strings.
      let sym = 0;
      for (const r of this.sym) sym += r.tick(y * 0.02);
      y += sym * q.stringRes * 0.5;
      return y + dn;
    }
  }

  stats() {
    const b = this.bows[this.active];
    const s = b.slips;
    b.slips = 0;
    return { slips: s, f0: this.f0, string: this.active };
  }
}
