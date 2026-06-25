(() => {
  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const element = byId(id);
    if (element) element.textContent = text;
  }

  function setReply(text) {
    const replyText = byId("replyText");
    if (!replyText) return;
    replyText.textContent = String(text || "").replace(/^\[Emotion:\s*\w+\]\s*/i, "").trim();
  }

  function setEmotionLabel(text) {
    setText("emotionLabel", text);
  }

  function fallbackRenderMemory(snapshot) {
    const stats = byId("memoryStatsText");
    const list = byId("memoryList");
    if (stats) {
      const extra = snapshot?.organized
        ? ` / LLM ${snapshot.organized.beforeTotal || 0}→${snapshot.organized.afterTotal || 0}`
        : "";
      stats.textContent = `画像 ${snapshot?.profileCount || 0} / 摘要 ${snapshot?.summaryCount || 0} / 对话 ${snapshot?.memoryCount || 0} / 向量 ${snapshot?.vectorCount || 0}${extra}`;
    }
    if (list && !snapshot?.items?.length) {
      list.innerHTML = '<p class="memory-empty">没有匹配的记忆</p>';
    }
  }

  function renderSnapshot(snapshot) {
    if (typeof window.renderMemory === "function") {
      window.renderMemory(snapshot);
    } else {
      fallbackRenderMemory(snapshot);
    }

    if (snapshot?.organized) {
      const stats = byId("memoryStatsText");
      if (stats) {
        const info = snapshot.organized;
        stats.textContent += ` / LLM整理 ${info.beforeTotal || 0}→${info.afterTotal || 0}`;
      }
    }
  }

  async function organizeMemory() {
    if (!window.tablePet?.organizeMemory) {
      setReply("[Emotion: Confused]\n当前版本还没有暴露 LLM 整理记忆接口。请重启桌宠后再试。");
      return;
    }

    if (!confirm("确定让 LLM 整理长期记忆吗？它会过滤低价值内容并重写记忆库。建议先导出备份，重要记忆请先固定。")) {
      return;
    }

    const button = byId("organizeMemoryButton");
    const previousText = button?.textContent || "LLM 整理";
    if (button) {
      button.disabled = true;
      button.textContent = "整理中...";
    }

    setText("voiceStatusText", "整理记忆中");
    setReply("[Emotion: Thinking]\n正在让 LLM 过滤、合并和整理长期记忆。这个过程可能需要几十秒。");
    setEmotionLabel("整理记忆");

    try {
      const snapshot = await window.tablePet.organizeMemory();
      renderSnapshot(snapshot);
      const info = snapshot?.organized || {};
      const before = Number(info.beforeTotal || 0);
      const after = Number(info.afterTotal || 0);
      const removed = Number(info.removed || 0);
      const summary = info.summary ? `\n${info.summary}` : "";
      setReply(`[Emotion: Happy]\n记忆整理完成：${before} → ${after}，过滤 ${removed} 条。${summary}`);
      setEmotionLabel("整理完成");
      setText("voiceStatusText", "语音空闲");
    } catch (error) {
      setReply(`[Emotion: Confused]\n记忆整理失败：${error.message || String(error)}`);
      setEmotionLabel("整理失败");
      setText("voiceStatusText", "整理失败");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previousText;
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    byId("organizeMemoryButton")?.addEventListener("click", organizeMemory);
  });
})();
