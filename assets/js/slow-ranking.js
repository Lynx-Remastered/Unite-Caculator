// Slow-effect extraction, normalization, ranking, and tooltip rendering.
const SLOW_EFFECT_TEXT_FIELDS = [
  { key: "true_desc", label: "", enhanced: false },
  { key: "notes", label: "備考", enhanced: false },
  { key: "rsb_info", label: "追加仕様", enhanced: false },
  { key: "add1_true_desc", label: "追加効果", enhanced: false },
  { key: "add1_notes", label: "追加効果の備考", enhanced: false },
  { key: "add1_rsb_info", label: "追加効果の仕様", enhanced: false },
  { key: "add2_true_desc", label: "追加効果", enhanced: false },
  { key: "add2_notes", label: "追加効果の備考", enhanced: false },
  { key: "add2_rsb_info", label: "追加効果の仕様", enhanced: false },
  { key: "add3_true_desc", label: "追加効果", enhanced: false },
  { key: "add3_notes", label: "追加効果の備考", enhanced: false },
  { key: "add3_rsb_info", label: "追加効果の仕様", enhanced: false },
  { key: "add4_true_desc", label: "追加効果", enhanced: false },
  { key: "add4_notes", label: "追加効果の備考", enhanced: false },
  { key: "add4_rsb_info", label: "追加効果の仕様", enhanced: false },
  { key: "add5_true_desc", label: "追加効果", enhanced: false },
  { key: "add5_notes", label: "追加効果の備考", enhanced: false },
  { key: "add5_rsb_info", label: "追加効果の仕様", enhanced: false },
  { key: "enhanced_true_desc", label: "強化後", enhanced: true },
  { key: "enhanced_notes", label: "強化後の備考", enhanced: true },
  { key: "enhanced_rsb_info", label: "強化後の仕様", enhanced: true },
  { key: "enhanced_add1_true_desc", label: "強化後の追加効果", enhanced: true },
  { key: "enhanced_add1_notes", label: "強化後の追加効果の備考", enhanced: true },
  { key: "enhanced_add1_rsb_info", label: "強化後の追加効果の仕様", enhanced: true },
  { key: "enhanced_add2_true_desc", label: "強化後の追加効果", enhanced: true },
  { key: "enhanced_add2_notes", label: "強化後の追加効果の備考", enhanced: true },
  { key: "enhanced_add2_rsb_info", label: "強化後の追加効果の仕様", enhanced: true },
  { key: "enhanced_add3_true_desc", label: "強化後の追加効果", enhanced: true },
  { key: "enhanced_add3_notes", label: "強化後の追加効果の備考", enhanced: true },
  { key: "enhanced_add3_rsb_info", label: "強化後の追加効果の仕様", enhanced: true },
  { key: "enhanced_add4_true_desc", label: "強化後の追加効果", enhanced: true },
  { key: "enhanced_add4_notes", label: "強化後の追加効果の備考", enhanced: true },
  { key: "enhanced_add4_rsb_info", label: "強化後の追加効果の仕様", enhanced: true },
  { key: "enhanced_add5_true_desc", label: "強化後の追加効果", enhanced: true },
  { key: "enhanced_add5_notes", label: "強化後の追加効果の備考", enhanced: true },
  { key: "enhanced_add5_rsb_info", label: "強化後の追加効果の仕様", enhanced: true }
];

const SLOW_PERCENT_PATTERNS = [
  /(?:decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)\s+(?:the\s+)?movement speed of\s+(?:those|opposing|enem(?:y|ies)|targets?|pok(?:é|e)mon)[^;,%]{0,75}?\sby\s+(\d+(?:\.\d+)?)%/gi,
  /(?:decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)\s+(?:the\s+)?movement speed of\s+[^.;,%]{0,75}?(?:by|to)\s+(\d+(?:\.\d+)?)%/gi,
  /(?:decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)\s+[^.;,%]{0,55}?movement speed[^.;,%]{0,40}?(?:by|to)\s+(\d+(?:\.\d+)?)%/gi,
  /(?:decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)[^.;]{0,170}?\band\s+(?:their\s+|the\s+)?movement speed[^.;%]{0,45}?(?:by|to)\s+(\d+(?:\.\d+)?)%/gi,
  /\band\s+(?:their\s+|the\s+)?movement speed[^.;%]{0,45}?(?:by|to)\s+(\d+(?:\.\d+)?)%/gi,
  /movement speed(?:\s+of\s+[^.;,%]{0,65}?)?\s+(?:is\s+)?(?:also\s+)?(?:decreas(?:e|es|ed)|reduc(?:e|es|ed)|lowered)[^.;,%]{0,35}?(?:by|to)\s+(\d+(?:\.\d+)?)%/gi,
  /(\d+(?:\.\d+)?)%\s+(?:decreas(?:e|ed)|reduc(?:e|ed))\s+movement speed/gi,
  /\bslow(?:s|ed|ing)?\s+by\s+(\d+(?:\.\d+)?)%/gi,
  /slow(?:s|ed|ing)?(?:\s+movement speed)?\s+[^.;,%]{0,75}?\sby\s+(\d+(?:\.\d+)?)%/gi,
  /\bslow(?:s|ed|ing)?\s+(\d+(?:\.\d+)?)%/gi,
  /(?:appl(?:y|ies|ying)|inflict(?:s|ed|ing)?)\s+(?:a\s+)?(\d+(?:\.\d+)?)%\s+slow/gi,
  /(\d+(?:\.\d+)?)%\s+(?:movement speed\s+)?slow/gi,
  /movement speed (?:decrease|reduction)[^.;%]{0,60}?(?:increased|strengthened)\s+to\s+(\d+(?:\.\d+)?)%/gi,
  /(?:increases?|strengthens?)\s+(?:the\s+)?movement speed (?:decrease|reduction)[^.;%]{0,100}?\s+to\s+(\d+(?:\.\d+)?)%/gi,
  /\bslow[^.;%]{0,60}?(?:increased|strengthened)\s+to\s+(\d+(?:\.\d+)?)%/gi,
  /\b(?:increases?|strengthens?)\s+the\s+slow\s+to\s+(\d+(?:\.\d+)?)%/gi
];

