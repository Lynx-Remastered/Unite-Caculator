import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const WIKI_BASE_URL = "https://wikiwiki.jp/poke-unite/";
const OUTPUT_PATH = resolve(ROOT, "data", "wiki_move_descriptions_ja.json");
const REQUEST_INTERVAL_MS = 900;
const REQUEST_LIMIT = Math.max(
  1,
  Number.parseInt(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "15", 10)
);
const ONLY_POKEMON = new Set(
  (process.argv.find((arg) => arg.startsWith("--pokemon="))?.slice("--pokemon=".length) || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
);
const PAGE_NAME_OVERRIDES = Object.freeze({
  Rapidash: "ガラルギャロップ",
  MewtwoX: "ミュウツー(X)",
  MewtwoY: "ミュウツー(Y)",
  Scyther: "ハッサム"
});
const GENERIC_HEADINGS = /^(?:特性|通常攻撃|わざ[12].*|ユナイトわざ.*)$/;

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function cleanText(html) {
  return decodeHtml(
    String(html || "")
      .replace(/<br\b[^>]*>/gi, "\n")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeMoveName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[＋+]\s*$/u, "")
    .replace(/^ユナイトわざ[:：]\s*/u, "")
    .replace(/\s+/g, "")
    .trim();
}

function htmlRows(tableHtml) {
  return [...String(tableHtml || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1]);
}

function htmlCells(rowHtml) {
  return [...String(rowHtml || "").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((match) => match[1]);
}

function strongTexts(html) {
  return [...String(html || "").matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function meaningfulDescription(value) {
  const text = String(value || "").trim();
  return text
    && !/^レベル\d+になったとき/u.test(text)
    && !/^以下\d+つのわざ/u.test(text);
}

function parseWikiMoveTable(tableHtml, heading, moves) {
  let currentMove = "";
  for (const row of htmlRows(tableHtml).slice(1)) {
    const names = strongTexts(row).filter((name) => !GENERIC_HEADINGS.test(name));
    if (names.length) currentMove = names.at(-1);
    if (!currentMove || !/<td\b[^>]*\bcolspan\s*=\s*["']?[23]/i.test(row)) continue;
    const description = cleanText(row);
    if (!meaningfulDescription(description)) continue;
    const key = normalizeMoveName(currentMove);
    if (key && !moves.has(key)) moves.set(key, description);
    currentMove = "";
  }
}

function parseWikiPage(html) {
  const battleDataIndex = html.search(/<h2\b[^>]*>[\s\S]*?バトルデータ[\s\S]*?<\/h2>/i);
  const overviewHtml = battleDataIndex >= 0 ? html.slice(0, battleDataIndex) : html;
  const tables = [...overviewHtml.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((match) => match[0]);
  const parsed = { passive: "", basic: "", moves: new Map() };

  for (const table of tables) {
    const rows = htmlRows(table);
    if (!rows.length) continue;
    const heading = strongTexts(rows[0])[0] || "";
    if (heading === "特性") {
      const cells = htmlCells(rows[1] || "");
      parsed.passive = cleanText(cells.at(-1) || "");
    } else if (heading === "通常攻撃") {
      parsed.basic = htmlRows(table)
        .slice(1)
        .map((row) => cleanText(row))
        .filter(Boolean)
        .join("\n");
    } else if (/^(?:わざ[12]|ユナイトわざ)/u.test(heading)) {
      parseWikiMoveTable(table, heading, parsed.moves);
    }
  }

  return parsed;
}

function pokemonJapaneseNames(indexHtml) {
  const match = indexHtml.match(/const POKEMON_JA\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!match) throw new Error("index.html から POKEMON_JA を取得できませんでした。");
  return JSON.parse(match[1]);
}

function descriptionKey(pokemon, skill, node, rsbKey) {
  return [pokemon.name, skill.ability, node.name, rsbKey].join("::");
}

function findMoveDescription(parsed, japaneseMoveName) {
  const wanted = normalizeMoveName(japaneseMoveName);
  if (parsed.moves.has(wanted)) return parsed.moves.get(wanted);
  const partial = [...parsed.moves.entries()].find(([name]) => name.includes(wanted) || wanted.includes(name));
  return partial ? partial[1] : "";
}

async function fetchWikiPage(pageName) {
  const url = `${WIKI_BASE_URL}${encodeURIComponent(pageName)}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Unite-Caculator data updater (Japanese move descriptions)"
      },
      redirect: "follow"
    });
    if (response.ok) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, REQUEST_INTERVAL_MS));
      return { url, html: await response.text() };
    }
    if (response.status !== 429 || attempt === 3) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }
    const retryAfterSeconds = Number.parseInt(response.headers.get("retry-after") || "", 10);
    const retryDelay = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : (attempt + 1) * 2500;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelay));
  }
  throw new Error("取得を再試行できませんでした。");
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const [indexHtml, pokemon, moveNamesJa, existing] = await Promise.all([
  readFile(resolve(ROOT, "index.html"), "utf8"),
  readFile(resolve(ROOT, "data", "pokemon.json"), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, "data", "move_names_ja.json"), "utf8").then(JSON.parse),
  readFile(OUTPUT_PATH, "utf8").then(JSON.parse).catch(() => ({ entries: {}, pages: {}, failed_pages: {} }))
]);
const pokemonNamesJa = pokemonJapaneseNames(indexHtml);
const entries = { ...(existing.entries || {}) };
const pages = { ...(existing.pages || {}) };
const failedPages = { ...(existing.failed_pages || {}) };
for (const [pokemonName, pageName] of Object.entries(PAGE_NAME_OVERRIDES)) {
  if (failedPages[pokemonName] && failedPages[pokemonName].page !== pageName) {
    delete failedPages[pokemonName];
  }
}
const misses = [];
const pendingPokemon = pokemon
  .filter((pokemonEntry) => (
    !pages[pokemonEntry.name]
    && !failedPages[pokemonEntry.name]
    && (!ONLY_POKEMON.size || ONLY_POKEMON.has(pokemonEntry.name))
  ))
  .slice(0, REQUEST_LIMIT);

await mapWithConcurrency(pendingPokemon, 1, async (pokemonEntry) => {
  const pageName = PAGE_NAME_OVERRIDES[pokemonEntry.name] || pokemonNamesJa[pokemonEntry.name];
  if (!pageName) {
    misses.push({ pokemon: pokemonEntry.name, reason: "日本語ページ名なし" });
    failedPages[pokemonEntry.name] = { page: "", reason: "日本語ページ名なし" };
    return;
  }

  let fetched;
  try {
    fetched = await fetchWikiPage(pageName);
  } catch (error) {
    misses.push({ pokemon: pokemonEntry.name, page: pageName, reason: error.message });
    if (!String(error.message).startsWith("429")) {
      failedPages[pokemonEntry.name] = { page: pageName, reason: error.message };
    }
    return;
  }

  const parsed = parseWikiPage(fetched.html);
  pages[pokemonEntry.name] = { page: pageName, url: fetched.url };
  for (const skill of pokemonEntry.skills || []) {
    for (const node of [skill, ...(skill.upgrades || [])]) {
      let overview = "";
      if (skill.ability === "Passive") {
        overview = parsed.passive;
      } else if (skill.ability === "Basic") {
        overview = parsed.basic;
      } else {
        overview = findMoveDescription(parsed, moveNamesJa[node.name] || node.name);
      }
      if (!overview) continue;
      for (const rsbKey of ["rsb", "boosted_rsb"]) {
        if (!node[rsbKey]) continue;
        entries[descriptionKey(pokemonEntry, skill, node, rsbKey)] = [
          { label: "技の概要", text: overview }
        ];
      }
    }
  }
});

const output = {
  source: "ポケモンユナイトWiki* のポケモン別ページにある技一覧の日本語説明",
  source_index: "https://wikiwiki.jp/poke-unite/一覧/目次",
  generated_at: new Date().toISOString(),
  pages,
  failed_pages: failedPages,
  entries
};
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8"
);

console.log(`Japanese Wiki descriptions: ${Object.keys(entries).length} entries from ${Object.keys(pages).length} pages.`);
const remaining = ONLY_POKEMON.size
  ? [...ONLY_POKEMON].filter((name) => !pages[name] && !failedPages[name]).length
  : Math.max(0, pokemon.length - Object.keys(pages).length - Object.keys(failedPages).length);
console.log(`Fetched this run: ${pendingPokemon.length}; remaining: ${remaining}.`);
if (misses.length) console.log(`Page misses: ${JSON.stringify(misses, null, 2)}`);
