/**
 * video-export.js — offline (non-realtime) video export for the notation stage.
 *
 * Every frame is rendered at a fixed timestep, so output is perfectly smooth at
 * any resolution (incl. 4K60) regardless of how fast the GPU is. Audio is
 * rendered offline too, by a dedicated OxiSynth instance whose `render()` is
 * driven sample-accurately from the same note schedule — so A/V sync is exact.
 *
 * Encoding: WebCodecs (VideoEncoder / AudioEncoder) → mp4-muxer → MP4.
 * When the File System Access API is available the file streams straight to
 * disk (no RAM ceiling for long 4K exports); otherwise it is buffered in memory.
 */
import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.mjs'

const SAMPLE_RATE = 48000

const VIDEO_CODECS = [
	{ codec: 'avc1.640034', mux: 'avc' }, // H.264 High @ 5.2 (4K60)
	{ codec: 'avc1.640033', mux: 'avc' }, // 5.1
	{ codec: 'avc1.64002A', mux: 'avc' }, // 4.2 (1080p60)
	{ codec: 'vp09.00.51.08', mux: 'vp9' },
	{ codec: 'av01.0.13M.08', mux: 'av1' },
]
const AUDIO_CODECS = [
	{ codec: 'mp4a.40.2', mux: 'aac' },
	{ codec: 'opus', mux: 'opus' },
]

