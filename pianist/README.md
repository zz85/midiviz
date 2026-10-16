# #032 Pianist: wardrobe and hair

Notes on the clothes and hair in `032_pianist.html` (Visuals → Pianist).

## Outfits

`?outfit=` or the Outfit menu sets the dress, fabric, colour, shoes and hair at once:
`reference` (the red knit halter), `yuja-mini` / `yuja-gown` (Yuja Wang-inspired: sequins, stiletto booties, long dark hair), `covered` (long sleeves), `tee`.

## Dresses

- Ours (`dress.js`), now with sleeves: `knee-` or `gown-`, then `fitted` or `cloth`, then optionally `short` or `long`, e.g. `?dress=knee-fitted-long`. Old links using `midi-` still work: "midi" was renamed "below the knee".
- Fabric (`fabric.js`, `?fabric=`): as made, satin, velvet or sequins. Sequins are a tiled normal map of tilted discs on a metallic base, so they glint as she moves.
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
