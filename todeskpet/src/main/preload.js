const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tablePet", {
  sendChat: (payload) => ipcRenderer.invoke("chat:send", payload),
  getAchievements: () => ipcRenderer.invoke("achievement:get"),
  trackAchievement: (eventName, payload) => ipcRenderer.invoke("achievement:track", eventName, payload || {}),
  resetAchievements: () => ipcRenderer.invoke("achievement:reset"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getBackgroundInfo: (options) => ipcRenderer.invoke("background:get", options || {}),
  checkProactive: () => ipcRenderer.invoke("proactive:check"),
  invokeTool: (name, args) => ipcRenderer.invoke("tools:invoke", name, args || {}),
  getSchedule: () => ipcRenderer.invoke("schedule:get"),
  resetSchedule: () => ipcRenderer.invoke("schedule:reset"),
  handlePomodoroOutcome: (payload) => ipcRenderer.invoke("pomodoro:outcome", payload || {}),
  onPomodoroOutcome: (callback) => {
    const listener = (_event, result) => callback(result || {});
    ipcRenderer.on("pomodoro:outcomeResult", listener);
    return () => ipcRenderer.removeListener("pomodoro:outcomeResult", listener);
  },
  getMemory: () => ipcRenderer.invoke("memory:get"),
  searchMemory: (query) => ipcRenderer.invoke("memory:search", query),
  addMemory: (payload) => ipcRenderer.invoke("memory:add", payload),
  updateMemory: (id, patch) => ipcRenderer.invoke("memory:update", id, patch),
  deleteMemory: (id) => ipcRenderer.invoke("memory:delete", id),
  evolveMemory: () => ipcRenderer.invoke("memory:evolve"),
  organizeMemory: () => ipcRenderer.invoke("memory:organize"),
  clearMemory: () => ipcRenderer.invoke("memory:clear"),
  clearSensitiveMemory: () => ipcRenderer.invoke("memory:clearSensitive"),
  exportMemory: () => ipcRenderer.invoke("memory:export"),
  importMemory: () => ipcRenderer.invoke("memory:import"),
  importMoodPortrait: (moodKey) => ipcRenderer.invoke("portrait:importMood", moodKey),
  importInteractionPortrait: (slotKey) => ipcRenderer.invoke("portrait:importInteraction", slotKey),
  resetMoodPortrait: (moodKey) => ipcRenderer.invoke("portrait:resetMood", moodKey),
  resetInteractionPortrait: (slotKey) => ipcRenderer.invoke("portrait:resetInteraction", slotKey),
  openPortraitFolder: () => ipcRenderer.invoke("portrait:openFolder"),
  cleanupUnusedPortraits: () => ipcRenderer.invoke("portrait:cleanupUnused"),
  selectSovitsReferenceAudio: () => ipcRenderer.invoke("sovits:selectReferenceAudio"),
  selectSovitsDir: () => ipcRenderer.invoke("sovits:selectDir"),
  startSovits: () => ipcRenderer.invoke("sovits:start"),
  stopSovits: () => ipcRenderer.invoke("sovits:stop"),
  getSovitsStatus: () => ipcRenderer.invoke("sovits:status"),
  speak: (text) => ipcRenderer.invoke("tts:speak", text),
  transcribeAudio: (arrayBuffer) => ipcRenderer.invoke("asr:transcribe", arrayBuffer),
  togglePin: () => ipcRenderer.invoke("window:togglePin"),
  setChatVisible: (visible) => ipcRenderer.invoke("window:setChatVisible", visible),
  setSettingsVisible: (visible) => ipcRenderer.invoke("window:setSettingsVisible", visible),
  startWindowDrag: (screenX, screenY) => ipcRenderer.invoke("window:dragStart", Number(screenX) || 0, Number(screenY) || 0),
  dragWindowTo: (screenX, screenY) => ipcRenderer.invoke("window:dragMove", Number(screenX) || 0, Number(screenY) || 0),
  endWindowDrag: () => ipcRenderer.invoke("window:dragEnd"),
  moveWindowBy: (deltaX, deltaY) => ipcRenderer.invoke("window:moveBy", Number(deltaX) || 0, Number(deltaY) || 0),
  setPetScale: (scale) => ipcRenderer.invoke("window:setPetScale", scale),
  onChatVisibilityChanged: (callback) => {
    const listener = (_event, visible) => callback(Boolean(visible));
    ipcRenderer.on("window:chatVisibility", listener);
    return () => ipcRenderer.removeListener("window:chatVisibility", listener);
  },
  minimize: () => ipcRenderer.invoke("window:minimize"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url)
});
