// A small flock crossing the sky: instanced V-shaped silhouettes with flapping wings.
// The flock's line of flight is chosen on the CPU (see main.js) so it crosses the view;
// the shader adds each bird's place in the flock, a slow wander and the wing beat.
import * as THREE from 'three';
import { COMMON } from './glsl.js';
import { mulberry32 } from './tree.js';

export function makeBirds(shared, count = 11) {
  const rnd = mulberry32(5);
  // one bird, nose along +z, wings along x. aW = how far out along the wing (0 body .. 1 tip)
  const P = [], W = [], idx = [];
  const v = (x, y, z, w) => { P.push(x, y, z); W.push(w); return P.length / 3 - 1; };
  const nose = v(0, 0, 0.2, 0), tail = v(0, 0, -0.3, 0), back = v(0, 0.02, -0.03, 0);
  for (const s of [-1, 1]) {
    const elbow = v(0.4 * s, 0.03, 0.04, 0.5), tip = v(0.95 * s, -0.02, -0.12, 1), trail = v(0.36 * s, 0.03, -0.04, 0.45);
    idx.push(nose, elbow, back, back, elbow, trail, elbow, tip, trail, back, trail, tail);
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aW', new THREE.Float32BufferAttribute(W, 1));
  geo.setIndex(idx);
  // place in the flock: loose V behind the leader, plus some stragglers
  const off = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const straggle = rnd() < 0.3;
    const x = straggle ? (rnd() - 0.5) * 10 : side * k * 1.5 + (rnd() - 0.5) * 0.8;
    const z = -k * 1.9 - (straggle ? rnd() * 6 : 0) + (rnd() - 0.5);
    off.set([x, (rnd() - 0.5) * 2.0, z, rnd()], i * 4);
  }
  geo.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 4));
  geo.instanceCount = count;

  const uniforms = {
    ...shared,
    uFlockPos: { value: new THREE.Vector3() },
    uFlockDir: { value: new THREE.Vector3(1, 0, 0) },
    uFlockOn: { value: 0 },
    uScale: { value: 1.3 },
    uInk: { value: new THREE.Color(0.08, 0.08, 0.13) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: COMMON + /* glsl */ `
      uniform vec3 uFlockPos, uFlockDir; uniform float uFlockOn, uScale;
      attribute float aW; attribute vec4 iOff;
      varying vec3 vWp;
      void main() {
        float seed = iOff.w;
        vec3 f = normalize(uFlockDir), r = normalize(cross(vec3(0.0, 1.0, 0.0), f)), u = cross(f, r);
        // wander inside the flock
        vec3 o = iOff.xyz + vec3(sin(uTime * 0.5 + seed * 20.0) * 0.8, sin(uTime * 0.7 + seed * 13.0) * 0.6, sin(uTime * 0.4 + seed * 7.0) * 0.7);
        // wing beat with occasional glides
        float glide = smoothstep(0.55, 0.75, vnoise(vec2(uTime * 0.35, seed * 31.0)));
        float beat = sin(uTime * (8.5 + seed * 2.5) + seed * 6.283);
        float lift = mix(beat * 0.55, 0.12, glide) * aW;      // tips travel furthest
        vec3 lp = position * uScale;
        lp.y += lift * uScale * (0.5 + 0.5 * aW);
        lp.x *= 1.0 - abs(lift) * 0.25;                       // wings fold a little on the stroke
        vec3 wp = uFlockPos + r * o.x + u * o.y + f * o.z + r * lp.x + u * lp.y + f * lp.z;
        wp.y += beat * 0.04 * (1.0 - glide);                  // body bobs with the beat
        vWp = wp;
        gl_Position = uFlockOn > 0.001 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: COMMON + /* glsl */ `
      uniform vec3 uInk; uniform float uFlockOn; varying vec3 vWp;
      void main() {
        vec3 col = uInk + uAmbient * 0.12;
        gl_FragColor = vec4(applyFog(col, vWp), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
