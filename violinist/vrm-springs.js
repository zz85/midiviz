// VRM spring bones (hair, skirts, ribbons) at a world scale other than 1.
//
// The models are authored in metres and drawn here in centimetres (×100, or the pianist's
// fitted scale). three-vrm's spring bones step in world units: each frame a joint's tail
// moves by its stiffness and its gravity times dt, and is checked against collider spheres
// and capsules of the authored radius, while the bone lengths and collider positions grow
// with the model. At ×100 the pull back to the rest pose is 1/100 of what the author tuned,
// so the hair swings wherever the body throws it and stays there (seen as hair flaring out
// sideways or folded back over the head), and the head and body colliders shrink to
// 1/100 of their size, so nothing keeps the hair out of the face.
//
// scaleSpringBones multiplies each joint's stiffness, gravity and hit radius, and each
// collider's radius, by k, which restores the motion the author tuned at metre scale.
// Offsets and capsule tails are in the collider's own frame and already scale.

/** Scale a loaded VRM's spring bones by k (the model's world scale); once per model. */
export function scaleSpringBones(vrm, k) {
  const sb = vrm?.springBoneManager
  if (!sb || !(k > 0) || k === 1 || sb.userData?.scaled) return
  for (const j of sb.joints) {
    j.settings.stiffness *= k
    j.settings.gravityPower *= k
    j.settings.hitRadius *= k
  }
  for (const c of sb.colliders) if (c.shape && 'radius' in c.shape) c.shape.radius *= k
  ;(sb.userData ??= {}).scaled = k
  sb.setInitState?.()
  sb.reset?.()
}
