(() => {
  function noop() {}

  async function safeCall(fn) {
    if (typeof fn !== "function") return undefined;
    return fn();
  }

  function notifyError(message) {
    window.tablePetNotify?.error?.(message);
  }

  function isChatVisible() {
    return document.body.classList.contains("chat-visible") && !document.body.classList.contains("chat-collapsed");
  }

  function setBodyLocked(locked) {
    document.body.classList.toggle("settings-open", locked);
    document.documentElement.classList.toggle("settings-open", locked);
    document.body.style.overflow = locked ? "hidden" : "";
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }

  function hideFloatingUi() {
    document.querySelector("#petContextMenu")?.setAttribute("hidden", "");
    window.dispatchEvent(new CustomEvent("tablepet:settings-lock"));
  }

  function createSettingsDialogController({
    settingsButton,
    closeSettingsButton,
    settingsDialog,
    loadSettings = noop,
    loadMemory = noop
  }) {
    if (!settingsButton || !settingsDialog || settingsButton.dataset.settingsController === "ready") return null;
    settingsButton.dataset.settingsController = "ready";

    let opening = false;
    let previousChatVisible = false;

    async function openSettings() {
      if (opening || settingsDialog.open) return;
      opening = true;
      previousChatVisible = isChatVisible();
      setBodyLocked(true);
      hideFloatingUi();
      try {
        await window.tablePet?.setSettingsVisible?.(true);
        await safeCall(loadSettings);
        await safeCall(loadMemory);
        settingsDialog.showModal();
        window.dispatchEvent(new CustomEvent("tablepet:settings-opened", {
          detail: { previousChatVisible }
        }));
      } catch (error) {
        setBodyLocked(false);
        window.tablePet?.setSettingsVisible?.(false).catch(() => undefined);
        throw error;
      } finally {
        opening = false;
      }
    }

    function closeSettings() {
      if (settingsDialog.open) settingsDialog.close();
    }

    settingsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSettings().catch((error) => {
        window.tablePetNotify?.capture?.(error, "打开设置失败") || notifyError(`打开设置失败：${error.message || error}`);
      });
    }, true);

    closeSettingsButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSettings();
    }, true);

    settingsDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSettings();
    });

    settingsDialog.addEventListener("close", () => {
      setBodyLocked(false);
      hideFloatingUi();
      window.tablePet?.setSettingsVisible?.(false)
        .then(() => window.tablePet?.setChatVisible?.(previousChatVisible))
        .catch((error) => notifyError(`恢复窗口状态失败：${error.message || error}`));
      window.dispatchEvent(new CustomEvent("tablepet:settings-closed", {
        detail: { restoredChatVisible: previousChatVisible }
      }));
    });

    return { openSettings, closeSettings };
  }

  window.createSettingsDialogController = createSettingsDialogController;

  function init() {
    createSettingsDialogController({
      settingsButton: document.querySelector("#settingsButton"),
      closeSettingsButton: document.querySelector("#closeSettingsButton"),
      settingsDialog: document.querySelector("#settingsDialog"),
      loadSettings: window.loadSettings,
      loadMemory: window.loadMemory
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
