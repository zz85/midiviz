// The frame the page encodes for the native renderers (pathtrace/native-scene.js: MuTracer's own conversion of
// the page's snapshot, the scene the mu-* engines trace) as a ThreeRT scene. Nothing here is particular to a
// scene: pathtrace/desktop/native.cjs puts the scene in front of this script's bundle as
// globalThis.__MIDIVIZ_SCENE (scene.json) and __MIDIVIZ_BIN (scene.bin, base64), since ThreeRT's scripts can't
// read files, and this builds whatever it holds.
//
// - Units: the page's centimetres become ThreeRT's metres. Positions and distances × 0.01; spot and point
//   intensities (candela, inverse-square) × 1e-4, so the illuminance stays; rect lights (nits), emission and
//   directional lights keep theirs.
// - Materials: MuTracer's OpenPBR values back under the three.js names ThreeRT's materials take (fromTHREE.js
//   maps color → baseColor, roughness → specularRoughness, clearcoat → coatWeight, …). What ThreeRT has no
//   counterpart for is listed as left out (sheen as fuzz, specular colour, thin film, anisotropy, subsurface, …).
// - Colours stay linear: ThreeRT reads [r, g, b] as linear and hex as sRGB.
// - Textures: RGBA8. ThreeRT puts a DataTexture's row 0 at v = 1, three.js and MuTracer at v = 0 unless flipY,
//   so rows are flipped where flipY is off. Data maps (normal, roughness, …) go in as linear, colour maps in the
//   colour space the page reads them in; floats (bytes the page reads as linear) go back to bytes.
// - No environment map: ThreeRT's native renderer refuses HDRI environments.
import {
  Scene, Group, PerspectiveCamera, Mesh, BufferGeometry, BufferAttribute, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  DataTexture, SpotLight, RectAreaLight, PointLight, DirectionalLight, Object3D, Matrix4, Vector3,
} from "@threert/scene";

declare const __MIDIVIZ_SCENE: any;
declare const __MIDIVIZ_BIN: string;
const CM = 0.01;
const SRGB_SLOTS = new Set(["map", "emissiveMap", "fuzzColorMap", "specularColorMap"]);

