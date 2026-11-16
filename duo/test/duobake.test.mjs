// node --test duo/test/duobake.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cacheKey, decodeDuobake, DUOBAKE, encodeDuobake, sha256Hex } from '../duobake.js'

const HEX_A = 'a'.repeat(64), HEX_B = 'b'.repeat(64)
const timeline = { rate: 120, origin: 'music-start', startTick: -1, endTick: 2, frameCount: 4 }
const bundle = (requiredTracks = ['pose']) => ({ id: 'violinist', cacheKey: HEX_A, bindingSha256: HEX_B, requiredTracks })
const pose = () => ({
  id: 'pose', bundle: 'violinist', type: 'transform7f', names: ['root'],
  data: new Float32Array([
    0, 1, 2, 0, 0, 0, 1,
    3, 4, 5, 0, 0, 0.38268343, 0.9238795,
    6, 7, 8, 0, 0, 0.70710677, 0.70710677,
    9, 10, 11, 0, 0, 0.9238795, 0.38268343,
  ]),
})

async function encoded(extra = {}, options = {}) {
  return encodeDuobake({ timeline, source: { kind: 'score', sha256: HEX_A, selectionSha256: HEX_B }, bundles: [bundle()], tracks: [pose()], generator: 'test', created: '2026-11-14T00:00:00Z', ...extra }, options)
}

function headerOf(raw) {
  const length = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getUint32(8, true)
  return { length, text: new TextDecoder().decode(raw.subarray(12, 12 + length)) }
}

function replaceHeader(raw, from, to) {
  assert.equal(from.length, to.length, 'header mutation must preserve byte length')
  const { length, text } = headerOf(raw)
  const changed = text.replace(from, to)
  assert.notEqual(changed, text)
  const copy = raw.slice()
  copy.set(new TextEncoder().encode(changed), 12)
  assert.equal(new TextEncoder().encode(changed).byteLength, length)
  return copy
}

test('version 1 gzip round trip preserves metadata and float32 tracks', async () => {
  const { bytes, header } = await encoded()
  assert.equal(bytes[0], 0x1f)
  assert.equal(bytes[1], 0x8b)
  assert.equal(header.format, DUOBAKE.format)
  assert.equal(header.version, 1)
  assert.equal(header.tracks[0].offset, 0)
  assert.equal(header.tracks[0].byteLength, 4 * 7 * 4)
  const decoded = await decodeDuobake(bytes)
  assert.deepEqual(decoded.header.timeline, timeline)
  assert.deepEqual(decoded.header.bundles, [bundle()])
  assert.deepEqual([...decoded.tracks[0].data], [...pose().data])
})

test('raw container has the documented magic, little-endian header length and aligned payload', async () => {
  const { bytes, header } = await encoded({}, { gzip: false })
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 8)), 'MDVBAKE1')
  const { length, text } = headerOf(bytes)
  assert.deepEqual(JSON.parse(text), header)
  const payloadAt = (12 + length + 7) & ~7
  assert.equal(payloadAt % 8, 0)
  assert.equal(bytes.byteLength - payloadAt, header.tracks[0].byteLength)
  assert.deepEqual([...new Float32Array(bytes.slice(payloadAt).buffer)], [...pose().data])
})

test('cache keys use recursively canonical object-key order', async () => {
  const a = await cacheKey({ z: [3, { b: 2, a: 1 }], a: 'x' })
  const b = await cacheKey({ a: 'x', z: [3, { a: 1, b: 2 }] })
  assert.equal(a, b)
  assert.equal(a, await sha256Hex('{"a":"x","z":[3,{"a":1,"b":2}]}'))
})

test('encoder rejects invalid timelines, shapes, non-finite values and missing required tracks', async () => {
  await assert.rejects(() => encoded({ timeline: { ...timeline, frameCount: 3 } }), /frameCount/)
  await assert.rejects(() => encoded({ tracks: [{ ...pose(), data: new Float32Array(3) }] }), /needs 28 float32/)
  const bad = pose(); bad.data[0] = NaN
  await assert.rejects(() => encoded({ tracks: [bad] }), /non-finite/)
  await assert.rejects(() => encoded({ bundles: [bundle(['missing'])] }), /requires missing track/)
  await assert.rejects(() => encoded({ source: { kind: 'score', sha256: HEX_A } }), /selectionSha256/)
})

