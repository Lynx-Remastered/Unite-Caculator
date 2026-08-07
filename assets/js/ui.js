// Localization, shared controls, navigation, and top-level UI helpers.
function applyTheme(theme, persist = true) {
  const selectedTheme = THEMES.includes(theme) ? theme : "charmander";
  document.documentElement.dataset.theme = selectedTheme;
  if (el.themeSelect) el.themeSelect.value = selectedTheme;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    } catch (error) {
      // Keep the active theme even when storage is unavailable.
    }
  }
}

function applyMode(mode, persist = true) {
  const selectedMode = MODES.includes(mode) ? mode : "dark";
  document.documentElement.dataset.mode = selectedMode;

  if (el.modeToggleButton) {
    const isLight = selectedMode === "light";
    const actionLabel = isLight ? "ダークモードに切り替える" : "ライトモードに切り替える";
    el.modeToggleButton.setAttribute("aria-label", actionLabel);
    el.modeToggleButton.setAttribute("title", actionLabel);
    el.modeToggleButton.setAttribute("aria-pressed", String(isLight));
  }

  if (persist) {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, selectedMode);
    } catch (error) {
      // Keep the active mode even when storage is unavailable.
    }
  }
}

function jpItemName(itemOrName) {
  const name = typeof itemOrName === "string" ? itemOrName : itemOrName.name;
  return HELD_ITEM_JA[name] ? HELD_ITEM_JA[name].name : name;
}

function jpPokemonName(pokemonOrName) {
  const name = typeof pokemonOrName === "string" ? pokemonOrName : pokemonOrName.name;
  return POKEMON_JA[name] || (typeof pokemonOrName === "object" ? pokemonOrName.display_name || name : name);
}

function jpItemEffect(item) {
  return HELD_ITEM_JA[item.name] ? HELD_ITEM_JA[item.name].effect : item.description1 || "";
}

function jpStat(label) {
  return STAT_JA[label] || label;
}

function jpDamageType(type) {
  return String(type).trim() === "Atk" ? "攻撃" : "特攻";
}

function jpAbility(label) {
  return ABILITY_JA[label] || label;
}

function jpMoveLabel(label) {
  const raw = label || "ダメージ";
  if (LABEL_EXACT_JA[raw]) return LABEL_EXACT_JA[raw];
  let text = raw;
  LABEL_REPLACEMENTS.forEach(([from, to]) => {
    text = text.split(from).join(to);
  });
  return text;
}

function jpMoveName(name) {
  if (name === "Attack") return "通常攻撃";
  return state.moveNamesJa[name] || name || "技";
}

const PATCH_STATUS_JA = {
  buff: "強化",
  nerf: "弱体化",
  adjustment: "調整",
  bugfix: "不具合修正",
  rework: "仕様変更",
  new: "新規追加"
};

const PATCH_FIELD_JA = {
  ratio: "倍率",
  slider: "レベル補正",
  base: "固定値",
  bas: "固定値",
  perlevel: "1レベルごとの補正",
  scale: "倍率",
  damage: "ダメージ",
  healing: "回復量",
  heal: "回復量",
  shield: "シールド量",
  cooldown: "待ち時間",
  cooldownreduced: "待ち時間を短縮",
  cooldownincreased: "待ち時間を延長",
  cooldownreduction: "待ち時間短縮率",
  hp: "HP",
  attack: "攻撃",
  atk: "攻撃",
  specialattack: "特攻",
  spatk: "特攻",
  spa: "特攻",
  defense: "防御",
  def: "防御",
  specialdefense: "特防",
  spdef: "特防",
  spd: "特防",
  attackspeed: "攻撃速度",
  attackboost: "攻撃上昇量",
  movementspeed: "移動速度",
  movementspeedincrease: "移動速度上昇",
  movementspeedreduction: "移動速度低下",
  damagereduction: "ダメージ軽減",
  additionaldamage: "追加ダメージ",
  duration: "持続時間",
  range: "範囲",
  explosion: "爆発ダメージ",
  outerring: "外周ダメージ",
  hitboxsize: "命中判定距離",
  casttimefirstcast: "1段目の硬直時間",
  casttimesecondcast: "2段目の硬直時間",
  throwduration: "ふきとばし時間",
  megaevolutionduration: "メガシンカ継続時間",
  spdefreduction: "特防低下量",
  empoweredautoattack: "強化通常攻撃",
  slow: "移動速度低下",
  effect: "効果",
  neweffect: "追加効果",
  unitecharge: "ユナイト技の必要量",
  energyrequired: "必要エナジー",
  energyneeded: "必要エナジー",
  energyrequirementdecreased: "必要エナジーを減少",
  energyrequirementincreased: "必要エナジーを増加",
  criticalchance: "急所率",
  lifesteal: "HP吸収",
  notes: "内容",
  note: "内容",
  bugfix: "不具合修正",
  effectadded: "追加効果",
  mechanichange: "仕様変更",
  moveslearnedlevels: "技の習得レベル"
};

