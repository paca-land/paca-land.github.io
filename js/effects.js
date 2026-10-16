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
};

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

const FX_NOISE = /* glsl */ `
  float fxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fxNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fxHash(i), fxHash(i + vec2(1.0, 0.0)), u.x), mix(fxHash(i + vec2(0.0, 1.0)), fxHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
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

// Teach a standard material about cloud shadows (and, for foliage, wind).
export function patchMaterial(material, { wind = false } = {}) {
  if (material.userData.fxPatched) return;
  material.userData.fxPatched = true;
  material.customProgramCacheKey = () => (wind ? 'fx-wind' : 'fx');
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fxUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nvarying vec3 vFxWorld;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${wind ? FX_WIND : ''}
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

const PASS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Crepuscular rays: smear the bright sky around the sun (or moon) outward,
// so the land and clouds cut shafts through it.
export function createLightShafts(samples) {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uSun: { value: new THREE.Vector2(0.5, 0.5) },
      uStrength: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: PASS_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uSun;
      uniform float uStrength;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        if (uStrength < 0.001) { gl_FragColor = base; return; }
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
        gl_FragColor = vec4(base.rgb + acc * uStrength / float(${samples}), base.a);
      }
    `,
  });
}

// The last pass: tilt-shift blur above and below the land for a miniature
// feel, a soft vignette, and a little warmth in the shadows.
export function createFinishPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uFocusY: { value: 0.5 },
      uBlur: { value: 0 },
    },
    vertexShader: PASS_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uFocusY;
      uniform float uBlur;
      varying vec2 vUv;
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
        vec2 q = (vUv - 0.5) * vec2(1.0, 1.15);
        col *= mix(1.0, smoothstep(0.9, 0.2, length(q)), 0.3);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col += vec3(0.02, 0.009, -0.008) * (1.0 - l);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
