// FNV-1a over the exact bits of a frame: every point's x and y as float64, then the two bindings.
const buf = new Float64Array(1), bytes = new Uint8Array(buf.buffer)
export function frameHash(points, mounted, sledIntact) {
	let h = 0x811c9dc5
	const mix = v => { buf[0] = v; for (let i = 0; i < 8; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) } }
	for (const p of points) { mix(p.x); mix(p.y) }
	mix(mounted); mix(sledIntact)
	return (h >>> 0).toString(36)
}
