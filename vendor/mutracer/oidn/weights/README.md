# Intel® Open Image Denoise weights

Trained weights of the convolutional networks used by
[Intel Open Image Denoise](https://github.com/OpenImageDenoise/oidn) (OIDN),
stored in OIDN's `.tza` format and released under the Apache License 2.0
(see [`LICENSE.txt`](./LICENSE.txt)).

| File | Used by |
| --- | --- |
| `rt_hdr_alb_nrm.tza` | `model: 'standard'` (default): HDR color + albedo + normal |
| `rt_hdr_alb_nrm_small.tza` | `model: 'small'`: fastest, for denoising while converging |
| `rt_hdr_calb_cnrm_large.tza` | `model: 'cleanAuxLarge'`: highest quality, with prefiltered guides |
| `rt_alb_large.tza`, `rt_nrm_large.tza` | Albedo / normal prefilters for `cleanAuxLarge` |

All five files come from [RenderKit/oidn-weights](https://github.com/RenderKit/oidn-weights/tree/28883d1769d5930e13cf7f1676dd852bd81ed9e7)
at commit `28883d1769d5930e13cf7f1676dd852bd81ed9e7` (OIDN 2.3).

## SHA-256

```text
e586ef2ff48d7fbb7611986405220ed8fc5c13ca79bfc40be4dc742fbf959e1a  rt_hdr_alb_nrm.tza
980ea307e7825cae23ed8b1addf8de62ece84b61094795a5631ebf1c91b2e1a7  rt_hdr_alb_nrm_small.tza
08130cdc4f33b7a513d0073757f089ac830f900613bb5bad72ca42c52b934465  rt_hdr_calb_cnrm_large.tza
a8efbe6eed511f41c8f5ff9145923214cefb0703cf91a3b00a1dc131ade1600a  rt_alb_large.tza
8ac7705ec5ac303116b40ad2f0880cd741ed1f4280828bf2f18f7635c3377257  rt_nrm_large.tza
```

## Loading

MuTracer bundles standard and small, loading them from application assets by
default. Vite development requires `optimizeDeps: { exclude: ['@meimu/mutracer'] }`;
otherwise MuTracer warns once and falls back to its version-pinned CDN copy.
The complete `oidn-weights@2.3.0-1` package also includes all three large networks:

```text
https://cdn.jsdelivr.net/npm/oidn-weights@2.3.0-1/<filename>.tza
```

To self-host, install `oidn-weights@2.3.0-1`, copy `node_modules/oidn-weights/*.tza`
to static assets, then pass `weightsBaseUrl: '/assets/oidn/weights/'` to
`renderer.setDenoiser()`. When using only standard/small, copy the two `.tza`
files from `node_modules/@meimu/mutracer/oidn/weights/` instead. This repository retains
all five files for examples and viewer builds.
