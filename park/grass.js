// Instanced grass blades with wind gusts that roll across the field as bright waves,
// plus small wildflowers. Placement and heights come from the CPU terrain function.
import * as THREE from 'three';
import { COMMON, SHADOW } from './glsl.js';
import { heightAt, normalAt, pathDist, PATH_HALF_WIDTH, fbm, lawnK } from './world.js';
import { mulberry32 } from './tree.js';

export function makeGrass(shared, { count = 160000, radius = 72, center = new THREE.Vector2(-6, 10) } = {}) {
  const rnd = mulberry32(99);
  const SEGS = 5;
  // blade: a tapered strip, x in [-0.5, 0.5], y in [0, 1]
  const bp = [], bi = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS, w = (1 - Math.pow(t, 1.5)) * 0.5;
    if (i < SEGS) bp.push(-w, t, 0, w, t, 0); else bp.push(0, 1, 0);
  }
  for (let i = 0; i < SEGS - 1; i++) { const a = i * 2; bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const tipI = SEGS * 2; bi.push((SEGS - 1) * 2, (SEGS - 1) * 2 + 1, tipI);

  const off = [], par = [], nrm = [];
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 4) {
    tries++;
    const r = Math.sqrt(rnd()) * radius, a = rnd() * Math.PI * 2;
    const x = center.x + Math.cos(a) * r, z = center.y + Math.sin(a) * r;
    // density falls off with distance from the centre of the field
    if (rnd() > 1.15 - Math.pow(r / radius, 1.5)) continue;
    const pd = pathDist(x, z);
    if (pd < PATH_HALF_WIDTH + rnd() * 0.5) continue;
    if (x * x + z * z < 0.8) continue; // trunk
    const y = heightAt(x, z);
    const patch = fbm(x * 0.06, z * 0.06, 3);
    const nearPath = Math.min(1, (pd - PATH_HALF_WIDTH) / 2.5);
    // (the duo's lawn is mown: a quarter of the height)
    const h = (0.28 + 0.5 * patch + rnd() * 0.3) * (0.45 + 0.55 * nearPath) * (r > radius * 0.8 ? 0.8 : 1) * (1 - 0.75 * lawnK(x, z));
    off.push(x, y, z);
    par.push(rnd() * Math.PI * 2, h, 0.045 + rnd() * 0.04, rnd());
    const n = normalAt(x, z); nrm.push(n.x, n.y, n.z);
    placed++;
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  geo.setIndex(bi);
  geo.setAttribute('iOff', new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
  geo.setAttribute('iPar', new THREE.InstancedBufferAttribute(new Float32Array(par), 4));
  geo.setAttribute('iNrm', new THREE.InstancedBufferAttribute(new Float32Array(nrm), 3));
  geo.instanceCount = placed;

  const uniforms = {
    ...shared,
    uBase: { value: new THREE.Color() }, uTip: { value: new THREE.Color() }, uTip2: { value: new THREE.Color() }, uSheen: { value: new THREE.Color() },
  };
  const flowerU = { ...shared, uFlowers: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: COMMON + /* glsl */ `
      attribute vec3 iOff; attribute vec4 iPar; attribute vec3 iNrm;
      varying float vT; varying vec3 vWp; varying vec3 vN; varying float vSeed; varying float vGust; varying float vH; varying float vSnow;
      void main() {
        float ang = iPar.x, h = iPar.y, w = iPar.z, seed = iPar.w;
        // under snow most blades are buried and the rest stick out short
        vSnow = snowAt(iOff.xz);
        h *= (1.0 - 0.55 * vSnow) * step(vSnow * 0.85, fract(seed * 7.31));
        float t = position.y;
        vec3 dir = vec3(cos(ang), 0.0, sin(ang));
        vec3 side = vec3(-dir.z, 0.0, dir.x);
        // natural lean + wind bend, quadratic along the blade
        vec2 bend = windBend(iOff.xz, seed) + dir.xz * (0.15 + seed * 0.25);
        float k = t * t;
        vec3 p = iOff + side * position.x * w + vec3(0.0, t * h, 0.0);
        p.xz += bend * k * h;
        p.y -= length(bend) * k * h * 0.35;   // keep blade length roughly constant
        vWp = p; vT = t; vSeed = seed; vH = h;
        vGust = gustAt(iOff.xz);
        // stylized normal: mostly the ground normal so the field shades as one surface
        vec3 bladeN = normalize(cross(side, vec3(bend.x, 1.0, bend.y)));
        vN = normalize(mix(iNrm, bladeN, 0.25));
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: COMMON + SHADOW + /* glsl */ `
      uniform vec3 uBase, uTip, uTip2, uSheen;
      varying float vT; varying vec3 vWp; varying vec3 vN; varying float vSeed; varying float vGust; varying float vH; varying float vSnow;
      void main() {
        vec3 n = normalize(vN);
        float patchN = fbm3o(vWp.xz * 0.05);
        vec3 tip = mix(uTip, uTip2, smoothstep(0.35, 0.8, patchN + (vSeed - 0.5) * 0.3));
        vec3 alb = mix(uBase, tip, smoothstep(0.0, 0.9, vT));
        alb = mix(alb, SNOW, vSnow * (1.0 - smoothstep(0.15, 0.6, vT)));
        float sh = treeShadow(vWp, 0.003) * cloudShadowAt(vWp);
        float ndl = dot(n, uSunDir);
        float ao = mix(0.55, 1.0, smoothstep(0.0, 0.7, vT));
        vec3 col = celLight(alb, ndl, sh, ao, 0.25);
        // gust sheen: the field lightens where the wind presses the blades flat
        vec3 vd = normalize(cameraPosition - vWp);
        col += uSheen * uSunColor * vGust * smoothstep(0.4, 1.0, vT) * 0.22 * sh * (1.0 - vSnow);
        // backlit tips glow
        float back = pow(max(dot(-vd, uSunDir), 0.0), 5.0);
        col += uTip2 * uSunColor * back * smoothstep(0.5, 1.0, vT) * 0.4 * sh;
        gl_FragColor = vec4(applyFog(col, vWp), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  // ---- wildflowers: tiny camera-facing discs on a short stem height
  const FL = Math.round(placed / 40);
  const fgeo = new THREE.InstancedBufferGeometry();
  fgeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  fgeo.setIndex([0, 1, 2, 0, 2, 3]);
  const fo = [], fp = [];
  for (let i = 0; i < FL; i++) {
    const j = Math.floor(rnd() * placed);
    // clump flowers into drifts
    const x = off[j * 3] + (rnd() - 0.5) * 0.6, z = off[j * 3 + 2] + (rnd() - 0.5) * 0.6;
    if (fbm(x * 0.04 + 9, z * 0.04, 3) < 0.5 || lawnK(x, z) > 0.2) continue;
    fo.push(x, heightAt(x, z), z);
    fp.push(0.3 + rnd() * 0.45, rnd(), Math.floor(rnd() * 3), rnd());
  }
  fgeo.setAttribute('iOff', new THREE.InstancedBufferAttribute(new Float32Array(fo), 3));
  fgeo.setAttribute('iPar', new THREE.InstancedBufferAttribute(new Float32Array(fp), 4));
  fgeo.instanceCount = fo.length / 3;
  const fmat = new THREE.ShaderMaterial({
    uniforms: flowerU,
    vertexShader: COMMON + /* glsl */ `
      uniform float uFlowers;
      attribute vec3 iOff; attribute vec4 iPar;
      varying vec2 vUv; varying vec3 vWp; varying float vKind; varying float vSeed;
      void main() {
        // uFlowers: the share of flowers in bloom (seasons)
        float on = step(iPar.w, uFlowers) * (1.0 - snowAt(iOff.xz));
        vec3 p = iOff + vec3(0.0, iPar.x, 0.0);
        p.xz += windBend(iOff.xz, iPar.y) * iPar.x;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += position.xy * 0.045 * on;
        vUv = position.xy; vWp = p; vKind = iPar.z; vSeed = iPar.w;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: COMMON + SHADOW + /* glsl */ `
      varying vec2 vUv; varying vec3 vWp; varying float vKind; varying float vSeed;
      void main() {
        float a = atan(vUv.y, vUv.x), r = length(vUv);
        float petals = 0.65 + 0.35 * cos(a * 5.0 + vSeed * 6.0);
        if (r > petals) discard;
        vec3 c = vKind < 0.5 ? vec3(1.0, 0.98, 0.92) : vKind < 1.5 ? vec3(1.0, 0.85, 0.25) : vec3(0.7, 0.6, 1.0);
        if (r < 0.25) c = vec3(1.0, 0.75, 0.2);
        vec3 col = c * (uAmbient + uSunColor * treeShadow(vWp, 0.003) * cloudShadowAt(vWp) * 0.8);
        gl_FragColor = vec4(applyFog(col, vWp), 1.0);
      }`,
  });
  const flowers = new THREE.Mesh(fgeo, fmat);
  flowers.frustumCulled = false;

  return { mesh, flowers, uniforms, flowerUniforms: flowerU, count: placed };
}
