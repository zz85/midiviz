// Which notes Bosh lands on: onsets of a MIDI file weighed by metre, melody, loudness and length,
// then the best set at least `minGap` apart for a target number of landings a second.
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

/** How much a landing on this event would be felt, about 0–1.6. */
export function salience(g) {
	return g.metre * 0.7
		+ (g.melodic ? 0.25 : 0)
		+ g.velocity * 0.3
		+ Math.log2(1 + g.size) * 0.08
		+ Math.min(1, g.ioi / 0.6) * 0.25
		+ Math.min(1, g.length / 1.2) * 0.1
}

/**
 * The landings: a subset of the onset events at least `minGap` s apart (on the 40 fps grid), chosen
 * by dynamic programming for the most salience at `rate` landings a second, with long silences
 * between landings discouraged. `lead` s of run-up come before the music.
 */
export function pickHits(groups, { rate = 2.5, minGap = 0.2, maxGap = 1.6, lead = 1.75 } = {}) {
	if (!groups.length) return []
	const leadIn = Math.max(0, lead - groups[0].time)
	const ev = groups.map(g => ({ g, frame: Math.round((g.time + leadIn) * FPS), sal: salience(g) }))
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
				const v = best[j] - silence(gap)
				if (v > b) { b = v; bj = j }
			}
			best[i] = ev[i].sal - cost + b
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
			notes: g.notes.map(n => n.pitch),
		}
	})
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
	return hits
}
