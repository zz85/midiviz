# ScoreShift subset used by experiment #046

This directory starts from the browser subset of `../random-sketches/vibes/scoreshift/` at commit
`396f4619c531d978b49bbd81d15f5c766f6cf7a5`. The OMR additionally carries the focused recognition
fixes from upstream commits `43e00fe` and `6a705c1`; they are merged rather than copied wholesale so
MidiViz's natural-key and prior-page behavior remains intact. The subset is copied rather than
imported across repositories so `midiviz` remains a standalone static site when its own directory is
served.

Included dependency closure:

- `omr.js`, `imgproc.js`: photographed-page normalization and spatial music recognition
- `theory.js`, `score.js`: pitch interpretation and parts/measures/timeline construction
- `rhythm.js`, `raster.js`, `glyphs.js`: rhythm and symbol recognition
- `dynamics.js`: ScoreShift's generated dynamics table filtered to the 80 SIL-OFL music-font
  templates; all 160 Nimbus/DejaVu text-font templates are not needed by #046 and are omitted
- `glyphnet.js`, `glyphnet-weights.js`: the 130 KB local glyph classifier
- `render.js`: `Renderer.src`, the normalized/deskewed source photograph used as the annotation base
- `pdfsource.js`, `vendor/pdfjs/`: lazy PDF rendering plus JBIG2 and JPEG 2000 wasm decoders,
  the pdf.js worker and their license notices; the distribution's QCMS asset is retained but #046
  does not enable PDF.js's ICC/QCMS fetch path
- `sample.jpg`: generated ScoreShift demonstration photograph

The prototype does not expose ScoreShift's project persistence, playback, transposition workflow,
MusicXML/MIDI export, PWA shell, or application UI. `render.js` is present because `Renderer.src`
normalizes the source page, although #046 does not call its transposition planner. PDF input uses the
copied reader and minimal JPEG-page writer, while #046 supplies its own bounded document cache and
annotation export.

Intentional differences from the base snapshot are kept narrow:

- `omr.js` supports opening natural cancellations and cancellation-plus-replacement signatures,
  inherited PDF-page keys, and the selectively ported IMSLP fixes. A genuinely keyless pair is
  marked explicitly so inherited context cannot overwrite its C/a-minor reading.
- `render.js` samples each opening key glyph by its own accidental type, needed when naturals precede
  replacement sharps or flats.
- `pdfsource.js` supports aborting stale renders and cleans up readers that succeeded before a
  parallel reader failed.
- `dynamics.js` is the documented OFL-only subset rather than the upstream text-font table.

Recognition runs in `../recognize-worker.js`; #046-specific document, score-adapter, overlay and UI
behavior remains outside this snapshot. Current upstream `score.js` and `theory.js` use the separate
`notation-ir` tree; those refactors are deliberately not copied because #046 does not consume that
second score model.

## Licenses and deployment

- `LICENSES/` carries the SIL Open Font License and copyright notices for the Bravura, Petaluma,
  Leland, Leipzig and Gootville outlines represented in `glyphs.js` / `dynamics.js`. Sources:
  [Bravura](https://github.com/steinbergmedia/bravura),
  [Petaluma](https://github.com/steinbergmedia/petaluma),
  [Leland](https://github.com/MuseScoreFonts/Leland),
  [Leipzig](https://github.com/rism-digital/leipzig), and
  [Gootville](https://github.com/lyp-packages/gootville).
- `vendor/pdfjs/LICENSE` is [PDF.js 6.3.289](https://github.com/mozilla/pdf.js)'s Apache-2.0 notice; `LICENSE.core-js` covers the bundled core-js
  compatibility code; `vendor/pdfjs/wasm/LICENSE_*` carries the JBIG2, OpenJPEG and QCMS notices.
- A static host must serve `.mjs` as JavaScript and `.wasm` as `application/wasm`. The three-page
  regression fixture uses Flate-compressed pages; decoder support for JBIG2/JPEG 2000 comes from
  the vendored pdf.js distribution but is not exercised by that fixture. ICC/QCMS is not enabled.

To update this snapshot, compare the import graph first, copy the complete browser closure, run
both ScoreShift's own suite in its repository and `node --test score-fingering/test/*.test.js`, then
update the commit above. Keep copied files byte-identical; regenerate the documented OFL-only
`dynamics.js` subset rather than copying its unused text-font templates.
