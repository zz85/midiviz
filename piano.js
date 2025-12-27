// Piano synthesis using Finite Difference physical modeling
// Based on OpenPiano approach (Chaigne's stiff string model)
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    this.Fs = this.ctx.sampleRate;
    this.Ts = 1 / this.Fs;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Create a piano string using finite difference simulation
  createStringSound(midi, velocity, duration = 5) {
    const f0 = this.midiToFreq(midi);
    const Fs = this.Fs;
    const Ts = this.Ts;
    
    // String physical parameters (scaled for different registers)
    const L = 0.6 - (midi - 40) * 0.004; // String length decreases with pitch
    const rho = midi < 50 ? 0.012 : midi < 65 ? 0.008 : 0.005; // Linear density
    const Te = rho * L * L * 4 * f0 * f0; // Tension from f0
    const c = Math.sqrt(Te / rho); // Wave speed
    
    // Stiffness (inharmonicity)
    const r_gyr = 0.0003;
    const E = 2e11; // Young's modulus (steel)
    const S = Math.PI * r_gyr * r_gyr;
    const eps = (r_gyr * r_gyr * E * S) / (Te * L * L);
    
    // Damping coefficients - much lower for sustained tone
    const b1 = midi < 50 ? 0.1 : midi < 70 ? 0.2 : 0.4;
    const b2 = midi < 50 ? 2e-6 : midi < 70 ? 1e-6 : 5e-7;
    
    // Calculate spatial grid size
    const gamma = Fs / (2 * f0);
    const N = Math.floor(Math.sqrt((-1 + Math.sqrt(1 + 16 * eps * gamma * gamma)) / (8 * eps)));
    const Xs = L / N; // Spatial step
    
    // Limit N for performance
    const maxN = 150;
    const actualN = Math.min(N, maxN);
    
    // FD parameters
    const r = c * Ts / Xs;
    const D = 1 + b1 * Ts + 2 * b2 / Ts;
    const N_sqr = actualN * actualN;
    const r_sqr = r * r;
    
    // PDE coefficients (Chaigne)
    const a1 = (2 - 2 * r_sqr + b2 / Ts - 6 * eps * N_sqr * r_sqr) / D;
    const a2 = (-1 + b1 * Ts + 2 * b2 / Ts) / D;
    const a3 = (r_sqr * (1 + 4 * eps * N_sqr)) / D;
    const a4 = (b2 / Ts - eps * N_sqr * r_sqr) / D;
    const a5 = (-b2 / Ts) / D;
    
    // Hammer parameters - softer hammer for piano tone
    const Mh = 0.005; // Hammer mass (lighter)
    const K = 5e8; // Hammer stiffness (softer)
    const p = 2.2; // Nonlinearity exponent (less harsh)
    const bH = 0.1; // Hammer damping
    const hammerPos = 0.125; // Strike position (1/8 of string)
    const hammerContact = Math.round(hammerPos * actualN);
    
    // Hammer FD coefficients
    const d1 = 2 / (1 + bH * Ts / (2 * Mh));
    const d2 = (-1 + bH * Ts / (2 * Mh)) / (1 + bH * Ts / (2 * Mh));
    const dF = (-Ts * Ts / Mh) / (1 + bH * Ts / (2 * Mh));
    
    // Hammer window (simplified)
    const hammerWidth = Math.max(3, Math.floor(actualN * 0.05));
    const hammerMask = new Float32Array(actualN + 4);
    for (let i = 0; i < hammerWidth; i++) {
      const idx = hammerContact - Math.floor(hammerWidth / 2) + i;
      if (idx >= 0 && idx < actualN + 4) {
        hammerMask[idx] = 0.5 * (1 - Math.cos(2 * Math.PI * i / hammerWidth));
      }
    }
    
    // String displacement arrays (circular buffer of 4 time steps)
    const y = [
      new Float32Array(actualN + 4),
      new Float32Array(actualN + 4),
      new Float32Array(actualN + 4),
      new Float32Array(actualN + 4)
    ];
    
    // Hammer state
    const eta = new Float32Array(4); // Hammer displacement
    const Fh = new Float32Array(4);  // Hammer force
    
    // Initial hammer velocity - gentler strike
    const V_h0 = velocity * 2;
    eta[0] = V_h0 * Ts;
    
    // Output buffer
    const samples = Math.ceil(Fs * duration);
    const output = new Float32Array(samples);
    
    // Pickup position (opposite side from hammer)
    const pickupPos = actualN - hammerContact;
    const Ms = rho * L;
    
    // Time stepping
    let n0 = 0, n1 = 3, n2 = 2, n3 = 1;
    
    for (let n = 0; n < samples; n++) {
      // Rotate buffer indices
      n3 = n2;
      n2 = n1;
      n1 = n0;
      n0 = (n0 + 1) & 3;
      
      // Update string displacement (interior points)
      for (let i = 2; i < actualN + 2; i++) {
        y[n0][i] = a1 * y[n1][i] + 
                   a2 * y[n2][i] + 
                   a3 * (y[n1][i + 1] + y[n1][i - 1]) +
                   a4 * (y[n1][i + 2] + y[n1][i - 2]) +
                   a5 * (y[n2][i + 1] + y[n2][i - 1] + y[n3][i]) +
                   (Ts * Ts * actualN * Fh[n1] * hammerMask[i]) / Ms;
      }
      
      // Boundary conditions (simple reflection)
      y[n0][0] = -y[n0][2];
      y[n0][1] = -y[n0][2] * 0.5;
      y[n0][actualN + 2] = -y[n0][actualN];
      y[n0][actualN + 3] = -y[n0][actualN] * 0.5;
      
      // Update hammer displacement
      eta[n0] = d1 * eta[n1] + d2 * eta[n2] + dF * Fh[n1];
      
      // Calculate hammer force
      const stringAtHammer = y[n0][hammerContact + 2];
      if (eta[n0] > stringAtHammer) {
        Fh[n0] = K * Math.pow(eta[n0] - stringAtHammer, p);
      } else {
        Fh[n0] = 0;
      }
      
      // Output: average around pickup position
      let sum = 0;
      for (let i = -2; i <= 2; i++) {
        const idx = pickupPos + 2 + i;
        if (idx >= 0 && idx < actualN + 4) sum += y[n0][idx];
      }
      output[n] = sum / 5;
    }
    
    // Normalize
    let maxVal = 0;
    for (let i = 0; i < samples; i++) maxVal = Math.max(maxVal, Math.abs(output[i]));
    if (maxVal > 0) {
      for (let i = 0; i < samples; i++) output[i] /= maxVal;
    }
    
    // Create audio buffer
    const buffer = this.ctx.createBuffer(1, samples, Fs);
    buffer.copyToChannel(output, 0);
    return buffer;
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const t = this.ctx.currentTime;
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    
    // Generate string sound using FD simulation
    const buffer = this.createStringSound(midi, velocity);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    
    noteGain.gain.setValueAtTime(velocity * 0.8, t);
    src.connect(noteGain);
    src.start(t);
    
    this.activeNotes.set(midi, { src, noteGain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    note.noteGain.gain.cancelScheduledValues(t);
    note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, t);
    note.noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    
    try { note.src.stop(t + 0.2); } catch(e) {}
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
