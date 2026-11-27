// Afterglow piano module (DESIGN.md: scene/src/piano). Procedural D-class concert grand + artist bench.
//
//   import { create } from './piano/index.js';
//   const piano = await create(ctx);           // ctx: { renderer?, materials?: overrides, options?: { placeInRig, bench } }
//   rig.add(piano.group);                      // group is already placed in the rig frame: position (+0.780, -0.04, 0),
//                                              // scale (-1, 1, 1) (the piano frame is left-handed; DESIGN.md section 2)
//   per sub-frame:  piano.setKeyAngles(f32x88); piano.setHammerAngles(f32x88 | null); piano.setDamperLifts(f32x88 | null);
//                   piano.setPedals([una, sost, sus]); piano.update(t, sub);
//
// Units: radians and metres. Everything is a pure function of the values passed in (no clocks, no randomness).
// docs/PIANO.md documents the API, the frames and the data in layout.js.
import * as THREE from 'three';
import { LAYOUT, PEDAL_MAX_RAD, KEY_DIP_RAD } from './layout.js';
import { createMaterials, FILL_DIR, KICK_DIR_W, SIL_N } from './materials.js';
import { buildCase } from './geom/case.js';
import { buildKeys } from './geom/keys.js';
import { computeStrings } from './geom/stringing.js';
import { buildInterior } from './geom/interior.js';
import { buildStrings } from './geom/strings.js';
import { buildAction } from './geom/action.js';
import { buildLegs } from './geom/legs.js';
import { buildBench } from './geom/bench.js';
import { buildDeskMirror, buildLidMirror, buildFallboardMirror, buildArmMirror, MIRROR_LAYER } from './geom/mirror.js';
import { createFillShadow, FILL_SHADOW_LAYER } from './geom/fillshadow.js';

// piano frame -> rig frame: rig = (kbCentre - x, y - 0.04, z). The mirror keeps the treble on the pianist's right.
export const RIG_POSITION = Object.freeze([LAYOUT.keyboard.center, -0.04, 0]);
export const RIG_SCALE = Object.freeze([-1, 1, 1]);

const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const dot3 = (v) => v.x + v.y + v.z;
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// cycle 2 round 2 (critic c2r2 critical: the wide card band read as an amber "LED underglow", hue 27 deg / sat .73, a tint
// that exists nowhere in our sky, whose glow displays at blue/red .52-.61): the card colours are taken from the world's glow
// as it DISPLAYS. three's PBR Neutral (exposure 1) desaturates the bright sky toward white, while a dim reflection of the
// same linear hue sits in the tone curve's toe, which subtracts the min channel and saturates it further. So: tone-map the
// glow radiance, normalise, then add `toe` to every channel (pre-compensates the toe's min-channel subtraction at
// reflection level) and normalise again. Glow (2.21, 1.05, 0.37): displayed hue (1, .55, .28); toe .25 -> (1, .64, .43)
function pbrNeutral(c) {
  let [r, g, b] = c; const x = Math.min(r, g, b), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= off; g -= off; b -= off;
  const peak = Math.max(r, g, b), sc = 0.76;
  if (peak < sc) return [r, g, b];
  const d = 1 - sc, np = 1 - (d * d) / (peak + d - sc); r *= np / peak; g *= np / peak; b *= np / peak;
  const k = 1 - 1 / (0.15 * (peak - np) + 1);
  return [r + (np - r) * k, g + (np - g) * k, b + (np - b) * k];
}
function displayHue(rad, toe) {
  const t = pbrNeutral([rad.x, rad.y, rad.z]), m = Math.max(t[0], t[1], t[2], 1e-6);
  const u = t.map((v) => v / m + toe), mu = Math.max(u[0], u[1], u[2]);
  return u.map((v) => v / mu);
}

/**
 * Perf-track reader (DESIGN.md section 4: 240 Hz in music time from m = -MUSIC_OFFSET). Proposed layout, documented in
 * docs/PIANO.md: perfMeta = { rate, t0 (music time of sample 0), stride, frames, channels: {keys: {offset, size: 88},
 * hammers: {...88}, dampers: {...88}, pedals: {offset, size: 3}} } (channels may also be an array of {name, offset, size});
 * perf = ArrayBuffer of Float32 frames x stride. Returns null when the tracks are missing or do not match.
 */
export function makeTrackReader(perfMeta, perf, musicOffset = 4.0) {
  if (!perfMeta || !perf) return null;
  const buf = perf instanceof ArrayBuffer ? new Float32Array(perf) : (ArrayBuffer.isView(perf) ? new Float32Array(perf.buffer, perf.byteOffset, perf.byteLength / 4) : null);
  if (!buf) return null;
  const chans = Array.isArray(perfMeta.channels) ? Object.fromEntries(perfMeta.channels.map((c) => [c.name, c])) : (perfMeta.channels || {});
  const pick = (...names) => { for (const n of names) if (chans[n]) return chans[n]; return null; };
  const ch = { keys: pick('keys', 'keyAngles', 'key'), hammers: pick('hammers', 'hammerAngles', 'hammer'), dampers: pick('dampers', 'damperLifts', 'damper'), pedals: pick('pedals', 'pedalAngles', 'pedal') };
  if (!ch.keys) return null;
  const rate = perfMeta.rate || 240, t0 = perfMeta.t0 ?? -musicOffset, stride = perfMeta.stride, frames = perfMeta.frames || Math.floor(buf.length / stride);
  const out = { keys: new Float32Array(88), hammers: ch.hammers ? new Float32Array(88) : null, dampers: ch.dampers ? new Float32Array(88) : null, pedals: [0, 0, 0] };
  return (tFilm) => {
    const s = ((tFilm - musicOffset) - t0) * rate;
    const i0 = Math.max(0, Math.min(frames - 1, Math.floor(s))), i1 = Math.min(frames - 1, i0 + 1), f = Math.min(1, Math.max(0, s - i0));
    const rd = (c, dst, n) => { for (let j = 0; j < n; j++) { const a = buf[i0 * stride + c.offset + j], b = buf[i1 * stride + c.offset + j]; dst[j] = a + (b - a) * f; } };
    rd(ch.keys, out.keys, 88);
    if (ch.hammers) rd(ch.hammers, out.hammers, 88);
    if (ch.dampers) rd(ch.dampers, out.dampers, 88);
    if (ch.pedals) rd(ch.pedals, out.pedals, 3);
    return out;
  };
}

