const { app, BrowserWindow, dialog, ipcMain, nativeImage, screen, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createAchievementService } = require("./achievementService");
const { createCharacterRag } = require("./characterRag");
const { DEFAULT_CHARACTER_ID, getCharacterPackage, loadCharacterPackages } = require("./characterProfiles");
const { createMemoryStore } = require("./memoryStore");
const { createTtsQueue } = require("./ttsQueue");
const {
  clampPetScale,
  getWindowBounds,
  getSettingsWindowBounds,
  getPortraitAnchorOffset,
  getPortraitScreenAnchor,
  clampWindowBounds,
  getWindowDockState: getDockStateForBounds
} = require("./windowLayout");
const {
  ALLOWED_EMOTIONS,
  BILINGUAL_OUTPUT_PROMPT,
  DEFAULT_SILICONFLOW_TTS_BASE_URL,
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
} = require("./appConfig");

const {
  PROJECT_ROOT,
  QWEN_TTS_DIR,
  QWEN_TTS_MODEL_PATH,
  QWEN_TTS_API_SCRIPT,
  QWEN_TTS_PYTHON,
  DEFAULT_SETTINGS
} = createAppConfig(path.resolve(__dirname, "../../.."), DEFAULT_CHARACTER_ID);

let mainWindow;
let settingsCache;
let sovitsProcess = null;
let sovitsProcessConfigKey = "";
let sovitsLog = "";
let siliconflowVoiceUploadCache = new Map();
let ttsRequestStatus = {
  stage: "idle",
  detail: "等待语音任务",
  startedAt: null,
  updatedAt: Date.now(),
  textChars: 0,
  lastError: null,
  lastRequest: null
};
let memoryStore;
let achievementService;
let characterRag;
let ttsQueue;
let legacyDataMigrated = false;
let chatVisible = false;
let settingsVisible = false;
let windowDragState = null;
let windowDragTimer = null;
let lastProactiveReminderAt = 0;
let lastProactiveReminderKey = "";

function getLocalDataDir() {
  return path.join(app.getAppPath(), "data");
}

