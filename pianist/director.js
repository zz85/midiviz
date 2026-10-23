// Camera director for #032: shots that move, and an automatic editor.
//
// A shot is a camera spot framed on a live subject (the hands, her head, the
// whole figure, the piano, her feet), held in spherical coordinates around it
// (azimuth, elevation, distance, field of view), plus one slow move over the
// shot's length: an orbit, a dolly or zoom in, a dolly or zoom out, a dolly
// zoom (the camera travels while the lens zooms against it, so she keeps her
// size and the hall behind her stretches or closes in), a crane, or a still frame with only a handheld breath. When the shot ends the camera
// either cuts to the next spot or glides into it.
//
// Auto ("the director") plans the whole song from the score: shots are cut on
// phrase starts, short in intense passages and long in quiet ones, the camera
// stays on the hands when they are busy and goes to her face when she looks
// up from the keys, it opens on an establishing shot and pulls out at the end.
// Cuts obey the usual grammar: never to the same spot, never a jump cut
// (a cut needs >= 30° of angle or a clear change of size), alternate sizes,
// don't stay on one subject too long. The plan is a function of song time
// (hashes, no Math.random), so a seek or the offline export replays the same
// film; without a song it runs on its own clock with a generic plan.
//
// Azimuth: 0 = behind her (+z), 90 = her right (the audience side, the open
// lid), 180 = in front of her across the piano (-z), -90 = her left.

import * as THREE from 'three'

const D2R = Math.PI / 180
const clamp = THREE.MathUtils.clamp
const lerp = THREE.MathUtils.lerp
const sstep = THREE.MathUtils.smootherstep
const hash = (k, s = 0) => { const x = Math.sin(k * 127.1 + s * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x) }
const wrap = a => ((a + 540) % 360) - 180

// size: 0 = close, 1 = medium, 2 = wide. moves: what suits the spot.
// fav: a favourite (weight ×fav), rest: seconds before it's fresh again (60)
// beside: from behind, but the hands show past her (counts half behind)
// aim: [x, y, z] cm added to the subject point, to frame it off centre
export const SPOTS = {
  establish: { label: 'From the hall, wide', subj: 'figure', az: 138, el: 9, dist: 700, fov: 24, size: 2, moves: ['dollyIn', 'zoomIn', 'orbit'] },
  audience: { label: 'From the audience', fav: 0.45, subj: 'head', az: 128, el: 4, dist: 420, fov: 20, size: 1, moves: ['zoomIn', 'dollyIn', 'orbit', 'dollyZoom', 'still'] },
  // flat: square on, so the shot itself doesn't turn (glides into it do).
  // Across the piano is low, under the lid over the strings; minDist keeps
  // its moves from carrying the camera in past the tail
  tail: { label: 'Across the piano', fav: 4.5, rest: 25, subj: 'head', az: 180, el: 2, dist: 380, fov: 18, size: 1, flat: true, minDist: 320, moves: ['dollyIn', 'zoomIn', 'dollyZoom', 'zoomOut'] },
  // her face at medium size (head and shoulders to the waist), favoured over the close-ups
  bust: { label: 'Her, from the piano', fav: 1.6, subj: 'head', az: 162, el: 8, dist: 190, fov: 34, size: 1, moves: ['dollyIn', 'zoomIn', 'orbit', 'zoomOut'] },
  profileMed: { label: 'Profile, medium', fav: 1.6, subj: 'head', az: 100, el: 6, dist: 220, fov: 30, size: 1, moves: ['orbit', 'dollyIn', 'zoomOut', 'still'] },
  // face close-ups mostly zoom or pull out; an orbit or a still frame now and then
  front: { fav: 0.5, label: 'Face, from the piano', subj: 'head', az: 161, el: 8, dist: 106, fov: 34, size: 0, moves: ['dollyOut', 'zoomOut', 'orbit', 'still'] },
  face: { fav: 0.5, label: 'Face, close', subj: 'head', az: 198, el: -4, dist: 75, fov: 28, size: 0, moves: ['dollyOut', 'zoomOut', 'orbit', 'still'] },
  profile: { fav: 0.5, label: 'Profile', subj: 'head', az: 105, el: 5, dist: 125, fov: 30, size: 0, moves: ['dollyOut', 'zoomOut', 'orbit', 'still'] },
  headside: { fav: 0.5, label: 'Profile, close', subj: 'head', az: 96, el: 8, dist: 72, fov: 30, size: 0, moves: ['zoomOut', 'dollyOut', 'orbit'] },
  shoulder: { label: 'Over the shoulder', fav: 0.3, subj: 'hands', az: -23, el: 37, dist: 160, fov: 40, size: 1, moves: ['dollyIn', 'orbit', 'crane', 'zoomIn'] },
  hands: { label: 'Hands, bass side', subj: 'hands', az: -50, el: 34, dist: 90, fov: 40, size: 0, moves: ['orbit', 'dollyOut', 'still'] },
  treble: { label: 'Hands, treble side', subj: 'hands', az: 62, el: 30, dist: 100, fov: 38, size: 0, moves: ['orbit', 'dollyIn', 'still'] },
  bassKeys: { label: 'Along the keys, from the bass', subj: 'hands', az: -93, el: 9, dist: 125, fov: 30, size: 0, moves: ['zoomOut', 'still', 'dollyOut'], orbitMax: 6 },
  keys: { label: 'Along the keys', subj: 'hands', az: 93, el: 7, dist: 120, fov: 30, size: 0, moves: ['zoomIn', 'still', 'dollyOut', 'dollyZoom'], orbitMax: 6 },
  // medium on the hands from her right: the keyboard runs toward the camera
  // and her body is beside the keys, not in front of them (unlike the shots
  // from behind her)
  handsRight: { label: 'Hands, from her right', fav: 1, subj: 'hands', az: 70, el: 20, dist: 215, fov: 34, size: 1, moves: ['orbit', 'dollyIn', 'zoomIn', 'still'], orbitMax: 12 },
  above: { label: 'From above', fav: 0.25, subj: 'hands', az: -8, el: 72, dist: 150, fov: 38, size: 1, moves: ['orbit', 'dollyIn', 'zoomOut'] },
  side: { label: 'Side, wide', subj: 'figure', az: 90, el: 3, dist: 395, fov: 30, size: 2, flat: true, moves: ['dollyIn', 'zoomOut', 'dollyZoom', 'still'] },
  // the opening's far shots (after concert films): side-on from the hall, she
  // small in the light with the whole length of the piano; high from behind
  // her, the light on the floor around the piano
  hallSide: { label: 'From the hall, side', fav: 0.3, subj: 'figure', az: 92, el: 4, dist: 1300, fov: 24, size: 2, flat: true, moves: ['still', 'dollyIn', 'zoomIn'] },
  highBehind: { label: 'High, from behind', fav: 0.3, subj: 'figure', az: -38, el: 26, dist: 620, fov: 28, size: 2, moves: ['dollyIn', 'still', 'orbit'] },
  // low behind her right shoulder at keyboard height, both hands on the keys
  // past her arm, the lid rising behind them
  lowShoulder: { label: 'Low, behind her shoulder', fav: 1.2, subj: 'figure', az: 48, el: -3, dist: 140, fov: 36, size: 1, moves: ['dollyIn', 'orbit', 'still'], orbitMax: 10 },
  // low behind her left at chest height, aimed past her at the keyboard: she
  // on the right, both hands on the keys (and in the fallboard), the lid
  // rising over them (the user's ?cam=-140.1,102,123.5,-0.7,86,-45)
  lowLeft: { label: 'Low, from her left', fav: 6, rest: 30, beside: true, subj: 'figure', aim: [-0.7, -15, -66], az: -39.6, el: 4.2, dist: 219, fov: 38, size: 1, moves: ['orbit', 'dollyIn', 'zoomIn', 'still'], orbitMax: 12 },
  // its mirror from behind her right: she on the left, the keys running off
  // to the right under the open lid
  lowRightBack: { label: 'Low, from her right, behind', fav: 2.5, beside: true, subj: 'figure', aim: [0.7, -15, -66], az: 39.6, el: 4.2, dist: 219, fov: 38, size: 1, moves: ['orbit', 'dollyIn', 'zoomIn', 'still'], orbitMax: 12 },
  back: { label: 'Behind', fav: 0.5, subj: 'figure', az: 3, el: 15, dist: 240, fov: 38, size: 1, moves: ['dollyIn', 'orbit', 'crane'] },
  // two favourites: low from her right looking up at her, and high over the
  // keyboard from in front looking down at her (the page's lowRight / overKeys)
  lowRight: { label: 'Low, from her right', fav: 5, subj: 'head', az: 76, el: -9, dist: 245, fov: 38, size: 1, moves: ['orbit', 'dollyIn', 'zoomIn', 'still'], orbitMax: 14 },
  overKeys: { label: 'High, over the keyboard', fav: 2.5, subj: 'head', az: 167, el: 68, dist: 382, fov: 38, size: 2, moves: ['orbit', 'crane', 'dollyOut', 'dollyIn'] },
  // straight down over the piano, turning slowly about the vertical
  top: { label: 'Top down', subj: 'piano', az: 0, el: 82, dist: 560, fov: 30, size: 2, moves: ['orbit'], orbitSpan: 40, orbitMax: 50 },
  high: { label: 'High, over the lid', subj: 'piano', az: 120, el: 38, dist: 520, fov: 30, size: 2, moves: ['orbit', 'dollyOut', 'dollyIn'] },
  // close-ups of the mechanism and the details: the hammers striking the
  // strings (inside the case, over the strike line, following the hands
  // along the keyboard), the pedals being pressed, the keys from straight above
  hammers: { label: 'The hammers', subj: 'hammers', az: 168, el: 42, dist: 52, fov: 34, size: 0, moves: ['orbit', 'still', 'dollyOut'], orbitMax: 12 },
  pedalsClose: { label: 'Pedals, close', subj: 'pedals', az: 90, el: 8, dist: 60, fov: 32, size: 0, moves: ['still', 'dollyOut'] },
  keysTop: { label: 'Keys, from above', subj: 'hands', az: 180, el: 80, dist: 78, fov: 36, size: 0, moves: ['orbit', 'still', 'dollyOut'], orbitMax: 20 },
  feet: { label: 'Pedals', subj: 'feet', az: 58, el: 8, dist: 180, fov: 30, size: 1, moves: ['still', 'dollyIn'] },
  // made for a tall frame (Shorts): from straight above her left, the keyboard
  // running up the picture (bass at the bottom), her arms coming in from the right
  // the whole stage from high behind her right, looking past her and the piano
  // to the back wall (#030's candle-chamber establishing shot): only as the
  // opening shot (opts.opening = 'wide'), or chosen as a view
  stage: { label: 'The whole stage, from behind', only: 'opening', subj: 'figure', aim: [0, 2, -168], az: 33.5, el: 10.5, dist: 790, fov: 42, size: 2, moves: ['dollyIn', 'still'] },
  keysUp: { label: 'Keyboard up the frame', only: 'portrait', subj: 'hands', az: -90, el: 84, dist: 118, fov: 44, size: 0, moves: ['still', 'orbit', 'dollyIn'], orbitMax: 6 },
}

