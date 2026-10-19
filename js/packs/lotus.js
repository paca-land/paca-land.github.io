import * as THREE from 'three';
import { t } from '../i18n.js';

// The lotus garden: a big still pond crowded with giant lotus leaves, pink
// flowers held up on tall stalks, a red zigzag bridge out to a little pavilion,
// and a round moon gate on the bank looking out over it all, under willows.
// Its pond feeds you twice over.

const TAU = Math.PI * 2;

function plan({ shape, spots, taken, r }) {
  const lake = shape.lake;
  if (!lake) return null;
  // The flat dry spot nearest the pond (but clear of its bank) gets the gate.
  let gate = null;
  const near = spots.filter((v) => !shape.isWet(v.x, v.z, 0.9) && shape.isWet(v.x, v.z, 3))
    .sort((a, b) => Math.hypot(a.x - lake.x, a.z - lake.z) - Math.hypot(b.x - lake.x, b.z - lake.z));
  for (const v of near) {
    const rn = shape.radial(v.x, v.z);
    if (rn < 0.15 || rn > 0.8 || taken(v.x, v.z)) continue;
    let steep = 0;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const x = v.x + Math.cos(a) * 1.3, z = v.z + Math.sin(a) * 1.3;
      if (taken(x, z) || shape.isWet(x, z, 0.2)) steep = 9;
      steep = Math.max(steep, shape.slopeAt(x, z));
    }
    if (steep > 0.35) continue;
    gate = { x: v.x, z: v.z, yaw: Math.atan2(lake.x - v.x, lake.z - v.z) };
    break;
  }
  // The bridge sets off from the bank (in front of the gate if there is one) and
  // zigzags out over the water, with a pavilion where it ends.
  const bridge = [];
  let pavilion = null;
  const first = gate ? Math.atan2(gate.z - lake.z, gate.x - lake.x) : r.range(0, TAU);
  const tries = Array.from({ length: 10 }, (_, k) => first + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55);
  for (const heading of tries) {
    const shore = shape.shoreDistance(lake, heading);
    const start = { x: lake.x + Math.cos(heading) * (shore + 0.3), z: lake.z + Math.sin(heading) * (shore + 0.3) };
    if (taken(start.x, start.z)) continue;
    const pts = [start];
    let at = start;
    for (let k = 0; k < 5; k++) {
      const inward = Math.atan2(lake.z - at.z, lake.x - at.x) + (k % 2 ? -0.7 : 0.7);
      const next = { x: at.x + Math.cos(inward) * 1.05, z: at.z + Math.sin(inward) * 1.05 };
      if (shape.waterAt(next.x, next.z, -0.35) !== lake) break;
      pts.push(next);
      at = next;
      if (Math.hypot(at.x - lake.x, at.z - lake.z) < shore * 0.35) break;
    }
    if (pts.length < 3) continue;
    bridge.push(...pts);
    const end = pts[pts.length - 1];
    if (shape.waterAt(end.x, end.z, -0.95) === lake) pavilion = end;
    break;
  }
  const rocks = [];
  for (const v of spots) {
    if (rocks.length >= r.int(3, 5)) break;
    if (!shape.isWet(v.x, v.z, 1.1) || shape.isWet(v.x, v.z, 0.25) || taken(v.x, v.z)) continue;
    if (gate && Math.hypot(v.x - gate.x, v.z - gate.z) < 2) continue;
    if (bridge.length && Math.hypot(v.x - bridge[0].x, v.z - bridge[0].z) < 1) continue;
    if (rocks.some((k) => Math.hypot(k.x - v.x, k.z - v.z) < 1.4)) continue;
    rocks.push({ x: v.x, z: v.z, h: r.range(0.7, 1.4), s: r.range(0.22, 0.34), turn: r.range(0, TAU) });
  }
  return {
    gate, rocks, bridge, pavilion,
    blocked: (x, z) => Boolean((gate && Math.hypot(x - gate.x, z - gate.z) < 1.6)
      || rocks.some((k) => Math.hypot(x - k.x, z - k.z) < 0.55)
      || (bridge.length && Math.hypot(x - bridge[0].x, z - bridge[0].z) < 0.7)),
  };
}

