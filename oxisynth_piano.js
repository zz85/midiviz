// OxiSynth Piano - wraps oxisynth WASM synth with tinyaudio
class OxiSynthPiano {
  constructor() {
    this.ctx = null;
    this.synth = null;
    this.ready = false;
    this.pending = [];
    this.fontIndex = new Map(); // path -> font index
    this.activeFont = null;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  async _init() {
    if (this.synth) return;
    if (!this._initPromise) {
      this._initPromise = (async () => {
        const init = (await import('./fluidweb/pkg/oxisynth.js')).default;
        const { OxiSynth } = await import('./fluidweb/pkg/oxisynth.js');
        await init();
        this._OxiSynth = OxiSynth;
      })();
    }
    await this._initPromise;
    if (!this.synth) {
      this.synth = new this._OxiSynth(44100);
    }
  }

  async loadSoundfont(path) {
    await this._init();
    
    if (this.activeFont === path) return;
    
    window.dispatchEvent(new CustomEvent('soundfont-loading', { detail: { path } }));
    
    try {
      let idx = this.fontIndex.get(path);
      if (idx === undefined) {
        const response = await fetch(path);
        const sf2Data = new Uint8Array(await response.arrayBuffer());
        idx = this.synth.add_soundfont(sf2Data);
        this.fontIndex.set(path, idx);
      } else {
        this.synth.select_soundfont(idx);
      }
      
      this.activeFont = path;
      this.ready = true;
      
      window.dispatchEvent(new CustomEvent('soundfont-loaded', { detail: { path } }));
      
      this.pending.forEach(([method, args]) => this[method](...args));
      this.pending = [];
    } catch (e) {
      window.dispatchEvent(new CustomEvent('soundfont-error', { detail: { path, error: e } }));
      console.error('Failed to load soundfont:', e);
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
    return this._ensureContext().resume();
  }
}
