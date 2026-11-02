// From ../random-sketches/vibes/sorairo (post.js), with o.extra: a second scene drawn into the scene target.
// Post chain, all hand-wired so passes can read more than one input:
//   scene (HDR, MSAA, alpha = sun occlusion) -> light shafts -> bloom (UnrealBloomPass, additive)
//   -> grade: lens flare, tone map, colour grade, to display space
//   -> painterly: structure tensor -> blur -> anisotropic Kuwahara (Kyprianidis et al. 2009,
//      polynomial sector weights) -> final: canvas texture, edge pigment, vignette, grain
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const VS = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function rt(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...opts });
}

export function makePost(renderer) {
  const size = new THREE.Vector2();
  const targets = {};
  const quad = new FullScreenQuad();

  const light = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, uSun: { value: new THREE.Vector2() }, uSunOn: { value: 0 }, uColor: { value: new THREE.Color() }, uStrength: { value: 1 }, uAspect: { value: 1 } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene; uniform vec2 uSun; uniform float uSunOn, uStrength, uAspect; uniform vec3 uColor;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tScene, vUv);
        vec3 col = c.rgb;
        if (uSunOn > 0.001) {
          const int N = 40;
          vec2 delta = (uSun - vUv) / float(N) * 0.9;
          vec2 p = vUv + delta * hash(gl_FragCoord.xy);
          float acc = 0.0, wsum = 0.0, w = 1.0;
          for (int i = 0; i < N; i++) {
            vec4 s = texture2D(tScene, p);
            vec2 d = (p - uSun) * vec2(uAspect, 1.0);
            float src = (1.0 - s.a) * exp(-dot(d, d) * 9.0);
            acc += src * w; wsum += w; w *= 0.975; p += delta;
          }
          vec2 d0 = (vUv - uSun) * vec2(uAspect, 1.0);
          float shafts = acc / wsum * exp(-length(d0) * 1.2);
          col += uColor * shafts * uStrength * uSunOn * 1.6;
        }
        gl_FragColor = vec4(col, c.a);
      }`,
  });

  const grade = new THREE.ShaderMaterial({
    uniforms: {
      tIn: { value: null }, tScene: { value: null }, uSun: { value: new THREE.Vector2() }, uSunOn: { value: 0 }, uAspect: { value: 1 },
      uFlare: { value: 1 }, uFlareColor: { value: new THREE.Color() }, uExposure: { value: 1 }, uSat: { value: 1.15 },
      uLift: { value: new THREE.Color(0.02, 0.03, 0.08) }, uGain: { value: new THREE.Color(1.03, 1.0, 0.96) },
    },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tIn, tScene; uniform vec2 uSun; uniform float uSunOn, uAspect, uFlare, uExposure, uSat;
      uniform vec3 uFlareColor, uLift, uGain;
      varying vec2 vUv;
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float ring(vec2 p, vec2 c, float r, float w) { float d = length((p - c) * vec2(uAspect, 1.0)); return smoothstep(w, 0.0, abs(d - r)); }
      float disc(vec2 p, vec2 c, float r) { float d = length((p - c) * vec2(uAspect, 1.0)); return smoothstep(r, r * 0.6, d); }
      void main() {
        vec3 col = texture2D(tIn, vUv).rgb;
        // --- lens flare: ghosts mirrored through the centre, a halo, an anamorphic streak
        if (uSunOn > 0.001 && uFlare > 0.0) {
          float vis = 0.0;
          for (int i = 0; i < 9; i++) { vec2 o = vec2(float(i % 3) - 1.0, float(i / 3) - 1.0) * 0.006; vis += 1.0 - texture2D(tScene, uSun + o).a; }
          vis = vis / 9.0 * uSunOn;
          vec2 c = vec2(0.5); vec2 axis = c - uSun;
          vec3 f = vec3(0.0);
          f += vec3(0.4, 0.8, 1.0) * disc(vUv, uSun + axis * 0.55, 0.03) * 0.25;
          f += vec3(1.0, 0.6, 0.9) * disc(vUv, uSun + axis * 0.8, 0.06) * 0.12;
          f += vec3(0.5, 1.0, 0.6) * disc(vUv, uSun + axis * 1.25, 0.018) * 0.3;
          f += vec3(1.0, 0.8, 0.5) * disc(vUv, uSun + axis * 1.6, 0.1) * 0.08;
          f += vec3(0.6, 0.7, 1.0) * ring(vUv, uSun + axis * 1.95, 0.14, 0.012) * 0.12;
          f += vec3(1.0, 0.75, 0.6) * ring(vUv, uSun, 0.32, 0.05) * 0.05;
          vec2 sd = (vUv - uSun) * vec2(uAspect, 1.0);
          f += vec3(0.6, 0.75, 1.0) * exp(-abs(sd.y) * 260.0) * exp(-abs(sd.x) * 2.2) * 0.35;
          col += f * uFlareColor * vis * uFlare;
        }
        // --- tone map on luminance (keeps anime saturation), then grade
        col *= uExposure;
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float Lt = L * (1.0 + L / 9.0) / (1.0 + L);
        col *= Lt / max(L, 1e-4);
        // roll over-range channels toward white instead of clipping the hue
        float mx = max(max(col.r, col.g), col.b);
        if (mx > 1.0) col = mix(col / mx, vec3(1.0), clamp((mx - 1.0) * 0.5, 0.0, 1.0));
        float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l2), col, uSat);
        col = col * uGain + uLift * (1.0 - l2);
        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(toSRGB(col), 1.0);
      }`,
  });

  const tensor = new THREE.ShaderMaterial({
    uniforms: { tIn: { value: null }, uTexel: { value: new THREE.Vector2() } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
      vec3 S(float x, float y) { return texture2D(tIn, vUv + vec2(x, y) * uTexel).rgb; }
      void main() {
        vec3 gx = (-1.0 * S(-1., -1.) - 2.0 * S(-1., 0.) - 1.0 * S(-1., 1.) + 1.0 * S(1., -1.) + 2.0 * S(1., 0.) + 1.0 * S(1., 1.)) / 4.0;
        vec3 gy = (-1.0 * S(-1., -1.) - 2.0 * S(0., -1.) - 1.0 * S(1., -1.) + 1.0 * S(-1., 1.) + 2.0 * S(0., 1.) + 1.0 * S(1., 1.)) / 4.0;
        gl_FragColor = vec4(dot(gx, gx), dot(gy, gy), dot(gx, gy), 1.0);
      }`,
  });
  const blur = new THREE.ShaderMaterial({
    uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
      void main() {
        vec4 s = vec4(0.0); float wsum = 0.0;
        for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 18.0); s += texture2D(tIn, vUv + uDir * float(i)) * w; wsum += w; }
        gl_FragColor = s / wsum;
      }`,
  });
  const kuwahara = new THREE.ShaderMaterial({
    uniforms: { tIn: { value: null }, tTensor: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 5 }, uHard: { value: 8 }, uSharp: { value: 8 }, uAlpha: { value: 1 } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tIn, tTensor; uniform vec2 uTexel; uniform float uRadius, uHard, uSharp, uAlpha;
      varying vec2 vUv;
      void main() {
        vec3 t = texture2D(tTensor, vUv).xyz;
        float E = t.x, G = t.y, F = t.z;
        float disc = sqrt(max((E - G) * (E - G) + 4.0 * F * F, 0.0));
        float l1 = 0.5 * (E + G + disc), l2 = 0.5 * (E + G - disc);
        vec2 v = vec2(l1 - E, -F);
        vec2 dir = dot(v, v) > 1e-10 ? normalize(v) : vec2(0.0, 1.0);
        float phi = -atan(dir.y, dir.x);
        float A = (l1 + l2 > 1e-10) ? (l1 - l2) / (l1 + l2) : 0.0;
        float r = uRadius;
        float a = r * clamp((uAlpha + A) / uAlpha, 0.1, 2.0);
        float b = r * clamp(uAlpha / (uAlpha + A), 0.1, 2.0);
        float cp = cos(phi), sp = sin(phi);
        mat2 SR = mat2(0.5 / a, 0.0, 0.0, 0.5 / b) * mat2(cp, -sp, sp, cp);
        int maxX = int(ceil(sqrt(a * a * cp * cp + b * b * sp * sp)));
        int maxY = int(ceil(sqrt(a * a * sp * sp + b * b * cp * cp)));
        float zeta = 2.0 / (r * 0.5);
        float zc = 0.58;
        float eta = (zeta + cos(zc)) / (sin(zc) * sin(zc));
        vec4 m[8]; vec3 s[8];
        for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec3(0.0); }
        for (int y = -12; y <= 12; y++) {
          if (y < -maxY || y > maxY) continue;
          for (int x = -12; x <= 12; x++) {
            if (x < -maxX || x > maxX) continue;
            vec2 vv = SR * vec2(float(x), float(y));
            if (dot(vv, vv) > 0.25) continue;
            vec3 c = texture2D(tIn, vUv + vec2(float(x), float(y)) * uTexel).rgb;
            float w[8]; float sum = 0.0, z, vxx, vyy;
            vxx = zeta - eta * vv.x * vv.x; vyy = zeta - eta * vv.y * vv.y;
            z = max(0.0, vv.y + vxx); w[0] = z * z; sum += w[0];
            z = max(0.0, -vv.x + vyy); w[2] = z * z; sum += w[2];
            z = max(0.0, -vv.y + vxx); w[4] = z * z; sum += w[4];
            z = max(0.0, vv.x + vyy); w[6] = z * z; sum += w[6];
            vec2 vr = 0.70710678 * vec2(vv.x - vv.y, vv.x + vv.y);
            vxx = zeta - eta * vr.x * vr.x; vyy = zeta - eta * vr.y * vr.y;
            z = max(0.0, vr.y + vxx); w[1] = z * z; sum += w[1];
            z = max(0.0, -vr.x + vyy); w[3] = z * z; sum += w[3];
            z = max(0.0, -vr.y + vxx); w[5] = z * z; sum += w[5];
            z = max(0.0, vr.x + vyy); w[7] = z * z; sum += w[7];
            float g = exp(-3.125 * dot(vv, vv)) / max(sum, 1e-6);
            for (int k = 0; k < 8; k++) { float wk = w[k] * g; m[k] += vec4(c * wk, wk); s[k] += c * c * wk; }
          }
        }
        vec4 outc = vec4(0.0);
        for (int k = 0; k < 8; k++) {
          if (m[k].w < 1e-6) continue;
          vec3 mu = m[k].rgb / m[k].w;
          vec3 sg = abs(s[k] / m[k].w - mu * mu);
          float sigma2 = sg.r + sg.g + sg.b;
          float wk = 1.0 / (1.0 + pow(uHard * 1000.0 * sigma2, 0.5 * uSharp));
          outc += vec4(mu * wk, wk);
        }
        gl_FragColor = vec4(outc.w > 0.0 ? outc.rgb / outc.w : texture2D(tIn, vUv).rgb, 1.0);
      }`,
  });
  const final = new THREE.ShaderMaterial({
    uniforms: { tIn: { value: null }, tRef: { value: null }, uTexel: { value: new THREE.Vector2() }, uPaper: { value: 1 }, uTime: { value: 0 }, uVignette: { value: 1 }, uPaint: { value: 1 } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tIn, tRef; uniform vec2 uTexel; uniform float uPaper, uTime, uVignette, uPaint;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      void main() {
        vec2 px = vUv / uTexel;
        // slight chromatic fringe toward the corners
        vec2 dc = vUv - 0.5;
        vec3 col;
        col.r = texture2D(tIn, vUv + dc * 0.0025).r;
        col.g = texture2D(tIn, vUv).g;
        col.b = texture2D(tIn, vUv - dc * 0.0025).b;
        if (uPaint > 0.0) {
          // pigment pooling at colour edges (watercolour-style edge darkening)
          vec3 e = texture2D(tIn, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tIn, vUv - vec2(uTexel.x, 0.0)).rgb
                 + texture2D(tIn, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tIn, vUv - vec2(0.0, uTexel.y)).rgb;
          float edge = length(e * 0.25 - col);
          col *= 1.0 - smoothstep(0.02, 0.12, edge) * 0.18 * uPaint;
        }
        // canvas weave + paper fibres
        float weave = (sin(px.x * 1.9) * sin(px.y * 1.9)) * 0.5 + 0.5;
        float fibre = vn(px * vec2(0.08, 0.5)) * 0.6 + vn(px * 0.3) * 0.4;
        float paper = (weave * 0.35 + fibre * 0.65 - 0.5) * 0.07 * uPaper;
        col += paper * (0.6 + 0.4 * (1.0 - col));
        // vignette
        float v = smoothstep(0.95, 0.25, length(dc * vec2(1.0, 0.8)));
        col *= mix(1.0, 0.72 + 0.28 * v, uVignette);
        // film grain
        col += (hash(px + fract(uTime) * 100.0) - 0.5) * 0.025;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  // threshold above the bright sky (HDR ~1-1.2) so only the sun, backlit cloud rims and
  // sunlit leaf edges glow; at 0.92 the whole sky bled over anything dark in front of it,
  // washing out the trunk when looking up into the light
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 1.35);

  function setSize(w, h, pr) {
    const W = Math.round(w * pr), H = Math.round(h * pr);
    size.set(W, H);
    for (const k in targets) targets[k].dispose();
    targets.scene = rt(W, H, { depthBuffer: true, samples: 4 });
    targets.light = rt(W, H);
    targets.grade = rt(W, H, { type: THREE.UnsignedByteType });
    targets.tA = rt(W, H); targets.tB = rt(W, H);
    targets.paint = rt(W, H, { type: THREE.UnsignedByteType });
    bloom.setSize(W, H);
    const tex = new THREE.Vector2(1 / W, 1 / H);
    tensor.uniforms.uTexel.value.copy(tex); kuwahara.uniforms.uTexel.value.copy(tex); final.uniforms.uTexel.value.copy(tex);
    light.uniforms.uAspect.value = grade.uniforms.uAspect.value = W / H;
  }

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); quad.render(renderer); }

  function render(scene, camera, o) {
    renderer.setRenderTarget(targets.scene);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    // (#051: the duo's own scene, drawn into the same image and depth)
    o.extra?.();

    light.uniforms.tScene.value = targets.scene.texture;
    pass(light, targets.light);
    if (o.bloom > 0) { bloom.strength = o.bloom; bloom.render(renderer, null, targets.light, 0, false); }

    grade.uniforms.tIn.value = targets.light.texture;
    grade.uniforms.tScene.value = targets.scene.texture;
    pass(grade, targets.grade);

    let img = targets.grade.texture;
    if (o.paint > 0) {
      tensor.uniforms.tIn.value = img; pass(tensor, targets.tA);
      blur.uniforms.tIn.value = targets.tA.texture; blur.uniforms.uDir.value.set(1 / size.x, 0); pass(blur, targets.tB);
      blur.uniforms.tIn.value = targets.tB.texture; blur.uniforms.uDir.value.set(0, 1 / size.y); pass(blur, targets.tA);
      kuwahara.uniforms.tIn.value = img; kuwahara.uniforms.tTensor.value = targets.tA.texture;
      kuwahara.uniforms.uRadius.value = o.paint;
      pass(kuwahara, targets.paint);
      img = targets.paint.texture;
    }
    final.uniforms.tIn.value = img;
    final.uniforms.uPaint.value = o.paint > 0 ? 1 : 0;
    pass(final, null);
  }

  return { setSize, render, light, grade, final, kuwahara, bloom, targets };
}
