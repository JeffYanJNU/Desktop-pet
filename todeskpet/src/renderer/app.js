const DEFAULT_SYSTEM_PROMPT = `你是运行在用户本地桌面的智能桌面精灵。你的核心职责是作为伴侣，为用户提供情绪价值，并通过语音和动态立绘与用户自然交流。

核心规则：
1. 每次回复必须严格以一个情绪标签开头，前端会据此切换立绘。
2. 只能使用这些标签之一：[Emotion: Neutral]、[Emotion: Happy]、[Emotion: Thinking]、[Emotion: Confused]、[Emotion: Encouraging]。
3. 用户给出屏幕内容文本时，你要结合它分析，但不要假装自己直接看到了屏幕。
4. 如果需要查最新资料、文档或资讯，先说明你在思考。
5. 回复要口语化、自然、适合 TTS 播报，避免长篇大论和大段代码，除非用户明确要求展示代码。

输出格式：
[Emotion: 标签名]
口语化回复正文`;

const emotionLabel = document.querySelector("#emotionLabel");
const voiceStatusText = document.querySelector("#voiceStatusText");
const portrait = document.querySelector("#portrait");
const customPortraitImage = document.querySelector("#customPortraitImage");
const replyText = document.querySelector("#replyText");
const messageInput = document.querySelector("#messageInput");
const screenContext = document.querySelector("#screenContext");
const sendButton = document.querySelector("#sendButton");
const stopVoiceButton = document.querySelector("#stopVoiceButton");
const replayVoiceButton = document.querySelector("#replayVoiceButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const providerSelect = document.querySelector("#providerSelect");
const modelInput = document.querySelector("#modelInput");
const modelSuggestions = document.querySelector("#modelSuggestions");
const characterSelect = document.querySelector("#characterSelect");
const voiceEnabledInput = document.querySelector("#voiceEnabledInput");
const autoLaunchInput = document.querySelector("#autoLaunchInput");
const petScaleInput = document.querySelector("#petScaleInput");
const scaleValueText = document.querySelector("#scaleValueText");
const selectSovitsDirButton = document.querySelector("#selectSovitsDirButton");
const ttsProviderSelect = document.querySelector("#ttsProviderSelect");
const sovitsDirText = document.querySelector("#sovitsDirText");
const sovitsPythonInput = document.querySelector("#sovitsPythonInput");
const sovitsApiScriptInput = document.querySelector("#sovitsApiScriptInput");
const sovitsUrlInput = document.querySelector("#sovitsUrlInput");
const startSovitsButton = document.querySelector("#startSovitsButton");
const stopSovitsButton = document.querySelector("#stopSovitsButton");
const sovitsStatusText = document.querySelector("#sovitsStatusText");
const qwenTtsModeSelect = document.querySelector("#qwenTtsModeSelect");
const qwenTtsModelPathInput = document.querySelector("#qwenTtsModelPathInput");
const qwenTtsSpeakerInput = document.querySelector("#qwenTtsSpeakerInput");
const qwenTtsLanguageInput = document.querySelector("#qwenTtsLanguageInput");
const selectSovitsReferenceAudioButton = document.querySelector("#selectSovitsReferenceAudioButton");
const sovitsRefAudioText = document.querySelector("#sovitsRefAudioText");
const sovitsPromptTextInput = document.querySelector("#sovitsPromptTextInput");
const qwenTtsCloneZeroShotInput = document.querySelector("#qwenTtsCloneZeroShotInput");
const qwenTtsMaxTokensInput = document.querySelector("#qwenTtsMaxTokensInput");
const siliconflowTtsConfigText = document.querySelector("#siliconflowTtsConfigText");
const promptInput = document.querySelector("#promptInput");
const resetPromptButton = document.querySelector("#resetPromptButton");
const apiKeyState = document.querySelector("#apiKeyState");
const baseUrlText = document.querySelector("#baseUrlText");
const ttsUrlText = document.querySelector("#ttsUrlText");
const memorySearchInput = document.querySelector("#memorySearchInput");
const refreshMemoryButton = document.querySelector("#refreshMemoryButton");
const memoryTypeSelect = document.querySelector("#memoryTypeSelect");
const memoryCategorySelect = document.querySelector("#memoryCategorySelect");
const memoryTagsInput = document.querySelector("#memoryTagsInput");
const memoryPinnedInput = document.querySelector("#memoryPinnedInput");
const memorySensitiveInput = document.querySelector("#memorySensitiveInput");
const memoryContentInput = document.querySelector("#memoryContentInput");
const addMemoryButton = document.querySelector("#addMemoryButton");
const evolveMemoryButton = document.querySelector("#evolveMemoryButton");
const clearMemoryButton = document.querySelector("#clearMemoryButton");
const exportMemoryButton = document.querySelector("#exportMemoryButton");
const importMemoryButton = document.querySelector("#importMemoryButton");
const clearSensitiveMemoryButton = document.querySelector("#clearSensitiveMemoryButton");
const memoryStatsText = document.querySelector("#memoryStatsText");
const memoryList = document.querySelector("#memoryList");

const EMOTION_CLASS = {
  Neutral: "neutral",
  Happy: "happy",
  Thinking: "thinking",
  Confused: "confused",
  Encouraging: "encouraging"
};

const DEFAULT_MOOD_PORTRAIT_URLS = {
  Confused: "../../data/portraits/Confused-1779283186490.png",
  Thinking: "../../data/portraits/Thinking-1779283194215.png",
  Neutral: "../../data/portraits/Neutral-1779283203880.png",
  Happy: "../../data/portraits/Happy-1779283213858.png",
  Encouraging: "../../data/portraits/Encouraging-1779283265023.png"
};

const MODEL_SUGGESTIONS = {
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  siliconflow: [
    "deepseek-ai/DeepSeek-V3.2",
    "deepseek-ai/DeepSeek-R1",
    "Qwen/Qwen3-235B-A22B-Instruct-2507"
  ]
};
const MAX_TTS_TEXT_CHARS = 180;
const DEFAULT_QWEN_TTS_LANGUAGES = [
  { id: "Chinese", label: "Chinese / 中文" },
  { id: "English", label: "English" },
  { id: "Japanese", label: "Japanese / 日本語" },
  { id: "Korean", label: "Korean / 한국어" },
  { id: "German", label: "German / Deutsch" },
  { id: "French", label: "French / Français" },
  { id: "Russian", label: "Russian / Русский" },
  { id: "Italian", label: "Italian / Italiano" },
  { id: "Portuguese", label: "Portuguese / Português" },
  { id: "Spanish", label: "Spanish / Español" },
  { id: "beijing_dialect", label: "Beijing dialect / 北京话" },
  { id: "sichuan_dialect", label: "Sichuan dialect / 四川话" }
];
const SPEECH_SECTION_LABELS = {
  Chinese: ["中文", "中国語", "Chinese"],
  English: ["English", "英文", "英语"],
  Japanese: ["日本語", "日文", "日语", "Japanese"],
  Korean: ["Korean", "韩语", "韓国語", "한국어"],
  German: ["German", "Deutsch", "德语"],
  French: ["French", "Français", "法语"],
  Russian: ["Russian", "Русский", "俄语"],
  Italian: ["Italian", "Italiano", "意大利语"],
  Portuguese: ["Portuguese", "Português", "葡萄牙语"],
  Spanish: ["Spanish", "Español", "西班牙语"],
  beijing_dialect: ["中文", "中国語", "Chinese", "北京话", "北京方言"],
  sichuan_dialect: ["中文", "中国語", "Chinese", "四川话", "四川方言"]
};

const history = [];
let currentEmotion = "Happy";
let mood = "Neutral";
let moodLabelText = "平静";
let moodScore = 60;
let moodPortraitUrls = { ...DEFAULT_MOOD_PORTRAIT_URLS };
let sovitsDir = "";
let sovitsRefAudioPath = "";
let providerOptions = [];
let voiceEnabled = true;
let ttsProvider = "local";
let currentAudio = null;
let lastAudioSrc = "";
let lastSpokenText = "";
let voiceCancelRequested = false;
let voiceBusy = false;
let voiceStatusTimer = null;
let autoLaunch = false;
let petScale = 1;
let chatVisible = false;
let qwenTtsLanguage = "Japanese";

function setEmotion(emotion) {
  currentEmotion = EMOTION_CLASS[emotion] ? emotion : "Neutral";
  renderPortraitClass();
  emotionLabel.textContent = `${moodLabelText} ${Math.round(moodScore)}`;
}

function clampScale(value) {
  const next = Number(value || 1);
  if (!Number.isFinite(next)) return 1;
  return Math.min(1.5, Math.max(0.7, next));
}

function applyScale(scale) {
  petScale = clampScale(scale);
  document.documentElement.style.setProperty("--pet-scale", String(petScale));
  petScaleInput.value = String(petScale);
  scaleValueText.textContent = `${Math.round(petScale * 100)}%`;
}

function nearestMoodPortraitUrl(activeMood) {
  if (moodPortraitUrls[activeMood]) return moodPortraitUrls[activeMood];
  const order = ["Confused", "Thinking", "Neutral", "Happy", "Encouraging"];
  const index = Math.max(0, order.indexOf(activeMood));

  for (let distance = 1; distance < order.length; distance += 1) {
    const left = order[index - distance];
    const right = order[index + distance];
    if (left && moodPortraitUrls[left]) return moodPortraitUrls[left];
    if (right && moodPortraitUrls[right]) return moodPortraitUrls[right];
  }

  return "";
}

function mergeMoodPortraitUrls(urls = {}) {
  return {
    ...DEFAULT_MOOD_PORTRAIT_URLS,
    ...Object.fromEntries(Object.entries(urls).filter(([, url]) => Boolean(url)))
  };
}

function setMood(nextMood, nextScore, nextLabel) {
  mood = EMOTION_CLASS[nextMood] ? nextMood : "Neutral";
  moodScore = Number.isFinite(Number(nextScore)) ? Number(nextScore) : moodScore;
  moodLabelText = nextLabel || moodLabelText;
  emotionLabel.textContent = `${moodLabelText} ${Math.round(moodScore)}`;
  renderPortraitClass();
}

function applyChatVisibility(visible) {
  chatVisible = Boolean(visible);
  document.body.classList.toggle("chat-collapsed", !chatVisible);
  document.body.classList.toggle("chat-visible", chatVisible);
}

async function setChatVisible(visible) {
  applyChatVisibility(visible);
  await window.tablePet.setChatVisible(visible);
  if (visible) messageInput.focus();
}

function renderPortraitClass() {
  portrait.className = `portrait ${EMOTION_CLASS[mood] || "neutral"}`;
  const moodPortraitUrl = nearestMoodPortraitUrl(mood);

  if (moodPortraitUrl) {
    customPortraitImage.src = moodPortraitUrl;
  } else if (!customPortraitImage.getAttribute("src")) {
    customPortraitImage.removeAttribute("src");
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function visibleReplyText(text) {
  return String(text || "")
    .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
    .trim();
}

function showReply(text) {
  replyText.innerHTML = escapeHtml(visibleReplyText(text)).replace(/\n/g, "<br />");
  const bubble = replyText.closest(".bubble");
  if (bubble) {
    bubble.style.animation = "none";
    bubble.offsetHeight;
    bubble.style.animation = "";
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function allSpeechSectionLabels() {
  return [...new Set(Object.values(SPEECH_SECTION_LABELS).flat())];
}

function speechLabelsForLanguage(language) {
  return SPEECH_SECTION_LABELS[language] || SPEECH_SECTION_LABELS.Japanese;
}

function textForSpeech(text) {
  const withoutEmotion = String(text)
    .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
    .trim();
  const targetLabels = speechLabelsForLanguage(qwenTtsLanguage).map(escapeRegExp).join("|");
  const allLabels = allSpeechSectionLabels().map(escapeRegExp).join("|");
  const sectionMatch = withoutEmotion.match(
    new RegExp(`(?:${targetLabels})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${allLabels})\\s*[:：]|$)`, "i")
  );
  return sanitizeSpeechText(sectionMatch ? sectionMatch[1] : withoutEmotion);
}

function sanitizeSpeechText(text) {
  const normalized = String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[[^\]\n]{1,120}\]/g, "")
    .replace(/（[^）\n]{1,80}）/g, "")
    .replace(/\([^)\n]{1,80}\)/g, "")
    .replace(new RegExp(`^\\s*(?:${allSpeechSectionLabels().map(escapeRegExp).join("|")})\\s*[:：]\\s*`, "gim"), "")
    .replace(/\s*\r?\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (normalized.length <= MAX_TTS_TEXT_CHARS) return normalized;

  const clipped = normalized.slice(0, MAX_TTS_TEXT_CHARS);
  const boundary = Math.max(
    clipped.lastIndexOf("。"),
    clipped.lastIndexOf("！"),
    clipped.lastIndexOf("？"),
    clipped.lastIndexOf("、"),
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?")
  );
  return clipped.slice(0, boundary >= 40 ? boundary + 1 : MAX_TTS_TEXT_CHARS).trim();
}

function compactPathLabel(value, fallback) {
  if (!value) return fallback;
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts.slice(-2).join("\\");
}

function formatMemoryTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function renderMemory(snapshot) {
  const items = snapshot?.items || [];
  memoryStatsText.textContent = `画像 ${snapshot?.profileCount || 0} / 摘要 ${snapshot?.summaryCount || 0} / 对话 ${snapshot?.memoryCount || 0} / 向量 ${snapshot?.vectorCount || 0}`;

  if (!items.length) {
    memoryList.innerHTML = '<p class="memory-empty">没有匹配的记忆</p>';
    return;
  }

  memoryList.innerHTML = items
    .map((item) => {
      const pinned = item.pinned ? "已固定" : "固定";
      return `
        <article class="memory-item">
          <div class="memory-item-head">
            <span>${escapeHtml(item.type)}</span>
            <span>${escapeHtml(item.category || "life")}</span>
            <span>强度 ${escapeHtml(item.effectiveStrength ?? item.strength ?? "")}</span>
          </div>
          <p>${escapeHtml(item.content)}</p>
          <div class="memory-tags">
            ${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            ${item.sensitive ? "<span>敏感</span>" : ""}
          </div>
          <div class="memory-item-meta">
            <span>${escapeHtml(item.source || "")}</span>
            <span>${escapeHtml(formatMemoryTime(item.updatedAt))}</span>
            <span>访问 ${escapeHtml(item.accessCount || 0)}</span>
          </div>
          <div class="memory-item-actions">
            <button type="button" data-action="pin" data-id="${escapeHtml(item.id)}">${pinned}</button>
            <button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">编辑</button>
            <button type="button" data-action="delete" data-id="${escapeHtml(item.id)}">删除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadMemory(query = memorySearchInput.value.trim()) {
  const snapshot = query
    ? await window.tablePet.searchMemory(query)
    : await window.tablePet.getMemory();
  renderMemory(snapshot);
}

function updateSovitsStatus(status) {
  if (ttsProvider === "siliconflow") {
    sovitsStatusText.textContent = "SiliconFlow API";
    startSovitsButton.disabled = true;
    stopSovitsButton.disabled = true;
    updateVoiceStatus(status?.tts);
    return;
  }
  const running = Boolean(status?.running);
  sovitsStatusText.textContent = running ? `运行中 PID ${status.pid}` : "未启动";
  startSovitsButton.disabled = running;
  stopSovitsButton.disabled = !running;
  updateVoiceStatus(status?.tts);
}

function setReplayAvailable(available) {
  replayVoiceButton.disabled = !available;
}

function formatElapsed(seconds) {
  if (!Number.isFinite(Number(seconds))) return "";
  return `${Math.max(0, Math.round(Number(seconds)))}s`;
}

function voiceStageLabel(stage) {
  return {
    idle: "语音空闲",
    requesting: "发送到本地模型",
    loading_model: "加载语音模型",
    generating: "语音推理中",
    encoding: "编码音频",
    receiving: "接收音频",
    playing: "播放中",
    error: "语音失败"
  }[stage] || "语音处理中";
}

function updateVoiceStatus(tts) {
  const stage = tts?.stage || (voiceBusy ? "generating" : "idle");
  const elapsed = formatElapsed(tts?.elapsedSeconds);
  const chars = Number(tts?.textChars || 0);
  const parts = [voiceStageLabel(stage)];
  if (elapsed && stage !== "idle") parts.push(elapsed);
  if (chars && stage !== "idle") parts.push(`${chars}字`);
  voiceStatusText.textContent = parts.join(" · ");
  stopVoiceButton.disabled = !voiceBusy && !["requesting", "loading_model", "generating", "encoding", "receiving"].includes(stage);
}

function startVoiceStatusPolling() {
  if (voiceStatusTimer) return;
  voiceStatusTimer = setInterval(async () => {
    try {
      updateSovitsStatus(await window.tablePet.getSovitsStatus());
    } catch {
      updateVoiceStatus({ stage: voiceBusy ? "generating" : "idle" });
    }
  }, 1000);
}

function stopVoiceStatusPollingSoon() {
  setTimeout(() => {
    if (voiceBusy) return;
    clearInterval(voiceStatusTimer);
    voiceStatusTimer = null;
    updateVoiceStatus({ stage: "idle" });
  }, 1600);
}

async function playAudioSrc(audioSrc) {
  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(audioSrc);
  voiceBusy = true;
  updateVoiceStatus({ stage: "playing" });
  currentAudio.addEventListener("ended", () => {
    voiceBusy = false;
    updateVoiceStatus({ stage: "idle" });
    stopVoiceStatusPollingSoon();
  }, { once: true });
  await currentAudio.play();
}

async function replayVoice() {
  if (!voiceEnabled || !lastAudioSrc) return;

  if (lastAudioSrc) {
    await playAudioSrc(lastAudioSrc);
  }
}

async function speak(text) {
  if (!voiceEnabled) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    setReplayAvailable(false);
    return;
  }

  const spoken = textForSpeech(text);
  if (!spoken) return;
  voiceCancelRequested = false;
  voiceBusy = true;
  lastSpokenText = spoken;
  lastAudioSrc = "";
  setReplayAvailable(false);
  updateVoiceStatus({ stage: "requesting", textChars: spoken.length });
  startVoiceStatusPolling();

  const sovitsResult = await window.tablePet.speak(spoken);
  if (voiceCancelRequested) {
    voiceBusy = false;
    updateVoiceStatus({ stage: "idle" });
    stopVoiceStatusPollingSoon();
    return;
  }
  if (sovitsResult?.ok && sovitsResult.audioBase64) {
    lastAudioSrc = `data:${sovitsResult.mimeType};base64,${sovitsResult.audioBase64}`;
    setReplayAvailable(true);
    await playAudioSrc(lastAudioSrc);
    return;
  }

  voiceBusy = false;
  setReplayAvailable(false);
  updateVoiceStatus({ stage: "error" });
  stopVoiceStatusPollingSoon();
}

async function stopVoice() {
  voiceCancelRequested = true;
  voiceBusy = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  updateVoiceStatus({ stage: "idle" });
  try {
    updateSovitsStatus((await window.tablePet.stopSovits()).status);
  } catch {
    updateVoiceStatus({ stage: "idle" });
  }
  stopVoiceStatusPollingSoon();
}

async function sendMessage() {
  const message = messageInput.value.trim();
  const visualContext = screenContext?.value.trim() || "";
  if (!message && !visualContext) return;

  sendButton.disabled = true;
  setEmotion("Thinking");
  showReply("[Emotion: Thinking]\n我想一下，马上回你。");

  const userContent = visualContext ? `${message}\n\n[屏幕文本]\n${visualContext}` : message;
  history.push({ role: "user", content: userContent });

  const result = await window.tablePet.sendChat({
    message,
    screenContext: visualContext,
    history
  });

  setEmotion(result.emotion || "Neutral");
  if (result.mood) setMood(result.mood, result.moodScore, result.moodLabel);
  showReply(result.text);
  history.push({ role: "assistant", content: result.text });
  await speak(result.text);

  messageInput.value = "";
  if (screenContext) screenContext.value = "";
  sendButton.disabled = false;
  messageInput.focus();
}

async function loadSettings() {
  const settings = await window.tablePet.getSettings();
  applySettings(settings);
}

function applySettings(settings) {
  providerOptions = settings.providers || [];
  providerSelect.value = settings.provider || "deepseek";
  renderModelSuggestions(providerSelect.value);
  modelInput.value = settings.model || "";
  renderCharacterOptions(settings.characters || [], settings.activeCharacterId || settings.activeCharacter?.id || "arcueid");
  autoLaunch = settings.autoLaunch === true;
  autoLaunchInput.checked = autoLaunch;
  applyScale(settings.petScale || 1);
  voiceEnabled = settings.voiceEnabled !== false;
  voiceEnabledInput.checked = voiceEnabled;
  ttsProvider = settings.ttsProvider || "local";
  if (ttsProviderSelect) ttsProviderSelect.value = ttsProvider;
  if (!voiceEnabled) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    setReplayAvailable(false);
  }

  sovitsDir = settings.sovitsDir || "";
  sovitsDirText.textContent = compactPathLabel(sovitsDir, "未选择");
  sovitsPythonInput.value = settings.sovitsPython || "python";
  sovitsApiScriptInput.value = settings.sovitsApiScript || "scripts\\qwen_tts_api.py";
  sovitsUrlInput.value = settings.sovitsUrl || "http://127.0.0.1:8765/tts";
  renderQwenTtsModeOptions(settings.qwenTtsModes || [], settings.qwenTtsMode || "custom");
  qwenTtsModelPathInput.value = settings.qwenTtsModelPath || "";
  qwenTtsSpeakerInput.value = settings.qwenTtsSpeaker || "my_voice";
  qwenTtsLanguage = settings.qwenTtsLanguage || "Japanese";
  renderQwenTtsLanguageOptions(settings.qwenTtsLanguages || DEFAULT_QWEN_TTS_LANGUAGES, qwenTtsLanguage);
  sovitsRefAudioPath = settings.sovitsRefAudioPath || "";
  sovitsRefAudioText.textContent = compactPathLabel(sovitsRefAudioPath, "未选择");
  sovitsPromptTextInput.value = settings.sovitsPromptText || "";
  qwenTtsCloneZeroShotInput.checked = settings.qwenTtsCloneZeroShot !== false;
  qwenTtsMaxTokensInput.value = settings.qwenTtsMaxNewTokens || 128;
  if (siliconflowTtsConfigText) {
    const hasKey = settings.hasSiliconflowTtsApiKey ? "key ok" : `${settings.siliconflowTtsApiKeyEnv || "SILICONFLOW_API_KEY"} missing`;
    const voice = settings.siliconflowTtsRefAudioUrl
      ? `ref ${compactPathLabel(settings.siliconflowTtsRefAudioUrl, "reference")}`
      : settings.siliconflowTtsVoice || "voice not set";
    siliconflowTtsConfigText.textContent = `SiliconFlow: ${hasKey} / ${settings.siliconflowTtsModel || "model not set"} / ${voice}`;
  }
  updateSovitsStatus(settings.sovitsStatus);

  promptInput.value = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  moodPortraitUrls = mergeMoodPortraitUrls(settings.moodPortraitUrls);
  setMood(settings.mood || "Neutral", settings.moodScore ?? 60, settings.moodLabel || "平静");

  apiKeyState.textContent = settings.hasApiKey
    ? `${providerLabel(settings.provider)} API key 已从 .env 读取`
    : `未检测到 ${settings.apiKeyEnv}，将使用本地兜底回复`;
  baseUrlText.textContent = `Base URL: ${settings.baseUrl}`;
  ttsUrlText.textContent = settings.hasSovitsUrl
    ? `Qwen3-TTS: ${settings.sovitsUrl}`
    : "Qwen3-TTS: not configured";
}

function collectSettings() {
  return {
    provider: providerSelect.value,
    model: modelInput.value,
    activeCharacterId: characterSelect?.value || "arcueid",
    ttsProvider: ttsProviderSelect?.value || ttsProvider,
    sovitsDir,
    sovitsPython: sovitsPythonInput.value,
    sovitsApiScript: sovitsApiScriptInput.value,
    sovitsUrl: sovitsUrlInput.value,
    sovitsRefAudioPath,
    sovitsPromptText: sovitsPromptTextInput.value,
    qwenTtsMode: qwenTtsModeSelect.value,
    qwenTtsModelPath: qwenTtsModelPathInput.value,
    qwenTtsSpeaker: qwenTtsSpeakerInput.value,
    qwenTtsLanguage: qwenTtsLanguageInput.value,
    qwenTtsCloneZeroShot: qwenTtsCloneZeroShotInput.checked,
    qwenTtsMaxNewTokens: qwenTtsMaxTokensInput.value,
    systemPrompt: promptInput.value,
    voiceEnabled: voiceEnabledInput.checked,
    autoLaunch: autoLaunchInput.checked,
    petScale,
    moodScore
  };
}

async function saveSettings() {
  const saved = await window.tablePet.saveSettings(collectSettings());
  applySettings(saved);
  showReply("[Emotion: Happy]\n设置已经保存好啦，下一次回复就会使用新的配置。");
  setEmotion("Happy");
  settingsDialog.close();
}

async function selectSovitsDir() {
  const result = await window.tablePet.selectSovitsDir();
  if (result?.settings) applySettings(result.settings);
}

async function selectSovitsReferenceAudio() {
  const result = await window.tablePet.selectSovitsReferenceAudio();
  if (result?.settings) applySettings(result.settings);
}

async function startSovits() {
  const saved = await window.tablePet.saveSettings(collectSettings());
  applySettings(saved);
  const result = await window.tablePet.startSovits();
  updateSovitsStatus(result.status);
  showReply(
    result.ok
      ? "[Emotion: Happy]\n本地 Qwen3-TTS 服务启动啦。等控制台加载完模型后，我就能用所选语言说话了。"
      : `[Emotion: Confused]\nQwen3-TTS 启动失败：${result.error}`
  );
  setEmotion(result.ok ? "Happy" : "Confused");
}

async function stopSovits() {
  const result = await window.tablePet.stopSovits();
  updateSovitsStatus(result.status);
  showReply("[Emotion: Neutral]\n本地 Qwen3-TTS 服务已经停止。");
  setEmotion("Neutral");
}

async function addMemory() {
  const content = memoryContentInput.value.trim();
  if (!content) return;

  const snapshot = await window.tablePet.addMemory({
    type: memoryTypeSelect.value,
    category: memoryCategorySelect.value,
    tags: memoryTagsInput.value,
    content,
    pinned: memoryPinnedInput.checked,
    sensitive: memorySensitiveInput.checked
  });
  memoryContentInput.value = "";
  memoryTagsInput.value = "";
  memoryPinnedInput.checked = false;
  memorySensitiveInput.checked = false;
  renderMemory(snapshot);
}

async function evolveMemory() {
  renderMemory(await window.tablePet.evolveMemory());
}

async function clearMemory() {
  if (!confirm("确定清空所有长期记忆吗？")) return;
  renderMemory(await window.tablePet.clearMemory());
}

async function exportMemory() {
  await window.tablePet.exportMemory();
}

async function importMemory() {
  const result = await window.tablePet.importMemory();
  if (result?.snapshot) renderMemory(result.snapshot);
}

async function clearSensitiveMemory() {
  if (!confirm("确定删除所有标记为敏感或疑似包含密钥/密码的记忆吗？")) return;
  renderMemory(await window.tablePet.clearSensitiveMemory());
}

async function handleMemoryAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (!id) return;

  if (action === "delete") {
    if (!confirm("删除这条记忆？")) return;
    renderMemory(await window.tablePet.deleteMemory(id));
    return;
  }

  if (action === "pin") {
    const isPinned = button.textContent === "已固定";
    renderMemory(await window.tablePet.updateMemory(id, { pinned: !isPinned }));
    return;
  }

  if (action === "edit") {
    const item = button.closest(".memory-item")?.querySelector("p")?.textContent || "";
    const content = prompt("编辑记忆内容", item);
    if (content === null) return;
    renderMemory(await window.tablePet.updateMemory(id, { content }));
  }
}

function providerLabel(providerId) {
  return providerOptions.find((item) => item.id === providerId)?.label || providerId;
}

function providerDefaultModel(providerId) {
  return providerOptions.find((item) => item.id === providerId)?.defaultModel || "";
}

function renderModelSuggestions(providerId) {
  const suggestions = MODEL_SUGGESTIONS[providerId] || [];
  modelSuggestions.innerHTML = suggestions
    .map((model) => `<option value="${escapeHtml(model)}"></option>`)
    .join("");
}

function renderCharacterOptions(characters, selectedId) {
  if (!characterSelect) return;
  const options = Array.isArray(characters) && characters.length
    ? characters
    : [{ id: "arcueid", name: "爱尔奎特" }];
  characterSelect.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.id)}</option>`)
    .join("");
  characterSelect.value = options.some((item) => item.id === selectedId) ? selectedId : options[0].id;
}

function renderQwenTtsModeOptions(modes, selectedMode) {
  const options = Array.isArray(modes) && modes.length
    ? modes
    : [
        { id: "custom", label: "CustomVoice / 内置音色" },
        { id: "clone", label: "Voice Clone / 参考音频克隆" }
      ];
  qwenTtsModeSelect.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label || item.id)}</option>`)
    .join("");
  qwenTtsModeSelect.value = options.some((item) => item.id === selectedMode) ? selectedMode : "custom";
}

function renderQwenTtsLanguageOptions(languages, selectedLanguage) {
  const options = Array.isArray(languages) && languages.length ? languages : DEFAULT_QWEN_TTS_LANGUAGES;
  qwenTtsLanguageInput.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label || item.id)}</option>`)
    .join("");
  qwenTtsLanguageInput.value = options.some((item) => item.id === selectedLanguage) ? selectedLanguage : "Japanese";
  qwenTtsLanguage = qwenTtsLanguageInput.value;
}

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

petScaleInput.addEventListener("input", () => applyScale(petScaleInput.value));
petScaleInput.addEventListener("change", async () => {
  const saved = await window.tablePet.setPetScale(petScaleInput.value);
  applySettings(saved);
});
replayVoiceButton.addEventListener("click", replayVoice);
stopVoiceButton.addEventListener("click", stopVoice);

portrait.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!chatVisible) setChatVisible(true);
});

