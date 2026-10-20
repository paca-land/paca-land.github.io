import * as THREE from 'three';
import { ISLANDS } from './packs/index.js';
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
    ...[[-0.076, 0.2], [0.076, 0.2], [-0.076, -0.2], [0.076, -0.2]].map(([x, z]) => part(new THREE.BoxGeometry(0.05, 0.54, 0.05), coat, [x, 0.27, z])),
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

// Parts that overlap must stand clear of each other by 0.01 or more: two faces of
// different colours closer than that flicker (z-fighting) at the default camera.
// tools/zfight-check.js finds them.
// More creatures. Each is a little model and a way of getting about: hoppers
// hop from spot to spot, walkers amble and stop to graze (a waddle rocks them
// side to side), and scuttlers go sideways. Tap one and it scampers off.
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
const legs = (color, w, h, dx, dz, y = h / 2) => [[-dx, dz], [dx, dz], [-dx, -dz], [dx, -dz]].map(([x, z]) => part(box(w, h, w), color, [x, y, z]));
const CRITTERS = {
  sheep: {
    gait: 'walk', speed: 0.22, roam: 1.6, rest: [2, 6], sound: 'baa',
    model: (coat = '#f4f1ea') => model(
      part(ball(0.17), coat, [0, 0.26, 0], { s: [1, 0.85, 1.3] }),
      part(ball(0.075), '#2a2622', [0, 0.32, 0.2], { s: [0.9, 1, 1.2] }),
      part(box(0.06, 0.025, 0.035), '#2a2622', [-0.07, 0.36, 0.18], { rz: 0.4 }),
      part(box(0.06, 0.025, 0.035), '#2a2622', [0.07, 0.36, 0.18], { rz: -0.4 }),
      ...legs('#2a2622', 0.035, 0.16, 0.07, 0.1),
    ),
  },
  goat: {
    gait: 'walk', speed: 0.3, roam: 2, rest: [1.5, 5], sound: 'baa',
    model: () => model(
      part(box(0.13, 0.15, 0.32), '#e8e4dc', [0, 0.3, 0]),
      part(box(0.08, 0.1, 0.13), '#e8e4dc', [0, 0.42, 0.18], { rx: 0.3 }),
      part(new THREE.ConeGeometry(0.018, 0.12, 4), '#5a4a3a', [-0.03, 0.51, 0.13], { rx: -0.7 }),
      part(new THREE.ConeGeometry(0.018, 0.12, 4), '#5a4a3a', [0.03, 0.51, 0.13], { rx: -0.7 }),
      part(box(0.03, 0.06, 0.02), '#d8d0c4', [0, 0.34, 0.24]),
      ...legs('#cfc8bc', 0.035, 0.24, 0.04, 0.11),
    ),
  },
  squirrel: {
    gait: 'hop', speed: 0.7, hop: 0.07, step: 0.25, roam: 1.4, rest: [0.8, 3], sound: 'rustle',
    model: () => model(
      part(ball(0.07), '#c2562a', [0, 0.08, 0], { s: [0.9, 1, 1.25] }),
      part(ball(0.05), '#c2562a', [0, 0.13, 0.08]),
      part(ball(0.075), '#d8703a', [0, 0.17, -0.1], { s: [0.7, 1.5, 0.8] }),
      part(box(0.02, 0.04, 0.01), '#c2562a', [-0.025, 0.19, 0.07]),
      part(box(0.02, 0.04, 0.01), '#c2562a', [0.025, 0.19, 0.07]),
    ),
  },
  lizard: {
    gait: 'walk', speed: 0.6, roam: 1.2, rest: [1, 5], sound: 'rustle',
    model: (coat = '#6a9a3a') => model(
      part(box(0.06, 0.03, 0.18), coat, [0, 0.03, 0]),
      part(box(0.05, 0.03, 0.06), coat, [0, 0.035, 0.11]),
      part(new THREE.ConeGeometry(0.022, 0.16, 4), coat, [0, 0.025, -0.16], { rx: -Math.PI / 2 }),
      ...legs(coat, 0.02, 0.03, 0.045, 0.06, 0.015),
    ),
  },
  penguin: {
    gait: 'walk', waddle: true, speed: 0.16, roam: 1.4, rest: [1.5, 5], sound: 'pop',
    model: () => model(
      part(ball(0.1), '#1e2228', [0, 0.17, 0], { s: [1, 1.6, 0.9] }),
      part(ball(0.075), '#f4f4f2', [0, 0.15, 0.035], { s: [1, 1.5, 0.8] }),
      part(ball(0.06), '#1e2228', [0, 0.32, 0.01]),
      part(new THREE.ConeGeometry(0.018, 0.05, 4), '#f0a030', [0, 0.31, 0.07], { rx: Math.PI / 2 }),
      part(box(0.04, 0.012, 0.05), '#f0a030', [-0.035, 0.006, 0.02]),
      part(box(0.04, 0.012, 0.05), '#f0a030', [0.035, 0.006, 0.02]),
    ),
  },
  frog: {
    gait: 'hop', speed: 0.6, hop: 0.1, step: 0.28, roam: 1.2, rest: [1, 4], sound: 'ribbit',
    model: (coat = '#5a8a3a') => model(
      part(ball(0.07), coat, [0, 0.05, 0], { s: [1.1, 0.7, 1.2] }),
      part(ball(0.025), coat, [-0.035, 0.1, 0.05]),
      part(ball(0.025), coat, [0.035, 0.1, 0.05]),
      part(ball(0.012, 0), '#1a1a1a', [-0.035, 0.115, 0.07]),
      part(ball(0.012, 0), '#1a1a1a', [0.035, 0.115, 0.07]),
      part(box(0.03, 0.025, 0.08), coat, [-0.07, 0.02, -0.03], { ry: 0.4 }),
      part(box(0.03, 0.025, 0.08), coat, [0.07, 0.02, -0.03], { ry: -0.4 }),
    ),
  },
  crab: {
    gait: 'walk', sideways: true, speed: 0.4, roam: 1.2, rest: [1, 4], sound: 'chips',
    model: () => model(
      part(ball(0.08), '#e0503a', [0, 0.06, 0], { s: [1.3, 0.55, 0.9] }),
      part(ball(0.035), '#e85a40', [-0.1, 0.06, 0.07]),
      part(ball(0.035), '#e85a40', [0.1, 0.06, 0.07]),
      part(box(0.008, 0.05, 0.008), '#e0503a', [-0.025, 0.11, 0.04]),
      part(box(0.008, 0.05, 0.008), '#e0503a', [0.025, 0.11, 0.04]),
      ...[-0.04, 0, 0.04].flatMap((z) => [part(box(0.07, 0.012, 0.012), '#c8402a', [-0.1, 0.03, z], { rz: 0.5 }), part(box(0.07, 0.012, 0.012), '#c8402a', [0.1, 0.03, z], { rz: -0.5 })]),
    ),
  },
  snail: {
    gait: 'walk', speed: 0.05, roam: 0.6, rest: [3, 9], sound: 'pop',
    model: () => model(
      part(ball(0.075), '#a0703a', [0, 0.09, -0.02], { s: [0.8, 1, 1] }),
      part(ball(0.04), '#c8904a', [0.03, 0.1, -0.02]),
      part(box(0.05, 0.03, 0.18), '#d8c49a', [0, 0.015, 0.02]),
      part(box(0.006, 0.05, 0.006), '#d8c49a', [-0.015, 0.05, 0.1], { rx: 0.4 }),
      part(box(0.006, 0.05, 0.006), '#d8c49a', [0.015, 0.05, 0.1], { rx: 0.4 }),
    ),
  },
  giraffe: {
    gait: 'walk', speed: 0.28, roam: 2.4, rest: [2, 6], sound: 'thud',
    model: () => model(
      part(box(0.18, 0.2, 0.42), '#e8b84a', [0, 0.62, 0]),
      ...legs('#e0b048', 0.05, 0.52, 0.06, 0.15),
      part(box(0.08, 0.6, 0.08), '#e8b84a', [0, 0.98, 0.2], { rx: 0.35 }),
      part(box(0.09, 0.09, 0.18), '#e8b84a', [0, 1.3, 0.34]),
      part(box(0.015, 0.06, 0.015), '#6a4a2a', [-0.025, 1.38, 0.3]),
      part(box(0.015, 0.06, 0.015), '#6a4a2a', [0.025, 1.38, 0.3]),
      ...[[0.07, 0.7, 0.08, 0.07], [-0.084, 0.66, -0.1, 0.07], [0.075, 0.6, -0.04, 0.07], [-0.07, 0.74, 0.12, 0.07], [0, 0.9, 0.24, 0.1]].map(([x, y, z, w]) => part(box(w, 0.06, w), '#9a5a2a', [x, y, z])),
    ),
  },
  panda: {
    gait: 'walk', waddle: true, speed: 0.12, roam: 1.2, rest: [3, 8], sound: 'thud',
    model: () => model(
      part(ball(0.16), '#f2f2ee', [0, 0.22, 0], { s: [1, 0.95, 1.3] }),
      ...legs('#1e1e22', 0.07, 0.14, 0.08, 0.1),
      part(ball(0.11), '#f2f2ee', [0, 0.33, 0.2]),
      part(ball(0.035), '#1e1e22', [-0.07, 0.43, 0.18]),
      part(ball(0.035), '#1e1e22', [0.07, 0.43, 0.18]),
      part(ball(0.025), '#1e1e22', [-0.04, 0.35, 0.29], { s: [1, 1.3, 0.6] }),
      part(ball(0.025), '#1e1e22', [0.04, 0.35, 0.29], { s: [1, 1.3, 0.6] }),
      part(ball(0.018, 0), '#1e1e22', [0, 0.31, 0.31]),
    ),
  },
};
// The newer animals (October 20): each with a shape you can tell from across the island.
const cone = (r, h, n = 4) => new THREE.ConeGeometry(r, h, n);
const eyes = (x, y, z, r = 0.012, color = '#1a1a1a') => [part(ball(r, 0), color, [-x, y, z]), part(ball(r, 0), color, [x, y, z])];
// A cone standing out from the middle of a body, pointing along (dx, dy, dz).
function spike(geo, color, at, [dx, dy, dz]) {
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(dx, dy, dz).normalize()));
  return part(geo, color, at, { rx: e.x, ry: e.y, rz: e.z });
}
Object.assign(CRITTERS, {
  // PaCaLand's own: a woolly neck, a topknot and banana ears.
  alpaca: {
    gait: 'walk', speed: 0.2, roam: 1.8, rest: [2, 6], sound: 'hum',
    model: (coat = '#efe2c8') => model(
      part(ball(0.15), coat, [0, 0.36, 0], { s: [0.9, 0.85, 1.35] }),
      part(ball(0.07), coat, [0, 0.52, 0.15], { s: [1, 1.9, 1] }),
      part(ball(0.075), coat, [0, 0.67, 0.18]),
      part(ball(0.055), coat, [0, 0.74, 0.16]),
      part(box(0.07, 0.05, 0.07), coat, [0, 0.64, 0.24]),
      part(ball(0.014, 0), '#241c18', [0, 0.645, 0.28]),
      ...eyes(0.04, 0.69, 0.235),
      part(box(0.025, 0.09, 0.02), coat, [-0.045, 0.77, 0.17], { rz: 0.3 }),
      part(box(0.025, 0.09, 0.02), coat, [0.045, 0.77, 0.17], { rz: -0.3 }),
      ...legs(coat, 0.04, 0.26, 0.06, 0.11),
      part(ball(0.045), coat, [0, 0.42, -0.2]),
    ),
  },
  cow: {
    gait: 'walk', speed: 0.15, roam: 1.6, rest: [3, 8], sound: 'moo',
    model: () => model(
      part(box(0.22, 0.2, 0.42), '#f4f1ea', [0, 0.36, 0]),
      part(box(0.24, 0.14, 0.15), '#2a2622', [0, 0.4, -0.08]),
      part(box(0.24, 0.11, 0.08), '#2a2622', [0, 0.415, 0.13]),
      part(box(0.15, 0.15, 0.16), '#f4f1ea', [0, 0.47, 0.27]),
      part(box(0.17, 0.045, 0.09), '#2a2622', [0, 0.5, 0.26]),
      part(box(0.13, 0.09, 0.06), '#e8a8a0', [0, 0.425, 0.36]),
      part(cone(0.018, 0.08), '#e8dcc0', [-0.065, 0.58, 0.25], { rz: 0.6 }),
      part(cone(0.018, 0.08), '#e8dcc0', [0.065, 0.58, 0.25], { rz: -0.6 }),
      part(box(0.07, 0.03, 0.04), '#2a2622', [-0.1, 0.52, 0.24]),
      part(box(0.07, 0.03, 0.04), '#2a2622', [0.1, 0.52, 0.24]),
      part(ball(0.045), '#e8a8a0', [0, 0.26, -0.06]),
      part(box(0.02, 0.2, 0.02), '#2a2622', [0, 0.34, -0.22], { rx: 0.2 }),
      ...legs('#f4f1ea', 0.05, 0.26, 0.07, 0.15),
      ...legs('#2a2622', 0.07, 0.05, 0.07, 0.15, 0.018),
    ),
  },
  hen: {
    gait: 'hop', speed: 0.5, hop: 0.03, roam: 1, rest: [0.6, 2.4], sound: 'cluck',
    model: (coat = '#c8743a') => model(
      part(ball(0.07), coat, [0, 0.11, 0], { s: [0.9, 0.95, 1.2] }),
      part(ball(0.045), coat, [0, 0.19, 0.06]),
      part(box(0.014, 0.04, 0.045), '#e0302a', [0, 0.24, 0.06]),
      part(box(0.012, 0.03, 0.016), '#e0302a', [0, 0.155, 0.098]),
      part(cone(0.014, 0.04), '#f0b030', [0, 0.19, 0.115], { rx: Math.PI / 2 }),
      ...eyes(0.03, 0.2, 0.085, 0.009),
      part(box(0.05, 0.09, 0.05), coat, [0, 0.17, -0.09], { rx: -0.5 }),
      part(box(0.012, 0.06, 0.012), '#f0b030', [-0.025, 0.03, 0]),
      part(box(0.012, 0.06, 0.012), '#f0b030', [0.025, 0.03, 0]),
    ),
  },
  hedgehog: {
    gait: 'walk', speed: 0.12, roam: 1, rest: [2, 6], sound: 'rustle',
    model: () => model(
      part(ball(0.08), '#6a4a32', [0, 0.07, -0.01], { s: [1, 0.8, 1.2] }),
      ...[[0, 1, 0], [0.5, 0.8, 0], [-0.5, 0.8, 0], [0, 0.8, -0.5], [0.4, 0.7, -0.5], [-0.4, 0.7, -0.5], [0.7, 0.4, -0.3], [-0.7, 0.4, -0.3],
        [0, 0.5, -0.9], [0.3, 0.9, 0.3], [-0.3, 0.9, 0.3], [0.8, 0.4, 0.2], [-0.8, 0.4, 0.2], [0.35, 0.35, -0.85], [-0.35, 0.35, -0.85]]
        .map((d) => spike(cone(0.022, 0.09), '#4a3424', [d[0] * 0.07, 0.08 + d[1] * 0.05, -0.02 + d[2] * 0.08], d)),
      part(ball(0.04), '#d8b890', [0, 0.05, 0.09], { s: [0.9, 0.8, 1.2] }),
      part(ball(0.013, 0), '#1a1410', [0, 0.05, 0.14]),
      ...eyes(0.022, 0.07, 0.115, 0.008),
    ),
  },
  camel: {
    gait: 'walk', speed: 0.18, roam: 2.2, rest: [2, 7], sound: 'thud',
    model: () => model(
      part(ball(0.13), '#c89a62', [0, 0.5, 0], { s: [0.75, 0.7, 1.6] }),
      part(ball(0.1), '#c89a62', [0, 0.62, 0.08], { s: [0.9, 1.1, 1] }),
      part(ball(0.1), '#c89a62', [0, 0.62, -0.11], { s: [0.9, 1.1, 1] }),
      ...legs('#b88a56', 0.05, 0.44, 0.06, 0.14),
      part(box(0.07, 0.07, 0.26), '#c89a62', [0, 0.57, 0.28], { rx: -0.9 }),
      part(box(0.09, 0.08, 0.17), '#c89a62', [0, 0.68, 0.4]),
      part(box(0.07, 0.06, 0.04), '#a87a4a', [0, 0.655, 0.49]),
      ...eyes(0.047, 0.7, 0.42),
      part(box(0.02, 0.04, 0.02), '#a87a4a', [-0.035, 0.74, 0.35]),
      part(box(0.02, 0.04, 0.02), '#a87a4a', [0.035, 0.74, 0.35]),
      part(box(0.02, 0.16, 0.02), '#a87a4a', [0, 0.46, -0.21], { rx: 0.2 }),
    ),
  },
  tortoise: {
    gait: 'walk', speed: 0.04, roam: 0.8, rest: [4, 10], sound: 'pop',
    model: () => model(
      part(ball(0.13), '#5e6e34', [0, 0.06, 0], { s: [1, 0.75, 1.15] }),
      ...[[0, 0.16, 0], [0.07, 0.13, 0.06], [-0.07, 0.13, 0.06], [0.07, 0.13, -0.06], [-0.07, 0.13, -0.06], [0, 0.12, 0.1], [0, 0.12, -0.1]]
        .map(([x, y, z]) => part(ball(0.04, 0), '#8a9a4a', [x, y, z], { s: [1, 0.45, 1] })),
      part(new THREE.CylinderGeometry(0.135, 0.14, 0.025, 10), '#4a4428', [0, 0.04, 0], { s: [1, 1, 1.15] }),
      part(ball(0.042), '#9a9060', [0, 0.07, 0.18], { s: [0.9, 0.85, 1.2] }),
      ...eyes(0.022, 0.085, 0.215, 0.008),
      ...legs('#9a9060', 0.05, 0.04, 0.09, 0.09, 0.02),
      part(cone(0.02, 0.05), '#9a9060', [0, 0.04, -0.17], { rx: -Math.PI / 2 }),
    ),
  },
  monkey: {
    gait: 'hop', speed: 0.8, hop: 0.12, roam: 1.6, rest: [0.8, 3], sound: 'chatter',
    model: () => model(
      part(ball(0.08), '#7a4a2a', [0, 0.15, 0], { s: [0.95, 1.15, 0.9] }),
      part(ball(0.065), '#7a4a2a', [0, 0.28, 0.03]),
      part(ball(0.045), '#e0b890', [0, 0.27, 0.075], { s: [1.1, 1, 0.6] }),
      part(ball(0.026), '#e0b890', [-0.07, 0.29, 0.02], { s: [0.5, 1, 1] }),
      part(ball(0.026), '#e0b890', [0.07, 0.29, 0.02], { s: [0.5, 1, 1] }),
      ...eyes(0.02, 0.29, 0.1, 0.01),
      part(box(0.03, 0.13, 0.03), '#7a4a2a', [-0.08, 0.12, 0.03], { rz: 0.2 }),
      part(box(0.03, 0.13, 0.03), '#7a4a2a', [0.08, 0.12, 0.03], { rz: -0.2 }),
      part(box(0.035, 0.08, 0.035), '#7a4a2a', [-0.04, 0.04, 0]),
      part(box(0.035, 0.08, 0.035), '#7a4a2a', [0.04, 0.04, 0]),
      part(box(0.02, 0.16, 0.02), '#7a4a2a', [0, 0.16, -0.1], { rx: -0.5 }),
      part(new THREE.TorusGeometry(0.045, 0.011, 4, 10, Math.PI * 1.5), '#7a4a2a', [0, 0.28, -0.17], { ry: Math.PI / 2 }),
    ),
  },
  peacock: {
    gait: 'walk', speed: 0.18, roam: 1.4, rest: [2, 6], sound: 'squawk',
    model: () => model(
      part(ball(0.07), '#1e5aa8', [0, 0.16, 0.02], { s: [0.9, 1, 1.2] }),
      part(box(0.035, 0.15, 0.035), '#1e5aa8', [0, 0.27, 0.07], { rx: 0.2 }),
      part(ball(0.036), '#1e5aa8', [0, 0.35, 0.09]),
      part(cone(0.012, 0.04), '#d8c8a0', [0, 0.345, 0.135], { rx: Math.PI / 2 }),
      ...eyes(0.025, 0.36, 0.11, 0.007),
      ...[-0.015, 0, 0.015].map((x) => part(box(0.005, 0.05, 0.005), '#2a8a5a', [x, 0.4, 0.08])),
      ...[-0.015, 0, 0.015].map((x) => part(ball(0.011, 0), '#2a8a5a', [x, 0.43, 0.08])),
      // The fan: an upright half-disc behind, with eyes on both faces.
      part(new THREE.CylinderGeometry(0.32, 0.32, 0.012, 18, 1, false, Math.PI / 2 + 0.25, Math.PI - 0.5), '#2a8a5a', [0, 0.14, -0.08], { rx: Math.PI / 2 }),
      ...[[0.27, [-1.2, -0.6, 0, 0.6, 1.2]], [0.16, [-0.9, -0.3, 0.3, 0.9]]].flatMap(([r, angles]) => angles.flatMap((a) => [
        part(ball(0.026, 0), '#e8c040', [r * Math.sin(a), 0.14 + r * Math.cos(a), -0.08], { s: [1, 1, 0.65] }),
        part(ball(0.013, 0), '#1a3a8a', [r * Math.sin(a), 0.14 + r * Math.cos(a), -0.08], { s: [1, 1, 2.2] }),
      ])),
      part(box(0.012, 0.1, 0.012), '#8a7a6a', [-0.025, 0.05, 0.02]),
      part(box(0.012, 0.1, 0.012), '#8a7a6a', [0.025, 0.05, 0.02]),
    ),
  },
  crow: {
    gait: 'hop', speed: 0.6, hop: 0.05, roam: 1.4, rest: [0.6, 2.5], sound: 'caw',
    model: () => model(
      part(ball(0.06), '#1c1c22', [0, 0.1, 0], { s: [0.85, 0.9, 1.35] }),
      part(ball(0.042), '#1c1c22', [0, 0.165, 0.07]),
      part(cone(0.015, 0.065), '#2e2e36', [0, 0.16, 0.13], { rx: Math.PI / 2 }),
      part(box(0.05, 0.015, 0.1), '#1c1c22', [0, 0.11, -0.1], { rx: 0.25 }),
      part(box(0.015, 0.05, 0.11), '#26262e', [-0.05, 0.11, -0.01]),
      part(box(0.015, 0.05, 0.11), '#26262e', [0.05, 0.11, -0.01]),
      ...eyes(0.026, 0.175, 0.095, 0.007, '#d8d0b8'),
      part(box(0.01, 0.05, 0.01), '#2e2e36', [-0.02, 0.025, 0]),
      part(box(0.01, 0.05, 0.01), '#2e2e36', [0.02, 0.025, 0]),
    ),
  },
  seal: {
    gait: 'walk', waddle: true, speed: 0.1, roam: 1.2, rest: [3, 9], sound: 'arf',
    model: (coat = '#8a9098') => model(
      part(ball(0.11), coat, [0, 0.09, 0], { s: [1, 0.8, 1.7] }),
      part(ball(0.07), coat, [0, 0.17, 0.15]),
      part(ball(0.032), coat, [0, 0.155, 0.21], { s: [1.2, 0.8, 1] }),
      part(ball(0.012, 0), '#1a1a1a', [0, 0.163, 0.25]),
      ...eyes(0.035, 0.193, 0.208, 0.016),
      part(box(0.09, 0.015, 0.05), coat, [-0.1, 0.03, 0.08], { rz: 0.3, ry: 0.4 }),
      part(box(0.09, 0.015, 0.05), coat, [0.1, 0.03, 0.08], { rz: -0.3, ry: -0.4 }),
      part(box(0.11, 0.012, 0.05), coat, [0, 0.02, -0.2]),
    ),
  },
  flamingo: {
    gait: 'walk', speed: 0.15, roam: 1.2, rest: [3, 8], sound: 'squawk',
    model: () => model(
      part(ball(0.075), '#f08aa0', [0, 0.42, 0], { s: [0.85, 0.8, 1.35] }),
      part(box(0.035, 0.03, 0.07), '#e87890', [0, 0.4, -0.11]),
      part(box(0.024, 0.15, 0.024), '#f08aa0', [0, 0.51, 0.07], { rx: -0.35 }),
      part(box(0.024, 0.13, 0.024), '#f08aa0', [0, 0.63, 0.06], { rx: 0.4 }),
      part(ball(0.032), '#f08aa0', [0, 0.7, 0.09]),
      part(box(0.02, 0.02, 0.06), '#f4f0e8', [0, 0.69, 0.13], { rx: 0.5 }),
      part(ball(0.014, 0), '#2a2422', [0, 0.674, 0.158]),
      ...eyes(0.026, 0.71, 0.1, 0.007),
      // On one leg, the other folded up.
      part(box(0.013, 0.36, 0.013), '#e87890', [0, 0.18, 0]),
      part(box(0.013, 0.12, 0.013), '#e87890', [0.02, 0.32, -0.03]),
      part(box(0.013, 0.1, 0.013), '#e87890', [0.02, 0.28, 0.03], { rx: 1.2 }),
    ),
  },
  unicorn: {
    gait: 'walk', speed: 0.25, roam: 2.4, rest: [2, 6], sound: 'chime',
    model: () => model(
      part(box(0.16, 0.16, 0.36), '#f8f6fa', [0, 0.42, 0]),
      ...legs('#f8f6fa', 0.045, 0.34, 0.055, 0.13),
      ...legs('#e8c860', 0.065, 0.05, 0.055, 0.13, 0.018),
      part(box(0.08, 0.2, 0.09), '#f8f6fa', [0, 0.56, 0.17], { rx: 0.45 }),
      part(box(0.08, 0.08, 0.17), '#f8f6fa', [0, 0.66, 0.26], { rx: 0.25 }),
      part(cone(0.016, 0.14, 6), '#f0d060', [0, 0.76, 0.29], { rx: 0.5 }),
      part(cone(0.014, 0.04), '#f8f6fa', [-0.03, 0.72, 0.22]),
      part(cone(0.014, 0.04), '#f8f6fa', [0.03, 0.72, 0.22]),
      ...eyes(0.042, 0.68, 0.29, 0.01),
      ...[['#f6a8c8', 0.69, 0.18], ['#c8b0f4', 0.63, 0.14], ['#a8d8f4', 0.57, 0.1], ['#b8f0c8', 0.51, 0.07]].map(([c, y, z]) => part(ball(0.04, 0), c, [0, y, z])),
      ...[['#f6a8c8', 0.46, -0.2], ['#c8b0f4', 0.39, -0.23], ['#a8d8f4', 0.32, -0.24]].map(([c, y, z]) => part(ball(0.04, 0), c, [0, y, z])),
    ),
  },
  // Brass, with a key in its back.
  mouse: {
    gait: 'walk', speed: 0.5, roam: 1.4, rest: [0.6, 2.5], sound: 'tick', material: { metalness: 0.7, roughness: 0.35 },
    model: () => model(
      part(ball(0.06), '#c8a050', [0, 0.05, 0], { s: [0.9, 0.8, 1.4] }),
      part(cone(0.035, 0.07, 6), '#c8a050', [0, 0.05, 0.1], { rx: Math.PI / 2 }),
      part(ball(0.011, 0), '#2a2422', [0, 0.05, 0.14]),
      ...eyes(0.025, 0.07, 0.08, 0.008),
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10), '#b08a40', [-0.035, 0.1, 0.05], { rx: Math.PI / 2 }),
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10), '#b08a40', [0.035, 0.1, 0.05], { rx: Math.PI / 2 }),
      part(box(0.008, 0.05, 0.008), '#8a7a6a', [0, 0.11, -0.01]),
      part(new THREE.TorusGeometry(0.022, 0.006, 4, 10), '#8a7a6a', [0, 0.15, -0.01]),
      part(box(0.006, 0.006, 0.12), '#8a7a6a', [0, 0.03, -0.13]),
    ),
  },
});

