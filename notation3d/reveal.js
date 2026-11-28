/**
 * reveal.js — rolling reveal for the 3D notation stage (#055).
 *
 * Every piece of ink on the page (noteheads, stems, beams, staff lines, clefs,
 * text) gets the music time at which the playhead reaches it, from a time map
 * baked into a float texture over score space: x within each system maps to
 * time through that line's onsets, y picks the system. With that one lookup the
 * score's own materials can hide what isn't played yet (mode `reveal`), drop
 * what has been played (mode `vanish`), or both (`window`). The edge between
 * shown and hidden is broken up by 3D value noise and glows like an ember.
 *
 * Where ink appears or disappears, particles sampled from the same surfaces fly
 * along a curl-noise field (divergence-free, so they swirl without bunching):
 * `dandelion` seeds drift up and away, `dust` swirls low and fast, `dissolve`
 * uses no particles. Particles are stateless: each one's position is a function
 * of music time alone, so seeking and frame-by-frame video export match live play.
 *
 * Score space as in stage.js: x right, y up the page, z out of the page, 1 unit = 1 staff space.
 */
import * as THREE from 'three'

export const REVEAL_MODES = ['off', 'reveal', 'vanish', 'window']
const MODE_BITS = { off: 0, reveal: 1, vanish: 2, window: 3 }

export const REVEAL_STYLES = {
	// travel: staff spaces; rise: share of travel that goes up (+z) and up the page (+y)
	dandelion: { particles: true, life: 2.8, travel: 9, swirl: 0.55, rise: 0.75, wind: [0.35, 0.55, 0.9], size: 0.32, seed: 1 },
	dust: { particles: true, life: 1.7, travel: 5, swirl: 1.4, rise: 0.25, wind: [0.15, 0.1, 0.5], size: 0.16, seed: 0 },
	dissolve: { particles: false, life: 1, travel: 0, swirl: 0, rise: 0, wind: [0, 0, 0], size: 0, seed: 0 },
}

const NOISE_GLSL = /* glsl */`
	float rvHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
	float rvNoise(vec3 x) {
		vec3 i = floor(x), f = fract(x);
		f = f * f * (3.0 - 2.0 * f);
		return mix(mix(mix(rvHash(i), rvHash(i + vec3(1, 0, 0)), f.x), mix(rvHash(i + vec3(0, 1, 0)), rvHash(i + vec3(1, 1, 0)), f.x), f.y),
			mix(mix(rvHash(i + vec3(0, 0, 1)), rvHash(i + vec3(1, 0, 1)), f.x), mix(rvHash(i + vec3(0, 1, 1)), rvHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
	}
	// edge noise in [0,1]: two octaves over score space, a few blobs per notehead
	float rvEdge(vec3 p) { return clamp(0.65 * rvNoise(p * 1.7) + 0.35 * rvNoise(p * 4.3 + 11.0), 0.0, 1.0); }
`

const CURL_GLSL = /* glsl */`
	// curl of the vector potential A = (sin(y+a)cos(.7z+b), sin(z+c)cos(.7x+d), sin(x+e)cos(.7y+f)), analytic
	vec3 curlA(vec3 p, vec3 a, vec3 b) {
		float sx = sin(p.x + a.z), cx = cos(p.x + a.z);
		float sy = sin(p.y + a.x), cy = cos(p.y + a.x);
		float sz = sin(p.z + a.y), cz = cos(p.z + a.y);
		float s7x = sin(0.7 * p.x + b.y), c7x = cos(0.7 * p.x + b.y);
		float s7y = sin(0.7 * p.y + b.z), c7y = cos(0.7 * p.y + b.z);
		float s7z = sin(0.7 * p.z + b.x), c7z = cos(0.7 * p.z + b.x);
		return vec3(
			-0.7 * sx * s7y - cz * c7x,
			-0.7 * sy * s7z - cx * c7y,
			-0.7 * sz * s7x - cy * c7z);
	}
	vec3 curl(vec3 p) {
		vec3 q = mat3(0.8, 0.6, 0.0, -0.6, 0.8, 0.0, 0.0, 0.0, 1.0) * p * 2.3;
		return curlA(p * 0.55, vec3(1.3, 4.1, 2.7), vec3(5.2, 0.4, 3.3)) + 0.5 * curlA(q, vec3(2.9, 0.7, 6.1), vec3(1.1, 3.8, 0.2));
	}

`

const UNIFORMS_GLSL = /* glsl */`
	uniform sampler2D uRvTex;
	uniform vec4 uRvRect;      // x0, y0, 1/w, 1/h of the time map
	uniform float uRvTime;     // music time now
	uniform int uRvMode;       // bit 1 = hide unplayed, bit 2 = hide played
	uniform float uRvLead;     // seconds before its time that ink appears
	uniform float uRvHold;     // seconds after its time that ink stays
	uniform float uRvBand;     // seconds of noise in the edge
	uniform int uRvKeepStaff;  // 1 = staff lines always shown
	uniform float uRvFly;      // 0 = unplayed ink materialises, 1 = flies in from the right, 2 = swirls in along the curl field
	uniform float uRvGroup;    // 1 = a note flies with its stem, beam, flag, accidentals and dots, as one unit
	uniform float uRvFlyDur;   // seconds a piece of ink is in flight
	uniform float uRvFlyDist;  // staff spaces it starts from
`

