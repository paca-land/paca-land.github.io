import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { softDot } from './sky.js';
import { BUILDINGS } from './packs/index.js';

const TAU = Math.PI * 2;

// --- Building blocks, all standing on y = 0 --------------------------------

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
const ball = (r, detail = 0) => new THREE.IcosahedronGeometry(r, detail);

// A gable roof (or a tent): ridge along x, slopes facing ±z.
function gable(w, h, d) {
  const x = w / 2, z = d / 2;
  const A = [-x, 0, -z], B = [x, 0, -z], C = [x, 0, z], D = [-x, 0, z], E = [-x, h, 0], F = [x, h, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(tris.length * 2).fill(0), 2));
  geo.computeVertexNormals();
  return geo;
}

export function makeMaterials(biomeKey) {
  const m = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
  const glow = (emissive) => m('#2a1d10', { emissive, emissiveIntensity: 0.15 });
  return {
    stone: m(biomeKey === 'desert' ? '#d4a878' : '#a19b91'),
    darkStone: m('#6f6b66'),
    wood: m('#a0714a'),
    darkWood: m('#5a4030'),
    plaster: m('#efe6d2'),
    roofRed: m('#b5523b'),
    roofBlue: m('#4a6290'),
    roofGreen: m('#3f6b52'),
    roofSlate: m('#575d6e'),
    roofPurple: m('#6a4c9c'),
    lacquer: m('#c23b2e'),
    moss: m('#6f9a4a'),
    snow: m('#f4f7fb'),
    cloth: m('#efe7d6', { side: THREE.DoubleSide }),
    // Lit from inside: these brighten as night falls (see updateMaterials).
    glow: glow('#ffb347'),
    glowCool: glow('#8f7bff'),
    lamp: m('#fff1c0', { emissive: '#ffe08a', emissiveIntensity: 0.5 }),
    flame: m('#ff9a3c', { emissive: '#ff7a1a', emissiveIntensity: 3 }),
  };
}

