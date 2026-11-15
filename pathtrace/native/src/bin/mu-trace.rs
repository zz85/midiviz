// Renders frames of the page with native MuTracer, from the scene the page hands it: pathtrace/native-scene.js
// runs MuTracer's own fromTHREEScene on the page's snapshot (as the mu-webgpu engine does) and writes the
// result, unchanged, as scene.json + scene.bin. This rebuilds it with the native Scene API, so native and
// the page trace the same scene from the same conversion.
//   mu-trace <ir dir> <out.png> [--spp N] [--bounces N] [--size WxH] [--backend hardware|software] [--denoise] [--raw]
//       one frame; prints one JSON line: the adapter, the path traced, what was left out, timings in ms.
//       --raw writes RGBA8 bytes, top row first, instead of a PNG (which takes about 1.1 s to encode at 4K)
//   mu-trace --serve
//       many frames, one engine: a JSON line a frame on stdin, {"dir", "out", "spp", "bounces", "width", "height",
//       "denoise", "backend", "raw"}, answered by its report line (or {"error"}) on stdout; ends at the end of stdin.
//       The engine keeps its compiled shaders, and MuTracer commits each new frame against the last one
//       (commit_plan.rs): what moved (skinned vertices, transforms, the camera, lights) is edited in place,
//       unchanged geometry keeps its acceleration structure and unchanged textures their atlas.
//       The report's "commit" says which it was.
//
// Materials go across by name: every OpenPBR property the page's material has is set by its frozen native
// property ID from MuTracer's own schema (native/schemas/material-properties.json), so nothing here maps
// material parameters by hand.
use mutracer_native_probe::{
    api,
    scene_api::{Environment, Geometry, Light, Mesh, OpenPbrMaterial, Scene, Texture, TexturePixels},
};
use glam::Mat4;
use serde_json::{Value, json};
use std::{collections::HashMap, io::{BufRead, Write}, path::Path, sync::{Arc, Mutex}, time::Instant};

const SCHEMA: &str = include_str!("../../mutracer/native/schemas/material-properties.json");
// mutracer-layout.h: header words and the light record (mt_light_v4)
const H_LIGHT_COUNT: usize = 7;
const H_LIGHT_OFFSET: usize = 12;
const H_MESH_AOV_IDS: usize = 24;
const H_MATERIAL_AOV_IDS: usize = 25;
const L_WORDS: usize = 28;
const L_TYPE: usize = 0;
const L_SIZE: usize = 5;
const LIGHT_SPOT: u32 = 3;

type Res<T> = Result<T, Box<dyn std::error::Error>>;

struct Blob(Vec<u8>);
impl Blob {
    fn bytes(&self, r: &Value, size: usize) -> Res<&[u8]> {
        let (o, n) = (r["o"].as_u64().ok_or("ref without o")? as usize, r["n"].as_u64().ok_or("ref without n")? as usize);
        self.0.get(o..o + n * size).ok_or_else(|| format!("ref {o}+{n}x{size} outside scene.bin").into())
    }
    fn f32s(&self, r: &Value) -> Res<Arc<[f32]>> {
        Ok(self.bytes(r, 4)?.chunks_exact(4).map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect())
    }
    fn u32s(&self, r: &Value) -> Res<Arc<[u32]>> {
        Ok(self.bytes(r, 4)?.chunks_exact(4).map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect())
    }
}
fn f(v: &Value) -> f32 { v.as_f64().unwrap_or(0.) as f32 }
fn arr<const N: usize>(v: &Value) -> [f32; N] { std::array::from_fn(|i| f(&v[i])) }
fn mat(v: &Value) -> Mat4 { Mat4::from_cols_array(&arr::<16>(v)) }
fn wrap(v: &Value) -> u32 { match v.as_str() { Some("clamp-to-edge") => 1, Some("mirrored-repeat") => 2, _ => 0 } }
fn ms(t: Instant) -> f64 { (t.elapsed().as_secs_f64() * 1e4).round() / 10. }

struct Prop { id: u32, kind: String, values: Vec<String> }
fn schema() -> Res<HashMap<String, Prop>> {
    let schema: Vec<Value> = serde_json::from_str(SCHEMA)?;
    Ok(schema.iter().filter(|e| e["supported"].as_bool() != Some(false)).map(|e| (e["key"].as_str().unwrap().to_owned(), Prop {
        id: e["id"].as_u64().unwrap() as u32, kind: e["type"].as_str().unwrap().to_owned(),
        values: e["values"].as_array().map(|v| v.iter().filter_map(|x| x.as_str().map(str::to_owned)).collect()).unwrap_or_default(),
    })).collect())
}