// Su and Chel, the two legendary dogs: a curly little poodle cross, nose first (+z),
// with floppy ears and a plumed tail. Su is a white and apricot cavapoo, Chel a
// whole apricot cockapoo. Very rarely one of them turns up on a land (buildLife).
function dog(kind) {
  const su = kind === 'su';
  const coat = su ? '#f6f1ea' : '#e2a062';
  const ears = su ? '#e3a066' : '#c98245';
  const dark = '#241c18';
  const curls = [[0.07, 0.25, 0.06], [-0.07, 0.24, -0.05], [0.06, 0.22, -0.11], [-0.06, 0.27, 0.09], [0, 0.29, -0.08]]
    .map(([x, y, z]) => part(ball(0.055, 0), coat, [x, y, z]));
  return model(
    part(ball(0.12), coat, [0, 0.21, 0], { s: [0.85, 0.8, 1.35] }),
    ...curls,
    part(ball(0.08), coat, [0, 0.23, 0.12]),
    part(ball(0.085), coat, [0, 0.34, 0.19]),
    part(ball(0.046), coat, [0, 0.315, 0.27], { s: [1, 0.8, 1.1] }),
    part(ball(0.017, 0), dark, [0, 0.325, 0.315]),
    part(ball(0.014, 0), dark, [-0.039, 0.363, 0.266]),
    part(ball(0.014, 0), dark, [0.039, 0.363, 0.266]),
    part(ball(0.046), ears, [-0.078, 0.3, 0.18], { s: [0.6, 1.55, 0.85] }),
    part(ball(0.046), ears, [0.078, 0.3, 0.18], { s: [0.6, 1.55, 0.85] }),
    // Su's apricot saddle and the patch round one eye.
    ...(su ? [part(ball(0.075), ears, [0.02, 0.29, -0.04], { s: [1.1, 0.42, 1.25] }), part(ball(0.032), ears, [0.036, 0.37, 0.235])] : []),
    ...legs(coat, 0.055, 0.15, 0.058, 0.09),
    part(ball(0.045), su ? coat : ears, [0, 0.31, -0.17], { s: [0.8, 1.45, 0.8], rx: -0.6 }),
  );
}
// The dogs are friendly: tapped, they bounce where they are instead of running off.
CRITTERS.su = { gait: 'walk', speed: 0.55, roam: 3, rest: [0.6, 2.4], sound: 'woof', friendly: true, model: () => dog('su') };
CRITTERS.chel = { gait: 'walk', speed: 0.55, roam: 3, rest: [0.6, 2.4], sound: 'woof', friendly: true, model: () => dog('chel') };
export const CRITTER_KINDS = Object.keys(CRITTERS);
// One animal on its own (Wa's balloon carries the dogs this way).
export function critterModel(kind, coat) {
  const mesh = new THREE.Mesh(CRITTERS[kind].model(coat), material(CRITTERS[kind].material));
  mesh.castShadow = true;
  return mesh;
}

