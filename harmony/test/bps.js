// Scores harmony/harmony.js against the BPS-FH dataset (Chen & Su, ISMIR 2018):
// the first movements of Beethoven's 32 piano sonatas with human analyses
// (local key, Roman numeral, quality, inversion).
//
//   git clone https://github.com/Tsung-Ping/functional-harmony harmony/data/functional-harmony
//   node harmony/test/bps.js [--data <BPS_FH_Dataset folder>] [--split test|tune|all] [--verbose] [--tune]
//
// The dataset is GPL-3.0; keep it in the git-ignored harmony/data/.
// Scores are chord symbol recall (CSR): the share of time (here in 1/8-beat
// frames) where the label matches, as in ChordGNN / AugmentedNet. Augmented
// sixths have no root and are left out of root and quality (as Masada &
// Bunescu do). ChordGNN+Post on the BPS test pieces: key 82.0, root 82.5,
// quality 74.1, inversion 76.5, Roman numeral 49.1.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { analyze, inversionOf, DEFAULTS, QUALITIES } from '../harmony.js'

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const flag = k => args.includes('--' + k)
// --model augnet runs AugmentedNet (augnet/) on onnxruntime-web instead of harmony.js; needs ORT_WEB or onnxruntime-web installed
const MODEL = opt('model', 'harmony')
// --keys augnet: harmony.js chords with AugmentedNet's local keys
const KEYSRC = opt('keys', null)
let augnet = null
if (MODEL === 'augnet' || KEYSRC === 'augnet') {
	const ort = await import(process.env.ORT_WEB || 'onnxruntime-web')
	const A = await import('../../augnet/augnet.js')
	const V = JSON.parse(readFileSync(new URL('../../augnet/vocabulary.json', import.meta.url)))
	const session = await ort.InferenceSession.create(new Uint8Array(readFileSync(new URL('../../augnet/augmentednet.onnx', import.meta.url))), { executionProviders: ['wasm'] })
	augnet = { ort, A, V, session }
}
// spelled names from BPS's morphetic pitch (C4 = 60, D4 = 61 …), or --spell midi to name them from MIDI numbers only
const SPELL = opt('spell', 'score')
async function runAugnet(piece) {
	const { A, V, session, ort } = augnet
	let names
	if (SPELL === 'score' && piece.morph) names = piece.notes.map((n, i) => {
		const m = piece.morph[i], letter = 'CDEFGAB'[((m - 60) % 7 + 7) % 7], oct = 4 + Math.floor((m - 60) / 7)
		const nat = 12 * (oct + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter], acc = n.pitch - nat
		return letter + (acc > 0 ? '#'.repeat(acc) : '-'.repeat(-acc)) + oct
	})
	else if (SPELL === 'music21') names = A.spellMidi(piece.notes, { mode: 'music21' })
	else {
		// two passes: AugmentedNet's own keys from a music21-style spelling, then each note spelled in its key
		const first = await A.analyzeSpelled(V, session, ort.Tensor, piece.notes.map((n, i) => ({ on: n.on, dur: n.off - n.on, name: A.music21Name(n.pitch) })), piece.measures)
		const keys = A.keyRegions(V, first.dec, { t0: piece.measures[0].offset, T: first.enc.frames })
		const keyAt = t => keys.find(k => k.start <= t && t < k.end) || keys.at(-1)
		names = A.spellMidi(piece.notes, { keyAt })
	}
	const notes = piece.notes.map((n, i) => ({ on: n.on, dur: n.off - n.on, name: names[i] }))
	const r = await A.analyzeSpelled(V, session, ort.Tensor, notes, piece.measures)
	const t0 = piece.measures[0].offset
	const chords = A.toChords(r.dec, { t0, T: r.enc.frames })
	const keys = A.keyRegions(V, r.dec, { t0, T: r.enc.frames })
	return { chords, keys, ornaments: [], ms: r.ms.encode + r.ms.network + r.ms.decode }
}
// --set name=value,name=value overrides DEFAULTS (e.g. --set excuseSuspension=0)
const SET = Object.fromEntries((opt('set', '') || '').split(',').filter(Boolean).map(kv => { const [k, v] = kv.split('='); return [k, v === 'true' ? true : v === 'false' ? false : +v] }))
const DATA = opt('data', new URL('../data/functional-harmony/BPS_FH_Dataset', import.meta.url).pathname)
if (!process.argv.includes('--corpus') && !existsSync(DATA)) { console.error(`No dataset at ${DATA}\n  git clone https://github.com/Tsung-Ping/functional-harmony harmony/data/functional-harmony`); process.exit(1) }

