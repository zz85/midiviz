// Ported from ../mechanical-pianist/src/presentation/PianoInterior.ts and its presentation dependencies.
// Generated as a readable ES module with Three.js external; regenerate with the source project's Vite library build.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
var WHITE_PITCH = .0235;
var WHITE_GAP = .0011;
var BLACK_WIDTH_BOTTOM = .0128;
var BLACK_HEIGHT = .0122;
var BLACK_FRONT_Z = -.05499999999999999;
var WHITE_PIVOT_Z = -.255;
var BLACK_PIVOT_Z = -.27;
var PIVOT_Y = -.03;
var KEY_DIP = .01;
var BLACK_DIP = .0095;
/** Pitch classes that are black keys. */
var BLACK_PC = /* @__PURE__ */ new Set([
	1,
	3,
	6,
	8,
	10
]);
function isBlack(midi) {
	return BLACK_PC.has((midi % 12 + 12) % 12);
}
/** Number of white keys strictly below `midi` on an 88-key keyboard. */
function whiteIndexOf(midi) {
	let n = 0;
	for (let p = 21; p < midi; p++) if (!isBlack(p)) n++;
	return n;
}
var LEFT_EDGE = -(whiteIndexOf(109) * WHITE_PITCH) / 2;
function blackCenterX(midi) {
	const pc = midi % 12;
	const cx = whiteLeftEdge(midi - pc);
	const B = BLACK_WIDTH_BOTTOM;
	if (pc === 1 || pc === 3) return cx + (pc === 1 ? (3 * WHITE_PITCH - 2 * B) / 3 : .04273333333333334) + B / 2;
	const fx = cx + 3 * WHITE_PITCH;
	const tail = (4 * WHITE_PITCH - 3 * B) / 4;
	const k = pc === 6 ? 0 : pc === 8 ? 1 : 2;
	return fx + (k + 1) * tail + k * B + B / 2;
}
function whiteCountFromC0(midi) {
	let n = 0;
	for (let p = 12; p < midi; p++) if (!isBlack(p)) n++;
	return n;
}
var A0_FROM_C0 = whiteCountFromC0(21);
/** Left edge of the white key `midi` (also valid for the virtual C0 below A0). */
function whiteLeftEdge(midi) {
	return LEFT_EDGE + (whiteCountFromC0(midi) - A0_FROM_C0) * WHITE_PITCH;
}
function buildKeys() {
	const keys = [];
	for (let midi = 21; midi <= 108; midi++) {
		const black = isBlack(midi);
		if (black) {
			const x = blackCenterX(midi);
			keys.push({
				midi,
				index: midi - 21,
				black,
				x,
				frontLeft: x - BLACK_WIDTH_BOTTOM / 2,
				frontRight: x + BLACK_WIDTH_BOTTOM / 2,
				tailLeft: x - BLACK_WIDTH_BOTTOM / 2,
				tailRight: x + BLACK_WIDTH_BOTTOM / 2,
				topY: BLACK_HEIGHT,
				frontZ: BLACK_FRONT_Z,
				backZ: -.15,
				pivotZ: BLACK_PIVOT_Z,
				dip: BLACK_DIP,
				playZ: -.07699999999999999,
				playZMin: -.11499999999999999,
				playZMax: -.063
			});
		} else {
			const left = whiteLeftEdge(midi);
			const right = left + WHITE_PITCH;
			keys.push({
				midi,
				index: midi - 21,
				black,
				x: (left + right) / 2,
				frontLeft: left + WHITE_GAP / 2,
				frontRight: right - WHITE_GAP / 2,
				tailLeft: left + WHITE_GAP / 2,
				tailRight: right - WHITE_GAP / 2,
				topY: 0,
				frontZ: 0,
				backZ: -.15,
				pivotZ: WHITE_PIVOT_Z,
				dip: KEY_DIP,
				playZ: -.03,
				playZMin: -.105,
				playZMax: -.01
			});
		}
	}
	for (const k of keys) {
		if (k.black) continue;
		const below = keys[k.index - 1];
		const above = keys[k.index + 1];
		if (below && below.black) k.tailLeft = below.x + BLACK_WIDTH_BOTTOM / 2 + WHITE_GAP * .6;
		if (above && above.black) k.tailRight = above.x - BLACK_WIDTH_BOTTOM / 2 - WHITE_GAP * .6;
	}
	return keys;
}
var KEYS = buildKeys();
/** Rotation of a key (radians, positive = front goes down) for depression d in [0,1]. */
function keyAngle(k, d) {
	return Math.asin(Math.min(1, d * k.dip / (k.frontZ - k.pivotZ)));
}
// src/core/random.ts
/** Integer hash -> [0, 1). */
function hash01(n, seed = 0) {
	let x = (Math.imul(n | 0, 668265261) ^ Math.imul(seed | 0, 374761393)) >>> 0;
	x = Math.imul(x ^ x >>> 15, 739982445) >>> 0;
	x = Math.imul(x ^ x >>> 12, 695872825) >>> 0;
	return ((x ^ x >>> 15) >>> 0) / 4294967296;
}
// src/performance/KeyMechanics.ts
var KEY_RETURN = .085;
var BOUNCE_V = .4;
/** the average key's return (for timing that every stroke shares: the dampers, the jack) */
var AVERAGE_RETURN = {
	dip: .02,
	time: .034
};
/**
* Depression of a released key at time dt after its release from depth d0:
* the spring's quick return, arriving at rest still moving, then a small dip
* below rest and a smaller one, settling by KEY_RETURN + 1.6 * time. Never
* negative: the key does not rise above its rest stop.
*/
function releaseCurve(d0, dt, r = AVERAGE_RETURN) {
	if (dt <= 0) return d0;
	if (dt < .085) {
		const u = dt / KEY_RETURN;
		return d0 * (.6 * (1 - u) * (1 - u) * (1 + .6 * u) + BOUNCE_V * (1 - u));
	}
	return d0 * settleDips((dt - KEY_RETURN) / r.time, r.dip);
}
/**
* Two dips after a stop (x in units of the first dip's duration): the first
* of depth `a`, the second a quarter as deep and three-fifths as long, each a
* smooth arc that leaves and meets rest gently (the felt), then nothing.
*/
function settleDips(x, a) {
	if (x <= 0) return 0;
	if (x < 1) return a * arc(x);
	const y = (x - 1) / .6;
	if (y < 1) return .25 * a * arc(y);
	return 0;
}
/** an arc over 0..1: rising quickly, falling back more slowly, meeting zero with a soft touch */
function arc(x) {
	const s = Math.sin(Math.PI * Math.pow(x, .85));
	return s * Math.sqrt(s);
}
// src/performance/ActionMechanics.ts
/** where the jack trips: about 3 mm short of the string, of a 45 mm blow */
var HAMMER_LETOFF = .935;
/** where the backcheck holds a hammer (fraction of the blow), on average: a loud blow a little lower, a soft one higher */
var HAMMER_CHECK = .6;
(() => {
	let lo = 0;
	let hi = .085;
	for (let k = 0; k < 40; k++) {
		const m = (lo + hi) / 2;
		if (releaseCurve(1, m) > .35) lo = m;
		else hi = m;
	}
	return hi;
})();
/** the key's depression at which the jack trips (let-off), and at which it is back under the butt as the key rises */
var JACK_TRIP_AT = .9;
(() => {
	let lo = 0;
	let hi = .085;
	for (let k = 0; k < 40; k++) {
		const m = (lo + hi) / 2;
		if (releaseCurve(1, m) > .6) lo = m;
		else hi = m;
	}
	return hi;
})();
// src/performance/Pedals.ts
/** how far the soft pedal brings the resting hammers toward the strings (fraction of the blow) */
var SOFT_BLOW = .35;
// src/presentation/ActionLayout.ts
var STRIKE_Y = .255;
var STRING_Z_TREBLE = -.338;
var STRING_Z_BASS = -.326;
var PLATE_Z = -.351;
var SOUNDBOARD_Z = -.375;
/** A0..E2 are copper-wound, on their own bridge, overstrung across the tenor */
var BASS_N = 20;
/** hammer: pivot to head centre, and head centre to the striking crown */
var SHANK = .115;
var CROWN = .0175;
/** hammer angle at rest (rad, the head leaning back toward the player): the crown about 45 mm from the string */
var HAMMER_REST = .39;
var HEAD_W = .0104;
/** damper lever pivot height, and its swing off the strings (rad) */
var DAMPER_PIVOT_Y = .17;
var DAMPER_SWING = .055;
var SECTIONS = [
	[20, .0132],
	[24, .0124],
	[28, .0118],
	[16, .0115]
];
var GAPS = [
	.045,
	.04,
	.035
];
var X0 = -.57;
var HAMMER_X = [];
/** centres of the gaps between sections: struts and brackets */
var STRUT_X = [];
{
	let x = X0;
	SECTIONS.forEach(([n, pitch], s) => {
		for (let i = 0; i < n; i++) HAMMER_X.push(x + pitch * (i + .5));
		x += n * pitch;
		if (s < GAPS.length) {
			STRUT_X.push(x + GAPS[s] / 2);
			x += GAPS[s];
		}
	});
}
var HAMMER_SPAN = [HAMMER_X[0] - .0066, HAMMER_X[87] + .0058];
var unisons = (i) => i < 8 ? 1 : i < 20 ? 2 : 3;
var isWound = (i) => i < 20;
var stringZ = (i) => isWound(i) ? STRING_Z_BASS : STRING_Z_TREBLE;
/** string radius (m): heavy copper-wound bass, thin steel in the treble */
var stringRadius = (i) => isWound(i) ? .0028 - .0012 * i / 19 : 58e-5 - 16e-5 * (i - 20) / 67;
/** speaking length (m): halving about every octave in the treble, foreshortened in the bass as an upright's must be */
var speakingLength = (i) => Math.min(isWound(i) ? 1.12 : 1, .052 * Math.pow(2, (87 - i) * .95 / 12));
/** string slope dx/dy: the bass on a steep diagonal, the rest nearly upright */
var stringSlope = (i) => isWound(i) ? -.42 : -.05;
/** every string of the piano (one to three per key), in key order */
var STRINGS = [];
for (let i = 0; i < 88; i++) {
	const n = unisons(i);
	const wound = isWound(i);
	const s = stringSlope(i);
	const len = Math.hypot(s, 1);
	const ux = s / len;
	const uy = 1 / len;
	const z = stringZ(i);
	const L = speakingLength(i);
	const spacing = wound ? .0034 : .0024;
	for (let k = 0; k < n; k++) {
		const x = HAMMER_X[i] + (k - (n - 1) / 2) * spacing;
		const at = (t) => [
			x + ux * t,
			STRIKE_Y + uy * t,
			z
		];
		const yPin = .434 + .017 * k + .007 * (i % 2);
		const tb = -.875 * L;
		STRINGS.push({
			key: i,
			strike: at(0),
			dir: [
				ux,
				uy,
				0
			],
			pin: at((yPin - STRIKE_Y) / uy),
			bridge: at(tb),
			hitch: at(tb - .035),
			radius: stringRadius(i),
			wound
		});
	}
}
/** first string of each key, and how many */
var STRING_START = [];
{
	let j = 0;
	for (let i = 0; i < 88; i++) {
		STRING_START.push(j);
		j += unisons(i);
	}
}
// src/presentation/ActionParts.ts
var N_DAMPED$1 = 68;
var KEYWOOD = [
	.8,
	.72,
	.56
];
var MAPLE$1 = [
	.86,
	.72,
	.52
];
var WALNUT$1 = [
	.25,
	.16,
	.1
];
var BEECH$1 = [
	.74,
	.58,
	.4
];
var BUCKSKIN$1 = [
	.72,
	.6,
	.44
];
var RED_FELT$1 = [
	.42,
	.07,
	.07
];
var GREEN_FELT$1 = [
	.17,
	.32,
	.2
];
var CLOTH = [
	.05,
	.085,
	.06
];
var STEEL = [
	.62,
	.62,
	.64
];
/** how the jack stands: its foot on the wippen (wippen-local), and where its head pushes the butt (hammer-local) */
var JACK_FOOT = [
	0,
	.012,
	.013
];
var BUTT_HEEL = [
	0,
	-.013,
	.012
];
/** how far a tripped jack swings forward from under the butt (rad) */
var JACK_TRIP = .11;
/** the wippen: its centre pin above the wippen rail, a little in front of the strings */
var WIPPEN_Y = .04;
var wippenZ = (i) => hammerPivot(i)[2] - .006;
/** the capstan, on the key's back under the wippen's heel */
var capstanZ = (i) => hammerPivot(i)[2] + .028;
var CAPSTAN_TOP = .0095;
/** the key's back: it runs from under the nameboard to just short of the strings */
var KEYBACK_FRONT = -.158;
var keyBackEnd = (i) => hammerPivot(i)[2] + .012;
/** the bridle wire's hook (wippen-local), and where the tape is fixed on the catcher (hammer-local) */
var BRIDLE_HOOK = [
	-.0035,
	.058,
	.047
];
var BRIDLE_ANCHOR = [
	-.0035,
	.026,
	.028
];
/** the spoon: its root on the wippen (wippen-local), reaching the damper lever's tail (damper-local) */
var SPOON_ROOT = [
	.00575,
	.006,
	.006
];
var DAMPER_TAIL = [[
	.00575,
	-.006,
	-.004
], [
	.00575,
	-.032,
	-.004
]];
/** the main action rail, moved back to let the jacks up in front of it: its run in the bass and in the rest */
var MAIN_RAIL_Y = [.104, .122];
/** the catcher's lower front edge (hammer-local), which lands in the backcheck */
var CATCHER_EDGE = [
	0,
	.024,
	.046
];
/** the backcheck's wire rises from the front of the wippen (wippen-local); its felt, and how far it leans out of the way */
var CHECK_ROOT = [
	.0015,
	.008,
	.046
];
var CHECK_FELT = .0055;
var CHECK_AWAY = .22;
var X_AXIS = new THREE.Vector3(1, 0, 0);
var Y_AXIS = new THREE.Vector3(0, 1, 0);
var Z_AXIS = new THREE.Vector3(0, 0, 1);
var qa = new THREE.Quaternion();
var qb = new THREE.Quaternion();
/**
* A hammer's turn for blow fraction h, not quite in a plane: leaning `lean`
* (rad at the full blow) to one side and twisting a hint about its shank, both
* growing with the blow, so that nothing moves at rest.
*/
function hammerQuaternion(i, h, lean, q) {
	const k = Math.max(0, h);
	q.setFromAxisAngle(X_AXIS, HAMMER_REST * (1 - h));
	q.multiply(qa.setFromAxisAngle(Z_AXIS, lean * k));
	return q.multiply(qb.setFromAxisAngle(Y_AXIS, .004 * (2 * hash01(i, 53) - 1) * k));
}
/** a damper's turn off its strings (`lift`), leaning with its strings in the bass and a hint to one side as it lifts */
function damperQuaternion(i, lift, lean, swing, q) {
	q.setFromAxisAngle(X_AXIS, swing * lift);
	q.premultiply(lean);
	return q.multiply(qa.setFromAxisAngle(Z_AXIS, .0015 * (2 * hash01(i, 54) - 1) * Math.max(0, lift)));
}
/** a key's hammer centre pin (as PianoInterior) */
function hammerPivot(i) {
	return [
		HAMMER_X[i],
		STRIKE_Y - SHANK,
		stringZ(i) + CROWN + stringRadius(i)
	];
}
function part$1(g, color) {
	const p = g.index ? g.toNonIndexed() : g;
	for (const k of Object.keys(p.attributes)) if (k !== "position" && k !== "normal") p.deleteAttribute(k);
	const n = p.getAttribute("position").count;
	const c = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) c.set(color, i * 3);
	p.setAttribute("color", new THREE.BufferAttribute(c, 3));
	return p;
}
var box$1 = (w, h, d, x, y, z, color) => part$1(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
/** a box from corner a to corner b */
var span = (a, b, color) => box$1(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, color);
function rod$1(a, b, r, color, seg = 8) {
	const va = new THREE.Vector3(...a);
	const vb = new THREE.Vector3(...b);
	const len = va.distanceTo(vb);
	const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
	g.translate(0, len / 2, 0);
	g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
	g.translate(a[0], a[1], a[2]);
	return part$1(g, color);
}
function merged$1(parts) {
	const g = mergeGeometries(parts);
	if (!g) throw new Error("could not merge the action parts");
	return g;
}
function instanced$1(geo, mat, count, shadows = true) {
	const g = geo.clone();
	g.setAttribute("prevInstanceMatrix", new THREE.InstancedBufferAttribute(new Float32Array(count * 16), 16));
	const m = new THREE.InstancedMesh(g, mat, count);
	m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	m.castShadow = shadows;
	m.receiveShadow = true;
	m.frustumCulled = false;
	return m;
}
function keepPrevious$1(m) {
	const prev = m.geometry.getAttribute("prevInstanceMatrix");
	prev.array.set(m.instanceMatrix.array);
	prev.needsUpdate = true;
}
function staticMesh(parts, mat, name, shadows = true) {
	const m = new THREE.Mesh(merged$1(parts), mat);
	m.castShadow = shadows;
	m.receiveShadow = true;
	m.name = name;
	return m;
}
var rotX = (p, a) => [
	p[0],
	p[1] * Math.cos(a) - p[2] * Math.sin(a),
	p[1] * Math.sin(a) + p[2] * Math.cos(a)
];
var add = (a, b) => [
	a[0] + b[0],
	a[1] + b[1],
	a[2] + b[2]
];
var sub = (a, b) => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2]
];
var dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
var ActionParts = class {
	root = new THREE.Group();
	keyBacks;
	capstans;
	wippens;
	jacks;
	heels;
	tails;
	spoons;
	tape;
	checks;
	checkFelts;
	/** the backcheck in its own frame (origin at its root, as set for a held key and an average check): where its felt meets the catcher, and which way it faces */
	checkFace = [
		0,
		0,
		0
	];
	checkNormal = [
		0,
		0,
		0
	];
	checkPad = [
		0,
		0,
		0
	];
	moving;
	/** per key: the key back's rest transform (before the key turns), the wippen's heel (wippen-local) and jack rest length */
	backRest = [];
	capRest = [];
	heelLocal = [];
	jackLen0 = [];
	tapeLen = [];
	spoonTip = [];
	opts;
	m4 = new THREE.Matrix4();
	q = new THREE.Quaternion();
	q2 = new THREE.Quaternion();
	p = new THREE.Vector3();
	s = new THREE.Vector3();
	xAxis = new THREE.Vector3(1, 0, 0);
	up = new THREE.Vector3(0, 1, 0);
	dir = new THREE.Vector3();
	turn = new THREE.Matrix4();
	tmp = new THREE.Matrix4();
	tmp2 = new THREE.Matrix4();
	scl = new THREE.Vector3();
	unit = new THREE.Vector3(1, 1, 1);
	feltScale = new THREE.Vector3();
	/** the instanced parts that stand in rows, instance i beside i ± 1 (for InteriorLighting's slot shading) */
	rows() {
		return [
			this.wippens,
			this.jacks,
			this.checks,
			this.checkFelts
		];
	}
	constructor(opts) {
		this.opts = opts;
		this.root.name = "ActionParts";
		const { wood, steel, brass, cloth, felt } = opts;
		for (let i = 0; i < 88; i++) {
			const k = KEYS[i];
			const P = hammerPivot(i);
			const z0 = KEYBACK_FRONT;
			const z1 = keyBackEnd(i);
			const dx = P[0] - k.x;
			const len = Math.hypot(dx, z0 - z1);
			const yaw = Math.atan2(dx, z1 - z0);
			const mid = new THREE.Vector3((k.x + P[0]) / 2, -.0105, (z0 + z1) / 2);
			this.backRest.push(new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromAxisAngle(this.up, yaw), new THREE.Vector3(.0095, .02, len)));
			const zc = capstanZ(i);
			const xc = k.x + dx * (z0 - zc) / (z0 - z1);
			this.capRest.push([
				xc,
				999999999999994e-19,
				zc
			]);
			const W = [
				P[0],
				WIPPEN_Y,
				wippenZ(i)
			];
			this.heelLocal.push([
				0,
				-.0305,
				zc - W[2]
			]);
			const foot = add(W, JACK_FOOT);
			const heel = add(P, rotX(BUTT_HEEL, HAMMER_REST));
			this.jackLen0.push(dist(foot, heel));
			const hookAtStrike = add(W, rotX(BRIDLE_HOOK, this.wippenAngle(i, keyAngle(k, 1))));
			const anchorAtStrike = add(P, BRIDLE_ANCHOR);
			this.tapeLen.push(1.07 * Math.max(dist(add(W, BRIDLE_HOOK), add(P, rotX(BRIDLE_ANCHOR, HAMMER_REST))), dist(hookAtStrike, anchorAtStrike)));
			if (i < N_DAMPED$1) {
				const tail = new THREE.Vector3(...DAMPER_TAIL[1]).applyQuaternion(opts.leans[i]).add(new THREE.Vector3(...opts.dampPivot[i]));
				this.spoonTip.push(sub([
					tail.x,
					tail.y,
					tail.z + .0016 + .0012
				], W));
			}
		}
		this.keyBacks = instanced$1(part$1(new THREE.BoxGeometry(1, 1, 1), KEYWOOD), wood, 88);
		this.capstans = instanced$1(merged$1([part$1(new THREE.CylinderGeometry(.0035, .0035, .008, 12).translate(0, .004, 0), [
			1,
			1,
			1
		]), part$1(new THREE.SphereGeometry(.0035, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .4, 1).translate(0, .008, 0), [
			1,
			1,
			1
		])]), brass, 88, false);
		this.wippens = instanced$1(this.wippenGeometry(), wood, 88);
		this.jacks = instanced$1(this.jackGeometry(), wood, 88);
		this.heels = instanced$1(merged$1([box$1(.0104, .002, .014, 0, -.012, .009, BUCKSKIN$1), rod$1([
			-.0056,
			0,
			0
		], [
			.0056,
			0,
			0
		], 9e-4, STEEL, 6)]), wood, 88, false);
		this.tails = instanced$1(merged$1([rod$1(DAMPER_TAIL[0], DAMPER_TAIL[1], 55e-5, STEEL, 5), box$1(.0016, .004, .0024, DAMPER_TAIL[1][0], DAMPER_TAIL[1][1] + .001, DAMPER_TAIL[1][2] + 4e-4, RED_FELT$1)]), wood, N_DAMPED$1, false);
		this.spoons = instanced$1(merged$1([part$1(new THREE.CylinderGeometry(55e-5, 55e-5, 1, 5, 1).translate(0, .5, 0), [
			1,
			1,
			1
		])]), brass, N_DAMPED$1, false);
		{
			const i = 40;
			const P = hammerPivot(i);
			const root = add([
				P[0],
				WIPPEN_Y,
				wippenZ(i)
			], rotX(CHECK_ROOT, this.wippenAngle(i, keyAngle(KEYS[i], 1))));
			const th = HAMMER_REST * (1 - HAMMER_CHECK);
			const K = add(P, rotX(CATCHER_EDGE, th));
			const e = CATCHER_EDGE;
			const my = -(e[1] * Math.sin(th) + e[2] * Math.cos(th));
			const mz = e[1] * Math.cos(th) - e[2] * Math.sin(th);
			const ml = Math.hypot(my, mz);
			this.checkNormal = [
				0,
				-my / ml,
				-mz / ml
			];
			this.checkFace = sub(K, root);
		}
		const n = this.checkNormal;
		const tang = [
			0,
			-n[2],
			n[1]
		];
		if (tang[2] > 0) tang[1] = -tang[1], tang[2] = -tang[2];
		this.checkPad = [
			0,
			.0025 * tang[1],
			.0025 * tang[2]
		];
		const F = add(this.checkFace, this.checkPad);
		const back = sub(F, [
			0,
			n[1] * .0115,
			n[2] * .0115
		]);
		const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, n[1], n[2]));
		const block = new THREE.BoxGeometry(.006, .006, .011).applyQuaternion(align);
		const mid = sub(F, [
			0,
			n[1] * .0085,
			n[2] * .0085
		]);
		this.checks = instanced$1(merged$1([rod$1([
			0,
			0,
			0
		], [
			0,
			back[1],
			back[2]
		], 7e-4, STEEL, 6), part$1(block.translate(0, mid[1], mid[2]), BEECH$1)]), wood, 88, false);
		this.checkFelts = instanced$1(part$1(new THREE.BoxGeometry(.0062, 1, .0115).translate(0, .5, 0), [
			.93,
			.9,
			.84
		]), felt, 88, false);
		this.moving = [
			this.keyBacks,
			this.capstans,
			this.wippens,
			this.jacks,
			this.heels,
			this.tails,
			this.spoons,
			this.checks,
			this.checkFelts
		];
		this.root.add(...this.moving);
		const SEG = 10;
		const nV = 1936;
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nV * 3), 3).setUsage(THREE.DynamicDrawUsage));
		geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(nV * 3), 3).setUsage(THREE.DynamicDrawUsage));
		const idx = [];
		for (let i = 0; i < 88; i++) for (let s = 0; s < SEG; s++) {
			const a = (i * 11 + s) * 2;
			idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
		geo.setIndex(idx);
		this.tape = new THREE.Mesh(geo, cloth);
		this.tape.name = "BridleTapes";
		this.tape.frustumCulled = false;
		this.tape.castShadow = false;
		this.tape.receiveShadow = true;
		this.root.add(this.tape);
		this.root.add(this.buildStatic(wood, steel));
	}
	/** the wippen's turn (rad, about its centre pin; negative lifts its heel) for a key turned by `a` */
	wippenAngle(i, a) {
		const c = this.capstanTop(i, a);
		const [, Y, Z] = this.heelLocal[i];
		const R = Math.hypot(Y, Z);
		const beta = Math.atan2(Z, Y);
		return Math.acos(Math.max(-1, Math.min(1, (c[1] - WIPPEN_Y) / R))) - beta;
	}
	/** the capstan's top for a key turned by `a` (about its balance pin) */
	capstanTop(i, a) {
		const k = KEYS[i];
		const r = this.capRest[i];
		const p = rotX([
			0,
			CAPSTAN_TOP - PIVOT_Y,
			r[2] - k.pivotZ
		], a);
		return [
			r[0],
			PIVOT_Y + p[1],
			k.pivotZ + p[2]
		];
	}
	/** wippen-local: its body turning in the flange, the heel down to the capstan, the bridle wire at its front */
	wippenGeometry() {
		const heel = this.heelLocal[40];
		return merged$1([
			span([
				-.0035,
				-.006,
				-.004
			], [
				.0035,
				.008,
				.048
			], BEECH$1),
			span([
				-.0035,
				heel[1] + .003,
				heel[2] - .005
			], [
				.0035,
				-.006,
				heel[2] + .005
			], BEECH$1),
			span([
				-.0037,
				heel[1],
				heel[2] - .0045
			], [
				.0037,
				heel[1] + .003,
				heel[2] + .0045
			], RED_FELT$1),
			rod$1([
				-.0045,
				0,
				0
			], [
				.0045,
				0,
				0
			], 8e-4, STEEL, 6),
			rod$1([
				BRIDLE_HOOK[0],
				.008,
				.045
			], BRIDLE_HOOK, 5e-4, STEEL, 5),
			span([
				BRIDLE_HOOK[0] - 6e-4,
				BRIDLE_HOOK[1] - .001,
				BRIDLE_HOOK[2]
			], [
				BRIDLE_HOOK[0] + 6e-4,
				BRIDLE_HOOK[1] + .0012,
				BRIDLE_HOOK[2] + .003
			], STEEL),
			rod$1([
				-.0025,
				JACK_FOOT[1],
				JACK_FOOT[2]
			], [
				.0025,
				JACK_FOOT[1],
				JACK_FOOT[2]
			], 7e-4, STEEL, 6),
			span([
				-.002,
				.008,
				.026
			], [
				.002,
				.011,
				.034
			], GREEN_FELT$1)
		]);
	}
	/** jack-local (its foot at the origin, standing along +y to the butt): the shaft and the toe that meets the let-off button */
	jackGeometry() {
		const L = this.jackLen0[40];
		return merged$1([
			span([
				-.002,
				-.003,
				-.0028
			], [
				.002,
				L,
				.0028
			], MAPLE$1),
			span([
				-.002,
				.001,
				.0028
			], [
				.002,
				.006,
				.013
			], MAPLE$1),
			span([
				-.0021,
				L - .0025,
				-.003
			], [
				.0021,
				L,
				.003
			], BUCKSKIN$1)
		]);
	}
	buildStatic(wood, steel) {
		const g = new THREE.Group();
		g.name = "ActionStatic";
		const W = [];
		const S = [];
		const B = [];
		const F = [];
		const [x0, x1] = HAMMER_SPAN;
		const kx0 = KEYS[0].x - .015;
		const kx1 = KEYS[87].x + .015;
		W.push(span([
			kx0 - .02,
			-.052,
			-.352
		], [
			kx1 + .02,
			-.046,
			-.16
		], CLOTH));
		W.push(span([
			kx0,
			-.046,
			-.284
		], [
			kx1,
			-.0245,
			-.242
		], MAPLE$1.map((c) => c * .85)));
		for (const k of KEYS) {
			const x = k.x + (HAMMER_X[k.index] - k.x) * (KEYBACK_FRONT - k.pivotZ) / (KEYBACK_FRONT - keyBackEnd(k.index));
			W.push(part$1(new THREE.CylinderGeometry(.0052, .0052, .003, 10).translate(x, -.023, k.pivotZ), k.black ? RED_FELT$1 : GREEN_FELT$1));
			S.push(rod$1([
				x,
				-.03,
				k.pivotZ
			], [
				x,
				.0035,
				k.pivotZ
			], .0011, STEEL, 6));
		}
		const runs = [[
			x0 - .006,
			HAMMER_X[19] + .007,
			19
		], [
			HAMMER_X[20] - .007,
			x1 + .006,
			30
		]];
		for (const [a, b, i] of runs) {
			const P = hammerPivot(i);
			W.push(span([
				a,
				-.03,
				keyBackEnd(i) - .003
			], [
				b,
				-.023,
				keyBackEnd(i) + .014
			], MAPLE$1.map((c) => c * .8)));
			W.push(span([
				a,
				-.023,
				keyBackEnd(i) - .003
			], [
				b,
				-.0207,
				keyBackEnd(i) + .014
			], RED_FELT$1));
			W.push(span([
				a,
				.02,
				wippenZ(i) - .006
			], [
				b,
				.034,
				wippenZ(i) + .006
			], WALNUT$1));
			W.push(span([
				a,
				MAIN_RAIL_Y[0],
				P[2] - .016
			], [
				b,
				MAIN_RAIL_Y[1],
				P[2] - .002
			], MAPLE$1.map((c) => c * .8)));
			const lo = this.letOffButton(i);
			W.push(span([
				a,
				lo[1] + .016,
				lo[2] - .004
			], [
				b,
				lo[1] + .026,
				lo[2] + .006
			], WALNUT$1));
		}
		for (let i = 0; i < 88; i++) {
			const P = hammerPivot(i);
			const Wz = wippenZ(i);
			for (const s of [-1, 1]) W.push(span([
				P[0] + s * .0036,
				.034,
				Wz - .005
			], [
				P[0] + s * .0049,
				.046,
				Wz + .005
			], MAPLE$1));
			B.push(rod$1([
				P[0],
				.028,
				Wz + .006
			], [
				P[0],
				.028,
				Wz + .0075
			], .0016, STEEL, 8));
			B.push(rod$1([
				P[0],
				(MAIN_RAIL_Y[0] + MAIN_RAIL_Y[1]) / 2,
				P[2] - .0025
			], [
				P[0],
				(MAIN_RAIL_Y[0] + MAIN_RAIL_Y[1]) / 2,
				P[2] - .001
			], .0018, STEEL, 8));
			const lo = this.letOffButton(i);
			F.push(part$1(new THREE.CylinderGeometry(.0032, .0032, .004, 10).translate(lo[0], lo[1] + .002, lo[2]), [
				.9,
				.86,
				.76
			]));
			S.push(rod$1([
				lo[0],
				lo[1] + .004,
				lo[2]
			], [
				lo[0],
				lo[1] + .017,
				lo[2]
			], 6e-4, STEEL, 5));
			if (i < N_DAMPED$1) {
				const d = this.opts.dampPivot[i];
				S.push(rod$1([
					d[0] + .0033,
					d[1],
					d[2] - .004
				], [
					d[0] + .0083,
					d[1],
					d[2] - .004
				], 7e-4, STEEL, 6));
				B.push(rod$1([
					d[0] + .0058,
					.165,
					d[2] + .0035
				], [
					d[0] + .0058,
					.165,
					d[2] + .005
				], .0014, STEEL, 8));
			}
		}
		const zp = (hammerPivot(30)[2] + hammerPivot(10)[2]) / 2;
		for (const x of [
			x0 - .012,
			...STRUT_X,
			x1 + .012
		]) for (const [y, z] of [
			[.27, zp + .03],
			[.124, zp + .018],
			[.035, zp + .04]
		]) {
			S.push(rod$1([
				x - .0045,
				y,
				z
			], [
				x - .006,
				y,
				z
			], .0058, STEEL, 6), rod$1([
				x - .004,
				y,
				z
			], [
				x - .0045,
				y,
				z
			], .0075, STEEL, 12));
			S.push(rod$1([
				x + .004,
				y,
				z
			], [
				x + .0058,
				y,
				z
			], .0045, STEEL, 6));
		}
		g.add(staticMesh(W, wood, "ActionRailsAndFrame"), staticMesh(S, steel, "ActionPinsAndBolts", false), staticMesh(B, this.opts.brass, "ActionScrews", false), staticMesh(F, this.opts.felt, "LetOffButtons", false));
		return g;
	}
	/** where key i's let-off button sits: just above the jack's toe as the key reaches let-off depth */
	letOffButton(i) {
		const k = KEYS[i];
		const a = keyAngle(k, JACK_TRIP_AT);
		const phi = this.wippenAngle(i, a);
		const W = [
			HAMMER_X[i],
			WIPPEN_Y,
			wippenZ(i)
		];
		const foot = add(W, rotX(JACK_FOOT, phi));
		const d = sub(add(hammerPivot(i), rotX(BUTT_HEEL, HAMMER_REST * (1 - HAMMER_LETOFF))), foot);
		const toe = add(foot, rotX([
			0,
			.0035,
			.012
		], Math.atan2(d[2], d[1])));
		return [
			W[0],
			toe[1] + 8e-4,
			toe[2]
		];
	}
	/** pose the mechanism for a frame */
	update(f) {
		const { m4, q, q2, p, s, xAxis, up, dir } = this;
		const one = s.set(1, 1, 1);
		const tapePos = this.tape.geometry.getAttribute("position");
		const tapeNrm = this.tape.geometry.getAttribute("normal");
		const tp = tapePos.array;
		const tn = tapeNrm.array;
		for (let i = 0; i < 88; i++) {
			const k = KEYS[i];
			const a = keyAngle(k, Math.max(0, f.keys[i]));
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			const turn = this.turn.set(1, 0, 0, 0, 0, ca, -sa, PIVOT_Y - (ca * PIVOT_Y - sa * k.pivotZ), 0, sa, ca, k.pivotZ - (sa * PIVOT_Y + ca * k.pivotZ), 0, 0, 0, 1);
			this.keyBacks.setMatrixAt(i, this.tmp.multiplyMatrices(turn, this.backRest[i]));
			const cr = this.capRest[i];
			this.capstans.setMatrixAt(i, this.tmp.multiplyMatrices(turn, this.tmp2.makeTranslation(cr[0], cr[1], cr[2])));
			const phi = this.wippenAngle(i, a);
			const W = [
				HAMMER_X[i],
				WIPPEN_Y,
				wippenZ(i)
			];
			q.setFromAxisAngle(xAxis, phi);
			this.wippens.setMatrixAt(i, m4.compose(p.set(W[0], W[1], W[2]), q, one));
			const P = hammerPivot(i);
			const theta = HAMMER_REST * (1 - f.hammers[i]);
			hammerQuaternion(i, f.hammers[i], f.leans[i], q2);
			this.heels.setMatrixAt(i, m4.compose(p.set(P[0], P[1], P[2]), q2, one));
			this.poseBackcheck(i, W, phi, P, f.checks[i], theta, f.keys[i]);
			const foot = add(W, rotX(JACK_FOOT, phi));
			const dEng = sub(add(P, rotX(BUTT_HEEL, theta)), foot);
			const dLo = sub(add(P, rotX(BUTT_HEEL, HAMMER_REST * (1 - HAMMER_LETOFF))), foot);
			const trip = f.jacks[i];
			const psi = (1 - trip) * Math.atan2(dEng[2], dEng[1]) + trip * (Math.atan2(dLo[2], dLo[1]) + JACK_TRIP);
			const len = (1 - trip) * Math.hypot(dEng[1], dEng[2]) + trip * Math.hypot(dLo[1], dLo[2]);
			q.setFromAxisAngle(xAxis, psi);
			this.jacks.setMatrixAt(i, m4.compose(p.set(foot[0], foot[1], foot[2]), q, this.scl.set(1, len / this.jackLen0[40], 1)));
			if (i < N_DAMPED$1) {
				const dp = this.opts.dampPivot[i];
				damperQuaternion(i, f.dampers[i], this.opts.leans[i], DAMPER_SWING, q);
				this.tails.setMatrixAt(i, m4.compose(p.set(dp[0], dp[1], dp[2]), q, one));
				const root = add(W, rotX(SPOON_ROOT, phi));
				const tip = add(W, rotX(this.spoonTip[i], phi));
				dir.set(tip[0] - root[0], tip[1] - root[1], tip[2] - root[2]);
				const l = dir.length();
				q.setFromUnitVectors(up, dir.divideScalar(l));
				this.spoons.setMatrixAt(i, m4.compose(p.set(root[0], root[1], root[2]), q, this.scl.set(1, l, 1)));
			}
			const A = add(P, rotX(BRIDLE_ANCHOR, theta));
			const B = add(W, rotX(BRIDLE_HOOK, phi));
			const c = dist(A, B);
			const L = this.tapeLen[i];
			const sag = c < L ? Math.sqrt(3 * c * (L - c) / 8) : 0;
			let ny = -(A[2] - B[2]);
			let nz = A[1] - B[1];
			if (nz > 0) {
				ny = -ny;
				nz = -nz;
			}
			const nl = Math.hypot(ny, nz) || 1;
			ny /= nl;
			nz /= nl;
			const sway = f.bridles[i];
			const SEG = 10;
			for (let k2 = 0; k2 <= SEG; k2++) {
				const u = k2 / SEG;
				const b = 4 * u * (1 - u);
				const x = B[0] + (A[0] - B[0]) * u + sway * b;
				const y = B[1] + (A[1] - B[1]) * u + ny * sag * b;
				const z = B[2] + (A[2] - B[2]) * u + nz * sag * b;
				const db = 4 - 8 * u;
				const ty = A[1] - B[1] + ny * sag * db;
				const tz = A[2] - B[2] + nz * sag * db;
				const tl = Math.hypot(ty, tz) || 1;
				const o = (i * 11 + k2) * 2 * 3;
				tp[o] = x - .0016;
				tp[o + 1] = y;
				tp[o + 2] = z;
				tp[o + 3] = x + .0016;
				tp[o + 4] = y;
				tp[o + 5] = z;
				tn[o] = tn[o + 3] = 0;
				tn[o + 1] = tn[o + 4] = -tz / tl;
				tn[o + 2] = tn[o + 5] = ty / tl;
			}
		}
		for (const m of this.moving) m.instanceMatrix.needsUpdate = true;
		tapePos.needsUpdate = true;
		tapeNrm.needsUpdate = true;
	}
	/**
	* The backcheck on key i's wippen: leaning so that its felt meets the
	* catcher where this stroke's check is (the felt at rest on the catcher's
	* way), out of the way while the key is up, and its felt squeezed by however
	* far the catcher has sunk into it.
	*/
	poseBackcheck(i, W, phi, P, check, theta, depth) {
		const root = add(W, rotX(CHECK_ROOT, phi));
		const K = add(P, rotX(CATCHER_EDGE, HAMMER_REST * (1 - check)));
		const F = this.checkFace;
		const n = this.checkNormal;
		const miss = (psi) => {
			const f = rotX(F, psi);
			const nn = rotX(n, psi);
			return (K[1] - root[1] - f[1]) * nn[1] + (K[2] - root[2] - f[2]) * nn[2];
		};
		let psi = 0;
		for (let k = 0; k < 4; k++) {
			const m0 = miss(psi);
			const d = (miss(psi + 1e-4) - m0) / 1e-4;
			if (Math.abs(d) < 1e-9) break;
			psi -= m0 / d;
		}
		const u = Math.min(1, Math.max(0, (depth - .5) / .4));
		psi += CHECK_AWAY * (1 - u * u * (3 - 2 * u));
		const { m4, q, p } = this;
		q.setFromAxisAngle(this.xAxis, psi);
		this.checks.setMatrixAt(i, m4.compose(p.set(root[0], root[1], root[2]), q, this.unit));
		const face = add(root, rotX(F, psi));
		const nn = rotX(n, psi);
		const edge = add(P, rotX(CATCHER_EDGE, theta));
		const into = -((edge[1] - face[1]) * nn[1] + (edge[2] - face[2]) * nn[2]);
		const thick = CHECK_FELT - Math.min(.8 * CHECK_FELT, Math.max(0, into));
		const backC = add(root, rotX(sub(add(F, this.checkPad), [
			0,
			n[1] * CHECK_FELT,
			n[2] * CHECK_FELT
		]), psi));
		this.dir.set(0, nn[1], nn[2]);
		this.q2.setFromUnitVectors(this.up, this.dir);
		this.checkFelts.setMatrixAt(i, m4.compose(p.set(root[0], backC[1], backC[2]), this.q2, this.feltScale.set(1, thick, 1)));
	}
	/** remember the moving parts' transforms as the shutter opened */
	keepPrevious() {
		for (const m of this.moving) keepPrevious$1(m);
	}
};
// src/presentation/InteriorLight.ts
/** GLSL, after ambient occlusion in every interior material (PianoInterior): light from the room, through the opening */
var CAVITY = `
#ifdef MP_INTERIOR
{
  vec3 mpN = normalize(vWNormal);
  if (!gl_FrontFacing) mpN = -mpN;
  // how much of what the surface faces is the opening (the rest is the dark inside of the case, which bounces a little)
  float mpSky = mpOpenSky(vWPos, mpN);
  reflectedLight.indirectDiffuse *= mix(uMpInner, 1.0, mpSky);
  vec3 mpV = normalize(cameraPosition - vWPos);
  vec3 mpR = reflect(-mpV, mpN);
  reflectedLight.indirectSpecular *= mix(uMpInner * 0.6, 1.0, mpThrough(vWPos, mpR, 0.12 + 0.6 * roughnessFactor));
  #if defined(MP_ROWS) && defined(USE_INSTANCING)
  {
    // the slot beside a neighbour standing level: its faces see out only near its mouth
    vec3 mpON = normalize(vMpONormal);
    float mpL = clamp(-mpON.x, 0.0, 1.0) * vMpRow.x;
    float mpRt = clamp(mpON.x, 0.0, 1.0) * vMpRow.y;
    float mpOcc = max(mpL, mpRt);
    float mpGap = mpL > mpRt ? vMpRow.z : vMpRow.w;
    vec2 mpLo = vOPos.yz - vMpRowBox.xz;
    vec2 mpHi = vMpRowBox.yw - vOPos.yz;
    float mpD = max(0.0, min(min(mpLo.x, mpHi.x), min(mpLo.y, mpHi.y)));
    float mpOpen = mpGap / (mpGap + 2.0 * mpD);
    // and the faces beside it darken toward its edge
    float mpEx = clamp((vOPos.x - vMpRowX.x) / max(1e-4, vMpRowX.y - vMpRowX.x), 0.0, 1.0);
    float mpEdge = (1.0 - smoothstep(0.0, 0.3, mpEx)) * vMpRow.x + (1.0 - smoothstep(0.0, 0.3, 1.0 - mpEx)) * vMpRow.y;
    float mpE = 1.0 - MP_ROW_EDGE_K * clamp(mpEdge, 0.0, 1.0) * (1.0 - abs(mpON.x));
    float mpK = mix(1.0, mpOpen, mpOcc) * mpE;
    reflectedLight.indirectDiffuse *= mpK;
    reflectedLight.indirectSpecular *= mpK;
    float mpKd = mix(1.0, min(1.0, 2.5 * mpOpen), mpOcc) * mix(1.0, mpE, 0.8);
    reflectedLight.directDiffuse *= mpKd;
    reflectedLight.directSpecular *= mpKd;
  }
  #endif
}
#endif
`;
// src/presentation/InteriorShading.ts
/** GLSL: how many metres a pixel covers here, and how much of a detail of wavelength l survives at that footprint */
var DETAIL_GLSL = `
float mpFoot() { return max(length(fwidth(vWPos)), 1e-7); }
float mpRes(float l, float f) { return 1.0 - smoothstep(0.3 * l, 1.0 * l, f); }
// a height field h (metres) as a bump on the view-space normal n, from its screen derivatives
vec3 mpBump(vec3 n, float h, float faceDir) {
  vec3 sx = dFdx(-vViewPosition);
  vec3 sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}
// dust settles on what faces up: a fine grey film, in drifts, thicker in the corners of the noise
float mpDust(vec3 p, vec3 n, float foot) {
  float up = smoothstep(0.45, 0.95, n.y);
  float drift = smoothstep(0.35, 0.8, mpFbm(p * 90.0));
  float specks = mix(0.5, step(0.8, mpHash(floor(p * 2500.0))), mpRes(0.0004, foot));
  return up * (0.25 + 0.75 * drift) * (0.6 + 0.4 * specks);
}
`;
/** GLSL for felt materials: fibres (albedo and bump), wrapped diffuse light */
var FELT_GLSL = `
float mpFeltH;      // the fibre bump, metres (set with the albedo, used for the normal)
float mpFeltFibre;  // the finest fibres, 0..1 (for the fuzz along the rim)
float mpFeltSmooth; // 1 where the felt is pressed smooth (the crown's strike line)
// matted wool: fibres about a quarter of a millimetre across, tufts of a millimetre, and clumps
float mpFelt(vec3 p, float foot) {
  float w1 = mpRes(0.0003, foot) * (1.0 - 0.6 * mpFeltSmooth);
  float w2 = mpRes(0.0012, foot) * (1.0 - 0.4 * mpFeltSmooth);
  float w3 = mpRes(0.005, foot);
  float a = mpNoise(p * 3300.0);
  float b = mpNoise(p * 5600.0 + 3.1);
  float c = mpNoise(p * 850.0 + 7.3);
  float d = mpNoise(p * 210.0 + 1.7);
  // stray fibres: a few darker and lighter flecks, finer than the rest
  float w0 = mpRes(0.00018, foot) * (1.0 - 0.7 * mpFeltSmooth);
  float e = mpNoise(p * 9000.0 + 11.0);
  float fleck = smoothstep(0.72, 0.9, e) - smoothstep(0.1, 0.28, e) * 0.6;
  mpFeltFibre = mix(0.5, 0.5 * (a + b), w1);
  mpFeltH = w1 * 0.000022 * (0.55 * a + 0.45 * b) + w2 * 0.000036 * c;
  return 1.0 + w0 * 0.05 * fleck + w1 * 0.1 * (a + b - 1.0) + w2 * 0.065 * (2.0 * c - 1.0) + w3 * 0.045 * (2.0 * d - 1.0);
}
// light that wanders into the wool: diffuse wrapped a little past the terminator, coming back warmer there
vec3 mpFeltWrap(float nl) {
  const float W = 0.45;
  float w = clamp((nl + W) / (1.0 + W), 0.0, 1.0);
  float s = clamp(1.0 - abs(nl - 0.05) * 2.2, 0.0, 1.0);
  return w * mix(vec3(1.0), vec3(1.0, 0.82, 0.64), 0.55 * s);
}
`;
/** after normal_fragment_maps: the fibres in the normal, fading out toward the silhouette (where a bump only makes sparks) */
var FELT_NORMAL = `
{
  vec3 mpN0 = normal;
  float mpNV0 = abs(dot(mpN0, normalize(vViewPosition)));
  normal = normalize(mix(mpN0, mpBump(mpN0, mpFeltH, faceDirection), smoothstep(0.1, 0.5, mpNV0)));
}`;
/** before opaque_fragment: fibres catching the light along the silhouette */
var FELT_FUZZ = `
{
  float mpNV = clamp(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)), 0.0, 1.0);
  float mpRim = pow(1.0 - mpNV, 3.0);
  outgoingLight += min(totalDiffuse, vec3(1.5)) * mpRim * (0.5 + mpFeltFibre) * 0.25;
}`;
/**
* Turn a patched MeshPhysicalMaterial into felt: wrapped diffuse light (its
* direct lights reach a little past the terminator), sheen that varies with
* the fibres, and the fuzzy rim. Call after patch(); chains its onBeforeCompile.
*/
function feltify(mat) {
	const inner = mat.onBeforeCompile;
	mat.onBeforeCompile = (shader, renderer) => {
		inner.call(mat, shader, renderer);
		const chunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace("vec3 irradiance = dotNL * directLight.color;", "vec3 irradiance = dotNL * directLight.color;\n	vec3 mpWrapIrr = mpFeltWrap( dot( geometryNormal, directLight.direction ) ) * directLight.color;").replace("irradiance *= sheenEnergyComp;", "irradiance *= sheenEnergyComp;\n		mpWrapIrr *= sheenEnergyComp;").replace("reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );", "reflectedLight.directDiffuse += mpWrapIrr * diffuseBRDF * ( 1.0 - F );");
		if (!chunk.includes("mpWrapIrr * diffuseBRDF") || !chunk.includes("mpWrapIrr *= sheenEnergyComp")) throw new Error("felt: three.js lighting chunk changed");
		shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_pars_fragment>", chunk).replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\nmaterial.sheenColor *= (0.6 + 0.8 * mpFeltFibre) * smoothstep(0.02, 0.3, abs(dot(normal, normalize(vViewPosition))));").replace("#include <opaque_fragment>", `${FELT_FUZZ}\n#include <opaque_fragment>`);
	};
	return mat;
}
/**
* The hammers' numbers: the ten digits in a plain, slightly heavy face, as a
* rubber stamp would print them, drawn once into a strip (digit d in the d-th
* tenth), softened a little as ink on wool is.
*/
function digitsTexture() {
	if (typeof document === "undefined") return new THREE.DataTexture(/* @__PURE__ */ new Uint8Array(4), 1, 1);
	const W = 64;
	const H = 96;
	const c = document.createElement("canvas");
	c.width = 640;
	c.height = H;
	const g = c.getContext("2d");
	g.fillStyle = "#000";
	g.fillRect(0, 0, 640, H);
	g.fillStyle = "#fff";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.filter = "blur(1.2px)";
	g.font = `600 ${Math.round(H * .86)}px "Courier New", Courier, "Nimbus Mono PS", monospace`;
	for (let d = 0; d < 10; d++) g.fillText(String(d), W * (d + .5), H * .54);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.NoColorSpace;
	t.anisotropy = 8;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	return t;
}
/** GLSL: the head's number stamped in ink, and the underfelt's U on the sides */
var HAMMER_GLSL = `
flat varying float vHammer;
varying vec3 vONormal;
// how much ink: the number n stamped centred on q (metres; reading along +x, its digits h high, up along +y),
// as a rubber stamp leaves it on felt: the ink uneven, a little smudged, missing here and there
float mpStamp(vec2 q, float n, float h, float foot) {
  float tens = floor(n / 10.0);
  float ones = n - 10.0 * tens;
  float nd = tens > 0.0 ? 2.0 : 1.0;
  float w = 0.62 * h;              // a digit's advance
  vec2 c = vec2(q.x / w + 0.5 * nd, q.y / h + 0.5);
  if (c.x < -0.2 || c.x > nd + 0.2 || c.y < -0.2 || c.y > 1.2) return 0.0;
  float k = clamp(floor(c.x), 0.0, nd - 1.0);
  float d = nd > 1.5 && k < 0.5 ? tens : ones;
  // the stamp was pressed a little crooked, each one its own way
  vec2 u = vec2(c.x - k, c.y);
  float j = mpHash(vec3(n, 2.0, 9.0)) - 0.5;
  u = vec2(0.5, 0.5) + mat2(1.0, j * 0.12, -j * 0.12, 1.0) * (u - 0.5);
  float ink = texture2D(uDigits, vec2((d + clamp(u.x, 0.0, 1.0)) / 10.0, clamp(u.y, 0.0, 1.0))).r;
  ink *= step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);
  // uneven ink: lighter where the stamp met the fibres less, a few gaps
  float pres = 0.55 + 0.45 * smoothstep(0.2, 0.75, mpNoise(vec3(q * 2600.0, n)));
  float gaps = mix(1.0, smoothstep(0.15, 0.45, mpNoise(vec3(q * 9000.0, n + 3.0))), mpRes(0.0004, foot));
  // a stamp too small to read is a faint smudge
  float box = smoothstep(-0.2, 0.1, c.x) * (1.0 - smoothstep(nd - 0.1, nd + 0.2, c.x)) * smoothstep(-0.2, 0.1, c.y) * (1.0 - smoothstep(0.9, 1.2, c.y));
  return mix(0.25 * box, ink * pres * gaps, mpRes(h * 0.5, foot));
}
// the underfelt's U on a side of the head (y, z about its centre): the distance to its line, and whether inside it
vec2 mpU(float y, float z, vec4 u) {
  float t = y / u.z;
  if (abs(t) >= 1.0) return vec2(length(vec2(abs(y) - u.z, max(0.0, z - u.x))), 0.0);
  float s = max(1.0 - t * t, 1e-4);
  float g = pow(s, 0.42);
  float F = (u.x - z) / u.y - g;
  float dg = 0.42 * pow(s, -0.58) * (-2.0 * y / (u.z * u.z));
  return vec2(abs(F) / length(vec2(dg, 1.0 / u.y)), F < 0.0 ? 1.0 : 0.0);
}
`;
/** GLSL: the plate's gold paint, metal flakes in lacquer over sand-cast iron */
var GOLD_GLSL = `
float mpFlakeFade;
// a flake's tilt: each cell of a 0.3 mm grid holds one flake, turned its own way
vec3 mpFlake(vec3 p) {
  vec3 c = floor(p / 0.0003);
  return vec3(mpHash(c), mpHash(c + 17.1), mpHash(c + 43.7)) * 2.0 - 1.0;
}
`;
/** after roughnessmap: sharp flakes up close, a smooth satin where they are too small to see */
var GOLD_ROUGH = `
{
  float mpF = mpFoot();
  mpFlakeFade = mpRes(0.0006, mpF);
  roughnessFactor = mix(0.42, 0.32, mpFlakeFade) + (mpFbm(vWPos * 220.0) - 0.5) * 0.1;
}`;
/** after normal_fragment_maps: the flakes and the casting's pebbling in the base layer's normal (the clear coat stays smooth) */
var GOLD_NORMAL = `
{
  float mpF = mpFoot();
  float mpCast = mpRes(0.0015, mpF) * 0.00004 * mpFbm(vWPos * 700.0) + mpRes(0.004, mpF) * 0.00006 * mpNoise(vWPos * 230.0);
  normal = mpBump(normal, mpCast, faceDirection);
  vec3 mpT = mat3(viewMatrix) * mpFlake(vWPos);
  normal = normalize(normal + mpT * 0.11 * mpFlakeFade);
}`;
/**
* GLSL: wood grain for the action's parts, which are coloured by vertex: the
* grain runs along each instanced part (object y) and along the static rails
* (world x); felt strips and cloth (strongly red or green, or near-white)
* get felt fibres instead, and metal none.
*/
var WOOD_GLSL = `
float mpWoodness(vec3 c) {
  float r = max(c.r, 1e-3);
  float gr = c.g / r;
  float br = c.b / r;
  return smoothstep(0.25, 0.4, gr) * (1.0 - smoothstep(0.92, 1.0, gr)) * (1.0 - smoothstep(0.68, 0.8, br)) * smoothstep(0.08, 0.16, r);
}
float mpClothness(vec3 c) {
  float r = max(c.r, 1e-3);
  float red = 1.0 - smoothstep(0.22, 0.32, c.g / r);
  float green = smoothstep(1.2, 1.4, c.g / r);
  float white = smoothstep(0.76, 0.84, dot(c, vec3(0.33))) * (1.0 - smoothstep(0.06, 0.12, max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b))));
  return max(max(red, green), white) * smoothstep(0.05, 0.12, r + c.g);
}
// steel among the wood: neutral grey, neither dark iron paint nor white cloth
float mpMetalness(vec3 c) {
  float l = dot(c, vec3(0.33));
  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  return (1.0 - smoothstep(0.03, 0.06, chroma)) * smoothstep(0.35, 0.45, l) * (1.0 - smoothstep(0.72, 0.8, l));
}
// fine straight grain (maple, beech): growth lines across the part, wandering a little, with ray flecks
float mpGrain(vec3 p, float foot) {
  #ifdef USE_INSTANCING
  vec3 q = p.yxz;   // along the part
  #else
  vec3 q = p;       // along the rail
  #endif
  float wander = mpFbm(vec3(q.x * 25.0, q.y * 300.0, q.z * 300.0)) * 6.0;
  float lines = 0.5 + 0.5 * sin((q.y * 0.8 + q.z * 0.6) * 5200.0 + wander);
  float w = mpRes(0.0012, foot);
  float fleck = step(0.93, mpNoise(vec3(q.x * 900.0, q.y * 2600.0, q.z * 2600.0))) * mpRes(0.0008, foot);
  return 1.0 + w * (0.07 * (mpFbm(vec3(q.x * 6.0, q.y * 140.0, q.z * 140.0)) - 0.5) * 2.0 - 0.09 * smoothstep(0.55, 1.0, lines)) - 0.06 * fleck;
}
`;
/** The plate's cast lettering as a height field across its top: R the raised letters, G a wider blur of them (for the shadow they cast). */
var LETTERING = {
	x0: -.62,
	x1: .62,
	y0: .4805,
	y1: .5045
};
function letteringTexture(maker) {
	if (typeof document === "undefined") return new THREE.DataTexture(/* @__PURE__ */ new Uint8Array(4), 1, 1);
	const W = 4096;
	const H = Math.round(W * (LETTERING.y1 - LETTERING.y0) / (LETTERING.x1 - LETTERING.x0));
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d");
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	const atX = (x) => (x - LETTERING.x0) / (LETTERING.x1 - LETTERING.x0) * W;
	const draw = (color, blur) => {
		g.filter = `blur(${blur}px)`;
		g.fillStyle = color;
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.font = `700 ${Math.round(H * .66)}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
		g.letterSpacing = `${Math.round(H * .12)}px`;
		g.fillText(maker.toUpperCase(), atX(0), H * .54);
		g.font = `700 ${Math.round(H * .36)}px Georgia, "Times New Roman", serif`;
		g.letterSpacing = `${Math.round(H * .08)}px`;
		g.fillText("OVERSTRUNG", atX(-.4), H * .54);
		g.fillText("FULL IRON FRAME", atX(.4), H * .54);
		g.fillRect(atX(-.16), H * .9, atX(.16) - atX(-.16), H * .05);
	};
	g.globalCompositeOperation = "lighter";
	draw("#ff0000", 1.4);
	draw("#00ff00", 5);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.NoColorSpace;
	t.anisotropy = 8;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	return t;
}
/** GLSL: the cast letters on the plate's front face, raised a millimetre */
var LETTERING_NORMAL = `
if (vWNormal.z > 0.9 && vWPos.y > ${LETTERING.y0.toFixed(4)} && vWPos.y < ${LETTERING.y1.toFixed(4)}) {
  vec2 mpUV = vec2((vWPos.x - ${LETTERING.x0.toFixed(4)}) / ${(LETTERING.x1 - LETTERING.x0).toFixed(4)}, (vWPos.y - ${LETTERING.y0.toFixed(4)}) / ${(LETTERING.y1 - LETTERING.y0).toFixed(4)});
  vec2 mpE = vec2(1.0 / 4096.0, 1.0 / 80.0);
  float mpHx = texture2D(uLetters, mpUV + vec2(mpE.x, 0.0)).r - texture2D(uLetters, mpUV - vec2(mpE.x, 0.0)).r;
  float mpHy = texture2D(uLetters, mpUV + vec2(0.0, mpE.y)).r - texture2D(uLetters, mpUV - vec2(0.0, mpE.y)).r;
  // height 0.9 mm; the gradient in metres
  vec2 mpG = vec2(mpHx / (2.0 * mpE.x * ${(LETTERING.x1 - LETTERING.x0).toFixed(4)}), mpHy / (2.0 * mpE.y * ${(LETTERING.y1 - LETTERING.y0).toFixed(4)})) * 0.0009;
  normal = normalize(normal - mat3(viewMatrix) * vec3(mpG, 0.0));
}`;
/** GLSL: the letters' faces a little brighter (rubbed), the iron around them in their shadow */
var LETTERING_MAP = `
if (vWNormal.z > 0.9 && vWPos.y > ${LETTERING.y0.toFixed(4)} && vWPos.y < ${LETTERING.y1.toFixed(4)}) {
  vec2 mpUV = vec2((vWPos.x - ${LETTERING.x0.toFixed(4)}) / ${(LETTERING.x1 - LETTERING.x0).toFixed(4)}, (vWPos.y - ${LETTERING.y0.toFixed(4)}) / ${(LETTERING.y1 - LETTERING.y0).toFixed(4)});
  vec4 mpL = texture2D(uLetters, mpUV);
  // the letters' faces rubbed bright, the iron in the angle around them darker with old grime
  diffuseColor.rgb *= (1.0 - 0.5 * clamp(mpL.g - mpL.r, 0.0, 1.0)) * (1.0 + 0.35 * mpL.r) * (1.0 - 0.18 * (1.0 - mpL.g));
}`;
/** The soundboard's decal: a fictional maker's gold transfer, in the alpha of a small texture. */
var DECAL = {
	x0: .19,
	x1: .31,
	y0: .3605,
	y1: .3955
};
function decalTexture(maker) {
	if (typeof document === "undefined") return new THREE.DataTexture(/* @__PURE__ */ new Uint8Array(4), 1, 1);
	const W = 1024;
	const H = Math.round(W * (DECAL.y1 - DECAL.y0) / (DECAL.x1 - DECAL.x0));
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d");
	g.clearRect(0, 0, W, H);
	g.fillStyle = "#fff";
	g.strokeStyle = "#fff";
	g.lineWidth = H * .025;
	const rr = (x, y, w, h, r) => {
		g.beginPath();
		g.roundRect(x, y, w, h, r);
		g.stroke();
	};
	rr(W * .02, H * .06, W * .96, H * .88, H * .44);
	g.lineWidth = H * .01;
	rr(W * .035, H * .11, W * .93, H * .78, H * .39);
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.font = `italic 600 ${Math.round(H * .42)}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
	g.fillText(maker, W / 2, H * .43);
	g.font = `600 ${Math.round(H * .12)}px Georgia, "Times New Roman", serif`;
	g.letterSpacing = `${Math.round(H * .03)}px`;
	g.fillText("CONCERT UPRIGHT  ·  ESTABLISHED 1887", W / 2, H * .72);
	for (const s of [-1, 1]) {
		g.beginPath();
		g.lineWidth = H * .018;
		const x = W / 2 + s * W * .33;
		g.moveTo(x, H * .45);
		g.bezierCurveTo(x + s * W * .04, H * .2, x + s * W * .09, H * .7, x + s * W * .12, H * .45);
		g.stroke();
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.NoColorSpace;
	t.anisotropy = 8;
	return t;
}
/** GLSL (after the albedo): the decal's gold leaf, worn and cracked with age */
var DECAL_MAP = `
float mpDecal = 0.0;
if (vWPos.x > ${DECAL.x0.toFixed(4)} && vWPos.x < ${DECAL.x1.toFixed(4)} && vWPos.y > ${DECAL.y0.toFixed(4)} && vWPos.y < ${DECAL.y1.toFixed(4)}) {
  vec2 mpUV = vec2((vWPos.x - ${DECAL.x0.toFixed(4)}) / ${(DECAL.x1 - DECAL.x0).toFixed(4)}, (vWPos.y - ${DECAL.y0.toFixed(4)}) / ${(DECAL.y1 - DECAL.y0).toFixed(4)});
  mpDecal = texture2D(uDecal, mpUV).a * (0.72 + 0.28 * smoothstep(0.25, 0.6, mpFbm(vWPos * 900.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.76, 0.4), mpDecal);
}`;
// src/presentation/shaderPatch.ts
var NOISE_GLSL = `
float mpHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mpNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mpHash(i + vec3(0,0,0)), mpHash(i + vec3(1,0,0)), f.x),
                 mix(mpHash(i + vec3(0,1,0)), mpHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mpHash(i + vec3(0,0,1)), mpHash(i + vec3(1,0,1)), f.x),
                 mix(mpHash(i + vec3(0,1,1)), mpHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float mpFbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * mpNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;
/** Uniforms shared by all patched materials, updated once per frame. */
var SHARED_UNIFORMS = {
	uFingertips: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, -10, 0, 0)) },
	uBounceSH: { value: Array.from({ length: 27 }, () => new THREE.Vector3()) },
	uBounceY: { value: new THREE.Vector3(-.45, .07, .45) },
	uBounce: { value: 0 }
};
/** GLSL: irradiance from probe o (three's shGetIrradianceAt), and the height blend of the three */
var BOUNCE_GLSL = `
vec3 mpSH(int o, vec3 n) {
  vec3 r = uBounceSH[o] * 0.886227;
  r += uBounceSH[o + 1] * 1.023328 * n.y;
  r += uBounceSH[o + 2] * 1.023328 * n.z;
  r += uBounceSH[o + 3] * 1.023328 * n.x;
  r += uBounceSH[o + 4] * 0.858086 * n.x * n.y;
  r += uBounceSH[o + 5] * 0.858086 * n.y * n.z;
  r += uBounceSH[o + 6] * (0.743125 * n.z * n.z - 0.247708);
  r += uBounceSH[o + 7] * 0.858086 * n.x * n.z;
  r += uBounceSH[o + 8] * 0.429043 * (n.x * n.x - n.y * n.y);
  return max(r, vec3(0.0));
}
vec3 mpBounce(vec3 p, vec3 n) {
  float a = clamp((p.y - uBounceY.x) / (uBounceY.y - uBounceY.x), 0.0, 1.0);
  float b = clamp((p.y - uBounceY.y) / (uBounceY.z - uBounceY.y), 0.0, 1.0);
  return p.y < uBounceY.y ? mix(mpSH(0, n), mpSH(9, n), a) : mix(mpSH(9, n), mpSH(18, n), b);
}
`;
var nextId = 0;
function glslType(v) {
	if (typeof v === "number") return "float";
	if (v instanceof THREE.Vector2) return "vec2";
	if (v instanceof THREE.Vector3 || v instanceof THREE.Color) return "vec3";
	if (v instanceof THREE.Vector4) return "vec4";
	if (v instanceof THREE.Matrix4) return "mat4";
	if (v instanceof THREE.Texture) return "sampler2D";
	return "float";
}
function patch(mat, o) {
	const key = "mp" + nextId++;
	mat.customProgramCacheKey = () => key;
	mat.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, SHARED_UNIFORMS, o.uniforms ?? {});
		let vs = shader.vertexShader;
		let fs = shader.fragmentShader;
		const decl = Object.entries(o.uniforms ?? {}).map(([k, u]) => `uniform ${glslType(u.value)} ${k};`).join("\n");
		vs = vs.replace("#include <common>", `#include <common>
varying vec3 vWPos;
varying vec3 vWNormal;
varying vec3 vOPos;
${o.masks ? "attribute vec4 color;\nvarying vec3 vMask;" : ""}
${decl}
${o.vertexHead ?? ""}`);
		if (o.afterBegin) vs = vs.replace("#include <begin_vertex>", `#include <begin_vertex>\n${o.afterBegin}`);
		vs = vs.replace("#include <project_vertex>", `#include <project_vertex>
{
  vec4 mpL = vec4(transformed, 1.0);
  vec3 mpN = objectNormal;
  #ifdef USE_INSTANCING
  mpL = instanceMatrix * mpL;
  mpN = mat3(instanceMatrix) * mpN;
  #endif
  vec4 mpW = modelMatrix * mpL;
  vWPos = mpW.xyz;
  vWNormal = normalize(mat3(modelMatrix) * mpN);
  vOPos = transformed;
  ${o.masks ? "vMask = color.rgb;" : ""}
}
${o.vertexEnd ?? ""}`);
		fs = fs.replace("#include <common>", `#include <common>
varying vec3 vWPos;
varying vec3 vWNormal;
varying vec3 vOPos;
${o.masks ? "varying vec3 vMask;" : ""}
uniform vec4 uFingertips[10];
uniform vec3 uBounceSH[27];
uniform vec3 uBounceY;
uniform float uBounce;
${NOISE_GLSL}
${BOUNCE_GLSL}
${decl}
${o.fragHead ?? ""}`);
		const after = (inc, code) => {
			if (code) fs = fs.replace(`#include <${inc}>`, `#include <${inc}>\n${code}`);
		};
		after("map_fragment", o.afterMap);
		after("roughnessmap_fragment", o.afterRough);
		after("metalnessmap_fragment", o.afterMetal);
		after("normal_fragment_maps", o.afterNormal);
		after("emissivemap_fragment", o.afterEmissive);
		const bounce = o.bounce ?? 1;
		if (bounce > 0) fs = fs.replace("#include <aomap_fragment>", `if (uBounce > 0.0) reflectedLight.indirectDiffuse += uBounce * ${bounce.toFixed(3)} * mpBounce(vWPos, normalize(vWNormal)) * BRDF_Lambert(material.diffuseColor);
#include <aomap_fragment>`);
		after("aomap_fragment", o.afterAO);
		if (o.beforeOpaque) fs = fs.replace("#include <opaque_fragment>", `${o.beforeOpaque}\n#include <opaque_fragment>`);
		shader.vertexShader = vs;
		shader.fragmentShader = fs;
	};
	return mat;
}
// src/presentation/PianoInterior.ts
/** which way the hammers' numbers face: upright to someone looking in from the keys */
var STAMP_UP = 1;
/** the piano's (invented) maker, cast into the plate and on the soundboard's decal (as on the nameboard) */
var MAKER = "Halloran & Vey";
var N_DAMPED = 68;
/** the hammer rest rail is this far above the hammer pivots, which stand at about this depth */
var RAIL_H = .045;
var RAIL_PIVOT_Z = (pivotOf(30)[2] + pivotOf(10)[2]) / 2;
/** the damper lift rail's height */
var LIFT_RAIL_Y = DAMPER_PIVOT_Y + .03;
var INNER_X = .665;
/** a part for a merged mesh: non-indexed, positions and normals, a flat vertex colour */
function part(g, color) {
	const p = g.index ? g.toNonIndexed() : g;
	for (const k of Object.keys(p.attributes)) if (k !== "position" && k !== "normal") p.deleteAttribute(k);
	const n = p.getAttribute("position").count;
	const c = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) c.set(color, i * 3);
	p.setAttribute("color", new THREE.BufferAttribute(c, 3));
	return p;
}
var box = (w, h, d, x, y, z, color) => part(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
/** a cylinder between two points */
function rod(a, b, r, color, seg = 8) {
	const va = new THREE.Vector3(...a);
	const vb = new THREE.Vector3(...b);
	const len = va.distanceTo(vb);
	const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
	g.translate(0, len / 2, 0);
	g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
	g.translate(a[0], a[1], a[2]);
	return part(g, color);
}
function merged(parts) {
	const g = mergeGeometries(parts);
	if (!g) throw new Error("could not merge the piano interior");
	return g;
}
/** a flat strip of width w along a polyline in the xy plane, from z0 (back) to z1 (front) */
function strip(points, w, z0, z1, color) {
	const parts = [];
	for (let i = 0; i + 1 < points.length; i++) {
		const [x0, y0] = points[i];
		const [x1, y1] = points[i + 1];
		const len = Math.hypot(x1 - x0, y1 - y0);
		if (len < 1e-5) continue;
		const g = new THREE.BoxGeometry(len + w * .02, w, z1 - z0);
		g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
		g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
		parts.push(part(g, color));
	}
	return merged(parts);
}
function instanced(geo, mat, count) {
	const g = geo.clone();
	g.setAttribute("prevInstanceMatrix", new THREE.InstancedBufferAttribute(new Float32Array(count * 16), 16));
	const m = new THREE.InstancedMesh(g, mat, count);
	m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	m.castShadow = true;
	m.receiveShadow = true;
	m.frustumCulled = false;
	return m;
}
/** remember the current instance transforms as the previous ones */
function keepPrevious(m) {
	const prev = m.geometry.getAttribute("prevInstanceMatrix");
	prev.array.set(m.instanceMatrix.array);
	prev.needsUpdate = true;
}
var STRING_VS_HEAD = `
attribute vec2 aSwing;  // peak swing at mid-span (m): toward the soundboard, and across
attribute vec2 aSpan;   // the speaking length, from the bridge to the top bearing (0..1 from the hitch pin)
varying float vLat;
varying float vHalfPx;
varying float vRad;
varying float vSwing;
varying vec3 vSideV;
varying vec3 vFrontV;
`;
var STRING_VS = `
{
  vec3 mpL = transformed;
  vec3 mpAx = instanceMatrix[1].xyz;
  float mpR = length(instanceMatrix[0].xyz);
  vec3 mpA = instanceMatrix[3].xyz + mpAx * mpL.y;
  vec3 mpT = normalize(mpAx);
  vec3 mpCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vec3 mpS = cross(mpT, mpCam - mpA);
  float mpSl = length(mpS);
  mpS = mpSl > 1e-6 ? mpS / mpSl : normalize(cross(mpT, vec3(0.0, 0.0, 1.0)));
  vec3 mpF = cross(mpS, mpT);
  // the swing here: the string's first mode between its bearings, in the
  // hammer's plane (toward the soundboard) and, growing, across it
  float mpEnv = sin(3.14159265 * clamp((mpL.y - aSpan.x) / (aSpan.y - aSpan.x), 0.0, 1.0));
  vec3 mpPz = normalize(vec3(0.0, 0.0, 1.0) - mpT * mpT.z);
  vec3 mpPx = cross(mpT, mpPz);
  float mpSw = mpEnv * length(vec2(aSwing.x * dot(mpS, mpPz), aSwing.y * dot(mpS, mpPx)));
  // a pixel at this distance (uViewH: the target's height in pixels)
  vec4 mpV = modelViewMatrix * vec4(mpA, 1.0);
  float mpPx1 = max(-mpV.z, 1e-4) * 2.0 / (projectionMatrix[1][1] * uViewH);
  // the ribbon: the wire and its swing, at least a pixel wide, with room for the edge filter
  float mpW = max(mpR + mpSw, 0.5 * mpPx1) + 0.75 * mpPx1;
  vec3 mpQ = mpA + mpS * (mpW * mpL.x) + mpF * (mpR * mpL.z);
  transformed = (inverse(instanceMatrix) * vec4(mpQ, 1.0)).xyz;
  vLat = mpW * mpL.x;
  vHalfPx = 0.5 * mpPx1;
  vRad = mpR;
  vSwing = mpSw;
  vSideV = mat3(modelViewMatrix) * mpS;
  vFrontV = mat3(modelViewMatrix) * mpF;
}`;
var STRING_FS_HEAD = `
varying float vLat;
varying float vHalfPx;
varying float vRad;
varying float vSwing;
varying vec3 vSideV;
varying vec3 vFrontV;
// the integral of asin(clamp(y / a)): over the swing, the share of time a point
// at y is passed by the wire's centre, accumulated
float mpG(float y, float a) {
  return abs(y) >= a ? 1.5707963 * abs(y) : y * asin(y / a) + sqrt(a * a - y * y);
}
`;
var STRING_COVERAGE = `
{
  float mpH = max(vHalfPx, 1e-7);
  float mpAa = max(vSwing, 1e-4 * vRad);
  float mpR = vRad;
  float mpC = ((mpG(vLat + mpH + mpR, mpAa) - mpG(vLat - mpH + mpR, mpAa)) - (mpG(vLat + mpH - mpR, mpAa) - mpG(vLat - mpH - mpR, mpAa))) / (3.14159265 * 2.0 * mpH);
  mpC = clamp(mpC, 0.0, 1.0);
  if (mpC < 0.003) discard;
  diffuseColor.a *= mpC;
}`;
var STRING_NORMAL = `
{
  float mpE = vRad + vSwing;
  float mpRes = smoothstep(0.75, 2.5, mpE / vHalfPx);
  float mpX = clamp(vLat / mpE, -1.0, 1.0) * mix(1.0, 0.3, vSwing / mpE) * mpRes;
  vec3 mpN = normalize(normalize(vSideV) * mpX + normalize(vFrontV) * sqrt(max(0.0, 1.0 - mpX * mpX)));
  normal = mpN;
  #ifdef USE_CLEARCOAT
  clearcoatNormal = mpN;
  #endif
}`;
var STRING_ROUGH = `roughnessFactor = mix(max(roughnessFactor, 0.3), roughnessFactor, smoothstep(0.75, 2.5, (vRad + vSwing) / vHalfPx));`;
function materials() {
	const INSTANCE_VS_HEAD = "flat varying float vHammer;\nvarying vec3 vONormal;";
	const INSTANCE_VS = "vHammer = float(gl_InstanceID);\nvONormal = objectNormal;";
	const DUST = `
  {
    float mpD = mpDust(vWPos, vWNormal, mpFoot());
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.5, 0.47), 0.2 * mpD);
    roughnessFactor = mix(roughnessFactor, 1.0, 0.6 * mpD);
  }`;
	const digits = digitsTexture();
	const felt = feltify(patch(new THREE.MeshPhysicalMaterial({
		color: 15126958,
		roughness: 1,
		specularIntensity: .1,
		sheen: 1,
		sheenRoughness: .85,
		sheenColor: new THREE.Color(10787464)
	}), {
		uniforms: { uDigits: { value: digits } },
		vertexHead: INSTANCE_VS_HEAD,
		vertexEnd: INSTANCE_VS,
		fragHead: DETAIL_GLSL + FELT_GLSL + HAMMER_GLSL,
		afterMap: `
        float mpWoodIn = 0.0;
        {
          float mpF = mpFoot();
          vec3 mpO = vOPos - vec3(0.0, ${SHANK.toFixed(4)}, 0.0);
          float side = smoothstep(0.55, 0.85, abs(vONormal.x));
          float back = smoothstep(0.6, 0.9, vONormal.z);
          // the crown, where the strings strike
          float crown = smoothstep(${(-CROWN + .007).toFixed(4)}, ${(-CROWN + .003).toFixed(4)}, mpO.z) * (1.0 - side);
          float strike = exp(-pow(mpO.y / 0.0034, 2.0));
          mpFeltSmooth = crown * strike;
          // each head's felt a little different, the fibres moving with it
          float a = mpFelt(vOPos + vec3(vHammer * 0.0371, vHammer * 0.0213, 0.0), mpF);
          float h = mpHash(vec3(vHammer, 3.0, 7.0));
          vec3 wool = diffuseColor.rgb * a * mix(vec3(0.97, 0.98, 1.0), vec3(1.03, 1.0, 0.95), h);
          // the layers, on the sides and the back
          vec2 u = mpU(mpO.y, mpO.z, vec4(${HEAD_BACK.toFixed(4)}, ${U_DEPTH.toFixed(4)}, ${U_HALF.toFixed(4)}, 0.0));
          float layers = max(side, back);
          float line = (1.0 - smoothstep(0.00045, 0.00045 + max(0.00025, 1.5 * mpF), u.x)) * layers;
          mpWoodIn = u.y * layers * smoothstep(0.00025, 0.0006, u.x);
          vec3 beech = vec3(0.72, 0.55, 0.35) * (0.94 + 0.08 * mpNoise(vec3(vOPos.x * 300.0, vOPos.y * 4000.0, vOPos.z * 300.0)));
          vec3 c = mix(wool, beech, mpWoodIn);
          c = mix(c, vec3(0.32, 0.05, 0.05) * (0.9 + 0.2 * a), line);
          // the strike line, pressed smooth and a little yellowed, with three grooves
          float g = 0.0;
          for (int k = -1; k <= 1; k++) { float d = (mpO.x - float(k) * 0.0024) / 0.00045; g += exp(-d * d); }
          c *= mix(vec3(1.0), vec3(0.95, 0.91, 0.8) * (1.0 - 0.28 * min(g, 1.0)), mpFeltSmooth);
          // the number, stamped on the upper side by the moulding, upright to someone looking in from the keys
          float top = smoothstep(0.4, 0.7, vONormal.y) * (1.0 - side);
          vec2 sq = ${STAMP_UP.toFixed(1)} * vec2(mpO.x, ${(HEAD_BACK - .0055).toFixed(4)} - mpO.z);
          float ink = top * mpStamp(sq, vHammer + 1.0, 0.0026, mpF);
          c = mix(c, vec3(0.22, 0.2, 0.21), 0.68 * ink);
          diffuseColor.rgb = c;
          mpFeltH *= 1.0 - mpWoodIn;
        }`,
		afterRough: `roughnessFactor = mix(roughnessFactor, 0.55, mpWoodIn);${DUST}`,
		afterNormal: FELT_NORMAL,
		afterAO: CAVITY,
		bounce: .75
	}));
	felt.defines = {
		...felt.defines,
		MP_ROW_EDGE_K: "0.2"
	};
	const underfelt = patch(new THREE.MeshPhysicalMaterial({
		color: 9314329,
		roughness: .92,
		sheen: 1,
		sheenRoughness: .5,
		sheenColor: new THREE.Color(13656144)
	}), {
		afterMap: `diffuseColor.rgb *= 0.88 + 0.16 * mpNoise(vWPos * 2000.0);`,
		afterAO: CAVITY,
		bounce: .7
	});
	const damperFelt = feltify(patch(new THREE.MeshPhysicalMaterial({
		color: 15525076,
		roughness: 1,
		specularIntensity: .1,
		sheen: 1,
		sheenRoughness: .85,
		sheenColor: new THREE.Color(11051412)
	}), {
		vertexHead: INSTANCE_VS_HEAD,
		vertexEnd: INSTANCE_VS,
		fragHead: "flat varying float vHammer;\n" + DETAIL_GLSL + FELT_GLSL,
		afterMap: `diffuseColor.rgb *= mpFelt(vOPos + vec3(vHammer * 0.0371, vHammer * 0.0213, 0.0), mpFoot()) * (0.97 + 0.06 * mpHash(vec3(vHammer, 5.0, 1.0)));`,
		afterRough: DUST,
		afterNormal: FELT_NORMAL,
		afterAO: CAVITY,
		bounce: .75
	}));
	const wood = patch(new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: .62
	}), {
		fragHead: DETAIL_GLSL + FELT_GLSL + WOOD_GLSL,
		afterMap: `
    float mpCloth = 0.0;
    float mpMetal = 0.0;
    {
      float mpF = mpFoot();
      #ifdef USE_INSTANCING
      vec3 mpP = vOPos;
      #else
      vec3 mpP = vWPos;
      #endif
      float wd = mpWoodness(vColor.rgb);
      mpCloth = mpClothness(vColor.rgb);
      mpMetal = mpMetalness(vColor.rgb);
      float other = 0.95 + 0.1 * mpNoise(vWPos * 1500.0) * mpRes(0.0007, mpF);
      diffuseColor.rgb *= mix(mix(other, mpGrain(mpP, mpF), wd), mpFelt(mpP, mpF), mpCloth);
      mpFeltH *= mpCloth;
    }`,
		afterRough: `roughnessFactor = mix(mix(roughnessFactor, 1.0, mpCloth), 0.3, mpMetal);${DUST}`,
		afterMetal: `metalnessFactor = mix(metalnessFactor, 0.55, mpMetal);`,
		afterNormal: FELT_NORMAL,
		afterAO: `
    if (uBounce > 0.0) reflectedLight.indirectSpecular += mpMetal * uBounce * 0.5 * mpBounce(vWPos, normalize(vWNormal)) * material.specularColor;
    ${CAVITY}`,
		bounce: .7
	});
	const brass = patch(new THREE.MeshPhysicalMaterial({
		color: 13869644,
		metalness: .95,
		roughness: .4
	}), {
		fragHead: DETAIL_GLSL,
		afterMap: `diffuseColor.rgb *= 0.8 + 0.24 * mpFbm(vWPos * 900.0);`,
		afterRough: `roughnessFactor = clamp(roughnessFactor + (mpFbm(vWPos * 1700.0) - 0.5) * 0.2, 0.26, 0.6);${DUST}`,
		afterAO: `
    if (uBounce > 0.0) reflectedLight.indirectSpecular += uBounce * 0.55 * mpBounce(vWPos, normalize(vWNormal)) * material.specularColor;
    ${CAVITY}`,
		bounce: 1
	});
	const tape = feltify(patch(new THREE.MeshPhysicalMaterial({
		color: 15459540,
		roughness: 1,
		specularIntensity: .1,
		sheen: 1,
		sheenRoughness: .85,
		sheenColor: new THREE.Color(11051412),
		side: THREE.DoubleSide
	}), {
		fragHead: DETAIL_GLSL + FELT_GLSL,
		afterMap: `diffuseColor.rgb *= mpFelt(vWPos, mpFoot());`,
		afterRough: DUST,
		afterNormal: FELT_NORMAL,
		afterAO: CAVITY,
		bounce: .75
	}));
	const plate = patch(new THREE.MeshPhysicalMaterial({
		color: 15520644,
		metalness: .38,
		roughness: .38,
		clearcoat: .6,
		clearcoatRoughness: .18,
		specularColor: new THREE.Color(16769696)
	}), {
		uniforms: { uLetters: { value: letteringTexture(MAKER) } },
		fragHead: DETAIL_GLSL + GOLD_GLSL,
		afterMap: `
    {
      float mpF = mpFoot();
      diffuseColor.rgb *= 0.9 + 0.14 * mpFbm(vWPos * 140.0) - 0.05 * mpNoise(vWPos * 2600.0) * mpRes(0.0004, mpF);
      ${LETTERING_MAP}
    }`,
		afterRough: GOLD_ROUGH + DUST,
		afterNormal: GOLD_NORMAL + LETTERING_NORMAL,
		afterAO: `${CAVITY}
    if (uBounce > 0.0) {
      float mpBand = smoothstep(0.43, 0.47, vWPos.y) * (1.0 - smoothstep(0.508, 0.522, vWPos.y)) * smoothstep(0.5, 0.9, normalize(vWNormal).z);
      vec3 mpUp = uBounce * mpBounce(vec3(vWPos.x, 0.07, vWPos.z), vec3(0.0, -0.55, 0.83)) * vec3(1.0, 0.86, 0.66);
      reflectedLight.indirectDiffuse += 0.9 * mpBand * mpUp * BRDF_Lambert(material.diffuseColor);
      reflectedLight.indirectSpecular += 0.5 * mpBand * mpUp * material.specularColor;
    }`,
		bounce: .6
	});
	const pins = patch(new THREE.MeshPhysicalMaterial({
		color: 13817564,
		metalness: .55,
		roughness: .3,
		clearcoat: .4,
		clearcoatRoughness: .2
	}), {
		afterAO: CAVITY,
		bounce: .6
	});
	const viewH = { value: 1080 };
	return {
		felt,
		underfelt,
		damperFelt,
		wood,
		brass,
		tape,
		plate,
		pins,
		steel: patch(new THREE.MeshPhysicalMaterial({
			color: 14343392,
			metalness: 1,
			roughness: .16,
			transparent: true,
			depthWrite: false
		}), {
			uniforms: { uViewH: viewH },
			vertexHead: STRING_VS_HEAD,
			afterBegin: STRING_VS,
			fragHead: STRING_FS_HEAD,
			afterMap: STRING_COVERAGE,
			afterRough: STRING_ROUGH,
			afterNormal: STRING_NORMAL,
			afterAO: CAVITY,
			bounce: .5
		}),
		copper: patch(new THREE.MeshPhysicalMaterial({
			color: 13074768,
			metalness: .88,
			roughness: .42,
			transparent: true,
			depthWrite: false
		}), {
			uniforms: { uViewH: viewH },
			vertexHead: STRING_VS_HEAD,
			afterBegin: STRING_VS,
			fragHead: STRING_FS_HEAD,
			afterMap: `
    {
      float mpA = vWPos.y * 5200.0 + vWPos.x * 2100.0;
      float mpFade = (1.0 - smoothstep(0.4, 1.6, fwidth(mpA))) * (1.0 - smoothstep(0.3, 1.0, vSwing / vRad));
      diffuseColor.rgb *= 1.0 - 0.35 * mpFade * smoothstep(0.3, 1.0, 0.5 + 0.5 * sin(mpA));
    }
    ${STRING_COVERAGE}`,
			afterRough: STRING_ROUGH,
			afterNormal: `${STRING_NORMAL}
    {
      // the turns tilt the normal back and forth along the string
      float mpA = vWPos.y * 5200.0 + vWPos.x * 2100.0;
      float mpFade = (1.0 - smoothstep(0.4, 1.6, fwidth(mpA))) * (1.0 - smoothstep(0.3, 1.0, vSwing / vRad));
      vec3 mpAx = normalize(cross(normalize(vSideV), normalize(vFrontV)));
      normal = normalize(normal + mpAx * 0.5 * mpFade * cos(mpA));
    }`,
			afterAO: `
    if (uBounce > 0.0) reflectedLight.indirectSpecular += uBounce * 0.45 * mpBounce(vWPos, normalize(vWNormal)) * material.specularColor;
    ${CAVITY}`,
			bounce: 1
		}),
		soundboard: patch(new THREE.MeshPhysicalMaterial({
			color: 13409890,
			roughness: .42,
			clearcoat: .35,
			clearcoatRoughness: .3
		}), {
			uniforms: { uDecal: { value: decalTexture(MAKER) } },
			fragHead: DETAIL_GLSL,
			afterMap: `
    {
      vec2 sp = vec2(vWPos.x * 0.83 + vWPos.y * 0.56, vWPos.y * 0.83 - vWPos.x * 0.56);
      float mpA = sp.x * 1300.0 + mpFbm(vec3(sp * vec2(5.0, 1.2), 0.0)) * 14.0;
      float mpFade = 1.0 - smoothstep(0.5, 1.8, fwidth(mpA));
      float late = smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(mpA));
      diffuseColor.rgb *= mix(0.93, mix(1.0, 0.82, late), mpFade) * (0.9 + 0.16 * mpFbm(vec3(sp * vec2(2.0, 30.0), 3.0)));
    }
    ${DECAL_MAP}
    {
      float mpF = mpFoot();
      float mpD = (0.35 + 0.65 * smoothstep(0.3, 0.75, mpFbm(vWPos * 60.0))) * mix(0.5, step(0.82, mpHash(floor(vWPos * 2600.0))), mpRes(0.0004, mpF));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.47, 0.43), 0.12 * mpD * (1.0 - mpDecal));
    }`,
			afterRough: `roughnessFactor = mix(roughnessFactor, 0.34, mpDecal);`,
			afterMetal: `metalnessFactor = mix(metalnessFactor, 0.3, mpDecal);`,
			afterAO: CAVITY,
			bounce: .6
		}),
		bridge: patch(new THREE.MeshStandardMaterial({
			color: 9198128,
			roughness: .5
		}), {
			afterMap: `diffuseColor.rgb *= 0.85 + 0.25 * mpNoise(vWPos * vec3(30.0, 300.0, 300.0));`,
			afterAO: CAVITY,
			bounce: .6
		}),
		viewH
	};
}
var MAPLE = [
	.86,
	.72,
	.52
];
var WALNUT = [
	.25,
	.16,
	.1
];
var BUCKSKIN = [
	.72,
	.6,
	.44
];
var RED_FELT = [
	.42,
	.07,
	.07
];
var GREEN_FELT = [
	.17,
	.32,
	.2
];
var IRON = [
	.07,
	.07,
	.075
];
var WIRE = [
	.62,
	.62,
	.64
];
/**
* The hammer head, as in the footage: thick cream felt nearly as wide as the
* keys' spacing allows, longer from the moulding to the crown than it is
* tall, with a broad, round crown and soft, pillowy edges.
*/
var FELT_W = HEAD_W + 2e-4;
/** how far the felt's back (where the moulding goes in) stands behind the head's centre, and its half-height there */
var HEAD_BACK = .0125;
var HEAD_HALF = .0165;
/** the red underfelt's U, inside: from the back to its front, and the half-height of its arms */
var U_DEPTH = .0235;
var U_HALF = .0105;
var BEECH = [
	.72,
	.55,
	.35
];
/**
* A hammer's felt, around its pivot: an egg-shaped profile from the back of
* the head (zBack) over a broad rounded crown (`crown` toward the strings,
* -z) whose height is 2h; tapering from wBack wide at the moulding to wCrown
* at the crown, with soft, rounded edges (bevel); the strike line worn flat
* and pressed in by `flat`. Centred SHANK above the pivot. The wool is a
* little uneven: every vertex sits a few hundredths of a millimetre in or out.
*/
function feltShape(zBack, crown, h, wBack, wCrown, flat, bevel = .0021, K = 30, bevelSegments = 3) {
	const D = zBack + crown;
	const pts = [];
	for (let k = 0; k <= K; k++) {
		const th = -Math.PI / 2 + Math.PI * k / K;
		const y = h * Math.sin(th);
		const z = zBack - D * Math.pow(Math.max(0, Math.cos(th)), .85) + flat * Math.exp(-((y / .0016) ** 2));
		pts.push(new THREE.Vector2(z, y));
	}
	const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
		depth: wBack - 2 * bevel,
		bevelEnabled: true,
		bevelThickness: bevel,
		bevelSize: bevel,
		bevelOffset: -bevel,
		bevelSegments,
		curveSegments: 1
	});
	g.rotateY(-Math.PI / 2);
	g.translate(wBack / 2 - bevel, SHANK, 0);
	const pos = g.getAttribute("position");
	for (let i = 0; i < pos.count; i++) {
		const tau = Math.min(1, Math.max(0, (zBack - pos.getZ(i)) / D));
		pos.setX(i, pos.getX(i) * (1 - (1 - wCrown / wBack) * tau));
	}
	g.deleteAttribute("uv");
	g.deleteAttribute("normal");
	const m = mergeVertices(g, 1e-7);
	m.computeVertexNormals();
	const p = m.getAttribute("position");
	const n = m.getAttribute("normal");
	for (let i = 0; i < p.count; i++) {
		const q = [
			p.getX(i),
			p.getY(i),
			p.getZ(i)
		];
		const cell = Math.imul(Math.floor(q[0] * 900), 73856093) ^ Math.imul(Math.floor(q[1] * 900), 19349663) ^ Math.imul(Math.floor(q[2] * 900), 83492791);
		const atStrike = Math.exp(-(((q[1] - SHANK) / .004) ** 2)) * (q[2] < -crown + .004 ? 1 : 0);
		const d = (hash01(cell, 5) - .5) * 8e-5 * (1 - atStrike);
		p.setXYZ(i, q[0] + n.getX(i) * d, q[1] + n.getY(i) * d, q[2] + n.getZ(i) * d);
	}
	m.computeVertexNormals();
	return m;
}
/** the outer felt: cream, wrapping the head, with the crown that meets the string */
var hammerHead = () => feltShape(HEAD_BACK, CROWN, HEAD_HALF, FELT_W, FELT_W * .85, 45e-5);
/** the underfelt, inside the outer felt: what shows of it is its U on the sides (the felt's shader) */
var hammerUnderfelt = () => feltShape(.0117, .011 - 5e-4, .0099, FELT_W - .0018, FELT_W * .8, 0, 8e-4, 8, 1);
function hammerWood() {
	return merged([
		rod([
			0,
			.012,
			.011
		], [
			0,
			.104,
			.011
		], .0027, MAPLE),
		box(FELT_W - .0012, .015, .0095, 0, SHANK - .0035, .016, BEECH),
		box(.01, .028, .03, 0, .008, .002, BUCKSKIN),
		box(.0102, .006, .03, 0, -.008, .002, RED_FELT),
		rod([
			0,
			.03,
			.016
		], [
			0,
			.03,
			.04
		], .0019, MAPLE, 6),
		box(.008, .012, .006, 0, .03, .043, [
			.55,
			.4,
			.28
		])
	]);
}
/** damper around its lever pivot: felt pressing the strings (-z), head block, wire down to the lever beside the hammer */
function damperFeltGeo() {
	const g = new RoundedBoxGeometry(.0105, .03, .0105, 2, .0016).translate(0, .165, -.01625);
	g.deleteAttribute("uv");
	return g;
}
function damperWood() {
	return merged([
		box(.0101, .029, .0013, 0, .165, -.0104, RED_FELT),
		box(.0098, .026, .011, 0, .165, -.0045, WALNUT),
		box(.003, .006, .006, .0058, .154, -.004, WIRE)
	]);
}
/**
* The damper's wire, from its lever up beside its hammer: it rises straight up
* the gap between that hammer and the next (so no head, leaning or swinging a
* little sideways, ever touches it), to above the heads, where a second length
* bends over to the damper head on its strings.
*/
var WIRE_R = 3e-4;
var WIRE_BEND_Y = .287;
function wireUpGeo() {
	return merged([rod([
		0,
		0,
		0
	], [
		0,
		WIRE_BEND_Y - DAMPER_PIVOT_Y,
		0
	], WIRE_R, WIRE, 5), box(.0036, .014, .01, 0, 0, 0, WALNUT)]);
}
var wireBendGeo = () => rod([
	0,
	0,
	0
], [
	0,
	1,
	0
], WIRE_R, WIRE, 5);
/** key i's wire: in the middle of the gap beside its hammer, on the treble side */
function wireX(i) {
	const next = i + 1 < 88 ? HAMMER_X[i + 1] - HAMMER_X[i] : Infinity;
	const prev = i > 0 ? HAMMER_X[i] - HAMMER_X[i - 1] : Infinity;
	return HAMMER_X[i] + .5 * Math.min(next, prev);
}
/** a key's hammer pivot */
function pivotOf(i) {
	return [
		HAMMER_X[i],
		STRIKE_Y - SHANK,
		stringZ(i) + CROWN + stringRadius(i)
	];
}
var PianoInterior = class {
	root = new THREE.Group();
	hammerFelt;
	hammerUnder;
	hammerWood;
	damperFelt;
	damperWood;
	wireUp;
	wireBend;
	/** per damper: how far its head stands from its lever's pivot sideways, to sit on its own strings */
	headShift = [];
	wa = new THREE.Vector3();
	wb = new THREE.Vector3();
	wq = new THREE.Quaternion();
	wUp = new THREE.Vector3(0, 1, 0);
	wScale = new THREE.Vector3();
	parts;
	steel;
	copper;
	/** per string: its mesh and index there */
	stringSlot = [];
	swingSteel;
	swingCopper;
	/** per string: its swing as a share of its key's (unisons differ a little) */
	swingShare;
	leans = [];
	dampPivot = [];
	/** the hammer rest rail (moved toward the strings by the soft pedal) and the damper lift rail (the sustain pedal) */
	restRail;
	liftRail;
	m4 = new THREE.Matrix4();
	q = new THREE.Quaternion();
	q2 = new THREE.Quaternion();
	p = new THREE.Vector3();
	one = new THREE.Vector3(1, 1, 1);
	xAxis = new THREE.Vector3(1, 0, 0);
	size = new THREE.Vector2();
	constructor() {
		this.root.name = "Interior";
		const M = materials();
		this.hammerFelt = instanced(hammerHead(), M.felt, 88);
		this.hammerUnder = instanced(hammerUnderfelt(), M.underfelt, 88);
		this.hammerWood = instanced(hammerWood(), M.wood, 88);
		this.damperFelt = instanced(damperFeltGeo(), M.damperFelt, N_DAMPED);
		this.damperWood = instanced(damperWood(), M.wood, N_DAMPED);
		this.wireUp = instanced(wireUpGeo(), M.wood, N_DAMPED);
		this.wireBend = instanced(wireBendGeo(), M.wood, N_DAMPED);
		for (const m of [this.wireUp, this.wireBend]) m.castShadow = false;
		this.root.add(this.hammerFelt, this.hammerUnder, this.hammerWood, this.damperFelt, this.damperWood, this.wireUp, this.wireBend);
		for (let i = 0; i < N_DAMPED; i++) {
			const s = stringSlope(i);
			const r = stringRadius(i);
			const dy = .165 + DAMPER_PIVOT_Y - STRIKE_Y;
			this.dampPivot.push([
				HAMMER_X[i] + s * dy,
				DAMPER_PIVOT_Y,
				stringZ(i) + r + .0215
			]);
			this.leans.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan(-s)));
			const lean = Math.atan(-s);
			this.headShift.push(s * (.165 * Math.cos(lean) - .165) + .165 * Math.sin(lean));
		}
		this.parts = new ActionParts({
			wood: M.wood,
			steel: M.pins,
			brass: M.brass,
			cloth: M.tape,
			felt: M.damperFelt,
			cavity: CAVITY,
			dampPivot: this.dampPivot,
			leans: this.leans
		});
		this.root.add(this.parts.root);
		const nPlain = STRINGS.filter((s) => !s.wound).length;
		const nWound = STRINGS.length - nPlain;
		const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 8, true).translate(0, .5, 0);
		this.steel = instanced(cyl, M.steel, nPlain);
		this.copper = instanced(cyl, M.copper, nWound);
		this.swingSteel = new THREE.InstancedBufferAttribute(new Float32Array(nPlain * 2), 2);
		this.swingCopper = new THREE.InstancedBufferAttribute(new Float32Array(nWound * 2), 2);
		this.swingSteel.setUsage(THREE.DynamicDrawUsage);
		this.swingCopper.setUsage(THREE.DynamicDrawUsage);
		this.steel.geometry.setAttribute("aSwing", this.swingSteel);
		this.copper.geometry.setAttribute("aSwing", this.swingCopper);
		const spanSteel = new Float32Array(nPlain * 2);
		const spanCopper = new Float32Array(nWound * 2);
		this.swingShare = new Float32Array(STRINGS.length);
		this.steel.renderOrder = -2;
		this.copper.renderOrder = -1;
		for (const m of [this.steel, this.copper]) m.onBeforeRender = (renderer) => {
			const rt = renderer.getRenderTarget();
			M.viewH.value = rt ? rt.height : renderer.getDrawingBufferSize(this.size).y;
		};
		const up = new THREE.Vector3(0, 1, 0);
		let ip = 0;
		let iw = 0;
		for (const s of STRINGS) {
			const a = new THREE.Vector3(...s.hitch);
			const b = new THREE.Vector3(...s.pin);
			const len = a.distanceTo(b);
			const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
			const m = new THREE.Matrix4().compose(a, q, new THREE.Vector3(s.radius, len, s.radius));
			const L = speakingLength(s.key);
			const at = (p) => Math.hypot(p[0] - s.hitch[0], p[1] - s.hitch[1]) / len;
			const span = [at(s.bridge), at([s.strike[0] + s.dir[0] * L / 8, s.strike[1] + s.dir[1] * L / 8])];
			this.swingShare[this.stringSlot.length] = .88 + .24 * hash01(this.stringSlot.length, 9);
			if (s.wound) {
				this.copper.setMatrixAt(iw, m);
				spanCopper.set(span, iw * 2);
				this.stringSlot.push({
					wound: true,
					index: iw++
				});
			} else {
				this.steel.setMatrixAt(ip, m);
				spanSteel.set(span, ip * 2);
				this.stringSlot.push({
					wound: false,
					index: ip++
				});
			}
		}
		this.steel.geometry.setAttribute("aSpan", new THREE.InstancedBufferAttribute(spanSteel, 2));
		this.copper.geometry.setAttribute("aSpan", new THREE.InstancedBufferAttribute(spanCopper, 2));
		for (const m of [this.steel, this.copper]) {
			m.castShadow = true;
			keepPrevious(m);
		}
		this.root.add(this.steel, this.copper);
		const tuning = instanced(merged([rod([
			0,
			0,
			-.012
		], [
			0,
			0,
			.031
		], .0034, [
			1,
			1,
			1
		], 10), rod([
			0,
			0,
			.0108
		], [
			0,
			0,
			.0162
		], .0043, [
			.9,
			.9,
			.92
		], 10)]), M.pins, STRINGS.length);
		const hitch = instanced(rod([
			0,
			0,
			-.004
		], [
			0,
			0,
			.016
		], .0021, [
			1,
			1,
			1
		], 6), M.pins, STRINGS.length);
		STRINGS.forEach((s, j) => {
			const dz = s.wound ? .012 : 0;
			tuning.setMatrixAt(j, this.m4.makeTranslation(s.pin[0], s.pin[1], PLATE_Z + dz));
			hitch.setMatrixAt(j, this.m4.makeTranslation(s.hitch[0], s.hitch[1], PLATE_Z - (s.wound ? 0 : 0)));
		});
		for (const m of [tuning, hitch]) {
			m.castShadow = false;
			keepPrevious(m);
			this.root.add(m);
		}
		this.root.add(this.buildPlate(M.plate, M.pins));
		this.root.add(this.buildSoundboard(M.soundboard, M.bridge));
		this.root.add(this.buildRails(M.wood));
		this.restRail = this.buildRestRail(M.wood);
		this.liftRail = this.buildLiftRail(M.wood);
		this.root.add(this.restRail, this.liftRail);
	}
	buildPlate(gold, steel) {
		const g = new THREE.Group();
		g.name = "Plate";
		const W = [
			1,
			1,
			1
		];
		const zb = PLATE_Z - .014;
		const zc = (PLATE_Z + zb) / 2;
		const parts = [
			box(2 * INNER_X, .121, .014, 0, .927 / 2, zc, W),
			box(2 * INNER_X - .04, .012, .02, 0, .398, PLATE_Z - .004, W),
			box(.028, 1.06, .014, -.651, -.127, zc, W),
			box(.028, 1.06, .014, .651, -.127, zc, W),
			box(.74, .07, .014, -.29, -.63, zc, W)
		];
		for (const x of STRUT_X) parts.push(box(.034, 1, .016, x, -.1, PLATE_Z - .006, W), box(.02, 1, .006, x, -.1, PLATE_Z + .004, W));
		const every = STRINGS.filter((s) => !s.wound && s.hitch[1] > -.7).map((s) => [s.hitch[0], s.hitch[1]]).filter((_, j) => j % 3 === 1);
		parts.push(strip(every, .05, zb, PLATE_Z, W));
		const plate = new THREE.Mesh(merged(parts), gold);
		plate.castShadow = true;
		plate.receiveShadow = true;
		g.add(plate);
		const bolts = [];
		for (let k = 0; k < 13; k++) {
			const x = -.625 + k * (2 * INNER_X - .08) / 12;
			bolts.push(rod([
				x,
				.512,
				PLATE_Z - .002
			], [
				x,
				.512,
				PLATE_Z + .004
			], .0062, [
				.3,
				.3,
				.32
			], 6));
		}
		for (const x of STRUT_X) bolts.push(rod([
			x,
			.36,
			PLATE_Z + .004
		], [
			x,
			.36,
			PLATE_Z + .01
		], .0068, [
			.3,
			.3,
			.32
		], 6));
		const b = new THREE.Mesh(merged(bolts), steel);
		b.castShadow = true;
		g.add(b);
		return g;
	}
	buildSoundboard(spruce, wood) {
		const g = new THREE.Group();
		g.name = "Soundboard";
		const sb = new THREE.Mesh(new THREE.PlaneGeometry(2 * INNER_X, 1.1840000000000002, 1, 1).translate(0, -.136 / 2, SOUNDBOARD_Z), spruce);
		sb.receiveShadow = true;
		g.add(sb);
		const near = (x) => STRUT_X.some((sx) => Math.abs(x - sx) < .022);
		const treble = STRINGS.filter((s, j) => !s.wound && j % 3 === 1).map((s) => [s.bridge[0], s.bridge[1]]);
		const runs = [];
		let cur = [];
		for (const p of treble) if (near(p[0])) {
			if (cur.length > 1) runs.push(cur);
			cur = [];
		} else cur.push(p);
		if (cur.length > 1) runs.push(cur);
		const top = (z) => z - 6e-4;
		const parts = runs.map((r) => strip(r, .022, SOUNDBOARD_Z, top(-.338), [
			1,
			1,
			1
		]));
		const bass = STRINGS.filter((s) => s.wound).map((s) => [s.bridge[0], s.bridge[1]]);
		parts.push(strip(bass, .026, SOUNDBOARD_Z, -.3286, [
			1,
			1,
			1
		]));
		const bridges = new THREE.Mesh(merged(parts), wood);
		bridges.castShadow = true;
		bridges.receiveShadow = true;
		g.add(bridges);
		return g;
	}
	/** the static action: key frame, rails, brackets */
	buildRails(wood) {
		const [x0, x1] = HAMMER_SPAN;
		const xm = (x0 + x1) / 2;
		const w = x1 - x0 + .03;
		const zp = (pivotOf(30)[2] + pivotOf(10)[2]) / 2;
		const parts = [box(w, .012, .02, xm, .165, zp - .012, WALNUT)];
		for (const x of [
			x0 - .012,
			...STRUT_X,
			x1 + .012
		]) parts.push(box(.008, .29, .016, x, .125, zp + .05, IRON), box(.008, .016, .07, x, .124, zp + .018, IRON), box(.008, .016, .05, x, .27, zp + .03, IRON), box(.008, .03, .03, x, .035, zp + .04, IRON));
		const m = new THREE.Mesh(merged(parts), wood);
		m.castShadow = true;
		m.receiveShadow = true;
		m.name = "ActionRails";
		return m;
	}
	/**
	* The hammer rest rail: the shanks lie against its felt. The soft pedal
	* swings it toward the strings, taking every hammer a part of the way with it.
	*/
	buildRestRail(wood) {
		const [x0, x1] = HAMMER_SPAN;
		const xm = (x0 + x1) / 2;
		const w = x1 - x0 + .03;
		const restZ = RAIL_PIVOT_Z + RAIL_H * Math.tan(HAMMER_REST) + .0027 + .007;
		const m = new THREE.Mesh(merged([box(w, .014, .012, xm, .185, restZ, MAPLE.map((c) => c * .75)), box(w, .012, .003, xm, .185, restZ - .0075, GREEN_FELT)]), wood);
		m.castShadow = true;
		m.receiveShadow = true;
		m.name = "HammerRestRail";
		return m;
	}
	/**
	* The damper lift rail: a felt-faced rail behind the damper wires, a few
	* centimetres above their pivots, in two runs (the bass dampers stand
	* further forward with their strings). The sustain pedal pushes it toward
	* the player, and every damper with it.
	*/
	buildLiftRail(wood) {
		const runs = [];
		const first = (i) => this.dampPivot[i];
		const bassEnd = 19;
		const zOf = (i) => first(i)[2] - .004 - .0085;
		runs.push([
			HAMMER_X[0] - .008,
			HAMMER_X[bassEnd] + .008,
			zOf(bassEnd)
		]);
		runs.push([
			HAMMER_X[20] - .008,
			HAMMER_X[N_DAMPED - 1] + .008,
			zOf(20)
		]);
		const parts = [];
		for (const [a, b, z] of runs) parts.push(box(b - a, .012, .006, (a + b) / 2, LIFT_RAIL_Y, z, WALNUT), box(b - a, .01, .002, (a + b) / 2, LIFT_RAIL_Y, z + .004, RED_FELT));
		const m = new THREE.Mesh(merged(parts), wood);
		m.castShadow = true;
		m.receiveShadow = true;
		m.name = "DamperLiftRail";
		return m;
	}
	/** pose the action for a frame */
	update(f) {
		const { m4, q, q2, p, one, xAxis } = this;
		for (let i = 0; i < 88; i++) {
			const [x, y, z] = pivotOf(i);
			hammerQuaternion(i, f.hammers[i], f.leans[i], q);
			m4.compose(p.set(x, y, z), q, one);
			this.hammerFelt.setMatrixAt(i, m4);
			this.hammerUnder.setMatrixAt(i, m4);
			this.hammerWood.setMatrixAt(i, m4);
		}
		for (let i = 0; i < N_DAMPED; i++) {
			const [x, y, z] = this.dampPivot[i];
			damperQuaternion(i, f.dampers[i], this.leans[i], DAMPER_SWING, q);
			m4.compose(p.set(x + this.headShift[i], y, z), q, one);
			this.damperFelt.setMatrixAt(i, m4);
			this.damperWood.setMatrixAt(i, m4);
			const top = this.wb.set(.0058, .154, -.004).applyMatrix4(m4);
			q2.setFromAxisAngle(xAxis, DAMPER_SWING * f.dampers[i]);
			m4.compose(p.set(wireX(i), y, z - .004), q2, one);
			this.wireUp.setMatrixAt(i, m4);
			const bend = this.wa.set(0, WIRE_BEND_Y - y, 0).applyMatrix4(m4);
			const d = top.sub(bend);
			const len = Math.max(1e-5, d.length());
			this.wq.setFromUnitVectors(this.wUp, d.divideScalar(len));
			m4.compose(bend, this.wq, this.wScale.set(1, len, 1));
			this.wireBend.setMatrixAt(i, m4);
		}
		for (const m of [
			this.hammerFelt,
			this.hammerUnder,
			this.hammerWood,
			this.damperFelt,
			this.damperWood,
			this.wireUp,
			this.wireBend
		]) m.instanceMatrix.needsUpdate = true;
		this.parts.update(f);
		this.vibrate(f);
		const softAngle = HAMMER_REST * (1 - SOFT_BLOW * f.softPedal);
		this.restRail.position.z = RAIL_H * (Math.tan(softAngle) - Math.tan(HAMMER_REST));
		this.liftRail.position.z = (LIFT_RAIL_Y - DAMPER_PIVOT_Y) * Math.sin(DAMPER_SWING * f.damperRail);
	}
	/** each string's swing, from its key's (StringMechanics) */
	vibrate(f) {
		const vs = this.swingSteel.array;
		const vc = this.swingCopper.array;
		for (let j = 0; j < STRINGS.length; j++) {
			const i = STRINGS[j].key;
			const k = this.swingShare[j];
			const slot = this.stringSlot[j];
			const out = slot.wound ? vc : vs;
			out[slot.index * 2] = f.strings[2 * i] * k;
			out[slot.index * 2 + 1] = f.strings[2 * i + 1] * (2 - k);
		}
		this.swingSteel.needsUpdate = true;
		this.swingCopper.needsUpdate = true;
	}
	/** the instanced rows of parts, instance i beside i ± 1 (for the light between them: InteriorLight) */
	rows() {
		return [
			this.hammerFelt,
			this.hammerUnder,
			this.hammerWood,
			this.damperFelt,
			this.damperWood,
			...this.parts.rows()
		];
	}
	/** remember the moving parts' transforms as they were when the shutter opened (call after update with that frame) */
	keepPrevious() {
		for (const m of [
			this.hammerFelt,
			this.hammerUnder,
			this.hammerWood,
			this.damperFelt,
			this.damperWood,
			this.wireUp,
			this.wireBend
		]) keepPrevious(m);
		this.parts.keepPrevious();
	}
};
export { BASS_N, PianoInterior };
