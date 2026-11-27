// Planar lacquer mirrors (DESIGN.md section 6: "planar reflectors for fallboard / music desk in close-ups").
// The env probe cannot show the piano itself, the keys, the hands or the pianist in its own lacquer (refs 7, 8, 12 are
// built on the desk mirroring the hands; the raised lid's underside mirrors the gold interior). So the flat front face of
// the music desk and the flat underside of the main lid carry a three.js Reflector:
//  - the mirror pass re-renders ONLY layer MIRROR_LAYER (the piano group, plus the pianist when present) from the
//    mirrored camera (it inherits the core's jittered, lens-offset camera, so AA, DOF and motion blur stay correct),
//    cleared to alpha 0; where nothing was drawn the shader falls back to the piano's env probe cube in the reflected
//    direction (sky, terrain, lake). No world geometry is re-rendered and the water's own reflection pass never nests.
//  - shading is the clear coat alone: Schlick Fresnel with the shared lacquer F0 x radiance, plus a faint orange-peel
//    ripple of the lookup. The black pigment layer under the coat adds nothing visible.
//  - only the main camera gets a pass; inside other passes (e.g. the other mirror) the face draws the env fallback.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { polygonNormals, ensureCCW } from './util.js';
import { FOLD_DECL_GLSL, FOLD_FN_GLSL, FOLD_UNIFORMS, ENV_GRADE_GLSL, CARD_FN_GLSL } from '../materials.js';

export const MIRROR_LAYER = 7;

