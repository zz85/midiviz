# Models for #037 Violinist

All three are VRoid Project sample models (pixiv Inc.), VRM 0.x, downloaded 18 Oct 2026 from the OpenGameArt page
[VRoid Studio CC0 models](https://opengameart.org/content/vroid-studio-cc0-models) (submitted by hecko, licence field: CC0).
The uploader states they come from the alpha/beta versions of VRoid Studio and "were explicitly released by VRoid under CC0",
citing pixiv's FAQ [Do VRoid Studio's sample models come with conditions of use?](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use-)
(that page sits behind a Cloudflare check and could not be fetched from here; [madjin/vrm-samples](https://github.com/madjin/vrm-samples) quotes the same CC0 section).
AvatarSample_A/B/C (the current VRoid Studio samples) are NOT CC0 and are not included.

Credit is not required (CC0), but we credit anyway: "VRoid sample model © pixiv Inc. / VRoid Project, CC0".

| File | Original name | Source URL (zip) | Licence (embedded VRM meta) | sha256 |
|---|---|---|---|---|
| `vroid-hairsample-male.vrm` | HairSample_Male.vrm (VRoid Studio 0.14.0 export by the OGA uploader) | https://opengameart.org/sites/default/files/hairsample_male.zip | `licenseName: CC0`; VRoid Hub terms: redistribution allow, modification allow, credit unnecessary, commercial allow | 4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7 |
| `vroid-sakurada-fumiriya.vrm` | Sakurada Fumiriya.vrm (桜田 史利矢, UniVRM 0.44) | https://opengameart.org/sites/default/files/sakurada_fumiriya.zip | `licenseName: Other` → `otherLicenseUrl` = VRoid Hub licence with redistribution=allow, modification=allow, credit=unnecessary, corporate_commercial_use=allow; listed as CC0 by pixiv's FAQ (per the OGA page) | a36e91b81518c59f6da0e3f34a176b79090a8c68cc6bd5fe03c1560744b283f3 |
| `vroid-base-male.vrm` | Base_Male.vrm (VRoid Studio 0.14.0 export by the OGA uploader) | https://opengameart.org/sites/default/files/base_male.zip | `licenseName: CC0`; same VRoid Hub terms as above | ab9af434a229283c192546486f9e6eb9cd855bf7d8d45b5037ac211938cb903c |

Character page for Sakurada Fumiriya on VRoid Hub: https://hub.vroid.com/characters/6912965120285194650/models/2261505926203110716

## What each one is (checked with node, parsing the GLB JSON chunk)

| File | Size | Triangles | Unique vertices | Humanoid bones | Finger bones | Look |
|---|---|---|---|---|---|---|
| vroid-hairsample-male.vrm | 18.9 MB | 24 858 | 17 669 | 54 | 30 (Thumb/Index/Middle/Ring/Little × Proximal/Intermediate/Distal × L/R; joints `J_Bip_L_Index1..3` + `_end`) | black, layered, side-swept fringe over one eye; white hoodie, trousers, shoes; 10 spring-bone groups (hair, hood) |
| vroid-sakurada-fumiriya.vrm | 19.6 MB | 39 548 | 29 089 | 54 | 30 | light brown / peach spiky hair with an ahoge; school uniform (white shirt, blue tie, dark knit vest), trousers, shoes; 13 spring-bone groups |
| vroid-base-male.vrm | 17.9 MB | 15 176 | 9 878 | 54 | 30 | the same uniform (shirt, tie, vest, trousers, shoes) with only the scalp "HairBack" cap, no hair mesh, no spring bones |

All three share the same 64 `J_Bip_*` skeleton joints, so the hair mesh of one can be moved onto another.
Materials are MToon 0.x (14–17 each), textures 2048² PNG embedded.
