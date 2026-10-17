// The field journal: things to find across lands, and little badges for the
// things you keep doing. It lives in this browser's localStorage; nothing
// leaves the page.

const KEY = 'paca-journal';

// [id, emoji, name, hint while it's still missing]
export const SECTIONS = [
  ['lands', [
    ['land:meadow', '🌿', 'meadow', 'the most common land of all'],
    ['land:highlands', '⛰️', 'highlands', 'pines under a snowy peak'],
    ['land:autumn', '🍂', 'autumn woods', 'leaves on the wind'],
    ['land:desert', '🏜️', 'desert mesa', 'cacti on terraced rock'],
    ['land:snowfield', '❄️', 'snowfield', 'white all over'],
    ['land:blossom', '🌸', 'blossom vale', 'pink petals falling'],
    ['land:dream', '🔮', 'dreamland', 'the rarest land: lilac grass'],
  ]],
  ['landmarks', [
    ['landmark:cabin', '🛖', 'cabin', 'smoke from a little chimney'],
    ['landmark:windmill', '🌾', 'windmill', 'sails turning by the fields'],
    ['landmark:village', '🏘️', 'village', 'a few roofs together'],
    ['landmark:castle', '🏰', 'castle', 'towers and flags'],
    ['landmark:campsite', '🏕️', 'campsite', 'a tent and a fire'],
    ['landmark:ruins', '🏛️', 'ruins', 'old columns, often in the desert'],
    ['landmark:lighthouse', '🗼', 'lighthouse', 'it needs a coast to stand on'],
    ['landmark:stones', '🗿', 'standing stones', 'a ring of old stones'],
    ['landmark:wizard', '🧙', "wizard's tower", 'look in dreamlands'],
    ['landmark:shrine', '⛩️', 'shrine', 'look in blossom vales'],
  ]],
  ['sky', [
    ['sky:aurora', '🌌', 'aurora', 'a cold, clear night'],
    ['sky:meteor', '🌠', 'shooting star', 'a clear night and a little patience'],
    ['sky:rainbow', '🌈', 'rainbow', 'just after rain, with the sun out'],
    ['sky:lightning', '⚡', 'lightning', 'a thunderstorm'],
    ['sky:fullmoon', '🌕', 'full moon', 'every land has its own moon'],
  ]],
  ['wildlife', [
    ['life:rabbit', '🐇', 'rabbit', 'tap one'],
    ['life:deer', '🦌', 'deer', 'tap one, in the greener lands'],
    ['life:duck', '🦆', 'duck', 'tap one out on a lake'],
    ['life:fish', '🐟', 'leaping fish', 'watch a lake, or tap the water'],
    ['life:bats', '🦇', 'bats', 'out after dark'],
    ['life:fireflies', '✨', 'fireflies', 'a night in the meadows or the woods'],
  ]],
  ['curiosities', [
    ['odd:balloon', '🎈', 'hot-air balloon', 'about one land in seven'],
    ['odd:waterfall', '💧', 'waterfall', 'a river running off the edge'],
    ['odd:oasis', '🌴', 'oasis', 'water in the desert'],
    ['odd:ice', '🧊', 'frozen lake', 'a snowfield, or snow that lasts'],
  ]],
];
const ENTRIES = new Map(SECTIONS.flatMap(([, items]) => items.map((item) => [item[0], item])));

// [id, emoji, name, what to do, counter, goal]
export const BADGES = [
  ['green-thumb', '🌱', 'green thumb', 'plant 100 flowers', 'flowers', 100],
  ['tree-shaker', '🌳', 'tree shaker', 'shake 50 trees', 'trees', 50],
  ['wanderer', '🧭', 'wanderer', 'visit 25 lands', 'lands', 25],
  ['globetrotter', '🗺️', 'globetrotter', 'visit 100 lands', 'lands', 100],
  ['storm-chaser', '⛈️', 'storm chaser', 'see 10 lightning strikes', 'strikes', 10],
  ['sundial', '☀️', 'sundial', 'drag the sun through a whole day', 'sunHours', 24],
  ['duck-whisperer', '🦆', 'duck whisperer', 'make the ducks quack 20 times', 'ducks', 20],
  ['photographer', '📷', 'photographer', 'save 5 pictures', 'photos', 5],
  ['legend-hunter', '👑', 'legend hunter', 'find a legendary land', 'legendary', 1],
  ['naturalist', '📖', 'naturalist', 'fill the whole journal', 'found', ENTRIES.size],
];

