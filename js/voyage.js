import { readWord, mishear, loadWords, MEANINGS, RULES, SECRETS, WIND_WORDS } from './lexicon.js';
import { makeRandom } from './random.js';
import { BIOMES } from './world.js';
import { t, lang } from './i18n.js';
import {
  STORY, WA_NOTES, REACHES, reachOf, GATES, RIDDLES, OMENS, KEEPSAKES, CREW, DARES, TREASURE_WORDS, HUSH, SKY_EVENTS, aLetter, TRAITS, ITEMS,
} from './tales.js';
import { ARCS } from './stories.js';

// A voyage to the Edge of the Sky: every destination is a word you type (see
// lexicon.js for how the sky reads it). On each land you have a few hours to
// gather fuel and food and to visit whoever lives there; then you say the next
// word. Between lands, things happen (tales.js). It's saved as you go, so it can
// be put down and picked up again. Everything it says goes through t()
// (i18n.js); the words you type stay English.

const SAVE = 'paca-voyage'; // the voyage in progress
const BOOK = 'paca-language'; // what you've learned of the language, kept across voyages
const ALPHA = 'paca-alpha'; // this browser knows the password
// Drift is in alpha, for family: a door rather than a lock (it's right here in the source).
const PASSWORD = 'family';
const GOAL = 100; // miles to the Edge of the Sky (the last gate); the code calls them leagues
const STAY = 3; // hours to spend on each land
const STORM_WAIT = 2; // hours a storm takes to blow itself out (what's left of your stay first, then the clock)
const START = { fuel: 14, food: 6, hull: 5, glimmer: 0, lanterns: 1 };
const MAX = { fuel: 30, food: 10, hull: 5, lanterns: 3 };
const ICON = { fuel: '🔥', food: '🍞', hull: '❤️', glimmer: '🪙', lanterns: '🏮' };
const ROOM = 2; // passengers in the basket at once
const KEEP = 3; // keepsakes you can carry at once
const PACK = 4; // one-use tools in the pack at once
// Kinds of words the sky fair pays for.
const FEAST = ['feast', 'bread', 'sweet', 'harvest', 'tea', 'music'];
const SKY_EVENT_CHANCE = 0.45; // that something happens on the way
const LIGHT = ['sun', 'dawn', 'golden']; // meanings that drive the Hush back

// An hour spent shaking the trees, by kind of land.
const TREES = {
  meadow: [{ food: 2 }, t('fruit')], blossom: [{ food: 1, glimmer: 1 }, t('honey')], autumn: [{ fuel: 2, food: 1 }, t('kindling and nuts')],
  highlands: [{ fuel: 3 }, t('pinecones')], snowfield: [{ fuel: 2 }, t('pinecones')], desert: [{ food: 1, glimmer: 1 }, t('cactus fruit')],
  dream: [{ glimmer: 1, food: 1 }, t('starfruit')],
  mire: [{ food: 1, fuel: 1 }, t('bog myrtle and peat')], coral: [{ food: 2, glimmer: 1 }, t('sea grapes')],
  toadstool: [{ food: 2, glimmer: 1 }, t('mushrooms')], stormcrag: [{ fuel: 2 }, t('wind-dried wood')],
  glass: [{ glimmer: 2 }, t('glass fruit')], ember: [{ fuel: 3 }, t('charcoal')], gilded: [{ glimmer: 1, food: 1 }, t('golden pears')],
  jungle: [{ food: 2, fuel: 1 }, t('bananas and vines')], savanna: [{ fuel: 2, food: 1 }, t('dry branches and figs')],
  heath: [{ fuel: 2 }, t('heather and peat')], lavender: [{ glimmer: 1, fuel: 1 }, t('lavender to sell, and dry stalks')], cloudisle: [{ food: 1, glimmer: 1 }, t('cloudberries')],
  withered: [{ fuel: 3 }, t('dead wood')], sugar: [{ food: 3 }, t('sweets')],
  bamboo: [{ food: 1, fuel: 2 }, t('bamboo shoots and dry canes')], terraces: [{ glimmer: 1, food: 1 }, t('tea leaves to sell')],
  clockwork: [{ fuel: 2, glimmer: 1 }, t('spare cogs and lamp oil')], paper: [{ fuel: 3 }, t('paper to burn')],
  moon: [{ glimmer: 1, food: 1 }, t('moon dust and silverberries')], maze: [{ food: 2 }, t('hedge berries')], giant: [{ food: 3 }, t('a giant seed')],
  wreck: [{ fuel: 2 }, t('salvaged canvas and rope')], birds: [{ food: 2 }, t('eggs from the nests')], whale: [{ food: 2 }, t('barnacles and kelp')],
  icefall: [{ food: 1 }, t('frozen berries')], stormeye: [{ fuel: 1, food: 1 }, t('storm-snapped branches and nuts')], orchard: [{ food: 3 }, t('apples and pears')],
};
// The first time you meet each kind of creature on an island, it has a coin for you.
const THANKS = {
  rabbit: t('a rabbit leaves you a coin it found'),
  deer: t('a deer bows to you, and there’s a coin where it stood'),
  duck: t('a duck brings you a coin from the bottom of the pond'),
  sheep: t('a sheep lets you have a tuft of wool, with a coin tangled in it'),
  goat: t('a goat chews your sleeve, then spits out a coin'),
  squirrel: t('a squirrel swaps you a coin for nothing at all'),
  lizard: t('a lizard was sunning itself on a coin, and lets you have it'),
  penguin: t('a penguin presents you with a coin, very formally'),
  frog: t('a frog hops off a coin it was sitting on'),
  crab: t('a crab pinches your finger, then lets you keep the coin it was holding'),
  snail: t('a snail has left a silvery trail, with a coin at the end of it'),
  giraffe: t('a giraffe nibbles a coin out of a treetop for you'),
  panda: t('a panda rolls over, and there’s a coin underneath'),
};
const LANDMARK_LABEL = {
  cabin: t('a cabin'), castle: t('a castle'), windmill: t('a windmill'), lighthouse: t('a lighthouse'), wizard: t('a wizard’s tower'), village: t('a village'),
  campsite: t('a campsite'), ruins: t('ruins'), stones: t('standing stones'), shrine: t('a shrine'),
  observatory: t('an observatory'), teahouse: t('a teahouse'), post: t('a post office'), workshop: t('a balloon workshop'), bandstand: t('a bandstand'),
  inn: t('an inn'), fortune: t('a fortune teller’s tent'), shipwright: t('a shipwright’s yard'), bathhouse: t('a bathhouse'), clocktower: t('a clock tower'),
  edge: t('Wa’s stone'),
  town: t('the town'),
};
// The buildings the book's atlas counts (the town is home, so it isn't one to find).
const BUILDINGS = Object.keys(LANDMARK_LABEL).filter((id) => id !== 'town');
// The kind of word that calls each island or building, for sightings.
const ISLAND_WORD = Object.fromEntries(MEANINGS.filter((m) => m.effect.biome).map((m) => [m.effect.biome, m.id]));
const BUILDING_WORD = Object.fromEntries(MEANINGS.filter((m) => m.effect.landmark).map((m) => [m.effect.landmark, m.id]));
const SIGHTING_CHANCE = 0.35; // that an island shows you one you haven't reached
// The Harbour, where every voyage starts: your home town, the same every time.
const HOME = { biome: 'meadow', landmark: 'town', lake: true, balloon: false };
// The Edge of the Sky, the last island: one of a few legendary ones, picked by the
// word that gets you there, always with a lake, a waterfall over the rim and Wa's stone.
const EDGES = [{ biome: 'dream' }, { biome: 'cloudisle' }, { biome: 'moon' }, { biome: 'glass' }];
const WEATHER_LABEL = { clear: t('clear skies'), cloudy: t('clouds'), rain: t('rain'), snow: t('snow'), mist: t('mist'), storm: t('a storm') };
const SHRUG = t('That word means nothing special to the sky, so it made up an island of its own.');
// Some places sound far off and some close by: miles added to a hop, by meaning.
const PLACE_MILES = {
  lunar: [2, t('the moon is a long way up')], dream: [2, t('the stars are a long way off')], night: [1, t('the moon is far')], sea: [1, t('across the water')], trail: [1, t('a long road')],
  home: [-1, t('home is never far')], town: [-1, t('towns sit close together')], field: [-1, t('just over the hill')],
};
// The air you leave from: open, windy islands push you on; close, heavy air holds you back.
const AIR_MILES = { whale: 3, stormcrag: 2, highlands: 1, cloudisle: 1, heath: 1, savanna: 1, ember: 1, mire: -1, jungle: -1, toadstool: -1 };
const COLON = lang === 'zh' ? '：' : ': ';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const uncap = (s) => s.replace(/^./, (c) => c.toLowerCase());
const miles = (n) => (n === 1 ? t('1 mile') : t('{n} miles', { n }));
const hoursOf = (n) => (n === 1 ? t('1 hour') : t('{n} hours', { n }));
// "trees, water or a castle".
const orList = (items) => (items.length > 1 ? t('{list} or {last}', { list: items.slice(0, -1).join(t(', ')), last: items[items.length - 1] }) : items[0]);
const eats = (id) => (id === 'cook' ? t('eats nothing') : t('eats 1 🍞 a flight'));
const crewLine = (id) => t('{name}: {help}. Wants to reach {wish}, and will thank you there.', { name: CREW[id].name, help: CREW[id].help, wish: CREW[id].wish });
const offer = (id) => ({
  label: t('give {name} a ride {icon}', { name: CREW[id].name, icon: CREW[id].icon }), board: id,
  note: t('{help} · {eats} · wants {wish}', { help: CREW[id].help, eats: eats(id), wish: CREW[id].wish }),
});

// A building whose story you've finished (stories.js) does more for you.
const friend = (book, id) => Boolean(book.arcs?.[id]?.done);

