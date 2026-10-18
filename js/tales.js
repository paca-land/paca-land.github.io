// Tales of the deeper sky, for voyages (voyage.js): Wa's story, the reaches of
// sky on the way to the Edge and the riddling gates between them, the omen that
// bends each voyage, keepsakes that change which words are worth saying,
// passengers who want to go somewhere, what happens in the air between lands,
// and the Hush.
//
// Tales get `g`, the voyage as they see it (made in voyage.js): `run`, the
// voyage itself, plus helpers that give, take, remember and return a few words
// saying what happened (see `talesView` in voyage.js). Every line goes through
// t() (i18n.js), so it can be read in Chinese too.
import { t, lang } from './i18n.js';

// --- Wa ---------------------------------------------------------------------------
// You are Wa's grandchild. She called you Ca when you were three, and her
// pages still do; at the harbor you sign the logbook with the name you go by now.
// Twenty years ago Wa flew for the Edge of the Sky, the morning after a falling-out
// with your mother, and neither of them said a word to the other again. The Hush
// that follows her is made of words nobody said, and hers is the one at her heels:
// the Cloud Wall's page says something followed her, Captain Odile tells you why
// she left, the Wind Gate's page says what the Hush is (and that she knows whose),
// and at the Edge you learn it was hers, following her book, and she says her word
// to it. She couldn't, alone: that's why the balloon came home for words. Your words are the road home. Once you've found her
// (`found`), she stays home and sends you up again.
const PAGE_GATE = t('“I know what the Hush is now. It’s made of words nobody said: every sorry swallowed, every ‘I miss you’ saved for later. It eats islands because islands are made of words. And Ca, I think I know whose this one is. I’m going to the Edge. Up there, they say, anything can be said.”');
export const STORY = {
  // What Wa called you, and what you're called if you don't sign another name.
  nickname: t('Ca'),
  intro: (goal, found) => [
    ...(found ? [
      t('You found Wa at the Edge of the Sky and flew her home. Her knees aren’t up to the basket any more, so she sits by the window and sends you up instead.'),
      t('“Bring me words I don’t know,” she says, and puts the book in your hands.'),
    ] : [
      t('Above the clouds, the sky has a language. Say a word, and an island of that name rises out of the clouds for you to fly to. The people who fly that way are called sky-sailors, and your grandmother Wa was the best of them.'),
      t('Twenty years ago she flew off toward the Edge of the Sky, the farthest island anyone has ever reached, and never came back. Your mother won’t say why. This morning Wa’s balloon came drifting home, empty, with her book in the basket. On the last page, in her big loopy writing: “Come and find me, Ca. Bring words.” Ca is what she used to call you.'),
    ]),
    t('Inside the cover, in case you’d forgotten, she wrote down how it works: “The Edge is {goal} miles off. Three gates stand in the way, and each one opens only for the right word. The last one stands guard at the Edge. Every letter you say burns one fuel and carries you about a mile, give or take the wind. Each island gives you a few hours, and every tree, pond or house you stop at takes one. Mind the fuel, the food and the balloon’s hearts. Lose the last heart and you drift home.”', { goal }),
  ],
  // The first time at the harbor: who's flying Wa's balloon?
  logbook: {
    title: t('the harbor master'),
    text: t('The harbor master runs a thumb down his logbook. “Wa’s balloon. Wa’s book.” He looks you up and down. “And who’s flying it?”'),
    placeholder: t('your name'),
    sign: t('sign the logbook'),
    plain: t('just put “Ca”'),
  },
  harbor: (found, name) => (found
    ? t('“Off again, {name}?” says the harbor master. “Wa dropped off a few more things for you.” He heaves open her old sea chest. “Take one.”', { name })
    : t('“Right then, {name}.” He writes it in, slowly. “Wa left a chest with me, for whoever came after her. Go on, take one thing.”', { name })),
  setOff: t('Wa’s balloon tugs at its ropes in the harbor, ready to go.'),
  // Her pages, kept in the book once found.
  pages: {
    last: () => t('“Come and find me, Ca. Bring words.”'),
    wall: () => t('“The wall wanted a word, and it was fussy about it. Something came through after me. Where it passes, everything goes quiet: birds, wind, words. I call it the Hush. It doesn’t like the sun, and it doesn’t like singing. I think it has been following me since the harbor. Don’t stop anywhere for long.”'),
    gate: () => PAGE_GATE,
    camp: (word) => t('“Almost there. The Edge won’t open for just any word. Say one of mine. Try ‘{word}’.”', { word }),
  },
  // Past the Wind Gate.
  windGate: {
    title: t('another page'),
    text: t('Snagged on the gate is another page in Wa’s handwriting: {page}', { page: PAGE_GATE }),
    options: [{ label: t('keep going'), act: () => t('You tuck the page into her book.') }],
  },
  // The last card. `said`: the word of hers that opened the Edge; `words`: some of
  // yours; `name`: what you signed (empty if you kept "Ca").
  edge: ({ said, words, found, name, tobias }) => (found ? [
    t('Past the last gate the clouds stop. On the last island is the flat stone where Wa waited all those years.'),
    t('You write your words into her book: {words}. Back home, Wa reads them aloud by the window, one by one, and wants to know what every island was like.', { words }),
    t('Then your mother calls from the kitchen that the pancakes are ready. Wa says they’re burnt, and the two of them argue about it all through breakfast, out loud, the way they used to.'),
  ] : [
    t('Past the last gate the clouds stop. On the last island, beside a lantern that went out long ago, sits Wa.'),
    t('“{word}!” she says. “{memory}”', { word: `${said[0].toUpperCase()}${said.slice(1)}`, memory: WA_MEMORIES[said] ?? t('That’s one of mine.') }),
    name
      ? t('Then she looks at you properly. “Ca? Look at you, all grown up.” You tell her the name you go by now. “{name},” she says, trying it out. “It suits you.”', { name })
      : t('Then she looks at you properly, and her voice cracks. “Ca. Look at you. You got tall.”'),
    t('“I got all the way here,” she says, “and found I couldn’t say it. Twenty years of trying. So I sent the balloon home for words.” She taps her book. “And for you.”'),
    t('The Hush has followed you all the way. Up close it isn’t a monster at all, just a held breath the size of a cloud. It was never after you: it followed her book. Wa gets up, faces it, and says the word she didn’t say twenty years ago. It isn’t meant for you, so you don’t hear it. The Hush bursts apart like a flock of startled birds.'),
    t('Then she reads your words aloud, one by one: {words}. Behind you the islands light up again, a road of them, all the way home.', { words }),
    // Tobias, the hermit (stories.js), if you've heard his story.
    ...(tobias === 'goggles' ? [t('You hand her the old flying goggles. “Tobias!” she says. “Twenty years he took to give these back.”')]
      : tobias === 'waiting' ? [t('You tell her Tobias is still waiting to say sorry. Wa snorts. “He still owes me a pair of goggles.”')] : []),
  ]),
  // The lines before the poem of your words.
  home: (found) => [
    ...(found ? [] : [t('“Your mother,” Wa says. “Will she talk to me?” “Ask her yourself,” you say, and fly her home along that road of islands.')]),
    t('The words that got you there:'),
  ],
  lost: (found) => (found
    ? t('Wa’s book is safe in the basket, with every word you learned written in it.')
    : t('Wa’s book is safe in the basket, with every word you learned written in it. She’s still out there.')),
};

