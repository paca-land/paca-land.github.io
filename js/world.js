import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRandom, createNoise2D, fbm, landName } from './random.js';
import { softDot, skyUniforms, SKY_GLSL, createPuffMesh } from './sky.js';
import { fxUniforms, patchMaterial, sendGust } from './effects.js';
import { buildGrass } from './grass.js';
import { buildLife } from './life.js';
import { buildDetails } from './details.js';
import { createBursts } from './interact.js';
import { planMaze, buildMaze, planRows, buildRows } from './grounds.js';
import {
  makeMaterials, updateMaterials, buildLandmark, planPath, buildLanterns, planFields,
  buildDock, buildProps, buildLightPools, buildBalloon,
} from './landmarks.js';

const TAU = Math.PI * 2;
const RADIUS = 10;
const RINGS = 32;
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

  // Islands only a voyage reaches (weight 0: free lands never roll them). Words
  // call them up (lexicon.js), and the deeper sky is full of them (voyage.js).
  mire: {
    label: 'the mire', weight: 0,
    grass: ['#5b6439', '#737a48'], dirt: '#4a3e2c', rock: ['#5f5a4c', '#46423a'], sand: '#7d7350',
    hills: 1.3, peak: 0.8, bog: true,
    water: { color: '#55704a', opacity: 0.92 }, lake: 0.95, river: 0.3,
    flora: { kind: 'round', count: 60, groves: 0.2, colors: ['#4f6a3c', '#5d7440', '#48623a', '#6a7a44'] },
    tufts: ['#c8d870', '#e6f0a0'],
    landmark: [['ruins', 2], ['cabin', 2], ['shrine', 1], ['stones', 1]], path: '#6e6040',
    weather: [['mist', 5], ['rain', 2], ['cloudy', 2], ['storm', 1]],
    ambient: ['wisps'],
  },
  coral: {
    label: 'coral shoal', weight: 0,
    grass: ['#e8d49a', '#f4e4b4'], dirt: '#d4b07a', rock: ['#f29a86', '#d97a66'], sand: '#fff0c8',
    hills: 1.5, peak: 1.0,
    water: { color: '#22d1cc', opacity: 0.8 }, lake: 0.95, river: 0.2,
    flora: { kind: 'round', count: 40, groves: 0, colors: ['#ff7f6a', '#ff9e80', '#ff6f91', '#ffc26a'] },
    tufts: ['#ffffff', '#ff9e80'],
    landmark: [['lighthouse', 4], ['village', 2], ['campsite', 1]], path: '#f6e2b0',
    weather: [['clear', 5], ['cloudy', 2], ['rain', 1]],
    ambient: [],
  },
  toadstool: {
    label: 'toadstool wood', weight: 0,
    grass: ['#5e8f4a', '#7aa85c'], dirt: '#5a4030', rock: ['#7a7068', '#5a524a'], sand: '#d9c69a',
    hills: 2.0, peak: 1.4,
    water: { color: '#4fa39a', opacity: 0.86 }, lake: 0.7, river: 0.6,
    flora: { kind: 'round', count: 70, groves: 0.2, colors: ['#d8452f', '#f0e2c8', '#c9753a', '#e8c06a', '#b8382a'] },
    tufts: ['#ffffff', '#ff6a5a'],
    landmark: [['wizard', 2], ['cabin', 2], ['shrine', 1], ['stones', 1]], path: '#9a7a52',
    weather: [['mist', 3], ['rain', 2], ['cloudy', 2], ['clear', 1]],
    ambient: ['spores'],
  },
  stormcrag: {
    label: 'storm crag', weight: 0,
    grass: ['#5d6e66', '#76877c'], dirt: '#4a4f52', rock: ['#5f666e', '#43484f'], sand: '#a8aaa0',
    hills: 1.6, peak: 4.8, snowLine: 4.0,
    water: { color: '#3b6d86', opacity: 0.9 }, lake: 0.45, river: 0.9,
    flora: { kind: 'fir', count: 50, groves: -0.2, colors: ['#2a4a40', '#33554a', '#22403a'] },
    tufts: ['#d8e0e8'],
    landmark: [['lighthouse', 2], ['castle', 2], ['ruins', 2], ['stones', 1]], path: '#8a8a84',
    weather: [['storm', 3], ['cloudy', 3], ['mist', 2], ['rain', 2]],
    ambient: [],
  },
  glass: {
    label: 'glass isle', weight: 0,
    grass: ['#c4dde8', '#e6f3f8'], dirt: '#94a8ba', rock: ['#b8c8d8', '#8fa3b8'], sand: '#e6f0f4',
    hills: 2.0, peak: 3.0,
    water: { color: '#8feeff', opacity: 0.7 }, lake: 0.8, river: 0.5,
    flora: { kind: 'poplar', count: 45, groves: 0, colors: ['#a8e6ff', '#c8f0ff', '#e0d0ff', '#9fd8f0'] },
    tufts: ['#ffffff', '#bfefff'],
    crystals: true,
    landmark: [['wizard', 3], ['observatory', 2], ['stones', 2], ['shrine', 1], ['lighthouse', 1]], path: '#dce8f0',
    weather: [['clear', 4], ['mist', 2], ['snow', 1]],
    ambient: ['sparkles'],
  },
  ember: {
    label: 'ember isle', weight: 0,
    grass: ['#4a3f3a', '#5c4d44'], dirt: '#2e2622', rock: ['#3a3433', '#262222'], sand: '#6a5448',
    hills: 1.8, peak: 3.8,
    water: { color: '#ff5a1f', opacity: 0.96, lava: true }, lake: 0.6, river: 0.5,
    flora: { kind: 'pine', count: 22, groves: -0.6, colors: ['#3b2f2a', '#4a3a30', '#2f2622'] },
    tufts: ['#ff7a2a', '#ffb03a'],
    landmark: [['ruins', 3], ['stones', 2], ['shrine', 1], ['wizard', 1]], path: '#7a5a48',
    weather: [['clear', 3], ['cloudy', 2], ['mist', 2], ['storm', 1]],
    ambient: ['embers'],
  },
  gilded: {
    label: 'gilded isle', weight: 0,
    grass: ['#cfae45', '#e8cf78'], dirt: '#8a6a30', rock: ['#c9a85a', '#a3843e'], sand: '#f6e3a6',
    hills: 2.0, peak: 1.6,
    water: { color: '#4ec3e0', opacity: 0.84 }, lake: 0.8, river: 0.7,
    flora: { kind: 'round', count: 55, groves: 0.1, colors: ['#f2c94c', '#ffd96a', '#e0a82e', '#fff0a0'] },
    tufts: ['#fff4c0', '#ffd36e'],
    landmark: [['castle', 3], ['village', 2], ['bandstand', 2], ['workshop', 2], ['shrine', 1], ['wizard', 1]], path: '#e8d090',
    weather: [['clear', 6], ['cloudy', 1]],
    ambient: ['sparkles'],
  },
  jungle: {
    label: 'jungle', weight: 0,
    grass: ['#2f7a3a', '#4d9a45'], dirt: '#5a3f28', rock: ['#5f6a55', '#45503f'], sand: '#c9b37a',
    hills: 2.4, peak: 2.6,
    water: { color: '#2f8f7a', opacity: 0.88 }, lake: 0.8, river: 0.95,
    flora: { kind: 'round', count: 140, groves: -0.4, colors: ['#1f6a32', '#2e7d3a', '#3f8f3a', '#175a2b'] },
    tufts: ['#ff5a7a', '#ffcf3a'],
    landmark: [['ruins', 3], ['campsite', 2], ['shrine', 1], ['wizard', 1]], path: '#8a6a40',
    weather: [['rain', 4], ['mist', 2], ['cloudy', 2], ['clear', 1], ['storm', 1]],
    ambient: ['fireflies'],
  },
  savanna: {
    label: 'savanna', weight: 0,
    grass: ['#c9a94a', '#dcc070'], dirt: '#9a6a3a', rock: ['#a88a6a', '#86684c'], sand: '#e8d39a',
    hills: 1.4, peak: 1.0,
    water: { color: '#5aa6b8', opacity: 0.85 }, lake: 0.5, river: 0.3,
    flora: { kind: 'oak', count: 18, groves: -0.8, colors: ['#6a8a3a', '#7a9a45', '#5a7a32'] },
    tufts: ['#e8c870', '#ffffff'],
    landmark: [['campsite', 3], ['village', 2], ['observatory', 1], ['ruins', 1], ['stones', 1]], path: '#c9a46a',
    weather: [['clear', 6], ['cloudy', 2], ['storm', 1]],
    ambient: [],
  },
  heath: {
    label: 'heath', weight: 0,
    grass: ['#6a6a48', '#8a7a5a'], dirt: '#5a4a38', rock: ['#7a7a74', '#5a5a56'], sand: '#c8bc98',
    hills: 2.2, peak: 1.8,
    water: { color: '#4a6a7a', opacity: 0.9 }, lake: 0.6, river: 0.6,
    flora: { kind: 'bush', count: 50, groves: 0, colors: ['#7a4a7a', '#8a5a8a', '#6a3a6a', '#5a6a3a'] },
    tufts: ['#b070c0', '#d090e0'],
    landmark: [['stones', 3], ['cabin', 2], ['post', 2], ['ruins', 1], ['castle', 1]], path: '#9a8a6a',
    weather: [['mist', 3], ['cloudy', 3], ['rain', 2], ['clear', 1]],
    ambient: [],
  },
  lavender: {
    label: 'lavender fields', weight: 0,
    grass: ['#7a8a5a', '#9aa070'], dirt: '#7a5a40', rock: ['#a09a90', '#7a766e'], sand: '#e8dcc0',
    hills: 1.6, peak: 1.2,
    water: { color: '#6aa0c8', opacity: 0.84 }, lake: 0.6, river: 0.5,
    flora: { kind: 'poplar', count: 16, groves: -0.3, colors: ['#4a6a32', '#5a7a3a', '#6a8a42'] },
    rows: 'lavender',
    tufts: ['#9a7ad8', '#b08ae8', '#8a6ac8'],
    landmark: [['windmill', 3], ['village', 2], ['bandstand', 1], ['teahouse', 1], ['shrine', 1], ['cabin', 1]], path: '#d8c8a0',
    weather: [['clear', 5], ['cloudy', 2]],
    ambient: ['fireflies'],
  },
  cloudisle: {
    label: 'cloud isle', weight: 0,
    grass: ['#e8eef8', '#ffffff'], dirt: '#c8d0e0', rock: ['#dfe6f2', '#b8c4d8'], sand: '#f4f6fb',
    hills: 2.2, peak: 1.6,
    water: { color: '#a8d8ff', opacity: 0.7 }, lake: 0.7, river: 0.7,
    flora: { kind: 'round', count: 40, groves: 0.2, colors: ['#ffffff', '#f0f4ff', '#e0e8ff', '#fff0f8'] },
    tufts: ['#ffffff', '#ffd6f0'],
    landmark: [['shrine', 2], ['wizard', 2], ['observatory', 2], ['bandstand', 2], ['castle', 1], ['windmill', 1]], path: '#ffffff',
    weather: [['clear', 5], ['cloudy', 2]],
    ambient: ['sparkles'],
  },
  withered: {
    label: 'withered wood', weight: 0,
    grass: ['#5a5448', '#6e6656'], dirt: '#3e362e', rock: ['#4e4a46', '#36332f'], sand: '#7a7060',
    hills: 2.0, peak: 2.2,
    water: { color: '#3a4a48', opacity: 0.92 }, lake: 0.6, river: 0.4,
    flora: { kind: 'fir', count: 45, groves: 0, colors: ['#4a4038', '#5a5048', '#3a332c'] },
    tufts: ['#8a1a2a', '#5a2a4a'],
    landmark: [['ruins', 3], ['stones', 2], ['wizard', 1], ['cabin', 1]], path: '#6a5e50',
    weather: [['mist', 4], ['cloudy', 3], ['storm', 2], ['rain', 1]],
    ambient: ['wisps'],
  },
  sugar: {
    label: 'sugar isle', weight: 0,
    grass: ['#ffc8e0', '#ffe0ee'], dirt: '#c88a6a', rock: ['#fff0d0', '#f0d0a0'], sand: '#fff4e0',
    hills: 2.0, peak: 1.8,
    water: { color: '#ff9ad0', opacity: 0.8 }, lake: 0.85, river: 0.8,
    flora: { kind: 'round', count: 50, groves: 0.1, colors: ['#ff8ab8', '#8ae0c8', '#ffe08a', '#b8a0ff'] },
    tufts: ['#ffffff', '#ff5a8a', '#8ad8ff'],
    landmark: [['village', 3], ['bandstand', 2], ['windmill', 2], ['post', 1], ['castle', 1]], path: '#fff0f8',
    weather: [['clear', 6], ['cloudy', 1]],
    ambient: ['sparkles'],
  },
  bamboo: {
    label: 'bamboo grove', weight: 0,
    grass: ['#6a9a4a', '#8ab860'], dirt: '#6a5a3a', rock: ['#8a8a7a', '#6a6a5c'], sand: '#d8cc9a',
    hills: 2.4, peak: 2.4,
    water: { color: '#4a9a8a', opacity: 0.86 }, lake: 0.7, river: 0.7,
    flora: { kind: 'bamboo', count: 70, groves: 0.15, colors: ['#5a9a3a', '#6aaa45'] },
    tufts: ['#ffffff', '#f0e0a0'],
    landmark: [['shrine', 3], ['teahouse', 2], ['cabin', 2], ['campsite', 1], ['village', 1]], path: '#b0a070',
    weather: [['mist', 3], ['clear', 2], ['rain', 2], ['cloudy', 1]],
    ambient: ['fireflies'],
  },
  terraces: {
    label: 'tea terraces', weight: 0,
    grass: ['#5aa04a', '#7ab85a'], dirt: '#7a5a3a', rock: ['#9a8a7a', '#7a6a5c'], sand: '#d8c89a',
    hills: 2.6, peak: 3.0, terrace: 1.3,
    water: { color: '#4aa0c0', opacity: 0.85 }, lake: 0.6, river: 0.8,
    // The tea grows in rows round the terraces (grounds.js); these are the trees between.
    flora: { kind: 'bush', count: 30, groves: -0.3, colors: ['#3a8a3a', '#4a9a40', '#2f7a34'] },
    rows: 'tea',
    tufts: ['#ffffff', '#ffe08a'],
    landmark: [['teahouse', 3], ['shrine', 2], ['village', 1], ['windmill', 1], ['cabin', 1]], path: '#c0a878',
    weather: [['mist', 3], ['clear', 3], ['rain', 2], ['cloudy', 1]],
    ambient: [],
  },
  clockwork: {
    label: 'clockwork isle', weight: 0,
    grass: ['#8a7a5a', '#a08a62'], dirt: '#5a4a38', rock: ['#7a6a5a', '#5a4e44'], sand: '#c8b088',
    hills: 1.8, peak: 2.0,
    water: { color: '#5a8a8a', opacity: 0.9 }, lake: 0.6, river: 0.6,
    flora: { kind: 'gear', count: 40, groves: -0.2, colors: ['#c9a04a', '#b8863a'] },
    tufts: ['#d9b45a', '#a8703a'],
    landmark: [['workshop', 3], ['windmill', 2], ['castle', 2], ['village', 2], ['post', 1], ['lighthouse', 1]], path: '#9a8a6a',
    weather: [['clear', 3], ['cloudy', 3], ['mist', 1], ['rain', 1]],
    ambient: ['embers'],
  },
  paper: {
    label: 'paper isle', weight: 0,
    grass: ['#f2ead8', '#fbf6ea'], dirt: '#d8ccb0', rock: ['#e8dcc4', '#c8b898'], sand: '#fffaf0',
    hills: 2.0, peak: 1.8,
    water: { color: '#3a5a9a', opacity: 0.88 }, lake: 0.8, river: 0.7,
    flora: { kind: 'paper', count: 55, groves: 0.05, colors: ['#ffffff', '#f6efe0', '#ffd0dc', '#cfe2ff', '#fff0a8', '#ffffff'] },
    tufts: ['#3a5a9a', '#c8382a'],
    landmark: [['post', 3], ['wizard', 3], ['village', 2], ['ruins', 1], ['shrine', 1]], path: '#e0d4b8',
    weather: [['clear', 4], ['cloudy', 2], ['mist', 1]],
    ambient: ['scraps'],
  },
  moon: {
    label: 'moon isle', weight: 0,
    grass: ['#b8bcc8', '#d4d8e2'], dirt: '#8a8e9a', rock: ['#9a9eaa', '#767a86'], sand: '#e2e4ec',
    hills: 2.6, peak: 1.6,
    water: { color: '#9ab4e8', opacity: 0.8 }, lake: 0.7, river: 0.3,
    flora: { kind: 'birch', count: 30, groves: -0.2, colors: ['#e0e8f4', '#c8d4e8', '#f0f4ff'] },
    tufts: ['#ffffff', '#c8d8ff'],
    crystals: true,
    landmark: [['observatory', 3], ['stones', 2], ['wizard', 2], ['ruins', 1], ['lighthouse', 1]], path: '#d4d8e2',
    weather: [['clear', 6], ['mist', 1]],
    ambient: ['sparkles'],
  },
  maze: {
    label: 'hedge maze', weight: 0,
    grass: ['#5a9a4a', '#7ab060'], dirt: '#7a6a4a', rock: ['#9a9a8a', '#7a7a6c'], sand: '#e0d4a8',
    hills: 1.2, peak: 0.8,
    water: { color: '#4a9ad0', opacity: 0.84 }, lake: 0.45, river: 0.2,
    // The hedges are the maze itself (grounds.js); these are the trees round it.
    flora: { kind: 'hedge', count: 32, groves: -0.1, colors: ['#2f6a32', '#3a7a3a', '#285a2c'] },
    maze: true,
    tufts: ['#ff4a5a', '#ffffff', '#ffd23a'],
    landmark: [['castle', 3], ['bandstand', 2], ['shrine', 1], ['ruins', 1]], path: '#d8c8a0',
    weather: [['clear', 4], ['cloudy', 2], ['rain', 1]],
    ambient: [],
  },
  giant: {
    label: 'giants’ garden', weight: 0,
    grass: ['#4a9a3a', '#6ab84a'], dirt: '#6a4a2a', rock: ['#8a8070', '#6a6258'], sand: '#e0d0a0',
    hills: 2.2, peak: 1.6,
    water: { color: '#3aa0d8', opacity: 0.84 }, lake: 0.8, river: 0.6,
    flora: { kind: 'flower', count: 45, groves: 0, colors: ['#ff6a8a', '#ffd23a'] },
    tufts: ['#ffffff', '#ff86b0', '#ffd84a'],
    landmark: [['cabin', 2], ['windmill', 2], ['workshop', 1], ['bandstand', 1], ['castle', 1], ['village', 1]], path: '#b8996a',
    weather: [['clear', 4], ['cloudy', 2], ['rain', 1]],
    ambient: ['petals'],
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
// water all agree on where the ground is. `want` can insist on a lake or a
// river (a voyage's words, see lexicon.js); the dice are still rolled, so
// lands without wishes come out exactly as before.
function makeShape(seed, biome, want = {}) {
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

  const radial = (x, z) => Math.hypot(x, z) / (RADIUS * edgeScale(Math.atan2(z, x)));

  // A hedge maze island has a levelled lawn for its maze (set below, once the
  // lake is placed, on the far side from it).
  let lawn = null;

  // The land before any water is cut into it, and before terracing.
  function rawHeight(x, z) {
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
    return h;
  }
  function baseHeight(x, z) {
    let h = rawHeight(x, z);
    if (lawn) h += (lawn.h - h) * smoothstep(lawn.radius + 1.6, lawn.radius, Math.hypot(x - lawn.x, z - lawn.z));
    const step = biome.terrace || ledges;
    if (step) {
      // Mesas and ledges: flat tops with steep risers, and only a little roughness on top.
      const k = h / step;
      h = (Math.floor(k) + smoothstep(biome.terrace ? 0.7 : 0.6, 1, k - Math.floor(k))) * step;
    }
    return h + fbm(detail, x * 0.6, z * 0.6, 2) * (step ? 0.04 : 0.12);
  }

  // --- Water ----------------------------------------------------------------
  // A main lake (anything from a pond to a broad lake, and never quite round),
  // sometimes a winding river out over the edge, and sometimes a pond or two
  // more, each sitting at its own natural level.
  const makePool = (x, z, radius, depth, level) => ({
    x, z, radius, depth, level,
    stretch: r.range(0.65, 1.4), turn: r.range(0, Math.PI), wobble: r.range(0.15, 0.38), noise: createNoise2D(r), seed: r.range(0, 50),
  });
  // q < 1 inside the pool; `shore` is how far the shore lies in that direction.
  function poolAt(pool, x, z) {
    const dx = x - pool.x, dz = z - pool.z;
    const c = Math.cos(pool.turn), s = Math.sin(pool.turn);
    const u = (dx * c + dz * s) / pool.stretch, v = (-dx * s + dz * c) * pool.stretch;
    const a = Math.atan2(v, u);
    const shore = pool.radius * (1 + pool.wobble * fbm(pool.noise, Math.cos(a) * 1.4 + pool.seed, Math.sin(a) * 1.4, 3));
    return { q: Math.hypot(u, v) / shore, shore };
  }
  const extent = (pool) => pool.radius * (1 + pool.wobble) * Math.max(pool.stretch, 1 / pool.stretch);

  const pools = [];
  let lake = null, river = null;
  const rollLake = r.chance(biome.lake);
  if (want.lake ?? rollLake) {
    // Keep water away from the mountain so they don't fight for space.
    const a = peakAngle + Math.PI + r.range(-0.8, 0.8);
    const size = r.weighted([[r.range(0.9, 1.4), 2], [r.range(1.5, 2.3), 3], [r.range(2.4, 3.1), 2]]);
    lake = makePool(0, 0, size, r.range(0.5, 0.95), WATER_LEVEL);
    // The whole lake stays well inside the coast.
    const room = RADIUS * edgeScale(a) * 0.8;
    lake.radius = Math.min(lake.radius, (room * 0.55) / (extent(lake) / lake.radius));
    const d = Math.max(0, Math.min(r.range(0.2, 0.36) * RADIUS * edgeScale(a), room - extent(lake)));
    lake.x = Math.cos(a) * d;
    lake.z = Math.sin(a) * d;
    pools.push(lake);

    const rollRiver = r.chance(biome.river);
    if (want.river ?? rollRiver) {
      const ra = a + r.range(-0.5, 0.5);
      const dx = Math.cos(ra), dz = Math.sin(ra);
      const bend = r.range(0.4, 1.1) * (r.chance(0.5) ? 1 : -1), freq = r.range(0.35, 0.6), phase = r.range(0, TAU);
      // How far the river's centerline swings sideways, t units downstream.
      const wander = (t) => bend * Math.sin(t * freq * TAU * 0.5 + phase) * smoothstep(0.5, 2.5, t);
      const center = (t) => ({ x: lake.x + dx * t - dz * wander(t), z: lake.z + dz * t + dx * wander(t) });
      let end = 0;
      while (end < 30 && radial(center(end).x, center(end).z) < 1) end += 0.05;
      const before = center(end - 0.1), at = center(end);
      const len = Math.hypot(at.x - before.x, at.z - before.z);
      river = {
        width: r.range(0.45, 0.75), dx, dz, end,
        // Where it pours off the edge, and which way it's flowing there.
        exit: { x: at.x, z: at.z, dx: (at.x - before.x) / len, dz: (at.z - before.z) / len },
        // Distance downstream (t) and sideways from the centerline (off).
        measure(x, z) {
          const px = x - lake.x, pz = z - lake.z;
          const t = px * dx + pz * dz;
          return { t, off: Math.abs(px * -dz + pz * dx - wander(t)) };
        },
      };
    }
  }

  if (biome.maze) {
    const a = lake ? Math.atan2(lake.z, lake.x) + Math.PI : r.range(0, TAU);
    const d = lake ? Math.max(0, 2.6 - Math.hypot(lake.x, lake.z) * 0.3) : r.range(0, 1.2);
    lawn = { x: Math.cos(a) * d, z: Math.sin(a) * d, radius: 4.2 };
    lawn.h = Math.max(rawHeight(lawn.x, lawn.z), WATER_LEVEL + 0.6);
  }

  // Extra ponds sit on flat ground at the level of their own banks. A bog is
  // pocked with small ones.
  for (let n = biome.bog ? r.int(4, 6) : r.chance(biome.lake * 0.6) ? r.int(1, 2) : 0; n > 0; n--) {
    for (let k = 0; k < (biome.bog ? 24 : 14); k++) {
      const pa = r.range(0, TAU), pd = r.range(0.15, biome.bog ? 0.7 : 0.55) * RADIUS * edgeScale(pa);
      const pond = makePool(Math.cos(pa) * pd, Math.sin(pa) * pd, biome.bog ? r.range(0.4, 0.8) : r.range(0.55, 1.0), r.range(0.3, 0.55), 0);
      const reach = extent(pond);
      if (pd + reach > RADIUS * edgeScale(pa) * 0.8) continue;
      if (pools.some((p) => Math.hypot(p.x - pond.x, p.z - pond.z) < extent(p) + reach + (biome.bog ? 0.4 : 0.8))) continue;
      if (Math.hypot(pond.x - peak.x, pond.z - peak.z) < peak.size * 0.9) continue;
      if (lawn && Math.hypot(pond.x - lawn.x, pond.z - lawn.z) < lawn.radius + reach) continue;
      if (river) {
        const { t, off } = river.measure(pond.x, pond.z);
        if (t > -reach && t < river.end + reach && off < river.width + reach + 0.5) continue;
      }
      // The water line sits just below the lowest point of its banks, so it never spills.
      let rim = baseHeight(pond.x, pond.z);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU;
        rim = Math.min(rim, baseHeight(pond.x + Math.cos(ang) * reach * 1.15, pond.z + Math.sin(ang) * reach * 1.15));
      }
      if (baseHeight(pond.x, pond.z) - rim > 0.6) continue; // too steep a spot
      pond.level = rim - 0.08;
      pools.push(pond);
      break;
    }
  }

  function heightAt(x, z) {
    let h = baseHeight(x, z);
    for (const pool of pools) {
      const { q, shore } = poolAt(pool, x, z);
      h = Math.min(h, q < 1 ? pool.level - pool.depth * (1 - q * q) : pool.level + (q - 1) * shore * 0.9);
    }
    if (river) {
      const { t, off } = river.measure(x, z);
      if (t > 0) {
        h = Math.min(h, off < river.width
          ? WATER_LEVEL - 0.3 * (1 - (off / river.width) ** 2)
          : WATER_LEVEL + (off - river.width) * 1.1);
      }
    }
    return h;
  }

  // Which body of water a point is in (or within `margin` of), if any.
  function waterAt(x, z, margin = 0) {
    for (const pool of pools) {
      const { q, shore } = poolAt(pool, x, z);
      if ((q - 1) * shore < margin) return pool;
    }
    if (river) {
      const { t, off } = river.measure(x, z);
      if (t > 0 && t < river.end + 1 && off < river.width + margin) return lake;
    }
    return null;
  }
  const isWet = (x, z, margin = 0) => waterAt(x, z, margin) !== null;

  // How far a pool's shore is from its middle, in a given direction.
  function shoreDistance(pool, angle) {
    const step = 0.05, limit = extent(pool) * 1.3;
    let t = 0;
    while (t < limit && poolAt(pool, pool.x + Math.cos(angle) * t, pool.z + Math.sin(angle) * t).q < 1) t += step;
    return t;
  }

  function slopeAt(x, z) {
    const e = 0.25;
    return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  }

  // How many terraces up a point is (whole numbers at each riser), for rows of tea.
  const terraceAt = biome.terrace ? (x, z) => rawHeight(x, z) / biome.terrace : null;
  return { edgeScale, heightAt, isWet, waterAt, shoreDistance, slopeAt, radial, lake, pools, river, peak, terraceAt, lawn };
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
      else if (n.y < 0.45 || shape.slopeAt(x, z) > 1.05) col.copy(biome.rock[0]).lerp(biome.rock[1], r());
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
  attribute float aMirror;
  uniform float uTime;
  uniform float uWind;
  uniform vec4 uClicks[4];
  varying float vMirror;
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
    // Wind chop: crossing wavelets that grow with the wind.
    transformed.y += (sin(dot(position.xz, vec2(0.94, 0.33)) * 3.1 - uTime * 2.2)
      + 0.6 * sin(dot(position.xz, vec2(-0.3, 0.95)) * 4.3 - uTime * 2.9)) * 0.008 * uWind;
    vMirror = aMirror;
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
  uniform vec3 uLava;
  uniform vec3 uKeyDir;
  uniform vec3 uKeyColor;
  uniform vec3 uAmbient;
  uniform float uRain;
  uniform float uSnow;
  uniform vec4 uClicks[4];
  uniform sampler2D uReflection;
  uniform mat4 uReflectMatrix;
  uniform float uReflectOn;
  uniform float uWind;
  varying float vMirror;
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
    float ice = smoothstep(0.55, 0.95, uSnow) * step(dot(uLava, uLava), 0.0);
    vec2 slope = ripple(p * 0.3, vFlow * 1.5) + ripple(p * 0.85 + 3.7, vFlow * 2.5) * 0.6;
    slope *= (1.0 + uRain * 0.6) * (0.75 + 0.25 * uWind) * (1.0 - ice * 0.9);
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
    float fresnel = 0.06 + 0.94 * pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 5.0);
    float shadow = getShadowMask();
    float depth = max(vDepth, 0.0);
    float deep = 1.0 - exp(-depth * 2.8);

    vec3 body = mix(uShallow, uDeep, deep) * (uAmbient + uKeyColor * max(dot(N, uKeyDir), 0.0) * shadow * 0.3);
    vec3 reflection = skyColor(R, 0.0);
    if (uReflectOn > 0.5 && vMirror > 0.5) {
      vec4 rc = uReflectMatrix * vec4(vWorldP, 1.0);
      vec2 ruv = clamp(rc.xy / rc.w + slope * 0.03, 0.002, 0.998);
      reflection = texture2D(uReflection, ruv).rgb;
    }
    vec3 col = mix(body, reflection, fresnel);
    float sparkle = max(dot(R, uKeyDir), 0.0);
    col += uKeyColor * (pow(sparkle, 700.0) * 3.0 + pow(sparkle, 60.0) * 0.12) * shadow;

    // Foam where the water laps at the shore.
    float foamNoise = texture2D(uRipples, p * 1.3 + uTime * 0.03).x;
    float lap = sin(uTime * 1.6 + (p.x + p.y) * 1.3);
    float foam = smoothstep(0.1 + lap * 0.04, 0.0, depth + (foamNoise - 0.5) * 0.12) * (0.75 + 0.25 * lap);
    col = mix(col, uAmbient * 1.6 + uKeyColor * 0.35 * shadow, foam * 0.75 * (1.0 - ice));
    col += uLava * (0.55 + 0.45 * foamNoise);

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
  const positions = [], normals = [], depths = [], flows = [], mirrors = [];
  // Depth comes straight from the terrain vertex below, so the shallows and
  // the shoreline line up exactly with the ground.
  const sample = (v, pool) => {
    let k = 0;
    if (river && pool === lake) {
      const { t, off } = river.measure(v.x, v.z);
      k = smoothstep(lake.radius * 0.4, lake.radius * 1.1, t) * smoothstep(river.width + 0.8, river.width * 0.5, off) * 0.9;
    }
    return [v.x, pool.level, v.z, pool.level - v.y, river ? river.dx * k : 0, river ? river.dz * k : 0, pool === lake ? 1 : 0];
  };
  const emit = (...verts) => {
    for (const [x, y, z, depth, fx, fz, mirror] of verts) {
      positions.push(x, y, z);
      normals.push(0, 1, 0);
      depths.push(depth);
      flows.push(fx, fz);
      mirrors.push(mirror);
    }
  };
  // Split each triangle into a 3×3 grid of smaller ones, so a wave can bend the surface.
  const N = 3;
  for (const tri of top.tris) {
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3;
    const pool = shape.waterAt(cx, cz, 0.6);
    if (!pool || Math.min(tri[0].y, tri[1].y, tri[2].y) >= pool.level - 0.005) continue;
    const [a, b, c] = tri.map((v) => sample(v, pool));
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
  geo.setAttribute('aMirror', new THREE.Float32BufferAttribute(mirrors, 1));

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
    uLava: { value: biome.water.lava ? color.clone().multiplyScalar(1.4) : new THREE.Color(0, 0, 0) },
  }]);
  uniforms.uRipples.value = rippleNormals();
  uniforms.uRain = fxUniforms.uRain;
  uniforms.uSnow = fxUniforms.uSnow;
  uniforms.uReflection = fxUniforms.uReflection;
  uniforms.uReflectMatrix = fxUniforms.uReflectMatrix;
  uniforms.uReflectOn = fxUniforms.uReflectOn;
  uniforms.uWind = fxUniforms.uWindStrength;
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
    ripple(x, z, t, strength = 1.6) {
      uniforms.uClicks.value[nextClick].set(x, z, t, strength);
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
  uniform vec3 uFoam;
  uniform vec3 uGlow;
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
    vec3 col = mix(uColor, uFoam, white) * (uAmbient * 1.3 + uKeyColor * 0.25) + uGlow * (0.6 + streak * 0.6);
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
  const { exit } = river;
  const group = new THREE.Group();
  group.position.set(exit.x + exit.dx * 0.05, WATER_LEVEL + 0.02, exit.z + exit.dz * 0.05);
  group.rotation.y = Math.atan2(exit.dx, exit.dz);

  const H = 7, W = river.width * 2.2;
  const lava = Boolean(biome.water.lava);
  const geo = new THREE.PlaneGeometry(W, H, 1, 18);
  geo.translate(0, -H / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, 1.4 * (-pos.getY(i) / H) ** 1.8 + 0.05);
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 },
    uRipples: { value: rippleNormals() },
    uColor: { value: biome.water.color.clone().lerp(new THREE.Color('#ffffff'), lava ? 0 : 0.35) },
    // Lava falls glow, with hot yellow streaks instead of white water.
    uFoam: { value: new THREE.Color(lava ? '#ffd27a' : '#ffffff') },
    uGlow: { value: lava ? biome.water.color.clone().multiplyScalar(0.9) : new THREE.Color(0, 0, 0) },
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
    color: lava ? '#ffa04a' : '#ffffff', size: 0.1, map: softDot(), transparent: true, opacity: 0.7, depthWrite: false,
  }));
  points.frustumCulled = false;
  group.add(points);

  return {
    object: group,
    update(t, dt, env) {
      uniforms.uTime.value = t;
      mist.rotation.y += dt * 0.12;
      mist.material.uniforms.uOpacity.value = 0.4 + env.wet * 0.35;
      if (!lava) points.material.color.setScalar(1 - env.night * 0.75 - env.overcast * 0.25);
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

// Which trees grow where, and how often. (Adding a kind to a list changes which
// kind some trees are, not where they stand: every tree still takes one draw.)
const TREE_SPECIES = {
  meadow: [['round', 3], ['oak', 3], ['birch', 1], ['bush', 2], ['willow', 1]],
  highlands: [['pine', 4], ['fir', 3], ['bush', 1], ['birch', 1]],
  autumn: [['round', 3], ['oak', 2], ['birch', 2], ['bush', 1], ['poplar', 1]],
  desert: [['cactus', 4], ['shrub', 2], ['palm', 1], ['dead', 1]],
  snowfield: [['pine', 3], ['fir', 3], ['birch', 1], ['dead', 0.5]],
  blossom: [['round', 4], ['oak', 1], ['bush', 1], ['willow', 1], ['topiary', 0.5]],
  dream: [['round', 3], ['poplar', 2], ['bush', 1], ['mushroom', 1], ['crystal', 1]],
  mire: [['willow', 3], ['dead', 1], ['bush', 2], ['poplar', 1]],
  coral: [['palm', 4], ['bush', 2]],
  toadstool: [['mushroom', 5], ['round', 1], ['bush', 1]],
  stormcrag: [['fir', 3], ['pine', 2], ['dead', 1], ['bush', 1]],
  glass: [['crystal', 3], ['poplar', 2], ['fir', 1]],
  ember: [['dead', 3], ['pine', 1], ['shrub', 2]],
  gilded: [['round', 3], ['poplar', 2], ['topiary', 1], ['oak', 1]],
  jungle: [['kapok', 3], ['fern', 3], ['palm', 2], ['round', 2], ['willow', 1]],
  savanna: [['acacia', 4], ['shrub', 2], ['dead', 0.5]],
  heath: [['bush', 4], ['shrub', 2], ['pine', 1], ['dead', 0.5]],
  lavender: [['poplar', 3], ['round', 1], ['bush', 1]],
  cloudisle: [['puff', 4], ['bush', 2]],
  withered: [['dead', 4], ['fir', 1], ['shrub', 1]],
  sugar: [['lollipop', 4], ['round', 1], ['bush', 1]],
  bamboo: [['bamboo', 5], ['bush', 1], ['round', 1]],
  terraces: [['poplar', 2], ['round', 2], ['bush', 1]],
  clockwork: [['gear', 4], ['poplar', 1], ['shrub', 1]],
  paper: [['paper', 4], ['bush', 1]],
  moon: [['birch', 2], ['crystal', 1], ['poplar', 1], ['dead', 1]],
  maze: [['topiary', 3], ['poplar', 2], ['round', 1]],
  giant: [['flower', 4], ['mushroom', 1], ['bush', 1]],
};
// How high each crown sits, for leaves shaken loose.
const CROWN_TOP = {
  round: 1, oak: 1.1, birch: 1.4, fir: 1.4, poplar: 1.5, bush: 0.35, shrub: 0.3, pine: 1.2, cactus: 0.9,
  mushroom: 1, palm: 1.45, acacia: 1.2, dead: 1.2, lollipop: 1.45, crystal: 1.4, willow: 1.3, bamboo: 1.6,
  gear: 1.5, paper: 1.4, topiary: 1.4, hedge: 0.55, flower: 1.45, puff: 1.15, kapok: 2, fern: 0.4,
};

const ico = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 0).scale(1, sy, 1).translate(x, y, z);
// Merge pieces of any make (indexed or not, which mergeGeometries won't mix).
const flat = (...geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));