// ── a minimal .xlsx reader (zip + sheet1 + shared strings) ──
function unzip(buf) {
	const files = {}
	let eocd = buf.length - 22
	while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
	let p = buf.readUInt32LE(eocd + 16)
	const n = buf.readUInt16LE(eocd + 10)
	for (let i = 0; i < n; i++) {
		const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20)
		const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42)
		const name = buf.toString('utf8', p + 46, p + 46 + nl)
		const lnl = buf.readUInt16LE(off + 26), lxl = buf.readUInt16LE(off + 28)
		const data = buf.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csize)
		files[name] = method === 8 ? inflateRawSync(data) : data
		p += 46 + nl + xl + cl
	}
	return files
}
function readXlsx(path) {
	const z = unzip(readFileSync(path))
	const ss = z['xl/sharedStrings.xml'] ? [...z['xl/sharedStrings.xml'].toString().matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, '').replace(/<[^>]+>/g, '')) : []
	const rows = []
	for (const r of z['xl/worksheets/sheet1.xml'].toString().matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
		const row = []
		for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>(?:<f>[^<]*<\/f>)?(?:<v>([^<]*)<\/v>)?<\/c>)/g)) {
			const col = /r="([A-Z]+)\d+"/.exec(c[1])[1].charCodeAt(0) - 65
			row[col] = /t="s"/.test(c[1]) ? ss[+c[2]] : c[2] == null ? null : +c[2]
		}
		rows.push(row)
	}
	return rows
}

// ── BPS-FH labels → pitch classes ──
const LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const MAJ = [0, 2, 4, 5, 7, 9, 11], HMIN = [0, 2, 3, 5, 7, 8, 11]
const keyOf = s => {
	s = String(s)
	const tonic = (LET[s[0].toUpperCase()] + [...s.slice(1)].reduce((a, c) => a + (c === '+' ? 1 : c === '-' ? -1 : 0), 0) + 12) % 12
	return { tonic, mode: s[0] === s[0].toUpperCase() ? 'major' : 'minor' }
}
function rootOf(key, degree, quality) {
	const k = keyOf(key), sc = k.mode === 'major' ? MAJ : HMIN
	const deg = String(degree)
	const one = (d, scale, tonic) => {
		const m = /^([+-]?)(\d)([+-]?)$/.exec(d)
		const n = +m[2]
		let pc = tonic + scale[n - 1]
		if (m[1] === '+') pc += 1
		if (m[1] === '-') pc -= 1
		return (pc + 12) % 12
	}
	if (quality === 'a6') return null
	if (!deg.includes('/')) return one(deg, sc, k.tonic)
	const [num, den] = deg.split('/')
	const t2 = one(den, sc, k.tonic)
	return one(num, MAJ, t2)
}
const QMAP = { M: 'M', m: 'm', d: 'd', a: 'a', M7: 'M7', m7: 'm7', D7: 'D7', d7: 'd7', h7: 'h7' }

