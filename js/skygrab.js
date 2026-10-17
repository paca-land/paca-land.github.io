import * as THREE from 'three';
import { newSkyState } from './conditions.js';

// Where the sun and moon sit on the sky (see sky.js: the dome and the moon mesh).
const SUN_R = 500, MOON_R = 420;

// Grab the sun (or, after dark, the moon) and drag it across the sky to set the
// time. It slides along its own path, like a bead on a wire, to whichever
// moment puts it closest to the pointer.
// `state` is the live sky (sun and moon directions), `skyAt(hours, out)` the
// sky at any hour, `hours()` the time now.
// `enabled()` can switch it off (on a voyage, time is part of the game).
export function createSkyGrab(canvas, camera, { sky, state, skyAt, hours, label, onGrab, onDrag, onRelease, enabled = () => true }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(), v = new THREE.Vector3();
  const probe = newSkyState();
  const tag = document.createElement('div');
  tag.className = 'sky-tag';
  tag.hidden = true;
  // When the sun or moon is out of frame (high at midday, say), a handle on the
  // edge of the screen points to it, and dragging the handle drags it.
  const handle = document.createElement('div');
  handle.className = 'sky-handle';
  handle.hidden = true;
  handle.setAttribute('aria-hidden', 'true');
  handle.innerHTML = '<svg viewBox="0 0 24 24"><g class="sun"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></g><path class="moon" d="M15.5 4.5a8 8 0 1 0 4 12.5 6.5 6.5 0 0 1-4-12.5z"/></svg>';
  document.body.append(tag, handle);

  let held = null; // { kind, pointerId, hours }
  let pointer = null; // the held pointer, or a hovering mouse
  let hover = null;
  let grabbedAt = -Infinity;
  let glow = 0, glowKind = 'sun';

  // The key light swaps from sun to moon at the same height (sky.js).
  const activeBody = () => (state.sunDir.y > -0.04 ? 'sun' : 'moon');
  const worldPoint = (kind, s, out) => out.copy(kind === 'sun' ? s.sunDir : s.moonDir).multiplyScalar(kind === 'sun' ? SUN_R : MOON_R);

  const aboveHorizon = (kind) => (kind === 'sun' ? state.sunDir : state.moonDir).y > -0.05;

  // Keep the handle on the screen's edge, in the direction of the body.
  function placeHandle() {
    if (!enabled()) {
      handle.hidden = true;
      return;
    }
    const kind = activeBody();
    const rect = canvas.getBoundingClientRect();
    worldPoint(kind, state, v).project(camera);
    const onScreen = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
    handle.hidden = onScreen || !aboveHorizon(kind);
    if (handle.hidden) return;
    worldPoint(kind, state, v).applyMatrix4(camera.matrixWorldInverse);
    const m = 30, hw = rect.width / 2 - m, hh = rect.height / 2 - m;
    const s = Math.min(hw / Math.max(Math.abs(v.x), 1e-6), hh / Math.max(Math.abs(v.y), 1e-6));
    handle.dataset.body = kind;
    handle.style.transform = `translate(${rect.left + rect.width / 2 + v.x * s}px, ${rect.top + rect.height / 2 - v.y * s}px)`;
  }

  function bodyAt(x, y, touch) {
    const kind = activeBody();
    if (!aboveHorizon(kind)) return null;
    worldPoint(kind, state, v).project(camera);
    if (v.z > 1) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width, sy = rect.top + (0.5 - v.y * 0.5) * rect.height;
    return Math.hypot(sx - x, sy - y) < (touch ? 56 : 40) ? kind : null;
  }

  function rayAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  }

  // Search near the current time (coarse, then fine) so the body slides rather than jumps.
  function nearestHours(kind, ray, from) {
    let best = from, score = -2;
    for (const [span, step] of [[6, 1 / 12], [1 / 12, 1 / 240]]) {
      const center = best;
      for (let h = center - span; h <= center + span + 1e-9; h += step) {
        const s = worldPoint(kind, skyAt(((h % 24) + 24) % 24, probe), v).sub(ray.origin).normalize().dot(ray.direction);
        if (s > score) {
          score = s;
          best = h;
        }
      }
    }
    return ((best % 24) + 24) % 24;
  }

  function release(event) {
    if (!held || event.pointerId !== held.pointerId) return;
    event.stopImmediatePropagation();
    held = null;
    pointer = null;
    tag.hidden = true;
    onRelease();
  }

  // Capture on the window, so the camera controls and taps never see a grab.
  addEventListener('pointerdown', (event) => {
    if (!enabled()) return;
    if (event.target !== canvas && event.target.closest?.('.sky-handle') !== handle) return;
    if (held) {
      event.stopImmediatePropagation(); // one finger on the sun at a time
      return;
    }
    const onHandle = event.target !== canvas;
    const kind = event.isPrimary && (onHandle ? activeBody() : bodyAt(event.clientX, event.clientY, event.pointerType !== 'mouse'));
    if (!kind) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    try {
      (onHandle ? handle : canvas).setPointerCapture(event.pointerId);
    } catch {
      // A pointer that's already gone can't be captured; the drag still works over the page.
    }
    held = { kind, pointerId: event.pointerId, hours: hours() };
    pointer = { x: event.clientX, y: event.clientY };
    grabbedAt = performance.now();
    onGrab();
  }, { capture: true });
  addEventListener('pointermove', (event) => {
    if (held ? event.pointerId === held.pointerId : event.pointerType === 'mouse' && !event.buttons && event.target === canvas) {
      pointer = { x: event.clientX, y: event.clientY };
    }
  }, { capture: true });
  addEventListener('pointerup', release, { capture: true });
  addEventListener('pointercancel', release, { capture: true });
  canvas.addEventListener('pointerleave', () => {
    if (!held) pointer = null;
  });
  // Double-clicking the sun shouldn't also pull the camera back.
  addEventListener('dblclick', (event) => {
    if (event.target === canvas && performance.now() - grabbedAt < 600) event.stopImmediatePropagation();
  }, { capture: true });

  return {
    get held() {
      return Boolean(held);
    },

    update(dt) {
      if (held) {
        const next = nearestHours(held.kind, rayAt(pointer.x, pointer.y), held.hours);
        if (next !== held.hours) {
          held.hours = next;
          onDrag(next);
        }
        tag.textContent = label(next);
        tag.style.transform = `translate(${pointer.x + 18}px, ${pointer.y - 34}px)`;
        tag.hidden = false;
      }
      placeHandle();
      hover = held || !enabled() ? null : pointer && bodyAt(pointer.x, pointer.y, false);
      canvas.classList.toggle('can-grab', Boolean(hover));
      // The sun or moon swells a little under the mouse, and more while held.
      const kind = held?.kind ?? hover ?? glowKind;
      if (kind !== glowKind) {
        sky.setGrab(glowKind, 0);
        glowKind = kind;
        glow = 0;
      }
      glow += ((held ? 1 : hover ? 0.5 : 0) - glow) * Math.min(1, dt * 10);
      sky.setGrab(glowKind, glow);
    },
  };
}
