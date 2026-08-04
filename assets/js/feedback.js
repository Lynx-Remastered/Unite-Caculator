// Feedback context collection and GitHub issue text generation.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function selectedOptionLabel(select) {
  if (!select || select.selectedIndex < 0) return "未選択";
  return select.options[select.selectedIndex].textContent.trim() || "未選択";
}

function feedbackItemsText(items) {
  return items.length
    ? items.map(({ item, level }) => `${jpItemName(item)} Lv${level}`).join(" / ")
    : "なし";
}

function feedbackMoveText(choice, parts = []) {
  if (!choice) return "未選択";
  const title = `${choice.slotLabel || ""}${choice.displayName ? ` - ${jpMoveName(choice.displayName)}` : ""}`;
  const labels = [...new Set(parts.map((part) => jpMoveLabel(part.label)).filter(Boolean))];
  return labels.length ? `${title}（${labels.join(" + ")}）` : title;
}

function feedbackConditionSummary(numericFields = [], checkFields = [], manualFields = []) {
  const conditions = [];

  numericFields.forEach(([inputId, containerId, label]) => {
    const input = el[inputId];
    const container = document.getElementById(containerId);
    const value = number(input && input.value, 0);
    if (input && container && !container.hidden && value) conditions.push(`${label} ${value}`);
  });

  checkFields.forEach(([inputId, containerId, label]) => {
    const input = el[inputId];
    const container = containerId ? document.getElementById(containerId) : null;
    if (input && input.checked && (!container || !container.hidden)) conditions.push(label);
  });

  manualFields.forEach(([inputId, label]) => {
    const value = number(el[inputId] && el[inputId].value, 0);
    if (value) conditions.push(`${label} ${value}`);
  });

  return conditions.length ? conditions.join(" / ") : "なし";
}

function feedbackDamageContext() {
  const pokemon = selectedPokemon();
  const move = selectedMove();
  const targetHp = targetHpState();
  const conditions = feedbackConditionSummary(
    [
      ["attackWeightStacks", "conditionAttackWeight", "もうこうダンベル"],
      ["aeosCookieStacks", "conditionAeosCookie", "エオスビスケット"],
      ["spAtkSpecsStacks", "conditionSpAtkSpecs", "しんげきメガネ"],
      ["weaknessPolicyStacks", "conditionWeaknessPolicy", "じゃくてんほけん"],
      ["accelBracerStacks", "conditionAccelBracer", "アクセルリスト"],
      ["driveLensStacks", "conditionDriveLens", "ドライブレンズ"],
      ["yveltalMarkStacks", "conditionYveltalMarks", "ダークオーラ（はかいカウンタ）"],
      ["snorlaxFlailHpPercent", "conditionSnorlaxFlailHp", "自分の残りHP%"]
    ],
    [
      ["criticalHit", "", "技本体を急所計算"],
      ["choiceSpecsProc", "conditionChoiceSpecs", "こだわりメガネ追加ダメージ"],
      ["chargingCharmProc", "conditionChargingCharm", "じゅうてんチャーム追加ダメージ"],
      ["razorClawProc", "conditionRazorClaw", "するどいツメ追加ダメージ"],
      ["energyAmpProc", "conditionEnergyAmp", "エナジーアンプ発動中"],
      ["plusPowerProc", "conditionPlusPower", "プラスパワー発動中"],
      ["regidragoBuff", "", "レジドラゴ撃破バフ"],
      ["groudonBuff", "", "グラードン撃破バフ"],
      ["rayquazaBuff", "", "レックウザ撃破バフ"]
    ],
    [
      ["manualAttack", "攻撃補正"],
      ["manualHp", "最大HP補正"],
      ["manualSpAttack", "特攻補正"],
      ["manualDamagePercent", "ダメージ%補正"],
      ["manualExtraDamage", "固定ダメージ補正"]
    ]
  );

  const falinksDamageTarget = selectedFalinksDamageTarget();
  const targetDetail = falinksDamageTarget
    ? `、被弾対象 ${falinksDamageTarget.label}`
    : "";
  return [
    `- 画面: ${CALCULATOR_VIEWS.damage.title}`,
    `- 攻撃側: ${pokemon ? jpPokemonName(pokemon) : "未選択"} Lv${el.levelRange.value}`,
    `- 技: ${move ? feedbackMoveText(move.choice, move.parts) : "未選択"}`,
    `- 持ち物: ${feedbackItemsText(selectedItems())}`,
    `- 条件: ${conditions}`,
    `- 相手: ${selectedOptionLabel(el.targetSelect)} Lv${el.targetLevelRange.value}（残りHP ${formatNumber(targetHp.remainingHp, 0)} / ${formatNumber(targetHp.remainingPercent, 1)}%、最大HP ${formatNumber(targetHp.maxHp, 0)}、防御 ${el.targetDefense.value} / 特防 ${el.targetSpDefense.value}${targetDetail}）`,
    `- 計算結果: 基礎ダメージ ${el.rawDamage.textContent} / 防御込み推定 ${el.finalDamage.textContent}`
  ];
}