function normalizedPatchField(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function jpPatchField(value) {
  const raw = String(value || "").trim();
  const normalized = normalizedPatchField(raw);
  if (PATCH_FIELD_JA[normalized]) return PATCH_FIELD_JA[normalized];
  const levelMatch = raw.match(/^(?:Level|Lvl|Lv)\s*(\d+)$/i);
  if (levelMatch) return `Lv${levelMatch[1]}`;
  if (/^Damage\b/i.test(raw)) return `ダメージ${/First/i.test(raw) ? "・初撃" : /Second/i.test(raw) ? "・2撃目" : /Third/i.test(raw) ? "・3撃目" : /Boosted/i.test(raw) ? "・強化攻撃" : /Additional/i.test(raw) ? "・追加" : ""}`;
  if (/^Healing\b/i.test(raw)) return "回復量";
  if (/^Shield\b/i.test(raw)) return "シールド量";
  if (/Cooldown/i.test(raw)) return /increase/i.test(raw) ? "待ち時間を延長" : /decrease|reduce/i.test(raw) ? "待ち時間を短縮" : "待ち時間";
  if (/Movement Speed/i.test(raw)) return "移動速度";
  if (/Attack Speed/i.test(raw)) return "攻撃速度";
  if (/Damage Reduction/i.test(raw)) return "ダメージ軽減";
  if (/Energy|Charge/i.test(raw)) return "必要量";
  return "調整値";
}

function jpPatchMoveName(value) {
  const raw = String(value || "").replace(/\\?\[[^\]]+\]/g, "").replace(/[:：\s]+$/g, "").trim();
  const plus = /\+$/.test(raw) ? "+" : "";
  const cleaned = raw.replace(/^Unite Move:\s*/i, "").replace(/\+$/, "").trim();
  const generic = {
    "General Adjustments": "全般",
    "Natural Stats": "能力値",
    "Stat Changes": "能力値",
    "Stats": "能力値",
    "Progression": "成長・習得レベル",
    "Auto Attack": "通常攻撃",
    "Auto Attacks": "通常攻撃",
    "Boosted Attack": "強化攻撃",
    "Boosted Attacks": "強化攻撃",
    "BUGFIXES": "不具合修正"
  };
  if (generic[cleaned]) return `${generic[cleaned]}${plus}`;
  const translated = state.moveNamesJa[cleaned] || state.moveNamesJa[raw];
  return translated && !hasUntranslatedPatchText(translated) ? `${translated.replace(/\+$/, "")}${plus}` : plus ? `技・特性${plus}` : "技・特性";
}

function hasUntranslatedPatchText(value) {
  return /[A-Za-z]/.test(String(value || "")
    .replace(/\b(?:HP|FPS)\b/gi, "")
    .replace(/\bLv(?=\d)/gi, "")
    .replace(/\b\d+(?:\.\d+)?m\b/gi, ""));
}