export function exportSupported() {
	return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

/** Default bitrate (bits/s) by pixel rate. ~0.1 bit per pixel per frame for H.264. */
export function defaultBitrate(w, h, fps) {
	return Math.round(Math.min(80e6, Math.max(6e6, w * h * fps * 0.09)))
}

async function pickVideoCodec(w, h, fps, bitrate) {
	for (const c of VIDEO_CODECS) {
		const config = { codec: c.codec, width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality' }
		if (c.mux === 'avc') config.avc = { format: 'avc' }
		try {
			const r = await VideoEncoder.isConfigSupported(config)
			if (r.supported) return { ...c, config: r.config }
		} catch { /* try next */ }
	}
	throw new Error(`No supported video encoder for ${w}×${h}@${fps}`)
}

async function pickAudioCodec() {
	if (typeof AudioEncoder === 'undefined') return null
	for (const c of AUDIO_CODECS) {
		const config = { codec: c.codec, sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 192000 }
		try {
			const r = await AudioEncoder.isConfigSupported(config)
			if (r.supported) return { ...c, config: r.config }
		} catch { /* try next */ }
	}
	return null
}

/**
 * Offline synth: OxiSynthRaw fed by a sorted event list, rendered on demand.
 */
class OfflineSynth {
	static async create({ vendorPath, soundfonts, convertSF3, schedule, programs, volume }) {
		const mod = await import(`${vendorPath}/oxisynth/oxisynth.js`)
		await mod.default()
		const synth = new mod.OxiSynthRaw(SAMPLE_RATE)
		for (const path of soundfonts) {
			const res = await fetch(path)
			if (!res.ok) throw new Error(`Soundfont ${path}: HTTP ${res.status}`)
			let data = new Uint8Array(await res.arrayBuffer())
			if (path.endsWith('.sf3')) {
				if (!convertSF3) throw new Error('SF3 soundfonts need conversion; choose an SF2 sound for export')
				data = await convertSF3(data)
			}
			synth.add_soundfont(data)
		}
		for (const [ch, prog] of programs) synth.program_change(ch, prog)
		const vol = Math.round(volume * 110)
		for (let ch = 0; ch < 16; ch++) synth.control_change(ch, 7, vol)
		return new OfflineSynth(synth, schedule)
	}

	constructor(synth, { notes, controlChanges }) {
		this.synth = synth
		const ev = []
		for (const n of notes) {
			ev.push({ t: n.time, k: 2, ch: n.channel, a: n.midi, b: Math.max(1, Math.round(n.velocity * 127)) })
			ev.push({ t: n.time + Math.max(0.01, n.duration), k: 0, ch: n.channel, a: n.midi })
		}
		for (const c of controlChanges || []) ev.push({ t: c.time, k: 1, ch: c.channel, a: c.controller, b: c.value })
		// time, then note-off < cc < note-on so re-struck notes retrigger cleanly
		ev.sort((p, q) => p.t - q.t || p.k - q.k)
		this.events = ev
		this.next = 0
		this.frame = 0 // frames rendered so far (relative to the synth's t=0)
	}

	_fire(e) {
		const s = this.synth
		if (e.k === 2) s.note_on(e.ch, e.a, e.b)
		else if (e.k === 0) s.note_off(e.ch, e.a)
		else s.control_change(e.ch, e.a, e.b)
	}

	/** Skip silently to time t (events before t are applied, notes released). */
	seek(t) {
		const ev = this.events
		while (this.next < ev.length && ev[this.next].t < t) {
			const e = ev[this.next++]
			if (e.k === 1) this._fire(e) // keep controller state (sustain, expression)
		}
		for (let ch = 0; ch < 16; ch++) this.synth.all_sound_off(ch)
		this.frame = Math.round(t * SAMPLE_RATE)
	}

	/** Render up to absolute frame `endFrame`; returns planar Float32Array [L..., R...]. */
	renderTo(endFrame) {
		const total = endFrame - this.frame
		const out = new Float32Array(Math.max(0, total) * 2)
		let written = 0
		const ev = this.events
		while (this.frame < endFrame) {
			// fire everything due at the current frame
			while (this.next < ev.length && Math.round(ev[this.next].t * SAMPLE_RATE) <= this.frame) this._fire(ev[this.next++])
			const nextEv = this.next < ev.length ? Math.round(ev[this.next].t * SAMPLE_RATE) : Infinity
			const n = Math.min(endFrame, nextEv, this.frame + 4096) - this.frame
			const buf = this.synth.render(n) // interleaved stereo
			for (let i = 0; i < n; i++) {
				out[written + i] = buf[i * 2]
				out[total + written + i] = buf[i * 2 + 1]
			}
			written += n
			this.frame += n
		}
		return out
	}

	dispose() { try { this.synth.free() } catch { /* ignore */ } }
}

/**
 * @param {object} o
 * @param {NotationStage} o.stage
 * @param {{schedule, programs, duration, title}} o.song
 * @param {number} o.width, o.height, o.fps, o.start, o.end - seconds (music time)
 * @param {boolean} o.audio
 * @param {object} o.audioOpts - { vendorPath, soundfonts, convertSF3, volume }
 * @param {FileSystemWritableFileStream|null} o.fileStream - stream to write to (else buffered)
 * @param {(p:{frame,frames,phase})=>void} o.onProgress
 * @param {AbortSignal} o.signal
 * @returns {Promise<Blob|null>} blob when buffered, null when streamed to disk
 */
export async function exportVideo(o) {
	const { stage, song, fps, signal } = o
	const width = o.width & ~1, height = o.height & ~1
	const bitrate = o.bitrate || defaultBitrate(width, height, fps)
	const preroll = o.preroll ?? 1, tail = o.tail ?? 2
	const t0 = o.start - preroll
	const t1 = Math.min(song.duration + tail, o.end + (o.end >= song.duration ? tail : 0))
	const frames = Math.max(1, Math.round((t1 - t0) * fps))

	const vc = await pickVideoCodec(width, height, fps, bitrate)
	const ac = o.audio ? await pickAudioCodec() : null
	if (o.audio && !ac) console.warn('[export] no audio encoder available — exporting video only')

	const target = o.fileStream ? new FileSystemWritableFileStreamTarget(o.fileStream) : new ArrayBufferTarget()
	const muxer = new Muxer({
		target,
		video: { codec: vc.mux, width, height, frameRate: fps },
		audio: ac ? { codec: ac.mux, numberOfChannels: 2, sampleRate: SAMPLE_RATE } : undefined,
		fastStart: o.fileStream ? false : 'in-memory',
		firstTimestampBehavior: 'offset',
	})

	let encError = null
	const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encError = e } })
	venc.configure(vc.config)
	let aenc = null, synth = null
	if (ac) {
		aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { encError = e } })
		aenc.configure(ac.config)
		synth = await OfflineSynth.create({ ...o.audioOpts, schedule: song.schedule, programs: song.programs })
		synth.seek(Math.max(0, t0))
	}

	const yieldUI = () => new Promise(r => setTimeout(r, 0))
	const startWall = performance.now()
	stage.beginOffline(width, height)
	let audioFrame = Math.round(t0 * SAMPLE_RATE) // may be negative (pre-roll silence)
	let audioTs = 0
	try {
		for (let i = 0; i < frames; i++) {
			if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
			if (encError) throw encError
			const t = t0 + i / fps
			stage.update(t, 1 / fps, true, t)
			const frame = new VideoFrame(stage.renderer.domElement, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) })
			venc.encode(frame, { keyFrame: i % (fps * 2) === 0 })
			frame.close()

			// audio up to the end of this video frame
			if (aenc) {
				const end = Math.round((t0 + (i + 1) / fps) * SAMPLE_RATE)
				while (audioFrame < end) {
					const chunkEnd = Math.min(end, audioFrame + 4800)
					const n = chunkEnd - audioFrame
					let data
					if (chunkEnd <= 0) data = new Float32Array(n * 2) // pre-roll before t=0
					else {
						if (audioFrame < 0) { // straddles t=0
							const pad = -audioFrame
							const rest = synth.renderTo(chunkEnd)
							data = new Float32Array(n * 2)
							data.set(rest.subarray(0, n - pad), pad)
							data.set(rest.subarray(n - pad), n + pad)
						} else data = synth.renderTo(chunkEnd)
					}
					const ad = new AudioData({ format: 'f32-planar', sampleRate: SAMPLE_RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(audioTs * 1e6 / SAMPLE_RATE), data })
					aenc.encode(ad)
					ad.close()
					audioTs += n
					audioFrame = chunkEnd
				}
			}

			// back-pressure + keep the UI responsive
			while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2))
			if (i % 2 === 0) {
				const el = (performance.now() - startWall) / 1000
				o.onProgress?.({ frame: i + 1, frames, elapsed: el, eta: el / (i + 1) * (frames - i - 1), codec: vc.codec, audioCodec: ac?.codec })
				await yieldUI()
			}
		}
		o.onProgress?.({ frame: frames, frames, phase: 'finalizing' })
		await venc.flush()
		if (aenc) await aenc.flush()
		if (encError) throw encError
		muxer.finalize()
		if (o.fileStream) { await o.fileStream.close(); return null }
		return new Blob([target.buffer], { type: 'video/mp4' })
	} catch (e) {
		try { venc.close() } catch { /* ignore */ }
		try { aenc?.close() } catch { /* ignore */ }
		if (o.fileStream) try { await o.fileStream.abort() } catch { /* ignore */ }
		throw e
	} finally {
		synth?.dispose()
		stage.endOffline()
	}
}