function migrateLegacyData() {
  if (legacyDataMigrated) return;
  legacyDataMigrated = true;

  const legacyDir = app.getPath("userData");
  const localDir = getLocalDataDir();
  if (path.resolve(legacyDir) === path.resolve(localDir)) return;

  const filesToMigrate = ["settings.json", "memory.json"];
  for (const fileName of filesToMigrate) {
    const sourcePath = path.join(legacyDir, fileName);
    const targetPath = path.join(localDir, fileName);
    if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  const legacyPortraitDir = path.join(legacyDir, "portraits");
  const localPortraitDir = path.join(localDir, "portraits");
  if (fs.existsSync(legacyPortraitDir) && !fs.existsSync(localPortraitDir)) {
    fs.mkdirSync(localDir, { recursive: true });
    fs.cpSync(legacyPortraitDir, localPortraitDir, { recursive: true });
  }
}

function getMemoryStore() {
  migrateLegacyData();

  if (!memoryStore) {
    memoryStore = createMemoryStore(getLocalDataDir());
  }

  return memoryStore;
}

function getAchievementService() {
  migrateLegacyData();

  if (!achievementService) {
    achievementService = createAchievementService(getLocalDataDir());
  }

  return achievementService;
}

function trackAchievement(eventName, payload = {}) {
  try {
    return getAchievementService().track(eventName, payload);
  } catch (error) {
    console.error("Achievement tracking failed", error);
    return { newlyUnlocked: [], achievements: [], stats: {}, unlockedCount: 0, total: 0 };
  }
}

function getCharacterRag() {
  if (!characterRag) {
    characterRag = createCharacterRag(app.getAppPath());
  }

  return characterRag;
}

function getActiveCharacter(settings = readSettings()) {
  return getCharacterPackage(app.getAppPath(), settings.activeCharacterId);
}

function getTtsQueue() {
  if (!ttsQueue) {
    ttsQueue = createTtsQueue({
      synthesize: callSovits,
      getCacheKey: (text) => {
        const settings = readSettings();
        return JSON.stringify({
          text,
          provider: settings.ttsProvider,
          mode: settings.qwenTtsMode,
          language: settings.qwenTtsLanguage,
          speaker: settings.qwenTtsSpeaker,
          refAudio: settings.sovitsRefAudioPath,
          refText: settings.sovitsPromptText,
          voice: settings.siliconflowTtsVoice,
          model: settings.siliconflowTtsModel
        });
      }
    });
  }

  return ttsQueue;
}

function loadEnvFile() {
  const envPath = path.join(app.getAppPath(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getSettingsPath() {
  return path.join(getLocalDataDir(), "settings.json");
}

function getPortraitDir() {
  return path.join(getLocalDataDir(), "portraits");
}

function applySettingsWindowLayout(nextSettingsVisible) {
  if (!mainWindow) return { settingsVisible };
  settingsVisible = Boolean(nextSettingsVisible);
  if (settingsVisible) {
    const bounds = clampWindowBounds(getSettingsWindowBounds(readSettings().petScale), { fullyVisible: true });
    mainWindow.setBounds(bounds, true);
    mainWindow.webContents.setZoomFactor(clampPetScale(readSettings().petScale));
    return { settingsVisible, bounds };
  }

  applyWindowLayout(chatVisible);
  return { settingsVisible, chatVisible };
}

function applyWindowLayout(nextChatVisible = chatVisible) {
  if (!mainWindow) return;

  const previousChatVisible = chatVisible;
  const targetChatVisible = Boolean(nextChatVisible);
  if (settingsVisible) {
    chatVisible = targetChatVisible;
    mainWindow.webContents.send("window:chatVisibility", chatVisible);
    return;
  }
  const settings = readSettings();
  const currentBounds = mainWindow.getBounds();
  const currentAnchor = getPortraitScreenAnchor(currentBounds, previousChatVisible, settings.petScale);
  const nextSize = getWindowBounds(targetChatVisible, settings.petScale);
  const nextAnchorOffset = getPortraitAnchorOffset(nextSize, targetChatVisible, settings.petScale);
  const bounds = clampWindowBounds(
    {
      ...nextSize,
      x: currentAnchor.x - nextAnchorOffset.x,
      y: currentAnchor.y - nextAnchorOffset.y
    },
    { fullyVisible: targetChatVisible }
  );

  chatVisible = targetChatVisible;
  mainWindow.setBounds(bounds, true);
  mainWindow.webContents.setZoomFactor(clampPetScale(settings.petScale));
  mainWindow.webContents.send("window:chatVisibility", chatVisible);
}

function stopWindowDragLoop() {
  if (windowDragTimer) {
    clearInterval(windowDragTimer);
    windowDragTimer = null;
  }
}

function applyWindowDragMove() {
  if (!mainWindow || mainWindow.isDestroyed() || !windowDragState) return { ok: false };

  const cursor = screen.getCursorScreenPoint();
  const nextBounds = clampWindowBounds(
    {
      x: windowDragState.startWindowX + Math.round(cursor.x) - windowDragState.startMouseX,
      y: windowDragState.startWindowY + Math.round(cursor.y) - windowDragState.startMouseY,
      width: windowDragState.width,
      height: windowDragState.height
    },
    { fullyVisible: chatVisible || settingsVisible }
  );

  const currentBounds = mainWindow.getBounds();
  if (currentBounds.x !== nextBounds.x || currentBounds.y !== nextBounds.y) {
    mainWindow.setPosition(nextBounds.x, nextBounds.y, false);
  }

  return { ok: true, x: nextBounds.x, y: nextBounds.y };
}

function startWindowDragLoop() {
  stopWindowDragLoop();
  windowDragTimer = setInterval(() => {
    if (!windowDragState) {
      stopWindowDragLoop();
      return;
    }
    applyWindowDragMove();
  }, 16);
}

function applyAutoLaunch(enabled) {
  if (!app.isReady()) return;

  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: process.execPath,
    args: app.isPackaged ? [] : [app.getAppPath()]
  });
}

function toFileUrl(filePath) {
  if (!filePath) return "";
  return pathToFileURL(filePath).href;
}

function audioReferenceToApiValue(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^(https?:|data:)/i.test(source)) return source;
  if (!fs.existsSync(source)) return source;

  const extension = path.extname(source).toLowerCase().replace(".", "");
  const mimeType =
    extension === "mp3"
      ? "audio/mpeg"
      : extension === "ogg"
        ? "audio/ogg"
        : extension === "flac"
          ? "audio/flac"
          : extension === "m4a"
            ? "audio/mp4"
            : "audio/wav";
  return `data:${mimeType};base64,${fs.readFileSync(source).toString("base64")}`;
}

function isLocalAudioReference(value) {
  const source = String(value || "").trim();
  return Boolean(source && !/^(https?:|data:)/i.test(source) && fs.existsSync(source));
}

const PET_MOOD_OPTIONS = ["开心", "普通", "疲惫", "生气"];
const INTERACTION_PORTRAIT_OPTIONS = [
  { key: "idle", label: "普通待机" },
  { key: "touch", label: "摸头开心" },
  { key: "angry", label: "连续点击生气" },
  { key: "drag", label: "拖动中" },
  { key: "edge", label: "边缘探头" },
  { key: "bottom", label: "坐在任务栏" }
];
const EXTRA_INTERACTION_PORTRAIT_OPTIONS = [
  { key: "chat", label: "聊天中" },
  { key: "thinking", label: "思考中" },
  { key: "speaking", label: "说话中" },
  { key: "studyFocus", label: "学习专注" },
  { key: "studyBreak", label: "学习休息" },
  { key: "sleep", label: "睡觉空闲" }
];
const ALL_INTERACTION_PORTRAIT_OPTIONS = [
  ...INTERACTION_PORTRAIT_OPTIONS,
  ...EXTRA_INTERACTION_PORTRAIT_OPTIONS
];
const INTERACTION_PORTRAIT_KEYS = ALL_INTERACTION_PORTRAIT_OPTIONS.map((item) => item.key);
const MAX_PORTRAIT_IMAGE_BYTES = 8 * 1024 * 1024;
const PORTRAIT_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function clampMoodScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return DEFAULT_SETTINGS.moodScore;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function clampStatusPercent(value, fallback = 50) {
  const score = Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizePetMood(value) {
  const mood = String(value || "").trim();
  return PET_MOOD_OPTIONS.includes(mood) ? mood : DEFAULT_SETTINGS.petMood;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  return !/^(0|false|off|no)$/i.test(String(value).trim());
}

function normalizeScheduleTime(value, fallback = "00:00") {
  const text = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function scheduleTimeToMinutes(value) {
  const [hour, minute] = normalizeScheduleTime(value).split(":").map(Number);
  return hour * 60 + minute;
}

function clampScheduleEnergyDelta(value) {
  const delta = Number(value);
  if (!Number.isFinite(delta)) return 0;
  return Math.min(30, Math.max(-30, Math.round(delta)));
}

function scheduleId(prefix = "slot") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeAiScheduleItems(items) {
  const source = Array.isArray(items) && items.length ? items : DEFAULT_SETTINGS.aiScheduleItems;
  return source
    .map((item, index) => {
      const start = normalizeScheduleTime(item?.start, "00:00");
      const end = normalizeScheduleTime(item?.end, "00:00");
      const activity = String(item?.activity || "自由活动").trim().slice(0, 80) || "自由活动";
      return {
        id: String(item?.id || scheduleId("slot")).trim() || scheduleId("slot"),
        start,
        end,
        activity,
        moodHint: String(item?.moodHint || "自然回应").trim().slice(0, 80) || "自然回应",
        energyDelta: clampScheduleEnergyDelta(item?.energyDelta),
        enabled: item?.enabled !== false,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
      };
    })
    .sort((a, b) => scheduleTimeToMinutes(a.start) - scheduleTimeToMinutes(b.start) || a.order - b.order)
    .map(({ order, ...item }) => item);
}

function normalizeAiScheduleSettings(settings = readSettings()) {
  return {
    aiScheduleEnabled: normalizeBoolean(settings.aiScheduleEnabled, DEFAULT_SETTINGS.aiScheduleEnabled),
    aiScheduleAutoAdjustEnabled: normalizeBoolean(
      settings.aiScheduleAutoAdjustEnabled,
      DEFAULT_SETTINGS.aiScheduleAutoAdjustEnabled
    ),
    aiScheduleItems: normalizeAiScheduleItems(settings.aiScheduleItems)
  };
}

function findCurrentAiScheduleItem(settings = readSettings(), time = localTimeBackground()) {
  const schedule = normalizeAiScheduleSettings(settings);
  if (!schedule.aiScheduleEnabled) return null;
  const now = Number(time.hour) * 60 + new Date().getMinutes();
  return schedule.aiScheduleItems.find((item) => {
    if (!item.enabled) return false;
    const start = scheduleTimeToMinutes(item.start);
    const end = scheduleTimeToMinutes(item.end);
    if (start === end) return true;
    if (start < end) return now >= start && now < end;
    return now >= start || now < end;
  }) || null;
}

function aiSchedulePrompt(settings = readSettings(), background = null) {
  const schedule = normalizeAiScheduleSettings(settings);
  if (!schedule.aiScheduleEnabled) return "";
  const current = findCurrentAiScheduleItem(settings, background?.time || localTimeBackground());
  if (!current) return "";
  return [
    "【AI 日程背景】",
    `当前时间段：${current.start}-${current.end}`,
    `她正在做的事：${current.activity}`,
    `语气提示：${current.moodHint}`,
    `日程精力影响：${current.energyDelta >= 0 ? "+" : ""}${current.energyDelta}`,
    "使用规则：把当前日程当作她此刻的生活背景。可以自然影响语气、专注度、是否显得忙/困/放松，但不要每次机械说明日程。"
  ].join("\n");
}

function normalizeBackgroundSettings(settings = readSettings()) {
  return {
    backgroundEnabled: normalizeBoolean(settings.backgroundEnabled, DEFAULT_SETTINGS.backgroundEnabled),
    backgroundMoodLinkEnabled: normalizeBoolean(
      settings.backgroundMoodLinkEnabled,
      DEFAULT_SETTINGS.backgroundMoodLinkEnabled
    ),
    backgroundWeatherEnabled: normalizeBoolean(
      settings.backgroundWeatherEnabled,
      DEFAULT_SETTINGS.backgroundWeatherEnabled
    ),
    backgroundCity: String(settings.backgroundCity || DEFAULT_SETTINGS.backgroundCity).trim() || DEFAULT_SETTINGS.backgroundCity,
    backgroundLatitude: String(settings.backgroundLatitude || "").trim(),
    backgroundLongitude: String(settings.backgroundLongitude || "").trim()
  };
}

function weatherCodeLabel(code) {
  const value = Number(code);
  if ([0].includes(value)) return "晴朗";
  if ([1, 2, 3].includes(value)) return "多云";
  if ([45, 48].includes(value)) return "有雾";
  if ([51, 53, 55, 56, 57].includes(value)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "下雨";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "下雪";
  if ([95, 96, 99].includes(value)) return "雷雨";
  return "未知天气";
}

function localTimeBackground() {
  const now = new Date();
  const hour = now.getHours();
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(now);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "本地时区";
  let dayPart = "白天";
  if (hour < 5) dayPart = "深夜";
  else if (hour < 8) dayPart = "清晨";
  else if (hour < 12) dayPart = "上午";
  else if (hour < 14) dayPart = "中午";
  else if (hour < 18) dayPart = "下午";
  else if (hour < 22) dayPart = "晚上";
  else dayPart = "夜晚";

  return {
    iso: now.toISOString(),
    local: now.toLocaleString("zh-CN", { hour12: false }),
    hour,
    weekday,
    timeZone,
    dayPart
  };
}

let backgroundCache = {
  key: "",
  updatedAt: 0,
  data: null,
  error: null
};

function formatBackgroundError(error) {
  return error?.message || String(error || "未知背景信息错误");
}

async function resolveWeatherLocation(backgroundSettings) {
  const lat = Number(backgroundSettings.backgroundLatitude);
  const lon = Number(backgroundSettings.backgroundLongitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      name: backgroundSettings.backgroundCity || "手动坐标",
      latitude: lat,
      longitude: lon,
      country: ""
    };
  }

  const city = backgroundSettings.backgroundCity || DEFAULT_SETTINGS.backgroundCity;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");
  const response = await fetch(url.href);
  if (!response.ok) throw new Error(`城市查询失败：HTTP ${response.status}`);
  const data = await response.json();
  const result = data?.results?.[0];
  if (!result) throw new Error(`找不到天气城市：${city}`);
  return {
    name: result.name || city,
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    country: result.country || ""
  };
}

async function fetchWeatherBackground(backgroundSettings) {
  const location = await resolveWeatherLocation(backgroundSettings);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url.href);
  if (!response.ok) throw new Error(`天气查询失败：HTTP ${response.status}`);
  const data = await response.json();
  const current = data?.current || {};
  return {
    city: location.name,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: Date.now(),
    time: current.time || "",
    temperature: Number(current.temperature_2m),
    apparentTemperature: Number(current.apparent_temperature),
    humidity: Number(current.relative_humidity_2m),
    windSpeed: Number(current.wind_speed_10m),
    weatherCode: current.weather_code,
    weather: weatherCodeLabel(current.weather_code)
  };
}

function computeBackgroundInfluence(background = {}) {
  const time = background.time || localTimeBackground();
  const weather = background.weather || null;
  let energyDelta = 0;
  let moodDelta = 0;
  const reasons = [];

  if (time.hour < 6 || time.hour >= 23) {
    energyDelta -= 18;
    moodDelta -= 3;
    reasons.push("深夜/太晚会让精力下降");
  } else if (time.hour >= 6 && time.hour < 10) {
    energyDelta += 8;
    moodDelta += 2;
    reasons.push("早晨会让状态稍微清爽");
  } else if (time.hour >= 13 && time.hour < 16) {
    energyDelta -= 6;
    reasons.push("午后精力轻微下降");
  } else if (time.hour >= 18 && time.hour < 22) {
    energyDelta -= 4;
    moodDelta += 1;
    reasons.push("晚上状态更放松但精力略降");
  }

  if (weather) {
    const temp = Number.isFinite(weather.apparentTemperature) ? weather.apparentTemperature : weather.temperature;
    if (Number.isFinite(temp)) {
      if (temp <= 5) {
        energyDelta -= 8;
        moodDelta -= 2;
        reasons.push("体感温度偏冷");
      } else if (temp >= 32) {
        energyDelta -= 12;
        moodDelta -= 4;
        reasons.push("体感温度偏热");
      } else if (temp >= 18 && temp <= 26) {
        moodDelta += 3;
        reasons.push("温度舒适");
      }
    }

    if (/晴朗/.test(weather.weather)) {
      moodDelta += 4;
      energyDelta += 4;
      reasons.push("天气晴朗");
    } else if (/下雨|雷雨/.test(weather.weather)) {
      moodDelta -= 4;
      energyDelta -= 4;
      reasons.push("雨天/雷雨会让状态更低沉");
    } else if (/下雪|有雾/.test(weather.weather)) {
      moodDelta -= 2;
      energyDelta -= 3;
      reasons.push("雪/雾会让行动意愿下降");
    }
  }

  return { moodDelta, energyDelta, reasons };
}

function moodFromLinkedScore(score) {
  if (score >= 75) return "开心";
  if (score >= 42) return "普通";
  if (score >= 18) return "疲惫";
  return "生气";
}

function linkedPetStatus(settings, background) {
  const baseMood = normalizePetMood(settings.petMood);
  const baseEnergy = clampStatusPercent(settings.energy, DEFAULT_SETTINGS.energy);
  const influence = computeBackgroundInfluence(background);
  const currentSchedule = findCurrentAiScheduleItem(settings, background?.time || localTimeBackground());
  if (currentSchedule) {
    influence.energyDelta += clampScheduleEnergyDelta(currentSchedule.energyDelta);
    if (currentSchedule.energyDelta !== 0) {
      influence.reasons.push(`当前日程：${currentSchedule.activity}`);
    }
  }
  const linkedEnergy = clampStatusPercent(baseEnergy + influence.energyDelta, baseEnergy);
  const moodBase = { 开心: 72, 普通: 52, 疲惫: 30, 生气: 16 }[baseMood] || 52;
  const linkedMood = moodFromLinkedScore(moodBase + influence.moodDelta + Math.round((linkedEnergy - 50) / 8));

  return {
    petMood: linkedMood,
    energy: linkedEnergy,
    basePetMood: baseMood,
    baseEnergy,
    intimacy: clampStatusPercent(settings.intimacy, DEFAULT_SETTINGS.intimacy),
    influence
  };
}

async function getBackgroundInfo({ force = false } = {}) {
  const settings = readSettings();
  const bgSettings = normalizeBackgroundSettings(settings);
  const time = localTimeBackground();
  const cacheKey = JSON.stringify(bgSettings);
  const shouldFetchWeather = bgSettings.backgroundEnabled && bgSettings.backgroundWeatherEnabled;
  let weather = null;
  let error = null;

  if (shouldFetchWeather) {
    const fresh = backgroundCache.key === cacheKey && Date.now() - backgroundCache.updatedAt < 10 * 60 * 1000;
    if (!force && fresh) {
      weather = backgroundCache.data;
      error = backgroundCache.error;
    } else {
      try {
        weather = await fetchWeatherBackground(bgSettings);
        backgroundCache = { key: cacheKey, updatedAt: Date.now(), data: weather, error: null };
      } catch (fetchError) {
        error = formatBackgroundError(fetchError);
        backgroundCache = { key: cacheKey, updatedAt: Date.now(), data: null, error };
      }
    }
  }

  const background = {
    enabled: bgSettings.backgroundEnabled,
    moodLinkEnabled: bgSettings.backgroundMoodLinkEnabled,
    weatherEnabled: bgSettings.backgroundWeatherEnabled,
    city: bgSettings.backgroundCity,
    time,
    weather,
    error
  };
  background.linkedStatus = bgSettings.backgroundEnabled && bgSettings.backgroundMoodLinkEnabled
    ? linkedPetStatus(settings, background)
    : {
        petMood: normalizePetMood(settings.petMood),
        energy: clampStatusPercent(settings.energy, DEFAULT_SETTINGS.energy),
        basePetMood: normalizePetMood(settings.petMood),
        baseEnergy: clampStatusPercent(settings.energy, DEFAULT_SETTINGS.energy),
        intimacy: clampStatusPercent(settings.intimacy, DEFAULT_SETTINGS.intimacy),
        influence: { moodDelta: 0, energyDelta: 0, reasons: [] }
      };

  return background;
}

function backgroundPrompt(background) {
  if (!background?.enabled) return "";
  const lines = [
    "【实时背景信息】",
    `当前时间：${background.time.local}`,
    `星期：${background.time.weekday}`,
    `时段：${background.time.dayPart}`,
    `时区：${background.time.timeZone}`
  ];
  if (background.weather) {
    lines.push(
      `天气城市：${background.weather.city}${background.weather.country ? `，${background.weather.country}` : ""}`,
      `天气：${background.weather.weather}`,
      `温度：${Number.isFinite(background.weather.temperature) ? `${background.weather.temperature}°C` : "未知"}`,
      `体感温度：${Number.isFinite(background.weather.apparentTemperature) ? `${background.weather.apparentTemperature}°C` : "未知"}`,
      `湿度：${Number.isFinite(background.weather.humidity) ? `${background.weather.humidity}%` : "未知"}`,
      `风速：${Number.isFinite(background.weather.windSpeed) ? `${background.weather.windSpeed} km/h` : "未知"}`
    );
  } else if (background.error) {
    lines.push(`天气：暂时不可用（${background.error}）`);
  }
  lines.push("使用规则：只在用户问题和时间、天气、出门、休息、学习安排、穿衣、运动有关时自然使用，不要每次机械播报。");
  return lines.join("\n");
}

function petStatusPrompt(settings = readSettings(), background = null) {
  const linked = background?.linkedStatus;
  const petMood = linked?.petMood || normalizePetMood(settings.petMood);
  const intimacy = linked?.intimacy ?? clampStatusPercent(settings.intimacy, DEFAULT_SETTINGS.intimacy);
  const energy = linked?.energy ?? clampStatusPercent(settings.energy, DEFAULT_SETTINGS.energy);
  const lines = [
    "【桌宠当前状态】",
    `心情：${petMood}`,
    `亲密度：${intimacy}/100`,
    `精力：${energy}/100`
  ];

  if (background?.moodLinkEnabled && linked) {
    lines.push(
      `基础心情：${linked.basePetMood}`,
      `基础精力：${linked.baseEnergy}/100`,
      `背景联动：心情 ${linked.influence.moodDelta >= 0 ? "+" : ""}${linked.influence.moodDelta}，精力 ${linked.influence.energyDelta >= 0 ? "+" : ""}${linked.influence.energyDelta}`,
      `联动原因：${linked.influence.reasons.length ? linked.influence.reasons.join("；") : "无明显影响"}`
    );
  }

  lines.push(
    "回复风格参考：开心时语气更轻快；普通时自然稳定；疲惫时更安静简短；生气时可以有点别扭但不要攻击用户。亲密度越高，语气越熟悉；精力越低，回复越短。背景联动只影响语气和活力，不要机械解释规则。"
  );
  return lines.join("\n");
}

function clampTtsMaxNewTokens(value) {
  const tokens = Number(value);
  if (!Number.isFinite(tokens)) return DEFAULT_SETTINGS.qwenTtsMaxNewTokens;
  return Math.min(1024, Math.max(16, Math.round(tokens)));
}

function normalizeTtsProvider(value) {
  return String(value || "").toLowerCase() === "siliconflow" ? "siliconflow" : "local";
}

function normalizeQwenTtsMode(value) {
  return String(value || "").toLowerCase() === "clone" ? "clone" : "custom";
}

function normalizeQwenTtsLanguage(value) {
  const key = String(value || "").trim().toLowerCase();
  return QWEN_TTS_LANGUAGE_ALIASES.get(key) || DEFAULT_SETTINGS.qwenTtsLanguage;
}

function getEnvNumber(name, defaultValue) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : defaultValue;
}

function maxTokensForSpeech(text, configuredTokens) {
  const dynamicLimit = Math.max(96, Math.min(MAX_TTS_GENERATION_TOKENS, String(text || "").length * 3 + 80));
  return Math.min(clampTtsMaxNewTokens(configuredTokens), dynamicLimit);
}

function outputPromptForSpeechLanguage(language) {
  const normalized = normalizeQwenTtsLanguage(language);
  const label = SPEECH_LANGUAGE_LABELS[normalized] || "日本語";

  if (normalized === "Chinese" || normalized.endsWith("_dialect")) {
    return `无论角色设定如何，每次回复都必须严格满足：
1. 第一行仍然是且只能是一个情绪标签：[Emotion: Neutral]、[Emotion: Happy]、[Emotion: Thinking]、[Emotion: Confused]、[Emotion: Encouraging]。
2. 正文使用中文，格式固定为：
中文：...
3. 中文正文必须自然、口语化、可直接用于 ${label} 语音播报。`;
  }

  return `无论角色设定如何，每次回复都必须严格满足：
1. 第一行仍然是且只能是一个情绪标签：[Emotion: Neutral]、[Emotion: Happy]、[Emotion: Thinking]、[Emotion: Confused]、[Emotion: Encouraging]。
2. 正文同时给出中文和${label}，格式固定为：
中文：...
${label}：...
3. 中文和${label}表达同一个意思；${label}必须自然、可直接用于语音播报。
4. 不要只输出中文，也不要只输出${label}。`;
}

function moodFromScore(score) {
  const safeScore = clampMoodScore(score);
  if (safeScore <= 24) return "Confused";
  if (safeScore <= 44) return "Thinking";
  if (safeScore <= 64) return "Neutral";
  if (safeScore <= 84) return "Happy";
  return "Encouraging";
}

function normalizeMoodPortraitPaths(paths = {}) {
  return Object.fromEntries(
    MOOD_KEYS.map((key) => [key, String(paths[key] || "").trim()])
  );
}

function normalizeInteractionPortraitPaths(paths = {}) {
  return Object.fromEntries(
    INTERACTION_PORTRAIT_KEYS.map((key) => [key, String(paths[key] || "").trim()])
  );
}

function getMoodPortraitUrls(settings = readSettings()) {
  const paths = normalizeMoodPortraitPaths(settings.moodPortraitPaths);
  return Object.fromEntries(
    MOOD_KEYS.map((key) => [key, fs.existsSync(paths[key]) ? toFileUrl(paths[key]) : ""])
  );
}

function getInteractionPortraitUrls(settings = readSettings()) {
  const paths = normalizeInteractionPortraitPaths(settings.interactionPortraitPaths);
  return Object.fromEntries(
    INTERACTION_PORTRAIT_KEYS.map((key) => [key, fs.existsSync(paths[key]) ? toFileUrl(paths[key]) : ""])
  );
}

function getPortraitMetadata(filePath) {
  const safePath = String(filePath || "").trim();
  if (!safePath || !fs.existsSync(safePath)) return null;
  const stat = fs.statSync(safePath);
  const image = nativeImage.createFromPath(safePath);
  const size = image.isEmpty() ? { width: 0, height: 0 } : image.getSize();
  let hasAlpha = false;

  if (!image.isEmpty() && size.width > 0 && size.height > 0 && size.width * size.height <= 2200000) {
    const bitmap = image.toBitmap();
    for (let index = 3; index < bitmap.length; index += 4) {
      if (bitmap[index] < 250) {
        hasAlpha = true;
        break;
      }
    }
  }

  return {
    fileName: path.basename(safePath),
    bytes: stat.size,
    width: size.width,
    height: size.height,
    hasAlpha,
    extension: path.extname(safePath).toLowerCase(),
    updatedAt: stat.mtimeMs
  };
}

function getMoodPortraitMeta(settings = readSettings()) {
  const paths = normalizeMoodPortraitPaths(settings.moodPortraitPaths);
  return Object.fromEntries(MOOD_KEYS.map((key) => [key, getPortraitMetadata(paths[key])]));
}

function getInteractionPortraitMeta(settings = readSettings()) {
  const paths = normalizeInteractionPortraitPaths(settings.interactionPortraitPaths);
  return Object.fromEntries(INTERACTION_PORTRAIT_KEYS.map((key) => [key, getPortraitMetadata(paths[key])]));
}

function validatePortraitImage(sourcePath) {
  const safePath = String(sourcePath || "").trim();
  if (!safePath || !fs.existsSync(safePath)) return { ok: false, error: "图片文件不存在" };
  const extension = path.extname(safePath).toLowerCase();
  if (!PORTRAIT_IMAGE_EXTENSIONS.has(extension)) return { ok: false, error: "只支持 png、jpg、jpeg、webp、gif 图片" };

  const stat = fs.statSync(safePath);
  if (stat.size > MAX_PORTRAIT_IMAGE_BYTES) {
    return { ok: false, error: `图片太大：${Math.round(stat.size / 1024 / 1024)}MB，限制 8MB` };
  }

  const image = nativeImage.createFromPath(safePath);
  if (image.isEmpty()) return { ok: false, error: "图片无法读取，请换一张" };
  const meta = getPortraitMetadata(safePath);
  const warnings = [];
  if (!meta.hasAlpha && extension !== ".gif") warnings.push("建议使用透明背景 PNG/WebP，桌宠边缘会更干净");
  if (meta.width < 256 || meta.height < 256) warnings.push("图片尺寸偏小，建议至少 512×512");
  if (meta.width > 2048 || meta.height > 2048) warnings.push("图片尺寸较大，可能增加内存占用");

  return { ok: true, meta, warnings };
}

function scoreMoodDelta({ emotion, message, screenContext, assistantText }) {
  const emotionDelta = {
    Confused: -8,
    Thinking: -2,
    Neutral: 0,
    Happy: 7,
    Encouraging: 5
  }[emotion] || 0;

  const text = `${message || ""}\n${screenContext || ""}\n${assistantText || ""}`;
  let sentimentDelta = 0;

  if (/开心|喜欢|谢谢|太好了|成功|舒服|棒|哈哈|顺利|love|great|nice|happy/i.test(text)) {
    sentimentDelta += 4;
  }
  if (/难受|焦虑|烦|崩|失败|报错|累|讨厌|压力|糟糕|sad|bad|error|failed/i.test(text)) {
    sentimentDelta -= 5;
  }
  if (/!|！/.test(text)) sentimentDelta += 1;

  return emotionDelta + sentimentDelta;
}

function updateMoodFromConversation({ emotion, message, screenContext, assistantText }) {
  const settings = readSettings();
  const nextScore = clampMoodScore(
    Number(settings.moodScore || DEFAULT_SETTINGS.moodScore) +
      scoreMoodDelta({ emotion, message, screenContext, assistantText })
  );

  return writeSettings({
    ...settings,
    moodScore: nextScore
  });
}

function readSettings() {
  migrateLegacyData();

  if (settingsCache) return settingsCache;

  const envProvider =
    process.env.LLM_PROVIDER && PROVIDERS[process.env.LLM_PROVIDER]
      ? process.env.LLM_PROVIDER
      : DEFAULT_SETTINGS.provider;

  const envDefaults = {
    provider: envProvider,
    model: process.env.LLM_MODEL || PROVIDERS[envProvider].defaultModel,
    systemPrompt: process.env.PET_SYSTEM_PROMPT || DEFAULT_SETTINGS.systemPrompt,
    voiceEnabled: process.env.PET_VOICE_ENABLED
      ? !/^(0|false|off|no)$/i.test(process.env.PET_VOICE_ENABLED)
      : DEFAULT_SETTINGS.voiceEnabled,
    ttsProvider: normalizeTtsProvider(process.env.PET_TTS_PROVIDER || DEFAULT_SETTINGS.ttsProvider),
    autoStartTts: process.env.PET_AUTO_START_TTS
      ? !/^(0|false|off|no)$/i.test(process.env.PET_AUTO_START_TTS)
      : DEFAULT_SETTINGS.autoStartTts,
    autoLaunch: process.env.PET_AUTO_LAUNCH
      ? !/^(0|false|off|no)$/i.test(process.env.PET_AUTO_LAUNCH)
      : DEFAULT_SETTINGS.autoLaunch,
    activeCharacterId: process.env.PET_CHARACTER || DEFAULT_SETTINGS.activeCharacterId,
    petScale: Number(process.env.PET_SCALE || DEFAULT_SETTINGS.petScale),
    moodScore: Number(process.env.PET_MOOD_SCORE || DEFAULT_SETTINGS.moodScore),
    petMood: normalizePetMood(process.env.PET_MOOD || DEFAULT_SETTINGS.petMood),
    intimacy: clampStatusPercent(process.env.PET_INTIMACY || DEFAULT_SETTINGS.intimacy, DEFAULT_SETTINGS.intimacy),
    energy: clampStatusPercent(process.env.PET_ENERGY || DEFAULT_SETTINGS.energy, DEFAULT_SETTINGS.energy),
    backgroundEnabled: normalizeBoolean(process.env.PET_BACKGROUND_ENABLED, DEFAULT_SETTINGS.backgroundEnabled),
    backgroundMoodLinkEnabled: normalizeBoolean(
      process.env.PET_BACKGROUND_MOOD_LINK_ENABLED,
      DEFAULT_SETTINGS.backgroundMoodLinkEnabled
    ),
    backgroundWeatherEnabled: normalizeBoolean(
      process.env.PET_BACKGROUND_WEATHER_ENABLED,
      DEFAULT_SETTINGS.backgroundWeatherEnabled
    ),
    backgroundCity: process.env.PET_BACKGROUND_CITY || DEFAULT_SETTINGS.backgroundCity,
    backgroundLatitude: process.env.PET_BACKGROUND_LATITUDE || DEFAULT_SETTINGS.backgroundLatitude,
    backgroundLongitude: process.env.PET_BACKGROUND_LONGITUDE || DEFAULT_SETTINGS.backgroundLongitude,
    aiScheduleEnabled: normalizeBoolean(process.env.PET_AI_SCHEDULE_ENABLED, DEFAULT_SETTINGS.aiScheduleEnabled),
    aiScheduleAutoAdjustEnabled: normalizeBoolean(
      process.env.PET_AI_SCHEDULE_AUTO_ADJUST_ENABLED,
      DEFAULT_SETTINGS.aiScheduleAutoAdjustEnabled
    ),
    aiScheduleItems: DEFAULT_SETTINGS.aiScheduleItems,
    proactiveEnabled: normalizeBoolean(process.env.PET_PROACTIVE_ENABLED, DEFAULT_SETTINGS.proactiveEnabled),
    proactiveVoiceEnabled: normalizeBoolean(process.env.PET_PROACTIVE_VOICE_ENABLED, DEFAULT_SETTINGS.proactiveVoiceEnabled),
    proactiveIntervalMinutes: Number(process.env.PET_PROACTIVE_INTERVAL_MINUTES || DEFAULT_SETTINGS.proactiveIntervalMinutes),
    moodAnimationEnabled: normalizeBoolean(process.env.PET_MOOD_ANIMATION_ENABLED, DEFAULT_SETTINGS.moodAnimationEnabled),
    moodPortraitPaths: DEFAULT_SETTINGS.moodPortraitPaths,
    portrait: "mood",
    sovitsDir: process.env.QWEN_TTS_DIR || process.env.GPT_SOVITS_DIR || DEFAULT_SETTINGS.sovitsDir,
    sovitsPython: process.env.QWEN_TTS_PYTHON || process.env.GPT_SOVITS_PYTHON || DEFAULT_SETTINGS.sovitsPython,
    sovitsApiScript:
      process.env.QWEN_TTS_API_SCRIPT || process.env.GPT_SOVITS_API_SCRIPT || DEFAULT_SETTINGS.sovitsApiScript,
    sovitsUrl: process.env.QWEN_TTS_URL || process.env.SOVITS_URL || DEFAULT_SETTINGS.sovitsUrl,
    sovitsRefAudioPath: process.env.SOVITS_REF_AUDIO_PATH || DEFAULT_SETTINGS.sovitsRefAudioPath,
    sovitsPromptText: process.env.SOVITS_PROMPT_TEXT || DEFAULT_SETTINGS.sovitsPromptText,
    sovitsPromptLang: process.env.SOVITS_PROMPT_LANG || DEFAULT_SETTINGS.sovitsPromptLang,
    sovitsTextLang: process.env.SOVITS_TEXT_LANG || DEFAULT_SETTINGS.sovitsTextLang,
    sovitsTextSplitMethod:
      process.env.SOVITS_TEXT_SPLIT_METHOD || DEFAULT_SETTINGS.sovitsTextSplitMethod,
    sovitsMediaType: process.env.SOVITS_MEDIA_TYPE || DEFAULT_SETTINGS.sovitsMediaType,
    sovitsSpeedFactor: Number(process.env.SOVITS_SPEED_FACTOR || DEFAULT_SETTINGS.sovitsSpeedFactor),
    qwenTtsMode: normalizeQwenTtsMode(process.env.QWEN_TTS_MODE || DEFAULT_SETTINGS.qwenTtsMode),
    qwenTtsCloneZeroShot: process.env.QWEN_TTS_CLONE_ZERO_SHOT
      ? /^(1|true|on|yes)$/i.test(process.env.QWEN_TTS_CLONE_ZERO_SHOT)
      : DEFAULT_SETTINGS.qwenTtsCloneZeroShot,
    qwenTtsModelPath: process.env.QWEN_TTS_MODEL || DEFAULT_SETTINGS.qwenTtsModelPath,
    qwenTtsSpeaker: process.env.QWEN_TTS_SPEAKER || DEFAULT_SETTINGS.qwenTtsSpeaker,
    qwenTtsLanguage: normalizeQwenTtsLanguage(process.env.QWEN_TTS_LANGUAGE || DEFAULT_SETTINGS.qwenTtsLanguage),
    qwenTtsMaxNewTokens: clampTtsMaxNewTokens(
      process.env.QWEN_TTS_MAX_NEW_TOKENS || DEFAULT_SETTINGS.qwenTtsMaxNewTokens
    ),
    siliconflowTtsBaseUrl:
      process.env.SILICONFLOW_TTS_BASE_URL ||
      process.env.SILICONFLOW_BASE_URL ||
      DEFAULT_SETTINGS.siliconflowTtsBaseUrl,
    siliconflowTtsModel: process.env.SILICONFLOW_TTS_MODEL || DEFAULT_SETTINGS.siliconflowTtsModel,
    siliconflowTtsVoice: process.env.SILICONFLOW_TTS_VOICE || DEFAULT_SETTINGS.siliconflowTtsVoice,
    siliconflowTtsRefAudioUrl:
      process.env.SILICONFLOW_TTS_REF_AUDIO_URL ||
      process.env.SILICONFLOW_TTS_REFERENCE_AUDIO_URL ||
      DEFAULT_SETTINGS.siliconflowTtsRefAudioUrl,
    siliconflowTtsRefText:
      process.env.SILICONFLOW_TTS_REF_TEXT ||
      process.env.SILICONFLOW_TTS_REFERENCE_TEXT ||
      DEFAULT_SETTINGS.siliconflowTtsRefText,
    siliconflowTtsResponseFormat:
      process.env.SILICONFLOW_TTS_RESPONSE_FORMAT || DEFAULT_SETTINGS.siliconflowTtsResponseFormat,
    siliconflowTtsSpeed: getEnvNumber("SILICONFLOW_TTS_SPEED", DEFAULT_SETTINGS.siliconflowTtsSpeed),
    siliconflowTtsSampleRate: getEnvNumber(
      "SILICONFLOW_TTS_SAMPLE_RATE",
      DEFAULT_SETTINGS.siliconflowTtsSampleRate
    )
  };

  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf8");
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...envDefaults,
      ...JSON.parse(raw)
    };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS, ...envDefaults };
  }

  return settingsCache;
}

