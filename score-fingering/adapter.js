// ScoreShift score model -> immutable string-fingering inputs and page annotations.
// Pure ES module: browser and Node.
import { timeline, DIV } from './scoreshift/score.js'
import { midiOf } from './scoreshift/theory.js'
import { suggestFingerings, INSTRUMENTS, fingerLabel } from '../strings/fingering.js'

const round = value => Math.round(value * 10) / 10
const SOURCE_IDS = new WeakMap()

/** Stable for the lifetime of a recognized page and independent of pitch corrections. */
export function sourceNoteId(note) {
  if (SOURCE_IDS.has(note)) return SOURCE_IDS.get(note)
  if (!note?.st || !Number.isInteger(note.st.index) || !Number.isFinite(note.x) || !Number.isFinite(note.y)) throw new TypeError('source note needs staff index and finite x/y coordinates')
  const originalY = Array.isArray(note.box) && Number.isFinite(note.box[1]) && Number.isFinite(note.box[3]) ? (note.box[1] + note.box[3]) / 2 : note.y
  const component = Number.isInteger(note.comp) ? `${note.comp}:` : ''
  const id = `${note.st.index}:${component}${round(note.x)}:${round(originalY)}`
  SOURCE_IDS.set(note, id)
  return id
}

/**
 * Convert one ScoreShift part to solver notes while retaining each source symbol.
 * quarterSeconds controls the solver's tempo-sensitive costs (default 120 bpm).
 */
export function buildFingeringInput(score, partIndex = 0, { locks = new Map(), quarterSeconds = 0.5 } = {}) {
  if (!score?.parts || !score.parts[partIndex]) throw new RangeError(`score has no part ${partIndex}`)
  if (!(locks instanceof Map)) throw new TypeError('locks must be a Map of source note id to string index')
  if (!Number.isFinite(quarterSeconds) || quarterSeconds <= 0) throw new TypeError('quarterSeconds must be positive')
  const entries = timeline(score.parts[partIndex]), used = new Map(), records = []
  const graceOrder = new Map(), groups = new Map(), voiceOrdinal = new Map(), entryOrdinal = new Map()
  for (const entry of entries) {
    const ordinal = voiceOrdinal.get(entry.voice) || 0
    entryOrdinal.set(entry, ordinal); voiceOrdinal.set(entry.voice, ordinal + 1)
  }
  for (const entry of entries) if (entry.e.kind === 'note' && entry.e.grace) {
    const key = `${entry.voice}:${entry.tick}`
    groups.set(key, [...(groups.get(key) || []), entry])
  }
  for (const group of groups.values()) group.forEach((entry, index) => graceOrder.set(entry, { index, count:group.length }))
  // Keep ornaments perceptibly sequential even at the fastest UI tempo. Exact
  // score chords remain exactly simultaneous and use a much smaller solver tolerance.
  const graceStep = Math.min(0.08, Math.max(0.04, quarterSeconds / 8))
  for (const entry of entries) {
    const { e, tick, ticks, voice } = entry
    if (e.kind !== 'note' || e.removed) continue
    const grace = graceOrder.get(entry), beatOn = tick / DIV * quarterSeconds
    const eventOn = grace ? beatOn - graceStep * (grace.count - grace.index) : beatOn
    const eventDuration = grace ? graceStep * 0.9 : Math.max(1, ticks) / DIV * quarterSeconds
    for (const source of e.notes) {
      const base = sourceNoteId(source), count = used.get(base) || 0
      let id = base
      if (count) { id = `${base}:${count}`; SOURCE_IDS.set(source, id) }
      used.set(base, count + 1)
      records.push({
        source, id, voice, ordinal:entryOrdinal.get(entry), grace:!!grace, tie:!!source.tie,
        input:{ id, pitch:midiOf(source.pitch), on:eventOn, off:eventOn + eventDuration },
      })
    }
  }
  // A grace borrowed from the beat before it must not look like a second voice
  // sustaining underneath it. Trim only that immediately preceding overlap.
  for (const grace of records.filter(record => record.grace)) {
    const previous = records.filter(record => record.voice === grace.voice && !record.grace && record.input.on < grace.input.on && record.input.off > grace.input.on).pop()
    if (previous) previous.input.off = Math.max(previous.input.on + 0.001, grace.input.on - 0.001)
  }
  // ScoreShift marks a note that ties into the next equal pitch. Merge its
  // continuation for duration-sensitive costs and annotate the attack only.
  const merged = [], openTies = new Map()
  for (const record of records) {
    const key = `${record.voice}:${record.input.pitch}`
    let attack = openTies.get(key)
    if (attack && record.ordinal !== attack.lastOrdinal + 1) { openTies.delete(key); attack = null }
    if (attack) {
      attack.input.off = Math.max(attack.input.off, record.input.off)
      attack.sourceGroup.push(record.source)
      attack.lastOrdinal = record.ordinal
      const continuationLock = locks.get(record.id)
      if (attack.input.lockString == null && continuationLock != null) attack.input.lockString = continuationLock
      if (!record.tie) openTies.delete(key)
      continue
    }
    record.sourceGroup = [record.source]
    const lock = locks.get(record.id)
    if (lock != null) record.input.lockString = lock
    merged.push(record)
    if (record.tie) { record.lastOrdinal = record.ordinal; openTies.set(key, record) }
  }
  return {
    notes:merged.map(record => record.input),
    sources:merged.map(record => record.source),
    sourceGroups:merged.map(record => record.sourceGroup),
    part:score.parts[partIndex],
  }
}