function translatePatchTokens(value) {
  return String(value || "")
    .replace(/->|→/g, " → ")
    .replace(/Target Missing HP/gi, "相手の減少HP")
    .replace(/Target Max HP/gi, "相手の最大HP")
    .replace(/Max HP/gi, "最大HP")
    .replace(/Damage Dealt/gi, "与えたダメージ")
    .replace(/Wild Pok[eé]mon/gi, "野生ポケモン")
    .replace(/Sp\.\s*Atk|SpAtk|SAtk|SpA\b/gi, "特攻")
    .replace(/Sp\.\s*Def|SpDef|SpD\b/gi, "特防")
    .replace(/\bAtk\b/gi, "攻撃")
    .replace(/\bDef\b/gi, "防御")
    .replace(/\b(?:Level|Lvl|Lv)\s*(\d+)/gi, "Lv$1")
    .replace(/\bper second\b/gi, "1秒ごと")
    .replace(/\bper hit\b/gi, "1ヒットごと")
    .replace(/\bper tick\b/gi, "1回ごと")
    .replace(/\bper stack\b/gi, "1段階ごと")
    .replace(/\bmax\b/gi, "最大")
    .replace(/\bAdditional\b/gi, "追加")
    .replace(/\bdamage\b/gi, "ダメージ")
    .replace(/Frames from (?:cast|first hit) until movement/gi, "フレーム")
    .replace(/Frames until movement/gi, "フレーム")
    .replace(/\bFaster\b/gi, "短縮")
    .replace(/\bunchanged\b/gi, "変更なし")
    .replace(/(\d+(?:\.\d+)?)s\b/gi, "$1秒")
    .replace(/\s+/g, " ")
    .trim();
}

function patchStatusFallback(status) {
  if (status === "buff") return "効果を強化";
  if (status === "nerf") return "効果を弱体化";
  if (status === "bugfix") return "不具合を修正";
  if (status === "rework") return "効果・挙動の仕様を変更";
  if (status === "new") return "新しい効果を追加";
  return "効果・挙動を調整";
}

function jpPatchDetail(line, status) {
  const raw = String(line || "").trim();
  if (!raw) return "";
  if (/fixed (?:a |an )?bug|bug ?fix/i.test(raw)) return "不具合を修正";
  const colonIndex = raw.indexOf(":");
  const field = colonIndex >= 0 ? raw.slice(0, colonIndex) : "";
  const value = colonIndex >= 0 ? raw.slice(colonIndex + 1).trim() : raw;
  const fieldJa = field ? jpPatchField(field) : "";
  const translatedValue = translatePatchTokens(value);
  if (hasUntranslatedPatchText(translatedValue)) {
    return fieldJa ? `${fieldJa}: ${patchStatusFallback(status)}` : patchStatusFallback(status);
  }
  let translated = fieldJa ? (translatedValue ? `${fieldJa}: ${translatedValue}` : fieldJa) : translatedValue;
  if (!hasUntranslatedPatchText(translated)) return translated;

  if (/\s(?:->|→)\s/.test(raw)) {
    const sides = raw.split(/\s*(?:->|→)\s*/).map((side) => translatePatchTokens(side));
    const numericSides = sides.map((side) => {
      if (!hasUntranslatedPatchText(side)) return side;
      const parts = side.match(/[+-]?\d+(?:\.\d+)?%?|最大HP|相手の最大HP|攻撃|特攻|防御|特防|\d+(?:\.\d+)?秒/g);
      return parts ? parts.join(" ") : "変更値";
    });
    return `${fieldJa || "調整値"}: ${numericSides.join(" → ")}`;
  }
  return patchStatusFallback(status);
}

function pokemonThumbUrl(name) {
  const fileName = encodeURIComponent(name).replace(/%20/g, "+");
  return `https://d275t8dp8rxb42.cloudfront.net/pokemon/thumbnail/${fileName}.png`;
}

function heldItemIconUrl(name) {
  const fileName = encodeURIComponent(name).replace(/%20/g, "+");
  return `https://d275t8dp8rxb42.cloudfront.net/items/held/${fileName}.png`;
}

function createHeldItemIcon(name) {
  if (!name) {
    const placeholder = document.createElement("span");
    placeholder.className = "held-item-icon-placeholder";
    placeholder.textContent = "-";
    return placeholder;
  }

  const image = document.createElement("img");
  image.className = "held-item-icon";
  image.src = heldItemIconUrl(name);
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.src = brokenImageUrl();
  }, { once: true });
  return image;
}

function closeHeldItemPickers(except = null) {
  document.querySelectorAll(".held-item-picker").forEach((picker) => {
    if (picker === except) return;
    const trigger = picker.querySelector(".held-item-trigger");
    const menu = picker.querySelector(".held-item-menu");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    picker.closest(".item-row")?.classList.remove("held-item-open");
  });
}

function requiredHeldItemForPokemon(pokemonName) {
  return Object.keys(EXCLUSIVE_HELD_ITEM_OWNERS)
    .find((itemName) => EXCLUSIVE_HELD_ITEM_OWNERS[itemName] === pokemonName) || "";
}