// ── Portrait (9:16, YouTube Shorts) ──
// A landscape spot cut down to 9:16 keeps a third of its width, so each spot
// is rated for a tall frame and gets its own framing there (fov is the
// vertical one, at camera zoom 1). p: 2 = made for it, 1 = usable now and
// then, absent = never (the wide hall shots: she'd be a speck in a sliver).
// Anything not given is the landscape value with the lens opened by `k`
// (tan of the half-angle) and the camera moved back by `d`.
export const PORTRAIT = {
  keysUp: { p: 2 },
  keysTop: { p: 2, dist: 120, fov: 50, el: 78 },
  keys: { p: 2, dist: 150, fov: 40, el: 9 },
  bassKeys: { p: 2, dist: 155, fov: 40, el: 10 },
  hands: { p: 2, dist: 118, fov: 50, el: 40 },
  treble: { p: 2, dist: 125, fov: 50, el: 36 },
  handsRight: { p: 1, dist: 230, fov: 46 },
  shoulder: { p: 2, el: 48, dist: 165, fov: 56 },
  profile: { p: 2, dist: 150, fov: 42, el: 2 },
  headside: { p: 2, dist: 105, fov: 40 },
  face: { p: 1, dist: 100, fov: 38 },
  front: { p: 1, dist: 140, fov: 42 },
  bust: { p: 1, dist: 165, fov: 46, aim: [0, -18, 0] },
  profileMed: { p: 1, dist: 180, fov: 48, aim: [0, -22, 0] },
  lowRight: { p: 2, dist: 185, fov: 54, el: -6, aim: [0, -24, 0] },
  lowShoulder: { p: 2, dist: 150, fov: 52 },
  lowLeft: { p: 1, dist: 230, fov: 54 },
  lowRightBack: { p: 1, dist: 230, fov: 54 },
  back: { p: 1, el: 22, dist: 175, fov: 52, aim: [0, -12, 0] },
  hammers: { p: 1, dist: 62, fov: 44 },
  pedalsClose: { p: 1, dist: 75, fov: 44 },
  // (p 0: never drawn by a Short's plan, only its opening; the lens opened so
  // the tall frame still takes in the candles to either side)
  stage: { p: 0, dist: 860, fov: 64, el: 12, aim: [0, 40, -168] },
}
const PORTRAIT_K = 1.5, PORTRAIT_D = 1.15
const _portrait = {}
/** the spot as framed for a portrait frame (or the landscape spot) */
export function spotFor(name, portrait) {
  if (!portrait) return SPOTS[name]
  if (_portrait[name]) return _portrait[name]
  const s = SPOTS[name], o = PORTRAIT[name] || {}
  const fov = o.fov ?? 2 * Math.atan(Math.tan(s.fov * D2R / 2) * PORTRAIT_K) / D2R
  return (_portrait[name] = { ...s, dist: s.dist * PORTRAIT_D, ...o, fov })
}
/** spots usable in a frame: portrait ones by rating, landscape all but the portrait-only */
export const spotsFor = portrait => Object.keys(SPOTS).filter(n => SPOTS[n].only !== 'opening' && (portrait ? (PORTRAIT[n]?.p ?? 0) > 0 : SPOTS[n].only !== 'portrait'))
const SUBJ_KIND = { hands: 'hands', feet: 'hands', head: 'pianist', figure: 'pianist', piano: 'piano', hammers: 'piano', pedals: 'piano' }
// the menu's categories: by shot size, then what is in the frame
export const SIZES = ['Close', 'Medium', 'Far']
export const KINDS = { hands: 'Hands & keys', pianist: 'The pianist', piano: 'The piano' }
export const spotKind = name => SUBJ_KIND[SPOTS[name].subj]

export const MOVES = {
  still: 'Still',
  orbit: 'Slow orbit',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  dollyIn: 'Push in',
  dollyOut: 'Pull out',
  dollyZoom: 'Dolly zoom',
  crane: 'Crane',
}

// the spot's parameters after `u` (0..1) of its move; `amt` scales it
function applyMove(s, move, u, amt, dir, out) {
  out.az = s.az; out.el = s.el; out.dist = s.dist; out.fov = s.fov
  const e = sstep(u, 0, 1)
  switch (move) {
    case 'orbit': out.az += dir * Math.min(s.orbitMax ?? 30, (s.orbitSpan ?? 22) * amt) * (e - 0.5); break
    case 'zoomIn': out.fov *= lerp(1.08, 1.08 - 0.3 * amt, e); break
    case 'zoomOut': out.fov *= lerp(1 - 0.22 * amt, 1.06, e); break
    case 'dollyIn': out.dist *= lerp(1.12, 1.12 - 0.32 * amt, e); break
    case 'dollyOut': out.dist *= lerp(0.92, 0.92 + 0.35 * amt, e); break
    case 'dollyZoom': {
      // dir > 0: push in while zooming out (the hall falls away behind her);
      // dir < 0: pull out while zooming in (it closes in). dist·tan(fov/2) is
      // held, so her size in frame doesn't change
      const f = Math.exp(dir * 0.3 * amt * (0.5 - e) * 2)
      out.dist = s.dist * f
      out.fov = clamp(2 * Math.atan(Math.tan(s.fov * D2R / 2) / f) / D2R, 8, 75)
      break
    }
    case 'crane': out.el += dir * 9 * amt * (e - 0.5); out.az += dir * 4 * amt * (e - 0.5); break
  }
  if (s.minDist && out.dist < s.minDist) {
    if (move === 'dollyZoom') out.fov = 2 * Math.atan(Math.tan(s.fov * D2R / 2) * s.dist / s.minDist) / D2R
    out.dist = s.minDist
  }
  return out
}

