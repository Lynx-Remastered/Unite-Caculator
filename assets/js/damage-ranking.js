// Move selection plus damage and healing ranking calculations.
function updateMoveOptions() {
  const pokemon = selectedPokemon();
  state.moveEntries = [];
  state.moveChoices = [];
  if (!pokemon) return;
  const skills = pokemon.skills || [];
  const basic = skills.find((skill) => skill.ability === "Basic");
  const move1 = skills.find((skill) => skill.ability === "Move 1");
  const move2 = skills.find((skill) => skill.ability === "Move 2");
  const unite = skills.find((skill) => skill.ability === "Unite Move");
  const passives = skills.filter((skill) => skill.ability === "Passive");

  const createChoice = ({ slotKey, slotLabel, node, rsb, groupName, minLevel, iconName, hideWhenNoDamage = false }) => {
    if (!node || !rsb) return;
    const displayName = slotKey === "basic" ? "通常攻撃" : slotKey === "boosted" ? "強化攻撃" : node.name || slotLabel;
    const iconUrl = skillIconUrl(pokemon.name, iconName || node.name || "Attack");
    const entries = [];
    addRsbEntries(entries, rsb, displayName, groupName || node.ability || "", minLevel || node.level1 || node.level || 1, "", {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      defaultDmgType: /special/i.test(String(pokemon.damage_type || "")) ? "SpAtk" : "Atk",
      enhancedMinLevel: node.level2 || minLevel || node.level1 || node.level || 1
    });
    if (!entries.length && hideWhenNoDamage) return;
    entries.forEach((entry, index) => {
      entry.id = `${slotKey}-${index}`;
      entry.slotKey = slotKey;
      entry.slotLabel = slotLabel;
      entry.displayName = displayName;
      entry.iconUrl = iconUrl;
    });
    const choice = {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      minLevel: number(minLevel || node.level1 || node.level || 1, 1),
      entries,
      disabled: entries.length === 0
    };
    state.moveChoices.push(choice);
    state.moveEntries.push(...entries);
  };

  passives.forEach((passive, index) => {
    createChoice({
      slotKey: `passive-${index}`,
      slotLabel: "特性",
      node: passive,
      rsb: passive.rsb,
      groupName: "Passive",
      minLevel: passive.level || 1,
      hideWhenNoDamage: true
    });
  });

  createChoice({
    slotKey: "basic",
    slotLabel: "通常",
    node: basic,
    rsb: basic && basic.rsb,
    groupName: "Basic",
    minLevel: 1,
    iconName: "Attack"
  });

  createChoice({
    slotKey: "boosted",
    slotLabel: "通常強化",
    node: basic,
    rsb: basic && basic.boosted_rsb,
    groupName: "Basic",
    minLevel: 1,
    iconName: "Attack"
  });

  if (pokemon.name === "Snorlax") {
    const flail = ((move1 && move1.upgrades) || []).find((node) => node.name === "Flail");
    if (flail) {
      ["basic", "boosted"].forEach((attackKind) => {
        const choice = snorlaxFlailAttackChoice(pokemon, flail, attackKind);
        state.moveChoices.push(choice);
        state.moveEntries.push(...choice.entries);
      });
    }
  }

  [move1, ...((move1 && move1.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({
      slotKey: `move1-${index}`,
      slotLabel: "技1",
      node,
      rsb: node.rsb,
      groupName: "Move 1",
      minLevel: node.level1 || node.level || 1,
      hideWhenNoDamage: true
    });
  });

  [move2, ...((move2 && move2.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({
      slotKey: `move2-${index}`,
      slotLabel: "技2",
      node,
      rsb: node.rsb,
      groupName: "Move 2",
      minLevel: node.level1 || node.level || 1,
      hideWhenNoDamage: true
    });
  });

  createChoice({
    slotKey: "unite",
    slotLabel: "ユナイト技",
    node: unite,
    rsb: unite && unite.rsb,
    groupName: "Unite Move",
    minLevel: unite && unite.level || 1,
    hideWhenNoDamage: true
  });

  if (!state.moveChoices.some((choice) => choice.slotKey === state.selectedMoveSlot && !choice.disabled)) {
    state.selectedMoveSlot = (state.moveChoices.find((choice) => !choice.disabled) || {}).slotKey || "basic";
  }
  renderMoveChoices();
}

function createMoveChoiceVisual(choice) {
  const img = document.createElement("img");
  img.src = choice.iconUrl || brokenImageUrl();
  img.alt = "";
  img.onerror = () => {
    img.onerror = null;
    img.src = brokenImageUrl();
  };

  const text = document.createElement("span");
  text.className = "move-choice-text";
  const name = document.createElement("span");
  name.className = "move-choice-name";
  name.textContent = jpMoveName(choice.displayName);
  text.append(name);
  return [img, text];
}

function closeMoveComboboxes(except = null) {
  document.querySelectorAll(".move-combobox").forEach((combobox) => {
    if (combobox === except) return;
    const trigger = combobox.querySelector(".move-combobox-trigger");
    const menu = combobox.querySelector(".move-combobox-menu");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    combobox.classList.remove("open");
  });
}

function renderMoveCombobox({ container, choices, selectedSlot, ariaLabel, emptyMessage, onSelect }) {
  container.innerHTML = "";
  container.classList.remove("open");
  if (!choices.length) {
    const message = document.createElement("div");
    message.className = "effect-note";
    message.textContent = emptyMessage;
    container.appendChild(message);
    return;
  }

  const selectedChoice = choices.find((choice) => choice.slotKey === selectedSlot && !choice.disabled)
    || choices.find((choice) => !choice.disabled);
  if (!selectedChoice) {
    const message = document.createElement("div");
    message.className = "effect-note";
    message.textContent = emptyMessage;
    container.appendChild(message);
    return;
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "move-choice move-combobox-trigger active";
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", `${ariaLabel}: ${jpMoveName(selectedChoice.displayName)}`);
  const triggerVisual = createMoveChoiceVisual(selectedChoice);
  const chevron = document.createElement("span");
  chevron.className = "move-combobox-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▼";
  trigger.append(...triggerVisual, chevron);

  const menu = document.createElement("div");
  menu.className = "move-combobox-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", `${ariaLabel}の選択肢`);
  menu.hidden = true;

  choices.forEach((choice) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `move-choice move-combobox-option${choice.slotKey === selectedChoice.slotKey ? " active" : ""}`;
    option.dataset.slot = choice.slotKey;
    option.disabled = choice.disabled;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", choice.slotKey === selectedChoice.slotKey ? "true" : "false");
    option.append(...createMoveChoiceVisual(choice));
    option.addEventListener("click", () => {
      closeMoveComboboxes();
      onSelect(choice);
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", () => {
    const willOpen = menu.hidden;
    closeMoveComboboxes(willOpen ? container : null);
    menu.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    container.classList.toggle("open", willOpen);
  });
  container.append(trigger, menu);
}

function renderMoveChoices() {
  renderMoveCombobox({
    container: el.moveChoices,
    choices: state.moveChoices,
    selectedSlot: state.selectedMoveSlot,
    ariaLabel: "技",
    emptyMessage: "現在のレベルで計算できる技がありません。",
    onSelect: (choice) => {
      state.selectedMoveSlot = choice.slotKey;
      renderMoveChoices();
      updateAll();
    }
  });
}

function damageChoicesForPokemon(pokemon, level) {
  const choices = [];
  if (!pokemon) return choices;
  const skills = pokemon.skills || [];
  const basic = skills.find((skill) => skill.ability === "Basic");
  const move1 = skills.find((skill) => skill.ability === "Move 1");
  const move2 = skills.find((skill) => skill.ability === "Move 2");
  const unite = skills.find((skill) => skill.ability === "Unite Move");
  const passives = skills.filter((skill) => skill.ability === "Passive");

  const createChoice = ({ slotKey, slotLabel, node, rsb, groupName, minLevel, iconName, hideWhenNoDamage = false }) => {
    if (!node || !rsb) return;
    const displayName = slotKey === "basic" ? "通常攻撃" : slotKey === "boosted" ? "強化攻撃" : node.name || slotLabel;
    const iconUrl = skillIconUrl(pokemon.name, iconName || node.name || "Attack");
    const entries = [];
    addRsbEntries(entries, rsb, displayName, groupName || node.ability || "", minLevel || node.level1 || node.level || 1, "", {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      defaultDmgType: /special/i.test(String(pokemon.damage_type || "")) ? "SpAtk" : "Atk",
      enhancedMinLevel: node.level2 || minLevel || node.level1 || node.level || 1
    });
    if (!entries.length && hideWhenNoDamage) return;
    entries.forEach((entry, index) => {
      entry.id = `${slotKey}-${index}`;
      entry.slotKey = slotKey;
      entry.slotLabel = slotLabel;
      entry.displayName = displayName;
      entry.iconUrl = iconUrl;
    });
    const learnLevel = entries.length
      ? Math.min(...entries.map((entry) => number(entry.minLevel, minLevel || 1)))
      : number(minLevel || node.level1 || node.level || 1, 1);
    choices.push({
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      minLevel: learnLevel,
      entries,
      disabled: entries.length === 0 || level < learnLevel
    });
  };

  passives.forEach((passive, index) => {
    createChoice({ slotKey: `passive-${index}`, slotLabel: "特性", node: passive, rsb: passive.rsb, groupName: "Passive", minLevel: passive.level || 1, hideWhenNoDamage: true });
  });
  createChoice({ slotKey: "basic", slotLabel: "通常", node: basic, rsb: basic && basic.rsb, groupName: "Basic", minLevel: 1, iconName: "Attack" });
  createChoice({ slotKey: "boosted", slotLabel: "通常強化", node: basic, rsb: basic && basic.boosted_rsb, groupName: "Basic", minLevel: 1, iconName: "Attack" });
  [move1, ...((move1 && move1.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({ slotKey: `move1-${index}`, slotLabel: "技1", node, rsb: node.rsb, groupName: "Move 1", minLevel: node.level1 || node.level || 1, hideWhenNoDamage: true });
  });
  [move2, ...((move2 && move2.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({ slotKey: `move2-${index}`, slotLabel: "技2", node, rsb: node.rsb, groupName: "Move 2", minLevel: node.level1 || node.level || 1, hideWhenNoDamage: true });
  });
  createChoice({ slotKey: "unite", slotLabel: "ユナイト技", node: unite, rsb: unite && unite.rsb, groupName: "Unite Move", minLevel: unite && unite.level || 1, hideWhenNoDamage: true });
  return choices;
}

function rankingPartsForChoice(pokemon, choice, level, rangeVariant = "") {
  if (!choice || !choice.entries.length || level < number(choice.minLevel, 1)) return [];
  const activeEntries = activeEntriesForLevel(choice.entries, level);
  const isSylveonHyperVoice = pokemon && pokemon.name === "Sylveon" && choice.displayName === "Hyper Voice";
  const damageEntries = isSylveonHyperVoice && rangeVariant
    ? activeEntries.filter((entry) => (rangeVariant === "far" ? /Far/i : /Near/i).test(String(entry.label || "")))
    : activeEntries.filter(isAutoIncludedDamageEntry);
  const usableEntries = damageEntries.length ? damageEntries : activeEntries.slice(0, 1);
  return entriesWithHitInfo(usableEntries, pokemon, choice, level);
}

function rankingVariantsForChoice(pokemon, choice, level) {
  if (!choice || !choice.entries.length || level < number(choice.minLevel, 1)) return [];
  const activeEntries = activeEntriesForLevel(choice.entries, level);
  const damageVariants = damageVariantOptionsForChoice(pokemon, choice, level, activeEntries);
  if (damageVariants.length) {
    const rankingDamageVariants = pokemon?.name === "Metagross" && choice?.displayName === "Meteor Mash"
      ? damageVariants.filter((variant) => /-punch$|-charging-4$/.test(variant.key))
      : damageVariants;
    return rankingDamageVariants.map((variant) => ({
      key: variant.key,
      label: variant.label,
      parts: entriesWithHitInfo(variant.entries, pokemon, choice, level)
    })).filter((variant) => variant.parts.length);
  }

  if (pokemon && pokemon.name === "Sylveon" && choice.displayName === "Hyper Voice") {
    return [
      { key: "near", label: "近距離", parts: rankingPartsForChoice(pokemon, choice, level, "near") },
      { key: "far", label: "遠距離", parts: rankingPartsForChoice(pokemon, choice, level, "far") }
    ].filter((variant) => variant.parts.length);
  }
  const parts = rankingPartsForChoice(pokemon, choice, level);
  return parts.length ? [{ key: "", label: "", parts }] : [];
}

function recommendedDamageItemRows(pokemon) {
  const build = pokemon && Array.isArray(pokemon.builds) ? pokemon.builds.find((entry) => Array.isArray(entry.held_items)) : null;
  const wikiItems = pokemon ? DAMAGE_RECOMMENDED_ITEMS[pokemon.name] : null;
  const itemNames = (wikiItems || (build ? build.held_items : []) || []).slice(0, 3);
  return itemNames.map((name, slot) => {
    const item = state.heldItems.find((entry) => entry.name === name);
    return item ? { item, level: 40, slot } : null;
  }).filter(Boolean);
}

function hasItemInRows(itemRows, itemName) {
  return itemRows.some((entry) => entry.item.name === itemName);
}

function effectTierForRows(itemRows, itemName) {
  const row = itemRows.find((entry) => entry.item.name === itemName);
  if (!row) return 0;
  const raw = row.level < 10 ? row.item.level1 : row.level < 20 ? row.item.level10 : row.item.level20;
  return number(String(raw || "").replace("%", ""), 0);
}

function computeRankingAttackerStats(pokemon, level, itemRows) {
  const baseStats = pokemon ? pokemonStats(pokemon.name, level) : null;
  const baseHp = number(baseStats && baseStats.hp, 0);
  const baseAttack = number(baseStats && baseStats.attack, 0);
  const baseSpAttack = number(baseStats && baseStats.sp_attack, 0);
  const emblemPreset = emblemPresetFromBuild(pokemon);
  const emblem = emblemBonusesFromSummary(emblemPreset, baseAttack, baseSpAttack, baseHp);
  const bonuses = { attackFlat: 0, spAttackFlat: 0, critRate: 0, critDamage: 0 };

  itemRows.forEach(({ item, level: itemLevel }) => {
    (item.stats || []).forEach((stat) => {
      const value = itemLevelValue(itemLevel, stat);
      const label = stat.label;
      if (label === "Attack") bonuses.attackFlat += value;
      if (label === "Sp. Attack") bonuses.spAttackFlat += value;
      if (label === "Critical-Hit Rate") bonuses.critRate += value;
      if (label === "Critical-Hit Damage Modifier") bonuses.critDamage += value;
    });
  });

  let attackFlat = bonuses.attackFlat + emblem.attackFlat;
  let spAttackFlat = bonuses.spAttackFlat + emblem.spAttackFlat;
  let attackPercent = 0;
  let spAttackPercent = 0;
  if (hasItemInRows(itemRows, "Wise Glasses")) spAttackPercent += effectTierForRows(itemRows, "Wise Glasses");

  const attackBeforePercent = baseAttack + attackFlat;
  const spAttackBeforePercent = baseSpAttack + spAttackFlat;
  return {
    attack: attackBeforePercent * (1 + attackPercent / 100) + emblem.attackSetBonus,
    spAttack: spAttackBeforePercent * (1 + spAttackPercent / 100) + emblem.spAttackSetBonus,
    attackFlat,
    spAttackFlat,
    attackPercent,
    spAttackPercent,
    emblem,
    emblemPreset,
    critDamageMultiplier: 2 + bonuses.critDamage / 100
  };
}

function rankingIntrinsicDefenseModifiers(pokemonName, moveName, part) {
  const modifiers = emptyDefenseModifiers();
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

function rankingDefenseSequenceState(pokemonName, moveName, level) {
  const effects = [];
  const add = (key, perStack, maxStacks, appliesTo = "") => {
    effects.push({ key, perStack, maxStacks, initial: 0, current: 0, appliesTo });
  };
  if (pokemonName === "Sylveon" && moveName === "Hyper Voice") add("spDefenseReductionPercent", 20, 4, "SpAtk");
  if (pokemonName === "Gardevoir" && moveName === "Psychic") add("spDefenseReductionPercent", 20, 3, "SpAtk");
  if (pokemonName === "Mr.Mime" && moveName === "Psychic") add("spDefenseReductionPercent", 5, 8, "SpAtk");
  if (pokemonName === "Venusaur" && moveName === "Sludge Bomb") add("spDefenseReductionPercent", 50, 1, "SpAtk");
  if (pokemonName === "Chandelure") add("spDefenseIgnorePercent", 5, 6, "SpAtk");
  if (pokemonName === "Raichu" && moveName === "Stored Power" && level >= 11) add("spDefenseReductionPercent", 8, 3, "SpAtk");
  return effects;
}

function rankingBaseDefenseModifiers(pokemon, itemRows) {
  const modifiers = emptyDefenseModifiers();
  if (hasItemInRows(itemRows, "Slick Spoon")) {
    modifiers.spDefenseIgnorePercent += effectTierForRows(itemRows, "Slick Spoon");
  }
  if (pokemon && pokemon.name === "Mega-Gyarados") {
    modifiers.defenseIgnorePercent += 30;
  }
  return modifiers;
}

function rankingDefenseDetails(type, targetDefense, targetSpDefense, modifiers) {
  const isPhysical = String(type).trim() === "Atk";
  const base = isPhysical ? targetDefense : targetSpDefense;
  const reductionPercent = Math.min(100, Math.max(0, isPhysical ? modifiers.defenseReductionPercent : modifiers.spDefenseReductionPercent));
  const reductionFlat = Math.max(0, isPhysical ? modifiers.defenseReductionFlat : modifiers.spDefenseReductionFlat);
  const ignorePercent = Math.min(100, Math.max(0, isPhysical ? modifiers.defenseIgnorePercent : modifiers.spDefenseIgnorePercent));
  const penetrationFlat = Math.max(0, isPhysical ? modifiers.defensePenetrationFlat : modifiers.spDefensePenetrationFlat);
  const afterReduction = (base - reductionFlat) * (1 - reductionPercent / 100);
  const afterPenetration = afterReduction - penetrationFlat;
  const effective = Math.max(-599, afterPenetration * (1 - ignorePercent / 100));
  return { base, effective };
}

function calculateRankingDamage({ pokemon, choice, parts, level, stats, itemRows, targetMaxHp, targetDefense, targetSpDefense, singleHit = false }) {
  const sequenceState = rankingDefenseSequenceState(pokemon.name, choice.displayName, level);
  const yveltalDamageActive = pokemon.name === "Yveltal";
  const yveltalAppliesMarks = yveltalDarkAuraAppliesMarks(pokemon, choice.slotKey);
  let yveltalMarks = 0;
  let totalRaw = 0;
  let totalReduced = 0;
  let totalHits = 0;
  let bestSingleRaw = 0;
  let bestSingleReduced = 0;

  parts.forEach((part) => {
    const moveStat = String(part.dmgType).trim() === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    const levelComponent = part.slider * (level - 1);
    const targetHpRatio = Math.max(0, number(part.targetHpRatio, 0))
      * (part.targetHpLevelScale ? Math.max(0, level - 1) : 1);
    const targetHpConditionMet = !number(part.targetHpMaxRemainingPercent, 0);
    const targetHpBase = part.targetHpBasis === "missing" ? 0 : Math.max(0, number(targetMaxHp, 0));
    const targetHpComponent = targetHpConditionMet ? Math.floor(targetHpBase * targetHpRatio / 100) : 0;
    const formulaBase = Math.max(0, Math.floor(statComponent + levelComponent + part.base + targetHpComponent));
    const damageScale = Math.max(0, number(part.damageScale, 1));
    const perHitBase = Math.max(0, Math.floor(formulaBase * damageScale));
    const hitCount = Math.max(1, number(part.hitCount, 1));
    totalHits += hitCount;

    for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
      const afterMultiplier = yveltalDamageActive
        ? applyYveltalDarkAuraDamage(perHitBase, yveltalMarks)
        : perHitBase;
      totalRaw += afterMultiplier;
      const modifiers = rankingBaseDefenseModifiers(pokemon, itemRows);
      addDefenseModifiers(modifiers, rankingIntrinsicDefenseModifiers(pokemon.name, choice.displayName, part));
      addDefenseModifiers(modifiers, sequenceDefenseModifiers(sequenceState));
      const defense = rankingDefenseDetails(part.dmgType, targetDefense, targetSpDefense, modifiers);
      const reduced = part.bypassDefense
        ? afterMultiplier
        : Math.floor(afterMultiplier * 600 / (600 + defense.effective));
      totalReduced += reduced;
      if (reduced > bestSingleReduced || (reduced === bestSingleReduced && afterMultiplier > bestSingleRaw)) {
        bestSingleRaw = afterMultiplier;
        bestSingleReduced = reduced;
      }
      if (yveltalAppliesMarks) yveltalMarks = Math.min(YVELTAL_DARK_AURA.maxStacks, yveltalMarks + 1);
      advanceDefenseSequence(sequenceState, part.dmgType);
    }
  });

  if (singleHit) {
    return { totalRaw: bestSingleRaw, totalReduced: bestSingleReduced, totalHits: bestSingleReduced > 0 || bestSingleRaw > 0 ? 1 : 0 };
  }
  return { totalRaw, totalReduced, totalHits };
}

function rankingSlotMatches(choice, filter) {
  if (filter === "all") return true;
  if (filter === "move") return choice.slotKey.startsWith("move1") || choice.slotKey.startsWith("move2") || choice.slotKey === "unite";
  if (filter === "passive") return choice.slotKey.startsWith("passive");
  if (filter === "basic") return choice.slotKey === "basic";
  if (filter === "boosted") return choice.slotKey === "boosted";
  if (filter === "move1") return choice.slotKey.startsWith("move1");
  if (filter === "move2") return choice.slotKey.startsWith("move2");
  if (filter === "unite") return choice.slotKey === "unite";
  return true;
}

function loadRankingColumnWidths() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(RANKING_COLUMN_STORAGE_KEY) || "{}") || {};
  } catch (_) {
    stored = {};
  }
  return Object.fromEntries(Object.entries(RANKING_COLUMN_DEFAULT_WIDTHS).map(([key, width]) => {
    const minWidth = RANKING_COLUMN_MIN_WIDTHS[key] || 48;
    return [key, clamp(number(stored[key], width), minWidth, 720)];
  }));
}

function saveRankingColumnWidths(widths) {
  try {
    localStorage.setItem(RANKING_COLUMN_STORAGE_KEY, JSON.stringify(widths));
  } catch (_) {
    // Ignore storage failures; resizing still works for the current page.
  }
}

function applyRankingColumnWidths(widths = loadRankingColumnWidths()) {
  const table = document.querySelector(".ranking-table");
  if (!table) return;
  let totalWidth = 0;
  Object.entries(RANKING_COLUMN_DEFAULT_WIDTHS).forEach(([key, defaultWidth]) => {
    const width = clamp(number(widths[key], defaultWidth), RANKING_COLUMN_MIN_WIDTHS[key] || 48, 720);
    const col = table.querySelector(`col[data-ranking-column="${key}"]`);
    if (col) col.style.width = `${width}px`;
    totalWidth += width;
  });
  const tableWidth = Math.max(860, totalWidth);
  table.style.width = `${tableWidth}px`;
  table.style.minWidth = `${tableWidth}px`;
}

function updateRankingColumnWidth(column, width) {
  if (!RANKING_COLUMN_DEFAULT_WIDTHS[column]) return;
  const widths = loadRankingColumnWidths();
  widths[column] = clamp(number(width, RANKING_COLUMN_DEFAULT_WIDTHS[column]), RANKING_COLUMN_MIN_WIDTHS[column] || 48, 720);
  saveRankingColumnWidths(widths);
  applyRankingColumnWidths(widths);
}

function wireRankingColumnResizers() {
  applyRankingColumnWidths();
  document.querySelectorAll(".ranking-col-resizer").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const column = handle.dataset.rankingColumn;
      if (!column || !RANKING_COLUMN_DEFAULT_WIDTHS[column]) return;
      event.preventDefault();
      event.stopPropagation();
      const widths = loadRankingColumnWidths();
      const startX = event.clientX;
      const startWidth = widths[column] || RANKING_COLUMN_DEFAULT_WIDTHS[column];
      document.body.classList.add("ranking-column-resizing");

      const onPointerMove = (moveEvent) => {
        updateRankingColumnWidth(column, startWidth + moveEvent.clientX - startX);
      };
      const onPointerUp = () => {
        document.body.classList.remove("ranking-column-resizing");
        document.removeEventListener("pointermove", onPointerMove);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
    });
  });
}

