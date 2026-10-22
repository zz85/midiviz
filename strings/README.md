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

## Fingering library API

New integrations should call `solveFingering(notes, options)`. It accepts notes shaped as
`{ pitch, on, off, id?, lockString?, skip?, art? }`, validates the notes and instrument profile,
and does not modify either. Held-note protection is on by default; pass
`preserveHeldNotes: false` to solve onset groups without that second pass.

The result is frozen and keeps one assignment per input note, in input order:

```js
import { solveFingering } from './strings/fingering.js'

const result = solveFingering(notes, {
  instrument: 'violin',       // violin | viola | cello | bass | custom profile
  mode: 'standard',           // beginner | standard | expressive | nearest
  handSize: 1,
})

// { assignments, cost, diagnostics, movedHeldNotes, unresolvedHeldConflicts, ms }
// playable assignment: { index, id?, playable: true, string, finger,
//   base, offset, position, extension, thumb }
// rejected assignment: { index, id?, playable: false, reason }
```

Diagnostic codes are `range`, `chord-capacity`, `constraint`, `no-state`, `held-conflict`, and `skipped`.
`fingerLine` and `fingerHeld` remain as mutating compatibility wrappers for experiments #033,
#034, #037 and #038. They write the established `string`, `finger`, `base`, `offset`,
`position`, `ext`, `thumb`, and `unplayable` fields. Repeated calls clear all previous solver
output, and `fingerHeld` no longer leaves its generated `lockString` constraints on notes.

Custom profiles use the same shape as entries in `INSTRUMENTS`. Set `template: 'violin'` to use
the Galamian/Cooper scale patterns with an equivalent violin-family frame.

### Alternative suggestions

`suggestFingerings(notes, options)` returns the recommended solution followed by distinct
alternatives from an exact k-best Viterbi search. Every candidate uses the same instrument,
mode, weights, scale templates and held-note constraints, so `costDelta` is directly comparable
to the recommended result.

```js
const result = suggestFingerings(notes, {
  instrument: 'viola',
  limit: 4,             // 1–10 returned suggestions; default 3
  minChanges: 2,        // changed notes between any two suggestions
  maxCostDelta: 8,      // omit higher-cost paths; default unlimited
  candidatePool: 48,    // k-best paths examined, limit–128
})

// { suggestions, diagnostics, candidatePaths, exhausted, ms }
// suggestion: { rank, label, assignments, cost, costDelta, changes }
// changes: { notes, strings, fingers, positions }
```

The result, suggestion records, assignments, diagnostics and change summaries are frozen.
Suggestions remain aligned with input order, honor `lockString`, retain base diagnostics, and
never introduce more held-string conflicts than the recommended solution. `candidatePool`
bounds work; `exhausted` is true when filtering by cost, diversity or held-note safety leaves
fewer than `limit` suggestions.

## Tests

- `node --test strings/test/fingering.test.js` runs 45 tests: geometry, physical consistency, textbook patterns, stable semitone-pattern continuity, double stops and chords, viola, cello and double bass, 3-octave scales, styles, string locks, motion, TNUA format, immutable results, exact range checks, repeated solves, diagnostics, validation, custom profiles, held voices and event timing.
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
| Tuned on all pieces (the shipped defaults) | 81.5 | 67.3 | 64.6 |
| One violinist vs the other nine | 96.2 | 90.0 | 89.8 |

- The shipped defaults score 74.9% "soft", meaning the engine agrees with at least one of the 10 violinists on that note.
- The other styles on TNUA: beginner 51.8, expressive 59.4, fewest shifts 59.7.
- Most errors are position choices. The violinists play in 2nd and 3rd position far more than the model does, especially in lyrical passages that they keep on one string.
- A diatonic "finger by note letter" rule with a local key estimate made agreement slightly worse, so it is off by default (`weights.letter`, `weights.posOffKey`).

# Experiment #034 – Violin sound lab

[034_violin_sound.html](../034_violin_sound.html) plays the #033 fingering through six engines. The design follows [research/03_violin_sound.md](research/03_violin_sound.md) §4.

