import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { softDot } from './sky.js';

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

// Every kind there is (for the owner's #! links, main.js).
export const LANDMARK_TYPES = Object.keys(LANDMARKS);

export function buildLandmark(type, ctx) {
  const def = LANDMARKS[type];
  const spot = def && findSpot(ctx, def.find);
  if (!spot) return null;
  const yaw = ctx.r.range(0, TAU);
  const place = makePlace(spot, yaw, ctx.shape, def.find.radius);
  const kit = new Kit(ctx.mats);
  const meta = def.build(kit, ctx, place);
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
    for (const side of [-0.18, 0.18]) {
      const d = mid + along;
      kit.add('darkWood', cyl(0.03, 0.03, 0.55, 5), [lake.x + dx * d + dz * side, W - 0.42, lake.z + dz * d - dx * side]);
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
