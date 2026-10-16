import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generateLand } from './world.js';
import { createSky, WEATHERS, skyUniforms } from './sky.js';
import { fxUniforms, createLightShafts, createFinishPass, createReflection, useSoftShadows } from './effects.js';
import { createInteraction } from './interact.js';
import { createSoundscape } from './sound.js';
import { homePlace, placeHours, realSky, syntheticSky, newSkyState, landVibe, moonPhase, fetchWeather } from './conditions.js';
import { makeRandom, randomSeed } from './random.js';

const HOME = 'pacaland';
const $ = (sel) => document.querySelector(sel);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = matchMedia('(pointer: coarse)').matches;
const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#world'), antialias: false, powerPreference: 'high-performance' });
} catch {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// ?pcss=0 falls back to plain soft shadows, for comparison or slow GPUs.
if (!lowPower && !/[?&]pcss=0/.test(location.search)) useSoftShadows();
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
camera.position.set(21, 11, 21);
const HOME_TARGET = new THREE.Vector3(0, -1.2, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME_TARGET);
Object.assign(controls, {
  enableDamping: true, enablePan: false, minDistance: 6, maxDistance: 100,
  maxPolarAngle: Math.PI * 0.78, autoRotateSpeed: 0.35,
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
const reflection = createReflection(renderer);

// --- Where each land's sky comes from ------------------------------------
// The home land shows the real sky: the sun and moon where they really are and
// the live weather. Every other land has its own moment, grown from its word.

const place = homePlace();
const skyState = newSkyState();
let live = null; // live weather at home: { weather, temperature, windKmh }
let vibe = null; // { hours, moonPhase, weather } for any land but home
let vibeStart = 0;

let land = null;
let seed = null;
let bornAt = 0;
let timeOverride = null; // hours from the slider, or null for the land's own time
let weatherOverride = null; // a weather name, or null for the land's own weather

const isHome = () => seed === HOME;

function naturalWeather() {
  if (!isHome()) return vibe.weather;
  if (live) return live.weather;
  // Offline: the home land falls back to a weather of the day.
  const d = new Date();
  return makeRandom(seed, `weather:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`).weighted(land.biome.weather);
}

function applyWeather(instant) {
  const windKmh = isHome() && !weatherOverride ? live?.windKmh ?? null : null;
  sky.setWeather(weatherOverride ?? naturalWeather(), instant, windKmh);
}

async function refreshLiveWeather() {
  try {
    live = await fetchWeather(place);
    if (isHome()) {
      applyWeather(false);
      renderChips();
    }
  } catch {
    // Offline or blocked; keep whatever we had.
  }
}

function landHours() {
  if (timeOverride !== null) return timeOverride;
  if (isHome()) return placeHours(new Date(), place);
  // A land's moment drifts on in real time while you watch.
  return (vibe.hours + (clock.elapsedTime - vibeStart) / 3600) % 24;
}

function updateSkyState() {
  if (isHome() && timeOverride === null) return realSky(new Date(), place, skyState);
  return syntheticSky(landHours(), isHome() ? moonPhase(new Date()) : vibe.moonPhase, skyState);
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
  land.setDetail(QUALITY[quality].grass);
  land.hooks.sound = (kind) => sound.play(kind);
  scene.add(land.group);
  bornAt = clock.elapsedTime;
  vibe = isHome() ? null : landVibe(seed, land.biome);
  vibeStart = clock.elapsedTime;
  // A new land arrives with its weather already settled in.
  applyWeather(true);
  if (focus.zoomed) focusOn(null);
  perf.settleUntil = performance.now() + 3000;
  $('#land-name').textContent = land.name;
  $('#land-meta').textContent = `${land.biome.label} · #${seed}`;
  document.title = isHome() ? 'PaCaLand' : `${land.name} · PaCaLand`;
  renderChips();
}

const pad = (n) => String(n).padStart(2, '0');
const formatHours = (h) => `${pad(Math.floor(h) % 24)}:${pad(Math.floor((h % 1) * 60))}`;
const fahrenheit = /^en-US/.test(navigator.language);
const formatTemp = (c) => (fahrenheit ? `${Math.round(c * 1.8 + 32)}°F` : `${Math.round(c)}°C`);

function phaseName(e, hours) {
  if (e < -0.12) return 'night';
  if (e < 0) return hours < 12 ? 'dawn' : 'dusk';
  if (e < 0.18) return hours < 12 ? 'sunrise' : 'golden hour';
  return hours < 11 ? 'morning' : hours < 15 ? 'midday' : 'afternoon';
}

function conditionsText(hours, env) {
  const weather = weatherOverride ?? naturalWeather();
  const parts = [];
  if (timeOverride !== null) parts.push(`${formatHours(hours)} (scrubbed)`);
  else if (isHome()) parts.push(`${formatHours(hours)} ${place.label === 'your sky' ? 'your time' : `in ${place.label}`}`);
  else parts.push(`${formatHours(hours)} here`);
  parts.push(phaseName(env.e, hours));
  parts.push(WEATHERS[weather].label);
  if (isHome() && live && !weatherOverride) parts.push(`${formatTemp(live.temperature)}, live`);
  return parts.join(' · ');
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
  setTimelapse(false);
  timeOverride = Number(timeSlider.value);
});
$('#live').addEventListener('click', () => {
  setTimelapse(false);
  timeOverride = null;
});

// A whole day and night in a minute, then back to the land's own time.
// The button stays lit while it runs; tap it again to stop.
let timelapse = null;
const timelapseButton = $('#timelapse');
function setTimelapse(on) {
  timelapse = on ? { start: clock.elapsedTime, from: landHours() } : null;
  timelapseButton.setAttribute('aria-pressed', String(on));
  timelapseButton.textContent = on ? 'Stop time lapse' : 'Time lapse';
}
timelapseButton.addEventListener('click', () => {
  const on = !timelapse;
  setTimelapse(on);
  if (!on) timeOverride = null;
});
function updateTimelapse() {
  if (!timelapse) return;
  const k = (clock.elapsedTime - timelapse.start) / 60;
  if (k >= 1) {
    setTimelapse(false);
    timeOverride = null;
  } else {
    timeOverride = (timelapse.from + k * 24) % 24;
    // Keep the slider and its readout moving along with the time lapse.
    timeSlider.value = timeOverride.toFixed(2);
    $('#time-out').textContent = formatHours(timeOverride);
  }
}

// Sound starts muted (browsers insist on a tap first) and remembers your choice.
const sound = createSoundscape();
const soundButton = $('#sound');
let soundWanted = false;
try {
  soundWanted = localStorage.getItem('paca-sound') === 'on';
} catch {}
async function setSound(on) {
  soundWanted = on;
  try {
    localStorage.setItem('paca-sound', on ? 'on' : 'off');
  } catch {}
  if (on) await sound.enable();
  else sound.disable();
  soundButton.setAttribute('aria-pressed', String(sound.on));
}
soundButton.addEventListener('click', () => setSound(!sound.on));
addEventListener('pointerdown', () => {
  if (soundWanted && !sound.on) setSound(true);
}, { once: true });

// Photo mode: no interface, a freer camera, exposure and focus to taste.
const photo = { on: false, exposure: 0, blur: 5 };
function setPhotoMode(on) {
  photo.on = on;
  document.body.classList.toggle('photo', on);
  $('#photo-ui').hidden = !on;
  controls.enablePan = on;
  controls.minDistance = on ? 3 : 6;
}
$('#photo').addEventListener('click', () => setPhotoMode(true));
$('#photo-done').addEventListener('click', () => setPhotoMode(false));
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && photo.on) setPhotoMode(false);
});
$('#photo-exposure').addEventListener('input', (event) => {
  photo.exposure = Number(event.target.value);
});
$('#photo-blur').addEventListener('input', (event) => {
  photo.blur = Number(event.target.value);
});
$('#photo-save').addEventListener('click', () => {
  // Render a fresh frame and grab it before the browser clears the canvas.
  composer.render(0);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${land.name}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  });
});

