import * as THREE from 'three';
import { critterModel } from './life.js';

// Wa's balloon, which carries you on a voyage. It lives in the scene rather
// than on a land, so it can cast off from one island, ride out the flight and
// tie up at the next. It wears the voyage: a tear for every heart lost (gone
// again once mended), a burner that burns low with the fuel, and a little
// lamp on the basket for each lantern. Nobody is drawn in the basket (that's you),
// except Su and Chel, once they're aboard, with their noses over the rim.

const TEAL = new THREE.Color('#2b7a8c'), CREAM = new THREE.Color('#f2e6c8'), GOLD = new THREE.Color('#e2ae48');
// It never crosses an island: it travels on a ring outside every rim (the
// widest are about 12.6 from the middle) and above the islets (whose tops reach
// about 4.5), rides out a flight there, goes round to its side of the next
// island, and only comes in to tie up once that island has nearly finished
// rising. (Flying straight at its spot, it met the island growing up through it.)
const RING = 14, RING_Y = 5.5;
// Where it drops in from at the start of a voyage, and sails off to at the end.
const DROP_IN = 14;
const AWAY = new THREE.Vector3(0, 40, 0);
const MOUTH = 1.25; // height of the envelope's mouth above the basket floor
// The envelope's outline, from the mouth up (radius, height above the mouth).
const PROFILE = [[0.3, 0], [0.55, 0.35], [0.95, 0.85], [1.28, 1.45], [1.38, 1.95], [1.3, 2.45], [1.05, 2.85], [0.6, 3.12], [0, 3.22]];
// Where the tears go, as [angle, height above the mouth].
const TEARS = [[0.5, 2.05], [2.7, 1.55], [4.4, 2.45], [1.7, 2.75]];

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const onRing = (a, out) => out.set(Math.cos(a) * RING, RING_Y, Math.sin(a) * RING);
const radiusAt = (y) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i];
    if (y <= y1) return THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
  }
  return 0;
};
// Smooth damping: eases off from rest and settles without overshooting, the
// same at any frame rate. `time` is roughly how long it takes to get there.
function damp(pos, vel, target, time, dt) {
  const omega = 2 / time, x = omega * dt;
  const k = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (const axis of ['x', 'y', 'z']) {
    const change = pos[axis] - target[axis];
    const temp = (vel[axis] + omega * change) * dt;
    vel[axis] = (vel[axis] - omega * temp) * k;
    pos[axis] = target[axis] + (change + temp) * k;
  }
}
const m = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

