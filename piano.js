// Piano synthesis - physical modeling with sample transposition for treble
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    this.sampleCache = new Map(); // Cache generated samples
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Soundboard resonance
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
    
    this.masterGain.connect(this.soundboard).connect(this.cabinet).connect(this.ctx.destination);
    
    // Pre-generate samples for base notes (every 6 semitones up to 60)
    this.baseNotes = [36, 42, 48, 54, 60];
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Generate a sample buffer for a given midi note using synthesis
  generateSample(midi, duration = 5) {
    const freq = this.midiToFreq(midi);
    const sampleRate = this.ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buf = this.ctx.createBuffer(1, samples, sampleRate);
    const data = buf.getChannelData(0);
    
    const B = midi < 50 ? 0.0004 : 0.0002;
    const baseDecay = midi < 40 ? 8 : midi < 55 ? 5 : 3.5;
    const numPartials = midi < 50 ? 16 : 10;
    
    // Render partials into buffer
    for (let n = 1; n <= numPartials; n++) {
      const fn = n * freq * Math.sqrt(1 + B * n * n);
      if (fn > 12000) break;
      
      const hammerNode = Math.sin(n * Math.PI * 0.125);
      let amp = 0.18;
      if (n === 1) amp *= 1.0;
      else if (n === 2) amp *= 0.6;
      else if (n === 3) amp *= 0.35;
      else amp *= 0.25 / Math.pow(n - 2, 0.9);
      amp *= Math.pow(Math.abs(hammerNode), 0.7);
      
      const partialDecay = baseDecay / (1 + (n - 1) * 0.15);
      const omega = 2 * Math.PI * fn / sampleRate;
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        // Two-stage envelope approximation
        let env;
        if (t < 0.05) env = amp;
        else if (t < 0.2) env = amp * (0.6 + 0.4 * (0.2 - t) / 0.15);
        else env = amp * 0.6 * Math.exp(-(t - 0.2) / (partialDecay * 0.3));
        
        data[i] += env * Math.sin(omega * i);
      }
    }
    
    // Add hammer noise at start
    const noiseLen = Math.floor(sampleRate * 0.025);
    for (let i = 0; i < noiseLen; i++) {
      const env = Math.pow(1 - i / noiseLen, 2);
      data[i] += (Math.random() * 2 - 1) * env * 0.08;
    }
    
    // Normalize
    let max = 0;
    for (let i = 0; i < samples; i++) max = Math.max(max, Math.abs(data[i]));
    if (max > 0) for (let i = 0; i < samples; i++) data[i] /= max;
    
    return buf;
  }

  // Get or create cached sample for base note
  getSample(baseMidi) {
    if (!this.sampleCache.has(baseMidi)) {
      this.sampleCache.set(baseMidi, this.generateSample(baseMidi));
    }
    return this.sampleCache.get(baseMidi);
  }

  // Find nearest base note for transposition
  findBaseNote(midi) {
    if (midi <= 60) return midi; // Synthesize directly for low notes
    // For high notes, find nearest base note to transpose from
    let best = 60;
    for (const base of this.baseNotes) {
      if (Math.abs(midi - base) < Math.abs(midi - best)) best = base;
    }
    return best;
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const t = this.ctx.currentTime;
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    
    const sources = [];
    const partialGains = [];

    if (midi <= 60) {
      // Use direct synthesis for midi <= 60
      this.synthNote(midi, velocity, t, noteGain, sources, partialGains);
    } else {
      // Use transposed sample for midi > 60
      const baseMidi = 60;
      const semitones = midi - baseMidi;
      const playbackRate = Math.pow(2, semitones / 12);
      
      const sample = this.getSample(baseMidi);
      const src = this.ctx.createBufferSource();
      src.buffer = sample;
      src.playbackRate.value = playbackRate;
      
      // Gentle lowpass - not too dark
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = Math.max(3500, 8000 - (midi - 60) * 120);
      lpf.Q.value = 0.7;
      
      const srcGain = this.ctx.createGain();
      srcGain.gain.setValueAtTime(velocity * 0.6, t);
      const decay = 2.5 / Math.sqrt(playbackRate);
      srcGain.gain.setTargetAtTime(0.0001, t + 0.05, decay);
      
      src.connect(lpf).connect(srcGain).connect(noteGain);
      src.start(t);
      
      sources.push(src);
      partialGains.push(srcGain);
    }

    this.activeNotes.set(midi, { sources, noteGain, partialGains });
  }

  // Direct synthesis for lower notes
  synthNote(midi, velocity, t, noteGain, sources, partialGains) {
    const freq = this.midiToFreq(midi);
    const B = midi < 50 ? 0.0005 : 0.0003;
    const baseDecay = midi < 40 ? 7 : midi < 55 ? 5 : 3.5;
    const numPartials = midi < 50 ? 16 : 12;
    
    for (let n = 1; n <= numPartials; n++) {
      const fn = n * freq * Math.sqrt(1 + B * n * n);
      if (fn > 12000) break;
      
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = fn;
      osc.detune.value = (Math.random() - 0.5) * 6;
      
      const hammerNode = Math.sin(n * Math.PI * 0.125);
      let amp = velocity * 0.18;
      if (n === 1) amp *= 1.0;
      else if (n === 2) amp *= 0.7;
      else if (n === 3) amp *= 0.5;
      else if (n === 4) amp *= 0.35;
      else amp *= 0.25 / Math.pow(n - 3, 0.8);
      amp *= Math.pow(Math.abs(hammerNode), 0.6);
      
      const partialDecay = baseDecay / Math.pow(n, 0.45);
      
      pGain.gain.setValueAtTime(0, t);
      pGain.gain.linearRampToValueAtTime(amp, t + 0.003);
      pGain.gain.exponentialRampToValueAtTime(amp * 0.5, t + 0.06);
      pGain.gain.setTargetAtTime(0.0001, t + 0.1, partialDecay);
      
      osc.connect(pGain).connect(noteGain);
      osc.start(t);
      osc.stop(t + partialDecay * 5);
      
      sources.push(osc);
      partialGains.push(pGain);
    }
    
    // Coupled strings (piano has 2-3 strings per note, slightly detuned)
    if (midi > 40) {
      for (const detune of [-1.5, 1.5]) {
        const osc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        pGain.gain.setValueAtTime(velocity * 0.08, t);
        pGain.gain.setTargetAtTime(0.0001, t + 0.1, baseDecay * 0.8);
        osc.connect(pGain).connect(noteGain);
        osc.start(t);
        osc.stop(t + baseDecay * 4);
        sources.push(osc);
        partialGains.push(pGain);
      }
    }
    
    // Soundboard thump
    if (midi < 55) {
      const thump = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(freq * 0.5, t);
      thump.frequency.exponentialRampToValueAtTime(freq * 0.25, t + 0.04);
      thumpGain.gain.setValueAtTime(velocity * 0.12, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      thump.connect(thumpGain).connect(noteGain);
      thump.start(t);
      thump.stop(t + 0.1);
      sources.push(thump);
    }
    
    // Hammer noise
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.015, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 3);
    }
    const noiseSrc = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    noiseSrc.buffer = noiseBuf;
    noiseGain.gain.value = velocity * 0.15;
    noiseSrc.connect(noiseGain).connect(noteGain);
    noiseSrc.start(t);
    sources.push(noiseSrc);
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
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
