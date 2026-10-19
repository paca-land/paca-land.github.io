import * as THREE from 'three';
import { t } from '../i18n.js';

// The sky ferry: a pier that runs off the edge of the island into the open sky,
// and a little boat under a balloon that tows sky-sailors across the gap for a
// few coins. Crane the ferryman has carried letters between two sisters for
// forty years without ever handing one over.

const TAU = Math.PI * 2;

function build(kit, ctx, place, lib) {
  const { box, cyl, cone, house, outward } = lib;
  // The pier runs straight out to sea (local +z turned to face outward).
  const ry = Math.atan2(outward[0], outward[1]);
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, ly, lz) => [lx * c + lz * s, ly, -lx * s + lz * c];
  const ground = (lx, lz) => {
    const [x, , z] = at(lx, 0, lz);
    return place.ground(x, z);
  };
  const deck = ground(0, 0.2) + 0.22;
  // The ferryman's hut, landward of the pier.
  const [hx, , hz] = at(-0.55, 0, -0.75);
  const hut = house(kit, ctx.r, [hx, place.ground(hx, hz), hz], ry, { w: 0.75, d: 0.6, h: 0.5, roof: 'roofBlue', walls: 'wood', chimney: true });
  // Planks, with posts that reach down to the ground where there is any, and struts where there isn't.
  for (let z = 0.1; z < 3.1; z += 0.17) kit.add('wood', box(0.62, 0.05, 0.14), at(0, deck, z), { ry });
  for (let z = 0.2; z < 3.1; z += 0.6) {
    for (const x of [-0.29, 0.29]) {
      const [px, , pz] = at(x, 0, z);
      const foot = Math.max(place.ground(px, pz), deck - 0.9);
      kit.add('darkWood', cyl(0.03, 0.035, deck + 0.45 - foot, 5), [px, foot, pz]);
    }
  }
  for (const x of [-0.29, 0.29]) kit.add('darkWood', box(0.04, 0.04, 3.0), at(x, deck + 0.42, 1.6), { ry });
  // A lamp at the end of the pier.
  kit.add('darkWood', cyl(0.025, 0.03, 0.75, 5), at(0.22, deck, 3.05));
  kit.add('lamp', box(0.1, 0.13, 0.1), at(0.22, deck + 0.75, 3.05), { ry });
  kit.add('roofSlate', cone(0.09, 0.08, 4), at(0.22, deck + 0.82, 3.05), { ry: ry + Math.PI / 4 });

  // The ferry: a little red boat under a striped balloon, tied up beside the pier's end.
  const boat = new lib.Kit(ctx.mats);
  boat.add('lacquer', new THREE.SphereGeometry(0.5, 10, 5, 0, TAU, Math.PI / 2, Math.PI / 2).scale(0.55, 0.5, 1.3), [0, 0.12, 0]);
  boat.add('wood', box(0.5, 0.04, 1.1), [0, 0.1, 0]);
  boat.add('darkWood', cyl(0.012, 0.012, 1.0, 4), [-0.18, 0.12, 0.45]);
  boat.add('darkWood', cyl(0.012, 0.012, 1.0, 4), [0.18, 0.12, -0.45]);
  boat.add('#f4ece0', new THREE.SphereGeometry(0.42, 12, 8).scale(1, 1.15, 1), [0, 1.55, 0]);
  boat.add('#c8382a', new THREE.SphereGeometry(0.425, 12, 8, 0, Math.PI / 3).scale(1, 1.15, 1), [0, 1.55, 0]);
  boat.add('#c8382a', new THREE.SphereGeometry(0.425, 12, 8, Math.PI, Math.PI / 3).scale(1, 1.15, 1), [0, 1.55, 0]);
  const ferry = boat.build();
  const [bx, , bz] = at(-0.62, 0, 2.6);
  ferry.position.set(bx, deck - 0.25, bz);
  ferry.rotation.y = ry;
  let phase = 0;
  return {
    radius: 1.6, door: [at(0, 0, -1)[0], at(0, 0, -1)[2]], extras: [ferry], smoke: [hut.chimney],
    lights: [at(0.22, deck + 0.8, 3.05), hut.window],
    pointLight: { at: at(0.22, deck + 0.9, 3.05), color: '#ffd28a', power: 4 },
    update(time, dt, env) {
      phase += dt * (0.9 + env.wind * 0.3);
      ferry.position.y = deck - 0.25 + Math.sin(phase) * 0.06;
      ferry.rotation.z = Math.sin(phase * 0.7) * 0.05;
    },
  };
}

