// Shield/healing controls and boost-emblem editing workflows.
function updateShieldMoveOptions() {
  const pokemon = selectedShieldPokemon();
  state.shieldMoveEntries = [];
  state.shieldMoveChoices = [];
  if (!pokemon) {
    renderShieldMoveChoices();
    return;
  }

  const level = number(el.shieldLevelRange.value, 15);
  const skills = pokemon.skills || [];
  const passive = skills.find((skill) => skill.ability === "Passive" || skill.ability === "Passive Ability");
  const basic = skills.find((skill) => skill.ability === "Basic");
  const move1 = skills.find((skill) => skill.ability === "Move 1");
  const move2 = skills.find((skill) => skill.ability === "Move 2");
  const unite = skills.find((skill) => skill.ability === "Unite Move");

  const createChoice = ({ slotKey, slotLabel, node, rsb, groupName, minLevel, iconName }) => {
    const fireSpinAttackTrigger = pokemon.name === "Armarouge" && (slotKey === "basic" || slotKey === "boosted");
    if (!node || (!rsb && !fireSpinAttackTrigger)) return;
    const baseDisplayName = slotKey === "basic" ? "通常攻撃" : slotKey === "boosted" ? "強化攻撃" : node.name || slotLabel;
    const displayName = fireSpinAttackTrigger ? `${baseDisplayName}（ほのおのうず中）` : baseDisplayName;
    const iconUrl = skillIconUrl(pokemon.name, iconName || node.name || "Attack");
    const entries = [];
    addRsbEntries(entries, rsb, displayName, groupName || node.ability || "", minLevel || node.level1 || node.level || 1, "", {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      enhancedMinLevel: node.level2 || minLevel || node.level1 || node.level || 1
    });
    const shieldEntries = entries.filter(isShieldEntry);
    const damageEntries = entries.filter(isAutoIncludedDamageEntry);
    const itemShieldEntries = [];
    const choiceMinLevel = number(minLevel || node.level1 || node.level || 1, 1);

    shieldEntries.forEach((entry) => {
      entry.targetScope = inferShieldTargetScope(entry, node, pokemon.name);
    });

    if (fireSpinAttackTrigger) {
      shieldEntries.push({
        id: `shield-${slotKey}-fire-spin-trigger`,
        ownerName: displayName,
        groupName: "Basic",
        label: "Shield - ほのおのうず発動中",
        ratio: 20,
        slider: 0,
        base: 24,
        dmgType: "SpAtk",
        minLevel: 5,
        enhanced: false,
        targetScope: "self",
        conditionalSource: "fire-spin",
        partKey: "fire-spin-trigger",
        basePartKey: "fire-spin-trigger"
      });
    }

    const canTriggerResonantGuard = slotKey !== "basic" && slotKey !== "boosted" && damageEntries.length > 0;
    if (hasShieldItem("Resonant Guard") && canTriggerResonantGuard) {
      itemShieldEntries.push({
        id: `shield-${slotKey}-resonant-guard`,
        ownerName: displayName,
        groupName: groupName || node.ability || "",
        label: "Shield - きょうめいガード",
        ratio: shieldEffectTierFor("Resonant Guard"),
        slider: 0,
        base: shieldItemBaseFor("Resonant Guard"),
        dmgType: "MaxHP",
        sourceType: "maxHp",
        itemSource: "Resonant Guard",
        minLevel: choiceMinLevel,
        enhanced: false,
        targetScope: "both",
        partKey: "resonant-guard",
        basePartKey: "resonant-guard"
      });
    }

    if (hasShieldItem("Buddy Barrier") && (groupName || node.ability) === "Unite Move") {
      itemShieldEntries.push({
        id: `shield-${slotKey}-buddy-barrier`,
        ownerName: displayName,
        groupName: "Unite Move",
        label: "Shield - おたすけバリア",
        ratio: shieldEffectTierFor("Buddy Barrier"),
        slider: 0,
        base: 0,
        dmgType: "MaxHP",
        sourceType: "maxHp",
        itemSource: "Buddy Barrier",
        minLevel: choiceMinLevel,
        enhanced: false,
        targetScope: "both",
        partKey: "buddy-barrier",
        basePartKey: "buddy-barrier"
      });
    }

    shieldEntries.push(...itemShieldEntries);
    if (!shieldEntries.length) return;

    shieldEntries.forEach((entry, index) => {
      entry.id = `shield-${slotKey}-${index}`;
      entry.slotKey = slotKey;
      entry.slotLabel = slotLabel;
      entry.displayName = displayName;
      entry.iconUrl = iconUrl;
    });

    const learnLevel = Math.min(...shieldEntries.map((entry) => number(entry.minLevel, 1)));
    const choice = {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      minLevel: learnLevel,
      entries: shieldEntries,
      disabled: !shieldEntries.some((entry) => level >= number(entry.minLevel, 1))
    };
    state.shieldMoveChoices.push(choice);
    state.shieldMoveEntries.push(...shieldEntries);
  };

  createChoice({
    slotKey: "passive",
    slotLabel: "特性",
    node: passive,
    rsb: passive && passive.rsb,
    groupName: "Passive",
    minLevel: 1
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

  [move1, ...((move1 && move1.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({
      slotKey: `move1-${index}`,
      slotLabel: "技1",
      node,
      rsb: node.rsb,
      groupName: "Move 1",
      minLevel: node.level1 || node.level || 1
    });
  });

  [move2, ...((move2 && move2.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoice({
      slotKey: `move2-${index}`,
      slotLabel: "技2",
      node,
      rsb: node.rsb,
      groupName: "Move 2",
      minLevel: node.level1 || node.level || 1
    });
  });

  createChoice({
    slotKey: "unite",
    slotLabel: "ユナイト技",
    node: unite,
    rsb: unite && unite.rsb,
    groupName: "Unite Move",
    minLevel: unite && unite.level || 1
  });

  if (!state.shieldMoveChoices.some((choice) => choice.slotKey === state.selectedShieldMoveSlot && !choice.disabled)) {
    state.selectedShieldMoveSlot = (state.shieldMoveChoices.find((choice) => !choice.disabled) || {}).slotKey || "";
  }
  renderShieldMoveChoices();
}

function renderShieldMoveChoices() {
  renderMoveCombobox({
    container: el.shieldMoveChoices,
    choices: state.shieldMoveChoices,
    selectedSlot: state.selectedShieldMoveSlot,
    ariaLabel: "シールド技",
    emptyMessage: "現在のレベルで計算できるシールド技がありません。",
    onSelect: (choice) => {
      state.selectedShieldMoveSlot = choice.slotKey;
      renderShieldMoveChoices();
      updateShieldAll();
    }
  });
}

function healingChoicesForPokemon(pokemon, level) {
  const choices = [];
  if (!pokemon) return choices;
  const skills = pokemon.skills || [];
  const passive = skills.find((skill) => skill.ability === "Passive" || skill.ability === "Passive Ability");
  const basic = skills.find((skill) => skill.ability === "Basic");
  const move1 = skills.find((skill) => skill.ability === "Move 1");
  const move2 = skills.find((skill) => skill.ability === "Move 2");
  const unite = skills.find((skill) => skill.ability === "Unite Move");

  const createChoices = ({ slotKey, slotLabel, node, rsb, rsbKey = "rsb", groupName, minLevel, iconName }) => {
    if (!node || !rsb) return;
    const displayName = slotKey === "basic" ? "通常攻撃" : slotKey === "boosted" ? "強化攻撃" : node.name || slotLabel;
    const iconUrl = skillIconUrl(pokemon.name, iconName || node.name || "Attack");
    const descriptionKey = [pokemon.name, groupName || node.ability || "", node.name || "", rsbKey].join("::");
    const entries = [];
    addRsbEntries(entries, rsb, displayName, groupName || node.ability || "", minLevel || node.level1 || node.level || 1, "", {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      enhancedMinLevel: node.level2 || minLevel || node.level1 || node.level || 1
    });
    const healingEntries = entries.filter(isHealingEntry);
    if (!healingEntries.length) return;

    const groups = new Map();
    healingEntries.forEach((entry) => {
      entry.pokemonName = pokemon.name;
      const key = normalizeHealingLabel(entry.label);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });

    healingEntries.forEach((entry, index) => {
      entry.id = `healing-${slotKey}-${index}`;
      entry.slotKey = slotKey;
      entry.slotLabel = slotLabel;
      entry.displayName = displayName;
      entry.iconUrl = iconUrl;
      entry.contextText = [node.description, rsb.true_desc, rsb.notes, rsb.rsb_info].filter(Boolean).join(" ");
    });

    const effectGroups = [...groups.entries()].map(([key, groupEntries]) => ({
      key,
      label: groupEntries[0].label,
      entries: groupEntries
    }));
    const learnLevel = Math.min(...healingEntries.map((entry) => number(entry.minLevel, 1)));
    const choice = {
      slotKey,
      slotLabel,
      displayName,
      iconUrl,
      minLevel: learnLevel,
      entries: healingEntries,
      effectGroups,
      variantLabel: effectGroups.length > 1 ? `${effectGroups.length}種類の回復効果` : effectGroups[0].label,
      descriptionKey,
      disabled: !healingEntries.some((entry) => level >= number(entry.minLevel, 1))
    };
    choices.push(choice);
  };

  createChoices({ slotKey: "passive", slotLabel: "特性", node: passive, rsb: passive && passive.rsb, groupName: "Passive", minLevel: 1 });
  createChoices({ slotKey: "basic", slotLabel: "通常", node: basic, rsb: basic && basic.rsb, groupName: "Basic", minLevel: 1, iconName: "Attack" });
  createChoices({ slotKey: "boosted", slotLabel: "通常強化", node: basic, rsb: basic && basic.boosted_rsb, rsbKey: "boosted_rsb", groupName: "Basic", minLevel: 1, iconName: "Attack" });

  [move1, ...((move1 && move1.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoices({ slotKey: `move1-${index}`, slotLabel: "技1", node, rsb: node.rsb, groupName: "Move 1", minLevel: node.level1 || node.level || 1 });
  });
  [move2, ...((move2 && move2.upgrades) || [])].filter(Boolean).forEach((node, index) => {
    createChoices({ slotKey: `move2-${index}`, slotLabel: "技2", node, rsb: node.rsb, groupName: "Move 2", minLevel: node.level1 || node.level || 1 });
  });
  createChoices({ slotKey: "unite", slotLabel: "ユナイト技", node: unite, rsb: unite && unite.rsb, groupName: "Unite Move", minLevel: unite && unite.level || 1 });

  return choices;
}

function updateHealingMoveOptions() {
  const pokemon = selectedHealingPokemon();
  const level = number(el.healingLevelRange.value, 15);
  state.healingMoveChoices = healingChoicesForPokemon(pokemon, level);
  state.healingMoveEntries = state.healingMoveChoices.flatMap((choice) => choice.entries);

  if (!state.healingMoveChoices.some((choice) => choice.slotKey === state.selectedHealingMoveSlot && !choice.disabled)) {
    state.selectedHealingMoveSlot = (state.healingMoveChoices.find((choice) => !choice.disabled) || {}).slotKey || "";
    state.selectedHealingEffectKey = defaultHealingEffectKey(selectedHealingMoveChoice());
  }
  renderHealingMoveChoices();
  updateHealingEffectOptions();
}

function renderHealingMoveChoices() {
  renderMoveCombobox({
    container: el.healingMoveChoices,
    choices: state.healingMoveChoices,
    selectedSlot: state.selectedHealingMoveSlot,
    ariaLabel: "回復技",
    emptyMessage: "現在のレベルで計算できる回復技がありません。",
    onSelect: (choice) => {
      state.selectedHealingMoveSlot = choice.slotKey;
      state.selectedHealingEffectKey = defaultHealingEffectKey(choice);
      renderHealingMoveChoices();
      updateHealingEffectOptions();
      updateHealingAll();
    }
  });
}

function applyRecommendedBuild() {
  const pokemon = selectedPokemon();
  const build = pokemon && Array.isArray(pokemon.builds) ? pokemon.builds.find((entry) => Array.isArray(entry.held_items)) : null;
  const wikiItems = pokemon ? DAMAGE_RECOMMENDED_ITEMS[pokemon.name] : null;
  const items = wikiItems || (build ? build.held_items.slice(0, 3) : []);
  for (let i = 0; i < 3; i += 1) {
    el[`itemSelect${i}`].value = items[i] || "";
    el[`itemLevel${i}`].value = 40;
  }
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "itemSelect");
  updateAll();
}

function emblemIdsFromLink(link) {
  try {
    const buildParam = new URL(link).searchParams.get("build") || "";
    return buildParam.split(",").filter(Boolean);
  } catch (error) {
    return [];
  }
}

const EMBLEM_SLOT_COUNT = 10;
const EMBLEM_GRADE_LABELS = { A: "金", B: "銀", C: "銅" };
const EMBLEM_COLOR_LABELS = {
  Black: "黒", Blue: "青", Brown: "茶", Gray: "灰", Green: "緑", Navy: "紺",
  Pink: "桃", Purple: "紫", Red: "赤", White: "白", Yellow: "黄"
};
const EMBLEM_COLOR_EFFECT_LABELS = {
  Black: "Cdr",
  Blue: "Def",
  Brown: "Atk",
  Gray: "Dt",
  Green: "Sp.Atk",
  Navy: "Cdr（Unite）",
  Pink: "Hed",
  Purple: "Sp.Def",
  Red: "Atk Speed",
  White: "Hp",
  Yellow: "Move Speed"
};
const EMBLEM_COLOR_HEX = {
  Black: "#718096", Blue: "#4aa3df", Brown: "#d88a45", Gray: "#aab2bd", Green: "#45c878",
  Navy: "#5776c8", Pink: "#e881b5", Purple: "#a970d6", Red: "#ef6b5b", White: "#e4e9ee", Yellow: "#e4c84c"
};
const EMBLEM_COLOR_DISPLAY_ORDER = [
  "White", "Green", "Red", "Blue", "Black", "Brown", "Purple", "Yellow", "Pink", "Navy", "Gray"
];
const EMBLEM_STAT_DEFINITIONS = [
  { key: "hp", label: "HP", digits: 0, suffix: "" },
  { key: "attack", label: "攻撃", digits: 1, suffix: "" },
  { key: "defense", label: "防御", digits: 1, suffix: "" },
  { key: "sp_attack", label: "特攻", digits: 1, suffix: "" },
  { key: "sp_defense", label: "特防", digits: 1, suffix: "" },
  { key: "crit", label: "急所率", digits: 1, suffix: "%" },
  { key: "speed", label: "移動速度", digits: 0, suffix: "" },
  { key: "cdr", label: "待ち時間", digits: 1, suffix: "%" }
];

function emblemJapaneseName(emblem) {
  return state.emblemNamesJa[String(number(emblem && emblem.pokedex, 0))]
    || (emblem && emblem.display_name)
    || "不明";
}

function emblemIconUrl(emblem) {
  return emblem
    ? `https://d275t8dp8rxb42.cloudfront.net/emblems/pokedex/${encodeURIComponent(emblem.name)}.png`
    : "";
}

function emblemSetIconUrl(color) {
  return `https://d275t8dp8rxb42.cloudfront.net/emblems/sets/${encodeURIComponent(color)}.png`;
}

function emblemSpeciesRows() {
  const rows = new Map();
  state.emblems.forEach((emblem) => {
    if (!rows.has(emblem.pokedex)) rows.set(emblem.pokedex, emblem);
  });
  return Array.from(rows.values()).sort((a, b) => number(a.pokedex, 0) - number(b.pokedex, 0));
}

function emblemSpeciesLabel(emblem) {
  return emblem ? `${emblem.pokedex}：${emblemJapaneseName(emblem)}` : "";
}

function emblemSpeciesFromInput(value) {
  const text = String(value || "").trim().replace(":", "：");
  if (!text) return null;
  const rows = emblemSpeciesRows();
  return rows.find((emblem) => emblemSpeciesLabel(emblem) === text)
    || rows.find((emblem) => emblemJapaneseName(emblem) === text)
    || (/^\d+$/.test(text) ? rows.find((emblem) => number(emblem.pokedex, -1) === number(text, -2)) : null)
    || null;
}

function normalizeEmblemSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ja")
    .replace(/\s+/g, "")
    .replace(":", "：");
}

function emblemSpeciesSuggestions(value, showAll = false) {
  const query = showAll ? "" : normalizeEmblemSearchText(value);
  const numericQuery = /^\d+$/.test(query) ? String(number(query, -1)) : "";
  const rows = emblemSpeciesRows()
    .filter((emblem) => {
      if (!query) return true;
      const label = normalizeEmblemSearchText(emblemSpeciesLabel(emblem));
      const japaneseName = normalizeEmblemSearchText(emblemJapaneseName(emblem));
      const englishName = normalizeEmblemSearchText(emblem.display_name);
      const pokedex = String(number(emblem.pokedex, -2));
      return label.includes(query)
        || japaneseName.includes(query)
        || englishName.includes(query)
        || (numericQuery && pokedex.startsWith(numericQuery));
    });
  if (!query && state.activeEmblemSlot !== null) {
    const selectedPokedex = selectedEmblemPokedex(state.activeEmblemSlot);
    rows.sort((a, b) => {
      if (a.pokedex === selectedPokedex) return -1;
      if (b.pokedex === selectedPokedex) return 1;
      return number(a.pokedex, 0) - number(b.pokedex, 0);
    });
  }
  return query ? rows.slice(0, 8) : rows;
}

function hideEmblemSuggestions() {
  state.activeEmblemSuggestion = -1;
  el.emblemEditorSuggestions.hidden = true;
  el.emblemEditorSuggestions.innerHTML = "";
  el.emblemEditorSpecies.setAttribute("aria-expanded", "false");
  el.emblemEditorSpecies.removeAttribute("aria-activedescendant");
}

function selectEmblemSuggestion(emblem) {
  el.emblemEditorSpecies.value = emblemSpeciesLabel(emblem);
  syncEmblemEditorInput(true);
  hideEmblemSuggestions();
}

function renderEmblemSuggestions(showAll = false) {
  if (state.activeEmblemSlot === null || el.emblemEditor.hidden) {
    hideEmblemSuggestions();
    return;
  }

  const suggestions = emblemSpeciesSuggestions(el.emblemEditorSpecies.value, showAll);
  state.activeEmblemSuggestion = -1;
  el.emblemEditorSuggestions.innerHTML = "";
  if (!suggestions.length) {
    const empty = document.createElement("span");
    empty.className = "emblem-suggestion-empty";
    empty.textContent = "一致するメダルがありません";
    el.emblemEditorSuggestions.appendChild(empty);
  } else {
    suggestions.forEach((emblem, position) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `emblemSuggestion${position}`;
      button.className = "emblem-suggestion";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");

      const icon = document.createElement("img");
      icon.src = emblemIconUrl(emblem);
      icon.alt = "";
      icon.loading = "lazy";
      icon.onerror = () => icon.remove();
      const label = document.createElement("span");
      label.className = "emblem-suggestion-label";
      label.textContent = emblemSpeciesLabel(emblem);
      button.append(icon, label);
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => {
        selectEmblemSuggestion(emblem);
      });
      el.emblemEditorSuggestions.appendChild(button);
    });
  }

  el.emblemEditorSuggestions.hidden = false;
  el.emblemEditorSpecies.setAttribute("aria-expanded", "true");
}

function moveEmblemSuggestion(direction) {
  const suggestions = Array.from(el.emblemEditorSuggestions.querySelectorAll(".emblem-suggestion"));
  if (!suggestions.length) return;
  const nextIndex = state.activeEmblemSuggestion < 0
    ? (direction > 0 ? 0 : suggestions.length - 1)
    : (state.activeEmblemSuggestion + direction + suggestions.length) % suggestions.length;
  state.activeEmblemSuggestion = nextIndex;
  suggestions.forEach((suggestion, index) => {
    const active = index === nextIndex;
    suggestion.classList.toggle("active", active);
    suggestion.setAttribute("aria-selected", String(active));
  });
  const activeSuggestion = suggestions[nextIndex];
  el.emblemEditorSpecies.setAttribute("aria-activedescendant", activeSuggestion.id);
  activeSuggestion.scrollIntoView({ block: "nearest" });
}

function selectedEmblemPokedex(index) {
  return state.emblemSelections[index] ? state.emblemSelections[index].pokedex : "";
}

function selectedEmblemGrade(index) {
  return state.emblemSelections[index] ? state.emblemSelections[index].grade : "";
}

function emblemForSelection(pokedex, grade) {
  return state.emblems.find((emblem) => emblem.pokedex === pokedex && emblem.grade === grade) || null;
}

function availableEmblemGrades(pokedex) {
  return state.emblems
    .filter((emblem) => emblem.pokedex === pokedex)
    .map((emblem) => emblem.grade)
    .filter((grade, position, all) => all.indexOf(grade) === position);
}

function selectedEmblemAt(index) {
  return emblemForSelection(selectedEmblemPokedex(index), selectedEmblemGrade(index));
}

function renderEmblemColorIcons(container, emblem) {
  container.innerHTML = "";
  if (!emblem) return;
  [emblem.color1, emblem.color2].filter(Boolean).forEach((color) => {
    const image = document.createElement("img");
    image.src = emblemSetIconUrl(color);
    image.alt = "";
    image.title = EMBLEM_COLOR_LABELS[color] || color;
    image.loading = "lazy";
    image.onerror = () => image.remove();
    container.appendChild(image);
  });
}

function updateEmblemSlotVisual(index) {
  const button = el[`emblemSlot${index}`];
  const icon = el[`emblemIcon${index}`];
  const placeholder = el[`emblemPlaceholder${index}`];
  const colors = el[`emblemColorIcons${index}`];
  if (!button || !icon || !placeholder || !colors) return;

  const emblem = selectedEmblemAt(index);
  button.classList.toggle("selected", Boolean(emblem));
  button.classList.toggle("active", state.activeEmblemSlot === index);
  renderEmblemColorIcons(colors, emblem);

  if (!emblem) {
    button.setAttribute("aria-label", `メダル${index + 1}を追加`);
    button.title = "メダルを追加";
    icon.hidden = true;
    icon.removeAttribute("src");
    icon.alt = "";
    placeholder.hidden = false;
    return;
  }

  const gradeLabel = EMBLEM_GRADE_LABELS[emblem.grade] || emblem.grade;
  const pokemonName = emblemJapaneseName(emblem);
  button.setAttribute("aria-label", `${pokemonName} ${gradeLabel}メダルを変更`);
  button.title = `${pokemonName}（${gradeLabel}）`;
  icon.hidden = false;
  icon.alt = `${pokemonName} ${gradeLabel}メダル`;
  icon.src = emblemIconUrl(emblem);
  placeholder.hidden = true;
}

function populateEmblemEditorGrades(preferredGrade = "") {
  const pokedex = state.activeEmblemSlot === null ? "" : selectedEmblemPokedex(state.activeEmblemSlot);
  const grades = availableEmblemGrades(pokedex);
  el.emblemEditorGrade.innerHTML = "";
  if (!grades.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "-";
    el.emblemEditorGrade.appendChild(option);
    el.emblemEditorGrade.disabled = true;
    return;
  }

  grades.forEach((grade) => {
    const option = document.createElement("option");
    option.value = grade;
    option.textContent = EMBLEM_GRADE_LABELS[grade] || grade;
    el.emblemEditorGrade.appendChild(option);
  });
  el.emblemEditorGrade.disabled = false;
  el.emblemEditorGrade.value = grades.includes(preferredGrade) ? preferredGrade : (grades.includes("A") ? "A" : grades[0]);
}

function updateEmblemEditorVisual(preserveInput = false) {
  const index = state.activeEmblemSlot;
  if (index === null) return;
  const emblem = selectedEmblemAt(index);
  el.emblemEditorTitle.textContent = emblem ? `メダル${index + 1}を変更` : `メダル${index + 1}に追加`;
  el.emblemEditorClear.disabled = !emblem;
  renderEmblemColorIcons(el.emblemEditorColors, emblem);

  if (!preserveInput) {
    el.emblemEditorSpecies.value = emblemSpeciesLabel(emblem);
    el.emblemEditorSpecies.setAttribute("aria-invalid", "false");
  }
  populateEmblemEditorGrades(emblem ? emblem.grade : "");

  if (!emblem) {
    el.emblemEditorIcon.hidden = true;
    el.emblemEditorIcon.removeAttribute("src");
    el.emblemEditorPlaceholder.hidden = false;
    return;
  }

  el.emblemEditorIcon.hidden = false;
  el.emblemEditorIcon.src = emblemIconUrl(emblem);
  el.emblemEditorPlaceholder.hidden = true;
}

function closeEmblemEditor() {
  hideEmblemSuggestions();
  el.emblemEditor.hidden = true;
  state.activeEmblemSlot = null;
  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) updateEmblemSlotVisual(i);
}

