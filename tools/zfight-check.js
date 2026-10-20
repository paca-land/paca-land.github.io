// Z-fighting finder. Two faces of different colours lying (nearly) in the same plane
// and overlapping flicker as the camera moves: the depth buffer can't tell which is in
// front. At the default camera (near 0.1, about 30 away) anything closer than a few
// thousandths of a unit is at risk, so this reports faces within `tol` (0.006) of each
// other, facing the same way, overlapping, and drawn in different colours.
// In the console, on an origin of your own:
//   const { zfightSweep } = await import('/tools/zfight-check.js?' + Date.now()); await zfightSweep()
// (on index.html, so it loads this version's modules; it takes about two minutes).
// zfight(object) checks one object (world space; an instanced mesh's own geometry once).
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3();
const hex = (c) => `#${c.getHexString()}`;

function triangles(root, skip) {
  const tris = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || skip(o)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.depthWrite === false || (mat.transparent && mat.opacity < 0.99) || mat.visible === false) return;
    const pos = o.geometry.attributes.position, col = mat.vertexColors ? o.geometry.attributes.color : null, idx = o.geometry.index;
    const count = idx ? idx.count : pos.count;
    if (count > 900000) return;
    const m = o.isInstancedMesh ? null : o.matrixWorld;
    const base = mat.color ?? new THREE.Color(1, 1, 1);
    const key = `${mat.uuid}`;
    for (let i = 0; i + 2 < count; i += 3) {
      const [ia, ib, ic] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
      _a.fromBufferAttribute(pos, ia); _b.fromBufferAttribute(pos, ib); _c.fromBufferAttribute(pos, ic);
      if (m) { _a.applyMatrix4(m); _b.applyMatrix4(m); _c.applyMatrix4(m); }
      _n.crossVectors(_e1.subVectors(_b, _a), _e2.subVectors(_c, _a));
      const area = _n.length() / 2;
      if (area < 2e-5) continue;
      _n.normalize();
      // Faces looking down are undersides sitting on the ground (or on each other): out of sight.
      if (_n.y < -0.7) continue;
      const color = base.clone();
      if (col) color.multiply(new THREE.Color().fromBufferAttribute(col, ia));
      tris.push({ n: _n.clone(), d: _n.dot(_a), p: [_a.clone(), _b.clone(), _c.clone()], color, key, mesh: o, local: !m });
    }
  });
  return tris;
}

// Do two coplanar-ish triangles overlap (by more than a sliver), seen along their normal?
function overlap(t, u) {
  const n = t.n, ax = Math.abs(n.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const e1 = new THREE.Vector3().crossVectors(n, ax).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1);
  const flat = (tri) => tri.p.map((p) => [p.dot(e1), p.dot(e2)]);
  const A = flat(t), B = flat(u);
  for (const poly of [A, B]) {
    for (let i = 0; i < 3; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % 3];
      const ax2 = [y0 - y1, x1 - x0];
      const len = Math.hypot(...ax2) || 1;
      const proj = (P) => P.map(([x, y]) => (x * ax2[0] + y * ax2[1]) / len);
      const pa = proj(A), pb = proj(B);
      const gap = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
      if (gap < 2e-3) return false;
    }
  }
  return true;
}

export function zfight(root, { tol = 0.006, skip = () => false } = {}) {
  const tris = triangles(root, skip);
  const buckets = new Map();
  const nkey = (n) => `${Math.round(n.x * 25)},${Math.round(n.y * 25)},${Math.round(n.z * 25)}`;
  for (const t of tris) {
    const k = `${nkey(t.n)}|${Math.floor(t.d / tol)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(t);
  }
  const found = new Map();
  for (const [k, list] of buckets) {
    const [nk, dk] = k.split('|');
    const next = buckets.get(`${nk}|${Number(dk) + 1}`) ?? [];
    for (const [pool, other] of [[list, list], [list, next]]) {
      if (pool.length * other.length > 4e6) continue;
      for (let i = 0; i < pool.length; i++) {
        const t = pool[i];
        for (let j = pool === other ? i + 1 : 0; j < other.length; j++) {
          const u = other[j];
          if (Math.abs(t.d - u.d) > tol || t.n.dot(u.n) < 0.995) continue;
          // An instanced mesh is read in its own space: only compare it with itself.
          if ((t.local || u.local) && t.mesh !== u.mesh) continue;
          const sameLook = t.key === u.key && Math.abs(t.color.r - u.color.r) + Math.abs(t.color.g - u.color.g) + Math.abs(t.color.b - u.color.b) < 0.06;
          if (sameLook) continue;
          if (!overlap(t, u)) continue;
          // The real gap: each one's middle from the other's plane (the planes may tilt a little).
          const mid = (x) => x.p[0].clone().add(x.p[1]).add(x.p[2]).divideScalar(3);
          const gap = Math.min(Math.abs(t.n.dot(mid(u)) - t.d), Math.abs(u.n.dot(mid(t)) - u.d));
          if (gap > tol) continue;
          const at = t.p[0];
          const facing = Math.abs(t.n.y) > 0.7 ? 'up' : 'side';
          const label = [hex(t.color), hex(u.color)].sort().join(' vs ') + ` · ${facing} · gap ${gap.toFixed(4)}`;
          const where = `(${at.x.toFixed(2)}, ${at.y.toFixed(2)}, ${at.z.toFixed(2)})`;
          if (!found.has(label)) found.set(label, { label, where, n: 0, meshes: [t.mesh, u.mesh] });
          found.get(label).n++;
        }
      }
    }
  }
  return [...found.values()];
}

// Every animal, every island, and every building on an island that has it.
export async function zfightSweep({ tol = 0.006 } = {}) {
  const t0 = performance.now();
  // Through the page's import map when there is one (index.html), so the modules are this version's.
  const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent ?? '{}').imports ?? {};
  const mod = (n) => import(map[`./js/${n}`] ? new URL(map[`./js/${n}`], document.baseURI).href : `/js/${n}?zf=${Date.now()}`);
  const W = await mod('world.js');
  const Life = await mod('life.js');
  const out = { animals: {}, lands: {} };
  for (const kind of Life.CRITTER_KINDS) {
    const hits = zfight(Life.critterModel(kind), { tol });
    if (hits.length) out.animals[kind] = hits;
  }
  // Grass is a cloud of blades and the island's underside is out of sight: leave them out.
  const skip = (o) => o.userData?.grass || o.material?.userData?.grass;
  const check = (label, seed, want) => {
    const land = W.generateLand(seed, want);
    const hits = zfight(land.group, { tol, skip });
    if (hits.length) out.lands[label] = { landmark: land.landmark, hits };
  };
  for (const biome of Object.keys(W.BIOMES)) check(biome, `zf-${biome}`, { biome, lake: true });
  for (const [biome, b] of Object.entries(W.BIOMES)) {
    for (const [id] of b.landmark) {
      check(`${id} on ${biome}`, `zf-${id}`, { biome, landmark: id });
      await new Promise((r) => setTimeout(r)); // let the page breathe
    }
  }
  check('town', 'harbour', { biome: 'meadow', landmark: 'town', lake: true });
  check('edge', 'sorry', { biome: 'dream', landmark: 'edge', lake: true, river: true });
  out.ms = Math.round(performance.now() - t0);
  return out;
}
