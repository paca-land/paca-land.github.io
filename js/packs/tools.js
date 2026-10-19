import { t } from '../i18n.js';

// Five tools for the pack (the omens round, October 19). A tool is used from the 🎒
// card: `usable(g)` says whether it would do anything now, `use(g)` does it and says
// what happened. A tool that works later sets a flag, and its hooks (the same as an
// omen's, packs/index.js) check that flag, so they're always in play and idle without it.

export default [
  {
    id: 'jar',
    item: {
      icon: '🏺', name: t('word jar'),
      line: t('Open it, and you can say one word you’ve already said this voyage.'),
      usable: (g) => g.run.used.length > 0 && !g.flag('jar'),
      use: (g) => {
        g.mark('jar', true);
        return t('The word jar is open: you can say one word again.');
      },
      used: (list, g) => (g.flag('jar') ? [] : list),
      note: (g, reading) => (g.flag('jar') && g.run.used.includes(reading.word) ? t('🏺 the word jar lets you say this again') : null),
      takeoff: (g, reading) => {
        if (!g.flag('jar') || !g.run.used.includes(reading.word)) return null;
        g.mark('jar', false);
        return `🏺 ${t('The word jar lets “{word}” fly again.', { word: reading.word })}`;
      },
      status: (g) => (g.flag('jar') ? t('🏺 the word jar is open') : null),
    },
  },
  {
    id: 'spyglass',
    item: {
      icon: '🔭', name: t('spyglass'),
      line: t('Look out for an island you haven’t reached, and the words that lead there.'),
      usable: (g) => g.canSight,
      use: (g) => g.sight(),
    },
  },
  {
    id: 'eraser',
    item: {
      icon: '✏️', name: t('eraser'),
      line: t('Rub out what the Hush did: one letter it swallowed is yours again.'),
      usable: (g) => g.run.banned.length > 0,
      use: (g) => t('You rub hard, and the letter {letter} is yours again.', { letter: g.run.banned.shift().toUpperCase() }),
    },
  },
  {
    id: 'boxkite',
    item: {
      icon: '🎏', name: t('box kite'),
      line: t('Fly it from the basket: +2 miles on each of your next 3 flights. A storm will snap it.'),
      usable: (g) => !(g.flag('boxkite') > 0),
      use: (g) => {
        g.mark('boxkite', 3);
        return t('The box kite climbs and pulls: +2 miles on each of your next 3 flights.');
      },
      hop: (g) => (g.flag('boxkite') > 0 && !g.stormy ? [2, t('the box kite')] : null),
      note: (g) => (g.flag('boxkite') > 0 && g.stormy ? t('🎏 the storm will snap the box kite') : null),
      takeoff: (g) => {
        if (!(g.flag('boxkite') > 0) || !g.stormy) return null;
        g.mark('boxkite', 0);
        return `🎏 ${t('The storm snaps the box kite’s string, and it’s gone.')}`;
      },
      arrive: (g) => {
        if (!(g.flag('boxkite') > 0)) return null;
        g.mark('boxkite', g.flag('boxkite') - 1);
        return g.flag('boxkite') ? null : `🎏 ${t('The box kite comes down, its job done.')}`;
      },
      status: (g) => (g.flag('boxkite') > 0 ? (g.flag('boxkite') === 1 ? t('🎏 the box kite: 1 more flight') : t('🎏 the box kite: {n} more flights', { n: g.flag('boxkite') })) : null),
    },
  },
  {
    id: 'thermos',
    item: {
      icon: '☕', name: t('Ha’s thermos'),
      line: t('Your grandpa Ha’s old thermos: your next cold flight eats no extra food.'),
      usable: (g) => !g.flag('thermos'),
      use: (g) => {
        g.mark('thermos', true);
        return t('You fill Ha’s thermos with something hot.');
      },
      food: (n, g) => (g.flag('thermos') && g.cold ? Math.max(0, n - 1) : n),
      takeoff: (g) => {
        if (!g.flag('thermos') || !g.cold) return null;
        g.mark('thermos', false);
        return `☕ ${t('Ha’s thermos keeps you warm: the cold flight eats no extra food.')}`;
      },
      status: (g) => (g.flag('thermos') ? t('☕ Ha’s thermos is full') : null),
    },
  },
];
