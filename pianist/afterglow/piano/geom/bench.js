// Adjustable artist bench (research/piano.md 10.4): button-tufted black leather cushion (3 rows, diamond pleats, rolled
// edge, welt), black lacquer apron, 4 square tapered legs with brass caps, side knobs with a metal ring.
import * as THREE from 'three';
import { MeshBuilder, roundedRectRing, finish, lathe, roundProfile, tube, mergeGeos } from './util.js';
import { roundedBox } from './case.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function buttonsLayout(hx, hz) {
  const out = [];
  const dx = 0.080, rows = [-0.088, 0, 0.088];
  rows.forEach((z, r) => {
    const n = r === 1 ? 6 : 7; const x0 = -dx * (n - 1) / 2;
    for (let i = 0; i < n; i++) out.push([x0 + i * dx, z]);
  });
  void hx; void hz;
  return out;
}

function distSeg(px, pz, a, b) {
  const vx = b[0] - a[0], vz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz)));
  return [Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t), t];
}

export function buildBench(L, M) {
  const B = L.bench;
  const group = new THREE.Group(); group.name = 'bench';
  // the seat (cushion, apron, knobs) rides up and down on the height mechanism; the legs stay on the floor and their
  // upper ends slide inside the apron (setHeight scales them so their tops always meet the apron)
  const seat = new THREE.Group(); seat.name = 'benchSeat'; group.add(seat);
  const hx = B.seat[0] / 2, hz = B.seat[1] / 2;
  const top = B.defaultHeight, thick = B.cushionThk, y0 = top - thick;
  const btn = buttonsLayout(hx, hz);
  // pleat segments: diagonal links between rows + short links toward the edges
  const segs = [];
  for (const a of btn) for (const b of btn) {
    if (a === b) continue;
    if (Math.abs(Math.abs(a[1] - b[1]) - 0.088) < 1e-6 && Math.abs(Math.abs(a[0] - b[0]) - 0.040) < 1e-6 && a[1] < b[1]) segs.push([a, b]);
  }
  const height = (x, z) => {
    // pillow crown + dimples + diamond creases
    const ex = Math.min(1, Math.abs(x) / (hx - 0.02)), ez = Math.min(1, Math.abs(z) / (hz - 0.02));
    let h = 0.008 * (1 - ex * ex) * (1 - ez * ez);
    for (const b of btn) { const d2 = (x - b[0]) ** 2 + (z - b[1]) ** 2; h -= 0.012 * Math.exp(-d2 / (2 * 0.011 * 0.011)); }
    for (const [a, b] of segs) { const [d, t] = distSeg(x, z, a, b); const taper = Math.sin(Math.PI * t) ** 0.6; h -= 0.0035 * Math.exp(-(d * d) / (2 * 0.0035 * 0.0035)) * taper; }
    // puff between creases: small positive bumps at the diamond centres
    return h;
  };
  // cushion rings: side (bottom -> rolled edge) then inward rings across the top
  const nR = 420, rc = 0.030, roll = 0.020;
  const rings = [];
  const sideY = [y0, y0 + 0.004, top - roll - 0.006, top - roll];
  for (const y of sideY) rings.push(roundedRectRing(hx, hz, rc, nR, (u, v) => V3(u, y, v)));
  for (let k = 1; k <= 8; k++) { // rolled edge: quarter circle
    const a = (k / 8) * Math.PI / 2; const ins = roll * (1 - Math.cos(a)); const y = top - roll + roll * Math.sin(a);
    rings.push(roundedRectRing(hx - ins, hz - ins, rc - ins * 0.5, nR, (u, v) => V3(u, y, v)));
  }
  // top: rings scaled proportionally toward the centre (no degenerate centre line); denser near the edge
  const hx0 = hx - roll, hz0 = hz - roll, rc0 = rc - roll * 0.5; const K = 56;
  for (let k = 1; k < K; k++) { const f = 1 - Math.pow(k / K, 1.15); rings.push(roundedRectRing(hx0 * f, hz0 * f, Math.max(0.0008, rc0 * f), nR, (u, v) => V3(u, top, v))); }
  // displace the top rings (from the rolled edge inward); fade near the edge
  rings.forEach((r, ri) => {
    if (ri < sideY.length + 4) return;
    for (const p of r) { const edge = Math.min(hx - Math.abs(p.x), hz - Math.abs(p.z)); const f = THREE.MathUtils.smoothstep(edge, 0.0, 0.03); p.y += height(p.x, p.z) * f; }
  });
  const mb = new MeshBuilder(); const ids = [];
  for (const r of rings) for (const p of r) ids.push(mb.vert(p.x, p.y, p.z, 0, 0, 0));
  mb.grid(ids, rings.length, nR, true);
  const g = mb.build({ orient: false }); g.computeVertexNormals();
  // outward orientation
  { const pos = g.attributes.position, nr = g.attributes.normal; let dot = 0; for (let i = 0; i < pos.count; i += 9) dot += pos.getX(i) * nr.getX(i) + (pos.getY(i) - (y0 + 0.02)) * nr.getY(i) + pos.getZ(i) * nr.getZ(i); if (dot < 0) for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i)); }
  const cushion = new MeshBuilder(); cushion.append(g);
  { const r = rings[rings.length - 1]; let cx = 0, cy = 0, cz = 0; r.forEach((p) => { cx += p.x; cy += p.y; cz += p.z; }); const c = cushion.vert(cx / nR, cy / nR, cz / nR, 0, 1, 0); const b0 = cushion.count; r.forEach((p) => cushion.vert(p.x, p.y, p.z, 0, 1, 0)); for (let j = 0; j < nR; j++) cushion.tri(c, b0 + j, b0 + ((j + 1) % nR)); }
  const cush = new THREE.Mesh(cushion.build(), M.leather); cush.name = 'benchCushion'; cush.castShadow = cush.receiveShadow = true; seat.add(cush);
  // welt (piping) along the top seam
  {
    const ring = roundedRectRing(hx - 0.0015, hz - 0.0015, rc, 240, (u, v) => V3(u, top - roll - 0.002, v)); ring.push(ring[0].clone());
    const w = new THREE.Mesh(finish(tube(ring, 0.0032, { radial: 10, caps: false })), M.leather); w.name = 'benchWelt'; seat.add(w);
  }
  // buttons
  {
    const bGeo = finish(lathe(roundProfile([[0.0, -0.002], [0.0075, -0.002], [0.008, 0.0005], [0.0, 0.0032]], [0, 0.001, 0.003, 0], { seg: 4 }), { segments: 20 }));
    const im = new THREE.InstancedMesh(bGeo, M.leather, btn.length); im.name = 'benchButtons'; im.frustumCulled = false;
    btn.forEach((b, i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(b[0], top + height(b[0], b[1]) + 0.0008, b[1])));
    seat.add(im);
  }
  // apron (black lacquer) + legs + knobs
  const apH = 0.085, apTop = y0 + 0.002;
  const ap = new THREE.Mesh(roundedBox(-hx + 0.006, hx - 0.006, apTop - apH, apTop, -hz + 0.006, hz - 0.006, 0.004, 0.012), M.lacquerLocal); ap.name = 'benchApron'; seat.add(ap);
  const legs = [];
  const legH = apTop - apH + 0.01;
  {
    const rings2 = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; const y = 0.012 + t * (legH - 0.012); const hs = (0.034 + (0.045 - 0.034) * t) / 2; rings2.push(roundedRectRing(hs, hs, 0.004, 40, (u, v) => V3(u, y, v))); }
    const lmb = new MeshBuilder(); const lid = []; for (const r of rings2) for (const p of r) lid.push(lmb.vert(p.x, p.y, p.z, 0, 0, 0));
    lmb.grid(lid, rings2.length, 40, true); const lg = lmb.build({ orient: false }); lg.computeVertexNormals();
    { const pos = lg.attributes.position, nr = lg.attributes.normal; let dot = 0; for (let i = 0; i < pos.count; i += 3) dot += pos.getX(i) * nr.getX(i) + pos.getZ(i) * nr.getZ(i); if (dot < 0) for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i)); }
    const cap = finish(lathe(roundProfile([[0.0, 0.0], [0.0182, 0.0], [0.0185, 0.013], [0.0168, 0.0145], [0.0, 0.0145]], [0, 0.002, 0.0015, 0.001, 0], { seg: 3 }), { segments: 4, phi0: Math.PI / 4 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * (hx - 0.040), pz = sz * (hz - 0.035);
      const lm = new THREE.Mesh(lg, M.lacquerLegLocal); lm.name = 'benchLeg'; lm.position.set(px, 0, pz); group.add(lm); legs.push(lm);
      const cm = new THREE.Mesh(cap, M.brass); cm.name = 'benchFootCap'; cm.position.set(px, 0, pz); group.add(cm);
    }
  }
  {
    const knob = finish(lathe(roundProfile([[0.0, 0.0], [0.020, 0.0], [0.0275, 0.008], [0.0270, 0.022], [0.020, 0.030], [0.0, 0.031]], [0, 0.002, 0.006, 0.006, 0.006, 0], { seg: 5 }), { segments: 40 }));
    const ring = finish(lathe(roundProfile([[0.0205, -0.0005], [0.0235, -0.0005], [0.0235, 0.0040], [0.0205, 0.0040]], [0, 0.0006, 0.0006, 0], { seg: 2 }), { segments: 40 }));
    for (const sx of [-1, 1]) {
      const m = new THREE.Matrix4().makeRotationZ(-sx * Math.PI / 2).setPosition(sx * (hx - 0.006), apTop - apH / 2, 0);
      const k = new THREE.Mesh(knob.clone().applyMatrix4(m), M.lacquerLocal); k.name = 'benchKnob'; seat.add(k);
      const r = new THREE.Mesh(ring.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(-sx * Math.PI / 2).setPosition(sx * (hx - 0.006 + 0.004), apTop - apH / 2, 0)), M.nickel); r.name = 'benchKnobRing'; seat.add(r);
    }
  }
  group.position.set(B.centerX, 0, B.nearEdgeZ - hz);
  /** seat top (rolled edge) at h metres; the legs keep their feet on the floor */
  function setHeight(h) {
    const dy = h - top;
    seat.position.y = dy;
    const s = (legH + dy) / legH;
    for (const lm of legs) lm.scale.y = s;
  }
  return { group, seat, setHeight };
}
