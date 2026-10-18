# #037 Violinist: character and anime look

Research brief for a young male violinist on a concert stage, drawn in the manner of the *Nodame Cantabile* anime's performance scenes (Chiaki Shinichi, Mine Ryutaro), with cel shading. Covers the visual style and how to get it in three.js (§1), the model routes (§2), MakeHuman community assets (§3) and a recommendation (§4).

Sibling code this builds on: `pianist/build/build-character.mjs` (MakeHuman → `character.json/.bin`), `pianist/look.js` (`cel` look: `MeshToonMaterial` with a 3-step ramp `[105, 185, 255]`, nearest-filtered, plus an inverted hull pushed out 0.12–0.14 cm along the skinned normal, colour `#0c0806`), `pianist/alt-model.js` (any VRM / rigged glTF on the MakeHuman rig; it turns a model that faces the wrong way, so VRM 0.x needs no special case).

---

## 1. The look

### 1.1 What the show looks like

*Nodame Cantabile* (TV, J.C.Staff for Fuji TV's noitamina slot): season 1 in 2007 (24 episodes, directed by Ken'ichi Kasai), *Paris Chapter* in 2008 and *Finale* in 2010 (directed by Chiaki Kon), after Tomoko Ninomiya's manga. aniSearch credits Hidekazu Shimamura with the season 1 character design ([aniSearch](https://www.anisearch.com/anime/3783), [Wikipedia](https://en.wikipedia.org/wiki/Nodame_Cantabile)). The notes below come from the key art and screenshots as I remember them, not from measured frames. Check them against a few captured frames before tuning numbers.

