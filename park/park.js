// #051 Duo in the park: Sorairo's hillside (../random-sketches/vibes/sorairo: sky, tree,
// grass, birds, contrail, light shafts and its painterly post) around #038's duo.
//
// The two scenes keep their own units: the park in metres, the duo in centimetres. They
// are drawn with two cameras that are the same camera at two scales (the park's at the
// duo camera's place, turned and moved onto the lawn, its near and far planes 1/100 of
// the duo camera's, or scale/100 with `scale`), so a point of either lands on the same pixel at the same depth and
// both draw into one image and one depth buffer, which the post chain then paints over:
// grass in front of a foot hides it, the piano hides the hill behind it.
// The duo casts into the park's sun shadow map (grass and ground darken under the
// piano), drawn the same way with the shadow camera at the duo's scale.
//
//   const park = await createPark(renderer, { time, style })
//   each frame: park.update(dt, duoCamera); park.render(duoScene, duoCamera)
//   park.sun: the sun's direction in the duo's frame, its colour, the ambient, for the duo's lights
import * as THREE from 'three';
import { makeShared } from './glsl.js';
import { makeSky } from './sky.js';
import { makeTerrain, makeMountains, makePoles, heightAt, LAWN } from './world.js';
const LAWN_R = LAWN.r, LAWN_BLEND = LAWN.blend;
import { makeTree, TREE_STYLES, mulberry32 } from './tree.js';
import { makeGrass } from './grass.js';
import { makePost } from './post.js';
import { makeBirds } from './birds.js';
import { makeLiveAudio } from './audio.js';

export { TREE_STYLES };
// the duo's centimetres to the park's metres, at scale 1 (see createPark's `scale`)
const CM1 = 0.01;

