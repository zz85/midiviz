// Rounded granite boulders at the near shores (instanced, deterministic placement on the height field's waterline),
// plus rock spits: clusters of big dark boulders protruding 20-60 m into the lake (refs 10 / 5: dark rock spits in a
// smooth navy mirror, lit faces #333552, shadows #0E1425).
import * as THREE from 'three';
import { GLSL_NOISE, makeNoise2D, mulberry32, halton, azDir } from './util.js';
import { SKY_UNIFORMS_GLSL, SKY_FUNCS_GLSL, SH_GLSL, ENV_LAYER } from './sky.js';
import { ATMOS_UNIFORMS_GLSL, ATMOS_FUNCS_GLSL } from './terrain.js';

function boulderGeometry(detail, seed, frac = null) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const n = makeNoise2D(seed); const pos = g.attributes.position; const v = new THREE.Vector3();
  const rnd = mulberry32(seed);
  if (!frac) {
    const sq = 0.55 + 0.35 * rnd();          // squash: granite boulders are wider than tall
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const r = 1 + 0.16 * n(v.x * 1.7 + v.y * 0.4, v.z * 1.7 - v.y * 0.6) + 0.06 * n(v.x * 4.1, v.z * 4.1 + v.y * 3.0);
      v.multiplyScalar(r); v.y *= sq; if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  // fix round 2: jagged rock, not bread-roll domes: 3-6 fracture planes cut large flat faces with sharp edges, two
  // ridged octaves at ~0.1-0.3 of the rock size, a wide spread of height / width (some rocks are points). The
  // icosphere is non-indexed, so computeVertexNormals gives faceted (per-face) normals: crisp planes.
  const sq = frac.squash[0] + (frac.squash[1] - frac.squash[0]) * rnd();
  const lean = [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5];
  const nf = frac.planes[0] + Math.floor(rnd() * (frac.planes[1] - frac.planes[0] + 1));
  const planes = [];
  for (let k = 0; k < nf; k++) {
    const th = rnd() * 2 * Math.PI, y = -0.15 + 1.05 * rnd(), c = Math.sqrt(Math.max(0, 1 - y * y));
    planes.push([c * Math.cos(th), y, c * Math.sin(th), frac.offset[0] + (frac.offset[1] - frac.offset[0]) * rnd()]);
  }
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r1 = 1 - 2 * Math.abs(n(v.x * 2.3 + v.y * 0.7, v.z * 2.3 - v.y * 0.9));          // ridged, ~0.3 x size
    const r2 = 1 - 2 * Math.abs(n(v.x * 6.1 + 3.1, v.z * 6.1 + v.y * 5.3));               // ridged, ~0.1 x size
    v.multiplyScalar(1 + frac.ridge * (0.65 * r1 + 0.35 * r2) + 0.12 * n(v.x * 1.3, v.z * 1.3 + v.y));
    for (const p of planes) {
      const d = v.x * p[0] + v.y * p[1] + v.z * p[2];
      if (d > p[3]) { const e = d - p[3]; v.x -= e * p[0]; v.y -= e * p[1]; v.z -= e * p[2]; }
    }
    v.y *= sq; if (v.y > 0) { v.x += lean[0] * v.y; v.z += lean[1] * v.y; }
    if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** distance (m) along azimuth A where the terrain first rises above the water (null if none within dMax) */
function shoreDistance(height, A, d0 = 250, dMax = 4000) {
  const [dx, dz] = azDir(A);
  let prev = d0;
  for (let d = d0; d < dMax; d *= 1.02) {
    if (height(dx * d, dz * d) > 0) {
      let lo = prev, hi = d;                              // refine
      for (let i = 0; i < 12; i++) { const m = 0.5 * (lo + hi); if (height(dx * m, dz * m) > 0) hi = m; else lo = m; }
      return hi;
    }
    prev = d;
  }
  return null;
}

export function makeBoulders(P, shared, height) {
  const B = P.boulders;
  const group = new THREE.Group(); group.name = 'AG.world.boulders';
  const mat = new THREE.ShaderMaterial({
    name: 'AG.world.boulders',
    uniforms: { ...shared, uAlb: { value: new THREE.Vector3(...B.albedo) }, uAlbVar: { value: B.albedoVar ?? 0.4 } },
    vertexShader: /* glsl */`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      attribute float aVar;
      varying vec3 vW; varying vec3 vN; varying float vVar; varying float vH; varying float vMir;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec4 w = m * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(m) * normal); vVar = aVar; vH = position.y;
        vMir = modelMatrix[1][1] < 0.0 ? 1.0 : 0.0; if (vMir > 0.5) vN.y = -vN.y;   // env-only mirror copy
        gl_Position = projectionMatrix * viewMatrix * w;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: GLSL_NOISE + SKY_UNIFORMS_GLSL + SKY_FUNCS_GLSL + SH_GLSL + ATMOS_UNIFORMS_GLSL + ATMOS_FUNCS_GLSL + /* glsl */`
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uAlb; uniform float uAlbVar; uniform vec3 uDarkFloor; uniform float uMirrorRefl;
      varying vec3 vW; varying vec3 vN; varying float vVar; varying float vH; varying float vMir;
      void main() {
        #include <logdepthbuf_fragment>
        vec3 n = normalize(vN);
        vec3 Pw = vec3(vW.x, abs(vW.y), vW.z);
        vec3 alb = uAlb * (1.0 + uAlbVar * 2.0 * (vVar - 0.5)) * (0.75 + 0.5 * ag_fbm(Pw.xz * 0.7 + Pw.y, 3));
        float ao = mix(0.45, 1.0, smoothstep(-0.25, 0.35, vH)) * (0.7 + 0.3 * smoothstep(-0.3, 0.6, n.y));
        vec3 col = alb * max(ag_shIrr(n), vec3(0.0)) * ao + uDarkFloor * ao;
        col *= mix(1.0, uMirrorRefl, vMir);
        col = ag_atmosphere(col, vW, cameraPosition);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  let tris = 0, count = 0;
  const addInstances = (geos, picks) => {
    picks.forEach((list, v) => {
      if (!list.length) return;
      const g = geos[v];
      const mesh = new THREE.InstancedMesh(g, mat, list.length);
      const varr = new Float32Array(list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      list.forEach((b, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.ry);
        sc.set(b.s * b.sx, b.s, b.s / b.sx); p.set(b.x, b.y, b.z);
        m.compose(p, q, sc); mesh.setMatrixAt(i, m); varr[i] = b.var;
      });
      g.setAttribute('aVar', new THREE.InstancedBufferAttribute(varr, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false; mesh.layers.enable(ENV_LAYER);
      group.add(mesh);
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * list.length; count += list.length;
    });
  };
  // waterline zones
  B.zones.forEach((Z, zi) => {
    const detail = Z.detail ?? B.detail;
    const geos = [0, 1, 2, 3].map((v) => boulderGeometry(detail, B.seed * 31 + zi * 7 + v, B.fracture));
    const rnd = mulberry32(B.seed * 1013 + zi);
    const picks = [[], [], [], []];
    let tries = 0;
    const dMin = Z.dMin ?? 250, dMax = Z.dMax ?? 2200;
    while (picks.flat().length < Z.count && tries < Z.count * 400) {
      tries++;
      const u = halton(tries + zi * 100003, 2), w = halton(tries + zi * 100003, 3);
      const A = Z.A0 + (Z.A1 - Z.A0) * u, d = dMin * Math.pow(dMax / dMin, w);
      const [dx, dz] = azDir(A); const x = dx * d, z = dz * d;
      const h = height(x, z);
      if (h < Z.h0 || h > Z.h1) continue;
      const s = Z.size[0] * Math.pow(Z.size[1] / Z.size[0], Math.pow(rnd(), 1.8));
      picks[Math.floor(rnd() * 4)].push({ x, z, y: h - 0.22 * s, s, ry: rnd() * Math.PI * 2, var: rnd(), sx: 0.8 + 0.4 * rnd() });
    }
    addInstances(geos, picks);
  });
  // rock spits: from the shore point at azimuth A, toward the piano (into the lake), length L, boulders bigger at the
  // root, the spit narrowing toward its tip; partly submerged
  (B.spits ?? []).forEach((S, si) => {
    const geos = [0, 1, 2, 3].map((v) => boulderGeometry(B.detail, B.seed * 57 + si * 11 + v, B.fracture));
    const rnd = mulberry32(B.seed * 7919 + si);
    const d0 = shoreDistance(height, S.A);
    if (d0 === null) return;
    const [dx, dz] = azDir(S.A); const ux = -dx, uz = -dz, vx = -uz, vz = ux;   // along the spit (into the lake), across
    const picks = [[], [], [], []];
    for (let i = 0; i < S.count; i++) {
      const a = Math.pow(rnd(), 0.8);                     // 0 root .. 1 tip
      const along = -S.root + (S.len + S.root) * a;
      const wHalf = S.width * (1 - 0.7 * a);
      const across = (rnd() + rnd() + rnd() - 1.5) / 1.5 * wHalf + S.bend * along * along / (S.len * S.len) * S.len * 0.3;
      const s = (S.size[0] * Math.pow(S.size[1] / S.size[0], Math.pow(rnd(), 1.6))) * (1 - 0.45 * a);
      const x = dx * d0 + ux * along + vx * across, z = dz * d0 + uz * along + vz * across;
      const h = Math.max(height(x, z), -0.8);
      picks[Math.floor(rnd() * 4)].push({ x, z, y: h - (0.25 + 0.2 * a) * s, s, ry: rnd() * Math.PI * 2, var: rnd(), sx: 0.75 + 0.5 * rnd() });
    }
    addInstances(geos, picks);
  });
  group.layers.enable(ENV_LAYER);
  return { group, material: mat, stats: { boulders: count, triangles: tris } };
}
