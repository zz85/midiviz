// The slice of three.js (r170) that pianist/director.js uses, with the same
// formulas, for running its tests in Node without the CDN.
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
  clone() { return new Vector3(this.x, this.y, this.z) }
  fromArray(a, o = 0) { this.x = a[o]; this.y = a[o + 1]; this.z = a[o + 2]; return this }
  toArray() { return [this.x, this.y, this.z] }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) }
  normalize() { return this.multiplyScalar(1 / (this.length() || 1)) }
  distanceTo(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx * dx + dy * dy + dz * dz) }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z }
  crossVectors(a, b) { const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x; this.x = x; this.y = y; this.z = z; return this }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this }
  lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this }
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp = (x, y, t) => (1 - t) * x + t * y
function smootherstep(x, min, max) {
  if (x <= min) return 0
  if (x >= max) return 1
  x = (x - min) / (max - min)
  return x * x * x * (x * (x * 6 - 15) + 10)
}
export const MathUtils = { clamp, lerp, smootherstep }