// ── How much of a spot's frame is the inside of the piano ──
// For "Avoid the strings" (path tracing: the strings, plate and dampers are
// most of the scene's triangles and the slowest part to trace). A grid of rays
// from the spot's camera (at the start, middle and end of each of its moves,
// with her hands at the middle and either side of the keyboard) is followed
// into the case: a ray counts when it drops through the open top (inside the
// rim, behind the fallboard) and reaches the string plane without passing
// through the lid, propped at 32° on its spine hinge. Geometry from
// concertstage/concert-grand.js (DIM, caseOutline, the lid); she isn't in the
// test, so a shot from behind her over-counts a little (it errs towards
// leaving a spot out). Default anchors as in createDirector.
const CASE = (() => {
  const ctrl = [[-74, -186], [-73.2, -197], [-68, -205.5], [-58, -210.5], [-45, -211.2], [-31, -207], [-17, -197], [-4, -183], [8, -167], [20, -149], [32, -130], [44, -110], [55, -91], [64, -76], [70, -64], [73.3, -53], [74, -43]]
  return [[-74, -17], ...ctrl, [74, -17]].map(([x, z]) => [x * 0.95, z > -30 ? z : z * 0.98])   // (inside the rim)
})()
const RIM_TOP = 97, STRING_Y = 88.5, STRINGS_FROM = -24, LID_FROM = -40, HINGE_X = -74.8, LID_A = 32 * D2R
function inCase(x, z) {
  if (z > STRINGS_FROM) return false
  let c = false
  for (let i = 0, j = CASE.length - 1; i < CASE.length; j = i++) {
    const [xi, zi] = CASE[i], [xj, zj] = CASE[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c
  }
  return c
}
const SUBJ_AT = { hands: [0, 76, 0], head: [0, 122, 32], figure: [0, 98.4, 18.4], piano: [0, 90, -70], feet: [0, 12, 18], hammers: [0, 85, -36.5], pedals: [0, 7, -2] }
const _sv = { P: {}, c: new THREE.Vector3(), t: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), d: new THREE.Vector3() }
function insideFraction(s, P, hx, aspect, N = 36) {
  const { c, t, f, r, u, d } = _sv
  const a = SUBJ_AT[s.subj]
  t.set(a[0] + (s.subj === 'pedals' || s.subj === 'feet' ? 0 : s.subj === 'piano' ? hx * 0.3 : hx), a[1], a[2])
  if (s.aim) t.x += s.aim[0], t.y += s.aim[1], t.z += s.aim[2]
  const az = P.az * D2R, el = P.el * D2R
  c.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(P.dist).add(t)
  f.subVectors(t, c).normalize()
  r.crossVectors(f, u.set(0, 1, 0)); if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize()
  u.crossVectors(r, f)
  const th = Math.tan(P.fov * D2R / 2), tw = th * aspect
  const nx = Math.round(N * Math.sqrt(aspect)), ny = Math.round(N / Math.sqrt(aspect))
  const sa = Math.sin(LID_A), ca = Math.cos(LID_A)
  let hit = 0
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const sx = ((i + 0.5) / nx * 2 - 1) * tw, sy = ((j + 0.5) / ny * 2 - 1) * th
    d.copy(f).addScaledVector(r, sx).addScaledVector(u, sy)
    if (d.y >= 0) continue
    // into the case through the open top (or the camera already inside it)
    if (c.y > RIM_TOP) { const k = (RIM_TOP - c.y) / d.y; if (!inCase(c.x + d.x * k, c.z + d.z * k)) continue }
    else if (!inCase(c.x, c.z) || c.y < STRING_Y) continue
    const k = (STRING_Y - c.y) / d.y, px = c.x + d.x * k, pz = c.z + d.z * k
    if (!inCase(px, pz)) continue
    // through the lid? (its plane through the hinge line; the flap is folded
    // back over it, so the front 23 cm are open)
    const sc = -sa * (c.x - HINGE_X) + ca * (c.y - RIM_TOP)
    if (sc > 0) {
      const sp = -sa * (px - HINGE_X) + ca * (STRING_Y - RIM_TOP), q = sc / (sc - sp)
      const lx = c.x + (px - c.x) * q, ly = c.y + (STRING_Y - c.y) * q, lz = c.z + (pz - c.z) * q
      const along = Math.hypot(lx - HINGE_X, ly - RIM_TOP)
      if (lz < LID_FROM && inCase(HINGE_X + along, lz)) continue
    }
    hit++
  }
  return hit / (nx * ny)
}
const _inside = {}
/** the largest share of the frame the piano's inside takes, over the spot's moves (0..1) */
export function stringsShare(name, portrait = false) {
  const key = name + (portrait ? '|p' : '')
  if (_inside[key] != null) return _inside[key]
  const s = spotFor(name, portrait), aspect = portrait ? 9 / 16 : 16 / 9
  let m = 0
  for (const move of s.moves) for (const v of [0, 0.5, 1]) for (const dir of [-1, 1]) for (const hx of [-30, 0, 30]) {
    applyMove(s, move, v, 1, dir, _sv.P)
    m = Math.max(m, insideFraction(s, _sv.P, hx, aspect))
  }
  return (_inside[key] = m)
}
// ── Are her feet (and the pedals) in a spot's frame? ──
// For "Pedal shots" off: not only the two pedal spots but any close or
// medium framing low or tall enough to take in her feet on the pedals (a
// portrait lens opened up for a Short reaches the floor from her waist).
// Her shoes and the pedals, projected from the spot's camera through its
// moves as in stringsShare; a point counts inside `margin` of the frame edge
// and when no box below stands in the way: the keys and keybed, the case, her
// thighs and torso, the bench (rough, from concert-grand.js DIM and the seat).
// Far shots don't count.
const FEET_AT = [[-13, 4, 6], [13, 4, 6], [0, 7, -2]]
const FEET_COVER = [
  [[-74, 61, -17], [74, 78, -1]],     // keys and keybed
  [[-74, 61, -211], [74, 97, -17]],   // the case (its bounding box)
  [[-22, 50, 0], [22, 68, 47]],       // her thighs
  [[-21, 56, 18], [21, 132, 44]],     // her torso
  [[-32, 40, 32], [32, 56, 62]],      // the bench
]
// does the segment p0 → p1 cross the box?
function crosses(p0, p1, [lo, hi]) {
  let t0 = 0, t1 = 1
  for (let k = 0; k < 3; k++) {
    const d = p1[k] - p0[k]
    if (Math.abs(d) < 1e-9) { if (p0[k] < lo[k] || p0[k] > hi[k]) return false; continue }
    let a = (lo[k] - p0[k]) / d, b = (hi[k] - p0[k]) / d
    if (a > b) [a, b] = [b, a]
    t0 = Math.max(t0, a); t1 = Math.min(t1, b)
    if (t0 > t1) return false
  }
  return true
}
function feetInView(s, P, hx, aspect, margin) {
  const { c, t, f, r, u, d } = _sv
  const a = SUBJ_AT[s.subj]
  t.set(a[0] + (s.subj === 'pedals' || s.subj === 'feet' ? 0 : s.subj === 'piano' ? hx * 0.3 : hx), a[1], a[2])
  if (s.aim) t.x += s.aim[0], t.y += s.aim[1], t.z += s.aim[2]
  const az = P.az * D2R, el = P.el * D2R
  c.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(P.dist).add(t)
  f.subVectors(t, c).normalize()
  r.crossVectors(f, u.set(0, 1, 0)); if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize()
  u.crossVectors(r, f)
  const th = Math.tan(P.fov * D2R / 2), tw = th * aspect
  for (const p of FEET_AT) {
    d.set(p[0] - c.x, p[1] - c.y, p[2] - c.z)
    const z = d.x * f.x + d.y * f.y + d.z * f.z; if (z <= 1) continue
    const x = (d.x * r.x + d.y * r.y + d.z * r.z) / (z * tw), y = (d.x * u.x + d.y * u.y + d.z * u.z) / (z * th)
    if (Math.abs(x) < 0.9 && Math.abs(y) < margin && !FEET_COVER.some(b => crosses([c.x, c.y, c.z], p, b))) return true
  }
  return false
}
const _feet = {}
/** does the spot's frame take in her feet or the pedals at some point of its moves (close and medium shots) */
export function showsFeet(name, portrait = false, margin = 0.6) {
  const key = name + (portrait ? '|p' : '') + margin
  if (_feet[key] != null) return _feet[key]
  const s = spotFor(name, portrait), aspect = portrait ? 9 / 16 : 16 / 9
  let hit = s.subj === 'feet' || s.subj === 'pedals'
  if (!hit && s.size < 2) for (const move of s.moves) for (const v of [0, 0.5, 1]) for (const dir of [-1, 1]) for (const hx of [-30, 0, 30]) {
    applyMove(s, move, v, 1, dir, _sv.P)
    if (feetInView(s, _sv.P, hx, aspect, margin)) { hit = true; break }
  }
  return (_feet[key] = hit)
}

