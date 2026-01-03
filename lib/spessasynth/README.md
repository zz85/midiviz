# SpessaSynth Bundle

Bundled [spessasynth_lib](https://github.com/spessasus/SpessaSynth) for browser use.

## Files

- `spessasynth_lib.bundle.js` - Main library (bun bundle)
- `spessasynth_processor.min.js` - AudioWorklet processor

## Rebuilding

```bash
npm install
bun build entry.js --outfile=spessasynth_lib.bundle.js --format=esm
```

## Version

spessasynth_lib@4.0.19