function writeSettings(nextSettings) {
  const provider = PROVIDERS[nextSettings.provider] ? nextSettings.provider : DEFAULT_SETTINGS.provider;
  const currentSettings = readSettings();

  settingsCache = {
    ...currentSettings,
    provider,
    model: String(nextSettings.model || PROVIDERS[provider].defaultModel).trim() || PROVIDERS[provider].defaultModel,
    systemPrompt:
      String(nextSettings.systemPrompt || DEFAULT_SETTINGS.systemPrompt).trim() ||
      DEFAULT_SETTINGS.systemPrompt,
    voiceEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "voiceEnabled")
      ? nextSettings.voiceEnabled !== false
      : currentSettings.voiceEnabled !== false,
    ttsProvider: normalizeTtsProvider(nextSettings.ttsProvider || currentSettings.ttsProvider),
    autoStartTts: Object.prototype.hasOwnProperty.call(nextSettings, "autoStartTts")
      ? nextSettings.autoStartTts !== false
      : currentSettings.autoStartTts !== false,
    autoLaunch: Object.prototype.hasOwnProperty.call(nextSettings, "autoLaunch")
      ? nextSettings.autoLaunch === true
      : currentSettings.autoLaunch === true,
    activeCharacterId: String(nextSettings.activeCharacterId || currentSettings.activeCharacterId || DEFAULT_CHARACTER_ID).trim(),
    petScale: clampPetScale(nextSettings.petScale || currentSettings.petScale),
    moodScore: Object.prototype.hasOwnProperty.call(nextSettings, "moodScore")
      ? clampMoodScore(nextSettings.moodScore)
      : clampMoodScore(currentSettings.moodScore),
    petMood: Object.prototype.hasOwnProperty.call(nextSettings, "petMood")
      ? normalizePetMood(nextSettings.petMood)
      : normalizePetMood(currentSettings.petMood),
    intimacy: Object.prototype.hasOwnProperty.call(nextSettings, "intimacy")
      ? clampStatusPercent(nextSettings.intimacy, DEFAULT_SETTINGS.intimacy)
      : clampStatusPercent(currentSettings.intimacy, DEFAULT_SETTINGS.intimacy),
    energy: Object.prototype.hasOwnProperty.call(nextSettings, "energy")
      ? clampStatusPercent(nextSettings.energy, DEFAULT_SETTINGS.energy)
      : clampStatusPercent(currentSettings.energy, DEFAULT_SETTINGS.energy),
    backgroundEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "backgroundEnabled")
      ? normalizeBoolean(nextSettings.backgroundEnabled, DEFAULT_SETTINGS.backgroundEnabled)
      : normalizeBoolean(currentSettings.backgroundEnabled, DEFAULT_SETTINGS.backgroundEnabled),
    backgroundMoodLinkEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "backgroundMoodLinkEnabled")
      ? normalizeBoolean(nextSettings.backgroundMoodLinkEnabled, DEFAULT_SETTINGS.backgroundMoodLinkEnabled)
      : normalizeBoolean(currentSettings.backgroundMoodLinkEnabled, DEFAULT_SETTINGS.backgroundMoodLinkEnabled),
    backgroundWeatherEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "backgroundWeatherEnabled")
      ? normalizeBoolean(nextSettings.backgroundWeatherEnabled, DEFAULT_SETTINGS.backgroundWeatherEnabled)
      : normalizeBoolean(currentSettings.backgroundWeatherEnabled, DEFAULT_SETTINGS.backgroundWeatherEnabled),
    backgroundCity: String(nextSettings.backgroundCity || currentSettings.backgroundCity || DEFAULT_SETTINGS.backgroundCity).trim() || DEFAULT_SETTINGS.backgroundCity,
    backgroundLatitude: String(nextSettings.backgroundLatitude || currentSettings.backgroundLatitude || "").trim(),
    backgroundLongitude: String(nextSettings.backgroundLongitude || currentSettings.backgroundLongitude || "").trim(),
    aiScheduleEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "aiScheduleEnabled")
      ? normalizeBoolean(nextSettings.aiScheduleEnabled, DEFAULT_SETTINGS.aiScheduleEnabled)
      : normalizeBoolean(currentSettings.aiScheduleEnabled, DEFAULT_SETTINGS.aiScheduleEnabled),
    aiScheduleAutoAdjustEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "aiScheduleAutoAdjustEnabled")
      ? normalizeBoolean(nextSettings.aiScheduleAutoAdjustEnabled, DEFAULT_SETTINGS.aiScheduleAutoAdjustEnabled)
      : normalizeBoolean(currentSettings.aiScheduleAutoAdjustEnabled, DEFAULT_SETTINGS.aiScheduleAutoAdjustEnabled),
    aiScheduleItems: Object.prototype.hasOwnProperty.call(nextSettings, "aiScheduleItems")
      ? normalizeAiScheduleItems(nextSettings.aiScheduleItems)
      : normalizeAiScheduleItems(currentSettings.aiScheduleItems),
    proactiveEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "proactiveEnabled")
      ? normalizeBoolean(nextSettings.proactiveEnabled, DEFAULT_SETTINGS.proactiveEnabled)
      : normalizeBoolean(currentSettings.proactiveEnabled, DEFAULT_SETTINGS.proactiveEnabled),
    proactiveVoiceEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "proactiveVoiceEnabled")
      ? normalizeBoolean(nextSettings.proactiveVoiceEnabled, DEFAULT_SETTINGS.proactiveVoiceEnabled)
      : normalizeBoolean(currentSettings.proactiveVoiceEnabled, DEFAULT_SETTINGS.proactiveVoiceEnabled),
    proactiveIntervalMinutes: Math.min(60, Math.max(1, Number(nextSettings.proactiveIntervalMinutes || currentSettings.proactiveIntervalMinutes || DEFAULT_SETTINGS.proactiveIntervalMinutes))),
    moodAnimationEnabled: Object.prototype.hasOwnProperty.call(nextSettings, "moodAnimationEnabled")
      ? normalizeBoolean(nextSettings.moodAnimationEnabled, DEFAULT_SETTINGS.moodAnimationEnabled)
      : normalizeBoolean(currentSettings.moodAnimationEnabled, DEFAULT_SETTINGS.moodAnimationEnabled),
    moodPortraitPaths: normalizeMoodPortraitPaths({
      ...currentSettings.moodPortraitPaths,
      ...(nextSettings.moodPortraitPaths || {})
    }),
    interactionPortraitPaths: normalizeInteractionPortraitPaths({
      ...currentSettings.interactionPortraitPaths,
      ...(nextSettings.interactionPortraitPaths || {})
    }),
    portrait: "mood",
    customPortraitPath: String(nextSettings.customPortraitPath || currentSettings.customPortraitPath || "").trim(),
    sovitsDir: String(nextSettings.sovitsDir || "").trim(),
    sovitsPython: String(nextSettings.sovitsPython || DEFAULT_SETTINGS.sovitsPython).trim() || DEFAULT_SETTINGS.sovitsPython,
    sovitsApiScript:
      String(nextSettings.sovitsApiScript || DEFAULT_SETTINGS.sovitsApiScript).trim() ||
      DEFAULT_SETTINGS.sovitsApiScript,
    sovitsUrl: String(nextSettings.sovitsUrl || DEFAULT_SETTINGS.sovitsUrl).trim() || DEFAULT_SETTINGS.sovitsUrl,
    sovitsRefAudioPath: String(nextSettings.sovitsRefAudioPath || "").trim(),
    sovitsPromptText: String(nextSettings.sovitsPromptText || "").trim(),
    sovitsPromptLang:
      String(nextSettings.sovitsPromptLang || DEFAULT_SETTINGS.sovitsPromptLang).trim() ||
      DEFAULT_SETTINGS.sovitsPromptLang,
    sovitsTextLang:
      String(nextSettings.sovitsTextLang || DEFAULT_SETTINGS.sovitsTextLang).trim() ||
      DEFAULT_SETTINGS.sovitsTextLang,
    sovitsTextSplitMethod:
      String(nextSettings.sovitsTextSplitMethod || DEFAULT_SETTINGS.sovitsTextSplitMethod).trim() ||
      DEFAULT_SETTINGS.sovitsTextSplitMethod,
    sovitsMediaType:
      String(nextSettings.sovitsMediaType || DEFAULT_SETTINGS.sovitsMediaType).trim() ||
      DEFAULT_SETTINGS.sovitsMediaType,
    sovitsSpeedFactor: Number(nextSettings.sovitsSpeedFactor || DEFAULT_SETTINGS.sovitsSpeedFactor),
    qwenTtsMode: normalizeQwenTtsMode(nextSettings.qwenTtsMode || currentSettings.qwenTtsMode),
    qwenTtsCloneZeroShot: Object.prototype.hasOwnProperty.call(nextSettings, "qwenTtsCloneZeroShot")
      ? nextSettings.qwenTtsCloneZeroShot === true
      : currentSettings.qwenTtsCloneZeroShot !== false,
    qwenTtsModelPath:
      String(nextSettings.qwenTtsModelPath || currentSettings.qwenTtsModelPath || DEFAULT_SETTINGS.qwenTtsModelPath).trim() ||
      DEFAULT_SETTINGS.qwenTtsModelPath,
    qwenTtsSpeaker:
      String(nextSettings.qwenTtsSpeaker || currentSettings.qwenTtsSpeaker || DEFAULT_SETTINGS.qwenTtsSpeaker).trim() ||
      DEFAULT_SETTINGS.qwenTtsSpeaker,
    qwenTtsLanguage: normalizeQwenTtsLanguage(
      nextSettings.qwenTtsLanguage || currentSettings.qwenTtsLanguage || DEFAULT_SETTINGS.qwenTtsLanguage
    ),
    qwenTtsMaxNewTokens: clampTtsMaxNewTokens(
      nextSettings.qwenTtsMaxNewTokens || currentSettings.qwenTtsMaxNewTokens
    ),
    siliconflowTtsBaseUrl:
      String(currentSettings.siliconflowTtsBaseUrl || DEFAULT_SETTINGS.siliconflowTtsBaseUrl).trim() ||
      DEFAULT_SETTINGS.siliconflowTtsBaseUrl,
    siliconflowTtsModel:
      String(currentSettings.siliconflowTtsModel || DEFAULT_SETTINGS.siliconflowTtsModel).trim() ||
      DEFAULT_SETTINGS.siliconflowTtsModel,
    siliconflowTtsVoice: String(currentSettings.siliconflowTtsVoice || "").trim(),
    siliconflowTtsRefAudioUrl: String(currentSettings.siliconflowTtsRefAudioUrl || "").trim(),
    siliconflowTtsRefText: String(currentSettings.siliconflowTtsRefText || "").trim(),
    siliconflowTtsResponseFormat:
      String(currentSettings.siliconflowTtsResponseFormat || DEFAULT_SETTINGS.siliconflowTtsResponseFormat).trim() ||
      DEFAULT_SETTINGS.siliconflowTtsResponseFormat,
    siliconflowTtsSpeed: Number(currentSettings.siliconflowTtsSpeed || DEFAULT_SETTINGS.siliconflowTtsSpeed),
    siliconflowTtsSampleRate: Number(
      currentSettings.siliconflowTtsSampleRate || DEFAULT_SETTINGS.siliconflowTtsSampleRate
    )
  };

  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsCache, null, 2), "utf8");
  applyAutoLaunch(settingsCache.autoLaunch);
  applyWindowLayout(chatVisible);
  return settingsCache;
}