// What Wa says when you open the Edge with one of her words.
export const WA_MEMORIES = {
  please: t('I taught you that one when you were three.'),
  thanks: t('Always thank the sky. It remembers.'),
  pancakes: t('Sunday pancakes. You remembered.'),
  goodnight: t('I used to say that to you every night.'),
  kettle: t('Put the kettle on. I’ve been waiting twenty years for a cup of tea.'),
  faraway: t('That’s what you used to call where I’d gone.'),
  abracadabra: t('You never could do the trick with the coin.'),
  aurora: t('We watched the northern lights from the porch, remember?'),
  sunday: t('Sundays were ours.'),
  surprise: t('You always were good at surprises.'),
  wa: t('Nobody’s called me that in twenty years.'),
};

// Wa's notes in the margin, shown the first time you learn a kind of word.
export const WA_NOTES = {
  winter: t('Cold makes you hungry. Your grandfather always packed two lunches.'),
  sand: t('I lost my good hat in a desert. Hold on to yours.'),
  harvest: t('Autumn trees give fuel and nuts. I made jam once. It was terrible.'),
  mountain: t('Highland pinecones burn for ages. Your grandfather hated them.'),
  field: t('Meadows feed you. I used to nap in them.'),
  dream: t('Dream fruit sells for coins. It tastes of nothing, but it fills you up.'),
  volcano: t('Lava gives fuel, not fish. I learned that the hard way.'),
  glass: t('Glass trees: all coins, no food. Pretty, though.'),
  bog: t('Nearly always misty, so you can’t tell what your next word will do. It smells, too.'),
  reef: t('There’s nearly always a lighthouse. Say hello to the keepers for me.'),
  jungle: t('It rains all the time. The fishing is good.'),
  moor: t('Heather burns well. Bring a scarf.'),
  sweet: t('Sweets count as food. Don’t tell your mother.'),
  crown: t('The queen gets bored. Bring her odd letters, she pays well.'),
  sea: t('Keepers always have a spare lantern. Never say no to one.'),
  home: t('Cabins are good for a night’s sleep. Hermits snore.'),
  town: t('Markets sell everything, keepsakes too. Haggle.'),
  trail: t('Travellers know words. Sit by their fire.'),
  ancient: t('Ruins are a gamble. I won more than I lost.'),
  ritual: t('The stones give letters away. Listen.'),
  magic: t('The wizard knows some of my words. She’ll tell you one.'),
  calm: t('Shrines mend you, and give back lost letters.'),
  storm: t('Never leave in a storm. I did once, and it cost me.'),
  mist: t('In mist you can’t tell what a word will do. Go anyway.'),
  sun: t('The Hush hates the sun.'),
  night: t('Never fly in the dark without a lantern. The sky gets your words wrong.'),
  wind: t('Save wind words for when the fuel runs low.'),
  fire: t('Fire words leave kindling. Mind your eyebrows.'),
  riches: t('Spend coins when you need to. A full purse never mended a balloon.'),
  feast: t('Eat before you fly. Always.'),
  mend: t('Patch early, not late.'),
  dark: t('Dark places pay, but they bite. I still have the scar.'),
  music: t('The Hush hates singing. So I sang.'),
  unsaid: t('Say it while you still can. I didn’t.'),
  friend: t('Say hello and someone comes along. That’s how I met your grandfather.'),
  question: t('Ask the sky something. It always answers, never how you’d expect.'),
  fast: t('Fast words go further. Hold on to your hat.'),
  small: t('Tiny things weigh nothing. I once crossed a whole sea of cloud on ‘crumb’.'),
  gift: t('Someone leaves presents up here. I never found out who.'),
  bamboo: t('Pandas are terrible company and wonderful pillows.'),
  tea: t('Tea leaves sell well. Have a cup before you go.'),
  machine: t('Clockwork trees drop spare cogs. They burn like coal, oddly.'),
  paper: t('Everything on a paper isle burns. Never light a lantern indoors.'),
  lunar: t('Moon dust sells for a fortune down below. Don’t sneeze.'),
  puzzle: t('Left, left, right. Or was it right, right, left?'),
  giant: t('One giant seed feeds you for a week. Mind the snails.'),
};

