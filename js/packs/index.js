// Content packs: each new voyage island or building is one module in this folder
// (plus its Chinese in a .zh.js beside it), and the core modules merge them in at
// load: world.js, grass.js, life.js, landmarks.js, lexicon.js, tales.js,
// stories.js, voyage.js and journal.js each take the part they need. A pack
// imports only three.js and i18n.js; anything else it needs from the core
// arrives as an argument, so nothing here can import in a circle.
//
// Pack islands are voyage-only (world.js forces `weight: 0`), and buildings only
// stand on voyage-only islands, so ordinary lands and the rarity tables never
// change. To add one: write the module, add it below and in packs/zh.js, give
// both an import-map line in index.html, and run .claude/pack-check.js.
//
// An island pack: { id, island: { biome, species, grass, neighbours, furniture,
//   word, note, journal, trees, reach, air, vibe, arrive, hop, gather, taps, tapLabel, status } }
// A building pack: { id, building: { find, build, label, homes, word, note,
//   journal, event, arc, arrive, status } }
// A dressing: { id: <an existing voyage-only island>, dress: <furniture> }, which
//   gives an older island something of its own to see (a whale's skeleton, a tornado).
// (CLAUDE.md, "Content packs", says what each part does.)
import lotus from './lotus.js';
import pillars from './pillars.js';
import sunflower from './sunflower.js';
import geyser from './geyser.js';
import globe from './globe.js';
import lanterns from './lanterns.js';
import crater from './crater.js';
import jelly from './jelly.js';
import ferry from './ferry.js';
import apiary from './apiary.js';
import greenhouse from './greenhouse.js';
import puppets from './puppets.js';
import glassworks from './glassworks.js';
import station from './station.js';
import birds from './birds.js';
import whale from './whale.js';
import icefall from './icefall.js';
import stormeye from './stormeye.js';
import orchard from './orchard.js';

export const PACKS = [
  lotus, pillars, sunflower, geyser, globe, lanterns, crater, jelly,
  ferry, apiary, greenhouse, puppets, glassworks, station,
  birds, whale, icefall, stormeye, orchard,
];
export const ISLANDS = Object.fromEntries(PACKS.filter((p) => p.island).map((p) => [p.id, p.island]));
export const BUILDINGS = Object.fromEntries(PACKS.filter((p) => p.building).map((p) => [p.id, p.building]));
export const DRESSINGS = Object.fromEntries(PACKS.filter((p) => p.dress).map((p) => [p.id, p.dress]));