function getSovitsStatus() {
  return {
    running: Boolean(sovitsProcess && !sovitsProcess.killed),
    pid: sovitsProcess?.pid || null,
    log: sovitsLog.slice(-4000),
    tts: {
      ...ttsRequestStatus,
      elapsedSeconds: ttsRequestStatus.startedAt
        ? Math.max(0, (Date.now() - ttsRequestStatus.startedAt) / 1000)
        : null
    }
  };
}

function summarizeTtsError(error) {
  if (!error) return "未知错误";
  const raw = typeof error === "string" ? error : error.message || String(error);
  const text = raw.trim();
  if (!text) return "未知错误";
  try {
    const parsed = JSON.parse(text);
    if (parsed?.detail) return typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
    if (parsed?.error) return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    if (parsed?.message) return parsed.message;
  } catch {
    // Keep the original text when it is not JSON.
  }
  return text.length > 800 ? `${text.slice(0, 800)}...` : text;
}

function setTtsRequestStatus(stage, detail = "", textChars = ttsRequestStatus.textChars, meta = {}) {
  const isError = stage === "error";
  const errorDetail = isError ? summarizeTtsError(meta.error || detail) : null;
  ttsRequestStatus = {
    stage,
    detail: isError ? errorDetail : detail,
    startedAt:
      stage === "idle"
        ? null
        : ttsRequestStatus.startedAt || Date.now(),
    updatedAt: Date.now(),
    textChars: Number(textChars || 0),
    lastError: isError
      ? {
          message: errorDetail,
          status: meta.status || null,
          provider: meta.provider || null,
          url: meta.url || null,
          raw: summarizeTtsError(meta.raw || meta.error || detail),
          at: new Date().toISOString()
        }
      : ttsRequestStatus.lastError,
    lastRequest: meta.request || ttsRequestStatus.lastRequest || null
  };
}