function speciesGeometry(kind) {
  const plain = (trunk, crown, extra = {}) => ({ trunk: trunk && shadeByHeight(trunk, 0.55), crown: shadeByHeight(crown, extra.dark ?? 0.45), ...extra });
  switch (kind) {
    case 'pine':
      return plain(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5).translate(0, 0.25, 0), mergeGeometries([
        new THREE.ConeGeometry(0.5, 0.8, 6).translate(0, 0.75, 0),
        new THREE.ConeGeometry(0.38, 0.65, 6).translate(0, 1.1, 0),
        new THREE.ConeGeometry(0.25, 0.5, 6).translate(0, 1.42, 0),
      ]));
    case 'fir':
      return plain(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 5).translate(0, 0.22, 0), mergeGeometries([
        new THREE.ConeGeometry(0.38, 0.7, 7).translate(0, 0.65, 0),
        new THREE.ConeGeometry(0.31, 0.62, 7).translate(0, 0.98, 0),
        new THREE.ConeGeometry(0.23, 0.55, 7).translate(0, 1.3, 0),
        new THREE.ConeGeometry(0.14, 0.45, 7).translate(0, 1.6, 0),
      ]));
    case 'cactus':
      return plain(null, mergeGeometries([
        new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6).translate(0, 0.55, 0),
        new THREE.CylinderGeometry(0.07, 0.07, 0.3, 5).rotateZ(Math.PI / 2).translate(0.2, 0.45, 0),
        new THREE.CylinderGeometry(0.07, 0.07, 0.35, 5).translate(0.33, 0.62, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.25, 5).rotateZ(Math.PI / 2).translate(-0.18, 0.7, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.28, 5).translate(-0.29, 0.84, 0),
      ]), { dark: 0.7 });
    case 'oak': {
      const trunk = mergeGeometries([
        new THREE.CylinderGeometry(0.09, 0.15, 0.75, 6).translate(0, 0.37, 0),
        new THREE.CylinderGeometry(0.04, 0.06, 0.4, 5).rotateZ(-0.9).translate(0.15, 0.7, 0),
      ]);
      return plain(trunk, mergeGeometries([ico(0.42, 0, 1.05, 0), ico(0.34, 0.32, 0.92, 0.1), ico(0.32, -0.28, 0.95, -0.12), ico(0.3, 0.05, 1.32, 0.05)]));
    }
    case 'birch': {
      // White bark with dark scars.
      const trunk = new THREE.CylinderGeometry(0.045, 0.065, 1.15, 6, 6).translate(0, 0.57, 0);
      const pos = trunk.attributes.position;
      const colors = [];
      for (let i = 0; i < pos.count; i++) {
        const band = Math.sin(pos.getY(i) * 31 + Math.atan2(pos.getZ(i), pos.getX(i)) * 2) > 0.75 ? 0.25 : 1;
        colors.push(band, band, band);
      }
      trunk.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      return { trunk, trunkColor: '#efeadf', crown: shadeByHeight(mergeGeometries([ico(0.3, 0, 1.3, 0, 1.4), ico(0.22, 0.14, 1.0, 0.05, 1.3), ico(0.2, -0.12, 1.55, -0.04, 1.3)]), 0.5) };
    }
    case 'poplar':
      return plain(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 5).translate(0, 0.3, 0), ico(0.33, 0, 1.25, 0, 2.3));
    case 'bush':
      return plain(null, mergeGeometries([ico(0.28, 0, 0.2, 0), ico(0.22, 0.22, 0.15, 0.08), ico(0.2, -0.18, 0.16, -0.1)]), { dark: 0.55 });
    case 'shrub':
      return plain(null, mergeGeometries([ico(0.18, 0, 0.14, 0, 0.8), ico(0.14, 0.15, 0.1, 0.05, 0.8), ico(0.12, -0.12, 0.1, -0.08, 0.8)]), { dark: 0.6 });
    case 'mushroom': {
      // A toadstool as tall as a tree: a pale stem and a broad cap.
      const stem = new THREE.CylinderGeometry(0.09, 0.14, 0.9, 7).translate(0, 0.45, 0);
      const cap = flat(
        new THREE.SphereGeometry(0.55, 9, 4, 0, TAU, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0, 0.84, 0),
        new THREE.CylinderGeometry(0.55, 0.42, 0.08, 9).translate(0, 0.82, 0),
      );
      return { trunk: shadeByHeight(stem, 0.75), trunkColor: '#efe6d2', crown: shadeByHeight(cap, 0.55) };
    }
    case 'palm': {
      // A leaning trunk and a crown of drooping fronds.
      const trunk = flat(...[0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.055 - i * 0.007, 0.07 - i * 0.007, 0.37, 6).translate(i * 0.05, 0.18 + i * 0.34, 0)));
      const fronds = Array.from({ length: 7 }, (_, i) => new THREE.ConeGeometry(0.12, 0.85, 4)
        .rotateZ(-Math.PI / 2).scale(1, 0.3, 1).rotateZ(-0.45).translate(0.36, 0, 0).rotateY((i / 7) * TAU).translate(0.15, 1.42, 0));
      return { trunk: shadeByHeight(trunk, 0.6), trunkColor: '#8a6a44', crown: shadeByHeight(flat(...fronds, ico(0.1, 0.15, 1.44, 0)), 0.5) };
    }
    case 'acacia': {
      // A thin forked trunk under a flat, wide crown: the savanna's umbrella tree.
      const trunk = flat(
        new THREE.CylinderGeometry(0.05, 0.08, 0.7, 5).translate(0, 0.35, 0),
        new THREE.CylinderGeometry(0.03, 0.045, 0.5, 5).rotateZ(0.6).translate(-0.13, 0.85, 0),
        new THREE.CylinderGeometry(0.03, 0.045, 0.5, 5).rotateZ(-0.6).translate(0.13, 0.85, 0),
      );
      return plain(trunk, flat(ico(0.58, 0, 1.12, 0, 0.3), ico(0.36, 0.34, 1.08, 0.12, 0.35), ico(0.33, -0.34, 1.1, -0.1, 0.35)));
    }
    case 'dead': {
      // Bare branches and no leaves: the crown is the branches.
      const trunk = new THREE.CylinderGeometry(0.05, 0.1, 0.9, 5).translate(0, 0.45, 0);
      const twigs = flat(
        new THREE.CylinderGeometry(0.02, 0.035, 0.5, 4).rotateZ(0.8).translate(-0.18, 0.95, 0),
        new THREE.CylinderGeometry(0.02, 0.035, 0.45, 4).rotateZ(-0.7).translate(0.16, 1.0, 0.05),
        new THREE.CylinderGeometry(0.015, 0.03, 0.35, 4).rotateX(0.7).translate(0, 1.05, 0.14),
        new THREE.CylinderGeometry(0.015, 0.025, 0.3, 4).rotateZ(0.3).translate(0.04, 1.2, -0.04),
      );
      return plain(trunk, twigs, { dark: 0.45 });
    }
    case 'lollipop': {
      // A stick and a round, striped sweet.
      const stick = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 5).translate(0, 0.47, 0);
      const sweet = flat(
        new THREE.CylinderGeometry(0.4, 0.4, 0.12, 14).rotateX(Math.PI / 2).translate(0, 1.18, 0),
        new THREE.TorusGeometry(0.4, 0.045, 4, 14).translate(0, 1.18, 0),
      );
      return { trunk: shadeByHeight(stick, 0.85), trunkColor: '#f4efe6', crown: shadeByHeight(sweet, 0.7) };
    }
    case 'crystal': {
      // No trunk: a cluster of tall glassy spires.
      const spike = (h, r, x, z, tilt) => new THREE.OctahedronGeometry(r, 0).scale(1, h / r, 1).rotateZ(tilt).translate(x, h * 0.9, z);
      return plain(null, flat(spike(0.75, 0.16, 0, 0, 0), spike(0.5, 0.12, 0.18, 0.08, -0.3), spike(0.45, 0.11, -0.16, -0.06, 0.35)), { dark: 0.75 });
    }
    case 'willow': {
      // A round head with long strands hanging down all round it.
      const strands = Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * TAU;
        return new THREE.ConeGeometry(0.1, 0.75, 4).rotateX(Math.PI).translate(Math.cos(a) * 0.42, 0.78, Math.sin(a) * 0.42);
      });
      return plain(new THREE.CylinderGeometry(0.07, 0.12, 0.8, 6).translate(0, 0.4, 0), flat(ico(0.46, 0, 1.15, 0, 0.7), ...strands), { dark: 0.4 });
    }
    case 'bamboo': {
      // A clump of jointed canes with sprays of leaves at the top.
      const pieces = [];
      for (const [x, z, h] of [[0, 0, 1.7], [0.14, 0.06, 1.45], [-0.12, 0.1, 1.55], [0.05, -0.14, 1.25], [-0.08, -0.1, 1.35]]) {
        for (let y = 0; y < h; y += 0.32) pieces.push(new THREE.CylinderGeometry(0.034, 0.04, 0.29, 5).translate(x, y + 0.15, z));
        pieces.push(ico(0.15, x + 0.06, h + 0.02, z, 0.45), ico(0.12, x - 0.07, h - 0.16, z + 0.04, 0.45));
      }
      return plain(null, flat(...pieces), { dark: 0.55 });
    }
    case 'gear': {
      // A big cog on a post, standing on its edge, with a little one turning against it.
      const post = new THREE.CylinderGeometry(0.04, 0.06, 0.8, 6).translate(0, 0.4, 0);
      const cog = (r, teeth, x, y) => [
        new THREE.CylinderGeometry(r, r, 0.1, 16).rotateX(Math.PI / 2).translate(x, y, 0),
        new THREE.CylinderGeometry(r * 0.28, r * 0.28, 0.16, 8).rotateX(Math.PI / 2).translate(x, y, 0),
        ...Array.from({ length: teeth }, (_, i) => {
          const a = (i / teeth) * TAU;
          return new THREE.BoxGeometry(r * 0.38, r * 0.34, 0.1).rotateZ(a).translate(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12, 0);
        }),
      ];
      const wheel = flat(...cog(0.46, 9, 0, 1.12), ...cog(0.22, 7, 0.6, 1.5));
      return { trunk: shadeByHeight(post, 0.6), trunkColor: '#6a5038', crown: shadeByHeight(wheel, 0.65) };
    }
    case 'paper': {
      // Folded paper: four-sided cones stacked like an origami fir.
      return {
        trunk: shadeByHeight(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 4).translate(0, 0.2, 0), 0.7),
        trunkColor: '#cbb894',
        crown: shadeByHeight(flat(
          new THREE.ConeGeometry(0.45, 0.6, 4).translate(0, 0.6, 0),
          new THREE.ConeGeometry(0.34, 0.5, 4).rotateY(Math.PI / 4).translate(0, 0.95, 0),
          new THREE.ConeGeometry(0.22, 0.42, 4).translate(0, 1.27, 0),
        ), 0.8),
      };
    }
    case 'topiary':
      // Clipped balls on a stick.
      return plain(new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5).translate(0, 0.3, 0),
        flat(new THREE.IcosahedronGeometry(0.3, 1).translate(0, 0.85, 0), new THREE.IcosahedronGeometry(0.2, 1).translate(0, 1.25, 0)), { dark: 0.5 });
    case 'hedge':
      // A block of clipped hedge.
      return plain(null, new THREE.BoxGeometry(0.75, 0.55, 0.36).translate(0, 0.27, 0), { dark: 0.55 });
    case 'flower': {
      // A flower taller than you: a green stem, five round petals and a middle.
      const stem = new THREE.CylinderGeometry(0.04, 0.05, 1.3, 5).translate(0, 0.65, 0);
      const petals = Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * TAU;
        return new THREE.IcosahedronGeometry(0.2, 0).scale(1, 0.35, 1).translate(Math.cos(a) * 0.24, 1.36, Math.sin(a) * 0.24);
      });
      return { trunk: shadeByHeight(stem, 0.6), trunkColor: '#5a9a3a', crown: shadeByHeight(flat(...petals, new THREE.IcosahedronGeometry(0.13, 0).scale(1, 0.5, 1).translate(0, 1.38, 0)), 0.8) };
    }
    case 'kapok': {
      // A jungle giant: a tall bare trunk on flared roots, a broad layered
      // crown above the rest, and vines hanging down from it.
      const trunk = flat(
        new THREE.CylinderGeometry(0.07, 0.12, 1.5, 6).translate(0, 0.75, 0),
        ...[0, 1, 2, 3].map((i) => new THREE.ConeGeometry(0.07, 0.35, 3).rotateZ(0.9).translate(0.12, 0.1, 0).rotateY((i / 4) * TAU + 0.4)),
      );
      const vines = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * TAU + 0.3, len = 0.5 + (i % 3) * 0.18;
        return new THREE.CylinderGeometry(0.012, 0.02, len, 3).translate(Math.cos(a) * 0.48, 1.62 - len / 2, Math.sin(a) * 0.48);
      });
      return plain(trunk, flat(ico(0.62, 0, 1.78, 0, 0.42), ico(0.46, 0.3, 1.95, 0.12, 0.4), ico(0.42, -0.28, 1.9, -0.16, 0.4), ...vines), { dark: 0.35 });
    }
    case 'fern':
      // Long fronds fanning out from the ground.
      return plain(null, flat(...Array.from({ length: 7 }, (_, i) => new THREE.ConeGeometry(0.09, 0.62, 3)
        .rotateZ(-Math.PI / 2).scale(1, 0.25, 1).rotateZ(-0.55 - (i % 2) * 0.25).translate(0.28, 0.16, 0).rotateY((i / 7) * TAU))), { dark: 0.6 });
    case 'puff':
      // A tree made of cloud.
      return plain(new THREE.CylinderGeometry(0.04, 0.06, 0.55, 5).translate(0, 0.27, 0), flat(
        new THREE.IcosahedronGeometry(0.32, 1).translate(0, 0.85, 0),
        new THREE.IcosahedronGeometry(0.26, 1).translate(0.24, 0.78, 0.06),
        new THREE.IcosahedronGeometry(0.24, 1).translate(-0.22, 0.8, -0.05),
        new THREE.IcosahedronGeometry(0.22, 1).translate(0.02, 1.08, 0.04),
      ), { dark: 0.8, trunkColor: '#d8d0e0' });
    default:
      return plain(new THREE.CylinderGeometry(0.07, 0.11, 0.7, 5).translate(0, 0.35, 0), new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.98, 0));
  }
}

