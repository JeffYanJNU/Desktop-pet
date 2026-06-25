(() => {
  const CONFIG_KEY = "tablePet.pomodoroPortrait.v1";
  const TIMER_KEY = "tablePet.pomodoro.v1";
  const ACTIVE = new Set(["running", "paused"]);
  const MAX_BYTES = 4 * 1024 * 1024;

  let config = readConfig();
  let timer = readTimer();
  let dock;
  let settingsReady = false;

  function readConfig() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
      return { dataUrl: String(raw.dataUrl || ""), fileName: String(raw.fileName || "") };
    } catch {
      return { dataUrl: "", fileName: "" };
    }
  }

  function writeConfig(next) {
    config = { dataUrl: String(next.dataUrl || ""), fileName: String(next.fileName || "") };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    renderSettings();
    updateDock();
  }

  function readTimer() {
    try {
      const raw = JSON.parse(localStorage.getItem(TIMER_KEY) || "{}");
      return {
        mode: raw.mode === "break" ? "break" : "focus",
        status: ["idle", "running", "paused"].includes(raw.status) ? raw.status : "idle"
      };
    } catch {
      return { mode: "focus", status: "idle" };
    }
  }

  function message(type, text) {
    const api = window.tablePetNotify;
    if (api && api[type]) api[type](text);
  }

  function ensureDock() {
    if (dock) return dock;
    dock = document.createElement("aside");
    dock.id = "pomodoroPortraitDock";
    dock.hidden = true;
    dock.innerHTML = '<div class="pomodoro-dedicated-portrait-card"><img alt="番茄钟专属立绘"><span>番茄钟陪伴中</span></div>';
    document.body.appendChild(dock);
    return dock;
  }

  function attachDock() {
    const node = ensureDock();
    const panel = document.querySelector("#pomodoroPanel");
    if (panel) {
      if (node.parentElement !== panel) panel.appendChild(node);
      return;
    }
    if (node.parentElement !== document.body) document.body.appendChild(node);
  }

  function updateDock() {
    const node = ensureDock();
    attachDock();
    const active = ACTIVE.has(timer.status) && Boolean(config.dataUrl);
    node.hidden = !active;
    if (!active) return;
    const img = node.querySelector("img");
    const label = node.querySelector("span");
    if (img) img.src = config.dataUrl;
    if (label) label.textContent = timer.mode === "break" ? "休息陪伴中" : "专注陪伴中";
  }

  function renderSettings() {
    const preview = document.querySelector("#pomodoroPortraitPreview");
    const name = document.querySelector("#pomodoroPortraitFileName");
    if (preview) {
      preview.innerHTML = config.dataUrl ? `<img alt="当前番茄钟立绘" src="${config.dataUrl}">` : "<span>未设置<br>点击选择</span>";
    }
    if (name) name.textContent = config.fileName || "未设置专属立绘";
  }

  function readImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message("error", "请选择图片文件。");
      return;
    }
    if (file.size > MAX_BYTES) {
      message("error", "图片太大，建议使用 4MB 以下图片。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      writeConfig({ dataUrl: String(reader.result || ""), fileName: file.name });
      message("success", "番茄钟专属立绘已设置。");
    };
    reader.readAsDataURL(file);
  }

  function ensureSettings() {
    if (settingsReady) {
      renderSettings();
      return;
    }
    const panel = document.querySelector(".portrait-settings-panel");
    if (!panel) return;
    settingsReady = true;

    const block = document.createElement("div");
    block.className = "pomodoro-portrait-config";
    block.innerHTML = '<div class="portrait-picker-head pomodoro-portrait-head"><strong>番茄钟专属立绘</strong><span>计时启动后显示在番茄钟右侧</span></div><div class="pomodoro-portrait-settings"><button id="pomodoroPortraitPreview" class="pomodoro-portrait-preview" type="button"></button><div class="pomodoro-portrait-controls"><strong>专注陪伴立绘</strong><small id="pomodoroPortraitFileName"></small><div class="pomodoro-portrait-buttons"><button id="selectPomodoroPortraitButton" type="button">选择图片</button><button id="clearPomodoroPortraitButton" class="ghost" type="button">清除</button></div></div></div>';
    panel.appendChild(block);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.hidden = true;
    block.appendChild(input);

    const choose = () => input.click();
    block.querySelector("#pomodoroPortraitPreview")?.addEventListener("click", choose);
    block.querySelector("#selectPomodoroPortraitButton")?.addEventListener("click", choose);
    block.querySelector("#clearPomodoroPortraitButton")?.addEventListener("click", () => writeConfig({ dataUrl: "", fileName: "" }));
    input.addEventListener("change", () => {
      readImageFile(input.files && input.files[0]);
      input.value = "";
    });
    renderSettings();
  }

  function restoreMainPortrait() {
    const img = document.getElementById("customPortraitImage");
    if (!img || img.getAttribute("src")) return;
    img.src = "../../data/portraits/Neutral-1779283203880.png";
  }

  function init() {
    restoreMainPortrait();
    window.setTimeout(restoreMainPortrait, 0);
    window.setTimeout(restoreMainPortrait, 300);
    window.setTimeout(restoreMainPortrait, 1000);
    ensureDock();
    ensureSettings();
    updateDock();
    new MutationObserver(() => {
      restoreMainPortrait();
      attachDock();
      ensureSettings();
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("tablepet:pomodoro-state", (event) => {
      timer = { ...timer, ...(event.detail || {}) };
      updateDock();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
