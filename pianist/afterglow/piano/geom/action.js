// Visible action (research/piano.md section 6): 88 hammers (felt crown over an underfelt stripe on a mahogany molding,
// hornbeam shank, flange) rotating about their flange pins toward the strings; dampers on notes 1-67 (black satin heads,
// V-wedge felt on the wound bass, grooved flat felt on trichords, brass wires) lifted by key or pedal; plus the rest rail,
// flange rail, damper guide rail and simplified wippen blocks seen through the strings.
import * as THREE from 'three';
import { roundedSlab, roundedOutline, finish, lathe, roundProfile, profilePoints, ensureCCW, tube, MeshBuilder, mergeGeos } from './util.js';
import { HAMMERS } from '../layout.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// slab outline in (z, y), thickness along x centred on 0
const sideSlab = (outline, w, r, rs = r) => finish(roundedSlab(outline, w, { rTop: r, rBot: r, seg: 3 }),
  new THREE.Matrix4().set(0, 1, 0, -w / 2, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
// slab outline in (x, y), thickness along z centred on 0
const frontSlab = (outline, d, r) => finish(roundedSlab(outline, d, { rTop: r, rBot: r, seg: 3 }),
  new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, -d / 2, 0, 0, 0, 1));

const SHANK_LEN = 0.125;            // flange pivot -> head centre (z)
const CROWN_ABOVE_SHANK = 0.051;    // crown -> shank axis
const D0 = 0.032, W0 = 0.0115, H0 = 0.082;

function hammerGeos() {
  // felt side profile (z, y), shank axis at y = 0, head centre at z = 0
  const feltBot = 0.0135, crown = CROWN_ABOVE_SHANK;
  const side = [];
  // side profile: gently converging sides (16 -> ~10 mm half depth) blended (smooth min, 2 mm) into an elliptical crown
  // cap (9.5 x 9 mm unscaled; ~4 mm radius at the top treble after the per-note depth scale). The first version was a
  // flat-topped block, the second (1 - t^1.6)^0.8 an arrowhead.
  const N = 40, capA = 0.0095, capB = 0.009, yc = crown - capB, kS = 0.002;
  const smin = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };
  for (let i = 0; i <= N; i++) { // right side from bottom to crown (denser near the crown)
    const t = 1 - Math.pow(1 - i / N, 1.6); const y = feltBot + t * (crown - feltBot);
    const line = D0 / 2 - (D0 / 2 - 0.0102) * (y - feltBot) / (yc - feltBot);
    const cap = y <= yc ? capA + (yc - y) * 4 : capA * Math.sqrt(Math.max(0, 1 - ((y - yc) / capB) ** 2));
    const w = i === N ? 0 : Math.max(0, smin(line, cap, kS));
    side.push([w, y]);
  }
  const felt = [];
  for (const p of side) felt.push([p[0], p[1]]);
  for (let i = side.length - 2; i >= 0; i--) felt.push([-side[i][0], side[i][1]]);
  const feltOut = profilePoints(roundProfile(ensureCCW(felt), felt.map((p, i) => (i === 0 || i === felt.length - 1 ? 0.0012 : 0)), { closed: true, seg: 3 }));
  const feltGeo = sideSlab(feltOut, W0, 0.0013);
  // underfelt stripe (slightly narrower, peeks out between felt and molding)
  const uf = roundedOutline([[-D0 / 2 + 0.0012, 0.0098], [D0 / 2 - 0.0012, 0.0098], [D0 / 2 - 0.0016, 0.0142], [-D0 / 2 + 0.0016, 0.0142]], [0.0004, 0.0004, 0.0004, 0.0004], 2);
  const underGeo = sideSlab(uf, W0 - 0.0004, 0.0006);
  // molding: tapers to a rounded tail 31 mm below the shank axis
  const mold = [[-D0 / 2 + 0.0018, 0.0100], [-D0 / 2 + 0.0030, -0.012], [-0.0055, -0.031], [0.0055, -0.031], [D0 / 2 - 0.0030, -0.012], [D0 / 2 - 0.0018, 0.0100]];
  const moldOut = profilePoints(roundProfile(ensureCCW(mold), [0.001, 0.004, 0.005, 0.005, 0.004, 0.001], { closed: true, seg: 4 }));
  const moldGeo = sideSlab(moldOut, W0 - 0.0006, 0.0008);
  return { feltGeo, underGeo, moldGeo };
}