// --- Reaches and gates --------------------------------------------------------
// The further you go, the stranger the islands: a word that doesn't ask for a
// kind of land gets one of the reach's own, `chance` of the time.
export const REACHES = [
  {
    at: 0, name: t('the Low Sky'), line: '',
    islands: [['coral', 1], ['toadstool', 1], ['mire', 1], ['lavender', 1], ['heath', 1], ['sugar', 1], ['savanna', 1], ['terraces', 1], ['maze', 1], ['giant', 1]], chance: 0.22,
  },
  {
    at: 30, name: t('the High Winds'), line: t('You’ve climbed into the High Winds, and the basket sways. Storms come more often up here, and the islands get stranger.'),
    islands: [['stormcrag', 3], ['jungle', 2], ['withered', 2], ['bamboo', 2], ['clockwork', 2], ['paper', 2], ['mire', 1], ['toadstool', 1], ['savanna', 1], ['heath', 1]], chance: 0.45,
  },
  {
    at: 65, name: t('the Thin Air'), line: t('You’ve reached the Thin Air. It’s cold enough to see your breath, so every flight up here eats one more food. The islands turn strange: glass, fire, cloud and gold.'),
    islands: [['glass', 3], ['ember', 3], ['moon', 3], ['cloudisle', 2], ['gilded', 2], ['stormcrag', 1]], chance: 0.6,
  },
];
export const reachOf = (miles) => REACHES.reduce((at, reach, i) => (miles >= reach.at ? i : at), 0);

// Each gate lets through only a word that answers its riddle (one per voyage,
// from its tier). The last one stands at the Edge.
export const GATES = [
  { at: 30, name: t('the Cloud Wall'), tier: 1 },
  { at: 65, name: t('the Wind Gate'), tier: 2 },
  { at: 100, name: t('the Edge'), tier: 3 },
];

const WEATHERY = ['storm', 'rain', 'snowfall', 'mist', 'cloud', 'sun'];
const meant = (reading, ids) => reading.meanings.some((m) => ids.includes(m.id));
// test(word, reading); `not` skips a riddle under an omen that makes it impossible.
export const RIDDLES = {
  long: { tier: 1, ask: t('a word of seven letters or more'), test: (w) => w.length >= 7 },
  double: { tier: 1, ask: t('a word with a double letter'), test: (w) => /(.)\1/.test(w) },
  noe: { tier: 1, ask: t('a word without an E'), test: (w) => !w.includes('e') },
  ends: { tier: 1, ask: t('a word that starts and ends with the same letter'), test: (w) => w.length > 1 && w[0] === w[w.length - 1] },
  weather: { tier: 1, ask: t('a word that changes the weather (rain, snow, storm, sunshine…)'), test: (w, r) => meant(r, WEATHERY) },
  vowels: { tier: 2, ask: t('a word with three different vowels (a, e, i, o, u)'), test: (w) => new Set(w.match(/[aeiou]/g) ?? []).size >= 3 },
  unique: { tier: 2, ask: t('a word of six letters or more, with no letter twice'), test: (w) => w.length >= 6 && new Set(w).size === w.length },
  endy: { tier: 2, ask: t('a word that ends in Y'), test: (w) => w.endsWith('y') },
  kvwz: { tier: 2, ask: t('a word with a K, V, W or Z in it'), test: (w) => /[kvwz]/.test(w) },
  noae: { tier: 2, ask: t('a word with no A and no E'), test: (w) => !/[ae]/.test(w) },
  wa: { tier: 3, ask: t('one of Wa’s words'), test: (w, r) => Boolean(r.secret) },
};

// --- Omens --------------------------------------------------------------------
// One per voyage: a twist with a good side and a bad side.
export const OMENS = {
  hungry: { name: t('a hungry sky'), line: t('Every flight eats one more food, but trees and water give one more food too.') },
  vowels: { name: t('heavy vowels'), line: t('Every vowel after the first in a word costs an extra fuel, but you set out with eight more fuel.') },
  gusty: { name: t('restless winds'), line: t('Wind words (breeze, gust, flight…) cost only a quarter of the fuel, but storms come twice as often.') },
  gilded: { name: t('a gilded sky'), line: t('Every coin you find is doubled, but the balloon sets out with only four hearts.') },
  long: { name: t('long days'), line: t('Four hours on every island instead of three, but the Hush, a silence that follows you once you pass the first gate, moves faster.') },
  short: { name: t('short breath'), line: t('The sky can’t hear words longer than eight letters, but words of four letters or fewer carry you a mile further.') },
};

