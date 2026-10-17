// The sky has a language. On a voyage (voyage.js) every destination is a word:
// its letters are the distance, its meaning shapes the land, and its form
// (chains, doubled letters, mirrors, rare letters, anagrams) bends the trip.
// Everything here is a pure function of the word, so the preview you see while
// typing and the flight you take always agree.

// What words mean. A word means something if it's listed (or is a plural, -ing
// or -ed form of a listed word), or else if it contains one of the roots, so
// "snowdrift" is wintry and "brainstorm" brings a storm. Each meaning has a
// name for the language book and a line the sky says when you arrive.
import { t } from './i18n.js';

const MEANINGS_SPEC = [
  // --- Lands --------------------------------------------------------------
  ['winter', 'winter words call snowfields', 'Snow has settled on everything.', { biome: 'snowfield' },
    'winter wintry snowy snowman snowball frost frosty frozen freeze ice icy icicle iceberg glacier arctic antarctic polar tundra chill chilly cold sleigh sled sledge ski skate igloo yeti penguin walrus narwhal reindeer caribou mitten scarf earmuff december january february north northern nordic norway sweden finland iceland greenland alaska siberia lapland yukon frostbite shiver numb pale white crystalline hibernate parka fleece snowdrift holly mistletoe christmas yule jingle ermine evergreen',
    'snow frost winter glacier freez frozen icicle arctic polar'],
  ['sand', 'desert words call deserts', 'Heat shimmers off the terraced rock.', { biome: 'desert' },
    'desert dune sand sandy sahara mirage cactus cacti camel caravan scorpion lizard gecko cobra viper vulture coyote tumbleweed canyon mesa butte arid dry drought dust dusty heat hot scorching scorched parched thirst thirsty pyramid pharaoh sphinx nile egypt arabia bedouin nomad bazaar spice saffron cumin cinnamon date palm sandstone adobe terracotta cowboy rodeo western outlaw sheriff saloon mojave gobi kalahari atacama sunburn',
    'sand desert dune cactus camel pyramid'],
  ['harvest', 'autumn words call autumn woods', 'The woods have turned to copper and gold.', { biome: 'autumn' },
    'autumn autumnal fall harvest leaf leaves maple october november september pumpkin cider acorn squirrel red crimson scarlet orange amber copper chestnut hazelnut walnut nut orchard apple pear sweater cardigan russet auburn gourd squash scarecrow crow raven woodland forest woods wood oak beech birch fern thanksgiving halloween conker fig plum grape vineyard wine vintage cranberry foliage rustle crunch hayride',
    'autumn harvest maple pumpkin orchard acorn squirrel'],
  ['bloom', 'flower and love words call blossom vales', 'Pink petals everywhere, even in your hair.', { biome: 'blossom' },
    'blossom bloom cherry sakura petal spring springtime flower floral rose tulip lily orchid peony lilac jasmine lotus camellia magnolia wisteria hydrangea poppy iris violet daffodil bluebell primrose love lover lovely kiss heart valentine romance romantic wedding bride darling sweetheart blush pink rosy peach garden perfume nectar bee butterfly april may easter nest songbird robin poem poetry sonnet tender silk silken lace ribbon japan kyoto kimono bouquet pollen',
    'blossom bloom flower petal cherry sakura garden'],
  ['mountain', 'mountain words call the highlands', 'Pines climb toward a snowy peak.', { biome: 'highlands' },
    'mountain peak summit highland alpine alps pine pinecone ridge cliff eagle falcon hawk glen loch scotland scottish kilt bagpipe granite boulder rock rocky slate fjord yak sherpa everest himalaya tibet andes goat ibex marmot climb climber trek valley gorge ravine thistle wolf avalanche tartan whisky highlander altitude vista',
    'mountain summit alpine highland cliff'],
  ['field', 'field words call meadows', 'Grass ripples all the way to the edge.', { biome: 'meadow' },
    'meadow field grass grassy farm farmer farmyard cow cattle sheep lamb pony horse foal picnic clover daisy dandelion buttercup pasture hay haystack barn summer june july august bunny rabbit hare cricket grasshopper countryside shepherd dairy milk lark hedge hedgerow tractor plough plow sunflower wildflower green verdant pastoral acre goose hen chicken piglet pig',
    'meadow pasture grass'],
  ['dream', 'starry, dreamy words call dreamlands', 'Purple grass, glowing crystals, and trees the colour of mint.', { biome: 'dream' },
    'dream dreamy dreamer sleep sleepy slumber lullaby star starry starlight galaxy cosmic cosmos nebula comet planet universe wish fairy unicorn pegasus dragon myth mythic legend spirit soul velvet wonder wonderland imagine imagination fantasy illusion kaleidoscope glitter sparkle twinkle constellation constellations oracle tarot zodiac astral ether elysium nirvana paradise heaven angel halo celestial iridescent pastel neverland moonbeam stardust daydream reverie whimsy whimsical lucid',
    'dream galax cosmic celest stardust'],

  // Islands only a voyage reaches (see BIOMES in world.js).
  ['volcano', 'volcano words call ember isles', 'Lava glows in the cracks, and the ground is warm underfoot.', { biome: 'ember' },
    'volcano volcanic lava magma molten cinder cinders obsidian basalt sulfur sulphur brimstone eruption erupt crater caldera pumice scorch smoulder smolder geyser vulcan pompeii hellfire',
    'volcan lava magma molten erupt'],
  ['glass', 'glass words call glass isles', 'Trees of glass ring like bells whenever the wind blows.', { biome: 'glass' },
    'glass crystal crystals quartz prism mirror silver opal amethyst translucent transparent shimmer shimmering glint chandelier bauble geode lens window iridescent pane fragile',
    'crystal glass prism quartz shimmer'],
  ['bog', 'swamp words call mires', 'The ground squelches, and pale lights wander over the water.', { biome: 'mire', lake: true },
    'swamp swampy bog boggy marsh marshy mire fen bayou murky mud muddy sludge slime slimy toad newt quagmire mangrove leech peat wisp',
    'swamp marsh bayou quagmire'],
  ['reef', 'island words call coral shoals', 'Warm shallows, and coral in every colour.', { biome: 'coral' },
    'coral reef beach beaches atoll island isle islet tropic tropical tropics shoal turtle coconut mango papaya pineapple hibiscus snorkel scuba hammock surf surfing surfer hawaii tahiti bali caribbean aloha luau parrot flamingo seahorse clownfish',
    'coral tropic atoll island'],
  ['fungus', 'mushroom words call toadstool woods', 'Toadstools taller than the trees, and spores drifting like dust in the light.', { biome: 'toadstool' },
    'mushroom mushrooms toadstool toadstools fungus fungi fungal mould mold spore spores truffle morel chanterelle puffball mycelium moss mossy lichen gnome pixie sprite goblin hobbit burrow',
    'mushroom toadstool fung spore'],
  ['crag', 'wild, lonely words call storm crags', 'Wind howls over bare rock, and the pines all lean one way.', { biome: 'stormcrag' },
    'crag craggy bluff spire pinnacle precipice tor scree windswept howl howling desolate barren bleak lonely lonesome stark heights eyrie',
    'crag pinnacle precipice windswept'],
  ['jungle', 'jungle words call jungles', 'Vines hang from every branch, and the warm air drips.', { biome: 'jungle' },
    'jungle jungles rainforest canopy vine vines liana monkey monkeys gorilla tiger jaguar panther toucan sloth amazon congo borneo humid steamy orangutan chimpanzee',
    'jungl rainforest'],
  ['safari', 'safari words call savannas', 'Tall gold grass and a few flat-topped trees, as far as you can see.', { biome: 'savanna' },
    'safari savanna savannah lion lions lioness giraffe zebra elephant rhino hippo antelope gazelle acacia serengeti kenya africa grassland plains wildebeest cheetah hyena baobab',
    'savann safari giraffe'],
  ['moor', 'moor words call heaths', 'Heather and gorse, purple and brown, and a cold wind over it all.', { biome: 'heath' },
    'moor moors moorland heath heather gorse bracken wuthering yorkshire grouse curlew peatland',
    'heath heather moorland'],
  ['purple', 'purple words call lavender fields', 'Rows of lavender, and a smell you can almost taste.', { biome: 'lavender' },
    'lavender purple mauve provence sachet heliotrope indigo amethyst',
    'lavender purpl'],
  ['soft', 'soft words call cloud isles', 'Everything here is white and soft, and the ground gives a little underfoot.', { biome: 'cloudisle' },
    'soft softly fluffy fluff cotton wool woolly pillow pillows cushion marshmallow duvet cuddle snuggle puff puffy downy',
    'fluff pillow cushion'],
  ['sweet', 'sweet words call sugar isles, and food', 'Pink grass, candy trees, and a lake that tastes of lemonade.', { biome: 'sugar', food: 2 },
    'sugar sugary sweet sweets candy candies lollipop toffee caramel fudge marzipan bonbon cupcake frosting icing sprinkles gingerbread licorice gumdrop syrup treacle dessert',
    'sugar candy lollipop caramel'],

  // --- Landmarks -----------------------------------------------------------
  ['crown', 'crown words raise castles', 'Banners snap on the castle towers.', { landmark: 'castle' },
    'castle king queen prince princess knight throne crown royal royalty kingdom fort fortress citadel palace duke duchess earl lord lady noble banner sword shield armor armour moat drawbridge court jester majesty regal reign battlement turret dungeon siege joust tournament chivalry squire monarch emperor empress sceptre scepter camelot',
    'castle kingdom knight throne palace royal'],
  ['bread', 'bread words turn windmills', 'The windmill sails turn, slow and patient.', { landmark: 'windmill' },
    'mill windmill miller flour bread grain wheat barley rye oat bake baker bakery loaf loaves dough oven pastry croissant muffin bagel biscuit holland dutch scone crumpet toast sourdough knead yeast granary',
    'windmill bread flour wheat'],
  ['sea', 'sea words light lighthouses', 'A lighthouse stands at the island’s edge, keeping watch.', { landmark: 'lighthouse' },
    'lighthouse light lamp beacon lantern harbor harbour port pier jetty dock ship boat sail sailor captain anchor coast coastal shore seashore sea ocean wave tide gull seagull pirate voyage compass keeper buoy reef shell seashell starfish crab lobster octopus oyster squid jellyfish maritime nautical navy mermaid whale dolphin cove bay driftwood salt salty brine kelp seaweed foghorn mariner navigator',
    'lighthouse harbor harbour beacon lantern ocean sailor'],
  ['home', 'home words build cabins', 'Smoke curls from a cabin chimney.', { landmark: 'cabin' },
    'cabin hut home homely cottage house hermit log woodsman lumberjack cozy cosy hearth chimney quilt blanket fireplace nook retreat lodge shelter kettle soup stew broth grandma grandpa granny grandmother grandfather slippers chair table teapot teacup porch rocking candle knitting yarn sofa homestead shack bungalow attic cellar pantry',
    'cabin cottage hermit hearth'],
  ['town', 'town words gather villages', 'Little houses crowd around a market square.', { landmark: 'village' },
    'village town market folk neighbor neighbour inn tavern pub square fair festival carnival parade shop merchant trade gossip hamlet community family cobbler smith blacksmith well street lane chapel church townsfolk fete postman laundry city paris london',
    'village market festival carnival'],
  ['trail', 'trail words pitch camps', 'Someone has left a campfire burning low.', { landmark: 'campsite' },
    'camp camping camper tent campfire bonfire scout hike hiking hiker trail adventure adventurer explore explorer wander wanderer journey path ranger story stories rucksack backpack map canteen wilderness outdoors cookout marshmallow',
    'camp adventur wander journey explor'],
  ['ancient', 'ancient words uncover ruins', 'Broken columns lean in the long light.', { landmark: 'ruins' },
    'ruin ruins ancient relic tomb forgotten empire rome roman greek greece column pillar archaeology fossil artifact artefact crypt catacomb atlantis lost decay history historic old antique inca maya mayan aztec babylon olympus colosseum acropolis mummy sarcophagus rubble remnant remains bygone ageless timeworn yesterday',
    'ancient ruin relic empire archae'],
  ['ritual', 'stone words raise standing stones', 'Old stones stand in a ring, humming.', { landmark: 'stones' },
    'stone stones druid henge stonehenge rune ritual solstice equinox menhir monolith megalith totem pagan celtic viking oath ancestor elder standing sacred rite chant drum tribe tribal omen prophecy',
    'stone druid ritual monolith'],
  ['magic', 'magic words summon wizards', 'A crooked tower leans against the sky.', { landmark: 'wizard' },
    'wizard mage magi magic magical spell tower potion alchemy alchemist sorcerer sorcery warlock witch wand staff merlin enchant enchanted enchantment hex arcane grimoire familiar cauldron broom broomstick robe conjure charm trick riddle scroll tome spellbook apprentice library book books',
    'wizard magic sorcer enchant alchem potion'],
  ['calm', 'calm words find shrines', 'A bell rings once, somewhere quiet.', { landmark: 'shrine' },
    'shrine zen torii prayer pray monk peace peaceful calm tranquil tranquility serene serenity quiet tea teahouse bamboo koi bell gong incense meditate meditation buddha karma harmony balance haiku blessing gratitude mindful stillness hush patience pilgrim pilgrimage temple bonsai origami',
    'shrine tranquil serene meditat pilgrim'],

  // --- Weather -------------------------------------------------------------
  ['storm', 'stormy words bring storms', 'Thunder rolls overhead, and the ropes hum.', { weather: 'storm' },
    'storm stormy thunder lightning tempest hurricane typhoon cyclone tornado twister gale squall fury furious rage raging wrath anger angry war battle chaos roar crash boom electric zeus thor turmoil uproar havoc',
    'storm thunder tempest hurricane lightning'],
  ['rain', 'sad words bring rain', 'Rain patters on the leaves.', { weather: 'rain' },
    'rain rainy rainfall drizzle shower monsoon puddle umbrella tears cry sorrow sad sadness gloom gloomy melancholy blue wet damp soggy drip droplet raindrop raincoat wellies galoshes pitter patter downpour deluge weep grief regret sorry',
    'rainfall drizzle monsoon umbrella'],
  ['snowfall', 'snowy words bring snowfall', 'Snowflakes drift down without a sound.', { weather: 'snow' },
    'snow snowfall snowflake blizzard flurry sleet hail',
    'snow blizzard'],
  ['mist', 'misty words bring mist', 'Mist rolls in, and the edges disappear.', { weather: 'mist' },
    'mist misty fog foggy haze hazy smoke smoky steam ghost ghostly phantom spectre specter veil veiled shadow mystery mysterious whisper murky dim blur blurry vague unknown maybe forget memory secret hidden hide echo',
    'mist phantom whisper shadow mysteri'],
  ['cloud', 'cloudy words bring clouds', 'Grey clouds, low enough to touch.', { weather: 'cloudy' },
    'cloud cloudy overcast grey gray drift float nimbus cumulus stratus billow',
    'cloud cumulus'],
  ['sun', 'happy words bring clear skies', 'Not a cloud anywhere.', { weather: 'clear' },
    'sun sunny sunshine sunlight rainbow clear bright joy joyful happy happiness smile laugh laughter glad cheer cheerful hope hopeful radiant shine gleam clarity fresh dazzle vivid beam sunbeam sunlit yellow lemon',
    'sunshine radian'],

  // --- Hours ---------------------------------------------------------------
  ['dawn', 'morning words arrive at dawn', 'The sun is just coming up over the clouds.', { hour: 6.5 },
    'dawn sunrise morning early daybreak rooster breakfast wake waking awake awaken begin beginning start first coffee daylight',
    'dawn sunrise morning daybreak awaken'],
  ['noon', 'noon words arrive at midday', 'The sun stands right overhead.', { hour: 12.5 },
    'noon midday lunch zenith siesta',
    'midday'],
  ['golden', 'evening words arrive at golden hour', 'Everything glows gold and long-shadowed.', { hour: 17.5 },
    'golden sunset sundown evening twilight dusk afterglow teatime glow',
    'sunset evening twilight'],
  ['night', 'night words arrive after dark', 'Night fell while you were flying.', { hour: 23 },
    'night nightfall midnight moon moonlight moonlit dark darkness owl bat nocturne nocturnal nightingale insomnia vampire werewolf witching firefly fireflies starlit eclipse',
    'night moon midnight nocturn'],

  // --- Gifts and dangers ---------------------------------------------------
  ['wind', 'wind words fly for half the fuel', 'A wind scoops up the balloon and does half the work.', { wind: true },
    'wind windy breeze breezy gust gusty gale sky air airy wing feather kite bird swallow swift soar glide flight fly flying flutter balloon airship zeppelin blimp whirl whirlwind blow updraft jetstream aloft aerial',
    'wind breeze feather flight'],
  ['falls', 'river words make waterfalls', 'A river runs off the edge into the clouds.', { lake: true, river: true },
    'waterfall cascade river stream rapids torrent creek brook',
    'waterfall cascade river'],
  ['pond', 'water words fill lakes', 'There is water here, and something swimming in it.', { lake: true },
    'lake pond pool water fountain lagoon marsh swamp bog fish fishing duck frog otter beaver swan heron kingfisher dragonfly reed splash swim swimming aqua aquatic tadpole canal',
    'lake pond lagoon'],
  ['riches', 'treasure words find gilded isles, and coins', 'Everything here is touched with gold, and there are coins in the grass.', { glimmer: 4, biome: 'gilded' },
    'gold rainbow treasure jewel gem diamond ruby emerald sapphire pearl coin rich riches fortune loot bounty lucky luck jackpot wealth money cash prize precious trinket doubloon ingot hoard',
    'treasure jewel diamond fortune'],
  ['feast', 'feast words lay out food', 'A feast is laid out on the grass, with plenty to share.', { food: 4 },
    'feast food fruit berry banquet pie cake honey honeycomb jam supper dinner hunger hungry delicious tasty pudding dumpling noodle rice sweets chocolate cheese pizza cookie',
    'feast banquet berry fruit pudding'],
  ['fire', 'fire words leave fuel', 'Dry kindling, stacked and waiting.', { fuel: 4 },
    'fire flame ember coal spark blaze burn burning torch kindling furnace forge ash ashes inferno pyre wildfire lava magma volcano',
    'flame ember blaze kindling volcan inferno fire'],
  ['mend', 'kind words mend the balloon', 'Someone kind has left a needle and thread.', { heal: 1 },
    'mend heal healing care caring nurse doctor medicine remedy cure patch stitch sew sewing needle thread bandage kind kindness hug comfort rest restore repair fix',
    'heal stitch bandage remedy repair'],
  ['dark', 'dark words call withered woods: they cost a heart, but pay double coins', 'A dead wood, and something in it that bites. But it guards a hoard: double coins.', { danger: true, glimmer: 3, biome: 'withered' },
    'dark darkness doom dread nightmare curse cursed poison venom plague disaster despair abyss void death grave skull bones haunted horror terror fear wicked evil demon devil wraith banshee reaper peril danger dangerous',
    'nightmare haunt horror terror doom'],
  ['fast', 'fast words carry you further', 'You got here so fast your hat nearly blew off.', { leagues: 2 },
    'fast faster quick quickly rapid rapidly hurry race racing dash speed speedy zoom rocket sprint gallop express whizz',
    'speed rocket sprint'],
  ['small', 'tiny things are light: the flight eats no food', 'A small island. The balloon felt as light as a leaf on the way.', { light: true },
    'tiny small little wee mini petite teeny speck crumb dot pip ant mouse',
    'tiny teeny'],
  ['music', 'music words make islands sing', 'Someone on this island is singing.', { music: true },
    'music song songs sing singing melody tune choir chorus harp flute fiddle violin piano guitar lute hymn whistle hum humming serenade sonata symphony orchestra',
    'music melod symphon'],
  ['friend', 'friendly words bring company', 'Someone on this island is waving at you.', { friend: true },
    'friend friends friendly companion pal buddy comrade mate ally sidekick hello welcome',
    'friend compan'],
  ['question', 'question words get surprising answers', 'You asked the sky a question, and it rumbles while it thinks.', { question: true },
    'what why who where when how which question questions curious curiosity puzzle quiz',
    'question curios'],
  ['gift', 'gift words bring presents', 'A parcel with a bow on it is waiting for you.', { gift: true },
    'gift gifts present presents parcel package birthday giveaway bundle',
    'gift present parcel'],
];