export function updateMaterials(mats, env) {
  mats.glow.emissiveIntensity = 0.15 + env.gloom * 2.6;
  mats.glowCool.emissiveIntensity = 0.3 + env.gloom * 2.6;
  mats.lamp.emissiveIntensity = 0.4 + env.gloom * 1.8;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// Collects pieces per material, then merges each material into one mesh,
// so even a castle costs only a handful of draw calls.
class Kit {
  constructor(mats) {
    this.mats = mats;
    this.parts = new Map();
  }

  material(key) {
    this.mats[key] ??= new THREE.MeshStandardMaterial({ color: key, flatShading: true, roughness: 0.9 });
    return this.mats[key];
  }

  add(key, geo, [x = 0, y = 0, z = 0] = [], { rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
    _q.setFromEuler(_e.set(rx, ry, rz));
    if (Array.isArray(s)) _s.fromArray(s);
    else _s.setScalar(s);
    geo.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s));
    const list = this.parts.get(key) ?? [];
    list.push(geo.index ? geo.toNonIndexed() : geo);
    this.parts.set(key, list);
  }

  build(group = new THREE.Group()) {
    for (const [key, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), this.material(key));
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

// Where a landmark stands: its base sits at the lowest ground under its
// footprint (stone plinths fill in below), and `ground` gives local terrain height.
function makePlace(spot, yaw, shape, radius) {
  let base = Infinity;
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * TAU, d = i === 8 ? 0 : radius * 0.8;
    base = Math.min(base, shape.heightAt(spot.x + Math.cos(a) * d, spot.z + Math.sin(a) * d));
  }
  const toWorld = (lx, lz) => [spot.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), spot.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
  return {
    base,
    ground: (lx, lz) => {
      const [x, z] = toWorld(lx, lz);
      return shape.heightAt(x, z) - base;
    },
  };
}

const ROOFS = ['roofRed', 'roofBlue', 'roofGreen', 'roofSlate'];

function house(kit, r, [x, y, z], ry, { w = 0.8, d = 0.65, h = 0.55, roof = r.pick(ROOFS), walls = r.pick(['plaster', 'wood']), chimney = r.chance(0.5) } = {}) {
  const at = (lx, ly, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), y + ly, z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  kit.add('stone', box(w + 0.12, 0.7, d + 0.12), at(0, -0.66, 0), { ry });
  kit.add(walls, box(w, h, d), at(0, 0, 0), { ry });
  kit.add(roof, gable(w + 0.22, h * 0.8, d + 0.22), at(0, h, 0), { ry });
  kit.add('darkWood', box(0.18, 0.34, 0.04), at(-w * 0.2, 0, d / 2 + 0.01), { ry });
  kit.add('glow', box(0.16, 0.15, 0.04), at(w * 0.22, h * 0.45, d / 2 + 0.01), { ry });
  if (chimney) kit.add('stone', box(0.13, 0.45, 0.13), at(w * 0.28, h + 0.1, -d * 0.2), { ry });
  return {
    window: at(w * 0.22, h * 0.45, d / 2 + 0.2),
    chimney: chimney ? at(w * 0.28, h + 0.6, -d * 0.2) : null,
  };
}

// --- Landmarks ---------------------------------------------------------------

const LANDMARKS = {
  cabin: {
    find: { radius: 1.6, rn: [0.15, 0.6], slope: 0.28, wet: 1.6 },
    build(kit, { r }, place) {
      const h = house(kit, r, [0, 0, 0], 0, { w: 1.0, d: 0.8, h: 0.7, walls: 'wood', chimney: true });
      kit.add('glow', box(0.04, 0.2, 0.24), [0.51, 0.3, 0]);
      const g = place.ground(-0.62, 0.62);
      kit.add('darkWood', box(0.04, 0.55, 0.04), [-0.62, g, 0.62]);
      kit.add('glow', box(0.11, 0.13, 0.11), [-0.62, g + 0.55, 0.62]);
      return {
        radius: 1.6, door: [-0.2, 0.8], smoke: [h.chimney], fields: 0.35,
        lights: [h.window, [-0.62, g + 0.6, 0.62]],
        pointLight: { at: [0.3, 0.5, 0.85], color: '#ffb35c', power: 5 },
      };
    },
  },

  castle: {
    find: { radius: 2.4, rn: [0.05, 0.55], slope: 0.3, wet: 2.6, prefer: 'high' },
    build(kit, { r, mats }, place) {
      const roof = r.pick(['roofBlue', 'roofRed', 'roofSlate', 'roofPurple']);
      const S = 1.15;
      kit.add('stone', box(2 * S + 0.7, 1.3, 2 * S + 0.7), [0, -1.25, 0]);
      const crenels = (cx, cz, len, ry, y) => {
        const n = Math.round(len / 0.32);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) * (len / n) - len / 2;
          kit.add('stone', box(0.15, 0.14, 0.26), [cx + Math.cos(ry) * t, y, cz - Math.sin(ry) * t], { ry });
        }
      };
      for (const [x, z, ry] of [[0, S, 0], [0, -S, 0], [S, 0, Math.PI / 2], [-S, 0, Math.PI / 2]]) {
        kit.add('stone', box(2 * S, 0.85, 0.24), [x, 0, z], { ry });
        crenels(x, z, 2 * S - 0.6, ry, 0.85);
      }
      const banner = new THREE.MeshStandardMaterial({ color: r.pick(['#c0392b', '#2f5fa8', '#e0a526', '#7b3fa0']), side: THREE.DoubleSide, flatShading: true });
      const flags = [];
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = sx * S, z = sz * S;
          kit.add('stone', cyl(0.34, 0.38, 1.7), [x, 0, z]);
          kit.add('darkStone', cyl(0.42, 0.42, 0.12), [x, 1.66, z]);
          kit.add(roof, cone(0.46, 0.85), [x, 1.78, z]);
          kit.add('glow', box(0.09, 0.16, 0.05), [x + sx * 0.25, 1.05, z + sz * 0.25], { ry: Math.atan2(sx, sz) });
          kit.add('darkWood', cyl(0.012, 0.012, 0.45, 4), [x, 2.58, z]);
          // Cloth that ripples from the pole out to the free end.
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.18, 8, 2).translate(0.16, 0, 0), banner);
          flag.userData.base = Float32Array.from(flag.geometry.attributes.position.array);
          flag.position.set(x, 2.94, z);
          flag.castShadow = true;
          flags.push(flag);
        }
      }
      // The keep, with a turret on top.
      kit.add('stone', box(1.0, 1.9, 1.0), [0, 0, -0.1]);
      for (const [x, z, ry] of [[0, 0.4, 0], [0, -0.6, 0], [0.5, -0.1, Math.PI / 2], [-0.5, -0.1, Math.PI / 2]]) crenels(x, z, 0.9, ry, 1.9);
      kit.add('stone', cyl(0.22, 0.25, 0.65), [0, 1.9, -0.1]);
      kit.add(roof, cone(0.32, 0.6), [0, 2.55, -0.1]);
      kit.add('glow', box(0.12, 0.2, 0.05), [0, 1.25, 0.41]);
      kit.add('glow', box(0.12, 0.2, 0.05), [0.28, 0.72, 0.41]);
      kit.add('glow', box(0.12, 0.2, 0.05), [-0.28, 0.72, 0.41]);
      // The gate, with a torch on each side.
      kit.add('darkWood', box(0.42, 0.55, 0.06), [0, 0, S + 0.13]);
      kit.add('stone', box(0.66, 0.14, 0.32), [0, 0.55, S + 0.03]);
      for (const sx of [-1, 1]) {
        kit.add('darkWood', cyl(0.025, 0.03, 0.32, 5), [sx * 0.38, 0.32, S + 0.2]);
        kit.add('flame', cone(0.05, 0.13, 5), [sx * 0.38, 0.64, S + 0.2]);
      }
      mats.banner = banner;
      let phase = 0;
      return {
        radius: 2.4, door: [0, S + 0.7], extras: flags,
        lights: [[-0.38, 0.7, S + 0.3, 'fire'], [0.38, 0.7, S + 0.3, 'fire']],
        pointLight: { at: [0, 0.9, S + 0.7], color: '#ff9a4a', power: 4, flicker: true },
        update(t, dt, env) {
          // Advance the wave's phase rather than scaling time, so a change of
          // speed never makes the flags jump.
          phase += dt * (3 + Math.min(env.wind, 3) * 1.5 + env.poke * 1.5);
          const lift = Math.min(env.wind, 2) * 0.5;
          flags.forEach((f, i) => {
            const pos = f.geometry.attributes.position, base = f.userData.base;
            for (let v = 0; v < pos.count; v++) {
              const x = base[v * 3], y = base[v * 3 + 1], k = x / 0.32;
              pos.setY(v, y - k * k * 0.03 * (1 - lift * 0.6));
              pos.setZ(v, (Math.sin(x * 18 - phase - i * 1.7) * 0.03 * (1 + env.poke * 0.5) + Math.sin(y * 9 + phase * 0.7) * 0.008) * k);
            }
            pos.needsUpdate = true;
            // Stream downwind, whichever way the castle faces.
            f.rotation.y = -0.34 - f.parent.rotation.y + Math.sin(phase * 0.13 + i) * 0.12;
          });
        },
      };
    },
  },

  windmill: {
    find: { radius: 1.3, rn: [0.15, 0.6], slope: 0.28, wet: 2.0, prefer: 'high' },
    build(kit, ctx) {
      kit.add('stone', cyl(0.68, 0.74, 0.9, 10), [0, -0.85, 0]);
      kit.add('plaster', cyl(0.4, 0.6, 1.9, 10), [0, 0, 0]);
      kit.add('darkWood', cone(0.52, 0.6, 10), [0, 1.9, 0]);
      kit.add('darkWood', box(0.22, 0.4, 0.06), [0, 0, 0.6]);
      kit.add('glow', box(0.13, 0.16, 0.05), [0, 1.15, 0.5]);
      kit.add('darkWood', box(0.12, 0.12, 0.3), [0, 1.66, 0.46]);
      const blades = new Kit(ctx.mats);
      for (let i = 0; i < 4; i++) {
        const rz = (i * Math.PI) / 2;
        blades.add('darkWood', new THREE.BoxGeometry(0.06, 1.3, 0.04).translate(0, 0.65, 0), [0, 0, 0], { rz });
        blades.add('cloth', new THREE.BoxGeometry(0.3, 0.95, 0.015).translate(0.19, 0.72, 0), [0, 0, 0], { rz });
      }
      const sails = blades.build();
      sails.position.set(0, 1.72, 0.64);
      return {
        radius: 1.3, door: [0, 1.0], extras: [sails], fields: 1,
        lights: [[0, 1.15, 0.7]],
        update(t, dt, env) {
          sails.rotation.z -= dt * (0.7 * env.wind + env.poke * 5);
        },
      };
    },
  },

  lighthouse: {
    find: { radius: 1.5, rn: [0.68, 0.84], slope: 0.35, wet: 1.5 },
    build(kit, ctx, place) {
      kit.add('darkStone', cyl(0.72, 0.85, 1.0, 10), [0, -0.95, 0]);
      for (let i = 0; i < 4; i++) {
        const rb = 0.5 - i * 0.045;
        kit.add(i % 2 ? 'roofRed' : 'plaster', cyl(rb - 0.045, rb, 0.6, 12), [0, i * 0.6, 0]);
      }
      kit.add('darkStone', cyl(0.46, 0.46, 0.08, 12), [0, 2.4, 0]);
      kit.add('lamp', cyl(0.24, 0.24, 0.36, 8), [0, 2.48, 0]);
      kit.add('roofRed', cone(0.32, 0.4, 8), [0, 2.84, 0]);
      kit.add('darkWood', box(0.2, 0.36, 0.04), [0, 0, 0.5]);
      const hut = house(kit, ctx.r, [0.95, place.ground(0.95, 0.2), 0.2], 0, { w: 0.7, d: 0.55, h: 0.45, roof: 'roofRed', walls: 'plaster', chimney: false });

      // Two light cones sweeping around after dark, fading along their length.
      const beam = new THREE.Group();
      const beamMat = new THREE.MeshBasicMaterial({
        color: '#ffe7b0', vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      for (const dir of [1, -1]) {
        const geo = new THREE.ConeGeometry(1.1, 11, 24, 1, true).translate(0, -5.5, 0).rotateZ((dir * Math.PI) / 2);
        const pos = geo.attributes.position;
        const colors = [];
        for (let i = 0; i < pos.count; i++) {
          const k = (1 - Math.min(1, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)) / 11)) ** 2;
          colors.push(k, k, k);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        beam.add(new THREE.Mesh(geo, beamMat));
      }
      beam.position.set(0, 2.66, 0);
      return {
        radius: 1.5, door: [0.95, 0.8], extras: [beam],
        lights: [hut.window],
        pointLight: { at: [0, 2.66, 0], color: '#ffe8a8', power: 2.5 },
        update(t, dt, env) {
          beam.rotation.y += dt * (0.7 + env.poke * 2.5);
          // Lighthouses shine at night and through fog and storms.
          const shine = Math.max(env.gloom, env.mist * 0.5);
          beam.visible = shine > 0.02;
          beamMat.opacity = shine * 0.13;
        },
      };
    },
  },

  wizard: {
    find: { radius: 1.2, rn: [0.1, 0.6], slope: 0.35, wet: 1.6, prefer: 'high' },
    build(kit) {
      kit.add('stone', cyl(0.58, 0.64, 0.9), [0, -0.85, 0]);
      kit.add('stone', cyl(0.34, 0.44, 2.6), [0, 0, 0]);
      kit.add('darkStone', cyl(0.42, 0.42, 0.1), [0, 1.3, 0]);
      kit.add('darkStone', cyl(0.4, 0.4, 0.12), [0, 2.55, 0]);
      kit.add('roofPurple', cone(0.66, 1.4), [0, 2.62, 0], { rz: 0.1 });
      kit.add('darkWood', box(0.2, 0.36, 0.04), [0, 0, 0.44]);
      kit.add('glowCool', box(0.1, 0.16, 0.05), [0, 0.95, 0.42]);
      kit.add('glowCool', box(0.05, 0.16, 0.1), [0.38, 1.75, 0]);
      kit.add('glowCool', box(0.1, 0.16, 0.05), [0, 2.1, -0.37]);
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.17, 0),
        new THREE.MeshStandardMaterial({ color: '#d6fbff', emissive: '#6fe8ff', emissiveIntensity: 2.5, flatShading: true }),
      );
      const shards = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), orb.material);
        shard.position.set(Math.cos((i / 3) * TAU) * 0.42, 0, Math.sin((i / 3) * TAU) * 0.42);
        shards.add(shard);
      }
      return {
        radius: 1.2, door: [0, 0.8], extras: [orb, shards],
        lights: [[0, 0.95, 0.62, 'cool']],
        pointLight: { at: [0, 4.3, 0], color: '#7ae8ff', power: 3 },
        update(t, dt, env) {
          orb.position.set(0, 4.3 + Math.sin(t * 1.4) * 0.12 + env.poke * 0.4, 0);
          orb.rotation.set(t * 0.8, t * 1.1, 0);
          orb.material.emissiveIntensity = 2.2 + Math.sin(t * 2.3) * 0.6 + env.poke * 5;
          shards.position.copy(orb.position);
          shards.rotation.y += dt * (0.9 + env.poke * 9);
          shards.scale.setScalar(1 + env.poke * 0.8);
        },
      };
    },
  },

  village: {
    find: { radius: 2.6, rn: [0.1, 0.5], slope: 0.25, wet: 2.8, prefer: 'flat' },
    build(kit, { r }, place) {
      const lights = [], smoke = [];
      const n = r.int(3, 5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r.range(-0.25, 0.25), d = r.range(1.35, 1.75);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const k = r.range(0.85, 1.1);
        const h = house(kit, r, [x, place.ground(x, z), z], Math.atan2(-x, -z), { w: 0.8 * k, d: 0.65 * k, h: 0.55 * k });
        lights.push(h.window);
        if (h.chimney) smoke.push(h.chimney);
      }
      // A well in the middle of the square.
      const g = place.ground(0, 0);
      kit.add('stone', cyl(0.24, 0.27, 0.32, 10), [0, g - 0.05, 0]);
      kit.add('darkWood', box(0.04, 0.55, 0.04), [-0.2, g, 0]);
      kit.add('darkWood', box(0.04, 0.55, 0.04), [0.2, g, 0]);
      kit.add('roofRed', gable(0.55, 0.22, 0.45), [0, g + 0.55, 0]);
      return { radius: 2.6, door: [0, 0], lights, smoke, fields: 0.5 };
    },
  },

  // The Harbour, where every voyage starts and the town you grew up in (voyage.js
  // asks for it; no biome lists it, so ordinary lands never roll it): painted
  // houses in a horseshoe round a square, open toward the quay, a clock tower at
  // the back, bunting between the roofs, a market stall and lamps.
  town: {
    find: { radius: 3.6, rn: [0, 0.4], slope: 0.3, wet: 2.4, prefer: 'flat' },
    build(kit, { r }, place) {
      const lights = [], smoke = [], eaves = [];
      const PAINT = ['#f3d9c6', '#d9e7d0', '#cfe0ee', '#f1e3a8', '#e9cfe0', '#efe6d2'];
      // Round the horseshoe from one side of the gap (toward the door, +z) to the other.
      const around = (i, n) => Math.PI / 2 + 0.75 + (i / (n - 1)) * (TAU - 1.5);
      const spot = (a, d) => {
        const x = Math.cos(a) * d, z = Math.sin(a) * d, g = place.ground(x, z), ry = Math.atan2(-x, -z);
        return { x, z, g, ry, at: (lx, ly, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), g + ly, z - lx * Math.sin(ry) + lz * Math.cos(ry)] };
      };
      // The square's own houses, tall and painted, with the clock tower at the back.
      for (let i = 0; i < 7; i++) {
        const { x, z, g, ry, at } = spot(around(i, 7), i === 3 ? 2.05 : r.range(1.95, 2.2));
        if (i === 3) {
          kit.add('stone', box(0.78, 0.7, 0.78), at(0, -0.66, 0), { ry });
          kit.add('stone', box(0.7, 1.85, 0.7), at(0, 0, 0), { ry });
          kit.add('wood', box(0.62, 0.52, 0.62), at(0, 1.85, 0), { ry });
          kit.add('roofSlate', cone(0.6, 0.7, 4), at(0, 2.37, 0), { ry: ry + Math.PI / 4 });
          kit.add('lamp', cyl(0.21, 0.21, 0.04, 12), at(0, 2.11, 0.33), { rx: Math.PI / 2, ry });
          kit.add('darkWood', box(0.025, 0.15, 0.02), at(0, 2.11, 0.36), { ry });
          kit.add('darkWood', box(0.11, 0.025, 0.02), at(0.05, 2.11, 0.36), { ry });
          kit.add('darkWood', box(0.24, 0.42, 0.04), at(0, 0, 0.36), { ry });
          eaves.push(at(0, 1.85, 0.38));
          continue;
        }
        const tall = i % 2 === 0;
        const w = 0.95, depth = 0.75, h = tall ? 1.15 : 0.72;
        const home = house(kit, r, [x, g, z], ry, { w, d: depth, h, walls: r.pick(PAINT), roof: r.pick(ROOFS), chimney: r.chance(0.6) });
        lights.push(home.window);
        if (home.chimney) smoke.push(home.chimney);
        if (tall) {
          kit.add('glow', box(0.16, 0.15, 0.04), at(-w * 0.2, h * 0.68, depth / 2 + 0.01), { ry });
          lights.push(at(-w * 0.2, h * 0.68, depth / 2 + 0.2));
        }
        eaves.push(at(0, h, depth / 2 + 0.12));
      }
      // Cottages behind them, out toward the edge of town.
      for (let i = 0; i < 6; i++) {
        const { x, z, g, ry } = spot(around(i, 6) + r.range(-0.12, 0.12), r.range(3.0, 3.3));
        const home = house(kit, r, [x, g, z], ry, { w: 0.78, d: 0.62, h: 0.58, walls: r.pick(PAINT), roof: r.pick(ROOFS) });
        lights.push(home.window);
        if (home.chimney) smoke.push(home.chimney);
      }
      // Bunting from roof to roof round the square, sagging a little.
      const FLAGS = ['#e05a4f', '#f2c14e', '#4f8fe0', '#5cb85c', '#f5f0e6'];
      let f = 0;
      for (let i = 0; i + 1 < eaves.length; i++) {
        const [ax, ay, az] = eaves[i], [bx, by, bz] = eaves[i + 1];
        const len = Math.hypot(bx - ax, bz - az), count = Math.max(3, Math.floor(len / 0.17)), yaw = Math.atan2(bx - ax, bz - az);
        for (let k = 1; k < count; k++) {
          const u = k / count;
          const y = ay + (by - ay) * u - Math.sin(u * Math.PI) * 0.18;
          kit.add(FLAGS[f++ % FLAGS.length], cone(0.06, 0.12, 3), [ax + (bx - ax) * u, y, az + (bz - az) * u], { rx: Math.PI, ry: yaw, s: [1, 1, 0.3] });
        }
      }
      // The square: a well, a market stall, and three lamps.
      const g0 = place.ground(0, 0);
      kit.add('stone', cyl(0.24, 0.27, 0.32, 10), [0, g0 - 0.05, -0.2]);
      kit.add('darkWood', box(0.04, 0.55, 0.04), [-0.2, g0, -0.2]);
      kit.add('darkWood', box(0.04, 0.55, 0.04), [0.2, g0, -0.2]);
      kit.add('roofRed', gable(0.55, 0.22, 0.45), [0, g0 + 0.55, -0.2]);
      const gs = place.ground(0.75, 0.35);
      kit.add('wood', box(0.62, 0.3, 0.34), [0.75, gs, 0.35], { ry: -0.4 });
      for (const [sx, sz] of [[-0.28, -0.14], [0.28, -0.14], [-0.28, 0.14], [0.28, 0.14]]) {
        kit.add('darkWood', box(0.03, 0.62, 0.03), [0.75 + sx * Math.cos(0.4) - sz * Math.sin(0.4), gs, 0.35 + sx * Math.sin(0.4) + sz * Math.cos(0.4)]);
      }
      kit.add('#d9534f', gable(0.74, 0.16, 0.48), [0.75, gs + 0.62, 0.35], { ry: -0.4 });
      for (const [k, color] of ['#e8a33a', '#c94a3a', '#7fb04a'].entries()) {
        kit.add(color, ball(0.07), [0.6 + k * 0.14 * Math.cos(0.4), gs + 0.36, 0.42 + k * 0.14 * Math.sin(0.4)]);
      }
      for (const [lx, lz] of [[-0.8, 0.7], [0.8, -0.6], [-0.9, -0.5]]) {
        const gl = place.ground(lx, lz);
        kit.add('darkWood', cyl(0.025, 0.03, 0.62, 5), [lx, gl, lz]);
        kit.add('lamp', box(0.1, 0.13, 0.1), [lx, gl + 0.62, lz]);
        lights.push([lx, gl + 0.68, lz]);
      }
      return { radius: 3.6, door: [0, 3.0], lights, smoke, pointLight: { at: [0, g0 + 0.9, 0], color: '#ffd9a0', power: 2.2 } };
    },
  },

  campsite: {
    find: { radius: 2.0, rn: [0.15, 0.7], slope: 0.25, wet: 1.6, prefer: 'flat' },
    build(kit, { r, mats }, place) {
      const g = place.ground(0, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        kit.add('darkStone', ball(0.07), [Math.cos(a) * 0.26, g + 0.03, Math.sin(a) * 0.26], { s: [1, 0.7, 1] });
      }
      for (let i = 0; i < 3; i++) kit.add('darkWood', new THREE.CylinderGeometry(0.035, 0.035, 0.42, 5).rotateZ(Math.PI / 2), [0, g + 0.06, 0], { ry: (i * Math.PI) / 3 });
      for (const [x, z] of [[-1.05, -0.35], [0.95, -0.55]]) {
        kit.add(r.pick(['#d9a066', '#7a9e7e', '#c75c5c', '#e8d8b0', '#5b7db1']), gable(0.95, 0.62, 0.85), [x, place.ground(x, z) - 0.02, z], { ry: Math.atan2(z, -x) });
      }
      kit.add('wood', new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6).rotateZ(Math.PI / 2), [0, place.ground(0, 0.8) + 0.06, 0.8]);

      const flames = new THREE.Group();
      for (const [x, z, s] of [[0, 0, 1], [0.05, 0.04, 0.7], [-0.05, -0.03, 0.8]]) {
        const flame = new THREE.Mesh(cone(0.08 * s, 0.32 * s, 5), mats.flame);
        flame.position.set(x, g + 0.06, z);
        flames.add(flame);
      }
      const N = 24;
      const sparkPos = new Float32Array(N * 3);
      const sparks = Array.from({ length: N }, (_, i) => ({ life: i / N, x: 0, z: 0 }));
      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
      const sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
        color: new THREE.Color('#ffb060').multiplyScalar(3), size: 0.06, map: softDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sparkPoints.frustumCulled = false;
      return {
        radius: 2.0, door: [0, 1.3], extras: [flames, sparkPoints],
        lights: [[0, 0.25, 0, 'fire']],
        pointLight: { at: [0, 0.45, 0], color: '#ff8a3a', power: 5, flicker: true, always: true },
        update(t, dt, env) {
          flames.children.forEach((f, i) => {
            const flare = 1 + env.poke * 1.3;
            f.scale.set(flare, (0.8 + Math.abs(Math.sin(t * (9 + i * 2.3) + i)) * 0.45) * flare, flare);
            f.rotation.y = t * (1 + i);
          });
          sparks.forEach((s, i) => {
            s.life += dt * (0.6 + env.poke * 1.5);
            if (s.life > 1) Object.assign(s, { life: 0, x: (Math.random() - 0.5) * 0.15, z: (Math.random() - 0.5) * 0.15 });
            sparkPos.set([s.x + Math.sin(t * 3 + i) * 0.08 * s.life, g + 0.2 + s.life * 1.4, s.z + Math.cos(t * 2 + i) * 0.08 * s.life], i * 3);
          });
          sparkGeo.attributes.position.needsUpdate = true;
        },
      };
    },
  },

  ruins: {
    find: { radius: 2.0, rn: [0.1, 0.65], slope: 0.3, wet: 1.8 },
    build(kit, { r }, place) {
      const g = place.ground(0, 0);
      kit.add('stone', box(2.3, 0.9, 1.6), [0, g - 0.75, 0]);
      const standing = [];
      for (const x of [-0.85, 0, 0.85]) {
        for (const z of [-0.55, 0.55]) {
          const broken = r.chance(0.45);
          const h = broken ? r.range(0.3, 0.9) : 1.45;
          kit.add('stone', cyl(0.12, 0.14, h), [x, g + 0.15, z]);
          if (!broken) {
            kit.add('stone', box(0.32, 0.09, 0.32), [x, g + 0.15 + h, z]);
            standing.push([x, z]);
          } else if (r.chance(0.6)) {
            kit.add('moss', cyl(0.13, 0.13, 0.04), [x, g + 0.15 + h, z]);
          }
        }
      }
      for (const z of [-0.55, 0.55]) {
        const row = standing.filter((c) => c[1] === z).map((c) => c[0]);
        for (let i = 0; i < row.length - 1; i++) {
          if (row[i + 1] - row[i] < 1) kit.add('stone', box(0.98, 0.14, 0.26), [(row[i] + row[i + 1]) / 2, g + 1.69, z]);
        }
      }
      kit.add('stone', new THREE.CylinderGeometry(0.12, 0.13, 1.1, 8).rotateZ(Math.PI / 2), [0.2, place.ground(0.2, 1.25) + 0.1, 1.25], { ry: r.range(-0.5, 0.5) });
      return { radius: 2.0, door: [0, 1.7] };
    },
  },

  stones: {
    find: { radius: 1.8, rn: [0.1, 0.6], slope: 0.3, wet: 1.6, prefer: 'high' },
    build(kit, { r, biomeKey }, place) {
      const count = r.int(6, 9), ringR = r.range(0.95, 1.25);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + r.range(-0.15, 0.15);
        const x = Math.cos(a) * ringR, z = Math.sin(a) * ringR;
        kit.add('stone', box(0.28, r.range(0.7, 1.35), 0.2), [x, place.ground(x, z) - 0.15, z], { ry: -a, rx: r.range(-0.08, 0.08), rz: r.range(-0.08, 0.08) });
      }
      kit.add('stone', box(0.6, 0.25, 0.4), [0, place.ground(0, 0) - 0.05, 0]);
      const glowing = biomeKey === 'dream' || r.chance(0.35);
      return { radius: 1.8, door: [0, ringR + 0.5], lights: glowing ? [[0, place.ground(0, 0) + 0.3, 0, 'cool']] : [] };
    },
  },

  shrine: {
    find: { radius: 1.7, rn: [0.1, 0.6], slope: 0.3, wet: 1.6 },
    build(kit, ctx, place) {
      const gz = place.ground(0, 0.9);
      for (const sx of [-1, 1]) kit.add('lacquer', cyl(0.06, 0.075, 1.35), [sx * 0.5, gz - 0.05, 0.9]);
      kit.add('darkWood', box(1.5, 0.09, 0.17), [0, gz + 1.32, 0.9]);
      kit.add('lacquer', box(1.36, 0.07, 0.14), [0, gz + 1.24, 0.9]);
      kit.add('lacquer', box(1.12, 0.07, 0.08), [0, gz + 1.0, 0.9]);
      const lights = [];
      for (const sx of [-1, 1]) {
        const x = sx * 0.85, z = 0.2, g = place.ground(x, z);
        kit.add('stone', cyl(0.1, 0.13, 0.12, 6), [x, g, z]);
        kit.add('stone', cyl(0.05, 0.05, 0.35, 6), [x, g + 0.12, z]);
        kit.add('glow', box(0.16, 0.14, 0.16), [x, g + 0.47, z]);
        kit.add('stone', cone(0.17, 0.14, 4), [x, g + 0.61, z], { ry: Math.PI / 4 });
        lights.push([x, g + 0.5, z]);
      }
      const g = place.ground(0, -0.75);
      kit.add('stone', box(0.9, 0.6, 0.75), [0, g - 0.5, -0.75]);
      kit.add('wood', box(0.7, 0.5, 0.55), [0, g, -0.75]);
      kit.add('roofSlate', gable(0.95, 0.32, 0.8), [0, g + 0.5, -0.75]);
      kit.add('glow', box(0.2, 0.18, 0.04), [0, g + 0.18, -0.47]);
      return { radius: 1.7, door: [0, 1.5], lights };
    },
  },

  // --- Found only on voyages (voyage-only islands list them, and some words call them) ---

  // A stargazer's observatory: a round white tower whose dome turns slowly by
  // itself, with a brass telescope poking out of the slit.
  observatory: {
    find: { radius: 1.4, rn: [0.2, 0.7], slope: 0.3, wet: 1.8, prefer: 'high' },
    build(kit, ctx) {
      kit.add('stone', cyl(0.78, 0.86, 0.9, 12), [0, -0.85, 0]);
      kit.add('plaster', cyl(0.66, 0.7, 1.05, 14), [0, 0, 0]);
      kit.add('darkStone', cyl(0.72, 0.72, 0.08, 14), [0, 1.04, 0]);
      kit.add('darkWood', box(0.24, 0.42, 0.04), [0, 0, 0.69]);
      for (const sx of [-1, 1]) kit.add('glow', box(0.13, 0.18, 0.04), [sx * 0.42, 0.55, 0.54], { ry: sx * 0.66 });
      const dome = new Kit(ctx.mats);
      dome.add('#eef2f6', new THREE.SphereGeometry(0.68, 16, 6, 0, TAU, 0, Math.PI / 2), [0, 0, 0]);
      // The slit, a dark strip from the top down the front, and the telescope out of it.
      dome.add('#2b3140', new THREE.SphereGeometry(0.69, 2, 6, Math.PI / 2 - 0.13, 0.26, 0, Math.PI / 2), [0, 0, 0]);
      dome.add('#c9a04a', new THREE.CylinderGeometry(0.06, 0.085, 1.0, 8), [0, 0.42, 0.34], { rx: 0.75 });
      dome.add('#7a5a2a', new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8), [0, 0.07, 0.04], { rx: 0.75 });
      const top = dome.build();
      top.position.y = 1.08;
      return {
        radius: 1.4, door: [0, 1.0], extras: [top],
        lights: [[-0.45, 0.55, 0.75], [0.45, 0.55, 0.75]],
        pointLight: { at: [0, 0.6, 0.9], color: '#ffe0a8', power: 1.6 },
        update(t, dt, env) {
          top.rotation.y += dt * (0.08 + env.poke * 1.2);
        },
      };
    },
  },

  // A teahouse on stilts with a two-tier roof, red paper lanterns along the
  // front, and a kettle steaming on a little stove by the steps.
  teahouse: {
    find: { radius: 1.6, rn: [0.1, 0.7], slope: 0.32, wet: 1.4, prefer: 'flat' },
    build(kit, ctx, place) {
      const floor = 0.38;
      for (const [x, z] of [[-0.62, -0.46], [0.62, -0.46], [-0.62, 0.46], [0.62, 0.46], [0, -0.46], [0, 0.46]]) {
        const g = place.ground(x, z);
        kit.add('darkWood', cyl(0.05, 0.06, floor - g + 0.45, 5), [x, g - 0.45, z]);
      }
      kit.add('wood', box(1.5, 0.07, 1.16), [0, floor, 0]);
      kit.add('plaster', box(1.12, 0.52, 0.8), [0, floor + 0.07, -0.05]);
      // Paper screens, lit from inside at night.
      for (const sx of [-0.33, 0, 0.33]) kit.add('glow', box(0.24, 0.32, 0.03), [sx, floor + 0.15, 0.36]);
      kit.add('darkWood', box(1.2, 0.04, 0.04), [0, floor + 0.55, 0.37]);
      kit.add('roofGreen', cone(1.08, 0.34, 4), [0, floor + 0.58, -0.05], { ry: Math.PI / 4 });
      kit.add('plaster', box(0.5, 0.26, 0.42), [0, floor + 0.82, -0.05]);
      kit.add('roofGreen', cone(0.56, 0.32, 4), [0, floor + 1.06, -0.05], { ry: Math.PI / 4 });
      kit.add('#c9a04a', cyl(0.025, 0.04, 0.22, 6), [0, floor + 1.36, -0.05]);
      // Steps up to the door.
      for (let i = 0; i < 3; i++) {
        const z = 0.66 + i * 0.13;
        kit.add('wood', box(0.42, 0.06, 0.13), [0, place.ground(0, z) + floor * (1 - (i + 1) / 4) - 0.03, z]);
      }
      // Red lanterns hanging from the front of the lower roof.
      const lights = [];
      for (const sx of [-0.62, 0.62]) {
        kit.add('darkWood', cyl(0.008, 0.008, 0.16, 3), [sx, floor + 0.42, 0.62]);
        kit.add('#d8443a', ball(0.085, 1), [sx, floor + 0.36, 0.62], { s: [1, 1.25, 1] });
        lights.push([sx, floor + 0.36, 0.75]);
      }
      // The stove and its kettle, beside the steps.
      const gs = place.ground(0.85, 0.75);
      kit.add('darkStone', box(0.24, 0.22, 0.24), [0.85, gs, 0.75]);
      kit.add('#3a3a40', ball(0.1, 1), [0.85, gs + 0.3, 0.75], { s: [1, 0.8, 1] });
      kit.add('#3a3a40', cyl(0.015, 0.025, 0.12, 5), [0.93, gs + 0.32, 0.75], { rz: -0.8 });
      return {
        radius: 1.6, door: [0, 1.25], lights, smoke: [[1.0, gs + 0.42, 0.75]],
        pointLight: { at: [0, floor + 0.4, 0.8], color: '#ffb27a', power: 1.8 },
      };
    },
  },

  // The post office: a timber office with a red postbox by the door, a tall
  // pigeon loft beside it, and pigeons wheeling round the top.
  post: {
    find: { radius: 1.5, rn: [0.1, 0.65], slope: 0.3, wet: 1.6 },
    build(kit, ctx, place) {
      const office = house(kit, ctx.r, [-0.25, place.ground(-0.25, 0.1), 0.1], 0, { w: 1.0, d: 0.72, h: 0.6, roof: 'roofRed', walls: 'plaster', chimney: true });
      kit.add('wood', box(0.5, 0.13, 0.03), [-0.25, place.ground(-0.25, 0.1) + 0.5, 0.48]);
      // The postbox.
      const gp = place.ground(0.5, 0.68);
      kit.add('#c8302a', cyl(0.11, 0.12, 0.5, 10), [0.5, gp, 0.68]);
      kit.add('#c8302a', new THREE.SphereGeometry(0.115, 10, 4, 0, TAU, 0, Math.PI / 2), [0.5, gp + 0.5, 0.68]);
      kit.add('#2a1a14', box(0.12, 0.022, 0.02), [0.5, gp + 0.38, 0.79]);
      // The pigeon loft: a tall wooden tower with little doors near the top.
      const gl = place.ground(0.72, -0.42);
      kit.add('stone', box(0.58, 0.6, 0.58), [0.72, gl - 0.56, -0.42]);
      kit.add('wood', box(0.48, 1.55, 0.48), [0.72, gl, -0.42]);
      for (const [dx, dz, ry] of [[0, 0.245, 0], [0.245, 0, Math.PI / 2], [-0.245, 0, Math.PI / 2], [0, -0.245, 0]]) {
        kit.add('#2a1a14', box(0.1, 0.12, 0.02), [0.72 + dx, gl + 1.2, -0.42 + dz], { ry });
        kit.add('darkWood', box(0.16, 0.025, 0.06), [0.72 + dx * 1.15, gl + 1.18, -0.42 + dz * 1.15], { ry });
      }
      kit.add('roofSlate', cone(0.46, 0.42, 4), [0.72, gl + 1.55, -0.42], { ry: Math.PI / 4 });
      // Pigeons, circling the loft.
      const flock = new THREE.Group();
      const birdGeo = mergeGeometries([
        new THREE.ConeGeometry(0.035, 0.13, 4).rotateZ(-Math.PI / 2),
        new THREE.BoxGeometry(0.05, 0.008, 0.2).translate(0.01, 0.01, 0),
      ].map((g) => (g.index ? g.toNonIndexed() : g)));
      const birdMat = new THREE.MeshStandardMaterial({ color: '#eceae4', flatShading: true });
      const birds = Array.from({ length: 5 }, (_, i) => {
        const bird = new THREE.Mesh(birdGeo, birdMat);
        bird.userData = { a: (i / 5) * TAU, r: 0.55 + (i % 2) * 0.22, y: 0.3 + (i % 3) * 0.15 };
        flock.add(bird);
        return bird;
      });
      flock.position.set(0.72, gl + 1.75, -0.42);
      return {
        radius: 1.5, door: [-0.25, 0.9], extras: [flock], lights: [office.window],
        smoke: [office.chimney],
        update(t, dt, env) {
          for (const bird of birds) {
            const u = bird.userData;
            u.a += dt * (0.9 + env.poke * 3);
            bird.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + u.a) * 0.06, Math.sin(u.a) * u.r);
            bird.rotation.y = -u.a - Math.PI / 2;
            bird.scale.z = 0.6 + Math.abs(Math.sin(t * 9 + u.a * 3)) * 0.6;
          }
        },
      };
    },
  },

  // The balloon maker's workshop: an open-fronted shed with a workbench and
  // bolts of cloth, and a half-sewn balloon on a scaffold beside it that
  // breathes in and out while she tests it.
  workshop: {
    find: { radius: 1.8, rn: [0.1, 0.65], slope: 0.28, wet: 1.6, prefer: 'flat' },
    build(kit, ctx, place) {
      const sx = -0.5, sz = -0.15, g = place.ground(sx, sz);
      kit.add('stone', box(1.05, 0.7, 0.85), [sx, g - 0.66, sz]);
      kit.add('wood', box(1.0, 0.62, 0.06), [sx, g, sz - 0.38]);
      for (const side of [-1, 1]) kit.add('wood', box(0.06, 0.62, 0.8), [sx + side * 0.47, g, sz]);
      for (const side of [-1, 1]) kit.add('darkWood', box(0.09, 0.66, 0.09), [sx + side * 0.47, g, sz + 0.365]);
      kit.add('roofSlate', gable(1.18, 0.42, 0.98), [sx, g + 0.62, sz]);
      kit.add('darkWood', box(0.7, 0.05, 0.28), [sx, g + 0.32, sz - 0.18]);
      kit.add('glow', box(0.2, 0.15, 0.03), [sx, g + 0.42, sz - 0.34]);
      // Bolts of striped cloth, lying in a stack.
      for (const [i, color] of ['#e05a4f', '#f2c14e', '#4f8fe0'].entries()) {
        kit.add(color, cyl(0.07, 0.07, 0.42, 8), [sx - 0.2 + i * 0.03, g + 0.07 + i * 0.13, sz + 0.12], { rz: Math.PI / 2, ry: 0.2 });
      }
      // The scaffold, and the half-made balloon resting in it.
      const bx = 0.62, bz = 0.15, gb = place.ground(bx, bz);
      for (const [dx, dz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
        const gg = place.ground(bx + dx, bz + dz);
        kit.add('darkWood', box(0.05, gb + 1.3 - gg, 0.05), [bx + dx, gg, bz + dz]);
      }
      for (const dz of [-0.42, 0.42]) kit.add('darkWood', box(0.9, 0.04, 0.04), [bx, gb + 1.3, bz + dz]);
      for (const dx of [-0.42, 0.42]) kit.add('darkWood', box(0.04, 0.04, 0.9), [bx + dx, gb + 1.3, bz]);
      const profile = [[0.18, 0], [0.42, 0.25], [0.58, 0.62], [0.6, 0.95], [0.48, 1.22], [0.25, 1.38], [0, 1.42]].map(([x, y]) => new THREE.Vector2(x, y));
      const envelope = new THREE.LatheGeometry(profile, 10).toNonIndexed();
      const pos = envelope.attributes.position, stripe = [new THREE.Color('#e05a4f'), new THREE.Color('#f5efe2')], colors = [];
      for (let i = 0; i < pos.count; i += 3) {
        const a = Math.atan2(pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2), pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2));
        const c = stripe[Math.floor(((a + Math.PI) / TAU) * 10) % 2];
        for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
      }
      envelope.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      envelope.computeVertexNormals();
      const balloon = new THREE.Mesh(envelope, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, side: THREE.DoubleSide }));
      balloon.position.set(bx, gb + 0.12, bz);
      balloon.castShadow = true;
      return {
        radius: 1.8, door: [sx, 0.75], extras: [balloon],
        lights: [[sx, g + 0.42, sz]],
        pointLight: { at: [sx, g + 0.5, sz + 0.2], color: '#ffd59a', power: 1.6 },
        update(t, dt, env) {
          // Half full, filling and slackening; a tap makes her give it a good blast.
          const breath = 0.86 + Math.sin(t * 0.7) * 0.05 + env.poke * 0.12;
          balloon.scale.set(breath, 0.78 + (breath - 0.86) * 1.6, breath);
        },
      };
    },
  },

  // A bandstand: an eight-sided stage under a striped roof, music stands and a
  // big drum, a flag on top streaming in the wind, and lamps round it.
  bandstand: {
    find: { radius: 1.5, rn: [0.1, 0.6], slope: 0.25, wet: 1.6, prefer: 'flat' },
    build(kit, ctx, place) {
      const floor = 0.26;
      kit.add('stone', cyl(0.95, 1.0, 0.75, 8), [0, floor - 0.75, 0], { ry: Math.PI / 8 });
      kit.add('wood', cyl(0.93, 0.93, 0.06, 8), [0, floor, 0], { ry: Math.PI / 8 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        kit.add('plaster', cyl(0.03, 0.035, 0.98, 5), [Math.cos(a) * 0.84, floor + 0.05, Math.sin(a) * 0.84]);
        // A railing between the posts, open at the front for the steps.
        if (i !== 1) {
          const b = a + TAU / 16, len = 2 * 0.84 * Math.sin(Math.PI / 8);
          kit.add('plaster', box(len, 0.03, 0.03), [Math.cos(b) * 0.81, floor + 0.38, Math.sin(b) * 0.81], { ry: -b + Math.PI / 2 });
        }
      }
      // A striped roof: alternate wedges of red and cream.
      for (let i = 0; i < 8; i++) {
        kit.add(i % 2 ? '#f5efe2' : '#d9534f', new THREE.ConeGeometry(1.12, 0.55, 1, 1, false, (i / 8) * TAU, TAU / 8).translate(0, 0.27, 0), [0, floor + 1.02, 0]);
      }
      // Music stands, and a big drum.
      for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [0, -0.45]]) {
        kit.add('darkStone', cyl(0.012, 0.012, 0.42, 4), [x, floor + 0.05, z]);
        kit.add('darkStone', box(0.18, 0.13, 0.01), [x, floor + 0.47, z + 0.02], { rx: -0.4 });
      }
      kit.add('#c8302a', cyl(0.2, 0.2, 0.16, 12), [0.42, floor + 0.25, 0.15], { rx: Math.PI / 2 });
      kit.add('#f5efe2', cyl(0.215, 0.215, 0.02, 12), [0.42, floor + 0.25, 0.24], { rx: Math.PI / 2 });
      // Lamps round it.
      const lights = [];
      for (const a of [0.4, 2.5, 4.4]) {
        const x = Math.cos(a) * 1.3, z = Math.sin(a) * 1.3, gl = place.ground(x, z);
        kit.add('darkWood', cyl(0.025, 0.03, 0.62, 5), [x, gl, z]);
        kit.add('lamp', box(0.1, 0.13, 0.1), [x, gl + 0.62, z]);
        lights.push([x, gl + 0.68, z]);
      }
      // The flag on top.
      kit.add('darkWood', cyl(0.015, 0.015, 0.45, 4), [0, floor + 1.55, 0]);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.01).translate(0.16, 0, 0), new THREE.MeshStandardMaterial({ color: '#f2c14e', flatShading: true }));
      flag.position.set(0, floor + 1.9, 0);
      let wave = 0;
      return {
        radius: 1.5, door: [0, 1.3], extras: [flag], lights,
        pointLight: { at: [0, floor + 0.9, 0], color: '#ffd9a0', power: 1.8 },
        update(t, dt, env) {
          wave += dt * (2 + env.wind * 3 + env.poke * 6);
          flag.rotation.y = Math.sin(wave) * (0.25 + env.wind * 0.2);
          flag.scale.x = 0.9 + Math.sin(wave * 1.7) * 0.1;
        },
      };
    },
  },

  // An inn: two storeys of plaster and timber, a sign on an iron arm, lit
  // windows upstairs and down, and a bench by the door.
  inn: {
    find: { radius: 1.6, rn: [0.1, 0.65], slope: 0.28, wet: 1.6, prefer: 'flat' },
    build(kit, ctx, place) {
      const g = place.ground(0, 0);
      kit.add('stone', box(1.22, 0.7, 0.92), [0, g - 0.66, 0]);
      kit.add('plaster', box(1.1, 0.5, 0.8), [0, g, 0]);
      kit.add('wood', box(1.18, 0.46, 0.86), [0, g + 0.5, 0]);
      kit.add('roofRed', gable(1.38, 0.5, 1.06), [0, g + 0.96, 0]);
      kit.add('stone', box(0.14, 0.5, 0.14), [0.38, g + 1.1, -0.2]);
      kit.add('darkWood', box(0.22, 0.36, 0.04), [-0.2, g, 0.41]);
      for (const x of [0.25, -0.44]) kit.add('glow', box(0.16, 0.15, 0.04), [x, g + 0.2, 0.41]);
      for (const x of [-0.3, 0.05, 0.38]) kit.add('glow', box(0.14, 0.14, 0.04), [x, g + 0.66, 0.44]);
      kit.add('darkWood', box(0.03, 0.03, 0.3), [0.5, g + 0.55, 0.56]);
      kit.add('#c9a04a', box(0.02, 0.2, 0.26), [0.5, g + 0.32, 0.62]);
      kit.add('wood', box(0.5, 0.05, 0.14), [0.18, g + 0.18, 0.56]);
      for (const x of [-0.04, 0.4]) kit.add('darkWood', box(0.04, 0.18, 0.1), [x, g, 0.56]);
      return {
        radius: 1.6, door: [-0.2, 0.9], smoke: [[0.38, g + 1.65, -0.2]],
        lights: [[0.25, g + 0.28, 0.6], [-0.3, g + 0.73, 0.62], [0.38, g + 0.73, 0.62]],
        pointLight: { at: [0, g + 0.5, 0.9], color: '#ffb35c', power: 3 },
      };
    },
  },

  // A fortune teller's tent: purple and cream stripes, a gold star on top, and
  // a crystal ball glowing on a little table outside.
  fortune: {
    find: { radius: 1.4, rn: [0.1, 0.7], slope: 0.3, wet: 1.4, prefer: 'flat' },
    build(kit, ctx, place) {
      const g = place.ground(0, 0);
      kit.add('wood', cyl(0.64, 0.64, 0.06, 10), [0, g - 0.03, 0]);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        kit.add(i % 2 ? '#f2e6c8' : '#7a3a8a', new THREE.CylinderGeometry(0.58, 0.6, 0.62, 1, 1, true, a, TAU / 10).translate(0, 0.31, 0), [0, g, 0]);
        kit.add(i % 2 ? '#7a3a8a' : '#f2e6c8', new THREE.ConeGeometry(0.72, 0.6, 1, 1, false, a, TAU / 10).translate(0, 0.3, 0), [0, g + 0.62, 0]);
      }
      kit.add('darkWood', box(0.3, 0.42, 0.04), [0, g, 0.6]);
      kit.add('#c9a04a', cyl(0.012, 0.012, 0.3, 4), [0, g + 1.2, 0]);
      kit.add('#ffd84a', ball(0.07), [0, g + 1.52, 0]);
      kit.add('darkWood', cyl(0.14, 0.14, 0.02, 8), [0.55, g + 0.3, 0.55]);
      kit.add('darkWood', cyl(0.025, 0.03, 0.3, 5), [0.55, g, 0.55]);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 2), new THREE.MeshStandardMaterial({ color: '#c8b8ff', emissive: '#9a7aff', emissiveIntensity: 1.2, roughness: 0.1 }));
      orb.position.set(0.55, g + 0.4, 0.55);
      let swirl = 0;
      return {
        radius: 1.4, door: [0, 1.0], extras: [orb], lights: [[0.55, g + 0.42, 0.55]],
        pointLight: { at: [0.55, g + 0.5, 0.75], color: '#b89aff', power: 2 },
        update(t, dt, env) {
          swirl += dt * (1 + env.poke * 4);
          orb.material.emissiveIntensity = 0.9 + Math.sin(swirl * 2) * 0.3 + env.poke;
        },
      };
    },
  },

  // A shipwright's yard: a new basket in its wooden cradle, a crane with a
  // block and rope, a stack of planks, and a shed.
  shipwright: {
    find: { radius: 1.7, rn: [0.2, 0.75], slope: 0.28, wet: 1.4, prefer: 'flat' },
    build(kit, ctx, place) {
      const shed = house(kit, ctx.r, [-0.55, place.ground(-0.55, -0.3), -0.3], 0, { w: 0.7, d: 0.6, h: 0.5, roof: 'roofSlate', walls: 'wood', chimney: false });
      const bx = 0.4, bz = 0.25, gb = place.ground(bx, bz);
      for (const dx of [-0.32, 0.32]) kit.add('darkWood', box(0.06, 0.3, 0.6), [bx + dx, gb, bz]);
      kit.add('wood', box(0.5, 0.36, 0.5), [bx, gb + 0.2, bz]);
      kit.add('darkWood', box(0.54, 0.04, 0.54), [bx, gb + 0.56, bz]);
      const cx = 0.95, cz = -0.2, gc = place.ground(cx, cz);
      kit.add('darkWood', cyl(0.04, 0.05, 1.4, 6), [cx, gc, cz]);
      kit.add('darkWood', box(0.7, 0.05, 0.05), [cx - 0.29, gc + 1.36, cz]);
      kit.add('#3a3a40', cyl(0.008, 0.008, 0.5, 3), [cx - 0.59, gc + 0.86, cz]);
      kit.add('#3a3a40', box(0.08, 0.1, 0.08), [cx - 0.59, gc + 0.78, cz]);
      const pg = place.ground(-0.2, 0.55);
      for (let i = 0; i < 4; i++) kit.add('wood', box(0.7, 0.04, 0.12), [-0.2 + (i % 2) * 0.03, pg + i * 0.045, 0.55], { ry: 0.1 * i });
      return {
        radius: 1.7, door: [-0.6, 0.6], lights: [shed.window],
        pointLight: { at: [0, place.ground(0, 0) + 0.5, 0.6], color: '#ffc77a', power: 2 },
      };
    },
  },

  // A bathhouse: a low plastered house, and a round hot pool steaming beside it
  // behind a bamboo fence.
  bathhouse: {
    find: { radius: 1.6, rn: [0.1, 0.65], slope: 0.25, wet: 1.6, prefer: 'flat' },
    build(kit, ctx, place) {
      const g = place.ground(-0.35, -0.2);
      kit.add('stone', box(0.92, 0.7, 0.72), [-0.35, g - 0.66, -0.2]);
      kit.add('plaster', box(0.82, 0.42, 0.62), [-0.35, g, -0.2]);
      kit.add('roofSlate', gable(1.02, 0.34, 0.82), [-0.35, g + 0.42, -0.2]);
      kit.add('darkWood', box(0.2, 0.3, 0.04), [-0.35, g, 0.12]);
      kit.add('glow', box(0.14, 0.12, 0.04), [-0.1, g + 0.22, 0.12]);
      const px = 0.5, pz = 0.3, gp = place.ground(px, pz);
      // The water stands a little above the stone, inside a raised lip (level with the
      // stone's top, the two flickered).
      kit.add('stone', cyl(0.42, 0.45, 0.16, 12), [px, gp - 0.04, pz]);
      kit.add('#6ab8d0', cyl(0.37, 0.37, 0.02, 12), [px, gp + 0.12, pz]);
      kit.add('stone', new THREE.TorusGeometry(0.38, 0.035, 6, 18), [px, gp + 0.14, pz], { rx: Math.PI / 2 });
      for (let i = 0; i < 6; i++) {
        const x = 0.15 + i * 0.12;
        kit.add('#8aa04a', cyl(0.02, 0.02, 0.5, 4), [x, place.ground(x, -0.25), -0.25]);
      }
      return {
        radius: 1.6, door: [-0.35, 0.8], smoke: [[px, gp + 0.15, pz], [px + 0.15, gp + 0.15, pz - 0.1]],
        lights: [[-0.1, g + 0.28, 0.2]],
        pointLight: { at: [px, gp + 0.4, pz], color: '#ffd0a0', power: 2 },
      };
    },
  },

  // A clock tower: tall and stone, a bell under its little roof, and a clock
  // face front and back whose hands go round.
  clocktower: {
    find: { radius: 1.2, rn: [0.1, 0.6], slope: 0.3, wet: 1.4, prefer: 'high' },
    build(kit, ctx, place) {
      const g = place.ground(0, 0);
      kit.add('stone', box(0.72, 0.8, 0.72), [0, g - 0.76, 0]);
      kit.add('stone', box(0.6, 1.9, 0.6), [0, g, 0]);
      kit.add('darkStone', box(0.68, 0.08, 0.68), [0, g + 1.9, 0]);
      kit.add('plaster', box(0.5, 0.36, 0.5), [0, g + 1.98, 0]);
      kit.add('roofSlate', cone(0.5, 0.6, 4), [0, g + 2.34, 0], { ry: Math.PI / 4 });
      kit.add('#c9a04a', ball(0.07), [0, g + 2.18, 0]);
      kit.add('darkWood', box(0.22, 0.36, 0.04), [0, g, 0.31]);
      kit.add('glow', box(0.1, 0.16, 0.04), [0, g + 0.9, 0.31]);
      const hands = [], pivots = [];
      const ink = new THREE.MeshStandardMaterial({ color: '#2a2420', flatShading: true });
      for (const side of [1, -1]) {
        kit.add('#f4ecd8', new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), [0, g + 1.5, side * 0.31], { rx: Math.PI / 2 });
        const pivot = new THREE.Group();
        pivot.position.set(0, g + 1.5, side * 0.33);
        const hour = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.11, 0.01).translate(0, 0.055, 0), ink);
        const minute = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.01).translate(0, 0.08, 0), ink);
        pivot.add(hour, minute);
        hands.push({ hour, minute, side });
        pivots.push(pivot);
      }
      let turn = 0;
      return {
        radius: 1.2, door: [0, 0.8], extras: pivots, lights: [[0, g + 0.98, 0.35]],
        pointLight: { at: [0, g + 1.5, 0.6], color: '#ffe0a8', power: 2 },
        update(t, dt, env) {
          turn += dt * (0.05 + env.poke * 2);
          for (const h of hands) {
            h.minute.rotation.z = -turn * h.side;
            h.hour.rotation.z = (-turn / 12) * h.side;
          }
        },
      };
    },
  },

  // The Edge of the Sky (voyage.js): the flat stone where Wa waited, near the rim,
  // and the lantern that went out long ago. It lights again once she's said her
  // word (env.relit).
  edge: {
    find: { radius: 1.4, rn: [0.4, 0.82], slope: 0.3, wet: 1.2, prefer: 'flat' },
    build(kit, ctx, place) {
      const g = place.ground(0, 0);
      kit.add('darkStone', box(1.5, 0.5, 1.0), [0, g - 0.3, 0], { ry: 0.1, rz: 0.03 });
      kit.add('stone', box(1.32, 0.1, 0.86), [0.02, g + 0.18, 0], { ry: 0.12 });
      // What she kept by her: a folded blanket, a teacup, pages under a pebble.
      kit.add('#8a3b46', box(0.42, 0.07, 0.3), [-0.32, g + 0.28, 0.12], { ry: 0.3 });
      kit.add('#a85563', box(0.4, 0.04, 0.28), [-0.3, g + 0.35, 0.1], { ry: 0.22 });
      kit.add('plaster', cyl(0.05, 0.038, 0.08, 8), [0.3, g + 0.28, 0.24]);
      kit.add('#f4ecd8', box(0.22, 0.015, 0.3), [0.24, g + 0.28, -0.2], { ry: -0.4 });
      kit.add('#ece2c8', box(0.22, 0.015, 0.3), [0.27, g + 0.3, -0.18], { ry: -0.15 });
      kit.add('darkStone', ball(0.05), [0.27, g + 0.34, -0.17]);
      // The lantern, hung from a crooked post.
      const px = 0.95, pz = -0.3, gp = place.ground(px, pz);
      kit.add('darkWood', cyl(0.03, 0.04, 1.15, 5), [px, gp - 0.05, pz]);
      kit.add('darkWood', box(0.3, 0.03, 0.03), [px - 0.13, gp + 1.06, pz]);
      const hx = px - 0.24, hy = gp + 1.06;
      kit.add('#2e2a26', cyl(0.004, 0.004, 0.06, 3), [hx, hy - 0.06, pz]);
      kit.add('#2e2a26', cone(0.11, 0.08, 4), [hx, hy - 0.165, pz], { ry: Math.PI / 4 });
      kit.add('#2e2a26', box(0.15, 0.025, 0.15), [hx, hy - 0.36, pz]);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.12), new THREE.MeshStandardMaterial({ color: '#3b3226', emissive: '#ffb347', emissiveIntensity: 0, flatShading: true }));
      glass.position.set(hx, hy - 0.25, pz);
      const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ff9a3c', emissiveIntensity: 3 }));
      flame.position.copy(glass.position);
      const light = new THREE.PointLight('#ffc47a', 0, 7, 1.4);
      light.position.copy(glass.position);
      let lit = 0;
      return {
        radius: 1.4, door: [0, 1.0], extras: [glass, flame, light],
        update(t, dt, env) {
          lit += ((env.relit ?? 0) - lit) * Math.min(1, dt * 0.7);
          const f = 0.88 + 0.12 * Math.sin(t * 11.3) * Math.sin(t * 6.1 + 1);
          glass.material.emissiveIntensity = lit * (2.4 + env.poke) * f;
          flame.visible = lit > 0.05;
          flame.scale.setScalar(Math.max(0.01, lit) * f);
          light.intensity = lit * (1.2 + env.gloom * 2.4) * f;
        },
      };
    },
  },
  // Ha's kite (voyage.js), past the Edge: a post on a hill, and a long string up to a
  // red kite with a tail of paper bows, dancing in a warm wind. No biome lists it.
  kite: {
    find: { radius: 1.2, rn: [0.1, 0.6], slope: 0.3, wet: 1.4, prefer: 'high' },
    build(kit, ctx, place) {
      const g = place.ground(0, 0);
      kit.add('stone', box(0.5, 0.3, 0.5), [0, g - 0.22, 0], { ry: 0.3 });
      kit.add('darkWood', cyl(0.05, 0.07, 1.1, 6), [0, g - 0.05, 0]);
      kit.add('darkWood', box(0.24, 0.05, 0.05), [0, g + 0.82, 0]);
      const top = new THREE.Vector3(0, g + 1.0, 0);
      // The kite: a diamond, red and darker red, seen from both sides.
      const sail = new THREE.BufferGeometry();
      const [a, b, c, d] = [[0, 0.55, 0], [0.38, 0.05, 0], [0, -0.75, 0], [-0.38, 0.05, 0]];
      sail.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...d, ...b, ...b, ...d, ...c], 3));
      const red = new THREE.Color('#d8352a'), dark = new THREE.Color('#9e2219');
      sail.setAttribute('color', new THREE.Float32BufferAttribute([...red.toArray(), ...red.toArray(), ...red.toArray(), ...dark.toArray(), ...dark.toArray(), ...dark.toArray()], 3));
      sail.computeVertexNormals();
      const kiteMesh = new THREE.Mesh(sail, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
      const cross = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(0.02, 1.3, 0.02).translate(0, -0.1, 0.012), new THREE.BoxGeometry(0.76, 0.02, 0.02).translate(0, 0.05, 0.012)]), ctx.mats.darkWood);
      const bows = Array.from({ length: 6 }, () => {
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9 }));
        return bow;
      });
      const kiteGroup = new THREE.Group();
      kiteGroup.add(kiteMesh, cross);
      // The string sags a little on its way up.
      const N = 16;
      const stringGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(N * 3).fill(0), 3));
      const tailGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(7 * 3).fill(0), 3));
      const line = new THREE.LineBasicMaterial({ color: '#f4ecd8' });
      const string = new THREE.Line(stringGeo, line), tail = new THREE.Line(tailGeo, line);
      string.frustumCulled = tail.frustumCulled = false;
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      let sway = 0;
      return {
        radius: 1.2, door: [0, 0.8], extras: [kiteGroup, string, tail, ...bows],
        update(t, dt, env) {
          sway += dt * (0.8 + (env.wind ?? 1) * 0.3);
          // Up and away downwind, bobbing.
          const kx = 1.6 + Math.sin(sway * 0.7) * 0.5, ky = g + 5.2 + Math.sin(sway * 1.1) * 0.35, kz = -1.0 + Math.sin(sway * 0.5) * 0.4;
          kiteGroup.position.set(kx, ky, kz);
          kiteGroup.rotation.set(-0.35, 0.5 + Math.sin(sway * 0.8) * 0.25, Math.sin(sway * 1.3) * 0.3);
          const pos = stringGeo.attributes.position;
          for (let i = 0; i < N; i++) {
            const f = i / (N - 1);
            p.lerpVectors(top, kiteGroup.position, f);
            p.y -= Math.sin(f * Math.PI) * 0.6;
            pos.setXYZ(i, p.x, p.y, p.z);
          }
          pos.needsUpdate = true;
          // The tail hangs from the bottom tip and flutters.
          q.set(0, -0.75, 0).applyEuler(kiteGroup.rotation).add(kiteGroup.position);
          const tp = tailGeo.attributes.position;
          for (let i = 0; i < 7; i++) {
            const x = q.x - i * 0.08 + Math.sin(sway * 3 + i * 0.9) * 0.1 * i * 0.3, y = q.y - i * 0.26, z = q.z + Math.cos(sway * 2.6 + i) * 0.06 * i;
            tp.setXYZ(i, x, y, z);
            if (i > 0) {
              bows[i - 1].position.set(x, y, z);
              bows[i - 1].rotation.z = Math.sin(sway * 3 + i) * 0.6;
            }
          }
          tp.needsUpdate = true;
        },
      };
    },
  },
};

