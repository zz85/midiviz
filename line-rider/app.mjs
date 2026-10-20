import { beatGrid } from '../harmony/harmony.js'
import { onsetsOf } from '../bosh/music.js'
import {
  ACCEL,
  FPS,
  SCENERY,
  makeLine as prepareLine,
} from '../bosh/physics.js'
import {
  THEMES,
  cameraAt,
  cameraPath,
  drawBosh,
  pitchColour,
  rideFrames,
} from '../bosh/render.js'
import { readTrack, writeTrack } from '../bosh/track.js'
import {
  connectedEndpoints,
  copyLines,
  endpointAt,
  hitTestLine,
  loopToLines,
  makeLine,
  moveEndpoints,
  nextLineId,
  snapPoint,
  strokeToLines,
} from './editor-model.mjs'

const $ = id => document.getElementById(id)
const canvas = $('view')
const ctx = canvas.getContext('2d')

const song = {
  title: 'Chopin – Minute Waltz',
  midi: null,
  groups: null,
  notes: [],
  duration: 0,
}

const ride = {
  lines: [],
  start: { x: 0, y: 0 },
  velocity: { x: 0.4, y: 0 },
  duration: 0,
  frames: null,
  camera: null,
  pads: [],
  padsByLine: new Map(),
  leadIn: 0,
  flow: null,
  originalLineCount: 0,
  title: 'Minute Waltz',
}

const clock = {
  playing: false,
  time: 0,
  wall: 0,
  speed: 1,
}

const editor = {
  tool: 'select',
  selected: null,
  gesture: null,
  undo: [],
  redo: [],
  newFlipped: false,
  newLeftExtended: false,
  newRightExtended: false,
  changed: false,
  spacePan: false,
  spacePanUsed: false,
}

const view = {
  x: 0,
  y: 0,
  ready: false,
  dpr: 1,
}

