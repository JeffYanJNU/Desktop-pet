const fs = require("node:fs");
const path = require("node:path");

const ACHIEVEMENTS = [
  ["first_launch", "初次见面", "第一次启动桌宠", "launch_count", 1, "普通", 1],
  ["first_click", "打个招呼", "第一次单击角色", "click_count", 1, "普通", 1],
  ["first_touch", "摸摸头", "第一次触发摸头", "touch_count", 1, "普通", 2],
  ["first_angry", "别戳啦", "连续点击触发生气 1 次", "angry_count", 1, "普通", 0],
  ["first_chat_open", "会聊天了", "第一次打开聊天", "open_chat_count", 1, "普通", 1],
  ["first_context_menu", "找到菜单", "第一次右键打开菜单", "context_menu_count", 1, "普通", 1],
  ["first_drag", "搬家成功", "第一次长按拖动角色", "drag_count", 1, "普通", 1],
  ["three_launches", "桌面居民", "累计启动 3 次", "launch_count", 3, "普通", 2],
  ["twenty_interactions", "熟悉起来", "累计互动 20 次", "interaction_count", 20, "普通", 3],
  ["fifty_interactions", "你很会玩", "累计互动 50 次", "interaction_count", 50, "普通", 5],

  ["day_one", "陪伴第一天", "使用满 1 天", "active_days", 1, "熟悉", 3],
  ["three_day_streak", "三日熟人", "连续使用 3 天", "streak_days", 3, "熟悉", 5],
  ["seven_day_streak", "一周伙伴", "连续使用 7 天", "streak_days", 7, "熟悉", 8],
  ["fifteen_day_streak", "半月陪伴", "连续使用 15 天", "streak_days", 15, "熟悉", 10],
  ["thirty_day_streak", "一个月的约定", "连续使用 30 天", "streak_days", 30, "熟悉", 20],
  ["online_10h", "常驻桌面", "累计在线 10 小时", "online_minutes", 600, "熟悉", 5],
  ["online_50h", "长期居民", "累计在线 50 小时", "online_minutes", 3000, "熟悉", 10],
  ["online_100h", "桌面同居人", "累计在线 100 小时", "online_minutes", 6000, "熟悉", 15],
  ["daily_interact_14", "不离不弃", "连续 14 天每天互动", "interaction_streak_days", 14, "熟悉", 15],
  ["old_friend", "老朋友", "累计互动 500 次", "interaction_count", 500, "熟悉", 30],

  ["first_message", "第一句话", "第一次发送聊天消息", "chat_count", 1, "亲密", 1],
  ["chat_10", "认真交流", "累计聊天 10 次", "chat_count", 10, "亲密", 3],
  ["chat_50", "话很多嘛", "累计聊天 50 次", "chat_count", 50, "亲密", 8],
  ["late_night_chat", "深夜谈心", "晚上 23:00 后聊天 1 次", "late_night_chat_count", 1, "亲密", 5],
  ["first_tts", "语音启动", "第一次成功播放 TTS", "tts_play_count", 1, "亲密", 2],
  ["first_replay", "再说一遍", "第一次点击重播语音", "tts_replay_count", 1, "亲密", 1],
  ["tts_30", "声音熟悉了", "累计播放语音 30 次", "tts_play_count", 30, "亲密", 6],
  ["voice_off", "安静模式", "第一次关闭语音", "voice_disabled_count", 1, "亲密", 1],
  ["voice_test", "语音调试员", "完成一次语音测试", "voice_test_count", 1, "亲密", 2],
  ["chat_tts_100", "会听也会说", "聊天 + 语音累计 100 次", "chat_tts_count", 100, "亲密", 10],

  ["first_portrait", "第一张立绘", "第一次导入图片", "portrait_import_count", 1, "专属", 2],
  ["first_mood_portrait", "换个心情", "第一次设置心情立绘", "mood_portrait_import_count", 1, "专属", 2],
  ["first_interaction_portrait", "互动专属", "第一次设置互动立绘", "interaction_portrait_import_count", 1, "专属", 2],
  ["three_state_images", "表情丰富", "设置 3 个不同状态图片", "portrait_slots_set", 3, "专属", 4],
  ["eight_state_images", "全状态准备", "设置 8 个状态图片", "portrait_slots_set", 8, "专属", 8],
  ["transparent_3", "透明背景派", "导入透明背景图片 3 次", "transparent_portrait_count", 3, "专属", 3],
  ["first_cleanup", "图片整理师", "第一次清理未使用图片", "portrait_cleanup_count", 1, "专属", 2],
  ["cleanup_20", "不浪费空间", "累计清理 20 张旧图片", "portrait_cleanup_removed_count", 20, "专属", 5],
  ["preview_10", "预览达人", "预览立绘 10 次", "portrait_preview_count", 10, "专属", 1],
  ["complete_style", "专属造型", "设置完整心情 + 互动图片", "portrait_slots_set", 10, "专属", 10],

  ["first_task", "开始做事", "第一次添加任务", "task_add_count", 1, "长期陪伴", 2],
  ["first_task_done", "第一个完成", "完成第一个任务", "task_done_count", 1, "长期陪伴", 3],
  ["three_tasks_day", "不再拖延", "一天内完成 3 个任务", "task_done_today", 3, "长期陪伴", 5],
  ["ten_tasks", "小小计划家", "累计完成 10 个任务", "task_done_count", 10, "长期陪伴", 8],
  ["task_streak_3", "稳定推进", "连续 3 天完成任务", "task_streak_days", 3, "长期陪伴", 8],
  ["first_focus", "番茄入门", "完成第一次 25 分钟专注", "focus_sessions", 1, "长期陪伴", 4],
  ["focus_three_day", "专注三连", "一天完成 3 个番茄钟", "focus_sessions_today", 3, "长期陪伴", 8],
  ["focus_5h", "专注入流", "累计专注 5 小时", "focus_minutes", 300, "长期陪伴", 10],
  ["focus_20h", "自律的人", "累计专注 20 小时", "focus_minutes", 1200, "长期陪伴", 20],
  ["supervised_success", "被监督成功", "累计完成 100 个任务或 50 小时专注", "productivity_score", 100, "长期陪伴", 30]
].map(([id, title, description, stat, target, tier, intimacyReward]) => ({
  id,
  title,
  description,
  stat,
  target,
  tier,
  reward: { intimacy: intimacyReward }
}));

