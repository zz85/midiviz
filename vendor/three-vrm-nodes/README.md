# three-vrm nodes (MToonNodeMaterial), for three.js r187

`index.module.js` is `@pixiv/three-vrm@3.5.5/lib/nodes/index.module.js` (MIT, pixiv Inc.;
its licence header is kept) with one change: `transformedNormalView` is `normalView`.
three.js r187's TSL no longer exports `transformedNormalView` (the transformed normal
in view space has been `normalView` since r171), and 3.5.5 is three-vrm's latest
release, so the published file fails to import against r187. Used by #038 Duo's
WebGPU renderer (duo/gpu.js), through the page's import map.

To refresh: download the file again and apply the same rename.
