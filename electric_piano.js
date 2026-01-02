// Electric Piano synthesis - struck string model with inharmonicity
class ElectricPiano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
  }

  midiToFreq(midi, tuning = 440) {
    return tuning * Math.pow(2, (midi - 69) / 12);
  }

  noteOn(midi, velocity = 0.7, tuning = 440) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi, tuning);
    const t = this.ctx.currentTime;
    
    // Note gain with envelope
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    
    // Piano inharmonicity coefficient (higher for higher notes)
    const B = 0.0004 * Math.pow(midi / 60, 2);
    
    const sources = [];
    const partialGains = [];
    
    // Piano timbre: multiple inharmonic partials
    const numPartials = Math.min(12, Math.floor(8000 / freq));
    
    for (let n = 1; n <= numPartials; n++) {
      // Inharmonic partial frequency: f_n = n * f0 * sqrt(1 + B * n^2)
      const partialFreq = n * freq * Math.sqrt(1 + B * n * n);
      if (partialFreq > 10000) break;
      
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = partialFreq;
      
      // Partial amplitude (piano spectrum - fundamental strong, higher partials decay)
      // Hammer position affects which partials are emphasized
      const hammerPos = 0.12; // ~1/8 of string length
      const hammerEffect = Math.sin(n * Math.PI * hammerPos);
      const amp = (velocity * 0.25 / Math.pow(n, 0.7)) * Math.abs(hammerEffect);
      
      // Each partial has different decay (higher = faster decay)
      const decayTime = Math.max(0.3, 4 - midi / 30) / Math.sqrt(n);
      
      pGain.gain.setValueAtTime(amp, t);
      pGain.gain.setTargetAtTime(amp * 0.5, t, 0.1); // Initial drop
      pGain.gain.setTargetAtTime(0.001, t + 0.1, decayTime);
      
      osc.connect(pGain).connect(noteGain);
      osc.start(t);
      osc.stop(t + decayTime * 5 + 1);
      
      sources.push(osc);
      partialGains.push(pGain);
    }
    
    // Hammer thump (low frequency transient)
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.value = freq * 0.5;
    thumpGain.gain.setValueAtTime(velocity * 0.15, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    thump.connect(thumpGain).connect(noteGain);
    thump.start(t);
    thump.stop(t + 0.1);
    sources.push(thump);
    
    // Attack noise (hammer felt impact)
    const noiseDur = 0.03;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseDur, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }
    const noiseSrc = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = freq * 4;
    noiseFilter.Q.value = 1;
    noiseSrc.buffer = noiseBuf;
    noiseGain.gain.value = velocity * 0.1;
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(noteGain);
    noiseSrc.start(t);
    sources.push(noiseSrc);

    // Master envelope
    noteGain.gain.setValueAtTime(1, t);

    this.activeNotes.set(midi, { sources, noteGain, partialGains });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    // Damper effect - quick decay on release
    note.partialGains.forEach(g => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    });
    
    note.sources.forEach(s => { try { s.stop(t + 0.2); } catch(e) {} });
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
