// Case, lid, desk, fallboard and prop of the D-class grand (research/piano.md sections 3-4, D outline 3.2).
// Every lacquer edge is filleted (2-6 mm) so highlights roll off like a real polyester finish.
import * as THREE from 'three';
import {
  MeshBuilder, roundProfile, profilePoints, densify, ensureCCW, sweep, planFrames, roundedSlab, roundedOutline,
  basisMatrix, finish, tube, lathe, polygonNormals, mergeGeos,
} from './util.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// slab outline in (z, y), thickness along +x from x0
const sideSlabMatrix = (x0) => basisMatrix(V3(0, 0, 1), V3(0, 1, 0), V3(1, 0, 0), V3(x0, 0, 0));
// slab outline in (x, y), thickness along +z from z0
const frontSlabMatrix = (z0) => basisMatrix(V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1), V3(0, 0, z0));

/** Rounded box via the slab builder (all 12 edges filleted). */
export function roundedBox(x0, x1, y0, y1, z0, z1, r, rc = r) {
  const out = roundedOutline([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [rc, rc, rc, rc], 5);
  const mb = roundedSlab(out, y1 - y0, { rTop: r, rBot: r, seg: 4 });
  return finish(mb, new THREE.Matrix4().makeTranslation(0, y0, 0));
}

/** Thin plate in the y-z plane (face normal along x), thickness along +x from x0, corners rounded in the face. */
function leafPlate(x0, thick, y0, y1, z0, z1, rc) {
  const out = roundedOutline([[z0, y0], [z1, y0], [z1, y1], [z0, y1]], [rc, rc, rc, rc], 4);
  return finish(roundedSlab(out, thick, { rTop: 0.0006, rBot: 0.0003, seg: 2 }), sideSlabMatrix(x0));
}

function catmullRom2D(P, nPer = 8) {
  const pts = P.map((p) => new THREE.Vector2(p[0], p[1]));
  const curve = new THREE.SplineCurve(pts);
  return curve.getPoints(nPer * (P.length - 1)).map((v) => [v.x, v.y]);
}

/** Clip a polygon to a <= coord <= b along axis k (0: x, 1: z) (Sutherland-Hodgman). */
function clipAxis(poly, k, lo, hi) {
  const clip = (pts, inside, inter) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(inter(a, b));
    }
    return out;
  };
  const lerpAt = (a, b, v) => { const t = (v - a[k]) / (b[k] - a[k]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  let p = clip(poly, (q) => q[k] >= lo, (a, b) => lerpAt(a, b, lo));
  p = clip(p, (q) => q[k] <= hi, (a, b) => lerpAt(a, b, hi));
  return p;
}

/** Round the corners of a dense polygon where the turning angle exceeds `minTurnDeg`. */
function roundSharpCorners(poly, r, minTurnDeg = 25, seg = 6) {
  const n = poly.length; const radii = [];
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], p = poly[i], b = poly[(i + 1) % n];
    const d1 = Math.atan2(p[1] - a[1], p[0] - a[0]), d2 = Math.atan2(b[1] - p[1], b[0] - p[0]);
    let t = Math.abs(d2 - d1); if (t > Math.PI) t = 2 * Math.PI - t;
    radii.push(t * 180 / Math.PI > minTurnDeg ? r : 0);
  }
  return profilePoints(roundProfile(ensureCCW(poly), radii, { closed: true, seg }));
}