function cleanSlowDescription(value) {
  return String(value || "")
    .replace(/Pok(?:ﾃｩ|Ã©)mon/g, "Pokémon")
    .replace(/\s+/g, " ")
    .trim();
}

function slowTextHasEffect(value) {
  return /(?:\bslow(?:s|ed|ing)?\b|movement speed)/i.test(String(value || ""));
}

const SLOW_HARD_STOP_PATTERN = /\b(?:stun(?:s|ned|ning)?|bind(?:s|ing)?|bound|root(?:s|ed|ing)?|immobili[sz](?:e|es|ed|ing|ation)|unable to (?:move|act)|cannot move|frozen|freeze(?:s|ing)?)\b/i;

function lastSlowContextIndex(text, patterns) {
  return Math.max(-1, ...patterns.map((pattern) => text.search(pattern)));
}

function slowMatchTargetsOpponent(text, match, pokemonName = "") {
  const exact = match[0].toLowerCase();
  if (/(?:opposing|enem(?:y|ies)|targets?|those(?:\s+that)?(?:\s+are)?\s+hit|them\b|linked target)/i.test(exact)) return true;
  if (/(?:the user|user's|itself|themselves|their own)/i.test(exact)) return false;
  if (/\b(?:slows?|slowed|slowing)\s+pok(?:é|e)mon\b/i.test(exact)) return true;
  if (/(?:appl(?:y|ies|ying)|inflict(?:s|ed|ing)?)\s+(?:a\s+)?\d+(?:\.\d+)?%\s+slow/i.test(exact)) return true;

  const after = text.slice(match.index + match[0].length, Math.min(text.length, match.index + match[0].length + 100)).toLowerCase();
  if (/^\s*[,;]?\s*(?:while|during)\s+(?:charging|casting|using|breathing|snarling|moving backward|this move is being used|the move is being used)\b/i.test(after)) {
    return false;
  }
  if (/^\s*(?:for\s+\d+(?:\.\d+)?s\s+)?(?:to|on)\s+(?:opposing|enem(?:y|ies)|targets?|pok(?:é|e)mon)/i.test(after)) {
    return true;
  }
  const before = text.slice(Math.max(0, match.index - 180), match.index).toLowerCase();
  const beforeWide = text.slice(Math.max(0, match.index - 320), match.index).toLowerCase();
  if (/target['’]s\s*$/i.test(before)
      || /affected pok(?:é|e)mon['’]s[\s\S]{0,310}$/i.test(beforeWide)
      || (/\btheir movement speed/i.test(exact) && (/\bwhen hitting an enemy\b/i.test(after) || /\bdealing damage\b[^.;]{0,45}$/i.test(before)))) {
    return true;
  }
  if (/(?:opposing|enem(?:y|ies)|enemy players?|locked-on enemy|targets?|those hit|pok(?:é|e)mon (?:it |they )?hits?)[^.;]{0,100}$/i.test(before)
      && !/(?:the user|user['’]s|itself|themselves)[^.;]{0,45}$/i.test(before)) {
    return true;
  }
  const targetIndex = lastSlowContextIndex(before, [
    /opposing(?![\s\S]*opposing)/i,
    /enem(?:y|ies)(?![\s\S]*enem(?:y|ies))/i,
    /targets?(?![\s\S]*targets?)/i,
    /those hit(?![\s\S]*those hit)/i,
    /pok(?:é|e)mon hit(?![\s\S]*pok(?:é|e)mon hit)/i
  ]);
  const escapedName = String(pokemonName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selfPatterns = [
    /the user(?![\s\S]*the user)/i,
    /user's(?![\s\S]*user's)/i,
    /itself(?![\s\S]*itself)/i,
    /themselves(?![\s\S]*themselves)/i
  ];
  if (escapedName) selfPatterns.push(new RegExp(`${escapedName.toLowerCase()}(?![\\s\\S]*${escapedName.toLowerCase()})`, "i"));
  const selfIndex = lastSlowContextIndex(before, selfPatterns);
  if (selfIndex > targetIndex) return false;
  if (targetIndex >= 0) return true;
  if (/(?:while|as|during)\s+(?:casting|charging|using|breathing|snarling|moving backward|this move is being used|the move is being used)/i.test(`${before} ${exact} ${after}`)) return false;
  return !/(?:\buser\b|itself|themselves)/i.test(exact);
}

function slowStackMultiplier(text, match) {
  const before = text.slice(Math.max(0, match.index - 180), match.index);
  const after = text.slice(match.index, Math.min(text.length, match.index + 220));
  const near = `${before} ${match[0]} ${after}`;
  const stackMatches = [
    ...near.matchAll(/stack(?:ing)?\s+up to\s+(\d+)\s+times/gi),
    ...near.matchAll(/(?:can|may)\s+stack\s+up to\s+(\d+)\s+times/gi),
    ...near.matchAll(/up to\s+(\d+)\s+stacks/gi)
  ];
  let multiplier = stackMatches.reduce((max, row) => Math.max(max, number(row[1], 1)), 1);
  if (/per\s+['"]?note['"]?/i.test(near)) {
    const noteCount = near.match(/(?:reaching|up to)\s+(\d+)\s+notes?/i);
    if (noteCount) multiplier = Math.max(multiplier, number(noteCount[1], 1));
  }
  return Math.max(1, multiplier);
}

function slowPercentCandidates(value, pokemonName = "", enhanced = false) {
  const text = cleanSlowDescription(value);
  const candidates = [];
  SLOW_PERCENT_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      const basePercent = number(match[1], 0);
      const context = text.slice(Math.max(0, match.index - 120), Math.min(text.length, pattern.lastIndex + 180));
      const hardStopOnly = SLOW_HARD_STOP_PATTERN.test(match[0]) && !slowTextHasEffect(match[0]);
      if (hardStopOnly) continue;
      if (basePercent <= 0 || !slowMatchTargetsOpponent(text, match, pokemonName)) continue;
      const multiplier = slowStackMultiplier(text, match);
      const key = `${match.index}:${basePercent}:${multiplier}`;
      if (candidates.some((candidate) => candidate.key === key)) continue;
      candidates.push({
        key,
        basePercent,
        multiplier,
        percent: basePercent * multiplier,
        enhanced,
        decays: /decay/i.test(text.slice(match.index, match.index + 140)),
        context
      });
    }
  });
  return candidates;
}

function slowDetailParts(node, rsb) {
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
    if (slowTextHasEffect(value)) add(field.label, value);
  });
  return parts;
}

function slowMoveDisplayName(skill, node, rsbKey, detailParts) {
  if (skill && skill.ability === "Basic") {
    const detail = detailParts.map((part) => part.text).join(" ");
    return rsbKey === "boosted_rsb" || /(?:becomes a boosted attack|boosted attack with every)/i.test(detail)
      ? "強化攻撃"
      : "通常攻撃";
  }
  return jpMoveName(node && node.name || "");
}

function slowMoveNote(skill, bestCandidate) {
  const ability = skill && skill.ability || "";
  const note = ability === "Passive" ? "特性" : ability === "Basic" ? "通常攻撃" : jpAbility(ability);
  return `${note}${bestCandidate && bestCandidate.enhanced ? "・強化後最大" : ""}`;
}

function slowDescriptionKey(pokemon, skill, node, rsbKey) {
  return [pokemon.name, skill.ability || "", node.name || "", rsbKey].join("::");
}

function slowEffectDuration(row) {
  const explicit = number(row && row.slowDuration, 0);
  if (explicit > 0) return explicit;
  const context = String(row && row.slowContext || "");
  const patterns = [
    /(?:movement speed|slow(?:s|ed|ing)?)[^.]{0,100}?(?:for|lasting|lasts?(?:\s+for)?)\s+(\d+(?:\.\d+)?)s\b/i,
    /(?:for|lasting|lasts?(?:\s+for)?)\s+(\d+(?:\.\d+)?)s\b[^.]{0,80}(?:movement speed|slow)/i
  ];
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) return number(match[1], 0);
  }
  return 0;
}

