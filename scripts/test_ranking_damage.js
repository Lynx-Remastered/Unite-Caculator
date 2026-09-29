const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ URL, console });
for (const name of ["config", "patch-translations", "ui", "calculator-core", "damage-ranking", "support-calculators", "calculations"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js", `${name}.js`), "utf8"), context);
}
const api = vm.runInContext(`({ state, el, damageChoicesForPokemon, rankingVariantsForChoice,
  recommendedDamageItemRows, computeRankingAttackerStats, calculateRankingDamage,
  isHealingEntry, isShieldEntry, parseTargetHpDamage, selectedMoveParts })`, context);
for (const [key, file] of Object.entries({ pokemon: "pokemon", stats: "stats", heldItems: "held_items", emblems: "emblems", emblemSets: "emblem_sets", emblemNamesJa: "emblem_names_ja", moveNamesJa: "move_names_ja" })) {
  api.state[key] = JSON.parse(fs.readFileSync(path.join(root, "data", `${file}.json`), "utf8"));
}

function attack(name, move, level = 15, slot) {
  const pokemon = api.state.pokemon.find((entry) => entry.name === name);
  const choices = api.damageChoicesForPokemon(pokemon, level);
  const choice = choices.find((entry) => entry.displayName === move && (!slot || entry.slotKey === slot));
  assert.ok(choice, `${name}: ${move} must remain available`);
  const variants = api.rankingVariantsForChoice(pokemon, choice, level);
  const itemRows = api.recommendedDamageItemRows(pokemon);
  return { pokemon, choice, parts: variants[0].parts, level, itemRows,
    stats: api.computeRankingAttackerStats(pokemon, level, itemRows),
    targetMaxHp: 6300, targetDefense: 240, targetSpDefense: 200 };
}

// The support-only actions that previously entered the damage leaderboard must
// disappear, while damaging moves that also heal must remain.
for (const [name, moves] of [
  ["Blissey", ["Soft-Boiled", "Safeguard"]],
  ["Alcremie", ["Recover", "Fluffy Cream Supreme"]],
  ["Aegislash", ["Wide Guard"]]
]) {
  const pokemon = api.state.pokemon.find((entry) => entry.name === name);
  const choices = api.damageChoicesForPokemon(pokemon, 15);
  for (const move of moves) assert.ok(!choices.some((entry) => entry.displayName === move), `${name}/${move} is not damage`);
}
assert.ok(api.calculateRankingDamage(attack("Venusaur", "Giga Drain")).totalRaw > 0);
for (const [name, move, expectedRaw] of [["Blastoise", "Rapid Spin", 2700], ["Ceruledge", "Psycho Cut", 1518], ["Goodra", "Muddy Water", 999], ["Talonflame", "Flame Charge", 1563], ["Latias", "Dragon Cheer", 850]]) {
  const input = attack(name, move);
  assert.ok(input.parts.length > 0 && api.calculateRankingDamage(input).totalRaw > 0, `${name}/${move} upgrade must preserve its attack`);
  assert.ok(input.parts.every((part) => !/defense/i.test(part.label)), `${name}/${move} must not use its defense buff as damage`);
  assert.equal(api.calculateRankingDamage(input).totalRaw, expectedRaw);
}

// Independent formula: floor(.4 * 348.2) + 3*14 + 30 = 211 per tick;
// 12 ticks plus floor(1.6 * 348.2) + 12*14 + 120 = 845 detonation.
const curse = attack("Trevenant", "Curse");
assert.deepEqual(JSON.parse(JSON.stringify(api.calculateRankingDamage(curse))), {
  totalRaw: 3377, totalReduced: 2403, totalHits: 13
});
assert.deepEqual(api.calculateRankingDamage({ ...curse, targetMaxHp: 12600 }), api.calculateRankingDamage(curse), "self HP cost cannot scale with enemy HP");
assert.equal(api.calculateRankingDamage({ ...curse, singleHit: true }).totalRaw, 845);

const zacian = attack("Zacian", "通常攻撃", 15, "basic");
assert.equal(zacian.parts[0].targetHpRatio, 0, "uncharged attack cannot inherit a conditional HP ratio");
assert.equal(api.calculateRankingDamage(zacian).totalRaw, 645);

// Red/purple Crunch fangs use the September formula both before and after Lv11.
for (const [level, ratio, base, expectedRaw] of [[10, 198.7, 596, 1589], [11, 232, 695, 1855]]) {
  const input = attack("Feraligatr", "Crunch", level);
  const part = input.parts.find((entry) => entry.label === "Damage - Bonus");
  assert.ok(part, `Crunch red/purple damage must be available at Lv${level}`);
  assert.equal(part.ratio, ratio);
  assert.equal(part.base, base);
  assert.equal(api.calculateRankingDamage({
    ...input, parts: [part], stats: { ...input.stats, attack: 500 }, itemRows: []
  }).totalRaw, expectedRaw);
}

assert.equal(api.calculateRankingDamage(attack("Greninja", "Water Shuriken", 10)).totalHits, 4);
assert.equal(api.calculateRankingDamage(attack("Greninja", "Water Shuriken", 15)).totalHits, 5);
const raichu = attack("Raichu", "Electro Ball");
assert.equal(raichu.parts.find((part) => /Activated by Thunderbolt/.test(part.label)).hitCount, 1, "the upgrade's 8 DoT ticks do not repeat the separate linked attack");
assert.equal(api.calculateRankingDamage(raichu).totalRaw, 5012);

// Toxtricity: alternative timbres and direct/splash targets cannot be added
// together. One fresh poison stack deals six true-damage ticks of 0.6% max HP.
for (const [move, expected] of [
  ["通常攻撃", [["poison", 516, 366], ["electric", 300, 150]]],
  ["強化攻撃", [["poison", 741, 478], ["electric", 300, 150]]],
  ["Overdrive", [["poison-direct", 1760, 880], ["poison-area", 1040, 520], ["electric-wave", 320, 160], ["electric-feedback", 1200, 600]]],
  ["Venom Distortion", [["sound-waves", 4000, 2000]]]
]) {
  const input = attack("Toxtricity", move);
  const variants = api.rankingVariantsForChoice(input.pokemon, input.choice, 15);
  assert.equal(variants.length, expected.length);
  for (const [key, totalRaw, totalReduced] of expected) {
    const variant = variants.find((entry) => entry.key === key);
    assert.ok(variant, `${move}/${key} must be selectable`);
    const result = api.calculateRankingDamage({ ...input, parts: variant.parts,
      stats: { ...input.stats, spAttack: 500 }, itemRows: [], targetMaxHp: 6000,
      targetDefense: 600, targetSpDefense: 600 });
    assert.equal(result.totalRaw, totalRaw, `${move}/${key} raw damage`);
    assert.equal(result.totalReduced, totalReduced, `${move}/${key} reduced damage`);
    api.el.levelRange = { value: "15" };
    api.el.pokemonSelect = { value: "Toxtricity" };
    api.state.selectedDamageVariantKey = key;
    assert.deepEqual(api.selectedMoveParts(input.choice), variant.parts, "Detailed calculator and ranking must use the same parts");
  }
}
const earlyToxtricity = attack("Toxtricity", "通常攻撃", 4);
assert.equal(api.rankingVariantsForChoice(earlyToxtricity.pokemon, earlyToxtricity.choice, 4).length, 1, "Electric timbre requires Shift Gear at Lv5");
const toxtricityAtLv8 = api.damageChoicesForPokemon(earlyToxtricity.pokemon, 8);
assert.equal(toxtricityAtLv8.find((choice) => choice.slotKey === "unite").disabled, true);
assert.equal(api.calculateRankingDamage(attack("Toxtricity", "Venom Distortion", 9)).totalHits, 5);

// Preserve actual enemy-HP formulas while rejecting self costs and unresolved
// alternatives. These examples deliberately vary the surrounding wording.
assert.equal(api.parseTargetHpDamage("Deals 8% of the target's max HP as damage").ratio, 8);
assert.equal(api.parseTargetHpDamage("Deals 2% of the target's remaining HP as damage").basis, "remaining");
assert.equal(api.parseTargetHpDamage("In exchange for 2% max HP, deals damage to enemies"), null);
assert.equal(api.parseTargetHpDamage("At a cost of 3% max HP, deals damage against enemies"), null);
assert.equal(api.parseTargetHpDamage("Empowered attacks deal 1% / 2% / 3% of the target's max HP"), null);

// The detailed damage calculator uses the same exclusion, even if it receives
// an old selection containing only a healing formula.
api.el.levelRange = { value: "15" };
api.el.pokemonSelect = { value: "Blissey" };
assert.equal(api.selectedMoveParts({ displayName: "Soft-Boiled", entries: [{
  label: "Healing", partKey: "base", basePartKey: "base", minLevel: 1,
  ratio: 100, slider: 0, base: 100, dmgType: "SpAtk"
}] }).length, 0);

let count = 0;
for (const pokemon of api.state.pokemon.filter((entry) => !entry.exclude_stats)) {
  const itemRows = api.recommendedDamageItemRows(pokemon);
  const stats = api.computeRankingAttackerStats(pokemon, 15, itemRows);
  for (const choice of api.damageChoicesForPokemon(pokemon, 15).filter((entry) => !entry.disabled)) {
    for (const variant of api.rankingVariantsForChoice(pokemon, choice, 15)) {
      assert.ok(variant.parts.every((part) => !api.isHealingEntry(part) && !api.isShieldEntry(part)), `${pokemon.name}/${choice.displayName} contains a non-damage formula`);
      const result = api.calculateRankingDamage({ pokemon, choice, parts: variant.parts, level: 15,
        stats, itemRows, targetMaxHp: 6300, targetDefense: 240, targetSpDefense: 200 });
      assert.ok(Object.values(result).every((value) => Number.isFinite(value) && value >= 0), `${pokemon.name}/${choice.displayName} invalid result`);
      count += 1;
    }
  }
}
assert.ok(count > 800, "damage coverage must not collapse when excluding support actions");
console.log(`Damage ranking regression tests passed (${count} Lv15 variants checked).`);
