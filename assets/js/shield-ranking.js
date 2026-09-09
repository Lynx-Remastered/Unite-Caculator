// Shield rankings compare one application to one recipient, including held-item
// effects that can trigger with the selected move. Separate timings stay separate.
const SHIELD_RANKING_PREFIXES = [
  "", "add1", "add2", "add3", "add4", "add5",
  "enhanced", "enhanced_add1", "enhanced_add2", "enhanced_add3", "enhanced_add4", "enhanced_add5"
];

const SHIELD_RANKING_LABELS_JA = Object.freeze({
  "Shield": "シールド",
  "Shield - Additional": "追加シールド",
  "Additional Shield": "追加シールド",
  "Shield - Bonus": "相手を引き寄せたときの追加シールド",
  "Shield (up to 6 total)": "ほのおのうず中のシールド",
  "Shield - per Stealth Rock": "ステルスロック1個分のシールド",
  "Shield - per Enemy": "相手1体分のシールド",
  "Shield - Per Enemy": "相手1体分のシールド",
  "Shield - per Enemy Hit": "相手1体に命中したシールド",
  "Shield (per Pokémon hit - up to 3)": "相手1体に命中したシールド",
  "Shield (Torrent)": "げきりゅう中のシールド",
  "Shield (Queenly Majesty buff)": "じょおうのいげん中のシールド",
  "Shield (Single Strike)": "いちげきのかたのシールド",
  "Shield - Additional (Per Hit)": "1ヒット分の追加シールド",
  "Shield (per charge stack)": "チャージ1段階分のシールド",
  "Shield - per stack": "1スタック分のシールド",
  "Shield - per Stack": "1スタック分のシールド",
  "Shield - Attach (Synthesis or Floral Healing)": "こうごうせい・フラワーヒールで付くシールド",
  "Shield - Attach (Sweet Kiss)": "てんしのキッスで付くシールド",
  "Shield - Spinning Edge (Liquidation)": "アクアブレイク後のスピンエッジシールド",
  "Shield - Spinning Edge (Liquidation+)": "アクアブレイク＋後のスピンエッジシールド",
  "Overheal Shield": "余剰回復によるシールド",
  "Overheal Shield - Additional per Flower": "花1個分の余剰回復シールド",
  "Empowered Floral Healing Overheal Shield": "強化フラワーヒールの余剰回復シールド",
  "Empowered Floral Healing Overheal Shield - Additional Per Flower": "花1個分の強化余剰回復シールド"
});

function isRankingShieldLabel(label) {
  // "Floral Healing" names an attaching move or an overheal effect, not healing.
  return /\bshield\b/i.test(String(label || ""))
    && !/^\s*(?:damage|healing|heal)\s*-/i.test(String(label || ""))
    && !/shield stance/i.test(String(label || ""));
}