function updateDamageRanking() {
  if (!el.rankingBody) return;
  const level = number(el.rankingLevelRange.value, 15);
  const targetLevel = number(el.rankingTargetLevelRange.value, 15);
  el.rankingLevelValue.textContent = level;
  el.rankingTargetLevelValue.textContent = targetLevel;
  const targetPokemon = state.pokemon.find((pokemon) => pokemon.name === el.rankingTargetSelect.value);
  const targetStats = targetPokemon ? pokemonStats(targetPokemon.name, targetLevel) : null;
  const targetMaxHp = number(targetStats && targetStats.hp, 0);
  const targetDefense = number(targetStats && targetStats.defense, 0);
  const targetSpDefense = number(targetStats && targetStats.sp_defense, 0);
  const filter = el.rankingSlotFilter.value;
  const limit = number(el.rankingLimitSelect.value, 50);
  const singleHit = Boolean(el.rankingSingleHit.checked);
  const rows = [];

  state.pokemon.filter((pokemon) => !pokemon.exclude_stats).forEach((pokemon) => {
    const itemRows = recommendedDamageItemRows(pokemon);
    const stats = computeRankingAttackerStats(pokemon, level, itemRows);
    damageChoicesForPokemon(pokemon, level)
      .filter((choice) => !choice.disabled && rankingSlotMatches(choice, filter))
      .forEach((choice) => {
        rankingVariantsForChoice(pokemon, choice, level).forEach((variant) => {
          const result = calculateRankingDamage({
            pokemon,
            choice,
            parts: variant.parts,
            level,
            stats,
            itemRows,
            targetMaxHp,
            targetDefense,
            targetSpDefense,
            singleHit
          });
          rows.push({
            pokemon,
            choice,
            variant,
            itemRows,
            totalRaw: result.totalRaw,
            totalReduced: result.totalReduced,
            totalHits: result.totalHits
          });
        });
      });
  });

  rows.sort((a, b) => b.totalReduced - a.totalReduced || b.totalRaw - a.totalRaw || jpPokemonName(a.pokemon).localeCompare(jpPokemonName(b.pokemon), "ja"));
  state.rankingRows = rows;
  const visibleRows = rows.slice(0, limit);
  if (!visibleRows.length) {
    el.rankingBody.innerHTML = `<tr><td colspan="7">現在の条件で表示できる技がありません。</td></tr>`;
  } else {
    el.rankingBody.innerHTML = visibleRows.map((row, index) => {
      const moveName = `${jpMoveName(row.choice.displayName)}${row.variant.label ? `（${row.variant.label}）` : ""}`;
      const moveNote = singleHit ? "1ヒット想定" : "1回分・全ヒット想定";
      const itemIcons = row.itemRows.length
        ? row.itemRows.map((entry) => `<img src="${escapeHtml(heldItemIconUrl(entry.item.name))}" alt="${escapeHtml(jpItemName(entry.item))}" title="${escapeHtml(jpItemName(entry.item))}" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">`).join("")
        : `<span class="ranking-item-empty" title="持ち物なし">なし</span>`;
      return `<tr>
        <td class="ranking-rank">${index + 1}</td>
        <td>
          <div class="ranking-pokemon">
            <img src="${escapeHtml(pokemonThumbUrl(row.pokemon.name))}" alt="">
            <span class="ranking-name">${escapeHtml(jpPokemonName(row.pokemon))}</span>
          </div>
        </td>
        <td>
          <div class="ranking-move">
            <img src="${escapeHtml(row.choice.iconUrl || brokenImageUrl())}" alt="">
            <span><span class="ranking-name">${escapeHtml(moveName)}</span><span class="ranking-note">${escapeHtml(moveNote)}</span></span>
          </div>
        </td>
        <td class="ranking-number">${formatNumber(row.totalHits, 0)}</td>
        <td class="ranking-number">${formatNumber(row.totalRaw, 0)}</td>
        <td class="ranking-number">${formatNumber(row.totalReduced, 0)}</td>
        <td>
          <div class="ranking-assumption">
            <span class="ranking-item-icons" aria-label="持ち物">${itemIcons}</span>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  const targetText = targetPokemon
    ? `Lv${targetLevel}（防御${formatNumber(targetDefense, 0)} / 特防${formatNumber(targetSpDefense, 0)}）`
    : "相手なし（防御0 / 特防0）";
  el.rankingSummary.textContent = `攻撃側Lv${level} / 相手: ${targetText} / ${singleHit ? "単発（最大1ヒット）" : "技1回分"} / 推奨持ち物Lv40を使用 / 条件付き追加ダメージ・急所は未反映 / ${formatNumber(visibleRows.length, 0)}件表示（全${formatNumber(rows.length, 0)}件）`;
}

function recommendedHealingItemRows(pokemon) {
  const build = pokemon && Array.isArray(pokemon.builds)
    ? pokemon.builds.find((entry) => Array.isArray(entry.held_items))
    : null;
  return (build ? build.held_items : []).slice(0, 3).map((name, slot) => {
    const item = state.heldItems.find((entry) => entry.name === name);
    return item ? { item, level: 40, slot } : null;
  }).filter(Boolean);
}

function computeRankingHealingStats(pokemon, level, itemRows) {
  const baseStats = pokemon ? pokemonStats(pokemon.name, level) : null;
  const baseAttack = number(baseStats && baseStats.attack, 0);
  const baseSpAttack = number(baseStats && baseStats.sp_attack, 0);
  let attackFlat = 0;
  let spAttackFlat = 0;
  let spAttackPercent = 0;

  itemRows.forEach(({ item, level: itemLevel }) => {
    (item.stats || []).forEach((stat) => {
      const value = itemLevelValue(itemLevel, stat);
      if (stat.label === "Attack") attackFlat += value;
      if (stat.label === "Sp. Attack") spAttackFlat += value;
    });
  });
  if (hasItemInRows(itemRows, "Wise Glasses")) {
    spAttackPercent += effectTierForRows(itemRows, "Wise Glasses");
  }

  return {
    attack: baseAttack + attackFlat,
    spAttack: (baseSpAttack + spAttackFlat) * (1 + spAttackPercent / 100)
  };
}

function healingRankingVariantsForChoice(pokemon, choice, level) {
  if (!choice || choice.disabled || level < number(choice.minLevel, 1)) return [];
  const variants = (choice.effectGroups || []).map((group) => {
    const available = group.entries.filter((entry) => (
      level >= number(entry.minLevel, 1) && isHealingEntry(entry)
    ));
    const enhanced = available.filter((entry) => entry.enhanced);
    const parts = enhanced.length
      ? enhanced
      : available.filter((entry) => !entry.enhanced);
    return {
      key: group.key,
      label: group.label,
      parts
    };
  }).filter((variant) => variant.parts.length);

  if (pokemon?.name === "Mega-Lucario" && choice.displayName === "Close Combat") {
    const parts = variants.flatMap((variant) => variant.parts);
    const firstHitParts = parts.filter((part) => /\bfirst hit\b/i.test(String(part.label || "")));
    const subsequentHitParts = parts.filter((part) => /subsequent hits/i.test(String(part.label || "")));
    if (firstHitParts.length && subsequentHitParts.length) {
      return [
        {
          key: "normal-form",
          label: "通常時",
          displayLabel: "通常時",
          parts: subsequentHitParts.map((part) => ({ ...part, healingHitCountOverride: 11 }))
        },
        {
          key: "mega-form",
          label: "メガ時",
          displayLabel: "メガ時",
          parts: [
            ...firstHitParts.map((part) => ({ ...part, healingHitCountOverride: 1 })),
            ...subsequentHitParts.map((part) => ({ ...part, healingHitCountOverride: 15 }))
          ]
        }
      ];
    }
  }

  if (pokemon?.name === "Meganium" && choice.displayName === "Petal Blizzard") {
    const healingParts = variants
      .filter((variant) => normalizeHealingLabel(variant.label) === "healing")
      .flatMap((variant) => variant.parts);
    if (healingParts.length) {
      return [
        {
          key: "normal-form",
          label: "通常時",
          displayLabel: "通常時",
          parts: healingParts.map((part) => ({ ...part, healingHitCountOverride: 1 }))
        },
        {
          key: "full-bloom",
          label: "満開時",
          displayLabel: "満開時",
          parts: [
            ...healingParts.map((part) => ({ ...part, healingHitCountOverride: 1 })),
            ...healingParts.map((part) => ({
              ...part,
              id: `${part.id}-full-bloom-extra`,
              healingHitCountOverride: 4,
              healingValueScale: 0.05
            }))
          ]
        }
      ];
    }
  }

  return variants;
}

function calculateRankingHealing(parts, level, stats) {
  let totalHealing = 0;
  let totalHits = 0;
  parts.forEach((part) => {
    const moveStat = String(part.dmgType).trim() === "Atk" ? stats.attack : stats.spAttack;
    const statComponent = Math.floor(part.ratio * moveStat / 100);
    const levelComponent = part.slider * (level - 1);
    const baseValue = Math.max(0, Math.floor(statComponent + levelComponent + part.base));
    const scaledValue = Math.max(0, Math.floor(baseValue * number(part.healingValueScale, 1)));
    const hitCount = Math.max(1, number(inferHealingHitInfo(part, level).count, 1));
    totalHealing += scaledValue * hitCount;
    totalHits += hitCount;
  });
  return { totalHealing, totalHits };
}

const HEALING_EFFECT_LABELS_JA = Object.freeze({
  "Healing - per Cream (48 max)": "クリーム1個ごとの回復（最大48個）",
  "Heal - First Hit": "初撃の回復",
  "Healing - Empowered": "強化時の回復",
  "Healing": "回復",
  "Healing - Basic": "通常時の回復",
  "Heal - per Copy": "分身1体ごとの回復",
  "Heal": "回復",
  "Healing - Final Slash per Diagonal": "斜め斬り1回ごとの最終斬撃回復",
  "Healing (3x)": "回復（3回）",
  "Healing - per Blade (5 blades)": "刃1枚ごとの回復（5枚）",
  "Dark Aura - Healing": "ダークオーラによる回復",
  "Empowered Floral Healing Healing": "強化フラワーヒールの回復",
  "Healing (4x)": "回復（4回）",
  "Healing - HoT (2x)": "継続回復（2回）",
  "Healing - per Hit (3-5 hits)": "1ヒットごとの回復（3～5ヒット）",
  "Healing - Boosted (Shield Stance)": "シールドフォルムの強化攻撃による回復",
  "Heal - per Hit": "1ヒットごとの回復",
  "Heal per hit per target (Queenly Majesty buff)": "1対象・1ヒットごとの回復（クイーンマジェスティ）",
  "Heal - Landing": "着地時の回復",
  "Healing - Boosted (per Hit - 2 Hits)": "強化攻撃1ヒットごとの回復（2ヒット）",
  "Heal - per Hit (Subsequent Hits)": "2撃目以降・1ヒットごとの回復",
  "Healing - Mark": "マークによる回復",
  "Healing - Additional Per Flower": "花1個ごとの追加回復",
  "Healing - per Target": "1対象ごとの回復",
  "Healing - Revenge": "反撃時の回復",
  "Healing - Whirlpool (Torrent)": "うずしおによる回復（げきりゅう中）",
  "Healing (Per hit up to 4x based on number of Center hits)": "中心ヒット数に応じた回復（1ヒットごと・最大4回）",
  "Healing (Gooey Center- Per hit up to 4x based on number of Center hits)": "ぬめぬめ状態の相手への中心ヒット回復（1ヒットごと・最大4回）",
  "Heal - per Tick (per half second)": "0.5秒ごとの回復",
  "Healing - Per Hit": "1ヒットごとの回復",
  "Healing (Per Tick)": "1回ごとの回復",
  "Healing - Gluttonous Fangs": "くいしんぼうのキバによる回復",
  "Heal - Additional (Per Coin Mark)": "コインマーク1個ごとの追加回復",
  "Additional Healing (Ally Snorlax) - Empowered": "味方カビゴンへの追加回復（強化時）",
  "Heal - per tick": "1回ごとの回復",
  "Additional Healing (Ally Snorlax) - Basic": "味方カビゴンへの追加回復（通常時）",
  "Heal - per Boosted Attack": "強化攻撃1回ごとの回復",
  "Empowered Floral Healing Healing - Additional Per Flower": "強化フラワーヒールの花1個ごとの追加回復",
  "Healing - per Hit (Against Players)": "対プレイヤー・1ヒットごとの回復",
  "Healing -per Hit (Against Players)": "対プレイヤー・1ヒットごとの回復",
  "Healing - per Tick": "1回ごとの回復",
  "Healing (per Unique Enemy)": "命中した相手1体ごとの回復",
  "Healing (per tick of flamethrower)": "かえんほうしゃ1回ごとの回復",
  "Healing - per Hit (Against Wilds)": "野生ポケモン・1ヒットごとの回復"
});

function jpHealingEffectLabel(label) {
  return HEALING_EFFECT_LABELS_JA[String(label || "")] || "回復";
}

function updateHealingRanking() {
  if (!el.healingRankingBody) return;
  hideHealingRankingMoveTooltip(true);
  const level = number(el.healingRankingLevelRange.value, 15);
  const limit = number(el.healingRankingLimitSelect.value, 50);
  const rows = [];
  el.healingRankingLevelValue.textContent = level;

  state.pokemon.filter((pokemon) => !pokemon.exclude_stats).forEach((pokemon) => {
    const itemRows = recommendedHealingItemRows(pokemon);
    const stats = computeRankingHealingStats(pokemon, level, itemRows);
    healingChoicesForPokemon(pokemon, level)
      .filter((choice) => !choice.disabled)
      .forEach((choice) => {
        healingRankingVariantsForChoice(pokemon, choice, level).forEach((variant) => {
          const result = calculateRankingHealing(variant.parts, level, stats);
          if (result.totalHealing <= 0) return;
          rows.push({
            pokemon,
            choice,
            variant,
            itemRows,
            level,
            descriptionKey: choice.descriptionKey,
            totalHealing: result.totalHealing,
            totalHits: result.totalHits
          });
        });
      });
  });

  rows.sort((a, b) => (
    b.totalHealing - a.totalHealing
    || jpPokemonName(a.pokemon).localeCompare(jpPokemonName(b.pokemon), "ja")
    || jpMoveName(a.choice.displayName).localeCompare(jpMoveName(b.choice.displayName), "ja")
  ));
  state.healingRankingRows = rows;
  const visibleRows = rows.slice(0, limit);

  if (!visibleRows.length) {
    el.healingRankingBody.innerHTML = `<tr class="healing-ranking-empty"><td colspan="6">現在の条件で表示できる回復効果がありません。</td></tr>`;
  } else {
    el.healingRankingBody.innerHTML = visibleRows.map((row, index) => {
      const moveName = jpMoveName(row.choice.displayName);
      const effectLabel = row.variant.displayLabel || jpHealingEffectLabel(row.variant.label);
      const moveNote = `${effectLabel}${row.totalHits > 1 ? ` / ${formatNumber(row.totalHits, 0)}回分を合計` : ""}`;
      const itemIcons = row.itemRows.length
        ? row.itemRows.map((entry) => `<img src="${escapeHtml(heldItemIconUrl(entry.item.name))}" alt="${escapeHtml(jpItemName(entry.item))}" title="${escapeHtml(jpItemName(entry.item))}" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">`).join("")
        : `<span class="ranking-item-empty" title="持ち物なし">なし</span>`;
      return `<tr>
        <td class="ranking-rank">${index + 1}</td>
        <td>
          <div class="ranking-pokemon">
            <img src="${escapeHtml(pokemonThumbUrl(row.pokemon.name))}" alt="">
            <span class="ranking-name">${escapeHtml(jpPokemonName(row.pokemon))}</span>
          </div>
        </td>
        <td>
          <div class="ranking-move">
            <button
              class="healing-move-icon-trigger"
              type="button"
              data-healing-ranking-row-index="${index}"
              aria-label="${escapeHtml(moveName)}の技概要と回復仕様を表示"
              aria-expanded="false"
              aria-describedby="healingRankingMoveTooltip"
            >
              <img src="${escapeHtml(row.choice.iconUrl || brokenImageUrl())}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">
            </button>
            <span><span class="ranking-name">${escapeHtml(moveName)}</span><span class="ranking-note">${escapeHtml(moveNote)}</span></span>
          </div>
        </td>
        <td class="ranking-number">${formatNumber(row.totalHits, 0)}</td>
        <td class="ranking-number">${formatNumber(row.totalHealing, 0)}</td>
        <td>
          <div class="ranking-assumption">
            <span class="ranking-item-icons" aria-label="持ち物">${itemIcons}</span>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

}

let activeHealingRankingMoveTooltipTrigger = null;
let healingRankingMoveTooltipPinned = false;

function ensureHealingRankingMoveTooltip() {
  let tooltip = document.getElementById("healingRankingMoveTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "healingRankingMoveTooltip";
  tooltip.className = "slow-move-tooltip healing-move-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  return tooltip;
}

function localizedHealingRankingOverviewParts(row) {
  const descriptionSources = [
    state.wikiMoveDescriptionsJa && state.wikiMoveDescriptionsJa.entries || {},
    state.slowDescriptionsJa && state.slowDescriptionsJa.entries || {}
  ];
  for (const entries of descriptionSources) {
    const translated = row.descriptionKey && entries[row.descriptionKey];
    if (!Array.isArray(translated) || !translated.length) continue;
    const parts = translated
      .map((part) => ({
        label: String(part.label || "技の概要"),
        text: cleanSlowDescription(part.text)
      }))
      .filter((part) => part.text && part.label === "技の概要");
    if (parts.length) return parts;
  }
  return [{
    label: "技の概要",
    text: `${jpMoveName(row.choice.displayName)}には、HPを回復する効果があります。`
  }];
}

function healingRankingDetailParts(row) {
  const hitText = row.totalHits > 1
    ? `1回の技使用で最大${formatNumber(row.totalHits, 0)}回の回復判定を合計し`
    : "1回の回復判定として";
  return [{
    label: "回復仕様",
    text: `使用者レベル${formatNumber(row.level, 0)}、推奨持ち物レベル40の条件で、${hitText}、回復量${formatNumber(row.totalHealing, 0)}として集計しています。回復量の割合補正と対象数は含めていません。`
  }];
}

function showHealingRankingMoveTooltip(trigger, pinned = false) {
  const rowIndex = number(trigger && trigger.dataset.healingRankingRowIndex, -1);
  const row = state.healingRankingRows[rowIndex];
  if (!trigger || !row) return;
  const parts = [
    ...localizedHealingRankingOverviewParts(row),
    ...healingRankingDetailParts(row)
  ];
  const preservePin = activeHealingRankingMoveTooltipTrigger === trigger && healingRankingMoveTooltipPinned;
  const tooltip = ensureHealingRankingMoveTooltip();
  const body = parts.map((part) => (
    `<div class="slow-move-tooltip-part">${part.label ? `<strong>${escapeHtml(part.label)}：</strong>` : ""}${escapeHtml(part.text)}</div>`
  )).join("");
  const variantLabel = row.variant.displayLabel ? `（${row.variant.displayLabel}）` : "";
  tooltip.innerHTML = `<strong class="slow-move-tooltip-title">${escapeHtml(jpPokemonName(row.pokemon))} / ${escapeHtml(jpMoveName(row.choice.displayName))}${escapeHtml(variantLabel)}</strong>${body}`;
  tooltip.hidden = false;
  hideSlowMoveTooltip(true);
  hideAccelerationMoveTooltip(true);
  if (activeHealingRankingMoveTooltipTrigger && activeHealingRankingMoveTooltipTrigger !== trigger) {
    activeHealingRankingMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  }
  activeHealingRankingMoveTooltipTrigger = trigger;
  healingRankingMoveTooltipPinned = pinned || preservePin;
  tooltip.classList.toggle("is-pinned", healingRankingMoveTooltipPinned);
  trigger.setAttribute("aria-expanded", "true");
  positionSlowMoveTooltip(trigger, tooltip);
}

function hideHealingRankingMoveTooltip(force = false) {
  if (healingRankingMoveTooltipPinned && !force) return;
  const tooltip = document.getElementById("healingRankingMoveTooltip");
  if (tooltip) {
    tooltip.hidden = true;
    tooltip.classList.remove("is-pinned");
  }
  if (activeHealingRankingMoveTooltipTrigger) {
    activeHealingRankingMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  }
  activeHealingRankingMoveTooltipTrigger = null;
  healingRankingMoveTooltipPinned = false;
}
