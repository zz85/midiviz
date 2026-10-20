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

## Files

- `app.mjs` is the editor, transport, MIDI loader, renderer, and synth.
- `editor-model.mjs` contains geometry selection, shared joints, pencil
  simplification, and loop construction.
- `../bosh/physics.js`, `../bosh/planner.js`, and `../bosh/render.js` provide
  the verified physics, automatic planning, and rider model from #044.
- `track-generator.mjs` and `physics.mjs` preserve the earlier #043 prototype
  for comparison but are no longer used by the page.

Run all editor and legacy prototype tests with:

```sh
node --test line-rider/test/*.test.mjs
```
