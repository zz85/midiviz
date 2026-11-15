# Path tracers on a GPU (#045)

What the four paths of Experiment #045 cost and look like on a machine with a real GPU, and how
the two native integrations are built. The notes in [native/README.md](native/README.md) were
measured on the 64-core Graviton with lavapipe; several of their conclusions **invert** on a GPU,
so they are marked there and explained here.

Measured on an **Apple M4 Pro** (Metal, integrated, wgpu reports `IntegratedGpu`), macOS 26.
Scene: `Prelude1.mid` at t=20, `shoulder` — 0.29 M triangles in 723 meshes, 6 lights, 10 bounces,
depth of field (focus 109 cm, aperture 19.5 mm), no denoising unless said. The page's figures come
from the Electron app at `--backend=gpu`; `scene.glb`/`scene.json`/`env.f32` from the same export
feed the native paths, so every row traces the same frame.

```bash
cd pathtrace/desktop && node run.mjs --export Prelude1.mid 20 shoulder ~/pt_export
cd pathtrace/native  && ./build.sh
target/release/native-bench ~/pt_export 4 10 3840x2160 both
./threert.sh ~/pt_export 4 10 3840x2160
cd ../desktop && node run.mjs --still Prelude1.mid 20 shoulder ~/pt_still \
  --size=3840x2160 --spp=4 --bounces=10 --denoise=0 --engines=mu-webgpu,mu-webgl,gpt-webgpu
```

## Tracing time, 3840×2160, 10 bounces

Tracing only (setup, shader compilation and read-back excluded), GPU-fenced in every row.
The page's numbers require `f8d69ca` or later — see [The WebGL clock](#the-webgl-clock).

| Path | Intersection | 4 spp | 16 spp | 64 spp |
| --- | --- | --- | --- | --- |
| ThreeRT | hardware ray queries | **0.84 s** | **3.3 s** | **13.2 s** |
| `native-bench` (MuTracer) | hardware ray queries | 1.64 s | 5.77 s | 23.6 s |
| `native-bench` (MuTracer) | own BVH, compute | 3.21 s | 12.32 s | — |
| Page `gpt-webgpu` | three-gpu-pathtracer, WebGPU | 4.3 s | 18.1 s | 79.9 s |
| ThreeRT | own BVH, compute | 4.64 s | 18.5 s | 76.8 s |
| Page `mu-webgpu` | MuTracer BVH, WebGPU | 6.3 s | 25.9 s | 107.3 s |
| Page `mu-webgl` | MuTracer BVH, WebGL 2 | 7.3 s | 27.5 s | — |
| Page `gpt-webgl` | three-gpu-pathtracer, WebGL 2 | crashes | crashes | crashes |

**ThreeRT's rows are not like-for-like.** Its native renderer refuses HDRI environments, so it
traces the stage without the environment map and does less light transport than every other row.
Read it as an upper bound on what ray queries can do here, not as a comparable render.

## Tracing time, 1280×720, 4 spp, 10 bounces