/// One frame of the page as a native descriptor, with what the display needs.
struct Frame { descriptor: Vec<u8>, size: (u32, u32), tone_mapping: api::ToneMapping, exposure: f32, lights: usize, spots_with_radius: usize, left_out: Vec<String>, ms: f64 }

fn load_frame(dir: &Path, props: &HashMap<String, Prop>) -> Res<Frame> {
    let t = Instant::now();
    let m: Value = serde_json::from_slice(&std::fs::read(dir.join("scene.json"))?)?;
    let blob = Blob(std::fs::read(dir.join("scene.bin"))?);
    let mut left_out: Vec<String> = vec![];
    let mut note = |s: String| if !left_out.contains(&s) { left_out.push(s) };

    let mut scene = Scene::new();
    let mut textures = vec![];
    for tx in m["textures"].as_array().into_iter().flatten() {
        let (tw, th) = (tx["width"].as_u64().unwrap() as u32, tx["height"].as_u64().unwrap() as u32);
        let pixels = match tx["storage"].as_str() {
            Some("rgba32f") => TexturePixels::Rgba32F(blob.f32s(&tx["data"])?),
            _ => TexturePixels::Rgba8(Arc::from(blob.bytes(&tx["data"], 1)?)),
        };
        textures.push(scene.add_texture(Texture {
            pixels, width: tw, height: th, uv: tx["uvChannel"].as_u64().unwrap_or(0) as u32,
            scale: arr::<2>(&tx["uvScale"]), offset: arr::<2>(&tx["uvOffset"]),
            wrap: [wrap(&tx["wrapS"]), wrap(&tx["wrapT"])], flip_y: tx["flipY"].as_bool().unwrap_or(false),
        })?);
    }
    let tex = |v: &Value| v.as_u64().map(|i| textures[i as usize]);
    let mut geometries = vec![];
    for g in m["geometries"].as_array().into_iter().flatten() {
        let mut geo = Geometry::new(blob.f32s(&g["position"])?, blob.u32s(&g["indices"])?);
        if !g["normal"].is_null() { geo.normals = blob.f32s(&g["normal"])?; }
        if !g["tangent"].is_null() { geo.tangents = blob.f32s(&g["tangent"])?; }
        if !g["uv"].is_null() { geo.uv[0] = blob.f32s(&g["uv"])?; }
        if !g["uv1"].is_null() { geo.uv[1] = blob.f32s(&g["uv1"])?; }
        if !g["color"].is_null() {
            let c = blob.f32s(&g["color"])?;
            let k = g["color"]["itemSize"].as_u64().unwrap_or(3) as usize;
            geo.colors = if k == 3 { c } else { c.chunks_exact(k).flat_map(|p| [p[0], p[1], p[2]]).collect() };
        }
        if !g["materialIndex"].is_null() { geo.material_indices = blob.u32s(&g["materialIndex"])?; }
        geometries.push(scene.add_geometry(geo)?);
    }
    let mut materials = vec![];
    for mt in m["materials"].as_array().into_iter().flatten() {
        let mut mat = OpenPbrMaterial::default();
        mat.values.name = mt["name"].as_str().unwrap_or("").to_owned();
        for (key, v) in mt["props"].as_object().into_iter().flatten() {
            let Some(p) = props.get(key) else { note(format!("material property {key}")); continue };
            let r = match p.kind.as_str() {
                "float" => mat.set_float(p.id, [f(v), 0., 0.]),
                "color" => mat.set_float(p.id, arr::<3>(v)),
                "vec2" => mat.set_float(p.id, [f(&v[0]), f(&v[1]), 0.]),
                "bool" => mat.set_uint(p.id, v.as_bool().unwrap_or(false) as u32),
                "enum" => match p.values.iter().position(|x| Some(x.as_str()) == v.as_str()) {
                    Some(i) => mat.set_uint(p.id, i as u32),
                    None => { note(format!("{key} = {v}")); continue }
                },
                _ => continue,
            };
            if let Err(e) = r { note(format!("{key} = {v}: {e}")); }
        }
        for (key, v) in mt["maps"].as_object().into_iter().flatten() {
            match props.get(key) {
                Some(p) if p.kind == "texture" => mat.set_texture(p.id, tex(v))?,
                _ => note(format!("material map {key}")),
            }
        }
        materials.push(scene.add_material(mat)?);
    }
    for me in m["meshes"].as_array().into_iter().flatten() {
        let ms: Vec<_> = me["materials"].as_array().unwrap().iter().map(|i| materials[i.as_u64().unwrap() as usize]).collect();
        let mut mesh = Mesh::new(geometries[me["geometry"].as_u64().unwrap() as usize], ms[0]);
        if ms.len() > 1 { mesh.materials = ms; }
        mesh.transform = mat(&me["transform"]);
        scene.add_mesh(mesh)?;
    }
    // (the Scene API has no spot radius; the descriptor does, so it is written in after encoding)
    let mut spot_radius: Vec<(usize, f32)> = vec![];
    let mut n_lights = 0;
    for l in m["lights"].as_array().into_iter().flatten() {
        let (color, intensity, transform) = (arr::<3>(&l["color"]), f(&l["intensity"]), mat(&l["transform"]));
        let light = match l["type"].as_str().unwrap_or("") {
            "SpotLight" => {
                spot_radius.push((n_lights, f(&l["radius"])));
                Light::Spot { color, intensity, inner: f(&l["innerAngle"]), outer: f(&l["outerAngle"]), transform, ies: Arc::from(Vec::<u8>::new()) }
            }
            "RectLight" => Light::Rect { color, intensity, width: f(&l["size"][0]), height: f(&l["size"][1]), spread: f(&l["spread"]), transform, texture: tex(&l["texture"]) },
            "SphereLight" => Light::Sphere { color, intensity, radius: f(&l["radius"]), transform },
            "DirectionalLight" => Light::Directional { color, intensity, transform },
            k => { note(format!("light {k}")); continue }
        };
        scene.add_light(light)?;
        n_lights += 1;
    }
    let mut env = Environment::default();
    let mut es = scene.environment_settings();
    if let Some(e) = m["environment"].as_object() {
        env.texture = tex(&e["texture"]);
        es.intensity = f(&e["intensity"]);
        es.rotation = f(&e["rotation"]);
    }
    match &m["background"] {
        Value::Object(b) if b.contains_key("color") => env.color = arr::<4>(&b["color"]),
        Value::Object(b) => { env.background = tex(&b["texture"]); es.background_intensity = f(&b["intensity"]); es.background_rotation = f(&b["rotation"]); }
        _ => {}
    }
    scene.set_environment(env)?;
    scene.set_environment_settings(es)?;
    let c = &m["camera"];
    let mut camera = api::Camera::default();
    camera.projection = (c["projection"].as_str() == Some("orthographic")) as u32;
    for (field, key) in [(&mut camera.fov, "fov"), (&mut camera.near_clip, "near"), (&mut camera.far_clip, "far"), (&mut camera.left, "left"), (&mut camera.right, "right"),
        (&mut camera.bottom, "bottom"), (&mut camera.top, "top"), (&mut camera.zoom, "zoom"), (&mut camera.f_stop, "fStop"), (&mut camera.focus_distance, "focusDistance"),
        (&mut camera.sensor_height, "sensorHeight"), (&mut camera.meters_per_unit, "metersPerUnit")] {
        if let Some(v) = c[key].as_f64() { *field = v as f32; }
    }
    camera.world_matrix = arr::<16>(&c["transform"]);
    scene.set_default_camera(Some(camera));

    let mut d = scene.descriptor()?.as_ref().clone();
    let word = |d: &[u8], i: usize| u32::from_le_bytes([d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]]);
    let (count, at) = (word(&d, H_LIGHT_COUNT) as usize, word(&d, H_LIGHT_OFFSET) as usize);
    if count != n_lights { return Err(format!("descriptor has {count} lights, the scene {n_lights}").into()); }
    for (i, r) in &spot_radius {
        let rec = at + i * L_WORDS;
        if word(&d, rec + L_TYPE) != LIGHT_SPOT { return Err(format!("light {i} is not a spot in the descriptor").into()); }
        d[(rec + L_SIZE) * 4..(rec + L_SIZE) * 4 + 4].copy_from_slice(&r.to_le_bytes());
    }
    // Each new Scene gives its meshes and materials new process-wide AOV ids, so to MuTracer's commit every
    // frame would be a different scene, prepared in full. Without the ID tables the core numbers them by
    // index (scene-sync.ts), the same from frame to frame; nothing here reads ID AOVs.
    for h in [H_MESH_AOV_IDS, H_MATERIAL_AOV_IDS] { d[h * 4..h * 4 + 4].copy_from_slice(&0u32.to_le_bytes()); }
    Ok(Frame {
        descriptor: d,
        size: (m["size"][0].as_u64().unwrap_or(1280) as u32, m["size"][1].as_u64().unwrap_or(720) as u32),
        tone_mapping: if m["display"]["toneMapping"].as_str() == Some("linear") { api::ToneMapping::Linear } else { api::ToneMapping::Agx },
        exposure: m["display"]["exposure"].as_f64().unwrap_or(1.) as f32,
        lights: n_lights, spots_with_radius: spot_radius.iter().filter(|(_, r)| *r > 0.).count(), left_out, ms: ms(t),
    })
}