const HOURS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

export const MEANINGS = MEANINGS_SPEC.map(([id, name, line, effect, words, roots]) => ({
  id, name: t(name), line: t(line), effect, words: new Set(words.split(' ')), roots: roots.split(' '),
}));
MEANINGS.push({
  id: 'clock', name: t('numbers from one to twelve set the hour you arrive'), line: t('Somewhere a clock strikes, and you arrive right on the hour.'), effect: {}, words: new Set(Object.keys(HOURS)), roots: [],
});

// How the shape of a word bends the trip. Each is discovered the first time it happens.
export const RULES = {
  chain: { name: 'tailwinds', line: 'Begin where the last word ended, and a tailwind carries you for half the fuel.', hint: 'where one word ends and the next begins' },
  double: { name: 'double letters make lakes', line: 'Where a letter doubles, water gathers, and the island will have a lake.', hint: 'letters that keep each other company' },
  odd: { name: 'rare letters', line: 'J, Q, X and Z each add 2 coins when you land, and the trees and water there give one extra.', hint: 'the rarest letters of all' },
  mirror: { name: 'mirror words', line: 'A word that reads the same backwards (level, noon…) doubles everything you gather on its island.', hint: 'words that read the same backwards' },
  echo: { name: 'echoes', line: 'Shuffle the letters of a word you already said, and you return to an echo of that land, with an extra hour to spend.', hint: 'an old word, rearranged' },
  mishear: { name: 'the night mishears', line: 'In the dark, the sky changes one letter of your word (never the first), which can change where you land. A lantern stops it.', hint: 'speaking in the dark' },
};
for (const rule of Object.values(RULES)) Object.assign(rule, { name: t(rule.name), line: t(rule.line), hint: t(rule.hint) });

