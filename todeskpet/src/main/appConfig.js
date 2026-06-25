const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_TTS_URL = "http://127.0.0.1:8765/tts";
const DEFAULT_SILICONFLOW_TTS_BASE_URL = "https://api.siliconflow.cn/v1";
const MAX_TTS_TEXT_CHARS = 180;
const MAX_TTS_GENERATION_TOKENS = 384;
const TTS_REQUEST_TIMEOUT_MS = 300000;

const ALLOWED_EMOTIONS = new Set([
  "Neutral",
  "Happy",
  "Thinking",
  "Confused",
  "Encouraging"
]);

const MOOD_KEYS = ["Confused", "Thinking", "Neutral", "Happy", "Encouraging"];
const MOOD_LABELS = {
  Confused: "低落",
  Thinking: "思考",
  Neutral: "平静",
  Happy: "开心",
  Encouraging: "高昂"
};

const QWEN_TTS_LANGUAGES = [
  { id: "Chinese", label: "Chinese / 中文", aliases: ["chinese", "zh", "zh-cn", "中文", "中国語"] },
  { id: "English", label: "English", aliases: ["english", "en", "英文", "英语"] },
  { id: "Japanese", label: "Japanese / 日本語", aliases: ["japanese", "ja", "jp", "日本語", "日文", "日语"] },
  { id: "Korean", label: "Korean / 한국어", aliases: ["korean", "ko", "kr", "韩语", "韓国語"] },
  { id: "German", label: "German / Deutsch", aliases: ["german", "de", "德语"] },
  { id: "French", label: "French / Français", aliases: ["french", "fr", "法语"] },
  { id: "Russian", label: "Russian / Русский", aliases: ["russian", "ru", "俄语"] },
  { id: "Italian", label: "Italian / Italiano", aliases: ["italian", "it", "意大利语"] },
  { id: "Portuguese", label: "Portuguese / Português", aliases: ["portuguese", "pt", "葡萄牙语"] },
  { id: "Spanish", label: "Spanish / Español", aliases: ["spanish", "es", "西班牙语"] },
  { id: "beijing_dialect", label: "Beijing dialect / 北京话", aliases: ["beijing_dialect", "beijing", "北京话", "北京方言"] },
  { id: "sichuan_dialect", label: "Sichuan dialect / 四川话", aliases: ["sichuan_dialect", "sichuan", "四川话", "四川方言"] }
];

const QWEN_TTS_LANGUAGE_ALIASES = new Map(
  QWEN_TTS_LANGUAGES.flatMap((item) => [
    [item.id.toLowerCase(), item.id],
    ...item.aliases.map((alias) => [String(alias).toLowerCase(), item.id])
  ])
);

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

const SPEECH_LANGUAGE_LABELS = {
  Chinese: "中文",
  English: "English",
  Japanese: "日本語",
  Korean: "Korean",
  German: "German",
  French: "French",
  Russian: "Russian",
  Italian: "Italian",
  Portuguese: "Portuguese",
  Spanish: "Spanish",
  beijing_dialect: "中文（北京话）",
  sichuan_dialect: "中文（四川话）"
};

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

const PROVIDERS = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat"
  },
  siliconflow: {
    label: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    defaultModel: "deepseek-ai/DeepSeek-V3.2"
  }
};

const BILINGUAL_OUTPUT_PROMPT = `无论角色设定如何，每次回复都必须严格满足：
1. 第一行仍然是且只能是一个情绪标签：[Emotion: Neutral]、[Emotion: Happy]、[Emotion: Thinking]、[Emotion: Confused]、[Emotion: Encouraging]。
2. 正文同时给出中文和日文，格式固定为：
中文：...
日本語：...
3. 中文和日文表达同一个意思；日文必须自然、可直接用于语音播报。
4. 不要只输出中文，也不要只输出日文。`;

const DEFAULT_AI_SCHEDULE = [
  {
    id: "sleep",
    start: "00:00",
    end: "07:30",
    activity: "休息和做梦",
    moodHint: "安静、反应慢一点",
    energyDelta: -18,
    enabled: true
  },
  {
    id: "morning-prep",
    start: "07:30",
    end: "10:00",
    activity: "整理房间、看天气、准备今天要陪用户做的事",
    moodHint: "清爽、轻快",
    energyDelta: 8,
    enabled: true
  },
  {
    id: "study-guard",
    start: "10:00",
    end: "13:00",
    activity: "陪用户学习和处理项目问题",
    moodHint: "认真、专注、少闲聊",
    energyDelta: 5,
    enabled: true
  },
  {
    id: "afternoon-low",
    start: "13:00",
    end: "17:30",
    activity: "整理记忆、轻量巡逻、等用户回来聊天",
    moodHint: "稍微慵懒，但仍然可靠",
    energyDelta: -6,
    enabled: true
  },
  {
    id: "evening-chat",
    start: "17:30",
    end: "22:30",
    activity: "陪用户聊天、复盘今天、做语音互动",
    moodHint: "更亲近、更放松",
    energyDelta: 2,
    enabled: true
  },
  {
    id: "night-mode",
    start: "22:30",
    end: "00:00",
    activity: "夜间陪伴和低声提醒用户休息",
    moodHint: "温柔、安静、少打扰",
    energyDelta: -10,
    enabled: true
  }
];