const MIRROR_SHADER = {
  name: 'AG.piano.lacquerMirror',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uF0: { value: 0.06 }, uPeel: { value: 0.0005 }, uMirrorOn: { value: 1.0 }, uNormalW: { value: new THREE.Vector3(0, 0, 1) },
    uVc: { value: 0.0 }, agMirHz: { value: new THREE.Vector4(0.0, 1.5, 0.3, 0.061) }, agEnvG: { value: new THREE.Vector4(1.0, 1.0, 0.0, 1.0) }, agEnvTint: { value: new THREE.Vector3(1, 1, 1) },
    tEnv: { value: null }, uEnvOn: { value: 0.0 }, agFoldK: { value: 0.0 }, agFoldLegK: { value: 0.0 }, agFoldNy: { value: new THREE.Vector2(0.45, 0.75) }, agProxy: { value: new THREE.Vector4(0.80, 0.25, 0.0, 0.0) }, agProxyE: { value: new THREE.Vector2(0.07, 1.0) }, agPar: { value: new THREE.Vector4(6.0, 0.0, 0.0, 0.0) }, agParC: { value: new THREE.Vector3() }, agFoldView: { value: 1.0 }, agBackS: { value: 0.6 }, agElevT: { value: 0.061 }, agElevC: { value: 1.0 }, agDbgDir: { value: new THREE.Vector3() }, agLift: { value: 0.0 }, agSunW: { value: new THREE.Vector3(0, 0, -1) },
    agCard: { value: new THREE.Vector4(0, 3, 0.8, 0.06) }, agCard2: { value: new THREE.Vector4() }, agCard3: { value: new THREE.Vector4(1, 0, 0, 0) }, agCardCol: { value: new THREE.Vector3() }, agCardSky: { value: new THREE.Vector3() }, agCardWin: { value: -0.3 }, agMirCard: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv; varying vec3 vW; varying vec3 vP;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vP = position;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform samplerCube tEnv; uniform float uF0, uPeel, uMirrorOn, uEnvOn, uVc; uniform vec3 uNormalW; uniform vec4 agMirHz;
    ${FOLD_DECL_GLSL}${FOLD_FN_GLSL}${ENV_GRADE_GLSL}${CARD_FN_GLSL}
    varying vec4 vUv; varying vec3 vW; varying vec3 vP;
    uint agPcgM(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
    float agH2(vec2 p) { ivec2 i = ivec2(floor(p)); return float(agPcgM(uint(i.x) * 1597334677u ^ agPcgM(uint(i.y) + 0x85EBCA6Bu))) / 4294967295.0; }
    float agVn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(agH2(i), agH2(i + vec2(1, 0)), u.x), mix(agH2(i + vec2(0, 1)), agH2(i + vec2(1, 1)), u.x), u.y); }
    void main() {
      vec3 V = normalize(cameraPosition - vW);
      vec3 N = uNormalW;
      float c = clamp(abs(dot(N, V)), 0.0, 1.0);
      float F = uF0 + (1.0 - uF0) * pow(1.0 - c, 5.0);
      // orange peel: 3-6 mm wavelengths, slope ~0.001 (research/piano.md section 11)
      vec2 q = vP.xy * 160.0, q2 = vP.xy * 330.0 + 7.1;
      vec2 g = vec2(agVn(q + vec2(0.5, 0.0)) - agVn(q - vec2(0.5, 0.0)), agVn(q + vec2(0.0, 0.5)) - agVn(q - vec2(0.0, 0.5)))
             + 0.6 * vec2(agVn(q2 + vec2(0.5, 0.0)) - agVn(q2 - vec2(0.5, 0.0)), agVn(q2 + vec2(0.0, 0.5)) - agVn(q2 - vec2(0.0, 0.5)));
      vec3 env = vec3(0.0);
      if (uEnvOn > 0.5) {
        vec3 R = reflect(-V, N); vec3 Rf = agFold(R, -V, N, vW);
        // cycle 2 (critic c2: desk / fallboard / arm mirrors were black voids in every close-up; refs 7 / 8 / 12 show
        // the sunset, the ridge silhouettes and the lake in them): art-directed horizon per panel. The reflected
        // elevation is re-centred on the panel: agMirHz.w (the glow band) at the panel's mid height uVc, agMirHz.y rad
        // per m of panel height (sky above, ridge, lake below), plus agMirHz.z of the physical elevation (parallax as
        // the camera moves); the azimuth stays the folded backdrop one. Weight agMirHz.x (0 = off)
        if (agMirHz.x > 0.0) {
          float elp = asin(clamp(R.y, -1.0, 1.0));
          float elh = clamp(agMirHz.w + agMirHz.z * (elp - agMirHz.w) + agMirHz.y * (vP.y - uVc), -1.4, 1.4);
          vec3 rn = normalize(Rf); vec2 hz = rn.xz / max(1e-4, length(rn.xz));
          float e = mix(asin(clamp(rn.y, -1.0, 1.0)), elh, agMirHz.x);
          Rf = vec3(hz.x * cos(e), sin(e), hz.y * cos(e));
        }
        env = textureCube(tEnv, Rf).rgb;
        if (agMirHz.x > 0.0) env = agEnvGrade(vec4(env, 1.0)).rgb;
      }
      // cycle 2 session 13: the near reflection card (sunset band over a ridge silhouette, materials.js CARD_FN_GLSL)
      // in the env part; the mirrored hands / keys composite over it below
      if (agMirCard > 0.0 && agCard.x > 0.0) env += agCardRad(vW, reflect(-V, N));
      vec3 col = env;
      if (uMirrorOn > 0.5) {
        vec4 uv = vUv; uv.xy += g * uPeel * uv.w;
        vec4 refl = texture2DProj(tDiffuse, uv);
        col = mix(env, refl.rgb, clamp(refl.a, 0.0, 1.0));
      }
      gl_FragColor = vec4(col * F, 1.0);
    }`,
};

/**
 * A planar mirror over a flat lacquer face.
 *   pts: Array<[u, v]> outline of the face in its plane (any orientation), already inset past the edge fillet
 *   matrix: plane frame -> parent (local X = u, local Y = v, local Z = the face normal, toward the viewer), det +1
 *   opts: { name, width, height, scale, maxDist, f0Uniform, envTexture }
 * Returns { mesh, update(camera, mode) } ('auto' | 'on' | 'off').
 */
export function buildPlanarMirror(pts, matrix, { name = 'mirror', width = 960, height = 540, scale = 0.6, maxDist = 3.5, f0Uniform = null, envTexture = null, foldUniforms = null } = {}) {
  const v2 = pts.map((p) => new THREE.Vector2(p[0], p[1]));
  const tris = THREE.ShapeUtils.triangulateShape(v2, []);
  const pos = new Float32Array(v2.length * 3);
  v2.forEach((v, i) => { pos[3 * i] = v.x; pos[3 * i + 1] = v.y; pos[3 * i + 2] = 0; });
  const idx = [];
  for (const t of tris) {
    const a = v2[t[0]], b = v2[t[1]], c = v2[t[2]];
    const cr = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (cr >= 0) idx.push(t[0], t[1], t[2]); else idx.push(t[0], t[2], t[1]);   // front = +Z
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const mesh = new Reflector(geo, {
    textureWidth: Math.max(64, Math.round(width * scale)), textureHeight: Math.max(64, Math.round(height * scale)),
    clipBias: 0.0002, multisample: 0, shader: MIRROR_SHADER,
  });
  mesh.name = name;
  matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
  const U = mesh.material.uniforms;
  if (f0Uniform) U.uF0 = f0Uniform;                       // shared with the lacquer materials
  if (foldUniforms) for (const k of [...FOLD_UNIFORMS, 'agMirHz', 'agEnvG', 'agEnvTint', 'agEnvUp', 'agCard', 'agCard2', 'agCard3', 'agCardCol', 'agCardSky', 'agCardWin', 'agMirCard', 'agSil', 'agSilW']) if (foldUniforms[k]) U[k] = foldUniforms[k];
  { let lo = Infinity, hi = -Infinity; for (const v of v2) { lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } U.uVc = { value: 0.5 * (lo + hi) }; }   // panel mid height (plane v)
  if (envTexture) { U.tEnv.value = envTexture; U.uEnvOn.value = 1; }

  // mirror pass: main camera only, layer MIRROR_LAYER only, cleared to alpha 0, no scene background
  const reflect = mesh.onBeforeRender;
  const clear = new THREE.Color();
  mesh.isMainCamera = () => true;
  mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    const main = mesh.isMainCamera(camera);
    material.uniforms.uMirrorOn.value = main ? 1.0 : 0.0;
    material.uniformsNeedUpdate = true;
    if (!main) return;
    mesh.getReflectionCamera(camera).layers.set(MIRROR_LAYER);
    renderer.getClearColor(clear); const ca = renderer.getClearAlpha(); const bg = scene.background;
    renderer.setClearColor(0x000000, 0); scene.background = null;
    try { reflect.call(this, renderer, scene, camera, geometry, material, group); } finally { renderer.setClearColor(clear, ca); scene.background = bg; }
  };

  const centreLocal = new THREE.Vector3(); v2.forEach((v) => { centreLocal.x += v.x; centreLocal.y += v.y; }); centreLocal.multiplyScalar(1 / v2.length);
  const tmpC = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpN = new THREE.Vector3(), rot = new THREE.Matrix4();
  return {
    mesh,
    setEnv(tex) { U.tEnv.value = tex; U.uEnvOn.value = tex ? 1 : 0; },
    /** world-space normal + 'auto' visibility from the camera (a pure function of the camera pose). */
    update(camera, mode = 'auto') {
      mesh.updateWorldMatrix(true, false);
      rot.extractRotation(mesh.matrixWorld);
      tmpN.set(0, 0, 1).applyMatrix4(rot).normalize();
      U.uNormalW.value.copy(tmpN);
      if (mode === 'off' || mode === false || !U.uEnvOn.value) { mesh.visible = false; return; }
      if (mode === 'on' || mode === true) { mesh.visible = true; return; }
      if (!camera) { mesh.visible = false; return; }
      tmpC.setFromMatrixPosition(camera.matrixWorld);
      tmpP.copy(centreLocal).applyMatrix4(mesh.matrixWorld);
      const front = tmpC.clone().sub(tmpP).dot(tmpN) > 0.0;
      mesh.visible = front && tmpC.distanceTo(tmpP) < maxDist;
    },
  };
}

/** Inset a closed outline by d (outline in any orientation; returns CCW points). */
export function insetOutline(outline, d) {
  const ccw = ensureCCW(outline);
  const nrm = polygonNormals(ccw);
  return ccw.map((p, i) => [p[0] - nrm[i][0] * nrm[i][2] * d, p[1] - nrm[i][1] * nrm[i][2] * d]);
}

/** Music desk front face. desk = buildCase(...).desk. Plane frame: X = -x, Y = up, Z = -back (toward the player). */
export function buildDeskMirror(desk, opts = {}) {
  const ins = insetOutline(desk.outline, desk.fillet + 0.0006).map(([x, s]) => [-x, s]);
  const Z = desk.back.clone().negate();
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), desk.up.clone(), Z).setPosition(desk.origin.clone().addScaledVector(Z, 0.00015));
  return buildPlanarMirror(ins, m, { name: 'deskMirror', ...opts });
}

/**
 * Open fallboard front face (close-up critic round 1: refs 7, 8, 12 show the keys and the hands mirrored in the
 * fallboard; the env probe cannot). fb = buildCase(...).fallboardInfo. Plane frame: X = -x, Y = up, Z = -z (toward
 * the player), 0.15 mm in front of the face; v is the piano-frame height.
 */
export function buildFallboardMirror(fb, opts = {}) {
  const pts = [[-fb.x1, fb.y0], [-fb.x0, fb.y0], [-fb.x0, fb.y1], [-fb.x1, fb.y1]];
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1))
    .setPosition(0, 0, fb.z - 0.00015);
  return buildPlanarMirror(pts, m, { name: 'fallboardMirror', maxDist: 2.5, ...opts });
}

/**
 * Case-arm inner face above the cheek block (refs 7 / 8: the playing hand mirrored in the treble arm). arm =
 * buildCase(...).armInfo, side 'treble' (face normal -x, toward the keys) or 'bass' (+x). v is the piano-frame height.
 */
export function buildArmMirror(arm, side = 'treble', opts = {}) {
  const tr = side === 'treble';
  const X = tr ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);   // X x Y = Z (det +1)
  const Z = tr ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0);
  const pts = arm.outline.map(([z, y]) => [tr ? z : -z, y]);
  const x = tr ? arm.xTreble - 0.00015 : arm.xBass + 0.00015;
  const m = new THREE.Matrix4().makeBasis(X, new THREE.Vector3(0, 1, 0), Z).setPosition(x, 0, 0);
  return buildPlanarMirror(pts, m, { name: tr ? 'armTrebleMirror' : 'armBassMirror', maxDist: 2.0, ...opts });
}

/**
 * Main lid underside (in lid space: hinge axis at the origin). lid = buildCase(...).lidInfo.
 * Plane frame: X = x, Y = z, Z = -y (down), 0.15 mm below the underside.
 */
export function buildLidMirror(lid, opts = {}) {
  const ins = insetOutline(lid.plan, lid.filletBot + 0.0008).map(([x, z]) => [x - lid.hx, z]);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0))
    .setPosition(0, lid.undersideY - 0.00015, 0);
  return buildPlanarMirror(ins, m, { name: 'lidMirror', maxDist: 16, ...opts });
}
