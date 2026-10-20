import * as THREE from 'three';
import { t } from './i18n.js';

// The hedge maze's game: roll a ball from the fountain at the middle out through
// the gate, by tilting the phone or with WASD and the arrow keys. It plays in the
// maze's own (u, v) frame (grounds.js), against the same wall segments the hedges
// were built from, so what you see is what the ball bumps into.

const R = 0.14; // the ball: as big as the corridors (0.42 between hedges) allow, so a phone can see it
const REACH = R + 0.1; // how close the ball's middle comes to a wall's middle line (half a hedge is 0.1)
const ACCEL = 7; // how hard a full tilt or a held key pushes, in units a second squared
const DRAG = 1.4; // rolling friction
const TOP = 2.6; // the fastest it rolls
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// `onWin()` when the ball rolls out; `onEnd()` when the game closes (won or not).
export function createMazeBall({ onWin, onEnd }) {
  let game = null;
  const held = new Set();
  const tilt = { x: 0, y: 0, base: null };
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R, 2),
    new THREE.MeshStandardMaterial({ color: '#f4d35e', metalness: 0.3, roughness: 0.35, emissive: '#b08a1a', emissiveIntensity: 0.8, flatShading: true }),
  );
  ball.castShadow = true;

  const ui = document.createElement('div');
  ui.className = 'maze-ui';
  ui.hidden = true;
  const line = document.createElement('p');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'maze-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', t('stop playing'));
  close.addEventListener('click', () => stop());
  ui.append(line, close);
  // Just above the bar, in the bottom stack.
  const stack = document.querySelector('.hud-bottom');
  if (stack) stack.insertBefore(ui, stack.querySelector('.bar'));
  else document.body.append(ui);

  addEventListener('keydown', (event) => {
    // (Keys typed into a text box, like a voyage's word, are the box's.)
    if (!game || !KEYS[event.code] || event.target.closest?.('input, textarea, [contenteditable]')) return;
    held.add(event.code);
    event.preventDefault();
  });
  addEventListener('keyup', (event) => held.delete(event.code));
  addEventListener('blur', () => held.clear());
  // The phone's tilt, from where it was held when the game began. (Turned
  // sideways, the phone's axes turn with it.)
  addEventListener('deviceorientation', (event) => {
    if (!game || event.beta == null || event.gamma == null) return;
    tilt.base ??= { beta: event.beta, gamma: event.gamma };
    const x = clamp((event.gamma - tilt.base.gamma) / 22, -1, 1);
    const y = clamp(-(event.beta - tilt.base.beta) / 22, -1, 1);
    const a = ((screen.orientation?.angle ?? 0) * Math.PI) / 180;
    tilt.x = x * Math.cos(a) + y * Math.sin(a);
    tilt.y = -x * Math.sin(a) + y * Math.cos(a);
  });

  function start(land) {
    if (game || !land.maze) return;
    const maze = land.maze;
    // iPhones ask once before telling a page how the phone is tilted (it must come from a tap).
    window.DeviceOrientationEvent?.requestPermission?.().catch(() => {});
    tilt.base = null;
    tilt.x = tilt.y = 0;
    game = { land, maze, u: 0, v: 0, du: 0, dv: 0, won: 0 };
    for (const part of maze.centre) part.visible = false;
    land.group.add(ball);
    place();
    const touch = matchMedia('(pointer: coarse)').matches;
    line.textContent = touch ? t('Roll the ball out of the maze: tilt your phone.') : t('Roll the ball out of the maze: WASD or the arrow keys.');
    ui.hidden = false;
  }

  function stop() {
    if (!game) return;
    for (const part of game.maze.centre) part.visible = true;
    ball.removeFromParent();
    game = null;
    held.clear();
    ui.hidden = true;
    onEnd?.();
  }

  function place() {
    const [x, z] = game.maze.toLand(game.u, game.v);
    ball.position.set(x, game.maze.ground(x, z) + R, z);
  }

  // Push the ball out of any hedge it has rolled into, and take the bounce out of its speed.
  function collide() {
    for (const [u0, v0, u1, v1] of game.maze.walls) {
      const eu = u1 - u0, ev = v1 - v0;
      const k = clamp(((game.u - u0) * eu + (game.v - v0) * ev) / (eu * eu + ev * ev), 0, 1);
      const qu = u0 + eu * k, qv = v0 + ev * k;
      const du = game.u - qu, dv = game.v - qv, d = Math.hypot(du, dv);
      if (d >= REACH || d < 1e-6) continue;
      const nu = du / d, nv = dv / d;
      game.u = qu + nu * REACH;
      game.v = qv + nv * REACH;
      const into = game.du * nu + game.dv * nv;
      if (into < 0) {
        game.du -= nu * into * 1.3;
        game.dv -= nv * into * 1.3;
      }
    }
  }

  // Each frame: which way is "down" (on screen), roll, bump, and see if it's out.
  // Returns where the camera should look from, over the maze.
  function update(dt, camera) {
    if (!game) return null;
    const { land, maze } = game;
    let ix = tilt.x, iy = tilt.y;
    for (const code of held) {
      ix += KEYS[code][0];
      iy += KEYS[code][1];
    }
    const m = Math.hypot(ix, iy);
    if (m > 1) {
      ix /= m;
      iy /= m;
    }
    // Screen right and screen up, laid flat on the land and turned into the maze's frame.
    const inv = new THREE.Matrix4().copy(land.group.matrixWorld).invert();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(inv).setY(0).normalize();
    const up = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).transformDirection(inv).setY(0).normalize();
    const c = Math.cos(maze.yaw), s = Math.sin(maze.yaw);
    const ax = right.x * ix + up.x * iy, az = right.z * ix + up.z * iy;
    if (!game.won) {
      game.du += (ax * c + az * s) * ACCEL * dt;
      game.dv += (-ax * s + az * c) * ACCEL * dt;
    }
    const drag = Math.exp(-DRAG * dt);
    game.du *= drag;
    game.dv *= drag;
    const speed = Math.hypot(game.du, game.dv);
    if (speed > TOP) {
      game.du *= TOP / speed;
      game.dv *= TOP / speed;
    }
    const [x0, z0] = maze.toLand(game.u, game.v);
    for (let i = 0; i < 4; i++) {
      game.u += (game.du * dt) / 4;
      game.v += (game.dv * dt) / 4;
      collide();
    }
    place();
    // Roll it: turn about the axis across its path, by the distance it went.
    const mx = ball.position.x - x0, mz = ball.position.z - z0, moved = Math.hypot(mx, mz);
    if (moved > 1e-5) ball.rotateOnWorldAxis(new THREE.Vector3(mz / moved, 0, -mx / moved), moved / R);
    // Out through the gate: a win, and a moment to enjoy it.
    if (!game.won && (Math.abs(game.u) > maze.half + 0.3 || Math.abs(game.v) > maze.half + 0.3)) {
      game.won = performance.now();
      line.textContent = t('You rolled it out!');
      onWin?.();
    }
    if (game.won && performance.now() - game.won > 1600) {
      stop();
      return null;
    }
    // Look down on the maze from a little to the camera's side of it, far enough
    // back that all of it (corners, gate and a margin) fits on screen. An upright
    // phone sees far less across than up and down, so the narrower view decides.
    const centre = land.group.localToWorld(new THREE.Vector3(maze.x, maze.ground(maze.x, maze.z), maze.z));
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    const reach = (maze.half * Math.SQRT2 + 0.5) * land.group.scale.x;
    const back = (reach / Math.tan(Math.min(vf, hf))) * 1.15;
    const side = camera.position.clone().sub(centre).setY(0);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    const dir = side.setLength(0.35).add(new THREE.Vector3(0, 1, 0)).normalize();
    return { target: centre, position: centre.clone().addScaledVector(dir, back) };
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