function createAppConfig(projectRoot, defaultCharacterId) {
  const qwenTtsDir = path.join(projectRoot, "audio");
  const qwenTtsModelPath = path.join(qwenTtsDir, "finetuning", "output_probe2", "checkpoint-step-1200");
  const qwenTtsPython = path.join(qwenTtsDir, ".venv", "Scripts", "python.exe");
  const qwenTtsApiScript = path.join("scripts", "qwen_tts_api.py");

  return {
    PROJECT_ROOT: projectRoot,
    QWEN_TTS_DIR: qwenTtsDir,
    QWEN_TTS_MODEL_PATH: qwenTtsModelPath,
    QWEN_TTS_API_SCRIPT: qwenTtsApiScript,
    QWEN_TTS_PYTHON: qwenTtsPython,
    DEFAULT_SETTINGS: {
      provider: "deepseek",
      model: "deepseek-chat",
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      voiceEnabled: true,
      ttsProvider: "local",
      autoStartTts: true,
      autoLaunch: false,
      activeCharacterId: defaultCharacterId,
      petScale: 1,
      moodScore: 60,
      petMood: "普通",
      intimacy: 50,
      energy: 70,
      backgroundEnabled: true,
      backgroundMoodLinkEnabled: true,
      backgroundWeatherEnabled: true,
      backgroundCity: "Singapore",
      backgroundLatitude: "",
      backgroundLongitude: "",
      aiScheduleEnabled: true,
      aiScheduleAutoAdjustEnabled: true,
      aiScheduleItems: DEFAULT_AI_SCHEDULE,
      proactiveEnabled: true,
      proactiveVoiceEnabled: false,
      proactiveIntervalMinutes: 5,
      moodAnimationEnabled: true,
      moodPortraitPaths: {},
      interactionPortraitPaths: {},
      portrait: "mood",
      customPortraitPath: "",
      sovitsDir: qwenTtsDir,
      sovitsPython: fs.existsSync(qwenTtsPython) ? qwenTtsPython : "python",
      sovitsApiScript: qwenTtsApiScript,
      sovitsUrl: DEFAULT_TTS_URL,
      sovitsRefAudioPath: "",
      sovitsPromptText: "",
      sovitsPromptLang: "ja",
      sovitsTextLang: "ja",
      sovitsTextSplitMethod: "cut5",
      sovitsMediaType: "wav",
      sovitsSpeedFactor: 1,
      qwenTtsMode: "custom",
      qwenTtsCloneZeroShot: true,
      qwenTtsModelPath,
      qwenTtsSpeaker: "my_voice",
      qwenTtsLanguage: "Japanese",
      qwenTtsMaxNewTokens: MAX_TTS_GENERATION_TOKENS,
      siliconflowTtsBaseUrl: DEFAULT_SILICONFLOW_TTS_BASE_URL,
      siliconflowTtsModel: "FunAudioLLM/CosyVoice2-0.5B",
      siliconflowTtsVoice: "FunAudioLLM/CosyVoice2-0.5B:anna",
      siliconflowTtsRefAudioUrl: "",
      siliconflowTtsRefText: "",
      siliconflowTtsResponseFormat: "mp3",
      siliconflowTtsSpeed: 1,
      siliconflowTtsSampleRate: 44100
    }
  };
}

module.exports = {
  ALLOWED_EMOTIONS,
  BILINGUAL_OUTPUT_PROMPT,
  DEFAULT_SILICONFLOW_TTS_BASE_URL,
  DEFAULT_TTS_URL,
  DEFAULT_SYSTEM_PROMPT,
  MAX_TTS_GENERATION_TOKENS,
  MAX_TTS_TEXT_CHARS,
  MOOD_KEYS,
  MOOD_LABELS,
  PROVIDERS,
  QWEN_TTS_LANGUAGES,
  QWEN_TTS_LANGUAGE_ALIASES,
  SPEECH_LANGUAGE_LABELS,
  SPEECH_SECTION_LABELS,
  TTS_REQUEST_TIMEOUT_MS,
  createAppConfig
};
