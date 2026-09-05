const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "index.html");

function fail(message) {
  throw new Error(message);
}

function localAssetPaths(html, attribute, tagPattern) {
  return [...html.matchAll(tagPattern)]
    .map((match) => match[attribute])
    .filter((assetPath) => !/^(?:[a-z]+:|\/\/|#)/i.test(assetPath));
}

function assertUnique(paths, label) {
  const duplicates = paths.filter((assetPath, index) => paths.indexOf(assetPath) !== index);
  if (duplicates.length) fail(`${label} contains duplicate references: ${[...new Set(duplicates)].join(", ")}`);
}

function assertFilesExist(paths, label) {
  const missing = paths.filter((assetPath) => !fs.existsSync(path.join(ROOT, assetPath)));
  if (missing.length) fail(`${label} contains missing files: ${missing.join(", ")}`);
}

function assertBalancedCss(css, fileName) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const character of withoutComments) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) fail(`${fileName} has an unexpected closing brace`);
  }
  if (depth !== 0) fail(`${fileName} has unbalanced braces`);
}

function validateJavaScript(html, scriptPaths) {
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]);
  const applicationScripts = scriptPaths.map((scriptPath) => fs.readFileSync(path.join(ROOT, scriptPath), "utf8"));
  new vm.Script([...inlineScripts, ...applicationScripts].join("\n;\n"), {
    filename: "combined-static-app.js"
  });
}

function validateJsonData() {
  const dataDirectory = path.join(ROOT, "data");
  const files = fs.readdirSync(dataDirectory).filter((fileName) => fileName.endsWith(".json"));
  for (const fileName of files) {
    const filePath = path.join(dataDirectory, fileName);
    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      fail(`${path.relative(ROOT, filePath)} is not valid JSON: ${error.message}`);
    }
  }
  const pokemon = JSON.parse(fs.readFileSync(path.join(dataDirectory, "pokemon.json"), "utf8"));
  const stats = JSON.parse(fs.readFileSync(path.join(dataDirectory, "stats.json"), "utf8"));
  const configSource = fs.readFileSync(path.join(ROOT, "assets", "js", "config.js"), "utf8");
  const pokemonJaMatch = configSource.match(/const POKEMON_JA\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!pokemonJaMatch) fail("assets/js/config.js must define POKEMON_JA");
  const pokemonJa = JSON.parse(pokemonJaMatch[1]);
  const pokemonNames = pokemon.map((entry) => entry.name);
  const statsNames = stats.map((entry) => entry.name);
  if (new Set(pokemonNames).size !== pokemonNames.length) fail("data/pokemon.json contains duplicate Pokémon names");
  if (new Set(statsNames).size !== statsNames.length) fail("data/stats.json contains duplicate Pokémon names");
  if (pokemonNames.length !== statsNames.length || pokemonNames.some((name) => !statsNames.includes(name))) {
    fail("data/pokemon.json and data/stats.json must contain the same Pokémon");
  }
  const missingJapaneseNames = pokemonNames.filter((name) => !pokemonJa[name]);
  if (missingJapaneseNames.length) {
    fail(`assets/js/config.js is missing Japanese Pokémon names: ${missingJapaneseNames.join(", ")}`);
  }
  for (const entry of pokemon) {
    if (!Array.isArray(entry.base_move_levels) || entry.base_move_levels.length !== 2) {
      fail(`data/pokemon.json ${entry.name} must define two base_move_levels`);
    }
    if (entry.base_move_levels.some((level) => !Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 15)) {
      fail(`data/pokemon.json ${entry.name} contains an invalid base move level`);
    }
  }
  for (const entry of stats) {
    if (!Array.isArray(entry.level) || entry.level.length !== 15) {
      fail(`data/stats.json ${entry.name} must define stats for 15 levels`);
    }
  }
  return files.length;
}

