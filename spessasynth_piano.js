// SpessaSynth Piano - wraps spessasynth_lib for soundfont playback
class SpessaSynthPiano {
  constructor() {
    this.ctx = null;
    this.synth = null;
    this.ready = false;
    this.pending = [];
    this.activeFont = null;
    this.fontIndex = 0;
    this.fontBanks = new Map(); // path -> bankOffset
    this.currentBank = 0;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  async loadSoundfont(path) {
    this._ensureContext();
    
    if (this.activeFont === path && this.ready) return;
    
    // If already loaded, just switch to it
    if (this.fontBanks.has(path)) {
      const bankOffset = this.fontBanks.get(path);
      this.currentBank = bankOffset;
      for (let ch = 0; ch < 16; ch++) {
        if (ch !== 9) {
          this.synth.controllerChange(ch, 0, bankOffset);
          this.synth.controllerChange(ch, 32, 0);
          this.synth.programChange(ch, this.synth.channelProperties?.[ch]?.program || 0);
        }
      }
      this.activeFont = path;
      console.log('SpessaSynth: switched to', path);
      window.dispatchEvent(new CustomEvent('soundfont-loaded', { detail: { path } }));
      return;
    }
    
    window.dispatchEvent(new CustomEvent('soundfont-loading', { detail: { path } }));
    
    try {
      const { WorkletSynthesizer } = await import('./lib/spessasynth/spessasynth_lib.bundle.js');
      
      const response = await fetch(path);
      const sfData = await response.arrayBuffer();
      
      // Initialize synth if needed
      if (!this.synth) {
        await this.ctx.audioWorklet.addModule('./lib/spessasynth/spessasynth_processor.min.js');
        this.synth = new WorkletSynthesizer(this.ctx);
        this.synth.connect(this.ctx.destination);
        await this.synth.isReady;
      }
      
      // Add soundfont with unique bank offset
      const bankOffset = this.fontIndex;
      await this.synth.soundBankManager.addSoundBank(sfData, path, bankOffset);
      this.fontBanks.set(path, bankOffset);
      this.currentBank = bankOffset;
      
      // Select this soundfont for all channels
      for (let ch = 0; ch < 16; ch++) {
        if (ch !== 9) {
          this.synth.controllerChange(ch, 0, bankOffset);
          this.synth.controllerChange(ch, 32, 0);
          this.synth.programChange(ch, 0);
        }
      }
      this.fontIndex++;
      console.log('SpessaSynth: loaded', path);
      
      this.activeFont = path;
      this.ready = true;
      
      window.dispatchEvent(new CustomEvent('soundfont-loaded', { detail: { path } }));
      
      this.pending.forEach(([method, args]) => this[method](...args));
      this.pending = [];
    } catch (e) {
      window.dispatchEvent(new CustomEvent('soundfont-error', { detail: { path, error: e } }));
      console.error('SpessaSynth: failed to load', path, e);
    }
  }

  async loadSoundfontStack(paths) {
    for (const path of paths) {
      await this.loadSoundfont(path);
    }
  }

  noteOn(midi, velocity = 0.7, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOn', [midi, velocity, channel]]);
      return;
    }
    this.synth.noteOn(channel, midi, Math.round(velocity * 127));
  }

  noteOff(midi, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOff', [midi, channel]]);
      return;
    }
    this.synth.noteOff(channel, midi);
  }

  programChange(channel, program) {
    if (!this.ready) {
      this.pending.push(['programChange', [channel, program]]);
      return;
    }
    // Always set our bank first
    if (this.currentBank !== undefined && channel !== 9) {
      this.synth.controllerChange(channel, 0, this.currentBank);
      this.synth.controllerChange(channel, 32, 0);
    }
    this.synth.programChange(channel, program);
  }

  controlChange(channel, ctrl, value) {
    if (!this.ready) return;
    this.synth.controllerChange(channel, ctrl, value);
  }

  pitchBend(channel, value) {
    if (!this.ready) return;
    this.synth.pitchWheel(channel, value);
  }

  allNotesOff() {
    if (!this.ready) return;
    this.synth.stopAll();
  }

  allSoundOff() {
    if (!this.ready) return;
    this.synth.stopAll(true);
  }

  resume() {
    return this._ensureContext().resume();
  }
}

window.SpessaSynthPiano = SpessaSynthPiano;