function parseRankingShieldHpFormula(text, pokemonName = "") {
  // Accept only a complete, unambiguous formula. Descriptive shields without a
  // known amount must not silently become zero or use another effect's ratio.
  const match = String(text || "").trim().match(
    /^(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:([A-Za-z-]+)['’]s\s+)?max\s+HP(?:\s+shield)?(?:\s*\+\s*(\d+(?:\.\d+)?))?\.?$/i
  );
  if (!match || match[2] && match[2].toLowerCase() !== String(pokemonName).toLowerCase()) return null;
  return { ratio: number(match[1]), slider: 0, base: number(match[3]), dmgType: "MaxHP", sourceType: "maxHp" };
}

function shieldRankingTargetScope(pokemon, node) {
  if (pokemon.name === "Comfey") return "ally";
  return inferShieldTargetScope(null, node, pokemon.name);
}

function shieldRankingPartMetadata(pokemon, node, part) {
  const label = part.label;
  if (pokemon.name === "Comfey" && node.name === "Triage" && /Sweet Kiss/.test(label)) {
    part.minLevel = Math.max(part.minLevel, 4);
  }
  if (pokemon.name === "Urshifu" && /Single Strike/.test(label)) {
    part.minLevel = Math.max(part.minLevel, 5);
  }
  if (pokemon.name === "Quaquaval" && /Spinning Edge \(Liquidation/.test(label)) {
    part.enhanced = /Liquidation\+/.test(label);
    part.minLevel = part.enhanced ? 13 : 7;
    part.effectKey = "spinning-edge-liquidation";
  }
  return part;
}

function shieldRankingEntries(pokemon, node, rsb, minLevel, meta) {
  const entries = [];
  if (!rsb) return entries;
  SHIELD_RANKING_PREFIXES.forEach((prefix) => {
    const field = (key) => getRsbField(rsb, prefix, key);
    const label = String(field("label") || "").trim();
    if (!isRankingShieldLabel(label)) return;
    const rawRatio = field("ratio");
    const type = String(field("dmg_type") || "").trim();
    const formula = rawRatio !== "" && rawRatio !== undefined && rawRatio !== null
      && [rawRatio, field("slider"), field("base")].every((value) => value === "" || value == null || Number.isFinite(Number(value)))
      && ["Atk", "SpAtk", "MaxHP"].includes(type) && String(field("exception")) !== "True"
      ? { ratio: number(rawRatio), slider: number(field("slider")), base: number(field("base")), dmgType: type }
      : parseRankingShieldHpFormula(field("true_desc"), pokemon.name);
    // Superpower's variable Muscle Gauge is explicitly held at zero; its known
    // base shield remains comparable without guessing the player's gauge.
    const muscleGaugeFormula = pokemon.name === "Buzzwole" && node.name === "Superpower"
      && /^20% Max HP \+ 2% Max HP \* Muscle Gauge$/i.test(String(field("true_desc") || "").trim());
    if (!formula && !muscleGaugeFormula) return;
    const enhanced = prefix.startsWith("enhanced");
    const part = {
      ...meta,
      ...(formula || { ratio: 20, slider: 0, base: 0, dmgType: "MaxHP", sourceType: "maxHp" }),
      id: `shield-ranking-${meta.slotKey}-${prefix || "base"}`,
      ownerName: node.name,
      label,
      partKey: prefix || "base",
      basePartKey: prefix.replace(/^enhanced_?/, "") || "base",
      enhanced,
      minLevel: enhanced ? number(node.level2, minLevel) : minLevel,
      targetScope: shieldRankingTargetScope(pokemon, node),
      contextText: [node.description, node.description1, rsb.true_desc, rsb.notes, rsb.rsb_info].filter(Boolean).join(" "),
      notes: [field("true_desc"), field("notes"), field("rsb_info")].filter(Boolean).join(" "),
      muscleGaugeFormula
    };
    entries.push(shieldRankingPartMetadata(pokemon, node, part));
  });
  return entries;
}

function shieldRankingUniteBuffEntries(node, meta) {
  const text = String(node.buffs || "");
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)%\s*Max HP\s*Shield\b/gi)];
  const seen = new Set();
  return matches.flatMap((match, index) => {
    const clause = text.slice(match.index, matches[index + 1]?.index ?? text.length);
    const context = [node.rsb?.true_desc, node.rsb?.notes].filter(Boolean).join(" ");
    const end = /(?:applied when the move ends|after stopping)/i.test(clause)
      || /unite buffs occur after the move ends/i.test(context);
    const start = !end && /(?:on activation|granted at the start)/i.test(clause);
    const phase = end ? "end" : "activation";
    // Some data sources repeat the same buff for two forms. A repeated formula
    // is not a second application, whereas Lapras explicitly has two timings.
    const dedupeKey = `${phase}:${number(match[1])}`;
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);
    const displayLabel = start ? "ユナイト技開始時のシールド" : end ? "ユナイト技終了時のシールド" : "ユナイト技使用時の共通シールド";
    return [{
      ...meta,
      id: `shield-ranking-${meta.slotKey}-unite-buff-${index}`,
      ownerName: node.name,
      label: displayLabel,
      displayLabel,
      ratio: number(match[1]), slider: 0, base: 0,
      dmgType: "MaxHP", sourceType: "maxHp",
      enhanced: false,
      minLevel: meta.minLevel,
      targetScope: "self",
      effectKey: `unite-buff-${index}`,
      partKey: `unite-buff-${index}`,
      basePartKey: `unite-buff-${index}`,
      uniteBuff: true,
      phase,
      notes: text,
      contextText: text
    }];
  });
}

