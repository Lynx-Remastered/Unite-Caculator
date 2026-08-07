// Stat modifiers, final damage/support calculations, and result rendering.
function conditionNumber(id, min, max) {
  return clamp(number(el[id].value, 0), min, max);
}

const YVELTAL_DARK_AURA = Object.freeze({
  maxStacks: 5,
  damagePerStackPercent: 3,
  durationSeconds: 3,
  executeHpPercent: 10,
  overflowShieldPercent: 50
});

function applyYveltalDarkAuraDamage(damage, stacks) {
  const safeStacks = clamp(number(stacks, 0), 0, YVELTAL_DARK_AURA.maxStacks);
  const percent = 100 + safeStacks * YVELTAL_DARK_AURA.damagePerStackPercent;
  return Math.max(0, Math.floor(number(damage, 0) * percent / 100));
}

function yveltalDarkAuraAppliesMarks(pokemon, slotKey) {
  return pokemon?.name === "Yveltal" && slotKey !== "basic";
}

function selectedItemNames() {
  return new Set(selectedItems().map((entry) => entry.item.name));
}

function emptyDefenseModifiers() {
  return {
    defenseReductionPercent: 0,
    spDefenseReductionPercent: 0,
    defenseReductionFlat: 0,
    spDefenseReductionFlat: 0,
    defenseIgnorePercent: 0,
    spDefenseIgnorePercent: 0,
    defensePenetrationFlat: 0,
    spDefensePenetrationFlat: 0
  };
}

function addDefenseModifiers(target, source) {
  Object.keys(target).forEach((key) => {
    target[key] += number(source && source[key], 0);
  });
  return target;
}

function defenseEffectAmount(effect, key, level) {
  const raw = effect[key];
  return typeof raw === "function" ? number(raw(level), 0) : number(raw, 0);
}

function selectedDefenseEffectRows() {
  const pokemon = selectedPokemon();
  const level = number(el.levelRange.value, 15);
  return (pokemon ? DEFENSE_EFFECTS[pokemon.name] || [] : [])
    .filter((effect) => level >= number(effect.minLevel, 1) && level <= number(effect.maxLevel, 30));
}

function defenseEffectStateKey(effect) {
  return `${selectedPokemon()?.name || ""}:${effect.id}`;
}

function renderDefenseEffectControls() {
  const effects = selectedDefenseEffectRows();
  el.defenseEffectList.innerHTML = "";
  el.defenseEffectControls.hidden = effects.length === 0;
  if (!effects.length) return;

  effects.forEach((effect) => {
    const stateKey = defenseEffectStateKey(effect);
    const current = clamp(number(state.defenseEffectValues[stateKey], 0), 0, effect.maxStacks);
    if (effect.maxStacks > 1) {
      const row = document.createElement("label");
      row.className = "condition-row";
      const label = document.createElement("span");
      label.textContent = effect.label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(effect.maxStacks);
      input.value = String(current);
      input.addEventListener("input", () => {
        state.defenseEffectValues[stateKey] = clamp(number(input.value, 0), 0, effect.maxStacks);
        updateAll();
      });
      row.append(label, input);
      el.defenseEffectList.appendChild(row);
    } else {
      const row = document.createElement("label");
      row.className = "check-row";
      const label = document.createElement("span");
      label.textContent = effect.label;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = current > 0;
      input.addEventListener("change", () => {
        state.defenseEffectValues[stateKey] = input.checked ? 1 : 0;
        updateAll();
      });
      row.append(label, input);
      el.defenseEffectList.appendChild(row);
    }
  });

  el.defenseEffectNote.textContent = "命中後・発動中の効果を指定します。多段技内で段階が進む効果と技固有の防御無視は自動計算されます。";
}

function activeDefenseModifiers() {
  const modifiers = emptyDefenseModifiers();
  const level = number(el.levelRange.value, 15);
  selectedDefenseEffectRows().forEach((effect) => {
    const stacks = clamp(number(state.defenseEffectValues[defenseEffectStateKey(effect)], 0), 0, effect.maxStacks);
    if (!stacks) return;
    Object.keys(modifiers).forEach((key) => {
      modifiers[key] += defenseEffectAmount(effect, key, level) * stacks;
    });
  });

  modifiers.defenseReductionPercent += number(el.manualDefenseReductionPercent.value, 0);
  modifiers.spDefenseReductionPercent += number(el.manualSpDefenseReductionPercent.value, 0);
  modifiers.defenseReductionFlat += number(el.manualDefenseReductionFlat.value, 0);
  modifiers.spDefenseReductionFlat += number(el.manualSpDefenseReductionFlat.value, 0);
  modifiers.defenseIgnorePercent += number(el.manualDefenseIgnorePercent.value, 0);
  modifiers.spDefenseIgnorePercent += number(el.manualSpDefenseIgnorePercent.value, 0);
  modifiers.defensePenetrationFlat += number(el.manualDefensePenetrationFlat.value, 0);
  modifiers.spDefensePenetrationFlat += number(el.manualSpDefensePenetrationFlat.value, 0);
  if (hasItem("Slick Spoon")) {
    modifiers.spDefenseIgnorePercent += effectTierFor("Slick Spoon");
  }
  if (selectedPokemon()?.name === "Mega-Gyarados") {
    modifiers.defenseIgnorePercent += 30;
  }
  return modifiers;
}

function defenseModifierSummary(modifiers) {
  const rows = [];
  if (modifiers.defenseReductionPercent) rows.push(`防御低下 ${formatNumber(Math.min(100, modifiers.defenseReductionPercent), 1)}%`);
  if (modifiers.spDefenseReductionPercent) rows.push(`特防低下 ${formatNumber(Math.min(100, modifiers.spDefenseReductionPercent), 1)}%`);
  if (modifiers.defenseReductionFlat) rows.push(`防御固定低下 ${formatNumber(modifiers.defenseReductionFlat, 1)}`);
  if (modifiers.spDefenseReductionFlat) rows.push(`特防固定低下 ${formatNumber(modifiers.spDefenseReductionFlat, 1)}`);
  if (modifiers.defenseIgnorePercent) rows.push(`防御無視 ${formatNumber(Math.min(100, modifiers.defenseIgnorePercent), 1)}%`);
  if (modifiers.spDefenseIgnorePercent) rows.push(`特防無視 ${formatNumber(Math.min(100, modifiers.spDefenseIgnorePercent), 1)}%`);
  if (modifiers.defensePenetrationFlat) rows.push(`防御固定貫通 ${formatNumber(modifiers.defensePenetrationFlat, 1)}`);
  if (modifiers.spDefensePenetrationFlat) rows.push(`特防固定貫通 ${formatNumber(modifiers.spDefensePenetrationFlat, 1)}`);
  return rows;
}

function updateDamageVariantControls() {
  const pokemon = selectedPokemon();
  const choice = selectedMoveChoice();
  const level = number(el.levelRange.value, 15);
  const variants = damageVariantOptionsForChoice(pokemon, choice, level);
  if (!variants.length) {
    el.conditionDamageVariant.hidden = true;
    el.damageVariantSelect.innerHTML = "";
    state.selectedDamageVariantKey = "";
    return;
  }

  el.conditionDamageVariant.hidden = false;
  if (!variants.some((variant) => variant.key === state.selectedDamageVariantKey)) {
    state.selectedDamageVariantKey = variants[0].key;
  }
  const currentKey = state.selectedDamageVariantKey;
  el.damageVariantSelect.replaceChildren(...variants.map((variant) => {
    const option = document.createElement("option");
    option.value = variant.key;
    option.textContent = variant.label;
    option.selected = variant.key === currentKey;
    return option;
  }));
  el.damageVariantSelect.value = currentKey;
}

function updateDefaultCheckedCondition(container, checkbox, eligible) {
  const becameEligible = eligible && container.hidden;
  container.hidden = !eligible;
  if (becameEligible) checkbox.checked = true;
}

function updateConditionVisibility() {
  const names = selectedItemNames();
  const map = {
    conditionAttackWeight: "Attack Weight",
    conditionAeosCookie: "Aeos Cookie",
    conditionSpAtkSpecs: "Sp. Atk Specs",
    conditionWeaknessPolicy: "Weakness Policy",
    conditionAccelBracer: "Accel Bracer",
    conditionDriveLens: "Drive Lens"
  };
  Object.entries(map).forEach(([id, itemName]) => {
    document.getElementById(id).hidden = !names.has(itemName);
  });
  updateDefaultCheckedCondition(
    el.conditionChoiceSpecs,
    el.choiceSpecsProc,
    names.has("Choice Specs") && choiceSpecsCanTrigger()
  );
  updateDefaultCheckedCondition(
    el.conditionChargingCharm,
    el.chargingCharmProc,
    names.has("Charging Charm")
  );
  updateDefaultCheckedCondition(
    el.conditionRazorClaw,
    el.razorClawProc,
    names.has("Razor Claw") && razorClawCanTrigger()
  );
  updateDefaultCheckedCondition(
    el.conditionEnergyAmp,
    el.energyAmpProc,
    names.has("Energy Amplifier")
  );
  const yveltalSelected = selectedPokemon()?.name === "Yveltal";
  el.conditionYveltalMarks.hidden = !yveltalSelected;
  if (yveltalSelected) {
    const stacks = conditionNumber("yveltalMarkStacks", 0, YVELTAL_DARK_AURA.maxStacks);
    const damageBonus = stacks * YVELTAL_DARK_AURA.damagePerStackPercent;
    el.yveltalDarkAuraNote.textContent = `${YVELTAL_DARK_AURA.durationSeconds}秒間有効。現在の被ダメージ増加 +${formatNumber(damageBonus, 0)}%。強化攻撃・わざ・ユナイトわざの命中後に付与（最大${YVELTAL_DARK_AURA.maxStacks}個）。最大時は技で残りHP${YVELTAL_DARK_AURA.executeHpPercent}%以下になると即KO。KO時の回復と超過回復の${YVELTAL_DARK_AURA.overflowShieldPercent}%シールド転換はダメージ値には含みません。`;
  }
  el.conditionSnorlaxFlailHp.hidden = !isSnorlaxFlailAttackChoice(selectedPokemon(), selectedMoveChoice());
  el.conditionSylveonHyperVoice.hidden = !(selectedPokemon()?.name === "Sylveon"
    && selectedMoveChoice()?.displayName === "Hyper Voice");
  updateDamageVariantControls();
  renderDefenseEffectControls();
  updateConditionPanelVisibility(el.damageConditionPanel);
}

function selectedRegiBuffValue() {
  return document.querySelector('input[name="regiBuff"]:checked')?.value || "none";
}

function selectedSpecialPokemonBuffLines() {
  const lines = [];
  const regiBuff = REGI_BUFFS[selectedRegiBuffValue()] || REGI_BUFFS.none;
  if (regiBuff.name) lines.push(`${regiBuff.name}: ${regiBuff.description}`);
  if (el.regidragoBuff.checked) lines.push("レジドラゴ（ゴール速度+100%）");
  if (el.groudonBuff.checked) lines.push("グラードン（与ダメージ+50%）");
  if (el.rayquazaBuff.checked) {
    lines.push("レックウザ（シールド中は与ダメージ+40%）");
  }
  return lines;
}

function updateConditionPanelVisibility(panel) {
  if (!panel) return;
  const body = panel.querySelector(".condition-grid");
  panel.hidden = !body || !Array.from(body.children).some((child) => !child.hidden);
}

function updateShieldConditionVisibility() {
  const names = new Set(selectedShieldItems().map((entry) => entry.item.name));
  const map = {
    shieldConditionAttackWeight: "Attack Weight",
    shieldConditionSpAtkSpecs: "Sp. Atk Specs",
    shieldConditionWeaknessPolicy: "Weakness Policy",
    shieldConditionAccelBracer: "Accel Bracer",
    shieldConditionDriveLens: "Drive Lens"
  };
  Object.entries(map).forEach(([id, itemName]) => {
    el[id].hidden = !names.has(itemName);
  });
  updateConditionPanelVisibility(el.shieldConditionPanel);
}

function updateHealingConditionVisibility() {
  const names = new Set(selectedHealingItems().map((entry) => entry.item.name));
  const map = {
    healingConditionAttackWeight: "Attack Weight",
    healingConditionSpAtkSpecs: "Sp. Atk Specs",
    healingConditionWeaknessPolicy: "Weakness Policy",
    healingConditionAccelBracer: "Accel Bracer",
    healingConditionDriveLens: "Drive Lens"
  };
  Object.entries(map).forEach(([id, itemName]) => {
    el[id].hidden = !names.has(itemName);
  });
  updateConditionPanelVisibility(el.healingConditionPanel);
}

function effectTierFor(itemName) {
  const row = selectedItems().find((entry) => entry.item.name === itemName);
  if (!row) return 0;
  const item = row.item;
  const raw = row.level < 10 ? item.level1 : row.level < 20 ? item.level10 : item.level20;
  return number(String(raw || "").replace("%", ""), 0);
}

function shieldEffectTierFor(itemName) {
  const row = selectedShieldItems().find((entry) => entry.item.name === itemName);
  if (!row) return 0;
  const item = row.item;
  const raw = row.level < 10 ? item.level1 : row.level < 20 ? item.level10 : item.level20;
  return number(String(raw || "").replace("%", ""), 0);
}

