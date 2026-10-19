import * as THREE from 'three';

// The orchard isle, dressed: apple trees planted in long straight rows, heavy
// with red and yellow fruit, with windfalls in the grass, ladders against the
// trunks and crates of apples at the row ends. Tap a tree and apples fall.

const TAU = Math.PI * 2;
const STEP = 1.35; // between trees, along and across the rows

function plan({ shape, taken, r }) {
  const yaw = r.range(0, TAU), c = Math.cos(yaw), s = Math.sin(yaw);
  const trees = [];
  for (let i = -8; i <= 8; i++) {
    for (let j = -8; j <= 8; j++) {
      const u = i * STEP, v = j * STEP + (i % 2) * 0.1;
      const x = u * c - v * s, z = u * s + v * c;
      if (shape.radial(x, z) > 0.84 || shape.isWet(x, z, 0.6) || shape.slopeAt(x, z) > 0.55 || taken(x, z)) continue;
      trees.push({ x, z, row: i, size: r.range(0.85, 1.1), turn: r.range(0, TAU) });
    }
  }
  return { trees: trees.slice(0, 64), yaw, blocked: (x, z) => trees.some((t) => Math.hypot(x - t.x, z - t.z) < 0.55) };
}

function build({ plan, shape, r, hooks, bursts, local, lib }) {
  const { trees } = plan;
  if (!trees.length) return null;
  const group = new THREE.Group();
  const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
  const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6).translate(0, 0.35, 0);
  const crownGeo = lib.flat(
    new THREE.IcosahedronGeometry(0.5, 1).scale(1, 0.75, 1).translate(0, 0.98, 0),
    new THREE.IcosahedronGeometry(0.32, 0).translate(0.25, 1.15, 0.1),
  );
  const trunks = new THREE.InstancedMesh(trunkGeo, mat('#6b4a2f'), trees.length);
  const crowns = new THREE.InstancedMesh(crownGeo, mat('#ffffff'), trees.length);
  crowns.material.userData.wind = true;
  // Apples on every crown, and windfalls underneath.
  const appleGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const apples = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  trees.forEach((t, i) => {
    const y = shape.heightAt(t.x, t.z) - 0.04;
    m.compose(p.set(t.x, y, t.z), q.setFromAxisAngle(up, t.turn), s.setScalar(t.size));
    trunks.setMatrixAt(i, m);
    crowns.setMatrixAt(i, m);
    crowns.setColorAt(i, col.set(r.pick(['#4a9a3a', '#5aaa45', '#3f8a34'])).offsetHSL(0, 0, r.range(-0.03, 0.03)));
    const red = r.chance(0.7);
    for (let k = 0; k < 9; k++) {
      // On the surface of the crown, mostly round the sides where you'd see them.
      const a = r.range(0, TAU), h = r.range(-0.25, 0.3);
      const rad = 0.5 * Math.sqrt(1 - (h / 0.5) ** 2) * 0.98;
      apples.push({ x: t.x + Math.cos(a) * rad * t.size, y: y + (0.98 + h * 0.75) * t.size, z: t.z + Math.sin(a) * rad * t.size, red });
    }
    for (let k = r.int(0, 3); k > 0; k--) {
      const a = r.range(0, TAU), d = r.range(0.3, 0.7), ax = t.x + Math.cos(a) * d, az = t.z + Math.sin(a) * d;
      apples.push({ x: ax, y: shape.heightAt(ax, az) + 0.04, z: az, red });
    }
  });
  const fruit = new THREE.InstancedMesh(appleGeo, mat('#ffffff', { roughness: 0.5 }), apples.length);
  apples.forEach((a, i) => {
    m.compose(p.set(a.x, a.y, a.z), q.identity(), s.setScalar(1));
    fruit.setMatrixAt(i, m);
    fruit.setColorAt(i, col.set(a.red ? r.pick(['#d8302a', '#c8282a', '#e8402a']) : r.pick(['#e8c83a', '#d8d040'])));
  });
  for (const mesh of [trunks, crowns, fruit]) {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Ladders against a few trees, and crates of apples at the ends of the rows.
  const wood = [], crates = [], heaps = [];
  for (const t of r.shuffle([...trees]).slice(0, 4)) {
    const y = shape.heightAt(t.x, t.z), a = r.range(0, TAU), dx = Math.cos(a), dz = Math.sin(a);
    const foot = new THREE.Vector3(t.x + dx * 0.55, y, t.z + dz * 0.55);
    for (const side of [-1, 1]) {
      wood.push(new THREE.BoxGeometry(0.025, 1.15, 0.025).translate(side * 0.1, 0.55, 0).rotateX(-0.35).rotateY(Math.atan2(-dx, -dz)).translate(foot.x, foot.y, foot.z));
    }
    for (let k = 1; k < 5; k++) wood.push(new THREE.BoxGeometry(0.2, 0.02, 0.02).translate(0, k * 0.22, 0).rotateX(-0.35).rotateY(Math.atan2(-dx, -dz)).translate(foot.x, foot.y, foot.z));
  }
  const ends = new Map();
  for (const t of trees) if (!ends.has(t.row) || r.chance(0.15)) ends.set(t.row, t);
  for (const t of [...ends.values()].slice(0, 4)) {
    const a = plan.yaw + Math.PI / 2, x = t.x + Math.cos(a) * 0.7, z = t.z + Math.sin(a) * 0.7, y = shape.heightAt(x, z);
    crates.push(new THREE.BoxGeometry(0.34, 0.2, 0.26).translate(x, y + 0.1, z));
    for (let k = 0; k < 6; k++) heaps.push(new THREE.IcosahedronGeometry(0.055, 0).translate(x + ((k % 3) - 1) * 0.09, y + 0.22, z + (k < 3 ? -0.05 : 0.05)));
  }
  for (const [geos, material] of [[wood, mat('#a0714a')], [crates, mat('#b88a58')], [heaps, mat('#d8302a', { roughness: 0.5 })]]) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(lib.flat(...geos), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  // A tap shakes some apples down (they count as a tree on a voyage).
  const onClick = (hit) => {
    hooks.sound('rustle');
    hooks.note('tree');
    bursts.spawn(local(hit), { count: 10, colors: ['#d8302a', '#e8c83a', '#4a9a3a'], speed: 0.6, up: 0.4, gravity: -6, life: 1.2, drag: 0.8 });
  };
  for (const mesh of [trunks, crowns, fruit]) mesh.userData.onClick = onClick;
  return { object: group, clickables: [crowns, trunks, fruit], mirrorHide: [fruit] };
}

export default { id: 'orchard', dress: { plan, build } };
