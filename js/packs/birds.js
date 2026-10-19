import * as THREE from 'three';

// Bird island, dressed: flocks of gulls wheeling round the whole island, and
// puffins and gulls lined up along the cliff tops. Tap a perched bird and it
// takes off with its neighbours, then comes back to land.

const TAU = Math.PI * 2;

// A seabird with its wings out (span along x), facing +z.
function flyer() {
  const geo = [
    new THREE.IcosahedronGeometry(0.07, 0).scale(0.8, 0.7, 1.8),
    new THREE.BoxGeometry(0.42, 0.012, 0.09).translate(0, 0.02, -0.01),
    new THREE.ConeGeometry(0.02, 0.06, 3).rotateX(Math.PI / 2).translate(0, 0, 0.14),
  ].map((g) => g.toNonIndexed());
  return merge(geo);
}

// Sitting upright: a round body, a head and a beak.
function sitter() {
  return merge([
    new THREE.IcosahedronGeometry(0.075, 0).scale(1, 1.25, 1).translate(0, 0.09, 0),
    new THREE.IcosahedronGeometry(0.05, 0).translate(0, 0.2, 0.02),
    new THREE.ConeGeometry(0.018, 0.05, 3).rotateX(Math.PI / 2).translate(0, 0.19, 0.08),
  ].map((g) => g.toNonIndexed()));
}

function merge(parts) {
  const pos = new Float32Array(parts.reduce((n, g) => n + g.attributes.position.array.length, 0));
  let at = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, at);
    at += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

function plan({ shape, spots, taken, r }) {
  const perched = [];
  for (const v of spots) {
    if (perched.length >= 56) break;
    const rn = shape.radial(v.x, v.z);
    if (rn < 0.72 || rn > 0.97 || shape.isWet(v.x, v.z, 0.3) || taken(v.x, v.z)) continue;
    if (perched.some((p) => Math.hypot(p.x - v.x, p.z - v.z) < 0.36)) continue;
    perched.push({ x: v.x, y: v.y, z: v.z, puffin: r.chance(0.45), turn: Math.atan2(v.x, v.z) + r.range(-0.6, 0.6), up: -99, size: r.range(1.4, 1.8) });
  }
  return { perched, blocked: (x, z) => perched.some((p) => Math.hypot(x - p.x, z - p.z) < 0.25) };
}

function build({ plan, top, r, hooks, bursts, clock }) {
  const group = new THREE.Group();
  const rim = top.rings[top.rings.length - 1];
  const reach = Math.max(...rim.map((v) => Math.hypot(v.x, v.z)));
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.8 });
  // Three flocks, each wheeling round its own loop at its own height.
  const flocks = Array.from({ length: 4 }, (_, f) => ({
    radius: reach * r.range(0.45, 1.2), height: f === 0 ? r.range(1.6, 2.6) : r.range(2.5, 7), speed: r.range(0.12, 0.22) * (f % 2 ? -1 : 1), tilt: r.range(-0.25, 0.25), phase: r.range(0, TAU),
  }));
  const fliers = [];
  flocks.forEach((flock, f) => {
    for (let i = 0; i < 24; i++) fliers.push({ flock, lag: i * 0.07 + r.range(0, 0.04), out: r.range(-0.8, 0.8), lift: r.range(-0.6, 0.6), flap: r.range(0, TAU) });
  });
  const air = new THREE.InstancedMesh(flyer(), mat, fliers.length);
  air.frustumCulled = false;
  const col = new THREE.Color();
  fliers.forEach((b, i) => air.setColorAt(i, col.set(r.pick(['#ffffff', '#f4f4f0', '#d8dce0']))));
  group.add(air);

  const { perched } = plan;
  const ground = perched.length ? new THREE.InstancedMesh(sitter(), mat.clone(), perched.length) : null;
  if (ground) {
    perched.forEach((p, i) => ground.setColorAt(i, col.set(p.puffin ? '#2a2a30' : r.pick(['#ffffff', '#e8eaec']))));
    ground.castShadow = true;
    group.add(ground);
    ground.userData.onClick = (hit) => {
      const p = perched[hit.instanceId];
      if (!p) return;
      const now = clock();
      // Off it goes, and the birds round it with it.
      for (const q of perched) if (Math.hypot(q.x - p.x, q.z - p.z) < 1.4 && now - q.up > 4) q.up = now + Math.random() * 0.3;
      hooks.sound('whoosh');
      bursts.spawn(new THREE.Vector3(p.x, p.y + 0.2, p.z), { count: 12, colors: ['#ffffff', '#d8dce0'], speed: 0.8, up: 1.2, gravity: -0.8, life: 1.6, drag: 1.5 });
    };
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    object: group,
    clickables: ground ? [ground] : [],
    mirrorHide: [group],
    update(time) {
      fliers.forEach((b, i) => {
        const f = b.flock, a = f.phase + (time - b.lag * 10) * f.speed;
        const rad = f.radius + b.out;
        p3.set(Math.cos(a) * rad, f.height + b.lift + Math.sin(a * 2 + f.tilt * 5) * 0.6, Math.sin(a) * rad);
        // Facing along the loop, banked into the turn, wings beating.
        const heading = Math.atan2(-Math.sin(a) * Math.sign(f.speed), Math.cos(a) * Math.sign(f.speed));
        e.set(0, heading, f.speed > 0 ? -0.35 : 0.35);
        const beat = Math.sin(time * 9 + b.flap);
        m.compose(p3, q.setFromEuler(e), s.set((0.6 + Math.abs(beat) * 0.55) * 1.7, (1 + beat * 0.3) * 1.7, 1.7));
        air.setMatrixAt(i, m);
      });
      air.instanceMatrix.needsUpdate = true;
      if (!ground) return;
      perched.forEach((p, i) => {
        // A little hop and a flutter now and then; a loop round and back after a tap.
        const away = time - p.up;
        let x = p.x, y = p.y - 0.02, z = p.z, turn = p.turn;
        if (away > 0 && away < 3.2) {
          const k = away / 3.2, h = Math.sin(k * Math.PI);
          x += Math.cos(p.turn + k * TAU) * h * 1.2;
          z += Math.sin(p.turn + k * TAU) * h * 1.2;
          y += h * 1.6;
          turn += k * TAU;
        } else if (Math.sin(time * 0.7 + i * 1.9) > 0.97) y += 0.03;
        m.compose(p3.set(x, y, z), q.setFromEuler(e.set(0, turn, 0)), s.setScalar(p.size));
        ground.setMatrixAt(i, m);
      });
      ground.instanceMatrix.needsUpdate = true;
    },
  };
}

export default { id: 'birds', dress: { plan, build } };
