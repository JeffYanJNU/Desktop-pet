(() => {
  function byId(id) {
    return document.getElementById(id);
  }

  function clampInterval(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return 5;
    return Math.min(60, Math.max(1, Math.round(minutes)));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureScheduleUi() {
    const jsonInput = byId("aiScheduleJsonInput");
    if (!jsonInput || byId("scheduleVisualList")) return;

    const editorHead = jsonInput.previousElementSibling?.classList.contains("schedule-editor-head")
      ? jsonInput.previousElementSibling
      : null;
    const list = document.createElement("div");
    list.id = "scheduleVisualList";
    list.className = "schedule-visual-list";
    (editorHead || jsonInput).insertAdjacentElement("beforebegin", list);

    const details = document.createElement("details");
    details.className = "schedule-json-details";
    const summary = document.createElement("summary");
    summary.textContent = "高级 JSON 编辑";
    details.appendChild(summary);

    if (editorHead) details.appendChild(editorHead);
    jsonInput.insertAdjacentElement("beforebegin", details);
    details.appendChild(jsonInput);
  }

  function renderScheduleList(items = []) {
    ensureScheduleUi();
    const list = byId("scheduleVisualList");
    if (!list) return;

    if (!Array.isArray(items) || !items.length) {
      list.innerHTML = '<p class="schedule-empty">暂无日程。</p>';
      return;
    }

    list.innerHTML = items.map((item) => {
      const start = escapeHtml(item.start || "--:--");
      const end = escapeHtml(item.end || "--:--");
      const activity = escapeHtml(item.activity || "未命名活动");
      const moodHint = escapeHtml(item.moodHint || "未设置语气");
      const energy = Number(item.energyDelta || 0);
      const energyText = `${energy >= 0 ? "+" : ""}${energy}`;
      return `
        <article class="schedule-card">
          <div class="schedule-time">${start}<span>${end}</span></div>
          <div class="schedule-copy">
            <strong>${activity}</strong>
            <span>${moodHint}</span>
          </div>
          <b class="${energy >= 0 ? "is-positive" : "is-negative"}">${energyText}</b>
        </article>
      `;
    }).join("");
  }

  function renderSchedule(snapshot = {}) {
    const enabledInput = byId("aiScheduleEnabledInput");
    const autoInput = byId("aiScheduleAutoAdjustInput");
    const proactiveInput = byId("proactiveEnabledInput");
    const proactiveVoiceInput = byId("proactiveVoiceInput");
    const moodAnimationInput = byId("moodAnimationInput");
    const intervalInput = byId("proactiveIntervalInput");
    const jsonInput = byId("aiScheduleJsonInput");
    const currentText = byId("scheduleCurrentText");

    if (enabledInput) enabledInput.checked = snapshot.aiScheduleEnabled !== false;
    if (autoInput) autoInput.checked = snapshot.aiScheduleAutoAdjustEnabled !== false;
    if (proactiveInput) proactiveInput.checked = snapshot.proactiveEnabled !== false;
    if (proactiveVoiceInput) proactiveVoiceInput.checked = snapshot.proactiveVoiceEnabled === true;
    if (moodAnimationInput) moodAnimationInput.checked = snapshot.moodAnimationEnabled !== false;
    if (intervalInput) intervalInput.value = String(clampInterval(snapshot.proactiveIntervalMinutes || 5));
    if (jsonInput) jsonInput.value = JSON.stringify(snapshot.aiScheduleItems || [], null, 2);
    renderScheduleList(snapshot.aiScheduleItems || []);

    const current = snapshot.current || snapshot.currentAiSchedule;
    if (currentText) {
      currentText.textContent = current
        ? `当前：${current.start}-${current.end}\n${current.activity}\n语气：${current.moodHint}\n精力影响：${current.energyDelta >= 0 ? "+" : ""}${current.energyDelta}`
        : "当前没有匹配的日程。";
    }
  }

  async function loadSchedule() {
    if (!window.tablePet?.getSettings) return;
    const settings = await window.tablePet.getSettings();
    renderSchedule({
      ...settings,
      current: settings.currentAiSchedule
    });
  }

  function readScheduleItems() {
    const raw = byId("aiScheduleJsonInput")?.value || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("日程 JSON 必须是数组");
    return parsed;
  }

  async function saveSchedule() {
    if (!window.tablePet?.getSettings || !window.tablePet?.saveSettings) return;
    const settings = await window.tablePet.getSettings();
    const saved = await window.tablePet.saveSettings({
      ...settings,
      aiScheduleEnabled: byId("aiScheduleEnabledInput")?.checked !== false,
      aiScheduleAutoAdjustEnabled: byId("aiScheduleAutoAdjustInput")?.checked !== false,
      proactiveEnabled: byId("proactiveEnabledInput")?.checked !== false,
      proactiveVoiceEnabled: byId("proactiveVoiceInput")?.checked === true,
      proactiveIntervalMinutes: clampInterval(byId("proactiveIntervalInput")?.value),
      moodAnimationEnabled: byId("moodAnimationInput")?.checked !== false,
      aiScheduleItems: readScheduleItems()
    });
    renderSchedule({
      ...saved,
      current: saved.currentAiSchedule
    });
    window.dispatchEvent(new CustomEvent("tablepet-settings-updated", { detail: saved }));

    const replyText = byId("replyText");
    if (replyText) replyText.textContent = "AI 日程、主动提醒和情绪动画设置已经保存。";
  }

  async function resetSchedule() {
    if (!confirm("恢复默认 AI 日程？当前自定义日程会被覆盖。")) return;
    if (!window.tablePet?.resetSchedule) return;
    const snapshot = await window.tablePet.resetSchedule();
    await loadSchedule();
    return snapshot;
  }

  function bind() {
    const refreshButton = byId("refreshScheduleButton");
    const saveButton = byId("saveScheduleButton");
    const resetButton = byId("resetScheduleButton");

    refreshButton?.addEventListener("click", async () => {
      refreshButton.disabled = true;
      try {
        await loadSchedule();
      } finally {
        refreshButton.disabled = false;
      }
    });

    saveButton?.addEventListener("click", async () => {
      saveButton.disabled = true;
      try {
        await saveSchedule();
      } catch (error) {
        const currentText = byId("scheduleCurrentText");
        if (currentText) currentText.textContent = `日程保存失败：${error.message || String(error)}`;
      } finally {
        saveButton.disabled = false;
      }
    });

    resetButton?.addEventListener("click", async () => {
      resetButton.disabled = true;
      try {
        await resetSchedule();
      } finally {
        resetButton.disabled = false;
      }
    });
  }

  bind();
  loadSchedule().catch(() => undefined);
})();
