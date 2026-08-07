const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_ORIGIN = "https://unite-db.com";

const DATASETS = [
  {
    name: "Pokemon",
    source: "/pokemon.json",
    output: "pokemon.json",
    validate(rows) {
      return rows.length >= 90
        && rows.every((row) => typeof row?.name === "string" && Array.isArray(row?.skills));
    }
  },
  {
    name: "stats",
    source: "/stats.json",
    output: "stats.json",
    validate(rows) {
      return rows.length >= 90
        && rows.every((row) => typeof row?.name === "string" && row?.level?.length === 15);
    }
  },
  {
    name: "held items",
    source: "/held_items.json",
    output: "held_items.json",
    validate(rows) {
      return rows.length >= 30 && rows.every((row) => typeof row?.name === "string");
    }
  },
  {
    name: "boost emblems",
    source: "/emblems.json",
    output: "emblems.json",
    validate(rows) {
      return rows.length >= 500
        && rows.every((row) => typeof row?.name === "string" && typeof row?.grade === "string");
    }
  },
  {
    name: "emblem sets",
    source: "/emblem_sets.json",
    output: "emblem_sets.json",
    validate(rows) {
      return rows.length >= 8 && rows.every((row) => typeof row?.name === "string");
    }
  }
];

function pokemonByName(rows, name) {
  const pokemon = rows.find((row) => row.name === name);
  if (!pokemon) throw new Error(`Pokemon override target was not found: ${name}`);
  return pokemon;
}

function moveByName(pokemon, name) {
  for (const skill of pokemon.skills || []) {
    if (skill.name === name) return skill;
    const upgrade = (skill.upgrades || []).find((entry) => entry.name === name);
    if (upgrade) return upgrade;
  }
  throw new Error(`Move override target was not found: ${pokemon.name} / ${name}`);
}

function setCooldown(move, value) {
  const key = Object.prototype.hasOwnProperty.call(move, "cd1") ? "cd1" : "cd";
  move[key] = String(value);
}

function setRsb(move, values) {
  Object.entries(values).forEach(([key, value]) => {
    move.rsb[key] = String(value);
  });
}

function replaceNumberedText(value, pattern, replacement) {
  const text = String(value || "");
  return pattern.test(text) ? text.replace(pattern, replacement) : text;
}

function applyAeosSummerRushPokemon(rows) {
  const alcremie = pokemonByName(rows, "Alcremie");
  setRsb(moveByName(alcremie, "Recover"), {
    ratio: "234", slider: "14", base: "297",
    add1_ratio: "351", add1_slider: "22", add1_base: "446"
  });
  setRsb(moveByName(alcremie, "Sweet Scent"), {
    ratio: "62.9", slider: "8", base: "209",
    add1_ratio: "89.25", add1_slider: "10", add1_base: "293"
  });

  const feraligatr = pokemonByName(rows, "Feraligatr");
  setRsb(moveByName(feraligatr, "Crunch"), {
    ratio: "220.8", base: "662",
    add1_ratio: "256.7", add1_base: "770",
    enhanced_ratio: "253.9", enhanced_base: "762",
    enhanced_add1_ratio: "294", enhanced_add1_base: "888"
  });

  const megaLucario = pokemonByName(rows, "Mega-Lucario");
  const auraCannon = moveByName(megaLucario, "Aura Cannon");
  auraCannon.rsb.notes = replaceNumberedText(auraCannon.rsb.notes, /mega evolves for \d+s/i, "mega evolves for 20s");
  const adaptability = "While Mega Evolved, Adaptability increases Attack by 4% per stack, up to 10 stacks (40%).";
  if (!auraCannon.rsb.notes.includes(adaptability)) auraCannon.rsb.notes = `${auraCannon.rsb.notes} ${adaptability}`.trim();

  const meganium = pokemonByName(rows, "Meganium");
  setCooldown(moveByName(meganium, "Synthesis"), 5);
  setCooldown(moveByName(meganium, "Grass Knot"), 6);

  const mewtwo = pokemonByName(rows, "MewtwoX");
  setCooldown(moveByName(mewtwo, "Future Sight"), 9);
  const recover = moveByName(mewtwo, "Recover");
  setCooldown(recover, 9);
  recover.rsb.true_desc = replaceNumberedText(recover.rsb.true_desc, /movement speed is increased by \d+%/i, "movement speed is increased by 30%");
  setRsb(moveByName(mewtwo, "Psystrike"), {
    ratio: "45.1", slider: "3", base: "110",
    add1_ratio: "160.6", add1_slider: "8", add1_base: "351"
  });
  setCooldown(moveByName(mewtwo, "Teleport"), 9);

  const palkia = pokemonByName(rows, "Palkia");
  const palkiaAttack = moveByName(palkia, "Attack");
  const palkiaRange = "Basic attack hitbox size: 3m.";
  if (!palkiaAttack.rsb.notes.includes(palkiaRange)) palkiaAttack.rsb.notes = `${palkiaAttack.rsb.notes} ${palkiaRange}`.trim();
  const dragonClaw = moveByName(palkia, "Dragon Claw");
  const dragonClawTiming = "Recovery is 44 frames after the first cast and 23 frames after the second cast at 60 FPS.";
  if (!dragonClaw.rsb.notes.includes(dragonClawTiming)) dragonClaw.rsb.notes = `${dragonClaw.rsb.notes} ${dragonClawTiming}`.trim();

  const raichu = pokemonByName(rows, "Raichu");
  const storedPower = moveByName(raichu, "Stored Power");
  storedPower.rsb.true_desc = replaceNumberedText(storedPower.rsb.true_desc, /auto attack speed by \d+%/i, "auto attack speed by 45%");
  storedPower.rsb.enhanced_true_desc = "The electric blasts also decrease the target's Sp. Def by 8% for 3s (up to 3 times; maximum 24%).";
  const psychic = moveByName(raichu, "Psychic");
  setCooldown(psychic, 8);
  setRsb(psychic, { ratio: "112.64", base: "264" });

  const zacian = pokemonByName(rows, "Zacian");
  const zacianAttack = moveByName(zacian, "Attack");
  const intrepidSword = "While Intrepid Sword is active, empowered basic attacks deal an additional 1% / 2% / 2% / 3% of the target's max HP based on the amount of Aeos energy charged.";
  if (!zacianAttack.rsb.notes.includes(intrepidSword)) zacianAttack.rsb.notes = `${zacianAttack.rsb.notes} ${intrepidSword}`.trim();
  setRsb(moveByName(zacian, "Sacred Sword"), {
    ratio: "56.7", slider: "5", base: "92",
    add1_ratio: "37.26", add1_slider: "3", add1_base: "65",
    add2_ratio: "72.9", add2_slider: "6", add2_base: "127",
    add3_ratio: "48.6", add3_slider: "4", add3_base: "81"
  });

  const zoroark = pokemonByName(rows, "Zoroark");
  const shadowClaw = moveByName(zoroark, "Shadow Claw");
  shadowClaw.rsb.true_desc = replaceNumberedText(shadowClaw.rsb.true_desc, /throw them for \d+(?:\.\d+)?s instead/i, "throw them for 0.5s instead");
  shadowClaw.rsb.enhanced_true_desc = "Strengthens the duration of the throw at the endpoint to 0.6s.";
  setCooldown(moveByName(zoroark, "Night Slash"), 7);
  setRsb(moveByName(zoroark, "Cut"), { ratio: "97.75", slider: "13", base: "287" });
}