let syncingProperties = false
let simulationTimer = 0
let activeJob = 0

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function setStatus(message = '', error = false) {
  $('status').textContent = message
  $('status').classList.toggle('hidden', !message)
  $('status').classList.toggle('error', error)
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds || 0)
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`
}

function currentTime() {
  return clock.playing
    ? clock.time + (performance.now() - clock.wall) / 1000 * clock.speed
    : clock.time
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const width = Math.round(innerWidth * dpr)
  const height = Math.round(innerHeight * dpr)
  if (canvas.width === width && canvas.height === height) return
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
  view.dpr = dpr
}

function zoomAmount() {
  return clamp(3.4 * (innerHeight / 1000) * Number($('zoom').value), 0.35, 9)
}

function riderCamera(frame) {
  if (!ride.camera) return { x: view.x, y: view.y }
  return cameraAt(ride.camera, frame)
}

function activeCamera(frame) {
  if ($('follow').checked && ride.camera && !editor.gesture?.kind?.startsWith('pan')) {
    const target = riderCamera(frame)
    view.x = target.x
    view.y = target.y
    view.ready = true
  }
  return { x: view.x, y: view.y, zoom: zoomAmount() }
}

function worldToScreen(point, camera) {
  return {
    x: (point.x - camera.x) * camera.zoom + innerWidth / 2,
    y: (point.y - camera.y) * camera.zoom + innerHeight / 2,
  }
}

function screenToWorld(point, camera) {
  return {
    x: (point.x - innerWidth / 2) / camera.zoom + camera.x,
    y: (point.y - innerHeight / 2) / camera.zoom + camera.y,
  }
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function lowerBound(notes, time) {
  let low = 0
  let high = notes.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (notes[middle].time < time) low = middle + 1
    else high = middle
  }
  return low
}

class MidiSynth {
  constructor() {
    this.context = null
    this.master = null
    this.notes = []
    this.next = 0
    this.voices = new Set()
  }

  setSong(notes, leadIn = 0) {
    this.notes = notes.map(note => ({ ...note, time: note.time + leadIn }))
    this.reset(clock.time)
  }

  ensureContext() {
    if (this.context) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    this.context = new AudioContext()
    this.master = this.context.createGain()
    const compressor = this.context.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.ratio.value = 5
    compressor.attack.value = 0.004
    compressor.release.value = 0.18
    this.master.gain.value = 0.42
    this.master.connect(compressor)
    compressor.connect(this.context.destination)
  }

  async resume() {
    this.ensureContext()
    if (this.context.state !== 'running') await this.context.resume()
  }

  stopAll() {
    for (const voice of this.voices) {
      try { voice.stop() } catch {}
    }
    this.voices.clear()
  }

  reset(time) {
    this.stopAll()
    this.next = lowerBound(this.notes, Math.max(0, time - 0.03))
  }

  tick(time, speed) {
    if (!this.context || this.context.state !== 'running') return
    const horizon = time + 0.14 * speed
    while (this.next < this.notes.length && this.notes[this.next].time <= horizon) {
      const note = this.notes[this.next++]
      if (note.time < time - 0.04) continue
      this.playNote(note, this.context.currentTime + Math.max(0, (note.time - time) / speed), speed)
    }
  }

  playNote(note, when, speed) {
    const oscillator = this.context.createOscillator()
    const overtone = this.context.createOscillator()
    const overtoneGain = this.context.createGain()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    const frequency = 440 * 2 ** ((note.midi - 69) / 12)
    const duration = clamp(note.duration / speed, 0.05, 1.5)
    const peak = 0.012 + note.velocity ** 1.6 * 0.026
    oscillator.type = note.midi >= 60 ? 'triangle' : 'sine'
    oscillator.frequency.value = frequency
    overtone.type = 'sine'
    overtone.frequency.value = frequency * 2.003
    overtoneGain.gain.value = 0.08
    filter.type = 'lowpass'
    filter.frequency.value = 1800 + note.velocity * 2200
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.1)
    oscillator.connect(filter)
    overtone.connect(overtoneGain)
    overtoneGain.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    oscillator.start(when)
    overtone.start(when)
    oscillator.stop(when + duration + 0.12)
    overtone.stop(when + duration + 0.12)
    this.voices.add(oscillator)
    this.voices.add(overtone)
    oscillator.onended = () => this.voices.delete(oscillator)
    overtone.onended = () => this.voices.delete(overtone)
  }
}

const synth = new MidiSynth()

const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const jobs = new Map()
worker.onmessage = ({ data }) => {
  const job = jobs.get(data.id)
  if (!job) return
  if (data.progress) {
    job.progress(data.progress)
    return
  }
  jobs.delete(data.id)
  data.error ? job.reject(new Error(data.error)) : job.resolve(data.result)
}

function generationOptions() {
  const rateLow = Number($('rateLow').value)
  const rateHigh = Number($('rateHigh').value)
  const gapLow = Number($('gapLow').value)
  const gapHigh = Number($('gapHigh').value)
  const speedLow = Number($('paceLow').value)
  const speedHigh = Number($('paceHigh').value)
  const phraseLow = Number($('phraseLow').value)
  const phraseHigh = Number($('phraseHigh').value)
  const upAngle = Number($('upAngle').value)
  const downAngle = Number($('downAngle').value)
  return {
    pick: {
      rateLow,
      rateHigh,
      gapLow,
      gapHigh,
    },
    plan: {
      seed: Number($('seed').value) || 1,
      beam: 4,
      pitchScale: Number($('pitch').value),
      speedLow,
      speedHigh,
      phraseLow,
      phraseHigh,
      upAngle,
      downAngle,
      excitement: clamp((Math.max(upAngle, downAngle) - 20) / 55, 0, 1),
      red: upAngle >= 45,
      // A phrase is the visible macro-line. Real Line Rider physics still
      // needs collision-safe editable segments underneath that gesture.
      lineLow: 4,
      lineHigh: 14,
      ds: 14,
    },
  }
}

async function generate() {
  if (!song.groups) return
  pause()
  const id = ++activeJob
  for (const [jobId, job] of jobs) {
    job.reject(new Error('superseded'))
    jobs.delete(jobId)
  }
  $('generate').disabled = true
  $('planning').style.display = 'block'
  $('planning').firstElementChild.style.width = '0'
  setStatus(`Planning a real Line Rider track for ${song.title}…`)
  try {
    const { pick, plan } = generationOptions()
    const result = await new Promise((resolve, reject) => {
      jobs.set(id, {
        resolve,
        reject,
        progress(progress) {
          $('planning').firstElementChild.style.width = `${100 * progress.done / progress.total}%`
          setStatus(
            `Planning landing ${progress.done}/${progress.total} · ` +
            `${(progress.frames / 1e6).toFixed(2)}M physics frames tested`,
          )
        },
      })
      worker.postMessage({ id, groups: song.groups, pick, plan, label: song.title })
    })
    if (id !== activeJob) return
    await applyTrack(result.track, {
      title: song.title,
      pads: result.pads,
      leadIn: result.leadIn,
      flow: result.flow,
      generated: true,
    })
    setStatus('')
  } catch (error) {
    if (error.message !== 'superseded') {
      console.error(error)
      setStatus(`Track planning failed: ${error.message}`, true)
    }
  } finally {
    if (id === activeJob) {
      $('generate').disabled = false
      $('planning').style.display = 'none'
    }
  }
}

async function loadMidiBuffer(buffer, title) {
  if (typeof globalThis.Midi !== 'function') throw new Error('The MIDI parser did not load.')
  const midi = new globalThis.Midi(buffer)
  const groups = onsetsOf(midi, { beats: beatGrid(midi).beats })
  if (!groups.length) throw new Error('No pitched notes were found.')
  const notes = midi.tracks
    .filter(track => track.channel !== 9 && !track.instrument?.percussion)
    .flatMap(track => track.notes.map(note => ({
      midi: note.midi,
      velocity: note.velocity,
      duration: note.duration,
      time: note.time,
    })))
    .sort((a, b) => a.time - b.time || b.midi - a.midi)
  Object.assign(song, { title, midi, groups, notes, duration: midi.duration })
  await generate()
}

async function loadDefaultMidi() {
  try {
    const response = await fetch('minute_waltz.mid')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadMidiBuffer(await response.arrayBuffer(), 'Chopin – Minute Waltz')
  } catch (error) {
    console.error(error)
    setStatus(`Could not load minute_waltz.mid: ${error.message}. Use a local web server.`, true)
  }
}

async function loadFile(file) {
  pause()
  setStatus(`Opening ${file.name}…`)
  try {
    if (/\.json$/i.test(file.name)) {
      const json = JSON.parse(await file.text())
      const project = json.track && Array.isArray(json.track.lines) ? json : { track: json }
      await applyTrack(project.track, {
        title: project.title || file.name.replace(/\.track\.json$|\.json$/i, ''),
        pads: project.pads || [],
        leadIn: project.leadIn || 0,
        flow: project.flow || null,
        generated: false,
      })
    } else {
      await loadMidiBuffer(await file.arrayBuffer(), file.name.replace(/\.midi?$/i, ''))
    }
    setStatus('')
  } catch (error) {
    console.error(error)
    setStatus(`Could not open ${file.name}: ${error.message}`, true)
  }
}

async function applyTrack(json, {
  title = 'Line Rider track',
  pads = [],
  leadIn = 0,
  flow = null,
  generated = false,
} = {}) {
  const parsed = readTrack(json)
  ride.lines = copyLines(parsed.lines)
  ride.start = parsed.start
  ride.velocity = parsed.velocity
  ride.duration = Math.max(parsed.duration / FPS, song.duration ? song.duration + leadIn + 0.5 : 0, 1)
  ride.pads = pads.map(pad => ({ ...pad }))
  ride.padsByLine = new Map(ride.pads.map(pad => [pad.lineId, pad]))
  ride.leadIn = leadIn
  ride.flow = flow
  ride.originalLineCount = ride.lines.length
  ride.title = title
  editor.undo = []
  editor.redo = []
  editor.selected = null
  editor.changed = !generated
  clock.time = 0
  synth.setSong(song.notes, leadIn)
  await resimulate({ recenter: true, quiet: true })
  $('play').disabled = false
  $('save').disabled = false
  updateSelection()
}

async function resimulate({ recenter = false, quiet = false } = {}) {
  if (!ride.lines.length) return
  pause()
  if (!quiet) setStatus('Re-running Line Rider 6.2 physics…')
  await new Promise(resolve => setTimeout(resolve, 0))
  try {
    const frames = Math.ceil(ride.duration * FPS)
    ride.frames = rideFrames(ride.lines, {
      start: ride.start,
      velocity: ride.velocity,
      frames,
    })
    ride.camera = cameraPath(ride.frames)
    if (recenter || !view.ready) {
      const start = cameraAt(ride.camera, clamp(clock.time * FPS, 0, ride.frames.frames))
      view.x = start.x
      view.y = start.y
      view.ready = true
    }
    updateStats()
    if (!quiet) setStatus('')
  } catch (error) {
    console.error(error)
    setStatus(`Physics failed: ${error.message}`, true)
  }
}

function scheduleSimulation() {
  clearTimeout(simulationTimer)
  if (!$('autoSim').checked) {
    updateStats()
    return
  }
  simulationTimer = setTimeout(() => resimulate(), 80)
}

function updateStats() {
  if (!ride.frames) return
  const crash = ride.frames.crash
  const exact = ride.pads.filter(pad => ride.frames.firstTouch.get(pad.lineId) === pad.frame).length
  const editDelta = ride.lines.length - ride.originalLineCount
  const lineChange = editDelta ? ` · ${editDelta > 0 ? '+' : ''}${editDelta} lines` : ''
  const speeds = ride.pads.map(pad => pad.speed).filter(Number.isFinite).sort((a, b) => a - b)
  const gaps = ride.pads.slice(1)
    .map((pad, index) => (pad.frame - ride.pads[index].frame) / FPS)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const percentile = (values, amount) => values.length
    ? values[Math.round((values.length - 1) * amount)]
    : null
  const speedLow = percentile(speeds, 0.1)
  const speedHigh = percentile(speeds, 0.9)
  const gapLow = percentile(gaps, 0.1)
  const gapHigh = percentile(gaps, 0.9)
  const gestures = new Map()
  for (const pad of ride.pads) {
    if (pad.gestureIndex == null || gestures.has(pad.gestureIndex)) continue
    gestures.set(pad.gestureIndex, pad.gestureBars)
  }
  const gestureBars = [...gestures.values()].filter(Number.isFinite)
  const heights = ride.pads.map(pad => pad.courseHeight).filter(Number.isFinite).sort((a, b) => a - b)
  const heightLow = percentile(heights, 0.1)
  const heightHigh = percentile(heights, 0.9)
  const loops = ride.pads.filter(pad => pad.kind === 'loop').length
  const gestureSummary = gestures.size && gestureBars.length && heightLow != null
    ? `<div><span class="key">Music shape</span> ${gestures.size} phrase gestures · ${Math.min(...gestureBars)}–${Math.max(...gestureBars)} bars · ${(heightHigh - heightLow).toFixed(0)} px elevation · ${loops} ridden loop${loops === 1 ? '' : 's'} <span class="key">(10–90%)</span></div>`
    : ''
  const flowStats = speedLow == null || gapLow == null
    ? ''
    : `<div><span class="key">Actual flow</span> pace ${speedLow.toFixed(1)}–${speedHigh.toFixed(1)} px/f · gaps ${gapLow.toFixed(2)}–${gapHigh.toFixed(2)} s <span class="key">(10–90%)</span></div>`
  $('stats').innerHTML = `
    <div><span class="key">Track</span> ${ride.lines.length} editable segments${lineChange} · ${FPS} fps</div>
    <div class="${crash == null ? 'ok' : 'bad'}">${crash == null
      ? '✓ Bosh stays mounted for the whole ride'
      : `✗ Bosh crashes at ${(crash / FPS).toFixed(2)} s`}</div>
    ${ride.pads.length
      ? `<div class="${exact === ride.pads.length ? 'ok' : 'bad'}">${exact}/${ride.pads.length} note landings still exact after edits</div>`
      : '<div><span class="key">Loaded track</span> edit it, then re-run physics</div>'}
    ${gestureSummary}${flowStats}`
}

function pushUndo(snapshot = copyLines(ride.lines)) {
  editor.undo.push(snapshot)
  if (editor.undo.length > 40) editor.undo.shift()
  editor.redo = []
  updateHistoryButtons()
}

function updateHistoryButtons() {
  $('undo').disabled = !editor.undo.length
  $('redo').disabled = !editor.redo.length
}

function finishEdit(snapshot) {
  pushUndo(snapshot)
  editor.changed = true
  $('save').disabled = false
  updateSelection()
  scheduleSimulation()
}

function undo() {
  if (!editor.undo.length) return
  editor.redo.push(copyLines(ride.lines))
  ride.lines = editor.undo.pop()
  editor.selected = null
  editor.changed = true
  updateHistoryButtons()
  updateSelection()
  scheduleSimulation()
}

function redo() {
  if (!editor.redo.length) return
  editor.undo.push(copyLines(ride.lines))
  ride.lines = editor.redo.pop()
  editor.selected = null
  editor.changed = true
  updateHistoryButtons()
  updateSelection()
  scheduleSimulation()
}

function selectedLine() {
  return editor.selected == null ? null : ride.lines[editor.selected] || null
}

function setSelected(index) {
  editor.selected = Number.isInteger(index) && ride.lines[index] ? index : null
  updateSelection()
}

function updateSelection() {
  const line = selectedLine()
  syncingProperties = true
  if (line) {
    $('selection').textContent = `Line ${line.id} · ${['solid', 'red', 'scenery'][line.type] || 'solid'}`
    $('lineType').value = String(line.type)
    $('leftExtended').checked = !!line.leftExtended
    $('rightExtended').checked = !!line.rightExtended
    $('flip').classList.toggle('on', !!line.flipped)
  } else {
    $('selection').textContent = 'No line selected'
    $('leftExtended').checked = editor.newLeftExtended
    $('rightExtended').checked = editor.newRightExtended
    $('flip').classList.toggle('on', editor.newFlipped)
  }
  $('deleteLine').disabled = !line
  syncingProperties = false
  updateHistoryButtons()
}

function editSelected(mutator) {
  const line = selectedLine()
  if (!line) return false
  const before = copyLines(ride.lines)
  mutator(line)
  finishEdit(before)
  return true
}

function deleteSelected() {
  if (!selectedLine()) return
  const before = copyLines(ride.lines)
  ride.lines.splice(editor.selected, 1)
  editor.selected = null
  finishEdit(before)
}

function chooseTool(tool) {
  editor.tool = tool
  for (const button of document.querySelectorAll('[data-tool]')) {
    button.classList.toggle('on', button.dataset.tool === tool)
  }
  canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'erase' ? 'not-allowed' : tool === 'select' ? 'default' : 'crosshair'
}

function drawGrid(camera, theme) {
  const x0 = camera.x - innerWidth / 2 / camera.zoom
  const x1 = camera.x + innerWidth / 2 / camera.zoom
  const y0 = camera.y - innerHeight / 2 / camera.zoom
  const y1 = camera.y + innerHeight / 2 / camera.zoom
  const size = 40
  ctx.strokeStyle = theme.faint
  ctx.lineWidth = 1 / camera.zoom
  ctx.beginPath()
  for (let x = Math.floor(x0 / size) * size; x <= x1; x += size) {
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
  }
  for (let y = Math.floor(y0 / size) * size; y <= y1; y += size) {
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
  }
  ctx.stroke()
}

function drawAccelerationMarks(line, camera, theme) {
  const prepared = prepareLine(line)
  const nx = prepared.nx * 1.6
  const ny = prepared.ny * 1.6
  ctx.strokeStyle = theme.accel
  ctx.lineWidth = 1 / camera.zoom
  ctx.beginPath()
  ctx.moveTo(line.x1 + nx, line.y1 + ny)
  ctx.lineTo(line.x2 + nx, line.y2 + ny)
  ctx.stroke()
  const ux = prepared.vx / prepared.length
  const uy = prepared.vy / prepared.length
  const direction = (prepared.ax * ux + prepared.ay * uy) > 0 ? -1 : 1
  ctx.beginPath()
  for (let distance = 5; distance < prepared.length - 2; distance += 7) {
    const x = line.x1 + ux * distance + nx * 2.2
    const y = line.y1 + uy * distance + ny * 2.2
    ctx.moveTo(x - ux * 1.6 * direction + prepared.nx * 1.2, y - uy * 1.6 * direction + prepared.ny * 1.2)
    ctx.lineTo(x, y)
    ctx.lineTo(x - ux * 1.6 * direction - prepared.nx * 1.2, y - uy * 1.6 * direction - prepared.ny * 1.2)
  }
  ctx.stroke()
}

function drawLines(camera, theme, frame) {
  const x0 = camera.x - innerWidth / 2 / camera.zoom - 20
  const x1 = camera.x + innerWidth / 2 / camera.zoom + 20
  const y0 = camera.y - innerHeight / 2 / camera.zoom - 20
  const y1 = camera.y + innerHeight / 2 / camera.zoom + 20
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let index = 0; index < ride.lines.length; index++) {
    const line = ride.lines[index]
    if (
      Math.max(line.x1, line.x2) < x0 || Math.min(line.x1, line.x2) > x1 ||
      Math.max(line.y1, line.y2) < y0 || Math.min(line.y1, line.y2) > y1
    ) continue
    const selected = index === editor.selected
    const pad = ride.padsByLine.get(line.id)
    if (selected) {
      ctx.strokeStyle = 'rgba(210,170,85,0.34)'
      ctx.lineWidth = 9 / camera.zoom
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.stroke()
    }
    if (pad) {
      const since = (frame - pad.frame) / FPS
      const glow = since >= 0 ? Math.exp(-since * 3.2) : 0
      if (glow > 0.01) {
        ctx.strokeStyle = pitchColour(pad.pitch, 60, glow * 0.4)
        ctx.lineWidth = (2 + 8 * glow) / camera.zoom
        ctx.beginPath()
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
        ctx.stroke()
      }
      ctx.strokeStyle = pitchColour(pad.pitch, since >= 0 ? 52 : 48, since >= 0 ? 1 : 0.6)
      ctx.lineWidth = (selected ? 2.6 : 2.1) / camera.zoom
    } else if (line.type === SCENERY) {
      ctx.strokeStyle = $('theme').value === 'night' ? 'rgba(110,190,130,0.75)' : 'rgba(60,125,70,0.7)'
      ctx.lineWidth = (line.width || 1.2) / camera.zoom
    } else {
      ctx.strokeStyle = line.type === ACCEL ? theme.accel : theme.line
      ctx.lineWidth = (selected ? 2.5 : 1.6) / camera.zoom
    }
    ctx.beginPath()
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
    ctx.stroke()
    if (line.type === ACCEL && Math.hypot(line.x2 - line.x1, line.y2 - line.y1) > 2) {
      drawAccelerationMarks(line, camera, theme)
    }
  }
}

function drawTrail(camera, theme, frame) {
  if (!$('trail').checked || !ride.camera) return
  const from = Math.max(0, Math.floor(frame) - 2 * FPS)
  const to = Math.min(ride.frames.frames, Math.floor(frame))
  ctx.strokeStyle = theme.trail
  ctx.lineWidth = 2.2 / camera.zoom
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let index = from; index <= to; index++) {
    const x = ride.camera.bodyX[index]
    const y = ride.camera.bodyY[index]
    index === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function previewLines() {
  const gesture = editor.gesture
  if (!gesture) return []
  const type = Number($('lineType').value)
  const options = {
    type,
    flipped: selectedLine()?.flipped ?? editor.newFlipped,
    id: nextLineId(ride.lines),
  }
  if (gesture.kind === 'draw-line' && gesture.current) {
    return [makeLine(options.id, gesture.start, gesture.current, type, options)]
  }
  if (gesture.kind === 'draw-loop' && gesture.current) {
    return loopToLines(gesture.start, gesture.current, options)
  }
  if (gesture.kind === 'draw-pencil') {
    return strokeToLines(gesture.points, {
      ...options,
      tolerance: 0.8 / zoomAmount(),
      minLength: 1,
    })
  }
  return []
}

function drawPreview(camera) {
  const lines = previewLines()
  if (!lines.length) return
  ctx.save()
  ctx.strokeStyle = Number($('lineType').value) === ACCEL ? '#d8342c' : '#d2aa55'
  ctx.lineWidth = 2 / camera.zoom
  ctx.setLineDash([5 / camera.zoom, 4 / camera.zoom])
  ctx.beginPath()
  for (const line of lines) {
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
  }
  ctx.stroke()
  ctx.restore()
}

function drawHandles(camera) {
  const line = selectedLine()
  if (!line || clock.playing) return
  const radius = 5.2 / camera.zoom
  for (const point of [{ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }]) {
    ctx.fillStyle = '#f6f3ec'
    ctx.strokeStyle = '#d2aa55'
    ctx.lineWidth = 2 / camera.zoom
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

function drawTimeline(frame, theme) {
  if (!ride.frames) return
  const y = innerHeight - 17
  ctx.fillStyle = theme === THEMES.night ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.055)'
  ctx.fillRect(0, y - 9, innerWidth, 26)
  for (const pad of ride.pads) {
    const x = pad.frame / ride.frames.frames * innerWidth
    ctx.fillStyle = pitchColour(pad.pitch, 52, pad.frame <= frame ? 0.95 : 0.42)
    ctx.fillRect(x - 0.75, y - 4 - pad.strength * 7, 1.5, 8 + pad.strength * 14)
  }
  ctx.fillStyle = theme.line
  ctx.fillRect(frame / ride.frames.frames * innerWidth - 1, y - 10, 2, 24)
}

function render() {
  requestAnimationFrame(render)
  resize()
  let time = currentTime()
  if (clock.playing && time >= ride.duration) {
    time = ride.duration
    clock.time = time
    pause()
  }
  if (clock.playing) synth.tick(time, clock.speed)
  const frame = ride.frames ? clamp(time * FPS, 0, ride.frames.frames) : 0
  const theme = THEMES[$('theme').value] || THEMES.paper
  const camera = activeCamera(frame)
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, innerWidth, innerHeight)
  ctx.save()
  ctx.translate(innerWidth / 2, innerHeight / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)
  drawGrid(camera, theme)
  if (ride.frames) drawTrail(camera, theme, frame)
  drawLines(camera, theme, frame)
  drawPreview(camera)
  if (ride.frames) drawBosh(ctx, ride.frames, frame, theme)
  drawHandles(camera)
  ctx.restore()
  drawTimeline(frame, theme)
  updateTransport(time)
}

function updateTransport(time = currentTime()) {
  $('seek').value = ride.duration ? clamp(time / ride.duration, 0, 1) : 0
  $('time').textContent = `${formatTime(time)} / ${formatTime(ride.duration)}`
  updateFlowIndicator(time)
}

function updateFlowIndicator(time) {
  const pads = ride.pads
  if (!ride.flow || !pads.length || pads[0].targetRate == null) {
    $('flowNow').innerHTML = '<span class="key">Adaptive flow</span> follows the score after generation'
    return
  }
  const frame = time * FPS
  let low = 0
  let high = pads.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (pads[middle].frame <= frame) low = middle
    else high = middle - 1
  }
  const pad = pads[low]
  const targetSpeed =
    ride.flow.speedLow + (ride.flow.speedHigh - ride.flow.speedLow) * (pad.energy ?? pad.activity ?? 0.5)
  const actual = Number.isFinite(pad.speed) ? ` · actual ${pad.speed.toFixed(1)}` : ''
  const slope = pad.loopRequested
    ? `loop from ${Math.abs(pad.targetSlopeAngle).toFixed(0)}° climb`
    : Number.isFinite(pad.targetSlopeAngle)
    ? `${pad.targetSlopeAngle >= 0 ? 'uphill' : 'downhill'} ${Math.abs(pad.targetSlopeAngle).toFixed(0)}°`
    : 'natural contour'
  $('flowNow').innerHTML =
    `<span class="key">Here</span> ${pad.targetRate.toFixed(2)}/s · ` +
    `gap ≥ ${pad.gapFloor.toFixed(2)} s · pace target ${targetSpeed.toFixed(1)}${actual} px/f · ` +
    `gesture ${pad.gestureBars ?? '—'} bars · ${slope}`
}

async function play() {
  if (!ride.frames) return
  if (currentTime() >= ride.duration - 0.01) clock.time = 0
  await synth.resume()
  synth.reset(clock.time)
  clock.wall = performance.now()
  clock.playing = true
  $('play').textContent = '❚❚'
  $('play').classList.add('on')
}

function pause() {
  if (clock.playing) clock.time = clamp(currentTime(), 0, ride.duration)
  clock.playing = false
  synth.stopAll()
  $('play').textContent = ride.duration > 0 && clock.time >= ride.duration - 0.01 ? '↻' : '▶'
  $('play').classList.remove('on')
}

function stop() {
  pause()
  clock.time = 0
  synth.reset(0)
  updateTransport(0)
}

function seekTo(time) {
  clock.time = clamp(time, 0, ride.duration)
  clock.wall = performance.now()
  synth.reset(clock.time)
  updateTransport(clock.time)
}

function saveTrack() {
  if (!ride.lines.length) return
  const json = writeTrack({
    label: ride.title,
    creator: 'midiviz #043 editor',
    description:
      `Editable MIDI Line Rider track using 6.2 physics. Music starts at ${ride.leadIn.toFixed(2)} s.`,
    duration: Math.round(ride.duration * FPS),
    start: ride.start,
    velocity: ride.velocity,
    lines: ride.lines,
  })
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' })
  const anchor = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${ride.title.replace(/[^\w\- ]+/g, '').trim() || 'line-rider'}.track.json`,
  })
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
  editor.changed = false
}

