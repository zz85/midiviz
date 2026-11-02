// The path-traced pianist (#045) as a module: #032's pianist at the concert
// grand on three.js r187, with three-gpu-pathtracer and MuTracer for stills and
// video (see README.md). 045_pathtracer.html is the page; #049 and #050 boot
// the same app with a plugin that draws the score over it (sheet/).
//
//   import { boot } from './pathtrace/app.js'
//   boot({ title, href, defaultSong, onReady(app), onSong(song, midi, app), onFrame(t, app), overlay(g, w, h, t) })
//
// The page needs, before this module: the import map (three, three/addons/,
// @pixiv/three-vrm), playback_controls.js and tonejs-midi.js as classic
// scripts, and pathtrace/app.css. boot() writes the markup (shell.js) into the body.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { SoundFontEngine, MidiScheduler } from '../soundfont-engine/src/index.js'
import { midiToSchedule } from '../notation3d/midi-score.js'
import { exportVideo, exportSupported, defaultBitrate } from '../notation3d/video-export.js'
import { installAcoustics, offlineHall, acousticParams, rt60Of, ROOMS, SEATS } from '../concertstage/acoustics.js'
import { buildGrandPiano, LOW, HIGH, DIM, FINISHES } from '../concertstage/concert-grand.js'
import { buildCandleChamber, candleEnvironment, CANDLE } from '../pathtrace/candle-chamber.js'
import { createLessonView, LESSON_VIEWS } from '../pianist/lesson.js'
import { loadCharacter } from '../pianist/character.js'
import { loadAltCharacter, MODELS } from '../pianist/alt-model.js'
import { createRig } from '../pianist/rig.js'
import { createHair } from '../pianist/hair.js'
import { createDress } from '../pianist/dress.js'
import { createMeshHair } from '../pianist/hair-mesh.js'
import { createShoes } from '../pianist/shoes.js'
import { createLook } from '../pianist/look.js'
import { createCommunity, communityList } from '../pianist/community.js'
import { createSmoother } from '../pianist/subdivide.js'
import { createDirector, SPOTS, PORTRAIT, spotFor, MOVES, FRAME_LABELS, SIZES, spotKind, STRINGS_LEVELS } from '../pianist/director.js'
import { hideBody } from '../pianist/shell.js'
import { suggestClips, snapStart, snapEnd, clipOf, shortDescription, SHORT_MAX, SHORT_LENGTHS, SHORT_DEFAULT } from '../pianist/shorts.js'
import { createPathTraceStills } from '../pathtrace/still.js'
import { pathTracedFrames } from '../pathtrace/video.js'
import { createFrameSpace, LANDSCAPE_PLACES, portraitPlaces } from '../pianist/frame-space.js'
import { createFocusPuller, SHOT_DOF } from '../pianist/focus-puller.js'
import { createLinerLibrary, clockOfMidi, buildTimeline, toVTT, toChapters, titleScreen, withTitle, titleSecs, layoutClip } from '../liner/liner.js'
import { createLinerOverlay, drawLinerCaption, drawIntertitle, loadIntertitleFonts, INTERTITLE_STYLES, INTERTITLE_THEMES, INTERTITLE_POSITIONS } from '../liner/overlay.js'
import { SHELL } from './shell.js'
import { assignHands, handModeOf, HAND_MODES } from '../fingering/hands.js'

