const COMPONENTS = Object.freeze({ transform7f: 7, scalar1f: 1, points3f: 3, morph1f: 1 })
const fail = message => { throw new Error(`motion bake: ${message}`) }

function timelineOf({ rate = 120, startTick = 0, endTick }) {
  if (!Number.isSafeInteger(rate) || rate <= 0) fail('rate must be a positive integer')
  if (!Number.isSafeInteger(startTick) || !Number.isSafeInteger(endTick) || endTick < startTick) fail('tick range is invalid')
  return { rate, origin: 'music-start', startTick, endTick, frameCount: endTick - startTick + 1 }
}

function validateBinding(binding, track) {
  if (!binding || binding.id !== track.id) fail(`no binding for track ${track.id}`)
  if (binding.type !== track.type) fail(`track ${track.id} type differs from its binding`)
  if (binding.names.length !== track.names.length || binding.names.some((name, i) => name !== track.names[i])) fail(`track ${track.id} names differ from its binding`)
}

export function transformBinding(id, bundle, entries) {
  if (!Array.isArray(entries) || !entries.length) fail(`${id} needs transform entries`)
  const names = entries.map((entry, i) => {
    if (!entry?.object?.position || !entry.object.quaternion) fail(`${id} entry ${i} is not transformable`)
    return String(entry.name)
  })
  if (new Set(names).size !== names.length) fail(`${id} has duplicate names`)
  return {
    id, bundle, type: 'transform7f', names,
    read(out, offset) {
      for (const { object } of entries) {
        const p = object.position, q = object.quaternion
        out[offset++] = p.x; out[offset++] = p.y; out[offset++] = p.z
        out[offset++] = q.x; out[offset++] = q.y; out[offset++] = q.z; out[offset++] = q.w
      }
    },
    write(values) {
      let offset = 0
      for (const { object } of entries) {
        object.position.set(values[offset++], values[offset++], values[offset++])
        object.quaternion.set(values[offset++], values[offset++], values[offset++], values[offset++])
        object.updateMatrix?.()
      }
    },
  }
}

export function scalarBinding(id, bundle, entries, type = 'scalar1f') {
  if (!['scalar1f', 'morph1f'].includes(type)) fail(`${id} has invalid scalar type`)
  if (!Array.isArray(entries) || !entries.length) fail(`${id} needs scalar entries`)
  const names = entries.map((entry, i) => {
    if (typeof entry?.get !== 'function' || typeof entry?.set !== 'function') fail(`${id} entry ${i} needs get and set`)
    return String(entry.name)
  })
  if (new Set(names).size !== names.length) fail(`${id} has duplicate names`)
  return {
    id, bundle, type, names,
    read(out, offset) { for (const entry of entries) out[offset++] = entry.get() },
    write(values) { for (let i = 0; i < entries.length; i++) entries[i].set(values[i]) },
  }
}

export function pointBinding(id, bundle, entries) {
  if (!Array.isArray(entries) || !entries.length) fail(`${id} needs point entries`)
  const names = entries.map((entry, i) => {
    if (typeof entry?.get !== 'function' || typeof entry?.set !== 'function') fail(`${id} entry ${i} needs get and set`)
    return String(entry.name)
  })
  return {
    id, bundle, type: 'points3f', names,
    read(out, offset) { for (const entry of entries) { const p = entry.get(); out[offset++] = p.x; out[offset++] = p.y; out[offset++] = p.z } },
    write(values) { for (let i = 0; i < entries.length; i++) entries[i].set(values[3 * i], values[3 * i + 1], values[3 * i + 2]) },
  }
}

