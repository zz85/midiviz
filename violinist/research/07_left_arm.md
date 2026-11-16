# 07 · The left arm: what should move, what should not, and how ours does

Research note for #037 / #038 / #051 (15 Nov 2026), the left-arm companion to
`06_bow_arm.md`. `01_violinist_biomechanics.md` §3 holds the posture numbers
(shoulder, elbow, forearm, wrist by position, the thumb, vibrato kinds,
shifting); `04_left_hand.md` the hand and fingers, which `violinist/test/posture.mjs`
checks. This note is about the **arm**: the elbow's swing with the string and
the position, its stillness within a position, what it does on a shift and in
vibrato, and what the rig does instead, measured with `violinist/test/leftarm.mjs`.
Tags as in 01: **[V]** checked in a source, **[T]** teaching practice, **[calc]**
derived, **[M]** measured on the rig here.

## 1. What the left arm does

### 1.1 It mostly holds still

Of 12 professionals, the spine, thorax, neck and left arm were "quite static"
and almost all motion was in the bow arm [V, Wolf et al. 2019, via 01 §1.2].
The left arm's job is to present the hand to the fingerboard in the same shape
on every string and in every position. Its motions are few and slow:

| Motion | What moves | How much | When |
|---|---|---|---|
| String swing | the elbow swings toward the midline (under the fingerboard, toward the player's right) for the lower strings; the forearm rotates with it | 2–3 cm per string from E to G [T, 01 §3.2]; G vs D playing differs measurably in the left wrist [V, Wolf 2019] | with the string change, over 100–300 ms; in fast crossings the hand's fingers reach instead and the arm takes a middle level [T] |
| Position swing | the elbow comes further right and forward as the hand climbs | 1–1.5 cm per position, reaching the midline about 7th position on the G string [T, 01 §3.2] | with the shift |
| Shift | the whole arm carries the hand; up-shifts led by the arm (the elbow starts 50–100 ms before the hand), down-shifts by the thumb | 0.29–0.46 s whatever the tempo [V, Visentin et al. 2015] | |
| Vibrato | finger (joints flex, hand yields), wrist (±5–10° flexion, forearm still) or arm (forearm swings about the elbow, ±1–2°) | 5.6–5.9 Hz, ±15 cents ≈ ±2.5 mm at the fingertip in 1st position [V, Mellody & Wakefield 2000; Lionello & Ramírez 2018] | arm mode above 5th position and on the G string, wrist mode 1st–4th, finger for pp and short notes [T, 01 §3.5] |
| Clavicle | protracts 2–4° (more for a flat hold) so the elbow gets under the neck; relaxes in high positions as the hand comes closer | up to 25° on a short-armed player [calc, rig] | |

Everything else is stillness: the shoulder does not rise or drop with the
notes, the elbow does not bob with the fingers, the wrist stays straight in the
low positions (01 §3.3).

### 1.2 Why the elbow swings

Each string sits at a different place across the neck; without the swing the
fingers on the G string would have to reach across the board with flatter,
longer fingers, and on the E string curl tightly. Swinging the elbow in rolls
the whole hand round the neck so the fingertips meet each string from the same
angle. On the viola the swing is larger, since the neck is wider [T]. Teachers
describe it as the elbow "under the violin" for G and "out to the left" for E;
the forearm supinates further for G [V, Margulies et al. 2023, via 01 §2.2: low
passive supination forces shoulder compensation].

## 2. How our violinist does it [M]

Method: `037_violinist.html?shot` headless at 60 fps for 60 s from t = 4 s,
the left shoulder, elbow and wrist in the violin's frame (x along the strings
from the nut, y the top-plate normal, z across the strings with G at +z; in the
world the +z side is the player's left and up, so toward the midline is −z),
binned by the string fingered and by position from `pose.base`
(`violinist/test/leftarm.mjs`). Default model: left arm 22.0 + 24.9 cm.

### 2.1 What is right

- **Position swing** along the strings: the elbow moves from x 25.6 cm (1st)
  to 27.0 (2nd–3rd), 28.4 (4th–5th), 30.5 (6th–7th), 31.1 (8th+): 5.5 cm over
  seven positions, within the 1–1.5 cm a position. It also comes down and in
  (y −18 → −22). The clavicle relaxes from 0.4 rad to 0 above 4th position.
- **Stillness** within a position: the elbow stays within 0.4 cm of its 0.5 s
  mean on 95 % of frames (max 1.6 cm) on all three pieces. No bobbing.
- **Shifts** carry the elbow 0.6 of the hand's distance, up and down, which is
  the arm swinging as a unit.

### 2.2 What is wrong

**(a) No string swing.** The elbow's z by the string fingered:

| string | Preludio | Ciaccona | Paganini | #033's reference elbow | teaching |
|---|---|---|---|---|---|
| G | 5.6 | 5.5 | 6.5 | −13.0 | furthest toward the midline |
| D | 6.3 | 5.8 | 5.5 | −12.4 | |
| A | 6.2 | 6.4 | 5.9 | −11.5 | |
| E | 5.8 | 5.9 | 5.3 | −9.5 | furthest out |
| **G − E** | **−0.2 cm** | −0.4 | +1.2 | −3.5 | **−6 to −9 cm** |

The elbow sits at the same place for every string, within noise. `strings/hand3d.js`'s
`violinElbow` does swing its reference 6 cm × the G-ness of the mean finger
string (3.5 cm G to E as the pieces use it), but `rig.js leftHandPose` weighs
that reference at 0.25 per cm against a straight-wrist term of 1–3 per degree
and body-clearance terms of 400, so the reference never wins.

**(b) The elbow is on the wrong side of the strings.** At z ≈ +6 it sits on the
G side, level with the shoulder (z +6.4), with the forearm coming up almost
vertically under the fingerboard. The reference puts it at z −12, under the
strings toward the body. The clavicle's 23° of protraction in 1st position does
the reaching that the elbow swing should do.

**(c) No arm vibrato.** The elbow's stillness holds on the G string and above
5th position too, where the forearm should oscillate about the elbow at the
vibrato rate (±1–2°, ≈ ±0.5 cm at the elbow for a 25 cm forearm).

**(d) Shift timing.** The elbow leads the hand by one frame on up-shifts and
not at all on down-shifts; the teaching has 50–100 ms (3–6 frames) of arm lead
going up. Small on camera.

### 2.3 What would fix it

1. **A pole on the string-swing line**, as the bow arm's is in its plane (06
   §2.3 step 2): the elbow's target is a point under the fingerboard, swung
   toward the midline by 2.5 cm × (3 − s) for the string fingered (s = 0 for
   G), plus 1.2 cm per position, low-passed over 150 ms so a fast crossing
   leaves it parked between the strings as the bow arm's level does. Give it
   enough weight to move the elbow, and let the clavicle protraction come down
   as the elbow swings in (it was compensating).
