import * as THREE from 'three';
import { t } from '../i18n.js';

// The stone forest: pillars of grey stone rise out of the mist, taller than
// towers, with pines clinging to their tops. The wind runs straight between them,
// so long words carry further from here.

const TAU = Math.PI * 2;

function plan({ shape, spots, taken, r }) {
  const pillars = [];
  const want = r.int(10, 15);
  for (const v of spots) {
    if (pillars.length >= want) break;
    const rn = shape.radial(v.x, v.z);
    if (rn < 0.12 || rn > 0.86 || shape.isWet(v.x, v.z, 0.7)) continue;
    const radius = r.range(0.4, 0.85);
    let clear = !taken(v.x, v.z);
    for (let k = 0; k < 6 && clear; k++) {
      const a = (k / 6) * TAU;
      clear = !taken(v.x + Math.cos(a) * (radius + 0.4), v.z + Math.sin(a) * (radius + 0.4));
    }
    if (!clear || pillars.some((p) => Math.hypot(p.x - v.x, p.z - v.z) < p.radius + radius + 0.7)) continue;
    pillars.push({ x: v.x, z: v.z, radius, height: r.range(3.2, 7.2) });
  }
  return { pillars, blocked: (x, z) => pillars.some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 0.35) };
}

// Knock a drum's sides about a little, so it looks like weathered rock. (By
// position, so the copies of a vertex along the seam move together: no cracks.)
function craggy(geo, r) {
  const pos = geo.attributes.position, seed = r() * 100;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + Math.sin(Math.atan2(z, x) * 3 + y * 7 + seed) * 0.08 + Math.sin(Math.atan2(z, x) * 7 - y * 3 + seed) * 0.05;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  return geo;
}

function build({ plan, shape, r, lib }) {
  const bands = [[], [], []];
  const green = [];
  for (const p of plan.pillars) {
    // Its foot sits at the lowest ground around it, so it never floats.
    let base = Infinity;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      base = Math.min(base, shape.heightAt(p.x + Math.cos(a) * p.radius, p.z + Math.sin(a) * p.radius));
    }
    base -= 0.3;
    // Stacked, slightly crooked drums of stone, narrowing a little toward the top.
    const drums = r.int(6, 9);
    let y = base, x = p.x, z = p.z;
    const top = base + 0.3 + p.height;
    for (let i = 0; i < drums; i++) {
      const h = (top - base) / drums;
      const k = 1 - (i / drums) * 0.3;
      const rb = p.radius * k * r.range(0.85, 1.15), rt = p.radius * (k - 0.05) * r.range(0.8, 1.1);
      const drum = craggy(new THREE.CylinderGeometry(rt, rb, h * 1.04, 7, 2), r).rotateY(r.range(0, TAU)).translate(x, y + h / 2, z);
      bands[i % 3].push(drum);
      // Now and then a bush clings to a ledge.
      if (i > 1 && r.chance(0.3)) {
        const a = r.range(0, TAU);
        green.push(new THREE.IcosahedronGeometry(rt * 0.45, 0).scale(1, 0.6, 1).translate(x + Math.cos(a) * rt * 0.95, y + h, z + Math.sin(a) * rt * 0.95));
      }
      x += r.range(-0.1, 0.1);
      z += r.range(-0.1, 0.1);
      y += h;
    }
    // A cap of rock, and a pine or two up there in the wind.
    bands[0].push(new THREE.IcosahedronGeometry(p.radius * 0.72, 0).scale(1, 0.35, 1).translate(x, top, z));
    for (let n = r.int(1, 3); n > 0; n--) {
      const a = r.range(0, TAU), d = r.range(0, p.radius * 0.45), s = r.range(0.7, 1.1);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      green.push(
        new THREE.ConeGeometry(0.2 * s, 0.42 * s, 6).translate(px, top + 0.28 * s, pz),
        new THREE.ConeGeometry(0.14 * s, 0.34 * s, 6).translate(px, top + 0.5 * s, pz),
      );
    }
    if (r.chance(0.6)) green.push(new THREE.IcosahedronGeometry(p.radius * 0.35, 0).scale(1, 0.6, 1).translate(x + p.radius * 0.4, top + 0.08, z));
  }
  const group = new THREE.Group();
  const material = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
  ['#9a968d', '#8a867d', '#a8a49a'].forEach((color, i) => {
    if (!bands[i].length) return;
    const mesh = new THREE.Mesh(lib.flat(...bands[i]), material(color));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (green.length) {
    const mesh = new THREE.Mesh(lib.flat(...green), material('#2f6a42'));
    mesh.castShadow = true;
    mesh.material.userData.wind = true;
    group.add(mesh);
  }
  return { object: group };
}

export default {
  id: 'pillars',
  island: {
    biome: {
      label: 'stone forest',
      grass: ['#5d9a5a', '#7fae74'], dirt: '#6a5a48', rock: ['#8e8a82', '#6e6a62'], sand: '#cfc4a8',
      hills: 1.6, peak: 1.8,
      water: { color: '#3f8aa8', opacity: 0.86 }, lake: 0.5, river: 0.5,
      flora: { kind: 'pine', count: 40, groves: -0.1, colors: ['#2d6b45', '#376f4a', '#24583a'] },
      tufts: ['#ffffff', '#c9d7ff'],
      landmark: [['shrine', 2], ['stones', 2], ['wizard', 1], ['observatory', 1]], path: '#a89a80',
      weather: [['mist', 4], ['cloudy', 2], ['clear', 2], ['rain', 1]],
      ambient: [],
    },
    species: [['pine', 4], ['fir', 1], ['bush', 1]],
    grass: { density: 0.75 },
    neighbours: [['goat', 2, 4]],
    furniture: { plan, build },
    word: {
      id: 'pinnacle', name: t('pinnacle words call stone forests'),
      line: t('Stone pillars rise out of the mist, taller than towers, with pines clinging to their tops.'),
      words: 'pinnacle pinnacles karst spire spires hoodoo hoodoos zhangjiajie guilin',
      roots: 'pinnacl karst hoodoo',
    },
    note: t('Between the stone pillars the wind runs straight. Long words carry furthest from there.'),
    journal: ['🗻', 'stone forest', 'say something about pinnacles on a voyage'],
    trees: [{ fuel: 2, food: 1 }, t('pine nuts and dry needles')],
    reach: [[1, 2], [2, 1]],
    // A long word (seven letters or more) rides the wind between the pillars.
    hop: (reading) => (reading.word.length >= 7 ? [2, t('the wind between the pillars')] : null),
  },
};
