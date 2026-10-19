import * as THREE from 'three';
import { t } from '../i18n.js';

// The glassworks: a brick furnace with a glowing mouth, a shed, and shelves of
// coloured bottles. Old Firth made the glass for Wa's lantern, and he'll sell
// you a glass lens that shows what words mean before you say them.

const TAU = Math.PI * 2;
const LENS = 3; // islands a lens lasts (5 once his story is done)

function build(kit, ctx, place, lib) {
  const { box, cyl, house } = lib;
  // The furnace: a round brick kiln, a domed top, a tall chimney and a glowing mouth.
  const gf = place.ground(0.35, -0.1);
  kit.add('stone', box(0.9, 0.6, 0.9), [0.35, gf - 0.55, -0.1]);
  kit.add('#a0503a', cyl(0.42, 0.46, 0.7, 12), [0.35, gf, -0.1]);
  kit.add('#a0503a', new THREE.SphereGeometry(0.42, 12, 6, 0, TAU, 0, Math.PI / 2), [0.35, gf + 0.7, -0.1]);
  kit.add('#8a4030', cyl(0.1, 0.12, 0.9, 8), [0.48, gf + 0.95, -0.22]);
  kit.add('flame', box(0.2, 0.18, 0.04), [0.35, gf + 0.25, 0.33]);
  kit.add('darkStone', box(0.3, 0.05, 0.08), [0.35, gf + 0.36, 0.34]);
  // Old Firth's shed.
  const shed = house(kit, ctx.r, [-0.5, place.ground(-0.5, 0.15), 0.15], 0, { w: 0.75, d: 0.6, h: 0.5, roof: 'roofSlate', walls: 'wood', chimney: false });
  // A rack of bottles in every colour.
  const gr = place.ground(-0.45, 0.72);
  for (const y of [0.22, 0.48]) kit.add('darkWood', box(0.7, 0.03, 0.16), [-0.45, gr + y, 0.72]);
  for (const x of [-0.78, -0.12]) kit.add('darkWood', box(0.03, 0.62, 0.16), [x, gr, 0.72]);
  const colours = ['#3ac8c8', '#58c85a', '#e8a03a', '#a878e8', '#e85a7a'];
  for (let i = 0; i < 10; i++) {
    const x = -0.72 + (i % 5) * 0.14, y = gr + (i < 5 ? 0.235 : 0.495);
    kit.add(colours[(i * 3) % 5], cyl(0.035, 0.04, 0.12 + (i % 3) * 0.03, 7), [x, y, 0.72]);
  }
  // Glass floats hanging from the shed's eaves, turning in the wind.
  const floats = new THREE.Group();
  const balls = colours.slice(0, 4).map((color, i) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.7, roughness: 0.1, emissive: color, emissiveIntensity: 0.2 }));
    ball.userData.phase = i * 1.3;
    ball.position.set(-0.75 + i * 0.17, place.ground(-0.5, 0.15) + 0.42, 0.5);
    floats.add(ball);
    return ball;
  });
  return {
    radius: 1.6, door: [-0.5, 0.95], extras: [floats], smoke: [[0.48, gf + 1.9, -0.22]],
    lights: [shed.window, [0.35, gf + 0.3, 0.45, 'fire']],
    pointLight: { at: [0.35, gf + 0.3, 0.6], color: '#ff8a3a', power: 5, flicker: true, always: true },
    update(time, dt, env) {
      for (const ball of balls) ball.position.x += Math.sin(time * (1 + env.wind * 0.5) + ball.userData.phase) * 0.0006;
    },
  };
}