function exclusiveHeldItemLabel(itemName) {
  const owner = EXCLUSIVE_HELD_ITEM_OWNERS[itemName];
  return owner ? `${jpItemName(itemName)}（${jpPokemonName(owner)}専用）` : jpItemName(itemName);
}

function syncHeldItemPicker(select) {
  const picker = select.closest(".held-item-picker");
  if (!picker) return;
  const selected = select.options[select.selectedIndex] || select.options[0];
  const value = selected ? selected.value : "";
  const locked = select.dataset.heldItemLocked === "true";
  const label = locked && value ? `${jpItemName(value)}（専用・固定）` : selected ? selected.textContent : "なし";
  const trigger = picker.querySelector(".held-item-trigger");
  const name = picker.querySelector(".held-item-trigger-name");
  const icon = picker.querySelector(".held-item-trigger-icon");
  const chevron = picker.querySelector(".held-item-chevron");
  if (name) name.textContent = label;
  if (icon) icon.replaceChildren(createHeldItemIcon(value));
  picker.querySelectorAll(".held-item-option").forEach((option) => {
    const nativeOption = [...select.options].find((entry) => entry.value === option.dataset.value);
    const optionName = option.querySelector("span:last-child");
    if (optionName && nativeOption) optionName.textContent = nativeOption.textContent;
    option.disabled = locked || Boolean(nativeOption && nativeOption.disabled);
    option.setAttribute("aria-disabled", option.disabled ? "true" : "false");
    option.setAttribute("aria-selected", option.dataset.value === value ? "true" : "false");
    option.title = nativeOption ? nativeOption.title : "";
  });
  if (chevron) chevron.textContent = locked ? "🔒" : "▼";
  if (trigger) {
    trigger.disabled = locked;
    trigger.setAttribute("aria-label", locked ? `${jpItemName(value)}は専用持ち物のため外せません` : "持ち物を選択");
    trigger.title = locked ? `${jpItemName(value)}は${jpPokemonName(EXCLUSIVE_HELD_ITEM_OWNERS[value])}の必須持ち物です` : label;
  }
  picker.closest(".item-row")?.classList.toggle("held-item-required", locked);
}

function enforceHeldItemRestrictions(pokemonName, selectPrefix) {
  const selects = Array.from({ length: 3 }, (_, index) => el[`${selectPrefix}${index}`]);
  const levelPrefix = selectPrefix.replace(/Select$/, "Level");
  const requiredItem = requiredHeldItemForPokemon(pokemonName);
  const selectedValues = selects.map((select) => select.value);

  if (requiredItem && selectedValues[0] !== requiredItem) {
    const regularItems = selectedValues
      .filter((itemName) => itemName && !EXCLUSIVE_HELD_ITEM_OWNERS[itemName])
      .slice(0, 2);
    selects[0].value = requiredItem;
    selects[1].value = regularItems[0] || "";
    selects[2].value = regularItems[1] || "";
  }

  selects.forEach((select, index) => {
    if (index > 0 && EXCLUSIVE_HELD_ITEM_OWNERS[select.value]) select.value = "";
    if (!requiredItem && EXCLUSIVE_HELD_ITEM_OWNERS[select.value]) select.value = "";

    const locked = Boolean(requiredItem && index === 0);
    select.dataset.heldItemLocked = locked ? "true" : "false";
    select.disabled = locked;
    const levelInput = el[`${levelPrefix}${index}`];
    levelInput.disabled = locked;
    levelInput.title = locked ? `${jpItemName(requiredItem)}は専用持ち物のためレベルも固定です` : "";
    levelInput.parentElement?.classList.toggle("held-item-level-locked", locked);

    [...select.options].forEach((option) => {
      if (!option.dataset.baseLabel) option.dataset.baseLabel = option.textContent;
      const owner = EXCLUSIVE_HELD_ITEM_OWNERS[option.value];
      option.textContent = owner ? exclusiveHeldItemLabel(option.value) : option.dataset.baseLabel;
      option.disabled = Boolean(owner);
      option.title = owner ? `${jpItemName(option.value)}は${jpPokemonName(owner)}専用です` : "";
    });
    syncHeldItemPicker(select);
  });
}

