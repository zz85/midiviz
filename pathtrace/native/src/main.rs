// Renders the frame pathtrace/desktop exports (node run.mjs --export: scene.glb, scene.json, env.f32) with native MuTracer,
// timing it with software BVH traversal and with ray queries, on the device wgpu picks (Metal on macOS, Vulkan or DX12 elsewhere).
//   native-bench <export dir> [samples] [bounces] [WxH] [software|hardware|both]
use mutracer_native_probe::{api, scene_api::{Environment, Light, Scene, Texture, TexturePixels}};
use glam::{Mat4, Vec3};
use std::{sync::Arc, time::Instant};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<String> = std::env::args().collect();
    let dir = std::path::PathBuf::from(a.get(1).map(String::as_str).unwrap_or("/tmp/pt_export"));
    let samples: u32 = a.get(2).map(|s| s.parse().unwrap()).unwrap_or(4);
    let bounces: u32 = a.get(3).map(|s| s.parse().unwrap()).unwrap_or(10);
    let (w, h) = a.get(4).map(|s| { let v: Vec<u32> = s.split('x').map(|x| x.parse().unwrap()).collect(); (v[0], v[1]) }).unwrap_or((1280, 720));
    let which = a.get(5).map(String::as_str).unwrap_or("both");
    let meta: serde_json::Value = serde_json::from_slice(&std::fs::read(dir.join("scene.json"))?)?;

    let t = Instant::now();
    let imported = Scene::import_gltf(dir.join("scene.glb"))?;
    let mut scene = imported.scene;
    for w in &imported.warnings { eprintln!("glTF warning: {w}"); }
    let import_ms = t.elapsed().as_millis();

    // lights, as engines.js hands them to the browser MuTracer
    let v3 = |v: &serde_json::Value| Vec3::new(v[0].as_f64().unwrap() as f32, v[1].as_f64().unwrap() as f32, v[2].as_f64().unwrap() as f32);
    for l in meta["lights"].as_array().unwrap() {
        let color = { let c = v3(&l["color"]); [c.x, c.y, c.z] };
        let intensity = l["intensity"].as_f64().unwrap() as f32;
        match l["kind"].as_str().unwrap() {
            "spot" => {
                let (p, target) = (v3(&l["position"]), v3(&l["target"]));
                // light emits along local -Z: look from p at target
                let transform = Mat4::look_at_rh(p, target, if (target - p).normalize().y.abs() > 0.99 { Vec3::Z } else { Vec3::Y }).inverse();
                let angle = l["angle"].as_f64().unwrap() as f32; let pen = l["penumbra"].as_f64().unwrap() as f32;
                let outer = angle.to_degrees();
                let (co, ci) = (angle.cos(), (angle * (1. - pen)).cos());
                let inner = outer * (1. - (ci - co).min(1.));
                scene.add_light(Light::Spot { color, intensity, inner, outer, transform, ies: Arc::from(Vec::<u8>::new()) })?;
            }
            "rect" => {
                let m: Vec<f32> = l["matrix"].as_array().unwrap().iter().map(|x| x.as_f64().unwrap() as f32).collect();
                scene.add_light(Light::Rect { color, intensity, width: l["width"].as_f64().unwrap() as f32, height: l["height"].as_f64().unwrap() as f32,
                    spread: 1., transform: Mat4::from_cols_slice(&m), texture: None })?;
            }
            "point" => { scene.add_light(Light::Sphere { color, intensity, radius: l["radius"].as_f64().unwrap_or(0.) as f32, transform: Mat4::from_translation(v3(&l["position"])) })?; }
            k => eprintln!("light kind {k} left out"),
        }
    }
    if let Some(env) = meta["env"].as_object() {
        let (ew, eh) = (env["width"].as_u64().unwrap() as usize, env["height"].as_u64().unwrap() as usize);
        let raw = std::fs::read(dir.join(env["file"].as_str().unwrap()))?;
        let mut f: Vec<f32> = raw.chunks_exact(4).map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect();
        // three reads a DataTexture's first row as the nadir, MuTracer as the zenith (as engines.js flips it)
        let row = ew * 4; let mut flipped = vec![0f32; f.len()];
        for y in 0..eh { flipped[y * row..(y + 1) * row].copy_from_slice(&f[(eh - 1 - y) * row..(eh - y) * row]); }
        f = flipped;
        let tex = scene.add_texture(Texture { pixels: TexturePixels::Rgba32F(Arc::from(f)), width: ew as u32, height: eh as u32, uv: 0, scale: [1., 1.], offset: [0., 0.], wrap: [0, 1], flip_y: false })?;
        scene.set_environment(Environment { texture: Some(tex), background: None, color: [0., 0., 0., 1.] })?;
        let mut es = scene.environment_settings(); es.intensity = meta["environmentIntensity"].as_f64().unwrap_or(1.) as f32; scene.set_environment_settings(es)?;
    }
    let cam = &meta["camera"];
    let mut camera = api::Camera::default();
    camera.fov = cam["fov"].as_f64().unwrap() as f32;
    camera.near_clip = cam["near"].as_f64().unwrap() as f32;
    camera.far_clip = cam["far"].as_f64().unwrap() as f32;
    for (i, x) in cam["matrixWorld"].as_array().unwrap().iter().enumerate() { camera.world_matrix[i] = x.as_f64().unwrap() as f32; }
    scene.set_default_camera(Some(camera));
    println!("scene: import {import_ms} ms, {} lights", meta["lights"].as_array().unwrap().len());

    let backends: &[(&str, api::Backend)] = match which {
        "software" => &[("software", api::Backend::Software)],
        "hardware" => &[("hardware", api::Backend::Hardware)],
        _ => &[("software", api::Backend::Software), ("hardware", api::Backend::Hardware)],
    };
    for (name, backend) in backends {
        let t = Instant::now();
        let engine = api::Engine::new(api::EngineOptions { backend: *backend })?;
        let info = engine.info();
        let render = api::Render::new(&engine, api::RenderSettings { max_samples: samples, bounces, size: api::RenderSize::Fixed { width: w, height: h }, ..Default::default() })?;
        engine.set_scene_object(&scene)?;
        engine.update()?;
        let setup = t.elapsed().as_secs_f64();
        // warm-up: compiles the shaders and builds the BVH / acceleration structures
        let t = Instant::now();
        render.converge(api::ConvergeOptions::new(1))?;
        let first = t.elapsed().as_secs_f64();
        let mut runs = vec![];
        for _ in 0..3 {
            let t = Instant::now();
            let mut o = api::ConvergeOptions::new(samples); o.samples_per_batch = samples;
            render.converge(o)?;
            let _ = render.read_pixels(api::PixelKind::Hdr)?;   // waits for the GPU
            runs.push(t.elapsed().as_secs_f64());
        }
        runs.sort_by(|a, b| a.partial_cmp(b).unwrap());
        println!("{name:9} adapter {} · ray queries {} · setup {setup:.1} s · first sample (compile + build) {first:.1} s · {samples} spp × {bounces} bounces at {w}×{h}: {:.2} s (runs {:?})",
            info.adapter_name, info.hardware_ray_query, runs[1], runs.iter().map(|x| (x * 100.).round() / 100.).collect::<Vec<_>>());
        let img = render.read_pixels(api::PixelKind::Hdr)?;
        // quick preview: exposure 1/8 of linear light (as post.js does), Reinhard, sRGB
        let exposure = meta["exposure"].as_f64().unwrap_or(1.) as f32;
        let px: Vec<u8> = img.data.chunks_exact(4).flat_map(|p| {
            let m = |c: f32| { let x = c * exposure; let x = x / (1. + x); (x.max(0.).powf(1. / 2.2) * 255.).round().min(255.) as u8 };
            [m(p[0]), m(p[1]), m(p[2]), 255]
        }).collect();
        let file = std::fs::File::create(dir.join(format!("native_{name}_{w}x{h}_{samples}spp.png")))?;
        let mut enc = png::Encoder::new(std::io::BufWriter::new(file), img.width, img.height);
        enc.set_color(png::ColorType::Rgba); enc.set_depth(png::BitDepth::Eight);
        enc.write_header()?.write_image_data(&px)?;
    }
    Ok(())
}
