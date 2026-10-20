import * as THREE from 'three';
import { softDot } from './sky.js';

// Things on a land that start a little game (games.js, through main.js): a pile of
// flat stones by the lake for skipping, a jar of fireflies on a stump, a kite tied
// to a post on high ground. (Fishing starts from the dock, in landmarks.js.) Each
// is placed last, from its own stream, round what's already there, so nothing
// else on a land moves for them.

const TAU = Math.PI * 2;
// Kinds of land open and breezy enough for a kite.
export const KITE_BIOMES = ['meadow', 'highlands', 'desert', 'savanna', 'heath', 'lavender', 'cloudisle', 'birds', 'whale', 'sunflower'];

// A big, unseen ball round a small thing, so a finger can find it. (Raycasts still
// hit an object that isn't drawn.)
function hitBall(radius, y) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), new THREE.MeshBasicMaterial());
  ball.position.y = y;
  ball.visible = false;
  return ball;
}

// Somewhere dry, gentle and clear of the trees and the things already placed.
function clearOf(shape, blocked, trees, others) {
  return (x, z, room = 0.45) => !shape.isWet(x, z, 0.1) && !blocked(x, z) && shape.slopeAt(x, z) < 0.5 && shape.radial(x, z) < 0.86
    && !trees.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < room * room)
    && !others.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 1.2 * 1.2);
}

// The way to look at (x, z) from with the fewest trees in between (an angle, pointing
// from the thing to where you'd stand), so a game's view isn't all leaves.
function clearestSide(x, z, trees) {
  let best = 0, fewest = Infinity;
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16, cx = Math.cos(a), cz = Math.sin(a);
    const count = trees.filter((p) => {
      const u = (p.x - x) * cx + (p.z - z) * cz, v = Math.abs((p.x - x) * cz - (p.z - z) * cx);
      return u > -0.3 && u < 3.5 && v < 0.7 + u * 0.3;
    }).length;
    if (count < fewest) [best, fewest] = [a, count];
  }
  return best;
}

// How far a stone thrown from (x, z) toward `a` stays over the main lake
// (from where it first meets the water to where it leaves it).
function waterRun(shape, x, z, a) {
  const dx = Math.cos(a), dz = Math.sin(a);
  let start = -1;
  for (let d = 0; d < 12; d += 0.1) {
    const wet = shape.inPool(shape.lake, x + dx * d, z + dz * d);
    if (wet && start < 0) start = d;
    if (!wet && start >= 0) return d - start;
  }
  return start < 0 ? 0 : 12 - start;
}

// A heap of flat stones on the lake shore, where the water runs longest ahead.
export function buildSkipStones(shape, r, blocked, trees, others) {
  const lake = shape.lake;
  if (!lake || lake.radius < 1.1) return null;
  const ok = clearOf(shape, blocked, trees, others);
  const start = r.range(0, TAU);
  let best = null;
  for (let k = 0; k < 24; k++) {
    const a = start + (k * TAU) / 24;
    for (let step = 1; step <= 6; step++) {
      const d = shape.shoreDistance(lake, a) + 0.15 + step * 0.2;
      const x = lake.x + Math.cos(a) * d, z = lake.z + Math.sin(a) * d;
      if (!ok(x, z)) continue;
      // Throwing back across the lake, toward its middle.
      const aim = Math.atan2(lake.z - z, lake.x - x);
      const run = waterRun(shape, x, z, aim);
      // Better with no trees just behind, where you'd watch from.
      const back = -Math.cos(aim), side = -Math.sin(aim);
      const open = !trees.some((p) => {
        const u = (p.x - x) * back + (p.z - z) * side, v = Math.abs((p.x - x) * side - (p.z - z) * back);
        return u > -0.3 && u < 3 && v < 0.6 + u * 0.3;
      });
      const score = run + (open ? 10 : 0);
      if (run > 1.8 && (!best || score > best.score)) best = { x, z, aim, run, score };
      break;
    }
  }
  if (!best) return null;
  const { x, z } = best;
  const group = new THREE.Group();
  group.position.set(x, shape.heightAt(x, z), z);
  // Pale flat stones, the bottom ones side by side (never overlapping at one height,
  // which would flicker), two more stacked on top.
  const greys = ['#d9d3c7', '#c6bfb2', '#b1ab9f', '#e4dfd4'];
  const stone = new THREE.DodecahedronGeometry(0.075, 0).scale(1, 0.34, 0.8);
  const stones = [];
  const put = (px, py, pz, color, s = 1) => {
    const m = new THREE.Mesh(stone, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
    m.position.set(px, py, pz);
    m.rotation.set(r.range(-0.12, 0.12), r.range(0, TAU), r.range(-0.12, 0.12));
    m.scale.setScalar(s);
    m.castShadow = true;
    group.add(m);
    stones.push(m);
  };
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + r.range(-0.3, 0.3);
    put(Math.cos(a) * 0.13, 0.015, Math.sin(a) * 0.13, greys[i]);
  }
  put(0.02, 0.05, -0.01, greys[1], 0.9);
  put(-0.02, 0.085, 0.02, greys[3], 0.8);
  group.add(hitBall(0.42, 0.1));
  return {
    object: group,
    // Where you stand, which way the lake lies, and how much water there is to skip on.
    spot: { x, z, aim: best.aim, run: best.run },
    // The heap empties as you throw (games.js), and fills again after.
    show(left) {
      stones.forEach((m, i) => (m.visible = i < 3 || i - 3 < left));
    },
  };
}

