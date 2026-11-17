// Read a work's pages with ScoreShift: node scoreshift_read.mjs <work> [part ...]  (default: score violin)
// Writes cache/<work>/scoreshift-<part>.json: per page, the staves ScoreShift found, in the scan's
// pixels, each with its clef, key and note heads ([x, y, midi], grace notes left out), system by
// system, top to bottom. A page whose staves are of two sizes (the cue-size violin staff in a score)
// is read once at each size (scoreshift_eval.mjs's readPage). fuse.py puts the heads into bars.
// SCORESHIFT is ScoreShift's directory, as for scoreshift_eval.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { readPage } from './scoreshift_eval.mjs'

const here = path.dirname(new URL(import.meta.url).pathname)
const [work, ...parts0] = process.argv.slice(2), parts = parts0.length ? parts0 : ['score', 'violin']
const W = JSON.parse(fs.readFileSync(path.join(here, 'works', work, 'work.json'), 'utf8'))
const cache = path.join(process.env.TRANSCRIBE_CACHE || path.join(here, 'cache'), work)
for (const part of parts) {
  const [lo, hi] = W.parts[part], out = {}
  let fifths = { big: W.fifths ?? null, small: W.fifths ?? null }
  for (let n = lo; n <= hi; n++) {
    const pg = 'p' + String(n).padStart(4, '0')
    const scan = fs.readdirSync(path.join(cache, 'scan')).find(f => f.startsWith(pg + '.') && !f.includes('.gray.'))
    if (!scan) { console.error(pg, 'no scan'); continue }
    try {
      const r = readPage(path.join(cache, 'scan', scan), fifths); fifths = r.endFifths
      out[pg] = r.systems.map(g => g.map(st => ({ size: st.size, clef: st.clef, fifths: st.fifths, top: +st.top.toFixed(1), bot: +st.bot.toFixed(1), x0: +st.x0.toFixed(1), x1: +st.x1.toFixed(1),
        heads: st.keep.map(h => [+h.x.toFixed(1), +h.y.toFixed(1), h.midi]) })))
      console.log(part, pg, `${Math.round(r.ms)} ms`, out[pg].map(g => g.length).join(' '))
    } catch (e) { console.error(pg, e.message); out[pg] = null }
  }
  fs.writeFileSync(path.join(cache, `scoreshift-${part}.json`), JSON.stringify(out))
}
