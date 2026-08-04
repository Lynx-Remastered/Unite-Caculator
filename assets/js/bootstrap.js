// Data loading and application startup. Keep this script last in index.html.
function fetchWithTimeout(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${url} の取得がタイムアウトしました`));
    }, timeoutMs);

    fetch(url).then((response) => {
      window.clearTimeout(timer);
      resolve(response);
    }, (error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

async function fetchJson(label, urls, displayName) {
  let lastError = null;

  for (const url of urls) {
    try {
      setLoadingStatus(`${displayName}を読み込んでいます`, url);
      const response = await fetchWithTimeout(url, DATA_FETCH_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`${url} が HTTP ${response.status} を返しました`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`${label} を取得できませんでした${lastError ? `（${lastError.message}）` : ""}`);
}

async function loadData() {
  const pokemon = await fetchJson("pokemon.json", DATA_SOURCES.pokemon, "ポケモンデータ");
  const stats = await fetchJson("stats.json", DATA_SOURCES.stats, "能力値データ");
  const heldItems = await fetchJson("held_items.json", DATA_SOURCES.heldItems, "持ち物データ");
  const emblems = await fetchJson("emblems.json", DATA_SOURCES.emblems, "サポートメダルデータ");
  const emblemSets = await fetchJson("emblem_sets.json", DATA_SOURCES.emblemSets, "メダル色効果データ");
  const emblemNamesJa = await fetchJson("emblem_names_ja.json", DATA_SOURCES.emblemNamesJa, "メダル日本語名データ");
  const moveNamesJa = await fetchJson("move_names_ja.json", DATA_SOURCES.moveNamesJa, "技の日本語名データ");
  const wikiMoveDescriptionsJa = await fetchJson("wiki_move_descriptions_ja.json", DATA_SOURCES.wikiMoveDescriptionsJa, "技説明のWiki日本語データ");
  const slowDescriptionsJa = await fetchJson("slow_descriptions_ja.json", DATA_SOURCES.slowDescriptionsJa, "減速説明の日本語データ");
  const patchNotes = await fetchJson("patch_notes.json", DATA_SOURCES.patchNotes, "バランス調整履歴");

  state.pokemon = pokemon;
  state.stats = stats;
  state.heldItems = heldItems;
  state.emblems = emblems;
  state.emblemSets = emblemSets;
  state.emblemNamesJa = emblemNamesJa;
  state.moveNamesJa = moveNamesJa;
  state.wikiMoveDescriptionsJa = wikiMoveDescriptionsJa;
  state.slowDescriptionsJa = slowDescriptionsJa;
  state.patchNotes = patchNotes;
}

async function init() {
  try {
    bindElements();
    applyMode(document.documentElement.dataset.mode || "dark", false);
    applyTheme(document.documentElement.dataset.theme || "charmander", false);
    wireEvents();
    await loadData();
    populateControls();
    el.loading.hidden = true;
    el.calculator.hidden = false;
    selectCalculatorTab(state.activeTab);
  } catch (error) {
    showLoadError(error);
  }
}

init();