function speciesColors(kind, biome, biomeKey) {
  const base = biome.flora.colors;
  if (kind === 'birch') return (biomeKey === 'autumn' ? ['#e8c840', '#f0d35a', '#d9a832'] : biomeKey === 'moon' ? ['#e6ecf6', '#cdd8ea', '#f4f7ff'] : ['#9ccf5a', '#b5d96a', '#88c04f']).map((h) => new THREE.Color(h));
  if (kind === 'shrub') return ['#8a8a4a', '#9a9455', '#7d7a40'].map((h) => new THREE.Color(h));
  if (kind === 'bush') return base.map((c) => c.clone().offsetHSL(0, 0, -0.06));
  const own = {
    dead: biomeKey === 'ember' ? ['#2e2622', '#3a302a', '#241e1a'] : ['#5a4a3a', '#4a3e32', '#6a5a48'],
    gear: ['#c9a04a', '#b8863a', '#d9b45a', '#a8703a', '#8a9a9a'],
    palm: ['#3f8f3a', '#4ea045', '#2f7d34'],
    fern: ['#4fa83f', '#5cb848', '#3f9a3a'],
    bamboo: ['#5a9a3a', '#6aaa45', '#4a8a32'],
    puff: ['#ffffff', '#f4f6ff', '#fff4fa'],
    flower: ['#ff6a8a', '#ffd23a', '#8a7aff', '#ff9a3a', '#ffffff'],
  }[kind];
  if (own) return own.map((h) => new THREE.Color(h));
  return base;
}

