import * as THREE from 'three';
import { t } from '../i18n.js';

// Sunflower hill: fields of sunflowers that turn to follow the real sun across
// the sky, and droop their heads at night. By day the seeds are best.

const TAU = Math.PI * 2;

// A few round fields on gentle, dry ground, filled with flowers in loose rows.
function plan({ shape, spots, taken, r }) {
  const fields = [];
  for (const v of spots) {
    if (fields.length >= 4) break;
    if (shape.radial(v.x, v.z) > 0.7 || taken(v.x, v.z) || shape.isWet(v.x, v.z, 1)) continue;
    const radius = r.range(1.8, 3);
    if (fields.some((f) => Math.hypot(f.x - v.x, f.z - v.z) < f.radius + radius + 0.6)) continue;
    fields.push({ x: v.x, z: v.z, radius });
  }
  const flowers = [];
  for (const f of fields) {
    for (let gx = -f.radius; gx <= f.radius; gx += 0.48) {
      for (let gz = -f.radius; gz <= f.radius; gz += 0.48) {
        const x = f.x + gx + r.range(-0.1, 0.1), z = f.z + gz + r.range(-0.1, 0.1);
        if (Math.hypot(x - f.x, z - f.z) > f.radius || taken(x, z) || shape.isWet(x, z, 0.3) || shape.slopeAt(x, z) > 0.55 || shape.radial(x, z) > 0.9) continue;
        flowers.push({ x, z, h: r.range(1, 1.5), phase: r.range(0, TAU) });
      }
    }
  }
  return { fields, flowers: flowers.slice(0, 260), blocked: (x, z) => fields.some((f) => Math.hypot(x - f.x, z - f.z) < f.radius + 0.2) };
}

function build({ plan, shape, r, hooks, bursts, local, lib }) {
  const { flowers } = plan;
  if (!flowers.length) return null;
  const group = new THREE.Group();
  // A stem with two leaves, a unit tall (each flower is scaled to its height).
  const stemGeo = lib.flat(
    new THREE.CylinderGeometry(0.018, 0.026, 1, 5).translate(0, 0.5, 0),
    new THREE.ConeGeometry(0.07, 0.22, 4).rotateZ(-1.1).scale(1, 1, 0.3).translate(0.08, 0.45, 0),
    new THREE.ConeGeometry(0.06, 0.2, 4).rotateZ(1.1).scale(1, 1, 0.3).translate(-0.07, 0.62, 0),
  );
  // A head facing +z: a dark middle in a ring of yellow petals.
  const petals = Array.from({ length: 12 }, (_, i) => new THREE.ConeGeometry(0.045, 0.14, 3).translate(0, 0.15, 0).rotateZ((i / 12) * TAU).scale(1, 1, 0.25));
  const ring = lib.flat(...petals);
  const middle = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10).rotateX(Math.PI / 2).translate(0, 0, 0.012);
  const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
  const stems = new THREE.InstancedMesh(stemGeo, mat('#5a8a32'), flowers.length);
  const heads = new THREE.InstancedMesh(ring, mat('#f2c22a', { emissive: '#3a2a00', emissiveIntensity: 0.3 }), flowers.length);
  const hearts = new THREE.InstancedMesh(middle, mat('#5a3a1a'), flowers.length);
  stems.material.userData.wind = true;
  for (const mesh of [stems, heads, hearts]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), s = new THREE.Vector3(), p = new THREE.Vector3();
  const tops = flowers.map((f) => new THREE.Vector3(f.x, shape.heightAt(f.x, f.z) - 0.04, f.z));
  tops.forEach((base, i) => {
    m.compose(base, q.identity(), s.set(1, flowers[i].h, 1));
    stems.setMatrixAt(i, m);
  });
  stems.instanceMatrix.needsUpdate = true;

  // Where the heads point (turning slowly, so a jump in the sky doesn't snap them round).
  let yaw = r.range(0, TAU), pitch = 0, droop = 0;
  const pose = (time) => {
    flowers.forEach((f, i) => {
      const sway = Math.sin(time * 1.3 + f.phase) * 0.05;
      p.copy(tops[i]).y += f.h;
      e.set(pitch + droop + sway * 0.5, yaw + sway, 0);
      m.compose(p, q.setFromEuler(e), s.setScalar(1.5 + f.h * 0.4));
      heads.setMatrixAt(i, m);
      hearts.setMatrixAt(i, m);
    });
    heads.instanceMatrix.needsUpdate = true;
    hearts.instanceMatrix.needsUpdate = true;
  };
  pose(0);

  const onClick = (hit) => {
    const at = local(hit);
    hooks.sound('rustle');
    hooks.note('tree');
    bursts.spawn(at, { count: 14, colors: ['#f2c22a', '#ffd84a'], speed: 0.8, up: 0.8, gravity: -1, life: 1.8, drag: 2.2, spread: 0.3 });
  };
  for (const mesh of [stems, heads, hearts]) mesh.userData.onClick = onClick;

  return {
    object: group,
    clickables: [heads, hearts, stems],
    mirrorHide: [group],
    update(time, dt, env) {
      const sun = env.sunDir;
      if (sun) {
        // Face the sun's bearing, tilting up toward it while it's high.
        const want = Math.atan2(sun.x, sun.z);
        const turn = ((want - yaw + Math.PI * 3) % TAU) - Math.PI;
        yaw += turn * Math.min(1, dt * 0.8);
        // (Never more than a little way up, so you still see their faces.)
        pitch += (-Math.max(0, Math.min(0.45, Math.asin(Math.max(-1, Math.min(1, sun.y))) * 0.5)) - pitch) * Math.min(1, dt * 0.8);
      }
      droop += ((env.night > 0.5 ? 0.9 : 0) - droop) * Math.min(1, dt * 0.5);
      pose(time);
    },
  };
}

export default {
  id: 'sunflower',
  island: {
    biome: {
      label: 'sunflower hill',
      grass: ['#7aa84a', '#a0c060'], dirt: '#8a6a40', rock: ['#9a8a74', '#7a6c5c'], sand: '#e8d8a0',
      hills: 2.2, peak: 1.4,
      water: { color: '#4a9ad0', opacity: 0.84 }, lake: 0.5, river: 0.4,
      flora: { kind: 'round', count: 18, groves: 0.1, colors: ['#4a8a3a', '#5a9a42', '#6aa84a'] },
      tufts: ['#ffd23a', '#ffffff'],
      landmark: [['windmill', 3], ['cabin', 2], ['village', 1]], path: '#c8a86a',
      weather: [['clear', 6], ['cloudy', 2], ['rain', 1]],
      ambient: [],
    },
    species: [['round', 2], ['oak', 2], ['poplar', 1]],
    grass: { density: 1, tip: '#d8c860' },
    neighbours: [['sheep', 1, 3]],
    furniture: { plan, build },
    word: {
      id: 'sunflower', name: t('sunflower words call sunflower hills'),
      line: t('A whole hillside of sunflowers, every one of them turned to the sun.'),
      words: 'sunflower sunflowers marigold marigolds',
      roots: 'sunflower marigold',
    },
    note: t('Sunflowers follow the sun all day. Go by daylight: the seeds are best then.'),
    journal: ['🌼', 'sunflower hill', 'say something about sunflowers on a voyage'],
    trees: [{ food: 2 }, t('sunflower seeds')],
    reach: [[0, 2]],
    air: 1,
    // By day the trees and flowers give a little more.
    gather(kind, gain, g) {
      if (kind !== 'tree' || g.night) return undefined;
      gain.food = (gain.food ?? 0) + 1;
      return t('sunflower seeds, warm from the sun');
    },
  },
};
