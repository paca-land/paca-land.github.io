import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generateLand } from './world.js';
import { createSky, WEATHERS, skyUniforms } from './sky.js';
import { fxUniforms, createLightShafts, createFinishPass } from './effects.js';
import { makeRandom, randomSeed } from './random.js';

const HOME = 'pacaland';
const $ = (sel) => document.querySelector(sel);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = matchMedia('(pointer: coarse)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#world'), antialias: false, powerPreference: 'high-performance' });
} catch {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
camera.position.set(21, 11, 21);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -1.2, 0);
Object.assign(controls, {
  enableDamping: true, enablePan: false, minDistance: 12, maxDistance: 100,
  maxPolarAngle: Math.PI * 0.78, autoRotate: !reducedMotion, autoRotateSpeed: 0.35,
});

const sky = createSky(scene, renderer, { lowPower });
const clock = new THREE.Clock();

// Render in HDR, add sun shafts, let only the brightest things (sun, glints,
// lit windows, fireflies) bloom, tone map once, then finish with a
// miniature-style tilt-shift, vignette and a touch of warmth.
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowPower ? 0 : 4 }));
composer.addPass(new RenderPass(scene, camera));
const shafts = createLightShafts(lowPower ? 24 : 48);
composer.addPass(shafts);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = createFinishPass();
composer.addPass(finish);

let land = null;
let seed = null;
let bornAt = 0;
let timeOverride = null; // hours, or null to follow the visitor's own clock
let weatherOverride = null; // weather name, or null for the land's weather today

function readSeed() {
  let raw = '';
  try {
    raw = decodeURIComponent(location.hash.slice(1));
  } catch {
    raw = location.hash.slice(1);
  }
  return raw.trim().toLowerCase().slice(0, 40) || HOME;
}

// Each land has its own climate, and its weather changes once a day,
// the same for everyone who visits that day.
function todaysWeather() {
  const d = new Date();
  return makeRandom(seed, `weather:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`).weighted(land.biome.weather);
}

function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [o.material].flat()) m?.dispose();
  });
}

function visit(next) {
  if (next === seed) return;
  seed = next;
  if (land) {
    scene.remove(land.group);
    dispose(land.group);
  }
  land = generateLand(seed);
  scene.add(land.group);
  bornAt = clock.elapsedTime;
  // A new land arrives with its weather already settled in.
  sky.setWeather(weatherOverride ?? todaysWeather(), true);
  $('#land-name').textContent = land.name;
  $('#land-meta').textContent = `${land.biome.label} · #${seed}`;
  document.title = seed === HOME ? 'PaCaLand' : `${land.name} · PaCaLand`;
  renderChips();
}

const pad = (n) => String(n).padStart(2, '0');
const formatHours = (h) => `${pad(Math.floor(h) % 24)}:${pad(Math.floor((h % 1) * 60))}`;
const liveHours = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};
function phaseName(h) {
  if (h < 5 || h >= 20.5) return 'night';
  if (h < 7) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 16) return 'afternoon';
  if (h < 18.5) return 'golden hour';
  return 'dusk';
}

// --- UI ---------------------------------------------------------------

const input = $('#seed-input');
$('#visit').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = input.value.trim().toLowerCase();
  if (!value) return;
  location.hash = encodeURIComponent(value);
  input.value = '';
  input.blur();
});
$('#dice').addEventListener('click', () => {
  location.hash = randomSeed();
});
$('#share').addEventListener('click', async () => {
  const button = $('#share');
  try {
    await navigator.clipboard.writeText(location.href);
    button.dataset.state = 'copied';
  } catch {
    button.dataset.state = 'failed';
  }
  setTimeout(() => delete button.dataset.state, 1600);
});
$('#tweak').addEventListener('click', () => {
  const panel = $('#panel');
  panel.hidden = !panel.hidden;
  $('#tweak').setAttribute('aria-expanded', String(!panel.hidden));
});

const timeSlider = $('#time');
timeSlider.addEventListener('input', () => {
  timeOverride = Number(timeSlider.value);
});
$('#live').addEventListener('click', () => {
  timeOverride = null;
});

