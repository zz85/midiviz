// Dual-quaternion skinning for three.js SkinnedMesh materials.
//
// three.js blends bone matrices linearly (LBS). Where a joint bends far, a
// finger knuckle at 60–90° say, the blended matrix is no longer a rotation:
// the skin at the joint shrinks toward the bone and the finger looks pinched.
// Blending the bones as unit dual quaternions keeps every vertex on a rigid
// transform, so a bent joint keeps its volume.
//
// The bones must be rigid (rotation + translation, no scale), which holds for
// the avatar rigs. Shadows still use three's depth material (LBS); the
// difference there is a fraction of a millimetre.

const PARS = /* glsl */ `
vec4 dqQuatFromMat(mat3 m) {
  float tr = m[0][0] + m[1][1] + m[2][2];
  vec4 q;
  if (tr > 0.0) {
    float s = sqrt(tr + 1.0) * 2.0;
    q = vec4((m[1][2] - m[2][1]) / s, (m[2][0] - m[0][2]) / s, (m[0][1] - m[1][0]) / s, 0.25 * s);
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    float s = sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2.0;
    q = vec4(0.25 * s, (m[1][0] + m[0][1]) / s, (m[2][0] + m[0][2]) / s, (m[1][2] - m[2][1]) / s);
  } else if (m[1][1] > m[2][2]) {
    float s = sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2.0;
    q = vec4((m[1][0] + m[0][1]) / s, 0.25 * s, (m[2][1] + m[1][2]) / s, (m[2][0] - m[0][2]) / s);
  } else {
    float s = sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2.0;
    q = vec4((m[2][0] + m[0][2]) / s, (m[2][1] + m[1][2]) / s, 0.25 * s, (m[0][1] - m[1][0]) / s);
  }
  return normalize(q);
}
vec4 dqMul(vec4 a, vec4 b) {
  return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz));
}
void dqFromMat(mat4 m, out vec4 r, out vec4 d) {
  r = dqQuatFromMat(mat3(m));
  d = 0.5 * dqMul(vec4(m[3].xyz, 0.0), r);
}
void dqAdd(mat4 m, float w, vec4 r0, inout vec4 R, inout vec4 D) {
  vec4 r, d;
  dqFromMat(m, r, d);
  float sg = dot(r, r0) < 0.0 ? -1.0 : 1.0;   // shortest path
  R += r * w * sg; D += d * w * sg;
}
vec3 dqRotate(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
`

const BLEND = /* glsl */ `
  vec4 dqR = vec4(0.0), dqD = vec4(0.0);
  {
    vec4 r0, d0;
    dqFromMat(boneMatX, r0, d0);
    dqAdd(boneMatX, skinWeight.x, r0, dqR, dqD);
    dqAdd(boneMatY, skinWeight.y, r0, dqR, dqD);
    dqAdd(boneMatZ, skinWeight.z, r0, dqR, dqD);
    dqAdd(boneMatW, skinWeight.w, r0, dqR, dqD);
    float n = length(dqR);
    dqR /= n; dqD /= n;
  }
  vec3 dqT = 2.0 * (dqR.w * dqD.xyz - dqD.w * dqR.xyz + cross(dqR.xyz, dqD.xyz));
`

/**
 * Patch a material (used on SkinnedMeshes) to skin with dual quaternions.
 * Chains any onBeforeCompile already set. Returns the material.
 */
export function useDualQuatSkinning(material) {
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer)
    let vs = shader.vertexShader
    vs = vs.replace('#include <skinning_pars_vertex>', '#include <skinning_pars_vertex>\n#ifdef USE_SKINNING\n' + PARS + '#endif')
    vs = vs.replace('#include <skinnormal_vertex>', `#ifdef USE_SKINNING
${BLEND}
  objectNormal = (bindMatrixInverse * vec4(dqRotate(dqR, (bindMatrix * vec4(objectNormal, 0.0)).xyz), 0.0)).xyz;
  #ifdef USE_TANGENT
  objectTangent = (bindMatrixInverse * vec4(dqRotate(dqR, (bindMatrix * vec4(objectTangent, 0.0)).xyz), 0.0)).xyz;
  #endif
#endif`)
    vs = vs.replace('#include <skinning_vertex>', `#ifdef USE_SKINNING
  vec4 dqP = bindMatrix * vec4(transformed, 1.0);
  transformed = (bindMatrixInverse * vec4(dqRotate(dqR, dqP.xyz) + dqT, 1.0)).xyz;
#endif`)
    shader.vertexShader = vs
  }
  const key = material.customProgramCacheKey?.bind(material)
  material.customProgramCacheKey = () => (key ? key() : '') + '|dq'
  return material
}