function loadPiece(dir) {
	const rows = readFileSync(`${dir}/notes.csv`, 'utf8').trim().split(/\r?\n/).map(l => l.split(',').map(Number))
	const notes = rows.map(([on, pitch, , dur]) => ({ pitch, on, off: on + dur })), morph = rows.map(r => r[2])
	const beats = readXlsx(`${dir}/beats.xlsx`).map(r => r[0]).filter(x => x != null)
	const down = new Set(readXlsx(existsSync(`${dir}/dBeats.xlsx`) ? `${dir}/dBeats.xlsx` : `${dir}/dbeats.xlsx`).map(r => r[0]).filter(x => x != null))
	const chords = readXlsx(`${dir}/chords.xlsx`).filter(r => r[0] != null).map(([on, off, key, degree, quality, inversion, rn]) => {
		const k = keyOf(key), root = rootOf(key, degree, quality)
		return { on, off, key: k, root, quality: QMAP[quality] ?? null, a6: quality === 'a6', inversion: +inversion, rn: String(rn), degree: String(degree), raw: quality }
	})
	// beats: a beat list in crotchets; a downbeat is strong; extend backwards over a pickup
	const step = beats[1] - beats[0]
	const all = [...beats]
	while (all[0] > Math.min(...notes.map(n => n.on)) - 1e-9) all.unshift(all[0] - step)
	// measures from the downbeats (a pickup bar before the first)
	const db = [...down].sort((a, b) => a - b), bar = db.length > 1 ? db[1] - db[0] : 4
	const first = Math.min(...notes.map(n => n.on)), last = Math.max(...notes.map(n => n.off))
	const measures = []
	if (first < db[0] - 1e-6) measures.push({ offset: first, number: 0, quarters: db[0] - first, barQuarters: db[0] - first })
	db.forEach((t, i) => measures.push({ offset: t, number: i + 1, quarters: (db[i + 1] ?? Math.max(last, t + bar)) - t, barQuarters: bar }))
	return { id: dir.split('/').pop(), notes, morph, measures, beats: all.map(t => ({ time: t, strength: down.has(t) ? 1 : 0.4 })), chords }
}

// Roman numeral string of ours in BPS's style (degree + quality + inversion): compare by parts
function evaluate(piece, r) {
	const F = 8 // frames per crotchet
	const t0 = Math.min(...piece.chords.map(c => c.on)), t1 = Math.max(...piece.chords.map(c => c.off))
	const mine = r.chords
	let i = 0, j = 0
	const susSpans = (piece.susSpans || [])
	const tally = { susF: 0, susRoot: 0, susQ: 0, frames: 0, key: 0, root: 0, rootN: 0, quality: 0, qualityN: 0, inversion: 0, rn: 0, triad: 0 }
	for (let f = Math.ceil(t0 * F); f < t1 * F; f++) {
		const t = (f + 0.5) / F
		while (i + 1 < piece.chords.length && piece.chords[i].off <= t) i++
		while (j + 1 < mine.length && mine[j].end <= t) j++
		const g = piece.chords[i], m = mine[j]
		if (!(g.on <= t && t < g.off)) continue
		tally.frames++
		const mk = m?.key
		const keyOk = mk && mk.tonic === g.key.tonic && mk.mode === g.key.mode
		if (keyOk) tally.key++
		else if (mk) {
			const d = (mk.tonic - g.key.tonic + 12) % 12, kind = mk.mode === g.key.mode ? { 7: 'dominant', 5: 'subdominant' }[d] || 'other' : (mk.mode === 'major' && d === 3) || (mk.mode === 'minor' && d === 9) ? 'relative' : d === 0 ? 'parallel' : 'other'
			keyErrors[kind] = (keyErrors[kind] || 0) + 1
		}
		if (!m || m.root == null) { if (g.root != null) { tally.rootN++; tally.qualityN++ } continue }
		const myInv = m.inversion ?? (m.quality ? inversionOf(m.quality, m.root, m.bass) : 0)
		if (myInv === g.inversion) tally.inversion++
		if (g.root == null) continue
		tally.rootN++; tally.qualityN++
		const rootOk = m.root === g.root
		if (rootOk) tally.root++
		const qOk = m.quality === g.quality
		if (qOk) tally.quality++
		if (susSpans.some(([a, b]) => a <= t && t < b)) { tally.susF++; if (rootOk) tally.susRoot++; if (rootOk && qOk) tally.susQ++ }
		const tri = q => ({ M: 'M', D7: 'M', M7: 'M', m: 'm', m7: 'm', d: 'd', h7: 'd', d7: 'd', a: 'a' }[q])
		if (rootOk && tri(m.quality) === tri(g.quality)) tally.triad++
		// a Roman numeral is right when key, root, quality and inversion all are
		if (keyOk && rootOk && qOk && myInv === g.inversion) tally.rn++
	}
	return tally
}