function speedDecayCount(value) {
  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  };
  const text = String(value || "").toLowerCase();
  return words[text] || number(text, 0);
}

function speedDecayInterval(value) {
  const text = String(value || "").toLowerCase();
  if (text === "half") return 0.5;
  if (text === "one") return 1;
  return number(text, 0);
}

function speedDecayMinimum(context) {
  const text = String(context || "");
  const patterns = [
    /(?:down\s+)?to\s+(?:a\s+)?minimum(?:\s+of)?\s+(\d+(?:\.\d+)?)%/i,
    /\bminimum(?:\s+of)?\s+(\d+(?:\.\d+)?)%/i,
    /\bdown\s+to\s+(?:a\s+)?(\d+(?:\.\d+)?)%/i,
    /(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;]{0,160}?(?:down\s+)?to\s+(?:a\s+)?(\d+(?:\.\d+)?)%/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return number(match[1], 0);
  }
  return 0;
}

function speedDecaySpec(context) {
  const text = String(context || "")
    .replace(/\b(every|per)\s+(?:one\s+)?second\b/gi, "$1 1s")
    .replace(/\b(every|per)\s+half\s+(?:a\s+)?second\b/gi, "$1 0.5s");
  if (!/(?:decay|diminish)/i.test(text)) return null;
  const countPattern = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)";
  const intervalPattern = "(\\d+(?:\\.\\d+)?|half)\\s*(?:s(?:ec(?:ond)?s?)?|seconds?)?";
  const minimum = speedDecayMinimum(text);
  const amountFirst = new RegExp(
    `(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;%]{0,80}?(?:by|at)?\\s+(\\d+(?:\\.\\d+)?)%\\s+(every|per|after)\\s+${intervalPattern}(?:[^.]{0,60}?up to\\s+${countPattern}\\s+times)?(?:[^.]{0,60}?\\bover\\s+(\\d+(?:\\.\\d+)?)s)?`,
    "i"
  ).exec(text);
  if (amountFirst) {
    const leadingCount = new RegExp(`up to\\s+${countPattern}\\s+times`, "i").exec(amountFirst[0]);
    return {
      amount: number(amountFirst[1], 0),
      interval: speedDecayInterval(amountFirst[3]),
      times: amountFirst[2].toLowerCase() === "after"
        ? 1
        : speedDecayCount(amountFirst[4] || (leadingCount && leadingCount[1])),
      minimum,
      duration: number(amountFirst[5], 0),
      total: false
    };
  }
  const countFirst = new RegExp(
    `(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.]{0,40}?up to\\s+${countPattern}\\s+times[^.]{0,40}?(?:by|at)\\s+(\\d+(?:\\.\\d+)?)%\\s+(?:every|per)\\s+${intervalPattern}`,
    "i"
  ).exec(text);
  if (countFirst) {
    return {
      amount: number(countFirst[2], 0),
      interval: speedDecayInterval(countFirst[3]),
      times: speedDecayCount(countFirst[1]),
      minimum,
      duration: 0,
      total: false
    };
  }
  const intervalFirst = new RegExp(
    `(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;%]{0,80}?(?:every|per)\\s+${intervalPattern}\\s+(?:by|at)\\s+(\\d+(?:\\.\\d+)?)%`,
    "i"
  ).exec(text);
  if (intervalFirst) {
    return {
      amount: number(intervalFirst[2], 0),
      interval: speedDecayInterval(intervalFirst[1]),
      times: 0,
      minimum,
      duration: 0,
      total: false
    };
  }
  const totalDecay = text.match(
    /(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;%]{0,35}?\bby\s+(\d+(?:\.\d+)?)%\s+over\s+(\d+(?:\.\d+)?)s\b/i
  );
  if (totalDecay) {
    return {
      amount: number(totalDecay[1], 0),
      interval: 0,
      times: 1,
      minimum,
      duration: number(totalDecay[2], 0),
      total: true
    };
  }
  const transition = text.match(
    /(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;%]{0,100}?(?:down\s+)?to\s+(?:a\s+)?(?:minimum(?:\s+of)?\s+)?(\d+(?:\.\d+)?)%[^.;]{0,40}?\b(?:over|for)\s+(\d+(?:\.\d+)?)s\b/i
  );
  const intervalOnly = new RegExp(
    `(?:decay(?:s|ed|ing)?|diminish(?:es|ed|ing)?)[^.;]{0,80}?(?:every|per)\\s+${intervalPattern}`,
    "i"
  ).exec(text);
  return {
    amount: 0,
    interval: intervalOnly ? speedDecayInterval(intervalOnly[1]) : 0,
    times: 0,
    minimum: transition ? number(transition[1], minimum) : minimum,
    duration: transition ? number(transition[2], 0) : 0,
    total: false
  };
}

