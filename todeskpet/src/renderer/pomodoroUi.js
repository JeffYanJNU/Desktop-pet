(() => {
  const STORAGE_KEY = "tablePet.pomodoro.v1";
  const DEFAULT_STATE = {
    mode: "focus",
    status: "idle",
    focusMinutes: 25,
    breakMinutes: 5,
    endAt: 0,
    remainingSeconds: 25 * 60,
    completedFocusCount: 0,
    lastCompletedAt: ""
  };

  let state = loadState();
  let panel = null;
  let ticker = null;

  function safeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function clampMinutes(value, fallback) {
    return Math.max(1, Math.min(180, Math.round(safeNumber(value, fallback))));
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return normalizeState({ ...DEFAULT_STATE, ...raw });
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function normalizeState(next) {
    const focusMinutes = clampMinutes(next.focusMinutes, DEFAULT_STATE.focusMinutes);
    const breakMinutes = clampMinutes(next.breakMinutes, DEFAULT_STATE.breakMinutes);
    const mode = next.mode === "break" ? "break" : "focus";
    const status = ["idle", "running", "paused"].includes(next.status) ? next.status : "idle";
    const fallbackSeconds = (mode === "break" ? breakMinutes : focusMinutes) * 60;
    return {
      ...DEFAULT_STATE,
      ...next,
      mode,
      status,
      focusMinutes,
      breakMinutes,
      endAt: Number(next.endAt || 0),
      remainingSeconds: Math.max(0, Math.round(safeNumber(next.remainingSeconds, fallbackSeconds)))
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function stageSeconds(mode = state.mode) {
    return (mode === "break" ? state.breakMinutes : state.focusMinutes) * 60;
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function modeLabel(mode = state.mode) {
    return mode === "break" ? "休息" : "专注";
  }

  function notify(type, message, options) {
    const api = window.tablePetNotify;
    if (api?.[type]) return api[type](message, options);
    return null;
  }

  function dispatchPomodoroState() {
    document.body.dataset.pomodoroMode = state.mode;
    document.body.dataset.pomodoroStatus = state.status;
    window.dispatchEvent(new CustomEvent("tablepet:pomodoro-state", { detail: { ...state } }));
  }

  function setState(patch) {
    state = normalizeState({ ...state, ...patch });
    saveState();
    renderPanel();
    dispatchPomodoroState();
  }

  async function track(eventName, payload = {}) {
    try {
      await window.tablePetAchievements?.track?.(eventName, payload);
    } catch {
      // Achievement tracking must never break the timer.
    }
  }

  function dispatchOutcomeResult(result) {
    if (!result?.ok) return;
    if (typeof window.__tablePetShowPomodoroOutcome === "function") {
      window.__tablePetShowPomodoroOutcome(result);
      return;
    }
    window.dispatchEvent(new CustomEvent("tablepet:pomodoro-outcome", { detail: result }));
  }

  async function reportPomodoroOutcome(outcome, minutes) {
    try {
      const result = await window.tablePet?.handlePomodoroOutcome?.({
        outcome,
        minutes,
        mode: state.mode,
        status: state.status
      });
      dispatchOutcomeResult(result);
    } catch (error) {
      window.tablePetNotify?.capture?.(error, "Pomodoro comment failed");
    }
  }

  function ensureContextMenuEntry() {
    const menu = document.querySelector("#petContextMenu");
    if (!menu || menu.querySelector("[data-pet-action='pomodoro']")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.petAction = "pomodoro";
    button.textContent = "番茄钟";
    const achievementsButton = menu.querySelector("[data-pet-action='achievements']");
    const settingsButton = menu.querySelector("[data-pet-action='settings']");
    menu.insertBefore(button, achievementsButton || settingsButton || null);
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "pomodoroPanel";
    panel.className = "pomodoro-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <form>
        <header class="pomodoro-head">
          <div>
            <h2>番茄钟</h2>
            <p>完成专注后推进番茄钟成就。</p>
          </div>
          <button type="button" class="icon-button" data-pomodoro-action="collapse" aria-label="Collapse">-</button>
        </header>
        <section class="pomodoro-clock" aria-live="polite">
          <span id="pomodoroModeText">专注</span>
          <strong id="pomodoroTimeText">25:00</strong>
          <small id="pomodoroStatusText">未开始</small>
          <div class="pomodoro-progress"><i id="pomodoroProgressBar"></i></div>
        </section>
        <section class="pomodoro-settings">
          <label><span>专注分钟</span><input id="pomodoroFocusInput" type="number" min="1" max="180" value="25" /></label>
          <label><span>休息分钟</span><input id="pomodoroBreakInput" type="number" min="1" max="60" value="5" /></label>
        </section>
        <section class="pomodoro-presets">
          <button type="button" data-pomodoro-preset="25,5">25 / 5</button>
          <button type="button" data-pomodoro-preset="50,10">50 / 10</button>
          <button type="button" data-pomodoro-preset="90,15">90 / 15</button>
        </section>
        <section class="pomodoro-actions">
          <button type="button" data-pomodoro-action="start">开始专注</button>
          <button type="button" data-pomodoro-action="pause">暂停</button>
          <button type="button" data-pomodoro-action="resume">继续</button>
          <button type="button" data-pomodoro-action="skip">跳过本轮</button>
          <button type="button" data-pomodoro-action="stop" class="ghost">停止</button>
        </section>
        <footer class="pomodoro-foot">
          <span id="pomodoroStatsText">已完成 0 个番茄钟</span>
        </footer>
      </form>
    `;
    panel.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
    panel.addEventListener("click", handlePanelClick);
    panel.addEventListener("input", handlePanelInput);
    document.body.append(panel);
    renderPanel();
    return panel;
  }

  function renderPanel() {
    if (!panel) return;
    const now = Date.now();
    const remaining = state.status === "running" ? Math.max(0, Math.ceil((state.endAt - now) / 1000)) : state.remainingSeconds;
    const total = stageSeconds();
    const percent = total ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 0;
    panel.querySelector("#pomodoroModeText").textContent = modeLabel();
    panel.querySelector("#pomodoroTimeText").textContent = formatTime(remaining);
    panel.querySelector("#pomodoroStatusText").textContent = {
      idle: "未开始",
      running: `${modeLabel()}中`,
      paused: "已暂停"
    }[state.status] || "未开始";
    panel.querySelector("#pomodoroProgressBar").style.width = `${percent}%`;
    panel.querySelector("#pomodoroFocusInput").value = state.focusMinutes;
    panel.querySelector("#pomodoroBreakInput").value = state.breakMinutes;
    panel.querySelector("#pomodoroStatsText").textContent = `已完成 ${state.completedFocusCount || 0} 个番茄钟`;
    panel.querySelector("[data-pomodoro-action='start']").disabled = state.status === "running";
    panel.querySelector("[data-pomodoro-action='pause']").disabled = state.status !== "running";
    panel.querySelector("[data-pomodoro-action='resume']").disabled = state.status !== "paused";
    panel.querySelector("[data-pomodoro-action='skip']").disabled = state.status === "idle";
    panel.querySelector("[data-pomodoro-action='stop']").disabled = state.status === "idle";
  }

  function startStage(mode) {
    const seconds = stageSeconds(mode);
    setState({ mode, status: "running", remainingSeconds: seconds, endAt: Date.now() + seconds * 1000 });
    ensureTicker();
    notify("info", mode === "focus" ? "专注开始：我会少打扰你。" : "休息开始：离开屏幕、喝水、活动一下。");
  }

  function startFocus() {
    const focusInput = panel?.querySelector("#pomodoroFocusInput");
    const breakInput = panel?.querySelector("#pomodoroBreakInput");
    state.focusMinutes = clampMinutes(focusInput?.value, state.focusMinutes);
    state.breakMinutes = clampMinutes(breakInput?.value, state.breakMinutes);
    startStage("focus");
  }

  function pauseTimer() {
    if (state.status !== "running") return;
    const remainingSeconds = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
    setState({ status: "paused", remainingSeconds, endAt: 0 });
    notify("warning", "番茄钟已暂停。别暂停太久。");
  }

  function resumeTimer() {
    if (state.status !== "paused") return;
    setState({ status: "running", endAt: Date.now() + state.remainingSeconds * 1000 });
    ensureTicker();
  }

  function stopTimer({ silent = false, interrupted = false } = {}) {
    const shouldReportInterrupted = interrupted && state.mode === "focus" && state.status !== "idle";
    const minutes = state.focusMinutes;
    setState({ status: "idle", mode: "focus", remainingSeconds: state.focusMinutes * 60, endAt: 0 });
    if (!silent) notify("info", "Pomodoro stopped.");
    if (shouldReportInterrupted) reportPomodoroOutcome("interrupted", minutes);
  }

  async function finishStage() {
    if (state.mode === "focus") {
      const minutes = state.focusMinutes;
      const completedFocusCount = Number(state.completedFocusCount || 0) + 1;
      setState({ completedFocusCount, lastCompletedAt: new Date().toISOString() });
      await track("focus_done", { minutes });
      notify("success", `Completed ${minutes} minutes. Break time.`);
      startStage("break");
      reportPomodoroOutcome("completed", minutes);
      return;
    }
    notify("success", "休息结束。准备进入下一轮专注。");
    stopTimer({ silent: true });
  }

  function skipStage() {
    if (state.status === "idle") return;
    if (state.mode === "focus") {
      const minutes = state.focusMinutes;
      setState({ mode: "break", status: "idle", remainingSeconds: state.breakMinutes * 60, endAt: 0 });
      notify("warning", "Focus round skipped.");
      reportPomodoroOutcome("interrupted", minutes);
      return;
    }
    finishStage().catch((error) => window.tablePetNotify?.capture?.(error, "Pomodoro skip failed"));
  }

  function ensureTicker() {
    if (ticker) return;
    ticker = window.setInterval(() => {
      if (state.status !== "running") {
        renderPanel();
        return;
      }
      const remainingSeconds = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
      state.remainingSeconds = remainingSeconds;
      saveState();
      renderPanel();
      dispatchPomodoroState();
      if (remainingSeconds <= 0) {
        finishStage().catch((error) => window.tablePetNotify?.capture?.(error, "番茄钟完成处理失败"));
      }
    }, 1000);
  }

  function handlePanelClick(event) {
    const preset = event.target.closest("button[data-pomodoro-preset]");
    if (preset) {
      const [focus, rest] = preset.dataset.pomodoroPreset.split(",").map(Number);
      setState({ focusMinutes: focus, breakMinutes: rest, remainingSeconds: focus * 60, mode: "focus", status: "idle", endAt: 0 });
      return;
    }

    const actionButton = event.target.closest("button[data-pomodoro-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.pomodoroAction;
    if (action === "collapse") {
      panel.hidden = true;
      return;
    }
    if (action === "start") startFocus();
    if (action === "pause") pauseTimer();
    if (action === "resume") resumeTimer();
    if (action === "skip") skipStage();
    if (action === "stop") stopTimer({ interrupted: true });
  }

  function handlePanelInput(event) {
    if (!event.target.matches("#pomodoroFocusInput, #pomodoroBreakInput")) return;
    if (state.status !== "idle") return;
    const focusMinutes = clampMinutes(panel.querySelector("#pomodoroFocusInput")?.value, state.focusMinutes);
    const breakMinutes = clampMinutes(panel.querySelector("#pomodoroBreakInput")?.value, state.breakMinutes);
    setState({ focusMinutes, breakMinutes, remainingSeconds: focusMinutes * 60 });
  }

  function openPanel() {
    ensurePanel();
    panel.hidden = false;
    panel.classList.remove("is-collapsed");
    renderPanel();
    panel.classList.add("is-attention");
    window.setTimeout(() => panel?.classList.remove("is-attention"), 520);
  }

  function install() {
    ensureContextMenuEntry();
    ensurePanel();
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-pet-action='pomodoro']");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.querySelector("#petContextMenu")?.setAttribute("hidden", "");
      openPanel();
    }, true);

    if (state.status === "running") {
      if (state.endAt <= Date.now()) {
        finishStage().catch(() => undefined);
      } else {
        ensureTicker();
      }
    }
    renderPanel();
    dispatchPomodoroState();
  }

  window.tablePetPomodoro = {
    open: openPanel,
    start: startFocus,
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
    getState: () => ({ ...state })
  };

  window.addEventListener("DOMContentLoaded", install);
  window.addEventListener("beforeunload", () => {
    if (ticker) window.clearInterval(ticker);
  });
})();
