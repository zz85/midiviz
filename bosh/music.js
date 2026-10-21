// Which notes Bosh lands on: onsets of a MIDI file weighed by metre, melody, loudness and length,
// then the best set at least `minGap` apart for a target number of landings a second. Also where
// the music suits a loop (a bar played again, a fast run over a wide range) and which note before
// a long gap he should take off on.
import { FPS } from './physics.js'

const CHORD_WINDOW = 0.035 // s: onsets this close are one event

/** Onset events of a parsed @tonejs/midi file: time, notes, top / bass pitch, loudness, metre strength. */
export function onsetsOf(midi, { beats = null } = {}) {
	const notes = []
	midi.tracks.forEach((t, ti) => {
		if (t.channel === 9 || t.instrument?.percussion) return
		for (const n of t.notes) notes.push({ pitch: n.midi, time: n.time, duration: Math.max(0.02, n.duration), velocity: n.velocity, track: ti, channel: t.channel })
	})
	notes.sort((a, b) => a.time - b.time || b.pitch - a.pitch)
	return onsetsOfNotes(notes, { beats })
}

/** As onsetsOf, from plain notes [{pitch, time, duration, velocity}]; beats [{time, strength}] optional. */
export function onsetsOfNotes(notes, { beats = null } = {}) {
	notes = [...notes].sort((a, b) => a.time - b.time || b.pitch - a.pitch)
	const groups = []
	for (const n of notes) {
		const g = groups.at(-1)
		if (g && n.time - g.time <= CHORD_WINDOW) g.notes.push(n)
		else groups.push({ time: n.time, notes: [n] })
	}
	const beatTimes = beats?.map(b => b.time) ?? []
	const beatSec = beats?.length > 1 ? (beats.at(-1).time - beats[0].time) / (beats.length - 1) : 0.5
	let sounding = [] // notes still held, for the top voice
	for (let i = 0; i < groups.length; i++) {
		const g = groups[i]
		sounding = sounding.filter(n => n.time + n.duration > g.time + 0.02)
		const pitches = g.notes.map(n => n.pitch)
		g.top = Math.max(...pitches)
		g.bass = Math.min(...pitches)
		g.size = g.notes.length
		g.velocity = Math.max(...g.notes.map(n => n.velocity))
		g.melodic = sounding.every(n => n.pitch < g.top) // a new note on top
		g.ioi = (groups[i + 1]?.time ?? g.time + 1) - g.time
		g.length = Math.max(...g.notes.map(n => n.duration))
		g.metre = beats ? metreStrength(g.time, beats, beatTimes, beatSec) : 0.3
		sounding.push(...g.notes)
	}
	markStructure(groups, beats)
	return groups
}

const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }

/**
 * Loop hints on the events: the first note of a bar that repeats the bar before (or the one before
 * that, ABAB), exactly or as a sequence, and the first note of a fast run sweeping 10+ semitones.
 * Also `sameAs`: the earlier bar this one is like, for the same choreography when it comes back.
 */
export function markStructure(groups, beats) {
	const downs = beats ? beats.filter(b => b.strength === 1).map(b => b.time) : []
	if (downs.length >= 2) {
		const bars = downs.map((t, k) => ({ start: t, end: downs[k + 1] ?? t + (t - downs[k - 1]), groups: [] }))
		let k = 0
		for (const g of groups) {
			while (k + 1 < bars.length && g.time >= bars[k + 1].start - 0.02) k++
			if (g.time < bars[k].start - 0.02) continue
			bars[k].groups.push(g)
			g.bar = k
			g.slot = Math.round((g.time - bars[k].start) / (bars[k].end - bars[k].start) * 48)
		}
		const sig = (bar, shape) => {
			const low = Math.min(...bar.groups.flatMap(g => g.notes.map(n => n.pitch)))
			return new Set(bar.groups.flatMap(g => g.notes.map(n => `${g.slot}:${shape ? n.pitch - low : n.pitch}`)))
		}
		for (const bar of bars) if (bar.groups.length >= 2) { bar.exact = sig(bar, false); bar.shape = sig(bar, true) }
		for (let b = 1; b < bars.length; b++) {
			const bar = bars[b]
			if (!bar.exact) continue
			for (const a of [b - 1, b - 2]) {
				const prev = bars[a]
				if (!prev?.exact) continue
				if (Math.max(jaccard(bar.exact, prev.exact), 0.95 * jaccard(bar.shape, prev.shape)) >= 0.7) { bar.repeats = a; break }
			}
			for (let a = 0; a < b - 1; a++) if (bars[a].exact && jaccard(bar.exact, bars[a].exact) >= 0.8) { bar.sameAs = a; break }
		}
		for (let b = 0; b < bars.length; b++) {
			if (bars[b].repeats == null) continue
			for (const idx of [bars[b].repeats, b]) { const first = bars[idx].groups[0]; if (first && first.slot <= 2) first.loopHint = 'repeat' }
		}
		for (const g of groups) if (g.bar != null && bars[g.bar].sameAs != null) g.sameAs = { bar: bars[g.bar].sameAs, slot: g.slot }
	}
	for (let i = 0; i < groups.length;) {
		let j = i
		while (j + 1 < groups.length && groups[j + 1].time - groups[j].time <= 0.2) j++
		if (j - i >= 5 && groups[j].time - groups[i].time >= 0.6) {
			const tops = groups.slice(i, j + 1).map(g => g.top)
			if (Math.max(...tops) - Math.min(...tops) >= 10) groups[i].loopHint ??= 'run'
		}
		i = j + 1
	}
	return groups
}

