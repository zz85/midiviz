// Piano synthesis using PeriodicWave wavetable (from musical.js)
class WavetablePiano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    
    // Piano wavetable data (from Google Web Audio samples)
    this.pianoReal = [0, 0, -0.203569, 0.5, -0.401676, 0.137128, -0.104117, 0.115965,
      -0.004413, 0.067884, -0.00888, 0.0793, -0.038756, 0.011882, -0.030883, 0.027608,
      -0.013429, 0.00393, -0.014029, 0.00972, -0.007653, 0.007866, -0.032029, 0.046127,
      -0.024155, 0.023095, -0.005522, 0.004511, -0.003593, 0.011248, -0.004919, 0.008505];
    this.pianoImag = [0, 0.147621, 0, 0.000007, -0.00001, 0.000005, -0.000006, 0.000009,
      0, 0.000008, -0.000001, 0.000014, -0.000008, 0.000003, -0.000009, 0.000009,
      -0.000005, 0.000002, -0.000007, 0.000005, -0.000005, 0.000005, -0.000023, 0.000037,
      -0.000021, 0.000022, -0.000006, 0.000005, -0.000004, 0.000014, -0.000007, 0.000012];
    
    // Multipliers for higher frequencies (attenuate upper harmonics)
    this.mult = [1, 1, 0.18, 0.016, 0.01, 0.01, 0.01, 0.004, 0.014, 0.02, 0.014, 0.004, 0.002, 0.00001];
    this.freqThresholds = [65, 80, 100, 135, 180, 240, 620, 1360];
    
    // Create wavetables for different frequency ranges
    this.waves = this.createWavetables();
    
    // Master output with compression
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.ratio.value = 4;
    this.compressor.connect(this.ctx.destination);
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.compressor);
  }

  createWavetables() {
    const waves = [this.ctx.createPeriodicWave(
      new Float32Array(this.pianoReal),
      new Float32Array(this.pianoImag)
    )];
    
    // Create attenuated versions for higher frequencies
    for (let i = 0; i < this.freqThresholds.length; i++) {
      const amt = (i + 1) / this.freqThresholds.length;
      const real = new Float32Array(this.pianoReal.length);
      const imag = new Float32Array(this.pianoImag.length);
      
      for (let j = 0; j < this.pianoReal.length; j++) {
        const m = Math.log(this.mult[Math.min(j, this.mult.length - 1)]);
        real[j] = this.pianoReal[j] * Math.exp(amt * m);
        imag[j] = this.pianoImag[j] * Math.exp(amt * m);
      }
      waves.push(this.ctx.createPeriodicWave(real, imag));
    }
    return waves;
  }

  getWaveForFreq(freq) {
    for (let i = 0; i < this.freqThresholds.length; i++) {
      if (freq < this.freqThresholds[i]) return this.waves[i];
    }
    return this.waves[this.waves.length - 1];
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi);
    const t = this.ctx.currentTime;
    const wave = this.getWaveForFreq(freq);
    
    // Timbre settings (from musical.js piano)
    const attack = 0.002;
    const decay = 0.25 * Math.pow(440 / freq, 0.7); // decayfollow
    const sustain = 0.03;
    const release = 0.1;
    const gain = velocity * 0.5;
    
    // Create oscillator with piano wavetable
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freq;
    
    // Detuned second oscillator for richness
    const osc2 = this.ctx.createOscillator();
    osc2.setPeriodicWave(wave);
    osc2.frequency.value = freq * 0.9994;
    
    // Lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + freq * 0.1;
    filter.Q.value = 1;
    
    // Gain envelope
    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0, t);
    noteGain.gain.linearRampToValueAtTime(gain, t + attack);
    noteGain.gain.setTargetAtTime(gain * sustain, t + attack, decay);
    
    // Connect
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);
    
    osc.start(t);
    osc2.start(t);
    
    this.activeNotes.set(midi, { osc, osc2, noteGain, filter, release, sustain, gain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    note.noteGain.gain.cancelScheduledValues(t);
    note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, t);
    note.noteGain.gain.linearRampToValueAtTime(0, t + note.release);
    
    note.osc.stop(t + note.release + 0.01);
    note.osc2.stop(t + note.release + 0.01);
    
    setTimeout(() => {
      try {
        note.osc.disconnect();
        note.osc2.disconnect();
        note.filter.disconnect();
        note.noteGain.disconnect();
      } catch(e) {}
    }, (note.release + 0.05) * 1000);
    
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
