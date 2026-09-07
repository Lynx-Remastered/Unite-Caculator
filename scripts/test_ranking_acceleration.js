"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
const state = { pokemon: readJson("pokemon.json"), heldItems: readJson("held_items.json") };
// These helpers only supply labels/icons; use the actual extraction and profile
// functions together with the bundled game data for every numerical assertion.
const context = vm.createContext({
  state,
  number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  },
  formatNumber: (value, digits = 0) => String(Number(Number(value).toFixed(digits))),
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
    ["Armarouge", "Fire Spin", 6],
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

console.log(`Acceleration ranking: ${checks} regression checks passed (${rows.length} rows).`);
