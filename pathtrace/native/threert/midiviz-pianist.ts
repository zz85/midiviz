// The frame pathtrace/desktop exports (node run.mjs --export), as a ThreeRT scene. threert.sh copies this file
// and the export's scene.json into a ThreeRT checkout's scenes/ folder and bundles it there.
//
// - Units: the export is in centimetres, ThreeRT in metres. The model is scaled by 0.01, and each spot light's
//   candela by 1e-4, so the illuminance stays the same at a hundredth of the distance.
// - Left out: the environment map. ThreeRT's native renderer refuses HDRI environments ("not supported by the
//   native renderer yet"), so the stage is lit by its six lights alone and looks darker than the page.
// - Exposure: three.js at exposure 1 shows radiance as it is; ThreeRT takes EV100, where 1 / (1.2 * 2^EV) is
//   the same scale.
import { Scene, PerspectiveCamera, GLTFModel, SpotLight, RectAreaLight, PointLight, Object3D } from "@threert/scene";
import meta from "./midiviz-pianist.json" with { type: "json" };

const CM = 0.01;
const hex = (c: number[]) => c.reduce((a, v) => a * 256 + Math.round(Math.min(1, Math.max(0, v)) * 255), 0);

export default function build() {
  const scene = new Scene();
  const model = new GLTFModel("scene.glb");
  model.scale.set(CM, CM, CM);
  scene.add(model);

  for (const l of meta.lights as any[]) {
    if (l.kind === "spot") {
      const s = new SpotLight(hex(l.color), l.intensity * CM * CM, 0, l.angle, l.penumbra, 2);
      s.position.set(l.position[0] * CM, l.position[1] * CM, l.position[2] * CM);
      s.radius = (l.radius || 0) * CM;
      const t = new Object3D();
      t.position.set(l.target[0] * CM, l.target[1] * CM, l.target[2] * CM);
      s.target = t;
      scene.add(s);
    } else if (l.kind === "rect") {
      const m = l.matrix; // column-major world matrix; the light faces its local -Z, as in three.js
      const r = new RectAreaLight(hex(l.color), l.intensity, l.width * CM, l.height * CM);
      r.position.set(m[12] * CM, m[13] * CM, m[14] * CM);
      r.lookAt((m[12] - m[8] * 100) * CM, (m[13] - m[9] * 100) * CM, (m[14] - m[10] * 100) * CM);
      r.card = false;
      scene.add(r);
    } else if (l.kind === "point") {
      const p = new PointLight(hex(l.color), l.intensity * CM * CM);
      p.position.set(l.position[0] * CM, l.position[1] * CM, l.position[2] * CM);
      scene.add(p);
    }
  }

  const c = meta.camera, m = c.matrixWorld;
  const camera = new PerspectiveCamera(c.fov, c.aspect, c.near * CM, c.far * CM);
  camera.position.set(m[12] * CM, m[13] * CM, m[14] * CM);
  camera.lookAt((m[12] - m[8] * 100) * CM, (m[13] - m[9] * 100) * CM, (m[14] - m[10] * 100) * CM);
  camera.setManualExposure(Math.log2(1 / (1.2 * (meta.exposure || 1))));
  scene.add(camera);
  return { scene, camera, options: { name: "midiviz-pianist" } };
}