const keyErrors = {}
// non-chord tones: is a note (or the ornamental part of it) outside the analyst's chord?
const orn = { susTrue: 0, susHit: 0, susMiss: [], cand: {}, candOut: {}, outBeats: 0, outFound: 0, notes: 0, outNotes: 0, examples: [] }
function trueSuspensions(piece) {
	const out = []
	const chordAt = t => piece.chords.find(c => c.on <= t && t < c.off)
	const tonesOf = g => g && g.root != null && g.quality ? QUALITIES[g.quality].tones.map(x => (x + g.root) % 12) : null
	for (const n of piece.notes) {
		for (const g of piece.chords) {
			if (g.on <= n.on + 1e-6 || g.on >= n.off - 1e-6) { if (!(Math.abs(g.on - n.on) < 1e-6)) continue }
			const tones = tonesOf(g), prev = chordAt(g.on - 1e-3), pt = tonesOf(prev)
			if (!tones || !pt || tones.includes(n.pitch % 12) || !pt.includes(n.pitch % 12)) continue
			const heldOver = n.on < g.on - 1e-6 || piece.notes.some(m => m.pitch === n.pitch && Math.abs(m.off - n.on) < 1e-6)
			if (!heldOver) continue
			const r = piece.notes.find(m => Math.abs(m.on - n.off) < 1e-6 && (n.pitch - m.pitch === 1 || n.pitch - m.pitch === 2) && tones.includes(m.pitch % 12))
			if (r && n.off <= g.off + 1e-6) out.push([Math.max(g.on, n.on), n.off])
		}
	}
	return out
}
function scoreOrnaments(piece, r) {
	for (const [a, b] of piece.susSpans) {
		orn.susTrue++
		const hit = r.ornaments.some(o => o.from <= a + 1e-6 && o.to >= b - 1e-6 && piece.notes[o.index].off >= b - 1e-6)
		if (hit) orn.susHit++
		else if (orn.susMiss.length < 300) { const n = piece.notes.find(n => Math.abs(n.off - b) < 1e-6 && n.on <= a + 1e-6); const o = n && r.ornaments.find(o => piece.notes[o.index] === n); orn.susMiss.push({ piece: piece.id, a, b, pitch: n?.pitch, marked: o?.type || null }) }
	}
	const byIdx = new Map(r.ornaments.map(o => [o.index, o]))
	const chordAt = t => piece.chords.find(c => c.on <= t && t < c.off)
	piece.notes.forEach((n, i) => {
		const o = byIdx.get(i)
		// sample the note at its ornamental part (or its start)
		const t = (o ? o.from : n.on) + 1e-3
		const g = chordAt(t)
		if (!g || g.root == null || !g.quality) return
		const tones = QUALITIES[g.quality].tones.map(x => (x + g.root) % 12)
		const out = !tones.includes(n.pitch % 12)
		const len = Math.min(n.off, o ? o.to : n.off) - t
		orn.notes++; if (out) orn.outNotes++
		if (o && !out && orn.examples.length < 400) orn.examples.push({ piece: piece.id, type: o.type, pitch: n.pitch, on: n.on, from: o.from, to: o.to, chord: g.rn + ' ' + g.raw })
		if (o) { orn.cand[o.type] = (orn.cand[o.type] || 0) + 1; if (out) orn.candOut[o.type] = (orn.candOut[o.type] || 0) + 1 }
		if (out && !o) { const g2 = chordAt(n.on + 1e-3); }
		if (out) { orn.outBeats += n.off - n.on; if (o) orn.outFound += n.off - n.on }
	})
}
// --corpus wir/<set> scores a When in Rome export instead (see wir_export.py)
const CORPUS = opt('corpus', null)
const WIRDIR = CORPUS && new URL('../data/' + CORPUS + '/', import.meta.url).pathname
function loadWir(id) {
	const j = JSON.parse(readFileSync(WIRDIR + id + '.json', 'utf8'))
	const notes = j.notes.map(([on, pitch, dur]) => ({ pitch, on, off: on + dur }))
	const beats = j.beats.map(([time, strength]) => ({ time, strength }))
	const chords = j.chords.map(([on, off, tonic, mode, root, quality, inversion, rn]) => ({ on, off, key: { tonic, mode }, root: quality === 'a6' ? null : root, quality: QMAP[quality] ?? null, a6: quality === 'a6', inversion, rn, raw: quality }))
	// bars from the downbeats, for AugmentedNet
	const db = beats.filter(b => b.strength === 1).map(b => b.time)
	const bar = db.length > 1 ? db[1] - db[0] : 4, first = Math.min(...notes.map(n => n.on)), last = Math.max(...notes.map(n => n.off))
	const measures = []
	if (db.length && first < db[0] - 1e-6) measures.push({ offset: first, number: 0, quarters: db[0] - first, barQuarters: db[0] - first })
	db.forEach((t, i) => measures.push({ offset: t, number: i + 1, quarters: (db[i + 1] ?? Math.max(last, t + bar)) - t, barQuarters: bar }))
	return { id, notes, beats, chords, measures }
}
// --unseen: leave out the chorales AugmentedNet's data/wir.py lists (it may have trained on them)
const AUGNET_SEEN = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20])
const pieces = CORPUS ? readdirSync(WIRDIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).filter(id => !(flag('unseen') && AUGNET_SEEN.has(+id))).sort() : readdirSync(DATA).filter(d => /^\d+$/.test(d)).map(Number).sort((a, b) => a - b)
// tune on the odd sonatas, report on the even ones (no training: the split only guards the hand tuning)
const split = opt('split', 'all')
// bpstest: the 7 movements AugmentedNet, ChordGNN and Micchi et al. hold out (1, 7, 10, 14, 15, 23, 25)
const BPSTEST = [1, 7, 10, 14, 15, 23, 25]
const chosen = CORPUS ? pieces : pieces.filter(n => split === 'all' || (split === 'bpstest' ? BPSTEST.includes(n) : split === 'tune' ? n % 2 === 1 : n % 2 === 0))

