"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
const state = {
  pokemon: readJson("pokemon.json"), heldItems: readJson("held_items.json"),
  wikiMoveDescriptionsJa: readJson("wiki_move_descriptions_ja.json"),
  slowDescriptionsJa: readJson("slow_descriptions_ja.json")
};
// These helpers only supply labels/icons; use the actual extraction and profile
// functions together with the bundled game data for every numerical assertion.
const context = vm.createContext({
  state,
  number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  },
  formatNumber: (value, digits = 0) => String(Number(Number(value).toFixed(digits))),
  escapeHtml: (value) => String(value),
  jpPokemonName: (pokemon) => pokemon.name,
  jpMoveName: (name) => name,
  jpAbility: (name) => name,
  jpItemName: (item) => item.name,
  pokemonThumbUrl: () => "",
  skillIconUrl: () => "",
  heldItemIconUrl: () => ""
});
for (const name of ["slow-ranking.js", "acceleration-ranking.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", name), "utf8"), context, { filename: name });
}
const pokemonRows = state.pokemon.filter((pokemon) => !pokemon.exclude_stats)
  .flatMap(context.pokemonAccelerationRankingRows);
const rows = pokemonRows.concat(context.supplementalAccelerationRankingRows());
const findRow = (pokemon, move) => {
  const result = rows.find((row) => row.sourceName === pokemon && row.moveName === move);
  assert.ok(result, `${pokemon} / ${move} should appear`);
  return result;
};
const profile = (row) => JSON.parse(JSON.stringify(context.accelerationEffectProfile(row)));
let checks = 0;
function test(name, callback) {
  callback();
  checks += 1;
  console.log(`PASS ${name}`);
}

test("opponent paralysis does not become self acceleration", () => {
  const pikachu = state.pokemon.find((pokemon) => pokemon.name === "Pikachu");
  const attack = pikachu.skills.find((skill) => skill.ability === "Basic");
  assert.equal(context.accelerationPercentCandidates(attack.rsb.notes).length, 0);
  assert.ok(!rows.some((row) => row.descriptionKey === "Pikachu::Basic::Attack::rsb"));
  assert.equal(findRow("Pikachu", "Volt Tackle").accelerationPercent, 60);
});

test("Psyshock reaches its stated 78% cap", () => {
  const row = findRow("Solgaleo", "Psyshock");
  assert.equal(row.accelerationPercent, 78);
  assert.equal(context.accelerationEffectDuration(row), 4);
  assert.equal(profile(row).kind, "growth");
  assert.deepEqual(profile(row).steps, [13, 26, 39, 52, 65, 78]);
});

test("Ancient Power includes all three speed stacks", () => {
  const row = findRow("Tyranitar", "Ancient Power");
  assert.equal(row.accelerationPercent, 60);
  assert.equal(row.stackMultiplier, 3);
  assert.deepEqual(profile(row).steps, [20, 40, 60]);
});

test("out-of-combat activation delay is not effect duration", () => {
  for (const [pokemon, move] of [["Float Stone", "Float Stone"], ["Gengar", "Levitate"]]) {
    const row = findRow(pokemon, move);
    assert.equal(context.accelerationEffectDuration(row), 0);
    assert.ok(!profile(row).chips.some((chip) => chip.className === "duration"));
  }
});

test("speed duration stays attached to stealth or the active field", () => {
  assert.equal(context.accelerationEffectDuration(findRow("Dragapult", "Phantom Force")), 6);
  assert.equal(context.accelerationEffectDuration(findRow("Glaceon", "Glacial Stage")), 6);
  // Hydro Pump only states the duration of enemy stun; no numerical speed
  // duration is given, so it must remain unspecified.
  assert.equal(context.accelerationEffectDuration(findRow("Blastoise", "Hydro Pump")), 0);
  assert.equal(context.accelerationEffectDuration(findRow("Gyarados", "Dragon Current")), 4);
  assert.equal(context.accelerationEffectDuration(findRow("Mega-Gyarados", "Dragon Current")), 4);
});