export default {
  id: 'glassworks',
  building: {
    find: { radius: 1.6, rn: [0.1, 0.7], slope: 0.3, wet: 1.4 },
    build,
    label: t('a glassworks'),
    homes: [['glass', 3], ['globe', 2], ['ember', 2], ['crater', 1], ['clockwork', 1]],
    word: {
      id: 'glassblowing', name: t('glass-blowing words find glassworks'),
      line: t('A furnace glows in a brick kiln, and shelves of coloured bottles catch the light.'),
      words: 'glassblower glassblowers glassblowing glassworks glassmaker glassmakers bottle bottles vase vases goblet goblets decanter decanters',
      roots: 'glassblow glasswork glassmak decant',
    },
    note: t('Old Firth’s glass lenses show you what a word means before you say it. Worth every coin in the High Winds.'),
    journal: ['🫧', 'glassworks', 'say something about glass-blowing on a voyage'],
    event: (r, book, g, { first }, { friend }) => {
      const n = friend(book, 'glassworks') ? 5 : LENS;
      return {
        title: t('the glassworks'),
        text: first ? t('“Wa’s balloon!” The glassblower lowers a glowing pipe. “I made the glass for her lantern, the one she took to the Edge. Said she’d light it when she was ready to come home. I’m Old Firth.”')
          : r.pick([t('The furnace roars, and shelves of coloured bottles catch the light.'), t('Old Firth is blowing a bubble of glass the size of your head, very slowly.')]),
        options: [
          {
            label: t('buy a glass lens'), pay: 4, disabled: g.flag('lens') > 0, icon: '🔍',
            hint: g.flag('lens') > 0 ? t('you have one already') : t('for {n} islands, the word box names every kind of word, even ones you haven’t learned', { n }),
            act: (g2) => {
              g2.mark('lens', n);
              return t('Through the lens, every word shows what it means: for {n} islands, the sky names every kind of word you type.', { n });
            },
          },
          { label: t('help at the furnace'), gain: { glimmer: 2, fuel: 1 } },
        ],
      };
    },
    // A lens is good for this island and the next few.
    arrive(g) {
      if (g.flag('lens') > 0) g.mark('lens', g.flag('lens') - 1);
      return '';
    },
    status(g) {
      const n = g.flag('lens');
      if (!(n > 0)) return '';
      return n === 1 ? t('🔍 the glass lens: this island only') : t('🔍 the glass lens: {n} islands, this one too', { n });
    },
    arc: {
      icon: '🫧', name: t('Old Firth the glassblower'),
      perk: t('From now on, a glass lens lasts 5 islands, not 3.'),
      chapters: [
        {
          ask: t('ask Old Firth about Wa’s lantern'),
          tell: () => ({
            title: t('the twin lantern'),
            text: t('Old Firth shows you a lantern on his shelf, the twin of Wa’s: thick green glass with a brass top. “I made two,” he says. “She took one up to the Edge and left this one with me. Said one was for going and one was for coming home.”'),
            options: [
              { label: t('hold it up to the light'), act: (g) => t('The green glass turns the whole workshop the colour of the sea. Old Firth lets you keep a glass bead from the offcuts box. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('ask which one this is'), act: (g) => t('“The coming-home one,” he says. “Still waiting.” He tops up your burner with the furnace’s oil. {got}', { got: g.give({ fuel: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('help Old Firth blow a glass'),
          tell: () => ({
            title: t('a bubble of glass'),
            text: t('Old Firth puts a blowpipe in your hands with a glowing gob of glass on the end. “Blow gently,” he says, “and keep turning. Glass is like news: blow too hard and it bursts, don’t blow at all and it just sits there.”'),
            options: [
              { label: t('blow gently'), act: (g) => t('A wobbly little bubble swells on the end of the pipe. Old Firth says it’s the worst float he’s ever seen and the best first one. He pays you for it anyway. {got}', { got: g.give({ glimmer: 3 }) }) },
              { label: t('blow as hard as you can'), act: (g) => t('It bursts with a pop and a shower of sparks. Old Firth laughs until he coughs. “Everybody does that once,” he says, and gives you lamp oil for the trouble. {got}', { got: g.give({ fuel: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('see what Old Firth has made'),
          tell: (g) => ({
            title: t('green glass'),
            text: g.found
              ? t('The coming-home lantern is lit on Old Firth’s bench. “Wa came by,” he says. “She said her lantern’s burning up at the Edge now, for whoever comes next, and this one’s for her kitchen window. She’s collecting it on Sunday.” He grins. “She always said Sunday.”')
              : t('Old Firth has blown you something: a tiny green glass lantern on a string, the same green as Wa’s. “For when you find her,” he says. “Hold it up, and she’ll know who sent you.”'),
            options: g.found ? [
              { label: t('help him polish it'), act: (g2) => t('You polish it until it shines. Old Firth says his lenses will last you longer from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask him to make you one'), act: (g2) => t('“Already did,” he says, and hands you a little green lantern on a string. His lenses will last you longer from now on, he says. {got}', { got: g2.give({ lanterns: 1 }) }) },
            ] : [
              { label: t('put it on'), act: (g2) => t('It’s still warm from the furnace, and it hangs just over your heart. Old Firth says his lenses will last you longer from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('give him a hug'), act: (g2) => t('He pats your back, embarrassed and pleased. His lenses will last you longer from now on, he says. {got}', { got: g2.give({ fuel: 2 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