function openEmblemEditor(index) {
  state.activeEmblemSlot = index;
  el.emblemEditor.hidden = false;
  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) updateEmblemSlotVisual(i);
  updateEmblemEditorVisual();
  el.emblemEditorSpecies.focus();
  renderEmblemSuggestions(true);
}

function clearDuplicateEmblemSpecies(changedIndex, pokedex) {
  if (!pokedex) return;
  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) {
    if (i === changedIndex || selectedEmblemPokedex(i) !== pokedex) continue;
    state.emblemSelections[i] = { pokedex: "", grade: "" };
    updateEmblemSlotVisual(i);
  }
}

function syncEmblemEditorInput(normalize = false) {
  const index = state.activeEmblemSlot;
  if (index === null) return;
  const previousPokedex = selectedEmblemPokedex(index);
  const matchedSpecies = emblemSpeciesFromInput(el.emblemEditorSpecies.value);
  if (!matchedSpecies) {
    el.emblemEditorSpecies.setAttribute("aria-invalid", "false");
    if (normalize) updateEmblemEditorVisual();
    return;
  }

  const pokedex = matchedSpecies ? matchedSpecies.pokedex : "";
  if (pokedex) clearDuplicateEmblemSpecies(index, pokedex);

  const grades = availableEmblemGrades(pokedex);
  const previousGrade = selectedEmblemGrade(index);
  const grade = pokedex === previousPokedex && grades.includes(previousGrade)
    ? previousGrade
    : (grades.includes("A") ? "A" : grades[0] || "");
  state.emblemSelections[index] = { pokedex, grade };
  el.emblemEditorSpecies.setAttribute("aria-invalid", String(Boolean(el.emblemEditorSpecies.value.trim()) && !matchedSpecies));
  if (matchedSpecies && (normalize || !/^\d+$/.test(el.emblemEditorSpecies.value.trim()))) {
    el.emblemEditorSpecies.value = emblemSpeciesLabel(matchedSpecies);
  }

  state.emblemFallback = null;
  updateEmblemSlotVisual(index);
  updateEmblemEditorVisual(true);
  updateAll();
}

