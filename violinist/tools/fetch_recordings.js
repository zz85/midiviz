// Fetch the recordings violinist/tools/build_performances.js aligns itself
// (RECORDINGS there) into the git-ignored strings/data/recordings, with
// sources.json: each file's page, licence, credit and description, read from
// Wikimedia Commons. Public domain, CC0 or CC BY only. Slow on purpose
// (Commons asks for few, spaced requests): about a minute.
//
//   node violinist/tools/fetch_recordings.js
//
// An entry is a Commons file ([title, mirror URL]), the sides of a 78 set on
// Commons ({ parts: [title, …] }, joined into one FLAC with ffmpeg, which the
// aligner reads as one performance: the breaks between sides are skipped like
// silence) or a file of an Internet Archive item ({ ia: identifier, name },
// licence from the item's licenseurl).
import { writeFileSync, existsSync, mkdirSync, renameSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
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
  // beyond Bach
  qmul_paganini_caprice24: { ia: 'Paganini_Caprice24', name: 'C414_L05.ogg' },
  kulenkampff_beethoven_romance2: { parts: [
    'File:PDP-CH - Georg Kulenkampff, violin with the Berlin Philharmonic, Paul Kletzki - Romance for Violin and Orchestra No. 2 in F major, Op. 50, Part 1 - Beethoven - Telefunken-f1142-018453.flac',
    'File:PDP-CH - Georg Kulenkampff, violin with the Berlin Philharmonic, Paul Kletzki - Romance for Violin and Orchestra No. 2 in F major, Op. 50, Part 2 - Beethoven - Telefunken-f1142-018454.flac'] },
  airforce_vivaldi_winter1: ['File:Vivaldi - Four Seasons 4 Winter Air Force Strings - United States Air Force Band.mp3'],
  milman_vivaldi_winter1: ['File:Vivaldi - Four Seasons 4 Winter mvt 1 Allegro non molto - Philip Milman - Lud and Schlatts Musical Emporium.wav'],
}
const OK = /^(public domain|cc0|cc by( \d\.\d)?|pd)/i

mkdirSync(OUT, { recursive: true })
const sources = existsSync(OUT + 'sources.json') ? JSON.parse(readFileSync(OUT + 'sources.json', 'utf8')) : {}
const strip = v => String(v ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const titles = Object.values(FILES).flatMap(f => Array.isArray(f) ? [f[0]] : f.parts || [])
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
const get = async (url, to) => {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(r.status)
  writeFileSync(to + '.part', Buffer.from(await r.arrayBuffer())); renameSync(to + '.part', to)
}
for (const [id, F] of Object.entries(FILES)) {
  if (Array.isArray(F)) continue
  if (F.ia) {
    // an Internet Archive item: its licence and credit from the item's metadata
    const d = await (await fetch(`https://archive.org/metadata/${F.ia}`, { headers: UA })).json(), md = d.metadata
    const lic = /publicdomain\/mark/.test(md.licenseurl || '') ? 'Public domain' : /publicdomain\/zero/.test(md.licenseurl || '') ? 'CC0' : /licenses\/by\/(\d\.\d)/.test(md.licenseurl || '') ? 'CC BY ' + md.licenseurl.match(/by\/(\d\.\d)/)[1] : md.licenseurl || 'unknown'
    if (!OK.test(lic)) { console.warn(id, ': licence', lic, '– skipped'); continue }
    const file = `${id}.${F.name.split('.').pop()}`
    sources[id] = { url: `https://archive.org/download/${F.ia}/${encodeURIComponent(F.name)}`, page: `https://archive.org/details/${F.ia}`, licence: lic, artist: strip(md.creator), desc: strip(md.description).slice(0, 400), credit: `https://archive.org/details/${F.ia}`, date: strip(md.date), title: `${md.title}: ${F.name}`, file }
    if (existsSync(OUT + file)) { console.log(id, 'have it'); continue }
    try { await get(sources[id].url, OUT + file); console.log(id, 'from archive.org') } catch (e) { console.warn(id, e.message) }
    await sleep(3000)
  } else {
    // sides of a set: every side must pass; joined in order
    const ms = F.parts.map(t => meta[t])
    if (ms.some(m => !m || !OK.test(m.licence))) { console.warn(id, ': licence', ms.map(m => m?.licence), '– skipped'); continue }
    const file = `${id}.flac`
    sources[id] = { ...ms[0], title: F.parts.join(' + '), parts: ms.map(m => m.page), file }
    if (existsSync(OUT + file)) { console.log(id, 'have it'); continue }
    const tmp = ms.map((m, i) => OUT + `${id}.part${i}.${m.url.split('.').pop()}`)
    try {
      for (let i = 0; i < ms.length; i++) { if (!existsSync(tmp[i])) { await get(ms[i].url, tmp[i]); await sleep(8000) } }
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...tmp.flatMap(t => ['-i', t]), '-filter_complex', tmp.map((_, i) => `[${i}:a]`).join('') + `concat=n=${tmp.length}:v=0:a=1`, '-ar', '48000', '-sample_fmt', 's16', OUT + file])
      for (const t of tmp) rmSync(t)
      console.log(id, `${ms.length} sides from`, new URL(ms[0].url).host)
    } catch (e) { console.warn(id, e.message) }
  }
}
for (const [id, F] of Object.entries(FILES)) {
  if (!Array.isArray(F)) continue
  const [title, mirror] = F
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
