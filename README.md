# PaCaLand

The landing page for [paca.land](https://paca.land): a small floating land in the sky, drawn live in the browser. Every link grows a different one. `paca.land/#anything` turns that word into its own land, with terrain, water, trees, a landmark, animals, a time of day and weather.

It's a static site (HTML, CSS and ES modules) with no build step, served by GitHub Pages. three.js r170 is vendored in `vendor/three`, so the page loads no third-party scripts. The only outside requests are the Google Fonts stylesheet and, on the home land, a weather lookup.

## Running it locally

ES modules don't load over `file://`, so serve the folder:

```bash
python -m http.server 8417
```

Then open <http://localhost:8417>. Add `#some-word` to visit other lands.

## What you can do

- **Look around:** drag to orbit. Scroll or pinch to zoom toward whatever you're pointing at, and double-click (double-tap on a phone) to step in closer. Up close the camera circles that spot; zoom back out, or double-click the sky, and it returns to circling the whole land.
- **Tap things:** trees shake and drop leaves, water ripples and sends out a small wave, grass sprouts flowers and a ring of wind. Landmarks light up and react, rabbits, deer, sheep, goats and squirrels bolt, ducks quack, islets spin, the balloon fires its burner.
- **Grab the sun:** drag the sun (or the moon, after dark) across the sky to set the time. When it's out of frame, a handle on the edge of the screen points to it; drag that instead.
- **Visit lands:** type any word, roll the dice, or copy a link. Each land shows how rare it is (common, uncommon, rare, epic or legendary) next to its name.
- **Journal** (book button): 37 things to find across lands (every biome and landmark, rare sights like aurora and shooting stars, wildlife, curiosities like the balloon), 21 islands and 5 animals only Drift's voyages reach, and 10 badges for things you keep doing. Missing entries give a hint; found ones take you back to where you found them. Progress is kept in this browser only.
- **Drift** ("follow Wa to the Edge of the Sky" under the land's name): a word game for an evening, described below. It's in alpha: the first voyage asks for a password, and each browser remembers it once given.
- **中文 / English** (top-right corner): the whole page, Drift's cards and Wa's story in Simplified Chinese or English. Voyages are still played by typing English words. The choice is remembered, and switching mid-voyage picks the voyage back up.
- **Time and weather panel** (clock button): scrub the time, run a 60-second time lapse, pick the weather, choose a quality level.
- **Sound** (speaker button): generated ambience. It starts muted, and the choice is remembered.
- **Photo mode** (camera button): hides the interface, frees the camera, adjusts exposure and focus, and saves a PNG.

## Drift: the sky has a language

A voyage to the Edge of the Sky, 100 miles away, where every destination is a word you type. It plays like a small roguelike: every voyage is different, and the things you learn about the language carry over to the next one.

**The story.** Your grandmother Wa was the best of the sky-sailors. Twenty years ago she flew for the Edge of the Sky, the farthest island anyone has reached, and never came back, and your mother won't say why. One morning her balloon drifts home, empty, with her book in the basket: "Come and find me, Sparrow. Bring words." Sparrow is what she called you. Before the first voyage the harbor master asks who's flying Wa's balloon, and the name you sign in his logbook is what people call you from then on (or just Sparrow).

On the way you find out who she was, and why she left. Her pages turn up at the gates, people who knew her remember her (an old rival in a purple balloon, a hermit who was once her co-pilot), and her notes fill the margins as you learn the language. The Hush that follows you turns out to be made of words nobody said, and the one following Wa is hers: the thing she never said to your mother. At the Edge she finally says it, and the words you said become the road home. After that she stays home, and sends you up again for words she doesn't know.

- **Islands are called what you said.** Say "kettle" and you land on Kettle.
- **Letters are miles, give or take the wind.** Each letter burns one fuel and carries you about a mile. Long words get you there faster but cost more. The hop also stretches or shrinks with where the word sounds like it is (the stars are far off, home never is), the air of the island you leave from (a storm crag flings you on, a mire holds you back) and a gust. The preview shows the exact distance and why, and it's the same every time you say that word from that island.
- **Meaning shapes the land.** Words are read for what they mean: winter words call snow, sea words a lighthouse, "noon" or "midnight" set the hour you arrive, "feather" is a wind word that halves the fuel, "feast" fills the larder, "rocket" carries you further, "tiny" weighs nothing, "melody" makes the island sing, "hello" brings someone who wants a ride, "why" gets a surprising answer. There are 61 kinds of words to learn.
- **The sky keeps its secrets.** While you type, the preview names only the kinds of words you've already learned. A word of a kind you haven't met just stirs: you find out by going.
- **Form does stranger things.** A word that starts with the last word's final letter rides a tailwind. Doubled letters fill a lake, rare letters raise a wonder, palindromes mirror, anagrams return to an earlier land, and at night, without a lantern, the sky may mishear you. These rules aren't explained; you find them.
- **Wa's words** (eleven ordinary words, like "please", "pancakes" and "kettle") do something special up here. Wizards who knew her will tell you some.
- **Each land gives you 3 hours.** Shake trees for food and fuel (each kind of island gives something different), say hello to the animals, and visit whoever lives there: a cabin, a market, a castle with a quest, ruins worth a gamble, a wizard who knows a secret.
- **Every building has a story.** Each of the ten kinds of building has a three-chapter story, told a chapter a visit, across voyages: a hermit with something to confess, a town crier who lost his voice to the Hush, a miller whose son ran off to the sky, a queen who can't laugh, a word library, a monk under a vow of silence. Your choices are remembered, the stories meet each other (a letter from one island is answered at another), and finishing one makes that building do more for you for good. Wa's book keeps track of where each one stands.
- **Keep the balloon going.** Each flight eats food, and storms and hunger tear the balloon. Dark words (doom, curse, peril) are a trade: they lead to withered woods and cost a heart, but pay double coins. The preview under the input says what the sky hears, and anything that could end the voyage (a flight, searching the ruins, drifting on the wind) says so first.

### The road to the Edge

- **Any letters fly, but riddles want real words.** Type anything with a vowel and the sky makes up an island for it. Only a real English word can answer a gate's riddle, take the pirates' dare or finish the queen's quest, so "abcdefg" can't open a gate. The check uses a public-domain list of 350,000 words (`vendor/words`), fetched when a voyage starts.
- **Three gates.** The Cloud Wall at 30 miles and the Wind Gate at 65 each open only for a word that answers a riddle ("a word without an E", "a word that ends in Y"), and the riddles change every voyage. The Edge itself, at 100, opens only for one of Wa's words; her last page tells you one. You hear a gate's riddle when you get close, or earlier from village gossip. A word that doesn't answer is turned back, and the balloon takes a hit.
- **Three reaches of sky.** Past each gate the sky gets rougher and stranger. The High Winds bring more storms. The Thin Air is cold, so every flight eats more.
- **Islands only voyages reach.** Twenty-one kinds of island never appear on ordinary lands: the mire, coral shoals, toadstool woods, storm crags, glass isles, ember isles (lava lakes and lava falls), gilded isles, jungles, savannas, heaths, lavender fields, cloud isles, withered woods, sugar isles, bamboo groves, tea terraces, clockwork isles, paper isles, moon isles, hedge mazes and giants' gardens. Words call them up ("swamp", "reef", "mushroom", "crag", "crystal", "volcano", "treasure", "jungle", "giraffe", "heather", "lavender", "pillow", "doom", "candy", "panda", "tea", "clock", "origami", "crater", "labyrinth", "enormous"), and the higher reaches are full of them. Each has its own trees (bamboo, tea bushes, brass cogs, folded paper, silver birches, topiary, giant flowers) and its own animals: frogs in the swamps, crabs on the shoals, pandas in the bamboo.
- **The Hush.** After the Cloud Wall, a silence that eats words follows you. It gains on you every hour you spend, long words outrun it, and sunny, morning and evening words drive it back. Music drives it back too, and so does saying sorry (“sorry”, “forgive”…). When it catches you it wants something: coins, a lantern, a heart, or a letter. A swallowed letter can't be used in any word until a wizard or a shrine wins it back.

### Every voyage is different

- **An omen** bends each voyage, with a good side and a bad side: a hungry sky, heavy vowels, restless winds, a gilded sky, long days or short breath.
- **Keepsakes** change which words are worth saying: a compass rose for tailwinds, a kite string for wind words, a silver bell against dark words, a lodestone for J, Q, X and Z, and eight more. You pick one from the harbor master's chest at the start, and find more in markets, ruins and the sky.
- **Passengers** come aboard at campsites, castles, villages and in the air. Each one helps while aboard (the fox finds food, the cartographer knows shortcuts, the balloonist patches tears) but eats your bread, and each wants to reach a certain kind of land. Get them there and they thank you.
- **Things happen between lands:** about twenty encounters, each with a choice. Sky pirates dare you to say a word starting with their letter, a whale offers to sing your next word for free, a falling star might be a keepsake or might burn. Some are longer stories: half a burned map in a bottle leads to a treasure word, and a stranger you help may turn out to be a queen.

A voyage takes 20 to 30 minutes and is saved as you go, so you can put it down and pick it up later. When you reach the Edge, the last card names what kind of sailor you were. Wa's book (book button, during a voyage) keeps everything you've learned across voyages: kinds of words, rules, her words, the islands you've seen and the keepsakes you've found. Voyage lands are grown from their word too, but nudged by what it means, so they don't count toward rarity.

## Time and weather

- **The home land** (`paca.land` with no word) shows the real sky. The sun sits where it really is and the moon shows its real phase. Scrubbing the time, the time lapse and dragging the sun all follow today's real path across your sky. Weather and temperature come live from [Open-Meteo](https://open-meteo.com) (free, no key), refreshed every 15 minutes. By default the place is each visitor's own, guessed from their time zone, so there's no location prompt. To pin it to one city, set `HOME_PLACE` in `js/conditions.js`.
- **Every other land** has its own fixed moment (dawn, golden hour, night…), moon and weather, grown from its word. Time drifts on in real time while you watch.
- **Weather changes the land:** rain makes everything wet and glossy and puddles the flats, swells lakes, rings the water and puts drops on the "lens". Snow settles on the ground, roofs and treetops, and eventually freezes the lake. Mist rolls in as a bank. Thunderstorms bring lightning and thunder. Lamps come on at night and on gloomy days.

## Quality

The page starts at "ultra" on desktop and "high" on touch devices. It steps down if the frame rate stays under 30 fps, and back up once things run smoothly. You can also pick a level in the panel. Levels control pixel ratio, shadow-map size, sun shafts, bloom, tilt-shift, lake reflections and grass density.

`?pcss=0` in the URL switches the contact-hardening shadows back to plain soft shadows, for comparison or a struggling GPU.

## Deploying

Push to `main`; GitHub Pages serves it at paca.land (the `CNAME` file must stay).

GitHub's CDN caches files for hours. When you change any of the site's own files, **bump every `?v=` number in `index.html` together** (the stylesheet, `js/main.js`, and each entry in the import map), so browsers fetch the new versions instead of mixing old and new modules.

## A word on links

Each land is a pure function of its word, so a link always shows the same land, as long as the generator stays the same. Changing generation code (biome weights, terrain, placement order, even the number of random draws) reshapes every land. If links start getting shared, freeze the generator, or add a version to the URL (`#v1/word`) and keep the old generator for old links.

## Code map

| File | What it does |
| --- | --- |
| `index.html`, `main.css` | Page shell, heads-up display, controls, import map |
| `js/main.js` | Renderer, camera and controls, post-processing, quality, time and weather sources, UI, the render loop |
| `js/world.js` | Generates a land: biomes, terrain shape, water, flora, garden, ambient particles, taps |
| `js/landmarks.js` | Landmarks (castle, windmill, lighthouse…), paths and lanterns, fields, docks, props, light pools, balloon |
| `js/details.js` | Static detail: boulders, logs, ferns, mushrooms, reeds, lily pads, hanging roots, fences, barrels |
| `js/life.js` | Animals: birds, butterflies, bats, dragonflies, rabbits, deer, ducks, fish, and each biome's own (sheep, goats, squirrels, lizards, penguins, frogs, crabs, snails, giraffes, pandas) |
| `js/grass.js` | Instanced grass blades |
| `js/sky.js` | Sky dome, sun and moon lighting, clouds, rain, snow, lightning, rainbow, shooting stars, aurora, image-based lighting |
| `js/effects.js` | Shared shader uniforms and material patches (wind, cloud shadows, wet, snow), sun shafts and lens flare, tilt-shift and lens drops, lake reflections, PCSS shadows |
| `js/conditions.js` | Real sun position and moon phase, the home location, live weather, each land's seeded "vibe" |
| `js/interact.js` | Tap and click handling, particle bursts |
| `js/skygrab.js` | Dragging the sun or moon to set the time, and the edge-of-screen handle |
| `js/journal.js` | The journal: discoveries, badges, toasts, saved in `localStorage` |
| `js/lexicon.js` | Drift's language: meanings, form rules, secret words, and reading a word |
| `js/voyage.js` | Drift's game: the voyage, resources, landmark visits, the language book, saving |
| `js/tales.js` | Drift's tales: Wa's story and notes, reaches and gates, omens, keepsakes, passengers, encounters in the air, the Hush |
| `js/stories.js` | Drift's building stories: three chapters each, and what finishing one does |
| `js/rarity.js` | How rare a land is, from odds counted over 1,600 generated lands |
| `js/i18n.js`, `js/zh.js` | 中文 / English: `t()` looks text up by its English wording; `zh.js` holds the Simplified Chinese |
| `js/sound.js` | Generated soundscape (Web Audio) |
| `js/random.js` | Seeded random numbers, noise, land names |
| `vendor/three` | three.js r170 and the add-ons used (MIT) |
| `vendor/words` | English word list for Drift's riddles, dares and quests (public domain, from dwyl/english-words) |
