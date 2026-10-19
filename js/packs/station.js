import * as THREE from 'three';
import { t } from '../i18n.js';

// The weather station: a white hut, a louvred box on legs, cups spinning on a
// mast and a white balloon on a string. Doctor Isobar can promise you fair
// skies, and her charts have followed a strange quiet front for twenty years.

const TAU = Math.PI * 2;

function build(kit, ctx, place, lib) {
  const { box, cyl, house } = lib;
  const hut = house(kit, ctx.r, [-0.45, place.ground(-0.45, -0.2), -0.2], 0, { w: 0.75, d: 0.6, h: 0.5, roof: 'roofSlate', walls: 'plaster', chimney: true });
  // The louvred box on legs, where the thermometers live.
  const gs = place.ground(0.55, 0.45);
  for (const [x, z] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]]) kit.add('#f4f4ee', box(0.03, 0.6, 0.03), [0.55 + x, gs, 0.45 + z]);
  kit.add('#f4f4ee', box(0.34, 0.32, 0.28), [0.55, gs + 0.6, 0.45]);
  for (let i = 0; i < 4; i++) kit.add('#d8d8d0', box(0.35, 0.02, 0.29), [0.55, gs + 0.66 + i * 0.07, 0.45]);
  kit.add('#f4f4ee', box(0.4, 0.04, 0.34), [0.55, gs + 0.92, 0.45]);
  // The mast.
  const gm = place.ground(0.45, -0.45);
  kit.add('darkStone', box(0.2, 0.1, 0.2), [0.45, gm, -0.45]);
  kit.add('#d8d8d0', cyl(0.025, 0.035, 1.9, 6), [0.45, gm, -0.45]);
  // The anemometer's three cups turn with the wind, and the vane below them points into it.
  const cups = new lib.Kit(ctx.mats);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    cups.add('#d8d8d0', box(0.28, 0.015, 0.015).translate(0.14, 0, 0), [0, 0, 0], { ry: a });
    cups.add('#c8382a', new THREE.SphereGeometry(0.045, 8, 4, 0, TAU, 0, Math.PI / 2).rotateZ(Math.PI / 2), [Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28], { ry: a });
  }
  const spinner = cups.build();
  spinner.position.set(0.45, gm + 1.92, -0.45);
  const vaneKit = new lib.Kit(ctx.mats);
  vaneKit.add('#2a2a2e', box(0.42, 0.02, 0.02), [0, 0, 0]);
  vaneKit.add('#2a2a2e', new THREE.ConeGeometry(0.04, 0.1, 4).rotateZ(-Math.PI / 2), [0.24, 0, 0]);
  vaneKit.add('#2a2a2e', box(0.02, 0.1, 0.12), [-0.2, 0, 0]);
  const vane = vaneKit.build();
  vane.position.set(0.45, gm + 1.7, -0.45);
  // A weather balloon on a long string, tugging in the wind.
  const tether = place.ground(-1, 0.55);
  kit.add('darkWood', cyl(0.025, 0.03, 0.3, 5), [-1, tether, 0.55]);
  const sky = new THREE.Group();
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.15, 1), new THREE.MeshStandardMaterial({ color: '#f8f8f4', flatShading: true, roughness: 0.6 }));
  balloon.castShadow = true;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 3).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#3a3a3a' }));
  sky.add(balloon, string);
  const anchor = new THREE.Vector3(-1, tether + 0.3, 0.55), d = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let spin = 0, sway = 0;
  return {
    radius: 1.4, door: [-0.45, 0.6], extras: [spinner, vane, sky], smoke: [hut.chimney], lights: [hut.window],
    pointLight: { at: [-0.45, 0.5, 0.4], color: '#ffd28a', power: 3 },
    update(time, dt, env) {
      spin += dt * (1.5 + env.wind * 4 + env.poke * 6);
      spinner.rotation.y = spin;
      sway += dt * (0.6 + env.wind * 0.4);
      vane.rotation.y = 0.6 + Math.sin(sway * 0.3) * 0.4;
      // The balloon rides on its string, blown a little downwind.
      const lean = 0.25 + env.wind * 0.15;
      balloon.position.set(anchor.x + lean + Math.sin(sway) * 0.1, anchor.y + 2.1 + Math.sin(sway * 1.3) * 0.08, anchor.z + Math.cos(sway * 0.8) * 0.08);
      d.subVectors(balloon.position, anchor);
      string.position.copy(anchor);
      string.scale.set(1, d.length() - 0.2, 1);
      string.quaternion.setFromUnitVectors(UP, d.normalize());
    },
  };
}

