import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generateLand, BIOMES } from './world.js';
import { LANDMARK_TYPES } from './landmarks.js';
import { createSky, WEATHERS, skyUniforms } from './sky.js';
import { fxUniforms, createLightShafts, createFinishPass, createReflection, useSoftShadows } from './effects.js';
import { createInteraction } from './interact.js';
import { createSoundscape } from './sound.js';
import { createSkyGrab } from './skygrab.js';
import { createJournal, tierTag, showToast } from './journal.js';
import { createVoyage } from './voyage.js';
import { createWaBalloon } from './balloon.js';
import { createMazeBall } from './mazeball.js';
import { landRarity } from './rarity.js';
import { homePlace, placeHours, realSky, syntheticSky, newSkyState, landVibe, fetchWeather } from './conditions.js';
import { makeRandom, randomSeed } from './random.js';
import { t, lang, setLang, translatePage } from './i18n.js';

// The page's own words, in the chosen language, before anything can fail.
translatePage();

const HOME = 'pacaland';

// The owner's door to every kind of island: #!ember/castle/lake/falls/balloon/
// storm/23/kettle grows "kettle" as an ember isle with a castle, a lake and a
// waterfall, a balloon overhead, in a storm at 23:00. Any part can be left out
// or reordered; `none` means no landmark and `dry` no water; with no word, it's
// the home land. Like a voyage's words, it's applied after every die is
// rolled, so ordinary links don't change; and like voyage lands, these skip
// rarity and the journal. No island's name starts with "!", so it can't clash.
// (Owner-only, so not translated. Not a secret, just not advertised.)
const ADMIN = '!';
const ADMIN_HOURS = { dawn: 6.5, morning: 9, noon: 12.5, afternoon: 15, golden: 17.5, dusk: 19.4, night: 23 };
function adminLand(raw) {
  if (!raw.startsWith(ADMIN)) return null;
  const parts = raw.slice(ADMIN.length).split('/');
  const out = { word: HOME, want: {}, weather: null, hour: null, asked: parts.filter(Boolean).length };
  for (const part of parts.filter(Boolean)) {
    if (BIOMES[part]) out.want.biome = part;
    else if (LANDMARK_TYPES.includes(part) || part === 'none') out.want.landmark = part;
    else if (part === 'lake') out.want.lake = true;
    else if (part === 'falls' || part === 'waterfall' || part === 'river') Object.assign(out.want, { lake: true, river: true });
    else if (part === 'dry') Object.assign(out.want, { lake: false, river: false });
    else if (part === 'balloon') out.want.balloon = true;
    else if (WEATHERS[part]) out.weather = part;
    else if (ADMIN_HOURS[part] !== undefined) out.hour = ADMIN_HOURS[part];
    else if (/^\d{1,2}(\.\d+)?$/.test(part)) out.hour = Number(part) % 24;
    else out.word = part;
  }
  return out;
}
const ADMIN_HELP = `admin · #${ADMIN}island/landmark/lake|falls|dry/balloon/weather/hour/word · islands: ${Object.keys(BIOMES).join(' ')} · landmarks: ${LANDMARK_TYPES.join(' ')} none · weather: ${Object.keys(WEATHERS).join(' ')} · hours: 0–23 or ${Object.keys(ADMIN_HOURS).join(' ')}`;
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
  // Scroll and pinch head for whatever is under the pointer, like a map (see keepNearHome).
  enableDamping: true, enablePan: false, zoomToCursor: true, minDistance: 6, maxDistance: 100,
  maxPolarAngle: Math.PI * 0.78, autoRotateSpeed: 0.35,
});
// iPhones now and then never deliver a finger's lift (an app switch or a system
// swipe mid-drag), and the controls go on counting that finger as down: every
// drag after it reads as half a pinch, so the view zooms but won't turn until a
// reload. A first finger means nothing else is touching, so anything still held is stale.
function forgetStaleFingers() {
  if (!controls._pointers.length) return;
  controls._pointers.length = 0;
  controls._pointerPositions = {};
  controls.domElement.removeEventListener('pointermove', controls._onPointerMove);
  controls.domElement.removeEventListener('pointerup', controls._onPointerUp);
  controls.state = -1; // OrbitControls' NONE
  controls.dispatchEvent({ type: 'end' });
}
addEventListener('pointerdown', (event) => {
  if (event.isPrimary) forgetStaleFingers();
}, { capture: true });
document.addEventListener('visibilitychange', forgetStaleFingers);

