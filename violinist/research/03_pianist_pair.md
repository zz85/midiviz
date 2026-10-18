# A pianist for the violinist: a matching pair (Nodame and Chiaki)

Goal: a #032 pianist who stands next to the #037 violinist (VRoid CC0 males) on one stage and reads as the same show. Reference: *Nodame Cantabile*. Nodame is a young woman with brown hair (a bob or a short ponytail) in a concert dress; Chiaki is a tall black-haired man. Everything here was checked on 18 Oct 2026: files downloaded, GLB JSON parsed with node, renders in headless Chromium (three 0.170.0, @pixiv/three-vrm 3.5.5, `VRMUtils.rotateVRM0`). Candidates and previews are in `../assets/models/candidates/` (not committed); the preview page is `candidates/preview.html?vrm=<file>&view=front|face|back`.

## 1. VRoid beta CC0 females (OpenGameArt)

Page: [VRoid Studio CC0 models](https://opengameart.org/content/vroid-studio-cc0-models) (author VRoid Project, submitted by hecko, 24 Dec 2024, licence field **CC0**). It cites pixiv's FAQ [Do VRoid Studio's sample models come with conditions of use?](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use-) (403 from here). The FAQ's "CC0 license models" image, mirrored in [madjin/vrm-samples](https://github.com/madjin/vrm-samples), lists Base female and male, HairSample_Male, HairSample_Female and AvatarSample_D, E, F and G.

All eight are VRM 0.x with 54 humanoid bones, **all 30 finger bones**, and the same 64 `J_Bip_*` joints as the males in `../assets/models/`. Every meta has `allowedUserName: Everyone`, commercial use allowed, and `otherLicenseUrl` = a VRoid Hub licence with `redistribution=allow`, `modification=allow`, `credit=unnecessary`.

| Zip (direct URL, `opengameart.org/sites/default/files/…`) | Meta title | `licenseName` | Tris | Hair | Outfit |
|---|---|---|---|---|---|
| [avatarsample_d_0.zip](https://opengameart.org/sites/default/files/avatarsample_d_0.zip) | 千駄ヶ谷渋 (Sendagaya Shibu) | Other | 34 395 | dark navy, short, side buns | school uniform, pleated skirt |
| [avatarsample_d_darkness.zip](https://opengameart.org/sites/default/files/avatarsample_d_darkness.zip) | AvatarSample_D | CC0 | 33 750 | silver bob, elf ears | black gothic dress |
| [avatarsample_e.zip](https://opengameart.org/sites/default/files/avatarsample_e.zip) | ビビ (Vivi) | Other | 26 706 | **light brown chin-length bob**, two small buns on top | cream blouse, green pinafore, apron, lace-up boots |
| [avatarsample_f.zip](https://opengameart.org/sites/default/files/avatarsample_f.zip) | ヴィータ (Vita) | Other | 27 002 | white-blue, horns | sci-fi leotard |
| [avatarsample_g.zip](https://opengameart.org/sites/default/files/avatarsample_g.zip) | ヴィクトリア・ルービン | Other | 29 800 | pastel blond side ponytail | frilled magical-girl outfit |
| [base_female.zip](https://opengameart.org/sites/default/files/base_female.zip) | Base_Female | CC0 | 14 804 | none (teal scalp cap) | uniform: shirt, vest, bow, skirt |
| [hairsample_female.zip](https://opengameart.org/sites/default/files/hairsample_female.zip) | HairSample_Female | CC0 | 27 068 | black twin tails, cat ears | **white long-sleeved knee-length dress** |
| [sendagaya_shino.zip](https://opengameart.org/sites/default/files/sendagaya_shino.zip) | 千駄ヶ谷篠 | Other | 31 211 | dark navy, wavy, shoulder length | uniform |

"Other" files are UniVRM 0.44 originals; "CC0" ones are the uploader's VRoid Studio 0.14.0 re-exports. pixiv's CC0 list covers both. OGA's `AvatarSample_D` is Sendagaya Shibu; pixiv's "AvatarSample_D" is the silver Darkness model.

**Downloaded:**

| File | Size | sha256 (start) |
|---|---|---|
| `candidates/vroid-avatarsample-e-vivi.vrm` | 17 936 516 B | aea824cc43a95dd0 |
| `candidates/vroid-hairsample-female.vrm` | 17 954 972 B | d9ef39f04e54b368 |
| `candidates/vroid-base-female.vrm` | 16 323 872 B | 1995f174f6c8f221 |
| `candidates/vroid-avatarsample-a.vrm` (§2, not CC0) | 15 096 320 B | b86b0b8a66d48911 |

**Structure** (node parse):
- Meshes: `Face.baked` (10 primitives, ~3 150 tris, 41–56 morphs), `Body.baked` (skin and clothes), `Hair001.baked` (Vivi 78 primitives / 11 676 tris, HairSample 108 / 12 384, Base none). Spring groups: Vivi 22, HairSample 10, Base 2.
- MToon 0.x materials: `F00_000_00_FaceMouth/EyeWhite/FaceEyeline/FaceEyelash/FaceBrow/EyeIris/EyeHighlight/Face_00_SKIN/EyeExtra`, `F00_002_02_Body_00_SKIN`, `F00_002_01_Onepice_01_CLOTH` (Vivi), `F00_002_01_Tops_01_CLOTH` (HairSample's dress), `…Shoes_01_CLOTH`, `F00_000_HairBack_00_HAIR`, `F00_000_Hair_00_HAIR_01..03`; Base has `F00_001_01_Tops/Accessory_Tie/Bottoms/Shoes`. These follow the males' `M00_*` naming.
- **The body exists under the clothes.** In every file the first `Body_00_SKIN` primitive has 2 418 vertices / 4 360 tris from the ankles to the neck (y 0.10–1.44 m), with no hidden faces deleted.
- Expressions: a i u e o, blink (+ l/r), angry, fun, joy, sorrow. Heights: Vivi 1.54 m, the others ~1.80 m.

**Previews** (`candidates/<name>-front.png` 500×800, `-face.png` 700×700, `-back.png`):
- `vroid-avatarsample-e-vivi`: light-brown bob with a blunt jagged fringe and side locks that flare out. Two curled buns on top read as small horns; they are separate hair primitives (`HAIR_03`) and can be hidden. Big teal eyes, blush, pinafore dress, platform boots. Younger and cuter than Nodame, but the hair is right.
- `vroid-hairsample-female`: black twin tails, a long fringe, white cat ears, red-orange eyes; a plain white high-necked dress with puffed sleeves and a sash. The best stage dress in the set.
- `vroid-base-female`: scalp cap, navy vest, orange bow, skirt. Her neutral face is the closest match to the males.
- `vroid-avatarsample-a` (front, face): see §2.

All faces share the VRoid layout and line work of `vroid-hairsample-male.vrm`.

## 2. Other anime women with 30 finger bones

| Model | Licence (checked) | Look | Verdict |
|---|---|---|---|
| **VRoid AvatarSample_A**: [madjin `vroid/stable/AvatarSample_A.vrm`](https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_A.vrm), [VRoid Hub](https://hub.vroid.com/en/characters/2843975675147313744/models/5644550979324015604) | meta `Other` with no URL, Everyone / commercial allow. pixiv: free use under its conditions, "copyright is not waived, you can alter, distribute" ([AvatarSample A〜Z](https://vroid.pixiv.help/hc/ja/articles/4402394424089-AvatarSample-A-Z)) | **dark-brown bob, side-swept fringe, brown eyes**; cardigan, camisole, shorts, tights, loafers; 24 854 tris, body under the clothes | the best Nodame; not CC0 |
| AvatarSample_B (madjin) | as A | long purple hair, varsity jacket | no |
| pixiv VRM1_Constraint_Twist_Sample (already in `pianist/assets/models/`) | [VRM Public License 1.0](https://vrm.dev/licenses/1.0/): redistribution and modification allowed, credit unnecessary | long straight brown hair, T-shirt, shorts; made in VRoid; 36 470 tris | VRoid style, but long hair |
| VRM Consortium [Seed-san](https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san) | VRM PL 1.0, credit required | black-haired kid with a robot arm | no |
| madjin `fem_vroid.vrm` | `Other`, no URL | bald base | unknown licence |
| 100Avatars, Orion | CC0 | low-poly mascots (see `02_character_look.md`) | wrong style |

## 3. MakeHuman route

**No male targets are on disk.** `~/test/mh-assets/base/` has `base.obj`, `default.mhskel`, `default_weights.mhw` and six female targets. To download (all HTTP 200 from `raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/<path>.target`): `macrodetails/asian-male-young` (or `caucasian-male-young`), `macrodetails/universal-male-young-averagemuscle-minweight`, `macrodetails/proportions/male-young-averagemuscle-minweight-idealproportions`, `macrodetails/height/male-young-averagemuscle-minweight-maxheight`, plus the face targets in `02_character_look.md` §4, with `HEIGHT = 180`.

On disk in `sys/` (tags from `.mhclo`): clothes `male_elegantsuit01` (Male, Elegant: dark suit, white collar, tie), `male_casualsuit01..06`, `male_worksuit01`; shoes under `clothes/`: `shoes04` (black dress lace-ups), `shoes01` (brown lace-ups), `shoes03` (black boots); hair `short04` (Male, black side-swept: Chiaki), `short02` (Male, brown layered), `short01` (Male, cropped); `short03` is tagged Female; skins `young_asian_male`, `young_caucasian_male`.

The script is female-specific: the skin path is hard-coded to `young_caucasian_female` (line 339), `HAIR_MESHES` lists the five female styles, and system clothes aren't fitted (only community assets and our dresses). Fixing that is a small change.

**How close would the cel look get to VRoid? Not close.** `look.js`'s cel look is a 3-step grey `MeshToonMaterial` with a world-space hull over a realistic head. The nose, lips and eye sockets cast shadows, the eyes are spheres with a photo iris, and the hair is alpha cards. Next to a VRoid face (flat skin, unlit painted eye layers, a one-line nose, solid hair locks) it reads as 3D people with outlines. Even with the anime targets, community 654, painted eyes and spherized normals it lands halfway. A MakeHuman pair would match each other but not #037, and the face work would be needed twice.

## 4. Nodame and Chiaki fan models

Searched 18 Oct 2026:
- **Sketchfab** API `api.sketchfab.com/v3/search?type=models&q=`: `nodame`, `nodame cantabile`, `chiaki shinichi` gave 0 results.
- **Niconi Solid**: `のだめ` gave 3 unrelated works (td11307, td23775, td86216); `千秋真一` and `野田恵` gave 0.
- **BowlRoll** (MMD): `のだめ` gave 0.
- **BOOTH**: `のだめカンタービレ` gave 47 doujin music and book items; `のだめ 3Dモデル` gave only generic avatar accessories.
- **VRoid Hub**: search is client-side and the API refused anonymous queries (HTTP 400), so this was not checked. A web search found nothing.

The characters belong to Tomoko Ninomiya / Kodansha. A fan model is a derivative whatever licence the fan attaches, so none can be committed or deployed publicly. If one turns up, the only safe use is local: the user downloads it into a git-ignored folder and loads it from a local `MODELS` entry or a file picker (neither exists yet). The clean route is an original look inspired by the show (brown bob, navy dress, black tailcoat) on the VRoid bases.

## 5. Recommendation

Use VRoid for both. Violinist: `vroid-hairsample-male.vrm` (Chiaki-like black fringe). Pianist: **AvatarSample_A**, the best Nodame hair and face (pixiv's free terms; redistribution allowed, keep "© pixiv Inc." and the conditions). If everything must be CC0, use **Vivi** with her top buns hidden, wearing HairSample_Female's white dress, or give Base_Female a bob authored in VRoid Studio. All share the `J_Bip_*` skeleton, MToon and face UVs with the men, so one toon shader, one outline pass and one SDF face map cover the pair.

What #032 needs:
1. A `MODELS` entry in `alt-model.js` (`kind: 'vrm'`, e.g. `models/vroid-avatarsample-a.vrm`). VRM 0.x loads already; hide primitives by material name (Vivi's `HAIR_03` buns), and rebind HairSample_Female's `Tops_01_CLOTH` by joint name, as #037 does with Base_Male's uniform.
2. A concert dress. `dress.js` fits our dresses to MakeHuman's tights and skirt helper shells, which VRMs lack. Either recolour HairSample's dress navy or black, or port `dress.js` to fit `Body_00_SKIN` by nearest-vertex skinning.
3. Check the seated scale: `alt-model.js` scales limbs to the 165 cm MakeHuman woman; check the bench height and the reach across the keys. `hand-driver.js` gets all 30 finger bones.
4. Share #037's MToon two-tone, rim and pixel outline (`violinist/stage.js`) as one module, keeping `MTOON_GAIN` for #032's brighter stage.
5. Re-encode the 2048² PNGs to WebP or KTX2 (~17 MB to ~4 MB per model) before deploying.