function metreStrength(t, beats, times, beatSec) {
	let lo = 0, hi = times.length - 1
	while (lo < hi) { const m = (lo + hi + 1) >> 1; if (times[m] <= t + 1e-6) lo = m; else hi = m - 1 }
	const tol = Math.min(0.04, beatSec * 0.12)
	for (const k of [lo, lo + 1]) if (beats[k] && Math.abs(times[k] - t) <= tol) return beats[k].strength
	const into = (t - times[lo]) / beatSec
	const frac = into - Math.floor(into)
	if (Math.abs(frac - 0.5) <= tol / beatSec) return 0.2
	return 0.08
}

/** How much a landing on this event would be felt, about 0–1.6 (more for long notes when excited). */
export function salience(g, excitement = 0) {
	return g.metre * 0.7
		+ (g.melodic ? 0.25 : 0)
		+ g.velocity * 0.3
		+ Math.log2(1 + g.size) * 0.08
		+ Math.min(1, g.ioi / 0.6) * 0.25
		+ Math.min(1, g.length / 1.2) * 0.1
		+ Math.min(1, g.ioi / 1.0) * 0.3 * excitement
}

/**
 * The landings: a subset of the onset events at least `minGap` s apart (on the 40 fps grid), chosen
 * by dynamic programming for the most salience at `rate` landings a second, with long silences
 * between landings discouraged. `lead` s of run-up come before the music.
 *
 * With `loops`, an event with a loop hint is worth more if nothing is landed on for `loopGap` s
 * after it (the time to go round); those become `move: 'loop'`. With `takeoffs`, a landing at least
 * `jumpGap` s after the one before gets a `takeoff`: the note to leave the ramp on, so the flight
 * starts on a note too. `excitement` (0–1) favours long notes, longer gaps and loops.
 */
