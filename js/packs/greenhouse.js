import * as THREE from 'three';
import { t } from '../i18n.js';

// The greenhouse: glass panes on a brick wall, full of tomatoes and vines. Mr
// Larch will pot you a seedling for the basket, and three flights later it
// fruits. By his door grows a rose Wa planted for your mother, which hasn't
// flowered since she stopped coming.

const SEEDLING = 3; // flights until a seedling fruits

function build(kit, ctx, place, lib) {
  const { box, cyl, gable } = lib;
  ctx.mats.glass ??= new THREE.MeshStandardMaterial({ color: '#d8f0f4', transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, flatShading: true });
  const g = place.ground(0, 0);
  const W = 1.5, D = 0.95, H = 0.62;
  kit.add('#a0503a', box(W + 0.06, 0.95, D + 0.06), [0, g - 0.72, 0]);
  kit.add('glass', box(W, H, D), [0, g + 0.23, 0]);
  kit.add('glass', gable(W, 0.45, D), [0, g + 0.23 + H, 0]);
  // The white frame: corners, ridge, and glazing bars.
  const top = g + 0.23 + H;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) kit.add('#f4f4ee', box(0.035, H, 0.035), [x, g + 0.23, z]);
  kit.add('#f4f4ee', box(W + 0.04, 0.035, 0.035), [0, top + 0.44, 0]);
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.3) {
    for (const z of [-D / 2, D / 2]) kit.add('#f4f4ee', box(0.02, H, 0.02), [x, g + 0.23, z]);
  }
  kit.add('#f4f4ee', box(W + 0.02, 0.03, D + 0.02), [0, top - 0.02, 0]);
  // Inside: beds of green, with tomatoes.
  for (let i = 0; i < 9; i++) {
    const x = -0.55 + (i % 5) * 0.27, z = i < 5 ? -0.22 : 0.22;
    kit.add('#3f8a34', new THREE.IcosahedronGeometry(0.13, 0).scale(1, 1.3, 1), [x, g + 0.36, z]);
    kit.add('#e0402a', new THREE.IcosahedronGeometry(0.035, 0), [x + 0.06, g + 0.42, z + 0.05]);
  }
  kit.add('glow', box(0.1, 0.12, 0.1), [0, top - 0.12, 0]);
  // The door, and Wa's rose beside it.
  kit.add('#f4f4ee', box(0.32, 0.55, 0.03), [0, g + 0.23, D / 2 + 0.02]);
  const gr = place.ground(0.36, D / 2 + 0.3);
  kit.add('#2f6a32', new THREE.IcosahedronGeometry(0.16, 0).scale(1, 1.2, 1), [0.36, gr + 0.16, D / 2 + 0.3]);
  // A water butt and a potting bench.
  const gw = place.ground(-W / 2 - 0.25, 0.3);
  kit.add('#5a6a7a', cyl(0.14, 0.13, 0.36, 10), [-W / 2 - 0.25, gw, 0.3]);
  const gp = place.ground(W / 2 + 0.3, 0.2);
  kit.add('wood', box(0.5, 0.06, 0.3), [W / 2 + 0.3, gp + 0.36, 0.2]);
  for (const dx of [-0.2, 0.2]) kit.add('darkWood', box(0.04, 0.36, 0.26), [W / 2 + 0.3 + dx, gp, 0.2]);
  for (const dx of [-0.15, 0, 0.15]) kit.add('#b8603a', cyl(0.05, 0.04, 0.08, 6), [W / 2 + 0.3 + dx, gp + 0.39, 0.2]);
  return {
    radius: 1.6, door: [0, D / 2 + 0.8], lights: [[0, top - 0.12, 0]],
    pointLight: { at: [0, g + 0.7, D / 2 + 0.4], color: '#ffe0a0', power: 3 },
  };
}

