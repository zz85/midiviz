# Experiment #053 - OMR against the MIDI

[053_omr_eval.html](../053_omr_eval.html) reads every page of a printed orchestral part with
ScoreShift's optical music recognition and checks each note head it finds against a MIDI file of
the same music. The part is the viola part of Sibelius's Symphony No. 2 (17 pages, the Kalmus
reprint that #046 ships, `score-fingering/sample-sibelius-symphony-2-viola.pdf`); the MIDI is
pawchestra's `sibelius-2-{1,2,3-4}.mid`, sequenced by Jack Gilbert, copied into `midi/`.

The point is to measure the OMR where there is no MusicXML transcription, find where it fails,
and fix ScoreShift's `omr.js` (in `../random-sketches/vibes/scoreshift/`) where the errors cluster.
On this part the pitch accuracy went from 86.8% to 89.8% (see below for what the first 60.8%
figure was).

```
node omr-eval/eval.mjs [--pages 2-5] [--json omr-eval/results.json] [--reuse omr-eval/results.json]
node --test omr-eval/test/eval.test.mjs        # 9 tests: truth, alignment, tremolo folding, the viewer
node omr-eval/test/browser.mjs                 # the page in headless Chromium (serve ~/test on :8000)
```

The pages were rendered once with ScoreShift's tool:
`node tools/imslp_fetch.mjs --render <pdf> midiviz/omr-eval/pages 2400` (17 grayscale PNGs,
2400 px wide, 7 MB).

## Truth (`truth.mjs`)

`violaTruth()` lists every viola note of the three MIDI files in score order: onset, then low to
high, each with its movement, bar and beat (bars counted from the time-signature events; bar 1 is
tick 0). The Viola 1-4 tracks are merged by onset, and a pitch two tracks share at one onset is
one note, since the page prints it once. Two things about the MIDI had to be found out from the
page:

- The second movement's viola tracks are an octave low (Viola 1 spans MIDI 32-68, below the
  instrument's C string; aligned with the page as written, 0 of 955 notes matched, shifted up an
  octave 709). `MOVEMENTS` carries `transpose: 12` for it.
- Several passages in the other movements are an octave low too (the finale's theme at bars
  173-185 and 313-316, the second movement's bars 214-220). The evaluator marks a staff whose
  aligned heads read an octave above the MIDI, most of them or a run of eight among otherwise
  right heads, as `midiOctave`, and counts those heads as right: 211 heads.

The MIDI reader is a plain loop. A first version with a closure that advanced the byte index once
in about 20 runs lost the track names after the 26th track under node 26.7, so `violaTruth` also
checks that each file has the viola tracks it should.

## Alignment (`eval.mjs`)

`readPage` runs `normalize` and `analyzeAfter` (the previous page's key carried over, as the app
does) and maps the heads back to page pixels. `readingOrder` lists them system by system, left to
right; where a system has two braced staves (the divisi passages) the staves' heads are merged by
x, each column low to high, since the truth lists a chord's notes together.

`align` is an edit distance over the whole part at once (6,139 notes against 6,320 heads), on MIDI
pitch, so a missed or extra head costs locally rather than shifting everything after it. Costs, in
quarters: a wrong pitch 1, or 1/2 where it is an octave, a semitone or a step off (the misreadings
one head has: a clef, an accidental, a line), so a head pairs with the note it misread; a missed
note 1; an extra head 1; and 1/4 for a truth note the page prints no head for: `markRepeats`
marks a note that repeats the pitch of the onset before it within an eighth (a tremolo on one
note, written out in the MIDI and printed as one head with slashes), or the pitch of the onset two
back within a quarter while the one between differs (a tremolo between two notes, printed as two
heads under beams). Those 975 repeats, when skipped, are `folded` and leave the denominator.

Each head is then `match`, `wrong` (`octave`, `semitone`, `step` or `other`), `extra`, or `chord`
(an extra head at the same onset as a matched head of its system: a chord or divisi note the MIDI
leaves out, which the sequencer often played as one line), and each unmatched truth note is
`missed`, placed on the page between the heads around it. A staff is also told which bars it
covers, from the notes its heads aligned with.

## Results

`results.json` is the current run, `baseline.json` the heads ScoreShift read before the OMR
fixes, both re-scored with the same evaluator (`--reuse` aligns saved heads without reading the
pages again).

| | heads found | pitch right | wrong | extra | missed |
|---|---|---|---|---|---|
| ScoreShift before | 98.7% | 86.8% | 733 | 119 | 75 |
| after | 98.8% | 89.8% | 549 | 122 | 77 |

The first run of the evaluator reported 60.8% with the same reads. The difference is all in the
truth and the alignment: the second movement's octave (+9.3), the divisi staves merged by onset and
the tremolos folded (+9.5), the octave-low passages (+4.5), and the chord notes counted apart.
Each of those was found by looking at the worst staves on the page, which is what the viewer is
for.

The OMR fixes, in `omr.js`, each with a regression fixture in ScoreShift's `fixtures/`:

- **Clef changes inside a staff** (p. 4, 11, 16, 17): a cue-size G, C or F clef after a barline is
  found (`classifyChangeClef`, `findClefChanges`), no head is read inside it, and `clefAt(st, x)`
  gives the clef for each note, key change and measure. Three systems of p. 4 went from 27 of 81
  heads right to 75.
- **Opening clefs**: a G clef is at least 1.4 spaces wide (a brace piece at a divisi staff's start
  read as treble); a curl without the F clef's dots, whose bars were cut away with a beam they
  touched, is a C clef (p. 9: 48 heads a fifth off).
- **A staff found twice** keeps the copy whose five lines carry ink, not the one more slices
  support (p. 9: 32nd runs under three beams buried the top line and a slur passed for the
  bottom line, so every head of the staff read a step off).
- **Touching key-signature glyphs** (p. 7, six sharps): a component with four or more thin stems
  in the key zone is cut between them; a lone sharp-sized component that reads as an accidental is
  no note.
- **A flat's bare stem** before a head in a beamed run (p. 3), and the glyph classifier is no
  longer asked about strokes under 0.45 space wide, whose padded crop read a flat's stem as the two
  flats beside it.

What is left: 331 semitone errors, mostly accidentals in double stops and chromatic runs; the
braced divisi systems, where the lower staff is matched to a MIDI that often plays one line; and
p. 4's chromatic passage, the worst page at 70%.

## The viewer (`053_omr_eval.html`, `viewer.js`)

The table has a row per page with the counts and the pitch rate; click one, or use the arrows, to
see the page with its heads marked: green for the right pitch, red for a wrong one with what was
read and what the MIDI has, orange for a head with no note, violet for a chord note the MIDI lacks,
a blue cross where a printed note was not found, and a dashed box around each clef change. Hover a
mark for the note, its bar and beat. The run selector shows the baseline for comparison, and
`?page=N` opens a page.