// Candidate ground spots: real mesh vertices, so nothing ever floats.
function groundSpots(top, r) {
  const spots = [];
  for (let k = 2; k < RINGS - 1; k++) spots.push(...top.rings[k]);
  return r.shuffle(spots);
}

// Where the rows of tea or lavender go (grounds.js): tea along the terraces' level
// lines, lavender in straight, gently waving rows; never in water, on steep ground,
// by the landmark or path, or under a tree.
function planBiomeRows(biome, shape, trees, blocked, r) {
  const keep = (x, z) => !shape.isWet(x, z, 0.25) && !blocked(x, z) && shape.radial(x, z) < 0.9
    && shape.slopeAt(x, z) < 0.5 && !trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 0.2);
  if (biome.rows === 'tea') {
    const points = planRows(shape, shape.terraceAt, [0.12, 0.3, 0.48], keep);
    return buildRows(points, shape, { kind: 'tea', colors: ['#245c28', '#2c6a2e', '#1f5224', '#336f30'], size: 0.2 }, r);
  }
  const yaw = r.range(0, TAU), c = Math.cos(yaw), s = Math.sin(yaw), wave = r.range(0.2, 0.45);
  const field = (x, z) => (x * c + z * s + wave * Math.sin((-x * s + z * c) * 0.35)) / 0.6;
  return buildRows(planRows(shape, field, [0], keep), shape, { kind: 'lavender', colors: ['#8a6ac8', '#9a78d6', '#7a5ab8', '#a088e0'], size: 0.15 }, r);
}

