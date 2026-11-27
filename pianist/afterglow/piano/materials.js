// Piano materials (research/piano.md section 11): MeshPhysicalMaterial everywhere, linear workflow.
// Micro-surface detail is procedural and deterministic: world/object-space gradient noise injected with
// onBeforeCompile (orange-peel clearcoat, cast-iron plate bump, felt fibres, leather grain, spruce grain colour),
// plus one generated normal map for the helical copper winding. No textures are downloaded.
//
// Occlusion (the scene is lit by image-based light only, which three.js does not occlude):
//  - 'interior': analytic sky-slit visibility in the piano frame. Inside the case the visible sky is the wedge between
//    the treble-side rim top and the raised lid's open edge (or the spine rim top); cosine-weighted for the surface
//    normal, applied to indirect diffuse/specular/clearcoat/sheen like three's aoMap. Outside the case it is 1.
//  - 'keys': key side faces are occluded by the neighbouring key up to the neighbour's (rotated) top, so the gaps are dark
//    at rest and a pressed key exposes its neighbours' sides (uniform array of the 88 key angles).
import * as THREE from 'three';

const srgb = (hex) => new THREE.Color(hex);              // THREE.Color(hex) converts sRGB hex -> linear working space
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

// ---------------------------------------------------------------------------------------------- GLSL snippets
const NOISE_GLSL = /* glsl */`
uint agPcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float agHash3(vec3 p) { ivec3 i = ivec3(floor(p)); return float(agPcg(uint(i.x) * 73856093u ^ agPcg(uint(i.y) * 19349663u ^ agPcg(uint(i.z) * 83492791u + 0x9E3779B9u)))) / 4294967295.0; }
// value noise with analytic derivatives (Quilez): returns (value, d/dx, d/dy, d/dz)
vec4 agNoiseD(vec3 x) {
  vec3 i = floor(x); vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = agHash3(i + vec3(0, 0, 0)), b = agHash3(i + vec3(1, 0, 0)), c = agHash3(i + vec3(0, 1, 0)), d = agHash3(i + vec3(1, 1, 0));
  float e = agHash3(i + vec3(0, 0, 1)), f = agHash3(i + vec3(1, 0, 1)), g = agHash3(i + vec3(0, 1, 1)), h = agHash3(i + vec3(1, 1, 1));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
  return vec4(k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z,
              du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y));
}
vec3 agGrad2(vec3 p, float f0, float s0, float f1, float s1) {
  vec3 g = agNoiseD(p * f0).yzw * s0;
  g += agNoiseD(p * f1 + 17.31).yzw * s1;
  return g;
}
vec3 agPerturb(vec3 nView, vec3 gradWorld) {
  vec3 gv = mat3(viewMatrix) * gradWorld;
  gv -= nView * dot(gv, nView);
  return normalize(nView - gv);
}
`;

const N_AO = 48;
const AO_INTERIOR_DECL = /* glsl */`
uniform mat4 agPianoInv;          // world -> piano frame
uniform float agXr[${N_AO}];        // inner rim x on the treble/bentside at z = i * agZStep
uniform float agXo[${N_AO}];        // outer case x (lid outline) at z
uniform float agZt[${N_AO}];        // inner rim z at the tail for x = i * agXStep
uniform float agZStep, agXStep, agRim, agLidAng, agLidHx, agLidHy, agRimTop, agFrontZ;
float agArrXr(float t){ int i = int(clamp(floor(t), 0.0, ${N_AO - 2}.0)); float f = clamp(t - float(i), 0.0, 1.0); return mix(agXr[i], agXr[i + 1], f); }
float agArrXo(float t){ int i = int(clamp(floor(t), 0.0, ${N_AO - 2}.0)); float f = clamp(t - float(i), 0.0, 1.0); return mix(agXo[i], agXo[i + 1], f); }
float agArrZt(float t){ int i = int(clamp(floor(t), 0.0, ${N_AO - 2}.0)); float f = clamp(t - float(i), 0.0, 1.0); return mix(agZt[i], agZt[i + 1], f); }
float agInteriorAO(vec3 pW, vec3 nViewSpace) {
  vec3 p = (agPianoInv * vec4(pW, 1.0)).xyz;
  vec3 nW = inverseTransformDirection(nViewSpace, viewMatrix);
  vec3 n = normalize(mat3(agPianoInv) * nW);
  vec3 q = p + n * 0.004;                              // bias so the rim's outer faces count as outside
  float xr = agArrXr(q.z / agZStep), zt = agArrZt(q.x / agXStep);
  if (q.x < agRim || q.x > xr || q.z < agFrontZ || q.z > zt || q.y > agRimTop) return 1.0;
  float h = max(agRimTop - p.y, 1e-4);
  float phiR = atan(xr - p.x, h);                      // treble rim top (angle from the zenith, + toward +x)
  float phiS = atan(agRim - p.x, h);                   // spine rim top (negative)
  float xo = agArrXo(p.z / agZStep);
  vec2 edge = vec2(agLidHx + xo * cos(agLidAng), agLidHy + xo * sin(agLidAng));
  float phiL = atan(edge.x - p.x, max(edge.y - p.y, 1e-4));
  float lo0 = max(phiS, phiL), hi0 = phiR;
  float phin = atan(n.x, n.y);
  float lo = max(lo0, phin - 1.5707963), hi = min(hi0, phin + 1.5707963);
  float vis = hi > lo ? 0.5 * (sin(hi - phin) - sin(lo - phin)) : 0.0;
  // the slit model only constrains the x-y plane; normals along z see the whole slit length
  vis = mix(vis, 0.5 + 0.5 * vis, abs(n.z));
  // gentle extra depth term for the action cavity under the plate
  vis *= mix(1.0, 0.55, smoothstep(0.84, 0.74, p.y));
  return clamp(0.06 + 0.94 * vis, 0.0, 1.0);
}
// Under-case occlusion: below the keybed the case bottom (plane y = agUnderY over the case outline) hides the sky
// above. Returns the fraction of a reflection lobe around d (piano frame) that hits the case bottom; w0 = lobe spread.
// Downward lobes bounce off the water (y = agWaterY): under the case the lake mirrors the dark case bottom too.
uniform float agUnderY, agWaterY;
float agUnderHit(vec3 p, vec3 d, float w0) {
  float ay = max(abs(d.y), 0.02);
  float t = d.y > 0.0 ? (agUnderY - p.y) / ay : (max(p.y - agWaterY, 0.0) + agUnderY - agWaterY) / ay;
  vec2 h = p.xz + d.xz * t;
  float xo = agArrXo(h.y / agZStep);
  float zt = agArrZt(h.x / agXStep) + agRim;
  float dist = min(min(h.x, xo - h.x), min(h.y, zt - h.y));        // > 0 inside the outline
  float w = 0.006 + w0 * t;
  return smoothstep(-w, w, dist) * smoothstep(0.0, 0.06, abs(d.y));
}
// (specular, clear coat, diffuse) visibility for points under the case; 1 elsewhere. The case bottom is satin black,
// so an occluded lobe keeps ~8 % (it mirrors the lit water below).
vec3 agUnderVis(vec3 pW, vec3 nView, vec3 vView, float rough, vec3 ccView, float ccRough) {
  vec3 p = (agPianoInv * vec4(pW, 1.0)).xyz;
  if (p.y > agUnderY - 0.001) return vec3(1.0);
  mat3 toP = mat3(agPianoInv);
  vec3 r = normalize(toP * inverseTransformDirection(reflect(-vView, nView), viewMatrix));
  vec3 rc = normalize(toP * inverseTransformDirection(reflect(-vView, ccView), viewMatrix));
  vec3 n = normalize(toP * inverseTransformDirection(nView, viewMatrix));
  // lobe spread: a little wider than the GGX lobe so the keybed-edge line in brass reads as a soft reflection, not a crease
  float hs = agUnderHit(p, r, 0.04 + 1.2 * rough * rough);
  float hc = agUnderHit(p, rc, 0.03 + 1.2 * ccRough * ccRough);
  float hd = agUnderHit(p, normalize(n + vec3(0.0, 1.0, 0.0)), 0.5);
  return vec3(1.0 - 0.92 * hs, 1.0 - 0.92 * hc, 1.0 - 0.6 * hd);
}
// 1 inside the case (below the rim top, inside the inner rim, behind the fallboard), 0 outside; soft 1 cm edges
uniform sampler2D agFillShadow; uniform mat4 agFillShadowM; uniform float agFillShadowOn, agFillTexel;
// fill-light visibility from the fill shadow map (geom/fillshadow.js): 3x3 PCF, normal-offset + depth bias
float agFillVis(vec3 pW, vec3 nW) {
  if (agFillShadowOn < 0.5) return 1.0;
  vec4 c = agFillShadowM * vec4(pW + nW * 0.0012, 1.0);
  vec3 s = c.xyz / c.w;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float v = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture2D(agFillShadow, s.xy + vec2(float(i), float(j)) * agFillTexel).r;
    v += (s.z - 0.0006 <= d) ? 1.0 : 0.0;
  }
  return v / 9.0;
}
uniform vec3 agFill;             // interior fill light colour x intensity (linear), docs/PIANO.md
uniform vec3 agFillDir;           // toward the fill light, piano frame (jittered per sub-frame: soft area light)
// cycle 2 round 2: agFillDirL = the fill direction WITHOUT the camera-facing swing (fillCam), for the coat lobe of the
// lacquers; agFillAmb = extra broad ambient share of the fill (look keys fillAmb / fillAmbHigh); agFillCap = luminance cap
// of the fill's specular / coat response per pixel (look key fillCap; large = off)
uniform vec3 agFillDirL; uniform float agFillAmb, agFillCap;
uniform vec2 agBelly;            // belly rail line z = agBelly.x + agBelly.y * x (piano frame)
float agInteriorMask(vec3 pW) {
  vec3 p = (agPianoInv * vec4(pW, 1.0)).xyz;
  // above the soundboard behind the belly rail; in the action cavity in front of it; never the underside
  float zb = agBelly.x + agBelly.y * p.x;
  float yMin = mix(0.700, 0.806, smoothstep(zb - 0.01, zb + 0.01, p.z));
  float xr = agArrXr(p.z / agZStep), zt = agArrZt(p.x / agXStep);
  float m = smoothstep(agRim - 0.012, agRim + 0.004, p.x) * (1.0 - smoothstep(xr - 0.004, xr + 0.012, p.x));
  m *= smoothstep(agFrontZ - 0.03, agFrontZ + 0.01, p.z) * (1.0 - smoothstep(zt - 0.004, zt + 0.012, p.z));
  m *= 1.0 - smoothstep(agRimTop - 0.002, agRimTop + 0.010, p.y);
  m *= smoothstep(yMin - 0.004, yMin + 0.002, p.y);
  return m;
}
`;