| File | What it does |
|---|---|
| [sound/performance.js](sound/performance.js) | Fingered notes and bow strokes → per-string curves at 250 Hz: f0 (vibrato, slides on shifts, a slow intonation drift), bow velocity, force (kept above the measured Schelleng minimum F ≈ 0.02·(Z/0.3)^1.5·v/β²), contact point β, damping when a finger lifts, finger taps, and loudness (dB) for DDSP |
| [sound/humanize.js](sound/humanize.js) | Humanization after Embertone's "Intuition" page, applied to the notes before the curves so every engine plays it: onsets move about 6 ms (less in fast runs; chords together, legato kept), velocity and bow speed / pressure vary per note, a stopped note lands 4–12 cents off (more after a shift, undershooting more often) and settles in 40–120 ms, and a round-robin index per repeated pitch. Seeded: "New take" on the page draws new choices. The physical models and DDSP hear the attack error in f0; the samples bend `playbackRate` and alternate between the two nearest recorded notes; GM puts each note on its own channel and retunes it with RPN 1 (OxiSynthRaw has no pitch bend). Live notes get the attack error too |
| [sound/bowed.js](sound/bowed.js) | `WaveguideString` (friction μs 1.2, μd 0.3, v0 0.3, Friedlander hysteresis), `SourceString` (band-limited Helmholtz sawtooth + bow noise), `Body` (signature modes plus 42 bridge-hill modes per ear), `EQ`, `ViolinSynth` (four strings, bridge coupling, voicing), `renderCurves` for offline use |
| [sound/tone.js](sound/tone.js) | Fitted tone EQ and per-pitch voicing. Regenerate with `node strings/test/fit_tone.js [folder]` from the VSCO 2 CE "Arco Vib" violin samples (CC0) in the git-ignored `strings/data/VSCO/`; the long-term spectrum residual is 4.3 dB rms (waveguide) and 3.3 dB (source) in third-octave bands |
| [sound/violin-worklet.js](sound/violin-worklet.js) | The physical models in an AudioWorklet: curve playback with transport, plus live notes |
| [sound/ddsp.js](sound/ddsp.js), [sound/ddsp-worker.js](sound/ddsp-worker.js) | Magenta's DDSP violin: the decoder in TensorFlow.js (worker), the harmonic + filtered-noise synthesis in JS, 5 s windows with 1 s crossfades |
| [sound/hybrid.js](sound/hybrid.js) | Engine 6, a hybrid sampler after Embertone's Joshua Bell Violin. Each note plays the University of Iowa recording of that pitch **on the string #033 chose** (non-vibrato, pp / mf / ff), read at a varying rate so it follows the performance's f0 curve exactly (the recording's own pitch wobble is taken out with its pitch track; our vibrato, slides, attack error and drift go in), with a small amplitude flicker tied to the vibrato. The two layers around the loudness curve's level are crossfaded per sample after aligning them to the same pitch period (no phasing). Detached notes keep 60–150 ms of the recorded attack, then splice to the steady part at the best-matching point; bow changes between connected notes start partway into the attack; slurred notes have no new attack: the old sample glides along the f0 curve while the new one fades in from its steady part, aligned to the old one's phase. Long notes loop (pitch-synchronous loop points, r ≈ 0.95–0.99); when the bow leaves, the voice crossfades into the recording's own release and ring. Repeated notes alternate with the neighbouring recording. Pure JS (about 30–70× real time), so the page renders it progressively and Node renders it in tests |
| [sound/samples/iowa/](sound/samples/iowa/) | The banks: per instrument and string, one Ogg Opus file per dynamic (64 kb/s mono, 48 kHz) and `manifest.json` (onset, end of attack, release tail, sustain RMS, a 100 Hz pitch track and a loop per note). Violin 12 MB, viola 8 MB, cello 10 MB, loaded per string and dynamic as a piece needs them. Built by `node strings/test/build_iowa.js --instrument=violin\|viola\|cello` (downloads the chromatic scales to the git-ignored `strings/data/iowa/`, cuts them at the silences or at the noise floor, names notes by scale order checked against a pitch reading, re-reads the viola files whose 96 kHz audio carries a 44.1 kHz header). Source: [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html), 2012 recordings, "may be downloaded and used for any projects, without restrictions" |
| [sound/engines.js](sound/engines.js) | One transport for all engines (pre-rendered ones play in 1 s blocks as they become ready), the #030 hall reverb, limiter, analyser |

Measured (Node, 48 kHz): sustained notes are in Helmholtz motion in ≥ 85 % of pitches × dynamics for violin, viola and cello, sound within 20 cents, and four strings + body render at about 30× real time. DDSP's 5 s window takes about 9 s on a CPU backend (headless Chromium without a GPU); with WebGL it should be well under a second, not yet measured on a real GPU.

Hybrid sampler, measured (Node, `strings/test/sound.test.js`): pitch within 6 cents of the curve on every string and dynamic of violin, viola and cello without vibrato, and the output's vibrato depth within 30 % of the curve's; a 7 s note (longer than any recording) stays within 6 dB and has no clicks; forte is more than 6 dB louder and 15 % brighter (spectral centroid) than piano; slurred joins dip less than 6 dB; the level predicted from the loudness curves is within 2.5 dB of the render. In headless Chromium, Bach's Adagio BWV 1001 (88 s, 471 notes) renders in 1.4 s and the Presto (806 notes) in 6.2 s, and playback starts with the first rendered second.

Limits: the Iowa recordings are one player, one take per note, and an anechoic room (the #030 hall adds the room). Transitions are synthesized from single notes; recorded note-to-note legato, as in the Bell library, would need interval recordings that no free set has. Some notes in the Iowa scales are up to a semitone off their file names; the engine reads each recording's measured pitch, so this costs at most a semitone of transposition. The viola's D string has no mezzo-forte file above B4, so those notes use the nearest layer. Older Safari versions cannot decode Ogg Opus.

## Automatic bowing (after SWAM Violin 3)

SWAM's player only gives notes, velocity and one continuous Expression; the plug-in plays the bow. The Bowing panel in #034 does the same:

| SWAM control | #034 |
|---|---|
| Expression (CC11) | `expressionFromCC` in performance.js reads the track's CC11, else CC7 (MuseScore and LilyPond write dynamics and hairpins there), else CC2, through the GM volume curve. The lane moves the bow's dynamic per frame, so speed, force and contact move together (louder: faster, heavier, nearer the bridge). When all velocities are equal (Mozart K379, the Kreutzer: velocity 127 everywhere, dynamics in CC7) the lane is the dynamic. Sample engines get it as note velocities |
| Interactive BowPress | `WaveguideString` counts slips per period (a slip counts only after a stick of 0.3 period, which separates Helmholtz motion from double slipping on 338 of 343 good notes). Double slipping and a stuck bow are hysteretic: at the same force the string can settle into either, and the fixed-force scan showed neither more nor less force reliably helps. A short excursion does: a ±14 dB force kick decaying in 25 ms, alternating, at most 12 per stroke. Helmholtz sweep (369 pitch × dynamic notes): 343 → 359 at the default pressure, 312 → 346 at pressure 0.6, 312 → 329 at 1.8 |
| Bow pressure / bow position knobs | The Pressure and Contact sliders scale the automatic values |
| Bow Start, Keep Bow Direction | `bowStart`, `keepBow` (motion.js options, defaults unchanged for #033 / #037) |
| Bow Lift: Off String / On String | `bowLift`: the bow leaves and the string rings, or it stays (light force, still) and stops it; the hybrid sampler cuts the recorded ring to ~35 ms |
| Mono CrossString Muting (1 sem / 2 sem / All) | `crossMute`: in a slur, a crossing by ≤ n semitones damps the old string |
| Sordino | A high shelf (−12 dB above 1.5 kHz) and a small low-mid peak on the bus, all engines |
| Rosin, String Resonance | Stick-slip grain and bow noise; bridge coupling of the other strings (physical models) |
| Harmonics 2 / 3 / 4 (Left Hand) | `harmonics` (Left hand panel): `planHarmonics` turns each note into a harmonic touching at 1/n of the string (natural on an open string when possible; Auto only above the top string's comfortable range). The waveguide models the touch: its nut side is split at the touch point by a lumped damper (resistance 1.2 × 2Z), so modes with a node there pass and the others die, and it is bowed at 60 % force. A 7th control channel (`CH.harm`) carries n. Test: the n-th partial leads by ≥ 6 dB on every note for n = 2, 3, 4, and the same string without the touch sounds its fundamental. The source model, samples and hybrid play the sounding pitch with the upper partials filtered (no free recorded harmonics) |
| Tremolo Off / Slow / Fast, Hz / Sync / Sync+Acc, Min Speed | `tremolo`, `tremoloMode`, `tremoloMin`: every stroke long enough for two turns becomes a bowed tremolo (rounded square-wave bow velocity, force from the stroke's speed so each turn bites, 85 % force). Free: 9 / 15 strokes/s; Sync: 16ths / 32nds of the MIDI file's tempo, doubled up to the minimum; Acc: starts at 55 % and reaches the rate in 0.35 s. The loudness curve pulses with the turns (DDSP, hybrid); the VSCO samples get a gain curve; GM has none |
| Live: CC11, CC1, pitch bend | MIDI in: CC11 / CC2 drive the bow's dynamic (velocity then only shapes the attack), CC1 sets the vibrato depth, pitch bend ±2 semitones |

Not taken over: SWAM's Gesture Mode "Bowing" (bow direction from a controller), the manual tremolo / bow-change keyswitches, alternate fingering (the #033 fingering styles cover it), and the measured body, which [research/05](research/05_commercial_violins.md) ranks first.

## Measured body (from the Iowa recordings)

The physical models used a synthetic body: 10 signature modes plus 42 random ones, then a 13-band EQ fitted to VSCO. [Research 05](research/05_commercial_violins.md) ranks a measured body as the largest gap. `node strings/test/fit_body.js` (6 minutes, needs ffmpeg and the Iowa banks) now estimates one per instrument and model:

- Our string plays every Iowa note on the same string at the same dynamic. Each recorded harmonic is compared with the same harmonic of our bridge force (before any body), which gives `r(n, k) = g(n) + s(dyn)·log2 k + B(k·f0)`. That is a per-note level, a brightness difference per dynamic layer (mean zero), and the body response B.
- Chromatic notes on four strings place harmonics everywhere from the lowest open string up to 12 kHz: 4,500–7,200 harmonics per instrument. B comes from a robust kernel regression on a 1/48-octave grid (σ = 1/40 octave). Harmonics in a bow-position notch or below the noise are dropped, as are notes our string does not play in Helmholtz motion.
- Because the fit is against our own string, B covers what the modal body, the EQ and the voicing did together. With the measured body those three are off.
- The violin curve shows the expected landmarks without being told: the A0 air mode at 281 Hz, peaks at 410 and 547 Hz (CBR / B1+), and a bridge hill at 2.1 kHz.
- 2-fold cross-validation (fit on even semitones, test on odd ones, and back). The figures are the per-harmonic residual after a per-note level, median / 90th percentile, in dB:

| | measured | modal body + EQ |
|---|---|---|
| violin waveguide | 3.5 / 9.5 | 5.5 / 14.9 |
| violin source | 3.1 / 8.1 | 4.4 / 12.2 |
| viola waveguide | 3.5 / 9.6 | 5.1 / 14.2 |
| viola source | 2.7 / 7.0 | 4.1 / 11.7 |
| cello waveguide | 3.3 / 9.6 | 5.4 / 16.7 |
| cello source | 2.4 / 6.4 | 4.5 / 13.4 |

  What remains is mostly the difference between his bowing and our string's source spectrum, which no body can fix.
- [sound/body.js](sound/body.js) turns the curve (`body-iowa.js`, 2 × 529 values per instrument and model) into a 4,096-tap minimum-phase FIR (cepstral method). It applies the FIR by uniformly partitioned FFT convolution (128-sample blocks, 2.7 ms latency), about the cost of the modal body, and real time in the worklet. The second ear gets ±1.5 dB of smooth seeded ripple above 800 Hz for stereo width.
- Default on. **Body: Modal** in the Timbre panel brings the old body back. The waveguide was fitted 3× oversampled (the default).

Limits:
- One direction: the centre microphone at 5 feet in an anechoic room. There is no directivity and no player movement yet.
- Below the lowest note (196 Hz on the violin) the curve is extrapolated, so the violin's own low air resonance is not measured.
- It is the body of the Iowa instruments: a 1998 Tambovsky violin, and for the viola and cello whichever instruments those sessions used.

## Automatic bowing and bow-force brightness

After SWAM's moving Bow Pressure / Bow Position knobs and Schoonderwaldt's measurements of violinists; [research 05 §6](research/05_commercial_violins.md#6-why-swams-bow-pressure-and-bow-position-knobs-keep-moving-and-automatic-bowing-in-034) has the background.

- **Auto bowing** (`style.autoBow`, slider in the Expression block, default 1; 0 = one contact point and pressure per note). Inside each stroke, [sound/performance.js](sound/performance.js) moves:
  - the contact point toward the bridge with the swell of a long note (× 0.9 · note-length weight · swell ÷ string weight Z/0.3, limited to ±12 %);
  - the contact point +6 % on the lowest string;
  - the force ±6 % from frog to tip;
  - both through slow seeded wanders (~0.6 s and ~0.9 s lowpassed noise, 7 % and 5 % RMS).

  The moves never take a note planned near the bridge closer to it on a heavy string, nor one planned far out further out. Force follows the contact point through the existing F ∝ v/β rule and the minimum-force floor.
- **Live meters:** **Bow pressure** (bow force on the string's own Z^1.5 scale, log) and **Bow position** (bow–bridge distance as a fraction of the string), at the top right of the view, plus a dashed contact-point trace in the force lane.
- **Bow-force brightness** ([sound/bowed.js](sound/bowed.js) `TILT`): each string is tilted above ~3·f0 by k = exp(c·(r − r0)) − 1, with r = log10(F / (Z/0.3)^1.5). It is neutral at mezzo-forte (r0 = the mf median, −0.21). `node strings/test/fit_tilt.js` fits c per instrument and model so that the median pp → ff brightening (spectral centroid) matches the mean of the Philharmonia and Iowa medians (two players, instruments and rooms; `--sources=phil` or `iowa` for one) (~12 min, needs the Philharmonia samples and ffmpeg). Results are in the table below. Without the tilt our strings brightened 15–80 cents from pp to ff, the "same tone at every dynamic" that sounded like a sawtooth. `ViolinSynth({ tilt: 0 })` turns it off; the Helmholtz-motion tests measure the string with it off.

| pp → ff brightening, cents (median) | Philharmonia | Iowa | target (mean) | waveguide before → after (c) | source before → after (c) |
|---|---|---|---|---|---|
| violin (30 + 91 pairs) | 521 | 279 | 400 | 19 → 401 (1.77) | 57 → 398 (1.63) |
| viola (47 + 97) | 952 | 313 | 633 | 53 → 633 (2.04) | 82 → 635 (2.52) |
| cello (49 + 85) | 162 | 425 | 293 | 13 → 294 (1.55) | 40 → 290 (1.83) |

## A/B against a real violinist

`node strings/test/ab_recording.js [--rec=ko-donghwi_bwv1001_mov1] [--from=0] [--secs=20] [--engines=…] [--bodies=…] [--room=recital|dry]` downloads the [Bach Violin Dataset](https://github.com/salu133445/bach-violin-dataset) (Dong et al., ICASSP 2022) into the git-ignored `strings/data/BachViolin/`. It is 265 MB: 6.5 hours of Bach's solo sonatas and partitas by 17 violinists, with the score's notes aligned to each recording. Licences differ per collection (public domain, CC BY 3.0, some NC/ND).

- Our engines play the aligned notes at the violinist's own timing. Chords are thinned to two notes, and the result goes through the #030 hall (recital room). The envelope tracks the recording within about 50 ms (envelope correlation 0.8).
- It writes level-matched WAVs into `strings/data/compare/recording/`: the excerpt, each engine × body, and an A/B file. The comparison page links them.
- This replaces the hybrid-sampler render as the reference. That render is our own phrasing with recorded tone, not a real phrase.
- The default is Ko Donghwi, Sonata No. 1, Adagio (Team DR, CC BY 3.0). Long-term spectrum against the recording (third octaves 160 Hz–12 kHz, rms dB): waveguide + Philharmonia 6.9, waveguide + Iowa 8.6, source + Philharmonia 13.2, hybrid 9.4. On the Presto (0–15 s): 4.3, 6.1, 6.1 and 7.0. These are rough, because his room, microphone and YouTube encoding are in the recording.

## Performance fitted to real violinists

`node strings/test/perf_stats.js [--recs=…] [--model=source] [--body=phil] [--style=JSON]` measures sustained single notes (≥ 0.5 s) in Bach Violin Dataset recordings, at their aligned times. It tracks f0 every 10 ms and reports:
- vibrato: rate, and width (half the swing, cents) of the strongest 3.5–9 Hz component;
- vibrato onset, by demodulating the f0 at the vibrato rate;
- note levels, swell and slope.

It then measures our engine on the same notes, at the violinist's timing and through the same hall. Default: eight slow movements by four violinists (Ko, Garner, Kim, Telmányi). Pooled medians, 401 notes:

| | vibrato on | rate | width | onset | level spread | swell | slope |
|---|---|---|---|---|---|---|---|
| recordings | 67 % | 6.55 Hz | ±13.3 c | at once (≤ 0.08 s) | 7.8 dB | 1.6 dB | +0.6 dB |
| before | 41 % | 5.60 Hz | ±7.4 c | 0.31 s | 4.6 dB | 0.3 dB | −0.4 dB |
| now | 68 % | 6.45 Hz | ±13.2 c | ≤ 0.08 s | 4.9 dB | 1.3 dB | +0.5 dB |

Changes in [sound/performance.js](sound/performance.js):
- **Vibrato:** default rate 6.6 Hz; depth 1.5 × (12 + 3·dynamic) cents, with less dependence on the dynamic, so loud notes stay within ±28 cents. It starts almost at once and widens only 10 % through a long note. A quarter of the notes get almost none, as players leave some plain.
- **Messa di voce:** notes from 0.45 s swell, 0.4 × phrasing, less on very long notes (× 1.5 s / duration), none on harmonics.
- **Phrase arch** 0.6, and +3 % bow speed per semitone above the phrase mean.

The level spread between notes is still short of the players' (4.9 against 7.8 dB). It is their interpretation (echoes, terraced dynamics, accents), which the plain score notes don't carry; the Variance slider at 2.5 reaches 5.7 dB.

## Waveguide multipliers (WG pressure, WG position, WG limits)

Three Timbre controls for the waveguide only, applied after the automatic bowing in [sound/bowed.js](sound/bowed.js):
- **WG pressure** scales the bow force the string gets.
- **WG position** scales the bow–bridge distance it gets.
- **WG limits** (`wgApply`, `WG_LIMITS`), default *Keep playable*. It holds the contact point between 1/50 and 1/4 of the string from the bridge. It also keeps the force inside the window our waveguide can play at that spot: 0.3 × Schelleng's lower force and 0.25 × his upper force, which are the factors measured on this string. A planned attack press that already overshoots its own window keeps its overshoot. *Off (raw)* applies the multipliers as they are.

The meters and lanes show what the string gets. Measured on 117 steady notes (violin, viola, cello; p, mf, f), notes in Helmholtz motion:

| WG pressure × position | raw | kept playable |
|---|---|---|
| 1 × 1 | 116 | 116 (no change) |
| 0.3 × 0.3 | 4 | 107 |
| 1 × 0.5 | 85 | 102 |
| 1 × 2 | 55 | 110 |

## Measured body (Philharmonia samples)

**Body: Measured (Philharmonia)**: violin, viola and cello bodies estimated as the Iowa ones are, from different instruments and players.

- `node strings/test/fit_body_philharmonia.js [--instrument=…] [--model=source,waveguide] [--quick]` downloads the Philharmonia Orchestra's Strings.zip (171 MB) into the git-ignored `strings/data/Philharmonia/`. The samples are free to use but must not be redistributed "as is", so only the fitted curves (`sound/body-philharmonia.js`) are committed. It needs ffmpeg (MP3). It takes about 20 s per instrument and model.
- It fits the same model as fit_body.js (`r = g + s(dyn)·log2 k + B(k·f)`, same grid and robust kernel regression, shared through [test/body-eval.js](test/body-eval.js)). It uses the 1.5 s "arco-normal" notes at six dynamics, falling back to 1 s takes. They have vibrato, so each note is cut into 8-period frames, each frame gets its own measured f0, and each frame is one row compared with our string played without vibrato. Our fingering picks the string.

| source, dB median / p90 | Philharmonia notes: this body (held out) | … Iowa body | … no body | Iowa notes: this body | … Iowa body (fitted on them) |
|---|---|---|---|---|---|
| violin (151 notes, 1,843 frames) | 2.9 / 7.8 | 4.4 / 11.6 | 3.7 / 9.7 | 4.7 / 12.0 | 3.0 / 8.1 |
| viola (190, 2,343) | 3.0 / 7.9 | 3.6 / 9.5 | 4.1 / 10.6 | 3.1 / 8.6 | 2.5 / 6.7 |
| cello (187, 2,350) | 2.9 / 7.6 | 3.6 / 9.5 | 4.4 / 11.3 | 3.3 / 8.4 | 2.4 / 6.2 |

| waveguide, dB median / p90 | Philharmonia notes: this body (held out) | … Iowa body | … no body | Iowa notes: this body | … Iowa body (fitted on them) |
|---|---|---|---|---|---|
| violin (151 notes) | 3.4 / 9.1 | 4.7 / 12.4 | 4.6 / 12.0 | 4.8 / 12.8 | 3.4 / 9.2 |
| viola (190) | 3.5 / 9.5 | 4.0 / 10.8 | 4.9 / 12.6 | 4.2 / 10.1 | 3.2 / 8.5 |
| cello (183) | 3.4 / 9.0 | 4.1 / 10.7 | 5.6 / 14.1 | 3.8 / 9.3 | 3.0 / 7.3 |

  The waveguide was fitted on the string of `4c76b6b` (pitch-tracking end losses). The committed Iowa waveguide body predates that string, so its columns here are from the older fit.
- The viola and cello bodies agree with the Iowa ones well enough to help on each other's notes, so they mostly capture the instrument family. The two violins differ more: the Iowa violin body is worse than no body on the Philharmonia violin notes, and the Philharmonia violin body is about 11 dB stronger near 1 kHz and 6 dB weaker near 2 kHz.
- The Philharmonia curves are 3–8 dB brighter than the Iowa ones above 6 kHz (violin and viola), where the Iowa body measured dark on the lyrical demo.

## Measured body (NBody hammer responses)

A third choice, **Body: Measured (NBody, violin)**: a violin measured directly, not estimated. [Research 05 §5](research/05_commercial_violins.md#5-bodies-in-034-explained) explains the three bodies in plain terms.

- `node strings/test/build_nbody.js [--mix=all|pair] [--mics=3,10] [--hi=13000] [--no-eval] [--quick]` downloads Cook and Trueman's NBody violin takes (Princeton, 1998: the bridge struck with a force hammer next to each string, 12 microphones on an icosahedron) into the git-ignored `strings/data/NBody/` and writes `body-nbody.json` there. They carry no licence, so neither the takes nor the result are committed. The page loads the file when the option is chosen and falls back to the Iowa body, with a message, when it is missing.
- Per microphone and strike point: H = Y·X* / (|X|² + ε), ε = 10⁻³ of the hammer's peak power. The hammer's spectrum falls 20–35 dB above 4 kHz, so this caps the boost at 30 dB. The four strike points are averaged (time-aligned, same microphone), band-limited to 120 Hz–13 kHz, the acoustic delay removed, cut to 4,096 samples at 44.1 kHz (95 % of the energy is within 5–7 ms) with a fade. Microphones 3 and 10 hear the most between 500 Hz and 4 kHz and are the two ears (see the next point for how all 12 are used).
- [sound/body.js](sound/body.js) `ConvBody` takes the impulse responses as they are (`{ ir: [L, R], rate }`), resampled to the context rate with a windowed sinc, through the same partitioned convolution. Violin only: the viola and cello keep the Iowa body. Level per string model matches the Iowa body (−9.6 dB waveguide, −8.6 dB source).
- **All 12 microphones (default, `--mix=all`).** The two loudest microphones face the top plate, which made the body about 7 dB too strong around 4 kHz on the lyrical demo. Now each ear's magnitude is the power average of all 12 directions, as a listener in a room hears a blend of every direction. The ear keeps its own microphone's measured phase: the correction |average| / |own|, smoothed over 1/6 octave and limited to ±18 dB, is applied as a minimum-phase filter, so nothing rings before the strike. `--mix=pair` gives the two microphones as they are.
- Harmonic residual against the Iowa recordings (the measure fit_body.js reports, all notes, dB median / p90):

| | waveguide | source |
|---|---|---|
| NBody, all 12 microphones | 5.7 / 14.5 | 5.6 / 14.3 |
| NBody, microphones 3 + 10 only | 6.5 / 16.0 | 6.3 / 15.9 |
| modal body | 4.7 / 13.4 | 4.4 / 12.2 |

  On the lyrical demo, compared with the hybrid sampler's recorded violin, the 4 kHz band goes from +6 dB to +1 dB and the spectral centroid from 1,935 to 1,149 Hz (recording: 1,478 Hz). It gains about 4 dB around 640 Hz, and stays 15–20 dB short above 8 kHz, where the hammer barely excites the body. Stereo correlation is 0.45 (0.33 with the pair). It is still a different violin from the Iowa one.
- The helpers fit_body.js and build_nbody.js share (our string's bridge force for one note, harmonic tables, the residual) are in [test/body-eval.js](test/body-eval.js).

## Waveguide attacks (Guettler) and the playable window

The waveguide's attacks crackled. Three scripts measure why, and check the fix:

- `node strings/test/attack.js [--verbose]` plays 432 bow starts: from rest and at bow changes, on every string of violin, viola and cello, at p / mf / f. It reports how long each takes to reach Helmholtz motion (6 regular periods) and whether it stays there. A good attack settles within 50 ms (90 ms if loose, Guettler and Askenfelt 1997).
- `node strings/test/schelleng.js` measures the playable window (F_min…F_max) per string, contact point and bow speed.
- `node strings/test/guettler.js` maps the time to Helmholtz motion over bow acceleration × force.

What they showed: the window was far too narrow on low notes. It was ×1.2 between F_min and F_max on the cello C string and ×1.85 on the violin G, and it grows with pitch, not with string mass. The two end losses were one-pole filters with almost fixed cutoffs, so a low note's corners were barely rounded within a period. The fix makes both cutoffs track the note: 2.5·f0 at the bridge, 4·f0 at the finger, 12·f0 at the nut. The other candidates widened nothing or made it worse:
- friction-curve parameters
- ring time
- sympathetic coupling
- rosin grain
- a first try at torsional waves

Window (geometric mean over 9 contact-point × bow-speed cases, 5 semitones above the open string):

| | before | after |
|---|---|---|
| violin G / A / E | ×1.85 / 3.89 / 7.0 | ×4.27 / 6.18 / 7.44 |
| cello C / G / A | ×1.20 / 1.28 / 2.86 | ×2.16 / 2.53 / 4.01 |

On top of that, performance.js now starts strokes the way Guettler's diagram asks:
- a fast bow acceleration that eases off (1 − (1 − x)²)
- twice the previous steady force, plus a further ×2 press at the start that eases off in 40 ms
- the Attack style (presets: Baroque 0.35) scales the press, the bite and the ramp

Tuned over a grid of 150 + 192 + 48 + 54 settings on the quick suite.

| attack.js, 432 bow starts | before | after |
|---|---|---|
| good | 65 | 317 |
| reach Helmholtz in time | 110 | 330 |
| stay in Helmholtz | 244 | 407 |
| median time to Helmholtz | 91 ms | 35 ms |
| violin / viola / cello good | 58 / 42 / 12 of 144 | 129 / 107 / 81 of 144 |

The cello from rest is still the weakest: 35 of 72. Because the raw tone changed, the waveguide's measured bodies were refitted. Held-out residual: 3.0–3.4 dB median (it was 3.3–3.5); the modal body's is 4.7–5.1 dB. With the string settling by itself, interactive bow pressure now rarely has anything to correct (182 vs 181 of 189 sweep notes).

## Source model: per-period jitter and bow noise

Through headphones the Source model sounded like raw sawtooth waves. A comparison with the Iowa recordings (same notes, no vibrato) showed that its brightness was not the problem: it had 2–12 dB *less* energy than the recordings at 2–16 kHz. The difference was between the harmonics. From 3 to 8 kHz, each harmonic peak stood 46 dB above the gap halfway to the next one, against 34 dB in the recordings: a perfectly periodic sawtooth, with clean lines and silence between them. A real string never repeats a period exactly.

`SourceString` now draws, at every period:
- a period jitter of 0.2 % rms
- an amplitude jitter of 3 %
- a corner-sharpness jitter of 10 %, which mostly touches the upper partials

Consecutive periods correlate at 0.5. The steady bow noise in the slip phase is 0.2, up from 0.05. Peak / gap is now 44.5 / 35.3 dB at 1–3 / 3–8 kHz, against the recordings' 45.2 / 34.1 (it was 57.7 / 45.9). Band levels moved by under 1 dB and pitch wobble is about 1 cent. Rosin scales all of it. The Source bodies were refitted: held-out residual 2.5–3.1 dB.

## Measured bodies: matching the energy, not only the median

A long-term comparison over every other Iowa note (third-octave bands, each note normalised to its 300 Hz – 2 kHz power, then averaged as powers, 5 % trimmed) showed that the 2–4 kHz bridge region was roughly right on average (violin −3 dB at 2.5 kHz, viola −3, cello −2 to −5 at 2–4 kHz). An earlier four-note check had said 2–8 dB short. The real gap was higher up: 5–14 dB too little energy at 5–13 kHz on the violin, 4–9 dB on the viola, 3–6 dB on the cello.

The cause is statistical. The body fit matches each harmonic's *median* level in dB, and those medians do match (within 1–2 dB). But a real body has sharp resonances that a harmonic now and then lands on, so the recordings' upper harmonics scatter far more than ours. At an equal median they carry much more energy, and loudness and brightness follow energy.

`fit_body.js` now ends with an energy match. It renders the notes through the fitted body, compares the band energies with the recordings, and adds a smooth correction above 1.25 kHz (80 % of the difference per step, three steps, ±10 dB per step). It skips the step with `--no-energy`; `--out=` writes elsewhere, so instruments can be fitted in parallel.

Worst band above 1.6 kHz, ours − recordings:

| | before | after |
|---|---|---|
| violin waveguide / source | −13.8 / −12.4 dB | ±2.5 / ±2.6 dB |
| viola | −9.4 / −9.3 dB | ±1.7 / ±1.9 dB |
| cello | −6.4 / −5.1 dB | ±1.3 / ±1.1 dB |

The held-out median residual stays 2.5–3.3 dB. The per-band before / after figures are in each body's `stats.energy`.

## Waveguide: per-slip jitter

The Source model's per-period jitter applied to the waveguide too: its upper harmonics stood 56 / 46 dB above the gaps between them at 1–3 / 3–8 kHz, against the Iowa recordings' 45 / 34. Each slip now draws the next period's bow force (15 % rms) and static friction (3 % rms), correlated 0.5 between periods and scaled by Rosin. Result: 44 / 36 dB.

Friction jitter costs attacks and Helmholtz stability faster than force jitter, which is why most of it is force:
- the 20 % / 10 % mix matched the texture best but dropped the attack suite to 185 of 288;
- at 15 % / 3 %, attack.js gives 310 of 432 good (317 before) with a median of 33 ms (35 before).

Two tests now run their check with Rosin 0, because they measure something the jitter blurs on purpose:
- the oversampling test measures aliasing;
- the bow-pressure sweep measures the bowing regime. The rosin grain alone moves that sweep by about 3 notes (179 / 182 of 189 at Rosin 0 / 1 before this change), so its bar is 94 %.

The waveguide bodies were refitted with the energy match. Held-out residual: 2.9–3.4 dB. Every band above 1.6 kHz is within 2.4 dB of the recordings.

## Short strokes: less press (the Tchaikovsky cracks)

The waveguide cracked in fast forte chord strokes, for example the G♯3 + F4/B4 passage at 4:37 of the Tchaikovsky concerto's first movement (112 ms strokes). On held notes the automatic bowing sits in the middle of the measured playable window (Schelleng; median 52 % up it, 1.5–3.5× below F_max), within the forces Schoonderwaldt measured (mf 0.94 N, f 1.61 N median). Short strokes were the exception. Three boosts multiplied at their start: the ×2 force scale, the ×2 attack press and the short-stroke bite of ×1.5. Their peaks reached 4–8.7 N at forte, above a player's 3–4 N accents.

Short strokes (one note under 180 ms) now press ×1.5 instead of ×2 and reach full bow speed half as fast. Of the variants tried (no press, less bite, a cap at a fraction of the Schelleng maximum, a cap in the release, slower ramp alone), this one cut the most crackles without making attacks worse:

| | before | after |
|---|---|---|
| crackles (3–10 kHz bursts), concerto 4:30–4:52 | 7 | 1 |
| crackles, concerto 3:20–5:30 | 15 | 9 |
| crackles, demos + Bach Adagio (74 s) | 6 | 4 |
| short forte notes: peak force p90 / max | 4.1 / 8.7 N | 3.1 / 5.9 N |
| short notes that go raucous (216) | 11 | 5 |
| attack.js quick suite | 207 / 288 | 207 / 288 |

## Articulation planner and score input

[research/06_articulation.md](research/06_articulation.md) explains the background: SWAM and the Joshua Bell Violin choose legato, détaché and portamento from overlaps, gaps and velocity. Our violin MIDIs carry none of that, because 94.9 % of note pairs touch exactly.

**[score.js](score.js)** reads MusicXML and compressed `.mxl`, the export format of MuseScore, Finale, Sibelius and Dorico. It keeps what MIDI loses:
- slurs (as ids);
- staccato / staccatissimo / spiccato / tenuto / accent / marcato (staccato sounds half its value);
- up- and down-bow signs;
- ties (merged), the time signature and tempo, and each note's beat in the bar.

It is a small regex XML walker plus a zip reader, so it runs in Node, workers and the browser (`readMXLBrowser` inflates with `DecompressionStream`). Mutopia's LilyPond sources are not read directly. python-ly (`ly musicxml piece.ly`) converts them, but that path is untested.

**[articulation.js](articulation.js)** decides per note whether it continues the previous bow (`n.art.slurPrev`) and its stroke. It runs before bowing, and `motion.js` follows the plan whenever notes carry one. Three sources, picked automatically:

| Input | Layer | Rule |
|---|---|---|
| a score | score | its slurs and marks |
| a timed MIDI (fewer than 85 % of pairs touching) | timing | SWAM / JBV: an overlap is a slur (a quiet overlap a slide); a gap re-bows; the gap's size sets détaché / staccato / spiccato |
| a score-export MIDI (every note touching) | inference | short notes (≤ 0.34 s) by step (≤ 3 semitones), similar lengths, up to 8 per bow, a new bow on the beat, never across a rest, a repeated pitch or a chord |

`node strings/test/articulation.js [--tune] [--verbose]` checks the inference against the slurs of the Bach Violin Dataset's MusicXML editions of BWV 1001–1006: 32 movements, 21,570 note pairs, 27.1 % slurred in the editions. Each consecutive pair is scored as slurred or separate bows:

| | slurred P / R / F1 | agreement |
|---|---|---|
| all separate bows | 0 / 0 / 0 | 72.9 % |
| motion.js's fixed rule (≤ 4 fast notes) | 32.9 / 46.4 / 38.5 | 59.8 % |
| planner inference (tuned on even movements) | 43.1 / 59.6 / 50.0 | 67.7 % |
| — held out (odd movements) | 34.4 / 51.8 / 41.3 | 60.4 % (rule 47.4 %) |

Bach's slurs are an editor's and vary a lot by movement (training F1 61 % against 41 % held out), so the inference gives a plausible bowing, not the edition's.

In #034, **Open…** (or drag-and-drop) accepts `.musicxml`, `.xml` and `.mxl`. **Articulation** in the Bowing panel offers Auto, Inferred (always infer) or Fixed rule; the label's tooltip names the source for the current piece. Bach's Presto BWV 1001 plays as 419 strokes from the MIDI (inferred) and 584 from the MusicXML (its 94 slurs). Tests: `node --test strings/test/articulation.test.js` (3).

**Stroke types.** The planner also marks separately bowed notes with a stroke type, which performance.js plays:
- **Spiccato** (`n.art.stroke = 'spiccato'`): the bow is dropped and bounces off. Speed and force rise and fall together over half the time to the next note (30–100 ms), then the bow is off and the string rings. It applies to fast détaché runs (0.06–0.2 s between onsets, at least two in a row, not loud), to spiccato marks, and to staccato marks on fast notes.
- **Martelé** (`'martele'`): the bow is pinched on the string 16 ms before it moves (force × 2.2, no speed), takes a bitten start, then stops after 60 % of the slot and rests on the string (35 % force), which stops it. It applies to separate notes 0.15–0.6 s long that are louder than the piece's median velocity by 0.1 (only when velocities vary: MIDI exports at a flat 127 get none), to accent and marcato marks, and to staccato marks on slower notes. A timed MIDI's staccato gaps become martelé, or spiccato when fast.

Through the waveguide, a 12-note martelé line settles in 6–39 ms per stroke. In a spiccato run most bounces settle within their 45 ms contact, and some stay unsettled, as a real bounced stroke does. Tested in `strings/test/articulation.test.js`.

**Repeats and marks under a slur.** In a score, a slur over a repeated pitch (not tied) or over marked notes keeps one bow. The marked note speaks with a pulse in that bow (`n.art.portato`): the bow slows just before the note, the force falls less than the speed (the bow grips), and the bow presses into the new note.
- **Portato** (dots under a slur, or the detached-legato mark): a dip of 0.55 × the bow speed. Through the Source model with the Philharmonia body, the sound dips 8.3 dB (waveguide 8.8).
- **Louré** (a line under a slur, or an unmarked repeat): a dip of 0.35 × the speed, 4.0–5.4 dB in the sound.
- For comparison, re-bowing the same repeat dips 19 dB (Source) / 23 dB (waveguide), and the phrasing alone dips 1–2 dB.
- Dots under a slur keep 85 % of the note (they were halved, which left gaps in one bow).
- **Repeats in slurs** (Bowing panel; `planArticulation(notes, { repeats: 'rebow' })`) changes bow on unmarked repeats instead, as the Joshua Bell Violin does with quick repeats from a keyboard. The **Portato** slider scales both pulse depths, 0 turns them off.
- The Bach Violin Dataset's editions slur 73 repeated pitches (no portato marks). In score mode, 10 of them end up as pulses in a slur after stroke planning.

**Slides from the plan** (`n.art.port`). A heard slide into the note, 90–220 ms (scaled by the Slides slider) where a shift's slide is 35–160 ms, also when the fingering keeps the position. The fingering pays a cost (`SLIDE_CROSS` in fingering.js) to keep both notes of a planned slide on one string, with the new one stopped. Three sources set it:
- a score's `<slide>` or `<glissando>` mark;
- a quiet overlap in a MIDI performance (SWAM's portamento by velocity);
- inference: a slow legato leap of 3–12 semitones (both notes at least 0.3 s slurred, or 0.45 s across a bow change, the second 1.5 × as long), at most one every 6 s and none within 6 s of a marked one.

Shift slides with no plan behind them are halved across a bow change, where a player hides the shift in the change. On the 48 violin MIDIs (206 min), the planner asks for 1.0 slide per minute (198 heard, the others land on another string), against 10.2 shift slides per minute. On the 32 Bach edition movements it asks for 0.3 per minute. Bach's Gavotte BWV 1006 gets 38 because its MIDI is at half tempo (60 bpm, 6.7 min), so its notes look lyrical. Tested in `strings/test/articulation.test.js`.

Not done yet:
- JBV's speed and interval pitch instability;

## Articulation: fewer détaché notes

Two rules made most MIDIs play détaché:

- **Timing mode trusted any gap.** A MIDI whose notes do not all touch was read as a performance, where only an overlap slurs. A sequencer's uniform gate looks like that. B. Fisher's Tchaikovsky concerto plays every note at 94 % of its slot, so 81 % of its pairs have a small gap and nothing overlapped: 0 of its 5,599 notes were slurred. The same happened to six Mutopia files whose chords overlap their next note (Bach's Sarabande BWV 1002, Andante 1003, Adagio, Fuga and Largo 1005, Paganini's Caprice 24). Now an overlap still slurs and a clear gap still takes a new bow (with its stroke). A gap up to the file's typical gap + 10 % of the slot (at least 15 %) counts as the file's legato, and inference decides those pairs.
- **Inference never slurred notes over 0.34 s.** That was tuned on the Bach editions, whose tempos are fast, and it left slow movements and lyrical MIDIs détaché: Ave Maria, Bach's Gavotte, Menuets and Bourrée BWV 1006 were 0–1 % slurred. Now a note up to 0.8 s can join a slur, and a group must fit in one bow (2 s). The Bach score agreement is unchanged (slurred F1 50.5 %, agreement 67.3 %; held out 42.1 / 60.4 %).

Also, an accented note (a velocity jump of ≥ 0.15 in a file whose velocities vary) and the note after it take their own bows.

| slurred note pairs | before | after |
|---|---|---|
| Tchaikovsky concerto I (B. Fisher, 5,599 notes) | 0 % | 37 % |
| Bach Bourrée / Gavotte BWV 1006 | 0 / 1 % | 49 / 22 % |
| Bach Largo BWV 1005 | 2 % | 38 % |
| Gounod Ave Maria | 0 % | 14 % |
| Paganini Caprice 24 | 1 % | 27 % |
| all 49 MIDIs (52,285 pairs) | 24.7 % | 31.9 % |

Tests: `node --test strings/test/articulation.test.js` (5).

## Legato bow changes

Every stroke used to start and end as if detached: the bow slowed over 25–60 ms into the change, rested on the string, then started again with a new attack (the ×2 press, the bite and a small swell). In a legato line that is a hole at every bow change: the sound fell by a median 27 dB (waveguide) or 22 dB (source) for about 30 ms, even though the notes touch and are marked legato.

Now a stroke that starts where the previous one ended (a gap of at most 8 % of the note, or 15 ms), with neither stroke marked spiccato, martelé or staccato, is a bow change inside the phrase, not a new note:

- the old stroke runs on to the next onset and slows only in its last 8 ms;
- the bow turns through zero at once, and the new stroke reaches full speed in 8 ms;
- the new stroke keeps 70 % of its attack press (the string still has to start Helmholtz motion the other way; without it the waveguide's attack suite lost 5 % more changes) but none of its bite or swell;
- short strokes (fast détaché) get half of this, keeping a little articulation.

**Legato** in the expression sliders scales it (1 by default, 0 = detached bow changes as before); the Baroque preset uses 0.6, for bow changes that speak.

Measured on the demos, Ave Maria and the first 40 s of Bach's Adagio BWV 1001 (202 bow changes) , and against the Bach Violin Dataset's recordings at their aligned note changes (10 movements, four violinists, the recital hall on our renders):

| sound at a legato bow change | before | after |
|---|---|---|
| waveguide, dry: median dip / time below −10 dB | −27 dB / 30 ms | −11 dB / 2.5 ms |
| source, dry | −22 dB / 28 ms | −9 dB / 0 ms |
| source in the hall vs the recordings (median dip) | −11.8 vs −6.1 dB | −6.0 vs −6.1 dB |
| waveguide crackles per minute (these pieces + the Tchaikovsky passage) | 27.1 | 27.1 |
| waveguide periods in Helmholtz motion | 92.6 % | 91.3 % |
| attack.js bow changes reaching Helmholtz motion within 50 ms | 175 / 216 | 162 / 216 |

The last row measures the string's motion, not the sound: in a legato change the old tone is still ringing over the new stroke's first periods.

## Loudness across the engines

All six engines play the same performance at the same loudness, measured as K-weighted loudness (ITU-R BS.1770, LUFS) by `node strings/test/loudness.mjs` (headless Chromium; see the file). A test performance contains scales and long notes at p / mf / f (velocity 0.3 / 0.6 / 0.9), double stops, and low and high notes.

- **No per-piece normalisation.** GM, Samples and Hybrid used to be scaled per piece to a fixed RMS, while the physical models and DDSP played at their own level. On Bach's Adagio BWV 1001 the engines spanned 13 dB (Source −9.4 LUFS, GM −22.7). Now every engine plays at a fixed level, so a quiet piece stays quiet, and live notes match the render. `LEVEL_TRIM` in `engines.js` lines them up at mezzo-forte with Hybrid as the reference. Export WAV is at the playing level.
- **Dynamic range.** From velocity 0.3 to 0.9, the GM soundfont spanned 16–19 dB and DDSP 5 dB, against 8–12 dB for the others. GM velocities are bent toward mezzo-forte (`gmVelocity`, unchanged at 0.6), and DDSP's output is expanded by 0.46 dB per dB of our loudness curve (`DDSP_EXPAND`). Both now span 9–11 dB.
- **Level by pitch.** The measured bodies are fitted to each note's harmonic shape, not its level. Through them, the physical models' notes from D6 up came out 9–13 dB below G4, while the Iowa recordings stay level there. `node strings/test/fit_level.js` renders every Iowa mf note on the string it was recorded on. It compares the loudness and writes the smoothed difference (Gaussian, σ 2.5 semitones, mean removed) to `strings/sound/level-body.js` per instrument, body and model. ViolinSynth applies it as the string gain from the current pitch. The spread of recording − ours per note drops from 5.3–7.0 to 4.5–5.2 dB on the violin, 2.8–4.2 to 2.5–3.6 on the viola, and 3.2–4.6 to 1.9–3.3 on the cello.

| LUFS (pre-hall) | test, all | Adagio BWV 1001 | Hornpipe | Dvořák Largo | Für Elise |
|---|---|---|---|---|---|
| Waveguide | −21.0 | −13.1 | −23.0 | −22.3 | −30.2 |
| Source | −21.0 | −13.0 | −22.8 | −22.2 | −30.1 |
| DDSP | −21.6 | | | | |
| Samples (VSCO) | −20.4 | −15.2 | −19.7 | −25.0 | −33.1 |
| GM | −21.2 | −16.8 | −19.8 | −25.1 | −28.9 |
| Hybrid | −21.3 | −15.1 | −21.2 | −25.0 | −29.3 |

Before, the Adagio measured −12.4 / −9.4 / −22.7 / −21.1 (Waveguide / Source / GM / Hybrid). What remains differs by piece. The physical models add more on double stops (+5.6 dB over a single line, Hybrid +4.1). The Samples' p layer starts slowly, so soft short notes are quieter. The Source engine, the default, plays where it did before (its old gain of 1.2 is now a trim of +1.6 dB).


## Held notes no longer cut off

Long notes stopped suddenly in two-voice writing: a note held while the other voice moves (Bach's sonatas, the concertos' double stops). Three things cut them, none of them the automatic bowing:

- **Thinning to two voices** (`prepare()` in 034_violin_sound.html) ended every sounding note at the next onset. It cut 779 of the 3,326 notes of 0.8 s or more in our 49 violin MIDIs by 30 % or more. It now lets a held note sound on as a double stop, and ends it only when a third voice would sound (the oldest held note goes) or the new notes repeat its pitch: 75 notes.
- **The bow** (performance.js) ended each note's bowing at the next onset in its stroke, so a held note under a slurred moving voice lost the bow there; a note that ended inside its stroke (the shorter note of a double stop) went on being bowed as an open string. A held note now keeps the bow to its own end, a note that ends before its stroke lets go of its string, and `motion.js` no longer shortens a stroke when a slurred note ends before a held one.
- **The fingering** only looks at notes that start together, so it put 191 moving notes on the string a held note was sounding on. `fingerHeld()` (fingering.js) moves those to another free string (beyond the held note, the way the voice moves) and fingers the line again; 77 remain, and on a shared string the earlier note now ends where the next one starts.

Long notes cut by 30 % or more: 779 → 94 (75 for a third voice, 19 sharing a string). Test: "held notes" in sound.test.js.

## MuseScore files

`strings/score.js` reads MuseScore's own files directly, with no MusicXML export step: `readMSCX(text)`, `readMSCZ(buf, inflateRaw)` and `readMSCZBrowser(buf)`. `readScoreFile(name, buf)` picks the reader by extension (`.musicxml` / `.xml`, `.mxl`, `.mscx`, `.mscz`). All of them return what `readMusicXML` returns, with `parts` and the index of the `part` read, so the articulation planner sees the same slurs and marks.

- **Versions.** MuseScore 3 and 4 (file versions 3.01–4.60) are supported. MuseScore 2 files are refused with a message asking to re-save them; the .mscz is a zip of one `.mscx`.
- **Timing.** A note's place comes from `durationType` + `dots` inside nested tuplets, from `<location>` moves inside a voice, and from measure lengths (`len`, irregular bars). Tempo marks are quarters per second. MuseScore 4's "a tempo" and "tempo primo" carry a placeholder tempo, so they are read as the marked tempo in force and the first tempo.
- **Spanners.** Slurs, ties and glissandi name their end as `{ measures, fractions }` from where they start. A slur covers the notes of its voice from its start to its end. Ties are merged into one note, and a glissando into a note is a slide (`art.port`).
- **Marks.** Articulation symbols are mapped to the MusicXML names MuseScore's exporter writes (`articStaccatoAbove` → staccato, `articTenutoStaccato` → detached-legato = portato, …), and `stringsUpBow` / `stringsDownBow` become bowings. Grace notes are skipped, as in readMusicXML.
- **Parts.** The `.mscz`'s root score is read, not the `Excerpts/` part scores. MuseScore 4.6 drops staff ids, which are then implicit. A part without tempo marks takes the top staff's.

Two MusicXML reader fixes came out of the comparison:
- MuseScore exports tempo marks in the first part only, so a viola or cello part used to play at the 100 bpm default. A part without tempo marks now takes the first part's.
- A chord's articulation is written on one of its notes; it now applies to all of them.

**Checked against MuseScore's own MusicXML.** `node strings/test/mscz.js` compares the two readers on the OpenScore String Quartets corpus (CC0, github.com/OpenScore/StringQuartets). Each score there ships as `.mscx` / `.mscz` together with MuseScore's `.mxl` export. 35 scores (18 `.mscx` in format 3.02, 17 `.mscz` in 3.02 / 4.50 / 4.60), all four parts, 275,499 notes:

| | Agreement |
|---|---|
| Notes found by both (pitch, bar, beat) | 99.4 % |
| Same length | 98.7 % |
| Slur pairs (consecutive notes in one slur or not) | 99.8 % of 258,388 (99.5 % before the two fixes below) |
| Stroke marks | 99.9 % of 51,809 |
| Bowings | 99.7 % of 1,595 |
| Slides (glissandi) | 100 % of 26 |

Two MusicXML reader fixes came from reading OMR output (ScoreShift) and raised slur agreement here from 99.5 to 99.8 % (Franck 96.8 → 100 %, Gossec 93.9 → 99.4 %): a slur that stops on a grace note now ends there (grace notes were skipped with their slur marks, so the slur stayed open and took in everything after it), and a slur from a lower voice up to voice 1 in the same bar, whose stop comes before its start in the file because voice 1 is written first, now covers the notes of both voices from its start to its stop (test in `score.test.js`).

Most remaining differences come from the exporter rather than the score. Berg's Lyric Suite part 1 has 15 notes that differ by two octaves. A few slurs the exporter splits at system breaks. Gradual tempo changes (rit. / accel. lines) are ignored by both readers. Reading all 140 parts takes 29 s in Node, for 16 MB uncompressed per large score. Unit tests are in `strings/test/score.test.js`.

**In #034.** Open… and drag-and-drop take `.mscz` and `.mscx`. For a score with several parts, the Track menu lists them (Violin 1, Violin 2, Viola, Violoncello). A viola or cello part switches the instrument.

## LilyPond input

`strings/lilypond.js` reads LilyPond `.ly` files directly, as Mutopia publishes them, without running LilyPond or converting to MusicXML. `readLilyPond(text, { include, part })` takes one file and resolves `\include` through a callback. `readLilyPondFiles(map)` takes a set of files and finds the main one (a `.ly` with a `\score` or `\book`, highest in the folders, a full score first). `readScoreFile('x.ly' | 'x.zip', buf)` opens a single file or a Mutopia `-lys.zip`. The result has the same shape as `readMusicXML`, with the parts of every score LilyPond would write as MIDI.

It interprets the language engraved music uses, not Scheme:
- **Note entry:** note names in nederlands, english (also the old `\include "english.ly"`), deutsch, italiano, français and español. Durations carry over and may sit apart from the pitch (`cis 2`), with dots and `*n/m`. Chords, `q`, rests, `R` and spacers are read.
- **Octaves:** `\relative` (with or without a start pitch, octave checks, chords, and LilyPond's order through `<< >>`: each voice continues from the last pitch of the one before), `\absolute`, `\fixed` and `\transpose`.
- **Time:** `\times`, `\tuplet`, `\scaleDurations`, `\partial`, `\time`, `\tempo`, and the `\midi` block's tempo (old `\tempo 4 = 72` or `tempoWholesPerMinute`, else 60, LilyPond's default).
- **Repeats:** `\repeat` with `\alternative`. Unfold, percent and tremolo repeats are played every time; volta repeats once each, as printed, unless `\unfoldRepeats`. That matches LilyPond's MIDI.
- **Structure:** variables, `\include` (as text), `\book` / `\bookpart` headers, `\new` / `\context` Staff, Voice and groups. A Voice outside a staff gets its own staff, as LilyPond does. `<< \\ >>` makes voices.
- **Marks:** slurs (postfix, also after spaces or a bar check), ties, `-.` `--` `->` `-^` `-!` `-_` and their named forms, `\upbow` / `\downbow`, dynamics, and `\glissando` (a slide into the next note).
- **Skipped:** grace notes (as in the other readers), markup, Scheme, `\override` / `\set` / `\tweak`, lyrics, chord names and figured bass.

**Checked against LilyPond itself.** The 48 Mutopia MIDIs in `violinist/midis` were written by LilyPond from the `.ly` sources Mutopia publishes, so reading the sources should give the same violin notes. `node strings/test/fetch_mutopia_ly.js` fetches the sources into `strings/data/MutopiaLy` (git-ignored, 2.4 MB: the `.ly`, or the `-lys.zip` unpacked, from each piece's Mutopia page in `violinist/midis/index.json`). `node strings/test/lilypond.js` compares the two. Results on the 48 pieces (47,179 violin notes; Bach's Sonatas and Partitas, sonatas, three concertos with the orchestra in the same score, Paganini, Gounod):

| | Agreement with LilyPond's MIDI |
|---|---|
| Notes (same pitch, onset within 1/64 of a quarter) | 99.5 % |
| Onsets in seconds within 20 ms (tempo included) | 100 % |
| Same length | 99.3 % |
| Pieces with ≥ 97 % of notes | 46 of 48 |

The two below 97 % are cases where LilyPond's MIDI departs from the score:
- Paganini's Caprice 24 (91.8 %) is played through `articulate.ly`, which writes out ornaments, and LilyPond's MIDI leaves one variation silent.
- Mozart K. 379 (96.8 %): grace notes there shift LilyPond's main notes by a few ticks.

The scores carry their own articulation: 19.7 % of the note pairs are slurred, and 6.4 % of the notes are marked. Reading takes 2–50 ms for a Bach movement and 0.33 s for the whole Tchaikovsky concerto (3 movements, 41 staves). Unit tests are in `strings/test/lilypond.test.js`.

**In #034.** Open… and drag-and-drop take a `.ly`, a Mutopia `-lys.zip`, or several `.ly` files at once, for a piece split into `\include` files. The Track menu lists the staves of every movement, with the solo violin chosen by default. When includes are missing, the status line names them.


## Playing like a recorded violinist

For Bach's Sonatas and Partitas #034 can now play a piece as a real violinist did. Song → a Bach movement, then Performer → Emil Telmányi, John Garner, Ko Donghwi or MinJi Kim (47 recordings from the Bach Violin Dataset, public domain or CC BY; [violinist/performances](../violinist/performances/README.md)). The bowing still comes from the score or an edition (Articulation), because the audio does not show it; everything else comes from the player:

- **Timing.** Each note's onset and end as played, from the dataset's alignment. Where the player skipped a repeat our MIDI writes out, or took one it does not, one pass is kept and the clock follows the local tempo across the other ([build_performances.js](../violinist/tools/build_performances.js)).
- **Dynamics.** The recording's level inside the notes (RMS over 40 ms, 50 frames per second) becomes a lane of dynamics, which `performance.js` plays with the bow as it plays a CC11 lane: speed, force and contact point together. The rule-made phrase arches and swells are off, and so are humanized timing and attack pitch.
- **Left hand.** Each sustained note's pitch curve (normalised difference function, ±150 cents around the note, at the recording's own tuning) replaces our vibrato, landing error and drift: the player's vibrato, where it starts and stops, and their intonation. The measured swing is widened by 1.25, because the analysis window and the room narrow it (our own render with a known ±14-cent vibrato through the hall reads ±11.3).
- **Listen and correct.** Our instrument does not answer a lane the way the recorded violin did (bodies, strings and double stops differ), so the build plays each movement on the Source model, measures the level it got, moves the lane by the difference (averaged over ±0.15 s), and repeats three times. Without this the rendered note levels correlate 0.26–0.77 with the player's; with it 0.84–0.92.

`node strings/test/expression_ab.js [--recs=…] [--secs=300] [--model=source] [--body=phil]` compares, on five movements by the four players (whole movements up to 5 min), the recording's notes with ours at the player's timing played by our rules, and with the player's expression:

| | Rules (player's timing only) | Player's expression |
|---|---|---|
| Level, 0.25 s frames, correlation with the recording (median) | 0.26 | 0.87 |
| Note levels, correlation (median) | 0.21 | 0.89 |
| Pitch curve error on single notes, cents RMS (median) | 13.8 | 5.1 |
| Vibrato width on long single notes, ours / player's | ±12 / ±4–15 (one width for all) | ±4.4 / ±3.9 (Ko), ±12.8 / ±14.7 (Garner), ±10.0 / ±10.9 (Telmányi) |

On the Waveguide model (Iowa body), with the lane corrected for Source, the note levels still correlate 0.79. Our rules give every player the same ±12-cent vibrato; the players range from Ko's near-baroque ±4 to Garner's ±15. Tests: `node --test strings/test/expression.test.js` (4: measuring level, vibrato and intonation; storage; the renderer following a pitch curve and a lane; the correction).

### Aligning recordings to the score, and a lane per engine

Recordings outside the Bach Violin Dataset come with no alignment. [align.js](align.js) finds the MIDI file's notes in them: chroma and chroma-onset features (20 ms frames, 93 ms windows, after Müller and after Ewert, Müller & Grosche 2009) for the recording and for the score synthesised at the recording's average tempo; subsequence DTW at 5 frames a second over the whole file (so silence, applause and talk around it are skipped), steps keeping the tempo within ½–2× of the average; each way of taking the score's repeats (the LilyPond reader now returns them; `\repeat "volta"` with the quotes was read as no repeat) and, for old recordings, ±1–2 semitones are tried and the best kept; then the same DTW at 50 frames a second in a ±1.2 s band. Moving each onset to the nearest rise of its pitch's energy did not help and was dropped. `node strings/test/align_eval.js` on 12 dataset recordings (8,974 notes): within 32 ms of the dataset's alignment (median), 87 % within 100 ms, the repeats as the dataset says 12 / 12, and the note's pitch sounding in the middle of where it is placed 91 % of the time (the dataset's own alignment 83 %, so part of the difference is the dataset's). Two seconds a movement. Fifteen recordings are aligned so far ([violinist/performances](../violinist/performances/README.md#aligned-here)), four beyond Bach: Paganini's Caprice 24, Beethoven's Romance No. 2 and two of Vivaldi's Winter.

Repeats written out. Mutopia's MIDI files are made with `\unfoldRepeats`, so a repeat the player skips used to have no plan to match it. The LilyPond reader now keeps a written-out volta too (`unfolded: true`, with `keep`, the one pass played when the repeat is not taken), and `repeatPlans` tries it both ways. Beyond four repeats it tries all of them taken, none, and each one alone flipped from those two (2R + 2 plans, not 2^R): Caprice 24 has 11. On the QMUL Caprice this took the pitch-where-placed check from 39 % to 71 % (chance 13 %): the player skips the first variation's repeat. The solo part's notes are now the tracks on the violin's channel when the part is split across tracks, as Caprice 24's pizzicato variation is (1,593 notes, was 1,470), the same choice #037 and #038 make.

The dynamics lane is now corrected by listening on the Waveguide model too, and each engine plays its own (`applyRecording(…, { engine })`; the others take Source's). On five movements rendered on the Waveguide, the note levels correlate with the player's 0.86 with its own lane and 0.84 with Source's (`node strings/test/expression_ab.js --model=waveguide [--lane=source]`); Source with its own, 0.88. On five of the newly aligned recordings (Heifetz, Menuhin and three others): 0.86, pitch curves within 5.9 cents (14 to 17 with our rules).
