import * as THREE from 'three';
import { t } from '../i18n.js';

// The lantern market: strings of paper lanterns over every path and round the
// square, a few stalls, and a sky stuck just after sunset. The stallholders
// always have a spare lantern for a sky-sailor.

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

// Poles along the path (or in a ring round the landmark), with strings between them, and some stalls.
function plan({ shape, spots, taken, landmark, path, r }) {
  const poles = [];
  const ok = (x, z) => !shape.isWet(x, z, 0.4) && shape.radial(x, z) < 0.9 && !(landmark && Math.hypot(x - landmark.spot.x, z - landmark.spot.z) < landmark.radius + 0.2);
  if (path) {
    let side = 1;
    for (let i = 1; i < path.pts.length; i += 3) {
      const a = path.pts[i - 1], b = path.pts[Math.min(i + 1, path.pts.length - 1)];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
      const x = path.pts[i].x - (dz / len) * 0.55 * side, z = path.pts[i].z + (dx / len) * 0.55 * side;
      side = -side;
      if (ok(x, z)) poles.push({ x, z });
    }
  }
  if (poles.length < 4 && landmark) {
    poles.length = 0;
    const d = landmark.radius + 0.7;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU;
      const x = landmark.spot.x + Math.cos(a) * d, z = landmark.spot.z + Math.sin(a) * d;
      if (ok(x, z)) poles.push({ x, z });
    }
  }
  const strings = [];
  for (let i = 1; i < poles.length; i++) {
    if (Math.hypot(poles[i].x - poles[i - 1].x, poles[i].z - poles[i - 1].z) < 3.2) strings.push([poles[i - 1], poles[i]]);
  }
  const stalls = [];
  for (const v of spots) {
    if (stalls.length >= 3) break;
    if (taken(v.x, v.z) || !ok(v.x, v.z) || shape.slopeAt(v.x, v.z) > 0.3) continue;
    const near = landmark ? Math.hypot(v.x - landmark.spot.x, v.z - landmark.spot.z) : 0;
    if (landmark && (near < landmark.radius + 0.6 || near > landmark.radius + 3)) continue;
    if (stalls.some((s) => Math.hypot(s.x - v.x, s.z - v.z) < 1.4) || poles.some((p) => Math.hypot(p.x - v.x, p.z - v.z) < 0.7)) continue;
    stalls.push({ x: v.x, z: v.z, turn: landmark ? Math.atan2(landmark.spot.x - v.x, landmark.spot.z - v.z) : r.range(0, TAU) });
  }
  const along = (x, z, [a, b]) => {
    const dx = b.x - a.x, dz = b.z - a.z, k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a.x - dx * k, z - a.z - dz * k);
  };
  return {
    poles, strings, stalls,
    blocked: (x, z) => poles.some((p) => Math.hypot(x - p.x, z - p.z) < 0.35)
      || stalls.some((s) => Math.hypot(x - s.x, z - s.z) < 0.8)
      || strings.some((st) => along(x, z, st) < 0.6),
  };
}

