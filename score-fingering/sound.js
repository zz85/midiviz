// A violin / viola voice for score playback: notation-ir's player (lookahead scheduler, metronome,
// live speed) with each note read from the University of Iowa arco recordings that #034 ships
// (strings/sound/samples/iowa: one file per string and dynamic, a manifest with every note's
// onset, end of attack and a pitch-synchronous loop). A note plays on the string it is fingered
// on, from its recorded attack (short notes bite into it), sustains on the loop as long as it is
// held, gets a delayed vibrato on long notes, and a small generated room. Until the recordings
// have loaded, or with sound = 'piano', the shared additive voice plays instead.
import { Player as CorePlayer, AHEAD } from '../../random-sketches/vibes/notation-ir/player.js'

export const SAMPLE_ROOT = new URL('../strings/sound/samples/iowa/', import.meta.url)
const SR = 48000 // the manifests' sample positions are at 48 kHz

/** The recording to read for `midi`: on the fingered string when it has one within a semitone, else the closest on any string that reaches it. */
export function pickSample(bank, midi, hint = null) {
  let best = null
  for (const [string, { pack }] of bank.packs) {
    if (midi < bank.manifest.open[string]) continue
    let note = null
    for (const n of pack.notes) if (n.rms > 0 && n.headEnd > n.attackEnd && (!note || Math.abs(n.midi - midi) < Math.abs(note.midi - midi))) note = n
    if (!note) continue
    const miss = Math.abs(note.midi - midi), preferred = string === hint && miss <= 1
    const score = preferred ? -1 : miss * 10 - string // otherwise: closest pitch, then the higher string (lower position)
    if (!best || score < best.score) best = { string, note, score }
  }
  return best
}

export class StringPlayer extends CorePlayer {
  constructor() {
    super({ sustain:0.3 })
    this.sound = 'strings'; this.instrument = 'viola'; this.banks = new Map(); this.bank = null
  }
  ensure() {
    const fresh = !this.ctx
    super.ensure()
    if (fresh) {
      // a small room: decaying stereo noise, mixed in a little
      const c = this.ctx, length = Math.round(c.sampleRate * 1.6), ir = c.createBuffer(2, length, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3) }
      this.room = c.createConvolver(); this.room.buffer = ir
      this.send = c.createGain(); this.send.gain.value = 0.2
      this.send.connect(this.room).connect(this.master)
    }
    return this.ctx
  }
  /** Load (once) the mezzo-forte recordings of every string of `instrument`; resolves to the bank. */
  load(instrument = this.instrument) {
    if (!this.banks.has(instrument)) {
      const promise = (async () => {
        const ctx = this.ensure()
        const manifest = await (await fetch(new URL(`${instrument}/manifest.json`, SAMPLE_ROOT))).json()
        const packs = new Map()
        await Promise.all(manifest.strings.map(async (_, string) => {
          const pack = manifest.packs[`${string}_mf`]; if (!pack) return
          const response = await fetch(new URL(`${instrument}/${pack.file}`, SAMPLE_ROOT))
          if (!response.ok) throw new Error(`${pack.file}: ${response.status}`)
          packs.set(string, { pack, buffer:await ctx.decodeAudioData(await response.arrayBuffer()) })
        }))
        if (!packs.size) throw new Error(`no ${instrument} recordings`)
        return { instrument, manifest, packs }
      })()
      promise.catch(() => this.banks.delete(instrument))
      this.banks.set(instrument, promise)
    }
    return this.banks.get(instrument)
  }
  /** Use `instrument`'s recordings once loaded; false (and the additive voice) when they cannot be. */
  async prepare(instrument = this.instrument) {
    this.instrument = instrument
    if (this.sound !== 'strings') { this.bank = null; return false }
    try { this.bank = await this.load(instrument); return true }
    catch (error) { this.bank = null; this.loadError = error; return false }
  }

  voice(midi, t, dur, vel = this.opts.defaultVel, string = null) {
    const bank = this.sound === 'strings' && this.bank?.instrument === this.instrument ? this.bank : null
    const pick = bank && pickSample(bank, midi, string)
    if (!pick) return super.voice(midi, t, dur, vel)
    const c = this.ctx, n = pick.note, { buffer } = bank.packs.get(pick.string)
    const src = c.createBufferSource(), gain = c.createGain()
    src.buffer = buffer
    src.playbackRate.value = 440 * 2 ** ((midi - 69) / 12) / n.f0
    const loop = n.loop || [n.attackEnd + 0.3 * (n.headEnd - n.attackEnd), n.headEnd - 0.03 * SR]
    src.loop = true; src.loopStart = (n.offset + loop[0]) / SR; src.loopEnd = (n.offset + loop[1]) / SR
    // a short note bites into its attack; a long one plays all of it
    const skip = dur < 0.25 ? 0.6 * (n.attackEnd - n.onset) : dur < 0.5 ? 0.3 * (n.attackEnd - n.onset) : 0
    const level = Math.max(0.4, Math.min(14, (0.18 * (0.35 + vel)) / Math.max(0.004, n.rms)))
    const end = t + Math.max(0.07, dur)
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + (skip ? 0.008 : 0.02))
    gain.gain.setTargetAtTime(0, end, 0.05)
    if (dur > 0.45) { // vibrato after the note has spoken
      const lfo = c.createOscillator(), depth = c.createGain()
      lfo.frequency.value = 5.2 + Math.random() * 0.6
      depth.gain.setValueAtTime(0, t); depth.gain.setValueAtTime(0, t + 0.2); depth.gain.linearRampToValueAtTime(16, t + 0.55)
      lfo.connect(depth).connect(src.detune); lfo.start(t); lfo.stop(end + 0.4); this.voices.push(lfo)
    }
    src.connect(gain); gain.connect(this.master); gain.connect(this.send)
    src.start(t, (n.offset + n.onset + skip) / SR); src.stop(end + 0.4)
    this.voices.push(src)
  }

  /** notation-ir's scheduler, passing each note's string to the voice. */
  schedule({ notes, clicks = [], end, rate = 1, from = 0, onFrame }) {
    this.stop(); this.ensure()
    this.rate = rate
    this.anchorTime = this.ctx.currentTime + 0.08; this.anchorTick = from
    let ni = notes.findIndex(n => n.at >= from), bi = clicks.findIndex(b => b.at >= from)
    if (ni < 0) ni = notes.length; if (bi < 0) bi = clicks.length
    this.playing = true
    const pump = () => {
      if (!this.playing) return
      const until = this.tickAt(this.ctx.currentTime + AHEAD), s = 1 / (this.rate * this.speed)
      for (; ni < notes.length && notes[ni].at < until; ni++) { const n = notes[ni]; this.voice(n.midi, this.anchorTime + (n.at - this.anchorTick) * s, n.dur * s, n.vel ?? this.opts.defaultVel, n.string) }
      for (; bi < clicks.length && clicks[bi].at < until; bi++) if (this.metronome) this.click(this.anchorTime + (clicks[bi].at - this.anchorTick) * s, clicks[bi].accent)
    }
    pump(); this.timer = setInterval(pump, 25)
    const frame = () => {
      if (!this.playing) return
      pump()
      const now = (this.pos = this.tickAt(this.ctx.currentTime))
      onFrame && onFrame(now)
      if (now > end) { this.stop(); return }
      this.raf = requestAnimationFrame(frame)
    }
    this.raf = requestAnimationFrame(frame)
  }
}