function renderEmblemSlots() {
  el.emblemSlots.innerHTML = "";

  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emblem-slot";
    button.style.setProperty("--angle", `${i * 36}deg`);
    button.style.setProperty("--inverse-angle", `${i * -36}deg`);

    const icon = document.createElement("img");
    icon.className = "emblem-icon";
    icon.width = 48;
    icon.height = 48;
    icon.hidden = true;

    const placeholder = document.createElement("span");
    placeholder.className = "emblem-placeholder";
    placeholder.textContent = "+";
    placeholder.setAttribute("aria-hidden", "true");

    const colorIcons = document.createElement("span");
    colorIcons.className = "emblem-color-icons";
    colorIcons.setAttribute("aria-hidden", "true");
    button.append(icon, placeholder, colorIcons);

    el[`emblemSlot${i}`] = button;
    el[`emblemIcon${i}`] = icon;
    el[`emblemPlaceholder${i}`] = placeholder;
    el[`emblemColorIcons${i}`] = colorIcons;
    el.emblemSlots.appendChild(button);
    button.addEventListener("click", () => openEmblemEditor(i));
    icon.addEventListener("error", () => {
      icon.hidden = true;
      placeholder.hidden = false;
    });
    updateEmblemSlotVisual(i);
  }

  el.emblemEditorSpecies.addEventListener("focus", () => renderEmblemSuggestions(true));
  el.emblemEditorSpecies.addEventListener("click", () => renderEmblemSuggestions(true));
  el.emblemEditorSpecies.addEventListener("input", () => {
    syncEmblemEditorInput();
    renderEmblemSuggestions();
  });
  el.emblemEditorSpecies.addEventListener("blur", (event) => {
    if (el.emblemEditorSuggestions.contains(event.relatedTarget)) return;
    syncEmblemEditorInput(true);
    hideEmblemSuggestions();
  });
  el.emblemEditorSpecies.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (el.emblemEditorSuggestions.hidden) renderEmblemSuggestions();
      moveEmblemSuggestion(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter") {
      const suggestions = Array.from(el.emblemEditorSuggestions.querySelectorAll(".emblem-suggestion"));
      if (!el.emblemEditorSuggestions.hidden && state.activeEmblemSuggestion >= 0 && suggestions[state.activeEmblemSuggestion]) {
        event.preventDefault();
        const selected = emblemSpeciesFromInput(suggestions[state.activeEmblemSuggestion].textContent.trim());
        if (selected) selectEmblemSuggestion(selected);
      } else {
        syncEmblemEditorInput(true);
        hideEmblemSuggestions();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      hideEmblemSuggestions();
    }
  });
  el.emblemEditorGrade.addEventListener("change", () => {
    const index = state.activeEmblemSlot;
    if (index === null) return;
    state.emblemSelections[index].grade = el.emblemEditorGrade.value;
    state.emblemFallback = null;
    updateEmblemSlotVisual(index);
    updateEmblemEditorVisual(true);
    updateAll();
  });
  el.emblemEditorClear.addEventListener("click", () => {
    const index = state.activeEmblemSlot;
    if (index === null) return;
    state.emblemSelections[index] = { pokedex: "", grade: "" };
    state.emblemFallback = null;
    updateAll();
    closeEmblemEditor();
  });
  el.emblemEditorDone.addEventListener("click", closeEmblemEditor);
  el.emblemEditorIcon.addEventListener("error", () => {
    el.emblemEditorIcon.hidden = true;
    el.emblemEditorPlaceholder.hidden = false;
  });
}