function placeFlora(top, shape, biome, r, blocked, count = biome.flora.count) {
  const noise = createNoise2D(r);
  const { groves } = biome.flora;
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

function buildFlora(placed, biome, biomeKey, r) {
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  const kinds = placed.map(() => r.weighted(TREE_SPECIES[biomeKey] ?? [[biome.flora.kind, 1]]));
  // On a storm crag the wind never lets up, so every tree leans downwind (the
  // way the grass gusts run), by an amount set by where it stands: no dice.
  const lean = biomeKey === 'stormcrag' && new THREE.Vector3(0.35, 0, -1).normalize();
  const poses = placed.map((v, i) => {
    const low = kinds[i] === 'bush' || kinds[i] === 'shrub';
    const size = low ? r.range(0.8, 1.3) : r.range(0.75, 1.35);
    const q = new THREE.Quaternion().setFromAxisAngle(up, r.range(0, TAU));
    if (lean) q.premultiply(new THREE.Quaternion().setFromAxisAngle(lean, (low ? 0.12 : 0.26) + Math.sin(v.x * 2.1 + v.z * 1.3) * 0.06));
    return {
      p: new THREE.Vector3(v.x, v.y - 0.05, v.z),
      q,
      s: new THREE.Vector3(size, size * r.range(0.9, kinds[i] === 'fir' ? 1.45 : 1.25), size),
    };
  });

  // One pair of instanced meshes per species; `where` maps a tree to its slot.
  const meshes = [], where = [];
  const byKind = new Map();
  kinds.forEach((kind, i) => byKind.set(kind, [...(byKind.get(kind) ?? []), i]));
  for (const [kind, indices] of byKind) {
    const geos = speciesGeometry(kind);
    const colors = speciesColors(kind, biome, biomeKey);
    const crown = new THREE.InstancedMesh(geos.crown, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), indices.length);
    const trunk = geos.trunk && new THREE.InstancedMesh(geos.trunk, new THREE.MeshStandardMaterial({ color: geos.trunkColor ?? '#6b4a2f', vertexColors: true, flatShading: true, roughness: 1 }), indices.length);
    indices.forEach((gi, li) => {
      const pose = poses[gi];
      m.compose(pose.p, pose.q, pose.s);
      crown.setMatrixAt(li, m);
      crown.setColorAt(li, c.copy(r.pick(colors)).offsetHSL(0, 0, (r() - 0.5) * 0.06));
      trunk?.setMatrixAt(li, m);
      where[gi] = { crown, trunk, li, kind };
    });
    for (const mesh of [crown, trunk]) {
      if (!mesh) continue;
      mesh.material.userData.wind = true;
      mesh.userData.indices = indices;
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
    }
  }

  const shakes = new Map();
  const tilt = new THREE.Quaternion();
  return {
    object: group,
    meshes,
    // Which tree a raycast hit, across all the species meshes.
    indexOf(hit) {
      return hit.object.userData.indices?.[hit.instanceId];
    },
    shake(i, t) {
      shakes.set(i, { t, axis: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize() });
    },
    crownTop(i) {
      return poses[i].p.clone().add(new THREE.Vector3(0, poses[i].s.y * CROWN_TOP[where[i].kind], 0).applyQuaternion(poses[i].q));
    },
    crownColor(i) {
      const color = new THREE.Color();
      where[i].crown.getColorAt(where[i].li, color);
      return color;
    },
    update(t) {
      if (!shakes.size) return;
      for (const [i, shake] of shakes) {
        const age = t - shake.t, pose = poses[i], slot = where[i];
        const angle = age > 1.4 ? 0 : Math.sin(age * 26) * 0.16 * (1 - age / 1.4) ** 2;
        m.compose(pose.p, tilt.setFromAxisAngle(shake.axis, angle).multiply(pose.q), pose.s);
        slot.crown.setMatrixAt(slot.li, m);
        slot.crown.instanceMatrix.needsUpdate = true;
        if (slot.trunk) {
          slot.trunk.setMatrixAt(slot.li, m);
          slot.trunk.instanceMatrix.needsUpdate = true;
        }
        if (age > 1.4) shakes.delete(i);
      }
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

// Where Wa's balloon ties up on a voyage (main.js): just off the rim, on the
// side with the most room from the islets, the landmark and the waterfall.
// It rolls no dice, so lands come out the same with or without it.
function pickMooring(shape, islets, landmark) {
  const avoid = islets.clickables.map((it) => it.position);
  if (landmark) avoid.push({ x: landmark.spot.x, z: landmark.spot.z });
  if (shape.river) avoid.push(shape.river.exit);
  let best = null;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const edge = RADIUS * shape.edgeScale(a);
    const x = Math.cos(a) * (edge + 1), z = Math.sin(a) * (edge + 1);
    const room = Math.min(Infinity, ...avoid.map((p) => Math.hypot(p.x - x, p.z - z)));
    if (!best || room > best.room) best = { a, edge, room };
  }
  const { a, edge } = best;
  const stake = { x: Math.cos(a) * edge * 0.9, z: Math.sin(a) * edge * 0.9 };
  stake.y = shape.heightAt(stake.x, stake.z);
  return { x: Math.cos(a) * (edge + 1), y: stake.y + 1.6, z: Math.sin(a) * (edge + 1), stake };
}

// `lanterns`: at the Edge of the Sky, each islet carries a lantern, and they light
// one after another once Wa's does (env.relit): the road of islands home.
function buildIslets(biome, r, lanterns = false) {
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
    if (lanterns) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 5).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: '#4a3526', flatShading: true }));
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), new THREE.MeshStandardMaterial({ color: '#3b3226', emissive: '#ffb347', emissiveIntensity: 0, flatShading: true }));
      post.position.set(-size * 0.45, 0.12, 0);
      lamp.position.set(-size * 0.45, 0.58, 0);
      islet.add(post, lamp);
      islet.userData.lamp = lamp;
    }
    islet.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    group.add(islet);
    items.push(islet);
  }
  let since = 0;
  return {
    object: group,
    clickables: items,
    update(t, dt, env) {
      since = env.relit ? since + dt : 0;
      items.forEach((it, i) => {
        if (!it.userData.lamp) return;
        const m = it.userData.lamp.material;
        m.emissiveIntensity += ((since > 1.2 + i * 0.8 ? 2.6 : 0) - m.emissiveIntensity) * Math.min(1, dt * 1.5);
      });
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
    scraps: { count: 50, size: 0.13, colors: ['#ffffff', '#f6efe0', '#e4ecff'], fall: true },
    embers: { count: 60, size: 0.13, colors: ['#ff8a3a', '#ffb84a', '#ff5a1f'], glow: 2.5, night: false },
    spores: { count: 60, size: 0.12, colors: ['#e8ffd0', '#fff2c0', '#d0f0ff'], glow: 1.6, night: false },
    wisps: { count: 16, size: 0.3, colors: ['#9dffb0', '#c8ffe0'], glow: 3, night: false },
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
      // The bank rolls in from upwind as the mist thickens.
      const away = (1 - env.mist) * 14;
      mist.position.set(-0.94 * away, 0, -0.33 * away);
      mist.rotation.y += dt * 0.01;
    },
  };
}

