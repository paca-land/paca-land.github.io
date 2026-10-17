import * as THREE from 'three';
import { softDot } from './sky.js';

// Little bursts of particles: leaves shaken loose, splashes, sparks, dust.
// Two pools, one ordinary and one glowing (additive, picked up by the bloom).
export function createBursts(max = 360) {
  const group = new THREE.Group();
  const pools = [false, true].map((glow) => {
    const positions = new Float32Array(max * 3).fill(-999);
    const colors = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: glow ? 0.13 : 0.1, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    points.frustumCulled = false;
    group.add(points);
    return { geo, positions, colors, parts: [], next: 0, active: 0 };
  });
  const tmp = new THREE.Color();

  return {
    object: group,

    spawn(at, { count = 16, colors = ['#ffffff'], speed = 1, up = 1, gravity = -4, life = 1.2, drag = 1.5, spread = 0.15, glow = false } = {}) {
      const pool = pools[glow ? 1 : 0];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
        pool.parts[pool.next] = {
          x: at.x + (Math.random() - 0.5) * spread, y: at.y + (Math.random() - 0.5) * spread, z: at.z + (Math.random() - 0.5) * spread,
          vx: Math.cos(a) * s, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * s,
          age: 0, life: life * (0.6 + Math.random() * 0.6), gravity, drag,
          color: tmp.set(colors[i % colors.length]).clone().multiplyScalar(glow ? 2.5 : 1),
          sway: Math.random() * 6,
        };
        pool.next = (pool.next + 1) % max;
      }
      pool.active = max;
    },

    update(t, dt) {
      for (const pool of pools) {
        if (!pool.active) continue;
        let alive = 0;
        pool.parts.forEach((p, i) => {
          if (!p) return;
          p.age += dt;
          if (p.age > p.life) {
            pool.positions[i * 3 + 1] = -999;
            pool.parts[i] = null;
            return;
          }
          alive++;
          const damp = Math.exp(-p.drag * dt);
          p.vx *= damp;
          p.vz *= damp;
          p.vy = p.vy * damp + p.gravity * dt;
          p.x += (p.vx + Math.sin(t * 3 + p.sway) * 0.15) * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const fade = 1 - (p.age / p.life) ** 2;
          pool.positions.set([p.x, p.y, p.z], i * 3);
          pool.colors.set([p.color.r * fade, p.color.g * fade, p.color.b * fade], i * 3);
        });
        pool.active = alive;
        pool.geo.attributes.position.needsUpdate = true;
        pool.geo.attributes.color.needsUpdate = true;
      }
    },
  };
}

// Turns taps and clicks on the canvas into calls on whatever was hit, without
// getting in the way of dragging the camera around. Anything clickable carries
// a `userData.onClick(hit)` somewhere up its parent chain.
export function createInteraction(canvas, camera, getTargets, { onClick, onDoubleClick } = {}) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObjects(getTargets(), true)) {
      let target = hit.object;
      while (target && !target.userData.onClick) target = target.parent;
      if (target) return { hit, target };
    }
    return null;
  }

  // Touch screens don't reliably send dblclick, so double-taps are spotted here.
  let lastTap = null, touching = false;
  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY, t: performance.now() };
    touching = event.pointerType === 'touch';
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const still = Math.hypot(event.clientX - down.x, event.clientY - down.y) < (touching ? 10 : 6) && performance.now() - down.t < 450;
    down = null;
    if (!still) return;
    const picked = pick(event);
    if (picked) picked.target.userData.onClick(picked.hit);
    onClick?.(picked);
    if (!touching) return;
    const now = performance.now();
    if (lastTap && now - lastTap.t < 320 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
      lastTap = null;
      onDoubleClick?.(picked);
    } else {
      lastTap = { t: now, x: event.clientX, y: event.clientY };
    }
  });
  canvas.addEventListener('dblclick', (event) => {
    if (!touching) onDoubleClick?.(pick(event));
  });

  // Show a pointer over things that react, checked at most once a frame.
  let hoverEvent = null;
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && !event.buttons) hoverEvent = event;
  });
  return {
    update() {
      if (!hoverEvent) return;
      canvas.classList.toggle('can-click', Boolean(pick(hoverEvent)));
      hoverEvent = null;
    },
  };
}