// What the land's hooks report, and what each one counts toward.
const NOTES = {
  flower: { count: 'flowers' },
  tree: { count: 'trees' },
  duck: { find: 'life:duck', count: 'ducks' },
  rabbit: { find: 'life:rabbit' },
  deer: { find: 'life:deer' },
  fish: { find: 'life:fish' },
  bats: { find: 'life:bats' },
  fireflies: { find: 'life:fireflies' },
};

function load() {
  const fresh = { found: {}, counts: {}, lands: {}, badges: {}, best: null, news: 0 };
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return fresh;
  }
}

// Fold another copy (another tab's) into this one, so neither loses anything.
function merge(into, from) {
  for (const key of ['found', 'lands', 'badges']) {
    for (const [k, v] of Object.entries(from[key] ?? {})) into[key][k] ??= v;
  }
  for (const [k, v] of Object.entries(from.counts ?? {})) into.counts[k] = Math.max(into.counts[k] ?? 0, v);
  if (from.best && (!into.best || from.best.score > into.best.score)) into.best = from.best;
}

// `onGo(seed)` visits a land, from an entry you've already found.
export function createJournal({ button, panel, toasts, onGo }) {
  const data = load();
  let seed = null, rarity = null, lastFlash = 0, saveTimer = 0;

  function save() {
    // Counters tick often (dragging the sun), so writes are batched. Another
    // tab may have saved since, so its finds are folded in first.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      merge(data, load());
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {}
    }, 400);
  }
  addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    merge(data, load());
    if (!panel.hidden) render();
  });

  function toast(emoji, text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = `${emoji} ${text}`;
    toasts.append(el);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => el.classList.add('gone'), 3200);
    setTimeout(() => el.remove(), 4000);
  }

  const progress = (counter) => (counter === 'found' ? Object.keys(data.found).length : counter === 'lands' ? Object.keys(data.lands).length : data.counts[counter] ?? 0);

  function checkBadges() {
    for (const [id, emoji, name, , counter, goal] of BADGES) {
      if (data.badges[id] || progress(counter) < goal) continue;
      data.badges[id] = Date.now();
      toast(emoji, `badge earned: ${name}`);
      flagNews();
    }
  }

  function flagNews() {
    if (!panel.hidden) return render();
    data.news++;
    button.classList.add('has-news');
  }

  function find(id) {
    if (data.found[id] || !ENTRIES.has(id) || seed === null) return;
    const [, emoji, name] = ENTRIES.get(id);
    data.found[id] = { seed, at: Date.now() };
    toast(emoji, `new in your journal: ${name}`);
    flagNews();
    checkBadges();
    save();
  }

  function count(counter, by = 1) {
    data.counts[counter] = (data.counts[counter] ?? 0) + by;
    checkBadges();
    save();
  }

  function render() {
    const found = Object.keys(data.found).length;
    const head = document.createElement('div');
    head.className = 'journal-head';
    head.append(Object.assign(document.createElement('strong'), { textContent: 'journal' }), ` ${found} / ${ENTRIES.size} found`);

    const lines = [];
    if (rarity) {
      lines.push(line(`this land: `, tierTag(rarity), ` · rarer than ${rarity.rarerThan}% of lands`));
      lines.push(line(`its rarest feature: ${rarity.reasons[0]}`));
    }
    if (data.best) lines.push(line(`best find: `, tierTag(data.best), ` · ${data.best.name} (#${data.best.seed})`));
    const status = line('tap something you’ve found to go back there');
    status.className = 'journal-status';

    const sections = SECTIONS.map(([title, items]) => {
      const grid = document.createElement('div');
      grid.className = 'journal-grid';
      for (const [id, emoji, name, hint] of items) {
        const got = data.found[id];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = got ? 'entry' : 'entry missing';
        cell.append(Object.assign(document.createElement('span'), { className: 'entry-icon', textContent: emoji }), name);
        cell.addEventListener('click', () => {
          if (got) onGo(got.seed);
          else status.textContent = `${name}: ${hint}`;
        });
        if (got) cell.title = `found on #${got.seed}`;
        grid.append(cell);
      }
      return [Object.assign(document.createElement('h3'), { textContent: title }), grid];
    });

    const badges = document.createElement('div');
    badges.className = 'journal-badges';
    for (const [id, emoji, name, task, counter, goal] of BADGES) {
      const have = Math.min(progress(counter), goal);
      const row = document.createElement('div');
      row.className = data.badges[id] ? 'badge earned' : 'badge';
      const bar = Object.assign(document.createElement('span'), { className: 'badge-bar' });
      bar.style.setProperty('--k', String(have / goal));
      row.append(
        Object.assign(document.createElement('span'), { className: 'entry-icon', textContent: emoji }),
        Object.assign(document.createElement('span'), { className: 'badge-text', textContent: `${name} · ${task}` }),
        bar,
        Object.assign(document.createElement('span'), { className: 'badge-count', textContent: counter === 'sunHours' ? `${Math.floor(have)} / ${goal} h` : `${Math.floor(have)} / ${goal}` }),
      );
      badges.append(row);
    }

    panel.replaceChildren(head, ...lines, ...sections.flat(), Object.assign(document.createElement('h3'), { textContent: 'badges' }), badges, status);
  }

  function line(...parts) {
    const p = document.createElement('p');
    p.className = 'journal-line';
    p.append(...parts);
    return p;
  }

  return {
    // Arriving on a land: its biome, landmark and curiosities go in the journal.
    visit(land, landSeed, landRarity) {
      seed = landSeed;
      rarity = landRarity;
      const firstTime = !data.lands[seed];
      data.lands[seed] = data.lands[seed] ?? Date.now();
      find(`land:${land.biomeKey}`);
      find(`landmark:${land.landmark}`);
      if (land.hasBalloon) find('odd:balloon');
      if (land.hasWaterfall) find('odd:waterfall');
      if (land.hasLake && land.biomeKey === 'desert') find('odd:oasis');
      if (land.hasLake && land.biomeKey === 'snowfield') find('odd:ice');
      if (firstTime && (rarity.tier === 'epic' || rarity.tier === 'legendary')) {
        toast(rarity.tier === 'legendary' ? '👑' : '💎', `${rarity.tier} land · rarer than ${rarity.rarerThan}% of lands`);
      }
      if (firstTime && rarity.tier === 'legendary') count('legendary');
      if (!data.best || rarity.score > data.best.score) data.best = { seed, name: land.name, tier: rarity.tier, score: rarity.score, rarerThan: rarity.rarerThan };
      checkBadges();
      save();
      if (!panel.hidden) render();
    },

    // Something happened on the land (see `hooks.note` in world.js).
    note(kind) {
      const what = NOTES[kind];
      if (!what) return;
      if (what.find) find(what.find);
      if (what.count) count(what.count);
    },

    count,

    // Every frame: rare sights in the sky, and lakes freezing over.
    watch(env, sky, land) {
      if (env.aurora > 0.5) find('sky:aurora');
      if (env.meteor > 0.5) find('sky:meteor');
      if (env.rainbow > 0.35) find('sky:rainbow');
      if (env.flash > 0.8 && lastFlash <= 0.8) {
        find('sky:lightning');
        count('strikes');
      }
      lastFlash = env.flash;
      const full = Math.abs(sky.moonPhase - 0.5) < 0.04;
      if (full && env.night > 0.7 && sky.moonDir.y > 0.1 && env.overcast < 0.6 && env.mist < 0.5) find('sky:fullmoon');
      if (land.hasLake && env.snowCover > 0.85) find('odd:ice');
    },

    toggle(open = panel.hidden) {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (!open) return;
      data.news = 0;
      button.classList.remove('has-news');
      render();
      save();
    },

    restore() {
      if (data.news) button.classList.add('has-news');
    },
  };
}

// A small colored word for a rarity tier.
export function tierTag({ tier, rarerThan }) {
  const tag = document.createElement('span');
  tag.className = `tier tier-${tier}`;
  tag.textContent = tier;
  if (rarerThan !== undefined) tag.title = `rarer than ${rarerThan}% of lands`;
  return tag;
}
