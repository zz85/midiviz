// Signed-distance modelling for the concert-stage avatar.
//
// Shapes are described as smooth unions of simple primitives (round cones,
// ellipsoids), sampled on a grid and turned into one seamless, watertight
// mesh with naive surface nets. Normals come from the field's gradient, so
// where a finger grows out of the palm the skin flows instead of showing the
// crease two intersecting tubes would.
//
// Units are whatever the caller uses (cm here). Everything is CPU-side and
// runs once at load.

/** Polynomial smooth minimum (Quilez); k = blend radius. */
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b)
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/**
 * A primitive in its own frame: origin o and orthonormal axes ax/ay/az
 * (arrays of 3), an optional squash of the local y axis (sy < 1 flattens it)
 * and a local distance function f(x, y, z).
 */
function framed(o, ax, ay, az, sy, f, bound) {
  const s = sy || 1
  return {
    bound,
    d(px, py, pz) {
      const dx = px - o[0], dy = py - o[1], dz = pz - o[2]
      const x = dx * ax[0] + dy * ax[1] + dz * ax[2]
      const y = (dx * ay[0] + dy * ay[1] + dz * ay[2]) / s
      const z = dx * az[0] + dy * az[1] + dz * az[2]
      return f(x, y, z) * (s < 1 ? s : 1)
    },
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len = v => Math.hypot(v[0], v[1], v[2])
const norm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/**
 * Round cone from a (radius ra) to b (radius rb) — a tapered capsule. up
 * fixes which way is "up" for the optional squash sy of the cross-section.
 */
export function roundCone(a, b, ra, rb, { up = [0, 1, 0], sy = 1 } = {}) {
  const az = norm(sub(b, a))
  let ax = cross(up, az)
  if (len(ax) < 1e-6) ax = cross([1, 0, 0], az)
  ax = norm(ax)
  const ay = cross(az, ax)
  const L = len(sub(b, a))
  // Quilez's exact sdRoundCone, with a at the origin and b at (0, 0, L)
  const l2 = L * L, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2
  const f = (x, y, z) => {
    const yy = z * L, zz = yy - l2
    const x2 = (x * x + y * y) * l2 * l2
    const Y2 = yy * yy * l2, Z2 = zz * zz * l2
    const k = Math.sign(rr) * rr * rr * x2
    if (Math.sign(zz) * a2 * Z2 > k) return Math.sqrt(x2 + Z2) * il2 - rb
    if (Math.sign(yy) * a2 * Y2 < k) return Math.sqrt(x2 + Y2) * il2 - ra
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra
  }
  const r = Math.max(ra, rb)
  const bound = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r,
    Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r]
  return framed(a, ax, ay, az, sy, f, bound)
}

/** Ellipsoid with semi-axes r (local x, y, z) in the frame (ax, ay, az). */
export function ellipsoid(c, r, ax = [1, 0, 0], ay = [0, 1, 0], az = [0, 0, 1]) {
  const f = (x, y, z) => {
    const k0 = Math.hypot(x / r[0], y / r[1], z / r[2])
    const k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]))
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(...r)
  }
  const m = Math.max(...r)
  return framed(c, ax, ay, az, 1, f, [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m])
}

/**
 * A dense grid over bounds, at spacing h, initialised to +big. Layers are
 * written primitive by primitive, each only inside its own bounding box.
 */