| Path | Trace |
| --- | --- |
| ThreeRT, ray queries | **0.11 s** |
| `native-bench` hardware (MuTracer, ray queries) | 0.18 s |
| `native-bench` software (MuTracer's own BVH) | 0.39 s |
| ThreeRT, its own BVH | 0.58 s |
| Page `mu-webgpu` | 0.9–1.2 s |
| Page `gpt-webgl` | 1.1 s |
| Page `mu-webgl` | 1.2 s |
| Page `gpt-webgpu` | 3.4 s |

`mu-webgpu` is a range rather than one figure: it was the only row that did not settle across
repeats. Note that `gpt-webgpu` is the slowest of the page's four engines at 720p and the fastest of
them at 4K — it carries a fixed per-frame cost that only pays off at size.

Four things these tables say:

- **Ray queries are worth about 2× within one renderer** (`native-bench` 3.21 → 1.64 s), and 5.5×
  for ThreeRT against its own BVH. The gap widens slightly with samples (2.0× at 4 spp, 2.1× at
  16), because traversal is a per-ray cost rather than a fixed setup win.
- **Browser overhead dominates, not the algorithm.** `mu-webgpu` runs the same BVH as
  `native-bench software` and takes about twice as long (6.3 vs 3.21 s). Going native buys more
  than changing engines inside the page.
- **Everything scales ~3.5–4.2× for 4× the samples** — essentially linear, the shortfall being
  amortised per-frame cost. The 4 spp ranking predicts every higher count.

`gpt-webgl` cannot do 4K here: reproducible over three attempts,
`Failed to create shared texture memory due to device loss`, GPU process exits 8704. It is fine at
720p. `gpt-webgpu` is the only `gpt-*` path that survives 4K.

## How many samples the frame needs

Noise measured as the RMS deviation of luminance from its own 3×3 box mean over the whole frame,
plus the share of pixels more than 40/255 **above** that mean (fireflies). It is a relative figure:
real high-frequency texture also registers, so a fully converged render floors out near 8.7 rather
than 0.

| 4K, `native-bench` hardware | Trace | Noise | Bright outliers |
| --- | --- | --- | --- |
| 4 spp | 1.64 s | 16.22 | 1.79 % |
| 16 spp | 5.77 s | 11.00 | 1.08 % |
| 64 spp | 23.6 s | 9.43 | 0.92 % |
| 256 spp | 94.5 s | 8.73 | 0.84 % |
| page 4 spp + OIDN | — | 0.58 | 0.00 % |

**4 spp is not deliverable at 4K, and the reason is worse than grain.** At 1:1 the piano
soundboard is an undifferentiated brown mush; by 64 spp it resolves into individual strings,
dampers and tuning pins. Four rays per pixel do not merely add noise there, they **fail to find
thin geometry at all**. The dress carries heavy uniform grain and the contact shadow under the arm
goes blotchy in every engine.

**Denoising is not a substitute for samples on this frame.** OIDN at 4 spp gives a clean dress but
smears the strings into a blur — it reads 0.58, far *below* the 8.7 detail floor of a converged
render, i.e. it removed real content. Use it on top of enough samples, not instead of them.

So **64 spp** is where the strings read correctly: 13.2 s a frame with ThreeRT's ray queries,
23.6 s native, against ~100 s in the page. 16 spp (5.8 s native) is defensible only where the
soundboard is out of focus or out of frame, which at this view it is not.

At matched 4 spp the engines do not agree on quality either:

| 4K, 4 spp | Noise | Bright outliers |
| --- | --- | --- |
| ThreeRT, ray queries | 14.25 | 1.68 % |
| `native-bench` hardware | 16.22 | 1.79 % |
| Page `mu-webgpu` | 20.33 | 3.27 % |
| Page `mu-webgl` | 27.07 | 4.43 % |

The WebGL path is the noisiest of the MuTracer pair at low sample counts, though the two converge by
16 spp (13.48 vs 12.38 at 720p). Pick `mu-webgpu` over `mu-webgl` on quality, not only on speed.
ThreeRT's lower figure is not a win: it traces without the environment map, so some of that
smoothness is light transport it never did.

## Hardware ray queries

Both are GPU work; what differs is which part of the GPU walks the scene. With its **own BVH** the
renderer builds the tree and traverses it in ordinary shader code on the general-purpose cores.
With **ray queries** it hands triangles to the driver, which builds an acceleration structure, and
fixed-function RT units do traversal and triangle intersection. ThreeRT's own logs show the swap:
its BVH is 188 737 nodes built in 101 ms with 46.1 MB of triangle data; with ray queries it reports
`bvh_nodes: 1`, a 25 ms acceleration-structure build, and 40.6 MB moved into `tri_blas_mb`.

**Browsers do not expose ray queries, which is why only the native rows have them.** This is not an
architectural limit of the web API — the code is already written against WebGPU shapes. Both
renderers gate on `wgpu::Features::EXPERIMENTAL_RAY_QUERY`
(`mutracer/native/host/diagnostics/ray-query-probe.rs`, `threert-src/renderer/src/gpu.rs:1363`) and
their shaders are WGSL (`enable wgpu_ray_query;`, then the `ray_query` type). The `EXPERIMENTAL_`
and `wgpu_` prefixes mark a wgpu extension, available when wgpu runs natively against Vulkan
`VK_KHR_ray_query`, Metal or DX12, but not through a browser's WebGPU. Electron does not help: it is
Chromium's WebGPU. Native is the only route to the 2×.

**"Ray queries available" is not "hardware ray tracing present."** lavapipe advertises the feature
and runs traversal on the CPU, which is exactly why `hardware` was *3× slower* there (21.3 s vs
6.9 s) and is 2× faster here. The feature flag says the API exists, not that there is silicon
behind it.

## The WebGL clock

Before `f8d69ca`, `engines.js` stopped MuTracer's clock when `render.samples` reached the target,
which counts samples *submitted*. With no GPU fence, WebGL reported its dispatch time: 0.7 s for a
4K still that really took about 7 s, and a figure that did not grow with samples (1 / 4 / 16 spp
read 5.2 / 0.2 / 0.4 s while the images converged properly, 50.2 → 27.3 → 13.5 noise). WebGPU came
out close by accident, paced by presenting. The loop now waits on a WebGL fence or
`onSubmittedWorkDone`; the same three counts read 0.4 / 1.2 / 4.1 s and match wall time.

Worth remembering when reading any in-page timing: a number that does not scale with the work is
measuring submission, not rendering.

## How the native integrations are built

The three renderers put JavaScript at different layers, which decides what a native port costs.

**MuTracer — the renderer *is* TypeScript, compiled.** Its core is authored in TS and compiled
ahead of time to a linkable static archive (`build.sh`, producing `native/.build/render-core.lib.a`),
with a thin Rust + wgpu host around it. three.js appears only as an adapter at the boundary
(`MU.fromTHREEScene` in the page; `native-bench` builds the scene from glTF through MuTracer's own
`Scene`/`Light`/`Texture` API with no three.js at all). One renderer source, swapped
*compilation target*.

The compiler is **scriptc** — a separate third-party project, not MuTracer's own:
[scriptc.dev](https://scriptc.dev), `github.com/vercel-labs/scriptc`, Apache-2.0, pinned at 0.4.4
as prebuilt npm binaries (`@scriptc/cli-{darwin-arm64,darwin-x64,linux-x64-gnu,win32-x64-msvc}` —
no linux-arm64, hence `build.sh`'s Graviton workaround). It self-describes as "TypeScript/JavaScript
to native and WebAssembly executables (experimental)" and runs tsc, then LLVM via
`scriptc-llvm-codegen`, to an executable, a static archive, or a wasm32-wasi reactor. It compiles a
statically analyzable *subset*: `scriptc coverage` reports "how much compiles statically, and why
not", with blockers and diagnostics for dynamic or untyped code. Note that MuTracer and oidn-webgpu,
the two projects using it here, share an author — treat scriptc as experimental and thinly used.

**ThreeRT — JavaScript is the scene description, interpreted.** It embeds QuickJS
(`rquickjs = "0.12"`, standard bindings, not a fork) under `cfg(not(target_arch = "wasm32"))`, and
wgpu is never exposed to JS: the binding surface in `src/script.rs` is a scene vocabulary —
`camera`, `light`, `material`, `geometry`, `texture`, `environment`, `object`, `instances`,
`animation`, `physics`, `settings` — plus `__host_log`, `__host_now`, `__host_post`. The path tracer
is natively authored Rust + WGSL (wgpu 30, `wesl` doing conditional shader translation, which is how
it swaps its BVH kernel for the `ray_query` one). The script runs once: `script_ms` is about 10 ms
of a 350–900 ms frame. One native renderer, swapped *script host* — QuickJS natively, the browser's
own engine on wasm32.

So the two are mirror images, and that explains the pictures. MuTracer native matches the page
because it is literally the same source compiled differently — its software and hardware backends
agree to 1.3/255, and `native-bench software` vs `mu-webgpu` cleanly isolates browser overhead.
ThreeRT's renderer was never the page's renderer, so its divergence (no environment map, a UE-style
filmic curve instead of AgX, light units converted by hand in
[native/threert/midiviz-pianist.ts](native/threert/midiviz-pianist.ts)) is structural, not a gap to
close. Compare its timings, never its pixels. Its two backends agree to 0.13/255, so the ray-query
path is not cutting corners.

**three-gpu-pathtracer is neither shape, and a native port is not a useful target.** Its WebGPU
entry imports `three`, `three/webgpu` **and `three/tsl`** — the shaders are generated at runtime by
three.js's node system — and its BVH is three-mesh-bvh bundled in. three.js is not a scene format it
reads, it is what the renderer is made of, so there is no renderer-independent core for scriptc and
no native renderer to hand a scene DSL to. Worse, ray queries *replace* BVH traversal, and gpt's
distinguishing content is precisely its three-mesh-bvh traversal: the part you would port is the
part hardware RT deletes. If a native renderer with gpt's look is ever wanted, the coherent form is
to fork ThreeRT and port gpt's material and tone-mapping conventions into it, keeping ThreeRT's
traversal — and `midiviz-pianist.ts` already prices the scene-rebuild work that implies.

## Native mode in the desktop app

Two more engines, `mu-native` and `rt-native`, sit beside the page's four when it runs in the desktop
app, so stills, the page's menus and its video export take them as they are:

```bash
cd pathtrace/native && ./build.sh && ./threert.sh ~/pt_export     # once: mu-trace, and ThreeRT
cd ../desktop
node run.mjs --still Prelude1.mid 20 shoulder ~/pt_still --size=3840x2160 --spp=64 --bounces=10 --denoise=0 --engines=mu-native,rt-native
node run.mjs --video Prelude1.mid ~/pt_video --engine=mu-native --res=3840x2160 --spp=64 --bounces=10
```

They trace the scene the page's MuTracer engines trace, with no scene of their own and no glTF:

1. **The page** runs `MU.fromTHREEScene` on its snapshot, as `mu-webgpu` does, and
   [native-scene.js](native-scene.js) writes the result out as it stands — `scene.json` with
   MuTracer's own field names, `scene.bin` with the arrays and pixels.
2. **The app**: the page can't start a program, so [desktop/preload.cjs](desktop/preload.cjs) gives
   it three calls, and [desktop/native.cjs](desktop/native.cjs) in the main process writes the frame
   to a temporary folder and runs the renderer as a child process (no shell, nothing listening).
3. **mu-native**: [native/src/bin/mu-trace.rs](native/src/bin/mu-trace.rs) rebuilds it with
   MuTracer's native Scene API. Every material property is set by name through MuTracer's own
   schema (`native/schemas/material-properties.json`), so nothing maps material parameters by
   hand: 119 materials across, none left out.
4. **rt-native**: [native/threert/midiviz-ir.ts](native/threert/midiviz-ir.ts) is a scene script
   that builds whatever the page encoded. ThreeRT's scripts can't read files, so the frame goes in
   front of the bundled script as two globals; its QuickJS has `Uint8Array.fromBase64`, which
   decodes 7.5 MB in 5 ms.
5. Both are sessions of [native-engines.js](native-engines.js) with the interface of
   `engines.js`'s others, which is why `still.js` and `video.js` needed no change of their own.

**mu-native traces the page's picture.** Against `mu-webgpu` on the same frame, as 16-pixel block
means, so that sample noise averages out:

| 720p | mean \|Δ\| | p95 | max | mean level |
| --- | --- | --- | --- | --- |
| `mu-webgpu` vs `mu-webgl` (both the page's) | 1.87 | 11.26 | 33.8 | 62.70 vs 61.38 |
| `mu-webgpu` vs `mu-native`, ray queries, 64 spp | 0.98 | 4.17 | 9.3 | 64.11 vs 63.46 |
| `mu-webgpu` vs `mu-native`, its own BVH, 64 spp | **0.40** | **1.56** | 9.3 | **64.11 vs 64.13** |

- With its own BVH it is the page's picture. Ray queries on Metal come out about 1 % darker, with
  differences where surfaces touch (the piano's feet on the floor): MuTracer's known issues, "with
  Metal HWRT, a sample can occasionally … fail to accumulate … a small bias in offline images", and
  "coplanar or overlapping surfaces can resolve to different triangles in the two backends".
  `MIDIVIZ_NATIVE_BACKEND=software` picks the BVH.
- MuTracer's Rust Scene API has no spot radius, though its descriptor and core do; the page's
  spots are 6 cm discs. mu-trace writes the radii into the encoded descriptor. Without it, the
  spots' shadow edges go hard: max block difference 27.2 instead of 11.1.
- The prototype's hand-written conversions had two errors the reuse removes: `native-bench`
  computed the spots' inner angle by a formula of its own, not `fromTHREE`'s
  `outer · (1 − penumbra)`, and `midiviz-pianist.ts` passed linear light colours as hex, which
  ThreeRT reads as sRGB.

**What it costs, 4K, 10 bounces, through the app** (the page's encoding, the hand-over, a new
renderer process, the PNG back):

| | 16 spp | 64 spp |
| --- | --- | --- |
| Page `mu-webgpu` | 25.9 s | 107.3 s |
| `mu-native` | 9.1 s (trace 7.6 s, first sample 4.2 s) | **28.7 s** (trace 27.0 s) |
| `rt-native` | 5.3 s (trace 3.8 s) | **16.3 s** (trace 14.9 s) |

So 3.7× the page for MuTracer and 6.6× for ThreeRT, end to end. Each frame starts a new
renderer, which compiles its shaders and builds its acceleration structures again: about 3.5 s of
`mu-native`'s first sample at 4K, against 0.8 s for `native-bench`'s warmed run. A renderer that stays
up between frames would pay it once a video; that is the next step for long renders. The page's
part is small: MuTracer's conversion 13 ms, the encoding 62 ms, 60 MB (774 meshes, 17 textures).

**rt-native leaves out** what ThreeRT's materials don't have and says so in its report: sheen
(OpenPBR fuzz), coat normal maps and alpha maps on this frame, and the environment map. Its tone
curve is its own, and it denoises with OIDN only when built with its `oidn` feature; `threert.sh`'s
build has its à-trous filter, which barely touches 4 spp noise. Textures go across as RGBA8 with
their rows turned (ThreeRT puts a `DataTexture`'s row 0 at v = 1, three.js and MuTracer at v = 0).

## Caveats

- One machine, one frame, one GPU vendor. Metal on Apple silicon only; nothing here is measured on
  Vulkan `VK_KHR_ray_query` hardware (NVIDIA RTX, AMD RDNA 2+, Intel Arc), where the ratios may
  differ.
- ThreeRT traces without the environment map (above), and `native-bench` previews use a plain
  Reinhard curve rather than the page's AgX, so judge detail and not colour across engines.
- The architecture section is read from the import graphs, `Cargo.toml`s and binding surfaces of the
  vendored copies, not from porting anything. `scriptc coverage` on the vendored gpt bundle was
  inconclusive — it stops at its own typecheck gate on minified input, which says nothing about
  gpt's real compilability; a fair test needs gpt's TypeScript sources.
- 4K page figures need `f8d69ca` or later. Anything older under-reports WebGL by about 10×.
