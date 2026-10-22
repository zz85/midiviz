# Experiment #046 – fingering a photographed score

[046_score_fingering.html](../046_score_fingering.html) takes or opens a photograph or multi-page PDF
of printed music, recognizes each page locally, plans violin or viola fingering across the selected
part, and draws the finger numbers back onto the normalized page.

## Pipeline

1. `recognize-worker.js` runs the embedded ScoreShift spatial OMR pipeline off the main thread. It
   normalizes staff spacing, removes skew, and returns staves, clefs, keys, bars, noteheads,
   accidentals, rhythms, voices and source coordinates.
2. ScoreShift's `buildScore()` assembles parts, measures and exact tick onsets. `adapter.js` turns one
   selected part into immutable fingering inputs while retaining the source notehead for every attack.
   Tied continuations become one duration-sensitive decision; grace ornaments are placed sequentially
   before their principal note and kept distinct from exact-onset chords through 260 bpm.
3. `suggestFingerings()` from `strings/fingering.js` produces up to four ranked, distinct whole-passage
   paths for violin or viola under the recommended held-safe constraints. Tempo changes the cost of
   fast shifts; style selects standard, beginner, expressive or fewest-shifts weights.
4. `overlay.js` places the finger at each notehead, a string name when the string changes, and a
   position label when the hand moves. The colors run from the lowest to highest string.
5. `document.js` gives an image or PDF stable per-page records. PDF navigation lazily renders
   thumbnails and pages through pdf.js, and restores each page's model, correction locks, selected
   part, alternative and keyboard position without re-recognizing it. Changing instrument, style or
   tempo deliberately resets every page to its newly computed recommended path while keeping edits.
6. `app.js` switches whole-path suggestions and re-plans around manual string locks. A tapped note
   can also be moved by a staff step, have its accidental corrected, or be removed as a false
   detection. PNG export flattens the current page; PDF export visits every page in order, annotates
   cached choices, recognizes unopened music pages, and keeps title/text pages visually unchanged.

## ScoreShift snapshot

The browser dependency closure is copied under `scoreshift/` from the sibling ScoreShift
repository at commit `396f4619c531d978b49bbd81d15f5c766f6cf7a5`. See
[scoreshift/README.md](scoreshift/README.md) for the included files and update procedure. The local
copy lets MidiViz run from its own static-server root and keeps recognition on-device.

## Tests

```sh
node --test score-fingering/test/adapter.test.js score-fingering/test/document.test.js score-fingering/test/integration.test.js
node score-fingering/test/browser.mjs
```

The pure tests cover selected-part mapping, chords, voices, grace sequencing, source IDs that survive
pitch correction and collocated-note deletion, locks, tied attacks, alternatives, sparse labels and
marker/notehead hit testing. The integration tests run the local OMR snapshot on a 96-note, 24-bar
engraved page and finger all 96 score notes. A second fixture consumes its 30-note / 8-grace oracle,
pins the snapshot's known 29 raw detections / 7 recognized graces (28 tightly located, one true
grace displaced by about 1.3 staff spaces, one omitted), and verifies at 260 bpm that the recognized
ornaments occur before their principal notes rather than becoming double stops or false held voices.
The document tests cover stable, isolated page records, ready/non-music caching, page-aware names and
PDF page-size/order output. The browser smoke loads the generated photo, reads 4 staves and 97 raw
detections, builds 24 bars and 96 score notes, produces four paths for that sample, selects an
alternative, locks a playable string, corrects and deletes recognized notes, exercises keyboard note
editing, stale/overlapping loads and worker failure, and checks a 320 px / DPR 2 layout. It then opens
a three-page PDF, keeps its title page, renders all thumbnails, edits and caches page 2, recognizes
unopened page 3 during whole-document export, reopens the 462,915-byte output as three 612×792 pages,
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
- Annotations are a raster overlay. They do not create MusicXML technical notation yet.
- PDF input is capped at 100 MB and 100 pages; whole-document export stops if retained JPEG pages
  exceed 64 MB. At most two visited page raster/model payloads stay resident (about 230 MB for two
  fixture-sized pages); older pages retain compact locks, corrections and selections and are
  re-rendered on return. Unopened export pages are processed one at a time and their source,
  normalized and composited canvases are released in `finally`.