test("shared buff durations and decimal values remain intact", () => {
  for (const [pokemon, move, seconds] of [
    ["Crustle", "Shell Smash", 4.5],
    ["Clefable", "Moonlight", 3],
    ["Machamp", "Barrage Blow", 8],
    ["Meowscarada", "Overgrow", 4],
    ["Armarouge", "Fire Spin", 3],
    ["Glaceon", "Ice Shard", 1],
    ["Mega-Charizard-X", "Seismic Slam", 20]
  ]) {
    assert.equal(context.accelerationEffectDuration(findRow(pokemon, move)), seconds, `${pokemon} / ${move}`);
  }
});

test("Agility+ inherits decay and belongs in the decay filter", () => {
  const row = findRow("Zacian", "Agility+");
  assert.equal(row.accelerationPercent, 40);
  assert.equal(row.minAccelerationPercent, 7.5);
  assert.equal(context.accelerationEffectDuration(row), 3);
  assert.equal(profile(row).kind, "decay");
  assert.equal(context.accelerationRowMatchesFilter(row, "decay"), true);
  assert.equal(context.accelerationRowMatchesFilter(row, "instant"), false);
});

test("Dynamic Punch+ recomputes decay from the upgraded peak", () => {
  const row = findRow("Machamp", "Dynamic Punch+");
  assert.equal(row.accelerationPercent, 70);
  assert.equal(context.accelerationEffectDuration(row), 3);
  assert.equal(profile(row).kind, "decay");
  assert.deepEqual(profile(row).steps, [70, 50]);
});

test("Stuff Cheeks parses decreasing by as a timed decay", () => {
  const row = findRow("Greedent", "Stuff Cheeks");
  const decay = context.accelerationDecayDetails(row.accelerationDecayContext);
  assert.equal(decay.decrement, 15);
  assert.equal(decay.interval, 1);
  assert.equal(profile(row).kind, "decay");
  assert.deepEqual(profile(row).steps, [70, 55, 40, 25, 10, 0]);
});

test("every bundled Unite speed buff is represented with its duration", () => {
  let count = 0;
  for (const pokemon of state.pokemon.filter((entry) => !entry.exclude_stats)) {
    for (const skill of pokemon.skills.filter((entry) => entry.ability === "Unite Move")) {
      const buff = String(skill.buffs || "");
      const speed = buff.match(/(\d+(?:\.\d+)?)%\s+Movement Speed/i);
      if (!speed) continue;
      const seconds = buff.slice(speed.index + speed[0].length).match(/^\s+for\s+(\d+(?:\.\d+)?)s/i);
      const expectedDuration = seconds ? Number(seconds[1]) : Number(skill.buff_duration);
      assert.ok(pokemonRows.some((row) => row.sourceName === pokemon.name && row.moveName === skill.name
        && row.accelerationPercent === Number(speed[1])
        && context.accelerationEffectDuration(row) === expectedDuration), `${pokemon.name} / ${skill.name}`);
      count += 1;
    }
  }
  assert.ok(count >= 99);
  const absol = findRow("Absol", "Midnight Slash");
  assert.equal(absol.accelerationPercent, 80);
  assert.equal(context.accelerationEffectDuration(absol), 6);
});

test("Unite buff duplicates merge but distinct phases remain separate", () => {
  const pokemon = structuredClone(state.pokemon.find((entry) => entry.name === "Absol"));
  const skill = pokemon.skills.find((entry) => entry.ability === "Unite Move");
  pokemon.skills = [skill];
  skill.rsb.true_desc = "Increases the user's movement speed by 80% for 6s.";
  let result = context.pokemonAccelerationRankingRows(pokemon);
  assert.equal(result.length, 1);
  skill.rsb.true_desc = "Increases the user's movement speed by 30% for 2s.";
  result = context.pokemonAccelerationRankingRows(pokemon);
  assert.deepEqual(Array.from(result, (row) => row.accelerationPercent).sort((a, b) => a - b), [30, 80]);
  assert.deepEqual(Array.from(result, context.accelerationEffectDuration).sort((a, b) => a - b), [2, 6]);
  skill.buffs = "80% Movement Speed for 3s, 20% Max HP Shield";
  result = context.pokemonAccelerationRankingRows(pokemon);
  assert.equal(context.accelerationEffectDuration(result.find((row) => row.accelerationPercent === 80)), 3);
});

