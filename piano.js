// Piano synthesis using Modal Synthesis with measured parameters
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    
    // Warmth filter - cut harsh highs
    this.warmth = this.ctx.createBiquadFilter();
    this.warmth.type = 'lowpass';
    this.warmth.frequency.value = 3500;
    this.warmth.Q.value = 0.5;
    
    // Bass boost for deeper tone
    this.bass = this.ctx.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 250;
    this.bass.gain.value = 4;
    
    // Reverb
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverb(2.5, 3);
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.8;
    this.wetGain.gain.value = 0.2;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Routing: masterGain -> warmth -> bass -> dry + reverb -> destination
    this.masterGain.connect(this.warmth);
    this.warmth.connect(this.bass);
    this.bass.connect(this.dryGain).connect(this.ctx.destination);
    this.bass.connect(this.convolver).connect(this.wetGain).connect(this.ctx.destination);
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

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Inharmonicity coefficient B varies by register (measured from real pianos)
  getInharmonicity(midi) {
    // Bass strings (wound) have lower B, treble (plain steel) higher
    if (midi < 40) return 0.00005;
    if (midi < 50) return 0.0001;
    if (midi < 60) return 0.0002;
    if (midi < 70) return 0.0004;
    return 0.0006;
  }

    // Mode amplitude - warmer spectrum (less highs)
    getModeAmplitude(n, hammerPos) {
    const nodeEffect = Math.sin(n * Math.PI * hammerPos);
    // Steeper rolloff for warmer tone
    const rolloff = 1 / Math.pow(n, 1.1);
    return Math.abs(nodeEffect) * rolloff;
  }

  // Decay time for each mode (higher modes decay faster)
  getModeDecay(n, midi, baseDecay) {
    // Two decay components: frequency-dependent and mode-dependent
    const freqDecay = baseDecay;
    const modeDecay = freqDecay / (1 + 0.03 * (n - 1) * (n - 1));
    return Math.max(0.1, modeDecay);
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const f0 = this.midiToFreq(midi);
    const t = this.ctx.currentTime;
    const B = this.getInharmonicity(midi);
    
    // Hammer position varies by register (bass ~1/8, treble ~1/12)
    const hammerPos = midi < 50 ? 0.125 : midi < 70 ? 0.11 : 0.09;
    
    // Base decay time varies by register
    const baseDecay = midi < 40 ? 12 : midi < 55 ? 8 : midi < 70 ? 5 : 3;
    
    // Number of modes - fewer for warmer sound
    const numModes = midi < 50 ? 14 : midi < 65 ? 10 : midi < 80 ? 7 : 5;
    
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    noteGain.gain.setValueAtTime(1, t);
    
    const sources = [];
    const modeGains = [];
    
    for (let n = 1; n <= numModes; n++) {
      // Modal frequency with inharmonicity: f_n = n * f0 * sqrt(1 + B*n^2)
      const fn = n * f0 * Math.sqrt(1 + B * n * n);
      if (fn > 8000) break;
      
      // Create oscillator for this mode
      const osc = this.ctx.createOscillator();
      const modeGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = fn;
      
      // Slight detune for coupled strings (piano has 2-3 strings per note)
      if (midi > 35 && n <= 3) {
        osc.detune.value = (Math.random() - 0.5) * 3;
      }
      
      // Mode amplitude
      let amp = velocity * 0.2 * this.getModeAmplitude(n, hammerPos);
      
      // Boost fundamental and second partial for deeper tone
      if (n === 1) amp *= 2.0;
      if (n === 2) amp *= 1.4;
      
      // Mode decay
      const decay = this.getModeDecay(n, midi, baseDecay);
      
      // Envelope: sharp attack, two-stage decay (bright then mellow)
      modeGain.gain.setValueAtTime(0, t);
      modeGain.gain.linearRampToValueAtTime(amp, t + 0.002);
      // Initial brightness decay
      modeGain.gain.setTargetAtTime(amp * 0.6, t + 0.002, 0.05);
      // Long sustain decay
      modeGain.gain.setTargetAtTime(0.0001, t + 0.1, decay);
      
      osc.connect(modeGain).connect(noteGain);
      osc.start(t);
      osc.stop(t + decay * 6);
      
      sources.push(osc);
      modeGains.push(modeGain);
    }
    
    // Hammer thump (low frequency transient)
    const thumpFreq = Math.max(50, f0 * 0.5);
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(thumpFreq, t);
    thump.frequency.exponentialRampToValueAtTime(thumpFreq * 0.5, t + 0.03);
    thumpGain.gain.setValueAtTime(velocity * 0.15, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    thump.connect(thumpGain).connect(noteGain);
    thump.start(t);
    thump.stop(t + 0.1);
    sources.push(thump);
    
    // Hammer noise
    const noiseDur = 0.02;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseDur, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 2);
    }
    const noiseSrc = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = Math.min(f0 * 2, 2000);
    noiseFilter.Q.value = 1;
    noiseSrc.buffer = noiseBuf;
    noiseGain.gain.value = velocity * 0.1;
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(noteGain);
    noiseSrc.start(t);
    sources.push(noiseSrc);

    this.activeNotes.set(midi, { sources, noteGain, modeGains });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    // Damper stops the string - quick decay
    note.modeGains.forEach(g => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    });
    
    note.sources.forEach(s => { try { s.stop(t + 0.15); } catch(e) {} });
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
