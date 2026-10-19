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