// Wa's words: ordinary words with powers of their own up here. Wizards who knew
// her will tell you some, or you can stumble on them.
export const SECRETS = {
  please: { line: 'The flight costs no fuel. Wa always said please to the sky.', effect: { free: true } },
  thanks: { line: 'You get 8 coins. The sky likes being thanked.', effect: { glimmer: 8 } },
  pancakes: { line: 'You get food for days. It was Wa’s Sunday word.', effect: { food: 8 } },
  goodnight: { line: 'You arrive at bedtime and sleep well: 3 hearts mended.', effect: { heal: 3, hour: 22 } },
  kettle: { line: 'A hot meal and a heart mended. Wa always put the kettle on.', effect: { heal: 1, food: 3 } },
  faraway: { line: 'It carries you ten miles further.', effect: { leagues: 10 } },
  abracadabra: { line: 'The island it takes you to is extra rich: more coins when you land, and more from its trees and water.', effect: { wonder: 2 } },
  aurora: { line: 'Northern lights, a clear night, and a few coins.', effect: { glimmer: 3, hour: 23.5, weather: 'clear', aurora: true } },
  sunday: { line: 'Fair weather on three islands in a row, starting with the one it takes you to.', effect: { calm: 3 } },
  surprise: { line: 'Coins, food and fuel, a little of each.', effect: { glimmer: 3, food: 3, fuel: 3 } },
  wa: { line: 'The sky remembers her name. If a gate is still ahead, it tells you what that gate wants.', effect: { gossip: true } },
};
for (const secret of Object.values(SECRETS)) secret.line = t(secret.line);