// fragment: returns emission at the edge (0..1), discards hidden ink
const FRAG_GLSL = /* glsl */`
	float rvEdgeGlow = 0.0;
	bool rvSkip = false;
	#ifdef RV_STAFF
		rvSkip = uRvKeepStaff == 1;
	#endif
	if (uRvMode != 0 && !rvSkip) {
		float tm = texture2D(uRvTex, (vRvPos.xy - uRvRect.xy) * uRvRect.zw).r;
		float age = uRvTime - tm;
		float n = rvEdge(vRvPos);
		bool rvFlying = uRvFly > 0.5;
		#if defined(RV_STAFF) || defined(RV_TEXT)
			rvFlying = false;
		#endif
		if ((uRvMode & 1) != 0 && !rvFlying) {
			float d = age - (-uRvLead + n * uRvBand);
			if (d < 0.0) discard;
			rvEdgeGlow = max(rvEdgeGlow, 1.0 - smoothstep(0.0, 0.09, d));
		}
		if ((uRvMode & 2) != 0) {
			float d = (uRvHold + n * uRvBand) - age;
			if (d < 0.0) discard;
			rvEdgeGlow = max(rvEdgeGlow, 1.0 - smoothstep(0.0, 0.09, d));
		}
	}
`

// Fly-in: each piece of ink (a glyph instance, or one connected shape of the merged
// extrusions: a stem, a beam, a slur) has a pivot and a landing time (aRvPiv: x, y, t);
// as a unit (uRvGroup), every piece of one note or beamed group shares its unit's
// (aRvUnit), so they move rigidly together. For uRvFlyDur seconds before it lands a
// piece is offset and turned, u = time left / dur going 1 -> 0 and k = u^2, so it
// decelerates into place:
//   fly:  offset straight from the right (k * From), a sideways and upward bias, and an
//         arc of sin(pi u) above the page; angle k * (3..7 rad) about a random axis
//   curl: the offset is the path of a point carried k * From along the same curl-noise
//         field the particles ride (with a wind from the right), so the piece swirls in
//         out of chaos; it tumbles k * (6..12 rad)
// The first 30% of the flight it grows from nothing.
const FLY_VS = /* glsl */`
	attribute vec3 aRvPiv;
	attribute vec3 aRvUnit;
	mat3 rvRot = mat3(1.0);
	vec3 rvOff = vec3(0.0), rvPiv = vec3(0.0);
	float rvScale = 1.0;
	bool rvActive = false, rvDone = false;
	void rvFlySetup() {
		if (rvDone) return;
		rvDone = true;
		#if defined(RV_STAFF) || defined(RV_TEXT)
			return;
		#endif
		if (uRvFly < 0.5 || (uRvMode & 1) == 0) return;
		vec3 pv = uRvGroup > 0.5 ? aRvUnit : aRvPiv;
		rvPiv = vec3(pv.xy, 0.0);
		float u = (pv.z - uRvLead - uRvTime) / max(0.05, uRvFlyDur);
		if (u <= 0.0) return;
		rvActive = true;
		if (u >= 1.0) { rvScale = 0.0; return; } // not in flight yet: collapsed, draws nothing
		float h1 = rvHash(vec3(rvPiv.xy * 1.37, 3.1)), h2 = rvHash(vec3(rvPiv.yx * 2.11, 7.7)), h3 = rvHash(vec3(rvPiv.xy * 0.73, 1.9));
		float k = u * u;
		bool swirl = uRvFly > 1.5;
		vec3 axis = normalize(vec3(h1 - 0.5, h2 - 0.5, h3 - 0.5) + vec3(0.0, 0.35, 0.0));
		float ang = k * (swirl ? 6.0 + 6.0 * h2 : 3.0 + 4.0 * h2) * (h3 < 0.5 ? -1.0 : 1.0);
		float c = cos(ang), s = sin(ang), t = 1.0 - c;
		rvRot = mat3(
			t * axis.x * axis.x + c, t * axis.x * axis.y + s * axis.z, t * axis.x * axis.z - s * axis.y,
			t * axis.x * axis.y - s * axis.z, t * axis.y * axis.y + c, t * axis.y * axis.z + s * axis.x,
			t * axis.x * axis.z + s * axis.y, t * axis.y * axis.z - s * axis.x, t * axis.z * axis.z + c);
		float D = uRvFlyDist;
		if (swirl) {
			vec3 p = rvPiv;
			vec3 wind = normalize(vec3(1.0, 0.15, 0.55)) * 0.7;
			vec3 off = vec3(h1 * 37.0, h2 * 11.0, h3 * 5.0);
			const int STEPS = 8;
			float h = D * (0.7 + 0.6 * h1) * k / float(STEPS);
			for (int i = 0; i < STEPS; i++) p += (normalize(curl(p * 0.22 + off) + vec3(1e-4)) + wind) * h;
			p.z = max(p.z, 0.0);
			rvOff = p - rvPiv;
		} else {
			rvOff = vec3(D * (0.75 + 0.5 * h1) * k,
				D * 0.3 * (h2 - 0.5) * k,
				D * (0.2 + 0.3 * h3) * k + D * 0.12 * sin(3.14159 * u));
		}
		rvScale = 1.0 - smoothstep(0.7, 1.0, u);
	}
`