async function getSovitsRuntimeStatus() {
  const status = getSovitsStatus();
  const settings = readSettings();
  status.config = {
    provider: normalizeTtsProvider(settings.ttsProvider),
    url: settings.sovitsUrl || "",
    mode: normalizeQwenTtsMode(settings.qwenTtsMode),
    language: normalizeQwenTtsLanguage(settings.qwenTtsLanguage),
    speaker: settings.qwenTtsSpeaker || "my_voice",
    modelPath: settings.qwenTtsModelPath || ""
  };
  if (!status.running || !settings.sovitsUrl) return status;

  try {
    const statusUrl = new URL(settings.sovitsUrl);
    statusUrl.pathname = "/status";
    statusUrl.search = "";
    const response = await fetch(statusUrl.href);
    if (response.ok) {
      const runtime = await response.json();
      status.tts = {
        ...status.tts,
        runtime,
        stage: runtime.stage || status.tts.stage,
        detail: runtime.detail || status.tts.detail,
        elapsedSeconds:
          typeof runtime.elapsed_seconds === "number"
            ? runtime.elapsed_seconds
            : status.tts.elapsedSeconds,
        textChars: runtime.text_chars || status.tts.textChars
      };
    } else {
      status.statusError = summarizeTtsError(await response.text());
    }
  } catch (error) {
    status.statusError = summarizeTtsError(error);
  }

  try {
    const healthUrl = new URL(settings.sovitsUrl);
    healthUrl.pathname = "/health";
    healthUrl.search = "";
    const response = await fetch(healthUrl.href);
    status.health = response.ok
      ? { ok: true, data: await response.json() }
      : { ok: false, status: response.status, error: summarizeTtsError(await response.text()) };
  } catch (error) {
    status.health = { ok: false, error: summarizeTtsError(error) };
  }

  return status;
}

function getTtsPort(url) {
  try {
    return new URL(url).port || (new URL(url).protocol === "https:" ? "443" : "80");
  } catch {
    return "8765";
  }
}

function getTtsHost(url) {
  try {
    return new URL(url).hostname || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

function getSovitsProcessConfigKey(settings) {
  return JSON.stringify({
    dir: settings.sovitsDir,
    python: settings.sovitsPython,
    script: settings.sovitsApiScript,
    url: settings.sovitsUrl,
    mode: normalizeQwenTtsMode(settings.qwenTtsMode),
    model: settings.qwenTtsModelPath,
    speaker: settings.qwenTtsSpeaker,
    language: normalizeQwenTtsLanguage(settings.qwenTtsLanguage),
    refAudio: settings.sovitsRefAudioPath,
    refText: settings.sovitsPromptText,
    cloneZeroShot: settings.qwenTtsCloneZeroShot !== false,
    maxTokens: clampTtsMaxNewTokens(settings.qwenTtsMaxNewTokens)
  });
}

function publicSettings(settings = readSettings()) {
  const provider = PROVIDERS[settings.provider] || PROVIDERS.deepseek;
  const mood = moodFromScore(settings.moodScore);
  const characters = loadCharacterPackages(app.getAppPath());
  const activeCharacter = getActiveCharacter(settings);
  return {
    ...settings,
    activeCharacterId: activeCharacter?.id || settings.activeCharacterId || DEFAULT_CHARACTER_ID,
    activeCharacter,
    characters: characters.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ttsDefaults: item.ttsDefaults
    })),
    mood,
    moodLabel: MOOD_LABELS[mood],
    moodScore: clampMoodScore(settings.moodScore),
    petMood: normalizePetMood(settings.petMood),
    intimacy: clampStatusPercent(settings.intimacy, DEFAULT_SETTINGS.intimacy),
    energy: clampStatusPercent(settings.energy, DEFAULT_SETTINGS.energy),
    aiScheduleEnabled: normalizeAiScheduleSettings(settings).aiScheduleEnabled,
    aiScheduleAutoAdjustEnabled: normalizeAiScheduleSettings(settings).aiScheduleAutoAdjustEnabled,
    aiScheduleItems: normalizeAiScheduleSettings(settings).aiScheduleItems,
    currentAiSchedule: findCurrentAiScheduleItem(settings),
    petMoodOptions: PET_MOOD_OPTIONS,
    moodOptions: MOOD_KEYS.map((key) => ({
      key,
      label: MOOD_LABELS[key],
      minScore: key === "Confused" ? 0 : key === "Thinking" ? 25 : key === "Neutral" ? 45 : key === "Happy" ? 65 : 85,
      maxScore: key === "Confused" ? 24 : key === "Thinking" ? 44 : key === "Neutral" ? 64 : key === "Happy" ? 84 : 100
    })),
    moodPortraitUrls: getMoodPortraitUrls(settings),
    moodPortraitMeta: getMoodPortraitMeta(settings),
    interactionPortraitSlots: ALL_INTERACTION_PORTRAIT_OPTIONS,
    interactionPortraitUrls: getInteractionPortraitUrls(settings),
    interactionPortraitMeta: getInteractionPortraitMeta(settings),
    providers: Object.entries(PROVIDERS).map(([id, item]) => ({
      id,
      label: item.label,
      baseUrl: item.baseUrl,
      defaultModel: item.defaultModel,
      hasApiKey: Boolean(process.env[item.apiKeyEnv])
    })),
    hasApiKey: Boolean(process.env[provider.apiKeyEnv]),
    apiKeyEnv: provider.apiKeyEnv,
    baseUrl: provider.baseUrl,
    ttsProvider: normalizeTtsProvider(settings.ttsProvider),
    ttsProviders: [
      { id: "local", label: "Local Qwen3-TTS" },
      { id: "siliconflow", label: "SiliconFlow API" }
    ],
    qwenTtsModes: [
      { id: "custom", label: "CustomVoice / 内置音色" },
      { id: "clone", label: "Voice Clone / 参考音频克隆" }
    ],
    qwenTtsMode: normalizeQwenTtsMode(settings.qwenTtsMode),
    qwenTtsLanguages: QWEN_TTS_LANGUAGES.map(({ id, label }) => ({ id, label })),
    qwenTtsLanguage: normalizeQwenTtsLanguage(settings.qwenTtsLanguage),
    hasSiliconflowTtsApiKey: Boolean(process.env.SILICONFLOW_API_KEY),
    siliconflowTtsApiKeyEnv: "SILICONFLOW_API_KEY",
    hasSovitsUrl: Boolean(settings.sovitsUrl),
    characterRag: getCharacterRag().getStats(activeCharacter),
    sovitsStatus: getSovitsStatus()
  };
}

function createWindow() {
  const bounds = getWindowBounds(false);

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    title: "Table Pet",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  applyAutoLaunch(readSettings().autoLaunch);

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => applyWindowLayout(false));
  mainWindow.on("blur", () => {
    if (chatVisible) applyWindowLayout(false);
  });
}

function normalizeAssistantText(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i);

  if (!match) {
    return {
      emotion: "Neutral",
      text: `[Emotion: Neutral]\n${raw || "我在呢。你可以继续跟我说。"}`
    };
  }

  const emotion = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  const safeEmotion = ALLOWED_EMOTIONS.has(emotion) ? emotion : "Neutral";
  return {
    emotion: safeEmotion,
    text: `[Emotion: ${safeEmotion}]\n${raw.slice(match[0].length).trim()}`
  };
}

function localFallbackReply(message, screenContext) {
  const content = String(message || "").trim();
  const hasScreenContext = String(screenContext || "").trim().length > 0;

  if (!content) return "[Emotion: Confused]\n我刚刚没听清，你再说一遍好不好？";

  if (/屏幕|界面|这个|报错|看看|识屏/.test(content) || hasScreenContext) {
    return "[Emotion: Thinking]\n我看到了你发来的屏幕文字信息。现在比较像是需要先定位关键信息：报错、占用、按钮状态或者当前页面标题。你把最困扰你的点再点明一下，我就能继续帮你拆。";
  }

  if (/谢谢|厉害|真棒|开心|哈哈|早|晚|你好|嗨/.test(content)) {
    return "[Emotion: Happy]\n嘿嘿，我在呢。能陪你一起把事情推进一点，我也挺开心的。";
  }

  if (/累|难受|焦虑|烦|崩|不想|压力/.test(content)) {
    return "[Emotion: Encouraging]\n先慢一点。你已经在处理这件事了，这就不是原地打转。我们可以把它切成很小的一步，先做最轻的那个。";
  }

  return "[Emotion: Neutral]\n我明白。你可以继续说，我会尽量用简单一点、自然一点的方式陪你把这件事理清楚。";
}

