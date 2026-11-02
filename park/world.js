// Terrain (height function shared with grass placement), the dirt path,
// distant mountain ranges and a line of utility poles with sagging wires.
import * as THREE from 'three';
import { COMMON, SHADOW } from './glsl.js';

// ---------- deterministic noise for the CPU side
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); n += a; const nx = 1.6 * x + 1.2 * y, ny = -1.2 * x + 1.6 * y; x = nx + 3.1; y = ny + 1.7; a *= 0.5; }
  return s / n;
}

// The lawn the duo plays on (#051, ../038_duo.html?stage=park): a flat, mown pad on the
// hill's shoulder 13 m from the tree, toward the hillside view, its edge blending into the
// hill over BLEND m. heightAt and everything placed by it (terrain, grass) see it.
export const LAWN = { x: -10.9, z: 7.1, r: 4.2, blend: 3.5, y: 0 };
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 1 on the lawn, 0 past its blend. */
export function lawnK(x, z) { return 1 - smooth01(LAWN.r, LAWN.r + LAWN.blend, Math.hypot(x - LAWN.x, z - LAWN.z)); }
export function heightAt(x, z) {
  const h = rawHeight(x, z), k = lawnK(x, z);
  return h + (LAWN.y - h) * k;
}
function rawHeight(x, z) {
  const r2 = x * x + z * z;
  let h = 7.5 * Math.exp(-r2 / (2 * 30 * 30));                     // the tree's hill
  h += 2.4 * Math.sin(x * 0.017 + 0.7) * Math.cos(z * 0.021 - 0.4); // long swells
  h += 1.1 * Math.sin((x + z) * 0.043 + 1.3);
  h += (fbm(x * 0.012, z * 0.012, 4) - 0.5) * 9;
  h += (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 0.6;
  // the land falls away into a broad valley beyond the hill
  const far = Math.max(0, -z - 60);
  h -= far * 0.06 * (1 - Math.exp(-far / 200));
  return h;
}
LAWN.y = rawHeight(LAWN.x, LAWN.z);
export function normalAt(x, z) {
  const e = 0.5;
  const n = new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e));
  return n.normalize();
}

// ---------- the path: a Catmull-Rom curve across the hill shoulder
const PATH_PTS = [[-70, 95], [-38, 52], [-14, 24], [6, 10], [20, -8], [28, -40], [45, -90], [90, -170], [150, -260]];
const pathCurve = new THREE.CatmullRomCurve3(PATH_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)));
const PATH_SAMPLES = pathCurve.getSpacedPoints(600);
// bucket the samples so lookups only scan nearby ones; far from the path returns 99
const CELL = 16, buckets = new Map();
for (const p of PATH_SAMPLES) {
  const cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const key = (cx + i) + ',' + (cz + j);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
}
export function pathDist(x, z) {
  const list = buckets.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (!list) return 99;
  let best = 99 * 99;
  for (const p of list) { const dx = p.x - x, dz = p.z - z; const d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best);
}
export const PATH_HALF_WIDTH = 1.1;

