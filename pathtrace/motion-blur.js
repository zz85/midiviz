// Film shutter timing shared by WebGPU live rendering and offline export.
// A 180 degree shutter at 24 fps exposes for 1/48 s. Velocity describes the
// previous rendered interval, so reconstruction scales it by exposure / dt.
export function shutterTime(angle, fps = 24) {
  const a = Number.isFinite(+angle) ? Math.max(0, Math.min(360, +angle)) : 0
  const f = Number.isFinite(+fps) && +fps > 0 ? +fps : 24
  return a / 360 / f
}

export function shutterScale(angle, dt, { fps = 24, cut = false, max = 4 } = {}) {
  if (cut || !(dt > 0)) return 0
  return Math.min(max, shutterTime(angle, fps) / dt)
}