export function buildCase(L, M) {
  const group = new THREE.Group(); group.name = 'case';
  const RIM = L.rimThickness, W = L.caseWidth;
  const H = L.heights;
  const outline = L.caseOutline.map((p) => [p[0], p[1]]);
  const ccw = ensureCCW(outline);
  const add = (geo, mat, name, parent = group) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // ------------------------------------------------------------------ rim (outer case + inner rim), one sweep
  // rim path: CCW outline from the treble side (z = 0.66) around the tail to the spine (z = 0.66)
  const Z_ARM_OVERLAP = 0.66;
  let start = ccw.findIndex((p, i) => p[0] > W - 1e-6 && p[1] >= Z_ARM_OVERLAP);
  // build an ordered list starting on the treble straight side, densified
  const dense = densify(ccw, 0.012, true);
  const n = dense.length;
  // locate entry on the treble side and exit on the spine
  let i0 = dense.findIndex((p) => p[0] > W - 1e-6 && Math.abs(p[1] - Z_ARM_OVERLAP) < 0.007);
  if (i0 < 0) i0 = dense.findIndex((p) => p[0] > W - 1e-6 && p[1] > Z_ARM_OVERLAP);
  const path = [];
  for (let k = 0; k < n; k++) {
    const p = dense[(i0 + k) % n];
    if (k > 10 && p[0] < 1e-6 && p[1] <= Z_ARM_OVERLAP) { path.push([0, Z_ARM_OVERLAP]); break; }
    path.push(p);
  }
  path[0] = [W, Z_ARM_OVERLAP];
  // outer top fillet 5 mm (was 3): wide enough to carry the thin warm rim-cap line of the references at wide-shot scale
  const rimProf = roundProfile([[0, H.rimBottom], [0, H.rimTop], [-RIM, H.rimTop], [-RIM, H.rimBottom]], [0.002, 0.005, 0.006, 0.002], { closed: true, seg: 8 });
  const frames = planFrames(path, { closed: false });
  add(finish(sweep(frames, rimProf)), M.lacquer, 'rim');
  // inner rim: finished wood (refs 1, 6, 11 show a warm mahogany inner rim under the black cap): a 1.2 mm veneer band
  // straddling the inner face from below the soundboard to 12 mm under the rim top (the black lacquer cap and its
  // 6 mm inner fillet stay above it)
  {
    const yb = 0.800, yt = H.rimTop - 0.012;
    const vProf = roundProfile([[-RIM + 0.0006, yb], [-RIM + 0.0006, yt], [-RIM - 0.0006, yt], [-RIM - 0.0006, yb]], [0, 0.0003, 0.0005, 0], { closed: true, seg: 3 });
    add(finish(sweep(frames, vProf)), M.innerWood, 'innerRimWood');
  }
  // bottom molding under the rim (y 0.682 - 0.712, set back 4 mm)
  const molPath = path.filter((p) => p[1] >= 0.70 || (p[0] > 0.01 && p[0] < W - 0.01));
  molPath[0] = [W, 0.70]; molPath[molPath.length - 1] = [0, 0.70];
  const molProf = roundProfile([[-0.004, H.rimBottom - 0.030], [-0.004, H.rimBottom], [-RIM + 0.004, H.rimBottom], [-RIM + 0.004, H.rimBottom - 0.030]], [0.0015, 0, 0, 0.002], { closed: true, seg: 4 });
  add(finish(sweep(planFrames(molPath), molProf)), M.lacquer, 'rimMolding');

  // ------------------------------------------------------------------ case arms with the S-scroll (side profile, extruded in x)
  const scroll = [[0.156, 1.000], [0.149, 0.989], [0.142, 0.979], [0.135, 0.958], [0.135, 0.947], [0.142, 0.937], [0.156, 0.916],
    [0.163, 0.895], [0.163, 0.854], [0.156, 0.833], [0.139, 0.812], [0.115, 0.802], [0.059, 0.791], [0.017, 0.781], [0.007, 0.770],
    [0.000, 0.750], [0.000, 0.698], [0.004, 0.687], [0.017, 0.677], [0.014, 0.666], [0.021, 0.635], [0.021, 0.625]];
  const scrollDense = catmullRom2D(scroll, 6);
  const ARM_BACK = 0.75;
  const armPoly = [...scrollDense,
    [0.70, 0.625], [0.70, H.rimBottom], [ARM_BACK, H.rimBottom], [ARM_BACK, H.rimTop], [0.162, H.rimTop]];
  // radii: smooth spline points 0; explicit corners get fillets
  const radii = armPoly.map((p, i) => (i < scrollDense.length ? (i === scrollDense.length - 1 ? 0.003 : 0) : [0.010, 0.010, 0.002, 0.002, 0.004][i - scrollDense.length]));
  radii[0] = 0.003;
  const armOutline = profilePoints(roundProfile(ensureCCW(armPoly), ensureCCW(armPoly) === armPoly ? radii : radii.slice().reverse(), { closed: true, seg: 5 }));
  const armMB = () => roundedSlab(armOutline, RIM, { rTop: 0.003, rBot: 0.003, seg: 4 });
  add(finish(armMB(), sideSlabMatrix(0)), M.lacquer, 'armBass');
  add(finish(armMB(), sideSlabMatrix(W - RIM)), M.lacquer, 'armTreble');

  // ------------------------------------------------------------------ cheek blocks, key slip, keybed
  const kb = L.keyboard;
  const cheekPoly = [[0.0, 0.6695], [0.172, 0.6695], [0.172, 0.738], [0.0, 0.738]];
  const cheekOut = profilePoints(roundProfile(ensureCCW(cheekPoly), [0.002, 0.003, 0.003, 0.012], { closed: true, seg: 6 }));
  // ensureCCW may reverse: compute radii on the CCW order explicitly
  const cheekCCW = ensureCCW(cheekPoly);
  const cheekR = cheekCCW.map((p) => (p[0] === 0.0 && p[1] === 0.738 ? 0.012 : (p[1] === 0.738 ? 0.003 : 0.002)));
  const cheekOutline = profilePoints(roundProfile(cheekCCW, cheekR, { closed: true, seg: 6 }));
  void cheekOut;
  const cL = kb.cheekBlocks.leftX, cR = kb.cheekBlocks.rightX;
  add(finish(roundedSlab(cheekOutline, cL[1] - cL[0], { rTop: 0.003, rBot: 0.003 }), sideSlabMatrix(cL[0])), M.lacquer, 'cheekBass');
  add(finish(roundedSlab(cheekOutline, cR[1] - cR[0], { rTop: 0.003, rBot: 0.003 }), sideSlabMatrix(cR[0])), M.lacquer, 'cheekTreble');
  add(roundedBox(cL[1], cR[0], 0.661, kb.keySlip.y[1], 0.0, 0.020, 0.0015), M.lacquer, 'keySlip');
  add(roundedBox(RIM, W - RIM, H.keybedBottom, 0.660, 0.003, 0.70, 0.002), M.lacquer, 'keybedFront');
  // keybed top board (under the keys, hidden) + floor of the action cavity
  add(roundedBox(cL[1], cR[0], 0.660, H.keybedTop, 0.02, 0.70, 0.001), M.matteBlack, 'keybedTop');

  // ------------------------------------------------------------------ fallboard (open) + burgundy felt strip
  const fb = kb.fallboardOpen;
  const fbPoly = [[0.172, 0.7185], [0.250, 0.7185], [0.250, 0.790], [0.172, 0.790]];
  const fbCCW = ensureCCW(fbPoly);
  const fbR = fbCCW.map((p) => (p[0] === 0.172 && p[1] === 0.790 ? 0.016 : (p[1] === 0.790 ? 0.004 : 0.002)));
  const fbOutline = profilePoints(roundProfile(fbCCW, fbR, { closed: true, seg: 8 }));
  add(finish(roundedSlab(fbOutline, fb.x[1] - fb.x[0], { rTop: 0.003, rBot: 0.003, seg: 4 }), sideSlabMatrix(fb.x[0])), M.lacquer, 'fallboard');
  add(roundedBox(kb.left - 0.002, kb.right + 0.002, 0.7156, 0.7188, 0.1712, 0.182, 0.0008), M.burgundyFelt, 'fallboardFelt');
  // pinblock front panel visible between the fallboard and the plate
  // starts above the key levers (critic round 1: from 0.700 it cut all 88 keys at z 0.25)
  // round 2: polished lacquer, not satin (critic r2: in the ref-12 hero macros S06 / S13 / S24 the satin panel was the
  // largest piano surface, a flat matte-mauve wall where ref 12 shows a black mirror)
  // cycle 2 (critic c2 + integration I-31: a 21 cm open band between the fallboard roll (0.79) and the music desk (1.00)
  // showed the damper heads and the tuning-pin row in every key-level close-up, where refs 7 / 8 / 12 show one tall black
  // mirror above the keys): the panel now rises to the desk rail as a lacquered pin-block cover (desk-rail panel), 5.5 mm
  // thick so it stays 0.5 mm in front of the plate's front edge (z 0.256)
  add(roundedBox(RIM, W - RIM, 0.719, 0.9845, 0.250, 0.2555, 0.001), M.lacquer, 'pinblockFront');

  // ------------------------------------------------------------------ desk rail + music desk with scroll ends and ledge
  add(roundedBox(RIM, W - RIM, 0.9845, 1.000, 0.236, 0.300, 0.002), M.lacquer, 'deskRail');
  const desk = L.musicDesk;
  const deskGroup = new THREE.Group(); deskGroup.name = 'musicDesk';
  const tilt = desk.tiltDeg * Math.PI / 180;
  const up = V3(0, Math.cos(tilt), Math.sin(tilt));
  const back = V3(0, -Math.sin(tilt), Math.cos(tilt));
  const origin = V3(0, desk.bottomZY[1], desk.bottomZY[0]);
  const x0 = desk.x[0], x1 = desk.x[1], Hd = desk.height, T = desk.thickness;
  // panel outline in (x, s): concave scroll at the lower corners ("ears"), rounded top corners
  const ear = 0.065, earH = 0.105;
  const panel = [];
  const scrollCurve = (xa, sgn) => { // from bottom (xa + sgn*ear, 0) curving out to (xa, earH)
    const pts = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16; // cove: quarter ellipse-ish S-curve
      const sx = xa + sgn * ear * (1 - Math.sin(t * Math.PI / 2)) ** 1.6;
      const sy = earH * (1 - Math.cos(t * Math.PI / 2)) ** 0.75;
      pts.push([sx, sy]);
    }
    return pts;
  };
  const leftCurve = scrollCurve(x0, +1); // from (x0+ear, 0) to (x0, earH)
  const rightCurve = scrollCurve(x1, -1).reverse(); // from (x1, earH) to (x1-ear, 0)
  panel.push(...rightCurve.reverse().reverse());
  const deskPoly = [[x0 + ear, 0], [x1 - ear, 0], ...scrollCurve(x1, -1).slice(1), [x1, Hd], [x0, Hd], ...leftCurve.slice().reverse().slice(0, -1)];
  const deskCCW = ensureCCW(deskPoly);
  const deskR = deskCCW.map((p) => ((Math.abs(p[1] - Hd) < 1e-9) ? 0.012 : (Math.abs(p[1]) < 1e-9 ? 0.004 : 0)));
  const deskOutline = profilePoints(roundProfile(deskCCW, deskR, { closed: true, seg: 6 }));
  // slab local: a -> x, b -> s (up the panel), c -> thickness (toward the back)
  const deskM = basisMatrix(V3(1, 0, 0), up, back, origin);
  add(finish(roundedSlab(deskOutline, T, { rTop: 0.004, rBot: 0.004, seg: 5 }), deskM), M.lacquer, 'deskPanel', deskGroup);
  // ledge (music rest): a shelf in front of the panel bottom with a lip
  const ledgeOrigin = origin.clone().addScaledVector(back, -desk.ledge.depth).addScaledVector(up, -0.002);
  const ledgeOutline = roundedOutline([[x0 + ear - 0.01, 0], [x1 - ear + 0.01, 0], [x1 - ear + 0.01, desk.ledge.depth + 0.004], [x0 + ear - 0.01, desk.ledge.depth + 0.004]], [0.006, 0.006, 0.003, 0.003], 5);
  // ledge plane: a -> x, b -> back (depth), c -> up (thickness)
  const ledgeM = basisMatrix(V3(1, 0, 0), back, up, ledgeOrigin);
  add(finish(roundedSlab(ledgeOutline, desk.ledge.thickness, { rTop: 0.003, rBot: 0.002 }), ledgeM), M.lacquer, 'deskLedge', deskGroup);
  const lipOrigin = ledgeOrigin.clone().addScaledVector(up, desk.ledge.thickness - 0.001);
  const lipOutline = roundedOutline([[x0 + ear - 0.008, 0], [x1 - ear + 0.008, 0], [x1 - ear + 0.008, 0.008], [x0 + ear - 0.008, 0.008]], [0.003, 0.003, 0.003, 0.003], 4);
  add(finish(roundedSlab(lipOutline, desk.ledge.lip, { rTop: 0.0035, rBot: 0.001 }), basisMatrix(V3(1, 0, 0), back, up, lipOrigin)), M.lacquer, 'deskLip', deskGroup);
  // scroll brackets under the ears, resting on the desk rail (C-scroll side supports)
  const brk = [[0.000, 0.000], [0.050, 0.000], [0.050, 0.020], [0.030, 0.034], [0.014, 0.060], [0.010, 0.090], [0.0, 0.105]];
  for (const [xb, sgn] of [[x0 + 0.012, 1], [x1 - 0.012 - 0.016, -1]]) {
    const bp = ensureCCW(brk);
    const bo = profilePoints(roundProfile(bp, bp.map(() => 0.006), { closed: true, seg: 5 }));
    // profile in (back-distance, up); thickness along x
    const m = basisMatrix(back.clone(), up.clone(), V3(1, 0, 0), origin.clone().add(V3(xb, 0, 0)).addScaledVector(back, T - 0.002));
    add(finish(roundedSlab(bo, 0.016, { rTop: 0.003, rBot: 0.003 }), m), M.lacquer, 'deskBracket', deskGroup);
    void sgn;
  }
  group.add(deskGroup);

  // ------------------------------------------------------------------ lid (main + folded front flap), hinges
  const lid = L.lid;
  const lidGroup = new THREE.Group(); lidGroup.name = 'lid';
  // planform: case outline offset 4 mm outward, flush on the spine
  const nrm = polygonNormals(densify(ccw, 0.01, true));
  const dd = densify(ccw, 0.01, true);
  const lidPlan = dd.map((p, i) => {
    const off = p[0] < 1e-6 ? 0 : lid.overhang;
    return [Math.max(0, p[0] + nrm[i][0] * nrm[i][2] * off), p[1] + nrm[i][1] * nrm[i][2] * (p[0] < 1e-6 ? 0 : off)];
  });
  const flapZ = lid.frontFlapZ;
  const mainPoly = roundSharpCorners(clipAxis(lidPlan, 1, flapZ[1] + 0.0015, 10), 0.008, 20);
  const flapPoly = roundSharpCorners(clipAxis(lidPlan, 1, flapZ[0], flapZ[1] - 0.0015), 0.008, 20);
  // the lid is modelled in "lid space": hinge axis at the origin (x = hinge.x, y = hinge.y), closed position
  const hx = lid.hingeAxis.x, hy = lid.hingeAxis.y;
  const lidMain = finish(roundedSlab(mainPoly, lid.thickness, { rTop: 0.006, rBot: 0.0045, seg: 6 }), new THREE.Matrix4().makeTranslation(-hx, H.rimTop - hy, 0));
  add(lidMain, M.lacquer, 'lidMain', lidGroup);
  const flapGeo = finish(roundedSlab(flapPoly, lid.thickness, { rTop: 0.006, rBot: 0.0045, seg: 6 }), new THREE.Matrix4().makeTranslation(-hx, H.rimTop - hy, 0));
  const flapPivot = new THREE.Group(); flapPivot.name = 'flapPivot';
  // fold line: z = flapZ[1], y = lid top (rimTop + thickness) in lid space
  const foldY = H.rimTop + lid.thickness - hy;
  flapPivot.position.set(0, foldY, flapZ[1]);
  const flapMesh = new THREE.Mesh(flapGeo, M.lacquer); flapMesh.name = 'lidFlap'; flapMesh.castShadow = flapMesh.receiveShadow = true;
  flapMesh.position.set(0, -foldY, -flapZ[1]);
  flapPivot.add(flapMesh);
  flapPivot.rotation.x = Math.PI; // folded back onto the main lid
  lidGroup.add(flapPivot);
  // continuous piano hinge between flap and main lid (brass knuckle along x)
  const xr = [0.004, lidPlan.reduce((m, p) => (Math.abs(p[1] - flapZ[1]) < 0.05 ? Math.max(m, p[0]) : m), 0) - 0.01];
  const hingeMB = tube([V3(xr[0] - hx, foldY, flapZ[1]), V3(xr[1] - hx, foldY, flapZ[1])], 0.0032, { radial: 12, caps: 'round' });
  add(finish(hingeMB), M.brass, 'flapHinge', lidGroup);
  // spine butt hinges: knuckle on the axis + leaves (case leaf on the spine face, lid leaf on the lid edge)
  // butt hinge: 5-knuckle barrel (alternate knuckles on the case / lid leaf, fine joint lines) + pin caps; the case leaf
  // runs down the spine face from the barrel, the lid leaf up the lid's spine edge; two countersunk screws per leaf
  const screwGeo = finish(lathe(roundProfile([[0.0, 0.0], [0.0032, 0.0], [0.0030, 0.0007], [0.0, 0.0010]], [0, 0.0004, 0.0006, 0], { seg: 3 }), { segments: 16 }));
  const capGeo = finish(lathe(roundProfile([[0.0, -0.0016], [0.0042, -0.0016], [0.0044, 0.0], [0.0, 0.0012]], [0, 0.0005, 0.0008, 0], { seg: 3 }), { segments: 16 }));
  const hingeLid = [], hingeCase = [], hingeScrews = [];
  for (const zH of lid.hingesZ) {
    const kn = 5, kl = 0.050 / kn;
    for (let k = 0; k < kn; k++) {
      const z0 = zH - 0.025 + k * kl + 0.0002, z1 = zH - 0.025 + (k + 1) * kl - 0.0002;
      hingeLid.push(finish(tube([V3(0, 0, z0), V3(0, 0, z1)], 0.0058, { radial: 20, caps: 'flat' })));
    }
    for (const zc of [zH - 0.0262, zH + 0.0262]) hingeLid.push(capGeo.clone().applyMatrix4(new THREE.Matrix4().makeRotationX(zc > zH ? Math.PI / 2 : -Math.PI / 2).setPosition(0, 0, zc)));
    // lid leaf on the lid's spine edge (lid space: the spine face is at x = -hx), case leaf down the spine face
    hingeLid.push(leafPlate(-hx - 0.0021, 0.0021, -0.002, lid.thickness / 2 - 0.0015, zH - 0.025, zH + 0.025, 0.003));
    hingeCase.push(leafPlate(-0.0021, 0.0021, H.rimTop - 0.034, hy + 0.0035, zH - 0.025, zH + 0.025, 0.004));
    for (const dz of [-0.013, 0.013]) hingeScrews.push(screwGeo.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(-0.0021, H.rimTop - 0.021, zH + dz)));
  }
  add(mergeGeos(hingeLid), M.brass, 'lidHinges', lidGroup);
  add(mergeGeos(hingeCase), M.brass, 'lidHingeLeavesCase');
  add(mergeGeos(hingeScrews), M.nickel, 'lidHingeScrews');
  lidGroup.position.set(hx, hy, 0);
  group.add(lidGroup);

  // prop cup (on the lid underside) + prop stick on the treble rim
  const pr = L.prop;
  const cupR = lid.cupR;
  const cupLocal = V3(cupR, -0.012, pr.base[2]); // lid space: x along the lid from the hinge, underside 0.012 below the axis
  // brass cup on the lid underside: 34 mm OD, 27 mm ID, 12 mm deep (the knob's dome seats in it)
  const CUP_IN = 0.0045;                                   // inner bottom, 4.5 mm below the lid underside
  const cupGeo = finish(lathe(roundProfile([[0.0, 0.0], [0.017, 0.0], [0.017, -0.012], [0.0135, -0.012], [0.0135, -CUP_IN], [0.0, -CUP_IN]], [0, 0.0015, 0.002, 0.001, 0.002, 0], { seg: 4 }), { segments: 72 }));
  const cup = new THREE.Mesh(cupGeo, M.brass); cup.name = 'propCup';
  cup.position.copy(cupLocal).add(V3(-hx, 0, 0)); cup.position.x = cupR; // along the lid
  lidGroup.add(cup);

  // prop: the stick pivots on a 5 mm brass pin (axis along z, parallel to the lid hinge) in a clevis fixed to the
  // treble rim, so the foot never tilts against its base plate (critic round 1: the old lathe foot rotated with the
  // stick and floated / intersected). Its length is solved so the knob dome seats in the cup at full stick.
  const PIN_H = 0.019;
  const pivot = V3(pr.base[0], H.rimTop + PIN_H, pr.base[2]);
  const fullA = THREE.MathUtils.degToRad(lid.fullStickDeg);
  const cupInnerLid = V3(cupR, -0.012 - CUP_IN, 0);        // lid space, relative to the hinge axis
  const cupInW = V3(hx + cupInnerLid.x * Math.cos(fullA) - cupInnerLid.y * Math.sin(fullA), hy + cupInnerLid.x * Math.sin(fullA) + cupInnerLid.y * Math.cos(fullA), pr.base[2]);
  const S = cupInW.distanceTo(pivot);                      // pivot -> knob tip
  const propGroup = new THREE.Group(); propGroup.name = 'prop';
  propGroup.position.copy(pivot);
  // stick along +y in its local frame: tapered rounded square from the ferrule to the knob neck
  const rings = [];
  const nRing = 48, steps = 28;
  const yS0 = 0.034, Lp = S - 0.024;                        // lacquer from the ferrule top to the knob neck
  for (let k = 0; k <= steps; k++) {
    const t = k / steps; const y = yS0 - 0.002 + t * (Lp - yS0 + 0.002);
    const w = (pr.baseW + (pr.topW - pr.baseW) * t) / 2;
    const ring = [];
    for (let j = 0; j < nRing; j++) {
      const a = (j / nRing) * Math.PI * 2; const c = Math.cos(a), s = Math.sin(a);
      const pw = 6; const rr = w / Math.pow(Math.pow(Math.abs(c), pw) + Math.pow(Math.abs(s), pw), 1 / pw);
      ring.push(V3(c * rr, y, s * rr));
    }
    rings.push(ring);
  }
  const stick = new THREE.Mesh(loftRingsCapped(rings), M.lacquerLocal); stick.name = 'propStick'; stick.castShadow = true;
  propGroup.add(stick);
  // turned knob: neck, bead, dome (tip at S, seated 6 mm deep in the 27 mm cup)
  const knob = new THREE.Mesh(finish(lathe(roundProfile([[0.0, Lp - 0.006], [0.0085, Lp - 0.006], [0.0072, Lp + 0.002], [0.0120, Lp + 0.008], [0.0118, Lp + 0.015], [0.0085, S - 0.003], [0.0, S]],
    [0, 0.002, 0.002, 0.003, 0.003, 0.003, 0], { seg: 5 }), { segments: 72 })), M.lacquerLocal);
  knob.name = 'propKnob'; propGroup.add(knob);
  // brass ferrule on the stick foot: rounded square sleeve whose bottom is a half cylinder around the pivot pin
  {
    const fw = pr.baseW / 2 + 0.0012;
    const sideO = [[-fw, 0.0], [fw, 0.0], [fw, yS0], [-fw, yS0]];
    const prof = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; prof.push([Math.cos(a) * fw, Math.sin(a) * fw * 1.0]); }
    const out = [...prof, [fw, yS0], [-fw, yS0]];
    const fer = finish(roundedSlab(roundedOutline(out, out.map((_, i) => (i >= prof.length ? 0.002 : 0)), 3), 2 * fw, { rTop: 0.0018, rBot: 0.0018, seg: 3 }),
      new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, -fw, 0, 0, 0, 1));
    const foot = new THREE.Mesh(fer, M.brass); foot.name = 'propFoot'; propGroup.add(foot);
  }
  group.add(propGroup);
  // fixed clevis: base plate on the rim + two ears with the pin and domed pin caps (all brass)
  {
    const geos = [];
    geos.push(roundedBox(pr.base[0] - 0.022, pr.base[0] + 0.022, H.rimTop - 0.001, H.rimTop + 0.004, pr.base[2] - 0.034, pr.base[2] + 0.034, 0.0015));
    const fw = pr.baseW / 2 + 0.0012, earT = 0.004, gap = 0.0008;
    const ear = [];
    for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI; ear.push([pivot.x + Math.cos(a) * 0.012, pivot.y + Math.sin(a) * 0.012]); }
    const earOut = [[pivot.x - 0.012, H.rimTop + 0.003], [pivot.x + 0.012, H.rimTop + 0.003], ...ear.slice(1, -1)];
    for (const sgn of [-1, 1]) {
      const z0 = pr.base[2] + sgn * (fw + gap) + (sgn < 0 ? -earT : 0);
      geos.push(finish(roundedSlab(roundedOutline(ensureCCW(earOut), earOut.map(() => 0), 3), earT, { rTop: 0.0012, rBot: 0.0012, seg: 3 }),
        new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, z0, 0, 0, 0, 1)));
      const cap = finish(lathe(roundProfile([[0.0, 0.0], [0.0042, 0.0], [0.0040, 0.0012], [0.0, 0.0022]], [0, 0.0005, 0.0012, 0], { seg: 4 }), { segments: 48 }));
      cap.applyMatrix4(new THREE.Matrix4().makeRotationX(sgn * Math.PI / 2).setPosition(pivot.x, pivot.y, pr.base[2] + sgn * (fw + gap + earT)));
      geos.push(cap);
    }
    geos.push(finish(tube([V3(pivot.x, pivot.y, pr.base[2] - fw - gap - earT), V3(pivot.x, pivot.y, pr.base[2] + fw + gap + earT)], 0.0025, { radial: 20, caps: 'flat' })));
    add(mergeGeos(geos), M.brass, 'propBase');
  }

  return {
    group, lidGroup, flapPivot, propGroup, deskGroup, cupLocal: V3(cupR, -0.012 - CUP_IN, pr.base[2]), propLength: S,
    // music desk front face (for the planar mirror): outline in (x, s) on the plane through `origin` spanned by x and
    // `up`; the face normal toward the player is -back. Edge fillet radius 0.004.
    desk: { outline: deskOutline, origin: origin.clone(), up: up.clone(), back: back.clone(), thickness: T, fillet: 0.004 },
    // main lid underside (for the planar mirror): plan outline in piano (x, z), lid space = hinge axis at the origin
    lidInfo: { plan: mainPoly, hx, undersideY: H.rimTop - hy, filletBot: 0.0045 },
    // open fallboard front face (for the planar mirror): the plane z = fbPoly front, between the 3 mm end rounds, above
    // the 2 mm bottom round and below the 16 mm top round
    fallboardInfo: { x0: fb.x[0] + 0.0035, x1: fb.x[1] - 0.0035, z: 0.172, y0: 0.7185 + 0.0025, y1: 0.790 - 0.0165 },
    // case-arm inner faces (for the planar mirrors, refs 7 / 8: the hand mirrored in the treble arm): plane x = xBass /
    // xTreble, outline in (z, y) above the cheek block, inset ~6 mm from the scroll and the 3 mm slab fillets
    armInfo: { xBass: RIM, xTreble: W - RIM, outline: [[0.013, 0.745], [0.60, 0.745], [0.60, H.rimTop - 0.010], [0.172, H.rimTop - 0.010], [0.172, 0.900], [0.170, 0.856], [0.162, 0.834], [0.145, 0.816], [0.118, 0.808], [0.062, 0.797], [0.022, 0.787], [0.013, 0.772]] },
  };
}

function loftRingsCapped(rings) {
  const mb = new MeshBuilder();
  const rows = rings.length, cols = rings[0].length;
  const ids = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const p = rings[i][j]; ids.push(mb.vert(p.x, p.y, p.z, p.x, 0, p.z)); }
  mb.grid(ids, rows, cols, true);
  const g0 = mb.build({ orient: false });
  g0.computeVertexNormals();
  // bottom cap (flat)
  const mb2 = new MeshBuilder(); mb2.append(g0);
  const c = mb2.vert(0, rings[0][0].y, 0, 0, -1, 0);
  const base = mb2.count; for (const p of rings[0]) mb2.vert(p.x, p.y, p.z, 0, -1, 0);
  for (let j = 0; j < cols; j++) mb2.tri(c, base + j, base + ((j + 1) % cols));
  return mb2.build();
}
