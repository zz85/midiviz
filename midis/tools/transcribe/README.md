# Transcribing a public-domain score to MIDI

From a scan of a printed score (IMSLP, or a library's IIIF images) to a MIDI file we may publish:
optical music recognition (Audiveris) reads the pages, a reference MIDI points at the bars it
misread, those bars are checked against the scan and corrected by hand, and `build.py` writes the
MIDI from the OMR's reading and the corrections. The reference only flags bars: none of its notes
are copied, and it isn't committed, so it can be any MIDI of the piece, whatever its licence.

First work: Brahms, Violin Sonata No. 1, Op. 78, movement I, from the Simrock first edition
(Staatsbibliothek zu Berlin), as `duo/midis/brahms_op78_1.mid` in #038 Duo. The transcription
(`works/brahms_op78/`, and the MIDI) is CC0.

## Steps

```sh
cd midis/tools/transcribe
python3 fetch.py brahms_op78               # scans into cache/brahms_op78/scan/ (IIIF, or a PDF via pdftoppm)
python3 prep.py brahms_op78 score          # crop the printed area, x1.25, grey -> cache/.../omr/pNNNN.png
python3 prep.py brahms_op78 violin
AUDIVERIS=~/opt/audiveris.sh ./omr.sh brahms_op78   # Audiveris 5.11: .omr book + MusicXML per page
python3 extract.py brahms_op78             # -> works/brahms_op78/omr.json (committed)
python3 compare.py brahms_op78 1 ref.mid 1 2 3 --sheets   # flag bars against a reference, review sheets
python3 zoom.py brahms_op78 1 149:LH:2     # a close crop of one bar's staff
python3 build.py brahms_op78 1             # -> duo/midis/brahms_op78_1.mid
```

`build.py` needs only Python 3 and the committed files: `work.json`, `omr.json` and
`fixes-<movement>.txt`. The other steps need music21, Pillow and NumPy, and Audiveris for `omr.sh`.
Scans, OMR output, the reference and review sheets go in `cache/` (or `$TRANSCRIBE_CACHE`), which
isn't committed.

## A work

`works/<id>/work.json` holds the source (edition, library, image URL or PDF), the pages of the
score and of each part, and for each movement its meter, key, tempo, pages, how many bars (Audiveris
stacks) each score page holds, the bars played pizzicato, and the score's tempo words.

- `omr.json`: for each page, each measure in order, with its place on the prepared page and its
  notes by staff (violin, piano upper, piano lower): onset and duration in quarters, MIDI pitch,
  tie, spelling, grace. Read by number from each part, since Audiveris leaves out a violin measure
  it reads as empty.
- `fixes-<mv>.txt`: each bar's staff that the OMR misread, in full, read from the scan; its header
  gives the format and where each kind of line comes from.
- `verdicts-<mv>.txt`: the log of the bar-by-bar check against the scan, one line a bar.

## How the check went (Op. 78, I)

243 bars, three staves each. Against the reference, the OMR's reading of the score (`omr.json`)
or of the violin part was right in pitch and onset for 172 violin, 132 upper and 118 lower staves
of the 243. The 177 bars with a staff it may have wrong were each checked against the scan
(`verdicts-1.txt`). In all but three of the disputed staves the reference matched the print:
in 92 and 94 LH the OMR was right and the reference leaves out a note, and in 149 LH the print has
naturals on beat 3 that the reference doesn't.

`compare.py` run again after the fixes lists one bar to check (173 LH, a tie the print shows) and
13 corrected staves that still differ from the reference for a reason the fixes file gives:
rolled chords, grace notes and ties over the barline, which a performance-style reference times
otherwise, and 149 LH.

## Running it again

`omr.json` is the record the fixes are written against: the bars are numbered from it. The pages of
Op. 78 were prepared as `prep.py` prepares them, cropped and enlarged by about 1.25, but by hand,
so a run from fresh scans can read some bars differently. After `extract.py`, run `compare.py`
again: a bar the new reading gets wrong and the fixes don't cover is flagged, and `build.py`
refuses a note that runs past its barline.

## A second reader, and a vote (Op. 78, I)

ScoreShift (`../random-sketches/vibes/scoreshift`, or `SCORESHIFT=<dir>`) reads the same scans:

    node scoreshift_eval.mjs brahms_op78 1      # ScoreShift's heads against our transcription, page by page
    node scoreshift_read.mjs brahms_op78        # every score and violin-part page -> cache/<work>/scoreshift-*.json
    python3 fuse.py brahms_op78 1 --truth       # vote across the readings -> cache/<work>/fused-1.json

`fuse.py` puts four readings into bars: Audiveris on the score and on the violin part, ScoreShift
on the score and on the violin part. Per bar and staff it keeps the Audiveris reading the others
agree with most (the violin part's on a tie) and marks it confirmed where a second reader read the
same heads. Staves exactly right, of 243, against the checked transcription:

| Staff | Audiveris, score | Audiveris, part | ScoreShift, score | ScoreShift, part | Vote |
|---|---|---|---|---|---|
| Violin | 137 | 201 | 77 | 163 | 200 |
| Piano upper | 150 | - | 112 | - | 150 |
| Piano lower | 136 | - | 95 | - | 136 |

389 of the 729 staves are confirmed, and 348 of those are right; the other 340 are the ones to check
by eye, and they hold 202 of the vote's 243 wrong staves. ScoreShift reads 56.1% of the movement's
heads at the right pitch (39.4% before the fixes for this edition: the cue-size violin staff, the
brace read as a note head, which cleared the key, and stacked open chords). `build.py` doesn't use
the vote yet.

## Limits

- Durations in corrected bars are the OMR's where it read the note, else inferred from the
  reading; pitches and onsets were checked, durations weren't checked note by note.
- Dynamics, articulation, slurs, fermatas and the rolled chords aren't in the MIDI: every note of a
  staff has one velocity. Tempo is one value (126 a quarter); `Tempo I` (bar 156) is a marker.
- Grace notes take a 32nd before the beat.
- Movements II and III have scans and OMR (`omr.json`) but no review or fixes yet.
