// Shadow map for the interior fill light (critic round 1: the unshadowed fill made the interior flat - struts cast no
// shadows on the strings and soundboard, ~240 tuning pins, agraffes, bolts and 67 damper heads stood on a uniform field).
// One orthographic depth pass of the piano's own interior (layer FILL_SHADOW_LAYER: case, rim, plate, strings, action,
// desk, prop; not the lid, which is the light's "source", legs or bench) along the fill direction, re-rendered every
// sub-frame with the jittered fill direction, so the 3x3 PCF penumbrae soften after accumulation like an area light.
// Pure function of the inputs (pose + fill direction); no clocks, no randomness.
import * as THREE from 'three';

export const FILL_SHADOW_LAYER = 9;

export function createFillShadow(renderer, { size = 2048 } = {}) {
  const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, stencilBuffer: false, type: THREE.UnsignedByteType });
  rt.texture.generateMipmaps = false;
  rt.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
  rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  cam.layers.set(FILL_SHADOW_LAYER);
  const depthMat = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const matrix = new THREE.Matrix4();
  const tmp = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), fwd = new THREE.Vector3(), c = new THREE.Vector3();
  const clear = new THREE.Color();

  /**
   * dirW: unit vector toward the light (world); cornersW: world points that must be covered (the case box).
   * Renders the depth pass into rt and returns the world -> [0,1]^3 shadow matrix.
   */
  function render(scene, dirW, cornersW) {
    c.set(0, 0, 0); for (const p of cornersW) c.add(p); c.multiplyScalar(1 / cornersW.length);
    fwd.copy(dirW).negate().normalize();
    const ref = Math.abs(fwd.y) < 0.95 ? tmp.set(0, 1, 0) : tmp.set(1, 0, 0);
    right.crossVectors(fwd, ref).normalize(); upv.crossVectors(right, fwd).normalize();
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9, w0 = 1e9, w1 = -1e9;
    for (const p of cornersW) {
      tmp.copy(p).sub(c);
      const u = tmp.dot(right), v = tmp.dot(upv), w = tmp.dot(fwd);
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); w0 = Math.min(w0, w); w1 = Math.max(w1, w);
    }
    const back = 3.0;                                  // camera 3 m behind the box centre, toward the light
    cam.position.copy(c).addScaledVector(fwd, -back);
    cam.up.copy(upv); cam.lookAt(c);
    cam.left = u0 - 0.01; cam.right = u1 + 0.01; cam.top = v1 + 0.01; cam.bottom = v0 - 0.01;
    cam.near = Math.max(0.01, back + w0 - 0.05); cam.far = back + w1 + 0.05;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);

    const prevRT = renderer.getRenderTarget(); renderer.getClearColor(clear); const ca = renderer.getClearAlpha();
    const bg = scene.background, ov = scene.overrideMaterial, sm = renderer.shadowMap.enabled, ac = renderer.autoClear;
    scene.background = null; scene.overrideMaterial = depthMat; renderer.shadowMap.enabled = false; renderer.autoClear = false;
    try {
      renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 1); renderer.clear(true, true, false);
      renderer.render(scene, cam);
    } finally {
      scene.background = bg; scene.overrideMaterial = ov; renderer.shadowMap.enabled = sm; renderer.autoClear = ac;
      renderer.setRenderTarget(prevRT); renderer.setClearColor(clear, ca);
    }
    matrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).premultiply(bias);
    return matrix;
  }
  return { rt, cam, texture: rt.depthTexture, size, render, dispose() { rt.dispose(); depthMat.dispose(); } };
}
