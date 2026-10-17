import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Wildlife. Every species is one or a few instanced meshes; bodies and wings
// (or heads) are separate so they can move against each other.

const TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(0, 0, 1), SIDE = new THREE.Vector3(1, 0, 0);

// A colored part, placed and merged into a model.
function part(geo, color, [x = 0, y = 0, z = 0] = [], { rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), Array.isArray(s) ? _s.fromArray(s) : _s.setScalar(s)));
  const c = new THREE.Color(color);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(0).flatMap(() => [c.r, c.g, c.b]), 3));
  return g;
}
const model = (...parts) => mergeGeometries(parts);
const material = (extra) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, ...extra });

// A flat wing from a list of [x, z] outline points (a fan from the first), hinged
// along the body at x = 0, tinted from `root` to `tip`.
function wing(outline, root, tip) {
  const a = new THREE.Color(root), b = new THREE.Color(tip);
  const span = Math.max(...outline.map(([x]) => x));
  const pos = [], col = [];
  for (let i = 1; i < outline.length - 1; i++) {
    for (const [x, z] of [outline[0], outline[i], outline[i + 1]]) {
      pos.push(x, 0, z);
      const c = a.clone().lerp(b, x / span);
      col.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

// Body plus left and right wings, posed together every frame.
function flyers(count, bodyGeo, wingGeo, bodyMat, wingMat) {
  const body = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const right = new THREE.InstancedMesh(wingGeo, wingMat, count);
  const left = new THREE.InstancedMesh(wingGeo.clone().scale(-1, 1, 1), wingMat, count);
  const group = new THREE.Group().add(body, left, right);
  for (const mesh of [body, left, right]) {
    mesh.frustumCulled = false;
    mesh.castShadow = true;
  }
  return {
    group,
    pose(i, position, heading, roll, flap, scale) {
      _q.setFromAxisAngle(UP, heading).multiply(_q2.setFromAxisAngle(FORWARD, roll));
      _m.compose(position, _q, _s.setScalar(scale));
      body.setMatrixAt(i, _m);
      right.setMatrixAt(i, _m2.makeRotationZ(flap).premultiply(_m));
      left.setMatrixAt(i, _m2.makeRotationZ(-flap).premultiply(_m));
    },
    done() {
      for (const mesh of [body, left, right]) mesh.instanceMatrix.needsUpdate = true;
    },
    set visible(v) {
      group.visible = v;
    },
  };
}

// Birds as you see them from afar: small dark silhouettes whose wings bend at
// the wrist. Inner and outer wing halves move separately, so they beat with a
// fold and glide in the familiar "M".
function buildBirds(r, count) {
  const dark = '#3b3a3c';
  const body = model(
    part(new THREE.OctahedronGeometry(1, 0), dark, [0, 0, 0], { s: [0.04, 0.04, 0.17] }),
    part(new THREE.IcosahedronGeometry(0.035, 0), dark, [0, 0.012, 0.15]),
    part(new THREE.OctahedronGeometry(1, 0), '#8a8580', [0, -0.018, 0.02], { s: [0.028, 0.02, 0.1] }),
    // A forked tail.
    part(new THREE.ConeGeometry(0.03, 0.12, 3).rotateX(-Math.PI / 2), dark, [-0.018, 0, -0.2], { ry: -0.25, s: [1, 0.2, 1] }),
    part(new THREE.ConeGeometry(0.03, 0.12, 3).rotateX(-Math.PI / 2), dark, [0.018, 0, -0.2], { ry: 0.25, s: [1, 0.2, 1] }),
  );
  const WRIST = 0.16;
  const inner = wing([[0, 0.05], [WRIST, 0.03], [WRIST, -0.05], [0, -0.06]], dark, '#454346');
  const outer = wing([[0, 0.03], [0.1, 0.0], [0.2, -0.06], [0.12, -0.07], [0, -0.05]], '#454346', '#222124');
  const wingMat = material({ side: THREE.DoubleSide, roughness: 0.9 });
  const meshes = {
    body: new THREE.InstancedMesh(body, material({ roughness: 0.9 }), count),
    innerR: new THREE.InstancedMesh(inner, wingMat, count),
    innerL: new THREE.InstancedMesh(inner.clone().scale(-1, 1, 1), wingMat, count),
    outerR: new THREE.InstancedMesh(outer, wingMat, count),
    outerL: new THREE.InstancedMesh(outer.clone().scale(-1, 1, 1), wingMat, count),
  };
  const group = new THREE.Group().add(...Object.values(meshes));
  for (const mesh of Object.values(meshes)) {
    mesh.frustumCulled = false;
    mesh.castShadow = true;
  }
  const wristR = new THREE.Matrix4().makeTranslation(WRIST, 0, 0), wristL = new THREE.Matrix4().makeTranslation(-WRIST, 0, 0);
  const rot = new THREE.Matrix4(), joint = new THREE.Matrix4();
  const birds = Array.from({ length: count }, () => ({ ox: r.range(-1.6, 1.6), oy: r.range(-0.5, 0.5), oz: r.range(-1.6, 1.6), phase: r.range(0, TAU), rate: r.range(7, 9) }));
  const radius = r.range(10, 14), height = r.range(5, 8), speed = r.range(0.08, 0.12) * (r.chance(0.5) ? 1 : -1);
  return {
    object: group,
    update(t, dt, env) {
      const out = (1 - env.night) * (1 - Math.max(env.rain, env.snow));
      group.visible = out > 0.05;
      if (!group.visible) return;
      const a = t * speed, dir = Math.sign(speed);
      birds.forEach((b, i) => {
        // A few beats, then a glide with the wings held in an M, banking into the turn.
        const glide = THREE.MathUtils.smoothstep(Math.sin(t * 0.45 + b.phase), 0.1, 0.4);
        const beat = Math.sin(t * b.rate + b.phase);
        const shoulder = THREE.MathUtils.lerp(beat * 0.55 + 0.1, 0.22, glide);
        const elbow = THREE.MathUtils.lerp(-beat * 0.35 - 0.1, -0.38, glide);
        _p.set(Math.cos(a) * radius + b.ox + Math.sin(t * 0.7 + b.phase) * 0.3, height + b.oy + Math.sin(t * 0.5 + b.phase) * 0.35, Math.sin(a) * radius + b.oz);
        _q.setFromAxisAngle(UP, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir)).multiply(_q2.setFromAxisAngle(FORWARD, -0.25 * dir));
        _m.compose(_p, _q, _s.setScalar(out * 1.25));
        meshes.body.setMatrixAt(i, _m);
        joint.copy(_m).multiply(rot.makeRotationZ(shoulder));
        meshes.innerR.setMatrixAt(i, joint);
        meshes.outerR.setMatrixAt(i, _m2.copy(joint).multiply(wristR).multiply(rot.makeRotationZ(elbow)));
        joint.copy(_m).multiply(rot.makeRotationZ(-shoulder));
        meshes.innerL.setMatrixAt(i, joint);
        meshes.outerL.setMatrixAt(i, _m2.copy(joint).multiply(wristL).multiply(rot.makeRotationZ(-elbow)));
      });
      for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildButterflies(spots, r, count) {
  if (!count || !spots.length) return null;
  const body = part(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 4).rotateX(Math.PI / 2), '#2a2420');
  const kinds = [['#ffcf3a', '#3a2a1a'], ['#ff8a3c', '#2a1a10'], ['#ffffff', '#555555'], ['#6fa8ff', '#1a2a5a'], ['#ff86b0', '#5a1a3a']];
  const flocks = kinds.map(([root, tip]) => flyers(Math.ceil(count / kinds.length), body.clone(),
    wing([[0, 0.02], [0.07, 0.07], [0.1, 0.02], [0.08, -0.02], [0.06, -0.07], [0.02, -0.06], [0, -0.02]], root, tip),
    material(), material({ side: THREE.DoubleSide, roughness: 0.5 })));
  const flies = Array.from({ length: count }, (_, i) => {
    const home = r.pick(spots);
    return { x: home.x, y: home.y, z: home.z, phase: r.range(0, TAU), pace: r.range(0.7, 1.3), flock: flocks[i % kinds.length], slot: Math.floor(i / kinds.length) };
  });
  return {
    object: new THREE.Group().add(...flocks.map((f) => f.group)),
    update(t, dt, env) {
      const out = (1 - env.night) * (1 - Math.max(env.rain, env.snow)) * (1 - env.mist * 0.6);
      flocks.forEach((f) => {
        f.visible = out > 0.05;
      });
      if (out <= 0.05) return;
      for (const b of flies) {
        const a = t * 0.7 * b.pace + b.phase, c = t * 0.53 * b.pace + b.phase * 1.3;
        _p.set(b.x + Math.sin(a) * 0.9, b.y + 0.4 + Math.sin(t * 1.9 + b.phase) * 0.25, b.z + Math.sin(c) * 0.9);
        b.flock.pose(b.slot, _p, Math.atan2(Math.cos(a) * 0.63, Math.cos(c) * 0.49), 0, Math.sin(t * 15 + b.phase) * 0.9 + 0.3, out * 1.6);
      }
      flocks.forEach((f) => f.done());
    },
  };
}

function buildBats(r, count, height, note) {
  if (!count) return null;
  const body = part(new THREE.IcosahedronGeometry(0.04, 0), '#24222a', [0, 0, 0], { s: [1, 0.9, 1.6] });
  const colony = flyers(count, body, wing([[0, 0.04], [0.12, 0.06], [0.2, 0.0], [0.16, -0.03], [0.12, -0.0], [0.08, -0.05], [0, -0.04]], '#2a2830', '#1a181e'), material(), material({ side: THREE.DoubleSide }));
  const bats = Array.from({ length: count }, () => ({ radius: r.range(2.5, 7), y: height + r.range(1.5, 4), speed: r.range(0.5, 0.9) * (r.chance(0.5) ? 1 : -1), phase: r.range(0, TAU) }));
  return {
    object: colony.group,
    update(t, dt, env) {
      const out = env.night * (1 - env.rain) * (1 - env.snow);
      colony.visible = out > 0.05;
      if (out <= 0.05) return;
      if (out > 0.5) note('bats');
      bats.forEach((b, i) => {
        // Bats jink about rather than gliding in circles.
        const a = t * b.speed + b.phase + Math.sin(t * 2.7 + b.phase) * 0.4;
        const rad = b.radius + Math.sin(t * 1.3 + b.phase) * 1.2;
        _p.set(Math.cos(a) * rad, b.y + Math.sin(t * 3.1 + b.phase) * 0.5, Math.sin(a) * rad);
        colony.pose(i, _p, Math.atan2(-Math.sin(a) * Math.sign(b.speed), Math.cos(a) * Math.sign(b.speed)), 0, Math.sin(t * 14 + b.phase) * 0.9, out * 1.4);
      });
      colony.done();
    },
  };
}

function buildDragonflies(shape, waterLevel, r) {
  const { lake } = shape;
  const count = r.int(3, 5);
  const body = part(new THREE.CylinderGeometry(0.01, 0.006, 0.16, 4).rotateX(Math.PI / 2), '#2fa8a0');
  const swarm = flyers(count, body, wing([[0, 0.03], [0.1, 0.035], [0.11, 0.015], [0.1, -0.02], [0, -0.02]], '#cfe8f0', '#a8d0e0'), material({ emissive: '#0a3a38' }), material({ side: THREE.DoubleSide, transparent: true, opacity: 0.6, roughness: 0.2 }));
  const darts = Array.from({ length: count }, () => ({ a: r.range(0, TAU), phase: r.range(0, TAU), pause: 0 }));
  return {
    object: swarm.group,
    update(t, dt, env) {
      const out = (1 - env.night) * (1 - Math.max(env.rain, env.snow));
      swarm.visible = out > 0.05;
      if (out <= 0.05) return;
      darts.forEach((d, i) => {
        // Hover, then dart a little way along the shore.
        d.a += dt * (Math.sin(t * 0.8 + d.phase) > 0.6 ? 1.2 : 0.05);
        const reach = shape.shoreDistance(lake, d.a) * 0.92;
        _p.set(lake.x + Math.cos(d.a) * reach, waterLevel + 0.35 + Math.sin(t * 2 + d.phase) * 0.1, lake.z + Math.sin(d.a) * reach);
        swarm.pose(i, _p, d.a + Math.PI / 2, 0, Math.sin(t * 40 + d.phase) * 0.35, out * 1.3);
      });
      swarm.done();
    },
  };
}

// Rabbits nibble, then hop off somewhere nearby; tap one and it bolts.
function buildRabbits({ spots, shape, r, count, coat, sound, note, bursts }) {
  if (!count || spots.length < 8) return null;
  const geo = model(
    part(new THREE.IcosahedronGeometry(0.1, 1), coat, [0, 0.11, 0], { s: [1, 0.85, 1.35] }),
    part(new THREE.IcosahedronGeometry(0.065, 1), coat, [0, 0.2, 0.12]),
    part(new THREE.BoxGeometry(0.025, 0.12, 0.012), coat, [-0.028, 0.3, 0.1], { rz: 0.12, rx: -0.2 }),
    part(new THREE.BoxGeometry(0.025, 0.12, 0.012), coat, [0.028, 0.3, 0.1], { rz: -0.12, rx: -0.2 }),
    part(new THREE.IcosahedronGeometry(0.03, 0), '#ffffff', [0, 0.13, -0.15]),
    part(new THREE.IcosahedronGeometry(0.012, 0), '#1a1a1a', [-0.035, 0.22, 0.17]),
    part(new THREE.IcosahedronGeometry(0.012, 0), '#1a1a1a', [0.035, 0.22, 0.17]),
  );
  const mesh = new THREE.InstancedMesh(geo, material(), count);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const rabbits = Array.from({ length: count }, () => {
    const home = r.pick(spots);
    return { x: home.x, z: home.z, home, heading: r.range(0, TAU), hop: null, rest: r.range(0.5, 3), hopsLeft: 0, fast: false };
  });
  const nearby = (b, radius) => {
    for (let k = 0; k < 10; k++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      if (Math.hypot(s.x - b.home.x, s.z - b.home.z) < radius) return s;
    }
    return b.home;
  };
  function hopToward(b, x, z, fast) {
    const d = Math.hypot(x - b.x, z - b.z);
    b.heading = Math.atan2(x - b.x, z - b.z);
    b.hopsLeft = Math.max(1, Math.round(d / 0.35));
    b.fast = fast;
    b.target = { x, z };
  }
  mesh.userData.onClick = (hit) => {
    const b = rabbits[hit.instanceId];
    if (!b) return;
    const away = r.range(-0.6, 0.6) + Math.atan2(b.x - hit.point.x, b.z - hit.point.z);
    hopToward(b, b.x + Math.sin(away) * 1.6, b.z + Math.cos(away) * 1.6, true);
    sound('rustle');
    note('rabbit');
  };
  return {
    object: mesh,
    clickables: [mesh],
    update(t, dt) {
      rabbits.forEach((b, i) => {
        let lift = 0, pitch = 0;
        if (b.hop) {
          const k = (t - b.hop.t) / b.hop.dur;
          if (k >= 1) {
            b.x = b.hop.x1;
            b.z = b.hop.z1;
            b.hop = null;
            if (--b.hopsLeft <= 0) b.rest = r.range(1.5, 5);
          } else {
            b.x = b.hop.x0 + (b.hop.x1 - b.hop.x0) * k;
            b.z = b.hop.z0 + (b.hop.z1 - b.hop.z0) * k;
            lift = Math.sin(Math.PI * k) * (b.fast ? 0.16 : 0.11);
            pitch = Math.cos(Math.PI * k) * -0.35;
          }
        } else if (b.hopsLeft > 0) {
          const step = b.fast ? 0.45 : 0.32;
          const d = Math.hypot(b.target.x - b.x, b.target.z - b.z), s = Math.min(step, d);
          let x1 = b.x + Math.sin(b.heading) * s, z1 = b.z + Math.cos(b.heading) * s;
          if (shape.isWet(x1, z1, 0.2) || shape.radial(x1, z1) > 0.92) {
            x1 = b.x;
            z1 = b.z;
            b.hopsLeft = 1;
          }
          b.hop = { t, dur: b.fast ? 0.22 : 0.32, x0: b.x, z0: b.z, x1, z1 };
        } else if ((b.rest -= dt) <= 0) {
          const s = nearby(b, 1.8);
          hopToward(b, s.x, s.z, false);
        } else {
          pitch = Math.max(0, Math.sin(t * 3 + i)) * 0.15; // nibbling
        }
        _q.setFromAxisAngle(UP, b.heading).multiply(_q2.setFromAxisAngle(SIDE, pitch));
        mesh.setMatrixAt(i, _m.compose(_p.set(b.x, shape.heightAt(b.x, b.z) - 0.02 + lift, b.z), _q, _s.setScalar(1)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Deer graze, look up now and then, and wander; tap one and it bounds away.
function buildDeer({ spots, shape, r, count, sound, note }) {
  if (!count || spots.length < 8) return null;
  const coat = '#9a6a44', belly = '#c9a27a';
  const bodyGeo = model(
    part(new THREE.BoxGeometry(0.22, 0.24, 0.58), coat, [0, 0.62, 0]),
    part(new THREE.BoxGeometry(0.18, 0.06, 0.5), belly, [0, 0.49, 0]),
    ...[[-0.07, 0.2], [0.07, 0.2], [-0.07, -0.2], [0.07, -0.2]].map(([x, z]) => part(new THREE.BoxGeometry(0.05, 0.52, 0.05), coat, [x, 0.26, z])),
    part(new THREE.BoxGeometry(0.06, 0.08, 0.04), '#f4f0e8', [0, 0.7, -0.31]),
  );
  // The head and neck pivot where the neck meets the body.
  const headGeo = model(
    part(new THREE.BoxGeometry(0.09, 0.28, 0.1), coat, [0, 0.12, 0.04], { rx: 0.35 }),
    part(new THREE.BoxGeometry(0.11, 0.11, 0.22), coat, [0, 0.27, 0.15]),
    part(new THREE.BoxGeometry(0.05, 0.06, 0.06), '#2a2420', [0, 0.25, 0.27]),
    part(new THREE.BoxGeometry(0.02, 0.08, 0.05), coat, [-0.07, 0.36, 0.08], { rz: 0.6 }),
    part(new THREE.BoxGeometry(0.02, 0.08, 0.05), coat, [0.07, 0.36, 0.08], { rz: -0.6 }),
    part(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 4), '#e8dcc0', [-0.04, 0.42, 0.1], { rz: 0.3 }),
    part(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 4), '#e8dcc0', [0.04, 0.42, 0.1], { rz: -0.3 }),
  );
  const bodies = new THREE.InstancedMesh(bodyGeo, material(), count);
  const heads = new THREE.InstancedMesh(headGeo, material(), count);
  for (const mesh of [bodies, heads]) {
    mesh.castShadow = true;
    mesh.frustumCulled = false;
  }
  const herd = Array.from({ length: count }, (_, i) => {
    const home = spots[i % spots.length];
    const heading = r.range(0, TAU);
    return { x: home.x, z: home.z, heading, aim: heading, pitch: 0.9, mode: 'graze', timer: r.range(2, 6), speed: 0, turnWait: 0 };
  });
  const pivot = new THREE.Matrix4().makeTranslation(0, 0.68, 0.27);
  const startle = (d, from) => {
    d.mode = 'flee';
    d.timer = 1.6;
    d.aim = Math.atan2(d.x - from.x, d.z - from.z) + r.range(-0.4, 0.4);
    sound('thud');
  };
  for (const mesh of [bodies, heads]) {
    mesh.userData.onClick = (hit) => {
      const d = herd[hit.instanceId];
      if (!d) return;
      startle(d, hit.point);
      note('deer');
    };
  }
  return {
    object: new THREE.Group().add(bodies, heads),
    clickables: [bodies, heads],
    update(t, dt) {
      herd.forEach((d, i) => {
        d.timer -= dt;
        let pitchGoal = 0, speedGoal = 0;
        if (d.mode === 'graze') {
          pitchGoal = 0.95;
          if (d.timer <= 0) Object.assign(d, { mode: Math.random() < 0.5 ? 'look' : 'walk', timer: r.range(1.5, 4), aim: d.heading + r.range(-1.2, 1.2) });
        } else if (d.mode === 'look') {
          if (d.timer <= 0) Object.assign(d, { mode: 'graze', timer: r.range(3, 8) });
        } else {
          pitchGoal = 0.25;
          speedGoal = d.mode === 'flee' ? 1.6 : 0.35;
          if (d.timer <= 0) Object.assign(d, { mode: 'graze', timer: r.range(3, 8) });
        }
        d.pitch += (pitchGoal - d.pitch) * Math.min(1, dt * 3);
        d.speed += (speedGoal - d.speed) * Math.min(1, dt * 4);
        // Turn smoothly toward where it means to go.
        const turn = Math.atan2(Math.sin(d.aim - d.heading), Math.cos(d.aim - d.heading));
        d.heading += turn * Math.min(1, dt * (d.mode === 'flee' ? 6 : 2));
        d.turnWait -= dt;
        if (d.speed > 0.05) {
          // Only a moving deer meets obstacles; then it picks a new way once and
          // gives itself a moment to turn before checking again.
          const ahead = 0.35, nx = d.x + Math.sin(d.heading) * ahead, nz = d.z + Math.cos(d.heading) * ahead;
          if (shape.isWet(nx, nz, 0.3) || shape.radial(nx, nz) > 0.9 || shape.slopeAt(nx, nz) > 0.9) {
            if (d.turnWait <= 0) {
              d.aim = d.heading + Math.PI * r.range(0.6, 1.0) * (Math.random() < 0.5 ? 1 : -1);
              d.turnWait = 1.2;
            }
            d.speed *= 0.9;
          } else {
            d.x += Math.sin(d.heading) * d.speed * dt;
            d.z += Math.cos(d.heading) * d.speed * dt;
          }
        }
        const bob = d.mode === 'flee' ? Math.abs(Math.sin(t * 9 + i)) * 0.12 : Math.abs(Math.sin(t * 5 + i)) * 0.02 * (d.speed > 0.1 ? 1 : 0);
        _q.setFromAxisAngle(UP, d.heading);
        _m.compose(_p.set(d.x, shape.heightAt(d.x, d.z) - 0.03 + bob, d.z), _q, _s.setScalar(1));
        bodies.setMatrixAt(i, _m);
        heads.setMatrixAt(i, _m2.copy(_m).multiply(pivot).multiply(new THREE.Matrix4().makeRotationX(d.pitch)));
      });
      bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    },
  };
}

// Ducks paddle about the lake, leaving soft wakes; tap one and it flaps off with a quack.
function buildDucks({ lake, open, water, waterLevel, r, count, sound, note }) {
  const geo = model(
    part(new THREE.IcosahedronGeometry(0.1, 1), '#8a6a4a', [0, 0.04, 0], { s: [1, 0.75, 1.6] }),
    part(new THREE.IcosahedronGeometry(0.055, 1), '#2f6b3a', [0, 0.14, 0.13]),
    part(new THREE.BoxGeometry(0.08, 0.012, 0.03), '#f4f0e8', [0, 0.1, 0.11]),
    part(new THREE.ConeGeometry(0.02, 0.06, 4).rotateX(Math.PI / 2), '#e8a33a', [0, 0.13, 0.2], { s: [1.2, 0.6, 1] }),
    part(new THREE.ConeGeometry(0.04, 0.08, 4).rotateX(-Math.PI / 2.4), '#5a4030', [0, 0.08, -0.17]),
  );
  const mesh = new THREE.InstancedMesh(geo, material({ roughness: 0.6 }), count);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const ducks = Array.from({ length: count }, () => ({
    cx: lake.x, cz: lake.z,
    radius: r.range(0.3, 0.65) * open, a: r.range(0, TAU), speed: r.range(0.1, 0.2) * (r.chance(0.5) ? 1 : -1),
    flap: 0, wake: r.range(0, 2),
  }));
  mesh.userData.onClick = (hit) => {
    const d = ducks[hit.instanceId];
    if (!d) return;
    d.flap = 1;
    sound('quack');
    note('duck');
  };
  return {
    object: mesh,
    clickables: [mesh],
    update(t, dt, env) {
      const surface = waterLevel + water.mesh.position.y;
      ducks.forEach((d, i) => {
        d.flap = Math.max(0, d.flap - dt * 0.6);
        d.a += d.speed * dt * (1 + d.flap * 6) / Math.max(d.radius, 0.3);
        const x = d.cx + Math.cos(d.a) * d.radius, z = d.cz + Math.sin(d.a) * d.radius;
        if ((d.wake -= dt) <= 0) {
          water.ripple(x, z, t, 0.45);
          d.wake = 2 + Math.random() * 2;
        }
        const heading = Math.atan2(-Math.sin(d.a) * Math.sign(d.speed), Math.cos(d.a) * Math.sign(d.speed));
        const bob = Math.sin(t * 2 + i) * 0.012 + d.flap * Math.abs(Math.sin(t * 20)) * 0.06;
        _q.setFromAxisAngle(UP, heading).multiply(_q2.setFromAxisAngle(SIDE, Math.sin(t * 1.3 + i) * 0.05 - d.flap * 0.3));
        mesh.setMatrixAt(i, _m.compose(_p.set(x, surface - 0.02 + bob, z), _q, _s.setScalar(1.1)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Now and then a fish leaps out of the lake, and sometimes when you tap the water.
function buildFish({ lake, open, water, waterLevel, bursts, koi, note }) {
  const fishMaterial = new THREE.MeshStandardMaterial({ color: koi ? '#ff8a3c' : '#b9c8d4', metalness: 0.35, roughness: 0.3, flatShading: true });
  const fish = new THREE.Group();
  fish.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0).scale(0.55, 0.65, 1.9), fishMaterial));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.3), fishMaterial);
  fish.add(tail);
  fish.visible = false;
  let jump = null, wait = 4 + Math.random() * 8;
  const splash = (x, z, t) => {
    water.ripple(x, z, t);
    bursts.spawn(new THREE.Vector3(x, waterLevel, z), { count: 14, colors: ['#e8f6ff', '#ffffff'], speed: 0.45, up: 2, gravity: -9, life: 0.6, drag: 0.4 });
  };
  function leap(t, near) {
    const a = Math.random() * TAU, d = Math.random() * open * 0.55;
    const x = near ? near.x : lake.x + Math.cos(a) * d, z = near ? near.z : lake.z + Math.sin(a) * d;
    const dir = Math.random() * TAU;
    jump = { t, x, z, dx: Math.sin(dir), dz: Math.cos(dir), dir };
    splash(x - jump.dx * 0.6, z - jump.dz * 0.6, t);
    note('fish');
  }
  let pending = null;
  return {
    object: fish,
    jumpNear(point, t) {
      if (!jump && !pending && Math.random() < 0.45) pending = { point, at: t + 0.5 };
    },
    update(t, dt, env) {
      if (pending && t >= pending.at) {
        leap(t, pending.point);
        pending = null;
      }
      if (!jump) {
        if (env.snowCover < 0.6 && (wait -= dt) <= 0) leap(t);
        fish.visible = false;
        return;
      }
      const s = (t - jump.t) / 1.0;
      if (s >= 1) {
        splash(jump.x + jump.dx * 0.6, jump.z + jump.dz * 0.6, t);
        jump = null;
        wait = 8 + Math.random() * 14;
        return;
      }
      fish.visible = true;
      fish.position.set(jump.x + jump.dx * (s - 0.5) * 1.2, waterLevel - 0.1 + Math.sin(Math.PI * s) * 0.8, jump.z + jump.dz * (s - 0.5) * 1.2);
      fish.rotation.set(-Math.cos(Math.PI * s) * 0.9, jump.dir, 0, 'YXZ');
      tail.rotation.y = Math.sin(t * 30) * 0.4;
    },
  };
}

const COATS = { snowfield: '#f4f4f2', desert: '#c8a47a', highlands: '#8a8478' };

export function buildLife({ top, shape, biome, biomeKey, blocked, bursts, r, water, waterLevel, sound, note }) {
  const group = new THREE.Group();
  const updaters = [], clickables = [];
  const add = (part) => {
    if (!part) return;
    group.add(part.object);
    updaters.push(part.update);
    clickables.push(...(part.clickables ?? []));
  };
  // Open, dry, gentle ground: where animals can live.
  const spots = [];
  for (let k = 3; k < top.rings.length - 3; k++) {
    for (const v of top.rings[k]) {
      if (!shape.isWet(v.x, v.z, 0.3) && !blocked(v.x, v.z) && shape.slopeAt(v.x, v.z) < 0.55) spots.push(v);
    }
  }
  r.shuffle(spots);
  const lush = ['meadow', 'highlands', 'autumn', 'blossom'].includes(biomeKey);

  add(buildBirds(r, r.int(6, 10)));
  add(buildButterflies(spots.slice(0, 40), r, { meadow: 14, blossom: 16, dream: 16, autumn: 10, highlands: 8, desert: 4, snowfield: 0, coral: 8, toadstool: 10, gilded: 12, jungle: 18, savanna: 6, heath: 6, lavender: 18, cloudisle: 8, sugar: 14 }[biomeKey]));
  add(buildBats(r, biomeKey === 'snowfield' ? 0 : r.int(5, 8), 0.9 + biome.hills * 0.6, note));
  add(buildRabbits({ spots, shape, r, count: biomeKey === 'dream' ? 0 : r.int(4, 7), coat: COATS[biomeKey] ?? '#a07850', sound, note, bursts }));
  add(buildDeer({ spots, shape, r, count: lush ? r.int(2, 4) : 0, sound, note }));
  let fish = null;
  // Nothing swims in lava.
  if (water && !biome.water.lava) {
    // The open-water radius: the nearest the shore comes to the lake's middle.
    let open = Infinity;
    for (let i = 0; i < 24; i++) open = Math.min(open, shape.shoreDistance(shape.lake, (i / 24) * TAU));
    add(buildDragonflies(shape, waterLevel, r));
    add(buildDucks({ lake: shape.lake, open, water, waterLevel, r, count: r.int(2, 4), sound, note }));
    fish = buildFish({ lake: shape.lake, open, water, waterLevel, bursts, note, koi: biomeKey === 'blossom' || biomeKey === 'dream' });
    add(fish);
  }

  return {
    object: group,
    clickables,
    fish,
    update(t, dt, env) {
      for (const update of updaters) update(t, dt, env);
    },
  };
}
