# 04 · The violinist's left hand: what a correct posture is, and what the rig got wrong

Brief for #037 / #038 (`violinist/rig.js`). The fingers looked wrong: in the user's screenshots (20 Oct 2026) they stand up from the neck in a V, straight, with the pinky side of the hand high and the thumb hanging below the neck. This note sets out the target posture from teaching sources and hand anatomy, measures the rig against it, and gives the recipe the rig now follows. `violinist/test/posture.mjs` checks the numbers.

Frame: the violin's (`strings/violin3d.js`). x runs along the strings from the nut toward the bridge, y is the normal of the top (up from the fingerboard), and z runs across with the G string at +z and the E at −z. Sizes are for a full-size violin (k = 1). `s` is the player's hand size relative to #033's hand (the middle finger is 9.7 cm in #033; the VRoid men measure about 0.9 of that).

## 1. The posture (sources)

Contact. The hand touches the neck in two places only: the side of the thumb pad, just above its top joint, and the crease at the base of the index finger against the E-string side of the fingerboard. The thumb is opposite the base of the index finger, or between fingers 1 and 2 ([Ros Stephen, The Strad 2022][stephen]; [Rapoport, *Violin for Dummies*][dummies]). The palm does not touch: there is room for "a little mouse" in the U between the thumb and the base of the index ([Rapoport][dummies]).

