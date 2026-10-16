import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Shared by every patched material: wind, drifting cloud shadows, and how
// wet or snowed-on the land is (these build up and fade with the weather).
export const fxUniforms = {
  uTime: { value: 0 },
  uCloudShadow: { value: 0 },
  uWindStrength: { value: 1 },
  uWet: { value: 0 },
  uSnow: { value: 0 },
  uRain: { value: 0 },
  // Rings of wind sent through the grass by taps: x, z, start time, strength.
  uGusts: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)) },
  // The mirrored scene for lake reflections (see createReflection).
  uReflection: { value: null },
  uReflectMatrix: { value: new THREE.Matrix4() },
  uReflectOn: { value: 0 },
};

let nextGust = 0;
export function sendGust(x, z, t, strength = 1) {
  fxUniforms.uGusts.value[nextGust].set(x, z, t, strength);
  nextGust = (nextGust + 1) % 4;
}

const FX_WEATHER = /* glsl */ `
  // Snow settles on surfaces that face the sky; rain darkens everything and
  // pools into glossy puddles on the flats.
  vec3 fxN = normalize(cross(dFdx(vFxWorld), dFdy(vFxWorld)));
  float fxSnow = uSnow * smoothstep(0.35, 0.8, fxN.y + (fxNoise(vFxWorld.xz * 1.7) - 0.5) * 0.35);
  float fxPuddle = uWet * smoothstep(0.92, 0.98, fxN.y) * smoothstep(0.55, 0.75, fxNoise(vFxWorld.xz * 0.9 + 3.0));
  diffuseColor.rgb *= 1.0 - uWet * 0.3 - fxPuddle * 0.25;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), fxSnow);
`;

const FX_WEATHER_ROUGHNESS = /* glsl */ `
  roughnessFactor = mix(roughnessFactor, 0.35, uWet * (1.0 - fxSnow));
  roughnessFactor = mix(roughnessFactor, 0.06, fxPuddle * (1.0 - fxSnow));
`;

const FX_NOISE_BASE = /* glsl */ `
  float fxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fxNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fxHash(i), fxHash(i + vec2(1.0, 0.0)), u.x), mix(fxHash(i + vec2(0.0, 1.0)), fxHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

const FX_NOISE = /* glsl */ `
  ${FX_NOISE_BASE}
  // Soft blotches of shade that drift across the land with the wind.
  float cloudShade(vec3 p) {
    vec2 q = p.xz * 0.07 + vec2(uTime * 0.03, uTime * 0.012);
    float n = fxNoise(q) * 0.65 + fxNoise(q * 2.3 + 7.1) * 0.35;
    return 1.0 - uCloudShadow * smoothstep(0.42, 0.68, n);
  }
`;

const FX_WIND = /* glsl */ `
  #ifdef USE_INSTANCING
    float fxPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9;
  #else
    float fxPhase = 0.0;
  #endif
  float fxSway = (sin(uTime * 1.3 + fxPhase) + 0.5 * sin(uTime * 2.3 + fxPhase * 1.7)) * uWindStrength;
  float fxBend = max(position.y - 0.35, 0.0);
  transformed.x += fxSway * 0.035 * fxBend;
  transformed.z += fxSway * 0.02 * fxBend;
`;

// Grass: the tips bend with gusts rolling across the land, and with rings of
// wind from taps; snow presses the blades down.
const FX_GRASS = /* glsl */ `
  #ifdef USE_INSTANCING
    mat3 fxBasis = mat3(instanceMatrix);
    vec3 fxRoot = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #else
    mat3 fxBasis = mat3(1.0);
    vec3 fxRoot = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  vec2 fxDir = normalize(vec2(1.0, 0.35));
  float fxGust = sin(dot(fxRoot.xz, fxDir) * 0.7 - uTime * 2.4) * 0.5 + 0.5;
  fxGust *= fxGust * (0.4 + 0.6 * fxNoise(fxRoot.xz * 0.15 + uTime * 0.2));
  vec2 fxBend = fxDir * (0.12 + fxGust * 0.88) * uWindStrength * 0.32;
  for (int i = 0; i < 4; i++) {
    vec4 g = uGusts[i];
    float age = uTime - g.z;
    if (age < 0.0 || age > 2.5) continue;
    vec2 d = fxRoot.xz - g.xy;
    float len = length(d) + 1e-3;
    float w = len - age * 3.5;
    fxBend += d / len * exp(-w * w * 2.5) * exp(-age * 1.3) * 1.1 * g.w;
  }
  float fxTip = position.y * position.y;
  vec3 fxLocal = transpose(fxBasis) * vec3(fxBend.x, 0.0, fxBend.y);
  transformed.xz += fxLocal.xz * fxTip * length(fxBasis[1]);
  transformed.y -= length(fxBend) * fxTip * 0.25;
  transformed.y *= 1.0 - uSnow * 0.85;
