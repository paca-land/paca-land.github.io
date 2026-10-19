import * as THREE from 'three';

// Whale-back isle, dressed: the bleached skeleton of an old sky-whale lies
// across the island, ribs arching higher than your head, and somewhere a
// blowhole sends up a spout every so often (the island is breathing).

const TAU = Math.PI * 2;
const LENGTH = 6.2; // the skeleton, nose to tail, at its usual size (it grows to fit, up to 1.35 times)

function plan({ shape, spots, taken, r }) {
  // Room for the whole skeleton along a line, on dry, gentle ground.
  const clear = (x, z) => !taken(x, z) && !shape.isWet(x, z, 0.5) && shape.radial(x, z) < 0.88 && shape.slopeAt(x, z) < 0.6;
  // The biggest whale that fits: a long open stretch of ground near the middle.
  let bones = null;
  for (const scale of [1.35, 1.15, 0.9]) {
    const len = LENGTH * scale, half = 1.1 * scale;
    for (const v of spots) {
      if (shape.radial(v.x, v.z) > 0.45) continue;
      for (let k = 0; k < 6 && !bones; k++) {
        const yaw = r.range(0, TAU), dx = Math.sin(yaw), dz = Math.cos(yaw);
        let ok = true;
        for (let s = -len / 2; s <= len / 2 && ok; s += 0.5) {
          for (const w of [-half, 0, half]) ok = ok && clear(v.x + dx * s + dz * w, v.z + dz * s - dx * w);
        }
        if (ok) bones = { x: v.x, z: v.z, yaw, scale };
      }
      if (bones) break;
    }
    if (bones) break;
  }
  // The blowhole: somewhere open, away from the bones.
  let hole = null;
  for (const v of spots) {
    if (!clear(v.x, v.z) || (bones && Math.hypot(v.x - bones.x, v.z - bones.z) < (LENGTH * bones.scale) / 2 + 1)) continue;
    hole = { x: v.x, z: v.z, period: r.range(11, 16) };
    break;
  }
  const along = (x, z) => {
    const dx = Math.sin(bones.yaw), dz = Math.cos(bones.yaw), ox = x - bones.x, oz = z - bones.z;
    return { s: ox * dx + oz * dz, w: Math.abs(ox * dz - oz * dx) };
  };
  return {
    bones, hole,
    blocked: (x, z) => {
      if (hole && Math.hypot(x - hole.x, z - hole.z) < 0.6) return true;
      if (!bones) return false;
      const { s, w } = along(x, z);
      return Math.abs(s) < (LENGTH * bones.scale) / 2 + 0.4 && w < 1.3 * bones.scale;
    },
  };
}

