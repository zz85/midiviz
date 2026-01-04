// MidiClock - Wrapper for AudioWorklet-based MIDI scheduling
// Keeps playback running in background tabs

class MidiClock {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.node = null;
    this.ready = false;
    this.lapse = 0;
    this.speed = 1;
    
    // Callbacks - set these before calling play()
    this.onNoteOn = null;   // (note) => {} - called when note should start
    this.onNoteOff = null;  // (note) => {} - called when note should stop
    this.onCC = null;       // (cc) => {} - called for control change events
    this.onTime = null;     // (lapse) => {} - called ~every 50ms with current time in seconds
  }

  async init() {
    await this.ctx.audioWorklet.addModule('midi_clock_worklet.js');
    this.node = new AudioWorkletNode(this.ctx, 'midi-clock');
    this.node.connect(this.ctx.destination); // Must be connected to run

    this.node.port.onmessage = e => {
      const { type, note, cc, lapse } = e.data;
      switch (type) {
        case 'noteOn':
          this.onNoteOn?.(note);
          // Schedule noteOff
          const offTime = (note.duration * 1000) / this.speed;
          setTimeout(() => this.onNoteOff?.(note), offTime);
          break;
        case 'cc':
          this.onCC?.(cc);
          break;
        case 'time':
          this.lapse = lapse;
          this.onTime?.(lapse);
          break;
      }
    };

    this.ready = true;
  }

  load(notes, cc = []) {
    this.node?.port.postMessage({ type: 'load', data: { notes, cc } });
  }

  play() {
    this.ctx.resume();
    this.node?.port.postMessage({ type: 'play' });
  }

  pause() {
    this.node?.port.postMessage({ type: 'pause' });
  }

  seek(time) {
    this.node?.port.postMessage({ type: 'seek', data: { time } });
  }

  setSpeed(speed) {
    this.speed = speed;
    this.node?.port.postMessage({ type: 'speed', data: { speed } });
  }
}

window.MidiClock = MidiClock;