async function run(params, { verbose = false } = {}) {
	const sum = { susF: 0, susRoot: 0, susQ: 0, frames: 0, key: 0, root: 0, rootN: 0, quality: 0, qualityN: 0, inversion: 0, rn: 0, triad: 0 }
	let ms = 0
	for (const n of chosen) {
		const piece = CORPUS ? loadWir(n) : loadPiece(`${DATA}/${n}`)
		let r
		if (MODEL === 'augnet') r = await runAugnet(piece)
		else {
			const keys = KEYSRC === 'augnet' ? (await runAugnet(piece)).keys : undefined
			r = analyze(piece.notes, { beats: piece.beats, aligned: 1, keys, params: { ...SET, ...params } })
		}
		ms += r.ms
		piece.susSpans = trueSuspensions(piece)
		const t = evaluate(piece, r)
		scoreOrnaments(piece, r)
		for (const k in sum) sum[k] += t[k]
		if (verbose) console.log(String(n).padStart(2), `key ${(100 * t.key / t.frames).toFixed(1)} root ${(100 * t.root / t.rootN).toFixed(1)} quality ${(100 * t.quality / t.qualityN).toFixed(1)} inv ${(100 * t.inversion / t.frames).toFixed(1)} RN ${(100 * t.rn / t.rootN).toFixed(1)}  (${r.chords.length} chords vs ${piece.chords.length})`)
	}
	return { sus: [100 * sum.susRoot / sum.susF, 100 * sum.susQ / sum.susF, sum.susF], key: 100 * sum.key / sum.frames, root: 100 * sum.root / sum.rootN, triad: 100 * sum.triad / sum.rootN, quality: 100 * sum.quality / sum.qualityN, inversion: 100 * sum.inversion / sum.frames, rn: 100 * sum.rn / sum.rootN, ms }
}
const show = s => (s.sus[2] ? `[under suspensions: root ${s.sus[0].toFixed(1)}, root+quality ${s.sus[1].toFixed(1)}, ${s.sus[2]} frames]  ` : '') + `key ${s.key.toFixed(1)}  root ${s.root.toFixed(1)}  root+triad ${s.triad.toFixed(1)}  quality ${s.quality.toFixed(1)}  inversion ${s.inversion.toFixed(1)}  RN ${s.rn.toFixed(1)}  (${(s.ms / 1000).toFixed(1)} s)`

