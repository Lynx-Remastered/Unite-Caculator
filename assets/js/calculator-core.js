// Selection state, move parsing, formulas, and calculator primitives.
function number(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value - Math.round(value)) < 0.000001) return String(Math.round(value));
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

const CALCULATION_TIP_CONFIG = {
  rawDamage: {
    formulaId: "rawDamageFormula",
    resultId: "rawDamageResult",
    label: "基礎ダメージ"
  },
  finalDamage: {
    formulaId: "finalDamageFormula",
    resultId: "finalDamageResult",
    label: "防御込み推定"
  },
  shieldSelf: {
    formulaId: "shieldSelfFormula",
    resultId: "shieldSelfResult",
    label: "自分へのシールド"
  },
  shieldAlly: {
    formulaId: "shieldAllyFormula",
    resultId: "shieldAllyResult",
    label: "味方へのシールド"
  },
  healingSelf: {
    formulaId: "healingSelfFormula",
    resultId: "healingSelfResult",
    label: "自分への回復"
  },
  healingAlly: {
    formulaId: "healingAllyFormula",
    resultId: "healingAllyResult",
    label: "味方への回復"
  }
};

function syncCalculationTip(key) {
  const config = CALCULATION_TIP_CONFIG[key];
  if (!config) return;
  const showingValue = Boolean(state.calculationValueVisibility[key]);
  const button = document.querySelector(`[data-calculation-tip="${key}"]`);
  el[config.formulaId].hidden = showingValue;
  el[config.resultId].hidden = !showingValue;
  button.classList.toggle("showing-value", showingValue);
  button.setAttribute("aria-pressed", String(showingValue));
  button.setAttribute("aria-label", `${config.label}の${showingValue ? "計算プロセス" : "計算結果"}を表示`);
  button.dataset.tip = `${showingValue ? "計算プロセス" : "計算結果"}を表示`;
}

function toggleCalculationTip(key) {
  if (!(key in CALCULATION_TIP_CONFIG)) return;
  state.calculationValueVisibility[key] = !state.calculationValueVisibility[key];
  syncCalculationTip(key);
}

function formulaStatKey(result) {
  if (result.part.sourceType === "maxHp" || String(result.part.dmgType).trim() === "MaxHP") return "hp";
  return String(result.part.dmgType).trim() === "Atk" ? "atk" : "spatk";
}

function formulaVariableValue(value, key, digits = 1) {
  return `${formatNumber(value, digits)}(${key})`;
}

function signedFormulaStatTerm(value, key, label) {
  const amount = number(value, 0);
  return `${amount < 0 ? "-" : "+"} ${label} ${formulaVariableValue(Math.abs(amount), key, 1)}`;
}

function attackerStatAdjustmentFormula(stats, key) {
  const config = {
    atk: {
      label: "攻撃",
      base: stats.baseAttack,
      flat: stats.attackFlat,
      emblemFlat: stats.emblem.attackFlat,
      percent: stats.attackPercent,
      emblemPercent: stats.emblem.attackPercent,
      emblemCount: stats.emblem.brownCount,
      emblemColor: "茶",
      result: stats.attack
    },
    spatk: {
      label: "特攻",
      base: stats.baseSpAttack,
      flat: stats.spAttackFlat,
      emblemFlat: stats.emblem.spAttackFlat,
      percent: stats.spAttackPercent,
      emblemPercent: stats.emblem.spAttackPercent,
      emblemCount: stats.emblem.greenCount,
      emblemColor: "緑",
      result: stats.spAttack
    },
    hp: {
      label: "HP",
      base: stats.baseHp,
      flat: stats.hpFlat,
      emblemFlat: stats.emblem.hpFlat,
      percent: 0,
      emblemPercent: stats.emblem.hpPercent,
      emblemCount: stats.emblem.whiteCount,
      emblemColor: "白",
      result: stats.maxHp
    }
  }[key];

  if (!config) return "";
  const otherFlat = config.flat - config.emblemFlat;
  let expression = `(${formulaVariableValue(config.base, key, 1)} ${signedFormulaStatTerm(config.emblemFlat, key, "メダル")}`;
  if (Math.abs(otherFlat) > 0.000001) {
    expression += ` ${signedFormulaStatTerm(otherFlat, key, "その他")}`;
  }
  expression += ")";
  if (Math.abs(config.percent) > 0.000001) {
    expression = `${expression} × (1 ${config.percent < 0 ? "-" : "+"} ${formatNumber(Math.abs(config.percent), 1)}% その他補正)`;
  }
  if (Math.abs(config.emblemPercent) > 0.000001) {
    expression += ` + ${config.emblemColor}${formatNumber(config.emblemCount, 0)}メダル ${formulaVariableValue(config.base, key, 1)} × ${formatNumber(config.emblemPercent, 1)}%`;
  }
  return `${config.label}補正: ${expression} = ${formulaVariableValue(config.result, key, 1)}`;
}

function defenseAdjustmentFormula(details, type) {
  const isPhysical = String(type).trim() === "Atk";
  const key = isPhysical ? "def" : "spdef";
  let expression = formulaVariableValue(details.base, key, 1);

  if (details.reductionFlat > 0) {
    expression = `(${expression} - ${formatNumber(details.reductionFlat, 1)})`;
  }
  if (details.reductionPercent > 0) {
    expression = `(${expression}) × (1 - ${formatNumber(details.reductionPercent, 1)}%)`;
  }
  if (details.penetrationFlat > 0) {
    expression = `(${expression} - ${formatNumber(details.penetrationFlat, 1)})`;
  }
  if (details.ignorePercent > 0) {
    expression = `(${expression}) × (1 - ${formatNumber(details.ignorePercent, 1)}%)`;
  }

  return expression;
}

function rsbFormulaExpression(result, level) {
  return `${formulaVariableValue(result.moveStat, formulaStatKey(result), 1)} × ${formatNumber(result.part.ratio, 1)}% + ${formatNumber(result.part.slider, 1)} × (${formulaVariableValue(level, "lv", 0)} - 1) + ${formatNumber(result.part.base, 1)}`;
}

function sumFormulaExpressions(results, level) {
  const expressions = results.map((result) => rsbFormulaExpression(result, level));
  if (!expressions.length) return "-";
  if (expressions.length === 1) return expressions[0];
  return expressions.map((expression) => `(${expression})`).join(" + ");
}

function groupedFormulaExpressions(expressions, repeatLabel = "ヒット") {
  const groups = new Map();
  expressions.filter(Boolean).forEach((expression) => {
    groups.set(expression, (groups.get(expression) || 0) + 1);
  });
  const terms = Array.from(groups, ([expression, count]) => (
    count > 1 ? `(${expression}) × ${formatNumber(count, 0)}${repeatLabel}` : expression
  ));
  if (!terms.length) return "-";
  if (terms.length === 1) return terms[0];
  return terms.map((term) => `(${term})`).join(" + ");
}

function renderCalculationFormula(element, text) {
  const source = String(text || "-");
  const tokenPattern = /-?\d+(?:\.\d+)?\((?:atk|spatk|hp|targethp|targetmaxhp|targetmissinghp|lv|def|spdef)\)|追加効果|防御後|有効(?:防御|特防)|-?\d+(?:\.\d+)?% (?:防御|特防)(?:低下|無視)|× -?\d+(?:\.\d+)?(?:%|ヒット|回\/対象)?/g;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(source))) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(source.slice(lastIndex, match.index)));
    }
    const token = document.createElement("span");
    token.className = "calculation-formula-token";
    if (/\((?:atk|spatk|hp|targethp|targetmaxhp|targetmissinghp)\)$/.test(match[0])) token.classList.add("stat");
    else if (/\(lv\)$/.test(match[0])) token.classList.add("level");
    else if (/\((?:def|spdef)\)$/.test(match[0]) || /^(?:防御後|有効(?:防御|特防)|-?\d+(?:\.\d+)?% (?:防御|特防)(?:低下|無視))$/.test(match[0])) token.classList.add("defense");
    else if (match[0] === "追加効果") token.classList.add("extra");
    else token.classList.add("modifier");
    token.textContent = match[0];
    fragment.append(token);
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < source.length) {
    fragment.append(document.createTextNode(source.slice(lastIndex)));
  }
  element.replaceChildren(fragment);
}

function applyPostCalculationFormula(expression, percentCorrections = [], flat = 0, count = 1, countLabel = "回/対象") {
  let adjusted = expression;
  const percentages = percentCorrections
    .map((value) => number(value, 0))
    .filter((value) => Math.abs(value) > 0.000001);
  if (percentages.length) {
    const factor = percentages
      .map((value) => `${value < 0 ? "-" : "+"} ${formatNumber(Math.abs(value), 1)}%`)
      .join(" ");
    adjusted = `(${adjusted}) × (1 ${factor})`;
  }
  if (Math.abs(flat) > 0.000001) {
    adjusted = `${adjusted} ${flat >= 0 ? "+" : "−"} ${formatNumber(Math.abs(flat), 1)}`;
  }
  if (count > 1) {
    adjusted = `(${adjusted}) × ${formatNumber(count, 0)}${countLabel}`;
  }
  return adjusted;
}

function tierValue(item) {
  const level = selectedItemLevel(item.name);
  const raw = level < 10 ? item.level1 : level < 20 ? item.level10 : item.level20;
  return number(String(raw || "").replace("%", ""), 0);
}

function itemLevelValue(level, stat) {
  const calc = (steps, increment, initial, initialDiff, start, skip) => {
    if (!steps || steps <= 0) return 0;
    let value = steps > 1 ? steps * increment : initial;
    if (skip > 0 && start === 0 && steps > 1) value = Math.floor((steps + 1) / 2) * increment;
    if (skip > 0 && start === 1 && steps > 1) value = Math.floor(steps / 2) * increment;
    if (initialDiff > 0 && steps > 1) value += initialDiff;
    return value;
  };

  const safeLevel = clamp(number(level, 40), 1, 40);
  const increment = number(stat.increment, 0);
  const initial = number(stat.initial, 0);
  const initialDiff = number(stat.initial_diff, 0);
  const start = number(stat.start, 0);
  const skip = number(stat.skip, 0);

  if (safeLevel <= 30) {
    return calc(safeLevel, increment, initial, initialDiff, start, skip);
  }

  const base = calc(30, increment, initial, initialDiff, start, skip);
  const extraIncrement = increment / 2;
  const extraInitial = skip === 0 || start === 0 ? extraIncrement : 0;
  return base + calc(safeLevel - 30, extraIncrement, extraInitial, 0, start, skip);
}