// Look for ground that suits the landmark; on rugged lands, gradually accept
// steeper ground (the stone plinths sink into the hillside).
function findSpot(ctx, find) {
  for (const relax of [1, 1.6, 2.4]) {
    const spot = findSpotWith(ctx, find, relax);
    if (spot) return spot;
  }
  return null;
}

function findSpotWith(ctx, find, relax) {
  const { shape, spots } = ctx;
  const [rnMin, rnMax] = find.rn;
  const valid = [];
  for (const v of spots) {
    const rn = shape.radial(v.x, v.z);
    if (rn < rnMin || rn > rnMax || shape.isWet(v.x, v.z, find.wet / relax)) continue;
    // Room kept for something laid out first (a hedge maze).
    if (ctx.keepOut?.(v.x, v.z, find.radius)) continue;
    let steep = shape.slopeAt(v.x, v.z);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.4;
      steep = Math.max(steep, shape.slopeAt(v.x + Math.cos(a) * find.radius * 0.6, v.z + Math.sin(a) * find.radius * 0.6));
    }
    if (steep > find.slope * relax) continue;
    valid.push({ v, steep });
    if (valid.length >= 40) break;
  }
  if (!valid.length) return null;
  if (find.prefer === 'high') return valid.reduce((a, b) => (b.v.y > a.v.y ? b : a)).v;
  if (find.prefer === 'flat') return valid.reduce((a, b) => (b.steep < a.steep ? b : a)).v;
  return valid[0].v;
}