// A glass jar on a stump, where the fireflies are (only on lands that have them).
// At night a few are already inside, glowing.
export function buildFireflyJar(shape, r, blocked, trees, others) {
  const ok = clearOf(shape, blocked, trees, others);
  let at = null;
  for (let k = 0; k < 60 && !at; k++) {
    const a = r.range(0, TAU), d = r.range(2, 7.5);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    // Near a tree, but not under it.
    if (ok(x, z, 0.6) && trees.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 2.2 * 2.2)) at = [x, z];
  }
  if (!at) return null;
  const [x, z] = at;
  const group = new THREE.Group();
  group.position.set(x, shape.heightAt(x, z), z);
  group.rotation.y = r.range(0, TAU);
  const bark = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.95, flatShading: true });
  // An open-topped stump with its pale rings on top (one face there, so nothing flickers).
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.24, 9, 1, true).translate(0, 0.08, 0), bark);
  stump.castShadow = true;
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.153, 18).rotateX(-Math.PI / 2).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: '#c9a77a', roughness: 0.9 }));
  // The jar: open glass sides (no caps to fight the stump or the lid), a cork lid.
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.075, 0.18, 14, 1, true).translate(0, 0.31, 0),
    new THREE.MeshStandardMaterial({ color: '#cfe8e2', roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.04, 12).translate(0, 0.42, 0), new THREE.MeshStandardMaterial({ color: '#a87a4a', roughness: 0.9 }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.y = 0.3;
  group.add(stump, ring, glass, lid, glow, hitBall(0.4, 0.25));
  let caught = 0, night = 0;
  return {
    object: group,
    // (`view`: the side to watch from, clear of trees.)
    spot: { x, y: shape.heightAt(x, z), z, view: clearestSide(x, z, trees) },
    // Each firefly caught (games.js) makes the jar brighter, for as long as the game lasts.
    fill(n) {
      caught = n;
    },
    update(t, dt, env) {
      night = env.night;
      const flicker = 0.75 + Math.sin(t * 3.1) * 0.15 + Math.sin(t * 7.3) * 0.1;
      const lit = Math.min(1, night * 0.35 + caught * 0.08) * flicker;
      glow.visible = lit > 0.02;
      glow.scale.setScalar(0.25 + lit * 0.35);
      glow.material.opacity = lit;
    },
  };
}

// A kite tied to a post on high ground, its tail lifting in the wind.
export function buildKitePost(shape, r, blocked, trees, others) {
  const ok = clearOf(shape, blocked, trees, others);
  let at = null;
  for (let k = 0; k < 50; k++) {
    const a = r.range(0, TAU), d = r.range(1.5, 7);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    // Room round it to run with a kite, and the higher the better.
    if (!ok(x, z, 0.9)) continue;
    const y = shape.heightAt(x, z);
    if (!at || y > at[2]) at = [x, z, y];
  }
  if (!at) return null;
  const [x, z, y] = at;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4e33', roughness: 0.9, flatShading: true });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6).translate(0, 0.28, 0), wood);
  post.castShadow = true;
  // A spool of string at its foot.
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 10).rotateZ(Math.PI / 2).translate(0.09, 0.05, 0.04), new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9 }));
  const kite = makeKite(r.pick([['#3d7cc9', '#2b5c99'], ['#e8b323', '#b8860b'], ['#d8352a', '#9e2219'], ['#4caf7a', '#2f7d52']]), 0.42);
  // Leaning on the post, facing the wind.
  kite.object.position.set(0, 0.36, 0.06);
  kite.object.rotation.set(-0.35, 0, 0.1);
  group.add(post, spool, kite.object, hitBall(0.5, 0.35));
  return {
    object: group,
    // (`view`: the side to watch from, clear of trees; the kite flies the other way.)
    spot: { x, y, z, top: y + 0.55, view: clearestSide(x, z, trees) },
    kite,
    update(t, dt, env) {
      kite.flutter(t, env.wind ?? 1, 0.3);
    },
  };
}

// A diamond kite with a cross of sticks and a tail of paper bows; `size` is its height.
// `flutter(t, wind, amount)` shakes the tail. Used on the post and by the kite game.
export function makeKite([front, back], size = 1) {
  const s = size / 1.3;
  const sail = new THREE.BufferGeometry();
  const [a, b, c, d] = [[0, 0.55 * s, 0], [0.38 * s, 0.05 * s, 0], [0, -0.75 * s, 0], [-0.38 * s, 0.05 * s, 0]];
  sail.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...d, ...b, ...b, ...d, ...c], 3));
  const top = new THREE.Color(front), bottom = new THREE.Color(back);
  sail.setAttribute('color', new THREE.Float32BufferAttribute([...top.toArray(), ...top.toArray(), ...top.toArray(), ...bottom.toArray(), ...bottom.toArray(), ...bottom.toArray()], 3));
  sail.computeVertexNormals();
  const object = new THREE.Group();
  object.add(new THREE.Mesh(sail, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })));
  // The sticks sit just behind the sail (0.012 off it).
  const stick = new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 0.9 });
  object.add(new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 1.3 * s, 0.02 * s).translate(0, -0.1 * s, -0.012 * s - 0.01), stick));
  object.add(new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.02 * s, 0.02 * s).translate(0, 0.05 * s, -0.012 * s - 0.01), stick));
  const paper = new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9, side: THREE.DoubleSide });
  const bows = Array.from({ length: 4 }, (_, i) => {
    const bow = new THREE.Mesh(new THREE.PlaneGeometry(0.14 * s, 0.05 * s), paper);
    bow.position.set(0, (-0.75 - 0.22 * (i + 1)) * s, 0);
    object.add(bow);
    return bow;
  });
  return {
    object,
    flutter(t, wind, amount = 1) {
      bows.forEach((bow, i) => {
        bow.position.x = Math.sin(t * 3 + i * 0.9) * 0.05 * s * (i + 1) * amount * Math.min(wind, 2);
        bow.rotation.z = Math.sin(t * 4 + i) * 0.6 * amount;
      });
    },
  };
}

