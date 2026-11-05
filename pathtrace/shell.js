// The markup of the path-traced pianist page (#045), which boot() in app.js puts
// in the body before it starts. Pages that build on #045 (#049, #050) share it.
export const SHELL = String.raw`
<div id="topLeft" class="ui">
  <button class="pill" id="songsBtn"><svg viewBox="0 0 24 24"><path d="M12 3v10.6A4 4 0 1 0 14 17V7h4V3z"/></svg>Songs</button>
  <span id="title"><a href="README.md" title="Back to experiments">#045 · Path-traced Pianist</a></span>
</div>
<div id="songsPop" class="pop ui">
  <div class="field" style="padding-bottom:6px"><input id="songFilter" type="search" placeholder="Filter songs…" autocomplete="off"></div>
  <div id="songList"></div>
  <div class="item" id="openFile">Open a MIDI file…</div>
  <div class="item saveOffline" title="Download every song and the current sound, so they play without a connection (outfits you have shown are kept as they load)">Save for offline<span class="offlineV"></span></div>
  <input id="file" type="file" accept=".mid,.midi,audio/midi" hidden>
</div>
<div id="presets" class="ui" aria-label="Outfit presets (keys 1–9, 0)"></div>
<div id="presetPeek"><img alt=""><span></span></div>
<div id="topRight" class="ui">
  <button class="pill" id="cameraBtn"><svg viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11z"/></svg>Camera</button>
  <button class="pill" id="outfitBtn" title="Outfits"><svg viewBox="0 0 24 24"><path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z"/></svg>Outfit</button>
  <button class="pill" id="moreBtn" title="More: visuals, hall, render, share"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>More</button>
  <button class="pill" id="perfBtn" title="Performance: how she moves - body, head and eyes, hands and arms, bench"><svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.5"/><path d="M6 21l2.5-9-3-2 1-2 4 2h3l4-2 1 2-3 2 2.5 9h-2.4l-2.1-7h-1l-2.1 7z"/></svg>Performance</button>
  <button class="pill" id="visualsBtn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>Visuals</button>
  <button class="pill" id="audioBtn" title="Hall acoustics: room, seat, reverb, room boost, applause"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>Hall</button>
  <button class="pill" id="renderBtn" title="Export the song as an MP4 video"><svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="4"/><circle cx="16" cy="12" r="4" opacity=".55"/></svg>Render</button>
  <button class="pill" id="ptBtn" title="Path-traced still: this frame rendered by three-gpu-pathtracer or MuTracer, compared with the page's picture"><svg viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7zm0 2.3L18.7 8 12 11.7 5.3 8zM5 9.7l6 3.3v6.6l-6-3.3zm8 9.9V13l6-3.3v6.6z"/></svg>Path trace</button>
  <button class="pill" id="shareBtn" title="Copy a link to this exact scene: wardrobe, look, camera, sound and the song at this moment"><svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7c0 .3 0 .5.1.8L8.4 11.2a3 3 0 1 0 0 3.6l6.7 3.4A3 3 0 1 0 18 16z"/></svg>Share</button>
</div>
<div id="outfitPop" class="pop ui"><div class="sect">Outfits</div><div id="outfitGrid"></div></div>
<div id="morePop" class="pop ui">
  <div class="item" data-open="perfPop">Performance: body, head, hands, bench</div>
  <div class="item" data-open="visualsPop">Visuals: pianist, stage, post-processing</div>
  <div class="item" data-open="audioPop">Hall: room, reverb, applause</div>
  <div class="item" data-open="renderPop">Render a video</div>
  <div class="item" id="moreShare">Share a link to this scene</div>
  <div class="item saveOffline">Save for offline<span class="offlineV"></span></div>
</div>
<div id="cameraPop" class="pop ui">
  <div class="item" data-view="auto">Director (auto)<span class="dot"></span></div>
  <div class="item" data-view="orbit">Orbit<span class="dot"></span></div>
  <div id="viewList"></div>
  <div class="field"><label>Move (on a view)</label><select id="camMove"><option value="still">Still</option><option value="orbit">Slow orbit</option><option value="zoomIn">Zoom in</option><option value="zoomOut">Zoom out</option><option value="dollyIn">Push in</option><option value="dollyOut">Pull out</option><option value="dollyZoom">Dolly zoom</option><option value="crane">Crane</option><option value="random">Random</option><option value="cut" selected>Director's cut</option></select></div>
  <div class="sect">Director</div>
  <div class="field"><label>Pace</label><select id="dirPace"><option value="0.6">Long takes</option><option value="1" selected>Normal</option><option value="1.6">Lively</option></select></div>
  <div class="field"><label>Favour</label><select id="dirBias"><option value="-0.8">The hands</option><option value="0" selected>Balanced</option><option value="0.8">The pianist</option></select></div>
  <div class="field"><label>Transitions (also Director's cut)</label><select id="dirTrans"><option value="mix">Cuts and glides</option><option value="cuts" selected>Cuts only</option><option value="glides">Glides where possible</option></select></div>
  <label class="chk" title="Off: each shot frames her as it starts and holds still while she moves. On: the camera operator follows her head"><input type="checkbox" id="camFollow"> Follow her movement</label>
  <div class="field" title="Which shot sizes the director may use"><label>Shots</label><div class="sizeChk"><label><input type="checkbox" id="dirFar" checked> Far</label><label><input type="checkbox" id="dirMed" checked> Medium</label><label><input type="checkbox" id="dirClose" checked> Close</label></div></div>
  <div class="field" title="The strings, plate and dampers inside the case are the slowest part of the stage to path trace. Each shot is checked for how much of its frame they fill (pianist/director.js, stringsShare): Mostly avoid leaves out the shots where they fill over 10 % (from above, over the shoulder, the hammers); Avoid leaves out any over 4 % (then the hands are filmed along the keys and from the side, her face and figure from low or level)"><label>Inside the piano</label><select id="dirStrings"><option value="show" selected>Show it</option><option value="mostly">Mostly avoid (faster path tracing)</option><option value="strict">Avoid (fastest path tracing)</option></select></div>
  <label class="chk" title="Off: the director leaves out every close or medium shot that shows her feet or the pedals clearly in the frame (pianist/director.js showsFeet): the pedal shots, and framings such as over the shoulder and the hands from her right; in a Short also the hands from the side"><input type="checkbox" id="dirPedals" checked> Feet and pedal shots</label>
  <div class="field" title="The first shot. Wide: the whole stage from high behind her, looking past the piano to the back wall (#030's candle-chamber establishing shot), a slow push in for 7 s (5.5 s in a Short), then the plan as usual. Automatic: wide on the Candlelit chamber, else the usual opening (wide from the hall for a film, straight onto the hands for a Short)"><label>Opening shot</label><select id="dirOpen"><option value="auto" selected>Automatic</option><option value="usual">Usual</option><option value="wide">The whole stage, wide</option></select></div>
  <label class="chk"><input type="checkbox" id="shotLbl"> Show shot names</label>
</div>
<div id="visualsPop" class="pop ui">
  <div class="item" id="resetAll" title="Every option back to its default (the song and its position are kept)">↺ Restore all defaults</div>
  <div class="sect">Pianist</div>
  <div class="field"><label>Model</label><select id="model"><option value="">MakeHuman (realistic, CC0)</option></select></div>
  <div class="field" id="vdressField" style="display:none" title="The VRoid pianist's concert dress (VRoid HairSample_Female's, refitted to her), or her own cardigan and shorts"><label>Concert dress</label><select id="vdress"><option value="wine" selected>Wine</option><option value="black">Black</option><option value="navy">Navy</option><option value="emerald">Emerald</option><option value="rose">Rose</option><option value="white">White</option><option value="off">Her own clothes</option></select></div>
  <div class="field"><label>Look</label><select id="look"><option value="realistic">Realistic</option><option value="stylized">Stylized (animated feature)</option><option value="cel" selected>Cel shaded (outlines)</option></select></div>
  <div class="field"><label>Smooth (subdivided)</label><select id="smooth"><option value="0">Off</option><option value="1">1× (4× the triangles)</option><option value="2">2× (16×)</option></select></div>
  <div class="field" title="Fold the body down to a low-poly cage first (pianist/simplify.js), then smooth that: the slider is how far (cm) the cage may stray from the modelled shape. It goes as low as it can within that; the face and hands are held 8× tighter. 0 = as modelled"><label>Low poly first <span id="simplifyV">off</span></label><input type="range" id="simplify" min="0" max="3" step="0.05" value="0"></div>
  <div class="field"><label>Outfit</label><select id="outfit">
    <option value="">Custom (pick below)</option>
    <optgroup label="Long hair · simulated gown, slits from the knee">
    <option value="braid-halter">Champagne halter gown, braid</option>
    <option value="ponytail-qipao">Red qipao gown, ponytail</option>
    <option value="braid-qipao">Ivory fitted qipao gown, braid</option>
    </optgroup>
    <optgroup label="Short dresses and tops">
    <option value="shift-long">Blush shift dress, long hair</option>
    <option value="bob-bodycon">Gold sequin bodycon, brunette bob</option>
    <option value="bob-cocktail">Black cocktail dress, auburn fifties updo</option>
    <option value="bob-tee" selected>White T-shirt and skirt, platinum bob</option>
    <option value="bob-turtleneck">Black sleeveless turtleneck, ash-grey bob</option>
    </optgroup>
    <optgroup label="Evening gowns">
    <option value="long-gown">Red velvet evening gown, blonde fifties updo</option>
    <option value="updo-gown">Hot magenta satin gown, blonde ponytail</option>
    </optgroup>
    <optgroup label="Earlier outfits">
    <option value="reference">Red knit halter, half-up hair</option>
    <option value="sequin-mini">Sequin mini, stiletto booties</option>
    <option value="sequin-gown">Sequin gown, long hair</option>
    <option value="covered">Long sleeves, below the knee</option>
    <option value="tee">T-shirt and skirt, long dark hair</option>
    </optgroup>
  </select></div>
  <div class="field"><label>Hair style</label><select id="hairStyle">
    <option value="halfup">Half-up bun · strands, simulated</option>
    <option value="updo">Bun · strands, no simulation</option>
    <option value="ponytail01">Ponytail · mesh</option>
    <option value="braid01">Braid · mesh</option>
    <option value="bob01">Bob · mesh</option>
    <option value="bob02">Sleek bob · mesh</option>
    <option value="long01">Long · mesh</option>
  </select></div>
  <div class="field"><label>Dress</label><select id="dressStyle">
    <optgroup label="Red knit (ours)">
    <option value="knee-fitted">Below the knee · fitted</option>
    <option value="knee-cloth">Below the knee · simulated skirt</option>
    <option value="gown-cloth">Floor length · simulated skirt</option>
    <option value="gown-fitted">Floor length · fitted</option>
    <option value="knee-fitted-short">Short sleeves · below the knee</option>
    <option value="knee-fitted-long">Long sleeves · below the knee</option>
    <option value="knee-cloth-long">Long sleeves · simulated skirt</option>
    <option value="gown-fitted-long">Long sleeves · floor length</option>
    <option value="gown-cloth-long">Long sleeves · floor length, simulated</option>
    </optgroup>
    <optgroup label="Qipao (ours: stand collar, contrast trim)">
    <option value="gown-cloth-qipao">Qipao · floor length, simulated</option>
    <option value="gown-fitted-qipao">Qipao · floor length, fitted</option>
    <option value="knee-cloth-qipao">Qipao · below the knee, simulated</option>
    <option value="knee-fitted-qipao">Qipao · below the knee, fitted</option>
    </optgroup>
  </select></div>
  <div class="field" title="Our dresses (not the community ones): side slits, left and right, from here down to the hem"><label>Gown slits</label><select id="slit"><option value="off">Closed</option><option value="ankle">From the ankle</option><option value="calf" selected>From mid-calf</option><option value="knee">From the knee</option><option value="thigh">From above the knee (high)</option><option value="hip">From the hip (very high)</option></select></div>
  <div class="field"><label>Fabric</label><select id="fabric"><option value="made">Plain (as made)</option><option value="knit">Knit (diamond)</option><option value="satin">Satin</option><option value="silk">Silk charmeuse</option><option value="chiffon">Chiffon</option><option value="crepe">Crepe</option><option value="taffeta">Shot taffeta</option><option value="velvet">Velvet</option><option value="damask">Damask</option><option value="lame">Lamé</option><option value="sequin">Sequins</option><option value="glitter">Glitter</option><option value="beaded">Beaded</option><option value="leather">Leather</option><option value="lace">Lace</option><option value="pleated">Pleated (plissé)</option></select></div>
  <div class="field"><label>Shoes</label><select id="shoeStyle"><option value="flats">Black flats (ours)</option><option value="none">Barefoot</option></select></div>
  <label class="chk"><input type="checkbox" id="hairOn" checked>Hair</label>
  <label class="chk"><input type="checkbox" id="hairSim" checked>Hair simulation (strands, or mesh hair as cloth)</label>
  <label class="chk"><input type="checkbox" id="dressOn" checked>Dress</label>
  <label class="chk"><input type="checkbox" id="clothSim" checked>Skirt simulation</label>
  <div class="field"><label>Strand density</label><select id="hairDensity"><option value="0.5">Light</option><option value="1" selected>Full</option><option value="1.6">Dense</option></select></div>
  <div class="field"><label>Hair colour</label><input type="color" id="hairColor" value="#5a3e2a"></div>
  <div class="field"><label>Dress colour</label><input type="color" id="dressColor" value="#8e1d1b"></div>
  <div class="field" title="MakeHuman's East Asian face target, on the head only (as #047 Wardrobe): 0 % is her own face, 100 % the full target. The body and the clothes stay as they are"><label>Face: East Asian <span class="val" id="faceAsianV"></span></label><input type="range" id="faceAsian" min="0" max="1" step="0.01" value="0"></div>
  <div class="field" title="MakeHuman's African face target, on the head only. With the East Asian one the two add up to at most 100 %"><label>Face: African <span class="val" id="faceAfricanV"></span></label><input type="range" id="faceAfrican" min="0" max="1" step="0.01" value="0"></div>
  <div class="field" title="MakeHuman's young women's skin textures (as #047 Wardrobe)"><label>Skin</label><select id="skinTex"><option value="caucasian" selected>European</option><option value="asian">East Asian</option><option value="african">African</option></select></div>
  <div class="sect">Liner notes<small>background and analysis for pieces that have notes (ⓘ in Songs)</small></div>
  <div class="field" title="Intertitles: the few short lines the notes mark for the screen, faded in and out with room to read. Every note: each note as a caption as it comes. Click one, or press I, for the full notes"><label>On screen while it plays (I: the notes)</label><select id="linerMode"><option value="intertitles" selected>Intertitles</option><option value="notes">Every note (captions)</option><option value="off">Nothing</option></select></div>
  <div class="field" title="The story: history, trivia and the title"><label>Intertitle style</label><select id="itStyle"></select></div>
  <div class="field" title="The intertitles about the music itself (analysis, things to listen for), in a voice of their own"><label>Analysis style</label><select id="itStyleA"><option value="same">Same as the story</option></select></div>
  <div class="field" title="History and trivia float: the first a few seconds in, then one every 20–30 s through the opening, then spread over the rest. Each take places them differently (the same take, the same places, here and in the export). Lines about the music stay where the music is"><label>Floating intertitles: take <span class="val" id="itSeedV">1</span></label><div class="btnrow" style="padding:0"><button id="itSeedPrev" class="sec">‹ Previous take</button><button id="itSeedNext" class="sec">Next take ›</button></div></div>
  <div class="field"><label>Intertitle colours</label><select id="itTheme"></select></div>
  <div class="field" title="Automatic: each intertitle goes to the corner of the frame that the pianist and the piano fill least, as the camera sees them when it appears (her face counts most); when two are about as empty, the one away from her. In a Short: the top or the bottom of the safe area, the same way"><label>Intertitle position</label><select id="itPos"></select></div>
  <label class="chk" title="The small capitals over each line (a place and year, a bar, a term)"><input type="checkbox" id="itHeads" checked>Headings over the lines</label>
  <div class="sect">Stage</div>
  <div class="field" title="Black stage: the grand under its spotlights on a dark floor. Candlelit chamber (from #030): a stone wall with arches behind the piano, some 200 candles on two tiers and along the sides, sconces, a warm candle palette for the lights and the reflections"><label>Stage</label><select id="stageSet"><option value="stage" selected>Black stage</option><option value="candle">Candlelit chamber</option></select></div>
  <div class="field"><label>Piano finish</label><select id="finish"></select></div>
  <div class="field" title="The lid on its long stick (32°), on the short one (13°), or closed"><label>Lid</label><select id="lid"><option value="full" selected>Open, full stick</option><option value="half">Open, short stick</option><option value="closed">Closed</option></select></div>
  <div class="field"><label>Main light</label><input type="range" id="light" min="0" max="2" step="0.01" value="1"></div>
  <div class="field"><label>Exposure</label><input type="range" id="exposure" min="0.3" max="2.5" step="0.01" value="1"></div>
  <div class="sect">Post-processing</div>
  <label class="chk" title="A focus puller keeps her eyes sharp in the shots of her and one hand in the shots of the hands (the one nearer the middle of the frame or the busier, changing only when the other clearly wins for 1.5 s), the shallower the closer the camera. Path-traced stills and videos trace the same focus and blur through a lens"><input type="checkbox" id="dof">Depth of field</label>
  <div class="field" title="How soft the out-of-focus parts get (each shot also has its own amount: shallower along the keys and on the hammers, deeper looking straight down)"><label>Blur <span class="val" id="dofAmtV"></span></label><input type="range" id="dofAmt" min="0.2" max="4" step="0.05" value="1"></div>
  <label class="chk"><input type="checkbox" id="bloom">Bloom</label>
  <div class="field"><label>Bloom strength <span class="val" id="bloomAmtV"></span></label><input type="range" id="bloomAmt" min="0" max="1.2" step="0.01" value="0.12"></div>
  <label class="chk"><input type="checkbox" id="filmGrain">Film grain &amp; vignette</label>
  <div class="field"><label>Grain <span class="val" id="grainAmtV"></span></label><input type="range" id="grainAmt" min="0" max="0.12" step="0.001" value="0.035"></div>
  <div class="field"><label>Vignette <span class="val" id="vigV"></span></label><input type="range" id="vig" min="0" max="1.2" step="0.01" value="0.55"></div>
  <label class="chk" title="Dust motes drifting through the spotlight"><input type="checkbox" id="dust">Dust in the light</label>
  <div class="field"><label>Dust <span class="val" id="dustAmtV"></span></label><input type="range" id="dustAmt" min="0" max="0.6" step="0.01" value="0.18"></div>
  <div class="field"><label>Sound</label><select id="sf"></select></div>
  <div class="field" title="Fine-tune when the hands and keys move against the sound, if your speakers or headphones report their delay wrongly (Bluetooth often does). Positive = the picture later."><label>Picture vs sound</label><input type="range" id="avsync" min="-200" max="200" step="5" value="0"><span id="avsyncV">0 ms</span></div>
</div>
<div id="perfPop" class="pop ui">
  <div class="sect">Body<small>how much she moves with the music</small></div>
  <div class="field" title="After the last note she lifts off and comes back to the middle; about 2 s later her hands go to rest: in her lap (one on each thigh, fingers toward the knees), together in her lap (the right one over the left), by her sides (the palms against her thighs by the hips), or they stay over the keys. An export needs Render → Tail after the end of 4 s or more to show it all"><label>Hands after the end</label><select id="restAfter"><option value="lap" selected>In her lap</option><option value="clasp">Together in her lap</option><option value="sides">By her sides</option><option value="none">Stay over the keys</option></select></div>
  <div class="field"><label>Body expression</label><input type="range" id="expr" min="0" max="2" step="0.1" value="1"></div>
  <div class="field"><label>Posture</label><input type="range" id="posture" min="-0.5" max="1.6" step="0.05" value="0.5"><span id="postureV">between</span></div>
  <div class="field"><label>Weight shift (one hip)</label><input type="range" id="hips" min="0" max="2" step="0.1" value="1"></div>
  <div class="field" title="How far she leans and turns toward the register her hands are in (0 = stays square to the keys)"><label>Lean toward the hands</label><input type="range" id="reach" min="0" max="2" step="0.1" value="1"><span id="reachV">1×</span></div>
  <div class="field" title="How much she rocks forward and back with the music around her posture"><label>Rocking (forward / back)</label><input type="range" id="rock" min="0" max="2.5" step="0.1" value="1"><span id="rockV">1×</span></div>
  <div class="field" title="How much she sways side to side with the music"><label>Sway (side to side)</label><input type="range" id="sway" min="0" max="2.5" step="0.1" value="1"><span id="swayV">1×</span></div>
  <div class="sect">Head and eyes</div>
  <div class="field"><label>Gaze</label><select id="gaze"><option value="hands">At the hands</option><option value="music">With the music (hands + horizon)</option><option value="horizon" selected>Mostly the horizon</option></select></div>
  <div class="field" title="Nods into accents and small head movements"><label>Head movement</label><input type="range" id="nod" min="0" max="2.5" step="0.1" value="1"><span id="nodV">1×</span></div>
  <div class="field" title="How often she looks up from the keys (on top of the Gaze mode)"><label>Glances</label><input type="range" id="glances" min="0" max="2" step="0.1" value="1"><span id="glancesV">1×</span></div>
  <div class="sect">Fingers<small>Chopin: let each finger fall, in its own way</small></div>
  <div class="field" title="Fall: each finger rises in the free time before its note (higher for louder notes) and falls onto the key, each in its own way: the thumb low from the base of the hand, the 2nd light and quick, the 3rd steady, the 4th rising a little with the 3rd, the 5th firm. Press: every finger the same, pushed down as in #029 / #030"><label>Finger touch</label><select id="touch"><option value="fall" selected>Fall (each its own way)</option><option value="press">Press (all alike)</option></select></div>
  <div class="field" title="Chopin: the 4th finger is not avoided, the 5th takes the outer voice of a chord (the top in the right hand, the bass in the left), the 3rd sings long melody notes. Standard: the usual textbook rules"><label>Fingering</label><select id="fingering"><option value="standard" selected>Standard</option><option value="chopin">Chopin</option></select></div>
  <div class="field" title="Which hand plays each note. Automatic, with the tracks' hand crossings (the default): the fingering's own split, except in the passages where the MIDI's hand tracks cross (the left hand's track above the right's, as in the Goldberg's variations for two manuals), which keep the tracks' split. From the score's tracks: where the MIDI names its tracks for the hands (Right hand / Left hand, RH / LH, treble / bass), the edition's own split, hand crossings included; other files fall back to automatic. Automatic: the fingering chooses the split that its fingers play most easily."><label>Hands <small id="handsV"></small></label><select id="hands"></select></div>
  <div class="sect">Hands and arms<small>wrist strokes: lifts, drops, bounces</small></div>
  <div class="field" title="How much loudness comes from the arm: before a loud note the hand lifts in the time it has and falls into the key (0 = fingers only, the hand stays on the keys)"><label>Arm weight</label><input type="range" id="armw" min="0" max="2" step="0.1" value="1"><span id="armwV">1×</span></div>
  <div class="field" title="How high the hands go above the keys: scales every lift (preparation, bounce and lift-off) after the time limits, so at 2× even fast passages come off the keys"><label>Lift height</label><input type="range" id="lifth" min="0" max="2.5" step="0.1" value="1"><span id="lifthV">1×</span></div>
  <div class="field" title="How much the wrist leads the hand up and down, gives on impact and dips under long notes"><label>Wrist flexibility</label><input type="range" id="wflex" min="0" max="2" step="0.1" value="1"><span id="wflexV">1×</span></div>
  <div class="field" title="How much the forearm turns in running notes and broken figures: the hand rolls toward the thumb or the little finger about to play (tremolos, broken octaves, Alberti bass rock it; chords stay level)"><label>Forearm rotation</label><input type="range" id="frot" min="0" max="2.5" step="0.1" value="1"><span id="frotV">1×</span></div>
  <div class="field" title="How far ahead of the hand the elbow moves in a stroke: it rises before the hand lifts and drops before the hand falls (shoulder, elbow, then wrist, as experts play)"><label>Elbow lead</label><input type="range" id="elbowLead" min="0" max="2.5" step="0.1" value="1"><span id="elbowLeadV">1×</span></div>
  <div class="field" title="How high the hands float up after the last note before a rest, and after the final chord"><label>Lift-off at phrase ends</label><input type="range" id="liftoff" min="0" max="2" step="0.1" value="1"><span id="liftoffV">1×</span></div>
  <div class="sect">Bench</div>
  <div class="field"><label>Bench distance</label><input type="range" id="benchDist" min="-20" max="25" step="1" value="0"><span id="benchDistV">0 cm</span></div>
  <div class="field"><label>Bench height</label><input type="range" id="benchH" min="-15" max="15" step="1" value="0"><span id="benchHV">0 cm</span></div>
</div>
<div id="audioPop" class="pop ui">
  <div class="sect">Hall acoustics</div>
  <div class="field"><label>Volume <span class="val" id="volV"></span></label><input type="range" id="vol" min="0" max="2" step="0.01" value="1"></div>
  <div class="field"><label>Room</label><select id="room"></select></div>
  <div class="field"><label>Seat</label><select id="seat"></select></div>
  <div class="field"><label>Reverb <span class="val" id="rvAmtV"></span></label><input type="range" id="rvAmt" min="0" max="2" step="0.01" value="1"></div>
  <div class="field"><label>Decay <span class="val" id="rvDecayV"></span></label><input type="range" id="rvDecay" min="0.4" max="2" step="0.01" value="1"></div>
  <div class="field"><label>Tone <span class="val" id="rvToneV"></span></label><input type="range" id="rvTone" min="0" max="1" step="0.01" value="0.5"></div>
  <div class="field" title="Raises the room (reverb, ambience, applause) relative to the piano"><label>Room boost <span class="val" id="boostV"></span></label><input type="range" id="boost" min="-12" max="12" step="0.5" value="0"></div>
  <div class="sect">Audience</div>
  <div class="field"><label>Hall ambience <span class="val" id="ambV"></span></label><input type="range" id="amb" min="0" max="1" step="0.01" value="0"></div>
  <label class="chk"><input type="checkbox" id="applause">Applause when a song ends</label>
  <div class="btnrow"><button id="clapNow" class="sec">Applaud now</button></div>
</div>
<div id="ptPop" class="pop ui">
  <div class="sect">Path tracing (stills and video)</div>
  <div class="field" title="three-gpu-pathtracer (Garrett Johnson): WebGPU compute on three/webgpu, or its older WebGL fragment-shader tracer (deprecated upstream). MuTracer (Yi Shen): WebGPU, or its WebGL 2 fallback"><label>Renderer</label><select id="ptEngine">
    <option value="gpt-webgpu">three-gpu-pathtracer · WebGPU</option>
    <option value="gpt-webgl">three-gpu-pathtracer · WebGL</option>
    <option value="mu-webgpu" selected>MuTracer · WebGPU</option>
    <option value="mu-webgl">MuTracer · WebGL 2</option>
  </select></div>
  <div class="field" title="Per picture: a still, or each frame of a video. For video, few samples with the denoiser is the practical setting (256 is minutes per second of film)"><label>Samples per pixel</label><select id="ptSpp"><option>4</option><option>8</option><option>16</option><option>64</option><option selected>256</option><option>1024</option><option>4096</option></select></div>
  <div class="field" title="How many times a path may scatter: 3 is enough for the lights on her and the keys, more for light inside the piano and under the lid"><label>Bounces</label><select id="ptBounces"><option>3</option><option selected>6</option><option>10</option></select></div>
  <div class="field"><label>Still size</label><select id="ptSize"><option value="screen">As on screen</option><option value="640x360">640×360 (test)</option><option value="1280x720" selected>1280×720</option><option value="1920x1080">1920×1080</option><option value="3840x2160">3840×2160</option><option value="1080x1920">1080×1920 (Short)</option></select></div>
  <div class="field" title="The strand hair is baked into ribbons facing the camera; fewer, wider strands keep the BVH smaller"><label>Hair strands</label><select id="ptHair"><option value="0.25">25 %</option><option value="0.5" selected>50 %</option><option value="1">All</option></select></div>
  <label class="chk" title="Bloom, film grain and vignette as set in the Look menu, run on the traced picture in the page's order (bloom on linear light, then the page's AgX, then grain), and the same AgX for every tracer. The tracer's picture is captured as linear light up to 8× white in 8 bits, so deep shadows can band a little. No depth of field or dust"><input type="checkbox" id="ptFx">The page's effects (bloom, grain, vignette)</label>
  <label class="chk" title="OIDN on WebGPU (both tracers), MuTracer's JNLM filter on WebGL; three-gpu-pathtracer's WebGL tracer has none"><input type="checkbox" id="ptDenoise" checked>Denoise</label>
  <div id="ptBar"><div></div></div>
  <div id="ptStatus">The song pauses; the picture is frozen at this moment, as the page draws it, then traced.</div>
  <div class="btnrow"><button id="ptStart">Render still</button><button id="ptAll" class="sec" title="The raster frame and every renderer this browser can run, at these settings, one after the other">Compare all</button></div>
  <div class="btnrow"><button id="ptOpenLast" class="sec">Show the last stills</button><button id="ptCancel" class="sec">Cancel</button></div>
</div>
<div id="ptView">
  <canvas id="ptCanvas" title="Drag to move the split: the page's raster picture on the left"></canvas>
  <div id="ptViewBar"><span id="ptTabs"></span><label><input type="checkbox" id="ptSplit" checked> Split with raster</label><label><input type="checkbox" id="ptFxView" checked> Effects</label><button id="ptSave">Save PNG</button><button id="ptClose">Close (Esc)</button></div>
  <div id="ptInfo"></div>
</div>
<div id="renderPop" class="pop ui">
  <div class="sect">Export video (MP4)</div>
  <div class="field" title="YouTube Short: 9:16 at 1080×1920, a clip of the piece (up to 3 minutes) with its own camera plan (hands first, quick cuts, framed for a tall screen) and the text kept clear of YouTube's buttons"><label>Format</label><select id="exFormat"><option value="wide" selected>Landscape video (16:9)</option><option value="short">YouTube Short (9:16)</option></select></div>
  <div id="shortFields">
    <div class="field"><label>Clip <span class="val" id="exClipV">–</span></label><div class="btnrow" style="padding:0"><button id="exClipBtn" class="sec">Choose the clip…</button></div></div>
    <div class="field" title="Stacked: two pictures one above the other, her in the top half and her hands in the bottom one, each with its own camera (the top cuts less often, and never together with the bottom)"><label>Layout</label><select id="exLayout"><option value="one" selected>One picture</option><option value="stack">Stacked: her above, the hands below</option></select></div>
    <div class="field stackOnly" title="How the frame is shared: her picture's height against the hands' (60 / 40 gives her face more room; 40 / 60 more of the keyboard)"><label>Split (her / hands)</label><select id="exSplit"><option value="50" selected>50 / 50</option><option value="60">60 / 40</option><option value="40">40 / 60</option><option value="67">2/3 / 1/3</option></select></div>
    <div class="field stackOnly" title="Camera: her hands filmed, with their own camera plan. Lesson view: the keyboard from above her head with falling notes in each hand's colour (as #030's lesson mode), the finger numbers on them, lit keys and sparks"><label>Hands half</label><select id="exHandsHalf"><option value="camera" selected>Camera (her hands)</option><option value="lesson">Lesson view (falling notes)</option></select></div>
    <div class="field stackOnly lessonOnly" title="First person: from just behind her head, as she sees the keys, the notes falling down a lane that stands up behind them (as #030's First Person). From above: high over the keys, the lane lying flat on the piano"><label>Lesson view</label><select id="exLessonView"><option value="first" selected>First person (upright lane)</option><option value="top">From above (flat lane)</option></select></div>
    <label class="chk" title="Composer and title in the top band for the first 3.5 s (the Short starts on the music: no title card)"><input type="checkbox" id="exShortTitle" checked>Title over the first seconds</label>
    <div class="field" title="Goes into the description saved next to the video (name-short.txt)"><label>Link to the full video</label><input type="text" id="exFullUrl" placeholder="https://youtu.be/…" style="width:100%;box-sizing:border-box;background:#2b2b2b;color:#eee;border:1px solid #444;border-radius:6px;padding:4px 6px;font:inherit"></div>
  </div>
  <div class="field"><label>Resolution</label><select id="exRes"><option value="426x240">240p (preview)</option><option value="854x480">480p (preview)</option><option value="1280x720">720p</option><option value="1920x1080" selected>1080p</option><option value="2560x1440">1440p</option><option value="3840x2160">4K</option></select></div>
  <div class="field"><label>Frame rate</label><select id="exFps"><option>4</option><option>5</option><option>8</option><option>12</option><option>15</option><option>16</option><option>24</option><option>25</option><option>30</option><option selected>60</option></select></div>
  <div class="field wideOnly" title="How much of the song to render: all of it, or a short test from the start or from where the song is now (the seek bar)"><label>Length</label><select id="exLen"><option value="all" selected>Whole song</option><option value="5">First 5 s (path-trace test)</option><option value="20">First 20 s (test)</option><option value="60">First minute</option><option value="here5">5 s from the current position</option><option value="here20">20 s from the current position</option><option value="here60">1 minute from the current position</option></select></div>
  <div class="field" title="Picture before the first note: the scene comes up from black and she sits ready at the keys, the hall quiet, then the music starts. With the title as an intertitle it comes up with the picture and is all but in when the music starts. Automatic: 3 s with the title intertitle, 2 s without. Only for a render from the start of the piece: a clip from later, or a Short, starts on the music"><label>Lead-in before the music</label><select id="exLead"><option value="auto" selected>Automatic (3 s with the title, else 2 s)</option><option value="1">1 s</option><option value="2">2 s</option><option value="3">3 s</option><option value="4">4 s</option><option value="6">6 s</option></select></div>
  <div class="field" title="Picture past the end, for editing: after the last note she lifts off, comes back to the middle and (with hands to the lap) rests, while the hall rings out. Automatic: 2 s (a Short 0.6 s). A clip that ends before the piece does gets a handle of the set length past its out point, the music going on (Automatic gives it none). A Short's sound fades out over the last second"><label>Tail after the end</label><select id="exTail"><option value="auto" selected>Automatic (2 s, a Short 0.6 s)</option><option value="4">4 s</option><option value="6">6 s</option><option value="8">8 s</option><option value="12">12 s</option></select></div>
  <div class="field" title="How the video ends: the picture and the sound (the hall's ring too) fade to black over the Fade length (automatic: the last three quarters of the tail, 2 s at most), or the video cuts on its last frame. Only where the video ends with the piece: a clip that ends earlier keeps its handle as it is, and a Short has its own fades"><label>The end</label><select id="exEnd"><option value="fade" selected>Fade to black</option><option value="cut">Cut (last frame)</option></select></div>
  <div class="field" title="How long the fade to black takes, ending on the video's last frame. Automatic: three quarters of the tail, 2 s at most (1.5 s on the automatic 2 s tail). A fade longer than the tail starts before the last note; it is cut to the video's length"><label>Fade length</label><select id="exFadeLen"><option value="auto" selected>Automatic (3/4 of the tail, up to 2 s)</option><option value="0.5">0.5 s</option><option value="1">1 s</option><option value="1.5">1.5 s</option><option value="2">2 s</option><option value="3">3 s</option><option value="4">4 s</option><option value="6">6 s</option></select></div>
  <div class="field wideOnly"><label>Camera</label><select id="exCam"><option value="auto" selected>Director (auto)</option><option value="current">As on screen</option></select></div>
  <label class="chk"><input type="checkbox" id="exAudio" checked>Include audio (with the hall)</label>
  <div class="field wideOnly" title="Title card: the classic card, before the music. First intertitle: the title fades in over the opening bars like the other intertitles (composer, title and the notes' subtitle, in the intertitle style), and also when the song plays here"><label>Song title</label><select id="exTitle"><option value="none" selected>None (the intertitles open the video)</option><option value="intertitle">As the first intertitle</option><option value="card">Title card (fades out as the music starts)</option></select></div>
  <div class="field wideOnly" id="exHoldF" title="How long the song title stays as the first intertitle, fades included. Auto: 7–11 s by its words. The scene comes up from black more slowly under it (half the hold, 3–8 s)"><label>Title hold <span class="val" id="exHoldV"></span></label><input type="range" id="exHold" min="0" max="20" step="0.5" value="0"></div>
  <label class="chk" title="Draw the liner notes into the picture as they show on screen (Visuals → Liner notes: intertitles, or every note as a caption)"><input type="checkbox" id="exCaps" checked>Liner notes in the picture (as on screen)</label>
  <label class="chk" title="Two WebVTT subtitle files, timed to this video, whatever is on screen: name.vtt with the intertitles and name.notes.vtt with every note's caption (upload each to YouTube as its own subtitle track), and the sections as YouTube chapters for the description"><input type="checkbox" id="exVtt" checked>Save subtitles (intertitles .vtt, all notes .notes.vtt) and YouTube chapters</label>
  <div class="field wideOnly"><label>Title font</label><select id="exFont">
    <option value="inter" selected>Inter (clean sans, like the page)</option>
    <option value="poppins">Poppins (rounder sans)</option>
    <option value="cormorant">Cormorant Garamond</option>
    <option value="playfair">Playfair Display</option>
    <option value="cinzel">Cinzel (capitals)</option>
    <option value="vibes">Great Vibes (script)</option>
    <option value="georgia">Georgia (system)</option>
  </select></div>
  <div class="field wideOnly"><label>Card</label><select id="exCard"><option value="glass" selected>White on frosted glass</option><option value="glow">Warm glow</option></select></div>
  <canvas id="exPreview" class="wideOnly" width="456" height="256" title="The title card as it will look (the picture behind it is the current view)"></canvas>
  <div class="field"><label>Subtitle</label><input type="text" id="exSub" value="Midiviz Pianist" style="width:100%;box-sizing:border-box;background:#2b2b2b;color:#eee;border:1px solid #444;border-radius:6px;padding:4px 6px;font:inherit"></div>
  <div class="field" title="Raster: the page's own picture (fast). Path traced: every frame frozen and traced with the settings of the Path trace menu (renderer, samples, bounces, hair, denoise, effects), the same ones a still uses; the size is this menu's Resolution. Seconds per frame: try a 5 s clip (Length) first"><label>Renderer</label><select id="exPt">
    <option value="raster" selected>Raster (the page, fast)</option>
    <option value="pt">Path traced (Path trace menu settings)</option>
  </select></div>
  <div class="field ptOnly"><div id="exPtInfo" style="font-size:11.5px;opacity:.8;line-height:1.35"></div><div class="btnrow" style="padding:0"><button id="exPtEdit" class="sec">Path trace settings…</button></div></div>
  <div id="exBar"><div></div></div>
  <div id="exStatus">Choose a song first. Rendering is offline, so every frame is smooth however fast the GPU is.</div>
  <div class="btnrow"><button id="exStart">Export</button><button id="exCancel" class="sec">Cancel</button></div>
</div>
<div id="clipStrip" class="ui">
  <div class="row">
    <b>Short</b><span id="clipV"></span>
    <span class="chips" id="clipLens"></span>
    <span class="chips" id="clipSug" title="Suggested clips: they start on a phrase that is already going, hold the piece's most intense music and end on a breath, so the loop doesn't cut a note off"></span>
    <span class="grow"></span>
    <button id="clipPlay" class="cbtn">▶ Preview 9:16</button><button id="clipDone" class="cbtn sec">Done</button>
  </div>
  <canvas id="clipCv" height="64" title="Drag the edges to set the clip (they snap to phrase starts and ends; Shift: free), drag the middle to move it, click elsewhere to start it there"></canvas>
</div>
<div id="shortBox"><canvas id="shortOv"></canvas><div id="safeBox"></div></div>
<div id="transport" class="ui">
  <div id="songTitle" title="Swipe left / right for the next / previous song"></div>
  <div id="times"><span id="tNow">0:00.000</span><span id="tLeft">-0:00</span></div>
  <input id="seek" type="range" min="0" max="1" step="0.0005" value="0">
  <div id="controls">
    <button class="tbtn" id="speedBtn" title="Playback speed"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 4a10 10 0 0 0-8.7 15h17.4A10 10 0 0 0 12 4zm0 2a8 8 0 0 1 7.5 11h-15A8 8 0 0 1 12 6zm4.2 2.4-5 5.2a1.5 1.5 0 1 0 2.1 2.1z"/></svg><span id="speedLbl">1×</span></button>
 <button class="tbtn navbtn" id="prevBtn" title="Previous song"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 5h2v14H6zm3.5 7L18 18V6z"/></svg></button>
    <button class="tbtn" id="playBtn" title="Play / pause"><svg id="playIcon" width="30" height="30" viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></button>
    <button class="tbtn navbtn" id="nextBtn" title="Next song"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM6 6v12l8.5-6z"/></svg></button>
    <button class="tbtn off" id="loopBtn" title="Loop"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z"/></svg></button>
  </div>
</div>
<div id="start" class="ui-start"><button aria-label="Play"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></button><div class="t"></div><div class="s">Tap to play · or pick a song from Songs</div></div>
<div id="status" class="hidden"></div>
<div id="shotName"></div>
<div id="tapFx"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></div>
<div id="caption">MEET YOUR NEW AI <b>PIANIST</b></div>

`
