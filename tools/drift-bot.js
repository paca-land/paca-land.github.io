// Drift balance-and-text bot. On an origin of your own (e.g. http://bot-en.localhost:8417/),
// set localStorage paca-alpha = 'true' and paca-lang = 'en' or 'zh', reload, then run
//   await import(`/tools/drift-bot.js?${Date.now()}`)
// in the console. await __bot(n, { landmark, story }) plays n voyages (landmark: how often
// it taps the building on an island; story: how often it picks a story option);
// __scan() reports the text it saw (anything broken, untranslated, thrown) and the book;
// __why lists how each voyage ended.
{
  const map = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  // The page's own module URLs (relative to the page, not to this file).
  const mod = (n) => import(new URL(map[`./js/${n}`], document.baseURI).href);
  const V = await mod('voyage.js'), W = await mod('world.js'), L = await mod('lexicon.js'), I = await mod('i18n.js');
  await L.loadWords();
  const pool = [...new Set([...L.WIND_WORDS, ...L.MEANINGS.flatMap((m) => [...m.words]), ...Object.keys(L.SECRETS), 'abcdefg', 'zoqua'])].filter((w) => /^[a-z]+$/.test(w));
  const seen = (window.__seen ??= new Set());
  const last = (sel) => [...document.querySelectorAll(sel)].pop();
  const TAPS = ['rabbit', 'deer', 'duck', 'sheep', 'goat', 'squirrel', 'lizard', 'penguin', 'frog', 'crab', 'snail', 'giraffe', 'panda', 'alpaca', 'cow', 'hen', 'hedgehog', 'camel', 'tortoise', 'monkey', 'peacock', 'crow', 'seal', 'flamingo', 'unicorn', 'mouse'];
  const NAMES = ['Mei', 'Ana Lu', '', 'Juniper Quill'];
  window.__errors ??= [];
  if (!window.__listening) {
    window.__listening = true;
    window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
  }
  window.__why ??= [];
  window.__harm ??= {}; // what tore the balloon, by reason
  window.__bot = async (runs, { landmark = 0.6, story: storyP = 0.8 } = {}) => {
    const results = [];
    for (let k = 0; k < runs; k++) {
      localStorage.removeItem('paca-voyage');
      let v, hours = 6.5, here = null;
      v = V.createVoyage({ fly: (seed) => { const land = W.generateLand(seed, v.landOptions(seed)); here = land; v.vibe(seed, land); v.update({ night: hours % 24 >= 20.5 || hours % 24 < 5.5 ? 1 : 0 }); v.arrived(land, seed); }, leave() {}, setClock(h) { hours = h; v.update({ night: h % 24 >= 20.5 || h % 24 < 5.5 ? 1 : 0 }); }, clearStorm() {}, toast: (e, t) => { seen.add(t); if (e === '💔') { const why = t.replace(/[“”"][^“”"]*[“”"]/g, '“…”'); window.__harm[why] = (window.__harm[why] ?? 0) + 1; } } });
      const card = last('.voyage-card'), read = last('.voyage-read'), status = last('.voyage-status'), book = last('.voyage-book'), tip = last('.voyage-tip');
      const gauges = [...document.querySelectorAll('.voyage-gauges')].slice(-2);
      last('.sail-pill').click();
      let result = null, stories = 0;
      for (let step = 0; step < 600 && !result; step++) {
        for (const n of [card, read, status]) if (!n.hidden) seen.add(n.innerText);
        if (step % 3 === 0) for (const g of gauges) for (const x of g.querySelectorAll('.gauge')) { x.click(); seen.add(tip.innerText); x.click(); }
        for (const p of document.querySelectorAll('.voyage-popup')) seen.add(p.textContent);
        if (!card.hidden) {
          const title = card.querySelector('h2').textContent;
          if (['天边', '迷失在云中', 'the Edge of the Sky', 'lost in the clouds', 'Ha’s kite', 'Ha 的风筝'].includes(title)) { seen.add(card.innerText); result = title; window.__why.push(card.querySelector('.voyage-text')?.textContent.slice(0, 100)); break; }
          const field = card.querySelector('input.voyage-password');
          if (field) field.value = NAMES[Math.floor(Math.random() * NAMES.length)];
          const opts = [...card.querySelectorAll('.voyage-option')].filter((b) => !b.disabled);
          if (!opts.length) { result = 'stuck on a card: ' + title; break; }
          if (opts.length > 1 && opts[0].classList.contains('primary') && /^(not now|以后再说|下次再说)/.test(opts[opts.length - 1].textContent)) { opts[0].click(); continue; }
          const story = opts.find((b) => /chapter \d|第 \d/.test(b.textContent));
          if (story && Math.random() < storyP) { stories++; story.click(); continue; }
          // A careful player mends a leaking burner, and buys fuel when it runs low.
          const fuelNow = (() => { try { return JSON.parse(localStorage.getItem('paca-voyage')).fuel; } catch { return 99; } })();
          const needed = opts.find((b) => /mend the burner|修好燃烧器/.test(b.textContent))
            ?? (fuelNow < 10 && opts.find((b) => /buy lamp oil|buy fuel|买些灯油|买燃料/.test(b.textContent)));
          if (needed) { needed.click(); continue; }
          (opts.find((b) => b.classList.contains('primary') && Math.random() < 0.7) ?? opts[Math.floor(Math.random() * opts.length)]).click();
          continue;
        }
        if (step % 5 === 0) { v.toggleBook(); seen.add(book.innerText); v.toggleBook(); }
        // Trees and water for supplies (as a player would), and one creature to say hello to.
        // (And whatever a pack island has to tap: geysers, fallen stars, jellyfish, the glass.)
        for (const kind of ['tree', 'splash', 'tree', TAPS[Math.floor(Math.random() * TAPS.length)], ...(here?.dog ? [here.dog] : []), ...(here?.bottle ? ['bottle'] : []), ...['geyser', 'star', 'jelly', 'globe'].filter(() => Math.random() < 0.5)]) { v.note(kind); v.tapped({ clientX: 0, clientY: 0 }); }
        if (Math.random() < landmark) v.note('landmark');
        if (!card.hidden) continue;
        // A fraying rope gets mended before take-off.
        const rope = [...status.querySelectorAll('.chip')].find((c) => c.textContent.includes('🪢'));
        if (rope) rope.click();
        // Low on hearts, a careful player waits out a storm, patches the balloon from the
        // pack, and puts the umbrella up before a stormy take-off.
        const now = (() => { try { return JSON.parse(localStorage.getItem('paca-voyage')); } catch { return null; } })();
        if (now) {
          const storm = [...status.querySelectorAll('.chip')].find((c) => /wait out the storm|等风暴过去/.test(c.textContent));
          const pack = [...status.querySelectorAll('.chip')].find((c) => c.textContent.includes('🎒'));
          const use = (re) => {
            pack.click();
            const o = [...card.querySelectorAll('.voyage-option')].find((b) => !b.disabled && re.test(b.textContent));
            (o ?? [...card.querySelectorAll('.voyage-option')].pop()).click();
          };
          if (pack && now.hull <= 2 && now.pack.includes('patch')) use(/patch kit|补丁包/);
          else if (pack && storm && now.pack.includes('umbrella') && !now.flags.umbrella) use(/umbrella|雨伞/);
          else if (storm && now.hull <= 3) storm.click();
          // The pack's other tools, when they'd help: a swallowed letter back, a sighting, a kite on a calm day, a full thermos.
          else if (pack && now.pack.includes('eraser') && now.banned.length) use(/eraser|橡皮擦/);
          else if (pack && now.pack.includes('spyglass') && !now.sighting) use(/spyglass|望远镜/);
          else if (pack && now.pack.includes('boxkite') && !storm && !(now.flags.boxkite > 0)) use(/box kite|风筝/);
          else if (pack && now.pack.includes('thermos') && !now.flags.thermos) use(/thermos|保温壶/);
        }
        // Mending and waiting take hours, and the Hush may catch up meanwhile: its card comes first.
        if (!card.hidden) continue;
        // Like a careful player: a word that opens the gate ahead if there is one,
        // otherwise a short safe word (to save fuel for the gates), otherwise any safe one.
        let flew = false, fallback = null;
        const opens = [], short = [], safe = [];
        // Wa's words the book knows (from wizards and her camp page) come first, as a player would try them at the Edge.
        const known = (() => {
          try {
            const bk = JSON.parse(localStorage.getItem('paca-language') ?? '{}');
            return [...Object.keys(bk.secrets ?? {}), bk.pages?.camp, bk.found && 'wa'].filter((w) => typeof w === 'string');
          } catch {
            return [];
          }
        })();
        for (let i = 0; i < 160 + known.length && opens.length < 1 && short.length < 3; i++) {
          const w = i < known.length ? known[i] : pool[Math.floor(Math.random() * pool.length)];
          v.preview(w);
          if (!read.hidden) seen.add(read.innerText);
          const warn = read.querySelector('.read-warn')?.textContent ?? '';
          const bad = /不会为这个词打开|只为真正的英文单词|撑不过|燃料不够|won’t open|only opens for real|won’t survive|not enough fuel/.test(warn) || read.querySelector('.read-problem');
          if (!bad && /🚪/.test(read.querySelector('.read-good')?.textContent ?? '')) opens.push(w);
          else if (i < known.length) continue; // saved for a gate
          else if (!bad && w.length <= 6) short.push(w);
          else if (!bad) safe.push(w);
          else if (!fallback && !read.querySelector('.read-problem') && !/燃料不够|not enough fuel/.test(warn)) fallback = w;
        }
        for (const w of [...opens, ...short, ...safe]) if ((flew = v.submit(w))) break;
        if (!flew && fallback) flew = v.submit(fallback);
        if (!flew) {
          const chip = [...status.querySelectorAll('.chip')].pop();
          if (chip) chip.click();
          else {
            // A short wind word costs least; if even that can't go, it's a real strand.
            const cheap = L.WIND_WORDS.filter((w) => w.length <= 4).find((w) => v.submit(w));
            if (!cheap) { result = 'stuck: ' + status.innerText; break; }
          }
        }
        if (parseInt(last('.voyage-progress')?.dataset.label ?? '', 10) >= 100) await new Promise((r) => setTimeout(r, 6300));
      }
      results.push(`${result} · stories ${stories}`);
      last('.voyage-card .voyage-option:last-child')?.click();
    }
    return results;
  };
  window.__scan = () => {
    const all = [...seen].filter(Boolean);
    const bk = JSON.parse(localStorage.getItem('paca-language'));
    const arcs = Object.entries(bk.arcs ?? {}).map(([id, a]) => `${id}:${a.ch}${a.done ? '✓' : ''}`).join(' ');
    return { n: all.length, missing: [...I.missing], errors: window.__errors, bad: all.filter((s) => /undefined|NaN|\{|\}|\[object/.test(s)).slice(0, 5), arcs, name: bk.name, found: bk.found, voyages: bk.voyages.map((x) => `${x.won ? 'W' : 'L'}${x.words.length - 1}`).join(' ') };
  };
}