if (flag('tune')) {
	// coordinate ascent on the chord score (root + quality + RN), each weight ×/÷ 1.5
	const goal = s => s.root + s.quality + s.rn + 0.5 * s.key
	let best = { ...DEFAULTS }, bs = await run(best)
	console.log('start', show(bs))
	const keys = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'number' && k !== 'maxSlices')
	for (let round = 0; round < 2; round++) for (const k of keys) for (const f of [1.5, 1 / 1.5]) {
		const tryP = { ...best, [k]: best[k] * f }
		const s = await run(tryP)
		if (goal(s) > goal(bs) + 0.05) { best = tryP; bs = s; console.log(`${k} → ${+best[k].toFixed(3)}`, show(bs)) }
	}
	console.log(JSON.stringify(Object.fromEntries(keys.map(k => [k, +best[k].toFixed(3)]))))
} else {
	console.log((CORPUS ? `${CORPUS} (${chosen.length} pieces)` : `BPS-FH ${split} (${chosen.length} movements)`) + ` · ${MODEL}${KEYSRC ? ' with ' + KEYSRC + ' keys' : ''}${MODEL === 'augnet' || KEYSRC ? ' · spelling ' + SPELL : ''}`)
	const s = await run(undefined, { verbose: flag('verbose') })
	console.log(show(s))
	const tot = Object.values(keyErrors).reduce((a, b) => a + b, 0)
	console.log('non-chord tones found (share outside the analyst\'s chord): ' + Object.keys(orn.cand).map(k => `${k} ${orn.cand[k]} (${(100 * (orn.candOut[k] || 0) / orn.cand[k]).toFixed(0)} %)`).join(', ') + `; ${(100 * orn.outFound / orn.outBeats).toFixed(0)} % of the time in notes outside the chord is marked; ${(100 * orn.outNotes / orn.notes).toFixed(0)} % of all notes are outside it`)
	if (orn.susTrue) console.log(`suspensions in the analysis: ${orn.susTrue}, marked ${(100 * orn.susHit / orn.susTrue).toFixed(0)} %`)
	if (flag('misses')) for (const m of orn.susMiss.slice(0, 40)) console.log(JSON.stringify(m))
	if (flag('examples')) for (const e of orn.examples.filter(e => e.type === opt('examples'))) console.log(JSON.stringify(e))
	console.log('key errors:', Object.entries(keyErrors).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)} %`).join(', '))
}