export default function build() {
  const S = __MIDIVIZ_SCENE;
  const bin: Uint8Array = (Uint8Array as any).fromBase64(__MIDIVIZ_BIN);
  const f32 = (r: any) => new Float32Array(bin.buffer, bin.byteOffset + r.o, r.n);
  const u32 = (r: any) => new Uint32Array(bin.buffer, bin.byteOffset + r.o, r.n);
  const leftOut = new Set<string>(S.leftOut || []);

  // ── textures: one DataTexture per (texture, colour space) ──
  const pixels = new Map<number, Uint8Array>();
  const rgba8 = (i: number) => {
    if (pixels.has(i)) return pixels.get(i)!;
    const t = S.textures[i], n = t.width * t.height * 4;
    let src: ArrayLike<number> = t.storage === "rgba32f" ? f32(t.data) : bin.subarray(t.data.o, t.data.o + n);
    const px = new Uint8Array(n), row = t.width * 4, float = t.storage === "rgba32f";
    for (let y = 0; y < t.height; y++) {
      const from = (t.flipY ? y : t.height - 1 - y) * row, to = y * row;
      if (float) for (let x = 0; x < row; x++) px[to + x] = Math.max(0, Math.min(255, Math.round((src as Float32Array)[from + x] * 255)));
      else px.set((src as Uint8Array).subarray(from, from + row), to);
    }
    pixels.set(i, px);
    return px;
  };
  const made = new Map<string, DataTexture>();
  const texture = (i: number | null | undefined, slot: string) => {
    if (i == null) return null;
    const t = S.textures[i];
    const space = SRGB_SLOTS.has(slot) && !t.linear && t.storage !== "rgba32f" ? "srgb" : "linear";
    const key = i + space;
    if (made.has(key)) return made.get(key)!;
    const d = new DataTexture(t.width, t.height, rgba8(i), space);
    d.repeat = [t.uvScale[0], t.uvScale[1]];
    d.offset = [t.uvOffset[0], t.uvOffset[1]];
    d.wrap = t.wrapS === "clamp-to-edge" ? "clamp" : "repeat";
    if (t.wrapS === "mirrored-repeat" || t.wrapT === "mirrored-repeat") leftOut.add("mirrored texture wrap");
    if (t.wrapS !== t.wrapT) leftOut.add("different S and T wraps");
    if (t.uvChannel === 1) leftOut.add("second UV set");
    made.set(key, d);
    return d;
  };

  // ── materials: OpenPBR back to three.js names ──
  const usesColors = new Set<number>();
  for (const me of S.meshes) if (S.geometries[me.geometry].color) for (const m of me.materials) usesColors.add(m);
  const materials = S.materials.map((m: any, i: number) => {
    const P = { ...S.materialDefaults, ...m.props }, M = m.maps, map = (k: string) => texture(M[k], k);
    const side = P.doubleSided ? "double" : "front";
    if (P.unlit) return new MeshBasicMaterial({ name: m.name, color: P.baseColor, map: map("map"), side, vertexColors: usesColors.has(i) });
    const p: any = {
      name: m.name, color: P.baseColor, roughness: P.specularRoughness, metalness: P.baseMetalness,
      emissive: P.emissionColor, emissiveIntensity: P.emissionLuminance, opacity: P.opacity,
      map: map("map"), normalMap: map("normalMap"), normalScale: P.normalScale, emissiveMap: map("emissiveMap"),
      roughnessMap: map("roughnessMap") ?? map("metallicRoughnessMap"), metalnessMap: map("metalnessMap") ?? map("metallicRoughnessMap"),
      alphaTest: P.alphaMode === "mask" ? P.alphaCutoff : 0, transparent: P.alphaMode === "blend", side, vertexColors: usesColors.has(i),
    };
    const physical = { clearcoat: P.coatWeight || 0, clearcoatRoughness: P.coatRoughness || 0, transmission: P.transmissionWeight || 0,
      transmissionMap: map("transmissionMap"), ior: P.specularIor ?? 1.5, specularIntensity: P.specularWeight ?? 1 };
    const isPhysical = physical.clearcoat > 0 || physical.transmission > 0 || physical.ior !== 1.5 || physical.specularIntensity !== 1;
    if (P.fuzzWeight > 0) leftOut.add("sheen (OpenPBR fuzz)");
    if (P.specularColor && P.specularColor.some((c: number) => c !== 1)) leftOut.add("specular colour");
    if (P.thinFilmWeight > 0) leftOut.add("thin film (iridescence)");
    if (P.specularAnisotropy > 0 || P.coatAnisotropy > 0) leftOut.add("anisotropy");
    if (P.subsurfaceWeight > 0) leftOut.add("subsurface");
    if (P.coatColor && P.coatColor.some((c: number) => c !== 1) && P.coatWeight > 0) leftOut.add("coat colour");
    for (const k of ["alphaMap", "coatNormalMap", "coatWeightMap", "coatRoughnessMap", "fuzzColorMap", "fuzzRoughnessMap", "specularColorMap", "specularWeightMap", "anisotropyMap", "thinFilmMap", "displacementMap"])
      if (M[k] != null) leftOut.add(k);
    return isPhysical ? new MeshPhysicalMaterial({ ...p, ...physical }) : new MeshStandardMaterial(p);
  });

  // ── geometry: built once per geometry, placed by each mesh's world matrix ──
  const geometries = new Map<number, BufferGeometry>();
  const geometry = (i: number, nMaterials: number) => {
    if (geometries.has(i)) return geometries.get(i)!;
    const e = S.geometries[i], g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(f32(e.position), 3));
    if (e.normal) g.setAttribute("normal", new BufferAttribute(f32(e.normal), 3));
    if (e.uv) g.setAttribute("uv", new BufferAttribute(f32(e.uv), 2));
    if (e.color) g.setAttribute("color", new BufferAttribute(f32(e.color), e.color.itemSize));
    const idx = u32(e.indices);
    g.setIndex(new BufferAttribute(idx, 1));
    if (!e.normal) g.computeVertexNormals();
    // a per-vertex material table becomes groups of triangles (by each triangle's first vertex)
    if (nMaterials > 1 && e.materialIndex) {
      const mi = u32(e.materialIndex);
      let start = 0;
      for (let t = 3; t <= idx.length; t += 3) if (t === idx.length || mi[idx[t]] !== mi[idx[start]]) { g.addGroup(start, t - start, mi[idx[start]]); start = t; }
    }
    geometries.set(i, g);
    return g;
  };

  const scene = new Scene();
  const root = new Group();
  root.scale.set(CM, CM, CM);
  scene.add(root);
  const m4 = new Matrix4();
  for (const me of S.meshes) {
    const ms = me.materials.map((i: number) => materials[i]);
    const mesh = new Mesh(geometry(me.geometry, ms.length), ms.length > 1 ? ms : ms[0]);
    m4.fromArray(me.transform).decompose(mesh.position, mesh.quaternion, mesh.scale);
    root.add(mesh);
  }

  // ── lights: emit along their local -Z ──
  const scale = new Vector3();
  for (const l of S.lights) {
    const e = l.transform, at = (o: Object3D) => { m4.fromArray(e).decompose(o.position, o.quaternion, scale); o.position.multiplyScalar(CM); };
    const target = () => { const t = new Object3D(); t.position.set((e[12] - e[8]) * CM, (e[13] - e[9]) * CM, (e[14] - e[10]) * CM); return t; };
    switch (l.type) {
      case "SpotLight": {
        const outer = (l.outerAngle * Math.PI) / 180, inner = (Math.min(l.innerAngle, l.outerAngle) * Math.PI) / 180;
        const s = new SpotLight(l.color, l.intensity * CM * CM, 0, outer, outer > 0 ? 1 - inner / outer : 0, 2);
        s.radius = l.radius * CM;
        at(s); s.target = target();
        scene.add(s);
        break;
      }
      case "RectLight": {
        const r = new RectAreaLight(l.color, l.intensity, l.size[0] * CM, l.size[1] * CM);
        at(r);
        (r as any).card = false;
        if (l.texture != null) leftOut.add("textured rect lights");
        scene.add(r);
        break;
      }
      case "SphereLight": {
        const p = new PointLight(l.color, l.intensity * CM * CM, 0, 2);
        p.radius = l.radius * CM;
        at(p);
        scene.add(p);
        break;
      }
      case "DirectionalLight": {
        const d = new DirectionalLight(l.color, l.intensity);
        at(d); d.target = target();
        scene.add(d);
        break;
      }
      default: leftOut.add(`${l.type}`);
    }
  }
  if (S.environment) leftOut.add("environment map (ThreeRT's native renderer takes no HDRI)");

  // ── camera ──
  const c = S.camera;
  const camera = new PerspectiveCamera(c.fov, c.aspect, c.near * CM, c.far * CM);
  m4.fromArray(c.transform).decompose(camera.position, camera.quaternion, scale);
  camera.position.multiplyScalar(CM);
  if (c.fStop > 0) camera.dof = { focusDistance: c.focusDistance * c.metersPerUnit, fStop: c.fStop, sensorWidth: c.sensorHeight * c.aspect };
  // three.js at exposure 1 shows radiance as it is; ThreeRT takes EV100, where 1 / (1.2 · 2^EV) is the same scale
  camera.setManualExposure(Math.log2(1 / (1.2 * (S.display?.exposure || 1))));
  scene.add(camera);
  if (S.display?.toneMapping === "linear") leftOut.add("linear output (ThreeRT applies its own tone curve)");
  if (leftOut.size) console.warn("midiviz left out: " + [...leftOut].join("; "));
  return { scene, camera, options: { name: "midiviz" } };
}
