(() => {
  let timer = null;
  let busy = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function visibleReplyText(text) {
    return String(text || "")
      .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
      .trim();
  }

  function renderProactive(text) {
    const replyText = byId("replyText");
    if (!replyText) return;
    replyText.textContent = visibleReplyText(text);
    document.body.classList.add("proactive-pulse");
    window.setTimeout(() => document.body.classList.remove("proactive-pulse"), 1800);
  }

  async function tick() {
    if (busy || !window.tablePet?.checkProactive) return;
    busy = true;
    try {
      const result = await window.tablePet.checkProactive();
      if (!result?.ok || !result.text) return;
      renderProactive(result.text);
      if (result.speak && window.tablePet?.speak) {
        await window.tablePet.speak(result.text);
      }
    } catch {
      // Proactive reminders should never interrupt normal chat.
    } finally {
      busy = false;
    }
  }

  async function scheduleNext() {
    window.clearInterval(timer);
    let minutes = 5;
    try {
      const settings = await window.tablePet.getSettings();
      minutes = Math.min(60, Math.max(1, Number(settings.proactiveIntervalMinutes || 5)));
    } catch {
      minutes = 5;
    }
    timer = window.setInterval(tick, minutes * 60 * 1000);
  }

  window.addEventListener("tablepet-settings-updated", scheduleNext);
  scheduleNext();
  window.setTimeout(tick, 5000);
})();
