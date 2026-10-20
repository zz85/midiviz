# Harmony analysis of MIDI: the theory, the algorithms, and what other apps do

Background for [#041 Harmony](../../041_harmony.html) and [harmony.js](../harmony.js).
The task: as a MIDI file loads, find its keys and its chords, name them
(symbols such as `G7/B`) and explain them (Roman numerals such as `V65`, tonic /
predominant / dominant, cadences), then show it in time while it plays.

## 1. What an analyst does

**Chords.** A chord is named by its root, its quality and its bass. The
qualities that cover most common-practice music are the four triads (major,
minor, diminished, augmented) and five sevenths (dominant, major, minor,
half-diminished, fully diminished). In the Kostka–Payne textbook corpus the
major triad is 43.6 % of the labels, the dominant seventh 21.9 %, the minor
triad 19.4 %, the diminished seventh 4.4 %, the half-diminished seventh 3.7 %
and the diminished triad 1.8 % (Pardo & Birmingham 2002, table 2). In the
Beethoven sonatas of BPS-FH: major 4,720 segments, dominant seventh 3,156,
minor 2,076, diminished seventh 665, diminished 370, minor seventh 184,
half-diminished 144, augmented sixth 97, augmented 35, major seventh 31 (our
count of the dataset). Pop and jazz add sus2/sus4, sixths, add9, ninths and
"power chords" (root and fifth).

**Inversion.** Root position has the root in the bass; first inversion the
third, second the fifth, third (sevenths only) the seventh. Roman numerals mark
it with figured-bass numbers: triads `I`, `I6`, `I64`; sevenths `V7`, `V65`,
`V43`, `V42`. Chord symbols use a slash: `G7/B`.

**Notes that are not in the chord.** Most of the notes in real music are chord
tones, but melodies move through passing notes (stepwise between two chord
tones), neighbour notes (step away and back), suspensions (held over from the
previous chord, resolving down), appoggiaturas (accented, leapt to), anticipations
and pedal points (a held bass under changing chords). Analysts discount them,
and judge them by rhythm: a non-chord tone is usually short and weak, a chord
change usually lands on a strong beat. The harmonic rhythm (how often the
chord changes) is usually steady within a passage.

**Keys.** A key is a tonic and a mode. Music modulates: a sonata's second theme
is in the dominant (major) or the relative major (minor), and development
sections travel. Brief tonicizations, a `V7/V` on the way to `V`, don't count
as modulations. Most analysts label the local key per passage.

**Roman numerals.** The chord's root as a scale degree of the local key, upper
case for major / augmented, lower for minor / diminished, `°` diminished, `ø`
half-diminished, `+` augmented. In minor, the raised leading tone makes `V`
major and `vii°` diminished. Chromatic chords have their own names: applied
(secondary) dominants `V/x` and leading-tone chords `vii°7/x`; mixture from the
parallel mode (`iv`, `♭VI`, `♭VII` in major); the Neapolitan `N6` (major on
♭2, usually in first inversion); augmented sixths (Italian, French, German) on
♭6 resolving to `V`.

**Functions.** Riemann's three: tonic (`I`, `vi`, `iii`), predominant /
subdominant (`IV`, `ii`, and `vi` going to them), dominant (`V`, `vii°`). Phrases
go T → PD → D → T. `I64` before `V` is the cadential six-four, a dominant.

**Cadences.** Perfect authentic (`V`–`I`, both in root position, on a strong
beat; strictly also the tonic in the melody), imperfect authentic (one of them
inverted or no tonic on top), half (phrase ends on `V`), deceptive (`V`–`vi`;
`V`–`VI` in minor) and plagal (`IV`–`I`).

**Spelling.** In C major the chord on the raised fourth degree is `F♯dim7`, not
`G♭dim7`, because it leads to G. Analysts spell chords from their function, so
a program has to name keys and chords on the line of fifths, not on the twelve
pitch classes.

Sources: Kostka, Payne & Almén, *Tonal Harmony*; Open Music Theory,
[Roman numerals](https://viva.pressbooks.pub/openmusictheory/chapter/roman-numerals/);
Masada & Bunescu 2018, appendix A (chord types) and B (figuration).

## 2. Published algorithms

### Key finding

- **Krumhansl–Schmuckler** (Krumhansl 1990): correlate the piece's
  pitch-class durations with a profile for each of the 24 keys; highest
  correlation wins. The profiles came from listeners rating how well each
  pitch fits a key (Krumhansl & Kessler 1982).
- **Better profiles** from corpora: Temperley–Kostka–Payne (2007; textbook
  excerpts, counts of segments containing each pitch class), Aarden–Essen
  (2003; folk melodies), Bellman–Budge (2005; chords), Sapp's simple weights.
  Albrecht & Shanahan (2013) trained on large corpora and found theirs best on
  minor keys but not significantly better than Aarden, Bellman or Sapp. music21
  ships all of these (`analysis/discrete.py`); harmony.js uses its values.
- **Local keys**: run the correlation in windows and smooth; Temperley's
  Melisma key program (a preference-rule model) and HMMs over keys add a cost
  per modulation. Key finding from the *chords* is what analysts actually do:
  the key in which the chords are diatonic, with dominants that resolve.

### Chord labelling and segmentation

- **Template matching** (Pardo & Birmingham, *Algorithms for Chordal Analysis*,
  CMJ 2002). Split the music at every onset and offset ("partition points").
  Score a segment against each of 72 templates (6 qualities × 12 roots) as
  P − (M + N): P the weights of notes in the template, N of notes not in it, M
  the template tones missing. A note's weight is the number of minimal
  segments it spans. Ties broken by root weight, prior frequency, and by
  resolving diminished sevenths by step. Given the right segmentation it labels
  88.7 % of the KP corpus correctly; finding the segmentation itself (best path
  through a DAG of segments, "HarmAn" search in linear time) gets 75.8–76.5 %.
  Their error analysis: passing tones, ties, pedal tones, missing context. They
  suggest bass weighting and beat information. No key, no metre, no voice
  leading.
- **Preference rules** (Temperley & Sleator, *Modeling Meter and Harmony*, CMJ
  1999; Temperley, *The Cognition of Basic Musical Structures*, 2001; Melisma).
  Roots are chosen to be compatible with the notes, changes prefer strong
  beats, roots stay close on the line of fifths, and ornamental dissonances are
  explained by step resolution. Solved by dynamic programming. Roots only, no
  qualities.
- **Sequence models**: HMMs over beat- or onset-synchronous frames (Raphael &
  Stoddard 2003); HMPerceptron (Radicioni & Esposito 2010) on Bach chorales.
- **Semi-Markov CRF** (Masada & Bunescu, ISMIR 2017; TISMIR 2019,
  [arXiv:1810.10002](https://arxiv.org/abs/1810.10002)). Labels whole
  segments, so it can use segment features: purity (share of the segment's
  note durations in the chord), coverage of root / third / fifth / seventh, the
  bass, metrical accent at the boundary, figuration heuristics (passing,
  neighbour, suspension, anticipation), chord bigrams. Event accuracy for full
  chords: BaCh chorales 83.2 %, TAVERN (Mozart / Beethoven variations) 78.0 %,
  KP 73.0 %, a rock corpus 70.1 %. Root only: BaCh 88.9 % (Melisma 84.3 %),
  TAVERN 86.0 % (Melisma 76.7 %), KP 79.3 % (Melisma 81.9 %). Without the
  metrical-accent features BaCh drops from 83.6 % to 77.7 %.
- **Neural Roman numeral analysis**: CRNN on 32nd-note frames (Micchi et al.
  2020), the Harmony Transformer (Chen & Su 2019/2021), AugmentedNet
  (Nápoles López, Gotham & Fujinaga, ISMIR 2021: a CRNN with separate bass and
  chroma inputs, synthetic training data, many auxiliary tasks), ChordGNN
  (Karystinaios & Widmer, ISMIR 2023: a graph network over notes). They predict
  key, degree, quality, inversion and root as separate tasks. On the BPS
  Beethoven test split, chord symbol recall (share of time correct):

  | model | key | degree | quality | inversion | root | Roman numeral |
  |---|---|---|---|---|---|---|
  | Micchi 2020 | 82.9 | 68.3 | 76.6 | 72.0 | – | 42.8 |
  | AugmentedNet 2021 | 85.0 | 73.4 | 79.0 | 73.4 | 84.4 | 45.4 |
  | ChordGNN + post 2023 | 82.0 | 71.5 | 74.1 | 76.5 | 82.5 | 49.1 |

  (Karystinaios & Widmer 2023, table 1.) A full Roman numeral, all parts right,
  is right about half the time even for the best models; human analysts also
  disagree about chords, segment boundaries and keys.
- **BACHI** (Yao et al. 2025, arXiv:2510.06528): boundary detection, then root,
  quality and bass decoded in order of confidence, "as in ear training". Also
  POP909-CL, a corrected pop dataset.

### Datasets

KP corpus (46 textbook excerpts), BaCh (60 Bach chorales), TAVERN (27 sets of
variations), BPS-FH (first movements of Beethoven's 32 sonatas, Chen & Su
2018; [github](https://github.com/Tsung-Ping/functional-harmony), GPL-3.0),
When in Rome and the DCML corpora (about 1,700 works between them),
POP909(-CL) for pop.

## 3. How other apps do it

| app | what it does | how (as far as documented) |
|---|---|---|
| **Logic Pro 12** | *Chord ID*: drag an audio or MIDI region onto the Chord track, or Chords → Analyze Chords; writes a chord group. The control bar also names the chord of the selected or playing notes | Not documented. Users report it works "with varying degrees of success depending on how complicated the source MIDI is" (pianoandsynth.com) |
| **Cubase** | Project → Chord Track → *Create Chord Symbols* from selected MIDI, or drag a part onto the chord track; *Chord Assistant* proposes progressions | One symbol per change of the sounding set; users say it "always transfers the chord (or cluster) to the Chord Symbol", so passing notes make chords (Steinberg forum) |
| **Studio One** | Drag a MIDI or audio clip to the *Chord Track*; chords are detected and can drive other tracks | Not documented |
| **Melodyne** (in Studio One and stand-alone) | Chord Track and chord recognition from audio | Polyphonic pitch detection, then chord recognition |
| **Dorico** | Write → *Generate Chord Symbols from Selection*; the dialog lets you set how much surrounding music to take into account | Per rhythmic position, with a context setting (Steinberg manual) |
| **MuseScore 4** | No built-in recognition ("there's no automatic way", MuseScore forum, 2024); plug-ins such as *Chord Identifier (Pop & Jazz)* and *ChordID* write chord symbols from the notes, and m13253's *automatic chord identifier* also colours notes by their role (root, third, seventh) | Vertical sonorities per onset or beat |
| **Scaler 3 / Scaler Detector** | Detect chords and key from MIDI (and audio); lists detected chords and the scales that fit | "Detecting MIDI in Scaler 3 does not take into account chord duration or timing. It simply presents a list of detected chords" (Scaler forum) |
| **Ableton Live 12** | No chord recognition built in; MIDI Monitor shows chord names; Live 12 extensions and Max for Live devices (e.g. Kord Detect, HyperChord) name chords per bar | Third-party: per-bar or per-onset matching, Roman numerals from the Set's key |
| **Hooktheory / Hookpad** | Writes everything as Roman numerals in a key chosen by the user | Input is already chords |
| **tonal.js** `Chord.detect` | `["E", "G#", "B", "C#"] → ["E6", "C#m7/E"]` | Pitch-class set lookup in a chord dictionary, the first note taken as the bass; no time |
| **music21** | `chordify()` slices at every onset ("salami slicing"), `roman.romanNumeralFromChord(chord, key)`; `analyze('key')` with the profiles above, windowed analysis | Vertical, no segmentation beyond the slices |
| **MIDI plug-ins** (e.g. Dusk Audio Chord Analyzer) | Name the chord being held: root, quality, slash bass, inversion | Instant lookup of the held notes |

Two families, then. Most DAWs and plug-ins name **what sounds at an instant**
(or in a bar) by looking it up: fast, live, and wrong whenever a melody note is
not in the chord or the chord is broken over time. The research systems
**segment and label together over the whole piece**, with metre, bass,
figuration and key. #041 does the second for files and the first for a MIDI
keyboard, and its *Instant lane* shows the first beside the second so the
difference can be seen.

## 4. What harmony.js does

1. **Slices.** Partition points at note onsets (chords struck together count
   once). In each slice a note weighs its duration in beats, × (1 + 0.6 ×
   (accent − 0.3)) for a strong beat, × 0.55 for the part only the sustain
   pedal holds, decaying with its age so a long-held note does not dominate
   later chords. Notes that look like non-chord tones are marked (see 4a).
2. **Bass.** A slice's lowest note votes for the bass only if it is within
   9 semitones of the lowest note in the surrounding two beats, so the upper notes
   of a broken chord don't. A chord's bass is its lowest chord tone sounding
   for at least a fifth of a beat.
3. **Keys, pass 1.** Beat histograms smoothed by a two-sided exponential
   window (6.7 beats), correlated with a key profile (Aarden–Essen by default),
   Viterbi over the 24 keys with a cost per modulation plus per step on the
   circle of fifths.
4. **Chords.** A semi-Markov Viterbi over partition points (a semi-CRF with
   hand-set weights): a segment's score is its length in beats × the fit of its
   best labels, where the fit is Pardo & Birmingham's in − out − missing
   (normalised; fifths may be left out, sevenths not; a marked non-chord tone
   that is not in the label is partly or wholly excused) plus the root sounding,
   the bass on the root or a chord tone, a quality prior, and the chord being
   diatonic and usual in the local key. Each change costs a constant, more off
   the beat, less on a strong beat; root motion down a fifth and a dominant
   resolving earn a bonus. Up to 18 beats per segment; repeated labels merge.
   The weights were tuned by coordinate ascent on the odd-numbered BPS
   sonatas (`--tune`), the even ones kept for testing.
5. **Diminished sevenths and augmented triads** are symmetric: the root is the
   one that resolves up by step (or a fourth for augmented), else the leading
   tone of the key, else the bass.
6. **Keys, pass 2.** A second Viterbi over the chords: a key gains when a
   chord is diatonic in it, more for its tonic, its dominant, and most for a
   dominant that resolves to the tonic; applied dominants that resolve inside
   the key are not counted against it. This moved BPS key accuracy from 65 to
   75 %.
7. **Roman numerals, functions, cadences, spelling** from the local key:
   applied chords, mixture, Neapolitan, German / Italian sixths, the
   cadential six-four; PAC / IAC / HC / DC / PC; names on the line of fifths
   from the key (the file's key signature decides F♯ vs G♭ major; local keys
   are spelled near the home key, so A♭ minor in an A♭ major piece), applied
   chords spelled from their target.
8. **Alternatives and confidence** per chord (the next best labels for the same
   span), shown on hover.

For a MIDI keyboard, `nameChord` names the held notes on their own, the way the
instant tools above do.

### 4a. Non-chord tones: passing notes, suspensions, appoggiaturas

`markOrnaments()` marks candidates before the chord search, from the notes
alone, after Masada & Bunescu's figuration rules (appendix B) with an
appoggiatura rule added:

| kind | rule |
|---|---|
| passing / neighbour | at most ¾ of a beat, approached by step from a note that just ended and left by step to a note that just starts, on a weaker beat than the note before |
| suspension (held) | a note held while a new chord arrives on a beat at least as strong as its resolution, dissonant with a voice that holds on (over the bass a 2nd / 9th, 4th or 7th; as the bass a 2nd or 7th under an upper voice), then stepping down (or up a semitone) to a note consonant with the bass. Only the part after the new chord is ornamental; the preparation is a chord tone |
| suspension (restruck) | the same pitch just ended as the note starts, dissonant, resolving down by step |
| appoggiatura / accented passing | struck dissonant on a stronger beat than its resolution, resolving by step; "accented passing" when it was also approached by step |

A dissonance that would make a seventh chord with the other sounding notes is
not a suspension (it is the chord's seventh). Each suspension gets its figure
(4–3, 9–8, 7–6, 2–3 in the bass).

Marking a note does not remove it. In the segment score a marked note counts
as "out" only by (1 − excuse) when it is not a tone of the label being scored,
and fully "in" when it is (excuse: passing / neighbour 0.7, suspension 1,
appoggiatura 0.5). So a marked note that is really a chord tone costs nothing,
and the search still decides. (Giving the resolution point a higher
chord-change cost as well made things worse on both corpora, so it was left
out.)

How often the marks are right: on BPS-FH 56–64 % of marked suspensions and
appoggiaturas are outside the analyst's chord, against 18 % of all notes; on
the When in Rome Bach chorales 83 % of marked suspensions are. Of the
suspensions in the analysts' labels (a note held or restruck into a chord it
is not in, resolving down by step to a tone of that chord), 77 % are marked in
the chorales and 48 % in the Beethoven.

What it changes (the "under suspensions" column is the share of time correct
inside those suspensions):

| corpus | | root | quality | inversion | Roman numeral | root under suspensions | root + quality under suspensions |
|---|---|---|---|---|---|---|---|
| BPS-FH even sonatas (held out) | without | 79.5 | 74.3 | 69.6 | 45.5 | 48.1 | 44.2 |
| | with | 80.3 | 75.7 | 70.3 | 46.3 | 54.6 | 50.4 |
| When in Rome, 371 Bach chorales | without | 77.6 | 72.7 | 73.0 | 37.2 | 73.3 | 61.8 |
| | with | 77.8 | 74.0 | 74.2 | 37.8 | 75.2 | 66.5 |

The chorales were never used for tuning (`harmony/test/wir_export.py` exports
When in Rome's analyses with music21's scores; `bps.js --corpus wir/chorales`
scores them). Their low key score (59 %) is mostly cadences in the relative or
subdominant key that the analysts label as tonicizations inside the home key.

### How well it does

`node harmony/test/bps.js` on BPS-FH (all 32 movements, the same CSR measure
as the table above, 1/8-beat frames; augmented sixths left out of root and
quality):

| version | key | root | quality | inversion | Roman numeral |
|---|---|---|---|---|---|
| templates + segmentation, key pass 1 | 65.4 | 75.4 | 67.5 | 66.2 | 32.8 |
| + key pass 2 (from the chords) | 75.0 | 75.4 | 67.5 | 66.2 | 37.5 |
| + bass from the lowest nearby note, strong-beat changes | 76.2 | 76.8 | 69.7 | 69.7 | 44.9 |
| weights tuned on the odd sonatas, all 32 | 76.5 | 80.6 | 76.2 | 71.2 | 48.1 |
| the same, even sonatas only (held out) | 75.4 | 80.4 | 75.7 | 70.5 | 45.6 |
| + suspensions and appoggiaturas (4a), all 32 | 76.8 | 80.7 | 76.6 | 71.4 | 48.6 |
| the same, even sonatas only (held out) | 76.5 | 80.3 | 75.7 | 70.3 | 46.3 |

These are not directly comparable with the neural models' rows (they report
the BPS *test* split, and were trained on the rest of the corpus and more),
but the scale is the same: 2–4 points behind the trained models on root, between
them on quality (75.7 vs 74.1–79.0), 3–6 behind on inversion, 7–10 behind on
key, and the full Roman numeral at their level (45.6 held out vs 45.4–49.1). Most remaining key errors are the subdominant or the relative key: a
passage in the dominant that the analyst hears as still in the tonic, or the
reverse. Quality errors are mostly a passing seventh made part of the chord or
left out, which human analysts also argue about.

It is fast enough to run on load: 0.4 s for Bach's BWV 846 (3:46, 1,284 notes), 1 s for Chopin's Polonaise Op. 53 (5:52, 6,052 notes), in a worker.

## 5. Limits and ideas

- No voice separation: the non-chord-tone rules (4a) look for a step in any
  voice, so in thick piano textures a step between two different voices can
  look like a resolution. Anticipations and pedal points are not marked yet.
- Performances recorded without a click have no usable beat grid (the file's
  tempo map does not follow the player). The page falls back to ignoring metre
  when fewer than 60 % of onsets sit on the grid. A beat tracker would help;
  the #040 rhythm work could feed it.
- Jazz harmony (altered dominants, 11ths, 13ths, upper-structure triads) and
  modal music need more templates and a modal key model.
- A trained model gains several points on key: [#042](../../042_augmentednet.html)
  runs AugmentedNet on onnxruntime-web ([notes](../../augnet/README.md)), and
  #041 can take its keys (Keys → AugmentedNet; `analyze(notes, { keys })`).
  The keys replace both key passes; chords, numerals, non-chord tones and
  cadences are still harmony.js's. Scored with `bps.js --keys augnet --spell key`
  (the notes spelled as for a MIDI file):

  | | key | root | quality | inversion | Roman numeral |
  |---|---|---|---|---|---|
  | 7 BPS test movements, #041's own keys | 75.3 | 82.6 | 79.6 | 75.4 | 52.0 |
  | the same with AugmentedNet's keys | 80.6 | 82.8 | 80.1 | 75.8 | 55.6 |
  | AugmentedNet alone | 80.9 | 83.1 | 79.9 | 74.8 | 52.6 |
  | 353 chorales AugmentedNet did not list, #041's own keys | 59.6 | 77.8 | 73.8 | 73.9 | 37.7 |
  | the same with AugmentedNet's keys | 71.9 | 77.8 | 73.8 | 73.9 | 46.4 |
  | AugmentedNet alone | 72.5 | 84.3 | 84.8 | 86.1 | 57.3 |

  On the Beethoven the mix is better than either alone. On the chorales,
  AugmentedNet's own domain (it was trained on chorale analyses in the same
  style), it is better at everything. harmony.js was tuned on five of the seven
  Beethoven movements, which flatters its rows a little; AugmentedNet never saw
  them.
