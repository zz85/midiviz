# Changelog

What each experiment does and how, newest first. The short list is in the [README](README.md).

## 21 Oct 2026


[Experiment #046 - Score fingering](046_score_fingering.html) ([notes](score-fingering/README.md))
- Take or open a photograph or multi-page PDF of printed music. A dedicated worker runs ScoreShift's staff-first OMR locally, keeps the normalized page and every notehead's coordinates, assembles parts / measures / voices, and sends the selected part to the string fingering planner. The ScoreShift browser closure is snapshotted under [score-fingering/scoreshift](score-fingering/scoreshift/README.md) at source commit `396f4619`, including pdf.js 6.3.289 and its JBIG2 / JPEG 2000 wasm decoders; MidiViz needs no sibling checkout or network service.
- **Try viola PDF** now opens the supplied 17-page, 720×936 pt Sibelius *Symphony No. 2* viola part. Its first page exercises 9 alto-clef staves, 174 detected notes and 48 assembled measures; auto viola removes the 84 range rejections produced by forcing violin.
- Auto (the default) chooses violin or viola from an unambiguous filename, the selected part's clefs and viola-only low range, carrying strong evidence for that part across PDF pages; manual Violin/Viola overrides remain. Standard / beginner / expressive / fewest-shifts style, tempo-sensitive shift costs, and a part selector cover ensemble scores. Up to four exact k-best Viterbi paths under the recommended held-safe constraints are ranked for the whole passage; alternatives are filtered to distinct string, finger or position choices.
- The photographed page gets larger, slightly softened, uncircled handwritten graphite finger numbers above each complete note, including upward stems and beams; chord fingers form a vertical stack. The colored string-change and hand-position badges are hidden by default; **string / position details** shows them beside their noteheads. Chord notes that do not fit one player's strings/hand frame keep ordinary independent divisi fingerings; the explanation remains in status and the note popup rather than adding warning circles. Pick a complete path, or tap one note to lock its string and re-plan around that decision. The same popup moves a recognized pitch by staff step, changes its accidental or removes a false note. **recognition** shows ScoreShift's pitch reading; **Annotated PNG** flattens the selected fingering onto the normalized photograph.
- PDFs get lazy thumbnails and stable per-page records: navigation restores each page's recognized model, pitch corrections, string locks, selected part, selected alternative and keyboard position without recognizing it again. A title/text page is shown unchanged; recognition failures are shown separately and block whole-file export. The 100 MB / 100-page input limit, two-page LRU raster/model cache, 64 MB encoded-export limit and one-at-a-time temporary export pages bound memory while compact corrections survive eviction. **Annotated PNG** names the current PDF page; **Annotated PDF** snapshots its settings, preserves page order and point sizes, flattens each cached selected fingering, recognizes unopened music pages with defaults, and JPEG-preserves pages with no staves.
- [strings/fingering.js](strings/fingering.js) now exposes immutable `solveFingering()` and `suggestFingerings()` APIs while retaining `fingerLine()` / `fingerHeld()` for #033, #034, #037 and #038. Inputs and custom profiles are validated, every accepted cost is finite, rejected notes and unresolved held-string collisions have diagnostics, repeated solves leave no stale fields or generated locks, and held voices use a bounded constraint search. Ranked alternatives use an exact heap-merged k-best recurrence with compact backpointers; a 1,000-event / 24-path stress passage takes about 1.2 s here.
- Tests: 48 fingering contracts, including stable `1–2–3–2–1–3–2` continuity and independent divisi fallbacks for over-capacity chords; [score-fingering/test/adapter.test.js](score-fingering/test/adapter.test.js), [document.test.js](score-fingering/test/document.test.js) and [integration.test.js](score-fingering/test/integration.test.js) cover source mapping, ties, correction-stable IDs, incompatible-lock warnings, isolated page state, PDF writer order/sizes and local OMR fixtures (the 4-staff, 96-note, 24-bar minuet plus a 30-note / 8-grace oracle checked through 260 bpm). [browser.mjs](score-fingering/test/browser.mjs) checks the generated photo's four paths, the 17-page Sibelius sample's auto/manual instrument behavior, manual locking, recognition correction, deletion, keyboard focus/scrolling, stale and overlapping loads, worker failure/preemption, operation-owned busy state and 320 px / DPR 2 layout; its PDF path checks a title page, three thumbnails, unopened-page recognition, cached corrections/locks/alternatives, page-aware PNG and a re-readable three-page Letter PDF. Textbook quality stays 29/33 exact / 96.2% note agreement and 4/5 scales / 96.4%; TNUA is 82.1% string, 67.6% finger, 64.9% joint and 74.8% soft over 10,870 notes × 10 annotations.

Expression for pieces no one has recorded ([strings/expression-model.js](strings/expression-model.js)), and #038 from the score
- A model predicts from the score how a violinist would time a piece and shape its dynamics. It is fitted by [violinist/tools/fit_expression.js](violinist/tools/fit_expression.js) on the 62 recordings in violinist/performances (37 pieces, mostly Bach's Sonatas and Partitas) into [violinist/expression-model.json](violinist/expression-model.json) (2 KB). Each onset gets 42 features read from the score alone: its length and place in the bar, where it sits in its phrase, its height against the line around it, slurs and leaps, fermatas and ornaments, the approach to an arrival (a note twice as long as the run before it), and the last bars of the piece and of each repeated section. Two ridge regressions give the onset's local tempo (over at least a beat, as a log ratio to the player's median) and its dynamic (the lane the recordings play with on the Source model). A learned swell shapes long notes, and the score's written dynamics and hairpins set the level underneath.
- Checked on pieces it was not fitted on (each piece left out in turn, with all its recordings): tempo r 0.25 per onset, 0.31 for the tempo curve; dynamics r 0.39. As a ceiling, two violinists playing the same piece agree at tempo r 0.39 and dynamics r 0.36, so the dynamics are as close to a player as another player is. Through #034's Source model, on 9 held-out recordings, the rendered notes' levels follow the player at mean r 0.20 against 0.14 for the rules used before (higher on 6, lower on 2). Fitted to the least error, the predictions are an average player's, flatter than any real one, so the pages play the tempo at 1.5 × and the dynamics at 2 ×; the local tempo then moves about ±5–10 % with a final ritardando, and the piece keeps its length.
- **Performer: modelled from recordings** is the new default in #037 and #038 for every piece; the accompaniment follows its tempo. **As written** (`?performer=none`) and the recorded performers are unchanged. With it, renderPerformance leaves out its own phrase arches and swells (`expression.phrased`) but keeps the intonation and vibrato rules.
- [#038 Duo](038_duo.html) now plays from the score too, as #037 does: the violin from the Mutopia LilyPond source, the pianist the score's piano (or orchestral) staves, the pedal still from the MIDI file. **Notes: score / MIDI file** (`?src=midi`). The bowing for score notes moved to `bowScore()` in [violinist/score-play.js](violinist/score-play.js), shared by both pages.
- The LilyPond reader keeps fermatas (`art.fermata`), and planned articulation keeps grace notes, ornaments and fermatas on the note (they were dropped when the bowing was planned).
- Tests: [strings/test/expression_model.test.js](strings/test/expression_model.test.js) (a score played by the model; the held-out figures). `node violinist/tools/fit_expression.js --agree` prints the two-player agreement, `--render` the comparison through the Source model, `--write` refits.

[Experiment #037 - Violinist](037_violinist.html): the score is the input
- #037 now plays each piece from its Mutopia LilyPond source (violinist/scores, read by [strings/lilypond.js](strings/lilypond.js)) instead of the MIDI file LilyPond made from it. [violinist/score-play.js](violinist/score-play.js) turns the score into the solo and the accompaniment; **Notes: score / MIDI file** switches back (`?notes=midi`).
- From the score: its slurs, strokes and bow signs on the notes themselves; its dynamics and hairpins (`\<`, `\>`, `\cresc`, ending on the next dynamic or a step away at `\!`) as each note's loudness, where 43 of the 48 MIDI files give every violin note the same velocity; grace notes realised as written (appoggiaturas on the beat for half the note, two thirds when dotted; `\grace` and `\acciaccatura` about 70 ms on the beat; `\afterGrace` at the end of the note before), 216 grace notes over the 48 pieces; every other staff of the movement as the accompaniment with its GM instrument, and `\set Staff.midiInstrument` changes inside a part (the Tchaikovsky strings' pizzicato).
- 99.55 % of the 47,324 MIDI violin notes pair with a score note (the same pitch at the same place). A recorded performer's timing and pitch curves, and the Herrmann / Auer bowings, are both aligned to the MIDI's notes, so they are applied there and carried over to the paired score notes; the rest (grace notes, notes LilyPond's MIDI dropped) follow the recording's tempo map.
- With the GM soundfont violin, the dynamics are now audible: the MIDI path played everything at the file's velocity (often 127) and ignored its CC7 lane, so quiet passages may sound quieter than before.
- Tests: [strings/test/score_play.test.js](strings/test/score_play.test.js) (hairpins, grace notes, all 48 sources). The 48-file LilyPond check is unchanged (99.5 % of notes).

[Experiment #045 - Path-traced Pianist](045_pathtracer.html) ([notes](pathtrace/README.md))
- #032 moved to three.js r185, with two GPU path tracers rendering the frame the page draws: three-gpu-pathtracer 0.0.27 (WebGPU, and its deprecated WebGL tracer) and MuTracer 0.1.3 (WebGPU, WebGL 2), vendored as browser modules by [pathtrace/tools/vendor.mjs](pathtrace/tools/vendor.mjs)
- Path trace menu: a still of the current frame by one tracer or all of them, split against the raster picture, with setup, first-sample, tracing and denoising times; OIDN or JNLM denoising; the page's bloom, grain and vignette run on the traced picture ([pathtrace/post.js](pathtrace/post.js)). Render → Renderer exports a video with every frame traced; Camera → Inside the piano leaves out the director's shots that look into the strings (the slowest part to trace)
- [pathtrace/snapshot.js](pathtrace/snapshot.js) freezes the stage for both tracers: skinning on the CPU, instancing expanded, shader patches dropped, the fallboard mirror as lacquer, the strand hair as camera-facing ribbons (`bakeStrands()` in [pianist/hair.js](pianist/hair.js)), the page's falloff-free lights as inverse-square ones, the reflection panels ray cast into an equirectangular map
- MuTracer first rendered much darker, with white hair. Three causes in MuTracer 0.1.3, worked around here: soft spots never reach full strength (the stage's peaked at 0.4–4 %), the environment map is read upside down (`flipY` ignored), and the three.js converter drops vertex colours. Test scene [pathtrace/test/mini.html](pathtrace/test/mini.html): spot 13 → 65 against three-gpu-pathtracer's 77, sky from above 1 → 183 against 189
- Open: MuTracer's WebGL 2 fallback renders the full stage blank on SwiftShader; no GPU timings recorded yet
- Tests: `node pathtrace/test/stills.mjs`, `node pathtrace/test/video.mjs`, `pathtrace/test/mini.html?test=…`

Songs: ornaments in the engraved Bach files ([notes](midis/README.md#sources--credits))
- The 15 Well-Tempered Clavier files and the Goldberg Variations came from Mutopia's LilyPond MIDI, which plays no trills, mordents or turns and turns grace notes into 55 ms blips before the beat. [midis/tools/bach_ornaments.mjs](midis/tools/bach_ornaments.mjs) reads the LilyPond sources, lines them up with each file note by note (longest common subsequence on onset order and pitch: 99.6–100 % of score notes found, 92 % in BWV 857's prelude, whose doubled unisons LilyPond merges), and writes the ornaments out after Bach's 1720 table: trills from the upper note (from the main note when the upper note was just played), about 12 notes a second fitted to the beat, long trills starting slower; short trills, mordents, turns, trills with turn or mordent endings; appoggiaturas on the beat taking half the note (two thirds when dotted); grace notes on the beat; after-graces at the end of the note. Auxiliary notes are diatonic, chosen from the pitches heard in the same and neighbouring bars. Dynamics and timing of every other note are unchanged.
- The Well-Tempered files first gained 121 ornaments and 18 grace-note groups, the Goldberg 185 and 113 (Aria counted twice). Their note counts now come within 5 % of the pianists' in MAESTRO.
- [strings/lilypond.js](strings/lilypond.js) keeps ornament signs on the note (`art.orn`), keeps grace notes with `{ graces: true }`, and reads `\scaleDurations #'(4 . 6)` (Goldberg Var. 26's 18/16 hand was too slow). Its tests and the 48-file Mutopia check are unchanged.
- Two more sources of ornaments for the Well-Tempered Clavier: the Bach-Gesellschaft edition as encoded by CCARH ([humdrum-tools/bach-wtc](https://github.com/humdrum-tools/bach-wtc), read by [midis/tools/kern.mjs](midis/tools/kern.mjs), a small Humdrum **kern reader; 99.6 % of its notes line up with Mutopia's), which adds 22 signs Mutopia lacks (14 in the B minor prelude) and gives every trill and mordent its interval; and a subject rule for the fugues: the subject is found (the first voice until another voice brings in its first four notes), its entries are found by rhythm and intervals (tonal answers allowed), and a sign on one entry is played on all of them, 20 more (WTC II No. 1's mordent on all 14 entries, WTC I No. 24's cadential trill). WTC total now 164 ornaments. Still fewer than the pianists play in WTC I Nos. 15, 17 and 20 and WTC II No. 1, where they add their own
- [strings/lilypond.js](strings/lilypond.js) notes also carry their voice (`art.vk`), so the voices of a staff can be told apart
- 14 MAESTRO v3.0.0 performances of the same preludes and fugues added beside them in the song list, for comparison (CC BY-NC-SA 4.0).

## 20 Oct 2026

YouTube Shorts for [#032 Pianist](032_pianist.html) ([notes](pianist/README.md#youtube-shorts))
- Render → Format → YouTube Short: 1080×1920, a clip of up to 3 minutes with its own camera plan (only spots framed for a tall screen, the hands first, cuts every 3–6 s on phrase starts, ending on the opening framing so the loop is seamless), the title and intertitles inside YouTube's safe area, fades so the loop doesn't click, and a ready description (`-short.txt`)
- A clip strip to choose it: energy, sections and phrases of the piece, edges that snap to phrase starts and ends, 15–90 s / whole-piece chips, three suggested clips with reasons ([pianist/shorts.js](pianist/shorts.js): a strong first 3 s, the loudest passage, a breath at the end), and a looped 9:16 preview with the safe area
- Layout: one picture, or stacked: her above and her hands below (split 50 / 50, 60 / 40, 40 / 60 or 2/3 / 1/3), each with its own camera, never cutting together; or a lesson view below, #030's falling notes in each hand's colour with finger numbers, lit keys and sparks ([pianist/lesson.js](pianist/lesson.js))
- Tests: `bun test pianist/test` (6 new); contact sheet `node pianist/test/shorts_sheet.mjs`

[Experiment #042 - AugmentedNet](042_augmentednet.html)
- AugmentedNet (Nápoles López, Gotham & Fujinaga, ISMIR 2021; MIT), a trained Roman numeral network, exported from Keras to ONNX (460 KB, [augnet/tools/export_augmentednet.py](augnet/tools/export_augmentednet.py)) and run on onnxruntime-web 1.30 in a worker; its input encoding and decoding ported from `inference.py` to JS ([augnet/augnet.js](augnet/augnet.js)), with the music21 tables it needs precomputed, so no Python or music21 in the browser
- From MIDI: onsets snapped to sixteenths and triplets as music21 does, notes spelled in two passes (music21's spelling, then each note nearest the local key the network found)
- Keys, chords and numerals in lanes, its frame-by-frame certainty, the voicing it predicts (bass / tenor / alto / soprano), and #041's analysis underneath with a strip where the two agree; 43 ms in the network for BWV 846, 84 ms for Mozart K. 545 i
- On the 7 BPS-FH movements it held out: key 80.8, root 84.0, quality 80.1, inversion 74.2 (published 85.0 / 84.4 / 79.0 / 73.4); #041 on the same: 75.3 / 82.6 / 79.6 / 75.4 ([notes](augnet/README.md))
- Tests: `node --test augnet/test/augnet.test.js` (4: the encoding matches the Python pipeline frame for frame on a Bach chorale, the decoding gives its 61 chords, onnxruntime-web matches Keras); `node harmony/test/bps.js --model augnet`

[Experiment #041 - Harmony](041_harmony.html)
- Chord and key analysis of a MIDI file as it loads and plays: chord symbols (`G7/B`, spelled from the key), Roman numerals (`V65`, `V7/V`, `N6`, `Ger+6`, mixture), tonic / predominant / dominant, cadences (PAC, IAC, HC, DC, PC) and local keys, on lanes over a piano roll whose notes are coloured by their role in the chord (root, third, fifth, seventh, not in the chord); a "now" card and a circle of fifths with the root's path
- Engine [harmony/harmony.js](harmony/harmony.js) (in a worker): Pardo & Birmingham's template scoring inside a semi-Markov Viterbi that segments and labels together, with the segment evidence Masada & Bunescu found matters (bass, metre, passing and neighbour notes, pedal), a key prior and root-motion preferences; keys by profile correlation (Aarden–Essen, Temperley–Kostka–Payne, Krumhansl–Kessler, Bellman–Budge, Sapp) and Viterbi, then a second pass from the chords (dominants that resolve)
- On BPS-FH (first movements of Beethoven's 32 sonatas, human analyses; weights tuned on the odd sonatas), held-out even sonatas: key 76.5 %, root 80.3 %, quality 75.7 %, inversion 70.3 %, full Roman numeral 46.3 % of the time (AugmentedNet 85.0 / 84.4 / 79.0 / 73.4 / 45.4, ChordGNN 82.0 / 82.5 / 74.1 / 76.5 / 49.1 on the BPS test split); 0.4 s for BWV 846, 1 s for the Polonaise Op. 53
- Keys → AugmentedNet takes the local keys from #042's network (on onnxruntime-web, ~150 ms) and keeps #041's own chords: on the 7 BPS test movements key 75.3 → 80.6 %, Roman numerals 52.0 → 55.6 % (AugmentedNet alone 52.6); on 353 Bach chorales key 59.6 → 71.9 %, Roman numerals 37.7 → 46.4 %
- Non-chord tones: passing and neighbour notes, suspensions (held or restruck, with their figure: 4–3, 9–8, 7–6, 2–3) and appoggiaturas are marked from the notes and excused only when they are not in the chord being scored; marked on the roll (s, a, ap, p, n). Inside the analysts' suspensions the root is right 54.6 % of the time instead of 48.1 % (BPS-FH, held out) and 75.2 instead of 73.3 % (371 Bach chorales from When in Rome, never used for tuning; root + quality 66.5 instead of 61.8 %)
- Triads, classical (sevenths) or pop / jazz vocabularies (sus, 6, add9, 9ths, 5); an Instant lane shows what a DAW-style chord display names onset by onset; MIDI in names the chord you hold; hover for alternatives and certainty; ← / → step by chord; export a MIREX `.lab` (Harte syntax) or a chord chart by bar
- [Research](harmony/research/01_harmony.md): the theory (qualities, inversions, non-chord tones, keys, numerals, functions, cadences, spelling), the algorithms (Krumhansl–Schmuckler and later profiles, Pardo & Birmingham, Temperley's preference rules, semi-CRFs, AugmentedNet, ChordGNN, BACHI), and how Logic, Cubase, Studio One, Dorico, MuseScore, Scaler, Ableton, tonal.js and music21 do it
- Tests: `node --test harmony/test/harmony.test.js` (11); `node harmony/test/bps.js [--split test] [--verbose] [--tune]` scores BPS-FH (GPL-3.0, clone it into the git-ignored `harmony/data/`); `--corpus wir/chorales` scores When in Rome exports (`python harmony/test/wir_export.py`, CC BY-SA)

[Experiment #040 - Rhythm](040_rhythm.html)
- Beats, tempo, meter, downbeats, swing and a step grid of the rhythm from the microphone (or a demo drum loop, or an audio file), live, in an AudioWorklet
- Engine [rhythm/](rhythm/README.md): SuperFlux onsets on a log filterbank, a comb-filtered autocorrelation tempogram as a tempo prior, and the bar-pointer beat HMM of Krebs, Böck & Widmer (madmom's DBN) run as a causal forward filter that predicts the next beat; a beat-level stage halves an eighth-note pulse when every other one is accented; meter (3 vs 4) from bar repetition, downbeats from the kick, onsets and harmonic change, duple / triple feel and the swing ratio from the onsets across the beat
- Scored live (128-sample blocks) on 34 songs (18 drum styles and 16 repo MIDIs, OxiSynth), clean and through a laptop-microphone model: beat F 88.3, AMLt 87.9, tempo right 78 % of the time (98 % allowing double / half), meter 33/34, 0.4–1.4 s to lock on drums; beats are reported 4–6 ms before they happen, at 1.5–3 % of a core
- Readout to 0.1 BPM, beat lamps with the downbeat, a timeline of onsets in three bands with detected and predicted beats, the tempogram, the rhythm grid; tap tempo (T), beat level Auto / Pulse / Half, tempo range, a metronome on the detected beat (M) compensated for input and output latency; settings in the address bar
- [Research](rhythm/research/01_beat_tracking.md): onset detection, tempo, beat trackers (agents, DP, bar-pointer HMMs, particle filters, neural activations), meter and downbeats, swing, and what madmom, BeatNet, Aubio, librosa and Essentia do
- Tests: `node --test rhythm/test/rhythm.test.js` (10); `node rhythm/test/eval.js` scores the corpus; `node rhythm/test/browser.mjs` runs the page in Chromium on the demo loop and a fake microphone

[Experiment #039 - Tuner](039_tuner.html)
- A chromatic and string tuner on the Web Audio input: the microphone (echo cancellation, noise suppression and auto gain off, device picker) or a built-in test tone in Source (bowed, plucked or sine, detune in cents, vibrato; `?source=test`)
- Detector [tuner/pitch.js](tuner/pitch.js), in an AudioWorklet ([tuner/tuner-worklet.js](tuner/tuner-worklet.js)): McLeod's NSDF by FFT autocorrelation (peaks compared after interpolation, so high notes with a weak fundamental are not an octave low), refined on the peaks at 2, 4, 8 … periods, then by a joint least-squares fit of DC and the first 8 harmonics; the window is sized to the note and trimmed to the onset after silence, with a level gate, a clarity gate, a median of 3 and smoothing in cents that jumps on note changes
- Accuracy on synthetic tones C1–C8: sine within 0.01 ¢, sawtooth within 0.15 ¢; first reading 5–10 ms after the onset above A3, 25 ms on E2, 50 ms on E1 (two periods); a reading every 5 ms (10 ms Precise); about 10 % of one core on low notes. Through Chromium's fake microphone a 110.255 Hz file read as A2 +4.0 ¢
- Fast / Balanced / Precise response (8 / 16 / 32 periods, 20–100 ms windows), needle gauge with the in-tune band (±0.5–5 ¢), a three-row strobe (1st, 2nd, 4th harmonic) that stands still in tune, 10 s history of cents
- Instruments: chromatic, guitar, bass (4 and 5), ukulele, violin, viola, cello, double bass, mandolin, with string buttons that keep the last offset measured on each string (+6.5 ¢ / −12 ¢, taken once the note has been steady for 200 ms, so you can check every string at a glance, and a sparkline of each string over the last 8 s you played it; C clears; click to lock one) and pure fifths from A for the bowed strings; A4 400–480 Hz, B♭ / E♭ / F transposition, sharps or flats, a reference tone at the target (R) and a concert A button always on screen (A, at the A4 setting), a green smiley when in tune (Display → smiley, `?smile=1`), hold (Space); settings in the address bar
- Installable and offline (PWA): [039_tuner.webmanifest](039_tuner.webmanifest) and icons ([tuner/icon.svg](tuner/icon.svg) → PNGs by `node tuner/tools/icons.mjs`); the shared [sw.js](sw.js) is handed the tuner's files on the first visit (~120 KB), so it opens and tunes with no network; an Install section in the menu (an Install app button where the browser offers one, otherwise the steps for the browser in use, and the rest under Other browsers); the panel starts minimised on phones and tablets (`?panel=1` opens it), with a two-column layout for landscape phones, and the stage keeps clear of notches when installed. `?sw=0` skips the service worker
- Strings only claim a reading within a semitone; between strings it reads as the chromatic note (an A3 on a guitar was "B3 −193 ¢")
- Tests: `node --test tuner/test/pitch.test.js` (10)

## 19 Oct 2026

[Liner notes](liner/README.md) for [#032 Pianist](032_pianist.html)
- X-Ray-style notes on a piece, written in Markdown and tied to bars (`m22`, `m22.3`), placed with the MIDI file's own time signatures and tempo map: captions while it plays (history, analysis, trivia, things to listen for), a notes panel (I: now / about / all notes / people and terms), sections on the seek bar, and a card when hovering a song
- First piece: Bach's Prelude in C, BWV 846 (`Prelude1.mid`), 6 sections, 18 notes with sources, 5 cards (Bach, the Well-Tempered Clavier, pedal point, diminished seventh, the Bach–Gounod Ave Maria)
- Intertitles: a few short lines marked for the screen (`screen: Paris, 1853 | Gounod will sing…` on a note, or a `# Intertitles` part), in cinematic type (Cormorant Garamond / Cinzel / Montserrat, letter-spaced kickers), faded in and out by the song clock with room to read; everything else stays in the panel. Or every note as a caption, or nothing
- Intertitle look: black and white by default (all white, black on light, warm gold), placed automatically away from the pianist or in a chosen corner, headings optional; the song title as an intertitle or the classic title card (off by default)
- Second piece: Beethoven's Moonlight Sonata, III. Presto agitato (`midis/mond_3.mid`), 8 sections, 24 notes, 11 intertitles (7 stories, 4 about the music), 6 new cards; `play:` maps score bars to a file that writes out the exposition repeat (`m21'` is the second time) and spreads the cadenza over four bars
- Video export: the same burned into the picture, and saved next to the MP4 as two YouTube subtitle tracks (the intertitles, and every note) and chapters, timed to the video
- Stories and analysis apart: history and trivia float (`aside:` / `## ~`), placed by a seeded generator, one every 20–30 s through the opening, then spread out; lines about the music are pinned and come when the passage they describe ends (`m188-m190`), in their own style (spaced Montserrat); the song title is off by default
- #038 Duo too: the same intertitles, panel and seek-bar sections (Notes menu), with notes for Gounod's Ave Maria (`violinist/midis/gounod_ave_maria.mid`): 6 sections, 19 notes, 10 intertitles (6 stories, the extra bar, 3 about the music), and a Gounod card
- Tests: `node --test liner/test/liner.test.js` (15)

Pedal and transport fixes
- OxiSynth itself sustains correctly (CC64 ≥ 64, per channel); the players lost pedal changes. Late CCs are now always sent (a skipped one left the pedal stuck), a seek restores each channel's pedals, modulation and expression as the song has them there, and unloading a song lifts its pedals. In `playback_controls.js` / `midi_clock_worklet.js` (#014–#024) and soundfont-engine's `MidiScheduler` (#025–#038)
- #023: resume after pause continued from 0 (every play reloaded the song into the clock worklet); it now keeps its position, and a seek while paused sticks
- Tests: `node --test test/playback.test.js soundfont-engine/test/scheduler.test.js` (11)

## 18 Oct 2026

[Experiment #038 - Duo](038_duo.html)
- The #037 violinist and the #032 VRoid pianist in her concert dress on one stage: he plays the violin part, she plays everything else on the #030 grand (fingered by `fingering/`, pedal from CC64)
- Violin sonatas (Bach, Handel, Mozart, Beethoven Op. 30 No. 2 and the Kreutzer), Gounod's Ave Maria, and three concertos with the orchestra on the piano
- An auto camera that plans the piece's takes in advance and follows the busier player, plus ten fixed views; menus for his model and outfit, her dress, the room and the ink outline ([notes](violinist/README.md#038-duo-038_duohtml))

[Experiment #037 - Violinist](037_violinist.html)
- An anime-style violinist (VRoid CC0 VRMs, cel shaded, Nodame Cantabile-like stage lighting) plays the solo part of a violin MIDI; the rest plays as accompaniment
- 48 Mutopia MIDIs: all of Bach's Sonatas & Partitas BWV 1001–1006, sonatas (Bach, Handel, Mozart, Beethoven Kreutzer), concertos (Bach, Vivaldi, Beethoven, Tchaikovsky), Paganini caprices ([list and credits](violinist/midis/README.md))
- Bowing from the score: each MIDI's Mutopia LilyPond source is in [violinist/scores](violinist/midis/README.md#their-scores-bowing-from-the-source) (243 files, 1.2 MB), and #034 / #037 / #038 put its slurs and marks on the MIDI's notes (99.5 % of the violin notes found; 20 % of note pairs slurred, 0 in the MIDI files; the editions carry almost no up / down bow signs); Bowing: score (default) / inferred / fixed rule in #037 and #038; for Bach's Sonatas and Partitas also the bowings of two printed editions on IMSLP (Herrmann 1900, Auer 1917) read from their scans by optical music recognition with ScoreShift and aligned onto the MIDI notes ([violinist/editions](violinist/midis/README.md#their-scores-bowing-from-the-source): 85–91 % of the notes found, up to 464 bow signs), and ⊓ / V signs now set the bow direction
- Rig [violinist/rig.js](violinist/rig.js): the #033 fingering, left hand and bow drive the body (violin hold from motion-capture angles, two-bone arm and leg IK, per-finger IK, sway, breath, head on the chin rest) ([notes](violinist/README.md))
- Research: [biomechanics](violinist/research/01_violinist_biomechanics.md), [character and look](violinist/research/02_character_look.md)

## 17 Oct 2026

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
- Articulation planner ([strings/articulation.js](strings/articulation.js)) and score input ([strings/score.js](strings/score.js)): Open… takes MuseScore .mscz / .mscx directly (3 and 4; on the OpenScore string quartets the same notes, slurs and marks as MuseScore's own MusicXML export, 99.4–99.9 %), LilyPond .ly as Mutopia publishes it (one file, its -lys.zip or all its .ly files; 99.5 % of the notes of the MIDI files LilyPond made from the same sources) and MusicXML / .mxl (MuseScore, Finale, Sibelius, Dorico) with their slurs, staccato, bowings and ties, a Track menu for the parts (a viola or cello part switches the instrument); MIDI performances are read as SWAM does (overlap slurs, gaps re-bow); score-export MIDIs, where every note touches, get slurs inferred from the music (by step, short, in beat groups). On the Bach Violin Dataset's editions of BWV 1001–1006 the inference agrees on 68 % of note pairs (slurred F1 50 %), the old fixed rule 60 % (F1 39 %); Articulation: Auto / Inferred / Fixed rule in the Bowing panel ([research](strings/research/06_articulation.md)); stroke types (spiccato bounced off the string, martelé pinched and stopped), repeats and dots under a slur played in one bow with a louré / portato pulse (4–5 / 8–9 dB) or re-bowed (Repeats in slurs, Portato slider), and slides from the plan (a score's slide marks, a performance's quiet overlaps, about one slow legato leap in 6 s), kept on one string by the fingering
- Auto bowing (Expression block): inside every note the contact point and bow force keep moving as a violinist's do (toward the bridge as a long note swells, lighter toward the tip, slow wander), shown on live Bow pressure / Bow position meters; and bow-force brightness, a tilt per string that follows the force, fitted per instrument to the Philharmonia pp → ff brightening (violin 521 cents; our strings had 15–80, the sawtooth-like same tone at every dynamic; `node strings/test/fit_tilt.js`)
- Performer: Bach's Sonatas and Partitas played as a real violinist did (Emil Telmányi, John Garner, Ko Donghwi, MinJi Kim: 47 recordings of the Bach Violin Dataset, public domain / CC BY): each note's timing, the recording's level as a lane of dynamics for the bow, and each sustained note's pitch curve (vibrato, intonation) measured from the audio ([strings/expression.js](strings/expression.js), [violinist/performances](violinist/performances/README.md)); the bowing still from the score. The lane is corrected by listening (rendered on the Source model and moved by the level difference, three times). Against the recordings, rendered note levels correlate 0.89 (0.21 with our rules at the same timing) and pitch curves differ by 5 cents (14) ([notes](strings/README.md#playing-like-a-recorded-violinist)); all the Bach movements are now in the Song menu
- More performers, aligned here: recordings that come with no alignment are matched to the MIDI's notes by [strings/align.js](strings/align.js) (chroma and chroma-onset features, subsequence DTW coarse to fine, every way of taking the score's repeats): Heifetz's Chaconne (1952), Menuhin's Preludio (1948), and seven more public-domain / CC0 / CC BY movements from Wikimedia Commons; on the Bach Violin Dataset it agrees with the dataset's own alignment within 32 ms (median) and finds the repeats each player took 12 / 12, and the note's pitch sounds where it places the note 91 % of the time (the dataset's alignment: 83 %). Kreisler and Zimbalist's Bach double concerto (1915) and a Beethoven concerto finale give the timing, the orchestra following. The dynamics lane is now corrected for the Waveguide model as well as Source (note levels r 0.86 with its own lane, 0.84 with Source's). Performer menus in #037 (timing and dynamics on the GM violin, the accompaniment following his tempo) and #038 (the physical violin with his pitch too, the piano following; the Bach solo movements, the double concerto and the Beethoven rondo added)
- Performers beyond Bach: a QMUL violinist's Paganini Caprice 24 (2014, public domain; timing, dynamics and pitch), and with orchestra for their timing Georg Kulenkampff's Beethoven Romance No. 2 (1932, two 78 sides joined), and two of Vivaldi's Winter (Air Force Strings 1999, Philip Milman's orchestra 2022). The aligner now tries leaving out the repeats that Mutopia's MIDI writes out (the Caprice: 39 → 71 % of notes heard where placed, chance 13 %), and more than four repeats (all, none, each flipped alone). `fetch_recordings.js` fetches 78 sets side by side and Internet Archive items. #038's song list gains the Caprices and the Romance
- Fitted to real violinists ([strings/test/perf_stats.js](strings/test/perf_stats.js), Bach Violin Dataset: four violinists, 401 sustained notes): vibrato on 68 % of notes (players 67 %), 6.45 Hz (6.55), ±13 cents (±13), from the start of the note (was a late bloom at 0.3 s), notes swelling 1.3 dB (1.6); A/B against Ko Donghwi's Bach ([strings/test/ab_recording.js](strings/test/ab_recording.js)); Source + Philharmonia, closest by ear, is the page's default
- Tests: `node --test strings/test/sound.test.js` (23: Helmholtz motion and intonation over the range, stability, vibrato, slides, bowing, DDSP synthesis, real-time speed, humanization, hybrid pitch, sustain, dynamics, legato and speed, interactive bow pressure, expression lane, play modes, harmonics, tremolo, oversampling, measured body, impulse-response body, Philharmonia body; the hybrid tests need ffmpeg)

[Research - Violin sound in the browser](strings/research/03_violin_sound.md)
- Samples, physical modelling (waveguide, SWAM), DDSP / MIDI-DDSP, RAVE / BRAVE, MIDI-to-audio diffusion (VIOLET, ViolinDiff), Suno-style and open text-to-music models (MusicGen, Stable Audio, ACE-Step, Magenta RealTime 2)

[Research - How commercial modelled violins get their sound](strings/research/05_commercial_violins.md)
- SWAM Solo Strings (pure physical and behavioural modelling: selectable bodies, interactive bow pressure, modelled player habits), Expressive E Soliste, Sound Magic Violin One, and what #034's physical models lack

[Research - Audio → MIDI / MusicXML](transcription/research/01_audio_to_midi.md)
- Options for transcribing audio in the browser: Basic Pitch, MuScriptor, the MT3 family, piano models (Transkun, Kong, Aria-AMT), streaming / low-latency piano, monophonic pitch (SwiftF0, PESTO), source separation, performance MIDI → score, and the runtimes (onnxruntime-web, Transformers.js, tfjs, ggml)

## 16 Oct 2026

[Experiment #033 - Violin & Viola Fingering](033_violin_fingering.html)
- Automatic fingering for violin, viola, cello and double bass (string, position and finger for every note, double stops and chords on adjacent strings; the bass with Simandl's 1-2-4, the 4→3 switch at the crook of the neck and thumb position, [research](strings/research/04_double_bass.md)), from exercises, MIDI tracks, typed notes, TNUA files, a MIDI keyboard or clicks on the fingerboard
- Research briefs: [what violinists do](strings/research/01_violinist_rules.md) (positions and finger patterns, shifting, string choice, open strings, Galamian / Flesch / Cooper scale fingerings, double stops, viola vs violin) and [published algorithms](strings/research/02_algorithms.md) (Sayegh, Maezawa, Nagata's HMM, the TNUA dataset and models, guitar tablature, bowing physics, violinist motion)
- Engine [strings/fingering.js](strings/fingering.js): time-aware Viterbi over hand-frame states, with distances from the fret formula (so the viola's longer string makes stretches harder); scale-book templates for long runs; styles beginner / standard / expressive / fewest shifts; hand size; `/A` string locks
- Tuned on the [TNUA dataset](https://github.com/Tsung-Ping/Violin-Fingering-Generation) (10 violinists): 64.5 % string + finger agreement (62.5 % held out, 57.1 % before tuning; violinists agree with each other 89.8 %); textbook exercises 19/23, three-octave scales 4/5 ([notes](strings/README.md))
- 3D: procedural violin / viola / cello / double bass (the cello and bass upright on the end pin, the bass with sloping shoulders; arched plates, f-holes, scroll, bridge, strings that press to the fingerboard and blur while sounding) with the bow; left hand on the #029 finger IK with shifts, fingers kept down and vibrato; bow strokes, slurs, retakes and string crossings
- 2D: scrolling string tablature (finger colours, position changes, shifts, red marks where the result differs from the book or the violinist) above a fingerboard map
- Tests: `node --test strings/test/fingering.test.js` (17), `node strings/test/bench.js`, `node strings/test/tnua.js [--tune]`

## 15 Oct 2026

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

## 14 Oct 2026

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

## 13 Oct 2026

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

## 1 Oct 2026

[Experiment #025 - Notation 3D](025_notation_3d.html)
- 3D sheet-music player inspired by "Note Bounce": extruded SMuFL notation, bouncing balls land on every onset
- Engraving by [nwc-viewer](../nwc-viewer/) (interpreter + scroll-layout typesetter), loaded from `../nwc-viewer/` (override with `?nwc=<url>`)
- Canvas2D → three.js bridge: nwc-viewer draws into a recording context; glyphs become InstancedMeshes, beams/stems/staff lines are extruded
- Own MIDI → notation builder (grand-staff split, onset-clipped durations, running accidentals, key detection, piano reduction)
- Loads MIDI, NWC and MusicXML; audio via soundfont-engine + MidiScheduler
- Views: tilted, flat, tabletop, low angle, free orbit · night ink / paper themes · bloom, ripples, particles, trails, shadows
- Layouts: single endless line, wrapped sheet, or Letter pages on a desk (nwc-viewer wrap/page modes) with a whole-page view and pan/crossfade/cut line changes
- Needs a server rooted at the parent folder locally, e.g. `cd .. && python3 -m http.server`

## 15 Mar 2026

[WebMscore Reference Renderer](webmscore.html)
- Load .mscz, .mscx, MusicXML, MIDI files and render via MuseScore's libmscore in WASM
- SVG/PNG/PDF/MIDI/MusicXML export
- Score metadata, parts, measure positions
- Interactive API console for experimentation

## 5 Jan 2026

[Experiment #023 - Synthesia Background Playback](023_synthesia_background.html)
- AudioWorklet-based MIDI scheduling (plays in background tabs)
- Reduced audio glitches via worklet timing
- Uses new `useBackgroundClock` option in PlaybackControls

## 3 Jan 2026

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

## 2 Jan 2025

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

## 27 Dec 2024

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

## 26 Jan 2021

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

## 4 Feb 2018

[Experiment #008 - Spiral path](008_spiral_path.html)
- Extension of 007, with the trails
- Follow cursor isn't the best, feels like a drawing app.
- Maybe it should have a life, and let interactivitiy move it.

## 23 Jan 2018

[Experiment #007 - Spiral](007_spiral.html)
- Draw notes as they place around in a spiral
- Fade notes away after drawing
- More ideas: follow cursor / trail / random,
- predraw vs continous simulation

## 21 Jan 2018

[Experiment #006 - Hammers](006_hammers.html)
- Visualize notes by abstract piano hammers
- also [test easing algorithms](test_fade.html)

[Experiment #005 - Keyboard](005_keyboard.html)
- Visualize notes on Keyboard

[Experiment #004 - SoundFont](004_soundfont.html)
- Use of [soundfont.js](https://github.com/danigb/soundfont-player) for audio samples

## 20 Jan 2018

[Experiment #003 - Balls with controls](003_ballsy.html)
- Balls + Controls

[Experiment #002 - Balls ](002_balls.html)
- Balls

[Experiment #001 - Piano Roll ](001_basic_piano_roll.html)
- Classic visualizations
