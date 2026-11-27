// Legs (square, filleted, tapered, two-ring collar, flared capital, ogee top plate), brass ferrules and twin brass
// casters, the pedal lyre (top block, posts, pedal box, two diagonal braces, three brass pedal rods) and three brass
// pedals (research/piano.md section 10). Pedals rotate about their pivot pins; rods follow the pedal heel.
import * as THREE from 'three';
import { roundProfile, profilePoints, ensureCCW, roundedSlab, roundedOutline, finish, lathe, tube, MeshBuilder, mergeGeos, roundedRectRing, basisMatrix } from './util.js';
import { roundedBox } from './case.js';
import { pedalSection, PEDAL_SHAPE } from '../layout.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Loft of rounded squares/rectangles following a vertical profile [(halfX, halfZ, y)], smooth normals. */
function squareLoft(prof, { rc = 0.006, nRing = 48, capBot = true, capTop = true } = {}) {
  const rings = prof.map(([hx, hz, y]) => roundedRectRing(hx, hz, Math.min(rc, hx * 0.45, hz * 0.45), nRing, (u, v) => V3(u, y, v)));
  const mb = new MeshBuilder(); const ids = [];
  for (const r of rings) for (const p of r) ids.push(mb.vert(p.x, p.y, p.z, 0, 0, 0));
  mb.grid(ids, rings.length, nRing, true);
  const g = mb.build({ orient: false }); g.computeVertexNormals();
  // make normals point outward (away from the y axis)
  const pos = g.attributes.position, nr = g.attributes.normal; let dot = 0;
  for (let i = 0; i < pos.count; i += 5) dot += pos.getX(i) * nr.getX(i) + pos.getZ(i) * nr.getZ(i);
  if (dot < 0) for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i));
  const out = new MeshBuilder(); out.append(g);
  for (const [ring, up, use] of [[rings[0], -1, capBot], [rings[rings.length - 1], 1, capTop]]) {
    if (!use) continue;
    const c = out.vert(0, ring[0].y, 0, 0, up, 0); const b = out.count; ring.forEach((p) => out.vert(p.x, p.y, p.z, 0, up, 0));
    for (let j = 0; j < nRing; j++) out.tri(c, b + j, b + ((j + 1) % nRing));
  }
  return out.build();
}

/** Sample a filleted vertical profile [(halfSize, y)] into dense (hs, y) pairs. */
function profileSamples(pts, radii, seg = 5) {
  const pr = roundProfile(pts, radii, { seg });
  return profilePoints(pr);
}

function legGeometry() {
  // vertical profile (half-size, y) from inside the ferrule up to the capital top
  const P = [[0.0355, 0.062], [0.0360, 0.105], [0.0400, 0.108], [0.0460, 0.118], [0.0460, 0.128], [0.0418, 0.137], [0.0460, 0.146],
    [0.0460, 0.158], [0.0392, 0.170], [0.0440, 0.527], [0.0470, 0.552], [0.0610, 0.584], [0.0650, 0.600]];
  const R = [0, 0.002, 0.002, 0.003, 0.003, 0.004, 0.003, 0.003, 0.003, 0.012, 0.012, 0.01, 0];
  const s = profileSamples(P, R, 5);
  // drop near-duplicate samples
  const prof = []; for (const [hs, y] of s) { const l = prof[prof.length - 1]; if (!l || Math.abs(l[2] - y) > 1e-5 || Math.abs(l[0] - hs) > 1e-5) prof.push([hs, hs, y]); }
  return squareLoft(prof, { rc: 0.006, nRing: 56 });
}

function ferruleGeometry() {
  // cast brass cup: rolled bottom lip, a turned groove pair, beaded top rim
  const P = [[0.0362, 0.0585], [0.0378, 0.0605], [0.0378, 0.0680], [0.0369, 0.0695], [0.0369, 0.0712], [0.0378, 0.0727],
    [0.0380, 0.0870], [0.0391, 0.0893], [0.0391, 0.0932], [0.0362, 0.0948]];
  const s = profileSamples(P, [0, 0.0012, 0.0006, 0.0005, 0.0005, 0.0006, 0.0010, 0.0008, 0.0008, 0], 3);
  const prof = s.map(([hs, y]) => [hs, hs, y]);
  return squareLoft(prof, { rc: 0.007, nRing: 56, capBot: true, capTop: false });
}

