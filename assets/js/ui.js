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
  movementspeedboost: "移動速度上昇率",
  movementspeedbuff: "移動速度上昇率",
  attackspeedboost: "攻撃速度上昇率",
  damageresistance: "ダメージ軽減率",
  damageresistancebuff: "ダメージ軽減効果",
  damagereduction: "ダメージ軽減率",
  damagereductionfromthefront: "正面から受けるダメージの軽減率",
  damageoutputdebuff: "与ダメージ低下率",
  damageincreasedebuff: "被ダメージ増加率",
  missingdamage: "減少HP割合ダメージ",
  shieldandduration: "シールド量・持続時間",
  additionaldamagenoretreatformation: "はいすいのじん中の追加ダメージ",
  additionaldamage: "追加ダメージ",
  duration: "持続時間",
  range: "範囲",
  explosion: "爆発ダメージ",
  outerring: "外周ダメージ",
  hitboxsize: "命中判定距離",
  casttimefirstcast: "1段目の硬直時間",
  casttimesecondcast: "2段目の硬直時間",
  casttimeandrecoverytime: "発動・終了時の硬直時間",
  recoverytime: "終了時の硬直時間",
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
  extra: "追加分",
  maxstacks: "最大段階数",
  unitechargegainedpersecond: "ユナイト技ゲージの時間経過による獲得量",
  unitechargegainedfrommovehits: "ユナイト技ゲージの技命中による獲得量",
  unitebuffs5s: "ユナイト技使用後の効果（5秒間）",
  clonesearchrange: "分身の索敵距離",
  clonesearchradius: "分身の索敵半径",
  clonetraveldistance: "分身の移動距離",
  stackingslow: "重複する移動速度低下率",
  critrateboost: "急所率上昇量",
  uniteautoattacklifesteal: "ユナイト技中の通常攻撃によるHP吸収率",
  subsequenthitdamagepenalty: "2撃目以降のダメージ減衰率",
  subsequenthealingpenalty: "2回目以降の回復量減衰率",
  bugfix: "不具合修正",
  effectadded: "追加効果",
  mechanicchange: "仕様変更",
  moveslearnedlevels: "技の習得レベル"
};

const PATCH_ACTION_JA = {
  increased: "を増加",
  boosted: "を増加",
  decreased: "を減少",
  reduced: "を減少",
  lowered: "を低下",
  raised: "を増加",
  added: "を追加",
  introduced: "を追加",
  removed: "を削除",
  changed: "を変更",
  adjusted: "を調整",
  normalized: "を統一",
  extended: "を延長",
  shortened: "を短縮"
};

const PATCH_DETAIL_OVERRIDES_JA = {
  "Increasing the hitbox size without increasing the initiating range makes it a lot less likely for Palkia to miss auto attacks now.": "攻撃開始時の射程は変わらないが、命中判定の拡大によって通常攻撃が外れにくくなった。",
  "(Previously undocumented): If detect was used without blocking any damage, the dash distance was longer. This is no longer the case.": "（以前は未記載）ダメージを防がずに「みきり」を使った場合だけダッシュ距離が伸びる効果を削除。",
  "Mechanic Change: Fear in the direction Skeledirge was aiming -> Fear away from Skeledirge's position.": "仕様変更: 恐怖状態で移動する方向を、ラウドボーンが狙った方向から、ラウドボーンから離れる方向へ変更。",
  "Fear in the direction Skeledirge was aiming -> Fear away from Skeledirge's position.": "恐怖状態で移動する方向を、ラウドボーンが狙った方向から、ラウドボーンから離れる方向へ変更。",
  "The healing from the second circle overlapping is now half of the value instead of the full value": "2つ目の円が重なったときの回復量を、通常時と同量から半分に減少。",
  "Fixed a bug where landing Pay Day from a certain distance would not increase the coin mark.": "「ネコにこばん」を特定の距離から命中させると、コインマークが増えない不具合を修正。",
  "60 -> 100 (Move size is not affected beyond 60 stacks)": "60 → 100（技の大きさは60段階を超えても変化しない）",
  "Tldr; these changes nerf the relative % gain from scoring, wild KO's or being KO'd yourself, while keeping the overall fast pace of the unite charge (34s) and the amount gained from hitting with moves.": "ゴール、野生ポケモンのKO、自身のKOによるユナイト技ゲージ獲得割合を低下。技命中時の獲得量と、最短34秒の回転率は維持。",
  "10m -> 5m (note: the search radius may actually be smaller than 5m)": "10m → 5m（実際の索敵半径は5m未満の可能性あり）",
  "Reverted back to 4 rotating hitboxes.": "回転する4つの命中判定へ戻した。"
};

const PATCH_MOVE_NAME_JA = {
  "Spinning Edge": "スピニングエッジ",
  "Shell Armor": "シェルアーマー",
  "Flame Body": "ほのおのからだ",
  "Pixilate": "フェアリースキン",
  "Mold Breaker": "かたやぶり",
  "Solar Power": "サンパワー",
  "Tough Claws": "かたいツメ",
  "Infiltrator": "すりぬけ",
  "Mega Close Combat": "メガインファイト",
  "Mega Flamethrower": "メガかえんほうしゃ",
  "Rough Skin": "さめはだ",
  "Mega Dragon Breath": "メガりゅうのいぶき"
};

