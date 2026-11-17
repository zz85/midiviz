// Read a work's score pages with ScoreShift and score every note head against our transcription.
//   node scoreshift_eval.mjs <work> <movement> [pages e.g. 9-12] [--json out.json]
// SCORESHIFT is ScoreShift's directory (default ../../../../random-sketches/vibes/scoreshift).
// The truth is build.py's: each bar's printed heads (the OMR's reading with fixes-<mv>.txt), on
// the page and in the system Audiveris put the bar in (omr.json). ScoreShift reads the scan as
// fetched (cache/<work>/scan); its staves of a system are matched to the score's rows from the
// bottom (piano lower, piano upper, violin), and each row's heads to the truth's, in order, by
// omr-eval's edit distance on pitch, so a missed, extra or misread head counts once.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const here = path.dirname(new URL(import.meta.url).pathname)
const SS = path.resolve(process.env.SCORESHIFT || path.join(here, '../../../../random-sketches/vibes/scoreshift'))
const { decodeGray } = await import(path.join(SS, 'png.js'))
const { normalize, analyzeAfter } = await import(path.join(SS, 'omr.js'))
const { midiOf } = await import(path.join(SS, 'theory.js'))
const { align, wrongKind } = await import(path.join(here, '../../../omr-eval/eval.mjs'))

const ROWS = ['VN', 'RH', 'LH']
const cacheDir = w => path.join(process.env.TRANSCRIBE_CACHE || path.join(here, 'cache'), w)

