// OxiSynth Piano with SF3 support - decodes SF3 to SF2 before loading
import { SoundBankLoader, BasicSoundBank } from './lib/spessasynth/spessasynth_core.bundle.js';

class OxiSynthPianoSF3 {
  constructor() {
    this.ctx = null;
    this.synth = null;
    this.ready = false;
    this.pending = [];
    this.fontIndex = new Map();
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
        let sf2Data = new Uint8Array(await response.arrayBuffer());
        
        // Convert SF3 to SF2 if needed
        if (path.endsWith('.sf3')) {
          console.log('Decoding SF3 to SF2...');
          const start = performance.now();
          const soundbank = SoundBankLoader.fromArrayBuffer(sf2Data.buffer);
          await BasicSoundBank.isSF3DecoderReady;
          const sf2Buffer = await soundbank.writeSF2({ decompress: true });
          sf2Data = new Uint8Array(sf2Buffer);
          console.log(`SF3 decode took ${((performance.now() - start) / 1000).toFixed(2)}s`);
        }
        
        const start = performance.now();
        idx = this.synth.add_soundfont(sf2Data);
        console.log(`Soundfont load took ${((performance.now() - start) / 1000).toFixed(2)}s`);
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
    if (!this.ready) { this.pending.push(['noteOn', [midi, velocity, channel]]); return; }
    this.synth.note_on(channel, midi, Math.round(velocity * 127));
  }

  noteOff(midi, channel = 0) {
    if (!this.ready) { this.pending.push(['noteOff', [midi, channel]]); return; }
    this.synth.note_off(channel, midi);
  }

  programChange(channel, program) {
    if (!this.ready) { this.pending.push(['programChange', [channel, program]]); return; }
    this.synth.program_change(channel, program);
  }

  controlChange(channel, ctrl, value) {
    if (!this.ready) return;
    this.synth.control_change(channel, ctrl, value);
  }

  pitchBend(channel, value) {
    if (!this.ready) return;
    this.synth.pitch_bend(channel, value);
  }

  allNotesOff(channel = 0) {
    if (!this.ready) return;
    if (channel === undefined) {
      for (let ch = 0; ch < 16; ch++) this.synth.all_notes_off(ch);
    } else {
      this.synth.all_notes_off(channel);
    }
  }

  allSoundOff() {
    if (!this.ready) return;
    for (let ch = 0; ch < 16; ch++) this.synth.all_sound_off(ch);
  }

  resume() {
    return this._ensureContext().resume();
  }
}

window.OxiSynthPianoSF3 = OxiSynthPianoSF3;