function build({ plan, shape, r, hooks, bursts, lib }) {
  const group = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: '#ece4d2', flatShading: true, roughness: 0.75 });
  const pieces = [];
  if (plan.bones) {
    const { x, z, yaw, scale } = plan.bones;
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    // Laid out at the usual size, then grown: along, across and up all scale together.
    const at = (s, w, up) => {
      const px = x + (dx * s + dz * w) * scale, pz = z + (dz * s - dx * w) * scale;
      return new THREE.Vector3(px, shape.heightAt(px, pz) + up * scale, pz);
    };
    // The spine: a row of vertebrae, highest over the ribs, sinking toward the tail.
    const spine = (s) => 0.25 + 1.45 * Math.max(0, Math.sin(((s + LENGTH / 2) / LENGTH) * Math.PI * 0.95 + 0.15));
    for (let s = -LENGTH / 2 + 0.6; s <= LENGTH / 2; s += 0.32) {
      const c = at(s, 0, spine(s));
      pieces.push(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 7).scale(scale, scale, scale).rotateX(Math.PI / 2).rotateY(yaw).translate(c.x, c.y, c.z));
      pieces.push(new THREE.BoxGeometry(0.04, 0.22, 0.06).scale(scale, scale, scale).rotateY(yaw).translate(c.x, c.y + 0.16 * scale, c.z));
    }
    // Ribs: arcs from the spine out and down into the ground on both sides.
    for (let i = 0; i < 9; i++) {
      const s = -LENGTH / 2 + 1.4 + i * 0.36;
      const h = spine(s), span = 0.65 + Math.sin((i / 8) * Math.PI) * 0.45;
      for (const side of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([at(s, 0, h), at(s + 0.05, side * span * 0.75, h * 0.92), at(s + 0.1, side * span, h * 0.45), at(s + 0.12, side * span * 0.92, -0.1)]);
        pieces.push(new THREE.TubeGeometry(curve, 10, 0.045 * scale, 5, false));
      }
    }
    // The skull at the front, and the two long jawbones lying in the grass ahead of it.
    const head = at(-LENGTH / 2 + 0.4, 0, 0.45);
    pieces.push(new THREE.IcosahedronGeometry(0.5 * scale, 1).scale(0.7, 0.45, 1.25).rotateY(yaw).translate(head.x, head.y, head.z));
    for (const side of [-1, 1]) {
      const jaw = new THREE.CatmullRomCurve3([at(-LENGTH / 2 + 0.6, side * 0.32, 0.12), at(-LENGTH / 2 - 0.2, side * 0.42, 0.1), at(-LENGTH / 2 - 0.9, side * 0.2, 0.04)]);
      pieces.push(new THREE.TubeGeometry(jaw, 8, 0.05 * scale, 5, false));
    }
    // Two flipper bones splayed out by the front ribs.
    for (const side of [-1, 1]) {
      const fin = new THREE.CatmullRomCurve3([at(-LENGTH / 2 + 1.5, side * 0.5, 0.1), at(-LENGTH / 2 + 1.9, side * 1.3, 0.06), at(-LENGTH / 2 + 2.4, side * 1.6, 0.03)]);
      pieces.push(new THREE.TubeGeometry(fin, 6, 0.04 * scale, 4, false));
    }
  }
  if (pieces.length) {
    const mesh = new THREE.Mesh(lib.flat(...pieces.map((g) => { g.deleteAttribute('uv'); return g; })), bone);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }

  // The blowhole and its spout.
  const hole = plan.hole;
  let spout = null, top = null;
  if (hole) {
    top = new THREE.Vector3(hole.x, shape.heightAt(hole.x, hole.z) + 0.02, hole.z);
    const rimGeo = new THREE.TorusGeometry(0.2, 0.06, 5, 12).rotateX(Math.PI / 2).translate(top.x, top.y, top.z);
    const mouth = new THREE.CircleGeometry(0.18, 12).rotateX(-Math.PI / 2).translate(top.x, top.y + 0.005, top.z);
    group.add(new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: '#5a6878', flatShading: true })));
    group.add(new THREE.Mesh(mouth, new THREE.MeshStandardMaterial({ color: '#1a2228', flatShading: true })));
    spout = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: '#eef6ff', flatShading: true, transparent: true, opacity: 0.7, depthWrite: false }), 18);
    spout.frustumCulled = false;
    group.add(spout);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  let blew = false;
  return {
    object: group,
    update(time, dt, env) {
      if (!spout) return;
      const phase = (time + 3) % hole.period, on = phase < 2;
      if (on && !blew) {
        hooks.sound('whoosh');
        bursts.spawn(top, { count: 20, colors: ['#eef6ff', '#ffffff'], speed: 0.9, up: 3.5, gravity: -5, life: 1.2, drag: 0.5 });
      }
      blew = on;
      for (let i = 0; i < 18; i++) {
        const life = ((phase / 2) * 1.4 + i / 18) % 1;
        const a = i * 2.4;
        p.set(top.x + Math.cos(a) * life * 0.5 + env.wind * life * 0.3, top.y + life * 2.6, top.z + Math.sin(a) * life * 0.5);
        s.setScalar(on ? (0.6 + life * 2) * Math.min(1, (2 - phase) * 2) : 0);
        m.compose(p, q, s);
        spout.setMatrixAt(i, m);
      }
      spout.instanceMatrix.needsUpdate = true;
    },
  };
}

export default { id: 'whale', dress: { plan, build } };