const AO_KEYS_VERT_DECL = 'attribute vec4 agKN; attribute float agKSelf; varying vec4 agKNv; varying float agKSelfv; varying vec3 agNL;';
const AO_KEYS_VERT_MAIN = 'agKNv = agKN; agKSelfv = agKSelf; agNL = objectNormal;';
const AO_KEYS_DECL = /* glsl */`
varying vec4 agKNv; varying float agKSelfv; varying vec3 agNL;
uniform float agKeyAng[88]; uniform float agKeyTop[88];
uniform float agPivY, agPivZ, agHeadZ, agCheekTop;
float agKeysAO() {
  if (abs(agNL.x) < 0.55) return 1.0;               // only the side faces are hidden by neighbours
  bool right = agNL.x > 0.0; bool head = agP.z < agHeadZ;
  float nb = head ? (right ? agKNv.y : agKNv.x) : (right ? agKNv.w : agKNv.z);
  float aS = agKeyAng[int(agKSelfv + 0.5)];
  float aN = 0.0, topN = agCheekTop;
  if (nb > -0.5) { int j = int(nb + 0.5); aN = agKeyAng[j]; topN = agKeyTop[j]; }
  float d = aN - aS;
  float yN = agPivY + (topN - agPivY) * cos(d) + (agP.z - agPivZ) * sin(d);   // neighbour top, in this key's rest frame
  float occ = smoothstep(-0.0006, 0.0012, yN - agP.y);
  return mix(1.0, 0.05, occ);
}
`;

// Near-field occlusion around the keyboard (critic round 1: the env probe contains neither the piano nor the pianist,
// so the sloped sharp fronts, keytops, key slip and cheeks mirrored open sky behind the player - sharp fronts were 19x
// brighter than sharp tops). Rays from points in the keyboard zone are tested against the fallboard + music desk
// block and, when the pianist is present, a box around his torso; an occluded lobe keeps ~3 % (black lacquer, dark
// suit). Physical reflection directions (piano frame).
const NEAR_GLSL = /* glsl */`
uniform float agPianistOn;
float agBoxHit(vec3 o0, vec3 d, vec3 bmin, vec3 bmax) {
  vec3 o = o0 + d * 0.004;                                   // no self-hits from the box's own faces
  if (all(greaterThan(o, bmin - 0.002)) && all(lessThan(o, bmax + 0.002))) return 0.0;
  vec3 inv = 1.0 / (d + sign(d) * 1e-6 + vec3(equal(d, vec3(0.0))) * 1e-6);
  vec3 t0 = (bmin - o) * inv, t1 = (bmax - o) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  // session 11 (critic r2: a ruler-straight terminator across the glossy sharps in S06): soft hit. The length of the
  // ray inside the box falls to 0 continuously toward the box's silhouette, so a smoothstep over a width that grows
  // with the hit distance (~8 deg cone, the sharps' coat lobe) gives a penumbra instead of a 0/1 step
  float a0 = max(a, 0.0);
  return b > a0 ? smoothstep(0.0, 0.01 + 0.14 * a0, b - a0) : 0.0;
}
float agNearVis(vec3 pW, vec3 rView) {
  vec3 p = (agPianoInv * vec4(pW, 1.0)).xyz;
  if (p.z > 0.36 || p.y < 0.60 || p.y > 0.86) return 1.0;
  vec3 d = normalize(mat3(agPianoInv) * inverseTransformDirection(rView, viewMatrix));
  float h = agBoxHit(p, d, vec3(0.11, 0.715, 0.172), vec3(1.45, 0.79, 0.26));          // open fallboard
  h = max(h, agBoxHit(p, d, vec3(0.35, 0.79, 0.25), vec3(1.21, 1.27, 0.34)));         // music desk + rail
  if (agPianistOn > 0.5) h = max(h, agBoxHit(p, d, vec3(0.53, 0.50, -0.56), vec3(0.98, 1.42, -0.12)));   // torso
  return 1.0 - 0.97 * h;
}
`;