// opts.strings: null = any spot; a number = leave out the spots whose frame
// the inside fills more of (0.1 'mostly', 0.04 'strictly': with 0.04 the hands
// are filmed along the keys, from the side, and her face and figure from low)
export const STRINGS_LEVELS = { mostly: 0.1, strict: 0.04 }
const stringsOk = (name, portrait, max) => max == null || stringsShare(name, portrait) <= max
// opts.pedals: false leaves out every close or medium shot that takes in her
// feet or the pedals (showsFeet), the two pedal spots among them
const pedalsOk = (name, on, portrait = false) => on !== false || !showsFeet(name, portrait)

// ── Takes on a fixed view (sequence) ──
// The director's cut works from the chosen view's angle but changes the
// framing take by take, weaving far and close: the whole scene, the piano,
// her fingers, her face (or, from behind, her figure) and the view's own
// framing. The size alternates (a wide take is never followed by another wide
// one), every subject gets its turn, and a change of size is a cut while
// takes of the same size glide into each other. Moves: mostly a slow orbit,
// sometimes a zoom in or out, a crane rarely (and only on medium or wide).
// Random keeps the view's framing and draws any move.
const CUT_MOVES = [['orbit', 0.5], ['zoom', 0.37], ['dollyIn', 0.06], ['crane', 0.07]]
const ANY_MOVES = Object.keys({ orbit: 1, zoomIn: 1, zoomOut: 1, dollyIn: 1, dollyOut: 1, dollyZoom: 1, crane: 1, still: 1 })
// framings: base weight (balance), label
const FRAMES = { home: [1.3, 'the view'], scene: [0.8, 'the scene'], piano: [0.9, 'the piano'], fingers: [1.1, 'fingers'], face: [1.1, 'face'], figure: [0.8, 'her figure'] }
export const FRAME_LABELS = Object.fromEntries(Object.entries(FRAMES).map(([k, [, l]]) => [k, l]))
// size class from the half-height of the frame at the subject (cm)
const sizeOf = (dist, fov) => { const h = dist * Math.tan(fov * D2R / 2); return h < 45 ? 0 : h < 110 ? 1 : 2 }
function frameBase(f, s) {
  // the framing's distance / fov / elevation from the view's angle
  switch (f) {
    case 'scene': return { az: s.az, el: clamp(s.el, 6, 70), dist: Math.max(600, s.dist * 1.5), fov: 28 }
    case 'piano': return { az: s.az, el: clamp(s.el, 8, 70), dist: 300, fov: 30 }
    // from behind her own shoulders hide the hands: beside her, from above
    case 'fingers': { const az = wrap(s.az), sg = az > 0 ? 1 : -1; return { az: Math.abs(az) < 60 ? sg * 60 : az, el: clamp(s.el, 38, 52), dist: 85, fov: 34 } }
    case 'face': return { az: s.az, el: clamp(s.el, -4, 20), dist: 80, fov: 30 }
    case 'figure': return { az: s.az, el: clamp(s.el, 8, 40), dist: 175, fov: 32 }
    default: return { az: s.az, el: s.el, dist: s.dist, fov: s.fov }
  }
}
// which framings work from this angle: her face only from the front half and
// not from high up; her fingers only from behind or beside her (from the
// front the music desk is in the way); her figure when her face can't be seen
function framesFor(s, pov) {
  if (pov) return ['home']
  const faceOk = Math.abs(wrap(s.az - 180)) < 115 && s.el < 45
  const fs = ['home', 'scene', 'piano']
  if (Math.abs(wrap(s.az)) <= 105) fs.push('fingers')
  fs.push(faceOk ? 'face' : 'figure')
  return fs
}
function addTake(q, mode, s, view) {
  const i = q.takes.length, prev = q.takes[i - 1], t0 = prev ? prev.t1 : 0
  const r = n => mode === 'random' ? Math.random() : hash(q.seed + i, n)
  let frame = 'home'
  if (mode === 'cut' && i > 0) {
    const fs = framesFor(s, view.pov)
    const size = f => { const b = frameBase(f, s); return sizeOf(b.dist, b.fov) }
    q.uses ??= {}
    let cand = fs.filter(f => f !== prev.frame && size(f) !== prev.size)
    // after the opening take (the view's own framing, usually medium or
    // wide), go close: her fingers or her face
    if (i === 1 && prev.size > 0) { const close = cand.filter(f => size(f) === 0); if (close.length) cand = close }
    if (!cand.length) cand = fs.filter(f => f !== prev.frame)
    if (!cand.length) cand = fs
    const w = cand.map(f => FRAMES[f][0] / (1 + (q.uses[f] || 0))
      * (f === 'fingers' ? 1.6 : f === 'face' ? 0.6 : 1)          // fingers over the face
      // far ↔ close, except straight after a close-up: back out to a
      // medium framing (the piano, the keys), not all the way to the hall
      * (prev.size === 0 ? (size(f) === 1 ? 3 : 0.3) : Math.abs(size(f) - prev.size) === 2 ? 1.5 : 1)
      * (q.takes[i - 2]?.frame === f ? 0.4 : 1))
    let x = r(7) * w.reduce((a, b) => a + b, 0), j = 0
    while (j < cand.length - 1 && (x -= w[j]) > 0) j++
    frame = cand[j]
  }
  const base = frameBase(frame, s), size = sizeOf(base.dist, base.fov)
  if (mode === 'cut') { q.uses ??= {}; q.uses[frame] = (q.uses[frame] || 0) + 1 }
  let move, tries = 0
  // close up (her face, her fingers) the camera never pushes or zooms in
  // further: an orbit, a still frame or a pull out only
  const tooClose = m => size === 0 && (m === 'zoomIn' || m === 'dollyIn' || m === 'dollyZoom')
  if (mode === 'random') { let n = 0; do move = ANY_MOVES[Math.floor((n++ ? Math.random() : r(1)) * ANY_MOVES.length)]; while ((prev && move === prev.move && move !== 'orbit') || tooClose(move)) }
  else {
    do {
      // a fresh draw on every retry (the hash alone would repeat the same pick)
      let x = hash(q.seed + i, 1 + 10 * tries++) * CUT_MOVES.reduce((a, [, w]) => a + w, 0), j = 0
      while (j < CUT_MOVES.length - 1 && (x -= CUT_MOVES[j][1]) > 0) j++
      move = CUT_MOVES[j][0]
      if (move === 'zoom') move = hash(q.seed + i, 5 + 10 * tries) < 0.5 ? 'zoomIn' : 'zoomOut'
      if (view.pov && (move === 'crane' || move === 'dollyIn')) move = 'orbit'
      if (tries > 20) { if (tooClose(move)) move = 'orbit'; break }
    // never two cranes or two zooms in a row, no crane close up, no more than
    // three orbits running; the first take is an orbit
    } while ((move === 'crane' && size === 0) || tooClose(move) || (prev && (move !== 'orbit' ? move === prev.move || (move.startsWith('zoom') && prev.move.startsWith('zoom')) : q.takes.slice(-3).filter(t => t.move === 'orbit').length === 3)))
    if (!i) move = 'orbit'
  }
  const len = mode === 'random' ? 7 + 9 * r(2)
    : (size === 0 ? 7 + 4 * r(2) : size === 1 ? 9 + 5 * r(2) : 10 + 5 * r(2)) + (move === 'orbit' ? 3 : 0)
  // orbits keep turning the same way for a while, then swing back
  const dir = move === 'orbit' && prev?.move === 'orbit' && r(3) < 0.7 ? prev.dir : r(3) < 0.5 ? -1 : 1
  q.takes.push({
    i, t0, t1: t0 + len, move, dir, frame, size,
    amt: view.pov ? 0.4 : mode === 'random' ? 0.6 + 0.6 * r(4) : 0.8 + 0.3 * r(4),
    // a change of size is a cut; the same size glides
    blend: !!prev && prev.size === size,
    onHer: mode === 'cut' && frame === 'home' && move.startsWith('zoom'),
  })
}
// a take's camera at u (0..1): its framing plus its move, centred on the move's middle
const _P = {}, _P0 = {}
function takeAt(s, tk, u, out) {
  const b = frameBase(tk.frame, s); b.orbitMax = s.orbitMax
  applyMove(b, tk.move, u, tk.amt, tk.dir, _P); applyMove(b, tk.move, 0.5, tk.amt, tk.dir, _P0)
  out.az = b.az + _P.az - _P0.az; out.el = b.el + _P.el - _P0.el
  out.dist = b.dist * _P.dist / _P0.dist; out.fov = b.fov * _P.fov / _P0.fov
  return out
}

