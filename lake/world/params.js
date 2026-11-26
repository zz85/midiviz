// World look-dev parameters (all tunable; create(ctx) deep-merges ctx.options.world over these).
// Colours given as hex are DISPLAY-referred targets (what the pixel should look like after the core final pass:
// exposure 1, Khronos PBR Neutral, sRGB) and are converted to scene-linear with util.invNeutral at create time,
// so the look survives as long as the core keeps that tone map. Units: metres, seconds, degrees.

export const WORLD_DEFAULTS = {
  exposure: 1.0,                 // the exposure the display targets assume (the core final pass multiplies by it)

  // ------------------------------------------------------------------------------------------------ sun / time
  // film time t (s) -> sun elevation (deg); A = 0 is the sun's azimuth (DESIGN.md section 2)
  sunKeys: [[0, 0.6], [110, -1.0], [215, -1.6], [235, -4.5]],
  sunElevationOverride: null,    // number (deg) to pin the sun (look-dev, per-shot override)
  // fix round 2: the LOOK is pinned to the plates (all at sun ~ -1 deg): elevations above sunLook[0] are compressed by
  // sunLook[1] before they reach the sky table / clouds / alpenglow / water (S01 at +0.53 washed the frame pastel pink)
  sunLook: [-1.0, 0.15],          // CPU check (harness/sunlook_cpu.mjs), sun +0.53: clear-sky L ratio vs -1 deg raw 1.4-3.2 / hue +49 -> <= 1.15 / hue <= 5 deg

  // ------------------------------------------------------------------------------------------------ sky
  sky: {
    // how the clear-sky table (skytable.js, measured at sun -1 deg) changes with sun elevation s (deg):
    // gain = exp(k * (s + 1)), arch (the warm glow's elevation extent) scales by exp(-archK * (s + 1)) in e
    gainBaseK: 0.18, gainGlowK: 0.42, archK: 0.11,
    glowWidthDeg: 32, glowHeightDeg: 9,           // where the 'glow' gain applies (vs the 'base' gain)
    blueHourTintBase: [0.72, 1.0, 1.0],          // multiplied in progressively below s = -2 deg
    blueHourTintGlow: [1.00, 0.72, 0.62],
    belowHorizonFade: 0.55,                        // sky colour continued below the horizon (only seen in gaps)
    lutSize: [96, 96],
    core: [0.25, 0.08, 5, 3.75],                 // glow-core boost: x1.25, G +8 %, |A| ~5 deg, centred at e 3.75 deg (fix round 1)
  },

  // ------------------------------------------------------------------------------------------------ clouds
  clouds: {
    altitudeKm: 4.5,
    bandAzimuthDeg: 20,          // session 8: back to 20 (f06 r18m8: near-isotropic field, every shot better than A 110; ref 6 49 -> 58)
    windKmPerS: 0.008,           // drift along the band axis (8 m/s)
    windAcrossKmPerS: 0.0015,
    evolve: 0.004,               // slow change of the warp field per second
    offsetKm: [3.0, -7.0],       // where the deterministic pattern sits
    // coverage comes from the art-directed map (cloudmap.js, fitted to the plate by sandbox/world/tools/cloudmapfit.py);
    // the field (~N(fieldMu, fieldSigma)) is thresholded at the (1 - coverage) quantile
    mapGain: 0.95, mapBias: 0.0,  mapRefTime: 10,      // look-dev scaling of the map; film time at which the map holds (cycle 3: 0.9 -> 0.95 = h04 fold; h05 1.05 + lit midpoint: coverage 0.238 -> 0.248 but proxy -0.9..-1.8 on every shot)
    edgeErosion: [0.12, 0.05],                        // cycle 4: 0.06 @ 90 m -> 0.12 @ 50 m (critic cWisp, GPU A/B on refs 10/2/9: edge width p50 3.8 -> 5.0 px vs ref 4.7-4.9, rim share 0.16-0.24 -> 0.05-0.10). cycle 3: cycle 3: isotropic (unstretched) puff octave on the clump edges, 0.06 field units @ 90 m (h03 'ero': blobs 48 -> 50, neutral proxy)
    envWeight: 0.92,                                  // field = envelope (clumps x lobes) x envWeight + tufts x (1 - envWeight)
    tuft2Weight: 0.2, isolatedRim: 0.1,              // second (fine) tuft octave weight; rim light on puffs outside any clump
    // quantiles of the field (sandbox/world/tools/cloudcalib.py 0.6 0.22 20 0.82 0.2): threshold for coverage i/32
    fieldQuantFine: [0.8705, 0.6744, 0.6475, 0.6288, 0.6141, 0.6016, 0.5905, 0.5805, 0.5711, 0.5623, 0.5538, 0.5457, 0.5381, 0.5304, 0.5230, 0.5155, 0.5081, 0.5007, 0.4932, 0.4855, 0.4779, 0.4699, 0.4618, 0.4534, 0.4444, 0.4349, 0.4249, 0.4136, 0.4008, 0.3860, 0.3671, 0.3388, 0.1563],
    fieldQuantCoarse: [0.7742, 0.6333, 0.6125, 0.5981, 0.5864, 0.5762, 0.5671, 0.5587, 0.5509, 0.5434, 0.5363, 0.5295, 0.5228, 0.5162, 0.5099, 0.5035, 0.4972, 0.4911, 0.4849, 0.4786, 0.4722, 0.4657, 0.4590, 0.4521, 0.4447, 0.4368, 0.4285, 0.4194, 0.4092, 0.3975, 0.3829, 0.3623, 0.2286],
    softness: 0.16, envSoft: 0.16,                    // cycle 4: 0.10 -> 0.16 (critic cWisp: feathered edges, hard share 0.13-0.17 -> 0.05-0.12 vs ref 0.07-0.09). cycle 3: 0.18 / 0.20 -> 0.10 / 0.10 (critic: smeared brush strokes, edge |dx| 35 % softer than the refs). soft edge of the density / of the clump envelope (fix round 2: 0.12 / 0.10 -> 0.18 / 0.20: no cut-out edges)
    bandScaleKm: 1.1,           // cycle 4: 1.6 -> 1.1 (h08 cBand, 1080p N16: ref10 / ref2 / ref9 / S01 +0.8 / +0.4 / 0 / +0.8; more, smaller clumps). across-band scale of the clump envelope (session 8 g05: 1.6 = the refs' big masses; blob mass / aspect / coverage match ref 10)
    bandStretch: 1.8, lobStretch: 1.6667,   // along-band / across-band aspect (fix round 1: 6 -> 1.5; stretch 6 across the view = venetian blinds)
    topCoverage: [0.0, 60, 18, 60],          // overhead prior (coverage, |A|, e from, e to): OFF (session 6: 0.5 turned ref 6's lake into an orange wash, 63 -> 43)
    clearBand: [25, 2.5, 4.0, 0.1],          // |A| < 25: coverage <= 0.1 below e 2.5 deg (fading out by 4 deg): the coral band above the ridges
    // cycle 3: litBand 0.15/0.5/35 -> 0.25/0.42/55 and litGate [20,40,6,14] -> [45,65,12,20] (h04 fold: lit_frac 0.031 vs ref 0.014, rim lit share 0.24 vs 0.065, dL 48 vs 22 = rims too BRIGHT; h05 midpoint 0.20/0.45/45 + [32,52,9,16] only reached lit_frac 0.029 and cost proxy -1 on every shot: the excess is rim brightness, not the gate; round 2: lit_frac 0.005
    // vs ref 0.014, g06 0.039): rims on the lower sun-side edges of most clumps in the lower 2/3 of the sky
    litBand: [0.25, 0.42, 55, 0.25],          // lit underside band: width (km) from the sun-side edge, edge density, no rims beyond |A| (deg), overhead lit floor (blue hour). fix round 2: 0.40/0.35/60 -> 0.15/0.5/35 (lit_frac 0.039 vs ref 0.014)
    litGate: [45, 65, 12, 20],               // cycle 3 (was [20, 40, 6, 14]). fix round 2: rims fade out between |A| 20-40 deg and e 6-14 deg (sun side, low only)
    litFromEnvelope: 0, topRim: 1.0,         // 1: the band follows the clump envelope's sun-side edge (session 6 test: lit far too much, ref 10 71 -> 65)
    slab: [0, 0.8, 1.0, 0.35],              // session 8 cloud SLAB: thickness km (0 = flat layer), march step km, heap exponent, wall darkening. OFF: g03 0.8 km = -1.0 mean and stair-step stripes near the horizon (the march step is 2-4x the clump size at e < 6 deg)
    litHighFromDeg: 10,                       // the lower-sky (salmon) palette holds to e 10 deg, the upper palette from 18 deg
    tuftScaleKm: 0.35,           // altocumulus cell size (session 8: 0.22 -> 0.35 with envWeight 0.92: fewer, larger tufts, no pink-white speckle)
    bodyGain: 0.85, litHighGain: [0.75, 0.85],   // session 8: darker bodies, dimmer UPPER lit edges (ref lit_frac 0.014 vs ours 0.04; g05 tested x0.7 / [0.55, 0.7])
    opacity: 2.5,                // cycle 3 round 2: 6 -> 2.5 (critic corevar A/B on the live module: ref10 / 5 / 2 +1.4 / +1.6 / +1.3)
    // cycle 3 round 2 (sky.js): hole floor (visible, edge search), rim at most rimPx output px wide, dark navy cores deep in
    // dense clumps (body x rgb, weight), interior lumps (amplitude, cell km, lit-band share), bicubic coverage map
    holeFill: [0.3, 0.75], rimPx: 5, core: [0.6, 0.8, 1.0, 1.0], inner: [0.15, 0.4, 0.5], mapCubic: 1,
    // h06 (1080p N16): fold 73.0 / 65.2 / 68.9 / 65.6 / 59.9 but ref 6 60.3 -> 54.9 (overhead peach reflection patches gone):
    // rimPx / cores / opacity 2.5 only below 12-22 deg elevation; above, opacity lowSky[2] (the round-1 6.0)
    lowSky: [12, 22, 6.0],
    lightStepKm: 0.22, lightAbsorb: 4.5,
    fadeKm: 300,                 // aerial fade of distant clouds into the clear sky near the horizon
    // display palette (research/refs.md 3.2)
    litLowGain: [0.7, 0.7],                       // cycle 4: scene-linear gain on litLow / litLowDim (critic cWisp: rim dL p90 34-45 -> 20-34 vs ref 21-28)
    litLow: '#FAA58D', litLowDim: '#E0857F',      // lit undersides at the sun-side edge / deeper in the band (fix round 1: #F99A82 -> #FAA58D)
    litHigh: '#BD8097', litHighDim: '#8E678B',    // lit edges, upper sky
    bodyLow: '#523454', bodyHigh: '#3C2C4A',      // shadowed bodies (#664462-#8A4F64 low, #493452-#5D3D5A high)
    bodyAnti: '#3A3657',                          // violet-grey bodies on the anti-sun side
    litAnti: '#6A5675',
    litTop: '#FEA070', litTopDim: '#B05A70', topGain: 1.3, topLoDeg: 15,   // overhead undersides are HDR (only ever seen reflected)                            // overhead undersides (reflected in ref 6: #B96175 -> #FEB97F)
    sunWidthDeg: 38,             // azimuth half-width of the warm lit side
    shadowLoKm: 0.2, shadowHiKm: 2.6,              // Earth-shadow terminator on the cloud layer (tangent-ray height)
    refractionDeg: 0.55,
  },

  // ------------------------------------------------------------------------------------------------ bakes / IBL
  bake: {
    viewScale: 1.0,              // per-frame view bake of sky+clouds, relative to the output size
    viewMargin: 0.08,            // extra field of view around the frame camera (motion blur, lens shear)
    reflScale: 0.5,              // mirror-camera bake + reflection RT, relative to the output size
    cubeSize: 512,               // sky+cloud cube (fallback, reflections from other cameras, PMREM source)
    envSize: 256,                // capture with terrain for the PMREM environment (captured every output frame)
    envPos: [0, 1.4, 0],         // where the environment is captured (world)
    envMirrorRefl: 0.85,         // lake reflectance applied to the env-only mirror copies of terrain / boulders
    // sizes by ctx.quality, applied unless options.world.bake sets them explicitly (create() reports them in info())
    byQuality: {
      preview: { reflScale: 0.5, cubeSize: 512, envSize: 256, viewScale: 1.0 },
      final: { reflScale: 1.0, cubeSize: 1024, envSize: 512, viewScale: 1.25 },
    },
  },

  // ------------------------------------------------------------------------------------------------ atmosphere
  haze: {
    // valley layer: dense, low, from startM; in-scatter = sky at elevDeg in the point's azimuth x phase x gain (navy)
    density: 6.0e-5, scaleHeight: 250, startM: 2500, gain: [0.40, 0.66, 0.90],   // fix round 1: ridges navy, not violet
    // distance layer: thin, high, only beyond start2M (the 30-40 km range washes to violet, 10-20 km ridges stay dark)
    density2: 5.0e-5, scaleHeight2: 2500, start2M: 16000, gain2: [0.76, 0.80, 0.94],
    elevDeg: 20, elevSunDeg: 10, valleyWarm: 1.0,  // in-scatter = sky at this elevation in the point's azimuth (lower = warmer, toward the sun)
    phase: 0.6, phaseWidthDeg: 21, phaseBase: 0.45,  // forward-scatter boost toward the sun
    farKm: 80,                   // beyond this the in-scatter blends to the sky directly behind
    antiTint: [0.6, 0.95, 1.2, 5],    // cycle 4: [0.75, 0.97, 1.1] -> [0.6, 0.95, 1.2] (critic c4m: massif red/blue 0.47 vs ref 0.22-0.35). cycle 3: cycle 3: navy in-scatter beyond |A| 5-30 deg (h03 'anti2': proxy +0.1; critic: massif #211F33 vs ref navy #0F1F44)
  },
  mist: {
    color: '#423E62',            // ref 10 low mist band #363457 (display)
    colorSun: '#4A4268',         // (fix round 1 tried #564C74 / 1.2e-3 / 25 m: the far water turned a flat violet band, -1.3..-2.2 on the low shots)
    density: 5.0e-4,             // 1/m in the layer
    height: 70,                  // m (e-folding)
    colorFadeHeight: 40, colorFadeTo: 1.0,   // the mist colour fades to x0.6 at 40 m height (ridge bases do not brighten)
    startM: 1500, fullM: 5000,   // the layer exists away from the piano only
  },

  // ------------------------------------------------------------------------------------------------ terrain
  terrain: {
    seed: 7,
    detail: 1.0,                 // multiplies the mesh resolution (0.5 for previews if needed)
    snowLine: 1100, snowFeather: 220, snowSlope: [0.50, 0.75], snowConcave: 2.5,
    rock: '#0B0D16',             // albedo-ish display colours are not used for rock: albedo in linear
    // cycle 4: far rock (beyond rockFarD 12-16 km) navy, on sun-facing faces only (1 - rockFarD[2]) of it (terrain.js uRockFar)
    rockFar: [0.05, 0.075, 0.14, 1.0], rockFarD: [12000, 16000, 0.5],
    // cycle 4: fractured snow faces (terrain.js uSnowBreak): rock outcrops / small snowfields in face coordinates: amount, scale (m),
    // rock threshold, crest weight (0 = off until the h08 A/B 'mBreak')
    snowBreak: [0.85, 120, 0.80, 0.25],   // h09 sb80 FOLDED (1080p N16: ref10 / ref2 / S01 +0.1 / -0.5 / +0.3 vs off; by eye navy rock with broken snowfields instead of the snow blanket, out/h09/sh_m10.png). h08 [0.8, 90, 0.62] = ~80 % rock (no snow left); thr 0.74 too little snow
    rockAlbedo: [0.09, 0.11, 0.12],          // fix round 1: near-neutral dark end (was 0.10/0.11/0.16 navy)
    areteJag: 0.0,                           // gendarmes / notches along every arete (fix round 2: 0.04 still made needle spires; 0)
    subSummits: 1,                           // 2-3 sub-summits per peak (fix round 2: 0 changed the plate composition: A 20-24 fell 1.5 deg; the crest smoothing removes their spires)
    // fix round 2 crest smoothing (terrain.js buildTerrainGeometry): within the top 'top' of the local relief (local max over
    // 'win' m) the height blends toward a 'radius' m low-pass (amount): smooth massive crests, no gendarme forests
    // cycle 3: mode 'open' = grayscale opening with an L1 cone of slope 'slope' (spikes steeper than the cone are cut to
    // straight-flanked points, apexes stay pointed) instead of the 160 m low-pass (mode 'lowpass': round domes, apex exp 2.4).
    // CPU apex (sandbox/world/tools/apex_cpu.py): massif main summit sharp 0.06 -> 0.20, apex exp 1.93 -> 1.27 (ref 0.15 / 1.29),
    // prom-weighted 1.82 -> 1.17 (ref 1.19), needles 0, summits within 0.02 deg
    // cycle 3 round 2: cone 'chamfer' = Euclidean cone (critic: the L1 cone printed ~14 evenly spaced teeth on flanks oblique
    // to the polar grid; 'l1' keeps the round-1 passes for A/B); the cut (blurred, 5-tap binomial) applies only where it
    // exceeds cutMin (m)
    // CPU (harness/skyline_cpu2.mjs + tools/teeth_cpu.py / apex_cpu.py, out/sky_c3r2*.json): L1 1.5 -> chamfer 1.75 + crestAA 1:
    // left-flank regular teeth run 6 -> 5 (chamfer 1.5 alone: 10), skyline hp 1.61 -> 1.39 (massif 1.61 -> 1.38), massif main
    // summit s 0.20 / e 1.27 -> 0.19 / 1.33 (ref 0.15 / 1.29), pexp_w 1.17 -> 1.23 (ref 1.19), summit 5.94 -> 5.89 deg; left /
    // central summits -0.09 / -0.10 deg (crestAA rounds the aretes over ~2 radial cells)
    crestSmooth: { on: 1, mode: 'open', cone: 'chamfer', slope: 1.75, chamferK: 48, cutMin: [1, 3], crestAA: 1.0, ridgeAA: [1, 2, 10], aaPasses: 1, win: 1200, radius: 160, top: 0.5, amount: 1.0, minH: 150, lift: 1 },
    // cycle 3 round 2: guard band of every patch edge that adjoins another patch (radial min(metres, frac x d), sideways deg)
    // + the inner-row weld over weldRows rows (critic: 19 km seam gap max 172 m, normal jump p90 43 deg, crest flag 0 -> 1)
    // cycle 4: ridgeAA = the crest AA also on every radially convex arete (weight, convexity 2-10 m), not only the top 50 % of the
    // local relief (CPU skyline_cpu2 + teeth_cpu, out/sky_c4.json: left flank teeth >= 1 px 17 -> 6, run 5 -> 2; summits unchanged)
    guard: { on: 1, metres: 2000, frac: 0.2, deg: 3, weldRows: 4 },   // lowpass mode: summit-preserving (lift): CPU skyline (tools/skyline_cpu.py) massif rough 5.6 -> 3.3 px, thin spires 12 -> 0, summits kept
    // cycle 3: mid-ground ridge layers (terrain.js makeHeightField), OFF until the GPU A/B (sandbox h05 'ridges'): two sloping
    // spurs at 6.5-7.5 km and two at 11.5-12.5 km framing a V toward the glow (A ~7), each descending to the water
    midRidges: { on: 0, features: [
      { kind: 'ridge', A0: -9, A1: 7, edge: 2, d: 6500, width: 1600, E: [[-9, 1.5], [-5, 1.2], [-1, 0.75], [3, 0.4], [7, 0.1]], rough: 0.35, scale: 600, oct: 6 },
      { kind: 'ridge', A0: 7, A1: 19, edge: 2, d: 7500, width: 1800, E: [[7, 0.1], [11, 0.45], [15, 0.9], [19, 1.4]], rough: 0.35, scale: 650, oct: 6 },
      { kind: 'ridge', A0: -6, A1: 9, edge: 2.5, d: 11500, width: 2400, E: [[-6, 1.7], [-1, 1.25], [4, 0.75], [9, 0.3]], rough: 0.3, scale: 900, oct: 6 },
      { kind: 'ridge', A0: 5, A1: 20, edge: 2.5, d: 12500, width: 2400, E: [[5, 0.3], [10, 0.8], [15, 1.3], [20, 1.8]], rough: 0.3, scale: 900, oct: 6 },
    ] },
    midMottle: [0.3, 150],                   // fix round 2: mid ridges 5-26 km: albedo +-30 % at ~150 m (3 fbm octaves; midbase hp 0.8 vs ref 2.2)
    streakPx: [5, 10],                       // fix round 2: fall-line streak octaves fade in from 5 to 10 px across (2-5 px = combed striation)
    peakVariety: 1,                          // per-peak profile / face slope / arete count + 2-3 sub-summits
    // erosion gullies in the GEOMETRY (session 7, terrain.js erosionAt): slope-aligned branching ribs / couloirs, octaves
    // lambda0 / 2^o, amplitude k x lambda x decay^o, faded where the mesh cannot resolve them across the slope
    // (cellA rad x r along the azimuth, cellR(r) x r radially: never finer than the patches) or where lambda > relief x h
    erosion: { on: 1, lambda0: 2400, octaves: 3, k: 0.045, decay: 0.6, sharp: 0.15, topFade: 0.25,   // fix round 2: sharp 0.35 -> 0.15, faded over the top 25 % of the relief
      minSlope: [0.05, 0.3], heightFade: [8, 80],   // session 8: k 0.12 grew a needle forest (g02a): 0.045 (g01k045), sharp 0.5 -> 0.35
      minDist: 900, relief: 4, cellA: 1.2e-3, cellR: [[0, 0.0185], [6000, 0.0185], [8000, 0.0037], [19000, 0.0037], [21000, 0.0029]],
      resolve: [4, 8], seed: 3 },
    gullySnow: [0.35, 0.35],                 // cycle 4: 0.6 -> 0.35 (critic: long high-contrast snow streaks = 'brush strokes'). erosion ribs -> rock, couloirs -> snow (effective-slope offsets)
    refineMarginDeg: 0.7,
    rockInSnow: [0.60, 160, 4, 0.6],         // cycle 4: strength 1.0 -> 0.6 (critic: streak contrast). rock ribs through the snow: threshold, rib scale (m), fall-line stretch, strength
    nearHill: [1.3, 0.5, 40, 0.8],           // near hills / headlands: albedo x1.3, mottling +-50 % at ~40 m, lit-face gain
    // alpenglow (session 6): direct light of the refracted low sun on the high ground (scene-linear irradiance x albedo),
    // reaching the ground from heights[0] to heights[1] above the Earth's-shadow terminator; rock gets x rock
    alpenglow: { color: [1.6, 0.9, 0.75], heights: [300, 1200], refractionDeg: 0.55, rock: 0.6, wrap: 0.7 },
    graniteAlbedo: [0.20, 0.20, 0.23], graniteTop: 25,   // pale granite only in the shore band (y < graniteTop m)
    // cycle 3 (critic: 'marbled melted wax', snow_over_sky 1.05 vs 1.45, massif grey-violet vs navy): no fall-line streaks in
    // the snow zone (planar 1), snow x1.4 on faces turned to the sun's azimuth / x0.75 turned away, rock in snow as contour
    // ledges (weight 0.6, period 45 m, threshold 0.55) instead of fall-line worms
    snowLook: [1.0, 1.4, 0.75, 0.6], snowLedge: [45, 0.55],
    // cycle 3 round 2: anti-sun faces beyond 5-8 km lit by the zenith / anti-sun sky (navy), shaded snow x0.7 there
    // (critic massifcol.py: rock #1F1E34 hue 243 sat 0.26 vs ref #0C1C3E; shaded snow hue 285 vs 224)
    antiAmbient: [0.45, 0.8, 1.6, 1.0], antiSnow: 0.7,   // cycle 4: [0.6, 0.8, 1.35] -> [0.45, 0.8, 1.6] (navy, less red on far anti-sun faces)
    snowAlbedo: [0.75, 0.88, 1.15], // art-directed (fix round 2: [1.0, 1.25, 2.0] = bright bluish frosting, massif p95 112 vs ref 65)
    irradianceGain: 1.0,
    darkFloor: [0.012, 0.012, 0.013],   // neutral floor radiance (pre-compensates the Neutral toe; see docs/WORLD.md)
    rimGain: 1.6,                // crest light from the glow side (x convexity)
    bumpNear: 90, bumpFar: 45,   // per-pixel detail-normal strength (< 9 km / far)
    aoStrength: 0.75,
    // Heights are given as ELEVATION ANGLES seen from the piano (E: [[A, deg]], converted with the feature distance),
    // read off the shared plate (refs 2/3/9/10 at 50 mm, glow column = A 0): see docs/WORLD.md.
    features: [
      // near headland on the left (rounded granite, boulders at its waterline): top ~2.2 deg at A -7 (ref 10 / 2)
      { kind: 'shore', A0: -75, A1: 4, edge: 5, shore: [[-75, 650], [-45, 850], [-25, 1050], [-8, 1250], [4, 1500]],
        H: [[-75, 95], [-45, 85], [-25, 80], [-12, 82], [-7, 76], [-4, 58], [-2, 36], [0, 16], [2, 6], [4, 2]], rise: 380, scale: 230 },
      // near hills and boulder shore on the right (shore 0.4-0.6 km, hills 2 km, top ~2.2 deg)
      { kind: 'shore', A0: 16, A1: 82, edge: 5, shore: [[16, 1000], [20, 600], [26, 450], [36, 430], [50, 470], [82, 620]],
        H: [[16, 8], [19, 20], [23, 40], [28, 55], [40, 62], [60, 80], [82, 120]], rise: 1400, scale: 320 },
      // generic shore + hills behind the cameras
      { kind: 'shore', A0: 78, A1: 290, edge: 8, shore: [[78, 650], [140, 750], [200, 800], [290, 700]],
        H: [[78, 140], [140, 110], [200, 90], [290, 100]], rise: 900, scale: 300 },
      // left dark peak (the sun sets behind it): summit 4.4 deg at A -3.7, 12 km, a straight-faced pyramid
      { kind: 'peak', A: -3.7, d: 12000, E: 4.5, R: 2600, rough: 0.30, scale: 900, oct: 7, facet: 0.28, p: 1.4 },
      // left dark chain (11.5-14.5 km, no snow): the serrated row left of the sun (refs 5, 10)
      { kind: 'chain', A0: -36, A1: -6, d0: 11500, d1: 14500, spacing: 3.0, E: [[-36, 3.8], [-24, 4.0], [-14, 4.1], [-8, 3.0], [-6, 2.6]], Rk: 2.4, seed: 1 },
      // low hazy chain at the far end of the lake (13-17 km)
      { kind: 'chain', A0: -1, A1: 24, d0: 13500, d1: 17500, spacing: 2.4, E: [[-1, 1.3], [5, 1.6], [10, 1.5], [16, 1.9], [24, 2.2]], eRange: [0.7, 1.0], Rk: 3.0, seed: 2 },
      // mid layer between them and the far range (20-26 km)
      { kind: 'chain', A0: 2, A1: 22, d0: 20000, d1: 26000, spacing: 2.6, E: [[2, 1.9], [10, 2.2], [16, 2.3], [22, 2.5]], eRange: [0.75, 1.0], Rk: 2.6, seed: 8 },
      // central far snowy range (30-40 km, heavily hazed): summits 3.0-4.05 deg + a serrated filler chain
      { kind: 'chain', A0: -8, A1: 30, d0: 29000, d1: 40000, spacing: 1.1, E: [[-8, 2.1], [0, 2.6], [8, 2.9], [16, 2.9], [24, 2.7], [30, 2.5]], eRange: [0.82, 1.0], Rk: 2.3, snow: true, seed: 5 },
      { kind: 'peak', A: 2.8, d: 33000, E: 3.0, R: 4300, rough: 0.28, scale: 1500, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 6.2, d: 37000, E: 3.45, R: 5000, rough: 0.28, scale: 1700, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 8.3, d: 34000, E: 3.95, R: 4900, rough: 0.28, scale: 1700, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 11.2, d: 38000, E: 3.6, R: 5100, rough: 0.28, scale: 1700, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 13.9, d: 35000, E: 4.05, R: 5200, rough: 0.28, scale: 1700, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 17.6, d: 33000, E: 3.45, R: 4400, rough: 0.28, scale: 1500, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      { kind: 'peak', A: 21.0, d: 36000, E: 2.9, R: 4300, rough: 0.28, scale: 1500, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [420, 0.05] },
      // cycle 4 (h08 gDet, critic: smooth faceted faces): the six snowy massif peaks rough 0.28 -> 0.38, ribs [420-460, 0.05] -> [250, 0.10]
      // right snowy massif: summit 5.8-5.9 deg at A +28.5, 20 km; satellites; a serrated snowy chain behind (19-24 km)
      { kind: 'peak', A: 28.5, d: 20000, E: 5.9, R: 4600, rough: 0.38, scale: 1500, oct: 7, snow: true, facet: 0.3, p: 1.45, ribs: [250, 0.10] },
      { kind: 'peak', A: 25.6, d: 21000, E: 4.6, R: 3300, rough: 0.38, scale: 1300, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [250, 0.10] },
      { kind: 'peak', A: 31.8, d: 19500, E: 5.1, R: 3500, rough: 0.38, scale: 1300, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [250, 0.10] },
      { kind: 'chain', A0: 18, A1: 64, d0: 19000, d1: 24500, spacing: 2.8, E: [[18, 2.8], [24, 3.6], [34, 4.2], [44, 4.6], [54, 4.2], [64, 3.8]], eRange: [0.75, 1.04], Rk: 2.3, snow: true, seed: 4 },
      // right dark peak in front of the massif (ref 10: A 24.7, 4.5 deg), ~9.5 km, rock (below the snow line)
      { kind: 'peak', A: 24.6, d: 9500, E: 4.45, R: 2000, rough: 0.30, scale: 700, oct: 7, facet: 0.3, p: 1.45 },
      // right mid chain between the near hills and the massif (7-10.5 km)
      { kind: 'chain', A0: 14, A1: 72, d0: 7000, d1: 10500, spacing: 3.2, E: [[14, 1.3], [19, 2.3], [28, 2.9], [40, 3.2], [55, 3.5], [72, 3.8]], eRange: [0.55, 0.85], Rk: 2.5, seed: 3 },   // session 6: lower (the finer mesh resolves the summits: they hid the massif)
      // left massif (ref 4: snowy peak ~6.5 deg at A -29) + its chain
      { kind: 'peak', A: -29, d: 15500, E: 6.3, R: 4300, rough: 0.38, scale: 1500, oct: 7, snow: true, facet: 0.3, p: 1.45, ribs: [250, 0.10] },
      { kind: 'peak', A: -38, d: 17000, E: 5.4, R: 3900, rough: 0.38, scale: 1500, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [250, 0.10] },
      { kind: 'peak', A: -20, d: 16000, E: 4.6, R: 3300, rough: 0.38, scale: 1400, oct: 7, snow: true, p: 1.45, facet: 0.3, ribs: [250, 0.10] },
      { kind: 'chain', A0: -80, A1: -12, d0: 15000, d1: 19500, spacing: 3.4, E: [[-80, 4.0], [-60, 4.6], [-45, 4.2], [-35, 4.4], [-25, 4.0], [-12, 3.0]], Rk: 2.4, snow: true, seed: 6 },
      // ring of mountains elsewhere (8-13 km, partial snow)
      { kind: 'chain', A0: 60, A1: 300, d0: 8000, d1: 13000, spacing: 5.0, E: [[60, 4.5], [80, 7.5], [110, 6.0], [140, 9.0], [170, 7.0], [200, 8.5], [230, 5.5], [260, 8.0], [300, 6.5]], Rk: 2.6, snow: true, seed: 7 },
    ],
    // polar mesh patches (azimuth range, distance range, resolution); disjoint, so nothing is drawn twice
    patches: [
      // session 6: rebalanced toward radial resolution (faces rising toward the camera were 10-20 px per triangle row:
      // smooth faceted pyramids); now ~3-4 px across and ~5-8 px up the faces at 1080p / 50 mm
      { A0: -55, A1: 68, d0: 330, d1: 6000, nA: 1800, nD: 160 },
      { A0: -55, A1: 68, d0: 6000, d1: 19000, nA: 1800, nD: 320 },
      { A0: -55, A1: 68, d0: 19000, d1: 52000, nA: 2000, nD: 360 },
      { A0: 68, A1: 305, d0: 330, d1: 30000, nA: 480, nD: 80, refine: 1 },
    ],
  },

  // ------------------------------------------------------------------------------------------------ boulders
  boulders: {
    seed: 11,
    // [A0, A1] azimuth window, [h0, h1] terrain height band (m) to place in, count, size range (m)
    zones: [
      { A0: 18, A1: 66, h0: -0.6, h1: 3.5, count: 320, size: [1.5, 8.0], dMin: 300, dMax: 1500 },
      { A0: -60, A1: 4, h0: -0.6, h1: 5.0, count: 220, size: [1.5, 8.0], dMin: 600, dMax: 2200 },
    ],
    // rock spits into the lake (refs 10 / 5): shore azimuth A, length into the lake, root extent behind the shore line,
    // half width at the root, bend, count, size range (m)
    spits: [
      { A: 27, len: 45, root: 15, width: 9, bend: 0.4, count: 70, size: [1.5, 8.0] },
      { A: 36, len: 28, root: 12, width: 7, bend: -0.5, count: 50, size: [1.5, 7.0] },
      { A: 44, len: 55, root: 15, width: 10, bend: 0.2, count: 70, size: [1.5, 8.0] },
      { A: -14, len: 30, root: 12, width: 8, bend: 0.3, count: 50, size: [1.5, 7.0] },
      { A: -31, len: 22, root: 10, width: 7, bend: -0.3, count: 40, size: [1.5, 6.0] },
    ],
    albedo: [0.20, 0.20, 0.22], albedoVar: 0.4,   // fix round 1: dark granite (0.42 read as a pale floating row), +-40 % per rock
    detail: 5,                   // icosahedron subdivision (1 = 80 triangles; fix round 2: 5 = 720 for the fractured rocks)
    // fix round 2: jagged fractured rock (boulders.js): 3-6 fracture planes at 0.5-0.85 of the radius, ridged relief, height / width 0.6-1.5
    fracture: { planes: [3, 6], offset: [0.5, 0.85], ridge: 0.10, squash: [0.6, 1.5] },
  },

  // ------------------------------------------------------------------------------------------------ water
  water: {
    size: 120000,                // plane extent (m)
    F0: 0.30,                    // Fresnel at normal incidence for shallow view rays (physical 0.02), exposed for look-dev
    F0High: 0.80, reflGainHigh: 1.0, highDepression: [12, 38],  // PER PIXEL by the view ray's depression (deg): steep views (refs 6, 1) see a far brighter mirror
    reflGain: 1.08, reflGainFar: 0.92,   // reflectance multiplier for low cameras, near / beyond the far-mirror range (s4: near water brighter, ref 10's far mirror unchanged)
    tint: [1.0, 0.94, 0.80], tintDark: [0.85, 1.0, 1.05],   // bright / dark reflections (dark: navy, refs 2/3/10 right side)    // the reflection is darker / more saturated than the sky (#D16A56 vs #FEC391)
    distortion: 1.0,
    roughNear: 0.004, roughFar: 0.0, roughDist: 60, lostRoughCap: [0.0015, 0.0], reflSharp: [5, 30, 0.15],   // fix round 2: cap 0.005 -> 0.0015; near reflected objects (depth D < 5-30 m) stay sharp (rough x0.15): the piano's mirror image was a grey smear
     // prefiltered glossy lobe (slope sigma); band-limited slope variance -> roughness, capped (near / beyond 300 m)
    // long gentle swell: [azimuth of travel (deg), wavelength (m), amplitude (m)]
    // fix round 1: amplitudes x2.7 (RMS slope 0.034, refs.md 0.02-0.05), directions spread +-35-45 deg about the view axis
    // of the plate cameras (A ~ 195 = toward them): lateral slope ~0.02 shifts the piano's reflection sideways per slab
    // cycle 4: the 1.9 / 1.25 / 0.85 m amplitudes x1.6 (critic wscale: mid-scale (1-6 px) std 12-16 vs refs 20-26)
    swell: [[195, 1.9, 0.00416], [211, 1.25, 0.00256], [177, 0.85, 0.00208], [224, 0.56, 0.0006], [187, 0.38, 0.0003], [166, 0.28, 0.0002]],
    depthEff: 0.15,               // effective depth (m) for the swell's and long rings' finite-depth dispersion
    glitter: 0.7, glitterK: 0.2, glitterFade: [80, 250],   // art-directed glow on wave faces reflecting e < 3.5 deg: near / mid water only
    farMirror: [12, 60, 0.8],      // Fresnel pushed toward 1 from 12 m to 60 m (x 0.8): the far lake is a near-perfect mirror
    // cycle 4: crest stretch 2.2 -> 4.5 (critic wscale: autocorrelation half-length x 5-13 px vs refs 17-23: crests 2-4x too short)
    chop: [0.04, 2.0, 3.3], chopFade: [150, 400],   // irregular wind-wave chop: slope, scale (m), crest stretch; fade (m). s4: 0.06 @ 0.6 m / 25-110 m -> 0.04 @ 2 m / 150-400 m (the refs' waves stay bold far out)
    swellFade: [1.5, 160],        // swell visible from ~1 m out to ~40-160 m; beyond: mirror
    farFadeHeight: [1.6, 2.4],    // cycle 4: [100, 200] (= off) -> [1.6, 2.4]: S23 (2.0-2.6 m) and ref 5 (2.7 m) get ref 5's calm far mirror; the low wides (0.1-1.4 m) keep their waves. camera height (m) over which the swell / chop far fades shrink to 25 m / 25-60 m (ref 5's calm mirror)
    // wavelets 0.15-0.6 m (fix round 1, the missing octave): RMS slope (3 octaves), longest wavelength, crest stretch,
    // fade start (m, out by 2x), travel azimuths of the octaves (deg)
    wavelets: { slope: 0.0, lambda: 0.6, stretch: 1.8, fade: 30, dirs: [207, 181, 168] },
    // wind micro-normals, per pixel: shallow view rays (< 12 deg) / steep (> 30 deg, ref 6: 5-10 cm cells that keep the
    // cloud reflections legible)
    // cycle 3 round 2: omegaMax caps the octaves' angular frequency (30 rad/s = 0.5 rad per 60 fps frame; the capillary
    // octaves were 40-77 rad/s = up to 74 deg of phase per frame: per-frame decorrelation of the near / ring-zone water)
    wind: { strength: 0.06, scale: 0.05, strengthDown: 0.12, scaleDown: 0.05, omegaMax: 30 },
    bandLimit: [1.5, 3.0],        // cycle 4: [1, 2] -> [1.5, 3] (critic: fine/mid std 0.71-1.06 vs refs 0.53-0.61: 1-px 'sequin' mosaic). band limit: fade from 2 to 1 px per wavelength (k x footprint / pi); removed variance -> roughness
    footprintAniso: 0.5,          // noise octaves band-limited by lat^(1-a) along^a (0.5: geometric mean, the c35 look; 1: along-view)
    // cycle 3 (critic round 1): short crests (far water: scan lines -> dashes with calm patches; lateral scale m, amount,
    // fade-in m, wind share), reflection floor from above (x zenith colour from 18 deg depression: no black ink blotches),
    // ring gain for grazing views (ref 5 / ref 3 rings), ring slope clamp for steep views (clip x0.5, amplitude x0.6)
    shortCrest: [1.0, 1.0, 15, 0.5], reflFloor: [0.4, 18], ringLow: 1.6, ringSteep: [0.5, 0.6],
    // cycle 3 round 2: near reflected objects (the piano: D < 3-8 m) take 0.5 x the slope for the lookup and, in low views,
    // occlude the lit bed down to 0.12 (critic reflbox L<20 0.07 vs ref 0.34); reflection gain x1.2 toward the sun (|A| ~25)
    nearRefl: [0.5, 3, 8, 0.12], sunSide: [1.35, 25],   // cycle 4: sunSide 1.2 -> 1.35, tint [0.96, 0.86, 0.93] -> [1.0, 0.94, 0.80] (critic wTint / wWarm GPU A/B: top-10 % hue 18 -> 22, pink share 0.41 -> 0.35); wind 0.12 -> 0.06, reflFloor 0.6 -> 0.4 (troughs)
    // concentric ring packets: radial envelope 1/sqrt(1 + r / nearRadius) x exp(-r / fieldRadius), soft slope clip,
    // fade-out over the last 3 s of maxAge; at most maxEvents, picked by visible contribution; same-source onsets
    // within mergeDt s are merged
    ring: { maxEvents: 40, damping: 0.020, kBand: 0.60, maxAge: 16, fieldRadius: 8, nearRadius: 0.8, slopeClip: 0.12, mergeDt: 0.1 },
    // default ring events when the integrator provides none: one every period s, half from the lyre, the rest from the legs
    defaultEvents: { period: 0.6, wavelength: [0.09, 0.15], amplitude: 0.0035, jitter: 0.25, lyreShare: 0.5 },
    // long ring swells (bass downbeats / pedal): the flat concentric ellipses of the low shots (refs 2, 3, 4)
    defaultLongEvents: { period: 2.6, wavelength: [0.35, 0.75], amplitude: 0.0060, jitter: 0.3, lyreShare: 0.7 },
    // performance-driven rings (index.js rippleEventsFromPerf; docs/WORLD.md section 1): perf.json ripples (rig frame,
    // amp 0.15-1.2 mm) x gain; lyre / leg events >= longAmp also launch a long ring; the default stream above stays at
    // x background between phrases
    perfRipples: { use: true, gain: 6, longAmp: 0.0005, longGain: 1.6, background: 0.6, shortLambda: [0.09, 0.15], footLambda: [0.07, 0.10], longLambda: [0.35, 0.75] },
    microAmp: 0.00035, microLambda: 0.035, microRadius: 0.4,
    // lake bed seen through the shallow water
    depthAtPiano: 0.04, depthSlope: 0.013, depthMax: 0.6,
    absorb: [9.0, 5.5, 4.2],     // Beer-Lambert (1/m)
    bedAlbedo: [0.15, 0.14, 0.14], bedVar: 0.7, pebbleSize: 0.045,
    bedGain: 3.0, bedOccMin: 0.4,   // art-directed: ref 6 shows the pebbles under the piano clearly
    deep: '#0A0A12',             // colour of the water body itself when nothing is reflected (display)
  },
};

/** deep merge (plain objects only; arrays are replaced) */
export function mergeParams(base, over) {
  if (!over) return structuredClone(base);
  const out = structuredClone(base);
  const rec = (a, b) => {
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) rec(a[k], b[k]);
      else a[k] = structuredClone(b[k]);
    }
  };
  rec(out, over);
  return out;
}
