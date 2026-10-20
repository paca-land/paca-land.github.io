import * as THREE from 'three';
import { t } from '../i18n.js';

// The puppet theatre: a striped booth with benches in front, and Signor Tullio
// doing all the voices. His play is about Wa and your mother, and nobody has
// written its ending.

function build(kit, ctx, place, lib) {
  const { box, cyl, cone, gable } = lib;
  const g = place.ground(0, 0);
  kit.add('stone', box(1.4, 0.6, 0.62), [0, g - 0.55, 0]);
  // The booth: striped sides, a dark stage window, a painted top.
  for (let i = 0; i < 8; i++) kit.add(i % 2 ? '#f4ece0' : '#c8382a', box(0.16, 1.5, 0.5), [-0.56 + i * 0.16, g, 0]);
  kit.add('#1e1a24', box(0.86, 0.5, 0.06), [0, g + 0.82, 0.24]);
  kit.add('#c8a050', box(1.34, 0.08, 0.56), [0, g + 1.5, 0]);
  kit.add('roofRed', gable(1.3, 0.32, 0.5), [0, g + 1.58, 0]);
  // Curtains drawn back at either side of the stage.
  for (const sx of [-1, 1]) kit.add('#8a1a2a', box(0.14, 0.5, 0.05), [sx * 0.37, g + 0.8, 0.28]);
  kit.add('#c8a050', box(0.9, 0.06, 0.06), [0, g + 1.32, 0.28]);
  // Two rows of benches.
  for (const z of [0.9, 1.25]) {
    const gz = place.ground(0, z);
    kit.add('wood', box(1.1, 0.05, 0.2), [0, gz + 0.22, z]);
    for (const x of [-0.45, 0.45]) kit.add('darkWood', box(0.05, 0.22, 0.16), [x, gz, z]);
  }
  // Lamps either side.
  for (const sx of [-1, 1]) {
    const gl = place.ground(sx * 0.85, 0.55);
    kit.add('darkWood', cyl(0.025, 0.03, 0.9, 5), [sx * 0.85, gl, 0.55]);
    kit.add('lamp', box(0.1, 0.12, 0.1), [sx * 0.85, gl + 0.9, 0.55]);
  }
  // Pennants along the top.
  for (let i = 0; i < 5; i++) kit.add(['#ffd23a', '#3a8ad8', '#3ab85a', '#ff6a8a', '#ffd23a'][i], cone(0.05, 0.14, 3), [-0.5 + i * 0.25, g + 1.98, 0], { rx: Math.PI });

  // Two puppets on the stage, bobbing as they talk.
  const pair = new THREE.Group();
  const puppet = (coat, hair) => {
    const p = new lib.Kit(ctx.mats);
    p.add(coat, cone(0.07, 0.2, 6), [0, 0, 0]);
    p.add('#f2d2b0', new THREE.IcosahedronGeometry(0.055, 1), [0, 0.25, 0]);
    p.add(hair, new THREE.SphereGeometry(0.058, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.27, 0]);
    return p.build();
  };
  const wa = puppet('#c8382a', '#d8d8d8'), girl = puppet('#3a6ab8', '#5a3a20');
  wa.position.set(-0.18, g + 0.62, 0.27);
  girl.position.set(0.18, g + 0.62, 0.27);
  pair.add(wa, girl);
  let phase = 0;
  return {
    radius: 1.6, door: [0, 1.6], extras: [pair],
    lights: [[-0.85, place.ground(-0.85, 0.55) + 0.95, 0.55], [0.85, place.ground(0.85, 0.55) + 0.95, 0.55]],
    pointLight: { at: [0, g + 1.1, 0.7], color: '#ffd08a', power: 3 },
    update(time, dt, env) {
      phase += dt * (2 + env.poke * 4);
      wa.position.y = g + 0.62 + Math.max(0, Math.sin(phase)) * 0.05;
      girl.position.y = g + 0.62 + Math.max(0, Math.sin(phase + Math.PI)) * 0.05;
      wa.rotation.z = Math.sin(phase * 0.5) * 0.15;
      girl.rotation.z = -Math.sin(phase * 0.5 + 1) * 0.15;
    },
  };
}

