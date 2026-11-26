// The fingering's hand size (fingering.js `handSize`, which scales every span
// limit of the Parncutt table) from the hand the rig plays with.
//
// The fingering's spans are tuned on #032's MakeHuman woman (handSize 1, M).
// Another model (pianist/alt-model.js) keeps its own hand, and its reach
// differs: pixiv's AvatarSample_A has short fingers and close knuckles, and
// fingered for the MakeHuman hand she missed her keys on Chopin's 15th prelude
// more often than the MakeHuman woman herself, on chords she can't stretch to.
//
// Her size is read from the rig's measurements (rig.js measureHand), against
// the MakeHuman hand's (pianist/test/hand-dims.json), as the mean of two ratios:
//  • the span: the thumb's and the little finger's lengths, bases to tips, and
//    the distance between their bases, laid out in a line (MakeHuman
//    10.04 + 5.09 + 7.15 = 22.28 cm), which sets the wide stretches (1-4, 1-5);
//  • the knuckles: index to little knuckle (MakeHuman 5.88 cm), which sets the
//    narrow ones between the fingers (2-3, 3-4, 4-5).
// Taken alone, the span overrates the anime hands, whose thumbs are long and
// knuckles close. Chopin's 15th, right hand, keys missed on frames
// (pianist/test/wrist.mjs, the whole piece): AvatarSample_A at handSize 1:
// 18.6 %, 0.91 (the span alone) 14.8 %, 0.8 12.9 %; the twist sample at 1:
// 11.4 %, 1.09 (the span alone) 11.5 %, 0.97 9.5 %. The mean gives 0.81 and 0.97.
// The MakeHuman pianist herself stays at 1, the size her fingering was tuned at
// (the golden baseline, fingering/test/golden.js).

/** The MakeHuman pianist's span, thumb to little finger, and knuckle width, index to little, cm (see above). */
export const REFERENCE = { span: 22.28, knuckles: 5.88 }
const MIN = 0.75, MAX = 1.2

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** A hand's span and knuckle width from its rig measurements (measureHand), cm. */
export function handReach(dims) {
  const F = dims?.FINGERS
  if (!F?.[1] || !F?.[2] || !F?.[5]) return null
  const len = f => F[f].len.reduce((a, b) => a + b, 0)
  return { span: len(1) + len(5) + dist(F[1].base, F[5].base), knuckles: dist(F[2].base, F[5].base) }
}

/**
 * The fingering's handSize for this character and rig: 1 for the MakeHuman woman, the mean
 * of her span's and knuckle width's ratios to it for another model; `override` (a page's
 * ?handsize=, 0.5 to 1.5) in place of either.
 */
export function fingeringHandSize(ch, rig, override = null) {
  if (override >= 0.5 && override <= 1.5) return +override
  if (!ch?.alt) return 1
  const ks = ['L', 'R'].map(s => handReach(rig?.dims?.[s])).filter(Boolean)
    .map(r => (r.span / REFERENCE.span + r.knuckles / REFERENCE.knuckles) / 2)
  if (!ks.length) return 1
  const k = ks.reduce((a, b) => a + b, 0) / ks.length
  return Math.round(Math.min(MAX, Math.max(MIN, k)) * 100) / 100
}
