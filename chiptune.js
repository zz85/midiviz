// Chiptune / 8-bit synthesizer
// Emulates classic NES-era sound: pulse wave + triangle sub + pitch bend + delayed vibrato
class ChiptuneSynth {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();

    // Compressor for punchy, consistent output
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.ratio.value = 6;
    this.compressor.knee.value = 0;
    this.compressor.connect(this.ctx.destination);

    // Bit-crush waveshaper: quantize amplitude to discrete steps
    this.crusher = this.ctx.createWaveShaper();
    const n = 8192;
    const curve = new Float32Array(n);
    const levels = 48; // coarse enough to add grit, fine enough to not destroy the signal
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.round(x * levels) / levels;
    }
    this.crusher.curve = curve;
    this.crusher.connect(this.compressor);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.crusher);
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const t = this.ctx.currentTime;
    const gain = velocity * 0.3;

    // --- Primary: square wave (NES pulse channel) ---
    const pulse = this.ctx.createOscillator();
    pulse.type = 'square';
    // Pitch bend on attack: start slightly sharp, slide down (classic 8-bit pluck)
    pulse.frequency.setValueAtTime(freq * 1.02, t);
    pulse.frequency.exponentialRampToValueAtTime(freq, t + 0.025);

    // --- Sub layer: triangle wave (NES triangle channel) ---
    const tri = this.ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.value = freq;

    const triGain = this.ctx.createGain();
    // Triangle louder in bass range, quieter up high
    triGain.gain.value = Math.min(0.35, 0.15 + 200 / freq);

    // --- Vibrato LFO (delayed onset, very classic chiptune) ---
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 5.5;
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.008, t + 0.35);
    lfo.connect(lfoGain);
    lfoGain.connect(pulse.frequency);
    lfoGain.connect(tri.frequency);

    // --- Envelope: instant attack, slight decay to sustain ---
    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(gain, t);
    noteGain.gain.setTargetAtTime(gain * 0.7, t + 0.005, 0.08);

    // Connect: pulse + tri -> noteGain -> master
    pulse.connect(noteGain);
    tri.connect(triGain);
    triGain.connect(noteGain);
    noteGain.connect(this.masterGain);

    pulse.start(t);
    tri.start(t);
    lfo.start(t);

    this.activeNotes.set(midi, { pulse, tri, triGain, lfo, lfoGain, noteGain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;

    const t = this.ctx.currentTime;
    const release = 0.04; // Very fast cutoff — 8-bit style

    note.noteGain.gain.cancelScheduledValues(t);
    note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, t);
    note.noteGain.gain.linearRampToValueAtTime(0, t + release);

    const stopAt = t + release + 0.01;
    try { note.pulse.stop(stopAt); } catch (_) {}
    try { note.tri.stop(stopAt); } catch (_) {}
    try { note.lfo.stop(stopAt); } catch (_) {}

    setTimeout(() => {
      try {
        note.pulse.disconnect();
        note.tri.disconnect();
        note.triGain.disconnect();
        note.lfo.disconnect();
        note.lfoGain.disconnect();
        note.noteGain.disconnect();
      } catch (_) {}
    }, (release + 0.05) * 1000);

    this.activeNotes.delete(midi);
  }

  allNotesOff() {
    for (const midi of [...this.activeNotes.keys()]) this.noteOff(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
