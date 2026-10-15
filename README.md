Midi Visualization Experiments

[MidiViz Piano](midiviz_piano.html) - Main player with sepia theme UI

[WebMscore](webmscore.html) - MuseScore reference renderer (libmscore via WebAssembly)

15 Oct 2026

[Experiment #030 - Concert Stage](030_concert_stage.html)
- The #028 grand restaged after [Concert Creator](https://www.concertcreator.ai/)'s renders: black stage, one warm spotlight with dust in the beam, a back light rimming the case, and a warm bounce from the open lid onto the plate
- Piano forked to [concertstage/concert-grand.js](concertstage/concert-grand.js): mirror fallboard (planar reflection of the keys), red key felt, three staggered rows of coiled tuning pins on red felt, agraffes, capo bar, red stringing braid, hammered bronze-gold plate, orange-peel lacquer
- Their UI layout: Songs / Camera / Visuals / Render pills and a bottom transport (speed, play, loop, ms clock); chrome fades out while a song plays
- Cameras from their menu: Top, First Person, Orbit, View 1–4, plus the song-synced cinematic tour from #028
- Lesson mode: keyboard only, falling notes in left / right hand colours with L / R (or finger number) labels, glowing keys, halos and sparks; hands from a quick split, refined by `fingering/` when present
- Depth of field with autofocus, bloom, film grain, vignette and a slight handheld drift; fully procedural lighting (no HDRI downloads)
- Render → offline MP4 export (any resolution, 30/60 fps, with audio) via notation3d/video-export.js

14 Oct 2026

[Experiment #028 - Grand Piano](028_grand_piano.html)
- Physically based concert grand built entirely in code ([grandpiano/grand-piano.js](grandpiano/grand-piano.js)), ~211 cm model-B proportions
- S-curved rim, lid on a prop stick with fold-back flap (full / short stick / closed), cheek blocks, fallboard, music desk with sheet music, turned legs on brass casters, lyre and three pedals, artist bench
- Inside: gold plate with windows over a spruce soundboard and bridges, ~230 overstrung strings (copper bass crossing the tenor), tuning and hitch pins
- 88 keys with hammers and dampers that move with them; sustain pedal lifts all dampers and presses the pedal
- MeshPhysicalMaterial throughout: clearcoat lacquer (ebony, satin, white, walnut, mahogany, rosewood, red), metallic plate and strings, sheen felt
- Scenes: photo studio (real softbox HDRI with a dark floor, on a cyclorama), Victorian ballroom salon on 2k herringbone parquet, concert stage looking out over the hall (Poly Haven CC0 2k HDRIs, grounded skybox)
- Photo-scanned Poly Haven veneers: spruce-toned soundboard, maple bridges, walnut, sapele mahogany and figured rosewood case finishes (loaded on demand)
- Soft shadows, contact shadow, GTAO and a little bloom; AgX tone mapping with exposure control
- Cinematic tour camera: a slow 110 s loop through eleven shots on a spline (tail, under the lid, hammers, along the keys…); drag to take over, Esc hides the UI, `?view=tour` starts in it
- While a song plays the tour follows it: camera position is locked to song time (pause holds the shot, seeking glides there, the loop is stretched to fit the song), it leans toward the notes being played and pushes in on loud chords (`?sync=0` to turn off)
- Shareable links: the address bar always holds the current scene, finish, lid, camera angle, effects, sound and song; "Copy link" adds the song position (a shared song starts on the first click)
- Play with mouse, QWERTY or Web MIDI, or play songs through soundfont-engine; `?q=low` for slower GPUs

13 Oct 2026

[Experiment #027 - JabTunes Reimagined](027_jabtunes_reimagined.html)
- Real-time three.js take on the 2009 JabTunes piano: every key is extruded geometry (notched whites, sloped blacks) on its own pivot, so chords, glissandi and whole songs animate
- Mirror-under-lacquer fallboard with gold "My Music" (`?title=` to change); light trails rise from each played key up through the varnish (per-channel colours for songs)
- Song player: built-in MIDIs, Open… or drag-and-drop any .mid; keyboard grows to fit, speed, seek
- Sound via soundfont-engine (oxisynth, Motif ES6 + Creative GM by default, GM instrument picker) or the original 2009 samples, repitched to any range, with damping and a working pedal
- Original QWERTY map, ←/→ octave shift, Space sustain, Web MIDI keyboard input with velocity
- Notepad recorder in the old `c1 d1s …` notation with Play / Back / Clear, plus Share (link replays the recording)
- 25, 37, 49, 61 or 88 keys; original, player, low, top and free-orbit cameras

[Experiment #026 - JabTunes (recovered)](026_jabtunes_recovered.html)
- Faithful HTML5 port of jabtunes.com as archived on 15 Jan 2010: landing page, "Peek" bubble and fancybox popup, then the Flash stage
- Uses the assets pulled out of `3Dpiano.swf` and `peek.swf` (decompiled with JPEXS, kept in [jabtunes/](jabtunes/)): 26 pre-rendered JPEG frames swapped per key, 25 embedded 11 kHz MP3 samples, the 25 hand-placed button hit shapes, and the ActionScript, ported line by line (quirks included: one key shown at a time, samples always ring out, no glissando)
- Instrument combo, Undo / Clear notepad and Play replay as in the original; the streamed non-piano instruments were never archived, so they fall back to General MIDI patches
- `?peek` opens the stage alone, `?peek&fit` scales it to the window, `&hits` outlines the hit areas

1 Oct 2026

[Experiment #025 - Notation 3D](025_notation_3d.html)
- 3D sheet-music player inspired by "Note Bounce": extruded SMuFL notation, bouncing balls land on every onset
- Engraving by [nwc-viewer](../nwc-viewer/) (interpreter + scroll-layout typesetter), loaded from `../nwc-viewer/` (override with `?nwc=<url>`)
- Canvas2D → three.js bridge: nwc-viewer draws into a recording context; glyphs become InstancedMeshes, beams/stems/staff lines are extruded
- Own MIDI → notation builder (grand-staff split, onset-clipped durations, running accidentals, key detection, piano reduction)
- Loads MIDI, NWC and MusicXML; audio via soundfont-engine + MidiScheduler
- Views: tilted, flat, tabletop, low angle, free orbit · night ink / paper themes · bloom, ripples, particles, trails, shadows
- Layouts: single endless line, wrapped sheet, or Letter pages on a desk (nwc-viewer wrap/page modes) with a whole-page view and pan/crossfade/cut line changes
- Needs a server rooted at the parent folder locally, e.g. `cd .. && python3 -m http.server`

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
