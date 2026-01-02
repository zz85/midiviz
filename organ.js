// Church Organ synthesis - drawbar organ with multiple ranks
class ChurchOrgan {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
    
    // Reverb for church acoustics
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverb(3, 2);
    
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.5;
    this.wetGain.gain.value = 0.5;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    
    this.masterGain.connect(this.dryGain).connect(this.ctx.destination);
    this.masterGain.connect(this.convolver).connect(this.wetGain).connect(this.ctx.destination);
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

  noteOn(midi, velocity = 0.7, tuning = 440) {
    if (this.activeNotes.has(midi)) this.noteOff(midi);
    
    const freq = this.midiToFreq(midi, tuning);
    const t = this.ctx.currentTime;
    
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);
    
    const sources = [];
    
    // Organ drawbar stops (feet): 16', 8', 4', 2-2/3', 2', 1-3/5', 1-1/3', 1'
    // Corresponds to harmonics: 0.5, 1, 2, 3, 4, 5, 6, 8
    const drawbars = [
      { mult: 0.5, amp: 0.5 },   // 16' sub-bass
      { mult: 1, amp: 1.0 },     // 8' fundamental
      { mult: 2, amp: 0.8 },     // 4' octave
      { mult: 3, amp: 0.4 },     // 2-2/3' nazard
      { mult: 4, amp: 0.6 },     // 2' super octave
      { mult: 5, amp: 0.2 },     // 1-3/5' tierce
      { mult: 6, amp: 0.3 },     // 1-1/3' larigot
      { mult: 8, amp: 0.25 }     // 1' piccolo
    ];
    
    drawbars.forEach(d => {
      const f = freq * d.mult;
      if (f > 8000) return;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      
      const gain = this.ctx.createGain();
      const amp = velocity * d.amp * 0.12;
      
      // Organ has slow attack (wind filling pipes)
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.08);
      
      osc.connect(gain).connect(noteGain);
      osc.start(t);
      sources.push({ osc, gain });
    });
    
    // Add slight vibrato (tremulant)
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 6;
    vibratoGain.gain.value = 3;
    vibrato.connect(vibratoGain);
    sources.forEach(s => vibratoGain.connect(s.osc.frequency));
    vibrato.start(t);
    sources.push({ osc: vibrato, gain: vibratoGain });

    this.activeNotes.set(midi, { sources, noteGain });
  }

  noteOff(midi) {
    const note = this.activeNotes.get(midi);
    if (!note) return;
    
    const t = this.ctx.currentTime;
    
    // Organ release (wind leaving pipes)
    note.sources.forEach(s => {
      s.gain.gain.setValueAtTime(s.gain.gain.value, t);
      s.gain.gain.linearRampToValueAtTime(0, t + 0.1);
      s.osc.stop(t + 0.15);
    });
    
    setTimeout(() => {
      note.sources.forEach(s => { try { s.osc.disconnect(); s.gain.disconnect(); } catch(e) {} });
      note.noteGain.disconnect();
    }, 200);
    
    this.activeNotes.delete(midi);
  }

  resume() {
    return this.ctx.resume();
  }
}
