// Acceleration extraction, normalization, ranking, and tooltip rendering.
const ACCELERATION_PERCENT_PATTERNS = [
  /\b(?:increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|rais(?:e|es|ed|ing)|grant(?:s|ed|ing)?)\s+(?:the\s+)?movement speed\s+and\s+[^.;%]{0,120}?(?:by|to)\s+(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\b(?:increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|rais(?:e|es|ed|ing)|gain(?:s|ed|ing)?|receiv(?:e|es|ed|ing)|grant(?:s|ed|ing)?)\s+(?:both\s+of\s+)?(?:the\s+)?(?:user['’]s|their|its|his|her|this pok(?:é|e)mon['’]s)?\s*(?:bonus\s+)?movement speeds?(?:\s+of)?[^.;%]{0,35}?(?:by|to|of)\s+(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\b(?:increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|rais(?:e|es|ed|ing)|grant(?:s|ed|ing)?)[^.;]{0,170}?\band\s+(?:bonus\s+)?movement speeds?(?:\s+of)?\s+(?:by|to|of)?\s*(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\b(?:increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|rais(?:e|es|ed|ing)|grant(?:s|ed|ing)?)\s+(?:the\s+)?(?:user['’]s|their|its|his|her|this pok(?:é|e)mon['’]s|[a-z][a-z.-]+['’]s)?\s*movement speed[^.;%]{0,55}?(?:by|to)\s+(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\bmovement speed(?:\s+of\s+[^.;,%]{0,55}?)?\s+(?:is\s+|are\s+|was\s+)?(?:instead\s+)?(?:increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|raised)[^.;%]{0,35}?(?:by|to)?\s*(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\b(?:strengthen(?:s|ed|ing)?|increas(?:e|es|ed|ing))\s+(?:the\s+)?movement speed (?:increase|gain|bonus)[^.;%]{0,30}?\s+to\s+(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%/gi,
  /\b(?:gain(?:s|ed|ing)?|receiv(?:e|es|ed|ing)|grant(?:s|ed|ing)?)\s+(?:the\s+user\s+|themselves\s+|itself\s+|a\s+)?(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%\s+(?:increased\s+)?movement speed(?:\s+(?:increase|bonus|boost))?/gi,
  /\b(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*?)%\s+(?:increased\s+)?movement speed(?:\s+(?:increase|bonus|boost))?/gi
];

function accelerationPercentValue(value) {
  return String(value || "")
    .split("/")
    .map((part) => number(part, 0))
    .reduce((maximum, current) => Math.max(maximum, current), 0);
}

function accelerationMatchIsPositive(match) {
  const exact = String(match && match[0] || "");
  if (/(?:movement speed|speed)\s+(?:decrease|reduction|penalty)/i.test(exact)) return false;
  if (/movement speed[^.;%]{0,55}?(?:decay|diminish|decreas)/i.test(exact)) return false;
  if (/(?:decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)\s+[^.;%]{0,45}?movement speed/i.test(exact)) return false;
  if (/(?:opposing|enemy|enemies|target['’]s|targets['’])[^.;%]{0,45}?movement speed/i.test(exact)
      && !/(?:ally|allies|teammate)/i.test(exact)) return false;
  return true;
}

function accelerationExplicitMaximum(text, match) {
  const near = text.slice(Math.max(0, match.index - 80), Math.min(text.length, match.index + match[0].length + 190));
  const patterns = [
    /(?:maximum|max(?:imum)?(?:\s+of)?|up to)\s+(\d+(?:\.\d+)?)%\s+(?:increased\s+)?movement speed/i,
    /movement speed[^;]{0,180}?(?:up to|maximum(?:\s+of)?)\s+(\d+(?:\.\d+)?)%/i,
    /(?:ramp\w*\s+up|increas(?:e|es|ed|ing)\s+by\s+an\s+additional)[^;]{0,90}?(?:up to|maximum(?:\s+of)?)\s+(\d+(?:\.\d+)?)%/i,
    /(?:up to\s+\d+\s+times|up to\s+\d+\s+stacks)[^.;]{0,45}?maximum\s+(\d+(?:\.\d+)?)%/i,
    /(?:strengthened|increased)\s+to\s+(\d+(?:\.\d+)?)%/i
  ];
  for (const pattern of patterns) {
    const maximum = near.match(pattern);
    if (maximum) return number(maximum[1], 0);
  }
  return 0;
}

function accelerationMinimum(text, match, basePercent) {
  const near = text.slice(Math.max(0, match.index - 80), Math.min(text.length, match.index + match[0].length + 320));
  return speedDecayMinimum(near) || basePercent;
}

function accelerationStackMultiplier(text, match) {
  const after = text.slice(match.index, Math.min(text.length, match.index + match[0].length + 300));
  const sameSentence = after.split(/\.(?=\s+[A-Z])|;/, 1)[0];
  const stack = sameSentence.match(/(?:stack(?:s|ed|ing)?\s+up to|up to)\s+(\d+)\s+(?:times|stacks)/i)
    || after.match(/\.\s+This buff stacks up to\s+(\d+)\s+times/i);
  return stack ? Math.max(1, number(stack[1], 1)) : 1;
}

function accelerationDurationForMatch(text, match, matchEnd) {
  const exact = String(match[0] || "");
  const speedIndex = exact.toLowerCase().lastIndexOf("movement speed");
  const withinDuration = exact.slice(Math.max(0, speedIndex)).match(/\b(?:for|lasting)\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b/i);
  if (withinDuration) return number(withinDuration[1], 0);
  const after = text.slice(matchEnd, Math.min(text.length, matchEnd + 180));
  const afterDuration = after.match(/^[^;]{0,150}?\b(?:for|lasting)\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b/i);
  if (afterDuration) return number(afterDuration[1], 0);
  const before = text.slice(Math.max(0, match.index - 110), match.index);
  const nearby = text.slice(Math.max(0, match.index - 120), Math.min(text.length, matchEnd + 180));
  const nearbyDecay = speedDecaySpec(nearby);
  if (nearbyDecay && nearbyDecay.duration > 0) return number(nearbyDecay.duration, 0);
  const beforeDurations = [...before.matchAll(/\b(?:for\s+(?:up to\s+)?|up to\s+)(\d+(?:\.\d+)?)s\b[^:.;]{0,70}$/gi)];
  if (beforeDurations.length) return number(beforeDurations[beforeDurations.length - 1][1], 0);
  const nearbyDuration = nearby.match(/\b(?:movement speeds?|movement speed increase)[^;]{0,150}?\bfor\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b/i)
    || nearby.match(/\bfor\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b[^;]{0,150}?\bmovement speeds?\b/i);
  if (nearbyDuration) return number(nearbyDuration[1], 0);
  return 0;
}

function accelerationPercentCandidates(value, enhanced = false) {
  const text = cleanSlowDescription(value);
  const candidates = [];
  ACCELERATION_PERCENT_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (!accelerationMatchIsPositive(match)) continue;
      const suffix = text.slice(pattern.lastIndex, Math.min(text.length, pattern.lastIndex + 24));
      if (/^\s*(?:decrease|reduction|penalty)\b/i.test(suffix)) continue;
      const basePercent = accelerationPercentValue(match[1]);
      if (basePercent <= 0) continue;
      const multiplier = accelerationStackMultiplier(text, match);
      const explicitMaximum = accelerationExplicitMaximum(text, match);
      const stackedPercent = explicitMaximum > 0 && basePercent >= explicitMaximum
        ? basePercent
        : basePercent * multiplier;
      const percent = Math.max(stackedPercent, explicitMaximum);
      const context = text.slice(Math.max(0, match.index - 130), Math.min(text.length, pattern.lastIndex + 210));
      const key = `${match.index}:${basePercent}:${percent}`;
      if (candidates.some((candidate) => candidate.key === key)) continue;
      const decays = /(?:decay|diminish|decreasing by)/i.test(context);
      const conditionalMaximum = /(?:strengthened|increased)\s+to\s+\d+(?:\.\d+)?%\s+for/i.test(context);
      const grows = /(?:ramp\w*\s+up|increasing by an additional|increase(?:s|d)? by \d+(?:\.\d+)?% every)/i.test(context)
        || (explicitMaximum > basePercent && multiplier === 1 && !decays && !conditionalMaximum);
      candidates.push({
        key,
        basePercent,
        multiplier,
        percent,
        minPercent: accelerationMinimum(text, match, Math.min(basePercent, percent)),
        enhanced,
        decays,
        grows,
        variable: decays || grows || multiplier > 1 || percent !== basePercent,
        duration: accelerationDurationForMatch(text, match, pattern.lastIndex),
        targetContext: text.slice(Math.max(0, match.index - 90), Math.min(text.length, pattern.lastIndex + 35)),
        context
      });
    }
  });
  return candidates;
}

function accelerationTextHasEffect(value) {
  return accelerationPercentCandidates(value).length > 0;
}

function accelerationDetailParts(node, rsb) {
  const parts = [];
  const add = (label, value) => {
    const text = cleanSlowDescription(value);
    if (!text || parts.some((part) => part.text === text)) return;
    parts.push({ label, text });
  };
  add("", rsb && rsb.true_desc);
  if (!parts.length) {
    add("", node && (node.description1 || node.description || ""));
    add("", node && node.description2);
  }
  SLOW_EFFECT_TEXT_FIELDS.filter((field) => field.key !== "true_desc").forEach((field) => {
    const value = rsb && rsb[field.key];
    if (accelerationTextHasEffect(value)) add(field.label, value);
  });
  return parts;
}

function accelerationTargetLabel(text) {
  const value = String(text || "");
  const hasAlly = /\b(?:ally|allies|allied|teammates?)\b|team members?/i.test(value);
  const hasSelf = /(?:the user|user['’]s|themself|themselves|itself|this pok(?:é|e)mon|the user and|nearby teammates|including the user)/i.test(value);
  if (hasAlly && hasSelf) return "自分・味方";
  if (hasAlly) return "味方";
  return "自分";
}

function accelerationEffectDuration(row) {
  const explicit = number(row && row.accelerationDuration, 0);
  const context = String(row && row.accelerationContext || "");
  const conditionalMaximumDuration = context.match(
    new RegExp(`(?:strengthened|increased)\\s+to\\s+${formatNumber(row && row.accelerationPercent, 1)}%\\s+for\\s+(\\d+(?:\\.\\d+)?)s`, "i")
  );
  if (conditionalMaximumDuration) return number(conditionalMaximumDuration[1], explicit);
  if (explicit > 0) return explicit;
  const afterPercent = context.match(/movement speed[^.;%]{0,90}?\d+(?:\.\d+)?%[^;]{0,150}?\bfor\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b/i);
  if (afterPercent) return number(afterPercent[1], 0);
  const totalDuration = context.match(/\btotal\s+(?:[a-z-]+\s+){0,3}?duration\s+of\s+(\d+(?:\.\d+)?)s\b/i);
  if (totalDuration) return number(totalDuration[1], 0);
  if (/for the duration of (?:the )?buff|while (?:the )?(?:shield|vortex|field|zone|veil)(?: effect)? is active/i.test(context)) {
    const speedIndex = context.toLowerCase().indexOf("movement speed");
    const beforeSpeed = context.slice(0, speedIndex >= 0 ? speedIndex : context.length);
    const inheritedDurations = [...beforeSpeed.matchAll(/\bfor\s+(?:up to\s+)?(\d+(?:\.\d+)?)s\b/gi)];
    if (inheritedDurations.length) return number(inheritedDurations[inheritedDurations.length - 1][1], 0);
  }
  const growthDuration = context.match(/\bevery\s+\d+(?:\.\d+)?s\s+over\s+(\d+(?:\.\d+)?)s\b/i);
  if (growthDuration) return number(growthDuration[1], 0);
  return 0;
}

function accelerationDecayDetails(context) {
  const decay = speedDecaySpec(context);
  if (!decay) return null;
  return {
    decrement: number(decay.amount, 0),
    interval: number(decay.interval, 0),
    times: number(decay.times, 0),
    minimum: number(decay.minimum, 0),
    duration: number(decay.duration, 0),
    total: Boolean(decay.total)
  };
}

function accelerationGrowthDetails(context) {
  const match = String(context || "").match(
    /(?:increas(?:e|es|ed|ing)|ramp\w*\s+up)[^.;%]{0,90}?(?:by\s+(?:an\s+additional\s+)?(\d+(?:\.\d+)?)%\s+(?:every|per)\s+(\d+(?:\.\d+)?)s|(?:every|per)\s+(\d+(?:\.\d+)?)s\s+by\s+(\d+(?:\.\d+)?)%)/i
  );
  if (!match) return null;
  return {
    increment: number(match[1] || match[4], 0),
    interval: number(match[2] || match[3], 0)
  };
}

const ACCELERATION_CONDITION_OVERRIDES_JA = Object.freeze({
  "Buzzwole::Passive::Beast Boost::rsb": "相手チームのポケモンをKO、またはKOをアシストしたとき",
  "Latias::Passive::Levitate::rsb": "いずれかのわざを使用した直後（味方のラティオスの近くでは別枠の10%加速も発生）",
  "Latios::Passive::Levitate::rsb": "いずれかのわざを使用した直後（味方のラティアスの近くでは別枠の10%加速も発生）",
  "Quaquaval::Passive::Moxie::rsb": "バイブスが最大のときに出る強化攻撃「スピニングエッジ」を相手ポケモンへ命中させたとき",
  "Psyduck::Passive::Swift Swim::rsb": "相手チームのポケモンからダメージを受けたとき（再発動まで10秒）",
  "Meowth::Passive::Pickup::rsb": "エオスエナジーかコインへ近づいている間、またはコインを拾ったとき",
  "Mega-Gyarados::Passive::Swift Swim::rsb": "いずれかのわざを使用したとき",
  "Snorlax::Passive::Gluttony::rsb": "近くのきのみや食べ物の方向を向いて移動するとき",
  "Gyarados::Passive::Rattled::rsb": "ダメージを受けたとき",
  "Comfey::Passive::Triage::rsb": "最大HPが50%以下の味方ポケモンの近くにいるとき",
  "Gengar::Passive::Levitate::rsb": "戦闘していない状態が5秒間続いたとき",
  "Dodrio::Passive::Run Away::rsb": "相手ポケモンの近くを移動するとき、および移動してダッシュゲージをためている間",
  "Lucario::Passive::Steadfast::rsb": "自分のHPが最大HPの50%以下になったとき（再発動まで45秒）",
  "Talonflame::Passive::Gale Wings::rsb": "自分のHPが最大HPの85%以上ある間",
  "Meowscarada::Passive::Overgrow::rsb": "ダメージを受ける直前にしんりょくが発動して姿を消したとき（再発動まで60秒）",
  "Eldegoss::Passive::Cotton Down::rsb": "1回の攻撃で最大HPの5%以上のダメージを受けたとき（再発動まで10秒）",
  "Mimikyu::Passive::Disguise::rsb": "ばけのかわを壊した相手に付く「復讐マーク」の対象へ近づいている間",
  "Sableye::Passive::Prankster::rsb": "相手チームのポケモンの視界外に出てステルス状態になったとき",
  "Rapidash::Move 1::Dazzling Gleam::rsb": "光の外側を野生ポケモンまたは相手チームのポケモンへ命中させたとき",
  "Greedent::Move 2::Covet::rsb": "ほしがるの走行中に落としたオボンのみを食べたとき",
  "Greedent::Move 2::Stuff Cheeks::rsb": "ほおばるの使用中にきのみを視界へ入れたとき",
  "Hoopa::Move 2::Hyperspace Hole::rsb": "レベル10以降、リングの近くにいる味方がリングへ向かって移動するとき",
  "Comfey::Move 1::Sweet Kiss::rsb": "味方にくっついた状態で、てんしのキッスをチャージしている間",
  "Comfey::Move 1::Floral Healing::rsb": "レベル10以降、味方にくっついた状態でフラワーヒールを使用したとき",
  "Ho-Oh::Move 1::Safeguard::rsb": "しんぴのまもりのフィールドが次に受ける攻撃のダメージを軽減したとき",
  "Alcremie::Move 1::Recover::rsb": "スイートゲージが満タンの状態で、強化されたクリームを味方へ与えたとき",
  "Blastoise::Move 1::Hydro Pump::rsb": "こうそくスピン中にハイドロポンプを使用したとき",
  "Pawmot::Move 2::Volt Switch::rsb": "ファイターモード中にボルトチェンジを使用したとき",
  "Tinkaton::Move 2::Thief::rsb": "どろぼうを使用したとき（妨害状態の相手へ向かって移動している間は加速が強化）",
  "Latias::Move 1::Dragon Cheer::rsb": "ドラゴンエールの対象に味方のラティオスを指定したとき",
  "Leafeon::Move 1::Razor Leaf::rsb": "はっぱカッターで放った葉が場に残っている間",
  "Umbreon::Move 1::Swift::rsb": "スピードスターを4発当てて付けたマークの対象の近くにいるとき",
  "Ninetales::Move 2::Aurora Veil::rsb": "オーロラベールの範囲内にいる間"
});

function accelerationActivationConditionJa(row) {
  const override = row.descriptionKey && ACCELERATION_CONDITION_OVERRIDES_JA[row.descriptionKey];
  if (override) return override;
  if (row.sourceType === "battle") return "バトルアイテムを使用した直後";
  if (row.sourceType === "item" && row.sourceName === "Choice Scarf") {
    return "相手チームのポケモンへ通常攻撃を3回命中させ、2秒間持続する隠し段階を3までためたとき";
  }
  if (row.sourceType === "item" && row.sourceName === "Float Stone") {
    return "相手チームのポケモンとの戦闘から5秒間離れているとき";
  }

  const context = String(row.accelerationContext || "");
  if (/outer edge/i.test(context)) return "技の外周部分をポケモンへ命中させたとき";
  if (/while attached/i.test(context) && /charg(?:e|es|ed|ing)/i.test(context)) {
    return "味方ポケモンにくっついた状態で技をチャージしている間";
  }
  if (/while attached/i.test(context)) return "味方ポケモンにくっついた状態で技を使用したとき";
  if (/when (?:this )?field reduces damage/i.test(context)) return "技で作ったフィールドが攻撃のダメージを軽減したとき";
  if (/when (?:this move|the move) hits|if (?:this move|it) hits|after hitting an opposing|when hit(?:ting)? an opposing|when this unite move hits/i.test(context)) {
    return "技を相手チームのポケモンへ命中させたとき";
  }
  if (/after using a move/i.test(context)) return "いずれかのわざを使用した直後";
  if (/after using this move|when this move is used|when the (?:pokémon|user) uses a move/i.test(context)) {
    return "この技を使用した直後";
  }
  if (/while (?:the )?shield (?:effect )?is active/i.test(context)) return "この技で得たシールドが残っている間";
  if (/while (?:flying|in the air)/i.test(context)) return "この技で飛行している間";
  if (/while (?:underwater|levitating)/i.test(context)) return "この技の特殊移動状態が続いている間";
  if (/while (?:in )?stealth|enters? stealth/i.test(context)) return "この技でステルス状態になっている間";
  if (/while (?:this move|the vortex|the buff) is active|for the duration of (?:this move|the buff)/i.test(context)) {
    return "この技の効果が続いている間";
  }
  if (/inside|within (?:the|this|an?) (?:area|zone|field|veil)|on the path/i.test(context)) {
    return "この技で作られた範囲内にいる間";
  }
  if (/moving toward|approaching/i.test(context)) return "説明に記載された対象へ近づいている間";
  if (/when damaged|takes? damage|receiv(?:e|es|ed|ing) damage/i.test(context)) {
    return "相手チームのポケモンからダメージを受けたとき";
  }
  return row.sourceType === "pokemon" ? "この技を使用したとき" : "効果を発動させたとき";
}

function japaneseAccelerationFallbackParts(row) {
  const target = row.targetLabel === "味方" ? "味方ポケモン" : row.targetLabel === "自分・味方" ? "自分と味方ポケモン" : "自分";
  const effects = [];
  if (row.stackMultiplier > 1) {
    effects.push(`${target}の移動速度を1段階につき${formatNumber(row.basePercent, 1)}%上げ、最大${formatNumber(row.stackMultiplier, 0)}段階で${formatNumber(row.accelerationPercent, 1)}%まで累積します。`);
  } else if (row.grows && row.basePercent < row.accelerationPercent) {
    effects.push(`${target}の移動速度を発動直後に${formatNumber(row.basePercent, 1)}%上げ、時間経過で最大${formatNumber(row.accelerationPercent, 1)}%まで累積加速します。`);
  } else if (row.decays && row.minAccelerationPercent < row.accelerationPercent) {
    effects.push(`${target}の移動速度を発動直後に${formatNumber(row.accelerationPercent, 1)}%上げ、時間経過で最低${formatNumber(row.minAccelerationPercent, 1)}%まで減衰します。`);
  } else if (row.variable && row.minAccelerationPercent < row.accelerationPercent) {
    effects.push(`${target}の移動速度を${formatNumber(row.minAccelerationPercent, 1)}%から最大${formatNumber(row.accelerationPercent, 1)}%まで上げます。`);
  } else {
    effects.push(`${target}の移動速度を${formatNumber(row.accelerationPercent, 1)}%上げます。`);
  }
  if (row.enhanced) effects.push("この数値は強化後の効果です。");
  const decay = accelerationDecayDetails(row.accelerationDecayContext || row.accelerationContext);
  const duration = decay && decay.total && decay.duration > 0
    ? decay.duration
    : accelerationEffectDuration(row) || number(decay && decay.duration, 0);
  if (duration > 0) effects.push(`加速の持続時間は${formatNumber(duration, 1)}秒です。`);
  if (decay && decay.decrement > 0 && decay.interval > 0) {
    const floor = decay.minimum > 0 ? `、最低${formatNumber(decay.minimum, 1)}%まで` : "";
    const repeat = decay.times > 0 ? `、最大${formatNumber(decay.times, 0)}回` : "";
    effects.push(`${formatNumber(decay.interval, 1)}秒ごとに${formatNumber(decay.decrement, 1)}%ずつ${floor}${repeat}減衰します。`);
  } else if (decay && decay.decrement > 0 && decay.total) {
    const floor = decay.minimum > 0
      ? decay.minimum
      : Math.max(0, row.accelerationPercent - decay.decrement);
    effects.push(`${formatNumber(decay.duration, 1)}秒かけて${formatNumber(floor, 1)}%まで減衰します。`);
  } else if (decay && decay.minimum > 0 && decay.minimum < row.accelerationPercent) {
    const transition = decay.duration > 0 ? `${formatNumber(decay.duration, 1)}秒かけて` : "時間経過で";
    effects.push(`${transition}${formatNumber(decay.minimum, 1)}%まで減衰します。`);
  }
  const growth = row.grows ? accelerationGrowthDetails(row.accelerationContext) : null;
  if (growth && growth.increment > 0 && growth.interval > 0) {
    effects.push(`${formatNumber(growth.interval, 1)}秒ごとに${formatNumber(growth.increment, 1)}%ずつ加速が累積します。`);
  }
  return [
    {
      label: "加速条件",
      text: `${accelerationActivationConditionJa(row)}。`
    },
    {
      label: "加速効果",
      text: effects.join("")
    }
  ];
}

function localizedAccelerationOverviewParts(row) {
  if (row.sourceType === "item" && row.sourceName === "Choice Scarf") {
    return [{
      label: "技の概要",
      text: "相手チームのポケモンに通常攻撃でダメージを与えるたび、2秒間持続する隠し段階を1つ獲得します。通常攻撃・移動以外の行動をすると段階は0に戻り、3段階目の通常攻撃を命中させると移動速度上昇が発動します。効果の再発動には6秒の待ち時間があります。"
    }];
  }
  if (row.sourceType === "item" && row.sourceName === "Float Stone") {
    return [{
      label: "技の概要",
      text: "相手チームのポケモンとの戦闘から5秒間離れていると、移動速度上昇が発動します。"
    }];
  }
  if (row.sourceType === "battle" && row.sourceName === "X Speed") {
    return [{
      label: "技の概要",
      text: "使用した直後に移動速度が上がり、効果中は移動速度低下を受けなくなります。"
    }];
  }
  const descriptionSources = [
    state.wikiMoveDescriptionsJa && state.wikiMoveDescriptionsJa.entries || {},
    state.slowDescriptionsJa && state.slowDescriptionsJa.entries || {}
  ];
  for (const entries of descriptionSources) {
    const translated = row.descriptionKey && entries[row.descriptionKey];
    if (Array.isArray(translated) && translated.length) {
      const overview = translated
        .map((part) => ({ label: String(part.label || ""), text: cleanSlowDescription(part.text) }))
        .filter((part) => part.text && part.label === "技の概要");
      if (overview.length) return overview;
    }
  }
  const context = String(row.accelerationContext || "");
  const target = row.targetLabel === "味方"
    ? "味方ポケモン"
    : row.targetLabel === "自分・味方"
      ? "自分と味方ポケモン"
      : "自分";
  let condition = "技を使うと";
  if (row.sourceType === "battle") {
    condition = "使用すると";
  } else if (row.sourceType === "item") {
    condition = /not in combat|has not been in combat/i.test(context)
      ? "戦闘から離れていると"
      : /auto attack|basic attack/i.test(context)
        ? "通常攻撃による発動条件を満たすと"
        : "発動条件を満たすと";
  } else if (/while attached/i.test(context)) {
    condition = "味方ポケモンにくっついている間";
  } else if (/(?:knocks? out|ko(?:'d|s)?).*?(?:enemy|opposing)|(?:enemy|opposing).*?(?:knocks? out|ko(?:'d|s)?)/i.test(context)) {
    condition = "相手ポケモンをKOしたとき";
  } else if (/when damaged|takes? damage|receiv(?:e|es|ed|ing) damage/i.test(context)) {
    condition = "ダメージを受けたとき";
  } else if (/not in combat|has not been in combat|outside combat/i.test(context)) {
    condition = "戦闘から離れているとき";
  } else if (/while (?:charging|this move is being charged)|charge(?:s|d|ing) power/i.test(context)) {
    condition = "力を溜めている間";
  } else if (/while (?:in stealth|stealthed)|enters? stealth/i.test(context)) {
    condition = "ステルス状態になったとき";
  } else if (/when (?:this move|the move) hits|if (?:this move|it) hits|when hit(?:ting)? an opposing|after hitting an opposing/i.test(context)) {
    condition = "技を相手ポケモンに命中させると";
  } else if (/after (?:using|this move is used)|when this move is used/i.test(context)) {
    condition = "技を使ったあと";
  } else if (/picks? up|eating? (?:a |the )?(?:berry|berries)|consum(?:e|es|ed|ing)/i.test(context)) {
    condition = "設置物やきのみなどの取得条件を満たすと";
  } else if (/moving toward|approaching|when near|nearby ally/i.test(context)) {
    condition = "指定された対象へ近づいているとき";
  } else if (/inside|within (?:the|this|an?) (?:area|zone|field|veil)|on the path/i.test(context)) {
    condition = "技が作る範囲内にいるとき";
  } else if (/while [^.]{0,55}(?:active|in effect)|for the duration of (?:this move|the buff)/i.test(context)) {
    condition = "技の効果が続いている間";
  }
  const sourceText = row.sourceType === "item"
    ? `${row.sourceLabel}は、${condition}${target}の移動速度を上げるもちものです。`
    : row.sourceType === "battle"
      ? `${row.moveName}は、${condition}${target}の移動速度を上げるバトルアイテムです。`
      : `${row.moveName}は、${condition}${target}の移動速度を上げる効果を持ちます。`;
  return [{ label: "技の概要", text: sourceText }];
}

function pokemonAccelerationRankingRows(pokemon) {
  const rows = [];
  (pokemon.skills || []).forEach((skill) => {
    [skill, ...((skill && skill.upgrades) || [])].filter(Boolean).forEach((node) => {
      [["rsb", node.rsb], ["boosted_rsb", node.boosted_rsb]].forEach(([rsbKey, rsb]) => {
        if (!rsb) return;
        const candidates = SLOW_EFFECT_TEXT_FIELDS.flatMap((field) => (
          accelerationPercentCandidates(rsb[field.key], field.enhanced)
        ));
        if (!candidates.length) return;
        candidates.sort((a, b) => (
          b.percent - a.percent
          || a.basePercent - b.basePercent
          || Number(a.enhanced) - Number(b.enhanced)
        ));
        const detailParts = accelerationDetailParts(node, rsb);
        const moveName = slowMoveDisplayName(skill, node, rsbKey, detailParts);
        const normalCandidates = candidates.filter((candidate) => !candidate.enhanced);
        const enhancedCandidates = candidates.filter((candidate) => candidate.enhanced);
        const bestNormal = normalCandidates[0] || null;
        const bestEnhanced = enhancedCandidates[0] || null;
        const enhancedAccelerationText = SLOW_EFFECT_TEXT_FIELDS
          .filter((field) => field.enhanced)
          .map((field) => cleanSlowDescription(rsb[field.key]))
          .filter((text) => text && accelerationTextHasEffect(text))
          .join(" ");
        const variants = [];
        if (bestNormal) {
          const normalCandidate = { ...bestNormal };
          const normalContext = normalCandidates.map((candidate) => candidate.context).join(" ");
          const conditionalAdditive = normalContext.match(
            /\b(?:additionally|further)\s+increas(?:e|es|ed|ing)\s+[^.;%]{0,70}?movement speed\s+by\s+(\d+(?:\.\d+)?)%/i
          );
          if (conditionalAdditive && bestNormal.percent > number(conditionalAdditive[1], 0)) {
            normalCandidate.percent = bestNormal.percent + number(conditionalAdditive[1], 0);
            normalCandidate.variable = true;
          }
          variants.push({
            candidate: normalCandidate,
            minPercent: conditionalAdditive
              ? bestNormal.percent
              : Math.min(...normalCandidates.map((candidate) => candidate.minPercent)),
            variable: normalCandidates.some((candidate) => candidate.variable)
              || new Set(normalCandidates.map((candidate) => candidate.percent)).size > 1
              || Boolean(conditionalAdditive),
            context: normalContext,
            decayContext: bestNormal.context,
            isPlus: false
          });
        }
        if (bestEnhanced) {
          const plusCandidate = { ...bestEnhanced, enhanced: true };
          const additive = enhancedAccelerationText.match(/\b(?:further|additionally)\s+increas(?:e|es|ed|ing)\s+[^.;%]{0,70}?movement speed\s+by\s+(\d+(?:\.\d+)?)%/i);
          if (additive && bestNormal && plusCandidate.percent <= bestNormal.percent) {
            plusCandidate.basePercent = bestNormal.basePercent + number(additive[1], 0);
            plusCandidate.percent = bestNormal.percent + number(additive[1], 0);
            plusCandidate.minPercent = Math.min(bestNormal.minPercent, plusCandidate.percent);
            plusCandidate.variable = bestNormal.variable;
          }
          variants.push({
            candidate: plusCandidate,
            moveName: `${moveName}+`,
            moveNote: node.level2 ? `${jpAbility(skill.ability)}・レベル${node.level2}以降` : `${jpAbility(skill.ability)}・強化後`,
            minPercent: plusCandidate.minPercent,
            variable: plusCandidate.variable,
            context: [bestNormal && bestNormal.context, enhancedAccelerationText, bestEnhanced.context].filter(Boolean).join(" "),
            decayContext: enhancedAccelerationText || bestEnhanced.context || (bestNormal && bestNormal.context) || "",
            isPlus: true
          });
        }
        variants.forEach((variant) => {
          const candidate = variant.candidate;
          const context = variant.context || candidate.context;
          let targetLabel = accelerationTargetLabel(candidate.targetContext || context);
          if (targetLabel === "自分"
              && /\btheir movement speed/i.test(candidate.targetContext || "")
              && /\b(?:ally|allies|allied|teammates?)\b|team members?/i.test(context)) {
            targetLabel = accelerationTargetLabel(context);
          }
          const abilityNote = skill.ability === "Passive" ? "特性" : skill.ability === "Basic" ? "通常攻撃" : jpAbility(skill.ability);
          rows.push({
            sourceType: "pokemon",
            sourceName: pokemon.name,
            sourceLabel: jpPokemonName(pokemon),
            sourceIcon: pokemonThumbUrl(pokemon.name),
            sourceBadge: "",
            sourceBadgeClass: "",
            moveName: variant.moveName || moveName,
            moveNote: variant.moveNote || `${abilityNote}・${targetLabel}${candidate.enhanced ? "・強化後最大" : ""}`,
            moveIcon: skillIconUrl(pokemon.name, skill.ability === "Basic" ? "Attack" : node.name),
            accelerationPercent: candidate.percent,
            basePercent: candidate.basePercent,
            stackMultiplier: candidate.multiplier,
            minAccelerationPercent: Number.isFinite(variant.minPercent) ? variant.minPercent : candidate.minPercent,
            enhanced: candidate.enhanced,
            decays: candidate.decays,
            grows: candidate.grows,
            variable: typeof variant.variable === "boolean" ? variant.variable : candidate.variable,
            accelerationDuration: candidate.duration,
            accelerationContext: context,
            accelerationDecayContext: variant.decayContext,
            targetLabel,
            descriptionKey: slowDescriptionKey(pokemon, skill, node, rsbKey),
            detailParts
          });
        });
      });
    });
  });
  return rows;
}

function supplementalAccelerationRankingRows() {
  const rows = [];
  state.heldItems.forEach((item) => {
    const descriptions = [item.description1, item.description2, item.description3].filter(Boolean);
    const candidates = descriptions.flatMap((description) => accelerationPercentCandidates(description));
    candidates.sort((a, b) => b.percent - a.percent || a.basePercent - b.basePercent);
    const best = candidates[0];
    if (!best) return;
    rows.push({
      sourceType: "item",
      sourceName: item.name,
      sourceLabel: jpItemName(item),
      sourceIcon: heldItemIconUrl(item.name),
      sourceBadge: "ITEM",
      sourceBadgeClass: "item",
      moveName: jpItemName(item),
      moveNote: "もちもの・最大効果",
      moveIcon: heldItemIconUrl(item.name),
      accelerationPercent: best.percent,
      basePercent: best.basePercent,
      stackMultiplier: best.multiplier,
      minAccelerationPercent: best.minPercent,
      enhanced: false,
      decays: best.decays,
      grows: best.grows,
      variable: best.variable || candidates.length > 1,
      accelerationDuration: best.duration,
      accelerationContext: descriptions.join(" "),
      targetLabel: "自分",
      detailParts: descriptions.map((text) => ({ label: "", text }))
    });
  });
  rows.push({
    sourceType: "battle",
    sourceName: "X Speed",
    sourceLabel: "スピーダー",
    sourceIcon: "https://assets.dittobase.com/unite/battle-items/x-speed.png",
    sourceBadge: "BATTLE",
    sourceBadgeClass: "battle",
    moveName: "スピーダー",
    moveNote: "バトルアイテム・自分",
    moveIcon: "https://assets.dittobase.com/unite/battle-items/x-speed.png",
    accelerationPercent: 45,
    basePercent: 45,
    stackMultiplier: 1,
    minAccelerationPercent: 45,
    enhanced: false,
    decays: false,
    grows: false,
    variable: false,
    accelerationDuration: 7,
    accelerationContext: "Increases the user's movement speed by 45% for 7s and prevents movement speed from being decreased.",
    targetLabel: "自分",
    accelerationDetailPartsJa: [
      {
        label: "加速条件",
        text: "バトルアイテムを使用した直後。"
      },
      {
        label: "加速効果",
        text: "自分の移動速度を45%上げ、7秒間は移動速度低下を受けなくなります。"
      }
    ],
    detailParts: []
  });
  return rows;
}

function accelerationPercentageLabel(row) {
  const notes = [];
  if (row.enhanced) notes.push("強化後");
  if (row.stackMultiplier > 1) {
    notes.push(`${formatNumber(row.basePercent, 1)}%×${formatNumber(row.stackMultiplier, 0)}`);
  } else if (row.grows && row.basePercent < row.accelerationPercent) {
    notes.push("累積加速");
    return `${formatNumber(row.basePercent, 1)}%～${formatNumber(row.accelerationPercent, 1)}%（${notes.join("・")}）`;
  } else if (row.decays && row.minAccelerationPercent < row.accelerationPercent) {
    notes.push("減衰");
    return `${formatNumber(row.accelerationPercent, 1)}%～${formatNumber(row.minAccelerationPercent, 1)}%（${notes.join("・")}）`;
  } else if (row.variable && row.minAccelerationPercent < row.accelerationPercent) {
    notes.push("条件変動");
    return `${formatNumber(row.minAccelerationPercent, 1)}%～${formatNumber(row.accelerationPercent, 1)}%（${notes.join("・")}）`;
  } else if (row.variable) {
    notes.push("最大");
  }
  return `${formatNumber(row.accelerationPercent, 1)}%${notes.length ? `（${notes.join("・")}）` : ""}`;
}

function accelerationEffectProfile(row) {
  const context = String(row.accelerationContext || "");
  const maximum = number(row.accelerationPercent, 0);
  const decay = accelerationDecayDetails(row.accelerationDecayContext || context);
  const decayDuration = number(decay && decay.duration, 0);
  const duration = decay && decay.total && decayDuration > 0
    ? decayDuration
    : accelerationEffectDuration(row) || decayDuration;
  const growth = accelerationGrowthDetails(context);
  const decays = Boolean(row.decays || decay);
  let minimum = number(row.minAccelerationPercent, row.accelerationPercent);
  const explicitMinimum = decay && number(decay.minimum, 0);
  if (explicitMinimum > 0) {
    minimum = Math.min(maximum, explicitMinimum);
  } else if (decays && minimum >= maximum && decay) {
    if (decay.total && decay.decrement > 0) {
      minimum = Math.max(0, maximum - decay.decrement);
    } else if (decay.decrement > 0 && decay.interval > 0) {
      const decayDuration = number(decay.duration, 0) || duration;
      const repeatCount = decay.times > 0
        ? decay.times
        : decayDuration > 0
          ? Math.floor(decayDuration / decay.interval)
          : 0;
      if (repeatCount > 0) minimum = Math.max(0, maximum - decay.decrement * repeatCount);
    }
  }
  const chips = [];
  const steps = [];
  let kind = "fixed";

  if (row.stackMultiplier > 1) {
    kind = "stack";
    chips.push({ label: "累積", className: "stack" });
    chips.push({ label: `${formatNumber(row.stackMultiplier, 0)}段階`, className: "stack" });
    for (let index = 1; index <= row.stackMultiplier; index += 1) {
      steps.push(Math.min(maximum, row.basePercent * index));
    }
  } else if (decays) {
    kind = "decay";
    chips.push({ label: "減衰", className: "decay" });
    const decrement = decay ? decay.decrement : 0;
    if (decay && decay.total && decrement > 0) {
      steps.push(maximum, minimum);
    } else if (decrement > 0) {
      let repeatCount = decay.times > 0 ? decay.times : 0;
      if (repeatCount <= 0 && explicitMinimum > 0) {
        repeatCount = Math.ceil((maximum - minimum) / decrement);
      }
      const decayDuration = number(decay.duration, 0) || duration;
      if (repeatCount <= 0 && decay.interval > 0 && decayDuration > 0) {
        repeatCount = Math.floor(decayDuration / decay.interval);
      }
      repeatCount = Math.max(1, Math.min(repeatCount || 1, 16));
      for (let index = 0; index <= repeatCount; index += 1) {
        const value = Math.max(minimum, maximum - decrement * index);
        if (steps[steps.length - 1] !== value) steps.push(value);
        if (value === minimum) break;
      }
      if (steps[steps.length - 1] !== minimum) steps.push(minimum);
    } else if (minimum < maximum) {
      steps.push(maximum, minimum);
    } else {
      steps.push(maximum);
    }
  } else if (row.grows && minimum > 0 && minimum < maximum) {
    kind = "growth";
    chips.push({ label: "累積加速", className: "growth" });
    if (growth && growth.increment > 0) {
      for (let value = minimum; value < maximum && steps.length < 16; value += growth.increment) {
        steps.push(Math.min(maximum, Number(value.toFixed(3))));
      }
      if (steps[steps.length - 1] !== maximum) steps.push(maximum);
      if (growth.interval > 0) {
        chips.push({
          label: `${formatNumber(growth.interval, 1)}秒ごとに+${formatNumber(growth.increment, 1)}%`,
          className: "growth"
        });
      }
    } else {
      steps.push(minimum, maximum);
    }
  } else if (row.variable && minimum > 0 && minimum < maximum) {
    kind = "range";
    chips.push({ label: "条件変動", className: "growth" });
    steps.push(minimum, maximum);
  } else if (row.variable) {
    chips.push({ label: "最大値", className: "growth" });
  }
  if (row.enhanced) chips.unshift({ label: "強化後", className: "enhanced" });
  if (duration > 0) chips.push({ label: `⏱ ${formatNumber(duration, 1)}秒`, className: "duration" });
  return { kind, chips, steps };
}

function accelerationEffectVisualMarkup(row) {
  const profile = accelerationEffectProfile(row);
  const mainValue = profile.steps.length > 1 && (profile.kind === "growth" || profile.kind === "decay" || profile.kind === "range")
    ? `${formatNumber(profile.steps[0], 1)}～${formatNumber(profile.steps[profile.steps.length - 1], 1)}%`
    : `${formatNumber(row.accelerationPercent, 1)}%`;
  const chips = profile.chips.map((chip) => (
    `<span class="slow-effect-chip ${escapeHtml(chip.className)}">${escapeHtml(chip.label)}</span>`
  )).join("");
  const meter = profile.steps.length > 1
    ? `<span class="slow-effect-meter ${escapeHtml(profile.kind)}" aria-hidden="true">${profile.steps.map((value, index) => {
      const progress = profile.steps.length > 1 ? index / (profile.steps.length - 1) : 1;
      const opacity = profile.kind === "decay" ? 1 - progress * 0.72 : 0.35 + progress * 0.65;
      return `<span style="opacity:${formatNumber(opacity, 2)}"></span>`;
    }).join("")}</span>`
    : "";
  const flow = profile.steps.length > 1
    ? `<span class="slow-effect-flow" aria-hidden="true">${profile.steps.map((value, index) => (
      `${index ? '<span class="slow-effect-flow-arrow">→</span>' : ""}<span class="slow-effect-flow-value">${escapeHtml(formatNumber(value, 1))}%</span>`
    )).join("")}</span>`
    : "";
  return `<div class="slow-effect-visual acceleration-effect-visual">
    <span class="slow-effect-main acceleration-effect-main">${escapeHtml(mainValue)}</span>
    ${chips ? `<span class="slow-effect-chips">${chips}</span>` : ""}
    ${meter}
    ${flow}
    <span class="visually-hidden">${escapeHtml(accelerationPercentageLabel(row))}</span>
  </div>`;
}

let activeAccelerationMoveTooltipTrigger = null;
let accelerationMoveTooltipPinned = false;

function ensureAccelerationMoveTooltip() {
  let tooltip = document.getElementById("accelerationMoveTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "accelerationMoveTooltip";
  tooltip.className = "slow-move-tooltip acceleration-move-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  return tooltip;
}

function showAccelerationMoveTooltip(trigger, pinned = false) {
  const rowIndex = number(trigger && trigger.dataset.accelerationRowIndex, -1);
  const row = state.accelerationRankingRows[rowIndex];
  if (!trigger || !row) return;
  const detailParts = Array.isArray(row.accelerationDetailPartsJa) && row.accelerationDetailPartsJa.length
    ? row.accelerationDetailPartsJa
    : japaneseAccelerationFallbackParts(row);
  const parts = [...localizedAccelerationOverviewParts(row), ...detailParts];
  if (!parts.length) return;
  const preservePin = activeAccelerationMoveTooltipTrigger === trigger && accelerationMoveTooltipPinned;
  const tooltip = ensureAccelerationMoveTooltip();
  const body = parts.map((part) => (
    `<div class="slow-move-tooltip-part">${part.label ? `<strong>${escapeHtml(part.label)}：</strong>` : ""}${escapeHtml(part.text)}</div>`
  )).join("");
  tooltip.innerHTML = `<strong class="slow-move-tooltip-title">${escapeHtml(row.sourceLabel)} / ${escapeHtml(row.moveName)}</strong>${body}`;
  tooltip.hidden = false;
  if (activeAccelerationMoveTooltipTrigger && activeAccelerationMoveTooltipTrigger !== trigger) {
    activeAccelerationMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  }
  activeAccelerationMoveTooltipTrigger = trigger;
  accelerationMoveTooltipPinned = pinned || preservePin;
  tooltip.classList.toggle("is-pinned", accelerationMoveTooltipPinned);
  trigger.setAttribute("aria-expanded", "true");
  positionSlowMoveTooltip(trigger, tooltip);
}

function hideAccelerationMoveTooltip(force = false) {
  if (accelerationMoveTooltipPinned && !force) return;
  const tooltip = document.getElementById("accelerationMoveTooltip");
  if (tooltip) {
    tooltip.hidden = true;
    tooltip.classList.remove("is-pinned");
  }
  if (activeAccelerationMoveTooltipTrigger) activeAccelerationMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  activeAccelerationMoveTooltipTrigger = null;
  accelerationMoveTooltipPinned = false;
}

function selectedAccelerationFilterKeys() {
  return new Set(
    [...el.accelerationFilterOptions.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value)
  );
}

function accelerationRowMatchesFilter(row, key) {
  const profile = accelerationEffectProfile(row);
  if (key === "stack") return row.stackMultiplier > 1;
  if (key === "decay") return Boolean(row.decays || profile.kind === "decay");
  if (key === "instant") {
    return row.stackMultiplier <= 1 && !row.decays && !row.grows && profile.kind === "fixed";
  }
  if (key === "enhanced") return Boolean(row.enhanced);
  return true;
}

function syncAccelerationFilterStatus(selectedKeys, sortOrder, visibleCount, totalCount) {
  const selectedLabels = [...selectedKeys]
    .map((key) => SLOW_FILTER_LABELS[key])
    .filter(Boolean);
  const conditionText = selectedLabels.length
    ? `効果タイプ: ${selectedLabels.join("・")}（AND）`
    : "効果タイプ: すべて";
  const orderText = sortOrder === "asc" ? "加速率の昇順" : "加速率の降順";
  el.accelerationFilterStatus.textContent = `${conditionText} / ${orderText} / ${formatNumber(visibleCount, 0)}件表示（全${formatNumber(totalCount, 0)}件）`;
}

function updateAccelerationRanking() {
  if (!el.accelerationRankingBody) return;
  hideAccelerationMoveTooltip(true);
  const rows = state.pokemon
    .filter((pokemon) => !pokemon.exclude_stats)
    .flatMap(pokemonAccelerationRankingRows)
    .concat(supplementalAccelerationRankingRows());
  const uniqueRows = [];
  const seen = new Set();
  rows.forEach((row) => {
    const key = [
      row.sourceType,
      row.sourceName,
      row.moveName,
      row.moveNote,
      row.accelerationPercent,
      (row.accelerationDetailPartsJa || row.detailParts || []).map((part) => part.text).join("|")
    ].join("::");
    if (seen.has(key)) return;
    seen.add(key);
    uniqueRows.push(row);
  });
  const selectedFilters = selectedAccelerationFilterKeys();
  const sortOrder = el.accelerationRankingSortOrder.value === "asc" ? "asc" : "desc";
  const visibleRows = selectedFilters.size
    ? uniqueRows.filter((row) => [...selectedFilters].every((key) => accelerationRowMatchesFilter(row, key)))
    : [...uniqueRows];
  visibleRows.sort((a, b) => (
    (sortOrder === "asc" ? a.accelerationPercent - b.accelerationPercent : b.accelerationPercent - a.accelerationPercent)
    || a.sourceType.localeCompare(b.sourceType)
    || a.sourceLabel.localeCompare(b.sourceLabel, "ja")
    || a.moveName.localeCompare(b.moveName, "ja")
  ));
  state.accelerationRankingRows = visibleRows;

  if (!visibleRows.length) {
    const message = uniqueRows.length
      ? "選択した条件に一致する加速効果がありません。"
      : "表示できる加速効果がありません。";
    el.accelerationRankingBody.innerHTML = `<tr class="slow-ranking-empty"><td colspan="4">${message}</td></tr>`;
  } else {
    el.accelerationRankingBody.innerHTML = visibleRows.map((row, index) => {
      const badge = row.sourceBadge
        ? `<span class="slow-ranking-source-badge ${escapeHtml(row.sourceBadgeClass)}" aria-hidden="true">${escapeHtml(row.sourceBadge)}</span>`
        : "";
      const imageFallback = `this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';`;
      return `<tr>
        <td class="ranking-rank">${index + 1}</td>
        <td>
          <div class="slow-ranking-source">
            <span class="slow-ranking-source-icon" title="${escapeHtml(row.sourceLabel)}">
              <img src="${escapeHtml(row.sourceIcon)}" alt="" loading="lazy" onerror="${imageFallback}">
              ${badge}
              <span class="visually-hidden">${escapeHtml(row.sourceLabel)}</span>
            </span>
          </div>
        </td>
        <td>
          <div class="ranking-move">
            <button
              class="slow-move-icon-trigger acceleration-move-icon-trigger"
              type="button"
              data-acceleration-row-index="${index}"
              aria-label="${escapeHtml(row.moveName)}の技概要と加速仕様を表示"
              aria-expanded="false"
              aria-describedby="accelerationMoveTooltip"
            >
              <img src="${escapeHtml(row.moveIcon || brokenImageUrl())}" alt="" loading="lazy" onerror="${imageFallback}">
            </button>
            <span><span class="ranking-name">${escapeHtml(row.moveName)}</span><span class="ranking-note">${escapeHtml(row.moveNote)}</span></span>
          </div>
        </td>
        <td class="slow-ranking-percent acceleration-ranking-percent">${accelerationEffectVisualMarkup(row)}</td>
      </tr>`;
    }).join("");
  }
  syncAccelerationFilterStatus(selectedFilters, sortOrder, visibleRows.length, uniqueRows.length);
}