const sky = createSky(scene, renderer, { lowPower });
// Wa's balloon, on a voyage (see balloon.js). A tap gives the burner a blast.
const waBalloon = createWaBalloon({ onTap: () => sound.play('whoosh') });
scene.add(waBalloon.object);
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
let admin = null; // the parsed #! link, on an admin island
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

// `mode`: 'fade', 'settle' or 'instant' (see sky.setWeather).
function applyWeather(mode = 'fade') {
  const windKmh = isHome() && !weatherOverride ? live?.windKmh ?? null : null;
  sky.setWeather(weatherOverride ?? naturalWeather(), mode, windKmh);
}

async function refreshLiveWeather() {
  try {
    live = await fetchWeather(place);
    if (isHome()) {
      // If it arrives just after the land does, the ground takes it at once
      // rather than slowly drying off or melting the offline guess.
      applyWeather(clock.elapsedTime - bornAt < 4 ? 'settle' : 'fade');
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

// Hours on the home clock right now. Intl is slow, so ask it once a second.
let homeClock = { ms: -Infinity, hours: 0 };
function homeHoursNow(ms) {
  if (ms - homeClock.ms > 1000) homeClock = { ms, hours: placeHours(new Date(ms), place) };
  return homeClock.hours + (ms - homeClock.ms) / 3600000;
}

// The sky at any hour: at home, today's real sky (so a scrubbed or dragged sun
// stays on its true path); anywhere else, the land's own imagined one.
function skyAtHours(hours, out) {
  if (!isHome()) return syntheticSky(hours, vibe.moonPhase, out);
  const ms = Date.now();
  const ahead = ((hours - homeHoursNow(ms) + 36) % 24) - 12;
  return realSky(new Date(ms + ahead * 3600000), place, out);
}

// After a flight the sun and moon swing over from the last land's moment to
// this one's, instead of the sky cutting from noon to midnight.
const glide = { from: newSkyState(), k: 1 };
const glideArc = new THREE.Quaternion();
const glideStep = new THREE.Quaternion();

function updateSkyState(dt) {
  const out = isHome() && timeOverride === null
    ? realSky(new Date(), place, skyState)
    : skyAtHours(landHours(), skyState);
  if (glide.k >= 1) return out;
  glide.k = Math.min(glide.k + dt / 2.6, 1);
  const e = smoothstep(0, 1, glide.k);
  for (const name of ['sunDir', 'moonDir']) {
    glideArc.setFromUnitVectors(glide.from[name], out[name]);
    out[name].copy(glide.from[name]).applyQuaternion(glideStep.identity().slerp(glideArc, e));
  }
  return out;
}

function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [o.material].flat()) m?.dispose();
    // Instanced meshes keep their matrices and colors in buffers of their own.
    o.dispose?.();
  });
}

// Moving on: the land on screen sinks into the clouds, and only once it's out
// of sight is the next one grown, so the hitch of generating it only ever
// holds up a view of sky. `land` and `seed` stay the land you can see.
// On a voyage it's a flight: Wa's balloon casts off and rides above while the
// islands change, the land sinks a little slower so you see it go, and the
// view swings round as if following the balloon (see flightSwing).
const SINK = 1.1, VOYAGE_SINK = 1.4, RISE = 1.6;
let leaving = null; // { next, age, sink, y, scale, turn } while the land on screen sinks away
let rise = 0; // seconds the land on screen has been rising; below 0 it waits
let flight = false; // the change of land under way is a voyage's flight

function visit(next) {
  if (next === (leaving?.next ?? seed)) return;
  mazeBall.stop();
  if (zoomedIn()) focusOn(null);
  flight = voyage.active;
  if (!flight) waBalloon.leave();
  else if (waBalloon.castOff()) sound.play('whoosh');
  if (!land || reducedMotion) return arrive(next);
  // Picked again mid-flight: only the last pick gets grown.
  if (leaving) leaving.next = next;
  else leaving = { next, age: 0, sink: flight ? VOYAGE_SINK : SINK, y: land.group.position.y, scale: land.group.scale.x, turn: land.group.rotation.y };
}