canvas.addEventListener('pointerdown', event => {
  if (!ride.lines.length) return
  if (clock.playing) pause()
  canvas.setPointerCapture(event.pointerId)
  const screen = pointerPosition(event)
  const frame = ride.frames ? clamp(clock.time * FPS, 0, ride.frames.frames) : 0
  const camera = activeCamera(frame)
  const rawWorld = screenToWorld(screen, camera)
  const world = snapPoint(rawWorld, 5, $('snap').checked)
  const wantsPan = event.button === 1 || event.button === 2 || editor.spacePan || editor.tool === 'pan'
  if (wantsPan) {
    $('follow').checked = false
    if (editor.spacePan) editor.spacePanUsed = true
    editor.gesture = {
      kind: 'pan',
      screen,
      camera: { x: view.x, y: view.y },
      zoom: camera.zoom,
    }
    canvas.style.cursor = 'grabbing'
    event.preventDefault()
    return
  }
  if (editor.tool === 'erase') {
    const hit = hitTestLine(ride.lines, rawWorld, 9 / camera.zoom)
    if (hit) {
      const before = copyLines(ride.lines)
      ride.lines.splice(hit.index, 1)
      setSelected(null)
      finishEdit(before)
    }
    return
  }
  if (editor.tool === 'select') {
    const hit = hitTestLine(ride.lines, rawWorld, 9 / camera.zoom)
    if (!hit) {
      setSelected(null)
      return
    }
    setSelected(hit.index)
    const endpoint = endpointAt(hit.line, rawWorld, 10 / camera.zoom)
    const before = copyLines(ride.lines)
    if (endpoint) {
      const line = ride.lines[hit.index]
      editor.gesture = {
        kind: 'move-endpoint',
        before,
        handles: connectedEndpoints(ride.lines, hit.index, endpoint),
        start: endpoint === 'start'
          ? { x: line.x1, y: line.y1 }
          : { x: line.x2, y: line.y2 },
        moved: false,
      }
    } else {
      editor.gesture = {
        kind: 'move-line',
        before,
        start: world,
        original: { ...hit.line },
        index: hit.index,
        moved: false,
      }
    }
    return
  }
  if (editor.tool === 'pencil') {
    editor.gesture = { kind: 'draw-pencil', points: [rawWorld] }
    return
  }
  if (editor.tool === 'line') {
    editor.gesture = { kind: 'draw-line', start: world, current: world }
    return
  }
  if (editor.tool === 'loop') {
    editor.gesture = { kind: 'draw-loop', start: world, current: world }
  }
})