// ── Screen-time balance ──
// The director keeps a running tally (seconds on screen, the last ~2 minutes
// weighing most) on three axes and favours whatever is behind its share:
//   what:  the fingers and keys / her (face, figure) / the piano
//   where: from behind her / from in front of her (the side and straight
//          down count half to each, and so do spots marked `beside`: from
//          behind, but her hands are in view past her)
//   size:  close / medium / wide
// Favour (hands / pianist) moves the "what" targets.
const AXES = {
  what: s => SUBJ_KIND[s.subj] === 'hands' ? 'keys' : SUBJ_KIND[s.subj] === 'pianist' ? 'her' : 'piano',
  where: s => { if (s.el > 65 || s.beside) return { back: 0.5, front: 0.5 }; const a = Math.abs(wrap(s.az)); return a < 70 ? 'back' : a > 110 ? 'front' : { back: 0.5, front: 0.5 } },
  size: s => ['close', 'medium', 'wide'][s.size],
}
const TARGETS = { what: { keys: 0.5, her: 0.38, piano: 0.12 }, where: { back: 0.42, front: 0.58 }, size: { close: 0.26, medium: 0.49, wide: 0.25 } }
const TALLY_TAU = 120
export const screenAxes = s => Object.fromEntries(Object.entries(AXES).map(([k, f]) => [k, f(s)]))
function tallyAdd(tally, s, d) {
  const k = Math.exp(-d / TALLY_TAU)
  for (const [ax, f] of Object.entries(AXES)) {
    for (const c in tally[ax]) tally[ax][c] *= k
    const v = f(s), parts = typeof v === 'string' ? { [v]: 1 } : v
    for (const [c, w] of Object.entries(parts)) tally[ax][c] += w * d
  }
}
// how much a spot would fill what's been missing: > 1 behind target, < 1 ahead
function tallyGain(tally, targets, s) {
  let g = 1
  for (const [ax, f] of Object.entries(AXES)) {
    const tot = Object.values(tally[ax]).reduce((a, b) => a + b, 0)
    if (tot < 20) continue   // nothing to balance yet
    const v = f(s), parts = typeof v === 'string' ? { [v]: 1 } : v
    let d = 0
    for (const [c, w] of Object.entries(parts)) d += w * (targets[ax][c] - tally[ax][c] / tot)
    g *= Math.exp(10 * d)
  }
  return g
}

// a number from the song itself: its length and where its phrases begin
export function songSeed({ duration = 0, phrases = [] }) {
  if (!phrases.length) return 0
  let x = duration * 7.31 + phrases.length * 3.17
  for (const [a, b] of phrases.slice(0, 40)) x = (x * 1.618 + a * 13.7 + b * 5.3) % 9973
  return Math.floor(x % 997) + 1
}

/**
 * opts.pace: 0.5 (long takes) .. 2 (lively); opts.bias: -1 (hands) .. 1 (pianist);
 * opts.trans: 'mix' | 'cuts' | 'glides'
 */
export function planShots({ duration, phrases = [], glances = [], energyAt = () => 0.3 }, opts = {}) {
  const pace = opts.pace ?? 1, bias = opts.bias ?? 0, trans = opts.trans ?? 'mix'
  // sizes: the shot sizes allowed (0 close, 1 medium, 2 far), all by default
  const sizes = Array.isArray(opts.sizes) && opts.sizes.length && opts.sizes.length < 3 ? opts.sizes : null, wideOk = !sizes || sizes.includes(2)
  // every choice is a hash of the shot number and the song, so a song always
  // gets the same film (seek, export) and different songs get different ones
  const seed = songSeed({ duration, phrases }), hs = (k, n) => hash(k + seed, n)
  const starts = phrases.map(p => p[0]).filter(t => t > 0.5)
  const mean = (a, b) => { let s = 0, n = 0; for (let t = a; t < b; t += 0.25) { s += energyAt(t); n++ } return n ? s / n : 0 }
  const lookUp = (a, b) => glances.some(g => g.a < b - 1 && g.b > a + 0.5 && !g.quiet)
  const strMax = opts.strings ?? null
  const names = spotsFor(false).filter(n => stringsOk(n, false, strMax) && pedalsOk(n, opts.pedals))
  const shots = []
  // what the audience has been shown lately: when the last wide shot ended,
  // and when her face was last in view (from the front half, not from behind)
  const faceSeen = s => SUBJ_KIND[s.subj] === 'pianist' && Math.abs(wrap(s.az)) >= 80 && s.el < 45
  let lastWide = 0, lastFace = 0
  const lastUsed = {}, uses = {}
  const tally = Object.fromEntries(Object.entries(TARGETS).map(([ax, cs]) => [ax, Object.fromEntries(Object.keys(cs).map(c => [c, 0]))]))
  const b = clamp(bias, -1, 1) * 0.15
  const targets = { ...TARGETS, what: { keys: TARGETS.what.keys - b, her: TARGETS.what.her + b, piano: TARGETS.what.piano } }
  let t = 0
  for (let i = 0; t < duration; i++) {
    const E = mean(t, t + 6)
    const h = hs(i, 1)
    let L = lerp(13, 4.5, clamp(E, 0, 1)) * (0.8 + 0.45 * h) / pace
    // cut on a phrase start near the planned length
    let end = t + L
    const cand = starts.filter(s => s > t + 0.6 * L && s < t + 1.6 * L)
    if (cand.length) end = cand.reduce((b, s) => Math.abs(s - t - L) < Math.abs(b - t - L) ? s : b)
    end = Math.min(end, t + 16 / pace)
    // the opening: three quick takes, far → medium → close, whatever the pace
    // (about 7, 5 and 4.5 s, on a phrase start when one is near)
    const opening = !sizes && duration > 45 && i < 3
    if (opening) {
      const want = t + [6.5, 4.5, 4][i] + 1.2 * h
      const near = starts.filter(s => s > want - 1.5 && s < want + 1.5)
      end = near.length ? near.reduce((b, s) => Math.abs(s - want) < Math.abs(b - want) ? s : b) : want
    }
    const last = duration - end < Math.max(4, 0.5 * L)
    if (last) end = duration + 6
    const prev = shots[i - 1], prev2 = shots[i - 2]
    let name, move
    // open far (the page fades it in from black): side-on from the hall,
    // across the hall, or high from behind her; then medium, then close
    if (i === 0 && opts.opening === 'wide') { name = 'stage'; move = 'dollyIn'; end = Math.max(end, t + 7) }
    else if (opening && i < 2) {
      const pick = (opts, r) => { opts = opts.filter(([n]) => names.includes(n)); const tot = opts.reduce((a, o) => a + o[1], 0); let q = r * tot; return opts.find(o => (q -= o[1]) <= 0)?.[0] ?? opts[0][0] }
      name = i === 0 ? pick([['hallSide', 1.2], ['establish', 1], ['highBehind', 0.8]], hs(i, 3))
        : pick([['lowShoulder', 1.5], ['lowRight', 1], ['bust', 0.6]], hs(i, 3))
      move = i === 0 ? (name === 'hallSide' && hs(i, 4) < 0.4 ? 'still' : 'dollyIn') : name === 'lowRight' ? 'orbit' : 'dollyIn'
    }
    else if (i === 0 && (!sizes || sizes.includes(1)) && names.includes('back')) { name = 'back'; move = 'dollyIn' }
    else if (i === 0 && !sizes) { name = 'lowShoulder'; move = 'dollyIn' }
    else if (i === 0) { name = names.find(n => sizes.includes(SPOTS[n].size) && n !== 'establish'); move = SPOTS[name].moves[0] }
    else {
      // score every spot for this stretch of music
      const up = lookUp(t, end)
      const w = names.map(n => {
        const s = SPOTS[n], kind = SUBJ_KIND[s.subj]
        let x = kind === 'hands' ? 0.35 + 0.7 * E - 0.3 * bias : kind === 'pianist' ? 0.5 - 0.25 * E + 0.3 * bias : 0.18
        if (n === 'feet') x *= 0.1
        if (s.subj === 'hammers' || s.subj === 'pedals') x *= 1.6   // the mechanism: a detail now and then
        if (sizes && !sizes.includes(s.size)) return 0   // (a category switched off)
        if (n === 'top') x = 0.1   // a treat, not a habit
        // spread the work over every spot: one shown in the last ~60 s is
        // less likely, the more often the less likely
        const ago = t - (lastUsed[n] ?? -1e9)
        if (ago < (s.rest ?? 60) / pace) x *= 0.3
        x *= s.fav ?? 1   // a favourite spot
        if (s.size === 0) x *= 0.6   // (close-ups: about 30 % of the film)
        x /= 1 + 0.08 * (uses[n] || 0)
        // after the opening: what the screen time is short of (fingers / her /
        // piano, behind / in front, close / medium / wide)
        if (i > 0) x *= tallyGain(tally, targets, s)
        if (n === 'establish') x = 0   // only to open and close
        // she looks up from the keys: be on her face
        if (up) x *= s.subj === 'head' ? 2.5 : 0.3
        // the last shot pulls out wide
        if (last) x = s.size === 2 || n === 'tail' ? 1 : 0
        if (prev) {
          const ps = SPOTS[prev.name]
          if (n === prev.name) return 0
          if (prev2 && n === prev2.name) x *= 0.3
          if (prev2 && SUBJ_KIND[ps.subj] === kind && SUBJ_KIND[SPOTS[prev2.name].subj] === kind) x *= 0.35
          // after the opening (behind her): close, her fingers or her face, or
          // over her shoulder onto the keys
          if (opening) x *= s.size === 0 && SUBJ_KIND[s.subj] !== 'piano' ? (s.subj === 'head' ? 0.5 : 6) : 0
          else if (i === 1) x *= s.size === 0 || n === 'shoulder' ? 4 : 0.25
          // after a close-up: a medium shot (back to the keys), not the hall
          else if (ps.size === 0) x *= s.size === 1 ? 2.5 : s.size === 2 ? 0.8 : 0.15
          else if (s.size !== ps.size) x *= 1.4
          // too long close or behind her: pull out wide, or come round to her face.
          // Overrides the size grammar above; grows from ~25 s / ~35 s on
          const needWide = clamp((t - lastWide - 25 / pace) / (20 / pace), 0, 1)
          const needFace = clamp((t - lastFace - 35 / pace) / (20 / pace), 0, 1)
          if (s.size === 2) x *= 1 + 8 * needWide
          if (faceSeen(s)) x *= 1 + 6 * needFace
          // and past ~45 s it must: only those shots are left (unless far
          // shots are switched off)
          if (wideOk && needWide >= 1 && s.size !== 2) x *= 0.02
          else if (needFace >= 1 && !faceSeen(s)) x *= 0.02
          // no jump cuts: too little change of angle and size
          const dAz = Math.abs(wrap(s.az - ps.az)), dSize = Math.abs(Math.log(s.dist / ps.dist))
          if (dAz < 30 && dSize < 0.4) x *= 0.15
        }
        return Math.max(0, x)
      })
      // nothing left (the closing rules on a narrowed set): any allowed spot
      if (!w.some(x => x > 0)) names.forEach((n, j) => { w[j] = (!sizes || sizes.includes(SPOTS[n].size)) && n !== prev?.name ? 1 : 0 })
      let r = hs(i, 3) * w.reduce((a, b) => a + b, 0), k = 0
      while (k < w.length - 1 && (r -= w[k]) > 0) k++
      name = names[k]
      // a move: mostly continuous ones, a still frame now and then
      // (close up: never push or zoom in further)
      let ms = SPOTS[name].moves
      if (SPOTS[name].size === 0) { const ok = ms.filter(m => m !== 'zoomIn' && m !== 'dollyIn' && m !== 'dollyZoom'); ms = ok.length ? ok : ['orbit', 'still'] }
      // on her face close up the zooms and pull-outs lead
      const faceClose = SPOTS[name].subj === 'head' && SPOTS[name].size === 0
      const mw = ms.map(m => m === 'still' ? (faceClose ? 0.15 : 0.25) : m === 'dollyZoom' ? 0.45 : faceClose && m === 'orbit' ? 0.35 : 1)
      let q = hs(i, 4) * mw.reduce((a, b) => a + b, 0), j = 0
      while (j < ms.length - 1 && (q -= mw[j]) > 0) j++
      move = last ? 'dollyOut' : ms[j]
    }
    // into this shot: a cut, or a glide when the two spots are on the same side
    let glide = 0
    if (prev) {
      const dAz = Math.abs(wrap(SPOTS[name].az - SPOTS[prev.name].az)), dD = Math.abs(Math.log(SPOTS[name].dist / SPOTS[prev.name].dist))
      // glide only between spots on the same side and of not too different size;
      // a flat spot is reached (or left) by turning, so it glides further and more often
      const flat = SPOTS[name].flat || SPOTS[prev.name].flat
      const canGlide = dAz <= (flat ? 100 : 80) && dD < (flat ? 1.4 : 1.1) && trans !== 'cuts'
      const wantGlide = trans === 'glides' || hs(i, 5) < (E < 0.55 ? 0.75 : 0.4) + (flat ? 0.2 : 0)
      if (canGlide && wantGlide) glide = clamp((lerp(3.5, 1.8, E) + 0.012 * dAz + 1.2 * dD) / Math.sqrt(pace), 1.4, Math.min(5, 0.5 * (end - t)))
    }
    lastUsed[name] = end; uses[name] = (uses[name] || 0) + 1
    tallyAdd(tally, SPOTS[name], Math.min(end, duration) - t)
    if (SPOTS[name].size === 2) lastWide = end
    if (faceSeen(SPOTS[name])) lastFace = end
    shots.push({
      i, name, move, t0: t, t1: end, glide,
      amt: clamp((end - t) / 10, 0.45, 1.3) * (0.7 + 0.5 * E),
      dir: hs(i, 6) < 0.5 ? -1 : 1,
    })
    t = end
  }
  return shots
}

