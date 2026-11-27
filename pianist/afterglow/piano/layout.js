// Pure-data piano layout for the D-class grand (no three.js import; usable from Node 22 and the browser).
// All coordinates are in the PIANO FRAME (research/piano.md section 0): metres, origin on the floor (lake bed) below the
// front-left case corner, x right along the keyboard (bass -> treble), z away from the player (toward the tail), y up.
// That frame is left-handed with y up, so the scene mirrors it into the rig: rig = (KB_CENTER_X - x, y - 0.04, z)
// (DESIGN.md section 2; pianoToRig/rigToPiano below). Angles in radians unless the name says Deg.
// Source numbers: layout_d.json (tools/piano/gen_layout_d.py). Documentation: docs/PIANO.md.
import data from './layout_d.js';

export const LAYOUT = data;
export default LAYOUT;

const DEG = Math.PI / 180;
const K = data.keyboard;

export const CASE_WIDTH = data.caseWidth;               // 1.560
export const CASE_LENGTH = data.caseLength;             // 2.735
export const KB_CENTER_X = K.center;                    // 0.780 (E4|F4 boundary)
export const KEY_FRONT_Z = K.frontZ;                    // 0.022
export const WHITE_TOP_Y = K.topY;                      // 0.715
export const BLACK_TOP_Y = K.topY + K.black.height;     // 0.7275
export const RIG_Y_OFFSET = -0.04;                      // piano floor = lake bed, 4 cm under the water surface

/** Balance axis: a line parallel to x through (y, z). Pressing a key rotates it by +angle (front goes down). */
export const BALANCE_AXIS = Object.freeze({ y: K.pivot.y, z: K.pivot.z });
/** Full key dip as rotation about the balance axis (white 10 mm at the front = 2.14 deg; black ~9 mm = 2.46 deg). */
export const KEY_DIP_RAD = Object.freeze({ white: K.whiteDipDeg * DEG, black: K.blackDipDeg * DEG });
export const UNA_CORDA_SHIFT_X = K.unaCordaShiftX;      // keys + action move +x by this at full una corda

// ---------------------------------------------------------------------------------------------- frames
export function pianoToRig([x, y, z]) { return [KB_CENTER_X - x, y + RIG_Y_OFFSET, z]; }
export function rigToPiano([x, y, z]) { return [KB_CENTER_X - x, y - RIG_Y_OFFSET, z]; }

// ---------------------------------------------------------------------------------------------- keys
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function clipZ(poly, lo, hi) {
  const clip = (pts, inside, inter) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) out.push(inter(a, b)); } return out; };
  const at = (a, b, v) => { const t = (v - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, v]; };
  let p = clip(poly, (q) => q[1] >= lo, (a, b) => at(a, b, lo));
  p = clip(p, (q) => q[1] <= hi, (a, b) => at(a, b, hi));
  return p;
}
/** Inset an axis-aligned rectilinear polygon (CCW or CW) by d (works for the key outlines, which are rectilinear). */
function insetRectilinear(poly, d) {
  const n = poly.length; const ccw = polyArea(poly) > 0; const s = ccw ? 1 : -1; const out = [];
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], p = poly[i], b = poly[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    const n1 = [-e1[1] / l1 * s, e1[0] / l1 * s], n2 = [-e2[1] / l2 * s, e2[0] / l2 * s]; // inward normals
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);   // miter offset: d at straight runs, d*(n1+n2) at right angles
    out.push([p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k]);
  }
  return out;
}

const FALLBOARD_FACE_Z = K.fallboardOpen.faceZ;        // 0.172: visible key tops end here
const blackKeys = data.keys.filter((k) => k.color === 'black');

/**
 * Per-key data (index 0..87, note n = index + 1, MIDI = n + 20).
 *  topPolygon   white: head + tail outline of the keytop (x, z), black: top surface rectangle (x, z)
 *  topY         keytop height at rest
 *  contact      where a fingertip may touch: top polygon clipped to the visible length (front .. fallboard - 4 mm)
 *               and inset 0.6 mm from the filleted edges. Black-key boxes never overlap it (they sit in the slots).
 *  head / tail  white keys: the front 50 mm full-width part and the narrow part between the black keys
 *  blackBox     black keys: base footprint (x, z) + y range of the sharp body
 *  frontZ / frontTopEdge  front edge of the playing surface (white: z 0.022; black: sloped front top at z 0.080)
 *  dipRad       full-dip rotation; frontDip = vertical travel of the front top edge at full dip
 */