/** Build ranked fingerings for one recognized part. */
export function planFingering(score, partIndex = 0, options = {}) {
  const { locks = new Map(), quarterSeconds = 0.5, ...solver } = options
  const input = buildFingeringInput(score, partIndex, { locks, quarterSeconds })
  const result = suggestFingerings(input.notes, { chordTolerance:0.001, ...solver })
  return { ...result, notes:input.notes, sources:input.sources, sourceGroups:input.sourceGroups, part:input.part, instrument:solver.instrument || 'violin' }
}

/** Drawing-independent annotation descriptors for one ranked suggestion. */
export function annotationItems(plan, suggestionIndex = 0, { instrument = plan.instrument || 'violin' } = {}) {
  const suggestion = plan?.suggestions?.[suggestionIndex]
  if (!suggestion) throw new RangeError(`plan has no suggestion ${suggestionIndex}`)
  const profile = typeof instrument === 'object' ? instrument : INSTRUMENTS[instrument]
  if (!profile) throw new RangeError(`unknown instrument "${instrument}"`)
  let previous = null
  return suggestion.assignments.map((assignment, index) => {
    const source = plan.sources[index], input = plan.notes[index]
    if (!source) throw new RangeError(`missing source note ${index}`)
    const playable = assignment.playable
    const showString = playable && (!previous || previous.string !== assignment.string || Math.abs(input.on - previous.on) < 1e-9)
    const showPosition = playable && assignment.finger > 0 && (!previous || previous.finger === 0 || previous.base !== assignment.base || previous.thumb !== assignment.thumb)
    const labelY = source.y + (source.stem && source.stem.dir < 0 ? 20 : -18)
    const warnings = (plan.diagnostics || []).filter(diagnostic => diagnostic.index === index)
    const item = {
      index, id: input.id, source, x: source.x, y: source.y, labelX:source.x, labelY, playable,
      fingerLabel: playable ? fingerLabel(assignment.finger) : '×',
      stringLabel: playable ? profile.strings[assignment.string] : '',
      positionLabel: playable && assignment.finger > 0 ? assignment.position : '',
      showString, showPosition, locked: input.lockString != null, warnings,
      assignment,
    }
    if (playable) previous = { ...assignment, on: input.on }
    return item
  })
}

/** Nearest annotation in normalized ScoreShift coordinates. */
export function hitAnnotation(items, x, y, radius = 16) {
  let best = null, distance = radius
  for (const item of items) {
    const d = Math.min(Math.hypot(item.x - x, item.y - y), Math.hypot(item.labelX - x, item.labelY - y))
    if (d <= distance) { distance = d; best = item }
  }
  return best
}