function renderChips() {
  const chips = $('#weather-chips');
  const today = todaysWeather();
  const options = [[null, `Today (${WEATHERS[today].label})`], ...Object.entries(WEATHERS).map(([k, w]) => [k, w.label])];
  chips.replaceChildren(...options.map(([name, label]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', String(weatherOverride === name));
    chip.addEventListener('click', () => {
      weatherOverride = name;
      sky.setWeather(name ?? todaysWeather());
      renderChips();
    });
    return chip;
  }));
}

addEventListener('hashchange', () => visit(readSeed()));

const size = { w: 0, h: 0 };
function resize() {
  const w = innerWidth, h = innerHeight;
  // A hidden tab can report 0×0; sizing to that would poison the camera with NaN.
  if (!w || !h) return;
  Object.assign(size, { w, h });
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  finish.uniforms.uResolution.value.set(w, h).multiplyScalar(renderer.getPixelRatio());
  shafts.uniforms.uAspect.value = w / h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Stand far enough back that the whole land fits across narrow screens too.
  const offset = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target).add(offset.setLength(Math.max(34, 38 / camera.aspect)));
  input.placeholder = w < 520 ? 'Name a land…' : 'Type any word to grow a land';
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.documentElement);
resize();

visit(readSeed());

// --- Loop -------------------------------------------------------------

const easeOutBack = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
let lastLabel = 0;
const lightPos = new THREE.Vector3();
const focus = new THREE.Vector3();

// Point the shafts at the sun by day and the moon by night, fading them as
// the light leaves the frame.
function aimShafts(env) {
  lightPos.copy(skyUniforms.uKeyDir.value).multiplyScalar(400).add(camera.position).project(camera);
  const onScreen = smoothstep(1.7, 1.0, Math.max(Math.abs(lightPos.x), Math.abs(lightPos.y)));
  const lowSun = 0.5 + 0.9 * smoothstep(0.4, 0.05, env.e);
  const strength = env.e > -0.04 ? skyUniforms.uSunVisible.value * lowSun : (1 - env.overcast) * (1 - env.mist) * env.night * 0.5;
  shafts.uniforms.uSun.value.set(lightPos.x * 0.5 + 0.5, lightPos.y * 0.5 + 0.5);
  shafts.uniforms.uStrength.value = lightPos.z < 1 ? strength * onScreen * 0.9 : 0;
}

renderer.setAnimationLoop(() => {
  // Some viewport changes (devtools, embedded previews) never fire a resize event.
  if (innerWidth !== size.w || innerHeight !== size.h) resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const hours = timeOverride ?? liveHours();
  const env = sky.update(hours, dt, t, camera);
  // Eyes adjust to the dark a little.
  renderer.toneMappingExposure = 1 + env.night * 0.6;
  fxUniforms.uTime.value = t;
  fxUniforms.uCloudShadow.value = (0.15 + env.overcast * 0.4) * (1 - env.night * 0.7) * (1 - env.mist * 0.5);
  fxUniforms.uWindStrength.value = env.wind;
  fxUniforms.uWet.value = env.wet;
  fxUniforms.uSnow.value = env.snowCover;
  fxUniforms.uRain.value = env.rain;
  land.update(t, dt, env);

  // New lands grow up out of the clouds.
  const grow = easeOutBack(Math.min((t - bornAt) / 1.6, 1));
  land.group.scale.setScalar(Math.max(grow, 0.001));
  land.group.position.y = (1 - grow) * -5;
  land.group.rotation.y = (1 - grow) * 0.9;

  controls.update(dt);
  aimShafts(env);
  focus.set(0, 1, 0).project(camera);
  finish.uniforms.uFocusY.value = focus.y * 0.5 + 0.5;
  finish.uniforms.uBlur.value = lowPower ? 0 : 5 * renderer.getPixelRatio();
  composer.render(dt);

  if (t - lastLabel > 0.5) {
    lastLabel = t;
    const weather = weatherOverride ?? todaysWeather();
    $('#conditions').textContent = `${formatHours(hours)} ${timeOverride === null ? 'your time' : '(scrubbed)'} · ${phaseName(hours)} · ${WEATHERS[weather].label}`;
    $('#time-out').textContent = formatHours(hours);
    if (timeOverride === null) timeSlider.value = hours.toFixed(2);
    $('#live').disabled = timeOverride === null;
    document.body.classList.toggle('is-day', env.e > 0.06 && env.overcast < 0.6);
  }
});
