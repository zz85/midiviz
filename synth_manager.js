/**
 * SynthManager - Dynamic synth loader for multiple WASM synth engines
 */
class SynthManager {
  static synths = {
    oxisynth_sf3: { label: 'OxiSynth SF3', module: './oxisynth_piano_sf3.js', global: 'OxiSynthPianoSF3', esm: true },
    oxisynth: { label: 'OxiSynth', module: './oxisynth_piano.js', global: 'OxiSynthPiano', esm: false },
    spessasynth: { label: 'SpessaSynth', module: './spessasynth_piano.js', global: 'SpessaSynthPiano', esm: false },
    fluidweb: { label: 'RustySynth', module: './fluidweb_piano.js', global: 'FluidWebPiano', esm: false }
  };

  static loaded = {};

  static async load(name) {
    const synth = this.synths[name];
    if (!synth) return null;
    if (!this.loaded[name]) {
      // Check if already globally available
      if (window[synth.global]) {
        this.loaded[name] = window[synth.global];
      } else {
        if (synth.esm) {
          await import(synth.module);
        } else {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = synth.module.replace('./', '');
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        this.loaded[name] = window[synth.global];
      }
      console.log('Loaded', name, ':', this.loaded[name]);
    }
    return this.loaded[name];
  }

  static async create(name) {
    const SynthClass = await this.load(name);
    return SynthClass ? new SynthClass() : null;
  }
}

window.SynthManager = SynthManager;