function slowDecaySpec(row) {
  return speedDecaySpec(String(row && (row.slowDecayContext || row.slowContext) || ""));
}

function japaneseSlowFallbackParts(row) {
  const details = [];
  const effect = row.stackMultiplier > 1
    ? `相手ポケモンの移動速度を1段階につき${formatNumber(row.basePercent, 1)}%下げ、最大${formatNumber(row.stackMultiplier, 0)}段階で${formatNumber(row.slowPercent, 1)}%まで累積します。`
    : `相手ポケモンの移動速度を${formatNumber(row.slowPercent, 1)}%下げます。`;
  details.push(effect);
  if (row.enhanced) details.push("この数値は強化後の最大効果です。");
  if (row.variable) details.push("複数段階または時間経過で変化するため、ランキングには到達可能な最大値を使用しています。");
  const duration = slowEffectDuration(row);
  if (duration > 0) details.push(`減速の持続時間は${formatNumber(duration, 1)}秒です。`);
  const decay = slowDecaySpec(row);
  if (decay) {
    const repeat = decay.times > 0 ? `、最大${formatNumber(decay.times, 0)}回` : "";
    const finalPercent = decay.minimum > 0
      ? decay.minimum
      : decay.times > 0 && decay.amount > 0
        ? Math.max(0, row.slowPercent - decay.amount * decay.times)
        : 0;
    const remaining = finalPercent > 0 ? `最終的に${formatNumber(finalPercent, 1)}%になります。` : "";
    if (decay.amount > 0 && decay.interval > 0) {
      details.push(`${formatNumber(decay.interval, 1)}秒ごとに${formatNumber(decay.amount, 1)}%ずつ${repeat}減衰します。${remaining}`);
    } else if (finalPercent > 0) {
      const transition = decay.duration > 0 ? `${formatNumber(decay.duration, 1)}秒かけて` : "時間経過で";
      details.push(`${transition}${formatNumber(finalPercent, 1)}%まで減衰します。`);
    }
  }
  const condition = /(?:near the center|center of)/i.test(row.slowContext || "")
    ? "効果範囲の中心付近に命中した相手へ適用されます。"
    : /outer ring/i.test(row.slowContext || "")
    ? "効果範囲の外周に触れた相手へ適用されます。"
    : /area|zone|radius|field/i.test(row.slowContext || "")
      ? "効果範囲内の相手へ適用されます。"
      : /boosted attack/i.test(row.slowContext || "")
        ? "強化攻撃が命中した相手へ適用されます。"
        : "攻撃または技が命中した相手へ適用されます。";
  details.push(condition);
  return [{ label: "減速仕様", text: details.join("") }];
}

function localizedSlowDetailParts(row) {
  if (Array.isArray(row.slowDetailPartsJa) && row.slowDetailPartsJa.length) {
    return row.slowDetailPartsJa
      .map((part) => ({ label: String(part.label || ""), text: cleanSlowDescription(part.text) }))
      .filter((part) => part.text);
  }
  if (row.useGeneratedSlowDetail) return japaneseSlowFallbackParts(row);
  const entries = state.slowDescriptionsJa && state.slowDescriptionsJa.entries || {};
  const translated = row.descriptionKey && entries[row.descriptionKey];
  if (Array.isArray(translated) && translated.length) {
    const specifications = translated
      .map((part) => ({ label: String(part.label || ""), text: cleanSlowDescription(part.text) }))
      .filter((part) => part.text && part.label !== "技の概要");
    if (specifications.length) return specifications;
  }
  return japaneseSlowFallbackParts(row);
}