function shieldRankingItemEntries(node, rsb, meta, level, itemRows) {
  const entries = [];
  const damageEntries = [];
  addRsbEntries(damageEntries, rsb, node.name, meta.groupName, meta.minLevel, "", {
    ...meta, enhancedMinLevel: node.level2 || meta.minLevel
  });
  const canTriggerResonantGuard = meta.groupName !== "Basic"
    && damageEntries.some((part) => level >= part.minLevel && isAutoIncludedDamageEntry(part));
  const definitions = [
    { name: "Resonant Guard", key: "resonant-guard", enabled: canTriggerResonantGuard },
    { name: "Buddy Barrier", key: "buddy-barrier", enabled: meta.groupName === "Unite Move" }
  ];
  definitions.forEach(({ name, key, enabled }) => {
    const row = itemRows.find((entry) => entry.item.name === name);
    if (!enabled || !row) return;
    entries.push({
      ...meta,
      id: `shield-ranking-${meta.slotKey}-${key}`,
      ownerName: node.name,
      label: `Shield - ${jpItemName(name)}`,
      displayLabel: jpItemName(name),
      ratio: effectTierForRows(itemRows, name),
      slider: 0,
      base: name === "Resonant Guard" ? row.level < 10 ? 60 : row.level < 20 ? 80 : 100 : 0,
      dmgType: "MaxHP", sourceType: "maxHp", itemSource: name,
      enhanced: false, targetScope: "both", phase: "activation",
      partKey: key, basePartKey: key, effectKey: key,
      notes: "", contextText: ""
    });
  });
  return entries;
}

function shieldRankingChoicesForPokemon(pokemon, level, itemRows = []) {
  const choices = [];
  if (!pokemon) return choices;
  (pokemon.skills || []).forEach((skill, skillIndex) => {
    const ability = skill.ability;
    const moveIndex = ability === "Move 1" ? 0 : ability === "Move 2" ? 1 : -1;
    const replacementLevel = Math.min(Infinity, ...(skill.upgrades || [])
      .map((node) => number(node.level1 || node.level, Infinity)));
    [skill, ...(skill.upgrades || [])].forEach((node, nodeIndex) => {
      // Psykaboom's level is absent in the bundled data; the move unlocks at 9.
      // https://www.serebii.net/pokemonunite/pokemon/armarouge.shtml
      const uniteMinLevel = number(node.level, pokemon.name === "Armarouge" ? 9 : Infinity);
      const minLevel = ability === "Unite Move" ? uniteMinLevel
        : nodeIndex > 0 ? number(node.level1 || node.level, 1)
        : moveIndex >= 0 ? baseMoveMinLevel(pokemon, moveIndex) : number(node.level, 1);
      const maxLevel = nodeIndex === 0 && moveIndex >= 0 && String(pokemon.standard_moves).toLowerCase() !== "false"
        ? replacementLevel - 1 : 15;
      if (level < minLevel || level > maxLevel) return;
      (ability === "Basic" ? ["rsb", "boosted_rsb"] : ["rsb"]).forEach((rsbKey) => {
        const slotKey = `${ability === "Basic" ? rsbKey === "boosted_rsb" ? "boosted" : "basic" : `skill-${skillIndex}`}-${nodeIndex}`;
        const displayName = ability === "Basic" ? rsbKey === "boosted_rsb" ? "強化攻撃" : "通常攻撃" : node.name;
        const slotLabel = ability === "Basic" ? rsbKey === "boosted_rsb" ? "通常強化" : "通常"
          : ability === "Unite Move" ? "ユナイト技" : moveIndex >= 0 ? `技${moveIndex + 1}` : "特性";
        const meta = { slotKey, slotLabel, displayName, minLevel, pokemonName: pokemon.name, groupName: ability, iconUrl: skillIconUrl(pokemon.name, ability === "Basic" ? "Attack" : node.name) };
        const entries = shieldRankingEntries(pokemon, node, node[rsbKey], minLevel, meta);
        if (ability === "Unite Move") {
          // Alcremie's activation shield is stored in notes rather than an RSB
          // shield field. Only this explicit complete formula is accepted.
          if (pokemon.name === "Alcremie" && node.name === "Fluffy Cream Supreme") {
            const formula = parseRankingShieldHpFormula(String(node.rsb?.notes || "").replace(/^The shield is\s+/i, ""), pokemon.name);
            if (formula) entries.push({ ...meta, ...formula,
              id: `shield-ranking-${slotKey}-activation-shield`, ownerName: node.name,
              label: "Shield", enhanced: false, targetScope: "self",
              partKey: "activation-shield", basePartKey: "activation-shield",
              notes: node.rsb.notes, contextText: node.rsb.true_desc });
          }
          entries.push(...shieldRankingUniteBuffEntries(node, meta));
        }
        entries.push(...shieldRankingItemEntries(node, node[rsbKey], meta, level, itemRows));
        if (!entries.some((part) => level >= part.minLevel)) return;
        choices.push({ ...meta, minLevel, maxLevel, entries, disabled: false,
          contextText: [node.buffs, node.rsb?.true_desc, node.rsb?.notes].filter(Boolean).join(" "),
          descriptionKey: [pokemon.name, ability, node.name || "", rsbKey].join("::") });
      });
    });
  });
  return choices;
}