// How hard a voyage's flight is swinging the view round: in as the land
// sinks, out as the next one settles.
function flightSwing() {
  if (!flight) return 0;
  if (leaving) return smoothstep(0, 0.5, leaving.age);
  if (rise >= RISE) flight = false;
  return 1 - smoothstep(0.4, RISE, rise);
}

function arrive(next) {
  const flying = Boolean(land) && !reducedMotion;
  if (land) {
    scene.remove(land.group);
    dispose(land.group);
  }
  leaving = null;
  seed = next;
  admin = voyage.active ? null : adminLand(seed);
  const grown = admin ? admin.word : seed;
  land = generateLand(grown, voyage.landOptions(seed) ?? admin?.want);
  land.setDetail(QUALITY[quality].grass);
  land.hooks.sound = (kind) => sound.play(kind);
  land.hooks.note = (kind) => {
    journal.note(kind);
    voyage.note(kind);
  };
  // The hedge maze's fountain starts its ball game.
  land.hooks.play = (game) => {
    if (game === 'maze' && !leaving && !photo.on) {
      if (zoomedIn()) focusOn(null);
      mazeBall.start(land);
      controls.enabled = false;
      document.body.classList.add('maze-playing');
    }
  };
  scene.add(land.group);
  if (voyage.active) waBalloon.moorTo(land, { snap: !flying });
  vibe = voyage.vibe(seed, land) ?? (isHome() ? null : landVibe(grown, land.biome));
  // Every land arrives in its own time and weather; picks from the panel don't
  // follow you. (An admin link can set them.)
  weatherOverride = admin?.weather ?? null;
  timeOverride = admin?.hour ?? null;
  setTimelapse(false);
  // A new land arrives with its weather already settled on the ground; after
  // a flight the sky still blends over from the last one.
  applyWeather(flying ? 'settle' : 'instant');
  if (flying) {
    glide.from.sunDir.copy(skyState.sunDir);
    glide.from.moonDir.copy(skyState.moonDir);
    glide.k = 0;
  }
  // The clock skips the time spent growing it, and the rise waits out one
  // (clamped) frame, as its first frame is slow too (it all goes up to the
  // GPU): either way it rises from nothing rather than leaping ahead.
  clock.getDelta();
  bornAt = vibeStart = clock.elapsedTime;
  rise = -0.05;
  perf.settleUntil = performance.now() + 3000;
  // On a voyage, an island is called what you said (as the sky heard it).
  const name = voyage.active ? voyage.word().replace(/^./, (c) => c.toUpperCase()) : land.name;
  $('#land-name').textContent = name;
  const rarity = landRarity(land);
  // A voyage's words can put landmarks where the generator never would, so
  // rarity (counted from free lands) doesn't apply there.
  // The Edge of the Sky is always one of the legendary ones.
  if (voyage.finale) $('#land-meta').replaceChildren(`${t('the Edge of the Sky')} · ${t(land.biome.label)} · `, tierTag({ tier: 'legendary' }));
  else if (voyage.active) $('#land-meta').textContent = t(land.biome.label);
  else if (admin) $('#land-meta').textContent = admin.asked ? `${t(land.biome.label)} · #${admin.word} · admin` : ADMIN_HELP;
  else {
    $('#land-meta').replaceChildren(`${t(land.biome.label)} · #${seed} · `, tierTag(rarity));
    explainRarity(rarity);
  }
  if (!admin) journal.visit(land, seed, rarity, voyage.active);
  document.title = isHome() ? 'PaCaLand' : `${name} · PaCaLand`;
  renderChips();
  voyage.arrived(land, seed);
}

const pad = (n) => String(n).padStart(2, '0');
const formatHours = (h) => `${pad(Math.floor(h) % 24)}:${pad(Math.floor((h % 1) * 60))}`;
const fahrenheit = /^en-US/.test(navigator.language);
const formatTemp = (c) => (fahrenheit ? `${Math.round(c * 1.8 + 32)}°F` : `${Math.round(c)}°C`);

function phaseName(e, hours) {
  if (e < -0.12) return t('night');
  if (e < 0) return hours < 12 ? t('dawn') : t('dusk');
  if (e < 0.18) return hours < 12 ? t('sunrise') : t('golden hour');
  return hours < 11 ? t('morning') : hours < 15 ? t('midday') : t('afternoon');
}