function enhanceHeldItemSelect(select) {
  if (!select || select.dataset.heldItemPickerReady === "true") return;
  select.dataset.heldItemPickerReady = "true";
  select.classList.add("held-item-native");
  select.tabIndex = -1;

  const picker = document.createElement("div");
  picker.className = "held-item-picker";
  select.parentNode.insertBefore(picker, select);
  picker.appendChild(select);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "held-item-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", "持ち物を選択");

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "held-item-trigger-icon";
  const triggerName = document.createElement("span");
  triggerName.className = "held-item-trigger-name";
  const chevron = document.createElement("span");
  chevron.className = "held-item-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▼";
  trigger.append(triggerIcon, triggerName, chevron);

  const menu = document.createElement("div");
  menu.className = "held-item-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  [...select.options].forEach((nativeOption) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "held-item-option";
    option.setAttribute("role", "option");
    option.dataset.value = nativeOption.value;
    const optionName = document.createElement("span");
    optionName.textContent = nativeOption.textContent;
    option.append(createHeldItemIcon(nativeOption.value), optionName);
    option.addEventListener("click", () => {
      if (nativeOption.disabled || select.disabled) return;
      select.value = nativeOption.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncHeldItemPicker(select);
      closeHeldItemPickers();
      trigger.focus();
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    const willOpen = menu.hidden;
    closeHeldItemPickers(willOpen ? picker : null);
    menu.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    picker.closest(".item-row")?.classList.toggle("held-item-open", willOpen);
  });
  select.addEventListener("change", () => syncHeldItemPicker(select));
  picker.append(trigger, menu);
  syncHeldItemPicker(select);
}

function createPokemonSelectIcon(name) {
  if (!name) {
    const placeholder = document.createElement("span");
    placeholder.className = "pokemon-select-icon-placeholder";
    placeholder.textContent = "-";
    return placeholder;
  }

  const image = document.createElement("img");
  image.className = "pokemon-select-icon";
  image.src = pokemonThumbUrl(name);
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.src = brokenImageUrl();
  }, { once: true });
  return image;
}

function closePokemonSelectPickers(except = null) {
  document.querySelectorAll(".pokemon-select-picker").forEach((picker) => {
    if (picker === except) return;
    const trigger = picker.querySelector(".pokemon-select-trigger");
    const menu = picker.querySelector(".pokemon-select-menu");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    picker.classList.remove("open");
  });
}

function syncPokemonSelectPicker(select) {
  const picker = select.closest(".pokemon-select-picker");
  if (!picker) return;
  const selected = select.options[select.selectedIndex] || select.options[0];
  const value = selected ? selected.value : "";
  const label = selected ? selected.textContent : "なし";
  const trigger = picker.querySelector(".pokemon-select-trigger");
  const name = picker.querySelector(".pokemon-select-trigger-name");
  const icon = picker.querySelector(".pokemon-select-trigger-icon");
  if (name) name.textContent = label;
  if (icon) icon.replaceChildren(createPokemonSelectIcon(value));
  picker.querySelectorAll(".pokemon-select-option").forEach((option) => {
    option.setAttribute("aria-selected", option.dataset.value === value ? "true" : "false");
  });
  if (trigger) trigger.title = label;
}

function enhancePokemonSelect(select, ariaLabel) {
  if (!select || select.dataset.pokemonPickerReady === "true") return;
  select.dataset.pokemonPickerReady = "true";
  select.classList.add("pokemon-select-native");
  select.tabIndex = -1;

  const picker = document.createElement("div");
  picker.className = "pokemon-select-picker";
  select.parentNode.insertBefore(picker, select);
  picker.appendChild(select);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "pokemon-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", ariaLabel);

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "pokemon-select-trigger-icon";
  const triggerName = document.createElement("span");
  triggerName.className = "pokemon-select-trigger-name";
  const chevron = document.createElement("span");
  chevron.className = "pokemon-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▼";
  trigger.append(triggerIcon, triggerName, chevron);

  const menu = document.createElement("div");
  menu.className = "pokemon-select-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", ariaLabel);
  menu.hidden = true;

  [...select.options].forEach((nativeOption) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "pokemon-select-option";
    option.setAttribute("role", "option");
    option.dataset.value = nativeOption.value;
    const optionName = document.createElement("span");
    optionName.textContent = nativeOption.textContent;
    option.append(createPokemonSelectIcon(nativeOption.value), optionName);
    option.addEventListener("click", () => {
      select.value = nativeOption.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncPokemonSelectPicker(select);
      closePokemonSelectPickers();
      trigger.focus();
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", () => {
    const willOpen = menu.hidden;
    closePokemonSelectPickers(willOpen ? picker : null);
    closeHeldItemPickers();
    closeMoveComboboxes();
    menu.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    picker.classList.toggle("open", willOpen);
  });
  select.addEventListener("change", () => syncPokemonSelectPicker(select));
  picker.append(trigger, menu);
  syncPokemonSelectPicker(select);
}

