import * as THREE from 'three';
import { t } from '../i18n.js';

// Geyser flats: white mineral mounds that steam all day and blow every ten
// seconds or so. Tap one just as it blows and it throws the balloon on its way:
// three more miles on your next flight.

const TAU = Math.PI * 2;
const BLOW = 2.4; // seconds a geyser blows
const RUMBLE = 1.2; // seconds of bubbling before it does

function plan({ shape, spots, taken, r }) {
  const vents = [];
  const want = r.int(5, 7);
  for (const v of spots) {
    if (vents.length >= want) break;
    const rn = shape.radial(v.x, v.z);
    if (rn < 0.12 || rn > 0.8 || taken(v.x, v.z) || shape.isWet(v.x, v.z, 0.8) || shape.slopeAt(v.x, v.z) > 0.35) continue;
    if (vents.some((p) => Math.hypot(p.x - v.x, p.z - v.z) < 2.6)) continue;
    vents.push({ x: v.x, z: v.z, size: r.range(0.95, 1.45), period: r.range(8, 13), offset: r.range(0, 14) });
  }
  return { vents, blocked: (x, z) => vents.some((p) => Math.hypot(x - p.x, z - p.z) < 1.05 * p.size) };
}

function build({ plan, shape, hooks, bursts, clock, lib }) {
  const { vents } = plan;
  if (!vents.length) return null;
  const group = new THREE.Group();
  const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });
  const sinter = [mat('#d88a4a'), mat('#e8c890'), mat('#f2ecdc')];
  const water = mat('#3fd0d0', { emissive: '#0a5a60', emissiveIntensity: 0.4, roughness: 0.2 });
  const puffMat = new THREE.MeshStandardMaterial({ color: '#f4f6f8', flatShading: true, transparent: true, opacity: 0.55, depthWrite: false });
  const PUFFS = 34; // per vent: 8 drifting all the time, 26 for the blow
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), puffMat, vents.length * PUFFS);
  puffs.frustumCulled = false;
  group.add(puffs);
  const clickables = [];
  const pools = [];
  for (const v of vents) {
    const y = shape.heightAt(v.x, v.z);
    const vent = new THREE.Group();
    vent.position.set(v.x, y - 0.06, v.z);
    // Terraces of mineral crust, orange at the edge and white at the top.
    [[1, 0.12], [0.72, 0.24], [0.45, 0.34]].forEach(([k, h], i) => {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(k * v.size * 0.92, k * v.size, h, 14).translate(0, h / 2 - 0.02, 0), sinter[i]);
      step.castShadow = step.receiveShadow = true;
      vent.add(step);
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.22 * v.size, 12).rotateX(-Math.PI / 2).translate(0, 0.345, 0), water);
    vent.add(pool);
    pools.push(pool);
    group.add(vent);
    v.top = new THREE.Vector3(v.x, y + 0.3, v.z);
    // Tap it as it blows for a ride; any other time it only steams.
    vent.userData.onClick = () => {
      const blowing = phaseOf(v, clock()) < BLOW;
      hooks.sound(blowing ? 'whoosh' : 'pop');
      hooks.note(blowing ? 'geyser' : 'steam');
      bursts.spawn(v.top, blowing
        ? { count: 24, colors: ['#e8f6ff', '#ffffff', '#9fe8f0'], speed: 1.2, up: 4, gravity: -6, life: 1.2, drag: 0.4 }
        : { count: 8, colors: ['#ffffff'], speed: 0.4, up: 0.8, gravity: -1, life: 0.8 });
    };
    clickables.push(vent);
  }
  const phaseOf = (v, time) => (time + v.offset) % v.period;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    object: group,
    clickables,
    update(time, dt, env) {
      vents.forEach((v, i) => {
        const phase = phaseOf(v, time);
        const blowing = phase < BLOW, rumble = phase > v.period - RUMBLE;
        // A burst of spray as each one goes up.
        if (blowing && !v.was) bursts.spawn(v.top, { count: 26, colors: ['#e8f6ff', '#ffffff', '#9fe8f0'], speed: 1.4, up: 5, gravity: -7, life: 1.4, drag: 0.4 });
        v.was = blowing;
        pools[i].scale.setScalar(rumble ? 1 + Math.sin(time * 30) * 0.12 : 1);
        for (let k = 0; k < PUFFS; k++) {
          const slot = i * PUFFS + k;
          if (k < 8) {
            // Steam drifting off the pool, leaning with the wind.
            const life = ((time * 0.25 + k / 8 + v.offset) % 1);
            p.set(v.x + life * 0.5 * (1 + env.wind * 0.3) + Math.sin(life * 6 + k) * 0.08, v.top.y + life * 1.6, v.z + Math.cos(life * 5 + k) * 0.08);
            s.setScalar((0.6 + life * 2.2) * (1 - life) * 1.4);
          } else if (blowing) {
            // The column: puffs thrown up fast, spreading as they rise.
            const life = ((phase / BLOW) * 1.6 + (k - 8) / 26) % 1;
            const a = k * 2.4;
            p.set(v.x + Math.cos(a) * life * 0.6 + env.wind * life * 0.4, v.top.y + life * 6 * v.size, v.z + Math.sin(a) * life * 0.6);
            s.setScalar((1 + life * 3.2) * Math.min(1, (BLOW - phase) * 2));
          } else s.setScalar(0);
          m.compose(p, q, s);
          puffs.setMatrixAt(slot, m);
        }
      });
      puffs.instanceMatrix.needsUpdate = true;
    },
  };
}

