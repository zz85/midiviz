# fluidweb

WASM SoundFont synthesizers for the browser. Provides two synth implementations:

- **RustySynth** (119KB) - Lightweight, based on [rustysynth](https://github.com/sinshu/rustysynth)
- **OxiSynth** (231KB) - Feature-rich FluidSynth port via [oxisynth](https://github.com/PolyMeilex/OxiSynth)

Both support SF2 soundfonts, 16 MIDI channels, and program changes for multi-instrument playback.

## Building

Requires [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/).

```bash
# Build RustySynth
wasm-pack build --target web --out-name rustysynth --features rustysynth

# Build OxiSynth  
wasm-pack build --target web --out-name oxisynth --features oxisynth
```

## Usage

### RustySynth

```javascript
import init, { RustySynth } from './pkg/rustysynth.js';

await init();
const sf2 = await fetch('soundfont.sf2').then(r => r.arrayBuffer());
const synth = new RustySynth(new Uint8Array(sf2), 44100);

synth.program_change(0, 0);   // channel 0, program 0 (piano)
synth.note_on(0, 60, 100);    // channel, key, velocity
synth.note_off(0, 60);        // channel, key
```

### OxiSynth

```javascript
import init, { OxiSynth } from './pkg/oxisynth.js';

await init();
const sf2 = await fetch('soundfont.sf2').then(r => r.arrayBuffer());
const synth = new OxiSynth(new Uint8Array(sf2), 44100);

synth.program_change(0, 0);   // channel 0, program 0 (piano)
synth.note_on(0, 60, 100);    // channel, key, velocity
synth.note_off(0, 60);        // channel, key
```

## API

Both synths expose the same interface:

| Method | Args | Description |
|--------|------|-------------|
| `new(sf2_data, sample_rate)` | `Uint8Array`, `i32` | Load soundfont and start audio |
| `note_on(channel, key, velocity)` | `u8/i32` | Start a note |
| `note_off(channel, key)` | `u8/i32` | Stop a note |
| `program_change(channel, program)` | `u8/i32` | Change instrument (0-127) |

## Audio Output

Audio is handled internally via [tinyaudio](https://crates.io/crates/tinyaudio) which uses Web Audio API. No additional setup required - audio plays automatically when notes are triggered.

## License

- RustySynth: MIT
- OxiSynth: LGPL-2.1