function selectedPokemon() {
  return state.pokemon.find((pokemon) => pokemon.name === el.pokemonSelect.value);
}

function selectedMove() {
  const choice = selectedMoveChoice();
  const parts = selectedMoveParts(choice);
  if (!choice || !parts.length) return null;
  const primary = parts[0];

  return {
    ...primary,
    parts,
    choice,
    label: parts.map((part) => part.label).join(" + "),
    minLevel: Math.min(...parts.map((part) => number(part.minLevel, 1))),
    displayName: choice.displayName,
    slotLabel: choice.slotLabel,
    iconUrl: choice.iconUrl
  };
}

function selectedMoveChoice() {
  return state.moveChoices.find((choice) => choice.slotKey === state.selectedMoveSlot && !choice.disabled)
    || state.moveChoices.find((choice) => !choice.disabled)
    || null;
}

function isNormalOrBoostedAttackChoice(choice = selectedMoveChoice()) {
  return /(?:^|-)(?:basic|boosted)$/.test(String(choice?.slotKey || ""));
}

function choiceSpecsCanTrigger(choice = selectedMoveChoice()) {
  return Boolean(choice) && !isNormalOrBoostedAttackChoice(choice);
}

function razorClawCanTrigger(choice = selectedMoveChoice()) {
  return Boolean(choice) && isNormalOrBoostedAttackChoice(choice);
}

function normalizedMovePartLabel(label) {
  return String(label || "").trim().replace(/\s+/g, " ");
}

function entriesForMovePartLabels(entries, labels) {
  const wanted = new Set(labels.map(normalizedMovePartLabel));
  return entries.filter((entry) => wanted.has(normalizedMovePartLabel(entry.label)));
}

function isDarkraiShadowClaw(pokemon, choice) {
  return pokemon?.name === "Darkrai" && choice?.displayName === "Shadow Claw";
}

function damageVariantKeyFromLabel(label) {
  return normalizedMovePartLabel(label).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "variant";
}

function damageVariantLabelFromEntry(entry) {
  let text = jpMoveLabel(entry.label || "条件");
  text = text.replace(/^ダメージ\s*[-:：]?\s*/i, "");
  text = text.replace(/^ダメージ\s*\((.+)\)$/i, "$1");
  text = text.replace(/^\((.+)\)$/i, "$1");
  return text.trim() || jpMoveLabel(entry.label || "条件");
}

