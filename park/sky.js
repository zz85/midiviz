// Sky dome: three-stop gradient, sun/moon disc and glow, towering horizon cumulus,
// an overhead cumulus layer, high cirrus and stars. Alpha out = how much the sky
// pixel blocks sunlight (clouds), used by the light-shaft pass.
import * as THREE from 'three';

export function makeSky(shared) {
  const uniforms = {
    ...shared,
    uZenith: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uCloudLit: { value: new THREE.Color() },
    uCloudShade: { value: new THREE.Color() },
    uCloudRim: { value: new THREE.Color() },
    uDiscColor: { value: new THREE.Color() },
    uDiscSize: { value: 0.9995 },
    uGlow: { value: 1 },
    uStars: { value: 0 },
    uTowers: { value: 1 },
    uRain: { value: 0 },
    uRainbow: { value: 0 }, // overcast: a low grey stratus deck with darker rain bands
    // contrail: a great circle (axis = its normal, ref = angle 0), the plane's angle along it,
    // how much trail is behind it, and an overall fade
    uTrailAxis: { value: new THREE.Vector3(0, 0, 1) },
    uTrailRef: { value: new THREE.Vector3(1, 0, 0) },
    uTrailHead: { value: 0 },
    uTrailLen: { value: 0 },
    uTrailOn: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position + cameraPosition, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uCloudT; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec2 uWind;
      uniform float uCloudCover;
      uniform vec3 uZenith, uMid, uHorizon, uCloudLit, uCloudShade, uCloudRim, uDiscColor;
      uniform float uDiscSize, uGlow, uStars, uTowers, uRain, uRainbow;
      uniform vec3 uTrailAxis, uTrailRef; uniform float uTrailHead, uTrailLen, uTrailOn;
      varying vec3 vDir;
      #define PI 3.14159265
      float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
        return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
      }
      // billowy fbm: rounded puffs, like painted cumulus
      float billow(vec2 p, int oct) {
        float s = 0., a = .5, n = 0.;
        for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * (1. - abs(vnoise(p) * 2. - 1.)); n += a; p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3; a *= .5; }
        return s / n;
      }
      float fbm(vec2 p, int oct) {
        float s = 0., a = .5, n = 0.;
        for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vnoise(p); n += a; p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; }
        return s / n;
      }

      // Towering cumulus standing on the horizon. q = (azimuth, elevation) in radians.
      // Returns density; .y of towerProfile is the local cloud-top elevation.
      float towerTop(float az) {
        float t = uCloudT * 0.004;
        float h = fbm(vec2(az * 1.1 + t, 4.0), 4);
        float lumps = fbm(vec2(az * 6.0 + t * 3.0, 9.0), 3);
        return 0.03 + (pow(smoothstep(0.3, 0.68, h), 1.3) * 0.5 + lumps * 0.06) * uTowers;
      }
      float towerDensity(vec2 q) {
        float az = q.x, el = q.y;
        float t = uCloudT * 0.004;
        float h = towerTop(az);
        float body = 1.0 - el / max(h, 1e-3);           // 1 at base, 0 at top
        vec2 p = vec2(az * 7.0 + t * 6.0, el * 11.0);
        vec2 w = vec2(fbm(p * 0.7 + 1.3, 3), fbm(p * 0.7 + 8.1, 3)) - 0.5;
        float b = billow(p * 0.8 + w * 0.8, 4) * 0.55 + fbm(p * 1.7 + w, 4) * 0.45;
        return body * 0.95 + b * 0.95 - 0.75;
      }
      // low-frequency version of the same cloud, used only to light it (keeps shading in big masses)
      float towerShape(vec2 q) {
        float h = towerTop(q.x);
        float body = 1.0 - q.y / max(h, 1e-3);
        vec2 p = vec2(q.x * 7.0 + uCloudT * 0.024, q.y * 11.0);
        return body * 0.95 + fbm(p * 0.45, 2) * 0.9 - 0.7;
      }
      // Overhead cumulus layer on a plane
      float layerDensity(vec2 p) {
        p += uWind * uCloudT * 0.0015;
        vec2 w = vec2(fbm(p * 0.6, 3), fbm(p * 0.6 + 5.2, 3));
        float b = billow(p + w * 1.4, 5);
        return b - (1.18 - uCloudCover * 0.55);
      }

      // a rainbow band, t = 0 inner (violet) … 1 outer (red), soft at both edges
      vec3 rainbowColor(float t) {
        vec3 c = clamp(vec3(abs(t * 6.0 - 4.0) - 1.0, 2.0 - abs(t * 6.0 - 3.6), 2.0 - abs(t * 6.0 - 1.6)), 0.0, 1.0);
        c = mix(vec3(dot(c, vec3(0.33))), c, 0.8);                   // a little pastel
        return c * smoothstep(-0.2, 0.15, t) * (1.0 - smoothstep(0.85, 1.2, t));
      }
      void main() {
        vec3 d = normalize(vDir);
        float el = asin(clamp(d.y, -1., 1.));
        float az = atan(d.z, d.x);
        vec3 s = normalize(uSunDir);
        float sunEl = asin(clamp(s.y, -1., 1.));
        float sunAz = atan(s.z, s.x);
        float cosS = dot(d, s);

        // --- gradient
        float y = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, y));
        col = mix(col, uZenith, smoothstep(0.12, 0.85, y));
        // horizon brightening near the sun's azimuth
        float azSun = pow(max(dot(normalize(d.xz + 1e-5), normalize(s.xz + 1e-5)), 0.0), 3.0);
        col = mix(col, uHorizon * 1.15 + uSunColor * 0.06, azSun * exp(-y * 6.0) * 0.6);
        // below the horizon (rarely seen)
        if (d.y < 0.0) col = mix(uHorizon, uHorizon * 0.7, smoothstep(0.0, -0.2, d.y));

        // --- stars
        if (uStars > 0.001 && d.y > 0.0) {
          vec2 sp = vec2(az * 220.0 / PI, el * 220.0 / PI) * 1.4;
          vec2 cell = floor(sp); float h = hash12(cell);
          vec2 f = fract(sp) - 0.5 - (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * 0.7;
          float star = step(0.965, h) * smoothstep(0.12, 0.0, length(f)) * (0.5 + 0.5 * sin(uTime * (1.0 + h * 3.0) + h * 40.0));
          col += vec3(0.8, 0.85, 1.0) * star * uStars * smoothstep(0.0, 0.25, d.y) * 2.0;
          float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.6, -0.74))) * 3.0, 2.0)); // milky way-ish haze
          col += vec3(0.25, 0.3, 0.5) * band * fbm(vec2(az, el) * 6.0, 4) * uStars * 0.25;
        }

        // --- sun / moon glow and disc
        float glow = pow(max(cosS, 0.0), 6.0) * 0.12 + pow(max(cosS, 0.0), 80.0) * 0.35 + pow(max(cosS, 0.0), 1200.0) * 2.0;
        col += uSunColor * glow * uGlow * 0.25;
        float disc = smoothstep(uDiscSize, uDiscSize + 0.00015, cosS);
        col += uDiscColor * disc;

        // --- contrail: high above the cumulus, so drawn before them
        if (uTrailOn > 0.001 && d.y > 0.0) {
          vec3 b2 = cross(uTrailAxis, uTrailRef);
          float off = dot(d, uTrailAxis);
          float ang = atan(dot(d, b2), dot(d, uTrailRef));
          float age = uTrailHead - ang;                       // radians of trail behind the plane
          if (age > 0.0 && age < uTrailLen && abs(off) < 0.03) {
            float a01 = age / 0.9;
            // the trail drifts and frays as it ages
            off += (fbm(vec2(ang * 18.0, 3.7), 3) - 0.5) * a01 * 0.006;
            float w = 0.0009 + a01 * 0.0045;
            // two engine trails that merge into one a little behind the plane
            float sep = 0.0011 * (1.0 - smoothstep(0.0, 0.05, age));
            float core = max(exp(-pow((off - sep) / w, 2.0)), exp(-pow((off + sep) / w, 2.0)));
            float gap = smoothstep(0.003, 0.012, age);       // short clear gap behind the engines
            float fray = mix(1.0, smoothstep(0.3, 0.65, fbm(vec2(ang * 45.0, a01 * 3.0), 4)), smoothstep(0.15, 0.9, a01));
            float a = core * gap * fray * (1.0 - smoothstep(uTrailLen * 0.55, uTrailLen, age)) * smoothstep(0.02, 0.12, d.y) * uTrailOn;
            vec3 tc = mix(uCloudLit, uCloudShade, 0.15 + a01 * 0.2) + uCloudRim * pow(max(cosS, 0.0), 10.0) * 1.5;
            col = mix(col, tc, a * 0.85);
          }
          // the plane: a tiny glint at the head
          vec3 hd = uTrailRef * cos(uTrailHead) + b2 * sin(uTrailHead);
          float pd = length(d - hd);
          col += uCloudLit * exp(-pd * pd / (0.0006 * 0.0006)) * uTrailOn * 1.2;
        }

        // --- rainbow, round the antisolar point: the primary at 40.7° (violet) … 42.3° (red),
        // the fainter secondary at 50 … 53° with the colours reversed, the sky brighter inside
        // the primary and darker in Alexander's band between the two. Painted soft, like a
        // background artist would: wide pastel bands, fading out toward the horizon ends.
        if (uRainbow > 0.001 && d.y > -0.01) {
          float a = degrees(acos(clamp(dot(d, -s), -1.0, 1.0)));
          float t1 = (a - 40.4) / 2.2, t2 = (53.2 - a) / 3.2;
          vec3 bow = vec3(0.0);
          if (t1 > -0.2 && t1 < 1.2) bow += rainbowColor(t1);
          if (t2 > -0.2 && t2 < 1.2) bow += rainbowColor(t2) * 0.38;
          float inside = (1.0 - smoothstep(37.0, 40.6, a)) * smoothstep(0.0, 38.0, a);
          float band = smoothstep(42.4, 43.5, a) * (1.0 - smoothstep(49.0, 50.2, a));
          // stronger high in the arc, thinning where it meets the haze at the horizon
          float fade = smoothstep(-0.01, 0.12, d.y) * (0.75 + 0.25 * fbm(vec2(az * 3.0, el * 8.0) + uCloudT * 0.002, 2));
          col += bow * uRainbow * fade * 0.42 * (0.4 + 0.6 * length(uSunColor) / 3.0);
          col *= 1.0 + (inside * 0.07 - band * 0.06) * uRainbow * fade;
        }

        float occl = 0.0;
        // --- overhead layer
        if (d.y > 0.02) {
          vec2 p = d.xz / (d.y + 0.12) * 1.6;
          float dn = layerDensity(p);
          if (dn > -0.15) {
            vec2 so = normalize(s.xz + 1e-5) * 0.06;
            float dl = layerDensity(p + so);
            float a = smoothstep(0.0, 0.06, dn) * smoothstep(0.02, 0.14, d.y);
            float lit = clamp(0.6 + (dn - dl) * 5.0 + (1.0 - smoothstep(0.0, 0.25, dn)) * 0.2, 0.0, 1.0);
            lit = smoothstep(0.3, 0.62, lit);
            vec3 cc = mix(uCloudShade, uCloudLit, lit);
            // thin edges glow when backlit
            float rim = (1.0 - smoothstep(0.0, 0.12, dn)) * pow(max(cosS, 0.0), 12.0);
            cc += uCloudRim * rim * 2.5;
            cc = mix(cc, col, smoothstep(0.3, 0.0, d.y) * 0.5);
            col = mix(col, cc, a);
            occl = max(occl, a * (1.0 - rim * 0.6));
          }
          // cirrus streaks high up
          vec2 cp = d.xz / (d.y + 0.05) * vec2(0.6, 2.5) + vec2(uCloudT * 0.002, 0.0);
          float ci = smoothstep(0.55, 0.95, fbm(cp, 5)) * smoothstep(0.05, 0.4, d.y) * (1.0 - occl);
          col = mix(col, uCloudLit * 0.95 + uCloudRim * 0.1, ci * 0.45);
        }

        // --- towering horizon cumulus
        if (el > -0.02 && el < 0.62) {
          vec2 q = vec2(az, max(el, 0.0));
          float dn = towerDensity(q);
          if (dn > -0.1) {
            vec2 dirS = vec2(sunAz - az, sunEl - el);
            dirS.x = mod(dirS.x + PI, 2.0 * PI) - PI;
            vec2 so = normalize(dirS + 1e-5) * 0.015;
            float sl = towerShape(q), sl2 = towerShape(q + so * 3.0);
            float a = smoothstep(0.0, 0.04, dn);
            float top = clamp(el / max(towerTop(az), 1e-3), 0.0, 1.0);
            float lit = clamp(0.45 + (sl - sl2) * 3.0 + (top - 0.45) * 0.9 + (dn - sl) * 0.6, 0.0, 1.0);
            lit = smoothstep(0.3, 0.62, lit);               // two tones, soft terminator
            float base = smoothstep(0.0, 0.1, el);          // darker, hazier bottoms
            vec3 cc = mix(uCloudShade, uCloudLit, lit * mix(0.6, 1.0, base));
            float rim = (1.0 - smoothstep(0.0, 0.1, dn)) * pow(max(cosS, 0.0), 6.0);
            cc += uCloudRim * rim * 2.0;
            // aerial perspective toward the horizon line
            cc = mix(cc, uHorizon * 1.05, (1.0 - base) * 0.55);
            col = mix(col, cc, a);
            occl = max(occl, a * (1.0 - rim * 0.5));
          }
        }
        // --- rain: a low stratus deck over everything, soft and lumpy, with darker bands of
        // heavier rain drifting through it and a paler gap low in the distance
        if (uRain > 0.001) {
          vec2 rp = d.xz / (max(d.y, 0.0) + 0.08) * 0.9 + uWind * uCloudT * 0.002;
          float body = fbm(rp * 0.7, 5);
          float band = smoothstep(0.35, 0.75, fbm(rp * 0.22 + vec2(uCloudT * 0.0015, 0.0), 3));
          vec3 st = mix(uCloudShade, uCloudLit, smoothstep(0.25, 0.8, body));
          st = mix(st, uCloudShade * 0.8, band * 0.55);
          st = mix(st, uHorizon, (1.0 - smoothstep(0.0, 0.25, d.y)) * 0.6);    // hazy toward the horizon
          float a = uRain * smoothstep(-0.05, 0.06, d.y) * mix(0.8, 1.0, smoothstep(0.2, 0.6, body));
          col = mix(col, st, a);
          occl = max(occl, a);
        }
        gl_FragColor = vec4(col, occl);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