function feedbackShieldContext() {
  const pokemon = selectedShieldPokemon();
  const choice = selectedShieldMoveChoice();
  const conditions = feedbackConditionSummary(
    [
      ["shieldAttackWeightStacks", "shieldConditionAttackWeight", "もうこうダンベル"],
      ["shieldSpAtkSpecsStacks", "shieldConditionSpAtkSpecs", "しんげきメガネ"],
      ["shieldWeaknessPolicyStacks", "shieldConditionWeaknessPolicy", "じゃくてんほけん"],
      ["shieldAccelBracerStacks", "shieldConditionAccelBracer", "アクセルリスト"],
      ["shieldDriveLensStacks", "shieldConditionDriveLens", "ドライブレンズ"]
    ],
    [],
    [
      ["shieldManualAttack", "攻撃補正"],
      ["shieldManualSpAttack", "特攻補正"],
      ["shieldManualHp", "HP補正"],
      ["manualShieldPercent", "シールド%補正"],
      ["manualShieldFlat", "固定シールド補正"],
      ["shieldCount", "回数/対象数"]
    ]
  );

  return [
    `- 画面: ${CALCULATOR_VIEWS.shield.title}`,
    `- シールド側: ${pokemon ? jpPokemonName(pokemon) : "未選択"} Lv${el.shieldLevelRange.value}`,
    `- 技: ${feedbackMoveText(choice, selectedShieldParts(choice))}`,
    `- 持ち物: ${feedbackItemsText(selectedShieldItems())}`,
    `- 条件: ${conditions}`,
    `- 計算結果: 自分 ${el.shieldSelfAmount.textContent} / 味方 ${el.shieldAllyAmount.textContent}`
  ];
}

function feedbackHealingContext() {
  const pokemon = selectedHealingPokemon();
  const choice = selectedHealingMoveChoice();
  const conditions = feedbackConditionSummary(
    [
      ["healingAttackWeightStacks", "healingConditionAttackWeight", "もうこうダンベル"],
      ["healingSpAtkSpecsStacks", "healingConditionSpAtkSpecs", "しんげきメガネ"],
      ["healingWeaknessPolicyStacks", "healingConditionWeaknessPolicy", "じゃくてんほけん"],
      ["healingAccelBracerStacks", "healingConditionAccelBracer", "アクセルリスト"],
      ["healingDriveLensStacks", "healingConditionDriveLens", "ドライブレンズ"]
    ],
    [],
    [
      ["healingManualAttack", "攻撃補正"],
      ["healingManualSpAttack", "特攻補正"],
      ["manualHealingPercent", "回復量%補正"],
      ["manualHealingFlat", "固定回復量補正"],
      ["healingCount", "回数/対象数"]
    ]
  );

  return [
    `- 画面: ${CALCULATOR_VIEWS.healing.title}`,
    `- 回復側: ${pokemon ? jpPokemonName(pokemon) : "未選択"} Lv${el.healingLevelRange.value}`,
    `- 技: ${feedbackMoveText(choice, selectedHealingParts(choice))}`,
    `- 持ち物: ${feedbackItemsText(selectedHealingItems())}`,
    `- 条件: ${conditions}`,
    `- 計算結果: 自分 ${el.healingSelfAmount.textContent} / 味方 ${el.healingAllyAmount.textContent}`
  ];
}

function feedbackRankingContext() {
  return [
    `- 画面: ${CALCULATOR_VIEWS.ranking.title}`,
    `- 攻撃側レベル: Lv${el.rankingLevelRange.value}`,
    `- 相手: ${selectedOptionLabel(el.rankingTargetSelect)} Lv${el.rankingTargetLevelRange.value}`,
    `- 技枠: ${selectedOptionLabel(el.rankingSlotFilter)}`,
    `- 表示件数: ${selectedOptionLabel(el.rankingLimitSelect)}`,
    `- 集計: ${el.rankingSingleHit.checked ? "単発ダメージ" : "合計ダメージ"}`,
    `- 表示状況: ${el.rankingSummary.textContent.trim()}`
  ];
}

function feedbackHealingRankingContext() {
  return [
    `- 画面: ${CALCULATOR_VIEWS.healingRanking.title}`,
    `- 使用者レベル: Lv${el.healingRankingLevelRange.value}`,
    `- 表示件数: ${selectedOptionLabel(el.healingRankingLimitSelect)}`
  ];
}

function feedbackSlowRankingContext() {
  return [
    `- 画面: ${CALCULATOR_VIEWS.slowRanking.title}`,
    `- 表示状況: ${el.slowFilterStatus.textContent.trim()}`
  ];
}

