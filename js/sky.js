import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRandom, createNoise2D, fbm } from './random.js';

const TAU = Math.PI * 2;
const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// `high` clouds drift around the land; `low` ones form the cloud sea below it.
export const WEATHERS = {
  clear: { label: 'clear skies', high: 4, low: 9, overcast: 0, rain: 0, snow: 0, fogNear: 70, fogFar: 260 },
  cloudy: { label: 'clouds drifting by', high: 14, low: 12, overcast: 0.45, rain: 0, snow: 0, fogNear: 50, fogFar: 200 },
  rain: { label: 'rain', high: 18, low: 12, overcast: 0.8, rain: 1, snow: 0, fogNear: 30, fogFar: 140 },
  snow: { label: 'snowfall', high: 15, low: 12, overcast: 0.55, rain: 0, snow: 1, fogNear: 30, fogFar: 150 },
  mist: { label: 'mist', high: 6, low: 12, overcast: 0.35, rain: 0, snow: 0, fogNear: 8, fogFar: 62 },
  storm: { label: 'thunderstorm', high: 20, low: 12, overcast: 0.92, rain: 1, snow: 0, storm: 1, fogNear: 24, fogFar: 120 },
};

// Sky colors keyed on the sun's height (sunDir.y), interpolated in between.
// `glow` is the warm band on the horizon around the sun at dawn and dusk.
const PALETTE = [
  { e: -0.35, top: '#060a1d', horizon: '#131b38', bottom: '#04060d', glow: '#000000', sun: '#000000', sunI: 0, hemiSky: '#34477f', hemiGround: '#0d1020', hemiI: 0.75, fog: '#0f152c' },
  { e: -0.1, top: '#151d48', horizon: '#33305e', bottom: '#0b0c1d', glow: '#5a2a58', sun: '#000000', sunI: 0, hemiSky: '#4d4f86', hemiGround: '#16142a', hemiI: 0.75, fog: '#2a2850' },
  { e: 0.0, top: '#28397a', horizon: '#e07c5e', bottom: '#4a3a52', glow: '#ff6a2a', sun: '#ff7a3d', sunI: 0.6, hemiSky: '#8c7aa8', hemiGround: '#3a2a2a', hemiI: 0.7, fog: '#b9786c' },
  { e: 0.12, top: '#3a70c8', horizon: '#ffc08a', bottom: '#b4a2a0', glow: '#ff9a4a', sun: '#ffb46b', sunI: 2.2, hemiSky: '#bcd2f0', hemiGround: '#7a5c48', hemiI: 0.95, fog: '#e6c4a2' },
  { e: 0.35, top: '#2470dc', horizon: '#a6d4ff', bottom: '#bccbdb', glow: '#000000', sun: '#fff1dc', sunI: 3.2, hemiSky: '#cfe6ff', hemiGround: '#8f7c62', hemiI: 1.1, fog: '#b6d8f7' },
].map((k) => Object.fromEntries(Object.entries(k).map(([name, v]) => [name, typeof v === 'string' ? new THREE.Color(v) : v])));

const COLOR_KEYS = ['top', 'horizon', 'bottom', 'glow', 'sun', 'hemiSky', 'hemiGround', 'fog'];

function samplePalette(e, out) {
  let i = 0;
  while (i < PALETTE.length - 2 && e > PALETTE[i + 1].e) i++;
  const a = PALETTE[i], b = PALETTE[i + 1];
  const t = THREE.MathUtils.clamp((e - a.e) / (b.e - a.e), 0, 1);
  for (const key of COLOR_KEYS) out[key].lerpColors(a[key], b[key], t);
  out.sunI = THREE.MathUtils.lerp(a.sunI, b.sunI, t);
  out.hemiI = THREE.MathUtils.lerp(a.hemiI, b.hemiI, t);
}

const GRAY = new THREE.Color();
function overcastTint(color, amount) {
  const l = color.r * 0.3 + color.g * 0.55 + color.b * 0.15;
  return color.lerp(GRAY.setRGB(l, l, l), amount);
}

let dot;
export function softDot() {
  if (dot) return dot;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dot = new THREE.CanvasTexture(canvas);
  return dot;
}

// Shared with the water, so it reflects exactly this sky.
export const skyUniforms = {
  uTop: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uBottom: { value: new THREE.Color() },
  uGlow: { value: new THREE.Color() },
  uSunColor: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunVisible: { value: 1 },
  // The key light (sun by day, moon by night) and the soft sky fill.
  uKeyDir: { value: new THREE.Vector3(0, 1, 0) },
  uKeyColor: { value: new THREE.Color() },
  uAmbient: { value: new THREE.Color() },
};

