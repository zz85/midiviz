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

// Spring hair against the arms, with a margin (the pianist, pianist/alt-model.js).
//
// three-vrm collides each joint's tail, a point with the joint's hit radius, against the
// colliders; the strand between two tails and the width of its card are not checked. A
// lock lying over a raised arm (hers over the keyboard) is kept out at its tails while
// the card between them and either side of them sinks into the upper arm: measured on
// pixiv's twist sample over 20 s of Rachmaninov 3, up to 1 % of the hair's vertices at
// once, 2.6 cm deep (tmp/vrm-ink/hair.mjs). Pushing the tails out by `margin` more
// against the arm colliders alone (for the hair joints only: sleeves keep the authored
// fit, and the hair keeps its fit on the head and back) cuts that by half or more.
//
// Each hair joint's collider groups are replaced by copies whose arm colliders are
// proxies: the same collider matrix (three-vrm updates it on the collider object), the
// shape's collision with the radius grown by `margin`. Once per model.
export function padHairArmColliders(vrm, margin, { hair = /hair/i, arm = /Arm|Hand/i } = {}) {
  const sb = vrm?.springBoneManager
  if (!sb || !(margin > 0) || sb.userData?.hairPad) return
  const proxies = new Map()
  const proxy = c => {
    if (!proxies.has(c)) proxies.set(c, {
      name: c.name, parent: c.parent,
      get colliderMatrix() { return c.colliderMatrix },
      shape: { type: c.shape.type, calculateCollision: (m, p, r, t) => c.shape.calculateCollision(m, p, r + margin, t) },
    })
    return proxies.get(c)
  }
  const groups = new Map()
  const padded = g => {
    if (!groups.has(g)) groups.set(g, { ...g, colliders: g.colliders.map(c => arm.test(c.parent?.name || '') ? proxy(c) : c) })
    return groups.get(g)
  }
  for (const j of sb.joints) if (hair.test(j.bone.name)) j.colliderGroups = j.colliderGroups.map(padded)
  ;(sb.userData ??= {}).hairPad = margin
}