export default {
  id: 'station',
  building: {
    find: { radius: 1.4, rn: [0.15, 0.7], slope: 0.3, wet: 1.4, prefer: 'high' },
    build,
    label: t('a weather station'),
    homes: [['stormcrag', 3], ['geyser', 2], ['pillars', 2], ['stormeye', 2], ['heath', 1], ['cloudisle', 1]],
    word: {
      id: 'forecast', name: t('forecast words find weather stations'),
      line: t('Little cups spin on a mast, and a white balloon tugs at its string: a weather station.'),
      words: 'barometer barometers forecast forecasts forecaster forecasters meteorology meteorologist meteorologists anemometer anemometers thermometer thermometers almanac almanacs',
      roots: 'baromet forecast meteorolog anemomet thermomet',
    },
    note: t('Doctor Isobar can promise you fair skies. She’s usually right.'),
    journal: ['🌡️', 'weather station', 'say something about barometers on a voyage'],
    event: (r, book, g, { first }, { friend }) => {
      const n = friend(book, 'station') ? 3 : 2;
      return {
        title: t('the weather station'),
        text: first ? t('“Wa’s balloon!” A woman in a sou’wester looks up from her barometer. “She used to tap my glass every visit, to see if it would change its mind. I’m Doctor Isobar. Fair weather or foul?”')
          : r.pick([t('The little cups on the mast spin, and the barometer says change.'), t('Doctor Isobar is writing numbers in a ledger and frowning at the sky.')]),
        options: [
          ...(g.canSight ? [{ label: t('send up a weather balloon'), sight: true, free: true, once: 'sight', note: t('an island you haven’t reached, and the words that lead there') }] : []),
          { label: t('ask for fair weather ahead'), pay: 3, calm: n, once: 'calm', hint: t('clear skies on the next {n} islands', { n }) },
          { label: t('help read the instruments'), gain: { glimmer: 2 } },
        ],
      };
    },
    arc: {
      icon: '🌡️', name: t('Doctor Isobar the forecaster'),
      perk: t('From now on, Doctor Isobar’s fair weather lasts three islands, not two.'),
      chapters: [
        {
          ask: t('look at Doctor Isobar’s weather charts'),
          tell: () => ({
            title: t('the quiet front'),
            text: t('Doctor Isobar unrolls a chart covered in curling lines. “Look,” she says, pointing at a small, cold, quiet patch. “A front. No wind, no rain, no sound. It’s followed one balloon across my charts for twenty years.” She taps the balloon. It’s Wa’s.'),
            options: [
              { label: t('ask what kind of front it is'), act: (g) => t('“Not one I’ve got a name for,” she says. “It doesn’t rain. It just goes quiet, and stays quiet.” She gives you a spare barometer to sell. {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('ask if it’s following you'), act: (g) => t('She checks the chart. “Not yours,” she says. “Hers. But it’s heading the same way you are.” She fills your burner from her lamp. {got}', { got: g.give({ fuel: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('help Doctor Isobar launch a weather balloon'),
          tell: () => ({
            title: t('pressure'),
            text: t('You help Doctor Isobar tie a little white balloon to a string and let it go. It climbs straight up into the High Winds. “Pressure,” she says, watching it go. “Weather is just pressure, building up until it has to let go. People are the same.”'),
            options: [
              { label: t('ask how a front like that breaks'), act: (g) => t('“When the pressure’s let out,” she says. “Usually someone says the thing they’ve been holding in. Then it rains, and then it clears.” {got}', { got: g.give({ glimmer: 2 }) }) },
              { label: t('watch the balloon until it’s gone'), act: (g) => t('You watch until it’s a dot, and then nothing. Doctor Isobar writes something in her ledger and pays you for your help. {got}', { got: g.give({ glimmer: 2 }) }) },
            ],
          }),
        },
        {
          ask: t('check the charts with Doctor Isobar'),
          tell: (g) => ({
            title: t('clearing later'),
            text: g.found
              ? t('The quiet front is gone from Doctor Isobar’s charts. “Broke up one morning over the Harbour,” she says, “right over the quay. There was a short, very heavy shower, and then the clearest sky I’ve recorded in twenty years.”')
              : t('Doctor Isobar has drawn a new line on her chart, very faint: a small warm front coming up from the Harbour, following Wa’s quiet one. “That’s you,” she says. “Warm air meets cold, and something has to give. Go on, then.”'),
            options: g.found ? [
              { label: t('ask what day it was'), act: (g2) => t('She checks her ledger. “A Sunday,” she says. Her fair weather will last longer for you from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('look at the clear sky on the chart'), act: (g2) => t('It’s clear from edge to edge. She says her fair weather will last longer for you from now on. {got}', { got: g2.give({ food: 2 }) }) },
            ] : [
              { label: t('go on, then'), act: (g2) => t('You roll up the chart for her. She says her fair weather will last longer for you from now on. {got}', { got: g2.give({ glimmer: 2 }) }) },
              { label: t('ask for the forecast'), act: (g2) => t('“Changeable,” she says, “clearing later.” Her fair weather will last longer for you from now on. {got}', { got: g2.give({ fuel: 2 }) }) },
            ],
          }),
        },
      ],
    },
  },
};
