const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const data = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
const context = vm.createContext({ URL });
for (const name of ["config", "patch-translations", "ui", "calculator-core", "feedback", "slow-ranking"]) {
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
  for (const [pokemon, move] of [["Alcremie", "Recover"], ["Greninja", "Torrent"], ["MewtwoY", "Pressure"], ["Lucario", "Power-Up Punch"], ["Mega-Lucario", "Power-Up Punch"], ["Psyduck", "Psychic"]]) {
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
  const flailActivation = rows("Snorlax", "Flail").find(value => context.slowEffectDuration(value) === 1.5);
  assert.ok(flailActivation);
  assert.match(details(flailActivation), /1\.5秒/);
});

test("Fire Spin ranks its initial slow, with the decay amount used only for its profile", () => {
  const value = row("Ho-Oh", "Fire Spin");
  assert.equal(value.slowPercent, 80);
  assert.equal(context.slowEffectDuration(value), 4);
  assert.deepEqual(profile(value).steps, [80, 70, 60, 50, 40, 30, 20, 10, 0]);
  assert.match(details(value), /80%/);
  assert.match(details(value), /0\.5秒ごとに10%/);
});

test("Toxtricity Charge keeps the target slow separate from its self acceleration", () => {
  const charge = row("Toxtricity", "Charge");
  assert.equal(charge.slowPercent, 20);
  assert.equal(context.slowEffectDuration(charge), 2);
  assert.equal(profile(charge).kind, "fixed");
  assert.equal(rows("Toxtricity", "Shift Gear").length, 0);
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

test("Rock Tomb separates projectile and wall durations before and after upgrading", () => {
  const effects = rows("Crustle", "Rock Tomb");
  assert.equal(effects.length, 4);
  for (const plus of [false, true]) {
    const phases = effects.filter(value => value.enhanced === plus);
    assert.deepEqual(phases.map(value => context.slowEffectDuration(value)).sort(), [2, 3]);
    for (const value of phases) {
      const duration = context.slowEffectDuration(value);
      assert.equal(value.slowPercent, plus ? 80 : 60);
      assert.equal(profile(value).kind, "fixed");
      assert.match(context.slowDurationMarkup(value), new RegExp(">" + duration + "秒<"));
      assert.match(details(value), new RegExp("持続時間は" + duration + "秒"));
      const overview = context.localizedSlowOverviewParts(value).map(part => part.text).join(" ");
      assert.match(overview, /2秒/);
      assert.match(overview, /3秒/);
    }
    const sorted = phases.slice().sort((a, b) => context.compareSlowRankingRows(a, b, "duration"));
    assert.equal(context.slowEffectDuration(sorted[0]), 3);
    assert.notEqual(phases[0].moveNote, phases[1].moveNote);
  }
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

test("display labels distinguish fixed, initial, and conditional maximum slows", () => {
  const fixed = row("Meowscarada", "Trailblaze");
  const decay = row("Ho-Oh", "Fire Spin");
  const stacked = row("Duraludon", "Stealth Rock");
  const conditional = row("Dodrio", "Tri Attack");
  const variableWithoutRange = { ...fixed, variable: true };
  for (const [value, label] of [[fixed, "一定"], [decay, "初期"], [stacked, "最大"], [conditional, "最大"], [variableWithoutRange, "最大"]]) {
    assert.equal(context.slowEffectPresentation(value).label, label, `${value.sourceName}/${value.moveName}`);
    assert.equal(context.slowRowMatchesFilter(value, "fixed"), value === fixed);
  }
  assert.deepEqual(Array.from(context.slowEffectPresentation(conditional).steps, step => step.label), ["最小", "最大"]);
});

test("duration display preserves quarter seconds and does not present unknown times as zero", () => {
  assert.match(context.slowDurationMarkup(row("Ninetales", "Snow Warning")), />0\.75秒</);
  const unknown = context.slowDurationMarkup(row("Decidueye", "Astonish"));
  assert.match(unknown, />未確認</);
  assert.doesNotMatch(unknown, />0秒</);
});

test("decay step times use the tick interval rather than the total effect duration", () => {
  const leafStorm = row("Decidueye", "Leaf Storm", true);
  assert.equal(context.slowEffectPresentation(leafStorm).steps.at(-1).label, "2秒後");
  assert.match(context.slowDurationMarkup(leafStorm), />3\.5秒</);
  assert.deepEqual(
    Array.from(context.slowEffectPresentation(row("Feraligatr", "Crunch")).steps, step => step.label),
    ["付与時", "0.25秒後", "0.5秒後", "0.75秒後", "1秒後"]
  );
});

test("duration sorting places longer effects first and unknown times last regardless of slow strength", () => {
  const unknown = row("Decidueye", "Astonish");
  const short = row("Ninetales", "Snow Warning");
  const medium = row("Meowscarada", "Trailblaze");
  const long = row("Decidueye", "Leaf Storm", true);
  const sorted = [unknown, short, long, medium].sort((a, b) => context.compareSlowRankingRows(a, b, "duration"));
  assert.deepEqual(sorted, [long, medium, short, unknown]);
});

test("Mammoth Mash uses each stomp's slow duration, not the final knock-up", () => {
  const value = row("Mamoswine", "Mammoth Mash");
  assert.equal(value.slowPercent, 40);
  assert.equal(context.slowEffectDuration(value), 0.5);
  assert.match(details(value), /0\.5秒/);
  assert.doesNotMatch(details(value), /持続時間は1\.5秒/);
  assert.equal(context.slowEffectDuration({ slowContext: "Slows enemies by 40% and throws them in the air for 1.5s." }), 0);
  assert.equal(context.slowEffectDuration({ slowContext: "Slows enemies by 40% and stuns them for 1.5s." }), 0);
  assert.equal(context.slowEffectDuration(row("Umbreon", "Moonlight Prance")), 5);
});

test("Muddy Water's upgrade adds one second to the base slow", () => {
  for (const plus of [false, true]) {
    const value = row("Vaporeon", "Muddy Water", plus);
    assert.equal(value.slowPercent, 30);
    assert.equal(context.slowEffectDuration(value), plus ? 2 : 1);
    assert.match(details(value), new RegExp(`持続時間は${plus ? 2 : 1}秒`));
  }
});

test("shared debuff durations survive long clauses and Sp. Def abbreviations", () => {
  for (const [pokemon, move, duration] of [
    ["Pikachu", "Attack", 1], ["Pikachu", "Thunder Shock", 2], ["Pikachu", "Electro Ball", 2],
    ["Psyduck", "Tail Whip", 2], ["Zapdos", "Thunderbolt", 2.5],
    ["Zapdos", "Discharge", 2.5], ["Zapdos", "High-Voltage Siege", 2.5]
  ]) {
    const value = row(pokemon, move);
    assert.equal(context.slowEffectDuration(value), duration, `${pokemon}/${move}`);
    assert.match(details(value), new RegExp(`${String(duration).replace(".", "\\.")}秒`));
  }
  // Static gives its movement and attack-speed debuffs different durations.
  assert.equal(context.slowEffectDuration(row("Pikachu", "Static")), 2.5);
});

test("Japanese details agree with Glacial Stage and Articuno Ice Beam", () => {
  const stage = row("Glaceon", "Glacial Stage");
  assert.equal(context.slowEffectDuration(stage), 2);
  assert.match(details(stage), /2秒/);
  assert.match(details(stage), /6秒/);
  assert.doesNotMatch(details(stage), /持続時間は6秒/);
  const beam = row("Articuno", "Ice Beam");
  assert.equal(beam.slowPercent, 40);
  assert.match(details(beam), /40%/);
  assert.doesNotMatch(details(beam), /30%/);
  assert.match(context.localizedSlowOverviewParts(beam).map(part => part.text).join(" "), /40%/);
});

test("Sableye separates its ordinary boosted attack from the stealth fear", () => {
  const effects = rows("Sableye", "Attack");
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.map(value => [value.slowPercent, context.slowEffectDuration(value)]), [[20, 2], [40, 1]]);
  for (const value of effects) {
    assert.equal(profile(value).kind, "fixed");
    assert.deepEqual(profile(value).steps, []);
    assert.match(details(value), new RegExp(`${value.slowPercent}%`));
  }
  assert.match(effects[1].moveNote, /ステルス.*恐怖/);
  assert.match(details(effects[1]), /1秒間恐怖/);
});

test("generated details preserve quarter-second durations and decay intervals", () => {
  assert.match(details(row("Delphox", "Fanciful Fireworks")), /1\.75秒/);
  assert.match(context.japaneseSlowFallbackParts(row("Feraligatr", "Crunch"))[0].text, /0\.25秒ごと/);
});

test("Sludge Bomb does not use the Sp. Def timer as the area slow duration", () => {
  const effects = rows("Venusaur", "Sludge Bomb");
  assert.equal(effects.length, 2);
  const impact = effects.find(value => value.moveNote === "着弾時");
  const area = effects.find(value => value !== impact);
  assert.ok(impact);
  assert.equal(impact.slowPercent, 50);
  assert.equal(context.slowEffectDuration(impact), 2);
  assert.match(details(impact), /2秒/);
  assert.equal(area.slowPercent, 50);
  assert.equal(context.slowEffectDuration(area), 0);
  assert.match(context.slowDurationMarkup(area), /未確認/);
  assert.doesNotMatch(details(area), /持続時間は2秒|100%/);
});


test("paralysis slows inherit only their linked paralysis duration", () => {
  for (const [pokemon, move, duration] of [
    ["Morpeko", "Thunder Shock", 1], ["Morpeko", "Spark", 4],
    ["Morpeko", "Hungry Supercharge Wheel", 4], ["Reshiram", "Dragon Breath", 2]
  ]) {
    const value = row(pokemon, move);
    assert.equal(context.slowEffectDuration(value), duration, pokemon + "/" + move);
    assert.match(context.slowDurationMarkup(value), new RegExp(">" + duration + "秒<"));
  }
  const unrelated = context.slowPercentCandidates("The user is shielded for 6s. Decreases opposing Pokémon movement speed by 30%.");
  assert.ok(unrelated.length);
  assert.ok(unrelated.every(value => value.duration === 0));
});

test("conditional slow strength retains an explicitly shared duration", () => {
  for (const [pokemon, move, percent, duration] of [["Trevenant", "Curse", 22, 1], ["Sableye", "Astonish", 60, 2]]) {
    const value = row(pokemon, move);
    assert.equal(value.slowPercent, percent);
    assert.equal(context.slowEffectDuration(value), duration);
    assert.match(details(value), new RegExp(duration + "秒"));
  }
});

test("conditional duration inheritance does not leak into a separate effect", () => {
  const candidates = context.slowPercentCandidates("Decreases opposing Pokémon movement speed by 30% for 2s. If this move hits from behind, it applies a greater decrease in movement speed to 60%. The explosion slows enemies by 10%.");
  assert.ok(candidates.some(value => value.percent === 60 && value.duration === 2));
  const explosion = candidates.filter(value => value.percent === 10);
  assert.ok(explosion.length);
  assert.ok(explosion.every(value => value.duration === 0));
  assert.equal(context.slowPercentCandidates("The user is slowing movement speed by 30% for 2s while enemies are nearby.").length, 0);
});

test("removing Dragonite's own slow does not invent an upgraded opponent slow", () => {
  assert.equal(rows("Dragonite", "Extreme Speed").length, 1);
  assert.equal(row("Dragonite", "Extreme Speed").slowPercent, 50);
  assert.equal(context.slowEffectDuration(row("Dragonite", "Extreme Speed")), 2);
});

test("Flail activation and attacks retain separate rates and durations", () => {
  const effects = rows("Snorlax", "Flail");
  assert.equal(effects.length, 3);
  assert.deepEqual(effects.map(value => [value.slowPercent, context.slowEffectDuration(value)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[20, 1], [50, 1], [50, 1.5]]);
  assert.equal(new Set(effects.map(value => value.moveNote)).size, 3);
  for (const value of effects) {
    assert.equal(profile(value).kind, "fixed");
    assert.match(details(value), new RegExp(value.slowPercent + "%"));
    assert.match(details(value), new RegExp(String(context.slowEffectDuration(value)).replace(".", "\\.") + "秒"));
  }
});

test("Zapdos Static distinguishes electric fields from retaliation paralysis", () => {
  const effects = rows("Zapdos", "Static");
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.map(value => context.slowEffectDuration(value)).sort(), [2.5, 3]);
  assert.equal(new Set(effects.map(value => value.moveNote)).size, 2);
  for (const value of effects) {
    assert.equal(value.slowPercent, 30);
    assert.equal(profile(value).kind, "fixed");
    assert.match(details(value), new RegExp(String(context.slowEffectDuration(value)).replace(".", "\\.") + "秒"));
  }
});

test("Japanese overviews preserve current slow rates and durations", () => {
  const wiki = data("wiki_move_descriptions_ja.json").entries;
  for (const [pokemon, move, expected, stale] of [
    ["Delphox", "Fire Spin", /4秒/, /(?<![.\d])5秒/],
    ["Eldegoss", "Cotton Spore", /40%/, /30%/],
    ["Falinks", "Iron Head", /1\.5秒/, /(?<![.\d])1秒/],
    ["Meowscarada", "Leafage", /2\.5秒/, /(?<![.\d])2秒/]
  ]) {
    const value = row(pokemon, move);
    const overview = context.localizedSlowOverviewParts(value).map(part => part.text).join(" ");
    const wikiOverview = wiki[value.descriptionKey].map(part => part.text).join(" ");
    for (const text of [overview, wikiOverview]) {
      assert.match(text, expected, pokemon + "/" + move);
      assert.doesNotMatch(text, stale, pokemon + "/" + move);
    }
  }
});
