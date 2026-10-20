import * as THREE from 'three';
import { t } from '../i18n.js';

// The beekeeper's hives: straw skeps on a bench by the clover, a shed, and bees
// everywhere. Mrs Fenwick keeps the old custom of telling the bees: when anything
// happens, you knock on the hive and tell them, or they sulk. Nobody told Wa's.

const TAU = Math.PI * 2;

function build(kit, ctx, place, lib) {
  const { box, cyl, house } = lib;
  const shed = house(kit, ctx.r, [-0.55, place.ground(-0.55, -0.35), -0.35], 0.2, { w: 0.7, d: 0.55, h: 0.48, roof: 'roofGreen', walls: 'wood', chimney: false });
  // The bench, and five straw skeps along it.
  const gb = place.ground(0.35, 0.35);
  kit.add('darkWood', box(1.5, 0.06, 0.32), [0.35, gb + 0.32, 0.35]);
  for (const x of [-0.35, 0.35, 1.05]) kit.add('darkWood', box(0.06, 0.32, 0.28), [x, gb, 0.35]);
  const skeps = [];
  for (let i = 0; i < 5; i++) {
    const x = -0.22 + i * 0.29;
    const y = gb + 0.38;
    kit.add('#d8a850', new THREE.SphereGeometry(0.15, 10, 6, 0, TAU, 0, Math.PI / 2).scale(1, 1.35, 1), [x, y, 0.35]);
    for (const k of [0.04, 0.1, 0.15]) kit.add('#b88a38', new THREE.TorusGeometry(0.15 * Math.cos(k * 4.5) + 0.004, 0.012, 4, 14).rotateX(Math.PI / 2), [x, y + k, 0.35]);
    kit.add('#2a1a10', box(0.06, 0.03, 0.02), [x, y, 0.5]);
    skeps.push([x, y + 0.12, 0.35]);
  }
  // A bed of clover and flowers in front.
  for (let i = 0; i < 14; i++) {
    const a = ctx.r.range(0, TAU), d = ctx.r.range(0, 0.4), x = 0.4 + Math.cos(a) * d * 1.6, z = 0.95 + Math.sin(a) * d;
    // Each turned its own way, so two that touch don't share a face plane.
    kit.add(ctx.r.pick(['#ffffff', '#f49ab5', '#c8a0ff', '#ffd23a']), new THREE.IcosahedronGeometry(0.045, 0).rotateY(i * 1.7).rotateX(i * 0.9), [x, place.ground(x, z) + 0.05, z]);
  }
  kit.add('darkWood', cyl(0.025, 0.03, 0.7, 5), [-1.05, place.ground(-1.05, 0.3), 0.3]);
  kit.add('lamp', box(0.1, 0.12, 0.1), [-1.05, place.ground(-1.05, 0.3) + 0.7, 0.3]);

  // Bees: little dots looping round the hives.
  const bees = new THREE.Group();
  const beeGeo = new THREE.IcosahedronGeometry(0.018, 0);
  const beeMat = new THREE.MeshStandardMaterial({ color: '#2a2010', emissive: '#d8a020', emissiveIntensity: 0.5, flatShading: true });
  const swarm = Array.from({ length: 16 }, (_, i) => {
    const bee = new THREE.Mesh(beeGeo, beeMat);
    bee.userData = { home: skeps[i % skeps.length], a: (i / 16) * TAU * 3, r: 0.12 + (i % 4) * 0.06, speed: 2 + (i % 5) * 0.6 };
    bees.add(bee);
    return bee;
  });
  return {
    radius: 1.5, door: [0.3, 1.2], extras: [bees], lights: [shed.window, [-1.05, place.ground(-1.05, 0.3) + 0.75, 0.3]],
    pointLight: { at: [-1.05, place.ground(-1.05, 0.3) + 0.85, 0.3], color: '#ffc870', power: 3 },
    update(time, dt, env) {
      // Bees stay home in the dark and the rain.
      const out = Math.max(0, 1 - env.night * 1.5 - env.rain);
      for (const bee of swarm) {
        const u = bee.userData;
        u.a += dt * u.speed * (1 + env.poke * 2);
        const [hx, hy, hz] = u.home;
        bee.visible = out > 0.05;
        bee.position.set(hx + Math.cos(u.a) * u.r * (1 + out), hy + Math.sin(u.a * 1.7) * 0.08 * out + 0.1 * out, hz + Math.sin(u.a) * u.r * (1 + out));
      }
    },
  };
}

