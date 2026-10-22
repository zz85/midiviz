// Imports MakeHuman community assets from the official asset packs into the
// folder layout build-character.mjs reads (<out>/<nid>/ with meta.json).
//
//   node pianist/build/import-packs.mjs <pack.zip>… --pick name,name… [--out mh-assets/community]
//   node pianist/build/import-packs.mjs <pack.zip>… --list
//
// The community repository's catalogue (assets.json, which fetch-community.mjs
// read) and its asset pages went offline when MakeHuman's community services
// shut down; the asset packs (https://static.makehumancommunity.org/assets/assetpacks.html)
// are still hosted. Each pack zip holds <type>/<asset name>/ (.mhclo, .obj,
// .mhmat, textures, .thumb) and packs/<pack>.json, whose entries name the
// author, licence, category and the asset's old page (…/node/<nid>), so the
// asset keeps the key (c<nid>) it had when fetched one by one.
// Only CC0 and CC-BY assets are imported.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null }
const OUT = path.resolve(opt('--out') || path.join(os.homedir(), 'test/mh-assets/community'))
const pickArg = opt('--pick')
const list = args.includes('--list'); if (list) args.splice(args.indexOf('--list'), 1)
const zips = args
if (!zips.length || (!pickArg && !list)) { console.error('usage: import-packs.mjs <pack.zip>… (--pick a,b… | --list) [--out dir]'); process.exit(1) }
const pick = new Set((pickArg || '').split(',').map(s => s.trim()).filter(Boolean))

// pack names are <author>_<asset>: "toigo_halter_dress_midi" → "Halter Dress Midi"
const titleOf = name => name.slice(name.indexOf('_') + 1).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/(\D)1$/, '$1').trim()

const unzipList = z => execFileSync('unzip', ['-Z1', z], { maxBuffer: 1 << 26 }).toString().split('\n').filter(Boolean)
const found = new Set()
for (const zip of zips) {
  const files = unzipList(zip)
  const jsonName = files.find(f => /^packs\/[^/]+\.json$/.test(f))
  if (!jsonName) { console.warn(`${zip}: no packs/*.json`); continue }
  const info = JSON.parse(execFileSync('unzip', ['-p', zip, jsonName], { maxBuffer: 1 << 26 }).toString())
  for (const [name, e] of Object.entries(info)) {
    const nid = +(e.source || '').match(/node\/(\d+)/)?.[1]
    if (list) { console.log(`${path.basename(zip)}\t${name}\t${nid || '-'}\t${e.license}\t${e.category}\t${e.author}`); continue }
    if (!pick.has(name)) continue
    found.add(name)
    if (!/^(CC0|CC-BY)$/.test(e.license)) { console.warn(`${name}: licence ${e.license}, skipped`); continue }
    if (!nid) { console.warn(`${name}: no node id in its source (${e.source}), skipped`); continue }
    const inZip = files.filter(f => f.split('/')[1] === name && !f.endsWith('/'))
    const dir = path.join(OUT, String(nid))
    fs.mkdirSync(dir, { recursive: true })
    for (const f of inZip) fs.writeFileSync(path.join(dir, path.basename(f)), execFileSync('unzip', ['-p', zip, f], { maxBuffer: 1 << 28 }))
    // meta.json in the catalogue's shape (what build-character.mjs reads)
    const meta = { username: e.author, category: e.category, license: e.license, title: e.title || titleOf(name), nid, type: e.type, name, pack: path.basename(zip), source: e.source, created: e.created, changed: e.changed, description: e.description }
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1))
    console.log(`${nid}: ${meta.title} (${e.license}, ${e.author}) ← ${name}`)
  }
}
for (const n of pick) if (!found.has(n)) console.warn(`${n}: not in these packs`)