// ---------- terrain mesh
export function makeTerrain(shared) {
  const SEG = 320, EXT = 900;
  const warp = (u) => EXT * (0.22 * u + 0.78 * u * u * u);
  const pos = new Float32Array((SEG + 1) * (SEG + 1) * 3);
  const path = new Float32Array((SEG + 1) * (SEG + 1));
  let k = 0;
  for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) {
    const x = warp(i / SEG * 2 - 1), z = warp(j / SEG * 2 - 1);
    pos[k * 3] = x; pos[k * 3 + 1] = heightAt(x, z); pos[k * 3 + 2] = z;
        path[k] = pathDist(x, z);
    k++;
  }
  const idx = [];
  for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) {
    const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('pathDist', new THREE.BufferAttribute(path, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uGrassDark: { value: new THREE.Color() }, uGrassLight: { value: new THREE.Color() }, uDirt: { value: new THREE.Color() }, uRain: { value: 0 },
      // stand-ins for what the puddles reflect, set by main.js: poles (x, z, base y, height)
      // with their crossbar direction, the trunk (x, z, base y, height), the canopy (centre,
      // radius) with its vertical squash, colour and how bare it is
      uPoles: { value: Array.from({ length: 14 }, () => new THREE.Vector4(0, 0, -999, 0)) }, uPoleBars: { value: Array.from({ length: 14 }, () => new THREE.Vector2(1, 0)) },
      uTrunk: { value: new THREE.Vector4(0, 0, -999, 0) }, uCanopy: { value: new THREE.Vector4(0, -999, 0, 1) }, uCanopyY: { value: 0.7 },
      uCanopyCol: { value: new THREE.Color() }, uCanopyBare: { value: 0 }, uPoleCol: { value: new THREE.Color(0.22, 0.2, 0.22) }, uBarkCol: { value: new THREE.Color(0.13, 0.085, 0.07) } },
    vertexShader: /* glsl */ `
      attribute float pathDist;
      varying vec3 vWp; varying vec3 vN; varying float vPath;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp = wp.xyz; vN = normal; vPath = pathDist;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: COMMON + SHADOW + /* glsl */ `
      uniform vec3 uGrassDark, uGrassLight, uDirt; uniform float uRain;
      varying vec3 vWp; varying vec3 vN; varying float vPath;
      // raindrop rings: one drop per 0.4 m cell per ~0.8 s at a random spot and phase,
      // a thin ring that spreads to ~15 cm and fades
      float ripples(vec2 p, float t) {
        p /= 0.4; vec2 c = floor(p); float s = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 q = c + vec2(x, y);
          // each drop lands somewhere new: its spot is hashed from the cell and the drop number
          float h = hash12(q), tt = t * (0.9 + h * 0.6) + h * 7.0, ph = fract(tt), n = floor(tt);
          vec2 o = q + vec2(hash12(q + n * 1.37), hash12(q.yx + 3.0 + n * 2.11));
          float r = length(p - o) * 0.4, R = ph * 0.15;
          s += exp(-pow((r - R) * 70.0, 2.0)) * (1.0 - ph) * (1.0 - ph) * 1.4;
        }
        return s;
      }
      uniform vec4 uPoles[14]; uniform vec2 uPoleBars[14];
      uniform vec4 uTrunk, uCanopy; uniform float uCanopyY, uCanopyBare; uniform vec3 uCanopyCol, uPoleCol, uBarkCol;
      // What a still puddle at p mirrors along the reflected view ray r (going up): the
      // nearest of the poles, their crossbars, the trunk and the canopy. Returns the colour
      // in .rgb and coverage in .a, soft at the edges.
      vec4 mirrored(vec3 p, vec3 r) {
        vec4 hit = vec4(0.0); float best = 1e9;
        vec2 o = p.xz, dir = r.xz; float dd = max(dot(dir, dir), 1e-6), sl = sqrt(dd + r.y * r.y);
        for (int i = 0; i < 14; i++) {
          vec4 P = uPoles[i];
          if (P.w <= 0.0) continue;
          // the pole: a thin vertical cylinder
          float t = dot(P.xy - o, dir) / dd;
          if (t > 0.0) {
            float y = p.y + r.y * t, dist = length(o + dir * t - P.xy);
            float a = (1.0 - smoothstep(0.14, 0.24, dist)) * step(P.z, y) * (1.0 - smoothstep(P.z + P.w - 0.05, P.z + P.w, y));
            if (a > 0.01 && t * sl < best) { best = t * sl; hit = vec4(uPoleCol, a); }
          }
          // the upper crossbar, 2.2 m along uPoleBars[i], 0.6 m below the top
          float th = (P.z + P.w - 0.6 - p.y) / max(r.y, 1e-4);
          if (th > 0.0) {
            vec2 q = o + dir * th - P.xy, ax = uPoleBars[i];
            float along = abs(dot(q, ax)), across = abs(q.x * ax.y - q.y * ax.x);
            float a = (1.0 - smoothstep(0.9, 1.1, along)) * (1.0 - smoothstep(0.06, 0.12, across * min(1.0, r.y * 3.0 + 0.2)));
            if (a > 0.01 && th * sl < best) { best = th * sl; hit = vec4(uPoleCol, a); }
          }
        }
        // the trunk, tapering from 0.62 m to 0.25 m
        float t = dot(uTrunk.xy - o, dir) / dd;
        if (t > 0.0 && uTrunk.w > 0.0) {
          float y = p.y + r.y * t, f = clamp((y - uTrunk.z) / uTrunk.w, 0.0, 1.0);
          float rad = mix(0.62, 0.25, f), dist = length(o + dir * t - uTrunk.xy);
          float a = (1.0 - smoothstep(rad * 0.85, rad, dist)) * step(uTrunk.z, y) * (1.0 - smoothstep(uTrunk.z + uTrunk.w - 0.3, uTrunk.z + uTrunk.w, y));
          if (a > 0.01 && t * sl < best) { best = t * sl; hit = vec4(uBarkCol, a); }
        }
        // the canopy: an ellipsoid with a ragged edge, thinning as the tree goes bare
        vec3 e = vec3(1.0, 1.0 / uCanopyY, 1.0) / uCanopy.w;
        vec3 ro = (p - uCanopy.xyz) * e, rd = r * e;
        float b = dot(ro, rd), c = dot(ro, ro) - 1.0, A = dot(rd, rd), disc = b * b - A * c;
        if (disc > 0.0) {
          float tc = (-b - sqrt(disc)) / A;
          if (tc > 0.0) {
            // lobed like the clumps (noise over the direction from the centre), with sky
            // gaps through it, rather than a smooth oval
            vec3 hd = normalize(ro + rd * tc);
            float edge = sqrt(disc / A);                 // ~1 through the middle, 0 at the rim
            float lobes = fbm3o(hd.xz * 2.6 + hd.y * 1.7 + 4.0) - 0.5;
            float gaps = smoothstep(0.3, 0.42, fbm3o(hd.xz * 5.0 - hd.y * 3.0 + 9.0));
            float a = smoothstep(0.02, 0.12, edge + lobes * 0.9) * mix(0.55, 1.0, gaps) * (1.0 - uCanopyBare * 0.9);
            if (a > 0.01 && tc * length(r) < best) { best = tc * length(r); hit = vec4(uCanopyCol, a); }
          }
        }
        return hit;
      }
      void main() {
        vec3 n = normalize(vN);
        float patches = fbm3o(vWp.xz * 0.05);
        float fine = vnoise(vWp.xz * vec2(1.4, 0.35));         // brush-stroke streaks
        vec3 grass = mix(uGrassDark, uGrassLight, smoothstep(0.3, 0.75, patches) * 0.7 + fine * 0.15);
        float dirtEdge = vnoise(vWp.xz * 0.9) * 0.5;
        float p = 1.0 - smoothstep(1.0 + dirtEdge * 0.5, 1.6 + dirtEdge, vPath);
        vec3 alb = mix(grass, uDirt * (0.9 + 0.2 * vnoise(vWp.xz * 3.0)), p);
        alb = mix(alb, SNOW * (0.94 + 0.06 * fine), snowAt(vWp.xz));
        float ndl = dot(n, uSunDir);
        float sh = treeShadow(vWp, 0.002) * cloudShadowAt(vWp);
        vec3 col = celLight(alb, ndl, sh, 0.85, 0.12);
        // puddles in the hollows of the path: flat, still, reflecting the grey sky, more of
        // them the harder it rains, rippled by the drops
        if (uRain > 0.001 && p > 0.01) {
          float hollow = fbm3o(vWp.xz * 0.45 + 3.1) * 0.75 + vnoise(vWp.xz * 2.2) * 0.25;
          float rim = smoothstep(0.6 - uRain * 0.06, 0.66 - uRain * 0.06, hollow);
          float pud = smoothstep(0.68 - uRain * 0.06, 0.7 - uRain * 0.06, hollow) * smoothstep(0.4, 0.9, p) * smoothstep(0.0, 0.4, uRain);
          if (rim > 0.001) {
            vec3 v = normalize(vWp - cameraPosition);
            float fres = 0.12 + 0.55 * pow(1.0 - abs(v.y), 5.0);
            // the overcast sky mirrored: soft lighter and darker cloud masses, a little darker
            // than the sky itself, which keeps them reading as water rather than holes
            float sk = fbm3o(vWp.xz * vec2(0.12, 0.3) + uCloudT * 0.004);
            vec3 refl = mix(uFogColor, uAmbient, 0.35) * mix(0.62, 0.92, sk);
            float ring = ripples(vWp.xz, uTime) * uRain;
            // the hill's own things in the water, lit by the overcast sky, wobbled by the drops
            // and veiled by a little of the haze
            vec3 rv = vec3(v.x, -v.y, v.z);
            rv.xz += (vec2(vnoise(vWp.xz * 3.0 + uTime * 0.7), vnoise(vWp.zx * 3.0 - uTime * 0.6)) - 0.5) * 0.03 * uRain + ring * 0.02;
            vec4 m = mirrored(vWp, normalize(rv));
            // darker than the sky they stand against, as reflections of an overcast-lit object are
            vec3 mc = m.rgb * (uAmbient * 0.6 + uSunColor * 0.05);
            refl = mix(refl, mix(mc, uFogColor, 0.12), m.a);
            vec3 pc = mix(col * 0.55, refl, max(fres, m.a * 0.95)) * (1.0 - ring * 0.25) + refl * ring * 0.6;
            col *= 1.0 - rim * 0.25 * smoothstep(0.4, 0.9, p);   // darker wet mud round the edge
            col = mix(col, pc, pud);
          }
        }
        gl_FragColor = vec4(applyFog(col, vWp), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, mat };
}

// ---------- mountain ranges: a ring of slopes facing the viewer, lost in haze
export function makeMountains(shared) {
  const group = new THREE.Group();
  const layers = [
    { R: 1500, H: 120, seed: 1.3, rows: 14, depth: 420, col: new THREE.Color(0.32, 0.46, 0.38) },
    { R: 2700, H: 420, seed: 7.9, rows: 18, depth: 900, col: new THREE.Color(0.36, 0.42, 0.55) },
  ];
  const mats = [];
  for (const L of layers) {
    const A = 720, pos = [], idx = [];
    for (let i = 0; i <= A; i++) {
      const a = i / A * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // ridge height along the ring, higher behind the hill (-z) where the eye looks most
      const back = 0.55 + 0.45 * Math.max(0, -sa);
      const ridge = L.H * back * (0.35 + 1.1 * Math.pow(fbm(i / A * 9 + L.seed, L.seed, 5), 2.2) + 0.25 * fbm(i / A * 40, L.seed + 3, 3));
      for (let r = 0; r <= L.rows; r++) {
        const t = r / L.rows;                                        // 0 at foot, 1 at ridge
        const bump = (fbm(i / A * 60 + L.seed, t * 4, 3) - 0.5) * 0.25;
        const h = ridge * (Math.pow(t, 1.4) + bump * t * (1 - t) * 3) - 60;
        const rad = L.R - (1 - t) * L.depth;
        pos.push(ca * rad, h, sa * rad);
      }
    }
    const S = L.rows + 1;
    for (let i = 0; i < A; i++) for (let r = 0; r < L.rows; r++) {
      const a = i * S + r, b = a + 1, c = a + S, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...shared, uCol: { value: L.col }, uSnow: { value: L.H > 300 ? 1 : 0 }, uTop: { value: L.H } },
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vWp; varying vec3 vN;
        void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: COMMON + /* glsl */ `
        uniform vec3 uCol; uniform float uSnow; uniform float uTop;
        varying vec3 vWp; varying vec3 vN;
        void main() {
          vec3 n = normalize(vN);
          if (dot(n, cameraPosition - vWp) < 0.0) n = -n;
          vec3 alb = uCol * (0.85 + 0.3 * vnoise(vWp.xz * 0.01));
          // winter brings the snow line down to the foothills
          float line = mix(0.55, 0.05, uSnowCover);
          float snow = max(uSnow, uSnowCover) * smoothstep(uTop * line, uTop * (line + 0.2), vWp.y + vnoise(vWp.xz * 0.02) * 60.0) * smoothstep(0.3, 0.7, n.y);
          alb = mix(alb, vec3(0.92, 0.95, 1.0), snow);
          vec3 col = celLight(alb, dot(n, uSunDir), cloudShadowAt(vWp * 0.3), 0.9, 0.2);
          gl_FragColor = vec4(applyFog(col, cameraPosition + (vWp - cameraPosition) * 0.55), 1.0);
        }`,
    });
    mats.push(mat);
    group.add(new THREE.Mesh(geo, mat));
  }
  return { group, mats };
}

