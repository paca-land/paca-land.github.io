// Seeded randomness. A land is a pure function of its seed string,
// so the same link always grows the same world for everyone.

export function hashString(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

// mulberry32 with a few helpers hung off the generator.
// `stream` keeps subsystems independent: retuning the trees won't reshape the terrain.
export function makeRandom(seed, stream = '') {
  let a = hashString(`${seed}::${stream}`);
  const random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.range = (lo, hi) => lo + (hi - lo) * random();
  random.int = (lo, hi) => Math.floor(random.range(lo, hi + 1));
  random.pick = (list) => list[Math.floor(random() * list.length)];
  random.chance = (p) => random() < p;
  random.weighted = (entries) => {
    let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [item, w] of entries) {
      if ((roll -= w) <= 0) return item;
    }
    return entries[entries.length - 1][0];
  };
  random.shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  return random;
}

// 2D simplex noise, permuted by a seeded generator. Returns roughly [-1, 1].
export function createNoise2D(random) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const corner = (gi, x, y) => {
    let t = 0.5 - x * x - y * y;
    if (t <= 0) return 0;
    const g = GRAD[gi & 7];
    t *= t;
    return t * t * (g[0] * x + g[1] * y);
  };

  return (x, y) => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    return 70 * (
      corner(perm[ii + perm[jj]], x0, y0) +
      corner(perm[ii + i1 + perm[jj + j1]], x1, y1) +
      corner(perm[ii + 1 + perm[jj + 1]], x2, y2)
    );
  };
}

export function fbm(noise, x, y, octaves = 4) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

const NAME_START = [
  'Moss', 'Amber', 'Thistle', 'Fern', 'Willow', 'Ember', 'Frost', 'Lumen', 'Bramble', 'Juniper',
  'Sorrel', 'Wren', 'Opal', 'Drift', 'Cloud', 'Briar', 'Honey', 'Pebble', 'Larch', 'Marigold',
  'Tansy', 'Cobble', 'Sable', 'Heather', 'Quartz', 'Rowan', 'Saffron', 'Tide', 'Clover', 'Aster',
];
const NAME_END = [
  'brook', 'reach', 'hollow', 'fell', 'mere', 'wold', 'haven', 'spire', 'crest', 'dale',
  'moor', 'glen', 'holm', 'stead', 'combe', 'field', 'ridge', 'shore', 'wick', 'ford',
];

export function landName(random) {
  return random.pick(NAME_START) + random.pick(NAME_END);
}

const SEED_A = ['sleepy', 'quiet', 'golden', 'misty', 'tiny', 'wild', 'hidden', 'sunny', 'lost', 'velvet', 'windy', 'lucky', 'silver', 'mossy', 'brave', 'far'];
const SEED_B = ['otter', 'harbor', 'garden', 'comet', 'lantern', 'meadow', 'pebble', 'kettle', 'orchard', 'canyon', 'sparrow', 'glacier', 'tulip', 'cove', 'echo', 'maple'];

// Not seeded: the dice should land somewhere new every time.
export function randomSeed() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  return `${pick(SEED_A)}-${pick(SEED_B)}-${Math.floor(Math.random() * 100)}`;
}