function grayOf(file) {
  // ScoreShift decodes PNG; a JPEG scan goes through Pillow once, into the cache
  if (file.endsWith('.png')) return decodeGray(fs.readFileSync(file))
  const png = file.replace(/\.[^.]+$/, '.gray.png')
  if (!fs.existsSync(png)) execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(file)}).convert('L').save(${JSON.stringify(png)})`])
  return decodeGray(fs.readFileSync(png))
}

/** The truth by page and system: [{ page, systems: [{ bars: [bar numbers], rows: [[midi...] x 3] }] }] */
export function truth(work, mv) {
  const t = JSON.parse(execFileSync('python3', [path.join(here, 'build.py'), '--heads', work, String(mv)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  const omr = JSON.parse(fs.readFileSync(path.join(here, 'works', work, 'omr.json'), 'utf8'))
  const pages = new Map()
  t.pages.forEach(([pg, k], j) => {
    const m = omr[pg].measures, key = JSON.stringify(m[k].staves)
    if (!pages.has(pg)) pages.set(pg, [])
    const sy = pages.get(pg); let s = sy[sy.length - 1]
    if (!s || s.key !== key) sy.push(s = { key, bars: [], rows: [[], [], []] })
    s.bars.push(j + 1)
    // heads of a bar in reading order: by onset, low to high (build.py sorts them so)
    for (let r = 0; r < 3; r++) s.rows[r].push(...t.heads[j][r].map(([o, p]) => p))
  })
  return [...pages].map(([page, systems]) => ({ page, systems: systems.map(({ bars, rows }) => ({ bars, rows })) }))
}

/** One pass of ScoreShift at one staff size: its staves, in page pixels. */
function pass(gray, fifths, space) {
  const norm = normalize(gray, space ? { space } : {}), model = analyzeAfter(norm, fifths)
  const [a, b, c, d, e, f] = norm.A, Y = (u, v) => d * u + e * v + f, X = (u, v) => a * u + b * v + c
  const staves = model.staves.map(st => {
    const xm = (st.x0 + st.x1) / 2, top = Y(xm, st.pts[0].ys[0]), bot = Y(xm, st.pts[0].ys[4])
    // heads left to right, a chord low to high (columns within 0.9 space)
    const byX = st.notes.filter(n => !n.grace).sort((p, q) => p.x - q.x), ns = []
    for (let i = 0; i < byX.length;) { let j = i + 1; while (j < byX.length && byX[j].x - byX[i].x < 0.9 * model.space) j++; ns.push(...byX.slice(i, j).sort((p, q) => midiOf(p.pitch) - midiOf(q.pitch))); i = j }
    return { system: st.system, clef: st.clef.type, fifths: st.key.fifths, top, bot, mid: (top + bot) / 2, x0: X(st.x0, st.pts[0].ys[2]), x1: X(st.x1, st.pts[0].ys[2]),
      heads: ns.map(n => ({ midi: midiOf(n.pitch), x: X(n.x, n.y), y: Y(n.x, n.y) })) }
  })
  return { norm, staves, endFifths: model.staves.length ? model.staves[model.staves.length - 1].key.fifths : fifths }
}

/**
 * A page read at the page's commonest staff size and, where it has staves of a second, smaller
 * size (the violin's in a score), at that size too. Each small staff joins the system of the
 * staves below it; each head goes to the staff whose middle is nearest it, so the notes of a
 * violin staff the large pass took for the piano's upper staff's stay the violin's.
 */
function readPage(file, fifths) {
  const t0 = performance.now(), gray = grayOf(file)
  const big = pass(gray, fifths.big)
  let small = { staves: [], endFifths: fifths.small }
  if (big.norm.small) try { small = pass(gray, fifths.small, big.norm.small) } catch (e) { console.error(file, "small staves:", e.message) }
  for (const st of big.staves) st.size = 'big'
  for (const st of small.staves) st.size = 'small'
  const all = [...big.staves, ...small.staves]
  for (const st of all) st.keep = st.heads.filter(h => {
    const near = all.filter(o => h.x >= o.x0 - 20 && h.x <= o.x1 + 20).sort((p, q) => Math.abs(h.y - p.mid) / (p.bot - p.top) - Math.abs(h.y - q.mid) / (q.bot - q.top))[0]
    return near === st || !near
  })
  for (const st of all) st.heads = st.keep.map(h => h.midi)
  const sys = new Map()
  for (const st of big.staves) { if (!sys.has(st.system)) sys.set(st.system, []); sys.get(st.system).push(st) }
  const systems = [...sys.values()].sort((p, q) => p[0].top - q[0].top)
  for (const st of small.staves) {
    const below = systems.find(g => g[0].top > st.bot)
    if (below) below.unshift(st)
  }
  return { ms: performance.now() - t0, systems, endFifths: { big: big.endFifths, small: small.endFifths } }
}

export { readPage }

export function evaluate(work, mv, sel) {
  const T = truth(work, mv), res = { pages: [], rows: ROWS.map(r => ({ row: r, notes: 0, right: 0, wrong: 0, missed: 0, extra: 0, stavesFound: 0, staves: 0, kinds: {}, fsharp: 0 })) }
  let fifths = { big: null, small: null }
  for (const { page, systems } of T) {
    const n = +page.slice(1); if (sel && (n < sel[0] || n > sel[1])) continue
    const scan = fs.readdirSync(path.join(cacheDir(work), 'scan')).find(f => f.startsWith(page + '.') && !f.includes('.gray.'))
    const read = readPage(path.join(cacheDir(work), 'scan', scan), fifths); fifths = read.endFifths
    const pr = { page, ms: Math.round(read.ms), systems: systems.length, systemsRead: read.systems.length, rows: ROWS.map(() => ({ notes: 0, right: 0 })), keys: [], clefs: [] }
    // systems in order; a page whose system count differs is matched from the top
    systems.forEach((s, i) => {
      const got = read.systems[i] || []
      // rows from the bottom: the piano's lower staff is the last
      for (let r = 0; r < 3; r++) {
        const st = got[got.length - 3 + r], tr = s.rows[r], R = res.rows[r]
        R.staves++; R.notes += tr.length; pr.rows[r].notes += tr.length
        if (!st) { R.missed += tr.length; continue }
        R.stavesFound++; pr.keys.push(st.fifths); pr.clefs.push(st.clef)
        for (const [a, b] of align(tr.map(m => ({ midi: m })), st.heads)) {
          if (a < 0) R.extra++
          else if (b < 0) R.missed++
          else if (tr[a] === st.heads[b]) { R.right++; pr.rows[r].right++ } else { R.wrong++; const k = wrongKind(st.heads[b] - tr[a]); R.kinds[k] = (R.kinds[k] || 0) + 1; if (tr[a] % 12 === 6 && st.heads[b] % 12 === 5) R.fsharp++ }
        }
      }
    })
    res.pages.push(pr)
    console.log(page, `${pr.ms} ms`, `systems ${pr.systemsRead}/${pr.systems}`, ROWS.map((r, i) => `${r} ${pr.rows[i].right}/${pr.rows[i].notes}`).join('  '), 'keys', pr.keys.join(''), 'clefs', [...new Set(pr.clefs)].join(','))
  }
  for (const R of res.rows) console.log(R.row, `staves ${R.stavesFound}/${R.staves}`, `right ${R.right}/${R.notes} (${(100 * R.right / R.notes).toFixed(1)}%)`, `wrong ${R.wrong} missed ${R.missed} extra ${R.extra}`, JSON.stringify(R.kinds), `F for F# ${R.fsharp}`)
  const tot = res.rows.reduce((a, R) => [a[0] + R.right, a[1] + R.notes], [0, 0]); res.total = { right: tot[0], notes: tot[1] }
  console.log(`all: ${tot[0]}/${tot[1]} (${(100 * tot[0] / tot[1]).toFixed(1)}%) heads at the right pitch`)
  return res
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const a = process.argv.slice(2), j = a.indexOf('--json'), out = j >= 0 ? a.splice(j, 2)[1] : null
  const sel = a[2] ? a[2].split('-').map(Number) : null
  const r = evaluate(a[0], +a[1], sel && (sel.length === 1 ? [sel[0], sel[0]] : sel))
  if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1))
}