export default {
  id: 'puppets',
  building: {
    find: { radius: 1.6, rn: [0.1, 0.65], slope: 0.28, wet: 1.4 },
    build,
    label: t('a puppet theatre'),
    homes: [['lanterns', 3], ['sugar', 2], ['lotus', 1], ['maze', 1], ['toadstool', 1], ['gilded', 1]],
    word: {
      id: 'puppet', name: t('puppet and theatre words find puppet theatres'),
      line: t('A striped puppet theatre stands by the path, and somebody behind it is doing all the voices.'),
      words: 'puppet puppets puppeteer puppeteers marionette marionettes theatre theatres theater theaters matinee matinees pantomime pantomimes',
      roots: 'puppet marionet theatr theater pantomim',
    },
    note: t('Laughing mends you better than any patch. The puppet shows are worth every coin.'),
    journal: ['🎭', 'puppet theatre', 'say something about puppets on a voyage'],
    event: (r, book, g, { first }, { friend }) => ({
      title: t('the puppet theatre'),
      text: first ? t('“Wa’s balloon!” A head pops up over the puppet stage, then a hand with a puppet on it. “The famous Wa!” squeaks the puppet. “We do a show about her, you know. I’m Signor Tullio. Sit, sit.”')
        : r.pick([t('A row of children sits on the benches, waiting for the curtain to go up.'), t('Signor Tullio is gluing a puppet’s nose back on with great concentration.')]),
      options: [
        { label: t('watch the show'), ...(friend(book, 'puppets') ? {} : { pay: 2 }), gain: { hull: 1 }, hint: t('you laugh until you forget your troubles') },
        { label: t('help work the puppets'), gain: { glimmer: 3 } },
      ],
    }),
    arc: {
      icon: '🎭', name: t('Signor Tullio the puppeteer'),
      perk: t('From now on, the puppet show is free.'),
      chapters: [
        {
          ask: t('watch Signor Tullio’s play about Wa'),
          tell: () => ({
            title: t('a play about Wa'),
            text: t('The play is called The Balloonist and Her Daughter. A puppet in a red scarf flies off in a little balloon, and a puppet girl waves from the quay, and waves, and waves. Then the curtain comes down. “Is that it?” you ask. “That’s all anybody knows,” says Signor Tullio. “Nobody has written the end.”'),
            options: [
              { label: t('clap anyway'), act: (g) => t('You clap, and the children clap, and the puppet girl takes a bow. Signor Tullio gives you your ticket money back. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('ask where he heard the story'), act: (g) => t('“Everyone at the Harbour knows it,” he says. “Nobody talks about it, so everybody knows it.” He gives you a bag of toffees from the box office. {got}', { got: g.give({ food: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('help Signor Tullio with the girl puppet'),
          tell: () => ({
            title: t('a line for the girl'),
            text: t('Signor Tullio is rewriting the play, and he wants you to work the puppet girl. “What does she say,” he asks, “when the balloon flies off? In the old version she says nothing. Nothing makes a terrible play.”'),
            options: [
              { label: t('“Come back!”'), act: (g) => t('The puppet girl shouts it after the balloon, and all the children shout it too. Signor Tullio writes it down. “Better,” he says. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('“I didn’t mean it!”'), act: (g) => t('The puppet girl says it very quietly, and the whole audience goes still. Signor Tullio has to blow his nose. “That,” he says, “is the line.” {got}', { got: g.give({ hull: 1 }) }) },
            ],
          }),
        },
        {
          ask: t('see the new ending of the play'),
          tell: (g) => ({
            title: t('the last act'),
            text: g.found
              ? t('The new ending is on the quay: two puppets, one in a red scarf, one grown up now, both saying sorry at exactly the same moment, and then laughing about it. “It happened just like that,” says Signor Tullio. “Your mother told me so herself. She came to see the show.”')
              : t('Signor Tullio has written an ending: the balloon comes home, and the two puppets meet on the quay and say sorry at the same moment. He won’t perform it yet. “I’m keeping it until it’s true,” he says. “You go and make it true.”'),
            options: g.found ? [
              { label: t('stand up and cheer'), act: (g2) => t('You cheer louder than anyone. Signor Tullio says you’ll never pay for a ticket again. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask how your mother liked it'), act: (g2) => t('“She cried all the way through,” he says happily, “and then asked for a better scarf for the Wa puppet.” He says you’ll never pay for a ticket again. {got}', { got: g2.give({ food: 2 }) }) },
            ] : [
              { label: t('promise him'), act: (g2) => t('You promise. He shakes your hand very seriously and says you’ll never pay for a ticket again. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask to see it anyway'), act: (g2) => t('He does it just once, just for you, with the curtain half closed. Afterwards he says you’ll never pay for a ticket again. {got}', { got: g2.give({ hull: 1 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