export const SKY_GLSL = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSunVisible;

  vec3 skyColor(vec3 d, float disk) {
    vec3 col = d.y > 0.0
      ? mix(uHorizon, uTop, pow(d.y, 0.5))
      : mix(uHorizon, uBottom, pow(-d.y, 0.4));
    // Dawn and dusk warm the horizon on the sun's side of the sky.
    float toward = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5)), 0.0);
    col += uGlow * pow(toward, 3.0) * pow(1.0 - abs(d.y), 5.0);
    float s = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(s, 6.0) * 0.12 + pow(s, 64.0) * 0.4) * uSunVisible;
    col += uSunColor * smoothstep(0.99955, 0.99975, s) * 14.0 * uSunVisible * disk;
    return col;
  }
`;

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vDir;
  void main() {
    gl_FragColor = vec4(skyColor(normalize(vDir), 1.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// --- Clouds -------------------------------------------------------------
// Each cloud is a cluster of soft, camera-facing puffs. Every puff is shaded
// as if it were a little sphere, so the clusters read as volume.

function puffAtlas() {
  const S = 256, C = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  const r = makeRandom('pacaland-sky', 'puffs');
  for (let cell = 0; cell < 4; cell++) {
    const noise = createNoise2D(r);
    const ox = (cell % 2) * C, oy = Math.floor(cell / 2) * C;
    for (let y = 0; y < C; y++) {
      for (let x = 0; x < C; x++) {
        const u = ((x + 0.5) / C) * 2 - 1, v = ((y + 0.5) / C) * 2 - 1;
        const lumpy = Math.hypot(u, v) * (1 + 0.3 * (fbm(noise, u * 1.4 + 9, v * 1.4 - 4, 2) * 0.5 + 0.5));
        const a = smoothstep(0.98, 0.2, lumpy) * THREE.MathUtils.clamp(0.62 + 0.5 * fbm(noise, u * 2.4, v * 2.4, 4), 0, 1);
        const i = ((oy + y) * S + ox + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

const PUFF_VERTEX = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec4 aData; // size, rotation, shade (0 underside .. 1 top), atlas cell
  uniform vec3 uKeyDir;
  varying vec2 vUv;
  varying vec2 vCorner;
  varying vec2 vCell;
  varying float vShade;
  varying float vFade;
  varying vec3 vKeyView;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(aOffset, 1.0);
    float c = cos(aData.y), s = sin(aData.y);
    vec2 corner = mat2(c, s, -s, c) * position.xy;
    mvPosition.xy += corner * aData.x;
    vCorner = corner * 2.0;
    vUv = uv;
    vCell = vec2(mod(aData.w, 2.0), floor(aData.w / 2.0)) * 0.5;
    vShade = aData.z;
    vKeyView = normalize((viewMatrix * vec4(uKeyDir, 0.0)).xyz);
    // Fade puffs that get too close to the camera instead of clipping through them.
    vFade = smoothstep(2.0, 9.0, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const PUFF_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLit;
  uniform vec3 uAmbTop;
  uniform vec3 uAmbBottom;
  uniform float uForward;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec2 vCorner;
  varying vec2 vCell;
  varying float vShade;
  varying float vFade;
  varying vec3 vKeyView;
  #include <fog_pars_fragment>
  void main() {
    float density = texture2D(uMap, vCell + vUv * 0.5).a;
    float a = density * uOpacity * vFade;
    if (a < 0.004) discard;
    vec3 n = normalize(vec3(vCorner * 0.9, sqrt(max(1.0 - dot(vCorner, vCorner), 0.0)) + 0.25));
    float height = clamp(vShade + n.y * 0.3, 0.0, 1.0);
    float lit = clamp(dot(n, vKeyView) * 0.6 + 0.4, 0.0, 1.0);
    vec3 col = mix(uAmbBottom, uAmbTop, height) + uLit * lit * mix(0.35, 1.0, height);
    // Silver lining: thin edges glow when you look toward the light.
    col += uLit * pow(max(-vKeyView.z, 0.0), 3.0) * (1.0 - density) * uForward;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const puffShared = {
  ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  uMap: { value: null },
  uLit: { value: new THREE.Color() },
  uAmbTop: { value: new THREE.Color() },
  uAmbBottom: { value: new THREE.Color() },
  uForward: { value: 1.2 },
  uKeyDir: skyUniforms.uKeyDir,
};

const PLANE = new THREE.PlaneGeometry(1, 1);
const camLocal = new THREE.Vector3();

// Write puff data into the instance buffers, back to front from `eye` when given,
// so overlapping puffs blend in the right order.
export function writePuffs(mesh, eye) {
  const { puffs } = mesh.userData;
  if (eye) {
    for (const p of puffs) p.d = (p.x - eye.x) ** 2 + (p.y - eye.y) ** 2 + (p.z - eye.z) ** 2;
    puffs.sort((a, b) => b.d - a.d);
  }
  const offsets = mesh.geometry.attributes.aOffset;
  const data = mesh.geometry.attributes.aData;
  puffs.forEach((p, i) => {
    offsets.setXYZ(i, p.x, p.y, p.z);
    data.setXYZW(i, p.size, p.rot, p.shade, p.cell);
  });
  offsets.needsUpdate = data.needsUpdate = true;
}

export function createPuffMesh(puffs, opacity = 1) {
  puffShared.uMap.value ??= puffAtlas();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(PLANE.index.clone());
  geo.setAttribute('position', PLANE.attributes.position.clone());
  geo.setAttribute('uv', PLANE.attributes.uv.clone());
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4).setUsage(THREE.DynamicDrawUsage));
  geo.instanceCount = puffs.length;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...puffShared, uOpacity: { value: opacity } },
    vertexShader: PUFF_VERTEX,
    fragmentShader: PUFF_FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.userData.puffs = puffs;
  writePuffs(mesh);
  return mesh;
}

function buildClouds() {
  const r = makeRandom('pacaland-sky', 'clouds');
  const clouds = [];
  for (let i = 0; i < 30; i++) {
    const low = i >= 18;
    const S = low ? r.range(3.2, 5.5) : r.range(2.0, 3.6);
    const span = low ? { x: S * 2.4, y: S * 0.35, z: S * 1.6 } : { x: S * 1.8, y: S * 0.85, z: S * 1.0 };
    const puffs = [];
    const count = low ? r.int(16, 24) : r.int(14, 24);
    while (puffs.length < count) {
      const x = r.range(-1, 1), z = r.range(-1, 1);
      const core = 1 - Math.hypot(x, z);
      if (core <= 0) continue;
      const y = r() * core;
      puffs.push({
        x: x * span.x, y: y * span.y, z: z * span.z,
        size: S * (low ? r.range(1.3, 1.9) : r.range(0.9, 1.5)) * (0.5 + 0.5 * core),
        rot: r.range(0, TAU),
        // The cloud sea is lit from all around, so it gets softer shading.
        shade: low ? 0.5 + y * 0.4 + core * 0.15 : Math.min(1, 0.1 + y * 0.9 + core * 0.25),
        cell: r.int(0, 3),
      });
    }
    const mesh = createPuffMesh(puffs, 0);
    Object.assign(mesh.userData, {
      low,
      angle: r.range(0, TAU),
      radius: low ? r.range(4, 30) : r.range(24, 42),
      y: low ? r.range(-23, -16) : r.range(5, 12),
      speed: r.range(0.006, 0.02) * (r.chance(0.5) ? 1 : -1),
      opacity: 0,
    });
    mesh.rotation.y = r.range(0, TAU);
    clouds.push(mesh);
  }
  return clouds;
}

function buildRain() {
  const N = 1600;
  const drops = Array.from({ length: N }, () => {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 18;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -14 + Math.random() * 34, v: 18 + Math.random() * 8 };
  });
  const positions = new Float32Array(N * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const color = new THREE.Color('#b8cbe2');
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  lines.frustumCulled = false;
  return {
    object: lines,
    update(dt, amount, light) {
      lines.visible = amount > 0.01;
      if (!lines.visible) return;
      lines.material.opacity = 0.4 * amount;
      lines.material.color.copy(color).multiplyScalar(light);
      drops.forEach((d, i) => {
        d.y -= d.v * dt;
        if (d.y < -14) d.y += 34;
        positions.set([d.x, d.y, d.z, d.x + 0.05, d.y + 0.55, d.z], i * 6);
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function buildSnow() {
  const N = 1300;
  const flakes = Array.from({ length: N }, () => {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 18;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -14 + Math.random() * 34, v: 0.8 + Math.random() * 0.9, phase: Math.random() * TAU };
  });
  const positions = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#ffffff', size: 0.16, map: softDot(), transparent: true, opacity: 0, depthWrite: false,
  }));
  points.frustumCulled = false;
  return {
    object: points,
    update(dt, amount, light, t) {
      points.visible = amount > 0.01;
      if (!points.visible) return;
      points.material.opacity = 0.9 * amount;
      points.material.color.setScalar(light);
      flakes.forEach((f, i) => {
        f.y -= f.v * dt;
        if (f.y < -14) f.y += 34;
        positions[i * 3] = f.x + Math.sin(t * 0.7 + f.phase) * 0.4;
        positions[i * 3 + 1] = f.y;
        positions[i * 3 + 2] = f.z + Math.cos(t * 0.5 + f.phase) * 0.4;
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export function createSky(scene, renderer, { lowPower = false } = {}) {
  const pal = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()]));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(500, 48, 24),
    new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false }),
  );
  scene.add(dome);

  // Image-based lighting: the land is lit by a blurred copy of this sky,
  // re-captured whenever the sky changes. The copy is less saturated than the
  // sky you see, as real skylight is once the bright horizon and haze mix in.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envUniforms = Object.fromEntries(Object.entries(skyUniforms).map(([name, u]) => [name, { value: u.value.clone?.() ?? u.value }]));
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(dome.geometry, new THREE.ShaderMaterial({
    uniforms: envUniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false,
  })));
  scene.environmentIntensity = 0.9;
  let envTarget = null;
  let lastEnv = { t: -Infinity, e: 9, o: 9 };

  const starPositions = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y) * 0.95 + 0.05 * Math.random();
    v.normalize().multiplyScalar(450).toArray(starPositions, i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: '#ffffff', size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  scene.add(stars);

  // The moon is lit from the sun's direction, so it shows its real phase.
  const moonUniforms = {
    uLightDir: { value: new THREE.Vector3(0, 1, 0) },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color('#f5f0dc').multiplyScalar(2.2) },
  };
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.ShaderMaterial({
    uniforms: moonUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float lit = smoothstep(-0.08, 0.12, dot(normalize(vNormal), uLightDir));
        gl_FragColor = vec4(uColor * (0.035 + lit), uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  scene.add(moon);

  // Lightning: a brief flash over everything and a bolt somewhere in the distance.
  const flashLight = new THREE.DirectionalLight('#dfe8ff', 0);
  flashLight.position.set(12, 40, -8);
  scene.add(flashLight);
  const bolt = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e8eeff').multiplyScalar(6), transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  bolt.frustumCulled = false;
  scene.add(bolt);
  const UP = new THREE.Vector3(0, 1, 0), boltDir = new THREE.Vector3(), boltQ = new THREE.Quaternion();
  let nextStrike = 3, strikeAge = 9;
  function strike() {
    const a = Math.random() * TAU, d = 28 + Math.random() * 14;
    let x = Math.cos(a) * d, y = 15, z = Math.sin(a) * d;
    const parts = [];
    while (y > -20) {
      const nx = x + (Math.random() - 0.5) * 2.6, ny = y - 1.4 - Math.random() * 2.2, nz = z + (Math.random() - 0.5) * 2.6;
      boltDir.set(nx - x, ny - y, nz - z);
      const len = boltDir.length();
      boltQ.setFromUnitVectors(UP, boltDir.normalize());
      parts.push(new THREE.BoxGeometry(0.14, len, 0.14).translate(0, len / 2, 0).applyQuaternion(boltQ).translate(x, y, z));
      x = nx; y = ny; z = nz;
    }
    bolt.geometry.dispose();
    bolt.geometry = mergeGeometries(parts);
    strikeAge = 0;
  }
  // A real flash flickers: a bright stroke, a dip, a second stroke, then fades.
  const flashAt = (age) => (age < 0.07 ? 1 : age < 0.13 ? 0.25 : age < 0.21 ? 0.85 : Math.max(0, 1 - (age - 0.21) / 0.4) * 0.5);

  // One key light plays the sun by day and the moon by night; it swaps
  // direction while it's dark, so the handover never pops.
  const key = new THREE.DirectionalLight('#ffffff', 2);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(lowPower ? 2048 : 4096);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 110 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.3);
  scene.add(hemi);

  scene.fog = new THREE.Fog('#cfe4f5', 70, 260);

  const clouds = buildClouds();
  clouds.forEach((c) => scene.add(c));
  const rain = buildRain();
  const snow = buildSnow();
  scene.add(rain.object, snow.object);

  let target = WEATHERS.clear;
  // `wet` and `snowCover` are what the weather has done to the land: they
  // build up while it rains or snows and fade slowly afterwards.
  const state = { ...WEATHERS.clear, storm: 0, wet: 0, snowCover: 0 };
  let windBase = 1;
  const sunDir = skyUniforms.uSunDir.value;
  const moonDir = new THREE.Vector3();
  const moonColor = new THREE.Color('#9db0ff');
  const env = { e: 1, night: 0, overcast: 0, sunDir };
  let frame = 0;

  return {
    // `instant` skips the transition, e.g. when arriving on a new land.
    // `windKmh` comes from real weather; without it the wind follows the weather.
    setWeather(name, instant = false, windKmh = null) {
      target = WEATHERS[name] ?? WEATHERS.clear;
      windBase = windKmh == null ? 1 : Math.min(3, 0.5 + windKmh / 25);
      if (instant) Object.assign(state, target, { storm: target.storm ?? 0, wet: target.rain, snowCover: target.snow });
    },

    setShadowSize(size) {
      if (key.shadow.mapSize.x === size) return;
      key.shadow.mapSize.setScalar(size);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    },

    // `sky` holds the sun and moon directions and the moon's phase (see conditions.js).
    update(sky, dt, t, camera) {
      frame++;
      sunDir.copy(sky.sunDir);
      moonDir.copy(sky.moonDir);
      const e = sunDir.y;
      samplePalette(e, pal);

      const k = 1 - Math.exp(-dt * 1.2);
      for (const name of ['overcast', 'rain', 'snow', 'storm', 'fogNear', 'fogFar']) {
        state[name] += ((target[name] ?? 0) - state[name]) * k;
      }
      if (state.storm > 0.5 && (nextStrike -= dt) <= 0) {
        strike();
        nextStrike = 3 + Math.random() * 9;
      }
      strikeAge += dt;
      const flash = flashAt(strikeAge) * state.storm;
      state.wet += ((target.rain ? 1 : 0) - state.wet) * (1 - Math.exp(-dt * (target.rain ? 0.25 : 0.04)));
      state.snowCover += ((target.snow ? 1 : 0) - state.snowCover) * (1 - Math.exp(-dt * (target.snow ? 0.05 : 0.025)));
      const o = state.overcast;
      const mist = THREE.MathUtils.clamp((60 - state.fogNear) / 52, 0, 1);
      // Day-for-night: after dark the skylight is lifted and tinted blue, the way
      // eyes (and films) see a night scene, so the land stays readable.
      const nightLift = smoothstep(0.0, -0.2, e);

      for (const name of ['top', 'horizon', 'bottom', 'fog', 'hemiSky', 'glow']) overcastTint(pal[name], o * 0.7);
      for (const name of ['top', 'horizon', 'bottom']) pal[name].lerp(pal.fog, mist * 0.8);
      for (const name of ['top', 'horizon', 'bottom', 'fog']) pal[name].multiplyScalar(1 - state.rain * 0.3);
      for (const name of ['top', 'horizon', 'bottom']) pal[name].lerp(GRAY.setRGB(0.62, 0.66, 0.82), flash * 0.6);

      skyUniforms.uTop.value.copy(pal.top);
      skyUniforms.uHorizon.value.copy(pal.horizon);
      skyUniforms.uBottom.value.copy(pal.bottom);
      skyUniforms.uGlow.value.copy(pal.glow).multiplyScalar(0.55 * (1 - o * 0.8) * (1 - mist));
      skyUniforms.uSunColor.value.copy(pal.sun);
      skyUniforms.uSunVisible.value = (1 - o * 0.95) * (1 - mist) * smoothstep(-0.08, 0.02, e);

      if (e > -0.04) {
        key.position.copy(sunDir).multiplyScalar(50);
        key.color.copy(pal.sun);
        key.intensity = pal.sunI * (1 - o * 0.7);
      } else {
        key.position.copy(moonDir).multiplyScalar(50);
        key.color.copy(moonColor);
        // Moonlight follows the phase: a full moon lights the land, a new moon barely.
        const illumination = (1 - Math.cos(sky.moonPhase * TAU)) / 2;
        key.intensity = (0.9 + 0.7 * illumination) * smoothstep(-0.04, -0.2, e) * (1 - o * 0.6);
      }
      skyUniforms.uKeyDir.value.copy(key.position).normalize();
      skyUniforms.uKeyColor.value.copy(key.color).multiplyScalar(key.intensity);
      skyUniforms.uAmbient.value.copy(pal.hemiSky).multiplyScalar(pal.hemiI * (0.45 + nightLift * 0.5));

      hemi.color.copy(pal.hemiSky);
      hemi.groundColor.copy(pal.hemiGround);
      hemi.intensity = pal.hemiI * (0.3 + nightLift * 0.9);
      scene.environmentIntensity = 0.9 + nightLift * 1.4;
      flashLight.intensity = flash * 5;
      bolt.material.opacity = strikeAge < 0.3 ? state.storm : 0;
      bolt.visible = bolt.material.opacity > 0;

      scene.fog.color.copy(pal.fog);
      // Fog distances are tuned for a camera ~30 units out; keep them relative to
      // wherever the camera really is, so zoomed-out phones still see the land.
      const focus = camera.position.length() - 30;
      scene.fog.near = Math.max(1, state.fogNear + focus);
      scene.fog.far = state.fogFar + focus;

      const dark = smoothstep(-0.02, -0.22, e);
      stars.material.opacity = dark * (1 - o) * (1 - mist);
      moon.position.copy(moonDir).multiplyScalar(420);
      moonUniforms.uLightDir.value.copy(sunDir);
      moonUniforms.uOpacity.value = dark * (1 - o * 0.8) * (1 - mist) * smoothstep(-0.05, 0.05, moonDir.y);

      // Clouds take their light from the same sun, sky and weather.
      const gloom = (1 - state.rain * 0.45 - o * 0.15) * (1 - dark * 0.4);
      puffShared.uLit.value.copy(key.color).multiplyScalar(key.intensity * 0.3 * (1 - o * 0.55)).addScalar(flash * 1.4);
      puffShared.uAmbTop.value.copy(pal.hemiSky).multiplyScalar(pal.hemiI * 0.62 * gloom).lerp(pal.fog, 0.2);
      puffShared.uAmbBottom.value.copy(pal.horizon).lerp(pal.hemiSky, 0.5).multiplyScalar(0.5 * gloom);
      const highCount = target.high, lowCount = target.low;
      clouds.forEach((c, i) => {
        const u = c.userData;
        const wanted = u.low ? i - 18 < lowCount : i < highCount;
        u.opacity += ((wanted ? 1 : 0) - u.opacity) * k;
        u.angle += u.speed * dt;
        c.visible = u.opacity > 0.01;
        c.material.uniforms.uOpacity.value = u.opacity;
        c.position.set(Math.cos(u.angle) * u.radius, u.y + Math.sin(t * 0.2 + i) * 0.3, Math.sin(u.angle) * u.radius);
        if (c.visible && (frame + i) % 4 === 0) {
          c.updateMatrixWorld();
          writePuffs(c, c.worldToLocal(camLocal.copy(camera.position)));
        }
      });

      // Rain and snow are unlit, so they dim with the light by hand.
      const precipLight = 1 - dark * 0.75;
      rain.update(dt, state.rain, precipLight);
      snow.update(dt, state.snow, precipLight, t);

      // Re-capture the lighting when the sky has visibly changed, or every few seconds.
      const changed = Math.abs(e - lastEnv.e) > 0.01 || Math.abs(o - lastEnv.o) > 0.02;
      if ((changed && t - lastEnv.t > 0.15) || t - lastEnv.t > 4) {
        for (const [name, u] of Object.entries(skyUniforms)) {
          if (u.value.copy) envUniforms[name].value.copy(u.value);
          else envUniforms[name].value = u.value;
        }
        for (const name of ['uTop', 'uHorizon', 'uBottom']) overcastTint(envUniforms[name].value, 0.6);
        const next = pmrem.fromScene(envScene, 0, 1, 1000);
        envTarget?.dispose();
        envTarget = next;
        scene.environment = next.texture;
        lastEnv = { t, e, o };
      }

      env.e = e;
      env.night = smoothstep(0.04, -0.12, e);
      env.overcast = o;
      env.rain = state.rain;
      env.snow = state.snow;
      env.mist = mist;
      env.wet = state.wet;
      env.snowCover = state.snowCover;
      // Lamps come on at night, and on gloomy days too.
      env.gloom = Math.max(env.night, o * 0.65);
      env.wind = windBase + state.rain * 1.2 + state.snow * 0.4 + o * 0.3;
      env.flash = flash;
      return env;
    },
  };
}
