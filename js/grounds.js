import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Things laid out across a whole island rather than dotted about it: the hedge
// maze, and rows of tea round the terraces or lavender across the fields.
// Each has its own random stream (world.js), so other lands never change.

const TAU = Math.PI * 2;

// --- The hedge maze -------------------------------------------------------------

const CELL = 0.62; // corridor width, wall to wall
const WALL = { height: 0.52, thick: 0.2 };

// A square maze at a random turn, on the flattest dry ground near the middle.
// It's planned before the landmark, which then finds room beside it.
export function planMaze(shape, r) {
  const yaw = r.range(0, TAU), c = Math.cos(yaw), s = Math.sin(yaw);
  const toLand = (cx, cz, u, v) => [cx + u * c - v * s, cz + u * s + v * c];
  // The island levels a lawn for it (world.js); failing that, the middle.
  const candidates = [shape.lawn ?? { x: 0, z: 0 }];
  for (let i = 0; i < 40; i++) {
    const a = r.range(0, TAU), d = Math.sqrt(r()) * 4.5;
    candidates.push({ x: Math.cos(a) * d, z: Math.sin(a) * d });
  }
  const from = candidates[0];
  candidates.sort((p, q) => Math.hypot(p.x - from.x, p.z - from.z) - Math.hypot(q.x - from.x, q.z - from.z));

  const fits = ({ x, z }, half, loose = 1) => {
    let lo = Infinity, hi = -Infinity;
    for (let u = -half - 0.3; u <= half + 0.31; u += 0.4) {
      for (let v = -half - 0.3; v <= half + 0.31; v += 0.4) {
        const [px, pz] = toLand(x, z, u, v);
        if (shape.radial(px, pz) > 0.86 + 0.04 * (loose - 1) || shape.isWet(px, pz, 0.3 / loose) || shape.slopeAt(px, pz) > 0.7 * loose) return false;
        const h = shape.heightAt(px, pz);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
    return hi - lo < 1.2 * loose;
  };

  // Smaller mazes if a big one won't fit, and at the last, rougher ground.
  for (const [n, loose] of [[9, 1], [7, 1], [5, 1], [7, 1.5], [5, 1.5]]) {
    const half = (n * CELL) / 2;
    const at = candidates.find((p) => fits(p, half, loose));
    if (at) return carve(at, n, yaw, toLand, r);
  }
  return null;
}

// Carve the corridors (a depth-first walk from the middle), open one side, and
// list the walls that are left as segments in the maze's own (u, v) frame.
function carve(at, n, yaw, toLand, r) {
  const half = (n * CELL) / 2;
  const east = Array.from({ length: n }, () => Array(n).fill(true));
  const south = Array.from({ length: n }, () => Array(n).fill(true));
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const mid = (n - 1) / 2;
  const stack = [[mid, mid]];
  seen[mid][mid] = true;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = r.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([di, dj]) => [i + di, j + dj, di, dj])
      .find(([ni, nj]) => ni >= 0 && nj >= 0 && ni < n && nj < n && !seen[ni][nj]);
    if (!next) {
      stack.pop();
      continue;
    }
    const [ni, nj, di, dj] = next;
    if (di) east[Math.min(i, ni)][j] = false;
    else south[i][Math.min(j, nj)] = false;
    seen[ni][nj] = true;
    stack.push([ni, nj]);
  }

  const edge = (k) => -half + k * CELL;
  const walls = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i < n - 1 && east[i][j]) walls.push([edge(i + 1), edge(j), edge(i + 1), edge(j + 1)]);
      if (j < n - 1 && south[i][j]) walls.push([edge(i), edge(j + 1), edge(i + 1), edge(j + 1)]);
    }
  }
  // The outer hedge, with a gap in the middle of one side.
  const gate = r.int(0, 3);
  for (let k = 0; k < n; k++) {
    const open = k === mid;
    if (!(open && gate === 0)) walls.push([edge(k), -half, edge(k + 1), -half]);
    if (!(open && gate === 1)) walls.push([edge(k), half, edge(k + 1), half]);
    if (!(open && gate === 2)) walls.push([-half, edge(k), -half, edge(k + 1)]);
    if (!(open && gate === 3)) walls.push([half, edge(k), half, edge(k + 1)]);
  }
  const gateAt = [[0, -half], [0, half], [-half, 0], [half, 0]][gate];

  const c = Math.cos(yaw), s = Math.sin(yaw);
  const local = (x, z) => [(x - at.x) * c + (z - at.z) * s, -(x - at.x) * s + (z - at.z) * c];
  return {
    x: at.x, z: at.z, yaw, half, walls, toLand: (u, v) => toLand(at.x, at.z, u, v), gate: toLand(at.x, at.z, ...gateAt),
    // Inside the maze's square, give or take `pad`.
    inside(x, z, pad = 0) {
      const [u, v] = local(x, z);
      return Math.abs(u) < half + pad && Math.abs(v) < half + pad;
    },
  };
}

