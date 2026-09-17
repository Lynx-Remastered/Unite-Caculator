const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { applyDatasetOverrides } = require("./update_unitedb_data");

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pokemon.json"), "utf8"));
function crunch(data) {
  return data.find((pokemon) => pokemon.name === "Feraligatr").skills
    .flatMap((skill) => skill.upgrades || []).find((move) => move.name === "Crunch").rsb;
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

console.log("UniteDB update regression tests passed (current and future Crunch values preserved).");