function chipRow(container, options, selected, onPick) {
  container.replaceChildren(...options.map(([value, label]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', String(selected === value));
    chip.addEventListener('click', () => onPick(value));
    return chip;
  }));
}

function renderChips() {
  const natural = WEATHERS[naturalWeather()].label;
  chipRow($('#weather-chips'), [
    [null, isHome() && live ? `Live (${natural})` : `Natural (${natural})`],
    ...Object.entries(WEATHERS).map(([name, w]) => [name, w.label]),
  ], weatherOverride, (name) => {
    weatherOverride = name;
    applyWeather(false);
    renderChips();
  });
  chipRow($('#quality-chips'), [
    ['auto', `Auto (${QUALITY[quality].label})`],
    ...QUALITY.map((q, i) => [i, q.label]),
  ], qualityMode, (mode) => {
    qualityMode = mode;
    if (mode !== 'auto') quality = mode;
    else quality = startQuality;
    applyQuality();
  });
}

addEventListener('hashchange', () => visit(readSeed()));

function readSeed() {
  let raw = '';
  try {
    raw = decodeURIComponent(location.hash.slice(1));
  } catch {
    raw = location.hash.slice(1);
  }
  return raw.trim().toLowerCase().slice(0, 40) || HOME;
}

// --- Quality ------------------------------------------------------------
// Starts high and steps down if the frame rate struggles; or pick a level.

