import * as THREE from 'three';
import { t } from '../i18n.js';

// Jellyfish shallows: sky-jellies drift and pulse in the air over a shallow
// turquoise lake, glowing softly after dark. They're friendly, and there's
// always something shiny caught in them.

const TAU = Math.PI * 2;

function build({ top, hooks, bursts, r }) {
  const rim = top.rings[top.rings.length - 1];
  const reach = Math.max(...rim.map((v) => Math.hypot(v.x, v.z)));
  const jellies = Array.from({ length: r.int(16, 22) }, () => {
    const a = r.range(0, TAU), d = Math.sqrt(r()) * reach * 0.7;
    return {
      x: Math.cos(a) * d, z: Math.sin(a) * d, y: r.range(2.2, 5.5), drift: r.range(0.5, 1.6), speed: r.range(0.05, 0.12) * (r.chance(0.5) ? 1 : -1),
      size: r.range(1.5, 2.6), phase: r.range(0, TAU), tapped: -99,
      color: r.pick(['#ff9ad5', '#c89aff', '#8ae0ff', '#ffc2e8', '#a8f0e0']),
    };
  });
  // A bell, and tentacles trailing under it.
  const bell = new THREE.SphereGeometry(0.28, 12, 6, 0, TAU, 0, Math.PI * 0.55).scale(1, 0.8, 1);
  const arms = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * TAU, len = 0.45 + (i % 3) * 0.15;
    return new THREE.ConeGeometry(0.02, len, 3).rotateX(Math.PI).translate(Math.cos(a) * 0.17, -len / 2 + 0.02, Math.sin(a) * 0.17);
  });
  const parts = [bell, ...arms].map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(parts.flatMap((g) => [...g.attributes.position.array]), 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#5a3a8a', emissiveIntensity: 0.3, transparent: true, opacity: 0.72, flatShading: true, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, jellies.length);
  mesh.frustumCulled = false;
  const col = new THREE.Color();
  jellies.forEach((j, i) => mesh.setColorAt(i, col.set(j.color)));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let now = 0;
  const where = (j, time) => {
    const a = j.phase + time * j.speed;
    return p.set(j.x + Math.cos(a) * j.drift, j.y + Math.sin(time * 0.6 + j.phase) * 0.25, j.z + Math.sin(a) * j.drift);
  };
  mesh.userData.onClick = (hit) => {
    const j = jellies[hit.instanceId];
    if (!j) return;
    j.tapped = now;
    hooks.sound('pop');
    hooks.note('jelly');
    bursts.spawn(where(j, now).clone(), { count: 18, colors: [j.color, '#ffffff'], glow: true, speed: 0.8, up: 0.6, gravity: -0.6, life: 1.4 });
  };
  return {
    object: mesh,
    clickables: [mesh],
    mirrorHide: [mesh],
    update(time, dt, env) {
      now = time;
      mat.emissiveIntensity = 0.3 + env.night * 1.4;
      jellies.forEach((j, i) => {
        // A slow pulse, and a quick squeeze when you tap one.
        const squeeze = Math.max(0, 1 - (time - j.tapped) / 0.6);
        const pulse = Math.sin(time * 2.2 + j.phase);
        s.set(1 + pulse * 0.06 + squeeze * 0.2, 1 - pulse * 0.1 - squeeze * 0.25, 1 + pulse * 0.06 + squeeze * 0.2).multiplyScalar(j.size);
        m.compose(where(j, time), q.setFromAxisAngle(up, time * 0.2 + j.phase), s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export default {
  id: 'jelly',
  island: {
    biome: {
      label: 'jellyfish shallows',
      grass: ['#d8d0a0', '#e8e0b8'], dirt: '#c8b088', rock: ['#c8b8a0', '#a89880'], sand: '#f4ecd0',
      hills: 1.0, peak: 0.7,
      water: { color: '#2ad0c8', opacity: 0.78 }, lake: 1, bigLake: 2.6, river: 0.2,
      flora: { kind: 'palm', count: 22, groves: -0.2, colors: ['#3f8f3a', '#4ea045'] },
      tufts: ['#ffffff', '#9ad8ff'],
      landmark: [['lighthouse', 3], ['campsite', 1]], path: '#f0e4c0',
      weather: [['clear', 4], ['cloudy', 2], ['rain', 1]],
      ambient: [],
    },
    species: [['palm', 3], ['bush', 2], ['fern', 1]],
    grass: { density: 0.25, tip: '#e8e0a0' },
    neighbours: [['crab', 3, 5]],
    furniture: { build },
    word: {
      id: 'jellyfish', name: t('jellyfish words call jellyfish shallows'),
      line: t('Jellyfish drift through the air above a shallow turquoise lake, glowing softly.'),
      words: 'jellyfish jellies medusa medusae plankton anemone anemones nautilus',
      roots: 'jellyfish plankton',
    },
    note: t('The sky-jellies over the shallows are friendly, and there’s always something shiny caught in them.'),
    journal: ['🪼', 'jellyfish shallows', 'say something about jellyfish on a voyage'],
    trees: [{ food: 2 }, t('kelp and sea lettuce')],
    reach: [[0, 1], [1, 1]],
    tapLabel: t('jellyfish'),
    // The first three jellies you tap on an island each let go of a coin.
    taps: {
      jelly: (g) => {
        const seen = g.flag('jellies')?.word === g.run.here.word ? g.flag('jellies').n : 0;
        if (seen >= 3) return t('The jellies bob about, but they’ve nothing left to give.');
        g.mark('jellies', { word: g.run.here.word, n: seen + 1 });
        return t('A jellyfish lets go of a coin it had caught: {got}', { got: g.give({ glimmer: 1 }) });
      },
    },
  },
};