struct Options { spp: u32, bounces: u32, size: Option<(u32, u32)>, backend: api::Backend, denoise: bool, raw: bool }
type RenderKey = (u32, u32, u32, u32, bool);
/// The engine and its render, kept from frame to frame.
#[derive(Default)]
struct Host { engine: Option<(api::Engine, bool)>, render: Option<(api::Render, RenderKey)>, frames: u32 }

fn trace(host: &mut Host, frame: &Frame, o: &Options, out: &Path) -> Res<Value> {
    let t_all = Instant::now();
    let (w, h) = o.size.unwrap_or(frame.size);
    let software = matches!(o.backend, api::Backend::Software);
    let t = Instant::now();
    let warm = host.engine.as_ref().is_some_and(|(_, s)| *s == software);
    if !warm { host.render = None; host.engine = Some((api::Engine::new(api::EngineOptions { backend: o.backend })?, software)); }
    let engine = &host.engine.as_ref().unwrap().0;
    let key: RenderKey = (w, h, o.spp, o.bounces, o.denoise);
    if host.render.as_ref().is_none_or(|(_, k)| *k != key) {
        host.render = None;
        let render = api::Render::new(engine, api::RenderSettings { max_samples: o.spp, bounces: o.bounces, size: api::RenderSize::Fixed { width: w, height: h }, ..Default::default() })?;
        if o.denoise { render.set_denoiser(Some(api::DenoiserOptions { backend: api::DENOISE_OIDN_WEBGPU, max_tile_size: 512, ..Default::default() }))?; }
        host.render = Some((render, key));
    }
    let render = &host.render.as_ref().unwrap().0;
    engine.set_scene(&frame.descriptor)?;
    engine.update()?;
    let display = engine.display();
    display.set_size(w, h)?;
    display.set_settings(api::DisplaySettings { tone_mapping: frame.tone_mapping, tone_mapping_exposure: frame.exposure, ..Default::default() })?;
    let setup_ms = ms(t);

    let t = Instant::now();
    // (progress comes a batch at a time: the first report is the first batch, preparation and all, not one sample)
    let first = Arc::new(Mutex::new(None::<(f64, u32)>));
    let mut c = api::ConvergeOptions::new(o.spp);
    c.samples_per_batch = o.spp.clamp(1, 8);
    c.timeout_ms = 6 * 3600 * 1000;
    let f1 = first.clone();
    c.on_progress = Some(Box::new(move |p: api::ConvergeProgress| { let mut g = f1.lock().unwrap(); if g.is_none() && p.samples >= 1 { *g = Some((ms(t), p.samples)); } }));
    let done = render.converge(c)?;
    let _ = render.read_pixels(api::PixelKind::Hdr)?;   // waits for the GPU
    let trace_ms = ms(t);
    // the path actually traced (a hardware engine falls back to its own BVH where ray queries can't take the scene),
    // and how MuTracer committed this frame against the last
    let (used, fallback) = render.backend()?;
    let commit = render.last_commit()?.map(|k| if matches!(k, api::CommitKind::Incremental) { "incremental" } else { "full" });
    // A PNG takes about 1.1 s to encode at 4K (and the page decodes it again); raw RGBA8, top row first, is a copy
    let t = Instant::now();
    if o.raw { std::fs::write(out, display.read_rgba8(render)?.2)?; } else { std::fs::write(out, display.encode_png(render)?)?; }
    let encode_ms = ms(t);
    host.frames += 1;
    let info = engine.info();
    Ok(json!({
        "engine": "mu-native", "adapter": info.adapter_name, "hwrt": matches!(used, api::Backend::Hardware), "device_has_ray_queries": info.hardware_ray_query,
        "fallback": fallback, "backend": if software { "software" } else { "hardware" },
        "width": w, "height": h, "samples": done.samples, "bounces": o.bounces, "denoise": o.denoise, "out": out, "format": if o.raw { "rgba8" } else { "png" },
        "lights": frame.lights, "spots_with_radius": frame.spots_with_radius, "left_out": frame.left_out,
        "warm": warm, "commit": commit, "frame": host.frames,
        "first_batch": first.lock().unwrap().map(|(ms, samples)| json!({ "ms": ms, "samples": samples })),
        "timings_ms": { "scene": frame.ms, "setup": setup_ms, "trace": trace_ms, "encode": encode_ms, "total": frame.ms + ms(t_all) },
    }))
}

