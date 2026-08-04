// DOM event registration. Application behavior is implemented in feature files.
function wireEvents() {
  ensureSlowMoveTooltip();
  ensureAccelerationMoveTooltip();
  ensureHealingRankingMoveTooltip();
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || (!event.target.closest("#navigationMenuButton") && !event.target.closest("#navigationMenu"))) {
      closeCalculatorNavigation();
    }
    if (!(event.target instanceof Element) || !event.target.closest(".held-item-picker")) {
      closeHeldItemPickers();
    }
    if (!(event.target instanceof Element) || !event.target.closest(".pokemon-select-picker")) {
      closePokemonSelectPickers();
    }
    if (!(event.target instanceof Element) || !event.target.closest(".move-combobox")) {
      closeMoveComboboxes();
    }
    if (!(event.target instanceof Element) || (!event.target.closest(".slow-move-icon-trigger") && !event.target.closest("#slowMoveTooltip"))) {
      hideSlowMoveTooltip(true);
    }
    if (!(event.target instanceof Element) || (!event.target.closest(".acceleration-move-icon-trigger") && !event.target.closest("#accelerationMoveTooltip"))) {
      hideAccelerationMoveTooltip(true);
    }
    if (!(event.target instanceof Element) || (!event.target.closest(".healing-move-icon-trigger") && !event.target.closest("#healingRankingMoveTooltip"))) {
      hideHealingRankingMoveTooltip(true);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!el.navigationMenu.hidden) {
        event.preventDefault();
        closeCalculatorNavigation(true);
      }
      closeHeldItemPickers();
      closePokemonSelectPickers();
      closeMoveComboboxes();
      hideSlowMoveTooltip(true);
      hideAccelerationMoveTooltip(true);
      hideHealingRankingMoveTooltip(true);
    }
  });
  document.querySelectorAll("[data-calculation-tip]").forEach((button) => {
    const key = button.dataset.calculationTip;
    button.addEventListener("click", () => toggleCalculationTip(key));
    syncCalculationTip(key);
  });
  el.navigationMenuButton.addEventListener("click", toggleCalculatorNavigation);
  Object.keys(NAVIGATION_GROUPS).forEach((groupName) => {
    const group = NAVIGATION_GROUPS[groupName];
    el[group.buttonId].addEventListener("click", () => toggleNavigationGroup(groupName));
  });
  el.navigationMenu.addEventListener("keydown", (event) => {
    const focusedItem = document.activeElement;
    const focusedGroupButton = focusedItem instanceof Element
      ? focusedItem.closest(".navigation-menu-group-toggle")
      : null;
    const focusedGroup = focusedItem instanceof Element
      ? focusedItem.closest(".navigation-menu-group")
      : null;

    if (event.key === "ArrowRight" && focusedGroupButton) {
      event.preventDefault();
      const groupName = focusedGroupButton.closest(".navigation-menu-group")?.dataset.navigationGroup;
      if (groupName) {
        setNavigationGroupExpanded(groupName, true);
        const firstSubmenuItem = el[NAVIGATION_GROUPS[groupName].submenuId].querySelector('[role="menuitem"]');
        firstSubmenuItem?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && focusedGroup) {
      event.preventDefault();
      const groupName = focusedGroup.dataset.navigationGroup;
      if (groupName) {
        setNavigationGroupExpanded(groupName, false);
        el[NAVIGATION_GROUPS[groupName].buttonId].focus();
      }
      return;
    }

    const menuItems = visibleNavigationMenuItems();
    const currentIndex = menuItems.indexOf(document.activeElement);
    if ((event.key === "Enter" || event.key === " ") && currentIndex >= 0) {
      event.preventDefault();
      menuItems[currentIndex].click();
      return;
    }
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1 + menuItems.length) % menuItems.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = menuItems.length - 1;
    if (nextIndex !== currentIndex) {
      event.preventDefault();
      menuItems[nextIndex].focus();
    }
  });
  Object.keys(CALCULATOR_VIEWS).forEach((tabName) => {
    const view = CALCULATOR_VIEWS[tabName];
    el[view.buttonId].addEventListener("click", () => {
      selectCalculatorTab(tabName);
      el.navigationMenuButton.focus();
    });
  });
  el.modeToggleButton.addEventListener("click", () => {
    const nextMode = document.documentElement.dataset.mode === "light" ? "dark" : "light";
    applyMode(nextMode);
  });
  el.themeSelect.addEventListener("change", () => applyTheme(el.themeSelect.value));
  wireRankingColumnResizers();
  el.healingRankingBody.addEventListener("mouseover", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".healing-move-icon-trigger")
      : null;
    const enteredFromOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && enteredFromOutside) showHealingRankingMoveTooltip(trigger);
  });
  el.healingRankingBody.addEventListener("mouseout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".healing-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideHealingRankingMoveTooltip();
  });
  el.healingRankingBody.addEventListener("focusin", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".healing-move-icon-trigger")
      : null;
    if (trigger) showHealingRankingMoveTooltip(trigger);
  });
  el.healingRankingBody.addEventListener("focusout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".healing-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideHealingRankingMoveTooltip();
  });
  el.healingRankingBody.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".healing-move-icon-trigger")
      : null;
    if (!trigger) return;
    if (activeHealingRankingMoveTooltipTrigger === trigger && healingRankingMoveTooltipPinned) {
      hideHealingRankingMoveTooltip(true);
    } else {
      showHealingRankingMoveTooltip(trigger, true);
    }
  });
  el.slowFilterOptions.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
      updateSlowRanking();
    }
  });
  el.slowRankingSortOrder.addEventListener("change", updateSlowRanking);
  el.slowRankingBody.addEventListener("mouseover", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".slow-move-icon-trigger")
      : null;
    const enteredFromOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && enteredFromOutside) showSlowMoveTooltip(trigger);
  });
  el.slowRankingBody.addEventListener("mouseout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".slow-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideSlowMoveTooltip();
  });
  el.slowRankingBody.addEventListener("focusin", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".slow-move-icon-trigger")
      : null;
    if (trigger) showSlowMoveTooltip(trigger);
  });
  el.slowRankingBody.addEventListener("focusout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".slow-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideSlowMoveTooltip();
  });
  el.slowRankingBody.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".slow-move-icon-trigger")
      : null;
    if (!trigger) return;
    if (activeSlowMoveTooltipTrigger === trigger && slowMoveTooltipPinned) {
      hideSlowMoveTooltip(true);
    } else {
      showSlowMoveTooltip(trigger, true);
    }
  });
  el.accelerationFilterOptions.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
      updateAccelerationRanking();
    }
  });
  el.accelerationRankingSortOrder.addEventListener("change", updateAccelerationRanking);
  el.accelerationRankingBody.addEventListener("mouseover", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".acceleration-move-icon-trigger")
      : null;
    const enteredFromOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && enteredFromOutside) showAccelerationMoveTooltip(trigger);
  });
  el.accelerationRankingBody.addEventListener("mouseout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".acceleration-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideAccelerationMoveTooltip();
  });
  el.accelerationRankingBody.addEventListener("focusin", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".acceleration-move-icon-trigger")
      : null;
    if (trigger) showAccelerationMoveTooltip(trigger);
  });
  el.accelerationRankingBody.addEventListener("focusout", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".acceleration-move-icon-trigger")
      : null;
    const exitedToOutside = !event.relatedTarget
      || !(event.relatedTarget instanceof Node)
      || !trigger?.contains(event.relatedTarget);
    if (trigger && exitedToOutside) hideAccelerationMoveTooltip();
  });
  el.accelerationRankingBody.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest(".acceleration-move-icon-trigger")
      : null;
    if (!trigger) return;
    if (activeAccelerationMoveTooltipTrigger === trigger && accelerationMoveTooltipPinned) {
      hideAccelerationMoveTooltip(true);
    } else {
      showAccelerationMoveTooltip(trigger, true);
    }
  });
  window.addEventListener("resize", () => {
    hideSlowMoveTooltip(true);
    hideAccelerationMoveTooltip(true);
    hideHealingRankingMoveTooltip(true);
  });
  window.addEventListener("scroll", (event) => {
    if (event.target instanceof Element && event.target.closest("#slowMoveTooltip, #accelerationMoveTooltip, #healingRankingMoveTooltip")) return;
    hideSlowMoveTooltip(true);
    hideAccelerationMoveTooltip(true);
    hideHealingRankingMoveTooltip(true);
  }, true);

  el.pokemonSelect.addEventListener("change", () => {
    updateMoveOptions();
    applyRecommendedBuild();
    applyRecommendedEmblems();
    updateAll();
  });
  el.levelRange.addEventListener("input", () => {
    updateMoveOptions();
    updateAll();
  });
  el.applyBuildButton.addEventListener("click", applyRecommendedBuild);
  el.clearItemsButton.addEventListener("click", clearItems);
  el.applyEmblemButton.addEventListener("click", applyRecommendedEmblems);
  el.clearEmblemButton.addEventListener("click", clearEmblems);

  el.shieldPokemonSelect.addEventListener("change", () => {
    updateShieldMoveOptions();
    applyRecommendedShieldBuild();
    updateShieldAll();
  });
  el.shieldLevelRange.addEventListener("input", () => {
    updateShieldMoveOptions();
    updateShieldAll();
  });
  el.shieldApplyBuildButton.addEventListener("click", applyRecommendedShieldBuild);
  el.shieldClearItemsButton.addEventListener("click", clearShieldItems);

  el.healingPokemonSelect.addEventListener("change", () => {
    updateHealingMoveOptions();
    applyRecommendedHealingBuild();
    updateHealingAll();
  });
  el.healingLevelRange.addEventListener("input", () => {
    updateHealingMoveOptions();
    updateHealingAll();
  });
  el.healingApplyBuildButton.addEventListener("click", applyRecommendedHealingBuild);
  el.healingClearItemsButton.addEventListener("click", clearHealingItems);
  el.balancePokemonSelect.addEventListener("change", updateBalanceTimeline);
  el.balanceFilterClearButton.addEventListener("click", () => {
    state.selectedBalanceFilterKeys = [];
    el.balanceFilterOptions.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
    updateBalanceTimeline();
  });

  for (let i = 0; i < 3; i += 1) {
    el[`itemSelect${i}`].addEventListener("change", () => {
      const pokemon = selectedPokemon();
      enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "itemSelect");
      updateAll();
    });
    el[`itemLevel${i}`].addEventListener("input", (event) => {
      event.target.value = clamp(number(event.target.value, 40), 1, 40);
      updateAll();
    });
    el[`shieldItemSelect${i}`].addEventListener("change", () => {
      const pokemon = selectedShieldPokemon();
      enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "shieldItemSelect");
      updateShieldMoveOptions();
      updateShieldAll();
    });
    el[`shieldItemLevel${i}`].addEventListener("input", (event) => {
      event.target.value = clamp(number(event.target.value, 40), 1, 40);
      updateShieldMoveOptions();
      updateShieldAll();
    });
    el[`healingItemSelect${i}`].addEventListener("change", () => {
      const pokemon = selectedHealingPokemon();
      enforceHeldItemRestrictions(pokemon ? pokemon.name : "", "healingItemSelect");
      updateHealingAll();
    });
    el[`healingItemLevel${i}`].addEventListener("input", (event) => {
      event.target.value = clamp(number(event.target.value, 40), 1, 40);
      updateHealingAll();
    });
  }

  el.targetSelect.addEventListener("change", () => {
    state.suppressTargetAutoFill = false;
    syncTargetStats();
    updateAll();
  });
  el.targetLevelRange.addEventListener("input", () => {
    state.suppressTargetAutoFill = false;
    syncTargetStats();
    updateAll();
  });
  el.targetHpMode.addEventListener("change", changeTargetHpMode);
  el.targetHpValue.addEventListener("input", updateAll);
  el.targetHpValue.addEventListener("change", updateAll);
  el.targetFalinksDamageTarget.addEventListener("change", updateAll);
  ["targetDefense", "targetSpDefense"].forEach((id) => {
    el[id].addEventListener("input", () => {
      state.suppressTargetAutoFill = true;
      updateAll();
    });
  });

  ["rankingLevelRange", "rankingTargetSelect", "rankingTargetLevelRange", "rankingSlotFilter", "rankingLimitSelect", "rankingSingleHit"].forEach((id) => {
    el[id].addEventListener("input", updateDamageRanking);
    el[id].addEventListener("change", updateDamageRanking);
  });

  ["healingRankingLevelRange", "healingRankingLimitSelect"].forEach((id) => {
    el[id].addEventListener("input", updateHealingRanking);
    el[id].addEventListener("change", updateHealingRanking);
  });

  el.damageVariantSelect.addEventListener("change", () => {
    state.selectedDamageVariantKey = el.damageVariantSelect.value;
    updateAll();
  });

  [
    "manualAttack", "manualHp", "manualSpAttack", "manualDamagePercent", "manualExtraDamage",
    "manualDefenseReductionPercent", "manualSpDefenseReductionPercent", "manualDefenseReductionFlat", "manualSpDefenseReductionFlat",
    "manualDefenseIgnorePercent", "manualSpDefenseIgnorePercent", "manualDefensePenetrationFlat", "manualSpDefensePenetrationFlat",
    "criticalHit", "attackWeightStacks", "aeosCookieStacks", "spAtkSpecsStacks", "weaknessPolicyStacks",
    "accelBracerStacks", "driveLensStacks", "plusPowerProc", "choiceSpecsProc", "chargingCharmProc",
    "razorClawProc", "energyAmpProc", "yveltalMarkStacks", "snorlaxFlailHpPercent", "sylveonHyperVoiceRange", "regidragoBuff", "groudonBuff", "rayquazaBuff"
  ].forEach((id) => {
    el[id].addEventListener("input", updateAll);
    el[id].addEventListener("change", updateAll);
  });
  document.querySelectorAll('input[name="regiBuff"]').forEach((input) => {
    input.addEventListener("input", updateAll);
    input.addEventListener("change", updateAll);
  });

  [
    "shieldManualAttack", "shieldManualSpAttack", "shieldManualHp", "manualShieldPercent",
    "manualShieldFlat", "shieldCount", "shieldAttackWeightStacks",
    "shieldSpAtkSpecsStacks", "shieldWeaknessPolicyStacks",
    "shieldAccelBracerStacks", "shieldDriveLensStacks"
  ].forEach((id) => {
    el[id].addEventListener("input", updateShieldAll);
    el[id].addEventListener("change", updateShieldAll);
  });

  [
    "healingManualAttack", "healingManualSpAttack",
    "manualHealingPercent", "manualHealingFlat", "healingCount",
    "healingAttackWeightStacks", "healingSpAtkSpecsStacks",
    "healingWeaknessPolicyStacks", "healingAccelBracerStacks",
    "healingDriveLensStacks"
  ].forEach((id) => {
    el[id].addEventListener("input", updateHealingAll);
    el[id].addEventListener("change", updateHealingAll);
  });

  el.healingEffectSelect.addEventListener("change", () => {
    state.selectedHealingEffectKey = el.healingEffectSelect.value;
    updateHealingAll();
  });

  el.retryLoadButton.addEventListener("click", () => {
    window.location.reload();
  });

  el.openFeedbackButton.addEventListener("click", () => {
    if (window.location.hash !== "#feedback") {
      history.pushState(null, "", feedbackRelativeUrl(true));
    }
    openFeedbackDialog();
  });
  el.closeFeedbackButton.addEventListener("click", () => closeFeedbackDialog());
  el.copyFeedbackButton.addEventListener("click", copyFeedbackIssue);
  el.feedbackForm.addEventListener("input", () => setFeedbackStatus(""));
  el.feedbackForm.addEventListener("submit", () => {
    prepareFeedbackIssue();
    setFeedbackStatus("GitHubの新規Issue画面を開きます。");
  });
  el.feedbackDialog.addEventListener("click", (event) => {
    if (event.target === el.feedbackDialog) closeFeedbackDialog();
  });
  el.feedbackDialog.addEventListener("close", () => closeFeedbackDialog());
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#feedback") openFeedbackDialog();
    else closeFeedbackDialog(false);
  });

  if (window.location.hash === "#feedback" || new URLSearchParams(window.location.search).get("feedback") === "1") {
    openFeedbackDialog();
  }
}