Thumb. Fairly straight and relaxed, its tip "just peeking over the top of the fingerboard", its base forming the U under the neck ([Rapoport][dummies]). In high positions it moves to the neck heel and then under it (#033).

Knuckles. The base joints of fingers 2–4 stay close beside the fingerboard without touching the wood ([Rapoport][dummies]). The knuckle line is roughly parallel to the neck but not forced to be: "don't force your knuckles to be completely parallel to the violin neck" ([Rapoport][dummies]). In first position the hand slants back, the index knuckle at the neck's edge and the little finger's knuckle a little higher toward the fingerboard and further along it. Teachers correct a hand whose pinky side drops away from the neck, because the 4th finger then cannot reach ([Stephen][stephen]).

Wrist. Straight: the forearm, wrist and hand form one line "when viewed from the scroll and from the side" ([Stephen][stephen]), turned in slightly toward the neck ([Ridge, The Strad 2024][ridge]). Measured on violinists and violists with a WristSystem goniometer, the wrist moved through under 15° in all four directions while playing ([Shih & Shih 1999][wrist]).

Elbow. Under the instrument. It swings toward the player's right, under the strings, for the G string, so the fingers keep their shape across the strings ([Ridge][ridge]). It comes further in for high positions.

Fingers. Rounded, landing on the tip (the pad just short of the nail), and as close to vertical over the string as the hand allows. The 4th finger stays curved, never locked straight ([Stephen][stephen]; [Kalinovsky, The Strad 2022][kalinovsky]). Each finger bends in its own plane at right angles to the knuckle line. A finger can splay sideways at its base joint by about 15–20°, but it cannot bend sideways at the middle and end joints.

Joint coupling and ranges (anatomy). The end joint follows the middle joint: DIP ≈ 0.75 × PIP when the finger curls freely (index, [Hahn et al. 1995][rodasales]; ≈ 0.75 slope in [Van Zwieten et al. 2015][rodasales], table 1 of Roda-Sales et al. 2022). Pressing a string can flatten it a little. Active ranges are MCP 0–90° (the base joint can extend back by 20° or more), PIP 0–100°, DIP 0–80°. A curved violin finger sits well inside them: MCP 20–70°, PIP 45–100°, DIP 20–70°.

## 2. What the rig did (Bach BWV 1006 Preludio, t = 6 s, first position)

Before the fix, measured in the violin frame (cm and degrees):

| | #033's model | VRoid hand (before) | target |
|---|---|---|---|
| index knuckle | (1.2, 2.5, −3.4) | (2.6, **0.2**, −4.0) | at the E edge of the neck: y ≈ fbY − 1 = 3.2 |
| little knuckle | (6.2, 2.5, −3.4) | (4.8, **4.9**, −2.8) | beside the board, about level with it |
| elbow | (21.9, −21.6, −11.5) | (32.4, **−11.1**, −6.7) | under the violin, ~20 cm below it |
| base joints, fingers 3 / 4 | — | **103° / 110°** | 20–80° |
| middle joints, fingers 3 / 4 | — | **25° / 31°** (nearly straight) | 45–100° |
| finger bending plane vs knuckle line | — | **87–112°** (bending sideways) | the hinge along the knuckle line |
| thumb tip | target (2.9, 2.8, 1.4) | (3.6, 0.7, **−0.1**) | on the G side of the neck |

There were three faults, and each caused the next:

1. The elbow came from the arm IK's pole, given in world axes. It landed 10 cm too far toward the bridge and 10 cm too high, so the forearm ran almost along the neck.
2. The hand's orientation came from the forearm direction, kept exactly for a straight wrist, with #033's knuckle line only as the roll reference. With the forearm nearly parallel to the knuckle line, that roll was close to degenerate. The hand rolled about 60°: the index knuckle went low and the little knuckle sat above the fingerboard.
3. Each finger was solved in the vertical plane through its knuckle and its stop, which is #033's piano-style solver. That plane contained the knuckle line, so fingers 3 and 4 bent sideways and reached almost straight.

Two facts about the model shape the fix. The VRoid arms are short for a full-size violin: upper arm 22 cm and forearm 25 cm, so with the shoulder in place the elbow could only open to about 137°. The fingers are about 0.8 of a man's (index to little 7.8, 8.7, 7.8 and 7.1 cm), so the little finger cannot reach its first-position stop from a knuckle at the nut.

## 3. The recipe (rig.js `leftHandPose`, `handFinger`)

- **Contact.** The index base joint is pinned where the crease rests on the neck. Along x it sits at #033's frame position, which can slide −1.5 to +3.5 cm: toward the scroll for a stop near the nut, toward the bridge for a short-fingered hand. It sits at y = fbY − 1.0 s and z = −(half-width + 1.1 s).
- **The left clavicle comes forward**, up to 25°, until the elbow can bend to about 110°, as a violinist's left shoulder does.
- **The hand turns about the pinned knuckle** by three angles: the knuckle line's slant up the neck (th), the little knuckle out from the neck (ya), and the roll of the palm (ro). The model's own hand shape fixes the rest. The wrist follows from the knuckle, and the elbow is the point on the two-bone circle (shoulder → wrist) nearest the straight line through the hand. The search is a coarse grid (5 × 3 × 3 angles × 3 contact positions) on the first frame, every half second, and whenever the fit gets worse, at most ten times a second. Each frame also runs a coordinate descent with halving steps, and the chosen pose is smoothed.
- **The cost of a pose**:
  - wrist bend (×1 per degree, ×3 past 12°, ×13 past 25°);
  - every fingertip on its stop (150 per cm up to 0.6 cm, then less, since a stop past a hand's reach should not wreck the hand);
  - each finger's base joint at −5…80°, its middle joint ≥ 30°, and its lean out of the plane square to the knuckle line ≤ 20°;
  - the little knuckle no more than 1.2 cm above the fingerboard;
  - the thumb within reach of its place under the neck;
  - the elbow under the violin;
  - the forearm and upper arm (with a sleeve) out of the violin's body;
  - preferences, and no jumps from the last frame.
- **Fingers** (`handFinger`). The base joint (MCP) moves as the condyloid joint it is: it flexes about an axis fixed in the hand (the knuckle line, −15…90°) and abducts about the finger's own back-of-finger axis (up to the finger's `SPLAY`), so abducting moves the middle joint sideways and the curled part follows, parallel. The middle joint bends 0…112° and the end joint 0.72 × the middle one, as hinges square to that plane. Only what abduction cannot reach is taken by turning the curl about the back-of-hand axis, which rolls the finger about its own length; that is capped at 12°, about a knuckle's passive axial play. (Turning the whole curl, as before, spun a bent finger up to 44° about its length: the knuckles looked twisted.) A stop behind the knuckle is reached by curling under. The thumb's two phalanges swing from where their parent carries them, with no roll about their own length.
- **The thumb** opposes at its base (CMC) joint, just enough to come within reach and at most 50°. It then bends toward the palm onto its place under the neck.

- **Holding the frame** (added after a review of the live motion: the knuckles rolled from note to note, and lifted fingers straightened). A violinist's hand stays put within a position while the fingers fall and lift. So:
  - a finger in the air counts for 5% of a pressed one in the search, and a finger #033 keeps held from an earlier note counts for 20%;
  - the hand turns at most ~90°/s within a position. It turns faster only when holding still would leave a pressed finger off its stop (the held pose scores 15+ worse than the best), and at up to ~180°/s while it shifts;
  - a lifted finger whose slot is out of easy reach keeps a relaxed curl (base 35°, middle 75°) instead of reaching out flat, and a held finger the hand cannot keep down is lifted the same way;
  - the ring and little fingers may fan 38° and 43° at the base, the index and middle 32°.

  Measured on 20 s of each piece at 60 frames a second, the share of frames where the knuckle line turns faster than 90°/s fell from 3.0% to 0.8% (Preludio) and from 16.2% to 6.4% (Paganini, mostly in shifts).

Cost: about 1.4 ms per frame on top of the rest of the rig (Chromium, software rendering).

## 4. Checks (`violinist/test/posture.mjs`)

Every 0.25 s over the first 120 s of each piece, for each finger pressing a string:

- the tip on its stop within 0.3 cm;
- the base joint at −15…90°;
- the finger leaning ≤ 30° out of the plane square to the knuckle line;
- the middle joint at 25…112° (the 4th finger ≥ 10°).

For the hand:

- wrist bend ≤ 25°, and ≤ 15° on 90% of frames;
- the index knuckle within 4 cm of the contact;
- the little knuckle ≤ 2 cm above the board;
- the thumb within 2 cm of its place;
- the elbow ≥ 8 cm below the violin's top.

Over 20 s at 60 frames a second, the hand may turn faster than 150°/s on at most 1% of the frames inside a position. A check fails if more than 2% of samples are out of range, or more than 0.5% are far out. For the fingertip the limits are 3% and 1.5%, because the fingerings ask for the odd chord, crossed double stop or shift that no hand makes cleanly. Stops that #033's own hand cannot reach are counted apart as stretches.

Results after the fix (median / 95th percentile):

| piece | base joint | middle joint | lean | wrist bend | stretches |
|---|---|---|---|---|---|
| Bach Preludio BWV 1006 | 50° / 80° | 94° / 112° | 7° / 18° | 3° / 11° | 0.8 % |
| Bach Ciaccona BWV 1004 | 51° / 81° | 94° / 112° | 8° / 19° | 7° / 12° | 9.7 % |
| Paganini Caprice 24 | 50° / 84° | 93° / 108° | 7° / 19° | 6° / 12° | 7.7 % |
| Beethoven Kreutzer iii (light-brown model) | 53° / 80° | 93° / 112° | 7° / 18° | 2° / 11° | 1.9 % |

Fingertips are on their stops in the median and at the 95th percentile everywhere. The elbow sits 17–20 cm below the violin. The collision sweep (`collisions.mjs`) passes on its four runs.

[stephen]: https://www.thestrad.com/playing-hub/playing-with-a-relaxed-fourth-finger-by-violinist-ros-stephen/4360.article
[dummies]: https://www.dummies.com/article/how-to-frame-your-left-hand-to-hold-the-violin-143302
[ridge]: https://www.thestrad.com/playing-hub/setting-up-the-left-hand-a-guide-for-beginner-violinists/17618.article
[kalinovsky]: https://www.thestrad.com/playing-hub/technique-how-to-achieve-clean-and-effortless-definition-in-the-left-hand-by-grigory-kalinovsky/7583.article
[wrist]: https://pubmed.ncbi.nlm.nih.gov/12441547/
[rodasales]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9541616/