// --- Keepsakes ------------------------------------------------------------------
// Little things that change which words are worth saying. Found in the air, in
// markets and ruins, and given by grateful passengers.
export const KEEPSAKES = {
  compass: { icon: '🧭', name: t('compass rose'), line: t('Tailwinds (a word that starts with the last word’s final letter) cost a quarter of the fuel.') },
  kite: { icon: '🪁', name: t('kite string'), line: t('Wind words (breeze, gust, flight…) cost a quarter of the fuel.') },
  lodestone: { icon: '🧲', name: t('lodestone'), line: t('J, Q, X and Z burn no fuel.') },
  feather: { icon: '🪶', name: t('raven feather'), line: t('At night, the sky never changes a letter of your word, lantern or not.') },
  bell: { icon: '🔔', name: t('silver bell'), line: t('Dark words (doom, nightmare…) pay double coins, and with the bell they won’t cost you a heart when you land.') },
  stormglass: { icon: '⚗️', name: t('storm glass'), line: t('Flying out of a storm never tears the balloon.') },
  hourglass: { icon: '⏳', name: t('hourglass'), line: t('An extra hour on every island.') },
  tinderbox: { icon: '🪵', name: t('tinderbox'), line: t('Every tree gives an extra fuel.') },
  net: { icon: '🥅', name: t('fishing net'), line: t('Every fish you catch gives two more food.') },
  shell: { icon: '🐚', name: t('singing shell'), line: t('Every sea word you fly to (harbor, wave, anchor…) mends a heart when you land.') },
  inkwell: { icon: '🖋️', name: t('inkwell'), line: t('Each kind of word you use for the first time this voyage pays 2 coins.') },
  coin: { icon: '🍀', name: t('lucky clover'), line: t('Every gamble goes your way (ruins, a falling star, a ship of fog…).') },
};

// --- Passengers -----------------------------------------------------------------
// Each wants to reach a certain kind of land (`home`, checked on arrival, with a
// `hint` of the meanings that tend to get there). While aboard they help, and
// eat 1 food a flight (the cook eats nothing). Delivered, they say thank you.
export const CREW = {
  fox: {
    icon: '🦊', name: t('the fox'), help: t('sniffs out food: every tree gives one more'), wish: t('a meadow or a shrine, somewhere quiet'),
    hint: ['field', 'calm'], home: (land) => land.biomeKey === 'meadow' || land.landmark === 'shrine',
    reward: (g) => t('The fox trots off into the grass, and comes back with its treasure for you: {keepsake}', { keepsake: g.keepsake() }),
  },
  balloonist: {
    icon: '🎈', name: t('the balloonist'), help: t('patches the first tear on every flight'), wish: t('a lighthouse, for the way home'),
    hint: ['sea'], home: (land) => land.landmark === 'lighthouse',
    reward: (g) => t('Before she goes, she patches your balloon properly and leaves you her spare lantern. {got}', { got: g.give({ hull: 2, lanterns: 1 }) }),
  },
  cartographer: {
    icon: '🗺️', name: t('the cartographer'), help: t('knows the shortcuts: every flight goes a mile further'), wish: t('a waterfall, to finish the map'),
    hint: ['falls'], home: (land) => land.hasWaterfall,
    reward: (g) => t('The cartographer inks in the waterfall, and pays you for the ride. {got} {keepsake}', { got: g.give({ glimmer: 5 }), keepsake: g.keepsake() }),
  },
  poet: {
    icon: '📜', name: t('the poet'), help: t('writes it all down: each kind of word you use for the first time this voyage pays 1 coin'), wish: t('an island in the evening, at golden hour'),
    hint: ['golden'], home: (land, g) => g.golden,
    reward: (g) => t('“At last,” says the poet, watching the sunset, and leaves you three pages of notes on words. {taught} {secret}', { taught: g.teach(3), secret: g.secret() }),
  },
  cook: {
    icon: '🍲', name: t('the cook'), help: t('stretches the food: every flight eats one less'), wish: t('an autumn wood or a windmill, for the harvest'),
    hint: ['harvest', 'bread'], home: (land) => land.biomeKey === 'autumn' || land.landmark === 'windmill',
    reward: (g) => t('The cook fills your food sacks to the brim, and waves goodbye with a ladle. {got}', { got: g.give({ food: 8 }) }),
  },
  knight: {
    icon: '🛡️', name: t('the old knight'), help: t('stands guard: dark words won’t cost you a heart'), wish: t('ruins, to lay an old sword to rest'),
    hint: ['ancient'], home: (land) => land.landmark === 'ruins',
    reward: (g) => t('The old knight lays his sword to rest in the ruins, and gives you the last of his gold. {got}', { got: g.give({ glimmer: 8, hull: 1 }) }),
  },
};

// --- Dares ----------------------------------------------------------------------
// Something your next word has to do (saved as data: { id, letter }).
export const DARES = {
  pirates: {
    icon: '🏴‍☠️',
    label: (d) => `🏴‍☠️ ${d.letter.toUpperCase()}`,
    test: (word, d) => word[0] === d.letter,
    pass: (g) => t('The pirates throw their hats in the air and pay up. {got}', { got: g.give({ glimmer: 8 }) }),
    fail: (g) => t('The pirates jeer, and cut a rope on the way past. {hurt} {got}', { hurt: g.hurt(1), got: g.give({ glimmer: -3 }) }),
  },
};

