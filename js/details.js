import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The small things that make a land feel lived-in and grown rather than
// generated. Nearly all of it is merged into one static, vertex-colored mesh.

const TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function placed(geo, [x, y, z], { rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  if (Array.isArray(s)) _s.fromArray(s);
  else _s.setScalar(s);
  const g = geo.index ? geo.toNonIndexed() : geo;
  return g.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s));
}

// Color every face, optionally per face from its normal (moss on top, say).
function painted(geo, color) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.sub(b)).normalize();
    const col = typeof color === 'function' ? color(n, tmp) : tmp.set(color);
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const piece = (geo, color, at, opts) => painted(placed(geo, at, opts), color);

const MOSS = { meadow: '#5f8f3a', highlands: '#5a7f45', autumn: '#7f8a3a', blossom: '#6a9a45', dream: '#8a7ad0', snowfield: '#f2f5f8', desert: null };
const LUSH = ['meadow', 'highlands', 'autumn', 'blossom', 'dream'];

export function buildDetails({ top, under, shape, biome, biomeKey, trees, landmark, path, water, waterLevel, blocked, r }) {
  const parts = [];
  const groundY = (x, z) => shape.heightAt(x, z);
  const dry = (x, z, margin = 0.2) => !shape.isWet(x, z, margin);
  const nearTree = (min, max) => {
    const t = r.pick(trees);
    const a = r.range(0, TAU), d = r.range(min, max);
    return [t.x + Math.cos(a) * d, t.z + Math.sin(a) * d];
  };
  const open = (x, z) => dry(x, z) && !blocked(x, z) && shape.radial(x, z) < 0.93 && shape.slopeAt(x, z) < 0.6;

  // Boulders in little clusters, mossy (or snowy) on top.
  const rockA = biome.rock[0], rockB = biome.rock[1], moss = MOSS[biomeKey] && new THREE.Color(MOSS[biomeKey]);
  for (let cluster = r.int(6, 10); cluster > 0; cluster--) {
    const v = r.pick(top.rings[r.int(4, top.rings.length - 3)]);
    if (!open(v.x, v.z)) continue;
    for (let k = r.int(1, 4); k > 0; k--) {
      const x = v.x + r.range(-0.5, 0.5), z = v.z + r.range(-0.5, 0.5), size = r.range(0.14, 0.55);
      const shade = r();
      parts.push(piece(new THREE.DodecahedronGeometry(1, 0), (n, col) => (moss && n.y > 0.55 ? col.copy(moss).offsetHSL(0, 0, (r() - 0.5) * 0.05) : col.copy(rockA).lerp(rockB, shade).offsetHSL(0, 0, (r() - 0.5) * 0.04)),
        [x, groundY(x, z) + size * 0.25, z], { rx: r() * TAU, ry: r() * TAU, s: [size, size * r.range(0.55, 0.85), size * r.range(0.8, 1.2)] }));
    }
  }

  if (trees.length && LUSH.includes(biomeKey)) {
    // Fallen logs and old stumps among the trees.
    for (let i = r.int(2, 4); i > 0; i--) {
      const [x, z] = nearTree(0.7, 1.3);
      if (!open(x, z)) continue;
      const len = r.range(0.7, 1.3), rad = r.range(0.07, 0.11), yaw = r.range(0, TAU);
      parts.push(piece(new THREE.CylinderGeometry(rad, rad * 1.1, len, 7), (n, col) => col.set(Math.abs(n.y) > 0.8 ? '#c9a77a' : '#6a4a32'), [x, groundY(x, z) + rad * 0.8, z], { rz: Math.PI / 2, ry: yaw }));
    }
    for (let i = r.int(3, 5); i > 0; i--) {
      const [x, z] = nearTree(0.6, 1.4);
      if (!open(x, z)) continue;
      const h = r.range(0.1, 0.2), rad = r.range(0.08, 0.12);
      parts.push(piece(new THREE.CylinderGeometry(rad, rad * 1.25, h, 7), (n, col) => col.set(n.y > 0.8 ? '#d2b080' : '#5e4330'), [x, groundY(x, z) + h / 2 - 0.02, z]));
    }
    // Ferns in the shade.
    const fern = new THREE.Color(biomeKey === 'dream' ? '#7a6ad0' : biomeKey === 'autumn' ? '#9a8a3a' : '#3f7a35');
    for (let i = 0; i < 40; i++) {
      const [x, z] = nearTree(0.3, 0.9);
      if (!open(x, z)) continue;
      const y = groundY(x, z) - 0.01, s = r.range(0.7, 1.2);
      for (let f = 0; f < 6; f++) {
        const yaw = (f / 6) * TAU + r.range(-0.2, 0.2);
        parts.push(piece(new THREE.ConeGeometry(0.045, 0.32, 3).translate(0, 0.16, 0).scale(1, 1, 0.25).rotateX(0.9), fern.clone().offsetHSL(0, 0, (r() - 0.5) * 0.06), [x, y, z], { ry: yaw, s }));
      }
    }
    // Mushrooms: mostly brown, the odd red one.
    if (biomeKey !== 'dream') {
      for (let i = 0; i < 16; i++) {
        const [x, z] = nearTree(0.25, 0.8);
        if (!open(x, z)) continue;
        const y = groundY(x, z), s = r.range(0.6, 1.2);
        parts.push(piece(new THREE.CylinderGeometry(0.015, 0.02, 0.08, 5), '#efe6d2', [x, y, z], { s }));
        parts.push(piece(new THREE.ConeGeometry(0.05, 0.04, 7), r.chance(0.2) ? '#c23b2e' : '#8a5a3a', [x, y + 0.09 * s, z], { s }));
      }
    }
  }

  // Reeds and cattails at the water's edge, lily pads out on the water.
  let pads = null;
  if (shape.lake && !biome.water.frozen) {
    // Every pool's own waterline, ponds included.
    const shore = [];
    for (const v of top.rings.flat()) {
      const pool = shape.waterAt(v.x, v.z, 0.35);
      if (pool && Math.abs(pool.level - v.y) < 0.16) shore.push({ v, pool });
    }
    for (let cluster = Math.min(shore.length, r.int(10, 16) + shape.pools.length * 3); cluster > 0; cluster--) {
      const { v, pool } = r.pick(shore);
      for (let k = r.int(5, 9); k > 0; k--) {
        const x = v.x + r.range(-0.18, 0.18), z = v.z + r.range(-0.18, 0.18), h = r.range(0.35, 0.7);
        const y = Math.max(groundY(x, z), pool.level - 0.1);
        const lean = { rx: r.range(-0.15, 0.15), rz: r.range(-0.15, 0.15) };
        parts.push(piece(new THREE.ConeGeometry(0.012, h, 3).translate(0, h / 2, 0), '#6f8a3a', [x, y, z], lean));
        if (r.chance(0.35)) parts.push(piece(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 5).translate(0, h * 0.82, 0), '#6a4028', [x, y, z], lean));
      }
    }
    const padParts = [];
    for (const pool of shape.pools) {
      for (let i = Math.round(pool.radius * r.range(4, 7)); i > 0; i--) {
        const a = r.range(0, TAU), d = Math.sqrt(r()) * shape.shoreDistance(pool, a) * 0.85;
        const x = pool.x + Math.cos(a) * d, z = pool.z + Math.sin(a) * d;
        const depth = pool.level - groundY(x, z);
        if (depth < 0.12 || depth > 0.8) continue;
        const size = r.range(0.1, 0.18);
        padParts.push(piece(new THREE.CylinderGeometry(size, size, 0.012, 10), r.pick(['#4f8f3a', '#5f9f45', '#467f35']), [x, pool.level + 0.01, z], { ry: r() * TAU }));
        if (r.chance(0.3)) padParts.push(piece(new THREE.ConeGeometry(0.05, 0.06, 6), r.pick(['#ffffff', '#ffc4d6']), [x, pool.level + 0.05, z]));
      }
    }
    if (padParts.length && water) {
      // Children of the water, so they rise and fall with it.
      pads = new THREE.Mesh(mergeGeometries(padParts), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }));
      pads.receiveShadow = true;
      water.add(pads);
    }
  }

  // Roots and vines hanging from the cliff edge (icicles on snowy lands), and
  // rocky spikes under the land.
  const edge = top.rings[top.rings.length - 1];
  const hanging = biomeKey === 'snowfield' ? '#dff1fb' : biomeKey === 'desert' ? '#8a6a48' : null;
  for (let i = 0; i < edge.length; i += 3) {
    if (!r.chance(0.55)) continue;
    const v = edge[i];
    const x = v.x * 0.96, z = v.z * 0.96, y = v.y - 0.35;
    if (shape.isWet(v.x, v.z, 0.6)) continue;
    const len = r.range(0.4, biomeKey === 'snowfield' ? 0.9 : 1.8);
    const color = hanging ?? (r.chance(0.5) ? '#4f7a35' : '#5a4030');
    parts.push(piece(new THREE.ConeGeometry(biomeKey === 'snowfield' ? 0.05 : 0.025, len, 4).rotateX(Math.PI).translate(0, -len / 2, 0), color, [x, y, z], { rx: r.range(-0.12, 0.12), rz: r.range(-0.12, 0.12) }));
  }
  const n = new THREE.Vector3();
  const below = under.tris.filter((tri) => {
    n.subVectors(tri[1], tri[0]).cross(new THREE.Vector3().subVectors(tri[2], tri[0])).normalize();
    return n.y < -0.4 && tri[0].y < -1.5;
  });
  for (let i = Math.min(below.length, 10); i > 0; i--) {
    const tri = r.pick(below);
    const x = (tri[0].x + tri[1].x + tri[2].x) / 3, y = (tri[0].y + tri[1].y + tri[2].y) / 3, z = (tri[0].z + tri[1].z + tri[2].z) / 3;
    const len = r.range(0.6, 1.6);
    parts.push(piece(new THREE.ConeGeometry(r.range(0.15, 0.3), len, 5).rotateX(Math.PI).translate(0, -len / 2 + 0.1, 0), (nn, col) => col.copy(rockA).lerp(rockB, 0.6), [x, y, z]));
  }

  // A fence along the first stretch of the path.
  if (path && LUSH.includes(biomeKey)) {
    const posts = [];
    let walked = 0, next = 0.6;
    for (let i = 1; i < path.pts.length && walked < 4.5; i++) {
      const a = path.pts[i - 1], b = path.pts[i], seg = Math.hypot(b.x - a.x, b.z - a.z);
      while (walked + seg >= next && next < 4.5) {
        const t = (next - walked) / seg;
        const px = a.x + (b.x - a.x) * t + (-(b.z - a.z) / seg) * -0.42, pz = a.z + (b.z - a.z) * t + ((b.x - a.x) / seg) * -0.42;
        if (dry(px, pz, 0.1)) posts.push(new THREE.Vector3(px, groundY(px, pz), pz));
        next += 0.55;
      }
      walked += seg;
    }
    posts.forEach((p, i) => {
      parts.push(piece(new THREE.BoxGeometry(0.05, 0.38, 0.05).translate(0, 0.17, 0), '#7a5a3c', [p.x, p.y, p.z]));
      const q = posts[i + 1];
      if (!q) return;
      const len = Math.hypot(q.x - p.x, q.z - p.z), yaw = Math.atan2(q.x - p.x, q.z - p.z);
      for (const h of [0.14, 0.28]) {
        parts.push(piece(new THREE.BoxGeometry(0.025, 0.035, len).rotateX(-Math.atan2(q.y - p.y, len)), '#8a6a48', [(p.x + q.x) / 2, (p.y + q.y) / 2 + h, (p.z + q.z) / 2], { ry: yaw }));
      }
    });
  }

  // Bits and pieces of daily life by the landmark's door.
  if (landmark) {
    const kinds = { cabin: ['woodpile', 'barrel', 'barrel'], village: ['barrel', 'crate', 'cart', 'crate'], windmill: ['sacks', 'cart', 'sacks'], castle: ['barrel', 'crate', 'barrel', 'crate'], campsite: ['crate', 'woodpile'], lighthouse: ['barrel', 'crate'] }[landmark.type] ?? [];
    for (const kind of kinds) {
      let x, z;
      for (let k = 0; k < 12; k++) {
        const a = r.range(0, TAU), d = r.range(0.6, 1.2);
        x = landmark.door.x + Math.cos(a) * d;
        z = landmark.door.z + Math.sin(a) * d;
        if (dry(x, z) && shape.slopeAt(x, z) < 0.5 && !(path && path.distTo(x, z) < 0.3) && Math.hypot(x - landmark.spot.x, z - landmark.spot.z) > landmark.radius * 0.45) break;
      }
      const y = groundY(x, z), yaw = r.range(0, TAU);
      if (kind === 'barrel') {
        parts.push(piece(new THREE.CylinderGeometry(0.09, 0.08, 0.22, 8).translate(0, 0.11, 0), (nn, col) => col.set(Math.abs(nn.y) > 0.8 ? '#9a7048' : '#7a5232'), [x, y - 0.01, z]));
        parts.push(piece(new THREE.CylinderGeometry(0.093, 0.093, 0.025, 8).translate(0, 0.16, 0), '#3a3a3e', [x, y - 0.01, z]));
      } else if (kind === 'crate') {
        parts.push(piece(new THREE.BoxGeometry(0.2, 0.2, 0.2).translate(0, 0.1, 0), '#a07848', [x, y - 0.01, z], { ry: yaw }));
      } else if (kind === 'woodpile') {
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < 4 - row; k++) {
            parts.push(piece(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), (nn, col) => col.set(Math.abs(nn.y) > 0.8 ? '#d2b080' : '#6a4a32'), [x + Math.cos(yaw) * (k - (3 - row) / 2) * 0.085, y + 0.04 + row * 0.07, z - Math.sin(yaw) * (k - (3 - row) / 2) * 0.085], { rz: Math.PI / 2, ry: yaw + Math.PI / 2 }));
          }
        }
      } else if (kind === 'sacks') {
        for (let k = 0; k < 3; k++) parts.push(piece(new THREE.IcosahedronGeometry(0.08, 1), '#d8c79a', [x + (k - 1) * 0.12, y + 0.06, z + r.range(-0.05, 0.05)], { s: [1, 0.8, 0.8] }));
      } else if (kind === 'cart') {
        parts.push(piece(new THREE.BoxGeometry(0.32, 0.12, 0.5).translate(0, 0.2, 0), '#8a6440', [x, y, z], { ry: yaw }));
        for (const side of [-1, 1]) {
          parts.push(piece(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10).rotateZ(Math.PI / 2), '#5a4030', [x + Math.cos(yaw) * side * 0.18, y + 0.11, z - Math.sin(yaw) * side * 0.18], { ry: yaw }));
        }
        parts.push(piece(new THREE.BoxGeometry(0.03, 0.03, 0.45).rotateX(0.3), '#6a4a32', [x + Math.sin(yaw) * 0.42, y + 0.15, z + Math.cos(yaw) * 0.42], { ry: yaw }));
      }
    }
  }

  const group = new THREE.Group();
  if (parts.length) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { object: group, pads };
}
