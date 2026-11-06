// A render in parts (Render → Parts): one long video as several files in a folder of
// your choosing, with its sound as one more, a record of the render (render.json) that
// says which parts are done, and a script that joins them without re-encoding. After a
// crash or a browser restart, Render → Resume reads the record and renders only the
// parts not done (the one that was being written is started again: an MP4's index is
// written last, so a part cut short can't be continued).
//
//   const parts = chooseParts(plan, { cuts, avoid, seconds })   [{ file, a, b }] (frames)
//   const job = newJob({ ... }); await writeJob(dir, job)       render.json, parts.txt, join.sh
//   const { dir, job } = await openJob()                         the last folder, or a folder picked
//
// Parts end on the director's cuts, where a picture that doesn't quite continue (the
// hair and the dress are simulated, and each part starts them a few seconds before its
// first frame) isn't seen, and not while an intertitle is on screen (an automatic one
// takes its side of the frame on its first frame).

export const JOB_FILE = 'render.json'
export const PART_SECONDS = { off: 'One file', 60: '1 minute', 120: '2 minutes', 300: '5 minutes', 600: '10 minutes' }

/**
 * The parts of a render: about `seconds` each, from one cut to another.
 * plan: exportPlan's ({ frames, fps, frameAt(t) }); cuts: song times of the director's cuts;
 * avoid: [[t0, t1]] song times a part may not end in (intertitles on screen).
 */
export function chooseParts(plan, { cuts = [], avoid = [], seconds = 120 } = {}) {
  const { frames, fps } = plan, L = Math.max(1, Math.round(seconds * fps))
  const inAvoid = f => avoid.some(([a, b]) => f >= plan.frameAt(a) - fps * 0.5 && f <= plan.frameAt(b) + fps * 0.5)
  const ends = [...new Set(cuts.map(t => plan.frameAt(t)))].filter(f => f > 0 && f < frames && !inAvoid(f)).sort((x, y) => x - y)
  const out = []
  let a = 0
  while (a < frames) {
    let b
    if (frames - a <= L * 1.4) b = frames
    else {
      // (what is left, under two parts: halved, so the last isn't a stub)
      const want = frames - a < 2 * L ? a + Math.round((frames - a) / 2) : a + L
      const near = ends.filter(f => f >= want - L * 0.4 && f <= want + L * 0.5)
      b = near.length ? near.reduce((x, y) => Math.abs(y - want) < Math.abs(x - want) ? y : x) : want
    }
    out.push({ file: `part-${String(out.length + 1).padStart(3, '0')}.mp4`, a, b, cut: b === frames || ends.includes(b) })
    a = b
  }
  return out
}

/** The record of a render: what it is, with which settings, and which files are done. */
export function newJob({ name, search, width, height, fps, frames, songZero, parts, audio }) {
  return {
    version: 1, name, search, width, height, fps, frames, songZero, created: new Date().toISOString(),
    audio: audio ? { file: name.replace(/\.mp4$/, '') + '.audio.m4a', done: false } : null,
    parts: parts.map(p => ({ ...p, done: false })),
  }
}

export async function writeText(dir, name, text) {
  const h = await dir.getFileHandle(name, { create: true }), w = await h.createWritable()
  await w.write(text); await w.close()
}

/** render.json, and the files that join the parts: parts.txt (ffmpeg's concat list) and join.sh. */
export async function writeJob(dir, job) {
  job.updated = new Date().toISOString()
  await writeText(dir, JOB_FILE, JSON.stringify(job, null, 1) + '\n')
  await writeText(dir, 'parts.txt', job.parts.map(p => `file '${p.file}'`).join('\n') + '\n')
  await writeText(dir, 'join.sh', joinScript(job))
}

export function joinScript(job) {
  const out = job.name.replace(/'/g, '')
  return `#!/bin/sh
# Joins the ${job.parts.length} parts of ${out}${job.audio ? ' and its sound' : ''} without re-encoding.
# Run it in this folder once every part is done (render.json says which are).
# Needs ffmpeg (https://ffmpeg.org).
set -e
cd "$(dirname "$0")"
ffmpeg -y -f concat -safe 0 -i parts.txt${job.audio ? ` -i '${job.audio.file}' -map 0:v -map 1:a` : ''} -c copy -movflags +faststart '${out}'
echo "wrote ${out}"
`
}

export const jobDone = job => job.parts.every(p => p.done) && (!job.audio || job.audio.done)
export const jobLeft = job => job.parts.filter(p => !p.done)

// ── the folder, kept across a restart (IndexedDB holds a folder handle) ──────
const DB = 'midiviz-render', STORE = 'handles', KEY = 'last'
function idb() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error)
  })
}
export async function rememberFolder(dir) {
  try { const db = await idb(); await new Promise((ok, fail) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(dir, KEY); t.oncomplete = ok; t.onerror = () => fail(t.error) }) } catch (e) { console.warn('[parts] folder not remembered', e) }
}
export async function lastFolder() {
  try { const db = await idb(); return await new Promise(ok => { const r = db.transaction(STORE).objectStore(STORE).get(KEY); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null) }) } catch { return null }
}
/** A folder to write to: the browser asks for leave to write in it (a click must start this). */
export async function pickFolder() {
  const dir = await showDirectoryPicker({ id: 'midiviz-render', mode: 'readwrite' })
  await rememberFolder(dir)
  return dir
}
async function writable(dir) {
  const o = { mode: 'readwrite' }
  return (await dir.queryPermission?.(o)) === 'granted' || (await dir.requestPermission?.(o)) === 'granted'
}
/** The record in a folder, or null. */
export async function readJob(dir) {
  try { return JSON.parse(await (await (await dir.getFileHandle(JOB_FILE)).getFile()).text()) } catch { return null }
}
/**
 * The render to resume: the last folder's, where it holds an unfinished one and the
 * browser lets the page write there again, else a folder picked. { dir, job } or null.
 */
export async function openJob({ pick = false } = {}) {
  let dir = pick ? null : await lastFolder()
  if (dir && !(await writable(dir))) dir = null
  let job = dir && await readJob(dir)
  if (!job || jobDone(job)) { dir = await pickFolder(); job = await readJob(dir) }
  return job ? { dir, job } : null
}

/** The settings of a render, from the address bar, without what doesn't change the picture. */
export function settingsOf(search) {
  const p = new URLSearchParams(search)
  for (const k of ['t', 'sw', 'shot', 'resume']) p.delete(k)
  p.sort()
  return p.toString()
}
