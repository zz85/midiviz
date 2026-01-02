// Piano synthesis inspired by PianoForte approach
// Uses harmonic profiles with random phases and exponential decay
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    
    // Warmth filter - lower cutoff
    this.warmth = this.ctx.createBiquadFilter();
    this.warmth.type = 'lowpass';
    this.warmth.frequency.value = 2800;
    this.warmth.Q.value = 0.4;
    
    // Bass boost - more depth
    this.bass = this.ctx.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 300;
    this.bass.gain.value = 5;
    
    // Light reverb
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverb(1.8, 2.5);
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.85;
    this.wetGain.gain.value = 0.15;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    
    // Compressor to prevent distortion
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.1;
    
    this.masterGain.connect(this.warmth).connect(this.bass);
    this.bass.connect(this.compressor);
    this.compressor.connect(this.dryGain).connect(this.ctx.destination);
    this.compressor.connect(this.convolver).connect(this.wetGain).connect(this.ctx.destination);
    
    // Harmonic profiles for different registers (from PianoForte's G1, G2, G3)
    this.profiles = {
      low: {
        harmonics: [2.00, 3.01, 4.01, 5.02, 7.03, 9.07, 10.09, 12.13, 16.34, 18.47],
        amplitudes: [0.084, 0.177, 0.079, 0.056, 0.076, 0.068, 0.082, 0.123, 0.048, 0.053]
      },
      mid: {
        harmonics: [1.0, 2.00, 3.01, 4.01, 5.02, 6.03, 7.04, 8.06, 9.08],
        amplitudes: [0.25, 0.20, 0.12, 0.08, 0.05, 0.035, 0.025, 0.018, 0.012]
      },
      high: {
        harmonics: [1.0, 2.0, 3.01, 4.01, 5.03, 6.04, 7.05, 8.07],
        amplitudes: [0.30, 0.18, 0.08, 0.06, 0.03, 0.02, 0.015, 0.01]
      }
    };
  }

  createReverb(duration, decay) {
    const len = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  midiToFreq(midi, tuning = 440) {
    return tuning * Math.pow(2, (midi - 69) / 12);
  }

  // Inharmonicity factor (from PianoForte)
  partialFreq(f0, n, beta = 0.000033) {
    return n * f0 * Math.sqrt(1 + beta * n * n);
  }

  getProfile(midi) {
    // Fewer harmonics for performance during dense passages
    if (midi <= 45) return this.profiles.low;
    if (midi <= 65) return this.profiles.mid;
    return this.profiles.high;
  }

  // Limit polyphony to prevent CPU overload
  limitPolyphony(maxNotes = 16) {
    if (this.activeNotes.size >= maxNotes) {
      // Stop oldest note
      const oldest = this.activeNotes.keys().next().value;
      this.noteOff(oldest);
    }
  }

  noteOn(midi, velocity = 0.7, tuning = 440) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    this.limitPolyphony(20);
    
    const f0 = this.midiToFreq(midi, tuning);
    const t = this.ctx.currentTime;
    const profile = this.getProfile(midi);
    
    // Decay rate varies by register - slower for warmer sustain
    const decayRate = midi < 40 ? 0.0001 : midi < 60 ? 0.00015 : 0.00022;
    
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    noteGain.gain.setValueAtTime(1, t);
    
    const sources = [];
    const partialGains = [];
    
    // Random phase accumulator for natural stereo spread
    let phaseL = Math.random() * Math.PI * 2;
    let phaseR = Math.random() * Math.PI * 2;
    
    // Limit partials for performance
    const maxPartials = 6;
    const partialsToUse = Math.min(profile.harmonics.length, maxPartials);
    
    for (let i = 0; i < partialsToUse; i++) {
      const harmonic = profile.harmonics[i];
      const amp = profile.amplitudes[i];
      
      // Partial frequency with slight inharmonicity
      const fn = this.partialFreq(f0, harmonic);
      if (fn > 6000) break;
      
      // Create stereo pair with random phase difference
      phaseL += (Math.random() - 0.5) * 3;
      phaseR += (Math.random() - 0.5) * 3;
      
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = fn;
      
      // Exponential decay time
      const decayTime = 1 / (decayRate * fn * 2 * Math.PI);
      const clampedDecay = Math.max(0.3, Math.min(decayTime, 8));
      
      // Slight detune for richness
      osc.detune.value = (Math.random() - 0.5) * 6;
      
      // Amplitude with velocity scaling - reduce for high notes
      const registerScale = midi > 80 ? 0.3 : midi > 70 ? 0.4 : 0.5;
      const baseAmp = velocity * amp * registerScale;
      
      // Two-stage decay: fast initial brightness decay, then slow sustain
      // Higher harmonics lose more in the initial stage (piano characteristic)
      const brightnessDecay = 0.08 + (i * 0.02); // faster for higher harmonics
      const sustainDecay = Math.max(0.3, Math.min(clampedDecay, 8));
      
      pGain.gain.setValueAtTime(baseAmp, t);
      pGain.gain.setTargetAtTime(baseAmp * (0.4 / (1 + i * 0.15)), t, brightnessDecay);
      pGain.gain.setTargetAtTime(0.0001, t + 0.3, sustainDecay);
      
      osc.connect(pGain).connect(noteGain);
      osc.start(t);
      osc.stop(t + clampedDecay * 6);
      
      sources.push(osc);
      partialGains.push(pGain);
    }
    
    // Add fundamental reinforcement - stronger for depth
    const fundOsc = this.ctx.createOscillator();
    const fundGain = this.ctx.createGain();
    fundOsc.type = 'sine';
    fundOsc.frequency.value = f0;
    const fundDecay = midi < 50 ? 8 : midi < 70 ? 5 : 3.5;
    const fundAmp = midi > 75 ? 0.2 : midi > 60 ? 0.3 : 0.25; // Less for very high notes
    fundGain.gain.setValueAtTime(velocity * fundAmp, t);
    fundGain.gain.setTargetAtTime(0.0001, t, fundDecay);
    fundOsc.connect(fundGain).connect(noteGain);
    fundOsc.start(t);
    fundOsc.stop(t + fundDecay * 5);
    sources.push(fundOsc);
    partialGains.push(fundGain);
    
    // Hammer attack noise
    const noiseDur = 0.015;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseDur, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 2);
    }
    const noiseSrc = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    noiseSrc.buffer = noiseBuf;
    noiseGain.gain.value = velocity * 0.08;
    noiseSrc.connect(noiseGain).connect(noteGain);
    noiseSrc.start(t);
    sources.push(noiseSrc);

    this.activeNotes.set(midi, { sources, noteGain, partialGains });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    // Smooth fadeout to prevent clicks (longer ramp)
    note.partialGains.forEach(g => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.05);
    });
    
    // Disconnect after fadeout completes
    setTimeout(() => {
      note.sources.forEach(s => { try { s.stop(); s.disconnect(); } catch(e) {} });
      note.noteGain.disconnect();
    }, 80);
    
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