export class Field {
  constructor(bounds, h, pad = 1) {
    this.h = h
    this.o = [bounds[0] - pad, bounds[1] - pad, bounds[2] - pad]
    this.n = [0, 1, 2].map(i => Math.ceil((bounds[i + 3] - bounds[i] + 2 * pad) / h) + 1)
    this.v = new Float32Array(this.n[0] * this.n[1] * this.n[2]).fill(1e3)
  }
  idx(i, j, k) { return (k * this.n[1] + j) * this.n[0] + i }
  /** combine(old, d) over the primitive's bounds grown by grow. */
  apply(prim, combine, grow = 1) {
    const { h, o, n, v } = this, b = prim.bound
    const lo = [0, 1, 2].map(a => Math.max(0, Math.floor((b[a] - grow - o[a]) / h)))
    const hi = [0, 1, 2].map(a => Math.min(n[a] - 1, Math.ceil((b[a + 3] + grow - o[a]) / h)))
    for (let k = lo[2]; k <= hi[2]; k++) {
      const z = o[2] + k * h
      for (let j = lo[1]; j <= hi[1]; j++) {
        const y = o[1] + j * h
        let at = this.idx(lo[0], j, k)
        for (let i = lo[0]; i <= hi[0]; i++, at++) v[at] = combine(v[at], prim.d(o[0] + i * h, y, z))
      }
    }
  }
  /** this = f(this, other) everywhere. */
  merge(other, f) { const a = this.v, b = other.v; for (let i = 0; i < a.length; i++) a[i] = f(a[i], b[i]) }
  sample(x, y, z) {
    // trilinear
    const { h, o, n, v } = this
    const fx = Math.min(n[0] - 1.001, Math.max(0, (x - o[0]) / h)), fy = Math.min(n[1] - 1.001, Math.max(0, (y - o[1]) / h)), fz = Math.min(n[2] - 1.001, Math.max(0, (z - o[2]) / h))
    const i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, w = fy - j, t = fz - k
    const g = (a, b, c) => v[this.idx(i + a, j + b, k + c)]
    const l = (a, b, s) => a + (b - a) * s
    return l(l(l(g(0, 0, 0), g(1, 0, 0), u), l(g(0, 1, 0), g(1, 1, 0), u), w), l(l(g(0, 0, 1), g(1, 0, 1), u), l(g(0, 1, 1), g(1, 1, 1), u), w), t)
  }
}

/**
 * Naive surface nets on the zero level set. Returns { positions, normals,
 * index } (normals from the field gradient, pointing outward).
 */
export function surfaceNets(field) {
  const { n, v, h, o } = field
  const [nx, ny, nz] = n
  const cell = new Int32Array(nx * ny * nz).fill(-1)
  const pos = [], nor = [], index = []
  const corner = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0
    for (let c = 0; c < 8; c++) {
      const d = v[field.idx(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]
      corner[c] = d
      if (d < 0) mask |= 1 << c
    }
    if (mask === 0 || mask === 255) continue
    // average the edge crossings
    let sx = 0, sy = 0, sz = 0, cnt = 0
    for (let c = 0; c < 8; c++) for (const bit of [1, 2, 4]) {
      if (c & bit) continue
      const c2 = c | bit, a = corner[c], b = corner[c2]
      if ((a < 0) === (b < 0)) continue
      const t = a / (a - b)
      const x = (c & 1) + (bit === 1 ? t : 0), y = ((c >> 1) & 1) + (bit === 2 ? t : 0), z = ((c >> 2) & 1) + (bit === 4 ? t : 0)
      sx += x; sy += y; sz += z; cnt++
    }
    const px = o[0] + (i + sx / cnt) * h, py = o[1] + (j + sy / cnt) * h, pz = o[2] + (k + sz / cnt) * h
    cell[field.idx(i, j, k)] = pos.length / 3
    pos.push(px, py, pz)
    // gradient → normal
    const e = h * 0.5
    let gx = field.sample(px + e, py, pz) - field.sample(px - e, py, pz)
    let gy = field.sample(px, py + e, pz) - field.sample(px, py - e, pz)
    let gz = field.sample(px, py, pz + e) - field.sample(px, py, pz - e)
    const gl = Math.hypot(gx, gy, gz) || 1
    nor.push(gx / gl, gy / gl, gz / gl)
  }
  // a quad across every grid edge that changes sign
  const C = (i, j, k) => cell[field.idx(i, j, k)]
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const inside = v[field.idx(i, j, k)] < 0
    // x edge (i,j,k)-(i+1,j,k): cells (i, j-1..j, k-1..k)
    if (i < nx - 1 && inside !== (v[field.idx(i + 1, j, k)] < 0)) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), inside)
    if (j < ny - 1 && inside !== (v[field.idx(i, j + 1, k)] < 0)) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), inside)
    if (k < nz - 1 && inside !== (v[field.idx(i, j, k + 1)] < 0)) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), inside)
  }
  function quad(a, b, c, d, flip) {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) index.push(a, b, c, a, c, d)
    else index.push(a, c, b, a, d, c)
  }
  return { positions: pos, normals: nor, index }
}