function conditionsText(hours, env) {
  const weather = weatherOverride ?? naturalWeather();
  const parts = [];
  if (voyage.active) parts.push(formatHours(hours));
  else if (timeOverride !== null) parts.push(t('{time} (scrubbed)', { time: formatHours(hours) }));
  else if (isHome()) parts.push(place.label === 'your sky' ? t('{time} your time', { time: formatHours(hours) }) : t('{time} in {place}', { time: formatHours(hours), place: place.label }));
  else parts.push(t('{time} here', { time: formatHours(hours) }));
  parts.push(phaseName(env.e, hours));
  parts.push(t(WEATHERS[weather].label));
  if (isHome() && live && !weatherOverride) parts.push(t('{temp}, live', { temp: formatTemp(live.temperature) }));
  return parts.join(' · ');
}

// --- UI ---------------------------------------------------------------

const input = $('#seed-input');
$('#visit').addEventListener('submit', (event) => {
  event.preventDefault();
  // On a voyage, the word is where you fly next.
  if (voyage.active) {
    if (voyage.submit(input.value)) input.blur();
    return;
  }
  const value = input.value.trim().toLowerCase();
  if (!value) return;
  location.hash = encodeURIComponent(value);
  input.value = '';
  input.blur();
});
input.addEventListener('input', () => voyage.preview(input.value));
$('#dice').addEventListener('click', () => {
  // A voyage's words are yours to choose (the dice are hidden then, too).
  if (voyage.active) return;
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
// Why a land is as rare as it is: hover its tier (or tap it on a phone).
const why = $('#rarity-why');
function explainRarity(rarity) {
  const tag = $('#land-meta .tier');
  tag.removeAttribute('title');
  why.hidden = true;
  why.replaceChildren(...[t('rarer than {n}% of lands. it has:', { n: rarity.rarerThan }), ...rarity.reasons].map((text) => Object.assign(document.createElement('p'), { textContent: text })));
  tag.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') why.hidden = false;
  });
  tag.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') why.hidden = true;
  });
  tag.addEventListener('click', () => {
    if (lowPower) why.hidden = !why.hidden;
  });
}

// One panel at a time: time & weather, or the journal.
function setPanel(open) {
  $('#panel').hidden = !open;
  $('#tweak').setAttribute('aria-expanded', String(open));
}
$('#tweak').addEventListener('click', () => {
  journal.toggle(false);
  setPanel($('#panel').hidden);
});

// What you've found across lands, and badges (see journal.js).
const journal = createJournal({
  button: $('#journal-button'), panel: $('#journal'), toasts: $('#toasts'),
  onGo: (next) => {
    journal.toggle(false);
    location.hash = next === HOME ? '' : encodeURIComponent(next);
  },
});
journal.restore();
$('#journal-button').addEventListener('click', () => {
  // On a voyage, the book is the sky's language instead.
  if (voyage.active) return voyage.toggleBook();
  setPanel(false);
  journal.toggle();
});

// A voyage to the Edge of the Sky, where every destination is a word (see voyage.js).
// The hedge maze's ball game (mazeball.js): it borrows the camera while it plays.
const mazeBall = createMazeBall({
  onWin: () => {
    sound.play('chime');
    voyage.mazeWon();
  },
  onEnd: () => {
    controls.enabled = true;
    document.body.classList.remove('maze-playing');
    idleSince = performance.now();
  },
});

const voyage = createVoyage({
  fly: (next) => visit(next),
  // Back to the land in the address bar.
  leave: () => visit(readSeed()),
  // Hours spent on a voyage swing the sun over rather than jumping it (but a
  // voyage picked up before the first frame has no sky yet to swing from).
  setClock: (hours) => {
    if (skyState.sunDir.lengthSq() > 0) {
      glide.from.sunDir.copy(skyState.sunDir);
      glide.from.moonDir.copy(skyState.moonDir);
      glide.k = 0;
    }
    timeOverride = hours;
  },
  clearStorm: () => {
    weatherOverride = 'cloudy';
    applyWeather('fade');
  },
  toast: (emoji, text) => showToast($('#toasts'), emoji, text),
});