function variantOption(key, label, entries) {
  const seen = new Set();
  return {
    key,
    label,
    entries: entries.filter((entry) => {
      const id = `${entry.partKey}:${normalizedMovePartLabel(entry.label)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
  };
}

function scaledDamageEntry(entry, key, label, damageScale, hitCount = 1, hitNote = "") {
  return {
    ...entry,
    label,
    partKey: `${entry.partKey}-${key}`,
    basePartKey: `${entry.basePartKey}-${key}`,
    damageScale,
    hitCountOverride: hitCount,
    hitNoteOverride: hitNote
  };
}

function progressiveDamageEntries(entry, key, scales, labelPrefix) {
  return scales.map((scale, index) => scaledDamageEntry(
    entry,
    `${key}-${index + 1}`,
    `${labelPrefix}${index + 1}ヒット目`,
    scale,
    1,
    `${index + 1}ヒット目: ${formatNumber(scale * 100, 0)}%`
  ));
}

function specificDamageVariantOptionsForChoice(pokemon, choice, entries, level) {
  if (isDarkraiShadowClaw(pokemon, choice)) {
    return [
      variantOption("normal", "通常", entriesForMovePartLabels(entries, ["Damage", "Damage - Huge Claw"])),
      variantOption("bad-dreams", "悪夢中", entriesForMovePartLabels(entries, ["Damage", "Damage - Huge Claw (A Pokémon has Bad Dreams)"])),
      variantOption("dark-pulse", "ダークパルス中", entriesForMovePartLabels(entries, ["Damage - In Dark Pulse", "Damage - Huge Claw In Dark Pulse"])),
      variantOption("dark-pulse-bad-dreams", "ダークパルス中・悪夢中", entriesForMovePartLabels(entries, ["Damage - In Dark Pulse", "Damage - Huge Claw In Dark Pulse (A Pokémon has Bad Dreams)"]))
    ].filter((variant) => variant.entries.length);
  }

  if (pokemon?.name === "Metagross" && choice?.displayName === "Meteor Mash") {
    const charging = entriesForMovePartLabels(entries, ["Charging Damage"])[0];
    const punchTiers = [
      ["1-2", "1～2蓄積", "Punch Damage (1-2 Charges)"],
      ["3-4", "3～4蓄積", "Punch Damage (3-4 Charges)"],
      ["5-6", "5～6蓄積", "Punch Damage (5-6 Charges)"],
      ["7-8", "7～8蓄積", "Punch Damage (7-8 Charges)"]
    ];
    const variants = [];

    punchTiers.forEach(([key, tierLabel, punchLabel]) => {
      const punch = entriesForMovePartLabels(entries, [punchLabel])[0];
      if (!punch) return;
      const punchEntry = {
        ...punch,
        label: `派生パンチ（${tierLabel}）`,
        hitCountOverride: 1,
        hitNoteOverride: "次の通常攻撃で発生する追加ダメージ"
      };
      variants.push(variantOption(`meteor-mash-${key}-punch`, `${tierLabel} / 派生パンチのみ`, [punchEntry]));
      if (!charging) return;

      for (let hitCount = 1; hitCount <= 4; hitCount += 1) {
        const chargingEntry = {
          ...charging,
          label: "溜め攻撃",
          partKey: `${charging.partKey}-meteor-mash-${key}-${hitCount}`,
          basePartKey: `${charging.basePartKey}-meteor-mash-${key}-${hitCount}`,
          hitCountOverride: hitCount,
          hitNoteOverride: `${hitCount}ヒット（1体には最大4ヒット）`
        };
        variants.push(variantOption(
          `meteor-mash-${key}-charging-${hitCount}`,
          `${tierLabel} / 溜め${hitCount}ヒット＋派生パンチ`,
          [chargingEntry, punchEntry]
        ));
      }
    });
    return variants;
  }

  if (pokemon?.name === "Leafeon" && choice?.displayName === "Emerald Two-Step") {
    const initial = entriesForMovePartLabels(entries, ["Damage (Initial leap)"]);
    return [
      ["closest", "2段目: 最近距離", "Damage (Second Leap - Closest)"],
      ["mid", "2段目: 中距離", "Damage (Second Leap - Mid range)"],
      ["furthest", "2段目: 最遠距離", "Damage (Second Leap - Furthest range)"]
    ].map(([key, label, secondLabel]) => (
      variantOption(key, label, [...initial, ...entriesForMovePartLabels(entries, [secondLabel])])
    )).filter((variant) => variant.entries.length > initial.length);
  }

  if (pokemon?.name === "Espeon" && choice?.displayName === "Stored Power") {
    const first = entriesForMovePartLabels(entries, ["Damage - First Hit"]);
    const subsequent = entriesForMovePartLabels(entries, ["Damage - Subsequent Hits"]);
    const additional = entriesForMovePartLabels(entries, ["Damage - Additional"]);
    const storedPowerEntries = (totalHits, includeAdditional) => [
      ...first.map((entry) => ({ ...entry, hitCountOverride: 1 })),
      ...subsequent.map((entry) => ({
        ...entry,
        hitCountOverride: totalHits - 1,
        hitNoteOverride: `${totalHits - 1}ヒット（初撃を除く）`
      })),
      ...(includeAdditional ? additional : [])
    ];
    const variants = [
      variantOption("stored-power-5", "通常（5発）", storedPowerEntries(5, false)),
      variantOption("stored-power-8", "みらいよち強化（8発）", storedPowerEntries(8, false))
    ];
    if (additional.length) {
      variants.push(
        variantOption("stored-power-5-low-hp", "通常（5発）・相手HP50%未満", storedPowerEntries(5, true)),
        variantOption("stored-power-8-low-hp", "みらいよち強化（8発）・相手HP50%未満", storedPowerEntries(8, true))
      );
    }
    return variants.filter((variant) => variant.entries.length >= 2);
  }

  if (pokemon?.name === "Meowth" && choice?.displayName === "Fury Swipes") {
    const first = entriesForMovePartLabels(entries, ["Damage - First Hit"]);
    const subsequent = entriesForMovePartLabels(entries, ["Damage - Subsequent Hits"]);
    const furySwipesEntries = (totalHits) => [
      ...first.map((entry) => ({ ...entry, hitCountOverride: 1 })),
      ...subsequent.map((entry) => ({
        ...entry,
        hitCountOverride: totalHits - 1,
        hitNoteOverride: `${totalHits - 1}ヒット（初撃を除く）`
      }))
    ];
    return [
      variantOption("fury-swipes-2", "通常（2回）", furySwipesEntries(2)),
      variantOption("fury-swipes-5", "コイン3以上（5回）", furySwipesEntries(5))
    ].filter((variant) => variant.entries.length >= 2);
  }

  if (pokemon?.name === "Leafeon" && choice?.displayName === "Razor Leaf") {
    const outgoing = entriesForMovePartLabels(entries, ["Damage (Outgoing - First Leaf)"])[0];
    const earlyReturn = entriesForMovePartLabels(entries, ["Damage (Manual return first Leaf if <1s)"])[0];
    const strongReturn = entriesForMovePartLabels(entries, ["Damage (Automatic return first Leaf or Manual return first Leaf if after 1s)"])[0];
    const fanEntries = (entry, key, firstLabel) => entry ? [
      { ...entry, label: firstLabel, hitCountOverride: 1, hitNoteOverride: "最初の1枚" },
      scaledDamageEntry(entry, `${key}-subsequent`, "後続の葉（30%）", 0.3, 4, "4ヒット（最初の1枚を除く）")
    ] : [];
    const outgoingFan = fanEntries(outgoing, "razor-leaf-outgoing", "往路・最初の葉");
    return [
      variantOption("razor-leaf-outgoing", "往路のみ（5枚）", outgoingFan),
      variantOption("razor-leaf-early-return", "往路＋手動帰還1秒未満（各5枚）", [...outgoingFan, ...fanEntries(earlyReturn, "razor-leaf-early", "手動帰還1秒未満・最初の葉")]),
      variantOption("razor-leaf-strong-return", "往路＋1秒以上の帰還（各5枚）", [...outgoingFan, ...fanEntries(strongReturn, "razor-leaf-strong", "1秒以上の帰還・最初の葉")])
    ].filter((variant) => variant.entries.length);
  }

  if (pokemon?.name === "Latios" && choice?.displayName === "Dragon Pulse") {
    const boosted = entriesForMovePartLabels(entries, ["Damage - Boosted Attack"]);
    const projectile = entriesForMovePartLabels(entries, ["Damage - Projectile (per Projectile)"])[0];
    if (projectile) {
      const projectileScales = [1, 0.85, 0.7, 0.55, 0.4, 0.25];
      const dragonPulseEntries = (count) => [
        ...boosted,
        ...progressiveDamageEntries(projectile, `dragon-pulse-${count}`, projectileScales.slice(0, count), "テレキネシス弾")
      ];
      return [
        variantOption("dragon-pulse-0", "エオンパワー0（弾なし）", boosted),
        variantOption("dragon-pulse-25", "エオンパワー25（2発）", dragonPulseEntries(2)),
        variantOption("dragon-pulse-50", "エオンパワー50（3発）", dragonPulseEntries(3)),
        variantOption("dragon-pulse-75", "エオンパワー75（4発）", dragonPulseEntries(4)),
        variantOption("dragon-pulse-100", "エオンパワー100（6発）", dragonPulseEntries(6))
      ].filter((variant) => variant.entries.length);
    }
  }

  if (pokemon?.name === "Latios" && choice?.displayName === "Draco Meteor") {
    const comet = entries.find((entry) => /Damage\s*-\s*per Comet/i.test(String(entry.label || "")));
    if (comet) {
      const dracoMeteorEntries = (count) => [
        { ...comet, label: "1発目", hitCountOverride: 1 },
        scaledDamageEntry(comet, `draco-meteor-${count}`, "後続のりゅうせい（50%）", 0.5, count - 1, `${count - 1}ヒット（1発目を除く）`)
      ];
      return [
        variantOption("draco-meteor-0", "エオンパワー0（2発）", dracoMeteorEntries(2)),
        variantOption("draco-meteor-25", "エオンパワー25（3発）", dracoMeteorEntries(3)),
        variantOption("draco-meteor-50", "エオンパワー50（4発）", dracoMeteorEntries(4)),
        variantOption("draco-meteor-75", "エオンパワー75（5発）", dracoMeteorEntries(5)),
        variantOption("draco-meteor-100", "エオンパワー100（6発）", dracoMeteorEntries(6))
      ];
    }
  }

  if (pokemon?.name === "Scyther" && choice?.displayName === "Green Illusion Dive") {
    const hit = entries.find((entry) => /Damage\s*-\s*Initial, Dash, & Copy Dash/i.test(String(entry.label || "")));
    if (hit) {
      const fullHits = (count, key, label) => ({
        ...hit,
        label,
        partKey: `${hit.partKey}-${key}`,
        basePartKey: `${hit.basePartKey}-${key}`,
        hitCountOverride: count,
        hitNoteOverride: `${count}ヒット（減衰なし）`
      });
      const reducedCopies = scaledDamageEntry(hit, "copy-reduced", "2体目以降の分身（30%）", 0.3, 4, "分身4体（最初の1体を除く）");
      return [
        variantOption("green-illusion-initial", "初撃のみ", [fullHits(1, "initial", "初撃")]),
        variantOption("green-illusion-copies", "初撃＋分身5体", [fullHits(2, "initial-copy", "初撃＋最初の分身"), reducedCopies]),
        variantOption("green-illusion-second-use", "初撃＋再発動＋分身5体", [fullHits(3, "initial-dash-copy", "初撃＋再発動＋最初の分身"), reducedCopies])
      ];
    }
  }

  if (pokemon?.name === "Typhlosion" && choice?.displayName === "Eruption") {
    const perHit = entries.find((entry) => /Damage\s*-\s*per Hit/i.test(String(entry.label || "")));
    if (perHit) {
      return [
        variantOption("eruption-3", "通常（3発）", progressiveDamageEntries(perHit, "eruption-normal", [1, 0.8, 0.6], "")),
        variantOption("eruption-4", "最大ふんかゲージ（4発）", progressiveDamageEntries(perHit, "eruption-peak", [1, 0.8, 0.6, 0.6], ""))
      ];
    }
  }

  return [];
}

function damageVariantCategory(entry) {
  const label = normalizedMovePartLabel(entry.label);
  if (!label) return "";
  if (/(additional|bonus|proc|exiting|same target|secondary target|against wild|against player|damage boost|replacement|under .*buff)/i.test(label)) {
    return "";
  }
  if (/(?:1st|2nd|3rd|4th|5th) Level Charge|Low Charge|Mid Charge|High Charge|Min Charge|Max Charge|Uncharged|Fully Charged|<=\s*\d+\s*Energy Charged|\d+\s*-\s*\d+\s*Energy Charged|\d+\s*-\s*\d+\s*Charges/i.test(label)) {
    return "charge";
  }
  if (/Stage\s*\d/i.test(label)) return "stage";
  if (/No Gauge|Full Gauge/i.test(label)) return "gauge";
  if (/Above .*HP|Between .*HP|Below .*HP/i.test(label)) return "hp";
  if (/\d+\s*Fang Marks?|Less Than .*Coin Marks?|\d+\s*Coin Marks?/i.test(label)) return "stacks";
  if (/Close Range|Long Range|Point Blank|Medium Distance|Max Distance|Melee Range|Max Range|\bClose\b|\bMid\b|\bFar\b|Closest|Mid range|Furthest range|Center|Conal|Side|Inner Ring|Outer Ring/i.test(label)) {
    return "range";
  }
  if (/Frozen Target|Frozen Enemies|Unfrozen Enemies/i.test(label)) return "status";
  if (/\bTorrent\b/i.test(label)) return "torrent";
  if (/\bMega\b/i.test(label)) return "mega";
  if (/During Rapid Spin|No Retreat Formation|Dispatch formation|Column group|Shield Stance/i.test(label)) return "mode";
  if (/Full .*Hits|Reduced .*Hits/i.test(label)) return "hit-choice";
  if (/Exploding Flame level\s*\d/i.test(label)) return "level";
  return "";
}

function isVariantDamageCandidateEntry(entry) {
  const label = normalizedMovePartLabel(entry.label);
  if (!label) return false;
  if (/(heal|healing|shield|max hp|defense|sp\.?\s*def|spdef|attack speed|movement speed|cooldown|cdr|increase|reduction)/i.test(label)) {
    return false;
  }
  return Boolean(damageVariantCategory(entry))
    || isAutoIncludedDamageEntry(entry)
    || /(damage|hit|slash|burn|dot|tick|wave|bolt|projectile|quill|star|seed|leaf|flame|comet|meteor|punch|kick|slap|shuriken|blade|pulse|shockwave|whirlpool|stream|field|flurry|eruption)/i.test(label);
}

function isSharedDamageVariantEntry(entry) {
  const label = normalizedMovePartLabel(entry.label);
  if (!label || damageVariantCategory(entry)) return false;
  if (/(additional|bonus|proc|exiting|same target|secondary target|replacement|boosted|basic \[|main target|under .*buff)/i.test(label)) {
    return false;
  }
  return /^Damage$/i.test(label)
    || /^Damage\s*-\s*(Burn|Poison|DoT|Area|Vortex|Heatwave)/i.test(label)
    || /^Charging Damage$/i.test(label);
}

function genericDamageVariantOptionsForChoice(choice, entries) {
  const candidates = entries.filter(isVariantDamageCandidateEntry);
  const groups = new Map();
  candidates.forEach((entry) => {
    const category = damageVariantCategory(entry);
    if (!category) return;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(entry);
  });

  const usableGroups = [...groups.entries()].filter(([, groupEntries]) => groupEntries.length);
  if (usableGroups.length !== 1) return [];

  const [category, groupEntries] = usableGroups[0];
  const plainBase = candidates.find((entry) => /^Damage$/i.test(normalizedMovePartLabel(entry.label)));
  if (groupEntries.length < 2 && !plainBase) return [];

  const groupSet = new Set(groupEntries);
  const shared = candidates.filter((entry) => !groupSet.has(entry) && isSharedDamageVariantEntry(entry));
  const sharedWithoutPlainBase = shared.filter((entry) => entry !== plainBase);
  const variants = [];

  if (groupEntries.length === 1 && plainBase) {
    variants.push(variantOption(`${category}-normal`, "通常", [...sharedWithoutPlainBase, plainBase]));
  }

  groupEntries.forEach((entry) => {
    variants.push(variantOption(
      `${category}-${damageVariantKeyFromLabel(entry.label)}`,
      damageVariantLabelFromEntry(entry),
      [...(groupEntries.length === 1 ? sharedWithoutPlainBase : shared), entry]
    ));
  });

  return variants.filter((variant) => variant.entries.length);
}

function damageVariantOptionsForChoice(pokemon, choice, level, activeEntries = null) {
  if (!choice || !choice.entries.length) return [];
  const entries = activeEntries || activeEntriesForLevel(choice.entries, level);
  const specific = specificDamageVariantOptionsForChoice(pokemon, choice, entries, level);
  if (specific.length) return specific;
  return genericDamageVariantOptionsForChoice(choice, entries);
}

function subsequentDamageScale(notes) {
  const text = String(notes || "");
  const marker = text.search(/subsequent|hits? after the first/i);
  if (marker < 0) return 0;
  const segment = text.slice(marker, marker + 220);
  const percentMatch = segment.match(/(\d+(?:\.\d+)?)%/);
  if (!percentMatch) return 0;
  const percent = number(percentMatch[1], 0) / 100;
  if (percent <= 0) return 0;
  return /%\s*(?:less|reduced)/i.test(segment) ? Math.max(0, 1 - percent) : percent;
}

function reducedSubsequentDamageEntries(entries, level) {
  if (entries.some((entry) => entry.damageScale !== undefined)) return entries;
  if (entries.some((entry) => /Subsequent Hits/i.test(String(entry.label || "")))) return entries;
  const anchor = entries.find((entry) => {
    const label = String(entry.label || "");
    return isAutoIncludedDamageEntry(entry)
      && !/(burn|dot|tick)/i.test(label)
      && !/,/.test(label)
      && /(first|initial|per flame|^damage$)/i.test(label);
  });
  if (!anchor) return entries;

  const contextText = anchor.contextText || anchor.notes;
  const scale = subsequentDamageScale(contextText);
  if (!(scale > 0 && scale < 1)) return entries;
  const countInfo = inferHitCountFromText(contextText, false);
  let totalHits = countInfo.count;
  if (level >= number(anchor.enhancedMinLevel, 99)
    && /number of (?:flames|hits|projectiles|stars).*by one/i.test(String(anchor.enhancedNotes || ""))) {
    totalHits += 1;
  }
  if (totalHits <= 1) return entries;

  const first = { ...anchor, hitCountOverride: 1, hitNoteOverride: "初撃" };
  const subsequent = scaledDamageEntry(
    anchor,
    "reduced-subsequent",
    `後続ヒット（${formatNumber(scale * 100, 0)}%）`,
    scale,
    totalHits - 1,
    `${totalHits - 1}ヒット（初撃を除く）`
  );
  return entries.flatMap((entry) => entry === anchor ? [first, subsequent] : [entry]);
}

function damageSequenceEntries(pokemon, choice, level, entries) {
  if (pokemon?.name === "Crustle" && choice?.displayName === "Stealth Rock") {
    const perTick = entries.find((entry) => /Damage\s*\(\d+ Ticks\)/i.test(String(entry.label || "")));
    if (perTick) {
      const count = level >= number(perTick.enhancedMinLevel, 99) ? 10 : 8;
      return progressiveDamageEntries(
        perTick,
        "stealth-rock",
        Array.from({ length: count }, (_, index) => 1 + index * 0.15),
        ""
      );
    }
  }

  if (pokemon?.name === "Miraidon" && choice?.displayName === "Bright Future Meteor Storm") {
    const meteor = entries.find((entry) => /per meteorite/i.test(String(entry.label || "")));
    if (meteor) {
      return progressiveDamageEntries(meteor, "meteor-storm", [1, 1.2, 1.4, 1.6, 1.8], "");
    }
  }

  if (pokemon?.name === "Tyranitar" && choice?.displayName === "Sand Tomb") {
    const count = level >= 13 ? 16 : 12;
    return entries.map((entry) => /AoE\s*\(per Tick\)/i.test(String(entry.label || "")) ? {
      ...entry,
      hitCountOverride: count,
      hitNoteOverride: `${count}ヒット（0.5秒ごと）`
    } : entry);
  }

  if (pokemon?.name === "Duraludon" && choice?.displayName === "Revolving Ruin") {
    return entries.map((entry) => /Burning Ring\s*\(per Tick\)/i.test(String(entry.label || "")) ? {
      ...entry,
      hitCountOverride: 20,
      hitNoteOverride: "20ヒット（10秒間・0.5秒ごと）"
    } : entry);
  }

  if (pokemon?.name === "Ho-Oh" && choice?.displayName === "Sky Attack") {
    return entries.map((entry) => /Damage\s*\(Ground\)/i.test(String(entry.label || "")) ? {
      ...entry,
      hitCountOverride: 9,
      hitNoteOverride: "9ヒット（4.5秒間・0.5秒ごと）"
    } : entry);
  }

  return reducedSubsequentDamageEntries(entries, level);
}

function entriesWithHitInfo(entries, pokemon = null, choice = null, level = 1) {
  const profiledEntries = damageSequenceEntries(pokemon, choice, level, entries);
  return profiledEntries.map((entry) => {
    const hitInfo = inferHitInfo(entry);
    const hitCountOverride = number(entry.hitCountOverride, 0);
    return {
      ...entry,
      hitCount: hitCountOverride > 0 ? hitCountOverride : hitInfo.count,
      hitNote: entry.hitNoteOverride || hitInfo.note
    };
  });
}

function selectedDamageVariantOption(pokemon, choice, level, activeEntries) {
  const variants = damageVariantOptionsForChoice(pokemon, choice, level, activeEntries);
  if (!variants.length) return null;
  if (!variants.some((variant) => variant.key === state.selectedDamageVariantKey)) {
    state.selectedDamageVariantKey = variants[0].key;
  }
  return variants.find((variant) => variant.key === state.selectedDamageVariantKey) || variants[0];
}

function selectedMoveParts(choice = selectedMoveChoice()) {
  if (!choice || !choice.entries.length) return [];
  const level = number(el.levelRange.value, 15);
  const pokemon = selectedPokemon();
  const activeEntries = activeEntriesForLevel(choice.entries, level);
  if (isSnorlaxFlailAttackChoice(pokemon, choice)) {
    const hpTier = selectedSnorlaxFlailHpTier();
    return entriesWithHitInfo(
      activeEntries.filter((entry) => entry.flailHpTierKey === hpTier.key),
      pokemon,
      choice,
      level
    );
  }
  const damageVariant = selectedDamageVariantOption(pokemon, choice, level, activeEntries);
  if (damageVariant) return entriesWithHitInfo(damageVariant.entries, pokemon, choice, level);

  const isSylveonHyperVoice = selectedPokemon()?.name === "Sylveon"
    && choice.displayName === "Hyper Voice";
  const hyperVoiceRange = el.sylveonHyperVoiceRange?.value === "far" ? /Far/i : /Near/i;
  const damageEntries = isSylveonHyperVoice
    ? activeEntries.filter((entry) => hyperVoiceRange.test(String(entry.label || "")))
    : activeEntries.filter(isAutoIncludedDamageEntry);
  const usableEntries = damageEntries.length ? damageEntries : activeEntries.slice(0, 1);
  return entriesWithHitInfo(usableEntries, pokemon, choice, level);
}

function enhancedEntryIsAdditive(entry, regularEntries) {
  const regular = regularEntries.find((candidate) => candidate.basePartKey === entry.basePartKey);
  if (!regular) return true;
  const enhancedLabel = normalizedMovePartLabel(entry.label).toLowerCase();
  const regularLabel = normalizedMovePartLabel(regular.label).toLowerCase();
  if (enhancedLabel === regularLabel) return false;
  return /(additional|bonus|extra|dot|burn|heal|healing|shield|execute|mark)/i.test(enhancedLabel)
    && !/(additional|bonus|extra|dot|burn|heal|healing|shield|execute|mark)/i.test(regularLabel);
}

function activeEntriesForLevel(entries, level) {
  const available = entries.filter((entry) => level >= number(entry.minLevel, 1));
  const regularEntries = available.filter((entry) => !entry.enhanced);
  const enhancedEntries = available.filter((entry) => entry.enhanced);
  if (!enhancedEntries.length) return regularEntries;

  const additiveEnhancedEntries = enhancedEntries.filter((entry) => enhancedEntryIsAdditive(entry, regularEntries));
  const replacementEnhancedEntries = enhancedEntries.filter((entry) => !additiveEnhancedEntries.includes(entry));
  const enhancedByPart = new Map(replacementEnhancedEntries.map((entry) => [entry.basePartKey, entry]));
  const selected = [];
  regularEntries.forEach((entry) => {
    selected.push(enhancedByPart.get(entry.basePartKey) || entry);
  });
  replacementEnhancedEntries.forEach((entry) => {
    if (!regularEntries.some((regular) => regular.basePartKey === entry.basePartKey)) {
      selected.push(entry);
    }
  });
  selected.push(...additiveEnhancedEntries);
  return Array.from(new Map(selected.map((entry) => [entry.partKey, entry])).values());
}

function selectedShieldMoveChoice() {
  return state.shieldMoveChoices.find((choice) => choice.slotKey === state.selectedShieldMoveSlot && !choice.disabled)
    || state.shieldMoveChoices.find((choice) => !choice.disabled)
    || null;
}

function selectedShieldParts(choice = selectedShieldMoveChoice()) {
  if (!choice || !choice.entries.length) return [];
  const level = number(el.shieldLevelRange.value, 15);
  const available = choice.entries.filter((entry) => level >= number(entry.minLevel, 1) && isShieldEntry(entry));
  const enhanced = available.filter((entry) => entry.enhanced);
  const regular = available.filter((entry) => !entry.enhanced);

  if (!enhanced.length) return regular;

  const enhancedLabels = new Set(enhanced.map((entry) => normalizeShieldLabel(entry.label)));
  const remainingRegular = regular.filter((entry) => !enhancedLabels.has(normalizeShieldLabel(entry.label)));
  return [...remainingRegular, ...enhanced];
}

function normalizeShieldLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/\b(enhanced|plus)\b/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function selectedHealingMoveChoice() {
  return state.healingMoveChoices.find((choice) => choice.slotKey === state.selectedHealingMoveSlot && !choice.disabled)
    || state.healingMoveChoices.find((choice) => !choice.disabled)
    || null;
}

function selectedHealingParts(choice = selectedHealingMoveChoice()) {
  if (!choice || !choice.entries.length) return [];
  const level = number(el.healingLevelRange.value, 15);
  const groups = choice.effectGroups || [{ key: "all", entries: choice.entries }];
  const selectedGroups = state.selectedHealingEffectKey === "all"
    ? groups
    : groups.filter((group) => group.key === state.selectedHealingEffectKey);

  return selectedGroups.flatMap((group) => {
    const available = group.entries.filter((entry) => level >= number(entry.minLevel, 1) && isHealingEntry(entry));
    const enhanced = available.filter((entry) => entry.enhanced);
    return enhanced.length ? enhanced : available.filter((entry) => !entry.enhanced);
  });
}

function normalizeHealingLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/\b(enhanced|plus)\b/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function defaultHealingEffectKey(choice) {
  const groups = choice ? choice.effectGroups || [] : [];
  if (groups.length <= 1) return groups[0] ? groups[0].key : "all";
  const labels = groups.map((group) => group.label).join(" ");
  const hasExclusiveConditions = /(basic|empowered|against wild|against player|queenly|gooey center|revenge|torrent|gluttonous)/i.test(labels);
  return hasExclusiveConditions ? groups[0].key : "all";
}

function updateHealingEffectOptions() {
  const choice = selectedHealingMoveChoice();
  const groups = choice ? choice.effectGroups || [] : [];
  el.healingEffectSelect.innerHTML = "";
  el.healingEffectRow.hidden = groups.length <= 1;
  if (!groups.length) return;

  if (groups.length > 1) {
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = `すべて合算（${groups.length}項目）`;
    el.healingEffectSelect.appendChild(allOption);
  }

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.key;
    option.textContent = jpMoveLabel(group.label);
    el.healingEffectSelect.appendChild(option);
  });

  const values = [...el.healingEffectSelect.options].map((option) => option.value);
  if (!values.includes(state.selectedHealingEffectKey)) {
    state.selectedHealingEffectKey = defaultHealingEffectKey(choice);
  }
  el.healingEffectSelect.value = state.selectedHealingEffectKey;
}

function selectedItems() {
  const rows = [];
  for (let i = 0; i < 3; i += 1) {
    const name = el[`itemSelect${i}`].value;
    if (!name) continue;
    const item = state.heldItems.find((entry) => entry.name === name);
    if (!item) continue;
    rows.push({
      item,
      level: clamp(number(el[`itemLevel${i}`].value, 40), 1, 40),
      slot: i
    });
  }
  return rows;
}

function selectedShieldPokemon() {
  return state.pokemon.find((pokemon) => pokemon.name === el.shieldPokemonSelect.value);
}

function selectedHealingPokemon() {
  return state.pokemon.find((pokemon) => pokemon.name === el.healingPokemonSelect.value);
}

function selectedShieldItems() {
  const rows = [];
  for (let i = 0; i < 3; i += 1) {
    const name = el[`shieldItemSelect${i}`].value;
    if (!name) continue;
    const item = state.heldItems.find((entry) => entry.name === name);
    if (!item) continue;
    rows.push({
      item,
      level: clamp(number(el[`shieldItemLevel${i}`].value, 40), 1, 40),
      slot: i
    });
  }
  return rows;
}

function selectedHealingItems() {
  const rows = [];
  for (let i = 0; i < 3; i += 1) {
    const name = el[`healingItemSelect${i}`].value;
    if (!name) continue;
    const item = state.heldItems.find((entry) => entry.name === name);
    if (!item) continue;
    rows.push({
      item,
      level: clamp(number(el[`healingItemLevel${i}`].value, 40), 1, 40),
      slot: i
    });
  }
  return rows;
}

function selectedItemLevel(itemName) {
  const row = selectedItems().find((entry) => entry.item.name === itemName);
  return row ? row.level : 40;
}

function selectedShieldItemLevel(itemName) {
  const row = selectedShieldItems().find((entry) => entry.item.name === itemName);
  return row ? row.level : 40;
}

function hasItem(itemName) {
  return selectedItems().some((entry) => entry.item.name === itemName);
}

function hasShieldItem(itemName) {
  return selectedShieldItems().some((entry) => entry.item.name === itemName);
}

function hasHealingItem(itemName) {
  return selectedHealingItems().some((entry) => entry.item.name === itemName);
}

function pokemonStats(name, level) {
  const statEntry = state.stats.find((entry) => entry.name === name);
  if (!statEntry || !Array.isArray(statEntry.level)) return null;
  return statEntry.level.find((row) => number(row.level) === number(level)) || null;
}

function pokemonDisplayName(name) {
  const pokemon = state.pokemon.find((entry) => entry.name === name);
  return pokemon ? jpPokemonName(pokemon) : "";
}

function jpPatchDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}年${number(match[2])}月${number(match[3])}日` : value;
}

function balanceHistoryForPokemon(pokemonName) {
  return (state.patchNotes.patches || []).flatMap((patch) => {
    const entry = (patch.pokemon || []).find((pokemon) => pokemon.name === pokemonName);
    return entry ? [{ ...patch, changes: entry.changes || [] }] : [];
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function balanceFilterDefinition(move) {
  const raw = String(move || "").replace(/\\?\[[^\]]+\]/g, "").replace(/[:：\s]+$/g, "").trim();
  const cleaned = raw.replace(/^Unite Move:\s*/i, "").replace(/\+$/, "").trim();
  const normalized = cleaned.toLowerCase();
  const generic = [
    { pattern: /^(natural stats|stat changes|stats)$/i, key: "stats", label: "ステータス", order: 0 },
    { pattern: /^general adjustments$/i, key: "general", label: "全般", order: 1 },
    { pattern: /^progression$/i, key: "progression", label: "成長・習得レベル", order: 2 },
    { pattern: /^(attack|auto attacks?|basic attacks?)$/i, key: "basic", label: "通常攻撃", order: 3 },
    { pattern: /^boosted attacks?$/i, key: "boosted", label: "強化攻撃", order: 4 },
    { pattern: /^unite move$/i, key: "unite", label: "ユナイト技", order: 5 },
    { pattern: /^bugfixes$/i, key: "bugfixes", label: "不具合修正", order: 90 }
  ].find((entry) => entry.pattern.test(normalized));
  if (generic) return generic;

  const translated = jpPatchMoveName(raw).replace(/\+$/, "");
  if (!translated || translated === "技・特性" || hasUntranslatedPatchText(translated)) {
    return { key: "other", label: "その他", order: 99 };
  }
  return { key: `move:${translated}`, label: translated, order: 10 };
}

function balanceFilterDefinitions(history) {
  const definitions = new Map();
  history.forEach((patch) => {
    (patch.changes || []).forEach((change) => {
      const definition = balanceFilterDefinition(change.move);
      const current = definitions.get(definition.key);
      if (current) {
        current.count += 1;
      } else {
        definitions.set(definition.key, { ...definition, count: 1 });
      }
    });
  });
  return [...definitions.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ja"));
}

function renderBalanceFilterOptions(history, pokemonName) {
  const definitions = balanceFilterDefinitions(history);
  const validKeys = new Set(definitions.map((definition) => definition.key));
  state.selectedBalanceFilterKeys = state.selectedBalanceFilterKeys.filter((key) => validKeys.has(key));
  const selectedKeys = new Set(state.selectedBalanceFilterKeys);
  el.balanceFilterOptions.replaceChildren();
  el.balanceFilterOptions.dataset.pokemon = pokemonName;

  definitions.forEach((definition) => {
    const option = document.createElement("label");
    option.className = "balance-filter-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = definition.key;
    checkbox.checked = selectedKeys.has(definition.key);
    checkbox.setAttribute("aria-label", definition.label);
    const name = document.createElement("span");
    name.className = "balance-filter-name";
    name.textContent = definition.label;
    const count = document.createElement("span");
    count.className = "balance-filter-count";
    count.textContent = `${definition.count}件`;
    checkbox.addEventListener("change", () => {
      const nextKeys = new Set(state.selectedBalanceFilterKeys);
      if (checkbox.checked) {
        nextKeys.add(definition.key);
      } else {
        nextKeys.delete(definition.key);
      }
      state.selectedBalanceFilterKeys = [...nextKeys];
      updateBalanceTimeline();
    });
    option.append(checkbox, name, count);
    el.balanceFilterOptions.appendChild(option);
  });
}

function updateBalanceTimeline() {
  if (!el.balancePokemonSelect || !el.balanceTimeline) return;
  const pokemonName = el.balancePokemonSelect.value;
  const displayName = pokemonDisplayName(pokemonName) || "ポケモン";
  const history = balanceHistoryForPokemon(pokemonName);
  const filterPokemonChanged = el.balanceFilterOptions.dataset.pokemon !== pokemonName;
  if (filterPokemonChanged) {
    state.selectedBalanceFilterKeys = [];
    renderBalanceFilterOptions(history, pokemonName);
  }
  const selectedFilters = new Set(state.selectedBalanceFilterKeys);
  const filteredHistory = selectedFilters.size
    ? history.map((patch) => ({
      ...patch,
      changes: (patch.changes || []).filter((change) => selectedFilters.has(balanceFilterDefinition(change.move).key))
    })).filter((patch) => patch.changes.length)
    : history;
  const totalChangeCount = history.reduce((sum, patch) => sum + (patch.changes || []).length, 0);
  const filteredChangeCount = filteredHistory.reduce((sum, patch) => sum + (patch.changes || []).length, 0);
  el.balancePokemonHeading.textContent = `${displayName}のバランス調整履歴`;
  el.balanceTimeline.replaceChildren();
  el.balanceFilterClearButton.disabled = selectedFilters.size === 0;
  el.balanceFilterStatus.textContent = selectedFilters.size
    ? `${selectedFilters.size}項目を選択中 / ${filteredChangeCount}件の変更を表示`
    : `未選択（全${totalChangeCount}件の変更を表示）`;

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "balance-empty";
    empty.textContent = "抽出できる調整履歴はありません。";
    el.balanceTimeline.appendChild(empty);
    el.balanceSummary.textContent = "UniteDBのリリースノート内に対象データがありません。";
    return;
  }

  if (!filteredHistory.length) {
    const empty = document.createElement("div");
    empty.className = "balance-empty";
    empty.textContent = "選択した条件に一致する調整履歴はありません。";
    el.balanceTimeline.appendChild(empty);
    el.balanceSummary.textContent = "0件 / 絞り込み中";
    return;
  }

  const latestDate = filteredHistory[0].date;
  const oldestDate = filteredHistory[filteredHistory.length - 1].date;
  el.balanceSummary.textContent = selectedFilters.size
    ? `${filteredHistory.length}件（${filteredChangeCount}項目） / ${jpPatchDate(oldestDate)}～${jpPatchDate(latestDate)} / 絞り込み中`
    : `${history.length}件 / ${jpPatchDate(oldestDate)}～${jpPatchDate(latestDate)} / 新しい順`;

  filteredHistory.forEach((patch) => {
    const article = document.createElement("article");
    article.className = "balance-entry";
    const header = document.createElement("div");
    header.className = "balance-entry-head";
    const title = document.createElement("h3");
    title.className = "balance-entry-title";
    title.textContent = patch.title || `バージョン ${patch.version}`;
    const date = document.createElement("time");
    date.className = "balance-date";
    date.dateTime = patch.date;
    date.textContent = jpPatchDate(patch.date);
    header.append(title, date);

    const changes = document.createElement("div");
    changes.className = "balance-changes";
    (patch.changes || []).forEach((change) => {
      const changeBlock = document.createElement("section");
      changeBlock.className = "balance-change";
      const changeHead = document.createElement("div");
      changeHead.className = "balance-change-head";
      const moveName = document.createElement("span");
      moveName.className = "balance-change-name";
      moveName.textContent = jpPatchMoveName(change.move);
      const badge = document.createElement("span");
      const status = PATCH_STATUS_JA[change.status] ? change.status : "adjustment";
      badge.className = `balance-badge ${status}`;
      badge.textContent = PATCH_STATUS_JA[status];
      changeHead.append(moveName, badge);

      const detailList = document.createElement("ul");
      detailList.className = "balance-detail-list";
      const details = [...new Set((change.details || []).map((line) => jpPatchDetail(line, status)).filter(Boolean))];
      (details.length ? details : [patchStatusFallback(status)]).forEach((detail) => {
        const item = document.createElement("li");
        item.textContent = detail;
        detailList.appendChild(item);
      });
      changeBlock.append(changeHead, detailList);
      changes.appendChild(changeBlock);
    });

    const source = document.createElement("a");
    source.className = "balance-source-link";
    source.href = patch.source || state.patchNotes.source || "https://unite-db.com/patch-notes";
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = patch.sourceLabel || "UniteDBのリリースノートを確認";
    article.append(header, changes, source);
    el.balanceTimeline.appendChild(article);
  });
}

function fillOptions(select, rows, getValue, getLabel, placeholder) {
  const current = select.value;
  select.innerHTML = "";
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = getValue(row);
    option.textContent = getLabel(row);
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

function populateControls() {
  const pokemonRows = state.pokemon
    .filter((pokemon) => !pokemon.exclude_stats)
    .sort((a, b) => jpPokemonName(a).localeCompare(jpPokemonName(b), "ja"));

  fillOptions(
    el.pokemonSelect,
    pokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon)
  );

  fillOptions(
    el.targetSelect,
    pokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon),
    "なし"
  );

  fillOptions(
    el.rankingTargetSelect,
    pokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon),
    "なし"
  );

  const shieldPokemonRows = pokemonRows;
  fillOptions(
    el.shieldPokemonSelect,
    shieldPokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon)
  );

  const healingPokemonRows = pokemonRows.filter(pokemonHasHealingFormula);
  fillOptions(
    el.healingPokemonSelect,
    healingPokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon)
  );

  const balancePokemonNames = new Set((state.patchNotes.patches || []).flatMap((patch) => (
    (patch.pokemon || []).map((pokemon) => pokemon.name)
  )));
  const balancePokemonRows = pokemonRows.filter((pokemon) => balancePokemonNames.has(pokemon.name));
  fillOptions(
    el.balancePokemonSelect,
    balancePokemonRows,
    (pokemon) => pokemon.name,
    (pokemon) => jpPokemonName(pokemon)
  );

  const itemRows = state.heldItems
    .slice()
    .sort((a, b) => jpItemName(a).localeCompare(jpItemName(b), "ja"));

  for (let i = 0; i < 3; i += 1) {
    fillOptions(
      el[`itemSelect${i}`],
      itemRows,
      (item) => item.name,
      (item) => jpItemName(item),
      "なし"
    );
    fillOptions(
      el[`shieldItemSelect${i}`],
      itemRows,
      (item) => item.name,
      (item) => jpItemName(item),
      "なし"
    );
    fillOptions(
      el[`healingItemSelect${i}`],
      itemRows,
      (item) => item.name,
      (item) => jpItemName(item),
      "なし"
    );
    enhanceHeldItemSelect(el[`itemSelect${i}`]);
    enhanceHeldItemSelect(el[`shieldItemSelect${i}`]);
    enhanceHeldItemSelect(el[`healingItemSelect${i}`]);
  }

  renderEmblemSlots();

  const firstPokemon = pokemonRows.find((pokemon) => pokemon.name === "Pikachu") || pokemonRows[0];
  if (firstPokemon) el.pokemonSelect.value = firstPokemon.name;
  el.targetSelect.value = firstPokemon ? firstPokemon.name : "";
  el.rankingTargetSelect.value = firstPokemon ? firstPokemon.name : "";
  const firstShieldPokemon = shieldPokemonRows.find((pokemon) => pokemon.name === "Blastoise") || shieldPokemonRows[0];
  if (firstShieldPokemon) el.shieldPokemonSelect.value = firstShieldPokemon.name;
  const firstHealingPokemon = healingPokemonRows.find((pokemon) => pokemon.name === "Blissey") || healingPokemonRows[0];
  if (firstHealingPokemon) el.healingPokemonSelect.value = firstHealingPokemon.name;
  const firstBalancePokemon = balancePokemonRows.find((pokemon) => pokemon.name === "Pikachu") || balancePokemonRows[0];
  if (firstBalancePokemon) el.balancePokemonSelect.value = firstBalancePokemon.name;

  [
    [el.pokemonSelect, "攻撃側ポケモンを選択"],
    [el.targetSelect, "相手ポケモンを選択"],
    [el.rankingTargetSelect, "ランキングの相手ポケモンを選択"],
    [el.shieldPokemonSelect, "シールドを使うポケモンを選択"],
    [el.healingPokemonSelect, "回復を使うポケモンを選択"],
    [el.balancePokemonSelect, "調整履歴を確認するポケモンを選択"]
  ].forEach(([select, ariaLabel]) => enhancePokemonSelect(select, ariaLabel));

  updateMoveOptions();
  applyRecommendedBuild();
  applyRecommendedEmblems();
  syncTargetStats();
  updateShieldMoveOptions();
  applyRecommendedShieldBuild();
  updateHealingMoveOptions();
  applyRecommendedHealingBuild();
  updateAll();
  updateShieldAll();
  updateHealingAll();
  updateDamageRanking();
  updateHealingRanking();
  updateSlowRanking();
  updateAccelerationRanking();
  updateBalanceTimeline();
}

function getRsbField(rsb, prefix, key) {
  return prefix ? rsb[`${prefix}_${key}`] : rsb[key];
}

function isShieldEntry(entry) {
  const label = String(entry.label || "");
  return /shield/i.test(label)
    && !/(damage|healing|heal)/i.test(label)
    && !/shield stance/i.test(label);
}

const SHIELD_TARGET_SCOPE_OVERRIDES = Object.freeze({
  "Alcremie|Helping Hand": "both",
  "Alcremie|Decorate": "both",
  "Blissey|Safeguard": "both",
  "Blissey|Bliss Assistance": "ally",
  "Comfey|Sweet Kiss": "ally",
  "Eldegoss|Cotton Guard": "both",
  "Hoopa|Trick": "both",
  "Latias|Dragon Cheer": "both",
  "Mew|Coaching": "ally",
  "Wigglytuff|Starlight Recital": "both"
});

function inferShieldTargetScope(entry, node, pokemonName) {
  const moveName = String(node?.name || entry?.ownerName || "");
  return SHIELD_TARGET_SCOPE_OVERRIDES[`${pokemonName}|${moveName}`] || "self";
}

function pokemonHasShieldFormula(pokemon) {
  const prefixes = ["", "add1", "add2", "add3", "add4", "add5", "enhanced", "enhanced_add1", "enhanced_add2", "enhanced_add3", "enhanced_add4", "enhanced_add5"];
  const nodes = [];
  (pokemon.skills || []).forEach((skill) => {
    nodes.push(skill, ...(skill.upgrades || []));
  });

  return nodes.some((node) => {
    return ["rsb", "boosted_rsb"].some((rsbName) => {
      const rsb = node[rsbName];
      if (!rsb) return false;
      return prefixes.some((prefix) => {
        const label = String(getRsbField(rsb, prefix, "label") || "");
        const ratio = getRsbField(rsb, prefix, "ratio");
        const dmgType = String(getRsbField(rsb, prefix, "dmg_type") || "").trim();
        const exception = String(getRsbField(rsb, prefix, "exception") || "");
        return ratio !== "" && ratio !== undefined && ratio !== null
          && dmgType
          && exception !== "True"
          && isShieldEntry({ label });
      });
    });
  });
}

function isHealingEntry(entry) {
  const label = String(entry.label || "");
  return /(heal|healing|recovery)/i.test(label)
    && !/(overheal shield|damage|percentage of damage)/i.test(label);
}

function pokemonHasHealingFormula(pokemon) {
  const prefixes = ["", "add1", "add2", "add3", "add4", "add5", "enhanced", "enhanced_add1", "enhanced_add2", "enhanced_add3", "enhanced_add4", "enhanced_add5"];
  const nodes = [];
  (pokemon.skills || []).forEach((skill) => {
    nodes.push(skill, ...(skill.upgrades || []));
  });

  return nodes.some((node) => {
    return ["rsb", "boosted_rsb"].some((rsbName) => {
      const rsb = node[rsbName];
      if (!rsb) return false;
      return prefixes.some((prefix) => {
        const label = String(getRsbField(rsb, prefix, "label") || "");
        const ratio = getRsbField(rsb, prefix, "ratio");
        const dmgType = String(getRsbField(rsb, prefix, "dmg_type") || "").trim();
        const exception = String(getRsbField(rsb, prefix, "exception") || "");
        return ratio !== "" && ratio !== undefined && ratio !== null
          && dmgType
          && exception !== "True"
          && isHealingEntry({ label });
      });
    });
  });
}

function isAutoIncludedDamageEntry(entry) {
  const label = String(entry.label || "").toLowerCase();
  if (number(entry.targetHpRatio, 0) > 0) return true;
  if (/(heal|healing|shield|max hp|defense|sp\.?\s*def|spdef|attack speed|movement speed|cooldown|cdr|increase|reduction)/i.test(label)) {
    return false;
  }

  if (entry.partKey !== "base" && /(execute|missing hp|backstab|single target bonus|interrupted|counter|marked|marker|secondary target|against wild|against player|light screen|queenly|empowered|boosted|manual return|automatic return|ally|snorlax|percentage of damage|far|side)/i.test(label)) {
    return false;
  }

  return /(damage|hit|slash|burn|dot|tick|wave|bolt|projectile|quill|star|seed|leaf|flame|comet|meteor|punch|kick|slap|shuriken|blade|pulse|shockwave|whirlpool|stream|field|flurry|eruption)/i.test(label)
    || entry.partKey === "base";
}

function inferHitInfo(entry) {
  const label = String(entry.label || "");
  const notes = String(entry.contextText || entry.notes || "");
  const labelCount = inferHitCountFromText(label, true);
  if (labelCount.count > 1) return labelCount;

  if (/\b(?:first|initial|second|third|fourth|fifth|final)\s+(?:hit|flame|star|wave|bolt|pulse|projectile|punch|kick|slash|leaf|seed|meteorite)\b/i.test(label)) {
    return { count: 1, note: "" };
  }

  if (!/\bper\b|hit|tick|wave|bolt|pulse|shockwave|projectile|quill|star|seed|leaf|flame|comet|meteor|shuriken|blade|slash|punch|kick|slap/i.test(label)) {
    return { count: 1, note: "" };
  }

  const textCount = inferHitCountFromText(notes, false);
  if (textCount.count > 1 && /subsequent/i.test(label)) {
    const count = Math.max(1, textCount.count - 1);
    return { count, note: `${formatNumber(count, 0)}ヒット（初撃を除く）` };
  }
  if (textCount.count > 1) return textCount;
  return { count: 1, note: "" };
}

const HEALING_TOTAL_HIT_COUNT_OVERRIDES = Object.freeze({
  "Mega-Lucario|Close Combat": 16
});

const HEALING_HIT_COUNT_OVERRIDES = Object.freeze({
  "Azumarill|Whirlpool|Healing - per Hit (Against Wilds)": { regular: 10 },
  "Azumarill|Whirlpool|Healing - per Hit (Against Players)": { regular: 10 },
  "Azumarill|Whirlpool|Healing -per Hit (Against Players)": { regular: 10 },
  "Clefable|Moonlight|Heal - per Tick (per half second)": { regular: 6, upgraded: 8 },
  "Comfey|Synthesis|Healing - Additional Per Flower": { regular: 8 },
  "Comfey|Floral Healing|Healing - Additional Per Flower": { regular: 8 },
  "Comfey|Flowery Fields Forever|Heal - per tick": { regular: 12 },
  "Comfey|Flowery Fields Forever|Empowered Floral Healing Healing - Additional Per Flower": { regular: 8 },
  "Empoleon|Hydro Cannon|Healing - Whirlpool (Torrent)": { regular: 6 },
  "Goodra|Gooey|Healing (Per Tick)": { regular: 12 },
  "Ho-Oh|Flamethrower|Healing (per tick of flamethrower)": { regular: 16, upgraded: 20 },
  "Meowth|Assurance|Heal - Additional (Per Coin Mark)": { regular: 5 },
  "Mimikyu|Shadow Claw|Healing - Per Hit": { regular: 5 },
  "Vaporeon|Aqua Ring|Heal": { regular: 7 },
  "Zoroark|Night Slash|Healing - Final Slash per Diagonal": { regular: 2 }
});

function inferHealingHitInfo(entry, level = 15) {
  const label = String(entry.label || "");
  const countOverride = number(entry.healingHitCountOverride, 0);
  if (countOverride > 0) {
    const note = /subsequent/i.test(label)
      ? `${formatNumber(countOverride, 0)}回（初回を除く）`
      : countOverride > 1 ? `${formatNumber(countOverride, 0)}回` : "";
    return { count: countOverride, note };
  }

  const configuredOverride = HEALING_HIT_COUNT_OVERRIDES[
    `${entry.pokemonName || ""}|${entry.displayName || entry.ownerName || ""}|${label}`
  ];
  if (configuredOverride) {
    const upgraded = level >= number(entry.enhancedMinLevel, 99);
    const count = number(upgraded && configuredOverride.upgraded || configuredOverride.regular, 1);
    return { count, note: count > 1 ? `${formatNumber(count, 0)}回` : "" };
  }

  const own = inferHitInfo(entry);
  if (!/\bper\b/i.test(label)
    && /\b(?:first|initial|second|third|fourth|fifth|final)\s+(?:hit|flame|star|wave|bolt|pulse|projectile|punch|kick|slash|leaf|seed|meteorite)\b/i.test(label)) {
    return own;
  }

  const totalHitOverride = number(
    HEALING_TOTAL_HIT_COUNT_OVERRIDES[`${entry.pokemonName || ""}|${entry.displayName || entry.ownerName || ""}`],
    0
  );
  if (totalHitOverride > 1 && /subsequent/i.test(label)) {
    const count = totalHitOverride - 1;
    return { count, note: `${formatNumber(count, 0)}回（初回を除く）` };
  }

  if (own.count > 1) return own;
  if (!/\bper\b|hit|tick|cream|copy|target|diagonal/i.test(label)) {
    return own;
  }

  const context = inferHitCountFromText(entry.contextText || entry.notes, false);
  if (context.count <= 1) return own;
  if (/subsequent/i.test(label)) {
    const count = Math.max(1, context.count - 1);
    return { count, note: `${formatNumber(count, 0)}回（初回を除く）` };
  }
  return { count: context.count, note: context.note.replace("ヒット", "回") };
}

function inferHitCountFromText(value, preferLabel) {
  const text = normalizeCountWords(String(value || ""));
  const units = "(?:hits?|ticks?|attacks?|blades?|shards?|stars?|leaves|leaf|seeds?|waves?|bolts?|pulses?|shockwaves?|quills?|slaps?|punches?|kicks?|flames?|projectiles?|shuriken|comets?|meteorites?|creams?|copies|targets?|diagonals?|times)";
  const checks = [
    { regex: /\((?:[^)]*?)(\d+)\s+max[^)]*\)/i, group: 1, suffix: "最大" },
    { regex: new RegExp(`\\\((?:[^)]*?)(\\d+)\\s*-\\s*(\\d+)\\s*${units}[^)]*\\\)`, "i"), group: 2, suffix: "最大" },
    { regex: /\((?:[^)]*?)(?:x|×)\s*(\d+)[^)]*\)/i, group: 1 },
    { regex: /\((?:[^)]*?)(\d+)\s*(?:x|×)[^)]*\)/i, group: 1 },
    { regex: new RegExp(`\\\((?:[^)]*?)(\\d+)\\s*${units}[^)]*\\\)`, "i"), group: 1 },
    { regex: new RegExp(`\\bfirst\\s+(\\d+)\\s+${units}\\b`, "i"), group: 1 },
    { regex: new RegExp(`\\b(?:at least|minimum of)\\s+(\\d+)\\s+${units}\\b`, "i"), group: 1, suffix: "最少" },
    { regex: new RegExp(`\\b(?:up to|maximum of|max(?:imum)?)\\s+(\\d+)\\s+${units}\\b`, "i"), group: 1, suffix: "最大" },
    { regex: new RegExp(`\\b(\\d+)\\s+${units}\\b`, "i"), group: 1 }
  ];

  for (const check of checks) {
    const match = text.match(check.regex);
    if (!match) continue;
    const count = Math.max(1, number(match[check.group], 1));
    if (count > 1) {
      const note = `${formatNumber(count, 0)}ヒット${check.suffix ? `（${check.suffix}）` : ""}`;
      return { count, note };
    }
  }

  if (!preferLabel) {
    const duration = text.match(/\bevery\s+(\d+(?:\.\d+)?)s\s+over\s+(\d+(?:\.\d+)?)s\b/i);
    if (duration) {
      const count = Math.max(1, Math.floor(number(duration[2], 0) / number(duration[1], 1)));
      if (count > 1) return { count, note: `${formatNumber(count, 0)}ヒット（最大）` };
    }
  }

  return { count: 1, note: "" };
}