export function buildMaze(maze, shape, biome, r) {
  const hedge = new THREE.Color(biome.flora.colors[0]).offsetHSL(0, 0, -0.04);
  const clipped = hedge.clone().offsetHSL(0.01, 0.05, 0.08);
  const pieces = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [u0, v0, u1, v1] of maze.walls) {
    const [x0, z0] = maze.toLand(u0, v0), [x1, z1] = maze.toLand(u1, v1);
    const len = Math.hypot(x1 - x0, z1 - z0) + WALL.thick;
    const g0 = Math.min(shape.heightAt(x0, z0), shape.heightAt(x1, z1), shape.heightAt((x0 + x1) / 2, (z0 + z1) / 2));
    const g1 = Math.max(shape.heightAt(x0, z0), shape.heightAt(x1, z1));
    const height = WALL.height + (g1 - g0) + r.range(-0.03, 0.04);
    const geo = new THREE.BoxGeometry(len, height, WALL.thick, Math.max(1, Math.round(len / 0.3)), 2, 1).translate(0, height / 2, 0).toNonIndexed();
    // Darker at the roots, freshly clipped on top.
    const pos = geo.attributes.position, colors = [], tone = r.range(-0.03, 0.03), col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      col.copy(hedge).lerp(clipped, Math.max(0, pos.getY(i) / height) ** 2).offsetHSL(0, 0, tone);
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    q.setFromAxisAngle(up, -Math.atan2(z1 - z0, x1 - x0));
    geo.applyMatrix4(m.compose(new THREE.Vector3((x0 + x1) / 2, g0 - 0.06, (z0 + z1) / 2), q, new THREE.Vector3(1, 1, 1)));
    pieces.push(geo);
  }
  const hedges = new THREE.Mesh(mergeGeometries(pieces), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  hedges.castShadow = hedges.receiveShadow = true;

  // A stone fountain at the heart of it, and a clipped ball either side of the way in.
  const group = new THREE.Group();
  group.add(hedges);
  const stone = new THREE.MeshStandardMaterial({ color: '#cfc8bb', flatShading: true, roughness: 0.9 });
  const gy = shape.heightAt(maze.x, maze.z);
  const fountain = new THREE.Mesh(mergeGeometries([
    new THREE.CylinderGeometry(0.3, 0.34, 0.2, 12).translate(0, 0.1, 0),
    new THREE.CylinderGeometry(0.05, 0.07, 0.42, 8).translate(0, 0.3, 0),
    new THREE.CylinderGeometry(0.14, 0.05, 0.06, 10).translate(0, 0.52, 0),
  ]), stone);
  fountain.position.set(maze.x, gy - 0.02, maze.z);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 12), new THREE.MeshStandardMaterial({ color: '#5aa8d8', roughness: 0.2, metalness: 0.1 }));
  pool.position.set(maze.x, gy + 0.17, maze.z);
  fountain.castShadow = true;
  group.add(fountain, pool);
  const [gx, gz] = maze.gate;
  const [ux, uz] = [Math.cos(maze.yaw), Math.sin(maze.yaw)];
  const along = Math.abs((gx - maze.x) * ux + (gz - maze.z) * uz) > 0.1 ? [-uz, ux] : [ux, uz];
  for (const side of [-1, 1]) {
    const x = gx + along[0] * side * (CELL / 2 + 0.12), z = gz + along[1] * side * (CELL / 2 + 0.12);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshStandardMaterial({ color: clipped, flatShading: true, roughness: 0.9 }));
    ball.position.set(x, shape.heightAt(x, z) + WALL.height + 0.14, z);
    ball.castShadow = true;
    group.add(ball);
  }
  return { object: group, hedges, fountain, pool };
}

// --- Rows of tea and lavender -----------------------------------------------------

// Rows along the level lines of `field`: a bush wherever a grid edge crosses a
// whole number (after each offset), so along a row they stand about a grid
// step apart. `keep` says where a bush may grow.
export function planRows(shape, field, offsets, keep, step = 0.2) {
  const span = 13, n = Math.ceil((span * 2) / step) + 1;
  const xs = (i) => -span + i * step;
  const value = new Float32Array(n * n).fill(NaN);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = xs(i), z = xs(j);
      if (shape.radial(x, z) < 0.95) value[i * n + j] = field(x, z);
    }
  }
  const points = [];
  const cross = (x0, z0, a, x1, z1, b) => {
    if (Number.isNaN(a) || Number.isNaN(b)) return;
    for (const o of offsets) {
      const A = a - o, B = b - o;
      if (Math.floor(A) === Math.floor(B)) continue;
      const t = (Math.max(Math.floor(A), Math.floor(B)) - A) / (B - A);
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      if (keep(x, z)) points.push({ x, z });
    }
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = value[i * n + j];
      if (i + 1 < n) cross(xs(i), xs(j), a, xs(i + 1), xs(j), value[(i + 1) * n + j]);
      if (j + 1 < n) cross(xs(i), xs(j), a, xs(i), xs(j + 1), value[i * n + j + 1]);
    }
  }
  // Two edges of one grid square can land almost on top of each other.
  const kept = [], cells = new Map(), near = step * 0.6;
  for (const p of points) {
    const key = `${Math.round(p.x / near)},${Math.round(p.z / near)}`;
    if (cells.has(key)) continue;
    cells.set(key, true);
    kept.push(p);
  }
  return kept;
}

// One instanced bush per point: round clipped tea, or a spiky tuft of lavender.
export function buildRows(points, shape, { kind, colors, size }, r) {
  if (!points.length) return null;
  const geo = kind === 'lavender'
    ? mergeGeometries([new THREE.ConeGeometry(0.75, 1.6, 6).translate(0, 0.6, 0), new THREE.IcosahedronGeometry(0.7, 0).scale(1, 0.6, 1).translate(0, 0.25, 0)].map((g) => (g.index ? g.toNonIndexed() : g)))
    : new THREE.IcosahedronGeometry(1, 1).scale(1, 0.62, 1).translate(0, 0.3, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  points.forEach(({ x, z }, i) => {
    const s = size * r.range(0.85, 1.15);
    m.compose(new THREE.Vector3(x, shape.heightAt(x, z) - 0.03, z), q.setFromAxisAngle(up, r.range(0, TAU)), new THREE.Vector3(s, s * r.range(0.9, 1.1), s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(r.pick(colors)).offsetHSL(0, 0, r.range(-0.04, 0.04)));
  });
  mesh.material.userData.wind = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