2. **Arm vibrato**: when `vib` is on and (`base` ≥ 7 semitones or the string
   is G), add a sinusoid at the vibrato rate to the elbow pole along the
   forearm's swing direction, ±0.5 cm, phase-locked to `motion.js`'s `vib`.
3. **Shift lead**: start the pole's position term 60 ms before the hand on
   up-shifts (`motion.js` knows the shift ahead of time).
4. **Test** (`posture.mjs`): elbow z on the G string at least 4 cm toward the
   midline of its E-string place over a piece that uses both; stillness as now
   (≤ 1 cm from the 0.5 s mean on 95 %, shifts excluded) except where arm
   vibrato is on; the collision sweep (`collisions.mjs`) for the forearm against
   the violin's body, which is the risk when the elbow swings under it.

### 2.4 After the fix (16 Nov 2026) [M]

The swing is bounded by the wrist, not by the weight. Probing the two-bone
circle of elbows for the hand frame the fingers demand in 1st position (shoulder
at z +6.4, wrist at z −2, forearm direction set by the straight-wrist rule): the
elbows that keep the wrist within 15° of straight lie at z 0 to +8 for this arm
(22 + 25 cm), and there are none for a 33 + 26 cm arm with the same shoulder.
The textbook swing to z −6…−9 needs the hand to roll with the forearm, which
the finger targets, solved first in the violin frame, don't allow. Each cm of
swing past z 0 costs about 4° of wrist deviation; the clavicle can't help (±0.3
rad of tilt moves the shoulder 0.4–2 cm in z).

What `leftHandPose` does now:

- the elbow is the point of the two-bone circle nearest a swing reference (z
  −2 − 2.5 cm × (3 − s) × armK for the string fingered, low-passed 150 ms, plus
  1.2 cm a position), among 36 points of the circle (the old ring had 10, and
  the elbow jumped between them as the reference moved), with the wrist's
  bend costed at 0.3/° to 11°, 1.8/° to 15° and 4.8/° past it, and the body
  clearance tested on the four cheapest;
- the chosen elbow is smoothed over 100 ms and put back on this frame's
  circle, so the hand's frame-to-frame search doesn't shake it;
- vibrato: in wrist mode (below 5th position on D, A, E) the hand rocks about
  the wrist ±2.5° in phase with `vib`, after the pose smoothing (which would
  damp 5.6 Hz), with the elbow as solved; in arm mode (5th position and up,
  or the G string) no rock, so the straight-wrist rule carries the hand's
  travel to the forearm.

| | before | after | teaching |
|---|---|---|---|
| elbow z, E string (Preludio / Paganini) | +5.8 / +5.3 | +0.7 / +2.9 | |
| elbow z, D string | +6.3 / +5.5 | +0.3 / +1.7 | |
| elbow z, G string (Paganini) | +6.5 | +2.7 | |
| swing E → D (Paganini) | +0.2 | −1.2 cm | −2.5 cm |
| elbow toward the midline, all strings | | 4–5 cm | |
| left wrist bend, 90th pct (Preludio) | 7.7° | 11.6° | ≤ 15° |
| elbow within a position, 95 % / max | 0.4 / 1.6 cm | 0.9 / 1.7 cm | still |
| wrist-mode vibrato: forearm angle swing, p-p (Adagio) | 0.6° | 1.1° (elbow still, 0.16 cm) | wrist flexes, forearm still |
| arm-mode vibrato: elbow travel p-p (Adagio) | 0.17 cm | 0.17 cm | ±0.5 cm |

The elbow is 4–5 cm further under the fingerboard on every string, and swings
about half the teaching's amount from E to D within the wrist budget. Arm-mode
vibrato is no different from before: the hand's travel (`anchorU`, ±0.22 cm)
reaches the elbow at 0.17 cm either way; a visible forearm swing would need
the knuckles to stay put and the fingertip's travel to come from the elbow,
which is `motion.js`'s to give (the stop moves; where the hand pivots is the
rig's). A first attempt that moved the elbow reference by −0.4 × `vib` moved
nothing (the search's smoothing ate it) and was taken out. The posture test's
left-wrist budget (90th percentile ≤ 15°) and the collision sweep pass on
every piece; the forearm's nearest approach to the violin is unchanged.

## 3. References

Those of `01_violinist_biomechanics.md` §7: Lionello & Ramírez 2018; Margulies
et al. 2023; Mellody & Wakefield 2000; Visentin, Li, Tardif & Shan 2015; Wolf,
Möller, Ballenberger, Morisse & Zalpour 2019; The Strad on arm, wrist and finger
vibrato; Violinist.com on vibrato types.
