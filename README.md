Midi Visualization Experiments

Browser experiments with MIDI, piano and violin rendering, synthesis and audio analysis. How each one works, with numbers, sources and tests, is in the [changelog](CHANGELOG.md).

[MidiViz Piano](midiviz_piano.html) - Main player with sepia theme UI

## Audio analysis

- [#042 AugmentedNet](042_augmentednet.html) - a trained Roman numeral network (ISMIR 2021) on onnxruntime-web, alongside #041 ([details](CHANGELOG.md#20-oct-2026))
- [#041 Harmony](041_harmony.html) - chords, Roman numerals, cadences and keys of a MIDI file, live ([details](CHANGELOG.md#20-oct-2026))
- [#040 Rhythm](040_rhythm.html) - beats, tempo, meter and swing from the microphone ([details](CHANGELOG.md#20-oct-2026))
- [#039 Tuner](039_tuner.html) - fast, accurate chromatic and string tuner; installable, works offline ([details](CHANGELOG.md#20-oct-2026))
- [#036 Transcription on ONNX](036_onnx_transcription.html) - audio → MIDI with Basic Pitch and Transkun on onnxruntime-web ([details](CHANGELOG.md#17-oct-2026))
- [#035 Basic Pitch](035_basic_pitch.html) - audio → MIDI with Spotify's Basic Pitch on TensorFlow.js, live from the mic ([details](CHANGELOG.md#17-oct-2026))

## Pianist and piano

- [#045 Path-traced Pianist](045_pathtracer.html) - #032 path traced: three-gpu-pathtracer and MuTracer, stills and video, against the page's own picture ([notes](pathtrace/README.md), [details](CHANGELOG.md#21-oct-2026))
- [#032 Pianist](032_pianist.html) - a pianist at a concert grand playing any MIDI file, filmed by an automatic director; [character notes](pianist/README.md), [liner notes](liner/README.md) ([details](CHANGELOG.md#19-oct-2026)) and [YouTube Shorts](pianist/README.md#youtube-shorts) ([details](CHANGELOG.md#20-oct-2026))
- [#031 RoboPianist vs #029](031_robopianist.html) - MuJoCo Shadow Hands: their RL policy against our fingering ([details](CHANGELOG.md#15-oct-2026))
- [#030 Concert Stage](030_concert_stage.html) - the grand on a spotlit stage, pianist hands, lesson mode, hall reverb, MP4 export ([details](CHANGELOG.md#15-oct-2026))
- [#029 Piano Fingering](029_piano_fingering.html) - automatic fingering from MIDI, shown as hands ([details](CHANGELOG.md#15-oct-2026))
- [#028 Grand Piano](028_grand_piano.html) - a physically based concert grand built in code ([details](CHANGELOG.md#14-oct-2026))
- [#027 JabTunes Reimagined](027_jabtunes_reimagined.html) - the 2009 JabTunes piano in three.js ([details](CHANGELOG.md#13-oct-2026))
- [#026 JabTunes (recovered)](026_jabtunes_recovered.html) - an HTML5 port of jabtunes.com as archived in 2010 ([details](CHANGELOG.md#13-oct-2026))
- [#025 Notation 3D](025_notation_3d.html) - 3D sheet music with bouncing balls ([details](CHANGELOG.md#1-oct-2026))

## Violin and strings

- [#038 Duo](038_duo.html) - the violinist and the pianist on one stage ([details](CHANGELOG.md#18-oct-2026))
- [#037 Violinist](037_violinist.html) - an anime-style violinist playing the solo part of a violin MIDI ([details](CHANGELOG.md#18-oct-2026))
- [#034 Violin Sound Lab](034_violin_sound.html) - six violin engines to compare by ear, from physical models to samples ([details](CHANGELOG.md#17-oct-2026))
- [#033 Violin & Viola Fingering](033_violin_fingering.html) - automatic fingering for violin, viola, cello and double bass ([details](CHANGELOG.md#16-oct-2026))
- Research: [violin sound in the browser](strings/research/03_violin_sound.md), [commercial modelled violins](strings/research/05_commercial_violins.md), [audio → MIDI](transcription/research/01_audio_to_midi.md)

## Synthesia-style players and synths

- [#024 Minimal UI](024_minimal_ui.html) - the MidiViz player with a minimal interface
- [#023 Background Playback](023_synthesia_background.html) - AudioWorklet MIDI clock, keeps playing in background tabs ([details](CHANGELOG.md#5-jan-2026))
- [#022 Multi-Synth](022_synthesia_multi_synth.html) - switch between OxiSynth, SpessaSynth and FluidWeb while playing ([details](CHANGELOG.md#3-jan-2026))
- [#021 OxiSynth SF3](021_synthesia_oxisynth_sf3.html), [#020 SpessaSynth](020_synthesia_spessasynth.html), [#019 OxiSynth Worker](019_synthesia_oxisynth_worker.html), [#018 OxiSynth](018_synthesia_oxisynth.html) - WASM soundfont synths ([details](CHANGELOG.md#3-jan-2026))
- [#017 FluidWeb](017_synthesia_fluidweb.html) - RustySynth WASM with SF2 soundfonts ([details](CHANGELOG.md#2-jan-2025))
- [#016 Three.js](016_synthesia_threejs.html), [#015 WebGL](015_synthesia_webgl.html), [#014 Synthesia](014_synthesia.html) - falling notes over an 88-key piano ([details](CHANGELOG.md#27-dec-2024))
- [#013 Physical Model](013_physical_model.html) - MIDI playback with our own piano synthesis ([details](CHANGELOG.md#27-dec-2024))

## Early visualizations

- [#012 Merry Spiral](012_merry_spiral.html), [#011 Sucking star](011_sucking_star.html), [#010 Fountain rain](010_fountain_rain.html), [#009 Lighted piano roll](009_piano_lights.html) ([details](CHANGELOG.md#26-jan-2021))
- [#008 Spiral path](008_spiral_path.html) ([details](CHANGELOG.md#4-feb-2018)), [#007 Spiral](007_spiral.html) ([details](CHANGELOG.md#23-jan-2018)), [#006 Hammers](006_hammers.html), [#005 Keyboard](005_keyboard.html), [#004 SoundFont](004_soundfont.html) ([details](CHANGELOG.md#21-jan-2018))
- [#003 Balls with controls](003_ballsy.html), [#002 Balls](002_balls.html), [#001 Piano Roll](001_basic_piano_roll.html) ([details](CHANGELOG.md#20-jan-2018))

## Tools and tests

- [WebMscore](webmscore.html) - MuseScore's renderer (libmscore in WebAssembly): load scores, export SVG / PDF / MIDI ([details](CHANGELOG.md#15-mar-2026))
- [SF3 to SF2 Converter](test_sf3_to_sf2.html), [FluidWeb Piano Test](fluidweb/fluidweb_piano_test.html), [FluidWeb Piano (ScriptProcessor)](fluidweb/fluidweb_piano_scriptprocessor.html), [FluidWeb Test](fluidweb/fluidweb_test.html), [Audio Test](audio_test.html), [Piano Test](piano_test.html)

More ideas
- using lines
- fountain rain
- tonejs
- note/color buckets