// Who lives at each landmark, and what they offer for an hour of your time.
// `g` is the voyage as tales see it (talesView below). `first`: the first island
// of this kind on this voyage, where someone remembers Wa; `again`: a later one.
const EVENTS = {
  // Home, before you set off: your mother, and the quay.
  town: (r, book) => ({
    title: t('home'),
    text: book.found
      ? t('The quay is busy this morning. Wa waves from her window, and your mother is waiting by the balloon with a basket, the way she does every time now.')
      : t('Fishing boats knock against the quay and gulls argue on the roofs. Your mother is waiting by the balloon with a basket. She doesn’t say a word about Wa. She just checks your scarf, twice.'),
    options: [
      { label: t('take your mother’s basket'), gain: { food: 3 } },
      { label: t('fill the burner at the quay'), gain: { fuel: 3 } },
    ],
  }),
  cabin: (r, book, g, { first }) => ({
    title: t('a hermit’s cabin'),
    text: first ? t('The hermit looks at your balloon for a long time. “That’s Wa’s,” he says. “I used to fly in it. Come in.”')
      : r.pick([t('Smoke curls from the chimney, and the hermit waves you inside.'), t('The hermit is chopping wood. He nods at the door: soup’s on.')]),
    options: [
      { label: t('share the soup'), gain: friend(book, 'cabin') ? { food: 3, hull: 1 } : { food: 3 } },
      { label: g.run.hours % 24 >= 19 || g.run.hours % 24 < 5 ? t('sleep until morning') : t('get some sleep'), gain: { hull: 1 }, sleep: true, note: t('+1 ❤️ · sleep through any storm and wake at 7:00, ending your stay') },
    ],
  }),
  village: (r, book, g, { first }) => {
    const ware = g.unowned(r);
    const price = (n) => n - (friend(book, 'village') ? 1 : 0);
    const options = [
      { label: t('buy fuel'), pay: price(3), gain: { fuel: 6 } },
      { label: t('buy food'), pay: price(3), gain: { food: 4 } },
      { label: t('buy a lantern'), pay: price(4), gain: { lanterns: 1 } },
      { label: t('patch the balloon'), pay: price(5), gain: { hull: 1 } },
    ];
    if (ware) options.push({ label: t('buy the {name} {icon}', { name: KEEPSAKES[ware].name, icon: KEEPSAKES[ware].icon }), pay: price(6), keepsake: ware, hint: KEEPSAKES[ware].line });
    // A tool for the pack, when there's room for one.
    const tool = r.pick(Object.keys(ITEMS));
    if (g.packRoom) options.push({ label: t('buy the {name} {icon}', { name: ITEMS[tool].name, icon: ITEMS[tool].icon }), pay: price(6), item: tool, once: 'tool', hint: ITEMS[tool].line });
    if (g.room && !g.met('poet')) options.push(offer('poet'));
    if (g.gate && !g.gateKnown) options.push({ label: t('listen to the gossip'), gossip: true, note: t('what {gate} wants', { gate: g.gate.name }) });
    return {
      title: t('the village market'),
      text: first ? t('A busy little market. A stallholder spots your balloon: “Wa’s? She still owes me for a lantern.”')
        : r.pick([t('Striped awnings, and stalls selling everything from rope to raisins.'), t('A busy little market, loud with haggling.'), t('Market day. Someone is selling lanterns off a cart.')]),
      options,
    };
  },
  windmill: (r, book, g, { first }) => ({
    title: t('the windmill'),
    text: first ? t('“Wa used to buy two loaves and eat one before she’d even left,” says the miller.')
      : r.pick([t('The miller has loaves cooling on the sill.'), t('The miller is up to her elbows in flour. “Hungry?” she asks.'), t('The sails creak round. Inside, it smells of bread.')]),
    options: [{ label: t('help with the baking'), gain: { food: friend(book, 'windmill') ? 6 : 4 } }],
  }),
  castle: (r, book, g, { again }) => {
    const brought = g.flag('quests') ?? [];
    const letter = r.pick(['z', 'k', 'v', 'x', 'j', 'q', 'w', 'y'].filter((l) => !brought.includes(l))).toUpperCase();
    const options = [
      { label: t('accept the quest'), quest: letter.toLowerCase(), note: t('say a real word with {letter} in it, any time this voyage · +{coins} 🪙 +1 ❤️', { letter: aLetter(letter), coins: friend(book, 'castle') ? 10 : 6 }) },
      { label: t('bow and go'), gain: { glimmer: 1 } },
    ];
    if (g.room && !g.met('knight')) options.push(offer('knight'));
    return {
      title: t('the castle'),
      text: again ? t('“Back again?” says the queen. She’s still bored. “Bring me a word with {letter} in it, then.”', { letter: aLetter(letter) })
        : t('The queen yawns on her throne. “Bring me a word with {letter} in it,” she says, “and you shall be rewarded.”', { letter: aLetter(letter) }),
      options,
    };
  },
  lighthouse: (r, book, g, { first }) => ({
    title: t('the lighthouse'),
    text: first ? t('“Wa always took two,” says the keeper, and fills your lanterns. “At night they stop the sky from changing your words.”')
      : r.pick([
        t('The keeper fills your lanterns from the great lamp. At night, a lantern stops the sky from changing a letter of your word.'),
        t('The keeper is polishing the great lamp. He fills your lanterns without being asked.'),
      ]),
    options: [
      { label: t('take the lantern'), gain: { lanterns: friend(book, 'lighthouse') ? 2 : 1 } },
      ...(g.canSight ? [{ label: t('look out from the top'), sight: true, free: true, once: 'sight', note: t('an island you haven’t reached, and the words that lead there') }] : []),
    ],
  }),
  campsite: (r, book, g, { first }) => {
    const options = [
      { label: t('share their fire'), gain: { fuel: 3, food: 1 } },
      { label: t('listen to their stories'), teach: true, note: friend(book, 'campsite') ? t('learn what three kinds of words do') : t('learn what two kinds of words do') },
    ];
    const who = ['cook', 'cartographer'].filter((id) => !g.met(id));
    if (g.room && who.length) options.push(offer(r.pick(who)));
    return {
      title: t('the campsite'),
      text: first ? t('Travellers around a fire. One of them met Wa, years ago. “She sang to keep the silence off,” he says.')
        : r.pick([t('Travellers sit around the fire, swapping stories about words.'), t('A few tents and a fire. Somebody is playing a fiddle, badly.')]),
      options,
    };
  },
  ruins: (r, book, g, { first }) => {
    const options = [{ label: t('search the ruins'), gamble: true, note: friend(book, 'ruins') ? t('probably coins, maybe a keepsake') : t('probably coins, maybe a keepsake · or a falling stone (−1 ❤️)') }];
    if (g.flag('map') === 1) options.unshift({ label: t('look for the rest of the map'), mapHalf: true, note: t('ruins keep that sort of thing') });
    return {
      title: t('the ruins'),
      text: first ? t('Fallen columns, and on one of them, scratched small: WA WAS HERE. Something glints in the rubble.')
        : r.pick([t('Something glints between the fallen stones.'), t('Broken walls, half buried. Something glints under the rubble.')]),
      options,
    };
  },
  stones: (r, book, g, { first }) => {
    const letter = r.pick(['a', 'e', 'i', 'o', 'r', 's', 't', 'n', 'l']).toUpperCase();
    const ribbon = first ? ` ${t('Someone has tied a red ribbon round the tallest one. Wa always carried red ribbon.')}` : '';
    return {
      title: t('the standing stones'),
      text: `${t('The stones hum a single letter, over and over: {letter}.', { letter })}${ribbon}`,
      options: [{
        label: t('listen closely'), freeLetter: letter.toLowerCase(), gossip: friend(book, 'stones') && Boolean(g.gate),
        note: friend(book, 'stones') && g.gate ? t('your next word with {letter} in it flies free · and what the next gate wants', { letter: aLetter(letter) })
          : t('your next word with {letter} in it flies free', { letter: aLetter(letter) }),
      }],
    };
  },
  shrine: (r, book, g, { first }) => {
    const options = [
      { label: t('ring the bell'), gain: { hull: friend(book, 'shrine') ? 2 : 1 } },
      { label: t('ask for a blessing'), blessing: true, note: t('your next flight needs no food') },
    ];
    for (const l of g.run.banned) options.push({ label: t('ring the bell for the letter {letter}', { letter: l.toUpperCase() }), unban: l, note: t('win it back from the Hush') });
    return {
      title: t('the shrine'),
      text: first ? t('A small shrine. Someone has left flowers here, and a note in Wa’s handwriting: “for the road”.')
        : r.pick([t('A bell, a bowl of water, and a mat to rest on.'), t('A small shrine with a bell. It’s very quiet.')]),
      options,
    };
  },
  wizard: (r, book, g) => {
    const lost = g.run.banned.map((l) => ({ label: t('win back the letter {letter}', { letter: l.toUpperCase() }), unban: l, note: t('the wizard knows the Hush of old') }));
    const unknown = Object.keys(SECRETS).filter((w) => !book.secrets[w]);
    if (!unknown.length) {
      return { title: t('the wizard’s tower'), text: t('“You already know all of Wa’s words,” the wizard sighs, and presses some coins into your hand.'), options: [
        { label: t('thank her'), gain: { glimmer: 4 } }, ...lost,
      ] };
    }
    const word = r.pick(unknown);
    return {
      title: t('the wizard’s tower'),
      text: t('The wizard peers at your book. “Wa’s handwriting,” she says. “My worst pupil. She left a few of her words with me.” She leans close and says one softly: “{word}”. Say it, and {line}', { word, line: uncap(SECRETS[word].line) }),
      options: [{ label: t('remember it'), secret: word, note: t('it goes in the book, to say whenever you like') }, ...lost],
    };
  },
  inn: (r, book, g, { first }) => ({
    title: t('the inn'),
    text: first ? t('“Wa’s balloon!” says the innkeeper, wiping her hands on her apron. “She always had the room at the top of the stairs. We’ve kept it for her.”')
      : r.pick([t('The inn is warm and loud, and smells of soup.'), t('Somebody at the inn is playing a squeezebox, badly, and everybody is singing anyway.')]),
    options: [
      { label: t('take a room until morning'), ...(friend(book, 'inn') ? {} : { pay: 3 }), gain: { hull: 1 }, sleep: true, hint: t('sleep through any storm and wake at 7:00, ending your stay') },
      ...(g.gate && !g.gateKnown ? [{ label: t('listen to the regulars'), gossip: true, note: t('what {gate} wants', { gate: g.gate.name }) }] : []),
      { label: t('play dice with the regulars'), dice: true, disabled: g.run.glimmer < 3, note: t('a gamble: +5 🪙, or −3 🪙') },
    ],
  }),
  fortune: (r, book, g, { first }) => ({
    title: t('the fortune teller'),
    text: first ? t('“Wa’s balloon,” says the woman in the tent, before you’ve said a word. “I saw it coming. I always see it coming.” She shuffles a pack of cards with stars on the back. “I’m Madame Vell. Sit.”')
      : r.pick([t('Incense drifts out of the striped tent, and someone inside is humming.'), t('Madame Vell is polishing her crystal ball with her sleeve.')]),
    options: [
      ...(g.canSight ? [{ label: t('ask about the road ahead'), pay: 2, sight: true, once: 'sight', hint: t('an island you haven’t reached, and the words that lead there') }] : []),
      { label: t('change your luck'), pay: friend(book, 'fortune') ? 3 : 5, omen: true, once: 'omen', hint: t('a new omen for the rest of the voyage') },
    ],
  }),
  shipwright: (r, book, g, { first }) => ({
    title: t('the shipwright’s yard'),
    text: first ? t('“Now there’s a basket,” says the shipwright, running a hand along its rim. “Built it myself, forty years back, for a woman called Wa. I’m Bosun Tarrant. What can I do for her grandchild?”')
      : r.pick([t('Hammers ring in the shipwright’s yard, and the air smells of sawdust and tar.'), t('The shipwright is up a ladder, cheerfully telling a crane what he thinks of it.')]),
    options: [
      ...(g.flag('burner') ? [] : [{ label: t('fit a bigger burner'), pay: friend(book, 'shipwright') ? 5 : 8, burner: true, hint: t('it holds 10 more 🔥 for the rest of the voyage') }]),
      ...(g.flag('brace') ? [] : [{ label: t('brace the basket'), pay: 6, brace: true, hint: t('the next two tears are stopped') }]),
      { label: t('help in the yard'), gain: { fuel: 3 } },
    ],
  }),
  bathhouse: (r, book, g, { first }) => ({
    title: t('the bathhouse'),
    text: first ? t('Steam rolls out of the bathhouse door. “Wa used to come here to thaw out after the Thin Air,” says the bath-keeper, handing you a towel. “She’d sit in the hot pool and sing.”')
      : r.pick([t('The hot pool steams in the cold air, and the bath-keeper waves you in.'), t('Someone in the hot pool is asleep with a towel on their head.')]),
    options: [
      { label: t('a long soak'), gain: { hull: friend(book, 'bathhouse') ? 3 : 2 }, hours: 2, disabled: g.run.hull >= MAX.hull, hint: t('two hours') },
      { label: t('stoke the boilers'), gain: { glimmer: 2 } },
    ],
  }),
  clocktower: (r, book, g, { first }) => ({
    title: t('the clock tower'),
    text: first ? t('The clockmaker comes down the tower stairs two at a time. “Wa’s balloon! She set her watch by this clock every time she came through.” He frowns up at it. “It’s run slow since she stopped coming.”')
      : r.pick([t('The great clock ticks, loud enough to feel in your teeth.'), t('The clockmaker is oiling the gears with a feather.')]),
    options: [
      ...[[6.5, t('set the great clock for dawn'), t('at dawn')], [12.5, t('set it for noon'), t('at noon')], [19.4, t('set it for dusk'), t('at dusk')], [0, t('set it for midnight'), t('at midnight')]]
        .map(([h, label, when]) => ({ label, clock: h, when, once: 'clock', free: true, hint: t('you’ll reach the next island {when}', { when }) })),
      { label: t('wind the clock'), gain: { glimmer: 2 } },
    ],
  }),
  // Wa's stone, on the last island (the last card follows on its own).
  edge: (r, book) => ({
    title: t('Wa’s stone'),
    text: book.found ? t('The flat stone where Wa waited all those years. Her lantern is lit again.') : t('A flat stone worn smooth, a folded blanket, a teacup, and a lantern that went out long ago.'),
    options: [],
  }),
  // The buildings of the stranger islands. An offer marked `once` can be taken
  // once per island.
  observatory: (r, book, g, { first }) => {
    const n = friend(book, 'observatory') ? 3 : 2;
    return {
      title: t('the observatory'),
      text: first ? t('“Wa’s balloon!” says the professor, looking at it through the wrong end of a telescope. “She always stopped to ask me about the weather. I was nearly always right.”')
        : r.pick([t('The dome creaks round on its rails. Inside, the professor is muttering at the sky.'), t('Star charts cover every wall, and the professor is asleep at his desk with a pencil behind his ear.')]),
      options: [
        {
          label: t('bring the professor some supper'), gain: { food: -1 }, calm: n, once: 'calm', disabled: g.run.food < 1,
          note: t('−1 🍞 · fair weather for the next {n} islands', { n }),
        },
        { label: t('help with the star charts'), gain: { fuel: 3 } },
        ...(g.canSight ? [{ label: t('look through the telescope'), sight: true, free: true, once: 'sight', note: t('an island you haven’t reached, and the words that lead there') }] : []),
      ],
    };
  },
  teahouse: (r, book, g, { first }) => ({
    title: t('the teahouse'),
    text: first ? t('“Wa’s balloon,” says the woman who keeps the teahouse, and sets out two cups before you’ve sat down. “I’m Auntie Plum. Wa always stayed for another pot.”')
      : r.pick([t('Steam drifts out of the teahouse, and somebody inside is laughing.'), t('The woman who keeps the teahouse is pouring tea from a great height without spilling a drop.')]),
    options: [
      { label: t('stay for another pot'), stay: 2, free: true, once: 'pot', note: t('+2 hours on this island') },
      { label: t('order the dumplings'), ...(friend(book, 'teahouse') ? {} : { pay: 2 }), gain: { food: 4 } },
    ],
  }),
  post: (r, book, g, { first }) => {
    const n = friend(book, 'post') ? 7 : 5;
    const options = [
      { label: t('ask if there’s any post for you'), parcel: n, once: 'parcel', note: t('a parcel from home: +{n} 🍞, 🔥 or 🪙, and now and then a keepsake', { n }) },
      { label: t('help sort the post'), gain: { glimmer: 2 } },
    ];
    if (g.gate && !g.gateKnown) options.push({ label: t('ask the postmistress for the news'), gossip: true, note: t('what {gate} wants', { gate: g.gate.name }) });
    return {
      title: t('the post office'),
      text: first ? t('“Wa’s balloon?” The postmistress looks up from her sorting. “She never once left a forwarding address. There might be something here for you, though.”')
        : r.pick([t('Pigeons come and go from the loft, and the postmistress is stamping letters as fast as she can.'), t('There’s a queue of one, and it’s a goat. The postmistress waves you past it.')]),
      options,
    };
  },
  workshop: (r, book, g, { first }) => ({
    title: t('the balloon workshop'),
    text: first ? t('“So that’s where Wa’s balloon got to,” says the old woman in the shed, without looking up from her sewing. “Bring it here and let me look at it.”')
      : r.pick([t('Somebody in the shed is singing through a mouthful of pins.'), t('Bolts of striped cloth are stacked by the door, and an old woman is up the scaffold with a needle.')]),
    options: [
      { label: t('have the balloon patched'), pay: friend(book, 'workshop') ? 2 : 4, gain: { hull: 2 } },
      { label: t('help with the sewing'), gain: { glimmer: 3 } },
    ],
  }),
  bandstand: (r, book, g, { first }) => {
    const n = friend(book, 'bandstand') ? 9 : 6;
    const options = [
      { label: t('sit in for the drummer'), gain: { glimmer: 2 } },
      { label: t('share the band’s picnic'), gain: { food: 3 } },
    ];
    if (g.run.hush !== null) options.unshift({ label: t('ask for something loud'), loud: n, once: 'loud', note: t('the Hush falls back {miles}', { miles: miles(n) }) });
    return {
      title: t('the bandstand'),
      text: first ? t('The bandmaster sees your balloon and lowers his baton. “Wa’s! The last time she came through, she asked for the loudest thing we had,” he says. “Said something was catching her up.”')
        : r.pick([t('The band is tuning up, which sounds a lot like the band playing.'), t('A brass band in red coats under a striped roof, playing to an audience of three sheep.')]),
      options,
    };
  },
};

// What's in a parcel at the post office: mostly something useful from home.
function parcelOf(n) {
  return [{ food: n }, { fuel: n }, { glimmer: n }][Math.floor(Math.random() * 3)];
}

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// Sentences are joined with spaces, which Chinese doesn't put between them.
const tidy = (text) => (lang !== 'zh' ? text : String(text)
  .replace(/([。！？：”）])\s+(?=[\u2e80-\u9fff\uff00-\uffef“‘《])/g, '$1')
  .replace(/([。！？”）])(?=[+−\p{Extended_Pictographic}])/gu, '$1 '));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = tidy(text);
  return node;
}

