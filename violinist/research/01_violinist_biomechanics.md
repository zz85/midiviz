# Violinist biomechanics: what a standing, full-body rig needs

Research brief for the #037 violinist (18 Oct 2026): a MakeHuman man
(default 163-bone rig, 180 cm) stands on a concert stage and plays the solo
part of a MIDI file. Fingering, left-hand and bow motion and bowing physics
exist for a floating violin (#033 / #034); this note covers the body that
holds the instrument, the arms that reach it and the motion of the whole
player. It does not repeat `strings/research/01_violinist_rules.md`,
`02_algorithms.md` (shifting data, bowing physics, score/audio → motion
papers) or `03_violin_sound.md`.

Tags: **[V]** checked in a source fetched for this brief; **[T]** teaching
practice or observation, no measurement found; **[calc]** derived here.
Body frame: **x right, y up, z forward**, origin on the floor between the
heels unless stated. MakeHuman `.L` is the player's left (−x).

---

## 0. What the existing code gives us

`strings/motion.js` `buildMotion(notes).poseAt(t)` returns, per frame:

| Field | Meaning | Use in the body rig |
|---|---|---|
| `base`, `anchorU` | hand position (semitones, cm from the nut, vibrato included) | left hand frame along the neck |
| `thumb` | thumb position flag (cello / bass) | – (violin: thumb rule §3.3) |
| `vib` | vibrato offset (cm, ±0.22 at 5.6 Hz, starts 0.15 s in) | wrist / forearm oscillation §3.5 |
| `fingers[1..4]` | `{ s, u, press, lift, held }` | fingertip IK targets (`hand3d.js`, #029 solver) |
| `bow` | `{ pos (cm from the frog, 0–65), dir, lift 0–1, speed cm/s, s (float string, 0 = G … 3 = E), playing }` | bow pose → right hand frame §4 |

`strings/sound/performance.js` adds per-string curves at 250 Hz: bow velocity
(m/s, signed), force (N) and β (bow–bridge distance / vibrating length).

`strings/violin3d.js` frame (cm): x along the strings (nut 0, bridge
L = 32.8, body top x0 = 13.0, end button 48.6, scroll at −x, total ≈ 59 cm),
y = top-plate normal, z across (G at +z). `bowContact(s, β)` gives the contact
point; `bowTilt(s)` = lerp(−0.3, 0.3) rad, 34° G→E, about half the measured
65° (§4.3). `hand3d.js` has `twoBone(A, C, l1, l2, pole)`, the left hand and a
bow hold carried by the bow (thumb x ≈ 0.8, index ≈ 2.9, little finger ≈ −3.6
cm from the hair's frog end). In #033 the shoulders are fixed points in the
violin frame; in #037 the body places the violin. `pianist/rig.js` already
poses this skeleton, measures `UPPER`, `FORE`, `clavLen` at load and spreads
twist over `upperarm01/02`, `lowerarm01/02`: reuse it.

---

## 1. Standing posture and whole-body motion

### 1.1 Stance [T]

- **Feet** about hip width apart: heels 20–30 cm, toes turned out 10–20°.
  Most players put the left foot slightly forward (5–15 cm) and the weight a
  little more on it, 55–60 % left at rest.
- **Knees** unlocked, 3–8° flexion; weight shifts start there.
- **Pelvis** level, the body turned 10–20° left of the audience direction so
  the violin (another 30–45° left of the chest) aims at the hall.
- **Spine** upright; the thorax turns another 5–10° left against the pelvis
  and tilts 2–5° left under the instrument's weight.
- Sitting changes the right arm on the low strings only: standing gives more
  right glenohumeral abduction (max 47–74° vs 41–65° sitting) and less elbow
  flexion (max 95–112° vs 100–113°); 7 professionals, 240 Hz Qualisys
  [V, Roy et al. 2026].

### 1.2 How a violinist moves with the music

What the data say:

- In 12 professionals, the lumbar and thoracic spine, thorax, neck and left
  arm were "quite static", and almost all motion was in the right arm
  [V, Wolf et al. 2019]. Whole-body motion is small and slow, but it is what
  makes the figure look alive.
- Experts move the bow-arm shoulder less in the sagittal plane than
  learners [V, Konczak et al. 2009].
- Sway carries leadership and emotion: a quartet leader's sway predicts the
  others' [V, Chang et al. 2017]; trio sway coupling rises in expressive
  takes [V, Chang et al. 2019]; a first violinist's head moves more
  predictably in the quartet than solo [V, Glowinski et al. 2013].
- Violinists add motion and slow down at cadences, more at global than local
  resolutions [V, Chander et al. 2022]. Sway forms sinusoid-like and arch
  contours over phrases (trombonists) [V, Demos et al. 2017].
- No violin study with sway amplitudes in cm was found; the numbers below
  are estimates from concert video [T].

Suggested motion layers (amplitudes for "normal" expression; the expression
slider scales them 0–2.5×) [T]:

| Layer | What moves | Amplitude | Timing |
|---|---|---|---|
| Phrase sway | pelvis + chest translate left/right, weight shifts between the feet | ±2–4 cm at the hips, ±3–6 cm at the head | one cycle per 1–2 phrases (4–8 bars); toward the right foot at phrase climaxes |
| Phrase lean | trunk pitches forward into a crescendo, back on a release | 3–8° | follows the loudness curve, leading it by 0.2–0.4 s |
| Breath | inhale before phrase starts; shoulders and scroll rise | scroll +3–8°, shoulders +1 cm | 0.3–0.6 s before the entry, exhale through the phrase |
| Cue | scroll lifts and drops on the downbeat (ensemble starts, after fermatas) | scroll 5–15° up, then down | lift one beat before, drop on the beat |
| Bow-driven trunk | chest turns left (toward the violin) and the right shoulder comes forward near the tip; turns back at the frog | 2–5° yaw | in phase with long strokes (> 1 s); none for fast strokes |
| Violin meets bow | violin yaws a few degrees toward the bow on accents and long down-bows | 2–4° | with the stroke |
| Knee bounce | knees flex on strong accents and chords | 2–5° | on the accent, 0.1 s recovery |
| Head | nods on accents, turns slightly toward the scroll in high positions | 2–6° | on beats; follows `base` |

Keep two rules: sway is low-pass (no component faster than ~1.5 Hz except the
knee bounce), and the violin is carried by the chest, so every trunk motion
moves the instrument too (§2.4).

### 1.3 Three concert situations [T]

- **Soloist with orchestra.** At the conductor's left, front edge, turned
  15–30° toward the baton. In tuttis the violin comes down (by the neck at the
  left side or under the right arm, bow hanging), head toward the orchestra;
  re-raise 1.5–3 bars before the entry (lift ≈ 1 s, settle the jaw, bow on the
  string 0.3 s before the note). The orchestra carries the beat, so sway is
  free and largest at climaxes and cadenzas.
- **Solo Bach.** Nobody to cue: more centred, slower sway tied to harmonic
  rhythm, half the phrase sway, but stronger gestures on 3–4 note chords (arm
  sweep, small knee dip); head often still, eyes closed.
- **Sonata with pianist.** In the curve of the piano, turned 20–40° toward
  the pianist. Entrances cued with breath and scroll; both sway in phase on
  shared phrases (Chang et al.). During piano solos the bow comes off the
  string, the violin often stays up.

### 1.4 What anime exaggerates

- *Your Lie in April* (Kaori Miyazono). The director found violin far harder
  than piano (left hand and bow must be timed together). The studio filmed a
  model performer as reference, laid the violin out with 3D renders, drew most
  shots from above, and redrew fast passages with bigger, slower bow strokes
  because the real ones were too fast and small to read [V, Ishiguro 2015].
  Kaori is written as free-spirited and improvising [V, fandom wiki]; on
  screen this comes out as large trunk leans, back-bends with the scroll up
  at climaxes, travelling steps, hair and dress in motion, eyes closed, and
  the bow flung off the string after final notes [T: general description,
  not checked shot by shot for this brief].
- *Nodame Cantabile*. Mine Ryutaro is a rock-minded violinist whose technique
  others call sloppy; in his exam performance, with Chiaki at the piano, he plays
  the violin part "in a metro and pop way" [V, fandom / MAL character pages].
  For the rig that means hip swings, knee bends, head nods on the beat and
  wide bow flourishes [T]. Chiaki Shinichi, "a perfectionist
  gifted at both the piano and violin" [V, Rolling Stone India], is the
  opposite: upright, little sway, clean straight bowing.

Rig takeaways: an **expression** slider (§1.2 layers × 0–2.5) and an
**anime** switch: visual bow strokes 1.5–2× longer at a lower rate in fast
passages (sound unchanged), back-bends to 15–20° at climaxes, off-string bow
flourishes at phrase ends, and a beat-locked "rock" style for Mine. Never
exaggerate the left hand: viewers check the fingers.

---

## 2. Holding the violin

### 2.1 Contact points [T unless marked]

- **Lower bout** on the left collarbone, the end button against the left
  side of the neck, 3–7 cm left of the suprasternal notch; a shoulder rest
  raises the back 2–5 cm and adds a contact on the front of the left shoulder.
- **Jaw** (left mandible, not the chin point) on the chin rest, over the
  tailpiece on the G side. The head's weight, neck relaxed, stabilises the
  violin on the collarbone [V, violinist.com]. Rib 3.1 + arch 1.5 + chin rest
  1.5–3 + shoulder rest 2–5 cm fill the 10–13 cm collarbone-to-jaw gap.
- **Left hand** at the index base and the thumb; it supports, the violin can
  be held briefly with no hand [V, The Strad].

### 2.2 Orientation, with numbers

Define the violin's long axis (end button → scroll) and its lateral axis
(across the top plate, G side → E side).

| Angle | Range | Default | Source |
|---|---|---|---|
| Yaw: long axis vs the player's facing direction, to the left | 20–50° (standardised test positions); "approximately 45°+" in beginner checklists | 40° | [V, Margulies et al. 2023; IUP checklist] |
| Roll: lateral axis vs horizontal, E side down | 20–50° | 30° | [V, Margulies et al. 2023] |
| Elevation of the scroll (pitch) | scroll between breast height ("low") and shoulder height ("high"), ≈ −15° to +10° | +3° | [V, Frontiers 2026 playing types; calc] |

Going from yaw 20° / roll 20° to 50° / 50° reduced the left upper arm's
adduction from vertical from 24.8 ± 2.7° to 18.6 ± 3.1°, left-shoulder
elevation from 22.5 to 4.8 mm and protraction from 5.7 to 1.9 mm (30 students,
200 Hz mocap); low passive supination, high positions and the little finger
increased these compensations [V, Margulies et al. 2023]. A second study
found four playing types: scroll at shoulder or breast level, ≈ 20° or 45° to
the frontal plane [V, Frontiers 2026]. Yaw 40° / roll 30° is a mid-range
player; a flat, forward violin (20° / 20°) forces a raised, pulled-in left
arm. The roll lets the bow arm reach the G string without lifting the elbow
above the shoulder; from the audience the top plate faces up and to the
player's right.

### 2.3 Head [T]

- Rotation left 20–40°, lateral bend left 10–20°, flexion 10–20°; eyes down
  the fingerboard. Students with neck pain bend and rotate further left
  [V, Park et al. 2012, no numbers in the abstract]; use the low ends.
- Spread over `neck01..03`, `head` ≈ 20 / 25 / 25 / 30 %. The head may float
  off the chin rest in rests and low positions and presses more on
  down-shifts; nods ride on top.

### 2.4 How the violin moves with the body

- Attach the violin to a **chest frame** (`spine01` orientation, left
  clavicle head position), plus its own small motion: breath and cue lifts,
  the bow-meeting yaw (§1.2), 1–2° wobble on heavy strokes; in total ±5° yaw,
  ±5° pitch, ±3° roll relative to the chest [T]. Scroll travel over a phrase
  is 5–15 cm, mostly from the trunk [T].
- The head follows the violin (solved after it), so the jaw stays on the chin
  rest.

### 2.5 Viola

- Body 38–43 cm vs 35.6, string length 36–38.5 cm vs 32.8, 25–35 % heavier
  [T; `fingering.js` L = 375 mm, `violin3d.js` scale ≈ 1.14]. Same hold, with
  more left-arm extension, the left elbow further right, yaw ≈ 45° [T].
  Larger bow tilt (to 60° vs 45°) and higher force on the C string
  [V, Schoonderwaldt 2009]; bow ≈ 70 g.

---

## 3. Left arm and hand

### 3.1 Arm posture in first position

For the default hold (§6.2) the hand at the nut is ≈ 45 cm forward-left of
the left shoulder [calc]:

- **Shoulder** flexed ≈ 45–60°, horizontally adducted 30–45°, externally
  rotated so the forearm comes up under the neck [calc]; adduction from
  vertical 19–25°, elevation 5–23 mm [V, Margulies 2023].
- **Elbow** flexed ≈ 85–110° (interior 70–95°; ≈ 90° for the defaults,
  §6.4), more in high positions where the hand comes closer. It hangs under
  the neck, 25–30 cm below the strings.
- **Forearm** supinated 70–90°, near its limit [T]; less supination range
  means more shoulder compensation [V, Margulies 2023].
- **Wrist** straight in 1st position; the palm does not touch the neck [T].

### 3.2 Elbow swing [T]

So that each string gets the same finger shape, the elbow swings right
(toward the midline) 2–3 cm per string from E to G, and further right and
forward 1–1.5 cm per position, reaching the midline around 7th position on the
G string. G vs D string playing differs measurably in the left wrist
[V, Wolf et al. 2019].

### 3.3 Hand, thumb and wrist by position [T]

| Position | Index base | Thumb | Wrist / palm |
|---|---|---|---|
| ½–1st | touches the neck at the index MCP (first knuckle), level with the fingerboard on the E side | opposite finger 1 (or between 1 and 2), contact at the thumb's tip joint, tip above the fingerboard edge by 0.5–1.5 cm | straight |
| 2nd–3rd | same, the hand slides as a unit | moves with the hand, still opposite 1–2 | straight; in 3rd the heel of the palm touches the rib at the neck heel |
| 4th | the palm rests against the upper rib | starts to sit in the curve of the neck heel | starts to bend forward over the body |
| 5th–7th | the hand comes over the upper bout | under the neck at the heel, then slides along the edge of the body | flexed forward 20–45° so the knuckles go over the fingerboard; the elbow is further right |
| 8th+ | over the body | only the tip under the neck heel, or off it | maximal |

`hand3d.js` already parks the thumb at the neck heel for high positions and
keeps the knuckles beside the fingerboard on the top-string side.

### 3.4 Fingers [T]

- Rounded fingers landing near the tip (flatter pads for wide vibrato and on
  the G string). PIP flexes most, DIP ≈ 0.6–0.8 × PIP (`solveFinger`, #029),
  MCP 30–60°: more on the E string, less on the G string where the finger
  reaches across. The fourth finger is flatter; it extends rather than curls.
- Lifted fingers hover 3–8 mm (2–4 mm in fast passages); fingers stay down
  under higher notes on the same string. Both are already in `motion.js`.

### 3.5 Vibrato

- **Rate** 5.9 Hz mean, ±15.2 cents [V, Mellody & Wakefield 2000]; 5.63 ±
  0.48 Hz (4.1–6.8) in another corpus [V, Lionello & Ramírez 2018]; faster by
  0.32 Hz and wider in high registers than low, and wider at louder dynamics
  [V, *Influences of dynamic level…* 2008]. Our `performance.js` uses 5.8 Hz, 15–35 cents.
- **Fingertip travel** [calc]: d(stop)/d(cent) = L·ln2/1200·2^(−d/12) =
  0.19 mm·2^(−d/12) on the violin, so ±15 cents is ±2.5 mm in 1st position and
  ±1.7 mm at the 9th semitone. The `motion.js` amplitude (±2.2 mm) is right.
  The visible motion of the hand is larger than the fingertip's because the
  finger rolls: the knuckles move 1.5–3× as far.
- **Kinds**, often mixed (Szeryng: "a combination of finger, wrist and
  forearm") [V, The Strad]: *arm* (forearm swings about the elbow, ±1–2°,
  wide; high positions, G string), *wrist* (flexion/extension ±5–10°, forearm
  still; 1st–4th position), *finger* (the finger's joints move, the hand yields
  passively, Galamian [V, violinist.com]; narrow, short notes, pp) [T for the
  angles]. Keep `vib` on the fingertip and add the matching wrist or elbow
  oscillation: arm mode for `base` ≥ 5th position or the G string.

### 3.6 Shifting

Measured shifts take 0.29–0.46 s regardless of tempo; tall players initiate
up-shifts with the wrist and down-shifts with the thumb [V, Visentin et al.
2015, see `02_algorithms.md` §6.1]. For the body:

- The arm leads up-shifts: the elbow starts swinging right/forward 50–100 ms
  before the hand, on the same minimum-jerk profile `motion.js` uses for the
  hand; on down-shifts the thumb moves first and the elbow follows [T].

---

## 4. Right arm and bow

### 4.1 Bow dimensions and the hold point

- Violin bow 74–75 cm, 58–62 g, balance point 25–27 cm from the button end
  [V, Corilon]; hair 638–649 mm [V, Birmingham collection], ribbon ≈ 10 mm;
  frog ≈ 4.5–5 × 2 cm with the screw button behind it, a leather thumb grip
  and 8–10 cm of winding just ahead [T]. Viola bow ≈ 74 cm, 70 g [T].
- **Hand on the bow** (bow frame: x along the hair from the frog, y to the
  stick): bent thumb under the stick at the frog's front (x ≈ 0–1), opposite
  the middle finger; index on the stick at x ≈ 3–4, near its middle joint;
  ring finger over the frog's eye; curved little finger on top at x ≈ −2…−4
  [T]. `hand3d.js` matches this.

### 4.2 The three bow holds [T]

| Hold | Index contact | Pronation (forearm, at the frog) | Wrist / elbow | Look |
|---|---|---|---|---|
| Franco-Belgian | between first and second joint; fingers moderately spaced | 30–45° | medium-high wrist, elbow at the bow's level | the default (most modern players) |
| Russian (Auer) | deeper, at or past the second joint; index pressing more | 45–60°, more toward the tip | higher elbow and wrist; flatter, longer fingers | Heifetz, Milstein |
| Galamian | between the two; fingers closer, little finger high and curved | 30–40° | the arm "level" rule (§4.3) | US conservatory standard |

Default Franco-Belgian; expose pronation offset and index depth as style.

### 4.3 Arm levels per string

Inclination (choosing the string) spans ≈ 65° from G to E in the instrument
frame; tilt (stick toward the fingerboard) −10…45° on the violin, more at the
frog and at pp; skewness ±10° [V, Schoonderwaldt 2009]. In fast patterns the
crossing leads the bow change by ~15° of phase [V, Schoonderwaldt &
Altenmüller 2014]. In the world the frog end drops by roll + local
inclination [calc; roll 30°, ±22–32° about the A–D middle]:

| String | Bow's frog end vs horizontal | Right elbow height (180 cm man, shoulder at 147 cm) | Upper arm abduction |
|---|---|---|---|
| G | ≈ 0–10° down | ≈ shoulder level −5 cm (≈ 140 cm) | 60–75° |
| D | ≈ 15–25° down | ≈ 133 cm | 50–60° |
| A | ≈ 30–40° down | ≈ 125 cm | 40–50° |
| E | ≈ 45–60° down | ≈ 118 cm | 30–40° |

This matches the standing abduction maxima of 47–74° on the low strings
[V, Roy et al. 2026] and the "arm level" teaching: upper arm, forearm and bow
roughly in one plane, the elbow at the bow's height for each string [T]. Slow
crossings move the whole arm to the new level; fast ones (arpeggios,
bariolage) use wrist and fingers with the arm parked at the middle level [T].

### 4.4 Frog to tip: who does what

- **Lower half**: the upper arm moves (shoulder horizontal abduction), the
  elbow angle changes little; at the frog it is flexed 95–110° [V, Roy 2026
  maxima; calc].
- **Middle**: the "square", upper arm and forearm ≈ 90°, hand, wrist and
  elbow at one level [T].
- **Upper half**: the forearm opens to 20–40° flexion at the tip, pronation
  and index pressure increase, and the right shoulder protracts a few cm [T;
  §6.4 shows the arm cannot reach otherwise].
- **Bow changes**: wrist and fingers absorb the reversal; at the frog the
  fingers give 1–2 cm of "finger stroke" before the new down-bow [T].
- **Speed**: in an accelerando the velocity profile flips abruptly from
  rectangular to sinusoidal (7 Hz strokes for the violinist, max 15 Hz), and at
  the fastest rates wrist and elbow go from anti-phase to in-phase
  [V, Rasamimanana et al. 2009]. Fast détaché is forearm and wrist only.

### 4.5 Keeping the bow parallel to the bridge

The hand must travel on a straight line perpendicular to the strings. The
arm does it by combining shoulder horizontal abduction/adduction, shoulder
flexion and elbow extension, with the forearm rotating. Real paths are not
perfectly straight: rounded paths and crooked bowing at the tip are normal
even in renowned players, and skewness is used on purpose to move the contact
point [V, Schoonderwaldt 2009, after Hodgson]; 0 ± 5° with a slight inward
drift at the tip looks right. In the rig the bow is placed first and the wrist
target taken from its grip, so the bow enforces the line and two-bone IK with
the swivel rule (§6.3) supplies the elbow.

### 4.6 Wrist, fingers and pronation along the bow [T]

| Bow position | Wrist | Fingers | Forearm pronation (added to the hold's base) | Tilt |
|---|---|---|---|---|
| frog (0–10 cm) | flexed 15–30°, slight radial deviation | most flexed, little finger carrying the bow's weight | +0° | largest (20–45°) |
| middle (25–35 cm) | neutral | medium | +10–15° | medium (10–20°) |
| tip (55–65 cm) | neutral to extended 10° | straight, index pressing | +20–30° | small (0–10°) |

Tilt also rises at pp and falls at ff [V, Schoonderwaldt 2009]. Drive it from
`performance.js` force: tilt ≈ lerp(35°, 5°, force / 1.5 N) blended with the
bow-position term.

### 4.7 Strokes [T unless marked]

| Stroke | Where on the bow | Motion | Typical numbers |
|---|---|---|---|
| Legato / long notes | whole bow | whole arm as in §4.4 | 10–30 cm/s at mf; whole bow in 1–4 s |
| Détaché | middle or upper half | forearm + wrist, upper arm still | 20–60 cm/s; 5–20 cm per note |
| Martelé | upper half | a "bite" (force 1.5–3 N, index pressure) then a fast stroke and a stop on the string | stroke 10–25 cm, stop 50–150 ms |
| Spiccato | lower middle, near the balance point (20–35 cm from the frog) | bow dropped and lifted by wrist + forearm in a shallow arc | 6–12 Hz, lift 0.5–2 cm |
| Sautillé | balance point / middle | bow bounces by itself, wrist and fingers keep it going | 8–14 Hz, lift < 0.5 cm |
| Collé | at the frog | fingers pinch the string and lift: a finger stroke, the arm still | 1–3 cm stroke, then lift 1–2 cm |
| Ricochet | upper middle | thrown, bounces 2–6 times on one stroke | 10–15 Hz bounces |
| Bow lift / retake | – | circular path: lift, carry back to the frog, set down | lift 3–10 cm, 0.2–0.5 s |

Bow speed 5–100 cm/s, force 0.1–2 N, 3–4 N on accents [V, Schoonderwaldt
2009]. `motion.js` already computes strokes, lifts and retakes.

---

## 5. Motion data and models we could use

| Source | What | Size / rate | Licence / access | Use |
|---|---|---|---|---|
| MOSA (Huang et al., TASLP 2024) | 34 body/instrument markers (Qualisys, Vicon), audio, semantic labels; piano and violin | 742 performances, 23 musicians, > 30 h | CC BY 4.0 with a research-use clause; Zenodo access restricted (request) [V] | **best validation source** for sway, head and violin angles vs audio |
| SPD (Jin et al., SIGGRAPH / TOG 2024) | markerless, 23 views, audio; 3D body, hands, instrument and bow | 120 pieces, 3.0 h, cello and violin | HF repo tagged Apache-2.0; request form on the project page [V] | hands + bow + violin pose together: validate hand/bow frames and the violin hold |
| SPD-GEN / ELGAR (SIGGRAPH 2025) | whole-body cello motion from audio, SMPL-X, contact losses | – | form; SMPL-X licence applies [V] | method reference (hand–string and bow–string contact losses) |
| SyncViolinist (Nishizawa et al. 2024) | Vicon 120 fps, 57 body + 20 finger markers, bowing/fingering labels | 3.1 h, 61 pieces, 75 joints | e-mail request [V] | richest labelled violin mocap: bow direction ↔ arm and fingers. Their avatar hangs the violin on the neck joint aimed at the left thumb's first joint, and the bow on the right ring finger [V] |
| VioDat / VioPose (Yoo et al. 2024) | 12-camera Vicon at 100 Hz with hand markers, video 30 fps, audio | 639 videos, 12 players of mixed skill | project page; licence not stated [V] | vibrato and left-hand micro-motion |
| TELMI (Volpe et al. 2017); QUARTET (Papiotis et al. 2016) | marker mocap of body, instrument and bow | 2.4 h violin; 0.5 h quartet | TELMI follow-up "made freely available" [V]; licences not checked | bow-arm kinematics by skill; ensemble sway |
| Kao & Su, ACM MM 2020 | audio → 3D 15-joint violinist skeleton; dataset with several violinists per piece | 11 h, 14 pieces | GitHub (one fold of preprocessed features) [V]; licence not stated | baseline for a learned sway layer |
| Audio2BodyDynamics (Shlizerman et al., CVPR 2018) | MFCC → LSTM → 2D keypoints of internet recital videos (violin and piano) | 3.6 h | CC BY-NC [V]; starter data only | historical; 2D, not usable as 3D reference |
| Human–computer duet (arXiv 2009.07816, 2020) | a virtual violinist that follows a live pianist, body motion generated from audio | – | paper | sonata-with-pianist behaviour |

The measurement papers (Schoonderwaldt, Rasamimanana, Margulies, Wolf, Roy,
Turner-Stokes & Reid, Konczak, Visentin) give numbers but no downloadable
data. None of the datasets can drive the rig without retargeting (marker
sets, SMPL-X or 15-joint skeletons, access by request or research-only
terms). Two uses are practical: (1) **validation** of the hold angles, elbow heights
per string and sway amplitudes against MOSA or SyncViolinist (kept outside
the repo like PIG and TNUA); (2) later, **a learned sway layer** (loudness /
phrase features → pelvis, chest, head offsets) trained on MOSA, with the arms
kept procedural: no dataset has bow contact as precise as our motion model.

---

## 6. Rig recipe

### 6.1 Body numbers for a 180 cm man [T: Drillis & Contini ratios via Winter; measure the built skeleton at load]

| Landmark / segment | Value |
|---|---|
| Eye height | ≈ 168 cm (0.936 H) |
| Chin / jaw angle | ≈ 156 / 158 cm |
| Shoulder (acromion) height | ≈ 147 cm (0.818 H) |
| Suprasternal notch | ≈ 146 cm |
| Shoulder joints, apart | ≈ 36–40 cm (MakeHuman `upperarm01` heads ≈ 35 cm in the scaled pianist rig) |
| Clavicle | ≈ 15 cm |
| Upper arm (shoulder–elbow) | 0.186 H = 33.5 cm; MakeHuman joints sit inside the landmarks (the pianist rig scaled to 180 cm: 26 cm upper arm, 24 cm forearm), so measure the male build |
| Forearm (elbow–wrist) | ≈ 26 cm (0.146 H) |
| Hand (wrist–middle fingertip) | ≈ 19 cm (0.108 H) |
| Hip joint height | ≈ 95 cm |

The pianist's rig measures `UPPER`, `FORE` and `clavLen` from the skeleton;
do the same, and scale the violin by 1.0 (a full-size violin for a 180 cm
man).

### 6.2 Default hold in the body frame [calc]

Origin at the suprasternal notch N = (0, 146, 0); x right, y up, z forward.

- **End button** E = N + (−5, +1, +4) cm (left of the notch, on the collarbone,
  slightly forward because of the shoulder rest).
- **Long axis** d (end button → scroll) = yaw 40° left, elevation +3°:
  d = (−sin 40°·cos 3°, sin 3°, cos 40°·cos 3°) = (−0.64, 0.05, 0.77).
  The violin frame's +x points along −d (scroll at −x).
- **Roll** 30° about d with the E side (violin −z) down, so the top-plate
  normal leans toward +x (the player's right).
- Resulting points: nut ≈ E + 48.6 d = (−36, +3.5, +41) from N (hand in 1st
  position); bridge ≈ E + 15.8 d = (−15, +1, +16); scroll ≈ E + 59 d ≈
  (−43, +4, +49); strings ≈ 5–6 cm above the collarbone along the top normal.
- **Head**: left jaw on the chin rest point (violin frame x ≈ 44, y ≈ +5.5,
  z ≈ +4); rotation left 30°, lateral bend 15°, flexion 15° as the starting
  guess, then solved (§6.3, step 4).

### 6.3 Per-frame order

1. **Drivers** (pure functions of t): phrase position, loudness
   (`performance.js`), beat phase, cue/breath events (entries after ≥ 1 bar
   rest), expression and style.
2. **Legs**: feet locked; pelvis offset from sway and weight shift; two-bone
   IK `upperleg → lowerleg → foot`, knee pole ahead + 10° out, 3–8° flex plus
   accent bounce.
3. **Spine**: chest yaw/pitch/roll from §1.2 layers, spread over
   `spine05…spine01` (10/15/20/25/30 % from the pelvis up), plus the constant
   5–10° left turn and 2–5° left tilt.
4. **Violin**: pose = chest frame × default hold (§6.2) × violin-own motion
   (breath, cue, bow-meeting yaw, chord wobble). Then the **head**: aim so the
   jaw point lands on the chin rest (solve a 2-DOF yaw/roll with fixed nod,
   spread over `neck01..03`, `head`); clamp rotation to 45°, bend to 25°.
5. **Left hand frame** from `poseAt(t)`: origin at the index MCP, placed at
   x = `anchorU` from the nut, beside the fingerboard on the E side, 0.5–1 cm
   below the string plane; orientation from the neck (palm toward −z of the
   violin frame, fingers across the strings), with wrist flexion from §3.3 by
   `base`. Fingers by the existing `hand3d.js` solver.
6. **Left arm**: clavicle elevated 3–6° and protracted 2–4° (more for a flat
   hold); two-bone IK `upperarm01.L → lowerarm01.L → wrist.L` to the wrist
   point implied by the hand frame; twist split 50/50 into `upperarm01/02` and
   `lowerarm01/02`; supination into `lowerarm02.L` + `wrist.L`.
   **Pole**: a point P_L below the violin = (violin centre under the neck
   heel) − 30 cm × top normal, shifted toward +x (body midline) by
   2.5 cm × (3 − s) for strings E→G and by 1.2 cm × (`base` − 2)/2 per
   position, and forward by 0.8 cm per position. Add vibrato as ±1–2° elbow
   swing (arm mode) or ±5–10° wrist flex (wrist mode).
7. **Bow**: from `bow` and `performance.js`: contact point
   C = `bowContact(s, β·L)`; bow axis a = across the strings in the plane
   given by inclination θ(s) (≈ ±32° about the D–A midpoint, i.e. 21.7° per
   string) and skewness 0 ± 5°; tilt from §4.6; lift along the string-plane
   normal (`lift` × 1.6 cm, more for retakes); position the bow so the hair
   point `pos` lies at C. The frog end is on the E side (player's right).
8. **Right hand frame** = bow frame × the grip transform (hand3d's bow hold),
   then the frog-to-tip blend of wrist flexion, finger flexion and pronation
   (§4.6) applied as small rotations of the hand about the grip point, so
   the bow stays put and the wrist target moves.
9. **Right arm**: if |wrist − shoulder| > 0.97 (l₁ + l₂), first protract and
   raise the right clavicle (up to 15°, ≈ 4 cm at the shoulder) and turn the chest up to 5°
   left; then two-bone IK `upperarm01.R → lowerarm01.R → wrist.R`.
   **Pole (swivel)**: the elbow lies in the arm-level plane, the plane through
   the shoulder that contains the bow axis a; inside it, below the
   shoulder–wrist line. Offset the elbow from that plane by −8…−12 cm (below)
   at the frog, −3 cm at the middle, 0…+2 cm at the tip; add +2 cm for the
   Russian hold. Pronation goes into `lowerarm02.R` and `wrist.R`.
10. **Constraints pass** (§6.5), then apply secondary motion (sleeves, hair).

Timing details already in `motion.js` stay as they are (finger before bow ≤
50 ms, string crossing leading the bow change by ≈ 15° of phase, shifts on a
minimum-jerk path). Add: the elbows use the same profiles with a 50–80 ms lead
for shifts (left) and string levels (right).

### 6.4 Reach check for the defaults [calc]

With shoulders at (±19, 147, −1) cm in the floor frame, contact point
C ≈ (−15, 152, 17), bow axis toward the frog side (0.77, −0.3, 0.56)
normalised:

- **Frog on the E string**: wrist ≈ (−12, 152, 18), 37 cm from the right
  shoulder → elbow interior angle ≈ 82° (flexion ≈ 98°), inside the measured
  95–112° maximum [V, Roy 2026]. The right hand is in front of the left chest
  near the chin: correct, but watch the collisions (§6.5).
- **Tip**: wrist ≈ 65–67 cm further along the axis ≈ (36, 132, 55), ≈ 59 cm
  from the shoulder, more than l₁ + l₂ ≈ 56 cm. A real player reaches it by
  protracting the shoulder and turning the trunk, which is why step 9 moves
  the clavicle first. Keep the elbow at 15–25° flexion at the tip; never
  solve to a straight arm.
- **Left hand in 1st position**: hand ≈ 45 cm from the left shoulder; elbow
  ≈ (−24, 122, 20), under the neck; interior angle ≈ 85–95°.

### 6.5 Pitfalls

- **The bow must stay on the string.** Solve the bow from the contact point
  first and the arm second. If the arm cannot reach, move the shoulder and
  chest (step 9), never the bow. The hair touches the string; the stick must
  not touch it (tilt), and the bow must not pass through the adjacent strings
  (inclination per string, not the current 34° total).
- **The bow-arm elbow must not cross the body.** Keep the right elbow at
  x ≥ +8 cm (right of the sternum) and z ≥ −10 cm (not behind the back plane);
  at the frog on the E string, the right hand and the bow's frog come within
  10–15 cm of the face: check the hand against the chin and the frog against
  the left hand's forearm.
- **The left elbow must not intersect the violin.** Keep it ≥ 12 cm below the
  violin's back plane and the forearm ≥ 1.5 cm from the back and lower bout;
  test a capsule (forearm radius ≈ 3.5 cm with the sleeve) against the
  instrument's outline every frame. High positions on the G string are the
  worst case.
- **IK flips**: clamp reach to 0.97 (l₁ + l₂), low-pass the pole (50–100 ms),
  keep it on one side of the shoulder–wrist line.
- **Candy-wrapper forearms**: split pronation over `lowerarm01/02` and wrist.
- **Head after violin**, or the chin rest slides off the jaw on every nod.
- **Feet must not slide** when the pelvis sways.
- **Scale**: `violin3d.js` `k` must match the hold and the reach.
- **Bow tilt sign**: stick toward the fingerboard (toward the scroll), and
  more at the frog, the opposite of cello and bass
  [V, Schoonderwaldt 2009, after Trendelenburg].

---

## 7. References (fetched or checked 18 Oct 2026)

- Chander et al. 2022, violinists' gesture and timing at cadences, *Music Perception* 39(3) (abstract): <https://online.ucpress.edu/mp/article/39/3/268/119730/Violinists-Employ-More-Expressive-Gesture-and>
- Chang, Livingstone, Bosnyak & Trainor 2017, body sway and leadership, *PNAS*: <https://pnas.org/doi/full/10.1073/pnas.1617657114>
- Chang, Kragness, Livingstone, Bosnyak & Trainor 2019, body sway and joint emotion, *Sci Rep* 9:205: <https://www.nature.com/articles/s41598-018-36358-4>
- Corilon bow listings (length, weight, balance point): <https://www.corilon.com/us/violin-bows/french-violin-bow-claude-thomassin>; Birmingham Conservatoire collection (hair 638–649 mm): <https://www.bcu.ac.uk/conservatoire/research/hic/the-collection/string-bow/10-31>
- Demos, Chaffin & Logan 2017, sway and musical structure, *Musicae Scientiae*: <https://musiclab.uconn.edu/wp-content/uploads/sites/290/2018/01/2017-Demos-Chaffin-Logan-1.pdf>
- ELGAR, SIGGRAPH 2025: <https://arxiv.org/abs/2505.04203>, <https://github.com/Qzping/ELGAR>
- Frontiers in Psychology 2026, four violin playing types (abstract): <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1944291/full>
- Glowinski et al. 2013, quartet vs solo head movement, *Front Psychol* 4:841: <https://pubmed.ncbi.nlm.nih.gov/24312065/>
- Huang et al. 2024, MOSA dataset, IEEE/ACM TASLP: <https://github.com/yufenhuang/MOSA-Music-mOtion-and-Semantic-Annotation-dataset>, <https://zenodo.org/records/11393449>
- *Influences of dynamic level and pitch register on the vibrato rates and widths of violin and viola players* 2008 (authors not checked): <https://www.researchgate.net/publication/249808850>
- Ishiguro 2015, *Your Lie in April* director interview: <https://myanimelist.net/featured/97>
- IUP String Project checkpoints: <https://www.iup.edu/musictheatredance/community-outreach/string-project/students/checkpoints-for-home-practice-violin-and-viola.html>
- Jin et al. 2024, SPD, *ACM TOG* 43(4): <https://arxiv.org/abs/2405.04963>, <https://github.com/Yitongishere/string_performance>, <https://huggingface.co/datasets/shiyi098/string_performance_dataset-SPD>
- Kao & Su 2020, music-to-body-movement, ACM MM: <https://arxiv.org/abs/2009.08015>, <https://github.com/hsuankai/Temporally-Guided-Music-to-Body-Movement-Generation>
- Konczak, Vander Velden & Jaeger 2009, freezing degrees of freedom, *J Mot Behav*: <https://pubmed.ncbi.nlm.nih.gov/19366657/>
- *A human-computer duet system for music performance* 2020: <https://arxiv.org/abs/2009.07816>
- Lionello & Ramírez 2018, vibrato modelling, SMC: <https://zenodo.org/records/1422607/files/smc_2018_048.pdf>
- Margulies et al. 2023, left-arm compensation vs violin position, *Front Psychol* 13:1017039: <https://pmc.ncbi.nlm.nih.gov/articles/PMC9901209/>
- Mellody & Wakefield 2000, violin vibrato, *JASA*: <https://pubmed.ncbi.nlm.nih.gov/10641668/>
- Nishizawa et al. 2024, SyncViolinist: <https://arxiv.org/abs/2412.08343>, <https://github.com/Kakanat/SyncViolinist>
- Nodame Cantabile: <https://nodamecantabile.fandom.com/wiki/Ryutaro_Mine>, <https://myanimelist.net/character/1187/Ryuutarou_Mine>, <https://rollingstoneindia.com/nodame-cantabile-manga-anime-live-action-series-comparison/>
- Park et al. 2012, neck motion in violin students, *MPPA* 27(4): <https://pubmed.ncbi.nlm.nih.gov/23247874/>
- Rasamimanana, Bernardin, Wanderley & Bevilacqua 2009, bow stroke frequencies: <http://articles.ircam.fr/textes/Rasamimanana09a/index.pdf>
- Roy, Naaim, Hoegy, Verdugo & Duprey 2026, standing vs sitting, *Multidiscip Biomech J* 3: <https://mbj.episciences.org/en/articles/17942/download>
- Schoonderwaldt 2009, *Mechanics and acoustics of violin bowing*, KTH thesis: <https://www.speech.kth.se/publications/pdfs/schoonderwaldt_e.pdf>
- Schoonderwaldt & Altenmüller 2014, fast bowing coordination, *PLoS ONE*: <https://pdfs.semanticscholar.org/9737/882fc7835aec8ff7a157dc5bc0257fcf35a1.pdf>
- Shlizerman et al. 2018, Audio to body dynamics, CVPR: <http://openaccess.thecvf.com/content_cvpr_2018/papers/Shlizerman_Audio_to_Body_CVPR_2018_paper.pdf>, <https://github.com/facebookresearch/Audio2BodyDynamics>
- The Strad, arm/wrist/finger vibrato: <https://www.thestrad.com/featured-stories/developing-arm-wrist-and-finger-vibrato/1859.article>; nine steps to vibrato: <https://www.thestrad.com/playing-hub/nine-steps-to-mastering-violin-vibrato/6748.article>
- Turner-Stokes & Reid 1999, bowing-arm 3D analysis, *Clin Biomech*: <https://pubmed.ncbi.nlm.nih.gov/10521625/>
- Violinist.com, holding the violin: <https://www.violinist.com/violin/how-to-hold-a-violin/>; vibrato types: <http://www.violinist.com/blog/annarougeheifetz/20124/13396/>
- Visentin, Li, Tardif & Shan 2015, shifting, *PeerJ* 3:e1299: <https://pmc.ncbi.nlm.nih.gov/articles/PMC4636401/>
- Volpe et al. 2017, TELMI: <https://telmi.upf.edu/>; skill-level follow-up: <https://www.researchgate.net/publication/345481353>
- Winter, *Biomechanics and Motor Control of Human Movement* (segment ratios after Drillis & Contini)
- Wolf, Möller, Ballenberger, Morisse & Zalpour 2019, upper-body kinematics of violinists, *MPPA* 34(4): <https://pubmed.ncbi.nlm.nih.gov/31800669>
- Yoo et al. 2024, VioPose / VioDat: <https://arxiv.org/abs/2411.13607>
