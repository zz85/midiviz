// Harpsichord synthesis using Karplus-Strong
class Harpsichord {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);
  }

  midiToFreq(midi, tuning = 440) {
    return tuning * Math.pow(2, (midi - 69) / 12);
  }

  // Karplus-Strong string synthesis
  createString(freq, duration) {
    const sampleRate = this.ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buf = this.ctx.createBuffer(1, samples, sampleRate);
    const data = buf.getChannelData(0);
    
    const period = Math.round(sampleRate / freq);
    
    // Initialize with noise burst (hammer strike)
    for (let i = 0; i < period; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    // Karplus-Strong with lowpass averaging
    const decay = 0.995;
    for (let i = period; i < samples; i++) {
      const prev = i - period;
      data[i] = decay * 0.5 * (data[prev] + data[Math.max(0, prev - 1)]);
    }
    
    return buf;
  }

  noteOn(midi, velocity = 0.7, tuning = 440) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi, tuning);
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    
    const sources = [];
    
    // Main string (Karplus-Strong)
    const stringSrc = this.ctx.createBufferSource();
    stringSrc.buffer = this.createString(freq, 4);
    stringSrc.connect(gain);
    stringSrc.start(t);
    sources.push(stringSrc);
    
    // Add harmonics for richness
    [2, 3].forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.frequency.value = freq * h;
      osc.type = 'sine';
      oscGain.gain.setValueAtTime(velocity * 0.05 / (i + 2), t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 2);
      osc.connect(oscGain).connect(gain);
      osc.start(t);
      osc.stop(t + 2);
      sources.push(osc);
    });

    // Envelope
    gain.gain.setValueAtTime(velocity * 0.6, t);
    gain.gain.setTargetAtTime(velocity * 0.2, t + 0.01, 0.5);

    this.activeNotes.set(midi, { sources, gain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    note.gain.gain.cancelScheduledValues(t);
    note.gain.gain.setValueAtTime(note.gain.gain.value, t);
    note.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    
    note.sources.forEach(s => { try { s.stop(t + 0.3); } catch(e) {} });
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