function aoApplyGLSL(expr, under = false, near = false, key = false) {
  return /* glsl */`
  {
    float agAOv = ${expr};
    vec3 agUV = vec3(1.0);
    ${under ? `
    #if defined( USE_CLEARCOAT )
      agUV = agUnderVis(agPW, normal, geometryViewDir, material.roughness, geometryClearcoatNormal, material.clearcoatRoughness);
    #else
      agUV = agUnderVis(agPW, normal, geometryViewDir, material.roughness, normal, material.roughness);
    #endif` : ''}
    ${near ? `
    agUV.x *= agNearVis(agPW, reflect(-geometryViewDir, normal));
    #if defined( USE_CLEARCOAT )
      agUV.y *= agNearVis(agPW, reflect(-geometryViewDir, geometryClearcoatNormal));
      ${key ? `
      // cycle 2 session 13 (critic c2: S04 keytops 20 vs refs 111-151): the keytop gloss is art-directed (it mirrors the
      // glow band, AG_FOLD_KEY), but the occluder test used the physical reflection, which from the bass-side / pianist
      // cameras runs into the fallboard / desk box and killed it. agKeyV = visibility floor on up-facing keytops
      agUV.y = mix(agUV.y, 1.0, agKeyV * smoothstep(0.5, 0.8, inverseTransformDirection(normal, viewMatrix).y));` : ''}
    #endif` : ''}
    reflectedLight.indirectDiffuse *= agAOv * agUV.z;
    #if defined( USE_CLEARCOAT )
      clearcoatSpecularIndirect *= agAOv * agUV.y;
    #endif
    #if defined( USE_SHEEN )
      sheenSpecularIndirect *= agAOv * agUV.z;
    #endif
    float agDotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( agDotNV, agAOv, material.roughness ) * agUV.x;
  }`;
}

// Interior fill: an artistic warm bounce inside the case (refs 1, 6, 11 show the plate and inner rim "lit warm"; with
// the lid open toward the anti-sun side the sky alone leaves the interior navy). It is shaded as a real (unshadowed)
// direct light through three's RE_Direct, so diffuse, specular, clear coat and sheen all respond with their roughness;
// the light comes from the raised lid (a mirror above the spine side) and its direction is jittered per sub-frame
// over a ~25 deg cone (a soft area light after accumulation). Masked to the case volume above the soundboard / in the
// action cavity, and scaled by the sky-slit visibility so deep corners stay dark. Plus a small ambient share.
// cycle 2 round 2 (critic c2r2 critical: S14 top-down showed a blown white "flashlight" disc on the black lacquer inside
// the case; S05c / S20z a cream hot pool on the plate): the camera-facing fill direction (fillCam) is for the metal crowns
// (plate, strings, pins); the lacquers (lacq) take the fill's coat lobe from the base direction agFillDirL, and every
// material caps the fill's specular + coat luminance per pixel at agFillCap. agFillAmb adds a broad, shadowed ambient share
// (soundboard / plate albedo read evenly, no hot spot)
const FILL_GLSL_FN = (lacq) => /* glsl */`
  {
    float agM = agInteriorMask(agPW);
    if (agM > 0.0 && dot(agFill, vec3(1.0)) > 0.0) {
      float agV = 0.30 + 0.70 * agInteriorAO(agPW, normal);
      vec3 agDirW = normalize(transpose(mat3(agPianoInv)) * agFillDir);
      IncidentLight agL; agL.direction = normalize((viewMatrix * vec4(agDirW, 0.0)).xyz);
      float agSh = agFillVis(agPW, inverseTransformDirection(geometryNormal, viewMatrix));
      agL.color = agFill * (agM * agV * agSh); agL.visible = true;
      vec3 agDs0 = reflectedLight.directSpecular;
      #if defined( USE_CLEARCOAT )
        vec3 agCs0 = clearcoatSpecularDirect;
      #endif
      RE_Direct(agL, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
      { vec3 agDd = reflectedLight.directSpecular - agDs0; float agDl = dot(agDd, vec3(0.2126, 0.7152, 0.0722)); if (agDl > agFillCap) reflectedLight.directSpecular = agDs0 + agDd * (agFillCap / agDl); }
      #if defined( USE_CLEARCOAT )
        ${lacq ? `clearcoatSpecularDirect = agCs0;
        { vec3 agLd = normalize((viewMatrix * vec4(normalize(transpose(mat3(agPianoInv)) * agFillDirL), 0.0)).xyz);
          clearcoatSpecularDirect += (saturate(dot(geometryClearcoatNormal, agLd)) * agM * agV * agSh) * agFill * BRDF_GGX_Clearcoat(agLd, geometryViewDir, geometryClearcoatNormal, material); }` : ''}
        { vec3 agCd = clearcoatSpecularDirect - agCs0; float agCl = dot(agCd, vec3(0.2126, 0.7152, 0.0722)); if (agCl > agFillCap) clearcoatSpecularDirect = agCs0 + agCd * (agFillCap / agCl); }
      #endif
      reflectedLight.indirectDiffuse += agFill * (agM * agV * (mix(0.10, 0.05, agFillShadowOn) + agFillAmb * agSh)) * material.diffuseContribution;
    }
  }`;

/** Fill light direction (toward the light, piano frame): from the raised lid, above the spine side. */
export const FILL_DIR = Object.freeze(new THREE.Vector3(-0.42, 0.88, -0.22).normalize().toArray());

// ---------------------------------------------------------------------------------------------- art-directed lacquer
// docs/USER_FEEDBACK.md item 1 ("the lacquer carries the sky"): in every wide reference the lacquer that faces the
// camera shows a darkened copy of the BACKDROP behind the piano (the after-glow, the mountain silhouettes, the horizon),
// like dark glass. A real mirror facing the camera shows what is behind the camera or beside it, which in this world is
// the dark terrain ring (measured: anti-sun / side horizon 0.02-0.04 linear) - the piano read as a black cut-out.
// "Backdrop reflections" (agFoldK 0 = physical .. 1 = backdrop): the azimuth of every lacquer reflection is moved from
// the physical one to the view azimuth (agFoldView 1; or the sun azimuth, 0) plus a lateral term from the physical
// reflection (agBackS), so curved panels still sweep across the backdrop; the elevation stays physical (lid tops still
// mirror the sky above). agLift raises near-horizontal reflections over the ridge line (the mountains are 2-5 deg tall)
// so vertical panels show the glow band above the silhouettes as the references do. Applied to the env lookups of the
// lacquer-like materials and to the planar mirrors' env fallback; the occlusion tests stay physical.
// The coat-only kicker is a direct light from the glow azimuth a few degrees above the horizon, evaluated on the clear
// coat alone (GGX at the coat roughness): it draws the thin warm lines along the lid edge, rim cap, key slip and desk
// edges that the references show; jittered over a cone per sub-frame, masked inside the case and under the keybed.
export const FOLD_FN_GLSL = /* glsl */`
// r: reflection direction (world), v: camera -> point (world), n: surface normal (world)
// Session 6 (crisp backdrop): the fold acts only on near-vertical panels (|n.y| < agFoldNy: case sides, arms, cheeks,
// key slip, desk front, legs) - lid tops, rim caps and the lid underside stay physical. The backdrop azimuth is
// asin(s sin(phi)) of the physical azimuth phi about the view axis: s = 1 is an isometric fold (backward reflections
// mirrored forward, so a camera-facing panel shows the backdrop behind the piano at 1:1 angular scale - crisp mountain
// silhouettes and glow, like dark glass), s < 1 also draws the sideways reflections toward the axis (magnifies by 1/s).
// The old atan() mapping squeezed +-90 deg into the +-22 deg glow sector at s 0.25: every curved part (legs, scrolls)
// mirrored the glow over its whole width and the case read as satin bronze.
// Session 7 (proxy backdrop): seen from 8-30 m a case side spans only 1-2 deg of reflected elevation, all of it inside
// the dark 0-3 deg terrain band, so the crisp fold alone left a black cut-out (out/s6_wva). Vertical panels therefore
// look the backdrop up as if it stood on a near cylinder around the piano (a parallax-corrected lookup): the reflected
// elevation becomes agProxyE.x + agProxyE.y * (el - agProxyE.x) + agProxy.y * (pw.y - agProxy.x), weighted by
// agProxy.z (case) / agProxy.w (legs, lyre, bench legs) times the panel's verticality. A case side then shows the ridge
// silhouette across its lower part and the glow band above it (refs 2, 9) at every camera distance and height.
// Session 8 (parallax backdrop): a flat panel seen from 8-30 m spans only 2-4 deg of reflected azimuth, so even with
// the fold it mirrored one uniform patch of the hazy horizon (lavender sheen, out/s8_wa V3/V7). The refs show the whole
// backdrop across a case side (several peaks + the glow), i.e. a mirror of a NEAR backdrop. The horizontal lookup is
// therefore parallax-corrected against a vertical cylinder of radius agPar.x around the piano (agParC, world): the
// reflected ray from the surface point is intersected with the cylinder and the env is looked up from the centre
// toward the hit point (local-cubemap parallax correction), weighted by agPar.y (case) / agPar.z (legs) x verticality.
// agGW (global) carries the weight of the lacquer env grade (agEnvGrade, materials only) for the current lookup.
float agGW = 0.0;
// cycle 2 round 2: agUpW = up-facing share of the current lookup's normal (lid top, rim cap): the env grade can keep the
// sky's own hue there (agEnvUp; critic c2r2 S17: the ref-4 lid top carries a navy sky sheen, ours warm brown)
float agUpW = 0.0;
vec3 agFold(vec3 r, vec3 v, vec3 n, vec3 pw) {
  agUpW = smoothstep(0.6, 0.9, n.y);
  if (dot(agDbgDir, agDbgDir) > 0.0) return normalize(agDbgDir);   // diagnostic: fixed lookup direction (world)
  #ifdef AG_FOLD_KEY
  // cycle 2 (critic c2: keytops read as violet matte plastic; refs 7 / 8 / 12 show warm peach keytop gloss, the
  // brightest piano element): up-facing key surfaces mirror the low glow band instead of the lilac sky above them.
  // agKeyF: x weight, y target elevation (rad), z elevation scale (the steeper near keys keep a gradient into the
  // salmon sky above the glow). The azimuth swings toward the glow (agSunW) by x (direction mix, continuous)
  if (agKeyF.x > 0.0 && n.y > 0.5) {
    float agKw = agKeyF.x * smoothstep(0.5, 0.8, n.y);
    vec3 rk = normalize(r); float elk = asin(clamp(rk.y, -1.0, 1.0));
    vec2 hk = length(rk.xz) > 1e-4 ? normalize(rk.xz) : agSunW.xz;
    vec2 hs = agSunW.xz + vec2(-agSunW.z, agSunW.x) * 0.35 * dot(hk, vec2(-agSunW.z, agSunW.x));
    vec2 hmk = mix(hk, normalize(hs), agKw); hmk = length(hmk) > 1e-3 ? normalize(hmk) : normalize(hs);
    // cycle 2 round 2 (critic c2r2: S02 overhead keys lilac, blue/red 1.40): the target elevation is capped at agKeyF2.x
    // (look key keyElMax), so a high camera's keytops still mirror the warm band instead of the lilac sky at ~20 deg
    float el2k = mix(elk, min(agKeyF.y + agKeyF.z * max(elk, 0.0), agKeyF2.x), agKw);
    return normalize(vec3(hmk.x * cos(el2k), sin(el2k), hmk.y * cos(el2k)));
  }
  #endif
  float agVert = 1.0 - smoothstep(agFoldNy.x, agFoldNy.y, abs(n.y));
  #if defined( AG_FOLD_BRASS )
    // cycle 2 (critic c2: the polished brass pedals read near-black in S11, ref 11 shows gold glints at the waterline):
    // the pedals' vertical faces fold their reflection azimuth toward the backdrop (glow + its reflection in the lake);
    // no proxy elevation, no parallax. Weight agBrassF (look key brassFold, 0 = physical)
    float agK = agBrassF; float agPx = 0.0; float agPw = 0.0;
  #elif defined( AG_FOLD_LEG )
    float agK = agFoldLegK; float agPx = agProxy.w; float agPw = agPar.z;
  #else
    float agK = agFoldK; float agPx = agProxy.z; float agPw = agPar.y;
  #endif
  agGW = agVert;
  agK *= agVert; agPx *= agVert; agPw *= agVert;
  if (agK > 0.0) {
    vec3 h = vec3(v.x, 0.0, v.z); float lh = length(h); h = lh > 1e-4 ? h / lh : agSunW;
    h = normalize(mix(agSunW, h, agFoldView));
    vec3 sd = vec3(-h.z, 0.0, h.x);
    float ry = clamp(r.y, -1.0, 1.0), hl = sqrt(max(0.0, 1.0 - ry * ry));
    float lat = dot(r, sd);
    float phb = asin(clamp(agBackS * lat / max(hl, 1e-4), -1.0, 1.0));   // backdrop azimuth (see above)
    // round 2: mix horizontal DIRECTIONS, not angles. A camera-facing panel reflects backward (azimuth +-180 deg about
    // the axis); the old mix(atan(lat, fw), phb, K) jumped ~144 deg across the vertical plane under the camera (hard
    // seam on fallboard / desk / pinblock front for 0 < K < 1, critic r2 fold_emu). The vector mix is continuous.
    vec2 hp = hl > 1e-4 ? r.xz / hl : h.xz;
    vec2 hb = (h * cos(phb) + sd * sin(phb)).xz;
    vec2 hm = mix(hp, hb, agK); float lm = length(hm);
    hm = lm > 1e-3 ? hm / lm : hb;
    r = vec3(hm.x * hl, ry, hm.y * hl);
  }
  if (agPw > 0.0 && agPar.x > 0.0) {
    vec2 rh = r.xz; float lrh = length(rh);
    if (lrh > 1e-3) {
      rh /= lrh;
      vec2 d = pw.xz - agParC.xz;
      float b = dot(d, rh), c = dot(d, d) - agPar.x * agPar.x, disc = b * b - c;
      if (disc > 0.0) {
        vec2 hd = normalize(d + (-b + sqrt(disc)) * rh);
        vec2 nh = normalize(mix(rh, hd, agPw));
        r = vec3(nh.x * lrh, r.y, nh.y * lrh);
      }
    }
  }
  if (agPx > 0.0) {
    vec3 rn = normalize(r); float el = asin(clamp(rn.y, -1.0, 1.0));
    // height in the PIANO frame (agParC = the piano centre, piano y 0.9; the rig only yaws): session 8 found the
    // world y offset of the rig had pushed every case side 10-20 deg up into the lilac sky
    float el2 = clamp(agProxyE.x + agProxyE.y * (el - agProxyE.x) + agProxy.y * (pw.y - agParC.y + 0.9 - agProxy.x), -1.4, 1.4);
    el = mix(el, el2, agPx);
    vec2 hz = rn.xz / max(1e-4, length(rn.xz));
    r = vec3(hz.x * cos(el), sin(el), hz.y * cos(el));
  }
  // only reflections at the terrain band (below ~3 deg) are lifted; higher ones (low cameras looking up) stay put
  r.y += (1.0 - agPx) * agLift * smoothstep(-0.12, 0.0, r.y) * (1.0 - smoothstep(0.03, 0.09, r.y));
  // elevation compression toward the ridge line (agElevT rad, factor agElevC; 1 = off) for near-horizontal reflections:
  // vertical panels then straddle the silhouettes / glow band whatever the camera height
  if (agElevC < 0.999) {
    vec3 rn = normalize(r); float el = asin(clamp(rn.y, -1.0, 1.0));
    float w = 1.0 - smoothstep(0.12, 0.30, abs(el - agElevT));
    float el2 = el + w * (agElevT + (el - agElevT) * agElevC - el);
    vec2 hz = rn.xz / max(1e-4, length(rn.xz));
    r = vec3(hz.x * cos(el2), sin(el2), hz.y * cos(el2));
  }
  return normalize(r);
}
`;
export const FOLD_DECL_GLSL = 'uniform float agFoldK, agFoldLegK, agBrassF, agLift, agFoldView, agBackS, agElevT, agElevC; uniform vec2 agFoldNy; uniform vec4 agProxy; uniform vec2 agProxyE; uniform vec4 agPar; uniform vec3 agParC; uniform vec3 agSunW; uniform vec3 agDbgDir;\n';
/** names of the shared fold uniforms (SHARED.lacquer) every folded shader binds */
export const FOLD_UNIFORMS = ['agFoldK', 'agFoldLegK', 'agFoldNy', 'agProxy', 'agProxyE', 'agPar', 'agParC', 'agLift', 'agSunW', 'agFoldView', 'agBackS', 'agElevT', 'agElevC', 'agDbgDir'];
const FOLD_GLSL = FOLD_DECL_GLSL + FOLD_FN_GLSL;
const KICK_DECL = /* glsl */`uniform vec3 agKickDirW; uniform vec3 agKickCol; uniform float agKickRough, agKickLeg; uniform vec4 agKickEdge; uniform vec4 agCard, agCard2, agCard3; uniform vec3 agCardCol, agCardSky; uniform float agCardWin; uniform vec4 agEdgeL; uniform float agKickCap; uniform sampler2D agSil; uniform vec4 agSilW;
// triangle wave in [0, 1] (sharp peaks and valleys: a jagged ridge instead of the session-9 rolling |sin| dunes)
float agTri(float x) { return abs(fract(x) - 0.5) * 2.0; }`;
// cycle 2 session 13 (critic c2 critical: the desk / fallboard / arm / pin-panel planar mirrors were dark voids in the
// key-level close-ups; refs 7 / 8 / 12 mirror the bright sunset band over crisp ridge silhouettes): the near reflection
// card of KICK_GLSL for the planar mirrors' env fallback (mirror.js). Same cylinder, ridge and glow / sky-tail profile;
// no interior / spine masks (the mirrored panels are outside the case). Returns radiance x agCard.x x agMirCard.
export const CARD_FN_GLSL = /* glsl */`
uniform vec4 agCard, agCard2, agCard3; uniform vec3 agCardCol, agCardSky; uniform float agCardWin, agMirCard; uniform sampler2D agSil; uniform vec4 agSilW;
float agTriM(float x) { return abs(fract(x) - 0.5) * 2.0; }
vec3 agCardRad(vec3 pw, vec3 rw) {
  vec2 d = pw.xz - agParC.xz; vec2 rh = rw.xz; float lr = length(rh);
  if (lr < 1e-3) return vec3(0.0);
  rh /= lr;
  float b = dot(d, rh), c = dot(d, d) - agCard.y * agCard.y, disc = b * b - c;
  if (disc <= 0.0) return vec3(0.0);
  float t = -b + sqrt(disc);
  vec2 hp = d + rh * t;
  vec2 cw = cameraPosition.xz - agParC.xz; float cd = max(length(cw), 1e-3); cw /= cd;
  float tanC = (cameraPosition.y - agParC.y) / cd;
  float hy = (pw.y - agParC.y + 0.9) + (rw.y / lr + agCard3.x * tanC) * t;
  float a = atan(hp.y, hp.x);
  float r0 = 0.6 * abs(sin(a * 7.0 + 1.3)) + 0.4 * abs(sin(a * 19.0 + 0.4)) - 0.5;
  float r1 = 0.55 * agTriM(a * 1.9 + 0.31) + 0.30 * agTriM(a * 5.3 + 0.07) + 0.15 * agTriM(a * 13.7 + 0.53) - 0.5;
  float sv = texture2D(agSil, vec2(fract((a * agSilW.y + agSilW.z) / 6.2831853 + 0.5), 0.5)).r;
  float u = hy - mix(agCard.z + agCard2.z * mix(r0, r1, agCard3.y), agCard.z + agCard2.z * (sv - 0.5), agSilW.x);
  float k = smoothstep(0.0, 0.004, u) * smoothstep(agCardWin, agCardWin + 0.35, dot(rh, cw));
  vec3 L = agCardCol * exp(-max(u, 0.0) / agCard.w) + agCardSky * (agCard2.x * exp(-max(u, 0.0) / agCard2.y));
  float v = (0.5 + 0.5 * sin(a * 11.0 + 0.7)) * (0.55 + 0.45 * sin(a * 4.3 + 2.1));
  L *= mix(1.0, 0.15 + 1.2 * v, agCard3.w);
  return (k * agCard.x * agMirCard) * L;
}`;
// Lacquer env grade (wide look, session 8): a contrast curve on the coat's env radiance, c *= (L / Lw)^(g - 1), weighted
// by the panel verticality (agGW from agFold). With a high coat F0 the hazy 0.05-0.2 horizon band otherwise turns the
// case into a lavender sheen; with g > 1 the glow (L ~ 1) keeps its strength while the haze and the dark terrain sink
// back to black: the case reads as dark glass with the backdrop in it (refs 2, 9, 10), the blacks stay black.
export const ENV_GRADE_GLSL = /* glsl */`
uniform vec4 agEnvG;
// session 11: tint of the desaturated dim env (agEnvG.w < 1). PBR Neutral's toe subtracts min(rgb) from dark values,
// so a neutral dim reflection is crushed to black and a lilac one turns magenta; a slight warm tint survives the toe
// as the refs' warm-neutral mid band (ref 2 [5.7, 2.4, 2.8], ref 10 [3.4, 2.0, 2.6])
uniform vec3 agEnvTint;
// round 2 (critic r2: lid / desk / prop greyed into violet): x gamma, y white point, z weight on NON-vertical panels
// (lid top and underside, rim cap, prop: 0 = session-8 behaviour, vertical panels only), w saturation of the dim part
// of the graded env (the lilac haze sinks to a neutral near-black, the glow keeps its hue; 1 = unchanged)
// cycle 2 round 2: agEnvUp = up-facing panels (agUpW from agFold): x weight (0 = off), y saturation of their dim env,
// z their gamma, w gain of their env (the lid top mirrors the high sky's own blue-violet, no warm tint; S17 / ref 4)
uniform vec4 agEnvUp;
vec4 agEnvGrade(vec4 c) {
  float wgt = max(agGW, agEnvG.z);
  float up = agUpW * agEnvUp.x;
  float g = mix(mix(1.0, agEnvG.x, wgt), agEnvUp.z, up);
  float l = max(dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
  if (abs(g - 1.0) > 1e-3) c.rgb *= pow(l / agEnvG.y, g - 1.0);
  float sat = mix(agEnvG.w, agEnvUp.y, up);
  if (sat < 0.999) { float l2 = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l2) * mix(agEnvTint, vec3(1.0), up), c.rgb, mix(1.0, mix(sat, 1.0, smoothstep(0.25, 0.9, l)), max(wgt, up))); }
  c.rgb *= mix(1.0, agEnvUp.w, up);
  return c;
}
`;
const KICK_GLSL = /* glsl */`
  #if defined( USE_CLEARCOAT )
  // edge boost (session 8): where the coat normal turns fast across a pixel (fillets, lid / rim / desk edges, leg
  // cylinders seen from afar) the kicker lobe widens and brightens, so the thin warm lines of the refs survive
  // sub-pixel fillets at 8-30 m; flat panels are unaffected (computed outside the branch: derivatives stay defined)
  float agCurvK = length(fwidth(geometryClearcoatNormal));
  float agEdgeK = smoothstep(0.06, 0.45, agCurvK) * agKickEdge.x;
  float agCurvG = length(fwidth(geometryNormal));
  if (dot(agKickCol, vec3(1.0)) > 0.0) {
    vec3 agKd = normalize((viewMatrix * vec4(agKickDirW, 0.0)).xyz);
    // round 2: agKickEdge.z = kicker weight on flat / gently curved panels (1 = everywhere; the close look uses 0: the
    // kicker stays on fillets and edges, flat lacquer is a clean mirror - critic r2: the r08 case arm was a cream light
    // box at kick 1, a mirror of ridge + glow + lake at kick 0). Curvature from the INTERPOLATED normal (geometryNormal,
    // linear per triangle: stable per frame; the orange-peel coat normal is excluded)
    float agKv = mix(agKickEdge.z, 1.0, smoothstep(agKickEdge.w, agKickEdge.w * 4.0, agCurvG));
    // cycle 2 (critic c2: legs / lyre flat black cut-outs in the close shots): legs, lyre and bench legs take the kicker
    // on their whole cylinder (agKickLeg, look key kickLeg): a continuous warm rim line on the glow side
    #ifdef AG_FOLD_LEG
      agKv = max(agKv, agKickLeg);
    #endif
    ${'' /* masked inside the case and under the keybed (piano frame tests from the AO block) */}
    #ifdef AG_HAS_INTERIOR
      agKv *= 1.0 - agInteriorMask(agPW);
      {
        vec3 agPp = (agPianoInv * vec4(agPW, 1.0)).xyz;
        if (agPp.y < agUnderY - 0.001) agKv *= 1.0 - 0.95 * agUnderHit(agPp, normalize(mat3(agPianoInv) * agKickDirW), 0.02);
      }
    #endif
    float agNl = saturate(dot(geometryClearcoatNormal, agKd));
    // the kicker lobe can be broader than the mirror coat (agKickRough): a soft area light, so the warm lines on
    // fillets, leg and lyre cylinders are several pixels wide in the wides instead of sub-pixel glints
    PhysicalMaterial agKm = material; agKm.clearcoatRoughness = max(material.clearcoatRoughness, agKickRough + agKickEdge.y * min(agEdgeK, 1.0));
    // cycle 2 round 2 (critic c2r2: S23 / S05 near-white 3-5 px "LED tube" lines on the key slip, fallboard top and desk
    // rail; GGX at the kicker roughness peaks ~40x the glow there): the kicker's radiance is capped in luminance per pixel
    // at agKickCap (look key kickCap; hue kept), so its lines plateau as warm rims instead of clipping
    { vec3 agKs = (agNl * agKv * (1.0 + agEdgeK)) * agKickCol * BRDF_GGX_Clearcoat(agKd, geometryViewDir, geometryClearcoatNormal, agKm);
      float agKsl = dot(agKs, vec3(0.2126, 0.7152, 0.0722)); if (agKsl > agKickCap) agKs *= agKickCap / agKsl;
      clearcoatSpecularDirect += agKs; }
    // cycle 2 session 13 (critic c2: legs / lyre black slabs in S09 / S17b / S20, kickLeg alone changed nothing): a
    // vertical cylinder seen from above reflects DOWNWARD (the view ray's elevation is kept), into the lake, never into
    // the glow a few degrees above the horizon. Refs 8 / 11: the legs carry the glow's reflection in the water. Second
    // lobe at the kicker direction mirrored in the water plane, broader (ripples), 0.6 x kickLeg
    #ifdef AG_FOLD_LEG
    if (agKickLeg > 0.0) {
      vec3 agKdL = normalize((viewMatrix * vec4(agKickDirW.x, -agKickDirW.y, agKickDirW.z, 0.0)).xyz);
      PhysicalMaterial agKl = material; agKl.clearcoatRoughness = max(material.clearcoatRoughness, 0.22);
      clearcoatSpecularDirect += (saturate(dot(geometryClearcoatNormal, agKdL)) * agKickLeg * 0.6) * agKickCol * BRDF_GGX_Clearcoat(agKdL, geometryViewDir, geometryClearcoatNormal, agKl);
    }
    #endif
  }
  // Session 9: near reflection card (USER_FEEDBACK item 1). The probe holds the real backdrop, but seen from 8-30 m a
  // flat case side mirrors one tiny, magnified patch of it (a soft lilac smear: out/s8_wg G0 vs the CPU emulator), so
  // the refs' crisp "ridge + glow band" in the case side never formed. A standard look-dev reflection card instead: a
  // vertical cylinder of radius agCard.y around the piano that carries a dark ridge silhouette (height agCard.z in the
  // piano frame, + agCard2.z of procedural peaks), the warm glow just above it (decay height agCard.w, the glow hue) and
  // a lilac sky tail (agCard2.x, decay agCard2.y). The height is camera-anchored (minus the camera elevation seen from
  // the piano centre), so a vertical panel shows the ridge at piano height ~agCard.z in every framing; fillets, the rim
  // cap, lid and desk edges and the leg cylinders sweep through the band (thin warm lines); below the ridge nothing is
  // added (the blacks stay black). Camera-side window agCardWin; legs weight agCard2.w; masked inside the case.
  // Added as coat env radiance (EnvironmentBRDF), so the AO / occlusion block after it still darkens it.
  if (agCard.x > 0.0) {
    vec3 agNw = inverseTransformDirection(geometryClearcoatNormal, viewMatrix);
    vec3 agRw = reflect(normalize(agPW - cameraPosition), agNw);
    vec2 agD = agPW.xz - agParC.xz; vec2 agRh = agRw.xz; float agLr = length(agRh);
    if (agLr > 1e-3) {
      agRh /= agLr;
      float agB = dot(agD, agRh), agC = dot(agD, agD) - agCard.y * agCard.y, agDisc = agB * agB - agC;
      if (agDisc > 0.0) {
        float agT = -agB + sqrt(agDisc);
        vec2 agHp = agD + agRh * agT;
        vec2 agCw = cameraPosition.xz - agParC.xz; float agCd = max(length(agCw), 1e-3); agCw /= agCd;
        float agTanC = (cameraPosition.y - agParC.y) / agCd;
        // a vertical panel reflects downward at the camera's elevation (r.y / |r.xz| ~ -tanC): adding tanC cancels it.
        // round 2: agCard3.x = how much of the camera elevation is cancelled (1 = session 9, band fixed on the case;
        // < 1: the band slides down the case as a crane rises, as a real reflection does)
        float agHy = (agPW.y - agParC.y + 0.9) + (agRw.y / agLr + agCard3.x * agTanC) * agT;
        float agA = atan(agHp.y, agHp.x);
        // round 2: jagged ridge (triangle harmonics, agCard3.y = 1) instead of the two-sine dunes (agCard3.y = 0)
        float agR0 = 0.6 * abs(sin(agA * 7.0 + 1.3)) + 0.4 * abs(sin(agA * 19.0 + 0.4)) - 0.5;
        float agR1 = 0.55 * agTri(agA * 1.9 + 0.31) + 0.30 * agTri(agA * 5.3 + 0.07) + 0.15 * agTri(agA * 13.7 + 0.53) - 0.5;
        // cycle 2 round 2 (critic c2r2: the card ridge was a generic dune line next to the real jagged peaks): agSil = the real
        // skyline around the piano (world.heightAt, normalised 0..1 per azimuth; index.js buildSilhouette), weight agSilW.x,
        // azimuth scale agSilW.y and offset agSilW.z (rad)
        float agSilV = texture2D(agSil, vec2(fract((agA * agSilW.y + agSilW.z) / 6.2831853 + 0.5), 0.5)).r;
        float agRidge = mix(agCard.z + agCard2.z * mix(agR0, agR1, agCard3.y), agCard.z + agCard2.z * (agSilV - 0.5), agSilW.x);
        float agU = agHy - agRidge;
        float agKc = smoothstep(0.0, 0.004, agU) * smoothstep(agCardWin, agCardWin + 0.35, dot(agRh, agCw)) * agCard.x;
        #ifdef AG_FOLD_LEG
          agKc *= agCard2.w;
        #endif
        #ifdef AG_HAS_INTERIOR
          agKc *= 1.0 - agInteriorMask(agPW);
          // session 11: card weight agCard3.z on the flat spine (bass side, outward normal -x in the piano frame). Ref 4
          // (film S17, bass profile) shows that long flat side as a near-black mirror with one warm lid-edge line; the
          // ridge + glow band belongs to the curved bentside / tail seen from the treble side (refs 2, 9, 10)
          { vec3 agNs = mat3(agPianoInv) * agNw; agKc *= mix(1.0, agCard3.z, smoothstep(0.95, 0.99, -agNs.x / max(length(agNs), 1e-4))); }
        #endif
        vec3 agCardL = agCardCol * exp(-max(agU, 0.0) / agCard.w) + agCardSky * (agCard2.x * exp(-max(agU, 0.0) / agCard2.y));
        // session 11: horizontal variation of the backdrop (clouds / glow patches) along the card azimuth, weight
        // agCard3.w (look key cardVar). A flat side spans few degrees of azimuth (broad patches); the convex bentside
        // sweeps many, so the same pattern compresses into the narrow vertical streaks of refs 2 / 9 / 10
        float agVar = (0.5 + 0.5 * sin(agA * 11.0 + 0.7)) * (0.55 + 0.45 * sin(agA * 4.3 + 2.1));
        agCardL *= mix(1.0, 0.15 + 1.2 * agVar, agCard3.w);
        clearcoatSpecularIndirect += (agKc * agCardL) * EnvironmentBRDF(geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness);
      }
    }
  }
  // Session 11: lid edge line (USER_FEEDBACK item 1 "bright thin highlights along the lid edge"; critic r2: the kicker
  // drew it as 1-2 px glints on the sub-pixel fillets that moved from frame to frame). The lid's whole edge band (its
  // ~19 mm thickness face + fillets, 1.5-3 px wide in the 10-30 m wides) carries a warm rim light: a geometric mask in
  // lid space (on the lid slab, normal across the lid plane), so it is as stable as the silhouette itself.
  // agEdgeL: x radiance (x glow gain, 0 = off), y |n . lidUp| threshold, z lid thickness (m).
  #ifdef AG_HAS_INTERIOR
  if (agEdgeL.x > 0.0) {
    vec3 agPe = (agPianoInv * vec4(agPW, 1.0)).xyz;
    vec2 agLu = vec2(-sin(agLidAng), cos(agLidAng));
    float agQy = dot(agPe.xy - vec2(agLidHx, agLidHy), agLu) - (agRimTop - agLidHy);
    float agOnLid = smoothstep(-0.003, 0.0, agQy) * (1.0 - smoothstep(agEdgeL.z, agEdgeL.z + 0.003, agQy));
    vec3 agNe = mat3(agPianoInv) * inverseTransformDirection(geometryNormal, viewMatrix);
    float agAcross = 1.0 - smoothstep(agEdgeL.y * 0.6, agEdgeL.y, abs(dot(agNe.xy, agLu)) / max(length(agNe), 1e-4));
    float agFacing = 0.35 + 0.65 * saturate(dot(geometryNormal, geometryViewDir));
    clearcoatSpecularIndirect += (agEdgeL.x * agOnLid * agAcross * agFacing) * agCardCol;
  }
  #endif
  #endif
