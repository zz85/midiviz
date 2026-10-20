// Fetch the LilyPond sources of the Mutopia pieces in violinist/midis (their
// "source" pages in index.json) into strings/data/MutopiaLy (git-ignored), one
// folder per piece with midis.json naming the MIDI files made from it, for
// strings/test/lilypond.js.
//
//   node strings/test/fetch_mutopia_ly.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { zipTexts } from '../score.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const out = here + '../data/MutopiaLy/'
const index = JSON.parse(readFileSync(here + '../../violinist/midis/index.json', 'utf8'))
const bySource = new Map()
for (const e of index) { if (!bySource.has(e.source)) bySource.set(e.source, []); bySource.get(e.source).push(e.file) }
for (const [src, midis] of bySource) {
  const id = src.match(/id=(\d+)/)?.[1]
  if (!id) continue
  const dir = `${out}m${id}/`
  if (existsSync(dir + 'midis.json')) { console.log('have', id); continue }
  const html = await (await fetch(src)).text()
  const links = [...new Set([...html.matchAll(/href="([^"]+?(?:\.ly|-lys\.zip))"/g)].map(m => m[1]))]
  mkdirSync(dir, { recursive: true })
  for (const url of links) {
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
    if (url.endsWith('.zip')) {
      for (const [name, text] of await zipTexts(buf.buffer, b => inflateRawSync(b))) {
        const p = dir + name
        mkdirSync(p.slice(0, p.lastIndexOf('/')), { recursive: true })
        writeFileSync(p, text)
      }
    } else writeFileSync(dir + url.split('/').pop(), buf)
  }
  writeFileSync(dir + 'midis.json', JSON.stringify(midis))
  console.log(id, links.map(l => l.split('/').pop()).join(' '), '→', midis.join(' '))
}
