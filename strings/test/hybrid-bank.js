// Load the hybrid sampler's bank in Node (tests, offline renders): decodes the
// Opus packs with ffmpeg. The bank is built by build_iowa.js.
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SampleBank } from '../sound/hybrid.js'

const dir = instrument => fileURLToPath(new URL(`../sound/samples/iowa/${instrument}/`, import.meta.url))
export const hasBank = (instrument = 'violin') => existsSync(dir(instrument) + 'manifest.json')

let ffmpeg = null
export const hasFfmpeg = () => {
  if (ffmpeg == null) { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); ffmpeg = true } catch { ffmpeg = false } }
  return ffmpeg
}

const cache = new Map()
export function loadBankNode(instrument = 'violin', keys = null) {
  const d = dir(instrument)
  const m = JSON.parse(readFileSync(d + 'manifest.json', 'utf8'))
  const pcm = {}
  for (const [key, p] of Object.entries(m.packs)) {
    if (keys && !keys.includes(key)) continue
    const id = instrument + key
    if (!cache.has(id)) {
      const b = execFileSync('ffmpeg', ['-v', 'error', '-i', d + p.file, '-f', 'f32le', '-ac', '1', '-ar', String(m.sampleRate), '-'], { maxBuffer: 1 << 30 })
      cache.set(id, new Float32Array(b.buffer, b.byteOffset, b.length / 4))
    }
    pcm[key] = cache.get(id)
  }
  return new SampleBank(m, pcm)
}
