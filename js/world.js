import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRandom, createNoise2D, fbm, landName } from './random.js';
import { softDot, skyUniforms, SKY_GLSL, createPuffMesh } from './sky.js';
import { fxUniforms, patchMaterial } from './effects.js';
import { createBursts } from './interact.js';
import {
  makeMaterials, updateMaterials, buildLandmark, planPath, buildLanterns, planFields,
  buildDock, buildProps, buildLightPools, buildBirds, buildBalloon,
} from './landmarks.js';

const TAU = Math.PI * 2;
const RADIUS = 10;
const RINGS = 26;
const EDGE_HEIGHT = 0.9;
const WATER_LEVEL = 0.55;

const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const BIOMES = {
  meadow: {
    label: 'meadow', weight: 3,
    grass: ['#5a9f45', '#8cc160'], dirt: '#8a6440', rock: ['#8a857c', '#68635c'], sand: '#e0cf94',
    hills: 2.4, peak: 1.4,
    water: { color: '#3d9bd6', opacity: 0.84 }, lake: 0.85, river: 0.75,
    flora: { kind: 'round', count: 55, groves: 0.12, colors: ['#3e8f39', '#56a743', '#2f7d34', '#6cb84c'] },
    tufts: ['#ffffff', '#ffd84a', '#ff86b0', '#b896ff'],
    landmark: [['cabin', 3], ['windmill', 3], ['village', 2], ['castle', 2], ['campsite', 2], ['ruins', 1], ['lighthouse', 1], ['stones', 1]], path: '#b8996a',
    weather: [['clear', 4], ['cloudy', 3], ['rain', 2], ['mist', 1], ['storm', 1]],
    ambient: ['fireflies'],
  },
  highlands: {
    label: 'highlands', weight: 2,
    grass: ['#4f9a5a', '#86b47c'], dirt: '#6e5a45', rock: ['#8d8f94', '#66686e'], sand: '#cfc6a8',
    hills: 1.8, peak: 4.4, snowLine: 3.4,
    water: { color: '#2f86b8', opacity: 0.86 }, lake: 0.7, river: 0.85,
    flora: { kind: 'pine', count: 95, groves: -0.15, colors: ['#2d6b45', '#376f4a', '#24583a'] },
    tufts: ['#ffffff', '#c9d7ff'],
    landmark: [['castle', 3], ['cabin', 2], ['campsite', 2], ['wizard', 1], ['lighthouse', 1], ['stones', 1]], path: '#a08a6a',
    weather: [['clear', 3], ['cloudy', 3], ['snow', 2], ['mist', 2], ['storm', 1]],
    ambient: [],
  },
  autumn: {
    label: 'autumn woods', weight: 2,
    grass: ['#9c9a4a', '#c4a65a'], dirt: '#7a5232', rock: ['#8a7f73', '#675e55'], sand: '#d8c290',
    hills: 2.2, peak: 1.2,
    water: { color: '#4a8fb0', opacity: 0.85 }, lake: 0.8, river: 0.6,
    flora: { kind: 'round', count: 80, groves: -0.2, colors: ['#d9622b', '#e8a33a', '#b8402a', '#f0c75a', '#9c3d2c'] },
    tufts: ['#d9622b', '#e8a33a', '#b8402a'],
    landmark: [['cabin', 3], ['village', 2], ['windmill', 2], ['campsite', 2], ['castle', 1], ['wizard', 1]], path: '#a98455',
    weather: [['clear', 3], ['cloudy', 3], ['rain', 2], ['mist', 2], ['storm', 1]],
    ambient: ['leaves', 'fireflies'],
  },
  desert: {
    label: 'desert mesa', weight: 1.5,
    grass: ['#e2b478', '#eec68c'], dirt: '#b86b3c', rock: ['#c4733f', '#9a5530'], sand: '#f2dca4',
    hills: 2.0, peak: 2.8, terrace: 0.9,
    water: { color: '#36b5c6', opacity: 0.86 }, lake: 0.45, river: 0,
    flora: { kind: 'cactus', count: 24, groves: -1, colors: ['#5d9a4a', '#4c8a40', '#6aa857'] },
    tufts: ['#9a8a4a', '#b39b5a', '#ff7aa0'],
    landmark: [['ruins', 3], ['stones', 2], ['campsite', 2], ['castle', 1]], path: '#e8cf9a',
    weather: [['clear', 7], ['cloudy', 1], ['mist', 1]],
    ambient: [],
  },
  snowfield: {
    label: 'snowfield', weight: 1.5,
    grass: ['#e6eef4', '#ffffff'], dirt: '#8f8a86', rock: ['#9aa3ad', '#77808b'], sand: '#dfe8ee',
    hills: 2.0, peak: 2.8,
    water: { color: '#bfe3f2', opacity: 0.96, frozen: true }, lake: 0.7, river: 0,
    flora: { kind: 'pine', count: 50, groves: -0.1, colors: ['#2e5a4c', '#3a6a58', '#294f44'] },
    tufts: ['#ffffff'],
    landmark: [['cabin', 3], ['castle', 2], ['campsite', 1], ['lighthouse', 1], ['wizard', 1]], path: '#cfd8e0',
    weather: [['snow', 5], ['clear', 2], ['cloudy', 2], ['mist', 1]],
    ambient: [],
  },
  blossom: {
    label: 'blossom vale', weight: 1.5,
    grass: ['#78bd66', '#a6d982'], dirt: '#80603f', rock: ['#8f8a86', '#6e6966'], sand: '#e8d6a6',
    hills: 2.1, peak: 1.6,
    water: { color: '#58b2dc', opacity: 0.84 }, lake: 0.85, river: 0.7,
    flora: { kind: 'round', count: 50, groves: 0.1, colors: ['#f7b6c8', '#f49ab5', '#fbd3df', '#ee86a6'] },
    tufts: ['#ffffff', '#ffd1df'],
    landmark: [['shrine', 4], ['village', 2], ['cabin', 1], ['windmill', 1]], path: '#c9a97a',
    weather: [['clear', 4], ['cloudy', 2], ['rain', 1], ['mist', 1]],
    ambient: ['petals', 'fireflies'],
  },
  dream: {
    label: 'dreamland', weight: 1,
    grass: ['#9a8ce0', '#c4b6f6'], dirt: '#6b5a9a', rock: ['#7c76a8', '#5d5888'], sand: '#f3c6e0',
    hills: 2.0, peak: 2.2,
    water: { color: '#5ef0d2', opacity: 0.8 }, lake: 0.85, river: 0.7,
    flora: { kind: 'round', count: 55, groves: 0, colors: ['#5ee0c8', '#7af0da', '#ff9ad5', '#ffd36e'] },
    tufts: ['#ffffff', '#ffd36e', '#7af0da'],
    crystals: true,
    landmark: [['wizard', 4], ['stones', 2], ['castle', 1], ['ruins', 1]], path: '#e8d0f2',
    weather: [['clear', 3], ['mist', 2], ['cloudy', 1]],
    ambient: ['sparkles'],
  },
};

const SNOW = new THREE.Color('#f4f7fb');

