import * as THREE from 'three';

// Icefall isle, dressed: towers of blue ice crowd the high ground and shed chunks
// that tumble down and shatter, and huge icicles hang under the island's rim,
// now and then snapping off and falling away into the clouds.

const TAU = Math.PI * 2;

function plan({ shape, spots, taken, r }) {
  // The towers cluster on the highest dry ground.
  const high = spots.filter((v) => !shape.isWet(v.x, v.z, 0.8) && !taken(v.x, v.z) && shape.radial(v.x, v.z) < 0.85).sort((a, b) => b.y - a.y);
  const towers = [];
  for (const v of high) {
    if (towers.length >= r.int(6, 9)) break;
    if (towers.some((t) => Math.hypot(t.x - v.x, t.z - v.z) < 0.9)) continue;
    if (towers.length && Math.hypot(towers[0].x - v.x, towers[0].z - v.z) > 3.2) continue;
    towers.push({ x: v.x, y: v.y, z: v.z, h: r.range(1.4, 3.4), w: r.range(0.35, 0.6), lean: r.range(-0.12, 0.12), turn: r.range(0, TAU) });
  }
  return { towers, blocked: (x, z) => towers.some((t) => Math.hypot(x - t.x, z - t.z) < t.w + 0.3) };
}

function build({ plan, top, shape, r, bursts, hooks, lib }) {
  const group = new THREE.Group();
  const ice = new THREE.MeshStandardMaterial({ color: '#cfeaf8', emissive: '#3a7aa8', emissiveIntensity: 0.25, flatShading: true, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.9 });
  // Jagged ice towers: a leaning prism with a broken top, and a smaller one beside it.
  const blocks = [];
  for (const t of plan.towers) {
    blocks.push(new THREE.CylinderGeometry(t.w * 0.6, t.w, t.h, 5).translate(0, t.h / 2, 0).rotateZ(t.lean).rotateY(t.turn).translate(t.x, t.y - 0.2, t.z));
    blocks.push(new THREE.ConeGeometry(t.w * 0.62, t.w * 1.2, 5).rotateZ(0.3).translate(0, t.h + t.w * 0.4, 0).rotateZ(t.lean).rotateY(t.turn).translate(t.x, t.y - 0.2, t.z));
    blocks.push(new THREE.CylinderGeometry(t.w * 0.3, t.w * 0.5, t.h * 0.5, 5).translate(t.w * 0.7, t.h * 0.25, 0).rotateY(t.turn + 1).translate(t.x, t.y - 0.2, t.z));
  }
  if (blocks.length) {
    const mesh = new THREE.Mesh(lib.flat(...blocks), ice);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Icicles under the rim, pointing down into the sky.
  const rim = top.rings[top.rings.length - 1];
  const icicles = [];
  for (let i = 0; i < rim.length; i += Math.max(1, Math.floor(rim.length / 44))) {
    const v = rim[i];
    icicles.push({ x: v.x * 0.99, y: v.y - 0.25, z: v.z * 0.99, len: r.range(0.5, 2.2), grow: 1, next: r.range(4, 40) });
  }
  const cone = new THREE.ConeGeometry(0.12, 1, 5).rotateX(Math.PI).translate(0, -0.5, 0);
  const hang = new THREE.InstancedMesh(cone, ice, icicles.length);
  hang.frustumCulled = false;
  group.add(hang);
  // Chunks that break off the towers, and icicles on their way down, each from a small pool.
  const pool = (n) => Array.from({ length: n }, () => ({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), spin: 0, floor: 0, size: 1 }));
  const chunks = pool(6), drops = pool(4);
  const rock = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), ice, chunks.length);
  const falling = new THREE.InstancedMesh(cone, ice, drops.length);
  for (const mesh of [rock, falling]) {
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  let nextChunk = 2;
  const spare = (list) => list.find((c) => !c.live);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  return {
    object: group,
    mirrorHide: [hang, rock, falling],
    update(time, dt) {
      // Now and then a tower sheds a chunk.
      if (time > nextChunk && plan.towers.length) {
        nextChunk = time + 2.5 + Math.random() * 4;
        const t = plan.towers[Math.floor(Math.random() * plan.towers.length)], c = spare(chunks);
        if (c) {
          Object.assign(c, { live: true, size: 0.7 + Math.random() * 0.8, spin: 0, floor: t.y - 0.1 });
          c.p.set(t.x + Math.sin(t.lean) * t.h * 0.5, t.y + t.h * 0.85, t.z);
          c.v.set((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2);
        }
      }
      // Icicles grow back slowly, and every so often one lets go.
      icicles.forEach((ic, i) => {
        if (time > ic.next && ic.grow >= 1) {
          ic.next = time + 15 + Math.random() * 40;
          ic.grow = 0;
          const c = spare(drops);
          if (c) {
            Object.assign(c, { live: true, size: ic.len, spin: 0 });
            c.p.set(ic.x, ic.y, ic.z);
            c.v.set(0, 0, 0);
          }
        }
        ic.grow = Math.min(1, ic.grow + dt / 12);
        m.compose(p.set(ic.x, ic.y, ic.z), q.identity(), s.set(1, ic.len * ic.grow, 1));
        hang.setMatrixAt(i, m);
      });
      hang.instanceMatrix.needsUpdate = true;
      // A chunk shatters where it lands.
      chunks.forEach((c, i) => {
        if (c.live) {
          c.v.y -= 9 * dt;
          c.p.addScaledVector(c.v, dt);
          c.spin += dt * 4;
          if (c.p.y < Math.max(c.floor, shape.heightAt(c.p.x, c.p.z) + 0.1)) {
            c.live = false;
            hooks.sound('chips');
            bursts.spawn(c.p.clone(), { count: 16, colors: ['#e8f6ff', '#cfeaf8', '#ffffff'], glow: true, speed: 1, up: 1.2, gravity: -6, life: 1, drag: 0.6 });
          }
        }
        if (c.live) m.compose(c.p, q.setFromEuler(e.set(c.spin, c.spin * 0.7, 0)), s.setScalar(c.size));
        else m.makeScale(0, 0, 0);
        rock.setMatrixAt(i, m);
      });
      // An icicle just falls, tumbling a little, until it's lost in the clouds.
      drops.forEach((c, i) => {
        if (c.live) {
          c.v.y -= 9 * dt;
          c.p.addScaledVector(c.v, dt);
          c.spin += dt;
          if (c.p.y < -30) c.live = false;
        }
        if (c.live) m.compose(c.p, q.setFromEuler(e.set(0, 0, c.spin * 0.3)), s.set(1, c.size, 1));
        else m.makeScale(0, 0, 0);
        falling.setMatrixAt(i, m);
      });
      rock.instanceMatrix.needsUpdate = true;
      falling.instanceMatrix.needsUpdate = true;
    },
  };
}

export default { id: 'icefall', dress: { plan, build } };