// ---------- utility poles along the path, wires sagging between them
export function makePoles(shared) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uCol: { value: new THREE.Color(0.22, 0.2, 0.22) } },
    vertexShader: /* glsl */ `
      varying vec3 vWp; varying vec3 vN;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + SHADOW + /* glsl */ `
      uniform vec3 uCol; varying vec3 vWp; varying vec3 vN;
      void main() {
        vec3 col = celLight(uCol, dot(normalize(vN), uSunDir), treeShadow(vWp, 0.003) * cloudShadowAt(vWp), 0.8, 0.1);
        gl_FragColor = vec4(applyFog(col, vWp), 1.0);
      }`,
  });
  const tops = [], proxies = [];
  const N = 14, poleH = 9.5;
  const pole = new THREE.CylinderGeometry(0.11, 0.16, poleH, 8); pole.translate(0, poleH / 2, 0);
  const bar = new THREE.BoxGeometry(2.2, 0.12, 0.12);
  const insul = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6);
  for (let i = 0; i < N; i++) {
    const t = 0.06 + i * 0.065;
    if (t > 1) break;
    const p = pathCurve.getPointAt(t), tan = pathCurve.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const base = p.clone().addScaledVector(side, 3.2);
    base.y = heightAt(base.x, base.z) - 0.3;
    const g = new THREE.Group();
    g.position.copy(base);
    g.rotation.y = Math.atan2(side.x, side.z) + Math.PI / 2 + (hash2(i, 1) - 0.5) * 0.04;
    g.rotation.z = (hash2(i, 2) - 0.5) * 0.03;
    g.add(new THREE.Mesh(pole, mat));
    const b1 = new THREE.Mesh(bar, mat); b1.position.y = poleH - 0.6; g.add(b1);
    const b2 = new THREE.Mesh(bar, mat); b2.position.y = poleH - 1.5; b2.scale.x = 0.75; g.add(b2);
    const ends = [];
    for (const [x, y] of [[-1.0, poleH - 0.6], [0, poleH - 0.6], [1.0, poleH - 0.6], [-0.7, poleH - 1.5], [0.7, poleH - 1.5]]) {
      const ins = new THREE.Mesh(insul, mat); ins.position.set(x, y + 0.15, 0); g.add(ins);
      ends.push(new THREE.Vector3(x, y + 0.24, 0));
    }
    g.updateMatrixWorld(true);
    tops.push(ends.map((e) => e.applyMatrix4(g.matrixWorld)));
    const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion);
    proxies.push([new THREE.Vector4(base.x, base.z, base.y, poleH), new THREE.Vector2(ax.x, ax.z).normalize()]);
    group.add(g);
  }
  // wires: catenary-ish sag between consecutive poles
  const wirePts = [];
  for (let i = 0; i + 1 < tops.length; i++) for (let w = 0; w < tops[i].length; w++) {
    const a = tops[i][w], b = tops[i + 1][w];
    const sag = a.distanceTo(b) * 0.035;
    const pts = [];
    for (let s = 0; s <= 24; s++) { const u = s / 24; const p = a.clone().lerp(b, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); }
    wirePts.push(pts);
  }
  const wireGeo = mergeTubes(wirePts, 0.022);
  group.add(new THREE.Mesh(wireGeo, mat));
  group.traverse((o) => { if (o.isMesh) o.userData.castShadow = true; });
  return { group, mat, proxies };
}

function mergeTubes(lines, r) {
  const pos = [], nor = [], idx = []; const RS = 4;
  for (const pts of lines) {
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const t = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      const u = new THREE.Vector3(0, 1, 0).cross(t).normalize(); const v = t.clone().cross(u);
      for (let k = 0; k < RS; k++) {
        const a = k / RS * Math.PI * 2; const n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
        pos.push(pts[i].x + n.x * r, pts[i].y + n.y * r, pts[i].z + n.z * r); nor.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < RS; k++) {
      const a = base + i * RS + k, b = base + i * RS + (k + 1) % RS, c = a + RS, d = b + RS;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
