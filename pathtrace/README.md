# #045 Path-traced Pianist

[045_pathtracer.html](../045_pathtracer.html) is [#032 Pianist](../032_pianist.html) with two GPU path tracers for three.js, rendering the same frame the page draws so the pictures can be compared:

- [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) 0.0.28 (2 Nov 2026; 0.0.27 doesn't compile on r187) (Garrett Johnson, MIT): its WebGPU tracer (`WebGPUPathTracer`, compute shaders on three/webgpu) and its older WebGL tracer (`WebGLPathTracer`, deprecated upstream)
- [MuTracer](https://github.com/pissang/mutracer) 0.3.0 (`@meimu/mutracer`, Yi Shen, MIT): WebGPU, with a WebGL 2 fallback

The page moved from three.js r170 to r185, which three-gpu-pathtracer's WebGPU tracer needs, and on 1 Nov 2026 to r187 (with MuTracer 0.2.0 and oidn-web 0.5.0). From r17x three.js keeps a soft (VSM) shadow map's depths in half floats, too coarse for the key light's 250-1000 cm range: the shadows drew dark contour bands across her skin. The page uses PCF shadows instead (`?shadows=vsm` brings VSM back to compare).

The page's code is [app.js](app.js) (markup in shell.js, styles in app.css), which #049 and #050 boot with a plugin that draws the score over it ([sheet/README.md](../sheet/README.md#the-shared-pianist-app)).

## Using it

- **Path trace** (top right): the song pauses and the current frame is frozen, then traced by one renderer (**Render still**) or by every renderer this browser can run (**Compare all**). Settings: samples per pixel (16–4096), bounces (3, 6, 10), size (up to 3840×2160, or 1080×1920 for a Short), share of hair strands kept, denoising (OIDN on WebGPU for both tracers, MuTracer's JNLM filter on WebGL; three-gpu-pathtracer's WebGL tracer has none), and **The page's effects**: bloom, grain and vignette run on the traced picture.
- The viewer shows one result at a time, split against the page's raster picture (drag to move the split), with the timings: scene setup, first sample, tracing, denoising. Keys 1–n switch results, Esc closes, Save PNG downloads.
- **Render → Renderer**: a video exported with a tracer instead of the raster picture, every frame traced. Seconds to minutes per frame, so the Length menu offers 5 s test clips; stacked Shorts are not supported.
- **Camera → Inside the piano**: the strings, plate and dampers are the slowest part of the stage to trace. *Mostly avoid* leaves out the director's shots where they fill over 10 % of the frame (from above, over the shoulder, the hammers), *Avoid* any over 4 %. [pianist/director.js](../pianist/director.js) `stringsShare()` measures this by casting rays from each shot's camera through the open case to the string plane, the propped lid blocking.

## How a frame reaches the tracers

Neither tracer runs the page's own shaders, so [snapshot.js](snapshot.js) freezes the stage into plain parts both read the same way:

- Every visible mesh as a static mesh in world space. Skinning and morph targets are applied on the CPU the way the GPU does it, instanced meshes are expanded, and only position, normal, uv and colour are kept.
- Materials as MeshStandard / MeshPhysical without their shader patches (the skin's wrapped diffuse, hair-as-cloth offsets); MeshBasic becomes emissive. The ink outlines, dust motes and lesson lane are left out and listed in the result.
- The fallboard mirror (a Reflector) becomes black lacquer: a tracer reflects the keys itself.
- The strand hair as ribbons facing the camera: `bakeStrands()` in [pianist/hair.js](../pianist/hair.js) runs the hair's vertex shader on the CPU. Its colour, from dark roots to lighter tips with highlights, goes into a 32 × 64 texture as well as the vertices, because MuTracer drops vertex colours.
- Lights in world space. The page's lights have no falloff (decay 0), which MuTracer cannot represent, so each becomes an inverse-square light with the page's brightness at the point it aims at, and a 6 cm radius for soft shadow edges.
- The page lights reflections from a PMREM of a few glowing panels around the stage. Here the panels are ray cast into a 512 × 256 float equirectangular map, which both tracers sample directly.

[engines.js](engines.js) runs one tracer per still or export, with its own canvas, renderer and BVH, disposed after, so a still's timings include building the acceleration structures. [post.js](post.js) applies the page's effects: the tracer renders linear light at exposure 1/8 into its 8-bit canvas, and the page's chain runs on that in the page's order (bloom on linear light, then AgX at the page's exposure, then grain and vignette). Deep shadows can band and light above 8× white clips. Depth of field is not applied. [video.js](video.js) does the same for each frame of an export.

## Making MuTracer match

The first MuTracer stills were much darker than three-gpu-pathtracer's and the hair was white. Three causes, all in MuTracer 0.1.3, each with a test scene in [test/mini.html](test/mini.html). MuTracer 0.2.0 fixes the first two itself, so `engines.js` no longer works around them: on SwiftShader `?test=spot` gives 63 with 0.2.0 and its own spot conversion (65 with 0.1.3 and ours, three-gpu-pathtracer 62), and `?test=sky` gives 184 (183 before). The third is still worked around in `hair.js`.

| Cause | Effect on the stage | Workaround | Test (centre pixel, sRGB) |
| --- | --- | --- | --- |
| A spot fades as `smoothstep(cos outer, cos outer + (1 − inner/outer), cos θ)`, adding a ratio of angles to a cosine; three.js fades to `cos inner` | The stage's soft spots (penumbra 0.8–1) peaked at 0.4–4 % of their strength; the key light at about 0.9 % | Spots converted here, with the inner angle chosen so the fade follows three's curve; fixed in 0.2.0 | `?test=spot`: MuTracer 13 → 65, three-gpu-pathtracer 77 |
| The environment map's first row is read as the zenith; three.js reads a `DataTexture`'s first row (`flipY` false) as the nadir, and `flipY` is ignored | The panels above the stage lit it from below | MuTracer gets a copy with the rows flipped; 0.2.0's converter flips them itself | `?test=sky`: 1 → 183, three-gpu-pathtracer 189 |
| The three.js converter copies position, normal, tangent and uv but not vertex colours, though the renderer supports them | The hair, coloured per vertex on a white material, came out white | Hair colour also baked into a texture | `?test=map`: 159,66,66 against 169,67,67; `?test=vcolor` still white |

After these fixes the two tracers' WebGPU stills look close on a desktop GPU, hair included (compared by eye at 1280×720 and 1920×1080; no pixel comparison yet). The test scenes also check light units (`?test=down`, `?test=rect`: a white floor 2 m under a spot or area light, the tracers within 2 % and 6 %) and a uniform sky (`?test=env`: 176 against 197). On `?test=point` MuTracer is brighter (115 against 77); the stage has no point lights.

The vertex-colour one is worth reporting upstream; MuTracer asks for issues rather than pull requests.

MuTracer 0.2.0 fixes all three: its converter fades spots as three.js does, turns a three.js equirect's rows itself and copies vertex colours. The spot and row workarounds are gone from `engines.js`; the hair's colour texture stays (it is still right). On SwiftShader WebGL, `?test=spot` reads 63 (three-gpu-pathtracer 60), `?test=sky` 184 (170) and `?test=vcolor` 161,64,64 (148,60,60).

MuTracer 0.3.0 (released 2 Nov 2026) needed two changes:

- **A shader that didn't compile.** Its WebGL sphere-light sampler holds a copy of the emissive-light branch that uses a variable it doesn't declare, so a scene with both a sphere light and an emissive mesh, as the stage has, fails with `'randomSampleValue' : undeclared identifier`. [tools/vendor.mjs](tools/vendor.mjs) takes the copy out as it vendors, which leaves that function as 0.2.0 had it, and stops if the file isn't as expected.
- **Emissive meshes as lights.** 0.3.0 samples every emissive triangle as a light. The grand's 88 hammer felts glow a little in the raster picture (emissive 0x5a5a56, a stand-in for light under the lid), and as lights they made a 640x360, 32-sample still trace in 59 s instead of 6.7 s, with the same picture. A material marked `userData.rasterEmissive` (the felts, in concertstage/concert-grand.js) loses its emission in [snapshot.js](snapshot.js), for both tracers.

With both, the stage traces in 6.7 s on lavapipe WebGL, as on 0.2.0, and looks the same. On the test scenes, at 16 samples, WebGL reads 141,119,95 plain and 183 with `?test=env`, as on 0.2.0; `?test=spot` reads 72, where 0.2.0's WebGL read 60, now near its WebGPU tracer's 69 (73 on 0.2.0).

## Garments over the skin

The raster page draws a garment over the skin it lies on with a polygon offset: the fabric wins depth ties within a few millimetres. A path tracer has no depth test, so the skin under a fabric's edge, a halter's collar and the shoes' rims poked through in patches. [snapshot.js](snapshot.js) lifts each skinned mesh drawn with a negative polygon offset off the body along its normals, by `FABRIC_LIFT` (0.3 cm): posed, c806 (the red evening gown) sits a median 0.23 cm off her skin. Not yet checked on a GPU.

The skin under a garment isn't hidden: it is sunk into the body (0.8 cm under community garments, 2 cm under the built-in dresses, fading to nothing at the edge; `pianist/shell.js` `coverBody`), so a gap in the fabric shows skin. `?skin=hide` hides it as before, for comparison.

## Known problems

- MuTracer's WebGL 2 fallback renders the full stage blank on SwiftShader (software WebGL) whenever there is an environment map, even a uniform one; the test scenes with one render fine. Not seen on WebGPU. Not yet traced to a part of the stage.
- three-gpu-pathtracer's WebGL tracer, on SwiftShader, renders the stage pale and over-lit: with the page's effects on, its linear output averages 2.88 with 26 % of pixels at the 8× ceiling. Its WebGPU tracer looks right.
- The path-traced video export has only been run headless on SwiftShader (`test/video.mjs`), not on a GPU.
- No timings from a real GPU are recorded here yet: this machine has none, and SwiftShader takes 1–10 minutes a still at 320×180. The viewer reports each still's timings.

## Desktop app (no GPU needed)

[desktop/](desktop/) runs the page in Electron 45 with nothing to serve: the repo reaches the page through a private `midiviz://` protocol, so no port is opened. three.js still comes from jsDelivr.

```
cd pathtrace/desktop && npm install
node run.mjs                                   # the page in a window (needs a desktop: DCV, X or Wayland)
node run.mjs --info                            # which WebGL / WebGPU device the page gets
node run.mjs --still Prelude1.mid 20 shoulder /tmp/out --size=320x180 --spp=16
node run.mjs --video Prelude1.mid /tmp/out --res=3840x2160 --fps=12 --len=5 --spp=4 --bounces=10 --denoise=0
node run.mjs --export Prelude1.mid 20 shoulder /tmp/out   # the frozen frame for native/ (scene.glb, scene.json, env.f32)
```

`bun run.mjs` works as well. `--still` takes `--engines`, `--spp`, `--bounces`, `--size=WxH`, `--denoise=0`, `--fx=1`, `--hair` and `--extra=&outfit=…`, like `test/stills.mjs`, plus `--timeout=<minutes>` per tracer. It writes each tracer's PNG as soon as that tracer finishes, plus a JSON report. It does not save the raster frame, because its WebGL canvas reads back blank headless.

Without a GPU the default tracer is MuTracer WebGL 2 on lavapipe. That holds for `--still` and `--video`, and for the page itself: when its WebGL runs on llvmpipe, lavapipe or SwiftShader, the Path trace menu starts on MuTracer · WebGL 2, unless the link names a renderer (`ptengine=`).

`--video` goes through the page's Render menu with Path traced selected, the way `test/video.mjs` does. It takes `--engine`, `--spp`, `--bounces`, `--res`, `--fps`, `--len` (5, 20, 60 or `all`), `--denoise`, `--fx`, `--hair`, `--recycle` and `--extra`. The defaults are 4K, 12 fps, 5 s, 4 spp, 10 bounces and no denoising. It saves the MP4 and its two subtitle files, and prints the tracer's line for each frame. `run.mjs` samples the app's processes every 5 s while it runs: CPU in cores, and memory as PSS, so pages shared between processes are not counted twice. The samples go to `monitor.csv` next to the MP4, with a summary in `monitor.summary.json`. `--monitor[=file.csv]` turns this on for the other modes.

`--backend` picks the driver under WebGL:

| `--backend` | WebGL | WebGPU |
| --- | --- | --- |
| `lavapipe` (default with no GPU, if installed) | Mesa's Vulkan through ANGLE (`mesa-vulkan-drivers`, or `./setup-lavapipe.sh` to unpack it without root) | SwiftShader |
| `llvmpipe` (default with no GPU otherwise) | Mesa's OpenGL ES 3.2 through ANGLE | SwiftShader |
| `swiftshader` | SwiftShader, as in `test/stills.mjs` | SwiftShader |
| `gpu` (default with a GPU) | the GPU | the GPU |

WebGPU is always on SwiftShader without a GPU: Chromium's Dawn does not offer other CPU Vulkan drivers to pages, with any of the flags tried.

The timings below are from 24 Oct 2026, with MuTracer 0.1.3; the 720p comparison under Native MuTracer is with 0.3.0.

Wall time for each tracer at 320×180, 16 spp, 4 bounces (`Prelude1.mid`, 20 s, `shoulder`), on a 64-core Graviton with no GPU:

| Tracer | lavapipe | llvmpipe | swiftshader |
| --- | --- | --- | --- |
| three-gpu-pathtracer WebGL | 86 s | 68 s | 137 s |
| MuTracer WebGL | **5 s** | 45 s (nearly all compiling) | no result in 22 min |
| three-gpu-pathtracer WebGPU (SwiftShader every time) | | 52 s (23 s of it OIDN) | |
| MuTracer WebGPU (SwiftShader every time) | | GPU process crashed (exit 133) after 9 and 19 min of compiling, with the watchdog off | |

At 1920×1080, 64 spp, MuTracer WebGL on lavapipe traced in 21 s and took 220 s wall in all. Most of the extra goes into the JNLM denoise and the readback after it, because the GPU work is still queued when the timer stops. [engines.js](engines.js) traces the whole frame as one tile on a CPU driver. Without that, MuTracer's tile scheduler kept splitting the frame smaller, and samples slowed from 5 s to over 5 min each by the eighth.

A 4K export at 12 fps, 4 spp, 10 bounces and no denoising, with 5 s of `Prelude1.mid` (72 frames with the page's 1 s pre-roll), took 36.6 min on lavapipe:

- **Per frame:** 28–32 s, almost all of it tracing. The snapshot and scene update were under 0.4 s once the snapshot cache held the stage. Frame 25 is where the session is recycled (every 24 frames): it spent 26 s rebuilding, about what one traced frame costs.
- **CPU:** 61.3 of 64 cores on average, peak 64.6, nearly all in Chromium's GPU process. lavapipe used every core.
- **Memory:** peak 9.15 GB PSS (GPU process 4.88 GB, page 4.05 GB) of 124 GB. It stayed flat across the clip, and the lowest free memory on the system was 71.7 GB.
- **Output:** H.264 (OpenH264 in Electron), 3840×2160, 6.0 s, 6.5 MB. The frames are noisy at 4 spp without denoising. Dark areas also show blocky compression, which is the exporter's default bitrate.

The defaults leave MuTracer WebGPU out on CPU backends. Name it in `--engines` to try it anyway.

On lavapipe and llvmpipe, MuTracer's WebGL 2 fallback renders the whole stage and looks like three-gpu-pathtracer's WebGPU still, so the blank MuTracer stills under Known problems are SwiftShader's fault. three-gpu-pathtracer's WebGL tracer is pale and over-lit on all three drivers, so that one is not down to SwiftShader. Whether a GPU shows it too has not been checked.

## Native MuTracer

[native/](native/) builds MuTracer's native SDK (Rust on wgpu) and times it on a frame the desktop app exports (`node run.mjs --export`), with MuTracer's own BVH and with hardware ray queries. On lavapipe it is no faster than the page: 6.9 s against 6.7 s at 720p, and ray queries make it 21.3 s. Its notes say how to run it on a machine with a GPU, where the ray queries could pay off.

## Tests

Headless, on SwiftShader, with the parent folder served at `http://127.0.0.1:8000/midiviz/` and playwright-core and a Chromium as for [pianist/test/shorts_sheet.mjs](../pianist/test/shorts_sheet.mjs):

- `node pathtrace/test/stills.mjs [song] [t] [view] [out dir]`: the raster frame and each tracer at the same moment, PNGs and a JSON report. Env: `ENGINES`, `SPP`, `BOUNCES`, `W`, `H`, `DENOISE`, `HAIR`, `FX`, `EXTRA` (more query, e.g. `&outfit=reference`)
- `node pathtrace/test/video.mjs [song] [out dir]`: a short path-traced export through the Render menu. Env: `ENGINE`, `SPP`, `RES`, `FPS`, `LEN`, `FX`, `DENOISE`, `BOUNCES`
- `pathtrace/test/mini.html?test=env|sky|spot|point|wide|down|rect|map|vcolor`: a sphere and a floor through each tracer, `window.run(engines)` returns the centre pixel

## Vendoring

`node pathtrace/tools/vendor.mjs` installs the pinned versions into a temp folder and builds browser modules into `vendor/three-gpu-pathtracer/` (both tracers and oidn-web, code-split, `three` left to the import map) and `vendor/mutracer/` (the library with gl-matrix and oidn-web inlined, its BVH worker and TinyBVH WASM beside it, the OIDN weights). About 4 MB, most of it MuTracer's denoiser weights, which three-gpu-pathtracer's OIDN denoiser reuses. Versions are listed in [vendor/PATHTRACERS.md](../vendor/PATHTRACERS.md).
