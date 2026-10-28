# Experiment #046 – fingering a photographed score

[046_score_fingering.html](../046_score_fingering.html) takes or opens a photograph or multi-page PDF
of printed music, recognizes each page locally, automatically chooses violin or viola for the selected
part (with manual overrides), and draws the finger numbers back onto the normalized page.

## Pipeline

1. `recognize-worker.js` runs the ScoreShift spatial OMR pipeline off the main thread. It
   normalizes staff spacing, removes skew, and returns staves, clefs, keys, bars, noteheads,
   accidentals, rhythms, voices and source coordinates.
2. ScoreShift's `buildScore()` assembles parts, measures and exact tick onsets. `adapter.js` turns one
   selected part into immutable fingering inputs while retaining the source notehead for every attack.
   Tied continuations become one duration-sensitive decision; grace ornaments are placed sequentially
   before their principal note and kept distinct from exact-onset chords through 260 bpm.
3. `detectViolinViola()` uses an unambiguous filename, alto/low clef, viola-only low pitch, or strong
   evidence retained for that part across PDF pages; otherwise it defaults to violin. A page whose
   printed key signature is wholly or partially missed can inherit the preceding page's common key,
   but only when every explicit key glyph on the new page agrees. The instrument
   menu can override auto detection. `suggestFingerings()` then produces up to four ranked, distinct
   whole-passage paths under the recommended held-safe constraints. Tempo changes the cost of fast
   shifts; style selects standard, beginner, expressive or fewest-shifts weights.
4. `overlay.js` places a large uncircled handwritten graphite finger number above each complete
   note—including an upward stem or beam—and stacks chord fingers vertically. String-change and
   hand-position badges are hidden by default; the **string / position details** toggle shows them
   beside their noteheads. Chord notes removed from
   the one-player hand frame still receive independent divisi fingerings without a warning circle;
   status and the note popup retain that explanation.
5. `document.js` gives an image or PDF stable per-page records. PDF navigation lazily renders
   thumbnails and pages through pdf.js, and restores each page's model, correction locks, selected
   part, alternative and keyboard position without re-recognizing it. Changing instrument, style or
   tempo deliberately resets every page to its newly computed recommended path while keeping edits.
6. `app.js` switches whole-path suggestions and re-plans around manual string locks. A tapped note
   can also be moved by a staff step, have its accidental corrected, or be removed as a false
   detection. PNG export flattens the current page; PDF export visits every page in order, annotates
   cached choices, recognizes unopened music pages, and keeps title/text pages visually unchanged.

## Reading, playing and writing on the score

The page is also a score reader. **📖 Reader** (remembered, or `?reader`) shows the page full
width with the controls tucked away; ⛶ goes full screen. The transport under the page plays the
recognized music: ▶ Play from the top, or tap a bar in Reader (▶ Play from this bar in a note's
popup) to start there; tempo, ×0.5–×1.5 speed and the metronome (bar-aware clicks, compound meters
by dotted beat) change while playing. The sounding noteheads are ringed, **follow** keeps the
playing staff in view, and **turn pages** carries on onto the next PDF page with music at the end
of a page. In Reader, Space plays or stops, ← → / Page Up / Page Down turn pages and M toggles the
metronome. **fingerings** hides the pencil numbers for plain reading, and **Size** (25–150%, remembered;
100% is 48 px on the page) scales them; larger numbers grow away from their notes, and a double stop's numbers keep the
same small gap. Numbers step aside from printed text and markings. A finger is written once
until it changes, and again on a new line, after a rest or after six beats; **repeated fingers**
writes every one.

**🎼 Stand** is for a laptop turned on its side as a music stand: the whole app is drawn a quarter
turn round (`stand.js`), so the page stands upright and fits the tall screen, and it goes full
screen. ⟲ flip turns it the other way (the keyboard on the left or right; remembered, or open with
`?stand=left|right`). A tap on the right two thirds of the page, a scroll with nothing left to
scroll, or → / ↓ / Page Down (what Bluetooth page-turner pedals send) goes to the next page; the
left third, ← / ↑ / Page Up go back. One page turns per scroll gesture, inertia included. The next
PDF page is read in the background while one is shown (also in Reader), so a turn is immediate.
Pointer, wheel and popup positions are mapped into the rotated frame, so ink written on the turned
page lands where the pen is, and playback, loops and the metronome work as usual.

**Sound.** `sound.js` plays each note from the University of Iowa arco recordings #034 already
ships (`strings/sound/samples/iowa`, the mezzo-forte take of each string, about 3 MB, loaded on the
first Play): violin or viola as the page is planned, every note on the string it is fingered on, from
its recorded attack (short notes bite into it), held on the recording's pitch-synchronous loop, with
a delayed vibrato on long notes and a small generated room. **Sound: Piano** (or a failed download)
uses notation-ir's light additive voice. Notes come from ScoreShift's `performance()`: ties merged,
slurs legato, staccato short, printed dynamics. When an orchestral part goes divisi on two braced
staves, ScoreShift reads the lower staves as a second part; its bars now sound with the bars they
stand under (`score.js` `alignParts`), so both lines play together instead of the lower one starting
from the top of the page.

