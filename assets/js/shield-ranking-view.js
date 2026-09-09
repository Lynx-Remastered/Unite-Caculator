// Shield ranking presentation. Calculations stay independent of the active calculator.
function shieldRankingTargetLabel(scope) {
  return { self: "自分", ally: "味方", both: "自分・味方" }[scope] || "自分";
}

function updateShieldRanking() {
  if (!el.shieldRankingBody) return;
  const level = Math.max(1, Math.min(15, number(el.shieldRankingLevelRange.value, 15)));
  const limit = number(el.shieldRankingLimitSelect.value, 50);
  const target = el.shieldRankingTargetFilter.value;
  const includeItems = el.shieldRankingIncludeItems.checked;
  el.shieldRankingTable.classList.toggle("without-items", !includeItems);
  el.shieldRankingItemColumn.hidden = !includeItems;
  el.shieldRankingItemHeader.hidden = !includeItems;
  el.shieldRankingGuide.textContent = includeItems
    ? "推奨持ち物Lv40のステータスと発動シールドを含め、自分・味方1体ごとの合計で比較します。おたすけバリアはユナイト使用時、きょうめいガードは相手への技ダメージ発生時に1回加算し、レスキューフードは味方への量に反映します。持ち物の待ち時間が終わり、同じ味方が持ち物の付与対象になる想定です。時点や条件が異なる効果は別行に表示し、「シールド内訳」で合計の内容を確認できます。"
    : "持ち物なしのステータスで、技・特性・ユナイト技のシールドを自分・味方1体ごとに比較します。持ち物によるステータス上昇・追加シールド・倍率補正は含めません。時点や条件が異なる効果は別行に表示し、「シールド内訳」で合計の内容を確認できます。";
  const rows = buildShieldRankingRows(level, includeItems).filter((row) => (
    target === "all" || row.targetScope === target || row.targetScope === "both"
  ));
  state.shieldRankingRows = rows;
  el.shieldRankingLevelValue.textContent = level;
  const visibleRows = rows.slice(0, limit);
  el.shieldRankingSummary.textContent = `使用者Lv${level} / 持ち物補正${includeItems ? "ON" : "OFF"} / ${target === "all" ? "すべての対象" : `${shieldRankingTargetLabel(target)}へのシールド`} / ${formatNumber(visibleRows.length, 0)}件表示（全${formatNumber(rows.length, 0)}件）`;

  if (!visibleRows.length) {
    el.shieldRankingBody.innerHTML = `<tr class="shield-ranking-empty"><td colspan="${includeItems ? 6 : 5}">現在の条件で表示できるシールド効果がありません。</td></tr>`;
    return;
  }

  el.shieldRankingBody.innerHTML = visibleRows.map((row, index) => {
    const moveName = jpMoveName(row.choice.displayName);
    const effectLabel = row.variant.displayLabel || "シールド";
    const itemIcons = row.itemRows.length
      ? row.itemRows.map(({ item }) => `<img src="${escapeHtml(heldItemIconUrl(item.name))}" alt="${escapeHtml(jpItemName(item))}" title="${escapeHtml(jpItemName(item))} Lv40" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">`).join("")
      : `<span class="ranking-item-empty" title="持ち物なし">なし</span>`;
    const breakdown = (row.breakdown || []).map((part) => (
      `<div><dt>${escapeHtml(part.label)}</dt><dd>${formatNumber(part.amount, 0)}</dd></div>`
    )).join("");
    return `<tr>
      <td class="ranking-rank">${index + 1}</td>
      <td>
        <div class="ranking-pokemon">
          <img src="${escapeHtml(pokemonThumbUrl(row.pokemon.name))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">
          <span class="ranking-name">${escapeHtml(jpPokemonName(row.pokemon))}</span>
        </div>
      </td>
      <td>
        <div class="ranking-move">
          <img src="${escapeHtml(row.choice.iconUrl || brokenImageUrl())}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(brokenImageUrl())}';">
          <div class="shield-ranking-move-content">
            <span class="ranking-name">${escapeHtml(moveName)}</span>
            <span class="ranking-note">${escapeHtml(effectLabel)}</span>
            ${row.assumption ? `<span class="ranking-note">${escapeHtml(row.assumption)}</span>` : ""}
            ${breakdown ? `<details class="shield-ranking-breakdown"><summary>シールド内訳</summary><dl>${breakdown}</dl></details>` : ""}
          </div>
        </div>
      </td>
      <td>${escapeHtml(shieldRankingTargetLabel(row.targetScope))}</td>
      <td class="ranking-number">
        ${formatNumber(row.totalShield, 0)}
        ${row.itemShield > 0 ? `<span class="ranking-note">持ち物 +${formatNumber(row.itemShield, 0)}</span>` : ""}
        ${row.shieldBonus > 0 ? `<span class="ranking-note">味方補正 +${formatNumber(row.shieldBonus, 0)}</span>` : ""}
      </td>
      ${includeItems ? `<td><span class="ranking-item-icons" aria-label="推奨持ち物レベル40">${itemIcons}</span></td>` : ""}
    </tr>`;
  }).join("");
}