function build({ plan, shape, top, r, lib }) {
  const { poles, strings, stalls } = plan;
  const group = new THREE.Group();
  const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
  const wood = [], rope = [], cloth = [[], []], goods = [];
  const tops = poles.map((p) => {
    const y = shape.heightAt(p.x, p.z);
    wood.push(new THREE.CylinderGeometry(0.035, 0.045, 1.95, 5).translate(p.x, y + 0.9, p.z));
    return new THREE.Vector3(p.x, y + 1.85, p.z);
  });
  // Strings sag between the poles, with a lantern every so often.
  const lanterns = [];
  for (const [a, b] of strings) {
    const pa = tops[poles.indexOf(a)], pb = tops[poles.indexOf(b)];
    const n = Math.max(4, Math.round(pa.distanceTo(pb) / 0.32));
    let last = pa;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      const at = new THREE.Vector3().lerpVectors(pa, pb, f);
      at.y -= Math.sin(f * Math.PI) * 0.28;
      const dir = new THREE.Vector3().subVectors(at, last);
      const mid = new THREE.Vector3().addVectors(at, last).multiplyScalar(0.5);
      const seg = new THREE.CylinderGeometry(0.008, 0.008, dir.length(), 3);
      seg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
      rope.push(seg.translate(mid.x, mid.y, mid.z));
      if (k < n) lanterns.push({ at: at.clone(), phase: r.range(0, TAU), color: r.pick(['#ff5a3a', '#ff8a2a', '#ffc23a', '#ff6a8a']) });
      last = at;
    }
  }
  // Market stalls: a counter, four posts, a striped awning and something to sell.
  for (const s of stalls) {
    const y = shape.heightAt(s.x, s.z);
    const c = Math.cos(s.turn), sn = Math.sin(s.turn);
    const at = (lx, ly, lz) => [s.x + lx * c + lz * sn, y + ly, s.z - lx * sn + lz * c];
    const put = (geo, lx, ly, lz) => geo.rotateY(s.turn).translate(...at(lx, ly, lz));
    wood.push(put(new THREE.BoxGeometry(0.9, 0.42, 0.4), 0, 0.2, 0));
    for (const [lx, lz] of [[-0.42, -0.18], [0.42, -0.18], [-0.42, 0.18], [0.42, 0.18]]) wood.push(put(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), lx, 0.55, lz));
    for (let i = 0; i < 6; i++) cloth[i % 2].push(put(new THREE.BoxGeometry(0.17, 0.03, 0.62).rotateX(0.22), -0.425 + i * 0.17, 1.1, 0.02));
    for (let i = 0; i < 5; i++) goods.push(put(new THREE.IcosahedronGeometry(0.06, 0), -0.3 + i * 0.15, 0.47, r.range(-0.08, 0.08)));
  }
  const addMesh = (geos, material, shadow = true) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(lib.flat(...geos), material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  addMesh(wood, mat('#5a4030'));
  addMesh(rope, mat('#3a2a20'), false);
  addMesh(cloth[0], mat('#c8382a'));
  addMesh(cloth[1], mat('#f4ece0'));
  addMesh(goods, mat('#e8a03a'));

  // The lanterns themselves: paper, lit from inside, brighter as it gets darker.
  const glow = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const shape3 = lib.flat(
    new THREE.SphereGeometry(0.075, 8, 6).scale(1, 1.2, 1),
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6).translate(0, 0.095, 0),
    new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6).translate(0, -0.095, 0),
  );
  const lamps = lanterns.length ? new THREE.InstancedMesh(shape3, glow, lanterns.length) : null;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color(), across = new THREE.Vector3(0, 0, 1);
  if (lamps) {
    lanterns.forEach((l, i) => lamps.setColorAt(i, col.set(l.color)));
    group.add(lamps);
  }
  // Sky lanterns, let go from all over the island, rising slowly and drifting off.
  const rim = top.rings[top.rings.length - 1];
  const reach = Math.max(...rim.map((v) => Math.hypot(v.x, v.z)));
  const flying = Array.from({ length: 22 }, (_, i) => {
    const a = r.range(0, TAU), d = Math.sqrt(r()) * reach * 0.8;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    return { x, z, ground: shape.heightAt(x, z), speed: r.range(0.18, 0.32), offset: r.range(0, 1), drift: r.range(0, TAU) };
  });
  const sky = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.08, 0.2, 6), glow, flying.length);
  sky.frustumCulled = false;
  flying.forEach((f, i) => sky.setColorAt(i, col.set(r.pick(['#ff9a3a', '#ffb84a', '#ff7a3a']))));
  group.add(sky);
  const HIGH = 11;
  return {
    object: group,
    mirrorHide: [sky, ...(lamps ? [lamps] : [])],
    update(time, dt, env) {
      glow.color.setScalar(0.75 + env.gloom * 0.9 + env.night * 0.5);
      flying.forEach((f, i) => {
        // Each climbs from the ground to well above the island, then a new one goes up.
        const k = (time * f.speed / HIGH + f.offset) % 1;
        const fade = Math.min(1, k * 8, (1 - k) * 5);
        m.compose(p.set(f.x + Math.sin(time * 0.3 + f.drift) * k * 1.5 + env.wind * k * 2, f.ground + 0.3 + k * HIGH, f.z + Math.cos(time * 0.25 + f.drift) * k * 1.5), q.identity(), one.setScalar(fade));
        sky.setMatrixAt(i, m);
      });
      one.setScalar(1);
      sky.instanceMatrix.needsUpdate = true;
      if (!lamps) return;
      lanterns.forEach((l, i) => {
        const swing = Math.sin(time * (1.2 + env.wind * 0.4) + l.phase) * (0.08 + env.wind * 0.05);
        p.copy(l.at).y -= 0.12;
        m.compose(p, q.setFromAxisAngle(across, swing), one);
        lamps.setMatrixAt(i, m);
      });
      lamps.instanceMatrix.needsUpdate = true;
    },
  };
}

export default {
  id: 'lanterns',
  island: {
    biome: {
      label: 'lantern market',
      grass: ['#5f9a4f', '#7fae64'], dirt: '#7a5a40', rock: ['#8a807a', '#6a625c'], sand: '#d8c8a0',
      hills: 1.5, peak: 1.2,
      water: { color: '#3a6a9a', opacity: 0.86 }, lake: 0.6, river: 0.4,
      flora: { kind: 'round', count: 30, groves: 0, colors: ['#3e7f3a', '#4f8f42', '#2f6f34'] },
      tufts: ['#ff6a4a', '#ffd23a'],
      landmark: [['village', 3], ['inn', 2], ['fortune', 1]], path: '#c8a878',
      weather: [['clear', 4], ['cloudy', 2], ['mist', 1]],
      ambient: ['fireflies'],
    },
    species: [['round', 3], ['willow', 1], ['poplar', 1]],
    grass: { density: 0.8 },
    neighbours: [['squirrel', 1, 2]],
    furniture: { plan, build },
    word: {
      id: 'stall', name: t('market-stall words call lantern markets'),
      line: t('Paper lanterns hang over every path, and it’s always just after sunset.'),
      words: 'lampion lampions nightmarket nightmarkets hawker hawkers stall stalls vendor vendors haggle haggling',
      roots: 'lampion hawker nightmarket',
    },
    note: t('At the lantern market it’s always dusk, and the stallholders always have a spare lantern for a sky-sailor.'),
    journal: ['🪔', 'lantern market', 'say something about market stalls on a voyage'],
    trees: [{ glimmer: 1, food: 1 }, t('dumplings from a stall')],
    reach: [[0, 1], [1, 1]],
    vibe: { hours: 19.4 },
    arrive(g) {
      if (g.run.lanterns >= 3) return `🏮 ${t('The stallholders hold their lanterns up to wave you in.')}`;
      return `🏮 ${t('A stallholder spots Wa’s balloon and hands you a paper lantern: {got}', { got: g.give({ lanterns: 1 }) })}`;
    },
  },
};