**⟳ Loop** repeats a passage: tap its first and last bar (or the same bar twice; ⟳ Loop this bar…
in a note's popup starts from that bar). The bars are shaded, and **speed up** starts the loop at
60% of the chosen speed and adds 5% each pass. Tapping a bar outside the loop in Reader, or ⟳ again,
ends it.

**✎ Ink** writes on the page with a pen, mouse or finger (after a pen is used, fingers scroll).
Through notation-ir `annotations.js` each mark is attached to the note, passage or moment under it
in staff spaces, so it stays with the music through pitch corrections and re-reads; strokes written
together are one mark. Colours, two widths, eraser (and a pen's eraser end), undo / redo and clear;
tap a mark to recolour, delete or re-attach it when its note was removed. Ink written before the
page's music is ready to take it (a slow first load) waits and is attached, and a stroke the browser
cancels part way (a palm, a scroll gesture) keeps what it wrote; ink that is not near any staff is
reported rather than silently dropped. Ink is kept per file
(name and size) and page in this browser's localStorage and drawn into the PNG and PDF exports.
`reader.js` holds the pure parts: bar start ticks, the bar under a tap, the sounding heads, storage;
`sound.js` the string voice and which recording a note uses; `stand.js` the rotated-frame geometry
and the one-turn-per-gesture wheel rule.

## ScoreShift

Recognition imports ScoreShift directly from the sibling
[random-sketches](https://github.com/zz85/random-sketches) checkout,
`../random-sketches/vibes/scoreshift/` (with the `notation-ir/` primitives it uses), rather than a
vendored copy: on GitHub Pages both sites are served from `zz85.github.io`, so the relative import
resolves to the published upstream. Fix recognition upstream, with a test there.

Locally, clone both repositories side by side and serve their parent folder, then open
`/midiviz/046_score_fingering.html`:

```sh
git clone git@github.com:zz85/random-sketches.git ../random-sketches
cd .. && python3 -m http.server
```

Upstream changes reach #046 without a version pin; run the tests below after pulling it.

## Built-in sample

**Try viola PDF** opens `sample-sibelius-symphony-2-viola.pdf`, the supplied 17-page viola part of
Sibelius's *Symphony No. 2*. Every page is 720×936 pt. Page 1 is a useful alto-clef OCR stress page:
9 staves, 174 raw detected notes and 48 assembled measures in the current snapshot. Auto resolves it
as viola from both its filename and clefs; forcing violin demonstrates why the choice matters. Page 2
is also a pinned cross-page regression: when its two-sharp signature is missed, page 1's D-major key
restores E♯3–F♯3–A3 and the viola planner keeps base 2 with fingers 2–3–1. The same page also
preserves ScoreShift's printed diatonic spelling, so bar 5 distinguishes D♭ from enharmonic C♯ and
keeps A3–B♭3–D♭4–D♭4–C4 in first position as 1–2–4–4–3.

## Tests

```sh
node --test score-fingering/test/*.test.js
node score-fingering/test/browser.mjs
```

The pure tests cover selected-part mapping, chords, voices, grace sequencing, source IDs that survive
pitch correction and collocated-note deletion, locks, tied attacks, alternatives, deterministic
violin/viola auto detection, large conventional above-note pencil labels, opt-in notehead details, and marker/notehead hit testing. The integration tests run the local OMR snapshot on a 96-note, 24-bar
engraved page and finger all 96 score notes. A second fixture consumes its 30-note / 8-grace oracle,
pins the snapshot's known 29 raw detections / 7 recognized graces (28 tightly located, one true
grace displaced by about 1.3 staff spaces, one omitted), and verifies at 260 bpm that the recognized
ornaments occur before their principal notes rather than becoming double stops or false held voices.
The document tests cover stable, isolated page records, ready/non-music caching, page-aware names and
PDF page-size/order output. The browser smoke loads the generated photo, reads 4 staves and 97 raw
detections, builds 24 bars and 96 score notes, produces four paths for that sample, selects an
alternative, locks a playable string, corrects and deletes recognized notes, exercises keyboard note
editing, stale/overlapping loads and worker failure, and checks a 320 px / DPR 2 layout. It also opens
the built-in 17-page Sibelius sample, confirms 9 staves / 174 notes on page 1, auto-selects viola with
zero range rejections, exercises the manual violin override, then restores auto. It then opens
a three-page PDF, keeps its title page, renders all thumbnails, edits and caches page 2, recognizes
unopened page 3 during whole-document export, reopens the output as three 612×792 pages,
restores the page-2 correction/lock/alternative, and checks page-aware PNG naming.

## Limits

- Images contain one page; PDFs navigate and export all pages. Corrections and selected paths live
  while the file remains open, but there is no saved-project format yet.
- Exported PDFs preserve page order and point sizes but contain JPEG page images, not vector notation
  or text.
- Printed Western staff notation only. Handwriting, tablature and percussion are not supported.
- Pages with no detected staves are preserved. A worker/recognition failure is shown separately with a
  retry instruction, and whole-document export stops rather than silently omitting annotations.
- A plausible OMR mistake can receive a plausible fingering. Turn on **recognition** and correct
  pitches or false notes before treating the annotation as an edition.
- The planner proposes ergonomic paths from pitch, timing and limited articulation evidence. Tone,
  phrasing, teacher preferences and the player's technique can justify a different fingering; the
  ranked paths and manual locks are intended for that choice.
- Auto distinguishes only violin and viola. Alto/tenor/bass clefs and pitches below violin G3 are
  strong viola evidence; a treble-only part without a clear filename defaults to violin. Use the
  instrument menu when the part is intentionally rewritten or otherwise ambiguous.
- Annotations are a raster overlay. They do not create MusicXML technical notation yet.
- PDF input is capped at 100 MB and 100 pages; whole-document export stops if retained JPEG pages
  exceed 64 MB. At most two visited page raster/model payloads stay resident (about 230 MB for two
  fixture-sized pages); older pages retain compact locks, corrections and selections and are
  re-rendered on return. Unopened export pages are processed one at a time and their source,
  normalized and composited canvases are released in `finally`.
