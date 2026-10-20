import * as THREE from 'three';
import { t } from './i18n.js';
import { softDot } from './sky.js';

// The little games, started by tapping their things on a land (playthings.js and
// the dock): skipping stones across the lake, fishing off the dock, catching
// fireflies at night, flying a kite. Like the maze game (mazeball.js), each one
// borrows the camera while it plays and takes the taps on the land for itself.
// What a game is worth on a voyage is the voyage's business (`stakes`, `onPlayed`).

const BEST = 'paca-games'; // personal bests, kept in this browser
const HOLD = 2200; // ms the last line stays up after a game ends
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const ease = (s) => s * s * (3 - 2 * s);

// Each game: what it says, and how it plays (see the makers below).
const GAMES = {
  stones: { icon: '🪨', make: makeStones },
  fish: { icon: '🎣', make: makeFish },
  fireflies: { icon: '✨', make: makeFireflies },
  kite: { icon: '🪁', make: makeKite },
};

// `camera` is the view's camera; `stakes(kind)` says what playing is worth right now (a voyage), or nothing;
// `onPlayed(kind, score)` when a game ends with a score; `onLeft(kind)` when it's closed
// before the first throw, cast or tick of the clock (it doesn't count); `onEnd()` when it closes;
// `sound(kind)` plays a noise; `say(icon, text)` shows a toast.
export function createGames({ canvas, camera, stakes, onPlayed, onLeft, onEnd, sound, say }) {
  let game = null;
  let env = null; // the sky as last seen, so a game can ask if it's night
  const held = new Set();
  const tilt = { x: 0, base: null };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const ui = document.createElement('div');
  ui.className = 'maze-ui game-ui';
  ui.hidden = true;
  const text = document.createElement('div');
  text.className = 'game-text';
  const line = document.createElement('p');
  const small = document.createElement('p');
  small.className = 'game-stakes';
  text.append(line, small);
  const score = document.createElement('span');
  score.className = 'game-score';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'maze-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', t('stop playing'));
  close.addEventListener('click', () => stop());
  ui.append(text, score, close);
  // Just above the bar, in the bottom stack.
  const stack = document.querySelector('.hud-bottom');
  if (stack) stack.insertBefore(ui, stack.querySelector('.bar'));
  else document.body.append(ui);

  const bests = (() => {
    try {
      return JSON.parse(localStorage.getItem(BEST)) ?? {};
    } catch {
      return {};
    }
  })();

  // Taps and drags on the land go to the game while it plays (in the capture
  // phase, ahead of the camera and the land's own taps).
  const where = (event) => ({ x: event.clientX, y: event.clientY, t: performance.now(), touch: event.pointerType === 'touch', rect: canvas.getBoundingClientRect() });
  for (const [type, call] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'up']]) {
    addEventListener(type, (event) => {
      if (!game || event.target !== canvas) return;
      event.stopPropagation();
      // (Keep the pointer's moves and lift even if it wanders over the buttons.)
      if (type === 'pointerdown') {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {}
      }
      if (!game.ended) game.play[call]?.(where(event), type === 'pointercancel');
    }, true);
  }
  // (Keys typed into a text box, like a voyage's word, are the box's.)
  const typing = (event) => Boolean(event.target.closest?.('input, textarea, [contenteditable]'));
  addEventListener('keydown', (event) => {
    if (!game || typing(event)) return;
    if (event.code === 'Escape') return stop();
    held.add(event.code);
    if (!game.ended && game.play.key?.(event.code)) event.preventDefault();
  });
  addEventListener('keyup', (event) => held.delete(event.code));
  addEventListener('blur', () => held.clear());
  // The phone's tilt from where it was held when the game began (the kite steers by it).
  addEventListener('deviceorientation', (event) => {
    if (!game || event.gamma == null || event.beta == null) return;
    tilt.base ??= { beta: event.beta, gamma: event.gamma };
    const x = clamp((event.gamma - tilt.base.gamma) / 20, -1, 1);
    const y = clamp(-(event.beta - tilt.base.beta) / 20, -1, 1);
    const a = ((screen.orientation?.angle ?? 0) * Math.PI) / 180;
    tilt.x = x * Math.cos(a) + y * Math.sin(a);
  });

  // What a game can use: the land, the camera, the screen, and the ways to talk.
  function kit(kind, land) {
    const touch = matchMedia('(pointer: coarse)').matches;
    return {
      land, touch, held, tilt, sound,
      thing: land.games[kind],
      group: land.group,
      fx: land.fx,
      best: bests[kind] ?? 0,
      camera,
      get env() {
        return env;
      },
      get ended() {
        return Boolean(game?.ended);
      },
      // Under way: from here, closing the game still counts as having played it.
      begin() {
        game.begun = true;
      },
      say(text) {
        line.textContent = text;
      },
      score(text) {
        score.textContent = text;
        score.hidden = !text;
      },
      // The pointer's ray, in the land's own frame.
      ray(p) {
        ndc.set(((p.x - p.rect.left) / p.rect.width) * 2 - 1, -((p.y - p.rect.top) / p.rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return raycaster.ray.clone().applyMatrix4(new THREE.Matrix4().copy(land.group.matrixWorld).invert());
      },
      // Where a point in the land's frame is on screen, in pixels.
      screen(local, rect = canvas.getBoundingClientRect()) {
        const v = land.group.localToWorld(local.clone()).project(camera);
        return { x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (0.5 - v.y * 0.5) * rect.height, behind: v.z > 1 };
      },
      // Looking at `centre` from the side `from` points to, far enough back that
      // `across` (to each side) and `tall` (up and down) fit on screen.
      view(centre, from, across, tall) {
        const s = land.group.scale.x;
        const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
        const hf = Math.atan(Math.tan(vf) * camera.aspect);
        const back = Math.max(across / Math.tan(hf), tall / Math.tan(vf)) * s * 1.1;
        const target = land.group.localToWorld(centre.clone());
        const dir = from.clone().normalize().transformDirection(land.group.matrixWorld);
        return { target, position: target.clone().addScaledVector(dir, back) };
      },
      // The game is over: show how it went and keep the best.
      finish(points, text) {
        if (game.ended) return;
        game.ended = performance.now();
        const before = bests[kind] ?? 0;
        if (points > before) {
          bests[kind] = points;
          try {
            localStorage.setItem(BEST, JSON.stringify(bests));
          } catch {}
        }
        line.textContent = text;
        if (!game.stakes && before && points > before) small.textContent = t('a new best!');
        onPlayed?.(kind, points);
      },
    };
  }

  // Start `kind` on `land`; false if it can't start (say, fireflies by day).
  function start(kind, land) {
    if (game || !GAMES[kind] || !land.games?.[kind]) return false;
    if (kind === 'fireflies' && (env?.night ?? 0) < 0.45) {
      say?.('✨', t('The fireflies come out after dark.'));
      return false;
    }
    // iPhones ask once before telling a page how the phone is tilted (it must come from a tap).
    if (kind === 'kite') window.DeviceOrientationEvent?.requestPermission?.().catch(() => {});
    tilt.base = null;
    tilt.x = 0;
    held.clear();
    game = { kind, land, ended: 0, stakes: stakes?.(kind) ?? null };
    small.textContent = game.stakes ?? (bests[kind] ? t('your best: {n}', { n: bests[kind] }) : '');
    small.hidden = !small.textContent;
    score.textContent = '';
    game.play = GAMES[kind].make(kit(kind, land));
    ui.hidden = false;
    return true;
  }

  function stop() {
    if (!game) return;
    if (!game.ended && !game.begun) onLeft?.(game.kind);
    game.play.dispose?.();
    game = null;
    held.clear();
    ui.hidden = true;
    onEnd?.();
  }

  // Each frame: play, and say where the camera should look from.
  function update(dt, sky) {
    env = sky;
    if (!game) return null;
    if (game.ended && performance.now() - game.ended > HOLD) {
      stop();
      return null;
    }
    return game.play.update(Math.min(dt, 0.05), sky) ?? null;
  }

  return {
    get active() {
      return Boolean(game);
    },
    start,
    stop,
    update,
  };
}

// --- Skipping stones --------------------------------------------------------
// Flick up the screen: how fast decides how far each skip goes and how many there
// are (too soft and it sinks, too hard and it digs in), and which way decides
// whether the stone stays over the water or runs ashore. Three stones, the best counts.

const STONES = 3;
const IDEAL = 0.9; // the throw (flick speed, in screen heights a second, over 1.8) that skips best

function makeStones(g) {
  const { thing, fx, group } = g;
  const spot = thing.spot;
  const aim = new THREE.Vector3(Math.cos(spot.aim), 0, Math.sin(spot.aim));
  const hand = new THREE.Vector3(spot.x, fx.ground(spot.x, spot.z) + 0.45, spot.z).addScaledVector(aim, 0.1);
  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.08, 0).scale(1, 0.34, 0.8),
    new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 0.85, flatShading: true }),
  );
  stone.castShadow = true;
  stone.visible = false;
  group.add(stone);
  let left = STONES, best = 0, drag = null, flight = null, rest = 0;
  thing.show(left);
  g.say(g.touch ? t('Skip a stone across the lake: flick it up the screen.') : t('Skip a stone across the lake: drag up and let go, quickly.'));
  const tally = () => g.score(`🪨 ${'●'.repeat(left)}${'○'.repeat(STONES - left)}`);
  tally();

  // How far a straight line from `from` toward `dir` runs before it meets the lake.
  function toWater(from, dir) {
    for (let d = 0; d < 4; d += 0.05) if (fx.onLake(from.x + dir.x * d, from.z + dir.z * d)) return d;
    return null;
  }

  // Work out the whole throw at once: where each bounce lands, until it sinks or runs ashore.
  function plan(power, turn) {
    const yaw = spot.aim + turn;
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const near = toWater(hand, dir);
    const water = fx.surface();
    const sweet = Math.exp(-(((power - IDEAL) / 0.3) ** 2));
    const skips = Math.round(13 * sweet * (0.78 + Math.random() * 0.3));
    const first = (spot.run * 0.17 * clamp(power, 0.5, 1.4)) / IDEAL;
    const hops = [];
    let from = hand.clone();
    // The first flight: over the shallows to wherever it meets the water.
    let reach = (near ?? 1) + first * 0.6;
    let length = first, count = 0;
    for (let i = 0; i <= skips; i++) {
      const to = hand.clone().addScaledVector(dir, reach);
      to.y = water;
      const wet = fx.onLake(to.x, to.z);
      if (!wet) to.y = fx.ground(to.x, to.z) + 0.02;
      const span = from.distanceTo(to);
      hops.push({ from, to, time: 0.16 + 0.3 * Math.sqrt(span), high: i ? 0.05 + span * 0.16 : 0.25, wet, last: !wet || i === skips });
      if (!wet) break;
      if (i < skips) count++;
      from = to;
      reach += length;
      length *= 0.85;
    }
    return { hops, skips: count, power, at: 0, hop: 0 };
  }

  function touchDown() {
    const hop = flight.hops[flight.hop];
    const at = hop.to;
    if (hop.wet) {
      fx.ripple(at.x, at.z, hop.last ? 1.4 : 0.8);
      fx.burst(at, { count: hop.last ? 14 : 7, colors: ['#e8f6ff', '#ffffff'], speed: 0.4, up: hop.last ? 2 : 1.3, gravity: -9, life: 0.5, drag: 0.4 });
      g.sound(hop.last ? 'splash' : 'pop');
    } else {
      fx.burst(at, { count: 8, colors: ['#8a857c', '#c9b48a'], speed: 0.4, up: 0.6, gravity: -6, life: 0.6 });
      g.sound('chips');
    }
    if (!hop.last) return;
    // How it went.
    const n = flight.skips;
    best = Math.max(best, n);
    tally();
    const how = flight.power < IDEAL - 0.28 ? t('too soft') : flight.power > IDEAL + 0.3 ? t('too hard') : '';
    const said = n === 1 ? t('1 skip') : t('{n} skips', { n });
    const where = hop.wet ? '' : t('ashore');
    g.say([said, how, where].filter(Boolean).join(' · '));
    stone.visible = hop.wet ? false : stone.visible;
    flight = null;
    rest = left ? 1.1 : 0.9;
  }

  return {
    down(p) {
      if (flight || !left) return;
      drag = [p];
    },
    move(p) {
      if (!drag) return;
      drag.push(p);
      while (drag.length > 2 && p.t - drag[0].t > 140) drag.shift();
    },
    up(p, cancelled) {
      if (!drag || cancelled) return (drag = null);
      drag.push(p);
      const a = drag.find((q) => p.t - q.t <= 120) ?? drag[0];
      drag = null;
      const dx = p.x - a.x, dy = p.y - a.y, dt = Math.max(p.t - a.t, 16) / 1000;
      // A flick goes up the screen (away from you), and far enough to mean it.
      if (-dy < p.rect.height * 0.04 || Math.abs(dx) > -dy * 1.6) {
        g.say(g.touch ? t('Flick up the screen, toward the water.') : t('Drag up, toward the water, and let go while moving.'));
        return;
      }
      const power = Math.hypot(dx, dy) / p.rect.height / dt / 1.8;
      const turn = clamp(Math.atan2(dx, -dy) * 0.8, -0.6, 0.6);
      flight = plan(power, turn);
      g.begin();
      left--;
      thing.show(left);
      tally();
      stone.visible = true;
      g.sound('whoosh');
    },
    update(dt) {
      if (flight) {
        const hop = flight.hops[flight.hop];
        flight.at += dt / hop.time;
        const s = Math.min(flight.at, 1);
        stone.position.lerpVectors(hop.from, hop.to, s);
        stone.position.y += 4 * hop.high * s * (1 - s);
        stone.rotation.y += dt * 25;
        if (flight.at >= 1) {
          flight.at = 0;
          touchDown();
          if (flight) flight.hop++;
        }
      } else if (rest > 0 && (rest -= dt) <= 0) {
        stone.visible = false;
        if (!left) g.finish(best, best === 1 ? t('Best of three: 1 skip.') : t('Best of three: {n} skips.', { n: best }));
      }
      const across = 1.4 + spot.run * 0.25, ahead = spot.run * 0.5 + 0.4;
      const centre = hand.clone().addScaledVector(aim, ahead);
      centre.y = fx.surface();
      return g.view(centre, aim.clone().negate().add(new THREE.Vector3(0, 1.25, 0)), across, ahead * 0.8 + 0.5);
    },
    dispose() {
      stone.removeFromParent();
      thing.show(STONES);
    },
  };
}