`;

// Teach a standard material about cloud shadows, wetness and snow (and, for
// foliage and grass, wind).
export function patchMaterial(material, { wind = false, grass = false } = {}) {
  if (material.userData.fxPatched) return;
  material.userData.fxPatched = true;
  material.customProgramCacheKey = () => (grass ? 'fx-grass' : wind ? 'fx-wind' : 'fx');
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fxUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uSnow;
        uniform vec4 uGusts[4];
        varying vec3 vFxWorld;
        ${grass ? FX_NOISE_BASE : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${grass ? FX_GRASS : wind ? FX_WIND : ''}
        {
          vec4 fxW = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fxW = instanceMatrix * fxW;
          #endif
          vFxWorld = (modelMatrix * fxW).xyz;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uCloudShadow;\nuniform float uWet;\nuniform float uSnow;\nvarying vec3 vFxWorld;\n${FX_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FX_WEATHER}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${FX_WEATHER_ROUGHNESS}`)
      .replace('#include <lights_fragment_begin>', 'float fxCloud = cloudShade(vFxWorld);\n' + THREE.ShaderChunk.lights_fragment_begin.replace(
        'getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= fxCloud;',
      ));
  };
}

// Contact-hardening shadows (PCSS, after three's webgl_shadowmap_pcss example,
// retuned for this scene): crisp where things meet the ground, softening the
// farther a shadow falls. The constants fit a 30-unit-wide light frustum, 109
// units deep, and a sun about 2° across. Costly, so desktops only; it has to
// run before any material compiles.
const PCSS = /* glsl */ `
  #define PCSS_SAMPLES 16
  #define PCSS_SEARCH 0.008
  #define PCSS_SCALE 0.13
  vec2 pcssDisk[PCSS_SAMPLES];
  void pcssInit(vec2 seed) {
    float angle = rand(seed) * PI2;
    float radius = 1.0 / float(PCSS_SAMPLES);
    for (int i = 0; i < PCSS_SAMPLES; i++) {
      pcssDisk[i] = vec2(cos(angle), sin(angle)) * pow(radius, 0.75);
      radius += 1.0 / float(PCSS_SAMPLES);
      angle += PI2 * 7.0 / float(PCSS_SAMPLES);
    }
  }
  float PCSS(sampler2D shadowMap, vec4 coords, vec2 mapSize) {
    vec2 uv = coords.xy;
    float z = coords.z;
    pcssInit(uv);
    // Look for whatever stands between this point and the sun.
    float blockers = 0.0, depthSum = 0.0;
    for (int i = 0; i < PCSS_SAMPLES; i++) {
      float d = unpackRGBAToDepth(texture2D(shadowMap, uv + pcssDisk[i] * PCSS_SEARCH));
      if (d < z) {
        depthSum += d;
        blockers += 1.0;
      }
    }
    if (blockers == 0.0) return 1.0;
    // The farther above us the blocker is, the wider the penumbra.
    float radius = clamp((z - depthSum / blockers) * PCSS_SCALE, 1.5 / mapSize.x, PCSS_SEARCH);
    float lit = 0.0;
    for (int i = 0; i < PCSS_SAMPLES; i++) {
      lit += step(z, unpackRGBAToDepth(texture2D(shadowMap, uv + pcssDisk[i] * radius)));
      lit += step(z, unpackRGBAToDepth(texture2D(shadowMap, uv - pcssDisk[i].yx * radius)));
    }
    return lit / float(2 * PCSS_SAMPLES);
  }
`;

