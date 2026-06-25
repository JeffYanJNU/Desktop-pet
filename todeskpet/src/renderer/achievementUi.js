(() => {
  const TIER_ORDER = ["普通", "熟悉", "亲密", "专属", "长期陪伴"];
  let latestSnapshot = null;
  let panel = null;
  let installed = false;
  let onlineTimer = null;

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function notifyUnlocks(items = []) {
    for (const item of items) {
      const reward = item.reward?.intimacy ? ` · 亲密 +${item.reward.intimacy}` : "";
      window.tablePetNotify?.success?.(`成就解锁：${item.title}${reward}`, item.description);
    }
  }

  async function refreshAchievements({ notify = false } = {}) {
    if (!window.tablePet?.getAchievements) return null;
    const snapshot = await window.tablePet.getAchievements();
    latestSnapshot = snapshot;
    if (notify) notifyUnlocks(snapshot?.newlyUnlocked || []);
    renderPanel();
    return snapshot;
  }

  async function trackAchievement(eventName, payload = {}) {
    if (!window.tablePet?.trackAchievement) return null;
    const snapshot = await window.tablePet.trackAchievement(eventName, payload);
    latestSnapshot = snapshot;
    notifyUnlocks(snapshot?.newlyUnlocked || []);
    renderPanel();
    return snapshot;
  }

  function groupedAchievements(snapshot) {
    const groups = new Map(TIER_ORDER.map((tier) => [tier, []]));
    for (const item of snapshot?.achievements || []) {
      if (!groups.has(item.tier)) groups.set(item.tier, []);
      groups.get(item.tier).push(item);
    }
    return groups;
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("dialog");
    panel.id = "achievementPanel";
    panel.className = "achievement-panel";
    panel.innerHTML = `
      <form method="dialog">
        <header class="achievement-head">
          <div>
            <h2>成就</h2>
            <p id="achievementSummary">正在加载...</p>
          </div>
          <button class="icon-button" type="submit" aria-label="关闭">×</button>
        </header>
        <div class="achievement-toolbar">
          <button type="button" data-achievement-filter="all" class="active">全部</button>
          <button type="button" data-achievement-filter="locked">未解锁</button>
          <button type="button" data-achievement-filter="unlocked">已解锁</button>
          <button type="button" data-achievement-reset>重置</button>
        </div>
        <div id="achievementList" class="achievement-list"></div>
      </form>
    `;
    panel.addEventListener("click", async (event) => {
      const filterButton = event.target.closest("button[data-achievement-filter]");
      if (filterButton) {
        panel.dataset.filter = filterButton.dataset.achievementFilter;
        panel.querySelectorAll("button[data-achievement-filter]").forEach((button) => button.classList.toggle("active", button === filterButton));
        renderPanel();
        return;
      }
      if (event.target.closest("button[data-achievement-reset]")) {
        if (!confirm("确定重置全部成就进度吗？")) return;
        latestSnapshot = await window.tablePet.resetAchievements();
        window.tablePetNotify?.warning?.("成就已重置");
        renderPanel();
      }
    });
    document.body.append(panel);
    return panel;
  }

  function renderPanel() {
    if (!panel || !latestSnapshot) return;
    const summary = panel.querySelector("#achievementSummary");
    const list = panel.querySelector("#achievementList");
    const filter = panel.dataset.filter || "all";
    const total = latestSnapshot.total || latestSnapshot.achievements?.length || 0;
    const unlockedCount = latestSnapshot.unlockedCount || 0;
    summary.textContent = `${unlockedCount} / ${total} 已解锁`;

    const groups = groupedAchievements(latestSnapshot);
    list.innerHTML = [...groups.entries()]
      .map(([tier, items]) => {
        const visible = items.filter((item) => {
          if (filter === "locked") return !item.unlocked;
          if (filter === "unlocked") return item.unlocked;
          return true;
        });
        if (!visible.length) return "";
        return `
          <section class="achievement-tier">
            <h3>${escapeHtml(tier)}</h3>
            ${visible.map((item) => {
              const percent = Math.max(0, Math.min(100, Number(item.percent || 0)));
              const progress = `${item.progress || 0}/${item.target}`;
              return `
                <article class="achievement-card ${item.unlocked ? "unlocked" : "locked"}">
                  <div class="achievement-badge">${item.unlocked ? "✓" : "◇"}</div>
                  <div class="achievement-body">
                    <div class="achievement-title-row">
                      <strong>${escapeHtml(item.title)}</strong>
                      <span>${escapeHtml(progress)}</span>
                    </div>
                    <p>${escapeHtml(item.description)}</p>
                    <div class="achievement-progress"><i style="width:${percent}%"></i></div>
                    <small>${item.reward?.intimacy ? `奖励：亲密 +${item.reward.intimacy}` : "奖励：特殊反馈"}</small>
                  </div>
                </article>
              `;
            }).join("")}
          </section>
        `;
      })
      .join("");
  }

  async function openAchievementPanel() {
    ensurePanel();
    await refreshAchievements();
    panel.showModal();
  }

  function addContextMenuEntry() {
    const menu = document.querySelector("#petContextMenu");
    if (!menu || menu.querySelector("[data-pet-action='achievements']")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.petAction = "achievements";
    button.textContent = "成就";
    const settingsButton = menu.querySelector("[data-pet-action='settings']");
    menu.insertBefore(button, settingsButton || null);
  }

  function countPortraitSlots(settings) {
    const mood = Object.values(settings?.moodPortraitUrls || {}).filter(Boolean).length;
    const interaction = Object.values(settings?.interactionPortraitUrls || {}).filter(Boolean).length;
    return mood + interaction;
  }

  function installEventHooks() {
    if (installed) return;
    installed = true;
    addContextMenuEntry();

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-pet-action='achievements']")) {
        event.preventDefault();
        openAchievementPanel().catch((error) => window.tablePetNotify?.capture?.(error, "打开成就失败"));
        return;
      }
      if (event.target.closest("#portrait")) {
        trackAchievement("click").catch(() => undefined);
      }
      if (event.target.closest("#replayVoiceButton")) {
        trackAchievement("tts_replay").catch(() => undefined);
      }
    }, true);

    document.addEventListener("contextmenu", (event) => {
      if (event.target.closest("#portrait")) trackAchievement("context_menu").catch(() => undefined);
    }, true);

    window.addEventListener("tablepet:interaction", (event) => {
      const state = event.detail?.state;
      const map = { touch: "touch", angry: "angry", drag: "drag" };
      if (map[state]) trackAchievement(map[state]).catch(() => undefined);
    });

    window.addEventListener("tablepet:tts-state", (event) => {
      if (event.detail?.stage === "playing") trackAchievement("tts_play").catch(() => undefined);
    });

    window.addEventListener("tablepet:settings-opened", () => {
      trackAchievement("open_chat").catch(() => undefined);
    });

    const originalSendChat = window.tablePet.sendChat?.bind(window.tablePet);
    if (originalSendChat && !window.tablePet.__achievementSendChatWrapped) {
      window.tablePet.__achievementSendChatWrapped = true;
      window.tablePet.sendChat = async (...args) => {
        const result = await originalSendChat(...args);
        if (result?.achievementResult?.newlyUnlocked?.length) notifyUnlocks(result.achievementResult.newlyUnlocked);
        return result;
      };
    }

    const originalMoodImport = window.tablePet.importMoodPortrait?.bind(window.tablePet);
    if (originalMoodImport && !window.tablePet.__achievementMoodImportWrapped) {
      window.tablePet.__achievementMoodImportWrapped = true;
      window.tablePet.importMoodPortrait = async (...args) => {
        const result = await originalMoodImport(...args);
        if (result?.ok && result?.settings) {
          await trackAchievement("portrait_import", {
            kind: "mood",
            hasAlpha: result.meta?.hasAlpha,
            slotsSet: countPortraitSlots(result.settings)
          });
        }
        return result;
      };
    }

    const originalInteractionImport = window.tablePet.importInteractionPortrait?.bind(window.tablePet);
    if (originalInteractionImport && !window.tablePet.__achievementInteractionImportWrapped) {
      window.tablePet.__achievementInteractionImportWrapped = true;
      window.tablePet.importInteractionPortrait = async (...args) => {
        const result = await originalInteractionImport(...args);
        if (result?.ok && result?.settings) {
          await trackAchievement("portrait_import", {
            kind: "interaction",
            hasAlpha: result.meta?.hasAlpha,
            slotsSet: countPortraitSlots(result.settings)
          });
        }
        return result;
      };
    }

    const originalCleanup = window.tablePet.cleanupUnusedPortraits?.bind(window.tablePet);
    if (originalCleanup && !window.tablePet.__achievementCleanupWrapped) {
      window.tablePet.__achievementCleanupWrapped = true;
      window.tablePet.cleanupUnusedPortraits = async (...args) => {
        const result = await originalCleanup(...args);
        if (result?.ok) await trackAchievement("portrait_cleanup", { removedCount: result.removedCount || 0 });
        return result;
      };
    }

    window.addEventListener("click", (event) => {
      if (event.target.closest("button[data-preview-url]")) trackAchievement("portrait_preview").catch(() => undefined);
    }, true);

    onlineTimer = window.setInterval(() => {
      trackAchievement("online_minutes", { minutes: 1 }).catch(() => undefined);
    }, 60 * 1000);
  }

  window.tablePetAchievements = {
    open: openAchievementPanel,
    refresh: refreshAchievements,
    track: trackAchievement
  };

  window.addEventListener("DOMContentLoaded", () => {
    installEventHooks();
    refreshAchievements({ notify: true }).catch(() => undefined);
  });

  window.addEventListener("beforeunload", () => {
    if (onlineTimer) window.clearInterval(onlineTimer);
  });
})();