fn backend_of(s: Option<&str>) -> api::Backend { if s == Some("software") { api::Backend::Software } else { api::Backend::Hardware } }

fn serve(props: &HashMap<String, Prop>) -> Res<()> {
    let mut host = Host::default();
    let mut stdout = std::io::stdout().lock();
    for line in std::io::stdin().lock().lines() {
        let line = line?;
        if line.trim().is_empty() { continue }
        let answer = (|| -> Res<Value> {
            let r: Value = serde_json::from_str(&line)?;
            let o = Options {
                spp: r["spp"].as_u64().unwrap_or(16) as u32, bounces: r["bounces"].as_u64().unwrap_or(10) as u32,
                size: r["width"].as_u64().zip(r["height"].as_u64()).map(|(w, h)| (w as u32, h as u32)),
                backend: backend_of(r["backend"].as_str()), denoise: r["denoise"].as_bool().unwrap_or(false), raw: r["raw"].as_bool().unwrap_or(false),
            };
            let frame = load_frame(Path::new(r["dir"].as_str().ok_or("no dir")?), props)?;
            trace(&mut host, &frame, &o, Path::new(r["out"].as_str().ok_or("no out")?))
        })().unwrap_or_else(|e| {
            // (a failed frame leaves no state behind: the next one starts a new engine)
            host = Host { frames: host.frames, ..Host::default() };
            json!({ "error": e.to_string() })
        });
        writeln!(stdout, "{answer}")?;
        stdout.flush()?;
    }
    Ok(())
}

