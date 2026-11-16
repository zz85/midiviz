const MAGIC = new TextEncoder().encode('MDVBAKE1')
const FORMAT = 'midiviz-duo-motion'
const VERSION = 1
const COMPONENTS = Object.freeze({ transform7f: 7, scalar1f: 1, points3f: 3, morph1f: 1 })
const DEFAULT_LIMITS = Object.freeze({
  compressedBytes: 256 * 1024 * 1024,
  uncompressedBytes: 1024 * 1024 * 1024,
  headerBytes: 4 * 1024 * 1024,
  tracks: 128,
  namesPerTrack: 4096,
  frames: 4 * 60 * 60 * 240 + 1,
})

const align8 = n => (n + 7) & ~7
const asBytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null
const fail = message => { throw new Error(`.duobake: ${message}`) }

function limitsOf(given = {}) { return { ...DEFAULT_LIMITS, ...given } }
function integer(value, name, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) fail(`${name} must be an integer >= ${min}`)
  return value
}
function digest(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail(`${name} must be 64 lowercase hex digits`)
  return value
}
function text(value, name) {
  if (typeof value !== 'string' || !value.length) fail(`${name} must be a non-empty string`)
  return value
}
function checkedProduct(values, name) {
  let out = 1
  for (const value of values) {
    integer(value, name)
    out *= value
    if (!Number.isSafeInteger(out)) fail(`${name} is too large`)
  }
  return out
}

export async function sha256Hex(value) {
  const bytes = asBytes(value) || new TextEncoder().encode(String(value))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('')
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
}

export async function cacheKey(value) { return sha256Hex(canonical(value)) }

function validateTimeline(timeline, limits) {
  if (!timeline || typeof timeline !== 'object') fail('timeline is required')
  const rate = integer(timeline.rate, 'timeline.rate', 1)
  const startTick = timeline.startTick
  const endTick = timeline.endTick
  if (!Number.isSafeInteger(startTick) || !Number.isSafeInteger(endTick) || endTick < startTick) fail('timeline ticks are invalid')
  const frameCount = integer(timeline.frameCount, 'timeline.frameCount', 1)
  if (frameCount !== endTick - startTick + 1) fail('timeline.frameCount does not match its inclusive ticks')
  if (frameCount > limits.frames) fail(`timeline exceeds the ${limits.frames}-frame limit`)
  return { rate, origin: timeline.origin || 'music-start', startTick, endTick, frameCount }
}

function validateSource(source) {
  if (!source || typeof source !== 'object') fail('source is required')
  text(source.kind, 'source.kind')
  digest(source.sha256, 'source.sha256')
  digest(source.selectionSha256, 'source.selectionSha256')
  return { ...source }
}

function validateBundles(bundles, trackIds) {
  if (!Array.isArray(bundles) || !bundles.length) fail('at least one bundle is required')
  const ids = new Set()
  return bundles.map((bundle, index) => {
    if (!bundle || typeof bundle !== 'object') fail(`bundles[${index}] is invalid`)
    const id = text(bundle.id, `bundles[${index}].id`)
    if (ids.has(id)) fail(`duplicate bundle ${id}`)
    ids.add(id)
    digest(bundle.cacheKey, `bundle ${id} cacheKey`)
    digest(bundle.bindingSha256, `bundle ${id} bindingSha256`)
    if (!Array.isArray(bundle.requiredTracks) || !bundle.requiredTracks.length) fail(`bundle ${id} has no requiredTracks`)
    const requiredTracks = [...new Set(bundle.requiredTracks.map((track, i) => text(track, `bundle ${id} requiredTracks[${i}]`)))]
    for (const track of requiredTracks) if (trackIds && !trackIds.has(track)) fail(`bundle ${id} requires missing track ${track}`)
    return { ...bundle, id, requiredTracks }
  })
}

function trackShape(track, timeline, limits, index) {
  if (!track || typeof track !== 'object') fail(`tracks[${index}] is invalid`)
  const id = text(track.id, `tracks[${index}].id`)
  const bundle = text(track.bundle, `track ${id} bundle`)
  const type = text(track.type, `track ${id} type`)
  const components = COMPONENTS[type]
  if (!components) return { id, bundle, type, unknown: true }
  if (!Array.isArray(track.names) || !track.names.length || track.names.length > limits.namesPerTrack) fail(`track ${id} has an invalid names list`)
  const names = track.names.map((name, i) => text(name, `track ${id} names[${i}]`))
  if (new Set(names).size !== names.length) fail(`track ${id} has duplicate names`)
  const values = checkedProduct([timeline.frameCount, names.length, components], `track ${id} value count`)
  const byteLength = checkedProduct([values, 4], `track ${id} byte length`)
  return { id, bundle, type, components, names, values, byteLength }
}