function feedbackAccelerationRankingContext() {
  return [
    `- 画面: ${CALCULATOR_VIEWS.accelerationRanking.title}`,
    `- 表示状況: ${el.accelerationFilterStatus.textContent.trim()}`
  ];
}

function feedbackBalanceContext() {
  const filters = [...el.balanceFilterOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => input.closest("label")?.querySelector(".balance-filter-name")?.textContent.trim())
    .filter(Boolean);
  return [
    `- 画面: ${CALCULATOR_VIEWS.balance.title}`,
    `- ポケモン: ${selectedOptionLabel(el.balancePokemonSelect)}`,
    `- 調整対象フィルター: ${filters.length ? filters.join(" / ") : "すべて"}`,
    `- 表示状況: ${el.balanceSummary.textContent.trim()}`
  ];
}

function feedbackCalculationContext() {
  if (!state.pokemon.length || !el.calculator || el.calculator.hidden) {
    return "- 計算データの読み込み前、または読み込みエラー中に投稿";
  }

  const contextBuilders = {
    damage: feedbackDamageContext,
    ranking: feedbackRankingContext,
    healingRanking: feedbackHealingRankingContext,
    slowRanking: feedbackSlowRankingContext,
    accelerationRanking: feedbackAccelerationRankingContext,
    shield: feedbackShieldContext,
    healing: feedbackHealingContext,
    balance: feedbackBalanceContext
  };
  return (contextBuilders[state.activeTab] || feedbackDamageContext)().join("\n");
}

function buildFeedbackIssue() {
  const type = FEEDBACK_TYPES[el.feedbackType.value] || FEEDBACK_TYPES.other;
  const summary = el.feedbackSummary.value.trim();
  const details = el.feedbackDetails.value.trim();
  const expected = el.feedbackExpected.value.trim() || "特になし";
  const nickname = el.feedbackNickname.value.trim() || "未記入";
  const pageUrl = new URL(window.location.href);
  pageUrl.hash = "";
  pageUrl.searchParams.delete("feedback");

  const sections = [
    `## 種別\n${type.label}`,
    `## 内容\n${details}`,
    `## 期待する状態\n${expected}`
  ];

  if (el.feedbackIncludeContext.checked) {
    sections.push(`## 現在の画面・計算条件\n${feedbackCalculationContext()}`);
  }

  sections.push(
    `## 投稿者\nLINEオープンチャット表示名: ${nickname}`,
    `<details>\n<summary>閲覧環境</summary>\n\n- ページ: ${pageUrl.toString()}\n- 画面サイズ: ${window.innerWidth} × ${window.innerHeight}\n- ブラウザ: ${navigator.userAgent}\n\n</details>`,
    "---\nこのIssueはサイト内の要望・不具合フォームから作成されました。"
  );

  return {
    title: `${type.prefix} ${summary}`,
    body: sections.join("\n\n")
  };
}

function setFeedbackStatus(message, isError = false) {
  el.feedbackStatus.textContent = message;
  el.feedbackStatus.classList.toggle("is-error", isError);
}

function prepareFeedbackIssue() {
  const issue = buildFeedbackIssue();
  el.feedbackIssueTitle.value = issue.title;
  el.feedbackIssueBody.value = issue.body;
  return issue;
}

async function copyFeedbackIssue() {
  if (!el.feedbackForm.reportValidity()) return;
  const issue = prepareFeedbackIssue();
  const text = `${issue.title}\n\n${issue.body}`;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const copyArea = document.createElement("textarea");
      copyArea.value = text;
      copyArea.setAttribute("readonly", "");
      copyArea.style.position = "fixed";
      copyArea.style.opacity = "0";
      document.body.appendChild(copyArea);
      copyArea.select();
      const copied = document.execCommand("copy");
      copyArea.remove();
      if (!copied) throw new Error("コピーに失敗しました");
    }
    setFeedbackStatus("件名と内容をコピーしました。");
  } catch (error) {
    setFeedbackStatus("自動コピーできませんでした。GitHubのIssue作成ボタンをお使いください。", true);
  }
}

function feedbackRelativeUrl(open) {
  const url = new URL(window.location.href);
  url.searchParams.delete("feedback");
  url.hash = open ? "feedback" : "";
  return `${url.pathname}${url.search}${url.hash}`;
}

function openFeedbackDialog() {
  if (!el.feedbackDialog.open) el.feedbackDialog.showModal();
  setFeedbackStatus("");
  window.setTimeout(() => el.feedbackType.focus(), 0);
}

function closeFeedbackDialog(updateUrl = true) {
  if (el.feedbackDialog.open) el.feedbackDialog.close();
  if (updateUrl && (window.location.hash === "#feedback" || new URLSearchParams(window.location.search).has("feedback"))) {
    history.replaceState(null, "", feedbackRelativeUrl(false));
  }
}