// ── A Short: one clip, framed for 9:16 ──
// planShots is a film of the whole song: it opens wide, saves its close-ups
// and pulls out at the end. A Short has seconds to hold a thumb, so it opens
// on the hands on the first downbeat, cuts every 2.5–6 s (on phrase starts),
// never goes wide, and ends on the spot and framing it opened with so the
// loop back to the start looks like one more cut. Only spots rated for
// portrait (PORTRAIT) are used. Deterministic like planShots, and seeded by
// the window too, so two clips of one piece get different films.
// window: [a, b] song seconds. Shots before a and after b are padding for the
// export's pre-roll and tail.
const HOOK = [['keysUp', 1.4], ['hands', 1], ['treble', 1], ['keysTop', 0.8], ['keys', 0.7]]
// Stacked Short (opts.half): two pictures of 9:8, one above the other: her in
// the top half (from the front half or the side, so her face shows: no shots
// from behind, nothing wide), her hands in the bottom one. Each half has its
// own plan with landscape framings; the top cuts less often (6–11 s), and
// never within 0.8 s of a cut below (opts.avoid), so the two never jump at once.
export const HALVES = {
  her: n => ['head', 'figure'].includes(SPOTS[n].subj) && SPOTS[n].size < 2 && SPOTS[n].dist < 300 && Math.abs(wrap(SPOTS[n].az)) >= 60 && !SPOTS[n].beside,
  hands: n => SPOTS[n].subj === 'hands' || SPOTS[n].subj === 'hammers',
}
const HALF_HOOK = { her: [['profile', 1], ['bust', 1], ['lowRight', 1.2], ['front', 0.6]], hands: [['hands', 1], ['treble', 1], ['keysTop', 0.8], ['keys', 0.7]] }
const SHORT_TARGETS = { keys: 0.55, her: 0.4, piano: 0.05 }
export function planShort({ duration, phrases = [], glances = [], energyAt = () => 0.3 }, opts = {}) {
  const pace = opts.pace ?? 1, bias = clamp(opts.bias ?? 0, -1, 1)
  const [A, B] = opts.window ?? [0, duration]
  const seed = songSeed({ duration, phrases }) + Math.round(A * 10) % 997 + (opts.half === 'her' ? 501 : 0), hs = (k, n) => hash(k + seed, n)
  const half = HALVES[opts.half] ? opts.half : null, avoid = half && opts.avoid || []
  const names = (half ? spotsFor(false).filter(HALVES[half]) : spotsFor(true)).filter(n => stringsOk(n, !half, opts.strings ?? null) && pedalsOk(n, opts.pedals, !half))
  const P = n => spotFor(n, !half)
  const starts = phrases.map(p => p[0]).filter(t => t > A + 1.5 && t < B - 1.5 && !avoid.some(c => Math.abs(c - t) < 0.8))
  const mean = (a, b) => { let s = 0, n = 0; for (let t = a; t < b; t += 0.25) { s += energyAt(t); n++ } return n ? s / n : 0 }
  const lookUp = (a, b) => glances.some(g => g.a < b - 0.8 && g.b > a + 0.5 && !g.quiet)
  const pick = (opts, r) => { const tot = opts.reduce((a, o) => a + o[1], 0); let q = r * tot; return opts.find(o => (q -= o[1]) <= 0)?.[0] ?? opts[0][0] }
  const shot = { keys: 0, her: 0, piano: 0 }
  const what = s => SUBJ_KIND[s.subj] === 'hands' ? 'keys' : SUBJ_KIND[s.subj] === 'pianist' ? 'her' : 'piano'
  const target = { keys: SHORT_TARGETS.keys - 0.15 * bias, her: SHORT_TARGETS.her + 0.15 * bias, piano: SHORT_TARGETS.piano }
  const lastUsed = {}, shots = []
  const closeMoves = ms => { const ok = ms.filter(m => m !== 'zoomIn' && m !== 'dollyIn' && m !== 'dollyZoom'); return ok.length ? ok : ['orbit', 'still'] }
  let t = A
  for (let i = 0; t < B; i++) {
    const E = mean(t, t + 4), h = hs(i, 1)
    const L = (half === 'her' ? lerp(11, 6, clamp(E, 0, 1)) : lerp(6, 2.8, clamp(E, 0, 1))) * (0.85 + 0.3 * h) / pace
    let end = t + L
    const cand = starts.filter(s => s > t + 0.6 * L && s < t + 1.5 * L)
    if (cand.length) end = cand.reduce((b, s) => Math.abs(s - t - L) < Math.abs(b - t - L) ? s : b)
    end = Math.max(end, t + 2.2)
    // (not on a cut in the other half)
    for (const c of avoid) if (Math.abs(c - end) < 0.8) end = c + (end < c && c - 0.9 > t + 2.2 ? -0.9 : 0.9)
    const last = B - end < Math.max(2.2, 0.5 * L)
    if (last) end = B
    const prev = shots[i - 1], prev2 = shots[i - 2], first = shots[0]
    let name, move
    if (i === 0 && opts.opening === 'wide' && half !== 'hands') {
      // opening wide on the whole stage, a slow push in, then the plan as usual
      name = 'stage'; move = 'dollyIn'; end = Math.max(end, t + 5.5)
    } else if (i === 0) {
      // the hook: straight onto the hands
      const hook = (half ? HALF_HOOK[half] : HOOK).filter(([n]) => names.includes(n))
      name = hook.length ? pick(hook, hs(i, 3)) : names[Math.floor(hs(i, 3) * names.length)]
      move = hs(i, 4) < 0.55 ? 'still' : 'orbit'
    } else if (last && prev.name === first.name) {
      // already back where it began: that shot runs to the end
      prev.t1 = B; break
    } else if (last) {
      // back where it began
      name = first.name; move = first.move
    } else {
      const up = lookUp(t, end), tot = shot.keys + shot.her + shot.piano
      const w = names.map(n => {
        const s = P(n), kind = what(s)
        if (prev && n === prev.name) return 0
        // the one before the last can't be the first spot (the last one is)
        if (first && n === first.name && B - end < 6) return 0
        let x = kind === 'keys' ? 0.5 + 0.5 * E - 0.3 * bias : kind === 'her' ? 0.45 - 0.2 * E + 0.3 * bias : 0.15
        x *= s.p === 2 ? 1.4 : 0.6
        if (tot > 6) x *= Math.exp(6 * (target[kind] - shot[kind] / tot))
        if (t - (lastUsed[n] ?? -1e9) < 18 / pace) x *= 0.2
        if (prev2 && n === prev2.name) x *= 0.3
        if (prev2 && what(P(prev.name)) === kind && what(P(prev2.name)) === kind) x *= 0.35
        if (up) x *= s.subj === 'head' ? 2.5 : 0.4
        if (prev) {
          const ps = P(prev.name)
          // alternate sizes, and no jump cuts
          if (s.size !== ps.size) x *= 1.5
          const dAz = Math.abs(wrap(s.az - ps.az)), dSize = Math.abs(Math.log(s.dist / ps.dist))
          if (dAz < 30 && dSize < 0.4 && Math.abs(s.el - ps.el) < 25) x *= 0.1
        }
        return Math.max(0, x)
      })
      if (!w.some(x => x > 0)) names.forEach((n, j) => { w[j] = n !== prev?.name ? 1 : 0 })
      let r = hs(i, 3) * w.reduce((a, b) => a + b, 0), k = 0
      while (k < w.length - 1 && (r -= w[k]) > 0) k++
      name = names[k]
      let ms = P(name).moves
      if (P(name).size === 0) ms = closeMoves(ms)
      const mw = ms.map(m => m === 'still' ? 0.5 : m === 'crane' ? 0.4 : 1)
      let q = hs(i, 4) * mw.reduce((a, b) => a + b, 0), j = 0
      while (j < ms.length - 1 && (q -= mw[j]) > 0) j++
      move = ms[j]
    }
    lastUsed[name] = end
    const dur = Math.min(end, B) - t
    shot[what(P(name))] += dur
    shots.push({ i, name, move, t0: t, t1: end, glide: 0, amt: clamp(dur / 8, 0.4, 1) * (0.7 + 0.5 * E), dir: hs(i, 6) < 0.5 ? -1 : 1 })
    t = end
  }
  // the last shot runs its first shot's move backwards, so it ends where the Short began
  const f = shots[0], z = shots[shots.length - 1]
  if (shots.length > 1 && z.name === f.name) { z.move = f.move; z.amt = f.amt; z.dir = -f.dir; z.reverse = true }
  // padding: the export's pre-roll and tail stay on the first and last shots
  f.t0 = Math.min(f.t0, A - 3); z.t1 = Math.max(z.t1, B + 6)
  return shots
}