const QUALITY = [
  { label: 'low', ratio: 0.75, shadow: 1024, shafts: false, tilt: false, bloom: false, reflect: false, grass: 0 },
  { label: 'medium', ratio: 1, shadow: 1024, shafts: false, tilt: false, bloom: true, reflect: false, grass: 1 },
  { label: 'high', ratio: 1.5, shadow: 2048, shafts: true, tilt: true, bloom: true, reflect: true, grass: 2 },
  { label: 'ultra', ratio: 2, shadow: 4096, shafts: true, tilt: true, bloom: true, reflect: true, grass: 3 },
];
const startQuality = lowPower ? 2 : 3;
let quality = startQuality;
let qualityMode = 'auto';
const perf = { frames: 0, time: 0, settleUntil: performance.now() + 3000, slow: 0, smooth: 0, ceiling: startQuality, raisedAt: -Infinity };

function applyQuality() {
  const q = QUALITY[quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.ratio));
  shafts.enabled = q.shafts;
  bloom.enabled = q.bloom;
  sky.setShadowSize(q.shadow);
  land?.setDetail(q.grass);
  sizeRenderer();
  perf.settleUntil = performance.now() + 2500;
  if (land) renderChips();
}

function watchPerformance(realDt) {
  const now = performance.now();
  if (qualityMode !== 'auto' || document.hidden || now < perf.settleUntil) {
    perf.frames = perf.time = 0;
    return;
  }
  // Long gaps mean the browser is throttling us (background tab, a busy
  // moment), not that the GPU is struggling, so they don't count.
  if (realDt > 0.1) return;
  perf.frames++;
  perf.time += realDt;
  if (perf.time < 2) return;
  const fps = perf.frames / perf.time;
  perf.frames = perf.time = 0;
  if (fps < 30) {
    perf.smooth = 0;
    if (++perf.slow >= 2 && quality > 0) {
      // Struggling right after stepping up: that level is too much, stop trying it.
      if (now - perf.raisedAt < 15000) perf.ceiling = quality - 1;
      quality--;
      perf.slow = 0;
      applyQuality();
    }
  } else if (fps > 55) {
    perf.slow = 0;
    if (++perf.smooth >= 4 && quality < perf.ceiling) {
      quality++;
      perf.smooth = 0;
      perf.raisedAt = now;
      applyQuality();
    }
  } else {
    perf.slow = perf.smooth = 0;
  }
}

// --- Sizing and camera ---------------------------------------------------

const size = { w: 0, h: 0 };
function sizeRenderer() {
  const w = innerWidth, h = innerHeight;
  // A hidden tab can report 0×0; sizing to that would poison the camera with NaN.
  if (!w || !h) return false;
  Object.assign(size, { w, h });
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  finish.uniforms.uResolution.value.set(w, h).multiplyScalar(renderer.getPixelRatio());
  reflection.setSize(w * renderer.getPixelRatio() * 0.5, h * renderer.getPixelRatio() * 0.5);
  shafts.uniforms.uAspect.value = w / h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  input.placeholder = w < 520 ? 'Name a land…' : 'Type any word to grow a land';
  return true;
}

// Far enough back that the whole land fits across narrow screens too.
const fitDistance = () => Math.max(34, 38 / camera.aspect);

function resize() {
  if (!sizeRenderer() || focus.zoomed) return;
  const offset = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target).add(offset.setLength(fitDistance()));
}

// Double-click glides the camera in to look closer; double-click the sky to pull back.
const focus = { from: new THREE.Vector3(), to: new THREE.Vector3(), fromDist: 0, toDist: 0, start: -1, zoomed: false };
function focusOn(point) {
  focus.from.copy(controls.target);
  focus.to.copy(point ?? HOME_TARGET);
  focus.fromDist = camera.position.distanceTo(controls.target);
  focus.toDist = point ? 13 : fitDistance();
  focus.start = clock.elapsedTime;
  focus.zoomed = Boolean(point);
}
const offsetDir = new THREE.Vector3();
function updateFocus(t) {
  if (focus.start < 0) return;
  const k = Math.min((t - focus.start) / 1.3, 1);
  const e = k * k * (3 - 2 * k);
  offsetDir.copy(camera.position).sub(controls.target).normalize();
  controls.target.lerpVectors(focus.from, focus.to, e);
  camera.position.copy(controls.target).addScaledVector(offsetDir, THREE.MathUtils.lerp(focus.fromDist, focus.toDist, e));
  if (k >= 1) focus.start = -1;
}