// --- Fishing off the dock ---------------------------------------------------
// Tap to cast, then wait. The float bobs when a fish nibbles (leave it), and goes
// right under when one bites: tap then, quickly. Four casts.

const CASTS = 4;
const WINDOW = [0.75, 0.65, 0.55, 0.5]; // seconds to strike once it bites, cast by cast

function makeFish(g) {
  const { thing, fx, group } = g;
  const end = thing.end;
  const out = new THREE.Vector3(end.dx, 0, end.dz);
  const side = new THREE.Vector3(-end.dz, 0, end.dx);
  const base = new THREE.Vector3(end.x, end.y, end.z).addScaledVector(out, -0.15);
  const tip = base.clone().addScaledVector(out, 0.45).add(new THREE.Vector3(0, 0.6, 0));
  // The rod, leaning out over the water from the end of the deck.
  const rodGeo = new THREE.CylinderGeometry(0.008, 0.015, base.distanceTo(tip), 5).translate(0, base.distanceTo(tip) / 2, 0);
  const rod = new THREE.Mesh(rodGeo, new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 0.8 }));
  rod.position.copy(base);
  rod.quaternion.setFromUnitVectors(UP, tip.clone().sub(base).normalize());
  // The float: red on top, white below (two halves, so no faces overlap).
  const float = new THREE.Group();
  float.add(
    new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e0392b', roughness: 0.5, emissive: '#5a0f08', emissiveIntensity: 0.4 })),
    new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.5 })),
  );
  const N = 12;
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(N * 3).fill(0), 3));
  const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#f4ecd8', transparent: true, opacity: 0.8 }));
  fishLine.frustumCulled = false;
  const fishMat = new THREE.MeshStandardMaterial({ color: '#b9c8d4', metalness: 0.35, roughness: 0.3, flatShading: true });
  const fish = new THREE.Group();
  fish.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0).scale(0.55, 0.65, 1.9), fishMat));
  fish.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.3), fishMat));
  fish.visible = false;
  group.add(rod, float, fishLine, fish);

  let casts = CASTS, caught = 0;
  let state = 'ready', clock = 0, spot = null, nibbles = [], biteAt = 0, dip = 0, leap = null;
  g.say(g.touch ? t('Tap to cast. When the float goes right under, tap again, quickly. Leave it when it only bobs.') : t('Click (or press Space) to cast. When the float goes right under, click again, quickly. Leave it when it only bobs.'));
  const tally = () => g.score(`🐟 ${caught} · ${'●'.repeat(casts)}${'○'.repeat(CASTS - casts)}`);
  tally();

  function cast() {
    g.begin();
    casts--;
    tally();
    // Somewhere out in front, on the lake.
    for (let k = 0; k < 12; k++) {
      const p = base.clone().addScaledVector(out, 1 + Math.random() * 0.7).addScaledVector(side, (Math.random() - 0.5) * 0.9);
      if (fx.onLake(p.x, p.z) || k === 11) {
        spot = p;
        break;
      }
    }
    spot.y = fx.surface();
    state = 'cast';
    clock = 0;
    g.sound('whoosh');
    g.say(t('Wait for it…'));
  }

  function settle(next, text) {
    state = next;
    clock = 0;
    g.say(text);
    tally();
  }

  function strike() {
    if (state === 'ready') return cast();
    if (state === 'wait') {
      const nibbled = nibbles.some((n) => n.done);
      return settle('after', nibbled ? t('Too soon: it was only nibbling, and it swam off.') : t('Too soon: nothing was biting yet.'));
    }
    if (state === 'bite') {
      caught++;
      leap = { from: float.position.clone(), t: 0 };
      fishMat.color.set(['#b9c8d4', '#d8a45a', '#9fc29a', '#ff8a3c'][Math.floor(Math.random() * 4)]);
      fish.visible = true;
      g.sound('chime');
      fx.burst(float.position, { count: 14, colors: ['#e8f6ff', '#ffffff'], speed: 0.5, up: 2.2, gravity: -9, life: 0.6, drag: 0.4 });
      return settle('after', caught === 1 ? t('Got one!') : t('Got one! That’s {n}.', { n: caught }));
    }
  }

  function drawLine() {
    const pos = lineGeo.attributes.position;
    const to = state === 'ready' ? tip.clone().add(new THREE.Vector3(0, -0.25, 0)) : float.position;
    const p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      p.lerpVectors(tip, to, f);
      p.y -= Math.sin(f * Math.PI) * (state === 'bite' ? 0.02 : 0.12);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
  }

  return {
    down() {},
    up(p, cancelled) {
      if (!cancelled) strike();
    },
    key(code) {
      if (code !== 'Space' && code !== 'Enter') return false;
      strike();
      return true;
    },
    update(dt) {
      clock += dt;
      const water = fx.surface();
      if (state === 'ready') {
        float.position.copy(tip).add(new THREE.Vector3(0, -0.25, 0));
      } else if (state === 'cast') {
        const s = Math.min(clock / 0.55, 1);
        float.position.lerpVectors(tip, spot, s);
        float.position.y += Math.sin(s * Math.PI) * 0.35;
        if (s >= 1) {
          fx.ripple(spot.x, spot.z, 0.5);
          state = 'wait';
          clock = 0;
          biteAt = 1.6 + Math.random() * 3.4;
          // A nibble or two first, now and then, never right before the bite.
          nibbles = Array.from({ length: Math.floor(Math.random() * 3) }, () => ({ at: 0.6 + Math.random() * Math.max(0.2, biteAt - 1.4), done: false }));
        }
      } else if (state === 'wait') {
        for (const n of nibbles) {
          if (!n.done && clock >= n.at) {
            n.done = true;
            dip = 0.25;
            fx.ripple(spot.x, spot.z, 0.3);
          }
        }
        if (clock >= biteAt) {
          state = 'bite';
          clock = 0;
          fx.ripple(spot.x, spot.z, 1.3);
          fx.burst(spot, { count: 6, colors: ['#e8f6ff'], speed: 0.3, up: 0.8, gravity: -9, life: 0.4 });
          g.sound('splash');
        }
      } else if (state === 'bite') {
        if (clock > WINDOW[CASTS - casts - 1]) settle('after', t('Too late: it got away.'));
      } else if (state === 'after' && clock > 1.4) {
        fish.visible = false;
        if (casts) settle('ready', g.touch ? t('Tap to cast again.') : t('Click to cast again.'));
        else g.finish(caught, caught === 1 ? t('One fish of four.') : t('{n} fish of four.', { n: caught }));
      }
      // The float sits on the water, bobs, dips at a nibble, and goes under at a bite.
      if (state === 'wait' || state === 'bite' || (state === 'after' && !leap)) {
        dip = Math.max(0, dip - dt);
        const under = state === 'bite' ? 0.07 + Math.sin(clock * 30) * 0.01 : Math.sin((dip / 0.25) * Math.PI) * 0.025;
        float.position.set(spot.x, water + 0.01 + Math.sin(clock * 2.2) * 0.006 - under, spot.z);
      }
      if (leap) {
        leap.t += dt / 0.9;
        const s = Math.min(leap.t, 1);
        fish.position.lerpVectors(leap.from, base, ease(s));
        fish.position.y = leap.from.y + Math.sin(s * Math.PI) * 0.6 + s * 0.1;
        fish.lookAt(group.localToWorld(new THREE.Vector3(base.x, fish.position.y, base.z)));
        fish.rotation.z = Math.sin(clock * 25) * 0.4;
        if (s >= 1) {
          leap = null;
          fish.visible = false;
        }
        float.position.copy(fish.position);
      }
      drawLine();
      const centre = base.clone().addScaledVector(out, 0.9);
      centre.y = water;
      return g.view(centre, out.clone().negate().multiplyScalar(0.9).addScaledVector(side, 0.35).add(new THREE.Vector3(0, 0.8, 0)), 1.2, 0.9);
    },
    dispose() {
      for (const o of [rod, float, fishLine, fish]) o.removeFromParent();
    },
  };
}

