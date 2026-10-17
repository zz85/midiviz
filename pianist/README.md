# #032 Pianist

Notes on the character, clothes and hair in `032_pianist.html` (Visuals → Pianist).

## The character

She is built from [MakeHuman](http://www.makehumancommunity.org/)'s CC0 assets by `build/build-character.mjs`. No ready-made character file is used.

- Body: MakeHuman's hm08 base mesh (~13k vertices), blended with three body-shape files ("targets") the way MakeHuman's sliders would mix them: `caucasian-female-young` 1.0, `universal-female-young-averagemuscle-minweight` 0.4, `female-young-averagemuscle-minweight-idealproportions` 0.7. The result is scaled to 165 cm.
- Skeleton: MakeHuman's default 163-bone rig (full fingers and toes, jaw, tongue, face) with its own skin weights, top 4 per vertex. `rig.js` poses it every frame; `hand-driver.js` drives the fingers and arms from the #029 fingering and motion model.
- From the system asset pack: the young light-skinned female skin, high-poly eyes, eyebrow001, eyelashes01 and five hair meshes (bob01, bob02, ponytail01, braid01, long01). They are fitted the way MakeHuman fits them: each vertex is a barycentric point on three body vertices plus an offset, and inherits their weights.
- Helper shells: MakeHuman's base mesh has hidden fitting shells for the scalp, tights and skirt. They are kept as the hair roots and the base of our dress.
- The strand hair (`hair.js`), our dress, the shoes, the looks (realistic, stylized, cel) and all the materials are written in this repo.

Output: `assets/character.json` (bones, joints, part layout) + `assets/character.bin` (~2 MB) and re-encoded textures. Units are cm, y up, the figure facing +z with her feet on y = 0. Licence: MakeHuman, CC0 1.0. Community assets have their own licences, listed in `assets/community/CREDITS.md`.

## Rebuilding the character

The MakeHuman sources are not in the repo (the system pack alone is ~280 MB). Put them in one folder, `~/test/mh-assets` by default:

```
mh-assets/
  base/     base.obj, default.mhskel, default_weights.mhw and the three .target files
  sys/      makehuman_system_assets_cc0.zip, unpacked
  community/<nid>/   optional, see Community assets below
```

Where to get them (all CC0):

- `base/`, from the [MakeHuman 1.x repository](https://github.com/makehumancommunity/makehuman) (`makehuman/data/…`):
  - [3dobjs/base.obj](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj)
  - [rigs/default.mhskel](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/rigs/default.mhskel), [rigs/default_weights.mhw](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/rigs/default_weights.mhw)
  - [targets/macrodetails/caucasian-female-young.target](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/macrodetails/caucasian-female-young.target), [targets/macrodetails/universal-female-young-averagemuscle-minweight.target](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/macrodetails/universal-female-young-averagemuscle-minweight.target), [targets/macrodetails/proportions/female-young-averagemuscle-minweight-idealproportions.target](https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/macrodetails/proportions/female-young-averagemuscle-minweight-idealproportions.target)
- `sys/`: [makehuman_system_assets_cc0.zip](http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip), unzipped so that `sys/skins`, `sys/eyes`, `sys/hair`… exist.

Then run:

```sh
node pianist/build/build-character.mjs [path/to/mh-assets]   # needs ffmpeg on PATH for the textures
```

To change her build, edit `TARGETS` and `HEIGHT` at the top of the script. Any other MakeHuman macro target works the same way.

## Other models (`?model=`)

Visuals → Model, or `?model=vrm` / `?model=quaternius`. `alt-model.js` loads any rigged glTF or VRM humanoid. It builds a proxy skeleton with MakeHuman's bone names on the model's own joints (scaled so legs and arms match the MakeHuman woman, turned to face the keys). `rig.js` poses the proxy unchanged, and every frame each model bone takes its proxy bone's world rotation times a fixed rest offset. VRM bones come from the VRM humanoid; plain glTF bones are matched by name (Mixamo, Blender `.L/.R`, Quaternius, UE styles). These models keep their own clothes and hair, so the wardrobe menus are hidden.

- `vrm`: `assets/models/vrm1-constraint-twist-sample.vrm`, pixiv's VRM 1.0 sample from the [three-vrm repo](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models), VRM Public License 1.0 (redistribution and modification allowed). Loaded with `@pixiv/three-vrm` 3.5.5 from jsDelivr. Its spring-bone hair, twist constraints and blink expression run after the rig. MToon colours are scaled down (`MTOON_GAIN`) so it doesn't burn out under the stage lights, and spring gravity is scaled with the model.
- `quaternius`: `assets/models/quaternius-formal.gltf`, `Formal.gltf` from Quaternius' [Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html) (CC0; Google Drive → Individual Characters → glTF). Its nodes hold an animation pose, so the loader resets glTF models to their bind pose first, and its feet are IK bones under the root, so bones whose parent is not driven are placed as well as turned.

# Wardrobe and hair

## Outfits

`?outfit=` or the Outfit menu sets the dress, fabric, colour, shoes and hair at once. The circled numbers along the top of the page pick eight featured ones in one click (hover for a preview and the name; the rest stay in the menu). The previews are side-view renders (`?shot&view=side&outfit=<key>` at 900×900, cropped to the pianist) saved as `assets/presets/<key>.webp`; a preset without one just shows its name as a tooltip, and so do the keys 1–9 and 0 (the first ten):
`reference` (the red knit halter), `sequin-mini` / `sequin-gown` (sequins, stiletto booties, long dark hair; old `yuja-*` links still load), `covered` (long sleeves), `tee` (T-shirt and skirt, long dark hair).

- Long hair (mesh hair simulated as cloth) with our simulated floor-length skirt and slits from the knee: `braid-halter` (champagne satin halter, braid), `ponytail-qipao` (red satin qipao with gold trim, black ponytail), `braid-qipao` (fitted floor-length ivory qipao with navy trim, brunette braid).
- Bobs: `shift-long` (blush shift dress, long hair; was `bob-shift`), `bob-bodycon` (gold sequin bodycon, brunette bob), `bob-cocktail` (black satin cocktail dress, auburn fifties updo), `bob-tee` (white T-shirt and skirt, platinum bob), `bob-turtleneck` (black sleeveless turtleneck, ash-grey bob).
- Evening gowns: `long-gown` (red velvet evening gown, blonde fifties updo; old `bob-gown` links load it), `updo-gown` (hot magenta satin gown with long sleeves, blonde ponytail).
- An outfit can also set the gown slits and the qipao's trim colour.

## Dresses

- Ours (`dress.js`), now with sleeves: `knee-` or `gown-`, then `fitted` or `cloth`, then optionally `short` or `long`, e.g. `?dress=knee-fitted-long`. A `qipao` neck in place of the sleeves (`?dress=gown-cloth-qipao`) gives a stand collar, cut-in sleeveless armholes, a slimmer skirt, and contrast piping round the collar and armholes and along the diagonal front opening, with three knot buttons. Old links using `midi-` still work: "midi" was renamed "below the knee".
- Our dress is plain jersey by default (no pattern, a faint fine weave); the diamond knit is Fabric → Knit. The gown hugs the waist a little tighter and has side slits down to the hem; Slits (`?slit=off|ankle|calf|knee|thigh|hip`, default mid-calf) sets where they start.
- Fabric (`fabric.js`, `?fabric=`): plain, knit, satin, velvet or sequins. Sequins are a tiled normal map of tilted discs on a metallic base, so they glint as she moves.
- Community dresses, grouped in the menu: covered shoulders, short and fitted (cocktail), sleeveless/halter, and tops or T-shirts worn over our skirt.
- Modesty: a new dress is built while the old one stays on, and only then swapped in. The body stays hidden while nothing covers it (the first load, a failed load, or the Dress box unticked).

## Shoes

`?shoes=` takes `flats` (ours), `none` (barefoot), `c1694` (stiletto booties), `c1822` (pumps) or `c1039` (peep-toe pumps). The community pumps are fitted to a flat foot, so they read as flats until the rig arches the foot.

## Hair as cloth

`hair-cloth.js` simulates any mesh hairstyle (MakeHuman's own and the community's) as one piece of fabric rather than as strands:
- The hair is clustered into ~2 cm guides, joined along the mesh and to neighbouring cells so the cards move as a single sheet.
- Guides near the scalp are pinned. The others are pulled back toward the groom less and less with length.
- The hair collides with the skin of the head, neck, shoulders and back.
- The guides' offsets go to the GPU and are added after skinning, in both the colour and shadow passes.

It costs ~7 ms a frame in headless Chrome (software rendering) for the long styles. It is on with "Hair simulation"; `?hairsim=0` turns it off.

## Community assets

```sh
node pianist/build/fetch-community.mjs /path/to/assets.json <nid>…   # → ~/test/mh-assets/community/<nid>/
node pianist/build/build-character.mjs
```

`assets.json` is the MakeHuman community catalogue. Only CC0 and CC-BY assets are fetched, and credits are written to `assets/community/CREDITS.md`.

Each asset gets its own `assets/community/<key>.bin` plus WebP / JPEG textures, fetched only when chosen. `character.bin` stays ~2 MB.

## Render, hall and post-processing (from #030)

- Render → MP4 export (720p–4K, 30/60 fps) through `notation3d/video-export.js`: offline, frame by frame, with the audio synthesised offline and run through the same hall. Camera: Director (auto) or as on screen; optional title card. The picture is a function of song time, so the film matches what plays live.
- Hall (`concertstage/acoustics.js`): volume (to 200 %, limited), room (dry … cathedral), seat, reverb, decay, tone, room boost (±12 dB of reverb / ambience / applause against the piano), hall ambience, applause at the end of a song.
- Visuals → Post-processing: depth of field and its blur, bloom and its strength, film grain and vignette, dust in the spotlight. All of these are in shared links.

## Defaults (light, for phones)

A plain link opens behind her (`?view=back`) in preset 1 with the cel-shaded look, the Full Grand Piano soundfont, no room reverb and no applause (Hall → Room), and no depth of field, bloom, grain or dust (Visuals → Post-processing). Phones and tablets (a coarse pointer) take the `?q=low` path unless `?q=high`: pixel ratio 1, smaller shadows, no MSAA or fallboard mirror, and with nothing to post-process the scene is drawn straight to the screen. On a screen taller than 16:10 the lens widens so the shots keep their width, and the pills go icon-only. Double-tap (or double-click) the picture for the next camera in the menu.

## Phones and the app

- Touch screens (`?touch=1` / `0` to force) get their own layout: Songs on the left; Camera, Outfit and More (Visuals, Hall, Render, Share) on the right; every menu opens as a bottom sheet, outfits as thumbnails. A tap brings the controls back while a song plays.
- Songs: ⏮ ⏭ beside Play, or swipe left / right along the bottom bar (the song title), step through the current group of the list, wrapping round. Double-tap the picture still changes the camera.
- Phones load `soundfonts/Full Grand Piano.sf3`, the same piano with Vorbis samples (3.1 MB instead of 17; quality 8, 30–37 dB SNR per sample), unpacked in the browser.
- `sw.js` (scope: the midiviz folder) caches assets cache-first (soundfonts, models, textures, MIDI, WASM, three.js from the CDN; a cached file is re-checked by size once per worker lifetime) and code network-first, so a second visit downloads nothing and the page runs offline. `?sw=0` skips it; bump `ASSETS` in `sw.js` to drop the asset cache.
- Save for offline (Songs menu, or ⋯ on phones): every list song, the preset thumbnails and the current sound go into the asset cache (outfits aren't fetched up front; the ones you've shown are cached as they load), and the browser is asked to keep the storage.
- `032_pianist.webmanifest` and `pianist/icon-*.png`: Add to Home Screen opens it full screen with its own icon.

## Camera and the director

`director.js` frames shots on a live subject (hands, head, figure, piano, feet) in spherical coordinates and gives each one a slow move: orbit, zoom in/out, push in, pull out, crane, or a still frame with a handheld breath. Shots end in a cut or a glide into the next spot (glides only between spots on the same side and of similar size, so the camera never flies through the piano).

- Camera → Director (auto), `?view=auto`: plans the whole song from the score (`rig.music`, `rig.form()`). Cuts land on phrase starts; takes are long in quiet passages and short in intense ones; it stays on the hands when they are busy and goes to her face when she looks up; opens behind her, fading in from black, and pulls out wide at the end (From the audience is a rarer shot, Behind a favourite). No repeated spot, no jump cuts (< 30° and no change of size), sizes alternate. Deterministic in song time and seeded by the song (its length and phrasing), so each song gets its own film and the same one every time; without a song it runs on its own clock. Dragging takes the camera; it comes back 8 s later.
- Its shots include Top down, always a slow orbit about the vertical (about 30°). After the opening it favours the fingers over her face (and in Director's cut too, where the view allows fingers).
- It remembers what it has shown: from ~25 s without a wide shot it leans toward one (and past ~45 s it must), and the same for her face from the front after ~35 s / ~55 s, so a long run of close-ups or shots from behind ends in a wide shot or her face (times ÷ pace).
- Variety: a spot shown in the last ~60 s is ×0.3 as likely, and each use makes it a little less likely again; Top down and Pedals are rare treats. Face close-ups mostly zoom out or pull out (orbit and still frames are rare there). Hand spots: over the shoulder, from above, bass side, treble side, along the keys from the treble or the bass end.
- Screen-time balance: a running tally (last ~2 min weighing most) of fingers and keys / her / the piano (targets 50 / 38 / 12 %, Favour shifts them), from behind / in front (50 / 50; the side and top down count half each), close / medium / wide (40 / 35 / 25 %); each candidate is scored by how much of what's missing it would show.
- Favourites: Across the piano ×4.5 and fresh again after 25 s (≈10 % of screen time), Low from her right ×5 (≈6 %), High over the keyboard ×2.5 (≈7 %); Over the shoulder ×0.75.
- Camera menu: every director spot is a view, grouped Far / Medium / Close and tagged by what's in the frame (piano, her, hands, feet, inside). Close-ups of the mechanism: The hammers (inside the case over the strike line, following the hands), Pedals, close (her foot on the sustain), Keys, from above. Director → Shots: Far / Medium / Close limits which sizes the director uses (`?dfar=0`, `?dmed=0`, `?dclose=0`).
- Director options: Pace (`?pace=0.6|1|1.6`), Favour hands / pianist (`?favour=-0.8..0.8`), Transitions (`?trans=mix|cuts|glides`), Show shot names (`?shotnames`).
- New views looking back at her from in front of the piano: From the audience (through the open lid, `?view=audience`) and Across the piano (over the plate from beyond the tail, `?view=tail`).
- Top down (`?view=top`) and Player's view (`?view=player`: from just in front of her eyes down to the keys, riding with her head, smoothed).
- Move (on a view), `?move=orbit|zoomIn|zoomOut|dollyIn|dollyOut|dollyZoom|crane|random|cut`: a fixed view drifts there and back; Random draws a new move every 7–16 s; Director's cut (the default) keeps the view's angle but weaves far and close framings take by take (the whole scene, the piano, her fingers, her face, or her figure from behind, and the view's own), never two of the same size running, every subject in turn; a change of size is a cut. Its moves are mostly slow orbits, sometimes a zoom, a crane rarely. Fingers are shot from beside her (her shoulder hides them from behind), the face only from the front half.
- Unless Follow her movement is on, every shot (director and Director's cut) frames its subjects where they were when it began, the hands included, and holds still while she moves.
- Tests: `bun test pianist/test` (the film covers the song and repeats per song, the wide-shot / face memory, favourites, camera outside the piano and holding still, Director's cut take rules; three.js is stood in by `pianist/test/three-shim.mjs`).
- Headless: `?shot&view=auto&t=…` renders the director's frame at `t` (`window.__shotInfo` names the shot).

## Sharing a scene

Every option is in the address bar as a short query key, written only when it differs from the default (or from the chosen outfit), so reloading or copying the address brings the same scene back. **Share** copies the link with the song position (`&at=`); a shared song starts there on the first click (browsers need a click before sound).

| Key | Control | Key | Control |
|---|---|---|---|
| `outfit` | Outfit | `gaze` `expr` `hips` `posture` `reach` `rock` `sway` `nod` `glances` | Pose and playing style |
| `dress` `slit` `fabric` `dcol` | Dress, gown slits, fabric, colour (hex without `#`) | `bench` `benchh` | Bench distance / height |
| `shoes` | Shoes | `light` `exposure` `dof` | Visuals |
| `hair` `hcol` `density` | Hair style, colour, strands | `view` `cam` | Camera view; a dragged camera as `x,y,z,tx,ty,tz` |
| `hairon` `hairsim` `dresson` `clothsim` | Checkboxes (`1` / `0`) | `move` `pace` `favour` `trans` `shotnames` | Moves and the director |
| `look` `smooth` | Look, subdivision | `song` `at` `speed` `loop` `sf` `avsync` | Song, position, transport, sound |
