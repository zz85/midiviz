Midi Visualization Experiments

[MidiViz Piano](midiviz_piano.html) - Main player with sepia theme UI

[WebMscore](webmscore.html) - MuseScore reference renderer (libmscore via WebAssembly)

15 Mar 2026

[WebMscore Reference Renderer](webmscore.html)
- Load .mscz, .mscx, MusicXML, MIDI files and render via MuseScore's libmscore in WASM
- SVG/PNG/PDF/MIDI/MusicXML export
- Score metadata, parts, measure positions
- Interactive API console for experimentation

5 Jan 2026

[Experiment #023 - Synthesia Background Playback](023_synthesia_background.html)
- AudioWorklet-based MIDI scheduling (plays in background tabs)
- Reduced audio glitches via worklet timing
- Uses new `useBackgroundClock` option in PlaybackControls

3 Jan 2026

[Experiment #022 - Synthesia Multi-Synth](022_synthesia_multi_synth.html)
- Selectable synth engine: OxiSynth SF3, OxiSynth, SpessaSynth, FluidWeb
- Hot-swap synths during playback

[Experiment #021 - Synthesia OxiSynth SF3](021_synthesia_oxisynth_sf3.html)
- OxiSynth with native SF3 support via spessasynth_core
- Decodes SF3 to SF2 in-browser before loading
- Non-blocking decompression (main thread stays responsive)

[SF3 to SF2 Converter](test_sf3_to_sf2.html)
- Browser-based SF3 to SF2 converter
- Uses Web Worker for non-blocking Vorbis decompression

[Experiment #020 - Synthesia SpessaSynth](020_synthesia_spessasynth.html)
- SpessaSynth WASM synthesizer
- SF2 and SF3 soundfont support
- Soundfont stacking with bank offsets

[Experiment #019 - Synthesia OxiSynth Worker](019_synthesia_oxisynth_worker.html)
- Experimental: runs OxiSynth in Web Worker with AudioWorklet
- Keeps soundfont parsing off main thread
- Higher latency and memory usage than #018 due to message passing overhead
- Use #018 for better performance; this is for reference

[Experiment #018 - Synthesia OxiSynth](018_synthesia_oxisynth.html)
- OxiSynth WASM synthesizer (Rust/oxisynth)
- SF2 and SF3 soundfont support
- Soundfont caching via font bank
- Multi-instrument via MIDI channels

2 Jan 2025

[Experiment #017 - Synthesia FluidWeb](017_synthesia_fluidweb.html)
- RustySynth WASM synthesizer (SF2 only)
- Multiple .sf2 soundfont selection
- Real-time SF2 playback with AudioWorklet

[FluidWeb Piano Test](fluidweb/fluidweb_piano_test.html)
- WASM SoundFont synth with AudioWorklet

[FluidWeb Piano (ScriptProcessor)](fluidweb/fluidweb_piano_scriptprocessor.html)
- WASM SoundFont synth with ScriptProcessorNode (iOS compatible)

[FluidWeb Test](fluidweb/fluidweb_test.html)
- Basic FluidWeb WASM test

27 Dec 2024

[Experiment #016 - Synthesia Three.js](016_synthesia_threejs.html)
- Three.js 3D version of Synthesia
- Orthographic (default) and perspective camera views
- 88-key 3D piano with proper key positioning

[Experiment #015 - Synthesia WebGL](015_synthesia_webgl.html)
- WebGL2 GPU-accelerated version of Synthesia
- Blur-based bloom effect with screen blending
- Batched rendering for better performance

[Experiment #014 - Synthesia](014_synthesia.html)
- Synthesia-style falling notes visualization
- 88-key piano at bottom with key lighting
- Particle effects on note impact
- Grid lines for octaves and measures
- Multiple instrument support (6 synths)
- Bloom toggle for performance

[Experiment #013 - Physical Model](013_physical_model.html)
- MIDI playback with custom piano synthesis
- Ball visualization from earlier experiments

[Audio Test](audio_test.html)
- Audio-only performance test (no visuals)
- For benchmarking synth performance

[Piano Test](piano_test.html)
- Interactive 3-octave keyboard
- Test piano synthesis directly

Piano Synthesis Library:
- piano.js - Modal synthesis with harmonic profiles (PianoForte-inspired)
- wavetable_piano.js - PeriodicWave wavetable (musical.js-inspired)
- fast_piano.js - Pre-rendered samples for max polyphony
- electric_piano.js - Additive synthesis with inharmonicity
- harpsichord.js - Karplus-Strong plucked string
- silent_piano.js - 4'33" by John Cage (for testing)

26 Jan 2021

[Experiment #012 - Merry Spiral](012_merry_spiral.html)
- Modified from 011, particles moves from inside out
- feels like a merry go round

[Experiment #011 - Sucking star](011_sucking_star.html)
- Modified from 010, but clamp to the center

[Experiment #010 - Fountain rain](010_fountain_rain.html)
- Modified from 003, but arranged in a circle
- notes move from the edge to the center

[Experiment #009 - Lighted piano roll](009_piano_lights.html)
- Extension of 001, but I wanted it to light up when notes are being played

4 Feb 2018

[Experiment #008 - Spiral path](008_spiral_path.html)
- Extension of 007, with the trails
- Follow cursor isn't the best, feels like a drawing app.
- Maybe it should have a life, and let interactivitiy move it.

23 Jan 2018

[Experiment #007 - Spiral](007_spiral.html)
- Draw notes as they place around in a spiral
- Fade notes away after drawing
- More ideas: follow cursor / trail / random,
- predraw vs continous simulation

21 Jan 2018

[Experiment #006 - Hammers](006_hammers.html)
- Visualize notes by abstract piano hammers
- also [test easing algorithms](test_fade.html)

[Experiment #005 - Keyboard](005_keyboard.html)
- Visualize notes on Keyboard

[Experiment #004 - SoundFont](004_soundfont.html)
- Use of [soundfont.js](https://github.com/danigb/soundfont-player) for audio samples

20 Jan 2018

[Experiment #003 - Balls with controls](003_ballsy.html)
- Balls + Controls

[Experiment #002 - Balls ](002_balls.html)
- Balls

[Experiment #001 - Piano Roll ](001_basic_piano_roll.html)
- Classic visualizations

More ideas
- using lines
- fountain rain
- tonejs
- note/color buckets
