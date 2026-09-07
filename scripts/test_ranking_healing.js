const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const context = vm.createContext({ console, URL, setTimeout, clearTimeout });
for (const name of ["config", "calculator-core", "ui", "support-calculators", "damage-ranking"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", "js", `${name}.js`), "utf8"), context, {
    filename: `${name}.js`
  });
}
context.data = {
  pokemon: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pokemon.json"), "utf8")),
  stats: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "stats.json"), "utf8")),
  heldItems: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "held_items.json"), "utf8"))
};
vm.runInContext(`
  Object.assign(state, data);
  globalThis.api = {
    state, el, healingChoicesForPokemon, healingRankingVariantsForChoice,
    recommendedHealingItemRows, computeRankingHealingStats, calculateRankingHealing,
    selectedHealingParts, defaultHealingEffectKey, inferHealingHitInfo
  };
`, context);
const api = context.api;
const plain = (value) => JSON.parse(JSON.stringify(value));

function selectHealing(name, moveName, level) {
  const pokemon = api.state.pokemon.find((entry) => entry.name === name);
  assert.ok(pokemon, `Missing Pokémon: ${name}`);
  const choices = api.healingChoicesForPokemon(pokemon, level);
  const choice = choices.find((entry) => entry.displayName === moveName);
  assert.ok(choice && !choice.disabled, `${name} / ${moveName} must be available at Lv${level}`);
  const itemRows = api.recommendedHealingItemRows(pokemon);
  const stats = api.computeRankingHealingStats(pokemon, level, itemRows);

  // Use the detailed calculator's real selection state, including its default effect.
  api.state.healingMoveChoices = choices;
  api.state.selectedHealingMoveSlot = choice.slotKey;
  api.state.selectedHealingEffectKey = api.defaultHealingEffectKey(choice);
  api.el.healingLevelRange = { value: String(level) };
  const parts = api.selectedHealingParts();
  const variants = api.healingRankingVariantsForChoice(pokemon, choice, level);
  const ranking = variants.map((variant) => ({
    label: variant.label,
    parts: variant.parts,
    ...api.calculateRankingHealing(variant.parts, level, stats)
  }));
  return { pokemon, choice, level, stats, parts, ranking };
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("Giga Drain uses one regular heal before Lv11 and replaces it with one upgraded heal", () => {
  for (const [level, expectedHealing, enhanced] of [[10, 428, false], [11, 514, true], [15, 689, true]]) {
    const result = selectHealing("Venusaur", "Giga Drain", level);
    assert.equal(result.choice.effectGroups.length, 1, `Lv${level}: duplicate recovery effect`);
    assert.equal(result.parts.length, 1, `Lv${level}: detailed calculator must not add old and new healing`);
    assert.equal(result.parts[0].enhanced, enhanced);
    assert.equal(result.ranking.length, 1, `Lv${level}: duplicate ranking row`);
    assert.equal(result.ranking[0].totalHealing, expectedHealing);
    assert.equal(result.ranking[0].totalHits, 1);
  }
});

test("Water Shuriken counts four recovery hits before Lv11 and five after the upgrade", () => {
  // Expected totals use the checked-in attack stats and the source's per-hit formula:
  // floor(Attack * 15%) + 2 * (level - 1) + 25, for one enemy hit by every shuriken.
  for (const [level, perHit, expectedHits, expectedHealing] of [
    [7, 79, 4, 316], [10, 94, 4, 376], [11, 99, 5, 495], [15, 133, 5, 665]
  ]) {
    const result = selectHealing("Greninja", "Water Shuriken", level);
    assert.equal(result.parts.length, 1);
    assert.equal(api.inferHealingHitInfo(result.parts[0], level).count, expectedHits,
      `Lv${level}: detailed calculator recovery count`);
    assert.equal(result.ranking.length, 1);
    assert.equal(result.ranking[0].totalHits, expectedHits, `Lv${level}: ranking recovery count`);
    assert.equal(result.ranking[0].totalHealing, expectedHealing, `Lv${level}: ranking recovery amount`);
    assert.equal(result.ranking[0].totalHealing / expectedHits, perHit);
  }
});

test("Whirlpool keeps wild and player recovery separate while replacing both upgraded formulas", () => {
  const result = selectHealing("Azumarill", "Whirlpool", 15);
  assert.equal(result.choice.effectGroups.length, 2);
  assert.equal(result.ranking.length, 2);
  assert.deepEqual(plain(result.ranking.map((row) => [row.totalHealing, row.totalHits])), [[610, 10], [1850, 10]]);
  assert.equal(result.parts.length, 1, "Exclusive effects must not be combined by default");
  for (const group of result.choice.effectGroups) {
    api.state.selectedHealingEffectKey = group.key;
    const parts = api.selectedHealingParts();
    assert.equal(parts.length, 1);
    assert.equal(parts[0].enhanced, true);
  }
});

test("Soft-Boiled preserves its initial heal and two additional recovery ticks", () => {
  const result = selectHealing("Blissey", "Soft-Boiled", 15);
  assert.equal(result.choice.effectGroups.length, 2);
  assert.equal(api.state.selectedHealingEffectKey, "all");
  assert.equal(result.parts.length, 2, "The detailed calculator needs both additive effects");
  assert.deepEqual(plain(result.ranking.map((row) => [row.totalHealing, row.totalHits])), [[1336, 1], [1084, 2]]);
  assert.equal(api.calculateRankingHealing(result.parts, 15, result.stats).totalHealing, 2420);
});

test("Floral Healing preserves base healing and the additional eight-flower effect", () => {
  const result = selectHealing("Comfey", "Floral Healing", 15);
  assert.equal(result.choice.effectGroups.length, 2);
  assert.equal(api.state.selectedHealingEffectKey, "all");
  assert.equal(result.parts.length, 2);
  assert.deepEqual(plain(result.ranking.map((row) => [row.totalHealing, row.totalHits])), [[1054, 1], [1296, 8]]);
});

test("Recover preserves normal, empowered, and the two Snorlax bonus effects", () => {
  const result = selectHealing("Alcremie", "Recover", 15);
  assert.equal(result.choice.effectGroups.length, 4);
  assert.equal(result.ranking.length, 4);
  assert.notEqual(api.state.selectedHealingEffectKey, "all");
  assert.equal(result.parts.length, 1, "Normal and empowered healing must not be combined by default");
  assert.deepEqual(plain(result.ranking.map((row) => row.totalHealing)), [2345, 3533, 190, 292]);
});

test("Existing Moonlight and Flamethrower recovery-count upgrades remain intact", () => {
  for (const [name, moveName, level, expectedHits] of [
    ["Clefable", "Moonlight", 9, 6], ["Clefable", "Moonlight", 10, 8],
    ["Ho-Oh", "Flamethrower", 10, 16], ["Ho-Oh", "Flamethrower", 11, 20]
  ]) {
    const result = selectHealing(name, moveName, level);
    assert.equal(result.ranking[0].totalHits, expectedHits, `${name} Lv${level}`);
    assert.equal(api.inferHealingHitInfo(result.parts[0], level).count, expectedHits, `${name} detailed Lv${level}`);
  }
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}
if (failures) process.exitCode = 1;
else console.log(`Passed ${tests.length} healing regression tests.`);