function selectedEmblemRows() {
  const rows = [];
  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) {
    const emblem = selectedEmblemAt(i);
    if (emblem) rows.push(emblem);
  }
  return rows;
}

function summarizeEmblemRows(emblems) {
  const colors = Object.fromEntries(state.emblemSets.map((set) => [set.name, new Set()]));
  const flatStats = Object.fromEntries(EMBLEM_STAT_DEFINITIONS.map((definition) => [definition.key, 0]));
  const totals = { equippedCount: emblems.length, colorCounts: {}, flatStats };
  emblems.forEach((emblem) => {
    const stats = emblem.stats && emblem.stats[0] ? emblem.stats[0] : {};
    EMBLEM_STAT_DEFINITIONS.forEach((definition) => {
      flatStats[definition.key] += number(stats[definition.key], 0);
    });
    Object.keys(colors).forEach((color) => {
      if (emblem.color1 === color || emblem.color2 === color) {
        colors[color].add(emblem.display_name || emblem.name);
      }
    });
  });
  Object.entries(colors).forEach(([color, members]) => {
    totals.colorCounts[color] = members.size;
  });
  totals.brownCount = totals.colorCounts.Brown || 0;
  totals.greenCount = totals.colorCounts.Green || 0;
  totals.attack = flatStats.attack;
  totals.spAttack = flatStats.sp_attack;
  totals.critRate = flatStats.crit;
  return totals;
}

