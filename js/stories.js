// Stories at the buildings, for voyages (voyage.js). Every kind of building
// has someone with a story in three chapters; each visit to that kind of
// building can tell the next one, with a choice, and the story carries on
// across voyages (it's kept in Wa's book). Finishing one makes a friend for
// good: `perk` says what that building does for you from then on (voyage.js
// applies it). Several stories cross: the town crier has news for the miller,
// whose son is the lighthouse keeper's apprentice; the word library keeps the
// jar Wa took; and all of them circle what Wa's pages say the Hush is made of.
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
            { label: t('“From Wa. I’m her grandchild.”'), act: (g) => t('He puts the spoon down very carefully. “Then you’re Sparrow.” He doesn’t say anything else, but you get the biggest bowl. {got}', { got: g.give({ food: 2 }) }) },
            { label: t('“From my grandmother.”'), act: (g) => t('“Your grandmother had good taste in songs,” he says, and won’t look at you. You get the biggest bowl. {got}', { got: g.give({ food: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('ask the hermit about Wa'),
        tell: (g) => ({
          title: t('the hermit’s confession'),
          text: t('Tonight the hermit is ready to talk. “My name’s Tobias. I was Wa’s co-pilot, eleven years. When the Hush came through the Cloud Wall, I got scared and turned back. I left her up there, {name}. I never even said I was sorry.”', { name: g.name }),
          options: [
            { label: t('tell him she’d forgive him'), act: (g2) => t('He laughs, and it turns into something else halfway. “She would, wouldn’t she. That’s the worst of it.” He presses a jar of honey into your hands. {got}', { got: g2.give({ food: 3 }) }) },
            { label: t('tell him to say it to her himself'), act: (g2) => t('“To her face?” He goes quiet for a long time. “If you find her, tell her Tobias is still waiting to say it.” He patches a tear in your balloon while he thinks. {got}', { got: g2.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('visit Tobias again'),
        tell: () => ({
          title: t('the empty chair'),
          text: t('Tobias has set two places at his table. “For when she comes home,” he says. He has been practising what he’ll say to her; you can hear it in how he breathes. Before you go, he takes a pair of old flying goggles out of a drawer. “These were hers. She lent them to me and I never gave them back.”'),
          options: [
            { label: t('take the goggles'), act: (g) => t('You put them on. They smell of Wa’s hat. {got}', { got: g.give({ glimmer: 4 }) }) },
            { label: t('tell him to give them back himself'), act: (g) => t('“In person,” Tobias says, and very nearly smiles. “Fair enough.” {got}', { got: g.give({ hull: 1 }) }) },
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
          text: t('In the middle of the square stands a town crier with a big brass bell and no voice at all. He writes on a slate: THE HUSH TOOK IT. LAST WINTER. He rubs it out and writes again: I HAD NEWS FOR SOMEONE. NOW I CAN’T SAY IT.'),
          options: [
            { label: t('offer to shout his news for him'), act: (g) => t('He chalks it up: THE MILLER’S SON IS ALIVE. Then he rubs it out fast, as if someone might overhear. You shout it across the square anyway. Somewhere, a window bangs open. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('ask who the news is for'), act: (g) => t('He writes: THE MILLER. HER SON IS ALIVE. Then, smaller: I WAS TOO SCARED TO TELL HER. NOW I CAN’T. {got}', { got: g.give({ glimmer: 2 }) }) },
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
          text: t('The crier rings his bell and reads out the news of the sky, and today the news is you. “HEAR YE! {name}, GRANDCHILD OF WA, FLIES FOR THE EDGE! GIVE THEM A FAIR PRICE!” Every stallholder in the square takes a step back.', { name: g.name.toUpperCase() }),
          options: [
            { label: t('take a bow'), act: (g2) => t('The square cheers. Somebody throws a cabbage, kindly. {got}', { got: g2.give({ food: 2 }) }) },
            { label: t('ring the bell yourself'), act: (g2) => t('You ring it once, very loudly. It’s the best thing you’ve done all week. {got}', { got: g2.give({ glimmer: 2 }) }) },
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
            { label: t('promise to look for him'), act: (g) => t('She stops kneading. “You’d do that?” She wraps you a loaf and two buns, and doesn’t look at you while she does it. {got}', { got: g.give({ food: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('ask about the letter on the windowsill'),
        tell: () => ({
          title: t('a letter from Rowan'),
          text: t('An unopened letter sits on the windowsill, addressed in a young man’s handwriting. “It came last month,” the miller says. “From Rowan. I can’t open it. What if it says he isn’t coming back?”'),
          options: [
            { label: t('read it to her'), act: (g) => t('It’s short. Rowan is a lighthouse keeper’s apprentice now, up in the High Winds. He’s sorry, and he misses her bread. The miller laughs and cries at the same time. {got}', { got: g.give({ food: 3 }) }) },
            { label: t('tell her to open it herself'), act: (g) => t('She opens it with floury, shaking fingers, reads it twice, and laughs out loud. “A lighthouse! The daft boy.” She doesn’t say what else it says. She doesn’t need to. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('carry the miller’s reply'),
        tell: () => ({
          title: t('a loaf for Rowan'),
          text: t('The miller has written back. It took her all week, she says, and most of a sack of flour in practice loaves. She hands you the letter and a loaf wrapped in a cloth. “If you pass a lighthouse in the High Winds…”'),
          options: [
            { label: t('promise to deliver it'), act: (g) => t('“Good,” she says. Then, gruffly: “Your grandmother was a menace. But she was right about some things.” {got}', { got: g.give({ food: 2 }) }) },
            { label: t('ask her to come along'), act: (g) => t('“In a basket? Me?” She laughs, but she looks at the sky for a long time. “Maybe next summer.” {got}', { got: g.give({ food: 2 }) }) },
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
            { label: t('tell her a joke'), act: (g) => t('You tell her the one about the cloud and the umbrella. Nothing. The jester winces for you. The queen gives you a coin for trying. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('pull a face'), act: (g) => t('You pull the face Wa used to pull at breakfast. The corner of the queen’s mouth twitches. “Again,” she orders, very quietly. {got}', { got: g.give({ glimmer: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('ask the queen about Wa'),
        tell: () => ({
          title: t('the queen remembers'),
          text: t('“Wa,” says the queen, and something in her face comes untied. “We were girls together, before I was a queen. She taught me to say no. Nobody had ever told me I could.” She looks at you sideways. “She talked about you, you know. Her Sparrow.”'),
          options: [
            { label: t('ask what Wa was like then'), act: (g) => t('“Loud,” says the queen. “Rude. Always right.” She very nearly smiles. {got}', { got: g.give({ glimmer: 3 }) }) },
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
    icon: '🗼', name: t('the keeper and his apprentice'),
    perk: t('From now on, every lighthouse keeper gives you two lanterns.'),
    chapters: [
      {
        ask: t('ask to see the keeper’s logbook'),
        tell: () => ({
          title: t('the keeper’s log'),
          text: t('The keeper writes down every balloon that passes. He turns back twenty years of pages for you, licking his thumb. There, in faded ink: Wa’s balloon, heading up. Underneath, in her handwriting: Back by Sunday. Tell Sparrow.'),
          options: [
            { label: t('ask what Wa told him'), act: (g) => t('“Not much,” says the keeper. “She bought two lanterns, asked which way the wind was going, and asked me to tell Sparrow she’d be back by Sunday.” He rubs his nose. “I never knew who Sparrow was.” {got}', { got: g.give({ lanterns: 1 }) }) },
            { label: t('write your name under hers'), act: (g) => t('He watches you write {name} under Wa’s line, then nods, as if something has been settled. {got}', { name: g.name, got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('help the keeper tonight'),
        tell: () => ({
          title: t('the lamp goes out'),
          text: t('A storm is coming and the great lamp is guttering. “My apprentice is up on the gallery,” the keeper shouts over the wind. “The lad never listens!” Up top, a young man in flying goggles is wrestling with a jammed shutter.'),
          options: [
            { label: t('climb up and help'), act: (g) => t('Together you wrench the shutter free, and the light swings out over the clouds. The young man grins and shakes your hand. “Rowan,” he says. “I’m going to be a sky-sailor.” {got}', { got: g.give({ lanterns: 1 }) }) },
            { label: t('hold the ladder'), act: (g) => t('You hold the ladder while the shutter bangs free. The young man climbs down soaked and grinning. “Rowan,” he says. “Next year I’m going to be a sky-sailor.” {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the keeper and Rowan'),
        tell: (g) => ({
          title: t('the apprentice'),
          text: g.arcDone('windmill')
            ? t('Rowan has packed a bag for the Low Sky. You hand him his mother’s letter and her loaf. He reads the letter twice, goes very red, and hugs you so hard your ribs creak. “I left without saying goodbye to her,” he says into your shoulder. “Nine years.”')
            : t('Rowan has packed a bag for the Low Sky, and the keeper is pretending not to mind. Rowan takes you aside. “I left home without saying goodbye to my mum,” he says. “Nine years ago. I keep meaning to write.”'),
          options: [
            { label: t('tell him to go home first'), act: (g2) => t('“Home first,” he says, trying it out. “Then the sky.” The keeper pretends not to be listening, and pretends not to be pleased. {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('lend him your lantern for the way'), note: '−1 🏮 → +5 🪙', disabled: (g2) => g2.run.lanterns < 1, act: (g2) => t('He hangs it on his pack. “For the way home,” he says. The keeper presses a purse into your hand when Rowan isn’t looking. {got}', { got: g2.give({ lanterns: -1, glimmer: 5 }) }) },
          ],
        }),
      },
    ],
  },

  campsite: {
    icon: '🏕️', name: t('Juniper, who wants to fly'),
    perk: t('From now on, travellers’ stories teach you three kinds of words, not two.'),
    chapters: [
      {
        ask: t('talk to the girl with paper wings'),
        tell: () => ({
          title: t('a girl with paper wings'),
          text: t('A girl of about ten is sitting by the fire, gluing paper wings onto her coat. “I’m Juniper,” she says. “I’m going to be a sky-sailor. How do you do it? Do you just say words?”'),
          options: [
            { label: t('show her'), act: (g) => t('You say “kite”, and nothing happens, because you’re standing on the ground. Juniper is not impressed. Then the fire pops, and a spark hangs in the air like a tiny island for a heartbeat. She stares at it. {got}', { got: g.give({ fuel: 1 }) }) },
            { label: t('tell her about Wa'), act: (g) => t('Juniper listens with her mouth open. “Twenty years?” she says at last. “Didn’t she get bored?” {got}', { got: g.give({ glimmer: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('see how Juniper is getting on'),
        tell: () => ({
          title: t('Juniper’s first word'),
          text: t('Juniper has been practising. She has a whole notebook of words, and every one is crossed out. “None of them work,” she says. “I need a better word.”'),
          options: [
            { label: t('give her one of yours'), act: (g) => t('You give her “{word}”. She says it very carefully, and an island the size of a pebble pops up beside the fire and floats there, glowing. Juniper screams. The whole camp comes running. {got}', { word: g.run.words[g.run.words.length - 1] ?? 'kite', got: g.give({ glimmer: 2 }) }) },
            { label: t('tell her to find her own'), act: (g) => t('She scowls, chews her pencil, and writes down a word she won’t show you. As you leave you hear a small pop behind you, and a cheer. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('say goodbye to Juniper'),
        tell: () => ({
          title: t('a new sky-sailor'),
          text: t('Juniper has a balloon. It’s made of bedsheets and it leans to the left, but it flies. “I’m going to find the Edge,” she announces. “After you. Not before. That would be rude.”'),
          options: [
            { label: t('give her a coin for luck'), note: '−1 🪙', act: (g) => t('She bites it to check it’s real, then tucks it in her boot. {got}', { got: g.give({ glimmer: -1 }) }) },
            { label: t('teach her to thank the sky'), act: (g) => t('She says thank you to the sky, very politely, and the wind ruffles her hair. {got}', { got: g.give({ fuel: 2 }) }) },
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
        ask: t('try a word on the carved door'),
        tell: () => ({
          title: t('the door opens'),
          text: t('You’ve worked it out: the door wants a word people forget to use. You try “please”. The door thinks about it, then swings open onto a long room of shelves, stacked with glass jars. Each jar holds a single word, glowing faintly.'),
          options: [
            { label: t('read the labels'), act: (g) => `${t('The labels are in a hundred different hands. Near the door is a jar labelled, in Wa’s writing: SORRY. It’s empty.')} ${g.teach(1)}` },
            { label: t('take a jar'), act: (g) => t('You take a jar labelled JAM, because you’re hungry. It’s just jam. {got}', { got: g.give({ food: 3 }) }) },
          ],
        }),
      },
      {
        ask: t('go back to the word library'),
        tell: () => ({
          title: t('the librarian'),
          text: t('This time someone is waiting for you: an old librarian with ink on her nose. “I keep the words people leave behind,” she says. “Wa left one here twenty years ago. Then she came back for it, and lost her nerve, and took the jar away without opening it.” She smiles. “Whatever it is, she still has it.”'),
          options: [
            { label: t('ask what the word was'), act: (g) => t('“That isn’t mine to say,” says the librarian. “That’s the whole point.” She stamps your hand with an inky star. {got}', { got: g.give({ glimmer: 3 }) }) },
            { label: t('leave a word of your own'), act: (g) => t('You write a word on a label and put it in an empty jar. The librarian doesn’t read it. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
    ],
  },

  stones: {
    icon: '🗿', name: t('the singing stones'),
    perk: t('From now on, standing stones also tell you what the next gate wants.'),
    chapters: [
      {
        ask: t('put your ear to the tallest stone'),
        tell: () => ({
          title: t('the humming stones'),
          text: t('The tallest stone is warm. Under the humming there are sounds, very far off, like a radio in another room. You catch one of them: a woman laughing. You’d know that laugh anywhere. It’s Wa’s.'),
          options: [
            { label: t('hum back'), act: (g) => t('The stones hum a little louder, as if they’re pleased. One of them gives off a puff of warm air that smells of toast. {got}', { got: g.give({ fuel: 2 }) }) },
            { label: t('say her name'), act: (g) => t('You say “Wa” into the stone. The humming stops. Then, very faintly, the laugh again. {got}', { got: g.give({ glimmer: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('listen to the stones again'),
        tell: () => ({
          title: t('a message in stone'),
          text: t('Tonight the stones are humming a whole sentence. It takes you an hour to piece it together: THE EDGE OPENS FOR WHAT YOU MEAN, NOT FOR WHAT YOU SAY.'),
          options: [
            { label: t('write it in Wa’s book'), act: (g) => t('You write it carefully under her last page. It looks as if it belongs there. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ask the stones what it means'), act: (g) => t('The stones go quiet. Stones are terrible at explaining things. {got}', { got: g.give({ fuel: 2 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the stones a last time'),
        tell: (g) => ({
          title: t('the stones’ gift'),
          text: t('When you arrive, the stones are already humming a name. Not Sparrow. The one you go by: {name}. They hum it round and round the ring until the grass shivers.', { name: g.name }),
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
          text: t('The monk who keeps the bell hasn’t spoken for twenty years. He took a vow of silence, he writes, to keep the peace. He looks tired. Behind the shrine the quiet hangs very thick.'),
          options: [
            { label: t('ask what peace he means'), act: (g) => t('He writes: MY BROTHER AND I QUARRELLED. I PROMISED NEVER TO SAY ANOTHER WORD ABOUT IT. He looks at the thick quiet behind the shrine, and so do you. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('ring the bell for him'), act: (g) => t('You ring the bell. For a moment the quiet behind the shrine thins, like mist when the sun comes out. The monk watches it, very still. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('tell the monk what the Hush is'),
        tell: () => ({
          title: t('what silence makes'),
          text: t('You tell him what Wa wrote: the Hush is made of words nobody said. The monk reads your face for a long time. Then he writes, very small: IS MINE OUT THERE TOO?'),
          options: [
            { label: t('tell him the truth'), act: (g) => t('“Probably,” you say. He nods slowly, as if you’d handed him something heavy he’d been looking for. {got}', { got: g.give({ glimmer: 2 }) }) },
            { label: t('tell him it’s not too late'), act: (g) => t('He writes NOT TOO LATE, looks at it, and underlines it twice. {got}', { got: g.give({ hull: 1 }) }) },
          ],
        }),
      },
      {
        ask: t('visit the monk again'),
        tell: () => ({
          title: t('the vow'),
          text: t('When you come in, the monk is standing by the bell, his hands shaking. He opens his mouth. Nothing. He tries again. “Brother,” he says, in a voice rusty from twenty years. “I’m sorry.” Somewhere far off, the quiet cracks like ice in spring.'),
          options: [
            { label: t('ring the bell for him'), act: (g) => t('You ring it, and this time the monk laughs out loud. {got}', { got: g.give({ hull: 1 }) }) },
            { label: t('sit with him a while'), act: (g) => t('You sit together on the step and say nothing at all, and it’s a different kind of nothing now. {got}', { got: g.give({ glimmer: 3 }) }) },
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
          text: t('“The Edge is where the sky’s first word was said,” the wizard says. “Up there, words are louder. Something you’ve never managed to say can be said at last.” She taps Wa’s book. “That’s why she went. Not to explore. To say something.”'),
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
            ? t('“Every sky-sailor has a sky name,” the wizard says. “Wa’s was Wa: the sound you make when the clouds open for the first time.” She looks at you for a long moment. “Yours is {name}. You picked it yourself. That’s the best kind.”', { name: g.name })
            : t('“Every sky-sailor has a sky name,” the wizard says. “Wa’s was Wa: the sound you make when the clouds open for the first time.” She looks at you for a long moment. “Yours is Sparrow. She gave it to you, and you kept it. That counts.”'),
          options: [
            { label: t('thank her'), act: (g2) => t('“Don’t thank me. Go and fly.” {got}', { got: g2.give({ glimmer: 3 }) }) },
            { label: t('ask what your name means'), act: (g2) => t('“Whatever you make it mean,” says the wizard. “Same as any word.” {got}', { got: g2.give({ fuel: 2 }) }) },
          ],
        }),
      },
    ],
  },
};