// 中文 / English. Switching reloads the page (the words are read once, as it
// loads); a voyage under way is picked up again where it was.
const langButton = $('#lang');
langButton.textContent = lang === 'zh' ? 'English' : '中文';
langButton.addEventListener('click', () => {
  try {
    if (voyage.active) sessionStorage.setItem('paca-resume', '1');
  } catch {}
  setLang(lang === 'zh' ? 'en' : 'zh');
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
// The button stays lit while it runs; tap it again to stop right where it
// is ("live" goes back to the land's own time).
let timelapse = null;
const timelapseButton = $('#timelapse');
function setTimelapse(on) {
  timelapse = on ? { start: clock.elapsedTime, from: landHours() } : null;
  timelapseButton.setAttribute('aria-pressed', String(on));
  timelapseButton.textContent = on ? t('stop time lapse') : t('time lapse');
}
timelapseButton.addEventListener('click', () => setTimelapse(!timelapse));
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
// A remembered "on" waits for the first tap or key, and comes back the same way
// after a phone pauses it (a call, another app). A touch only counts once the
// finger lifts, so pointerdown never could start it on a phone.
for (const type of ['pointerup', 'touchend', 'keydown']) {
  addEventListener(type, (event) => {
    if (soundWanted && !sound.on && !event.target.closest?.('#sound')) setSound(true);
  });
}

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
    journal.count('photos');
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
  const natural = t(WEATHERS[naturalWeather()].label);
  chipRow($('#weather-chips'), [
    [null, isHome() && live ? t('live ({weather})', { weather: natural }) : t('natural ({weather})', { weather: natural })],
    ...Object.entries(WEATHERS).map(([name, w]) => [name, t(w.label)]),
  ], weatherOverride, (name) => {
    weatherOverride = name;
    applyWeather(false);
    renderChips();
  });
  chipRow($('#quality-chips'), [
    ['auto', t('auto ({quality})', { quality: t(QUALITY[quality].label) })],
    ...QUALITY.map((q, i) => [i, t(q.label)]),
  ], qualityMode, (mode) => {
    qualityMode = mode;
    if (mode !== 'auto') quality = mode;
    else quality = startQuality;
    applyQuality();
  });
}

// On a voyage the address bar isn't the way to travel.
addEventListener('hashchange', () => {
  if (!voyage.active) visit(readSeed());
});

function readSeed() {
  let raw = '';
  try {
    raw = decodeURIComponent(location.hash.slice(1));
  } catch {
    raw = location.hash.slice(1);
  }
  const word = raw.trim().toLowerCase();
  // An admin link can be long; any other word is cut at 40 letters, as it always was.
  return word.slice(0, word.startsWith(ADMIN) ? 160 : 40) || HOME;
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
// The layout viewport, not innerWidth/innerHeight: on iOS those shrink when the
// page itself gets pinch-zoomed, and sizing the canvas to them shrank the land.
const viewport = () => [document.documentElement.clientWidth, document.documentElement.clientHeight];
function sizeRenderer() {
  const [w, h] = viewport();
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
  camera.clearViewOffset();
  frame.applied = 0;
  camera.updateProjectionMatrix();
  // Phones give the word box a row of its own (main.css), so only the narrowest need the short one.
  // (A voyage keeps its own placeholder.)
  if (!voyage.active) input.placeholder = w < 360 ? t('Name a land…') : t('Type any word to grow a land');
  return true;
}

// Far enough back that the whole land fits across narrow screens too. On a
// phone held upright the island itself spans the width, letting the islets
// around it go off the edges, or it looked lost in a tall column of sky.
const fitDistance = () => Math.max(34, (camera.aspect < 0.8 ? 32 : 38) / camera.aspect);

let fitted = 0; // the distance the view was last fitted at
// Looking closer than the whole land: zoomed in, or circling something off-center.
const zoomedIn = () => camera.position.distanceTo(controls.target) < fitted * 0.9 || controls.target.distanceTo(HOME_TARGET) > 0.5;

function resize() {
  if (!sizeRenderer() || intro || zoomedIn()) return;
  const offset = camera.position.clone().sub(controls.target);
  fitted = fitDistance();
  camera.position.copy(controls.target).add(offset.setLength(fitted));
}

// Double-click (or double-tap) steps in toward a spot, like a map; double-click
// the sky to pull back out to the whole land.
const focus = { from: new THREE.Vector3(), to: new THREE.Vector3(), fromDist: 0, toDist: 0, start: -1 };
function focusOn(point) {
  focus.from.copy(controls.target);
  focus.to.copy(point ?? HOME_TARGET);
  focus.fromDist = camera.position.distanceTo(controls.target);
  focus.toDist = point ? Math.max(controls.minDistance + 1, Math.min(focus.fromDist * 0.45, 16)) : fitDistance();
  if (!point) fitted = focus.toDist;
  focus.start = clock.elapsedTime;
}

// Up close, the camera circles whatever you zoomed toward; as you pull back
// out, that spot drifts home, so from afar it always circles the whole land.
const drift = new THREE.Vector3();
function keepNearHome(dt) {
  const fit = fitDistance();
  const room = 11 * smoothstep(fit, fit * 0.55, camera.position.distanceTo(controls.target));
  drift.copy(controls.target).sub(HOME_TARGET);
  const over = drift.length() - room;
  if (over <= 0.001) return;
  // The camera slides along with it, so the view pans home rather than swinging.
  drift.setLength(over * Math.min(1, dt * 8));
  controls.target.sub(drift);
  camera.position.sub(drift);
}
// On a phone the title and gauges above and the controls and cards below take
// much of the screen, and the land hid behind them: shift the view so the land
// sits in the middle of the sky that's left.
const hudTop = document.querySelector('.hud-top');
const hudBottom = document.querySelector('.hud-bottom');
const frame = { lift: 0, applied: 0 };
function frameBetweenHud(dt) {
  const { w, h } = size;
  let aim = 0;
  if (!photo.on && (w < 700 || h < 500)) {
    let top = 0, bottom = h;
    if (hudTop.getClientRects().length) top = hudTop.getBoundingClientRect().bottom;
    for (const node of hudBottom.children) {
      // Toasts come and go; they shouldn't make the land bob.
      if (node.classList.contains('toasts') || !node.getClientRects().length) continue;
      bottom = Math.min(bottom, node.getBoundingClientRect().top);
    }
    aim = THREE.MathUtils.clamp((top + bottom) / 2 - h / 2, -0.12 * h, 0.12 * h);
  }
  frame.lift += (aim - frame.lift) * Math.min(1, dt * 3);
  if (Math.abs(frame.lift - frame.applied) < 0.5) return;
  frame.applied = frame.lift;
  if (Math.abs(frame.lift) < 0.5) camera.clearViewOffset();
  else camera.setViewOffset(w, h, 0, -frame.lift, w, h);
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

// The first visit opens high over a ring of clouds, looking out across them,
// then tilts down and spirals in through them to the usual view while the
// land rises to meet it, and the clouds part. Any touch, drag or scroll hands
// the camera straight back. The orbit target never moves (the tilt is laid on
// after the controls), so wherever the flight is cut short the controls carry
// on from a sound orbit.
const INTRO = 3.8, TILT = 0.25;
let intro = null; // { age, from: Spherical, to: Spherical }
let tilt = 0; // radians the view looks up from the target
const introAt = new THREE.Spherical();
function startIntro() {
  const to = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const from = new THREE.Spherical(Math.min(fitDistance() * 2.6, controls.maxDistance - 2), 1.0, to.theta - 1.9);
  intro = { age: 0, from, to };
  sky.setVeil(18);
  // The land waits a moment below the clouds before it rises.
  rise = -0.9;
  updateIntro(0);
}
function updateIntro(dt) {
  if (!intro) {
    // Done or cut short: let the view settle back onto the land rather than snap.
    tilt = tilt > 0.001 ? tilt * Math.exp(-dt * 7) : 0;
    sky.setVeil(0);
    return;
  }
  intro.age += dt;
  const k = Math.min(intro.age / INTRO, 1);
  // Eases in briefly, then a long, soft landing.
  const e = 1 - (1 - smoothstep(0, 1, k ** 0.8)) ** 2;
  const { from, to } = intro;
  introAt.set(THREE.MathUtils.lerp(from.radius, fitDistance(), e), THREE.MathUtils.lerp(from.phi, to.phi, e), THREE.MathUtils.lerp(from.theta, to.theta, e));
  camera.position.setFromSpherical(introAt).add(controls.target);
  tilt = TILT * (1 - e) ** 2;
  // Halfway down, the extra clouds start to drift apart.
  if (k > 0.45) sky.setVeil(0);
  if (k >= 1) intro = null;
}
for (const type of ['pointerdown', 'wheel']) {
  addEventListener(type, () => (intro = null), { passive: true });
}
// iOS pinch-zooms the whole page when a finger lands on the bar or a card, and
// stays zoomed; the land has its own pinch, so the page never zooms.
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, (event) => event.preventDefault());
}

// The camera drifts around the land, pausing for a while whenever you take over.
let idleSince = -Infinity;
controls.addEventListener('start', () => {
  idleSince = Infinity;
  // A pinch or drag takes over from a double-tap's glide rather than fighting it.
  focus.start = -1;
});
controls.addEventListener('end', () => {
  idleSince = performance.now();
});

// Two things worth knowing, one after the other, then out of the way (or gone at the first tap).
const hint = $('#hint');
if (lowPower) hint.textContent = t('Tap trees, water and buildings · double-tap to look closer');
let hintDismissed = false;
function dismissHint() {
  hintDismissed = true;
  hint.classList.add('gone');
}
setTimeout(() => {
  if (hintDismissed) return;
  hint.classList.add('gone');
  setTimeout(() => {
    if (hintDismissed) return;
    hint.textContent = t('Drag the sun or moon to change the time');
    hint.classList.remove('gone');
  }, 1200);
}, 7000);
setTimeout(dismissHint, 14000);

const interaction = createInteraction(renderer.domElement, camera, () => (leaving ? [] : [...(land?.clickables ?? []), ...waBalloon.clickables]), {
  onClick: (picked, event) => {
    voyage.tapped(event);
    idleSince = performance.now();
    dismissHint();
    why.hidden = true;
  },
  onDoubleClick: (picked) => focusOn(picked ? picked.hit.point : null),
});

// Grab the sun (or the moon) and drag it to set the time.
const skyGrab = createSkyGrab(renderer.domElement, camera, {
  sky, state: skyState, skyAt: skyAtHours, hours: landHours, label: formatHours,
  // On a voyage, time is part of the game.
  enabled: () => !voyage.active,
  onGrab: () => {
    // Holding the sun takes over from the opening flight and from a sky still swinging over
    // (the grab stops the pointerdown that would otherwise end the flight).
    intro = null;
    glide.k = 1;
    setTimelapse(false);
    idleSince = Infinity;
    dismissHint();
  },
  onDrag: (hours) => {
    // How far the sun moved, either way around the clock (the sundial badge).
    journal.count('sunHours', Math.abs(((hours - landHours() + 36) % 24) - 12));
    timeOverride = hours;
    timeSlider.value = hours.toFixed(2);
    $('#time-out').textContent = formatHours(hours);
  },
  onRelease: () => {
    idleSince = performance.now();
  },
});

addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.documentElement);
applyQuality();
resize();
let resuming = false;
try {
  resuming = sessionStorage.getItem('paca-resume') === '1';
  sessionStorage.removeItem('paca-resume');
} catch {}
if (!(resuming && voyage.pickUp())) visit(readSeed());
if (!reducedMotion) startIntro();
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