function tintBiome(b, r) {
  const hue = r.range(-0.025, 0.025), light = r.range(-0.035, 0.035);
  const shift = (hex) => new THREE.Color(hex).offsetHSL(hue, 0, light);
  const plain = (hex) => new THREE.Color(hex);
  return {
    ...b,
    grass: b.grass.map(shift),
    dirt: plain(b.dirt),
    rock: b.rock.map(plain),
    sand: plain(b.sand),
    flora: { ...b.flora, colors: b.flora.colors.map(shift) },
    tufts: b.tufts.map(plain),
    path: plain(b.path),
    water: { ...b.water, color: plain(b.water.color) },
  };
}

// The land's shape as pure functions of position, so meshes, trees and
// water all agree on where the ground is.
function makeShape(seed, biome) {
  const r = makeRandom(seed, 'shape');
  const coast = createNoise2D(r);
  const terrain = createNoise2D(r);
  const detail = createNoise2D(r);
  const coastAmp = r.range(0.12, 0.26);
  const coastFreq = r.range(0.9, 1.6);
  const edgeScale = (a) => 1 + coastAmp * fbm(coast, Math.cos(a) * coastFreq, Math.sin(a) * coastFreq, 3);

  const peakAngle = r.range(0, TAU);
  const peakDist = r.range(0, 0.4) * RADIUS;
  const peak = { x: Math.cos(peakAngle) * peakDist, z: Math.sin(peakAngle) * peakDist, size: r.range(2.6, 4.2) };
  // Some character: flatter or hillier lands, a second summit, or ledges.
  const hillsScale = r.range(0.65, 1.35);
  const twinAngle = peakAngle + (r.chance(0.5) ? 1 : -1) * Math.PI / 2, twinDist = r.range(0.2, 0.45) * RADIUS;
  const twin = r.chance(0.3) ? { x: Math.cos(twinAngle) * twinDist, z: Math.sin(twinAngle) * twinDist, size: r.range(1.8, 3), h: r.range(0.5, 0.9) } : null;
  const ledges = !biome.terrace && r.chance(0.18) ? r.range(1.0, 1.4) : 0;

  let lake = null, river = null;
  if (r.chance(biome.lake)) {
    // Keep water away from the mountain so they don't fight for space.
    const a = peakAngle + Math.PI + r.range(-0.8, 0.8);
    const d = r.range(0.22, 0.36) * RADIUS * edgeScale(a);
    lake = { x: Math.cos(a) * d, z: Math.sin(a) * d, radius: r.range(1.5, 2.3), depth: r.range(0.5, 0.9) };
    if (r.chance(biome.river)) river = { angle: a, dx: Math.cos(a), dz: Math.sin(a), width: 0.6 };
  }

  const radial = (x, z) => Math.hypot(x, z) / (RADIUS * edgeScale(Math.atan2(z, x)));

  function heightAt(x, z) {
    const inland = smoothstep(1.0, 0.5, radial(x, z));
    let h = EDGE_HEIGHT + inland * (fbm(terrain, x * 0.11, z * 0.11, 4) * 0.5 + 0.5) * biome.hills * hillsScale;
    if (biome.peak) {
      const dp = Math.hypot(x - peak.x, z - peak.z) / peak.size;
      const ridge = 1 - Math.abs(fbm(detail, x * 0.25, z * 0.25, 3));
      h += inland * biome.peak * Math.exp(-dp * dp) * (0.55 + 0.45 * ridge);
    }
    if (twin) {
      const dt = Math.hypot(x - twin.x, z - twin.z) / twin.size;
      h += inland * biome.peak * twin.h * Math.exp(-dt * dt);
    }
    const step = biome.terrace || ledges;
    if (step) {
      // Mesas and ledges: flat tops with steep risers, and only a little roughness on top.
      const k = h / step;
      h = (Math.floor(k) + smoothstep(biome.terrace ? 0.7 : 0.6, 1, k - Math.floor(k))) * step;
    }
    h += fbm(detail, x * 0.6, z * 0.6, 2) * (step ? 0.04 : 0.12);
    if (lake) {
      const d = Math.hypot(x - lake.x, z - lake.z);
      h = Math.min(h, d < lake.radius
        ? WATER_LEVEL - lake.depth * (1 - (d / lake.radius) ** 2)
        : WATER_LEVEL + (d - lake.radius) * 0.9);
    }
    if (river) {
      const px = x - lake.x, pz = z - lake.z;
      if (px * river.dx + pz * river.dz > 0) {
        const off = Math.abs(px * river.dz - pz * river.dx);
        h = Math.min(h, off < river.width
          ? WATER_LEVEL - 0.3 * (1 - (off / river.width) ** 2)
          : WATER_LEVEL + (off - river.width) * 1.1);
      }
    }
    return h;
  }

  function isWet(x, z, margin = 0) {
    if (!lake) return false;
    if (Math.hypot(x - lake.x, z - lake.z) < lake.radius + margin) return true;
    if (!river) return false;
    const px = x - lake.x, pz = z - lake.z;
    return px * river.dx + pz * river.dz > 0 && Math.abs(px * river.dz - pz * river.dx) < river.width + margin;
  }

  function slopeAt(x, z) {
    const e = 0.25;
    return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  }

  return { edgeScale, heightAt, isWet, slopeAt, radial, lake, river, peak };
}

// Stitch two closed rings of vertices into a band of triangles, walking both
// by angle so triangles stay close to equilateral even when counts differ.
function stitch(inner, outer, out) {
  const m = inner.length, n = outer.length;
  const angIn = (k) => inner[k % m].a + TAU * Math.floor(k / m);
  const angOut = (k) => outer[k % n].a + TAU * Math.floor(k / n);
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (j >= n || (i < m && angIn(i + 1) < angOut(j + 1))) {
      if (m > 1) out.push([inner[i % m], inner[(i + 1) % m], outer[j % n]]);
      i++;
    } else {
      if (n > 1) out.push([inner[i % m], outer[(j + 1) % n], outer[j % n]]);
      j++;
    }
  }
}

function faceNormal([a, b, c], out) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  return out.set(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx).normalize();
}

// Top surface: a unit disc of rings (6k vertices on ring k), jittered, then
// stretched to the coastline and lifted to the terrain height.
function buildTop(shape, r) {
  const rings = [[{ a: 0, r: 0 }]];
  for (let k = 1; k <= RINGS; k++) {
    const count = 6 * k, step = TAU / count, offset = r() * step;
    const edge = k === RINGS;
    const ring = [];
    for (let i = 0; i < count; i++) {
      ring.push({
        a: offset + i * step + (edge ? 0 : (r() - 0.5) * 0.5 * step),
        r: (k + (edge ? 0 : (r() - 0.5) * 0.45)) / RINGS,
      });
    }
    rings.push(ring);
  }
  for (const ring of rings) {
    for (const v of ring) {
      const s = RADIUS * v.r * shape.edgeScale(v.a);
      v.x = Math.cos(v.a) * s;
      v.z = Math.sin(v.a) * s;
      v.y = shape.heightAt(v.x, v.z);
    }
  }
  const tris = [];
  for (let k = 1; k <= RINGS; k++) stitch(rings[k - 1], rings[k], tris);
  const n = new THREE.Vector3();
  for (const tri of tris) {
    if (faceNormal(tri, n).y < 0) [tri[1], tri[2]] = [tri[2], tri[1]];
  }
  return { rings, tris };
}