export const KEYS = data.keys.map((k) => {
  const black = k.color === 'black';
  const top = k.top_xz.map((p) => [p[0], p[1]]);
  const dipRad = black ? KEY_DIP_RAD.black : KEY_DIP_RAD.white;
  const zEnd = FALLBOARD_FACE_Z - 0.004;
  const contact = black ? insetRectilinear(top, 0.0012) : insetRectilinear(clipZ(top, KEY_FRONT_Z, zEnd), 0.0006);
  const out = {
    index: k.n - 1, n: k.n, midi: k.midi, name: k.name, color: k.color, black,
    xCenter: k.x_center, topY: k.top_y, topPolygon: top, contact,
    dipRad, frontZ: black ? K.black.frontZ + K.black.frontSlope : KEY_FRONT_Z,
  };
  if (black) {
    out.blackBox = { xz: k.base_xz.map((p) => [p[0], p[1]]), yMin: K.topY - K.keytopThk, yMax: k.top_y };
  } else {
    const zh = KEY_FRONT_Z + K.headLen; const g = K.gap / 2;
    out.xRange = k.x_range.slice(); out.tailX = k.tail_x.slice();
    out.head = [[k.x_range[0] + g, KEY_FRONT_Z], [k.x_range[1] - g, KEY_FRONT_Z], [k.x_range[1] - g, zh], [k.x_range[0] + g, zh]];
    out.tail = [[k.tail_x[0] + g, zh], [k.tail_x[1] - g, zh], [k.tail_x[1] - g, zEnd], [k.tail_x[0] + g, zEnd]];
  }
  out.frontDip = (BALANCE_AXIS.z - out.frontZ) * Math.sin(dipRad);
  return out;
});

/** Black-key boxes (footprint + height range) for collision tests, index aligned with blackKeys order. */
export const BLACK_KEY_BOXES = blackKeys.map((k) => ({ n: k.n, xz: k.base_xz.map((p) => [p[0], p[1]]), yMin: K.topY - K.keytopThk, yMax: k.top_y }));

/** Where a rest-pose point of key n ends up when the key is rotated by `angle` (rad) and shifted by una corda dx. */
export function keyPoint(n, angle, [x, y, z], dx = 0) {
  const py = BALANCE_AXIS.y, pz = BALANCE_AXIS.z; const c = Math.cos(angle), s = Math.sin(angle);
  const yy = y - py, zz = z - pz;
  return [x + dx, py + yy * c + zz * s, pz - yy * s + zz * c];
}
/** Height of key n's top surface above the plan point z when rotated by angle (exact for the flat keytop). */
export function keyTopYAt(n, z, angle) { return keyPoint(n, angle, [0, KEYS[n - 1].topY, z])[1]; }
/** Key angle that brings the top surface at plan z down by `drop` metres (inverse of keyTopYAt, small angles exact enough). */
export function angleForDrop(n, z, drop) { const r = BALANCE_AXIS.z - z; return Math.asin(Math.min(1, Math.max(-1, drop / Math.max(1e-6, r)))); }

