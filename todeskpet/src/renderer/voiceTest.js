(() => {
  const sampleTextByLanguage = {
    Chinese: "你好，这是一次语音测试。",
    English: "Hello, this is a voice test.",
    Japanese: "こんにちは、音声テストです。",
    Korean: "안녕하세요, 음성 테스트입니다.",
    German: "Hallo, dies ist ein Sprachtest.",
    French: "Bonjour, ceci est un test vocal.",
    Russian: "Привет, это тест голоса.",
    Italian: "Ciao, questo è un test vocale.",
    Portuguese: "Olá, este é um teste de voz.",
    Spanish: "Hola, esta es una prueba de voz.",
    beijing_dialect: "您好嘞，这是一次语音测试。",
    sichuan_dialect: "你好噻，这是一次语音测试。"
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function valueOf(id, fallback = "") {
    const element = byId(id);
    return element && "value" in element ? element.value : fallback;
  }

  function checkedOf(id, fallback = false) {
    const element = byId(id);
    return element && "checked" in element ? element.checked : fallback;
  }

  function setText(id, text) {
    const element = byId(id);
    if (element) element.textContent = text;
  }

  function setReply(text) {
    const replyText = byId("replyText");
    if (!replyText) return;
    replyText.textContent = text.replace(/^\[Emotion:\s*\w+\]\s*/i, "").trim();
  }

  function setEmotionLabel(text) {
    setText("emotionLabel", text);
  }

  function collectVoiceSettings(currentSettings = {}) {
    return {
      ...currentSettings,
      provider: valueOf("providerSelect", currentSettings.provider || "deepseek"),
      model: valueOf("modelInput", currentSettings.model || ""),
      activeCharacterId: valueOf("characterSelect", currentSettings.activeCharacterId || "arcueid"),
      ttsProvider: valueOf("ttsProviderSelect", currentSettings.ttsProvider || "local"),
      sovitsPython: valueOf("sovitsPythonInput", currentSettings.sovitsPython || "python"),
      sovitsApiScript: valueOf("sovitsApiScriptInput", currentSettings.sovitsApiScript || "scripts\\qwen_tts_api.py"),
      sovitsUrl: valueOf("sovitsUrlInput", currentSettings.sovitsUrl || "http://127.0.0.1:8765/tts"),
      sovitsPromptText: valueOf("sovitsPromptTextInput", currentSettings.sovitsPromptText || ""),
      qwenTtsMode: valueOf("qwenTtsModeSelect", currentSettings.qwenTtsMode || "custom"),
      qwenTtsModelPath: valueOf("qwenTtsModelPathInput", currentSettings.qwenTtsModelPath || ""),
      qwenTtsSpeaker: valueOf("qwenTtsSpeakerInput", currentSettings.qwenTtsSpeaker || "my_voice"),
      qwenTtsLanguage: valueOf("qwenTtsLanguageInput", currentSettings.qwenTtsLanguage || "Japanese"),
      qwenTtsCloneZeroShot: checkedOf("qwenTtsCloneZeroShotInput", currentSettings.qwenTtsCloneZeroShot !== false),
      qwenTtsMaxNewTokens: valueOf("qwenTtsMaxTokensInput", currentSettings.qwenTtsMaxNewTokens || "128"),
      systemPrompt: valueOf("promptInput", currentSettings.systemPrompt || ""),
      voiceEnabled: checkedOf("voiceEnabledInput", currentSettings.voiceEnabled !== false),
      autoLaunch: checkedOf("autoLaunchInput", currentSettings.autoLaunch === true),
      petScale: valueOf("petScaleInput", currentSettings.petScale || "1")
    };
  }

  async function playAudioBase64(result) {
    if (!result?.ok || !result.audioBase64) {
      throw new Error(result?.error || result?.reason || result?.rawError || "TTS 没有返回音频");
    }

    const audio = new Audio(`data:${result.mimeType || "audio/wav"};base64,${result.audioBase64}`);
    setText("voiceStatusText", "播放测试语音");
    await audio.play();
    audio.addEventListener("ended", () => setText("voiceStatusText", "语音空闲"), { once: true });
  }

  async function testVoice() {
    const button = byId("testVoiceButton");

    try {
      if (button) button.disabled = true;
      const currentSettings = await window.tablePet.getSettings();
      const settings = collectVoiceSettings(currentSettings);

      if (!settings.voiceEnabled) {
        setText("voiceStatusText", "语音未启用");
        setReply("[Emotion: Confused]\n先勾选“语音播报”，再测试语音。");
        setEmotionLabel("语音未启用");
        return;
      }

      const sampleText = sampleTextByLanguage[settings.qwenTtsLanguage] || sampleTextByLanguage.Japanese;
      setText("voiceStatusText", "测试语音请求中");
      setReply(`[Emotion: Happy]\n${sampleText}`);
      setEmotionLabel("测试语音");
      await window.tablePet.saveSettings(settings);
      const result = await window.tablePet.speak(sampleText);
      await playAudioBase64(result);
    } catch (error) {
      setText("voiceStatusText", "测试语音失败");
      setReply(`[Emotion: Confused]\n测试语音失败：${error.message}`);
      setEmotionLabel("语音失败");
    } finally {
      if (window.tablePetRefreshVoiceDiagnostics) await window.tablePetRefreshVoiceDiagnostics();
      if (button) button.disabled = false;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    byId("testVoiceButton")?.addEventListener("click", testVoice);
  });
})();
