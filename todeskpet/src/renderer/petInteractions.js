(() => {
  const portrait = document.querySelector("#portrait");
  const portraitImage = document.querySelector("#customPortraitImage");
  const replyText = document.querySelector("#replyText");
  const messageInput = document.querySelector("#messageInput");
  const settingsButton = document.querySelector("#settingsButton");
  const settingsDialog = document.querySelector("#settingsDialog");
  const settingsForm = document.querySelector("#settingsForm");
  const moodPortraitList = document.querySelector("#moodPortraitList");
  const interactionPortraitList = document.querySelector("#interactionPortraitList");
  const petContextMenu = document.querySelector("#petContextMenu");
  const voiceStatusText = document.querySelector("#voiceStatusText");
  const sendButton = document.querySelector("#sendButton");

  if (!portrait || !window.tablePet) return;

  const MOOD_FALLBACK_ORDER = ["Confused", "Thinking", "Neutral", "Happy", "Encouraging"];
  const DEFAULT_INTERACTION_SLOTS = [
    { key: "idle", label: "普通待机" },
    { key: "touch", label: "摸头开心" },
    { key: "angry", label: "连续点击生气" },
    { key: "drag", label: "拖动中" },
    { key: "edge", label: "边缘探头" },
    { key: "bottom", label: "坐在任务栏" },
    { key: "chat", label: "聊天中" },
    { key: "thinking", label: "思考中" },
    { key: "speaking", label: "说话中" },
    { key: "studyFocus", label: "学习专注" },
    { key: "studyBreak", label: "学习休息" },
    { key: "sleep", label: "睡觉空闲" }
  ];

  const RANDOM_LINES = [
    "[Emotion: Neutral]\n我在。今天先处理哪一件事？",
    "[Emotion: Happy]\n点我一下就想叫我？行，我听着。",
    "[Emotion: Thinking]\n我刚刚在发呆，不过现在可以开始做事。",
    "[Emotion: Encouraging]\n别拖太久，先把最小的一步做掉。",
    "[Emotion: Neutral]\n你可以双击我打开聊天，长按我移动位置。"
  ];

  const TOUCH_LINES = [
    "[Emotion: Happy]\n嗯……摸头可以，但别一直点。",
    "[Emotion: Happy]\n心情稍微变好了。",
    "[Emotion: Encouraging]\n好，奖励收到。现在继续做正事。"
  ];

  const ANGRY_LINES = [
    "[Emotion: Confused]\n你再这样连点，我真的要生气了。",
    "[Emotion: Confused]\n手停一下。不是按钮，是桌宠。",
    "[Emotion: Confused]\n够了，连续点击判定：烦人。"
  ];

  const IDLE_LINES = [
    "[Emotion: Neutral]\n我还在。你停了有一会儿，要不要继续刚才的事？",
    "[Emotion: Thinking]\n空闲时间有点长。要不要定一个小目标？",
    "[Emotion: Encouraging]\n先做两分钟也行，别让任务一直悬着。"
  ];

  const EDGE_LINES = {
    left: "[Emotion: Thinking]\n我先抓住左边，别把我甩出去。",
    right: "[Emotion: Thinking]\n右边这个位置不错，我可以探头看你。",
    top: "[Emotion: Confused]\n太高了，我先挂在这里。",
    none: "[Emotion: Neutral]\n位置调整好了。"
  };

  const STATE_PRIORITY = {
    idle: 1,
    sleep: 2,
    chat: 3,
    bottom: 4,
    edge: 5,
    touch: 6,
    angry: 7,
    studyBreak: 7,
    thinking: 8,
    studyFocus: 8,
    speaking: 9,
    drag: 10
  };

  const stateSources = new Map();
  const stateTimers = new Map();
  let activeState = "idle";
  let activeSource = "base";
  let settingsSnapshot = null;
  let moodPortraitUrls = {};
  let moodPortraitMeta = {};
  let interactionPortraitUrls = {};
  let interactionPortraitMeta = {};
  let interactionSlots = DEFAULT_INTERACTION_SLOTS;
  let singleClickTimer = null;
  let lastTapTimes = [];
  let lastUserInteractionAt = Date.now();
  let idleReminderAt = 0;
  let debugPanel = null;
  let settingsTabsReady = false;
  let lastRenderedState = "";
  let lastRenderedSrc = null;

  function injectInteractionStyles() {
    // Layout styles live in CSS files now.
  }

  function notifySuccess(message) {
    window.tablePetNotify?.success?.(message);
  }

  function notifyWarning(message) {
    window.tablePetNotify?.warning?.(message);
  }

  function notifyError(message) {
    window.tablePetNotify?.error?.(message);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function visibleReplyText(text) {
    return String(text || "")
      .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
      .trim();
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)] || items[0] || "";
  }

  function markUserInteraction() {
    lastUserInteractionAt = Date.now();
  }

  function showLocalReply(text, { open = true } = {}) {
    if (!replyText) return;
    const wasVisible = document.body.classList.contains("chat-visible");
    replyText.innerHTML = escapeHtml(visibleReplyText(text)).replace(/\n/g, "<br />");
    const bubble = replyText.closest(".bubble");
    if (bubble && !wasVisible) {
      bubble.style.animation = "none";
      bubble.offsetHeight;
      bubble.style.animation = "";
    }
    if (open) openChat().catch(() => undefined);
  }

  function nearestMoodPortraitUrl(activeMood) {
    if (moodPortraitUrls[activeMood]) return moodPortraitUrls[activeMood];
    const index = Math.max(0, MOOD_FALLBACK_ORDER.indexOf(activeMood));

    for (let distance = 1; distance < MOOD_FALLBACK_ORDER.length; distance += 1) {
      const left = MOOD_FALLBACK_ORDER[index - distance];
      const right = MOOD_FALLBACK_ORDER[index + distance];
      if (left && moodPortraitUrls[left]) return moodPortraitUrls[left];
      if (right && moodPortraitUrls[right]) return moodPortraitUrls[right];
    }

    return "";
  }

  function currentMoodKey() {
    if (portrait.classList.contains("confused")) return "Confused";
    if (portrait.classList.contains("thinking")) return "Thinking";
    if (portrait.classList.contains("happy")) return "Happy";
    if (portrait.classList.contains("encouraging")) return "Encouraging";
    return settingsSnapshot?.mood || "Neutral";
  }

  function setPortraitSrc(src) {
    if (!portraitImage || !src) return;
    const currentSrc = portraitImage.getAttribute("src") || "";
    if (currentSrc === src || portraitImage.src === src) {
      lastRenderedSrc = src;
      return;
    }
    lastRenderedSrc = src;
    if (src.startsWith("data:") || src.startsWith("file:") || src.startsWith("blob:")) {
      portraitImage.setAttribute("src", src);
      return;
    }
    const preloader = new Image();
    preloader.decoding = "async";
    preloader.onload = () => {
      if (lastRenderedSrc === src) portraitImage.setAttribute("src", src);
    };
    preloader.onerror = () => {
      if (lastRenderedSrc === src && !portraitImage.getAttribute("src")) portraitImage.setAttribute("src", src);
    };
    preloader.src = src;
  }

  function removeInteractionClasses() {
    [...portrait.classList].forEach((className) => {
      if (className.startsWith("interaction-") || className.startsWith("state-source-")) {
        portrait.classList.remove(className);
      }
    });
  }

  function renderState() {
    const domSrc = portraitImage?.getAttribute("src") || "";
    if (domSrc && domSrc !== lastRenderedSrc) lastRenderedSrc = domSrc;
    const fallbackMoodSrc = domSrc || lastRenderedSrc || nearestMoodPortraitUrl(currentMoodKey());
    const nextSrc = interactionPortraitUrls[activeState] || interactionPortraitUrls.idle || fallbackMoodSrc || lastRenderedSrc || "";
    const hasStateClass = portrait.classList.contains(`interaction-${activeState}`);
    const sameVisualState = activeState === lastRenderedState && nextSrc === lastRenderedSrc && (!nextSrc || domSrc === nextSrc) && !portrait.classList.contains("pet-visual-dirty") && hasStateClass;

    document.body.dataset.petState = activeState;
    document.body.classList.toggle("pet-debug-open", Boolean(debugPanel && !debugPanel.hidden));

    if (!sameVisualState) {
      if ((activeState === "idle" || activeState === "chat") && lastRenderedState === activeState) {
        if (nextSrc) setPortraitSrc(nextSrc);
        lastRenderedSrc = nextSrc || lastRenderedSrc;
        renderDebugPanel();
        return;
      }
      portrait.classList.add("pet-visual-dirty");
      removeInteractionClasses();
      portrait.classList.add(`interaction-${activeState}`, `state-source-${activeSource}`);
      window.setTimeout(() => portrait.classList.remove("pet-visual-dirty"), 0);
      if (nextSrc) setPortraitSrc(nextSrc);
      lastRenderedState = activeState;
      lastRenderedSrc = nextSrc || lastRenderedSrc;
    }

    renderDebugPanel();
  }

  function resolveState() {
    let winner = { source: "base", state: "idle", priority: STATE_PRIORITY.idle };
    for (const [source, entry] of stateSources.entries()) {
      const priority = entry.priority ?? STATE_PRIORITY[entry.state] ?? 1;
      if (priority >= winner.priority) {
        winner = { source, state: entry.state, priority };
      }
    }
    activeState = winner.state;
    activeSource = winner.source;
    renderState();
  }

  function clearStateSource(source) {
    window.clearTimeout(stateTimers.get(source));
    stateTimers.delete(source);
    stateSources.delete(source);
    resolveState();
  }

  function setStateSource(source, state, { priority, duration = 0 } = {}) {
    window.clearTimeout(stateTimers.get(source));
    stateSources.set(source, {
      state: interactionSlots.some((slot) => slot.key === state) ? state : "idle",
      priority: priority ?? STATE_PRIORITY[state] ?? 1,
      startedAt: Date.now()
    });
    if (duration > 0) {
      stateTimers.set(source, window.setTimeout(() => clearStateSource(source), duration));
    }
    resolveState();
  }

  function setTemporaryState(state, duration = 1800) {
    setStateSource("interaction", state, { duration });
  }

  async function openChat() {
    const wasVisible = document.body.classList.contains("chat-visible");
    if (!wasVisible) {
      document.body.classList.remove("chat-collapsed");
      document.body.classList.add("chat-visible");
    }
    if (!wasVisible && window.__tablePetLastChatVisible !== true) {
      window.__tablePetLastChatVisible = true;
      await window.tablePet.setChatVisible(true);
    }
    messageInput?.focus();
  }

  async function closeChat() {
    document.body.classList.add("chat-collapsed");
    document.body.classList.remove("chat-visible");
    clearStateSource("chat");
    window.__tablePetLastChatVisible = false;
    await window.tablePet.setChatVisible(false);
  }

  function handleTouch() {
    markUserInteraction();
    const wasVisible = document.body.classList.contains("chat-visible");
    if (!wasVisible) setTemporaryState("touch", 2200);
    if (wasVisible) return;
    showLocalReply(randomItem(TOUCH_LINES));
  }

  function handleRandomLine() {
    markUserInteraction();
    if (document.body.classList.contains("chat-visible")) return;
    showLocalReply(randomItem(RANDOM_LINES));
  }

  function handleAngryClick() {
    markUserInteraction();
    setTemporaryState("angry", 3000);
    showLocalReply(randomItem(ANGRY_LINES));
  }

  function enterRestState() {
    markUserInteraction();
    setStateSource("rest", "sleep", { priority: STATE_PRIORITY.sleep });
    showLocalReply("[Emotion: Neutral]\n我先安静待机。点我或者双击我就会回来。", { open: false });
  }

  function leaveRestState() {
    if (stateSources.has("rest")) clearStateSource("rest");
  }

  function isTouchOnHead(event) {
    const rect = portrait.getBoundingClientRect();
    return event.clientY - rect.top <= rect.height * 0.36;
  }

  function registerRapidTap() {
    const now = Date.now();
    lastTapTimes = lastTapTimes.filter((time) => now - time < 2200);
    lastTapTimes.push(now);
    return lastTapTimes.length;
  }

  function handlePortraitClick(event) {
    if (settingsDialog?.open) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (event.detail && event.detail > 1) {
      window.clearTimeout(singleClickTimer);
      singleClickTimer = null;
      return;
    }
    window.clearTimeout(singleClickTimer);
    singleClickTimer = null;

    hideContextMenu();
    leaveRestState();

    const tapCount = registerRapidTap();
    const touchOnHead = isTouchOnHead(event);

    if (tapCount >= 5) {
      lastTapTimes = [];
      handleAngryClick();
      return;
    }

    singleClickTimer = window.setTimeout(() => {
      if (touchOnHead) {
        handleTouch();
      } else {
        handleRandomLine();
      }
      singleClickTimer = null;
    }, 180);
  }

  function handlePortraitDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    markUserInteraction();
    leaveRestState();
    window.clearTimeout(singleClickTimer);
    setTemporaryState("touch", 1200);
    openChat().catch(() => undefined);
  }

  function showContextMenu(event) {
    if (!petContextMenu || settingsDialog?.open) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    markUserInteraction();

    const x = Math.min(event.clientX, window.innerWidth - 154);
    const y = Math.min(event.clientY, window.innerHeight - 288);
    petContextMenu.style.left = `${Math.max(8, x)}px`;
    petContextMenu.style.top = `${Math.max(8, y)}px`;
    petContextMenu.hidden = false;
  }

  function hideContextMenu() {
    if (petContextMenu) petContextMenu.hidden = true;
  }

  async function handleContextAction(event) {
    const button = event.target.closest("button[data-pet-action]");
    if (!button) return;
    const action = button.dataset.petAction;
    hideContextMenu();
    markUserInteraction();

    if (action === "chat") {
      await openChat();
      return;
    }
    if (action === "close-chat") {
      await closeChat();
      return;
    }
    if (action === "random") {
      handleRandomLine();
      return;
    }
    if (action === "touch") {
      handleTouch();
      return;
    }
    if (action === "pin") {
      const pinned = await window.tablePet.togglePin();
      showLocalReply(pinned ? "[Emotion: Happy]\n我会保持在最前面。" : "[Emotion: Neutral]\n好，我不再强制置顶。", { open: true });
      return;
    }
    if (action === "rest") {
      enterRestState();
      return;
    }
    if (action === "debug") {
      toggleDebugPanel();
      return;
    }
    if (action === "settings") {
      settingsButton?.click();
      return;
    }
    if (action === "hide") {
      await window.tablePet.minimize();
    }
  }

  function statusText(hasImage) {
    return hasImage ? "已设置" : "未设置";
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "";
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
    return `${Math.max(1, Math.round(value / 1024))}KB`;
  }

  function portraitMetaText(meta, fallbackText) {
    if (!meta) return fallbackText || "将使用 fallback";
    const size = meta.width && meta.height ? `${meta.width}×${meta.height}` : "未知尺寸";
    const alpha = meta.hasAlpha ? "透明" : "非透明";
    return `${size} · ${formatBytes(meta.bytes)} · ${alpha}`;
  }

  function fallbackTextFor(dataName, key, urls) {
    if (urls[key]) return "";
    if (dataName === "interaction") {
      if (key !== "idle" && urls.idle) return "fallback：普通待机";
      return "fallback：当前心情立绘";
    }
    return "fallback：相邻心情立绘";
  }

  function ensurePreviewDialog() {
    let dialog = document.querySelector("#portraitPreviewDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "portraitPreviewDialog";
    dialog.className = "portrait-preview-dialog";
    dialog.innerHTML = `
      <button type="button" class="portrait-preview-close" aria-label="关闭预览">×</button>
      <img alt="立绘预览" />
      <p></p>
    `;
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest(".portrait-preview-close")) dialog.close();
    });
    document.body.append(dialog);
    return dialog;
  }

  function openPortraitPreview(url, label, meta) {
    if (!url) return;
    const dialog = ensurePreviewDialog();
    dialog.querySelector("img").src = url;
    dialog.querySelector("p").textContent = `${label} · ${portraitMetaText(meta, "")}`;
    dialog.showModal();
  }

  function ensurePickerActions(container, title) {
    if (!container || container.previousElementSibling?.classList.contains("portrait-bulk-actions")) return;
    const row = document.createElement("div");
    row.className = "portrait-bulk-actions";
    row.innerHTML = `
      <span>${escapeHtml(title)}</span>
      <div class="portrait-bulk-buttons">
        <button type="button" data-portrait-open-folder>打开目录</button>
        <button type="button" data-portrait-clean-unused>清理未用</button>
        <button type="button" data-portrait-bulk-clear="${title.includes("心情") ? "mood" : "interaction"}">清空本组</button>
      </div>
    `;
    container.before(row);
  }

  function renderPortraitPickerList(container, items, urls, dataName, metaMap = {}) {
    if (!container) return;
    ensurePickerActions(container, dataName === "mood" ? "心情图片" : "互动图片");
    container.innerHTML = items
      .map((item) => {
        const url = urls[item.key] || "";
        const meta = metaMap[item.key] || null;
        const fallback = fallbackTextFor(dataName, item.key, urls);
        const attrName = dataName === "mood" ? "data-mood-key" : "data-interaction-key";
        const resetAttr = dataName === "mood" ? "data-reset-mood" : "data-reset-interaction";
        return `
          <div class="portrait-picker-item">
            <button type="button" class="portrait-picker-preview ${url ? "has-image" : ""}" data-preview-url="${escapeHtml(url)}" data-preview-label="${escapeHtml(item.label || item.key)}" data-preview-kind="${escapeHtml(dataName)}" data-preview-key="${escapeHtml(item.key)}" ${url ? "" : "disabled"}>
              ${url ? `<img src="${escapeHtml(url)}" alt="" />` : "图"}
            </button>
            <div class="portrait-picker-copy">
              <strong>${escapeHtml(item.label || item.key)}</strong>
              <span>${statusText(Boolean(url))}${url ? " · 可预览/清除" : ` · ${escapeHtml(fallback)}`}</span>
              <small>${escapeHtml(portraitMetaText(meta, fallback))}</small>
            </div>
            <div class="portrait-picker-buttons">
              <button type="button" ${attrName}="${escapeHtml(item.key)}">选择</button>
              <button type="button" class="ghost" ${resetAttr}="${escapeHtml(item.key)}">清除</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function mergeInteractionSlots(slots) {
    const map = new Map(DEFAULT_INTERACTION_SLOTS.map((slot) => [slot.key, slot]));
    (slots || []).forEach((slot) => map.set(slot.key, slot));
    return [...map.values()];
  }

  function renderPortraitPickers(settings) {
    const moodOptions = settings?.moodOptions || [];
    interactionSlots = mergeInteractionSlots(settings?.interactionPortraitSlots);
    moodPortraitUrls = settings?.moodPortraitUrls || {};
    moodPortraitMeta = settings?.moodPortraitMeta || {};
    interactionPortraitUrls = settings?.interactionPortraitUrls || {};
    interactionPortraitMeta = settings?.interactionPortraitMeta || {};

    renderPortraitPickerList(moodPortraitList, moodOptions, moodPortraitUrls, "mood", moodPortraitMeta);
    renderPortraitPickerList(interactionPortraitList, interactionSlots, interactionPortraitUrls, "interaction", interactionPortraitMeta);
    renderState();
  }

  async function refreshInteractionSettings() {
    try {
      settingsSnapshot = await window.tablePet.getSettings();
      renderPortraitPickers(settingsSnapshot);
      renderDebugPanel();
    } catch (error) {
      notifyError(`刷新立绘设置失败：${error.message || error}`);
    }
  }

  async function savePortraitPaths(patch) {
    const current = settingsSnapshot || await window.tablePet.getSettings();
    const next = await window.tablePet.saveSettings({
      ...current,
      ...patch,
      moodPortraitPaths: {
        ...(current.moodPortraitPaths || {}),
        ...(patch.moodPortraitPaths || {})
      },
      interactionPortraitPaths: {
        ...(current.interactionPortraitPaths || {}),
        ...(patch.interactionPortraitPaths || {})
      }
    });
    settingsSnapshot = next;
    renderPortraitPickers(next);
    return next;
  }

  async function importPortraitFromButton(event) {
    const previewButton = event.target.closest("button[data-preview-url]");
    const moodButton = event.target.closest("button[data-mood-key]");
    const interactionButton = event.target.closest("button[data-interaction-key]");
    const resetMoodButton = event.target.closest("button[data-reset-mood]");
    const resetInteractionButton = event.target.closest("button[data-reset-interaction]");
    const bulkClearButton = event.target.closest("button[data-portrait-bulk-clear]");
    const openFolderButton = event.target.closest("button[data-portrait-open-folder]");
    const cleanUnusedButton = event.target.closest("button[data-portrait-clean-unused]");

    if (previewButton?.dataset.previewUrl) {
      const metaMap = previewButton.dataset.previewKind === "mood" ? moodPortraitMeta : interactionPortraitMeta;
      openPortraitPreview(previewButton.dataset.previewUrl, previewButton.dataset.previewLabel, metaMap[previewButton.dataset.previewKey]);
      return;
    }

    if (openFolderButton) {
      await window.tablePet.openPortraitFolder?.();
      notifySuccess("已打开图片目录");
      return;
    }

    if (cleanUnusedButton) {
      if (!confirm("清理 data/portraits 中未被任何状态引用的旧图片？")) return;
      const result = await window.tablePet.cleanupUnusedPortraits?.();
      notifySuccess(`已清理 ${result?.removedCount || 0} 个未使用图片，保留 ${result?.keptCount || 0} 个。`);
      return;
    }

    if (bulkClearButton) {
      const type = bulkClearButton.dataset.portraitBulkClear;
      if (!confirm(`确定清空${type === "mood" ? "心情" : "互动"}图片吗？`)) return;
      const keys = type === "mood"
        ? (settingsSnapshot?.moodOptions || []).map((item) => item.key)
        : interactionSlots.map((item) => item.key);
      const emptyPaths = Object.fromEntries(keys.map((key) => [key, ""]));
      await savePortraitPaths(type === "mood" ? { moodPortraitPaths: emptyPaths } : { interactionPortraitPaths: emptyPaths });
      notifySuccess("本组图片已清空");
      return;
    }

    if (resetMoodButton) {
      const result = await window.tablePet.resetMoodPortrait?.(resetMoodButton.dataset.resetMood);
      if (result?.settings) {
        settingsSnapshot = result.settings;
        renderPortraitPickers(result.settings);
      } else {
        await savePortraitPaths({ moodPortraitPaths: { [resetMoodButton.dataset.resetMood]: "" } });
      }
      notifySuccess("图片已清除");
      return;
    }

    if (resetInteractionButton) {
      const result = await window.tablePet.resetInteractionPortrait?.(resetInteractionButton.dataset.resetInteraction);
      if (result?.settings) {
        settingsSnapshot = result.settings;
        renderPortraitPickers(result.settings);
      } else {
        await savePortraitPaths({ interactionPortraitPaths: { [resetInteractionButton.dataset.resetInteraction]: "" } });
      }
      notifySuccess("图片已清除");
      return;
    }

    if (!moodButton && !interactionButton) return;

    const result = moodButton
      ? await window.tablePet.importMoodPortrait(moodButton.dataset.moodKey)
      : await window.tablePet.importInteractionPortrait(interactionButton.dataset.interactionKey);

    if (result?.error) {
      notifyError(`导入失败：${result.error}`);
      return;
    }

    if (result?.warnings?.length) {
      notifyWarning(`图片已导入，但有建议：${result.warnings.join("；")}`);
    } else if (result?.settings) {
      notifySuccess("图片已导入");
    }

    if (result?.settings) {
      settingsSnapshot = result.settings;
      renderPortraitPickers(result.settings);
    }
  }

  function handleDockState(event) {
    const dockState = event.detail || {};
    if (dockState.bottom) {
      setStateSource("dock", "bottom", { priority: STATE_PRIORITY.bottom, duration: 5200 });
      showLocalReply("[Emotion: Neutral]\n我先坐在任务栏附近，别再把聊天框拖出屏幕。", { open: false });
      return;
    }

    if (dockState.edge && dockState.edge !== "none") {
      setStateSource("dock", "edge", { priority: STATE_PRIORITY.edge, duration: 4600 });
      showLocalReply(EDGE_LINES[dockState.edge] || EDGE_LINES.none, { open: false });
      return;
    }

    clearStateSource("dock");
  }

  function setupPortraitStabilityGuard() {
    if (!portraitImage) return;
    let restoring = false;
    let repairTimer = null;
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains("settings-open")) return;
      if (restoring) return;
      try {
        restoring = true;
        if (lastRenderedSrc && !portraitImage.getAttribute("src")) {
          portraitImage.setAttribute("src", lastRenderedSrc);
        }
        if (!portrait.classList.contains(`interaction-${activeState}`) && !repairTimer && !portrait.classList.contains("pet-visual-dirty") && activeState !== "idle" && activeState !== "chat") {
          lastRenderedState = "";
          repairTimer = window.setTimeout(() => {
            repairTimer = null;
            renderState();
          }, 0);
        }
      } finally {
        restoring = false;
      }
    });
    observer.observe(portraitImage, { attributes: true, attributeFilter: ["src"] });
    observer.observe(portrait, { attributes: true, attributeFilter: ["class"] });
  }

  function setupRuntimeHooks() {
    if (window.tablePet.__interactionHooksInstalled) return;
    window.tablePet.__interactionHooksInstalled = true;

    const originalSendChat = window.tablePet.sendChat?.bind(window.tablePet);
    if (originalSendChat) {
      window.tablePet.sendChat = async (...args) => {
        markUserInteraction();
        setStateSource("runtime", "thinking", { priority: STATE_PRIORITY.thinking });
        try {
          return await originalSendChat(...args);
        } finally {
          clearStateSource("runtime");
        }
      };
    }

    const originalSpeak = window.tablePet.speak?.bind(window.tablePet);
    if (originalSpeak) {
      window.tablePet.speak = async (...args) => {
        setStateSource("voice", "speaking", { priority: STATE_PRIORITY.speaking });
        try {
          return await originalSpeak(...args);
        } finally {
          window.setTimeout(() => clearStateSource("voice"), 900);
        }
      };
    }
  }

  function setupVoiceObserver() {
    if (!voiceStatusText) return;
    const updateFromVoiceText = () => {
      const text = voiceStatusText.textContent || "";
      if (/播放中|生成|推理|发送|加载|接收/.test(text)) {
        setStateSource("voiceText", /播放中/.test(text) ? "speaking" : "thinking", {
          priority: /播放中/.test(text) ? STATE_PRIORITY.speaking : STATE_PRIORITY.thinking,
          duration: 1800
        });
      }
    };
    new MutationObserver(updateFromVoiceText).observe(voiceStatusText, { childList: true, characterData: true, subtree: true });
  }

  function setupSettingsTabs() {
    if (!settingsForm || settingsTabsReady) return;
    settingsTabsReady = true;
    const sections = [...settingsForm.querySelectorAll(":scope > .settings-section, :scope > details.settings-section")];
    if (!sections.length) return;

    const tabs = document.createElement("div");
    tabs.className = "settings-tabs";
    const labels = sections.map((section, index) => {
      const divider = section.querySelector(":scope > .settings-divider")?.textContent;
      const summary = section.querySelector(":scope > summary")?.textContent;
      return (divider || summary || `设置 ${index + 1}`).trim();
    });

    tabs.innerHTML = labels
      .map((label, index) => `<button type="button" data-settings-tab="${index}" ${index === 0 ? "class=\"active\"" : ""}>${escapeHtml(label)}</button>`)
      .join("");
    settingsForm.querySelector(".settings-head")?.after(tabs);

    function activate(index) {
      sections.forEach((section, sectionIndex) => {
        section.classList.toggle("settings-tab-hidden", sectionIndex !== index);
        if (section.tagName.toLowerCase() === "details") section.open = sectionIndex === index;
      });
      tabs.querySelectorAll("button").forEach((button, buttonIndex) => {
        button.classList.toggle("active", buttonIndex === index);
      });
    }

    tabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-settings-tab]");
      if (!button) return;
      activate(Number(button.dataset.settingsTab));
    });
    activate(0);
  }

  function setupIdleBehavior() {
    window.setInterval(() => {
      if (settingsDialog?.open || document.body.classList.contains("chat-visible")) return;
      if (stateSources.has("runtime") || stateSources.has("voice") || stateSources.has("drag")) return;
      const now = Date.now();
      const idleMs = now - lastUserInteractionAt;
      if (idleMs > 15 * 60 * 1000) {
        setStateSource("idleAuto", "sleep", { priority: STATE_PRIORITY.sleep, duration: 90 * 1000 });
        return;
      }
      if (idleMs > 5 * 60 * 1000 && now - idleReminderAt > 10 * 60 * 1000) {
        idleReminderAt = now;
        setStateSource("idleAuto", "thinking", { priority: STATE_PRIORITY.thinking, duration: 3600 });
        showLocalReply(randomItem(IDLE_LINES), { open: true });
      }
    }, 30 * 1000);
  }

  function debugRows() {
    return [
      ["状态", activeState],
      ["来源", activeSource],
      ["聊天", document.body.classList.contains("chat-visible") ? "打开" : "收起"],
      ["心情", currentMoodKey()],
      ["当前图", portraitImage?.getAttribute("src") || "默认/未设置"],
      ["语音", voiceStatusText?.textContent || "无"],
      ["空闲", `${Math.round((Date.now() - lastUserInteractionAt) / 1000)}s`]
    ];
  }

  function renderDebugPanel() {
    if (!debugPanel || debugPanel.hidden) return;
    debugPanel.querySelector(".debug-content").innerHTML = debugRows()
      .map(([key, value]) => `<div><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`)
      .join("");
  }

  function toggleDebugPanel() {
    if (!debugPanel) {
      debugPanel = document.createElement("aside");
      debugPanel.className = "pet-debug-panel";
      debugPanel.innerHTML = `
        <div class="debug-head">
          <strong>桌宠调试</strong>
          <button type="button" data-debug-close>×</button>
        </div>
        <div class="debug-content"></div>
      `;
      document.body.append(debugPanel);
      debugPanel.addEventListener("click", (event) => {
        if (event.target.closest("button[data-debug-close]")) {
          debugPanel.hidden = true;
          document.body.classList.remove("pet-debug-open");
        }
      });
    }
    debugPanel.hidden = !debugPanel.hidden;
    document.body.classList.toggle("pet-debug-open", !debugPanel.hidden);
    renderDebugPanel();
  }

  portrait.addEventListener("click", handlePortraitClick, true);
  portrait.addEventListener("dblclick", handlePortraitDoubleClick, true);
  portrait.addEventListener("contextmenu", showContextMenu, true);
  petContextMenu?.addEventListener("click", (event) => {
    handleContextAction(event).catch((error) => notifyError(`快捷菜单操作失败：${error.message || error}`));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!petContextMenu || petContextMenu.hidden) return;
    if (!event.target.closest("#petContextMenu")) hideContextMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideContextMenu();
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".portrait")) return;
    markUserInteraction();
  }, true);
  document.addEventListener("keydown", markUserInteraction, true);
  sendButton?.addEventListener("click", () => setStateSource("runtime", "thinking", { priority: STATE_PRIORITY.thinking, duration: 4500 }), true);

  window.addEventListener("tablepet:interaction", (event) => {
    const detail = event.detail || {};
    if (detail.state === "drag") {
      setStateSource("drag", "drag", { priority: STATE_PRIORITY.drag });
    } else {
      setTemporaryState(detail.state, Number(detail.duration || 0));
    }
  });
  window.addEventListener("tablepet:dockState", (event) => {
    clearStateSource("drag");
    handleDockState(event);
  });
  window.addEventListener("tablepet:tts-state", (event) => {
    const stage = event.detail?.stage;
    if (stage === "playing") setStateSource("voice", "speaking", { priority: STATE_PRIORITY.speaking });
    else if (stage === "synthesizing" || stage === "starting") setStateSource("voice", "thinking", { priority: STATE_PRIORITY.thinking });
    else if (stage === "error") setStateSource("voice", "angry", { priority: STATE_PRIORITY.angry, duration: 1800 });
    else clearStateSource("voice");
  });
  window.addEventListener("tablepet:pomodoro-state", (event) => {
    const { mode, status } = event.detail || {};
    if (status === "running" && mode === "focus") setStateSource("pomodoro", "studyFocus", { priority: STATE_PRIORITY.studyFocus });
    else if (status === "running" && mode === "break") setStateSource("pomodoro", "studyBreak", { priority: STATE_PRIORITY.studyBreak });
    else clearStateSource("pomodoro");
  });
  window.tablePet.onChatVisibilityChanged?.((visible) => {
    window.__tablePetLastChatVisible = Boolean(visible);
    if (visible) setStateSource("chat", "chat", { priority: STATE_PRIORITY.chat });
    else clearStateSource("chat");
  });
  settingsButton?.addEventListener("click", () => {
    window.tablePet.setSettingsVisible?.(true).catch(() => undefined);
    hideContextMenu();
    setupSettingsTabs();
    window.setTimeout(() => {
      setupSettingsTabs();
      refreshInteractionSettings();
    }, 80);
  }, true);
  settingsDialog?.addEventListener("close", () => {
    window.tablePet.setSettingsVisible?.(false).catch(() => undefined);
  });
  moodPortraitList?.addEventListener("click", (event) => {
    importPortraitFromButton(event).catch((error) => notifyError(`立绘操作失败：${error.message || error}`));
  });
  interactionPortraitList?.addEventListener("click", (event) => {
    importPortraitFromButton(event).catch((error) => notifyError(`立绘操作失败：${error.message || error}`));
  });

  window.__tablePetLastChatVisible = document.body.classList.contains("chat-visible");
  injectInteractionStyles();
  setupPortraitStabilityGuard();
  setupRuntimeHooks();
  setupVoiceObserver();
  setupIdleBehavior();
  refreshInteractionSettings().then(() => resolveState()).catch(() => resolveState());
})();