canvas.addEventListener('pointermove', event => {
  const gesture = editor.gesture
  if (!gesture) return
  const screen = pointerPosition(event)
  if (gesture.kind === 'pan') {
    view.x = gesture.camera.x - (screen.x - gesture.screen.x) / gesture.zoom
    view.y = gesture.camera.y - (screen.y - gesture.screen.y) / gesture.zoom
    return
  }
  const frame = ride.frames ? clamp(clock.time * FPS, 0, ride.frames.frames) : 0
  const camera = activeCamera(frame)
  const rawWorld = screenToWorld(screen, camera)
  const world = snapPoint(rawWorld, 5, $('snap').checked)
  if (gesture.kind === 'move-endpoint') {
    gesture.moved ||= Math.hypot(world.x - gesture.start.x, world.y - gesture.start.y) > 1e-6
    moveEndpoints(ride.lines, gesture.handles, world)
  } else if (gesture.kind === 'move-line') {
    const dx = world.x - gesture.start.x
    const dy = world.y - gesture.start.y
    gesture.moved ||= Math.hypot(dx, dy) > 1e-6
    const line = ride.lines[gesture.index]
    Object.assign(line, {
      x1: gesture.original.x1 + dx,
      y1: gesture.original.y1 + dy,
      x2: gesture.original.x2 + dx,
      y2: gesture.original.y2 + dy,
    })
  } else if (gesture.kind === 'draw-pencil') {
    const previous = gesture.points.at(-1)
    if (Math.hypot(rawWorld.x - previous.x, rawWorld.y - previous.y) > 1.5 / camera.zoom) {
      gesture.points.push(rawWorld)
    }
  } else {
    gesture.current = world
  }
})