const gainText = (gain) => Object.entries(gain).filter(([, n]) => n).map(([k, n]) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${ICON[k]}`).join(' ');
const clock = (h) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const meaning = (id) => MEANINGS.find((m) => m.id === id);
// A few example words of a kind: three different words, not three forms of one (tea, teas…).
function examplesOf(m, n = 3) {
  const like = (a, b) => a.startsWith(b.slice(0, Math.max(3, b.length - 2))) || b.startsWith(a.slice(0, Math.max(3, a.length - 2)));
  const examples = [];
  for (const w of m.words) if (examples.length < n && !examples.some((e) => like(e, w))) examples.push(w);
  return examples;
}
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];

// A fresh voyage, with its omen and the riddles its gates will ask.
function newRun() {
  const omen = pickOf(Object.keys(OMENS));
  const riddles = GATES.map((gate) => pickOf(Object.keys(RIDDLES).filter((id) => RIDDLES[id].tier === gate.tier && RIDDLES[id].not !== omen)));
  return {
    ...START, fuel: START.fuel + (omen === 'vowels' ? 8 : 0), hull: omen === 'gilded' ? 4 : START.hull,
    leagues: 0, hours: 6.5, day: 1, words: [], used: [], here: null, stay: STAY,
    quest: null, questDone: false, freeLetter: null, freeNext: false, blessing: false, calm: 0, waited: false, met: [], lands: {},
    omen, riddles, gates: 0, reach: 0, hush: null, banned: [], keepsakes: [], crew: [], crewMet: [], dare: null,
    flags: {}, events: [], seen: [], patched: false, delivered: 0, darkWords: 0, sighting: null, rough: 0, pack: [], lucky: null,
  };
}

// `api`: fly(seed), leave(), setClock(hours), clearStorm(), toast(emoji, text).
export function createVoyage(api) {
  const book = { meanings: {}, rules: {}, secrets: {}, voyages: [], islands: {}, buildings: {}, sighted: {}, keepsakes: {}, crew: {}, omens: {}, pages: {}, arcs: {}, found: false, ...store.get(BOOK, {}) };
  // Books from before buildings were kept: a building whose story you began, you've been to.
  for (const id of Object.keys(book.arcs)) book.buildings[id] ??= 1;
  if (book.found) book.buildings.edge ??= 1;
  book.edges ??= book.voyages.filter((v) => v.won).length;
  // A saved voyage, if any (not active until resumed). Older saves get the newer fields.
  const saved = store.get(SAVE, null);
  let run = saved && { ...newRun(), ...saved };
  if (saved && saved.gates === undefined) {
    // Saved before there were gates: the ones behind you count as passed.
    run.gates = GATES.filter((gate) => gate.at <= saved.leagues).length;
    run.reach = reachOf(saved.leagues);
  }
  // Riddles that no longer exist get a fresh one of the same tier.
  if (run) run.riddles = run.riddles.map((id, i) => (RIDDLES[id] ? id : pickOf(Object.keys(RIDDLES).filter((k) => RIDDLES[k].tier === GATES[i].tier))));
  let active = false;
  let state = 'off'; // 'land', 'flying', 'event' or 'over'
  let env = null;
  let pending = null; // what the last tap gave, to show where you tapped
  let finale = false;
  // After the last card, looking round the Edge: 'wa' (flying her home) or 'home'.
  let lingering = null;
  let winTimer = 0; // the last card, a moment after reaching the Edge

  // --- Elements -------------------------------------------------------------
  const hudTop = document.querySelector('.hud-top');
  const hudBottom = document.querySelector('.hud-bottom');
  const hint = document.querySelector('#hint');
  const input = document.querySelector('#seed-input');
  const flyButton = document.querySelector('#visit .primary');
  const freePlaceholder = input.placeholder;
  // The time & weather button: on a voyage its panel only sets the quality.
  const tweak = document.querySelector('#tweak');
  const freeTweak = [tweak.title, tweak.getAttribute('aria-label')];

  const pill = el('button', 'sail-pill');
  pill.type = 'button';
  const gauges = el('div', 'voyage-gauges');
  const aboardRow = el('div', 'voyage-gauges voyage-aboard');
  gauges.hidden = aboardRow.hidden = true;
  // The gauges explain themselves: hover one (or tap it) for what it is, how
  // much you have, and how it's lost and found.
  const tip = el('div', 'rarity-why voyage-tip');
  tip.hidden = true;
  hudTop.append(pill, gauges, aboardRow, tip);
  const progress = el('div', 'voyage-progress');
  const progressFill = el('div', 'voyage-progress-fill');
  progress.append(progressFill);
  for (const gate of GATES.slice(0, -1)) {
    const mark = el('span', 'voyage-gate-mark');
    mark.style.left = `${(gate.at / GOAL) * 100}%`;
    progress.append(mark);
  }
  progress.hidden = true;
  document.body.append(progress);
  const card = el('div', 'panel voyage-card');
  const bookPanel = el('div', 'panel journal voyage-book');
  const read = el('div', 'voyage-read');
  const status = el('div', 'voyage-status');
  for (const node of [card, bookPanel, read, status]) node.hidden = true;
  hudBottom.insertBefore(card, document.querySelector('#journal'));
  hudBottom.insertBefore(bookPanel, document.querySelector('#journal'));
  hudBottom.insertBefore(read, hint);
  hudBottom.insertBefore(status, hint);

  // On a phone an island's news folds to its first lines once you reach for the
  // island, and a tap opens it again (only small screens fold it: main.css).
  read.addEventListener('click', () => {
    if (read.dataset.kind === 'story') read.classList.toggle('folded');
  });
  addEventListener('pointerdown', (event) => {
    if (event.target instanceof HTMLCanvasElement && read.dataset.kind === 'story') read.classList.add('folded');
  }, { passive: true });

  pill.addEventListener('click', () => (run ? resume() : intro()));
  showPill();

  // --- Saving ---------------------------------------------------------------
  const save = () => store.set(SAVE, run);
  const saveBook = () => store.set(BOOK, book);
  const toast = (emoji, text) => api.toast(emoji, text);

  function showPill() {
    pill.hidden = active;
    pill.textContent = run ? t('⛵ continue your voyage · {done} of {goal} miles', { done: run.leagues, goal: GOAL }) : book.found ? t('⛵ fly to the Edge for Wa') : t('⛵ follow Wa to the Edge of the Sky');
  }

  function enter() {
    active = true;
    document.body.classList.add('voyaging');
    // On a phone the word shares its row with the buttons, so the hint is short.
    input.placeholder = matchMedia('(max-width: 520px)').matches ? t('say a word…') : t('type a word to fly there');
    flyButton.textContent = t('fly');
    tweak.title = t('quality');
    tweak.setAttribute('aria-label', t('quality'));
    for (const node of [gauges, aboardRow, progress, status]) node.hidden = false;
    showPill();
    hud();
    // The word list, for riddles, dares and quests; once it's in, the preview catches up.
    loadWords().then(() => {
      if (active && state === 'land') preview(input.value);
    });
  }

  function exit() {
    clearTimeout(winTimer);
    active = false;
    state = 'off';
    document.body.classList.remove('voyaging');
    input.placeholder = freePlaceholder;
    flyButton.textContent = t('visit');
    [tweak.title] = freeTweak;
    tweak.setAttribute('aria-label', freeTweak[1]);
    for (const node of [gauges, aboardRow, progress, status, read, card, bookPanel]) node.hidden = true;
    hideTip();
    showPill();
  }

  // --- Starting, pausing, ending ---------------------------------------------
  function intro() {
    if (!store.get(ALPHA, false)) return askPassword();
    loadWords(); // while the story's being read
    openCard({
      title: book.found ? t('back to the sky') : t('Wa’s balloon'),
      text: STORY.intro(GOAL, book.found),
      options: [
        { label: t('set sail'), primary: true, act: begin },
        { label: t('not now'), act: closeCard },
      ],
    });
  }

  // The alpha's door: the password once per browser, then never again. (A
  // voyage already under way doesn't ask.)
  function askPassword() {
    const field = el('input', 'voyage-password');
    Object.assign(field, { type: 'text', autocomplete: 'off', spellcheck: false, placeholder: t('the password') });
    const wrong = el('p', 'voyage-text voyage-wrong', t('That’s not it. Ask whoever sent you the link.'));
    wrong.hidden = true;
    const knock = () => {
      if (field.value.trim().toLowerCase() === PASSWORD) {
        store.set(ALPHA, true);
        return intro();
      }
      wrong.hidden = false;
      field.classList.remove('shake');
      void field.offsetWidth;
      field.classList.add('shake');
      field.select();
    };
    openCard({
      title: t('a password, please'),
      text: [t('Drift is still being built, and for now only family is aboard. What’s the password?')],
      options: [
        { label: t('set sail'), primary: true, act: knock },
        { label: t('not now'), act: closeCard },
      ],
    });
    const options = card.querySelector('.voyage-options');
    card.insertBefore(field, options);
    card.insertBefore(wrong, options);
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') knock();
    });
    field.focus();
  }

  // What people call you: the name you signed in the harbour master's logbook, or
  // Ca, which is what Wa called you.
  const you = () => book.name || STORY.nickname;

  // Who's flying Wa's balloon? Asked once, before the first voyage.
  function signLogbook() {
    const field = el('input', 'voyage-password');
    Object.assign(field, { type: 'text', autocomplete: 'off', spellcheck: false, maxLength: 16, placeholder: STORY.logbook.placeholder });
    const sign = (name) => {
      book.name = name.replace(/\s+/g, ' ').trim().slice(0, 16);
      book.named = true;
      saveBook();
      begin();
    };
    openCard({
      title: STORY.logbook.title,
      text: [STORY.logbook.text],
      options: [
        { label: STORY.logbook.sign, primary: true, act: () => sign(field.value) },
        { label: STORY.logbook.plain, act: () => sign('') },
      ],
    });
    card.insertBefore(field, card.querySelector('.voyage-options'));
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') sign(field.value);
    });
    field.focus();
  }

  function begin() {
    closeCard();
    if (!book.named) return signLogbook();
    run = newRun();
    // Each time you reach the Edge, the sky is a notch rougher on the next voyage (up to three).
    run.rough = Math.min(3, book.edges);
    // A lucky-letter voyage has its letter (a common one, so it can be used).
    if (run.omen === 'lucky') run.lucky = pickOf([...'aeiorstnlcdmpbg']);
    book.omens[run.omen] ??= Date.now();
    book.pages.last ??= Date.now();
    saveBook();
    enter();
    // One thing for the road, from the harbour master's chest.
    const chest = Object.keys(KEEPSAKES).sort(() => Math.random() - 0.5).slice(0, 3);
    openCard({
      title: t('the harbour master'),
      text: [STORY.harbor(book.found, you()), omenLine()],
      options: chest.map((id) => ({
        label: t('the {name} {icon}', { name: KEEPSAKES[id].name, icon: KEEPSAKES[id].icon }),
        note: KEEPSAKES[id].line,
        act: () => {
          giveKeepsake(id);
          depart(readWord('harbour'), { first: true });
        },
      })),
    });
  }

  function resume() {
    if (!run?.here) return begin();
    enter();
    finale = run.leagues >= GOAL;
    state = 'flying';
    hud();
    api.fly(`~${run.here.word}`);
  }

  // Put it down: the voyage stays saved, and the pill brings it back.
  function setAside() {
    save();
    exit();
    api.leave();
  }

  function end() {
    store.set(SAVE, null);
    run = null;
    finale = false;
    lingering = null;
    exit();
    api.leave();
  }

  // What the voyage made you, for the last card and the book: [title, why]. The
  // title is kept in English (the book stores it) and translated when shown.
  function titleOf() {
    if (run.delivered >= 2) return ['a friend to strangers', t('you carried {n} passengers home', { n: run.delivered })];
    if (run.darkWords >= 3) return ['a daredevil', t('you said {n} dark words', { n: run.darkWords })];
    if (run.keepsakes.length >= 4) return ['a collector', t('you gathered {n} keepsakes', { n: run.keepsakes.length })];
    if (run.banned.length >= 2) return ['a survivor of the Hush', t('it took letters from you, and you went on anyway')];
    if (run.seen.length >= 14) return ['a wordsmith', t('you used {n} kinds of words', { n: run.seen.length })];
    if (run.glimmer >= 30) return ['a treasure hunter', t('you kept {n} coins', { n: run.glimmer })];
    return ['a sky-sailor', ''];
  }

  function record(won) {
    book.voyages.unshift({
      words: run.words, leagues: run.leagues, glimmer: run.glimmer, day: run.day, won, at: Date.now(),
      omen: run.omen, title: won ? titleOf()[0] : null, keepsakes: run.keepsakes,
    });
    book.voyages = book.voyages.slice(0, 12);
    saveBook();
    store.set(SAVE, null);
  }

  // What you can tell Wa about Tobias at the Edge, if you've heard the hermit's story.
  function tobiasNews() {
    const cabin = book.arcs.cabin;
    if (cabin?.picks?.[2] === 0) return 'goggles';
    return (cabin?.ch ?? 0) >= 2 ? 'waiting' : null;
  }

  function win() {
    if (!active || state === 'over') return;
    state = 'over';
    status.replaceChildren();
    const [title, why] = titleOf();
    const found = book.found;
    book.found = true;
    // The postmistress's letters (stories.js) reach Wa in whichever ending comes first.
    const letters = friend(book, 'post') && !book.lettersGiven;
    if (letters) book.lettersGiven = true;
    book.edges = (book.edges ?? 0) + 1;
    record(true);
    // The voyage is over: a reload mustn't land you back here and count it twice.
    store.set(SAVE, null);
    const crew = run.crew.map((id) => CREW[id].name);
    // A few of your words, for Wa to read back.
    const yours = run.words.slice(1);
    const some = [...new Set([0, Math.floor(yours.length / 3), Math.floor((2 * yours.length) / 3), yours.length - 1])].map((i) => yours[i]).filter(Boolean);
    const how = { title: t(title), why, n: run.words.length - 1, day: run.day };
    openCard({
      title: t('the Edge of the Sky'),
      text: [
        ...STORY.edge({ said: run.here.said, words: some.map((w) => `“${w}”`).join(lang === 'zh' ? '……' : '… '), found, name: book.name, tobias: tobiasNews(), letters }),
        why ? t('You reached the Edge in {n} words, on day {day}, and the sky will remember you as {title} ({why}).', how) : t('You reached the Edge in {n} words, on day {day}, and the sky will remember you as {title}.', how),
        crew.length > 1 ? t('{a} and {b} were with you at the end.', { a: cap(crew[0]), b: crew[1] })
          : crew.length ? t('{a} was with you at the end.', { a: cap(crew[0]) }) : '',
        ...STORY.home(),
      ].filter(Boolean),
      poem: run.words.slice(1),
      options: [
        { label: t('sail again'), primary: true, act: () => { end(); intro(); } },
        { label: t('stay a while'), note: t('look round the Edge, then fly home'), act: () => linger(found ? 'home' : 'wa') },
        { label: t('back to the islands'), act: end },
      ],
    });
  }

  // After the last card: the Edge is yours to look round for as long as you like.
  function linger(who) {
    closeCard();
    lingering = who;
    gauges.hidden = aboardRow.hidden = read.hidden = true;
    hud();
  }

  function lose(why) {
    if (state === 'over') return;
    state = 'over';
    status.replaceChildren();
    record(false);
    openCard({
      title: t('lost in the clouds'),
      text: [t('{why} You sink into the sea of clouds, {miles} short of the Edge, and drift slowly home.', { why, miles: miles(Math.max(0, GOAL - run.leagues)) }), STORY.lost(book.found)],
      poem: run.words.slice(1),
      options: [
        { label: t('sail again'), primary: true, act: () => { end(); intro(); } },
        { label: t('back to the islands'), act: end },
      ],
    });
  }

  // --- Resources and time ------------------------------------------------------
  const has = (id) => run.keepsakes.includes(id);
  const aboard = (id) => run.crew.includes(id);

  // How much a store holds (a bigger burner from the shipwright holds 10 more fuel).
  const holds = (k) => (k === 'fuel' && run.flags.burner ? MAX.fuel + 10 : MAX[k]);

  // Returns what actually changed (stores have limits; a gilded sky doubles glimmer).
  function give(gain) {
    const got = {};
    for (const [k, n0] of Object.entries(gain)) {
      const n = k === 'glimmer' && n0 > 0 && run.omen === 'gilded' ? n0 * 2 : n0;
      if (!n) continue;
      const before = run[k];
      run[k] = Math.max(0, Math.min(holds(k) ?? Infinity, run[k] + n));
      if (run[k] !== before) got[k] = run[k] - before;
    }
    return got;
  }

  // Which stores were already full, as " · 🍞 full (12)", for a gain that came to less than it was.
  const fullNote = (gain, got) => Object.keys(gain).filter((k) => gain[k] > 0 && !(got[k] > 0) && holds(k) && run[k] >= holds(k))
    .map((k) => ` · ${t('{icon} full ({max})', { icon: ICON[k], max: holds(k) })}`).join('');
  const gotText = (gain, got) => `${gainText(got)}${fullNote(gain, got)}`.replace(/^ · /, '');

  // Damage to the balloon; returns how much it really took. The balloonist
  // patches the first tear of every flight.
  function harm(n, why) {
    if (n <= 0) return 0;
    if (aboard('balloonist') && !run.patched) {
      run.patched = true;
      n--;
      toast('🎈', t('the balloonist patches the tear'));
    }
    if (run.flags.brace > 0 && n > 0) {
      run.flags.brace--;
      n--;
      toast('🪵', t('the braced basket holds'));
    }
    if (!n) return 0;
    run.hull -= n;
    if (why) toast('💔', why);
    return n;
  }

  // Time passes; the Hush, if it's following, gains.
  function advance(hours) {
    run.hours += hours;
    while (run.hours >= 24) {
      run.hours -= 24;
      run.day++;
    }
    if (run.hush !== null) run.hush += hours * hushSpeed();
  }

  // The next time the clock shows `h` (tomorrow, if that's already gone). An
  // hour word is the sky's doing, so the Hush doesn't gain while it skips ahead.
  function setHour(h) {
    if (h <= run.hours) run.day++;
    run.hours = h;
  }

  function spend(hours) {
    run.stay -= hours;
    advance(hours);
    api.setClock(run.hours);
  }

  const omenText = () => (typeof OMENS[run.omen].line === 'function' ? OMENS[run.omen].line(run) : OMENS[run.omen].line);
  const roughLine = () => `${'✦'.repeat(run.rough)} ${t('The sky remembers you, and it’s rougher than on your first voyage: the Hush is quicker, storms come more often, and everything costs more.')}`;
  const hushSpeed = () => HUSH.speed * (run.omen === 'long' ? 1.5 : 1) * (1 + 0.1 * run.rough) * (run.omen === 'fullmoon' && dark() ? 2 : 1);
  // Hours of sleep "until morning": to the next 7:00, and at least one.
  const sleepHours = () => Math.max(1, ((7 - run.hours) % 24 + 24) % 24);
  const stayHours = () => STAY + (has('hourglass') ? 1 : 0) + (run.omen === 'long' ? 1 : 0);
  const cold = () => ['snowfield', 'glass', 'icefall'].includes(run.here?.biome) || (env?.snowCover ?? 0) > 0.5 || reachOf(run.leagues) === 2;
  const stormy = () => run.here?.weather === 'storm' && !run.waited && !has('stormglass');
  const dark = () => (env?.night ?? 0) > 0.5;
  const nightHour = (h) => h >= 20.5 || h < 5.5;
  const caught = () => run.hush !== null && run.hush >= run.leagues;

  // Every passenger but the cook eats a loaf a flight; the cook saves one.
  const foodCost = () => (run.blessing ? 0 : Math.max(0, 1 + (cold() ? 1 : 0) + (run.omen === 'hungry' ? 1 : 0)
    + run.crew.filter((id) => id !== 'cook').length - (aboard('cook') ? 1 : 0)));

  // A fuel a letter, bent by tailwinds, wind words, keepsakes and the omen.
  function fuelOf(reading) {
    const e = reading.effect;
    if (e.free) return 0;
    const w = reading.word;
    let fuel = w.length;
    if (has('lodestone')) fuel -= (w.match(/[jqxz]/g) ?? []).length;
    if (run.omen === 'vowels') fuel += Math.max(0, (w.match(/[aeiou]/g) ?? []).length - 1);
    if (reading.rules.includes('chain')) fuel = Math.ceil(fuel / (has('compass') ? 4 : 2));
    if (e.wind) fuel = Math.ceil(fuel / (has('kite') || run.omen === 'gusty' || run.here?.biome === 'birds' ? 4 : 2));
    if (run.omen === 'mirror') fuel = w[0] === w[w.length - 1] ? Math.ceil(fuel / 2) : fuel + 1;
    if (run.omen === 'lucky' && run.lucky && !w.includes(run.lucky)) fuel += 1;
    if (has('anchor')) fuel += 1;
    if (run.flags.leak) fuel += 1;
    return fuel > 0 ? fuel : 0;
  }

  // What a short plain word costs on top of its letters (the anchor, a leak, an omen), so
  // "low on fuel" still means "only the shortest words are left" when every word costs more.
  const surcharge = () => (has('anchor') ? 1 : 0) + (run.flags.leak ? 1 : 0) + (['vowels', 'mirror'].includes(run.omen) ? 1 : 0) + (run.omen === 'lucky' && run.lucky ? 1 : 0);

  function costOf(reading) {
    const free = run.freeLetter && reading.word.includes(run.freeLetter) ? 'letter' : run.freeNext ? 'whale' : null;
    return { fuel: free ? 0 : fuelOf(reading), food: reading.effect.light ? 0 : foodCost(), free };
  }

  // How far a hop goes: a mile a letter, stretched or cut short by where the
  // word sounds like it is, the air of the island you leave from, and a gust.
  // Seeded by island and word, so the preview and the flight agree.
  // { n, parts: [[miles, why]] }.
  function hopOf(reading) {
    const parts = [];
    // (Mist muffles what a word means, so it only says that something does.)
    const place = reading.meanings.find((m) => PLACE_MILES[m.id]);
    const heard = place && book.meanings[place.id] && run.here?.weather !== 'mist';
    if (place) parts.push([PLACE_MILES[place.id][0], heard ? PLACE_MILES[place.id][1] : t('something you haven’t learned yet')]);
    const air = AIR_MILES[run.here?.biome] ?? 0;
    if (air) parts.push([air, air > 0 ? t('wind off this island') : t('still, heavy air here')]);
    if (run.here?.weather === 'storm' && !run.waited) parts.push([2, t('storm winds')]);
    const r = makeRandom(`${run.here?.word ?? ''}>${reading.word}`, 'gust');
    const gust = Math.max(-2, Math.min(2, Math.round((r() + r() - 1) * 2.5)));
    if (gust) parts.push([gust, gust > 0 ? t('a gust') : t('a headwind')]);
    if (aboard('cartographer')) parts.push([1, CREW.cartographer.name]);
    if (run.here?.trait === 'windswept') parts.push([2, TRAITS.windswept.name]);
    if (run.flags.sandbag) parts.push([3, ITEMS.sandbag.name]);
    if (run.omen === 'short' && reading.word.length <= 4) parts.push([1, OMENS.short.name]);
    return { n: Math.max(1, reading.leagues + parts.reduce((sum, [k]) => sum + k, 0)), parts };
  }
  const leaguesOf = (reading) => hopOf(reading).n;

  // Why a word can't be said right now, if it can't.
  function problemOf(reading) {
    if (reading.problem) return reading.problem;
    const lost = run.banned.find((l) => reading.word.includes(l));
    if (lost) return t('the Hush swallowed the letter {letter}', { letter: lost.toUpperCase() });
    if (run.omen === 'short' && reading.word.length > 8) return t('short breath: the sky can’t hear a word that long');
    return null;
  }

  // The gates on the way, and what they ask.
  const nextGate = () => GATES[run.gates] ?? null;
  const riddleOf = (gate) => RIDDLES[run.riddles[GATES.indexOf(gate)]];
  // A riddle, a dare or a quest takes only a real word (anything else still flies).
  const answers = (gate, reading) => reading.real && riddleOf(gate).test(reading.word, reading);
  const dareMet = (reading) => reading.real && DARES[run.dare.id].test(reading.word, run.dare);
  const crosses = (reading) => {
    const gate = nextGate();
    return gate && run.leagues + leaguesOf(reading) >= gate.at ? gate : null;
  };

  // The harm of leaving that you can see coming: going hungry, and flying out of a storm.
  const leavingHarm = (food = foodCost()) => (food > run.food ? 1 : 0) + (stormy() ? 1 : 0);
  const guarded = () => has('bell') || aboard('knight');

  // A word that asks for no kind of land gets one of the reach's own, sometimes.
  function reachIsland(word, leagues, always = false) {
    const reach = REACHES[reachOf(leagues)];
    const r = makeRandom(word, 'reach');
    return r() < reach.chance || always ? r.weighted(reach.islands) : undefined;
  }

  // --- The voyage as tales see it (tales.js) ---------------------------------
  function talesView() {
    return {
      run,
      get reach() {
        return reachOf(run.leagues);
      },
      get night() {
        return nightHour(run.hours);
      },
      get golden() {
        return run.hours >= 16.5 && run.hours <= 19.2;
      },
      get room() {
        return run.crew.length < ROOM;
      },
      get gate() {
        return nextGate();
      },
      get gateKnown() {
        return gateKnown();
      },
      // Whether there's an island left to sight (the lighthouse and the telescope).
      get canSight() {
        return sightings().length > 0;
      },
      get found() {
        return Boolean(book.found);
      },
      // One of Wa's words you haven't said this voyage, for her camp page.
      waWord: () => {
        const unused = Object.keys(SECRETS).filter((w) => w !== 'wa' && !run.used.includes(w));
        const word = pickOf(unused.filter((w) => !book.secrets[w])) ?? pickOf(unused) ?? 'please';
        if (!book.secrets[word]) learnSecret(word, true);
        book.pages.camp = word;
        saveBook();
        return word;
      },
      gossip: () => {
        const gate = nextGate();
        run.flags.gossip = run.gates;
        return t('They say {gate} opens only for {riddle}.', { gate: gate.name, riddle: riddleOf(gate).ask });
      },
      give: (gain) => gotText(gain, give(gain)),
      hurt: (n) => {
        const took = harm(n);
        return took ? `−${took} ❤️` : t('The balloonist patches it.');
      },
      chance: (p) => has('coin') || Math.random() < p,
      owns: has,
      met: (id) => run.crewMet.includes(id),
      unowned: (r = Math.random) => {
        const left = Object.keys(KEEPSAKES).filter((id) => !has(id));
        return left.length ? left[Math.floor(r() * left.length)] : null;
      },
      keepsake: (id) => giveKeepsake(id),
      board,
      teach,
      secret: teachSecret,
      leagues: gainLeagues,
      hours: (n) => {
        advance(n);
        api.setClock(run.hours);
        return n === 1 ? t('An hour passes.') : t('{n} hours pass.', { n });
      },
      flag: (name) => run.flags[name],
      mark: (name, value) => {
        run.flags[name] = value;
      },
      ban,
      hushGains: (n) => {
        if (run.hush === null) return '';
        run.hush += n;
        return t('Behind you, the Hush creeps closer.');
      },
      hushBack: (n) => {
        if (run.hush === null) return '';
        run.hush -= n;
        return t('The Hush flinches and falls back.');
      },
      get name() {
        return you();
      },
      get signed() {
        return Boolean(book.name);
      },
      arcDone: (id) => friend(book, id),
      examples: (id) => examplesOf(meaning(id)).join(t(', ')),
      // An island kind to aim for (a strange one, or an everyday one), with words that lead there.
      goal: (strange) => {
        const keys = Object.keys(BIOMES).filter((k) => Boolean(BIOMES[k].weight) !== strange && ISLAND_WORD[k] && k !== run.here?.biome);
        const biome = pickOf(keys);
        return { biome, island: t(BIOMES[biome].label), words: examplesOf(meaning(ISLAND_WORD[biome])).join(t(', ')) };
      },
      item: (id) => giveItem(id),
      get packRoom() {
        return run.pack.length < PACK;
      },
      // One particular word of Wa's, for a story that reveals it ('' if it's known).
      learn: (word) => {
        if (book.secrets[word]) return '';
        learnSecret(word, true);
        return `✨ ${t('One of Wa’s words: “{word}”. Say it, and {line}', { word, line: uncap(SECRETS[word].line) })}`;
      },
      treasureMap,
    };
  }

  function giveKeepsake(id) {
    const left = Object.keys(KEEPSAKES).filter((k) => !has(k));
    id ??= left[Math.floor(Math.random() * left.length)];
    if (!id || has(id)) return t('{got} (you have every keepsake already)', { got: gainText(give({ glimmer: 4 })) });
    let dropped = '';
    if (run.keepsakes.length >= KEEP) {
      const old = KEEPSAKES[run.keepsakes.shift()];
      dropped = ` ${t('There’s only room for three keepsakes, so you leave the {name} behind.', { name: old.name })}`;
      toast(old.icon, t('no room: you leave the {name} behind', { name: old.name }));
    }
    run.keepsakes.push(id);
    book.keepsakes[id] ??= Date.now();
    saveBook();
    const k = KEEPSAKES[id];
    toast(k.icon, t('a keepsake: the {name}', { name: k.name }));
    return `${t('{icon} the {name}, a keepsake for the rest of the voyage. {line}', { icon: k.icon, name: k.name, line: k.line })}${dropped}`;
  }

  function board(id) {
    if (run.crew.length >= ROOM || aboard(id)) return t('There’s no room left in the basket.');
    run.crew.push(id);
    run.crewMet.push(id);
    book.crew[id] ??= 'met';
    saveBook();
    const c = CREW[id];
    toast(c.icon, t('{name} comes aboard', { name: c.name }));
    return t('{icon} {name} comes aboard, and {help}. {who} wants to reach {wish}, and will thank you there.', { icon: c.icon, name: cap(c.name), who: cap(c.name), help: c.help, wish: c.wish });
  }

  // Moving ahead outside a flight (a whale, an updraft) stops short of the next gate.
  function gainLeagues(n) {
    const gate = nextGate();
    const go = Math.max(0, Math.min(n, gate ? gate.at - 1 - run.leagues : n));
    run.leagues += go;
    return go ? t('+{miles}.', { miles: miles(go) }) : t('{gate} stops you short.', { gate: cap(gate.name) });
  }

  function ban(letter) {
    if (!run.banned.includes(letter)) run.banned.push(letter);
    return t('The Hush swallows the letter {letter}. No word with it will fly until you win it back, at a wizard’s tower or a shrine.', { letter: letter.toUpperCase() });
  }

  function treasureMap() {
    const word = pickOf(TREASURE_WORDS.filter((w) => !run.used.includes(w))) ?? 'treasure';
    run.flags.map = 2;
    run.flags.treasure = word;
    return t('🗺️ The halves fit. X marks a land called “{word}”: say that word, and the treasure is yours.', { word });
  }

  // --- Flying -----------------------------------------------------------------
  function context() {
    return { used: run.used, last: run.words.length > 1 ? run.words[run.words.length - 1] : null, muted: run.flags.hoarded ? [run.flags.hoarded] : [] };
  }

  function submit(text) {
    if (!active || state !== 'land') return false;
    const reading = readWord(text, context());
    if (problemOf(reading) || costOf(reading).fuel > run.fuel) {
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      return false;
    }
    depart(reading);
    return true;
  }

  // Out of fuel: let the wind carry you a short way, at a price.
  function drift() {
    const short = WIND_WORDS.filter((w) => w.length <= 4 && !run.used.includes(w) && !run.banned.some((l) => w.includes(l)));
    const reading = readWord(pickOf(short) ?? 'drift', context());
    depart(reading, { drift: true });
  }

  function depart(reading, { first = false, drift: drifting = false } = {}) {
    let heard = reading;
    const said = reading.word;
    const story = []; // what happened on the way, told on arrival
    if (!first) {
      run.patched = false;
      const cost = costOf(reading);
      run.fuel -= drifting ? 0 : cost.fuel;
      if (cost.free === 'letter' && !drifting) {
        toast('🔤', t('the letter carries you for free'));
        run.freeLetter = null;
      } else if (cost.free === 'whale' && !drifting) {
        toast('🐋', t('the whale’s song carries you for free'));
        run.freeNext = false;
      }
      if (drifting) harm(1, t('you drift on the wind, and the balloon takes a battering'));
      if (cost.food > run.food) {
        run.food = 0;
        harm(1, t('not enough food for the flight'));
      } else {
        run.food -= cost.food;
      }
      run.blessing = false;
      if (stormy() && run.flags.umbrella) {
        run.flags.umbrella = false;
        toast('☂️', t('the umbrella keeps the storm off the balloon'));
      } else if (stormy()) harm(1, t('the storm tears at the balloon as you leave'));
      if (run.flags.fray) {
        run.flags.fray = false;
        harm(1, t('the frayed rope snaps as you take off'));
      }
      if (dark() && !has('feather') && run.omen !== 'fullmoon') {
        if (run.lanterns > 0) {
          run.lanterns--;
          toast('🏮', t('your lantern lights the way'));
        } else if (Math.random() < 0.5) {
          const misheard = mishear(said, Math.random);
          const again = readWord(misheard, context());
          // Two-letter words can't be misheard (the first letter always stays).
          if (misheard !== said && !again.problem) {
            heard = again;
            learnRule('mishear');
            toast('🌙', t('the night misheard you: “{said}” became “{heard}”', { said, heard: misheard }));
          }
        }
      }
      if (run.quest && said.includes(run.quest) && reading.real) run.questDone = true;
      // A dare is settled as you go.
      if (run.dare) {
        const d = run.dare;
        const dare = DARES[d.id];
        run.dare = null;
        story.push(`${dare.icon} ${reading.real && dare.test(said, d) ? dare.pass(talesView(), d) : dare.fail(talesView(), d)}`);
      }
      // A gate opens only for a word that answers its riddle; others are turned back.
      let go = leaguesOf(reading);
      const gate = crosses(reading);
      if (gate && drifting) {
        // The wind can carry you up to a gate, but it can't answer one (and doesn't try).
        go = Math.max(0, gate.at - 1 - run.leagues);
        story.push(`🚪 ${t('The wind carries you up to {gate}, but only a word can open it.', { gate: gate.name })}`);
      } else if (gate && answers(gate, reading)) {
        run.gates++;
        toast('🚪', t('{gate} opens for “{word}”', { gate: gate.name, word: said }));
        story.push(`🚪 ${heard === reading ? t('{gate} opens for “{word}”.', { gate: cap(gate.name), word: said })
          : t('The sky heard “{heard}”, but {gate} knows what you meant, and opens.', { heard: heard.word, gate: gate.name })}`);
        if (run.gates === 1) run.flags.hushDue = true;
        if (run.gates === 2 && !book.found) run.flags.pageDue = true;
      } else if (gate) {
        go = Math.max(0, gate.at - 2 - run.leagues);
        harm(1, t('{gate} turns you back', { gate: gate.name }));
        story.push(`🚪 ${reading.real
          ? t('{gate} won’t open for “{word}”, and turns you back. It wants {riddle}.', { gate: cap(gate.name), word: said, riddle: riddleOf(gate).ask })
          : t('{gate} won’t open for “{word}”: it only answers to real English words. It turns you back.', { gate: cap(gate.name), word: said })}`);
      }
      run.leagues += go;
      advance(Math.max(1, Math.ceil(go / 3)));
      run.flags.sandbag = false;
      // The storm front gains six miles a flight; a long word stays ahead of it.
      const front = run.flags.front;
      if (front) {
        front.at += 6;
        front.left--;
        if (front.at >= run.leagues) {
          front.at = run.leagues - 6;
          harm(1, t('the storm front catches you'));
          story.push(`⛈️ ${t('The storm front catches up and batters the balloon before you break clear.')}`);
        }
        if (front.left <= 0) {
          run.flags.front = null;
          story.push(`⛈️ ${t('Behind you, the storm front blows itself out.')}`);
        }
      }
      // Every third flight, the music box drives the Hush back (and the gulls take their fee).
      if (has('musicbox') && run.words.length % 3 === 0) {
        if (run.hush !== null) run.hush -= 5;
        give({ food: -1 });
        story.push(`🎶 ${t('The music box plays as you fly. {hush}Gulls follow the tune and take a food.', { hush: run.hush !== null ? t('The Hush falls back. ') : '' })}`);
      }
    }

    const e = { ...heard.effect };
    let answer = null;
    if (e.question) {
      const r = makeRandom(heard.word, 'answer');
      answer = r.pick(MEANINGS.filter((m) => !['question', 'friend', 'dark', 'clock', 'gift', 'fast', 'small'].includes(m.id) && Object.keys(m.effect).length));
      for (const [k, v] of Object.entries(answer.effect)) if (e[k] === undefined) e[k] = v;
    }
    finale = run.leagues >= GOAL;
    const clocked = run.flags.clock ?? null;
    run.flags.clock = null;
    if (finale) setHour(23.4);
    else if (e.hour !== undefined) setHour(e.hour);
    else if (clocked !== null) setHour(clocked);
    if (e.danger) run.darkWords++;
    if (!first) run.used.push(said);
    if (heard.word !== said) run.used.push(heard.word);
    run.words.push(heard.word);
    const echo = heard.echoOf && run.lands[heard.echoOf];
    const calm = run.calm > 0;
    if (e.calm) run.calm = e.calm;
    else if (calm) run.calm--;
    run.here = {
      word: heard.word, said, story,
      want: {
        biome: echo?.biome ?? e.biome ?? reachIsland(heard.word, run.leagues),
        landmark: echo?.landmark ?? e.landmark,
        lake: e.lake || undefined,
        river: e.river || undefined,
        balloon: heard.wonder > 0 || undefined,
      },
      weather: finale || e.aurora ? 'clear' : e.weather ?? (calm || e.calm ? 'clear' : null),
      moon: finale ? 0.5 : null,
      meanings: heard.meanings.map((m) => m.id),
      rules: heard.rules, secret: heard.secret, wonder: heard.wonder, echoOf: heard.echoOf,
      effect: e, answer: answer?.id ?? null, arrived: false,
    };
    if (first) {
      Object.assign(run.here.want, HOME);
      run.here.weather = 'clear';
    }
    // A word of the kind a sighting named steers you straight for that island.
    if (!first && run.flags.needle) {
      run.here.want.biome = reachIsland(heard.word, run.leagues, true);
      run.flags.needle = false;
      story.push(`🪡 ${t('The compass needle swings round and points you somewhere strange.')}`);
    }
    if (!first && run.flags.vane) {
      run.here.weather = 'clear';
      run.flags.vane = false;
    }
    if (!first && !echo && run.sighting && heard.meanings.some((m) => m.id === run.sighting.word)) {
      Object.assign(run.here.want, { biome: run.sighting.biome, landmark: run.sighting.landmark });
      story.push(`🔭 ${t('You steer for the island you saw from far off.')}`);
      run.sighting = null;
    }
    if (finale) Object.assign(run.here.want, makeRandom(heard.word, 'edge').pick(EDGES), { landmark: 'edge', lake: true, river: true, balloon: undefined });
    run.stay = stayHours() + (heard.echoOf ? 1 : 0) + (clocked !== null && friend(book, 'clocktower') ? 1 : 0);
    run.waited = false;
    run.met = [];
    input.value = '';
    read.hidden = true;
    closeCard();
    bookPanel.hidden = true;
    if (run.hull <= 0) {
      hud();
      return lose(t('The balloon is torn past mending.'));
    }
    state = 'flying';
    save();
    hud();
    api.fly(`~${heard.word}`);
  }

  // --- Arriving ------------------------------------------------------------------
  const isHere = (seed) => active && run?.here && seed === `~${run.here.word}`;

  function rollWeather(r, biomeKey) {
    // The sky turns rougher the further you go (and twice as rough on restless winds).
    if (r() < (0.08 + run.leagues / 260 + 0.025 * run.rough) * (run.omen === 'gusty' ? 2 : 1)) {
      return r.pick(['desert', 'ember'].includes(biomeKey) ? ['storm', 'mist'] : ['snowfield', 'glass'].includes(biomeKey) ? ['storm', 'snow', 'mist'] : ['storm', 'rain', 'mist']);
    }
    return r.weighted(BIOMES[biomeKey].weather);
  }

  function arrived(land, seed) {
    if (!isHere(seed)) return;
    const here = run.here;
    here.biome = land.biomeKey;
    here.landmark = land.landmark;
    here.lake = land.hasLake;
    // (Before this island counts, for wanderlust: have you landed on its kind already?)
    const again = Object.entries(run.lands).some(([word, l]) => word !== here.word && l.biome === land.biomeKey);
    run.lands[here.word] = { biome: land.biomeKey, landmark: land.landmark };
    state = 'land';
    api.setClock(run.hours);
    if (!here.arrived) {
      here.arrived = true;
      const g = talesView();
      const e = here.effect;
      const twice = e.danger ? 2 : 1;
      const gain = { glimmer: ((e.glimmer ?? 0) + here.wonder * 2) * twice, food: e.food ?? 0, fuel: e.fuel ?? 0, hull: e.heal ?? 0 };
      if (has('shell') && here.meanings.includes('sea')) gain.hull += 1;
      if (run.questDone) {
        gain.glimmer += friend(book, 'castle') ? 10 : 6;
        gain.hull += 1;
        toast('👑', t('your {letter} word reaches the queen', { letter: run.quest.toUpperCase() }));
        run.flags.quests = [...(run.flags.quests ?? []), run.quest];
        run.quest = null;
        run.questDone = false;
      }
      const got = give(gain);
      const lines = [...(here.story ?? [])];
      if (e.danger) {
        if (guarded()) lines.push(has('bell') ? t('🔔 The silver bell rings, and whatever lives here keeps its distance.') : t('🛡️ The old knight stands guard, and whatever lives here keeps its distance.'));
        else {
          const took = harm(1);
          if (took) got.hull = (got.hull ?? 0) - took;
          if (took && here.meanings[0] !== 'dark') lines.push(`🥀 ${t('Something in the dark here bites (−1 ❤️), but it guards a hoard: double coins.')}`);
        }
      }
      const news = run.words.length === 1 ? [] : learn(here);
      // New kinds of words this voyage: the inkwell and the poet pay for them.
      const fresh = run.words.length === 1 ? [] : here.meanings.filter((id) => !run.seen.includes(id));
      run.seen.push(...fresh);
      const pay = fresh.length * ((has('inkwell') ? 2 : 0) + (aboard('poet') ? 1 : 0));
      if (pay) lines.push(`${has('inkwell') ? '🖋️' : '📜'} ${t('A new kind of word for this voyage: {got}', { got: gainText(give({ glimmer: pay })) })}`);
      if (run.words.length === 1) lines.push(omenLine());
      if (run.words.length === 1 && run.rough) lines.push(roughLine());
      if (run.words.length > 1 && !finale) {
        here.trait = traitOf(here.word);
        const trait = TRAITS[here.trait];
        if (trait) {
          lines.push(`${trait.icon} ${trait.line}`);
          if (here.trait === 'haunted') run.hush += 2;
          if (here.trait === 'longday') run.stay += 1;
          if (here.trait === 'shortday') run.stay = Math.max(1, run.stay - 1);
        }
        if (run.omen === 'wander') {
          if (again) {
            run.stay = Math.max(1, run.stay - 1);
            lines.push(`🧳 ${t('Wanderlust: you’ve already been to this kind of island this voyage, so you lose an hour here.')}`);
          } else {
            lines.push(`🧳 ${t('Wanderlust: a kind of island new to this voyage tops up your burner: {got}', { got: gainText(give({ fuel: 2 })) })}`);
          }
        }
        if (run.omen === 'lucky' && run.lucky && here.said.includes(run.lucky)) {
          lines.push(`🍀 ${t('A word with the lucky letter {letter}: {got}', { letter: run.lucky.toUpperCase(), got: gainText(give({ glimmer: 2 })) })}`);
        }
        if (has('anchor')) lines.push(`⚓ ${t('The golden anchor pays its due: {got}', { got: gainText(give({ glimmer: 2 })) })}`);
        if (land.biomeKey === 'stormeye') {
          const rest = gainText(give({ hull: 1 }));
          lines.push(`🌀 ${rest ? t('The storm’s eye is calm and still, and you rest: {got}. Leaving will mean flying through the storm.', { got: rest }) : t('The storm’s eye is calm and still. Leaving will mean flying through the storm.')}`);
        }
        lines.push(...storyLines(land));
      }
      // A kind of island or building new to your book: the islanders fill your burner.
      const firsts = [];
      if (!BIOMES[land.biomeKey].weight && !book.islands[land.biomeKey]) firsts.push(t(BIOMES[land.biomeKey].label));
      if (BUILDINGS.includes(land.landmark) && land.landmark !== 'edge' && !book.buildings[land.landmark]) firsts.push(LANDMARK_LABEL[land.landmark]);
      book.islands[land.biomeKey] ??= Date.now();
      if (BUILDINGS.includes(land.landmark)) book.buildings[land.landmark] ??= Date.now();
      if (firsts.length && run.words.length > 1 && !finale) {
        const [a, b] = firsts, got = gainText(give({ fuel: firsts.length }));
        lines.push(`🗺️ ${b ? t('New to your book: {a} and {b}. The islanders top up your burner: {got}', { a, b, got }) : t('New to your book: {a}. The islanders top up your burner: {got}', { a, got })}`);
        toast('🗺️', b ? t('new to your book: {a} and {b}', { a, b }) : t('new to your book: {a}', { a }));
      }
      const reach = reachOf(run.leagues);
      if (reach > run.reach) {
        run.reach = reach;
        lines.push(`🌌 ${REACHES[reach].line}`);
      }
      if (run.flags.map === 2 && run.flags.treasure === here.word) {
        run.flags.map = 3;
        lines.push(`🗺️ ${t('This is the island on the burned map. You dig where the X is, and hit a chest. {got} {keepsake}', { got: gainText(give({ glimmer: 10 })), keepsake: giveKeepsake() })}`);
      }
      if (run.hush !== null && here.meanings.some((id) => LIGHT.includes(id))) {
        run.hush -= HUSH.light;
        lines.push(`☀️ ${t('Light pours out of the word, and the Hush falls back.')}`);
      }
      for (const id of [...run.crew]) {
        if (!CREW[id].home(land, g)) continue;
        run.crew = run.crew.filter((c) => c !== id);
        run.delivered++;
        book.crew[id] = 'home';
        lines.push(`${CREW[id].icon} ${CREW[id].reward(g)}`);
      }
      if (here.answer) lines.push(`❓ ${t('The sky answers: {line}', { line: meaning(here.answer).line })}`);
      if (e.music) {
        if (run.hush !== null) {
          run.hush -= HUSH.music;
          lines.push(`🎵 ${t('The island sings along, and the Hush falls back.')}`);
        } else {
          lines.push(`🎵 ${t('The island sings back, and someone throws you coins. {got}', { got: gainText(give({ glimmer: 2 })) })}`);
        }
      }
      // What the Hush is made of, said out loud at last.
      if (e.unsaid && run.hush !== null) {
        run.hush -= HUSH.light;
        lines.push(`💬 ${t('You say it out loud at last, and the Hush falls back.')}`);
      }
      if (e.gift) lines.push(`🎁 ${giftOf()}`);
      if (e.gossip && nextGate()) {
        run.flags.gossip = run.gates;
        lines.push(`🚪 ${t('{gate} opens only for {riddle}.', { gate: cap(nextGate().name), riddle: riddleOf(nextGate()).ask })}`);
      }
      if (e.friend) {
        here.friend = run.crew.length < ROOM ? pickOf(Object.keys(CREW).filter((id) => !run.crewMet.includes(id))) ?? null : null;
        if (!here.friend) lines.push(`👋 ${t('Someone waves you off from the shore.')}`);
      }
      if (run.flags.shadow > 0) {
        if (here.said.length >= 9) {
          run.flags.shadow = 0;
          lines.push(`🏴‍☠️ ${t('A word that long leaves the pirates far behind. You’ve lost them.')}`);
        } else {
          run.flags.shadow--;
          const took = gainText(give(run.glimmer >= 3 ? { glimmer: -3 } : { food: -2 }));
          lines.push(`🏴‍☠️ ${t('The pirates land right behind you and help themselves: {got}', { got: took })}`);
        }
      }
      // Now and then you can see an island you haven't been to yet.
      if (run.sighting?.biome === land.biomeKey) run.sighting = null;
      if (!finale && run.words.length > 1 && !run.sighting && Math.random() < SIGHTING_CHANCE) {
        const seen = sight();
        if (seen) lines.push(`🔭 ${seen}`);
      }
      saveBook();
      narrate(here, got, [...news, ...lines]);
      if (run.hull <= 0) {
        hud();
        save();
        return lose(t('Something on this island bit through the last of the balloon.'));
      }
      hud();
      save();
      if (finale) winTimer = setTimeout(win, 6000);
      else if (!forced() && run.words.length > 1 && here.trait !== 'quiet') {
        if (here.friend) meetFriend(here.friend);
        else skyEvent();
      }
      return;
    }
    hud();
    save();
    if (finale) winTimer = setTimeout(win, 6000);
    else forced();
  }

  // What this land taught you; returns the lines to tell you about it.
  function learn(here) {
    const news = [];
    for (const id of here.meanings) {
      const m = meaning(id);
      const entry = book.meanings[id];
      if (!entry || entry.heard) news.push(WA_NOTES[id] ? t('📖 {name}. In the margin, Wa wrote: “{note}”', { name: m.name, note: WA_NOTES[id] }) : t('📖 {name}.', { name: m.name }));
      // Examples are words you said yourself (not ones the travellers told you).
      const words = entry && !entry.heard ? entry.words : [];
      if (!words.includes(here.word)) words.push(here.word);
      book.meanings[id] = { words: words.slice(-5) };
    }
    for (const id of here.rules) {
      if (learnRule(id, false)) news.push(`📖 ${RULES[id].name}${COLON}${RULES[id].line}`);
    }
    if (here.secret && !book.secrets[here.secret]) {
      learnSecret(here.secret);
      news.push(`✨ ${t('One of Wa’s words! {line}', { line: SECRETS[here.secret].line })}`);
    } else if (here.secret) {
      news.push(t('✨ Wa used this word.'));
    }
    saveBook();
    return news;
  }

  // `loud`: say so with a toast (on arrival, the story tells you instead).
  function learnRule(id, loud = true) {
    if (book.rules[id]) return false;
    book.rules[id] = Date.now();
    if (loud) toast('📖', t('you learned: {name}', { name: RULES[id].name }));
    saveBook();
    return true;
  }

  function learnSecret(word, taught = false) {
    if (book.secrets[word]) return;
    book.secrets[word] = Date.now();
    toast('✨', taught ? t('one of Wa’s words for the book: “{word}”', { word }) : t('you found one of Wa’s words: “{word}”!', { word }));
    saveBook();
  }

  function teachSecret() {
    const word = pickOf(Object.keys(SECRETS).filter((w) => !book.secrets[w]));
    if (!word) return '';
    learnSecret(word, true);
    return `✨ ${t('One of Wa’s words: “{word}”. Say it, and {line}', { word, line: uncap(SECRETS[word].line) })}`;
  }

  function narrate(here, gain, news) {
    const said = run.words.length === 1 ? STORY.setOff
      : here.said === here.word ? t('The sky heard “{word}”.', { word: here.word }) : t('You said “{said}”, but the sky heard “{word}”.', { said: here.said, word: here.word });
    // What the island is like: the finale and echoes have their own words.
    const first = run.words.length === 1 ? '' : finale ? t('This is the last island. Beyond it there’s only sky.')
      : here.echoOf ? t('An echo of “{word}”: you’re back on an island you’ve seen before, with an extra hour to spend.', { word: here.echoOf })
        : here.meanings.length ? meaning(here.meanings[0]).line : here.secret ? '' : SHRUG;
    const lines = [`${said} ${first}`.trim()];
    lines.push(...news);
    const got = gainText(gain);
    if (got) lines.push(got);
    read.replaceChildren(...lines.map((text, i) => el('p', i ? 'read-line' : 'read-story', text)));
    read.classList.remove('folded');
    read.dataset.kind = 'story';
    read.hidden = false;
  }

  // --- Tales: the Hush, and what happens in the air --------------------------------
  // Cards that can't wait: the Hush arriving, or catching you. True if one opened.
  function forced() {
    if (state === 'over') return false;
    if (run.flags.hushDue) {
      run.flags.hushDue = false;
      run.hush = run.leagues - HUSH.start;
      if (!book.found) book.pages.wall ??= Date.now();
      saveBook();
      tell(HUSH.arrive(book.found));
      return true;
    }
    if (run.flags.pageDue) {
      run.flags.pageDue = false;
      book.pages.gate ??= Date.now();
      saveBook();
      tell(STORY.windGate);
      return true;
    }
    if (caught()) {
      tell(HUSH.catch(talesView()), () => {
        run.hush = run.leagues - HUSH.knock;
      });
      return true;
    }
    return false;
  }

  // A friendly word brings someone who'd like a ride.
  function meetFriend(id) {
    const c = CREW[id];
    tell({
      title: t('a friendly face'),
      text: t('{name} is waiting at the edge of the island, waving. {help}. They’d like a ride to {wish}.', { name: cap(c.name), help: cap(c.help), wish: c.wish }),
      options: [
        { label: t('give {name} a ride {icon}', { name: c.name, icon: c.icon }), note: eats(id), act: (g) => g.board(id) },
        { label: t('wave back'), act: () => t('They wave until you’re out of sight.') },
      ],
    });
  }

  // What a gift word's parcel holds.
  function giftOf() {
    const roll = Math.random();
    if (roll < 0.15 && Object.keys(KEEPSAKES).some((k) => !has(k))) return t('Inside: {keepsake}', { keepsake: giveKeepsake() });
    const [gain, what] = roll < 0.5 ? [{ glimmer: 4 }, t('a purse of coins')] : roll < 0.75 ? [{ food: 4 }, t('a picnic')] : [{ fuel: 4 }, t('a bundle of kindling')];
    return t('Inside: {what}. {got}', { what, got: gotText(gain, give(gain)) });
  }

  function skyEvent() {
    const g = talesView();
    const ready = SKY_EVENTS.filter((ev) => (ev.repeat || !run.events.includes(ev.id)) && (!ev.when || ev.when(g)));
    // A chapter of a longer story always turns up once it's due.
    const due = ready.filter((ev) => ev.weight >= 8);
    if (!due.length && Math.random() >= SKY_EVENT_CHANCE * (run.omen === 'crowded' ? 1.6 : 1)) return;
    const pool = due.length ? due : ready;
    if (!pool.length) return;
    let roll = Math.random() * pool.reduce((sum, ev) => sum + ev.weight, 0);
    const ev = pool.find((x) => (roll -= x.weight) <= 0) ?? pool[pool.length - 1];
    run.events.push(ev.id);
    tell(ev);
  }

  // Tell a tale as a card; its answer shows on a second card, then you go on.
  function tell(ev, after) {
    const g = talesView();
    state = 'event';
    const text = typeof ev.text === 'function' ? ev.text(g) : ev.text;
    const options = typeof ev.options === 'function' ? ev.options(g) : ev.options;
    openCard({
      title: ev.title,
      text: [text],
      options: options.map((o) => ({
        label: o.label,
        note: o.note,
        disabled: typeof o.disabled === 'function' ? o.disabled(g) : Boolean(o.disabled),
        act: () => {
          const said = o.act(g);
          after?.();
          hud();
          save();
          openCard({ title: ev.title, text: [said || t('Nothing changes.')], options: [{ label: t('go on'), primary: true, act: settle }] });
        },
      })),
    });
    hud();
    save();
  }

  // A chapter of a building's story (stories.js), told like a tale in the air.
  function tellArc(id) {
    const arc = ARCS[id];
    const progress = (book.arcs[id] ??= { ch: 0, picks: [] });
    const chapter = arc.chapters[progress.ch].tell(talesView());
    tell({
      ...chapter,
      options: chapter.options.map((o, i) => ({
        ...o,
        act: (g) => {
          const said = o.act(g);
          progress.picks.push(i);
          progress.ch++;
          if (progress.ch >= arc.chapters.length) progress.done = Date.now();
          saveBook();
          return progress.done ? `${said} 🤝 ${arc.perk}` : said;
        },
      })),
    });
  }

  function settle() {
    closeCard();
    if (state === 'over') return;
    state = 'land';
    if (run.hull <= 0) return lose(t('The balloon is torn past mending.'));
    hud();
    save();
    forced();
  }

  // --- On the land ------------------------------------------------------------------
  function note(kind) {
    if (!active || state !== 'land') return;
    const here = run.here;
    if (THANKS[kind]) {
      if (run.met.includes(kind)) return;
      run.met.push(kind);
      pending = `${gainText(give({ glimmer: 1 }))} ${THANKS[kind]}`;
      hud();
      save();
      return;
    }
    if (kind !== 'tree' && kind !== 'splash' && kind !== 'ice' && kind !== 'landmark') return;
    if (run.stay <= 0) {
      pending = t('no time left here · fly on');
      return;
    }
    if (kind === 'landmark') return openEvent();
    let gain, what;
    const lava = BIOMES[here.biome]?.water.lava;
    if (kind === 'tree') {
      [gain, what] = [{ ...(TREES[here.biome] ?? TREES.meadow)[0] }, (TREES[here.biome] ?? TREES.meadow)[1]];
      if (has('tinderbox')) gain.fuel = (gain.fuel ?? 0) + 1;
      if (aboard('fox')) gain.food = (gain.food ?? 0) + 1;
      // Nearly out of fuel, even a tree with no wood to spare has a few dry twigs.
      if (run.fuel < 3 && !(gain.fuel > 0)) {
        gain.fuel = 1;
        what = t('{what}, and a few dry twigs', { what });
      }
    } else if (lava) {
      [gain, what] = [{ fuel: 3 }, t('lava-warmed stones')];
    } else {
      [gain, what] = kind === 'splash' ? [{ food: 2 + ((env?.rain ?? 0) > 0.5 ? 1 : 0) }, t('a fish')] : [{ food: 2 }, t('ice fishing')];
      if (has('net')) gain.food += 2;
    }
    if (run.omen === 'hungry' && !lava) gain.food = (gain.food ?? 0) + 1;
    if (kind === 'tree' && here.trait === 'fruitful') gain.food = (gain.food ?? 0) + 1;
    if (kind !== 'tree' && here.trait === 'driftwood') gain.fuel = (gain.fuel ?? 0) + 1;
    // A lean year takes one off the biggest thing a tree gives (never all of it).
    if (kind === 'tree' && run.omen === 'lean') {
      const k = Object.keys(gain).reduce((a, b) => (gain[b] > gain[a] ? b : a));
      if (Object.values(gain).reduce((a, b) => a + b, 0) > 1) gain[k] -= 1;
    }
    // Rare letters make everything richer; mirror words double it; dark lands double the glimmer.
    if (here.wonder) gain[Object.keys(gain)[0]] += 1;
    if (here.rules.includes('mirror')) for (const k of Object.keys(gain)) gain[k] *= 2;
    if (here.effect.danger && gain.glimmer) gain.glimmer *= 2;
    // With every store it fills already full, there's nothing to spend the hour on.
    if (!Object.entries(gain).some(([k, n]) => n > 0 && !(run[k] >= holds(k)))) {
      pending = `${what}${fullNote(gain, {})}`.trim();
      return;
    }
    spend(1);
    const got = give(gain);
    pending = `${gainText(got)} ${what}${fullNote(gain, got)}`.trim();
    // Wrecks are full of things worth keeping.
    if (kind === 'tree' && here.biome === 'wreck' && run.flags.salvaged !== here.word && Math.random() < 0.15) {
      run.flags.salvaged = here.word;
      pending += ` · ${giveItem()}`;
    }
    hud();
    save();
    forced();
  }

  // Show what a tap gave, where it was.
  function tapped(event) {
    if (!pending || !event) return;
    const pop = el('div', 'voyage-popup', pending);
    pop.style.left = `${event.clientX}px`;
    pop.style.top = `${event.clientY}px`;
    document.body.append(pop);
    setTimeout(() => pop.remove(), 1600);
    pending = null;
  }

  // Offers taken on this island that can only be taken once (`once` in EVENTS).
  const doneHere = () => (run.flags.once?.word === run.here.word ? run.flags.once.ids : []);

  // An offer that only fills stores that are already full (nothing to pay, no other effect).
  const full = (gain) => Object.entries(gain).every(([k, n]) => n <= 0 || (holds(k) !== undefined && run[k] >= holds(k)));
  // The usual note on an offer: what it costs, what it gives, and any hint.
  const priced = (o) => [[o.pay ? `−${o.pay} 🪙` : '', o.gain ? gainText(o.gain) : ''].filter(Boolean).join(' → ') + (overpaid(o) ? fullNote(o.gain, {}) : ''), o.hint ?? ''].filter(Boolean).join(' · ');
  const wasted = (o) => Boolean(o.gain) && Object.keys(o).every((k) => k === 'label' || k === 'gain') && full(o.gain);
  // Paying for stores that are already full would buy nothing.
  const overpaid = (o) => Boolean(o.pay && o.gain) && full(o.gain);

  function openEvent() {
    const here = run.here;
    // The same offers all stay long (only what you've taken changes them).
    const r = makeRandom(here.word, 'event');
    const visited = (run.flags.visited ??= {});
    visited[here.landmark] ??= here.word;
    const seen = { first: visited[here.landmark] === here.word && !book.found, again: visited[here.landmark] !== here.word };
    const event = EVENTS[here.landmark]?.(r, book, talesView(), seen) ?? { title: t('nobody home'), text: t('The place is quiet, and nobody answers.'), options: [] };
    // Every building but home and the Edge can spare some lamp oil, and things cost more the higher you go.
    const dear = reachOf(run.leagues) + run.rough - (here.trait === 'festival' ? 1 : 0) - (run.omen === 'lean' ? 1 : 0);
    if (run.flags.leak && ['village', 'workshop', 'campsite'].includes(here.landmark)) event.options.push({ label: t('mend the burner'), mend: 'leak', note: t('an hour, and the leak is gone') });
    if (!['village', 'town', 'edge'].includes(here.landmark)) event.options.push({ label: t('buy lamp oil'), pay: 3, gain: { fuel: 4 }, once: 'oil' });
    for (const o of event.options) if (o.pay) o.pay = Math.max(1, o.pay + dear);
    event.options = event.options.filter((o) => !o.once || !doneHere().includes(o.once));
    const arc = ARCS[here.landmark];
    const chapter = book.arcs[here.landmark]?.ch ?? 0;
    if (arc && chapter < arc.chapters.length && run.flags.storied !== here.word) {
      event.options.unshift({
        label: `${arc.icon} ${arc.chapters[chapter].ask}`, story: here.landmark,
        note: t('a story · chapter {n} of {total}', { n: chapter + 1, total: arc.chapters.length }),
      });
    }
    state = 'event';
    openCard({
      title: event.title,
      text: [event.text],
      options: [
        ...event.options.map((o) => ({
          label: o.label,
          note: o.gamble && run.hull <= 1 && !has('coin') ? t('probably coins · but a falling stone would end your voyage')
            : o.sleep && run.hush !== null ? t('{note} · the Hush gains about {miles} while you sleep', { note: o.note ?? priced(o), miles: miles(Math.round(sleepHours() * hushSpeed())) })
            : o.note ?? (wasted(o) ? `${gainText(o.gain)}${fullNote(o.gain, {})} · ${t('costs no time')}` : priced(o)),
          disabled: Boolean(o.disabled) || (o.pay ?? 0) > run.glimmer || overpaid(o) || Boolean(o.board && run.crew.length >= ROOM),
          act: () => choose(wasted(o) ? { ...o, free: true } : o),
        })),
        { label: t('leave'), note: t('costs no time'), act: () => { closeCard(); state = 'land'; } },
      ],
    });
  }

  function choose(o) {
    closeCard();
    state = 'land';
    run.glimmer -= o.pay ?? 0;
    // A visit takes an hour; a night's sleep takes the night instead.
    const generous = run.here.trait === 'generous' && run.flags.generous !== run.here.word;
    if (generous) run.flags.generous = run.here.word;
    if (!o.sleep && !o.free && !generous) spend(o.hours ?? 1);
    if (o.once) run.flags.once = { word: run.here.word, ids: [...doneHere(), o.once] };
    if (o.story) {
      run.flags.storied = run.here.word;
      return tellArc(o.story);
    }
    if (o.gain) toast('🎁', gotText(o.gain, give(o.gain)) || t('nothing changes'));
    if (o.sleep) {
      // Any storm blows over, and the Hush keeps coming.
      run.stay = 0;
      advance(sleepHours());
      api.setClock(run.hours);
      if (run.here.weather === 'storm') {
        run.waited = true;
        run.here.weather = 'cloudy';
        api.clearStorm();
      }
    }
    if (o.quest) {
      run.quest = o.quest;
      toast('👑', t('a quest: say a word with {letter}', { letter: aLetter(o.quest) }));
    }
    if (o.freeLetter) run.freeLetter = o.freeLetter;
    if (o.blessing) {
      run.blessing = true;
      toast('🙏', t('blessed: your next flight needs no food'));
    }
    if (o.secret) learnSecret(o.secret, true);
    if (o.teach) teach(friend(book, 'campsite') ? 3 : 2);
    if (run.here.landmark === 'wizard' && friend(book, 'wizard')) teach(2);
    if (o.keepsake) giveKeepsake(o.keepsake);
    if (o.board) board(o.board);
    if (o.unban) {
      run.banned = run.banned.filter((l) => l !== o.unban);
      toast('🔤', t('the letter {letter} is yours again', { letter: o.unban.toUpperCase() }));
    }
    if (o.gossip) {
      const gate = nextGate();
      run.flags.gossip = run.gates;
      if (run.here.landmark === 'stones') toast('🗿', t('the stones hum what {gate} wants: {riddle}', { gate: gate.name, riddle: riddleOf(gate).ask }));
      else toast('🗣️', t('they say {gate} opens only for {riddle}', { gate: gate.name, riddle: riddleOf(gate).ask }));
    }
    if (o.mapHalf) toast('🗺️', treasureMap().replace('🗺️ ', ''));
    if (o.item) toast(ITEMS[o.item].icon, giveItem(o.item));
    if (o.dice) {
      if (has('coin') || Math.random() < 0.5) toast('🎲', t('you win at dice: {got}', { got: gainText(give({ glimmer: 5 })) }));
      else toast('🎲', t('you lose at dice: {got}', { got: gainText(give({ glimmer: -3 })) }));
    }
    if (o.omen) {
      // (Not to an omen that only works from the start of a voyage.)
      run.omen = pickOf(Object.keys(OMENS).filter((id) => id !== run.omen && id !== 'vowels' && id !== 'gilded'));
      if (run.omen === 'lucky') run.lucky = pickOf([...'aeiorstnlcdmpbg']);
      book.omens[run.omen] ??= Date.now();
      toast('🔮', t('a new omen: {name}. {line}', { name: OMENS[run.omen].name, line: omenText() }));
    }
    if (o.burner) {
      run.flags.burner = true;
      toast('🔥', t('the bigger burner holds 10 more fuel'));
    }
    if (o.brace) {
      run.flags.brace = 2;
      toast('🪵', t('the basket is braced: the next two tears are stopped'));
    }
    if (o.clock !== undefined) {
      run.flags.clock = o.clock;
      toast('🕰️', t('the great clock is set: you’ll reach the next island {when}', { when: o.when }));
    }
    if (o.mend) {
      run.flags[o.mend] = false;
      toast('🔧', t('the burner is mended'));
    }
    if (o.sight) {
      const seen = sight();
      if (seen) toast('🔭', seen);
    }
    if (o.calm) {
      run.calm = o.calm;
      toast('🔭', t('fair weather for the next {n} islands', { n: o.calm }));
    }
    if (o.stay) {
      run.stay += o.stay;
      toast('🍵', t('another pot: +{hours} on this island', { hours: hoursOf(o.stay) }));
    }
    if (o.parcel) {
      const left = Object.keys(KEEPSAKES).filter((k) => !has(k));
      if (left.length && Math.random() < 0.25) {
        toast('📦', t('a parcel from home, with a keepsake in it'));
        giveKeepsake();
      } else {
        const gain = parcelOf(o.parcel);
        toast('📦', t('a parcel from home, and inside it: {got}', { got: gotText(gain, give(gain)) }));
      }
    }
    if (o.loud) {
      run.hush -= o.loud;
      toast('🎺', t('the band plays its loudest march, and the Hush falls back {miles}', { miles: miles(o.loud) }));
    }
    if (o.gamble) {
      if (has('coin') || friend(book, 'ruins') || Math.random() < 0.6) {
        if (!has('coin') && Math.random() < 0.35 && Object.keys(KEEPSAKES).some((k) => !has(k))) giveKeepsake();
        else toast('✨', t('you find a little hoard of old coins: {got}', { got: gainText(give({ glimmer: 5 })) }));
      } else {
        give({ glimmer: 1 });
        harm(1, t('a stone falls and grazes the balloon'));
        if (run.hull <= 0) return lose(t('A stone fell from the ruins and tore the balloon past mending.'));
      }
    }
    hud();
    save();
    forced();
  }

  // --- Traits, the pack and the stories of the road ----------------------------------
  // An island's trait, seeded by its word, so the same island always has the same one.
  function traitOf(word) {
    const r = makeRandom(word, 'trait');
    if (r() < 0.5) return null;
    const g = talesView();
    const ids = Object.keys(TRAITS).filter((id) => !TRAITS[id].when || TRAITS[id].when(g));
    return ids[Math.floor(r() * ids.length)];
  }

  function giveItem(id) {
    id ??= pickOf(Object.keys(ITEMS));
    const item = ITEMS[id];
    if (run.pack.length >= PACK) return t('{icon} a {name}, but your pack is full, so you swap it for {got}', { icon: item.icon, name: item.name, got: gainText(give({ glimmer: 3 })) });
    run.pack.push(id);
    toast(item.icon, t('in your pack: the {name}', { name: item.name }));
    return t('{icon} the {name}, for your pack. {line}', { icon: item.icon, name: item.name, line: item.line });
  }

  // What each tool can do right now (a patch kit with every heart whole can't).
  const usable = (id) => (id === 'patch' ? run.hull < MAX.hull : id === 'flare' ? run.hush !== null || run.flags.shadow > 0 || Boolean(run.flags.front) : true);

  function openPack() {
    if (state !== 'land' || !run.pack.length) return;
    state = 'event';
    openCard({
      title: t('your pack'),
      text: [t('One-use tools: each works once, then it’s gone. Using one costs no time.')],
      options: [
        ...run.pack.map((id, i) => ({ label: t('use the {name} {icon}', { name: ITEMS[id].name, icon: ITEMS[id].icon }), note: ITEMS[id].line, disabled: !usable(id), act: () => useItem(i) })),
        { label: t('close the pack'), act: () => { closeCard(); state = 'land'; hud(); } },
      ],
    });
  }

  function useItem(i) {
    const id = run.pack.splice(i, 1)[0];
    closeCard();
    state = 'land';
    if (id === 'patch') toast('🩹', t('you patch the balloon: {got}', { got: gainText(give({ hull: 1 })) }));
    if (id === 'flare') {
      if (run.hush !== null) run.hush -= 6;
      run.flags.shadow = 0;
      run.flags.front = null;
      toast('🎆', t('the flare bursts red and gold, and whatever was following you falls back'));
    }
    if (id === 'sandbag') {
      run.flags.sandbag = true;
      toast('🪨', t('you drop the sandbag: your next flight carries you 3 miles further'));
    }
    if (id === 'umbrella') {
      run.flags.umbrella = true;
      toast('☂️', t('the umbrella is up: your next take-off in a storm won’t tear the balloon'));
    }
    if (id === 'vane') {
      run.flags.vane = true;
      toast('🐓', t('the weathervane swings to fair: clear skies on the next island'));
    }
    if (id === 'needle') {
      run.flags.needle = true;
      toast('🪡', t('the needle quivers: your next island will be a strange one'));
    }
    hud();
    save();
  }

  // The stories of the road, as you land: Odile's race, Wa's torn pages, the kite girl, the sky fair.
  function storyLines(land) {
    const lines = [];
    const here = run.here;
    const race = run.flags.race;
    if (race) {
      if (land.biomeKey === race.biome) {
        run.flags.race = null;
        lines.push(`🏁 ${t('You land first! Odile comes down a minute later, laughing. “Wa’s grandchild, all right.” {keepsake}', { keepsake: giveKeepsake() })}`);
      } else if (run.words.length > race.by) {
        run.flags.race = null;
        lines.push(`🏁 ${t('A message flaps down on a pigeon: “Won! Better luck next time. O.” {got}', { got: gainText(give({ glimmer: -3 })) })}`);
      }
    }
    if (run.flags.scatter?.includes(land.biomeKey)) {
      run.flags.scatter = run.flags.scatter.filter((b) => b !== land.biomeKey);
      if (run.flags.scatter.length) lines.push(`📄 ${t('Caught in a bush here: another of Wa’s torn pages. {n} still to find.', { n: run.flags.scatter.length })}`);
      else {
        run.flags.scatter = null;
        lines.push(`📄 ${t('The last torn page! Together they spell out one of Wa’s words. {secret}', { secret: talesView().secret() })}`);
      }
    }
    const child = run.flags.child;
    if (child) {
      if (land.biomeKey === child.biome) {
        run.flags.child = null;
        lines.push(`🪁 ${t('“Mum!” The kite girl is over the side before you’ve landed. Her family can’t thank you enough. {got} {item}', { got: gainText(give({ glimmer: 6 })), item: giveItem() })}`);
      } else if (run.words.length > child.by) {
        run.flags.child = null;
        lines.push(`🪁 ${t('A balloon from her island finds you and takes the kite girl home. She waves her kite until she’s out of sight.')}`);
      }
    }
    if (run.flags.festival > 0) {
      run.flags.festival--;
      if (here.meanings.some((id) => FEAST.includes(id))) lines.push(`🎪 ${t('The sky fair is here too, and your word fits right in: {got}', { got: gainText(give({ glimmer: 3, food: 1 })) })}`);
    }
    return lines;
  }

  // --- Sightings ------------------------------------------------------------------
  // Islands and buildings you haven't reached, each with the kind of word that
  // calls it. A sighting names one; say a word of that kind next and you steer
  // straight for it (`run.sighting`, honoured in depart).
  function sightings() {
    const out = [];
    for (const [key, b] of Object.entries(BIOMES)) {
      if (b.weight || !ISLAND_WORD[key]) continue;
      const fresh = b.landmark.map(([id]) => id).find((id) => !book.buildings[id]);
      if (!book.islands[key]) out.push({ biome: key, landmark: fresh ?? b.landmark[0][0], word: ISLAND_WORD[key] });
      else if (fresh) out.push({ biome: key, landmark: fresh, word: BUILDING_WORD[fresh] ?? ISLAND_WORD[key] });
    }
    return out;
  }

  function sightText(s) {
    const m = meaning(s.word);
    return t('Far off, you can make out {island}, with {building}. {kind} ({words}…).', {
      island: t(BIOMES[s.biome].label), building: LANDMARK_LABEL[s.landmark], kind: cap(m.name), words: examplesOf(m).join(t(', ')),
    });
  }

  // Sight an island: it goes in the book with the kind of word that leads there
  // (as if someone had told you), and your next word of that kind flies there.
  function sight() {
    const s = pickOf(sightings());
    if (!s) return '';
    run.sighting = s;
    const m = meaning(s.word);
    book.meanings[m.id] ??= { words: examplesOf(m), heard: true };
    book.sighted[`island:${s.biome}`] = s.word;
    book.sighted[`building:${s.landmark}`] = s.word;
    saveBook();
    return sightText(s);
  }

  // Someone explains kinds of words you haven't come across; returns what you learned.
  function teach(n) {
    const unknown = MEANINGS.filter((m) => !book.meanings[m.id]);
    if (!unknown.length) {
      const got = gainText(give({ fuel: 3 }));
      toast('🔥', t('you already know every kind of word, so you get fuel instead: {got}', { got }));
      return t('You already know every kind of word. {got}', { got });
    }
    const names = [];
    for (let i = 0; i < n && unknown.length; i++) {
      const m = unknown.splice(Math.floor(Math.random() * unknown.length), 1)[0];
      book.meanings[m.id] = { words: examplesOf(m), heard: true };
      toast('📖', t('you learn: {name}', { name: m.name }));
      names.push(m.name);
    }
    saveBook();
    return t('📖 {list}.', { list: cap(names.join(t('; '))) });
  }

  function mendRope() {
    if (state !== 'land' || !run.flags.fray) return;
    if (run.stay > 0) spend(1);
    else {
      advance(1);
      api.setClock(run.hours);
    }
    run.flags.fray = false;
    toast('🪢', t('you splice the frayed rope'));
    save();
    hud();
  }

  function waitOutStorm() {
    if (state !== 'land' || !stormy()) return;
    const stay = Math.min(Math.max(run.stay, 0), STORM_WAIT);
    if (stay) spend(stay);
    if (stay < STORM_WAIT) {
      advance(STORM_WAIT - stay);
      api.setClock(run.hours);
    }
    run.waited = true;
    run.here.weather = 'cloudy';
    api.clearStorm();
    toast('⛅', t('the storm blows itself out'));
    hud();
    save();
    forced();
  }

  // --- Reading a word as you type -----------------------------------------------------
  function preview(text) {
    if (!active || state !== 'land') return;
    if (!text.trim()) {
      read.hidden = true;
      return;
    }
    const reading = readWord(text, context());
    read.replaceChildren(...readingLines(reading));
    read.classList.remove('folded');
    read.dataset.kind = 'preview';
    read.hidden = false;
  }

  function readingLines(reading) {
    const problem = problemOf(reading);
    if (problem && problem !== 'empty') return [el('p', 'read-problem', problem)];
    const cost = costOf(reading);
    const hop = hopOf(reading);
    const go = hop.n;
    const lines = [];
    const head = el('p', 'read-head');
    head.append(el('strong', '', reading.word.toUpperCase()), ` · ${miles(go)} · ${ICON.fuel} ${cost.fuel} · ${ICON.food} ${cost.food}`);
    lines.push(head);
    // How far, and why: letters, then whatever stretched or shortened it.
    if (hop.parts.length) {
      const signed = ([k, why]) => `${k > 0 ? '+' : '−'}${Math.abs(k)} ${why}`;
      lines.push(el('p', 'read-line', [t('{n} letters', { n: reading.word.length }), ...hop.parts.map(signed)].join(' · ')));
    }
    const notes = [];
    if (cost.free === 'letter') notes.push(t('the letter in your pocket: free'));
    else if (cost.free === 'whale') notes.push(t('the whale’s song: free'));
    else {
      if (reading.rules.includes('chain')) notes.push(!book.rules.chain ? t('something about this word makes it cheaper…') : has('compass') ? t('tailwind and compass: a quarter of the fuel') : t('tailwind: half the fuel'));
      const heavy = run.omen === 'vowels' ? Math.max(0, (reading.word.match(/[aeiou]/g) ?? []).length - 1) : 0;
      if (heavy) notes.push(t('heavy vowels: +{n} 🔥', { n: heavy }));
      if (has('lodestone') && /[jqxz]/.test(reading.word)) notes.push(t('lodestone: J, Q, X and Z are free'));
      const knows = (id) => Boolean(book.meanings[id]);
      if (reading.effect.wind) {
        notes.push(!knows('wind') && !has('kite') && run.omen !== 'gusty' ? t('something about this word makes it cheaper…')
          : run.omen === 'gusty' ? t('a wind word, on restless winds: a quarter of the fuel') : has('kite') ? t('a wind word, on a kite string: a quarter of the fuel') : t('a wind word: half the fuel'));
      }
      if (reading.effect.leagues && !reading.secret) notes.push(knows('fast') ? t('a fast word: +{miles}', { miles: miles(reading.effect.leagues) }) : t('something about this word carries you further…'));
      if (run.flags.leak) notes.push(t('the leaking burner: +1 🔥'));
      if (run.omen === 'mirror') notes.push(reading.word[0] === reading.word[reading.word.length - 1] ? t('a mirror word: half the fuel') : t('not a mirror word: +1 🔥'));
      if (run.omen === 'lucky' && run.lucky) notes.push(reading.word.includes(run.lucky) ? t('the lucky letter {letter}: +2 🪙 when you land', { letter: run.lucky.toUpperCase() }) : t('no lucky {letter}: +1 🔥', { letter: run.lucky.toUpperCase() }));
      if (has('anchor')) notes.push(t('the golden anchor: +1 🔥'));
      if (reading.effect.light) notes.push(knows('small') ? t('a tiny thing: no food for this flight') : t('something about this word weighs less…'));
    }
    if (run.flags.shadow > 0) notes.push(reading.word.length >= 9 ? t('🏴‍☠️ long enough to lose the pirates') : t('🏴‍☠️ the pirates follow (9 letters or more would lose them)'));
    const bottled = run.flags.hoarded && readWord(reading.word).meanings.some((m) => m.id === run.flags.hoarded);
    if (bottled) notes.push(t('🫙 the Hoarder has this kind of word: it means nothing to the sky'));
    if (notes.length) lines.push(el('p', 'read-line', [...new Set(notes)].join(' · ')));

    // (Mist by the land's weather: heavy rain fogs the air too, but doesn't muffle words.)
    const misty = run.here?.weather === 'mist' || run.here?.trait === 'foggy';
    if (reading.secret) {
      lines.push(el('p', 'read-line', book.secrets[reading.secret]
        ? t('✨ “{word}”, one of Wa’s words: {line}', { word: reading.secret, line: SECRETS[reading.secret].line }) : t('✨ Wa used this word.')));
    }
    if (misty) {
      lines.push(el('p', 'read-line', t('the mist muffles your words: you can’t tell what the sky hears')));
    } else {
      const { items } = heardOf(reading);
      if (items.length) lines.push(el('p', 'read-line', t('the sky hears: {items}', { items: items.join(' · ') })));
      else if (!reading.secret && !bottled) lines.push(el('p', 'read-line', t('you don’t know what this word does yet')));
    }

    // Gates, dares, the map, and what your passengers would make of it.
    const good = [];
    const warnings = [];
    const gate = crosses(reading);
    if (gate && answers(gate, reading)) good.push(`🚪 ${t('{gate} will open for this word', { gate: gate.name })}`);
    else if (gate && !reading.real) warnings.push(`🚪 ${t('{gate} only opens for real English words: −1 ❤️, and you stop short', { gate: gate.name })}`);
    else if (gate) warnings.push(`🚪 ${t('{gate} won’t open for this word: it wants {riddle}. −1 ❤️, and you stop short', { gate: gate.name, riddle: riddleOf(gate).ask })}`);
    if (run.flags.front && run.flags.front.at + 6 >= run.leagues + go) warnings.push(`⛈️ ${t('the storm front would catch you: −1 ❤️ (a longer word stays ahead)')}`);
    if (run.sighting && reading.meanings.some((m) => m.id === run.sighting.word) && run.leagues + go < GOAL) {
      good.push(`🔭 ${t('to the island you saw: {island}, with {building}', { island: t(BIOMES[run.sighting.biome].label), building: LANDMARK_LABEL[run.sighting.landmark] })}`);
    }
    if (run.dare) {
      const dare = DARES[run.dare.id];
      const L = run.dare.letter.toUpperCase();
      if (dareMet(reading)) good.push(`${dare.icon} ${t('starts with {letter}: the pirates will pay', { letter: L })}`);
      else if (dare.test(reading.word, run.dare)) warnings.push(`${dare.icon} ${t('isn’t a real word, so the pirates won’t count it (−1 ❤️ −3 🪙)')}`);
      else warnings.push(`${dare.icon} ${t('doesn’t start with {letter}: the pirates will cut a rope (−1 ❤️ −3 🪙)', { letter: L })}`);
    }
    if (run.flags.map === 2 && run.flags.treasure === reading.word) good.push(t('🗺️ X marks this spot'));
    if (run.quest && reading.word.includes(run.quest)) {
      if (reading.real) good.push(t('👑 the queen will love this word'));
      else warnings.push(t('👑 the queen only counts real words'));
    }
    if (!misty) {
      for (const id of run.crew) {
        if (reading.meanings.some((m) => CREW[id].hint.includes(m.id) && book.meanings[m.id])) good.push(`${CREW[id].icon} ${t('{name} would like it there', { name: CREW[id].name })}`);
      }
    }
    if (good.length) lines.push(el('p', 'read-good', good.join(' · ')));

    const wear = Math.max(0, leavingHarm(cost.food) + (reading.effect.danger && book.meanings.dark && !misty && !guarded() ? 1 : 0)
      + (gate && !answers(gate, reading) ? 1 : 0) + (run.dare && !dareMet(reading) ? 1 : 0)
      - (aboard('balloonist') ? 1 : 0));
    if (wear >= run.hull) warnings.unshift(t('the balloon won’t survive this flight'));
    if (cost.fuel > run.fuel) warnings.push(t('not enough fuel: you have {n}', { n: run.fuel }));
    if (run.leagues + go >= GOAL && (!gate || answers(gate, reading))) warnings.push(t('this word reaches the Edge of the Sky!'));
    if (dark() && !run.lanterns && !has('feather')) warnings.push(book.rules.mishear ? t('it’s dark and you have no lantern: the sky may change a letter of your word') : t('it’s dark: without a lantern, the sky may mishear you'));
    if (stormy()) warnings.push(t('a storm: leaving now tears the balloon (−1 ❤️)'));
    if (cost.food > run.food) warnings.push(t('not enough food: −1 ❤️'));
    if (warnings.length) lines.push(el('p', 'read-warn', warnings.join(' · ')));
    return lines;
  }

  // What the sky makes of a word, in words: only the kinds of words you've learned,
  // and the form rules you've found. Anything else just stirs.
  function heardOf(reading) {
    const known = reading.meanings.filter((m) => book.meanings[m.id]);
    const e = {};
    for (const m of known) for (const [k, v] of Object.entries(m.effect)) if (e[k] === undefined) e[k] = v;
    if (known.some((m) => m.id === 'clock')) e.hour = reading.effect.hour;
    const items = [];
    if (reading.echoOf && book.rules.echo) items.push(t('an echo of “{word}”', { word: reading.echoOf }));
    if (e.biome) items.push(t(BIOMES[e.biome].label));
    if (e.landmark) items.push(LANDMARK_LABEL[e.landmark]);
    if (e.weather) items.push(WEATHER_LABEL[e.weather]);
    if (e.hour !== undefined) items.push(t('arriving at {time}', { time: clock(e.hour) }));
    if (e.river) items.push(t('a waterfall'));
    else if (e.lake || (reading.rules.includes('double') && book.rules.double)) items.push(t('a lake'));
    if (e.wind) items.push(t('a wind'));
    if (e.glimmer && !e.danger) items.push('+🪙');
    if (e.food) items.push('+🍞');
    if (e.fuel) items.push('+🔥');
    if (e.heal || (has('shell') && known.some((m) => m.id === 'sea'))) items.push('+❤️');
    if (e.danger) items.push(guarded() ? t('danger, but you’re guarded · double coins') : t('danger: −1 ❤️ when you land · double coins'));
    if (run.hush !== null && known.some((m) => LIGHT.includes(m.id) || m.id === 'music')) items.push(t('something to drive back the Hush'));
    else if (e.music) items.push(t('a song'));
    if (e.friend) items.push(t('a friendly face'));
    if (e.question) items.push(t('an answer'));
    if (e.gift) items.push(t('a present'));
    if (reading.rules.includes('odd') && book.rules.odd) items.push(t('rare letters: +🪙'));
    if (reading.rules.includes('mirror') && book.rules.mirror) items.push(t('everything doubled'));
    return { items, unknown: known.length < reading.meanings.length };
  }

  // --- Cards and the book ----------------------------------------------------------
  function openCard({ title, text = [], poem, options = [] }) {
    bookPanel.hidden = true;
    card.replaceChildren(el('h2', 'voyage-title', title), ...text.map((line) => el('p', 'voyage-text', line)));
    if (poem?.length) card.append(el('p', 'voyage-poem', poem.join(' → ')));
    const list = el('div', 'voyage-options');
    for (const o of options) {
      const button = el('button', o.primary ? 'voyage-option primary' : 'voyage-option');
      button.type = 'button';
      button.append(el('span', 'option-label', o.label));
      if (o.note) button.append(el('span', 'option-note', o.note));
      button.disabled = Boolean(o.disabled);
      button.addEventListener('click', o.act);
      list.append(button);
    }
    card.append(list);
    card.hidden = false;
    card.scrollTop = 0;
  }

  function closeCard() {
    card.hidden = true;
  }

  function toggleBook() {
    if (!bookPanel.hidden) {
      bookPanel.hidden = true;
      return;
    }
    renderBook();
    bookPanel.hidden = false;
  }

  function renderBook() {
    const parts = [el('h2', 'voyage-title', t('Wa’s book'))];
    const knownMeanings = MEANINGS.filter((m) => book.meanings[m.id]);
    const knownRules = Object.keys(RULES).filter((id) => book.rules[id]);
    const knownSecrets = Object.keys(SECRETS).filter((w) => book.secrets[w]);
    const islands = Object.keys(BIOMES).filter((k) => book.islands[k]);
    const keepsakes = Object.keys(KEEPSAKES).filter((k) => book.keepsakes[k]);
    parts.push(el('p', 'journal-line', t('{meanings} of {allMeanings} kinds of words · {rules} of {allRules} rules · {secrets} of {allSecrets} of Wa’s words · {islands} of {allIslands} islands · {keepsakes} of {allKeepsakes} keepsakes', {
      meanings: knownMeanings.length, allMeanings: MEANINGS.length, rules: knownRules.length + 1, allRules: Object.keys(RULES).length + 1,
      secrets: knownSecrets.length, allSecrets: Object.keys(SECRETS).length, islands: islands.length, allIslands: Object.keys(BIOMES).length,
      keepsakes: keepsakes.length, allKeepsakes: Object.keys(KEEPSAKES).length,
    })));

    // This voyage: what bends it, who's aboard, what's ahead.
    if (active && run && state !== 'over') {
      parts.push(el('h3', '', t('this voyage')));
      parts.push(el('p', 'book-entry', `🔮 ${OMENS[run.omen].name}${COLON}${omenText()}`));
      const gate = nextGate();
      if (gate) {
        const wants = gateKnown() ? t('It opens only for {riddle}.', { riddle: riddleOf(gate).ask }) : t('Nobody has told you what it wants yet.');
        parts.push(el('p', 'book-entry', `🚪 ${t('next, at {miles}: {gate}.', { miles: miles(gate.at), gate: gate.name })} ${wants}`));
      }
      for (const id of run.crew) parts.push(el('p', 'book-entry', `${CREW[id].icon} ${crewLine(id)}`));
      for (const id of run.keepsakes) parts.push(el('p', 'book-entry', `${KEEPSAKES[id].icon} ${KEEPSAKES[id].name}${COLON}${KEEPSAKES[id].line}`));
      if (run.hush !== null) parts.push(el('p', 'book-entry', `🤫 ${t('{gap}. {line}', { gap: cap(hushText()), line: hushLine() })}`));
      if (run.banned.length) parts.push(el('p', 'book-entry', `🤐 ${t('swallowed letters: {letters}. Win them back at a wizard’s tower or a shrine.', { letters: run.banned.join(' ').toUpperCase() })}`));
      if (run.flags.map === 2) parts.push(el('p', 'book-entry', `🗺️ ${t('the map says: “{word}”.', { word: run.flags.treasure })}`));
      if (run.sighting) parts.push(el('p', 'book-entry', `🔭 ${sightText(run.sighting)}`));
      if (run.rough) parts.push(el('p', 'book-entry', roughLine()));
      if (run.flags.leak) parts.push(el('p', 'book-entry', `🔥 ${t('the burner is leaking: every flight burns 1 more 🔥 until a village, a campsite or a balloon workshop mends it.')}`));
      if (run.flags.fray) parts.push(el('p', 'book-entry', `🪢 ${t('a rope is fraying: mend it here (an hour), or lose a heart when you take off.')}`));
      if (run.flags.shadow > 0) {
        const left = run.flags.shadow === 1 ? t('1 more island') : t('{n} more islands', { n: run.flags.shadow });
        parts.push(el('p', 'book-entry', `🏴‍☠️ ${t('pirates on your tail: they take 3 🪙 (or 2 🍞) each time you land, for {left}. A word of 9 letters or more loses them.', { left })}`));
      }
      if (run.flags.burner) parts.push(el('p', 'book-entry', `🔥 ${t('a bigger burner: it holds {n} fuel.', { n: holds('fuel') })}`));
      if (run.flags.brace > 0) parts.push(el('p', 'book-entry', `🪵 ${t('a braced basket: it stops the next {n} tears.', { n: run.flags.brace })}`));
      if (run.flags.clock != null) parts.push(el('p', 'book-entry', `🕰️ ${t('the great clock is set for the next island.')}`));
      if (run.pack.length) parts.push(el('p', 'book-entry', `🎒 ${t('your pack: {items}', { items: run.pack.map((id) => `${ITEMS[id].icon} ${ITEMS[id].name}`).join(t(', ')) })}`));
      if (run.flags.race) parts.push(el('p', 'book-entry', `🏁 ${t('racing Odile to {island}: land there by flight {n}.', { island: t(BIOMES[run.flags.race.biome].label), n: run.flags.race.by })}`));
      if (run.flags.scatter) parts.push(el('p', 'book-entry', `📄 ${t('Wa’s torn pages are still on {islands}.', { islands: run.flags.scatter.map((b) => t(BIOMES[b].label)).join(t(', ')) })}`));
      if (run.flags.child) parts.push(el('p', 'book-entry', `🪁 ${t('taking the kite girl home to {island}: get there by flight {n}.', { island: t(BIOMES[run.flags.child.biome].label), n: run.flags.child.by })}`));
      if (run.flags.festival > 0) parts.push(el('p', 'book-entry', `🎪 ${t('the sky fair: food and music words pay for {left}.', { left: run.flags.festival === 1 ? t('1 more island') : t('{n} more islands', { n: run.flags.festival }) })}`));
      if (run.flags.front) parts.push(el('p', 'book-entry', `⛈️ ${t('a storm front is chasing you: it gains 6 miles a flight, for {left}. If it catches you, −1 ❤️.', { left: run.flags.front.left === 1 ? t('1 more flight') : t('{n} more flights', { n: run.flags.front.left }) })}`));
      if (run.flags.hoarded) parts.push(el('p', 'book-entry', `🫙 ${t('the Hoarder has your {words}: they mean nothing to the sky this voyage.', { words: examplesOf(meaning(run.flags.hoarded)).join(t(', ')) })}`));
    }

    const pages = Object.keys(STORY.pages).filter((id) => book.pages[id]);
    if (pages.length) {
      parts.push(el('h3', '', t('Wa’s pages')));
      for (const id of pages) parts.push(el('p', 'book-entry', STORY.pages[id](book.pages[id])));
    }

    const begun = Object.keys(ARCS).filter((id) => book.arcs[id]);
    if (begun.length) {
      parts.push(el('h3', '', t('stories')));
      for (const id of begun) {
        const arc = ARCS[id], progress = book.arcs[id];
        parts.push(el('p', 'book-entry', progress.done
          ? `${arc.icon} ${arc.name}${COLON}${arc.perk}`
          : `${arc.icon} ${arc.name} · ${t('chapter {n} of {total}, next time you visit', { n: progress.ch + 1, total: arc.chapters.length })}`));
      }
    }

    parts.push(el('h3', '', t('how words fly')));
    parts.push(el('p', 'book-entry', t('Every letter burns one fuel and carries you about a mile. The wind, the island you leave from, and how far away the word sounds (the stars are far, home is close) make the hop longer or shorter.')));
    for (const [id, rule] of Object.entries(RULES)) {
      parts.push(book.rules[id] ? el('p', 'book-entry', `${rule.name}${COLON}${rule.line}`) : el('p', 'book-entry unknown', t('??? something about {hint}', { hint: rule.hint })));
    }

    parts.push(el('h3', '', t('what words mean')));
    for (const m of knownMeanings) {
      const entry = book.meanings[m.id];
      const p = el('p', 'book-entry', `${m.name}`);
      const words = entry.words.join(t(', '));
      if (entry.words.length) p.append(el('span', 'book-words', ` · ${entry.heard ? t('like {words}', { words }) : t('you said {words}', { words })}`));
      parts.push(p);
    }
    const missing = MEANINGS.length - knownMeanings.length;
    if (missing) parts.push(el('p', 'book-entry unknown', t('{n} more to discover. Try words about anything: animals, food, colours, the sea, the weather, feelings…', { n: missing })));

    parts.push(el('h3', '', t('Wa’s words')));
    for (const w of knownSecrets) parts.push(el('p', 'book-entry', `“${w}”${COLON}${SECRETS[w].line}`));
    const hidden = Object.keys(SECRETS).length - knownSecrets.length;
    if (hidden) parts.push(el('p', 'book-entry unknown', t('{n} still hidden. Wizards know some, and so do her pages.', { n: hidden })));

    // The atlas: every island and building, reached, sighted (with the words that
    // lead there) or still to find.
    parts.push(el('h3', '', t('atlas')));
    const atlas = (keys, kind, label, line) => {
      const reached = keys.filter((k) => (kind === 'island' ? book.islands : book.buildings)[k]);
      const sighted = keys.filter((k) => !reached.includes(k) && book.sighted[`${kind}:${k}`]);
      parts.push(el('p', 'book-entry', line(reached.length, reached.map(label).join(t(', ')) || t('none yet'))));
      if (sighted.length) {
        const list = sighted.map((k) => t('{name} ({words}…)', { name: label(k), words: examplesOf(meaning(book.sighted[`${kind}:${k}`])).join(t(', ')) }));
        parts.push(el('p', 'book-entry', `🔭 ${t('sighted: {list}', { list: list.join(t('; ')) })}`));
      }
      const left = keys.length - reached.length - sighted.length;
      if (left) parts.push(el('p', 'book-entry unknown', t('still to find: {n}', { n: left })));
    };
    atlas(Object.keys(BIOMES), 'island', (k) => t(BIOMES[k].label), (n, list) => `🏝️ ${t('{n} of {all} islands: {list}', { n, all: Object.keys(BIOMES).length, list })}`);
    atlas(BUILDINGS, 'building', (k) => LANDMARK_LABEL[k], (n, list) => `🏛️ ${t('{n} of {all} buildings: {list}', { n, all: BUILDINGS.length, list })}`);
    parts.push(el('p', 'book-entry', t('keepsakes: {icons}', { icons: Object.keys(KEEPSAKES).map((k) => (book.keepsakes[k] ? KEEPSAKES[k].icon : '·')).join(' ') })));
    const metCrew = Object.keys(CREW).filter((k) => book.crew[k]);
    if (metCrew.length) {
      const list = metCrew.map((k) => `${CREW[k].icon} ${book.crew[k] === 'home' ? t('{name} (home)', { name: CREW[k].name }) : CREW[k].name}`).join(t(', '));
      parts.push(el('p', 'book-entry', t('passengers: {list}', { list })));
    }

    if (book.voyages.length) {
      parts.push(el('h3', '', t('your voyages')));
      for (const v of book.voyages.slice(0, 5)) {
        const p = el('p', 'book-entry', `${v.won ? '🌅' : '☁️'} ${miles(v.leagues)} · 🪙 ${v.glimmer}${v.omen ? ` · ${OMENS[v.omen]?.name}` : ''}${v.title ? ` · ${t(v.title)}` : ''} · `);
        p.append(el('span', 'book-words', v.words.slice(1).join(' → ') || t('still at the harbour')));
        parts.push(p);
      }
    }

    if (active && state !== 'over') {
      const row = el('div', 'voyage-options');
      for (const [label, note, act] of [
        [t('set the voyage aside'), t('it’s saved: continue any time'), setAside],
        [t('abandon this voyage'), t('it ends here; you keep your book'), () => lose(t('You let go of the ropes.'))],
      ]) {
        const button = el('button', 'voyage-option');
        button.type = 'button';
        button.append(el('span', 'option-label', label), el('span', 'option-note', note));
        button.addEventListener('click', act);
        row.append(button);
      }
      parts.push(row);
    }
    bookPanel.replaceChildren(...parts);
  }

  // You know what a gate wants once it's near, or once someone has told you.
  const gateKnown = () => nextGate() && (nextGate().at - run.leagues <= 15 || run.flags.gossip === run.gates
    || (run.riddles[GATES.indexOf(nextGate())] === 'wa' && run.events.includes('camp')));
  const hushText = () => {
    const gap = Math.max(0, Math.round(run.leagues - run.hush));
    return gap ? t('the Hush is {miles} behind you', { miles: miles(gap) }) : t('the Hush is upon you');
  };
  const hushLine = () => t('It gains about {miles} every hour. Long words outrun it. Sunny, morning and evening words (sunshine, dawn, sunset…) drive it back, and so do music words (song, fiddle…). If it catches you, it takes something: a letter, coins, a lantern or a heart.', {
    miles: miles(Math.round(hushSpeed() * 10) / 10),
  });
  const omenLine = () => t('🔮 This voyage’s omen: {name}. {line}', { name: OMENS[run.omen].name, line: omenText() });

  // --- The voyage at a glance ------------------------------------------------------------
  function hud() {
    if (!active || !run) return;
    const hearts = `${'❤️'.repeat(Math.max(0, run.hull))}${'🤍'.repeat(Math.max(0, MAX.hull - run.hull))}`;
    const of = (n, max) => t('{n} of {max}', { n, max });
    // [id, what the gauge shows, name, how much you have, what it does, mood]
    tips.clear();
    const bits = [
      ['fuel', `${ICON.fuel} ${run.fuel}`, t('🔥 fuel'), of(run.fuel, holds('fuel')),
        t('Every letter you say burns one. Trees on woody islands (autumn woods, highlands, storm crags…) give more, and so do fire words (flame, ember…) and markets. Nearly out? Any tree gives a few dry twigs, or you can drift on the wind (−1 ❤️).')],
      ['food', `${ICON.food} ${run.food}`, t('🍞 food'), t('{n} of {max} · your next flight eats {cost}', { n: run.food, max: MAX.food, cost: foodCost() }),
        t('Every flight eats some: more in the cold, and more with passengers aboard. Fly without enough and the balloon tears (−1 ❤️). Trees, fish and feast words (pie, honey…) give more.')],
      ['hull', hearts, t('❤️ the balloon'), of(run.hull, MAX.hull),
        t('Storms, hunger, drifting, dark words and closed gates each tear it (−1 ❤️). Shrines, kind words (heal, hug…) and a night at the hermit’s cabin mend it. Lose the last heart and the voyage is over.')],
      ['glimmer', `${ICON.glimmer} ${run.glimmer}`, t('🪙 coins'), String(run.glimmer),
        t('Spend them at markets and villages, or save them: whatever you still have at the Edge is your score.')],
      ['lanterns', `${ICON.lanterns} ${run.lanterns}`, t('🏮 lanterns'), of(run.lanterns, MAX.lanterns),
        t('Each night flight burns one, and stops the sky mishearing your word. With none, the dark may change a letter of it. Lighthouses and markets have more.')],
      ['day', t('day {n}', { n: run.day }), t('📅 day {n}', { n: run.day }), '',
        t('Every tap on an island takes an hour (leaving takes none), and each flight about an hour for every 3 miles.')],
    ];
    if (run.hush !== null) {
      const gap = Math.max(0, Math.round(run.leagues - run.hush));
      bits.push(['hush', `🤫 ${gap}`, t('🤫 the Hush'), hushText(), hushLine(), gap <= 4 ? 'danger' : '']);
    }
    if (run.quest) {
      bits.push(['quest', `👑 ${run.quest.toUpperCase()}`, t('👑 the queen’s quest'), '',
        t('Say a real word with {letter} in it, any time this voyage: +{coins} 🪙 +1 ❤️ when you land.', { letter: aLetter(run.quest), coins: friend(book, 'castle') ? 10 : 6 })]);
    }
    if (run.dare) {
      bits.push(['dare', DARES[run.dare.id].label(run.dare), t('🏴‍☠️ the pirates’ dare'), '',
        t('Your next word must be a real word starting with {letter}: +8 🪙 if it is, −1 ❤️ −3 🪙 if it isn’t.', { letter: run.dare.letter.toUpperCase() })]);
    }
    if (run.freeLetter) {
      bits.push(['letter', `🔤 ${run.freeLetter.toUpperCase()}`, t('🔤 a free letter'), '',
        t('Your next word with {letter} in it costs no fuel.', { letter: aLetter(run.freeLetter) })]);
    }
    if (run.freeNext) bits.push(['whale', '🐋', t('🐋 the whale’s song'), '', t('Your next word costs no fuel.')]);
    if (run.blessing) bits.push(['blessing', '🙏', t('🙏 blessed'), '', t('Your next flight needs no food.')]);
    if (run.calm) {
      bits.push(['calm', `☀️ ${run.calm}`, t('☀️ fair weather'), run.calm === 1 ? t('1 more island') : t('{n} more islands', { n: run.calm }),
        t('Islands arrive under clear skies, unless your word asks for other weather.')]);
    }
    if (run.banned.length) {
      bits.push(['banned', `🤐 ${run.banned.join('').toUpperCase()}`, t('🤐 swallowed letters'), run.banned.join(' ').toUpperCase(),
        t('The Hush took them. No word with them will fly until you win them back at a wizard’s tower or a shrine.'), 'danger']);
    }
    gauges.replaceChildren(...bits.map(gauge));

    const aboardBits = [['omen', '🔮', t('🔮 omen: {name}', { name: OMENS[run.omen].name }), '', omenText()]];
    for (const id of run.crew) {
      aboardBits.push([`crew:${id}`, CREW[id].icon, `${CREW[id].icon} ${cap(CREW[id].name)}`, '',
        t('{help}. {eats}. Wants to reach {wish}, and will thank you there.', { help: cap(CREW[id].help), eats: cap(eats(id)), wish: CREW[id].wish })]);
    }
    for (const id of run.keepsakes) aboardBits.push([`keepsake:${id}`, KEEPSAKES[id].icon, `${KEEPSAKES[id].icon} ${KEEPSAKES[id].name}`, '', KEEPSAKES[id].line]);
    aboardRow.replaceChildren(...aboardBits.map(gauge));
    // A tip that's showing follows the numbers (or goes, if its gauge has).
    if (tipFor) showTip(tipFor);

    progressFill.style.width = `${Math.min(100, (run.leagues / GOAL) * 100)}%`;
    progress.title = t('{done} of {goal} miles', { done: run.leagues, goal: GOAL });
    progress.dataset.label = t('{done} / {goal} miles', { done: run.leagues, goal: GOAL });

    const parts = [];
    if (lingering) parts.push(el('span', '', t('the Edge of the Sky')), chip(lingering === 'wa' ? t('⛵ fly Wa home') : t('⛵ fly home'), end));
    else if (state === 'flying') parts.push(el('span', '', t('flying…')));
    else if (state === 'land' || state === 'event') {
      const taps = [t('trees'), run.here?.lake && t('water'), LANDMARK_LABEL[run.here?.landmark]].filter(Boolean);
      parts.push(el('span', '', run.stay > 0
        ? t('{hours} here · tap {where}', { hours: hoursOf(run.stay), where: orList(taps) })
        : t('time to go · type a word to fly on')));
      const gate = nextGate();
      if (gate && gateKnown()) {
        const known = run.riddles[GATES.indexOf(gate)] === 'wa' ? ` ${t('(the book has {n})', { n: Object.keys(SECRETS).filter((w) => book.secrets[w]).length })}` : '';
        parts.push(el('span', 'status-gate', `🚪 ${t('{gate} in {miles}: it opens only for {riddle}', { gate: gate.name, miles: miles(Math.max(0, gate.at - run.leagues)), riddle: riddleOf(gate).ask })}${known}`));
      }
      if (run.flags.map === 2) parts.push(el('span', 'status-gate', `🗺️ ${t('the map says: “{word}”', { word: run.flags.treasure })}`));
      if (stormy()) parts.push(chip(t('wait out the storm · {n} hours', { n: STORM_WAIT }), waitOutStorm));
      if (run.flags.fray && state === 'land') parts.push(chip(t('🪢 mend the rope · 1 hour'), mendRope));
      if (run.pack.length && state === 'land') parts.push(chip(`🎒 ${run.pack.map((id) => ITEMS[id].icon).join('')}`, openPack));
      if (TRAITS[run.here?.trait]) parts.push(el('span', 'status-gate', `${TRAITS[run.here.trait].icon} ${TRAITS[run.here.trait].name}`));
      if (run.flags.front) parts.push(el('span', 'status-gate', `⛈️ ${t('storm front {miles} behind', { miles: miles(Math.max(0, Math.round(run.leagues - run.flags.front.at))) })}`));
      if (run.fuel < 3 + surcharge() && !run.freeLetter && !run.freeNext) {
        const fatal = 1 + leavingHarm() - (aboard('balloonist') ? 1 : 0) >= run.hull;
        parts.push(chip(t('low on fuel: drift a few miles on the wind (it picks the word) · {cost}', { cost: fatal ? t('it would end your voyage') : '−1 ❤️' }), drift));
      }
    }
    status.replaceChildren(...parts);
  }

  // Hovering shows a gauge's tip; a tap (or click) pins it until you tap
  // elsewhere, which is how it works on a phone.
  const tips = new Map(); // gauge id -> [name, how much, what it does]
  let tipFor = null;
  let tipPinned = false;

  function showTip(id) {
    const info = tips.get(id);
    if (!info) return hideTip();
    const [name, now, line] = info;
    const head = el('p', 'tip-head');
    head.append(el('strong', '', name));
    if (now) head.append(tidy(` · ${now}`));
    tip.replaceChildren(head, el('p', '', line));
    tip.hidden = false;
    tipFor = id;
  }

  function hideTip() {
    tip.hidden = true;
    tipFor = null;
    tipPinned = false;
  }

  addEventListener('pointerdown', (event) => {
    if (tipPinned && !event.target.closest?.('.gauge')) hideTip();
  });

  function gauge([id, text, name, now, line, mood]) {
    const node = el('span', mood ? `gauge ${mood}` : 'gauge', text);
    tips.set(id, [name, now, line]);
    node.setAttribute('aria-label', [name, now, line].filter(Boolean).join(' · '));
    node.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && !tipPinned) showTip(id);
    });
    node.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && !tipPinned) hideTip();
    });
    node.addEventListener('click', () => {
      if (tipPinned && tipFor === id) return hideTip();
      showTip(id);
      tipPinned = true;
    });
    return node;
  }

  function chip(label, act) {
    const button = el('button', 'chip', label);
    button.type = 'button';
    button.addEventListener('click', act);
    return button;
  }

  return {
    get active() {
      return active;
    },
    // On the last land: an aurora night at the Edge of the Sky.
    get finale() {
      return active && finale;
    },
    // Rolling the ball out of a hedge maze pays, once per island.
    mazeWon() {
      if (!active || !run?.here || state === 'over' || run.flags.mazed === run.here.word) return;
      run.flags.mazed = run.here.word;
      toast('🌀', t('out of the maze: {got} {item}', { got: gainText(give({ glimmer: 4 })), item: giveItem() }));
      hud();
      save();
    },
    // Wa's lantern on the last island: dark until she's said her word, lit once she's home.
    get relit() {
      return active && finale && (state === 'over' || book.found) ? 1 : 0;
    },
    // What the land for `seed` should be like (see generateLand), on a voyage.
    landOptions(seed) {
      return isHere(seed) ? run.here.want : undefined;
    },
    // How Wa's balloon looks right now (main.js draws it): a tear for each
    // heart lost, the burner by the fuel, a lamp for each lantern.
    gear() {
      return active && run ? { hull: run.hull, maxHull: MAX.hull, fuel: run.fuel, lanterns: run.lanterns } : null;
    },
    // The moment and weather of the land for `seed`, on a voyage.
    vibe(seed, land) {
      if (!isHere(seed)) return null;
      const here = run.here;
      const r = makeRandom(here.word, 'voyage');
      const moonPhase = here.moon ?? (run.omen === 'fullmoon' ? 0.5 : r());
      here.weather ??= rollWeather(r, land.biomeKey);
      return { hours: land.biomeKey === 'icefall' ? 23 : run.hours, moonPhase, weather: here.weather };
    },
    // Pick the saved voyage back up (after switching language); false if there's none.
    pickUp() {
      if (!run?.here) return false;
      resume();
      return true;
    },
    arrived,
    note,
    tapped,
    preview,
    submit,
    toggleBook,
    // The word you're on, as the sky heard it.
    word() {
      return run?.here?.word ?? '';
    },
    update(next) {
      env = next;
    },
  };
}