export default {
  id: 'ferry',
  building: {
    find: { radius: 1.6, rn: [0.6, 0.86], slope: 0.32, wet: 1.0 },
    build,
    label: t('a sky ferry'),
    homes: [['jelly', 3], ['lotus', 2], ['whale', 2], ['coral', 2], ['birds', 1], ['wreck', 1]],
    word: {
      id: 'ferry', name: t('ferry words find sky ferries'),
      line: t('A pier runs off the edge of the island into the open sky, and a little boat under a balloon is tied up at the end.'),
      words: 'ferry ferries ferryman ferrymen ferryboat boatman boatmen gondola gondolas punt punts',
      roots: 'ferry boatman gondol',
    },
    note: t('The sky ferry will tow you across the gap for a few coins. Cheaper than burning the fuel.'),
    journal: ['⛴️', 'sky ferry', 'say something about ferries on a voyage'],
    event: (r, book, g, { first }, { friend }) => {
      const far = friend(book, 'ferry') ? 6 : 4;
      return {
        title: t('the sky ferry'),
        text: first ? t('“Wa’s balloon!” The ferryman shades his eyes. “She used to race my ferry across the gap, and lose. I’m Crane. Going far?”')
          : r.pick([t('The little sky ferry knocks against the end of the pier, and its balloon tugs at the rope.'), t('Crane the ferryman is coiling rope on the pier and whistling.')]),
        options: [
          { label: t('take the ferry across'), pay: 4, once: 'ferry', icon: '⛴️', hint: far === 6 ? t('it tows the balloon 6 miles on') : t('it tows the balloon 4 miles on'), act: (g2) => t('The ferry tows the balloon across the gap. {miles}', { miles: g2.leagues(far) }) },
          { label: t('help with the mooring ropes'), gain: { fuel: 1, glimmer: 2 } },
        ],
      };
    },
    arc: {
      icon: '⛴️', name: t('Crane the ferryman'),
      perk: t('From now on, the ferry tows you 6 miles, not 4.'),
      chapters: [
        {
          ask: t('ask Crane about the letters in his hatband'),
          tell: () => ({
            title: t('the undelivered letters'),
            text: t('Crane keeps a bundle of letters tucked in his hatband, tied with string. “From two sisters,” he says. “Hester on this island and Maud on the next. Every week each gives me a letter for the other, and every week each makes me promise not to hand it over. Forty years, that’s been going on.”'),
            options: [
              { label: t('ask what they fell out over'), act: (g) => t('“A teapot,” says Crane. “Or a wedding, or a boat. Neither of them remembers any more. They only remember not speaking.” He shares his lunch with you. {got}', { got: g.give({ food: 2 }) }) },
              { label: t('ask why he keeps them'), act: (g) => t('“Because one day one of them will say, deliver it,” he says, “and I want to be ready.” He tops up your burner from his own. {got}', { got: g.give({ fuel: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('offer to carry a letter for Crane'),
          tell: () => ({
            title: t('a letter in your pocket'),
            text: t('Crane holds out one of Maud’s letters. “I promised I wouldn’t hand it over,” he says slowly. “I never promised you wouldn’t.” It’s addressed in shaky capitals: TO MY SISTER, IF SHE WANTS IT.'),
            options: [
              { label: t('take it to Hester'), act: (g) => t('You take it across. Hester turns it over and over and doesn’t open it, but she doesn’t give it back either. “Tell Crane he can stop keeping mine,” she says. {got}', { got: g.give({ glimmer: 3 }) }) },
              { label: t('tell Crane to deliver it himself'), act: (g) => t('“Me?” He looks at the letter for a long time. “Next week,” he says. “Maybe next week.” He gives you a few coins for the advice. {got}', { got: g.give({ glimmer: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('ride the ferry with Crane'),
          tell: (g) => ({
            title: t('halfway across'),
            text: g.found
              ? t('The ferry is crowded today. Two old women sit in the bow side by side, not saying much, holding hands. “Hester and Maud,” Crane whispers. “They heard Wa and your mother made it up on the quay after twenty years. Hester said: if they can, we can.”')
              : t('Halfway across the gap, Crane stops the ferry. Two small boats are tied up in the middle of the cloud, and in them sit two old women, each reading forty years of letters and crying a bit. “Now they’re working out who says sorry first,” says Crane.'),
            options: g.found ? [
              { label: t('wave to the sisters'), act: (g2) => t('They both wave back, at exactly the same time, and then argue about who waved first. Crane says his ferry will tow you further from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask who said sorry first'), act: (g2) => t('“Both at once,” says Crane, “like your lot.” He says his ferry will tow you further from now on, for the same coins. {got}', { got: g2.give({ food: 2 }) }) },
            ] : [
              { label: t('call out ‘say it together!’'), act: (g2) => t('They look at you, then at each other, and say it together. Crane laughs so hard the ferry rocks, and says it will tow you further from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('steer away and leave them to it'), act: (g2) => t('You leave them to it. Some things should be said without an audience. Crane says his ferry will tow you further from now on. {got}', { got: g2.give({ food: 2 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