`;
const ENVMAP_FOLDED = (grade = false) => (grade ? THREE.ShaderChunk.envmap_physical_pars_fragment.split('textureCubeUV( envMap, envMapRotation * reflectVec, roughness )').join('agEnvGrade( textureCubeUV( envMap, envMapRotation * reflectVec, roughness ) )') : THREE.ShaderChunk.envmap_physical_pars_fragment).split('envMapRotation * reflectVec').join('envMapRotation * agFold( reflectVec, transformDirectionByInverseViewMatrix( -viewDir, viewMatrix ), transformDirectionByInverseViewMatrix( normal, viewMatrix ), agPW )');

let SHARED = null; // shared uniform objects (one update reaches every material)

/**
 * Inject procedural detail into a MeshPhysicalMaterial.
 * opts: { space: 'local'|'local', normal: {f0,s0,f1,s1}, clearcoat: {f0,s0,f1,s1}, colorFn, roughFn, normalFn,
 *         uniforms, fragDecl, vertexDecl, vertexMain, ao: 'interior'|'keys'|null }
 * s* are slope amplitudes (dimensionless), f* frequencies in 1/m.
 */
export function patchMaterial(mat, opts) {
  const ao = opts.ao === undefined ? 'interior' : opts.ao;
  const key = JSON.stringify({ ...opts, ao, uniforms: Object.keys(opts.uniforms || {}) });
  mat.userData.agPatch = opts;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, opts.uniforms || {});
    if (ao === 'interior' && SHARED) Object.assign(shader.uniforms, SHARED.interior);
    if (ao === 'keys' && SHARED) Object.assign(shader.uniforms, SHARED.keys, { agPianoInv: SHARED.interior.agPianoInv });
    if (SHARED) shader.uniforms.agPianistOn = SHARED.near.agPianistOn;
    const vDecl = (opts.vertexDecl || '') + (ao === 'keys' ? AO_KEYS_VERT_DECL : '');
    const vMain = (opts.vertexMain || '') + (ao === 'keys' ? AO_KEYS_VERT_MAIN : '');
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 agP;\nvarying vec3 agPW;\n${vDecl}`)
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        {
          vec4 agw = vec4(transformed, 1.0);
          ${opts.space === 'local' || ao === 'keys' ? 'agP = agw.xyz;' : ''}
          #ifdef USE_INSTANCING
            agw = instanceMatrix * agw;
          #endif
          agw = modelMatrix * agw;
          agPW = agw.xyz;
          ${opts.space === 'local' || ao === 'keys' ? '' : 'agP = agw.xyz;'}
          ${vMain}
        }`);
    let fs = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 agP;\nvarying vec3 agPW;\n${NOISE_GLSL}\n${opts.fragDecl || ''}\n${ao === 'interior' ? AO_INTERIOR_DECL : ''}${ao === 'keys' ? 'uniform mat4 agPianoInv;\n' + AO_KEYS_DECL : ''}${(ao === 'keys' || (ao === 'interior' && opts.near)) ? NEAR_GLSL : ''}`);
    if (opts.coatF0 && SHARED) {
      // clear-coat reflectance at normal incidence (three fixes it at 0.04 = n 1.5); shared uniform, docs/PIANO.md
      // session 7: up-facing lacquer (lid top, rim cap, cheek and key-slip tops) can take its own F0 (agCoatUp.x, blended
      // in over world normal.y agCoatUp.y..z): in the wides the lid top mirrors the 0.06-0.13 high sky, which a physical
      // coat returns as display 0-3; the refs show a sky-coloured sheen there (docs/WORLD.md section 6)
      // legs, lyre and bench legs (fold 'leg') take their own F0 (agCoatLeg): in the refs they stay black with warm rim
      // lines while the case panels carry the backdrop
      shader.uniforms.agCoatF0 = SHARED.lacquer.agCoatF0; shader.uniforms.agCoatUp = SHARED.lacquer.agCoatUp; shader.uniforms.agCoatLeg = SHARED.lacquer.agCoatLeg;
      const f0v = opts.fold === 'leg' ? 'agCoatLeg' : 'agCoatF0';
      fs = fs.replace('#include <common>', '#include <common>\nuniform float agCoatF0, agCoatLeg; uniform vec3 agCoatUp;')
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  { float agUpN = inverseTransformDirection( clearcoatNormal, viewMatrix ).y;\n    material.clearcoatF0 = vec3( mix( ${f0v}, agCoatUp.x, smoothstep( agCoatUp.y, agCoatUp.z, agUpN ) ) ); }\n#endif`);
    }
    if (opts.coatWear && SHARED) {
      // lived-in polish (session 5, 2x detail): fine polishing haze over the whole coat, faint smudge patches, stronger
      // fingerprints / palm smudges around the keyboard (key slip, cheeks, fallboard, arms) - visible only where the coat
      // mirrors a highlight, as on a real instrument. Session 8: the case bottom (keybed and rim undersides, facing the
      // water) is black satin, not mirror polish (a low camera saw a bright grazing band of the lake there, out/s8_wb r09)
      fs = fs.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
{
  float agFine = agNoiseD(agP * 900.0).x;
  float agSm = smoothstep(0.60, 0.86, agNoiseD(agP * 14.0 + 3.1).x) * smoothstep(0.50, 0.90, agNoiseD(agP * 60.0 + 7.7).x);
  float agZone = 0.35;
  ${opts.ao === null ? '' : 'vec3 agPp = (agPianoInv * vec4(agPW, 1.0)).xyz; agZone = mix(0.35, 1.0, (1.0 - smoothstep(0.36, 0.50, agPp.z)) * smoothstep(0.62, 0.68, agPp.y) * (1.0 - smoothstep(0.80, 0.86, agPp.y)));'}
  // cycle 2 (critic c2: S09 case side = hard-edged 8-16 px dark blotches): the smudge term used to add +0.07 coat
  // roughness, which switched PMREM mips in patches across a magnified close-up mirror. Smudges now only dim the coat's
  // env reflection (agSmG, applied after the lighting in SMUDGE_GLSL); the roughness keeps the fine polishing haze only
  agSmG = agSm * agZone;
  material.clearcoatRoughness = clamp(material.clearcoatRoughness + 0.010 * agFine, 0.015, 0.25);
  ${opts.ao === null ? '' : '{ float agDn = inverseTransformDirection(clearcoatNormal, viewMatrix).y; if (agPp.y < 0.665 && agDn < -0.6) { material.clearcoatRoughness = max(material.clearcoatRoughness, 0.32); agUnderD = smoothstep(0.6, 0.85, -agDn); } }'}
}
#endif`);
    }
    if (opts.coatWear && SHARED) {
      fs = fs.replace('#include <common>', '#include <common>\nfloat agSmG = 0.0;\nfloat agUnderD = 0.0;')
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n#if defined( USE_CLEARCOAT )\n  clearcoatSpecularIndirect *= (1.0 - 0.35 * agSmG) * (1.0 - 0.85 * agUnderD);\n#endif');   // cycle 2 round 2 (critic c2r2 S11: the keybed bottom face glowed as a peach light box from the lake glow): downward case-bottom faces keep 15 % of their coat env
    }
    if (opts.keyFold && SHARED) {
      // cycle 2: keytop gloss (agKeyF, see AG_FOLD_KEY in agFold): coat F0 of the keytops (agKeyF.w, 0 = three's 0.04)
      shader.uniforms.agKeyF = SHARED.lacquer.agKeyF; shader.uniforms.agKeyV = SHARED.lacquer.agKeyV; shader.uniforms.agKeyF2 = SHARED.lacquer.agKeyF2; shader.uniforms.agKeyAmb = SHARED.lacquer.agKeyAmb;
      fs = fs.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  if (agKeyF.w > 0.0) material.clearcoatF0 = vec3(agKeyF.w);\n#endif');
    }
    if (opts.colorFn) fs = fs.replace('#include <color_fragment>', `#include <color_fragment>\n{ ${opts.colorFn} }`);
    if (opts.roughFn) fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n{ ${opts.roughFn} }`);
    if (opts.normal) {
      const n = opts.normal;
      fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = agPerturb(normal, agGrad2(agP, ${n.f0.toFixed(4)}, ${n.s0.toFixed(6)}, ${n.f1.toFixed(4)}, ${n.s1.toFixed(6)}));`);
    }
    if (opts.normalFn) fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n{ ${opts.normalFn} }`);
    if (opts.clearcoat) {
      const n = opts.clearcoat;
      fs = fs.replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
        // session 11 (critic r2: the lid edge in the wides was a row of evenly spaced 1-2 px glints that crawled along it with
// sub-pixel camera motion): the orange peel (periods 4.8 / 10.5 mm) is fainter than a pixel from 8-30 m and aliased
// against the pixel grid on the sub-pixel fillets. Each octave fades out as the pixel footprint grows past its period
{ float agFp = length(fwidth(agP)); float agFil = 1.0 - smoothstep(0.05, 0.18, length(fwidth(nonPerturbedNormal)));   // cycle 2: no peel on fillets (beaded edge lines, critic c2)
  clearcoatNormal = agPerturb(clearcoatNormal, agGrad2(agP, ${n.f0.toFixed(4)}, agFil * ${n.s0.toFixed(6)} * (1.0 - smoothstep(${(0.25 / n.f0).toFixed(6)}, ${(1.0 / n.f0).toFixed(6)}, agFp)), ${n.f1.toFixed(4)}, agFil * ${n.s1.toFixed(6)} * (1.0 - smoothstep(${(0.25 / n.f1).toFixed(6)}, ${(1.0 / n.f1).toFixed(6)}, agFp)))); }`);
    }
    if ((opts.fold || opts.kick) && SHARED) {
      for (const k of FOLD_UNIFORMS) shader.uniforms[k] = SHARED.lacquer[k];
      shader.uniforms.agKickDirW = SHARED.lacquer.agKickDirW; shader.uniforms.agKickCol = SHARED.lacquer.agKickCol; shader.uniforms.agKickRough = SHARED.lacquer.agKickRough; shader.uniforms.agKickLeg = SHARED.lacquer.agKickLeg; shader.uniforms.agKickEdge = SHARED.lacquer.agKickEdge;
      for (const k of ['agCard', 'agCard2', 'agCard3', 'agCardWin', 'agCardCol', 'agCardSky', 'agEdgeL', 'agSil', 'agSilW']) shader.uniforms[k] = SHARED.lacquer[k];
      if (opts.fold === 'brass') shader.uniforms.agBrassF = SHARED.lacquer.agBrassF;
      const grade = !!(opts.fold && opts.coatF0);   // the env grade belongs to the lacquers only
      if (grade) { shader.uniforms.agEnvG = SHARED.lacquer.agEnvG; shader.uniforms.agEnvTint = SHARED.lacquer.agEnvTint; shader.uniforms.agEnvUp = SHARED.lacquer.agEnvUp; }
      shader.uniforms.agKickCap = SHARED.lacquer.agKickCap;
      fs = fs.replace('#include <common>', `#include <common>\n${opts.fold === 'leg' ? '#define AG_FOLD_LEG\n' : ''}${opts.fold === 'brass' ? '#define AG_FOLD_BRASS\n' : ''}${opts.keyFold ? '#define AG_FOLD_KEY\nuniform vec4 agKeyF, agKeyF2, agKeyAmb;\nuniform float agKeyV;\n' : ''}${FOLD_GLSL}\n${grade ? ENV_GRADE_GLSL : ''}\n${KICK_DECL}\n${ao === 'interior' ? '#define AG_HAS_INTERIOR' : ''}`);
      if (opts.fold) fs = fs.replace('#include <envmap_physical_pars_fragment>', ENVMAP_FOLDED(grade));
    }
    if (ao === 'interior' && SHARED) fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${aoApplyGLSL('agInteriorAO(agPW, normal)', true, !!opts.near)}\n${FILL_GLSL_FN(!!(opts.coatF0 || opts.kick))}`);
    if (ao === 'keys' && SHARED) fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${aoApplyGLSL('agKeysAO()', false, true, !!opts.keyFold)}`);
    // cycle 2 round 2 (critic c2r2: keytops dim lilac / violet slate; refs 7 / 8 / 12 warm white, luma 110-150): a warm key
    // ambient (agKeyAmb, look key keyAmb x the glow's displayed hue) on the key albedo, inserted BEFORE the key AO (the gaps
    // between the keys stay dark)
    if (opts.keyFold && SHARED && ao === 'keys' && (opts.fold || opts.kick)) fs = fs.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n  reflectedLight.indirectDiffuse += agKeyAmb.rgb * material.diffuseContribution * smoothstep(0.15, 0.45, dot(material.diffuseContribution, vec3(0.3333)));');   // white keys only (black keys stay black)
    if (opts.kick && SHARED) fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${KICK_GLSL}`);
    shader.fragmentShader = fs;
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'agpatch' + key;
  mat.needsUpdate = true;
  return mat;
}

// ---------------------------------------------------------------------------------------------- generated maps
/** Normal map for helical copper winding: grooves along texture u (one groove per unit u). */
export function makeWindingNormalMap(size = 64) {
  const data = new Uint8Array(size * 4 * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size;
    const t = 2 * u - 1;
    const slope = -t / Math.sqrt(Math.max(0.05, 1 - t * t));
    const k = 0.35;
    let nx = -slope * k, nz = 1; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const i = (y * size + x) * 4;
    data[i] = Math.round((nx * 0.5 + 0.5) * 255); data[i + 1] = 128; data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255); data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, 4, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8; tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** skyline texture for the reflection card (512 x 1 RGBA8, R = normalised ridge elevation per azimuth; flat 0.5 until filled) */
export const SIL_N = 512;
function makeSilTexture() {
  const d = new Uint8Array(SIL_N * 4).fill(128); for (let i = 0; i < SIL_N; i++) d[i * 4 + 3] = 255;
  const tx = new THREE.DataTexture(d, SIL_N, 1, THREE.RGBAFormat);
  tx.wrapS = THREE.RepeatWrapping; tx.wrapT = THREE.ClampToEdgeWrapping; tx.minFilter = tx.magFilter = THREE.LinearFilter; tx.generateMipmaps = false;
  tx.colorSpace = THREE.NoColorSpace; tx.needsUpdate = true;
  return tx;
}

// ---------------------------------------------------------------------------------------------- shared AO uniforms
function sampleOutline(L) {
  // treble-side inner-rim x(z), outer x(z) and tail inner z(x) from the case outlines
  const inner = L.innerRim, outer = L.caseOutline;
  const zMax = L.caseLength, xMax = L.caseWidth;
  const xr = new Float32Array(N_AO), xo = new Float32Array(N_AO), zt = new Float32Array(N_AO);
  const maxXAtZ = (poly, z) => { let best = -1; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) { const t = (z - a[1]) / (b[1] - a[1]); best = Math.max(best, a[0] + (b[0] - a[0]) * t); } } return best; };
  const maxZAtX = (poly, x) => { let best = -1; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const t = (x - a[0]) / (b[0] - a[0]); best = Math.max(best, a[1] + (b[1] - a[1]) * t); } } return best; };
  for (let i = 0; i < N_AO; i++) {
    const z = (i / (N_AO - 1)) * zMax, x = (i / (N_AO - 1)) * xMax;
    xr[i] = Math.max(0, maxXAtZ(inner, Math.min(z, zMax - 0.06)));
    xo[i] = Math.max(0, maxXAtZ(outer, Math.min(z, zMax - 0.001)));
    zt[i] = Math.max(0, maxZAtX(inner, Math.min(Math.max(x, L.rimThickness + 0.001), xMax - L.rimThickness - 0.001)));
  }
  return { xr, xo, zt, zStep: zMax / (N_AO - 1), xStep: xMax / (N_AO - 1) };
}

// ---------------------------------------------------------------------------------------------- the material set
/** world-space horizontal direction toward the sun (DESIGN.md section 2: azimuth 0 = the sun = -z) */
export const SUN_DIR_W = Object.freeze([0, 0, -1]);
/** coat kicker: toward the glow, 3 deg above the horizon (world) */
export const KICK_DIR_W = Object.freeze(new THREE.Vector3(0, Math.sin(3 * Math.PI / 180), -Math.cos(3 * Math.PI / 180)).toArray());
/** default kicker radiance (linear RGB, peach #FEC08A x intensity) and reflection fold (docs/PIANO.md section 4) */
export const KICK_DEFAULT = Object.freeze([0.0, 0.0, 0.0]);
export const FOLD_DEFAULT = 1.0;
export const LIFT_DEFAULT_DEG = 0.0;

export function createMaterials(L, { envMapIntensity = 1.0, grainDeg = -55.5, interiorFill = [0.28, 0.22, 0.14], lacquerF0 = 0.06, reflectionFold = FOLD_DEFAULT, reflectionLiftDeg = LIFT_DEFAULT_DEG, kicker = KICK_DEFAULT } = {}) {
  const smp = sampleOutline(L);
  SHARED = {
    interior: {
      agPianoInv: { value: new THREE.Matrix4() }, agXr: { value: smp.xr }, agXo: { value: smp.xo }, agZt: { value: smp.zt },
      agZStep: { value: smp.zStep }, agXStep: { value: smp.xStep }, agRim: { value: L.rimThickness },
      agLidAng: { value: (L.lid.fullStickDeg * Math.PI) / 180 }, agLidHx: { value: L.lid.hingeAxis.x }, agLidHy: { value: L.lid.hingeAxis.y },
      agRimTop: { value: L.heights.rimTop }, agFrontZ: { value: 0.255 }, agUnderY: { value: L.heights.keybedBottom - 0.003 }, agWaterY: { value: 0.04 },
      agFill: { value: new THREE.Vector3(...interiorFill) }, agFillDir: { value: new THREE.Vector3(...FILL_DIR) },
      agFillDirL: { value: new THREE.Vector3(...FILL_DIR) }, agFillAmb: { value: 0.0 }, agFillCap: { value: 1e4 },
      agFillShadow: { value: null }, agFillShadowM: { value: new THREE.Matrix4() }, agFillShadowOn: { value: 0 }, agFillTexel: { value: 1 / 2048 },
      agBelly: { value: new THREE.Vector2(L.bellyRail[0][1] - L.bellyRail[0][0] * (L.bellyRail[1][1] - L.bellyRail[0][1]) / (L.bellyRail[1][0] - L.bellyRail[0][0]), (L.bellyRail[1][1] - L.bellyRail[0][1]) / (L.bellyRail[1][0] - L.bellyRail[0][0])) },
    },
    keys: {
      agKeyAng: { value: new Float32Array(88) }, agKeyTop: { value: Float32Array.from(L.keys.map((k) => k.top_y)) },
      agPivY: { value: L.keyboard.pivot.y }, agPivZ: { value: L.keyboard.pivot.z }, agHeadZ: { value: L.keyboard.frontZ + L.keyboard.headLen },
      agCheekTop: { value: L.keyboard.cheekBlocks.topY },
    },
  };
  SHARED.near = { agPianistOn: { value: 0 } };
  SHARED.lacquer = {
    agCoatF0: { value: lacquerF0 }, agMirrorF0: { value: 0.06 },
    agCoatUp: { value: new THREE.Vector3(lacquerF0, 0.55, 0.85) }, agCoatLeg: { value: lacquerF0 }, agKickRough: { value: 0.0 }, agKickLeg: { value: 0.0 }, agBrassF: { value: 0.0 },
    agProxy: { value: new THREE.Vector4(0.80, 0.25, 0.0, 0.0) }, agProxyE: { value: new THREE.Vector2(0.07, 1.0) },
    agPar: { value: new THREE.Vector4(6.0, 0.0, 0.0, 0.0) }, agParC: { value: new THREE.Vector3() }, agEnvG: { value: new THREE.Vector4(1.0, 1.0, 0.0, 1.0) }, agEnvTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) }, agKickEdge: { value: new THREE.Vector4(0.0, 0.0, 1.0, 0.01) },
    agFoldK: { value: reflectionFold }, agFoldLegK: { value: 0.0 }, agFoldNy: { value: new THREE.Vector2(0.45, 0.75) }, agFoldView: { value: 1.0 }, agBackS: { value: 0.6 }, agElevT: { value: 0.061 }, agElevC: { value: 1.0 }, agDbgDir: { value: new THREE.Vector3(0, 0, 0) }, agLift: { value: Math.tan((reflectionLiftDeg * Math.PI) / 180) }, agSunW: { value: new THREE.Vector3(...SUN_DIR_W) },
    agKickDirW: { value: new THREE.Vector3(...KICK_DIR_W) }, agKickCol: { value: new THREE.Vector3(...kicker) },
    agCard: { value: new THREE.Vector4(0.0, 3.0, 0.80, 0.06) }, agCard2: { value: new THREE.Vector4(0.15, 0.6, 0.05, 0.0) }, agCard3: { value: new THREE.Vector4(1.0, 0.0, 0.0, 0.0) }, agCardWin: { value: -0.3 }, agEdgeL: { value: new THREE.Vector4(0.0, 0.5, L.lid.thickness, 0.0) },
    agCardCol: { value: new THREE.Vector3(1.0, 0.54, 0.24) }, agCardSky: { value: new THREE.Vector3(0.62, 0.50, 0.85) },
    // cycle 2 round 2: up-facing env grade (look keys envUp, envUpSat, envUpG, envUpGain) and the kicker luminance cap (kickCap)
    agEnvUp: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) }, agKickCap: { value: 1e4 },
    // cycle 2 round 2: real skyline for the card ridge (RGBA8 512 x 1, R = normalised elevation; filled by index.js) and its
    // weight / azimuth scale / azimuth offset (look keys cardSil, cardSilK, cardSilA)
    agSil: { value: makeSilTexture() }, agSilW: { value: new THREE.Vector4(0.0, 1.0, 0.0, 0.0) },
    // cycle 2: keytop gloss (x weight, y target elevation rad, z elevation scale, w keytop coat F0; 0 = off) and the
    // planar mirrors' art-directed horizon (x weight, y gain rad/m about the panel centre, z physical share, w target rad)
    agKeyF: { value: new THREE.Vector4(0.0, 0.05, 0.3, 0.0) }, agMirHz: { value: new THREE.Vector4(0.0, 1.5, 0.3, 0.061) },
    // cycle 2 session 13: keytop coat visibility floor against the near-field occluders (look key keyVis) and the near
    // reflection card in the planar desk / fallboard / arm / pin-panel mirrors (look key mirCard, x agCard.x; 0 = off)
    agKeyV: { value: 0.0 }, agMirCard: { value: 0.0 },
    // cycle 2 round 2: keytop target-elevation cap (x rad; 1.6 = off) and warm key ambient (rgb radiance; 0 = off)
    agKeyF2: { value: new THREE.Vector4(1.6, 0.0, 0.0, 0.0) }, agKeyAmb: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },
    // the arm mirrors' own card weight (look key mirCardArm): the arm faces' coat lacquer lies inside the case volume,
    // where the coat card is masked, so a carded arm mirror showed its rectangle as a seam (out/c2_f S06 / S04)
    agMirCardArm: { value: 0.0 },
  };
  const M = { shared: SHARED };
  const P = (o) => new THREE.MeshPhysicalMaterial({ envMapIntensity, ...o });
  const Q = (o, patch = {}) => patchMaterial(P(o), patch);   // plain material + interior AO

  // ebony lacquer: near-black base under a mirror clearcoat; faint orange peel on the coat only
  M.lacquer = Q({ color: srgb('#050505'), roughness: 0.35, metalness: 0, clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 0.0 },
    { space: 'local', coatF0: true, coatWear: true, fold: true, kick: true, near: true, clearcoat: { f0: 210.0, s0: 0.0008, f1: 95.0, s1: 0.0004 } });
  M.lacquerLocal = Q({ color: srgb('#050505'), roughness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 0.0 },
    { space: 'local', coatF0: true, coatWear: true, fold: true, kick: true, clearcoat: { f0: 210.0, s0: 0.0008, f1: 95.0, s1: 0.0004 }, ao: null });
  // legs, lyre and bench legs: the same lacquer with their own fold amount (agFoldLegK): physical by default, so a
  // backlit leg is black with warm rim lines at its edges (refs 2, 4, 9) instead of mirroring the glow over its width
  M.lacquerLeg = Q({ color: srgb('#050505'), roughness: 0.35, metalness: 0, clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 0.0 },
    { space: 'local', coatF0: true, coatWear: true, fold: 'leg', kick: true, clearcoat: { f0: 210.0, s0: 0.0008, f1: 95.0, s1: 0.0004 } });
  M.lacquerLegLocal = Q({ color: srgb('#050505'), roughness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 0.0 },
    { space: 'local', coatF0: true, coatWear: true, fold: 'leg', kick: true, clearcoat: { f0: 210.0, s0: 0.0008, f1: 95.0, s1: 0.0004 }, ao: null });
  M.satinBlack = Q({ color: srgb('#0a0a0b'), roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.30 }, { space: 'local', fold: true });
  M.matteBlack = Q({ color: srgb('#060606'), roughness: 0.8 }, { space: 'local' });

  // keys (neighbour-aware occlusion of the side faces)
  // polished acrylic keytop: a mirror coat over a slightly satin warm-white body (critic round 1: the keys read as matte
  // lilac plastic, p99/p50 1.1 vs 2.2 on ref 12); per-key scatter of tone and gloss so 52 keys do not read as one extrusion
  M.keyWhite = Q({ color: srgb('#EEEAE0'), roughness: 0.35, specularIntensity: 0.3, clearcoat: 1.0, clearcoatRoughness: 0.05, ior: 1.49 },
    { space: 'local', normal: { f0: 900.0, s0: 0.003, f1: 2600.0, s1: 0.002 }, ao: 'keys', fold: true, keyFold: true,
      colorFn: 'float kh = agHash3(vec3(agKSelfv, 17.0, 3.0)); diffuseColor.rgb *= 0.98 + 0.04 * kh;',
      roughFn: 'float kh2 = agHash3(vec3(agKSelfv, 5.0, 11.0)); roughnessFactor = clamp(roughnessFactor + 0.03 * (kh2 - 0.5), 0.05, 1.0);' });
  M.keyWood = Q({ color: srgb('#D8C7A4'), roughness: 0.62 }, {
    space: 'local', ao: 'keys',
    colorFn: `float g = agNoiseD(vec3(agP.x * 1400.0, agP.y * 900.0, agP.z * 35.0)).x; float r = agNoiseD(vec3(agP.x * 300.0, agP.y * 300.0, agP.z * 6.0)).x;
              diffuseColor.rgb *= 0.90 + 0.10 * g + 0.06 * (r - 0.5);`,
  });
  M.keyBlack = Q({ color: srgb('#0E0E10'), roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.08 },
    { space: 'local', fold: true, normal: { f0: 1600.0, s0: 0.006, f1: 400.0, s1: 0.004 }, ao: 'keys' });

  // felts
  const felt = (hex, sheenHex, f = 3500) => Q({ color: srgb(hex), roughness: 1.0, sheen: 1.0, sheenColor: srgb(sheenHex), sheenRoughness: 0.6 },
    { space: 'local', normal: { f0: f, s0: 0.10, f1: f * 2.7, s1: 0.06 }, colorFn: `float v = agNoiseD(agP * ${(f * 0.35).toFixed(1)}).x; diffuseColor.rgb *= 0.92 + 0.14 * v;` });
  M.hammerFelt = felt('#DCD4C2', '#D8D0BE');            // played felt (critic: #EDE8DA was the brightest thing inside)
  // string grooves worn into the crown: three per unison (x = -3.9, 0, +3.9 mm in head space), 0.8 mm wide, top 6 mm
  M.hammerFelt.userData.agPatch.normalFn = 'float agTop = smoothstep(0.044, 0.049, agP.y); float agG = 0.0; for (int k = -1; k <= 1; k++) { float dx = (agP.x - float(k) * 0.0039) / 0.0004; agG += -2.0 * dx * exp(-dx * dx); } normal = agPerturb(normal, vec3(agG * 0.35 * agTop, 0.0, 0.0));';
  patchMaterial(M.hammerFelt, M.hammerFelt.userData.agPatch);
  M.hammerFelt.color.multiplyScalar(1.0);
  M.underFelt = felt('#C9C6BE', '#d8d4ca');
  M.damperFelt = felt('#E9E4D6', '#e8e2d4');
  M.redFelt = Q({ color: srgb('#6E1420'), roughness: 1.0, sheen: 0.6, sheenColor: srgb('#8A2A34'), sheenRoughness: 0.55 },
    { space: 'local', normal: { f0: 2600.0, s0: 0.15, f1: 7000.0, s1: 0.08 }, colorFn: 'float v = agNoiseD(agP * 900.0).x; diffuseColor.rgb *= 0.9 + 0.18 * v;' });
  M.burgundyFelt = Q({ color: srgb('#5e1220'), roughness: 1.0, sheen: 1.0, sheenColor: srgb('#9a2a36'), sheenRoughness: 0.55 },
    { space: 'local', normal: { f0: 3000.0, s0: 0.10, f1: 8000.0, s1: 0.06 } });

  // wood parts of the action
  M.molding = Q({ color: srgb('#8A5A3A'), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 },
    { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 300.0, agP.y * 2500.0, agP.z * 300.0)).x; diffuseColor.rgb *= 0.85 + 0.25 * g;' });
  M.shank = Q({ color: srgb('#cdb48a'), roughness: 0.55 },
    { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 2000.0, agP.y * 2000.0, agP.z * 60.0)).x; diffuseColor.rgb *= 0.88 + 0.2 * g;' });
  M.actionWood = Q({ color: srgb('#6e5a42'), roughness: 0.7 }, { space: 'local' });

  // cast-iron plate in gold (bronze-powder) lacquer: semi-metallic so it gathers the warm glow, cast-surface bump
  // gold (bronze-powder lacquer over cast iron): cast-surface undulation + fine metallic flake in the normal, mottled
  // tone and roughness so it reads as a painted casting, not plastic; the clear coat gives the soft top sheen
  // (session 5) bronze-powder paint under a clear lacquer: the coat follows the cast undulation (1.5-3 mm) and carries
  // thin sky lines on strut crowns and hole flanges; the base lobe gets the metallic flake (0.2 mm)
  M.plate = Q({ color: srgb('#E0B276'), metalness: 0.6, roughness: 0.34, clearcoat: 1.0, clearcoatRoughness: 0.08 },
    { space: 'local', normal: { f0: 450.0, s0: 0.02, f1: 5000.0, s1: 0.08 }, clearcoat: { f0: 450.0, s0: 0.014, f1: 160.0, s1: 0.006 },
      colorFn: 'float v = agNoiseD(agP * 28.0).x; float w = agNoiseD(agP * 140.0 + 3.7).x; diffuseColor.rgb *= 0.88 + 0.12 * v + 0.07 * w;',
      roughFn: 'float rv = agNoiseD(agP * 60.0 + 9.1).x; roughnessFactor = clamp(roughnessFactor * (0.82 + 0.36 * rv), 0.2, 0.5);' });

  // metals
  M.brass = Q({ color: lin(0.89, 0.72, 0.38), metalness: 1.0, roughness: 0.12 }, { space: 'local', normal: { f0: 3000.0, s0: 0.004, f1: 800.0, s1: 0.003 } });
  // polished brass; foot scuffs only on the tread top, streaked along the pedal (critic round 1: the old isotropic
  // scuff mottle made the necks read corroded); necks and sides a constant 0.10
  M.brassPedal = Q({ color: lin(0.89, 0.72, 0.38), metalness: 1.0, roughness: 0.10 },
    { space: 'local', fold: 'brass', normal: { f0: 2500.0, s0: 0.004, f1: 600.0, s1: 0.002 },
      vertexDecl: 'varying vec3 agNO;', vertexMain: 'agNO = objectNormal;',
      fragDecl: 'varying vec3 agNO;',
      roughFn: 'float top = smoothstep(0.7, 0.9, normalize(agNO).y); float sc = agNoiseD(vec3(agP.x * 900.0, agP.y * 40.0, agP.z * 60.0)).x; roughnessFactor = mix(0.10, 0.06 + 0.05 * sc, top);' });
  M.nickel = Q({ color: lin(0.66, 0.64, 0.60), metalness: 1.0, roughness: 0.10 }, { space: 'local' });
  M.steelPin = Q({ color: lin(0.75, 0.75, 0.73), metalness: 1.0, roughness: 0.25 }, { space: 'local' });
  M.tuningPin = Q({ color: lin(0.30, 0.31, 0.37), metalness: 1.0, roughness: 0.15 }, { space: 'local' });   // blued steel: dark but specular
  M.steelString = Q({ color: lin(0.80, 0.80, 0.82), metalness: 1.0, roughness: 0.18, anisotropy: 0.6 }, { space: 'local' });
  const wind = makeWindingNormalMap();
  M.copperString = Q({ color: lin(0.80, 0.47, 0.33), metalness: 1.0, roughness: 0.30, normalMap: wind, normalScale: new THREE.Vector2(1, 1) }, { space: 'local' });
  M.windingMap = wind;

  // soundboard: varnished spruce with boards and growth rings along the grain direction
  const ga = (grainDeg * Math.PI) / 180;
  M.soundboard = Q({ color: srgb('#CFA867'), roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 }, {
    space: 'local',
    uniforms: { agGrainDir: { value: new THREE.Vector2(Math.cos(ga), Math.sin(ga)) } },
    fragDecl: 'uniform vec2 agGrainDir;',
    colorFn: `
      vec3 pp = (agPianoInv * vec4(agPW, 1.0)).xyz;
      vec2 q = pp.xz; float along = dot(q, agGrainDir); float across = dot(q, vec2(-agGrainDir.y, agGrainDir.x));
      float board = floor(across / 0.12);
      float bt = agHash3(vec3(board, 3.0, 7.0));
      float warp = agNoiseD(vec3(along * 3.0, across * 8.0, board)).x * 0.004 + agNoiseD(vec3(along * 0.7, board, 1.0)).x * 0.006;
      float ring = fract((across + warp) / (0.0016 + 0.0006 * bt));
      float late = smoothstep(0.62, 0.86, ring) * (1.0 - smoothstep(0.9, 1.0, ring));
      diffuseColor.rgb *= (0.94 + 0.10 * bt) * (1.0 - 0.16 * late);`,
    normal: { f0: 1800.0, s0: 0.002, f1: 600.0, s1: 0.002 },
  });
  M.spruce = Q({ color: srgb('#c9a46a'), roughness: 0.6 }, { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 30.0, agP.y * 600.0, agP.z * 600.0)).x; diffuseColor.rgb *= 0.86 + 0.22 * g;' });
  M.bridgeMaple = Q({ color: srgb('#D9B98A'), roughness: 0.4, clearcoat: 0.2, clearcoatRoughness: 0.3 },
    { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 900.0, agP.y * 150.0, agP.z * 900.0)).x; diffuseColor.rgb *= 0.88 + 0.18 * g;' });
  M.graphite = Q({ color: srgb('#4a3f36'), roughness: 0.5, metalness: 0.15 },
    { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 700.0, agP.y * 100.0, agP.z * 700.0)).x; diffuseColor.rgb *= 0.8 + 0.35 * g;' });
  M.innerWood = Q({ color: srgb('#7a4428'), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.12 },
    { space: 'local', colorFn: 'float g = agNoiseD(vec3(agP.x * 40.0, agP.y * 900.0, agP.z * 40.0)).x; diffuseColor.rgb *= 0.86 + 0.2 * g;' });
  M.bushing = Q({ color: srgb('#c8a878'), roughness: 0.6 }, { space: 'local' });

  // bench leather: black, grain 0.5 mm, mild sheen
  M.leather = Q({ color: srgb('#121112'), roughness: 0.55, sheen: 0.3, sheenColor: srgb('#3a3434'), sheenRoughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.45 },
    { space: 'local', normal: { f0: 1900.0, s0: 0.05, f1: 5200.0, s1: 0.03 }, ao: null });

  for (const k of Object.keys(M)) if (M[k] && M[k].isMaterial) { M[k].userData.agName = k; M[k].name = k; }
  return M;
}
