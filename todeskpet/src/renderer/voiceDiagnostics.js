(() => {
  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value || "";
  }

  function compact(value, fallback = "未设置") {
    const text = String(value || "").trim();
    if (!text) return fallback;
    return text.length > 90 ? `${text.slice(0, 40)}...${text.slice(-32)}` : text;
  }

  function stageLabel(stage) {
    return {
      idle: "空闲",
      requesting: "请求中",
      loading_model: "加载模型",
      generating: "推理中",
      encoding: "编码中",
      receiving: "接收音频",
      playing: "播放中",
      error: "失败"
    }[stage] || stage || "未知";
  }

  function formatHealth(health) {
    if (!health) return "未返回";
    if (health.ok) {
      const data = health.data || {};
      return `正常 · ${data.loaded ? "模型已加载" : "模型未加载"}`;
    }
    return `异常${health.status ? ` ${health.status}` : ""} · ${health.error || "无详情"}`;
  }

  function formatError(tts, status) {
    const error = tts?.lastError;
    if (error?.message) {
      const statusText = error.status ? `HTTP ${error.status} · ` : "";
      return `${statusText}${error.message}`;
    }
    if (status?.statusError) return `状态接口异常：${status.statusError}`;
    if (status?.health && !status.health.ok) return `Health 异常：${status.health.error || status.health.status || "无详情"}`;
    return "暂无";
  }

  function renderDiagnostics(status = {}, settings = {}) {
    const tts = status.tts || {};
    const config = status.config || {};
    const provider = config.provider || settings.ttsProvider || "local";
    const url = config.url || settings.sovitsUrl || "";
    const mode = config.mode || settings.qwenTtsMode || "custom";
    const language = config.language || settings.qwenTtsLanguage || "Japanese";
    const modelPath = config.modelPath || settings.qwenTtsModelPath || "";

    setText("voiceDiagServiceText", provider === "siliconflow"
      ? "硅基流动 API"
      : `${status.running ? `运行中 PID ${status.pid}` : "未启动"} · ${compact(url, "无 URL")}`);
    setText("voiceDiagHealthText", provider === "siliconflow" ? "云端 API，不检查本地 health" : formatHealth(status.health));
    setText("voiceDiagConfigText", `${provider} · ${mode} · ${language} · ${compact(modelPath, "无模型路径")}`);
    setText("voiceDiagStageText", `${stageLabel(tts.stage)}${tts.detail ? ` · ${tts.detail}` : ""}`);
    setText("voiceDiagErrorText", formatError(tts, status));

    const raw = {
      service: {
        running: Boolean(status.running),
        pid: status.pid || null,
        url,
        provider
      },
      health: status.health || null,
      statusError: status.statusError || null,
      tts: {
        stage: tts.stage,
        detail: tts.detail,
        elapsedSeconds: tts.elapsedSeconds,
        textChars: tts.textChars,
        lastError: tts.lastError || null,
        lastRequest: tts.lastRequest || null,
        runtime: tts.runtime || null
      }
    };
    setText("voiceDiagRawText", JSON.stringify(raw, null, 2));
  }

  async function refreshDiagnostics() {
    const button = byId("refreshVoiceDiagnosticsButton");
    try {
      if (button) button.disabled = true;
      setText("voiceDiagServiceText", "检查中...");
      const settings = await window.tablePet.getSettings();
      const status = await window.tablePet.getSovitsStatus();
      renderDiagnostics(status, settings);
    } catch (error) {
      setText("voiceDiagServiceText", "检查失败");
      setText("voiceDiagHealthText", "检查失败");
      setText("voiceDiagErrorText", error.message || String(error));
      setText("voiceDiagRawText", String(error.stack || error.message || error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    byId("refreshVoiceDiagnosticsButton")?.addEventListener("click", refreshDiagnostics);
    setTimeout(refreshDiagnostics, 600);
  });

  window.tablePetRefreshVoiceDiagnostics = refreshDiagnostics;
})();