// The camera drifts around the land, pausing for a while whenever you take over.
let idleSince = -Infinity;
controls.addEventListener('start', () => {
  idleSince = Infinity;
});
controls.addEventListener('end', () => {
  idleSince = performance.now();
});

const hint = $('#hint');
const interaction = createInteraction(renderer.domElement, camera, () => land?.clickables ?? [], {
  onClick: () => {
    idleSince = performance.now();
    hint.classList.add('gone');
  },
  onDoubleClick: (picked) => focusOn(picked ? picked.hit.point : null),
});
setTimeout(() => hint.classList.add('gone'), 14000);

addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.documentElement);
applyQuality();
resize();
visit(readSeed());
refreshLiveWeather();
setInterval(refreshLiveWeather, 15 * 60 * 1000);

// --- Loop -------------------------------------------------------------

const easeOutBack = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
let lastLabel = 0;
let lastFrame = performance.now();
const lightPos = new THREE.Vector3();
const focusPoint = new THREE.Vector3();

// Point the shafts at the sun by day and the moon by night, fading them as
// the light leaves the frame.
function aimShafts(env) {
  lightPos.copy(skyUniforms.uKeyDir.value).multiplyScalar(400).add(camera.position).project(camera);
  const onScreen = smoothstep(1.7, 1.0, Math.max(Math.abs(lightPos.x), Math.abs(lightPos.y)));
  const lowSun = 0.5 + 0.9 * smoothstep(0.4, 0.05, env.e);
  const strength = env.e > -0.04 ? skyUniforms.uSunVisible.value * lowSun : (1 - env.overcast) * (1 - env.mist) * env.night * 0.5;
  shafts.uniforms.uSun.value.set(lightPos.x * 0.5 + 0.5, lightPos.y * 0.5 + 0.5);
  shafts.uniforms.uStrength.value = lightPos.z < 1 ? strength * onScreen * 0.9 : 0;
  // Lens flare only when the sun itself is in the frame.
  const inFrame = smoothstep(1.05, 0.9, Math.max(Math.abs(lightPos.x), Math.abs(lightPos.y)));
  shafts.uniforms.uFlare.value = env.e > -0.02 && lightPos.z < 1 ? skyUniforms.uSunVisible.value * inFrame * (1 - env.overcast) : 0;
}

renderer.setAnimationLoop(() => {
  const nowMs = performance.now();
  watchPerformance((nowMs - lastFrame) / 1000);
  lastFrame = nowMs;
  // Some viewport changes (devtools, embedded previews) never fire a resize event.
  if (innerWidth !== size.w || innerHeight !== size.h) resize();

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateTimelapse();
  const env = sky.update(updateSkyState(), dt, t, camera);
  // Eyes adjust to the dark a little; lightning flashes overexpose for an instant.
  renderer.toneMappingExposure = (1 + env.night * 0.9 + env.flash * 0.4) * (photo.on ? 2 ** photo.exposure : 1);
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

  // Aurora needs a cold place: a snowy or high land, fresh snow, or a freezing night at home.
  sky.setCold(['snowfield', 'highlands'].includes(land.biomeKey) || env.snowCover > 0.5 || (isHome() && live?.temperature < 1));
  updateFocus(t);
  controls.autoRotate = !reducedMotion && !photo.on && nowMs - idleSince > 8000;
  controls.update(dt);
  interaction.update();
  aimShafts(env);
  focusPoint.copy(controls.target).add(new THREE.Vector3(0, camera.position.distanceTo(controls.target) * 0.065, 0)).project(camera);
  finish.uniforms.uFocusY.value = focusPoint.y * 0.5 + 0.5;
  finish.uniforms.uBlur.value = (photo.on ? photo.blur : QUALITY[quality].tilt ? 5 : 0) * renderer.getPixelRatio();
  finish.uniforms.uTime.value = t;
  finish.uniforms.uRainLens.value = env.rain * 0.85;
  const mirrored = QUALITY[quality].reflect && land.water && grow >= 1 && reflection.render(scene, camera, land.waterLevel(), land.mirrorHide);
  fxUniforms.uReflectOn.value = mirrored ? 1 : 0;
  composer.render(dt);
  sound.update(env, land.sounds, dt);

  if (t - lastLabel > 0.5) {
    lastLabel = t;
    const hours = landHours();
    $('#conditions').textContent = conditionsText(hours, env);
    $('#time-out').textContent = formatHours(hours);
    if (timeOverride === null) timeSlider.value = hours.toFixed(2);
    $('#live').disabled = timeOverride === null;
    document.body.classList.toggle('is-day', env.e > 0.06 && env.overcast < 0.6);
  }
});
