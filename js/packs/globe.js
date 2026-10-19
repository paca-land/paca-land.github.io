import * as THREE from 'three';
import { t } from '../i18n.js';

// The snow globe: a whole island under a dome of glass on a wooden stand, where
// it never stops snowing. Nothing from outside gets in, not even the Hush.

const TAU = Math.PI * 2;

// Glass: nearly clear face-on, catching the light at its edges.
const GLASS_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const GLASS_FRAGMENT = /* glsl */ `
  uniform float uNight;
  uniform float uShake;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    edge = edge * edge * edge;
    vec3 tint = mix(vec3(0.88, 0.94, 1.0), vec3(0.5, 0.6, 0.95), uNight);
    gl_FragColor = vec4(tint, 0.03 + edge * (0.42 + uShake * 0.3));
  }
`;

function build({ top, hooks, bursts, clock }) {
  // Just wider than the island's own rim, all the way round.
  const rim = top.rings[top.rings.length - 1];
  const reach = Math.max(...rim.map((v) => Math.hypot(v.x, v.z)));
  const low = Math.min(...rim.map((v) => v.y));
  const R = reach + 0.6;
  const group = new THREE.Group();
  const glass = new THREE.ShaderMaterial({
    uniforms: { uNight: { value: 0 }, uShake: { value: 0 } },
    vertexShader: GLASS_VERTEX, fragmentShader: GLASS_FRAGMENT,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 22, 0, TAU, 0, Math.PI / 2), glass);
  dome.position.y = low - 0.1;
  dome.renderOrder = 2;
  group.add(dome);
  // The wooden stand, with a brass band where the glass sits.
  const wood = new THREE.MeshStandardMaterial({ color: '#5a3a24', flatShading: true, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', flatShading: true, roughness: 0.35, metalness: 0.6 });
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.4, 0.8, 72, 1, true), wood);
  stand.position.y = low - 0.45;
  const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.07, 6, 96).rotateX(Math.PI / 2), brass);
  band.position.y = low - 0.06;
  for (const mesh of [stand, band]) {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Tap the stand to shake the globe: the snow whirls up.
  let shaken = -99;
  const shake = () => {
    shaken = clock();
    hooks.sound('chime');
    hooks.note('globe');
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, d = Math.random() * reach * 0.8;
      bursts.spawn(new THREE.Vector3(Math.cos(a) * d, low + 1 + Math.random() * 2, Math.sin(a) * d), { count: 18, colors: ['#ffffff', '#eef3f8'], speed: 1.4, up: 2.2, gravity: -0.6, life: 3, drag: 1.2, spread: 1 });
    }
  };
  stand.userData.onClick = shake;
  band.userData.onClick = shake;

  return {
    object: group,
    clickables: [stand, band],
    mirrorHide: [dome],
    update(time, dt, env) {
      glass.uniforms.uNight.value = env.night;
      glass.uniforms.uShake.value = Math.max(0, 1 - (clock() - shaken) / 1.5);
    },
  };
}

export default {
  id: 'globe',
  island: {
    biome: {
      label: 'snow globe',
      grass: ['#e6eef4', '#ffffff'], dirt: '#9a8f88', rock: ['#a8b0b8', '#8890a0'], sand: '#e8eef2',
      hills: 1.6, peak: 1.6,
      water: { color: '#bfe3f2', opacity: 0.96, frozen: true }, lake: 0.6, river: 0,
      flora: { kind: 'fir', count: 34, groves: 0, colors: ['#2e5a4c', '#3a6a58', '#294f44'] },
      tufts: ['#ffffff'],
      landmark: [['village', 3], ['cabin', 2], ['clocktower', 2]], path: '#d8dee4',
      weather: [['snow', 1]],
      ambient: ['sparkles'],
      cold: true,
    },
    species: [['fir', 3], ['pine', 2], ['birch', 1]],
    grass: { density: 0 },
    neighbours: [['penguin', 2, 4]],
    furniture: { build },
    word: {
      id: 'globe', name: t('snow-globe words call snow globes'),
      line: t('A glass sky curves over the whole island, and inside it the snow never stops.'),
      words: 'snowglobe snowglobes globe globes souvenir souvenirs figurine figurines ornament ornaments',
      roots: 'snowglob souvenir figurin',
    },
    note: t('Nothing gets through the glass of a snow globe. Not even the Hush.'),
    journal: ['☃️', 'snow globe', 'say something about souvenirs on a voyage'],
    trees: [{ fuel: 2 }, t('pinecones')],
    reach: [[1, 1], [2, 2]],
    vibe: { weather: 'snow' },
    tapLabel: t('the glass'),
    // The Hush can't follow you in.
    arrive(g) {
      if (g.run.hush === null) return '';
      g.hushBack(3);
      return `❄️ ${t('Nothing gets in through the glass, not even the Hush. It loses your trail for a while (3 miles).')}`;
    },
    taps: {
      globe: (g) => {
        if (g.flag('shaken') === g.run.here.word) return t('The snow whirls up and settles again.');
        g.mark('shaken', g.run.here.word);
        return t('You shake the globe, and a coin tumbles down with the snow: {got}', { got: g.give({ glimmer: 1 }) });
      },
    },
  },
};