export function useSoftShadows() {
  THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment
    .replace('#ifdef USE_SHADOWMAP', `#ifdef USE_SHADOWMAP\n${PCSS}`)
    .replace('#if defined( SHADOWMAP_TYPE_PCF )', 'return PCSS( shadowMap, shadowCoord, shadowMapSize );\n#if defined( SHADOWMAP_TYPE_PCF )');
}

// Lake reflections: render the scene from a camera mirrored under the water,
// clipped at the water's surface (the oblique near-plane trick three's Reflector
// uses), into a half-size texture the water shader samples.
export function createReflection(renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const mirror = new THREE.PerspectiveCamera();
  const camPos = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  fxUniforms.uReflection.value = target.texture;

  return {
    setSize(w, h) {
      target.setSize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    },

    render(scene, camera, planeY, hide) {
      camPos.setFromMatrixPosition(camera.matrixWorld);
      if (camPos.y <= planeY) return false;
      camera.getWorldDirection(forward);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      mirror.position.set(camPos.x, 2 * planeY - camPos.y, camPos.z);
      mirror.up.set(up.x, -up.y, up.z);
      mirror.lookAt(camPos.x + forward.x, 2 * planeY - (camPos.y + forward.y), camPos.z + forward.z);
      mirror.updateMatrixWorld();
      mirror.projectionMatrix.copy(camera.projectionMatrix);
      fxUniforms.uReflectMatrix.value.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

      // Clip everything below the water out of the mirrored view.
      plane.setFromNormalAndCoplanarPoint(up.set(0, 1, 0), forward.set(0, planeY, 0)).applyMatrix4(mirror.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const P = mirror.projectionMatrix.elements;
      q.set((Math.sign(clip.x) + P[8]) / P[0], (Math.sign(clip.y) + P[9]) / P[5], -1, (1 + P[10]) / P[14]);
      clip.multiplyScalar(2 / clip.dot(q));
      P[2] = clip.x;
      P[6] = clip.y;
      P[10] = clip.z + 1 - 0.003;
      P[14] = clip.w;

      const previous = renderer.getRenderTarget();
      const shadows = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      for (const o of hide) o.visible = false;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, mirror);
      for (const o of hide) o.visible = true;
      renderer.setRenderTarget(previous);
      renderer.shadowMap.autoUpdate = shadows;
      return true;
    },
  };
}

