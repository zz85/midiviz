# Native MuTracer benchmark

`native-bench` renders the frame the [desktop app](../desktop/) exports with MuTracer's native SDK (Rust on wgpu, no browser), so the same frame can be timed against the page's MuTracer. It times each intersection backend:

- `software`: MuTracer's own BVH traversal in a compute shader, as in the browser.
- `hardware`: the GPU's ray queries through wgpu (`EXPERIMENTAL_RAY_QUERY`). Browsers' WebGPU doesn't offer them, so only native MuTracer has this path.

It prints the adapter, whether the device has ray queries, the time of the first sample (shader compilation and BVH or acceleration-structure build), and the median of three timed runs. Each run waits for the GPU to finish. It also writes a preview PNG of each, `native_<backend>_<W>x<H>_<spp>spp.png`, next to the export. The preview has a plain Reinhard tone map, not the page's AgX.

## On the GPU machine

1. **Export a frame.** In the repo on that machine:
   ```bash
   cd pathtrace/desktop && npm install
   node run.mjs --export Prelude1.mid 20 shoulder ~/pt_export
   ```
   This writes `scene.glb` (the frozen stage, 30 MB), `scene.json` (camera, lights, exposure) and `env.f32` (the environment map). Copying a folder exported elsewhere works too. All three files are needed.