async function gzip(bytes) {
  if (typeof CompressionStream !== 'function') fail('gzip compression is unavailable')
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes, limit) {
  if (typeof DecompressionStream !== 'function') fail('gzip decompression is unavailable')
  let stream
  try { stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')) }
  catch (error) { fail(`cannot start gzip decompression: ${error.message}`) }
  const reader = stream.getReader(), chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) { await reader.cancel(); fail(`uncompressed data exceeds the ${limit}-byte limit`) }
      chunks.push(value)
    }
  } catch (error) {
    if (/^\.duobake:/.test(error.message)) throw error
    fail(`invalid gzip stream: ${error.message}`)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
  return out
}

function isGzip(bytes) { return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b }

export async function encodeDuobake({ timeline: inputTimeline, source, bundles, tracks, generator = 'midiviz-038', created = new Date().toISOString() }, options = {}) {
  const limits = limitsOf(options.limits)
  const timeline = validateTimeline(inputTimeline, limits)
  if (!Array.isArray(tracks) || !tracks.length || tracks.length > limits.tracks) fail(`tracks must contain 1-${limits.tracks} entries`)
  const ids = new Set(), prepared = []
  for (let i = 0; i < tracks.length; i++) {
    const shape = trackShape(tracks[i], timeline, limits, i)
    if (shape.unknown) fail(`track ${shape.id} has unsupported type ${shape.type}`)
    if (ids.has(shape.id)) fail(`duplicate track ${shape.id}`)
    ids.add(shape.id)
    const data = tracks[i].data
    if (!(data instanceof Float32Array) || data.length !== shape.values) fail(`track ${shape.id} needs ${shape.values} float32 values`)
    for (const value of data) if (!Number.isFinite(value)) fail(`track ${shape.id} contains a non-finite value`)
    prepared.push({ ...shape, data })
  }
  const cleanSource = validateSource(source)
  const cleanBundles = validateBundles(bundles, ids)
  const bundleIds = new Set(cleanBundles.map(bundle => bundle.id))
  for (const track of prepared) if (!bundleIds.has(track.bundle)) fail(`track ${track.id} refers to unknown bundle ${track.bundle}`)

  let payloadSize = 0
  for (const track of prepared) { track.offset = align8(payloadSize); payloadSize = track.offset + track.byteLength }
  if (payloadSize > limits.uncompressedBytes) fail(`payload exceeds the ${limits.uncompressedBytes}-byte limit`)
  const payload = new Uint8Array(payloadSize)
  const trackHeaders = []
  for (const track of prepared) {
    const bytes = new Uint8Array(track.data.buffer, track.data.byteOffset, track.data.byteLength)
    payload.set(bytes, track.offset)
    trackHeaders.push({ id: track.id, bundle: track.bundle, type: track.type, names: track.names, offset: track.offset, byteLength: track.byteLength, sha256: await sha256Hex(bytes) })
  }
  const header = {
    format: FORMAT, version: VERSION, generator: text(generator, 'generator'), created: text(created, 'created'), timeline,
    source: cleanSource, bundles: cleanBundles, tracks: trackHeaders,
    payloadSha256: await sha256Hex(payload),
  }
  const headerBytes = new TextEncoder().encode(JSON.stringify(header))
  if (headerBytes.byteLength > limits.headerBytes) fail(`header exceeds the ${limits.headerBytes}-byte limit`)
  const payloadAt = align8(12 + headerBytes.byteLength)
  const raw = new Uint8Array(payloadAt + payload.byteLength)
  raw.set(MAGIC, 0)
  new DataView(raw.buffer).setUint32(8, headerBytes.byteLength, true)
  raw.set(headerBytes, 12)
  raw.set(payload, payloadAt)
  if (raw.byteLength > limits.uncompressedBytes) fail(`container exceeds the ${limits.uncompressedBytes}-byte limit`)
  const bytes = options.gzip === false ? raw : await gzip(raw)
  if (bytes.byteLength > limits.compressedBytes) fail(`compressed file exceeds the ${limits.compressedBytes}-byte limit`)
  return { bytes, header }
}