function addSmoke(group, at) {
  const puffGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const puff = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({ color: '#e4e4e4', flatShading: true, transparent: true, depthWrite: false }));
    puff.userData.life = i / 7;
    group.add(puff);
    return puff;
  });
  return (t, dt, env) => {
    for (const puff of puffs) {
      const life = (puff.userData.life = (puff.userData.life + dt * (0.22 + env.poke * 0.6)) % 1);
      puff.position.set(at[0] + life * 0.6, at[1] + life * 1.8, at[2] + Math.sin(life * 6 + t) * 0.08);
      puff.scale.setScalar(0.6 + life * 2);
      puff.material.opacity = (1 - life) * 0.55 * Math.min(1, life * 10);
    }
  };
}

// Content packs' buildings (packs/index.js), built like the ones above.
for (const [id, building] of Object.entries(BUILDINGS)) LANDMARKS[id] = { find: building.find, build: building.build };
// What a pack's building gets to build with, besides the kit (see Kit and house above).
const LIB = { THREE, box, cyl, cone, ball, gable, house, Kit, ROOFS, TAU };

// Every kind there is (for the owner's #! links, main.js).
export const LANDMARK_TYPES = Object.keys(LANDMARKS);

export function buildLandmark(type, ctx) {
  const def = LANDMARKS[type];
  const spot = def && findSpot(ctx, def.find);
  if (!spot) return null;
  const yaw = ctx.r.range(0, TAU);
  const place = makePlace(spot, yaw, ctx.shape, def.find.radius);
  const kit = new Kit(ctx.mats);
  // (A pack's building also learns which way is out to sea, for a pier.)
  const out = Math.hypot(spot.x, spot.z) > 1e-6 ? [spot.x / Math.hypot(spot.x, spot.z), spot.z / Math.hypot(spot.x, spot.z)] : [1, 0];
  const outward = [out[0] * Math.cos(yaw) - out[1] * Math.sin(yaw), out[0] * Math.sin(yaw) + out[1] * Math.cos(yaw)];
  const meta = def.build(kit, ctx, place, { ...LIB, spot, yaw, outward, addSmoke });
  const group = kit.build();
  for (const extra of meta.extras ?? []) group.add(extra);
  group.position.set(spot.x, place.base, spot.z);
  group.rotation.y = yaw;
  group.updateMatrix();
  const toLand = ([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrix);

  const updaters = meta.update ? [meta.update] : [];
  for (const at of meta.smoke ?? []) if (at) updaters.push(addSmoke(group, at));
  if (meta.pointLight) {
    const { at, color, power, flicker, always } = meta.pointLight;
    const light = new THREE.PointLight(color, 0, 8, 1.4);
    light.position.fromArray(at);
    group.add(light);
    updaters.push((t, dt, env) => {
      const f = flicker ? 0.82 + 0.18 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1) : 1;
      light.intensity = power * (always ? 0.25 + env.gloom : env.gloom) * f;
    });
  }

  let pokedAt = -99;
  return {
    object: group,
    type,
    spot,
    poke(t) {
      pokedAt = t;
    },
    // How lit-up the landmark still is from its last poke, 1 fading to 0.
    boost(t) {
      return Math.max(0, 1 - (t - pokedAt) / 6);
    },
    radius: meta.radius,
    fields: meta.fields ?? 0,
    door: toLand([meta.door[0], 0, meta.door[1]]),
    lights: (meta.lights ?? []).map(([x, y, z, kind]) => ({ pos: toLand([x, y, z]), kind: kind ?? 'warm' })),
    update(t, dt, env) {
      for (const update of updaters) update(t, dt, env);
    },
  };
}

