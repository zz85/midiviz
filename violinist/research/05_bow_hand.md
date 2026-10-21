# 05 · The violinist's bow hand and arm: the hold, what the rig got wrong, the fix

This is the brief for #037 / #038 (`violinist/rig.js`), the companion to `04_left_hand.md`. It builds on `01_violinist_biomechanics.md` §4, which covers bow dimensions, the three holds, arm levels per string, frog-to-tip roles, and wrist and pronation along the bow. `violinist/test/posture.mjs` checks the numbers.

Bow frame (`strings/violin3d.js` `buildBow`): x runs along the stick toward the tip (0 at the frog's front edge; the frog spans x −4…0.8 and y 0…1.6), y points from the hair up to the stick (y ≈ 1.6 at the frog), and z points toward the player when n = 1.

## 1. The Franco-Belgian hold (sources)

- **Thumb:** bent, its tip touching the stick where the frog meets it, opposite the middle finger. The middle finger and thumb form "a ring" that is the centre of balance of the hold ([Giora Schmidt, tonebase][schmidt]; 01 §4.1).
- **Index:** contacts the stick "between the first and second joints, well in front of the thumb", which gives leverage for volume ([Violinist.com][fb]). Joachim's index touched the stick at the top joint ([Flesch, via The Strad][strad]). Toward the tip the index presses more and the hand pronates by 20–30° (01 §4.6).
- **Middle and ring:** curved round the frog, with little space between them, partly covering the frog. They control the bow's tilt ([Violinspiration][vs]). The ring finger lies over the frog's eye.
- **Little finger:** curved, its tip on top of the stick. It carries the bow's weight at the frog and stays on the stick even at the point ([Flesch][strad]).
- **Fingers:** rounded and flexible, never gripping. The knuckles flex at the frog and the fingers straighten toward the tip (01 §4.6).
- **Wrist:** flexed 15–30° at the frog, neutral in the middle, neutral to 10° extended at the tip (01 §4.6). The total wrist range in violinists is under 15° in each direction ([Shih & Shih 1999][wrist]).
- **Elbow:** flexed 95–110° at the frog, about 90° in the middle (the "square": hand, wrist and elbow level), and opening to 20–40° of flexion (140–160°) at the tip. The upper arm leads in the lower half and the forearm in the upper half (01 §4.4; [Roy et al.][roy], via 01). The elbow sits at the level of the string being played (01 §4.3).

## 2. What the rig did (Bach BWV 1006 Preludio, the first 60 s)

| | before | target |
|---|---|---|
| right elbow | 179° (locked straight) on 84 % of frames | 95–160° by bow position |
| wrist bend | 70° median (62–72°) | ≤ 30° |
| thumb tip | 4 cm from the stick, on the player's side | in the corner of the frog and stick |
| fingers | leaning 30–41° out of their bending plane | in the plane square to the knuckle line |

There were two causes:

1. **The arm was too short for the bow.** The VRoid arm measures 22 + 25 = 47 cm from shoulder to wrist. A 180 cm man's measures about 33 + 26 ≈ 59 cm. The bow is placed for a full-size player (the Preludio's contact point is 44–55 cm from the frog), so the hand could only reach the frog with the arm locked straight. The grip's fixed hand orientation then bent the wrist 70° against it.
2. **The fingers were solved by the piano-style planar solver** with the roll taken from the knuckle line, as on the left hand before `04`. They bent sideways.

## 3. The recipe (rig.js `bowHandPose`, `bowFingers`)

- **Bow travel in proportion to the arm.** He uses the lower `bowReach` = (l1 + l2) / 58 cm ≈ 0.81 of the bow: the bow's position from the frog is scaled by it. This only changes what is drawn. The sound engines read their own performance curves.
- **Contacts** (bow frame, z × n):

  | finger | contact (x, y, z) |
  |---|---|
  | index tip | (3.0, 0.75, −1.15), on the far side, so the stick lies under its middle phalanx |
  | middle | (0.75, 0.85, −0.95), opposite the thumb |
  | ring | (−1.15, 0.7, −0.95), over the frog's eye |
  | little | (−2.6, 2.3, −0.1), on top |
  | thumb tip | (0.55, 1.05, 0.55), in the corner of the frog and stick |

- **A search over the hand's pose** each frame: 6 numbers, the knuckle position and a rotation of the nominal hold. The terms:
  - every fingertip on its contact through `handFinger` (04 §3), with base joint −10…85°, lean ≤ 25°, middle joint ≥ 60° (55° for the little finger);
  - the index's middle phalanx within 1.4 cm of the stick;
  - the palm down, so the back of the hand is up and the knuckles are above the stick;
  - the thumb's root within reach of its contact, bent;
  - the wrist bend near the research value for that part of the bow (+22° flexed at the frog to −8° at the tip);
  - pronation rising to +25° at the tip;
  - the arm within reach.

  The elbow comes from the string-level pole (01 §4.3). It swings out from the body when the forearm would come within 1.5 cm of the torso. The search is a coordinate descent from the last pose. After a retake or a fast stroke (cost > 40) it also restarts from the nominal hold.
- **Thumb** (`bowFingers`): it opposes at its base joint just enough to reach, at most 50°, then bends convex toward the bow's tip.

## 4. Checks (`violinist/test/posture.mjs`)

Every 0.25 s over the first 120 s of each piece:

- each fingertip on its contact (≤ 0.5 cm);
- base joint −15…90°;
- lean ≤ 30°;
- middle joint ≥ 25°;
- the thumb's tip on the frog (≤ 1 cm), bent ≥ 15°;
- the back of the hand up;
- the wrist within 15° of the research's bend (≤ 35° in all);
- the elbow at 60…165°.

The budgets are those of the left-hand checks.

After the fix (median, with the 5th–95th percentile in brackets):

| piece | elbow | wrist | finger middle joints | lean |
|---|---|---|---|---|
| Bach Preludio | 112° (104–116°) | −5° (−10 to +9°) | 70° | 6° |
| Bach Ciaccona | 78° (70–119°) | +13° (−11 to +20°) | 77° | 6° |
| Paganini 24 | 77° (69–116°) | +12° (−10 to +21°) | 78° | 7° |
| Kreutzer iii (light-brown model) | 84° (70–121°) | +9° (−12 to +20°) | 77° | 10° |

Every fingertip is on its contact, the thumb is on the frog and the palm faces down on every frame. The collision sweep passes, with the forearm at least 1.4 cm from the torso.

[schmidt]: https://www.tonebase.co/violin-blog-posts/how-to-hold-a-violin-bow
[fb]: https://www.violinist.com/blog/lafoca/20204/28185/
[strad]: https://www.thestrad.com/featured-stories/the-evolution-of-violin-bow-hold/5384.article
[vs]: https://violinspiration.com/violin-bow-holds/
[wrist]: https://pubmed.ncbi.nlm.nih.gov/12441547/
[roy]: 01_violinist_biomechanics.md