// For "let the wind choose": plain, everyday words.
export const WIND_WORDS = `apple acorn anchor attic basket beach biscuit blanket boat bridge bucket button cabin candle canoe castle cherry
chimney clover cocoa comet cottage cricket daisy dragonfly drum feather ferry fiddle firefly garden ginger glacier harbor hedgehog honey
island jam jar kettle kite ladder lantern lemon lighthouse lily maple marble meadow mitten moon moss mountain mushroom nest oak orchard
otter owl paddle pebble pepper picnic pillow pine plum pocket pond porch puddle pumpkin quilt rabbit rainbow raven ribbon river robin
rope sail sandcastle scarf seashell sparrow spoon squirrel star stone strawberry sunflower teacup thimble thunder toast tower tulip
umbrella valley violin wagon walnut whistle willow window wool yarn bee fog hill leaf map mud nut pie tea toy`
  .split(/\s+/).filter(Boolean);

const VOWELS = /[aeiouy]/;
const forms = (w) => [w, w.endsWith('ies') && `${w.slice(0, -3)}y`, w.endsWith('es') && w.slice(0, -2), w.endsWith('s') && w.slice(0, -1),
  w.endsWith('ing') && w.slice(0, -3), w.endsWith('ing') && `${w.slice(0, -3)}e`, w.endsWith('ed') && w.slice(0, -2), w.endsWith('ed') && w.slice(0, -1),
  w.endsWith('ly') && w.slice(0, -2)].filter((f) => f && f.length >= 2);