function syncPokemonSelectPickers() {
  document.querySelectorAll("select.pokemon-select-native").forEach(syncPokemonSelectPicker);
}

function brokenImageUrl() {
  return "https://d275t8dp8rxb42.cloudfront.net/icons/broken-link-icon.jpg";
}

function bindElements() {
  [
    "loading", "loadingStatus", "loadingDetail", "retryLoadButton",
    "errorBox", "calculator", "damageTabButton", "rankingTabButton", "healingRankingTabButton", "slowRankingTabButton", "accelerationRankingTabButton", "shieldTabButton", "healingTabButton", "balanceTabButton",
    "calculatorNavigation", "navigationMenuButton", "navigationMenu", "calculatorViewTitle",
    "calculationMenuButton", "calculationSubmenu", "rankingMenuButton", "rankingSubmenu",
    "damagePanel", "rankingPanel", "healingRankingPanel", "slowRankingPanel", "accelerationRankingPanel", "shieldPanel", "healingPanel", "balancePanel",
    "modeToggleButton", "themeSelect",
    "pokemonSelect", "levelRange", "levelValue",
    "moveChoices", "applyBuildButton", "clearItemsButton", "targetSelect",
    "targetLevelRange", "targetLevelValue", "targetFalinksDamageRow", "targetFalinksDamageTarget",
    "targetHpMode", "targetHpValue", "targetHpSummary", "targetDefense", "targetSpDefense",
    "rawDamage", "rawDamageFormula", "rawDamageResult",
    "finalDamage", "finalDamageFormula", "finalDamageResult",
    "damageStatusBody", "damageStatusValueBody", "damageAdjustmentCard", "damageAdjustmentBody", "learnChipRow", "manualAttack", "manualHp",
    "manualSpAttack", "manualDamagePercent", "manualExtraDamage", "criticalHit",
    "manualDefenseReductionPercent", "manualSpDefenseReductionPercent", "manualDefenseReductionFlat", "manualSpDefenseReductionFlat",
    "manualDefenseIgnorePercent", "manualSpDefenseIgnorePercent", "manualDefensePenetrationFlat", "manualSpDefensePenetrationFlat",
    "defenseEffectControls", "defenseEffectList", "defenseEffectNote",
    "conditionYveltalMarks", "yveltalMarkStacks", "yveltalDarkAuraNote", "conditionSnorlaxFlailHp", "snorlaxFlailHpPercent", "snorlaxFlailMaxHpNote",
    "conditionSylveonHyperVoice", "sylveonHyperVoiceRange",
    "conditionDamageVariant", "damageVariantSelect", "damageConditionPanel",
    "conditionPlusPower", "conditionChoiceSpecs", "conditionChargingCharm", "conditionRazorClaw", "conditionEnergyAmp",
    "attackWeightStacks", "aeosCookieStacks", "spAtkSpecsStacks", "weaknessPolicyStacks",
    "accelBracerStacks", "driveLensStacks", "plusPowerProc", "choiceSpecsProc",
    "chargingCharmProc", "razorClawProc", "energyAmpProc",
    "applyEmblemButton", "clearEmblemButton", "emblemSlots", "emblemSlotCount",
    "emblemEditor", "emblemEditorTitle", "emblemEditorDone", "emblemEditorIcon", "emblemEditorPlaceholder",
    "emblemEditorColors", "emblemEditorSpecies", "emblemEditorSuggestions", "emblemEditorGrade", "emblemEditorClear",
    "emblemStatEffects", "emblemColorEffects",
    "regidragoBuff", "groudonBuff", "rayquazaBuff",
    "shieldPokemonSelect",
    "shieldLevelRange", "shieldLevelValue", "shieldMoveChoices",
    "shieldApplyBuildButton", "shieldClearItemsButton",
    "shieldConditionAttackWeight", "shieldAttackWeightStacks",
    "shieldConditionSpAtkSpecs", "shieldSpAtkSpecsStacks",
    "shieldConditionWeaknessPolicy", "shieldWeaknessPolicyStacks",
    "shieldConditionAccelBracer", "shieldAccelBracerStacks",
    "shieldConditionDriveLens", "shieldDriveLensStacks", "shieldConditionPanel",
    "shieldManualAttack", "shieldManualSpAttack", "shieldManualHp", "manualShieldPercent",
    "manualShieldFlat", "shieldCount", "shieldCountLabel",
    "shieldTargetTotalGrid", "shieldSelfResultCard", "shieldAllyResultCard",
    "shieldSelfAmount", "shieldSelfFormula", "shieldSelfResult",
    "shieldAllyAmount", "shieldAllyFormula", "shieldAllyResult",
    "shieldStatusBody", "shieldStatusValueBody", "shieldAdjustmentCard", "shieldAdjustmentBody", "shieldLearnChipRow",
    "healingPokemonSelect",
    "healingLevelRange", "healingLevelValue", "healingMoveChoices", "healingEffectRow", "healingEffectSelect",
    "healingApplyBuildButton", "healingClearItemsButton",
    "healingConditionAttackWeight", "healingAttackWeightStacks",
    "healingConditionSpAtkSpecs", "healingSpAtkSpecsStacks",
    "healingConditionWeaknessPolicy", "healingWeaknessPolicyStacks",
    "healingConditionAccelBracer", "healingAccelBracerStacks",
    "healingConditionDriveLens", "healingDriveLensStacks", "healingConditionPanel",
    "healingManualAttack", "healingManualSpAttack",
    "manualHealingPercent", "manualHealingFlat", "healingCount",
    "healingSelfAmount", "healingSelfFormula", "healingSelfResult",
    "healingAllyAmount", "healingAllyFormula", "healingAllyResult",
    "healingStatusBody", "healingStatusValueBody", "healingAdjustmentCard", "healingAdjustmentBody", "healingLearnChipRow",
    "rankingLevelRange", "rankingLevelValue", "rankingTargetSelect", "rankingTargetLevelRange",
    "rankingTargetLevelValue", "rankingSlotFilter", "rankingLimitSelect", "rankingSingleHit", "rankingSummary", "rankingBody",
    "healingRankingLevelRange", "healingRankingLevelValue", "healingRankingLimitSelect", "healingRankingBody",
    "slowFilterOptions", "slowRankingSortOrder", "slowFilterStatus", "slowRankingBody",
    "accelerationFilterOptions", "accelerationRankingSortOrder", "accelerationFilterStatus", "accelerationRankingBody",
    "balancePokemonSelect", "balanceSummary", "balanceFilterOptions", "balanceFilterStatus", "balanceFilterClearButton",
    "balancePokemonHeading", "balanceTimeline",
    "openFeedbackButton", "closeFeedbackButton", "feedbackDialog",
    "feedbackForm", "feedbackType", "feedbackNickname", "feedbackSummary",
    "feedbackDetails", "feedbackExpected", "feedbackIncludeContext",
    "feedbackIssueTitle", "feedbackIssueBody", "copyFeedbackButton", "feedbackStatus"
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });

  for (let i = 0; i < 3; i += 1) {
    el[`itemSelect${i}`] = document.getElementById(`itemSelect${i}`);
    el[`itemLevel${i}`] = document.getElementById(`itemLevel${i}`);
    el[`shieldItemSelect${i}`] = document.getElementById(`shieldItemSelect${i}`);
    el[`shieldItemLevel${i}`] = document.getElementById(`shieldItemLevel${i}`);
    el[`healingItemSelect${i}`] = document.getElementById(`healingItemSelect${i}`);
    el[`healingItemLevel${i}`] = document.getElementById(`healingItemLevel${i}`);
  }
}