function casterGeometry() {
  // local frame: wheel axle along x at y = 0.030, swivel above at the leg axis; wheels trail +0.020 in z
  const parts = [];
  // swivel plate and stem
  parts.push(finish(lathe(roundProfile([[0.0, 0.0535], [0.024, 0.0535], [0.024, 0.0595], [0.0, 0.0595]], [0, 0.0012, 0.0012, 0], { seg: 3 }), { segments: 32 })));
  parts.push(finish(lathe(roundProfile([[0.0, 0.046], [0.0085, 0.046], [0.0105, 0.050], [0.0105, 0.0545], [0.0, 0.0545]], [0, 0.001, 0.001, 0, 0], { seg: 3 }), { segments: 24 })));
  // horn (fork) side plates: side profile (z, y) from the swivel down to the axle
  const horn = [[-0.010, 0.050], [0.012, 0.050], [0.032, 0.036], [0.030, 0.022], [0.016, 0.022], [-0.006, 0.040]];
  const hornOut = profilePoints(roundProfile(ensureCCW(horn), [0.003, 0.004, 0.008, 0.006, 0.006, 0.004], { closed: true, seg: 4 }));
  for (const x0 of [-0.0215, 0.0175]) {
    parts.push(finish(roundedSlab(hornOut, 0.004, { rTop: 0.0012, rBot: 0.0012, seg: 2 }), new THREE.Matrix4().set(0, 1, 0, x0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1)));
  }
  // axle + caps
  parts.push(finish(tube([V3(-0.0225, 0.030, 0.020), V3(0.0225, 0.030, 0.020)], 0.0028, { radial: 12, caps: 'round' })));
  // two wheels (tyre profile revolved about the axle)
  const wheelProf = roundProfile([[0.0, -0.008], [0.026, -0.008], [0.0298, -0.006], [0.0298, 0.006], [0.026, 0.008], [0.0, 0.008]], [0, 0.002, 0.004, 0.004, 0.002, 0], { seg: 4 });
  // lathe makes (r, y) around y: rotate so y -> x axle
  const wheel0 = finish(lathe(wheelProf, { segments: 40 }));
  for (const xc of [-0.010, 0.010]) {
    const m = new THREE.Matrix4().makeRotationZ(-Math.PI / 2).setPosition(xc, 0.030, 0.020);
    parts.push(wheel0.clone().applyMatrix4(m));
    // recessed hub boss
    parts.push(finish(lathe(roundProfile([[0.0, -0.0088], [0.010, -0.0088], [0.012, -0.0082], [0.012, 0.0082], [0.010, 0.0088], [0.0, 0.0088]], [0, 0.001, 0.001, 0.001, 0.001, 0], { seg: 2 }), { segments: 24 }), m));
  }
  return mergeGeos(parts);
}

