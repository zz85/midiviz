Midi Visualization Experiments

[MidiViz Piano](midiviz_piano.html) - Main player with sepia theme UI

[WebMscore](webmscore.html) - MuseScore reference renderer (libmscore via WebAssembly)

19 Oct 2026

[Liner notes](liner/README.md) for [#032 Pianist](032_pianist.html)
- X-Ray-style notes on a piece, written in Markdown and tied to bars (`m22`, `m22.3`), placed with the MIDI file's own time signatures and tempo map: captions while it plays (history, analysis, trivia, things to listen for), a notes panel (I: now / about / all notes / people and terms), sections on the seek bar, and a card when hovering a song
- First piece: Bach's Prelude in C, BWV 846 (`Prelude1.mid`), 6 sections, 18 notes with sources, 5 cards (Bach, the Well-Tempered Clavier, pedal point, diminished seventh, the Bach–Gounod Ave Maria)
- Intertitles: a few short lines marked for the screen (`screen: Paris, 1853 | Gounod will sing…` on a note, or a `# Intertitles` part), in cinematic type (Cormorant Garamond / Cinzel / Montserrat, letter-spaced kickers), faded in and out by the song clock with room to read; everything else stays in the panel. Or every note as a caption, or nothing
- Intertitle look: black and white by default (all white, black on light, warm gold), placed automatically away from the pianist or in a chosen corner, headings optional; the song title as an intertitle or the classic title card (off by default)
- Second piece: Beethoven's Moonlight Sonata, III. Presto agitato (`midis/mond_3.mid`), 8 sections, 24 notes, 11 intertitles (7 stories, 4 about the music), 6 new cards; `play:` maps score bars to a file that writes out the exposition repeat (`m21'` is the second time) and spreads the cadenza over four bars
- Video export: the same burned into the picture, and saved next to the MP4 as two YouTube subtitle tracks (the intertitles, and every note) and chapters, timed to the video
- Stories and analysis apart: history and trivia float (`aside:` / `## ~`), placed by a seeded generator, one every 20–30 s through the opening, then spread out; lines about the music are pinned and come when the passage they describe ends (`m188-m190`), in their own style (spaced Montserrat); the song title is off by default
- Tests: `node --test liner/test/liner.test.js` (14)

Pedal and transport fixes
- OxiSynth itself sustains correctly (CC64 ≥ 64, per channel); the players lost pedal changes. Late CCs are now always sent (a skipped one left the pedal stuck), a seek restores each channel's pedals, modulation and expression as the song has them there, and unloading a song lifts its pedals. In `playback_controls.js` / `midi_clock_worklet.js` (#014–#024) and soundfont-engine's `MidiScheduler` (#025–#038)
- #023: resume after pause continued from 0 (every play reloaded the song into the clock worklet); it now keeps its position, and a seek while paused sticks
- Tests: `node --test test/playback.test.js soundfont-engine/test/scheduler.test.js` (11)

18 Oct 2026

[Experiment #038 - Duo](038_duo.html)
- The #037 violinist and the #032 VRoid pianist in her concert dress on one stage: he plays the violin part, she plays everything else on the #030 grand (fingered by `fingering/`, pedal from CC64)
- Violin sonatas (Bach, Handel, Mozart, Beethoven Op. 30 No. 2 and the Kreutzer), Gounod's Ave Maria, and three concertos with the orchestra on the piano
- An auto camera that plans the piece's takes in advance and follows the busier player, plus ten fixed views; menus for his model and outfit, her dress, the room and the ink outline ([notes](violinist/README.md#038-duo-038_duohtml))

[Experiment #037 - Violinist](037_violinist.html)
- An anime-style violinist (VRoid CC0 VRMs, cel shaded, Nodame Cantabile-like stage lighting) plays the solo part of a violin MIDI; the rest plays as accompaniment
- 48 Mutopia MIDIs: all of Bach's Sonatas & Partitas BWV 1001–1006, sonatas (Bach, Handel, Mozart, Beethoven Kreutzer), concertos (Bach, Vivaldi, Beethoven, Tchaikovsky), Paganini caprices ([list and credits](violinist/midis/README.md))
- Rig [violinist/rig.js](violinist/rig.js): the #033 fingering, left hand and bow drive the body (violin hold from motion-capture angles, two-bone arm and leg IK, per-finger IK, sway, breath, head on the chin rest) ([notes](violinist/README.md))
- Research: [biomechanics](violinist/research/01_violinist_biomechanics.md), [character and look](violinist/research/02_character_look.md)

17 Oct 2026

[Experiment #036 - Transcription models on ONNX Runtime Web](036_onnx_transcription.html)
- A playground for audio → MIDI models exported to ONNX and run with onnxruntime-web 1.30 (WASM or WebGPU) in a module worker, no TensorFlow; switch models (keys 1 / 2) on the same source and compare them in a table (notes, onset F1, onset+offset F1, time, × real time)
- Basic Pitch (Spotify, ICASSP 2022, 230 KB, Apache-2.0): [transcription/onnx/basic-pitch.js](transcription/onnx/basic-pitch.js) ports the windowing, note creation and pitch bends (activations match the tfjs package to 8e-5, identical notes); threshold sliders re-decode instantly; Live mode streams the mic (≈1.7 s behind)
- Transkun v2 (Yan & Duan, ISMIR 2024, MIT): piano notes with velocity plus sustain and soft pedal. The network is exported by [transcription/onnx/tools/export_transkun.py](transcription/onnx/tools/export_transkun.py) as two graphs (55 MB: interval scores + velocity / onset / offset head); [transcription/onnx/transkun.js](transcription/onnx/transkun.js) does the rest in JS: the 6-window FFT / mel front end, the semi-CRF Viterbi, and the 16 s segment stitching. Same notes as the Python package (61/61 within 5 ms, velocity ±1)
- Chopin's Minute Waltz (45 s, soundfont render): Transkun F1 98.7 (with offsets 67.8) vs Basic Pitch 78.5 (17.1); Transkun runs at 1.9× real time on 8 WASM threads, Basic Pitch at ≈100×
- [coi-sw.js](coi-sw.js): a service worker scoped to this page adds COOP / COEP, so WASM gets threads on GitHub Pages and `serve.sh` (`?coi=0` turns it off)
- Sources: audio files, microphone recording, Live (Basic Pitch), and test MIDIs rendered with the soundfont (OxiSynth, pedal included) or simple synthetic tones, scored against the true notes (mir_eval-style, ±50 ms onsets); piano roll over Basic Pitch's activations, pedal lane, plays the audio and the transcription (with pedal) together; MIDI (with CC 64 / 67) and WAV export
- Tests: `node --test transcription/onnx/test/*.test.js` (15; the 3 end-to-end tests need onnxruntime-web, see the files)

[Experiment #035 - Basic Pitch Playground](035_basic_pitch.html)
- Audio → MIDI with Spotify's Basic Pitch on TensorFlow.js: the 0.9 MB tfjs model from `@spotify/basic-pitch` 1.0.1 (Apache-2.0, vendored in [transcription/vendor/basic-pitch/](transcription/vendor/basic-pitch/)) in a module worker, WebGL / WebGPU / WASM / CPU backends
- Sources: audio files (open or drop), microphone and another tab's audio live, and demo MIDIs rendered offline with the soundfont (as written or forced to one GM instrument) and scored against the MIDI
- Live: complete 2 s windows are committed (~1 s behind) and a "peek" re-runs the unfinished window on what has arrived, so notes show ~0.2–0.5 s behind; stopping keeps the take for playback and export
- Frame / onset / contour heatmap under the notes; threshold, min length, tolerance, range, infer-onsets and melodia sliders re-decode instantly; reference MIDI scoring (onset and onset+offset P / R / F1, ±50 ms) with an offset slider
- [transcription/basic-pitch.js](transcription/basic-pitch.js): the library's windowing (identical rows, tested), a streaming transcriber, and a linear-time port of the library's note decoder (its melodia pass is quadratic, 40 s for 3 minutes of audio; output identical, tested)
- Original and resynthesized notes play in sync (split L / R), echo notes while live; MIDI export (optionally one channel per note with pitch bends) and the 22.05 kHz WAV the model heard
- Tests: `node --test transcription/test/basic-pitch.test.js` (9; the 2 model tests need `BP_TFJS`, see the file)

[Experiment #034 - Violin Sound Lab](034_violin_sound.html)
- One performance, six engines to compare by ear (keys 1–6 switch while playing, same spot): bowed digital waveguide, Helmholtz source-filter, Magenta's DDSP violin, VSCO 2 CE samples (CC0), the GM soundfont #033 uses, and a hybrid sampler ([research brief](strings/research/03_violin_sound.md))
- Performance renderer [strings/sound/performance.js](strings/sound/performance.js): the #033 fingering and bow strokes become per-string curves at 250 Hz: pitch with late-starting vibrato (none on open strings) and slides on shifts, bow speed with attacks, bow changes and phrase arches, bow force kept inside Schelleng's playable window, contact point, finger lifts and taps, and loudness for DDSP
- Physical models [strings/sound/bowed.js](strings/sound/bowed.js) in an AudioWorklet: four waveguide strings with stick-slip friction coupled at the bridge (sympathetic open strings), a modal violin / viola / cello body, a tone EQ fitted to the VSCO recordings (`node strings/test/fit_tone.js`); real time, plays MIDI keyboard and computer-keyboard notes
- DDSP [strings/sound/ddsp.js](strings/sound/ddsp.js): the magenta.js violin checkpoint's decoder runs on TensorFlow.js in a worker, its harmonic + noise synthesizer is reimplemented in JS (same output, 9× faster on CPU); 5 s windows rendered ahead of the playhead, a second pass for double stops
- Expression sliders (vibrato, slides, dynamics, phrasing, bow speed, pressure, contact), the #030 hall reverb, WAV export of each engine; presets (Default / Clean / Expressive / Student / Baroque / Romantic, which also pick the fingering style) and Reset
- Humanization for all five engines after Embertone's "Intuition" ([strings/sound/humanize.js](strings/sound/humanize.js)): a few ms of timing, per-note dynamics and bow variance, stopped notes landing a few cents off and settling (live notes too), round-robin samples; Timing / Intonation / Variance sliders and New take
- Hybrid sampler, engine 6 ([strings/sound/hybrid.js](strings/sound/hybrid.js)), after Embertone's Joshua Bell Violin: University of Iowa non-vibrato samples recorded on each string (violin, viola, cello; pp / mf / ff; 8–12 MB of Opus per instrument), played on the string #033 chose and read along our f0 curve (vibrato, slides, attack error) and loudness curve (layers crossfaded in phase); recorded attacks spliced short for detached notes, bow-change starts for connected ones, no new attack inside slurs (the old sample glides into the new one), looped sustain, the recorded release when the bow leaves; rendered progressively in JS (30–70× real time), live notes too. Bank builder: `node strings/test/build_iowa.js --instrument=violin`
- Measured body for the physical models ([strings/test/fit_body.js](strings/test/fit_body.js), [strings/sound/body.js](strings/sound/body.js)): estimated from the Iowa recordings by comparing every recorded harmonic with the same harmonic of our string (4,500–7,200 harmonics per instrument), played as a 4,096-tap minimum-phase FIR by partitioned FFT convolution; on held-out notes 1.5–2 dB closer to the recordings per harmonic (median) and 4–7 dB at the 90th percentile than the synthetic modal body; Body: Measured (Iowa) / Measured (Philharmonia) / Measured (NBody) / Modal in the Timbre panel; Philharmonia is a second set of real violin, viola and cello bodies fitted from the Philharmonia Orchestra samples (vibrato frames as the sweep; `node strings/test/fit_body_philharmonia.js`, samples git-ignored, curves committed); NBody is Cook and Trueman's hammer-measured violin (Princeton, 1998) used as an impulse response, built locally by `node strings/test/build_nbody.js` (no licence, so git-ignored)
- Automatic bowing after SWAM Violin 3 (Bowing panel): an Expression lane from the track's CC11 / CC7 hairpins / CC2 moves bow speed, pressure and contact together (Mozart K379 and the Kreutzer write their dynamics only as CC7), interactive bow pressure in the waveguide (slips counted per period, a 25 ms force kick out of double slipping: Helmholtz on 359 of 369 test notes instead of 343), SWAM's play modes (bow start, keep bow direction, bow lift off / on string, mono cross-string muting, tremolo slow / fast / tempo-synced, harmonics 2 / 3 / 4 with the touch modelled in the waveguide), sordino, rosin and string resonance; live CC11 / CC2 expression, CC1 vibrato and pitch bend from a MIDI keyboard
- Loudness matched across the six engines ([strings/test/loudness.mjs](strings/test/loudness.mjs)): none is normalised per piece any more (GM, Samples and Hybrid were, so a quiet piece came out as loud as a loud one, live notes differed from the render, and on Bach's Adagio the engines spanned 13 dB); each plays at a fixed level trimmed to the Hybrid at mezzo-forte (K-weighted loudness, ITU-R BS.1770): a test performance within 1.2 dB, four songs within 3–4 dB (piece-dependent: chords, soft short notes). The GM soundfont's velocity curve (16–19 dB from p to f) is bent to 9–11 dB like the others, and DDSP's flat 5 dB response expanded to 9; the physical models with a measured body no longer lose 9–13 dB at the top of the E string (level-by-pitch voicing fitted to the Iowa recordings on the same string, [strings/test/fit_level.js](strings/test/fit_level.js))
- Articulation planner ([strings/articulation.js](strings/articulation.js)) and score input ([strings/score.js](strings/score.js)): Open… takes MusicXML / .mxl (MuseScore, Finale, Sibelius, Dorico) with their slurs, staccato, bowings and ties; MIDI performances are read as SWAM does (overlap slurs, gaps re-bow); score-export MIDIs, where every note touches, get slurs inferred from the music (by step, short, in beat groups). On the Bach Violin Dataset's editions of BWV 1001–1006 the inference agrees on 68 % of note pairs (slurred F1 50 %), the old fixed rule 60 % (F1 39 %); Articulation: Auto / Inferred / Fixed rule in the Bowing panel ([research](strings/research/06_articulation.md)); stroke types (spiccato bounced off the string, martelé pinched and stopped), repeats and dots under a slur played in one bow with a louré / portato pulse (4–5 / 8–9 dB) or re-bowed (Repeats in slurs, Portato slider), and slides from the plan (a score's slide marks, a performance's quiet overlaps, about one slow legato leap in 6 s), kept on one string by the fingering
- Auto bowing (Expression block): inside every note the contact point and bow force keep moving as a violinist's do (toward the bridge as a long note swells, lighter toward the tip, slow wander), shown on live Bow pressure / Bow position meters; and bow-force brightness, a tilt per string that follows the force, fitted per instrument to the Philharmonia pp → ff brightening (violin 521 cents; our strings had 15–80, the sawtooth-like same tone at every dynamic; `node strings/test/fit_tilt.js`)
- Fitted to real violinists ([strings/test/perf_stats.js](strings/test/perf_stats.js), Bach Violin Dataset: four violinists, 401 sustained notes): vibrato on 68 % of notes (players 67 %), 6.45 Hz (6.55), ±13 cents (±13), from the start of the note (was a late bloom at 0.3 s), notes swelling 1.3 dB (1.6); A/B against Ko Donghwi's Bach ([strings/test/ab_recording.js](strings/test/ab_recording.js)); Source + Philharmonia, closest by ear, is the page's default
- Tests: `node --test strings/test/sound.test.js` (23: Helmholtz motion and intonation over the range, stability, vibrato, slides, bowing, DDSP synthesis, real-time speed, humanization, hybrid pitch, sustain, dynamics, legato and speed, interactive bow pressure, expression lane, play modes, harmonics, tremolo, oversampling, measured body, impulse-response body, Philharmonia body; the hybrid tests need ffmpeg)

[Research - Violin sound in the browser](strings/research/03_violin_sound.md)
- Samples, physical modelling (waveguide, SWAM), DDSP / MIDI-DDSP, RAVE / BRAVE, MIDI-to-audio diffusion (VIOLET, ViolinDiff), Suno-style and open text-to-music models (MusicGen, Stable Audio, ACE-Step, Magenta RealTime 2)

[Research - How commercial modelled violins get their sound](strings/research/05_commercial_violins.md)
- SWAM Solo Strings (pure physical and behavioural modelling: selectable bodies, interactive bow pressure, modelled player habits), Expressive E Soliste, Sound Magic Violin One, and what #034's physical models lack

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