function shieldItemBaseFor(itemName) {
  const row = selectedShieldItems().find((entry) => entry.item.name === itemName);
  if (!row) return 0;
  if (itemName === "Resonant Guard") {
    return row.level < 10 ? 60 : row.level < 20 ? 80 : 100;
  }
  return 0;
}

function healingEffectTierFor(itemName) {
  const row = selectedHealingItems().find((entry) => entry.item.name === itemName);
  if (!row) return 0;
  const item = row.item;
  const raw = row.level < 10 ? item.level1 : row.level < 20 ? item.level10 : item.level20;
  return number(String(raw || "").replace("%", ""), 0);
}

function signedNumber(value, digits = 1) {
  const formatted = formatNumber(value, digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function emblemSetPercent(color, count) {
  const set = state.emblemSets.find((entry) => entry.name === color);
  if (!set) return 0;
  if (count >= number(set.count3, 99)) return number(set.bonus3, 0);
  if (count >= number(set.count2, 99)) return number(set.bonus2, 0);
  if (count >= number(set.count1, 99)) return number(set.bonus1, 0);
  return 0;
}

function emblemBonusesFromSummary(summary, baseAttack, baseSpAttack, baseHp = 0) {
  summary = summary || {};
  const equippedCount = clamp(number(summary.equippedCount, 0), 0, EMBLEM_SLOT_COUNT);
  const colorCounts = Object.fromEntries(state.emblemSets.map((set) => [set.name, 0]));
  Object.entries(summary.colorCounts || {}).forEach(([color, count]) => {
    colorCounts[color] = clamp(number(count, 0), 0, EMBLEM_SLOT_COUNT);
  });
  colorCounts.Brown = clamp(number(summary.brownCount, colorCounts.Brown), 0, EMBLEM_SLOT_COUNT);
  colorCounts.Green = clamp(number(summary.greenCount, colorCounts.Green), 0, EMBLEM_SLOT_COUNT);
  colorCounts.White = clamp(number(summary.whiteCount, colorCounts.White), 0, EMBLEM_SLOT_COUNT);

  const flatStats = Object.fromEntries(EMBLEM_STAT_DEFINITIONS.map((definition) => [definition.key, 0]));
  Object.entries(summary.flatStats || {}).forEach(([stat, value]) => {
    flatStats[stat] = number(value, 0);
  });
  flatStats.attack = number(summary.attack, flatStats.attack);
  flatStats.sp_attack = number(summary.spAttack, flatStats.sp_attack);
  flatStats.crit = number(summary.critRate, flatStats.crit);
  flatStats.hp = number(summary.hp, flatStats.hp);

  const brownCount = colorCounts.Brown;
  const greenCount = colorCounts.Green;
  const whiteCount = colorCounts.White;
  const hpFlat = flatStats.hp;
  const attackFlat = flatStats.attack;
  const spAttackFlat = flatStats.sp_attack;
  const critRate = flatStats.crit;
  const attackPercent = emblemSetPercent("Brown", brownCount);
  const spAttackPercent = emblemSetPercent("Green", greenCount);
  const hpPercent = emblemSetPercent("White", whiteCount);
  const attackSetBonus = baseAttack * attackPercent / 100;
  const spAttackSetBonus = baseSpAttack * spAttackPercent / 100;
  const hpSetBonus = baseHp * hpPercent / 100;
  const lines = [];

  if (attackPercent || spAttackPercent || hpPercent) {
    const colors = [];
    if (attackPercent) colors.push(`茶${brownCount}: 攻撃+${formatNumber(attackPercent, 1)}%（基礎能力から+${formatNumber(attackSetBonus, 1)}）`);
    if (spAttackPercent) colors.push(`緑${greenCount}: 特攻+${formatNumber(spAttackPercent, 1)}%（基礎能力から+${formatNumber(spAttackSetBonus, 1)}）`);
    if (hpPercent) colors.push(`白${whiteCount}: HP+${formatNumber(hpPercent, 1)}%（基礎能力から+${formatNumber(hpSetBonus, 1)}）`);
    lines.push(colors.join(" / "));
  }
  if (hpFlat || attackFlat || spAttackFlat || critRate) {
    lines.push(`個別補正: HP${signedNumber(hpFlat, 0)} / 攻撃${signedNumber(attackFlat, 1)} / 特攻${signedNumber(spAttackFlat, 1)} / 急所率${signedNumber(critRate, 1)}%`);
  }

  return {
    equippedCount,
    brownCount,
    greenCount,
    whiteCount,
    hpFlat,
    attackFlat,
    spAttackFlat,
    critRate,
    attackPercent,
    spAttackPercent,
    hpPercent,
    attackSetBonus,
    spAttackSetBonus,
    hpSetBonus,
    colorCounts,
    flatStats,
    lines
  };
}

function selectedEmblemBonuses(baseAttack, baseSpAttack, baseHp = 0) {
  return emblemBonusesFromSummary(state.emblemFallback || summarizeEmblemRows(selectedEmblemRows()), baseAttack, baseSpAttack, baseHp);
}

function renderEmblemSummary(emblem) {
  el.emblemSlotCount.textContent = state.emblemFallback
    ? "内訳なし"
    : `${formatNumber(emblem.equippedCount, 0)} / ${EMBLEM_SLOT_COUNT}`;

  el.emblemStatEffects.innerHTML = "";
  const visibleStats = EMBLEM_STAT_DEFINITIONS.filter((definition) => number(emblem.flatStats[definition.key], 0) !== 0);
  if (!visibleStats.length) {
    const empty = document.createElement("div");
    empty.className = "emblem-effect-empty";
    empty.textContent = "能力補正なし";
    el.emblemStatEffects.appendChild(empty);
  } else {
    visibleStats.forEach((definition) => {
      const row = document.createElement("div");
      row.className = "emblem-stat-row";
      const term = document.createElement("dt");
      term.textContent = definition.label;
      const value = document.createElement("dd");
      value.textContent = `${signedNumber(emblem.flatStats[definition.key], definition.digits)}${definition.suffix}`;
      row.append(term, value);
      el.emblemStatEffects.appendChild(row);
    });
  }

  el.emblemColorEffects.innerHTML = "";
  const visibleColors = EMBLEM_COLOR_DISPLAY_ORDER.filter((color) => {
    const count = number(emblem.colorCounts[color], 0);
    return count > 0 && emblemSetPercent(color, count) !== 0;
  });
  if (!visibleColors.length) {
    const empty = document.createElement("div");
    empty.className = "emblem-effect-empty";
    empty.textContent = "カラー効果なし";
    el.emblemColorEffects.appendChild(empty);
  } else {
    visibleColors.forEach((color) => {
      const count = number(emblem.colorCounts[color], 0);
      const set = state.emblemSets.find((entry) => entry.name === color);
      if (!set) return;

      const row = document.createElement("div");
      row.className = "emblem-color-effect-row";
      row.style.setProperty("--emblem-color", EMBLEM_COLOR_HEX[color] || "var(--accent-2)");
      const current = document.createElement("div");
      current.className = "emblem-color-current";
      const icon = document.createElement("img");
      icon.src = emblemSetIconUrl(color);
      icon.alt = EMBLEM_COLOR_LABELS[color] || color;
      icon.loading = "lazy";
      icon.onerror = () => icon.remove();
      const bonus = emblemSetPercent(color, count);
      const effect = document.createElement("span");
      effect.className = "emblem-color-effect-value";
      const negative = String(set.math || "").toLowerCase() === "sub";
      const sign = negative ? "-" : "+";
      const suffix = set.percent ? "%" : "";
      const effectLabel = EMBLEM_COLOR_EFFECT_LABELS[color] || jpStat(set.stat || set.stat_desc || color);
      effect.classList.add(negative ? "negative" : "positive");
      effect.textContent = `${effectLabel} ${sign} ${formatNumber(Math.abs(bonus), 1)}${suffix}`;
      row.setAttribute("aria-label", effect.textContent);
      current.append(icon, effect);

      row.appendChild(current);
      el.emblemColorEffects.appendChild(row);
    });
  }
}

function computeAttackerStats() {
  const level = number(el.levelRange.value, 15);
  const pokemon = selectedPokemon();
  const baseStats = pokemon ? pokemonStats(pokemon.name, level) : null;
  const baseHp = number(baseStats && baseStats.hp, 0);
  const baseAttack = number(baseStats && baseStats.attack, 0);
  const baseSpAttack = number(baseStats && baseStats.sp_attack, 0);
  const baseCrit = number(baseStats && baseStats.crit, 0);
  const emblem = selectedEmblemBonuses(baseAttack, baseSpAttack, baseHp);

  const bonuses = {
    hpFlat: 0,
    attackFlat: 0,
    spAttackFlat: 0,
    critRate: 0,
    critDamage: 0,
    itemLines: []
  };

  selectedItems().forEach(({ item, level: itemLevel }) => {
    (item.stats || []).forEach((stat) => {
      const value = itemLevelValue(itemLevel, stat);
      const label = stat.label;
      if (label === "HP") bonuses.hpFlat += value;
      if (label === "Attack") bonuses.attackFlat += value;
      if (label === "Sp. Attack") bonuses.spAttackFlat += value;
      if (label === "Critical-Hit Rate") bonuses.critRate += value;
      if (label === "Critical-Hit Damage Modifier") bonuses.critDamage += value;
      if (value) {
        const unit = stat.percent ? "%" : "";
        bonuses.itemLines.push(`${jpItemName(item)}: ${jpStat(label)} +${formatNumber(value, 2)}${unit}`);
      }
    });
  });

  let hpFlat = bonuses.hpFlat + emblem.hpFlat + number(el.manualHp.value, 0);
  let attackFlat = bonuses.attackFlat + emblem.attackFlat + number(el.manualAttack.value, 0);
  let spAttackFlat = bonuses.spAttackFlat + emblem.spAttackFlat + number(el.manualSpAttack.value, 0);
  let attackPercent = 0;
  let spAttackPercent = 0;

  if (hasItem("Attack Weight")) {
    attackFlat += conditionNumber("attackWeightStacks", 0, 6) * effectTierFor("Attack Weight");
  }
  if (hasItem("Aeos Cookie")) {
    hpFlat += conditionNumber("aeosCookieStacks", 0, 6) * effectTierFor("Aeos Cookie");
  }
  if (hasItem("Sp. Atk Specs")) {
    spAttackFlat += conditionNumber("spAtkSpecsStacks", 0, 6) * effectTierFor("Sp. Atk Specs");
  }
  if (hasItem("Weakness Policy")) {
    attackPercent += conditionNumber("weaknessPolicyStacks", 0, 4) * effectTierFor("Weakness Policy");
  }
  if (hasItem("Accel Bracer")) {
    attackPercent += conditionNumber("accelBracerStacks", 0, 20) * effectTierFor("Accel Bracer");
  }
  if (hasItem("Drive Lens")) {
    spAttackPercent += conditionNumber("driveLensStacks", 0, 20) * effectTierFor("Drive Lens");
  }
  if (hasItem("Wise Glasses")) {
    spAttackPercent += effectTierFor("Wise Glasses");
  }
  if (el.plusPowerProc.checked) {
    attackPercent += PLUS_POWER_STAT_PERCENT;
    spAttackPercent += PLUS_POWER_STAT_PERCENT;
  }

  const regiBuff = REGI_BUFFS[selectedRegiBuffValue()] || REGI_BUFFS.none;
  attackPercent += regiBuff.attackPercent;
  spAttackPercent += regiBuff.spAttackPercent;

  const attackBeforePercent = baseAttack + attackFlat;
  const spAttackBeforePercent = baseSpAttack + spAttackFlat;
  const attack = attackBeforePercent * (1 + attackPercent / 100) + emblem.attackSetBonus;
  const spAttack = spAttackBeforePercent * (1 + spAttackPercent / 100) + emblem.spAttackSetBonus;
  const maxHp = Math.max(0, baseHp + hpFlat + emblem.hpSetBonus);

  return {
    baseHp,
    baseAttack,
    baseSpAttack,
    maxHp,
    hpFlat,
    attack,
    spAttack,
    attackFlat,
    spAttackFlat,
    attackPercent,
    spAttackPercent,
    emblem,
    emblemLines: emblem.lines,
    specialBuffLines: selectedSpecialPokemonBuffLines(),
    critRate: Math.max(0, baseCrit + bonuses.critRate + emblem.critRate),
    critDamageMultiplier: 2 + bonuses.critDamage / 100,
    itemLines: bonuses.itemLines
  };
}

function computeShieldStats() {
  const level = number(el.shieldLevelRange.value, 15);
  const pokemon = selectedShieldPokemon();
  const baseStats = pokemon ? pokemonStats(pokemon.name, level) : null;
  const baseHp = number(baseStats && baseStats.hp, 0);
  const baseAttack = number(baseStats && baseStats.attack, 0);
  const baseSpAttack = number(baseStats && baseStats.sp_attack, 0);
  const bonuses = {
    hpFlat: 0,
    attackFlat: 0,
    spAttackFlat: 0,
    itemLines: []
  };

  selectedShieldItems().forEach(({ item, level: itemLevel }) => {
    (item.stats || []).forEach((stat) => {
      const value = itemLevelValue(itemLevel, stat);
      const label = stat.label;
      if (label === "HP") bonuses.hpFlat += value;
      if (label === "Attack") bonuses.attackFlat += value;
      if (label === "Sp. Attack") bonuses.spAttackFlat += value;
      if (value) {
        const unit = stat.percent ? "%" : "";
        bonuses.itemLines.push(`${jpItemName(item)}: ${jpStat(label)} +${formatNumber(value, 2)}${unit}`);
      }
    });
  });

  const hpFlat = bonuses.hpFlat + number(el.shieldManualHp.value, 0);
  let attackFlat = bonuses.attackFlat + number(el.shieldManualAttack.value, 0);
  let spAttackFlat = bonuses.spAttackFlat + number(el.shieldManualSpAttack.value, 0);
  let attackPercent = 0;
  let spAttackPercent = 0;

  if (hasShieldItem("Attack Weight")) {
    attackFlat += conditionNumber("shieldAttackWeightStacks", 0, 6) * shieldEffectTierFor("Attack Weight");
  }
  if (hasShieldItem("Sp. Atk Specs")) {
    spAttackFlat += conditionNumber("shieldSpAtkSpecsStacks", 0, 6) * shieldEffectTierFor("Sp. Atk Specs");
  }
  if (hasShieldItem("Weakness Policy")) {
    attackPercent += conditionNumber("shieldWeaknessPolicyStacks", 0, 4) * shieldEffectTierFor("Weakness Policy");
  }
  if (hasShieldItem("Accel Bracer")) {
    attackPercent += conditionNumber("shieldAccelBracerStacks", 0, 20) * shieldEffectTierFor("Accel Bracer");
  }
  if (hasShieldItem("Drive Lens")) {
    spAttackPercent += conditionNumber("shieldDriveLensStacks", 0, 20) * shieldEffectTierFor("Drive Lens");
  }
  if (hasShieldItem("Wise Glasses")) {
    spAttackPercent += shieldEffectTierFor("Wise Glasses");
  }

  const attack = (baseAttack + attackFlat) * (1 + attackPercent / 100);
  const spAttack = (baseSpAttack + spAttackFlat) * (1 + spAttackPercent / 100);
  const maxHp = Math.max(0, baseHp + hpFlat);

  return {
    baseHp,
    baseAttack,
    baseSpAttack,
    maxHp,
    hpFlat,
    attack,
    spAttack,
    attackFlat,
    spAttackFlat,
    attackPercent,
    spAttackPercent,
    itemLines: bonuses.itemLines
  };
}

function computeHealingStats() {
  const level = number(el.healingLevelRange.value, 15);
  const pokemon = selectedHealingPokemon();
  const baseStats = pokemon ? pokemonStats(pokemon.name, level) : null;
  const baseAttack = number(baseStats && baseStats.attack, 0);
  const baseSpAttack = number(baseStats && baseStats.sp_attack, 0);
  const bonuses = {
    attackFlat: 0,
    spAttackFlat: 0,
    itemLines: []
  };

  selectedHealingItems().forEach(({ item, level: itemLevel }) => {
    (item.stats || []).forEach((stat) => {
      const value = itemLevelValue(itemLevel, stat);
      const label = stat.label;
      if (label === "Attack") bonuses.attackFlat += value;
      if (label === "Sp. Attack") bonuses.spAttackFlat += value;
      if (value) {
        const unit = stat.percent ? "%" : "";
        bonuses.itemLines.push(`${jpItemName(item)}: ${jpStat(label)} +${formatNumber(value, 2)}${unit}`);
      }
    });
  });

  let attackFlat = bonuses.attackFlat + number(el.healingManualAttack.value, 0);
  let spAttackFlat = bonuses.spAttackFlat + number(el.healingManualSpAttack.value, 0);
  let attackPercent = 0;
  let spAttackPercent = 0;

  if (hasHealingItem("Attack Weight")) {
    attackFlat += conditionNumber("healingAttackWeightStacks", 0, 6) * healingEffectTierFor("Attack Weight");
  }
  if (hasHealingItem("Sp. Atk Specs")) {
    spAttackFlat += conditionNumber("healingSpAtkSpecsStacks", 0, 6) * healingEffectTierFor("Sp. Atk Specs");
  }
  if (hasHealingItem("Weakness Policy")) {
    attackPercent += conditionNumber("healingWeaknessPolicyStacks", 0, 4) * healingEffectTierFor("Weakness Policy");
  }
  if (hasHealingItem("Accel Bracer")) {
    attackPercent += conditionNumber("healingAccelBracerStacks", 0, 20) * healingEffectTierFor("Accel Bracer");
  }
  if (hasHealingItem("Drive Lens")) {
    spAttackPercent += conditionNumber("healingDriveLensStacks", 0, 20) * healingEffectTierFor("Drive Lens");
  }
  if (hasHealingItem("Wise Glasses")) {
    spAttackPercent += healingEffectTierFor("Wise Glasses");
  }

  const attack = (baseAttack + attackFlat) * (1 + attackPercent / 100);
  const spAttack = (baseSpAttack + spAttackFlat) * (1 + spAttackPercent / 100);
  return {
    baseAttack,
    baseSpAttack,
    attack,
    spAttack,
    attackFlat,
    spAttackFlat,
    attackPercent,
    spAttackPercent,
    itemLines: bonuses.itemLines
  };
}

function computeExtraDamages(stats) {
  const extras = [];
  const choice = selectedMoveChoice();
  const targetHp = targetHpState();

  if (hasItem("Muscle Band") && /^(?:basic|boosted|snorlax-flail-)/.test(choice?.slotKey || "")) {
    const percent = effectTierFor("Muscle Band");
    const cap = percent * 120;
    const uncapped = Math.floor(targetHp.remainingHp * percent / 100);
    const raw = Math.min(uncapped, cap);
    extras.push({
      name: jpItemName("Muscle Band"),
      raw,
      type: "Atk",
      formula: `+${formatNumber(targetHp.remainingHp, 0)}*${formatNumber(percent, 1)}%（上限${formatNumber(cap, 0)}）`,
      calculationFormula: `${formulaVariableValue(targetHp.remainingHp, "targethp", 0)} × ${formatNumber(percent, 1)}%（上限 ${formatNumber(cap, 0)}）`
    });
  }

  if (hasItem("Choice Specs") && el.choiceSpecsProc.checked && choiceSpecsCanTrigger(choice)) {
    const percent = effectTierFor("Choice Specs");
    const flat = selectedItemLevel("Choice Specs") < 10 ? 40 : selectedItemLevel("Choice Specs") < 20 ? 50 : 60;
    const raw = Math.floor(Math.floor(stats.spAttack * percent / 100) + flat);
    extras.push({
      name: jpItemName("Choice Specs"),
      raw,
      type: "SpAtk",
      formula: `+${formatNumber(stats.spAttack, 1)}*${formatNumber(percent, 1)}% +${formatNumber(flat, 0)}`,
      calculationFormula: `${formulaVariableValue(stats.spAttack, "spatk", 1)} × ${formatNumber(percent, 1)}% + ${formatNumber(flat, 0)}`
    });
  }

  if (hasItem("Charging Charm") && el.chargingCharmProc.checked) {
    const percent = effectTierFor("Charging Charm");
    const flat = selectedItemLevel("Charging Charm") < 10 ? 20 : selectedItemLevel("Charging Charm") < 20 ? 30 : 40;
    const raw = Math.floor(Math.floor(stats.attack * percent / 100) + flat);
    extras.push({
      name: jpItemName("Charging Charm"),
      raw,
      type: "Atk",
      formula: `+${formatNumber(stats.attack, 1)}*${formatNumber(percent, 1)}% +${formatNumber(flat, 0)}`,
      calculationFormula: `${formulaVariableValue(stats.attack, "atk", 1)} × ${formatNumber(percent, 1)}% + ${formatNumber(flat, 0)}`
    });
  }

  if (hasItem("Razor Claw") && el.razorClawProc.checked && razorClawCanTrigger(choice)) {
    const percent = effectTierFor("Razor Claw");
    const flat = selectedItemLevel("Razor Claw") < 10 ? 10 : selectedItemLevel("Razor Claw") < 20 ? 15 : 20;
    const raw = Math.floor(Math.floor(stats.attack * percent / 100) + flat);
    extras.push({
      name: jpItemName("Razor Claw"),
      raw,
      type: "Atk",
      formula: `+${formatNumber(stats.attack, 1)}*${formatNumber(percent, 1)}% +${formatNumber(flat, 0)}`,
      calculationFormula: `${formulaVariableValue(stats.attack, "atk", 1)} × ${formatNumber(percent, 1)}% + ${formatNumber(flat, 0)}`
    });
  }

  const manual = number(el.manualExtraDamage.value, 0);
  if (manual) {
    const move = selectedMove();
    extras.push({
      name: "手動固定値",
      raw: manual,
      type: move ? move.dmgType : "Atk",
      formula: `${manual < 0 ? "-" : "+"}${formatNumber(Math.abs(manual), 1)}`,
      calculationFormula: `${manual < 0 ? "-" : ""}${formatNumber(Math.abs(manual), 1)}`
    });
  }

  return extras;
}

function currentDefenseEffectStacks(effectId) {
  const effect = selectedDefenseEffectRows().find((entry) => entry.id === effectId);
  if (!effect) return 0;
  return clamp(number(state.defenseEffectValues[defenseEffectStateKey(effect)], 0), 0, effect.maxStacks);
}

function intrinsicDefenseModifiers(part) {
  const modifiers = emptyDefenseModifiers();
  const pokemonName = selectedPokemon()?.name || "";
  const moveName = selectedMoveChoice()?.displayName || "";
  const label = String(part && part.label || "");

  if ((pokemonName === "Absol" && moveName === "Feint")
    || (pokemonName === "Armarouge" && moveName === "Psyshock")
    || (pokemonName === "Ceruledge" && moveName === "Phantom Force")
    || (pokemonName === "Azumarill" && moveName === "Aqua Tail" && /Long Range/i.test(label))
    || (pokemonName === "Tyranitar" && moveName === "Sand Tomb" && /AoE|Tick/i.test(label))
    || (pokemonName === "Tyranitar" && moveName === "Ancient Power" && /Second Hit/i.test(label))) {
    if (pokemonName === "Armarouge") modifiers.spDefenseIgnorePercent = 35;
    else modifiers.defenseIgnorePercent = 100;
  }
  if (pokemonName === "Inteleon" && moveName === "Snipe Shot") {
    modifiers.spDefenseIgnorePercent = /Far/i.test(label) ? 25 : /Mid/i.test(label) ? 20 : 15;
  }
  return modifiers;
}

function automaticDefenseEffectNotes() {
  const pokemonName = selectedPokemon()?.name || "";
  const moveName = selectedMoveChoice()?.displayName || "";
  const notes = [];
  if (pokemonName === "Absol" && moveName === "Feint") notes.push("フェイント: 防御を100%無視");
  if (pokemonName === "Armarouge" && moveName === "Psyshock") notes.push("サイコショック: 特防を35%無視");
  if (pokemonName === "Ceruledge" && moveName === "Phantom Force") notes.push("ゴーストダイブ: 防御を100%無視");
  if (pokemonName === "Inteleon" && moveName === "Snipe Shot") notes.push("ねらいうち: 距離に応じて特防を15% / 20% / 25%無視");
  if (pokemonName === "Azumarill" && moveName === "Aqua Tail") notes.push("アクアテール: 遠距離ヒットは防御を100%無視");
  if (pokemonName === "Tyranitar" && moveName === "Sand Tomb") notes.push("すなじごく: 砂塵の継続ダメージは防御を100%無視");
  if (pokemonName === "Tyranitar" && moveName === "Ancient Power") notes.push("げんしのちから: 2段目は防御を100%無視");
  if (pokemonName === "Sylveon" && moveName === "Hyper Voice") notes.push("ハイパーボイス: 6ヒット、命中ごとに特防-20%（最大80%）");
  if (pokemonName === "Gardevoir" && moveName === "Psychic") notes.push("サイコキネシス: 命中ごとに特防-20%（最大60%）");
  if (pokemonName === "Mr.Mime" && moveName === "Psychic") notes.push("サイコキネシス: 命中ごとに特防-5%（最大40%）");
  if (pokemonName === "Venusaur" && moveName === "Sludge Bomb") notes.push("ヘドロばくだん: 初段後の継続ダメージに特防-50%");
  if (pokemonName === "Chandelure") notes.push("すりぬけ: ダメージ命中ごとに特防無視+5%（最大6段階）");
  if (pokemonName === "Raichu" && moveName === "Stored Power" && number(el.levelRange.value, 15) >= 11) notes.push("アシストパワー+: 電撃命中ごとに特防-10%（最大30%）");
  if (pokemonName === "Mega-Gyarados") notes.push("かたやぶり: 防御を30%無視");
  return notes;
}

function statusAdjustmentRows(stats, moveResults) {
  const rows = new Map();
  let rowOrder = 0;
  const targetOrder = { Atk: 0, "Sp.Atk": 1, Def: 2, "Sp.Def": 3 };
  const attackPercentBase = stats.baseAttack + stats.attackFlat;
  const spAttackPercentBase = stats.baseSpAttack + stats.spAttackFlat;
  const defenseBase = Math.max(0, number(el.targetDefense.value, 0));
  const spDefenseBase = Math.max(0, number(el.targetSpDefense.value, 0));

  const ensureRow = (target, content, side) => {
    const key = `${target}\u0000${content}\u0000${side}`;
    if (!rows.has(key)) {
      rows.set(key, {
        target,
        content,
        side,
        order: rowOrder,
        details: new Map()
      });
      rowOrder += 1;
    }
    return rows.get(key);
  };

  const addDetail = (target, content, amount, kind = "number", base = 0, suffix = "", side = "self") => {
    const numericAmount = number(amount, 0);
    if (Math.abs(numericAmount) < 0.000001) return;
    const sign = numericAmount < 0 ? "-" : "+";
    const normalizedBase = Math.abs(number(base, 0));
    const row = ensureRow(target, content, side);
    const detailKey = `${kind}\u0000${sign}\u0000${normalizedBase}\u0000${suffix}`;
    const current = row.details.get(detailKey);
    if (current) {
      current.amount += Math.abs(numericAmount);
      return;
    }
    row.details.set(detailKey, {
      kind,
      sign,
      amount: Math.abs(numericAmount),
      base: normalizedBase,
      suffix
    });
  };

  const addNumber = (target, content, amount, suffix = "", side = "self") => {
    addDetail(target, content, amount, "number", 0, suffix, side);
  };
  const addPercent = (target, content, percent, base, suffix = "", side = "self") => {
    addDetail(target, content, percent, "percent", base, suffix, side);
  };
  const percentBaseFor = (target) => target === "Atk" ? attackPercentBase : spAttackPercentBase;

  addNumber("Atk", "メダル", stats.emblem.attackFlat);
  addPercent("Atk", "メダル", stats.emblem.attackPercent, stats.baseAttack);
  addNumber("Sp.Atk", "メダル", stats.emblem.spAttackFlat);
  addPercent("Sp.Atk", "メダル", stats.emblem.spAttackPercent, stats.baseSpAttack);

  selectedItems().forEach(({ item, level: itemLevel }) => {
    const content = jpItemName(item);
    (item.stats || []).forEach((stat) => {
      const target = stat.label === "Attack" ? "Atk" : stat.label === "Sp. Attack" ? "Sp.Atk" : "";
      if (!target) return;
      const value = itemLevelValue(itemLevel, stat);
      if (stat.percent) addPercent(target, content, value, percentBaseFor(target));
      else addNumber(target, content, value);
    });

    if (item.name === "Attack Weight") {
      addNumber("Atk", content, conditionNumber("attackWeightStacks", 0, 6) * effectTierFor(item.name));
    }
    if (item.name === "Sp. Atk Specs") {
      addNumber("Sp.Atk", content, conditionNumber("spAtkSpecsStacks", 0, 6) * effectTierFor(item.name));
    }
    if (item.name === "Weakness Policy") {
      addPercent("Atk", content, conditionNumber("weaknessPolicyStacks", 0, 4) * effectTierFor(item.name), attackPercentBase);
    }
    if (item.name === "Accel Bracer") {
      addPercent("Atk", content, conditionNumber("accelBracerStacks", 0, 20) * effectTierFor(item.name), attackPercentBase);
    }
    if (item.name === "Drive Lens") {
      addPercent("Sp.Atk", content, conditionNumber("driveLensStacks", 0, 20) * effectTierFor(item.name), spAttackPercentBase);
    }
    if (item.name === "Wise Glasses") {
      addPercent("Sp.Atk", content, effectTierFor(item.name), spAttackPercentBase);
    }
  });

  addNumber("Atk", "手動補正", number(el.manualAttack.value, 0));
  addNumber("Sp.Atk", "手動補正", number(el.manualSpAttack.value, 0));

  if (el.plusPowerProc.checked) {
    addPercent("Atk", "プラスパワー", PLUS_POWER_STAT_PERCENT, attackPercentBase);
    addPercent("Sp.Atk", "プラスパワー", PLUS_POWER_STAT_PERCENT, spAttackPercentBase);
  }

  const regiBuff = REGI_BUFFS[selectedRegiBuffValue()] || REGI_BUFFS.none;
  if (regiBuff.name === "レジスチル") {
    addPercent("Atk", regiBuff.name, regiBuff.attackPercent, attackPercentBase);
    addPercent("Sp.Atk", regiBuff.name, regiBuff.spAttackPercent, spAttackPercentBase);
  }
  if (regiBuff.name === "レジロック") {
    const pokemon = selectedPokemon();
    const baseStats = pokemon ? pokemonStats(pokemon.name, number(el.levelRange.value, 15)) : null;
    addPercent("Def", regiBuff.name, 30, number(baseStats && baseStats.defense, 0));
    addPercent("Sp.Def", regiBuff.name, 25, number(baseStats && baseStats.sp_defense, 0));
  }

  const addDefenseModifiers = (content, modifiers, suffixPrefix = "") => {
    const suffix = (label) => `（${suffixPrefix}${label}）`;
    addNumber("Def", content, -number(modifiers.defenseReductionFlat, 0), suffix("低下"), "opponent");
    addPercent("Def", content, -number(modifiers.defenseReductionPercent, 0), defenseBase, suffix("低下"), "opponent");
    addNumber("Def", content, -number(modifiers.defensePenetrationFlat, 0), suffix("貫通"), "opponent");
    addPercent("Def", content, -number(modifiers.defenseIgnorePercent, 0), defenseBase, suffix("無視"), "opponent");
    addNumber("Sp.Def", content, -number(modifiers.spDefenseReductionFlat, 0), suffix("低下"), "opponent");
    addPercent("Sp.Def", content, -number(modifiers.spDefenseReductionPercent, 0), spDefenseBase, suffix("低下"), "opponent");
    addNumber("Sp.Def", content, -number(modifiers.spDefensePenetrationFlat, 0), suffix("貫通"), "opponent");
    addPercent("Sp.Def", content, -number(modifiers.spDefenseIgnorePercent, 0), spDefenseBase, suffix("無視"), "opponent");
  };

  const level = number(el.levelRange.value, 15);
  selectedDefenseEffectRows().forEach((effect) => {
    const stacks = clamp(number(state.defenseEffectValues[defenseEffectStateKey(effect)], 0), 0, effect.maxStacks);
    if (!stacks) return;
    const modifiers = emptyDefenseModifiers();
    Object.keys(modifiers).forEach((key) => {
      modifiers[key] = defenseEffectAmount(effect, key, level) * stacks;
    });
    addDefenseModifiers(effect.label, modifiers);
  });

  addDefenseModifiers("手動補正", {
    defenseReductionPercent: clamp(number(el.manualDefenseReductionPercent.value, 0), 0, 100),
    spDefenseReductionPercent: clamp(number(el.manualSpDefenseReductionPercent.value, 0), 0, 100),
    defenseReductionFlat: Math.max(0, number(el.manualDefenseReductionFlat.value, 0)),
    spDefenseReductionFlat: Math.max(0, number(el.manualSpDefenseReductionFlat.value, 0)),
    defenseIgnorePercent: clamp(number(el.manualDefenseIgnorePercent.value, 0), 0, 100),
    spDefenseIgnorePercent: clamp(number(el.manualSpDefenseIgnorePercent.value, 0), 0, 100),
    defensePenetrationFlat: Math.max(0, number(el.manualDefensePenetrationFlat.value, 0)),
    spDefensePenetrationFlat: Math.max(0, number(el.manualSpDefensePenetrationFlat.value, 0))
  });

  if (hasItem("Slick Spoon")) {
    addPercent("Sp.Def", jpItemName("Slick Spoon"), -effectTierFor("Slick Spoon"), spDefenseBase, "（無視）", "opponent");
  }
  if (selectedPokemon()?.name === "Mega-Gyarados") {
    addPercent("Def", "かたやぶり", -30, defenseBase, "（無視）", "opponent");
  }

  const selectedMoveName = jpMoveName(selectedMoveChoice()?.displayName || "");
  const intrinsicModifierRows = new Set();
  (moveResults || []).forEach((result) => {
    const modifiers = intrinsicDefenseModifiers(result.part);
    const partLabel = jpMoveLabel(result.part.label);
    const signature = `${partLabel}\u0000${Object.keys(modifiers).map((key) => `${key}:${modifiers[key]}`).join("|")}`;
    if (intrinsicModifierRows.has(signature)) return;
    intrinsicModifierRows.add(signature);
    addDefenseModifiers(selectedMoveName || "技固有効果", modifiers, partLabel ? `${partLabel}・` : "");
  });

  const pokemonName = selectedPokemon()?.name || "";
  const moveName = selectedMoveChoice()?.displayName || "";
  if (pokemonName === "Sylveon" && moveName === "Hyper Voice") {
    addPercent("Sp.Def", jpMoveName(moveName), -80, spDefenseBase, "（命中ごと20%低下・最大80%）", "opponent");
  }
  if (pokemonName === "Gardevoir" && moveName === "Psychic") {
    addPercent("Sp.Def", jpMoveName(moveName), -60, spDefenseBase, "（命中ごと20%低下・最大60%）", "opponent");
  }
  if (pokemonName === "Mr.Mime" && moveName === "Psychic") {
    addPercent("Sp.Def", jpMoveName(moveName), -40, spDefenseBase, "（命中ごと5%低下・最大40%）", "opponent");
  }
  if (pokemonName === "Venusaur" && moveName === "Sludge Bomb") {
    addPercent("Sp.Def", jpMoveName(moveName), -50, spDefenseBase, "（初段命中後）", "opponent");
  }
  if (pokemonName === "Chandelure") {
    addPercent("Sp.Def", "すりぬけ", -30, spDefenseBase, "（命中ごと5%無視・最大30%）", "opponent");
  }
  if (pokemonName === "Raichu" && moveName === "Stored Power" && level >= 11) {
    addPercent("Sp.Def", jpMoveName(moveName), -30, spDefenseBase, "（命中ごと10%低下・最大30%）", "opponent");
  }

  return Array.from(rows.values())
    .map((row) => ({ ...row, details: Array.from(row.details.values()) }))
    .sort((a, b) => targetOrder[a.target] - targetOrder[b.target] || a.order - b.order);
}

function renderStatusAdjustmentRows(rows, body = el.damageStatusBody) {
  body.innerHTML = "";
  const card = body.closest(".panel");
  if (card) card.hidden = !rows.length;
  if (!rows.length) {
    return;
  }

  rows.forEach((adjustment) => {
    const row = document.createElement("tr");
    const target = document.createElement("td");
    const targetLabel = document.createElement("code");
    targetLabel.className = `status-adjustment-target${adjustment.side === "opponent" ? " opponent" : ""}`;
    targetLabel.textContent = adjustment.target;
    target.appendChild(targetLabel);

    const scope = document.createElement("td");
    const scopeLabel = document.createElement("span");
    scopeLabel.className = `status-adjustment-scope${adjustment.side === "self" ? "" : " opponent"}`;
    scopeLabel.textContent = adjustment.side === "self" ? "自" : "他";
    scope.appendChild(scopeLabel);

    const source = document.createElement("td");
    source.className = "status-adjustment-source";
    source.textContent = adjustment.content;

    const details = document.createElement("td");
    const detailList = document.createElement("div");
    detailList.className = "status-adjustment-details";
    adjustment.details.forEach((detail) => {
      const line = document.createElement("div");
      line.className = "status-adjustment-detail";
      const sign = document.createElement("span");
      sign.className = `status-adjustment-sign ${detail.sign === "+" ? "positive" : "negative"}`;
      sign.textContent = detail.sign;
      const expression = detail.kind === "percent"
        ? `${formatNumber(detail.base, 1)}*${formatNumber(detail.amount, 1)}%`
        : formatNumber(detail.amount, 2);
      line.append(sign, document.createTextNode(expression));
      if (detail.suffix) {
        const suffix = document.createElement("span");
        suffix.className = "status-adjustment-suffix";
        suffix.textContent = detail.suffix;
        line.appendChild(suffix);
      }
      detailList.appendChild(line);
    });
    details.appendChild(detailList);
    row.append(target, scope, source, details);
    body.appendChild(row);
  });
}

function statusAdjustmentValueRows(stats, moveResults, adjustmentRows) {
  const grouped = new Map();
  const pokemon = selectedPokemon();
  const baseStats = pokemon ? pokemonStats(pokemon.name, number(el.levelRange.value, 15)) : null;
  const baseValues = {
    self: {
      Atk: stats.baseAttack,
      "Sp.Atk": stats.baseSpAttack,
      Def: number(baseStats && baseStats.defense, 0),
      "Sp.Def": number(baseStats && baseStats.sp_defense, 0)
    },
    opponent: {
      Def: Math.max(0, number(el.targetDefense.value, 0)),
      "Sp.Def": Math.max(0, number(el.targetSpDefense.value, 0))
    }
  };

  adjustmentRows.forEach((adjustment) => {
    const key = `${adjustment.target}\u0000${adjustment.side}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        target: adjustment.target,
        side: adjustment.side,
        order: adjustment.order,
        details: []
      });
    }
    grouped.get(key).details.push(...adjustment.details);
  });

  const effectiveDefenseValues = (target) => {
    const physical = target === "Def";
    return (moveResults || [])
      .filter((result) => (String(result.part.dmgType).trim() === "Atk") === physical)
      .flatMap((result) => result.effectiveDefenses || [])
      .filter(Number.isFinite);
  };

  return Array.from(grouped.values()).map((group) => {
    const before = number(baseValues[group.side] && baseValues[group.side][group.target], 0);
    let after = before;
    let afterText = "";
    let direction = "";
    const valueWithDelta = (value) => `${formatNumber(value, 1)}（${signedNumber(value - before, 1)}）`;

    if (group.side === "self" && group.target === "Atk") {
      after = stats.attack;
    } else if (group.side === "self" && group.target === "Sp.Atk") {
      after = stats.spAttack;
    } else if (group.side === "opponent" && (group.target === "Def" || group.target === "Sp.Def")) {
      const effectiveValues = effectiveDefenseValues(group.target);
      if (effectiveValues.length) {
        const minValue = Math.min(...effectiveValues);
        const maxValue = Math.max(...effectiveValues);
        after = minValue;
        afterText = Math.abs(minValue - maxValue) < 0.000001
          ? valueWithDelta(minValue)
          : `${formatNumber(minValue, 1)}〜${formatNumber(maxValue, 1)}（${signedNumber(minValue - before, 1)}〜${signedNumber(maxValue - before, 1)}）`;
        if (maxValue < before - 0.000001) direction = "decreased";
        else if (minValue > before + 0.000001) direction = "increased";
      } else {
        after = targetDefenseDetails(group.target === "Def" ? "Atk" : "SpAtk").effective;
      }
    } else {
      group.details.forEach((detail) => {
        const signedAmount = detail.sign === "-" ? -detail.amount : detail.amount;
        after += detail.kind === "percent"
          ? detail.base * signedAmount / 100
          : signedAmount;
      });
    }

    if (!direction) {
      if (after > before + 0.000001) direction = "increased";
      else if (after < before - 0.000001) direction = "decreased";
    }

    return {
      target: group.target,
      side: group.side,
      order: group.order,
      beforeText: formatNumber(before, 1),
      afterText: afterText || valueWithDelta(after),
      direction
    };
  }).sort((a, b) => a.order - b.order);
}

function renderStatusAdjustmentValueRows(rows, body = el.damageStatusValueBody) {
  body.innerHTML = "";
  if (!rows.length) {
    return;
  }

  rows.forEach((valueRow) => {
    const row = document.createElement("tr");
    const target = document.createElement("td");
    const targetLabel = document.createElement("code");
    targetLabel.className = `status-adjustment-target${valueRow.side === "opponent" ? " opponent" : ""}`;
    targetLabel.textContent = valueRow.target;
    target.appendChild(targetLabel);

    const scope = document.createElement("td");
    const scopeLabel = document.createElement("span");
    scopeLabel.className = `status-adjustment-scope${valueRow.side === "self" ? "" : " opponent"}`;
    scopeLabel.textContent = valueRow.side === "self" ? "自" : "他";
    scope.appendChild(scopeLabel);

    const before = document.createElement("td");
    before.textContent = valueRow.beforeText;

    const after = document.createElement("td");
    after.className = `status-value-after${valueRow.direction ? ` ${valueRow.direction}` : ""}`;
    after.textContent = valueRow.afterText;

    row.append(target, scope, before, after);
    body.appendChild(row);
  });
}

function supportStatusAdjustmentRows(mode, stats) {
  const shieldMode = mode === "shield";
  const itemRows = shieldMode ? selectedShieldItems() : selectedHealingItems();
  const effectTier = shieldMode ? shieldEffectTierFor : healingEffectTierFor;
  const rows = new Map();
  let rowOrder = 0;
  const targetOrder = { HP: 0, Atk: 1, "Sp.Atk": 2 };
  const attackPercentBase = stats.baseAttack + stats.attackFlat;
  const spAttackPercentBase = stats.baseSpAttack + stats.spAttackFlat;
  const ensureRow = (target, content) => {
    const key = `${target}\u0000${content}`;
    if (!rows.has(key)) {
      rows.set(key, {
        target,
        content,
        side: "self",
        order: rowOrder,
        details: new Map()
      });
      rowOrder += 1;
    }
    return rows.get(key);
  };
  const addDetail = (target, content, amount, kind = "number", base = 0) => {
    const numericAmount = number(amount, 0);
    if (Math.abs(numericAmount) < 0.000001) return;
    const sign = numericAmount < 0 ? "-" : "+";
    const normalizedBase = Math.abs(number(base, 0));
    const row = ensureRow(target, content);
    const key = `${kind}\u0000${sign}\u0000${normalizedBase}`;
    const current = row.details.get(key);
    if (current) {
      current.amount += Math.abs(numericAmount);
      return;
    }
    row.details.set(key, {
      kind,
      sign,
      amount: Math.abs(numericAmount),
      base: normalizedBase,
      suffix: ""
    });
  };
  const addNumber = (target, content, amount) => addDetail(target, content, amount);
  const addPercent = (target, content, percent, base) => addDetail(target, content, percent, "percent", base);

  itemRows.forEach(({ item, level: itemLevel }) => {
    const content = jpItemName(item);
    (item.stats || []).forEach((stat) => {
      const target = stat.label === "Attack"
        ? "Atk"
        : stat.label === "Sp. Attack"
          ? "Sp.Atk"
          : shieldMode && stat.label === "HP"
            ? "HP"
            : "";
      if (!target) return;
      const value = itemLevelValue(itemLevel, stat);
      const base = target === "Atk"
        ? attackPercentBase
        : target === "Sp.Atk"
          ? spAttackPercentBase
          : stats.baseHp;
      if (stat.percent) addPercent(target, content, value, base);
      else addNumber(target, content, value);
    });

    const prefix = shieldMode ? "shield" : "healing";
    if (item.name === "Attack Weight") {
      addNumber("Atk", content, conditionNumber(`${prefix}AttackWeightStacks`, 0, 6) * effectTier(item.name));
    }
    if (item.name === "Sp. Atk Specs") {
      addNumber("Sp.Atk", content, conditionNumber(`${prefix}SpAtkSpecsStacks`, 0, 6) * effectTier(item.name));
    }
    if (item.name === "Weakness Policy") {
      addPercent("Atk", content, conditionNumber(`${prefix}WeaknessPolicyStacks`, 0, 4) * effectTier(item.name), attackPercentBase);
    }
    if (item.name === "Accel Bracer") {
      addPercent("Atk", content, conditionNumber(`${prefix}AccelBracerStacks`, 0, 20) * effectTier(item.name), attackPercentBase);
    }
    if (item.name === "Drive Lens") {
      addPercent("Sp.Atk", content, conditionNumber(`${prefix}DriveLensStacks`, 0, 20) * effectTier(item.name), spAttackPercentBase);
    }
    if (item.name === "Wise Glasses") {
      addPercent("Sp.Atk", content, effectTier(item.name), spAttackPercentBase);
    }
  });

  addNumber("Atk", "手動補正", number(el[shieldMode ? "shieldManualAttack" : "healingManualAttack"].value, 0));
  addNumber("Sp.Atk", "手動補正", number(el[shieldMode ? "shieldManualSpAttack" : "healingManualSpAttack"].value, 0));
  if (shieldMode) {
    addNumber("HP", "手動補正", number(el.shieldManualHp.value, 0));
  }

  return Array.from(rows.values())
    .map((row) => ({ ...row, details: Array.from(row.details.values()) }))
    .sort((a, b) => targetOrder[a.target] - targetOrder[b.target] || a.order - b.order);
}

function supportStatusValueRows(stats, adjustmentRows) {
  const beforeValues = {
    HP: number(stats.baseHp, 0),
    Atk: number(stats.baseAttack, 0),
    "Sp.Atk": number(stats.baseSpAttack, 0)
  };
  const afterValues = {
    HP: number(stats.maxHp, beforeValues.HP),
    Atk: number(stats.attack, beforeValues.Atk),
    "Sp.Atk": number(stats.spAttack, beforeValues["Sp.Atk"])
  };
  const grouped = new Map();
  adjustmentRows.forEach((adjustment) => {
    if (!grouped.has(adjustment.target)) {
      grouped.set(adjustment.target, {
        target: adjustment.target,
        side: "self",
        order: adjustment.order
      });
    }
  });
  return Array.from(grouped.values()).map((group) => {
    const before = beforeValues[group.target];
    const after = afterValues[group.target];
    return {
      ...group,
      beforeText: formatNumber(before, 1),
      afterText: `${formatNumber(after, 1)}（${signedNumber(after - before, 1)}）`,
      direction: after > before + 0.000001
        ? "increased"
        : after < before - 0.000001
          ? "decreased"
          : ""
    };
  }).sort((a, b) => a.order - b.order);
}

function percentCorrectionTermsForTarget(terms, target) {
  return (terms || []).filter((term) => (
    !term.targets || term.targets.includes(target)
  ));
}

function percentCorrectionValues(terms, target) {
  return percentCorrectionTermsForTarget(terms, target).map((term) => number(term.percent, 0));
}

function percentCorrectionMultiplier(terms, target) {
  const totalPercent = percentCorrectionValues(terms, target)
    .reduce((sum, percent) => sum + percent, 0);
  return Math.max(0, 1 + totalPercent / 100);
}

function shieldAdjustmentRows(selfBaseShield, allyBaseShield, percentTerms, shieldFlat, count, fireSpinAttackTrigger) {
  const rows = new Map();
  const add = (content, formula, suffix = "") => {
    if (!formula) return;
    if (!rows.has(content)) rows.set(content, { content, details: [] });
    rows.get(content).details.push({ formula, suffix });
  };
  const percentFormula = (base, percent) => {
    const value = number(percent, 0);
    return value ? `${value < 0 ? "-" : "+"}${formatNumber(base, 1)}*${formatNumber(Math.abs(value), 1)}%` : "";
  };
  percentCorrectionTermsForTarget(percentTerms, "self").forEach((term) => {
    if (selfBaseShield > 0) add(term.label, percentFormula(selfBaseShield, term.percent), "（自分）");
  });
  percentCorrectionTermsForTarget(percentTerms, "ally").forEach((term) => {
    if (allyBaseShield > 0) add(term.label, percentFormula(allyBaseShield, term.percent), "（味方）");
  });
  if (shieldFlat) {
    const formula = `${shieldFlat < 0 ? "-" : "+"}${formatNumber(Math.abs(shieldFlat), 1)}`;
    if (selfBaseShield > 0) add("手動固定値", formula, "（自分・1回ごと）");
    if (allyBaseShield > 0) add("手動固定値", formula, "（味方・1回ごと）");
  }
  if (count > 1) {
    add(fireSpinAttackTrigger ? "シールド獲得回数" : "回数／対象数", `×${formatNumber(count, 0)}`);
  }
  return Array.from(rows.values());
}

function healingAdjustmentRows(basePerApplication, percentTerms, healingFlat, count) {
  const rows = new Map();
  const add = (content, formula, suffix = "") => {
    if (!formula) return;
    if (!rows.has(content)) rows.set(content, { content, details: [] });
    rows.get(content).details.push({ formula, suffix });
  };
  const percentFormula = (base, percent) => {
    const value = number(percent, 0);
    return value ? `${value < 0 ? "-" : "+"}${formatNumber(base, 1)}*${formatNumber(Math.abs(value), 1)}%` : "";
  };
  percentCorrectionTermsForTarget(percentTerms, "self").forEach((term) => {
    add(term.label, percentFormula(basePerApplication, term.percent), "（自分）");
  });
  percentCorrectionTermsForTarget(percentTerms, "ally").forEach((term) => {
    add(term.label, percentFormula(basePerApplication, term.percent), "（味方）");
  });
  if (healingFlat) {
    add(
      "手動固定値",
      `${healingFlat < 0 ? "-" : "+"}${formatNumber(Math.abs(healingFlat), 1)}`,
      "（各回復判定）"
    );
  }
  if (count > 1) {
    add("回数／対象数", `×${formatNumber(count, 0)}`);
  }
  return Array.from(rows.values());
}

function damageAdjustmentRows(stats, moveResults, extras, initialYveltalMarks, percentTerms) {
  const rows = new Map();
  const addFormula = (content, formula, suffix = "", value = 0) => {
    if (!formula) return;
    if (!rows.has(content)) rows.set(content, { content, details: [] });
    rows.get(content).details.push({ formula, suffix, value: number(value, 0) });
  };
  const signedPercentFormula = (base, percent) => {
    const value = number(percent, 0);
    if (Math.abs(value) < 0.000001) return "";
    return `${value < 0 ? "-" : "+"}${formatNumber(base, 1)}*${formatNumber(Math.abs(value), 1)}%`;
  };

  const beforeCritical = (moveResults || []).reduce(
    (sum, result) => sum + result.perHitBase * result.hitCount,
    0
  );
  if (el.criticalHit.checked && beforeCritical > 0) {
    addFormula("急所", signedPercentFormula(beforeCritical, 100), "", beforeCritical);
    selectedItems().forEach(({ item, level: itemLevel }) => {
      const criticalDamageBonus = (item.stats || [])
        .filter((stat) => stat.label === "Critical-Hit Damage Modifier")
        .reduce((sum, stat) => sum + itemLevelValue(itemLevel, stat), 0);
      if (criticalDamageBonus) {
        addFormula(
          jpItemName(item),
          signedPercentFormula(beforeCritical, criticalDamageBonus),
          "",
          beforeCritical * criticalDamageBonus / 100
        );
      }
    });
  }

  const beforeYveltal = (moveResults || []).reduce(
    (sum, result) => sum + result.perHitAfterCrit * result.hitCount,
    0
  ) + extras.reduce((sum, entry) => sum + entry.raw, 0);
  const afterYveltal = (moveResults || []).reduce(
    (sum, result) => sum + result.totalAfterCrit,
    0
  ) + extras.reduce((sum, entry) => (
    sum + applyYveltalDarkAuraDamage(entry.raw, initialYveltalMarks)
  ), 0);
  const yveltalDelta = afterYveltal - beforeYveltal;
  if (yveltalDelta && beforeYveltal > 0) {
    const equivalentPercent = yveltalDelta / beforeYveltal * 100;
    addFormula(
      "ダークオーラ",
      signedPercentFormula(beforeYveltal, equivalentPercent),
      "（各ヒットのはかいカウンタ数を反映）",
      yveltalDelta
    );
  }

  (moveResults || []).forEach((result) => {
    if (result.targetHpComponent > 0) {
      const basisLabel = result.part.targetHpBasis === "max"
        ? "相手の最大HP"
        : result.part.targetHpBasis === "missing"
          ? "相手の減少HP"
          : "相手の残りHP";
      addFormula(
        "相手HP割合ダメージ",
        `${jpMoveLabel(result.part.label)}: ${formatNumber(result.targetHpBaseValue, 0)}*${formatNumber(result.targetHpEffectiveRatio, 1)}%`,
        `（${basisLabel}基準）`,
        result.targetHpComponent * Math.max(1, number(result.hitCount, 1))
      );
    }

    const damageScale = Math.max(0, number(result.damageScale, 1));
    if (Math.abs(damageScale - 1) < 0.000001) return;
    const hitCount = Math.max(1, number(result.hitCount, 1));
    const perHitFormula = `${formatNumber(result.formulaBase, 1)}*${formatNumber(damageScale * 100, 1)}%`;
    const total = result.perHitBase * hitCount;
    addFormula(
      "技固有ダメージ補正",
      `${jpMoveLabel(result.part.label)}: ${perHitFormula}${hitCount > 1 ? `*${formatNumber(hitCount, 0)}ヒット` : ""}=${formatNumber(total, 0)}`,
      "",
      (result.perHitBase - result.formulaBase) * hitCount
    );
  });

  extras.forEach((entry) => addFormula(
    entry.name,
    entry.formula || `${entry.raw < 0 ? "-" : "+"}${formatNumber(Math.abs(entry.raw), 1)}`,
    "",
    entry.raw
  ));

  const multiplierBase = afterYveltal;
  (percentTerms || []).forEach((term) => {
    addFormula(
      term.label,
      signedPercentFormula(multiplierBase, term.percent),
      term.suffix || "",
      multiplierBase * number(term.percent, 0) / 100
    );
  });

  return Array.from(rows.values());
}

function appendDamageAdjustmentFormula(element, formula) {
  String(formula || "").split(/([+-])/).forEach((token) => {
    if (token !== "+" && token !== "-") {
      element.appendChild(document.createTextNode(token));
      return;
    }
    const sign = document.createElement("span");
    sign.className = `status-adjustment-sign ${token === "+" ? "positive" : "negative"}`;
    sign.textContent = token;
    element.appendChild(sign);
  });
}

function renderDamageAdjustmentRows(rows, body = el.damageAdjustmentBody) {
  body.innerHTML = "";
  const card = body.closest(".panel");
  const showsAdjustmentValue = Boolean(body.closest(".damage-adjustment-value-table"));
  if (card) card.hidden = !rows.length;
  if (!rows.length) {
    return;
  }

  rows.forEach((adjustment) => {
    const row = document.createElement("tr");
    const source = document.createElement("td");
    source.className = "damage-adjustment-source";
    source.textContent = adjustment.content;

    const detail = document.createElement("td");
    const formulas = document.createElement("div");
    formulas.className = "damage-adjustment-formulas";
    adjustment.details.forEach((entry) => {
      const formula = document.createElement("div");
      formula.className = "damage-adjustment-formula";
      appendDamageAdjustmentFormula(formula, entry.formula);
      if (entry.suffix) {
        const suffix = document.createElement("span");
        suffix.className = "status-adjustment-suffix";
        suffix.textContent = entry.suffix;
        formula.appendChild(suffix);
      }
      formulas.appendChild(formula);
    });
    detail.appendChild(formulas);

    row.append(source, detail);
    if (showsAdjustmentValue) {
      const valueCell = document.createElement("td");
      valueCell.className = "damage-adjustment-value-cell";
      const value = adjustment.details.reduce(
        (sum, entry) => sum + number(entry.value, 0),
        0
      );
      const valueLabel = document.createElement("span");
      valueLabel.className = `damage-adjustment-value${value > 0 ? " positive" : value < 0 ? " negative" : ""}`;
      valueLabel.textContent = signedNumber(value, 2);
      valueCell.appendChild(valueLabel);
      row.appendChild(valueCell);
    }
    body.appendChild(row);
  });
}

function createDefenseSequenceState() {
  const pokemonName = selectedPokemon()?.name || "";
  const moveName = selectedMoveChoice()?.displayName || "";
  const effects = [];
  const add = (effectId, key, perStack, maxStacks, appliesTo = "") => {
    const initial = currentDefenseEffectStacks(effectId);
    effects.push({ effectId, key, perStack, maxStacks, initial, current: initial, appliesTo });
  };

  if (pokemonName === "Sylveon" && moveName === "Hyper Voice") add("hyper-voice", "spDefenseReductionPercent", 20, 4, "SpAtk");
  if (pokemonName === "Gardevoir" && moveName === "Psychic") add("psychic", "spDefenseReductionPercent", 20, 3, "SpAtk");
  if (pokemonName === "Mr.Mime" && moveName === "Psychic") add("psychic", "spDefenseReductionPercent", 5, 8, "SpAtk");
  if (pokemonName === "Venusaur" && moveName === "Sludge Bomb") add("sludge-bomb", "spDefenseReductionPercent", 50, 1, "SpAtk");
  if (pokemonName === "Chandelure") add("infiltrator", "spDefenseIgnorePercent", 5, 6, "SpAtk");
  if (pokemonName === "Raichu" && moveName === "Stored Power" && number(el.levelRange.value, 15) >= 11) add("stored-power", "spDefenseReductionPercent", 10, 3, "SpAtk");
  return effects;
}

function sequenceDefenseModifiers(sequenceState) {
  const modifiers = emptyDefenseModifiers();
  sequenceState.forEach((effect) => {
    modifiers[effect.key] += Math.max(0, effect.current - effect.initial) * effect.perStack;
  });
  return modifiers;
}

function advanceDefenseSequence(sequenceState, dmgType) {
  sequenceState.forEach((effect) => {
    if (effect.appliesTo && String(dmgType).trim() !== effect.appliesTo) return;
    effect.current = Math.min(effect.maxStacks, effect.current + 1);
  });
}

function targetDefenseDetails(type, additionalModifiers = null) {
  const isPhysical = String(type).trim() === "Atk";
  const base = isPhysical ? number(el.targetDefense.value, 0) : number(el.targetSpDefense.value, 0);
  const modifiers = addDefenseModifiers(activeDefenseModifiers(), additionalModifiers || emptyDefenseModifiers());
  const reductionPercent = Math.min(100, Math.max(0, isPhysical ? modifiers.defenseReductionPercent : modifiers.spDefenseReductionPercent));
  const reductionFlat = Math.max(0, isPhysical ? modifiers.defenseReductionFlat : modifiers.spDefenseReductionFlat);
  const ignorePercent = Math.min(100, Math.max(0, isPhysical ? modifiers.defenseIgnorePercent : modifiers.spDefenseIgnorePercent));
  const penetrationFlat = Math.max(0, isPhysical ? modifiers.defensePenetrationFlat : modifiers.spDefensePenetrationFlat);
  const afterReduction = (base - reductionFlat) * (1 - reductionPercent / 100);
  const afterPenetration = afterReduction - penetrationFlat;
  const effective = Math.max(-599, afterPenetration * (1 - ignorePercent / 100));
  return { base, effective, reductionPercent, reductionFlat, ignorePercent, penetrationFlat, modifiers };
}

function targetDefenseFor(type, additionalModifiers = null) {
  return targetDefenseDetails(type, additionalModifiers).effective;
}

function reduceByDefense(raw, type, additionalModifiers = null) {
  const defense = targetDefenseFor(type, additionalModifiers);
  return Math.floor(raw * 600 / (600 + defense));
}

const FALINKS_DAMAGE_TARGETS = {
  brass: {
    label: "ヘイチョウ",
    multiplier: 0.9,
    formula: "90%"
  },
  trooper: {
    label: "ヘイ",
    multiplier: 0.1,
    formula: "10%"
  },
  total: {
    label: "合計",
    multiplier: 1.1,
    formula: "110%（上限）"
  }
};

function selectedFalinksDamageTarget() {
  if (el.targetSelect.value !== "Falinks") return null;
  return FALINKS_DAMAGE_TARGETS[el.targetFalinksDamageTarget.value]
    || FALINKS_DAMAGE_TARGETS.total;
}

function applyFalinksDamageTarget(damage) {
  const target = selectedFalinksDamageTarget();
  if (!target) return damage;
  return Math.floor(damage * target.multiplier);
}

function falinksDamageFormula(expression) {
  const target = selectedFalinksDamageTarget();
  return target ? `(${expression}) × ${target.formula}` : expression;
}

function syncFalinksDamageControl() {
  const isFalinks = el.targetSelect.value === "Falinks";
  el.targetFalinksDamageRow.hidden = !isFalinks;
  el.targetFalinksDamageTarget.disabled = !isFalinks;
}

function selectedTargetMaxHp() {
  const targetName = el.targetSelect.value;
  const level = number(el.targetLevelRange.value, 15);
  const stats = targetName ? pokemonStats(targetName, level) : null;
  return Math.max(0, number(stats && stats.hp, 0));
}

function targetHpState(mode = el.targetHpMode.value) {
  const maxHp = selectedTargetMaxHp();
  const inputValue = Math.max(0, number(el.targetHpValue.value, mode === "percent" ? 100 : maxHp));
  const remainingHp = mode === "percent"
    ? maxHp * clamp(inputValue, 0, 100) / 100
    : maxHp > 0
      ? clamp(inputValue, 0, maxHp)
      : inputValue;
  const remainingPercent = maxHp > 0 ? remainingHp / maxHp * 100 : 0;
  return {
    maxHp,
    remainingHp,
    missingHp: Math.max(0, maxHp - remainingHp),
    remainingPercent
  };
}

function targetHpBasisValue(targetHp, basis) {
  if (basis === "max") return targetHp.maxHp;
  if (basis === "missing") return targetHp.missingHp;
  return targetHp.remainingHp;
}

function syncTargetHpControl() {
  const mode = el.targetHpMode.value;
  const maxHp = selectedTargetMaxHp();
  if (mode === "value" && maxHp > 0 && number(el.targetHpValue.value, 0) > maxHp) {
    el.targetHpValue.value = String(Math.round(maxHp));
  }
  const targetHp = targetHpState(mode);
  if (mode === "percent") {
    el.targetHpValue.max = "100";
  } else if (targetHp.maxHp > 0) {
    el.targetHpValue.max = String(targetHp.maxHp);
  } else {
    el.targetHpValue.removeAttribute("max");
  }
  el.targetHpValue.step = mode === "percent" ? "1" : "1";
  el.targetHpValue.setAttribute("aria-label", mode === "percent" ? "相手の残りHP割合" : "相手の残りHP数値");
  el.targetHpSummary.textContent = targetHp.maxHp > 0
    ? `最大HP ${formatNumber(targetHp.maxHp, 0)} / 残りHP ${formatNumber(targetHp.remainingHp, 0)}（${formatNumber(targetHp.remainingPercent, 1)}%） / 減少HP ${formatNumber(targetHp.missingHp, 0)}`
    : `残りHP ${formatNumber(targetHp.remainingHp, 0)}（相手ポケモン未選択）`;
}

function changeTargetHpMode() {
  const previousMode = state.targetHpMode || "percent";
  const previous = targetHpState(previousMode);
  const nextMode = el.targetHpMode.value;
  state.targetHpMode = nextMode;
  el.targetHpValue.value = nextMode === "percent"
    ? String(Math.round(previous.remainingPercent * 10) / 10)
    : String(Math.round(previous.remainingHp));
  syncTargetHpControl();
  updateAll();
}

function syncTargetStats() {
  if (state.suppressTargetAutoFill) return;
  const targetName = el.targetSelect.value;
  const level = number(el.targetLevelRange.value, 15);
  const stats = targetName ? pokemonStats(targetName, level) : null;
  el.targetDefense.value = stats ? stats.defense : 0;
  el.targetSpDefense.value = stats ? stats.sp_defense : 0;
  syncTargetHpControl();
}

function updateShieldAll() {
  if (!el.shieldPokemonSelect) return;
  updateShieldConditionVisibility();
  el.shieldLevelValue.textContent = el.shieldLevelRange.value;

  const choice = selectedShieldMoveChoice();
  const parts = selectedShieldParts(choice);
  const level = number(el.shieldLevelRange.value, 15);
  const stats = computeShieldStats();
  const fireSpinAttackTrigger = parts.some((part) => part.conditionalSource === "fire-spin");
  const maxCount = fireSpinAttackTrigger ? 6 : 20;
  el.shieldCount.max = String(maxCount);
  el.shieldCount.disabled = fireSpinAttackTrigger;
  el.shieldCountLabel.textContent = fireSpinAttackTrigger ? "シールド獲得回数（自動）" : "回数/対象数";
  el.shieldCount.value = fireSpinAttackTrigger
    ? "6"
    : String(clamp(number(el.shieldCount.value, 1), 1, maxCount));
  const count = number(el.shieldCount.value, 1);
  const hasRescueHood = hasShieldItem("Rescue Hood");
  const rescueHoodPercent = hasRescueHood
    ? shieldEffectTierFor("Rescue Hood")
    : 0;
  const manualShieldPercent = number(el.manualShieldPercent.value, 0);
  const shieldPercentTerms = [
    {
      label: "手動シールド補正",
      percent: manualShieldPercent,
      targets: ["self", "ally"]
    },
    {
      label: jpItemName("Rescue Hood"),
      percent: rescueHoodPercent,
      targets: ["ally"]
    }
  ].filter((term) => Math.abs(term.percent) >= 0.000001);
  const selfShieldMultiplier = percentCorrectionMultiplier(shieldPercentTerms, "self");
  const allyShieldMultiplier = percentCorrectionMultiplier(shieldPercentTerms, "ally");
  const shieldFlat = number(el.manualShieldFlat.value, 0);

  if (!choice || !parts.length) {
    const targetEntries = choice?.entries || [];
    const showsSelfResult = !choice || targetEntries.some((part) => part.targetScope !== "ally");
    const showsAllyResult = !choice || targetEntries.some((part) => part.targetScope !== "self");
    el.shieldSelfResultCard.hidden = !showsSelfResult;
    el.shieldAllyResultCard.hidden = !showsAllyResult;
    el.shieldTargetTotalGrid.classList.toggle("single-target", showsSelfResult !== showsAllyResult);
    el.shieldSelfAmount.textContent = "0";
    renderCalculationFormula(el.shieldSelfFormula, "現在のレベルで計算できるシールド式なし");
    el.shieldAllyAmount.textContent = "0";
    renderCalculationFormula(el.shieldAllyFormula, "現在のレベルで計算できるシールド式なし");
    el.shieldLearnChipRow.innerHTML = "";
    const statusRows = supportStatusAdjustmentRows("shield", stats);
    renderStatusAdjustmentRows(statusRows, el.shieldStatusBody);
    renderStatusAdjustmentValueRows(supportStatusValueRows(stats, statusRows), el.shieldStatusValueBody);
    renderDamageAdjustmentRows([], el.shieldAdjustmentBody);
    return;
  }

  const results = parts.map((part) => {
    const maxHpBased = part.sourceType === "maxHp" || String(part.dmgType).trim() === "MaxHP";
    const typeLabel = maxHpBased ? "最大HP" : jpDamageType(part.dmgType);
    const moveStat = maxHpBased ? stats.maxHp : String(part.dmgType).trim() === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    const levelComponent = part.slider * (level - 1);
    const baseComponent = part.base;
    const value = Math.max(0, Math.floor(statComponent + levelComponent + baseComponent));
    return {
      part,
      typeLabel,
      moveStat,
      statComponent,
      levelComponent,
      baseComponent,
      value
    };
  });

  const selfBaseShield = results
    .filter((result) => result.part.targetScope !== "ally")
    .reduce((sum, result) => sum + result.value, 0);
  const allyBaseShield = results
    .filter((result) => result.part.targetScope !== "self")
    .reduce((sum, result) => sum + result.value, 0);
  const selfPerApplication = selfBaseShield > 0
    ? Math.max(0, Math.floor(selfBaseShield * selfShieldMultiplier + shieldFlat))
    : 0;
  const allyPerApplication = allyBaseShield > 0
    ? Math.max(0, Math.floor(allyBaseShield * allyShieldMultiplier + shieldFlat))
    : 0;
  const selfTotalShield = selfPerApplication * count;
  const allyTotalShield = allyPerApplication * count;
  const moveTitle = `${choice.slotLabel}${choice.displayName ? ` - ${jpMoveName(choice.displayName)}` : ""}`;
  const selfFormulaResults = results.filter((result) => result.part.targetScope !== "ally");
  const allyFormulaResults = results.filter((result) => result.part.targetScope !== "self");
  const showsSelfResult = selfFormulaResults.length > 0;
  const showsAllyResult = allyFormulaResults.length > 0;
  el.shieldSelfResultCard.hidden = !showsSelfResult;
  el.shieldAllyResultCard.hidden = !showsAllyResult;
  el.shieldTargetTotalGrid.classList.toggle("single-target", showsSelfResult !== showsAllyResult);

  const shieldSelfFormula = selfFormulaResults.length
    ? applyPostCalculationFormula(
      sumFormulaExpressions(selfFormulaResults, level),
      percentCorrectionValues(shieldPercentTerms, "self"),
      shieldFlat,
      count
    )
    : "この技は自分にシールドを付与しません";
  const shieldAllyFormula = allyFormulaResults.length
    ? applyPostCalculationFormula(
      sumFormulaExpressions(allyFormulaResults, level),
      percentCorrectionValues(shieldPercentTerms, "ally"),
      shieldFlat,
      count
    )
    : "この技は味方にシールドを付与しません";
  renderCalculationFormula(el.shieldSelfFormula, shieldSelfFormula);
  renderCalculationFormula(el.shieldAllyFormula, shieldAllyFormula);

  el.shieldSelfAmount.textContent = selfTotalShield;
  el.shieldAllyAmount.textContent = allyTotalShield;

  el.shieldLearnChipRow.innerHTML = "";
  const learnChip = document.createElement("span");
  learnChip.className = level >= choice.minLevel ? "chip good" : "chip warn";
  learnChip.textContent = level >= choice.minLevel ? `使用可能: Lv${choice.minLevel}以降` : `未習得: Lv${choice.minLevel}以降`;
  el.shieldLearnChipRow.appendChild(learnChip);
  const typeChip = document.createElement("span");
  typeChip.className = "chip";
  typeChip.style.marginLeft = "8px";
  typeChip.textContent = `${moveTitle} / 自分・味方を個別計算`;
  el.shieldLearnChipRow.appendChild(typeChip);

  const statusRows = supportStatusAdjustmentRows("shield", stats);
  renderStatusAdjustmentRows(statusRows, el.shieldStatusBody);
  renderStatusAdjustmentValueRows(supportStatusValueRows(stats, statusRows), el.shieldStatusValueBody);
  renderDamageAdjustmentRows(
    shieldAdjustmentRows(selfBaseShield, allyBaseShield, shieldPercentTerms, shieldFlat, count, fireSpinAttackTrigger),
    el.shieldAdjustmentBody
  );
}

function updateHealingAll() {
  if (!el.healingPokemonSelect) return;
  updateHealingConditionVisibility();
  el.healingLevelValue.textContent = el.healingLevelRange.value;

  const choice = selectedHealingMoveChoice();
  const parts = selectedHealingParts(choice);
  const level = number(el.healingLevelRange.value, 15);
  const stats = computeHealingStats();
  const manualCount = clamp(number(el.healingCount.value, 1), 1, 48);
  const bigRootPercent = hasHealingItem("Big Root") ? healingEffectTierFor("Big Root") : 0;
  const rescueHoodPercent = hasHealingItem("Rescue Hood") ? healingEffectTierFor("Rescue Hood") : 0;
  const manualPercent = number(el.manualHealingPercent.value, 0);
  const healingPercentTerms = [
    {
      label: jpItemName("Big Root"),
      percent: bigRootPercent,
      targets: ["self"]
    },
    {
      label: jpItemName("Rescue Hood"),
      percent: rescueHoodPercent,
      targets: ["ally"]
    },
    {
      label: "手動回復補正",
      percent: manualPercent,
      targets: ["self", "ally"]
    }
  ].filter((term) => Math.abs(term.percent) >= 0.000001);
  const selfHealingMultiplier = percentCorrectionMultiplier(healingPercentTerms, "self");
  const allyHealingMultiplier = percentCorrectionMultiplier(healingPercentTerms, "ally");
  const healingFlat = number(el.manualHealingFlat.value, 0);

  if (!choice || !parts.length) {
    el.healingSelfAmount.textContent = "0";
    renderCalculationFormula(el.healingSelfFormula, "現在のレベルで計算できる回復式なし");
    el.healingAllyAmount.textContent = "0";
    renderCalculationFormula(el.healingAllyFormula, "現在のレベルで計算できる回復式なし");
    el.healingLearnChipRow.innerHTML = "";
    const statusRows = supportStatusAdjustmentRows("healing", stats);
    renderStatusAdjustmentRows(statusRows, el.healingStatusBody);
    renderStatusAdjustmentValueRows(supportStatusValueRows(stats, statusRows), el.healingStatusValueBody);
    renderDamageAdjustmentRows([], el.healingAdjustmentBody);
    return;
  }

  const results = parts.map((part) => {
    const typeLabel = jpDamageType(part.dmgType);
    const moveStat = String(part.dmgType).trim() === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    const levelComponent = part.slider * (level - 1);
    const baseComponent = part.base;
    const baseValue = Math.max(0, Math.floor(statComponent + levelComponent + baseComponent));
    const hitInfo = inferHealingHitInfo(part, level);
    return {
      part,
      typeLabel,
      moveStat,
      statComponent,
      levelComponent,
      baseComponent,
      baseValue,
      hitCount: hitInfo.count,
      hitNote: hitInfo.note
    };
  });

  const calculateTargetHealing = (multiplier) => {
    const targetResults = results.map((result) => {
      const adjustedValue = Math.max(0, Math.floor(result.baseValue * multiplier + healingFlat));
      return {
        ...result,
        adjustedValue,
        total: adjustedValue * result.hitCount
      };
    });
    const perApplication = targetResults.reduce((sum, result) => sum + result.total, 0);
    return {
      results: targetResults,
      perApplication,
      total: perApplication * manualCount
    };
  };
  const selfHealing = calculateTargetHealing(selfHealingMultiplier);
  const allyHealing = calculateTargetHealing(allyHealingMultiplier);
  const basePerApplication = results.reduce((sum, result) => sum + result.baseValue * result.hitCount, 0);
  const moveTitle = `${choice.slotLabel}${choice.displayName ? ` - ${jpMoveName(choice.displayName)}` : ""}`;
  const healingFormulaForTarget = (percentCorrections) => {
    const perApplicationExpressions = results.map((result) => {
      return applyPostCalculationFormula(
        rsbFormulaExpression(result, level),
        percentCorrections,
        healingFlat,
        result.hitCount,
        "ヒット"
      );
    });
    const perApplicationFormula = perApplicationExpressions.length === 1
      ? perApplicationExpressions[0]
      : perApplicationExpressions.map((expression) => `(${expression})`).join(" + ");
    return manualCount > 1
      ? `(${perApplicationFormula}) × ${formatNumber(manualCount, 0)}回/対象`
      : perApplicationFormula;
  };

  renderCalculationFormula(
    el.healingSelfFormula,
    healingFormulaForTarget(percentCorrectionValues(healingPercentTerms, "self"))
  );
  renderCalculationFormula(
    el.healingAllyFormula,
    healingFormulaForTarget(percentCorrectionValues(healingPercentTerms, "ally"))
  );

  el.healingSelfAmount.textContent = selfHealing.total;
  el.healingAllyAmount.textContent = allyHealing.total;

  el.healingLearnChipRow.innerHTML = "";
  const learnChip = document.createElement("span");
  learnChip.className = level >= choice.minLevel ? "chip good" : "chip warn";
  learnChip.textContent = level >= choice.minLevel ? `使用可能: Lv${choice.minLevel}以降` : `未習得: Lv${choice.minLevel}以降`;
  el.healingLearnChipRow.appendChild(learnChip);
  const typeChip = document.createElement("span");
  typeChip.className = "chip";
  typeChip.style.marginLeft = "8px";
  typeChip.textContent = `${moveTitle} / 自分・味方を個別計算`;
  el.healingLearnChipRow.appendChild(typeChip);

  const statusRows = supportStatusAdjustmentRows("healing", stats);
  renderStatusAdjustmentRows(statusRows, el.healingStatusBody);
  renderStatusAdjustmentValueRows(supportStatusValueRows(stats, statusRows), el.healingStatusValueBody);
  renderDamageAdjustmentRows(
    healingAdjustmentRows(basePerApplication, healingPercentTerms, healingFlat, manualCount),
    el.healingAdjustmentBody
  );
}

function updateAll() {
  updateConditionVisibility();
  el.levelValue.textContent = el.levelRange.value;
  el.targetLevelValue.textContent = el.targetLevelRange.value;
  syncFalinksDamageControl();
  syncTargetHpControl();

  const move = selectedMove();
  const level = number(el.levelRange.value, 15);
  const stats = computeAttackerStats();
  const targetHp = targetHpState();

  if (!el.conditionSnorlaxFlailHp.hidden) {
    el.snorlaxFlailMaxHpNote.textContent = `計算に使用する最大HP: ${formatNumber(stats.maxHp, 0)}`;
  }
  renderEmblemSummary(stats.emblem);

  if (!move) {
    el.rawDamage.textContent = "0";
    el.finalDamage.textContent = "0";
    renderCalculationFormula(el.rawDamageFormula, "計算できる技がありません");
    renderCalculationFormula(el.finalDamageFormula, "計算できる技がありません");
    renderStatusAdjustmentRows([]);
    renderStatusAdjustmentValueRows([]);
    renderDamageAdjustmentRows([]);
    return;
  }

  const extras = computeExtraDamages(stats);
  const damageMultiplierTerms = [];
  const addDamageMultiplierTerm = (label, percent, suffix = "") => {
    const value = number(percent, 0);
    if (Math.abs(value) < 0.000001) return;
    damageMultiplierTerms.push({ label, percent: value, suffix });
  };
  addDamageMultiplierTerm("手動ダメージ補正", number(el.manualDamagePercent.value, 0));

  if (hasItem("Energy Amplifier") && el.energyAmpProc.checked) {
    addDamageMultiplierTerm(jpItemName("Energy Amplifier"), effectTierFor("Energy Amplifier"));
  }
  if (el.groudonBuff.checked) {
    addDamageMultiplierTerm("グラードン", 50);
  }
  if (el.rayquazaBuff.checked) {
    addDamageMultiplierTerm("レックウザ", 40, "（シールド中）");
  }
  const damageMultiplier = percentCorrectionMultiplier(damageMultiplierTerms);

  const yveltalDamageActive = selectedPokemon()?.name === "Yveltal";
  const initialYveltalMarks = yveltalDamageActive
    ? conditionNumber("yveltalMarkStacks", 0, YVELTAL_DARK_AURA.maxStacks)
    : 0;
  const yveltalAppliesMarks = yveltalDarkAuraAppliesMarks(selectedPokemon(), move.slotKey);
  let yveltalMarks = initialYveltalMarks;
  const defenseSequenceState = createDefenseSequenceState();

  const moveResults = move.parts.map((part) => {
    const typeLabel = jpDamageType(part.dmgType);
    const moveStat = String(part.dmgType).trim() === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    const levelComponent = part.slider * (level - 1);
    const baseComponent = part.base;
    const maxHpRatio = Math.max(0, number(part.maxHpRatio, 0));
    const maxHpComponent = Math.floor(maxHpRatio * stats.maxHp / 100);
    const targetHpRatio = Math.max(0, number(part.targetHpRatio, 0));
    const targetHpConditionMet = !number(part.targetHpMaxRemainingPercent, 0)
      || targetHp.remainingPercent <= number(part.targetHpMaxRemainingPercent, 0);
    const targetHpEffectiveRatio = targetHpConditionMet
      ? targetHpRatio * (part.targetHpLevelScale ? Math.max(0, level - 1) : 1)
      : 0;
    const targetHpBaseValue = targetHpBasisValue(targetHp, part.targetHpBasis);
    const targetHpComponent = Math.floor(targetHpEffectiveRatio * targetHpBaseValue / 100);
    const hitCount = Math.max(1, number(part.hitCount, 1));
    const formulaBase = Math.max(0, Math.floor(statComponent + levelComponent + baseComponent + maxHpComponent + targetHpComponent));
    const damageScale = Math.max(0, number(part.damageScale, 1));
    const perHitBase = Math.max(0, Math.floor(formulaBase * damageScale));
    const perHitAfterCrit = el.criticalHit.checked ? Math.floor(perHitBase * stats.critDamageMultiplier) : perHitBase;
    const yveltalHitDamages = [];
    const yveltalMarksPerHit = [];
    let totalAfterCrit = 0;
    let totalRaw = 0;
    let totalReduced = 0;
    let perHitAfterMultiplier = 0;
    const defenseDetails = [];
    const effectiveDefenses = [];
    const reducedHitDamages = [];

    for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
      yveltalMarksPerHit.push(yveltalMarks);
      const afterMark = yveltalDamageActive
        ? applyYveltalDarkAuraDamage(perHitAfterCrit, yveltalMarks)
        : perHitAfterCrit;
      const afterMultiplier = Math.max(0, Math.floor(afterMark * damageMultiplier));
      if (hitIndex === 0) perHitAfterMultiplier = afterMultiplier;
      yveltalHitDamages.push(afterMark);
      totalAfterCrit += afterMark;
      totalRaw += afterMultiplier;
      const hitDefenseModifiers = addDefenseModifiers(intrinsicDefenseModifiers(part), sequenceDefenseModifiers(defenseSequenceState));
      const hitDefense = targetDefenseDetails(part.dmgType, hitDefenseModifiers);
      defenseDetails.push(hitDefense);
      effectiveDefenses.push(hitDefense.effective);
      const reducedHitDamage = part.bypassDefense
        ? afterMultiplier
        : Math.floor(afterMultiplier * 600 / (600 + hitDefense.effective));
      const targetAdjustedHitDamage = applyFalinksDamageTarget(reducedHitDamage);
      reducedHitDamages.push(targetAdjustedHitDamage);
      totalReduced += targetAdjustedHitDamage;
      if (yveltalAppliesMarks) yveltalMarks = Math.min(YVELTAL_DARK_AURA.maxStacks, yveltalMarks + 1);
      advanceDefenseSequence(defenseSequenceState, part.dmgType);
    }

    return {
      part,
      typeLabel,
      moveStat,
      statComponent,
      levelComponent,
      baseComponent,
      maxHpRatio,
      maxHpComponent,
      targetHpRatio,
      targetHpConditionMet,
      targetHpEffectiveRatio,
      targetHpBaseValue,
      targetHpComponent,
      formulaBase,
      damageScale,
      hitCount,
      perHitBase,
      perHitAfterCrit,
      perHitAfterMultiplier,
      yveltalHitDamages,
      yveltalMarksPerHit,
      totalAfterCrit,
      totalRaw,
      totalReduced,
      defenseDetails,
      effectiveDefenses,
      reducedHitDamages
    };
  });

  const moveRaw = moveResults.reduce((sum, result) => sum + result.totalRaw, 0);
  const moveReduced = moveResults.reduce((sum, result) => sum + result.totalReduced, 0);
  const extrasRaw = extras.reduce((sum, entry) => {
    const afterMark = yveltalDamageActive
      ? applyYveltalDarkAuraDamage(entry.raw, initialYveltalMarks)
      : entry.raw;
    return sum + Math.floor(afterMark * damageMultiplier);
  }, 0);
  const totalRaw = Math.max(0, moveRaw + extrasRaw);

  const extrasReduced = extras.reduce((sum, entry) => {
    const afterMark = yveltalDamageActive
      ? applyYveltalDarkAuraDamage(entry.raw, initialYveltalMarks)
      : entry.raw;
    return sum + applyFalinksDamageTarget(reduceByDefense(
      Math.floor(afterMark * damageMultiplier),
      entry.type
    ));
  }, 0);
  const totalReduced = Math.max(0, moveReduced + extrasReduced);
  const damagePercentCorrections = percentCorrectionValues(damageMultiplierTerms);
  const baseDamageFormulaForResult = (result) => {
    const hasStandardFormula = Math.abs(number(result.part.ratio, 0))
      + Math.abs(number(result.part.slider, 0))
      + Math.abs(number(result.part.base, 0)) > 0;
    const terms = [];
    if (hasStandardFormula) terms.push(rsbFormulaExpression(result, level));
    if (result.maxHpRatio) {
      terms.push(`${formulaVariableValue(stats.maxHp, "hp", 0)} × ${formatNumber(result.maxHpRatio, 1)}%`);
    }
    if (result.targetHpRatio && result.targetHpConditionMet) {
      const targetHpKey = result.part.targetHpBasis === "max"
        ? "targetmaxhp"
        : result.part.targetHpBasis === "missing"
          ? "targetmissinghp"
          : "targethp";
      const ratioExpression = result.part.targetHpLevelScale
        ? `${formatNumber(result.targetHpRatio, 1)}% × (${formulaVariableValue(level, "lv", 0)} - 1)`
        : `${formatNumber(result.targetHpEffectiveRatio, 1)}%`;
      terms.push(`${formulaVariableValue(result.targetHpBaseValue, targetHpKey, 0)} × ${ratioExpression}`);
    }
    let expression = terms.join(" + ") || "0";
    if (result.damageScale !== 1) {
      expression = `(${expression}) × ${formatNumber(result.damageScale * 100, 1)}%`;
    }
    if (el.criticalHit.checked) {
      expression = `(${expression}) × ${formatNumber(stats.critDamageMultiplier * 100, 1)}%`;
    }
    return expression;
  };
  const moveHitFormula = (result, hitIndex, includeDefense) => {
    const yveltalPercent = yveltalDamageActive
      ? number(result.yveltalMarksPerHit[hitIndex], 0) * YVELTAL_DARK_AURA.damagePerStackPercent
      : 0;
    let expression = applyPostCalculationFormula(
      baseDamageFormulaForResult(result),
      [yveltalPercent, ...damagePercentCorrections]
    );
    if (includeDefense && !result.part.bypassDefense) {
      expression = `(${expression}) × 600 ÷ (600 + ${defenseAdjustmentFormula(
        result.defenseDetails[hitIndex],
        result.part.dmgType
      )})`;
    } else if (includeDefense && result.part.bypassDefense) {
      expression = `${expression}（固定ダメージ）`;
    }
    return includeDefense ? falinksDamageFormula(expression) : expression;
  };
  const extraDamageFormula = (entry, includeDefense) => {
    const yveltalPercent = yveltalDamageActive
      ? initialYveltalMarks * YVELTAL_DARK_AURA.damagePerStackPercent
      : 0;
    let expression = applyPostCalculationFormula(
      entry.calculationFormula || formatNumber(entry.raw, 1),
      [yveltalPercent, ...damagePercentCorrections]
    );
    if (includeDefense) {
      expression = `(${expression}) × 600 ÷ (600 + ${defenseAdjustmentFormula(
        targetDefenseDetails(entry.type),
        entry.type
      )})`;
    }
    return includeDefense ? falinksDamageFormula(expression) : expression;
  };
  const rawDamageExpressions = moveResults.flatMap((result) => (
    Array.from(
      { length: result.hitCount },
      (_, hitIndex) => moveHitFormula(result, hitIndex, false)
    )
  ));
  rawDamageExpressions.push(...extras.map((entry) => extraDamageFormula(entry, false)));
  const finalDamageExpressions = moveResults.flatMap((result) => (
    Array.from(
      { length: result.hitCount },
      (_, hitIndex) => moveHitFormula(result, hitIndex, true)
    )
  ));
  finalDamageExpressions.push(...extras.map((entry) => extraDamageFormula(entry, true)));

  renderCalculationFormula(
    el.rawDamageFormula,
    groupedFormulaExpressions(rawDamageExpressions)
  );
  renderCalculationFormula(
    el.finalDamageFormula,
    groupedFormulaExpressions(finalDamageExpressions)
  );

  el.rawDamage.textContent = totalRaw;
  el.finalDamage.textContent = totalReduced;

  const moveTitle = `${move.slotLabel}${move.displayName ? ` - ${jpMoveName(move.displayName)}` : ""}`;
  el.learnChipRow.innerHTML = "";
  const learnChip = document.createElement("span");
  learnChip.className = level >= move.minLevel ? "chip good" : "chip warn";
  learnChip.textContent = level >= move.minLevel ? `習得済み: Lv${move.minLevel}以降` : `未習得: Lv${move.minLevel}以降`;
  el.learnChipRow.appendChild(learnChip);
  const typeChip = document.createElement("span");
  typeChip.className = "chip";
  typeChip.style.marginLeft = "8px";
  typeChip.textContent = `${moveTitle} / 全ヒット想定`;
  el.learnChipRow.appendChild(typeChip);

  const adjustmentRows = statusAdjustmentRows(stats, moveResults);
  renderStatusAdjustmentRows(adjustmentRows);
  renderStatusAdjustmentValueRows(statusAdjustmentValueRows(stats, moveResults, adjustmentRows));
  renderDamageAdjustmentRows(damageAdjustmentRows(
    stats,
    moveResults,
    extras,
    initialYveltalMarks,
    damageMultiplierTerms
  ));
}