// Where the burned map leads: a word to say, for treasure.
export const TREASURE_WORDS = ['thimble', 'teacup', 'button', 'marble', 'saddle', 'walnut', 'pocket', 'biscuit', 'acorn', 'ladder', 'teapot', 'spoon'];

const CONSONANTS = 'rstlnhdcmgpbfw';
// "an N", "a T": letters go by the sound of their names (Chinese just names the letter).
export const aLetter = (l) => (lang === 'zh' ? l.toUpperCase() : `${'aefhilmnorsx'.includes(l.toLowerCase()) ? 'an' : 'a'} ${l.toUpperCase()}`);
export const pickLetter = (r, avoid = []) => {
  const pool = [...CONSONANTS].filter((l) => !avoid.includes(l));
  return pool[Math.floor(r() * pool.length)] ?? 'r';
};

// --- The Hush ---------------------------------------------------------------------
// After the Cloud Wall, a silence that eats words follows you. It gains on you
// with every hour that passes; long words outrun it, sunny words, music and sorry
// words drive it back.
export const HUSH = {
  start: 10, // miles behind you when it comes through the wall
  speed: 1.3, // miles an hour
  knock: 14, // how far back it falls after catching you
  light: 6, // how far a sunny, morning or evening word drives it back
  music: 5, // and a music word
  arrive: (found) => ({
    title: found ? t('the Hush') : t('a page on the wall'),
    text: found ? t('Wa said her word, but the sky is full of other people’s. Something slips through the wall behind you: a Hush, like the one that followed Wa.')
      : t('Pinned to the far side of the wall is a page in Wa’s handwriting: {page}', { page: STORY.pages.wall() }),
    options: [{ label: found ? t('keep moving') : t('keep the page'), act: () => t('Behind you, the birds have gone quiet. It’s coming.') }],
  }),
  catch: (g) => {
    const letter = pickLetter(Math.random, g.run.banned);
    return {
      title: t('the Hush catches you'),
      text: t('The Hush wraps the basket in silence. You can’t hear the wind, or the burner, or your own voice. It wants something.'),
      options: [
        {
          label: t('let it take the letter {letter}', { letter: letter.toUpperCase() }), note: t('no word with it will fly until a shrine or a wizard wins it back'),
          disabled: g.run.banned.length >= 3, act: () => g.ban(letter),
        },
        { label: t('feed it coins'), note: '−8 🪙', disabled: g.run.glimmer < 8, act: () => t('It swallows the coins, and lets go. {got}', { got: g.give({ glimmer: -8 }) }) },
        { label: t('blind it with a lantern'), note: '−1 🏮', disabled: g.run.lanterns < 1, act: () => t('The lantern flares, and the Hush recoils. {got}', { got: g.give({ lanterns: -1 }) }) },
        { label: t('tear free'), note: g.run.hull <= 1 ? t('it would end your voyage') : '−1 ❤️', act: () => t('You rip the basket out of the silence. {hurt}', { hurt: g.hurt(1) }) },
      ],
    };
  },
};