2. **Build.** Needs git, Node 24 or later, stable Rust and a C++ compiler. The first build takes about 10 minutes.
   ```bash
   cd pathtrace/native && ./build.sh
   ```
   - macOS needs Xcode 26 or later selected with `xcode-select`; the Command Line Tools alone aren't enough.
   - Windows: run it from Git Bash inside a Visual Studio developer shell (see MuTracer's [Windows setup](https://github.com/pissang/mutracer/blob/v0.3.0/native/CONTRIBUTING.md#windows)).
   - It checks out MuTracer v0.3.0 into `pathtrace/native/mutracer/`, the version `vendor/mutracer` holds for the page. `MUTRACER_TAG` picks another.

3. **Run**, at the export's size or any other:
   ```bash
   target/release/native-bench ~/pt_export 4 10 1280x720 both
   target/release/native-bench ~/pt_export 4 10 3840x2160 both
   ```
   The arguments are the export folder, samples per pixel, bounces, size and backend (`software`, `hardware` or `both`).

4. **Compare with the page on the same machine:**
   ```bash
   cd pathtrace/desktop
   node run.mjs --still Prelude1.mid 20 shoulder ~/pt_still --size=1280x720 --spp=4 --bounces=10 --denoise=0 --engines=mu-webgpu,mu-webgl
   ```
   With a GPU the desktop app uses it (`--backend=gpu` is the default on macOS and Windows, and on Linux when `/dev/dri/renderD*` exists). Its report gives the tracing time apart from setup.

Ray queries need hardware ray tracing and a driver that exposes it to wgpu: on Vulkan, `VK_KHR_ray_query` (NVIDIA RTX, AMD RDNA 2 and later, Intel Arc); on macOS, Metal on Apple silicon (MuTracer verifies this platform itself). Where the device has none, `hardware` reports `ray queries false` and falls back to the software BVH.

## Apple M4 Pro (Metal)

Tracing time at 4 spp, 10 bounces, no denoising (`Prelude1.mid`, 20 s, `shoulder`), measured on 14 Nov 2026 with the desktop app at `--backend=gpu`, warm:

| | 1280x720 | 3840x2160 |
| --- | --- | --- |
| ThreeRT, ray queries | **0.11 s** | **0.84 s** |
| `native-bench hardware` (MuTracer, ray queries) | 0.18 s | 1.64 s |
| `native-bench software` (MuTracer's own BVH) | 0.39 s | 3.21 s |
| ThreeRT, its own BVH | 0.58 s | 4.64 s |
| Page, MuTracer WebGPU | 0.9–1.2 s | 6.2 s |
| Page, MuTracer WebGL 2 | about 0.8 s | about 7.2 s |
| Page, three-gpu-pathtracer WebGL | 1.1 s | |
| Page, three-gpu-pathtracer WebGPU | 3.4 s | |

- On a GPU, ray queries pay: 2.0x over MuTracer's own BVH at 4K, 5.5x for ThreeRT. The native tracers are 4–7x faster than the page.
- The page's MuTracer WebGL times are wall time less about 0.8 s of scene set-up and PNG encoding. Its own report said 0.7 s at 4K: it stopped the clock when the samples were submitted, not when the GPU had finished them. [engines.js](../engines.js) now waits for the GPU.
- With a fresh browser profile, so that shaders compile cold, a 720p still took 1.9 s on MuTracer WebGPU, 7.0 s on MuTracer WebGL and 0.5 s on three-gpu-pathtracer WebGL.
- These are speeds, not quality: ThreeRT renders without the environment map and with its own tone curve, so its pictures differ from MuTracer's.

## Lavapipe (no GPU)

On the 64-core Graviton this repo is developed on, with lavapipe as the Vulkan driver, at 1280x720, 4 spp, 10 bounces (`Prelude1.mid`, 20 s, `shoulder`):

| | Tracing |
| --- | --- |
| Page, MuTracer 0.3.0 WebGL (desktop app, lavapipe) | 15.1 s (about 11 s after the first sample) |
| `native-bench software` | 6.9 s |
| `native-bench hardware` | 21.3 s |

- lavapipe offers ray queries, but on a CPU they run Mesa's generic traversal, which is 3x slower than MuTracer's own BVH shader.
- The native renderer kept about 12 of the 64 cores busy, and `LP_NUM_THREADS` didn't change that.
- 4K doesn't run natively on lavapipe: MuTracer needs a 398 MB storage buffer there, and lavapipe allows 128 MB.

The page's figure was first recorded as 6.7 s, which was only the time to submit the samples (see above). Measured with the GPU wait, on 14 Nov 2026 and with the page's depth of field on, it is 15.1 s, so native MuTracer's own BVH is the fastest path here too, up to the 1080p it can reach. The page stays the one to use for 4K and for video, which need no export.

## ThreeRT

[ThreeRT](https://github.com/meshy-dev/ThreeRT) (Meshy, MIT) is another path tracer on Rust and wgpu, built for real time on ray-tracing GPUs: hardware ray queries where the GPU has them, its own BVH where it doesn't. It reads scenes written against its own three.js-style API, not three.js itself, so it can't trace the page's live scene. [threert/midiviz-pianist.ts](threert/midiviz-pianist.ts) builds that scene from the same export: `scene.glb` in metres, the five spot lights and the area light, and the camera.

```bash
./threert.sh ~/pt_export 4 10 1280x720 3840x2160
```

The arguments are the export folder, samples per pixel, bounces, then sizes. It checks ThreeRT out at the commit tested here into `threert-src/` (`THREERT_COMMIT` picks another), builds `threert-render` (about a minute), bundles the scene and renders each size with its BVH and with ray queries, after one small untimed render of each to compile the shaders. Results go to `<export>/threert/`: a PNG and a log for each run, `info.json` (the adapter, and `hwrt`, whether it has ray queries) and `results.jsonl`, one JSON line a run with `hwrt` and `timings_ms.trace_ms`. It needs git, Node 24 or later and stable Rust.

Differences from the page, so compare its timings and not its pictures:

- No environment map: its native renderer refuses HDRI environments ("not supported by the native renderer yet"), so the stage is darker.
- Its own tone curve, a UE-style filmic one, in place of the page's AgX.
- Light units differ: spots are in candela and the area light in nits, converted from the export as well as the two engines allow.

On lavapipe, at 1280x720, 4 spp, 10 bounces, no denoising, after the warm-up: 9.8 s with its BVH and 39.3 s with ray queries, against 15.1 s for the page's MuTracer. The first render of a session compiles its shaders inside the trace time; it read 26.2 s.

On Linux ARM64 `build.sh` adds two things MuTracer doesn't ship for that platform: the ARM64 build of scriptc (MuTracer's TypeScript-to-native compiler), and a source build of the oidn-webgpu denoiser core.
