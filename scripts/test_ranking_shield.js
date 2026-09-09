"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const context = vm.createContext({ console, URL, setTimeout, clearTimeout });
for (const name of ["config", "calculator-core", "ui", "feedback", "support-calculators", "damage-ranking", "shield-ranking", "shield-ranking-view"]) {
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
  globalThis.api = { state, el, buildShieldRankingRows, updateShieldRanking };
`, context);
const api = context.api;
const plain = (value) => JSON.parse(JSON.stringify(value));
const cache = new Map();
function rowsAt(level) {
  if (!cache.has(level)) cache.set(level, api.buildShieldRankingRows(level));
  return cache.get(level);
}
function moveRows(pokemonName, moveName, level) {
  return rowsAt(level).filter((row) => (
    row.pokemon.name === pokemonName && row.choice.displayName === moveName
  ));
}
function singleRow(pokemonName, moveName, level, target = "self", phase) {
  const rows = moveRows(pokemonName, moveName, level).filter((row) => (
    row.targetScope === target && (!phase || row.variant.phase === phase)
  ));
  assert.equal(rows.length, 1, `${pokemonName} / ${moveName} at Lv${level} for ${target}: expected one shield application`);
  return rows[0];
}
function moveParts(row) {
  return row.variant.parts.filter((part) => !part.itemSource);
}
function withRecommendedItems(pokemonName, itemNames, run) {
  const previous = api.state.pokemon;
  const pokemon = plain(previous.find((entry) => entry.name === pokemonName));
  pokemon.builds = [{ held_items: itemNames }];
  try {
    api.state.pokemon = [pokemon];
    return run(api.buildShieldRankingRows(15));
  } finally {
    api.state.pokemon = previous;
  }
}
function sortedAmounts(rows) {
  return plain(rows.map((row) => row.totalShield).sort((a, b) => a - b));
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("Surf replaces its shield formula at Lv13 without adding the old shield", () => {
  // Blastoise has no recommended Sp. Attack item: floor(SpA * ratio) + base.
  for (const [level, expected, itemShield, enhanced] of [[12, 764, 584, false], [13, 1016, 629, true], [15, 1269, 749, true]]) {
    const row = singleRow("Blastoise", "Surf", level);
    assert.equal(row.baseShield, expected);
    assert.equal(row.itemShield, itemShield);
    assert.equal(row.totalShield, expected + itemShield);
    assert.equal(moveParts(row).length, 1);
    assert.equal(moveParts(row)[0].enhanced, enhanced);
    assert.equal(row.targetScope, "self");
  }
});

test("Safeguard preserves level scaling and reports each recipient's shield", () => {
  // Lv9: floor(266 * 1.85) + 13 * 8 + 620 = 1216.
  // Lv10+: floor(SpA * 2.05) + 14 * (level - 1) + 690.
  for (const [level, expected] of [[9, 1216], [10, 1439], [15, 2116]]) {
    for (const target of ["self", "ally"]) {
      const row = singleRow("Blissey", "Safeguard", level, target);
      assert.equal(row.totalShield, expected, "Self and ally shields must not be doubled");
      assert.equal(row.itemShield, 0, "Buddy Barrier only activates on Unite moves");
    }
  }
  assert.equal(singleRow("Mew", "Coaching", 15, "ally").targetScope, "ally");
  assert.equal(singleRow("Blissey", "Bliss Assistance", 15, "ally").targetScope, "ally");
});

test("learn levels and replaced basic moves limit the ranking", () => {
  assert.equal(moveRows("Blastoise", "Surf", 6).length, 0);
  assert.ok(moveRows("Blastoise", "Surf", 7).length > 0);
  assert.equal(moveRows("Wigglytuff", "Starlight Recital", 7).length, 0);
  assert.ok(moveRows("Wigglytuff", "Starlight Recital", 8).length > 0);
  assert.equal(moveRows("Metagross", "Iron Defense", 1).length, 1);
  assert.equal(moveRows("Metagross", "Iron Defense", 5).length, 0);
  assert.equal(moveRows("Metagross", "Meteor Mash", 4).length, 0);
  assert.equal(moveRows("Metagross", "Meteor Mash", 5).length, 1);
  // Mew retains Coaching because its move-selection system has no replacement.
  assert.equal(moveRows("Mew", "Coaching", 15).length, 1);
});

test("shields added only by an upgrade are absent before that upgrade", () => {
  for (const [pokemon, move, unlock] of [
    ["Sylveon", "Calm Mind", 12], ["Gardevoir", "Moonblast", 13], ["Scizor", "Bullet Punch", 11]
  ]) {
    assert.equal(moveRows(pokemon, move, unlock - 1).length, 0, `${pokemon}: shield unlocked too soon`);
    const row = singleRow(pokemon, move, unlock);
    assert.equal(moveParts(row)[0].enhanced, true);
    assert.ok(row.totalShield > 0);
  }
});

test("Psykaboom's missing data level does not expose its Unite shield before Lv9", () => {
  assert.equal(moveRows("Armarouge", "Psykaboom", 8).length, 0);
  const rows = moveRows("Armarouge", "Psykaboom", 9);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.variant.parts.every((part) => part.minLevel === 9)));
});

test("Megahorn keeps its attack and max-HP effects separate through the upgrade", () => {
  // Recommended Lv40 items add 56 Attack and 235 HP, without score or hit stacks.
  // At Lv15: floor(486 * 0.8) + 400 = 788; floor(8235 * 0.12) = 988.
  for (const [level, expected, enhanced] of [[9, [323, 328], false], [10, [672, 690], true], [15, [788, 988], true]]) {
    const rows = moveRows("Falinks", "Megahorn", level);
    assert.equal(rows.length, 2);
    assert.deepEqual(sortedAmounts(rows), expected);
    for (const row of rows) {
      assert.equal(row.variant.parts.length, 1);
      assert.equal(row.variant.parts[0].enhanced, enhanced);
    }
  }
});

test("Triage attachment alternatives remain separate and use Comfey's maximum HP", () => {
  const early = moveRows("Comfey", "Triage", 1);
  assert.equal(early.length, 1, "Sweet Kiss must not be available before Lv4");
  const rows = moveRows("Comfey", "Triage", 15);
  assert.equal(rows.length, 2, "Alternative attachment shields must not be summed");
  assert.deepEqual(sortedAmounts(rows), [1031, 1540]);
  for (const row of rows) {
    assert.equal(row.stats.hp, 7370, "5900 base HP + 525 + 525 + 420 from Lv40 items");
    assert.equal(row.targetScope, "ally");
    assert.equal(row.variant.parts.length, 1);
  }
});

test("maximum-HP formulas include flat item HP and fixed shield constants", () => {
  const fireSpin = singleRow("Ho-Oh", "Fire Spin", 15);
  assert.equal(fireSpin.stats.hp, 10845);
  assert.equal(fireSpin.baseShield, 3578, "floor(10845 * 33%)");
  assert.equal(fireSpin.itemShield, 750);
  assert.equal(fireSpin.totalShield, 4328);
  const block = singleRow("Snorlax", "Block", 15);
  assert.equal(block.stats.hp, 11870);
  assert.equal(block.totalShield, 3625, "floor(11870 * 17.4%) + 1560");
});

test("ranking retains recommended Lv40 stats and the Wise Glasses multiplier", () => {
  const coaching = singleRow("Mew", "Coaching", 15, "ally");
  assert.deepEqual(plain(coaching.itemRows.map(({ item, level }) => [item.name, level])), [
    ["Choice Specs", 40], ["Wise Glasses", 40], ["Drive Lens", 40]
  ]);
  assert.ok(Math.abs(coaching.stats.spAttack - 1087.12) < 0.000001);
  assert.equal(coaching.totalShield, 1387, "floor((900 + 44 + 44 + 28) * 1.07) + 300");
  assert.equal(coaching.itemShield, 0);
});

test("Unite move shields, common buffs, and Buddy Barrier add once for each recipient", () => {
  const blastoise = moveRows("Blastoise", "Hydro Typhoon", 15);
  assert.equal(blastoise.length, 2);
  assert.deepEqual(sortedAmounts(blastoise), [749, 6742]);
  const selfBlastoise = singleRow("Blastoise", "Hydro Typhoon", 15);
  assert.equal(selfBlastoise.baseShield, 5993, "1663 move shield + 4330 common Unite shield");
  assert.equal(selfBlastoise.itemShield, 749);
  const blissey = moveRows("Blissey", "Bliss Assistance", 15);
  assert.equal(blissey.length, 2);
  const selfBlissey = singleRow("Blissey", "Bliss Assistance", 15);
  const allyBlissey = singleRow("Blissey", "Bliss Assistance", 15, "ally");
  assert.deepEqual([selfBlissey.baseShield, selfBlissey.itemShield, selfBlissey.totalShield], [2189, 2736, 4925]);
  assert.deepEqual([allyBlissey.baseShield, allyBlissey.itemShield, allyBlissey.totalShield], [2640, 2736, 5376]);
  const absol = moveRows("Absol", "Midnight Slash", 15);
  assert.equal(absol.length, 1, "Unite buffs still appear when the move has no explicit shield formula");
  assert.equal(absol[0].variant.parts[0].uniteBuff, true);
  assert.equal(moveRows("Absol", "Midnight Slash", 8).length, 0);
});

test("Snorlax combines Buddy Barrier and one Resonant Guard trigger", () => {
  const self = singleRow("Snorlax", "Power Nap", 15);
  const ally = singleRow("Snorlax", "Power Nap", 15, "ally");
  assert.equal(self.stats.hp, 11870);
  assert.deepEqual([self.baseShield, self.itemShield, self.totalShield], [4748, 3779, 8527]);
  assert.deepEqual([ally.baseShield, ally.itemShield, ally.totalShield], [0, 3779, 3779]);
  for (const row of [self, ally]) {
    assert.deepEqual(plain(row.breakdown.filter((entry) => entry.kind === "item")
      .map((entry) => [entry.itemName, entry.amount]).sort()), [["Buddy Barrier", 2967], ["Resonant Guard", 812]]);
  }
});

test("non-damaging Unite moves never trigger Resonant Guard", () => {
  const self = singleRow("Wigglytuff", "Starlight Recital", 15);
  const ally = singleRow("Wigglytuff", "Starlight Recital", 15, "ally");
  assert.equal(self.stats.hp, 9977);
  assert.equal(self.totalShield, 3643, "1648 move shield + 1995 common shield");
  assert.equal(ally.totalShield, 1648);
  assert.equal(self.itemShield, 0);
  assert.equal(ally.itemShield, 0);
  assert.ok(self.itemRows.some(({ item }) => item.name === "Resonant Guard"));
});

test("damaging moves without inherent shields can appear through Resonant Guard", () => {
  const rows = moveRows("Blastoise", "Hydro Pump", 15);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.baseShield, 0);
    assert.equal(row.itemShield, 749);
    assert.equal(row.totalShield, 749);
  }
  assert.equal(moveRows("Blastoise", "Hydro Pump", 4).length, 0);
  assert.equal(moveRows("Blastoise", "Hydro Pump", 5).length, 2);
});

test("Rescue Hood boosts ally move and item shields together, without boosting self", () => {
  withRecommendedItems("Blissey", ["Buddy Barrier", "Resonant Guard", "Rescue Hood"], (rows) => {
    const unite = rows.filter((row) => row.choice.displayName === "Bliss Assistance");
    assert.equal(unite.length, 2);
    const self = unite.find((row) => row.targetScope === "self");
    const ally = unite.find((row) => row.targetScope === "ally");
    assert.equal(self.stats.hp, 11050);
    assert.deepEqual([self.baseShield, self.itemShield, self.shieldBonus, self.totalShield], [2210, 3525, 0, 5735]);
    assert.deepEqual([ally.baseShield, ally.itemShield, ally.shieldBonus, ally.totalShield], [2640, 3525, 1417, 7582]);
    assert.equal(ally.breakdown.filter((entry) => entry.kind === "bonus").length, 1);
  });
});

test("Mimikyu's ending buff cannot repeat activation item shields", () => {
  withRecommendedItems("Mimikyu", ["Buddy Barrier", "Resonant Guard", "Attack Weight"], (rows) => {
    const unite = rows.filter((row) => row.choice.displayName === "Play With Me...");
    const activationSelf = unite.find((row) => row.targetScope === "self" && row.variant.phase === "activation");
    const activationAlly = unite.find((row) => row.targetScope === "ally" && row.variant.phase === "activation");
    const ending = unite.filter((row) => row.variant.phase === "end");
    assert.ok(activationSelf && activationAlly);
    assert.deepEqual([activationSelf.baseShield, activationSelf.itemShield, activationSelf.totalShield], [2298, 2657, 4955]);
    assert.deepEqual([activationAlly.baseShield, activationAlly.itemShield, activationAlly.totalShield], [0, 2657, 2657]);
    assert.equal(ending.length, 1);
    assert.equal(ending[0].targetScope, "self");
    assert.equal(ending[0].totalShield, 1650);
    assert.equal(ending[0].itemShield, 0);
    assert.equal(ending[0].variant.parts.filter((part) => part.itemSource).length, 0);
  });
});

test("Comfey's later empowered shields do not repeat its Unite activation items", () => {
  const rows = moveRows("Comfey", "Flowery Fields Forever", 15);
  const self = rows.find((row) => row.variant.phase === "activation" && row.targetScope === "self");
  const ally = rows.find((row) => row.variant.phase === "activation" && row.targetScope === "ally");
  const followups = rows.filter((row) => row.variant.phase === "followup");
  assert.ok(self && ally);
  assert.deepEqual([self.baseShield, self.itemShield, self.totalShield], [1474, 1842, 3316]);
  assert.deepEqual([ally.baseShield, ally.itemShield, ally.totalShield], [0, 1842, 1842]);
  assert.ok(followups.length > 0);
  assert.equal(followups.reduce((sum, row) => sum + row.baseShield, 0), 697, "604 empowered overheal + 93 for one flower");
  assert.ok(followups.every((row) => row.targetScope === "ally" && row.itemShield === 0 && row.totalShield === row.baseShield));
});

test("Alcremie's stated 60% shield and ending Unite buff remain separate", () => {
  const rows = moveRows("Alcremie", "Fluffy Cream Supreme", 15);
  const self = rows.find((row) => row.targetScope === "self" && row.variant.phase === "activation");
  const ally = rows.find((row) => row.targetScope === "ally" && row.variant.phase === "activation");
  const ending = rows.filter((row) => row.variant.phase === "end");
  assert.ok(self && ally);
  assert.deepEqual([self.baseShield, self.itemShield, self.totalShield], [5967, 2486, 8453]);
  assert.deepEqual([ally.baseShield, ally.itemShield, ally.totalShield], [0, 2486, 2486]);
  assert.equal(ending.length, 1);
  assert.equal(ending[0].totalShield, 2983);
  assert.equal(ending[0].itemShield, 0);
});

test("Unite shields mentioned in both descriptions and buffs are counted once", () => {
  for (const [pokemon, move, expected] of [
    ["Blaziken", "Spinning Flame Fist", 748], ["Blaziken", "Spinning Flame Kick", 748],
    ["Urshifu", "Ebon Fist", 1580], ["Urshifu", "Flowing Fists", 1580]
  ]) {
    const rows = moveRows(pokemon, move, 15);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].totalShield, expected);
    assert.equal(rows[0].itemShield, 0);
  }
});

test("disabling item corrections restores base stats and removes item-only shield rows", () => {
  const rows = api.buildShieldRankingRows(15, false);
  const matching = (pokemonName, moveName) => rows.filter((row) => row.pokemon.name === pokemonName && row.choice.displayName === moveName);
  const surf = matching("Blastoise", "Surf");
  assert.equal(surf.length, 1);
  assert.equal(surf[0].targetScope, "self");
  assert.equal(surf[0].totalShield, 1269);
  assert.equal(surf[0].stats.hp, 10300);
  assert.equal(surf[0].stats.spAttack, 412);
  assert.equal(matching("Blastoise", "Hydro Pump").length, 0);
  assert.deepEqual(sortedAmounts(matching("Blissey", "Bliss Assistance")), [2000, 2640]);
  assert.deepEqual(sortedAmounts(matching("Snorlax", "Power Nap")), [4160]);
  assert.ok(rows.every((row) => row.itemRows.length === 0 && row.itemShield === 0 && row.shieldBonus === 0));
  assert.ok(rows.every((row, index) => index === 0 || rows[index - 1].totalShield >= row.totalShield));
  assert.deepEqual(plain(api.buildShieldRankingRows(15, true)), plain(rowsAt(15)), "Re-enabling corrections restores the complete sorted ranking");
});

test("per-target and per-stack shield values are shown for one trigger", () => {
  const liquidation = singleRow("Urshifu", "Liquidation", 15);
  assert.equal(liquidation.totalShield, 739, "floor(532.5 Attack * 90%) + 260 for one target");
  const meteorMash = singleRow("Metagross", "Meteor Mash", 15);
  assert.equal(meteorMash.totalShield, Math.floor(meteorMash.stats.attack * 0.35) + 115,
    "Do not multiply a per-stack shield by eight stacks");
  const flowers = moveRows("Comfey", "Floral Healing", 15);
  assert.equal(flowers.length, 2);
  assert.deepEqual(sortedAmounts(flowers), [71, 465], "One overheal effect and one additional flower");
});

test("all displayed shields are positive, available, and ordered by shield amount", () => {
  for (const level of [1, 7, 15]) {
    const rows = rowsAt(level);
    assert.ok(rows.length > 0);
    for (const [index, row] of rows.entries()) {
      assert.ok(Number.isFinite(row.totalShield) && row.totalShield > 0);
      assert.ok(!row.pokemon.exclude_stats);
      assert.equal(row.level, level);
      assert.equal(row.totalShield, row.baseShield + row.itemShield + row.shieldBonus);
      assert.equal(row.totalShield, row.breakdown.reduce((sum, entry) => sum + entry.amount, 0));
      assert.ok(["self", "ally", "both"].includes(row.targetScope));
      assert.ok(row.variant.parts.every((part) => Number(part.minLevel || 1) <= level));
      if (index > 0) assert.ok(rows[index - 1].totalShield >= row.totalShield);
    }
  }
});

test("ranking controls filter recipients, limit visible rows, and report level and count", () => {
  Object.assign(api.el, {
    shieldRankingBody: { innerHTML: "" },
    shieldRankingLevelRange: { value: "15" },
    shieldRankingLevelValue: { textContent: "" },
    shieldRankingLimitSelect: { value: "3" },
    shieldRankingTargetFilter: { value: "all" },
    shieldRankingSummary: { textContent: "" },
    shieldRankingGuide: { textContent: "" },
    shieldRankingIncludeItems: { checked: true },
    shieldRankingTable: { classList: { toggle() {} } },
    shieldRankingItemColumn: { hidden: false },
    shieldRankingItemHeader: { hidden: false }
  });
  for (const target of ["all", "self", "ally"]) {
    api.el.shieldRankingTargetFilter.value = target;
    api.updateShieldRanking();
    const expected = rowsAt(15).filter((row) => (
      target === "all" || row.targetScope === target || row.targetScope === "both"
    ));
    assert.deepEqual(plain(api.state.shieldRankingRows), plain(expected));
    if (target !== "all") assert.ok(api.state.shieldRankingRows.every((row) => row.targetScope === target || row.targetScope === "both"));
    assert.equal((api.el.shieldRankingBody.innerHTML.match(/<tr>/g) || []).length, 3);
    assert.equal(Number(api.el.shieldRankingLevelValue.textContent), 15);
    assert.match(api.el.shieldRankingSummary.textContent, /使用者Lv15/);
    assert.ok(api.el.shieldRankingSummary.textContent.includes(`3件表示（全${expected.length}件）`));
  }
  api.el.shieldRankingLevelRange.value = "7";
  api.el.shieldRankingLimitSelect.value = "1000";
  api.el.shieldRankingTargetFilter.value = "all";
  api.updateShieldRanking();
  assert.equal(Number(api.el.shieldRankingLevelValue.textContent), 7);
  assert.deepEqual(plain(api.state.shieldRankingRows), plain(rowsAt(7)));
  assert.equal((api.el.shieldRankingBody.innerHTML.match(/<tr>/g) || []).length, rowsAt(7).length);
});

test("the item-correction checkbox updates results and the item column in both directions", () => {
  const toggledClasses = new Map();
  api.el.shieldRankingTable.classList.toggle = (name, active) => toggledClasses.set(name, active);
  api.el.shieldRankingLevelRange.value = "15";
  api.el.shieldRankingTargetFilter.value = "all";
  api.el.shieldRankingIncludeItems.checked = false;
  api.updateShieldRanking();
  assert.deepEqual(plain(api.state.shieldRankingRows), plain(api.buildShieldRankingRows(15, false)));
  assert.equal(api.el.shieldRankingItemColumn.hidden, true);
  assert.equal(api.el.shieldRankingItemHeader.hidden, true);
  assert.equal(toggledClasses.get("without-items"), true);
  api.el.shieldRankingIncludeItems.checked = true;
  api.updateShieldRanking();
  assert.deepEqual(plain(api.state.shieldRankingRows), plain(rowsAt(15)));
  assert.equal(api.el.shieldRankingItemColumn.hidden, false);
  assert.equal(api.el.shieldRankingItemHeader.hidden, false);
  assert.equal(toggledClasses.get("without-items"), false);
});

test("an empty ranking replaces previous rows with a clear empty state", () => {
  const pokemon = api.state.pokemon;
  try {
    api.state.pokemon = [];
    api.updateShieldRanking();
    assert.equal(api.state.shieldRankingRows.length, 0);
    assert.match(api.el.shieldRankingBody.innerHTML, /現在の条件で表示できるシールド効果がありません/);
    assert.match(api.el.shieldRankingSummary.textContent, /0件表示（全0件）/);
    assert.ok(!api.el.shieldRankingBody.innerHTML.includes("ranking-pokemon"));
  } finally {
    api.state.pokemon = pokemon;
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
else console.log(`Passed ${tests.length} shield regression tests.`);
