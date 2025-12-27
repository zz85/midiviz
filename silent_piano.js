// 4'33" Piano - John Cage's silent masterpiece
class SilentPiano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = new Map();
  }
  noteOn(midi, velocity) { this.activeNotes.set(midi, true); }
  noteOff(midi) { this.activeNotes.delete(midi); }
  resume() { return this.ctx.resume(); }
}
