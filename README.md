Midi Visualization Experiments

[MidiViz Piano](midiviz_piano.html) - Main player with sepia theme UI

[WebMscore](webmscore.html) - MuseScore reference renderer (libmscore via WebAssembly)

17 Oct 2026

[Experiment #036 - Audio → MIDI on ONNX Runtime Web](036_onnx_transcription.html)
- Spotify's Basic Pitch with no TensorFlow: the ICASSP 2022 model as ONNX ([transcription/onnx/basic-pitch-nmp.onnx](transcription/onnx/basic-pitch-nmp.onnx), 230 KB, Apache-2.0) on onnxruntime-web 1.30 (WASM, or WebGPU) in a module worker
- [transcription/onnx/basic-pitch.js](transcription/onnx/basic-pitch.js): windowing, unwrapping, note creation (onsets, inferred onsets, melodia pass, frequency limits) and pitch bends on flat Float32Arrays, ported from the Python reference; activations match the tfjs package to 8e-5 and the notes are identical
- About 80 ms per 2 s window on one WASM thread (≈20× real time); multithreading needs COOP/COEP headers
- Sources: audio files, microphone recording, Live mode (streams the mic window by window, ≈1.7 s behind), and synthetic test audio rendered from the test phrase or a MIDI file, scored against the true notes (mir_eval-style F1, ±50 ms onsets, with and without offsets)
- Piano roll over the note / onset / contour activations, matched / missed / extra notes, pitch-bend lines; threshold sliders re-decode instantly; plays the audio and the transcription (soundfont) together; MIDI and 22 kHz WAV export
- Tests: `node --test transcription/onnx/test/basic-pitch.test.js` (10; the 2 end-to-end tests need onnxruntime-web, see the file)

[Experiment #035 - Basic Pitch Playground](035_basic_pitch.html)
- Audio → MIDI with Spotify's Basic Pitch on TensorFlow.js: the 0.9 MB tfjs model from `@spotify/basic-pitch` 1.0.1 (Apache-2.0, vendored in [transcription/vendor/basic-pitch/](transcription/vendor/basic-pitch/)) in a module worker, WebGL / WebGPU / WASM / CPU backends
- Sources: audio files (open or drop), microphone and another tab's audio live, and demo MIDIs rendered offline with the soundfont (as written or forced to one GM instrument) and scored against the MIDI
- Live: complete 2 s windows are committed (~1 s behind) and a "peek" re-runs the unfinished window on what has arrived, so notes show ~0.2–0.5 s behind; stopping keeps the take for playback and export
- Frame / onset / contour heatmap under the notes; threshold, min length, tolerance, range, infer-onsets and melodia sliders re-decode instantly; reference MIDI scoring (onset and onset+offset P / R / F1, ±50 ms) with an offset slider
- [transcription/basic-pitch.js](transcription/basic-pitch.js): the library's windowing (identical rows, tested), a streaming transcriber, and a linear-time port of the library's note decoder (its melodia pass is quadratic, 40 s for 3 minutes of audio; output identical, tested)
- Original and resynthesized notes play in sync (split L / R), echo notes while live; MIDI export (optionally one channel per note with pitch bends) and the 22.05 kHz WAV the model heard
- Tests: `node --test transcription/test/basic-pitch.test.js` (9; the 2 model tests need `BP_TFJS`, see the file)

[Experiment #034 - Violin Sound Lab](034_violin_sound.html)
- One performance, five engines to compare by ear (keys 1–5 switch while playing, same spot): bowed digital waveguide, Helmholtz source-filter, Magenta's DDSP violin, VSCO 2 CE samples (CC0), and the GM soundfont #033 uses ([research brief](strings/research/03_violin_sound.md))
- Performance renderer [strings/sound/performance.js](strings/sound/performance.js): the #033 fingering and bow strokes become per-string curves at 250 Hz: pitch with late-starting vibrato (none on open strings) and slides on shifts, bow speed with attacks, bow changes and phrase arches, bow force kept inside Schelleng's playable window, contact point, finger lifts and taps, and loudness for DDSP
- Physical models [strings/sound/bowed.js](strings/sound/bowed.js) in an AudioWorklet: four waveguide strings with stick-slip friction coupled at the bridge (sympathetic open strings), a modal violin / viola / cello body, a tone EQ fitted to the VSCO recordings (`node strings/test/fit_tone.js`); real time, plays MIDI keyboard and computer-keyboard notes
- DDSP [strings/sound/ddsp.js](strings/sound/ddsp.js): the magenta.js violin checkpoint's decoder runs on TensorFlow.js in a worker, its harmonic + noise synthesizer is reimplemented in JS (same output, 9× faster on CPU); 5 s windows rendered ahead of the playhead, a second pass for double stops
- Expression sliders (vibrato, slides, dynamics, phrasing, bow speed, pressure, contact), the #030 hall reverb, WAV export of each engine
- Tests: `node --test strings/test/sound.test.js` (9: Helmholtz motion and intonation over the range, stability, vibrato, slides, bowing, DDSP synthesis, real-time speed)

[Research - Violin sound in the browser](strings/research/03_violin_sound.md)
- Samples, physical modelling (waveguide, SWAM), DDSP / MIDI-DDSP, RAVE / BRAVE, MIDI-to-audio diffusion (VIOLET, ViolinDiff), Suno-style and open text-to-music models (MusicGen, Stable Audio, ACE-Step, Magenta RealTime 2)

[Research - Audio → MIDI / MusicXML](transcription/research/01_audio_to_midi.md)
- Options for transcribing audio in the browser: Basic Pitch, MuScriptor, the MT3 family, piano models (Transkun, Kong, Aria-AMT), streaming / low-latency piano, monophonic pitch (SwiftF0, PESTO), source separation, performance MIDI → score, and the runtimes (onnxruntime-web, Transformers.js, tfjs, ggml)

16 Oct 2026

[Experiment #033 - Violin & Viola Fingering](033_violin_fingering.html)
- Automatic fingering for violin, viola, cello and double bass (string, position and finger for every note, double stops and chords on adjacent strings; the bass with Simandl's 1-2-4, the 4→3 switch at the crook of the neck and thumb position, [research](strings/research/04_double_bass.md)), from exercises, MIDI tracks, typed notes, TNUA files, a MIDI keyboard or clicks on the fingerboard
- Research briefs: [what violinists do](strings/research/01_violinist_rules.md) (positions and finger patterns, shifting, string choice, open strings, Galamian / Flesch / Cooper scale fingerings, double stops, viola vs violin) and [published algorithms](strings/research/02_algorithms.md) (Sayegh, Maezawa, Nagata's HMM, the TNUA dataset and models, guitar tablature, bowing physics, violinist motion)
- Engine [strings/fingering.js](strings/fingering.js): time-aware Viterbi over hand-frame states, with distances from the fret formula (so the viola's longer string makes stretches harder); scale-book templates for long runs; styles beginner / standard / expressive / fewest shifts; hand size; `/A` string locks
- Tuned on the [TNUA dataset](https://github.com/Tsung-Ping/Violin-Fingering-Generation) (10 violinists): 64.5 % string + finger agreement (62.5 % held out, 57.1 % before tuning; violinists agree with each other 89.8 %); textbook exercises 19/23, three-octave scales 4/5 ([notes](strings/README.md))
- 3D: procedural violin / viola / cello / double bass (the cello and bass upright on the end pin, the bass with sloping shoulders; arched plates, f-holes, scroll, bridge, strings that press to the fingerboard and blur while sounding) with the bow; left hand on the #029 finger IK with shifts, fingers kept down and vibrato; bow strokes, slurs, retakes and string crossings
- 2D: scrolling string tablature (finger colours, position changes, shifts, red marks where the result differs from the book or the violinist) above a fingerboard map
- Tests: `node --test strings/test/fingering.test.js` (17), `node strings/test/bench.js`, `node strings/test/tnua.js [--tune]`

15 Oct 2026

[Experiment #031 - RoboPianist vs #029](031_robopianist.html)
- [RoboPianist](https://kzakka.com/robopianist/)'s MuJoCo piano and two Shadow Hands in the browser (mujoco_wasm, scene and recorded RL actions from their demo, Apache-2.0), side by side: their per-song DroQ policy replayed vs our #029 fingering + motion driving the same hands through a damped-least-squares IK
- Scored with RoboPianist's own frame F1: Twinkle 89.1 (RL) vs 86.5 (ours), Nocturne 84.0 vs 57.1; ours needs no training and plays any MIDI ([notes](robopianist/README.md))
- Shadow Hand span table for the fingering engine (`spanTable` option), measured with the IK; closed-loop pressing, servo feed-forward, active-set joint limits
- `node robopianist/eval.js [--human] [file.mid…]` runs the comparison headless

[Experiment #029 - Piano Fingering](029_piano_fingering.html)
- Automatic fingering from MIDI, typed notes, PIG files or a live MIDI keyboard, shown as simulated hands on the #028 grand (3D) and as a finger-coloured falling-note roll with hands seen from above (2D)
- Research briefs: [what pianists do](fingering/research/01_pianist_rules.md) (treatises from Couperin to Fraser, scale/arpeggio/chromatic tables, octaves, trills, repeated notes, spans, hand size) and [published algorithms](fingering/research/02_algorithms.md) (Parncutt 1997, Jacobs 2001, Al Kasimi 2007, Balliauw, Nakamura's HMMs and the PIG dataset, neural models, RoboPianist / FürElise hand motion)
- Engine [fingering/fingering.js](fingering/fingering.js): hand split by beam search, then per hand a beam search over hand configurations (chords and held keys included), Parncutt/Jacobs costs with time awareness, leaps, repeated-note rotation, pattern consistency; the LH is solved as a mirrored RH. Whole pieces in 0.1–0.4 s
- Motion [fingering/motion.js](fingering/motion.js) and hands [fingering/hands3d.js](fingering/hands3d.js): fingertip trajectories with lift, approach and thumb-under, a gliding hand anchor, exact coupled-joint finger IK
- Scale and chromatic templates [fingering/templates.js](fingering/templates.js): runs that fit a major / minor scale or the chromatic scale are pulled toward the standard fingering (soft cost, so the ergonomic model can still override it)
- Tests: `node --test fingering/test/fingering.test.js` (43 tests: Parncutt's published rule points, textbook exercises, all 24 scales and the chromatic scale from every note in both hands, 3-octave scales, hand split, real pieces, PIG metrics); `node fingering/test/bench.js` scores the exercise suite (15/15 patterns and 48/48 scales exact; the published Parncutt model: 7/15, 14/48), `test/tune.js` tunes the weights
- PIG evaluation: `node fingering/test/pig.js <PianoFingeringDataset folder> [--split] [--verbose] [--tune]` reports M_gen / M_high / M_soft / M_rec on the 30-piece test set next to the published HMM results (the dataset is non-commercial and not redistributable: keep it outside the repo or in the git-ignored `fingering/data/`)
- Model switch (ours / published Parncutt), hand size, dashed red marks where it differs from the textbook, Export PIG

[Experiment #030 - Concert Stage](030_concert_stage.html)
- The #028 grand restaged after [Concert Creator](https://www.concertcreator.ai/)'s renders: black stage, one warm spotlight with dust in the beam, a back light rimming the case, and a warm bounce from the open lid onto the plate
- Piano forked to [concertstage/concert-grand.js](concertstage/concert-grand.js): mirror fallboard (planar reflection of the keys), red key felt, three staggered rows of coiled tuning pins on red felt, agraffes, capo bar, red stringing braid, hammered bronze-gold plate, orange-peel lacquer
- Songs: the full MidiViz player list (playback_controls.js: selections, classical, symphonic, modern, video games) with a filter, or any MIDI file
- Their UI layout: Songs / Camera / Visuals / Render pills and a bottom transport (speed, play, loop, ms clock); chrome fades out while a song plays
- Cameras from their menu: Top, First Person, Orbit, View 1–4, plus the cinematic tour from #028 (optionally synced to the song); First Person works in both modes; the fixed views glance a little toward where the hands are playing, with a slow wander
- Lesson mode: keyboard only, falling notes in left / right hand colours with L / R (or finger number) labels, glowing keys, halos and sparks; hands from a quick split, refined by `fingering/` when present
- Pianist hands like Concert Creator's avatars ([concertstage/avatar-hands.js](concertstage/avatar-hands.js)): one skinned mesh per hand (palm, thenar pad, tapered fingers with knuckles and nails, wrist, white shirt cuff, dark jacket sleeve fading toward the shoulder) on 18 bones; fingers follow the #029 fingering and motion model with its finger IK, arms are two-bone IK from a seated shoulder
- Depth of field that keeps the hands sharp (picks the hand nearer the middle of the frame or the busier one, no focus pull for single notes), bloom, film grain, vignette and a slight handheld drift; fully procedural lighting (no HDRI downloads)
- Render → offline MP4 export (any resolution, 30/60 fps, with audio) via notation3d/video-export.js
- Hall acoustics ([concertstage/acoustics.js](concertstage/acoustics.js), [hall-reverb.js](concertstage/hall-reverb.js)): master volume (to 200%, with a limiter) and a room boost (±12 dB of reverb, ambience and applause against the piano); a stereo FDN reverb with early reflections in an AudioWorklet after the synth; rooms from studio to cathedral, seats from the bench to the balcony (direct/reverberant balance and air absorption), reverb / decay / tone, hall ambience, applause at the end of a song. The MP4 export runs the same DSP
- Share: the address bar holds every setting (stage, piano, colours, effects, sound, hall, render options, mode, camera view or free camera, speed, loop, song) and Share copies it with the song position; a shared song starts on the first click

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
