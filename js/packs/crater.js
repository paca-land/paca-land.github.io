import * as THREE from 'three';
import { t } from '../i18n.js';

// The starfall crater: a scorched hollow ringed with tumbled rock, where a star
// came down long ago and still glows, under a sky that's always full of stars.
// Wish on a fallen star, and your next word flies free.

const TAU = Math.PI * 2;
const R = 1.9; // the crater

function plan({ shape, spots, taken, r }) {
  let crater = null;
  for (const v of spots) {
    if (shape.radial(v.x, v.z) > 0.6 || shape.isWet(v.x, v.z, R + 0.6) || shape.slopeAt(v.x, v.z) > 0.4) continue;
    let clear = !taken(v.x, v.z);
    for (let k = 0; k < 8 && clear; k++) {
      const a = (k / 8) * TAU;
      clear = !taken(v.x + Math.cos(a) * (R + 0.3), v.z + Math.sin(a) * (R + 0.3));
    }
    if (clear) {
      crater = { x: v.x, z: v.z };
      break;
    }
  }
  // A few smaller shards flung out across the island.
  const strays = [];
  for (const v of spots) {
    if (strays.length >= r.int(4, 7)) break;
    if (taken(v.x, v.z) || shape.isWet(v.x, v.z, 0.4) || (crater && Math.hypot(v.x - crater.x, v.z - crater.z) < R + 1)) continue;
    if (strays.some((s) => Math.hypot(s.x - v.x, s.z - v.z) < 1.5)) continue;
    strays.push({ x: v.x, z: v.z });
  }
  return {
    crater, strays,
    blocked: (x, z) => Boolean((crater && Math.hypot(x - crater.x, z - crater.z) < R + 0.3) || strays.some((s) => Math.hypot(x - s.x, z - s.z) < 0.4)),
  };
}

// A spike of starlight, standing on y = 0.
const shard = (h, w) => new THREE.OctahedronGeometry(w, 0).scale(1, h / w, 1).translate(0, h * 0.6, 0);

