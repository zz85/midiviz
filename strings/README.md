# Experiment #033 – Violin & viola fingering

[033_violin_fingering.html](../033_violin_fingering.html) fingers a melody (or double stops and chords) for violin, viola or cello and plays it with a simulated left hand and bow.

## Files

| File | What it does |
|---|---|
| [research/01_violinist_rules.md](research/01_violinist_rules.md) | What violinists and violists do: geometry, positions and finger patterns, shifting, string choice, open strings, scale-book fingerings, double stops, hand size, violin vs viola vs cello, a weighted rule list and 32 test cases |
| [research/02_algorithms.md](research/02_algorithms.md) | Published methods: Sayegh 1989, Maezawa 2012, Nagata 2014, the TNUA dataset and its BLSTM / VAE models, guitar tablature methods, bowing physics and violinist motion, and a recommended design |
| [fingering.js](fingering.js) | The engine. Notes are grouped into events (single notes, double stops, chords). Each event's states are the hand's frame base plus a string and finger per note, with chord notes on adjacent strings. A time-aware Viterbi picks the path. Distances follow the fret formula, so stretches cost more on the longer viola string |
| [templates.js](templates.js) | Scale-book patterns (Galamian, Cooper) for diatonic runs of 15 or more notes. Each run keeps the single pattern that is cheapest for it |
| [motion.js](motion.js) | Turns a fingering into motion: shifts that land just before the note, fingers that stay down, vibrato, bow strokes (direction, slurs, hair position, retakes) and string crossings |
| [violin3d.js](violin3d.js), [hand3d.js](hand3d.js) | A procedural instrument and bow, a left hand driven by #029's finger IK, a bow hand and arms |
| [board2d.js](board2d.js) | A scrolling string tablature above a fingerboard map. Click the map to play a note |
| [tnua.js](tnua.js) | Loader, alignment and scoring for the TNUA violin fingering dataset |

## Tests

- `node --test strings/test/fingering.test.js` runs 15 tests: geometry, physical consistency, textbook patterns, double stops and chords, viola and cello, 3-octave scales, styles, string locks, motion and the TNUA format.
- `node strings/test/bench.js` scores the textbook exercises. Core: 19/23 exact (94.5% of notes). Three-octave scales: 4/5 exact (96.4% of notes).
  - The core misses are cases where the violinists in TNUA disagree with the beginner books. They take open D or open A going down where Schroeder writes 4, and they play D♯ on the G string in 2nd position.

## TNUA evaluation

```
git clone --depth 1 https://github.com/Tsung-Ping/Violin-Fingering-Generation strings/data/TNUA
node strings/test/tnua.js [--verbose] [--human] [--mode=…] [--tune --bench=0.08]
```

The dataset is 10 violinists × 14 excerpts, about 10,900 notes per violinist. It has no licence file, so it stays in the git-ignored `strings/data/`. The engine sees only pitch and timing, and each piece is played at an approximate tempo.

| Fingering | string | finger | string + finger |
|---|---|---|---|
| Hand-set starting weights | 79.3 | 59.7 | 57.1 |
| Tuned, 2-fold cross-validation by piece (held out) | 81.0 | 65.2 | 62.5 |
| Tuned on all pieces (the shipped defaults) | 81.5 | 67.2 | 64.5 |
| One violinist vs the other nine | 96.2 | 90.0 | 89.8 |

- The shipped defaults score 74.7% "soft", meaning the engine agrees with at least one of the 10 violinists on that note.
- The other styles on TNUA: beginner 51.8, expressive 59.4, fewest shifts 59.7.
- Most errors are position choices. The violinists play in 2nd and 3rd position far more than the model does, especially in lyrical passages that they keep on one string.
- A diatonic "finger by note letter" rule with a local key estimate made agreement slightly worse, so it is off by default (`weights.letter`, `weights.posOffKey`).

# Experiment #034 – Violin sound lab

[034_violin_sound.html](../034_violin_sound.html) plays the #033 fingering through five engines. The design follows [research/03_violin_sound.md](research/03_violin_sound.md) §4.

| File | What it does |
|---|---|
| [sound/performance.js](sound/performance.js) | Fingered notes and bow strokes → per-string curves at 250 Hz: f0 (vibrato, slides on shifts, a slow intonation drift), bow velocity, force (kept above the measured Schelleng minimum F ≈ 0.02·(Z/0.3)^1.5·v/β²), contact point β, damping when a finger lifts, finger taps, and loudness (dB) for DDSP |
| [sound/bowed.js](sound/bowed.js) | `WaveguideString` (friction μs 1.2, μd 0.3, v0 0.3, Friedlander hysteresis), `SourceString` (band-limited Helmholtz sawtooth + bow noise), `Body` (signature modes plus 42 bridge-hill modes per ear), `EQ`, `ViolinSynth` (four strings, bridge coupling, voicing), `renderCurves` for offline use |
| [sound/tone.js](sound/tone.js) | Fitted tone EQ and per-pitch voicing. Regenerate with `node strings/test/fit_tone.js [folder]` from the VSCO 2 CE "Arco Vib" violin samples (CC0) in the git-ignored `strings/data/VSCO/`; the long-term spectrum residual is 4.3 dB rms (waveguide) and 3.3 dB (source) in third-octave bands |
| [sound/violin-worklet.js](sound/violin-worklet.js) | The physical models in an AudioWorklet: curve playback with transport, plus live notes |
| [sound/ddsp.js](sound/ddsp.js), [sound/ddsp-worker.js](sound/ddsp-worker.js) | Magenta's DDSP violin: the decoder in TensorFlow.js (worker), the harmonic + filtered-noise synthesis in JS, 5 s windows with 1 s crossfades |
| [sound/engines.js](sound/engines.js) | One transport for all engines (pre-rendered ones play in 1 s blocks as they become ready), the #030 hall reverb, limiter, analyser |

Measured (Node, 48 kHz): sustained notes are in Helmholtz motion in ≥ 85 % of pitches × dynamics for violin, viola and cello, sound within 20 cents, and four strings + body render at about 30× real time. DDSP's 5 s window takes about 9 s on a CPU backend (headless Chromium without a GPU); with WebGL it should be well under a second, not yet measured on a real GPU.
