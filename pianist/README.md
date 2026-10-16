# #032 Pianist: wardrobe and hair

Notes on the clothes and hair in `032_pianist.html` (Visuals → Pianist).

## Outfits

`?outfit=` or the Outfit menu sets the dress, fabric, colour, shoes and hair at once:
`reference` (the red knit halter), `yuja-mini` / `yuja-gown` (Yuja Wang-inspired: sequins, stiletto booties, long dark hair), `covered` (long sleeves), `tee`.

## Dresses

- Ours (`dress.js`), now with sleeves: `knee-` or `gown-`, then `fitted` or `cloth`, then optionally `short` or `long`, e.g. `?dress=knee-fitted-long`. Old links using `midi-` still work: "midi" was renamed "below the knee".
- Our dress is plain jersey by default (no pattern, a faint fine weave); the diamond knit is Fabric → Knit. The gown hugs the waist a little tighter and has side slits from the knee to the hem (`?slits=0` to close them).
- Fabric (`fabric.js`, `?fabric=`): plain, knit, satin, velvet or sequins. Sequins are a tiled normal map of tilted discs on a metallic base, so they glint as she moves.
- Community dresses, grouped in the menu: covered shoulders, Yuja Wang-inspired, sleeveless/halter, and tops or T-shirts worn over our skirt.
- Modesty: a new dress is built while the old one stays on, and only then swapped in. The body stays hidden while nothing covers it (the first load, a failed load, or the Dress box unticked).

## Shoes

`?shoes=` takes `flats` (ours), `c1694` (stiletto booties), `c1822` (pumps) or `c1039` (peep-toe pumps). The community pumps are fitted to a flat foot, so they read as flats until the rig arches the foot.

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

## Camera and the director

`director.js` frames shots on a live subject (hands, head, figure, piano, feet) in spherical coordinates and gives each one a slow move: orbit, zoom in/out, push in, pull out, crane, or a still frame with a handheld breath. Shots end in a cut or a glide into the next spot (glides only between spots on the same side and of similar size, so the camera never flies through the piano).

- Camera → Director (auto), `?view=auto`: plans the whole song from the score (`rig.music`, `rig.form()`). Cuts land on phrase starts; takes are long in quiet passages and short in intense ones; it stays on the hands when they are busy and goes to her face when she looks up; opens on a wide shot from the hall and pulls out at the end. No repeated spot, no jump cuts (< 30° and no change of size), sizes alternate. Deterministic in song time; without a song it runs on its own clock. Dragging takes the camera; it comes back 8 s later.
- Director options: Pace (`?pace=0.6|1|1.6`), Favour hands / pianist (`?favour=-0.8..0.8`), Transitions (`?trans=mix|cuts|glides`), Show shot names (`?shotnames`).
- New views looking back at her from in front of the piano: From the audience (through the open lid, `?view=audience`) and Across the piano (over the plate from beyond the tail, `?view=tail`).
- Move (on a view), `?move=orbit|zoomIn|zoomOut|dollyIn|dollyOut|crane`: any fixed view drifts there and back.
- Headless: `?shot&view=auto&t=…` renders the director's frame at `t` (`window.__shotInfo` names the shot).