// Paths head for the middle of the lake and stop where the water begins.
function shoreToward(lake) {
  return { x: lake.x, z: lake.z };
}

function coastToward(shape, r, from) {
  const a = Math.atan2(from.z, from.x) + r.range(-1.2, 1.2);
  const d = RADIUS * shape.edgeScale(a) * 0.88;
  return { x: Math.cos(a) * d, z: Math.sin(a) * d };
}

// `want` (from a voyage's word, or the owner's #! link) can choose the biome and
// landmark and insist on water (or none) or a balloon; anything it leaves out
// is up to the seed as usual.
export function generateLand(seed, want = {}) {
  const meta = makeRandom(seed, 'biome');
  const rolledBiome = meta.weighted(Object.entries(BIOMES).filter(([, b]) => b.weight > 0).map(([key, b]) => [key, b.weight]));
  const biomeKey = want.biome ?? rolledBiome;
  const biome = tintBiome(BIOMES[biomeKey], meta);
  const shape = makeShape(seed, biome, want);

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
  // main.js fills these in, so taps can make a noise and the journal hears
  // about what you did and saw (`note('tree')`, `note('bats')`…).
  const hooks = { sound() {}, note() {} };

  // The landmark and what surrounds it come first, so trees and paint can make room.
  const mats = makeMaterials(biomeKey);
  const ctx = {
    shape, biome, biomeKey, mats, waterLevel: WATER_LEVEL,
    r: makeRandom(seed, 'landmark'),
    spots: groundSpots(top, makeRandom(seed, 'spots')),
  };
  // A hedge maze island lays out its maze first, and the landmark finds room beside it.
  const maze = biome.maze ? planMaze(shape, makeRandom(seed, 'maze')) : null;
  if (maze) ctx.keepOut = (x, z, radius) => maze.inside(x, z, radius * 0.8 + 0.3);
  // If the land can't fit the landmark it rolled, try the biome's others.
  // (`want.landmark: 'none'` leaves the land empty.)
  let landmark = null;
  const rolledLandmark = ctx.r.weighted(biome.landmark);
  const tries = want.landmark === 'none' ? [] : [want.landmark, rolledLandmark, ...biome.landmark.map(([name]) => name), 'campsite', 'stones'];
  for (const type of tries.filter(Boolean)) {
    landmark = buildLandmark(type, ctx);
    if (landmark) break;
  }
  const xr = makeRandom(seed, 'extras');
  let path = null, fields = null;
  if (landmark) {
    if (xr.chance(landmark.fields)) fields = planFields(ctx, xr, landmark);
    if (xr.chance(0.85)) path = planPath(ctx, xr, landmark.door, shape.lake ? shoreToward(shape.lake, landmark.door) : coastToward(shape, xr, landmark.door));
  }
  // No path or field through the hedges.
  if (maze && path?.pts.some((p) => maze.inside(p.x, p.z, 0.4))) path = null;
  if (maze && fields) fields = null;
  const blocked = (x, z) =>
    Boolean((landmark && Math.hypot(x - landmark.spot.x, z - landmark.spot.z) < landmark.radius)
      || (path && path.distTo(x, z) < 0.55)
      || (fields && fields.blocked(x, z))
      || (maze && maze.inside(x, z, 0.35)));

  const fr = makeRandom(seed, 'flora');
  // A town island (the Harbour) is mostly town: fewer trees, only there.
  const trees = placeFlora(top, shape, biome, fr, blocked, landmark?.type === 'town' ? Math.round(biome.flora.count * 0.4) : undefined);
  bakeOcclusion(top, shape, trees, landmark?.spot);

  // Rows of tea round the terraces, or lavender across the fields, between the trees.
  const rows = biome.rows ? planBiomeRows(biome, shape, trees, blocked, makeRandom(seed, 'rows')) : null;
  const overlay = (x, y, z) => (maze?.inside(x, z, 0.2) ? biome.path : null) ?? fields?.paint(x, z) ?? (path && path.distTo(x, z) < path.width ? biome.path : null);
  const ground = buildIslandMesh(top, under, shape, biome, makeRandom(seed, 'paint'), overlay);
  add(ground);
  const water = buildWater(top, shape, biome);
  add(water);
  add(buildWaterfall(shape, biome, makeRandom(seed, 'waterfall')));
  const hedgeMaze = maze && buildMaze(maze, shape, biome, makeRandom(seed, 'maze hedges'));
  add(hedgeMaze);
  add(rows);
  add(landmark);
  const lanterns = path && buildLanterns(ctx, path);
  add(lanterns);
  if (shape.lake && !biome.water.frozen && !biome.water.lava && (xr.chance(0.6) || landmark?.type === 'town')) add(buildDock(ctx, xr, landmark?.door ?? { x: 0, z: 0 }));
  if (landmark) add(buildProps(ctx, xr, landmark, trees));
  add(buildLightPools([...(landmark?.lights ?? []), ...(lanterns?.lights ?? [])], shape));

  const flora = buildFlora(trees, biome, biomeKey, fr);
  add(flora);
  const garden = buildGarden(biome);
  add(garden);
  const grass = buildGrass({ top, shape, biome, biomeKey, blocked, r: makeRandom(seed, 'grass'), waterLevel: WATER_LEVEL });
  add(grass);
  const details = buildDetails({
    top, under, shape, biome, biomeKey, trees, landmark, path, blocked,
    water: water?.ripple ? water.mesh : null, waterLevel: WATER_LEVEL, r: makeRandom(seed, 'details'),
  });
  add(details);
  add(bursts);
  add(buildTufts(top, shape, biome, makeRandom(seed, 'tufts'), blocked));
  if (biome.crystals) add(buildCrystals(top, shape, makeRandom(seed, 'crystals')));
  const islets = buildIslets(biome, makeRandom(seed, 'islets'), want.landmark === 'edge');
  add(islets);
  for (const kind of biome.ambient) add(buildAmbient(kind, top, shape, makeRandom(seed, `ambient:${kind}`)));
  add(buildGroundMist(top, shape, makeRandom(seed, 'mist')));
  const rollBalloon = xr.chance(0.15);
  const balloon = (want.balloon ?? rollBalloon) ? buildBalloon(xr, mats) : null;
  add(balloon);

  // Wildlife: birds, butterflies, bats and dragonflies in the air; rabbits and
  // deer on the ground; ducks and fish in the lake.
  const life = buildLife({
    top, shape, biome, biomeKey, blocked, bursts, r: makeRandom(seed, 'life'), fauna: makeRandom(seed, 'fauna'),
    water: water?.ripple ? water : null, waterLevel: WATER_LEVEL, sound: (kind) => hooks.sound(kind), note: (kind) => hooks.note(kind),
  });
  add(life);
  const fish = life.fish;

  // --- Things to tap ---
  const local = (hit) => group.worldToLocal(hit.point.clone());
  let now = 0;
  const clock = () => now;
  ground.userData.onClick = (hit) => {
    const at = local(hit);
    if (hit.face.normal.y > 0.35) {
      sendGust(at.x, at.z, clock());
      garden.plant(at, clock());
      hooks.sound('pop');
      hooks.note('flower');
      bursts.spawn(at, { count: 10, colors: lastEnv.snowCover > 0.4 ? ['#ffffff'] : ['#c9b48a', '#9c8a66'], speed: 0.6, up: 0.8, gravity: -3, life: 0.8 });
    } else {
      // Tapping the cliffs knocks a few chips loose.
      bursts.spawn(at, { count: 12, colors: ['#8a857c', '#5f5a54'], speed: 0.5, up: 0.2, gravity: -6, life: 1.6, drag: 0.5 });
      hooks.sound('chips');
    }
  };
  if (water?.ripple) {
    water.mesh.userData.onClick = (hit) => {
      const at = local(hit);
      water.ripple(at.x, at.z, clock());
      bursts.spawn(at, { count: 14, colors: ['#e8f6ff', '#ffffff'], speed: 0.5, up: 2.2, gravity: -9, life: 0.7, drag: 0.4 });
      fish?.jumpNear(at, clock());
      hooks.sound('splash');
      hooks.note('splash');
    };
  } else if (water) {
    water.userData.onClick = (hit) => {
      bursts.spawn(local(hit), { count: 12, colors: ['#ffffff'], glow: true, speed: 0.6, up: 0.5, gravity: -1, life: 1 });
      hooks.note('ice');
    };
  }
  for (const mesh of flora.meshes) {
    mesh.userData.onClick = (hit) => {
      const tree = flora.indexOf(hit);
      if (tree == null) return;
      flora.shake(tree, clock());
      hooks.sound('rustle');
      hooks.note('tree');
      const snowy = lastEnv.snowCover > 0.4;
      const color = flora.crownColor(tree);
      bursts.spawn(flora.crownTop(tree), {
        count: 20, colors: snowy ? ['#ffffff', '#eef3f8'] : [color, color.clone().offsetHSL(0, 0, 0.08)],
        speed: 1.1, up: 0.4, gravity: snowy ? -2.5 : -1.2, life: 2.2, drag: 2.2, spread: 0.5,
      });
    };
  }
  if (landmark) {
    landmark.object.userData.onClick = (hit) => {
      landmark.poke(clock());
      hooks.sound('chime');
      hooks.note('landmark');
      const cool = landmark.type === 'wizard' || landmark.type === 'stones';
      bursts.spawn(local(hit), { count: 26, colors: cool ? ['#9ff7ff', '#c9b6ff'] : ['#ffd27a', '#fff1c0'], glow: true, speed: 1.2, up: 1.4, gravity: -1.5, life: 1.4 });
    };
  }
  if (balloon) {
    balloon.object.userData.onClick = () => {
      balloon.lift();
      hooks.sound('whoosh');
    };
  }
  // The maze's hedges and the rows of tea or lavender rustle like trees (and count as trees on a voyage).
  for (const mesh of [hedgeMaze?.hedges, rows].filter(Boolean)) {
    mesh.userData.onClick = (hit) => {
      hooks.sound('rustle');
      hooks.note('tree');
      const color = biome.rows === 'lavender' ? new THREE.Color('#9a78d6') : biome.flora.colors[0];
      bursts.spawn(local(hit), {
        count: 16, colors: [color, color.clone().offsetHSL(0, 0, 0.08)],
        speed: 0.9, up: 0.8, gravity: -1.2, life: 1.8, drag: 2.2, spread: 0.3,
      });
    };
  }
  const clickables = [ground, water?.mesh ?? water, ...flora.meshes, hedgeMaze?.hedges, rows, landmark?.object, ...islets.clickables, balloon?.object, ...life.clickables].filter(Boolean);

  // Every standard material learns about cloud shadows, wetness and snow.
  group.traverse((o) => {
    for (const m of [o.material].flat()) if (m?.isMeshStandardMaterial) patchMaterial(m, { wind: m.userData.wind, grass: m.userData.grass });
  });

  return {
    group,
    biome,
    biomeKey,
    name: landName(makeRandom(seed, 'name')),
    landmark: landmark?.type ?? 'none',
    hasLake: Boolean(shape.lake),
    hasWaterfall: Boolean(shape.river),
    hasBalloon: Boolean(balloon),
    mooring: pickMooring(shape, islets, landmark),
    clickables,
    hooks,
    // What the soundscape should play here.
    sounds: {
      waterfall: Boolean(shape.river),
      lake: Boolean(water?.ripple),
      fire: landmark?.type === 'campsite',
      grassy: !['snowfield', 'desert'].includes(biomeKey),
    },
    // For lake reflections: the water itself, its height, and what to leave out
    // of the mirrored pass (small things that barely show but cost a lot twice).
    water: water?.ripple ? water.mesh : null,
    mirrorHide: [water?.mesh, grass?.object, details.object, life.object, garden.object, bursts.object].filter(Boolean),
    waterLevel() {
      return water.mesh.localToWorld(new THREE.Vector3(0, WATER_LEVEL, 0)).y;
    },
    setDetail(level) {
      grass?.setDetail(level);
    },
    update(t, dt, env) {
      now = t;
      lastEnv = env;
      // A tapped landmark lights its lamps for a while, day or night.
      env.poke = landmark ? landmark.boost(clock()) : 0;
      env.gloom = Math.max(env.gloom, env.poke);
      if (env.night > 0.6 && biome.ambient.includes('fireflies')) hooks.note('fireflies');
      updateMaterials(mats, env);
      for (const update of updaters) update(t, dt, env);
    },
  };
}
