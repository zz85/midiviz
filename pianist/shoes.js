// Shoes for the Experiment #032 pianist: black patent flats cut from the
// skin of the feet (pianists play in flat or low shoes) — the sole, the toe
// box and the heel counter, open over the instep, finished with a piped edge.

import * as THREE from 'three'
import { cutShell, piping, skinned } from './shell.js'

export function createShoes(ch, { color = '#0d0c0d' } = {}) {
  const body = ch.parts.body.geometry
  const P = body.attributes.position.array
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array
  const FOOT = /^(foot|toe)/
  const toeZ = ch.joints['toe1-1.L____head'].z      // the ball of the foot (toes toward -z)
  const shell = cutShell(ch, v => {
    let w = 0
    for (let k = 0; k < 4; k++) if (FOOT.test(ch.bones[SI[v * 4 + k]].name)) w += SW[v * 4 + k]
    if (w < 0.5) return false
    const y = P[v * 3 + 1], z = P[v * 3 + 2]
    // vamp over the toes, a low line along the sides, a heel counter behind
    const t = THREE.MathUtils.clamp((z - (toeZ + 1)) / 7, 0, 1)
    const top = THREE.MathUtils.lerp(6.2, 2.8, t) + Math.max(0, z - (toeZ + 9)) * 0.25
    return y < top
  }, { gap: 0.3, offset: 0.4, iterations: 12 })
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide })
  const shoe = skinned(ch, shell.geometry, mat)
  const edge = skinned(ch, piping(shell.loops, 0.22), mat)
  const object = new THREE.Group()
  object.name = 'shoes'
  return {
    object, setColor(c) { mat.color.set(c) },
    update() { shoe.visible = edge.visible = object.visible },
  }
}
