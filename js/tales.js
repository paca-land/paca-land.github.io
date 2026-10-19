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
// pages still do; at the harbour you sign the logbook with the name you go by now.
// What it's about: the things we don't say grow into a silence between people, and
// a sorry twenty years late still counts. Wa was always off flying. The night
// before she set off for the Edge of the Sky, your mother begged her to stay home
// for once; it ended with “If you go, don't come back” and “Then I won't”, and
// neither of them said a word to the other again. The Hush that follows her is made
// of words nobody said, and hers is the one at her heels: the Cloud Wall's page
// says something followed her, Captain Odile tells you about the row, the Wind
// Gate's page says what the Hush is and that it's hers, and at the Edge she says
// it at last, with your words to say it with (the Hush had eaten hers: that's why
// the balloon came home for words). Then home, where she and your mother say sorry
// to each other's faces. Once you've found her (`found`), she stays home and sends
// you up again.
const PAGE_GATE = t('“I know what the Hush is now. It’s made of words nobody said: every sorry swallowed, every ‘I miss you’ saved for later. It eats islands, because islands are made of words. And Ca, I know whose this one is. It’s mine. The night before I left, your mother begged me to stay home, just once. I wouldn’t. She said, ‘If you go, don’t come back,’ and I said, ‘Then I won’t.’ Neither of us meant it, and I flew off without saying sorry. Now every time I try, the Hush swallows the words. So I’m going to the Edge, and not for the view. Up there, they say, anything can be said.”');
export const STORY = {
  // What Wa called you, and what you're called if you don't sign another name.
  nickname: t('Ca'),
  intro: (goal, found) => [
    ...(found ? [
      t('You found Wa at the Edge of the Sky and flew her home. Her knees aren’t up to the basket any more, so she sits by the window and sends you up instead.'),
      t('“Bring me words I don’t know,” she says, and puts the book in your hands.'),
    ] : [
      t('Above the clouds, the sky has a language. Say a word, and an island of that name rises out of the clouds for you to fly to. The people who fly that way are called sky-sailors, and your grandmother Wa was the best of them.'),
      t('Twenty years ago she flew off toward the Edge of the Sky, the farthest island of all, where nobody had ever been, and she never came back. Your mother won’t say why. At home, nobody even says Wa’s name. This morning Wa’s balloon came drifting home, empty, with her book in the basket. On the last page, in her big loopy writing: “Come and find me, Ca. Bring words.” Ca is what she used to call you.'),
    ]),
    t('Inside the cover, in case you’d forgotten, she wrote down how it works: “The Edge is {goal} miles off. Three gates stand in the way, and each one opens only for the right word. The last one stands guard at the Edge. Every letter you say burns one fuel and carries you about a mile, give or take the wind. Each island gives you a few hours, and every tree, pond or house you stop at takes one. Mind the fuel, the food and the balloon’s hearts. Lose the last heart and you drift home.”', { goal }),
  ],
  // The first time at the harbour: who's flying Wa's balloon?
  logbook: {
    title: t('the harbour master'),
    text: t('The harbour master runs a thumb down his logbook. “Wa’s balloon. Wa’s book.” He looks you up and down. “And who’s flying it?”'),
    placeholder: t('your name'),
    sign: t('sign the logbook'),
    plain: t('just put “Ca”'),
  },
  harbor: (found, name) => (found
    ? t('“Off again, {name}?” says the harbour master. “Wa dropped off a few more things for you.” He heaves open her old sea chest. “Take one.”', { name })
    : t('“Right then, {name}.” He writes it in, slowly. “Wa left a chest with me, for whoever came after her. Go on, take one thing.”', { name })),
  setOff: t('Harbour, where you grew up: crooked houses round a cobbled square, bunting from every roof, and Wa’s balloon tugging at its ropes by the quay.'),
  // Her pages, kept in the book once found.
  pages: {
    last: () => t('“Come and find me, Ca. Bring words.”'),
    wall: () => t('“The wall wanted a word, and it was fussy about it. Something came through after me. Where it passes, everything goes quiet: birds, wind, words. I call it the Hush. It doesn’t like the sun, and it doesn’t like singing. I think it has been following me since the harbour. Don’t stop anywhere for long. I’m leaving these pages for whoever comes after me. I hope it’s you, Ca, once you’re big.”'),
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
  // yours; `name`: what you signed (empty if you kept "Ca"); `tobias` and
  // `letters`: what the hermit's and the postmistress's stories left you (stories.js).
  edge: ({ said, words, found, name, tobias, letters }) => (found ? [
    t('Past the last gate the clouds stop. On the last island is the flat stone where Wa waited all those years.'),
    t('The Hush behind you stops at the last gate. It was never yours to answer.'),
    t('You write your words into her book: {words}. Back home, Wa reads them aloud by the window, one by one, and wants to know what every island was like.', { words }),
    ...(letters ? [t('You put your mother’s twenty letters into Wa’s hands, too. She reads them at the kitchen table, one a day, and your mother pretends not to notice.')] : []),
    t('Then your mother calls from the kitchen that the pancakes are ready. Wa says they’re burnt, and the two of them argue about it all through breakfast, out loud, the way they used to.'),
  ] : [
    t('Past the last gate the clouds stop. On the last island, beside a lantern that went out long ago, sits Wa.'),
    t('“{word}!” she says. “{memory}”', { word: `${said[0].toUpperCase()}${said.slice(1)}`, memory: WA_MEMORIES[said] ?? t('That’s one of mine.') }),
    name
      ? t('Then she looks at you properly. “Ca? Look at you, all grown up.” You tell her the name you go by now. “{name},” she says, trying it out. “It suits you.”', { name })
      : t('Then she looks at you properly, and her voice cracks. “Ca. Look at you. You got tall.”'),
    t('“Up here, anything can be said,” she says, “if you have the words. I didn’t. Twenty years I tried, out loud and on paper, and every time the Hush got to the words first. So I sent the balloon home for new ones.” She taps her book. “And for you.”'),
    t('The Hush has followed you to the very end. Up close it isn’t a monster at all, just a held breath the size of a cloud: twenty years of a sorry nobody said. It was never after you. It was hers, and it had followed her book back to her.'),
    t('Wa reads your words aloud: {words}. With every word, the Hush draws back a little. Then she stands up, turns to face home, and says it, loud enough to carry to Harbour: “I’m sorry. I didn’t mean it. I’m coming home.”', { words }),
    t('The Hush lets go all at once, like a breath let out, and the sky is full of sound again: birdsong, wind, and somewhere far below, the gulls of Harbour. Behind you the islands light up, a road of them, all the way home.'),
    // Tobias, the hermit (stories.js), if you've heard his story.
    ...(tobias === 'goggles' ? [t('You hand her the old flying goggles. “Tobias!” she says. “Twenty years he took to give these back.”')]
      : tobias === 'waiting' ? [t('You tell her Tobias is still waiting to say sorry. Wa snorts. “He still owes me a pair of goggles.”')] : []),
    ...(letters ? [t('Last of all, you give her the bundle from the post office: twenty letters in your mother’s handwriting, one for every year. Wa opens the top one and reads it with her hand over her mouth. “She wrote,” she says. “All this time, she wrote.”')] : []),
    t('“Your mother,” Wa says, as you fly her home along that road of islands. “What if she won’t talk to me?” “Then you talk first,” you say. When you come down over Harbour, your mother is already on the quay, holding her basket in both hands. Neither of them moves. Then they both say sorry at once, and laugh, and argue about who said it first.'),
  ]),
  // The line before the poem of your words.
  home: () => [t('The words that got you there:')],
  lost: (found) => (found
    ? t('Wa’s book is safe in the basket, with every word you learned written in it.')
    : t('Wa’s book is safe in the basket, with every word you learned written in it. She’s still out there.')),
};

// What Wa says when you open the Edge with one of her words.
export const WA_MEMORIES = {
  please: t('I taught you that one when you were three.'),
  thanks: t('Always thank the sky. It remembers.'),
  pancakes: t('Sunday pancakes. You remembered.'),
  goodnight: t('I used to say that to you every night I was home. There weren’t enough of them.'),
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
  crown: t('The queen gets bored. Bring her odd letters: she pays well.'),
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
  question: t('Ask the sky something. It always answers, but never the way you’d expect.'),
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
  stargaze: t('Stargazers always know what the weather will do. Bring them some supper: they forget to eat.'),
  post: t('Postmistresses know everybody’s business, even what the next gate wants. Ask nicely.'),
  tinker: t('The woman who made my balloon patches better than anyone in the sky. Don’t tell her I said so.'),
  band: t('The Hush can’t stand a brass band. Nobody can, really.'),
  inn: t('Mrs Hobb keeps a room for anyone who flies. Tell her I said so.'),
  fortune: t('Madame Vell can’t see the future. Don’t tell her I told you. She’s still worth every coin.'),
  shipyard: t('Bosun Tarrant built our basket. He’ll fit you a bigger burner, if you can pay for it.'),
  bath: t('After the Thin Air, nothing mends you like a hot pool.'),
  chime: t('Set the great clock, and you choose the hour you land. Night or day, your call.'),
  wreck: t('Old balloons come down here. There’s always something worth salvaging.'),
  nesting: t('The birds there leave feathers everywhere: wind words cost almost nothing from that island.'),
  whale: t('Don’t panic when the island moves. Leaving, you ride the whale’s wake a good way.'),
  icefall: t('It never gets light there. Take a lantern, and don’t expect firewood.'),
  eye: t('In the eye of the storm you can rest. Getting out is the hard part.'),
  orchard: t('Fill your basket at the orchard. You’ll be glad of it higher up.'),
};

// --- Reaches and gates --------------------------------------------------------
// The further you go, the stranger the islands: a word that doesn't ask for a
// kind of land gets one of the reach's own, `chance` of the time.
export const REACHES = [
  {
    at: 0, name: t('the Low Sky'), line: '',
    islands: [['coral', 1], ['toadstool', 1], ['mire', 1], ['lavender', 1], ['heath', 1], ['sugar', 1], ['savanna', 1], ['terraces', 1], ['maze', 1], ['giant', 1], ['orchard', 1], ['whale', 1], ['birds', 1]], chance: 0.3,
  },
  {
    at: 30, name: t('the High Winds'), line: t('You’ve climbed into the High Winds, and the basket sways. Storms come more often up here, and the islands get stranger.'),
    islands: [['stormcrag', 3], ['jungle', 2], ['withered', 2], ['bamboo', 2], ['clockwork', 2], ['paper', 2], ['mire', 1], ['toadstool', 1], ['savanna', 1], ['heath', 1], ['wreck', 2], ['stormeye', 1], ['birds', 1]], chance: 0.5,
  },
  {
    at: 65, name: t('the Thin Air'), line: t('You’ve reached the Thin Air. It’s cold enough to see your breath, so every flight up here eats one more food. The islands turn strange: glass, fire, cloud and gold.'),
    islands: [['glass', 3], ['ember', 3], ['moon', 3], ['cloudisle', 2], ['gilded', 2], ['stormcrag', 1], ['icefall', 2], ['stormeye', 1]], chance: 0.65,
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
  mirror: { name: t('a mirror sky'), line: t('A word that starts and ends with the same letter costs half the fuel, but every other word costs one more.') },
  crowded: { name: t('a crowded sky'), line: t('Far more happens between islands, for better and for worse.') },
  // The lucky letter is the voyage's own (`run.lucky`), so its line names it.
  lucky: { name: t('a lucky letter'), line: (run) => t('Every word with {letter} in it pays 2 coins when you land, but every word without it costs one more fuel.', { letter: run.lucky.toUpperCase() }) },
  wander: { name: t('wanderlust'), line: t('Every kind of island new to this voyage tops up your burner (+2 🔥), but landing on a kind you’ve already been to this voyage costs an hour.') },
  lean: { name: t('a lean year'), line: t('The trees give less, but everything you buy costs a coin less.') },
  fullmoon: { name: t('a full-moon voyage'), line: t('A full moon lights every night, so the sky never mishears you in the dark; but the Hush hunts by moonlight, and gains twice as fast after dark.') },
};

// --- Island traits --------------------------------------------------------------
// Half the voyage islands have one, seeded by the island's word (so an island is
// always the same), told on arrival and shown in the status line. voyage.js
// applies them by id; `when` keeps a trait off islands where it would mean nothing.
export const TRAITS = {
  windswept: { icon: '🌬️', name: t('windswept'), line: t('Windswept: the wind off this island will carry you 2 miles further.') },
  fruitful: { icon: '🍎', name: t('fruitful'), line: t('Fruitful: every tree here gives one more food.') },
  festival: { icon: '🎪', name: t('festival day'), line: t('It’s a festival day here: everything costs a coin less.') },
  haunted: { icon: '👻', name: t('haunted'), line: t('Haunted: the Hush likes it here, and gained 2 miles on you as you landed.'), when: (g) => g.run.hush !== null },
  foggy: { icon: '🌫️', name: t('foggy'), line: t('Foggy: from here, you can’t tell what the sky will hear in your next word.') },
  generous: { icon: '🤝', name: t('generous'), line: t('Generous: the first thing you take from the building here costs no time.') },
  quiet: { icon: '🕊️', name: t('quiet'), line: t('Quiet: nothing came across your path on the way here.') },
  longday: { icon: '☀️', name: t('a long day'), line: t('A long day: one more hour on this island.') },
  shortday: { icon: '🌘', name: t('a short day'), line: t('A short day: one hour less on this island.') },
  driftwood: { icon: '🪵', name: t('driftwood'), line: t('Driftwood on the shore: the water here gives a fuel too.') },
};

// --- The pack ---------------------------------------------------------------------
// One-use tools, up to four at once, used from the 🎒 chip in the status line.
// Markets, peddlers, wrecks and grateful families hand them out.
export const ITEMS = {
  patch: { icon: '🩹', name: t('patch kit'), line: t('Mends a heart.') },
  flare: { icon: '🎆', name: t('flare'), line: t('Scares off whatever is following you: pirates, a storm front, or the Hush (it falls back 6 miles).') },
  sandbag: { icon: '🪨', name: t('sandbag'), line: t('Drop it, and your next flight carries you 3 miles further.') },
  umbrella: { icon: '☂️', name: t('umbrella'), line: t('Your next take-off in a storm won’t tear the balloon.') },
  vane: { icon: '🐓', name: t('weathervane'), line: t('Fair skies on the next island.') },
  needle: { icon: '🪡', name: t('compass needle'), line: t('It points at the strange islands: the next island you reach is one of them.') },
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
  shell: { icon: '🐚', name: t('singing shell'), line: t('Every sea word you fly to (harbour, wave, anchor…) mends a heart when you land.') },
  inkwell: { icon: '🖋️', name: t('inkwell'), line: t('Each kind of word you use for the first time this voyage pays 2 coins.') },
  coin: { icon: '🍀', name: t('lucky clover'), line: t('Every gamble goes your way (ruins, a falling star, a ship of fog…).') },
  // Two that cut both ways.
  anchor: { icon: '⚓', name: t('golden anchor'), line: t('Every landing pays 2 coins, but every flight burns one more fuel.') },
  musicbox: { icon: '🎶', name: t('music box'), line: t('Every third flight its tune drives the Hush back 5 miles, but gulls follow the music and take a food.') },
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
        label: t('ask why Wa never came back'),
        act: () => t('Odile stops smiling. “Your mother grew up waving that balloon goodbye. The night before Wa flew for the Edge, she begged her to stay home, just once. Wa wouldn’t. Your mother said, ‘If you go, don’t come back,’ and Wa said, ‘Then I won’t.’ Then a door slammed, and there hasn’t been a word between them since. Twenty years.” She looks at the quiet behind you. “That’s when the Hush started.”'),
      },
      {
        label: t('race her to the next cloud'), note: t('a gamble: +3 miles, or −2 🔥'),
        act: (g) => `${g.chance(0.5)
          ? t('You win by a basket’s width, and Odile roars with laughter. {miles}', { miles: g.leagues(3) })
          : t('She wins easily. “Wa always said I cheat,” she shouts back. {got}', { got: g.give({ fuel: -2 }) })} ${t('Afterwards, over tea in her basket, she tells you why Wa never came home: your mother begged her to stay, just once, and it ended in a slammed door and twenty years without a word. “That’s when the Hush started.”')}`,
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
  // --- Trouble that stays with you: each bites over several islands unless you deal with it ---
  {
    id: 'leak', weight: 3, when: (g) => g.reach >= 1 && !g.flag('leak'),
    title: t('a leak in the burner'), text: t('A seam on the burner splits with a pop, and it starts to hiss.'),
    options: [
      { label: t('mend it properly'), note: '−4 🪙', disabled: (g) => g.run.glimmer < 4, act: (g) => t('A passing tinker sells you a proper patch, and the hissing stops. {got}', { got: g.give({ glimmer: -4 }) }) },
      {
        label: t('bind it with rope'), note: t('a gamble: it holds, or it leaks after all'),
        act: (g) => {
          if (g.chance(0.5)) return t('You bind it tight, and it holds.');
          g.mark('leak', true);
          return t('The rope slips in the heat, and the hiss comes back. Every flight burns 1 more 🔥 until a village, a campsite or a balloon workshop mends it.');
        },
      },
      {
        label: t('fly on and mend it later'), note: t('every flight burns 1 more 🔥 until a village, a campsite or a balloon workshop mends it'),
        act: (g) => { g.mark('leak', true); return t('You keep one ear on the hiss, and fly on.'); },
      },
    ],
  },
  {
    id: 'shadow', weight: 3, when: (g) => g.reach >= 1 && !g.flag('shadow'),
    title: t('a black balloon behind you'), text: t('A patched black balloon falls in behind you, close enough to see the crew grinning. Sky pirates, and in no hurry at all.'),
    options: [
      { label: t('pay them to go away'), note: '−8 🪙', disabled: (g) => g.run.glimmer < 8, act: (g) => t('They take the coins, salute, and turn away. {got}', { got: g.give({ glimmer: -8 }) }) },
      {
        label: t('turn and fight'), note: t('a gamble: they flee, or −1 ❤️ and they follow'),
        act: (g) => {
          if (g.chance(0.5)) return t('You charge them with the burner roaring, and they scatter.');
          g.mark('shadow', 3);
          return t('They cut a rope and fall in behind you again, laughing. {hurt}', { hurt: g.hurt(1) });
        },
      },
      {
        label: t('let them follow'), note: t('for 3 islands they take 3 🪙 (or 2 🍞) each time you land; a word of 9 letters or more loses them'),
        act: (g) => { g.mark('shadow', 3); return t('They follow at a lazy distance. You’ll need a long word to lose them.'); },
      },
    ],
  },
  {
    id: 'fray', weight: 3, when: (g) => g.reach >= 1 && !g.flag('fray'),
    title: t('a fraying rope'), text: t('One of the ropes that holds the basket is fraying, strand by strand.'),
    options: [
      { label: t('splice it now'), note: t('two hours pass'), act: (g) => t('You splice it in mid-air, slowly and carefully. {hours}', { hours: g.hours(2) }) },
      {
        label: t('mend it on the island'), note: t('an hour on this island, or −1 ❤️ when you take off'),
        act: (g) => { g.mark('fray', true); return t('You tie it off for now. Mend it before you leave, or it will snap.'); },
      },
    ],
  },
  // The Hoarder keeps words in jars and never says any of them: he bottles a kind
  // of word you've been using (lexicon.js `muted`), and in the Thin Air you can
  // steal it back from his basket.
  {
    id: 'hoarder', weight: 3, when: (g) => g.reach >= 1 && !g.flag('hoarded') && g.run.seen.length >= 2,
    title: t('the Hoarder'),
    text: (g) => {
      g.mark('hoard', g.run.seen[Math.floor(Math.random() * g.run.seen.length)]);
      return t('A thin man in a long coat sails up in a basket stacked with jars. Every jar holds a word, and not one of them has ever been said out loud. “Lovely,” he says, peering at Wa’s book. “I’ll have those.” He taps a page: {words}.', { words: g.examples(g.flag('hoard')) });
    },
    options: (g) => [
      {
        label: t('let him take them'), note: t('words like {words} mean nothing to the sky for the rest of this voyage', { words: g.examples(g.flag('hoard')) }),
        act: () => { g.mark('hoarded', g.flag('hoard')); return t('He uncorks a jar, and the words fly into it. He corks it and sails off, humming.'); },
      },
      { label: t('buy him off'), note: '−8 🪙', disabled: g.run.glimmer < 8, act: () => t('He sighs, and takes the coins instead. {got}', { got: g.give({ glimmer: -8 }) }) },
      {
        label: t('ask him to say one out loud'), note: t('a gamble: he flees, or he takes them anyway, and 3 🪙'),
        act: () => {
          if (g.chance(0.5)) return t('He opens his mouth. Nothing comes out. He goes red to the ears, and sails off without a word.');
          g.mark('hoarded', g.flag('hoard'));
          return t('He laughs, bottles them anyway, and takes a few coins for your cheek. {got}', { got: g.give({ glimmer: -3 }) });
        },
      },
    ],
  },
  {
    id: 'jars', weight: 8, when: (g) => Boolean(g.flag('hoarded')) && g.reach === 2,
    title: t('the Hoarder’s basket'), text: t('You spot the Hoarder’s basket moored to a cloud. He’s fast asleep among his jars, snoring.'),
    options: [
      {
        label: t('creep aboard and take your words back'), note: t('a gamble: your words back and some of his coins, or −1 ❤️'),
        act: (g) => {
          if (!g.chance(0.6)) return t('A jar rolls off the edge and smashes. He wakes up roaring, and you only just get away. {hurt}', { hurt: g.hurt(1) });
          g.mark('hoarded', null);
          return t('You find your jar and uncork it, and your words fly home to the book. You take a few of his coins too, for the trouble. {got}', { got: g.give({ glimmer: 4 }) });
        },
      },
      { label: t('leave him sleeping'), act: () => t('You let him snore. The words will have to wait for another voyage.') },
    ],
  },
  {
    id: 'peddler', weight: 1, when: (g) => g.packRoom,
    title: t('a peddler’s balloon'),
    text: (g) => {
      const ids = Object.keys(ITEMS);
      const a = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
      g.mark('wares', [a, ids[Math.floor(Math.random() * ids.length)]]);
      return t('A little balloon hung with pots, pans and lanterns bumps against your basket. “Everything a sailor needs,” says the peddler, “and some things they don’t.”');
    },
    options: (g) => [
      ...g.flag('wares').map((id, i) => ({
        label: t('buy the {name} {icon}', { name: ITEMS[id].name, icon: ITEMS[id].icon }), note: `−${5 + i} 🪙 · ${ITEMS[id].line}`, disabled: g.run.glimmer < 5 + i,
        act: () => `${g.give({ glimmer: -(5 + i) })} ${g.item(id)}`,
      })),
      { label: t('just looking'), act: () => t('“Suit yourself,” says the peddler, and drifts off rattling.') },
    ],
  },
  // --- Stories that play out over the next few islands ---
  {
    id: 'race', weight: 2, when: (g) => g.run.words.length >= 3 && !g.flag('race'),
    title: t('a race'),
    text: (g) => {
      const goal = g.goal(true);
      g.mark('raceGoal', goal);
      return t('A patched purple balloon draws level: Captain Odile, grinning. “Race you to {island}!” she shouts. “First to land on one wins. Your grandmother always beat me. Let’s see about you.”', { island: goal.island });
    },
    options: (g) => [
      {
        label: t('race her'), note: t('land on {island} within 4 flights ({words}…): a keepsake, or she crows about it (−3 🪙)', { island: g.flag('raceGoal').island, words: g.flag('raceGoal').words }),
        act: () => { g.mark('race', { biome: g.flag('raceGoal').biome, by: g.run.words.length + 4 }); return t('“Ready? Go!” She’s off before she finishes saying it.'); },
      },
      { label: t('wave her on'), act: () => t('“Next time, then!” she calls, and she’s gone.') },
    ],
  },
  {
    id: 'front', weight: 2, when: (g) => g.reach >= 1 && !g.flag('front'),
    title: t('a storm front'), text: t('Behind you, a long black wall of cloud is building, and it’s coming your way.'),
    options: [
      {
        label: t('run for it'), note: t('for 4 flights it chases you, gaining 6 miles each time; if it catches you, −1 ❤️. Long words outrun it.'),
        act: (g) => { g.mark('front', { at: g.run.leagues - 8, left: 4 }); return t('You open the burner and run. The thunder follows.'); },
      },
      { label: t('wait for it to pass'), note: t('three hours pass'), act: (g) => t('You tie the balloon down and wait while the storm thunders past. {hours}', { hours: g.hours(3) }) },
    ],
  },
  {
    id: 'scatter', weight: 2, when: (g) => g.reach < 2 && !g.flag('scatter'),
    title: t('torn pages'),
    text: (g) => {
      const kinds = [g.goal(false), g.goal(false), g.goal(false)].filter((x, i, all) => all.findIndex((y) => y.biome === x.biome) === i);
      g.mark('scatterGoals', kinds);
      return t('A torn page flutters into the basket, in Wa’s loopy writing: a page from her old logbook. A note in the corner says where the rest blew: {islands}.', { islands: kinds.map((k) => k.island).join(t(', ')) });
    },
    options: (g) => [
      {
        label: t('look for the rest'), note: t('find a page on each of those islands: one of Wa’s words for the set'),
        act: () => { g.mark('scatter', g.flag('scatterGoals').map((k) => k.biome)); return t('You tuck the page into her book. The others can’t have blown far.'); },
      },
      { label: t('let it go'), act: () => t('You let it go. It flutters off toward the clouds.') },
    ],
  },
  {
    id: 'kitechild', weight: 2, when: (g) => g.run.words.length >= 2 && !g.flag('child'),
    title: t('a kite and a girl'),
    text: (g) => {
      const goal = g.goal(false);
      g.mark('childGoal', goal);
      return t('A girl clinging to a kite string drifts past your basket. The wind blew her off {island} this morning. “Can you take me home? Mum will be worried sick.”', { island: goal.island });
    },
    options: (g) => [
      {
        label: t('take her home'), note: t('reach {island} within 4 flights ({words}…): +6 🪙 and a present from her family', { island: g.flag('childGoal').island, words: g.flag('childGoal').words }),
        act: () => { g.mark('child', { biome: g.flag('childGoal').biome, by: g.run.words.length + 4 }); return t('She climbs in, kite and all, and points at every cloud.'); },
      },
      { label: t('wave down a passing balloon'), act: () => t('A fisherman’s balloon takes her aboard. She waves her kite at you until she’s out of sight.') },
    ],
  },
  {
    id: 'festival', weight: 2, when: (g) => !g.flag('festival') && !g.flag('festivalDone'),
    title: t('the sky fair'), text: t('Bunting is strung between two islands, and music drifts up from below: it’s the sky fair.'),
    options: [
      {
        label: t('join in'), note: t('for the next 3 islands, food and music words (feast, bread, song…) pay 3 🪙 and a food'),
        act: (g) => { g.mark('festival', 3); g.mark('festivalDone', true); return t('Someone hands you a paper hat and a sticky bun.'); },
      },
      { label: t('fly on'), act: () => t('You hear the band for miles.') },
    ],
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
            : t('Inside: one of Wa’s pages, which must have blown out of her book years ago. “Keep your lantern lit,” it says. You put it in your pocket. {paid} {got}', { paid, got: g.give({ hull: 1 }) });
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