// A white wall with a round doorway, a tiled cap and a stone rim, standing on y = 0.
function moonGate(lib) {
  const wall = new THREE.Shape();
  wall.moveTo(-1.3, 0).lineTo(1.3, 0).lineTo(1.3, 1.9).lineTo(-1.3, 1.9).lineTo(-1.3, 0);
  const hole = new THREE.Path();
  hole.absarc(0, 0.98, 0.74, 0, TAU, true);
  wall.holes.push(hole);
  const body = new THREE.ExtrudeGeometry(wall, { depth: 0.26, bevelEnabled: false, curveSegments: 28 }).translate(0, 0, -0.13);
  const rim = new THREE.TorusGeometry(0.74, 0.055, 6, 32).translate(0, 0.98, 0);
  const plinth = new THREE.BoxGeometry(2.7, 0.5, 0.4).translate(0, -0.2, 0);
  const cap = new THREE.BoxGeometry(2.9, 0.1, 0.5).translate(0, 1.95, 0);
  const ridge = new THREE.BoxGeometry(2.7, 0.12, 0.16).translate(0, 2.06, 0);
  return { body, trim: lib.flat(rim, plinth), roof: lib.flat(cap, ridge) };
}

// A craggy standing rock, taller than it's wide.
function rockGeometry(r) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.75 + r() * 0.45;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (0.85 + r() * 0.3), pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo.translate(0, 0.9, 0);
}

// A lotus flower, open, a unit across: two rings of petals round a yellow seed head.
function flowerGeometry(lib) {
  const petals = [];
  for (let i = 0; i < 8; i++) petals.push(new THREE.ConeGeometry(0.09, 0.3, 4).scale(1, 1, 0.35).translate(0, 0.15, 0).rotateX(0.95).rotateY((i / 8) * TAU));
  for (let i = 0; i < 6; i++) petals.push(new THREE.ConeGeometry(0.075, 0.24, 4).scale(1, 1, 0.35).translate(0, 0.12, 0).rotateX(0.45).rotateY((i / 6) * TAU + 0.3));
  return { petals: lib.flat(...petals), heart: new THREE.CylinderGeometry(0.06, 0.045, 0.06, 8).translate(0, 0.06, 0) };
}

