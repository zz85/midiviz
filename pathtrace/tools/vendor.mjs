// Vendors the two path tracers for #045 into vendor/ as browser ES modules
// (no bundler on the page, and MuTracer's BVH workers must be same-origin).
//   node pathtrace/tools/vendor.mjs
// Needs npm (it installs into a temp folder) and fetches esbuild with npx.
//
//  • three-gpu-pathtracer (Garrett Johnson, MIT): both path tracers, the
//    WebGPU one (`three-gpu-pathtracer/webgpu`, WebGPUPathTracer, wavefront
//    or megakernel compute on three/webgpu) and the deprecated WebGL one
//    (WebGLPathTracer, the main entry), code-split so three-mesh-bvh is
//    shared; `three` and its subpaths stay external (the page's import map,
//    r185). oidn-web beside them for its OIDN denoiser.
//  • MuTracer (@meimu/mutracer, Yi Shen, MIT): the whole library with
//    gl-matrix and oidn-web inlined, code-split so OIDN loads only when used;
//    its BVH worker and TinyBVH WASM beside it, the OIDN weights at ../oidn/
//    (the paths the library resolves from import.meta.url).
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const VERSIONS = { 'three-gpu-pathtracer': '0.0.27', 'three-mesh-bvh': '0.9.16', '@meimu/mutracer': '0.1.3', three: '0.185.1', 'oidn-web': '0.4.0' }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-vendor-'))
const sh = (cmd, cwd = tmp) => execSync(cmd, { cwd, stdio: 'inherit' })
fs.writeFileSync(path.join(tmp, 'package.json'), '{"private":true,"type":"module"}')
sh(`npm i --no-audit --no-fund --legacy-peer-deps ${Object.entries(VERSIONS).map(([k, v]) => `${k}@${v}`).join(' ')} esbuild@0.28`)
const esbuild = path.join(tmp, 'node_modules/.bin/esbuild')
const nm = p => path.join(tmp, 'node_modules', p)

// three-gpu-pathtracer
const gptOut = path.join(ROOT, 'vendor/three-gpu-pathtracer')
fs.rmSync(gptOut, { recursive: true, force: true }); fs.mkdirSync(gptOut, { recursive: true })
fs.writeFileSync(path.join(tmp, 'three-gpu-pathtracer.js'), "export * from 'three-gpu-pathtracer'\n")
fs.writeFileSync(path.join(tmp, 'webgpu.js'), "export * from 'three-gpu-pathtracer/webgpu'\n")
fs.writeFileSync(path.join(tmp, 'oidn-web.js'), "export * from 'oidn-web'\n")
sh(`${esbuild} three-gpu-pathtracer.js webgpu.js oidn-web.js --bundle --format=esm --splitting --external:three --external:'three/*' --minify --legal-comments=eof --outdir=${gptOut} --chunk-names=chunk-[hash]`)
fs.copyFileSync(nm('three-gpu-pathtracer/LICENSE'), path.join(gptOut, 'LICENSE'))
fs.copyFileSync(nm('three-mesh-bvh/LICENSE'), path.join(gptOut, 'LICENSE.three-mesh-bvh'))

// MuTracer
const muOut = path.join(ROOT, 'vendor/mutracer')
fs.rmSync(muOut, { recursive: true, force: true }); fs.mkdirSync(path.join(muOut, 'lib'), { recursive: true })
const mu = nm('@meimu/mutracer')
sh(`${esbuild} ${mu}/lib/main.js --bundle --format=esm --splitting --minify --legal-comments=eof --outdir=${muOut}/lib --entry-names=mutracer --chunk-names=chunk-[hash]`)
sh(`${esbuild} ${mu}/lib/renderer/bvh.worker.js --bundle --format=esm --minify --legal-comments=eof --outfile=${muOut}/lib/bvh.worker.js`)
fs.copyFileSync(path.join(mu, 'lib/tinybvh/tinybvh.wasm'), path.join(muOut, 'lib/tinybvh.wasm'))
fs.cpSync(path.join(mu, 'oidn'), path.join(muOut, 'oidn'), { recursive: true })
for (const f of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) fs.copyFileSync(path.join(mu, f), path.join(muOut, f))
fs.cpSync(path.join(mu, 'LICENSES'), path.join(muOut, 'LICENSES'), { recursive: true })

fs.writeFileSync(path.join(ROOT, 'vendor/PATHTRACERS.md'), `Vendored by pathtrace/tools/vendor.mjs for Experiment #045:\n\n${Object.entries(VERSIONS).map(([k, v]) => `- ${k} ${v}`).join('\n')}\n`)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('vendored into', gptOut, 'and', muOut)
