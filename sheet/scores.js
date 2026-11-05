// The scores sheet/ knows, by the MIDI file each one follows.
// A manifest (sheet/scores/<name>.json) holds: title, midi (the performance it
// follows, from the repo's root), meter, bars (printed), played (bars the MIDI
// plays), form (the printed bars in the order played, as runs, where the MIDI
// plays the repeats), performances (a work of many movements: each file's own order of
// its bars, by the file), and the sources: scan { image, edition, source, license,
// header, firstHeader, detected } and engraved { score, source }.

export const SCORES = {
  'midis/bach_goldberg_aria.mid': 'sheet/scores/bach_goldberg_aria.json',
  'midis/bach_goldberg.mid': 'sheet/scores/bach_goldberg.json',
  'midis/bach_goldberg_repeats.mid': 'sheet/scores/bach_goldberg.json',
}

const songPath = file => String(file || '').replace(/^\.?\//, '').replace(/^.*?(midis\/)/, '$1')
/** The order a file plays a manifest's bars in, where the manifest keeps one for it (its `performances`). */
export const performanceFor = (m, file) => m?.performances?.[songPath(file)] ?? null

const ROOT = new URL('../', import.meta.url).href
const cache = new Map()
export async function manifestFor(file) {
  const f = songPath(file)
  const path = SCORES[f]
  if (!path) return null
  if (!cache.has(path)) cache.set(path, fetch(ROOT + path).then(r => r.json()).then(m => ({ ...m, base: ROOT })))
  return cache.get(path)
}