// Real English words. Anything with a vowel flies (the sky makes something up),
// but what asks for a kind of word (a gate's riddle, the pirates' dare, the
// queen's quest) takes only a real one, or "abcdefg" would open a gate. The list
// (vendor/words) is fetched when a voyage starts; until it's in, or if it can't
// be fetched, every word counts. Drift's own words and a few modern ones the
// list lacks count too.
const EXTRA_WORDS = 'beijing website emoji selfie wifi smartphone blog podcast apps ramen videogame latte mochi matcha';
const OWN_WORDS = new Set([...MEANINGS.flatMap((m) => [...m.words]), ...Object.keys(SECRETS), ...Object.keys(HOURS), ...WIND_WORDS, ...EXTRA_WORDS.split(' ')]);
let dictionary = null;
let loading = null;

export function loadWords() {
  loading ??= fetch(new URL('../vendor/words/words_alpha.txt', import.meta.url))
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status}`))))
    .then((text) => {
      dictionary = new Set(text.split('\n'));
    })
    .catch(() => {
      loading = null; // try again next voyage
    });
  return loading;
}

export const isWord = (word) => !dictionary || forms(word).some((f) => dictionary.has(f) || OWN_WORDS.has(f));

// Which meanings a word has: for each kind of effect, the listed word wins
// over a root, and an earlier root over a later one.
function meaningsOf(word) {
  const found = [];
  for (const m of MEANINGS) {
    if (forms(word).some((f) => m.words.has(f))) found.push({ m, at: -1 });
    else {
      const at = Math.min(...m.roots.map((root) => (root.length >= 4 ? word.indexOf(root) : -1)).filter((i) => i >= 0));
      if (Number.isFinite(at)) found.push({ m, at });
    }
  }
  // A word the lists know means only that (so "snowflakes" isn't a lake); roots
  // are for words they don't.
  const listed = found.filter((f) => f.at < 0);
  return (listed.length ? listed : found.sort((a, b) => a.at - b.at)).map(({ m }) => m);
}

export const clean = (raw) => raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Everything the sky makes of a word, given the voyage so far:
// { word, problem, real, leagues, fuel, meanings, effect, rules, wonder, secret, echoOf }.
// `leagues` is the distance, shown as miles; `problem` is 'empty' or what to tell you.
export function readWord(raw, { used = [], last = null } = {}) {
  const word = clean(raw);
  const reading = { word, problem: null, leagues: word.length, fuel: word.length, meanings: [], effect: {}, rules: [], wonder: 0, secret: null, echoOf: null };
  if (!word) return { ...reading, problem: 'empty' };
  if (/[^a-z]/.test(word)) return { ...reading, problem: t('only English letters, please') };
  if (word.length < 2) return { ...reading, problem: t('a word needs at least two letters') };
  if (word.length > 14) return { ...reading, problem: t('too long to say in one breath') };
  if (!VOWELS.test(word) || /(.)\1\1/.test(word)) return { ...reading, problem: t('the sky can’t say that') };
  if (used.includes(word)) return { ...reading, problem: t('you’ve already said that word') };
  reading.real = isWord(word);

  // Meanings, first come first served per kind of effect.
  const effect = {};
  for (const m of meaningsOf(word)) {
    for (const [key, value] of Object.entries(m.effect)) {
      if (effect[key] === undefined) effect[key] = value;
    }
    reading.meanings.push(m);
  }
  if (HOURS[word] !== undefined) effect.hour = HOURS[word];

  // Form.
  const rules = reading.rules;
  if (last && word[0] === last[last.length - 1]) rules.push('chain');
  if (/(.)\1/.test(word)) {
    rules.push('double');
    effect.lake = true;
  }
  reading.wonder = (word.match(/[jqxz]/g) ?? []).length;
  if (reading.wonder) rules.push('odd');
  if (word.length >= 3 && [...word].reverse().join('') === word) rules.push('mirror');
  const sorted = [...word].sort().join('');
  reading.echoOf = used.find((u) => u !== word && [...u].sort().join('') === sorted) ?? null;
  if (reading.echoOf) rules.push('echo');

  // Secret words.
  if (SECRETS[word]) {
    reading.secret = word;
    Object.assign(effect, SECRETS[word].effect);
    reading.wonder += effect.wonder ?? 0;
  }
  reading.leagues = word.length + (effect.leagues ?? 0);

  // Cost: a fuel per letter, halved by a tailwind and again by wind words.
  let fuel = word.length;
  if (rules.includes('chain')) fuel = Math.ceil(fuel / 2);
  if (effect.wind) fuel = Math.ceil(fuel / 2);
  reading.fuel = effect.free ? 0 : Math.max(1, fuel);
  reading.effect = effect;
  return reading;
}

// In the dark the sky mishears one letter (never the first, so tailwinds still count).
export function mishear(word, random) {
  if (word.length < 3) return word;
  const i = 1 + Math.floor(random() * (word.length - 1));
  const letters = 'abcdefghijklmnoprstuvwy';
  let c = word[i];
  while (c === word[i]) c = letters[Math.floor(random() * letters.length)];
  return word.slice(0, i) + c + word.slice(i + 1);
}