const details = (row) => (row.accelerationDetailPartsJa || context.japaneseAccelerationFallbackParts(row)).map(part => part.text).join(" ");

test("Dragon Dance does not multiply movement speed by Attack stacks", () => {
  const base = findRow("Dragonite", "Dragon Dance");
  assert.equal(base.accelerationPercent, 30);
  assert.equal(base.stackMultiplier, 1);
  assert.equal(context.accelerationEffectDuration(base), 1);
  assert.equal(profile(base).kind, "fixed");
  const plus = findRow("Dragonite", "Dragon Dance+");
  assert.equal(plus.accelerationPercent, 40);
  assert.equal(context.accelerationEffectDuration(plus), 1);
  assert.equal(plus.accelerationDurationIsMaximum, true);
  assert.match(details(plus), /10%/);
  assert.match(details(plus), /4\.5秒/);
});

test("duration-only Moonlight upgrades retain self acceleration for four seconds", () => {
  for (const [move, duration] of [["Moonlight", 3], ["Moonlight+", 4]]) {
    const row = findRow("Clefable", move);
    assert.equal(row.accelerationPercent, 20);
    assert.equal(row.targetLabel, "自分");
    assert.equal(context.accelerationEffectDuration(row), duration);
    assert.match(details(row), new RegExp(`${duration}秒`));
  }
  for (const [pokemon, move] of [["Meowscarada", "Double Team+"], ["Trevenant", "Pain Split+"], ["Hoopa", "Trick+"]]) {
    assert.ok(!rows.some(row => row.sourceName === pokemon && row.moveName === move), `${pokemon}/${move} only upgrades another effect`);
  }
});

test("nearby allies and ally healing do not change the recipient of a self buff", () => {
  assert.equal(findRow("Comfey", "Triage").targetLabel, "自分");
  const cotton = rows.find(row => row.sourceName === "Eldegoss" && row.moveName === "Cotton Cloud Crash" && row.accelerationPercent === 10);
  assert.equal(cotton.targetLabel, "自分");
  assert.equal(cotton.accelerationDurationIsMaximum, true);
  assert.match(context.accelerationDurationMarkup(cotton), /最大3秒/);
  assert.equal(findRow("Hoopa", "Trick").targetLabel, "自分・味方");
  assert.equal(findRow("Blissey", "Helping Hand").targetLabel, "自分・味方");
  assert.equal(findRow("Alcremie", "Recover").targetLabel, "味方");
});

test("Power Swap and Surf keep self and ally effects separate", () => {
  const swap = rows.filter(row => row.sourceName === "Mr.Mime" && row.moveName === "Power Swap");
  assert.equal(swap.length, 2);
  assert.deepEqual(swap.map(row => [row.targetLabel, row.accelerationPercent]).sort(), [["味方", 8], ["自分", 10]].sort());
  assert.ok(swap.every(row => profile(row).kind === "fixed"));
  assert.ok(swap.every(row => context.accelerationDurationMarkup(row).includes("リンク中")));
  const surf = rows.filter(row => row.sourceName === "Psyduck" && row.moveName === "Surf");
  assert.equal(surf.length, 2);
  const self = surf.find(row => row.targetLabel === "自分");
  const ally = surf.find(row => row.targetLabel === "味方");
  assert.equal(self.accelerationPercent, 30);
  assert.equal(context.accelerationEffectDuration(self), 5);
  assert.equal(self.accelerationDurationIsMaximum, true);
  assert.equal(ally.accelerationPercent, 70);
  assert.equal(context.accelerationEffectDuration(ally), 3);
  assert.deepEqual(profile(ally).steps, [70, 60, 50, 40, 30]);
});

test("active areas and flight show maximum duration with their conditions", () => {
  for (const [pokemon, move, seconds, condition] of [["Ninetales", "Aurora Veil", 5, "範囲内"], ["Ho-Oh", "Sacred Fire", 6, "飛行中"]]) {
    const row = findRow(pokemon, move);
    assert.equal(context.accelerationEffectDuration(row), seconds);
    assert.match(context.accelerationDurationMarkup(row), new RegExp(`最大${seconds}秒`));
    assert.match(context.accelerationDurationMarkup(row), new RegExp(condition));
    assert.match(details(row), new RegExp(`最大${seconds}秒`));
  }
});