// Who lives where (the older animals are below, in buildLife): [kind, fewest, most, coat].
// New kinds go at the end of a list, so the ones before them keep their draws.
const NEIGHBOURS = {
  meadow: [['sheep', 2, 5], ['cow', 1, 2]], blossom: [['squirrel', 1, 3], ['peacock', 1, 2]], autumn: [['squirrel', 3, 5], ['hedgehog', 1, 2]],
  highlands: [['goat', 2, 4], ['alpaca', 1, 3]], desert: [['lizard', 3, 5, '#c8a46a'], ['camel', 1, 2]], snowfield: [['penguin', 3, 6], ['seal', 1, 3]],
  dream: [['unicorn', 1, 2]],
  heath: [['sheep', 3, 5], ['hedgehog', 1, 2]], lavender: [['sheep', 2, 4]], cloudisle: [['sheep', 3, 5, '#ffffff'], ['alpaca', 2, 3, '#ffffff']],
  stormcrag: [['goat', 2, 4], ['crow', 1, 2]], terraces: [['goat', 1, 3], ['alpaca', 1, 2, '#a8784e'], ['hen', 2, 3]], ember: [['lizard', 2, 4, '#c8462a']],
  savanna: [['giraffe', 2, 3], ['lizard', 1, 2, '#b89a5a'], ['tortoise', 1, 2]], mire: [['frog', 3, 6], ['tortoise', 1, 2]],
  jungle: [['frog', 3, 5, '#3ac85a'], ['monkey', 2, 4]], toadstool: [['snail', 3, 5], ['frog', 1, 3]], bamboo: [['panda', 1, 3], ['frog', 2, 3]],
  coral: [['crab', 4, 7], ['flamingo', 2, 3]], giant: [['snail', 2, 4], ['tortoise', 1, 1]],
  gilded: [['peacock', 2, 3]], withered: [['crow', 3, 5]], wreck: [['crow', 2, 3]], icefall: [['seal', 2, 4, '#f2f2ee']],
  whale: [['seal', 1, 2]], orchard: [['hen', 3, 5], ['hedgehog', 1, 2]], clockwork: [['mouse', 3, 5]],
  maze: [['peacock', 1, 2]], sugar: [['unicorn', 1, 2]],
  ...Object.fromEntries(Object.entries(ISLANDS).map(([id, island]) => [id, island.neighbours ?? []])),
};

