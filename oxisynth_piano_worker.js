// OxiSynth Piano (Worker) - synth in worker, audio via AudioWorklet
class OxiSynthPiano {
  constructor() {
    this.worker = new Worker('./oxisynth_worker.js', { type: 'module' });
    this.ready = false;
    this.pending = [];
    this.msgId = 0;
    this.callbacks = new Map();
    this.activeFont = null;
    this.ctx = null;
    this.workletNode = null;
    
    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const cb = this.callbacks.get(id);
      if (cb) {
        this.callbacks.delete(id);
        if (error) cb.reject(new Error(error));
        else cb.resolve(result);
      }
    };
  }

  _send(cmd, args = []) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.worker.postMessage({ id, cmd, args });
    });
  }

  _sendFire(cmd, args = []) {
    this.worker.postMessage({ id: -1, cmd, args });
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      this._setupAudio();
    }
    return this.ctx;
  }

  async _setupAudio() {
    await this.ctx.audioWorklet.addModule('./oxisynth_worklet.js');
    this.workletNode = new AudioWorkletNode(this.ctx, 'oxisynth-processor');
    this.workletNode.connect(this.ctx.destination);
    
    // Handle buffer requests from worklet
    this.workletNode.port.onmessage = async (e) => {
      if (e.data.needBuffers && this.ready) {
        this._sendBuffers(4);
      }
    };
    
    // Continuously pump buffers
    this._pumpBuffers();
  }

  async _pumpBuffers() {
    while (true) {
      if (this.ready && this.workletNode) {
        await this._sendBuffers(2);
      }
      await new Promise(r => setTimeout(r, 20));
    }
  }

  async _sendBuffers(count) {
    for (let i = 0; i < count; i++) {
      const samples = await this._send('render', [512]);
      if (samples && this.workletNode) {
        this.workletNode.port.postMessage({ samples: Array.from(samples) });
      }
    }
  }

  async _init() {
    if (this._initialized) return;
    this._initialized = true;
    await this._send('init');
  }

  async loadSoundfont(path) {
    await this._init();
    
    if (this.activeFont === path) return;
    
    window.dispatchEvent(new CustomEvent('soundfont-loading', { detail: { path } }));
    
    try {
      await this._send('loadSoundfont', [path]);
      this.activeFont = path;
      this.ready = true;
      
      this._ensureContext();
      this._sendBuffers(8);
      
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
    this._sendFire('noteOn', [midi, velocity, channel]);
  }

  noteOff(midi, channel = 0) {
    if (!this.ready) {
      this.pending.push(['noteOff', [midi, channel]]);
      return;
    }
    this._sendFire('noteOff', [midi, channel]);
  }

  programChange(channel, program) {
    if (!this.ready) {
      this.pending.push(['programChange', [channel, program]]);
      return;
    }
    this._sendFire('programChange', [channel, program]);
  }

  controlChange(channel, ctrl, value) {
    if (!this.ready) return;
    this._sendFire('controlChange', [channel, ctrl, value]);
  }

  allNotesOff() {
    if (!this.ready) return;
    this._sendFire('allNotesOff');
  }

  allSoundOff() {
    if (!this.ready) return;
    this._sendFire('allSoundOff');
  }

  resume() {
    return this.ctx?.resume();
  }
}