function setStatSeries(rows, name, field, values) {
  const levels = pokemonByName(rows, name).level || [];
  if (levels.length !== values.length) throw new Error(`Unexpected stat level count: ${name} / ${field}`);
  levels.forEach((level, index) => { level[field] = values[index]; });
}

function applyAeosSummerRushStats(rows) {
  setStatSeries(rows, "Yveltal", "hp", [3320, 3452, 3596, 3755, 3930, 4123, 4335, 4568, 4824, 5106, 5416, 5757, 6133, 6545, 7000]);
  const yveltalDefense = [72, 80, 89, 99, 110, 122, 135, 149, 165, 183, 202, 223, 246, 272, 300];
  setStatSeries(rows, "Yveltal", "defense", yveltalDefense);
  setStatSeries(rows, "Yveltal", "sp_defense", yveltalDefense);
  setStatSeries(rows, "Zoroark", "hp", [3030, 3105, 3191, 3290, 3741, 3872, 4022, 4195, 4394, 4624, 4887, 5190, 5539, 5939, 6400]);
  setStatSeries(rows, "Zoroark", "defense", [55, 60, 67, 74, 107, 116, 127, 140, 154, 171, 190, 212, 237, 266, 300]);
  setStatSeries(rows, "Zoroark", "sp_defense", [45, 49, 53, 58, 80, 86, 94, 102, 112, 123, 136, 151, 168, 187, 210]);
}

function applyDatasetOverrides(dataset, rows) {
  if (dataset.output === "pokemon.json") {
    applyAeosSummerRushPokemon(rows);
    return true;
  }
  if (dataset.output === "stats.json") {
    applyAeosSummerRushStats(rows);
    return true;
  }
  return false;
}

async function fetchDataset(dataset) {
  const url = new URL(dataset.source, SOURCE_ORIGIN);
  const response = await fetch(url, {
    headers: { "cache-control": "no-cache" }
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);

  const text = await response.text();
  let rows;
  try {
    rows = JSON.parse(text);
  } catch (error) {
    throw new Error(`${url} did not return valid JSON: ${error.message}`);
  }
  if (!Array.isArray(rows) || !dataset.validate(rows)) {
    throw new Error(`${url} returned an unexpected ${dataset.name} data structure`);
  }

  return { dataset, rows, text: text.trim() };
}

async function main() {
  const downloads = await Promise.all(DATASETS.map(fetchDataset));

  for (const { dataset, rows, text } of downloads) {
    const outputPath = path.join(ROOT, "data", dataset.output);
    const outputText = applyDatasetOverrides(dataset, rows) ? JSON.stringify(rows) : text;
    const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    if (previous === outputText) {
      console.log(`Unchanged: ${dataset.output} (${rows.length} records)`);
      continue;
    }
    fs.writeFileSync(outputPath, outputText);
    console.log(`Updated: ${dataset.output} (${rows.length} records)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