export async function boot(plug = {}) {
    document.body.insertAdjacentHTML('afterbegin', SHELL)
    if (plug.title) { const a = document.querySelector('#title a'); a.textContent = plug.title; if (plug.href) a.href = plug.href }
    // what a plugin (plug) sees of the page: read when it calls, so it may hold it from onReady on
    const app = {
      get $() { return $ }, get params() { return params }, get song() { return song }, get songFile() { return songFile },
      get playing() { return !!scheduler?.playing }, get exporting() { return exporting }, get renderer() { return renderer }, get camera() { return camera }, get scene() { return scene },
      // keep controls of its own in the address bar and shared links: [key, element id], as STATE
      addState: (...e) => STATE.push(...e),
      // where the pianist and the piano are in the frame (pianist/frame-space.js): the place of
      // `places` ({ name: { u0, v0, u1, v1 } }, frame fractions) they fill least, `prefer` unless another is
      // emptier by `margin`; the scores of every place beside it
      pickPlace: (places, prefer, margin) => frameSpace.pick(camera, places, prefer, margin),
      // hold a part of the frame (fractions) so intertitles placed automatically keep off it; null frees it
      reserve: r => { reserved = r },
      songNow: () => songNow(), seekTo: t => seekTo(t), setStatus: (...a) => setStatus(...a), closePops: () => closePops(),
      // a section of controls in Visuals, first (after Restore all defaults) or last
      addVisuals(html, { first = false } = {}) { first ? $('resetAll').insertAdjacentHTML('afterend', html) : $('visualsPop').insertAdjacentHTML('beforeend', html) },
    }
    window.__app = app
    const $ = id => document.getElementById(id)
    const params = new URLSearchParams(location.search)
    // phones and tablets (a coarse pointer) take the light path unless ?q=high
    // touch screens get the phone layout (?touch=1 / 0 to force it)
    // offline cache and install (sw.js): assets once, code fresh (?sw=0 to skip)
    if ('serviceWorker' in navigator && !params.has('shot') && params.get('sw') !== '0') navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker', e))
    // (only 0 / 1: the finger-touch setting also lives in ?touch=fall|press)
    const TOUCH = { 1: true, 0: false }[params.get('touch')] ?? matchMedia('(pointer: coarse)').matches
    document.body.classList.toggle('touch', TOUCH)
    const LOWQ = params.get('q') === 'low' || (params.get('q') !== 'high' && matchMedia('(pointer: coarse)').matches)
    const vendorPath = new URL('../vendor', import.meta.url).href
    let statusTimer = 0
    function setStatus(msg, isError = false, ms = 0) {
      const el = $('status'); el.textContent = msg || ''
      el.classList.toggle('hidden', !msg); el.classList.toggle('error', isError)
      clearTimeout(statusTimer); if (ms) statusTimer = setTimeout(() => setStatus(''), ms)
    }

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') })
    renderer.setPixelRatio(Math.min(devicePixelRatio, LOWQ ? 1 : 2))
    renderer.setSize(innerWidth, innerHeight)
    renderer.toneMapping = THREE.AgXToneMapping
    renderer.shadowMap.enabled = true
    // PCF, not VSM: from r17x three.js keeps a VSM's depth and depth squared in
    // half floats, which is too coarse for the spot's 250-1000 cm depth range: the
    // variance test then draws dark contour bands across her skin and specks on
    // the plate. #032 (r170) packed them into 8-bit RGBA at full precision.
    // ?shadows=vsm brings it back to compare.
    renderer.shadowMap.type = new URLSearchParams(location.search).get('shadows') === 'vsm' ? THREE.VSMShadowMap : THREE.PCFShadowMap
    document.body.prepend(renderer.domElement)
    RectAreaLightUniformsLib.init()
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 2, 6000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.08
    controls.minDistance = 10; controls.maxDistance = 1400

    // ── Piano and stage ──────────────────────────────────────────────────
    const piano = buildGrandPiano({ mirror: LOWQ ? false : { width: 1600, height: 900 } })
    scene.add(piano.root)
    piano.setFinish('ebony'); piano.setLid('full')
    // the lesson view (falling notes) for the hands half of a stacked Short
    const lesson = createLessonView({ piano, DIM, LOW, HIGH })
    scene.add(lesson.group)
    if (piano.mirror) piano.mirror.material.uniforms.strength.value = 0.55
    // her bench, moved in to fit a 165 cm pianist
    piano.bench.position.z = 47
    const SEAT_Y = 55.4

    const floorMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1512, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 })
    {
      const fc = document.createElement('canvas'); fc.width = fc.height = 256
      const fg = fc.getContext('2d'), gr = fg.createRadialGradient(128, 128, 10, 128, 128, 128)
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#777'); gr.addColorStop(1, '#000'); fg.fillStyle = gr; fg.fillRect(0, 0, 256, 256)
      floorMat.alphaMap = new THREE.CanvasTexture(fc); floorMat.transparent = true
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(800, 96), floorMat)
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -40); floor.receiveShadow = true
    scene.add(floor)

    // Lights (after Concert Creator): a warm spot from high behind her left
    // shoulder lights her hair, shoulders and the keys; a softer key from
    // above the music desk shapes the face; a back light rims the hair and the
    // lid; the open lid bounces warm light onto the plate.
    const spot = new THREE.SpotLight(0xffd2a0, 7, 0, 0.3, 0.8, 0)
    spot.position.set(-170, 520, 260); spot.target.position.set(0, 85, 10)
    spot.castShadow = true
    spot.shadow.mapSize.set(LOWQ ? 2048 : 4096, LOWQ ? 2048 : 4096)
    spot.shadow.camera.near = 250; spot.shadow.camera.far = 1000
    spot.shadow.bias = -0.0002; spot.shadow.normalBias = 0.06; spot.shadow.radius = 5; spot.shadow.blurSamples = 12
    scene.add(spot, spot.target)
    const faceKey = new THREE.SpotLight(0xffd9b8, 2.2, 0, 0.32, 0.9, 0)
    faceKey.position.set(60, 330, -140); faceKey.target.position.set(0, 120, 30)
    faceKey.castShadow = true; faceKey.shadow.mapSize.set(1024, 1024); faceKey.shadow.bias = -0.0003; faceKey.shadow.normalBias = 0.05; faceKey.shadow.radius = 6
    scene.add(faceKey, faceKey.target)
    const rim = new THREE.SpotLight(0xffe6c8, 6, 0, 0.25, 0.9, 0)
    rim.position.set(-60, 300, 380); rim.target.position.set(0, 125, 35)
    scene.add(rim, rim.target)
    const back = new THREE.SpotLight(0xffe2c0, 4, 0, 0.42, 0.9, 0)
    back.position.set(120, 460, -560); back.target.position.set(-10, 95, -80)
    scene.add(back, back.target)
    const lidLight = new THREE.RectAreaLight(0xffc28a, 0.55, 120, 150)
    lidLight.position.set(76, -1.5, -115); lidLight.rotation.x = -Math.PI / 2
    piano.lid.add(lidLight)
    const keyFill = new THREE.SpotLight(0xfff0e0, 0.8, 0, 0.5, 1, 0)
    keyFill.position.set(40, 260, 320); keyFill.target.position.set(0, 74, -10)
    scene.add(keyFill, keyFill.target)
    const LIGHTS = [[spot, 4.2], [faceKey, 1.6], [rim, 4], [back, 4], [keyFill, 0.8], [lidLight, 0.55]]
    // each stage's colours and strengths for these six (the candle chamber after
    // #030's candle rig: its key / back / fill / lid against its concert rig, the
    // face key and rim warmed to match)
    const STAGE_LIGHTS = {
      stage: [[0xffd2a0, 1], [0xffd9b8, 1], [0xffe6c8, 1], [0xffe2c0, 1], [0xfff0e0, 1], [0xffc28a, 1]],
      candle: ((L, C) => [[L.key.color, L.key.intensity / C.key], [0xffc890, 0.85], [0xffb070, 0.8], [L.back.color, L.back.intensity / C.back], [L.fill.color, L.fill.intensity / C.fill], [L.lid.color, L.lid.intensity / C.lid]])(CANDLE.lights, CANDLE.concert),
    }
    const applyLight = () => {
      const k = +$('light').value, look = STAGE_LIGHTS[$('stageSet').value] || STAGE_LIGHTS.stage
      LIGHTS.forEach(([l, i], j) => { l.color.setHex(look[j][0]); l.intensity = i * look[j][1] * k })
    }
    $('light').oninput = applyLight
    applyLight()
    $('exposure').oninput = () => { renderer.toneMappingExposure = +$('exposure').value }

    const pmrem = new THREE.PMREMGenerator(renderer)
    // the reflections: a few glowing panels around the stage, prefiltered for the
    // page; envScene is the panels themselves (#045: the path tracers ray cast them
    // into an equirect map). Black stage: our own; the candle chamber's from #030
    let envScene
    const ENVS = {}
    function stageEnvironment(name) {
      if (!ENVS[name]) {
        if (name === 'stage') {
          const s = new THREE.Scene(); s.background = new THREE.Color(0x010101)
          const box = (w, h, p, k, c = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 90, 0); s.add(m) }
          box(260, 260, [-200, 640, 300], 8, 0xffcf9a)
          box(900, 140, [0, 650, -150], 0.8, 0xffd7a8)
          box(60, 500, [-900, 300, -300], 2, 0xffbf80)
          box(60, 500, [900, 260, -100], 1.4, 0xffc890)
          box(700, 220, [150, 420, -900], 2, 0xffe2c0)
          box(1400, 300, [0, 120, 1100], 0.1, 0x8fa6c8)
          ENVS[name] = { scene: s, map: pmrem.fromScene(s, 0.015, 1, 6000).texture, intensity: 0.55 }
        } else {
          const e = candleEnvironment(THREE)
          // (the page's 0.55 against #030's 0.7 for the black stage, kept in proportion)
          ENVS[name] = { scene: e.scene, map: pmrem.fromScene(e.scene, e.sigma, 1, e.far).texture, intensity: 0.55 * CANDLE.environmentIntensity / CANDLE.stageEnvironmentIntensity }
        }
      }
      const E = ENVS[name]
      envScene = E.scene; scene.environment = E.map; scene.environmentIntensity = E.intensity
    }
    stageEnvironment('stage')

    // Stage, piano finish and lid (Visuals → Stage). The candle chamber's set
    // (pathtrace/candle-chamber.js, from #030: wall, arches, ~200 candles,
    // sconces with their own small lights) is built the first time it is chosen
    const STAGE_LOOK = { stage: { background: 0x000000, floor: 0x1a1512 }, candle: { background: CANDLE.background, floor: 0x180d08, props: 'candle' } }
    const stageProps = {}
    function setStage(name) {
      if (!STAGE_LOOK[name]) name = 'stage'
      $('stageSet').value = name
      stageEnvironment(name)
      scene.background.setHex(STAGE_LOOK[name].background)
      floorMat.color.setHex(STAGE_LOOK[name].floor)
      const want = STAGE_LOOK[name].props
      if (want && !stageProps[want]) { stageProps[want] = buildCandleChamber(THREE, LOWQ); scene.add(stageProps[want].root) }
      for (const [k, p] of Object.entries(stageProps)) p.root.visible = k === want
      applyLight()
    }
    $('stageSet').onchange = () => setStage($('stageSet').value)
    for (const [k, f] of Object.entries(FINISHES)) $('finish').add(new Option(f.label, k))
    $('finish').value = 'ebony'
    $('finish').onchange = () => piano.setFinish($('finish').value)
    // (the lid goes straight to its new angle, so a link or an export starts with it there)
    const setLid = mode => {
      piano.setLid(mode); lidLight.visible = mode !== 'closed'
      for (let i = 0; i < 120; i++) piano.update(0.05)
    }
    $('lid').onchange = () => setLid($('lid').value)
    // ── The pianist ──────────────────────────────────────────────────────
    setStatus('Loading the pianist…')
    // ?model=quaternius|vrm: another rigged model (pianist/alt-model.js) with
    // its own clothes and hair; the wardrobe below is MakeHuman's only
    for (const [k, m] of Object.entries(MODELS)) $('model').appendChild(new Option(m.label, k))
    let ALT = MODELS[params.get('model')] ? params.get('model') : ''
    $('model').value = ALT
    $('model').onchange = () => { const q = new URLSearchParams(location.search); if ($('model').value) q.set('model', $('model').value); else q.delete('model'); location.search = q.toString() }
    let ch = null
    if (ALT) try { ch = await loadAltCharacter(ALT, new URL('../pianist/assets/', import.meta.url).href) }
    catch (e) { console.error(e); setStatus(`Could not load ${MODELS[ALT].label} (${e.message}): see pianist/README.md`, true, 8000) }
    if (!ch) { ALT = ''; $('model').value = ''; ch = await loadCharacter(new URL('../pianist/assets/', import.meta.url).href) }
    scene.add(ch.group)
    if (ALT) {
      // the wardrobe fields (Look … up to Pose) are MakeHuman's: hide them
      document.body.classList.add('altmodel')
      for (let el = $('model').closest('.field').nextElementSibling; el && !(el.classList.contains('sect') && el.textContent === 'Pose'); el = el.nextElementSibling) if (!el.querySelector('#smooth')) el.style.display = 'none'
      // a model with a concert dress (alt-model.js MODELS[].dress): its colour menu and the skirt simulation
      if (ch.dress) {
        $('vdressField').style.display = ''
        $('clothSim').closest('label').style.display = ''
        if (params.has('vdress') && [...$('vdress').options].some(o => o.value === params.get('vdress'))) $('vdress').value = params.get('vdress')
        ch.dress.set($('vdress').value)
        ch.dress.simulate = params.get('clothsim') !== '0'
        $('vdress').onchange = () => ch.dress.set($('vdress').value)
        // the bench top for the skirt to rest on (re-read every frame: the bench moves with Bench distance / height)
        const benchBox = new THREE.Box3()
        Object.defineProperty(ch.dress, 'bench', { get: () => (piano.bench.updateMatrixWorld(true), benchBox.setFromObject(piano.bench)) })
      }
      // Smooth subdivides the model's own meshes (its default from MODELS)
      if (!params.has('smooth') && MODELS[ALT].smooth != null) $('smooth').value = String(MODELS[ALT].smooth)
      ch.smoothFrom = () => +$('smooth').value
    }
    const SEAT = new THREE.Vector3(0, SEAT_Y + 8.6, 44)
    const rig = createRig(ch, { seat: SEAT })
    ch.attachRig?.(rig)
    rig.update(0, 1 / 60)
    ch.group.updateMatrixWorld(true)
    // community styles (MakeHuman community repository) join the menus,
    // grouped and with plain names (their titles are the authors')
    const COMMUNITY_MENU = {
      // dresses that cover the shoulders (sleeves or a high, wide neck)
      covered: ['Covered shoulders and sleeves', { c563: 'Puff-shoulder dress · long sleeves', c533: 'Qipao · long', c857: 'Qipao · knee length', c1613: 'Keyhole-neck dress', c1515: 'Sixties shift dress', c1517: 'Fashion dress', c1424: 'Velvet evening gown', c806: 'Evening gown', c1640: 'Tiered-skirt dress', c1724: 'Shift dress', c411: 'Tube dress' }],
      // short and fitted, often sequinned, worn with high heels
      cocktail: ['Short and fitted (cocktail)', { c2802: 'Sequin bodycon mini', c141: 'Mini dress', c151: 'Mini dress II', c379: 'Black cocktail dress', c1419: 'Long evening gown' }],
      sleeveless: ['Sleeveless and halter', { c1422: 'Knit dress (F Dress 08)', c1853: 'Halter dress · knee length', c1854: 'Halter dress · below the knee', c1922: 'Halter dress · flared (poor seated fit)' }],
      top: ['Tops and T-shirts + our skirt', { c894: 'T-shirt', c3508: 'T-shirt II', c1203: 'T-shirt · tucked', c416: 'Loose T-shirt', c1642: 'Turtleneck halter top', c3471: 'Sleeveless turtleneck' }],
      hair: ['Community hair (mesh)', { c1471: 'Long, shaggy layers', c2816: 'Long · Hazel', c1859: 'Long · Daisy', c1862: 'Long, side part', c482: 'Long, layered', c492: 'Long, wavy', c572: 'Medium', c1669: 'Blunt bob', c1673: 'Inverted bob', c3694: 'Bob II', c2001: 'Fifties updo', c2177: 'Braided bun', c2477: 'Bun with a velvet tie', c3542: 'Messy bun' }],
      shoes: ['Community shoes', { c1694: 'Stiletto booties', c1822: 'Pumps', c1039: 'Peep-toe pumps' }],
    }
    {
      const have = new Map(communityList(ch).map(e => [e.key, e]))
      const add = (sel, group) => {
        const [label, items] = COMMUNITY_MENU[group]
        const og = document.createElement('optgroup'); og.label = label
        for (const [k, title] of Object.entries(items)) { const e = have.get(k); if (!e) continue; have.delete(k); og.appendChild(new Option(`${title} · ${e.license}`, k)) }
        if (og.children.length) $(sel).appendChild(og)
      }
      for (const g of ['covered', 'cocktail', 'sleeveless', 'top']) add('dressStyle', g)
      add('hairStyle', 'hair'); add('shoeStyle', 'shoes')
      // anything new in the build the menu does not list yet
      // (trousers and skirts are worn under a top: #047's Bottom rail, not here)
      for (const e of have.values()) if (e.kind !== 'bottom') $(e.kind === 'hair' ? 'hairStyle' : e.kind === 'shoes' ? 'shoeStyle' : 'dressStyle').appendChild(new Option(`${e.title} · ${e.license}`, e.key))
    }
    // outfits: a dress, fabric, colour, shoes and hair in one go
    const OUTFITS = {
      reference: { dress: 'knee-fitted', fabric: 'made', color: '#8e1d1b', shoes: 'flats', hair: 'halfup', hairColor: '#5a3e2a' },
      'sequin-mini': { dress: 'c2802', fabric: 'sequin', color: '#b8b0a4', shoes: 'c1694', hair: 'c2816', hairColor: '#1c1410' },
      'sequin-gown': { dress: 'gown-fitted', fabric: 'sequin', color: '#1d4f86', shoes: 'c1694', hair: 'c2816', hairColor: '#1c1410' },
      covered: { dress: 'knee-fitted-long', fabric: 'made', color: '#20242e', shoes: 'flats', hair: 'c2177', hairColor: '#4a3324' },
      tee: { dress: 'c894', fabric: 'made', color: '#e9e4da', shoes: 'flats', hair: 'long01', hairColor: '#312d2b' },
      // long hair (mesh hair simulated as cloth) and our simulated gown, slits from the knee
      'braid-halter': { dress: 'gown-cloth', slit: 'knee', fabric: 'satin', color: '#e6d2ae', shoes: 'c1822', hair: 'braid01', hairColor: '#4a2f1f' },
      'ponytail-qipao': { dress: 'gown-cloth-qipao', slit: 'knee', fabric: 'satin', color: '#9b1b25', trim: '#d4ae5a', shoes: 'c1822', hair: 'ponytail01', hairColor: '#17110d' },
      'braid-qipao': { dress: 'gown-fitted-qipao', slit: 'knee', fabric: 'satin', color: '#efe6d6', trim: '#1f2a44', shoes: 'flats', hair: 'braid01', hairColor: '#68422c' },
      // bobs
      'shift-long': { dress: 'c1724', fabric: 'made', color: '#e4a9a0', shoes: 'flats', hair: 'long01', hairColor: '#4a2f1f' },
      'bob-bodycon': { dress: 'c2802', fabric: 'sequin', color: '#c9a24a', shoes: 'c1822', hair: 'c3694', hairColor: '#3b2618' },
      'bob-cocktail': { dress: 'c379', fabric: 'satin', color: '#121214', shoes: 'c1039', hair: 'c2001', hairColor: '#7a3b22' },
      'bob-tee': { dress: 'c894', fabric: 'made', color: '#f2efe9', shoes: 'flats', hair: 'c3694', hairColor: '#d9c7a3' },
      'bob-turtleneck': { dress: 'c3471', fabric: 'made', color: '#1b1b1e', shoes: 'flats', hair: 'c3694', hairColor: '#514f4d' },
      // evening gowns: long hair worn loose, and a fifties updo
      'long-gown': { dress: 'c806', fabric: 'velvet', color: '#c8102e', shoes: 'c1822', hair: 'c2001', hairColor: '#d1b27a' },
      'updo-gown': { dress: 'c1424', fabric: 'satin', color: '#ff1dce', shoes: 'c1822', hair: 'ponytail01', hairColor: '#d1b27a' },   // (velvet greys this gown out)
    }
    // the qipao's contrast trim (an outfit's; otherwise a deep shade of the dress)
    let trimColor = null
    // (old links: yuja-mini / yuja-gown)
    if (/^yuja-/.test(params.get('outfit'))) params.set('outfit', params.get('outfit').replace('yuja-', 'sequin-'))
    // (renamed: they have long hair now)
    { const RENAMED = { 'bob-gown': 'long-gown', 'bob-shift': 'shift-long' }; if (RENAMED[params.get('outfit')]) params.set('outfit', RENAMED[params.get('outfit')]) }
    // no wardrobe in the link: preset 1 (the first featured outfit)
    const DEFAULT_OUTFIT = 'bob-tee'
    if (!['outfit', 'dress', 'hair', 'fabric', 'shoes', 'dcol', 'hcol'].some(k => params.has(k))) params.set('outfit', DEFAULT_OUTFIT)
    if (OUTFITS[params.get('outfit')]) {
      const o = OUTFITS[params.get('outfit')]; $('outfit').value = params.get('outfit')
      $('dressStyle').value = o.dress; $('fabric').value = o.fabric; $('dressColor').value = o.color
      $('shoeStyle').value = o.shoes; $('hairStyle').value = o.hair; $('hairColor').value = o.hairColor
      $('slit').value = o.slit || 'calf'; trimColor = o.trim || null
    } else $('outfit').value = ''   // (a custom wardrobe from the link)
    // wardrobe: ?hair=…&dress=…&look=… (or the Visuals menu)
    for (const [k, id] of [['fabric', 'fabric'], ['hair', 'hairStyle'], ['dress', 'dressStyle'], ['shoes', 'shoeStyle'], ['look', 'look'], ['smooth', 'smooth'], ['simplify', 'simplify']]) if (params.get(k)) $(id).value = params.get(k).replace(/^midi-/, 'knee-')   // (old links: "midi" is now "knee")
    if (!$('dressStyle').value) $('dressStyle').value = 'knee-fitted'
    let hair = null, dress = null
    let shoes = null, shoeJob = 0
    async function setShoes(v) {
      if (ALT) { shoes = { object: new THREE.Group(), kind: 'none', update() {}, dispose() {}, settle() {}, setColor() {}, setFabric() {} }; return }
      const job = ++shoeJob
      const next = v === 'none' ? { object: Object.assign(new THREE.Group(), { name: 'barefoot' }), update() {}, dispose() {} }
        : v === 'flats' || !v ? createShoes(ch) : await createCommunity(ch, v, { color: '#151214' })   // (black: their textures vary)
      if (job !== shoeJob) { next.dispose?.(); return }
      shoes?.dispose?.(); shoes?.object.removeFromParent()
      shoes = next
      scene.add(shoes.object)
      shoes.object.visible = !params.get('hide')?.split(',').includes('shoes')
      if (window.__pianist) window.__pianist.shoes = shoes
      applyLook()
    }
    const look = ALT ? { apply() {}, update() {} } : createLook(ch)
    const smoother = ALT ? { apply() {}, update() {} } : createSmoother(ch)
    // geometry first (the cel outlines are built on whatever geometry is shown)
    function showSimplify() {
      const v = +$('simplify').value, n = smoother.cageTris
      $('simplifyV').textContent = v ? `${v} cm${n ? ` · ${n.toLocaleString()} tris` : ''}` : 'off'
    }
    const applyLook = () => { if (ALT) return;  look.apply('realistic', [dress?.object, shoes?.object]); smoother.apply(+$('smooth').value, [dress?.object, shoes?.object], +$('simplify').value); showSimplify(); look.apply($('look').value, [dress?.object]) }
    async function setHair(style) {
      if (ALT) { hair = { object: new THREE.Group(), kind: 'none', update() {}, dispose() {}, settle() {}, setColor() {}, setFabric() {} }; return }
      const color = $('hairColor').value
      hair?.dispose()
      hair = style === 'halfup' || style === 'updo'
        ? createHair(ch, rig, { density: +$('hairDensity').value, color, style })
        : style[0] === 'c' ? await createCommunity(ch, style, { color })
        : await createMeshHair(ch, style, { color })
      scene.add(hair.object)
      hair.object.visible = $('hairOn').checked
      hair.simulate = $('hairSim').checked
      if (hair.kind === 'strands') hair.settle(style === 'halfup' ? 2 : 0.05)
      if (window.__pianist) window.__pianist.hair = hair
      applyLook()
    }
    // Modesty while dressing: a new dress is built (its files fetched) with
    // the old one still on, and only then swapped in. Whenever nothing would
    // cover her — the first load, a failed load, the dress turned off — the
    // body (every skin mesh, the smooth one too) stays hidden.
    const skinMeshes = () => { const l = []; ch.group.traverse(o => { if (o.isMesh && (o.material === ch.materials.skin || o.userData.origMat === ch.materials.skin || o.name === 'body')) l.push(o) }); return l }
    const coverBody = on => {
      const hidden = (params.get('hide') || '').split(',')
      for (const o of skinMeshes()) { o.userData.modest = !on; o.visible = on && !hidden.includes(o.name) }
    }
    let dressJob = 0
    // gown slits: where they start, cm about the knee joint (?slit=; old ?slits=0 closes them)
    const SLIT_AT = { ankle: -30, calf: -14, knee: -3, thigh: 8, hip: 30 }
    if (params.get('slits') === '0') $('slit').value = 'off'
    if (SLIT_AT[params.get('slit')] !== undefined || params.get('slit') === 'off') $('slit').value = params.get('slit')
    async function buildDress(v) {
      const color = $('dressColor').value
      if (v[0] === 'c') {
        const entry = communityList(ch).find(e => e.key === v)
        const item = await createCommunity(ch, v, { color })
        if (entry.kind !== 'top') return item
        // their top over our fitted skirt
        const skirt = createDress(ch, rig, { seatY: SEAT_Y, bench: piano.bench, length: 'midi', skirt: 'fitted', color, bodice: false, waist: 13 })
        skirt.object.add(item.object)
        return { ...skirt, update(dt) { item.object.visible = skirt.object.visible; item.update(dt); skirt.update(dt) }, setColor(c) { skirt.setColor(c); item.setColor(c) }, dispose() { item.dispose(); skirt.dispose() } }
      }
      let [length, skirt, sleeves = 'none'] = v.split('-')
      const neck = sleeves === 'qipao' ? 'qipao' : 'halter'
      if (neck === 'qipao') sleeves = 'none'
      const slit = $('slit').value
      return createDress(ch, rig, { seatY: SEAT_Y, bench: piano.bench, length: length === 'knee' ? 'midi' : length, skirt, sleeves, neck, trim: trimColor, color, slits: slit !== 'off', slitAt: SLIT_AT[slit] ?? -14 })
    }
    async function setDress(v) {
      if (ALT) { dress = { object: new THREE.Group(), kind: 'none', update() {}, dispose() {}, settle() {}, setColor() {}, setFabric() {} }; return }
      const job = ++dressJob
      if (!dress) coverBody(false)
      let next
      try { next = await buildDress(v) }
      catch (e) { console.error(e); setStatus('Could not load that dress: ' + e.message, true, 4000); return }
      if (job !== dressJob) { next.dispose(); return }
      dress?.dispose()
      dress = next
      scene.add(dress.object)
      dress.object.visible = $('dressOn').checked
      dress.simulate = $('clothSim').checked
      dress.setFabric?.($('fabric').value)
      dress.settle(3)
      // (her hands at rest lie on the dress, where it is: rig.js liveRadius)
      rig.state.restCover = dress.object
      if (window.__pianist) window.__pianist.dress = dress
      applyLook()
      coverBody(dress.object.visible)
    }
    // her face and skin (as #047 Wardrobe: character.js setFace / setSkin), from
    // the link before anything is dressed, so nothing is built twice
    const facePct = x => Math.round(x * 100) + ' %'
    const showFace = () => { $('faceAsianV').textContent = facePct(+$('faceAsian').value); $('faceAfricanV').textContent = facePct(+$('faceAfrican').value) }
    function applyFace() {
      if (ALT || !ch.setFace) return
      ch.setFace({ asian: +$('faceAsian').value, african: +$('faceAfrican').value })
      $('faceAsian').value = ch.face.asian ?? 0; $('faceAfrican').value = ch.face.african ?? 0   // (held to 100 % together)
      rig.measureEyes?.(); showFace()
    }
    for (const [id, k] of [['faceAsian', 'fasian'], ['faceAfrican', 'fafrican']]) if (params.has(k)) $(id).value = Math.min(1, Math.max(0, +params.get(k) || 0))
    if (['caucasian', 'asian', 'african'].includes(params.get('skintex'))) $('skinTex').value = params.get('skintex')
    applyFace()
    if (!ALT && $('skinTex').value !== 'caucasian') await ch.setSkin($('skinTex').value)
    await Promise.all([setDress($('dressStyle').value), setShoes($('shoeStyle').value)])
    await setHair($('hairStyle').value)
    for (const id of ['faceAsian', 'faceAfrican']) {
      $(id).oninput = () => { applyFace(); smoother.update?.() }
      // (on release: what kept the old head is rebuilt, strand or simulated hair)
      $(id).onchange = () => { applyFace(); if (hair && (hair.kind === 'strands' || hair.cloth)) setHair($('hairStyle').value); else applyLook() }
    }
    $('skinTex').onchange = async () => { if (!ALT) { await ch.setSkin($('skinTex').value); applyLook() } }
    // (the modesty flag wins over whatever else shows the body)
    const keepModest = () => { for (const o of skinMeshes()) if (o.userData.modest) o.visible = false }
    function wardrobeUpdate(dt) { ch.update?.(dt); keepModest(); hair.update(dt); dress?.update(dt); shoes?.update(dt); smoother.update(); look.update() }
    window.__pianist = { ch, rig, piano, hair, dress, shoes, look, scene, camera, smoother }
    for (const n of (params.get('hide') || '').split(',')) if (ch.meshes[n]) ch.meshes[n].visible = false
    if (params.get('hide')?.includes('hair')) hair.object.visible = false
    setStatus('')
    $('hairStyle').onchange = () => setHair($('hairStyle').value)
    $('dressStyle').onchange = () => setDress($('dressStyle').value)
    $('slit').onchange = () => { if ($('dressStyle').value[0] !== 'c') setDress($('dressStyle').value) }
    $('shoeStyle').onchange = () => setShoes($('shoeStyle').value)
    $('fabric').onchange = () => { dress.setFabric?.($('fabric').value); applyLook() }
    async function setOutfit(k) {
      const o = OUTFITS[k]; if (!o) return
      $('dressStyle').value = o.dress; $('fabric').value = o.fabric; $('dressColor').value = o.color
      $('shoeStyle').value = o.shoes; $('hairStyle').value = o.hair; $('hairColor').value = o.hairColor
      $('slit').value = o.slit || 'calf'; trimColor = o.trim || null
      await Promise.all([setDress(o.dress), setShoes(o.shoes), setHair(o.hair)])
    }
    $('outfit').onchange = () => { setOutfit($('outfit').value); markPreset() }
    // one-click presets: a circled number for each featured outfit (the rest
    // stay in the Outfit menu), the menu's name as the tooltip; keys 1–9 and
    // 0 pick the first ten
    const FEATURED = ['bob-tee', 'bob-turtleneck', 'bob-cocktail', 'shift-long', 'braid-qipao', 'long-gown', 'updo-gown', 'tee']
    const presetKeys = FEATURED.filter(k => OUTFITS[k] && [...$('outfit').options].some(o => o.value === k))
    let presetBusy = false
    async function pickPreset(k) {
      if (presetBusy || !OUTFITS[k]) return
      presetBusy = true; for (const b of $('presets').children) b.disabled = true
      $('outfit').value = k
      try { await setOutfit(k) } finally { presetBusy = false; for (const b of $('presets').children) b.disabled = false; markPreset() }
    }
    let markPreset = function () { for (const b of $('presets').children) b.classList.toggle('on', b.dataset.k === $('outfit').value) }
    presetKeys.forEach((k, i) => {
      const b = document.createElement('button')
      b.textContent = i + 1; b.dataset.k = k
      // hover: a preview from pianist/assets/presets/ (side view), if there is one
      const img = new Image(); img.src = `pianist/assets/presets/${k}.webp`
      b.onmouseenter = () => {
        if (!img.complete || !img.naturalWidth) return
        const pk = $('presetPeek'), r = b.getBoundingClientRect()
        pk.querySelector('img').src = img.src
        pk.querySelector('span').textContent = b.dataset.name
        b.removeAttribute('title')   // (the preview carries the name; no native tooltip on top)
        pk.style.left = `${r.left + r.width / 2}px`; pk.style.top = `${r.bottom + 8}px`
        pk.classList.add('show')
      }
      b.onmouseleave = () => { $('presetPeek').classList.remove('show'); b.title = b.dataset.name }
      b.title = b.dataset.name = `${i + 1} · ${[...$('outfit').options].find(o => o.value === k).textContent}`
      b.onclick = () => pickPreset(k)
      $('presets').appendChild(b)
    })
    markPreset()
    // the same outfits as a sheet of thumbnails (touch: Outfit in the top bar)
    for (const k of presetKeys) {
      const b = document.createElement('button'), name = [...$('outfit').options].find(o => o.value === k).textContent
      b.dataset.k = k
      b.innerHTML = `<img loading="lazy" alt="" src="pianist/assets/presets/${k}.webp"><span></span>`
      b.querySelector('span').textContent = name
      b.onclick = () => { closePops(); pickPreset(k) }
      $('outfitGrid').appendChild(b)
    }
    const markGrid = () => { for (const b of $('outfitGrid').children) b.classList.toggle('on', b.dataset.k === $('outfit').value) }
    { const mp = markPreset; markPreset = () => { mp(); markGrid() } }
    markGrid()
    for (const id of ['dressStyle', 'fabric', 'shoeStyle', 'hairStyle', 'dressColor', 'hairColor', 'slit']) $(id).addEventListener('input', markPreset)
    addEventListener('keydown', ev => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName) || !/^[0-9]$/.test(ev.key)) return
      const k = presetKeys[ev.key === '0' ? 9 : +ev.key - 1]
      if (k) pickPreset(k)
    })
    for (const id of ['dressStyle', 'fabric', 'shoeStyle', 'hairStyle', 'dressColor', 'hairColor', 'slit']) $(id).addEventListener('input', () => { $('outfit').value = ''; trimColor = null })
    $('look').onchange = applyLook
    $('smooth').onchange = applyLook
    // the tolerance; the cage is rebuilt when the slider rests (~1 s)
    let simpTimer = 0
    $('simplify').oninput = () => {
      const v = +$('simplify').value
      $('simplifyV').textContent = v ? `${v} cm…` : 'off'
      clearTimeout(simpTimer); simpTimer = setTimeout(applyLook, 350)
    }
    $('hairOn').onchange = () => { hair.object.visible = $('hairOn').checked }
    if (params.get('hairsim') === '0') { $('hairSim').checked = false; hair.simulate = false }
    $('hairSim').onchange = () => { hair.simulate = $('hairSim').checked }
    $('dressOn').onchange = () => { dress.object.visible = $('dressOn').checked; coverBody(dress.object.visible) }
    $('clothSim').onchange = () => { dress.simulate = $('clothSim').checked; if (ch.dress) ch.dress.simulate = $('clothSim').checked }
    $('expr').value = params.get('expr') ?? 1
    rig.state.expression = +$('expr').value
    // (older links: ?lap=0 kept the hands over the keys)
    if (params.get('lap') === '0' && !params.has('rest')) $('restAfter').value = 'none'
    rig.state.restAfter = $('restAfter').value
    $('restAfter').onchange = () => { rig.state.restAfter = $('restAfter').value }
    $('expr').oninput = () => { rig.state.expression = +$('expr').value }
    $('hips').value = params.get('hips') ?? 1
    rig.state.hipShift = +$('hips').value
    $('hips').oninput = () => { rig.state.hipShift = +$('hips').value }
    // bench and pianist move together (cm, + = further from the keys)
    const cm = d => `${d > 0 ? '+' : ''}${d} cm`
    const setBench = d => { piano.bench.position.z = 47 + d; SEAT.z = 44 + d; $('benchDistV').textContent = cm(d) }
    $('benchDist').value = params.get('bench') ?? 0
    setBench(+$('benchDist').value)
    $('benchDist').oninput = () => setBench(+$('benchDist').value)
    // bench height: the legs stretch, the seat rides up / down on them; the hips follow
    for (const o of piano.bench.children) o.userData.y0 = o.position.y
    const setBenchH = d => {
      piano.bench.userData.lift = d
      for (const o of piano.bench.children) {
        if (o.userData.y0 === 0) o.scale.y = (44 + d) / 44   // a leg (up to the frame at 44)
        else o.position.y = o.userData.y0 + d
      }
      SEAT.y = SEAT_Y + 8.6 + d; $('benchHV').textContent = cm(d)
    }
    $('benchH').value = params.get('benchh') ?? 0
    setBenchH(+$('benchH').value)
    $('benchH').oninput = () => setBenchH(+$('benchH').value)
    // posture: 0 = upright, 1 = well forward over the keys
    const setPosture = v => { rig.state.posture = v; $('postureV').textContent = v < -0.1 ? 'leaning back' : v < 0.25 ? 'upright' : v > 1.15 ? 'hunched over' : v > 0.75 ? 'forward' : 'between' }
    $('posture').value = params.get('posture') ?? 0.5
    setPosture(+$('posture').value)
    $('posture').oninput = () => setPosture(+$('posture').value)
    // sideways: − toward the bass (her left), + toward the treble
    // playing style: each a multiplier on one kind of movement (Body
    // expression above scales them all)
    for (const k of ['reach', 'rock', 'sway', 'nod', 'glances', 'elbowLead']) {
      const set = () => { rig.state[k] = +$(k).value; $(k + 'V').textContent = (+$(k).value).toFixed(1).replace(/\.0$/, '') + '×' }
      $(k).value = params.get(k) ?? 1; set(); $(k).oninput = set
    }
    // wrist strokes (pianist/stroke.js): re-planned when a slider moves
    for (const [k, o] of [['armw', 'armWeight'], ['lifth', 'height'], ['wflex', 'flex'], ['frot', 'rotation'], ['liftoff', 'liftOff']]) {
      const set = () => { rig.hands.setStrokeOpts({ [o]: +$(k).value }); $(k + 'V').textContent = (+$(k).value).toFixed(1).replace(/\.0$/, '') + '×' }
      $(k).value = params.get(k) ?? 1; set(); $(k).oninput = set
    }
    $('gaze').value = params.get('gaze') ?? 'horizon'
    rig.state.gazeMode = $('gaze').value
    $('gaze').onchange = () => { rig.state.gazeMode = $('gaze').value }
    // finger touch and fingering style (fingering/motion.js TOUCH, fingering.js CHOPIN): both re-finger the song
    $('touch').value = params.get('touch') === 'press' ? 'press' : 'fall'
    $('fingering').value = params.get('fingering') === 'chopin' ? 'chopin' : 'standard'
    rig.hands.touch = $('touch').value
    $('touch').onchange = () => { rig.hands.touch = $('touch').value; if (song) fingerInWorker(song.notes) }
    $('fingering').onchange = () => { if (song) fingerInWorker(song.notes) }
    for (const [k, l] of Object.entries(HAND_MODES)) $('hands').add(new Option(l, k))
    $('hands').value = handModeOf(params.get('hands'))
    $('hands').onchange = () => { if (song) fingerInWorker(song.notes) }
    $('hairColor').oninput = () => hair.setColor($('hairColor').value)
    $('dressColor').oninput = () => dress.setColor($('dressColor').value)
    $('hairDensity').onchange = () => hair.setDensity(+$('hairDensity').value)

    // ── Post ─────────────────────────────────────────────────────────────
    const rt = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: LOWQ ? 0 : 4 })
    const composer = new EffectComposer(renderer, rt)
    composer.addPass(new RenderPass(scene, camera))
    const bokeh = new BokehPass(scene, camera, { focus: 150, aperture: 0.00011, maxblur: 0.006 })
    composer.addPass(bokeh)
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.12, 0.4, 0.92)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    const grain = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.035 }, uVig: { value: 0.55 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAmount, uVig; varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.13) * 43758.5453); }
        void main() { vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; float v = 1.0 - uVig * dot(q, q) * 1.6;
          c.rgb *= v; c.rgb += (h(vUv * 1000.0) - 0.5) * uAmount; gl_FragColor = c; }`,
    })
    composer.addPass(grain)

    // Dust in the beam (from #030): a few hundred motes drifting through the spot
    const dust = (() => {
      const N = LOWQ ? 150 : 420, pos = new Float32Array(N * 3), seed = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const t = Math.random(), a = Math.random() * Math.PI * 2, rad = Math.sqrt(Math.random()) * (30 + t * 160)
        const p = new THREE.Vector3().lerpVectors(spot.target.position, spot.position, t * 0.75)
        pos.set([p.x + Math.cos(a) * rad, p.y + (Math.random() - 0.5) * 40, p.z + Math.sin(a) * rad], i * 3)
        seed[i] = Math.random() * 100
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uScale: { value: innerHeight * renderer.getPixelRatio() }, uOpacity: { value: 0.18 } },
        vertexShader: `attribute float seed; uniform float uTime, uScale; varying float vA;
          void main() {
            vec3 p = position + vec3(sin(uTime * 0.07 + seed) * 9.0, sin(uTime * 0.05 + seed * 1.7) * 7.0, cos(uTime * 0.06 + seed * 0.7) * 9.0);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = clamp(uScale * 0.22 / -mv.z, 1.0, 3.5);
            vA = 0.4 + 0.6 * abs(sin(uTime * 0.4 + seed * 3.0));
          }`,
        fragmentShader: `uniform float uOpacity; varying float vA;
          void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
            gl_FragColor = vec4(vec3(1.0, 0.85, 0.65) * 1.4, (1.0 - d * 2.0) * vA * uOpacity); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
      const pts = new THREE.Points(geo, mat)
      pts.frustumCulled = false
      scene.add(pts)
      return pts
    })()
    // the depth of field re-renders the scene for depth: keep the motes out of it
    {
      const render = bokeh.render.bind(bokeh)
      bokeh.render = (...a) => { const v = dust.visible; dust.visible = false; render(...a); dust.visible = v }
    }
    const pct = x => Math.round(x * 100) + '%'
    function applyFx() {
      bokeh.enabled = $('dof').checked
      bloom.enabled = $('bloom').checked; bloom.strength = +$('bloomAmt').value
      const g = $('filmGrain').checked
      grain.uniforms.uAmount.value = g ? +$('grainAmt').value : 0; grain.uniforms.uVig.value = g ? +$('vig').value : 0
      dust.visible = $('dust').checked; dust.material.uniforms.uOpacity.value = +$('dustAmt').value
      $('dofAmtV').textContent = (+$('dofAmt').value).toFixed(2).replace(/0$/, '') + '×'
      $('bloomAmtV').textContent = (+$('bloomAmt').value).toFixed(2)
      $('grainAmtV').textContent = pct(+$('grainAmt').value / 0.035)
      $('vigV').textContent = pct(+$('vig').value / 0.55)
      $('dustAmtV').textContent = pct(+$('dustAmt').value / 0.18)
      for (const id of ['dofAmt']) $(id).disabled = !$('dof').checked
      $('bloomAmt').disabled = !$('bloom').checked
      $('grainAmt').disabled = $('vig').disabled = !g
      $('dustAmt').disabled = !$('dust').checked
    }
    for (const id of ['dof', 'bloom', 'filmGrain', 'dust']) $(id).onchange = applyFx
    for (const id of ['dofAmt', 'bloomAmt', 'grainAmt', 'vig', 'dustAmt']) $(id).oninput = applyFx
    applyFx()

    // ── Cameras (framed after Concert Creator's shots) ───────────────────
    const VIEWS = {
      shoulder: { pos: [-42, 178, 104], target: [8, 82, -12], fov: 40 },
      side: { pos: [420, 118, 10], target: [30, 98, 10], fov: 30 },   // square on to her right side
      profile: { pos: [120, 132, 2], target: [0, 120, 34], fov: 30 },
      front: { pos: [34, 133, -68], target: [0, 118, 32], fov: 34 },
      face: { pos: [-10, 118, -18], target: [0, 124, 24], fov: 26 },
      hands: { pos: [-55, 125, 42], target: [0, 76, -4], fov: 40 },
      back: { pos: [10, 160, 230], target: [0, 100, 0], fov: 38 },
      headside: { pos: [60, 140, 45], target: [0, 130, 35], fov: 30 },
      lap: { pos: [-110, 95, 10], target: [0, 55, 40], fov: 38 },
      feet: { pos: [150, 35, 110], target: [0, 10, 15], fov: 30 },
      orbit: { pos: [260, 230, 260], target: [0, 90, 0], fov: 34 },
      // in front of the piano looking back at her: through the open lid from
      // the hall, and square on down the piano from beyond the tail
      audience: { pos: [331, 151, -226], target: [0, 122, 32], fov: 20 },
      tail: { pos: [0, 135, -348], target: [0, 122, 32], fov: 18, orbitMax: 7, minDist: 320 },
      // straight down over the piano, the keyboard at the bottom of the frame
      top: { pos: [0, 625, 20], target: [0, 70, -55], fov: 30 },
      // favourites: low from her right looking up, high over the keyboard looking down
      lowRight: { pos: [235, 84.3, 91.7], target: [0.7, 113.6, 24.6], fov: 38 },
      overKeys: { pos: [32.3, 475.6, -108.6], target: [0.7, 113.6, 24.6], fov: 38 },
      lowLeft: { pos: [-140.1, 102, 123.5], target: [-0.7, 86, -45], fov: 38 },
      lowRightBack: { pos: [140.1, 102, 123.5], target: [0.7, 86, -45], fov: 38 },
      // through her eyes down to the keys: placed every frame (playerView)
      player: { pos: [0, 128, 24], target: [0, 73, -2], fov: 52, pov: true, orbitMax: 4 },
    }
    // every director spot is a view too: the hand-placed ones above, the rest
    // placed from the spot's angle around its subject where it rests
    let applyFrameViews = () => {}, shortFrame = false, stacked = false, director2 = null, dirSource = null   // (shortFrame: the 9:16 camera plan of a Short, preview or export)
    {
      const REST = { hands: [0, 79, 10], head: [0, 124, 27], figure: [0, 101, 21], piano: [0, 90, -70], feet: [0, 12, 18], hammers: [0, 85, -36.5], pedals: [0, 7, -2] }
      const spotView = sp => {
        const t = REST[sp.subj].map((v, i) => v + (sp.aim?.[i] ?? 0)), az = sp.az * Math.PI / 180, el = sp.el * Math.PI / 180
        return { pos: [t[0] + Math.sin(az) * Math.cos(el) * sp.dist, t[1] + Math.sin(el) * sp.dist, t[2] + Math.cos(az) * Math.cos(el) * sp.dist], target: [...t], fov: sp.fov, orbitMax: sp.orbitMax, minDist: sp.minDist }
      }
      for (const [k, sp] of Object.entries(SPOTS)) if (!VIEWS[k]) VIEWS[k] = spotView(sp)
      // a Short (9:16): the spots rated for portrait take their portrait framing
      // (the hand-placed landscape views come back when it's off)
      const LANDSCAPE = { ...VIEWS }
      applyFrameViews = portrait => {
        for (const k of Object.keys(SPOTS)) VIEWS[k] = portrait && PORTRAIT[k] ? spotView(spotFor(k, true)) : LANDSCAPE[k]
        for (const it of document.querySelectorAll('#cameraPop .item[data-view]')) it.classList.toggle('noportrait', portrait && !PORTRAIT[it.dataset.view])
      }
      // the Camera menu: Far, Medium, Close, each grouped by what's in the frame
      const KIND_TAG = { hands: 'hands', pianist: 'her', piano: 'piano' }, list = $('viewList')
      const entries = Object.keys(SPOTS).map(k => ({ k, label: SPOTS[k].label, size: SPOTS[k].size, kind: spotKind(k) }))
      entries.push({ k: 'player', label: "Player's view", size: 0, kind: 'hands' })
      const ORDER = ['piano', 'pianist', 'hands']
      for (const size of [2, 1, 0]) {
        list.insertAdjacentHTML('beforeend', `<div class="sect">${SIZES[size]}<small>${['the hands, the face, the mechanism', 'her and the keyboard', 'the stage and the piano'][size]}</small></div>`)
        for (const e of entries.filter(e => e.size === size).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))) {
          const it = document.createElement('div')
          it.className = 'item'; it.dataset.view = e.k
          it.append(e.label, Object.assign(document.createElement('span'), { className: 'kind', textContent: { feet: 'feet', pedals: 'feet', hammers: 'inside' }[SPOTS[e.k]?.subj] || KIND_TAG[e.kind] }), Object.assign(document.createElement('span'), { className: 'dot' }))
          list.append(it)
        }
      }
    }
    // a fixed view's focus and depth of field: by its spot's subject and size
    const viewFocusHands = v => v === 'player' || (SPOTS[v] && spotKind(v) === 'hands')
    const viewWide = v => SPOTS[v]?.size === 2
    // the player's view: a little in front of her eyes (the eye bones sit on
    // the corneas), looking down at where the hands are, both smoothed so her
    // head's small moves read as a steady gaze
    const pvEye = new THREE.Vector3(), pvLook = new THREE.Vector3(), _pv = new THREE.Vector3()
    let pvPrimed = false
    // Seen from inside her head: the head and face (body triangles above the
    // middle of the neck), eyes, brows, lashes and hair are hidden, and the
    // near plane pushed out a little so nothing of the collar or cheeks
    // grazes the lens. A garment rebuilt meanwhile keeps its own hiding.
    let povOn = false, povTris = null
    function setPov(on) {
      if (ALT || on === povOn) return
      povOn = on
      if (on && !povTris) {
        const g = ch.parts.body.geometry, y = g.attributes.position.array, full = ch.parts.body.index0 || g.index.array
        povTris = []
        for (let t = 0; t < full.length; t += 3) if (y[full[t] * 3 + 1] > 145 && y[full[t + 1] * 3 + 1] > 145 && y[full[t + 2] * 3 + 1] > 145) povTris.push(t)
      }
      hideBody(ch, 'pov', on ? povTris : null)
      for (const k of ['eyes', 'eyebrows', 'eyelashes']) ch.meshes[k].visible = !on
      if (hair) hair.object.visible = !on && $('hairOn').checked
      camera.near = on ? 6 : 2; camera.updateProjectionMatrix()
    }
    function playerView(hands, dt) {
      _pv.copy(rig.pos('eye.L')).add(rig.pos('eye.R')).multiplyScalar(0.5)
      const k = pvPrimed ? 1 - Math.exp(-dt / 0.15) : 1, kl = pvPrimed ? 1 - Math.exp(-dt / 0.7) : 1
      pvEye.lerp(_pv, k)
      pvLook.lerp(_pv.set(hands.x * 0.8, 73, -4), kl)
      pvPrimed = true
      // 4 cm out from the eyes toward the keys, clear of brows and lashes
      _pv.subVectors(pvLook, pvEye).normalize().multiplyScalar(4).add(pvEye)
      VIEWS.player.pos[0] = _pv.x; VIEWS.player.pos[1] = _pv.y; VIEWS.player.pos[2] = _pv.z
      VIEWS.player.target[0] = pvLook.x; VIEWS.player.target[1] = pvLook.y; VIEWS.player.target[2] = pvLook.z
    }
    // the director: shots that move, cut or glide on the music (pianist/director.js)
    const dirSizes = () => [['dirClose', 0], ['dirMed', 1], ['dirFar', 2]].filter(([id]) => $(id).checked).map(([, n]) => n)
    for (const [id, k] of [['dirFar', 'dfar'], ['dirMed', 'dmed'], ['dirClose', 'dclose']]) if (params.get(k) === '0') $(id).checked = false
    if (STRINGS_LEVELS[params.get('strings')]) $('dirStrings').value = params.get('strings')
    const dirStrings = () => STRINGS_LEVELS[$('dirStrings').value] ?? null
    const director = createDirector({ pace: +(params.get('pace') ?? 1), bias: +(params.get('favour') ?? 0), trans: params.get('trans') || 'cuts', sizes: dirSizes(), strings: dirStrings(), pedals: params.get('dpedals') !== '0' })
    if (['auto', 'usual', 'wide'].includes(params.get('dopen'))) $('dirOpen').value = params.get('dopen')
    const dirOpening = () => $('dirOpen').value === 'wide' || ($('dirOpen').value === 'auto' && $('stageSet').value === 'candle') ? 'wide' : null
    director.set('opening', dirOpening())
    $('dirPedals').checked = director.opts.pedals
    for (const id of ['dirFar', 'dirMed', 'dirClose']) $(id).onchange = () => {
      if (!dirSizes().length) $(id).checked = true   // (at least one)
      director.set('sizes', dirSizes())
    }
    $('dirPace').value = String(director.opts.pace); $('dirBias').value = String(director.opts.bias); $('dirTrans').value = director.opts.trans
    // (a stacked Short's second plan, the hands, follows the same options)
    const dirSet = (k, v) => { director.set(k, v); if (director2) { director2.set(k, v); if (stacked) applyShortPlan() } }
    $('dirPace').onchange = () => dirSet('pace', +$('dirPace').value)
    $('dirBias').onchange = () => dirSet('bias', +$('dirBias').value)
    $('dirTrans').onchange = () => dirSet('trans', $('dirTrans').value)
    $('dirStrings').onchange = () => dirSet('strings', dirStrings())
    $('dirPedals').onchange = () => dirSet('pedals', $('dirPedals').checked)
    $('dirOpen').onchange = () => dirSet('opening', dirOpening())
    $('stageSet').addEventListener('change', () => dirSet('opening', dirOpening()))
    const SEQ_MOVES = { random: 'Random', cut: "Director's cut" }
    $('camMove').value = MOVES[params.get('move')] || SEQ_MOVES[params.get('move')] ? params.get('move') : 'cut'
    $('camMove').onchange = () => { moveT = 0; userCam = false; lastShot = null; $('shotName').textContent = '' }
    $('shotLbl').checked = params.has('shotnames')
    $('camFollow').checked = params.get('follow') === '1'
    director.set('follow', $('camFollow').checked)
    $('camFollow').onchange = () => { director.set('follow', $('camFollow').checked); director2?.set('follow', $('camFollow').checked) }
    const applyShotLbl = () => document.body.classList.toggle('shotlbl', $('shotLbl').checked)
    $('shotLbl').onchange = applyShotLbl; applyShotLbl()
    let moveT = 0, lastShot = null, camTouched = 0
    window.__pianist.director = director
    const camOut = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 34 }
    // ?view=auto (the director; old ?view=cycle links too) or a fixed view
    let view = params.get('view') === 'cycle' ? 'auto' : VIEWS[params.get('view')] || params.get('view') === 'auto' ? params.get('view') : 'back'
    const camGoal = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 34 }
    let cut = true
    function setView(v, instant = true) {
      view = v
      const d = VIEWS[v] || VIEWS.shoulder
      camGoal.pos.set(...d.pos); camGoal.target.set(...d.target); camGoal.fov = d.fov
      controls.autoRotate = v === 'orbit'
      cut = instant; moveT = 0; lastShot = null
      for (const it of document.querySelectorAll('#cameraPop .item')) it.classList.toggle('sel', it.dataset.view === v)
      if (v !== 'auto') $('shotName').textContent = ''
    }
    for (const it of document.querySelectorAll('#cameraPop .item')) it.onclick = () => { setView(it.dataset.view); closePops() }
    // a tap or click on the picture (no drag): play / pause, as on YouTube;
    // double-tap (or double-click): the next camera in the menu. The single tap
    // waits out the double-tap window, and a tap that only closes a menu is not one
    let tapPlay = togglePlay   // play / pause with the feedback icon (set below)
    {
      const cv = renderer.domElement, down = new Map()
      let lastTap = 0, lastX = 0, lastY = 0, tapT = 0
      // not a tap on the picture: one while a menu is open (it closes the
      // menu), within a second of a menu closing (hover menus close by
      // themselves) or of using one, or while a control from a menu still has the focus
      // (the tap just lets go of it)
      let menuClosedAt = 0
      const anyPop = () => Object.values(pops).some(p => $(p).classList.contains('open'))
      let popWasOpen = false
      setTimeout(() => {   // (the menus are set up further down)
        new MutationObserver(() => { const o = anyPop(); if (popWasOpen && !o) menuClosedAt = performance.now(); popWasOpen = o })
          .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
        // (and of using a control in one: a dropdown's list can lie over the picture)
        for (const p of Object.values(pops)) for (const e of ['change', 'input', 'click']) $(p).addEventListener(e, () => { menuClosedAt = performance.now() })
      })
      const menuBusy = () => {
        const a = document.activeElement
        if (a && a !== document.body && a.closest?.('.pop')) { a.blur(); return true }
        return anyPop() || performance.now() - menuClosedAt < 1000
      }
      tapPlay = async () => {
        await togglePlay()
        const fx = $('tapFx')
        fx.querySelector('path').setAttribute('d', scheduler?.playing ? 'M7 4v16l13-8z' : 'M6 4h4v16H6zm8 0h4v16h-4z')
        fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go')
      }
      cv.addEventListener('pointerdown', ev => {
        const menu = menuBusy()
        down.set(ev.pointerId, [ev.clientX, ev.clientY, performance.now(), menu || down.size > 0])
      })
      cv.addEventListener('pointerup', ev => {
        const d = down.get(ev.pointerId); down.delete(ev.pointerId)
        if (!d || down.size || Math.hypot(ev.clientX - d[0], ev.clientY - d[1]) > 12 || performance.now() - d[2] > 350) return   // (a drag, a hold or a pinch)
        const now = performance.now()
        if (now - lastTap < 350 && Math.hypot(ev.clientX - lastX, ev.clientY - lastY) < 40) {
          lastTap = 0; clearTimeout(tapT)
          const items = [...document.querySelectorAll('#cameraPop .item[data-view]')], i = items.findIndex(it => it.dataset.view === view)
          const next = items[(i + 1) % items.length]
          camFree = false; setView(next.dataset.view)
          setStatus(next.firstChild.textContent.trim(), false, 1200)
        } else {
          lastTap = now; lastX = ev.clientX; lastY = ev.clientY
          clearTimeout(tapT)
          if (!d[3] && !exporting) tapT = setTimeout(() => { if (!anyPop()) tapPlay() }, 300)
        }
      })
      cv.addEventListener('dblclick', ev => ev.preventDefault())
    }
    setView(view)
    // dragging takes the camera; the director (or the move) takes it back after 8 s
    let userCam = false, camFree = false   // camFree: a dragged camera on a fixed view (shared as ?cam=)
    controls.addEventListener('start', () => { userCam = true; camFree = view !== 'auto'; camTouched = performance.now() })
    for (const it of document.querySelectorAll('#cameraPop .item')) it.addEventListener('click', () => { camFree = false })
    // the dragged camera as the address bar shows it: taken once the drag has
    // settled, not every frame (the view's glance and wander keep it moving)
    let camSnap = '', camSnapT = 0
    const r1 = x => Math.round(x * 10) / 10
    const snapCam = () => { camSnap = [...camera.position.toArray(), ...controls.target.toArray()].map(r1).join(',') }
    controls.addEventListener('end', () => { camTouched = performance.now(); clearTimeout(camSnapT); camSnapT = setTimeout(snapCam, 800) })

    // popups
    const pops = { songsBtn: 'songsPop', cameraBtn: 'cameraPop', perfBtn: 'perfPop', visualsBtn: 'visualsPop', audioBtn: 'audioPop', renderBtn: 'renderPop', ptBtn: 'ptPop', outfitBtn: 'outfitPop', moreBtn: 'morePop' }
    // the right-hand menus open under their own pill
    for (const [b, p] of Object.entries(pops)) {
      if (b === 'songsBtn') continue
      new MutationObserver(() => {
        if (!$(p).classList.contains('open')) return
        const r = $(b).getBoundingClientRect(), w = $(p).offsetWidth
        $(p).style.right = Math.max(12, Math.min(innerWidth - w - 12, innerWidth - r.right)) + 'px'
      }).observe($(p), { attributes: true, attributeFilter: ['class'] })
    }
    function closePops() { for (const p of Object.values(pops)) $(p).classList.remove('open') }
    for (const [b, p] of Object.entries(pops)) $(b).onclick = ev => { ev.stopPropagation(); const o = $(p).classList.contains('open'); closePops(); if (!o) $(p).classList.add('open') }
    for (const p of Object.values(pops)) $(p).addEventListener('pointerdown', ev => ev.stopPropagation())
    // with a mouse the menus also open on hover and close a moment after the
    // pointer leaves both the pill and the menu (not while a dropdown, colour
    // picker or the song filter inside it is in use)
    {
      let closeT = 0, hoverAt = 0, hold = false
      const anyOpen = () => Object.values(pops).some(p => $(p).classList.contains('open'))
      const cancel = () => { clearTimeout(closeT); hold = false }
      const later = () => { clearTimeout(closeT); closeT = setTimeout(() => { if (!hold && ![...Object.keys(pops), ...Object.values(pops)].some(id => $(id).matches(':hover'))) closePops() }, 400) }
      for (const [b, p] of Object.entries(pops)) {
        $(b).addEventListener('pointerenter', ev => {
          if (ev.pointerType !== 'mouse') return
          cancel()
          if (!$(p).classList.contains('open')) { closePops(); $(p).classList.add('open'); hoverAt = performance.now() }
        })
        // a click right after hovering open keeps it open (no toggle back)
        $(b).addEventListener('click', ev => { if ((ev.pointerType === 'mouse' || performance.now() - hoverAt < 1500) && !$(p).classList.contains('open')) $(p).classList.add('open') })
        for (const el of [$(b), $(p)]) el.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && anyOpen()) later() })
        $(p).addEventListener('pointerenter', cancel)
        $(p).addEventListener('pointerdown', ev => { if (ev.target.tagName === 'SELECT' || ev.target.type === 'color') hold = true })
        $(p).addEventListener('focusin', ev => { if (ev.target.type === 'search') hold = true })
        $(p).addEventListener('change', () => { hold = false })
        $(p).addEventListener('focusout', () => { hold = false })
      }
    }
    addEventListener('pointerdown', closePops)
    // the More menu (touch): each item opens its menu as a sheet
    for (const it of document.querySelectorAll('#morePop [data-open]')) it.onclick = ev => { ev.stopPropagation(); closePops(); $(it.dataset.open).classList.add('open') }
    $('moreShare').onclick = () => { closePops(); $('shareBtn').click() }
    // Save for offline: every list song, the preset thumbnails and the current
    // sound, fetched into the service worker's asset cache (sw.js). Outfits
    // aren't fetched up front: the ones you've shown are already cached as
    // they load. The storage is asked to persist
    {
      const label = t => { for (const el of document.querySelectorAll('.offlineV')) el.textContent = t }
      const mb = b => (b / 1e6).toFixed(b < 1e7 ? 1 : 0) + ' MB'
      let busy = false
      if (localStorage.getItem('midiviz-offline')) label('saved ✓')
      navigator.serviceWorker?.addEventListener('message', ev => {
        const m = ev.data
        if (m?.type !== 'precache') return
        const fin = m.done >= m.total
        label(fin ? `saved ✓ ${mb(m.bytes)}` : `${Math.round(m.done / m.total * 100)}% · ${mb(m.bytes)}`)
        setStatus(fin ? `Saved for offline: ${m.total - m.failed} files, ${mb(m.bytes)}${m.failed ? ` (${m.failed} missing)` : ''}` : `Saving for offline… ${m.done} / ${m.total} files, ${mb(m.bytes)}`, false, fin ? 4000 : 0)
        if (fin) { busy = false; localStorage.setItem('midiviz-offline', String(Date.now())) }
      })
      async function saveOffline() {
        if (busy) return
        const reg = await navigator.serviceWorker?.ready.catch(() => null)
        if (!reg?.active) return setStatus('Offline saving needs a service worker (https or localhost)', true, 4000)
        busy = true
        navigator.storage?.persist?.().catch(() => {})
        const abs = u => new URL(encodeURI(u), location.href).href
        const urls = [...SONGS.map(x => x[0]), $('sf').value,
          ...['character.json', 'character.bin', 'skin.jpg', 'eye.png', 'eyebrow.png', 'eyelashes.png'].map(f => 'pianist/assets/' + f)]
        for (const k of presetKeys) urls.push(`pianist/assets/presets/${k}.webp`)
        if (/\.sf3$/.test($('sf').value)) urls.push('vendor/spessasynth/spessasynth_core.bundle.js')
        urls.push('vendor/oxisynth/oxisynth_bg.wasm', 'pianist/icon-192.png', 'pianist/icon-512.png')
        reg.active.postMessage({ type: 'precache', urls: urls.map(abs) })
        label('starting…')
      }
      for (const el of document.querySelectorAll('.saveOffline')) el.onclick = ev => { ev.stopPropagation(); closePops(); saveOffline() }
    }
    let idleT = 0
    const poke = () => { idleT = performance.now(); document.body.classList.remove('idle') }
    addEventListener('pointermove', poke)
    addEventListener('pointerdown', poke, true)   // (a tap brings the controls back on touch screens)
    addEventListener('keydown', ev => {
      if (ev.key === 'Escape') document.body.classList.toggle('hideui')
      if (ev.key === ' ' && ev.target === document.body) { ev.preventDefault(); tapPlay() }
    })

    // ── Sound ────────────────────────────────────────────────────────────
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    // OxiSynth plays through an AudioContext of its own, built inside its
    // WASM: catch that one construction (as #030's acoustics.js does) so the
    // picture can measure how late its sound reaches the speakers
    const avs = { ctx: null, end: 0, lag: 0, measured: false, t: null }
    // ...and to put the hall (concertstage/acoustics.js: reverb, room boost,
    // ambience, applause, master volume and limiter) in its output
    const hall = installAcoustics()
    {
      const Base = window.AudioContext
      const Measured = window.AudioContext = class extends Base {
        constructor(...a) {
          super(...a)
          if (window.AudioContext === Measured) window.AudioContext = Base   // one-shot (the hall's own restores the original)
          avs.ctx = this
          const make = this.createBufferSource.bind(this)
          this.createBufferSource = () => {
            const n = make(), start = n.start.bind(n)
            n.start = (when = 0, ...rest) => {
              const d = n.buffer?.duration || 0   // the synth's audio chunks
              if (d > 0 && d < 0.5) avs.end = Math.max(when, this.currentTime) + d
              return start(when, ...rest)
            }
            return n
          }
        }
      }
    }
    const engine = new SoundFontEngine({ backend: 'oxisynth', vendorPath, audioContext: audioCtx })
    // (phones get the same piano compressed: 3 MB instead of 17, unpacked in the browser)
    const SOUNDFONTS = [['soundfonts/Full Grand Piano.sf2', 'Full Grand Piano'], ['soundfonts/Full Grand Piano.sf3', 'Full Grand Piano (compressed, 3 MB)'], ['soundfonts/Motif_ES6_Concert_Piano.sf2', 'Motif ES6 Concert Piano'], ['soundfonts/FluidR3.sf3', 'FluidR3 GM']]
    for (const [v, l] of SOUNDFONTS) $('sf').add(new Option(l, v))
    if (LOWQ) { $('sf').options[1].defaultSelected = true; $('sf').value = SOUNDFONTS[1][0] }
    let soundReady = false, soundLoading = null
    async function loadSound(v) {
      soundReady = false
      try { await engine.loadSoundFont(v); for (let ch = 0; ch < 16; ch++) if (ch !== 9) engine.programChange(ch, 0); soundReady = true }
      catch (e) { console.error(e); setStatus('Sound failed to load: ' + e.message, true, 4000) }
    }
    $('sf').onchange = () => { soundLoading = loadSound($('sf').value) }
    const ensureSound = () => (soundLoading ??= loadSound($('sf').value))
    const unlockAudio = () => { if (audioCtx.state !== 'running') audioCtx.resume().then(() => engine.resume?.()).catch(() => {}); if (hall.ctx && hall.ctx.state !== 'running') hall.ctx.resume().catch(() => {}) }

    // ── Hall acoustics (as #030) ─────────────────────────────────────────
    for (const [k, r] of Object.entries(ROOMS)) $('room').add(new Option(r.label, k, k === 'dry', k === 'dry'))   // (no room by default: Hall → Room to add one)
    for (const [k, r] of Object.entries(SEATS)) $('seat').add(new Option(r.label, k, k === 'front', k === 'front'))
    const hallSettings = () => ({ room: $('room').value, seat: $('seat').value, amount: +$('rvAmt').value, decay: +$('rvDecay').value, tone: +$('rvTone').value, boost: +$('boost').value })
    function applyHall() {
      const h = hallSettings(), dry = h.room === 'dry'
      $('rvAmtV').textContent = Math.round(h.amount * 100) + '%'
      $('rvDecayV').textContent = dry ? '–' : rt60Of(h.room, h.decay).toFixed(1) + ' s'
      $('rvToneV').textContent = h.tone < 0.35 ? 'warm' : h.tone > 0.65 ? 'bright' : 'neutral'
      $('ambV').textContent = +$('amb').value ? Math.round(+$('amb').value * 100) + '%' : 'off'
      for (const id of ['seat', 'rvAmt', 'rvDecay', 'rvTone']) $(id).disabled = dry
      const vol = +$('vol').value
      $('volV').textContent = vol ? Math.round(vol * 100) + '%' : 'muted'
      $('boostV').textContent = (h.boost > 0 ? '+' : '') + h.boost + ' dB'
      hall.setLevels({ volume: vol, boost: h.boost })
      hall.set(acousticParams(h))
      hall.setAmbience(+$('amb').value)
    }
    for (const id of ['room', 'seat']) $(id).onchange = applyHall
    for (const id of ['vol', 'boost', 'rvAmt', 'rvDecay', 'rvTone', 'amb']) $(id).oninput = applyHall
    $('clapNow').onclick = () => { unlockAudio(); hall.applause() }
    hall.ready.then(applyHall)
    applyHall()

    // ── Songs ────────────────────────────────────────────────────────────
    const SONGS = [], GROUPS = []
    // the song Play starts with: the plugin's, else the Raindrop prelude
    const defaultSong = () => (plug.defaultSong && (SONGS.find(x => x[0] === plug.defaultSong) || [plug.defaultSong, plug.defaultSong.split('/').pop().replace(/\.midi?$/i, '')])) || SONGS.find(x => /chpn-p15|nocturne/i.test(x[0]))
    for (const f of (typeof PlaybackControls !== 'undefined' ? PlaybackControls.defaultMidiFiles : [])) {
      if (f.disabled || !f.value) GROUPS.push({ name: f.label.replace(/^=+\s*|\s*=+$/g, ''), songs: [] })
      else { if (!GROUPS.length) GROUPS.push({ name: 'Songs', songs: [] }); SONGS.push([f.value, f.label]); GROUPS.at(-1).songs.push([f.value, f.label]) }
    }
    if (!SONGS.length) for (const x of [['midis/chpn-p15.mid', 'Chopin - Raindrop Prelude'], ['minute_waltz.mid', 'Minute Waltz'], ['entertainer.mid', 'The Entertainer']]) { SONGS.push(x); (GROUPS[0] ??= { name: 'Songs', songs: [] }).songs.push(x) }
    for (const g of GROUPS) {
      $('songList').append(Object.assign(document.createElement('div'), { className: 'sect', textContent: g.name }))
      for (const [file, label] of g.songs) {
        const it = document.createElement('div')
        it.className = 'item'; it.dataset.file = file; it.dataset.q = (label + ' ' + g.name).toLowerCase()
        it.append(label, Object.assign(document.createElement('span'), { className: 'dot' }))
        it.onclick = () => { closePops(); loadSongUrl(file, label) }
        $('songList').append(it)
      }
    }
    // ── Liner notes (liner/): captions, the notes panel, sections on the seek bar
    const saveText = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000) }
    const linerLib = createLinerLibrary()
    // where the pianist is in the frame (her head and hands, in -1..1), for intertitles placed automatically
    const subjectNdc = { x: 0, y: 0 }
    // Automatic: the corner the pianist and the piano fill least (pianist/frame-space.js,
    // measured once as each intertitle appears), the one away from her when it's as good
    const frameSpace = createFrameSpace({ objects: [piano.root], skeleton: ch.skeleton || null })
    const awayFromHer = () => (subjectNdc.y < -0.25 ? 'top-' : 'bottom-') + (subjectNdc.x < -0.12 ? 'right' : 'left')
    // a part of the frame a plugin's drawing holds (the score panel: frame fractions), which intertitles keep off
    let reserved = null
    const overlaps = (a, b) => Math.max(0, Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0)) * Math.max(0, Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0)) / ((a.u1 - a.u0) * (a.v1 - a.v0))
    const freePlaces = () => {
      if (!reserved) return LANDSCAPE_PLACES
      const free = Object.fromEntries(Object.entries(LANDSCAPE_PLACES).filter(([, r]) => overlaps(r, reserved) < 0.15))
      return Object.keys(free).length ? free : LANDSCAPE_PLACES
    }
    const autoPosition = () => {
      const places = freePlaces(), prefer = awayFromHer() in places ? awayFromHer() : Object.keys(places)[0]
      try { return frameSpace.pick(camera, places, prefer).place } catch (e) { console.warn(e); return prefer }
    }
    const liner = createLinerOverlay({ seek: $('seek'), title: $('songTitle'), onSeek: t => seekTo(t), download: saveText, autoPosition })
    liner.attachMenu($('songList'), linerLib)
    window.__liner = { liner, lib: linerLib }
    for (const [k, st] of Object.entries(INTERTITLE_STYLES)) $('itStyle').append(new Option(st.label, k, k === 'serif', k === 'serif'))
    for (const [k, st] of Object.entries(INTERTITLE_STYLES)) $('itStyleA').append(new Option(st.label, k, k === 'sans', k === 'sans'))
    $('itStyleA').onchange = () => { liner.analysisStyle = $('itStyleA').value }
    // the take (seed) of the floating intertitles: in the address bar as &itseed=
    const setSeed = n => { liner.seed = n; $('itSeedV').textContent = liner.seed }
    $('itSeedPrev').onclick = () => setSeed(liner.seed - 1)
    $('itSeedNext').onclick = () => setSeed(liner.seed + 1)
    if (+params.get('itseed') > 1) { liner.seed = +params.get('itseed'); $('itSeedV').textContent = liner.seed }
    for (const [k, th] of Object.entries(INTERTITLE_THEMES)) $('itTheme').append(new Option(th.label, k, k === 'mono', k === 'mono'))
    for (const [k, label] of Object.entries(INTERTITLE_POSITIONS)) $('itPos').append(new Option(k === 'auto' ? 'Automatic (away from her and the piano)' : label, k, k === 'auto', k === 'auto'))
    $('linerMode').onchange = () => { liner.mode = $('linerMode').value; for (const id of ['itStyle', 'itStyleA', 'itTheme', 'itPos', 'itHeads', 'itSeedPrev', 'itSeedNext']) $(id).disabled = liner.mode !== 'intertitles' }
    $('itPos').onchange = () => { liner.position = $('itPos').value }
    $('itStyle').onchange = () => { liner.style = $('itStyle').value; drawPreview() }
    $('itTheme').onchange = () => { liner.theme = $('itTheme').value; drawPreview() }
    $('itHeads').onchange = () => { liner.kickers = $('itHeads').checked }
    // the song title as the first intertitle: the notes' own (screen: in the
    // front matter, or composer | title), else "Composer - Title" from the
    // song list split at the dash, with the export subtitle as its small line
    function songTitleScreen(l = liner.liner) {
      const label = $('songTitle').textContent || song?.title || ''
      const m = /^(.+?)\s+[-–]\s+(.+)$/.exec(label)
      return titleScreen(l, m ? { kicker: m[1], text: m[2], sub: $('exSub').value.trim() } : label ? { kicker: '', text: label, sub: $('exSub').value.trim() } : null)
    }
    // with the title as an intertitle the director's opening comes up from black
    // more slowly, under it (half the hold, 3–8 s); else its usual 2.5 s
    function applyTitle() {
      const on = $('exTitle').value === 'intertitle', x = on ? songTitleScreen() : null, hold = +$('exHold').value
      $('exHoldV').textContent = hold ? hold + ' s' : 'auto (' + (x ? titleSecs(x).toFixed(1) + ' s' : '7–11 s') + ')'
      $('exHold').disabled = !on
      liner.setTitle(x && hold ? { ...x, hold } : x)
      director.opts.fadeIn = x ? Math.min(8, Math.max(3, titleSecs(hold ? { ...x, hold } : x) / 2)) : 2.5
    }
    $('exTitle').addEventListener('change', applyTitle)
    $('exHold').addEventListener('input', () => { applyTitle(); drawPreview() })
    applyTitle()
    $('exSub').addEventListener('input', applyTitle)
    let linerSeq = 0
    async function attachLiner(midi, file, duration) {
      const seq = ++linerSeq
      liner.set(null)
      const l = await linerLib.forFile(file)
      if (seq !== linerSeq) return
      if (l) liner.set(l, buildTimeline(l, clockOfMidi(midi), duration), duration)
      applyTitle()
    }
    $('songFilter').oninput = () => {
      const q = $('songFilter').value.trim().toLowerCase()
      for (const el of $('songList').children) if (!el.classList.contains('sect')) el.style.display = !q || el.dataset.q.includes(q) ? '' : 'none'
    }
    const markSong = file => { for (const it of $('songList').querySelectorAll('.item')) it.classList.toggle('sel', it.dataset.file === file) }

    let song = null, scheduler = null
    const music = { songT: 0, wall: 0 }
    const songNow = () => !scheduler ? 0 : !scheduler.playing ? scheduler.currentTime : Math.min(scheduler.duration, music.songT + (performance.now() - music.wall) / 1000 * scheduler.speed)
    const pedals = [false, false, false]
    const held = new Map()
    const songTarget = {
      audioContext: audioCtx,
      resume: () => audioCtx.resume(),
      // sound only: the keys and pedals follow the picture's clock (driveKeys)
      noteOn(m, v, c) { if (c === 9) return; if (soundReady) engine.noteOn(m, v, c) },
      noteOff(m, c) { if (c === 9) return; engine.noteOff(m, c) },
      controlChange(c, cc, v) { engine.controlChange(c, cc, v) },
      allSoundOff() {
        for (let c = 0; c < 16; c++) engine.controlChange(c, 64, 0)
        engine.allNotesOff?.()
        releaseKeys()
      },
    }
    function songCC(cc, v) {
      if (cc === 64) { pedals[2] = v >= 64; piano.setSustain(pedals[2]) }
      if (cc === 67) piano.setPedal(0, pedals[0] = v >= 64)
      if (cc === 66) piano.setPedal(1, pedals[1] = v >= 64)
    }
    function releaseKeys() {
      for (const m of held.keys()) piano.noteOff(m)
      held.clear(); pedals.fill(false); piano.setSustain(false); piano.setPedal(0, false); piano.setPedal(1, false)
      keysAt.t = null; keysAt.active = []
    }
    // the keys and pedals at song time t (forward steps; a jump restarts)
    const keysAt = { t: null, idx: 0, cc: 0, active: [] }
    const keyOn = n => { held.set(n.midi, (held.get(n.midi) || 0) + 1); piano.noteOn(n.midi, n.velocity) }
    const keyOff = n => { const k = (held.get(n.midi) || 1) - 1; if (k <= 0) { held.delete(n.midi); piano.noteOff(n.midi) } else held.set(n.midi, k) }
    function driveKeys(t) {
      const notes = song.notes, ccs = song.controlChanges || [], K = keysAt
      if (K.t == null || t < K.t || t > K.t + 0.5) {
        releaseKeys(); K.idx = 0; K.cc = 0
        while (K.idx < notes.length && notes[K.idx].time < t) { const n = notes[K.idx++]; if (n.time + n.duration > t) { keyOn(n); K.active.push(n) } }
        while (K.cc < ccs.length && ccs[K.cc].time <= t) { const c = ccs[K.cc++]; songCC(c.controller, c.value) }
      } else {
        for (let i = K.active.length - 1; i >= 0; i--) if (K.active[i].time + K.active[i].duration <= t) { keyOff(K.active[i]); K.active.splice(i, 1) }
        while (K.cc < ccs.length && ccs[K.cc].time <= t) { const c = ccs[K.cc++]; songCC(c.controller, c.value) }
        while (K.idx < notes.length && notes[K.idx].time <= t) { const n = notes[K.idx++]; keyOn(n); K.active.push(n) }
      }
      K.t = t
    }
    // ── Picture / sound sync (as #030) ───────────────────────────────────
    // The picture runs on the time of the note being HEARD: the scheduler's
    // worklet posts each note POST_AHEAD early and the synth plays it on
    // arrival into the next buffer of its chain; the chain's end, measured
    // against the speakers' output timestamp, gives the rest of the delay.
    const POST_AHEAD = 0.05    // soundfont-engine/src/scheduler-worklet.js
    const KEY_LEAD = 0.03      // a key starts down this long before its note, to bottom out on it
    function heardNow(c) {
      const ts = c.getOutputTimestamp?.()
      if (ts?.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000
      return c.currentTime - (c.outputLatency || 0) - (c.baseLatency || 0)
    }
    // after the song ends the picture runs on a few seconds (the hands lift
    // off, she settles) while the sound and the song clock have stopped
    const AFTER_END = 6   // (s the picture runs on past the end: the lift-off, the move to the middle, the hands to the lap)
    let endedAt = null
    function pictureTime(dt) {
      if (!scheduler?.playing) {
        avs.t = null
        const t = songNow()
        if (endedAt && Math.abs(t - endedAt.t) < 0.05) return t + Math.min(AFTER_END, (performance.now() - endedAt.wall) / 1000 * (scheduler?.speed || 1))
        endedAt = null
        return t
      }
      endedAt = null
      if (avs.ctx && avs.end) {
        const lag = avs.end - heardNow(avs.ctx)
        if (lag > -0.05 && lag < 1) { avs.lag = avs.measured ? avs.lag + (lag - avs.lag) * Math.min(1, dt * 2) : lag; avs.measured = true }
      }
      const sp = scheduler.speed || 1
      const goal = songNow() + POST_AHEAD - (Math.max(0, avs.lag) + +$('avsync').value / 1000) * sp
      if (avs.t == null || Math.abs(goal - avs.t) > 0.15) avs.t = goal
      else { avs.t += dt * sp; avs.t += (goal - avs.t) * Math.min(1, dt * 3) }
      return avs.t
    }
    $('avsync').value = params.get('avsync') ?? 0
    $('avsync').oninput = () => { const v = +$('avsync').value; $('avsyncV').textContent = (v > 0 ? '+' : '') + v + ' ms' }
    $('avsync').oninput()
    window.__pianist.avs = avs
    async function ensureScheduler() {
      if (scheduler) return scheduler
      scheduler = new MidiScheduler(songTarget)
      await scheduler.init()
      scheduler.on('time', t => { music.songT = t; music.wall = performance.now(); showTime(t) })
      scheduler.on('end', () => {
        songTarget.allSoundOff()
        if (loop) { scheduler.seek(0); music.songT = 0; music.wall = performance.now(); scheduler.play(); return }
        // (the worklet's clock runs on after the end unless it is paused: the
        // picture used to run on with it, past the baked motion)
        scheduler.pause()
        setPlaying(false)
        endedAt = { t: scheduler.currentTime, wall: performance.now() }
        if ($('applause').checked && !exporting) hall.applause()
      })
      return scheduler
    }
    // fingering in a worker (fingering/fingering.js), then the rig plays it
    let fingerWorker = null, fingerJob = 0
    function quickHands(notes) {
      // until the fingering arrives: split at middle C, fingers by position
      return notes.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, hand: n.midi < 60 ? 'L' : 'R', finger: 0, velocity: n.velocity }))
    }
    // Hands (fingering/hands.js): the file's own split where its tracks name the
    // hands (Performance > Hands, ?hands=tracks), or the fingering's (?hands=auto)
    let handsSource = 'auto'
    function fingerInWorker(notes) {
      const job = ++fingerJob
      handsSource = assignHands(notes, song?.trackNames, $('hands').value).source
      $('handsV') && ($('handsV').textContent = handsSource === 'tracks' ? 'from the tracks' : 'automatic')
      fingerWorker?.terminate()
      const url = new URL('../fingering/fingering.js', import.meta.url).href
      const src = `import { fingerPiece, CHOPIN } from ${JSON.stringify(url)}
        onmessage = e => { const r = fingerPiece(e.data.notes, e.data.chopin ? CHOPIN : {}); postMessage(r.notes.map(n => [n.hand, n.finger || 0, n.release])) }`
      fingerWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' })
      fingerWorker.onmessage = e => {
        if (job !== fingerJob) return
        lesson.setNotes(notes, e.data)
        const out = notes.map((n, i) => { const [h, f, rel] = e.data[i]; return { pitch: n.midi, on: n.time, off: n.time + n.duration, release: rel, hand: h, finger: f, velocity: n.velocity } })
        fingerWorker.terminate(); fingerWorker = null
        rig.setNotes(out)
        dirSource = { duration: out.reduce((m, n) => Math.max(m, n.off), 0), ...rig.form(), energyAt: rig.music.energyAt }
        director.setSong(dirSource); director2?.setSong(dirSource)
        fingered = true
      }
      fingerWorker.postMessage({ chopin: $('fingering')?.value === 'chopin', notes: notes.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, velocity: n.velocity, ...(n.hand ? { hand: n.hand } : {}) })) })
    }
    let fingered = false
    async function loadSong(buffer, name, at = 0) {
      try {
        const sch = await ensureScheduler()
        if (sch.playing) sch.stop()
        songTarget.allSoundOff()
        const midi = new Midi(buffer), s = midiToSchedule(midi)
        s.notes = s.notes.filter(n => n.channel !== 9 && n.midi >= LOW && n.midi <= HIGH)
        if (!s.notes.length) throw new Error('no notes in file')
        s.duration = s.notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
        s.title = s.title || String(name || '').replace(/\.midi?$/i, '')
        song = s; fingered = false
        plug.onSong?.(s, midi, app)
        attachLiner(midi, songFile || name, s.duration)
        rig.clear()
        fingerInWorker(s.notes)
        await ensureSound()
        sch.load(s); sch.speed = speeds[speedI]
        if (at > 0 && at < s.duration) sch.seek(at)
        unlockAudio()
        music.songT = sch.currentTime; music.wall = performance.now()
        sch.play(); setPlaying(true); setStatus('')
      } catch (e) { console.error(e); setStatus(`Could not play ${name}: ${e.message}`, true, 5000) }
    }
    let songFile = null   // the list song playing (for shared links)
    const songLabel = file => SONGS.find(x => x[0] === file)?.[1] || String(file || '').split('/').pop().replace(/\.midi?$/i, '')
    async function loadSongUrl(url, label, at = 0) {
      markSong(url); songFile = url
      $('songTitle').textContent = label || songLabel(url)
      setStatus('Loading song…')
      try { await loadSong(await (await fetch(encodeURI(url))).arrayBuffer(), label, at) }
      catch (e) { setStatus('Could not load song: ' + e.message, true, 5000) }
    }
    $('openFile').onclick = () => { closePops(); $('file').click() }
    $('file').onchange = async () => { const f = $('file').files[0]; if (f) { markSong(null); songFile = null; $('songTitle').textContent = f.name.replace(/\.midi?$/i, ''); loadSong(await f.arrayBuffer(), f.name) } $('file').value = '' }
    addEventListener('dragover', ev => ev.preventDefault())
    addEventListener('drop', async ev => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) { markSong(null); songFile = null; loadSong(await f.arrayBuffer(), f.name) } })
    const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    let seeking = false
    function showTime(t) {
      const d = song?.duration || 0
      $('tNow').textContent = `${fmt(t)}.${String(Math.floor((t % 1) * 1000)).padStart(3, '0')}`
      $('tLeft').textContent = '-' + fmt(Math.max(0, d - t))
      if (!seeking) { $('seek').value = d ? t / d : 0; $('seek').style.setProperty('--p', (d ? t / d * 100 : 0) + '%') }
    }
    const setPlaying = on => { if (on) $('start').classList.add('gone'); $('playIcon').innerHTML = on ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>' : '<path d="M7 4v16l13-8z"/>'; poke() }
    async function togglePlay() {
      if (!song) {
        if (sharedSong) { const [f, at] = sharedSong; sharedSong = null; return loadSongUrl(f, SONGS.find(x => x[0] === f)?.[1] || f.split('/').pop(), at) }
        const d = defaultSong() || SONGS[0]; return loadSongUrl(d[0], d[1])
      }
      const sch = await ensureScheduler(); unlockAudio()
      if (sch.playing) { sch.pause(); songTarget.allSoundOff(); setPlaying(false) }
      else {
        // at the end: from the top
        if (sch.currentTime >= sch.duration - 0.05) { sch.seek(0); music.songT = 0 }
        music.wall = performance.now(); sch.play(); setPlaying(true)
      }
    }
    $('playBtn').onclick = togglePlay
    // ⏮ ⏭ and a swipe along the bottom bar: the previous / next song in the
    // current group of the list (wrapping round); with no song yet, the first
    function stepSong(d) {
      const g = GROUPS.find(g => g.songs.some(x => x[0] === songFile))
      if (!g) { const [f, l] = SONGS[0]; return loadSongUrl(f, l) }
      const i = g.songs.findIndex(x => x[0] === songFile), [f, l] = g.songs[(i + d + g.songs.length) % g.songs.length]
      sharedSong = null
      loadSongUrl(f, l)
    }
    $('prevBtn').onclick = () => stepSong(-1)
    $('nextBtn').onclick = () => stepSong(1)
    {
      let sw = null
      $('transport').addEventListener('pointerdown', ev => { if (!ev.target.closest('input, button')) sw = [ev.clientX, ev.clientY, performance.now()] })
      $('transport').addEventListener('pointerup', ev => {
        if (!sw) return
        const dx = ev.clientX - sw[0], dy = ev.clientY - sw[1], ms = performance.now() - sw[2]; sw = null
        if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && ms < 800) { stepSong(dx < 0 ? 1 : -1); setStatus(dx < 0 ? 'Next song' : 'Previous song', false, 1000) }
      })
      $('transport').addEventListener('pointercancel', () => { sw = null })
      $('transport').style.touchAction = 'pan-y'
    }
    $('seek').addEventListener('input', () => { seeking = true })
    $('seek').addEventListener('change', () => { seeking = false; if (scheduler) seekTo(+$('seek').value * scheduler.duration) })
    function seekTo(t) {
      if (!scheduler || !song) return
      songTarget.allSoundOff(); scheduler.seek(Math.max(0, Math.min(t, scheduler.duration)))
      music.songT = scheduler.currentTime; music.wall = performance.now()
      showTime(scheduler.currentTime)
    }
    const speeds = [0.5, 0.75, 1, 1.25]
    let speedI = 2, loop = false
    $('speedBtn').onclick = () => { speedI = (speedI + 1) % speeds.length; $('speedLbl').textContent = speeds[speedI] + '×'; if (scheduler) { music.songT = songNow(); music.wall = performance.now(); scheduler.speed = speeds[speedI] } }
    $('loopBtn').onclick = () => { loop = !loop; $('loopBtn').classList.toggle('off', !loop) }

    // ── Shareable state ──────────────────────────────────────────────────
    // Every option lives in the address bar as a short query key (only the
    // ones that differ from the default, or from the chosen outfit), so a
    // reload or a copied link brings back the same scene. Share adds the
    // song position (&at=); a shared song starts on the first click.
    const STATE = [
      // key, control (selects / ranges / colours: value; checkboxes: 1 / 0)
      ['outfit', 'outfit'], ['dress', 'dressStyle'], ['slit', 'slit'], ['fabric', 'fabric'], ['dcol', 'dressColor'], ['shoes', 'shoeStyle'],
      ['hair', 'hairStyle'], ['hcol', 'hairColor'], ['density', 'hairDensity'], ['hairon', 'hairOn'], ['hairsim', 'hairSim'],
      ['dresson', 'dressOn'], ['clothsim', 'clothSim'], ['vdress', 'vdress'], ['look', 'look'], ['smooth', 'smooth'], ['simplify', 'simplify'],
      ['gaze', 'gaze'], ['expr', 'expr'], ['rest', 'restAfter'], ['hips', 'hips'], ['posture', 'posture'], ['reach', 'reach'], ['rock', 'rock'], ['sway', 'sway'], ['nod', 'nod'], ['glances', 'glances'], ['armw', 'armw'], ['lifth', 'lifth'], ['wflex', 'wflex'], ['frot', 'frot'], ['elbow', 'elbowLead'], ['liftoff', 'liftoff'], ['bench', 'benchDist'], ['benchh', 'benchH'],
      ['touch', 'touch'], ['fingering', 'fingering'], ['hands', 'hands'],
      ['light', 'light'], ['exposure', 'exposure'], ['dof', 'dof'], ['scene', 'stageSet'], ['finish', 'finish'], ['lid', 'lid'],
      ['fasian', 'faceAsian'], ['fafrican', 'faceAfrican'], ['skintex', 'skinTex'],
      ['move', 'camMove'], ['pace', 'dirPace'], ['favour', 'dirBias'], ['trans', 'dirTrans'], ['shotnames', 'shotLbl'], ['follow', 'camFollow'], ['dfar', 'dirFar'], ['dmed', 'dirMed'], ['dclose', 'dirClose'], ['strings', 'dirStrings'], ['dpedals', 'dirPedals'], ['dopen', 'dirOpen'],
      ['sf', 'sf'], ['avsync', 'avsync'],
      ['dofamt', 'dofAmt'], ['bloom', 'bloom'], ['bloomamt', 'bloomAmt'], ['grain', 'filmGrain'], ['grainamt', 'grainAmt'], ['vig', 'vig'], ['dust', 'dust'], ['dustamt', 'dustAmt'],
      ['vol', 'vol'], ['room', 'room'], ['seat', 'seat'], ['rv', 'rvAmt'], ['decay', 'rvDecay'], ['tone', 'rvTone'], ['boost', 'boost'], ['amb', 'amb'], ['applause', 'applause'],
      ['exformat', 'exFormat'], ['exlayout', 'exLayout'], ['exsplit', 'exSplit'], ['exhands', 'exHandsHalf'], ['exlview', 'exLessonView'], ['excam', 'exCam'], ['exfont', 'exFont'], ['exres', 'exRes'], ['exfps', 'exFps'], ['extail', 'exTail'], ['exsub', 'exSub'], ['excard', 'exCard'], ['excaps', 'exCaps'], ['exvtt', 'exVtt'], ['exlen', 'exLen'], ['exhold', 'exHold'],
      ['notes', 'linerMode'], ['itstyle', 'itStyle'], ['itstylea', 'itStyleA'], ['itcol', 'itTheme'], ['itpos', 'itPos'], ['itheads', 'itHeads'], ['extitle', 'exTitle'], ['expt', 'exPt'], ['ptengine', 'ptEngine'], ['ptspp', 'ptSpp'], ['ptbounces', 'ptBounces'], ['pthair', 'ptHair'], ['ptdn', 'ptDenoise'], ['ptfx', 'ptFx'], ['ptsize', 'ptSize'],
    ].filter(([, id]) => $(id))
    const OUTFIT_KEYS = { dress: 'dress', slit: 'slit', fabric: 'fabric', dcol: 'color', shoes: 'shoes', hair: 'hair', hcol: 'hairColor' }
    // (colours without their #, so links stay readable)
    const hex = v => String(v).replace(/^#/, '')
    const ctlGet = el => el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.type === 'color' ? hex(el.value) : String(el.value)
    const ctlDefault = el => el.type === 'checkbox' ? (el.defaultChecked ? '1' : '0')
      : el.tagName === 'SELECT' ? ([...el.options].find(o => o.defaultSelected) || el.options[0])?.value ?? ''
      : el.type === 'color' ? hex(el.defaultValue) : el.defaultValue
    const same = (a, b) => a === b || (a !== '' && b !== '' && !isNaN(a) && !isNaN(b) && +a === +b) || a.toLowerCase?.() === b.toLowerCase?.()
    // load: controls the start-up code did not already take from the URL
    // (the wardrobe, pose and director keys are read above) get their value
    // and their own handler, exactly as if picked in the menu
    // (links from before the path-trace settings were one set: expt named the
    // tracer, exptspp / exptdn the video's samples and denoise)
    if (/^(gpt|mu)-/.test(params.get('expt') || '')) { if (!params.has('ptengine')) params.set('ptengine', params.get('expt')); params.set('expt', 'pt') }
    for (const [o, n] of [['exptspp', 'ptspp'], ['exptdn', 'ptdn']]) if (params.has(o) && !params.has(n)) params.set(n, params.get(o))
    for (const [k, id] of STATE) {
      if (!params.has(k)) continue
      const el = $(id), v = params.get(k)
      if (same(ctlGet(el), el.type === 'color' ? hex(v) : v === '' && el.type === 'checkbox' ? '1' : v)) continue
      if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) continue   // (unknown or old value: keep what the page chose)
      if (el.type === 'color' && !/^#?[0-9a-f]{6}$/i.test(v)) continue
      if (el.type === 'checkbox') el.checked = v !== '0'; else el.value = el.type === 'color' ? '#' + hex(v) : v
      el.dispatchEvent(new Event(el.type === 'range' || el.type === 'color' ? 'input' : 'change'))
    }
    if (params.get('speed') && speeds.includes(+params.get('speed'))) { speedI = speeds.indexOf(+params.get('speed')); $('speedLbl').textContent = speeds[speedI] + '×' }
    if (params.get('loop') === '1') { loop = true; $('loopBtn').classList.remove('off') }
    {
      const c = (params.get('cam') || '').split(',').map(Number)
      if (c.length === 6 && c.every(Number.isFinite) && view !== 'auto') { camSnap = c.join(','); camGoal.pos.set(c[0], c[1], c[2]); camGoal.target.set(c[3], c[4], c[5]); controls.autoRotate = false; camFree = true }
    }
    let sharedSong = !params.has('shot') && params.get('song') ? [params.get('song'), +(params.get('at') || 0)] : null
    if (sharedSong) { markSong(sharedSong[0]); songFile = sharedSong[0]; $('songTitle').textContent = songLabel(sharedSong[0]) }
    // the start screen: dimmed, Play in the middle, the song it will play
    // (a shared link's, else the Raindrop prelude); it goes when anything plays
    {
      const first = sharedSong ? songLabel(sharedSong[0]) : (defaultSong() || SONGS[0])?.[1]
      $('start').querySelector('.t').textContent = first || ''
      $('start').onclick = ev => { ev.stopPropagation(); $('start').classList.add('gone'); unlockAudio(); if (!scheduler?.playing) togglePlay() }
      $('start').addEventListener('pointerdown', ev => ev.stopPropagation())
      if (params.has('shot') || params.get('start') === '0') $('start').classList.add('gone')
    }
    function stateQuery(withTime = false) {
      const q = new URLSearchParams(location.search)
      const o = OUTFITS[$('outfit').value]
      for (const [k, id] of STATE) {
        const el = $(id), v = ctlGet(el)
        const base = o && o[OUTFIT_KEYS[k]] != null ? (el.type === 'color' ? hex(o[OUTFIT_KEYS[k]]) : o[OUTFIT_KEYS[k]]) : ctlDefault(el)
        if (same(v, base)) q.delete(k); else q.set(k, v)
      }
      if (view === 'back') q.delete('view'); else q.set('view', view)
      if (camFree && view !== 'auto' && withTime) snapCam()   // (Share: exactly what is on screen)
      if (camFree && view !== 'auto' && camSnap) q.set('cam', camSnap); else q.delete('cam')
      if (speeds[speedI] === 1) q.delete('speed'); else q.set('speed', speeds[speedI])
      if (loop) q.set('loop', '1'); else q.delete('loop')
      if (liner.seed > 1) q.set('itseed', liner.seed); else q.delete('itseed')
      if (songFile) q.set('song', songFile); else q.delete('song')
      if (isShort() && short.b > short.a) q.set('clip', `${short.a.toFixed(1)}-${short.b.toFixed(1)}`); else q.delete('clip')
      q.delete('short')
      const t = song ? songNow() : sharedSong?.[1] || 0
      if ((withTime || sharedSong) && songFile && t > 0.5) q.set('at', t.toFixed(1)); else q.delete('at')   // (a shared position stays until it plays)
      return q.toString().replace(/%2F/g, '/').replace(/%2C/g, ',')
    }
    // keep the address bar current (cheap: a string build twice a second), but
    // not while a song plays: rewriting it under the user breaks typing or
    // copying in it. It catches up on pause (Share always has the latest)
    if (!params.has('shot')) setInterval(() => {
      if (scheduler?.playing) return
      const q = stateQuery(), url = location.pathname + (q ? '?' + q : '') + location.hash
      if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url)
    }, 500)
    // restore defaults: reload with no options (keeps ?q=low, the song and where it was)
    $('resetAll').onclick = () => {
      if (!confirm('Restore every option to its default?')) return
      const q = new URLSearchParams()
      if (params.get('q')) q.set('q', params.get('q'))
      if (songFile) { q.set('song', songFile); const t = song ? songNow() : sharedSong?.[1] || 0; if (t > 0.5) q.set('at', t.toFixed(1)) }
      location.href = location.pathname + (q.toString() ? '?' + q.toString().replace(/%2F/g, '/') : '')
    }
    $('shareBtn').onclick = async () => {
      const q = stateQuery(true), url = location.origin + location.pathname + (q ? '?' + q : '')
      try { await navigator.clipboard.writeText(url); setStatus('Link copied' + (q.includes('at=') ? ' (with the song position)' : ''), false, 2500) }
      catch { prompt('Copy this link:', url) }
    }

    // ── Frame ────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let fixedT = null   // ?t= for headless stills: song time to pose at
    const head = new THREE.Vector3(), handsC = new THREE.Vector3(), _ndc = new THREE.Vector3()
    // depth of field (pianist/focus-puller.js): her eyes for the face, a hand the puller picks for the hands;
    // a second puller for the hands half of a stacked Short
    const focusPull = createFocusPuller(), focusPull2 = createFocusPuller()
    const eyesC = new THREE.Vector3(), hasEyes = !!(ch.byName?.['eye.L'] && ch.byName?.['eye.R'])
    const eyesAt = () => hasEyes ? eyesC.copy(rig.pos('eye.L')).add(rig.pos('eye.R')).multiplyScalar(0.5) : head
    const dofOf = name => SHOT_DOF[name] ?? 1
    let lastShot2 = null
    let fxT = 0, exporting = false, exTitleCard = false
    function frame() {
      const dt = Math.min(clock.getDelta(), 1 / 20)
      step(dt, fixedT ?? pictureTime(dt), false)
      shortTick()
    }
    // offline: the export drives song time and the keys itself (see stageAdapter)
    function step(dt, t, offline) {
      if (offline || (fixedT == null && song && scheduler?.playing)) driveKeys(t + KEY_LEAD)
      fxT += dt
      dust.material.uniforms.uTime.value = fxT
      piano.update(dt)
      for (const p of Object.values(stageProps)) if (p.root.visible) p.update?.(dt, fxT)
      rig.setPedals(pedals[0], pedals[1], pedals[2])
      rig.update(t, dt)
      ch.group.updateMatrixWorld(true)
      wardrobeUpdate(dt)
      // the subjects: her head, the hands (where they rest when not playing)
      head.copy(rig.pos('head'))
      const hd = rig.hands
      handsC.set(0, 76, 0); let n = 0
      for (const d of [hd.L, hd.R]) if (d.visible) { if (!n) handsC.set(0, 0, 0); handsC.add(d.joints.W); n++ }
      if (n) handsC.multiplyScalar(1 / n)
      // camera
      if (userCam && view !== 'orbit' && (view === 'auto' || $('camMove').value !== 'still') && performance.now() - camTouched > 8000) userCam = false
      let focusOn = viewFocusHands(view) ? handsC : head, wide = viewWide(view), snapFocus = false
      if (cut) { camera.position.copy(camGoal.pos); controls.target.copy(camGoal.target); camera.fov = camGoal.fov; camera.updateProjectionMatrix(); cut = false; userCam = false; snapFocus = true }
      const live = { hands: handsC, head }
      if (view === 'player') playerView(handsC, dt)
      setPov(view === 'player' && !userCam)
      if (povOn && hair?.object.visible) hair.object.visible = false
      const dirShot = view === 'auto' ? director.update(song ? t : null, dt, live) : null   // runs even while dragged, so the subjects stay tracked
      let driven = null
      if (dirShot && !userCam) {
        driven = dirShot
        focusOn = dirShot.focus === 'hands' ? handsC : dirShot.focus === 'target' ? dirShot.target : head; wide = dirShot.wide
        if (dirShot.shot !== lastShot) {
          if (!dirShot.shot.glide || !lastShot) snapFocus = true
          lastShot = dirShot.shot
          const sp = SPOTS[dirShot.shot.name]
          $('shotName').textContent = `${sp.label} · ${MOVES[dirShot.shot.move].toLowerCase()}${dirShot.shot.glide ? ' (glide)' : ''}`
        }
      } else if (!dirShot && view !== 'orbit' && $('camMove').value !== 'still' && !userCam) {
        moveT += dt
        const mv = $('camMove').value
        if (SEQ_MOVES[mv]) {
          driven = director.sequence(VIEWS[view], mv, moveT, live, camOut)
          if (driven.focus) focusOn = driven.focus === 'hands' ? handsC : head
          if (driven.frame !== 'home') wide = driven.wide
          if (driven.shot !== lastShot) {
            if (!driven.shot.blend) snapFocus = true
            lastShot = driven.shot
            $('shotName').textContent = `${SEQ_MOVES[mv]} · ${driven.frame === 'home' ? '' : FRAME_LABELS[driven.frame] + ', '}${MOVES[driven.move].toLowerCase()}${driven.shot.blend ? ' (glide)' : ''}`
          }
        } else driven = director.fixed(VIEWS[view], mv, moveT, camOut)
      } else if (!dirShot && view === 'player' && !userCam) {
        // a still player's view still rides with her head
        camOut.pos.fromArray(VIEWS.player.pos); camOut.target.fromArray(VIEWS.player.target); camOut.fov = VIEWS.player.fov; driven = camOut
      }
      if (driven) {
        camera.position.copy(driven.pos); controls.target.copy(driven.target); camera.lookAt(driven.target)
        if (Math.abs(camera.fov - driven.fov) > 1e-3) { camera.fov = driven.fov; camera.updateProjectionMatrix() }
      } else controls.update()
      // (where she is in the frame: for intertitles placed automatically)
      { const a = _ndc.copy(head).project(camera), ax = a.x, ay = a.y, b = _ndc.copy(handsC).project(camera); subjectNdc.x = (ax + b.x) / 2; subjectNdc.y = Math.max(ay, b.y) }
      // focus: her eyes in the shots of her, a hand in the shots of the hands, the
      // shot's aim on the mechanism; shallower the closer (pianist/focus-puller.js)
      {
        const f = focusPull.update({ camera, dt, subject: focusOn === handsC ? 'hands' : focusOn === head ? 'head' : 'target', hands: rig.hands, handsMid: handsC,
          eyes: focusOn === head ? eyesAt() : null, target: focusOn, snap: snapFocus, amount: +$('dofAmt').value, shot: dofOf(driven?.shot?.name ?? view) })
        bokeh.uniforms.focus.value = f.focus; bokeh.uniforms.aperture.value = f.aperture
      }
      // (the director's fade-in only while the song runs: a loaded song paused at 0 isn't black)
      renderer.toneMappingExposure = +$('exposure').value * (dirShot && !userCam && ((offline && !exTitleCard) || scheduler?.playing) ? dirShot.fade ?? 1 : 1)
      grain.uniforms.uTime.value = fxT
      if (!offline && scheduler?.playing && performance.now() - idleT > 2500) document.body.classList.add('idle')
      if (!offline) { liner.update(songNow()); plug.onFrame?.(songNow(), app) }
      // nothing to post-process on the light path: draw straight to the screen
      if (stacked) drawStacked(t, dt, live)
      else if (LOWQ && !bokeh.enabled && !bloom.enabled && !$('filmGrain').checked) renderer.render(scene, camera)
      else composer.render()
    }
    // ── Stacked Short: her above, the hands below ──
    // The composer is sized to one half; each half is rendered into its own
    // viewport (scissored) with its own camera, focus and depth of field: the
    // top from the director as placed above, the bottom from director2 (the
    // hands' plan). A thin black seam between them.
    const stackGap = h => Math.max(2, Math.round(h * 0.003))
    // [her, the hands] in pixels: Split (her / hands) shares the frame
    const stackHs = h => { const a = Math.round((h - stackGap(h)) * (+$('exSplit').value || 50) / 100); return [a, h - stackGap(h) - a] }
    const stackH = h => Math.max(...stackHs(h))   // (the composer: the taller half; the other is drawn into it, scaled)
    const lessonCam = new THREE.Vector3(), lessonTgt = new THREE.Vector3(), lessonFit = { key: '' }
    const _sz = new THREE.Vector2(), _topPos = new THREE.Vector3(), _topTgt = new THREE.Vector3(), _clear = new THREE.Color()
    // each half's lens: the aspect of its own viewport (zoomed out a little when
    // it's taller than 16:10, as the page does for a phone held upright)
    const lens = (w, hh) => { camera.aspect = w / hh; camera.zoom = Math.max(0.55, Math.min(1, camera.aspect / 1.6)); camera.updateProjectionMatrix(); bokeh.uniforms.aspect.value = camera.aspect }
    function drawStacked(t, dt, live) {
      const { x: w, y: h } = renderer.getSize(_sz), [ht, hb] = stackHs(h)
      const draw = () => LOWQ && !bokeh.enabled && !bloom.enabled && !$('filmGrain').checked ? renderer.render(scene, camera) : composer.render()
      const aspect0 = camera.aspect, zoom0 = camera.zoom, bokehOn = bokeh.enabled
      renderer.setScissorTest(true)
      lens(w, ht)
      renderer.setViewport(0, h - ht, w, ht); renderer.setScissor(0, h - ht, w, ht); draw()
      _topPos.copy(camera.position); _topTgt.copy(controls.target)
      const topFov = camera.fov, topFocus = bokeh.uniforms.focus.value, topAp = bokeh.uniforms.aperture.value
      lens(w, hb)
      if ($('exHandsHalf').value === 'lesson') {
        // the lesson view (first person or from above): the whole keyboard across
        // the half (moved back until 130 cm of keys fit its width), sharp throughout
        const LV = LESSON_VIEWS[$('exLessonView').value] || LESSON_VIEWS.first
        lessonTgt.fromArray(LV.target); lessonCam.fromArray(LV.pos)
        camera.fov = LV.fov; camera.updateProjectionMatrix()
        lesson.setTilt(LV.tilt)
        if (LV.fit === 'fov') {
          // (in front of her face: the lens widened until both ends of the keyboard
          // fit, and tilted so its front edge sits near the bottom of the half and
          // the lane rises above it; worked out once per half's shape)
          const key = `${camera.aspect.toFixed(3)},${camera.zoom.toFixed(3)}`
          if (lessonFit.key !== key) {
            const P = new THREE.Vector3(), aim = new THREE.Vector3()
            const ndc = (x, y, z) => P.set(x, y, z).project(camera)
            let fov = LV.fov, ty = LV.target[1]
            for (; fov <= 90; fov += 1) {
              camera.fov = fov; camera.updateProjectionMatrix()
              let lo = DIM.KEY_TOP - 60, hi = DIM.KEY_TOP + 160
              for (let i = 0; i < 24; i++) {
                ty = (lo + hi) / 2
                camera.position.copy(lessonCam); camera.lookAt(aim.set(0, ty, LV.target[2])); camera.updateMatrixWorld()
                if (ndc(0, DIM.KEY_TOP, 2).y < -0.84) hi = ty; else lo = ty
              }
              if (Math.abs(ndc(66, DIM.KEY_TOP, 2).x) < 0.96) break
            }
            lessonFit.key = key; lessonFit.fov = fov; lessonFit.ty = ty
          }
          camera.fov = lessonFit.fov; camera.updateProjectionMatrix()
          lessonTgt.set(0, lessonFit.ty, LV.target[2])
        } else {
          const half = Math.tan(camera.fov * Math.PI / 360) / camera.zoom * camera.aspect, need = 66 / half
          lessonCam.sub(lessonTgt).setLength(Math.max(need, lessonCam.length())).add(lessonTgt)
        }
        camera.position.copy(lessonCam); camera.lookAt(lessonTgt)
        lesson.update(t, hb)
        bokeh.enabled = false
        lesson.begin()
        renderer.setViewport(0, 0, w, hb); renderer.setScissor(0, 0, w, hb); draw()
        lesson.end()
        bokeh.enabled = bokehOn
      } else {
        // the hands (their own plan; it runs every frame so its operator keeps up)
        const c = director2.update(t, dt, live)
        camera.position.copy(c.pos); camera.lookAt(c.target)
        if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix() }
        const f2 = focusPull2.update({ camera, dt, subject: c.focus === 'target' ? 'target' : 'hands', hands: rig.hands, handsMid: live.hands, target: c.target,
          snap: c.shot !== lastShot2, amount: +$('dofAmt').value, shot: dofOf(c.shot?.name) })
        lastShot2 = c.shot
        bokeh.uniforms.focus.value = f2.focus; bokeh.uniforms.aperture.value = f2.aperture
        renderer.setViewport(0, 0, w, hb); renderer.setScissor(0, 0, w, hb); draw()
      }
      // the seam
      renderer.getClearColor(_clear); const ca = renderer.getClearAlpha()
      renderer.setScissor(0, hb, w, h - ht - hb); renderer.setClearColor(0x000000, 1); renderer.clear(true, false, false); renderer.setClearColor(_clear, ca)
      renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h)
      camera.position.copy(_topPos); camera.lookAt(_topTgt)
      camera.fov = topFov; camera.aspect = aspect0; camera.zoom = zoom0; camera.updateProjectionMatrix(); bokeh.uniforms.aspect.value = aspect0
      bokeh.uniforms.focus.value = topFocus; bokeh.uniforms.aperture.value = topAp
    }
    renderer.setAnimationLoop(frame)
    function resize(w, h, style = true) {
      // taller than 16:10 (a phone held upright): widen the lens so the shots
      // keep about the same width of the scene
      // (a Short's spots are framed for 9:16 themselves)
      // (stacked: each half is its own picture, w × about h / 2, with landscape framings)
      const ch = stacked ? stackH(h) : h, ca = stacked ? stackHs(h)[0] : h
      camera.zoom = shortFrame && !stacked ? 1 : Math.max(0.55, Math.min(1, (w / ca) / 1.6))
      camera.aspect = w / ca; camera.updateProjectionMatrix()
      renderer.setSize(w, h, style); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, ch)
      dust.material.uniforms.uScale.value = ch * renderer.getPixelRatio()
    }
    addEventListener('resize', () => { if (!exporting) liveResize() })
    resize(innerWidth, innerHeight)

    // ── Video export (as #030) ───────────────────────────────────────────
    // notation3d/video-export.js renders frame by frame at a fixed timestep
    // with the audio synthesised offline and run through the same hall. The
    // picture is a function of song time (fingering, body, director), so the
    // film is the one you'd see live, without dropped frames.
    let prevPR = 1, prevView = null
    // a plugin's drawing over each exported frame (the score), under the captions
    const withPlugOverlay = base => {
      const p = plug.overlay?.(app)
      return !p ? base : !base ? p : (g, w, h, t) => { p(g, w, h, t); base(g, w, h, t) }
    }
    const stageAdapter = {
      renderer, opts: { transition: null, view: null }, tour: null,
      setTour() {}, setView() {},
      beginOffline(w, h) {
        exTitleCard = $('exTitle').value === 'card'   // (the card reveals the scene: no fade from black too)
        prevPR = renderer.getPixelRatio(); prevView = view
        renderer.setAnimationLoop(null)
        renderer.setPixelRatio(1)
        resize(w, h, false)
        if (isShort()) setShortFrame(true)
        else if ($('exCam').value === 'auto' && view !== 'auto') setView('auto')
        userCam = false; releaseKeys()
      },
      endOffline() {
        releaseKeys()
        if (shortFrame && !short.on) setShortFrame(false)
        if (view !== prevView && !short.on) setView(prevView)
        renderer.setPixelRatio(prevPR)
        liveResize()
        clock.getDelta()
        renderer.setAnimationLoop(frame)
      },
      update(t, dt) { step(dt, Math.max(0, t), true) },
    }
    // title-card fonts: [title family, weight, subtitle family, subtitle style]
    const TITLE_FONTS = {
      inter: { font: "Inter, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", titleWeight: 600, subFont: "Inter, -apple-system, 'Segoe UI', Arial, sans-serif", subStyle: 'normal 400', subTracking: 0.03 },
      poppins: { font: "Poppins, 'Helvetica Neue', Arial, sans-serif", titleWeight: 600, subFont: "Poppins, 'Helvetica Neue', Arial, sans-serif", subStyle: 'normal 400', subTracking: 0.03 },
      cormorant: { font: "'Cormorant Garamond', Georgia, serif", titleWeight: 600, subFont: "'Cormorant Garamond', Georgia, serif", subStyle: 'italic 500' },
      playfair: { font: "'Playfair Display', Georgia, serif", titleWeight: 600, subFont: "'Playfair Display', Georgia, serif", subStyle: 'italic 400' },
      cinzel: { font: "Cinzel, Georgia, serif", titleWeight: 600, subFont: "Cinzel, Georgia, serif", subStyle: 'normal 400' },
      vibes: { font: "'Great Vibes', Georgia, cursive", titleWeight: 400, subFont: "'Cormorant Garamond', Georgia, serif", subStyle: 'italic 500' },
      georgia: { font: "Georgia, 'Times New Roman', serif", titleWeight: 600, subFont: "Georgia, 'Times New Roman', serif", subStyle: 'italic' },
    }
    // the card's look: white text on frosted glass, or the warm ivory glow
    const CARD_STYLES = {
      glass: { panel: 'glass', color: '#ffffff', subColor: 'rgba(255,255,255,0.85)', ruleColor: '255,255,255', glow: 0, dim: 0.32 },
      glow: {},
    }
    const titleCardOpts = () => ({ ...TITLE_FONTS[$('exFont').value], ...CARD_STYLES[$('exCard').value] })
    async function loadTitleFont(k) {
      const f = TITLE_FONTS[k]
      try { await Promise.all([document.fonts.load(`${f.titleWeight} 48px ${f.font}`), document.fonts.load(`${f.subStyle} 24px ${f.subFont}`)]) } catch { /* falls back to Georgia */ }
    }
    // Title-card preview in the Render menu: the card drawn by the export's own
    // drawTitleCard over a still of the current picture, at the moment it is
    // fully in (redrawn when the font, subtitle or song changes)
    let previewJob = 0
    async function drawPreview() {
      if (!$('renderPop').classList.contains('open')) return
      const job = ++previewJob, cv = $('exPreview'), g = cv.getContext('2d'), w = cv.width, h = cv.height
      const k = $('exFont').value
      await loadTitleFont(k)
      if (job !== previewJob) return
      composer.render()   // (a fresh frame in the drawing buffer)
      g.clearRect(0, 0, w, h)
      const src = renderer.domElement, r = Math.max(w / src.width, h / src.height), sw = w / r, sh = h / r
      g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h)
      cv.style.opacity = $('exTitle').value !== 'none' ? 1 : 0.35
      if ($('exTitle').value === 'intertitle') {
        const x = { ...(songTitleScreen() || { kicker: 'Frédéric Chopin', text: 'Raindrop Prelude', sub: $('exSub').value.trim() }), ...(+$('exHold').value ? { hold: +$('exHold').value } : {}) }
        await loadIntertitleFonts(liner.style)
        if (job !== previewJob) return
        drawIntertitle(g, w, h, withTitle(null, x), 3, { style: liner.style, analysisStyle: liner.analysisStyle, theme: liner.theme, position: liner.position === 'auto' ? autoPosition() : liner.position, kickers: liner.kickers })
        return
      }
      if ($('exTitle').value !== 'card') return
      const { drawTitleCard } = await import('../notation3d/video-export.js')
      drawTitleCard(g, w, h, 0.98 / 4.5, 4.5, { title: song?.title || $('songTitle').textContent || 'Chopin - Raindrop Prelude', subtitle: $('exSub').value.trim(), style: '2d', fadeOut: 3.5, ...titleCardOpts() })
    }
    new MutationObserver(() => drawPreview()).observe($('renderPop'), { attributes: true, attributeFilter: ['class'] })
    for (const id of ['exFont', 'exTitle', 'exCard']) $(id).addEventListener('change', drawPreview)
    $('exSub').addEventListener('input', drawPreview)
    let exAbort = null
    $('exStart').onclick = async () => {
      if (!song || !fingered) return void ($('exStatus').textContent = song ? 'Still working out the fingering, try again in a moment.' : 'Load a song first (Songs, top left).')
      if (!exportSupported()) return void ($('exStatus').textContent = 'This browser has no WebCodecs video encoder; try Chrome or Edge.')
      const [width, height] = $('exRes').value.split('x').map(Number), fps = +$('exFps').value
      // #045: path traced (pathtrace/video.js), one picture per frame
      const ptKey = $('exPt').value === 'raster' ? null : $('ptEngine').value
      if (ptKey && isShort() && $('exLayout').value === 'stack') return void ($('exStatus').textContent = 'Path tracing does one picture per frame: choose Layout → One picture, or the raster renderer.')
      // the part of the song to render (Length): all of it, or a test clip
      const len = $('exLen').value, here = /^here/.test(len), secs = len === 'all' ? Infinity : +len.replace('here', '')
      let clipA = here ? Math.max(0, Math.min(songNow(), song.duration - 1)) : 0, clipB = Math.min(song.duration, clipA + secs)
      // a Short: the clip from the strip
      const asShort = isShort()
      const tailS = $('exTail').value === 'auto' ? (asShort ? 0.6 : 2) : +$('exTail').value
      if (asShort) { if (!(short.b > short.a)) clipFresh(); clipA = short.a; clipB = short.b }
      const clip = clipA > 0 || clipB < song.duration
      const name = (song.title || 'pianist').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + (asShort ? '_short' : '') + (clip ? `_${Math.floor(clipA)}-${Math.ceil(clipB)}s` : '') + (ptKey ? `_${ptKey}_${$('ptSpp').value}spp` : '') + `_${height}p${fps}.mp4`
      let fileStream = null
      if (window.showSaveFilePicker) {
        try {
          const handle = await showSaveFilePicker({ suggestedName: name, types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }] })
          fileStream = await handle.createWritable()
        } catch (e) { if (e.name === 'AbortError') return; console.warn(e) }
      }
      if (scheduler?.playing) { scheduler.pause(); songTarget.allSoundOff(); setPlaying(false) }
      const titleMode = asShort ? 'none' : $('exTitle').value
      if (titleMode === 'card') await loadTitleFont($('exFont').value)
      // what is on screen: the intertitles (with the title, when it is one) or every note as a caption
      const linerMode = liner.mode, itOpts = { style: liner.style, analysisStyle: liner.analysisStyle, theme: liner.theme, kickers: liner.kickers }
      const linerTl = linerMode === 'notes' ? liner.timeline : liner.screenTimeline
      const burnCaps = $('exCaps').checked && linerTl && linerMode !== 'off'
      const shortTlx = asShort ? shortTimeline(clipA, clipB) : null
      if (asShort) await shortFonts()
      if (burnCaps) await (linerMode === 'notes' ? loadTitleFont('inter') : loadIntertitleFonts(itOpts.style, itOpts.analysisStyle))
      // automatic positions: decided for each intertitle on its first frame, as on the page
      const itPlaced = new WeakMap()
      const itPos = x => { if (liner.position !== 'auto') return liner.position; if (!itPlaced.has(x)) itPlaced.set(x, autoPosition()); return itPlaced.get(x) }
      let songZero = 0
      exAbort = new AbortController()
      exporting = true
      $('exStart').disabled = true
      const programs = new Map(); for (let ch = 0; ch < 16; ch++) if (ch !== 9) programs.set(ch, 0)
      const ptv = ptKey ? pathTracedFrames(ptStage, {
        engine: ptKey, width: width & ~1, height: height & ~1, samples: +$('ptSpp').value, bounces: +$('ptBounces').value,
        denoise: $('ptDenoise').checked, hairFraction: +$('ptHair').value, fx: $('ptFx').checked, signal: exAbort.signal,
      }) : null
      try {
        const blob = await exportVideo({
          frameSource: ptv?.frame,
          stage: stageAdapter,
          song: { schedule: { notes: song.notes, controlChanges: (song.controlChanges || []).filter(c => c.controller !== 7) }, programs, duration: song.duration, title: song.title },
          width, height, fps, start: clipA,
          // a Short: on the music from the first frame, the room rings 0.6 s past the out point while it fades
          // the tail (Render → Tail after the end): past the piece's end, or a handle past a clip's out point
          end: asShort || $('exTail').value !== 'auto' ? Math.min(song.duration, clipB + tailS) : clipB, tail: tailS, ...(asShort ? { preroll: 0.1 } : {}),
          bitrate: defaultBitrate(width, height, fps),
          audio: $('exAudio').checked,
          audioOpts: { vendorPath, soundfonts: [$('sf').value], volume: 1, convertSF3: engine._backend?._convertSF3 ? d => engine._backend._convertSF3(d) : null },
          audioFx: (fx => !asShort ? fx : shortFades(fx, clipA - 0.1, Math.min(song.duration + tailS, clipB + tailS)))(offlineHall($('room').value === 'dry' ? null : acousticParams(hallSettings()), 48000, { volume: +$('vol').value })),
          tour: null,
          // the card holds ~1 s, then the music starts and the card fades over
          // 3.5 s while the scene focuses in underneath it
          intro: titleMode === 'card' ? { seconds: 4.5, overlap: 3.5, fadeOut: 3.5, title: song.title, subtitle: $('exSub').value.trim(), style: '2d', ...titleCardOpts() } : null,
          outro: null,
          overlay: withPlugOverlay(asShort ? (shortTlx.intertitles.length && $('exCaps').checked ? shortOverlay(shortTlx) : null) : !burnCaps ? null : linerMode === 'notes' ? (g, w, h, t) => drawLinerCaption(g, w, h, linerTl, t, { font: TITLE_FONTS.inter?.font || 'Inter, system-ui, sans-serif' })
            : (g, w, h, t) => drawIntertitle(g, w, h, linerTl, t, { ...itOpts, position: itPos })),
          onTimeline: x => { songZero = x.songZero },
          fileStream, signal: exAbort.signal,
          onProgress: p => {
            $('exBar').firstElementChild.style.width = (p.frame / p.frames * 100).toFixed(1) + '%'
            $('exStatus').textContent = p.phase === 'finalizing' ? 'Finalizing…'
              : `${p.frame}/${p.frames} frames · ${ptv?.stats.last ? `${(ptv.stats.last.ms / 1000).toFixed(1)} s a frame (trace ${(ptv.stats.last.trace / 1000).toFixed(1)} s, scene ${((ptv.stats.last.setup + ptv.stats.last.snapshot) / 1000).toFixed(1)} s)` : `${(p.frame / p.elapsed).toFixed(1)} fps`} · ${fmt(p.eta)} left`
          },
        })
        if (blob) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob); a.download = name; a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 60000)
        }
        // the liner notes as two YouTube subtitle tracks, timed to this video, whatever
        // is on screen: <name>.vtt the intertitles (the title too, when it is one, and the
        // floats as this take places them), <name>.notes.vtt every note's caption; and chapters
        if (asShort) {
          // the Short's text as a subtitle track, and a description to paste
          if ($('exVtt').checked && shortTlx.intertitles.length) saveText(name.replace(/\.mp4$/, '.vtt'), toVTT(shortTlx, { offset: songZero, from: 'intertitles' }))
          const ts = songTitleScreen()
          saveText(name.replace(/\.mp4$/, '-short.txt'), shortDescription({ composer: ts?.kicker, title: ts?.text || song.title, bars: `${fmt(clipA)}–${fmt(clipB)} of the piece`, full: $('exFullUrl').value.trim() }) + '\n')
        } else if ($('exVtt').checked) {
          const vtt = { offset: songZero, start: clipA, end: clipB }, its = liner.screenTimeline, notes = liner.timeline
          if (its?.intertitles.length) saveText(name.replace(/\.mp4$/, '.vtt'), toVTT(its, { ...vtt, from: 'intertitles' }))
          if (notes?.moments.length) saveText(name.replace(/\.mp4$/, '.notes.vtt'), toVTT(notes, { ...vtt, from: 'moments' }))
          const ch = !clip && liner.timeline && toChapters(liner.timeline, { offset: songZero })
          if (ch) saveText(name.replace(/\.mp4$/, '-chapters.txt'), ch + '\n')
        }
        $('exStatus').textContent = 'Done: ' + name
      } catch (e) {
        console.error(e)
        $('exStatus').textContent = e.name === 'AbortError' ? 'Cancelled' : 'Failed: ' + e.message
      } finally {
        ptv?.dispose()
        exporting = false; exAbort = null
        $('exStart').disabled = false
      }
    }
    $('exCancel').onclick = () => { if (exAbort) exAbort.abort(); else closePops() }
    window.__pianist.exportStage = stageAdapter

    // ── #045: path-traced stills (pathtrace/still.js) ────────────────────
    // begin(): the frame as the page draws it, at the still's size (the
    // tracers get a snapshot of this same moment); end(): back to live
    let ptPR = 1
    const ptCopy = src => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0); return c }
    const ptStage = {
      scene, camera, get envScene() { return envScene }, get envIntensity() { return scene.environmentIntensity },
      hair: () => hair, exposure: () => +$('exposure').value, liveExposure: () => renderer.toneMappingExposure,
      // the depth of field this frame, for the tracers' lens (null when off)
      dof: () => bokeh.enabled ? { focus: bokeh.uniforms.focus.value, aperture: bokeh.uniforms.aperture.value } : null,
      fx: () => ({
        exposure: +$('exposure').value,
        bloom: bloom.enabled ? { strength: bloom.strength, radius: bloom.radius, threshold: bloom.threshold } : null,
        grain: { amount: grain.uniforms.uAmount.value, vig: grain.uniforms.uVig.value, time: grain.uniforms.uTime.value },
        grainShader: { vertexShader: grain.material.vertexShader, fragmentShader: grain.material.fragmentShader },
      }),
      current: () => ptCopy(renderer.domElement),
      begin(w, h) {
        if (scheduler?.playing) { scheduler.pause(); songTarget.allSoundOff(); setPlaying(false) }
        ptPR = renderer.getPixelRatio()
        renderer.setAnimationLoop(null); renderer.setPixelRatio(1)
        resize(w, h, false)
        step(1 / 60, fixedT ?? pictureTime(0), false)
        return ptCopy(renderer.domElement)
      },
      end() {
        renderer.setPixelRatio(ptPR); liveResize(); clock.getDelta()
        if (!params.has('shot')) renderer.setAnimationLoop(frame)
      },
    }
    const ptStills = createPathTraceStills(ptStage)
    // Render → Renderer: path traced shows its own settings
    // Render → Renderer: path traced shows what it will use, from the Path trace menu
    const ptSummary = () => {
      const sel = $('ptEngine'), spp = +$('ptSpp').value
      $('exPtInfo').textContent = `${sel.options[sel.selectedIndex].textContent} · ${spp} spp · ${$('ptBounces').value} bounces · hair ${Math.round($('ptHair').value * 100)} % · denoise ${$('ptDenoise').checked ? 'on' : 'off'} · effects ${$('ptFx').checked ? 'on' : 'off'}` + (spp >= 256 ? ' (many samples: slow for video)' : '')
    }
    $('exPt').onchange = () => { for (const e of document.querySelectorAll('#renderPop .ptOnly')) e.style.display = $('exPt').value === 'raster' ? 'none' : ''; ptSummary() }
    for (const id of ['ptEngine', 'ptSpp', 'ptBounces', 'ptHair', 'ptDenoise', 'ptFx']) $(id).addEventListener('change', ptSummary)
    $('exPtEdit').onclick = ev => { ev.stopPropagation(); closePops(); $('ptPop').classList.add('open') }
    $('exPt').onchange()
    window.__pianist.pt = ptStills
    window.__pianist.titleFonts = { TITLE_FONTS, loadTitleFont }

    // ── YouTube Shorts: a clip of the piece, 9:16 ────────────────────────
    // Render → Format → YouTube Short. The clip strip (above the transport)
    // shows the piece's energy, sections and phrases; its edges snap to phrase
    // starts and ends, the chips set a length, and pianist/shorts.js suggests
    // three clips. Preview plays the clip on a loop in a 9:16 frame with the
    // safe area drawn, through the same camera plan (planShort) and overlay as
    // the export. ?short=1&clip=74.2-108.6 brings it back.
    // the part of a 1080×1920 frame YouTube's buttons leave alone (the right
    // rail, the title and channel bar at the bottom, the search bar at the top)
    const SHORT_SAFE = { x0: 60 / 1080, y0: 230 / 1920, x1: 950 / 1080, y1: 1480 / 1920 }
    const short = { a: 0, b: 0, len: SHORT_DEFAULT, sug: [], prevView: null, fonts: null }
    const isShort = () => $('exFormat').value === 'short'
    const shortSong = () => {
      if (!song || !fingered) return null
      const f = rig.form()
      return { duration: song.duration, phrases: f.phrases, glances: f.glances, energyAt: rig.music.energyAt,
        sections: liner.timeline?.sections || [], moments: liner.timeline?.moments || [], intertitles: liner.screenTimeline?.intertitles || [],
        notes: song.notes.map(n => ({ on: n.time, off: n.time + n.duration })) }
    }
    function setClip(a, b, { snap = true } = {}) {
      const s = shortSong(); if (!s) return
      a = Math.max(0, Math.min(a, s.duration - 4))
      if (snap) a = snapStart(a, s.phrases)
      b = Math.max(a + 4, Math.min(b, s.duration, a + SHORT_MAX))
      if (snap) b = snapEnd(b, s.phrases, a + 4)
      short.a = a; short.b = b
      $('clipV').textContent = $('exClipV').textContent = `${fmt(a)}.${Math.floor(a % 1 * 10)} – ${fmt(b)}.${Math.floor(b % 1 * 10)} · ${Math.round(b - a)} s`
      for (const c of $('clipLens').children) c.classList.toggle('sel', +c.value === short.len)
      for (const [i, c] of [...$('clipSug').children].entries()) c.classList.toggle('sel', Math.abs(short.sug[i]?.a - a) < 0.01 && Math.abs(short.sug[i]?.b - b) < 0.01)
      if (shortFrame) applyShortPlan()
      drawClip()
    }
    function clipFresh() {
      const s = shortSong()
      if (!s) { $('clipV').textContent = song ? 'working out the phrasing…' : 'load a song first'; short.sug = []; $('clipSug').innerHTML = ''; return drawClip() }
      short.sug = suggestClips(s, { lengths: [30, 45], count: 3 })
      $('clipSug').innerHTML = ''
      short.sug.forEach((c, i) => $('clipSug').append(Object.assign(document.createElement('button'), { className: 'chip sug', textContent: `★ ${i + 1} · ${fmt(c.a)}`, title: c.reason, onclick: () => { short.len = Math.round((c.b - c.a) / 15) * 15; setClip(c.a, c.b, { snap: false }); if (short.on) playClip() } })))
      const fromUrl = /^([\d.]+)-([\d.]+)$/.exec(params.get('clip') || '')
      if (fromUrl && !short.a && !short.b) setClip(+fromUrl[1], +fromUrl[2], { snap: false })
      else if (!(short.b > short.a) || short.b > s.duration) short.sug[0] ? setClip(short.sug[0].a, short.sug[0].b, { snap: false }) : setClip(0, SHORT_DEFAULT)
      else setClip(short.a, short.b, { snap: false })
    }
    for (const L of [...SHORT_LENGTHS, 'whole']) $('clipLens').append(Object.assign(document.createElement('button'), {
      className: 'chip', textContent: L === 'whole' ? 'Whole' : L + ' s', value: L === 'whole' ? 0 : L,
      title: L === 'whole' ? 'The whole piece (a Short can be up to 3 minutes)' : `About ${L} s from the in point, out on the nearest phrase end`,
      onclick: () => { const s = shortSong(); if (!s) return; short.len = L === 'whole' ? 0 : L; L === 'whole' ? setClip(s.phrases[0][0], s.phrases.at(-1)[1]) : setClip(...clipOf(short.a, L, s.phrases, s.duration), { snap: false }) },
    }))
    // the strip: energy, sections, phrase starts, the clip, the suggestions, the playhead
    function drawClip() {
      const cv = $('clipCv'); if (!document.body.classList.contains('clipping')) return
      const W = cv.clientWidth * devicePixelRatio, H = cv.clientHeight * devicePixelRatio
      if (cv.width !== W) cv.width = W
      if (cv.height !== H) cv.height = H
      const g = cv.getContext('2d'), s = shortSong(), r = devicePixelRatio
      g.clearRect(0, 0, W, H); g.fillStyle = '#151515'; g.fillRect(0, 0, W, H)
      if (!s) return
      const X = t => t / s.duration * W
      g.beginPath(); g.moveTo(0, H)
      for (let x = 0; x <= W; x += 2) g.lineTo(x, H - 4 * r - (H - 22 * r) * Math.min(1, s.energyAt(x / W * s.duration) / 0.9))
      g.lineTo(W, H); g.fillStyle = 'rgba(160,160,160,0.35)'; g.fill()
      g.fillStyle = 'rgba(255,255,255,0.35)'
      for (const [p] of s.phrases) g.fillRect(X(p), H - 4 * r, Math.max(1, r), 4 * r)
      g.font = `${10 * r}px system-ui, sans-serif`; g.textBaseline = 'top'
      for (const sec of s.sections) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(X(sec.start), 0, Math.max(1, r), H); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(sec.title, X(sec.start) + 3 * r, 2 * r) }
      for (const c of short.sug) { g.fillStyle = 'rgba(232,180,106,0.8)'; g.fillRect(X(c.a), 14 * r, X(c.b) - X(c.a), 2 * r) }
      const a = X(short.a), b = X(short.b)
      g.fillStyle = 'rgba(47,174,74,0.28)'; g.fillRect(a, 0, b - a, H)
      g.fillStyle = '#2fae4a'; g.fillRect(a - r, 0, 3 * r, H); g.fillRect(b - 2 * r, 0, 3 * r, H)
      g.fillStyle = '#fff'; g.fillRect(X(songNow()), 0, Math.max(1, r), H)
    }
    {
      let drag = null
      const cv = $('clipCv'), tOf = ev => { const rc = cv.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - rc.left) / rc.width)) * (song?.duration || 0) }
      cv.addEventListener('pointerdown', ev => {
        const s = shortSong(); if (!s) return
        const t = tOf(ev), px = s.duration / cv.clientWidth * 8
        drag = Math.abs(t - short.a) < px ? { k: 'a' } : Math.abs(t - short.b) < px ? { k: 'b' } : t > short.a && t < short.b ? { k: 'move', d: t - short.a, len: short.b - short.a } : null
        if (!drag) { setClip(...clipOf(snapStart(t, s.phrases), short.len || 35, s.phrases, s.duration), { snap: false }); drag = { k: 'b' } }
        cv.setPointerCapture(ev.pointerId)
      })
      cv.addEventListener('pointermove', ev => {
        if (!drag) return
        const t = tOf(ev), snap = !ev.shiftKey
        if (drag.k === 'a') setClip(t, short.b, { snap })
        else if (drag.k === 'b') setClip(short.a, t, { snap })
        else { const a = snap ? snapStart(t - drag.d, rig.form().phrases) : t - drag.d; setClip(a, a + drag.len, { snap }) }
      })
      cv.addEventListener('pointerup', () => { if (drag && short.on) playClip(); drag = null })
      cv.addEventListener('pointercancel', () => { drag = null })
    }
    // the 9:16 frame: the camera plan of a Short (portrait framings, planShort over the clip)
    function setShortFrame(on) {
      if (on === shortFrame) return
      shortFrame = on
      applyShortPlan()
      if (on) { short.prevView = view; if (view !== 'auto') setView('auto') }
      else if (short.prevView && view !== short.prevView) setView(short.prevView)
      lastShot = null
    }
    // the camera plans for the Short: one 9:16 picture (portrait framings), or
    // stacked (director: her, director2: the hands, the top avoiding the bottom's cuts)
    function applyShortPlan() {
      const stack = shortFrame && $('exLayout').value === 'stack', changed = stack !== stacked
      stacked = stack
      if (stack) {
        if (!director2) { director2 = createDirector({ ...director.opts, portrait: false, half: 'hands' }); if (dirSource) director2.setSong(dirSource) }
        director2.set('window', [short.a, short.b])
      }
      director.set('window', [short.a, short.b])
      director.set('half', stack ? 'her' : null)
      // (with the lesson view below there are no cuts there to keep clear of)
      director.set('avoid', stack && $('exHandsHalf').value !== 'lesson' ? director2.shots.slice(1).map(x => x.t0) : null)
      director.set('portrait', shortFrame && !stack)
      applyFrameViews(shortFrame && !stack)
      if (changed) { const { x, y } = renderer.getSize(_sz); resize(x, y, !exporting) }
      lastShot = null
    }
    const applyLayoutUi = () => { document.body.classList.toggle('layoutstack', $('exLayout').value === 'stack'); document.body.classList.toggle('handslesson', $('exHandsHalf').value === 'lesson') }
    $('exLayout').onchange = () => { applyLayoutUi(); if (shortFrame) applyShortPlan() }
    $('exHandsHalf').onchange = () => { applyLayoutUi(); if (shortFrame) applyShortPlan() }
    $('exSplit').onchange = () => { if (stacked) { const { x, y } = renderer.getSize(_sz); resize(x, y, !exporting); applyShortPlan() } }
    applyLayoutUi()
    function liveResize() {
      if (!short.on) { $('shortBox').style.cssText = ''; return resize(innerWidth, innerHeight) }
      const H = innerHeight, W = Math.round(H * 9 / 16)
      resize(W, H)
      Object.assign($('shortBox').style, { width: W + 'px', height: H + 'px', marginLeft: -W / 2 + 'px' })
      Object.assign($('safeBox').style, { left: SHORT_SAFE.x0 * W + 'px', top: SHORT_SAFE.y0 * H + 'px', width: (SHORT_SAFE.x1 - SHORT_SAFE.x0) * W + 'px', height: (SHORT_SAFE.y1 - SHORT_SAFE.y0) * H + 'px' })
      const ov = $('shortOv'); ov.width = W * devicePixelRatio; ov.height = H * devicePixelRatio
    }
    async function setPreview(on) {
      short.on = on
      document.body.classList.toggle('shortpreview', on)
      $('clipPlay').textContent = on ? '■ Stop preview' : '▶ Preview 9:16'
      setShortFrame(on || isShort() && exporting)
      liveResize()
      if (on) { await shortFonts(); playClip() }
    }
    async function playClip() {
      const sch = await ensureScheduler(); unlockAudio()
      seekTo(short.a)
      if (!sch.playing) { music.wall = performance.now(); sch.play(); setPlaying(true) }
    }
    const shortFonts = () => short.fonts ??= loadIntertitleFonts(liner.style, liner.analysisStyle)
    // what a Short shows over the picture: the title in the top band for its
    // first 3.5 s, then the intertitles that fit wholly inside the clip, in the
    // safe area (top or bottom, away from her)
    function shortTimeline(a, b) {
      // the pinned lines inside the clip, and the floating stories placed into it
      // (liner.js layoutClip): a 30 s clip rarely holds the piece's own placements
      const its = liner.mode === 'intertitles' && liner.timeline ? layoutClip(liner.timeline, a, b).intertitles : []
      const x = $('exShortTitle').checked ? songTitleScreen() : null
      if (x) its.unshift({ ...x, title: true, start: a + 0.15, end: a + 3.6, fadeIn: 0.35, fadeOut: 0.7 })
      return { intertitles: its, sections: [], moments: [] }
    }
    const shortPlaced = new WeakMap()
    const shortPos = x => {
      if (x.title) return 'top-center'
      if (!shortPlaced.has(x)) {
        const prefer = subjectNdc.y < -0.2 ? 'top-center' : 'bottom-center'
        let p = prefer; try { p = frameSpace.pick(camera, portraitPlaces(SHORT_SAFE), prefer).place } catch (e) { console.warn(e) }
        shortPlaced.set(x, p)
      }
      return shortPlaced.get(x)
    }
    // (stacked: the intertitles sit just above the seam, over her half, not on the hands)
    const shortOverlay = tl => (g, w, h, t) => {
      const x = stacked && tl.intertitles.find(x => t >= x.start - 0.05 && t < x.end)
      const safe = x && !x.title ? { ...SHORT_SAFE, y1: stackHs(h)[0] / h - 0.012 } : SHORT_SAFE
      drawIntertitle(g, w, h, tl, t, { style: liner.style, analysisStyle: liner.analysisStyle, theme: liner.theme, kickers: liner.kickers, position: x && !x.title ? 'bottom-center' : shortPos, safe })
    }
    let shortTl = null, shortTlKey = ''
    function shortTick() {
      if (document.body.classList.contains('clipping') && (scheduler?.playing || shortTick.n++ % 10 === 0)) drawClip()
      if (!short.on) return
      const t = songNow()
      if (scheduler?.playing && (t >= short.b || t < short.a - 0.5)) seekTo(short.a)
      const key = `${short.a},${short.b},${liner.mode},${$('exShortTitle').checked},${liner.screenTimeline?.intertitles?.length}`
      if (key !== shortTlKey) { shortTl = shortTimeline(short.a, short.b); shortTlKey = key }
      const ov = $('shortOv'), g = ov.getContext('2d')
      g.clearRect(0, 0, ov.width, ov.height)
      shortOverlay(shortTl)(g, ov.width, ov.height, t)
    }
    shortTick.n = 0
    // a Short's sound: the hall as usual, a 15 ms fade-in where the clip starts
    // (no click from a note already sounding) and a 1 s fade at the end (no cut
    // when it loops). t0, t1: song time of the first and last sample
    function shortFades(fx, t0, t1) {
      let i = 0
      const SR = 48000, inA = Math.round(0.1 * SR), inN = Math.round(0.015 * SR), end = Math.round((t1 - t0) * SR), outN = SR
      return (data, n, sr) => {
        fx?.(data, n, sr)
        for (let j = 0; j < n; j++, i++) {
          const gin = i < inA ? 0 : Math.min(1, (i - inA) / inN), x = (end - i) / outN
          const gn = gin * (x >= 1 ? 1 : x <= 0 ? 0 : Math.sin(x * Math.PI / 2))
          if (gn !== 1) { data[j] *= gn; data[n + j] *= gn }
        }
      }
    }
    function openClip(on = true) {
      document.body.classList.toggle('clipping', on)
      if (on) { closePops(); clipFresh() }
      else if (short.on) setPreview(false)
    }
    $('exClipBtn').onclick = () => openClip(true)
    $('clipDone').onclick = () => openClip(false)
    $('clipPlay').onclick = () => setPreview(!short.on)
    $('exFormat').onchange = () => {
      const s = isShort()
      document.body.classList.toggle('fmtshort', s)
      const opts = s ? [['540x960', '540×960 (preview)'], ['720x1280', '720×1280'], ['1080x1920', '1080×1920 (YouTube Shorts)']] : [['426x240', '240p (preview)'], ['854x480', '480p (preview)'], ['1280x720', '720p'], ['1920x1080', '1080p'], ['2560x1440', '1440p'], ['3840x2160', '4K']]
      const keep = params.get('exres'); $('exRes').innerHTML = ''
      for (const [v, l] of opts) $('exRes').append(new Option(l, v, false, v === (opts.some(o => o[0] === keep) ? keep : s ? '1080x1920' : '1920x1080')))
      if (s && !short.b) clipFresh()
      if (!s) openClip(false)
    }
    if (params.get('short') === '1') $('exFormat').value = 'short'
    if (isShort()) $('exFormat').onchange()
    await plug.onReady?.(app)
    window.__pianist.short = { short, setClip, setPreview, openClip, clipFresh, suggest: () => short.sug, shortTimeline }

    // ── Headless stills: ?shot&song=…&t=12&view=profile ─────────────────
    if (params.has('shot')) {
      document.body.classList.add('hideui')
      if (params.has('caption')) document.body.classList.add('captioned')
      window.__shot = async () => {
        const file = params.get('song')
        if (file) {
          const midi = new Midi(await (await fetch(file)).arrayBuffer()), s = midiToSchedule(midi)
          s.notes = s.notes.filter(n => n.channel !== 9 && n.midi >= LOW && n.midi <= HIGH)
          s.duration = s.notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
          song = s
          await plug.onSong?.(s, midi, app)
          fingerInWorker(s.notes)
          for (let i = 0; i < 400 && !fingered; i++) await new Promise(r => setTimeout(r, 50))
        }
        const T = +(params.get('t') || 0)
        // a Short's frame (?short=1&clip=a-b, at a 9:16 viewport): the portrait framings and its plan
        if (params.get('short') === '1') {
          const m = /^([\d.]+)-([\d.]+)$/.exec(params.get('clip') || '') || [0, Math.max(0, T - 5), T + 30]
          short.a = +m[1]; short.b = +m[2]
          if (params.get('exlayout') === 'stack') $('exLayout').value = 'stack'
          if (params.get('exsplit')) $('exSplit').value = params.get('exsplit')
          if (params.get('exhands')) $('exHandsHalf').value = params.get('exhands')
          if (params.get('exlview')) $('exLessonView').value = params.get('exlview')
          shortFrame = true; applyShortPlan()
          resize(innerWidth, innerHeight)
        }
        // settle hair and cloth: run the simulation up to T at 60 fps (2 s at most)
        renderer.setAnimationLoop(null)
        const steps = Math.round(Math.min(T, 2.5) * 60)
        for (let i = steps; i >= 0; i--) {
          fixedT = T - i / 60
          for (const m of held.keys()) piano.noteOff(m)
          rig.update(fixedT, 1 / 60); ch.group.updateMatrixWorld(true); wardrobeUpdate(1 / 60)
        }
        // keys down where notes are held at T
        if (song) for (const n of song.notes) if (n.time <= T && n.time + n.duration > T) piano.noteOn(n.midi, 0.7)
        for (let i = 0; i < 30; i++) piano.update(1 / 60)
        const handsAt = (() => { const c = new THREE.Vector3(); for (const h of [rig.hands.L, rig.hands.R]) c.add(h.joints.W); return c.multiplyScalar(0.5) })()
        let focusOn = viewFocusHands(view) ? handsAt : rig.pos('head'), wide = viewWide(view)
        if (view === 'player') playerView(handsAt, 1 / 60)
        setPov(view === 'player')
        if (view === 'auto') {
          // the director's frame at T (a ?move= on a fixed view is shown at its far end)
          const c = director.update(T, 1 / 60, { hands: handsAt, head: rig.pos('head') })
          camera.position.copy(c.pos); controls.target.copy(c.target); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.target)
          focusOn = c.focus === 'hands' ? handsAt : c.focus === 'target' ? c.target : rig.pos('head'); wide = c.wide
          window.__shotInfo = { ...c.shot, label: SPOTS[c.shot.name].label }
        } else if (SEQ_MOVES[params.get('move')]) {
          const c = director.sequence(VIEWS[view], params.get('move'), T, { head: rig.pos('head'), hands: handsAt }, camOut)
          camera.position.copy(c.pos); controls.target.copy(c.target); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.target)
          if (c.focus) focusOn = c.focus === 'hands' ? handsAt : rig.pos('head')
          if (c.frame !== 'home') wide = c.wide
          window.__shotInfo = { ...c.shot, lock: undefined }
        } else if (MOVES[params.get('move')] && params.get('move') !== 'still') {
          const c = director.fixed(VIEWS[view], params.get('move'), 14, camOut)
          camera.position.copy(c.pos); controls.target.copy(c.target); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.target)
        } else {
          const d = VIEWS[view]
          camera.position.set(...d.pos); controls.target.set(...d.target); camera.fov = d.fov; camera.updateProjectionMatrix(); controls.update()
          if (camFree) { camera.position.copy(camGoal.pos); controls.target.copy(camGoal.target); controls.update() }   // (?cam=)
        }
        {
          const hd = focusOn === handsAt ? 'hands' : focusOn === rig.pos('head') ? 'head' : 'target'
          const f = focusPull.update({ camera, dt: 0, subject: hd, hands: rig.hands, handsMid: handsAt, eyes: hd === 'head' ? eyesAt() : null, target: focusOn, snap: true, amount: +$('dofAmt').value, shot: dofOf(window.__shotInfo?.name ?? view) })
          bokeh.uniforms.focus.value = f.focus; bokeh.uniforms.aperture.value = f.aperture
        }
        bokeh.enabled = !params.has('nodof')
        renderer.toneMappingExposure = +$('exposure').value
        if (stacked) { drawStacked(T, 1 / 60, { hands: handsAt, head: rig.pos('head') }); window.__shotInfo2 = director2.update(T, 0, { hands: handsAt, head: rig.pos('head') }).shot }
        else composer.render()
        await plug.onFrame?.(T, app, { shot: true })
        return true
      }
    }
}