// time-of-day keyframes, Sorairo's (main.js), colours in sRGB
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const PRESETS = [
  { name: 'Noon', sunEl: 62, zenith: C('#1d5ad6'), mid: C('#4a92ee'), horizon: C('#c4e5ff'), sun: C('#fff3df', 3.1), ambient: C('#93b5ff', 0.62), fog: C('#b9d9fb'), fogSun: C('#fff1d8'), cloudLit: C('#ffffff', 1.25), cloudShade: C('#94a8da'), cloudRim: C('#fff6e0'), disc: C('#fffaf0', 30), discSize: 0.99985, glow: 1, stars: 0, exposure: 1.0, shafts: 0.45, flare: 0.55, lift: C('#0a1638'), gain: C('#fffaf2'), sat: 1.18, fogK: 1 },
  { name: 'Afternoon', sunEl: 30, zenith: C('#2056c8'), mid: C('#5799e8'), horizon: C('#d3e8f8'), sun: C('#fff0cf', 3.0), ambient: C('#88a9f2', 0.56), fog: C('#c6dcf1'), fogSun: C('#ffe8c0'), cloudLit: C('#fff9ee', 1.2), cloudShade: C('#8797cb'), cloudRim: C('#ffeccc'), disc: C('#fff6e0', 26), discSize: 0.99985, glow: 1, stars: 0, exposure: 1.0, shafts: 0.6, flare: 0.7, lift: C('#0c1434'), gain: C('#fff8ee'), sat: 1.18, fogK: 1 },
  { name: 'Golden hour', sunEl: 9, zenith: C('#2a4fa2'), mid: C('#7f92d4'), horizon: C('#ffd09a'), sun: C('#ffb26a', 2.8), ambient: C('#8187cc', 0.5), fog: C('#ebc6aa'), fogSun: C('#ffbf78'), cloudLit: C('#ffd8a6', 1.15), cloudShade: C('#7b70aa'), cloudRim: C('#ffb070'), disc: C('#fff0c0', 24), discSize: 0.9998, glow: 1.2, stars: 0, exposure: 1.0, shafts: 1.0, flare: 1.0, lift: C('#1c0f34'), gain: C('#fff2e2'), sat: 1.15, fogK: 1 },
  { name: 'Magic hour', sunEl: 1.8, zenith: C('#1b2368'), mid: C('#7b4e9f'), horizon: C('#ff906c'), sun: C('#ff7c4c', 1.7), ambient: C('#6c5cab', 0.5), fog: C('#c88ca2'), fogSun: C('#ff9a6a'), cloudLit: C('#ffa07c', 1.1), cloudShade: C('#4b3b82'), cloudRim: C('#ff8a50'), disc: C('#ffd0a0', 14), discSize: 0.9997, glow: 1.3, stars: 0.15, exposure: 1.05, shafts: 1.2, flare: 0.8, lift: C('#200c38'), gain: C('#fff0e8'), sat: 1.12, fogK: 1.1 },
  { name: 'Night', sunEl: 38, zenith: C('#040a25'), mid: C('#0c1a45'), horizon: C('#24375f'), sun: C('#a3b8ff', 0.4), ambient: C('#2c3f80', 0.3), fog: C('#1c2b52'), fogSun: C('#3b5082'), cloudLit: C('#3c4a7c'), cloudShade: C('#121a38'), cloudRim: C('#a0b2e2'), disc: C('#eef2ff', 7), discSize: 0.99975, glow: 0.35, stars: 1, exposure: 1.3, shafts: 0.3, flare: 0.25, lift: C('#040a20'), gain: C('#e6eeff'), sat: 0.85, fogK: 1 },
  { name: 'Dawn', sunEl: 1.5, zenith: C('#22306e'), mid: C('#7482c2'), horizon: C('#ffcab4'), sun: C('#ffb894', 1.6), ambient: C('#7c88cc', 0.52), fog: C('#bdb8da'), fogSun: C('#ffc4a6'), cloudLit: C('#ffc8bc', 1.1), cloudShade: C('#5e629e'), cloudRim: C('#ffb898'), disc: C('#ffe4c8', 16), discSize: 0.9997, glow: 1.1, stars: 0.12, exposure: 1.05, shafts: 1.1, flare: 0.8, lift: C('#141a42'), gain: C('#f4f2ff'), sat: 1.04, fogK: 2.4 },
  { name: 'Morning', sunEl: 16, zenith: C('#2460d0'), mid: C('#6aa6ec'), horizon: C('#dbeefb'), sun: C('#fff3da', 2.9), ambient: C('#8fb4f2', 0.58), fog: C('#cde2f6'), fogSun: C('#fff0d8'), cloudLit: C('#ffffff', 1.2), cloudShade: C('#8ea3d6'), cloudRim: C('#fff2dc'), disc: C('#fffaf0', 26), discSize: 0.99985, glow: 1.05, stars: 0, exposure: 1.0, shafts: 0.75, flare: 0.75, lift: C('#0c1636'), gain: C('#f8fbff'), sat: 1.15, fogK: 1.5 },
];
export const TIMES = PRESETS.map((p, i) => [i, p.name]);
const DAY_T = PRESETS.length;
function samplePreset(t) {
  t = ((t % DAY_T) + DAY_T) % DAY_T;
  const i = Math.floor(t), f = THREE.MathUtils.smoothstep(t - i, 0, 1);
  const a = PRESETS[i], b = PRESETS[(i + 1) % DAY_T], o = {};
  for (const k in a) { if (k === 'name') continue; o[k] = a[k].isColor ? a[k].clone().lerp(b[k], f) : a[k] + (b[k] - a[k]) * f; }
  if (t > 3 && t <= 4) o.sunEl = t < 3.5 ? THREE.MathUtils.lerp(1.8, -6, (t - 3) * 2) : THREE.MathUtils.lerp(-6, 38, (t - 3.5) * 2);
  else if (t > 4 && t < 5) o.sunEl = t < 4.5 ? THREE.MathUtils.lerp(38, -6, (t - 4) * 2) : THREE.MathUtils.lerp(-6, PRESETS[5].sunEl, (t - 4.5) * 2);
  o.night = THREE.MathUtils.smoothstep(t, 3.2, 3.9) * (1 - THREE.MathUtils.smoothstep(t, 4.1, 4.8));
  return o;
}
const SUMMER_GROUND = ['#1f4a2a', '#4e9a3c', '#98c54e', '#24502b', '#4f8f34'].map((h) => C(h));
const DIRT = C('#b49a74');

