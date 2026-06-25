(() => {
  function notifyError(message) {
    window.tablePetNotify?.error?.(message);
  }

  window.addEventListener("tablepet:tts-state", (event) => {
    if (event.detail?.stage === "error") {
      notifyError(event.detail?.detail || "语音处理失败");
    }
  });
})();
