(() => {
  const STAGES = new Set(["idle", "starting", "ready", "synthesizing", "playing", "error", "stopped"]);
  let current = {
    stage: "idle",
    detail: "语音空闲",
    updatedAt: Date.now(),
    source: "init"
  };

  function normalizeStage(stage) {
    return STAGES.has(stage) ? stage : "idle";
  }

  function setTtsState(stage, detail = "", extra = {}) {
    current = {
      ...current,
      ...extra,
      stage: normalizeStage(stage),
      detail: detail || extra.detail || current.detail || "",
      updatedAt: Date.now()
    };
    window.dispatchEvent(new CustomEvent("tablepet:tts-state", { detail: current }));
    return current;
  }

  function getTtsState() {
    return { ...current };
  }

  function stageFromText(text) {
    const value = String(text || "");
    if (/失败|错误|error/i.test(value)) return "error";
    if (/播放中/.test(value)) return "playing";
    if (/发送|加载|推理|生成|编码|接收|处理中/.test(value)) return "synthesizing";
    if (/运行中|ready|API/i.test(value)) return "ready";
    if (/停止|stopped/.test(value)) return "stopped";
    return "idle";
  }

  function observeVoiceStatusText() {
    const target = document.querySelector("#voiceStatusText");
    if (!target) return;
    const sync = () => setTtsState(stageFromText(target.textContent), target.textContent || "语音空闲", { source: "voiceStatusText" });
    new MutationObserver(sync).observe(target, { childList: true, characterData: true, subtree: true });
    sync();
  }

  window.tablePetTtsState = {
    set: setTtsState,
    get: getTtsState,
    observeVoiceStatusText,
    stageFromText
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", observeVoiceStatusText, { once: true });
  } else {
    observeVoiceStatusText();
  }
})();