export default {
  id: 'geyser',
  island: {
    biome: {
      label: 'geyser flats',
      grass: ['#a8a878', '#c0b888'], dirt: '#b89a6a', rock: ['#d8cfc0', '#b0a490'], sand: '#efe6d0',
      hills: 1.2, peak: 1.0,
      water: { color: '#3fc8c8', opacity: 0.82 }, lake: 0.7, river: 0.2,
      flora: { kind: 'shrub', count: 16, groves: -0.3, colors: ['#8a8a4a', '#9a9455'] },
      tufts: ['#f0e8d0', '#e8a060'],
      landmark: [['bathhouse', 3], ['campsite', 1], ['stones', 1]], path: '#d8ccb0',
      weather: [['clear', 3], ['mist', 3], ['cloudy', 2]],
      ambient: [],
    },
    species: [['shrub', 3], ['dead', 2], ['bush', 1]],
    grass: { density: 0.3, tip: '#e0d8b0' },
    neighbours: [['lizard', 1, 3, '#c8b890']],
    furniture: { plan, build },
    word: {
      id: 'geyser', name: t('geyser words call geyser flats'),
      line: t('Steam drifts across white mineral flats, and every so often the ground shouts.'),
      words: 'geyser geysers fumarole fumaroles sinter mudpot mudpots',
      roots: 'geyser fumarol',
    },
    note: t('Catch a geyser as it blows and it throws you miles. Miss it and you just get wet.'),
    journal: ['💨', 'geyser flats', 'say something about geysers on a voyage'],
    trees: [{ fuel: 1, food: 1 }, t('dry scrub and a few nuts')],
    reach: [[1, 2], [2, 1]],
    tapLabel: t('geysers'),
    taps: {
      geyser: (g) => {
        if (g.flag('geyser') === g.run.here.word) return t('Another soaking. You’ve already caught your ride: the geyser will throw you on when you go.');
        g.mark('geyser', g.run.here.word);
        return t('Whoosh! You catch the geyser as it blows: +3 miles on your next flight.');
      },
      steam: (g) => (g.flag('geyser') === g.run.here.word
        ? t('Steam and a rumble. You’ve already caught your ride.')
        : t('Steam, and a rumble underground. Tap it just as it blows.')),
    },
    // The ride you caught carries you on, from this island only.
    hop: (reading, g) => (g.flag('geyser') === g.run.here?.word ? [3, t('the geyser')] : null),
    // The hot pools boil your eggs for you.
    gather: (kind) => (kind === 'splash' ? t('eggs boiled in a hot pool') : undefined),
  },
};