function localizedSlowOverviewParts(row) {
  const entries = state.slowDescriptionsJa && state.slowDescriptionsJa.entries || {};
  const translated = row.descriptionKey && entries[row.descriptionKey];
  if (Array.isArray(translated) && translated.length) {
    const overview = translated
      .map((part) => ({ label: String(part.label || ""), text: cleanSlowDescription(part.text) }))
      .filter((part) => part.text && part.label === "技の概要");
    if (overview.length) return overview;
  }
  return (row.detailParts || [])
    .map((part) => ({ label: String(part.label || ""), text: cleanSlowDescription(part.text) }))
    .filter((part) => part.text);
}

function pokemonSlowRankingRows(pokemon) {
  const rows = [];
  (pokemon.skills || []).forEach((skill) => {
    [skill, ...((skill && skill.upgrades) || [])].filter(Boolean).forEach((node) => {
      [["rsb", node.rsb], ["boosted_rsb", node.boosted_rsb]].forEach(([rsbKey, rsb]) => {
        if (!rsb) return;
        const candidates = SLOW_EFFECT_TEXT_FIELDS.flatMap((field) => (
          slowPercentCandidates(rsb[field.key], pokemon.name, field.enhanced)
        ));
        if (!candidates.length) return;
        candidates.sort((a, b) => (
          b.percent - a.percent
          || a.basePercent - b.basePercent
          || Number(a.enhanced) - Number(b.enhanced)
        ));
        const detailParts = slowDetailParts(node, rsb);
        const moveName = slowMoveDisplayName(skill, node, rsbKey, detailParts);
        const isSweetScent = pokemon.name === "Alcremie" && node.name === "Sweet Scent" && rsbKey === "rsb";
        const normalCandidates = candidates.filter((candidate) => !candidate.enhanced);
        const enhancedCandidates = candidates.filter((candidate) => candidate.enhanced);
        const bestNormal = normalCandidates[0] || null;
        const bestEnhanced = enhancedCandidates[0] || null;
        const enhancedSlowText = SLOW_EFFECT_TEXT_FIELDS
          .filter((field) => field.enhanced)
          .map((field) => cleanSlowDescription(rsb[field.key]))
          .filter((text) => text && slowTextHasEffect(text))
          .join(" ");
        const durationOnlyEnhanced = Boolean(
          bestNormal
          && !bestEnhanced
          && /(?:movement speed (?:decrease|reduction)|\bslow(?:ing)?\b)/i.test(enhancedSlowText)
          && !/(?:the user|user['’]s|its own|their own)\s+movement speed/i.test(enhancedSlowText)
        );
        const generalVariants = [];
        if (bestNormal) {
          generalVariants.push({
            candidate: bestNormal,
            minSlowPercent: Math.min(...normalCandidates.map((candidate) => candidate.percent)),
            variable: bestNormal.decays || new Set(normalCandidates.map((candidate) => candidate.percent)).size > 1,
            slowDuration: slowEffectDuration({ slowContext: bestNormal.context }),
            slowContext: bestNormal.context,
            slowDecayContext: bestNormal.context,
            isPlus: false
          });
        }
        if (bestEnhanced || durationOnlyEnhanced) {
          const plusCandidate = {
            ...(bestEnhanced || bestNormal),
            enhanced: true,
            decays: Boolean((bestEnhanced && bestEnhanced.decays) || (bestNormal && bestNormal.decays))
          };
          const additiveSlow = enhancedSlowText.match(/\bslow(?:ing effect)?\s+by\s+(\d+(?:\.\d+)?)%/i);
          if (additiveSlow && bestNormal && plusCandidate.percent <= bestNormal.percent) {
            const addedPercent = number(additiveSlow[1], 0);
            plusCandidate.basePercent = bestNormal.basePercent + addedPercent;
            plusCandidate.percent = plusCandidate.basePercent * plusCandidate.multiplier;
          }
          const enhancedDuration = slowEffectDuration({ slowContext: enhancedSlowText });
          const inheritedDuration = bestNormal ? slowEffectDuration({ slowContext: bestNormal.context }) : 0;
          const plusSourceCandidates = enhancedCandidates.length ? enhancedCandidates : normalCandidates;
          generalVariants.push({
            candidate: plusCandidate,
            moveName: `${moveName}+`,
            moveNote: node.level2 ? `${jpAbility(skill.ability)}・レベル${node.level2}以降` : `${jpAbility(skill.ability)}・強化後`,
            minSlowPercent: additiveSlow
              ? plusCandidate.percent
              : Math.min(...plusSourceCandidates.map((candidate) => candidate.percent)),
            variable: plusCandidate.decays || new Set(plusSourceCandidates.map((candidate) => candidate.percent)).size > 1,
            slowDuration: enhancedDuration || inheritedDuration,
            slowContext: [bestNormal && bestNormal.context, enhancedSlowText, bestEnhanced && bestEnhanced.context].filter(Boolean).join(" "),
            slowDecayContext: enhancedSlowText || (bestEnhanced && bestEnhanced.context) || (bestNormal && bestNormal.context) || "",
            isPlus: true
          });
        }
        const splitByUpgrade = generalVariants.length > 1 || Boolean(generalVariants[0] && generalVariants[0].isPlus);
        generalVariants.forEach((variant) => {
          variant.useGeneratedSlowDetail = splitByUpgrade;
        });
        const variants = isSweetScent
          ? [
            {
              candidate: { basePercent: 100, multiplier: 1, percent: 100, enhanced: false, decays: false },
              moveNote: "外周に触れた時",
              slowDuration: 0.5,
              slowContext: "The outer ring applies a 100% slow lasting 0.5s.",
              slowDetailPartsJa: [{
                label: "減速仕様",
                text: "残った香りの外周に触れた相手の移動速度を100%低下させます。0.5秒間持続し、香りの外周自体は3秒間残ります。"
              }]
            },
            {
              candidate: { basePercent: 100, multiplier: 1, percent: 100, enhanced: true, decays: false },
              moveName: `${moveName}+`,
              moveNote: "外周に触れた時・レベル12以降",
              slowDuration: 1.5,
              slowContext: "The outer ring applies a 100% slow lasting 1.5s.",
              slowDetailPartsJa: [{
                label: "減速仕様",
                text: "レベル12以降、残った香りの外周に触れた相手の移動速度を100%低下させます。持続時間は1.5秒に強化され、香りの外周自体は3秒間残ります。"
              }]
            },
            {
              candidate: { basePercent: 30, multiplier: 1, percent: 30, enhanced: false, decays: true },
              moveNote: "着弾範囲に当たった時",
              slowDuration: 1.5,
              slowContext: "The initial area lowers movement speed by 30%, decaying by 10% every 0.5s.",
              slowDetailPartsJa: [{
                label: "減速仕様",
                text: "最初の着弾範囲に当たった相手の移動速度を30%低下させます。減速率は0.5秒ごとに10%ずつ、30%→20%→10%と減衰します。"
              }]
            }
          ]
          : generalVariants;
        variants.forEach((variant) => {
          const bestCandidate = variant.candidate;
          rows.push({
            sourceType: "pokemon",
            sourceName: pokemon.name,
            sourceLabel: jpPokemonName(pokemon),
            sourceIcon: pokemonThumbUrl(pokemon.name),
            sourceBadge: "",
            sourceBadgeClass: "",
            moveName: variant.moveName || moveName,
            moveNote: variant.moveNote || slowMoveNote(skill, bestCandidate),
            moveIcon: skillIconUrl(pokemon.name, skill.ability === "Basic" ? "Attack" : node.name),
            slowPercent: bestCandidate.percent,
            basePercent: bestCandidate.basePercent,
            stackMultiplier: bestCandidate.multiplier,
            minSlowPercent: Number.isFinite(variant.minSlowPercent)
              ? variant.minSlowPercent
              : bestCandidate.percent,
            enhanced: bestCandidate.enhanced,
            decays: bestCandidate.decays,
            variable: typeof variant.variable === "boolean" ? variant.variable : bestCandidate.decays,
            slowDuration: variant.slowDuration,
            enhancedSlowDuration: variant.enhancedSlowDuration,
            slowContext: variant.slowContext || bestCandidate.context,
            slowDecayContext: variant.slowDecayContext,
            slowDetailPartsJa: variant.slowDetailPartsJa,
            useGeneratedSlowDetail: variant.useGeneratedSlowDetail,
            descriptionKey: slowDescriptionKey(pokemon, skill, node, rsbKey),
            detailParts
          });
        });
      });
    });
  });
  return rows;
}

function supplementalSlowRankingRows() {
  const rows = [];
  const razorClaw = state.heldItems.find((item) => item.name === "Razor Claw");
  if (razorClaw) {
    const candidates = slowPercentCandidates(razorClaw.description1);
    const bestCandidate = candidates.sort((a, b) => b.percent - a.percent)[0];
    if (bestCandidate) {
      rows.push({
        sourceType: "item",
        sourceName: razorClaw.name,
        sourceLabel: jpItemName(razorClaw),
        sourceIcon: heldItemIconUrl(razorClaw.name),
        sourceBadge: "ITEM",
        sourceBadgeClass: "item",
        moveName: jpItemName(razorClaw),
        moveNote: "もちもの・近接ポケモンのみ",
        moveIcon: heldItemIconUrl(razorClaw.name),
        slowPercent: bestCandidate.percent,
        basePercent: bestCandidate.basePercent,
        stackMultiplier: 1,
        minSlowPercent: bestCandidate.percent,
        enhanced: false,
        decays: false,
        variable: false,
        slowDuration: 1,
        descriptionKey: "item::Razor Claw",
        detailParts: [{
          label: "",
          text: "技を使ってから3秒以内に、次の通常攻撃を相手ポケモンへ命中させると追加ダメージを与えます。近接ポケモンが持っている場合は、さらに相手の移動速度を30%下げます。減速は1秒間持続し、効果の待ち時間は1.5秒です。"
        }]
      });
    }
  }

  rows.push({
    sourceType: "battle",
    sourceName: "Slow Smoke",
    sourceLabel: "どんそくスモーク",
    sourceIcon: "https://assets.dittobase.com/unite/battle-items/slow-smoke.png",
    sourceBadge: "BATTLE",
    sourceBadgeClass: "battle",
    moveName: "どんそくスモーク",
    moveNote: "バトルアイテム",
    moveIcon: "https://assets.dittobase.com/unite/battle-items/slow-smoke.png",
    slowPercent: 80,
    basePercent: 80,
    stackMultiplier: 1,
    minSlowPercent: 80,
    enhanced: false,
    decays: false,
    variable: false,
    slowDuration: 3.5,
    detailParts: [{
      label: "",
      text: "使用者の周囲に3.5秒間えんまくを張り、範囲内の相手ポケモンの移動速度を80%、通常攻撃速度を50%下げます。待ち時間は35秒です。"
    }]
  });
  rows.push({
    sourceType: "buff",
    sourceName: "Red Buff",
    sourceLabel: "赤バフ（シュバルゴ／バッフロン）",
    sourceIcon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/589.png",
    sourceBadge: "BUFF",
    sourceBadgeClass: "",
    moveName: "赤バフ",
    moveNote: "野生ポケモンのバフ",
    moveIcon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/589.png",
    slowPercent: 30,
    basePercent: 30,
    stackMultiplier: 1,
    minSlowPercent: 30,
    enhanced: false,
    decays: false,
    variable: false,
    slowDuration: 2,
    detailParts: [{
      label: "",
      text: "シュバルゴまたはバッフロンをKOして得る赤（オレンジ）バフです。所持中の通常攻撃が命中した相手ポケモンの移動速度を30%下げ、2秒間持続します。"
    }]
  });
  return rows;
}

function slowPercentageLabel(row) {
  const notes = [];
  if (row.enhanced) notes.push("強化後");
  if (row.stackMultiplier > 1) {
    notes.push(`${formatNumber(row.basePercent, 1)}%×${formatNumber(row.stackMultiplier, 0)}`);
  } else if (row.variable) {
    notes.push("最大");
  }
  return `${formatNumber(row.slowPercent, 1)}%${notes.length ? `（${notes.join("・")}）` : ""}`;
}

function slowEffectProfile(row) {
  const context = String(row.slowContext || "");
  const duration = slowEffectDuration(row);
  const enhancedDuration = number(row.enhancedSlowDuration, 0);
  const decay = slowDecaySpec(row);
  const decays = Boolean(row.decays || decay || /\bdecay/i.test(context));
  const maximum = number(row.slowPercent, 0);
  const explicitMinimum = decay && number(decay.minimum, 0);
  let minimum = explicitMinimum > 0
    ? Math.min(maximum, explicitMinimum)
    : number(row.minSlowPercent, row.slowPercent);
  const chips = [];
  const steps = [];
  let kind = "fixed";

  if (row.stackMultiplier > 1) {
    kind = "stack";
    chips.push({ label: "累積", className: "stack" });
    chips.push({ label: `${formatNumber(row.stackMultiplier, 0)}段階`, className: "stack" });
    if (decays) chips.push({ label: "減衰", className: "decay" });
    for (let index = 1; index <= row.stackMultiplier; index += 1) {
      steps.push(Math.min(maximum, row.basePercent * index));
    }
  } else if (decays) {
    kind = "decay";
    chips.push({ label: "減衰", className: "decay" });
    if (decay && decay.total && decay.amount > 0) {
      minimum = explicitMinimum > 0 ? minimum : Math.max(0, maximum - decay.amount);
      steps.push(maximum, minimum);
    } else if (decay && decay.amount > 0) {
      let repeatCount = number(decay.times, 0);
      if (repeatCount <= 0 && explicitMinimum > 0) {
        repeatCount = Math.ceil((maximum - minimum) / decay.amount);
      }
      const decayDuration = number(decay.duration, 0) || duration;
      if (repeatCount <= 0 && decay.interval > 0 && decayDuration > 0) {
        repeatCount = Math.floor(decayDuration / decay.interval);
      }
      repeatCount = Math.max(1, Math.min(repeatCount || 1, 16));
      if (!explicitMinimum && minimum >= maximum) {
        minimum = Math.max(0, maximum - decay.amount * repeatCount);
      }
      for (let index = 0; index <= repeatCount; index += 1) {
        const value = Math.max(minimum, maximum - decay.amount * index);
        if (steps[steps.length - 1] !== value) steps.push(value);
        if (value === minimum) break;
      }
      if (steps[steps.length - 1] !== minimum) steps.push(minimum);
    } else if (minimum > 0 && minimum < maximum) {
      steps.push(maximum, minimum);
    } else {
      steps.push(maximum);
    }
  } else if (row.variable && minimum > 0 && minimum < maximum) {
    kind = "growth";
    chips.push({ label: "増強", className: "growth" });
    steps.push(minimum, maximum);
  } else if (row.variable) {
    chips.push({ label: "最大値", className: "growth" });
  }

  if (row.enhanced) chips.unshift({ label: "強化後", className: "enhanced" });
  if (duration > 0) chips.push({ label: `⏱ ${formatNumber(duration, 1)}秒`, className: "duration" });
  if (enhancedDuration > duration) {
    chips.push({ label: `強化後 ${formatNumber(enhancedDuration, 1)}秒`, className: "enhanced" });
  }
  return { kind, chips, steps };
}

function slowEffectVisualMarkup(row) {
  const profile = slowEffectProfile(row);
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
  return `<div class="slow-effect-visual">
    <span class="slow-effect-main">${escapeHtml(formatNumber(row.slowPercent, 1))}%</span>
    ${chips ? `<span class="slow-effect-chips">${chips}</span>` : ""}
    ${meter}
    ${flow}
    <span class="visually-hidden">${escapeHtml(slowPercentageLabel(row))}</span>
  </div>`;
}

let activeSlowMoveTooltipTrigger = null;
let slowMoveTooltipPinned = false;

function ensureSlowMoveTooltip() {
  let tooltip = document.getElementById("slowMoveTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "slowMoveTooltip";
  tooltip.className = "slow-move-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionSlowMoveTooltip(trigger, tooltip) {
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gutter = 12;
  const preferredLeft = triggerRect.left;
  const left = clamp(preferredLeft, gutter, window.innerWidth - tooltipRect.width - gutter);
  let top = triggerRect.bottom + 8;
  if (top + tooltipRect.height > window.innerHeight - gutter) {
    top = Math.max(gutter, triggerRect.top - tooltipRect.height - 8);
  }
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showSlowMoveTooltip(trigger, pinned = false) {
  const rowIndex = number(trigger && trigger.dataset.slowRowIndex, -1);
  const row = state.slowRankingRows[rowIndex];
  if (!trigger || !row) return;
  const parts = [
    ...localizedSlowOverviewParts(row),
    ...localizedSlowDetailParts(row)
  ];
  if (!parts.length) return;
  const preservePin = activeSlowMoveTooltipTrigger === trigger && slowMoveTooltipPinned;
  const tooltip = ensureSlowMoveTooltip();
  const body = parts.map((part) => (
    `<div class="slow-move-tooltip-part">${part.label ? `<strong>${escapeHtml(part.label)}：</strong>` : ""}${escapeHtml(part.text)}</div>`
  )).join("");
  tooltip.innerHTML = `<strong class="slow-move-tooltip-title">${escapeHtml(row.sourceLabel)} / ${escapeHtml(row.moveName)}</strong>${body}`;
  tooltip.hidden = false;
  if (activeSlowMoveTooltipTrigger && activeSlowMoveTooltipTrigger !== trigger) {
    activeSlowMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  }
  activeSlowMoveTooltipTrigger = trigger;
  slowMoveTooltipPinned = pinned || preservePin;
  tooltip.classList.toggle("is-pinned", slowMoveTooltipPinned);
  trigger.setAttribute("aria-expanded", "true");
  positionSlowMoveTooltip(trigger, tooltip);
}

function hideSlowMoveTooltip(force = false) {
  if (slowMoveTooltipPinned && !force) return;
  const tooltip = document.getElementById("slowMoveTooltip");
  if (tooltip) {
    tooltip.hidden = true;
    tooltip.classList.remove("is-pinned");
  }
  if (activeSlowMoveTooltipTrigger) activeSlowMoveTooltipTrigger.setAttribute("aria-expanded", "false");
  activeSlowMoveTooltipTrigger = null;
  slowMoveTooltipPinned = false;
}

const SLOW_FILTER_LABELS = Object.freeze({
  stack: "累積",
  decay: "減衰",
  instant: "即効",
  enhanced: "強化後"
});

function selectedSlowFilterKeys() {
  return new Set(
    [...el.slowFilterOptions.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value)
  );
}

function slowRowMatchesFilter(row, key) {
  const profile = slowEffectProfile(row);
  if (key === "stack") return row.stackMultiplier > 1;
  if (key === "decay") return Boolean(row.decays || profile.kind === "decay");
  if (key === "instant") {
    const stacks = row.stackMultiplier > 1;
    const decays = Boolean(row.decays || profile.kind === "decay");
    return !stacks && !decays;
  }
  if (key === "enhanced") return Boolean(row.enhanced || number(row.enhancedSlowDuration, 0) > 0);
  return true;
}

function syncSlowFilterStatus(selectedKeys, sortOrder, visibleCount, totalCount) {
  const selectedLabels = [...selectedKeys]
    .map((key) => SLOW_FILTER_LABELS[key])
    .filter(Boolean);
  const conditionText = selectedLabels.length
    ? `効果タイプ: ${selectedLabels.join("・")}（AND）`
    : "効果タイプ: すべて";
  const orderText = sortOrder === "asc" ? "減速率の昇順" : "減速率の降順";
  el.slowFilterStatus.textContent = `${conditionText} / ${orderText} / ${formatNumber(visibleCount, 0)}件表示（全${formatNumber(totalCount, 0)}件）`;
}

function updateSlowRanking() {
  if (!el.slowRankingBody) return;
  hideSlowMoveTooltip(true);
  const rows = state.pokemon
    .filter((pokemon) => !pokemon.exclude_stats)
    .flatMap(pokemonSlowRankingRows)
    .concat(supplementalSlowRankingRows());
  const uniqueRows = [];
  const seen = new Set();
  rows.forEach((row) => {
    const key = [
      row.sourceType,
      row.sourceName,
      row.moveName,
      row.moveNote,
      row.slowPercent,
      (row.slowDetailPartsJa || row.detailParts).map((part) => part.text).join("|")
    ].join("::");
    if (seen.has(key)) return;
    seen.add(key);
    uniqueRows.push(row);
  });
  const selectedFilters = selectedSlowFilterKeys();
  const sortOrder = el.slowRankingSortOrder.value === "asc" ? "asc" : "desc";
  const visibleRows = selectedFilters.size
    ? uniqueRows.filter((row) => [...selectedFilters].every((key) => slowRowMatchesFilter(row, key)))
    : [...uniqueRows];
  visibleRows.sort((a, b) => (
    (sortOrder === "asc" ? a.slowPercent - b.slowPercent : b.slowPercent - a.slowPercent)
    || a.sourceType.localeCompare(b.sourceType)
    || a.sourceLabel.localeCompare(b.sourceLabel, "ja")
    || a.moveName.localeCompare(b.moveName, "ja")
  ));
  state.slowRankingRows = visibleRows;

  if (!visibleRows.length) {
    const message = uniqueRows.length
      ? "選択した条件に一致する減速効果がありません。"
      : "表示できる減速効果がありません。";
    el.slowRankingBody.innerHTML = `<tr class="slow-ranking-empty"><td colspan="4">${message}</td></tr>`;
  } else {
    el.slowRankingBody.innerHTML = visibleRows.map((row, index) => {
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
              class="slow-move-icon-trigger"
              type="button"
              data-slow-row-index="${index}"
              aria-label="${escapeHtml(row.moveName)}の技概要と減速仕様を表示"
              aria-expanded="false"
              aria-describedby="slowMoveTooltip"
            >
              <img src="${escapeHtml(row.moveIcon || brokenImageUrl())}" alt="" loading="lazy" onerror="${imageFallback}">
            </button>
            <span><span class="ranking-name">${escapeHtml(row.moveName)}</span><span class="ranking-note">${escapeHtml(row.moveNote)}</span></span>
          </div>
        </td>
        <td class="slow-ranking-percent">${slowEffectVisualMarkup(row)}</td>
      </tr>`;
    }).join("");
  }
  syncSlowFilterStatus(selectedFilters, sortOrder, visibleRows.length, uniqueRows.length);
}