async function callOpenAICompatibleRaw(messages, { temperature = 0.2, maxTokens = 3000 } = {}) {
  const settings = readSettings();
  const provider = PROVIDERS[settings.provider] || PROVIDERS.deepseek;
  const apiKey = process.env[provider.apiKeyEnv];
  const model = settings.model || provider.defaultModel;

  if (!apiKey) {
    throw new Error(`${provider.apiKeyEnv} 未配置，无法使用 LLM 整理记忆`);
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function stripJsonFences(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractBalancedJsonObject(text) {
  const clean = stripJsonFences(text);
  const start = clean.indexOf("{");
  if (start < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < clean.length; index += 1) {
    const char = clean[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return clean.slice(start, index + 1);
  }

  return clean.slice(start);
}

function lightlyRepairJson(text) {
  return String(text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function jsonPreview(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .slice(0, 800);
}

function parseJsonObjectFromText(text) {
  const clean = stripJsonFences(text);
  const candidates = [clean, extractBalancedJsonObject(clean)]
    .filter(Boolean)
    .flatMap((candidate) => [candidate, lightlyRepairJson(candidate)]);

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`LLM 返回的 JSON 无法解析：${lastError?.message || "未知错误"}。输出预览：${jsonPreview(clean)}`);
}

function getAiScheduleSnapshot(settings = readSettings()) {
  const normalized = normalizeAiScheduleSettings(settings);
  return {
    ...normalized,
    current: findCurrentAiScheduleItem(settings),
    updatedAt: new Date().toISOString()
  };
}

function applyAiSchedulePatch(result = {}) {
  const settings = readSettings();
  const existing = normalizeAiScheduleItems(settings.aiScheduleItems);
  const changes = Array.isArray(result.changes) ? result.changes : [];
  let nextItems = [...existing];

  for (const change of changes.slice(0, 12)) {
    const action = String(change?.action || "").toLowerCase();
    const id = String(change?.id || "").trim();
    if (action === "delete" && id) {
      nextItems = nextItems.filter((item) => item.id !== id);
      continue;
    }

    const item = {
      id: id || scheduleId("ai"),
      start: change?.start,
      end: change?.end,
      activity: change?.activity,
      moodHint: change?.moodHint,
      energyDelta: change?.energyDelta,
      enabled: change?.enabled !== false
    };
    const normalized = normalizeAiScheduleItems([item])[0];
    const index = nextItems.findIndex((entry) => entry.id === normalized.id);
    if (action === "update" && index >= 0) {
      nextItems[index] = { ...nextItems[index], ...normalized };
    } else if (action === "add" || action === "update") {
      nextItems.push(normalized);
    }
  }

  const saved = writeSettings({
    ...settings,
    aiScheduleItems: normalizeAiScheduleItems(nextItems)
  });
  return {
    summary: String(result.summary || "日程已更新").trim(),
    snapshot: getAiScheduleSnapshot(saved)
  };
}

function shouldAutoAdjustSchedule({ message, screenContext, assistantText }) {
  const text = `${message || ""}\n${screenContext || ""}\n${assistantText || ""}`;
  return /日程|安排|计划|时间表|作息|待会|今晚|明天|早上|上午|中午|下午|晚上|schedule|routine|plan/i.test(text);
}

async function maybeAutoAdjustScheduleWithLlm({ message, screenContext, assistantText }) {
  const settings = readSettings();
  const schedule = normalizeAiScheduleSettings(settings);
  if (!schedule.aiScheduleEnabled || !schedule.aiScheduleAutoAdjustEnabled) return null;
  if (!shouldAutoAdjustSchedule({ message, screenContext, assistantText })) return null;

  const messages = [
    {
      role: "system",
      content: [
        "你是桌宠自己的日程管理器。",
        "只有当对话中明显需要改变她自己的作息、活动安排、陪伴时间时，才修改日程。",
        "不要修改用户日程，只修改 AI/桌宠自己的日程。",
        "只返回严格 JSON，不要 Markdown。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "当前日程：",
        JSON.stringify(schedule.aiScheduleItems, null, 2),
        "对话：",
        JSON.stringify({ message, screenContext, assistantText }, null, 2),
        "返回格式：",
        "{\"summary\":\"原因\",\"changes\":[{\"action\":\"add|update|delete\",\"id\":\"可选\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",\"activity\":\"她做的事\",\"moodHint\":\"语气提示\",\"energyDelta\":0,\"enabled\":true}]}"
      ].join("\n")
    }
  ];

  const responseText = await callOpenAICompatibleRaw(messages, { temperature: 0.1, maxTokens: 1200 });
  const parsed = parseJsonObjectFromText(responseText);
  return applyAiSchedulePatch(parsed);
}

function toolSystemPrompt() {
  return [
    "【本地工具调用】",
    "当用户明确需要实时/本地信息时，可以调用工具。工具调用格式必须单独一行：[[tool:工具名 {\"参数\":\"值\"}]]。",
    "可用工具：",
    "time.now：读取当前本地时间。参数：{}",
    "weather.current：读取当前天气和背景。参数：{}",
    "schedule.current：读取 AI 当前日程。参数：{}",
    "tts.status：读取语音服务状态。参数：{}",
    "memory.search：搜索长期记忆。参数：{\"query\":\"关键词\"}",
    "规则：只在确实需要时调用；不要编造工具结果；工具结果会由系统返回后再生成最终回答。"
  ].join("\n");
}

function stripToolCalls(text) {
  return String(text || "").replace(/\[\[tool:[^\]]+\]\]/gi, "").trim();
}

function extractToolCalls(text) {
  const calls = [];
  const regex = /\[\[tool:([a-z0-9_.-]+)(?:\s+({[\s\S]*?}))?\]\]/gi;
  let match;
  while ((match = regex.exec(String(text || "")))) {
    let args = {};
    if (match[2]) {
      try {
        args = JSON.parse(match[2]);
      } catch {
        args = {};
      }
    }
    calls.push({ name: match[1], args });
  }
  return calls.slice(0, 4);
}

async function invokeLocalTool(name, args = {}) {
  const safeName = String(name || "").trim();
  if (safeName === "time.now") return localTimeBackground();
  if (safeName === "weather.current") return getBackgroundInfo({ force: false });
  if (safeName === "schedule.current") return getAiScheduleSnapshot();
  if (safeName === "tts.status") return getSovitsRuntimeStatus();
  if (safeName === "memory.search") {
    return getMemoryStore().getPublicSnapshot(String(args.query || "").slice(0, 80));
  }
  throw new Error(`未知工具：${safeName}`);
}

async function runToolCalls(calls) {
  const results = [];
  for (const call of calls) {
    try {
      results.push({ name: call.name, ok: true, result: await invokeLocalTool(call.name, call.args) });
    } catch (error) {
      results.push({ name: call.name, ok: false, error: error.message || String(error) });
    }
  }
  return results;
}

async function checkProactiveReminder() {
  const settings = readSettings();
  if (!normalizeBoolean(settings.proactiveEnabled, DEFAULT_SETTINGS.proactiveEnabled)) return { ok: false, reason: "disabled" };
  const intervalMs = Math.min(60, Math.max(1, Number(settings.proactiveIntervalMinutes || 5))) * 60 * 1000;
  if (Date.now() - lastProactiveReminderAt < intervalMs) return { ok: false, reason: "cooldown" };

  const background = await getBackgroundInfo().catch(() => null);
  const linked = background?.linkedStatus || linkedPetStatus(settings, { time: localTimeBackground(), weather: null });
  const current = findCurrentAiScheduleItem(settings, background?.time || localTimeBackground());
  const hour = background?.time?.hour ?? new Date().getHours();
  const weather = background?.weather?.weather || "";
  let key = "";
  let emotion = "Neutral";
  let text = "";

  if (hour >= 23 || hour < 5) {
    key = "late-night";
    emotion = "Encouraging";
    text = "[Emotion: Encouraging]\n已经很晚了。我现在也进入低能量模式了，你最好别硬撑太久，收个尾就休息。";
  } else if (linked.energy <= 25) {
    key = "low-energy";
    emotion = "Thinking";
    text = "[Emotion: Thinking]\n我这边状态显示精力偏低。你也可以顺手休息两分钟，喝口水再继续。";
  } else if (/下雨|雷雨|下雪/.test(weather)) {
    key = `weather-${weather}`;
    emotion = "Neutral";
    text = `[Emotion: Neutral]\n外面现在是${weather}。如果你待会要出门，记得看一下衣服和雨具。`;
  } else if (current && /学习|项目|处理/.test(current.activity)) {
    key = `schedule-${current.id}`;
    emotion = "Thinking";
    text = `[Emotion: Thinking]\n现在按我的日程是「${current.activity}」。你要不要顺手推进一个最小任务？`;
  } else if (current && /复盘|聊天|陪/.test(current.activity)) {
    key = `schedule-${current.id}`;
    emotion = "Happy";
    text = `[Emotion: Happy]\n现在是我的「${current.activity}」时间。你可以把今天最想处理的一件事丢给我。`;
  }

  if (!text || key === lastProactiveReminderKey) return { ok: false, reason: text ? "duplicate" : "no-event" };
  lastProactiveReminderAt = Date.now();
  lastProactiveReminderKey = key;
  return {
    ok: true,
    key,
    emotion,
    text,
    speak: normalizeBoolean(settings.proactiveVoiceEnabled, DEFAULT_SETTINGS.proactiveVoiceEnabled),
    background,
    currentSchedule: current
  };
}

function memoryItemsForLlm(data) {
  return [...(data.profile || []), ...(data.summaries || []), ...(data.memories || [])]
    .filter((item) => !item.archived)
    .slice(0, 220)
    .map((item) => ({
      id: item.id,
      type: item.type,
      category: item.category,
      tags: item.tags,
      pinned: Boolean(item.pinned),
      sensitive: Boolean(item.sensitive),
      source: item.source,
      strength: Number(item.strength || 1),
      updatedAt: item.updatedAt,
      content: item.content
    }));
}

async function organizeMemoryWithLlm() {
  const store = getMemoryStore();
  const data = store.exportData();
  const items = memoryItemsForLlm(data);
  if (!items.length) return store.getPublicSnapshot();

  const messages = [
    {
      role: "system",
      content: [
        "你是本地桌宠的长期记忆整理器。",
        "过滤低价值记忆，合并重复记忆，压缩冗长对话，保留对未来对话有帮助的事实。",
        "不要保留临时寒暄、纯报错噪音、重复项、已经过时的过程性内容。",
        "必须只返回严格 JSON 对象。不要 Markdown，不要代码块，不要注释。",
        "JSON 必须可以被 JSON.parse 直接解析：双引号、数组元素之间有逗号、没有尾随逗号、没有多余说明。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请整理下面的记忆。只返回这个 JSON 结构：",
        "{\"summary\":\"本次整理摘要\",\"memories\":[{\"type\":\"profile\",\"content\":\"整理后的记忆\",\"category\":\"project\",\"tags\":[\"标签\"],\"pinned\":false,\"sensitive\":false,\"strength\":1.2,\"sourceIds\":[\"原记忆id\"]}]}",
        "字段限制：type 只能是 profile、summary、dialogue；category 只能是 project、life、preference；tags 最多 5 个短标签；content 不要超过 120 字。",
        "记忆列表：",
        JSON.stringify(items, null, 2)
      ].join("\n")
    }
  ];

  const responseText = await callOpenAICompatibleRaw(messages, { temperature: 0, maxTokens: 3500 });
  try {
    const parsed = parseJsonObjectFromText(responseText);
    return store.organizeFromLlmResult(parsed);
  } catch (firstError) {
    const repairMessages = [
      {
        role: "system",
        content: "你是 JSON 修复器。只修复语法，不要改写内容。只返回一个可以被 JSON.parse 解析的 JSON 对象，不要 Markdown。"
      },
      {
        role: "user",
        content: [
          `下面的 JSON 解析失败：${firstError.message}`,
          "请修复为严格 JSON。保留 summary 和 memories 字段。",
          "原始输出：",
          responseText
        ].join("\n")
      }
    ];
    const repairedText = await callOpenAICompatibleRaw(repairMessages, { temperature: 0, maxTokens: 3500 });
    try {
      const parsed = parseJsonObjectFromText(repairedText);
      return store.organizeFromLlmResult(parsed);
    } catch (secondError) {
      throw new Error([
        "LLM 整理结果不是合法 JSON，自动修复也失败。",
        `首次错误：${firstError.message}`,
        `修复后错误：${secondError.message}`,
        `原始输出预览：${jsonPreview(responseText)}`,
        `修复输出预览：${jsonPreview(repairedText)}`
      ].join("\n"));
    }
  }
}

async function callOpenAICompatibleChat({ message, history, screenContext } = {}) {
  const settings = readSettings();
  const provider = PROVIDERS[settings.provider] || PROVIDERS.deepseek;
  const apiKey = process.env[provider.apiKeyEnv];
  const model = settings.model || provider.defaultModel;
  const historyItems = Array.isArray(history) ? history : [];
  const activeCharacter = getActiveCharacter(settings);

  if (!apiKey) return localFallbackReply(message, screenContext);

  const background = await getBackgroundInfo().catch((error) => ({
    enabled: true,
    moodLinkEnabled: false,
    weatherEnabled: false,
    city: "",
    time: localTimeBackground(),
    weather: null,
    error: formatBackgroundError(error),
    linkedStatus: linkedPetStatus(settings, { time: localTimeBackground(), weather: null })
  }));
  const memoryContext = getMemoryStore().buildContext({ message, screenContext });
  const characterContext = getCharacterRag().buildContext({
    message,
    screenContext,
    history: historyItems,
    characterPackage: activeCharacter
  });
  const messages = [
    { role: "system", content: settings.systemPrompt },
    ...(activeCharacter?.systemPrompt ? [{ role: "system", content: activeCharacter.systemPrompt }] : []),
    ...(backgroundPrompt(background) ? [{ role: "system", content: backgroundPrompt(background) }] : []),
    ...(aiSchedulePrompt(settings, background) ? [{ role: "system", content: aiSchedulePrompt(settings, background) }] : []),
    { role: "system", content: petStatusPrompt(settings, background) },
    { role: "system", content: toolSystemPrompt() },
    { role: "system", content: outputPromptForSpeechLanguage(settings.qwenTtsLanguage) },
    ...(characterContext ? [{ role: "system", content: characterContext }] : []),
    ...(memoryContext ? [{ role: "system", content: memoryContext }] : []),
    ...historyItems.slice(-10).map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content
    })),
    {
      role: "user",
      content: screenContext
        ? `用户输入：${message}\n\n系统识屏文本：\n${screenContext}`
        : message
    }
  ];

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.8 })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  const firstText = data.choices?.[0]?.message?.content || "";
  const calls = extractToolCalls(firstText);
  if (!calls.length) return stripToolCalls(firstText);

  const toolResults = await runToolCalls(calls);
  const followupText = await callOpenAICompatibleRaw([
    ...messages,
    { role: "assistant", content: firstText },
    {
      role: "system",
      content: [
        "【工具结果】",
        JSON.stringify(toolResults, null, 2),
        "请基于工具结果生成最终回复。不要再输出工具调用标记。"
      ].join("\n")
    }
  ], { temperature: 0.6, maxTokens: 3000 }).catch(() => firstText);
  return stripToolCalls(followupText);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function speechLabelsForLanguage(language) {
  const normalized = normalizeQwenTtsLanguage(language);
  return SPEECH_SECTION_LABELS[normalized] || SPEECH_SECTION_LABELS.Japanese;
}