test('decoder rejects damaged, truncated and over-limit files', async () => {
  const { bytes: raw } = await encoded({}, { gzip: false })
  const payloadAt = (12 + headerOf(raw).length + 7) & ~7
  const damaged = raw.slice(); damaged[payloadAt] ^= 1
  await assert.rejects(() => decodeDuobake(damaged), /payload digest/)
  await assert.rejects(() => decodeDuobake(raw.subarray(0, raw.length - 1)), /payload digest|truncated/)
  await assert.rejects(() => decodeDuobake(raw, { limits: { compressedBytes: raw.length - 1 } }), /input exceeds/)
  const badMagic = raw.slice(); badMagic[0] = 0
  await assert.rejects(() => decodeDuobake(badMagic), /bad magic/)
})

test('unknown optional tracks are ignored but unknown required tracks fail closed', async () => {
  const aux = { id: 'aux1', bundle: 'violinist', type: 'scalar1f', names: ['x'], data: new Float32Array([1, 2, 3, 4]) }
  const { bytes: optionalRaw } = await encodeDuobake({ timeline, source: { kind: 'score', sha256: HEX_A, selectionSha256: HEX_B }, bundles: [bundle()], tracks: [pose(), aux], generator: 'test', created: '2026-11-14T00:00:00Z' }, { gzip: false })
  const optionalUnknown = replaceHeader(optionalRaw, '"type":"scalar1f"', '"type":"future01"')
  const decoded = await decodeDuobake(optionalUnknown)
  assert.deepEqual(decoded.tracks.map(track => track.id), ['pose'])

  const { bytes: requiredRaw } = await encodeDuobake({ timeline, source: { kind: 'score', sha256: HEX_A, selectionSha256: HEX_B }, bundles: [bundle(['pose', 'aux1'])], tracks: [pose(), aux], generator: 'test', created: '2026-11-14T00:00:00Z' }, { gzip: false })
  const requiredUnknown = replaceHeader(requiredRaw, '"type":"scalar1f"', '"type":"future01"')
  await assert.rejects(() => decodeDuobake(requiredUnknown), /required track aux1 has unsupported type/)
})

test('decoder rejects overlapping known tracks even when their bytes and digests are valid', async () => {
  const aux = { id: 'aux1', bundle: 'violinist', type: 'scalar1f', names: ['x'], data: new Float32Array([1, 2, 3, 4]) }
  const { bytes: raw } = await encodeDuobake({ timeline, source: { kind: 'score', sha256: HEX_A, selectionSha256: HEX_B }, bundles: [bundle()], tracks: [pose(), aux], generator: 'test', created: '2026-11-14T00:00:00Z' }, { gzip: false })
  const { length, text } = headerOf(raw)
  const header = JSON.parse(text)
  const second = header.tracks[1]
  const originalOffset = second.offset
  second.offset = 0
  const firstBytes = raw.subarray((12 + length + 7) & ~7, (12 + length + 7 & ~7) + second.byteLength)
  second.sha256 = await sha256Hex(firstBytes)
  const changed = JSON.stringify(header)
  // Offset shrinks the header. Rebuild through a same-length textual mutation instead.
  const from = `"offset":${originalOffset}`
  const to = `"offset":${String(0).padEnd(String(originalOffset).length, ' ')}`
  const overlap = replaceHeader(raw, from, to)
  const parsed = JSON.parse(headerOf(overlap).text)
  parsed.tracks[1].sha256 = await sha256Hex(raw.subarray((12 + length + 7) & ~7, ((12 + length + 7) & ~7) + second.byteLength))
  const digestFrom = JSON.parse(headerOf(overlap).text).tracks[1].sha256
  const digestTo = parsed.tracks[1].sha256
  const final = replaceHeader(overlap, digestFrom, digestTo)
  await assert.rejects(() => decodeDuobake(final), /overlap/)
})
