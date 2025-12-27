// Piano synthesis using Web Audio API
class Piano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
  }

  // Convert MIDI note to frequency
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  noteOn(midi, velocity = 0.7) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi);
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    
    // Piano uses multiple detuned oscillators for richness
    const oscs = [0, 1, -1, 0.5].map((detune, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(t);
      return osc;
    });

    // ADSR envelope for piano-like attack/decay
    const vol = velocity * 0.3;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01); // Attack
    gain.gain.exponentialRampToValueAtTime(vol * 0.7, t + 0.1); // Decay
    gain.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.5); // Sustain decay

    this.activeNotes.set(midi, { oscs, gain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    note.gain.gain.cancelScheduledValues(t);
    note.gain.gain.setValueAtTime(note.gain.gain.value, t);
    note.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); // Release
    
    note.oscs.forEach(osc => osc.stop(t + 0.3));
    this.activeNotes.delete(midi);
  }

  // Resume audio context (required after user interaction)
  resume() {
    return this.ctx.resume();
  }
}