function allSpeechSectionLabels() {
  return [...new Set(Object.values(SPEECH_SECTION_LABELS).flat())];
}

function extractSpeechForLanguage(text, language) {
  const normalizedLanguage = normalizeQwenTtsLanguage(language);
  const withoutEmotion = String(text || "")
    .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
    .trim();
  const targetLabels = speechLabelsForLanguage(normalizedLanguage).map(escapeRegExp).join("|");
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

async function callSovits(text) {
  const settings = readSettings();
  if (settings.voiceEnabled === false) return { ok: false, skipped: true, reason: "voice disabled" };
  if (normalizeTtsProvider(settings.ttsProvider) === "siliconflow") {
    return callSiliconflowTts(text, settings);
  }
  if (!settings.sovitsUrl) return { ok: false, skipped: true };
  const ttsMode = normalizeQwenTtsMode(settings.qwenTtsMode);
  const refAudioPath = String(settings.sovitsRefAudioPath || "").trim();
  if (ttsMode === "clone" && !refAudioPath) {
    return { ok: false, skipped: true, reason: "missing voice clone reference audio" };
  }
  const speechLanguage = normalizeQwenTtsLanguage(settings.qwenTtsLanguage);
  const spoken = extractSpeechForLanguage(text, speechLanguage);
  if (!spoken) return { ok: false, skipped: true, reason: `missing ${speechLanguage} speech text` };

  const started = startSovitsService();
  if (!started.ok) return { ok: false, skipped: true, reason: started.error };

  const requestMeta = {
    provider: "local",
    url: settings.sovitsUrl,
    request: {
      mode: ttsMode,
      language: speechLanguage,
      speaker: settings.qwenTtsSpeaker || "my_voice",
      textChars: spoken.length,
      maxNewTokens: maxTokensForSpeech(spoken, settings.qwenTtsMaxNewTokens)
    }
  };
  setTtsRequestStatus("requesting", "发送文本到本地 Qwen3-TTS", spoken.length, requestMeta);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(settings.sovitsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        text: spoken,
        mode: ttsMode,
        language: speechLanguage,
        speaker: settings.qwenTtsSpeaker || "my_voice",
        ref_audio: refAudioPath,
        ref_text: settings.sovitsPromptText || "",
        x_vector_only_mode: settings.qwenTtsCloneZeroShot !== false || !String(settings.sovitsPromptText || "").trim(),
        top_p: 0.8,
        temperature: 0.6,
        max_new_tokens: maxTokensForSpeech(spoken, settings.qwenTtsMaxNewTokens)
      })
    });
  } catch (error) {
    if (error.name === "AbortError") {
      stopSovitsService();
      const message = "本地语音推理超时，已中断本次任务。";
      setTtsRequestStatus("error", message, spoken.length, { ...requestMeta, error: message });
      return { ok: false, error: message };
    }
    setTtsRequestStatus("error", error.message, spoken.length, { ...requestMeta, error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const message = summarizeTtsError(errorText || `TTS failed: ${response.status}`);
    setTtsRequestStatus("error", message, spoken.length, {
      ...requestMeta,
      status: response.status,
      error: message,
      raw: errorText
    });
    return { ok: false, status: response.status, error: message, rawError: errorText };
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("audio/")) {
    setTtsRequestStatus("receiving", "接收本地语音音频", spoken.length);
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    setTtsRequestStatus("idle", "语音生成完成", 0);
    return {
      ok: true,
      mimeType: contentType || "audio/wav",
      audioBase64: audioBuffer.toString("base64")
    };
  }

  const result = await response.text();
  setTtsRequestStatus("idle", "语音请求完成", 0);
  return { ok: true, result };
}

async function callSiliconflowTts(text, settings = readSettings()) {
  const spoken = extractSpeechForLanguage(text, settings.qwenTtsLanguage);
  if (!spoken) return { ok: false, skipped: true, reason: "missing speech text" };

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, reason: "SILICONFLOW_API_KEY is missing" };

  const baseUrl = String(settings.siliconflowTtsBaseUrl || DEFAULT_SILICONFLOW_TTS_BASE_URL).replace(/\/+$/, "");
  const model = String(settings.siliconflowTtsModel || "").trim();
  if (!model) return { ok: false, skipped: true, reason: "SILICONFLOW_TTS_MODEL is missing" };

  const responseFormat = String(settings.siliconflowTtsResponseFormat || "mp3").trim() || "mp3";
  const refAudioUrl = String(settings.siliconflowTtsRefAudioUrl || "").trim();
  const refText = String(settings.siliconflowTtsRefText || "").trim();
  const voice = String(settings.siliconflowTtsVoice || "").trim();
  const body = {
    model,
    input: spoken,
    response_format: responseFormat,
    stream: false,
    speed: Number(settings.siliconflowTtsSpeed || 1),
    sample_rate: Number(settings.siliconflowTtsSampleRate || DEFAULT_SETTINGS.siliconflowTtsSampleRate)
  };

  if (/^FunAudioLLM\/CosyVoice2/i.test(model) && isLocalAudioReference(refAudioUrl)) {
    body.voice = await uploadSiliconflowVoice({
      apiKey,
      baseUrl,
      model,
      refAudioPath: refAudioUrl,
      refText
    });
  } else if (refAudioUrl) {
    body.references = [{ audio: audioReferenceToApiValue(refAudioUrl), text: refText }];
  } else if (!voice) {
    return { ok: false, skipped: true, reason: "SILICONFLOW_TTS_VOICE is missing" };
  } else {
    body.voice = voice;
  }

  const requestMeta = {
    provider: "siliconflow",
    url: `${baseUrl}/audio/speech`,
    request: {
      model,
      responseFormat,
      textChars: spoken.length
    }
  };
  setTtsRequestStatus("requesting", "Sending text to SiliconFlow TTS", spoken.length, requestMeta);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify(body)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const message = "SiliconFlow TTS request timed out";
      setTtsRequestStatus("error", message, spoken.length, { ...requestMeta, error: message });
      return { ok: false, error: message };
    }
    setTtsRequestStatus("error", error.message, spoken.length, { ...requestMeta, error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const message = summarizeTtsError(errorText || `SiliconFlow TTS failed: ${response.status}`);
    setTtsRequestStatus("error", message, spoken.length, {
      ...requestMeta,
      status: response.status,
      error: message,
      raw: errorText
    });
    return { ok: false, status: response.status, error: message, rawError: errorText };
  }

  const contentType = response.headers.get("content-type") || `audio/${responseFormat}`;
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  setTtsRequestStatus("idle", "SiliconFlow TTS completed", 0);
  return {
    ok: true,
    mimeType: contentType,
    audioBase64: audioBuffer.toString("base64")
  };
}

async function uploadSiliconflowVoice({ apiKey, baseUrl, model, refAudioPath, refText }) {
  const stat = fs.statSync(refAudioPath);
  const cacheKey = JSON.stringify({
    model,
    refAudioPath,
    refText,
    mtimeMs: stat.mtimeMs,
    size: stat.size
  });
  const cached = siliconflowVoiceUploadCache.get(cacheKey);
  if (cached) return cached;

  setTtsRequestStatus("requesting", "Uploading reference audio to SiliconFlow", 0);

  const extension = path.extname(refAudioPath).toLowerCase().replace(".", "");
  const mimeType =
    extension === "mp3"
      ? "audio/mpeg"
      : extension === "ogg"
        ? "audio/ogg"
        : extension === "flac"
          ? "audio/flac"
          : extension === "m4a"
            ? "audio/mp4"
            : "audio/wav";
  const form = new FormData();
  form.append("model", model);
  form.append("customName", `tablepet-${Date.now()}`);
  form.append("text", refText || "reference audio");
  form.append("file", new Blob([fs.readFileSync(refAudioPath)], { type: mimeType }), path.basename(refAudioPath));

  const response = await fetch(`${baseUrl}/uploads/audio/voice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!response.ok) {
    throw new Error(`SiliconFlow voice upload failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.uri) throw new Error("SiliconFlow voice upload did not return uri");
  siliconflowVoiceUploadCache.set(cacheKey, data.uri);
  return data.uri;
}

async function importMoodPortrait(moodKey) {
  const safeMood = MOOD_KEYS.includes(moodKey) ? moodKey : moodFromScore(readSettings().moodScore);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `导入${MOOD_LABELS[safeMood]}心情立绘`,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const sourcePath = result.filePaths[0];
  const validation = validatePortraitImage(sourcePath);
  if (!validation.ok) return { canceled: false, ok: false, error: validation.error };
  const extension = path.extname(sourcePath).toLowerCase() || ".png";
  const targetPath = path.join(getPortraitDir(), `${safeMood}-${Date.now()}${extension}`);

  fs.mkdirSync(getPortraitDir(), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);

  const currentSettings = readSettings();
  const settings = writeSettings({
    ...currentSettings,
    portrait: "mood",
    moodPortraitPaths: {
      ...currentSettings.moodPortraitPaths,
      [safeMood]: targetPath
    }
  });

  return { canceled: false, ok: true, settings: publicSettings(settings), meta: getPortraitMetadata(targetPath), warnings: validation.warnings };
}

async function importInteractionPortrait(slotKey) {
  const safeSlot = INTERACTION_PORTRAIT_KEYS.includes(slotKey) ? slotKey : "idle";
  const slotLabel = INTERACTION_PORTRAIT_OPTIONS.find((item) => item.key === safeSlot)?.label || safeSlot;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `导入${slotLabel}互动立绘`,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const sourcePath = result.filePaths[0];
  const validation = validatePortraitImage(sourcePath);
  if (!validation.ok) return { canceled: false, ok: false, error: validation.error };
  const extension = path.extname(sourcePath).toLowerCase() || ".png";
  const targetPath = path.join(getPortraitDir(), `interaction-${safeSlot}-${Date.now()}${extension}`);

  fs.mkdirSync(getPortraitDir(), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);

  const currentSettings = readSettings();
  const settings = writeSettings({
    ...currentSettings,
    portrait: "mood",
    interactionPortraitPaths: {
      ...currentSettings.interactionPortraitPaths,
      [safeSlot]: targetPath
    }
  });

  return { canceled: false, ok: true, settings: publicSettings(settings), meta: getPortraitMetadata(targetPath), warnings: validation.warnings };
}

function resetMoodPortrait(moodKey) {
  const safeMood = MOOD_KEYS.includes(moodKey) ? moodKey : moodFromScore(readSettings().moodScore);
  const currentSettings = readSettings();
  const settings = writeSettings({
    ...currentSettings,
    moodPortraitPaths: {
      ...currentSettings.moodPortraitPaths,
      [safeMood]: ""
    }
  });
  return { ok: true, settings: publicSettings(settings) };
}

function resetInteractionPortrait(slotKey) {
  const safeSlot = INTERACTION_PORTRAIT_KEYS.includes(slotKey) ? slotKey : "idle";
  const currentSettings = readSettings();
  const settings = writeSettings({
    ...currentSettings,
    interactionPortraitPaths: {
      ...currentSettings.interactionPortraitPaths,
      [safeSlot]: ""
    }
  });
  return { ok: true, settings: publicSettings(settings) };
}

function openPortraitFolder() {
  fs.mkdirSync(getPortraitDir(), { recursive: true });
  shell.openPath(getPortraitDir());
  return { ok: true, path: getPortraitDir() };
}

