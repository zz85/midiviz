// FluidWeb SoundFont Piano - wraps fluidweb WASM synth
class FluidWebPiano {
  constructor(soundfontPath = './soundfonts/Full Grand Piano.sf2') {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.synth = null;
    this.Synth = null;
    this.ready = false;
    this.initialized = false;
    this.pending = []; // queue notes until ready
    this.defaultSoundfont = soundfontPath;
  }

  async _init() {
    if (this.initialized) return;
    this.initialized = true;
    const { default: init, Synth } = await import('./fluidweb/pkg/fluidweb.js');
    await init();
    this.Synth = Synth;
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
    // velocity is 0-1, convert to 0-127
    const vel = Math.round(velocity * 127);
    this.synth.note_on(0, midi, vel);
  }

  noteOff(midi, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOff', [midi, channel]]);
      return;
    }
    this.synth.note_off(0, midi);
  }

  programChange(channel, program) {
    // rustysynth doesn't support program change, ignore
  }

  resume() {
    return this.ctx.resume();
  }
}