// One kind of creature, wandering between nearby spots.
function buildCritters({ kind, spots, shape, r, count, coat, sound, note }) {
  const spec = CRITTERS[kind];
  if (!count || spots.length < 8) return null;
  const mesh = new THREE.InstancedMesh(spec.model(coat), material(spec.material), count);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const crowd = Array.from({ length: count }, () => {
    const home = r.pick(spots);
    const heading = r.range(0, TAU);
    return { x: home.x, z: home.z, home, heading, aim: heading, moving: false, flee: 0, rest: r.range(...spec.rest), phase: r.range(0, TAU), target: null };
  });
  const nearby = (c) => {
    for (let k = 0; k < 10; k++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      if (Math.hypot(s.x - c.home.x, s.z - c.home.z) < spec.roam) return s;
    }
    return c.home;
  };
  const go = (c, x, z) => {
    c.target = { x, z };
    c.aim = Math.atan2(x - c.x, z - c.z);
    c.moving = true;
  };
  mesh.userData.onClick = (hit) => {
    const c = crowd[hit.instanceId];
    if (!c) return;
    if (spec.friendly) {
      c.moving = false;
      c.happy = 1.2;
      c.rest = Math.max(c.rest, 1.6);
      sound(spec.sound);
      note(kind);
      return;
    }
    const away = Math.atan2(c.x - hit.point.x, c.z - hit.point.z) + (Math.random() - 0.5) * 0.8;
    go(c, c.x + Math.sin(away) * 1.4, c.z + Math.cos(away) * 1.4);
    c.flee = 1.4;
    sound(spec.sound);
    note(kind);
  };
  return {
    object: mesh,
    clickables: [mesh],
    update(t, dt) {
      crowd.forEach((c, i) => {
        let lift = 0, roll = 0, pitch = 0;
        if (c.moving) {
          // Turn smoothly toward where it's going (never snap, never spin).
          const turn = Math.atan2(Math.sin(c.aim - c.heading), Math.cos(c.aim - c.heading));
          c.heading += turn * Math.min(1, dt * 6);
          const speed = spec.speed * (c.flee > 0 ? 3 : 1);
          c.phase += dt * speed * (spec.gait === 'hop' ? 28 : 22);
          const d = Math.hypot(c.target.x - c.x, c.target.z - c.z);
          const s = Math.min(d, speed * dt);
          const x1 = c.x + Math.sin(c.aim) * s, z1 = c.z + Math.cos(c.aim) * s;
          if (shape.isWet(x1, z1, 0.2) || shape.radial(x1, z1) > 0.92 || d < 0.03) {
            // Blocked, or there: stop and rest (a new place is picked after).
            c.moving = false;
            c.rest = spec.rest[0] + Math.random() * (spec.rest[1] - spec.rest[0]);
          } else {
            c.x = x1;
            c.z = z1;
          }
          if (spec.gait === 'hop') lift = Math.abs(Math.sin(c.phase * 0.5)) * spec.hop;
          else lift = Math.abs(Math.sin(c.phase)) * 0.012;
          if (spec.waddle) roll = Math.sin(c.phase) * 0.18;
        } else if (c.happy > 0) {
          // Bouncing on the spot, wagging all over.
          c.happy -= dt;
          lift = Math.abs(Math.sin(c.happy * 14)) * 0.06;
          roll = Math.sin(c.happy * 24) * 0.12;
        } else if ((c.rest -= dt) <= 0) {
          const s = nearby(c);
          go(c, s.x, s.z);
        } else {
          pitch = Math.max(0, Math.sin(t * 2 + i * 1.7)) * 0.12; // grazing, sniffing, looking about
        }
        c.flee = Math.max(0, c.flee - dt);
        const yaw = c.heading + (spec.sideways ? Math.PI / 2 : 0);
        _q.setFromAxisAngle(UP, yaw).multiply(_q2.setFromEuler(_e.set(pitch, 0, roll)));
        mesh.setMatrixAt(i, _m.compose(_p.set(c.x, shape.heightAt(c.x, c.z) - 0.02 + lift, c.z), _q, _s.setScalar(1)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function buildLife({ top, shape, biome, biomeKey, blocked, bursts, r, fauna, dog: legend, dogs, water, waterLevel, sound, note }) {
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
  // The newer neighbours draw from their own stream, so the animals above stay put.
  for (const [kind, fewest, most, coat] of NEIGHBOURS[biomeKey] ?? []) {
    add(buildCritters({ kind, spots, shape, r: fauna, count: fauna.int(fewest, most), coat, sound, note }));
  }
  // And, very rarely, Su or Chel (world.js decides which, on its own stream).
  if (legend) add(buildCritters({ kind: legend, spots, shape, r: dogs, count: 1, sound, note }));

  return {
    object: group,
    clickables,
    fish,
    update(t, dt, env) {
      for (const update of updaters) update(t, dt, env);
    },
  };
}