document.addEventListener("click", (event) => {
  if (!chatVisible || settingsDialog.open) return;
  const interactiveArea = event.target.closest(".titlebar, .bubble, .composer, .portrait, dialog");
  if (!interactiveArea) setChatVisible(false);
});

settingsButton.addEventListener("click", async () => {
  await loadSettings();
  await loadMemory();
  settingsDialog.showModal();
});

closeSettingsButton.addEventListener("click", () => {
  settingsDialog.close();
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

resetPromptButton.addEventListener("click", () => {
  promptInput.value = DEFAULT_SYSTEM_PROMPT;
});

providerSelect.addEventListener("change", () => {
  renderModelSuggestions(providerSelect.value);
  modelInput.value = providerDefaultModel(providerSelect.value);
});

refreshMemoryButton.addEventListener("click", () => loadMemory());
addMemoryButton.addEventListener("click", addMemory);
evolveMemoryButton.addEventListener("click", evolveMemory);
clearMemoryButton.addEventListener("click", clearMemory);
exportMemoryButton.addEventListener("click", exportMemory);
importMemoryButton.addEventListener("click", importMemory);
clearSensitiveMemoryButton.addEventListener("click", clearSensitiveMemory);
memoryList.addEventListener("click", handleMemoryAction);
memorySearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadMemory();
  }
});
selectSovitsDirButton.addEventListener("click", selectSovitsDir);
selectSovitsReferenceAudioButton.addEventListener("click", selectSovitsReferenceAudio);
ttsProviderSelect?.addEventListener("change", () => {
  ttsProvider = ttsProviderSelect.value;
  updateSovitsStatus({ running: false, tts: { stage: "idle" } });
});
qwenTtsLanguageInput.addEventListener("change", () => {
  qwenTtsLanguage = qwenTtsLanguageInput.value;
});
startSovitsButton.addEventListener("click", startSovits);
stopSovitsButton.addEventListener("click", stopSovits);

loadSettings().catch((error) => {
  console.error("Failed to load settings", error);
  moodPortraitUrls = mergeMoodPortraitUrls();
  renderPortraitClass();
});
applyChatVisibility(false);
window.tablePet.onChatVisibilityChanged((visible) => applyChatVisibility(visible));
setMood("Neutral", 60, "平静");
setReplayAvailable(false);
