import { t } from '../i18n.js';

// Six omens with real bite (the omens round, October 19). Each is a mod: voyage.js
// asks every mod in play (the voyage's omen, the keepsakes you carry, and each pack
// tool) to bend a number or add a line at fixed points. packs/index.js lists the hooks.
// `fromStart`: an omen that only works from the first island, so the fortune teller
// never swaps one in mid-voyage.

// The biggest thing a tree gives, made one smaller (never all of it).
function pickedOver(gain) {
  const keys = Object.keys(gain).filter((k) => gain[k] > 0);
  if (keys.reduce((n, k) => n + gain[k], 0) <= 1) return false;
  const k = keys.reduce((a, b) => (gain[b] > gain[a] ? b : a));
  gain[k] -= 1;
  return true;
}

export default [
  {
    id: 'redsky',
    omen: {
      name: t('a red sky'),
      line: t('Storms come twice as often, but flying out of one carries you 3 miles further.'),
      storms: (odds) => odds * 2,
      hop: (g) => (g.stormy ? [3, t('a red sky')] : null),
    },
  },
  {
    id: 'rations',
    omen: {
      name: t('thin rations'),
      line: t('Your food store holds only 6, but water gives one more food.'),
      holds: (n, g, k) => (k === 'food' ? 6 : n),
      gather: (g, kind, gain) => {
        if (kind === 'splash' || kind === 'ice') gain.food = (gain.food ?? 0) + 1;
      },
    },
  },
  {
    id: 'forgetful',
    omen: {
      name: t('a forgetful sky'),
      line: t('Every word comes out muffled, so you can’t tell what the sky will hear; but each new kind of word this voyage pays 2 coins.'),
      muffled: () => true,
      freshPay: (n, g, fresh) => n + fresh * 2,
    },
  },
  {
    id: 'oneway',
    omen: {
      name: t('a one-way wind'),
      line: t('A word that starts with the last word’s final letter costs a quarter of the fuel; any other word costs 2 more.'),
      fuel: (n, g, reading) => {
        if (g.run.words.length <= 1) return n;
        return reading.rules.includes('chain') ? Math.ceil(n / 2) : n + 2;
      },
      surcharge: (n) => n + 2,
      note: (g, reading) => {
        if (g.run.words.length <= 1) return null;
        return reading.rules.includes('chain') ? t('with the one-way wind: half again') : t('against the one-way wind: +2 🔥');
      },
    },
  },
  {
    id: 'early',
    omen: {
      name: t('the Hush wakes early'),
      line: t('The Hush follows you from the Harbour, but sunny words and sorry words drive it twice as far back.'),
      fromStart: true,
      begin: (g) => {
        g.run.hush = -g.hushStart;
      },
      hushBack: (n) => n * 2,
    },
  },
  {
    id: 'ga',
    omen: {
      name: t('Ga’s race'),
      line: t('Ga races you to the Edge. While she’s ahead, she picks over the trees before you land (one less from each); while you’re ahead, you get first pick (one more food).'),
      fromStart: true,
      begin: (g) => {
        g.mark('ga', 0);
        g.mark('gaAhead', false);
      },
      // She flies 3 to 8 miles a flight, about as far as you do.
      takeoff: (g) => {
        g.mark('ga', Math.min(g.edgeAt, (g.flag('ga') ?? 0) + 3 + Math.floor(Math.random() * 6)));
      },
      arrive: (g) => {
        const ga = g.flag('ga') ?? 0;
        if (ga >= g.edgeAt && !g.flag('gaHome')) {
          g.mark('gaHome', true);
          return `🎈 ${t('A pigeon brings a note from Ga: she’s at the Edge already, waiting with a flask of tea. The trees are all yours again.')}`;
        }
        const ahead = ga > g.run.leagues;
        if (ahead === g.flag('gaAhead') || ga >= g.edgeAt) return null;
        g.mark('gaAhead', ahead);
        return ahead ? `🎈 ${t('Ga’s purple balloon sails past you, and she waves her hat. She’ll get to the trees first now.')}`
          : `🎈 ${t('You pass Ga’s purple balloon. First pick of the trees is yours.')}`;
      },
      gather: (g, kind, gain, what) => {
        if (kind !== 'tree') return undefined;
        const ga = g.flag('ga') ?? 0;
        if (ga < g.edgeAt && ga > g.run.leagues) return pickedOver(gain) ? t('{what}, what Ga left', { what }) : undefined;
        gain.food = (gain.food ?? 0) + 1;
        return t('{what}, first pick', { what });
      },
      status: (g) => {
        const ga = g.flag('ga') ?? 0;
        if (ga >= g.edgeAt) return t('🎈 Ga is waiting at the Edge');
        if (ga > g.run.leagues) return t('🎈 Ga is {miles} ahead', { miles: g.miles(ga - g.run.leagues) });
        return t('🎈 Ga is {miles} behind', { miles: g.miles(g.run.leagues - ga) });
      },
      marker: (g) => ({ at: Math.min(1, (g.flag('ga') ?? 0) / g.edgeAt), icon: '🎈', title: t('Ga') }),
    },
  },
];

export { pickedOver };
