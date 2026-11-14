// Resolve 'three' and 'three/addons/…' for Node tests of modules the pages
// load through an import map (hand-driver.js, hands3d.js). Import this first:
//   import './three-node.mjs'
// Looks for a three.js package in $THREE (the package folder), then in the
// checkouts found on this machine; `threeFound` is false when there is none,
// so a test can skip.
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('../../', import.meta.url))
const CANDIDATES = [
  process.env.THREE,
  here + 'node_modules/three',
  here + 'pathtrace/native/mutracer/node_modules/three',
  `${process.env.HOME}/test/pawchestra/node_modules/.pnpm/three@0.187.0/node_modules/three`,
].filter(Boolean)
const dir = CANDIDATES.find(d => existsSync(d + '/build/three.module.js'))
export const threeFound = !!dir

if (dir) registerHooks({
  resolve(spec, ctx, next) {
    if (spec === 'three') return { url: pathToFileURL(dir + '/build/three.module.js').href, shortCircuit: true }
    if (spec.startsWith('three/addons/')) return { url: pathToFileURL(dir + '/examples/jsm/' + spec.slice(13)).href, shortCircuit: true }
    return next(spec, ctx)
  },
})
