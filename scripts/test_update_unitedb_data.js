const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { applyDatasetOverrides } = require("./update_unitedb_data");

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pokemon.json"), "utf8"));
function crunch(data) {
  return data.find((pokemon) => pokemon.name === "Feraligatr").skills
    .flatMap((skill) => skill.upgrades || []).find((move) => move.name === "Crunch").rsb;
}

function rockTomb(data) {
  return data.find((pokemon) => pokemon.name === "Crustle").skills
    .flatMap((skill) => skill.upgrades || []).find((move) => move.name === "Rock Tomb").rsb;
}

const current = crunch(rows);
// September 3 nerf affects the red/purple fangs, not the yellow fangs.
for (const [field, expected] of Object.entries({
  ratio: "198.7", base: "596", enhanced_ratio: "232", enhanced_base: "695",
  add1_ratio: "256.7", add1_base: "770", enhanced_add1_ratio: "294", enhanced_add1_base: "888"
})) {
  assert.equal(current[field], expected, `Crunch ${field} must match the current source`);
}

for (const simulateFutureUpdate of [false, true]) {
  const fetched = structuredClone(rows);
  const sourceCrunch = crunch(fetched);
  if (simulateFutureUpdate) {
    sourceCrunch.ratio = "190";
    sourceCrunch.enhanced_ratio = "225";
    sourceCrunch.add1_base = "750";
  }
  const expected = structuredClone(sourceCrunch);
  applyDatasetOverrides({ output: "pokemon.json" }, fetched);
  assert.deepEqual(crunch(fetched), expected, "Legacy overrides must preserve all fetched Crunch values");
}

for (const [duration, slowPercent] of [[2, 60], [3, 60], [4, 60], [2, 50]]) {
  const fetched = structuredClone(rows);
  const sourceRockTomb = rockTomb(fetched);
  const prefix = "The user splits open the ground in a line towards the designated location, damaging opposing Pokémon in the path and ";
  const suffix = " A curved wall of rock is then created at the designated location that remains for up to 3s. When the wall of rock is created or destroyed, opposing Pokémon near the wall are damaged and their movement speed is decreased by 60% for 3s.";
  sourceRockTomb.true_desc = `${prefix}decreasing their movement speed by ${slowPercent}% for ${duration}s.${suffix}`;
  const expected = structuredClone(sourceRockTomb);

  applyDatasetOverrides({ output: "pokemon.json" }, fetched);
  assert.deepEqual(rockTomb(fetched), expected, `Rock Tomb ${slowPercent}% for ${duration}s must preserve the fetched effect durations and strength`);
  applyDatasetOverrides({ output: "pokemon.json" }, fetched);
  assert.deepEqual(rockTomb(fetched), expected, "Repeated data updates must preserve Rock Tomb source values");
}

console.log("UniteDB update regression tests passed (Crunch and Rock Tomb source values preserved, including future updates).");