function finishPointer(event) {
  const gesture = editor.gesture
  if (!gesture) return
  editor.gesture = null
  try { canvas.releasePointerCapture(event.pointerId) } catch {}
  canvas.style.cursor = editor.tool === 'pan' ? 'grab' : editor.tool === 'select' ? 'default' : 'crosshair'
  if (gesture.kind === 'pan') return
  if (gesture.kind === 'move-endpoint' || gesture.kind === 'move-line') {
    if (gesture.moved) finishEdit(gesture.before)
    return
  }
  const id = nextLineId(ride.lines)
  const type = Number($('lineType').value)
  const options = {
    id,
    type,
    flipped: editor.newFlipped,
  }
  let additions = []
  if (gesture.kind === 'draw-pencil') {
    additions = strokeToLines(gesture.points, {
      ...options,
      tolerance: 0.8 / zoomAmount(),
      minLength: 1,
    })
  } else if (gesture.kind === 'draw-line') {
    if (Math.hypot(gesture.current.x - gesture.start.x, gesture.current.y - gesture.start.y) > 1) {
      additions = [makeLine(id, gesture.start, gesture.current, type, {
        flipped: editor.newFlipped,
        leftExtended: editor.newLeftExtended,
        rightExtended: editor.newRightExtended,
      })]
    }
  } else if (gesture.kind === 'draw-loop') {
    additions = loopToLines(gesture.start, gesture.current, options)
  }
  if (!additions.length) return
  const before = copyLines(ride.lines)
  ride.lines.push(...additions)
  setSelected(ride.lines.length - additions.length)
  finishEdit(before)
}