function normalizeCountWords(value) {
  const words = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12"
  };

  return String(value || "").replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, (match) => {
    return words[match.toLowerCase()] || match;
  });
}

function skillIconUrl(pokemonName, skillName) {
  if (!skillName || skillName === "Attack") {
    return "https://d275t8dp8rxb42.cloudfront.net/skills/Attack.png";
  }
  const folder = pokemonName === "Mr.Mime" ? "Mr.+Mime" : pokemonName.replace(/[ ]/g, "+");
  const file = skillName.replace(/[ ]/g, "+");
  return `https://d275t8dp8rxb42.cloudfront.net/skills/${folder}/${file}.png`;
}

const SNORLAX_FLAIL_HP_TIERS = [
  { key: "above-80", label: "残りHP 80%超", minExclusive: 80 },
  { key: "up-to-80", label: "残りHP 80%以下", minExclusive: 60 },
  { key: "up-to-60", label: "残りHP 60%以下", minExclusive: 40 },
  { key: "up-to-40", label: "残りHP 40%以下", minExclusive: 20 },
  { key: "up-to-20", label: "残りHP 20%以下", minExclusive: -1 }
];

const SNORLAX_FLAIL_FORMULAS = {
  basic: {
    regular: [
      [45, 7, 90, 5], [50, 8, 150, 6], [55, 9, 210, 7], [60, 10, 270, 8], [65, 11, 330, 9]
    ],
    enhanced: [
      [81, 7, 100, 5], [86, 8, 160, 6], [91, 9, 220, 7], [96, 10, 280, 8], [101, 11, 340, 9]
    ]
  },
  boosted: {
    regular: [
      [67.5, 10, 135, 6], [75, 11, 225, 7], [82.5, 12, 315, 8], [90, 13, 405, 9], [97.5, 14, 495, 10]
    ],
    enhanced: [
      [121.5, 10, 150, 6], [129, 11, 240, 7], [136.5, 12, 330, 8], [144, 13, 420, 9], [151.5, 14, 510, 10]
    ]
  }
};

