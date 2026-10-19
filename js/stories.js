// Stories at the buildings, for voyages (voyage.js). Every kind of building
// has someone with a story in three chapters; each visit to that kind of
// building can tell the next one, with a choice, and the story carries on
// across voyages (it's kept in Wa's book). Finishing one makes a friend for
// good: `perk` says what that building does for you from then on (voyage.js
// applies it). Several stories cross: the town crier has news for the miller,
// whose son is the lighthouse keeper's apprentice; the word library keeps the
// jar Wa took; the postmistress's letters reach the Edge (tales.js); and all
// of them circle what Wa's pages say the Hush is made of.
//
// A chapter is (g) => { title, text, options }, like a tale in the air
// (tales.js): each option's `act(g)` does its thing and returns what happened.
// `ask` is how the chapter is offered on the building's card. Every line goes
// through t() (i18n.js).
import { t } from './i18n.js';

export const ARCS = {
  cabin: {
    icon: '🛖', name: t('Tobias the hermit'),
    perk: t('From now on, a hermit’s soup also mends a heart.'),
    chapters: [
      {
        ask: t('ask about the tune he’s humming'),
        tell: () => ({
          title: t('the hermit’s tune'),
          text: t('The hermit hums while he stirs the soup, and you know the tune. Wa used to sing it to you at bedtime. When you hum along, he stops dead. “Where did you learn that?”'),
          options: [
            { label: t('“From Wa. I’m her grandchild.”'), act: (g) => t('He puts the spoon down very carefully. “Then you’re Ca.” He doesn’t say anything else, but you get the biggest bowl. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('“From my grandmother.”'), act: (g) => t('“Your grandmother had good taste in songs,” he says, and won’t look at you. You get the biggest bowl. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('ask the hermit about Wa'),
        tell: (g) => ({
          title: t('the hermit’s confession'),
          text: t('This time the hermit is ready to talk. “My name’s Tobias. I was Wa’s co-pilot, eleven years. When the Hush came through the Cloud Wall, I got scared. At the next island I climbed out of the basket and watched her fly on alone. I left her up there, {name}. I never even said I was sorry.”', { name: g.name }),
          options: [
            { label: t('tell him she’d forgive him'), act: (g2) => t('He laughs, and then has to blow his nose. “She would, too. That’s what makes it so hard.” He presses a jar of honey into your hands. {got}', { got: g2.give({ food: 3 }) }) },
            { label: t('tell him to say it to her himself'), act: (g2) => t('“To her face?” He stirs the soup for a while. “If you find her, tell her Tobias is still waiting to say it.” Then he goes over your balloon for tears, and patches every one he finds. {got}', { got: g2.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('visit Tobias again'),
        tell: () => ({
          title: t('the empty chair'),
          text: t('Tobias has set two places at his table. “For when she comes home,” he says. He has been practising what he’ll say to her: you catch him muttering it to the soup. Before you go, he takes a pair of old flying goggles out of a drawer. “These were hers. She lent them to me and I never gave them back.”'),
          options: [
            { label: t('take the goggles'), act: (g) => t('You put them on. They smell of Wa’s hat. {got}', { got: g.give({ glimmer: 4 }) }) },
            { label: t('tell him to give them back himself'), act: (g) => t('“In person,” Tobias says, and almost smiles. “Fair enough.” {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
    ],
  },

  village: {
    icon: '🔔', name: t('the town crier'),
    perk: t('From now on, everything at a village market costs 1 coin less.'),
    chapters: [
      {
        ask: t('ask why the town crier is silent'),
        tell: () => ({
          title: t('the silent crier'),
          text: t('In the middle of the square stands a town crier with a big brass bell and no voice at all. He writes on a slate: THE QUIET TOOK IT. THE ONE THEY CALL THE HUSH. LAST WINTER. He rubs it out and writes again: I HAD NEWS FOR SOMEONE. NOW I CAN’T SAY IT.'),
          options: [
            { label: t('offer to shout his news for him'), act: (g) => t('He chalks it up: THE MILLER’S SON IS ALIVE. Then he rubs it out fast, as if someone might overhear. You shout it across the square anyway. Somewhere, a window bangs open. The crier presses some coins into your hand, shaking. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('ask who the news is for'), act: (g) => t('He writes: THE MILLER. HER SON IS ALIVE. Then, smaller: I WAS TOO SCARED TO TELL HER. NOW I CAN’T. He gives you two coins anyway, for listening. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('look for the crier’s voice'),
        tell: () => ({
          title: t('a voice in a jar'),
          text: t('The crier has heard a rumour: voices the Hush swallows sink like stones, and now and then one turns up in a market as junk. Today a stall is selling a jar that hums. The crier goes white.'),
          options: [
            {
              label: t('buy the jar'), note: '−4 🪙', disabled: (g) => g.run.glimmer < 4,
              act: (g) => t('You pay, and open the jar in the middle of the square. Out spills a voice as big as a bell. “OYEZ!” bellows the crier, and bursts into tears. {got}', { got: g.give({ glimmer: -4 }) }),
            },
            {
              label: t('talk the stallholder round'), note: t('a gamble: the jar for nothing, or −3 🪙'),
              act: (g) => (g.chance(0.5)
                ? t('“For the crier? Take it,” says the stallholder. The crier opens it and bellows “OYEZ!” so loud the pigeons leave town.')
                : t('The stallholder won’t budge, so you pay. The crier opens the jar and bellows “OYEZ!” so loud the pigeons leave town. {got}', { got: g.give({ glimmer: -3 }) })),
            },
          ],
        }),
      },
      {
        ask: t('hear the crier’s news'),
        tell: (g) => ({
          title: t('oyez, oyez'),
          text: t('The crier rings his bell, fills his lungs, and shouts the news he has carried all year: “HEAR YE! MILLER, YOUR SON IS ALIVE!” Across the square, a woman drops a sack of flour. Then, because he can: “AND {name}, GRANDCHILD OF WA, FLIES FOR THE EDGE! GIVE THEM A FAIR PRICE!” Every stallholder in the square takes a step back.', { name: g.name.toUpperCase() }),
          options: [
            { label: t('take a bow'), act: (g2) => t('The square cheers. Somebody throws a cabbage, kindly. {got}', { got: g2.give({ food: 2 }) }) },
            { label: t('ring the bell yourself'), act: (g2) => t('You ring it once, as hard as you can. It’s the best thing you’ve done all week. {got}', { got: g2.give({ glimmer: 2 }) }) },
          ],
        }),
      },
    ],
  },

  windmill: {
    icon: '🌾', name: t('Hester the miller'),
    perk: t('From now on, helping with the baking at a windmill gives 2 more food.'),
    chapters: [
      {
        ask: t('ask about the drawing on the wall'),
        tell: () => ({
          title: t('the miller’s son'),
          text: t('On the windmill wall hangs a drawing of a boy in flying goggles. “Rowan,” says the miller, floury hands on her hips. “He heard about your grandmother and wanted to be a sky-sailor too. Left at sixteen. That was nine years ago.” She doesn’t say anything kind about Wa.'),
          options: [
            { label: t('say you’re sorry'), act: (g) => t('“Not your fault,” she says, but she kneads the dough a bit harder. She still sends you off with a loaf. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('promise to look for him'), act: (g) => t('She stops kneading. “You’d do that?” She wraps you a loaf and two buns, and wipes her eyes with a floury hand while she does it. {got}', { got: g.give({ food: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('ask about the letter on the windowsill'),
        tell: () => ({
          title: t('a letter from Rowan'),
          text: t('An unopened letter sits on the windowsill, addressed in a young man’s handwriting. “It came last month,” the miller says. “From Rowan. I can’t open it. What if it says he isn’t coming back?”'),
          options: [
            { label: t('read it to her'), act: (g) => t('It’s short. Rowan is a lighthouse keeper’s apprentice now. He’s sorry, and he misses her bread. The miller laughs and cries at the same time. {got}', { got: g.give({ food: 3 }) }) },
            { label: t('tell her to open it herself'), act: (g) => t('She opens it with floury, shaking fingers, reads it twice, and laughs out loud. “A lighthouse! The daft boy.” She folds it into her apron pocket and sends you off with two buns. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('carry the miller’s reply'),
        tell: () => ({
          title: t('a loaf for Rowan'),
          text: t('The miller has written back. It took her all week, she says, and most of a sack of flour in practice loaves. She hands you the letter and a loaf wrapped in a cloth. “If you pass a lighthouse…”'),
          options: [
            { label: t('promise to deliver it'), act: (g) => t('“Good,” she says. Then, gruffly: “Your grandmother was a menace. But she was right about some things.” {got}', { got: g.give({ food: 2 }) }) },
            { label: t('ask her to come along'), act: (g) => t('“In a basket? Me?” She laughs, but her eyes keep going to the sky. “Maybe next summer.” {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
    ],
  },

  castle: {
    icon: '👑', name: t('Queen Marigold'),
    perk: t('From now on, the queen’s quests pay 4 more coins.'),
    chapters: [
      {
        ask: t('ask the queen why she’s so bored'),
        tell: () => ({
          title: t('the queen who can’t laugh'),
          text: t('“Bored?” says the queen. “I’m not bored. I just can’t laugh. The Hush passed over my castle years ago and took every laugh in it. Even the jester’s. Especially the jester’s.” In the corner, the jester nods sadly.'),
          options: [
            { label: t('tell her a joke'), act: (g) => t('You tell her the one about the cloud and the umbrella. Nothing. The jester winces for you. The queen gives you two coins for trying. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('pull a face'), act: (g) => t('You pull the face Wa used to pull at breakfast. The corner of the queen’s mouth twitches. “Again,” she orders under her breath, and tosses you three coins. {got}', { got: g.give({ glimmer: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('ask the queen about Wa'),
        tell: () => ({
          title: t('the queen remembers'),
          text: t('“Wa,” says the queen, and for a moment she forgets to sit up straight. “We were girls together, before I was a queen. She taught me to say no. Nobody had ever told me I could.” She looks at you sideways. “She talked about you, you know. Her Ca.”'),
          options: [
            { label: t('ask what Wa was like then'), act: (g) => t('“Loud,” says the queen. “Rude. Always right.” She almost smiles, and gives you three coins for old times’ sake. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('ask what you were like'), act: (g) => t('“Sticky,” says the queen. “You were three.” And then, out of nowhere, she laughs: one short bark, like a seal. The whole court turns to stare. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the queen again'),
        tell: () => ({
          title: t('a knight of the sky'),
          text: t('The queen has been practising. She laughs at the soup, the weather and a duke’s hat, and the jester has been crying with relief all week. “Kneel,” she tells you. You kneel. She taps each of your shoulders with a breadknife, because nobody can find the sword.'),
          options: [
            { label: t('rise, a knight of the sky'), act: (g) => t('“Rise, {name}, Knight of the Sky,” she says. “And keep bringing me odd letters.” {got}', { name: g.name, got: g.give({ glimmer: 4 }) }) },
            { label: t('ask for the sword instead'), act: (g) => t('“Nobody can find the sword,” she says. “Have the breadknife.” You are now a Knight of the Sky, armed with a breadknife. {got}', { got: g.give({ glimmer: 4 }) }) },
          ],
        }),
      },
    ],
  },

  lighthouse: {
    icon: '🗼', name: t('the lighthouse keeper'),
    perk: t('From now on, every lighthouse keeper gives you two lanterns.'),
    chapters: [
      {
        ask: t('ask to see the keeper’s logbook'),
        tell: () => ({
          title: t('the keeper’s log'),
          text: t('The keeper writes down every balloon that passes. He turns back twenty years of pages for you, licking his thumb. There, in faded ink: Wa’s balloon, heading up. Underneath, in her handwriting: Back by Sunday. Tell Ca.'),
          options: [
            { label: t('ask what Wa told him'), act: (g) => t('“Not much,” says the keeper. “She bought two lanterns, asked which way the wind was going, and asked me to tell Ca she’d be back by Sunday.” He rubs his nose. “I never knew who Ca was.” {got}', { got: g.give({ lanterns: 1 }) }) },
            { label: t('write your name under hers'), act: (g) => t('He watches you write {name} under Wa’s line, gives a satisfied nod, and fills your burner from his own oil can. {got}', { name: g.name, got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help the keeper with the lamp'),
        tell: () => ({
          title: t('the lamp goes out'),
          text: t('The wind is getting up, and the great lamp is guttering. “My apprentice is up on the gallery,” the keeper shouts. “The lad never listens!” Up top, a young man in flying goggles is wrestling with a jammed shutter.'),
          options: [
            { label: t('climb up and help'), act: (g) => t('Together you wrench the shutter free, and the light swings out over the clouds. The young man grins and shakes your hand. “Rowan,” he says. “I’m going to be a sky-sailor.” {got}', { got: g.give({ lanterns: 1 }) }) },
            { label: t('hold the ladder'), act: (g) => t('You hold the ladder while the shutter bangs free. The young man climbs down windblown and grinning. “Rowan,” he says. “Next year I’m going to be a sky-sailor.” {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the keeper and Rowan'),
        tell: (g) => ({
          title: t('the apprentice'),
          text: g.arcDone('windmill')
            ? t('Rowan has packed a bag. You hand him his mother’s letter and her loaf. He reads the letter twice, goes bright red, and hugs you so hard your ribs creak. “I left without saying goodbye to her,” he says into your shoulder. “Nine years.”')
            : t('Rowan has packed a bag, and the keeper is pretending not to mind. Rowan takes you aside. “I left home without saying goodbye to my mum,” he says. “Nine years ago. I wrote to her once. I don’t even know if she opened it.”'),
          options: [
            { label: t('tell him to go home first'), act: (g2) => t('“Home first,” he says slowly. “Then the sky.” The keeper, who isn’t listening, nods along. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('give him your lantern for the way'), note: '−1 🏮 → +5 🪙', disabled: (g2) => g2.run.lanterns < 1, act: (g2) => t('He hangs it on his pack. “For the way home,” he says. The keeper presses a purse into your hand when Rowan isn’t looking. {got}', { got: g2.give({ lanterns: -1, glimmer: 5 }) }) },
          ],
        }),
      },
    ],
  },

  campsite: {
    icon: '🏕️', name: t('Pip, who wants to fly'),
    perk: t('From now on, travellers’ stories teach you three kinds of words, not two.'),
    chapters: [
      {
        ask: t('talk to the girl with paper wings'),
        tell: () => ({
          title: t('a girl with paper wings'),
          text: t('A girl of about ten is sitting by the fire, gluing paper wings onto her coat. “I’m Pip,” she says. “I’m going to be a sky-sailor. How do you do it? Do you just say words?”'),
          options: [
            { label: t('show her'), act: (g) => t('You say “kite”, and nothing happens, because you’re standing on the ground. Pip is not impressed. Then the fire pops, and a spark hangs in the air like a tiny island for a heartbeat. She stares at it. {got}', { got: g.give({ fuel: 1 }) }) },
            { label: t('tell her about Wa'), act: (g) => t('Pip listens with her mouth open. “Twenty years?” she says at last. “Didn’t she get bored?” She shares her toast with you. {got}', { got: g.give({ food: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('see how Pip is getting on'),
        tell: () => ({
          title: t('Pip’s first word'),
          text: t('Pip has been practising. She has a whole notebook of words, and every one is crossed out. “None of them work,” she says. “I need a better word.”'),
          options: [
            { label: t('give her one of yours'), act: (g) => t('You give her “{word}”. She says it slowly, one letter at a time, and an island the size of a pebble pops up beside the fire and floats there, glowing. Pip shrieks with delight. The whole camp comes running, and someone passes a hat round for you. {got}', { word: g.run.words[g.run.words.length - 1] ?? 'kite', got: g.give({ glimmer: 2 }) }) },
            { label: t('tell her to find her own'), act: (g) => t('She scowls, chews her pencil, and writes down a word she won’t show you. As you leave you hear a small pop behind you, and a cheer. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('say goodbye to Pip'),
        tell: () => ({
          title: t('a new sky-sailor'),
          text: t('Pip has a balloon. It’s made of bedsheets and it leans to the left, but it flies. “I’m going to find the Edge,” she announces. “After you. Not before. That would be rude.”'),
          options: [
            { label: t('give her a coin for luck'), note: '−1 🪙', act: (g) => t('She bites it to check it’s real, then tucks it in her boot. {got}', { got: g.give({ glimmer: -1 }) }) },
            { label: t('teach her to thank the sky'), act: (g) => t('She thanks the sky with a little bow, and the wind ruffles her hair. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
    ],
  },

  ruins: {
    icon: '🏛️', name: t('the word library'),
    perk: t('From now on, searching ruins never drops a stone on you.'),
    chapters: [
      {
        ask: t('look for the carved door'),
        tell: () => ({
          title: t('the carved door'),
          text: t('Under the rubble is a door carved with letters, half of them worn away. The words that are left read: KEEP THEM HERE UNTIL SOMEONE NEEDS THEM. There’s no handle.'),
          options: [
            { label: t('brush off the letters'), act: (g) => t('Under the dust are names, hundreds of them, carved small: sky-sailors. Wa is there, near the bottom. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('knock'), act: (g) => t('Something on the other side knocks back, once. Then nothing. You decide to come back later. {got}', { got: g.give({ glimmer: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('try your manners on the carved door'),
        tell: () => ({
          title: t('the door opens'),
          text: t('This time you remember your manners. “Please,” you say to the door. It thinks about it, then swings open onto a long room of shelves, stacked with glass jars. Each jar holds a single word, glowing faintly.'),
          options: [
            { label: t('read the labels'), act: (g) => t('The labels are in a hundred different hands, and you learn something as you read: {learned} Near the door is a jar labelled, in Wa’s writing: SORRY. It’s empty.', { learned: g.teach(1) }) },
            { label: t('take a jar'), act: (g) => t('You take a jar labelled JAM, because you’re hungry. It’s just jam. {got}', { got: g.give({ food: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('go back to the word library'),
        tell: () => ({
          title: t('the librarian'),
          text: t('This time someone is waiting for you: an old librarian with ink on her nose. “I keep the words people leave behind,” she says. “Wa left one here on her way up, twenty years ago. The very next morning she came back for it, and took it with her to the Edge. She never could bring herself to say it, though.”'),
          options: [
            { label: t('ask what the word was'), act: (g) => t('“You read the label,” says the librarian. “But it isn’t mine to say. That’s the whole point.” She stamps your hand with an inky star. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('leave a word of your own'), act: (g) => t('You write a word on a label and put it in an empty jar. The librarian doesn’t read it. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
    ],
  },

  stones: {
    icon: '🗿', name: t('the humming stones'),
    perk: t('From now on, standing stones also tell you what the next gate wants.'),
    chapters: [
      {
        ask: t('put your ear to the tallest stone'),
        tell: () => ({
          title: t('a laugh in the stone'),
          text: t('The tallest stone is warm. Under the humming there are sounds, very far off, like a radio in another room. You catch one of them: a woman laughing. You’d know that laugh anywhere. It’s Wa’s.'),
          options: [
            { label: t('hum back'), act: (g) => t('The stones hum a little louder, as if they’re pleased. One of them gives off a puff of warm air that smells of toast. {got}', { got: g.give({ fuel: 2 }) }) },
            { label: t('say her name'), act: (g) => t('You say “Wa” into the stone. The humming stops. Then, faint and far off, the laugh again, and suddenly the next gate doesn’t seem so high. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('listen to the stones again'),
        tell: () => ({
          title: t('a message in stone'),
          text: t('This time the stones are humming a whole sentence. It takes you an hour to piece it together: THE EDGE HEARS WHAT YOU MEAN, AS LONG AS YOU SAY IT.'),
          options: [
            { label: t('write it in Wa’s book'), act: (g) => t('You copy it under her last page in your best handwriting. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ask the stones what it means'), act: (g) => t('The stones go quiet. Stones are terrible at explaining things. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the stones a last time'),
        tell: (g) => ({
          title: t('the stones’ gift'),
          // Only a name you signed is "not Ca".
          text: g.signed
            ? t('When you arrive, the stones are already humming a name. Not Ca. The one you go by: {name}. They hum it round and round the ring until the grass shivers.', { name: g.name })
            : t('When you arrive, the stones are already humming a name: Ca, the one Wa gave you. They hum it round and round the ring until the grass shivers.'),
          options: [
            { label: t('hum along'), act: (g2) => t('You hum along, and for a moment the whole island hums with you. {got}', { got: g2.give({ hull: 1 }) }) },
            { label: t('just listen'), act: (g2) => t('You sit in the grass and listen until the light goes gold. {got}', { got: g2.give({ glimmer: 3 }) }) },
          ],
        }),
      },
    ],
  },

  shrine: {
    icon: '⛩️', name: t('the silent monk'),
    perk: t('From now on, ringing a shrine’s bell mends two hearts.'),
    chapters: [
      {
        ask: t('ask the monk about the bell'),
        tell: () => ({
          title: t('the silent monk'),
          text: t('The monk who keeps the bell hasn’t spoken for forty years. He took a vow of silence, he writes, to keep the peace. He looks tired. Behind the shrine, the quiet is so thick you could almost lean on it.'),
          options: [
            { label: t('ask what peace he means'), act: (g) => t('He writes: MY BROTHER AND I QUARRELLED. I PROMISED NEVER TO SAY ANOTHER WORD ABOUT IT. He looks at the thick quiet behind the shrine, and so do you. He presses two coins into your hand for listening. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ring the bell for him'), act: (g) => t('You ring the bell. For a moment the quiet behind the shrine thins, like mist when the sun comes out. The monk watches it without moving. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('tell the monk what the Hush is'),
        tell: () => ({
          title: t('what silence makes'),
          text: t('You tell him what Wa wrote: the Hush is made of words nobody said. The monk reads your face for a long time. Then he writes, in tiny letters: IS MINE OUT THERE TOO?'),
          options: [
            { label: t('tell him the truth'), act: (g) => t('“Probably,” you say. He nods slowly, and gives you a bag of rice for the road. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('tell him it’s not too late'), act: (g) => t('He writes NOT TOO LATE, looks at it, and underlines it twice. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the monk again'),
        tell: () => ({
          title: t('the vow'),
          text: t('When you come in, the monk is standing by the bell, his hands shaking. He opens his mouth. Nothing. He tries again. “Brother,” he says, in a voice rusty from forty years. “It was my fault.” Somewhere far off, the quiet cracks like ice in spring.'),
          options: [
            { label: t('ring the bell for him'), act: (g) => t('You ring it, and this time the monk laughs out loud. {got}', { got: g.give({ hull: 1 }) }) },
            { label: t('sit with him a while'), act: (g) => t('You sit together on the step. After a while he starts to hum. He’s terrible at it. {got}', { got: g.give({ glimmer: 3 }) }) },
          ],
        }),
      },
    ],
  },

  wizard: {
    icon: '🧙', name: t('Mabyn the wizard'),
    perk: t('From now on, the wizard also teaches you two kinds of words when you visit.'),
    chapters: [
      {
        ask: t('ask the wizard how she knew Wa'),
        tell: () => ({
          title: t('the wizard’s pupil'),
          text: t('“Knew her?” The wizard snorts. “I taught her. Worst pupil I ever had. She never did one spell the way I said, and every one of them worked better than mine.” She peers at you over her spectacles. “You fly like her. Too fast.”'),
          options: [
            { label: t('ask her to teach you'), act: (g) => `${t('“Lesson one,” says the wizard. “A word means what you mean by it. Lesson two: wipe your feet.”')} ${g.teach(1)}` },
            { label: t('ask about Wa’s worst spell'), act: (g) => t('“She turned my cat into a word,” says the wizard. “The word was Bob. The cat is still Bob. He seems happier.” {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('ask the wizard about the Edge'),
        tell: () => ({
          title: t('what waits at the Edge'),
          text: t('“The Edge is where the sky’s first word was said,” the wizard says. “Up there, words are louder. Something you’ve never managed to say can be said at last.” She taps Wa’s book. “That’s why she didn’t turn back. Not for the view. To say something.”'),
          options: [
            { label: t('ask what Wa needed to say'), act: (g) => t('“Ask her,” says the wizard. “If I told you, it wouldn’t be hers.” {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ask if the Hush can be beaten'), act: (g) => t('“Beaten? No. Answered.” She won’t explain. Wizards never do. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the wizard again'),
        tell: (g) => ({
          title: t('your sky name'),
          text: g.signed
            ? t('“Every sky-sailor has a sky name,” the wizard says. “Wa’s was Wa: the sound you make the first time the clouds open under you.” She squints at you over her spectacles. “Yours is {name}. You picked it yourself. Wa would approve.”', { name: g.name })
            : t('“Every sky-sailor has a sky name,” the wizard says. “Wa’s was Wa: the sound you make the first time the clouds open under you.” She squints at you over her spectacles. “Yours is Ca. She gave it to you. Fly it well.”'),
          options: [
            { label: t('thank her'), act: (g2) => t('“Don’t thank me. Go and fly.” {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('ask what your name means'), act: (g2) => t('“Whatever you make it mean,” says the wizard. “Same as any word.” {got}', { got: g2.give({ fuel: 2 }) }) },
          ],
        }),
      },
    ],
  },

  observatory: {
    icon: '🔭', name: t('Professor Mott'),
    perk: t('From now on, supper for the professor buys fair weather for three islands, not two.'),
    chapters: [
      {
        ask: t('ask what the professor is looking for'),
        tell: () => ({
          title: t('the professor’s telescope'),
          text: t('Professor Mott swings the big telescope round to the Edge of the Sky and puts his eye to it. “Twenty years ago there was a light up there,” he says. “A lantern, I’d swear to it. I watched it every night for three years. Then it went out, and I’ve been watching the dark where it was ever since.”'),
          options: [
            { label: t('ask if it was Wa’s lantern'), act: (g) => t('“Whose else would it be?” says the professor. “Nobody had ever got that far.” He shows you a shelf of notebooks, a page for every night since the light went out, and on every page the same two words: nothing yet. “Have a biscuit,” he says, and gives you the whole tin. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('take a look yourself'), act: (g) => t('You put your eye to the brass. The sky goes on and on, island after island, and right at the end of it is a patch of dark with nothing in it. “See?” says the professor, pleased to have company. “Nothing. Every night, nothing.” He gives you a can of lamp oil. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help the professor with a thieving magpie'),
        tell: (g) => ({
          title: t('the magpie'),
          text: t('Just as you come in, a magpie swoops through the slit in the dome, plucks the best lens out of the telescope, and lands on the roof with it. “My lens!” shouts the professor, grabbing a broom. “Without it I couldn’t see a cow in a field!”'),
          options: [
            {
              label: t('climb up after it'),
              note: g.run.hull <= 1 ? t('a gamble: +3 🪙 from the professor, or a slip that would end your voyage') : t('a gamble: +3 🪙 from the professor, or a slip onto your balloon (−1 ❤️)'),
              act: (g2) => (g2.chance(0.6)
                ? t('You edge along the dome on your knees. The magpie lets you get within arm’s reach, drops the lens into your hand, and flies off cackling. The professor is so pleased that he pays you. {got}', { got: g2.give({ glimmer: 3 }) })
                : t('You edge along the dome, slip, and slide down it onto your own balloon, which rips. The magpie, pleased with itself, drops the lens on your head. {hurt}', { hurt: g2.hurt(1) })),
            },
            {
              label: t('offer it something shiny'), note: '−1 🪙 → +2 🍞', disabled: (g2) => g2.run.glimmer < 1,
              act: (g2) => t('You hold up a coin. The magpie looks at the coin, then at the lens, and swaps, fair and square. The professor is so relieved that he gives you the supper he forgot to eat. {got}', { got: g2.give({ glimmer: -1, food: 2 }) }),
            },
            {
              label: t('wait for it to get bored'), note: t('an hour passes'),
              act: (g2) => t('You sit on the step and wait. In the end the magpie gets bored, drops the lens in the gutter, and goes off to steal someone else’s spoon. {hours}', { hours: g2.hours(1) }),
            },
          ],
        }),
      },
      {
        ask: t('look through the mended telescope'),
        tell: (g) => ({
          title: t('the flat stone'),
          text: g.found
            ? t('The lens has come back from the magpie polished to a shine, the way magpies like things. The professor fits it in, turns the telescope to the Edge, and stands aside for you. There’s the flat stone where Wa waited, empty now. “I heard she came home,” says the professor. “I still look every night, though. Habit.”')
            : t('The lens has come back from the magpie polished to a shine, the way magpies like things, and for the first time in years there’s no thumbprint on it. The professor fits it in, turns the telescope to the Edge, and stands aside for you. Where the lantern used to shine there’s a flat stone, and on it sits someone no bigger than your fingernail, chin in her hands, looking back down the sky towards you. You let the professor look. Then he has to sit down. “Seventeen years,” he says, “looking through my own thumbprint.”'),
          options: g.found ? [
            { label: t('ask what he looks for now'), act: (g2) => t('“The next light,” says the professor. “Wa got there, and so did you. Somebody else will.” He tips his tea money into your hand. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('invite him to tea with Wa'), act: (g2) => t('The professor drops his pencil. “Oh, I couldn’t. I’d only talk about clouds. Tell her the man with the telescope says hello. She’ll remember. I was nearly always right about the weather.” He fills your burner from his own lamp. {got}', { got: g2.give({ fuel: 3 }) }) },
          ] : [
            { label: t('tell him she’s your grandmother'), act: (g2) => t('“She’s my grandmother,” you say. The professor takes off his spectacles and polishes them on his tie. “Then you’d better hurry,” he says. “She looks cold.” He fills your burner from his own lamp. {got}', { got: g2.give({ fuel: 3 }) }) },
            { label: t('ask him to keep watching'), act: (g2) => t('“Every night,” says the professor, “until you get there.” He opens a new notebook, and on the first page, for the first time since the light went out, he writes two different words: found her. Then he tips his tea money into your hand, to buy fuel with. {got}', { got: g2.give({ glimmer: 3 }) }) },
          ],
        }),
      },
    ],
  },

  teahouse: {
    icon: '🫖', name: t('Auntie Plum of the teahouse'),
    perk: t('From now on, a teahouse’s dumplings are free.'),
    chapters: [
      {
        ask: t('ask what’s in the pot'),
        tell: () => ({
          title: t('memory tea'),
          text: t('Auntie Plum, who keeps the teahouse, pours you a cup without asking. “Memory tea,” she says. “It tastes of whatever you miss most.” You sip it. It tastes of Sunday mornings in Wa’s kitchen: pancakes, burnt at the edges, with far too much syrup.'),
          options: [
            { label: t('ask for another cup'), act: (g) => t('“One cup of this a visit,” says Auntie Plum. “Any more and you start missing things that never happened.” She gives you a bag of dumplings instead. {got}', { got: g.give({ food: 3 }) }) },
            { label: t('tell her what it tasted of'), act: (g) => t('“Pancakes,” says Auntie Plum. “Wa’s tasted of pancakes too. She drank it right where you’re sitting, and cried into the cup.” She puts some buns in your bag. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help Auntie Plum pick tea on the high slope'),
        tell: () => ({
          title: t('the high slope'),
          text: t('Auntie Plum’s best tea grows on the high slope, up in the cloud, and her knees won’t take her up there any more. “Just the tips,” she says, and hands you a basket. “Two leaves and a bud. And mind the drop.”'),
          options: [
            {
              label: t('climb to the very top'), note: t('a gamble: a full basket (+4 🪙), or a slip that costs an hour'),
              act: (g) => (g.chance(0.6)
                ? t('Up in the cloud the bushes are wet with dew, and the leaves smell of rain. You come down with a full basket, and Auntie Plum pays you for every leaf. {got}', { got: g.give({ glimmer: 4 }) })
                : t('Up in the cloud the slope is slick. You slip, roll into a tea bush, and take a good while to get out of it. Auntie Plum picks the leaves out of your hair and says they’ll do. {hours}', { hours: g.hours(1) })),
            },
            { label: t('pick the lower bushes'), act: (g) => t('The lower bushes are easy, and dull. Auntie Plum pays you in dumplings, and lets you eat the first one while it’s hot. {got}', { got: g.give({ food: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('visit Auntie Plum again'),
        tell: (g) => ({
          title: t('a pot for Wa'),
          text: g.found
            ? t('Auntie Plum has wrapped a twist of tea in paper and tied it with string. “From the high slope,” she says. “I hear Wa’s home. She always said nobody made tea like mine. Put the kettle on when you get back, and tell her I’ll be round.”')
            : t('Auntie Plum has wrapped a twist of tea in paper and tied it with string. “From the high slope,” she says. “Wa always said nobody made tea like mine, but the last time she came, she wouldn’t even stay for a second pot. When you bring her home, put the kettle on.”'),
          options: [
            { label: t('promise to put the kettle on'), act: (g2) => t('“Not boiling,” says Auntie Plum. “She always boiled it to death.” She tucks a few coins in with the tea. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('ask for a twist for yourself'), act: (g2) => t('She laughs and wraps you one of your own, with a box of dumplings to go with it. “Save it for when you’re home,” she says. “Then it’ll taste of all this.” {got}', { got: g2.give({ food: 3 }) }) },
          ],
        }),
      },
    ],
  },

  post: {
    icon: '📮', name: t('the postmistress'),
    perk: t('From now on, a parcel at the post office holds 7 food, fuel or coins, not 5.'),
    chapters: [
      {
        ask: t('ask about the sack marked “no such address”'),
        tell: () => ({
          title: t('no such address'),
          text: t('Behind the counter sits a sack of letters that could never be delivered, some of them older than you. “Letters to people who moved away, or flew off,” says the postmistress. “I can’t throw them out. They’re not mine to throw.” She peers at you over the counter. “And who are you to Wa, then?”'),
          options: [
            { label: t('“I’m her grandchild.”'), act: (g) => t('The postmistress puts down her stamp. “Then there’s a bundle in that sack for her, tied up with red string,” she says. “And I can’t give it to you. Post is for the person whose name is on it.” She makes you a cup of tea and finds you a biscuit instead, which isn’t the same thing at all. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('ask who still writes to the sky'), act: (g) => t('“More people than you’d think,” says the postmistress. “Mostly to people who aren’t coming back. They write anyway.” She sorts through the sack until she comes to a fat bundle tied up with red string, and puts it back without a word. Then she pays you to help sort the rest. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('ask about the bundle tied with red string'),
        tell: (g) => ({
          title: t('the bundle'),
          text: g.found
            ? t('The postmistress slips off the string, just long enough for you to look. There are twenty letters, all addressed to “Wa, somewhere in the sky”, and the handwriting on every one of them is your mother’s. The first was posted the week Wa left. The last came the spring before Wa came home.')
            : t('The postmistress slips off the string, just long enough for you to look. There are twenty letters, all addressed to “Wa, somewhere in the sky”, and the handwriting on every one of them is your mother’s. The first was posted the week Wa left. The newest came this spring.'),
          options: [
            { label: t('ask to carry them to Wa'), act: (g2) => t('“Against the rules,” says the postmistress. “Post goes by post.” But she doesn’t put the bundle back in the sack. She puts it on the shelf behind her, where she can see it, and hands you a parcel from home instead. {got}', { got: g2.give({ food: 3 }) }) },
            {
              label: t('ask if your mother knows they never arrived'),
              act: (g2) => `${g2.found ? t('“She knew they hadn’t got there yet,” says the postmistress. “Every spring another one came up from Harbour, with a note on the back: have the others arrived? And every spring I wrote back: not yet.”')
                : t('“She knows they haven’t got there yet,” says the postmistress. “Every spring another one comes up from Harbour, with a note on the back: have the others arrived? And every spring I write back: not yet.”')} ${t('She cuts you a slice of cake, because you look as though you need it. {got}', { got: g2.give({ food: 2 }) })}`,
            },
          ],
        }),
      },
      {
        ask: t('visit the postmistress again'),
        tell: (g) => ({
          title: t('special delivery'),
          text: g.found
            ? t('The bundle is waiting on the counter. “Wa’s home, I hear,” says the postmistress, “and you’re going that way. Rules are rules, and post goes by post, so for this one delivery, you are the post.” She stamps the bundle SPECIAL DELIVERY. “Take them home with you. Into her hands, mind. Not left on the step.”')
            : t('The bundle is waiting on the counter, beside a postman’s cap far too big for you. “I’ve thought about it,” says the postmistress. “Rules are rules, and post goes by post. So for this one delivery, you are the post.” She holds out the cap and stamps the bundle SPECIAL DELIVERY. “Wa, somewhere in the sky. Don’t lose them.”'),
          options: g.found ? [
            { label: t('tuck them into Wa’s book'), act: (g2) => t('“Twenty letters,” says the postmistress. “I hope she’s got her reading glasses.” {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('ask what’s in them'), act: (g2) => t('“Not mine to read,” says the postmistress. “Nor yours.” But she smiles, which she doesn’t do often. {got}', { got: g2.give({ fuel: 2 }) }) },
          ] : [
            { label: t('put on the cap'), act: (g2) => t('It falls over your eyes. The postmistress folds two envelopes into the band and declares it a perfect fit. You tuck the bundle into Wa’s book, where it will be safe. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('promise to deliver them by hand'), act: (g2) => t('“Into her hands,” says the postmistress. “Not left on a step.” You shake on it, and tuck the bundle into Wa’s book, where it will be safe. {got}', { got: g2.give({ fuel: 2 }) }) },
          ],
        }),
      },
    ],
  },

  workshop: {
    icon: '🧵', name: t('Granny Gusset the balloon-maker'),
    perk: t('From now on, a balloon workshop patches two hearts for 2 coins, not 4.'),
    chapters: [
      {
        ask: t('show the balloon-maker your balloon'),
        tell: () => ({
          title: t('the balloon-maker'),
          text: t('The old woman in the shed spits a mouthful of pins into her hand and walks round your balloon twice. “I’m Granny Gusset,” she says. “I made this balloon for Wa, forty years ago. And look at those patches. Who taught her to sew like that? Not me.”'),
          options: [
            { label: t('ask her to look it over'), act: (g) => t('She tuts her way round the balloon again, and redoes three of Wa’s patches while you watch. {got}', { got: g.give({ hull: 1 }) }) },
            { label: t('tell her Wa called her the best in the sky'), act: (g) => t('“Did she, now.” Granny Gusset sniffs, and goes pink to the ears. “Well. She’s not wrong.” She sends you off with a pocketful of spare buttons, three of which turn out to be coins. {got}', { got: g.give({ glimmer: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('ask Granny Gusset about her first balloon'),
        tell: () => ({
          title: t('the first balloon'),
          text: t('Granny Gusset made her first balloon out of her wedding dress, sixty years ago, and flew it off the roof of this shed. “Everyone said it couldn’t be done,” she says, “so I sewed a word into the crown, right at the top, for luck. I’ve sewn one into every balloon since. A balloon flies better when it knows what it’s for.”'),
          options: [
            { label: t('ask what word was in the first one'), act: (g) => t('“Up,” she says. “I was nineteen. I didn’t know any better.” She laughs until the pins rattle in their tin. {got}', { got: g.give({ fuel: 2 }) }) },
            { label: t('ask what word is in yours'), act: (g) => t('“Wa chose it herself, and made me promise not to tell,” says Granny Gusset. “You could look, but you’d have to get the balloon down first.” {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help Granny Gusset look inside the crown'),
        tell: (g) => ({
          title: t('the word in the crown'),
          text: g.found
            ? t('Granny Gusset lets the balloon down onto the grass, crawls inside with a lamp, and calls you in after her. Right at the top, where all the panels meet, is the word Wa chose forty years ago, in small, careful stitches: SUNDAY. “She always said she’d be back by Sunday,” says Granny Gusset. “Took her twenty years, but she managed it.”')
            : t('Granny Gusset lets the balloon down onto the grass, crawls inside with a lamp, and calls you in after her. Right at the top, where all the panels meet, is the word Wa chose forty years ago, in small, careful stitches: SUNDAY. “She always said she’d be back by Sunday,” says Granny Gusset. “And near enough every time, she was. All but the once.”'),
          options: [
            { label: t('stitch a word of your own beside it'), act: (g2) => [t('You stitch a word of your own next to Wa’s, crooked, in red thread. Granny Gusset says it’s the worst stitching she’s seen in sixty years, and doesn’t unpick it. {got}', { got: g2.give({ hull: 1 }) }), g2.learn('sunday')].filter(Boolean).join(' ') },
            { label: t('leave it as it is'), act: (g2) => [t('“Good,” says Granny Gusset. “It’s her balloon. You’re only borrowing it.” She won’t take a coin for her trouble, and gives you a few instead, to pay for the next patch. {got}', { got: g2.give({ glimmer: 3 }) }), g2.learn('sunday')].filter(Boolean).join(' ') },
          ],
        }),
      },
    ],
  },

  bandstand: {
    icon: '🎺', name: t('the bandmaster'),
    perk: t('From now on, the band plays louder for you: the Hush falls back 9 miles, not 6.'),
    chapters: [
      {
        ask: t('ask the band for a waltz'),
        tell: () => ({
          title: t('the unfinished waltz'),
          text: t('The band plays you a waltz, a good one, and just before the end they all stop at once, instruments in the air. In the quiet afterwards, somebody in the audience coughs. “Every time,” says the bandmaster, mopping his brow. “The Hush came by one summer and took the last eight bars. We’ve stopped there ever since.”'),
          options: [
            { label: t('clap anyway'), act: (g) => t('You clap. The tuba player bows so low that his hat falls into his tuba, and the band shares its picnic with you. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('ask what the waltz is called'), act: (g) => t('“The Low Sky Waltz,” says the bandmaster. “Everybody used to know it.” He hums the start, and you find you know it too. You just can’t think where from. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help the band find the ending'),
        tell: () => ({
          title: t('the missing bars'),
          text: t('The bandmaster has spread every sheet of music he owns across the stage. The last page of the waltz is there, but the notes have faded to nothing, like a letter left out in the rain. “The Hush doesn’t tear things up,” he says. “It just takes the sound out of them.”'),
          options: [
            { label: t('hum what comes next'), act: (g) => t('You hum the start and keep going, past the place where the band always stops, and the rest comes back to you: Wa used to waltz you round her kitchen to it, with your feet on top of hers. The bandmaster writes it down as fast as he can. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('wake the oldest bandsman'), act: (g) => t('The oldest bandsman is asleep on the bass drum. When you wake him he hums three notes, says “that’s all I’ve got”, and goes back to sleep. Three notes is a start. The bandmaster gives you his sandwiches for your trouble. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('hear the waltz played to the end'),
        tell: () => ({
          title: t('the last eight bars'),
          text: t('The band has pieced the ending together and practised it for days. They play the Low Sky Waltz from the start, and this time, when they come to the place where they always stop, they don’t. The last eight bars ring out over the island, and the bandmaster cries into his moustache.'),
          options: [
            { label: t('dance'), act: (g) => [t('You dance, badly, and so does the bandmaster. {got}', { got: g.give({ glimmer: 2 }) }), g.hushBack(8)].filter(Boolean).join(' ') },
            { label: t('ask them to play it again'), act: (g) => t('They play it again, louder, then a third time, louder still. By the fourth, half the island has come to listen and is throwing coins into the tuba. The tuba player gives you half. {got}', { got: g.give({ glimmer: 4 }) }) },
          ],
        }),
      },
    ],
  },

  inn: {
    icon: '🍺', name: t('Mrs Hobb of the inn'),
    perk: t('From now on, a room at the inn costs nothing.'),
    chapters: [
      {
        ask: t('ask the innkeeper about Wa’s room'),
        tell: () => ({
          title: t('the room at the top of the stairs'),
          text: t('The innkeeper, Mrs Hobb, takes you up four flights of creaking stairs. Wa’s room is just as she left it: a coat on the hook, a cup on the sill, and the guest book open on the bed at her last entry: Back by Sunday. W.'),
          options: [
            { label: t('read the older entries'), act: (g) => t('Every visit, the same three words: Back by Sunday. Mrs Hobb brings you a bowl of soup and says nothing at all, which is kind of her. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('try on the coat'), act: (g) => t('It’s far too big, and it smells of burner smoke and peppermints. You hang it back up. Mrs Hobb pretends not to see you wipe your eyes, and presses two coins into your hand for the road. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help Mrs Hobb at the inn'),
        tell: () => ({
          title: t('a full house'),
          text: t('Every table at the inn is full, and Mrs Hobb is three pairs of hands short. “Wa used to help when it got like this,” she says, handing you an apron. “She was terrible at it.”'),
          options: [
            { label: t('carry the soup'), act: (g) => t('You carry soup to every table and drop only one bowl. The regulars cheer anyway, and tip you. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('sing for the room'), act: (g) => t('You sing the only song you know all the words to. Halfway through, the whole inn joins in. Mrs Hobb feeds you for free. {got}', { got: g.give({ glimmer: 1, food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('sign the inn’s guest book'),
        tell: (g) => ({
          title: t('the guest book'),
          text: g.found
            ? t('Mrs Hobb opens Wa’s guest book at a clean page. Under Back by Sunday, in fresh ink, Wa has written: Back. Sorry it took so long. W. “She came in last week,” says Mrs Hobb, “and cried all over my clean floor.”')
            : t('Mrs Hobb brings down Wa’s guest book and opens it at the clean page under her last entry. “Your turn,” she says. “Write something she’ll read when she comes back.”'),
          options: g.found ? [
            { label: t('write your name under hers'), act: (g2) => t('You sign under Wa’s name. Mrs Hobb says the room at the top of the stairs is yours now too, whenever you want it, for nothing. {got}', { got: g2.give({ glimmer: 2 }) }) },
            { label: t('ask what else Wa said'), act: (g2) => t('“That she’d said sorry to your mother on the quay, and it was easier than she’d spent twenty years thinking.” Mrs Hobb pours you a cup of tea. “The room’s yours whenever you like. Free.” {got}', { got: g2.give({ food: 2 }) }) },
          ] : [
            { label: t('write ‘Coming to get you’'), act: (g2) => t('You write it in your best handwriting, and Mrs Hobb blots it for you. “The room’s yours whenever you want it,” she says. “Free. Wa would have my head otherwise.” {got}', { got: g2.give({ glimmer: 2 }) }) },
            { label: t('write ‘Back by Sunday’'), act: (g2) => t('You write the same three words Wa always did. Mrs Hobb laughs until she has to sit down. “The room’s yours whenever you want it. Free.” {got}', { got: g2.give({ food: 2 }) }) },
          ],
        }),
      },
    ],
  },

  fortune: {
    icon: '🔮', name: t('Madame Vell'),
    perk: t('From now on, changing your luck costs 3 coins, not 5.'),
    chapters: [
      {
        ask: t('let Madame Vell read your palm'),
        tell: () => ({
          title: t('your palm'),
          text: t('Madame Vell takes your hand and studies it for a long time. “A long road,” she says, “and a short word at the end of it. Nearly the shortest word there is.”'),
          options: [
            { label: t('ask what word'), act: (g) => t('“If I told you, you wouldn’t need to go,” she says. She charges you nothing, which she says is very unusual, and gives you change anyway. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ask about Wa'), act: (g) => t('“Wa sat right there,” she says, “and asked me the same thing every time: would she and your mother ever speak again. I always told her the truth: only if somebody starts.” She gives you her spare lamp oil. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('ask Madame Vell about her cards'),
        tell: () => ({
          title: t('the cards'),
          text: t('Madame Vell lays out three cards: a balloon, a door, and a card that’s blank on both sides. “I’ve drawn that blank one for every traveller for forty years,” she says. “Here’s a secret: I can’t see the future at all. I just listen very carefully.”'),
          options: [
            { label: t('ask what the blank card means'), act: (g) => t('“It means you haven’t decided yet,” she says. “It’s the only honest card in the pack.” {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('promise to keep her secret'), act: (g) => t('She winks. “Then here’s something true: you’ll find her. Not because I see it. Because you’re the sort who keeps going.” She fills your burner from her lamp. {got}', { got: g.give({ fuel: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('let Madame Vell tell your fortune properly'),
        tell: (g) => ({
          title: t('a proper fortune'),
          text: g.found
            ? t('This time the blank card has a drawing on it, in a shaky hand: a little balloon on the quay at Harbour, and two people waving. “Wa came by,” says Madame Vell. “She said to tell you she owes you a cup of tea.”')
            : t('This time Madame Vell turns over the blank card, and someone has drawn on it in a shaky hand: a little balloon, going home. “Wa drew that, the last time she came,” she says. “She said if her grandchild ever turned up, I should give it to them.”'),
          options: [
            { label: t('keep the card'), act: (g2) => t('You tuck it into Wa’s book. Madame Vell says changing your luck will cost you less from now on: family rates. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('leave it for the next traveller'), act: (g2) => t('“Good,” she says. “Someone else will need a blank card.” Changing your luck will cost you less from now on, she says: family rates. {got}', { got: g2.give({ food: 2 }) }) },
          ],
        }),
      },
    ],
  },

  shipwright: {
    icon: '🪚', name: t('Bosun Tarrant'),
    perk: t('From now on, a bigger burner costs 5 coins, not 8.'),
    chapters: [
      {
        ask: t('ask Bosun Tarrant about the basket'),
        tell: () => ({
          title: t('the bottom of the basket'),
          text: t('Bosun Tarrant tips the basket over and shows you its bottom. Carved into the wicker, small and neat: W. Under it, newer and messier, a lopsided heart and the letter M. “Your mother carved that,” he says. “She was six. Wa never let me sand it off.”'),
          options: [
            { label: t('trace the letters'), act: (g) => t('The heart is very lopsided. Your mother never could draw. The Bosun gives you a tin of tar for the seams, which also burns. {got}', { got: g.give({ fuel: 2 }) }) },
            { label: t('ask him to leave it'), act: (g) => t('“Wasn’t going to touch it,” he says gruffly, and patches a seam for nothing. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('help Bosun Tarrant in the yard'),
        tell: () => ({
          title: t('the new rail'),
          text: t('The Bosun is fitting a new rail to a basket and needs someone to hold the other end. “Wa held that end once,” he says. “Talked the whole time. About your mother, mostly. How she’d never say sorry first.”'),
          options: [
            { label: t('ask what else Wa said'), act: (g) => t('“That she was just as bad,” he says. “Worse. Hold it steady, now.” He pays you in offcuts for the burner. {got}', { got: g.give({ fuel: 3 }) }) },
            { label: t('hold it steady and say nothing'), act: (g) => t('You hold it steady. When it’s done, he shakes your hand as if you were one of his crew, and pays you like one. {got}', { got: g.give({ glimmer: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('see what Bosun Tarrant has made'),
        tell: () => ({
          title: t('your mark'),
          text: t('The Bosun hands you a carving knife and points to the bottom of Wa’s basket, beside the W and the lopsided heart. “Room for one more,” he says.'),
          options: [
            { label: t('carve your initial'), act: (g) => t('You carve it slowly, next to theirs: three of you in the bottom of one basket. The Bosun says bigger burners are cheaper for family from now on. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('carve a balloon'), act: (g) => t('You carve a little balloon with three people in it. The Bosun clears his throat a great deal, and says bigger burners are cheaper for family from now on. {got}', { got: g.give({ fuel: 3 }) }) },
          ],
        }),
      },
    ],
  },

  bathhouse: {
    icon: '♨️', name: t('the bath-keeper'),
    perk: t('From now on, a long soak at the bathhouse mends three hearts, not two.'),
    chapters: [
      {
        ask: t('ask the bath-keeper about Wa'),
        tell: () => ({
          title: t('the red scarf'),
          text: t('The bath-keeper fetches a scarf from a hook behind the door: red wool, darned in a dozen places. “Wa left it here to dry,” she says, “and never came back for it. I’ve kept it warm.”'),
          options: [
            { label: t('wrap it round your neck'), act: (g) => t('It still smells of the hot pool, and you feel warmer at once. {got}', { got: g.give({ hull: 1 }) }) },
            { label: t('ask her to keep it for Wa'), act: (g) => t('“I will,” she says, and hangs it back on its hook, very carefully. She gives you a bun from the boiler room, for the road. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help the bath-keeper with the boilers'),
        tell: () => ({
          title: t('the sulking boiler'),
          text: t('The boilers that heat the pool are old and temperamental, and one of them is sulking. “Wa could always get it going,” says the bath-keeper. “She’d sing at it.”'),
          options: [
            { label: t('sing at the boiler'), act: (g) => t('You sing at it. It coughs, rattles, and roars into life. The bath-keeper laughs so hard she has to sit down, and pays you for the concert. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('kick the boiler'), act: (g) => t('You kick it, and it roars into life. “That works too,” says the bath-keeper, and fills your burner from the coal heap. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('sit in the hot pool with the bath-keeper'),
        tell: (g) => ({
          title: t('the hot pool'),
          text: g.found
            ? t('You sit in the hot pool while the steam rises. “Wa came by,” says the bath-keeper. “Took her scarf. Said she’d finally said it, and it was easier than the hot pool.” She laughs. “Nothing’s easier than the hot pool.”')
            : t('You sit in the hot pool with the bath-keeper while the steam rises. “Wa sat just there, the last time,” she says. “She asked me how you say sorry to someone after twenty years. I said: the same as after a day. You just say it.”'),
          options: [
            { label: t('stay until your fingers wrinkle'), act: (g2) => t('You stay until you’re as wrinkled as a walnut. The bath-keeper says her soaks will do you more good from now on. {got}', { got: g2.give({ hull: 1 }) }) },
            { label: t('ask how she knew'), act: (g2) => t('“Everybody says it in here in the end,” she says. “It’s the steam.” Her soaks will do you more good from now on, she says. {got}', { got: g2.give({ glimmer: 2 }) }) },
          ],
        }),
      },
    ],
  },

  clocktower: {
    icon: '🕰️', name: t('Master Pendle the clockmaker'),
    perk: t('From now on, setting the great clock also gives you an extra hour on the island it takes you to.'),
    chapters: [
      {
        ask: t('ask Master Pendle why the clock runs slow'),
        tell: () => ({
          title: t('the slow clock'),
          text: t('Master Pendle takes you up inside the clock, among the turning gears. “It’s lost a minute a day for twenty years,” he says, “ever since the morning Wa flew off. Some things run slow when someone’s missing.”'),
          options: [
            { label: t('ask if it can be mended'), act: (g) => t('“Everything can be mended,” he says, “if you’re stubborn enough.” He gives you a tin of clock oil, which also burns nicely. {got}', { got: g.give({ fuel: 2 }) }) },
            { label: t('listen to it tick'), act: (g) => t('You listen to it tick for a long while. It sounds like someone waiting. He pays you a little for keeping him company. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help Master Pendle inside the clock'),
        tell: () => ({
          title: t('the missing tooth'),
          text: t('One gear in the great clock has a tooth missing, and it catches on every turn. “I need the same brass,” says Master Pendle, “and the only brass like it is in Wa’s old watch. And Wa has the watch.”'),
          options: [
            { label: t('offer him a coin instead'), act: (g) => t('He files your coin into a tooth and fits it, and the clock catches a little less. “Good enough until she’s back,” he says, and fills your burner from his oil can. {got}', { got: g.give({ glimmer: -1, fuel: 3 }) }) },
            { label: t('promise to bring the watch'), act: (g) => t('“If you find her,” he says, “tell her the clock is waiting too.” {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit Master Pendle again'),
        tell: (g) => ({
          title: t('right on time'),
          text: g.found
            ? t('The great clock runs true. A brass tooth from Wa’s old watch is fitted in the gear, and Master Pendle is beaming. “She came by with it,” he says. “Stood right here and said sorry to my clock. Then she said sorry to me, for good measure.”')
            : t('Master Pendle has made a new tooth himself, and the great clock runs true for the first time in twenty years. “I got tired of waiting,” he says. “Sometimes you just have to mend a thing yourself.”'),
          options: [
            { label: t('set your watch by it'), act: (g2) => t('You haven’t got a watch, so he gives you one. It runs fast. “Better fast than slow,” he says. From now on, setting the great clock buys you an extra hour where you land. {got}', { got: g2.give({ glimmer: 2 }) }) },
            { label: t('ring the bell'), act: (g2) => t('You pull the rope, and the bell rings out over the whole island. Master Pendle says the clock will give you an extra hour from now on, whenever you set it. {got}', { got: g2.give({ fuel: 2 }) }) },
          ],
        }),
      },
    ],
  },
};