const PASS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Crepuscular rays: smear the bright sky around the sun (or moon) outward,
// so the land and clouds cut shafts through it. Also the camera's own lens
// flare when you look into the sun: ghosts, a halo and a starburst, which
// vanish when the land or a cloud covers the sun.
export function createLightShafts(samples) {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uSun: { value: new THREE.Vector2(0.5, 0.5) },
      uStrength: { value: 0 },
      uFlare: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: PASS_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uSun;
      uniform float uStrength;
      uniform float uFlare;
      uniform float uAspect;
      varying vec2 vUv;
      const float GHOST_AT[5] = float[5](0.35, 0.62, 0.9, 1.22, 1.5);
      const float GHOST_SIZE[5] = float[5](0.035, 0.07, 0.025, 0.1, 0.05);
      const vec3 GHOST_TINT[5] = vec3[5](vec3(1.0, 0.6, 0.3), vec3(0.3, 0.9, 0.8), vec3(0.7, 0.4, 1.0), vec3(0.5, 1.0, 0.5), vec3(1.0, 0.75, 0.35));
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec3 col = base.rgb;
        if (uStrength > 0.001) {
          vec2 delta = (vUv - uSun) / float(${samples}) * 0.95;
          vec2 p = vUv;
          float decay = 1.0;
          vec3 acc = vec3(0.0);
          for (int i = 0; i < ${samples}; i++) {
            p -= delta;
            vec3 s = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb;
            float nearLight = smoothstep(0.5, 0.0, length((p - uSun) * vec2(uAspect, 1.0)));
            float bright = clamp(dot(s, vec3(0.2126, 0.7152, 0.0722)) - 0.75, 0.0, 3.0);
            acc += s * bright * nearLight * decay;
            decay *= 0.97;
          }
          col += acc * uStrength / float(${samples});
        }
        if (uFlare > 0.001) {
          // The sun's disk is many times brighter than anything else, so if its
          // pixel isn't, something is in front of it.
          float visible = smoothstep(2.0, 8.0, dot(texture2D(tDiffuse, uSun).rgb, vec3(0.2126, 0.7152, 0.0722))) * uFlare;
          vec2 toCenter = vec2(0.5) - uSun;
          vec3 flare = vec3(0.0);
          for (int i = 0; i < 5; i++) {
            float d = length((vUv - (uSun + toCenter * 2.0 * GHOST_AT[i])) * vec2(uAspect, 1.0));
            flare += GHOST_TINT[i] * smoothstep(GHOST_SIZE[i], GHOST_SIZE[i] * 0.55, d) * 0.16;
          }
          vec2 dv = (vUv - uSun) * vec2(uAspect, 1.0);
          float ds = length(dv);
          float halo = (ds - 0.32) / 0.025;
          flare += vec3(1.0, 0.85, 0.7) * exp(-halo * halo) * 0.05;
          flare += vec3(1.0, 0.95, 0.85) * pow(abs(cos(atan(dv.y, dv.x) * 3.0)), 60.0) * exp(-ds * 7.0) * 0.9;
          col += flare * visible;
        }
        gl_FragColor = vec4(col, base.a);
      }
    `,
  });
}

// The last pass: tilt-shift blur above and below the land for a miniature
// feel, raindrops on the lens in the rain, a soft vignette, and a little
// warmth in the shadows.
export function createFinishPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uFocusY: { value: 0.5 },
      uBlur: { value: 0 },
      uTime: { value: 0 },
      uRainLens: { value: 0 },
    },
    vertexShader: PASS_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uFocusY;
      uniform float uBlur;
      uniform float uTime;
      uniform float uRainLens;
      varying vec2 vUv;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // Drops on the lens: one per grid cell (some cells empty), each growing,
      // some sliding down, then gone. Returns a refraction offset and a mask.
      vec2 lensDrop(vec2 uv, float scale, float speed, out float mask) {
        vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * scale;
        vec2 id = floor(p);
        vec2 f = fract(p) - 0.5;
        float n = h21(id);
        float life = fract(uTime * speed + n);
        vec2 c = vec2(h21(id + 3.1) - 0.5, 0.25 - life * 0.5 * step(0.6, h21(id + 7.7))) * 0.7;
        float r = (0.12 + 0.12 * h21(id + 1.9)) * smoothstep(1.0, 0.75, life) * step(0.35, n);
        vec2 d = f - c;
        mask = smoothstep(r, r * 0.7, length(d * vec2(1.0, 0.85)));
        return d / max(r, 1e-3) * mask;
      }
      void main() {
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        float amount = smoothstep(0.16, 0.55, abs(vUv.y - uFocusY)) * uBlur;
        if (amount > 0.25) {
          vec3 acc = col;
          for (int i = 0; i < 16; i++) {
            float a = float(i) * 2.39996;
            float r = sqrt(float(i) + 0.5) * 0.25;
            acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * amount / uResolution).rgb;
          }
          col = acc / 17.0;
        }
        if (uRainLens > 0.01) {
          float m1, m2;
          vec2 o1 = lensDrop(vUv, 6.0, 0.12, m1);
          vec2 o2 = lensDrop(vUv + 0.37, 11.0, 0.2, m2);
          vec3 refracted = texture2D(tDiffuse, vUv - (o1 + o2) * 0.04).rgb;
          col = mix(col, refracted * 1.04 + 0.02, max(m1, m2) * uRainLens);
        }
        vec2 q = (vUv - 0.5) * vec2(1.0, 1.15);
        col *= mix(1.0, smoothstep(0.9, 0.2, length(q)), 0.3);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col += vec3(0.02, 0.009, -0.008) * (1.0 - l);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
