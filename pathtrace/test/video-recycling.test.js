// bun test pathtrace/test/video-recycling.test.js
// Tracer lifecycle only: scene conversion, rendering and post-processing are mocked.
import { afterAll, beforeAll, beforeEach, expect, mock, spyOn, test } from 'bun:test'

let created, disposed, snapshotsDisposed, cachesDisposed

mock.module('../snapshot.js', () => ({
  snapshotScene: () => ({ scene: {}, stats: { ms: 0 } }),
  snapshotCamera: () => ({}),
  bakeEnvironment: () => ({}),
  disposeSnapshot: () => { snapshotsDisposed++ },
  createSnapshotCache: () => ({ dispose: () => { cachesDisposed++ } }),
}))

mock.module('../engines.js', () => ({
  lensFromBokeh: () => null,
  createTraceSession: async () => {
    const session = {
      frame: async () => ({ canvas: {}, times: { setup: 0, trace: 0 } }),
      dispose: () => { disposed.push(session) },
    }
    created.push(session)
    return session
  },
}))

mock.module('../post.js', () => ({
  HDR_SCALE: 8,
  finishTrace: canvas => ({ fx: canvas }),
}))

const { DEFAULT_RECYCLE_EVERY, pathTracedFrames } = await import('../video.js')
const stage = {
  scene: {}, camera: {}, envScene: null,
  hair: () => null,
  liveExposure: () => 1,
  fx: () => ({}),
}
const options = { engine: 'test', width: 16, height: 9, samples: 1, bounces: 1, denoise: false }
const render = async (source, count) => { for (let i = 0; i < count; i++) await source.frame() }

let log
beforeAll(() => { log = spyOn(console, 'log').mockImplementation(() => {}) })
afterAll(() => log.mockRestore())
beforeEach(() => { created = []; disposed = []; snapshotsDisposed = 0; cachesDisposed = 0 })

test('the default keeps current 24-frame recycling behavior', async () => {
  expect(DEFAULT_RECYCLE_EVERY).toBe(24)
  const source = pathTracedFrames(stage, options)
  await render(source, 24)
  expect(created).toHaveLength(1)
  expect(disposed).toHaveLength(0)

  await source.frame()
  expect(created).toHaveLength(2)
  expect(disposed).toEqual([created[0]])
  expect(snapshotsDisposed).toBe(25)

  source.dispose()
  expect(disposed).toEqual(created)
  expect(cachesDisposed).toBe(1)
})

test('a custom interval recycles after that many frames', async () => {
  const source = pathTracedFrames(stage, { ...options, recycleEvery: 2 })
  await render(source, 5)
  expect(created).toHaveLength(3)
  expect(disposed).toEqual(created.slice(0, 2))
  source.dispose()
  expect(disposed).toEqual(created)
})

test('zero keeps one tracer until the frame source is disposed', async () => {
  const source = pathTracedFrames(stage, { ...options, recycleEvery: 0 })
  await render(source, DEFAULT_RECYCLE_EVERY + 1)
  expect(created).toHaveLength(1)
  expect(disposed).toHaveLength(0)
  source.dispose()
  expect(disposed).toEqual(created)
})

test.each([-1, 1.5, NaN, Infinity])('rejects invalid recycleEvery value %p', recycleEvery => {
  expect(() => pathTracedFrames(stage, { ...options, recycleEvery })).toThrow('recycleEvery must be a non-negative integer')
})