function build({ plan, shape, r, waterLevel, lib }) {
  const group = new THREE.Group();
  const updaters = [];
  const floating = []; // (left out of the lake's reflection)
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
  const lake = shape.lake;
  if (!plan || !lake) return null;
  const level = (lake.level ?? waterLevel) + 0.015;

  if (plan.gate) {
    const { x, z, yaw } = plan.gate;
    let base = Infinity;
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * TAU, d = k === 8 ? 0 : 1.2;
      base = Math.min(base, shape.heightAt(x + Math.cos(a + yaw) * d, z + Math.sin(a + yaw) * d * 0.3));
    }
    const parts = moonGate(lib);
    const gate = new THREE.Group();
    for (const [geo, material] of [[parts.body, mat('#f0eadf')], [parts.trim, mat('#8f8c86')], [parts.roof, mat('#4f5a5a')]]) {
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = mesh.receiveShadow = true;
      gate.add(mesh);
    }
    gate.position.set(x, base - 0.04, z);
    gate.rotation.y = yaw;
    group.add(gate);
  }

  const stone = mat('#a29f96');
  for (const k of plan.rocks) {
    const rock = new THREE.Mesh(rockGeometry(r), stone);
    rock.scale.set(k.s, k.h * 0.5, k.s);
    rock.position.set(k.x, shape.heightAt(k.x, k.z) - 0.1, k.z);
    rock.rotation.y = k.turn;
    rock.castShadow = rock.receiveShadow = true;
    group.add(rock);
  }

  // The zigzag bridge: boards, red rails, and posts down into the water.
  const red = [], boards = [], posts = [];
  const deck = level + 0.2;
  const { bridge, pavilion } = plan;
  const segments = [];
  for (let i = 1; i < bridge.length; i++) {
    const a = bridge[i - 1], b = bridge[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z) + 0.12, yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const y = i === 1 ? Math.max(deck, (shape.heightAt(a.x, a.z) + deck) / 2) : deck;
    segments.push({ a, b });
    boards.push(new THREE.BoxGeometry(0.5, 0.05, len).rotateY(yaw).translate(mx, y, mz));
    for (const side of [-1, 1]) {
      const ox = Math.cos(yaw) * side * 0.24, oz = -Math.sin(yaw) * side * 0.24;
      red.push(new THREE.BoxGeometry(0.035, 0.035, len).rotateY(yaw).translate(mx + ox, y + 0.36, mz + oz));
      for (let k = 0; k <= 3; k++) {
        const f = k / 3 - 0.5, px = mx + Math.sin(yaw) * f * len + ox, pz = mz + Math.cos(yaw) * f * len + oz;
        red.push(new THREE.BoxGeometry(0.04, 0.36, 0.04).translate(px, y + 0.18, pz));
      }
    }
    posts.push(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5).translate(b.x, level - 0.1, b.z));
  }
  // The pavilion at the end: a platform, six red posts and a tiled roof.
  if (pavilion) {
    const { x, z } = pavilion;
    boards.push(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 6).translate(x, deck, z));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      red.push(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6).translate(x + Math.cos(a) * 0.68, deck + 0.5, z + Math.sin(a) * 0.68));
      posts.push(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5).translate(x + Math.cos(a) * 0.7, level - 0.1, z + Math.sin(a) * 0.7));
    }
    const roof = lib.flat(
      new THREE.ConeGeometry(1.15, 0.14, 6).translate(0, 1.04, 0),
      new THREE.ConeGeometry(0.95, 0.55, 6).translate(0, 1.32, 0),
    ).rotateY(Math.PI / 6).translate(x, deck, z);
    const tiles = new THREE.Mesh(roof, mat('#3f5a52'));
    tiles.castShadow = true;
    group.add(tiles);
    const finial = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0).translate(x, deck + 1.66, z), mat('#d8b04a', { metalness: 0.5, roughness: 0.4 }));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 1.25, 1).translate(x, deck + 0.82, z), mat('#ff6a3a', { emissive: '#ff5a2a', emissiveIntensity: 0.6 }));
    group.add(finial, lamp);
    updaters.push((time, dt, env) => {
      lamp.material.emissiveIntensity = 0.5 + env.gloom * 2.5;
    });
  }
  for (const [geos, material] of [[boards, mat('#8a5a3a')], [red, mat('#c23b2e')], [posts, mat('#4a3020')]]) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(lib.flat(...geos), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Lotus everywhere on the pond, clear of the bridge: giant rimmed pads, ordinary
  // notched ones, leaves held up on stalks, and flowers above them all.
  const offBridge = (x, z, room) => !segments.some(({ a, b }) => {
    const dx = b.x - a.x, dz = b.z - a.z, k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a.x - dx * k, z - a.z - dz * k) < room + 0.35;
  }) && !(pavilion && Math.hypot(x - pavilion.x, z - pavilion.z) < room + 1);
  const spots = [];
  for (let i = 0; i < 1400 && spots.length < 70; i++) {
    const a = r.range(0, TAU), d = Math.sqrt(r()) * 5.5;
    const x = lake.x + Math.cos(a) * d, z = lake.z + Math.sin(a) * d;
    const kind = r.weighted([['giant', 3], ['pad', 4], ['leaf', 2], ['flower', 2]]);
    const size = kind === 'giant' ? r.range(0.5, 0.85) : kind === 'pad' ? r.range(0.28, 0.45) : r.range(0.3, 0.5);
    if (shape.waterAt(x, z, -(size * 0.8 + 0.1)) !== lake || !offBridge(x, z, size)) continue;
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < (p.size + size) * 0.92)) continue;
    spots.push({ x, z, kind, size, turn: r.range(0, TAU), phase: r.range(0, TAU), tall: r.range(0.35, 0.8) });
  }
  const of = (kind) => spots.filter((p) => p.kind === kind);
  const giants = of('giant'), pads = of('pad'), leaves = of('leaf'), flowers = of('flower');
  const green = ['#4f8a3a', '#5a9a40', '#467f34', '#6aa84a'];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  const instanced = (geo, material, list, colors) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((item, i) => mesh.setColorAt(i, c.set(r.pick(colors)).offsetHSL(0, 0, r.range(-0.03, 0.03))));
    mesh.receiveShadow = true;
    group.add(mesh);
    floating.push(mesh);
    return mesh;
  };
  const leafMat = mat('#ffffff', { side: THREE.DoubleSide });
  // A giant pad with its rim turned up, like a tray; an ordinary pad with a notch.
  const tray = lib.flat(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.CylinderGeometry(1.02, 1, 0.09, 20, 1, true).translate(0, 0.045, 0));
  const notched = new THREE.CircleGeometry(1, 14, 0.3, TAU - 0.3).rotateX(-Math.PI / 2);
  // A leaf on a stalk, cupped like a shallow bowl.
  const bowl = lib.flat(new THREE.ConeGeometry(1, 0.28, 14, 1, true).rotateX(Math.PI).translate(0, 0.14, 0), new THREE.CylinderGeometry(0.03, 0.04, 1, 4).translate(0, -0.5, 0).scale(0.4, 1, 0.4));
  const stalk = new THREE.CylinderGeometry(0.014, 0.018, 1, 4).translate(0, 0.5, 0);
  const { petals, heart } = flowerGeometry(lib);
  const giantMesh = instanced(tray, leafMat, giants, green);
  const padMesh = instanced(notched, leafMat, pads, green);
  const leafMesh = instanced(bowl, leafMat, leaves, green);
  const stalkMesh = instanced(stalk, mat('#5a8a3a'), [...leaves, ...flowers], ['#ffffff']);
  const petalMesh = instanced(petals, mat('#ffffff', { emissive: '#40101c', emissiveIntensity: 0.25 }), flowers, ['#f7a8c4', '#f49ab8', '#fbd0de', '#ffffff', '#f080a8']);
  const heartMesh = instanced(heart, mat('#e8c83a'), flowers, ['#ffffff']);
  const place = (time) => {
    const bob = (item) => Math.sin(time * 0.8 + item.phase) * 0.006;
    for (const [mesh, list] of [[giantMesh, giants], [padMesh, pads]]) {
      if (!mesh) continue;
      list.forEach((item, i) => {
        m.compose(p.set(item.x, level + bob(item), item.z), q.setFromAxisAngle(up, item.turn), s.set(item.size, 1, item.size));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    const raised = [...leaves, ...flowers];
    raised.forEach((item, i) => {
      const sway = Math.sin(time * 1.1 + item.phase) * 0.02;
      const h = item.kind === 'flower' ? item.tall + 0.15 : item.tall;
      m.compose(p.set(item.x + sway, level, item.z), q.identity(), s.set(1, h, 1));
      stalkMesh.setMatrixAt(i, m);
      if (item.kind === 'leaf') {
        m.compose(p.set(item.x + sway, level + h, item.z), q.setFromAxisAngle(up, item.turn), s.set(item.size, item.size, item.size));
        leafMesh.setMatrixAt(leaves.indexOf(item), m);
      } else {
        m.compose(p.set(item.x + sway, level + h, item.z), q.setFromAxisAngle(up, item.turn), s.setScalar(item.size * 2.2));
        const k = flowers.indexOf(item);
        petalMesh.setMatrixAt(k, m);
        heartMesh.setMatrixAt(k, m);
      }
    });
    for (const mesh of [stalkMesh, leafMesh, petalMesh, heartMesh]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  updaters.push((time) => place(time));

  return {
    object: group,
    mirrorHide: floating,
    update(time, dt, env) {
      for (const update of updaters) update(time, dt, env);
    },
  };
}

export default {
  id: 'lotus',
  island: {
    biome: {
      label: 'lotus garden',
      grass: ['#5f9f52', '#86b86a'], dirt: '#7a5e44', rock: ['#9a9890', '#77756e'], sand: '#d8cfa8',
      hills: 1.3, peak: 1.0,
      water: { color: '#3f8f7a', opacity: 0.88 }, lake: 1, bigLake: 4.5, river: 0.3,
      flora: { kind: 'willow', count: 30, groves: -0.1, colors: ['#5a9a3c', '#6aaa48', '#4f8f36'] },
      tufts: ['#ffffff', '#ff9ec0', '#ffd84a'],
      landmark: [['teahouse', 3], ['shrine', 2]], path: '#c8b48a',
      weather: [['clear', 3], ['mist', 2], ['rain', 2], ['cloudy', 1]],
      ambient: ['petals', 'fireflies'],
    },
    species: [['willow', 4], ['round', 1], ['bamboo', 1], ['pine', 1]],
    grass: { density: 0.9 },
    neighbours: [['frog', 2, 4], ['flamingo', 2, 3]],
    furniture: { plan, build },
    word: {
      id: 'koi', name: t('lotus and koi words call lotus gardens'),
      line: t('A big still pond full of lotus, a red bridge zigzagging out to a pavilion, and a round gate in a white wall looking over it all.'),
      words: 'lotus lotuses koi carp goldfish lilypad lilypads waterlily waterlilies pagoda pagodas pavilion pavilions jade moongate',
      roots: 'lotus goldfish waterlil pagoda',
    },
    note: t('The koi in the lotus garden are older than me. Feed them, and the pond feeds you twice over.'),
    journal: ['🪷', 'lotus garden', 'say something about koi on a voyage'],
    trees: [{ food: 1, glimmer: 1 }, t('lotus seeds')],
    reach: [[0, 1], [1, 1]],
    air: -1,
    // The pond gives double.
    gather(kind, gain) {
      if (kind !== 'splash') return undefined;
      gain.food *= 2;
      return t('lotus root and a fish');
    },
  },
};
