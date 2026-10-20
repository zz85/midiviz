// Fetch the recordings violinist/tools/build_performances.js aligns itself
// (RECORDINGS there) into the git-ignored strings/data/recordings, with
// sources.json: each file's page, licence, credit and description, read from
// Wikimedia Commons. Public domain, CC0 or CC BY only. Slow on purpose
// (Commons asks for few, spaced requests): about a minute.
//
//   node violinist/tools/fetch_recordings.js
import { writeFileSync, existsSync, mkdirSync, renameSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const OUT = here + '../../strings/data/recordings/'
const UA = { 'User-Agent': 'midiviz-performances/1.0 (score alignment research; one download per file)' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// id → Commons file (and, where Commons limits downloads, the same file elsewhere)
const FILES = {
  heifetz_bwv1004_mov5: ['File:Bach; Chaconne d-moll Heifetz.flac'],
  menuhin_bwv1006_mov1: ['File:Bach - Partita for Violin No. 3 in E major, BWV 1006 - Prelude (Menuhin).flac'],
  goodenough_bwv1001_mov1: ['File:J. S. Bach – Violin Sonata No.1 in G minor, BWV 1001, I. Adagio.ogg'],
  qmul_allemanda: ['File:Bach Partita 2 - Allemanda - 18-04-2013.ogg'],
  vicond_bwv1001_mov1: ['File:Sonata in in G m J.S.Bach (1 mov prelude).ogg'],
  vicond_bwv1004_mov1: ['File:Partita No.2 J.S.Bach (Allemanda).ogg'],
  vicond_bwv1004_mov2: ['File:Partita No.2 J.S.Bach (corrente).ogg'],
  vicond_bwv1004_mov4: ['File:Partita 2 (Gigue) J.S.Bach.ogg'],
  vicond_bwv1006_mov4: ['File:Partita No.3 J.S.Bach (Minuet 1).ogg'],
  'kreisler-zimbalist_bwv1043_mov1': ['File:Concerto for two violins Part 1 (1915 recording).mp3', 'https://archive.org/download/loc-jukebox-11983-concerto-for-two-violins/jukebox-11983_concerto-for-two-violins.mp3'],
  commons_beethoven_op61_mov3: ['File:Beethoven, Ludwig van — Violin Concerto in D major, Op. 61, 3rd movement.ogg'],
}
const OK = /^(public domain|cc0|cc by( \d\.\d)?|pd)/i

mkdirSync(OUT, { recursive: true })
const sources = existsSync(OUT + 'sources.json') ? JSON.parse(readFileSync(OUT + 'sources.json', 'utf8')) : {}
const strip = v => String(v ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const titles = Object.values(FILES).map(f => f[0])
const meta = {}
for (let i = 0; i < titles.length; i += 10) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&format=json&titles=' + encodeURIComponent(titles.slice(i, i + 10).join('|'))
  const d = await (await fetch(u, { headers: UA })).json()
  for (const p of Object.values(d.query.pages)) {
    const ii = p.imageinfo[0], m = ii.extmetadata || {}, g = k => strip(m[k]?.value)
    meta[p.title] = { url: ii.url.split('?')[0], page: ii.descriptionurl, licence: g('LicenseShortName'), artist: g('Artist'), desc: g('ImageDescription').slice(0, 400), credit: g('Credit').slice(0, 200), date: g('DateTimeOriginal').slice(0, 60) }
  }
  await sleep(5000)
}
for (const [id, [title, mirror]] of Object.entries(FILES)) {
  const m = meta[title]
  if (!m || !OK.test(m.licence)) { console.warn(id, ': licence', m?.licence, '– skipped'); continue }
  const file = `${id}.${m.url.split('.').pop()}`
  sources[id] = { ...m, title, file }
  if (existsSync(OUT + file)) { console.log(id, 'have it'); continue }
  for (const url of [m.url, mirror].filter(Boolean)) {
    try {
      const r = await fetch(url, { headers: UA })
      if (!r.ok) throw new Error(r.status)
      writeFileSync(OUT + file + '.part', Buffer.from(await r.arrayBuffer())); renameSync(OUT + file + '.part', OUT + file)
      console.log(id, 'from', new URL(url).host); break
    } catch (e) { console.warn(id, url, e.message); await sleep(30000) }
  }
  await sleep(8000)
}
writeFileSync(OUT + 'sources.json', JSON.stringify(sources, null, 1) + '\n')