export function pickHits(groups, { rate = 2.5, minGap = 0.2, maxGap = 1.6, lead = 1.75, excitement = 0, loops = false, loopGap = 1.7, takeoffs = false, jumpGap = 0.7, landings = true, detail = null, jump = 1 } = {}) {
	// loops: false | true / 'music' (where it repeats or runs) | 'force' (all of those, with more room for each)
	const force = loops === 'force'
	if (force) loopGap = Math.max(loopGap, 2.2)
	if (!groups.length) return []
	const leadIn = Math.max(0, lead - groups[0].time)
	const loopBonus = force ? 3 : 0.35 + 0.5 * excitement
	// (big jumps need time in the air: a 270 px one about 2.8 s, so they leave some long gaps)
	const ev = groups.map(g => ({ g, frame: Math.round((g.time + leadIn) * FPS), sal: salience(g, excitement) + Math.min(1, g.ioi / 1.5) * 0.3 * (jump - 1), loop: loops && g.loopHint ? loopBonus : 0 }))
	maxGap += 0.8 * excitement + 0.8 * (jump - 1)
	const loopF = Math.round(loopGap * FPS)
	const minF = Math.max(1, Math.round(minGap * FPS)), maxF = maxGap * FPS
	const span = (ev.at(-1).frame - ev[0].frame) / FPS + 1
	const silence = gap => gap > maxF ? (gap - maxF) / FPS * 0.6 : 0
	const solve = cost => {
		const n = ev.length, best = new Float64Array(n), from = new Int32Array(n).fill(-1)
		for (let i = 0; i < n; i++) {
			let b = -silence(ev[i].frame - ev[0].frame + maxF), bj = -1 // or start here, after the notes before
			for (let j = i - 1; j >= 0; j--) {
				const gap = ev[i].frame - ev[j].frame
				if (gap < minF) continue
				if (gap > maxF * 4 && bj >= 0) break
				const v = best[j] - silence(gap) - (ev[j].loop && gap < loopF ? ev[j].loop : 0)
				if (v > b) { b = v; bj = j }
			}
			best[i] = ev[i].sal + ev[i].loop - cost + b
			from[i] = bj
		}
		let end = n - 1, endV = -Infinity
		for (let i = 0; i < n; i++) { const v = best[i] - silence(ev[n - 1].frame - ev[i].frame + maxF); if (v > endV) { endV = v; end = i } }
		const chosen = []
		for (let i = end; i >= 0; i = from[i]) chosen.push(i)
		return chosen.reverse()
	}
	// the cost per landing that gives the requested rate
	let lo = -2, hi = 2, chosen = solve(0)
	for (let k = 0; k < 18; k++) {
		const mid = (lo + hi) / 2
		const c = solve(mid)
		if (c.length / span > rate) lo = mid; else hi = mid
		chosen = c
	}
	chosen = solve(hi)
	const sal = chosen.map(i => ev[i].sal), top = Math.max(...sal), bottom = Math.min(...sal)
	const hits = chosen.map(i => {
		const { g, frame } = ev[i]
		return {
			frame, time: g.time, leadIn, pitch: g.top, bass: g.bass, velocity: g.velocity, size: g.size,
			strength: top > bottom ? (ev[i].sal - bottom) / (top - bottom) : 0.5,
			notes: g.notes.map(n => n.pitch), event: i,
			...(g.loopHint ? { hint: g.loopHint } : {}), ...(g.sameAs ? { sameAs: g.sameAs } : {}), ...(g.bar != null ? { bar: g.bar, slot: g.slot } : {}),
		}
	})
	for (let k = 0; k < hits.length; k++) {
		if (ev[hits[k].event].loop && (k === hits.length - 1 || hits[k + 1].frame - hits[k].frame >= loopF)) hits[k].move = 'loop'
	}
	// take-offs: the note before a long gap that the flight should start on (about 60 % of the gap in the air)
	if (takeoffs) {
		const jumpF = Math.round(jumpGap * FPS)
		for (let k = 1; k < hits.length; k++) {
			const a = hits[k - 1], b = hits[k], gap = b.frame - a.frame
			if (gap < jumpF) continue
			const from = a.frame + (a.move === 'loop' ? Math.round(loopF * 0.85) : 10), to = b.frame - 12
			let best = null, bestScore = -Infinity
			for (let e = a.event + 1; e < b.event; e++) {
				const f = ev[e].frame
				if (f < from || f > to) continue
				const air = (b.frame - f) / gap
				const score = ev[e].sal * 0.6 + 1 - Math.abs(air - 0.6) * 2.5
				if (score > bestScore) { bestScore = score; best = ev[e] }
			}
			if (best) Object.assign(b, { takeoff: best.frame, takeoffTime: best.g.time, takeoffPitch: best.g.top })
		}
	}
	// the same choreography for a bar that comes back: which earlier landing this one echoes
	for (const h of hits) {
		if (!h.sameAs) continue
		const j = hits.findIndex(x => x.bar === h.sameAs.bar && Math.abs(x.slot - h.sameAs.slot) <= 1)
		if (j >= 0 && hits[j].frame < h.frame) h.echo = j
	}
	// contour: the melody's height around each landing, in semitones from the piece's middle
	const tops = hits.map(h => h.pitch).sort((x, y) => x - y)
	const middle = tops[tops.length >> 1]
	for (const h of hits) {
		let sw = 0, sp = 0
		for (const k of hits) {
			const dt = k.time - h.time
			if (Math.abs(dt) > 2) continue
			const w = Math.exp(-0.5 * (dt / 0.45) ** 2)
			sw += w; sp += w * k.pitch
		}
		h.contour = sp / sw - middle
	}
	// energy: how busy and loud the music is around each landing (for the rider's speed)
	const all = ev.map(e => e.g)
	let a = 0, b = 0
	for (const h of hits) {
		while (a < all.length && all[a].time < h.time - 2) a++
		while (b < all.length && all[b].time <= h.time + 2) b++
		const win = all.slice(a, b)
		const notesPerSec = win.reduce((s, g) => s + g.size, 0) / 4
		const loud = win.length ? win.reduce((s, g) => s + g.velocity, 0) / win.length : 0.5
		h.energy = Math.min(1, Math.max(0, 0.6 * Math.min(1, notesPerSec / 16) + 0.4 * loud))
	}
	// within the piece: its quietest passages 0, its loudest 1 (rank), so his pace has somewhere to go
	const ranked = hits.map(h => h.energy).sort((x, y) => x - y)
	for (const h of hits) {
		let lo = 0, hi = ranked.length
		while (lo < hi) { const m = (lo + hi) >> 1; if (ranked[m] < h.energy) lo = m + 1; else hi = m }
		h.energyRaw = h.energy
		h.energy = ranked.length > 1 ? lo / (ranked.length - 1) : 0.5
	}
	// line detail: the length of the short lines each move is cut into — finer in busy music, runs and loops
	if (detail != null) for (const h of hits) {
		let len = detail * (1.4 - 0.8 * h.energy)
		if (h.hint === 'run' || h.move === 'loop') len = Math.min(len, detail * 0.6)
		h.lineLength = Math.max(2, Math.min(24, len))
	}
	// landings free: every note a take-off instead — he leaves the lip on it and lands wherever the jump
	// takes him (about 60 % of the way to the next note); notes too close to fly between are landed on
	if (!landings) {
		for (let k = 0; k < hits.length; k++) {
			const h = hits[k], T = h.frame, next = hits[k + 1]?.frame ?? T + 80, gap = next - T
			if (gap < 14) { delete h.takeoff; continue }
			Object.assign(h, { takeoff: T, takeoffTime: h.time, takeoffPitch: h.pitch, frame: Math.round(T + Math.max(6, Math.min(gap - 7, 0.62 * gap))), freeLanding: true })
		}
	}
	return hits
}