export async function create(ctx = {}) {
  const opts = { placeInRig: true, bench: true, envProbe: 'auto', ...((ctx.options && ctx.options.piano) || {}), ...(ctx.pianoOptions || {}) };
  const L = LAYOUT;
  const M = createMaterials(L, { grainDeg: L.soundboardGrainDegFromX, ...(opts.interiorFill ? { interiorFill: opts.interiorFill } : {}), ...(opts.lacquerF0 !== undefined ? { lacquerF0: opts.lacquerF0 } : {}), ...(opts.reflectionFold !== undefined ? { reflectionFold: opts.reflectionFold } : {}), ...(opts.reflectionLiftDeg !== undefined ? { reflectionLiftDeg: opts.reflectionLiftDeg } : {}), ...(opts.kicker ? { kicker: opts.kicker } : {}) });
  if (ctx.materials) Object.assign(M, ctx.materials);

  const group = new THREE.Group(); group.name = 'piano';
  if (opts.placeInRig) { group.position.set(...RIG_POSITION); group.scale.set(...RIG_SCALE); }
  const body = new THREE.Group(); body.name = 'pianoBody'; group.add(body);

  const SS = computeStrings(L);
  const caseParts = buildCase(L, M); body.add(caseParts.group);
  const keys = buildKeys(L, M); body.add(keys.group);
  const interior = buildInterior(L, M, SS); body.add(interior.group);
  const strings = buildStrings(L, M, SS); body.add(strings.group);
  const action = buildAction(L, M, SS); body.add(action.group);
  const legs = buildLegs(L, M); body.add(legs.group);
  const bench = opts.bench ? buildBench(L, M) : null; if (bench) group.add(bench.group);

  const state = {
    lidDeg: L.lid.fullStickDeg, keyAngles: new Float32Array(88), hammer: null, damper: null,
    pedals: [0, 0, 0], unaCorda: null, benchHeight: L.bench.defaultHeight,
  };
  const hamFallback = new Float32Array(88), damp = new Float32Array(88);
  const tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const isBlack = L.keys.map((k) => k.color === 'black');

  // The prop stick has one length (solved for full stick). At full stick (+-0.3 deg) it is aimed at the cup; at any
  // other lid angle it cannot hold the lid, so it is shown folded down inward onto its rest (the lid is being moved
  // by hand). It never pierces the lid (critic round 1: the fixed-length stick was re-aimed and went through it).
  const foldDir = new THREE.Vector3(-Math.cos(THREE.MathUtils.degToRad(4)), Math.sin(THREE.MathUtils.degToRad(4)), 0);
  function applyLid() {
    const a = THREE.MathUtils.degToRad(state.lidDeg);
    caseParts.lidGroup.rotation.set(0, 0, a);
    caseParts.lidGroup.updateMatrix();
    const cup = caseParts.cupLocal.clone().applyMatrix4(caseParts.lidGroup.matrix);
    const p = caseParts.propGroup;
    const d = cup.distanceTo(p.position);
    if (Math.abs(d - caseParts.propLength) < 0.004) tmpV.copy(cup).sub(p.position).normalize();
    else tmpV.copy(foldDir);
    p.quaternion.setFromUnitVectors(up, tmpV);
  }

  /** Recompute everything derived from the current inputs (called by update()). */
  function apply() {
    keys.setAngles(state.keyAngles);
    action.setKeyAngles(state.keyAngles);
    // hammers: explicit (perf solver) or fallback = rise with the key to the check position
    if (state.hammer) action.setHammerAngles(state.hammer);
    else {
      for (let i = 0; i < 88; i++) {
        const f = state.keyAngles[i] / (isBlack[i] ? KEY_DIP_RAD.black : KEY_DIP_RAD.white);
        hamFallback[i] = action.hammers[i].checkAng * smooth(f, 0.02, 0.98);
      }
      action.setHammerAngles(hamFallback);
    }
    // dampers: explicit, or max(key lift past half dip, sustain-pedal lift after 30 % travel)
    if (state.damper) action.setDamperLifts(state.damper);
    else {
      const sus = state.pedals[2] / PEDAL_MAX_RAD.sustain;
      const pedalLift = L.action.damperLiftPedal * smooth(sus, 0.30, 0.85);
      for (let i = 0; i < 88; i++) {
        const f = state.keyAngles[i] / (isBlack[i] ? KEY_DIP_RAD.black : KEY_DIP_RAD.white);
        damp[i] = Math.max(L.action.damperLiftKey * smooth(f, 0.45, 0.80), pedalLift);
      }
      action.setDamperLifts(damp);
    }
    legs.setPedals(state.pedals);
    // una corda: explicit fraction, else from the left pedal travel
    const uc = state.unaCorda !== null ? state.unaCorda : smooth(state.pedals[0] / PEDAL_MAX_RAD.unaCorda, 0.1, 0.9);
    const dx = uc * L.keyboard.unaCordaShiftX;
    keys.setShift(dx); action.setShift(dx);
    applyLid();
    if (bench) bench.setHeight(state.benchHeight);   // seat rides on the mechanism, legs stay on the floor
    // occlusion uniforms: world -> piano frame, lid angle
    group.updateWorldMatrix(true, true);
    M.shared.interior.agPianoInv.value.copy(body.matrixWorld).invert();
    M.shared.interior.agLidAng.value = THREE.MathUtils.degToRad(state.lidDeg);
  }
  apply();

  /**
   * Static pose for look-dev / stills without perf tracks: { keys: {noteNumber: deg}, hammers: {noteNumber: fraction of
   * the strike angle}, dampers: {noteNumber: lift m}, pedals: [una, sost, sus] deg, lid: deg, unaCorda: 0..1 }.
   * Notes are 1..88 (A0 = 1). Unlisted hammers/dampers follow the keys and pedal (the default fallback rules).
   */
  function setPose(p = {}) {
    const ka = new Float32Array(88);
    if (p.keys) for (const [n, deg] of Object.entries(p.keys)) ka[+n - 1] = THREE.MathUtils.degToRad(+deg);
    state.keyAngles.set(ka);
    if (p.hammers) {
      const ha = new Float32Array(88);
      for (let i = 0; i < 88; i++) {
        const f = ka[i] / (isBlack[i] ? KEY_DIP_RAD.black : KEY_DIP_RAD.white);
        ha[i] = action.hammers[i].checkAng * smooth(f, 0.02, 0.98);
      }
      for (const [n, fr] of Object.entries(p.hammers)) ha[+n - 1] = action.hammers[+n - 1].strikeAng * +fr;
      state.hammer = ha;
    } else state.hammer = null;
    if (p.dampers) {
      const da = new Float32Array(88);
      for (const [n, v] of Object.entries(p.dampers)) da[+n - 1] = +v;
      state.damper = da;
    } else state.damper = null;
    state.pedals = (p.pedals || [0, 0, 0]).map((d) => THREE.MathUtils.degToRad(+d || 0));
    state.lidDeg = p.lid ?? L.lid.fullStickDeg;
    state.unaCorda = p.unaCorda ?? null;
    apply();
  }
  if (opts.pose) setPose(opts.pose);

  // ---------------------------------------------------------------- interior fill shadow map (geom/fillshadow.js)
  // casters: everything in the body except the lid (the fill's "source") and the legs/lyre/pedals; set before the
  // planar mirrors exist so their Reflector meshes never join the depth pass
  {
    const skip = new Set(); caseParts.lidGroup.traverse((o) => skip.add(o)); legs.group.traverse((o) => skip.add(o));
    body.traverse((o) => { if (o.isMesh && !skip.has(o)) o.layers.enable(FILL_SHADOW_LAYER); });
  }
  let fillShadow = null;
  if (ctx.renderer && ctx.registerPreSubframe && opts.fillShadow !== false && opts.fillShadow !== 'off') {
    const size = opts.fillShadowSize || (ctx.quality === 'preview' ? 2048 : 3072);
    fillShadow = createFillShadow(ctx.renderer, { size });
    const SI = M.shared.interior;
    SI.agFillShadow.value = fillShadow.texture; SI.agFillTexel.value = 1 / size;
    const cornersL = []; for (const x of [0, L.caseWidth]) for (const y of [0.70, 1.06]) for (const z of [0.25, L.caseLength]) cornersL.push(new THREE.Vector3(x, y, z));
    const cornersW = cornersL.map((p) => p.clone()), dirW = new THREE.Vector3(), nm = new THREE.Matrix3();
    ctx.registerPreSubframe(() => {
      if (dot3(SI.agFill.value) <= 0) { SI.agFillShadowOn.value = 0; return; }
      body.updateWorldMatrix(true, false);
      cornersL.forEach((p, i) => cornersW[i].copy(p).applyMatrix4(body.matrixWorld));
      nm.setFromMatrix4(body.matrixWorld); dirW.copy(SI.agFillDir.value).applyMatrix3(nm).normalize();
      SI.agFillShadowM.value.copy(fillShadow.render(ctx.scene, dirW, cornersW));
      SI.agFillShadowOn.value = 1;
    });
  }

  let deskMirror = null, lidMirror = null, fbMirror = null, pinMirror = null;   // planar mirrors (created after the probe, below)
  const armMirrors = [];

  // ---------------------------------------------------------------- reflection probe owned by the piano
  // DESIGN.md section 6: lacquer = clearcoat + env cube captured at the piano (piano and pianist hidden). Captured every
  // output frame (a pure function of the frame, so chunks rendered out of order stay bit-identical) and assigned as the
  // envMap of the piano's own materials only; scene.environment is left to the world module.
  // The mirror lacquer needs a sharp probe: 1024 per face in final quality (0.09 deg per texel), 512 in preview.
  let probe = null;
  const world = ctx.modules && ctx.modules.world;
  // Integration shim (docs/PIANO.md): the world module prepares its sky bakes lazily at sub-frame k = 0, which is AFTER
  // the core's env-capture hooks. Make sure the world is prepared for this frame before the piano captures its probe;
  // the world's own update() then sees the frame as prepared and skips. Pure function of the frame either way.
  let worldPrepared = null;
  if (world && typeof world.prepareFrame === 'function' && opts.prepareWorld !== false) {
    const orig = world.prepareFrame;
    world.prepareFrame = function prepareFrameTracked(t, o = {}) { worldPrepared = o.frame ?? null; return orig.call(this, t, o); };
  }
  if (opts.envProbe !== false && opts.envProbe !== 'off' && ctx.registerEnvCapture && ctx.core && ctx.core.CubeProbe && ctx.renderer) {
    const size = opts.envProbeSize || (ctx.quality === 'preview' ? 512 : 1024);
    // With the real world module, capture exactly what the world's own env capture sees (ENV_LAYER = 5: dome, terrain,
    // boulders; the dome in its "env" mode = sky cube above, mirror lake below, view/mirror bakes off), only sharper and
    // at the piano. A full-scene capture would re-render the Reflector water and the camera-dependent dome bakes from the
    // cube faces, which gives wrong reflections (measured: black and streaked faces, sandbox/piano2/out/dbg1).
    const sky = world && world.sky;
    const envMode = !!(sky && sky.domeUniforms && sky.domeUniforms.uDomeMode && sky.bakeAOn && sky.bakeBOn) && opts.probeEnvMode !== false;
    let layers = null;
    if (envMode) { layers = new THREE.Layers(); layers.set(opts.envLayer ?? 5); }
    probe = new ctx.core.CubeProbe(ctx.renderer, { size, pmrem: true, near: envMode ? 1.0 : 0.05, far: envMode ? 90000 : 60000, layers });
    const local = new THREE.Vector3(L.keyboard.center, 1.30, 1.05);
    let assigned = false;
    ctx.registerEnvCapture((info) => {
      if (world && typeof world.prepareFrame === 'function' && opts.prepareWorld !== false && worldPrepared !== ctx.frame) {
        world.prepareFrame(ctx.t, { camera: ctx.camera, frame: ctx.frame });
      }
      const pos = body.localToWorld(local.clone());
      const hide = [group]; const pn = ctx.modules && ctx.modules.pianist; if (pn && pn.group) hide.push(pn.group);
      if (envMode) {
        const du = sky.domeUniforms.uDomeMode, a = sky.bakeAOn.value, b = sky.bakeBOn.value, m = du.value;
        du.value = 1; sky.bakeAOn.value = 0; sky.bakeBOn.value = 0;
        try { probe.capture(ctx.scene, { hide, position: pos }); } finally { du.value = m; sky.bakeAOn.value = a; sky.bakeBOn.value = b; }
      } else probe.capture(ctx.scene, { hide, position: pos });
      if (!assigned && probe.envMap) {
        for (const m of Object.values(M)) if (m && m.isMaterial && 'envMap' in m) { m.envMap = probe.envMap; m.needsUpdate = true; }
        assigned = true;
      }
      void info;
    });
  }
  // ---------------------------------------------------------------- planar mirrors: music desk + lid underside
  // 'auto' (default): on when the camera faces the mirror and is closer than deskMirrorDist (3.5 m) / lidMirrorDist
  // (8 m); 'on' | 'off'. The mirror pass draws only MIRROR_LAYER (this piano + the pianist), env probe elsewhere.
  const deskMode = opts.deskMirror ?? 'auto', lidMode = opts.lidMirror ?? 'auto', fbMode = opts.fallboardMirror ?? 'auto', armMode = opts.armMirror ?? 'auto', pinMode = opts.pinMirror ?? 'auto';
  group.traverse((o) => o.layers.enable(MIRROR_LAYER));
  if (ctx.renderer && probe) {
    const w = ctx.width || (ctx.settings && ctx.settings.width) || 960, h = ctx.height || (ctx.settings && ctx.settings.height) || 540;
    const mo = { width: w, height: h, f0Uniform: M.shared.lacquer.agMirrorF0, envTexture: probe.texture, foldUniforms: M.shared.lacquer };
    const isMain = (cam) => !ctx.camera || cam === ctx.camera;
    if (deskMode !== 'off' && deskMode !== false) {
      deskMirror = buildDeskMirror(caseParts.desk, { ...mo, scale: opts.deskMirrorScale ?? (ctx.quality === 'preview' ? 0.6 : 0.8), maxDist: opts.deskMirrorDist ?? 3.5 });
      deskMirror.mesh.isMainCamera = isMain; caseParts.deskGroup.add(deskMirror.mesh);
    }
    if (lidMode !== 'off' && lidMode !== false) {
      lidMirror = buildLidMirror(caseParts.lidInfo, { ...mo, scale: opts.lidMirrorScale ?? (ctx.quality === 'preview' ? 0.5 : 0.7), maxDist: opts.lidMirrorDist ?? 8 });
      lidMirror.mesh.isMainCamera = isMain; caseParts.lidGroup.add(lidMirror.mesh);
    }
    // open fallboard face (hands and keys mirrored in close-ups, refs 7 / 8 / 12): 'auto' under 2.5 m, half resolution
    if (fbMode !== 'off' && fbMode !== false && caseParts.fallboardInfo) {
      fbMirror = buildFallboardMirror(caseParts.fallboardInfo, { ...mo, scale: opts.fallboardMirrorScale ?? (ctx.quality === 'preview' ? 0.4 : 0.5), maxDist: opts.fallboardMirrorDist ?? 2.5 });
      fbMirror.mesh.isMainCamera = isMain; caseParts.group.add(fbMirror.mesh);
    }
    // cycle 2: the raised pin-block cover above the fallboard (case.js pinblockFront, refs 7 / 8 / 12: one tall black mirror
    // over the keys with the hands and the sunset in it): 'auto' under 2.5 m, half resolution; the fallboard hides it below 0.79
    if (pinMode !== 'off' && pinMode !== false) {
      const pinInfo = { x0: L.rimThickness + 0.002, x1: L.caseWidth - L.rimThickness - 0.002, z: 0.250, y0: 0.792, y1: 0.9825 };
      pinMirror = buildFallboardMirror(pinInfo, { ...mo, name: 'pinPanelMirror', scale: opts.pinMirrorScale ?? (ctx.quality === 'preview' ? 0.4 : 0.5), maxDist: opts.pinMirrorDist ?? 2.5 });
      pinMirror.mesh.isMainCamera = isMain; caseParts.group.add(pinMirror.mesh);
    }
    // case-arm inner faces (the playing hand in the treble arm, refs 7 / 8): 'auto' under 2 m, facing the camera
    if (armMode !== 'off' && armMode !== false && caseParts.armInfo) {
      for (const side of ['treble', 'bass']) {
        const am = buildArmMirror(caseParts.armInfo, side, { ...mo, scale: opts.armMirrorScale ?? (ctx.quality === 'preview' ? 0.35 : 0.45), maxDist: opts.armMirrorDist ?? 2.0 });
        am.mesh.isMainCamera = isMain; caseParts.group.add(am.mesh); armMirrors.push(am);
        // session 13: own card weight (mirCardArm, default 0): the arm faces' coat lies inside the case volume where the coat
        // card is masked, so the shared mirCard drew the mirror rectangle as a seam (out/c2_f S06 L 32 -> 62 at x 1069)
        if (am.mesh.material && am.mesh.material.uniforms) am.mesh.material.uniforms.agMirCard = M.shared.lacquer.agMirCardArm;
      }
    }
    for (const mm of [deskMirror, lidMirror, fbMirror, pinMirror, ...armMirrors]) if (mm) { mm.mesh.layers.enable(MIRROR_LAYER); mm.update(ctx.camera || null, mm === deskMirror ? deskMode : (mm === lidMirror ? lidMode : (mm === fbMirror ? fbMode : (mm === pinMirror ? pinMode : armMode)))); }
  }
  let pianistLayered = null;
  function layerPianist() {   // the pianist appears in the mirrors: put his meshes on MIRROR_LAYER too (once per group)
    const pn = ctx.modules && ctx.modules.pianist;
    if (pn && pn.group && pianistLayered !== pn.group) { pn.group.traverse((o) => o.layers.enable(MIRROR_LAYER)); pianistLayered = pn.group; }
  }

  // interior fill light frame (direction + cone half-angle, deg); opts.fillDir in the piano frame
  const fillD = new THREE.Vector3(...(opts.fillDir || FILL_DIR)).normalize();
  const fillT = new THREE.Vector3().crossVectors(fillD, Math.abs(fillD.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize();
  const fillB = new THREE.Vector3().crossVectors(fillD, fillT).normalize();
  const fillCone = opts.fillConeDeg ?? 14;
  const fillDc = fillD.clone(), fillTc = fillT.clone(), fillBc = fillB.clone();   // per-frame fill frame (look key fillCam)
  const piLocal = new THREE.Vector3(L.keyboard.center, 0.9, 1.2);
  // coat kicker frame (world): toward the glow, jittered over kickConeDeg per sub-frame (soft lines after accumulation)
  const kickD = new THREE.Vector3(...(opts.kickDir || KICK_DIR_W)).normalize();
  const kickT = new THREE.Vector3().crossVectors(kickD, up).normalize();
  const kickB = new THREE.Vector3().crossVectors(kickD, kickT).normalize();
  const kickCone0 = opts.kickConeDeg ?? null;  // session 9: 6 -> 2.5 deg (6 deg drew separate glints on curved mirrors)
  let kickCone = kickCone0 ?? 2.5;              // per look (key kickCone), set by applyLook; opts.kickConeDeg wins
  // docs/WORLD.md section 6: the kicker follows world.glowLight (direction of the horizon glow, its colour and its
  // strength along the film's sun arc: x1.8 at +0.6 deg, x0.4 at -4.5 deg blue hour) when the world provides it; the
  // look's `kick` is relative to the glow at sun -1 deg (irradiance luminance 0.0915).
  // cycle 2 round 2 (critic c2r2: generic dune ridge on the case sides and in the close mirrors, next to the real jagged
  // peaks): the real skyline seen from the piano, from the world's own height field (world.heightAt; 512 azimuths x
  // 15 m .. 60 km, earth curvature; ~0.7 s once, pure function of the world params and the piano position), normalised
  // p10 -> 0 .. p98 -> 1 into materials.js agSil (atan2(z, x) convention of the card). Built lazily at the first update
  let silReady = false, silTried = false;
  function buildSilhouette() {
    silTried = true;
    if (!world || typeof world.heightAt !== 'function') return;
    body.updateWorldMatrix(true, false);
    const c = new THREE.Vector3(L.keyboard.center, 0.9, 1.2).applyMatrix4(body.matrixWorld);
    const N = SIL_N, el = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * 2 * Math.PI - Math.PI, dx = Math.cos(a), dz = Math.sin(a);
      let best = -0.2;
      for (let d = 15; d < 60000; d *= 1.02) { const h = world.heightAt(c.x + dx * d, c.z + dz * d); if (!Number.isFinite(h)) continue; const e = Math.atan2(h - c.y, d) - d / 12.742e6; if (e > best) best = e; }
      el[i] = best;
    }
    const s = Array.from(el).sort((p, q) => p - q), lo = s[Math.floor(0.10 * N)], hi = s[Math.floor(0.98 * N)];
    const tx = M.shared.lacquer.agSil.value, D = tx.image.data;
    for (let i = 0; i < N; i++) D[i * 4] = Math.round(255 * Math.min(1, Math.max(0, (el[i] - lo) / Math.max(hi - lo, 1e-5))));
    tx.needsUpdate = true; silReady = true;
  }
  const kickHue = new THREE.Vector3(1.0, 0.54, 0.24);
  const kickRad = new THREE.Vector3(2.21, 1.05, 0.37);   // glow peak radiance (WORLD.md section 6, sun -1 deg) for displayHue
  let kickGain = 1.0;
  function updateKickFrame() {
    const gl = world && world.glowLight;
    if (!gl) return;
    if (gl.direction && !opts.kickDir && gl.direction.lengthSq() > 0) {
      kickD.copy(gl.direction).normalize();
      kickT.crossVectors(kickD, up).normalize(); kickB.crossVectors(kickD, kickT).normalize();
    }
    if (gl.radiance && gl.irradiance) {
      const r = gl.radiance, m = Math.max(r.x, r.y, r.z, 1e-6);
      kickHue.set(r.x / m, r.y / m, r.z / m); kickRad.set(r.x, r.y, r.z);
      const g = Math.max(0, 0.2126 * gl.irradiance.x + 0.7152 * gl.irradiance.y + 0.0722 * gl.irradiance.z) / 0.0915;
      // round 2 (critic r2: S01 at sun +0.5 deg drew the card and kicker 1.75x brighter than at the tuning frame and the
      // piano tail overshot the frame's own brightening): above the tuning level the gain rises at 35 % of the glow's
      // rise (x1.26 at +0.5 deg); below it (blue hour) it follows the glow down
      kickGain = g <= 1 ? g : 1 + 0.35 * (g - 1);
    }
  }

  // Art-directed lacquer per shot class (docs/USER_FEEDBACK.md item 1, docs/PIANO.md section 4). 'auto' blends the
  // close and wide presets by the camera's distance to the piano (2.5 .. 6 m): a pure function of the camera pose.
  // Values tuned on piano-pixel statistics against refs 2, 4, 9, 11 (sandbox/piano2/log.md, session 5).
  // Session 7 keys: f0Up = coat F0 of up-facing lacquer (lid top, rim cap); proxy {pY world m, pG rad/m, pW case,
  // pLeg legs, pT deg, pC} = proxy-backdrop elevation of vertical panels (materials.js agFold); kickR = kicker lobe
  // roughness.
  const LOOK_BASE = { f0: 0.06, f0Up: 0.06, f0Leg: 0.06, mirrorF0: 0.06, fold: 0.0, foldLeg: 0.0, axis: 1.0, sweep: 1.0, lift: 0.0, elevT: 3.5, elevC: 1.0, pY: 0.80, pG: 0.25, pW: 0.0, pLeg: 0.0, pT: 4.0, pC: 0.3, kick: 0.0, kickR: 0.0, parR: 6.0, parW: 0.0, parLeg: 0.0, envG: 1.0, envW: 1.0, kickEdge: 0.0, kickEdgeR: 0.0,
    // session 9: near reflection card (materials.js KICK_GLSL): card = intensity (x glow gain, 0 = off), cardR cylinder
    // radius m, cardH ridge height (piano frame m), cardW glow decay m, cardSky lilac tail level, cardSkyW its decay m,
    // cardRidge peak amplitude m, cardLeg legs weight, cardWin camera-side window (cos)
    card: 0.0, cardR: 3.0, cardH: 0.80, cardW: 0.06, cardSky: 0.15, cardSkyW: 0.6, cardRidge: 0.05, cardLeg: 0.0, cardWin: -0.3,
    kickCone: 2.5,
    // round 2: envAll = env-grade weight on non-vertical panels (lid, rim cap, prop), envSat = saturation of the dim
    // graded env (neutral near-black instead of a lilac veil), kickFlat = kicker weight on flat panels (0 = fillets /
    // edges only), kickCurv = curvature threshold (|fwidth(normal)|) of "edge", cardFollow = share of the camera
    // elevation the card cancels (1 = band fixed on the case), cardJag = jagged ridge (1) vs two-sine dunes (0)
    envAll: 0.0, envSat: 1.0, kickFlat: 1.0, kickCurv: 0.01, cardFollow: 1.0, cardJag: 0.0,
    // session 11: cardSpine = card weight on the flat spine (bass side); envTint / cardSkyCol (arrays) default in applyLook
    cardSpine: 1.0,
    // session 11: edgeLine = warm rim light on the lid's edge band (radiance x glow gain; 0 = off), edgeMask = its
    // |n . lidUp| threshold (materials.js KICK_GLSL agEdgeL)
    edgeLine: 0.0, edgeMask: 0.5,
    // session 11: cardVar = horizontal variation of the card band along its azimuth (streaks on the convex bentside)
    cardVar: 0.0,
    // session 11: interior fill gain and its extra share for high cameras (see update())
    fillGain: 1.0, fillHigh: 0.0,
    // cycle 2: keyFold = keytop gloss weight (materials.js AG_FOLD_KEY: keytops mirror the glow band), keyEl its target
    // elevation (deg), keyElS the share of the physical elevation kept, keyF0 the keytop coat F0 (0 = three's 0.04);
    // mirHz = art-directed horizon of the planar desk / fallboard / arm mirrors (weight), mirHzG rad per m of panel
    // height, mirHzP physical share, mirHzT elevation at the panel centre (deg)
    keyFold: 0.0, keyEl: 3.0, keyElS: 0.3, keyF0: 0.0, mirHz: 0.0, mirHzG: 1.5, mirHzP: 0.3, mirHzT: 3.5,
    // cycle 2: interior fill saturation (1 = unchanged) and camera-facing share of its direction (0 = FILL_DIR)
    fillSat: 1.0, fillCam: 0.0,
    // session 13: extra fill direction / saturation share for high cameras (x the fillHigh camera-height ramp)
    fillCamHigh: 0.0, fillSatHigh: 0.0,
    // cycle 2: kicker weight on legs / lyre / bench legs over their whole cylinder (0 = edges only, as the case)
    kickLeg: 0.0,
    // cycle 2: brass pedal backdrop fold (materials.js AG_FOLD_BRASS; 0 = physical)
    brassFold: 0.0,
    // cycle 2 session 13: keyVis = keytop coat visibility floor against the fallboard / desk / torso occluders (the keytop
    // gloss is art-directed); mirCard = near reflection card in the planar mirrors (x card; 0 = off)
    keyVis: 0.0, mirCard: 0.0, mirCardArm: 0.0,
    // cycle 2 round 2: kickCap = luminance cap of the coat kicker per pixel (large = off); envUp* = up-facing env grade
    // (weight, dim-env saturation, gamma, gain; materials.js agEnvUp); fillAmb / fillAmbHigh = broad ambient share of the
    // interior fill (x the camera-height ramp for High); fillCap = luminance cap of the fill's specular / coat response;
    // cardCol / cardSkyCol may be 'sky' = the world glow's displayed hue + cardToe / cardSkyToe (displayHue above)
    kickCap: 1e4, envUp: 0.0, envUpSat: 1.0, envUpG: 1.0, envUpGain: 1.0, fillAmb: 0.0, fillAmbHigh: 0.0, fillCap: 1e4, cardToe: 0.25, cardSkyToe: 0.5,
    // keyElMax = cap of the keytop gloss target elevation (deg, 90 = off); keyAmb = warm key ambient (x the glow's displayed
    // hue with toe keyAmbToe, x glow gain; 0 = off)
    keyElMax: 90.0, keyAmb: 0.0, keyAmbToe: 0.6,
    // cardSil = weight of the REAL skyline (world.heightAt around the piano, buildSilhouette) in the card ridge instead of
    // the procedural one; cardSilK azimuth scale (> 1 = more peaks per panel), cardSilA azimuth offset (deg)
    cardSil: 0.0, cardSilK: 1.0, cardSilA: 0.0 };
  const LOOKS = {
    // session 8 (interim, out/s8_wg G1): crisp backdrop fold toward the glow azimuth (axis 0) + parallax backdrop (5 m) +
    // proxy elevation in the piano frame (2.5 deg at y 0.80, 0.35 rad/m) + env grade 1.5 on vertical panels, coat F0 0.30;
    // legs physical with their own F0 (black with warm rim lines); kicker with edge boost
    // session 9 (out/s9_k K1 tuned down): + envW 0.5, kick 5 @ 0.3, f0Up 0.35, parR 10 (out/s9_wh H6) + the near
    // reflection card (ridge 0.82 m, glow decay 45 mm): the case sides mirror a ridge silhouette with the glow band above
    // it, the upper tail (p90 / p95 / > 40) reaches the refs while the medians stay put. Kicker back to 2.5 @ 0.12
    // (out/s9_kick B: kick 5 @ 0.3 turned the r06 drone lid top cream; the wide stats barely change), cone 2.5 deg
    // round 2 (critic r2, film frames with the pianist): F0 0.30 / 0.35 greyed the lid, desk and prop into a violet
    // veil (lid deep share 0.00 vs 0.70-0.91 in refs 2 / 9). Now F0 0.10 everywhere + the env grade on every orientation
    // with a neutral dim end; the upper tail comes from the card band (no lilac sky tail, narrower, brighter, jagged
    // ridge, partly following the camera height) and the kicker without the fwidth edge boost (quad-dependent: the
    // lid edge twinkled as moving 1-2 px glints at 60 fps)
    // session 11 (out/s11_a, film frames with the pianist): the session-10 values (f0 .10, envG 1.5, envSat .35) made the
    // wides a black cut-out again (body p50 0.3-0.4x refs, deep 1.2-1.8x): PBR Neutral's toe crushes a neutral dim env.
    // Now f0 .16 / f0Up .12, gentler grade (envG 1.25), dim env neutral with a slight warm tint (envTint), a short warm
    // sky tail above the card ridge, and no card on the flat spine (cardSpine: ref 4 / S17 keeps a black bass side)
    // s11_b (08:55): f0 .20 / f0Up .14 lifted the medians toward the refs with the deep share kept (B2), the lid edge
    // line (edgeLine) reads as the refs' crisp warm lid outline; cardVar lowered the tail (not adopted)
    // cycle 2 (out/c2_a W1, after the world / LUT update of 22.10 21:24-21:42 darkened the wides: body p50-p90 0.43-0.87x,
    // S03b p75 0.43): f0 .26 / f0Up .18 (S01a mid band [3.3, 2.0, 2.7] vs ref 10 [3.4, 2.0, 2.6], deep kept 0.95-1.46x);
    // interior fill desaturated (fillSat) and turned toward the lens (fillCam) for the high / drone cameras (ref 6)
    wide: { ...LOOK_BASE, f0: 0.26, f0Up: 0.24, f0Leg: 0.10, fillSat: 0.6, fillCam: 0.6, fold: 1.0, foldLeg: 0.0, axis: 0.0, sweep: 0.6, pY: 0.80, pG: 0.35, pW: 1.0, pLeg: 0.0, pT: 2.5, pC: 0.0, kick: 3.0, kickR: 0.20, parR: 10.0, parW: 1.0, envG: 1.25, envW: 0.5, kickEdge: 0.0, kickEdgeR: 0.0,
      card: 2.0, cardR: 3.0, cardH: 0.82, cardW: 0.025, cardSky: 0.25, cardSkyW: 0.10, cardSkyCol: [1.0, 0.42, 0.28], cardRidge: 0.10, cardLeg: 0.0, cardWin: -0.3,
      envAll: 1.0, envSat: 0.2, envTint: [1.12, 1.0, 0.94], cardFollow: 0.6, cardJag: 1.0, cardSpine: 0.08, fillHigh: 2.0, fillAmbHigh: 0.3, fillCap: 0.3, fillCamHigh: 0.3, fillSatHigh: 0.25, edgeLine: 0.3,
      // cycle 2 round 2 (critic c2r2; out/c3_a, c3_b): card colours from the world glow's displayed hue (gold share of the piano
      // highlights .59-.81 -> .05-.36, refs .08-.41); kicker capped at .25 and off on flat panels (S23 / S05 key-slip / fallboard
      // / desk-rail "LED" lines: piano pixels > 200 1.7-1.9 % -> 0.00-0.05 %; S20z lid top caramel p50 83 hue 31 -> 23 hue 307);
      // up-facing lacquer keeps the sky's own hue (S17 lid top p50 3.0 -> 9.6, B/R .51 -> 1.45, ref 4 9.1 / 1.81); interior fill
      // for high cameras without hot pools (fillHigh 5.4 -> 2, broad ambient, specular cap: S05c / S20z interior > 200 306 / 2007
      // -> 0)
      cardCol: 'sky', cardSkyCol: 'sky', kickCap: 0.25, kickFlat: 0.0, envUp: 1.0, envUpSat: 1.0, envUpG: 1.0,
      // 14:08 (out/c3_d: 'sky' colours displayed as a pale beige band [77,59,47], G/R .76 B/R .61, mean L 60; refs 2 / 9 case
      // [68,29,23] / [33,17,21]): crimson-salmon card glow and a mauve-red sky tail (explicit, toe-compensated for the reflection
      // level: display G/R ~.5, B/R ~.5), dimmer (card 2.0 -> 1.3) and broader, over the REAL skyline (cardSil 1, azimuth x2:
      // jagged multi-peak ridge as in refs 2 / 9, zoom_S03b_side.jpg)
      cardCol: [1.0, 0.34, 0.30], cardSkyCol: [0.85, 0.34, 0.42], card: 1.3, cardH: 0.79, cardRidge: 0.14, cardW: 0.04, cardSky: 0.40, cardSkyW: 0.16, cardSil: 1.0, cardSilK: 2.0 },
    // session 9: kickR 0.12 - at the coat's own roughness (0.02) the 16 jittered kicker directions (6 deg cone) drew
    // rows of separate glints along the key slip / rim edge / bentside in r07, r08, r12, c_rim_edge (out/s9_close)
    // round 2: kickFlat 0 - the kicker stays on fillets / edges; flat and gently curved lacquer is a clean mirror
    // (critic r2: r08 case arm mean 122.8 / 21.6 % clipped with the kicker, 49.4 / 0 % without, ref 51.7)
    // cycle 2 (critic c2 critical: desk / arm / fallboard / case-side mirrors were black voids in every key-level close-up,
    // keytops violet matte): the close look is art-directed like the wide one. out/c2_a: the physical-elevation fold already
    // put the sunset and the ridge into the new pin-block cover mirror (x3 in crop_S06_panel_x3.png) but at F0 0.06 it read
    // black; the per-panel horizon (mirHz) mapped partly visible panels to the lake (off). Now coat / mirror F0 .25, fold 1
    // toward the glow azimuth (axis 0) with a mild proxy elevation (pT 3.5 deg, half the physical elevation, 1 rad/m about
    // 0.82 m: the rim top shows the ridge + glow, its lower part the lake, as in ref 8), the env grade of the wide look,
    // keytop gloss (S06 top-30 % keytop p50 65 -> 154, hue 306 -> 20 deg in c2_a C2), brass pedal fold, leg kicker
    // session 13 (out/c2_d K3): + the near reflection card on the close look, as a physical-style horizon (cardFollow 0:
    // the ridge sits near the camera's eye line on every vertical panel; cylinder 5 m, ridge 0.95 m, glow decay 0.10 m,
    // salmon sky tail) in the coat AND the planar mirrors (mirCard), coat / mirror F0 .35, keytop visibility floor .8.
    // c2_b -> K3: S04 keytops top-30 % p50 22 -> 74 (hue 5 deg), S04 desk p50 6.1 -> 14.7, S06 pin panel mean 21 -> 41.5
    // (> 40 15 -> 63 %, ridge + glow + snow peak mirrored as in ref 12), S09 case side 15.2 -> 24.4 (gradient 1.45 -> 2.62),
    // S24s desk 14.7 -> 33.2, S20b desk 14.3 -> 25.7, S13 side 24.5 -> 40.0 (before: f0 / mirrorF0 .25, no card keys,
    // mirCard 0, keyVis 0)
    close: { ...LOOK_BASE, f0: 0.35, f0Up: 0.12, f0Leg: 0.10, mirrorF0: 0.35, fold: 1.0, axis: 0.0, sweep: 1.0, pW: 1.0, pY: 0.82, pG: 1.0, pT: 3.5, pC: 0.5,
      envG: 1.25, envW: 0.5, envSat: 0.3, envTint: [1.12, 1.0, 0.94], kick: 1.0, kickR: 0.12, kickFlat: 0.0, kickLeg: 0.5,
      keyFold: 1.0, keyEl: 2.5, keyElS: 0.25, keyF0: 0.10, brassFold: 1.0, fillSat: 0.6, fillCam: 0.6,
      card: 1.5, cardR: 5.0, cardH: 0.95, cardW: 0.10, cardSky: 0.5, cardSkyW: 0.30, cardSkyCol: [1.0, 0.42, 0.28], cardRidge: 0.12, cardJag: 1.0, cardFollow: 0.0,
      mirCard: 1.0, keyVis: 0.8,
      // cycle 2 round 2 (critic c2r2 keytops lilac / dim; out/c3_c, top-30 % keytop luma): gloss target elevation capped at 8 deg
      // + warm key ambient (S02 overhead 37 -> 84 at keyAmb .12, B/R 1.43 -> .86; S13 73 -> 87 / S04e 68 -> 81 / S24 53 -> 65 at .06)
      keyElMax: 8.0, keyAmb: 0.14 },
    physical: { ...LOOK_BASE },
  };
  // session 13 (out/c2_c, world of 23.10 07:42): the wides need per-framing balance that camera distance cannot give
  // (S01a / S10b p75 1.44 / 1.56x the refs, S03b 0.79 / p90 0.58). 'wideHero' = wide + a taller salmon sky tail above a
  // lower ridge + backdrop streaks (c2_c T3: S03b ours/ref p50 .53 p75 .88 p90 .88 p95 .96 gt40 .87, deep 1.01) for the
  // camera module's per-shot spec of S03 (ref 2): piano: { lacquerLook: 'wideHero' } (integration glue, MODULE_ISSUES I-02)
  LOOKS.wideHero = { ...LOOKS.wide, cardSky: 0.45, cardSkyW: 0.25, cardH: 0.76, cardVar: 0.5 };
  let lookMode = opts.lacquerLook ?? 'auto';
  // look-dev only (sandbox/piano2 drivers): a look that wins over setLacquerLook, which the integration module calls
  // before every frame (scene/src/integration beforeFrame); null = off. Never set by the film path.
  let lookOverride = null;
  const piCentre = new THREE.Vector3(L.keyboard.center, 0.9, 1.2), tmpC = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const fillBase = M.shared.interior.agFill.value.clone();   // interior fill radiance before the look's gain
  // card colours as arrays: 'sky' -> the world glow's displayed hue (displayHue), missing -> the session-9 defaults
  // (cardCol = the glow hue, cardSkyCol = lilac); resolved before the auto blend so both presets blend element-wise
  function resolveCols(o) {
    const col = (v, toe, def) => (v === 'sky' ? displayHue(kickRad, toe) : (Array.isArray(v) ? v : def));
    return { ...o, cardCol: col(o.cardCol, o.cardToe ?? 0.25, kickHue.toArray()), cardSkyCol: col(o.cardSkyCol, o.cardSkyToe ?? 0.5, [0.62, 0.50, 0.85]) };
  }
  function applyLook(o0) {
    const U = M.shared.lacquer, o = { ...LOOK_BASE, ...o0 };
    U.agCoatUp.value.x = o.f0Up ?? o.f0; U.agCoatLeg.value = o.f0Leg ?? o.f0; U.agKickRough.value = o.kickR;
    U.agPar.value.set(o.parR, o.parW, o.parLeg, 0); U.agEnvG.value.set(o.envG, o.envW, o.envAll ?? 0, o.envSat ?? 1); U.agKickEdge.value.set(o.kickEdge, o.kickEdgeR, o.kickFlat ?? 1, o.kickCurv ?? 0.01);
    U.agCard3.value.set(o.cardFollow ?? 1, o.cardJag ?? 0, o.cardSpine ?? 1, o.cardVar ?? 0);
    U.agEnvTint.value.set(...(o.envTint || [1, 1, 1]));
    U.agEdgeL.value.x = (o.edgeLine ?? 0) * kickGain; U.agEdgeL.value.y = o.edgeMask ?? 0.5;
    // round 2 (session 11): the card's sky tail colour (look key cardSkyCol, linear RGB); default the session-9 lilac.
    // Refs 2 / 10: the case side mirrors the warm salmon sky above the ridge, not the lilac zenith
    U.agProxy.value.set(o.pY, o.pG, o.pW, o.pLeg); U.agProxyE.value.set(THREE.MathUtils.degToRad(o.pT), o.pC);
    U.agCoatF0.value = o.f0; U.agFoldK.value = o.fold; U.agFoldLegK.value = o.foldLeg ?? 0; U.agFoldView.value = o.axis; U.agBackS.value = o.sweep;
    if (o.ny) U.agFoldNy.value.set(o.ny[0], o.ny[1]);
    U.agLift.value = Math.tan(THREE.MathUtils.degToRad(o.lift)); U.agElevT.value = THREE.MathUtils.degToRad(o.elevT ?? 3.5); U.agElevC.value = o.elevC ?? 1.0; U.agMirrorF0.value = o.mirrorF0 ?? o.f0; U.agKickCol.value.copy(kickHue).multiplyScalar(o.kick * kickGain);
    U.agCard.value.set(o.card * kickGain, o.cardR, o.cardH, Math.max(o.cardW, 1e-3)); U.agCard2.value.set(o.cardSky, Math.max(o.cardSkyW, 1e-3), o.cardRidge, o.cardLeg);
    { const r = resolveCols(o); U.agCardCol.value.set(...r.cardCol); U.agCardSky.value.set(...r.cardSkyCol); }
    U.agKickCap.value = o.kickCap ?? 1e4;
    U.agSilW.value.set(silReady ? (o.cardSil ?? 0) : 0, o.cardSilK ?? 1, THREE.MathUtils.degToRad(o.cardSilA ?? 0), 0);
    U.agKeyF2.value.x = THREE.MathUtils.degToRad(o.keyElMax ?? 90);
    { const a = (o.keyAmb ?? 0) * kickGain, h = a > 0 ? displayHue(kickRad, o.keyAmbToe ?? 0.6) : [0, 0, 0]; U.agKeyAmb.value.set(h[0] * a, h[1] * a, h[2] * a, 0); }
    U.agEnvUp.value.set(o.envUp ?? 0, o.envUpSat ?? 1, o.envUpG ?? 1, o.envUpGain ?? 1);
    U.agCardWin.value = o.cardWin; kickCone = kickCone0 ?? o.kickCone ?? 2.5;
    U.agKickLeg.value = o.kickLeg ?? 0; U.agBrassF.value = o.brassFold ?? 0;
    U.agKeyF.value.set(o.keyFold ?? 0, THREE.MathUtils.degToRad(o.keyEl ?? 3), o.keyElS ?? 0.3, o.keyF0 ?? 0);
    U.agMirHz.value.set(o.mirHz ?? 0, o.mirHzG ?? 1.5, o.mirHzP ?? 0.3, THREE.MathUtils.degToRad(o.mirHzT ?? 3.5));
    U.agKeyV.value = o.keyVis ?? 0; U.agMirCard.value = o.mirCard ?? 0; U.agMirCardArm.value = o.mirCardArm ?? 0;
  }
  // an object look may name a preset to start from: { base: 'wide', f0Up: 0.06 } (per-shot looks in camera/shots.js)
  const fromObj = (o) => ({ ...LOOK_BASE, ...(o.base && LOOKS[o.base] ? LOOKS[o.base] : {}), ...o });
  function lookFor(cam) {
    // cycle 2 round 2: an object look with base 'auto' = the production distance blend plus its overrides (look-dev A/B)
    if (lookOverride) return lookOverride.base === 'auto' ? { ...autoLook(cam), ...lookOverride } : fromObj(lookOverride);
    if (lookMode === 'manual') return null;
    if (typeof lookMode === 'object' && lookMode) return lookMode.base === 'auto' ? { ...autoLook(cam), ...lookMode } : fromObj(lookMode);
    if (LOOKS[lookMode]) return LOOKS[lookMode];
    return autoLook(cam);
  }
  function autoLook(cam) {
    if (!cam) return LOOKS.wide;
    tmpC.setFromMatrixPosition(cam.matrixWorld); tmpP.copy(piCentre); body.localToWorld(tmpP);
    const t = smooth(tmpC.distanceTo(tmpP), 2.5, 6.0), a = resolveCols(LOOKS.close), b = resolveCols(LOOKS.wide), o = {};
    // session 11: blend the UNION of keys (a wide-only key used to be dropped) and colour arrays element-wise
    // (envTint, cardSkyCol); a key missing in one preset blends from its LOOK_BASE default
    const DEF = { envTint: [1, 1, 1], cardSkyCol: [0.62, 0.50, 0.85] };
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[k] ?? LOOK_BASE[k] ?? DEF[k], vb = b[k] ?? LOOK_BASE[k] ?? DEF[k];
      if (Array.isArray(va) || Array.isArray(vb)) { const A = va || DEF[k], B = vb || DEF[k]; o[k] = A.map((x, i) => x + (B[i] - x) * t); }
      // luminance caps (kickCap, fillCap; 1e4 = off) blend in log space, so a cap fades in continuously with distance
      else if (typeof va === 'number' && typeof vb === 'number') o[k] = /Cap$/.test(k) && va > 0 && vb > 0 ? Math.exp(Math.log(va) + (Math.log(vb) - Math.log(va)) * t) : va + (vb - va) * t;
      else o[k] = t < 0.5 ? va : vb;
    }
    return o;
  }

  // ---------------------------------------------------------------- perf tracks (optional)
  const readTracks = typeof opts.tracks === 'function' ? opts.tracks
    : makeTrackReader(ctx.data && ctx.data.perfMeta, ctx.data && ctx.data.perf, ctx.MUSIC_OFFSET ?? 4.0);
  // round 2 (critic r2 process (a)): look-dev poses must win over the solver tracks. opts.tracks === false or
  // setTracksEnabled(false) keeps update() from overwriting setPose() / the setters (production default: on)
  let tracksOn = opts.tracks !== false;

  const api = {
    group,
    parent: 'rig',
    probe,
    layout: L,
    materials: M,
    strings: SS,
    parts: { case: caseParts, keys, interior, strings, action, legs, bench },
    /** hammer angle (rad) at string contact / at check, per note index 0..87 */
    hammerStrikeAngles: Float32Array.from(action.hammers.map((h) => h.strikeAng)),
    hammerCheckAngles: Float32Array.from(action.hammers.map((h) => h.checkAng)),
    setKeyAngles(a) { state.keyAngles.set(a); },
    setHammerAngles(a) { state.hammer = a ? Float32Array.from(a) : null; },
    setDamperLifts(a) { state.damper = a ? Float32Array.from(a) : null; },
    setPedals(a) { state.pedals = [a[0] || 0, a[1] || 0, a[2] || 0]; },
    setLidAngle(deg) { state.lidDeg = deg; },
    setUnaCorda(f) { state.unaCorda = f === null || f === undefined ? null : f; },
    setBenchHeight(h) { state.benchHeight = h; },
    setPose,
    /** look-dev: false = ignore the perf tracks (setPose / the setters win); true = production (tracks drive the action) */
    setTracksEnabled(on) { tracksOn = !!on; },
    /** interior fill radiance, linear RGB (docs/PIANO.md); [0,0,0] turns it off */
    setInteriorFill(rgb) { fillBase.set(rgb[0], rgb[1], rgb[2]); M.shared.interior.agFill.value.copy(fillBase); },
    /** clear-coat reflectance at normal incidence (default 0.06 ~ n 1.65; 0.04 = n 1.5); lacquer + planar mirrors */
    setLacquerF0(f) { lookMode = 'manual'; M.shared.lacquer.agCoatF0.value = f; },
    /** coat F0 of the planar desk / lid mirrors (default physical 0.06; the wide look keeps them physical) */
    setMirrorF0(f) { lookMode = 'manual'; M.shared.lacquer.agMirrorF0.value = f; },
    /** elevation compression of near-horizontal lacquer reflections toward the ridge line (deg, factor; 1 = off) */
    setReflectionElev(targetDeg, factor) { lookMode = 'manual'; M.shared.lacquer.agElevT.value = THREE.MathUtils.degToRad(targetDeg); M.shared.lacquer.agElevC.value = factor; },
    /** art-directed reflection fold 0..1 (0 = physical; 1 = lacquer reflections show the sun side), docs/PIANO.md */
    setReflectionFold(k, axis, sweep) { lookMode = 'manual'; const U = M.shared.lacquer; U.agFoldK.value = k; if (axis !== undefined && axis !== null) U.agFoldView.value = axis === 'sun' ? 0 : (axis === 'view' ? 1 : +axis); if (sweep !== undefined) U.agBackS.value = sweep; },
    /** art-directed lift (deg) of near-horizontal lacquer reflections over the ridge line (0 = physical) */
    setReflectionLift(deg) { lookMode = 'manual'; M.shared.lacquer.agLift.value = Math.tan(THREE.MathUtils.degToRad(deg)); },
    /** coat-only kicker radiance from the glow (linear RGB); [0,0,0] = off */
    setKicker(rgb) { lookMode = 'manual'; M.shared.lacquer.agKickCol.value.set(rgb[0], rgb[1], rgb[2]); },
    /** lacquer look: 'auto' (default: by camera distance), 'wide', 'close', 'physical', or {f0, fold, axis, sweep, lift, kick} */
    setLacquerLook(mode) { lookMode = mode; },
    /** look-dev drivers only: a look object that overrides setLacquerLook (the integration resets that per frame) */
    setLookOverride(o) { lookOverride = o || null; },
    get lacquerLooks() { return LOOKS; },
    get mirrors() { return { desk: deskMirror, lid: lidMirror, fallboard: fbMirror, pinPanel: pinMirror, armTreble: armMirrors[0] || null, armBass: armMirrors[1] || null }; },
    /**
     * Per sub-frame (core contract). With perf tracks present, samples them at the sub-frame time (sub.time, film
     * seconds) and drives keys, hammers, dampers and pedals; otherwise applies whatever the setters last received.
     * Pure function of t: nothing here reads a clock.
     */
    update(t, sub) {
      if (readTracks && tracksOn) {
        const tr = readTracks(sub && typeof sub.time === 'number' ? sub.time : t);
        if (tr) {
          state.keyAngles.set(tr.keys);
          state.hammer = tr.hammers || null; state.damper = tr.dampers || null;
          if (tr.pedals) state.pedals = [tr.pedals[0], tr.pedals[1], tr.pedals[2]];
        }
      }
      apply();
      if (!silTried) buildSilhouette();
      updateKickFrame();
      const cam = (sub && sub.camera) || ctx.camera || null;
      body.updateWorldMatrix(true, false); M.shared.lacquer.agParC.value.copy(piCentre).applyMatrix4(body.matrixWorld);   // parallax backdrop centre (world)
      { const lk = lookFor(cam); if (lk) applyLook(lk);
        // session 11 (critic r2: S05 end / S23 at 2.0-2.6 m showed a dim interior where refs 11 / 5 are brightest in
        // the gold interior): interior fill x fillGain x (1 + fillHigh * smoothstep(1.4, 2.4, camera height above the
        // piano's floor in the piano frame)). Pure function of the camera pose and the look
        const o = lk ? { ...LOOK_BASE, ...lk } : LOOK_BASE;
        let g = o.fillGain ?? 1, hHigh = 0;
        if (cam) { tmpC.setFromMatrixPosition(cam.matrixWorld); body.worldToLocal(tmpC); hHigh = smooth(tmpC.y, 1.4, 2.4); }
        if ((o.fillHigh ?? 0) > 0) g *= 1 + o.fillHigh * hHigh;
        M.shared.interior.agFill.value.copy(fillBase).multiplyScalar(g);
        // cycle 2 round 2: broad ambient share + luminance cap of the fill's specular (materials.js FILL_GLSL_FN)
        M.shared.interior.agFillAmb.value = (o.fillAmb ?? 0) + (o.fillAmbHigh ?? 0) * hHigh;
        M.shared.interior.agFillCap.value = o.fillCap ?? 1e4;
        // cycle 2 (critic c2: S20 / S20z interior = flat orange-brown murk without glints, ref 6 interior p99 154): fillSat
        // desaturates the fill toward its luminance (1 = unchanged); fillCam swings the fill direction toward the mirror image
        // of the camera about the vertical (the plate, string and pin crowns then send their specular lobe to the lens,
        // thin warm lines as in refs 6 / 11). Pure functions of the camera pose and the look
        // session 13 (out/c2_e I3, S20z ref-6 drone: interior p99 39 -> 235, gradient p99 18 -> 103, top-25 % saturation
        // .78 -> .42; ref 6: 154 / 58 / .48): for high cameras the fill turns further toward the lens (fillCamHigh) and keeps
        // more of its gold (fillSatHigh), both x the same camera-height ramp as fillHigh; low cameras are unchanged
        const fs_ = Math.min(1, (o.fillSat ?? 1) + (o.fillSatHigh ?? 0) * hHigh); if (fs_ < 0.999) { const F = M.shared.interior.agFill.value, l = 0.2126 * F.x + 0.7152 * F.y + 0.0722 * F.z; F.set(l + (F.x - l) * fs_, l + (F.y - l) * fs_, l + (F.z - l) * fs_); }
        fillDc.copy(fillD);
        const fc_ = Math.min(1, (o.fillCam ?? 0) + (o.fillCamHigh ?? 0) * hHigh);
        if (cam && fc_ > 0) { tmpC.setFromMatrixPosition(cam.matrixWorld); body.worldToLocal(tmpC); tmpC.sub(piLocal); tmpC.set(-tmpC.x, Math.abs(tmpC.y) + 0.3, -tmpC.z).normalize(); fillDc.lerp(tmpC, fc_).normalize(); }
        fillTc.crossVectors(fillDc, Math.abs(fillDc.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize(); fillBc.crossVectors(fillDc, fillTc).normalize();
      }
      if (deskMirror) deskMirror.update(cam, deskMode);
      if (lidMirror) lidMirror.update(cam, lidMode);
      if (fbMirror) fbMirror.update(cam, fbMode);
      if (pinMirror) pinMirror.update(cam, pinMode);
      for (const am of armMirrors) am.update(cam, armMode);
      if (deskMirror || lidMirror || fbMirror || pinMirror || armMirrors.length) layerPianist();
      { const pn = ctx.modules && ctx.modules.pianist; M.shared.near.agPianistOn.value = pn && pn.group && pn.group.visible !== false ? 1 : 0; }
      // soft interior fill + coat kicker: jitter each light direction over a cone per sub-frame (soft area lights after
      // accumulation). Samples: the core's stratified module dims (sub.dim pairs (0,1) fill, (2,3) kicker; decorrelated
      // from time, pixel jitter and aperture by the core, RENDERING.md / core/rng.js); without the core (Node tools) a
      // rotated Halton sequence on sub.k. Pure functions of (frame, k, N) either way.
      const live = sub && typeof sub.k === 'number' && sub.k >= 0;
      const dims = live && typeof sub.dim === 'function';
      const fd = M.shared.interior.agFillDir.value, fdL = M.shared.interior.agFillDirL.value;
      if (live) {
        const u = dims ? sub.dim(0) : (halton(sub.k + 1, 5) + 0.318) % 1, v = dims ? sub.dim(1) : (halton(sub.k + 1, 7) + 0.613) % 1;
        const r = Math.tan(THREE.MathUtils.degToRad(fillCone)) * Math.sqrt(u), a = 2 * Math.PI * v;
        fd.copy(fillDc).addScaledVector(fillTc, r * Math.cos(a)).addScaledVector(fillBc, r * Math.sin(a)).normalize();
        // the lacquers' coat lobe of the fill: same jitter about the BASE direction (no fillCam swing; critic c2r2 S14)
        fdL.copy(fillD).addScaledVector(fillT, r * Math.cos(a)).addScaledVector(fillB, r * Math.sin(a)).normalize();
      } else { fd.copy(fillDc); fdL.copy(fillD); }
      const kd = M.shared.lacquer.agKickDirW.value;
      if (live) {
        const u = dims ? sub.dim(2) : (halton(sub.k + 1, 11) + 0.137) % 1, v = dims ? sub.dim(3) : (halton(sub.k + 1, 13) + 0.771) % 1;
        const r = Math.tan(THREE.MathUtils.degToRad(kickCone)) * Math.sqrt(u), a = 2 * Math.PI * v;
        kd.copy(kickD).addScaledVector(kickT, r * Math.cos(a)).addScaledVector(kickB, r * Math.sin(a)).normalize();
      } else kd.copy(kickD);
    },
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); Object.values(M).forEach((m) => m && m.dispose && m.dispose()); if (probe) probe.dispose(); },
  };
  if (opts.debugGlobal) globalThis.__agPiano = api;   // look-dev drivers only (sandbox/piano2/shots.mjs)
  return api;
}
