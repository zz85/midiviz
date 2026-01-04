// FluidWeb SoundFont Piano - wraps fluidweb WASM synth (rustysynth)
class FluidWebPiano {
  constructor(soundfontPath = './soundfonts/Full Grand Piano.sf2') {
    this.ctx = null;
    this.synth = null;
    this.Synth = null;
    this.ready = false;
    this.initialized = false;
    this.pending = []; // queue notes until ready
    this.defaultSoundfont = soundfontPath;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  async _init() {
    if (this.initialized) return;
    this.initialized = true;
    const init = (await import('./fluidweb/pkg/rustysynth.js')).default;
    const { RustySynth } = await import('./fluidweb/pkg/rustysynth.js');
    await init();
    this.Synth = RustySynth;
  }

  async loadSoundfont(path) {
    await this._init();
    this.ready = false;
    const response = await fetch(path);
    const sf2Data = new Uint8Array(await response.arrayBuffer());
    
    this.synth = new this.Synth(sf2Data, 44100);
    this.ready = true;
    
    // Play any pending notes
    this.pending.forEach(([method, args]) => this[method](...args));
    this.pending = [];
  }

  noteOn(midi, velocity = 0.7, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOn', [midi, velocity, channel]]);
      return;
    }
    const vel = Math.round(velocity * 127);
    this.synth.note_on(channel, midi, vel);
  }

  noteOff(midi, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOff', [midi, channel]]);
      return;
    }
    this.synth.note_off(channel, midi);
  }

  programChange(channel, program) {
    if (!this.ready) {
      this.pending.push(['programChange', [channel, program]]);
      return;
    }
    this.synth.program_change(channel, program);
  }

  resume() {
    return this._ensureContext().resume();
  }
}

window.FluidWebPiano = FluidWebPiano;
