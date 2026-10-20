// Checks every content pack (js/packs/), in the page console on an origin of your own:
//   const { packCheck } = await import('/tools/pack-check.js?' + Date.now()); await packCheck();
// For each pack island and dressed island it grows a few lands, scans their
// geometry and instance matrices for non-finite numbers, runs updates under
// extreme weather and taps everything tappable; for each building it checks it
// fits on each of its homes. It also checks that every pack word really calls
// its own island or building (an older meaning keeps a word both lists claim),
// that buildings only stand on voyage-only islands, and that each part a pack
// needs is there. Returns { problems, lands, ms }.
const map = JSON.parse(document.querySelector('script[type=importmap]').textContent).imports;
const mod = (n) => import(new URL(map[`./js/${n}`], document.baseURI).href);

export async function packCheck({ seeds = 6 } = {}) {
  const t0 = performance.now();
  const [W, L, P, T, S] = await Promise.all([mod('world.js'), mod('lexicon.js'), mod('packs/index.js'), mod('tales.js'), mod('stories.js')]);
  const THREE = await import('three');
  const problems = [];
  const bad = (what) => problems.push(what);

  // Parts each kind of pack needs.
  for (const [id, island] of Object.entries(P.ISLANDS)) {
    for (const key of ['biome', 'species', 'word', 'note', 'journal', 'trees', 'reach']) if (!island[key]) bad(`${id}: no ${key}`);
    if (!W.BIOMES[id] || W.BIOMES[id].weight) bad(`${id}: not a voyage-only island`);
    if (!T.REACHES.some((r) => r.islands.some(([k]) => k === id))) bad(`${id}: in no reach`);
  }
  for (const [id, b] of Object.entries(P.BUILDINGS)) {
    for (const key of ['find', 'build', 'label', 'homes', 'word', 'note', 'journal', 'event', 'arc']) if (!b[key]) bad(`${id}: no ${key}`);
    if (b.arc && b.arc.chapters?.length !== 3) bad(`${id}: its story needs three chapters`);
    if (!S.ARCS[id]) bad(`${id}: its story isn't in ARCS`);
    for (const [home] of b.homes ?? []) {
      if (!W.BIOMES[home]) bad(`${id}: home ${home} doesn't exist`);
      else if (W.BIOMES[home].weight) bad(`${id}: home ${home} is an ordinary island (free lands would change)`);
    }
  }
  for (const id of Object.keys(P.DRESSINGS)) if (!W.BIOMES[id] || W.BIOMES[id].weight) bad(`dressing ${id}: not a voyage-only island`);
  for (const [kind, packs, keys] of [['omen', P.OMENS, ['name', 'line']], ['tool', P.ITEMS, ['icon', 'name', 'line', 'use']], ['keepsake', P.KEEPSAKES, ['icon', 'name', 'line']]]) {
    for (const [id, p] of Object.entries(packs)) for (const key of keys) if (!p[key]) bad(`${kind} ${id}: no ${key}`);
  }

  // Every pack word calls its own island or building.
  for (const [key, packs] of [['biome', P.ISLANDS], ['landmark', P.BUILDINGS]]) {
    for (const [id, p] of Object.entries(packs)) {
      for (const word of p.word.words.split(' ')) {
        const reading = L.readWord(word);
        if (reading.problem) continue;
        if (reading.effect[key] !== id) bad(`“${word}” calls ${reading.effect[key] ?? 'nothing'}, not ${id} (${reading.meanings.map((m) => m.id).join(', ')})`);
      }
    }
  }

  // Grow lands, scan them, update them hard, tap everything.
  const finite = (arr) => { for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) return false; return true; };
  const envs = [
    { e: 1, night: 0, overcast: 0, rain: 0, snow: 0, mist: 0, wet: 0, snowCover: 0, gloom: 0, wind: 1, flash: 0, sunDir: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
    { e: -0.3, night: 1, overcast: 1, rain: 1, snow: 0, mist: 0, wet: 1, snowCover: 0, gloom: 1, wind: 3, flash: 1, sunDir: new THREE.Vector3(0.2, -0.6, 0.7).normalize() },
    { e: 0.2, night: 0.4, overcast: 0.5, rain: 0, snow: 1, mist: 1, wet: 0, snowCover: 1, gloom: 0.5, wind: 0, flash: 0, sunDir: new THREE.Vector3(-0.9, 0.1, 0.1).normalize() },
  ];
  const lands = [];
  const grow = (seed, want, label) => {
    let land;
    try {
      land = W.generateLand(seed, want);
    } catch (e) {
      bad(`${label} ${seed}: ${e.message}`);
      return null;
    }
    land.hooks.sound = () => {};
    land.hooks.note = () => {};
    land.hooks.play = () => {};
    land.group.traverse((o) => {
      const pos = o.geometry?.attributes?.position;
      if (pos && !finite(pos.array)) bad(`${label} ${seed}: NaN in ${o.geometry.type}`);
      if (o.isInstancedMesh && !finite(o.instanceMatrix.array)) bad(`${label} ${seed}: NaN in an instanced ${o.geometry.type}`);
    });
    try {
      let time = 0;
      for (const env of envs) for (let k = 0; k < 40; k++) land.update((time += 0.25), 0.25, { ...env, poke: 0 });
    } catch (e) {
      bad(`${label} ${seed}: update ${e.message}`);
    }
    for (const target of land.clickables) {
      let o = target;
      while (o && !o.userData.onClick) o = o.parent;
      if (!o) continue;
      try {
        o.userData.onClick({ point: target.getWorldPosition(new THREE.Vector3()), instanceId: 0, face: { normal: new THREE.Vector3(0, 1, 0) }, object: target });
      } catch (e) {
        bad(`${label} ${seed}: tap ${target.geometry?.type ?? target.type}: ${e.message}`);
      }
    }
    land.group.traverse((o) => {
      if (o.isInstancedMesh && !finite(o.instanceMatrix.array)) bad(`${label} ${seed}: NaN after updating an instanced ${o.geometry.type}`);
    });
    lands.push(label);
    return land;
  };
  for (const id of [...Object.keys(P.ISLANDS), ...Object.keys(P.DRESSINGS)]) {
    for (let i = 0; i < seeds; i++) grow(`${id}-${i}`, { biome: id }, id);
  }
  for (const [id, b] of Object.entries(P.BUILDINGS)) {
    for (const [home] of b.homes) {
      let fits = 0;
      for (let i = 0; i < 3; i++) if (grow(`${id}@${home}-${i}`, { biome: home, landmark: id }, `${id}@${home}`)?.landmark === id) fits++;
      if (!fits) bad(`${id} never fits on ${home}`);
    }
  }
  return { problems, lands: lands.length, ms: Math.round(performance.now() - t0) };
}