export async function createPark(renderer, { time = 1.4, style = 'summer', azimuth = 55, clouds = 0.5, wind = 1.2, seed = 7, grassCount = 120000, paint = 2.5, scale = 1 } = {}) {
  // `scale`: the park's size against the duo's. At 0.5 the tree, hill, grass and poles are
  // half as big around the two as they are, who stay as they are: the park is drawn as it
  // is in its metres and the duo is mapped into it at 1/scale (2 cm of the park a cm), its
  // lawn and its place on it widened with it.
  const CM = CM1 / scale;
  LAWN.r = LAWN_R / scale; LAWN.blend = LAWN_BLEND / scale;
  const S = { time, style, azimuth, clouds, towers: 1, wind, windDir: 30, paint, bloom: 0.55, birds: true, contrail: true, ambience: 0.7 };
  const shared = makeShared();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 8000);
  const sky = makeSky(shared); scene.add(sky.mesh);
  const terrain = makeTerrain(shared); scene.add(terrain.mesh);
  const mountains = makeMountains(shared); scene.add(mountains.group);
  const poles = makePoles(shared); scene.add(poles.group);
  poles.proxies.forEach(([p, ax], i) => { terrain.mat.uniforms.uPoles.value[i].copy(p); terrain.mat.uniforms.uPoleBars.value[i].copy(ax); });
  const GROUND = heightAt(0, 0);
  const grass = makeGrass(shared, { count: grassCount });
  scene.add(grass.mesh, grass.flowers);
  const tree = makeTree(shared, GROUND, seed, { fallCount: 420, airy: 1, turned: 0.5 });
  scene.add(tree.group); tree.setStyle(style);
  { const u = terrain.mat.uniforms; u.uTrunk.value.copy(tree.proxy.trunk); u.uCanopy.value.copy(tree.proxy.canopy); u.uCanopyY.value = tree.proxy.canopyY; }
  const birds = makeBirds(shared); scene.add(birds.mesh);
  grass.uniforms.uBase.value.copy(SUMMER_GROUND[0]); grass.uniforms.uTip.value.copy(SUMMER_GROUND[1]); grass.uniforms.uTip2.value.copy(SUMMER_GROUND[2]);
  grass.uniforms.uSheen.value = C('#f4ffc8');
  terrain.mat.uniforms.uGrassDark.value.copy(SUMMER_GROUND[3]); terrain.mat.uniforms.uGrassLight.value.copy(SUMMER_GROUND[4]); terrain.mat.uniforms.uDirt.value = DIRT.clone();

  // ── The duo's frame on the lawn: its origin (where he stands) at the lawn's centre, a
  // little forward, its +z (toward the audience) away from the tree, toward the hillside view
  const away = new THREE.Vector2(LAWN.x, LAWN.z).normalize();
  const yaw = Math.atan2(away.x, away.y);
  // (the piano is upstage on his right, its middle about 1 m left of him and 0.8 m behind:
  // the lawn centred between them)
  const origin = new THREE.Vector3(LAWN.x, LAWN.y, LAWN.z).add(new THREE.Vector3(1.0, 0, 0.8).divideScalar(scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), qYawInv = qYaw.clone().invert();
  /** A point of the duo's frame (cm) in the park (m), and back. */
  const toPark = (v, out = new THREE.Vector3()) => out.copy(v).multiplyScalar(CM).applyQuaternion(qYaw).add(origin);
  const toDuo = (v, out = new THREE.Vector3()) => out.copy(v).sub(origin).applyQuaternion(qYawInv).divideScalar(CM);
  const dirToDuo = (v, out = new THREE.Vector3()) => out.copy(v).applyQuaternion(qYawInv);

  // ── Shadows: Sorairo's sun map (the tree and poles cast), and the duo cast into it
  const SHADOW_RES = 2048;
  const shadowRT = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, { depthTexture: new THREE.DepthTexture(SHADOW_RES, SHADOW_RES, THREE.FloatType), depthBuffer: true });
  const shadowCam = new THREE.OrthographicCamera(-26, 26, 26, -26, 1, 110);
  const duoShadowCam = new THREE.OrthographicCamera(-26 / CM, 26 / CM, 26 / CM, -26 / CM, 1 / CM, 110 / CM);
  const shadowBasic = new THREE.MeshBasicMaterial();
  shared.uShadowMap.value = shadowRT.depthTexture;
  function renderShadow(duoScene) {
    const target = new THREE.Vector3(0, GROUND + 5, 0);
    shadowCam.position.copy(target).addScaledVector(shared.uSunDir.value, 60);
    shadowCam.up.set(0, 1, 0); if (Math.abs(shared.uSunDir.value.y) > 0.98) shadowCam.up.set(0, 0, 1);
    shadowCam.lookAt(target); shadowCam.updateMatrixWorld(); shadowCam.updateProjectionMatrix();
    shared.uShadowMatrix.value.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);
    const swapped = [];
    scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints) || !o.visible) return;
      if (o.userData.castShadow) { swapped.push([o, o.material, true]); o.material = o.userData.shadowMat || shadowBasic; }
      else { swapped.push([o, null, false]); o.visible = false; }
    });
    renderer.setRenderTarget(shadowRT); renderer.setClearColor(0xffffff, 1); renderer.clear();
    renderer.render(scene, shadowCam);
    for (const [o, m, c] of swapped) { if (c) o.material = m; else o.visible = true; }
    if (duoScene) {
      // the same orthographic camera at the duo's scale: the same depth for the same point
      toDuo(shadowCam.position, duoShadowCam.position)
      duoShadowCam.quaternion.copy(qYawInv).multiply(shadowCam.quaternion)
      duoShadowCam.updateMatrixWorld()
      const bg = duoScene.background, ov = duoScene.overrideMaterial, au = renderer.shadowMap.autoUpdate
      duoScene.background = null; duoScene.overrideMaterial = shadowBasic; renderer.shadowMap.autoUpdate = false
      renderer.render(duoScene, duoShadowCam)
      duoScene.background = bg; duoScene.overrideMaterial = ov; renderer.shadowMap.autoUpdate = au
    }
  }

  // ── Post: Sorairo's chain, sized as the renderer
  const post = makePost(renderer);
  const size = new THREE.Vector2();
  function setSize() {
    renderer.getSize(size)
    post.setSize(size.x, size.y, renderer.getPixelRatio())
    camera.aspect = size.x / size.y; camera.updateProjectionMatrix()
  }
  setSize()

  // ── Fly-overs (Sorairo's): a flock and an airliner cross wherever the camera looks
  const view = new THREE.Vector3();
  const viewAzimuth = () => { camera.getWorldDirection(view); view.y = 0; return view.lengthSq() > 1e-6 ? view.normalize() : view.set(0, 0, -1); };
  const BIRD_P = 55, BIRD_O = BIRD_P - 9, BIRD_SPEED = 8, BIRD_HALF = 90;
  let birdCycle = -1;
  const flockC = new THREE.Vector3(), flockDir = new THREE.Vector3();
  function updateBirds(t, on) {
    const c = Math.floor((t + BIRD_O) / BIRD_P), tau = (t + BIRD_O) - c * BIRD_P;
    if (c !== birdCycle) {
      birdCycle = c;
      const r = mulberry32(c * 7919 + 1), f = viewAzimuth(), side = new THREE.Vector3(-f.z, 0, f.x), ahead = 45 + r() * 50;
      flockDir.copy(side).multiplyScalar(r() < 0.5 ? 1 : -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.9);
      flockC.copy(camera.position).addScaledVector(f, ahead).addScaledVector(side, (r() - 0.5) * ahead * 0.4);
      flockC.y = Math.max(camera.position.y, GROUND) + 5 + r() * 7;
    }
    const s = tau * BIRD_SPEED - BIRD_HALF;
    birds.uniforms.uFlockPos.value.copy(flockC).addScaledVector(flockDir, s);
    birds.uniforms.uFlockPos.value.y += Math.sin(tau * 0.4) * 1.5;
    birds.uniforms.uFlockDir.value.copy(flockDir);
    birds.uniforms.uFlockOn.value = on && s < BIRD_HALF ? 1 : 0;
  }
  const TRAIL_P = 130, TRAIL_O = 46, TRAIL_SPEED = 0.022;
  let trailCycle = -1;
  function updateContrail(t, on) {
    const c = Math.floor((t + TRAIL_O) / TRAIL_P), tau = (t + TRAIL_O) - c * TRAIL_P, u = sky.uniforms;
    if (c !== trailCycle) {
      trailCycle = c;
      const r = mulberry32(c * 104729 + 3), f = viewAzimuth();
      const az = (r() - 0.5) * 1.0, el = THREE.MathUtils.degToRad(25 + r() * 30);
      const fh = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), az);
      const Cp = fh.clone().multiplyScalar(Math.cos(el)).setY(Math.sin(el)).normalize();
      const across = new THREE.Vector3(-fh.z, 0, fh.x).multiplyScalar(r() < 0.5 ? 1 : -1);
      const upT = new THREE.Vector3().crossVectors(Cp, across).normalize();
      const tangent = across.clone().sub(Cp.clone().multiplyScalar(across.dot(Cp))).normalize().addScaledVector(upT, (r() - 0.5) * 0.8).normalize();
      u.uTrailRef.value.copy(Cp); u.uTrailAxis.value.crossVectors(Cp, tangent).normalize();
    }
    u.uTrailHead.value = -1.2 + tau * TRAIL_SPEED;
    u.uTrailLen.value = Math.min(tau * TRAIL_SPEED, 0.9);
    u.uTrailOn.value = on ? THREE.MathUtils.smoothstep(TRAIL_P - tau, 0, 12) : 0;
  }

  // ── Ambience: Sorairo's wind, songbirds and insects (its music off), on its own audio context
  const sound = makeLiveAudio();

  // ── The light, for the duo's own lights: the sun's direction in the duo's frame (toward
  // the sun), its colour and the ambient, linear, as Sorairo's celLight reads them
  const sun = { dir: new THREE.Vector3(0, 1, 0), color: new THREE.Color(), ambient: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), ground: new THREE.Color(), night: 0, changed: 0 };
  let lastLook = '';
  const tmp = new THREE.Vector3();
  function applyLook() {
    const P = samplePreset(S.time);
    const el = THREE.MathUtils.degToRad(P.sunEl), az = THREE.MathUtils.degToRad(S.azimuth + (P.night > 0.5 ? 140 : 0));
    const sd = shared.uSunDir.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
    const lightK = THREE.MathUtils.smoothstep(P.sunEl, -4, 2);
    if (sd.y < 0.02) sd.y = 0.02; sd.normalize();
    shared.uSunColor.value.copy(P.sun).multiplyScalar(lightK);
    shared.uAmbient.value.copy(P.ambient);
    shared.uFogColor.value.copy(P.fog); shared.uFogSunColor.value.copy(P.fogSun);
    shared.uFogDensity.value = 0.0009 * P.fogK;
    shared.uCloudCover.value = THREE.MathUtils.clamp(S.clouds, 0, 1);
    shared.uCloudShadow.value = 0.55 * lightK * (1 - P.night * 0.6);
    const wa = THREE.MathUtils.degToRad(S.windDir);
    shared.uWind.value.set(Math.cos(wa), Math.sin(wa)).multiplyScalar(S.wind);
    const u = sky.uniforms;
    u.uZenith.value.copy(P.zenith); u.uMid.value.copy(P.mid); u.uHorizon.value.copy(P.horizon);
    u.uCloudLit.value.copy(P.cloudLit); u.uCloudShade.value.copy(P.cloudShade); u.uCloudRim.value.copy(P.cloudRim);
    u.uDiscColor.value.copy(P.disc).multiplyScalar(lightK); u.uDiscSize.value = P.discSize; u.uGlow.value = P.glow * lightK; u.uStars.value = P.stars;
    u.uTowers.value = S.towers;
    updateBirds(shared.uTime.value, S.birds && P.night < 0.5 && lightK > 0.3);
    updateContrail(shared.uTime.value, S.contrail && P.night < 0.5);
    birds.uniforms.uInk.value.copy(P.cloudShade).multiplyScalar(0.18);
    // sun on screen, for the shafts and the flare
    tmp.copy(sd).multiplyScalar(4000).add(camera.position).project(camera);
    const onScreen = tmp.z < 1 && Math.abs(tmp.x) < 1.3 && Math.abs(tmp.y) < 1.3 ? 1 : 0;
    const edge = THREE.MathUtils.smoothstep(1.3 - Math.max(Math.abs(tmp.x), Math.abs(tmp.y)), 0, 0.4);
    const sunOn = onScreen * edge * lightK;
    const sunUv = new THREE.Vector2(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);
    post.light.uniforms.uSun.value.copy(sunUv); post.light.uniforms.uSunOn.value = sunOn;
    post.light.uniforms.uColor.value.copy(P.sun).multiplyScalar(0.25 * lightK); post.light.uniforms.uStrength.value = P.shafts;
    const inside = Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1 ? 1 : 0;
    post.grade.uniforms.uSun.value.copy(sunUv); post.grade.uniforms.uSunOn.value = sunOn * inside;
    post.grade.uniforms.uFlare.value = P.flare; post.grade.uniforms.uFlareColor.value.copy(P.sun).multiplyScalar(0.35);
    post.grade.uniforms.uExposure.value = P.exposure; post.grade.uniforms.uSat.value = P.sat;
    post.grade.uniforms.uLift.value.copy(P.lift); post.grade.uniforms.uGain.value.copy(P.gain);
    post.final.uniforms.uPaper.value = 1; post.final.uniforms.uVignette.value = 1;
    // for the duo's lights
    dirToDuo(sd, sun.dir); sun.color.copy(shared.uSunColor.value); sun.ambient.copy(P.ambient)
    sun.sky.copy(P.zenith).lerp(P.mid, 0.5); sun.horizon.copy(P.horizon); sun.ground.copy(SUMMER_GROUND[4]).multiply(P.ambient).multiplyScalar(0.6)
    sun.night = P.night
    const key = `${S.time.toFixed(2)}`
    if (key !== lastLook) { lastLook = key; sun.changed++ }
    sound.update({ day: 1 - P.night, night: P.night, dusk: THREE.MathUtils.smoothstep(S.time, 1.6, 2.4) * (1 - THREE.MathUtils.smoothstep(S.time, 3.3, 3.8)),
      wind: S.wind, leaves: 1, birdsK: 1, insects: 1, rain: 0, trail: u.uTrailOn.value, flock: birds.uniforms.uFlockOn.value, music: 0, amb: S.ambience }, shared.uTime.value)
  }

  /** The park camera from the duo's: the same view, in metres, held above the ground (the duo camera too). */
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion()
  function syncCamera(duoCam) {
    toPark(duoCam.position, _p)
    const gy = heightAt(_p.x, _p.z) + 0.3
    if (_p.y < gy) { _p.y = gy; toDuo(_p, duoCam.position); duoCam.updateMatrixWorld() }
    camera.position.copy(_p)
    camera.quaternion.copy(qYaw).multiply(duoCam.getWorldQuaternion(_q))
    camera.fov = duoCam.fov; camera.aspect = duoCam.aspect; camera.zoom = duoCam.zoom
    camera.near = duoCam.near * CM; camera.far = duoCam.far * CM
    camera.updateProjectionMatrix(); camera.updateMatrixWorld()
  }

  function update(dt, duoCam) {
    shared.uTime.value += dt
    shared.uCloudT.value += dt
    if (duoCam) syncCamera(duoCam)
    applyLook()
  }
  function render(duoScene, duoCam) {
    renderShadow(duoScene)
    const au = renderer.autoClear
    renderer.autoClear = false
    post.render(scene, camera, {
      bloom: S.bloom, paint: Math.min(6, S.paint * renderer.getPixelRatio()),
      extra: () => { const bg = duoScene.background; duoScene.background = null; renderer.render(duoScene, duoCam); duoScene.background = bg },
    })
    post.final.uniforms.uTime.value = shared.uTime.value
    renderer.autoClear = au
  }
  applyLook()
  return {
    scene, camera, shared, S, sun, origin, yaw, LAWN, toPark, toDuo, heightAt, scale, CM,
    setTime(t) { S.time = t; applyLook() },
    setStyle(s) { S.style = s; tree.setStyle(s) },
    setSize, update, render, sound, tree, grass,
    /** A point of the park (m) as the duo's camera sees it (cm). */
    viewFrom(parkPos, parkTarget) { return [toDuo(new THREE.Vector3(...parkPos)), toDuo(new THREE.Vector3(...parkTarget))] },
    treeAt: toDuo(new THREE.Vector3(0, GROUND, 0)),
  }
}