// --- Paths, fields and other touches -------------------------------------------

// A gently curving path from the landmark's door toward the water or the coast.
export function planPath(ctx, r, from, to) {
  const { shape } = ctx;
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz);
  if (len < 2.2) return null;
  const bend = r.range(-0.3, 0.3) * len;
  const cx = (from.x + to.x) / 2 - (dz / len) * bend, cz = (from.z + to.z) / 2 + (dx / len) * bend;
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, u = 1 - t;
    const x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
    const z = u * u * from.z + 2 * u * t * cz + t * t * to.z;
    if (shape.isWet(x, z, 0.15) || shape.radial(x, z) > 0.93) break;
    pts.push({ x, z });
  }
  if (pts.length < 6) return null;
  const distTo = (x, z) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const ex = b.x - a.x, ez = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez)));
      best = Math.min(best, Math.hypot(x - a.x - ex * t, z - a.z - ez * t));
    }
    return best;
  };
  return { pts, distTo, width: 0.3 };
}

export function buildLanterns(ctx, path) {
  const kit = new Kit(ctx.mats);
  const lights = [];
  let walked = 0, next = 0.9, side = 1;
  for (let i = 1; i < path.pts.length && lights.length < 6; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    while (walked + seg >= next && lights.length < 6) {
      const t = (next - walked) / seg;
      const x = a.x + (b.x - a.x) * t + (-(b.z - a.z) / seg) * 0.42 * side;
      const z = a.z + (b.z - a.z) * t + ((b.x - a.x) / seg) * 0.42 * side;
      const y = ctx.shape.heightAt(x, z);
      kit.add('darkWood', cyl(0.025, 0.03, 0.62, 5), [x, y - 0.05, z]);
      kit.add('glow', box(0.1, 0.13, 0.1), [x, y + 0.57, z]);
      kit.add('darkWood', cone(0.09, 0.08, 4), [x, y + 0.7, z], { ry: Math.PI / 4 });
      lights.push({ pos: new THREE.Vector3(x, y + 0.62, z), kind: 'warm' });
      next += 1.9;
      side = -side;
    }
    walked += seg;
  }
  return { object: kit.build(), lights };
}

