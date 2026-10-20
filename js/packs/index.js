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
// both an import-map line in index.html, and run tools/pack-check.js.
//
// An island pack: { id, island: { biome, species, grass, neighbours, furniture,
//   word, note, journal, trees, reach, air, vibe, arrive, hop, gather, taps, tapLabel, status } }
// A building pack: { id, building: { find, build, label, homes, word, note,
//   journal, event, arc, arrive, status } }
// A dressing: { id: <an existing voyage-only island>, dress: <furniture> }, which
//   gives an older island something of its own to see (a whale's skeleton, a tornado).
// An omen { id, omen: { name, line, fromStart, ...hooks } }, a tool for the pack
//   { id, item: { icon, name, line, usable(g), use(g), ...hooks } } or a keepsake
//   { id, keepsake: { icon, name, line, ...hooks } }. These are mods: voyage.js asks
//   every mod in play (the voyage's omen, the keepsakes you carry, and every pack tool,
//   which check their own flags) at fixed points. Bending hooks get the value first
//   and return it changed: fuel(n, g, reading), surcharge(n, g), food(n, g),
//   holds(n, g, key), hush(speed, g), stay(hours, g), storms(odds, g), strange(chance, g),
//   used(words, g), freshPay(coins, g, kinds), hushBack(miles, g), muffled(false, g),
//   darkSafe(false, g). Telling hooks return a line, a value or nothing: begin(g),
//   takeoff(g, reading) (before the hop, its line told on landing), arrive(g, land),
//   hop(g, reading) ([miles, why]), note(g, reading) (in the word preview),
//   problem(g, reading) (why a word can't be said), gather(g, kind, gain, what)
//   (change a tree or water tap's gain; return a new label), noThanks(g, kind),
//   status(g) and marker(g) ({ at, icon, title } on the progress line).
// A module may hold several packs (an array), as omens.js, tools.js and keepsakes.js do.
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
import omens from './omens.js';
import tools from './tools.js';
import keepsakes from './keepsakes.js';

export const PACKS = [
  lotus, pillars, sunflower, geyser, globe, lanterns, crater, jelly,
  ferry, apiary, greenhouse, puppets, glassworks, station,
  birds, whale, icefall, stormeye, orchard,
  ...omens, ...tools, ...keepsakes,
];
export const ISLANDS = Object.fromEntries(PACKS.filter((p) => p.island).map((p) => [p.id, p.island]));
export const BUILDINGS = Object.fromEntries(PACKS.filter((p) => p.building).map((p) => [p.id, p.building]));
export const DRESSINGS = Object.fromEntries(PACKS.filter((p) => p.dress).map((p) => [p.id, p.dress]));
export const OMENS = Object.fromEntries(PACKS.filter((p) => p.omen).map((p) => [p.id, p.omen]));
export const ITEMS = Object.fromEntries(PACKS.filter((p) => p.item).map((p) => [p.id, p.item]));
export const KEEPSAKES = Object.fromEntries(PACKS.filter((p) => p.keepsake).map((p) => [p.id, p.keepsake]));
