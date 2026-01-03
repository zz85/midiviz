// OxiSynth Piano - wraps oxisynth WASM synth with tinyaudio
class OxiSynthPiano {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.synth = null;
    this.Synth = null;
    this.ready = false;
    this.initialized = false;
    this.pending = [];
  }

  async _init() {
    if (this.initialized) return;
    this.initialized = true;
    const init = (await import('./fluidweb/pkg/oxisynth.js')).default;
    const { OxiSynth } = await import('./fluidweb/pkg/oxisynth.js');
    await init();
    this.Synth = OxiSynth;
  }

  async loadSoundfont(path) {
    await this._init();
    this.ready = false;
    
    const response = await fetch(path);
    const sf2Data = new Uint8Array(await response.arrayBuffer());
    
    this.synth = new this.Synth(sf2Data, 44100);
    this.ready = true;
    
    this.pending.forEach(([method, args]) => this[method](...args));
    this.pending = [];
  }

  noteOn(midi, velocity = 0.7, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOn', [midi, velocity, channel]]);
      return;
    }
    this.synth.note_on(channel, midi, Math.round(velocity * 127));
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
    return this.ctx?.resume();
  }
}