function validatePatchNoteTranslations() {
  const uiSource = fs.readFileSync(path.join(ROOT, "assets", "js", "ui.js"), "utf8");
  const start = uiSource.indexOf("const PATCH_STATUS_JA");
  const end = uiSource.indexOf("function pokemonThumbUrl");
  if (start < 0 || end <= start) fail("Patch-note translation functions were not found in assets/js/ui.js");

  const context = vm.createContext({
    state: {
      moveNamesJa: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "move_names_ja.json"), "utf8")),
      pokemon: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pokemon.json"), "utf8"))
    }
  });
  vm.runInContext(`${uiSource.slice(start, end)}\n;globalThis.patchTranslationTestApi = { cleanPatchMarkdown, jpPatchDetail, jpPatchDetails };`, context);
  const api = context.patchTranslationTestApi;

  const wishDetails = api.jpPatchDetails(["Damage Resistance:", "15% -> 20%"], "buff");
  if (wishDetails.length !== 1 || wishDetails[0].text !== "ダメージ軽減率: 15% → 20%") {
    fail(`Damage Resistance translation is incorrect: ${JSON.stringify(wishDetails)}`);
  }
  const frontalReduction = api.jpPatchDetail("Damage Reduction from the front:", "buff");
  if (frontalReduction !== "正面から受けるダメージの軽減率") {
    fail(`Conditional damage reduction translation is incorrect: ${frontalReduction}`);
  }

  const foulPlayDetails = api.jpPatchDetails([
    "Damage:",
    "Ratio: 64% Atk -> 58% Atk",
    "Slider: 7 -> 6",
    "Base: 160 -> 145",
    "Damage (Second Hit):",
    "Ratio: 264% Atk or stored Atk -> 237.6% Atk or stored Atk",
    "Slider: 0 -> 0",
    "Base: 0 -> 0"
  ], "nerf", { pokemonName: "Umbreon", moveName: "Foul Play" });
  const foulPlayFormula = foulPlayDetails.find((detail) => detail.text.includes("264%"));
  const expectedFoulPlayFormula = "計算式: 自分と1段目で記録した相手のうち高い方の攻撃 × 264% + 0 × (Lv - 1) + 0 → 自分と1段目で記録した相手のうち高い方の攻撃 × 237.6% + 0 × (Lv - 1) + 0";
  if (!foulPlayFormula || foulPlayFormula.text !== expectedFoulPlayFormula) {
    fail(`Foul Play formula translation is incorrect: ${JSON.stringify(foulPlayDetails)}`);
  }

  const patchNotes = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "patch_notes.json"), "utf8"));
  let formulaCount = 0;
  for (const patch of patchNotes.patches || []) {
    for (const pokemon of patch.pokemon || []) {
      for (const change of pokemon.changes || []) {
        const details = api.jpPatchDetails(change.details || [], change.status, {
          pokemonName: pokemon.name,
          moveName: change.move
        });
        if (!details.length && (change.details || []).some((line) => api.cleanPatchMarkdown(line))) {
          fail(`Patch ${patch.version} ${pokemon.name} ${change.move} lost all detail text`);
        }
        for (const line of change.details || []) {
          const cleaned = api.cleanPatchMarkdown(line);
          if (cleaned && !details.some((detail) => detail.source.includes(cleaned))) {
            fail(`Patch ${patch.version} ${pokemon.name} ${change.move} lost source detail: ${cleaned}`);
          }
        }
        for (const detail of details) {
          if (!detail.text || !detail.source) {
            fail(`Patch ${patch.version} ${pokemon.name} ${change.move} contains an empty translated detail`);
          }
          if (/^(?:効果を強化|効果を弱体化|不具合を修正|効果・挙動の仕様を変更|新しい効果を追加|効果・挙動を調整)$/.test(detail.text)) {
            fail(`Patch ${patch.version} ${pokemon.name} ${change.move} hides its source behind a generic description`);
          }
          if (detail.text.startsWith("計算式:")) {
            formulaCount += 1;
            if (!detail.text.includes(" → ")) {
              fail(`Patch ${patch.version} ${pokemon.name} ${change.move} formula has no before/after transition: ${detail.text}`);
            }
            if (/攻撃\s+攻撃|特攻\s+特攻/.test(detail.text)) {
              fail(`Patch ${patch.version} ${pokemon.name} ${change.move} formula repeats a stat label: ${detail.text}`);
            }
            if (/[A-Za-z]/.test(detail.text.replace(/\b(?:Lv|HP|KO|FPS)\b/g, ""))) {
              fail(`Patch ${patch.version} ${pokemon.name} ${change.move} formula contains untranslated text: ${detail.text}`);
            }
          }
        }
      }
    }
  }
  if (formulaCount < 1200) fail(`Too few ratio changes were rendered as formulas: ${formulaCount}`);
}

function main() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const stylesheetPaths = localAssetPaths(
    html,
    1,
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  );
  const scriptPaths = localAssetPaths(html, 1, /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi);

  if (!stylesheetPaths.length) fail("index.html does not reference any stylesheets");
  if (!scriptPaths.length) fail("index.html does not reference any application scripts");
  if (scriptPaths.at(-1) !== "assets/js/bootstrap.js") fail("bootstrap.js must be the final application script");

  assertUnique(stylesheetPaths, "Stylesheet list");
  assertUnique(scriptPaths, "Script list");
  assertFilesExist(stylesheetPaths, "Stylesheet list");
  assertFilesExist(scriptPaths, "Script list");

  for (const stylesheetPath of stylesheetPaths) {
    assertBalancedCss(fs.readFileSync(path.join(ROOT, stylesheetPath), "utf8"), stylesheetPath);
  }
  validateJavaScript(html, scriptPaths);
  const jsonCount = validateJsonData();
  validatePatchNoteTranslations();

  console.log(`Validated ${stylesheetPaths.length} stylesheets, ${scriptPaths.length} scripts, ${jsonCount} JSON files, and patch-note translations.`);
}

main();
