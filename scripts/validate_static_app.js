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
  const translationSource = fs.readFileSync(path.join(ROOT, "assets", "js", "patch-translations.js"), "utf8");
  translationSource.split(/const PATCH_(?:TEXT|NAMES)_JA = /).slice(1).forEach((dictionary, index) => {
    const keys = [...dictionary.matchAll(/^\s*("(?:\\.|[^"\\])*"):/gm)].map((match) => JSON.parse(match[1]));
    assertUnique(keys, `Patch translation dictionary ${index + 1}`);
  });
  vm.runInContext(`${translationSource}\n${uiSource.slice(start, end)}\n;globalThis.patchTranslationTestApi = { cleanPatchMarkdown, jpPatchDetail, jpPatchDetails, jpPatchMoveName, jpPatchVersion, hasUntranslatedPatchText, patchDetailGroups, patchComparedNumberParts, translatePatchTokens };`, context);
  const api = context.patchTranslationTestApi;
  const assertJapanese = (text, label) => {
    if (!text || api.hasUntranslatedPatchText(text) || /原文|日本語(?:訳|名)を確認中/.test(text)) {
      fail(`${label} is not fully localized: ${text}`);
    }
  };
  const assertGroupJapanese = (group, label) => {
    assertJapanese(group.text, label);
    if (group.parts?.length) {
      const renderedText = group.parts.map((part) => part.text).join("");
      assertJapanese(renderedText, label);
      if (renderedText !== group.text) fail(`${label} changed text while adding highlights`);
    }
    for (const part of group.parts || []) {
      if (part.description) assertJapanese(part.description, `${label} tooltip`);
    }
    (group.children || []).forEach((child) => assertGroupJapanese(child, label));
  };
  const naturalTranslations = [
    ["Infatuated duration: 0.6s + 0.1s x flowers -> 0.2s + 0.1s x flowers", "メロメロ状態の時間: 0.6秒 + 0.1秒 × 花の数 → 0.2秒 + 0.1秒 × 花の数"],
    ["Unite Move Cooldown Reduction: 15% of remaining cooldown -> 10% of remaining cooldown", "ユナイト技の待ち時間短縮: 残り待ち時間の15% → 残り待ち時間の10%"],
    ["No longer grabs Hinderance Resistant opponents.", "妨害耐性状態の相手をつかめなくなった。"],
    ["Effect: Unstoppable -> Hindrance Resistant", "効果: 妨害無効 → 妨害耐性"],
    ["Shield: Value decreased, formulas TBD.", "シールド量を減少。計算式は確認中。"],
    ["Overheal Shield:", "最大HPを超えた回復分で得るシールド量"],
    ["Taunt times increased:", "メロメロ状態の持続時間"],
    ["1 flower: 0.4 > 0.8", "花1個: 0.4秒 → 0.8秒"]
  ];
  for (const [source, expected] of naturalTranslations) {
    const rows = api.jpPatchDetails([source], "nerf");
    if (rows[0]?.text !== expected) fail(`Patch translation lost meaning: ${JSON.stringify(rows)}`);
  }
  if (api.translatePatchTokens("10% target missing HP") !== "相手の減少HPの10%") {
    fail("A move name must not replace part of another word, such as Sing in missing");
  }
  const lowCharge = api.jpPatchDetail("Damage - Low Charge:", "nerf");
  if (lowCharge.includes("じゅうでん") || api.hasUntranslatedPatchText(lowCharge)) {
    fail("Charge in a charge-level label must not become Toxtricity's move name");
  }
  const unknownDetails = api.jpPatchDetails(["An undocumented celestial interaction was altered."], "adjustment");
  const unknownFormula = api.jpPatchDetails(["Old: 10% UntranslatedCoefficient", "New: 20% UntranslatedCoefficient"], "buff");
  if (![...unknownDetails, ...unknownFormula].every((row) => row.untranslated && !row.comparison && !api.hasUntranslatedPatchText(row.text))) {
    fail("Future untranslated notes must be flagged without exposing the English source");
  }
  if (api.hasUntranslatedPatchText(api.jpPatchMoveName("Unknown Future Move"))) fail("Unknown move names must not expose English");

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
  const septemberPatch = patchNotes.patches.find((patch) => patch.version === "1.24.1.3");
  const blueFlare = septemberPatch.pokemon.find((pokemon) => pokemon.name === "Reshiram").changes.find((change) => change.move === "Blue Flare");
  const blueFlareGroups = api.patchDetailGroups(api.jpPatchDetails(blueFlare.details, blueFlare.status), blueFlare.status);
  if (blueFlareGroups.length !== 2 || blueFlareGroups[0].text !== "ダメージ" || blueFlareGroups[1].text !== "ダメージ（やけど）") {
    fail(`Old/New formulas were not grouped by damage type: ${JSON.stringify(blueFlareGroups)}`);
  }
  const expectedPairs = [
    ["特攻 × 110% + 0 × (Lv - 1) + 700", "特攻 × 99% + 0 × (Lv - 1) + 630", ["99%", "630"]],
    ["特攻 × 11% + 0 × (Lv - 1) + 70", "特攻 × 9.9% + 0 × (Lv - 1) + 63", ["9.9%", "63"]]
  ];
  blueFlareGroups.forEach((group, index) => {
    const [before, after, changed] = expectedPairs[index];
    if (group.children.length !== 2 || group.children[0].text !== `変更前: ${before}` || group.children[1].text !== `変更後: ${after}`) {
      fail(`Old/New formula text was altered: ${JSON.stringify(group)}`);
    }
    const highlighted = group.children[1].parts.filter((part) => part.tone);
    if (JSON.stringify(highlighted.map((part) => part.text)) !== JSON.stringify(changed) || highlighted.some((part) => part.tone !== "negative")) {
      fail(`Only decreased Blue Flare values should be highlighted red: ${JSON.stringify(highlighted)}`);
    }
  });
  const comparisonCases = [
    ["10%", "15%", "Damage", "positive"],
    ["15%", "10%", "Damage", "negative"],
    ["120,000 / 134s", "110,000 / 123s", "Unite Charge", "positive"],
    ["100,000 / 112s", "110,000 / 123s", "Unite Charge", "negative"],
    ["100", "110", "Unite Charge gained per second", "positive"],
    ["-5", "-3", "Defense", "positive"],
    ["8s", "7.5s", "Cooldown", "positive", "buff"],
    ["5s", "6s", "Cooldown", "negative", "nerf"],
    ["100,000 / 112s", "110,000 / 123s", "Unite Charge", "positive", "buff"],
    ["120,000 / 134s", "110,000 / 123s", "Unite Charge", "negative", "nerf"]
  ];
  comparisonCases.forEach(([before, after, field, tone, status]) => {
    const parts = api.patchComparedNumberParts(before, after, field, status);
    const highlighted = parts.filter((part) => part.tone);
    if (!highlighted.length || highlighted.some((part) => part.tone !== tone) || parts.map((part) => part.text).join("") !== after) {
      fail(`Wrong numerical highlighting for ${field}: ${JSON.stringify(parts)}`);
    }
  });
  const chargeGroups = api.patchDetailGroups(api.jpPatchDetails(["Unite Charge:", "120,000 / 134s -> 110,000 / 123s"], "buff"), "buff");
  if (chargeGroups[0].parts.filter((part) => part.tone === "positive").length !== 2) {
    fail(`Inline Unite Charge reductions must be green: ${JSON.stringify(chargeGroups)}`);
  }
  const separateCharge = api.patchDetailGroups(api.jpPatchDetails(["Unite Charge:", "Old: 120,000 / 134s", "New: 110,000 / 123s"], "buff"), "buff");
  if (separateCharge[0].children[1].parts.filter((part) => part.tone === "positive").length !== 2) {
    fail(`Old/New Unite Charge reductions must be green: ${JSON.stringify(separateCharge)}`);
  }
  for (const [status, expectedTones] of [
    ["buff", ["positive", "positive"]],
    ["nerf", ["negative", "negative"]],
    ["adjustment", ["positive", "negative"]]
  ]) {
    const groups = api.patchDetailGroups(api.jpPatchDetails([
      "Damage:", "Old: 100% Atk + 6 x (Level - 1) + 160", "New: 110% Atk + 6 x (Level - 1) + 145"
    ], status), status);
    const tones = groups[0].children[1].parts.filter((part) => part.tone).map((part) => part.tone);
    if (JSON.stringify(tones) !== JSON.stringify(expectedTones)) {
      fail(`Old/New highlights must respect ${status}: ${JSON.stringify(groups)}`);
    }
  }
  for (const [pokemonName, moveName, expectedTone] of [
    ["Buzzwole", "Super Power", "positive"],
    ["Duraludon", "Flash Cannon", "negative"]
  ]) {
    const change = septemberPatch.pokemon.find((pokemon) => pokemon.name === pokemonName).changes.find((entry) => entry.move === moveName);
    const groups = api.patchDetailGroups(api.jpPatchDetails(change.details, change.status), change.status);
    const cooldown = groups.find((group) => group.field === "Cooldown");
    const highlights = cooldown?.parts.filter((part) => part.tone) || [];
    if (!highlights.length || highlights.some((part) => part.tone !== expectedTone)) {
      fail(`${pokemonName} ${moveName} cooldown highlights must respect ${change.status}: ${JSON.stringify(groups)}`);
    }
  }
  const mixed = api.patchDetailGroups(api.jpPatchDetails([...blueFlare.details, "Cooldown:", "6s -> 7s"], "nerf"), "nerf");
  if (mixed.length !== 3 || mixed[2].children || !mixed[2].text.startsWith("待ち時間:")) {
    fail(`An unrelated cooldown change was nested inside a damage formula: ${JSON.stringify(mixed)}`);
  }
  const unchanged = api.patchComparedNumberParts("10% + 0", "10% + 0", "Damage", "buff");
  const incompatible = api.patchComparedNumberParts("10%", "10% + 100", "Damage", "nerf");
  if ([...unchanged, ...incompatible].some((part) => part.tone)) {
    fail("Unchanged or unmatched values must not receive highlighting");
  }
  let formulaCount = 0;
  for (const patch of patchNotes.patches || []) {
    assertJapanese(api.jpPatchVersion(patch.version), `Patch ${patch.version} title`);
    for (const pokemon of patch.pokemon || []) {
      for (const change of pokemon.changes || []) {
        const label = `Patch ${patch.version} ${pokemon.name} ${change.move}`;
        assertJapanese(api.jpPatchMoveName(change.move), `${label} move name`);
        const details = api.jpPatchDetails(change.details || [], change.status, {
          pokemonName: pokemon.name,
          moveName: change.move
        });
        details.forEach((detail) => {
          if (detail.untranslated) fail(`${label} requires a Japanese translation: ${detail.source}`);
          assertJapanese(detail.text, label);
        });
        api.patchDetailGroups(details, change.status).forEach((group) => assertGroupJapanese(group, label));
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
            if (api.hasUntranslatedPatchText(detail.text)) {
              fail(`Patch ${patch.version} ${pokemon.name} ${change.move} formula contains untranslated text: ${detail.text}`);
            }
          }
        }
      }
    }
  }
  if (formulaCount < 1200) fail(`Too few ratio changes were rendered as formulas: ${formulaCount}`);

  // Exercise the actual DOM renderer without a browser dependency: no source text in titles or attributes.
  const createNode = (tag, text = "") => ({
    tag, text, children: [], attributes: {},
    appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { this.attributes[key] = value; }
  });
  context.document = { createElement: (tag) => createNode(tag), createTextNode: (text) => createNode("#text", text) };
  const coreSource = fs.readFileSync(path.join(ROOT, "assets", "js", "calculator-core.js"), "utf8");
  vm.runInContext(coreSource.slice(coreSource.indexOf("function createBalanceDetailItem"), coreSource.indexOf("function updateBalanceTimeline")), context);
  const rendered = context.createBalanceDetailItem(blueFlareGroups[0]);
  const checkRendered = (node) => {
    if (node.title) assertJapanese(node.title, "Rendered tooltip");
    if (node.text) assertJapanese(node.text, "Rendered text");
    if (node.textContent) assertJapanese(node.textContent, "Rendered highlight");
    Object.values(node.attributes).forEach((value) => assertJapanese(value, "Rendered attribute"));
    node.children.forEach(checkRendered);
  };
  checkRendered(rendered);
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