test("conditional duration extensions are visible without changing the base time", () => {
  for (const [pokemon, move, extended] of [["Rapidash", "Agility", 10.5], ["Zacian", "Agility", 6], ["Zacian", "Agility+", 6], ["Armarouge", "Fire Spin", 6]]) {
    const row = findRow(pokemon, move);
    assert.equal(context.accelerationEffectDuration(row), 3);
    assert.equal(row.accelerationExtendedDuration, extended);
    assert.match(context.accelerationDurationMarkup(row), new RegExp(`最大${String(extended).replace(".", "\\.")}秒`));
    assert.match(details(row), /延長/);
  }
  assert.match(context.accelerationDurationMarkup(findRow("Armarouge", "Fire Spin")), /通常攻撃命中で延長/);
  assert.match(context.accelerationEffectPresentation(findRow("Rapidash", "Agility")).description, /最大値は延長時/);
});

test("presentation separates initial, maximum, constant, and timed growth", () => {
  const fixed = findRow("Absol", "Midnight Slash");
  const stacked = findRow("Tyranitar", "Ancient Power");
  const decay = findRow("Pikachu", "Volt Tackle");
  const growth = findRow("Solgaleo", "Psyshock");
  const range = findRow("Dragonite", "Dragon Dance+");
  for (const [row, label] of [[fixed, "一定"], [stacked, "最大"], [decay, "初期"], [growth, "最大"], [range, "最大"]]) {
    assert.equal(context.accelerationEffectPresentation(row).label, label);
    assert.equal(context.accelerationRowMatchesFilter(row, "fixed"), row === fixed);
  }
  assert.equal(context.accelerationRowMatchesFilter(growth, "growth"), true);
  assert.equal(context.accelerationRowMatchesFilter(stacked, "growth"), false);
  assert.deepEqual(Array.from(context.accelerationEffectPresentation(range).steps, step => step.label), ["最小", "最大"]);
  assert.equal(context.accelerationRowMatchesFilter(findRow("Float Stone", "Float Stone"), "fixed"), true);
});

test("step times and tooltip durations retain quarter-second precision", () => {
  const flip = findRow("Vaporeon", "Flip Turn");
  assert.deepEqual(Array.from(context.accelerationEffectPresentation(flip).steps, step => step.label), ["発動時", "0.25秒後", "0.5秒後", "0.75秒後", "1秒後"]);
  assert.match(details(flip), /0\.25秒ごと/);
  assert.equal(context.accelerationEffectPresentation(findRow("Solgaleo", "Psyshock")).steps.at(-1).label, "2.5秒後");
  assert.match(context.accelerationDurationMarkup({ accelerationDuration: 0.75 }), />0\.75秒</);
  assert.match(context.accelerationDurationMarkup(findRow("Blastoise", "Hydro Pump")), />未確認</);
});

test("duration sorting keeps unknown times last and compares base durations", () => {
  const unknown = findRow("Gengar", "Levitate");
  const short = findRow("Dragonite", "Dragon Dance");
  const extended = findRow("Rapidash", "Agility");
  const long = findRow("Clefable", "Moonlight+");
  assert.deepEqual([unknown, short, long, extended].sort((a, b) => context.compareAccelerationRankingRows(a, b, "duration")), [long, extended, short, unknown]);
});

test("Japanese overviews agree with corrected speed effects and their timing", () => {
  const overview = row => context.localizedAccelerationOverviewParts(row).map(part => part.text).join(" ");
  const surf = rows.find(row => row.sourceName === "Psyduck" && row.moveName === "Surf" && row.targetLabel === "味方");
  assert.match(overview(surf), /初期70%/);
  assert.match(overview(surf), /3秒間/);
  const cotton = findRow("Eldegoss", "Cotton Down");
  assert.equal(context.accelerationEffectDuration(cotton), 1.5);
  assert.match(overview(cotton), /1\.5秒間\)15%上がる/);
  assert.doesNotMatch(overview(cotton), /2秒間/);
  assert.match(context.accelerationDurationMarkup(findRow("Eldegoss", "Leaf Tornado")), /経路を離れてから/);
});

console.log(`Acceleration ranking: ${checks} regression checks passed (${rows.length} rows).`);