export async function decodeDuobake(input, options = {}) {
  const limits = limitsOf(options.limits)
  let bytes = asBytes(input)
  if (!bytes) fail('input must be an ArrayBuffer or byte view')
  if (bytes.byteLength > limits.compressedBytes) fail(`input exceeds the ${limits.compressedBytes}-byte limit`)
  bytes = isGzip(bytes) ? await gunzip(bytes, limits.uncompressedBytes) : new Uint8Array(bytes)
  if (bytes.byteLength < 12) fail('container is truncated')
  for (let i = 0; i < MAGIC.length; i++) if (bytes[i] !== MAGIC[i]) fail('bad magic')
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true)
  if (headerLength > limits.headerBytes) fail(`header exceeds the ${limits.headerBytes}-byte limit`)
  if (12 + headerLength > bytes.byteLength) fail('header is truncated')
  let header
  try { header = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(12, 12 + headerLength))) }
  catch (error) { fail(`invalid JSON header: ${error.message}`) }
  if (header.format !== FORMAT) fail(`unsupported format ${header.format}`)
  if (header.version !== VERSION) fail(`unsupported version ${header.version}`)
  const timeline = validateTimeline(header.timeline, limits)
  const source = validateSource(header.source)
  if (!Array.isArray(header.tracks) || !header.tracks.length || header.tracks.length > limits.tracks) fail(`tracks must contain 1-${limits.tracks} entries`)
  const trackIds = new Set(header.tracks.map(track => track?.id))
  const bundles = validateBundles(header.bundles, trackIds)
  const required = new Set(bundles.flatMap(bundle => bundle.requiredTracks))
  const payloadAt = align8(12 + headerLength)
  if (payloadAt > bytes.byteLength) fail('payload is truncated')
  const payload = bytes.subarray(payloadAt)
  digest(header.payloadSha256, 'payloadSha256')
  if (await sha256Hex(payload) !== header.payloadSha256) fail('payload digest does not match')
  const bundleIds = new Set(bundles.map(bundle => bundle.id)), ids = new Set(), ranges = [], tracks = []
  for (let i = 0; i < header.tracks.length; i++) {
    const track = header.tracks[i]
    const shape = trackShape(track, timeline, limits, i)
    if (ids.has(shape.id)) fail(`duplicate track ${shape.id}`)
    ids.add(shape.id)
    if (!bundleIds.has(shape.bundle)) fail(`track ${shape.id} refers to unknown bundle ${shape.bundle}`)
    if (shape.unknown) {
      if (required.has(shape.id)) fail(`required track ${shape.id} has unsupported type ${shape.type}`)
      continue
    }
    const offset = integer(track.offset, `track ${shape.id} offset`)
    const byteLength = integer(track.byteLength, `track ${shape.id} byteLength`)
    if (offset % 8) fail(`track ${shape.id} offset is not 8-byte aligned`)
    if (byteLength !== shape.byteLength) fail(`track ${shape.id} byteLength does not match its shape`)
    if (offset + byteLength > payload.byteLength) fail(`track ${shape.id} is truncated`)
    ranges.push({ id: shape.id, from: offset, to: offset + byteLength })
    digest(track.sha256, `track ${shape.id} sha256`)
    const trackBytes = payload.subarray(offset, offset + byteLength)
    if (await sha256Hex(trackBytes) !== track.sha256) fail(`track ${shape.id} digest does not match`)
    const copy = trackBytes.slice()
    const data = new Float32Array(copy.buffer)
    for (const value of data) if (!Number.isFinite(value)) fail(`track ${shape.id} contains a non-finite value`)
    tracks.push({ id: shape.id, bundle: shape.bundle, type: shape.type, names: shape.names, data })
  }
  ranges.sort((a, b) => a.from - b.from)
  for (let i = 1; i < ranges.length; i++) if (ranges[i].from < ranges[i - 1].to) fail(`tracks ${ranges[i - 1].id} and ${ranges[i].id} overlap`)
  for (const id of required) if (!ids.has(id)) fail(`required track ${id} is missing`)
  return { header: { ...header, timeline, source, bundles }, tracks, bytes }
}

export const DUOBAKE = Object.freeze({ format: FORMAT, version: VERSION, magic: 'MDVBAKE1', components: COMPONENTS, limits: DEFAULT_LIMITS })