const CROPS = {
  meadow: [['#d8b450', '#8f6d40'], ['#86b14f', '#7a5a38']],
  autumn: [['#d89a3a', '#7a5532'], ['#c7a34a', '#7d5a36']],
  blossom: [['#a58ad8', '#6f934c'], ['#f0c2d4', '#6f934c']],
  highlands: [['#9cbf5a', '#6e5a40']],
  dream: [['#f3b6e0', '#8a7ac8']],
};

export function planFields(ctx, r, landmark) {
  const { shape, biomeKey } = ctx;
  if (!CROPS[biomeKey]) return null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const a = r.range(0, TAU), d = landmark.radius + 1.4;
    const cx = landmark.spot.x + Math.cos(a) * d, cz = landmark.spot.z + Math.sin(a) * d;
    if (shape.radial(cx, cz) > 0.72 || shape.isWet(cx, cz, 1.6) || shape.slopeAt(cx, cz) > 0.3) continue;
    const yaw = r.range(0, Math.PI), c = Math.cos(yaw), s = Math.sin(yaw);
    const w = r.range(1.8, 2.6), h = r.range(1.3, 1.9);
    const [crop, soil] = r.pick(CROPS[biomeKey]).map((hex) => new THREE.Color(hex));
    const local = (x, z) => [(x - cx) * c + (z - cz) * s, -(x - cx) * s + (z - cz) * c];
    return {
      paint(x, z) {
        const [lx, lz] = local(x, z);
        if (Math.abs(lx) > w / 2 || Math.abs(lz) > h / 2) return null;
        return Math.floor((lx + w) / 0.28) % 2 ? crop : soil;
      },
      blocked(x, z) {
        const [lx, lz] = local(x, z);
        return Math.abs(lx) < w / 2 + 0.4 && Math.abs(lz) < h / 2 + 0.4;
      },
    };
  }
  return null;
}

