# SpessaSynth Bundle

Bundled [spessasynth_lib](https://github.com/spessasus/SpessaSynth) for browser use.

## Files

- `spessasynth_lib.bundle.js` - Main library with WorkletSynthesizer
- `spessasynth_core.bundle.js` - Core library for SF3/SF2 parsing and conversion
- `spessasynth_processor.min.js` - AudioWorklet processor

## Rebuilding

```bash
bun install
bun build entry.js --bundle --outfile=spessasynth_lib.bundle.js --format=esm
bun build entry_core.js --bundle --outfile=spessasynth_core.bundle.js --format=esm
```

## Version

- spessasynth_lib@4.0.19
- spessasynth_core@4.0.24