- **Line:** thin, even, dark brown to near black, about 1–2 px at 1080p in a mid shot; slightly heavier on the silhouette. Few interior lines: jaw, ear, collar, lapels, elbow and knee folds. The nose is one short stroke and the mouth one line.
- **Shading:** flat two-tone cel with a hard edge. A third, darker tone appears only in deep folds and under the chin and collar. Shadows are designed shapes (under the fringe, a block on the neck, one side of the nose bridge). The cheeks and lips are never shaded.
- **Skin:** pale warm peach (about `#f6dccd`) with a pink-mauve shadow (`#d9a9a0`), not a grey one. Both shift toward orange under stage light.
- **Hair:** solid masses split into pointed locks, one shadow tone, and an "angel ring" highlight band of zig-zag strokes across the crown, tinted blue-grey on black hair and pale yellow on blond. Chiaki: blue-black (`#1c1d26`), short, fringe swept to one side over the brow, neat nape. Mine: bleached blond / light brown, spiky and untidy, a rocker look.
- **Eyes:** larger than real but not *moe*-large. A tall oval iris with a dark top (pupil and lash shadow), a lighter bottom, one or two flat white highlight dots, and a thick upper lash line. Chiaki's eyes are narrow and sharp. Brows are thin and close to the eye.
- **Clothes:** Chiaki conducts in a black tailcoat or black suit with a white shirt (wing collar and bow tie in concert, a plain collar in rehearsal). Mine wears a black suit and white shirt in the orchestra and rocker clothes off stage. Black cloth is drawn charcoal (`#2a2a30`, shadow `#141418`) with a cool rim along the shoulders. The white shirt is `#f4f2ee` with a lilac-grey shadow (`#c9c4d6`).
- **Concert scenes:** a dark hall, warm top and front spots, soft bloom, a dim audience. Instruments are often 3D CG. The Paris Chapter's piano hands are CG fingering from Kwansei Gakuin University's Miwa and Nagata labs ([press release](https://ist.ksc.kwansei.ac.jp/~nagata/nagata_lab_folder/nagata_lab/Press_release/nodame.pdf)). Viewers criticise the performances as panned still frames with stiff CG hands ([MAL review](https://myanimelist.net/reviews.php?id=8554), [another](https://myanimelist.net/reviews.php?id=159467)). A fully animated cel player beats that, so take only the framing: one player, a dark background, a warm key and a slow push-in.
- **Grade:** soft mid-tone contrast, warm highlights, violet shadows, blacks lifted to dark navy (`#0d0f1a`), glow around the spots and the white shirts.

### 1.2 three.js techniques

**Toon ramp.** #032's ramp `[105, 185, 255]` reads as a 3-step toon of greys. Use two tones with a narrow edge and colour the shadow per material: in `onBeforeCompile` (or a small `ShaderMaterial`), `mix(shadeColor, litColor, smoothstep(e - w, e + w, NdotL * shadow))` with `e ≈ 0.1`, `w ≈ 0.02` (the edge sits just past the terminator, so faces stay mostly lit; the 1–2 % band stops the edge crawling). Shade colours: skin `#d9a9a0`, shirt `#c9c4d6`, black cloth `#141418`, black hair `#0b0b12`. This is MToon's model (`shadeColor`, `shadingShift`, `shadingToony`; [MToon 1.0 spec](https://github.com/vrm-c/vrm-specification/tree/master/specification/VRMC_materials_mtoon-1.0), [three-vrm MToonMaterial](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm-materials-mtoon)). The VRoid files ship skin `shadeColor (0.97, 0.81, 0.86)`, `shadeShift` -0.9 on the face and -0.6 on the body, and `shadeToony 0` (soft). For this look set `shadingToony` to about 0.95. Stage-light cast shadows go through the same step; keep them off the face.

**Outlines.** #032's inverted hull is pushed in world space (0.12–0.14 cm), so it thins with distance and vanishes in wide shots. Push in clip space for a constant pixel width, `pos.xy += normalize(nClip.xy) * px * 2.0 / resolution * pos.w`, clamped toward world width in extreme close-ups. MToon has both modes. The VRoid files use world mode at 0.075 (≈ 0.75 mm) on skin and cloth and screen mode at 0.17 on hair. Start at 1.6 px for the silhouette, 1.3 px for hair, 1.0 px for the face and hands at 1080p, scaled by drawing-buffer height / 1080. Bake smoothed normals (averaged over coincident vertices) into an `outlineNormal` attribute, or UV seams crack the hull; three.js's [OutlineEffect](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/effects/OutlineEffect.js) uses raw normals and shows this. Line colour: material colour × 0.35 shifted brown (`#3a2320` on skin, `#101018` on black cloth; VRoid uses `(0.27, 0.09, 0.13)`). For interior lines (collar, lapels, fingers on the violin) add a 1 px Sobel pass on depth and normals at 50 %, kept off the face.

**Rim light.** `step(0.6, pow(1 - N·V, 4) * max(0, N·Lrim))`, warm white `#ffe8c8`, 0.6 on cloth and hair and 0.3 on skin, for the bright edge along the shoulders and the violin (MToon: `rimColor`, `rimFresnelPower`, `rimLift`).

**Hair angel ring.** Either Kajiya–Kay anisotropic specular along the strand tangent (`pow(sqrt(1 - dot(T, H)^2), 80)`, shifted by noise, then stepped; on MakeHuman cards the tangent is the UV v-direction), or the painted trick: a band at a head-space height that slides with the view angle, broken by a zig-zag mask in the hair UV and kept to the lit side. The second is steadier and reads as drawn. Colours: `#5d6478` on black hair, `#fff3c4` on blond.

**Face shadow.** Real nose, lip and socket relief casts cel shadows a drawing never has. Two remedies:
- *Spherized normals:* blend the face normals toward a sphere around the head, `n = normalize(mix(n, normalize(p - headCentre), 0.8 * mask))`, mask 1 on the cheeks and forehead and 0 at the ears. It can run in the shader with no asset work ([note.com explainer](https://note.com/asanekonyannyan/n/ndd357dce07b1?hl=en)), which suits MakeHuman. The classic reference for hand-edited normals is Arc System Works' Guilty Gear Xrd talk ([GDC Vault](https://www.gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)).
- *SDF face shadow map* (Genshin style): a greyscale map in face UV, thresholded by the light's yaw: `fl = dot(headFwdXZ, lightXZ)`, flip u when the light is on the other side, `lit = step(1 - (fl * 0.5 + 0.5), sdf(uv))`. See [NiloCat's URP toon example](https://github.com/ColinLeung-NiloCat/UnityURPToonLitShaderExample), [URPSimpleGenshinShaders](https://github.com/Knosiz/URPSimpleGenshinShaders), [an SDF face shadow in UE5](https://unrealengine.hatenablog.com/entry/2024/02/28/222220) and [the same effect without an SDF](https://qiita.com/tori_momo/items/949eb49747f425a33f57). All VRoid faces share one UV layout, so one map fits every VRoid face.

Either way, the face receives only the fringe's shadow (a hair-only shadow pass or a mask), the nose and lips stay in the lit tone, and the nose is a drawn stroke (decal or texture line).

**Eyes.** MakeHuman: a flat-painted iris (tall oval, dark top third, light lower crescent) as `MeshBasicMaterial`, with the highlight dots on a separate layer with slight parallax, and the lid line thickened by outlining only the lash mesh. VRoid already splits `EyeIris`, `EyeHighlight`, `FaceEyeline` and `FaceEyelash`; just keep them unlit.

**Stage light and grade.** A warm key spot (`#ffd9a8`, high and in front, about 35° up), a cool fill (`#6070a0` at 0.15), a back spot (`#fff0dc`) for the rim, and the hall at about 2 % of the key. Post: bloom (threshold 0.85, strength 0.4, radius 0.6), lifted blacks (`col * 0.94 + vec3(0.02, 0.025, 0.05)`), a violet split-tone or LUT, a light vignette. Set `toneMapped = false` on the toon materials: AgX (#028–#032) greys flat colours and the black suit. Keep AgX for the stage.

---

## 2. Model options

### 2a. MakeHuman male via `build-character.mjs`

The script blends `TARGETS` (file names read from `mh-assets/base/`) and scales to `HEIGHT`. All target paths below exist in the [MakeHuman 1.x repo](https://github.com/makehumancommunity/makehuman) at `makehuman/data/targets/…`. I listed the repo tree (`git ls-tree`, 1 554 files under `targets/`) and fetched several with curl from `https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/<path>` (all 200).

**Body (macro) targets.** Set `HEIGHT = 180`. `asian-male-young` (1.0) gives the East-Asian young male; `universal-male-young-averagemuscle-minweight` (0.5) plus a little `minmuscle-minweight` make him slim, with a softer drawn body; the `idealproportions` and `maxheight` targets lengthen the legs and shrink the head relative to the body (the script still rescales to 180 cm); small leg-length, long-neck, V-torso and narrow-shoulder targets finish it (narrow shoulders suit the violin hold). Paths and weights are in the list at the end of §4.

**Face targets toward anime proportions.** Larger, taller, slightly lower eyes; a small, straight nose without nostril flare; a small flat mouth with no philtrum or laugh-line relief (relief would draw cel shadows); a narrow pointed chin; a smaller lower face; flat cheeks; a taller forehead under the fringe; brows close to the eyes. Paths and starting weights are in the list at the end of §4 (l-/r- pairs take the same weight).

Community targets that do this in one file (CC0, §3): **654 Anime Stylized (Enhanced)**, **171 Toonify head**, **721 Super pointy jaw**. Try 654 at 0.3–0.5 before tuning the list above.

`build-character.mjs` reads targets only from `base/` by file name. The face targets above need downloading into `mh-assets/base/` with the same raw.githubusercontent URL pattern. The l-/r- names are unique, so the flat layout works.

**System assets in `~/test/mh-assets/sys`.** Counted from the `.obj` files; thumbnails viewed.

| Asset | Verts / faces | Textures | What it is |
|---|---|---|---|
| `clothes/male_elegantsuit01` | 7 613 / 7 478 | diffuse 2048² only | **Yes, a suit:** dark grey single-breasted jacket with notch lapels, trousers, white shirt collar and cuffs, striped tie, one mesh. Recolour black; CC0 recolours: community materials 983–991 |
| `male_worksuit01`, `male_casualsuit01..06` | 1 620–8 426 faces | diffuse (+ normal, AO) | dungarees; shirts / T-shirts with jeans; 05 is a field jacket over a shirt (off-stage Mine), 01 a navy shirt with jeans (off-stage Chiaki) |
| `shoes01` | 1 660 faces | | brown leather lace-ups with socks |
| `shoes03` | 2 064 faces | | black ankle boots |
| `shoes02/05/06` | ~1 532 faces | | sneakers |
| `shoes04` | 1 660 faces | diffuse + normal | **black dress shoes (lace-up)**, the one to use |
| `hair/short02` | 1 755 / 1 672 | diffuse + normal, alpha cards | brown, layered, covers the ears, fringe forward (Mine-ish when bleached) |
| `hair/short04` | 865 / 525 | diffuse, alpha cards | black, swept from the crown with a long side fringe (the closest to Chiaki) |
| `hair/short01` | 2 984 / 1 839 | | black, cropped and spiky (Mine's spikes, but too short); `short03` is tagged female |
| `skins/young_asian_male` | | `young_lightskinned_male_diffuse3.png` 2048² | light-skin diffuse; fine under cel. (`toon01` has no texture, only a litsphere) |

Rig: MakeHuman's 163-bone default skeleton with full finger chains (3 bones per finger + metacarpals), exactly what #032's `hand-driver.js` drives. That counts for violin fingering.

### 2b. Anime VRM / glTF males

Checked with curl and parsed with node (VRM meta, humanoid bones, joints, triangles).

| Candidate | Licence | Download without login | Tris | Fingers | Clothes / hair | Verdict |
|---|---|---|---|---|---|---|
| **VRoid HairSample_Male** (VRoid beta sample) | CC0 (embedded `licenseName: CC0`) | yes: [OGA zip](https://opengameart.org/sites/default/files/hairsample_male.zip); also `vroid/beta/HairSample_Male.vrm` in [madjin/vrm-samples](https://github.com/madjin/vrm-samples) | 24 858 | 30 bones (3 per finger) | black side-swept fringe (very close to Chiaki), white hoodie, trousers | **downloaded** |
| **VRoid Sakurada Fumiriya** (桜田 史利矢, VRoid's first male preset, "light brown hair, his height, gentle smile": [VRoid Hub](https://hub.vroid.com/characters/6912965120285194650/models/2261505926203110716)) | listed as CC0 by pixiv's FAQ per the OGA page; embedded meta: VRoid Hub licence, redistribution and modification allowed, credit unnecessary | yes: [OGA zip](https://opengameart.org/sites/default/files/sakurada_fumiriya.zip) | 39 548 | 30 | light-brown spiky hair with ahoge (Mine), shirt + tie + knit vest | **downloaded** |
| **VRoid Base_Male** | CC0 | yes: [OGA zip](https://opengameart.org/sites/default/files/base_male.zip) | 15 176 | 30 | same uniform, no hair (scalp cap only); the clean base to dress | **downloaded** |
| VRoid AvatarSample_C (current sample, male) | VRoid's own terms (alter and distribute allowed, copyright kept), not CC0 | madjin/vrm-samples `vroid/stable/AvatarSample_C.vrm`; official copy needs a VRoid Hub login | 26 988 | 30 | hoodie | weaker licence; skipped |
| Polygonal Mind 100Avatars (300) and ToxSam's Orion | CC0 | [PolygonalMind/100Avatars](https://github.com/PolygonalMind/100Avatars) via raw.githubusercontent (e.g. `100Avatars_046/100Avatars_046_Mafiossini.vrm`); the [ToxSam registry](https://github.com/ToxSam/open-source-avatars)'s arweave.net links fail TLS behind this proxy (`curl: (60)`) | 3 806 (Mafiossini), 6 200 (Orion) | 30 | low-poly mascots; Mafiossini wears a black suit but has a blob head | wrong style |
| Sketchfab CC-BY anime males | CC-BY | needs a Sketchfab login (API token) for glTF download | | varies | | not checked; licence and fingers are per model |

Also checked and rejected: the other VRoid beta samples (Darkness_Shibu, Sendagaya Shino/Shibu, Vita, Vivi, Victoria Rubin: CC0 but female); `masc_vroid.vrm` in madjin/vrm-samples (bald base, licence `Other` with no URL); [three-vrm examples](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models) and [VRM Consortium samples](https://github.com/vrm-c/vrm-specification/tree/master/samples) (only female or test models); VRoid Hub user models (login needed to download).

**Verification** (node, GLB parse): all three are VRM 0.x with 54 humanoid bones, all 30 finger bones (`J_Bip_L_Thumb1..3`, `J_Bip_L_Index1..3` … plus `_end`), and the same 64 `J_Bip_*` joints, so meshes can be swapped between them. Body height ≈ 1.75 m. Licence, source and sha256: `../assets/models/CREDITS.md`.

What the VRoid models give for free: an anime face with separate unlit iris, highlight, eyeline and lash materials; a face UV shared by every VRoid face (one SDF shadow map fits all); 39–54 face blendshapes (`blink`, `a i u e o`, `joy`, `angry`, `sorrow`, `fun`); MToon shade colours already set for anime. What they lack: a suit. The uniform is a white shirt, a tie and a knit vest. A jacket must come from elsewhere. The easiest paths are to recolour the vest black and add a jacket mesh, or to model a simple tailcoat in code on the VRoid body, as #032 does for dresses.

### 2c. Comparison

- **Anime face:** MakeHuman needs targets, painted eyes and spherized normals or an SDF map, and can still look like an uncanny realistic face. VRoid has the real thing.
- **Hair:** MakeHuman alpha cards are realistic and need the angel-ring shader (community 3677 is a good Chiaki cut). VRoid hair is anime meshes with spring bones (HairSample_Male ≈ Chiaki, Fumiriya ≈ Mine).
- **Suit:** MakeHuman has `male_elegantsuit01` and community suits fitted by the existing script. VRoid has none.
- **Fingers:** both have full chains; MakeHuman drives `hand-driver.js` directly, VRoid goes through `alt-model.js`.
- **Licence:** CC0 / CC-BY versus CC0 (two) and VRoid's free terms (Fumiriya).
- **Size:** ~2 MB bin plus textures versus 18–20 MB per VRM (2048² PNGs; ~4 MB after WebP / KTX2).

---

## 3. MakeHuman community assets

Catalogue: `http://www.makehumancommunity.org/sites/default/files/assets.json` (named in `pianist/build/fetch-community.mjs`; no copy on disk). curl: HTTP 200, 4.0 MB, 3 425 entries. Only http works (https refused connections from here). Asset pages: `http://www.makehumancommunity.org/node/<nid>`. Everything below is CC0 or CC-BY (what the fetch script accepts), for MakeHuman 1.1.x; face counts from the `.obj` files.

**Suits / formal wear**

| nid | Title | Author | Licence | Faces | Notes |
|---|---|---|---|---|---|
| 1317 | Suit with Jacket and Bowtie | MargaretToigo | CC0 | 12 327 | grey suit, white shirt, **bow tie**; diffuse, bump, spec; alt materials 1318–1320 (brown, blue/red, blue/gold); recolour to black → concert dress |
| 1746 | Suit with Dinner Jacket | MargaretToigo | CC0 | 7 650 | white dinner jacket with black shawl lapels, black trousers, bow tie (a tuxedo); diffuse, spec, normal; recolour the jacket black → tuxedo |
| 1265 | Men's Suit Tie and Jacket | MargaretToigo | CC0 | 9 601 | suit + tie |
| 1733 | Men's Suit 3 | MargaretToigo | CC0 | 8 125 | navy suit, red tie, pocket square, more detail |
| 1740 | Mens' Double-breasted Suit | MargaretToigo | CC0 | 5 031 | double-breasted |
| 390 | M Suit 01 | Mindfront | CC-BY | 4 585 | black tailored suit, shirt and tie faked in the texture, normal map; CC0 alt materials 992–995 (MargaretToigo) |
| 1799 | Elvs Male Shirt w/tie tucked1 | Elvaerwyn | CC-BY | 2 333 | dress shirt with tie, tucked (shirt-sleeve rehearsal look) |
| 1497 | M Trousers 02 | Mindfront | CC-BY | 7 292 | soft suit trousers |
| 983–991 | Male Elegant Suit – Blue/Brown/Burgundy/Gray/… (materials) | MargaretToigo | CC0 | | recolours for the system `male_elegantsuit01` |

No tailcoat (tails) exists in the catalogue (searched for tux, tailcoat, tail coat, tails, dinner jacket, formal, waistcoat). For Chiaki conducting, extend 1317/1746 with tails modelled in code, as #032 builds its own dresses.

**Shoes**

| nid | Title | Author | Licence | Faces |
|---|---|---|---|---|
| 620 | Shoes Oxford male | Mindfront | CC-BY | 2 596 |
| 622 | Shoes Monk Strap male | Mindfront | CC-BY | 6 666 |
| 1732 | Men's Loafers | MargaretToigo | CC0 | 1 736 |

(System `shoes04`, black lace-ups, is CC0 and already on disk.)

**Hair**

| nid | Title | Author | Licence | Faces | Fit |
|---|---|---|---|---|---|
| 3677 | Short Hair B | WojackOWL | CC-BY | 5 272 | **black, side-swept long fringe over one eye, covers the ears: the closest to Chiaki** (alpha texture `BHL_StraightHairB_Alpha.png`) |
| 2892 | mhair02 | culturalibre | CC0 | 1 730 | black, short, neat side part (a tidier Chiaki) |
| 575 | Hair_male_spiky | grinsegold | CC-BY (also credit Nathan Vegdahl, Beorn Leonard, Jonathan Williamson, David Revoy) | 721 | red/brown spiky (Mine, recoloured blond) |
| 2809 | Short Messy Hair | Cortu | CC0 | 546 | messy blond (Mine) |
| 3369 | Hair 09 | culturalibre | CC-BY | 14 472 | wavy short blond male |

Also short male cuts, less close: 1639 Elvs Maxwell Hair (CC-BY), 2445 Hair 05 (CC0, swept back), 220 male short hair (CC0); anime-blade experiments 1404 and 253 (CC0) are rough.

**Face / anime**

| nid | Title | Type | Licence | Notes |
|---|---|---|---|---|
| 654 | Anime Stylized (Enhanced) | target | CC0 | DredNicolson's fixed version of Oscalon's anime target; meant for partial amounts |
| 171 | Toonify head | target | CC0 | bigger eyes, smaller mouth and nose; "best for child characters", use ≤ 0.3 |
| 721 | Super pointy jaw | target | CC0 | anime pointed chin |
| 1253 | Elvs Anime Eye 1 | eye material | CC-BY | cartoon iris texture |

`fetch-community.mjs` downloads every file in an entry's `files` map into `community/<nid>/`, so targets (654, 171, 721) download as well. `build-character.mjs`, however, treats community entries as clothes or hair (`KINDS`) and would need a small branch to apply a `.target` from `community/<nid>/` with a weight.

---

## 4. Recommendation

**Start with the VRoid route (2b), using `vroid-hairsample-male.vrm` as Chiaki. Keep MakeHuman (2a) as the second route for the suit and as a fallback.**

Why: the look depends almost entirely on the face and hair. VRoid gives a real anime face (flat, separate iris and highlight layers, no nose or lip relief, a shared UV for an SDF shadow map) and anime hair with spring bones. The hair sample already has Chiaki's black side-swept fringe, and Sakurada Fumiriya gives Mine for free. Making a MakeHuman head read as anime needs a dozen targets, painted eyes and normal editing, and could still end up uncanny. Fingers are not a constraint: all three VRMs have full 3-bone finger chains, and `alt-model.js` already drives VRM fingers from the MakeHuman rig. The licences are CC0 (two models) or VRoid's redistribution-and-modification terms (Fumiriya). The missing piece is the jacket, which is a bounded modelling job.

Steps:
1. Add `vroid-hairsample-male` (and `vroid-sakurada-fumiriya`) to an `alt-model.js`-style `MODELS` table for #037 (`kind: 'vrm'`). They are VRM 0.x: three-vrm 3.x loads them, and `alt-model.js` turns models that face the wrong way. Re-encode the 2048² PNGs to WebP or KTX2 in a build step (~18 MB → ~4 MB each).
2. Dress: hide the hoodie primitive (`M00_006_01_Tops_01_CLOTH`) and use Base_Male's shirt + tie (`M00_001_01_Tops/Accessory_Tie`) on the same skeleton: the 64 `J_Bip_*` joints match, so the mesh can be rebound by joint name. Recolour the vest and tie black. Add a black jacket or tailcoat built in code over the torso and arms (as #032's `dress.js` builds dresses), or fit MakeHuman 1317 / 1746 to the VRoid body (the second route).
3. Cel look (`violinist/look.js`): MToon with `shadingToony ≈ 0.95`, `shadingShift` per material, shade colours from §1.2; screen-space outlines at about 1.6 / 1.3 / 1.0 px with smoothed normals; rim light; hair angel-ring band; face with spherized normals first, an SDF face map for close-ups; unlit eyes; stage grade with lifted violet blacks and toon materials outside AgX.
4. Drive the hands from the #033 violin fingering through the proxy rig, as #032 drives piano fingers.
5. In parallel, build the MakeHuman fallback: `HEIGHT = 180` and the macro and face targets of §2a (downloaded into `mh-assets/base/`); `male_elegantsuit01` recoloured black or community 1317/1746; `shoes04`; hair 3677 (Chiaki) or 2809/575 (Mine); `young_asian_male` skin. Compare the two side by side in cel.

Exact MakeHuman target list (all under `makehuman/data/targets/` in [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman)):

```
# body (HEIGHT = 180)
macrodetails/asian-male-young.target  1.0
macrodetails/universal-male-young-averagemuscle-minweight.target  0.5
macrodetails/universal-male-young-minmuscle-minweight.target  0.2
macrodetails/proportions/male-young-averagemuscle-minweight-idealproportions.target  0.8
macrodetails/height/male-young-averagemuscle-minweight-maxheight.target  0.3
armslegs/upperlegs-height-incr.target  0.2
armslegs/lowerlegs-height-incr.target  0.2
neck/neck-scale-vert-incr.target  0.2
neck/neck-scale-horiz-decr.target  0.3
torso/torso-vshape-incr.target  0.2
measure/measure-shoulder-dist-decr.target  0.1
# face (l-/r- both)
eyes/{l,r}-eye-scale-incr.target  0.6
eyes/{l,r}-eye-height2-incr.target  0.3
eyes/{l,r}-eye-trans-down.target  0.2
eyes/{l,r}-eye-corner1-up.target  0.2
eyes/{l,r}-eye-epicanthus-in.target  0.3
nose/nose-scale-horiz-decr.target  0.6
nose/nose-scale-vert-decr.target  0.4
nose/nose-scale-depth-decr.target  0.5
nose/nose-point-width-decr.target  0.5
nose/nose-flaring-decr.target  0.5
nose/nose-nostrils-width-decr.target  0.5
nose/nose-hump-decr.target  0.5
nose/nose-point-up.target  0.2
mouth/mouth-scale-horiz-decr.target  0.4
mouth/mouth-lowerlip-volume-decr.target  0.5
mouth/mouth-upperlip-volume-decr.target  0.5
mouth/mouth-philtrum-volume-decr.target  0.5
mouth/mouth-laugh-lines-in.target  0.5
chin/chin-width-decr.target  0.5
chin/chin-triangle.target  0.4
chin/chin-height-decr.target  0.2
chin/chin-prominent-decr.target  0.3
head/head-invertedtriangular.target  (or head/head-oval.target)  0.4
head/head-scale-vert-decr.target  0.15
cheek/{l,r}-cheek-bones-decr.target  0.4
cheek/{l,r}-cheek-volume-decr.target  0.3
forehead/forehead-scale-vert-incr.target  0.2
eyebrows/eyebrows-trans-down.target  0.2
```
