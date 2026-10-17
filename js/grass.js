import * as THREE from 'three';

const TAU = Math.PI * 2;

// How grassy each kind of land is, and what its blades look like.
const STYLES = {
  meadow: { density: 1 },
  highlands: { density: 0.85 },
  autumn: { density: 0.8, tip: '#c9b25a' },
  // Bare sand and rock: the cacti and dry shrubs are the only green on a mesa.
  desert: { density: 0 },
  snowfield: { density: 0 },
  blossom: { density: 1 },
  dream: { density: 0.9 },
  mire: { density: 0.9, tip: '#a8a860' },
  coral: { density: 0 },
  toadstool: { density: 0.85 },
  stormcrag: { density: 0.6 },
  glass: { density: 0.5, tip: '#ffffff' },
  ember: { density: 0 },
  gilded: { density: 0.8, tip: '#fff0a0' },
  jungle: { density: 1, tip: '#6fbf4a' },
  savanna: { density: 0.9, tip: '#f0d890' },
  heath: { density: 0.8, tip: '#a080a0' },
  // Purple-tipped blades read as rows of lavender.
  lavender: { density: 1, tip: '#9a7ad8' },
  cloudisle: { density: 0.6, tip: '#ffffff' },
  withered: { density: 0.5, tip: '#8a8070' },
  sugar: { density: 0.7, tip: '#ffffff' },
};
const MAX_BLADES = 16000;

// A tapered blade in three segments, so the wind can curve it. y runs 0..1,
// and every normal points up, so blades are lit like the ground they grow from.
function bladeGeometry() {
  const W = 0.045;
  const pos = [-W / 2, 0, 0, W / 2, 0, 0, -W * 0.33, 0.4, 0, W * 0.33, 0.4, 0, -W * 0.15, 0.75, 0, W * 0.15, 0.75, 0, 0, 1, 0];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(21).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  // Darker at the root, as if shaded by the blades around it.
  geo.setAttribute('color', new THREE.Float32BufferAttribute([0, 0, 0.4, 0.4, 0.75, 0.75, 1].flatMap((y) => {
    const k = 0.45 + 0.55 * y;
    return [k, k, k];
  }), 3));
  geo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
  return geo;
}

export function buildGrass({ top, shape, biome, biomeKey, blocked, r, waterLevel }) {
  const style = STYLES[biomeKey] ?? STYLES.meadow;
  const total = Math.round(MAX_BLADES * style.density);
  if (!total) return null;

  // Grassy triangles, weighted by area, so blades spread evenly over them.
  const tris = [], cumulative = [];
  let area = 0;
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  for (const tri of top.tris) {
    const [a, b, c] = tri;
    ab.set(b.x - a.x, b.y - a.y, b.z - a.z);
    ac.set(c.x - a.x, c.y - a.y, c.z - a.z);
    n.crossVectors(ab, ac);
    const triArea = n.length() / 2;
    n.normalize();
    const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3, cy = (a.y + b.y + c.y) / 3;
    if (n.y < 0.82 || cy < waterLevel + 0.08 || shape.isWet(cx, cz, 0.2) || shape.radial(cx, cz) > 0.96) continue;
    if (biome.snowLine && cy > biome.snowLine - 0.2) continue;
    tris.push(tri);
    area += triArea;
    cumulative.push(area);
  }
  if (!tris.length) return null;

  const tip = new THREE.Color(style.tip ?? biome.grass[1]);
  const base = new THREE.Color(style.base ?? biome.grass[0]);
  const mesh = new THREE.InstancedMesh(bladeGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }), total);
  mesh.material.userData.grass = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  let placed = 0;
  for (let attempt = 0; attempt < total * 2 && placed < total; attempt++) {
    const pick = r() * area;
    let lo = 0, hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < pick) lo = mid + 1;
      else hi = mid;
    }
    const [a, b, c] = tris[lo];
    let u = r(), v = r();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    p.set(a.x + (b.x - a.x) * u + (c.x - a.x) * v, a.y + (b.y - a.y) * u + (c.y - a.y) * v, a.z + (b.z - a.z) * u + (c.z - a.z) * v);
    if (blocked(p.x, p.z)) continue;
    q.setFromAxisAngle(up, r() * TAU);
    s.set(1, r.range(0.16, 0.36), 1);
    mesh.setMatrixAt(placed, m.compose(p, q, s));
    mesh.setColorAt(placed, color.lerpColors(base, tip, r.range(0.55, 1)).offsetHSL(0, 0, (r() - 0.5) * 0.06));
    placed++;
  }
  mesh.count = placed;

  return {
    object: mesh,
    // Fewer blades on slower devices: 0 (none) to 3 (all).
    setDetail(level) {
      mesh.count = Math.round(placed * [0, 0.35, 0.7, 1][level]);
      mesh.visible = mesh.count > 0;
    },
  };
}