function setLoadingStatus(message, detail) {
  if (!el.loadingStatus || !el.loadingDetail) return;
  el.loading.classList.remove("failed");
  el.loadingStatus.textContent = message;
  el.loadingDetail.textContent = detail || "通常は数秒で計算画面に切り替わります。";
  el.retryLoadButton.hidden = true;
}

function showLoadError(error) {
  const message = error && error.message ? error.message : String(error);
  el.loading.hidden = false;
  el.loading.classList.add("failed");
  el.loadingStatus.textContent = "データを読み込めませんでした";
  el.loadingDetail.textContent = `${message}。GitHub Pagesに data フォルダごとアップロードされているか確認してください。`;
  el.retryLoadButton.hidden = false;
  el.errorBox.hidden = true;
  el.calculator.hidden = true;
}

function closeCalculatorNavigation(restoreFocus = false) {
  if (!el.navigationMenu || !el.navigationMenuButton) return;
  el.navigationMenu.hidden = true;
  el.navigationMenuButton.setAttribute("aria-expanded", "false");
  el.navigationMenuButton.setAttribute("aria-label", "画面メニューを開く");
  if (restoreFocus) el.navigationMenuButton.focus();
}

function setNavigationGroupExpanded(groupName, expanded) {
  const group = NAVIGATION_GROUPS[groupName];
  if (!group) return;
  el[group.buttonId].setAttribute("aria-expanded", String(expanded));
  el[group.submenuId].hidden = !expanded;
}