// --- Catching fireflies -----------------------------------------------------
// At night, tap fireflies as they drift round the jar: ten in 25 seconds fills it.

const FLIES = 14, GOAL = 10, SECONDS = 25;

function makeFireflies(g) {
  const { thing, group } = g;
  const somewhere = (out) => out.copy(middle).addScaledVector(across, (Math.random() - 0.5) * 2.4).addScaledVector(toward, (Math.random() - 0.5) * 1.1).add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.9, 0));
  const jar = new THREE.Vector3(thing.spot.x, thing.spot.y + 0.3, thing.spot.z);
  // They gather on the open side of the jar, where you watch from.
  const toward = new THREE.Vector3(Math.cos(thing.spot.view), 0, Math.sin(thing.spot.view));
  const across = new THREE.Vector3(-toward.z, 0, toward.x);
  const middle = new THREE.Vector3(thing.spot.x, thing.spot.y + 0.85, thing.spot.z).addScaledVector(toward, 0.7);
  const flies = Array.from({ length: FLIES }, (_, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.scale.setScalar(0.16);
    const pos = somewhere(new THREE.Vector3());
    sprite.position.copy(pos);
    group.add(sprite);
    return { sprite, pos, vel: new THREE.Vector3(), aim: pos.clone(), next: 0, phase: Math.random() * 6, rate: 1.5 + Math.random() * 2, home: null, i };
  });
  let caught = 0, left = SECONDS, speed = 0.55, wait = 1.2;
  thing.fill(0);
  g.say(g.touch ? t('Catch {n} fireflies before the time runs out: tap them.', { n: GOAL }) : t('Catch {n} fireflies before the time runs out: click them.', { n: GOAL }));
  const tally = () => g.score(`✨ ${caught}/${GOAL} · 0:${String(Math.ceil(left)).padStart(2, '0')}`);
  tally();

  // Somewhere new to drift to: a wide, shallow space in front of the jar.
  const wander = (f) => {
    somewhere(f.aim);
    f.next = 0.8 + Math.random() * 1.6;
  };
  flies.forEach(wander);

  return {
    down(p) {
      // The nearest firefly on screen to the tap, if it's close enough.
      let best = null, bestD = p.touch ? 38 : 26;
      for (const f of flies) {
        if (f.home) continue;
        const at = g.screen(f.pos, p.rect);
        const d = Math.hypot(at.x - p.x, at.y - p.y);
        if (!at.behind && d < bestD) {
          best = f;
          bestD = d;
        }
      }
      if (!best) return;
      best.home = { from: best.pos.clone(), t: 0 };
      g.begin();
      caught++;
      speed += 0.05;
      g.sound('pop');
      tally();
      if (caught >= GOAL) g.finish(caught, t('A jar full of fireflies!'));
    },
    update(dt) {
      // (The clock starts once the view has settled.)
      if ((wait -= dt) < 0 && caught < GOAL) {
        left = Math.max(0, left - dt);
        g.begin();
      }
      tally();
      if (left <= 0 && caught < GOAL) g.finish(caught, caught === 1 ? t('Time’s up: 1 firefly.') : t('Time’s up: {n} fireflies.', { n: caught }));
      for (const f of flies) {
        if (f.home) {
          // Into the jar.
          f.home.t = Math.min(1, f.home.t + dt / 0.5);
          f.pos.lerpVectors(f.home.from, jar, ease(f.home.t));
          f.sprite.position.copy(f.pos);
          f.sprite.scale.setScalar(0.16 * (1 - f.home.t * 0.6));
          if (f.home.t >= 1 && f.sprite.visible) {
            f.sprite.visible = false;
            thing.fill(flies.filter((x) => x.home && x.home.t >= 1).length);
          }
          continue;
        }
        if ((f.next -= dt) <= 0) wander(f);
        // Steer gently toward where it's going, with a little wobble.
        const want = f.aim.clone().sub(f.pos);
        const d = want.length();
        if (d > 1e-4) want.multiplyScalar(Math.min(1, d) * speed / d);
        f.vel.lerp(want, 1 - Math.exp(-dt * 2));
        f.pos.addScaledVector(f.vel, dt);
        f.pos.y += Math.sin(performance.now() / 300 + f.phase) * dt * 0.08;
        f.sprite.position.copy(f.pos);
        // Blinking: brightest now and then, never quite out.
        const blink = Math.max(0, Math.sin(performance.now() / 1000 * f.rate + f.phase));
        f.sprite.material.opacity = 0.45 + 0.55 * blink * blink;
        f.sprite.scale.setScalar(0.13 + 0.06 * blink);
      }
      return g.view(middle, toward.clone().add(new THREE.Vector3(0, 0.45, 0)), 1.45, 0.9);
    },
    dispose() {
      for (const f of flies) f.sprite.removeFromParent();
    },
  };
}