canvas.addEventListener('pointerup', finishPointer)
canvas.addEventListener('pointercancel', finishPointer)
canvas.addEventListener('contextmenu', event => event.preventDefault())
canvas.addEventListener('wheel', event => {
  event.preventDefault()
  const oldZoom = zoomAmount()
  const frame = ride.frames ? clamp(clock.time * FPS, 0, ride.frames.frames) : 0
  const camera = activeCamera(frame)
  const screen = pointerPosition(event)
  const anchor = screenToWorld(screen, camera)
  const value = clamp(Number($('zoom').value) * Math.exp(-event.deltaY * 0.001), 0.5, 5)
  $('zoom').value = value
  $('zoom').dispatchEvent(new Event('input'))
  const newZoom = zoomAmount()
  if (!$('follow').checked && Math.abs(newZoom - oldZoom) > 1e-6) {
    view.x = anchor.x - (screen.x - innerWidth / 2) / newZoom
    view.y = anchor.y - (screen.y - innerHeight / 2) / newZoom
  }
}, { passive: false })

$('play').addEventListener('click', () => clock.playing ? pause() : play())
$('stop').addEventListener('click', stop)
$('seek').addEventListener('input', () => seekTo(Number($('seek').value) * ride.duration))
$('open').addEventListener('click', () => $('file').click())
$('file').addEventListener('change', () => {
  const file = $('file').files?.[0]
  if (file) loadFile(file)
  $('file').value = ''
})
$('save').addEventListener('click', saveTrack)
$('generate').addEventListener('click', generate)
$('simulate').addEventListener('click', () => resimulate())
$('undo').addEventListener('click', undo)
$('redo').addEventListener('click', redo)
$('deleteLine').addEventListener('click', deleteSelected)
$('toggle').addEventListener('click', () => {
  const collapsed = $('panel').classList.toggle('collapsed')
  $('toggle').textContent = collapsed ? '+' : '–'
})