export function buildDock(ctx, r, toward) {
  const { lake } = ctx.shape;
  const a = Math.atan2(toward.z - lake.z, toward.x - lake.x);
  const dx = Math.cos(a), dz = Math.sin(a);
  const W = ctx.waterLevel;
  const kit = new Kit(ctx.mats);
  const yaw = Math.atan2(dx, dz);
  // Out from wherever the shore actually is in that direction.
  const mid = ctx.shape.shoreDistance(lake, a) - 0.35;
  kit.add('wood', box(0.42, 0.05, 1.5), [lake.x + dx * mid, W + 0.08, lake.z + dz * mid], { ry: yaw });
  for (const along of [-0.6, 0.6]) {
    for (const side of [-0.25, 0.25]) {
      const d = mid + along;
      // The posts stand a little above the deck (level with it, their tops flickered).
      kit.add('darkWood', cyl(0.03, 0.03, 0.6, 5), [lake.x + dx * d + dz * side, W - 0.42, lake.z + dz * d - dx * side]);
    }
  }
  const group = kit.build();

  // A little rowboat tied up at the end, bobbing.
  const boatKit = new Kit(ctx.mats);
  const hull = new THREE.BoxGeometry(0.3, 0.12, 0.66, 1, 1, 2);
  const pos = hull.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0.3) pos.setX(i, pos.getX(i) * 0.2);
  boatKit.add(r.pick(['#a0714a', '#c75c5c', '#5b7db1', '#e8d8b0']), hull, [0, 0.06, 0]);
  boatKit.add('darkWood', box(0.28, 0.03, 0.08), [0, 0.1, -0.05]);
  const boat = boatKit.build();
  const end = mid - 0.85;
  boat.position.set(lake.x + dx * end + dz * 0.45, W - 0.03, lake.z + dz * end - dx * 0.45);
  boat.rotation.y = yaw + r.range(-0.4, 0.4);
  group.add(boat);
  const baseYaw = boat.rotation.y;
  return {
    object: group,
    update(t) {
      boat.position.y = W - 0.03 + Math.sin(t * 1.3) * 0.02;
      boat.rotation.z = Math.sin(t * 1.1) * 0.04;
      boat.rotation.y = baseYaw + Math.sin(t * 0.3) * 0.08;
    },
  };
}