/**
 * The live director. update() gives the camera for song time t:
 *   { pos, target, fov, focus: 'hands' | 'head', wide: bool, shot }
 * anchors: { hands, head } (Vector3, live); smoothed here like an operator.
 */
export function createDirector(opts = {}) {
  // follow: false = each shot frames her where she is when it starts and
  // holds that framing (her rocking and sway move within a still frame)
  // fadeIn: seconds the opening shot takes to come up from black
  const o = { pace: 1, bias: 0, trans: 'mix', follow: false, fadeIn: 2.5, ...opts }
  let shots = null, source = null, idleT = 0
  const anchor = { hands: new THREE.Vector3(0, 76, 0), head: new THREE.Vector3(0, 122, 32), figure: new THREE.Vector3(), piano: new THREE.Vector3(), feet: new THREE.Vector3(0, 12, 18), hammers: new THREE.Vector3(0, 85, -36.5), pedals: new THREE.Vector3(0, 7, -2) }
  let primed = false, swayT = 0
  const seqs = {}   // take lists for sequence(): random / the director's cut
  const A = {}, B = {}, out = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 34, focus: 'head', wide: false, shot: null }
  const ta = new THREE.Vector3(), tb = new THREE.Vector3()

  // o.portrait: a Short (planShort over o.window, portrait framings)
  // o.half: one half of a stacked Short ('her' / 'hands'), landscape framings
  const plan = src => o.portrait || o.half ? planShort(src, o) : planShots(src, o)
  const spot = name => spotFor(name, o.portrait && !o.half)
  function replan() {
    shots = plan(source ?? { duration: 600 })
  }
  replan()
  function shotAt(t) {
    let lo = 0, hi = shots.length - 1
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (shots[m].t0 <= t) lo = m; else hi = m - 1 }
    return lo
  }
  function subjectPoint(s, target, sh) {
    subjectAt(s, target, sh)
    if (s.aim) target.x += s.aim[0], target.y += s.aim[1], target.z += s.aim[2]
    return target
  }
  function subjectAt(s, target, sh) {
    const a = anchor[s.subj]
    // not following: every subject is where it was when the shot began
    if (!o.follow && sh?.lock) {
      const H = sh.lockHands ?? anchor.hands
      if (s.subj === 'head') return target.copy(sh.lock)
      if (s.subj === 'hands') return target.copy(H)
      if (s.subj === 'figure') return target.lerpVectors(H, sh.lock, 0.55).add(tb.set(0, -6, 4))
      if (s.subj === 'piano') return target.set(H.x * 0.3, 90, -70)
      if (s.subj === 'hammers') return target.set(H.x, 85, -36.5)
    }
    return target.copy(a)
  }
  let lockIdx = -1
  function shotParams(sh, t, P, target) {
    const s = spot(sh.name)
    applyMove(s, sh.move, clamp((t - sh.t0) / (sh.t1 - sh.t0), 0, 1), sh.amt, sh.dir, P)
    subjectPoint(s, target, sh)
    return P
  }
  function place(P, target, pos) {
    const az = P.az * D2R, el = P.el * D2R
    return pos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(P.dist).add(target)
  }

  return {
    opts: o,
    get shots() { return shots },
    /** song: { duration, phrases, glances, energyAt } or null for the idle plan */
    setSong(song) { source = song; replan() },
    set(k, v) { o[k] = v; if (k !== 'follow') { replan(); lockIdx = -1 } },
    /** t: song time, or null to run on the director's own clock */
    update(t, dt, live) {
      // the operator follows the subjects with a little lag (~0.5 s)
      const k = primed ? 1 - Math.exp(-dt / 0.5) : 1
      anchor.hands.lerp(live.hands, k)
      anchor.head.lerp(live.head, primed ? 1 - Math.exp(-dt / 0.35) : 1)
      anchor.figure.lerpVectors(anchor.hands, anchor.head, 0.55).add(ta.set(0, -6, 4))
      anchor.piano.set(anchor.hands.x * 0.3, 90, -70)
      // the strike line (concert-grand.js STRIKE_Z) under the hands; the pedals' middle
      anchor.hammers.set(anchor.hands.x, 85, -36.5)
      primed = true
      const onSong = t != null
      if (t == null) { idleT += dt; t = idleT % shots[shots.length - 1].t1 }
      const idx = shotAt(t), sh = shots[idx]
      // a new shot locks onto where she is now (the shot gliding out keeps its own)
      if (idx !== lockIdx) {
        for (const x of shots) if (x !== sh && x !== shots[idx - 1]) x.lock = null
        sh.lock = anchor.head.clone(); sh.lockHands = anchor.hands.clone()
        if (idx > 0 && !shots[idx - 1].lock) { shots[idx - 1].lock = anchor.head.clone(); shots[idx - 1].lockHands = anchor.hands.clone() }
        lockIdx = idx
      }
      shotParams(sh, t, A, ta)
      const u = sh.glide ? clamp((t - sh.t0) / sh.glide, 0, 1) : 1
      if (u < 1 && idx > 0) {
        // glide from the previous shot (still running its own move) into this one
        shotParams(shots[idx - 1], t, B, tb)
        const e = sstep(u, 0, 1)
        A.az = B.az + wrap(A.az - B.az) * e
        A.el = lerp(B.el, A.el, e)
        // a little lift away from her in the middle of the move
        A.dist = Math.exp(lerp(Math.log(B.dist), Math.log(A.dist), e)) * (1 + 0.12 * Math.sin(Math.PI * e))
        A.fov = lerp(B.fov, A.fov, e)
        ta.lerpVectors(tb, ta, e)
      }
      out.target.copy(ta)
      place(A, ta, out.pos)
      // handheld breath, scaled to the framing
      // (on the frame clock, so an offline render breathes at the same rate)
      swayT += dt
      const w = swayT, amp = 0.0035 * A.dist * (A.fov / 34)
      out.pos.x += amp * (Math.sin(w * 0.53) + 0.5 * Math.sin(w * 1.31 + 1))
      out.pos.y += amp * 0.7 * (Math.sin(w * 0.71 + 2) + 0.4 * Math.sin(w * 1.7))
      out.target.x += amp * 0.25 * Math.sin(w * 0.43 + 3)
      out.pos.y = Math.max(out.pos.y, 8)
      out.fov = A.fov
      const cur = u < 0.5 && idx > 0 ? shots[idx - 1] : sh
      const subj = spot(cur.name).subj
      out.focus = subj === 'hands' || subj === 'feet' ? 'hands' : subj === 'hammers' || subj === 'pedals' ? 'target' : 'head'
      out.wide = spot(cur.name).size === 2
      out.shot = cur
      // the opening fades in from black over its first o.fadeIn seconds
      // (a Short starts on the music: no fade)
      out.fade = idx === 0 && onSong && !o.portrait && !o.half ? sstep(t, 0, o.fadeIn || 2.5) : 1
      return out
    },
    /** a fixed view with a looping move: pos/target arrays, move name, wall time */
    fixed(view, move, w, res = out) {
      ta.fromArray(view.target); tb.fromArray(view.pos).sub(ta)
      const dist = tb.length()
      const s = { az: Math.atan2(tb.x, tb.z) / D2R, el: Math.asin(tb.y / dist) / D2R, dist, fov: view.fov, minDist: view.minDist }
      // there and back over ~28 s
      const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * w / 28)
      applyMove(s, move, u, 1, 1, A)
      if (move === 'orbit') A.az = s.az + 14 * Math.sin(2 * Math.PI * w / 60)
      res.target.copy(ta); place(A, ta, res.pos); res.fov = A.fov
      return res
    },
    /**
     * A fixed view whose move changes take by take. mode 'random': any move,
     * any length; 'cut' (the director's cut): mostly a slow orbit, now and then
     * a zoom in or out on her face, a crane only sparingly. Each take's move is
     * centred on the view's own framing; the first 3 s of a take glide out of
     * where the last one ended. w: seconds on this view, live: { head }.
     */
    sequence(view, mode, w, live, res = out) {
      const q = seqs[mode] ??= { takes: [], seed: 0 }
      ta.fromArray(view.target); tb.fromArray(view.pos).sub(ta)
      const dist = tb.length()
      const s = { az: Math.atan2(tb.x, tb.z) / D2R, el: Math.asin(tb.y / dist) / D2R, dist, fov: view.fov, orbitMax: view.orbitMax }
      // a new view (or going back in time) starts the takes again
      const key = view.pov ? 'pov' : view.pos.join() + view.target.join()
      if (w < q.lastW || !q.takes.length || q.key !== key) { q.takes = []; q.uses = {}; q.key = key; q.seed = mode === 'random' ? Math.random() * 1000 : 17 + (source ? songSeed(source) : 0); q.hands = null }
      const dw = clamp(w - (q.lastW ?? w), 0, 0.1)
      q.lastW = w
      while (!q.takes.length || q.takes[q.takes.length - 1].t1 <= w) addTake(q, mode, s, view)
      // the operator follows the hands with a little lag
      if (live?.hands) { if (!q.hands) q.hands = live.hands.clone(); else q.hands.lerp(live.hands, 1 - Math.exp(-dw / 0.6)) }
      // she can be seen from the front half: zooms there frame her face
      const facing = Math.abs(wrap(s.az)) > 75
      let k = 0
      while (q.takes[k].t1 <= w) k++
      const tk = q.takes[k]
      // (each take locks onto her head where it starts, unless following)
      if (live?.head && !tk.lock) tk.lock = live.head.clone()
      if (!tk.lockHands && q.hands) tk.lockHands = q.hands.clone()
      const headAt = () => o.follow || !tk.lock ? live?.head ?? tk.lock : tk.lock
      const targetOf = (t, out) => {
        // not following: the hands are where they were when the take began
        const hands = (o.follow ? q.hands : t.lockHands ?? q.hands) ?? ta
        switch (t.frame) {
          case 'scene': return out.set(0, 80, -55)
          case 'piano': return out.set(0.4 * hands.x, 86, -45)
          case 'fingers': return out.copy(hands)
          case 'face': return out.copy(t.lock ?? headAt())
          case 'figure': return out.copy(t.lock ?? headAt()).lerp(hands, 0.45)
          default: {
            out.fromArray(view.target)
            const h = t.onHer && facing ? sstep((w - t.t0) / (t.t1 - t.t0), 0, 0.35) : 0
            if (h > 0 && live?.head) out.lerp(o.follow ? live.head : t.lock ?? live.head, h)
            return out
          }
        }
      }
      takeAt(s, tk, (w - tk.t0) / (tk.t1 - tk.t0), A)
      targetOf(tk, res.target)
      // (Transitions: Cuts only cuts here too)
      const g = k > 0 && tk.blend && o.trans !== 'cuts' ? sstep(w - tk.t0, 0, 3) : 1
      if (g < 1) {
        const pk = q.takes[k - 1]
        takeAt(s, pk, 1, B)
        A.az = B.az + wrap(A.az - B.az) * g; A.el = lerp(B.el, A.el, g)
        A.dist = Math.exp(lerp(Math.log(B.dist), Math.log(A.dist), g)); A.fov = lerp(B.fov, A.fov, g)
        res.target.lerpVectors(targetOf(pk, tb), res.target, g)
      }
      A.el = clamp(A.el, -10, 86); A.fov = clamp(A.fov, 8, 75)
      place(A, res.target, res.pos); res.fov = A.fov
      res.shot = tk; res.move = tk.move; res.frame = tk.frame
      res.focus = tk.frame === 'fingers' || tk.frame === 'piano' ? 'hands' : tk.frame === 'home' ? null : 'head'
      res.wide = tk.size === 2
      return res
    },
  }
}