function toggleNavigationGroup(groupName) {
  const group = NAVIGATION_GROUPS[groupName];
  if (!group) return;
  const shouldExpand = el[group.buttonId].getAttribute("aria-expanded") !== "true";
  Object.keys(NAVIGATION_GROUPS).forEach((name) => {
    setNavigationGroupExpanded(name, name === groupName && shouldExpand);
  });
}

function syncNavigationGroups(expandActive = false) {
  let activeGroupName = "";
  Object.entries(NAVIGATION_GROUPS).forEach(([groupName, group]) => {
    const active = group.tabs.includes(state.activeTab);
    el[group.buttonId].classList.toggle("active", active);
    if (active) activeGroupName = groupName;
  });

  if (expandActive) {
    Object.keys(NAVIGATION_GROUPS).forEach((groupName) => {
      setNavigationGroupExpanded(groupName, groupName === activeGroupName);
    });
  }
}

function visibleNavigationMenuItems() {
  return [...el.navigationMenu.querySelectorAll('[role="menuitem"]')]
    .filter((item) => !item.closest(".navigation-submenu[hidden]"));
}

function openCalculatorNavigation() {
  if (!el.navigationMenu || !el.navigationMenuButton) return;
  closeHeldItemPickers();
  closePokemonSelectPickers();
  closeMoveComboboxes();
  el.navigationMenu.hidden = false;
  el.navigationMenuButton.setAttribute("aria-expanded", "true");
  el.navigationMenuButton.setAttribute("aria-label", "画面メニューを閉じる");
  syncNavigationGroups(true);
  const activeView = CALCULATOR_VIEWS[state.activeTab] || CALCULATOR_VIEWS.damage;
  el[activeView.buttonId].focus();
}

function toggleCalculatorNavigation() {
  if (el.navigationMenu.hidden) {
    openCalculatorNavigation();
  } else {
    closeCalculatorNavigation(true);
  }
}

function selectCalculatorTab(tabName) {
  const selectedTab = CALCULATOR_VIEWS[tabName] ? tabName : "damage";
  state.activeTab = selectedTab;

  Object.entries(CALCULATOR_VIEWS).forEach(([name, view]) => {
    const active = name === selectedTab;
    el[view.panelId].hidden = !active;
    el[view.buttonId].classList.toggle("active", active);
    if (active) {
      el[view.buttonId].setAttribute("aria-current", "page");
    } else {
      el[view.buttonId].removeAttribute("aria-current");
    }
  });

  el.calculatorViewTitle.textContent = CALCULATOR_VIEWS[selectedTab].title;
  syncNavigationGroups();
  closeCalculatorNavigation();
  if (selectedTab === "ranking") updateDamageRanking();
  if (selectedTab === "healingRanking") updateHealingRanking();
  if (selectedTab === "slowRanking") updateSlowRanking();
  if (selectedTab === "accelerationRanking") updateAccelerationRanking();
  if (selectedTab === "shield") updateShieldAll();
  if (selectedTab === "healing") updateHealingAll();
  if (selectedTab === "balance") updateBalanceTimeline();
}
