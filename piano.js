// Piano synthesis - Pianoteq-style physical modeling
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    
    // Output chain with soundboard resonance
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Soundboard resonance (body)
    this.soundboard = this.ctx.createBiquadFilter();
    this.soundboard.type = 'peaking';
    this.soundboard.frequency.value = 220;
    this.soundboard.Q.value = 2;
    this.soundboard.gain.value = 3;
    
    // Cabinet resonance
    this.cabinet = this.ctx.createBiquadFilter();
    this.cabinet.type = 'peaking';
    this.cabinet.frequency.value = 120;
    this.cabinet.Q.value = 1.5;
    this.cabinet.gain.value = 2;
    
    // Presence
    this.presence = this.ctx.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 3000;
    this.presence.gain.value = -2;
    
    // Stereo widening via slight delay
    this.delayL = this.ctx.createDelay();
    this.delayR = this.ctx.createDelay();
    this.delayL.delayTime.value = 0.01;
    this.delayR.delayTime.value = 0.012;
    
    this.merger = this.ctx.createChannelMerger(2);
    
    this.masterGain
      .connect(this.soundboard)
      .connect(this.cabinet)
      .connect(this.presence);
    
    this.presence.connect(this.delayL).connect(this.merger, 0, 0);
    this.presence.connect(this.delayR).connect(this.merger, 0, 1);
    this.merger.connect(this.ctx.destination);
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi);
    const t = this.ctx.currentTime;
    
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    
    // String stiffness - treble strings are thinner, less inharmonic
    const B = midi < 50 ? 0.0004 : midi < 70 ? 0.0002 : 0.00008;
    
    // Decay time varies by register (treble decays faster but not too fast)
    const baseDecay = midi < 40 ? 8 : midi < 55 ? 5 : midi < 70 ? 3.5 : 2.5;
    
    const sources = [];
    const partialGains = [];
    
    // String partials - fewer for high notes (they're naturally purer)
    const numPartials = midi < 50 ? 16 : midi < 70 ? 10 : 6;
    
    for (let n = 1; n <= numPartials; n++) {
      // Inharmonic frequency
      const fn = n * freq * Math.sqrt(1 + B * n * n);
      if (fn > 12000) break;
      
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = fn;
      
      // Hammer strike position (~1/8 string) creates notches
      const hammerRatio = 0.125;
      const hammerNode = Math.sin(n * Math.PI * hammerRatio);
      
      // Spectral envelope - high notes have stronger fundamental
      let amp = velocity * 0.18;
      const trebleFactor = midi > 65 ? 1.5 : 1;
      if (n === 1) amp *= 1.0 * trebleFactor;
      else if (n === 2) amp *= 0.6;
      else if (n === 3) amp *= 0.35;
      else amp *= 0.25 / Math.pow(n - 2, 0.9);
      
      amp *= Math.pow(Math.abs(hammerNode), 0.7);
      
      // Per-partial decay (higher partials decay faster)
      const partialDecay = baseDecay / (1 + (n - 1) * 0.15);
      
      // Two-stage decay (initial brightness then mellow sustain)
      pGain.gain.setValueAtTime(amp, t);
      pGain.gain.setTargetAtTime(amp * 0.6, t, 0.05);
      pGain.gain.setTargetAtTime(amp * 0.25, t + 0.2, partialDecay * 0.3);
      pGain.gain.setTargetAtTime(0.0001, t + partialDecay, partialDecay * 0.5);
      
      osc.connect(pGain).connect(noteGain);
      osc.start(t);
      osc.stop(t + partialDecay * 3);
      
      sources.push(osc);
      partialGains.push(pGain);
    }
    
    // Duplex scale resonance (upper strings resonate sympathetically)
    if (midi > 64) {
      const duplexFreq = freq * 3.01; // Slightly detuned 3rd harmonic
      const duplex = this.ctx.createOscillator();
      const duplexGain = this.ctx.createGain();
      duplex.type = 'sine';
      duplex.frequency.value = duplexFreq;
      duplexGain.gain.setValueAtTime(velocity * 0.015, t + 0.05);
      duplexGain.gain.setTargetAtTime(0.0001, t + 0.1, 1.5);
      duplex.connect(duplexGain).connect(noteGain);
      duplex.start(t);
      duplex.stop(t + 4);
      sources.push(duplex);
    }
    
    // Hammer noise - softer for high notes
    const noiseDur = midi > 65 ? 0.012 : 0.025;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseDur, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      const env = Math.pow(1 - i / noiseData.length, 2);
      noiseData[i] = (Math.random() * 2 - 1) * env;
    }
    
    const noiseSrc = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = Math.min(freq * 3, 4000);
    noiseFilter.Q.value = 0.5;
    noiseSrc.buffer = noiseBuf;
    noiseGain.gain.value = velocity * (midi > 65 ? 0.03 : 0.08);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(noteGain);
    noiseSrc.start(t);
    sources.push(noiseSrc);
    
    // Soundboard thump (low register impact)
    if (midi < 60) {
      const thump = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(80, t);
      thump.frequency.exponentialRampToValueAtTime(40, t + 0.05);
      thumpGain.gain.setValueAtTime(velocity * 0.08, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      thump.connect(thumpGain).connect(noteGain);
      thump.start(t);
      thump.stop(t + 0.15);
      sources.push(thump);
    }

    this.activeNotes.set(midi, { sources, noteGain, partialGains });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    // Damper - fast but not instant cutoff
    note.partialGains.forEach(g => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    });
    
    note.sources.forEach(s => { try { s.stop(t + 0.15); } catch(e) {} });
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