for (const button of document.querySelectorAll('[data-tool]')) {
  button.addEventListener('click', () => chooseTool(button.dataset.tool))
}

$('lineType').addEventListener('change', () => {
  if (syncingProperties) return
  editSelected(line => {
    line.type = Number($('lineType').value)
    if (line.type === SCENERY) line.width ??= 1
  })
})

$('flip').addEventListener('click', () => {
  if (!editSelected(line => { line.flipped = !line.flipped })) {
    editor.newFlipped = !editor.newFlipped
    $('flip').classList.toggle('on', editor.newFlipped)
  }
})

for (const [id, property] of [['leftExtended', 'leftExtended'], ['rightExtended', 'rightExtended']]) {
  $(id).addEventListener('change', () => {
    if (syncingProperties) return
    if (!editSelected(line => { line[property] = $(id).checked })) {
      if (property === 'leftExtended') editor.newLeftExtended = $(id).checked
      if (property === 'rightExtended') editor.newRightExtended = $(id).checked
    }
  })
}

$('zoom').addEventListener('input', () => {
  $('zoomValue').textContent = `${Number($('zoom').value).toFixed(2)}×`
})

function setupRangePair(lowId, highId, outputId, format) {
  const low = $(lowId)
  const high = $(highId)
  const update = changed => {
    if (Number(low.value) > Number(high.value)) {
      if (changed === low) high.value = low.value
      else low.value = high.value
    }
    $(outputId).textContent = format(Number(low.value), Number(high.value))
  }
  low.addEventListener('input', () => update(low))
  high.addEventListener('input', () => update(high))
  update()
}

