import { t } from '../i18n.js';
import { pickedOver } from './omens.js';

// Four keepsakes that cut both ways (the omens round, October 19). A keepsake you
// carry is a mod while you have it: the same hooks as an omen (packs/index.js).

export default [
  {
    id: 'gacompass',
    keepsake: {
      icon: '🎯', name: t('Ga’s compass'),
      line: t('It always points somewhere strange: strange islands come up far more often, but their trees give one less.'),
      strange: (chance) => Math.min(1, chance + 0.3),
      gather: (g, kind, gain, what) => (kind === 'tree' && g.strange && pickedOver(gain) ? t('{what}, but strange trees are mean', { what }) : undefined),
    },
  },
  {
    id: 'watch',
    keepsake: {
      icon: '⌚', name: t('Ha’s pocket watch'),
      line: t('Your grandpa Ha’s watch, still ticking: an extra hour on every island, but the Hush, once it’s following you, moves faster.'),
      stay: (n) => n + 1,
      hush: (speed) => speed * 1.25,
    },
  },
  {
    id: 'cracked',
    keepsake: {
      icon: '🪔', name: t('cracked lantern'),
      line: t('It never goes out, so the dark never makes the sky mishear you; but the Hush follows its light, and gains 2 miles on every flight in the dark.'),
      darkSafe: () => true,
      takeoff: (g) => {
        if (!g.dark || g.run.hush === null) return null;
        g.run.hush += 2;
        return `🪔 ${t('The cracked lantern lights your way, and the Hush follows its light (+2 miles).')}`;
      },
    },
  },
  {
    id: 'horn',
    keepsake: {
      icon: '📯', name: t('loud horn'),
      line: t('Blow it as you land and the Hush falls back 2 miles; but the animals run off before they can thank you, so they bring no coins.'),
      arrive: (g) => {
        if (g.run.hush === null) return null;
        g.run.hush -= 2;
        return `📯 ${t('You blow the horn as you land, and the Hush falls back.')}`;
      },
      noThanks: () => t('it runs off at the sound of your horn'),
    },
  },
];
