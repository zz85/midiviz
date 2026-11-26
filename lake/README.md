# The lake (Afterglow's world)

The lake of [Afterglow](https://github.com/Leonxlnx/afterglow) (MIT, commit ced1038) as a stage set for the pianist pages: the sky after sunset, the mountains, and water that mirrors the pianist and the piano and rings from the piano's legs as she plays. [#054 Afterglow Lake](../054_afterglow_lake.html) opens on it; #032 has it as `?stage=lake`, and #045, #049 and #050 as `?scene=lake` (Visuals > Stage > The lake).

## Files

- `world/`: Afterglow's `scene/src/world/*.js`, copied whole, with its licence (`world/LICENSE`). Two local changes, both in `world/index.js`:
  - `prepareFrame(t, { camera, env })`: with `env: false` it skips the sky cube and the environment capture, so a live frame between two refreshes costs the water and the dome alone;
  - `setSize(w, h)`: resizes the sky's bake targets and the water's reflection target with the page's canvas.
- `stage.js`: `createLakeStage({ renderer, scene, camera, stageParts, foreground, hair, progress })`, with the interface of `park/stage.js` (`set`, `update`, `draw`, `setSize`, `setTime`, `shows`, `keepHidden`, `opts`, `on`) and `noteOn(midi, velocity, ago)` and `pedal(down)` for the rings. `LAKE_TIMES` lists the skies.
- `test/world.html`: the world alone with a box at the piano, Afterglow's S01 camera (`?a=47&d=31&h=1.18&fov=27&sun=-1`).
- `test/shoot.mjs`: a headless still of any page, on llvmpipe or SwiftShader: `node lake/test/shoot.mjs out.png "054_afterglow_lake.html?shot&t=30" __shot`. `EVAL='js'` returns the value of an expression as `info`.

## How it is drawn

The pages work in centimetres with the player at +z; Afterglow works in metres in a rig frame turned 120° in the world, with the pianist at -z looking along +z toward the glow. For each draw the stage puts the page's whole scene under a `bridge` group (scale 0.01, turned 180°, 3 cm down so the casters stand in the water) inside the rig, carries the page's camera through the same transform into a camera of its own (far plane 60 km), and renders the lake scene once. Because she and the piano are in the same scene as the water, the water's reflector mirrors them with nothing added. After the draw the page's scene goes back where it was, with its background, fog, environment and tone mapping.

- Hidden while the lake is on: the hall's floor, spot lights, dust and stage props, and every light of the page's own (the lid's warm panel too).
- The light: the world's environment map (Afterglow's capture of its sky, refreshed every 0.25 s of the stage's clock or when the sky changes), at `opts.envGain` 1.6; a key from the horizon glow (`world.glowLight`, its colour pulled 60% toward white, as Afterglow's rim; soft shadows), at `opts.keyGain` 4; and a cool fill from the sky behind the camera side, at `opts.fillGain` 1. The hair's ambient term follows the key.
- Tone mapping: three's PBR Neutral at the page's exposure, as Afterglow's final pass. The page's own post-processing (depth of field, bloom, grain, dust) isn't applied.
- The skies: the sun at -1°, -1.6°, -2.5° or -4.5°, or Afterglow's film arc (+0.6° to -4.5°) over the song. Afterglow pins its look above -1° (`params.sunLook`), so a higher sun looks like -1°.
- Two views for it, in every pianist page's Camera menu: **Across the water** (Afterglow's S01: 31 m out behind her on the treble side, a 50 mm lens) and **Lost profile** (past her right shoulder toward the glow). The hall's views work too; most of them look away from the glow.

## The rings

Afterglow rings its water from its solver's leg and foot vibration. Here each note rings a leg as it sounds: the bass leg for the lower half of the keyboard, the treble leg for the upper; a note below A2 (MIDI 45) at velocity above 0.45 rings the tail leg too. Amplitude 0.00018 + 0.0011·v² m, ×1.4 below C3 and ×0.6 from C5 up. The sustain pedal rings the lyre. The stage keeps each ring for 18 s; the world draws the 40 that show most at once. The legs and the bench's feet also send Afterglow's continuous micro rings. A still (`?shot`) seeds the rings of the last 12 s, so they are already spreading.

## Limits

- Live WebGL only: the sky, the clouds and the water are GLSL shaders that neither path tracer runs, and WebGPU (`?gpu=webgpu`) doesn't take them. On #045, #049 and #050 Path trace says so.
- The world is built at Afterglow's `preview` quality (about 12 s on llvmpipe); a frame costs about 12 ms there at 960×540 on top of the page.
- The piano and the bench stand in 3 cm of water by the bridge's offset; Afterglow's terrain, boulders and the lake bed are its own, unchanged.
- No exported video has been checked on the lake yet.
