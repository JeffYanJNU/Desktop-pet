(() => {
  const moodOptions = ["开心", "普通", "疲惫", "生气"];

  function byId(id) {
    return document.getElementById(id);
  }

  function clampPercent(value, fallback) {
    const score = Number(value);
    if (!Number.isFinite(score)) return fallback;
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  function normalizeMood(value) {
    return moodOptions.includes(value) ? value : "普通";
  }

  function boolFromInput(id, fallback = true) {
    const input = byId(id);
    return input ? input.checked : fallback;
  }

  function readUiState() {
    return {
      petMood: normalizeMood(byId("petMoodSelect")?.value),
      intimacy: clampPercent(byId("intimacyInput")?.value, 50),
      energy: clampPercent(byId("energyInput")?.value, 70)
    };
  }

  function readBackgroundUiState() {
    return {
      backgroundEnabled: boolFromInput("backgroundEnabledInput", true),
      backgroundMoodLinkEnabled: boolFromInput("backgroundMoodLinkInput", true),
      backgroundWeatherEnabled: boolFromInput("backgroundWeatherInput", true),
      backgroundCity: String(byId("backgroundCityInput")?.value || "Singapore").trim() || "Singapore"
    };
  }

  function renderState(state) {
    const petMood = normalizeMood(state?.petMood);
    const intimacy = clampPercent(state?.intimacy, 50);
    const energy = clampPercent(state?.energy, 70);

    const moodSelect = byId("petMoodSelect");
    const intimacyInput = byId("intimacyInput");
    const energyInput = byId("energyInput");
    const intimacyValue = byId("intimacyValueText");
    const energyValue = byId("energyValueText");
    const summary = byId("petStateSummary");

    if (moodSelect) moodSelect.value = petMood;
    if (intimacyInput) intimacyInput.value = String(intimacy);
    if (energyInput) energyInput.value = String(energy);
    if (intimacyValue) intimacyValue.textContent = String(intimacy);
    if (energyValue) energyValue.textContent = String(energy);
    if (summary) summary.textContent = `${petMood} · 亲密 ${intimacy} · 精力 ${energy}`;
  }

  function renderBackgroundSettings(settings = {}) {
    const enabled = byId("backgroundEnabledInput");
    const moodLink = byId("backgroundMoodLinkInput");
    const weather = byId("backgroundWeatherInput");
    const city = byId("backgroundCityInput");

    if (enabled) enabled.checked = settings.backgroundEnabled !== false;
    if (moodLink) moodLink.checked = settings.backgroundMoodLinkEnabled !== false;
    if (weather) weather.checked = settings.backgroundWeatherEnabled !== false;
    if (city) city.value = String(settings.backgroundCity || "Singapore");
  }

  function renderBackgroundPreview(background) {
    const preview = byId("backgroundStatePreview");
    if (!preview) return;
    if (!background) {
      preview.textContent = "背景状态未刷新。";
      return;
    }

    const linked = background.linkedStatus || {};
    const weatherText = background.weather
      ? `${background.weather.city} · ${background.weather.weather} · ${background.weather.temperature}°C`
      : background.error
        ? `天气不可用：${background.error}`
        : "未启用天气";
    const reasons = linked.influence?.reasons?.length ? linked.influence.reasons.join("；") : "无明显影响";
    preview.textContent = [
      `${background.time?.dayPart || "当前"} · ${background.time?.local || ""}`,
      weatherText,
      `联动后：${linked.petMood || "普通"} · 精力 ${linked.energy ?? 70}`,
      `原因：${reasons}`
    ].join("\n");
  }

  async function loadState() {
    if (!window.tablePet?.getSettings) return;
    const settings = await window.tablePet.getSettings();
    renderState(settings || {});
    renderBackgroundSettings(settings || {});
    refreshBackground(false).catch(() => undefined);
  }

  async function saveState(nextState = readUiState()) {
    if (!window.tablePet?.getSettings || !window.tablePet?.saveSettings) return;
    const settings = await window.tablePet.getSettings();
    const saved = await window.tablePet.saveSettings({
      ...settings,
      ...nextState
    });
    renderState(saved || nextState);

    const replyText = byId("replyText");
    if (replyText) {
      replyText.textContent = `状态已更新：${nextState.petMood}，亲密度 ${nextState.intimacy}，精力 ${nextState.energy}。`;
    }
  }

  async function saveBackgroundSettings() {
    if (!window.tablePet?.getSettings || !window.tablePet?.saveSettings) return;
    const settings = await window.tablePet.getSettings();
    const nextBackground = readBackgroundUiState();
    const saved = await window.tablePet.saveSettings({
      ...settings,
      ...nextBackground
    });
    renderBackgroundSettings(saved || nextBackground);
    await refreshBackground(true);

    const replyText = byId("replyText");
    if (replyText) {
      replyText.textContent = `背景联动已保存：${nextBackground.backgroundCity}，${nextBackground.backgroundMoodLinkEnabled ? "会影响心情和精力" : "只提供背景信息"}。`;
    }
  }

  async function refreshBackground(force = true) {
    if (!window.tablePet?.getBackgroundInfo) return;
    const preview = byId("backgroundStatePreview");
    if (preview) preview.textContent = "正在刷新背景信息……";
    const background = await window.tablePet.getBackgroundInfo({ force });
    renderBackgroundPreview(background);
  }

  function bindRangePreview(inputId, labelId) {
    const input = byId(inputId);
    const label = byId(labelId);
    if (!input || !label) return;
    input.addEventListener("input", () => {
      label.textContent = String(clampPercent(input.value, Number(label.textContent || 0)));
      renderState(readUiState());
    });
  }

  function bind() {
    const moodSelect = byId("petMoodSelect");
    const saveButton = byId("savePetStateButton");
    const resetButton = byId("resetPetStateButton");
    const saveBackgroundButton = byId("saveBackgroundButton");
    const refreshBackgroundButton = byId("refreshBackgroundButton");

    moodSelect?.addEventListener("change", () => renderState(readUiState()));
    bindRangePreview("intimacyInput", "intimacyValueText");
    bindRangePreview("energyInput", "energyValueText");

    saveButton?.addEventListener("click", async () => {
      saveButton.disabled = true;
      try {
        await saveState();
      } catch (error) {
        const replyText = byId("replyText");
        if (replyText) replyText.textContent = `状态保存失败：${error.message || String(error)}`;
      } finally {
        saveButton.disabled = false;
      }
    });

    resetButton?.addEventListener("click", () => {
      renderState({ petMood: "普通", intimacy: 50, energy: 70 });
    });

    saveBackgroundButton?.addEventListener("click", async () => {
      saveBackgroundButton.disabled = true;
      try {
        await saveBackgroundSettings();
      } catch (error) {
        const preview = byId("backgroundStatePreview");
        if (preview) preview.textContent = `背景联动保存失败：${error.message || String(error)}`;
      } finally {
        saveBackgroundButton.disabled = false;
      }
    });

    refreshBackgroundButton?.addEventListener("click", async () => {
      refreshBackgroundButton.disabled = true;
      try {
        await refreshBackground(true);
      } catch (error) {
        const preview = byId("backgroundStatePreview");
        if (preview) preview.textContent = `背景刷新失败：${error.message || String(error)}`;
      } finally {
        refreshBackgroundButton.disabled = false;
      }
    });
  }

  bind();
  loadState().catch(() => renderState({ petMood: "普通", intimacy: 50, energy: 70 }));
})();
