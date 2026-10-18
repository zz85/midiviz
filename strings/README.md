# Experiment #033 – Violin & viola fingering

[033_violin_fingering.html](../033_violin_fingering.html) fingers a melody (or double stops and chords) for violin, viola or cello and plays it with a simulated left hand and bow.

## Files

| File | What it does |
|---|---|
| [research/01_violinist_rules.md](research/01_violinist_rules.md) | What violinists and violists do: geometry, positions and finger patterns, shifting, string choice, open strings, scale-book fingerings, double stops, hand size, violin vs viola vs cello, a weighted rule list and 32 test cases |
| [research/04_double_bass.md](research/04_double_bass.md) | The double bass: tuning in fourths, Simandl's 1-2-4 and its position names, the 4→3 switch at the crook of the neck, thumb position (Petracchi), the Italian, French, open-hand and Rabbath systems, Morton's shifting rules, posture, and 24 test cases |
| [research/02_algorithms.md](research/02_algorithms.md) | Published methods: Sayegh 1989, Maezawa 2012, Nagata 2014, the TNUA dataset and its BLSTM / VAE models, guitar tablature methods, bowing physics and violinist motion, and a recommended design |
| [fingering.js](fingering.js) | The engine. Notes are grouped into events (single notes, double stops, chords). Each event's states are the hand's frame base plus a string and finger per note, with chord notes on adjacent strings. A time-aware Viterbi picks the path. Distances follow the fret formula, so stretches cost more on the longer viola string |
| [templates.js](templates.js) | Scale-book patterns (Galamian, Cooper) for diatonic runs of 15 or more notes. Each run keeps the single pattern that is cheapest for it |
| [motion.js](motion.js) | Turns a fingering into motion: shifts that land just before the note, fingers that stay down, vibrato, bow strokes (direction, slurs, hair position, retakes) and string crossings |
| [violin3d.js](violin3d.js), [hand3d.js](hand3d.js) | A procedural instrument and bow, a left hand driven by #029's finger IK, a bow hand and arms |
| [board2d.js](board2d.js) | A scrolling string tablature above a fingerboard map. Click the map to play a note |
| [tnua.js](tnua.js) | Loader, alignment and scoring for the TNUA violin fingering dataset |

## Tests

- `node --test strings/test/fingering.test.js` runs 17 tests: geometry, physical consistency, textbook patterns, double stops and chords, viola, cello and double bass, 3-octave scales, styles, string locks, motion and the TNUA format.
- `node strings/test/bench.js` scores the textbook exercises. Core: 29/33 exact (96.2% of notes), including all 10 double-bass cases. Three-octave scales: 4/5 exact (96.4% of notes).
  - The core misses are cases where the violinists in TNUA disagree with the beginner books. They take open D or open A going down where Schroeder writes 4, and they play D♯ on the G string in 2nd position.

## Double bass

The bass needs a frame that changes along the neck (research 04 §7.2), so its frame is a list of entries, each valid over a range of frame bases:

- **Neck (b 1–8):** Simandl's 1-2-4 over a whole tone. Finger 3 moves with 4 and costs extra on its own.
- **Crook (b 9–11):** 3 takes over from 4.
- **Upper neck (b 12–13):** 1-2-3 without the thumb.
- **Thumb position (from the octave):** the thumb is a fifth finger (`T`, finger 5) with Petracchi's frames. A dearer low thumb is allowed from the neck heel.

Other differences from the violin family:

- Shifts are cheap and are measured on a violin-sized string, otherwise every bass shift would cost 3.2 times as much. Position preference is almost flat, open strings are cheaper, and two open strings in a row cost a little (Morton).
- Positions are named the Simandl way (½, I, II, II½, III … VII), with "thumb" above.
- There is no fingering dataset for the bass, so its weights come from the textbook cases only.

## TNUA evaluation

```
node strings/test/tnua.js [--verbose] [--human] [--mode=…] [--tune --bench=0.08]
```

The dataset is 10 violinists × 14 excerpts, about 10,900 notes per violinist. Its CSVs are copied in [tnua/](tnua/) ([source and credits](tnua/README.md)), so the page lists the pieces with a violinist selector and the script runs without a separate clone. The engine sees only pitch and timing, and each piece is played at an approximate tempo.

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
| [sound/humanize.js](sound/humanize.js) | Humanization after Embertone's "Intuition" page, applied to the notes before the curves so every engine plays it: onsets move about 6 ms (less in fast runs; chords together, legato kept), velocity and bow speed / pressure vary per note, a stopped note lands 4–12 cents off (more after a shift, undershooting more often) and settles in 40–120 ms, and a round-robin index per repeated pitch. Seeded: "New take" on the page draws new choices. The physical models and DDSP hear the attack error in f0; the samples bend `playbackRate` and alternate between the two nearest recorded notes; GM puts each note on its own channel and retunes it with RPN 1 (OxiSynthRaw has no pitch bend). Live notes get the attack error too |
| [sound/bowed.js](sound/bowed.js) | `WaveguideString` (friction μs 1.2, μd 0.3, v0 0.3, Friedlander hysteresis), `SourceString` (band-limited Helmholtz sawtooth + bow noise), `Body` (signature modes plus 42 bridge-hill modes per ear), `EQ`, `ViolinSynth` (four strings, bridge coupling, voicing), `renderCurves` for offline use |
| [sound/tone.js](sound/tone.js) | Fitted tone EQ and per-pitch voicing. Regenerate with `node strings/test/fit_tone.js [folder]` from the VSCO 2 CE "Arco Vib" violin samples (CC0) in the git-ignored `strings/data/VSCO/`; the long-term spectrum residual is 4.3 dB rms (waveguide) and 3.3 dB (source) in third-octave bands |
| [sound/violin-worklet.js](sound/violin-worklet.js) | The physical models in an AudioWorklet: curve playback with transport, plus live notes |
| [sound/ddsp.js](sound/ddsp.js), [sound/ddsp-worker.js](sound/ddsp-worker.js) | Magenta's DDSP violin: the decoder in TensorFlow.js (worker), the harmonic + filtered-noise synthesis in JS, 5 s windows with 1 s crossfades |
| [sound/engines.js](sound/engines.js) | One transport for all engines (pre-rendered ones play in 1 s blocks as they become ready), the #030 hall reverb, limiter, analyser |

Measured (Node, 48 kHz): sustained notes are in Helmholtz motion in ≥ 85 % of pitches × dynamics for violin, viola and cello, sound within 20 cents, and four strings + body render at about 30× real time. DDSP's 5 s window takes about 9 s on a CPU backend (headless Chromium without a GPU); with WebGL it should be well under a second, not yet measured on a real GPU.
