const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const data = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
const context = vm.createContext({ URL });
for (const name of ["config", "patch-translations", "ui", "calculator-core", "slow-ranking"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", `${name}.js`), "utf8"), context, { filename: `${name}.js` });
}
context.fixtureData = {
  pokemon: data("pokemon.json"),
  moveNamesJa: data("move_names_ja.json"),
  slowDescriptionsJa: data("slow_descriptions_ja.json")
};
vm.runInContext("Object.assign(state, fixtureData)", context);
const allRows = vm.runInContext("state.pokemon.filter(p => !p.exclude_stats).flatMap(pokemonSlowRankingRows)", context);
const rows = (pokemon, move) => allRows.filter(row => row.sourceName === pokemon
  && row.descriptionKey.split("::")[2] === move);
const row = (pokemon, move, plus = false) => {
  const found = rows(pokemon, move).filter(item => item.enhanced === plus);
  assert.equal(found.length, 1, `${pokemon}/${move}${plus ? "+" : ""} must have one row`);
  return found[0];
};
const profile = (value) => JSON.parse(JSON.stringify(context.slowEffectProfile(value)));
const details = (value) => context.localizedSlowDetailParts(value).map(part => part.text).join(" ");

test("the full dataset excludes self/ally buffs and charge-time self slows", () => {
  for (const [pokemon, move] of [["Alcremie", "Recover"], ["Greninja", "Torrent"], ["MewtwoY", "Pressure"], ["Lucario", "Power-Up Punch"], ["Mega-Lucario", "Power-Up Punch"]]) {
    assert.equal(rows(pokemon, move).length, 0, `${pokemon}/${move}`);
  }
  const trailblaze = row("Meowscarada", "Trailblaze");
  assert.equal(trailblaze.slowPercent, 40);
  assert.equal(context.slowEffectDuration(trailblaze), 2);
  assert.equal(profile(trailblaze).kind, "fixed");
});

test("opponent effects survive references to the user in the same sentence", () => {
  assert.equal(row("Inteleon", "Acrobatics").slowPercent, 30);
  assert.equal(context.slowEffectDuration(row("Inteleon", "Acrobatics")), 2);
  assert.equal(row("Ho-Oh", "Flamethrower").slowPercent, 15);
  assert.equal(context.slowEffectDuration(row("Ho-Oh", "Flamethrower")), 1.5);
  assert.equal(context.slowEffectDuration(row("Greninja", "Water Shuriken")), 1);
  assert.equal(context.slowEffectDuration(row("Snorlax", "Flail")), 1.5);
  assert.match(details(row("Snorlax", "Flail")), /1\.5秒/);
});

test("Fire Spin ranks its initial slow, with the decay amount used only for its profile", () => {
  const value = row("Ho-Oh", "Fire Spin");
  assert.equal(value.slowPercent, 80);
  assert.equal(context.slowEffectDuration(value), 4);
  assert.deepEqual(profile(value).steps, [80, 70, 60, 50, 40, 30, 20, 10, 0]);
  assert.match(details(value), /80%/);
  assert.match(details(value), /0\.5秒ごとに10%/);
});

test("projectile caps and explicit stacks both rank their attainable maximum", () => {
  for (const [pokemon, move, percent, stacks] of [["Espeon", "Psyshock", 75, 5], ["Espeon", "Stored Power", 50, 5], ["Duraludon", "Stealth Rock", 100, 4], ["Lapras", "Ice Beam", 90, 6], ["Wigglytuff", "Sing", 60, 4]]) {
    const value = row(pokemon, move);
    assert.equal(value.slowPercent, percent, `${pokemon}/${move}`);
    assert.equal(value.stackMultiplier, stacks, `${pokemon}/${move}`);
    assert.equal(profile(value).steps.at(-1), percent);
  }
  assert.match(details(row("Espeon", "Psyshock")), /75%/);
  assert.match(details(row("Espeon", "Stored Power")), /50%/);
  assert.equal(row("Dodrio", "Tri Attack").slowPercent, 40);
  assert.match(details(row("Dodrio", "Tri Attack")), /ダッシュゲージ/);
});

test("upgrade wording changes the slow value without overwriting the base move", () => {
  for (const [pokemon, move, base, plus] of [["Mew", "Electro Ball", 40, 60], ["Miraidon", "Thunder", 10, 20], ["Pawmot", "Supercell Slam", 30, 40], ["Reshiram", "Blue Flare", 30, 40], ["Machamp", "Dynamic Punch", 40, 60], ["MewtwoX", "Psystrike", 50, 75]]) {
    assert.equal(row(pokemon, move).slowPercent, base, `${pokemon}/${move}`);
    const upgraded = row(pokemon, move, true);
    assert.equal(upgraded.slowPercent, plus, `${pokemon}/${move}+`);
    assert.match(details(upgraded), new RegExp(`${plus}%`));
  }
});

test("duration upgrades, leading decimal points, and multi-phase slows retain their times", () => {
  assert.equal(context.slowEffectDuration(row("Latios", "Telekinesis")), 2);
  assert.equal(context.slowEffectDuration(row("Latios", "Telekinesis", true)), 3);
  assert.equal(context.slowEffectDuration(row("Ninetales", "Snow Warning")), 0.75);
  assert.equal(context.slowEffectDuration(row("Chandelure", "Poltergeist")), 2);
  assert.equal(context.slowEffectDuration(row("Chandelure", "Poltergeist", true)), 2);
  assert.deepEqual(profile(row("Chandelure", "Poltergeist", true)).steps, [80, 50]);
});

test("Scald shows independent impact and steam effects without a fictitious growth curve", () => {
  const effects = rows("Slowbro", "Scald");
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.map(value => [value.slowPercent, context.slowEffectDuration(value)]), [[80, 0.5], [30, 3]]);
  for (const effect of effects) {
    assert.equal(profile(effect).kind, "fixed");
    assert.deepEqual(profile(effect).steps, []);
    assert.match(details(effect), new RegExp(`${effect.slowPercent}%`));
  }
});

test("a duration-only upgrade preserves the normal decay specification", () => {
  for (const plus of [false, true]) {
    const value = row("Decidueye", "Leaf Storm", plus);
    assert.deepEqual(profile(value).steps, [60, 50, 40, 30, 20]);
    assert.equal(context.slowEffectDuration(value), plus ? 3.5 : 2.5);
  }
  assert.deepEqual(profile(row("Sylveon", "Draining Kiss")).steps, [50, 35]);
});

test("shared decay parsing recognizes an explicit decreasing rate, not ordinary debuffs", () => {
  const greedent = context.fixtureData.pokemon.find(p => p.name === "Greedent");
  const stuffCheeks = greedent.skills.flatMap(skill => [skill, ...(skill.upgrades || [])]).find(move => move.name === "Stuff Cheeks");
  const source = [stuffCheeks.rsb.true_desc, stuffCheeks.rsb.notes].join(" ");
  const decay = context.speedDecaySpec(source);
  assert.ok(decay, "Stuff Cheeks has an explicit decrease every second");
  assert.equal(decay.amount, 15);
  assert.equal(decay.interval, 1);
  assert.equal(context.speedDecaySpec("Decreases opposing Pokémon movement speed by 30% for 2s."), null);
});
