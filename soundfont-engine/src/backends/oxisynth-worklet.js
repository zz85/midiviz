import { BaseBackend } from './base.js';

/**
 * OxiSynth in an AudioWorklet, playing into the page's AudioContext.
 *
 * The `oxisynth` backend's WASM opens an AudioContext of its own (cpal's web
 * output) and plays into that context's speakers, so nothing the page puts on
 * its own context (reverb, a mixer, a limiter, an offline render) reaches it.
 * This one runs the same synth (OxiSynthRaw, the same oxisynth.js and .wasm) in
 * an AudioWorkletNode on `audioContext`, rendering each 128-frame quantum on
 * the audio thread, and connects the node to `audioContext.destination`, or to
 * `output` where one is given.
 *
 * Commands go to the processor through its port and take effect at the next
 * quantum (about 3 ms). A soundfont is parsed on the audio thread, which holds
 * every AudioWorklet of the context for that time: load fonts before playing.
 */
const PROCESSOR = 'oxisynth-raw-processor';

// The processor, as a module made at run time: it imports the compat shims and
// the wasm-bindgen glue by absolute URL (a Blob module has no base for relative ones)
const processorSource = (compatUrl, glueUrl) => `
import ${JSON.stringify(compatUrl)}
import { initSync, OxiSynthRaw } from ${JSON.stringify(glueUrl)}
class P extends AudioWorkletProcessor {
  constructor(opts) {
    super()
    this.synth = null
    this.queue = []
    this.port.onmessage = e => {
      const m = e.data
      if (m.op === 'init') {
        try { initSync({ module: m.wasm }); this.synth = new OxiSynthRaw(sampleRate); this.port.postMessage({ op: 'ready' }) }
        catch (err) { this.port.postMessage({ op: 'error', message: String(err && err.message || err) }) }
      } else if (m.op === 'font') {
        try {
          const idx = this.fonts?.get(m.path) ?? this.synth.add_soundfont(new Uint8Array(m.data))
          if (this.fonts?.has(m.path)) this.synth.select_soundfont(idx)
          ;(this.fonts ??= new Map()).set(m.path, idx)
          this.port.postMessage({ op: 'font', id: m.id })
        } catch (err) { this.port.postMessage({ op: 'font', id: m.id, error: String(err && err.message || err) }) }
      } else this.queue.push(m)
    }
  }
  process(inputs, outputs) {
    const out = outputs[0], L = out[0], R = out[1] || L
    const s = this.synth
    if (!s) return true
    for (const m of this.queue) {
      const a = m.a
      switch (m.op) {
        case 'on': s.note_on(a[0], a[1], a[2]); break
        case 'off': s.note_off(a[0], a[1]); break
        case 'prog': s.program_change(a[0], a[1]); break
        case 'cc': s.control_change(a[0], a[1], a[2]); break
        case 'notesOff': for (let c = 0; c < 16; c++) if (a[0] == null || a[0] === c) s.all_notes_off(c); break
        case 'soundOff': for (let c = 0; c < 16; c++) s.all_sound_off(c); break
      }
    }
    this.queue.length = 0
    const buf = s.render(L.length)
    for (let i = 0; i < L.length; i++) { L[i] = buf[2 * i]; R[i] = buf[2 * i + 1] }
    return true
  }
}
registerProcessor(${JSON.stringify(PROCESSOR)}, P)
`;

const registered = new WeakMap(); // AudioContext -> Promise (the module, once per context)

export class OxiSynthWorkletBackend extends BaseBackend {
  constructor(options = {}) {
    super(options);
    this._output = options.output || null;
    this._node = null;
    this._fontWaits = new Map();
    this._fontId = 0;
  }

  get capabilities() {
    return { sf3: false, controlChange: true, pitchBend: false };
  }

  async _doInit() {
    const ctx = this.audioContext;
    const base = new URL(this.vendorPath + '/oxisynth/', location.href);
    if (!registered.has(ctx)) {
      const src = processorSource(new URL('./worklet-compat.js', import.meta.url).href, new URL('oxisynth.js', base).href);
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      registered.set(ctx, ctx.audioWorklet.addModule(url));
    }
    const [wasm] = await Promise.all([fetch(new URL('oxisynth_bg.wasm', base)).then(r => {
      if (!r.ok) throw new Error(`oxisynth_bg.wasm: HTTP ${r.status}`);
      return r.arrayBuffer();
    }), registered.get(ctx)]);
    this._node = new AudioWorkletNode(ctx, PROCESSOR, { numberOfInputs: 0, outputChannelCount: [2] });
    this._node.connect(this._output || ctx.destination);
    await new Promise((resolve, reject) => {
      this._node.port.onmessage = e => {
        const m = e.data;
        if (m.op === 'ready') resolve();
        else if (m.op === 'error') reject(new Error(m.message));
        else if (m.op === 'font') {
          const w = this._fontWaits.get(m.id); this._fontWaits.delete(m.id);
          if (w) m.error ? w.reject(new Error(m.error)) : w.resolve();
        }
      };
      this._node.port.postMessage({ op: 'init', wasm }, [wasm]);
    });
  }

  _doLoadSoundFont(path, data) {
    const id = ++this._fontId;
    return new Promise((resolve, reject) => {
      this._fontWaits.set(id, { resolve, reject });
      const buf = data.buffer.byteLength === data.byteLength ? data.buffer : data.slice().buffer;
      this._node.port.postMessage({ op: 'font', id, path, data: buf }, [buf]);
    });
  }

  _post(op, a) { this._node?.port.postMessage({ op, a }); }
  _doNoteOn(midi, velocity, channel) { this._post('on', [channel, midi, Math.max(1, Math.min(127, Math.round(velocity * 127)))]); }
  _doNoteOff(midi, channel) { this._post('off', [channel, midi]); }
  _doProgramChange(channel, program) { this._post('prog', [channel, program]); }
  _doControlChange(channel, controller, value) { this._post('cc', [channel, controller, value]); }
  _doPitchBend() {}
  _doAllNotesOff(channel) { this._post('notesOff', [channel]); }
  _doAllSoundOff() { this._post('soundOff', []); }

  _doDispose() {
    if (this._node) { this._post('soundOff', []); this._node.disconnect(); this._node.port.onmessage = null; this._node = null; }
  }
}