function cleanPatchMarkdown(value) {
  return String(value || "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/~~|[*_`]/g, "")
    .replace(/\\([\[\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPatchField(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function jpPatchField(value) {
  const raw = cleanPatchMarkdown(value).replace(/[:：\s]+$/g, "").trim();
  const normalized = normalizedPatchField(raw);
  if (PATCH_FIELD_JA[normalized]) return PATCH_FIELD_JA[normalized];
  const levelMatch = raw.match(/^(?:Level|Lvl|Lv)\s*(\d+)$/i);
  if (levelMatch) return `Lv${levelMatch[1]}`;

  const actionMatch = raw.match(/^(.*?)\s+(increased|boosted|decreased|reduced|lowered|raised|added|introduced|removed|changed|adjusted|normalized|extended|shortened)\.?$/i);
  if (actionMatch) {
    const subject = jpPatchField(actionMatch[1]);
    const action = PATCH_ACTION_JA[actionMatch[2].toLowerCase()];
    if (!/^調整項目/.test(subject)) return `${subject}${action}`;
  }

  if (/^Damage (?:Resistance|Reduction)\b/i.test(raw)) {
    const condition = raw.replace(/^Damage (?:Resistance|Reduction)(?: Buff)?\s*/i, "").trim();
    return condition ? `ダメージ軽減率（${translatePatchQualifier(condition)}）` : "ダメージ軽減率";
  }
  const damageMatch = raw.match(/^(?:\(?(?:NEW|ADDED)\)?\s+)?Damage(?:\s*[-:]\s*|\s*\((.+)\)\s*|\s+)(.*)?$/i);
  if (damageMatch) {
    const qualifier = (damageMatch[1] || damageMatch[2] || "").replace(/^[-\s]+/, "").trim();
    return qualifier ? `ダメージ（${translatePatchQualifier(qualifier)}）` : "ダメージ";
  }
  const healingMatch = raw.match(/^(?:\(?(?:NEW|ADDED)\)?\s+)?(?:Healing|Heal)(?:\s*[-:]\s*|\s*\((.+)\)\s*|\s+)(.*)?$/i);
  if (healingMatch) {
    const qualifier = (healingMatch[1] || healingMatch[2] || "").replace(/^[-\s]+/, "").trim();
    return qualifier ? `回復量（${translatePatchQualifier(qualifier)}）` : "回復量";
  }
  const shieldMatch = raw.match(/^(?:\(?(?:NEW|ADDED)\)?\s+)?(?:Overheal )?Shield(?:ing)?(?:\s*[-:]\s*|\s*\((.+)\)\s*|\s+)(.*)?$/i);
  if (shieldMatch) {
    const qualifier = (shieldMatch[1] || shieldMatch[2] || "").replace(/^[-\s]+/, "").trim();
    return qualifier ? `シールド量（${translatePatchQualifier(qualifier)}）` : "シールド量";
  }

  const translated = translatePatchTokens(raw);
  return hasUntranslatedPatchText(translated) ? `調整項目（${raw}）` : translated;
}

function jpPatchMoveName(value) {
  const raw = cleanPatchMarkdown(value).replace(/\[[^\]]+\]/g, "").replace(/[:：\s]+$/g, "").trim();
  const plus = /\+$/.test(raw) ? "+" : "";
  const hasUnitePrefix = /^Unite(?: Move)?(?::|$)/i.test(raw);
  const cleaned = raw
    .replace(/^(?:Ability|Passive):\s*/i, "")
    .replace(/^Unite Move:\s*/i, "")
    .replace(/\s+\((?:Scyther|Scizor)\)$/i, "")
    .replace(/\+$/, "")
    .trim();
  const generic = {
    "General Adjustments": "全般",
    "Natural Stats": "能力値",
    "Stat Changes": "能力値",
    "Stats": "能力値",
    "Progression": "成長・習得レベル",
    "Auto Attack": "通常攻撃",
    "Auto Attacks": "通常攻撃",
    "Basic Attack": "通常攻撃",
    "Basic Attacks": "通常攻撃",
    "Attack": "通常攻撃",
    "Attack & Boosted Attack": "通常攻撃・強化攻撃",
    "Basic & Boosted Attack": "通常攻撃・強化攻撃",
    "Boosted Attack": "強化攻撃",
    "Boosted Attacks": "強化攻撃",
    "Held Item Adjustment": "もちもの",
    "Evolution Level": "進化レベル",
    "Evolution Levels": "進化レベル",
    "Added to the game": "新規追加",
    "Has Been Added To The Game": "新規追加",
    "BUGFIXES": "不具合修正"
  };
  if (generic[cleaned]) return `${generic[cleaned]}${plus}`;
  if (hasUnitePrefix && !cleaned) return "ユナイト技";
  const normalized = normalizedPatchField(cleaned);
  const translatedEntry = Object.entries(state.moveNamesJa || {}).find(([name]) => normalizedPatchField(name) === normalized);
  const translated = PATCH_MOVE_NAME_JA[cleaned] || state.moveNamesJa[cleaned] || state.moveNamesJa[raw] || (translatedEntry && translatedEntry[1]);
  if (translated && !hasUntranslatedPatchText(translated)) return `${translated.replace(/\+$/, "")}${plus}`;
  return `${hasUnitePrefix ? "ユナイト技" : "技・特性"}（${cleaned || raw}）${plus}`;
}

function hasUntranslatedPatchText(value) {
  return /[A-Za-z]/.test(String(value || "")
    .replace(/\b(?:HP|FPS|KO)\b/gi, "")
    .replace(/\bLv(?=\d)/gi, "")
    .replace(/\b\d+(?:\.\d+)?m\b/gi, ""));
}

let patchMoveTranslationSource = null;
let patchMoveTranslationEntries = [];

function currentPatchMoveTranslationEntries() {
  if (patchMoveTranslationSource !== state.moveNamesJa) {
    patchMoveTranslationSource = state.moveNamesJa;
    patchMoveTranslationEntries = Object.entries(state.moveNamesJa || {})
      .sort(([left], [right]) => right.length - left.length);
  }
  return patchMoveTranslationEntries;
}

function translatePatchTokens(value) {
  let text = cleanPatchMarkdown(value)
    .replace(/[’]/g, "'");

  currentPatchMoveTranslationEntries().forEach(([name, translated]) => {
    if (name.length < 4 || !text.toLowerCase().includes(name.toLowerCase())) return;
    text = text.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), translated);
  });

  return text
    .replace(/-\s*>|→/g, " → ")
    .replace(/(\d+(?:\.\d+)?)%\s+(?:of\s+)?(?:the\s+)?user(?:'s)?\s+Max HP/gi, "自分の最大HPの$1%")
    .replace(/(\d+(?:\.\d+)?)%\s+(?:of\s+)?(?:the\s+)?(?:opponent|enemy)(?:'s)?\s+Max HP/gi, "相手の最大HPの$1%")
    .replace(/(\d+(?:\.\d+)?)%\s+(?:of\s+)?(?:the\s+)?(?:opponent|enemy)(?:'s)?\s+Missing HP/gi, "相手の減少HPの$1%")
    .replace(/(\d+(?:\.\d+)?)%\s+(?:of\s+)?(?:the\s+)?(?:user(?:'s)?\s+)?Missing HP/gi, "自分の減少HPの$1%")
    .replace(/Target Missing HP/gi, "相手の減少HP")
    .replace(/Target Max HP/gi, "相手の最大HP")
    .replace(/(?:Opponent|Enemy)(?:'s)? Missing HP/gi, "相手の減少HP")
    .replace(/(?:Opponent|Enemy)(?:'s)? Max HP/gi, "相手の最大HP")
    .replace(/User(?:'s)? Missing HP/gi, "自分の減少HP")
    .replace(/User(?:'s)? Max HP/gi, "自分の最大HP")
    .replace(/Remaining HP/gi, "残りHP")
    .replace(/Current HP/gi, "現在HP")
    .replace(/Max HP/gi, "最大HP")
    .replace(/Damage (?:Resistance|Reduction)/gi, "ダメージ軽減率")
    .replace(/Damage Output/gi, "与ダメージ")
    .replace(/Damage Dealt/gi, "与えたダメージ")
    .replace(/Damage Received/gi, "受けたダメージ")
    .replace(/Wild Pok[eé]mon/gi, "野生ポケモン")
    .replace(/Opposing Pok[eé]mon/gi, "相手チームのポケモン")
    .replace(/Allied Pok[eé]mon/gi, "味方のポケモン")
    .replace(/Pok[eé]mon/gi, "ポケモン")
    .replace(/Sp\.\s*Atk|SpAtk|SAtk|SpA\b/gi, "特攻")
    .replace(/Sp\.\s*Def|SpDef|SpD\b/gi, "特防")
    .replace(/Special Attack/gi, "特攻")
    .replace(/Special Defense/gi, "特防")
    .replace(/Attack Speed/gi, "攻撃速度")
    .replace(/Movement Speed/gi, "移動速度")
    .replace(/Cooldown Reduction|\bCDR\b/gi, "待ち時間短縮率")
    .replace(/Cooldown/gi, "待ち時間")
    .replace(/Life ?Steal/gi, "HP吸収")
    .replace(/Critical(?: Hit)? Chance|Crit(?:ical)? Rate|Crit Chance/gi, "急所率")
    .replace(/Critical Hit Damage/gi, "急所ダメージ")
    .replace(/Defense Penetration|Defense Pierce|Defense Pen/gi, "防御貫通")
    .replace(/Defense Reduction|Defense Debuff/gi, "防御低下")
    .replace(/Atk\s+or\s+stored\s+Atk/gi, "自分の攻撃または記録した相手の攻撃")
    .replace(/Attack\s+of\s+(?:the\s+)?Target/gi, "相手の攻撃")
    .replace(/\bAtk\b/gi, "攻撃")
    .replace(/\bDef\b/gi, "防御")
    .replace(/\bAoE\b/gi, "範囲")
    .replace(/\bDoT\b/gi, "継続ダメージ")
    .replace(/\bHoT\b/gi, "継続回復")
    .replace(/\bRSB(?:s)?\b/gi, "計算式")
    .replace(/\bICD\b/gi, "内部待ち時間")
    .replace(/\b(?:Level|Lvl|Lv)\s*(\d+)/gi, "Lv$1")
    .replace(/\bper second\b/gi, "1秒ごと")
    .replace(/\bper hit\b/gi, "1ヒットごと")
    .replace(/\bper tick\b/gi, "1回ごと")
    .replace(/\bper stack\b/gi, "1段階ごと")
    .replace(/\bper (?:Mark|Counter)\b/gi, "1マークごと")
    .replace(/\bper (?:Projectile|Bullet|Blade|Leaf|Shuriken|Punch|Coin|Comet)\b/gi, "1発ごと")
    .replace(/\bup to\s*(\d+)x\b/gi, "最大$1回")
    .replace(/\bx(\d+)\s*(?:hits?|ticks?)\b/gi, "$1回")
    .replace(/\b(\d+)\s*(?:hits?|ticks?)\b/gi, "$1回")
    .replace(/\b(\d+)\s*(?:stacks?)\b/gi, "$1段階")
    .replace(/\b(\d+)\s*(?:marks?|counters?)\b/gi, "$1マーク")
    .replace(/\b(\d+)\s*(?:charges?)\b/gi, "$1チャージ")
    .replace(/\bfor\s+(\d+(?:\.\d+)?)s\b/gi, "$1秒間")
    .replace(/\bagainst wilds?\b/gi, "野生ポケモンに対して")
    .replace(/\bboth values are half\b/gi, "両方の値が半分")
    .replace(/\bFirst Hit\b/gi, "初撃")
    .replace(/\bSecond Hit\b/gi, "2撃目")
    .replace(/\bThird Hit\b/gi, "3撃目")
    .replace(/\bFinal Hit\b/gi, "最終撃")
    .replace(/\bSubsequent Hits?\b/gi, "2撃目以降")
    .replace(/\bBoosted Attack\b/gi, "強化攻撃")
    .replace(/\bBasic Attack\b|\bAuto Attack\b/gi, "通常攻撃")
    .replace(/\bAdditional\b/gi, "追加")
    .replace(/\bInitial\b/gi, "初撃")
    .replace(/\bFinal\b/gi, "最終")
    .replace(/\bExplosion\b/gi, "爆発")
    .replace(/\bProjectile\b/gi, "弾")
    .replace(/\bClose(?:st)?(?: Range)?\b/gi, "近距離")
    .replace(/\bMid(?:dle)?(?: Range)?\b/gi, "中距離")
    .replace(/\bFar(?:thest)?(?: Range)?\b|\bMax Range\b/gi, "遠距離")
    .replace(/\bLow Charge\b|\bMin Charge\b/gi, "低チャージ")
    .replace(/\bMid Charge\b/gi, "中チャージ")
    .replace(/\bMax Charge\b|\bFull Charge\b/gi, "最大チャージ")
    .replace(/\bNo Charge\b|\bUncharged\b/gi, "チャージなし")
    .replace(/\bFull Gauge\b/gi, "ゲージ最大")
    .replace(/\bFighter Mode\b/gi, "ファイターモード")
    .replace(/\bCharged\b/gi, "チャージ時")
    .replace(/\bDestructive Fang\b/gi, "破壊のキバ")
    .replace(/\b(\d+) Fangs?\b/gi, "$1本のキバ")
    .replace(/\bSword Stance\b/gi, "ブレードフォルム")
    .replace(/\bShield Stance\b/gi, "シールドフォルム")
    .replace(/\bQueenly Majesty (?:buff|Buff)\b/gi, "じょおうのいげん発動中")
    .replace(/\bTorrent\b/gi, "げきりゅう発動中")
    .replace(/\bLight Screen Boost\b/gi, "ひかりのかべ強化中")
    .replace(/\bNew\b/gi, "新規")
    .replace(/\band\b/gi, "・")
    .replace(/\bmax\b/gi, "最大")
    .replace(/\bdamage\b/gi, "ダメージ")
    .replace(/\bhealing\b|\bheal\b/gi, "回復量")
    .replace(/\bshield\b/gi, "シールド")
    .replace(/\bduration\b/gi, "持続時間")
    .replace(/\brange\b/gi, "範囲")
    .replace(/\bslow\b/gi, "移動速度低下")
    .replace(/\bstun\b/gi, "行動不能")
    .replace(/\bfear\b/gi, "恐怖")
    .replace(/\bburn\b/gi, "やけど")
    .replace(/\battack\b/gi, "攻撃")
    .replace(/\bdefense\b/gi, "防御")
    .replace(/Frames from (?:cast|first hit) until movement/gi, "フレーム")
    .replace(/Frames until movement/gi, "フレーム")
    .replace(/\bFaster\b/gi, "短縮")
    .replace(/\bunchanged\b/gi, "変更なし")
    .replace(/(\d+(?:\.\d+)?)s\b/gi, "$1秒")
    .replace(/\s*\(\s*/g, "（")
    .replace(/\s*\)\s*/g, "）")
    .replace(/\s*\|\s*/g, "・")
    .replace(/\s*\/\s*/g, "／")
    .replace(/\s*→\s*/g, " → ")
    .replace(/\s+/g, " ")
    .trim();
}

function translatePatchQualifier(value) {
  const translated = translatePatchTokens(value)
    .replace(/\bFirst or Second Mark\b/gi, "1～2個目のマーク")
    .replace(/\bThird Mark\b/gi, "3個目のマーク")
    .replace(/\bper\b/gi, "1回ごと")
    .replace(/\bHit\b/gi, "命中")
    .replace(/\bHits\b/gi, "命中")
    .replace(/\bTick\b/gi, "継続1回")
    .replace(/\bTicks\b/gi, "継続")
    .replace(/\bBasic\b/gi, "通常")
    .replace(/\bBoosted\b/gi, "強化")
    .replace(/\bExecute\b/gi, "とどめ")
    .replace(/\bArea(?: of Effect)?\b/gi, "範囲")
    .replace(/\bOuter Ring\b/gi, "外周")
    .replace(/\bInner Ring\b/gi, "内周")
    .replace(/\bDash\b/gi, "突進")
    .replace(/\bReturn\b/gi, "復路")
    .replace(/\bBackstab\b/gi, "背後命中")
    .replace(/\bRupture\b/gi, "破裂")
    .replace(/\bJab\b/gi, "突き")
    .replace(/\bThrow\b/gi, "投げ")
    .replace(/\bFreezing\b/gi, "凍結")
    .replace(/\bCollision\b/gi, "衝突")
    .replace(/\bDraw\b/gi, "構え")
    .replace(/\bFlurry\b/gi, "連撃")
    .replace(/\bSlash\b/gi, "斬撃")
    .replace(/\bSlam\b/gi, "叩きつけ")
    .replace(/\bShockwave\b/gi, "衝撃波")
    .replace(/\bBeam\b/gi, "ビーム")
    .replace(/\bOrb\b/gi, "弾")
    .replace(/\bCircle\b/gi, "円形範囲")
    .replace(/\bMark\b/gi, "マーク")
    .replace(/\bProc\b/gi, "発動")
    .replace(/\bBase\b/gi, "基本")
    .replace(/\bRegular\b/gi, "通常")
    .replace(/\bEmpowered\b|\bEnhanced\b/gi, "強化時")
    .replace(/\s+/g, " ")
    .trim();
  return translated || "詳細";
}

function patchStatusFallback(status) {
  if (status === "buff") return "効果を強化";
  if (status === "nerf") return "効果を弱体化";
  if (status === "bugfix") return "不具合を修正";
  if (status === "rework") return "効果・挙動の仕様を変更";
  if (status === "new") return "新しい効果を追加";
  return "効果・挙動を調整";
}

function splitPatchTransition(value, allowNumericHyphen = false) {
  const raw = cleanPatchMarkdown(value);
  let sides = raw.split(/\s*(?:-\s*>|→)\s*/);
  if (sides.length < 2 && allowNumericHyphen) {
    const range = raw.match(/^\s*([+-]?\d+(?:\.\d+)?%?)\s*-\s*([+-]?\d+(?:\.\d+)?%?)\s*$/);
    if (range) sides = [range[1], range[2]];
  }
  if (sides.length < 2) return null;
  const cleanSide = (side) => String(side || "")
    .replace(/\([^)]*unchanged[^)]*\)/gi, "")
    .replace(/\bunchanged\b/gi, "")
    .trim();
  const before = cleanSide(sides[0]);
  const after = cleanSide(sides[sides.length - 1]);
  return {
    before: before || after,
    after: after || before
  };
}

function normalizedPatchMoveLookup(value) {
  return normalizedPatchField(cleanPatchMarkdown(value)
    .replace(/\\?\[[^\]]+\]/g, "")
    .replace(/^(?:Unite Move|Ability|Passive):\s*/i, "")
    .replace(/\s+\((?:Scyther|Scizor)\)$/i, "")
    .replace(/\+$/, "")
    .trim());
}

function patchFormulaReference(context = {}, heading = "") {
  const pokemon = (state.pokemon || []).find((entry) => entry.name === context.pokemonName);
  if (!pokemon) return null;
  const rawMove = cleanPatchMarkdown(context.moveName || "")
    .replace(/\\?\[[^\]]+\]/g, "")
    .trim();
  const targetKey = normalizedPatchMoveLookup(rawMove);
  const genericAttack = /^(?:attack|autoattacks?|basicattacks?|boostedattacks?)$/i.test(targetKey);
  const wantsBoosted = /boosted/i.test(rawMove);
  const wantsEnhanced = /\+$/.test(rawMove.replace(/\\?\[[^\]]+\]/g, "").trim());
  const nodes = [];

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if ((value.rsb || value.boosted_rsb) && value.name) {
      const key = normalizedPatchMoveLookup(value.name);
      let score = 0;
      if (key === targetKey) score = 100;
      else if (genericAttack && key === "attack") score = 90;
      else if (targetKey && key && (key.includes(targetKey) || targetKey.includes(key))) score = 40;
      if (score) nodes.push({ node: value, score });
    }
    if (Array.isArray(value.skills)) visit(value.skills);
    if (Array.isArray(value.upgrades)) visit(value.upgrades);
  };
  visit(pokemon);
  const match = nodes.sort((left, right) => right.score - left.score)[0];
  if (!match) return null;

  const rsbRows = [];
  if (match.node.rsb) rsbRows.push({ rsb: match.node.rsb, boosted: false });
  if (match.node.boosted_rsb) rsbRows.push({ rsb: match.node.boosted_rsb, boosted: true });
  const prefixes = ["", "add1", "add2", "add3", "add4", "add5", "enhanced", "enhanced_add1", "enhanced_add2", "enhanced_add3", "enhanced_add4", "enhanced_add5"];
  const parts = [];
  rsbRows.forEach(({ rsb, boosted }) => {
    prefixes.forEach((prefix) => {
      const field = (name) => rsb[prefix ? `${prefix}_${name}` : name];
      const label = String(field("label") || (boosted ? "Damage - Boosted" : ""));
      const ratio = field("ratio");
      const trueDesc = String(field("true_desc") || "");
      const hasFormula = ratio !== "" && ratio !== undefined && ratio !== null
        || /\d+(?:\.\d+)?%\s+(?:Attack|Atk|SpAtk|SpA|Max HP)/i.test(trueDesc);
      if (!hasFormula) return;
      parts.push({
        label,
        ratio,
        dmgType: String(field("dmg_type") || rsb.dmg_type || ""),
        slider: field("slider"),
        base: field("base"),
        exception: String(field("exception") || ""),
        trueDesc,
        contextText: [rsb.true_desc, rsb.notes, rsb.rsb_info].filter(Boolean).join(" "),
        enhanced: prefix.startsWith("enhanced"),
        boosted
      });
    });
  });
  if (!parts.length) return null;

  const headingKey = normalizedPatchField(String(heading || "")
    .replace(/\b(?:increased|decreased|reduced|boosted|adjusted)\b/gi, ""));
  return parts.sort((left, right) => {
    const score = (part) => {
      const labelKey = normalizedPatchField(part.label);
      let value = 0;
      if (headingKey && labelKey === headingKey) value += 50;
      if (headingKey && labelKey && (headingKey.includes(labelKey) || labelKey.includes(headingKey))) value += 25;
      const headingTokens = String(heading || "").toLowerCase().match(/[a-z0-9]+/g) || [];
      const labelTokens = String(part.label || "").toLowerCase().match(/[a-z0-9]+/g) || [];
      value += headingTokens.filter((token) => token.length > 2 && labelTokens.includes(token)).length * 4;
      if (wantsBoosted === part.boosted || !match.node.boosted_rsb) value += 8;
      if (wantsEnhanced === part.enhanced) value += 4;
      return value;
    };
    return score(right) - score(left);
  })[0];
}

function patchFormulaDefaultBasis(context = {}, reference = null) {
  const type = String(reference?.dmgType || "").toLowerCase();
  if (/sp|special/.test(type)) return "特攻";
  if (/atk|attack/.test(type)) return "攻撃";
  const pokemon = (state.pokemon || []).find((entry) => entry.name === context.pokemonName);
  return pokemon?.damage_type === "Special" ? "特攻" : "攻撃";
}

function cleanedPatchFormulaSide(value) {
  let raw = cleanPatchMarkdown(value)
    .replace(/\([^)]*unchanged[^)]*\)/gi, "")
    .replace(/\bunchanged\b/gi, "")
    .trim();
  raw = raw.replace(/^%\s*(\d+(?:\.\d+)?)\s*%?\s*/i, "$1% ");
  raw = raw.replace(/(\d(?:\.\d+)?)\s*(Atk|SpA|SpAtk|SAtk)\b/gi, "$1 $2");
  return raw.trim();
}

function patchFormulaBasis(value, context = {}, reference = null, heading = "", fallbackValue = "") {
  const raw = cleanedPatchFormulaSide(value);
  const moveKey = normalizedPatchMoveLookup(context.moveName || "");
  if (/Atk\s+or\s+stored\s+Atk/i.test(raw) || (moveKey === "foulplay" && /Attack\s+of\s+(?:the\s+)?Target/i.test(raw))) {
    return "自分と1段目で記録した相手のうち高い方の攻撃";
  }
  if (/Attack\s+of\s+(?:the\s+)?Target/i.test(raw)) return "相手の攻撃";
  if (/\b(?:Sp\.?\s*Atk|SpAtk|SAtk|SpA)\b/i.test(raw)) return "特攻";
  if (/\bAtk\b|\bAttack\b/i.test(raw)) return "攻撃";
  if (/\b(?:DoT\s+)?Damage\s+Dealt\b|\bDoT\s+damage\b/i.test(raw)) return "与えたダメージ";
  if (/Max\.?\s*HP/i.test(raw)) {
    if (/Asleep\s+Pok[eé]mon/i.test(raw)) return "ねむり状態の相手の最大HP";
    if (/(?:Target|Enemy|Opponent)(?:'s)?\s+Max\.?\s*HP/i.test(raw)) return "相手の最大HP";
    if (/^(?:Damage|Burn|Explosion|Outer Ring|First Hit|Second Hit|Third Hit|Final Hit|Stream|Mark Proc)/i.test(String(heading || ""))) {
      return "相手の最大HP";
    }
    return "自分の最大HP";
  }
  if (/Missing\s*HP/i.test(raw)) {
    if (/(?:Target|Enemy|Opponent)/i.test(raw) || /^(?:Damage|Burn|Explosion|First Hit|Second Hit|Third Hit|Final Hit)/i.test(String(heading || ""))) {
      return "相手の減少HP";
    }
    return "自分の減少HP";
  }
  if (fallbackValue && cleanedPatchFormulaSide(fallbackValue) !== raw) {
    return patchFormulaBasis(fallbackValue, context, reference, heading);
  }
  return patchFormulaDefaultBasis(context, reference);
}

function patchFormulaRatioTerm(value, context = {}, reference = null, heading = "", fallbackValue = "") {
  const raw = cleanedPatchFormulaSide(value);
  if (!raw || /^(?:new|added)$/i.test(raw)) return "なし";
  const ratio = raw.match(/([+-]?\d+(?:\.\d+)?)\s*%?/);
  if (!ratio) return translatePatchTokens(raw);
  const basis = patchFormulaBasis(raw, context, reference, heading, fallbackValue);
  const interval = raw.match(/(?:\/\s*|every\s+)(\d+(?:\.\d+)?)s\b/i);
  return `${basis} × ${ratio[1]}%${interval ? `（${interval[1]}秒ごと）` : ""}`;
}

function patchExplicitFormulaExpression(value, context = {}, reference = null, heading = "") {
  const raw = cleanedPatchFormulaSide(value);
  const rsb = raw.match(/^([+-]?\d+(?:\.\d+)?)%?\s*(Atk|Attack|Sp\.?\s*Atk|SpAtk|SAtk|SpA)\s*\+\s*([+-]?\d+(?:\.\d+)?)\s*[x×]\s*\(\s*(?:Level|Lv)\s*-\s*1\s*\)\s*\+\s*([+-]?\d+(?:\.\d+)?)$/i);
  if (rsb) {
    const basis = patchFormulaBasis(`${rsb[1]}% ${rsb[2]}`, context, reference, heading);
    return `${basis} × ${rsb[1]}% + ${rsb[3]} × (Lv - 1) + ${rsb[4]}`;
  }
  const muscleGauge = raw.match(/^([+-]?\d+(?:\.\d+)?)%\s+Max\.?\s*HP\s*\+\s*([+-]?\d+(?:\.\d+)?)%\s+HP\s+Muscle\s+Gauge$/i);
  if (muscleGauge) {
    return `自分の最大HP × ${muscleGauge[1]}% + 自分の最大HP × ${muscleGauge[2]}% × マッスルゲージ段階`;
  }
  return "";
}

function patchFormulaLevelTerm(value, ratioValue, context = {}, reference = null, heading = "") {
  const raw = cleanedPatchFormulaSide(value);
  if (!raw || /^(?:new|added)$/i.test(raw)) return "0 × (Lv - 1)";
  const numeric = raw.match(/[+-]?\d+(?:\.\d+)?/);
  if (!numeric) return `${translatePatchTokens(raw)} × (Lv - 1)`;
  if (/per\s+Muscle\s+Gauge/i.test(raw)) {
    return `${patchFormulaBasis(ratioValue, context, reference, heading)} × ${numeric[0]}% × マッスルゲージ段階`;
  }
  if (/%/.test(raw)) {
    const hasOwnBasis = /(?:Atk|Attack|SpA|SpAtk|SAtk|Max\.?\s*HP|Missing\s*HP|Damage\s+Dealt)/i.test(raw);
    const basis = hasOwnBasis
      ? patchFormulaBasis(raw, context, reference, heading)
      : patchFormulaBasis(ratioValue, context, reference, heading);
    return `${basis} × ${numeric[0]}% × (Lv - 1)`;
  }
  return `${numeric[0]} × (Lv - 1)`;
}

function patchFormulaBaseTerm(value) {
  const raw = cleanedPatchFormulaSide(value);
  if (!raw || /^(?:new|added)$/i.test(raw)) return "0";
  const numeric = raw.match(/[+-]?\d+(?:\.\d+)?%?/);
  return numeric ? numeric[0] : translatePatchTokens(raw);
}

function patchFormulaExpression(side, parts, context, reference, heading) {
  const ratioValue = parts.ratio[side];
  if (/^(?:new|added)$/i.test(cleanedPatchFormulaSide(ratioValue))) return "なし";
  const explicitFormula = patchExplicitFormulaExpression(ratioValue, context, reference, heading);
  if (explicitFormula) return explicitFormula;
  const referenceLevel = reference?.exception === "True" ? "0" : reference?.slider;
  const referenceBase = reference?.exception === "True" ? "0" : reference?.base;
  const levelValue = parts.level?.[side] ?? (referenceLevel !== "" && referenceLevel !== undefined && referenceLevel !== null ? String(referenceLevel) : "0");
  const baseValue = parts.base?.[side] ?? (referenceBase !== "" && referenceBase !== undefined && referenceBase !== null ? String(referenceBase) : "0");
  const fallbackRatioValue = parts.ratio[side === "before" ? "after" : "before"];
  const ratioTerms = [patchFormulaRatioTerm(ratioValue, context, reference, heading, fallbackRatioValue)];
  (parts.additionalRatios || []).forEach((additional) => {
    const fallback = additional[side === "before" ? "after" : "before"];
    ratioTerms.push(patchFormulaRatioTerm(additional[side], context, reference, heading, fallback));
  });
  return [
    ...ratioTerms,
    patchFormulaLevelTerm(levelValue, ratioValue, context, reference, heading),
    patchFormulaBaseTerm(baseValue)
  ].join(" + ").replace(/\+\s+-/g, "- ");
}

function patchFormulaRow(sourceLines, index, context = {}) {
  const ratioLine = cleanPatchMarkdown(sourceLines[index]);
  const ratioMatch = ratioLine.match(/^Ratio\s*:\s*(.*)$/i)
    || ratioLine.match(/^Ratio\s+(?!\d+\s*:)(.*)$/i);
  if (!ratioMatch) return null;
  const ratio = splitPatchTransition(ratioMatch[1]);
  if (!ratio || cleanedPatchFormulaSide(ratio.before).toLowerCase() === cleanedPatchFormulaSide(ratio.after).toLowerCase()) return null;

  const parts = { ratio, additionalRatios: [] };
  const consumedLines = [ratioLine];
  let consumed = 1;
  for (let offset = 1; offset <= 5; offset += 1) {
    const line = cleanPatchMarkdown(sourceLines[index + offset]);
    const match = line.match(/^(Slider|Per Level|Scale|Base|Bas)(?:\s*:\s*|\s+)(.*)$/i);
    const additionalMatch = line.match(/^(Ratio\s*2|Ratio2|Extra)\s*:\s*(.*)$/i);
    if (!match && !additionalMatch) break;
    const field = match?.[1] || additionalMatch[1];
    const rawValue = match?.[2] || additionalMatch[2];
    const transition = splitPatchTransition(rawValue, /^(?:Slider|Per Level|Scale)$/i.test(field));
    if (!transition) break;
    if (/^(?:Base|Bas)$/i.test(field)) parts.base = transition;
    else if (/^(?:Ratio\s*2|Ratio2|Extra)$/i.test(field)) parts.additionalRatios.push(transition);
    else parts.level = transition;
    consumedLines.push(line);
    consumed += 1;
  }

  const heading = cleanPatchMarkdown(sourceLines[index - 1]);
  const reference = patchFormulaReference(context, heading);
  const explicitBasis = /(?:\bAtk\b|\bAttack\b|\bSp\.?\s*Atk\b|\bSpAtk\b|\bSAtk\b|\bSpA\b|Max\.?\s*HP|Missing\s*HP|Damage\s+Dealt|DoT\s+damage)/i.test(`${ratio.before} ${ratio.after}`);
  const modifierHeading = /(?:Resistance|Reduction|Increase|Decrease|Penalty|Multiplier|Trigger)/i.test(heading);
  const formulaHeading = /^(?:Damage|Healing|Heal|Shield|Burn|Explosion|Outer Ring|First Hit|Second Hit|Third Hit|Final Hit|Stream|Mark Proc)(?:\s*(?:[-:(]|$))/i.test(heading);
  const referenceLooksFormula = Boolean(reference && /(?:Damage|Healing|Heal|Shield|Burn|Attack)/i.test(reference.label || reference.trueDesc));
  if (!parts.level && !parts.base && !explicitBasis && (!formulaHeading && !referenceLooksFormula || modifierHeading)) return null;
  const exceptionalRatio = /(?:Max\.?\s*HP|Missing\s*HP|Damage\s+Dealt|DoT\s+damage|Attack\s+of\s+(?:the\s+)?Target|stored\s+Atk)/i.test(`${ratio.before} ${ratio.after}`);
  const expressionReference = !parts.level && !parts.base && exceptionalRatio && reference
    ? { ...reference, exception: "True" }
    : reference;

  const before = patchFormulaExpression("before", parts, context, expressionReference, heading);
  const after = patchFormulaExpression("after", parts, context, expressionReference, heading);
  return {
    consumed,
    row: {
      text: `計算式: ${before} → ${after}`,
      comparison: { before, after },
      source: consumedLines.join(" ")
    }
  };
}

function patchStandaloneFormula(value, heading, context = {}) {
  const ratio = splitPatchTransition(value);
  if (!ratio || cleanedPatchFormulaSide(ratio.before).toLowerCase() === cleanedPatchFormulaSide(ratio.after).toLowerCase()) return "";
  const explicitBasis = /(?:\bAtk\b|\bAttack\b|\bSp\.?\s*Atk\b|\bSpAtk\b|\bSAtk\b|\bSpA\b|Max\.?\s*HP|Missing\s*HP|Damage\s+Dealt|DoT\s+damage)/i.test(`${ratio.before} ${ratio.after}`);
  const formulaHeading = /^(?:Damage|Healing|Heal|Shield|Burn|Explosion|Outer Ring|First Hit|Second Hit|Third Hit|Final Hit|Stream|Mark Proc)(?:\s*(?:[-:(]|$))/i.test(heading);
  const modifierHeading = /(?:Resistance|Reduction|Increase|Decrease|Penalty|Multiplier|Trigger|and Duration)/i.test(heading);
  if (!explicitBasis || !formulaHeading || modifierHeading) return "";
  const reference = patchFormulaReference(context, heading);
  const expressionReference = reference ? { ...reference, exception: "True" } : { exception: "True" };
  const parts = { ratio };
  return `計算式: ${patchFormulaExpression("before", parts, context, expressionReference, heading)} → ${patchFormulaExpression("after", parts, context, expressionReference, heading)}`;
}

function jpPatchDetail(line, status) {
  const raw = cleanPatchMarkdown(line);
  if (!raw) return "";
  if (/^(?:Old|New)\s*:/i.test(raw)) return raw;
  if (PATCH_DETAIL_OVERRIDES_JA[raw]) return PATCH_DETAIL_OVERRIDES_JA[raw];
  const colonIndex = raw.indexOf(":");
  const transitionIndex = raw.search(/(?:-\s*>|→)/);
  const hasField = colonIndex >= 0
    && colonIndex <= 120
    && (transitionIndex < 0 || colonIndex < transitionIndex)
    && !/^https?/i.test(raw)
    && !/[.!?]\s/.test(raw.slice(0, colonIndex));
  const field = hasField ? raw.slice(0, colonIndex) : "";
  const value = hasField ? raw.slice(colonIndex + 1).trim() : raw;
  const fieldJa = field ? jpPatchField(field) : "";
  const translatedValue = translatePatchTokens(value);
  let translated = fieldJa ? (translatedValue ? `${fieldJa}: ${translatedValue}` : fieldJa) : translatedValue;
  if (fieldJa && !value) return fieldJa;
  if (!hasUntranslatedPatchText(translated)) return translated;

  if (/(?:-\s*>|→)/.test(raw)) {
    const sides = raw.split(/\s*(?:-\s*>|→)\s*/).map((side) => translatePatchTokens(side));
    let allSidesHaveValues = true;
    const numericSides = sides.map((side) => {
      if (!hasUntranslatedPatchText(side)) return side;
      const parts = side.match(/[+-]?\d+(?:[,.]\d+)*(?:\.\d+)?%?|最大HP|減少HP|残りHP|攻撃速度|移動速度|攻撃|特攻|防御|特防|待ち時間短縮率|ダメージ軽減率|\d+(?:\.\d+)?秒/g);
      if (parts) return parts.join(" ");
      allSidesHaveValues = false;
      return "";
    });
    if (allSidesHaveValues) return `${fieldJa ? `${fieldJa}: ` : ""}${numericSides.join(" → ")}`;
  }

  const actionMatch = raw.match(/^(.*?)\s+(increased|boosted|decreased|reduced|lowered|raised|added|introduced|removed|changed|adjusted|normalized|extended|shortened)\.?$/i);
  if (actionMatch) {
    const subject = jpPatchField(actionMatch[1]);
    if (!/^調整項目/.test(subject)) return `${subject}${PATCH_ACTION_JA[actionMatch[2].toLowerCase()]}`;
  }

  const fallback = /fixed (?:a |an )?(?:bug|issue)|bug ?fix/i.test(raw) ? "不具合を修正" : patchStatusFallback(status);
  return `${fallback}（UniteDB原文: ${raw}）`;
}

function isPatchFieldHeading(line) {
  const raw = cleanPatchMarkdown(line);
  if (!raw || /(?:-\s*>|→)/.test(raw)) return false;
  if (/:$/.test(raw)) return !/^https?/i.test(raw) && raw.length <= 140;
  if (/[.!?]$/.test(raw) || raw.length > 100) return false;
  return /^(?:\(?(?:NEW|ADDED)\)?\s+)?(?:Damage|Healing|Heal|Shield|Cooldown|CDR|HP|Health|Attack|Defense|Special|Sp\.?\s*(?:Atk|Def)|Movement|Slow|Stun|Fear|Range|Duration|Energy|Unite|Critical|Crit|Life ?Steal|Effect|Mechanic|Burn|Explosion|Outer Ring|First Hit|Second Hit|Third Hit|Last Hit|Stream|Mark Proc|Return Damage|Base Damage|Stage \d+)/i.test(raw);
}

function isStandalonePatchValue(line) {
  const raw = cleanPatchMarkdown(line);
  return /(?:-\s*>|→)/.test(raw) && !raw.includes(":") && !/^Ratio\s+/i.test(raw);
}

function jpPatchDetails(lines, status, context = {}) {
  const rows = [];
  const sourceLines = Array.isArray(lines) ? lines : [];
  for (let index = 0; index < sourceLines.length; index += 1) {
    const raw = cleanPatchMarkdown(sourceLines[index]);
    if (!raw) continue;
    const oldMatch = raw.match(/^Old\s*:\s*(.+)$/i);
    const nextRaw = cleanPatchMarkdown(sourceLines[index + 1]);
    const newMatch = nextRaw.match(/^New\s*:\s*(.+)$/i);
    if (oldMatch && newMatch) {
      rows.push({
        text: `${raw}\n${nextRaw}`,
        source: `${raw} ${nextRaw}`,
        comparison: { before: oldMatch[1], after: newMatch[1] }
      });
      index += 1;
      continue;
    }
    const formula = patchFormulaRow(sourceLines, index, context);
    if (formula) {
      rows.push(formula.row);
      index += formula.consumed - 1;
      continue;
    }
    if (isPatchFieldHeading(raw) && isStandalonePatchValue(sourceLines[index + 1])) {
      const nextRaw = cleanPatchMarkdown(sourceLines[index + 1]);
      const field = raw.replace(/[:：\s]+$/g, "");
      const standaloneFormula = patchStandaloneFormula(nextRaw, field, context);
      if (standaloneFormula) {
        rows.push({ text: jpPatchField(field), source: raw, heading: true, field });
        rows.push({
          text: standaloneFormula,
          source: nextRaw,
          comparison: splitPatchTransition(standaloneFormula.replace(/^計算式:\s*/, ""))
        });
        index += 1;
        continue;
      }
      if (normalizedPatchField(field) === "shieldandduration" && isStandalonePatchValue(sourceLines[index + 2])) {
        const durationRaw = cleanPatchMarkdown(sourceLines[index + 2]);
        const shieldValue = jpPatchDetail(nextRaw, status);
        const durationValue = jpPatchDetail(durationRaw, status);
        rows.push({
          text: `シールド量: ${shieldValue}／持続時間: ${durationValue}`,
          source: `${raw} ${nextRaw} ${durationRaw}`
        });
        index += 2;
        continue;
      }
      const text = `${jpPatchField(field)}: ${jpPatchDetail(nextRaw, status).replace(/^変更値:\s*/, "")}`;
      rows.push({ text, source: `${raw} ${nextRaw}`, field });
      index += 1;
      continue;
    }
    const heading = isPatchFieldHeading(raw) && !raw.includes(": ");
    rows.push({
      text: jpPatchDetail(raw, status),
      source: raw,
      heading,
      field: heading ? raw.replace(/[:：\s]+$/g, "") : raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : ""
    });
  }

  const seen = new Set();
  return rows.filter((row) => {
    if (!row.text) return false;
    const key = `${row.text}\n${row.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function patchComparedNumberParts(before, after, field = "") {
  const tokenPattern = /[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?/g;
  const oldNumbers = [...before.matchAll(tokenPattern)];
  const newNumbers = [...after.matchAll(tokenPattern)];
  // Only compare matching expressions; added terms or changed units cannot be paired safely.
  const skeleton = (text) => text.replace(tokenPattern, "#").replace(/\s+/g, "");
  if (!oldNumbers.length || oldNumbers.length !== newNumbers.length || skeleton(before) !== skeleton(after)) {
    return [{ text: after }];
  }
  const reverse = normalizedPatchField(field) === "unitecharge";
  const parts = [];
  let offset = 0;
  newNumbers.forEach((match, index) => {
    if (match.index > offset) parts.push({ text: after.slice(offset, match.index) });
    const previous = Number(oldNumbers[index][0].replace(/[,%]/g, ""));
    const current = Number(match[0].replace(/[,%]/g, ""));
    const direction = Math.sign(current - previous);
    parts.push({
      text: match[0],
      tone: direction === 0 ? "" : direction * (reverse ? -1 : 1) > 0 ? "positive" : "negative",
      description: direction === 0 ? "" : `${oldNumbers[index][0]} → ${match[0]}（${direction > 0 ? "増加" : "減少"}）`
    });
    offset = match.index + match[0].length;
  });
  if (offset < after.length) parts.push({ text: after.slice(offset) });
  return parts;
}

function patchInlineNumberParts(text, field) {
  if (text.includes("UniteDB原文:")) return [{ text }];
  const sides = text.split(/\s*→\s*/);
  if (sides.length !== 2) return [{ text }];
  // Keep field names and level labels out of the numerical comparison.
  const prefix = sides[0].match(/^.*?:\s*|^Lv\s*\d+\s+/)?.[0] || "";
  return [
    { text: `${sides[0]} → ` },
    ...patchComparedNumberParts(sides[0].slice(prefix.length), sides[1], field)
  ];
}

function patchDetailGroups(details) {
  const groups = [];
  let heading = null;
  for (const detail of details) {
    if (detail.heading) {
      heading = { ...detail, children: [] };
      groups.push(heading);
      continue;
    }
    if (detail.comparison) {
      const { before, after } = detail.comparison;
      if (!heading) {
        heading = { text: "計算式", source: detail.source, children: [] };
        groups.push(heading);
      }
      heading.children.push(
        { text: `Old: ${before}`, source: detail.source },
        {
          text: `New: ${after}`,
          source: detail.source,
          parts: [{ text: "New: " }, ...patchComparedNumberParts(before, after, heading.field)]
        }
      );
      continue;
    }
    if (detail.field) heading = null;
    const row = { ...detail, parts: patchInlineNumberParts(detail.text, detail.field || heading?.field) };
    (heading ? heading.children : groups).push(row);
  }
  return groups;
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