export function buildLegs(L, M) {
  const group = new THREE.Group(); group.name = 'legsLyrePedals';
  const add = (geo, mat, name, parent = group) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const legGeo = legGeometry(), ferGeo = ferruleGeometry(), casterGeo = casterGeometry();
  const legPos = [...L.legs.front.map((p) => ({ x: p[0], z: p[1], front: true })), { x: L.legs.rear[0], z: L.legs.rear[1], front: false }];
  // top plates: front legs 0.457 (z) x 0.105 (x) with ogee-scrolled ends; rear leg spacer block under the rim
  const ogee = (len, h) => {
    const pts = [[-len / 2, 0.0]];
    // ogee end: S-curve from the bottom corner up to the top
    const sc = (x0, sgn) => { const o = []; for (let k = 0; k <= 10; k++) { const t = k / 10; o.push([x0 - sgn * (0.035 * (1 - (0.5 - 0.5 * Math.cos(Math.PI * t)))), h * t]); } return o; };
    const right = sc(len / 2, 1); const left = sc(-len / 2, -1).reverse();
    return [[-len / 2 + 0.035, 0.0], [len / 2 - 0.035, 0.0], ...right.slice(1), ...left.slice(0, -1)];
  };
  for (const lp of legPos) {
    add(legGeo, M.lacquerLeg, 'leg').position.set(lp.x, 0, lp.z);
    add(ferGeo, M.brass, 'legFerrule').position.set(lp.x, 0, lp.z);
    const c = add(casterGeo, M.brass, 'caster'); c.position.set(lp.x, 0, lp.z); if (!lp.front) c.rotation.y = Math.PI * 0.85;
    if (lp.front) {
      const pr = ogee(0.457, 0.025);
      const out = profilePoints(roundProfile(ensureCCW(pr), pr.map(() => 0.003), { closed: true, seg: 3 }));
      const m = new THREE.Matrix4().set(0, 1, 0, lp.x - 0.0525, 0, 0, 1, 0.600, 1, 0, 0, lp.z, 0, 0, 0, 1);
      add(finish(roundedSlab(out, 0.105, { rTop: 0.003, rBot: 0.003, seg: 3 }), m), M.lacquerLeg, 'legTopPlate');
    } else {
      // clipped 12 mm inside the case outline at the tail (it stuck out 30 mm past the tail: critic round 1)
      const poly = L.caseOutline;
      const zAt = (x) => { let best = -1; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const t = (x - a[0]) / (b[0] - a[0]); best = Math.max(best, a[1] + (b[1] - a[1]) * t); } } return best; };
      const zMax = Math.min(lp.z + 0.15, ...[lp.x - 0.0525, lp.x, lp.x + 0.0525].map(zAt)) - 0.012;
      add(roundedBox(lp.x - 0.0525, lp.x + 0.0525, 0.598, L.heights.rimBottom, lp.z - 0.15, zMax, 0.003), M.lacquerLeg, 'rearLegSpacer');
    }
  }

  // ------------------------------------------------------------------ lyre
  const ly = L.lyre; const x = ly.x, z = ly.z;
  const lyre = new THREE.Group(); lyre.name = 'lyre'; group.add(lyre);
  add(roundedBox(x - 0.1525, x + 0.1525, 0.595, 0.625, z - 0.030, z + 0.030, 0.004), M.lacquerLeg, 'lyreTopBlock', lyre);
  // posts: slightly waisted, filleted rectangular section
  const postProf = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const y = 0.105 + t * (0.595 - 0.105); const w = 1 - 0.12 * Math.sin(Math.PI * t); postProf.push([0.015 * w, 0.020 * w, y]); }
  const postGeo = squareLoft(postProf, { rc: 0.005, nRing: 40 });
  for (const dx of [-0.085, 0.085]) add(postGeo, M.lacquerLeg, 'lyrePost', lyre).position.set(x + dx, 0, z);
  // pedal box (front face at z 0.365)
  const boxZ0 = 0.365, boxZ1 = boxZ0 + 0.080;
  add(roundedBox(x - 0.108, x + 0.108, 0.040, 0.105, boxZ0, boxZ1, 0.005), M.lacquerLeg, 'pedalBox', lyre);
  // braces: 2 black rods from the box up and back to the keybed
  for (const s of [-1, 1]) {
    const a = V3(x + s * 0.080, 0.098, boxZ0 + 0.040), b = V3(x + s * 0.110, 0.618, 0.660);
    add(finish(tube([a, b], 0.009, { radial: 16, caps: 'round' })), M.lacquerLeg, 'lyreBrace', lyre);
    for (const p of [a, b]) add(finish(lathe(roundProfile([[0.0, -0.006], [0.0125, -0.006], [0.0125, 0.006], [0.0, 0.006]], [0, 0.003, 0.003, 0], { seg: 3 }), { segments: 20 })), M.brass, 'lyreBraceCap', lyre).position.copy(p);
  }

  // ------------------------------------------------------------------ pedals + rods
  const pedals = [];
  const pedalGeo = (() => {
    // loft along z: from the pivot (inside the box) to the tip; width/thickness/top-height per station
    const st = [];
    const zPiv = ly.pedalPivotZ, zTip = ly.pedalTipZ;
    // dense stations (~2 mm on the pad): coarse ones made the upturn read as a crumpled crease in 1080p macros
    const N = 84;
    // sections from layout.js pedalSection (shared with the solver): 8 mm pad with 2 mm edge rounds (critic round 1:
    // the 12 mm pad with 4.5 mm corners read chunky), 11 mm neck, gentle 3 mm toe rise over the whole pad (a 4 mm
    // upturn over the last 35-50 mm read as a crease in the mirror-like brass)
    for (let i = 0; i <= N; i++) {
      const u = i / N, t = u * (1.6 - 0.6 * u);           // denser toward the tip (spacing 0.4x at the tip, never 0)
      const zz = zPiv + 0.025 - t * (zPiv + 0.025 - zTip);
      const s = pedalSection(zz);
      st.push({ z: zz, w: s.w, thick: s.thick, yTop: s.yTop });
    }
    const nR = 44; const rings = st.map((s) => roundedRectRing(s.w / 2, s.thick / 2, PEDAL_SHAPE.corner, nR, (u, v) => V3(u, s.yTop - s.thick / 2 + v, s.z)));
    // rounded tip: add shrinking rings beyond the last station
    const last = st[st.length - 1];
    // rounded nose: quarter-ellipse in plan (9 mm deep), the section shrinks to ~30 % so no flat cap reads at the tip
    for (let k = 1; k <= 9; k++) {
      const a = (k / 9) * Math.PI / 2; const sh = Math.cos(a);
      const hw = Math.max(0.003, last.w / 2 * (0.30 + 0.70 * sh)), hh = Math.max(0.0018, last.thick / 2 * (0.35 + 0.65 * sh));
      rings.push(roundedRectRing(hw, hh, Math.min(PEDAL_SHAPE.corner, hh * 0.92, hw * 0.92), nR, (u, v) => V3(u, last.yTop - last.thick / 2 + v, last.z - PEDAL_SHAPE.nose * Math.sin(a))));
    }
    const mb = new MeshBuilder(); const ids = [];
    for (const r of rings) for (const p of r) ids.push(mb.vert(p.x, p.y, p.z, 0, 0, 0));
    mb.grid(ids, rings.length, nR, true);
    const g = mb.build({ orient: false }); g.computeVertexNormals();
    // orient outward
    const pos = g.attributes.position, nr = g.attributes.normal; let dot = 0; const cy = ly.pedalTreadY - 0.006;
    for (let i = 0; i < pos.count; i += 7) dot += pos.getX(i) * nr.getX(i) + (pos.getY(i) - cy) * nr.getY(i);
    if (dot < 0) for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i));
    const out = new MeshBuilder(); out.append(g);
    const r0 = rings[0]; const c = out.vert(0, r0[0].y, r0[0].z, 0, 0, 1); const b0 = out.count;
    let cyy = 0; r0.forEach((p) => { cyy += p.y; }); out.pos[3 * c + 1] = cyy / nR;
    r0.forEach((p) => out.vert(p.x, p.y, p.z, 0, 0, 1)); for (let j = 0; j < nR; j++) out.tri(c, b0 + j, b0 + ((j + 1) % nR));
    const lastR = rings[rings.length - 1]; let cx2 = 0, cy2 = 0, cz2 = 0; lastR.forEach((p) => { cx2 += p.x; cy2 += p.y; cz2 += p.z; });
    const c2 = out.vert(cx2 / nR, cy2 / nR, cz2 / nR, 0, 0, -1); const b1 = out.count;
    lastR.forEach((p) => out.vert(p.x, p.y, p.z, 0, 0, -1)); for (let j = 0; j < nR; j++) out.tri(c2, b1 + j, b1 + ((j + 1) % nR));
    return out.build();
  })();
  // brass escutcheon frames around the three pedal slots on the pedal box front face
  {
    const parts = [];
    const outer = roundedOutline([[-0.019, -0.013], [0.019, -0.013], [0.019, 0.013], [-0.019, 0.013]], [0.006, 0.006, 0.006, 0.006], 5);
    const hole = roundedOutline([[-0.0115, -0.0085], [0.0115, -0.0085], [0.0115, 0.0085], [-0.0115, 0.0085]], [0.004, 0.004, 0.004, 0.004], 5);
    for (const px of ly.pedalX) {
      // slab outline (a = x, b = y), thickness along -z from the box face
      const m = basisMatrix(V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, -1), V3(px, ly.pedalTreadY - 0.006, boxZ0 + 0.0002));
      parts.push(finish(roundedSlab(outer, 0.0018, { rTop: 0.0007, rBot: 0.0002, seg: 2, holes: [hole] }), m));
    }
    add(mergeGeos(parts), M.brass, 'pedalEscutcheons', lyre);
  }
  const rodGeo = finish(tube([V3(0, 0, 0), V3(0, 0.595 - 0.105 - 0.004, 0)], 0.004, { radial: 12, caps: 'round' }));
  const pivotY = ly.pedalTreadY - 0.006;
  ly.pedalX.forEach((px, i) => {
    const piv = new THREE.Group(); piv.name = ['pedalUnaCorda', 'pedalSostenuto', 'pedalSustain'][i];
    piv.position.set(px, pivotY, ly.pedalPivotZ);
    const mesh = new THREE.Mesh(pedalGeo, M.brassPedal); mesh.name = 'pedal'; mesh.castShadow = true;
    mesh.position.set(-px + px, -pivotY, -ly.pedalPivotZ); // geometry is in absolute y/z, local x = 0
    piv.add(mesh); lyre.add(piv);
    const rod = new THREE.Mesh(rodGeo, M.brass); rod.name = 'pedalRod'; rod.position.set(px, 0.105 + 0.002, 0.430);
    lyre.add(rod);
    pedals.push({ pivot: piv, rod, rodY0: rod.position.y });
  });
  const pedalAng = [0, 0, 0];
  function setPedals(a) {
    for (let i = 0; i < 3; i++) {
      pedalAng[i] = a[i] || 0;
      pedals[i].pivot.rotation.x = -pedalAng[i];          // tip goes down
      pedals[i].rod.position.y = pedals[i].rodY0 + ly.rodPushBehindPivot * Math.sin(pedalAng[i]);
    }
  }
  return { group, setPedals, pedals, pedalAng };
}