// ---------------------------------------------------------------------------------------------- hammers
// research/piano.md 6: shank horizontal at rest on the flange pin at y ~0.765, crown 51 mm above the shank axis and
// 125 mm from the pin (head-size scaled per note), blow 46 mm, check 16 mm under the string.
// ANGLE CONVENTION (unchanged since session 1; perf/lib/keys.js uses the same formula): the hammer angle is the rotation
// of the rigid shank+head about the flange pin, 0 = rest, + = toward the string, and the crown point rides the circle
// of radius R = hypot(cy, Ls) about the pin, so rise(a) = R sin(a + a0) - cy.
// GEOMETRY (session 5, critic fix): the pin sits where that circle puts the crown exactly on the string's underside at
// the layout strike point at strikeAng (zPin = zStrike - (Ls cos a_s - cy sin a_s)), and the head is bored by a_s
// (tilted toward the tail at rest) so it stands perpendicular to the string plane at the blow; at rest the crown is
// ~31 mm behind the strike point and 46 mm below the string.
const HA = data.action;
export const HAMMER = Object.freeze({ shankLen: 0.125, crownAboveShank: 0.051, headH0: 0.082, headH1: 0.076, blow: HA.blowDistance, checkBelow: HA.checkBelowString, letoff: 0.002 });
function hammerFrame(q) {
  const t = (q.n - 1) / 87;
  const Hh = HAMMER.headH0 + (HAMMER.headH1 - HAMMER.headH0) * t;
  const sy = Hh / HAMMER.headH0, cy = HAMMER.crownAboveShank * sy, Ls = HAMMER.shankLen;
  const H = data.heights; const bass = q.n <= 20;
  const yFront = bass ? H.bassAgraffe : H.tenorStrings, yBridge = bass ? H.bassBridgeTop + 0.0012 : H.longBridgeTop + 0.0008;
  const yStr = yFront + (yBridge - yFront) * (q.strike_from_front / q.speaking_length);
  const yUnder = yStr - q.wire_d_mm / 2000;                  // underside of the (outer) wire at the strike point
  const R = Math.hypot(cy, Ls), a0 = Math.atan2(cy, Ls);
  const angForRise = (dy) => Math.asin(Math.min(1, (cy + dy) / R)) - a0;
  const strikeAng = angForRise(HAMMER.blow), checkAng = angForRise(HAMMER.blow - HAMMER.checkBelow);
  const yPin = yUnder - HAMMER.blow - cy;
  const zPin = q.strike_xz[1] - (Ls * Math.cos(strikeAng) - cy * Math.sin(strikeAng));
  return {
    n: q.n, x: q.hammer_x, headH: Hh, scaleY: sy, cy, shankLen: Ls, R, a0, strikeAng, checkAng, bore: strikeAng,
    flange: [q.hammer_x, yPin, zPin], strikePoint: [q.strike_xz[0], yUnder, q.strike_xz[1]],
    // round 2 (critic r2 hammer_pairs): the yawed bass heads (notes 1-20, yaw 9.8-13.1 deg) swept through their resting
    // neighbours (~1.8 mm): a head yawed by th swinging about the x-parallel flange pin moves its corners ~17 mm in z,
    // i.e. ~17 tan(th) mm across the neighbour's slanted face. Bass heads 10.0 mm wide (was 11.5) and every head yawed
    // at 0.6 x the string angle (action.js; bass 5.9-7.9 deg, tenor <= 3.9 deg): tools/piano/check_hammer_sweep.mjs
    depth: 0.032 + (0.013 - 0.032) * t, width: bass ? 0.0100 : 0.0115 + (0.0100 - 0.0115) * t, yawScale: 0.6,
  };
}
/** Per-note hammer data (index = note - 1): flange pin [x,y,z], crown offsets, strike / check angles, head size. */
export const HAMMERS = data.notes.map(hammerFrame);
/** Crown rise above rest (m) at hammer angle a (rad). */
export function hammerRiseForAngle(n, a) { const h = HAMMERS[n - 1]; return h.R * Math.sin(a + h.a0) - h.cy; }
/** Hammer angle (rad) for a crown rise y (m) above rest (same formula as perf/lib/keys.js hammerAngle). */
export function hammerAngleForRise(n, y) { const h = HAMMERS[n - 1]; return Math.asin(Math.min(1, (h.cy + y) / h.R)) - h.a0; }
/** Crown point [x, y, z] of hammer n at angle a (piano frame). */
export function hammerCrown(n, a) {
  const h = HAMMERS[n - 1]; const [x, y, z] = h.flange; const c = Math.cos(a), s = Math.sin(a);
  return [x, y + h.cy * c + h.shankLen * s, z - h.cy * s + h.shankLen * c];
}

// ---------------------------------------------------------------------------------------------- pedals
const LY = data.lyre;
const PEDAL_ARM = LY.pedalPivotZ - LY.pedalTipZ;      // 0.165 pivot -> tip (plan)
export const PEDAL_MAX_RAD = Object.freeze({
  unaCorda: Math.atan(LY.pedalTravelTip.unaCorda / PEDAL_ARM),
  sostenuto: Math.atan(LY.pedalTravelTip.sostenuto / PEDAL_ARM),
  sustain: Math.atan(LY.pedalTravelTip.sustain / PEDAL_ARM),   // 12 mm at the tip = 4.16 deg
});
const PEDAL_PIVOT_Y = LY.pedalTreadY - 0.006;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (e0, e1, v) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
/** pedal loft constants (geom/legs.js builds the brass pedal from pedalSection; the solver reads the same numbers) */
export const PEDAL_SHAPE = Object.freeze({ padLen: 0.110, upturn: 0.003, corner: 0.002, nose: 0.009, padThick: 0.008, neckThick: 0.011 });
/**
 * Cross-section of the pedal at plan z (rest pose, piano frame): width w, thickness, top height yTop. The pad is the
 * front 110 mm (40 mm wide at the toe -> 30 mm), 8 mm thick, with a 3 mm toe rise (radius ~2 m); the neck is 16 mm
 * wide and 11 mm thick. A 9 mm rounded nose continues in front of z = pedalTipZ.
 */