function build({ plan, shape, biome, r, hooks, bursts, local, lib }) {
  const group = new THREE.Group();
  const stars = [], rocks = [];
  const scorched = [];
  if (plan.crater) {
    const { x, z } = plan.crater;
    // The scorched floor, following the ground, darkest in the middle.
    const rings = 6, segs = 28, pos = [], col = [];
    const dark = new THREE.Color('#241e1c'), edge = new THREE.Color(biome.dirt);
    const point = (k, j) => {
      const d = (k / rings) * R, a = (j / segs) * TAU;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const c = dark.clone().lerp(edge, (k / rings) ** 2);
      return [px, shape.heightAt(px, pz) + 0.03, pz, c];
    };
    for (let k = 0; k < rings; k++) {
      for (let j = 0; j < segs; j++) {
        const quad = [point(k, j), point(k + 1, j), point(k + 1, j + 1), point(k, j + 1)];
        for (const i of [0, 2, 1, 0, 3, 2]) {
          pos.push(quad[i][0], quad[i][1], quad[i][2]);
          col.push(quad[i][3].r, quad[i][3].g, quad[i][3].b);
        }
      }
    }
    const floor = new THREE.BufferGeometry();
    floor.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    floor.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    floor.computeVertexNormals();
    const mesh = new THREE.Mesh(floor, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    mesh.receiveShadow = true;
    scorched.push(mesh);
    group.add(mesh);
    // Tumbled rocks round the rim, leaning outward.
    for (let i = 0, n = r.int(12, 16); i < n; i++) {
      const a = (i / n) * TAU + r.range(-0.15, 0.15), d = R + r.range(-0.1, 0.35);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      rocks.push(new THREE.IcosahedronGeometry(r.range(0.18, 0.34), 0).scale(1, r.range(0.6, 1.1), 1).rotateZ(0.4).rotateY(-a).translate(px, shape.heightAt(px, pz) + 0.05, pz));
    }
    // The fallen star: a cluster of glowing spikes in the middle.
    for (let i = 0, n = r.int(5, 8); i < n; i++) {
      const a = r.range(0, TAU), d = i ? r.range(0.1, 0.55) : 0;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      stars.push(shard(i ? r.range(0.35, 0.7) : 0.95, i ? r.range(0.07, 0.12) : 0.16).rotateZ(i ? r.range(-0.5, 0.5) : 0).rotateY(a).translate(px, shape.heightAt(px, pz) - 0.05, pz));
    }
  }
  for (const s of plan.strays) {
    stars.push(shard(r.range(0.3, 0.5), r.range(0.06, 0.09)).rotateZ(r.range(-0.6, 0.6)).rotateY(r.range(0, TAU)).translate(s.x, shape.heightAt(s.x, s.z) - 0.04, s.z));
    rocks.push(new THREE.IcosahedronGeometry(0.16, 0).scale(1.2, 0.5, 1).translate(s.x + 0.12, shape.heightAt(s.x, s.z), s.z));
  }
  if (rocks.length) {
    const mesh = new THREE.Mesh(lib.flat(...rocks), new THREE.MeshStandardMaterial({ color: '#5a5a62', flatShading: true, roughness: 0.95 }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  const light = new THREE.MeshStandardMaterial({ color: '#fff4cc', emissive: '#ffe08a', emissiveIntensity: 1, flatShading: true, roughness: 0.3 });
  const starMesh = stars.length ? new THREE.Mesh(lib.flat(...stars), light) : null;
  // A faint pillar of starlight going up from the crater, so you can see it from far off.
  let beam = null;
  if (plan.crater) {
    beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 9, 16, 1, true).translate(0, 4.5, 0), new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: 1 } },
      vertexShader: 'varying float vY; void main() { vY = position.y / 9.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uGlow; varying float vY; void main() { gl_FragColor = vec4(1.0, 0.93, 0.7, (1.0 - vY) * (1.0 - vY) * 0.22 * uGlow); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    beam.position.set(plan.crater.x, shape.heightAt(plan.crater.x, plan.crater.z), plan.crater.z);
    group.add(beam);
    scorched.push(beam);
  }
  const clickables = [];
  if (starMesh) {
    starMesh.castShadow = true;
    group.add(starMesh);
    starMesh.userData.onClick = (hit) => {
      hooks.sound('chime');
      hooks.note('star');
      bursts.spawn(local(hit), { count: 30, colors: ['#fff4cc', '#ffe08a', '#c9d7ff'], glow: true, speed: 1.3, up: 1.6, gravity: -1.2, life: 1.6 });
    };
    clickables.push(starMesh);
  }
  return {
    object: group,
    clickables,
    mirrorHide: scorched,
    update(time, dt, env) {
      light.emissiveIntensity = 0.6 + env.night * 1.6 + Math.sin(time * 1.7) * 0.25;
      if (beam) beam.material.uniforms.uGlow.value = (0.3 + env.night * 0.9) * (0.85 + Math.sin(time * 1.7) * 0.15);
    },
  };
}

export default {
  id: 'crater',
  island: {
    biome: {
      label: 'starfall crater',
      grass: ['#5a6a5a', '#728270'], dirt: '#4a4038', rock: ['#6a6a72', '#4e4e56'], sand: '#9a948a',
      hills: 1.6, peak: 1.4,
      water: { color: '#3a4a8a', opacity: 0.86 }, lake: 0.5, river: 0.3,
      flora: { kind: 'dead', count: 24, groves: 0, colors: ['#4a3e32', '#5a4a3a'] },
      tufts: ['#c8d0ff', '#ffffff'],
      landmark: [['observatory', 3], ['stones', 2], ['wizard', 1]], path: '#8a8478',
      weather: [['clear', 5], ['mist', 1]],
      ambient: ['sparkles'],
    },
    species: [['dead', 2], ['birch', 2], ['crystal', 1], ['fir', 1]],
    grass: { density: 0.5, tip: '#9aa0c0' },
    neighbours: [],
    furniture: { plan, build },
    word: {
      id: 'starfall', name: t('falling-star words call starfall craters'),
      line: t('Something fell here long ago and is still glowing: a crater full of starlight, under a sky full of stars.'),
      words: 'meteorite meteorites starfall starfalls fireball fireballs bolide bolides',
      roots: 'meteorit starfall',
    },
    note: t('Make a wish on a fallen star. Mine came true, eventually.'),
    journal: ['🌠', 'starfall crater', 'say something about meteorites on a voyage'],
    trees: [{ glimmer: 1, fuel: 1 }, t('star-scorched wood')],
    reach: [[2, 2]],
    vibe: { hours: 22.5 },
    tapLabel: t('fallen stars'),
    taps: {
      star: (g) => {
        if (g.flag('wished') === g.run.here.word) return t('The star is still warm, but you’ve had your wish.');
        g.mark('wished', g.run.here.word);
        g.run.freeNext = true;
        return t('You make a wish on the fallen star: your next word flies free.');
      },
    },
  },
};