function isSnorlaxFlailAttackChoice(pokemon, choice) {
  return pokemon?.name === "Snorlax" && /^snorlax-flail-(?:basic|boosted)$/.test(choice?.slotKey || "");
}

function selectedSnorlaxFlailHpTier() {
  const hpPercent = clamp(number(el.snorlaxFlailHpPercent?.value, 100), 0, 100);
  return SNORLAX_FLAIL_HP_TIERS.find((tier) => hpPercent > tier.minExclusive)
    || SNORLAX_FLAIL_HP_TIERS[SNORLAX_FLAIL_HP_TIERS.length - 1];
}

function snorlaxFlailAttackChoice(pokemon, flail, attackKind) {
  const slotKey = `snorlax-flail-${attackKind}`;
  const isBoosted = attackKind === "boosted";
  const displayName = isBoosted ? "強化攻撃（じたばた）" : "通常攻撃（じたばた）";
  const iconUrl = skillIconUrl(pokemon.name, flail.name);
  const minLevel = number(flail.level1 || flail.level || 5, 5);
  const enhancedMinLevel = number(flail.level2 || 11, 11);
  const formulas = SNORLAX_FLAIL_FORMULAS[attackKind];
  const entries = [];

  SNORLAX_FLAIL_HP_TIERS.forEach((tier, index) => {
    [
      { values: formulas.regular[index], enhanced: false, entryMinLevel: minLevel },
      { values: formulas.enhanced[index], enhanced: true, entryMinLevel: enhancedMinLevel }
    ].forEach(({ values, enhanced, entryMinLevel }) => {
      const [ratio, slider, base, maxHpRatio] = values;
      const basePartKey = `${slotKey}-${tier.key}`;
      entries.push({
        id: `${basePartKey}${enhanced ? "-plus" : ""}`,
        ownerName: displayName,
        groupName: "Move 1",
        suffix: "",
        label: tier.label,
        ratio,
        slider,
        base,
        maxHpRatio,
        dmgType: "Atk",
        minLevel: entryMinLevel,
        notes: "自分の残りHP割合に応じてダメージ式が変化します。",
        contextText: "じたばた中の通常攻撃。自分の残りHPが少ないほどダメージが増加します。",
        enhancedNotes: "Lv11以降はじたばた＋の式を使用します。",
        enhancedMinLevel,
        enhanced,
        partKey: `${basePartKey}${enhanced ? "-plus" : ""}`,
        basePartKey,
        slotKey,
        slotLabel: "技1",
        displayName,
        iconUrl,
        flailHpTierKey: tier.key
      });
    });
  });

  return {
    slotKey,
    slotLabel: "技1",
    displayName,
    iconUrl,
    minLevel,
    entries,
    disabled: false
  };
}

