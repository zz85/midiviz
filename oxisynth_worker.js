// OxiSynth Worker - runs synth in dedicated worker, renders audio buffers
let synth = null;
let fontIndex = new Map();

async function init() {
  const module = await import('./fluidweb/pkg/oxisynth.js');
  await module.default();
  synth = new module.OxiSynthRaw(44100);
}

self.onmessage = async (e) => {
  const { id, cmd, args } = e.data;
  
  try {
    let result;
    
    switch (cmd) {
      case 'init':
        await init();
        result = true;
        break;
        
      case 'loadSoundfont':
        const [path] = args;
        if (fontIndex.has(path)) {
          synth.select_soundfont(fontIndex.get(path));
        } else {
          const response = await fetch(path);
          const sf2Data = new Uint8Array(await response.arrayBuffer());
          const idx = synth.add_soundfont(sf2Data);
          fontIndex.set(path, idx);
        }
        result = true;
        break;
        
      case 'noteOn':
        synth.note_on(args[2], args[0], Math.round(args[1] * 127));
        break;
        
      case 'noteOff':
        synth.note_off(args[1], args[0]);
        break;
        
      case 'programChange':
        synth.program_change(args[0], args[1]);
        break;
        
      case 'controlChange':
        synth.control_change(args[0], args[1], args[2]);
        break;
        
      case 'allNotesOff':
        for (let ch = 0; ch < 16; ch++) synth.all_notes_off(ch);
        break;
        
      case 'allSoundOff':
        for (let ch = 0; ch < 16; ch++) synth.all_sound_off(ch);
        break;
        
      case 'render':
        const frames = args[0];
        const samples = synth.render(frames);
        result = samples;
        break;
    }
    
    if (id >= 0) {
      if (cmd === 'render' && result) {
        self.postMessage({ id, result }, [result.buffer]);
      } else {
        self.postMessage({ id, result });
      }
    }
  } catch (error) {
    if (id >= 0) {
      self.postMessage({ id, error: error.message });
    } else {
      console.error('Worker error:', error);
    }
  }
};