// --- Flying a kite ----------------------------------------------------------
// Keep the kite up for 20 seconds. It climbs in the middle of the wind and sinks
// toward the sides, and gusts push it about: steer it back (tilt the phone, drag,
// or A and D / the arrow keys). If it comes down, it goes up again, 6 seconds back;
// the third time, that's it.

const ALOFT = 20;
const LOST = 6; // seconds a fall takes off
const FALLS = 3; // falls before it's over
const STRING = 3.6;
const STEER_KEYS = { KeyA: -1, ArrowLeft: -1, KeyD: 1, ArrowRight: 1 };

function makeKite(g) {
  const { thing, fx, group } = g;
  const anchor = new THREE.Vector3(thing.spot.x, thing.spot.top, thing.spot.z);
  // You watch from the open side of the post, and the kite flies out the other way.
  const fwd = new THREE.Vector3(-Math.cos(thing.spot.view), 0, -Math.sin(thing.spot.view));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  // The kite off the post, bigger, out on the land.
  const kite = thing.kite.object;
  const was = { parent: kite.parent, position: kite.position.clone(), rotation: kite.rotation.clone(), scale: kite.scale.clone() };
  group.add(kite);
  kite.scale.setScalar(1.9);
  const N = 14;
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(N * 3).fill(0), 3));
  const string = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#f4ecd8' }));
  string.frustumCulled = false;
  group.add(string);

  // (`down` counts a fall back up; it starts as a moment to settle the view.)
  let x = 0, y = 0.35, vx = 0, aloft = 0, gust = 0, gustAim = 0, gustNext = 1.2, down = 0, sway = 0, wait = 1.2, falls = 0;
  let drag = null;
  g.say(g.touch ? t('Keep the kite up for {n} seconds: tilt your phone, or drag left and right, to steer it back to the middle.', { n: ALOFT }) : t('Keep the kite up for {n} seconds: A and D or the arrow keys steer it back to the middle.', { n: ALOFT }));
  const bar = (f) => '▰'.repeat(Math.round(f * 10)) + '▱'.repeat(10 - Math.round(f * 10));
  const tally = () => g.score(`🪁 ${bar(aloft / ALOFT)} · ${'●'.repeat(FALLS - falls)}${'○'.repeat(falls)}`);
  tally();

  const place = (px, py, out) => {
    const az = px * 1.0, el = 0.12 + py * 1.0;
    return out.copy(anchor)
      .addScaledVector(fwd, STRING * Math.cos(el) * Math.cos(az))
      .addScaledVector(right, STRING * Math.cos(el) * Math.sin(az))
      .addScaledVector(UP, STRING * Math.sin(el));
  };
  const at = new THREE.Vector3();

  return {
    down(p) {
      drag = { x: p.x, w: p.rect.width, steer: 0 };
    },
    move(p) {
      if (drag) drag.steer = clamp((p.x - drag.x) / (drag.w * 0.22), -1, 1);
    },
    up() {
      drag = null;
    },
    key(code) {
      return code in STEER_KEYS;
    },
    update(dt, env) {
      sway += dt;
      const wind = env?.wind ?? 1;
      let steer = g.tilt.x + (drag?.steer ?? 0);
      for (const code of g.held) steer += STEER_KEYS[code] ?? 0;
      steer = clamp(steer, -1, 1);
      if (down > 0) {
        // Back up after a fall (unless that was the last).
        if ((down -= dt) <= 0 && !g.ended) {
          x = 0;
          y = 0.35;
          vx = 0;
          g.say(t('Up it goes again.'));
        }
      } else if ((wait -= dt) > 0) {
        y = Math.min(0.35, y + dt * 0.1);
      } else if (!g.ended) {
        g.begin();
        // Gusts come and go, stronger as time goes on (and in a gale).
        if ((gustNext -= dt) <= 0) {
          gustAim = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5) * (1 + (aloft / ALOFT) * 0.6) * Math.min(1.4, 0.8 + wind * 0.25);
          gustNext = 0.9 + Math.random() * 1.4;
          // The grass shows it coming, from that side.
          const from = anchor.clone().addScaledVector(right, -Math.sign(gustAim) * 2.5).addScaledVector(fwd, 1);
          fx.gust(from.x, from.z);
        }
        gust += (gustAim - gust) * (1 - Math.exp(-dt * 2.5));
        vx += (steer * 2.4 + gust * 1.8) * dt;
        vx *= Math.exp(-1.8 * dt);
        x += vx * dt;
        if (Math.abs(x) > 1) {
          x = Math.sign(x);
          vx = 0;
        }
        // It climbs in the middle of the wind, and sinks out toward the sides.
        const lift = 0.45 - 1.4 * x * x - Math.abs(steer) * 0.12;
        y = Math.min(1, y + lift * 0.5 * dt);
        if (y > 0.05) {
          aloft += dt;
          tally();
        }
        if (y <= 0) {
          y = 0;
          falls++;
          aloft = Math.max(0, aloft - LOST);
          down = 1.2;
          tally();
          g.sound('thud');
          if (falls >= FALLS) g.finish(Math.floor(aloft), t('Down a third time, and the wind has dropped. Another day.'));
          else if (falls === FALLS - 1) g.say(t('Down again: {n} seconds back, and one more fall ends it.', { n: LOST }));
          else g.say(t('It came down: {n} seconds back. Keep it near the middle, where the wind lifts it.', { n: LOST }));
        } else if (aloft >= ALOFT) {
          g.finish(ALOFT, t('Up and away! The kite found the wind.'));
        }
      }
      // Up on its string, facing back to the post, leaning into its turns.
      const fallen = down > 0 ? 1 - down / 1.2 : falls >= FALLS ? 1 : 0;
      place(x, y - fallen * 0.15, at);
      if (fallen) at.y = Math.max(fx.ground(at.x, at.z) + 0.1, at.y - fallen * 2);
      kite.position.copy(at).add(new THREE.Vector3(0, Math.sin(sway * 3.1) * 0.03, 0));
      kite.lookAt(group.localToWorld(anchor.clone()));
      kite.rotateZ(-vx * 0.45 + Math.sin(sway * 2.3) * 0.08);
      thing.kite.flutter(sway, wind + Math.abs(gust), 1);
      const pos = lineGeo.attributes.position;
      const p = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        p.lerpVectors(anchor, kite.position, f);
        p.y -= Math.sin(f * Math.PI) * 0.25;
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
      const centre = anchor.clone().addScaledVector(fwd, STRING * 0.55).addScaledVector(UP, STRING * 0.38);
      return g.view(centre, fwd.clone().negate().add(new THREE.Vector3(0, 0.2, 0)), STRING * 0.95, STRING * 0.6);
    },
    dispose() {
      string.removeFromParent();
      was.parent.add(kite);
      kite.position.copy(was.position);
      kite.rotation.copy(was.rotation);
      kite.scale.copy(was.scale);
    },
  };
}