// three asks for the next frame only after this one returns, so a single
// exception would freeze the land for good. Log the first one and carry on.
let frameFailed = false;
renderer.setAnimationLoop(() => {
  try {
    renderFrame();
  } catch (error) {
    if (!frameFailed) console.error(error);
    frameFailed = true;
  }
});

function renderFrame() {
  const nowMs = performance.now();
  watchPerformance((nowMs - lastFrame) / 1000);
  lastFrame = nowMs;
  // Some viewport changes (devtools, embedded previews) never fire a resize event.
  const [vw, vh] = viewport();
  if (vw !== size.w || vh !== size.h) resize();

  const dt = Math.min(clock.getDelta(), 0.05);
  // Once the old land has sunk out of sight, grow the next one in its place.
  if (!leaving) rise += dt;
  else if ((leaving.age += dt) >= leaving.sink) arrive(leaving.next);
  const t = clock.elapsedTime;
  updateTimelapse();
  const env = sky.update(updateSkyState(dt), dt, t, camera);
  env.relit = voyage.relit; // Wa's lantern at the Edge
  // Eyes adjust to the dark a little; lightning flashes overexpose for an instant.
  renderer.toneMappingExposure = (1 + env.night * 0.9 + env.flash * 0.4) * (photo.on ? 2 ** photo.exposure : 1);
  fxUniforms.uTime.value = t;
  fxUniforms.uCloudShadow.value = (0.15 + env.overcast * 0.4) * (1 - env.night * 0.7) * (1 - env.mist * 0.5);
  fxUniforms.uWindStrength.value = env.wind;
  fxUniforms.uWet.value = env.wet;
  fxUniforms.uSnow.value = env.snowCover;
  fxUniforms.uRain.value = env.rain;
  land.update(t, dt, env);
  if (!admin) journal.watch(env, skyState, land);
  voyage.update(env);

  // New lands grow up out of the clouds; old ones spin on down into them,
  // from wherever they were, even halfway up.
  const grow = easeOutBack(THREE.MathUtils.clamp(rise / RISE, 0, 1));
  if (leaving) {
    const k = Math.min(leaving.age / leaving.sink, 1);
    const fall = k * k;
    land.group.scale.setScalar(Math.max(leaving.scale * (1 - 0.92 * fall), 0.001));
    land.group.position.y = leaving.y - 22 * fall;
    land.group.rotation.y = leaving.turn - 0.8 * fall;
  } else {
    land.group.scale.setScalar(Math.max(grow, 0.001));
    land.group.position.y = (1 - grow) * -5;
    land.group.rotation.y = (1 - grow) * 0.9;
  }
  waBalloon.update(t, dt, voyage.gear(), leaving ? 0 : THREE.MathUtils.clamp(rise / RISE, 0, 1), camera.aspect < 0.8);
  // The title follows the land: gone while it's away, back as it rises.
  document.body.classList.toggle('in-flight', Boolean(leaving) || rise < 0);

  // Aurora needs a cold place: a snowy or high land, fresh snow, or a freezing night at home.
  sky.setCold(['snowfield', 'highlands', 'icefall'].includes(land.biomeKey) || env.snowCover > 0.5 || (isHome() && live?.temperature < 1) || voyage.finale);
  sky.setShower(voyage.finale);
  updateIntro(dt);
  updateFocus(t);
  frameBetweenHud(dt);
  // The usual slow drift once you've let go, and a voyage's flight swings it
  // round faster (unless you're holding the view).
  const swing = flightSwing();
  controls.autoRotate = !intro && !reducedMotion && !photo.on && !mazeBall.active && (nowMs - idleSince > 8000 || (swing > 0 && idleSince !== Infinity));
  controls.autoRotateSpeed = 0.35 + swing * 2.6;
  // The maze game eases the camera round to look down on the maze.
  const mazeView = mazeBall.update(dt, camera);
  if (mazeView) {
    const k = 1 - Math.exp(-dt * 3);
    controls.target.lerp(mazeView.target, k);
    camera.position.lerp(mazeView.position, k);
  }
  controls.update(dt);
  // Photo mode pans freely; a glide sets its own course (and so does the maze game).
  if (!photo.on && focus.start < 0 && !mazeBall.active) keepNearHome(dt);
  if (tilt) camera.rotateX(tilt);
  interaction.update();
  skyGrab.update(dt);
  aimShafts(env);
  focusPoint.copy(controls.target).add(new THREE.Vector3(0, camera.position.distanceTo(controls.target) * 0.065, 0)).project(camera);
  finish.uniforms.uFocusY.value = focusPoint.y * 0.5 + 0.5;
  finish.uniforms.uBlur.value = (photo.on ? photo.blur : QUALITY[quality].tilt ? 5 : 0) * renderer.getPixelRatio();
  finish.uniforms.uTime.value = t;
  finish.uniforms.uRainLens.value = env.rain * 0.85;
  const mirrored = QUALITY[quality].reflect && land.water && !leaving && grow >= 1 && reflection.render(scene, camera, land.waterLevel(), land.mirrorHide);
  fxUniforms.uReflectOn.value = mirrored ? 1 : 0;
  composer.render(dt);
  sound.update(env, land.sounds, dt);

  // Twice a second, and straight away for a land that has just arrived.
  if (t - lastLabel > 0.5 || lastLabel < bornAt) {
    lastLabel = t;
    const hours = landHours();
    $('#conditions').textContent = conditionsText(hours, env);
    $('#time-out').textContent = formatHours(hours);
    if (timeOverride === null) timeSlider.value = hours.toFixed(2);
    $('#live').disabled = timeOverride === null;
    document.body.classList.toggle('is-day', env.e > 0.06 && env.overcast < 0.6);
  }
}