function fallbackEmblemPreset(pokemonName) {
  const definition = FALLBACK_EMBLEM_PRESETS[pokemonName];
  if (!definition || !Array.isArray(definition.ids)) return null;
  const emblems = definition.ids
    .map((id) => state.emblems.find((emblem) => emblem.name === id))
    .filter(Boolean);
  if (emblems.length !== definition.ids.length) return null;
  return {
    name: definition.name,
    ids: emblems.map((emblem) => emblem.name),
    ...summarizeEmblemRows(emblems)
  };
}

function emblemPresetFromBuild(pokemon) {
  if (!pokemon || !Array.isArray(pokemon.builds)) return null;
  const build = pokemon.builds.find((entry) => Array.isArray(entry.emblem_link) && entry.emblem_link[0]);
  if (!build) return fallbackEmblemPreset(pokemon.name);

  let ids = emblemIdsFromLink(build.emblem_link[0]);
  if (!ids.length && Array.isArray(build.emblem_name) && build.emblem_name[0]) {
    const referencedName = build.emblem_name[0];
    for (const candidatePokemon of state.pokemon) {
      for (const candidateBuild of candidatePokemon.builds || []) {
        const nameIndex = Array.isArray(candidateBuild.emblem_name)
          ? candidateBuild.emblem_name.indexOf(referencedName)
          : -1;
        if (nameIndex < 0 || !Array.isArray(candidateBuild.emblem_link)) continue;
        ids = emblemIdsFromLink(candidateBuild.emblem_link[nameIndex]);
        if (ids.length) break;
      }
      if (ids.length) break;
    }
  }
  if (!ids.length) return fallbackEmblemPreset(pokemon.name);

  const emblems = ids
    .map((id) => state.emblems.find((emblem) => emblem.name === id))
    .filter(Boolean);
  if (!emblems.length) return fallbackEmblemPreset(pokemon.name);

  const totals = summarizeEmblemRows(emblems);

  return {
    name: `UniteDB推奨（${emblems.length}枚）`,
    ids: emblems.map((emblem) => emblem.name),
    ...totals
  };
}

