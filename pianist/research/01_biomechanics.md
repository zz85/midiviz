# Piano biomechanics: the whole body, not only the fingers

Research brief and implementation plan for the #032 pianist (17 Oct 2026).
Fingers press the keys, but loudness, touch and phrasing come from the wrist,
forearm, elbow, shoulder and trunk, and players differ a lot in how much of
that movement they show. This note collects what the motor-control literature
says, compares it with what the rig does today, and plans the next steps,
starting with wrist height.

## 1. What the research says

**Loud notes come from the arm, and gravity does much of the work.**
Expert pianists play a struck keystroke by lifting the arm and letting the
forearm fall: during the downswing the triceps stay close to rest and the
biceps' anti-gravity activity drops, at every loudness level. Novices push
with their muscles instead.
Furuya, Osu & Kinoshita 2009, *Effective utilization of gravity during arm
downswing in keystrokes by expert pianists*, Neuroscience 164.
<https://www.ibroneuroscience.org/article/S0306-4522(09)01379-7/pdf>

**Proximal to distal.** In experts the peak angular velocities come in order:
shoulder, then elbow, then wrist. The shoulder decelerates on purpose, and the
interaction torques that braking produces accelerate the forearm and hand.
Novices show no such order.
Furuya & Kinoshita 2007, *Roles of proximal-to-distal sequential organization
of the upper limb segments in striking the keys by expert pianists*,
Neurosci Lett. <https://pubmed.ncbi.nlm.nih.gov/17574744>
Pianists with faster alternating keystrokes use more proximal joint motion:
Furuya et al. 2011, Front Hum Neurosci.
<https://www.frontiersin.org/articles/10.3389/fnhum.2011.00050/full>

**Two touches.** A *struck* touch starts with the arm lifted above the key; a
*pressed* touch starts with the fingertip resting on it. The pressed touch has
less elbow extension and more shoulder and finger flexion during the
key-press, and listeners hear its tone as softer.
Furuya, Altenmüller, Katayose & Kinoshita 2010, *Control of multi-joint arm
movements for the manipulation of touch in keystroke by expert pianists*, BMC
Neurosci 11:82. <https://pmc.ncbi.nlm.nih.gov/articles/PMC2919541/>
For the animation: soft notes start from the key surface, loud notes start
from above it.

**Loudness, not tempo, sets key speed, and experts use less force.** Peak key
speed varies with loudness and not with tempo; for loud tones pianists press
with a smaller peak force and impulse than non-musicians.
*Skilful force control in expert pianists*, Exp Brain Res 2017.
<https://link.springer.com/article/10.1007%2Fs00221-017-4926-3>
Visually: the arm moves, the fingers stay calm.