function parseTargetHpDamage(text) {
  const normalizedSource = String(text || "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const thresholdMatch = normalizedSource.match(/\b(?:at\s+or\s+)?(?:below|under)\s+(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:(?:their|its|the\s+target's?)\s+)?(?:remaining\s+|current\s+|max(?:imum)?\s+)?HP/i);
  const thresholdContext = thresholdMatch
    ? normalizedSource.slice(Math.max(0, thresholdMatch.index - 80), thresholdMatch.index + thresholdMatch[0].length + 40)
    : "";
  const maxRemainingPercent = thresholdMatch && /\b(?:enemies?|enemy|targets?|target|opposing)\b/i.test(thresholdContext)
    ? number(thresholdMatch[1], 0)
    : 0;
  const source = normalizedSource
    .replace(/\b(?:at\s+or\s+)?(?:below|above|under|over)\s+\d+(?:\.\d+)?\s*%\s*(?:of\s+)?(?:(?:their|its|the\s+target's?)\s+)?(?:remaining|current|missing|max(?:imum)?)\s*HP/gi, "")
    .trim();
  if (!source) return null;

  const basisPattern = "(remaining|current|missing|max(?:imum)?)";
  const ownerPattern = "(?:(?:(?:the\\s+)?(?:(?:main|initial|first|secondary)\\s+)?(?:enemies?|enemy(?:'s)?|targets?|target(?:'s)?|opposing\\s+Pok(?:e|é)mon(?:'s)?)|their|its)\\s+)?";
  const patterns = [
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:of\\s+)?${ownerPattern}${basisPattern}\\s*HP`, "i"),
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*${basisPattern}\\s*HP\\s*(?:of\\s+${ownerPattern})?`, "i")
  ];
  const match = patterns.map((pattern) => source.match(pattern)).find(Boolean);
  if (!match) return null;
  const matchIndex = Math.max(0, number(match.index, 0));
  const targetNamedInFormula = /\b(?:enemies?|enemy|targets?|target|opposing)\b/i.test(match[0]);
  const nearbyBefore = source.slice(Math.max(0, matchIndex - 80), matchIndex);
  const nearbyAfter = source.slice(matchIndex + match[0].length, matchIndex + match[0].length + 80);
  const opponentExplicit = targetNamedInFormula
    || /\b(?:to|against)\s+(?:the\s+)?(?:enemies?|enemy|targets?|target|opposing)\b/i.test(nearbyAfter)
    || /\b(?:enemies?|enemy|targets?|target|opposing)\b.{0,50}\b(?:takes?|receives?)\b/i.test(nearbyBefore);
  const selfCostContext = source.slice(Math.max(0, matchIndex - 50), matchIndex);
  const describesSelfCost = /\b(?:the\s+)?user\s+(?:instead\s+)?(?:takes?|loses?|consumes?|receives?)\s*$/i.test(selfCostContext)
    || /\b(?:itself|their\s+own)\s+(?:takes?|loses?|consumes?|receives?)\s*$/i.test(selfCostContext)
    || /\binstead\s+(?:takes?|loses?|consumes?|receives?)\s*$/i.test(selfCostContext)
    || /\blosing\s*$/i.test(selfCostContext);
  if (describesSelfCost && !targetNamedInFormula) return null;

  const rawBasis = String(match[2] || "").toLowerCase();
  const basis = rawBasis.startsWith("max")
    ? "max"
    : rawBasis === "missing"
      ? "missing"
      : "remaining";
  return {
    ratio: number(match[1], 0),
    basis,
    opponentExplicit,
    maxRemainingPercent,
    levelScale: /\b(?:x|×)\s*\(\s*Level\s*-\s*1\s*\)/i.test(source),
    bypassDefense: /\b(?:true|piercing)\s+damage\b/i.test(source)
  };
}

function isTargetHpDamageEntry(label, text) {
  const source = `${label || ""} ${text || ""}`;
  return /(damage|execute|poison|dot|tick)/i.test(source)
    && !/(heal|healing|shield)/i.test(label || "");
}

function addRsbEntries(entries, rsb, ownerName, groupName, minLevel, suffix, meta = {}) {
  if (!rsb) return;
  const firstEntryIndex = entries.length;

  const prefixes = [
    { key: "", name: "" },
    { key: "add1", name: "" },
    { key: "add2", name: "" },
    { key: "add3", name: "" },
    { key: "add4", name: "" },
    { key: "add5", name: "" },
    { key: "enhanced", name: "Plus" },
    { key: "enhanced_add1", name: "Plus" },
    { key: "enhanced_add2", name: "Plus" },
    { key: "enhanced_add3", name: "Plus" },
    { key: "enhanced_add4", name: "Plus" },
    { key: "enhanced_add5", name: "Plus" }
  ];

  prefixes.forEach((prefix) => {
    const ratioRaw = getRsbField(rsb, prefix.key, "ratio");
    const rawDmgType = String(getRsbField(rsb, prefix.key, "dmg_type") || "").trim();
    const exception = String(getRsbField(rsb, prefix.key, "exception") || "");
    const label = String(getRsbField(rsb, prefix.key, "label") || prefix.name || "Damage");
    const targetHpText = [
      getRsbField(rsb, prefix.key, "true_desc"),
      getRsbField(rsb, prefix.key, "notes"),
      getRsbField(rsb, prefix.key, "rsb_info")
    ].filter(Boolean).join(" ");
    const targetHpDamage = isTargetHpDamageEntry(label, targetHpText)
      ? parseTargetHpDamage(targetHpText)
      : null;
    const hasStandardFormula = ratioRaw !== "" && ratioRaw !== undefined && ratioRaw !== null && rawDmgType && exception !== "True";
    const hasTargetHpFormula = Boolean(targetHpDamage && (
      exception === "True"
      || (hasStandardFormula && targetHpDamage.opponentExplicit)
    ));
    if (!hasStandardFormula && !hasTargetHpFormula) return;

    const dmgType = rawDmgType
      || String(rsb.dmg_type || meta.defaultDmgType || "Atk").trim()
      || "Atk";
    const ratio = number(ratioRaw, 0);
    const slider = number(getRsbField(rsb, prefix.key, "slider"), 0);
    const base = number(getRsbField(rsb, prefix.key, "base"), 0);
    const enhanced = prefix.key.startsWith("enhanced");
    const notes = [
      getRsbField(rsb, prefix.key, "true_desc"),
      getRsbField(rsb, prefix.key, "notes"),
      getRsbField(rsb, prefix.key, "rsb_info")
    ].filter(Boolean).join(" ");

    entries.push({
      id: String(entries.length),
      ownerName,
      groupName,
      suffix,
      label,
      ratio,
      slider,
      base,
      dmgType,
      targetHpRatio: hasTargetHpFormula ? targetHpDamage.ratio : 0,
      targetHpBasis: hasTargetHpFormula ? targetHpDamage.basis : "",
      targetHpLevelScale: Boolean(hasTargetHpFormula && targetHpDamage.levelScale),
      targetHpMaxRemainingPercent: hasTargetHpFormula ? targetHpDamage.maxRemainingPercent : 0,
      bypassDefense: Boolean(hasTargetHpFormula && targetHpDamage.bypassDefense && !hasStandardFormula),
      targetHpOnly: Boolean(hasTargetHpFormula && !hasStandardFormula),
      targetHpSourceScore: hasTargetHpFormula
        ? (targetHpDamage.opponentExplicit ? 4 : 0)
          + (prefix.key ? 2 : 0)
          + (/(additional|execute|slam|bonus)/i.test(label) ? 2 : 0)
          - (targetHpText.length > 180 ? 2 : 0)
        : 0,
      minLevel: enhanced ? number(meta.enhancedMinLevel, minLevel) : number(minLevel, 1),
      notes,
      contextText: [rsb.true_desc, rsb.notes, rsb.rsb_info].filter(Boolean).join(" "),
      enhancedNotes: [rsb.enhanced_true_desc, rsb.enhanced_notes, rsb.enhanced_rsb_info].filter(Boolean).join(" "),
      enhancedMinLevel: number(meta.enhancedMinLevel, minLevel),
      enhanced,
      partKey: prefix.key || "base",
      basePartKey: prefix.key.replace(/^enhanced_?/, "") || "base",
      slotKey: meta.slotKey || "",
      slotLabel: meta.slotLabel || "",
      displayName: meta.displayName || ownerName,
      iconUrl: meta.iconUrl || ""
    });
  });

  const targetHpGroups = new Map();
  entries.slice(firstEntryIndex).forEach((entry) => {
    if (!entry.targetHpRatio) return;
    const key = `${entry.enhanced ? "enhanced" : "regular"}:${entry.targetHpBasis}:${entry.targetHpRatio}:${entry.targetHpLevelScale ? "level" : "flat"}:${entry.targetHpMaxRemainingPercent || 0}`;
    if (!targetHpGroups.has(key)) targetHpGroups.set(key, []);
    targetHpGroups.get(key).push(entry);
  });
  targetHpGroups.forEach((group) => {
    if (group.length <= 1) return;
    const targetHpOnlyEntries = group.filter((entry) => entry.targetHpOnly);
    const keep = targetHpOnlyEntries.length
      ? new Set(targetHpOnlyEntries)
      : new Set([group.slice().sort((a, b) => b.targetHpSourceScore - a.targetHpSourceScore)[0]]);
    group.forEach((entry) => {
      if (keep.has(entry)) return;
      entry.targetHpRatio = 0;
      entry.targetHpBasis = "";
      entry.targetHpLevelScale = false;
      entry.targetHpMaxRemainingPercent = 0;
      entry.bypassDefense = false;
    });
  });
  entries.slice(firstEntryIndex).forEach((entry) => {
    delete entry.targetHpSourceScore;
  });
}
