// A text-only way to play Drift (paca.land's word-voyage game), for playtesting.
// Paste this whole file into javascript_exec on a page of your own origin (e.g.
// http://play-en.localhost:8417/), after setting localStorage 'paca-alpha' to
// 'true' and 'paca-lang' to 'en' or 'zh', and reloading. It makes window.__play:
//
//   await __play.start()      begin (or continue) a voyage; returns look()
//   __play.look()             what's on screen right now (see below)
//   __play.choose(n)          click option n on the open card
//   __play.write('text')      type into the text box on the open card, if it has one
//   __play.preview('word')    what the sky says about a word as you type it (the preview box)
//   __play.fly('word')        say the word and fly there (Enter); { flew: false } if the sky refused
//   __play.tap('tree')        tap something on the island: 'tree', 'water', 'landmark', or an animal
//                             you can see there (look() lists them under scene)
//   __play.book()             open the book (the book button), read it, close it
//   __play.chip(n)            press status-line button n (e.g. "wait out the storm")
//
// look() returns: scene (time, weather, the island you're on and what you can see on it),
// card (title, text, numbered options with their notes), story (the arrival text or the
// preview box), status (the line under it, and its buttons), gauges and aboard (each badge
// at the top with the explanation shown when you hover it), progress, and toasts (pop-up
// messages since the last look).
window.__play = await (async () => {
  // The same module versions the page uses (from its import map).
  const map = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  const mod = (name) => import(map[`./js/${name}`]);
  const V = await mod('voyage.js');
  const W = await mod('world.js');
  const S = await mod('sky.js');
  const L = await mod('lexicon.js');
  const { t } = await mod('i18n.js');
  await L.loadWords();
  const toasts = [];
  let hours = 6.5;
  let weather = null;
  let land = null;
  let voyage = null;
  const env = () => ({
    night: hours % 24 >= 20.5 || hours % 24 < 5.5 ? 1 : 0,
    rain: ['rain', 'storm'].includes(weather) ? 1 : 0,
    snowCover: weather === 'snow' ? 0.6 : 0,
  });
  voyage = V.createVoyage({
    fly(seed) {
      land = W.generateLand(seed, voyage.landOptions(seed));
      weather = voyage.vibe(seed, land)?.weather ?? null;
      voyage.update(env());
      voyage.arrived(land, seed);
    },
    leave() {
      land = null;
    },
    setClock(h) {
      hours = h;
      voyage.update(env());
    },
    clearStorm() {
      weather = 'cloudy';
      voyage.update(env());
    },
    toast(emoji, text) {
      toasts.push(`${emoji} ${text}`);
    },
  });
  const last = (sel) => [...document.querySelectorAll(sel)].pop();
  const card = last('.voyage-card');
  const read = last('.voyage-read');
  const status = last('.voyage-status');
  const book = last('.voyage-book');
  const tip = last('.voyage-tip');
  const pill = last('.sail-pill');
  const progress = last('.voyage-progress');
  const [gaugeRow, aboardRow] = [...document.querySelectorAll('.voyage-gauges')].slice(-2);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (h) => `${pad(Math.floor(h % 24))}:${pad(Math.floor((h % 1) * 60))}`;
  const lines = (node) => (node.hidden ? [] : node.innerText.split('\n').map((s) => s.trim()).filter(Boolean));
  const tipsOf = (row) => [...row.querySelectorAll('.gauge')].map((g) => {
    g.click();
    const text = tip.innerText.split('\n').map((s) => s.trim()).filter(Boolean).join(' — ');
    g.click();
    return `${g.textContent} :: ${text}`;
  });
  const ANIMALS = { rabbit: 'rabbit', deer: 'deer', duck: 'duck', sheep: 'sheep', goat: 'goat', squirrel: 'squirrel', lizard: 'lizard', penguin: 'penguin', frog: 'frog', crab: 'crab', snail: 'snail', giraffe: 'giraffe', panda: 'panda' };
  // Which animals live here: poke each tappable herd once on this (unseen) land and
  // listen for what it says. Worked out once per island.
  const THREE = await import('three');
  let herd = null;
  const animals = () => {
    if (herd?.land === land) return herd.kinds;
    const kinds = new Set();
    const { note, sound } = land.hooks;
    land.hooks.note = (k) => ANIMALS[k] && kinds.add(k);
    land.hooks.sound = () => {};
    for (const c of land.clickables) {
      if (!c.isInstancedMesh || !c.count) continue;
      try {
        c.userData.onClick?.({ instanceId: 0, point: new THREE.Vector3(), object: c });
      } catch {}
    }
    Object.assign(land.hooks, { note, sound });
    herd = { land, kinds: [...kinds] };
    return herd.kinds;
  };
  const sights = () => {
    const seen = [t(land.biome.label)];
    const lm = { stones: 'standing stones', wizard: "wizard's tower" }[land.landmark] ?? land.landmark;
    if (lm && lm !== 'none') seen.push(t(lm));
    if (land.hasLake) seen.push(t('a lake'));
    if (land.hasWaterfall) seen.push(t('a waterfall'));
    if (land.hasBalloon) seen.push(t('a hot-air balloon'));
    const here = animals();
    if (here.length) seen.push(`animals: ${here.join(', ')}`);
    return seen.join(', ');
  };

  function look() {
    const out = {};
    if (land && voyage.active) {
      const name = voyage.word().replace(/^./, (c) => c.toUpperCase());
      out.scene = `${clock(hours)} · ${weather ? t(S.WEATHERS[weather].label) : ''} · ${name} (${sights()})`;
    }
    if (!card.hidden) {
      out.card = {
        title: card.querySelector('h2')?.textContent,
        text: [...card.querySelectorAll('.voyage-text, .voyage-poem')].filter((p) => !p.hidden).map((p) => p.textContent),
        textbox: card.querySelector('input') ? `a text box (“${card.querySelector('input').placeholder}”): use write('…')` : undefined,
        options: [...card.querySelectorAll('.voyage-option')].map((b, i) => {
          const label = b.querySelector('.option-label')?.textContent;
          const note = b.querySelector('.option-note')?.textContent;
          return `${i}: ${label}${note ? ` — ${note}` : ''}${b.disabled ? ' (greyed out)' : ''}`;
        }),
      };
    }
    out.story = lines(read);
    out.status = lines(status);
    const chips = [...status.querySelectorAll('.chip')].map((c, i) => `${i}: ${c.textContent}`);
    if (chips.length) out.buttons = chips;
    if (voyage.active) {
      out.gauges = tipsOf(gaugeRow);
      out.aboard = tipsOf(aboardRow);
      out.progress = progress.dataset.label;
    } else {
      out.pill = pill.hidden ? null : pill.textContent;
    }
    out.toasts = toasts.splice(0);
    return out;
  }

  return {
    async start() {
      pill.click();
      return look();
    },
    look,
    choose(n) {
      const options = [...card.querySelectorAll('.voyage-option')];
      if (card.hidden || !options[n]) return { error: 'no such option', ...look() };
      if (options[n].disabled) return { error: 'that option is greyed out', ...look() };
      options[n].click();
      return look();
    },
    write(text) {
      const field = card.querySelector('input');
      if (card.hidden || !field) return { error: 'there is no text box on this card', ...look() };
      field.value = text;
      return look();
    },
    preview(word) {
      voyage.preview(word);
      return lines(read);
    },
    fly(word) {
      voyage.preview(word);
      const why = lines(read);
      const flew = voyage.submit(word);
      return flew ? { flew, ...look() } : { flew, why, ...look() };
    },
    tap(kind) {
      if (!land) return { error: 'not on an island' };
      let note = kind;
      if (kind === 'water') {
        if (!land.hasLake) return { error: 'there is no water on this island' };
        note = weather === 'snow' && land.biomeKey === 'snowfield' ? 'ice' : 'splash';
      }
      if (kind === 'landmark' && (!land.landmark || land.landmark === 'none')) return { error: 'there is no building on this island' };
      if (ANIMALS[kind] && !animals().includes(kind)) return { error: `there is no ${kind} on this island` };
      const before = document.querySelectorAll('.voyage-popup').length;
      voyage.note(note);
      voyage.tapped({ clientX: 0, clientY: 0 });
      const pops = [...document.querySelectorAll('.voyage-popup')];
      return { popup: pops.length > before ? pops[pops.length - 1].textContent : null, ...look() };
    },
    book() {
      voyage.toggleBook();
      const text = book.innerText;
      voyage.toggleBook();
      return text;
    },
    chip(n) {
      const chips = [...status.querySelectorAll('.chip')];
      if (!chips[n]) return { error: 'no such button', ...look() };
      chips[n].click();
      return look();
    },
  };
})();
'ready';
