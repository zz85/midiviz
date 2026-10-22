# #047 Wardrobe

[047_wardrobe.html](../047_wardrobe.html) puts the [#032](../032_pianist.html) pianist in a photo studio so you can try hair, clothes and colour combinations quickly. It uses #032's garments, hair and looks and [#045](../pathtrace/README.md)'s path tracers for stills.

## Using it

- **Rails** (right panel): Outfit (concert outfits first, then #032's), Hair, Dress (or Top, then Bottom: our fitted skirt, trousers or a long skirt), Fabric, Slits, Shoes. Each one has ‹ › to step through the options (it wraps round), and you can click the name to pick from the full list. Only one build runs per rail at a time. If you click faster than a garment builds, the page skips straight to your last choice.
- **Colours**: swatches, plus a picker for any other colour. Both apply as you move, because the colour goes straight onto the materials and nothing is rebuilt. Rails: hair (the eyebrows follow it), dress, bottom (tops only, separate from the top; ▦ means same as the top), qipao trim (▦ means a deep shade of the dress), shoes, skin tone (a tint over the light skin texture) and backdrop.
- **Skin**: European, East Asian or African, MakeHuman's young women's skin textures. Switching is a texture swap, so it is instant. Picking a skin also sets the face to match, and resets the tint to "As textured". The tint swatches darken or lighten whichever skin is on.
- **Face sliders** (under Skin): East Asian face and African face, 0–100 % each, with the remainder European, as MakeHuman's ethnicity mix. The face changes live while you drag. On release, simulated and strand hair is rebuilt, because both hold the old head shape until then.
- **Look**: Realistic, Stylized or Cel shaded (`pianist/look.js`). A colour change in Stylized or Cel goes through `look.recolor()`, which updates the swapped materials in place.
- **Pose**: Arms down (the default, best for seeing the dress), Hands clasped, or At the piano (the #030 grand, built the first time you pick it, with the skirt draped on the bench). Light: Studio, Stage or Daylight.
- **Picture**: Full / Half / Face / Shoes framings, Front / ¾ / Side / Back, ⟳ Spin (turntable), drag to orbit. She looks at the camera when it is in front of her.
- **Shuffle all** picks a random garment set with colours. **Shuffle colours** keeps what she is wearing and recolours it instantly. **Save look** adds a thumbnail to the lookbook strip under the picture; click a thumbnail to put that look back on. The lookbook is kept in localStorage, up to 40 looks.
- **Path trace…** opens #045's still menu (`pathtrace/still.js`): one tracer or all of them, shown split against the page's picture. Traces are always in the realistic look, because toon ramps and ink outlines are raster-only effects. The light presets use only spot lights and the environment, both of which `pathtrace/snapshot.js` carries over.
- Keys: ← → cycle the highlighted rail, ↑ ↓ pick a rail, 1–3 look, R shuffle, C colours, S save, T spin, F full figure.
- The URL keeps the whole state (`?dress=…&bottom=…&skintex=…&fasian=…&fafrican=…&dcol=…&hair=…&hcol=…&fabric=…&slit=…&shoes=…&scol=…&skcol=…&trim=…&skin=…&bg=…&look=…&pose=…&light=…`), and `?outfit=` takes #032's outfit keys.

## Research: what soloists wear

The *Concert* outfits (Outfit rail, first group) follow what women soloists wear on stage. Sources: Caroline Oltmanns, [What to wear on stage](https://www.caroline-oltmanns.com/journal/what-to-wear-on-stage); Leah Broad, [Fashion, fabrics and fishtails](https://www.theguardian.com/music/2022/apr/19/fashion-fabrics-and-fishtails-why-we-need-to-talk-about-what-female-classical-performers-wear) (The Guardian, 2022); [The Cross-Eyed Pianist](https://crosseyedpianist.com/tag/what-pianists-wear/); reviews of Yuja Wang's recitals (Classic FM, USC Annenberg Media 2026).

- **Concert black is the default, and evening concerts mean a floor-length gown.** Jewel tones (wine, emerald, sapphire) and metallics are the usual alternatives. The outfits use the fishtail, column, halter and Grecian gowns in those colours.
- **Shoulders are bare or the dress is sleeveless.** The arms move freely, the audience can watch them, and it is cooler under the stage lights. Almost all the concert outfits leave the arms bare.
- **A jumpsuit or black separates with wide trousers** go from a matinee to an evening concert, and nothing needs matching (Oltmanns). Trousers with long loose hair are also a long-standing soloist look. Outfits: halter jumpsuit; camisole with palazzo trousers and long grey hair; bodice top with a long full skirt.
- **Some soloists wear short, fitted dresses** with sequins or a slit, and high heels. Outfits: the one-shoulder sequin mini and the strapless gold cocktail dress.
- **Fishtail silhouettes**, like Samantha Ege's at the Barbican in 2021. Outfits: black and champagne fishtail gowns.
- **Shoes:** closed toes that won't catch on the pedals, non-slip soles, and heels low enough for the knees to fit under the keyboard (Oltmanns). Some pianists play barefoot. Hence the ballet flats, Mary Janes and T-bars, and the ivory Grecian gown is worn barefoot.
- **Fabrics:** light and wrinkle-free. Sequins are heavy to travel with but are still common. Satin and jersey are the default here; velvet goes with the wine gown.

## New assets (October 2026)

The MakeHuman community repository's catalogue and asset pages went offline when its community services shut down, so `fetch-community.mjs` no longer works. The [asset packs](https://static.makehumancommunity.org/assets/assetpacks.html) are still hosted. [pianist/build/import-packs.mjs](../pianist/build/import-packs.mjs) imports chosen assets from the pack zips into the layout `build-character.mjs` reads. Each pack's `packs/<pack>.json` records the asset's old page, so an asset keeps its old key `c<nid>`. Only CC0 and CC-BY assets are imported. Credits are in [pianist/assets/community/CREDITS.md](../pianist/assets/community/CREDITS.md); the node URLs listed there no longer resolve but still identify each asset.

27 assets were added, chosen from contact sheets of the packs' thumbnails:

- Gowns and dresses (dress01, dress02): fishtail halter gown, five Grecian gowns, column halter gown, a halter gown with a full skirt, a camisole dress, a high-neck sleeveless gown, a strapless ruffle dress, a one-shoulder frilled mini.
- Halter jumpsuit (suits03).
- Bottoms (pants01, pants02, skirts01): palazzo, slim and wool trousers, and a long full skirt. They are a new kind, `bottom`, built by `build-character.mjs` from the Pants and Skirt categories, and are worn under a top through the Bottom rail. #032 and #045 leave them out of their menus because they have no way to pair a bottom with a top.
- Tops (shirts01): camisole and bodice tops.
- Shoes (shoes01, shoes02): ballet flats, Mary Janes, T-bar shoes.
- Hair (hair01–03): long with a fringe, long and swept back, long curls, wavy bob, curled-under bob, sleek long bob.

`character.bin` is unchanged. The new parts add 38 MB to `pianist/assets/community/` in total, but each one is fetched only when it is worn.

To rebuild:

```sh
# packs into ~/test/mh-assets/packs (dress01_cc0.zip, dress02_cc-by.zip, … from the asset-pack pages)
node pianist/build/import-packs.mjs ~/test/mh-assets/packs/*.zip --list           # every asset, its node id and licence
node pianist/build/import-packs.mjs ~/test/mh-assets/packs/*.zip --pick toigo_halter_dress_with_fluted_skirt,elvs_goddess_dress1,…
node pianist/build/build-character.mjs
```

## How

- The rails list our dresses and hair (`pianist/dress.js`, `hair.js`, `hair-mesh.js`, `shoes.js`) and every MakeHuman community asset in the build ([catalog.js](catalog.js), names and outfits as #032 / #045).
- Standing is the rig's bow pose (`rig.state.stand`, from #038). `rig.state.standArms` adds `'sides'` (arms hanging) and `'clasp'` (hands together, clear of the skirt). The dress is given a proxy bench that is out of reach while she stands, so the cloth skirt hangs free and drapes over the real bench when she sits.
- Changing an outfit or a lookbook look rebuilds only the pieces that changed and repaints the rest.
- After each change the files for the next and previous items on each rail are fetched during idle time, so the next click mostly hits the browser cache.
- Shared module changes, all additive: `look.recolor()`, `dress.setTrim()`, the two arm poses in `rig.js`, and `still.js` re-bakes the tracers' environment map when the environment intensity changes.

## Fabrics

There are 14 fabrics, defined in [pianist/fabric.js](../pianist/fabric.js) and shared with #032 and #045. Each one is a set of physical-material values. Where the surface texture shows, it also gets a procedural tile generated in the page (no texture files), repeated in the garment's own UVs:

| Fabric | How it is made |
| --- | --- |
| Plain, Knit | the garment's own material; knit is the diamond knit (our dresses only) |
| Satin | low roughness, bright sheen |
| Silk charmeuse | glossier than satin, with the highlight stretched along the threads (anisotropy) |
| Chiffon | soft and matte, a sheen haze over a fine gauze. It is not see-through: the body under a garment is hidden, so real transparency would show holes |
| Crepe | a pebbly grain (value noise), almost no shine |
| Shot taffeta | fine ribs, and a change of colour with the viewing angle (iridescence) |
| Velvet | rough, with a strong sheen at grazing angles |
| Damask | tone on tone: glossy rosette medallions on a matte ground (a roughness map), lightly raised |
| Lamé | metallic threads in a plain weave |
| Sequins | tilted discs on a metallic base |
| Glitter | tiny metallic facets, each tilted its own way, finer than sequins |
| Beaded | a grid of domed glass beads, clear-coated |
| Leather | a pebbled grain (Voronoi), satin clear coat |

Several of the concert outfits now use them: chiffon on the Grecian gowns, silk on the sapphire column gown, crepe on the red high-neck gown, taffeta on the emerald skirt, lamé on the gold cocktail dress, glitter on the one-shoulder mini, beading on the champagne fishtail. Two outfits are new: an ivory damask halter gown and a black leather jumpsuit. Switching fabric takes ≤ 18 ms, or about 1 ms once that fabric's tile has been made. The path tracers take the normal and roughness maps as they are.

## Skins and face shapes

- The textures are from the CC0 system assets the character is built from: `young_asian_female` and `young_african_female`, written by `build-character.mjs` as `skin_asian.jpg` and `skin_african.jpg` (about 0.25 MB each). `ch.setSkin(key)` in `pianist/character.js` loads them on demand.
- The face shapes come from MakeHuman's `asian-female-young` and `african-female-young` macro targets, downloaded from the MakeHuman repository into `mh-assets/base/`. Our build uses caucasian at 1.0, so each morph is (that target − caucasian).
- **Only the head changes.** Each vertex takes the morph in proportion to its skin weight on the head and the bones under it (jaw, eyes, face). That share fades out through the neck, so the body, and every garment fitted to it, stays as it is (the largest garment change is 0.03 cm).
- **The head is not moved or resized.** The macro targets also move and scale the whole head with the body's height (East Asian: 10 cm lower and 5 % smaller). That is taken out, leaving only the face's shape: up to 1.6 cm (East Asian) and 2.3 cm (African).
- **Everything fitted to the head follows.** Every part fitted to the body (eyes, brows, lashes, all hair, community assets) is refitted on the morphed body and stored as a sparse delta, so hair follows the new skull. The data adds about 0.7 MB to `character.bin`; community parts carry theirs in their own files.
- `ch.setFace({ asian, african })` blends the deltas on the CPU and recomputes normals. Because it writes the geometry itself, the path tracers trace the morphed face too. `rig.measureEyes()` re-reads where the eyeballs are, so they still turn about their own centres.
- #032 and #045 load the same data but never call `setFace`, so their pianist is unchanged.

## Tests

`node wardrobe/test/smoke.mjs [out dir]` loads the page headless on SwiftShader and steps through every rail, look, pose, light and framing, saving pictures along the way. Any page error or failed request fails the run. `FULL=1` goes through every dress and hair; `OUTFITS=1` takes a front and a ¾ picture of every outfit; every run also switches through the three skins and sets a 60 % East Asian face; `PT=1` adds a small three-gpu-pathtracer WebGL still. It needs the parent folder served at `http://127.0.0.1:8000/midiviz/` (or `BASE`), plus `PLAYWRIGHT` and `CHROME` as for `pathtrace/test/stills.mjs`.

Timings on SwiftShader (no GPU), per click until the new piece is on: community dresses and tops 0.5–0.7 s, hair 0.2–0.3 s, shoes 0.1–0.4 s, a whole outfit 0.2–0.7 s (the two with #032's simulated gowns about 4.5 s), fabric and colours ≤ 16 ms.