// Underside: rings shrinking from the coastline down to a rocky tip.
function buildUnderside(top, shape, r) {
  const noise = createNoise2D(r);
  const depth = r.range(7.5, 10.5);
  const tilt = { x: r.range(-1.5, 1.5), z: r.range(-1.5, 1.5) };
  const LEVELS = 8;
  const rings = [top.rings[RINGS]];
  for (let j = 1; j < LEVELS; j++) {
    const s = (j - 1) / (LEVELS - 1);
    const count = Math.max(6, Math.round(RINGS * 6 * (1 - s * 0.85)));
    const step = TAU / count, offset = r() * step;
    const ring = [];
    for (let i = 0; i < count; i++) {
      const a = offset + i * step + (r() - 0.5) * 0.4 * step;
      const edgeR = RADIUS * shape.edgeScale(a);
      let y, rad;
      if (j === 1) {
        // The cliff lip: a short drop of soil just under the grass.
        y = shape.heightAt(Math.cos(a) * edgeR, Math.sin(a) * edgeR) - r.range(0.5, 0.9);
        rad = 0.94 * (1 + 0.03 * noise(Math.cos(a) * 2, Math.sin(a) * 2));
      } else {
        y = -0.2 - depth * s ** 0.9 + (r() - 0.5) * 0.5;
        rad = 0.94 * (1 - s ** 1.5) * (1 + 0.2 * noise(Math.cos(a) * 1.7 + j * 0.9, Math.sin(a) * 1.7 - j * 0.6));
      }
      rad = Math.min(rad, 0.95);
      // The lip sits in the shade of the grass overhang.
      ring.push({ a, x: tilt.x * s * s + Math.cos(a) * edgeR * rad, y, z: tilt.z * s * s + Math.sin(a) * edgeR * rad, ao: j === 1 ? 0.72 : 1 });
    }
    rings.push(ring);
  }
  rings.push([{ a: 0, x: tilt.x, y: -0.2 - depth - 0.6, z: tilt.z }]);

  const tris = [];
  for (let j = 1; j < rings.length; j++) stitch(rings[j - 1], rings[j], tris);
  const n = new THREE.Vector3();
  for (const tri of tris) {
    faceNormal(tri, n);
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cy = (tri[0].y + tri[1].y + tri[2].y) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3;
    const s = THREE.MathUtils.clamp((-0.2 - cy) / depth, 0, 1);
    const outward = n.x * (cx - tilt.x * s * s) + n.z * (cz - tilt.z * s * s) - n.y * 0.6;
    if (outward < 0) [tri[1], tri[2]] = [tri[2], tri[1]];
  }
  return { tris, depth };
}

// Bake soft ambient occlusion into the ground: hollows, the feet of slopes
// and the ground under trees see less of the sky.
function bakeOcclusion(top, shape, trees, landmark) {
  const DIRS = 6;
  for (const ring of top.rings) {
    for (const v of ring) {
      let occlusion = 0;
      for (let k = 0; k < DIRS; k++) {
        const a = (k / DIRS) * TAU + 0.3;
        let rise = 0;
        for (const d of [0.6, 1.6]) {
          rise = Math.max(rise, (shape.heightAt(v.x + Math.cos(a) * d, v.z + Math.sin(a) * d) - v.y) / d);
        }
        occlusion += rise / Math.hypot(1, rise);
      }
      let ao = 1 - 0.6 * (occlusion / DIRS);
      for (const t of trees) {
        const d = Math.hypot(t.x - v.x, t.z - v.z);
        if (d < 1) ao *= 0.62 + 0.38 * d;
      }
      if (landmark && Math.hypot(landmark.x - v.x, landmark.z - v.z) < 1.3) ao *= 0.85;
      v.ao = Math.max(ao, 0.35);
    }
  }
}

function buildIslandMesh(top, under, shape, biome, r, overlay) {
  const patches = createNoise2D(r);
  const bands = createNoise2D(r);
  const positions = [], colors = [];
  const n = new THREE.Vector3(), col = new THREE.Color();

  const emit = (tri, paint) => {
    faceNormal(tri, n);
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cy = (tri[0].y + tri[1].y + tri[2].y) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3;
    paint(cx, cy, cz);
    col.offsetHSL(0, 0, (r() - 0.5) * 0.035);
    for (const v of tri) {
      const ao = v.ao ?? 1;
      positions.push(v.x, v.y, v.z);
      colors.push(col.r * ao, col.g * ao, col.b * ao);
    }
  };

  for (const tri of top.tris) {
    emit(tri, (x, y, z) => {
      const patch = patches(x * 0.2, z * 0.2);
      const painted = overlay(x, y, z);
      if (painted) col.copy(painted);
      else if (shape.lake && y < WATER_LEVEL + 0.22 && shape.isWet(x, z, 0.9)) col.copy(biome.sand);
      else if (n.y < 0.66) col.copy(biome.rock[0]).lerp(biome.rock[1], r());
      else if (biome.snowLine && y > biome.snowLine + patch * 0.5) col.copy(SNOW);
      else col.copy(biome.grass[0]).lerp(biome.grass[1], smoothstep(-0.5, 0.6, patch * 0.7 + (y - EDGE_HEIGHT) * 0.15));
    });
  }
  for (const tri of under.tris) {
    emit(tri, (x, y, z) => {
      if (y > 0.05) col.copy(biome.dirt);
      else col.copy(biome.rock[0]).lerp(biome.rock[1], Math.sin(y * 2.2 + bands(x * 0.3, z * 0.3) * 1.5) * 0.5 + 0.5);
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// A tileable ripple normal map, generated once from layered periodic value noise.
let rippleTexture;
function rippleNormals() {
  if (rippleTexture) return rippleTexture;
  const S = 256;
  const r = makeRandom('pacaland-water', 'ripples');
  const heights = new Float32Array(S * S);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (const [period, amp] of [[8, 1], [16, 0.5], [32, 0.25], [64, 0.12]]) {
    const lattice = Float32Array.from({ length: period * period }, () => r());
    const at = (i, j) => lattice[(j % period) * period + (i % period)];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const fx = (x / S) * period, fy = (y / S) * period;
        const i = Math.floor(fx), j = Math.floor(fy);
        const u = fade(fx - i), v = fade(fy - j);
        const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
        heights[y * S + x] += amp * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
      }
    }
  }
  const h = (x, y) => heights[((y + S) % S) * S + ((x + S) % S)];
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 6;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 6;
      const len = Math.hypot(dx, dy, 1);
      data.set([(-dx / len * 0.5 + 0.5) * 255, (-dy / len * 0.5 + 0.5) * 255, (0.5 / len + 0.5) * 255, 255], (y * S + x) * 4);
    }
  }
  rippleTexture = new THREE.DataTexture(data, S, S);
  rippleTexture.wrapS = rippleTexture.wrapT = THREE.RepeatWrapping;
  rippleTexture.minFilter = THREE.LinearMipmapLinearFilter;
  rippleTexture.magFilter = THREE.LinearFilter;
  rippleTexture.generateMipmaps = true;
  rippleTexture.needsUpdate = true;
  return rippleTexture;
}

