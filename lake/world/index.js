// midiviz: Afterglow's world module (https://github.com/Leonxlnx/afterglow, scene/src/world/, commit ced1038, MIT,
// LICENSE beside it), with two local changes: prepareFrame's `env` option and setSize. See lake/README.md.
// WORLD module: sky, clouds, terrain, shores, boulders, mist, water, lake bed.
//
//   const world = await create(ctx)      ctx = { renderer, width, height, quality?, options?: { world: {...} } }
//   scene.add(world.group)
//   per output frame : world.prepareFrame(t, { camera, frame })   (frame-centre camera, before any lens/jitter)
//   per sub-frame    : world.update(t_k, { k, N, frame, camera })  (t_k = the sub-frame's shutter time)
//   world.envMap     : PMREM environment (sky + distant terrain + mirror lake) for other modules' IBL
//   world.skyCube    : sky + clouds cube (scene-linear);  world.envCube: the raw env capture (before PMREM)
//   world.glowLight  : { direction, irradiance, radiance } of the horizon glow (for art-directed kickers / rims)
//   world.setRippleEvents([{ t, x, z | pos: [x, 0, z], amp, wavelength?, space? }], { space = 'rig' })
//       film time (s), positions in the RIG frame by default ('piano': X treble / Y tail; 'world'); re-projected
//       through ctx.rigGroup every frame (per-shot yaw cheats keep the rings at the legs)
//   world.setEmitters([{ x, z, amp, wavelength, radius, phase, space? }], { space = 'rig' })   continuous micro-rings
//   world.setSunElevation(deg | null)                        null = follow the film's time arc (params.sunKeys)
//
// Everything is a pure function of t (no state carried between frames; the glossy reflection is prefiltered).
// See docs/WORLD.md for the parameters, the look targets and the measured scores.
import * as THREE from 'three';
import { WORLD_DEFAULTS, mergeParams } from './params.js';
import { SkySystem, ENV_LAYER } from './sky.js';
import { makeHeightField, makeTerrain, buildTerrainGeometry } from './terrain.js';
import { makeBoulders } from './boulders.js';
import { makeWater, defaultRippleEvents, omegaOf, groupSpeed, MAX_EVENTS, MAX_EMITTERS } from './water.js';
import { displayHexToScene, piecewise, halton } from './util.js';

export { WORLD_DEFAULTS, ENV_LAYER };

/** world xz of a point given in the physical piano frame (X treble = pianist's right, Y toward the tail) */
export function pianoToWorld(X, Y, rigYawDeg = 120, origin = [0, 0]) {
  const face = rigYawDeg - 60;                    // rig yaw 120 deg <=> the pianist faces A = +60 deg
  const [fx, fz] = azDir(face), [rx, rz] = azDir(face + 90);
  return [origin[0] + X * rx + Y * fx, origin[1] + X * rz + Y * fz];
}

/**
 * Ripple events from the performance solver (build/anim/perf.json 'ripples', docs/PERFORMANCE.md section 2:
 * [{ t (film s), m (music s), pos: [x, 0, z] in the RIG frame (m), amp (m, ~0.15-1.2 mm), src }]) -> world events.
 * Conversion (docs/WORLD.md section 1):
 *   t        film time as is;   position: rig frame as is (space 'rig': re-projected through ctx.rigGroup every frame,
 *            so the rings stay at the legs across per-shot rig-yaw cheats)
 *   amp      x gain (the solver's physical estimate -> the packet height the ring look was tuned with on the refs)
 *   lambda   short packets in shortLambda (Halton per event); the right foot (src 'foot*') footLambda
 *   long     lyre / leg events with amp >= longAmp also launch a long ring (longLambda, amp x gain x longGain): the flat
 *            concentric ellipses of the low shots (bass downbeats)
 */
