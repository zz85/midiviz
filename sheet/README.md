# Score over the pianist (#049, #050)

Two ways to show the score while the [#045 path-traced pianist](../045_pathtracer.html) plays, both on the Goldberg Aria (`midis/bach_goldberg_aria.mid`):

- [#049 Score Scan](../049_sheet_scan.html): a scan of the printed page, cut into systems. The page is the Bach-Gesellschaft edition, Band 3, p. 263 (Leipzig, 1853), the same edition as IMSLP's #00823. IMSLP's downloads sit behind a bot check, so the page image comes from the Bayerische Staatsbibliothek's IIIF server, which serves the same volume (bsb11131414, page 285) without one.
- [#050 Engraved Score](../050_sheet_engraved.html): the score engraved in the page by [nwc-viewer](https://github.com/zz85/nwc-viewer) (`../nwc-viewer/`, the engine #025 uses), from the score's own notes.

Both draw the system being played in a panel over the picture, light the bar being played, and scroll the next system up into the panel over the last 0.7 s before the music reaches it. The same drawing goes into every frame a video export makes (Render). In a video's lead-in (Render → Lead-in before the music) the panel waits for the music: it comes up over the half second before the first note. It is drawn after the frame source, so path-traced videos get it too.

## Using it

Visuals → Score: **Show the score** (key S), **Style** (glass, paper, ink only), **Position** (automatic, the default; bottom, top or a corner), **Systems shown** (1 or 2), **Size**, **Follow with** (the bar, the default; bar and cursor, cursor, nothing) and **In videos**. The cursor is off by default because in #049 it moves by time within the bar and doesn't land on each note.

**Automatic** picks one place for the whole song and keeps the panel there. [placer.js](placer.js) asks the page for a survey (pathtrace/app.js `surveyFrame`). The survey runs a copy of the director over the song's planned shots, 120 moments spread over its length (about 135 ms on SwiftShader), and at each moment measures how much the pianist and the piano fill each place. It uses the same measure #045's intertitles use ([pianist/frame-space.js](../pianist/frame-space.js): the piano's surfaces and her skeleton projected into a 48 × 27 grid, her body counting double and her head three times). On a fixed view it measures the camera as it is. The places are bottom and top centre, plus the four corners where the panel leaves a third of the width beside it. A place's cost is what it covers of her, plus half of what the intertitles would cover in the emptiest of their places it leaves free. Where the intertitles have a fixed place, or every note shows as a caption at the bottom, the panel keeps off that place. The panel holds its part of the frame, and automatic intertitles keep off any place it overlaps. It is chosen again only when the survey's answer would change: another song, a director setting, another view, or the liner notes arriving. It doesn't move while the song plays, or when the controls show: they pass over it, as they don't appear in a video. On the Aria with the automatic camera, it goes top right, and the intertitles go bottom left.

Performance → Hands (in #032, #045, #049 and #050) chooses who plays what: **From the score's tracks** (the default, `?hands=tracks`) where the file names its tracks for the hands, or **Automatic** (`?hands=auto`), the split that fingering.js finds easiest for the fingers. On the Aria the two differ on 95 of its 542 notes: the score gives the left hand 250 notes, the automatic split 163, because it moves the tenor line into the right hand. [fingering/hands.js](../fingering/hands.js) does this for every page that plays.

## How it works

| File | What it does |
| --- | --- |
| [timeline.js](timeline.js) | Song seconds to (score bar, place in the bar). The bar length comes from the number of bars the file plays: Mutopia's Aria counts a quarter as 960 ticks at ppq 480, and has no time signature. A `form` lists the printed bars in the order played, for files that play the repeats. This one doesn't: LilyPond's MIDI leaves out `\repeat volta`, so the Aria is 32 bars, 96 s. |
| [scan.js](scan.js) | Reads a page scan in plain JS: Otsu threshold; staff lines found in 16 vertical strips and followed across the page, so a page bowed toward the spine still reads; a straight-line fit per staff drops strips that took a ledger line or a beam for a staff line; barlines are columns dark through every staff of the system and, where most of them do, through the gap between the staves too, which leaves out the time signature and stems that line up. |
| [tools/detect.mjs](tools/detect.mjs) | Runs scan.js headless on an image and writes what it found into the score's manifest; `--png` marks the bars on the page. On p. 263 it finds 6 systems with 6, 6, 5, 5, 5 and 5 bars, the score's 32. The page can also detect at load where a manifest has no `detected`. |
| [engrave.js](engrave.js) | Engraves a MIDI with nwc-viewer in wrap mode (systems 1300 units wide) and draws it on a canvas. Its staves, barlines and note heads give the systems, the bars and each onset's heads, so the cursor moves from note to note and the heads glow as they sound. Tracks named `<staff> · voice <n>` are laid on one staff, with the highest voice's stems up, the lowest's down, and the later voices' rests hidden. A song with no score in [scores.js](scores.js) is engraved from its own MIDI. |
| [tools/score_midi.mjs](tools/score_midi.mjs) | Writes [scores/bach_goldberg_aria.score.mid](scores/bach_goldberg_aria.score.mid) from Mutopia's LilyPond (read by strings/lilypond.js): the notes as printed, a track a voice, 3/4 in G. It leaves out the 27 grace notes and the realized ornaments. The performance in midis/ plays trills as notes, which would engrave as runs of 32nds. |
| [layout.js](layout.js) | The model both approaches produce: a page image, its systems' rectangles, and each bar's x range and onsets. `place()` puts the cursor between onsets where the layout has them, and in proportion to time within the bar where it doesn't (the scan). `inkOf()` makes a system's ink a mask, so a scan's paper drops out and the ink can be tinted. |
| [overlay.js](overlay.js) | Draws the panel, the bar, the cursor, the glowing heads and the scroll on any 2D context. |
| [placer.js](placer.js) | Automatic placement: one place for the song, from a survey of the director's shots, leaving the liner notes their room. |
| [plugin.js](plugin.js) | Joins it to [pathtrace/app.js](../pathtrace/app.js): the Score menu, a canvas over the picture, and the export overlay. |
| [scores/](scores/) | The Aria's manifest (meter, bars, sources, and the detected systems), the page scan, and the score MIDI. |

## The shared pianist app

045_pathtracer.html was a 2,650-line page. Its script is now [pathtrace/app.js](../pathtrace/app.js), with its markup in [pathtrace/shell.js](../pathtrace/shell.js) and its styles in [pathtrace/app.css](../pathtrace/app.css), and the page boots it. A page that builds on #045 passes a plugin to `boot()`:

```js
boot({ title, href, defaultSong,
  onReady(app),             // after the page is built: add menus (app.addVisuals), keep settings in the link (app.addState)
  onSong(song, midi, app),  // a song loaded (also for ?shot stills)
  onFrame(t, app),          // each frame, song time t (and once for a ?shot still)
  overlay(app) })           // returns (g, w, h, t) => {} to draw over each exported frame, or null
```

`app` gives `pickPlace(places, prefer, margin)` (the emptiest part of the frame now, as the intertitles choose it), `surveyFrame(places)` and `surveyKey()` (the same over the song's planned shots, with the liner notes' places), `planReady`, `reserve(rect)` (a part of the frame the intertitles keep off), `songNow()`, `seekTo()`, `song`, `songFile`, `params`, `playing`, `exporting`, `renderer`, `camera` and `scene`. #049 and #050 are each about 50 lines of HTML.

## Tests

- `node --test sheet/test/sheet.test.js`: the timeline (bar length from bars played, repeats), placement between onsets, the page reader on a drawn and slanted page, the hands option, and automatic placement (one place a song, room for the liner notes).
- `node sheet/test/browser.mjs [out dir]` (the parent folder served, as for pathtrace/test/stills.mjs) checks #049 and #050 headless. Both boot, find their 32 bars, and draw the panel at the bottom with 16.4 s in bar 6. A 5 s 480p export of #049 finishes, and ffmpeg pulls a frame from it. `EXPORT=0` skips the video.

## Limits

- The scan's cursor moves in proportion to time inside a bar, so it doesn't land exactly on each note. The engraving's cursor does.
- The scan follows one page. A piece over several pages needs each page in the manifest, with the systems carried on from one page to the next. That isn't written yet.
- The engraving is nwc-viewer's quantized reading of the notes: no ornament signs, slurs or fingerings. The Aria's grace notes are left out.
- The path-traced still viewer shows the 3D frame only. A path-traced video draws the score the same way, after the traced frame, but only a raster export has been run headless.
- An intertitle at a fixed position (Visuals → Liner notes) can still sit over the panel. Automatic intertitles keep off it.