const WATER_VERTEX = /* glsl */ `
  attribute float aDepth;
  attribute vec2 aFlow;
  uniform float uTime;
  uniform vec4 uClicks[4];
  varying float vDepth;
  varying vec2 vFlow;
  varying vec3 vWorldP;
  #include <common>
  #include <fog_pars_vertex>
  #include <shadowmap_pars_vertex>
  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    // A small wave rolling out from each tap, settling as it spreads.
    for (int i = 0; i < 4; i++) {
      vec4 c = uClicks[i];
      float age = uTime - c.z;
      if (age < 0.0 || age > 5.0) continue;
      float w = length(position.xz - c.xy) - age * 1.3;
      transformed.y += c.w * 0.07 * exp(-age * 0.9) * exp(-w * w * 4.0) * cos(w * 7.0);
    }
    #include <project_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>
    vDepth = aDepth;
    vFlow = aFlow;
    vWorldP = (modelMatrix * vec4(position, 1.0)).xyz;
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uRipples;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uKeyDir;
  uniform vec3 uKeyColor;
  uniform vec3 uAmbient;
  uniform float uRain;
  uniform float uSnow;
  uniform vec4 uClicks[4];
  varying float vDepth;
  varying vec2 vFlow;
  varying vec3 vWorldP;
  #include <common>
  #include <packing>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  ${SKY_GLSL}

  // Two offset layers take turns, so flowing water never smears.
  vec2 ripple(vec2 p, vec2 flow) {
    float phase = fract(uTime * 0.2);
    float w = 1.0 - abs(phase * 2.0 - 1.0);
    vec2 drift = vec2(0.021, 0.013) * uTime;
    vec2 a = texture2D(uRipples, p + drift - flow * phase).xy;
    vec2 b = texture2D(uRipples, p + drift - flow * fract(phase + 0.5) + 0.5).xy;
    return mix(b, a, w) * 2.0 - 1.0;
  }

  // Rings from raindrops: one drop per cell, each on its own clock.
  vec2 raindrops(vec2 p) {
    vec2 cell = floor(p);
    float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 d = fract(p) - (vec2(fract(h * 17.3), fract(h * 31.7)) * 0.6 + 0.2);
    float t = fract(uTime * 1.1 + h);
    float len = length(d) + 1e-4;
    float w = len - t * 0.35;
    return d / len * cos(w * 70.0) * exp(-w * w * 900.0) * (1.0 - t);
  }

  void main() {
    vec2 p = vWorldP.xz;
    float ice = smoothstep(0.55, 0.95, uSnow);
    vec2 slope = ripple(p * 0.3, vFlow * 1.5) + ripple(p * 0.85 + 3.7, vFlow * 2.5) * 0.6;
    slope *= (1.0 + uRain * 0.6) * (1.0 - ice * 0.9);
    slope += (raindrops(p * 2.2) + raindrops(p * 2.2 + 17.0)) * uRain * (1.0 - ice) * 1.2;
    // Rings spreading from where the water was tapped.
    for (int i = 0; i < 4; i++) {
      vec4 c = uClicks[i];
      float age = uTime - c.z;
      if (age < 0.0 || age > 5.0) continue;
      vec2 d = p - c.xy;
      float len = length(d) + 1e-4;
      float w = len - age * 1.3;
      float wave = c.w * 0.07 * exp(-age * 0.9);
      float dh = wave * exp(-w * w * 4.0) * (-7.0 * sin(w * 7.0) - 8.0 * w * cos(w * 7.0));
      slope -= d / len * dh * 6.0 * (1.0 - ice);
      float fine = len - age * 1.1;
      slope += d / len * cos(fine * 22.0) * exp(-age * 0.8) * exp(-fine * fine * 14.0) * c.w * 0.6 * (1.0 - ice);
    }
    vec3 N = normalize(vec3(slope.x * 0.45, 1.0, slope.y * 0.45));
    vec3 V = normalize(cameraPosition - vWorldP);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float shadow = getShadowMask();
    float depth = max(vDepth, 0.0);
    float deep = 1.0 - exp(-depth * 2.8);

    vec3 body = mix(uShallow, uDeep, deep) * (uAmbient + uKeyColor * max(dot(N, uKeyDir), 0.0) * shadow * 0.3);
    vec3 col = mix(body, skyColor(R, 0.0), fresnel);
    float sparkle = max(dot(R, uKeyDir), 0.0);
    col += uKeyColor * (pow(sparkle, 700.0) * 3.0 + pow(sparkle, 60.0) * 0.12) * shadow;

    // Foam where the water laps at the shore.
    float foamNoise = texture2D(uRipples, p * 1.3 + uTime * 0.03).x;
    float foam = smoothstep(0.1, 0.0, depth + (foamNoise - 0.5) * 0.12);
    col = mix(col, uAmbient * 1.6 + uKeyColor * 0.35 * shadow, foam * 0.75 * (1.0 - ice));

    // A long snowfall freezes the water over, dusted with snow.
    vec3 iceColor = vec3(0.78, 0.88, 0.95) * (uAmbient * 1.4 + uKeyColor * 0.35 * shadow);
    float dusting = smoothstep(0.45, 0.7, texture2D(uRipples, p * 0.35).z);
    col = mix(col, mix(iceColor, uAmbient * 1.8 + uKeyColor * 0.45 * shadow, dusting * 0.6), ice * 0.9);

    float alpha = clamp(mix(0.4, 0.94, deep) + fresnel * 0.5 + foam * 0.6, 0.0, 1.0);
    gl_FragColor = vec4(col, mix(alpha, 0.97, ice));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function buildWater(top, shape, biome) {
  const { lake, river } = shape;
  if (!lake) return null;
  const positions = [], normals = [], depths = [], flows = [];
  // Depth comes straight from the terrain vertex below, so the shallows and
  // the shoreline line up exactly with the ground.
  const sample = (v) => {
    let k = 0;
    if (river) {
      const px = v.x - lake.x, pz = v.z - lake.z;
      const along = px * river.dx + pz * river.dz;
      const off = Math.abs(px * river.dz - pz * river.dx);
      k = smoothstep(lake.radius * 0.5, lake.radius * 1.1, along) * smoothstep(river.width + 0.8, river.width * 0.5, off) * 0.9;
    }
    return [v.x, v.z, WATER_LEVEL - v.y, river ? river.dx * k : 0, river ? river.dz * k : 0];
  };
  const emit = (...verts) => {
    for (const [x, z, depth, fx, fz] of verts) {
      positions.push(x, WATER_LEVEL, z);
      normals.push(0, 1, 0);
      depths.push(depth);
      flows.push(fx, fz);
    }
  };
  // Split each triangle into a 3×3 grid of smaller ones, so a wave can bend the surface.
  const N = 3;
  for (const tri of top.tris) {
    if (Math.min(tri[0].y, tri[1].y, tri[2].y) >= WATER_LEVEL - 0.005) continue;
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3;
    if (!shape.isWet(cx, cz, 0.6)) continue;
    const [a, b, c] = tri.map(sample);
    const at = (i, j) => a.map((_, k) => a[k] * (1 - (i + j) / N) + b[k] * (i / N) + c[k] * (j / N));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N - i; j++) {
        emit(at(i, j), at(i + 1, j), at(i, j + 1));
        if (i + j < N - 1) emit(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));
  geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(flows, 2));

  const { color, frozen } = biome.water;
  if (frozen) {
    const ice = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.92 }));
    ice.receiveShadow = true;
    return ice;
  }

  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog, {
    uTime: { value: 0 },
    uRipples: { value: null },
    uDeep: { value: color.clone().multiplyScalar(0.28) },
    uShallow: { value: color.clone().lerp(biome.sand, 0.35).multiplyScalar(1.1) },
  }]);
  uniforms.uRipples.value = rippleNormals();
  uniforms.uRain = fxUniforms.uRain;
  uniforms.uSnow = fxUniforms.uSnow;
  uniforms.uClicks = { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)) };
  let nextClick = 0;
  for (const name of ['uTop', 'uHorizon', 'uBottom', 'uGlow', 'uSunColor', 'uSunDir', 'uSunVisible', 'uKeyDir', 'uKeyColor', 'uAmbient']) {
    uniforms[name] = skyUniforms[name];
  }
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms, vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT, lights: true, fog: true, transparent: true,
  }));
  mesh.receiveShadow = true;
  return {
    mesh,
    ripple(x, z, t) {
      uniforms.uClicks.value[nextClick].set(x, z, t, 1.6);
      nextClick = (nextClick + 1) % 4;
    },
    update(t, dt, env) {
      uniforms.uTime.value = t;
      // Lakes swell a little in the rain.
      mesh.position.y = env.wet * 0.06;
    },
  };
}

const FALL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const FALL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform sampler2D uRipples;
  uniform vec3 uKeyColor;
  uniform vec3 uAmbient;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    float a = texture2D(uRipples, vec2(vUv.x * 1.6, vUv.y * 0.45 + uTime * 0.55)).x;
    float b = texture2D(uRipples, vec2(vUv.x * 3.1 + 0.37, vUv.y * 0.8 + uTime * 0.9)).y;
    float streak = smoothstep(0.38, 0.72, a * 0.55 + b * 0.45);
    float sides = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float fade = smoothstep(0.0, 0.75, vUv.y);
    float lip = smoothstep(0.9, 1.0, vUv.y);
    vec3 white = clamp(vec3(streak * 0.75 + lip * 0.6 + (1.0 - fade) * 0.4), 0.0, 1.0);
    vec3 col = mix(uColor, vec3(1.0), white) * (uAmbient * 1.3 + uKeyColor * 0.25);
    gl_FragColor = vec4(col, sides * fade * (0.4 + streak * 0.5 + lip * 0.3));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

// Where the river meets the coast it pours off the edge and turns to mist.
function buildWaterfall(shape, biome, r) {
  const { river } = shape;
  if (!river) return null;
  const edgeR = RADIUS * shape.edgeScale(river.angle);
  const group = new THREE.Group();
  group.position.set(river.dx * (edgeR + 0.05), WATER_LEVEL + 0.02, river.dz * (edgeR + 0.05));
  group.rotation.y = Math.atan2(river.dx, river.dz);

  const H = 7, W = river.width * 2.2;
  const geo = new THREE.PlaneGeometry(W, H, 1, 18);
  geo.translate(0, -H / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, 1.4 * (-pos.getY(i) / H) ** 1.8 + 0.05);
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 },
    uRipples: { value: rippleNormals() },
    uColor: { value: biome.water.color.clone().lerp(new THREE.Color('#ffffff'), 0.35) },
    uKeyColor: skyUniforms.uKeyColor,
    uAmbient: skyUniforms.uAmbient,
  };
  group.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms, vertexShader: FALL_VERTEX, fragmentShader: FALL_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  })));

  const mist = createPuffMesh(Array.from({ length: 10 }, (_, i) => ({
    x: r.range(-0.9, 0.9) * W, y: r.range(-0.6, 0.8), z: r.range(-0.5, 0.6),
    size: r.range(0.8, 1.5), rot: r.range(0, TAU), shade: r.range(0.6, 1), cell: i % 4,
  })), 0.4);
  mist.position.set(0, -H + 0.9, 1.45);
  group.add(mist);

  const N = 90;
  const drops = Array.from({ length: N }, (_, i) => ({ lat: (Math.random() - 0.5) * W, life: i / N, out: 0.4 + Math.random() * 0.6 }));
  const dropPos = new Float32Array(N * 3);
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
  const points = new THREE.Points(dropGeo, new THREE.PointsMaterial({
    color: '#ffffff', size: 0.1, map: softDot(), transparent: true, opacity: 0.7, depthWrite: false,
  }));
  points.frustumCulled = false;
  group.add(points);

  return {
    object: group,
    update(t, dt, env) {
      uniforms.uTime.value = t;
      mist.rotation.y += dt * 0.12;
      mist.material.uniforms.uOpacity.value = 0.4 + env.wet * 0.35;
      points.material.color.setScalar(1 - env.night * 0.75 - env.overcast * 0.25);
      drops.forEach((d, i) => {
        d.life += dt * 0.45;
        if (d.life > 1) Object.assign(d, { life: 0, lat: (Math.random() - 0.5) * W, out: 0.4 + Math.random() * 0.6 });
        const tau = d.life * 1.25;
        dropPos.set([d.lat, -4.9 * tau * tau, 0.1 + d.out * tau], i * 3);
      });
      dropGeo.attributes.position.needsUpdate = true;
    },
  };
}

// Darken the lower part of a geometry: a cheap stand-in for self-shadowing.
function shadeByHeight(geo, dark) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / (max.y - min.y);
    colors.fill(dark + (1 - dark) * t ** 0.8, i * 3, i * 3 + 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function treeGeometries(kind) {
  const { trunk, crown } = rawTreeGeometries(kind);
  return { trunk: trunk && shadeByHeight(trunk, 0.55), crown: shadeByHeight(crown, kind === 'cactus' ? 0.7 : 0.45) };
}

function rawTreeGeometries(kind) {
  if (kind === 'pine') {
    return {
      trunk: new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5).translate(0, 0.25, 0),
      crown: mergeGeometries([
        new THREE.ConeGeometry(0.5, 0.8, 6).translate(0, 0.75, 0),
        new THREE.ConeGeometry(0.38, 0.65, 6).translate(0, 1.1, 0),
        new THREE.ConeGeometry(0.25, 0.5, 6).translate(0, 1.42, 0),
      ]),
    };
  }
  if (kind === 'cactus') {
    return {
      trunk: null,
      crown: mergeGeometries([
        new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6).translate(0, 0.55, 0),
        new THREE.CylinderGeometry(0.07, 0.07, 0.3, 5).rotateZ(Math.PI / 2).translate(0.2, 0.45, 0),
        new THREE.CylinderGeometry(0.07, 0.07, 0.35, 5).translate(0.33, 0.62, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.25, 5).rotateZ(Math.PI / 2).translate(-0.18, 0.7, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.28, 5).translate(-0.29, 0.84, 0),
      ]),
    };
  }
  return {
    trunk: new THREE.CylinderGeometry(0.07, 0.11, 0.7, 5).translate(0, 0.35, 0),
    crown: new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.98, 0),
  };
}

// Candidate ground spots: real mesh vertices, so nothing ever floats.
function groundSpots(top, r) {
  const spots = [];
  for (let k = 2; k < RINGS - 1; k++) spots.push(...top.rings[k]);
  return r.shuffle(spots);
}

function placeFlora(top, shape, biome, r, blocked) {
  const noise = createNoise2D(r);
  const { count, groves } = biome.flora;
  const placed = [];
  for (const v of groundSpots(top, r)) {
    if (placed.length >= count) break;
    if (shape.isWet(v.x, v.z, 0.35) || shape.slopeAt(v.x, v.z) > 0.6) continue;
    if (biome.snowLine && v.y > biome.snowLine - 0.4) continue;
    if (noise(v.x * 0.18, v.z * 0.18) < groves) continue;
    if (blocked(v.x, v.z)) continue;
    if (placed.some((p) => (p.x - v.x) ** 2 + (p.z - v.z) ** 2 < 0.7)) continue;
    placed.push(v);
  }
  return placed;
}

function buildFlora(placed, biome, r) {
  const { kind, colors } = biome.flora;
  const group = new THREE.Group();
  if (!placed.length) return group;

  const geos = treeGeometries(kind);
  const crown = new THREE.InstancedMesh(geos.crown, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), placed.length);
  const trunk = geos.trunk && new THREE.InstancedMesh(geos.trunk, new THREE.MeshStandardMaterial({ color: '#6b4a2f', vertexColors: true, flatShading: true, roughness: 1 }), placed.length);
  crown.material.userData.wind = true;
  if (trunk) trunk.material.userData.wind = true;
  const m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const poses = placed.map((v, i) => {
    const size = r.range(0.75, 1.35);
    const pose = {
      p: new THREE.Vector3(v.x, v.y - 0.05, v.z),
      q: new THREE.Quaternion().setFromAxisAngle(up, r.range(0, TAU)),
      s: new THREE.Vector3(size, size * r.range(0.9, 1.25), size),
    };
    m.compose(pose.p, pose.q, pose.s);
    crown.setMatrixAt(i, m);
    crown.setColorAt(i, c.copy(r.pick(colors)).offsetHSL(0, 0, (r() - 0.5) * 0.06));
    trunk?.setMatrixAt(i, m);
    return pose;
  });
  for (const mesh of [crown, trunk]) {
    if (!mesh) continue;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }

  const shakes = new Map();
  const tilt = new THREE.Quaternion();
  return {
    object: group,
    meshes: [crown, trunk].filter(Boolean),
    shake(i, t) {
      shakes.set(i, { t, axis: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize() });
    },
    crownTop(i) {
      return poses[i].p.clone().add(new THREE.Vector3(0, poses[i].s.y, 0));
    },
    crownColor(i) {
      const color = new THREE.Color();
      crown.getColorAt(i, color);
      return color;
    },
    update(t) {
      if (!shakes.size) return;
      for (const [i, shake] of shakes) {
        const age = t - shake.t, pose = poses[i];
        const angle = age > 1.4 ? 0 : Math.sin(age * 26) * 0.16 * (1 - age / 1.4) ** 2;
        m.compose(pose.p, tilt.setFromAxisAngle(shake.axis, angle).multiply(pose.q), pose.s);
        crown.setMatrixAt(i, m);
        trunk?.setMatrixAt(i, m);
        if (age > 1.4) shakes.delete(i);
      }
      crown.instanceMatrix.needsUpdate = true;
      if (trunk) trunk.instanceMatrix.needsUpdate = true;
    },
  };
}

// Flowers you plant by tapping the ground; they pop up with a little bounce.
function buildGarden(biome) {
  const MAX = 60;
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.22, 4).translate(0, 0.11, 0),
    new THREE.MeshStandardMaterial({ color: '#4f8a3a', flatShading: true }), MAX,
  );
  const blooms = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.055, 0).translate(0, 0.24, 0),
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.7 }), MAX,
  );
  const palette = [...biome.tufts.filter((c) => c.r + c.g + c.b < 2.9), ...['#ffffff', '#ffd84a', '#ff86b0', '#b896ff', '#ff6b5b'].map((h) => new THREE.Color(h))];
  const planted = [];
  let next = 0;
  stems.count = blooms.count = 0;
  for (const mesh of [stems, blooms]) {
    mesh.castShadow = true;
    mesh.frustumCulled = false;
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const bounce = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
  return {
    object: new THREE.Group().add(stems, blooms),
    plant(at, t) {
      for (let i = 0; i < 3; i++) {
        planted[next] = {
          p: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.01, (Math.random() - 0.5) * 0.3)),
          yaw: Math.random() * TAU, size: 0.8 + Math.random() * 0.5, t: t + i * 0.08,
        };
        blooms.setColorAt(next, palette[Math.floor(Math.random() * palette.length)]);
        next = (next + 1) % MAX;
      }
      blooms.instanceColor.needsUpdate = true;
      stems.count = blooms.count = planted.length;
    },
    update(t) {
      planted.forEach((f, i) => {
        const grow = Math.max(0.001, bounce(THREE.MathUtils.clamp((t - f.t) / 0.7, 0, 1)) * f.size);
        m.compose(f.p, q.setFromAxisAngle(up, f.yaw + Math.sin(t * 1.5 + i) * 0.1), s.setScalar(grow));
        stems.setMatrixAt(i, m);
        blooms.setMatrixAt(i, m);
      });
      stems.instanceMatrix.needsUpdate = blooms.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildTufts(top, shape, biome, r, blocked) {
  const spots = groundSpots(top, r).filter((v) => !shape.isWet(v.x, v.z, 0.2) && shape.slopeAt(v.x, v.z) < 0.5 && !blocked(v.x, v.z)).slice(0, 220);
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), spots.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  spots.forEach((v, i) => {
    const ox = r.range(-0.12, 0.12), oz = r.range(-0.12, 0.12);
    m.makeTranslation(v.x + ox, v.y + 0.02, v.z + oz);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.copy(r.pick(biome.tufts)));
  });
  return mesh;
}

function buildRocks(top, shape, biome, r, blocked) {
  const spots = groundSpots(top, r).filter((v) => !shape.isWet(v.x, v.z, 0.1) && !blocked(v.x, v.z)).slice(0, r.int(7, 14));
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  spots.forEach((v, i) => {
    const size = r.range(0.5, 1.6);
    q.setFromEuler(e.set(r() * TAU, r() * TAU, r() * TAU));
    m.compose(p.set(v.x, v.y - 0.08, v.z), q, s.set(size, size * r.range(0.55, 0.9), size));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.copy(biome.rock[0]).lerp(biome.rock[1], r()));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function buildCrystals(top, shape, r) {
  const group = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(0.22, 0).scale(1, 2.6, 1);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#6f4cff', emissiveIntensity: 0.5, roughness: 0.2, flatShading: true });
  const spots = groundSpots(top, r).filter((v) => !shape.isWet(v.x, v.z, 0.4)).slice(0, 5);
  const mesh = new THREE.InstancedMesh(geo, material, spots.length * 4);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  let i = 0;
  for (const v of spots) {
    for (let k = 0; k < 4; k++) {
      const size = r.range(0.6, 1.4);
      q.setFromEuler(e.set(r.range(-0.5, 0.5), r() * TAU, r.range(-0.5, 0.5)));
      m.compose(p.set(v.x + r.range(-0.3, 0.3), v.y, v.z + r.range(-0.3, 0.3)), q, s.setScalar(size));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i++, c.set(r.pick(['#9ff7ff', '#ffb8f0', '#c9b6ff'])));
    }
  }
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function buildIslets(biome, r) {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: biome.rock[1], flatShading: true, roughness: 1 });
  const topMat = new THREE.MeshStandardMaterial({ color: biome.grass[0], flatShading: true, roughness: 1 });
  const items = [];
  for (let i = r.int(3, 6); i > 0; i--) {
    const size = r.range(0.4, 1.1), segments = r.int(5, 7), h = size * r.range(1.6, 2.6);
    const islet = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(size, h, segments), rockMat);
    rock.rotation.x = Math.PI;
    rock.position.y = -h / 2;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(size * 1.02, size * 0.98, 0.16, segments), topMat);
    cap.position.y = 0.06;
    islet.add(rock, cap);
    if (biome.flora.kind !== 'cactus' && r.chance(0.5)) {
      const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.38, 0), new THREE.MeshStandardMaterial({ color: biome.flora.colors[0], flatShading: true }));
      tree.position.y = size * 0.55;
      tree.material.userData.wind = true;
      islet.add(tree);
    }
    const a = r.range(0, TAU), d = r.range(12.5, 17);
    islet.position.set(Math.cos(a) * d, r.range(-4, 3), Math.sin(a) * d);
    islet.userData = { y: islet.position.y, phase: r.range(0, TAU), speed: r.range(0.4, 0.8), spin: 0, hop: 0 };
    islet.userData.onClick = () => {
      islet.userData.spin += 5;
      islet.userData.hop = 1;
    };
    islet.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    group.add(islet);
    items.push(islet);
  }
  return {
    object: group,
    clickables: items,
    update(t, dt) {
      for (const it of items) {
        const u = it.userData;
        u.spin *= Math.exp(-dt * 1.2);
        u.hop *= Math.exp(-dt * 2.5);
        it.position.y = u.y + Math.sin(t * u.speed + u.phase) * 0.3 + Math.sin((1 - u.hop) * Math.PI) * u.hop * 0.8;
        it.rotation.y += dt * (0.04 + u.spin);
      }
    },
  };
}

// Little drifting lights and falling things that give each biome its mood.
function buildAmbient(kind, top, shape, r) {
  const configs = {
    fireflies: { count: 45, size: 0.2, colors: ['#ffe27a'], glow: 3, night: true },
    sparkles: { count: 70, size: 0.16, colors: ['#ffffff', '#ffd6fb', '#b7fff3'], glow: 2, night: false },
    petals: { count: 80, size: 0.12, colors: ['#ffc4d6', '#ffe0ea'], fall: true },
    leaves: { count: 70, size: 0.13, colors: ['#e07a2c', '#f0b03a', '#c2452d'], fall: true },
  };
  const cfg = configs[kind];
  const spots = groundSpots(top, r).filter((v) => !shape.isWet(v.x, v.z));
  const parts = Array.from({ length: cfg.count }, () => {
    const v = r.pick(spots);
    return {
      x: v.x, z: v.z, ground: v.y,
      y: cfg.fall ? r.range(-1, 7) : v.y + r.range(0.3, 1.4),
      phase: r.range(0, TAU), speed: r.range(0.25, 0.5),
      // Glowing kinds go brighter than white so the bloom picks them up.
      color: new THREE.Color(r.pick(cfg.colors)).multiplyScalar(cfg.glow ?? 1),
    };
  });
  const positions = new Float32Array(cfg.count * 3);
  const colors = new Float32Array(cfg.count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: cfg.size, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
    blending: cfg.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  points.frustumCulled = false;
  return {
    object: points,
    update(t, dt, env) {
      const strength = cfg.night ? env.night : 1;
      points.visible = strength > 0.01;
      if (!points.visible) return;
      parts.forEach((p, i) => {
        let x, y, z, bright = strength;
        if (cfg.fall) {
          p.y -= p.speed * dt;
          if (p.y < p.ground - 0.2) p.y = 7;
          x = p.x + Math.sin(t * 0.9 + p.phase) * 0.5;
          y = p.y;
          z = p.z + Math.cos(t * 0.7 + p.phase) * 0.5;
        } else {
          x = p.x + Math.sin(t * 0.3 + p.phase) * 0.6;
          y = p.y + Math.sin(t * 0.5 + p.phase * 2) * 0.25;
          z = p.z + Math.cos(t * 0.25 + p.phase) * 0.6;
          bright *= Math.max(0, Math.sin(t * 1.7 + p.phase * 3)) ** 2;
        }
        positions.set([x, y, z], i * 3);
        colors.set([p.color.r * bright, p.color.g * bright, p.color.b * bright], i * 3);
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// Low mist that drifts across the land in misty weather.
function buildGroundMist(top, shape, r) {
  const puffs = groundSpots(top, r).slice(0, 18).map((v, i) => ({
    x: v.x, y: v.y + 0.3, z: v.z, size: r.range(1.8, 3), rot: r.range(0, TAU), shade: 0.85, cell: i % 4,
  }));
  const mist = createPuffMesh(puffs, 0);
  return {
    object: mist,
    update(t, dt, env) {
      mist.visible = env.mist > 0.02;
      mist.material.uniforms.uOpacity.value = env.mist * 0.55;
      mist.rotation.y += dt * 0.01;
    },
  };
}

function shoreToward(lake, from) {
  const a = Math.atan2(from.z - lake.z, from.x - lake.x);
  return { x: lake.x + Math.cos(a) * (lake.radius + 0.2), z: lake.z + Math.sin(a) * (lake.radius + 0.2) };
}

function coastToward(shape, r, from) {
  const a = Math.atan2(from.z, from.x) + r.range(-1.2, 1.2);
  const d = RADIUS * shape.edgeScale(a) * 0.88;
  return { x: Math.cos(a) * d, z: Math.sin(a) * d };
}

export function generateLand(seed) {
  const meta = makeRandom(seed, 'biome');
  const biomeKey = meta.weighted(Object.entries(BIOMES).map(([key, b]) => [key, b.weight]));
  const biome = tintBiome(BIOMES[biomeKey], meta);
  const shape = makeShape(seed, biome);

  const group = new THREE.Group();
  const updaters = [];
  const add = (part) => {
    if (!part) return;
    group.add(part.object ?? part.mesh ?? part);
    if (part.update) updaters.push(part.update);
  };

  const top = buildTop(shape, makeRandom(seed, 'mesh'));
  const under = buildUnderside(top, shape, makeRandom(seed, 'underside'));
  const bursts = createBursts();
  let lastEnv = { snowCover: 0, night: 0 };

  // The landmark and what surrounds it come first, so trees and paint can make room.
  const mats = makeMaterials(biomeKey);
  const ctx = {
    shape, biome, biomeKey, mats, waterLevel: WATER_LEVEL,
    r: makeRandom(seed, 'landmark'),
    spots: groundSpots(top, makeRandom(seed, 'spots')),
  };
  // If the land can't fit the landmark it rolled, try the biome's others.
  let landmark = null;
  for (const type of [ctx.r.weighted(biome.landmark), ...biome.landmark.map(([name]) => name), 'campsite', 'stones']) {
    landmark = buildLandmark(type, ctx);
    if (landmark) break;
  }
  const xr = makeRandom(seed, 'extras');
  let path = null, fields = null;
  if (landmark) {
    if (xr.chance(landmark.fields)) fields = planFields(ctx, xr, landmark);
    if (xr.chance(0.85)) path = planPath(ctx, xr, landmark.door, shape.lake ? shoreToward(shape.lake, landmark.door) : coastToward(shape, xr, landmark.door));
  }
  const blocked = (x, z) =>
    Boolean((landmark && Math.hypot(x - landmark.spot.x, z - landmark.spot.z) < landmark.radius)
      || (path && path.distTo(x, z) < 0.55)
      || (fields && fields.blocked(x, z)));

  const fr = makeRandom(seed, 'flora');
  const trees = placeFlora(top, shape, biome, fr, blocked);
  bakeOcclusion(top, shape, trees, landmark?.spot);

  const overlay = (x, y, z) => fields?.paint(x, z) ?? (path && path.distTo(x, z) < path.width ? biome.path : null);
  const ground = buildIslandMesh(top, under, shape, biome, makeRandom(seed, 'paint'), overlay);
  add(ground);
  const water = buildWater(top, shape, biome);
  add(water);
  add(buildWaterfall(shape, biome, makeRandom(seed, 'waterfall')));
  add(landmark);
  const lanterns = path && buildLanterns(ctx, path);
  add(lanterns);
  if (shape.lake && !biome.water.frozen && xr.chance(0.6)) add(buildDock(ctx, xr, landmark?.door ?? { x: 0, z: 0 }));
  if (landmark) add(buildProps(ctx, xr, landmark, trees));
  add(buildLightPools([...(landmark?.lights ?? []), ...(lanterns?.lights ?? [])], shape));

  const flora = buildFlora(trees, biome, fr);
  add(flora);
  const garden = buildGarden(biome);
  add(garden);
  add(bursts);
  add(buildTufts(top, shape, biome, makeRandom(seed, 'tufts'), blocked));
  add(buildRocks(top, shape, biome, makeRandom(seed, 'rocks'), blocked));
  if (biome.crystals) add(buildCrystals(top, shape, makeRandom(seed, 'crystals')));
  const islets = buildIslets(biome, makeRandom(seed, 'islets'));
  add(islets);
  for (const kind of biome.ambient) add(buildAmbient(kind, top, shape, makeRandom(seed, `ambient:${kind}`)));
  add(buildGroundMist(top, shape, makeRandom(seed, 'mist')));
  if (xr.chance(0.7)) add(buildBirds(xr));
  const balloon = xr.chance(0.15) ? buildBalloon(xr, mats) : null;
  add(balloon);

  // --- Things to tap ---
  const local = (hit) => group.worldToLocal(hit.point.clone());
  let now = 0;
  const clock = () => now;
  ground.userData.onClick = (hit) => {
    const at = local(hit);
    if (hit.face.normal.y > 0.35) {
      garden.plant(at, clock());
      bursts.spawn(at, { count: 10, colors: lastEnv.snowCover > 0.4 ? ['#ffffff'] : ['#c9b48a', '#9c8a66'], speed: 0.6, up: 0.8, gravity: -3, life: 0.8 });
    } else {
      // Tapping the cliffs knocks a few chips loose.
      bursts.spawn(at, { count: 12, colors: ['#8a857c', '#5f5a54'], speed: 0.5, up: 0.2, gravity: -6, life: 1.6, drag: 0.5 });
    }
  };
  if (water?.ripple) {
    water.mesh.userData.onClick = (hit) => {
      const at = local(hit);
      water.ripple(at.x, at.z, clock());
      bursts.spawn(at, { count: 14, colors: ['#e8f6ff', '#ffffff'], speed: 0.5, up: 2.2, gravity: -9, life: 0.7, drag: 0.4 });
    };
  } else if (water) {
    water.userData.onClick = (hit) => bursts.spawn(local(hit), { count: 12, colors: ['#ffffff'], glow: true, speed: 0.6, up: 0.5, gravity: -1, life: 1 });
  }
  for (const mesh of flora.meshes) {
    mesh.userData.onClick = (hit) => {
      if (hit.instanceId == null) return;
      flora.shake(hit.instanceId, clock());
      const snowy = lastEnv.snowCover > 0.4;
      const color = flora.crownColor(hit.instanceId);
      bursts.spawn(flora.crownTop(hit.instanceId), {
        count: 20, colors: snowy ? ['#ffffff', '#eef3f8'] : [color, color.clone().offsetHSL(0, 0, 0.08)],
        speed: 1.1, up: 0.4, gravity: snowy ? -2.5 : -1.2, life: 2.2, drag: 2.2, spread: 0.5,
      });
    };
  }
  if (landmark) {
    landmark.object.userData.onClick = (hit) => {
      landmark.poke(clock());
      const cool = landmark.type === 'wizard' || landmark.type === 'stones';
      bursts.spawn(local(hit), { count: 26, colors: cool ? ['#9ff7ff', '#c9b6ff'] : ['#ffd27a', '#fff1c0'], glow: true, speed: 1.2, up: 1.4, gravity: -1.5, life: 1.4 });
    };
  }
  if (balloon) balloon.object.userData.onClick = () => balloon.lift();
  const clickables = [ground, water?.mesh ?? water, ...flora.meshes, landmark?.object, ...islets.clickables, balloon?.object].filter(Boolean);

  // Every standard material learns about cloud shadows, wetness and snow.
  group.traverse((o) => {
    for (const m of [o.material].flat()) if (m?.isMeshStandardMaterial) patchMaterial(m, { wind: m.userData.wind });
  });

  return {
    group,
    biome,
    biomeKey,
    name: landName(makeRandom(seed, 'name')),
    landmark: landmark?.type ?? 'none',
    hasWaterfall: Boolean(shape.river),
    clickables,
    update(t, dt, env) {
      now = t;
      lastEnv = env;
      // A tapped landmark lights its lamps for a while, day or night.
      env.poke = landmark ? landmark.boost(clock()) : 0;
      env.gloom = Math.max(env.gloom, env.poke);
      updateMaterials(mats, env);
      for (const update of updaters) update(t, dt, env);
    },
  };
}