export default {
  id: 'apiary',
  building: {
    find: { radius: 1.5, rn: [0.1, 0.7], slope: 0.3, wet: 1.4 },
    build,
    label: t('a beekeeper’s hives'),
    homes: [['sunflower', 3], ['lavender', 3], ['orchard', 2], ['heath', 2], ['giant', 1]],
    word: {
      id: 'beehive', name: t('beehive words find beekeepers'),
      line: t('Straw hives stand in a row by the clover, and the whole island hums.'),
      words: 'beehive beehives hive hives apiary apiaries beekeeper beekeepers beeswax skep skeps honeybee honeybees',
      roots: 'beehiv apiar beekeep beeswax honeybee',
    },
    note: t('Always tell the bees your news. They sulk if you don’t.'),
    journal: ['🐝', 'beekeeper', 'say something about beehives on a voyage'],
    event: (r, book, g, { first }, { friend }) => ({
      title: t('the beekeeper’s hives'),
      text: first ? t('“Wa’s balloon,” says the beekeeper, lifting her veil. “Mind the bees: they remember her. She always told them her news before she flew. I’m Mrs Fenwick.”')
        : r.pick([t('The hives hum in the sun, and the air smells of honey.'), t('Mrs Fenwick is walking along her hives, talking to each one in turn.')]),
      options: [
        { label: t('help with the hives'), gain: friend(book, 'apiary') ? { food: 2, glimmer: 1, hull: 1 } : { food: 2, glimmer: 1 } },
        { label: t('buy beeswax candles'), pay: 3, gain: { lanterns: 1 }, hint: t('they light the way as well as a lantern') },
      ],
    }),
    arc: {
      icon: '🐝', name: t('Mrs Fenwick the beekeeper'),
      perk: t('From now on, helping with the hives also mends a heart.'),
      chapters: [
        {
          ask: t('ask Mrs Fenwick why one row of hives is quiet'),
          tell: () => ({
            title: t('the quiet hives'),
            text: t('One row of hives is silent: no humming, no bees at the door. “Those were Wa’s,” says Mrs Fenwick. “When someone goes away, you’re meant to tell the bees, or they sulk. Nobody ever told them about Wa.”'),
            options: [
              { label: t('knock on a hive'), act: (g) => t('Nothing. Then one bee comes out, looks at you, and goes back in. Mrs Fenwick gives you a comb of honey anyway. {got}', { got: g.give({ food: 2 }) }) },
              { label: t('ask why nobody told them'), act: (g) => t('“Nobody wanted to say it out loud,” she says. “That she’d gone, and your mother wasn’t speaking to her. Saying it makes it true.” She pays you for weeding the clover. {got}', { got: g.give({ glimmer: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('learn how to tell the bees'),
          tell: () => ({
            title: t('telling the bees'),
            text: t('Mrs Fenwick shows you how it’s done: you knock three times on the hive, you say who you are, and then you tell them the news, all of it, the hard parts too. “They don’t mind sad news,” she says. “They mind not being told.”'),
            options: [
              { label: t('practise on her hives'), act: (g) => t('You tell her bees about your voyage so far. They hum along politely. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('ask what she told hers'), act: (g) => t('“That I’d had a row with my brother,” she says, “and was too proud to write.” She laughs. “The bees made me write.” She gives you a beeswax candle for the dark. {got}', { got: g.give({ lanterns: 1 }) }) },
            ],
          }),
        },
        {
          ask: t('tell Wa’s bees the news'),
          tell: (g) => ({
            title: t('the news'),
            text: g.found
              ? t('Wa’s hives are humming again. “She came herself,” says Mrs Fenwick. “Knocked three times and told them everything: the row, the twenty years, the quay. Took her all afternoon. They’ve been making honey like mad ever since.”')
              : t('You knock three times on Wa’s silent hive and tell it everything: that Wa flew off after a row with your mother, that they haven’t spoken for twenty years, and that you’re going to find her. Your voice goes funny in the middle. When you finish, the hive begins, very softly, to hum.'),
            options: g.found ? [
              { label: t('taste the honey'), act: (g2) => t('It tastes of clover and something like relief. Mrs Fenwick says her hives will look after you from now on. {got}', { got: g2.give({ food: 2 }) }) },
              { label: t('tell them your own news'), act: (g2) => t('You tell them about your voyage, and the bees hum. Mrs Fenwick says her hives will look after you from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
            ] : [
              { label: t('wait for the bees'), act: (g2) => t('One by one, the bees come out into the sun. Mrs Fenwick wipes her eyes on her veil and says her hives will look after you from now on. {got}', { got: g2.give({ hull: 1 }) }) },
              { label: t('thank Mrs Fenwick'), act: (g2) => t('“Don’t thank me,” she says. “You did the hard part. You said it.” Her hives will look after you from now on, she says. {got}', { got: g2.give({ food: 2 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
