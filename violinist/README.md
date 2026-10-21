# #037 Violinist

`037_violinist.html`: an anime-style violinist (VRoid CC0 VRM, cel shaded) plays the solo part of a violin MIDI on a dark concert stage. The rest of the MIDI plays as accompaniment through a GM soundfont. The violin itself plays on the GM soundfont too, or (Violin menu, `?violin=waveguide|source|hybrid`) on one of #034's engines, as in #038: the bowed waveguide and the Helmholtz source-filter physical models in real time, or the hybrid sampler; the fingered notes, the bowing and the solo track's CC11 / CC7 / CC2 hairpins (or a recorded performer's dynamics lane for that engine, and its pitch curves) go through `strings/sound/performance.js` into #034's `Lab` on its own audio context with the same hall, started with the clock and put back in step when it drifts more than 60 ms. Levels as #038's (matched to the Creative 8 MB GM violin).

## Pieces

`midis/` has 48 MIDIs from the Mutopia Project (public domain, CC BY / CC BY-SA, credits in `midis/README.md` and `midis/index.json`):
all of Bach's Sonatas and Partitas BWV 1001–1006 (32 movements), six sonatas (Bach BWV 1017, Handel, Mozart K. 379, Beethoven Op. 30/2 and the Kreutzer), six concerto movements (Bach 1042 and 1043, Vivaldi Spring and Winter, Beethoven, Tchaikovsky finale) and four showpieces (Paganini Caprices 1 and 24, Bach/Gounod Ave Maria, Beethoven Romance 2).
All are engraved from scores, so they play in strict time. Many Bach files have no tempo mark (LilyPond's ♩=60); the page rescales them to `suggestedBpm`. The solo track is found by its note count from `index.json`.

## The character

`assets/models/`: three VRoid Project sample males (CC0, see `assets/models/CREDITS.md`), loaded with `@pixiv/three-vrm`. They share one skeleton, so the Outfit menu binds Base_Male's shirt, vest, tie, trousers and shoes onto any of them (`?outfit=`):
- `concert` (default): a black suit jacket over a grey waistcoat; `tails`: a tailcoat (front cut at the waist, two split tails to the knee) over a white waistcoat; `vest`: shirt, charcoal vest and tie; `school`: the samples' navy vest; `casual`: HairSample_Male's white hoodie and dark trousers; `own`: the model's own clothes.
- The jacket and tailcoat (`jacket.js`) are cut from the character's own body skin (torso and arm triangles, sleeves to the wrist, a V opening with satin lapels), pushed out along the normals far enough to clear the shirt and vest beneath, and skinned with the body's weights, so they follow the rig exactly. The shirt and vest under them are trimmed to what still shows (collar and V; for the tailcoat the waistcoat below the cut).
The look (`stage.js`): MToon pushed to two tones with a warm rim, the violin and bow in toon materials with a constant-pixel ink outline, one warm spotlight, a cool back light, a dark hall.

## The rig (`rig.js`)

Drives the VRM's normalised humanoid bones every frame from the #033 models (`strings/fingering.js`, `motion.js`, `hand3d.js`, `violin3d.js`):
- feet planted (left forward), two-bone leg IK; hips sway and dip with the energy of the passage;
- spine lean and breath, a turn that follows the bow; the scroll lifts on the breath before a phrase;
- violin on the chest frame: 40° left of facing, scroll up 4°, rolled 30° (E side down), defaults from Margulies 2023 (`research/01_violinist_biomechanics.md` §2); head turned 26°, tilted 14° onto the chin rest;
- left hand ([research/04_left_hand.md](research/04_left_hand.md)): #033's hand model gives the stops; the character's index knuckle rests where the crease at the base of the index touches the E side of the neck. The hand turns about it to the pose a search picks every frame: a straight wrist, every stop within its finger's reach, the thumb under the neck, the elbow under the violin and the arm clear of its body. The left clavicle comes forward so the short-armed model can bend its elbow. Each finger splays at its base joint and bends as a hinge in its own plane (the end joint 0.72 × the middle one), so it curls over the strings and never bends sideways; the thumb opposes at its base joint;
- bow placed as in #033 (contact near the bridge, tilted to the string); the right hand takes a Franco-Belgian hold (`grip()` in rig.js: palm down over the stick, index, middle and ring draped over the far side, little finger curved on top, thumb bent under the stick at the frog; pronating toward the tip), the arm is two-bone IK with the elbow higher on the lower strings, the clavicle comes forward when the tip is out of reach;
- eyes follow the left hand and the contact point.

## Collision sweep

`node violinist/test/collisions.mjs [song.mid[@model.vrm][@outfit]] …` plays pieces headless (every 0.25 s, up to 240 s each) and checks the bow against the head and torso, the right forearm against the torso, the right elbow against the body's midline, the left elbow against the violin's back and both arms against the violin body, with the sleeve thickness added; exits 1 on a failure. It needs the parent folder served (`BASE`, default `http://127.0.0.1:8000/midiviz/`), playwright-core (`PLAYWRIGHT`) and a Chromium (`CHROME`). Current closest gaps on the four default runs: bow–head 8 cm, bow–torso 12.6, forearm–torso 2.4, elbow–midline 9.7, left elbow–violin 4.3.

## Posture test

`node violinist/test/posture.mjs [song.mid[@model.vrm]] …` (same environment as the collision sweep) plays pieces headless and checks the left hand every 0.25 s: each pressed fingertip on its stop, the base, middle and end joints within a hand's range, no finger leaning out of its plane, the wrist straight, the index at its contact, the little knuckle beside the board, the thumb under the neck, the elbow under the violin. It exits 1 on a failure. Current medians: base joints 50°, middle joints 93°, wrist bend 2–7°; all four default runs pass.

## Research

- `research/01_violinist_biomechanics.md`: stance, sway, violin hold angles, left and right arm mechanics, bow angles per string, motion-capture datasets (MOSA, SPD, SyncViolinist…), a rig recipe.
- `research/02_character_look.md`: Nodame Cantabile's concert look in three.js terms, model options (VRoid vs MakeHuman male with exact targets, community suits and hair), the recommendation.
- `research/04_left_hand.md`: the violinist's left hand. The posture from teaching sources (contact points, thumb, knuckles, wrist, elbow, finger shape) and hand anatomy (joint ranges, DIP–PIP coupling); what the rig got wrong, measured; the recipe and the checks.
- `research/03_pianist_pair.md`: a pianist who matches the violinist: the VRoid sample women (all eight checked, three CC0 candidates plus AvatarSample_A with previews in `assets/models/candidates/`; the VRMs there are git-ignored), the MakeHuman alternative, and Nodame / Chiaki fan models (none usable in the repo).

## #038 Duo (`../038_duo.html`)

The violinist and the #032 pianist (AvatarSample_A in her concert dress, `pianist/alt-model.js`) on one stage, playing the violin part and the piano part of the same MIDI.
- Stage: he stands at the origin facing the hall, turned 0.38 rad toward the piano (`?turn=`), so his bow side faces her. The #030 grand stands to his left and behind him (`pianoSide`: x -185, z -150, turned -1.38 so the open lid faces the hall), with her on its bench driven by the #032 rig (`createRig`, gaze on the music). `stage.js` takes the spotlight target, angle and floor pool as options so one beam covers both.
- `character.js` is the violinist loader, shared with #037: `MODELS`, `OUTFITS`, `loadViolinist(file, {outfit, gain})`, `disposeVRM`, `setOutline`.
- The piano part is every track but the solo one, fingered in a worker by `fingering/fingering.js` (with two tracks the higher one is the right hand), the sustain pedal from CC64; concerto orchestras are folded onto the keyboard with duplicate notes removed. Sound: the violin on the Creative 8 MB GM soundfont, the piano on Full Grand Piano (a second OxiSynth: that font's presets fill programs 0–64, so stacked on the GM font it would take the violin's program 40; it plays 4 dB down to keep the GM balance). Or (Violin sound menu, `?violin=hybrid|waveguide|source`) the violin from one of #034's engines: the fingered violin part and the solo track's CC11 / CC7 / CC2 hairpins go through `strings/sound/performance.js`, and #034's `Lab` plays it on its own audio context (with the same hall reverb), started with the clock and put back in step when it drifts more than 60 ms. The hybrid sampler renders progressively in 1 s blocks; the bowed waveguide and the Helmholtz source-filter run in real time in an AudioWorklet. Levels are matched on the Kreutzer finale. With the hybrid, a seek past what has been rendered is silent on the violin until the render gets there; a speed change re-renders. The Piano–Violin slider in the bottom bar (`?bal=`, dB) turns the other part down by up to 12 dB: CC7 on the soundfont channels, the Lab's gain for the hybrid.
- Casual: his Outfit menu has Casual (HairSample_Male's white hoodie and dark trousers, put on any of the three; donor bones a model lacks ride on their nearest ancestor), her dress menu has Casual (AvatarSample_A's own cardigan and shorts).
- Pieces: the six sonatas, Gounod's Ave Maria, and Bach's E major and double concertos, Vivaldi's Spring and Winter and Beethoven's Rondo with the orchestra on the piano; and Bach's Sonatas and Partitas, which he plays alone.
- Performer (#037 and #038): a piece played as a real violinist did ([performances](performances/README.md), [violinist/performer.js](performer.js)): his recorded timing and dynamics, and on #034's engines (the Violin menu of either page) each note's pitch; the accompaniment or the piano follows his tempo (for a recording with an orchestra, the tempo of every part). The GM violin takes the dynamics as velocities.
- Before the music (Bow, on by default; `?intro=0` off): an 11 s opening from the top of a piece. She stands beside him in front of the piano and they bow to the hall together; then, at the instruments, he raises the violin, looks to her, she looks back, and he nods on the upbeat. `rig.js` takes `rest`, `bend`, `nod` and `look` in its drive (violin and bow lowered in his hands for `rest`); `pianist/rig.js` gains `state.stand`, `bowLean` and `lookAt`.
- She looks up at him (head and eyes, `pianist/rig.js` `state.lookAt`) in his solos (he plays and she strikes nothing for 1.2 s or more), from just before his entries after a rest of 1.5 s or more, and where her part is light while his is busy; about one glance every 20–30 s in the sonatas (`soloGlances` in 038_duo.html).
- Cameras: front, wide, two closer two-shots (duo, duoLow), him, his face, bow, her, her face, keys, over her shoulder, over his. Auto plans the whole piece when it loads: takes of 5–12 s ending on phrase boundaries. Where both parts are near their usual busyness (a duet passage) it takes two-shots; otherwise it prefers whichever part is busier against its own average.
- Liner notes (`liner/`, as #032): intertitles while it plays, the notes panel (I), sections on the seek bar; the Notes menu picks intertitles, every note or none on screen (`?notes=`), and #032's look keys work in the address bar (`itstyle`, `itstylea`, `itcol`, `itpos`, `itheads`, `itseed`). Automatic placement puts each intertitle on the side with more room past the two players. Pieces with notes have ⓘ in the list: Gounod's Ave Maria so far (`liner/pieces/gounod-ave-maria.md`). Times come from the MIDI's bars, scaled by the page's tempo factor. No MP4 export on this page yet.
- Headless: `038_duo.html?shot&view=front&t=20` (sets `__done`, `__info`, `__dbg`).

## Not done yet

No spring-bone tuning; the forearm twist isn't split; the jacket has no buttons or pockets and the tailcoat's tails don't swing; the director is a simple phrase-aware cutter. Headless check: `?shot&view=front&t=6`.