/** Patch a three.js material (keeps any earlier onBeforeCompile) so it reads the time map. */
function patchMaterial(mat, uniforms, edge, kind = 'ink') {
	if (mat.userData.revealPatched) return
	mat.userData.revealPatched = true
	const prev = mat.onBeforeCompile
	const prevKey = mat.customProgramCacheKey?.bind(mat)
	mat.onBeforeCompile = (sh, r) => {
		prev?.call(mat, sh, r)
		for (const k in uniforms) sh.uniforms[k] = uniforms[k]
		const def = kind === 'staff' ? '#define RV_STAFF\n' : kind === 'text' ? '#define RV_TEXT\n' : ''
		let vs = def + 'varying vec3 vRvPos;\n' + UNIFORMS_GLSL + NOISE_GLSL + CURL_GLSL + FLY_VS + sh.vertexShader
		vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
			vec4 rvP = vec4(transformed, 1.0);
			#ifdef USE_INSTANCING
				rvP = instanceMatrix * rvP;
			#endif
			vRvPos = rvP.xyz;
			rvFlySetup();
			if (rvActive) {
				vec3 rvQ = rvPiv + rvRot * ((rvP.xyz - rvPiv) * rvScale) + rvOff;
				#ifdef USE_INSTANCING
					transformed = (inverse(instanceMatrix) * vec4(rvQ, 1.0)).xyz;
				#else
					transformed = rvQ;
				#endif
			}`)
		vs = vs.replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
			rvFlySetup();
			if (rvActive) transformedNormal = normalMatrix * (rvRot * (transpose(normalMatrix) * transformedNormal));`)
		sh.vertexShader = vs
		let fs = def + 'varying vec3 vRvPos;\n' + UNIFORMS_GLSL + NOISE_GLSL + sh.fragmentShader
		fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_GLSL)
		if (edge && fs.includes('#include <emissivemap_fragment>')) {
			fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
				totalEmissiveRadiance += uRvEdgeColor * rvEdgeGlow;`)
			fs = 'uniform vec3 uRvEdgeColor;\n' + fs
		}
		sh.fragmentShader = fs
	}
	mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|reveal' + (edge ? 'E' : '') + kind
	mat.needsUpdate = true
}

// ── particles ───────────────────────────────────────────────────────────────

const PARTICLE_VS = /* glsl */`
	attribute float aT;      // music time the playhead reaches this point
	attribute float aSeed;   // 0..1
	attribute float aColor;  // -1 ink, else palette index
	uniform float uRvLife, uRvTravel, uRvSwirl, uRvRise, uRvSize, uRvScale;
	uniform vec3 uRvWind;
	uniform vec3 uRvInk;
	uniform vec3 uRvPalette[8];
	varying vec3 vCol;
	varying float vAlpha;
	varying float vSpin;

	void main() {
		vCol = aColor < 0.0 ? uRvInk : uRvPalette[int(aColor) % 8];
		float age = uRvTime - aT;
		float n = rvEdge(position);
		float u = -1.0;
		bool keep = uRvKeepStaff == 1 && aColor < -1.5;
		if (keep) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
		// hidden until played: fly in for uRvLife seconds before the ink appears (the reverse of blowing away)
		if ((uRvMode & 1) != 0 && (uRvFly < 0.5 || aColor < -1.5)) { float uu = ((-uRvLead + n * uRvBand) - age) / uRvLife; if (uu > 0.0 && uu < 1.0) u = uu; }
		// gone once played: blow away for uRvLife seconds after the ink goes
		if ((uRvMode & 2) != 0) { float uu = (age - (uRvHold + n * uRvBand)) / uRvLife; if (uu > 0.0 && uu < 1.0) u = uu; }
		if (u < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }

		// ease: seeds lift off slowly, then the wind takes them
		float e = u * u * (3.0 - 2.0 * u) * 0.6 + u * u * 0.4;
		float dist = uRvTravel * (0.55 + 0.9 * aSeed) * e;
		vec3 p = position;
		vec3 wind = normalize(uRvWind + vec3(0.0001)) * uRvRise;
		const int STEPS = 7;
		float h = dist / float(STEPS);
		vec3 off = vec3(aSeed * 37.0, aSeed * 11.0, 0.0);
		for (int i = 0; i < STEPS; i++) {
			vec3 c = curl(p * 0.9 + off);
			p += (normalize(c + vec3(1e-4)) * uRvSwirl + wind) * h;
		}
		p.z = max(p.z, 0.04);
		vSpin = aSeed * 6.2831 + u * 3.0;

		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		gl_Position = projectionMatrix * mv;
		float grow = 0.6 + 0.8 * smoothstep(0.0, 0.35, u);
		gl_PointSize = uRvSize * grow * (0.6 + 0.8 * fract(aSeed * 7.13)) * uRvScale / max(0.1, -mv.z);
		vAlpha = smoothstep(0.0, 0.04, u) * pow(1.0 - u, 1.4);
	}
`

const PARTICLE_FS = /* glsl */`
	uniform float uRvSeedShape; // 1 = dandelion pappus, 0 = round dust mote
	uniform float uRvGain;
	varying vec3 vCol;
	varying float vAlpha;
	varying float vSpin;
	void main() {
		vec2 q = gl_PointCoord * 2.0 - 1.0;
		float r = length(q);
		if (r > 1.0) discard;
		float core = exp(-r * r * 9.0);
		float a = core;
		if (uRvSeedShape > 0.5) {
			// pappus: a dot with fine radiating filaments and a soft halo
			float ang = atan(q.y, q.x) + vSpin;
			float rays = pow(abs(cos(ang * 4.0)), 24.0) * smoothstep(1.0, 0.25, r) * smoothstep(0.05, 0.25, r);
			a = max(core, rays * 0.75) + 0.15 * (1.0 - r);
		} else {
			a = core + 0.25 * (1.0 - r) * (1.0 - r);
		}
		a *= vAlpha;
		if (a < 0.01) discard;
		gl_FragColor = vec4(vCol * uRvGain, a);
		#include <colorspace_fragment>
	}
`

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t

/**
 * Time map: for each texel of score space, the music time the playhead reaches it.
 * Returns { data, W, H, x0, y0, sx, sy } with sx/sy = texels per unit.
 */
function buildTimeMap(score, maxTex) {
	const b = score.built.bounds
	const x0 = b.min.x - 6, x1 = b.max.x + 6
	const y0 = b.min.y - 8, y1 = b.max.y + 8
	const systems = score.systems
	const RES = 0.3
	const W = clamp(Math.ceil((x1 - x0) / RES), 2, maxTex)
	const H = systems ? clamp(Math.ceil((y1 - y0) / RES), 2, Math.min(2048, maxTex)) : 1
	const sx = W / (x1 - x0), sy = H / (y1 - y0)
	const data = new Float32Array(W * H)

	// one line of music: x → time through its onsets
	const sysList = systems || [{ minX: b.min.x, maxX: b.max.x, minY: -Infinity, maxY: Infinity, page: 0 }]
	const lines = score.lines || [{ sys: 0, pts: score.timeline, t0: score.timeline[0]?.time ?? 0 }]
	const rowOf = new Map()
	lines.forEach((L, li) => {
		const sy = sysList[L.sys]
		const xs = [], ts = []
		let mx = -Infinity
		for (const p of L.pts) { mx = Math.max(mx, p.x); xs.push(mx); ts.push(p.time) }
		if (!xs.length) return
		const next = lines[li + 1]?.t0
		const tEnd = Math.min(next ?? Infinity, ts[ts.length - 1] + 1.5)
		const PRE = 0.4 // clef, key and time signature appear just before the line's first note
		const row = new Float32Array(W)
		let k = 0
		for (let i = 0; i < W; i++) {
			const x = x0 + (i + 0.5) / sx
			let t
			if (x <= xs[0]) t = ts[0] - PRE * clamp((xs[0] - x) / Math.max(1, xs[0] - sy.minX), 0, 1)
			else if (x >= xs[xs.length - 1]) t = lerp(ts[ts.length - 1], tEnd, clamp((x - xs[xs.length - 1]) / Math.max(1, sy.maxX - xs[xs.length - 1]), 0, 1))
			else {
				while (k < xs.length - 2 && xs[k + 1] < x) k++
				const xa = xs[k], xb = xs[k + 1]
				t = xb > xa ? lerp(ts[k], ts[k + 1], (x - xa) / (xb - xa)) : ts[k + 1]
			}
			row[i] = t
		}
		rowOf.set(L.sys, row)
	})

	if (!systems) {
		data.set(rowOf.get(0) || new Float32Array(W))
		return { data, W, H, x0, y0, sx, sy }
	}

	// each system owns the band halfway to its neighbours on the same page
	const byPage = new Map()
	sysList.forEach((s, i) => { if (!byPage.has(s.page)) byPage.set(s.page, []); byPage.get(s.page).push(i) })
	const owned = new Uint8Array(W * H)
	for (const ids of byPage.values()) {
		ids.sort((p, q) => sysList[q].cy - sysList[p].cy) // top first
		const pxMin = Math.min(...ids.map(i => sysList[i].minX)) - 8, pxMax = Math.max(...ids.map(i => sysList[i].maxX)) + 8
		ids.forEach((id, j) => {
			const s = sysList[id], up = sysList[ids[j - 1]], dn = sysList[ids[j + 1]]
			const yHi = up ? (up.minY + s.maxY) / 2 : y1, yLo = dn ? (s.minY + dn.maxY) / 2 : y0
			let row = rowOf.get(id)
			if (!row) { // a system with no notes: take the time the previous one ends
				const prev = ids.slice(0, j).reverse().map(i => rowOf.get(i)).find(Boolean)
				row = new Float32Array(W).fill(prev ? prev[W - 1] : 0)
			}
			const r0 = clamp(Math.floor((yLo - y0) * sy), 0, H - 1), r1 = clamp(Math.ceil((yHi - y0) * sy), 0, H)
			const c0 = clamp(Math.floor((pxMin - x0) * sx), 0, W - 1), c1 = clamp(Math.ceil((pxMax - x0) * sx), 0, W)
			for (let r = r0; r < r1; r++) {
				const o = r * W
				for (let c = c0; c < c1; c++) if (!owned[o + c]) { data[o + c] = row[c]; owned[o + c] = 1 }
			}
		})
	}
	return { data, W, H, x0, y0, sx, sy }
}

function sampleTime(map, x, y) {
	const { data, W, H, x0, y0, sx, sy } = map
	const fx = clamp((x - x0) * sx - 0.5, 0, W - 1), fy = clamp((y - y0) * sy - 0.5, 0, H - 1)
	const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j
	const i1 = Math.min(i + 1, W - 1), j1 = Math.min(j + 1, H - 1)
	const a = data[j * W + i], b = data[j * W + i1], c = data[j1 * W + i], d = data[j1 * W + i1]
	return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

/** Triangles of a geometry weighted by the area they cover on the page (sides of extrusions cover none). */
function pageTriangles(geo) {
	const pos = geo.attributes.position, idx = geo.index
	const n = idx ? idx.count : pos.count
	const tris = [], cum = []
	let total = 0, zMin = Infinity, zMax = -Infinity
	for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); zMin = Math.min(zMin, z); zMax = Math.max(zMax, z) }
	for (let t = 0; t + 2 < n; t += 3) {
		const a = idx ? idx.getX(t) : t, b = idx ? idx.getX(t + 1) : t + 1, c = idx ? idx.getX(t + 2) : t + 2
		const ax = pos.getX(a), ay = pos.getY(a), bx = pos.getX(b), by = pos.getY(b), cx = pos.getX(c), cy = pos.getY(c)
		// only the top face, so each area counts once
		if (pos.getZ(a) < zMax - 1e-4 || pos.getZ(b) < zMax - 1e-4 || pos.getZ(c) < zMax - 1e-4) continue
		const area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2
		if (area < 1e-6) continue
		tris.push(ax, ay, bx, by, cx, cy)
		total += area
		cum.push(total)
	}
	return { tris, cum, total, zMin: Math.max(0, zMin), zMax }
}

function pickTriangle(cum, r) {
	let lo = 0, hi = cum.length - 1
	while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m }
	return lo
}

/** Connected shapes of a merged extrusion (a stem, a beam, a whole slur): triangles that share a vertex position. */
function components(geo) {
	const pos = geo.attributes.position, n = pos.count
	const parent = new Int32Array(n).map((_, i) => i)
	const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
	const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b }
	const key = new Map()
	const idx = geo.index
	const vtx = i => idx ? idx.getX(i) : i
	const m = idx ? idx.count : n
	for (let i = 0; i < n; i++) {
		const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4)
		const j = key.get(k)
		if (j === undefined) key.set(k, i); else union(i, j)
	}
	for (let t = 0; t + 2 < m; t += 3) { union(vtx(t), vtx(t + 1)); union(vtx(t), vtx(t + 2)) }
	const comps = [], ofRoot = new Map(), vComp = new Int32Array(n)
	for (let i = 0; i < n; i++) {
		const r = find(i)
		let c = ofRoot.get(r)
		if (c === undefined) { ofRoot.set(r, c = comps.length); comps.push({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) }
		vComp[i] = c
		const b = comps[c], x = pos.getX(i), y = pos.getY(i)
		b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x); b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y)
	}
	return { comps, vComp }
}

/**
 * Units for flying as a whole: each piece of ink joins the pieces it touches (head,
 * stem, flag, ledger lines, beam: so a beamed group is one unit), an accidental joins
 * the nearest notehead just to its right on its line or space, and a dot the nearest
 * just to its left. Staff lines and text don't join. A unit lands at its first note.
 */
function buildUnits(pieces) {
	const parent = pieces.map((_, i) => i)
	const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
	const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b }
	const CELL = 3, TOL = 0.06
	const grid = new Map()
	const cells = (p, pad, f) => {
		for (let i = Math.floor((p.minX - pad) / CELL); i <= Math.floor((p.maxX + pad) / CELL); i++)
			for (let j = Math.floor((p.minY - pad) / CELL); j <= Math.floor((p.maxY + pad) / CELL); j++) f(i + ',' + j)
	}
	pieces.forEach((p, i) => cells(p, 0, k => { if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i) }))
	const near = (p, pad) => { const s = new Set(); cells(p, pad, k => grid.get(k)?.forEach(j => s.add(j))); return s }
	const loose = p => p.kind === 'acc' || p.kind === 'dot'
	pieces.forEach((p, i) => {
		if (loose(p) || p.kind === 'free') return
		for (const j of near(p, TOL)) {
			const q = pieces[j]
			if (j <= i || loose(q) || q.kind === 'free') continue
			if (p.minX - TOL <= q.maxX && q.minX - TOL <= p.maxX && p.minY - TOL <= q.maxY && q.minY - TOL <= p.maxY) union(i, j)
		}
	})
	pieces.forEach((p, i) => {
		if (!loose(p)) return
		const cy = (p.minY + p.maxY) / 2
		let best = -1, bd = Infinity
		for (const j of near(p, 2)) {
			const q = pieces[j]
			if (q.kind !== 'head' || Math.abs((q.minY + q.maxY) / 2 - cy) > 0.8) continue
			const gap = p.kind === 'acc' ? q.minX - p.maxX : p.minX - q.maxX
			if (gap > -0.3 && gap < 1.6 && gap < bd) { bd = gap; best = j }
		}
		if (best >= 0) union(i, best)
	})
	const units = new Map()
	pieces.forEach((p, i) => {
		const r = find(i)
		let u = units.get(r)
		if (!u) units.set(r, u = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, tHead: Infinity, tAny: Infinity, n: 0 })
		u.minX = Math.min(u.minX, p.minX); u.maxX = Math.max(u.maxX, p.maxX); u.minY = Math.min(u.minY, p.minY); u.maxY = Math.max(u.maxY, p.maxY)
		if (p.headTime != null) u.tHead = Math.min(u.tHead, p.headTime)
		u.tAny = Math.min(u.tAny, p.t)
		u.n++
		p.unit = u
	})
	for (const u of units.values()) { u.cx = (u.minX + u.maxX) / 2; u.cy = (u.minY + u.maxY) / 2; u.t = isFinite(u.tHead) ? u.tHead : u.tAny }
	return [...units.values()]
}

const glyphKind = name => name.startsWith('notehead') ? 'head' : name.startsWith('accidental') ? 'acc' : name.startsWith('augmentationDot') ? 'dot'
	: /^(rest|gClef|fClef|cClef|timeSig|brace|bracket|dynamic)/.test(name) ? 'free' : 'ink'

export class ScoreReveal {
	constructor(stage) {
		this.stage = stage
		this.opts = { mode: 'reveal', style: 'dandelion', lead: 0, hold: 0.6, band: 0.36, density: 1, glow: 1, keepStaves: false, arrive: 'appear', flyDur: 1.4, flyDist: 16, flyUnits: false, paper: 'solid' }
		this.uniforms = {
			uRvTex: { value: new THREE.DataTexture(new Float32Array([0]), 1, 1, THREE.RedFormat, THREE.FloatType) },
			uRvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
			uRvTime: { value: 0 },
			uRvMode: { value: 0 },
			uRvLead: { value: 0 },
			uRvHold: { value: 0.6 },
			uRvBand: { value: 0.36 },
			uRvKeepStaff: { value: 0 },
			uRvFly: { value: 0 },
			uRvGroup: { value: 0 },
			uRvFlyDur: { value: 1.4 },
			uRvFlyDist: { value: 16 },
			uRvEdgeColor: { value: new THREE.Color(1.6, 0.9, 0.4) },
		}
		this.uniforms.uRvTex.value.needsUpdate = true
		this.pUniforms = {
			...this.uniforms,
			uRvLife: { value: 2.8 }, uRvTravel: { value: 9 }, uRvSwirl: { value: 0.6 }, uRvRise: { value: 0.7 },
			uRvWind: { value: new THREE.Vector3(0.3, 0.5, 0.9) }, uRvSize: { value: 0.3 }, uRvScale: { value: 500 },
			uRvInk: { value: new THREE.Color(1, 0.9, 0.75) }, uRvPalette: { value: Array.from({ length: 8 }, () => new THREE.Color()) },
			uRvSeedShape: { value: 1 }, uRvGain: { value: 1 },
		}
		this.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
		patchMaterial(this.depthMat, this.uniforms, false)
		const m = stage.materials
		patchMaterial(m.staff, this.uniforms, true, 'staff')
		for (const k of ['ink', 'glyph', 'head']) patchMaterial(m[k], this.uniforms, true, 'ink')
		this.points = null

		// hooks: build with each score, follow the theme, set the time for every frame (live and export)
		const setScore = stage.setScore.bind(stage)
		stage.setScore = (...a) => { setScore(...a); this.attach() }
		const setTheme = stage.setTheme.bind(stage)
		stage.setTheme = (...a) => { setTheme(...a); this._applyTheme() }
		const updateMirror = stage._updateMirror.bind(stage)
		stage._updateMirror = (...a) => { updateMirror(...a); this._applyPaper() }
		const update = stage.update.bind(stage)
		stage.update = (t, dt, playing, wall) => { this._frame(t); return update(t, dt, playing, wall) }
		this._applyTheme()
		this._applyOpts()
	}

	setOption(key, value) {
		this.opts[key] = value
		if (key === 'density' && this.stage.score) this._buildParticles()
		this._applyOpts()
	}

	_applyOpts() {
		const o = this.opts, U = this.uniforms, P = this.pUniforms
		U.uRvMode.value = MODE_BITS[o.mode] ?? 0
		U.uRvLead.value = o.lead
		U.uRvHold.value = o.hold
		U.uRvBand.value = o.band
		U.uRvKeepStaff.value = o.keepStaves ? 1 : 0
		U.uRvFly.value = o.arrive === 'fly' ? 1 : o.arrive === 'curl' ? 2 : 0
		U.uRvGroup.value = o.flyUnits ? 1 : 0
		U.uRvFlyDur.value = o.flyDur
		U.uRvFlyDist.value = o.flyDist
		// pieces in flight leave their chunk's bounds, so nothing of the score is culled while they fly
		const fly = U.uRvFly.value && (U.uRvMode.value & 1)
		this.stage.score?.built.group.traverse(m => { if (m.isMesh && !m.isPoints) m.frustumCulled = !fly })
		const st = REVEAL_STYLES[o.style] || REVEAL_STYLES.dandelion
		P.uRvLife.value = st.life
		P.uRvTravel.value = st.travel
		P.uRvSwirl.value = st.swirl
		P.uRvRise.value = st.rise
		P.uRvWind.value.set(...st.wind)
		P.uRvSize.value = st.size
		P.uRvSeedShape.value = st.seed
		if (this.points) this.points.visible = (st.particles || o.arrive !== 'appear') && U.uRvMode.value !== 0
		this._applyTheme()
	}

	/**
	 * The paper under the score: solid, see-through (so a piece flying below the page
	 * stays in view) or hidden (only the ink, in space). Desk and mirror follow it.
	 */
	_applyPaper() {
		const st = this.stage, mode = this.opts.paper
		const see = mode === 'see', hide = mode === 'hidden'
		for (const [mat, a] of [[st.paperMat, 0.3], [st.deskMat, 0.12]]) {
			const want = see
			if (mat.transparent !== want) { mat.transparent = want; mat.needsUpdate = true }
			mat.opacity = want ? a : 1
			mat.depthWrite = !want
		}
		st.score?.root.children.forEach(o => { if (o.material === st.paperMat || o.material === st.deskMat) o.visible = !hide })
		if (st.mirror && (see || hide)) st.mirror.visible = false
		st.pools.visible = !hide
	}

	_applyTheme() {
		const st = this.stage, th = st.theme
		if (!th) return
		const light = (st.opts.theme === 'paper')
		const P = this.pUniforms
		// on dark themes the seeds glow (and bloom); on paper they are ink
		if (light) P.uRvInk.value.set(th.ink)
		else P.uRvInk.value.set('#ffe9c8').multiplyScalar(1.5)
		const pal = st.palette
		P.uRvPalette.value.forEach((c, i) => { c.set(pal[i % pal.length]); if (!light) c.multiplyScalar(2.2) })
		P.uRvGain.value = this.opts.glow
		this.uniforms.uRvEdgeColor.value.set(light ? '#b0501a' : '#ffb060').multiplyScalar(light ? 0.6 : 2.2 * this.opts.glow)
		if (this.points) this.points.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
		this._applyPaper()
	}

	_frame(t) {
		this.uniforms.uRvTime.value = t
		const r = this.stage.renderer, cam = this.stage.camera
		const h = r.getDrawingBufferSize(this._v2 || (this._v2 = new THREE.Vector2())).y
		this.pUniforms.uRvScale.value = h * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
	}

	/** Bake the time map, patch the score's meshes and sample the particles. */
	attach() {
		const s = this.stage.score
		if (!s || !s.timeline.length) return
		const t0 = performance.now()
		const r = this.stage.renderer
		const map = this.map = buildTimeMap(s, Math.min(16384, r.capabilities.maxTextureSize))
		const old = this.uniforms.uRvTex.value
		const tex = new THREE.DataTexture(map.data, map.W, map.H, THREE.RedFormat, THREE.FloatType)
		const linear = r.extensions.has('OES_texture_float_linear')
		tex.magFilter = tex.minFilter = linear ? THREE.LinearFilter : THREE.NearestFilter
		tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
		tex.needsUpdate = true
		this.uniforms.uRvTex.value = tex
		old.dispose()
		this.uniforms.uRvRect.value.set(map.x0, map.y0, map.sx / map.W, map.sy / map.H)

		s.built.group.traverse(o => {
			if (!o.isMesh || o.isPoints) return
			o.customDepthMaterial = this.depthMat
			if (o.userData.isText) patchMaterial(o.material, this.uniforms, false, 'text')
		})
		this._buildPieces(s, map)
		this._buildParticles()
		console.log(`reveal: time map ${map.W}x${map.H}, ${this.stats.pieces} pieces in ${this.stats.units} units (${this.stats.wide} over 14 wide), ${this.points?.geometry.attributes.position.count ?? 0} particles, ${(performance.now() - t0).toFixed(0)}ms`)
	}

	/** Pivots and landing times of every piece of ink, alone (aRvPiv) and as part of its unit (aRvUnit). */
	_buildPieces(s, map) {
		const headTime = new Map()
		for (const st of s.headState.values()) {
			if (!headTime.has(st.h.mesh)) headTime.set(st.h.mesh, new Map())
			headTime.get(st.h.mesh).set(st.h.index, st.time)
		}
		const pieces = [], meshes = []
		const m = new THREE.Matrix4(), v = new THREE.Vector3()
		s.built.group.traverse(o => {
			if (!o.isMesh || o.isPoints || o.userData.isText) return
			const staff = o.material === this.stage.materials.staff
			if (o.isInstancedMesh) {
				// own geometry, so each mesh carries its own per-instance attributes
				if (!o.userData.rvOwnGeo) { o.geometry = o.geometry.clone(); o.userData.rvOwnGeo = true }
				o.geometry.computeBoundingBox()
				const bb = o.geometry.boundingBox, kind = glyphKind(o.userData.glyphName || '')
				const list = []
				for (let i = 0; i < o.count; i++) {
					o.getMatrixAt(i, m)
					const p = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, kind }
					for (const [x, y] of [[bb.min.x, bb.min.y], [bb.max.x, bb.min.y], [bb.min.x, bb.max.y], [bb.max.x, bb.max.y]]) {
						v.set(x, y, 0).applyMatrix4(m)
						p.minX = Math.min(p.minX, v.x); p.maxX = Math.max(p.maxX, v.x); p.minY = Math.min(p.minY, v.y); p.maxY = Math.max(p.maxY, v.y)
					}
					p.px = m.elements[12]; p.py = m.elements[13]
					p.t = sampleTime(map, p.px, p.py)
					p.headTime = headTime.get(o)?.get(i) ?? null
					list.push(p)
					pieces.push(p)
				}
				meshes.push({ o, list })
			} else {
				const { comps, vComp } = components(o.geometry)
				for (const c of comps) {
					c.kind = staff ? 'staff' : 'ink'
					c.px = (c.minX + c.maxX) / 2; c.py = (c.minY + c.maxY) / 2
					c.t = sampleTime(map, c.minX + 0.05, c.py)
					if (!staff) pieces.push(c)
				}
				meshes.push({ o, list: comps, vComp })
			}
		})
		const units = buildUnits(pieces)
		const big = units.filter(u => u.maxX - u.minX > 14).length
		for (const { o, list, vComp } of meshes) {
			const own = new Float32Array((vComp ? vComp.length : list.length) * 3), unit = new Float32Array(own.length)
			const put = (k, p) => {
				own.set([p.px, p.py, p.t], k * 3)
				const u = p.unit || { cx: p.px, cy: p.py, t: p.t }
				unit.set([u.cx, u.cy, u.t], k * 3)
			}
			if (vComp) vComp.forEach((c, k) => put(k, list[c]))
			else list.forEach((p, k) => put(k, p))
			const A = vComp ? THREE.BufferAttribute : THREE.InstancedBufferAttribute
			o.geometry.setAttribute('aRvPiv', new A(own, 3))
			o.geometry.setAttribute('aRvUnit', new A(unit, 3))
		}
		this.stats = { pieces: pieces.length, units: units.length, wide: big }
	}

	_buildParticles() {
		const s = this.stage.score
		if (this.points) { this.points.removeFromParent(); this.points.geometry.dispose(); this.points = null }
		const group = s.built.group
		// sources: merged extrusions (staff lines, stems, beams, slurs) and instanced glyphs
		const sources = []
		const headColor = new Map() // InstancedMesh → index → palette index
		for (const st of s.headState.values()) {
			const { mesh, index } = st.h
			if (!headColor.has(mesh)) headColor.set(mesh, new Map())
			headColor.get(mesh).set(index, st.color)
		}
		const triCache = new Map()
		const tri = geo => { if (!triCache.has(geo)) triCache.set(geo, pageTriangles(geo)); return triCache.get(geo) }
		let area = 0
		group.traverse(o => {
			if (!o.isMesh || o.userData.isText || o.isPoints) return
			const T = tri(o.geometry)
			if (!T.total) return
			if (o.isInstancedMesh) {
				const m = new THREE.Matrix4(), e = m.elements
				for (let i = 0; i < o.count; i++) {
					o.getMatrixAt(i, m)
					const det = Math.abs(e[0] * e[5] - e[1] * e[4])
					sources.push({ T, m: m.clone(), area: T.total * det, color: headColor.get(o)?.get(i) ?? -1 })
					area += T.total * det
				}
			} else {
				sources.push({ T, m: null, area: T.total, color: -1, staff: o.material === this.stage.materials.staff })
				area += T.total
			}
		})
		if (!area) return
		const BUDGET = 260000 * this.opts.density
		const density = Math.min(70 * this.opts.density, BUDGET / area)
		const pos = [], tt = [], seed = [], col = []
		let rnd = 12345
		const rand = () => (rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296
		const v = new THREE.Vector3()
		for (const src of sources) {
			const want = src.area * density * (src.staff ? 0.5 : 1)
			let n = Math.floor(want) + (rand() < want % 1 ? 1 : 0)
			const { tris, cum, total, zMin, zMax } = src.T
			while (n-- > 0) {
				const k = pickTriangle(cum, rand() * total) * 6
				let a = rand(), b = rand()
				if (a + b > 1) { a = 1 - a; b = 1 - b }
				v.set(tris[k] + a * (tris[k + 2] - tris[k]) + b * (tris[k + 4] - tris[k]),
					tris[k + 1] + a * (tris[k + 3] - tris[k + 1]) + b * (tris[k + 5] - tris[k + 1]), lerp(zMin, zMax, 0.5 + 0.5 * rand()))
				if (src.m) v.applyMatrix4(src.m)
				pos.push(v.x, v.y, v.z)
				tt.push(sampleTime(this.map, v.x, v.y))
				seed.push(rand())
				col.push(src.staff ? -2 : src.color)
			}
		}
		const geo = new THREE.BufferGeometry()
		geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
		geo.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1))
		geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1))
		geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 1))
		const mat = new THREE.ShaderMaterial({
			uniforms: this.pUniforms,
			vertexShader: UNIFORMS_GLSL + NOISE_GLSL + CURL_GLSL + PARTICLE_VS,
			fragmentShader: PARTICLE_FS,
			transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
		})
		this.points = new THREE.Points(geo, mat)
		this.points.frustumCulled = false
		this.points.renderOrder = 3
		this.points.userData.sharedGeo = false
		group.add(this.points)
		this._applyOpts()
	}
}