setupRangePair('rateLow', 'rateHigh', 'rateValue', (low, high) => `${low.toFixed(2)}–${high.toFixed(2)}/s`)
setupRangePair('gapLow', 'gapHigh', 'gapValue', (low, high) => `${low.toFixed(2)}–${high.toFixed(2)} s`)
setupRangePair('paceLow', 'paceHigh', 'paceValue', (low, high) => `${low.toFixed(1)}–${high.toFixed(1)}`)
setupRangePair('phraseLow', 'phraseHigh', 'phraseValue', (low, high) => `${low}–${high} bars`)
$('pitch').addEventListener('input', () => { $('pitchValue').textContent = `${$('pitch').value} px` })
const updateAngles = () => {
  $('angleValue').textContent = `↑${$('upAngle').value}° ↓${$('downAngle').value}°`
}
$('upAngle').addEventListener('input', updateAngles)
$('downAngle').addEventListener('input', updateAngles)
for (const id of ['zoom', 'pitch']) $(id).dispatchEvent(new Event('input'))
updateAngles()

addEventListener('dragover', event => {
  event.preventDefault()
  document.body.classList.add('dragging')
})
addEventListener('dragleave', event => {
  if (!event.relatedTarget) document.body.classList.remove('dragging')
})
addEventListener('drop', event => {
  event.preventDefault()
  document.body.classList.remove('dragging')
  const file = event.dataTransfer.files?.[0]
  if (file) loadFile(file)
})

addEventListener('keydown', event => {
  if (event.target.closest?.('input, select')) return
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
    return
  }
  if (event.code === 'Space') {
    if (event.repeat) return
    event.preventDefault()
    editor.spacePan = true
    editor.spacePanUsed = false
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelected()
    return
  }
  const tools = { v: 'select', p: 'pencil', l: 'line', o: 'loop', e: 'erase', h: 'pan' }
  const tool = tools[event.key.toLowerCase()]
  if (tool) chooseTool(tool)
  if (event.key === 'Escape') setSelected(null)
})

addEventListener('keyup', event => {
  if (event.code !== 'Space') return
  const shouldPlay = editor.spacePan && !editor.spacePanUsed && !editor.gesture
  editor.spacePan = false
  editor.spacePanUsed = false
  if (shouldPlay) {
    clock.playing ? pause() : play()
  }
})

addEventListener('resize', resize)
window.lineRiderEditor = { song, ride, clock, editor, generate, resimulate, seekTo }
requestAnimationFrame(render)
loadDefaultMidi()