function buildEnvelope() {
  const geo = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 12).toNonIndexed();
  const pos = geo.attributes.position;
  const colors = [];
  // Teal and cream gores, with a gold band round the widest part.
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const gore = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12) % 2;
    const c = y > 1.6 && y < 2.2 ? GOLD : gore ? TEAL : CREAM;
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const material = m('#ffffff', { vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, emissive: '#ff9a50', emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = MOUTH;
  mesh.castShadow = true;
  return mesh;
}

export function createWaBalloon({ onTap } = {}) {
  const object = new THREE.Group();
  const rig = new THREE.Group();
  object.add(rig);

  const envelope = buildEnvelope();
  rig.add(envelope);
  const tearMat = m('#3b2a22', { side: THREE.DoubleSide });
  const tears = TEARS.map(([a, y]) => {
    const tear = new THREE.Mesh(new THREE.CircleGeometry(0.2, 5), tearMat);
    const r = radiusAt(y) * 1.03;
    tear.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    tear.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    tear.rotateZ(a);
    tear.scale.set(1, 0.6, 1);
    tear.visible = false;
    envelope.add(tear);
    return tear;
  });

  const wicker = m('#9a6a3c'), rim = m('#5a4030'), rope = m('#6b5338');
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.56).translate(0, 0.21, 0), wicker);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.62).translate(0, 0.42, 0), rim);
  basket.castShadow = lip.castShadow = true;
  rig.add(basket, lip);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of corners) {
    // A rope from each corner of the basket up to the mouth of the envelope.
    const from = new THREE.Vector3(sx * 0.26, 0.42, sz * 0.26), to = new THREE.Vector3(sx * 0.21, MOUTH, sz * 0.21);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 3).translate(0, 0.5, 0), rope);
    line.position.copy(from);
    line.scale.y = from.distanceTo(to);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    rig.add(line);
  }
  const flameMat = m('#ff9a3c', { emissive: '#ff7a1a', emissiveIntensity: 3 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 5).translate(0, 0.22, 0), flameMat);
  flame.position.y = 0.55;
  rig.add(flame);
  const lampMat = m('#fff1c0', { emissive: '#ffcf6a', emissiveIntensity: 2.4 });
  const lamps = corners.slice(0, 3).map(([sx, sz]) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.09), lampMat);
    lamp.position.set(sx * 0.36, 0.22, sz * 0.36);
    lamp.visible = false;
    rig.add(lamp);
    return lamp;
  });

  // The dogs, if they're aboard: standing on the basket floor, heads over the rim.
  const dogs = { su: critterModel('su'), chel: critterModel('chel') };
  dogs.su.position.set(-0.12, 0.13, 0.08);
  dogs.chel.position.set(0.13, 0.13, 0.04);
  dogs.chel.rotation.y = 0.5;
  dogs.su.rotation.y = -0.3;
  for (const dog of Object.values(dogs)) {
    dog.visible = false;
    rig.add(dog);
  }

  // The rope that ties it to the island, and the stake it's tied to.
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 4).translate(0, 0.5, 0), rope);
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 5).translate(0, 0.25, 0), rim);
  tether.visible = stake.visible = false;
  object.add(tether, stake);

  // `away` (not in the sky), `moored` (tied to `land`, or on its way down to
  // it), `flying` (riding out the change of islands) or `leaving` (off up and
  // away when a voyage ends).
  let mode = 'away';
  let land = null;
  const pos = AWAY.clone(), vel = new THREE.Vector3(), target = new THREE.Vector3();
  const moor = new THREE.Vector3(), tie = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  let flare = 0, jolt = 0, lastHull = null, sag = 1, narrow = false;
  object.visible = false;
  rig.userData.onClick = () => {
    flare = 1;
    onTap?.();
  };

  // Where it ties up. On a narrow screen (a phone held upright) the island spans
  // the width, so it comes in over the rim, high enough to clear the trees, or
  // it would hang half off the screen whenever its side of the island faced you.
  const close = { x: 0, y: 0, z: 0 };
  function spot() {
    const m = land.mooring;
    if (!narrow) return m;
    const k = Math.max(0, 1 - 1.6 / Math.hypot(m.x, m.z));
    return Object.assign(close, { x: m.x * k, y: m.y + 1.8, z: m.z * k });
  }

  // A point on the land, wherever the land is in its rise.
  function onLand(p, out) {
    const g = land.group, s = g.scale.x, c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
    return out.set(s * (c * p.x + sn * p.z), g.position.y + s * p.y, s * (-sn * p.x + c * p.z));
  }

  return {
    object,
    get clickables() {
      return mode === 'moored' ? [rig] : [];
    },
    // Ties up at a land (coming down from wherever it is), or appears there at once.
    moorTo(next, { snap = false } = {}) {
      land = next;
      // At the start of a voyage it drops in from above, on its own side.
      if (mode === 'away') {
        const s = spot(), a = Math.atan2(s.z, s.x);
        pos.set(Math.cos(a) * RING, DROP_IN, Math.sin(a) * RING);
      }
      mode = 'moored';
      object.visible = true;
      if (snap) {
        pos.copy(onLand(spot(), moor));
        vel.set(0, 0, 0);
      }
    },
    // Casts off for the next island; true if it was tied up somewhere.
    castOff() {
      if (mode !== 'moored') return false;
      mode = 'flying';
      land = null;
      flare = 1;
      return true;
    },
    // The voyage is over: up and away.
    leave() {
      if (mode === 'away') return;
      mode = 'leaving';
      land = null;
      flare = 1;
      lastHull = null; // the next voyage starts afresh
    },
    // `settle` is how far the land has risen (0 to 1); `gear` is voyage.gear();
    // `tight`: the screen is narrow (see spot).
    update(t, dt, gear, settle, tight = false) {
      narrow = tight;
      if (mode === 'away') return;
      const here = Math.atan2(pos.z, pos.x);
      let ease = 0.5; // roughly how long it takes to get where it's going
      if (mode === 'moored') {
        const s = spot(), turn = wrap(Math.atan2(s.z, s.x) - here);
        onLand(s, moor);
        // Round the ring to its side, waiting there while the island rises; then
        // in and down to where its spot will be once the island is still.
        if (Math.abs(turn) > 0.12 || settle < 0.8) {
          onRing(here + THREE.MathUtils.clamp(turn, -0.45, 0.45), target);
          // Going round, it follows closely: about 1.8 radians a second.
          if (Math.abs(turn) > 0.12) ease = 0.25;
        } else target.set(s.x, s.y, s.z);
      } else if (mode === 'flying') onRing(here, target);
      else target.copy(AWAY);

      damp(pos, vel, target, ease, dt);
      if (mode === 'leaving' && pos.y > AWAY.y - 12) {
        mode = 'away';
        object.visible = false;
        return;
      }

      if (gear) {
        if (lastHull !== null && gear.hull < lastHull) jolt = 1;
        lastHull = gear.hull;
        const lost = THREE.MathUtils.clamp(gear.maxHull - gear.hull, 0, tears.length);
        tears.forEach((tear, i) => (tear.visible = i < lost));
        lamps.forEach((lamp, i) => (lamp.visible = i < gear.lanterns));
        for (const [id, dog] of Object.entries(dogs)) {
          dog.visible = gear.dogs.includes(id);
          // Looking about as the world goes by.
          dog.rotation.y = (id === 'su' ? -0.3 : 0.5) + Math.sin(t * 0.7 + (id === 'su' ? 0 : 2)) * 0.5;
        }
        // On its last heart, the envelope sags.
        sag += ((gear.hull <= 1 ? 0.9 : 1) - sag) * Math.min(1, dt * 2);
        envelope.scale.y = sag;
      }
      flare *= Math.exp(-dt * 1.5);
      jolt *= Math.exp(-dt * 2.5);
      const burn = Math.max(flare, THREE.MathUtils.clamp(vel.y * 0.35, 0, 1));
      const fuel = gear ? THREE.MathUtils.clamp(gear.fuel / 8, 0, 1) : 1;
      const flicker = 0.75 + Math.abs(Math.sin(t * 9) * Math.sin(t * 13.7)) * 0.5;
      flame.scale.set(1 + burn * 0.6, (0.2 + fuel * 0.8) * flicker * (1 + burn * 1.8), 1 + burn * 0.6);
      envelope.material.emissiveIntensity = burn * 0.35;

      // Bobbing, leaning into the way it's going, a slow turn, and a shake when it's hurt.
      rig.position.copy(pos);
      rig.position.y += Math.sin(t * 0.9) * 0.12;
      rig.rotation.set(
        THREE.MathUtils.clamp(vel.z * 0.05, -0.25, 0.25) + Math.sin(t * 19) * 0.1 * jolt,
        t * 0.08,
        THREE.MathUtils.clamp(-vel.x * 0.05, -0.25, 0.25) + Math.sin(t * 23) * 0.15 * jolt,
      );

      // Tied up once it's down beside a land that has finished rising.
      const tied = mode === 'moored' && settle >= 1 && pos.distanceTo(moor) < 0.6;
      tether.visible = stake.visible = tied;
      if (tied) {
        onLand(land.mooring.stake, tie);
        stake.position.copy(tie);
        tie.y += 0.4;
        tether.position.copy(tie);
        dir.subVectors(rig.position, tie);
        tether.scale.y = dir.length();
        tether.quaternion.setFromUnitVectors(up, dir.normalize());
      }
    },
  };
}
