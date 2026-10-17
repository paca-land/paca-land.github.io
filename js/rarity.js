import { BIOMES } from './world.js';
import { t } from './i18n.js';

// How rare a land is, from what it's made of: its biome, its landmark, its
// water and whether a balloon drifts by. The odds of each landmark and kind of
// water per biome were counted over 1,600 generated lands; they go stale only
// if the generator changes (then count again, see CLAUDE.md).

const BIOME_TOTAL = Object.values(BIOMES).reduce((sum, b) => sum + b.weight, 0);
const LANDMARK = {
  meadow: { cabin: 0.209, windmill: 0.18, village: 0.153, campsite: 0.14, castle: 0.127, lighthouse: 0.069, stones: 0.066, ruins: 0.056 },
  highlands: { castle: 0.29, cabin: 0.233, campsite: 0.172, lighthouse: 0.115, stones: 0.095, wizard: 0.095 },
  autumn: { cabin: 0.296, windmill: 0.183, campsite: 0.167, village: 0.163, castle: 0.097, wizard: 0.093 },
  desert: { ruins: 0.378, stones: 0.272, campsite: 0.261, castle: 0.089 },
  snowfield: { cabin: 0.358, castle: 0.214, lighthouse: 0.166, wizard: 0.15, campsite: 0.112 },
  blossom: { shrine: 0.503, village: 0.259, windmill: 0.127, cabin: 0.112 },
  dream: { wizard: 0.518, stones: 0.187, castle: 0.151, ruins: 0.144 },
};
const WATER = {
  meadow: { dry: 0.14, lake: 0.201, falls: 0.659 },
  highlands: { dry: 0.336, lake: 0.065, falls: 0.599 },
  autumn: { dry: 0.214, lake: 0.315, falls: 0.471 },
  desert: { dry: 0.561, lake: 0.439, falls: 0 },
  snowfield: { dry: 0.273, lake: 0.727, falls: 0 },
  blossom: { dry: 0.142, lake: 0.284, falls: 0.574 },
  dream: { dry: 0.137, lake: 0.209, falls: 0.655 },
};
const BALLOON = 0.15;
// Every percentile (0 to 100) of the scores those 1,600 lands got.
const PERCENTILES = [
  1.531, 1.531, 1.531, 1.531, 1.551, 1.551, 1.551, 1.576, 1.576, 1.616, 1.616, 1.616, 1.627, 1.627, 1.637, 1.637, 1.637,
  1.665, 1.687, 1.687, 1.722, 1.722, 1.722, 1.722, 1.725, 1.725, 1.768, 1.771, 1.771, 1.799, 1.799, 1.808, 1.819, 1.826,
  1.826, 1.837, 1.854, 1.854, 1.878, 1.897, 1.91, 1.914, 1.931, 1.932, 1.954, 1.971, 1.973, 1.973, 1.981, 2.001, 2.028,
  2.052, 2.065, 2.067, 2.079, 2.081, 2.106, 2.111, 2.111, 2.125, 2.129, 2.132, 2.133, 2.145, 2.172, 2.183, 2.202, 2.207,
  2.225, 2.241, 2.279, 2.284, 2.289, 2.305, 2.316, 2.329, 2.36, 2.362, 2.37, 2.381, 2.4, 2.418, 2.434, 2.44, 2.489, 2.548,
  2.561, 2.568, 2.591, 2.639, 2.668, 2.705, 2.755, 2.79, 2.833, 2.865, 2.882, 2.946, 3.076, 3.153, 3.829,
];
// The top 1%, 5%, 20% and 50% of lands.
const TIERS = [['legendary', 3.153], ['epic', 2.865], ['rare', 2.4], ['uncommon', 2.028], ['common', -Infinity]];

// For saying why: "castle · 9% of desert mesas".
const PLURAL = { meadow: 'meadows', highlands: 'highlands', autumn: 'autumn woods', desert: 'desert mesas', snowfield: 'snowfields', blossom: 'blossom vales', dream: 'dreamlands' };
const LANDMARK_NAMES = { stones: 'standing stones', wizard: "wizard's tower", none: 'no landmark' };
const WATER_NAMES = { falls: 'a waterfall', lake: 'a lake, no waterfall', dry: 'no lake' };
const percent = (p) => (p < 0.01 ? t('under 1%') : p < 0.1 ? `${+(p * 100).toFixed(1)}%` : `${Math.round(p * 100)}%`);

// { tier, rarerThan (percent of lands), score (higher is rarer), reasons (rarest first) }
export function landRarity(land) {
  const b = land.biomeKey;
  const water = land.hasLake ? (land.hasWaterfall ? 'falls' : 'lake') : 'dry';
  // Anything never seen in the count is at least as rare as one in a few hundred.
  const parts = [
    [BIOMES[b].label, BIOMES[b].weight / BIOME_TOTAL, 'lands'],
    [LANDMARK_NAMES[land.landmark] ?? land.landmark, LANDMARK[b]?.[land.landmark] || 0.003, PLURAL[b]],
    [WATER_NAMES[water], WATER[b]?.[water] || 0.003, PLURAL[b]],
    [land.hasBalloon ? 'a hot-air balloon' : 'no balloon', land.hasBalloon ? BALLOON : 1 - BALLOON, 'lands'],
  ];
  const score = -Math.log10(parts.reduce((odds, [, p]) => odds * p, 1));
  return {
    tier: TIERS.find(([, at]) => score >= at)[0],
    rarerThan: Math.min(99, PERCENTILES.filter((q) => q < score).length),
    score,
    reasons: parts.sort((x, y) => x[1] - y[1]).map(([what, p, of]) => `${t(what)} · ${t('{p} of {of}', { p: percent(p), of: t(of) })}`),
  };
}