export function buildAction(L, M, SS) {
  const group = new THREE.Group(); group.name = 'action';
  const H = L.heights;
  const notes = L.notes;
  // ---------------------------------------------------------------- per-note hammer frames
  // hammer frames from layout.js HAMMERS (single source of truth, shared with the performance solver): the flange pin
  // is placed so the crown meets the string underside at the layout strike point at strikeAng, the head is bored by
  // strikeAng (vertical at the blow, leaning toward the tail at rest); docs/PIANO.md section 2
  const ham = notes.map((q) => {
    const hf = HAMMERS[q.n - 1];
    const D = hf.depth, W = hf.width, Hh = hf.headH, sy = hf.scaleY, cy = hf.cy;
    const flange = V3(...hf.flange);
    // shank: from the pin to where its axis meets the bored head's centre line, a few mm inside the molding
    const b = hf.bore;
    const shankEnd = SHANK_LEN - cy * Math.sin(b) - cy * (1 - Math.cos(b)) * Math.tan(b) + 0.004;
    return { n: q.n, D, W, Hh, sx: W / W0, sy, sz: D / D0, yShank: hf.flange[1], crown: hf.flange[1] + cy, flange, theta: THREE.MathUtils.degToRad(q.angle_deg) * (hf.yawScale ?? 1),
      strikeAng: hf.strikeAng, checkAng: hf.checkAng, bore: b, cy, shankEnd };
  });
  // head in the shank frame: T(crown) * Rx(bore) * T(0, -cy, 0) * Ry(theta) * S  (the bore tilts the head toward the
  // tail about its crown point, so the crown stays on the rest circle of layout.js and the head is vertical at the blow)
  const headLocal = ham.map((h) => new THREE.Matrix4().makeTranslation(0, h.cy, SHANK_LEN)
    .multiply(new THREE.Matrix4().makeRotationX(h.bore))
    .multiply(new THREE.Matrix4().makeTranslation(0, -h.cy, 0))
    .multiply(new THREE.Matrix4().makeRotationY(h.theta))
    .multiply(new THREE.Matrix4().makeScale(h.sx, h.sy, h.sz)));
  const shankScale = ham.map((h) => new THREE.Matrix4().makeScale(1, 1, h.shankEnd));
  let wippenIM = null;

  // ---------------------------------------------------------------- hammer meshes (instanced)
  const { feltGeo, underGeo, moldGeo } = hammerGeos();
  const shankGeo = finish(tube([V3(0, 0, -0.004), V3(0, 0, 1.0)], 0.00375, { radial: 12, caps: 'round' }));   // z scaled per note
  const mkIM = (geo, mat, name, count) => { const im = new THREE.InstancedMesh(geo, mat, count); im.name = name; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(im); return im; };
  const imFelt = mkIM(feltGeo, M.hammerFelt, 'hammerFelt', 88);
  const imUnder = mkIM(underGeo, M.underFelt, 'hammerUnderfelt', 88);
  const imMold = mkIM(moldGeo, M.molding, 'hammerMolding', 88);
  const imShank = mkIM(shankGeo, M.shank, 'hammerShank', 88);
  // flanges (fixed) + centre pins
  const flangeGeo = mergeGeos([
    sideSlab(roundedOutline([[-0.012, -0.016], [0.010, -0.016], [0.010, 0.006], [-0.012, 0.006]], [0.002, 0.002, 0.003, 0.003], 3), 0.0105, 0.0008),
    finish(tube([V3(-0.0058, 0, 0), V3(0.0058, 0, 0)], 0.0012, { radial: 8, caps: 'flat' })),
  ]);
  const imFlange = mkIM(flangeGeo, M.actionWood, 'hammerFlange', 88);
  ham.forEach((h, i) => imFlange.setMatrixAt(i, new THREE.Matrix4().makeTranslation(h.flange.x, h.flange.y, h.flange.z)));
  imFlange.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  // ---------------------------------------------------------------- rails under the hammers
  {
    const a = ham[0], b = ham[87];
    const rail = (zOff, yTop, depth, height, mat, name, x0 = a.flange.x - 0.02, x1 = b.flange.x + 0.02) => {
      const mb = new MeshBuilder();
      const za = a.flange.z + zOff, zb = b.flange.z + zOff;
      const out = roundedOutline([[x0, za - depth / 2], [x1, zb - depth / 2], [x1, zb + depth / 2], [x0, za + depth / 2]], [0.002, 0.002, 0.002, 0.002], 3);
      mb.append(finish(roundedSlab(out, height, { rTop: 0.002, rBot: 0.001, seg: 2 }), new THREE.Matrix4().makeTranslation(0, yTop - height, 0)));
      const m = new THREE.Mesh(mb.build(), mat); m.name = name; m.castShadow = m.receiveShadow = true; group.add(m); return m;
    };
    const yS = Math.min(...ham.map((h) => h.yShank));
    // rails stand on brackets ABOVE the key levers (key backs rise up to ~13 mm): bottoms at >= 0.727 (critic round 1)
    rail(0.0, yS - 0.016, 0.030, 0.022, M.actionWood, 'flangeRail');
    rail(0.080, yS - 0.0040, 0.014, 0.010, M.burgundyFelt, 'hammerRestFelt');
    rail(0.080, yS - 0.0140, 0.016, 0.020, M.satinBlack, 'hammerRestRail');
  }
  // wippen / repetition blocks (static, dark) and key back stand-ins
  {
    const wip = sideSlab(roundedOutline([[-0.030, 0.0], [0.030, 0.0], [0.024, 0.040], [-0.020, 0.048]], [0.003, 0.003, 0.004, 0.004], 3), 0.0095, 0.0008);
    const imW = new THREE.InstancedMesh(wip, M.actionWood, 88); imW.name = 'wippens'; imW.frustumCulled = false; imW.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    ham.forEach((h, i) => imW.setMatrixAt(i, new THREE.Matrix4().makeTranslation(h.flange.x, 0.716, h.flange.z + 0.040)));
    group.add(imW); wippenIM = imW;
  }

  // ---------------------------------------------------------------- dampers (notes 1-67)
  // the wire runs down between this note and the next, behind both resting hammer heads (rearmost head point in the
  // wire band, measured on the built geometry) and in front of the belly rail (critic round 1: wires 62-67 were in it)
  const bellyZ = (x) => L.bellyRail[0][1] + (L.bellyRail[1][1] - L.bellyRail[0][1]) * (x - L.bellyRail[0][0]) / (L.bellyRail[1][0] - L.bellyRail[0][0]);
  const headBack = (() => {
    const out = new Float32Array(88); const v = new THREE.Vector3(); const mm = new THREE.Matrix4();
    const geos = [feltGeo, moldGeo].map((g) => g.attributes.position);
    ham.forEach((h, i) => {
      mm.makeTranslation(h.flange.x, h.flange.y, h.flange.z).multiply(headLocal[i]);
      let zM = -1e9;
      for (const pa of geos) for (let k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa, k).applyMatrix4(mm); if (v.y > 0.765 && v.y < 0.87) zM = Math.max(zM, v.z); }
      out[i] = zM;
    });
    return out;
  })();
  const dW = L.action.hammerPitch - 0.0015;
  const WIRE_R = 0.00175, wireDX = dW / 2 + 0.0008;
  const SECTION_END = new Set((L.action.sections || []).slice(0, -1).map((s) => s[1]));   // last note of each hammer section
  const damp = [];
  for (const q of notes) {
    if (!q.damper) continue;
    const h = ham[q.n - 1];
    const s0 = SS.strings.find((s) => s.n === q.n);
    const dz = L.action.damperBehindStrike;
    const frac = (q.strike_from_front + dz) / q.speaking_length;
    const yStr = s0.yFront + (s0.yBridge - s0.yFront) * frac;
    const rStr = q.wire_d_mm / 2000;
    const c = [q.strike_xz[0] + q.dir_xz[0] * dz, q.strike_xz[1] + q.dir_xz[1] * dz];
    const t = (q.n - 1) / 66;
    const depth = 0.045 + (0.030 - 0.045) * t;
    const st = Math.sin(h.theta), ct = Math.cos(h.theta);
    // the wire runs between this note and the next, except where a strut fills that section gap (after 20, 39, 57)
    const sideS = SECTION_END.has(q.n) ? -1 : 1, wdx = sideS * wireDX, nb = Math.min(87, Math.max(0, q.n - 1 + sideS));
    const back = Math.max(headBack[q.n - 1], headBack[nb]) + WIRE_R + 0.0015;
    const front = bellyZ(c[0] + wdx) - 0.002 - WIRE_R - 0.0015;   // belly rail front face is 2 mm in front of the line
    const wz = Math.min(Math.max(c[1] + depth / 2 - 0.004, back), front);
    const wireLZ = THREE.MathUtils.clamp((wz - c[1] + wdx * st) / ct, -depth / 2 + 0.003, depth / 2 - 0.003);
    // per-note regulation scatter of the head height (+-0.3 mm), deterministic hash of the note number
    const jit = (((q.n * 2654435761) >>> 0) % 1000) / 1000 - 0.5;
    damp.push({ n: q.n, c, yRest: yStr + rStr, theta: h.theta, depth, wedge: q.wound, wireLZ, wdx, headJit: 0.0006 * jit,
      wireXZ: [c[0] + wdx * ct + wireLZ * st, c[1] - wdx * st + wireLZ * ct] });
  }
  const headOut = roundedOutline([[-dW / 2, 0], [dW / 2, 0], [dW / 2, 0.025], [-dW / 2, 0.025]], [0.0012, 0.0012, 0.0032, 0.0032], 3);
  const headGeo = frontSlab(headOut, 1.0, 0.0012);                         // depth scaled per instance
  const feltFlat = frontSlab(profilePoints(roundProfile(ensureCCW([[-dW / 2 + 0.0003, 0.0], [-0.0026, 0.0], [-0.0019, 0.0016], [-0.0012, 0.0], [0.0012, 0.0], [0.0019, 0.0016], [0.0026, 0.0], [dW / 2 - 0.0003, 0.0], [dW / 2 - 0.0003, 0.0112], [-dW / 2 + 0.0003, 0.0112]]),
    [0.0006, 0, 0.0004, 0, 0, 0.0004, 0, 0.0006, 0.0006, 0.0006], { closed: true, seg: 2 })), 1.0, 0.0007);
  const feltWedge = frontSlab(profilePoints(roundProfile(ensureCCW([[-dW / 2 + 0.0003, 0.0060], [0.0, -0.0010], [dW / 2 - 0.0003, 0.0060], [dW / 2 - 0.0003, 0.0122], [-dW / 2 + 0.0003, 0.0122]]),
    [0.0008, 0.0012, 0.0008, 0.0006, 0.0006], { closed: true, seg: 3 })), 1.0, 0.0007);
  const wireGeo = finish(tube([V3(0, 0, 0), V3(0, -0.15, 0)], 0.00175, { radial: 8, caps: 'round' }));
  const nD = damp.length;
  const imHead = mkIM(headGeo, M.satinBlack, 'damperHeads', nD);
  const wedgeList = damp.filter((d) => d.wedge), flatList = damp.filter((d) => !d.wedge);
  const imFW = mkIM(feltWedge, M.damperFelt, 'damperFeltWedge', wedgeList.length);
  const imFF = mkIM(feltFlat, M.damperFelt, 'damperFeltFlat', flatList.length);
  const imWire = mkIM(wireGeo, M.brass, 'damperWires', nD);
  // damper guide rail: follows the wire line (the wires pass through it), 9 mm deep, under the soundboard edge level
  {
    const pts = damp.map((d) => d.wireXZ);
    const sm = pts.map((p, i) => { let z = 0, w = 0; for (let k = -2; k <= 2; k++) { const j = THREE.MathUtils.clamp(i + k, 0, pts.length - 1); z += pts[j][1]; w++; } return [p[0], z / w]; });
    // keep every wire inside the rail (|wire - rail centre| <= 2.5 mm): fall back to the wire where smoothing moved it
    const ctr = sm.map((p, i) => [p[0], THREE.MathUtils.clamp(p[1], pts[i][1] - 0.0025, pts[i][1] + 0.0025)]);
    ctr.unshift([ctr[0][0] - 0.02, ctr[0][1]]); ctr.push([ctr[ctr.length - 1][0] + 0.02, ctr[ctr.length - 1][1]]);
    const hd = 0.0045;
    const outPts = [...ctr.map(([x, z]) => [x, z - hd]), ...ctr.slice().reverse().map(([x, z]) => [x, z + hd])];
    const out = roundedOutline(outPts, outPts.map((_, i) => (i === 0 || i === ctr.length - 1 || i === ctr.length || i === outPts.length - 1 ? 0.002 : 0)), 3);
    const m = new THREE.Mesh(finish(roundedSlab(out, 0.014, { rTop: 0.0015, rBot: 0.001 }), new THREE.Matrix4().makeTranslation(0, 0.792, 0)), M.actionWood);
    m.name = 'damperGuideRail'; group.add(m);
  }

  // ---------------------------------------------------------------- animation
  const hammerAng = new Float32Array(88), damperLift = new Float32Array(88);
  let shiftX = 0;
  const m4 = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  function applyHammers() {
    for (let i = 0; i < 88; i++) {
      const h = ham[i];
      // T(flange) * Rx(-phi) * [shank (z scaled to the head)]   /   * headLocal
      m4.makeRotationX(-hammerAng[i]).setPosition(h.flange.x + shiftX, h.flange.y, h.flange.z);
      imShank.setMatrixAt(i, tmp.copy(m4).multiply(shankScale[i]));
      const mh = m4.clone().multiply(headLocal[i]);
      imFelt.setMatrixAt(i, mh); imUnder.setMatrixAt(i, mh); imMold.setMatrixAt(i, mh);
    }
    imShank.instanceMatrix.needsUpdate = imFelt.instanceMatrix.needsUpdate = imUnder.instanceMatrix.needsUpdate = imMold.instanceMatrix.needsUpdate = true;
  }
  // dampers are mounted on the case (they do NOT shift with the una corda action); per-note head scatter +-0.3 mm
  function applyDampers() {
    let iw = 0, iff = 0;
    damp.forEach((d, i) => {
      const lift = damperLift[d.n - 1];
      const base = new THREE.Matrix4().makeRotationY(d.theta).setPosition(d.c[0], d.yRest + lift, d.c[1]);
      const felt = base.clone().multiply(new THREE.Matrix4().makeScale(1, 1, d.depth));
      const head = base.clone().multiply(new THREE.Matrix4().makeTranslation(0, (d.wedge ? 0.0122 : 0.0112) + d.headJit, 0)).multiply(new THREE.Matrix4().makeScale(1, 1, d.depth));
      imHead.setMatrixAt(i, head);
      if (d.wedge) imFW.setMatrixAt(iw++, felt); else imFF.setMatrixAt(iff++, felt);
      // wire leaves the head bottom between this note and the next, behind both resting hammers, in front of the belly rail
      const w = base.clone().multiply(new THREE.Matrix4().makeTranslation(d.wdx, 0.004, d.wireLZ));
      imWire.setMatrixAt(i, w);
    });
    imHead.instanceMatrix.needsUpdate = imFW.instanceMatrix.needsUpdate = imFF.instanceMatrix.needsUpdate = imWire.instanceMatrix.needsUpdate = true;
  }
  // wippens ride on the key backs (the key rotates about the balance axis: the back rises when the front goes down)
  const keyAng = new Float32Array(88);
  const pivY = L.keyboard.pivot.y, pivZ = L.keyboard.pivot.z;
  function applyWippens() {
    if (!wippenIM) return;
    ham.forEach((h, i) => {
      const z = h.flange.z + 0.040, a = keyAng[i];
      const dy = (z - pivZ) * Math.sin(a) + (0.716 - pivY) * (Math.cos(a) - 1);
      wippenIM.setMatrixAt(i, m4.makeTranslation(h.flange.x + shiftX, 0.716 + dy, z));
    });
    wippenIM.instanceMatrix.needsUpdate = true;
  }
  applyHammers(); applyDampers(); applyWippens();

  return {
    group, hammers: ham, dampers: damp,
    hammerAng, damperLift,
    setHammerAngles(a) { hammerAng.set(a); applyHammers(); },
    setDamperLifts(a) { damperLift.set(a); applyDampers(); },
    /** key angles (rad) for the wippens riding on the key backs */
    setKeyAngles(a) { keyAng.set(a); applyWippens(); },
    /** una corda: keys + hammers + wippens shift by dx; the dampers stay on the strings */
    setShift(dx) { shiftX = dx; applyHammers(); applyWippens(); },
  };
}