export async function bakeFixedStep({ rate = 120, startTick = 0, endTick, bindings, step, onProgress, yieldEvery = 120, maxBytes = 512 * 1024 * 1024 }) {
  const timeline = timelineOf({ rate, startTick, endTick })
  if (!Array.isArray(bindings) || !bindings.length) fail('at least one binding is required')
  if (typeof step !== 'function') fail('step must be a function')
  let totalBytes = 0
  const tracks = bindings.map(binding => {
    const components = COMPONENTS[binding.type]
    if (!components || typeof binding.read !== 'function') fail(`binding ${binding.id} is invalid`)
    const values = timeline.frameCount * binding.names.length * components
    const bytes = values * 4
    if (!Number.isSafeInteger(values) || !Number.isSafeInteger(bytes)) fail(`binding ${binding.id} is too large`)
    totalBytes += bytes
    if (totalBytes > maxBytes) fail(`tracks exceed the ${maxBytes}-byte bake limit`)
    return { id: binding.id, bundle: binding.bundle, type: binding.type, names: [...binding.names], data: new Float32Array(values), binding, components }
  })
  const dt = 1 / rate
  for (let frame = 0; frame < timeline.frameCount; frame++) {
    const tick = startTick + frame
    const time = tick / rate
    const pending = step(time, dt, tick, frame)
    if (pending && typeof pending.then === 'function') await pending
    for (const track of tracks) track.binding.read(track.data, frame * track.names.length * track.components)
    onProgress?.({ frame: frame + 1, frameCount: timeline.frameCount, tick, time })
    if (yieldEvery > 0 && frame + 1 < timeline.frameCount && (frame + 1) % yieldEvery === 0) await new Promise(resolve => setTimeout(resolve, 0))
  }
  return { timeline, tracks: tracks.map(({ binding, components, ...track }) => track) }
}

function frameAt(timeline, time) {
  const f = time * timeline.rate - timeline.startTick
  if (f <= 0) return [0, 0, 0]
  if (f >= timeline.frameCount - 1) { const last = timeline.frameCount - 1; return [last, last, 0] }
  const a = Math.floor(f)
  return [a, a + 1, f - a]
}

function normalizedQuaternion(x, y, z, w) {
  const n = Math.hypot(x, y, z, w)
  return n > 1e-12 ? [x / n, y / n, z / n, w / n] : [0, 0, 0, 1]
}

function slerp(ax, ay, az, aw, bx, by, bz, bw, t) {
  ;[ax, ay, az, aw] = normalizedQuaternion(ax, ay, az, aw)
  ;[bx, by, bz, bw] = normalizedQuaternion(bx, by, bz, bw)
  let dot = ax * bx + ay * by + az * bz + aw * bw
  if (dot < 0) { dot = -dot; bx = -bx; by = -by; bz = -bz; bw = -bw }
  if (dot > 0.9995) return normalizedQuaternion(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, aw + (bw - aw) * t)
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)))
  const sin = Math.sin(theta), a = Math.sin((1 - t) * theta) / sin, b = Math.sin(t * theta) / sin
  return [a * ax + b * bx, a * ay + b * by, a * az + b * bz, a * aw + b * bw]
}

export function sampleTrack(track, timeline, time, out = new Float32Array(track.names.length * COMPONENTS[track.type])) {
  const components = COMPONENTS[track.type]
  if (!components) fail(`unsupported track type ${track.type}`)
  const [a, b, mix] = frameAt(timeline, time)
  const stride = track.names.length * components
  if (track.data.length !== timeline.frameCount * stride) fail(`track ${track.id} data length is invalid`)
  if (!mix || a === b) { out.set(track.data.subarray(a * stride, a * stride + stride)); return out }
  if (track.type !== 'transform7f') {
    for (let i = 0; i < stride; i++) out[i] = track.data[a * stride + i] + (track.data[b * stride + i] - track.data[a * stride + i]) * mix
    return out
  }
  for (let node = 0; node < track.names.length; node++) {
    const ai = a * stride + node * 7, bi = b * stride + node * 7, oi = node * 7
    for (let k = 0; k < 3; k++) out[oi + k] = track.data[ai + k] + (track.data[bi + k] - track.data[ai + k]) * mix
    const q = slerp(...track.data.subarray(ai + 3, ai + 7), ...track.data.subarray(bi + 3, bi + 7), mix)
    out.set(q, oi + 3)
  }
  return out
}

export function createReplay({ timeline, tracks }, bindings) {
  const bindingMap = new Map(bindings.map(binding => [binding.id, binding]))
  const prepared = tracks.map(track => {
    const binding = bindingMap.get(track.id)
    validateBinding(binding, track)
    return { track, binding, sample: new Float32Array(track.names.length * COMPONENTS[track.type]) }
  })
  const bundles = new Set(tracks.map(track => track.bundle))
  return {
    timeline, bundles,
    owns(bundle) { return bundles.has(bundle) },
    apply(time, onlyBundle = null) {
      for (const item of prepared) {
        if (onlyBundle && item.track.bundle !== onlyBundle) continue
        item.binding.write(sampleTrack(item.track, timeline, time, item.sample))
      }
    },
  }
}

export const MOTION_BAKE = Object.freeze({ components: COMPONENTS, timelineOf })