const INTERACTION_EVENTS = new Set([
  "click",
  "touch",
  "angry",
  "open_chat",
  "context_menu",
  "drag",
  "chat",
  "tts_play",
  "tts_replay",
  "portrait_import",
  "portrait_preview"
]);

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function previousDayKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return todayKey(previous);
}

function createDefaultState() {
  return {
    version: 1,
    stats: {},
    daily: {},
    unlocked: {},
    lastLaunchDate: "",
    lastInteractionDate: "",
    lastTaskDoneDate: "",
    lastFocusDate: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function safeNumber(value) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function increment(stats, key, amount = 1) {
  stats[key] = safeNumber(stats[key]) + amount;
}

function setMax(stats, key, value) {
  stats[key] = Math.max(safeNumber(stats[key]), safeNumber(value));
}

function normalizeState(raw) {
  const state = { ...createDefaultState(), ...(raw || {}) };
  state.stats = { ...(raw?.stats || {}) };
  state.daily = { ...(raw?.daily || {}) };
  state.unlocked = { ...(raw?.unlocked || {}) };
  return state;
}

function createAchievementService(dataDir) {
  const filePath = path.join(dataDir, "achievements.json");
  let cache = null;

  function readState() {
    if (cache) return cache;
    try {
      cache = normalizeState(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch {
      cache = createDefaultState();
    }
    return cache;
  }

  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
    cache = state;
    return state;
  }

  function refreshDerivedStats(state) {
    const stats = state.stats;
    stats.chat_tts_count = safeNumber(stats.chat_count) + safeNumber(stats.tts_play_count);
    stats.productivity_score = Math.max(safeNumber(stats.task_done_count), Math.floor(safeNumber(stats.focus_minutes) / 30));
  }

  function publicSnapshot(state = readState(), newlyUnlocked = []) {
    refreshDerivedStats(state);
    const stats = { ...state.stats };
    const achievements = ACHIEVEMENTS.map((achievement) => {
      const progress = Math.min(safeNumber(stats[achievement.stat]), achievement.target);
      const unlocked = Boolean(state.unlocked[achievement.id]);
      return {
        ...achievement,
        progress,
        percent: achievement.target ? Math.round((progress / achievement.target) * 100) : 0,
        unlocked,
        unlockedAt: state.unlocked[achievement.id]?.unlockedAt || ""
      };
    });
    return {
      stats,
      unlocked: state.unlocked,
      newlyUnlocked,
      achievements,
      total: ACHIEVEMENTS.length,
      unlockedCount: achievements.filter((item) => item.unlocked).length,
      filePath
    };
  }

  function checkUnlocks(state) {
    refreshDerivedStats(state);
    const unlocked = [];
    for (const achievement of ACHIEVEMENTS) {
      if (state.unlocked[achievement.id]) continue;
      if (safeNumber(state.stats[achievement.stat]) < achievement.target) continue;
      state.unlocked[achievement.id] = {
        unlockedAt: new Date().toISOString(),
        title: achievement.title,
        reward: achievement.reward
      };
      unlocked.push(achievement);
    }
    return unlocked;
  }

  function updateUsageDayStats(state, now = new Date()) {
    const today = todayKey(now);
    const previous = previousDayKey(now);
    if (state.lastLaunchDate !== today) {
      state.lastLaunchDate = today;
      increment(state.stats, "active_days", 1);
      state.stats.streak_days = state.lastLaunchDate === previous ? safeNumber(state.stats.streak_days) + 1 : Math.max(1, safeNumber(state.stats.streak_days));
    }
  }

  function updateInteractionStreak(state, now = new Date()) {
    const today = todayKey(now);
    const previous = previousDayKey(now);
    if (state.lastInteractionDate === today) return;
    state.stats.interaction_streak_days = state.lastInteractionDate === previous
      ? safeNumber(state.stats.interaction_streak_days) + 1
      : 1;
    state.lastInteractionDate = today;
  }

  function track(eventName, payload = {}) {
    const state = readState();
    const stats = state.stats;
    const amount = Math.max(1, safeNumber(payload.amount || 1));
    const now = new Date();
    updateUsageDayStats(state, now);

    switch (eventName) {
      case "launch":
        increment(stats, "launch_count", amount);
        break;
      case "online_minutes":
        increment(stats, "online_minutes", Math.max(1, safeNumber(payload.minutes || payload.amount || 1)));
        break;
      case "click":
        increment(stats, "click_count", amount);
        break;
      case "touch":
        increment(stats, "touch_count", amount);
        break;
      case "angry":
        increment(stats, "angry_count", amount);
        break;
      case "open_chat":
        increment(stats, "open_chat_count", amount);
        break;
      case "context_menu":
        increment(stats, "context_menu_count", amount);
        break;
      case "drag":
        increment(stats, "drag_count", amount);
        break;
      case "chat":
        increment(stats, "chat_count", amount);
        if (now.getHours() >= 23 || now.getHours() < 5) increment(stats, "late_night_chat_count", 1);
        break;
      case "tts_play":
        increment(stats, "tts_play_count", amount);
        break;
      case "tts_replay":
        increment(stats, "tts_replay_count", amount);
        break;
      case "voice_disabled":
        increment(stats, "voice_disabled_count", amount);
        break;
      case "voice_test":
        increment(stats, "voice_test_count", amount);
        break;
      case "portrait_import":
        increment(stats, "portrait_import_count", amount);
        if (payload.kind === "mood") increment(stats, "mood_portrait_import_count", amount);
        if (payload.kind === "interaction") increment(stats, "interaction_portrait_import_count", amount);
        if (payload.hasAlpha) increment(stats, "transparent_portrait_count", amount);
        setMax(stats, "portrait_slots_set", safeNumber(payload.slotsSet));
        break;
      case "portrait_preview":
        increment(stats, "portrait_preview_count", amount);
        break;
      case "portrait_cleanup":
        increment(stats, "portrait_cleanup_count", 1);
        increment(stats, "portrait_cleanup_removed_count", safeNumber(payload.removedCount || 0));
        break;
      case "task_add":
        increment(stats, "task_add_count", amount);
        break;
      case "task_done": {
        increment(stats, "task_done_count", amount);
        const today = todayKey(now);
        const previous = previousDayKey(now);
        if (state.lastTaskDoneDate !== today) {
          stats.task_streak_days = state.lastTaskDoneDate === previous ? safeNumber(stats.task_streak_days) + 1 : 1;
          state.lastTaskDoneDate = today;
        }
        const day = state.daily[today] || {};
        day.task_done_today = safeNumber(day.task_done_today) + amount;
        state.daily[today] = day;
        setMax(stats, "task_done_today", day.task_done_today);
        break;
      }
      case "focus_done": {
        const minutes = Math.max(1, safeNumber(payload.minutes || 25));
        increment(stats, "focus_sessions", 1);
        increment(stats, "focus_minutes", minutes);
        const today = todayKey(now);
        const day = state.daily[today] || {};
        day.focus_sessions_today = safeNumber(day.focus_sessions_today) + 1;
        state.daily[today] = day;
        setMax(stats, "focus_sessions_today", day.focus_sessions_today);
        state.lastFocusDate = today;
        break;
      }
      default:
        increment(stats, String(eventName || "custom_event"), amount);
        break;
    }

    if (INTERACTION_EVENTS.has(eventName)) {
      increment(stats, "interaction_count", amount);
      updateInteractionStreak(state, now);
    }

    refreshDerivedStats(state);
    const newlyUnlocked = checkUnlocks(state);
    writeState(state);
    return publicSnapshot(state, newlyUnlocked);
  }

  function get() {
    const state = readState();
    updateUsageDayStats(state);
    const newlyUnlocked = checkUnlocks(state);
    writeState(state);
    return publicSnapshot(state, newlyUnlocked);
  }

  function reset() {
    const state = createDefaultState();
    writeState(state);
    return publicSnapshot(state);
  }

  return { get, track, reset, definitions: ACHIEVEMENTS };
}

module.exports = {
  ACHIEVEMENTS,
  createAchievementService
};