// Small seasonal touches near the landmark.
export function buildProps(ctx, r, landmark, trees) {
  const { biomeKey, shape } = ctx;
  const kit = new Kit(ctx.mats);
  const near = (radius) => {
    for (let k = 0; k < 20; k++) {
      const a = r.range(0, TAU), d = landmark.radius + r.range(0.2, radius);
      const x = landmark.spot.x + Math.cos(a) * d, z = landmark.spot.z + Math.sin(a) * d;
      if (!shape.isWet(x, z, 0.3) && shape.slopeAt(x, z) < 0.5 && shape.radial(x, z) < 0.9) return [x, shape.heightAt(x, z), z];
    }
    return null;
  };
  const glowMeshes = [];
  if (biomeKey === 'autumn') {
    for (let i = r.int(4, 7); i > 0; i--) {
      const p = near(1.4);
      if (!p) continue;
      const s = r.range(0.8, 1.3);
      kit.add('#e07a2c', ball(0.13, 1), [p[0], p[1] + 0.08 * s, p[2]], { s: [s, s * 0.72, s] });
      kit.add('#4f6b2f', cyl(0.015, 0.02, 0.07, 4), [p[0], p[1] + 0.17 * s, p[2]]);
    }
  } else if (biomeKey === 'snowfield') {
    const p = near(1.2);
    if (p) {
      const [x, y, z] = p;
      kit.add('snow', ball(0.2, 1), [x, y + 0.15, z]);
      kit.add('snow', ball(0.15, 1), [x, y + 0.45, z]);
      kit.add('snow', ball(0.11, 1), [x, y + 0.67, z]);
      kit.add('#e8742c', cone(0.025, 0.12, 5), [x, y + 0.68, z + 0.1], { rx: Math.PI / 2 });
      kit.add('#c0392b', cyl(0.13, 0.13, 0.05, 8), [x, y + 0.55, z]);
    }
  } else if (biomeKey === 'desert' && shape.lake) {
    // Palms ring the oasis.
    const { lake } = shape;
    for (let i = r.int(3, 6); i > 0; i--) {
      const a = r.range(0, TAU), d = shape.shoreDistance(lake, a) + r.range(0.4, 0.9);
      const x = lake.x + Math.cos(a) * d, z = lake.z + Math.sin(a) * d;
      const y = shape.heightAt(x, z), lean = r.range(0, TAU);
      let px = x, pz = z, py = y;
      for (let k = 0; k < 5; k++) {
        kit.add('#9a7650', cyl(0.06 - k * 0.006, 0.07 - k * 0.006, 0.32, 6), [px, py, pz], { rx: Math.sin(lean) * 0.12 * k, rz: -Math.cos(lean) * 0.12 * k });
        px += Math.cos(lean) * 0.035 * k;
        pz += Math.sin(lean) * 0.035 * k;
        py += 0.3;
      }
      for (let f = 0; f < 6; f++) {
        kit.add('#5f9a45', new THREE.ConeGeometry(0.09, 0.75, 4).translate(0, 0.37, 0).scale(1, 1, 0.25), [px, py, pz], { ry: (f / 6) * TAU, rx: 1.1 });
      }
    }
  } else if (biomeKey === 'dream' && trees.length) {
    // Glowing mushrooms under the trees.
    const caps = new THREE.MeshStandardMaterial({ color: '#ffe6fb', emissive: '#ff6fd8', emissiveIntensity: 0.8, flatShading: true });
    const capKit = new Kit({ caps });
    for (let i = 0; i < 14; i++) {
      const t = r.pick(trees);
      const x = t.x + r.range(-0.5, 0.5), z = t.z + r.range(-0.5, 0.5);
      if (shape.isWet(x, z, 0.2)) continue;
      const y = shape.heightAt(x, z), s = r.range(0.7, 1.3);
      kit.add('plaster', cyl(0.025 * s, 0.03 * s, 0.14 * s, 5), [x, y - 0.02, z]);
      capKit.add('caps', cone(0.09 * s, 0.07 * s, 7), [x, y + 0.11 * s, z]);
    }
    glowMeshes.push(capKit.build());
    ctx.mats.mushroomCaps = caps;
  }
  const group = kit.build();
  glowMeshes.forEach((m) => group.add(m));
  return {
    object: group,
    update(t, dt, env) {
      if (ctx.mats.mushroomCaps) ctx.mats.mushroomCaps.emissiveIntensity = 0.5 + env.night * 2.5;
    },
  };
}

// Warm (or cool) pools of light on the ground around lamps after dark.
export function buildLightPools(lights, shape) {
  const COLORS = { warm: '#ffb35c', cool: '#8f9bff', fire: '#ff8a3a' };
  const group = new THREE.Group();
  const items = lights.map(({ pos, kind }) => {
    const radius = kind === 'fire' ? 1.7 : 1.1;
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 8, 8).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, shape.heightAt(pos.x + p.getX(i), pos.z + p.getZ(i)) + 0.04);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS[kind]).lerp(new THREE.Color('#fff2dc'), 0.35).multiplyScalar(1.3), map: softDot(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos.x, 0, pos.z);
    group.add(mesh);
    return { material, kind };
  });
  return {
    object: group,
    update(t, dt, env) {
      group.visible = env.gloom > 0.02;
      items.forEach(({ material, kind }, i) => {
        material.opacity = env.gloom * (kind === 'fire' ? 0.5 * (0.85 + 0.15 * Math.sin(t * 11 + i)) : 0.3);
      });
    },
  };
}

// --- Sky life ------------------------------------------------------------------

// A message in a bottle, lying where the water meets the land (or near the rim, on an
// island with no lake), with a glint so it can be spotted from afar. `r` is its own
// stream, so nothing else on the land moves. Its group carries the tap (world.js).
export function buildBottle(shape, r, blocked) {
  const ok = (x, z) => !shape.isWet(x, z, 0.05) && !blocked(x, z) && shape.slopeAt(x, z) < 0.6 && shape.radial(x, z) < 0.88;
  const start = r.range(0, TAU);
  let at = null;
  for (let k = 0; k < 48 && !at; k++) {
    const a = start + k * 0.37;
    if (shape.lake) {
      // Out from the lake until the ground is dry (the real shore wanders round its radius).
      for (let step = 1; step <= 8 && !at; step++) {
        const d = shape.shoreDistance(shape.lake, a) + step * 0.25;
        const x = shape.lake.x + Math.cos(a) * d, z = shape.lake.z + Math.sin(a) * d;
        if (ok(x, z)) at = [x, z, a];
      }
    } else {
      for (const d of [6.2, 5.4, 4.6, 3.8]) {
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (shape.radial(x, z) > 0.5 && ok(x, z)) {
          at = [x, z, a];
          break;
        }
      }
    }
  }
  if (!at) return null;
  const [x, z, a] = at;
  const group = new THREE.Group();
  group.position.set(x, shape.heightAt(x, z) + 0.08, z);
  group.rotation.y = -a + r.range(-0.6, 0.6);
  // Lying on its side, the neck up the beach a little.
  const bottle = new THREE.Group();
  bottle.rotation.z = Math.PI / 2 - 0.12;
  const glass = new THREE.MeshStandardMaterial({ color: '#6fbf9a', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.6, emissive: '#2f6b55', emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12), glass);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 0.08, 12).translate(0, 0.21, 0), glass);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10).translate(0, 0.3, 0), glass);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.06, 8).translate(0, 0.37, 0), new THREE.MeshStandardMaterial({ color: '#a87a4a', roughness: 0.9 }));
  const note = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 10), new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9 }));
  bottle.add(note, body, shoulder, neck, cork);
  group.add(bottle);
  // The glint: a soft star that pulses, so the eye finds it.
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glint.position.set(0.12, 0.12, 0);
  group.add(glint);
  let hop = 0;
  return {
    object: group,
    tap() {
      hop = 1;
    },
    update(t, dt) {
      hop = Math.max(0, hop - dt * 2.5);
      bottle.position.y = Math.sin(hop * Math.PI) * 0.12;
      bottle.rotation.x = Math.sin(t * 0.8) * 0.05 + hop * 0.6;
      const pulse = Math.max(0, Math.sin(t * 1.7)) ** 6;
      glint.scale.setScalar(0.2 + pulse * 0.7);
      glint.material.opacity = 0.35 + pulse * 0.65;
    },
  };
}

export function buildBalloon(r, mats) {
  const group = new THREE.Group();
  const [c1, c2] = r.pick([['#e2574c', '#f4d35e'], ['#4f86c6', '#f2f2f2'], ['#7bc67b', '#f4a259'], ['#9b6bd1', '#f6c6ea']]).map((h) => new THREE.Color(h));
  const envelope = new THREE.SphereGeometry(0.9, 12, 10).toNonIndexed();
  envelope.scale(1, 1.15, 1);
  const pos = envelope.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const c = Math.floor(((Math.atan2(cz, cx) + Math.PI) / TAU) * 12) % 2 ? c1 : c2;
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
  }
  envelope.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const balloon = new THREE.Mesh(envelope, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }));
  balloon.position.y = 1.55;
  balloon.castShadow = true;
  const kit = new Kit(mats);
  kit.add('wood', box(0.34, 0.26, 0.34), [0, 0, 0]);
  for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) kit.add('darkWood', cyl(0.008, 0.008, 0.62, 3), [x, 0.26, z]);
  kit.build(group);
  const flame = new THREE.Mesh(cone(0.05, 0.16, 5), mats.flame);
  flame.position.y = 0.36;
  group.add(balloon, flame);
  const radius = r.range(15, 19), height = r.range(5, 9), speed = r.range(0.015, 0.03);
  let angle = r.range(0, TAU), lift = 0, burn = 0;
  return {
    object: group,
    lift() {
      burn = 1;
    },
    update(t, dt) {
      angle += speed * dt;
      lift += (burn * 2.5 - lift * 0.35) * dt;
      burn *= Math.exp(-dt * 1.5);
      group.position.set(Math.cos(angle) * radius, height + lift + Math.sin(t * 0.4) * 0.5, Math.sin(angle) * radius);
      group.rotation.y = t * 0.05;
      flame.scale.setScalar(1 + burn * 2);
      flame.scale.y = (0.7 + Math.abs(Math.sin(t * 7)) * 0.6) * (1 + burn * 3);
    },
  };
}