export default {
  id: 'greenhouse',
  building: {
    find: { radius: 1.6, rn: [0.1, 0.65], slope: 0.28, wet: 1.5 },
    build,
    label: t('a greenhouse'),
    homes: [['sunflower', 3], ['orchard', 2], ['giant', 2], ['jungle', 1], ['globe', 1], ['lavender', 1]],
    word: {
      id: 'greenhouse', name: t('greenhouse words find greenhouses'),
      line: t('Sunlight pours through a greenhouse full of tomatoes and vines.'),
      words: 'greenhouse greenhouses glasshouse glasshouses hothouse hothouses conservatory seedling seedlings gardener gardeners botanist botanists',
      roots: 'greenhous glasshous hothous seedling botanis',
    },
    note: t('Take a seedling with you. By the time you’re hungry, it’ll have fruited.'),
    journal: ['🪴', 'greenhouse', 'say something about greenhouses on a voyage'],
    event: (r, book, g, { first }) => ({
      title: t('the greenhouse'),
      text: first ? t('“Wa’s balloon,” says the gardener, wiping soil off his hands. “She planted the old rose by the door, the first time she came. It hasn’t flowered since she stopped coming. I’m Mr Larch.”')
        : r.pick([t('It’s warm and green and steamy in the greenhouse, and everything smells of tomatoes.'), t('Mr Larch is talking to his seedlings, quite seriously.')]),
      options: [
        {
          label: t('pot a seedling for the basket'), pay: 2, disabled: Boolean(g.flag('seedling')),
          hint: g.flag('seedling') ? t('one is already growing in your basket') : t('in {n} flights it fruits: +{food} 🍞', { n: SEEDLING, food: g.arcDone('greenhouse') ? 8 : 5 }),
          icon: '🌱', act: (g2) => {
            g2.mark('seedling', g2.run.words.length + SEEDLING);
            return t('A seedling in a pot rides in the basket now. In {n} flights it will fruit.', { n: SEEDLING });
          },
        },
        { label: t('water the beds'), gain: { food: 2 } },
      ],
    }),
    // Wherever you are when it's ready, the seedling fruits.
    arrive(g) {
      const due = g.flag('seedling');
      if (!due || g.run.words.length < due) return '';
      g.mark('seedling', 0);
      return `🌱 ${t('The seedling in your basket has fruited: {got}', { got: g.give({ food: g.arcDone('greenhouse') ? 8 : 5 }) })}`;
    },
    status(g) {
      const due = g.flag('seedling');
      if (!due) return '';
      const n = due - g.run.words.length;
      return n <= 1 ? t('🌱 your seedling fruits after the next flight') : t('🌱 your seedling fruits in {n} flights', { n });
    },
    arc: {
      icon: '🪴', name: t('Mr Larch the gardener'),
      perk: t('From now on, a seedling from the greenhouse fruits with 8 food, not 5.'),
      chapters: [
        {
          ask: t('ask Mr Larch about the old rose'),
          tell: () => ({
            title: t('the old rose'),
            text: t('By the greenhouse door grows a rose with no flowers on it, only leaves. “Wa planted it for your mother,” says Mr Larch. “A cutting from the one at home. She said she’d bring your mother up to see it flower one day. It hasn’t flowered since.”'),
            options: [
              { label: t('water the rose'), act: (g) => t('You give it a good drink. It doesn’t do anything, but it looks a bit less sorry for itself. Mr Larch gives you a bag of tomatoes. {got}', { got: g.give({ food: 2 }) }) },
              { label: t('ask why it won’t flower'), act: (g) => t('“Some plants wait,” he says. “For somebody.” He won’t say any more, but he pays you for repotting his geraniums. {got}', { got: g.give({ glimmer: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('help Mr Larch talk to his plants'),
          tell: () => ({
            title: t('talking to plants'),
            text: t('Mr Larch talks to his plants every morning. “It helps them grow,” he says, “and it helps me. You can say anything to a tomato.” He hands you a watering can and nods at the old rose.'),
            options: [
              { label: t('tell the rose about home'), act: (g) => t('You tell it about the quay, and your mother’s kitchen, and the rose at home it came from. When you finish, there’s a tiny green bud you’re sure wasn’t there before. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('tell the rose about Wa'), act: (g) => t('You tell it that Wa is somewhere up at the Edge, and that you’re going to bring her home. Mr Larch pretends to be busy with his seed trays. {got}', { got: g.give({ food: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('see how the old rose is doing'),
          tell: (g) => ({
            title: t('in flower'),
            text: g.found
              ? t('The old rose is covered in flowers, deep red, more than Mr Larch can count. “Wa came up with your mother last week,” he says. “The two of them stood right here, not saying much. It flowered overnight. Make of that what you like.”')
              : t('The old rose has one flower on it, just opening, deep red. “It knew you were coming,” says Mr Larch. “Take a cutting home to your mother. Tell her who planted it.”'),
            options: g.found ? [
              { label: t('pick a rose for home'), act: (g2) => t('You pick one for the kitchen table. Mr Larch says his seedlings will fruit bigger for you from now on. {got}', { got: g2.give({ food: 2 }) }) },
              { label: t('leave them all on the bush'), act: (g2) => t('You leave them where they are, for the next person who needs to see them. His seedlings will fruit bigger for you from now on, he says. {got}', { got: g2.give({ glimmer: 2 }) }) },
            ] : [
              { label: t('take the cutting'), act: (g2) => t('You wrap it in wet newspaper and tuck it into the basket. Mr Larch says his seedlings will fruit bigger for you from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask him to keep it for her'), act: (g2) => t('“I’ll keep it till she comes,” he says. “She will, you know. People do, in the end.” His seedlings will fruit bigger for you from now on, he says. {got}', { got: g2.give({ food: 2 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