// --- In the air -------------------------------------------------------------------
// What happens on the way between lands. `when(g)` says if it can happen now;
// chapters of a longer story get a heavy `weight` once they're due. Options can
// be a function of g. `act(g)` does it and returns what happened.
export const SKY_EVENTS = [
  {
    id: 'camp', weight: 8, when: (g) => g.reach === 2 && !g.found,
    title: t('a cold camp'), text: t('On a ledge of cloud: a burnt-out fire, a tin cup, and WA scratched into a flat stone. She camped here.'),
    options: [{
      label: t('look under the stone'),
      act: (g) => t('Under the stone is a lantern she left for whoever came after, and another page: {page} {got}', { page: STORY.pages.camp(g.waWord()), got: g.give({ lanterns: 1 }) }),
    }],
  },
  {
    // High Winds: Wa's old rival, and why Wa left.
    id: 'odile', weight: 8, when: (g) => g.reach >= 1 && g.run.gates >= 1 && !g.found,
    title: t('a purple balloon'),
    text: t('A patched purple balloon swings alongside. The old woman in its basket squints at yours. “That’s Wa’s! And you’ll be Ca, all grown up. You have her chin.” She sticks out a hand. “Captain Odile. Your grandmother beat me to every island in the Low Sky, the old goose.”'),
    options: [
      {
        label: t('ask why Wa left'),
        act: () => t('Odile stops smiling. “She and your mother had a falling-out the night before she flew. Shouting, then a door. Then nothing at all. Not one word, from either of them, for twenty years.” She looks at the quiet behind you. “That’s when the Hush started.”'),
      },
      {
        label: t('race her to the next cloud'), note: t('a gamble: +3 miles, or −2 🔥'),
        act: (g) => `${g.chance(0.5)
          ? t('You win by a basket’s width, and Odile roars with laughter. {miles}', { miles: g.leagues(3) })
          : t('She wins easily. “Wa always said I cheat,” she shouts back. {got}', { got: g.give({ fuel: -2 }) })} ${t('Afterwards, over tea in her basket, she tells you why Wa left: a falling-out with your mother, then twenty years of silence. “That’s when the Hush started.”')}`,
      },
    ],
  },
  {
    // Thin Air: the Hush has a voice, and it's Wa's.
    id: 'voice', weight: 8, when: (g) => g.reach === 2 && g.run.gates >= 2 && g.run.hush !== null && g.run.leagues - g.run.hush <= 6 && !g.found,
    title: t('a voice in the quiet'),
    text: t('The Hush draws close, and for the first time it makes a sound. It’s a voice, and it’s Wa’s. “Tell her,” it says. “Tell her I—” Then nothing.'),
    options: [
      { label: t('sing into it'), note: t('drives the Hush back'), act: (g) => t('You sing the first thing that comes into your head, badly and loud. {hush}', { hush: g.hushBack(5) }) },
      { label: t('listen'), act: () => t('You listen. It doesn’t say anything else, but you know who it was talking about.') },
      { label: t('keep moving'), act: () => t('You keep your eyes on the next cloud and fly on. Behind you, the voice doesn’t come again.') },
    ],
  },
  {
    id: 'birds', weight: 2,
    title: t('paper birds'), text: t('A flock of paper birds folds and unfolds around the basket. Every wing has a word written on it.'),
    options: [
      { label: t('read the wings'), note: t('learn what two kinds of words do'), act: (g) => g.teach(2) },
      { label: t('catch one'), act: (g) => t('Folded inside it are some coins. {got}', { got: g.give({ glimmer: 2 }) }) },
    ],
  },
  {
    id: 'whale', weight: 2, when: (g) => g.reach < 2,
    title: t('the sky whale'), text: t('A whale the size of a village swims through the clouds beside you, singing.'),
    options: [
      { label: t('ride in its wake'), note: t('+3 miles · an hour passes'), act: (g) => t('It carries you along for a while. {miles} {hours}', { miles: g.leagues(3), hours: g.hours(1) }) },
      { label: t('sing back to it'), note: t('your next word flies free'), act: (g) => { g.run.freeNext = true; return t('The whale learns your song, and will carry your next word for nothing.'); } },
      { label: t('let it pass'), act: () => t('It dives into the cloud, and is gone.') },
    ],
  },
  {
    id: 'stowaway', weight: 2, when: (g) => g.room && !g.met('fox'),
    title: t('a stowaway'), text: t('Something rustles in the food sacks: a fox, very thin, and very polite about it.'),
    options: [
      { label: t('let it stay'), note: t('{help} · eats 1 🍞 a flight · wants {wish}', { help: CREW.fox.help, wish: CREW.fox.wish }), act: (g) => g.board('fox') },
      { label: t('feed it, and set it down'), note: '−1 🍞', act: (g) => t('It eats, bows, and leaves you some coins it found. {got}', { got: g.give({ food: -1, glimmer: 2 }) }) },
    ],
  },
  {
    id: 'balloonist', weight: 2, when: (g) => g.room && !g.met('balloonist'),
    title: t('a torn balloon'), text: t('A torn balloon drifts past, its pilot clinging to the ropes.'),
    options: [
      { label: t('take her aboard'), note: t('{help} · eats 1 🍞 a flight · wants {wish}', { help: CREW.balloonist.help, wish: CREW.balloonist.wish }), act: (g) => g.board('balloonist') },
      { label: t('spare her some fuel'), note: '−3 🔥 → +5 🪙', disabled: (g) => g.run.fuel < 3, act: (g) => t('She limps off, and pays you in old coins. {got}', { got: g.give({ fuel: -3, glimmer: 5 }) }) },
      { label: t('fly on'), act: () => t('She waves, a little sadly, as you go.') },
    ],
  },
  {
    id: 'pirates', weight: 2, when: (g) => g.reach >= 1 && !g.run.dare,
    title: t('sky pirates'),
    text: (g) => { g.mark('dare', pickLetter(Math.random)); return t('A patched black balloon closes in. Its crew wave cutlasses and, oddly, a dictionary.'); },
    options: (g) => {
      const letter = g.flag('dare').toUpperCase();
      return [
        { label: t('pay their toll'), note: '−6 🪙', disabled: g.run.glimmer < 6, act: () => t('They count it twice and let you go. {got}', { got: g.give({ glimmer: -6 }) }) },
        { label: t('outrun them'), note: '−4 🔥', disabled: g.run.fuel < 4, act: () => t('You open the burner all the way and leave them behind. {got}', { got: g.give({ fuel: -4 }) }) },
        {
          label: t('take their dare'), note: t('your next word must be a real word starting with {letter}: +8 🪙, or −1 ❤️ −3 🪙', { letter }),
          act: () => { g.run.dare = { id: 'pirates', letter: g.flag('dare') }; return t('“A real word, mind, starting with {letter},” the captain says. “Next island. We’ll be listening.”', { letter }); },
        },
        { label: t('fight them off'), note: t('a gamble: +6 🪙, or −1 ❤️'), act: () => (g.chance(0.5) ? t('They flee, dropping their loot. {got}', { got: g.give({ glimmer: 6 }) }) : t('They swarm aboard, and cut a rope before they go. {hurt}', { hurt: g.hurt(1) })) },
      ];
    },
  },
  {
    id: 'star', weight: 2, when: (g) => g.night,
    title: t('a falling star'), text: t('A star falls past the basket, close enough to catch.'),
    options: [
      { label: t('catch it'), note: t('a gamble: a keepsake, or −1 ❤️'), act: (g) => (g.chance(0.6) ? t('It’s warm, and it hums, and it fits in your pocket: {keepsake}', { keepsake: g.keepsake() }) : t('It burns straight through the basket. {hurt}', { hurt: g.hurt(1) })) },
      { label: t('wish on it'), note: '+1 ❤️', act: (g) => t('You wish for the balloon to hold. It does. {got}', { got: g.give({ hull: 1 }) }) },
    ],
  },
  {
    id: 'bottle', weight: 2, when: (g) => g.reach < 2 && !g.flag('map'),
    title: t('a bottle in the air'), text: t('A bottle drifts past on a current of air. Inside: half a map, burned at the edges.'),
    options: [
      { label: t('keep it'), note: t('the other half must be somewhere'), act: (g) => { g.mark('map', 1); g.mark('mapAt', g.run.words.length); return t('Half a map. The dotted line runs off the burned edge. Ruins keep that sort of thing, they say.'); } },
      { label: t('let it drift'), act: () => t('Someone else’s treasure, then.') },
    ],
  },
  {
    id: 'halfmap', when: (g) => g.flag('map') === 1 && g.run.words.length - g.flag('mapAt') >= 3,
    weight: 8, title: t('the other half'), text: t('A gull drops something in your lap: the other half of the burned map!'),
    options: [{ label: t('put the halves together'), act: (g) => g.treasureMap() }],
  },
  {
    id: 'storm', weight: 2, when: (g) => g.reach >= 1,
    title: t('the singing storm'), text: t('A storm that hums, and the hum has words in it.'),
    options: [
      { label: t('listen closely'), note: t('one of Wa’s words · lightning: −1 ❤️'), act: (g) => `${g.secret() || t('The words are all ones you know, but coins come down with the rain. {got}', { got: g.give({ glimmer: 6 }) })} ${g.hurt(1)}` },
      { label: t('fly around it'), note: t('two hours pass'), act: (g) => t('The long way round. {hours}', { hours: g.hours(2) }) },
      { label: t('fly straight through'), note: t('+3 miles · −1 ❤️'), act: (g) => t('Wet, loud, and fast. {miles} {hurt}', { miles: g.leagues(3), hurt: g.hurt(1) }) },
    ],
  },
  {
    id: 'moths', weight: 2, when: (g) => g.night && g.run.lanterns > 0,
    title: t('moths'), text: t('Moths swarm to your lantern, thousands of them.'),
    options: [
      { label: t('let them have the lantern'), note: t('−1 🏮 · +4 miles'), act: (g) => t('They carry off the lantern, and tow the balloon a good way with it. {got} {miles}', { got: g.give({ lanterns: -1 }), miles: g.leagues(4) }) },
      { label: t('cover the lantern'), act: () => t('They lose interest and flutter away.') },
    ],
  },
  {
    id: 'market', weight: 3, repeat: true,
    title: t('a market on a cloud'), text: t('Lantern-lit stalls on a cloud barge, drifting the same way you are.'),
    options: (g) => {
      const ware = g.unowned();
      return [
        ware && {
          label: t('buy the {name} {icon}', { name: KEEPSAKES[ware].name, icon: KEEPSAKES[ware].icon }), note: `−6 🪙 · ${KEEPSAKES[ware].line}`,
          disabled: g.run.glimmer < 6, act: () => `${g.give({ glimmer: -6 })} ${g.keepsake(ware)}`,
        },
        { label: t('buy food'), note: '−3 🪙 → +4 🍞', disabled: g.run.glimmer < 3, act: () => t('Bread, cheese and a bag of apples. {got}', { got: g.give({ glimmer: -3, food: 4 }) }) },
        { label: t('buy fuel'), note: '−3 🪙 → +6 🔥', disabled: g.run.glimmer < 3, act: () => t('A sack of charcoal. {got}', { got: g.give({ glimmer: -3, fuel: 6 }) }) },
        g.gate && !g.gateKnown && { label: t('ask what {gate} wants', { gate: g.gate.name }), note: '−2 🪙', disabled: g.run.glimmer < 2, act: () => `${g.give({ glimmer: -2 })} ${g.gossip()}` },
        { label: t('drift past'), act: () => t('The market drifts away.') },
      ].filter(Boolean);
    },
  },
  {
    id: 'rower', weight: 1, when: (g) => g.unowned(),
    title: t('the woman in the rowing boat'), text: t('An old woman rows past on nothing at all. “Your heaviest thing for my lightest,” she offers.'),
    options: [
      {
        label: t('trade'), note: t('half of your fuel or food, whichever you have more of, for a keepsake'), act: (g) => {
          const heavy = g.run.fuel >= g.run.food ? 'fuel' : 'food';
          return `${g.give({ [heavy]: -Math.ceil(g.run[heavy] / 2) })} ${g.keepsake()}`;
        },
      },
      { label: t('decline'), act: () => t('She shrugs, and rows on into the blue.') },
    ],
  },
  {
    id: 'frost', weight: 3, when: (g) => g.reach === 2,
    title: t('frost on the ropes'), text: t('The air turns to glass, and ice creaks on every rope.'),
    options: [
      { label: t('burn fuel to keep warm'), note: '−3 🔥', disabled: (g) => g.run.fuel < 3, act: (g) => t('You keep the burner roaring until the ice lets go. {got}', { got: g.give({ fuel: -3 }) }) },
      { label: t('huddle and eat'), note: '−2 🍞', disabled: (g) => g.run.food < 2, act: (g) => t('You eat to keep warm, and wait it out. {got}', { got: g.give({ food: -2 }) }) },
      { label: t('push on'), note: '−1 ❤️', act: (g) => t('A rope snaps in the cold. {hurt}', { hurt: g.hurt(1) }) },
    ],
  },
  {
    id: 'gull', weight: 2,
    title: t('a gull with a letter'),
    text: (g) => { g.mark('gull', 'aeiorstnl'[Math.floor(Math.random() * 9)]); return t('A gull lands on the rim of the basket with a letter in its beak: {letter}.', { letter: g.flag('gull').toUpperCase() }); },
    options: (g) => [
      { label: t('take the letter'), note: t('your next word with {letter} in it flies free', { letter: aLetter(g.flag('gull')) }), act: () => { g.run.freeLetter = g.flag('gull'); return t('You tuck the letter in your pocket.'); } },
      { label: t('shoo it away'), act: () => t('It flaps off to give the letter to someone else.') },
    ],
  },
  {
    id: 'post', weight: 2, when: (g) => g.night,
    title: t('the night post'), text: t('A postman with bat wings has a parcel with your name on it. Postage due: 3 coins.'),
    options: [
      {
        label: t('pay the postage'), note: t('−3 🪙 · could be anything'), disabled: (g) => g.run.glimmer < 3, act: (g) => {
          const paid = g.give({ glimmer: -3 });
          if (g.chance(0.4)) return t('Inside, wrapped in newspaper: {keepsake} {paid}', { paid, keepsake: g.keepsake() });
          return g.chance(0.5)
            ? t('Inside: a cake from home. {paid} {got}', { paid, got: g.give({ food: 5 }) })
            : t('Inside: a letter Wa posted twenty years ago. “Keep your lantern lit,” it says. You read it twice and put it in your pocket. {paid} {got}', { paid, got: g.give({ hull: 1 }) });
        },
      },
      { label: t('refuse it'), act: () => t('The postman sighs, and flaps off with it.') },
    ],
  },
  {
    id: 'kite', weight: 2, when: (g) => g.reach === 0,
    title: t('a kite with no child'), text: t('A kite bobs beside the basket, all alone. Its string trails down into the clouds.'),
    options: [
      {
        label: t('follow the string'), note: t('+2 miles'), act: (g) => `${g.leagues(2)} ${g.owns('kite')
          ? t('Tangled at the end of the string: a child’s lost coins. {got}', { got: g.give({ glimmer: 2 }) })
          : t('There’s no child at the end, just the string. You wind it up and keep it: {keepsake}', { keepsake: g.keepsake('kite') })}`,
      },
      { label: t('let it go'), act: () => t('It climbs out of sight.') },
    ],
  },
  {
    id: 'fish', weight: 2,
    title: t('a rain of fish'), text: t('Fish are falling out of the sky.'),
    options: [
      { label: t('hold out a net'), act: (g) => t('You catch a netful. {got}', { got: g.give({ food: g.owns('net') ? 6 : 4 }) }) },
      { label: t('take cover'), act: () => t('A trout bounces off the burner.') },
    ],
  },
  {
    id: 'ghost', weight: 2, when: (g) => g.night || g.reach === 2,
    title: t('a ship of fog'), text: t('A ship made of fog drifts alongside, its lanterns burning green. Nobody is at the wheel.'),
    options: [
      {
        label: t('board it'), note: t('a gamble: +10 🪙, or −1 ❤️'), act: (g) => (g.chance(0.5)
          ? t('The hold is full of drowned treasure. {got}', { got: g.give({ glimmer: 10 }) })
          : t('The deck gives way under you, and you barely make it back. {hurt} {hush}', { hurt: g.hurt(1), hush: g.hushGains(4) })),
      },
      { label: t('salute, and pass'), act: () => t('The ship dips its green lanterns, and fades.') },
    ],
  },
  {
    id: 'beggar', weight: 2, when: (g) => !g.flag('kind'),
    title: t('a ragged traveller'), text: t('A ragged figure on a passing cloud holds out a hand.'),
    options: [
      { label: t('share your food'), note: '−2 🍞', disabled: (g) => g.run.food < 2, act: (g) => { g.mark('kind', g.run.words.length); return t('They bow, and say nothing at all. {got}', { got: g.give({ food: -2 }) }); } },
      { label: t('give them coins'), note: '−3 🪙', disabled: (g) => g.run.glimmer < 3, act: (g) => { g.mark('kind', g.run.words.length); return t('They bow, and say nothing at all. {got}', { got: g.give({ glimmer: -3 }) }); } },
      { label: t('look away'), act: () => t('The cloud drifts off.') },
    ],
  },
  {
    id: 'queen', weight: 8, when: (g) => g.flag('kind') && g.run.words.length - g.flag('kind') >= 2,
    title: t('a golden balloon'), text: t('A golden balloon draws alongside. The traveller you helped is aboard, in silk now, with rings on every finger.'),
    options: [{ label: t('bow'), act: (g) => t('“You shared with me when I had nothing,” says the duchess of the clouds. “Your grandmother did too, once.” {got} {keepsake}', { got: g.give({ glimmer: 10 }), keepsake: g.keepsake() }) }],
  },
  {
    id: 'updraft', weight: 2,
    title: t('an updraft'), text: t('A warm updraft catches the balloon and starts to lift it, fast.'),
    options: [
      { label: t('ride it up'), note: t('+3 miles · −1 🍞, it’s cold up there'), act: (g) => t('It lifts you high and fast, and it’s freezing up there. {miles} {got}', { miles: g.leagues(3), got: g.give({ food: -1 }) }) },
      { label: t('vent the balloon, and stay low'), act: () => t('You let it go by.') },
    ],
  },
];