function computeRankingShieldStats(pokemon, level, itemRows) {
  const stats = computeRankingHealingStats(pokemon, level, itemRows);
  const baseStats = pokemonStats(pokemon.name, level);
  const hpFlat = itemRows.reduce((sum, row) => sum + (row.item.stats || [])
    .filter((stat) => stat.label === "HP")
    .reduce((subtotal, stat) => subtotal + itemLevelValue(row.level, stat), 0), 0);
  const maxHp = Math.max(0, number(baseStats && baseStats.hp) + hpFlat);
  return { ...stats, hp: maxHp, maxHp };
}

function shieldRankingVariantsForChoice(choice, level) {
  const groups = new Map();
  const available = (choice.entries || []).filter((part) => level >= part.minLevel);
  const itemParts = available.filter((part) => part.itemSource);
  available.filter((part) => !part.itemSource).forEach((part) => {
    const key = part.effectKey || normalizeShieldLabel(part.label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(part);
  });
  const effects = [...groups.entries()].flatMap(([key, entries]) => {
    const enhanced = entries.filter((part) => part.enhanced);
    const selected = enhanced.length ? enhanced : entries.filter((part) => !part.enhanced);
    // Normal-move conditional effects remain separate comparisons.
    return selected.map((part, index) => ({
      key: `${key}-${index}`,
      label: part.label,
      displayLabel: part.displayLabel || SHIELD_RANKING_LABELS_JA[part.label] || `シールド（${part.label}）`,
      parts: [part]
    }));
  });
  if (choice.groupName === "Unite Move") {
    const phases = new Map();
    const followups = [];
    effects.forEach((effect) => {
      if (choice.pokemonName === "Comfey" && /Empowered Floral Healing/.test(effect.label)) {
        followups.push({ ...effect, phase: "followup" });
        return;
      }
      const phase = effect.parts[0].phase || "activation";
      if (!phases.has(phase)) phases.set(phase, []);
      phases.get(phase).push(...effect.parts);
    });
    if (itemParts.length) {
      if (!phases.has("activation")) phases.set("activation", []);
      phases.get("activation").push(...itemParts);
    }
    return [...phases.entries()].map(([phase, parts]) => ({
      key: `unite-${phase}`, phase, label: "Shield",
      displayLabel: phase === "end" ? "ユナイト技終了時のシールド合計" : "ユナイト技1回分のシールド合計",
      parts
    })).concat(followups);
  }
  if (!effects.length && itemParts.length) return [{
    key: "held-item-shield", phase: "activation", label: "Shield",
    displayLabel: "持ち物で発生するシールド", parts: itemParts
  }];
  return effects.map((effect) => ({ ...effect, phase: "activation", parts: [...effect.parts, ...itemParts] }));
}

function shieldRankingAssumption(pokemon, choice, variant, targetScope, rescueHoodPercent = 0) {
  const moveParts = variant.parts.filter((part) => !part.itemSource);
  const label = moveParts.map((part) => part.label).join(" / ");
  const notes = ["1回・1対象分"];
  if (variant.phase === "end") notes.push("技終了時の付与分（発動時とは別）");
  if (variant.phase === "followup") notes.push("ユナイト後に別途フラワーヒール使用");
  if (moveParts.some((entry) => entry.muscleGaugeFormula)) notes.push("マッスルゲージ0");
  if (variant.parts.some((entry) => entry.sourceType === "maxHp" || entry.dmgType === "MaxHP")) notes.push("最大HP式は使用者基準");
  if (/additional|bonus/i.test(label) && moveParts.length === 1) notes.push("技の追加分のみ");
  if (/per (?:charge )?stack/i.test(label)) notes.push("1スタック");
  if (/per (?:Enemy|Pokémon)|per Enemy Hit/i.test(label)) notes.push("相手1体に命中");
  if (/per flower/i.test(label)) notes.push("花1個分");
  if (/Overheal Shield/i.test(label)) notes.push("味方のHP満タン時");
  if (/Queenly Majesty/i.test(label)) notes.push("じょおうのいげん発動時");
  if (/Torrent/i.test(label)) notes.push("げきりゅう発動時");
  if (/Single Strike/i.test(label)) notes.push("いちげきのかた");
  if (/Spinning Edge/i.test(label)) notes.push("アクアブレイク使用後");
  if (/Attach/i.test(label)) notes.push("味方へくっつくとき");
  if (pokemon.name === "Armarouge" && choice.displayName === "Fire Spin") notes.push("攻撃命中1回・最大6回のうち1回");
  if (pokemon.name === "Alcremie" && choice.displayName === "Helping Hand") notes.push("自分か味方を選択");
  if (pokemon.name === "Latias" && choice.displayName === "Dragon Cheer") notes.push("初回の付与");
  if (pokemon.name === "Comfey" && /Empowered Floral Healing/.test(label)) notes.push("ユナイト技による強化中");
  if (pokemon.name === "Quaquaval" && choice.displayName === "Carnival Splash" && /Bonus/.test(label)) notes.push("相手1体を引き寄せた追加分を含む");
  if (pokemon.name === "Tyranitar" && choice.displayName === "Ancient Power" && /Additional/.test(label)) notes.push("2回目の衝撃波が相手1体に命中");
  if (pokemon.name === "Rapidash" && choice.displayName === "Pastel Veil") notes.push("サイコカウンター最大時");
  if (pokemon.name === "Suicune" && choice.displayName === "Pressure") notes.push("技使用1回");
  if (choice.groupName === "Unite Move" && pokemon.name === "Reshiram") notes.push("3回目の強化使用時");
  if (choice.groupName === "Unite Move" && pokemon.name === "Tinkaton") notes.push("最初のキッスが相手に命中");
  const itemNames = variant.parts.filter((entry) => entry.itemSource).map((entry) => entry.itemSource);
  if (itemNames.includes("Buddy Barrier")) notes.push("おたすけバリアが発動可能なユナイト使用1回");
  if (itemNames.includes("Resonant Guard")) notes.push("相手プレイヤーへ技ダメージ・きょうめいガード待ち時間明けの1回");
  if (targetScope === "ally" && itemNames.length) {
    notes.push("近くの味方1体");
    if (moveParts.length || itemNames.length > 1) notes.push("持ち物の付与先が同じ味方の場合");
  }
  if (targetScope === "ally" && rescueHoodPercent > 0) notes.push(`レスキューフード+${rescueHoodPercent}%`);
  if (choice.groupName === "Unite Move" && variant.phase === "activation"
    && choice.entries.some((entry) => entry.phase === "end")) notes.push("終了時のシールドは別行");
  return notes.join(" / ");
}

function calculateRankingShield(parts, level, stats) {
  return parts.reduce((sum, part) => {
    const moveStat = part.sourceType === "maxHp" || part.dmgType === "MaxHP"
      ? stats.maxHp : part.dmgType === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    return sum + Math.max(0, Math.floor(statComponent + part.slider * (level - 1) + part.base));
  }, 0);
}

function buildShieldRankingRows(level, includeItems = true) {
  level = clamp(Math.round(number(level, 15)), 1, 15);
  const rows = [];
  state.pokemon.filter((pokemon) => !pokemon.exclude_stats && pokemonStats(pokemon.name, level)).forEach((pokemon) => {
    const itemRows = includeItems ? recommendedHealingItemRows(pokemon) : [];
    const stats = computeRankingShieldStats(pokemon, level, itemRows);
    const rescueHoodPercent = effectTierForRows(itemRows, "Rescue Hood");
    shieldRankingChoicesForPokemon(pokemon, level, itemRows).forEach((choice) => {
      const seenRecipientEffects = new Set();
      shieldRankingVariantsForChoice(choice, level).forEach((variant) => {
        ["self", "ally"].forEach((targetScope) => {
          const parts = variant.parts.filter((part) => part.targetScope === "both" || part.targetScope === targetScope);
          if (!parts.length) return;
          // A self-only effect can have an item-only ally result. Do not repeat
          // that same item result for every conditional self-shield component.
          const recipientKey = `${variant.phase}:${targetScope}:${parts.map((part) => part.id).sort().join("|")}`;
          if (seenRecipientEffects.has(recipientKey)) return;
          seenRecipientEffects.add(recipientKey);
          const scopedVariant = { ...variant, key: `${variant.key}-${targetScope}`, parts };
          if (parts.every((part) => part.itemSource)) scopedVariant.displayLabel = "持ち物で発生するシールド";
          const breakdown = parts.map((part) => ({
            kind: part.itemSource ? "item" : "move",
            label: part.displayLabel || SHIELD_RANKING_LABELS_JA[part.label] || part.label,
            amount: calculateRankingShield([part], level, stats),
            itemName: part.itemSource || undefined,
            partKey: part.partKey
          }));
          const baseShield = breakdown.filter((entry) => entry.kind === "move").reduce((sum, entry) => sum + entry.amount, 0);
          const itemShield = breakdown.filter((entry) => entry.kind === "item").reduce((sum, entry) => sum + entry.amount, 0);
          const beforeBonus = baseShield + itemShield;
          const totalShield = Math.floor(beforeBonus * (1 + (targetScope === "ally" ? rescueHoodPercent : 0) / 100));
          if (totalShield <= 0) return;
          const shieldBonus = totalShield - beforeBonus;
          if (shieldBonus) breakdown.push({ kind: "bonus", label: jpItemName("Rescue Hood"), amount: shieldBonus, itemName: "Rescue Hood" });
          rows.push({ pokemon, choice, level, stats, itemRows, variant: scopedVariant,
            targetScope, totalShield, baseShield, itemShield, shieldBonus, breakdown,
            assumption: shieldRankingAssumption(pokemon, choice, scopedVariant, targetScope, rescueHoodPercent),
            descriptionKey: choice.descriptionKey });
        });
      });
    });
  });
  return rows.sort((a, b) => b.totalShield - a.totalShield
    || jpPokemonName(a.pokemon).localeCompare(jpPokemonName(b.pokemon), "ja")
    || jpMoveName(a.choice.displayName).localeCompare(jpMoveName(b.choice.displayName), "ja")
    || a.variant.key.localeCompare(b.variant.key));
}
