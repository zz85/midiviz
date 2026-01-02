// Fast Piano - Pre-rendered samples for maximum polyphony
class FastPiano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    this.samples = new Map();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -6;
    this.compressor.ratio.value = 8;
    
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    
    // Pre-render all 88 piano notes
    this.generateAllSamples();
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  generateAllSamples() {
    const sampleRate = this.ctx.sampleRate;
    const duration = 3; // seconds
    const samples = duration * sampleRate;
    
    for (let midi = 21; midi <= 108; midi++) {
      const freq = this.midiToFreq(midi);
      const buffer = this.ctx.createBuffer(1, samples, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Simple but good-sounding piano: fundamental + few harmonics with decay
      const decay = midi < 50 ? 0.8 : midi < 70 ? 1.2 : 2.0;
      const harmonics = midi < 60 ? 6 : midi < 80 ? 4 : 3;
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * decay);
        let sample = 0;
        
        for (let h = 1; h <= harmonics; h++) {
          const hFreq = freq * h;
          if (hFreq > 8000) break;
          const hAmp = 1 / (h * h) * Math.exp(-t * decay * h * 0.3);
          sample += Math.sin(2 * Math.PI * hFreq * t) * hAmp;
        }
        
        data[i] = sample * env * 0.3;
      }
      
      this.samples.set(midi, buffer);
    }
  }

  noteOn(midi, velocity = 0.7, tuning = 440) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const buffer = this.samples.get(midi);
    if (!buffer) return;
    
    const src = this.ctx.createBufferSource();
    // Adjust playback rate for tuning (relative to A440)
    src.playbackRate.value = tuning / 440;
    src.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * 0.8;
    
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    
    this.activeNotes.set(midi, { src, gain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    note.gain.gain.setValueAtTime(note.gain.gain.value, t);
    note.gain.gain.linearRampToValueAtTime(0, t + 0.08);
    
    setTimeout(() => {
      try { note.src.stop(); note.src.disconnect(); note.gain.disconnect(); } catch(e) {}
    }, 100);
    
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