function cleanupUnusedPortraits() {
  const portraitDir = getPortraitDir();
  fs.mkdirSync(portraitDir, { recursive: true });
  const settings = readSettings();
  const usedPaths = new Set([
    ...Object.values(normalizeMoodPortraitPaths(settings.moodPortraitPaths)),
    ...Object.values(normalizeInteractionPortraitPaths(settings.interactionPortraitPaths)),
    String(settings.customPortraitPath || "")
  ].filter(Boolean).map((item) => path.resolve(item)));

  const removed = [];
  const kept = [];
  for (const fileName of fs.readdirSync(portraitDir)) {
    const filePath = path.join(portraitDir, fileName);
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || !PORTRAIT_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())) continue;
    if (usedPaths.has(path.resolve(filePath))) {
      kept.push(fileName);
      continue;
    }
    fs.unlinkSync(filePath);
    removed.push(fileName);
  }

  return { ok: true, removedCount: removed.length, keptCount: kept.length, removed };
}

async function selectSovitsReferenceAudio() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择参考音频",
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "ogg", "flac", "m4a"] }]
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const settings = writeSettings({
    ...readSettings(),
    sovitsRefAudioPath: result.filePaths[0]
  });

  return { canceled: false, settings: publicSettings(settings) };
}

async function selectSovitsDir() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择本地 Qwen3-TTS 项目目录",
    properties: ["openDirectory"]
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const settings = writeSettings({
    ...readSettings(),
    sovitsDir: result.filePaths[0]
  });

  return { canceled: false, settings: publicSettings(settings) };
}

async function exportMemory() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "导出长期记忆",
    defaultPath: `tablepet-memory-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, JSON.stringify(getMemoryStore().exportData(), null, 2), "utf8");
  return { canceled: false, filePath: result.filePath, snapshot: getMemoryStore().getPublicSnapshot() };
}

async function importMemory() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "导入长期记忆",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const nextData = JSON.parse(fs.readFileSync(result.filePaths[0], "utf8"));
  return {
    canceled: false,
    filePath: result.filePaths[0],
    snapshot: getMemoryStore().importData(nextData)
  };
}

function startSovitsService() {
  const settings = readSettings();
  const configKey = getSovitsProcessConfigKey(settings);
  if (sovitsProcess && !sovitsProcess.killed) {
    if (sovitsProcessConfigKey === configKey) {
      return { ok: true, alreadyRunning: true, status: getSovitsStatus() };
    }
    sovitsProcess.kill();
    sovitsProcess = null;
  }

  if (!settings.sovitsDir || !fs.existsSync(settings.sovitsDir)) {
    return { ok: false, error: "请先选择本地 Qwen3-TTS 项目目录。" };
  }

  const scriptPath = path.isAbsolute(settings.sovitsApiScript)
    ? settings.sovitsApiScript
    : path.join(settings.sovitsDir, settings.sovitsApiScript);

  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: `找不到 API 脚本：${scriptPath}` };
  }

  sovitsProcessConfigKey = configKey;
  sovitsLog = "";
  sovitsProcess = spawn(settings.sovitsPython, [scriptPath], {
    cwd: settings.sovitsDir,
    windowsHide: true,
    shell: false,
    env: {
      ...process.env,
      QWEN_TTS_MODE: normalizeQwenTtsMode(settings.qwenTtsMode),
      QWEN_TTS_MODEL: settings.qwenTtsModelPath || QWEN_TTS_MODEL_PATH,
      QWEN_TTS_SPEAKER: settings.qwenTtsSpeaker || "my_voice",
      QWEN_TTS_LANGUAGE: normalizeQwenTtsLanguage(settings.qwenTtsLanguage),
      QWEN_TTS_REF_AUDIO: settings.sovitsRefAudioPath || "",
      QWEN_TTS_REF_TEXT: settings.sovitsPromptText || "",
      QWEN_TTS_CLONE_ZERO_SHOT: settings.qwenTtsCloneZeroShot !== false ? "1" : "0",
      QWEN_TTS_MAX_NEW_TOKENS: String(clampTtsMaxNewTokens(settings.qwenTtsMaxNewTokens)),
      QWEN_TTS_HOST: getTtsHost(settings.sovitsUrl),
      QWEN_TTS_PORT: getTtsPort(settings.sovitsUrl),
      QWEN_TTS_DTYPE: process.env.QWEN_TTS_DTYPE || "bfloat16",
      QWEN_TTS_FLASH_ATTN: process.env.QWEN_TTS_FLASH_ATTN || "0",
      ELECTRON_RUN_AS_NODE: undefined
    }
  });
  const currentProcess = sovitsProcess;

  currentProcess.stdout.on("data", (chunk) => {
    sovitsLog += chunk.toString();
    sovitsLog = sovitsLog.slice(-8000);
  });

  currentProcess.stderr.on("data", (chunk) => {
    sovitsLog += chunk.toString();
    sovitsLog = sovitsLog.slice(-8000);
  });

  currentProcess.on("exit", (code) => {
    sovitsLog += `\nQwen3-TTS exited with code ${code}\n`;
    if (sovitsProcess === currentProcess) {
      sovitsProcess = null;
      sovitsProcessConfigKey = "";
    }
  });

  currentProcess.on("error", (error) => {
    sovitsLog += `\n${error.message}\n`;
  });

  return { ok: true, status: getSovitsStatus() };
}

function stopSovitsService() {
  if (ttsQueue) ttsQueue.clear();
  if (sovitsProcess && !sovitsProcess.killed) {
    sovitsProcess.kill();
  }
  sovitsProcess = null;
  sovitsProcessConfigKey = "";
  setTtsRequestStatus("idle", "语音服务已停止", 0);
  return { ok: true, status: getSovitsStatus() };
}

function autoStartLocalTtsService() {
  const settings = readSettings();
  if (settings.voiceEnabled === false || settings.autoStartTts === false) return;
  if (normalizeTtsProvider(settings.ttsProvider) !== "local") return;

  const result = startSovitsService();
  if (!result.ok) {
    sovitsLog += `\nQwen3-TTS auto start skipped: ${result.error}\n`;
  }
}

ipcMain.handle("chat:send", async (_event, payload) => {
  try {
    const safePayload = payload || {};
    const reply = await callOpenAICompatibleChat(safePayload);
    const normalized = normalizeAssistantText(reply);
    const nextSettings = updateMoodFromConversation({
      emotion: normalized.emotion,
      message: safePayload.message,
      screenContext: safePayload.screenContext,
      assistantText: normalized.text
    });
    getMemoryStore().addExchange({
      message: safePayload.message,
      screenContext: safePayload.screenContext,
      assistantText: normalized.text
    });
    maybeAutoAdjustScheduleWithLlm({
      message: safePayload.message,
      screenContext: safePayload.screenContext,
      assistantText: normalized.text
    }).catch((error) => {
      console.warn("AI schedule auto adjust failed:", error.message || error);
    });
    const achievementResult = trackAchievement("chat");
    return {
      ok: true,
      ...normalized,
      moodScore: nextSettings.moodScore,
      mood: moodFromScore(nextSettings.moodScore),
      moodLabel: MOOD_LABELS[moodFromScore(nextSettings.moodScore)],
      achievementResult
    };
  } catch (error) {
    return {
      ok: false,
      emotion: "Confused",
      text: `[Emotion: Confused]\n我这边调用模型时卡住了：${error.message}`
    };
  }
});

ipcMain.handle("achievement:get", () => getAchievementService().get());
ipcMain.handle("achievement:track", (_event, eventName, payload) => trackAchievement(String(eventName || ""), payload || {}));
ipcMain.handle("achievement:reset", () => getAchievementService().reset());

ipcMain.handle("settings:get", () => publicSettings());
ipcMain.handle("background:get", async (_event, options = {}) => getBackgroundInfo({ force: options?.force === true }));
ipcMain.handle("proactive:check", () => checkProactiveReminder());
ipcMain.handle("tools:invoke", (_event, name, args) => invokeLocalTool(name, args || {}));
ipcMain.handle("schedule:get", () => getAiScheduleSnapshot());
ipcMain.handle("schedule:reset", () => {
  const settings = readSettings();
  return getAiScheduleSnapshot(writeSettings({ ...settings, aiScheduleItems: DEFAULT_SETTINGS.aiScheduleItems }));
});
ipcMain.handle("settings:save", (_event, nextSettings) => {
  if (ttsQueue) ttsQueue.clear();
  return publicSettings(writeSettings(nextSettings || {}));
});
ipcMain.handle("memory:get", () => getMemoryStore().getPublicSnapshot());
ipcMain.handle("memory:search", (_event, query) => getMemoryStore().getPublicSnapshot(String(query || "")));
ipcMain.handle("memory:add", (_event, payload) => getMemoryStore().addManual(payload || {}));
ipcMain.handle("memory:update", (_event, id, patch) => getMemoryStore().updateMemory(id, patch || {}));
ipcMain.handle("memory:delete", (_event, id) => getMemoryStore().deleteMemory(id));
ipcMain.handle("memory:evolve", () => getMemoryStore().evolveMemories());
ipcMain.handle("memory:organize", async () => organizeMemoryWithLlm());
ipcMain.handle("memory:clear", () => getMemoryStore().clear());
ipcMain.handle("memory:clearSensitive", () => getMemoryStore().clearSensitive());
ipcMain.handle("memory:export", () => exportMemory());
ipcMain.handle("memory:import", () => importMemory());
ipcMain.handle("portrait:importMood", (_event, moodKey) => importMoodPortrait(moodKey));
ipcMain.handle("portrait:importInteraction", (_event, slotKey) => importInteractionPortrait(slotKey));
ipcMain.handle("portrait:resetMood", (_event, moodKey) => resetMoodPortrait(moodKey));
ipcMain.handle("portrait:resetInteraction", (_event, slotKey) => resetInteractionPortrait(slotKey));
ipcMain.handle("portrait:openFolder", () => openPortraitFolder());
ipcMain.handle("portrait:cleanupUnused", () => cleanupUnusedPortraits());
ipcMain.handle("sovits:selectReferenceAudio", () => selectSovitsReferenceAudio());
ipcMain.handle("sovits:selectDir", () => selectSovitsDir());
ipcMain.handle("sovits:start", () => startSovitsService());
ipcMain.handle("sovits:stop", () => stopSovitsService());
ipcMain.handle("sovits:status", () => getSovitsRuntimeStatus());

ipcMain.handle("tts:speak", async (_event, text) => {
  try {
    return await getTtsQueue().speak(text);
  } catch (error) {
    setTtsRequestStatus("error", error.message, 0);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("window:togglePin", () => {
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next);
  return next;
});

ipcMain.handle("window:setChatVisible", (_event, visible) => {
  applyWindowLayout(Boolean(visible));
  return { chatVisible, petScale: readSettings().petScale };
});

ipcMain.handle("window:setSettingsVisible", (_event, visible) => applySettingsWindowLayout(Boolean(visible)));

ipcMain.handle("window:dragStart", (_event, screenX, screenY) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const bounds = mainWindow.getBounds();
  const cursor = screen.getCursorScreenPoint?.() || {
    x: Math.round(Number(screenX) || 0),
    y: Math.round(Number(screenY) || 0)
  };
  windowDragState = {
    startMouseX: Math.round(cursor.x),
    startMouseY: Math.round(cursor.y),
    startWindowX: bounds.x,
    startWindowY: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
  startWindowDragLoop();
  return { ok: true, bounds };
});

ipcMain.handle("window:dragMove", () => applyWindowDragMove());

ipcMain.handle("window:dragEnd", () => {
  const bounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
  windowDragState = null;
  stopWindowDragLoop();
  return { ok: true, dockState: getDockStateForBounds(bounds) };
});

ipcMain.handle("window:moveBy", (_event, deltaX, deltaY) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const dx = Math.round(Number(deltaX) || 0);
  const dy = Math.round(Number(deltaY) || 0);
  if (!dx && !dy) return { ok: true, moved: false };
  const bounds = mainWindow.getBounds();
  const nextBounds = clampWindowBounds(
    {
      ...bounds,
      x: bounds.x + dx,
      y: bounds.y + dy
    },
    { fullyVisible: chatVisible || settingsVisible }
  );
  mainWindow.setPosition(nextBounds.x, nextBounds.y, false);
  return { ok: true, moved: true };
});

ipcMain.handle("window:setPetScale", (_event, scale) => {
  const settings = writeSettings({
    ...readSettings(),
    petScale: clampPetScale(scale)
  });
  return publicSettings(settings);
});

ipcMain.handle("window:minimize", () => {
  mainWindow.minimize();
});

ipcMain.handle("app:openExternal", (_event, url) => {
  const parsed = new URL(String(url || ""));
  if (!["https:", "mailto:"].includes(parsed.protocol)) {
    throw new Error(`Blocked external URL protocol: ${parsed.protocol}`);
  }
  shell.openExternal(parsed.toString());
});

loadEnvFile();

app.whenReady().then(() => {
  createWindow();
  trackAchievement("launch");
  autoStartLocalTtsService();
  screen.on("display-metrics-changed", () => applyWindowLayout(chatVisible));
});

app.on("window-all-closed", () => {
  if (sovitsProcess && !sovitsProcess.killed) sovitsProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