export function rippleEventsFromPerf(ripples, o = {}) {
  const gain = o.gain ?? 6, longAmp = o.longAmp ?? 0.0005, longGain = o.longGain ?? 1.6;
  const SL = o.shortLambda ?? [0.09, 0.15], FL = o.footLambda ?? [0.07, 0.10], LL = o.longLambda ?? [0.35, 0.75];
  const out = [];
  (ripples || []).forEach((r, i) => {
    if (!r || !Number.isFinite(r.t)) return;
    const x = r.pos ? r.pos[0] : (r.x ?? 0), z = r.pos ? r.pos[2] : (r.z ?? 0), a = r.amp ?? 0.0003;
    const foot = /^foot/i.test(r.src ?? '');
    const L = foot ? FL : SL;
    out.push({ t: r.t, x, z, space: 'rig', src: r.src, kind: 'perf', amp: a * gain, wavelength: L[0] + (L[1] - L[0]) * halton(i + 1, 3) });
    if (!foot && a >= longAmp) out.push({ t: r.t + 0.03, x, z, space: 'rig', src: r.src, kind: 'perfLong', amp: a * gain * longGain, wavelength: LL[0] + (LL[1] - LL[0]) * halton(i + 1, 5) });
  });
  return out;
}

export async function create(ctx) {
  const renderer = ctx.renderer;
  let W_px = ctx.width ?? 1920, H_px = ctx.height ?? 1080;
  const userOpts = ctx.options?.world ?? ctx.world ?? {};
  const P = mergeParams(WORLD_DEFAULTS, userOpts);
  // bake sizes by quality (explicit options win): previews stay cheap, finals get full-resolution reflections
  const ub = userOpts.bake ?? {};
  const q = ctx.quality ?? 'final';
  const QB = P.bake.byQuality?.[q] ?? {};
  for (const k of ['reflScale', 'cubeSize', 'envSize', 'viewScale']) if (ub[k] === undefined && QB[k] !== undefined) P.bake[k] = QB[k];

  const group = new THREE.Group(); group.name = 'AG.world';
  const sky = new SkySystem(renderer, P, { width: W_px, height: H_px });
  const SU = sky.uniforms;

  // uniforms shared by every world shader (same objects: one update reaches all materials)
  const shared = {
    tSkyLUT: SU.tSkyLUT, uSkyLUTSize: SU.uSkyLUTSize, uSunDir: SU.uSunDir, uSunElevRad: SU.uSunElevRad, uArch: SU.uArch,
    uGainBase: SU.uGainBase, uGainGlow: SU.uGainGlow, uGlowW: SU.uGlowW, uGlowH: SU.uGlowH, uBelowFade: SU.uBelowFade, uCore: SU.uCore,
    uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) },
    uHazeDensity: { value: P.haze.density }, uHazeH: { value: P.haze.scaleHeight }, uHazeElev: { value: P.haze.elevDeg }, uHazeElevSun: { value: P.haze.elevSunDeg ?? P.haze.elevDeg }, uValleyWarm: { value: P.haze.valleyWarm ?? 1 },
    uHazeFar: { value: P.haze.farKm }, uHazeGain: { value: new THREE.Vector3(...P.haze.gain) }, uHazeStart: { value: P.haze.startM },
    uHaze2Density: { value: P.haze.density2 }, uHaze2H: { value: P.haze.scaleHeight2 }, uHaze2Start: { value: P.haze.start2M ?? 0 },
    uHazeGain2: { value: new THREE.Vector3(...(P.haze.gain2 ?? P.haze.gain)) },
    uHazeAnti: { value: new THREE.Vector4(...(P.haze.antiTint ?? [1, 1, 1, 15])) },   // fix round 2: in-scatter tint beyond |A| w (+25 deg): navy anti-sun shadows
    uHazePhase: { value: P.haze.phase }, uHazePhaseW: { value: P.haze.phaseWidthDeg }, uHazePhaseBase: { value: P.haze.phaseBase ?? 1.0 },
    uMistColor: { value: new THREE.Vector3(...displayHexToScene(P.mist.color, P.exposure)) },
    uMistColorSun: { value: new THREE.Vector3(...displayHexToScene(P.mist.colorSun, P.exposure)) },
    uMistDensity: { value: P.mist.density }, uMistH: { value: P.mist.height },
    uMistStart: { value: P.mist.startM }, uMistFull: { value: P.mist.fullM },
    uMistFade: { value: new THREE.Vector2(P.mist.colorFadeHeight ?? 40, P.mist.colorFadeTo ?? 1.0) },
    uPixelAngleT: { value: 0.0004 }, uDarkFloor: { value: new THREE.Vector3(...P.terrain.darkFloor) },
    uMirrorRefl: { value: P.bake.envMirrorRefl ?? 0.85 },    // reflectance of the lake for the env-only mirror copies
  };

  group.add(sky.dome);
  const heightAt = makeHeightField(P.terrain);
  const terrain = makeTerrain(P, shared, heightAt);
  group.add(terrain.mesh);
  const boulders = makeBoulders(P, shared, heightAt);
  group.add(boulders.group);
  const { water, uniforms: WU } = makeWater(P, shared, { width: W_px, height: H_px, reflScale: P.bake.reflScale });
  group.add(water);

  // ---- environment capture (sky + terrain + boulders + their mirror images + mirror lake) -> PMREM
  const envCubeRT = new THREE.WebGLCubeRenderTarget(P.bake.envSize, { type: THREE.HalfFloatType, generateMipmaps: false });
  const envCam = new THREE.CubeCamera(1, 90000, envCubeRT);
  envCam.position.set(...P.bake.envPos);
  for (const c of envCam.children) c.layers.set(ENV_LAYER);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  // the lake in the capture: the dome draws a Fresnel mirror of the sky cube below the horizon; the terrain and the
  // boulders get mirror copies (scale.y = -1, ENV_LAYER only: never seen by the main or the reflection cameras), so
  // the env shows the dark mirrored ridges right below the horizon, as the real Reflector does
  const envMirror = new THREE.Group(); envMirror.name = 'AG.world.envMirror'; envMirror.scale.y = -1;
  let envTm = null;
  {
    const tm = new THREE.Mesh(terrain.mesh.geometry, terrain.mesh.material); envTm = tm;
    tm.frustumCulled = false; tm.layers.set(ENV_LAYER); envMirror.add(tm);
    for (const m of boulders.group.children) {
      if (!m.isInstancedMesh) continue;
      const bm = new THREE.InstancedMesh(m.geometry, m.material, m.count);
      bm.instanceMatrix = m.instanceMatrix; bm.frustumCulled = false; bm.layers.set(ENV_LAYER); envMirror.add(bm);
    }
  }
  envMirror.layers.set(ENV_LAYER);
  group.add(envMirror);

  // ---- ripple sources. Events and emitters are given in the RIG frame by default (DESIGN.md section 4: perf.json
  // ripples carry rig-frame positions), or space 'piano' (physical X = treble, Y = toward the tail) or 'world'; they
  // are re-projected every output frame through ctx.rigGroup.matrixWorld, so rings stay at the legs across per-shot
  // rig-yaw cheats. Standalone (no core) the rig sits at the origin with the base yaw 120 deg.
  const _v = new THREE.Vector3();
  const RIG_YAW = 120 * Math.PI / 180;
  const rigToWorld = (x, z) => {
    if (ctx.rigGroup) { _v.set(x, 0, z).applyMatrix4(ctx.rigGroup.matrixWorld); return [_v.x, _v.z]; }
    const c = Math.cos(RIG_YAW), s = Math.sin(RIG_YAW);
    return [x * c + z * s, -x * s + z * c];
  };
  // physical piano frame (X = treble = pianist's right, Y = toward the tail) -> rig local (-X, 0, Y)
  const pianoToRig = (X, Y) => [-X, Y];
  const toWorld = (e, space) => {
    const sp = e.space ?? space ?? 'rig';
    const x = e.pos ? e.pos[0] : (e.x ?? 0), z = e.pos ? e.pos[2] : (e.z ?? 0);
    if (sp === 'world') return [x, z];
    if (sp === 'piano') { const [rx, rz] = pianoToRig(e.X ?? x, e.Y ?? z); return rigToWorld(rx, rz); }
    return rigToWorld(x, z);
  };
  // default sources (piano frame -> rig frame): the lyre / pedal box first, then the three legs
  const DEFAULT_SOURCES = [[0, 0.35], [-0.60, 0.30], [0.60, 0.30], [-0.20, 2.30]].map(([X, Y]) => { const [x, z] = pianoToRig(X, Y); return { x, z }; });
  const lyreWorld = () => toWorld(DEFAULT_SOURCES[0], 'rig');
  let lyre = lyreWorld();
  let bedCenterUser = false;
  WU.uBedCenter.value.set(lyre[0], lyre[1]);
  let events = defaultRippleEvents(P, DEFAULT_SOURCES).map((e) => ({ ...e, space: 'rig' }));
  let emitters = null;
  // performance-driven rings: the core loads build/anim/perf.json into ctx.data.perfMeta (docs/RENDERING.md); its
  // 'ripples' (rig frame) drive the rings through rippleEventsFromPerf, over a faint default stream (x background)
  // that keeps a ring field between phrases. water.perfRipples.use = false keeps the default stream only.
  const PR = P.water.perfRipples ?? {};
  let ripSource = 'default';
  function eventsWithPerf(ripples) {
    const bg = PR.background ?? 0.5;
    const base = bg > 0 ? defaultRippleEvents(P, DEFAULT_SOURCES).map((e) => ({ ...e, amp: e.amp * bg, space: 'rig', kind: 'bg' })) : [];
    return prepareEvents([...base, ...rippleEventsFromPerf(ripples, PR)], 'rig');
  }
  {
    const pr = ctx.data?.perfMeta?.ripples;
    if ((PR.use ?? true) && Array.isArray(pr) && pr.length) { events = eventsWithPerf(pr); ripSource = 'perf'; }
  }
  const EMITTER_PTS = [[-0.60, 0.30], [0.60, 0.30], [-0.20, 2.30],    // piano legs (piano frame, D-class)
    [-0.31, -0.40], [0.31, -0.40], [-0.31, -0.72], [0.31, -0.72],      // bench legs
    [0.10, 0.22], [-0.16, -0.02]];                                     // shoes (right on the pedal, left back)
  function defaultEmitters() {
    return EMITTER_PTS.map(([X, Y], i) => ({ X, Y, space: 'piano', amp: P.water.microAmp * (0.7 + 0.6 * halton(i + 1, 3)),
      wavelength: P.water.microLambda * (0.9 + 0.25 * halton(i + 1, 2)), radius: P.water.microRadius, phase: 6.2832 * halton(i + 1, 5) }));
  }
  function uploadEmitters(list) {
    const n = Math.min(list.length, MAX_EMITTERS);
    for (let i = 0; i < n; i++) {
      const e = list[i]; const k = (2 * Math.PI) / e.wavelength; const [x, z] = toWorld(e);
      WU.uEmA.value[i].set(x, z, e.amp, k);
      WU.uEmB.value[i].set(e.radius ?? P.water.microRadius, e.phase ?? 0, omegaOf(k), 0);
    }
    WU.uNumEm.value = n;
  }
  uploadEmitters(defaultEmitters());
  const hEff = P.water.depthEff ?? 0.15;
  /** pick the (at most MAX_EVENTS) packets with the largest visible contribution at time t, re-projected to world */
  function uploadEvents(t) {
    const R = P.water.ring;
    const maxAge = R.maxAge ?? 16, field = R.fieldRadius ?? 8, near = R.nearRadius ?? 0.8;
    const cand = [];
    for (const e of events) {
      if (e.t > t + 0.02) break;                       // events are sorted by time
      const tau = t - e.t;
      if (tau >= maxAge) continue;
      const k0 = (2 * Math.PI) / (e.wavelength ?? 0.12);
      const rg = groupSpeed(k0, hEff) * tau;            // radius of the packet's peak
      const fadeAge = 1 - (tau <= maxAge - 3 ? 0 : (((tau - maxAge + 3) / 3) ** 2) * (3 - 2 * (tau - maxAge + 3) / 3));
      const w = (e.amp ?? 0.002) * Math.exp(-rg / field) / Math.sqrt(1 + rg / near) * fadeAge;
      if (w > 1e-6) cand.push([w, e, k0]);
    }
    cand.sort((a, b) => b[0] - a[0] || a[1].t - b[1].t);
    const cap = Math.min(R.maxEvents, MAX_EVENTS);
    const act = cand.slice(0, cap);
    // fix round 2: no pops at the cap. When more packets compete than fit, the selected ones whose weight is close to
    // the first excluded weight fade to 0 at that weight (stateless, continuous in t: a packet leaving or entering the
    // set has ~0 amplitude at the swap)
    const cut = cand.length > cap ? cand[cap][0] : 0;
    act.forEach(([wgt, e, k0], i) => {
      const [x, z] = toWorld(e);
      const fadeCap = cut > 0 ? Math.min(1, Math.max(0, (wgt - cut) / (0.25 * cut))) : 1;
      const fc = fadeCap * fadeCap * (3 - 2 * fadeCap);
      WU.uEvA.value[i].set(x, z, e.t, (e.amp ?? 0.002) * fc);
      const kB = e.kBand ?? R.kBand;
      WU.uEvB.value[i].set(k0, kB, groupSpeed(Math.max(2, 0.15 * k0), hEff) * 1.05 + 0.05, 0);
    });
    WU.uNumEv.value = act.length;
  }
  /** sort, give missing wavelengths a deterministic default, merge same-source onsets within mergeDt s */
  function prepareEvents(list, space) {
    const D = P.water.defaultEvents;
    const L = list.map((e, i) => ({ ...e, space: e.space ?? space, wavelength: e.wavelength ?? (D.wavelength[0] + (D.wavelength[1] - D.wavelength[0]) * halton(i + 1, 3)) }))
      .sort((a, b) => a.t - b.t);
    const out = [], mergeDt = P.water.ring.mergeDt ?? 0.1;
    for (const e of L) {
      const [x, z] = [e.pos ? e.pos[0] : (e.x ?? e.X ?? 0), e.pos ? e.pos[2] : (e.z ?? e.Y ?? 0)];
      const prev = out.length ? out[out.length - 1] : null;
      if (prev && e.t - prev.t < mergeDt && prev.space === e.space && (prev.kind ?? '') === (e.kind ?? '') && Math.hypot(prev._x - x, prev._z - z) < 0.02) {
        const a1 = prev.amp ?? 0.002, a2 = e.amp ?? 0.002;
        prev.wavelength = (prev.wavelength * a1 + e.wavelength * a2) / (a1 + a2);
        prev.amp = Math.max(a1, a2) + 0.5 * Math.min(a1, a2);
        continue;
      }
      out.push({ ...e, _x: x, _z: z });
    }
    return out;
  }
  // sun: an explicit override wins; with the core, ctx.sun (film arc + per-shot sunElevationDeg) drives it;
  // standalone, params.sunKeys
  let sunOverride = P.sunElevationOverride;
  const hooked = typeof ctx.registerSkyBake === 'function';
  const sunAt = (t) => (sunOverride ?? (hooked && ctx.sun && Number.isFinite(ctx.sun.elevationDeg) ? ctx.sun.elevationDeg : piecewise(P.sunKeys, t)));
  // fix round 2: the world's LOOK is pinned to the plates (sun ~ -1 deg): above P.sunLook[0] the elevation is compressed
  // by P.sunLook[1] (S01 at +0.53 deg washed sky, terrain and water to pastel pink); every world consumer (sky table,
  // clouds' terminator, alpenglow, water) sees the same look elevation
  const lookSun = (s) => (P.sunLook && s > P.sunLook[0] ? P.sunLook[0] + (s - P.sunLook[0]) * P.sunLook[1] : s);
  let lastFrame = null;
  const pixelAngle = (camera, hpx) => {
    const fov = (camera.fov ?? 40) * Math.PI / 180;
    return (2 * Math.tan(fov / 2)) / Math.max(1, (camera.zoom ?? 1)) / hpx;
  };
  const root = () => { let o = group; while (o.parent) o = o.parent; return o; };

  // horizon glow as a light (for an art-directed kicker / rim on the piano and the pianist; the env already
  // contains this light, so a kicker on top of the IBL is look-dev, not physics): clear-sky radiance integrated over
  // the glow lobe A -40..+40, e 0..14 deg (terrain occlusion ignored). irradiance = sum L cos(theta) dOmega on a
  // surface facing `direction` (scene-linear, the same units as the env), radiance = peak clear-sky radiance.
  const glowLight = { direction: new THREE.Vector3(0, 0.05, -1).normalize(), irradiance: new THREE.Vector3(), radiance: new THREE.Vector3() };
  function updateGlowLight() {
    const D = Math.PI / 180, dA = 4 * D, dE = 1 * D;
    let sx = 0, sy = 0, sz = 0; const acc = [];
    let peak = [0, 0, 0], peakL = -1;
    for (let A = -40; A <= 40; A += 4) for (let e = 0.5; e < 14; e += 1) {
      const ce = Math.cos(e * D); const d = [ce * Math.sin(A * D), Math.sin(e * D), -ce * Math.cos(A * D)];
      const L = sky.clearSkyCPU(d[0], d[1], d[2]); const dw = ce * dA * dE;
      const lum = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];
      sx += d[0] * lum * dw; sy += d[1] * lum * dw; sz += d[2] * lum * dw; acc.push([d, L, dw]);
      if (lum > peakL) { peakL = lum; peak = L; }
    }
    glowLight.direction.set(sx, sy, sz).normalize();
    const n = glowLight.direction; let r = 0, g = 0, b = 0;
    for (const [d, L, dw] of acc) { const c = Math.max(0, d[0] * n.x + d[1] * n.y + d[2] * n.z) * dw; r += L[0] * c; g += L[1] * c; b += L[2] * c; }
    glowLight.irradiance.set(r, g, b); glowLight.radiance.set(...peak);
  }

  const world = {
    group, parent: 'world', params: P, heightAt, sky, water, sharedUniforms: shared,
    terrainMaterial: terrain.mesh.material,
    /** look-dev only (sandbox A/B in one session): rebuild the terrain GEOMETRY with terrain-param overrides
     *  ({ 'crestSmooth.mode': 'lowpass', ... }); heightAt / boulders keep the original field. Returns the build stats. */
    rebuildTerrain(over = {}) {
      const T2 = JSON.parse(JSON.stringify(P.terrain));
      for (const [k, v] of Object.entries(over)) { const ks = k.split('.'); let o = T2; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks.at(-1)] = v; }
      const b = buildTerrainGeometry({ ...P, terrain: T2 }, makeHeightField(T2));
      const old = terrain.mesh.geometry; terrain.mesh.geometry = b.geometry; if (envTm) envTm.geometry = b.geometry; old.dispose();
      return { triangles: b.triangles, vertices: b.vertices };
    },
    get envMap() { return envRT ? envRT.texture : null; },
    get skyCube() { return sky.cubeRT.texture; },
    get envCube() { return envCubeRT.texture; },      // the raw env capture (before PMREM), for diagnostics / probes
    get sunDirection() { return SU.uSunDir.value; },
    /** { direction, irradiance, radiance } of the horizon glow this frame (see updateGlowLight); for kicker lights */
    get glowLight() { return glowLight; },
    stats: { terrain: terrain.stats, boulders: boulders.stats },

    sunElevation: sunAt,
    setSunElevation(deg) { sunOverride = deg; },
    /** ring events [{ t, x, z | pos, amp, wavelength?, space? }]; space defaults to opts.space ?? 'rig' */
    setRippleEvents(list, { space = 'rig' } = {}) {
      events = list && list.length ? prepareEvents(list, space) : defaultRippleEvents(P, DEFAULT_SOURCES).map((e) => ({ ...e, space: 'rig' }));
      ripSource = list && list.length ? 'user' : 'default';
    },
    /** perf.json 'ripples' (rig frame, film time) -> rings (rippleEventsFromPerf + the faint default background) */
    setPerfRipples(ripples) {
      if (ripples && ripples.length) { events = eventsWithPerf(ripples); ripSource = 'perf'; }
      else { events = defaultRippleEvents(P, DEFAULT_SOURCES).map((e) => ({ ...e, space: 'rig' })); ripSource = 'default'; }
    },
    setEmitters(list, { space = 'rig' } = {}) {
      emitters = list && list.length ? list.map((e) => ({ ...e, space: e.space ?? space })) : null;
      uploadEmitters(emitters ?? defaultEmitters());
    },
    setBedCenter(x, z) { bedCenterUser = x !== null && x !== undefined; if (bedCenterUser) WU.uBedCenter.value.set(x, z); },

    /** once per output frame, with the frame-centre camera (before lens offsets and jitter) */
    prepareFrame(t, { camera, frame = null, env = true } = {}) {
      // ripple sources follow the rig (per-shot yaw cheats rotate piano + pianist + ripples, never the world)
      if (ctx.rigGroup) ctx.rigGroup.updateMatrixWorld(true);
      lyre = lyreWorld();
      if (!bedCenterUser) WU.uBedCenter.value.set(lyre[0], lyre[1]);
      uploadEmitters(emitters ?? defaultEmitters());
      const s = lookSun(sunAt(t));
      sky.setSun(s); sky.setTime(t);
      sky.irradianceSH(shared.uSH.value);
      updateGlowLight();
      if (camera) {
        camera.updateMatrixWorld(true);
        shared.uPixelAngleT.value = pixelAngle(camera, H_px);
        WU.uPixelAngleW.value = shared.uPixelAngleT.value;
        // elevated cameras (ref 5 at 2.7 m, drones): swell / chop fade out over 25 m / 25-60 m (calm far mirror)
        const ch = camera.matrixWorld.elements[13];
        const fk = Math.min(1, Math.max(0, (ch - P.water.farFadeHeight[0]) / (P.water.farFadeHeight[1] - P.water.farFadeHeight[0])));
        WU.uFarFadeK.value = fk * fk * (3 - 2 * fk);
      }
      sky.bake(camera, { view: !!camera, mirror: !!camera, cube: env });
      // environment capture every output frame (a pure function of the frame: no state from earlier frames)
      // (midiviz: env false skips the cube and the capture, for live frames between refreshes)
      if (env) {
      sky.domeUniforms.uDomeMode.value = 1;
      const aOn = sky.bakeAOn.value, bOn = sky.bakeBOn.value;
      sky.bakeAOn.value = 0; sky.bakeBOn.value = 0;      // the capture samples the cube (other directions)
      envCam.update(renderer, root());
      sky.bakeAOn.value = aOn; sky.bakeBOn.value = bOn;
      sky.domeUniforms.uDomeMode.value = 0;
      envRT = pmrem.fromCubemap(envCubeRT.texture, envRT);
      envRT.texture.name = 'AG.world.envPMREM';
      }
      uploadEvents(t);
      WU.uTime.value = t;
      lastFrame = frame;
    },

    /** per sub-frame: shutter time */
    update(t, sub = {}) {
      // standalone fallback: with the core the sky-bake hook calls prepareFrame with the frame-centre camera
      if (!hooked && sub.k === 0 && sub.frame !== undefined && sub.frame !== lastFrame && sub.camera) this.prepareFrame(sub.frameT ?? t, { camera: sub.camera, frame: sub.frame });
      WU.uTime.value = t;
    },

    /** midiviz: new output size (the view and mirror bakes and the reflection target follow it) */
    setSize(w, h) {
      const B = P.bake, m = 1 + B.viewMargin;
      sky.width = w; sky.height = h; W_px = w; H_px = h;
      sky.bakeA.setSize(Math.max(4, Math.round(w * B.viewScale * m)), Math.max(4, Math.round(h * B.viewScale * m)));
      sky.bakeB.setSize(Math.max(4, Math.round(w * B.reflScale * m)), Math.max(4, Math.round(h * B.reflScale * m)));
      const tw = Math.max(16, Math.round(w * B.reflScale)), th = Math.max(16, Math.round(h * B.reflScale));
      water.getRenderTarget().setSize(tw, th); WU.uReflSize.value.set(tw, th);
    },

    info() {
      const rt = water.getRenderTarget();
      return { sun: SU.uSunElevRad.value * 180 / Math.PI, quality: q, terrain: terrain.stats, boulders: boulders.stats, events: WU.uNumEv.value, ripples: { source: ripSource, events: events.length }, emitters: WU.uNumEm.value,
        bakes: { reflRT: [rt.width, rt.height], cube: sky.cubeRT.width, env: envCubeRT.width, view: [sky.bakeA.width, sky.bakeA.height], mirror: [sky.bakeB.width, sky.bakeB.height] } };
    },
    dispose() {
      sky.dispose(); envCubeRT.dispose(); envRT?.dispose(); pmrem.dispose();
      terrain.mesh.geometry.dispose(); terrain.mesh.material.dispose();
      water.getRenderTarget().dispose(); water.material.dispose();
    },
  };
  // ---- core wiring (docs/RENDERING.md section 3): per output frame, with the frame-centre camera, bake the sky +
  // clouds, capture the environment and upload the ripple events; then expose the PMREM as the scene's IBL
  // (other modules may replace scene.environment in a later env-capture hook, e.g. a lacquer probe at the piano)
  if (hooked) {
    ctx.registerSkyBake((info) => world.prepareFrame(info.t, { camera: ctx.camera, frame: info.frame }));
    if (typeof ctx.registerEnvCapture === 'function') ctx.registerEnvCapture(() => {
      if (P.setSceneEnvironment !== false && ctx.scene && world.envMap) ctx.scene.environment = world.envMap;
    });
  }
  return world;
}

export default create;