// MuTracer's log goes to a C callback only; MU_TRACE_LOG=1 sends it to stderr (with MUTRACER_NATIVE_PROFILE=1,
// a line per commit says whether it was incremental and where the time went)
unsafe extern "C" {
    fn mt_set_log_callback(callback: Option<unsafe extern "C" fn(*mut std::ffi::c_void, *const u8, usize)>, user: *mut std::ffi::c_void) -> i32;
}
unsafe extern "C" fn log_to_stderr(_: *mut std::ffi::c_void, message: *const u8, length: usize) {
    eprintln!("[mutracer] {}", String::from_utf8_lossy(unsafe { std::slice::from_raw_parts(message, length) }));
}

fn main() -> Res<()> {
    let a: Vec<String> = std::env::args().collect();
    if std::env::var_os("MU_TRACE_LOG").is_some_and(|v| v == "1") { unsafe { mt_set_log_callback(Some(log_to_stderr), std::ptr::null_mut()); } }
    let props = schema()?;
    if a.get(1).map(String::as_str) == Some("--serve") { return serve(&props); }
    if a.len() < 3 { return Err("usage: mu-trace <ir dir> <out.png> [--spp N] [--bounces N] [--size WxH] [--backend hardware|software] [--denoise]\n       mu-trace --serve".into()); }
    let flag = |k: &str| a.iter().position(|x| x == k).and_then(|i| a.get(i + 1)).cloned();
    let size = match flag("--size") {
        Some(s) => { let v: Vec<u32> = s.split('x').map(|x| x.parse()).collect::<Result<_, _>>()?; Some((v[0], v[1])) }
        None => None,
    };
    let o = Options {
        spp: flag("--spp").map(|s| s.parse()).transpose()?.unwrap_or(16), bounces: flag("--bounces").map(|s| s.parse()).transpose()?.unwrap_or(10),
        size, backend: backend_of(flag("--backend").as_deref()), denoise: a.iter().any(|x| x == "--denoise"), raw: a.iter().any(|x| x == "--raw"),
    };
    let frame = load_frame(Path::new(&a[1]), &props)?;
    println!("{}", trace(&mut Host::default(), &frame, &o, Path::new(&a[2]))?);
    Ok(())
}