function setEmblemControls(preset) {
  const values = preset || {};
  const ids = Array.isArray(values.ids) ? values.ids.slice(0, EMBLEM_SLOT_COUNT) : [];
  state.emblemFallback = preset && !ids.length ? { ...values } : null;
  state.emblemSelections = Array.from({ length: EMBLEM_SLOT_COUNT }, () => ({ pokedex: "", grade: "" }));
  for (let i = 0; i < EMBLEM_SLOT_COUNT; i += 1) {
    const emblem = state.emblems.find((entry) => entry.name === ids[i]);
    if (emblem) state.emblemSelections[i] = { pokedex: emblem.pokedex, grade: emblem.grade };
    updateEmblemSlotVisual(i);
  }
  closeEmblemEditor();
}

function applyRecommendedEmblems() {
  const preset = emblemPresetFromBuild(selectedPokemon());
  setEmblemControls(preset);
  updateAll();
}

function clearEmblems() {
  state.emblemFallback = null;
  setEmblemControls(null);
  updateAll();
}

function clearItems() {
  for (let i = 0; i < 3; i += 1) {
    el[`itemSelect${i}`].value = "";
    el[`itemLevel${i}`].value = 40;
  }
  const pokemon = selectedPokemon();
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "itemSelect");
  updateAll();
}

