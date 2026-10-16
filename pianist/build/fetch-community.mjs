// Fetches MakeHuman community assets for the #032 pianist.
//
//   node pianist/build/fetch-community.mjs <assets.json> <nid>… [--out mh-assets/community]
//
// assets.json is the community repository's catalogue
// (http://www.makehumancommunity.org/sites/default/files/assets.json, the
// file MakeHuman's asset downloader reads). Each asset lands in
// <out>/<nid>/ with every file the catalogue lists for it (.mhclo, .obj,
// .mhmat, textures) and its catalogue entry as meta.json, which is what
// build-character.mjs reads. Only CC0 and CC-BY assets are fetched.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const args = process.argv.slice(2)
const oi = args.indexOf('--out')
const OUT = oi >= 0 ? path.resolve(args.splice(oi, 2)[1]) : path.join(os.homedir(), 'test/mh-assets/community')
const [catalogue, ...nids] = args
if (!catalogue || !nids.length) { console.error('usage: fetch-community.mjs <assets.json> <nid>… [--out dir]'); process.exit(1) }
const cat = JSON.parse(fs.readFileSync(catalogue, 'utf8'))
const byNid = new Map(Object.values(cat).map(e => [String(e.nid), e]))

for (const nid of nids) {
  const e = byNid.get(nid)
  if (!e) { console.warn(`${nid}: not in the catalogue`); continue }
  if (!/^CC0$|^CC-BY$/.test(e.license)) { console.warn(`${nid}: licence ${e.license}, skipped`); continue }
  const dir = path.join(OUT, nid)
  fs.mkdirSync(dir, { recursive: true })
  for (const [kind, url] of Object.entries(e.files || {})) {
    if (kind === 'thumb') continue
    const f = path.join(dir, path.basename(url))
    if (fs.existsSync(f)) continue
    const r = await fetch(url)
    if (!r.ok) { console.warn(`${nid}: ${kind} ${r.status}`); continue }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()))
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(e, null, 1))
  console.log(`${nid}: ${e.title} (${e.license}, ${e.username})`)
}