**Body movement follows the music's structure.** Movements beyond what the
notes need (often called ancillary) are tied to phrasing, meter and expressive
organisation.
*Ancillary body movements in piano performance: a critical narrative review*,
Front Psychol 2026. <https://www.frontiersin.org/articles/10.3389/fpsyg.2026.1838025>
The head and shoulders tend to move just before loudness peaks, the wrists
and elbows just after, and movement grows with expressive intent
(Thompson & Luck, motion capture with audio,
<https://www.scribd.com/document/487982259/Thompson-Luck-pdf>).
The same pianist moves more or less on request (minimum / normal / maximum
expression, Brahms Op. 118 No. 2, Qualisys capture: University of Jyväskylä
thesis, <https://jyx.jyu.fi/bitstreams/f7ca23b7-ec9e-4800-91b9-33fadc412295/download>).
Arms sway side to side on the beat; the upper torso rotates over two beats and
bends sideways over four (Toiviainen et al., *Embodied metre*).

**Viewers reward movement.** Ratings of phrasing, dynamics, rubato and the
whole performance rise as the pianist moves more.
Juchniewicz 2008, *The influence of physical movement on the perception of
musical performance*, Psychology of Music.
<https://www.researchgate.net/publication/247732729_The_influence_of_physical_movement_on_the_perception_of_musical_performance>
This supports one overall "how much she moves" setting with a wide range.

**Data.** FürElise (Wang, Xu, Shi, Schumann & Liu, SIGGRAPH Asia 2024,
<https://for-elise.github.io/>): about 10 hours, 153 pieces, 15 elite
pianists, 3D hand joints (21 per hand, MANO, 59.94 fps) synchronised with the
MIDI. Hands and wrists only, no body. Licence CC BY-NC 4.0, 47 GB
(<https://huggingface.co/datasets/rcwang/for_elise>). Usable for measuring
wrist height against velocity and how much it varies between pianists, kept
outside the repo like the PIG and TNUA datasets.

## 2. What each part does, and where the rig stands

| Part | In real playing | #032 today | To add |
|---|---|---|---|
| Fingers | Press the keys | Full IK from the #029 motion model | Nothing |
| Wrist | Lifts before loud notes and drops into the key; dips and rises on long notes; lifts off at phrase ends; bounces on staccato and octaves | Fixed knuckle height (`KEY_TOP + KNUCKLE_Y`, plus a lift when idle); pitched only for hand crossings | **Wrist height and tilt** (section 3) |
| Forearm | Rotates a little toward the pressing side; falls with gravity on chords | Small roll toward the pressing side | Larger rotation on tremolos and Alberti bass |
| Elbow | Follows the wrist; swings out for crossings | Two-bone IK, steered round the torso, kept low | Lead the wrist on big lifts |
| Shoulder | Starts the big strokes; rises a little in loud passages | Rolls forward for reach, small shrug with energy | A brief lift before loud chords |
| Torso | Leans with phrases, rocks, reaches | Lean, rock, sway, reach, turn, with sliders | Rise a little before a loud chord, sink with it |
| Head | Leads loudness peaks, nods on accents, looks around | Nods, gaze, glances, with sliders | Move slightly ahead of the energy peak |
| Hips and seat | Weight on one sit bone; slides for reach | Hip roll per phrase, bench slide for reach | Nothing new |

Every layer is a function of song time and is baked or computed from the
notes, so seeking and the MP4 export replay the same motion.

**Overall preset.** A *Movement* preset (Economical / Natural / Theatrical)
would set the per-part sliders together; the sliders still fine-tune.

## 3. Wrist height: the plan

### 3.1 Stroke planner, `pianist/stroke.js`

A pure module (no three.js, bun-testable). Input: one hand's notes
(onset, release, velocity 0–1) and options. Output, sampled at 120 Hz:
the knuckle **lift** above the playing height (cm) and the wrist **tilt**
about the knuckle line (radians, positive = wrist up).

- **Free windows.** The hand may only lift while it holds no key: the gaps in
  the union of its notes' [onset, release]. Legato playing has no gaps, so it
  stays on the keys (pressed touch) without a special case.
- **Preparation lift** before each onset group, from its loudest note:
  nothing below about mp, rising to ~7 cm at fff, × *Arm weight*. Limited by
  the time available: an arm lifts and falls at most ~40 cm/s, so fast
  passages stay flat on their own.
- **Drop.** The fall ends when the finger meets the key (12 ms before the
  onset, the motion model's press start) and keeps some speed into it, like a
  falling arm; the key stops it.
- **Proximal leads distal.** Tilt follows the lift's vertical speed: rising,
  the wrist goes up first and the fingers hang; falling, the wrist leads down
  and the fingers trail; on impact the wrist gives a little more, then
  recovers (× *Wrist flexibility*).
- **Held long notes** (≥ 0.6 s): a slow dip and rise of the wrist about the
  knuckles, the fingertip staying on its key.
- **Lift-off** after the last note before a rest (a gap of ≥ ~0.5 s and long
  for the passage's pulse): the wrist rises just before the release, then the
  hand floats up; the piece's last chord gets the biggest version
  (× *Lift-off*). The hand comes down again with the next preparation.
- **Staccato rebound**: after a short note the hand bounces up a little,
  limited by the time to the next note.

- **Passages played from the wrist.** Repeated notes (the same keys again
  within 0.6 s) and octaves in a row bounce the hand about the wrist: the
  knuckles rise up to 3 cm (quicker than the arm can, ~45 cm/s of free
  time) while the wrist stays put. Loud ones add an arm lift on top.
- **Leaps** (the hand moves more than 12 cm): the hand travels in an arc,
  0.12 cm of height per cm travelled, up to 6 cm, in the time there is.
- **Running notes** (single notes stepping by up to a third, < 0.2 s apart)
  stay on the keys: fingering and forearm rotation do the work.

Tuning after the first version (17 Oct): preparation heights and the arm's
speed limit doubled (14 cm at full velocity, ~80 cm/s); lift-offs cut to about
a third (final lift 2–5 cm, phrase ends 1–2 cm).

- **Forearm rotation** (19 Oct): running notes and broken figures turn the
  forearm instead of lifting the hand. The hand rolls toward the finger about
  to play (thumb side down for 1, little-finger side for 4 and 5), arriving as
  the key goes down: tremolos, broken octaves and Alberti bass rock it, a scale
  drifts gently, chords stay nearly level. 0.2 rad for a 1 or 5 at default,
  more for quick and loud notes, at most 0.4 rad and 8 rad/s (a fast tremolo
  rocks less far), level again once the hand has let go (Forearm rotation
  slider). The roll is about the hand's long axis through the middle knuckle
  and the wrist, so the wrist stays put and the solved and rendered knuckles
  agree.

### 3.2 In the hand driver

`hand-driver.js` adds the lift to the knuckle height and the tilt to the
wrist pitch it already has (`setPitch`, used for crossings). Contact is kept
by the planner itself: the lift is zero while a key is held, and the tilt
pivots about the knuckles, so a held fingertip stays where it is. The planner
is separate from the baked placement, so a slider change recomputes only the
stroke (milliseconds), not the whole bake.

### 3.3 Arm sequence

The elbow and shoulder follow the raised wrist through the arm IK; the hand
trailing on the way down comes from the tilt rule above. A shoulder lift
before big strokes is a later step.

Done (17 Oct): the shoulder rises with the hand's stroke 100 ms early and
carries the elbow (Elbow lead slider); measured by cross-correlating elbow
and wrist vertical velocity, the elbow now moves 80–110 ms ahead of the wrist
(correlation 0.5–0.7, against 0.1–0.2 before). The speed-driven wrist tilt is
about a third of the first version, since the forearm and hand fall as one.

### 3.4 Live keyboard

No look-ahead, so no preparation lift; only lift-off and rebound after a note
could apply. Not done yet.

### 3.5 Settings

Under Playing style, saved in the link:
- **Arm weight**: how much loudness comes from lifting the arm (0 = all fingers).
- **Wrist flexibility**: how much the wrist leads, gives and dips.
- **Lift-off**: how high the hands come up at phrase ends and the last chord.

### 3.6 Checks

- Fingertip-to-key gap unchanged on a typical note.
- On a loud piece (Hungarian Rhapsody friska) the lift before each onset
  tracks velocity; on a fast one (Minute Waltz) it stays near zero.
- No jerks in fast passages (vertical speed and acceleration of the wrist).
- Renders of a final-chord lift-off.
- Optional: wrist height against velocity in FürElise, for a few pianists.