function applyRecommendedShieldBuild() {
  const pokemon = selectedShieldPokemon();
  const build = pokemon && Array.isArray(pokemon.builds) ? pokemon.builds.find((entry) => Array.isArray(entry.held_items)) : null;
  const items = build ? build.held_items.slice(0, 3) : [];
  for (let i = 0; i < 3; i += 1) {
    el[`shieldItemSelect${i}`].value = items[i] || "";
    el[`shieldItemLevel${i}`].value = 40;
  }
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "shieldItemSelect");
  updateShieldMoveOptions();
  updateShieldAll();
}

function clearShieldItems() {
  for (let i = 0; i < 3; i += 1) {
    el[`shieldItemSelect${i}`].value = "";
    el[`shieldItemLevel${i}`].value = 40;
  }
  const pokemon = selectedShieldPokemon();
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "shieldItemSelect");
  updateShieldMoveOptions();
  updateShieldAll();
}

function applyRecommendedHealingBuild() {
  const pokemon = selectedHealingPokemon();
  const build = pokemon && Array.isArray(pokemon.builds) ? pokemon.builds.find((entry) => Array.isArray(entry.held_items)) : null;
  const items = build ? build.held_items.slice(0, 3) : [];
  for (let i = 0; i < 3; i += 1) {
    el[`healingItemSelect${i}`].value = items[i] || "";
    el[`healingItemLevel${i}`].value = 40;
  }
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "healingItemSelect");
  updateHealingAll();
}

function clearHealingItems() {
  for (let i = 0; i < 3; i += 1) {
    el[`healingItemSelect${i}`].value = "";
    el[`healingItemLevel${i}`].value = 40;
  }
  const pokemon = selectedHealingPokemon();
  enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "healingItemSelect");
  updateHealingAll();
}