export function pedalSection(z) {
  const zTip = LY.pedalTipZ, fromTip = z - zTip, S = PEDAL_SHAPE;
  const padT = 1 - smooth(zTip + 0.095, zTip + 0.135, z);
  const w = 0.016 + (0.030 + 0.010 * clamp01(1 - fromTip / S.padLen) - 0.016) * padT;
  const thick = S.neckThick + (S.padThick - S.neckThick) * padT;
  const yTop = LY.pedalTreadY + S.upturn * Math.pow(clamp01(1 - fromTip / S.padLen), 2) - 0.004 * (1 - padT);
  return { w, thick, yTop, padT };
}
/**
 * Pedals 0 = una corda (left), 1 = sostenuto, 2 = sustain/damper (right). Each: pivot (rotation axis parallel to x
 * through it; pressing = +angle, the tip goes down), tip = front of the rounded nose at rest (top height there),
 * tread = flat part of the pad top (inside the 2 mm edge rounds) as a polygon in (x, z), treadY = top height at the
 * toe (the pad rises 3 mm toward the toe; treadYAt(z) gives the exact height), max angle.
 */
export function pedalTreadYAt(z) { return pedalSection(z).yTop; }
export const PEDALS = LY.pedalX.map((x, i) => {
  const zT = LY.pedalTipZ, c = PEDAL_SHAPE.corner;
  const zs = []; for (let k = 0; k <= 11; k++) zs.push(zT + (k / 11) * PEDAL_SHAPE.padLen);
  const right = zs.map((z) => [x + pedalSection(z).w / 2 - c, z]), left = zs.map((z) => [x - pedalSection(z).w / 2 + c, z]).reverse();
  return {
    index: i, name: ['unaCorda', 'sostenuto', 'sustain'][i], x,
    pivot: [x, PEDAL_PIVOT_Y, LY.pedalPivotZ],
    tip: [x, pedalSection(zT).yTop - pedalSection(zT).thick / 2, zT - PEDAL_SHAPE.nose],
    treadY: pedalSection(zT).yTop,
    tread: [...right, ...left],
    maxRad: [PEDAL_MAX_RAD.unaCorda, PEDAL_MAX_RAD.sostenuto, PEDAL_MAX_RAD.sustain][i],
    tipTravel: [LY.pedalTravelTip.unaCorda, LY.pedalTravelTip.sostenuto, LY.pedalTravelTip.sustain][i],
  };
});
/** Rest-pose point on pedal i rotated by angle (rad, +down at the tip). */
export function pedalPoint(i, angle, [x, y, z]) {
  const [, py, pz] = PEDALS[i].pivot; const c = Math.cos(angle), s = Math.sin(angle);
  const yy = y - py, zz = z - pz;
  return [x, py + yy * c + zz * s, pz - yy * s + zz * c];
}

// ---------------------------------------------------------------------------------------------- bench, misc
const B = data.bench;
export const BENCH = Object.freeze({
  center: [B.centerX, B.defaultHeight, B.nearEdgeZ - B.seat[1] / 2],  // seat top centre at the default height
  seatSize: [B.seat[0], B.seat[1]],                                    // x, z
  seatTopY: B.defaultHeight, heightRange: B.heightRange.slice(),
  nearEdgeZ: B.nearEdgeZ, farEdgeZ: B.nearEdgeZ - B.seat[1],
  cushionThickness: B.cushionThk,
  // seatTopY is the cushion height at its rolled edge; the tufted top crowns 8 mm higher at the centre
  crown: 0.008, seatCrownY: B.defaultHeight + 0.008,
});
/** Seat heights for a bench set with setBenchHeight(h): { edgeY, crownY } (the bench geometry moves rigidly). */
export function benchSeatAt(h = B.defaultHeight) { return { edgeY: h, crownY: h + 0.008 }; }
export const KEYBOARD = Object.freeze({
  left: K.left, right: K.right, center: K.center, whitePitch: K.whitePitch, octave: K.octave,
  frontZ: KEY_FRONT_Z, visibleEndZ: FALLBOARD_FACE_Z, whiteTopY: WHITE_TOP_Y, blackTopY: BLACK_TOP_Y,
  keySlipTopY: K.keySlip.y[1], cheekBlocks: K.cheekBlocks, fallboardFaceZ: FALLBOARD_FACE_Z,
});
export const DAMPED_NOTES = data.action.dampedNotes.slice();    // [1, 67]
/** Ripple emitters (piano frame, on the floor): lyre and the three legs. */
export const RIPPLE_SOURCES = Object.freeze([
  { name: 'lyre', xz: [data.lyre.x, data.lyre.z] },
  ...data.legs.front.map((p, i) => ({ name: i ? 'legTreble' : 'legBass', xz: p.slice() })),
  { name: 'legRear', xz: data.legs.rear.slice() },
]);
