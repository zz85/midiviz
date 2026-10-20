# MIDI Line Rider editor

[`043_line_rider_race.html`](../043_line_rider_race.html) turns
`minute_waltz.mid` (or another MIDI file) into an editable Line Rider track.

The automatic planner and simulation reuse experiment #044's verified Line
Rider 6.2 implementation instead of the old generated channel and high-powered
correction rails. Every edit is re-ridden with the same gravity, rider
constraints, collision grid, solid lines, and accelerating red lines used by
`bosh/physics.js`.

Run it from the repository root with a loopback-only local server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/043_line_rider_race.html`.

## Editing

- **Select** a segment, drag the segment, or drag an endpoint. Endpoints at the
  same joint move together.
- **Pencil** draws long freehand curves as connected Line Rider segments.
- **Line** draws a straight solid, accelerating, or scenery line.
- **Loop** turns a start-to-end drag into a smooth segmented loop-the-loop.
- **Erase** removes the nearest segment.
- **Pan** moves the camera; the mouse wheel zooms.
- Change a selected line's type, rideable side, or endpoint extensions.
- Undo/redo edits and re-run physics at any time.
- Open and save standard `.track.json` files for linerider.com or Line Rider
  Advanced.

The status panel reports whether Bosh crashes and how many generated
music-synchronized landing pads remain exact after human edits.

## Adaptive generation controls

Landings, gap floor, physical pace, and phrase span are ranges rather than
single fixed values. The left end describes detailed or busy music and the
right end describes open or calm music where appropriate. Local note density,
loudness, note length, and score structure choose the value inside each band:

- busy music permits denser landings and shorter gaps;
- calm music keeps fewer notes and more breathing room;
- pace is a target for the physical planner, not animation playback speed.
  The planner starts from Bosh's real incoming velocity and may use ordinary
  or accelerating/braking lines to remain inside the requested band.
- **Phrase span** controls the large visible gesture in bars: busy passages
  approach the short end, while calm passages can flow through very long
  two-to-six-bar curves (or up to sixteen bars).
- **Hill angles** separately set uphill and downhill extremes. Downhill reaches
  88°, while climbs above 45° reserve long musical gaps and request real,
  physically simulated loops. Pitch still adds smaller musical detail on top.

The controls intentionally expose extreme ends: up to eight landings per
second, 24 px/frame pace, 32-bar gestures, 18 px/semitone pitch response,
75° climbs, and 88° drops. Those settings are creative targets; the verified
physics planner still chooses a survivable realization and may skip impossible
demands.

Those long lines are musical macro-lines, not one enormous collision segment.
The physics planner quietly subdivides each gesture into short, editable Line
Rider rails. Dense runs, loops, and boundaries receive more vertices; open and
sustained spans receive fewer. Every final segment is included during physical
planning and verification.

While seeking or playing, the panel displays the local landing rate, gap
floor, target pace, actual simulated landing speed, current gesture span, and
its shaped vertical contour.

Pitch affects two separate things. Coloured landing pads and timeline markers
use pitch class for hue; ordinary rails are still black or red. Track height
uses the melodic pitch contour, shaped into the multi-bar gestures above.

## Files

- `app.mjs` is the editor, transport, MIDI loader, renderer, and synth.
- `editor-model.mjs` contains geometry selection, shared joints, pencil
  simplification, and loop construction.
- `variable-controls.mjs` converts the calm/busy ranges into a
  music-dependent landing sequence; `worker.mjs` plans and verifies it.
- `music-shape.mjs` groups landings into multi-bar gestures and gives them
  alternating uphill/downhill targets from the hill-angle control.
- `structure-lines.mjs` derives each landing's segment length from musical
  structure before the physical planner builds and tests that section.
- `../bosh/physics.js`, `../bosh/planner.js`, and `../bosh/render.js` provide
  the verified physics, automatic planning, and rider model from #044.
- `track-generator.mjs` and `physics.mjs` preserve the earlier #043 prototype
  for comparison but are no longer used by the page.

Run all editor and legacy prototype tests with:

```sh
node --test line-rider/test/*.test.mjs
```
