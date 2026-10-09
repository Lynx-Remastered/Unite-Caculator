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
  isHealingEntry, isShieldEntry, parseTargetHpDamage, selectedMoveParts,
  inferHitInfo, inferHitCountFromText })`, context);
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

// Counts explicitly attached to a damage part take precedence over move-wide
// descriptions, including the source's bracket and multiplier notation.
for (const [label, expected] of [
  ["Damage - per Hit [x6]", 6],
  ["Damage - per Hit [3x]", 3],
  ["Damage - per Tick (up to 14x)", 14],
  ["Damage - per Tick up to 14x", 14],
  ["Damage - 3x", 3],
  ["Damage - Boosted x3", 3],
  ["Damage - Mini Stomps (2 stomps)", 2]
]) {
  assert.equal(api.inferHitCountFromText(label, true).count, expected, label);
  assert.equal(api.inferHitInfo({ label, contextText: "The effect stacks up to 9 times." }).count, expected,
    "An explicit part count must override unrelated move-wide counts: " + label);
}
assert.equal(api.inferHitCountFromText("The maximum number of hits is 7.", false).count, 7);
assert.equal(api.inferHitCountFromText("Hits the target twice.", false).count, 2);
assert.equal(api.inferHitCountFromText("Fires up to 7.5 waves.", false).count, 1,
  "A fractional wave count must not turn into five hits");

// Single damage events cannot inherit projectile counts, buff stacks, or
// movement-effect ticks from another part of the same move description.
for (const [label, contextText] of [
  ["Damage - Last Hit", "Movement speed reduction stacks up to 3 times."],
  ["Damage (Heatwave)", "Slows enemies every 0.5s for 4s."],
  ["Damage - Slash (Torrent)", "The whirlpool deals up to 4 hits before the final slash."],
  ["Exploding Flame level 3", "Throws flames up to 3 times, then shoots an exploding flame."],
  ["Damage - Shockwave", "The next 6 attacks gain increased attack speed."]
]) {
  assert.equal(api.inferHitInfo({ label, contextText }).count, 1, label + " occurs once");
}
assert.equal(api.inferHitInfo({ label: "Damage - Subsequent Hits", contextText: "Launches 5 projectiles." }).count, 4,
  "Repeated follow-up hits still exclude the first hit");
assert.equal(api.inferHitInfo({ label: "Damage - per Star", contextText: "Shoots 4 stars." }).count, 4,
  "Explicit per-hit parts still use their move's projectile count");

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

// Fairy Singularity has four pulling ticks and one final explosion. The
// description's "4 times" must not also multiply the separate final tick.
// Unite-DB's formulas, rounded per hit: Lv9 = 379*4 + 758;
// Lv15 = 602*4 + 1205 (before items, emblems, and enemy Sp. Defense).
for (const [level, spAttack, expectedRaw, expectedReduced, finalRaw] of [
  [9, 446, 2274, 1704, 758],
  [15, 1050, 3613, 2707, 1205]
]) {
  const input = attack("Gardevoir", "Fairy Singularity", level, "unite");
  assert.equal(input.parts.find((part) => part.label === "Damage - Final Tick").hitCount, 1, "Fairy Singularity explodes once");
  assert.equal(input.parts.find((part) => part.label === "Damage - 4 Ticks").hitCount, 4, "Fairy Singularity pulls four times");
  const conditions = { ...input, stats: { ...input.stats, spAttack }, itemRows: [] };
  const result = api.calculateRankingDamage(conditions);
  assert.equal(result.totalHits, 5);
  assert.equal(result.totalRaw, expectedRaw);
  assert.equal(result.totalReduced, expectedReduced, "round damage separately for each hit against 200 Sp. Defense");
  assert.equal(api.calculateRankingDamage({ ...conditions, singleHit: true }).totalRaw, finalRaw);
  api.el.levelRange = { value: String(level) };
  api.el.pokemonSelect = { value: "Gardevoir" };
  assert.deepEqual(api.selectedMoveParts(input.choice), input.parts, "Detailed calculator and ranking must both use four ticks plus one explosion");
}

// Discharge uses the same final-tick wording: six aura ticks followed by
// one final discharge, with a separate single pull hit against paralyzed foes.
for (const level of [8, 15]) {
  const { parts } = attack("Zeraora", "Discharge", level);
  assert.equal(parts.find((part) => part.label === "Damage - per Tick (6 Ticks)").hitCount, 6);
  assert.equal(parts.find((part) => part.label === "Damage - Aura (Final Tick)").hitCount, 1);
  assert.equal(parts.find((part) => part.label === "Damage - Pull").hitCount, 1);
}

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

// Every affected move is checked at each level where it can be learned.
// The detailed calculator and ranking must agree on each selectable variant.
const fixedHitProfiles = [
  ["Gardevoir", "Fairy Singularity", /Final Tick/i, 1],
  ["Gardevoir", "Fairy Singularity", /4 Ticks/i, 4],
  ["Zeraora", "Discharge", /Final Tick/i, 1],
  ["Zeraora", "Discharge", /per Tick \(6 Ticks\)/i, 6],
  ["Empoleon", "Whirlpool", /Slash/i, 1],
  ["Ho-Oh", "Fire Spin", /Heatwave/i, 1],
  ["Zacian", "Metal Claw", /Shockwave/i, 1],
  ["Mamoswine", "Mammoth Mash", /Mini Stomps/i, 2],
  ["Articuno", "Blizzard", /Damage/i, (level) => level >= 11 ? 8 : 6],
  ["Crustle", "Rubble Rouser", /Aura/i, 10],
  ["Delphox", "Fanciful Fireworks", /per Tick/i, 16],
  ["Ho-Oh", "Flamethrower", /^Damage$/, (level) => level >= 11 ? 20 : 16],
  ["Ho-Oh", "Flamethrower", /Burn Damage/i, 6],
  ["Inteleon", "Liquidation", /per bullet/i, (level) => level >= 13 ? 10 : 8],
  ["Lapras", "Water Pulse", /Subsequent pulses/i, (level) => level >= 11 ? 3 : 2],
  ["Suicune", "強化攻撃", /per tick|Frozen Bonus/i, 4],
  ["Tsareena", "Grassy Glide", /^Damage/i, 2],
  ["Umbreon", "Swift", /Subsequent Stars/i, 3],
  ["Palkia", "Slash", /^Damage$/, 2],
  ["Typhlosion", "Flame Wheel", /per Hit/i, 2],
  ["Typhlosion", "Ember", /Burn/i, 3],
  ["Pawmot", "Mach Punch", /Fighter Mode/i, 3],
  ["MewtwoX", "Future Sight", /Pull and Explosion/i, 2],
  ["Solgaleo", "Iron Head", /Barrage \(per hit\)/i, (level) => level >= 9 ? 5 : 4],
  ["Falinks", "Iron Head", /per Trooper/i, 5],
  ["Scyther", "Dual Wingbeat", /Slash/i, 2],
  ["Duraludon", "Revolving Ruin", /回転ビーム|終撃/i, 1],
  ["Duraludon", "Revolving Ruin", /Burning Ring/i, 20],
  ["Lapras", "強化攻撃", /Boosted x3/i, 3],
  ["Solgaleo", "強化攻撃", /Cosmoem.*3x/i, 3],
  ["Typhlosion", "Explosive Heat Haze", /up to 14x/i, 14]
];
const variableHitProfiles = [
  ["Mimikyu", "Shadow Claw", /Leading Additional Hits/i, [0, 1, 2, 3, 4]],
  ["Palkia", "Multi Dimensional Rend", /Flurry/i, [3, 4, 5, 6, 7]],
  ["Glaceon", "Icy Wind", /Ice Crystal/i, [2, 3, 4, 5, 6, 7, 8]],
  ["Latias", "Dragon Pulse", /テレキネシス弾/i, [0, 2, 3, 4, 6]],
  ["Greedent", "Bullet Seed", /per Seed/i, [24, 25, 27, 30, 34, 39, 60]]
];
const sequenceHitProfiles = [
  ["Armarouge", "Psyshock", [[1, 0.75, 0.5]]],
  ["Articuno", "Ice Wing Whiteout", [[1, 1.05, 1.1, 1.15, 2]]],
  ["Meowscarada", "Night Slash", [[1, 0.7, 0.7]]],
  ["Scizor", "Bullet Punch", [3, 4, 5].map((count) => [1, ...Array(count - 1).fill(0.3)])],
  ["Zeraora", "Wild Charge", [3, 4, 5, 6].map((count) => [1, ...Array(count - 1).fill(0.5)])],
  ["Glaceon", "Icicle Spear", Array.from({ length: 11 }, (_, index) =>
    Array.from({ length: index + 2 }, (_, hit) => Math.min(1.35, 1 + 0.05 * hit)))]
];
const affectedMoves = new Map();
for (const [name, move] of [...fixedHitProfiles, ...variableHitProfiles, ...sequenceHitProfiles,
  ["Chandelure", "Overheat"], ["Buzzwole", "Leech Life"]]) {
  affectedMoves.set(name + "|" + move, [name, move]);
}
let affectedLevelVariants = 0;
for (const [name, move] of affectedMoves.values()) {
  const pokemon = api.state.pokemon.find((entry) => entry.name === name);
  for (let level = 1; level <= 15; level += 1) {
    const choice = api.damageChoicesForPokemon(pokemon, level).find((entry) => entry.displayName === move);
    assert.ok(choice, name + "/" + move + " must remain available");
    if (choice.disabled) continue;
    const variants = api.rankingVariantsForChoice(pokemon, choice, level);
    const context = name + "/" + move + " at Lv" + level;
    assert.ok(variants.length, context + " has damage variants");
    for (const [, , label, expected] of fixedHitProfiles.filter((row) => row[0] === name && row[1] === move)) {
      const parts = variants.flatMap((variant) => variant.parts).filter((part) => label.test(part.label));
      assert.ok(parts.length, context + " must include " + label);
      for (const part of parts) assert.equal(part.hitCount, typeof expected === "function" ? expected(level) : expected,
        context + ": " + part.label);
    }
    for (const [, , label, expected] of variableHitProfiles.filter((row) => row[0] === name && row[1] === move)) {
      const counts = variants.map((variant) => variant.parts.filter((part) => label.test(part.label))
        .reduce((total, part) => total + part.hitCount, 0));
      assert.deepEqual([...new Set(counts)].sort((a, b) => a - b), expected, context + " selectable hit counts");
    }
    for (const [, , expected] of sequenceHitProfiles.filter((row) => row[0] === name && row[1] === move)) {
      const sequences = variants.map((variant) => variant.parts.flatMap((part) =>
        Array(part.hitCount).fill(Math.round((part.damageScale ?? 1) * 100) / 100)))
        .sort((a, b) => a.length - b.length);
      assert.deepEqual(JSON.parse(JSON.stringify(sequences)), expected.map((values) => values.map((value) => Math.round(value * 100) / 100)),
        context + " must apply each hit's own damage multiplier");
    }
    const mutuallyExclusiveTotals = {
      "Empoleon|Whirlpool": [4, 5],
      "Pawmot|Mach Punch": [1, 3],
      "Suicune|強化攻撃": [4, 8],
      "Typhlosion|Ember": [1, 4]
    }[name + "|" + move];
    if (mutuallyExclusiveTotals) {
      assert.deepEqual(Array.from(variants, (variant) => variant.parts.reduce((sum, part) => sum + part.hitCount, 0))
        .sort((a, b) => a - b), mutuallyExclusiveTotals, context + " must separate normal and empowered conditions");
    }
    if (name === "Buzzwole") {
      assert.equal(variants.length, 8, context + " offers seven gauge levels and the unstoppable target");
      for (const [gauge, expectedHits, initialScale] of [
        [0, 4, 1], [1, 4, 1.015], [2, 5, 1.03], [3, 5, 1.045],
        [4, 6, 1.06], [5, 6, 1.075], [6, 7, 1.09]
      ]) {
        const variant = variants.find((entry) => entry.key === "leech-life-" + gauge);
        assert.ok(variant, context + " gauge " + gauge);
        assert.equal(variant.parts.reduce((sum, part) => sum + part.hitCount, 0), expectedHits, context + " gauge hits");
        variant.parts.forEach((part, index) => {
          const enhancement = level >= 11 ? [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30][index] : 0;
          assert.ok(Math.abs(part.damageScale - initialScale - enhancement) < 1e-10,
            context + " applies the gauge bonus and enhanced tick bonus additively");
        });
      }
      const unstoppable = variants.find((entry) => entry.key === "leech-life-unstoppable");
      assert.equal(unstoppable.parts.length, 1, context + " has a separate unstoppable-target attack");
      assert.equal(unstoppable.parts[0].hitCount, 1, context + " hits unstoppable targets once");
    }
    for (const variant of variants) {
      if (name === "Mimikyu") assert.equal(variant.parts.find((part) => /Last Hit/.test(part.label)).hitCount, 1, context + " ends once");
      if (name === "Palkia" && move === "Multi Dimensional Rend") {
        assert.equal(variant.parts.find((part) => /Final Hit/.test(part.label)).hitCount, 1, context + " ends once");
      }
      if (name === "Chandelure") {
        const explosion = variant.parts.find((part) => /Exploding Flame level/.test(part.label));
        assert.ok(explosion, context + " includes an explosion");
        assert.equal(explosion.hitCount, 1, context + " explodes once");
        const flame = variant.parts.find((part) => part.label === "Damage");
        if (flame) assert.equal(flame.hitCount, Number(explosion.label.match(/level (\d+)/)[1]), context + " counts charged flames separately");
      }
      api.el.levelRange = { value: String(level) };
      api.el.pokemonSelect = { value: name };
      api.state.selectedDamageVariantKey = variant.key;
      assert.deepEqual(api.selectedMoveParts(choice), variant.parts, context + "/" + variant.key + " detailed and ranking parts");
      affectedLevelVariants += 1;
    }
  }
}
assert.ok(affectedLevelVariants > 500, "Affected moves must be checked across their learned levels");

// Drill Peck's maximum-gauge fixed damage and HP damage belong to one
// sequence. The HP component must not become an alternative attack.
for (let level = 5; level <= 15; level += 1) {
  const input = attack("Dodrio", "Drill Peck", level);
  const variants = api.rankingVariantsForChoice(input.pokemon, input.choice, level);
  assert.equal(variants.length, 2);
  const full = variants.find((variant) => variant.key === "drill-peck-full");
  assert.deepEqual(Array.from(full.parts, (part) => part.hitCount), [5, 3]);
  assert.equal(full.parts[1].targetHpRatio, 3);
  const conditions = { ...input, parts: full.parts, itemRows: [], stats: { ...input.stats, attack: 500 }, targetMaxHp: 6000 };
  assert.equal(api.calculateRankingDamage({ ...conditions, targetMaxHp: 12000 }).totalRaw - api.calculateRankingDamage(conditions).totalRaw, 540);
  for (const variant of variants) {
    api.el.levelRange = { value: String(level) };
    api.el.pokemonSelect = { value: "Dodrio" };
    api.state.selectedDamageVariantKey = variant.key;
    assert.deepEqual(api.selectedMoveParts(input.choice), variant.parts);
  }
}

// Independent Lv15 formulas with Attack and Sp. Attack fixed at 500 and no items:
// Armarouge: 787 + floor(787*.75) + floor(787*.5) = 1770.
// Articuno: floor(748 * each of 1, 1.05, 1.1, 1.15, 2) = 4711.
// Meowscarada: 714 + floor(714*.7)*2 = 1712.
for (const [name, move, expectedRaw] of [
  ["Armarouge", "Psyshock", 1770],
  ["Articuno", "Ice Wing Whiteout", 4711],
  ["Meowscarada", "Night Slash", 1712],
  ["MewtwoX", "Future Sight", 980],
  ["Mamoswine", "Mammoth Mash", 4807],
  ["Zacian", "Metal Claw", 2098]
]) {
  const input = attack(name, move);
  const result = api.calculateRankingDamage({ ...input,
    stats: { ...input.stats, attack: 500, spAttack: 500 }, itemRows: [],
    targetDefense: 0, targetSpDefense: 0 });
  assert.equal(result.totalRaw, expectedRaw, name + "/" + move + " independent full-move damage");
  assert.equal(result.totalReduced, expectedRaw, name + "/" + move + " with zero defense");
}

// Recorded Lv15 Leech Life+ damage with Attack 452 and six muscle-gauge units:
// 550, 575, 600, 626, 651, 676, 701. The gauge and tick bonuses are additive.
const leechLife = attack("Buzzwole", "Leech Life");
const fullGaugeLeech = api.rankingVariantsForChoice(leechLife.pokemon, leechLife.choice, 15)
  .find((variant) => variant.key === "leech-life-6");
const leechConditions = { ...leechLife, parts: fullGaugeLeech.parts,
  stats: { ...leechLife.stats, attack: 452 }, itemRows: [], targetDefense: 0, targetSpDefense: 0 };
assert.equal(api.calculateRankingDamage(leechConditions).totalRaw, 4379);
assert.deepEqual(Array.from(fullGaugeLeech.parts, (part) => api.calculateRankingDamage({ ...leechConditions, parts: [part] }).totalRaw),
  [550, 575, 600, 626, 651, 676, 701]);
assert.equal(api.calculateRankingDamage({ ...leechConditions, singleHit: true }).totalRaw, 701);

let count = 0;
for (let level = 1; level <= 15; level += 1) {
for (const pokemon of api.state.pokemon.filter((entry) => !entry.exclude_stats)) {
  const itemRows = api.recommendedDamageItemRows(pokemon);
  const stats = api.computeRankingAttackerStats(pokemon, level, itemRows);
  for (const choice of api.damageChoicesForPokemon(pokemon, level).filter((entry) => !entry.disabled)) {
    for (const variant of api.rankingVariantsForChoice(pokemon, choice, level)) {
      assert.ok(variant.parts.every((part) => Number.isInteger(part.hitCount) && part.hitCount >= 1), pokemon.name + "/" + choice.displayName + " valid hit counts at Lv" + level);
      assert.ok(variant.parts.every((part) => !api.isHealingEntry(part) && !api.isShieldEntry(part)), `${pokemon.name}/${choice.displayName} contains a non-damage formula`);
      const result = api.calculateRankingDamage({ pokemon, choice, parts: variant.parts, level,
        stats, itemRows, targetMaxHp: 6300, targetDefense: 240, targetSpDefense: 200 });
      assert.ok(Object.values(result).every((value) => Number.isFinite(value) && value >= 0), `${pokemon.name}/${choice.displayName} invalid result`);
      count += 1;
    }
  }
}
}
assert.ok(count > 8000, "damage coverage must not collapse when excluding support actions");
console.log(`Damage ranking regression tests passed (${count} Lv1–15 variants checked).`);
