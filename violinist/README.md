# #037 Violinist

`037_violinist.html`: an anime-style violinist (VRoid CC0 VRM, cel shaded) plays the solo part of a violin MIDI on a dark concert stage. The rest of the MIDI plays as accompaniment through a GM soundfont.

## Pieces

`midis/` has 48 MIDIs from the Mutopia Project (public domain, CC BY / CC BY-SA, credits in `midis/README.md` and `midis/index.json`):
all of Bach's Sonatas and Partitas BWV 1001–1006 (32 movements), six sonatas (Bach BWV 1017, Handel, Mozart K. 379, Beethoven Op. 30/2 and the Kreutzer), six concerto movements (Bach 1042 and 1043, Vivaldi Spring and Winter, Beethoven, Tchaikovsky finale) and four showpieces (Paganini Caprices 1 and 24, Bach/Gounod Ave Maria, Beethoven Romance 2).
All are engraved from scores, so they play in strict time. Many Bach files have no tempo mark (LilyPond's ♩=60); the page rescales them to `suggestedBpm`. The solo track is found by its note count from `index.json`.

## The character

`assets/models/`: three VRoid Project sample males (CC0, see `assets/models/CREDITS.md`), loaded with `@pixiv/three-vrm`. They share one skeleton, so the Outfit menu binds Base_Male's shirt, vest, tie, trousers and shoes onto any of them; "Concert black" turns the navy vest charcoal.
The look (`stage.js`): MToon pushed to two tones with a warm rim, the violin and bow in toon materials with a constant-pixel ink outline, one warm spotlight, a cool back light, a dark hall.

## The rig (`rig.js`)

Drives the VRM's normalised humanoid bones every frame from the #033 models (`strings/fingering.js`, `motion.js`, `hand3d.js`, `violin3d.js`):
- feet planted (left forward), two-bone leg IK; hips sway and dip with the energy of the passage;
- spine lean and breath, a turn that follows the bow; the scroll lifts on the breath before a phrase;
- violin on the chest frame: 40° left of facing, scroll up 4°, rolled 30° (E side down), defaults from Margulies 2023 (`research/01_violinist_biomechanics.md` §2); head turned 26°, tilted 14° onto the chin rest;
- left hand: #033's hand model is solved in the violin frame; the character's hand goes on its knuckle line, the arm is two-bone IK with the elbow under the violin (toward the G string, further in high positions), each finger is solved to #033's fingertip targets with the character's own finger lengths, and the thumb sits under the neck;
- bow placed as in #033 (contact near the bridge, tilted to the string); the right hand takes a Franco-Belgian hold (`grip()` in rig.js: palm down over the stick, index, middle and ring draped over the far side, little finger curved on top, thumb bent under the stick at the frog; pronating toward the tip), the arm is two-bone IK with the elbow higher on the lower strings, the clavicle comes forward when the tip is out of reach;
- eyes follow the left hand and the contact point.

## Research

- `research/01_violinist_biomechanics.md`: stance, sway, violin hold angles, left and right arm mechanics, bow angles per string, motion-capture datasets (MOSA, SPD, SyncViolinist…), a rig recipe.
- `research/02_character_look.md`: Nodame Cantabile's concert look in three.js terms, model options (VRoid vs MakeHuman male with exact targets, community suits and hair), the recommendation.

## Not done yet

No jacket or tailcoat (short shirt sleeves); no spring-bone tuning; the forearm twist isn't split; bow-arm and left-elbow collision checks from the research §6 aren't in; the director is a simple phrase-aware cutter. Headless check: `?shot&view=front&t=6`.
