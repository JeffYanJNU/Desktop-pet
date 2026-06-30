# Pomodoro portrait implementation context

Generated: 2026-06-25T09:19:49.013Z
Workspace: D:\CODE\llmAPIbot
Workspace ID: ws_24cf7fdb7a8c397f2f4f0ccc
Write mode: workspace
Bash mode: safe
Tool mode: standard

Purpose: paste this bundle into a high-context ChatGPT model when that model cannot call the CodexPro MCP tools directly.
Instruction for ChatGPT: use this as repository context, produce a narrow Codex execution plan, and avoid inventing files or runtime facts not shown here.

## Repository Tree

.
├── Arcueid_aru/
│   └── 爱尔奎特/
├── audio/
│   ├── assets/
│   ├── examples/
│   ├── finetuning/
│   ├── logs/
│   ├── qwen_tts/
│   ├── qwen_tts.egg-info/
│   ├── Qwen3-TTS-12Hz-0.6B-Base/
│   ├── Qwen3-TTS-12Hz-0.6B-CustomVoice/
│   ├── Qwen3-TTS-Tokenizer-12Hz/
│   ├── scripts/
│   ├── LICENSE
│   ├── LOCAL_DEPLOY.md
│   ├── MANIFEST.in
│   ├── pyproject.toml
│   ├── qwen_tts_api.err.log
│   ├── qwen_tts_api.log
│   ├── README.md
│   └── test_customvoice_bf16_short.wav
├── qwensteamtts/
│   ├── __pycache__/
│   ├── checkpoint-step-1200/
│   ├── Experience/
│   ├── log/
│   ├── model-base-small/
│   ├── model-custom-small/
│   ├── output/
│   ├── qwen3_tts_gguf/
│   ├── Qwen3-TTS-main/
│   ├── ref/
│   ├── 01-Run-Official-Custom.py
│   ├── 02-Run-Official-VoiceDesign.py
│   ├── 03-Run-Official-VoiceClone.py
│   ├── 04-Run-Official-VoiceClone-JSON.py
│   ├── 11-Export-Codec-Encoder.py
│   ├── 12-Export-Speaker-Encoder.py
│   ├── 13-Export-Decoder.py
│   ├── 14-Export-Embeddings.py
│   ├── 15-Copy-Tokenizer.py
│   ├── 16-Quantize-ONNX-Models.py
│   ├── 21-Extract-Talker-Weights.py
│   ├── 22-Prepare-Talker-Tokenizer.py
│   ├── 23-Convert-Talker-GGUF.py
│   ├── 24-Quantize-Talker-GGUF.py
│   ├── 31-Extract-Predictor-Weights.py
│   ├── 32-Prepare-Predictor-Tokenizer.py
│   ├── 33-Convert-Predictor-GGUF.py
│   ├── 34-Quantize-Predictor-GGUF.py
│   ├── 41-Inference-Custom.py
│   ├── 42-Inference-Design.py
│   ├── 43-Inference-Base.py
│   ├── 44-Inference-Base-Zeroshot.py
│   ├── 45-Encode-audio.py
│   ├── 46-Inference-Custom-embd.py
│   ├── 51-Interactive-Clone.py
│   ├── A10_10_00_0237_0.wav
│   ├── clone_a10.py
│   ├── export_config.py
│   ├── local_base_smoke_test.py
│   ├── local_smoke_test.py
│   ├── Qwen3-TTS Technical Report.md
│   ├── readme.md
│   ├── requirements.txt
│   ├── webui_backend_smoke.py
│   └── webui.py
├── todeskpet/
│   ├── 抱臂站立_姿势10-02/
│   ├── characters/
│   ├── data/
│   ├── scene-emotion-happy-user-reply-zh/
│   ├── src/
│   ├── tests/
│   ├── package-lock.json
│   ├── package.json
│   └── README.md
├── README.md
├── start-all.ps1
├── start-tablepet.ps1
└── start-tts.ps1

## Git Status

```text
## main...origin/main
 m audio
 m qwensteamtts
 M start-tablepet.ps1
?? .ai-bridge/
```

## Recent Commits

```text
8dd1143 (HEAD -> main, origin/main) Initial commit
```

## Selected Files

Changed files detected: audio, qwensteamtts, start-tablepet.ps1, .ai-bridge/
Auto-include important root files: no
Auto-include changed files: no
Explicit selected paths: todeskpet/src/renderer/pomodoroUi.js, todeskpet/src/renderer/pomodoroUi.css, todeskpet/src/main/main.js, todeskpet/src/main/preload.js, todeskpet/src/renderer/petInteractions.js, todeskpet/src/renderer/index.html
Extra globs: none
Files included below: todeskpet/src/main/main.js, todeskpet/src/main/preload.js, todeskpet/src/renderer/index.html, todeskpet/src/renderer/petInteractions.js, todeskpet/src/renderer/pomodoroUi.css, todeskpet/src/renderer/pomodoroUi.js

## File Contents

### todeskpet/src/main/preload.js

Bytes: 3634
SHA-256: e8eb2a958bcd9d723b1f17f7bf63ad5857bcd7b9bd6e21d12d54d34324859d44
Lines: 1-54 of 54

```javascript
 1 | const { contextBridge, ipcRenderer } = require("electron");
 2 | 
 3 | contextBridge.exposeInMainWorld("tablePet", {
 4 |   sendChat: (payload) => ipcRenderer.invoke("chat:send", payload),
 5 |   getAchievements: () => ipcRenderer.invoke("achievement:get"),
 6 |   trackAchievement: (eventName, payload) => ipcRenderer.invoke("achievement:track", eventName, payload || {}),
 7 |   resetAchievements: () => ipcRenderer.invoke("achievement:reset"),
 8 |   getSettings: () => ipcRenderer.invoke("settings:get"),
 9 |   saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
10 |   getBackgroundInfo: (options) => ipcRenderer.invoke("background:get", options || {}),
11 |   checkProactive: () => ipcRenderer.invoke("proactive:check"),
12 |   invokeTool: (name, args) => ipcRenderer.invoke("tools:invoke", name, args || {}),
13 |   getSchedule: () => ipcRenderer.invoke("schedule:get"),
14 |   resetSchedule: () => ipcRenderer.invoke("schedule:reset"),
15 |   getMemory: () => ipcRenderer.invoke("memory:get"),
16 |   searchMemory: (query) => ipcRenderer.invoke("memory:search", query),
17 |   addMemory: (payload) => ipcRenderer.invoke("memory:add", payload),
18 |   updateMemory: (id, patch) => ipcRenderer.invoke("memory:update", id, patch),
19 |   deleteMemory: (id) => ipcRenderer.invoke("memory:delete", id),
20 |   evolveMemory: () => ipcRenderer.invoke("memory:evolve"),
21 |   organizeMemory: () => ipcRenderer.invoke("memory:organize"),
22 |   clearMemory: () => ipcRenderer.invoke("memory:clear"),
23 |   clearSensitiveMemory: () => ipcRenderer.invoke("memory:clearSensitive"),
24 |   exportMemory: () => ipcRenderer.invoke("memory:export"),
25 |   importMemory: () => ipcRenderer.invoke("memory:import"),
26 |   importMoodPortrait: (moodKey) => ipcRenderer.invoke("portrait:importMood", moodKey),
27 |   importInteractionPortrait: (slotKey) => ipcRenderer.invoke("portrait:importInteraction", slotKey),
28 |   resetMoodPortrait: (moodKey) => ipcRenderer.invoke("portrait:resetMood", moodKey),
29 |   resetInteractionPortrait: (slotKey) => ipcRenderer.invoke("portrait:resetInteraction", slotKey),
30 |   openPortraitFolder: () => ipcRenderer.invoke("portrait:openFolder"),
31 |   cleanupUnusedPortraits: () => ipcRenderer.invoke("portrait:cleanupUnused"),
32 |   selectSovitsReferenceAudio: () => ipcRenderer.invoke("sovits:selectReferenceAudio"),
33 |   selectSovitsDir: () => ipcRenderer.invoke("sovits:selectDir"),
34 |   startSovits: () => ipcRenderer.invoke("sovits:start"),
35 |   stopSovits: () => ipcRenderer.invoke("sovits:stop"),
36 |   getSovitsStatus: () => ipcRenderer.invoke("sovits:status"),
37 |   speak: (text) => ipcRenderer.invoke("tts:speak", text),
38 |   togglePin: () => ipcRenderer.invoke("window:togglePin"),
39 |   setChatVisible: (visible) => ipcRenderer.invoke("window:setChatVisible", visible),
40 |   setSettingsVisible: (visible) => ipcRenderer.invoke("window:setSettingsVisible", visible),
41 |   startWindowDrag: (screenX, screenY) => ipcRenderer.invoke("window:dragStart", Number(screenX) || 0, Number(screenY) || 0),
42 |   dragWindowTo: (screenX, screenY) => ipcRenderer.invoke("window:dragMove", Number(screenX) || 0, Number(screenY) || 0),
43 |   endWindowDrag: () => ipcRenderer.invoke("window:dragEnd"),
44 |   moveWindowBy: (deltaX, deltaY) => ipcRenderer.invoke("window:moveBy", Number(deltaX) || 0, Number(deltaY) || 0),
45 |   setPetScale: (scale) => ipcRenderer.invoke("window:setPetScale", scale),
46 |   onChatVisibilityChanged: (callback) => {
47 |     const listener = (_event, visible) => callback(Boolean(visible));
48 |     ipcRenderer.on("window:chatVisibility", listener);
49 |     return () => ipcRenderer.removeListener("window:chatVisibility", listener);
50 |   },
51 |   minimize: () => ipcRenderer.invoke("window:minimize"),
52 |   openExternal: (url) => ipcRenderer.invoke("app:openExternal", url)
53 | });
54 | 
```

### todeskpet/src/renderer/index.html

Bytes: 14558
SHA-256: 09ec7dd46acc41bee06c5ba78e0aca5178aec5501fdd3be10329e06b2ae59db8
Lines: 1-99 of 99

```html
 1 | <!doctype html>
 2 | <html lang="zh-CN">
 3 |   <head>
 4 |     <meta charset="UTF-8" />
 5 |     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 6 |     <title>Table Pet</title>
 7 |     <link rel="stylesheet" href="./styles.css" />
 8 |     <link rel="stylesheet" href="./petInteractions.css" />
 9 |     <link rel="stylesheet" href="./settingsLayout.css" />
10 |     <link rel="stylesheet" href="./notificationUi.css" />
11 |     <link rel="stylesheet" href="./achievementUi.css" />
12 |     <link rel="stylesheet" href="./pomodoroUi.css" />
13 |   </head>
14 |   <body>
15 |     <main class="pet-shell" aria-label="智能桌面精灵">
16 |       <header class="titlebar">
17 |         <div class="status">
18 |           <span class="status-dot" aria-hidden="true"></span>
19 |           <span id="emotionLabel">平静</span>
20 |           <span id="petStateSummary" class="pet-state-summary">普通 · 亲密 50 · 精力 70</span>
21 |           <span id="voiceStatusText" class="voice-status">语音空闲</span>
22 |         </div>
23 |         <div class="window-actions">
24 |           <button id="stopVoiceButton" class="icon-button" type="button" title="中断语音" disabled>■</button>
25 |           <button id="replayVoiceButton" class="icon-button" type="button" title="重播语音" disabled>↻</button>
26 |           <button id="settingsButton" class="icon-button" title="设置">⚙</button>
27 |         </div>
28 |       </header>
29 | 
30 |       <section class="portrait-zone" aria-live="polite">
31 |         <div id="portrait" class="portrait neutral" aria-label="动态立绘">
32 |           <img id="customPortraitImage" class="custom-portrait-image" alt="" />
33 |         </div>
34 |       </section>
35 | 
36 |       <nav id="petContextMenu" class="pet-context-menu" hidden aria-label="桌宠快捷菜单">
37 |         <button type="button" data-pet-action="chat">打开聊天</button>
38 |         <button type="button" data-pet-action="random">随机一句</button>
39 |         <button type="button" data-pet-action="touch">摸头</button>
40 |         <button type="button" data-pet-action="close-chat">关闭聊天</button>
41 |         <button type="button" data-pet-action="pin">置顶切换</button>
42 |         <button type="button" data-pet-action="rest">休息</button>
43 |         <button type="button" data-pet-action="debug">调试面板</button>
44 |         <button type="button" data-pet-action="settings">设置图片</button>
45 |         <button type="button" data-pet-action="hide">最小化</button>
46 |       </nav>
47 | 
48 |       <section class="bubble" id="replyBubble">
49 |         <p id="replyText">[Emotion: Happy]<br />我已经醒啦。有什么想聊的，或者要我帮你看看屏幕内容，都可以直接说。</p>
50 |       </section>
51 | 
52 |       <section class="composer">
53 |         <textarea id="screenContext" rows="2" placeholder="可选：粘贴屏幕文字/报错/上下文"></textarea>
54 |         <div class="input-row">
55 |           <input id="messageInput" autocomplete="off" placeholder="和她说点什么..." />
56 |           <button id="sendButton">发送</button>
57 |         </div>
58 |       </section>
59 | 
60 |       <dialog id="settingsDialog" class="settings-dialog">
61 |         <form id="settingsForm" method="dialog">
62 |           <div class="settings-head">
63 |             <div>
64 |               <h2>设置</h2>
65 |               <p id="apiKeyState">正在读取配置...</p>
66 |             </div>
67 |             <button id="closeSettingsButton" class="icon-button" type="button" title="关闭">×</button>
68 |           </div>
69 | 
70 |           <section class="settings-section">
71 |             <div class="settings-divider">基础</div>
72 |             <label><span>API 供应商</span><select id="providerSelect" name="provider"><option value="deepseek">DeepSeek</option><option value="siliconflow">硅基流动</option></select></label>
73 |             <label><span>模型</span><input id="modelInput" name="model" list="modelSuggestions" placeholder="选择或输入模型名" /><datalist id="modelSuggestions"></datalist></label>
74 |             <label><span>角色</span><select id="characterSelect" name="activeCharacterId"></select></label>
75 |             <div class="settings-options"><label class="checkbox-row"><input id="voiceEnabledInput" name="voiceEnabled" type="checkbox" /><span>语音播报</span></label><label class="checkbox-row"><input id="autoLaunchInput" name="autoLaunch" type="checkbox" /><span>随系统启动</span></label></div>
76 |             <div class="scale-row"><span>窗口缩放</span><input id="petScaleInput" name="petScale" type="range" min="0.7" max="1.5" step="0.05" /><span id="scaleValueText">100%</span></div>
77 |           </section>
78 | 
79 |           <details class="settings-section"><summary>桌宠状态</summary><div class="pet-state-panel"><label><span>心情</span><select id="petMoodSelect"><option value="开心">开心</option><option value="普通">普通</option><option value="疲惫">疲惫</option><option value="生气">生气</option></select></label><label class="state-range-row"><span>亲密度 <b id="intimacyValueText">50</b></span><input id="intimacyInput" type="range" min="0" max="100" step="1" /></label><label class="state-range-row"><span>精力 <b id="energyValueText">70</b></span><input id="energyInput" type="range" min="0" max="100" step="1" /></label><div class="state-actions"><button id="savePetStateButton" type="button">保存状态</button><button id="resetPetStateButton" type="button">重置</button></div><p class="state-hint">状态会保存到本地，并注入下一次聊天，让回复风格跟随当前状态。</p><div class="background-link-panel"><label class="check-row"><input id="backgroundEnabledInput" type="checkbox" /><span>启用时间/天气背景</span></label><label class="check-row"><input id="backgroundMoodLinkInput" type="checkbox" /><span>让背景影响心情和精力</span></label><label class="check-row"><input id="backgroundWeatherInput" type="checkbox" /><span>启用天气</span></label><label><span>天气城市</span><input id="backgroundCityInput" type="text" placeholder="Singapore / Tokyo / Frankfurt" /></label><div class="state-actions"><button id="saveBackgroundButton" type="button">保存背景联动</button><button id="refreshBackgroundButton" type="button">刷新背景</button></div><p id="backgroundStatePreview" class="state-hint">背景状态未刷新。</p></div></div></details>
80 | 
81 |           <details class="settings-section"><summary>立绘图片</summary><div class="portrait-settings-panel"><p class="state-hint">给不同心情和互动状态放入图片。未设置的状态会自动沿用最接近的心情立绘。</p><div class="portrait-picker-head"><strong>心情立绘</strong><span>AI 回复和状态变化时使用</span></div><div id="moodPortraitList" class="portrait-picker-list"></div><div class="portrait-picker-head"><strong>互动立绘</strong><span>点击、拖动、贴边、坐下时优先使用</span></div><div id="interactionPortraitList" class="portrait-picker-list"></div></div></details>
82 | 
83 |           <details class="settings-section"><summary>AI 日程表</summary><div class="schedule-panel"><label class="check-row"><input id="aiScheduleEnabledInput" type="checkbox" /><span>启用 AI 日程背景</span></label><label class="check-row"><input id="aiScheduleAutoAdjustInput" type="checkbox" /><span>允许 AI 根据对话自动调整日程</span></label><label class="check-row"><input id="proactiveEnabledInput" type="checkbox" /><span>启用主动提醒</span></label><label class="check-row"><input id="proactiveVoiceInput" type="checkbox" /><span>主动提醒也朗读</span></label><label class="check-row"><input id="moodAnimationInput" type="checkbox" /><span>启用情绪动画</span></label><label><span>提醒检查间隔（分钟）</span><input id="proactiveIntervalInput" type="number" min="1" max="60" step="1" /></label><div id="scheduleCurrentText" class="state-hint">当前日程未加载。</div><div class="schedule-editor-head"><span>日程 JSON</span><button id="refreshScheduleButton" type="button">刷新</button></div><textarea id="aiScheduleJsonInput" rows="9" spellcheck="false"></textarea><div class="state-actions"><button id="saveScheduleButton" type="button">保存日程</button><button id="resetScheduleButton" type="button">恢复默认</button></div><p class="state-hint">每条格式：start/end 为 HH:MM，activity 是她正在做的事，moodHint 会影响语气，energyDelta 会影响精力感。</p></div></details>
84 | 
85 |           <details class="settings-section"><summary>记忆管理</summary><div class="memory-toolbar"><input id="memorySearchInput" type="search" placeholder="搜索记忆" /><button id="refreshMemoryButton" type="button">刷新</button></div><div class="compact-grid"><label><span>记忆类型</span><select id="memoryTypeSelect"><option value="profile">用户画像</option><option value="summary">摘要</option><option value="dialogue">对话</option></select></label><label><span>分区</span><select id="memoryCategorySelect"><option value="project">项目</option><option value="life">生活</option><option value="preference">偏好</option></select></label></div><div class="compact-grid"><label><span>标签</span><input id="memoryTagsInput" placeholder="逗号分隔，例如 项目,语音" /></label><label class="checkbox-row memory-pin-row"><input id="memoryPinnedInput" type="checkbox" /><span>固定</span></label><label class="checkbox-row memory-pin-row"><input id="memorySensitiveInput" type="checkbox" /><span>敏感</span></label></div><textarea id="memoryContentInput" rows="3" placeholder="手动添加一条长期记忆"></textarea><div class="memory-actions"><button id="addMemoryButton" type="button">添加</button><button id="evolveMemoryButton" type="button">演化清理</button><button id="organizeMemoryButton" type="button">LLM 整理</button><button id="exportMemoryButton" type="button">导出</button><button id="importMemoryButton" type="button">导入</button><button id="clearSensitiveMemoryButton" type="button">清理敏感</button><button id="clearMemoryButton" type="button">清空</button></div><div id="memoryStatsText" class="memory-stats">记忆未加载</div><div id="memoryList" class="memory-list" aria-live="polite"></div></details>
86 | 
87 |           <details class="settings-section"><summary>语音服务</summary><label><span>TTS 来源</span><select id="ttsProviderSelect" name="ttsProvider"><option value="local">本地微调模型</option><option value="siliconflow">硅基流动 API</option></select></label><span id="siliconflowTtsConfigText" class="service-status">SiliconFlow: .env</span><div class="file-pick-row"><button id="selectSovitsDirButton" type="button">部署目录</button><span id="sovitsDirText">未选择</span></div><div class="compact-grid"><label><span>Python 命令</span><input id="sovitsPythonInput" name="sovitsPython" placeholder="python 或 venv\\Scripts\\python.exe" /></label><label><span>API 脚本</span><input id="sovitsApiScriptInput" name="sovitsApiScript" placeholder="api_v2.py" /></label></div><label><span>服务地址</span><input id="sovitsUrlInput" name="sovitsUrl" placeholder="例如 http://127.0.0.1:9880/tts" /></label><label><span>本地模型路径</span><input id="qwenTtsModelPathInput" name="qwenTtsModelPath" placeholder="checkpoint-step-1200 路径" /></label><label><span>合成模式</span><select id="qwenTtsModeSelect" name="qwenTtsMode"><option value="custom">CustomVoice / 内置音色</option><option value="clone">Voice Clone / 参考音频克隆</option></select></label><div class="compact-grid"><label><span>说话人</span><input id="qwenTtsSpeakerInput" name="qwenTtsSpeaker" placeholder="my_voice" /></label><label><span>播报语言</span><select id="qwenTtsLanguageInput" name="qwenTtsLanguage"><option value="Japanese">Japanese</option></select></label></div><div class="file-pick-row"><button id="selectSovitsReferenceAudioButton" type="button">参考音频</button><span id="sovitsRefAudioText">未选择</span></div><label><span>参考原文</span><textarea id="sovitsPromptTextInput" name="sovitsPromptText" rows="2" placeholder="参考音频里的原文"></textarea></label><label class="checkbox-row"><input id="qwenTtsCloneZeroShotInput" name="qwenTtsCloneZeroShot" type="checkbox" /><span>克隆 Zero-shot</span></label><div class="compact-grid"><label><span>生成长度</span><input id="qwenTtsMaxTokensInput" name="qwenTtsMaxNewTokens" type="number" min="16" max="2048" step="16" /></label><div class="service-row compact-service"><button id="startSovitsButton" type="button">启动</button><button id="stopSovitsButton" type="button">停止</button><button id="testVoiceButton" type="button">测试语音</button></div></div><span id="sovitsStatusText" class="service-status">未启动</span><div class="voice-diagnostics" aria-live="polite"><div class="voice-diagnostics-header"><strong>语音诊断</strong><button id="refreshVoiceDiagnosticsButton" type="button">刷新诊断</button></div><div class="diagnostic-grid"><span>服务</span><b id="voiceDiagServiceText">未检查</b><span>Health</span><b id="voiceDiagHealthText">未检查</b><span>配置</span><b id="voiceDiagConfigText">未加载</b><span>阶段</span><b id="voiceDiagStageText">未开始</b><span>最近错误</span><b id="voiceDiagErrorText">暂无</b></div><pre id="voiceDiagRawText" class="diagnostic-raw">暂无诊断详情</pre></div></details>
88 | 
89 |           <details class="settings-section"><summary>高级设定</summary><label><span>桌面精灵提示词</span><textarea id="promptInput" name="systemPrompt" rows="10"></textarea></label></details>
90 | 
91 |           <div class="settings-meta"><span id="baseUrlText"></span><span id="ttsUrlText"></span></div>
92 |           <div class="settings-actions"><button id="resetPromptButton" type="button">重置提示词</button><button id="saveSettingsButton" type="submit">保存</button></div>
93 |         </form>
94 |       </dialog>
95 |     </main>
96 |     <script src="./notificationUi.js"></script><script src="./errorBoundary.js"></script><script src="./achievementUi.js"></script><script src="./pomodoroUi.js"></script><script src="./settingsUi.js"></script><script src="./ttsState.js"></script><script src="./portraitNotifications.js"></script><script src="./app.js"></script><script src="./chatErrorGuard.js"></script><script src="./longPressDrag.js"></script><script src="./petInteractions.js"></script><script src="./petStatus.js"></script><script src="./aiSchedule.js"></script><script src="./proactive.js"></script><script src="./moodEffects.js"></script><script src="./memoryOrganizer.js"></script><script src="./voiceTest.js"></script><script src="./voiceDiagnostics.js"></script>
97 |   </body>
98 | </html>
99 | 
```

### todeskpet/src/renderer/petInteractions.js

Bytes: 35590
SHA-256: 45c12d67e59fd5451cbf355c6fa35e8f1d2e80fe62448ecae0cfb2424692e739
Lines: 1-942 of 942

```javascript
  1 | (() => {
  2 |   const portrait = document.querySelector("#portrait");
  3 |   const portraitImage = document.querySelector("#customPortraitImage");
  4 |   const replyText = document.querySelector("#replyText");
  5 |   const messageInput = document.querySelector("#messageInput");
  6 |   const settingsButton = document.querySelector("#settingsButton");
  7 |   const settingsDialog = document.querySelector("#settingsDialog");
  8 |   const settingsForm = document.querySelector("#settingsForm");
  9 |   const moodPortraitList = document.querySelector("#moodPortraitList");
 10 |   const interactionPortraitList = document.querySelector("#interactionPortraitList");
 11 |   const petContextMenu = document.querySelector("#petContextMenu");
 12 |   const voiceStatusText = document.querySelector("#voiceStatusText");
 13 |   const sendButton = document.querySelector("#sendButton");
 14 | 
 15 |   if (!portrait || !window.tablePet) return;
 16 | 
 17 |   const MOOD_FALLBACK_ORDER = ["Confused", "Thinking", "Neutral", "Happy", "Encouraging"];
 18 |   const DEFAULT_INTERACTION_SLOTS = [
 19 |     { key: "idle", label: "普通待机" },
 20 |     { key: "touch", label: "摸头开心" },
 21 |     { key: "angry", label: "连续点击生气" },
 22 |     { key: "drag", label: "拖动中" },
 23 |     { key: "edge", label: "边缘探头" },
 24 |     { key: "bottom", label: "坐在任务栏" },
 25 |     { key: "chat", label: "聊天中" },
 26 |     { key: "thinking", label: "思考中" },
 27 |     { key: "speaking", label: "说话中" },
 28 |     { key: "studyFocus", label: "学习专注" },
 29 |     { key: "studyBreak", label: "学习休息" },
 30 |     { key: "sleep", label: "睡觉空闲" }
 31 |   ];
 32 | 
 33 |   const RANDOM_LINES = [
 34 |     "[Emotion: Neutral]\n我在。今天先处理哪一件事？",
 35 |     "[Emotion: Happy]\n点我一下就想叫我？行，我听着。",
 36 |     "[Emotion: Thinking]\n我刚刚在发呆，不过现在可以开始做事。",
 37 |     "[Emotion: Encouraging]\n别拖太久，先把最小的一步做掉。",
 38 |     "[Emotion: Neutral]\n你可以双击我打开聊天，长按我移动位置。"
 39 |   ];
 40 | 
 41 |   const TOUCH_LINES = [
 42 |     "[Emotion: Happy]\n嗯……摸头可以，但别一直点。",
 43 |     "[Emotion: Happy]\n心情稍微变好了。",
 44 |     "[Emotion: Encouraging]\n好，奖励收到。现在继续做正事。"
 45 |   ];
 46 | 
 47 |   const ANGRY_LINES = [
 48 |     "[Emotion: Confused]\n你再这样连点，我真的要生气了。",
 49 |     "[Emotion: Confused]\n手停一下。不是按钮，是桌宠。",
 50 |     "[Emotion: Confused]\n够了，连续点击判定：烦人。"
 51 |   ];
 52 | 
 53 |   const IDLE_LINES = [
 54 |     "[Emotion: Neutral]\n我还在。你停了有一会儿，要不要继续刚才的事？",
 55 |     "[Emotion: Thinking]\n空闲时间有点长。要不要定一个小目标？",
 56 |     "[Emotion: Encouraging]\n先做两分钟也行，别让任务一直悬着。"
 57 |   ];
 58 | 
 59 |   const EDGE_LINES = {
 60 |     left: "[Emotion: Thinking]\n我先抓住左边，别把我甩出去。",
 61 |     right: "[Emotion: Thinking]\n右边这个位置不错，我可以探头看你。",
 62 |     top: "[Emotion: Confused]\n太高了，我先挂在这里。",
 63 |     none: "[Emotion: Neutral]\n位置调整好了。"
 64 |   };
 65 | 
 66 |   const STATE_PRIORITY = {
 67 |     idle: 1,
 68 |     sleep: 2,
 69 |     chat: 3,
 70 |     bottom: 4,
 71 |     edge: 5,
 72 |     touch: 6,
 73 |     angry: 7,
 74 |     studyBreak: 7,
 75 |     thinking: 8,
 76 |     studyFocus: 8,
 77 |     speaking: 9,
 78 |     drag: 10
 79 |   };
 80 | 
 81 |   const stateSources = new Map();
 82 |   const stateTimers = new Map();
 83 |   let activeState = "idle";
 84 |   let activeSource = "base";
 85 |   let settingsSnapshot = null;
 86 |   let moodPortraitUrls = {};
 87 |   let moodPortraitMeta = {};
 88 |   let interactionPortraitUrls = {};
 89 |   let interactionPortraitMeta = {};
 90 |   let interactionSlots = DEFAULT_INTERACTION_SLOTS;
 91 |   let singleClickTimer = null;
 92 |   let lastTapTimes = [];
 93 |   let lastUserInteractionAt = Date.now();
 94 |   let idleReminderAt = 0;
 95 |   let debugPanel = null;
 96 |   let settingsTabsReady = false;
 97 |   let lastRenderedState = "";
 98 |   let lastRenderedSrc = null;
 99 | 
100 |   function injectInteractionStyles() {
101 |     // Layout styles live in CSS files now.
102 |   }
103 | 
104 |   function notifySuccess(message) {
105 |     window.tablePetNotify?.success?.(message);
106 |   }
107 | 
108 |   function notifyWarning(message) {
109 |     window.tablePetNotify?.warning?.(message);
110 |   }
111 | 
112 |   function notifyError(message) {
113 |     window.tablePetNotify?.error?.(message);
114 |   }
115 | 
116 |   function escapeHtml(text) {
117 |     return String(text)
118 |       .replace(/&/g, "&amp;")
119 |       .replace(/</g, "&lt;")
120 |       .replace(/>/g, "&gt;")
121 |       .replace(/"/g, "&quot;")
122 |       .replace(/'/g, "&#039;");
123 |   }
124 | 
125 |   function visibleReplyText(text) {
126 |     return String(text || "")
127 |       .replace(/^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i, "")
128 |       .trim();
129 |   }
130 | 
131 |   function randomItem(items) {
132 |     return items[Math.floor(Math.random() * items.length)] || items[0] || "";
133 |   }
134 | 
135 |   function markUserInteraction() {
136 |     lastUserInteractionAt = Date.now();
137 |   }
138 | 
139 |   function showLocalReply(text, { open = true } = {}) {
140 |     if (!replyText) return;
141 |     const wasVisible = document.body.classList.contains("chat-visible");
142 |     replyText.innerHTML = escapeHtml(visibleReplyText(text)).replace(/\n/g, "<br />");
143 |     const bubble = replyText.closest(".bubble");
144 |     if (bubble && !wasVisible) {
145 |       bubble.style.animation = "none";
146 |       bubble.offsetHeight;
147 |       bubble.style.animation = "";
148 |     }
149 |     if (open) openChat().catch(() => undefined);
150 |   }
151 | 
152 |   function nearestMoodPortraitUrl(activeMood) {
153 |     if (moodPortraitUrls[activeMood]) return moodPortraitUrls[activeMood];
154 |     const index = Math.max(0, MOOD_FALLBACK_ORDER.indexOf(activeMood));
155 | 
156 |     for (let distance = 1; distance < MOOD_FALLBACK_ORDER.length; distance += 1) {
157 |       const left = MOOD_FALLBACK_ORDER[index - distance];
158 |       const right = MOOD_FALLBACK_ORDER[index + distance];
159 |       if (left && moodPortraitUrls[left]) return moodPortraitUrls[left];
160 |       if (right && moodPortraitUrls[right]) return moodPortraitUrls[right];
161 |     }
162 | 
163 |     return "";
164 |   }
165 | 
166 |   function currentMoodKey() {
167 |     if (portrait.classList.contains("confused")) return "Confused";
168 |     if (portrait.classList.contains("thinking")) return "Thinking";
169 |     if (portrait.classList.contains("happy")) return "Happy";
170 |     if (portrait.classList.contains("encouraging")) return "Encouraging";
171 |     return settingsSnapshot?.mood || "Neutral";
172 |   }
173 | 
174 |   function setPortraitSrc(src) {
175 |     if (!portraitImage || !src) return;
176 |     const currentSrc = portraitImage.getAttribute("src") || "";
177 |     if (currentSrc === src || portraitImage.src === src) {
178 |       lastRenderedSrc = src;
179 |       return;
180 |     }
181 |     lastRenderedSrc = src;
182 |     if (src.startsWith("data:") || src.startsWith("file:") || src.startsWith("blob:")) {
183 |       portraitImage.setAttribute("src", src);
184 |       return;
185 |     }
186 |     const preloader = new Image();
187 |     preloader.decoding = "async";
188 |     preloader.onload = () => {
189 |       if (lastRenderedSrc === src) portraitImage.setAttribute("src", src);
190 |     };
191 |     preloader.onerror = () => {
192 |       if (lastRenderedSrc === src && !portraitImage.getAttribute("src")) portraitImage.setAttribute("src", src);
193 |     };
194 |     preloader.src = src;
195 |   }
196 | 
197 |   function removeInteractionClasses() {
198 |     [...portrait.classList].forEach((className) => {
199 |       if (className.startsWith("interaction-") || className.startsWith("state-source-")) {
200 |         portrait.classList.remove(className);
201 |       }
202 |     });
203 |   }
204 | 
205 |   function renderState() {
206 |     const domSrc = portraitImage?.getAttribute("src") || "";
207 |     if (domSrc && domSrc !== lastRenderedSrc) lastRenderedSrc = domSrc;
208 |     const fallbackMoodSrc = domSrc || lastRenderedSrc || nearestMoodPortraitUrl(currentMoodKey());
209 |     const nextSrc = interactionPortraitUrls[activeState] || interactionPortraitUrls.idle || fallbackMoodSrc || lastRenderedSrc || "";
210 |     const hasStateClass = portrait.classList.contains(`interaction-${activeState}`);
211 |     const sameVisualState = activeState === lastRenderedState && nextSrc === lastRenderedSrc && (!nextSrc || domSrc === nextSrc) && !portrait.classList.contains("pet-visual-dirty") && hasStateClass;
212 | 
213 |     document.body.dataset.petState = activeState;
214 |     document.body.classList.toggle("pet-debug-open", Boolean(debugPanel && !debugPanel.hidden));
215 | 
216 |     if (!sameVisualState) {
217 |       if ((activeState === "idle" || activeState === "chat") && lastRenderedState === activeState) {
218 |         if (nextSrc) setPortraitSrc(nextSrc);
219 |         lastRenderedSrc = nextSrc || lastRenderedSrc;
220 |         renderDebugPanel();
221 |         return;
222 |       }
223 |       portrait.classList.add("pet-visual-dirty");
224 |       removeInteractionClasses();
225 |       portrait.classList.add(`interaction-${activeState}`, `state-source-${activeSource}`);
226 |       window.setTimeout(() => portrait.classList.remove("pet-visual-dirty"), 0);
227 |       if (nextSrc) setPortraitSrc(nextSrc);
228 |       lastRenderedState = activeState;
229 |       lastRenderedSrc = nextSrc || lastRenderedSrc;
230 |     }
231 | 
232 |     renderDebugPanel();
233 |   }
234 | 
235 |   function resolveState() {
236 |     let winner = { source: "base", state: "idle", priority: STATE_PRIORITY.idle };
237 |     for (const [source, entry] of stateSources.entries()) {
238 |       const priority = entry.priority ?? STATE_PRIORITY[entry.state] ?? 1;
239 |       if (priority >= winner.priority) {
240 |         winner = { source, state: entry.state, priority };
241 |       }
242 |     }
243 |     activeState = winner.state;
244 |     activeSource = winner.source;
245 |     renderState();
246 |   }
247 | 
248 |   function clearStateSource(source) {
249 |     window.clearTimeout(stateTimers.get(source));
250 |     stateTimers.delete(source);
251 |     stateSources.delete(source);
252 |     resolveState();
253 |   }
254 | 
255 |   function setStateSource(source, state, { priority, duration = 0 } = {}) {
256 |     window.clearTimeout(stateTimers.get(source));
257 |     stateSources.set(source, {
258 |       state: interactionSlots.some((slot) => slot.key === state) ? state : "idle",
259 |       priority: priority ?? STATE_PRIORITY[state] ?? 1,
260 |       startedAt: Date.now()
261 |     });
262 |     if (duration > 0) {
263 |       stateTimers.set(source, window.setTimeout(() => clearStateSource(source), duration));
264 |     }
265 |     resolveState();
266 |   }
267 | 
268 |   function setTemporaryState(state, duration = 1800) {
269 |     setStateSource("interaction", state, { duration });
270 |   }
271 | 
272 |   async function openChat() {
273 |     const wasVisible = document.body.classList.contains("chat-visible");
274 |     if (!wasVisible) {
275 |       document.body.classList.remove("chat-collapsed");
276 |       document.body.classList.add("chat-visible");
277 |     }
278 |     if (!wasVisible && window.__tablePetLastChatVisible !== true) {
279 |       window.__tablePetLastChatVisible = true;
280 |       await window.tablePet.setChatVisible(true);
281 |     }
282 |     messageInput?.focus();
283 |   }
284 | 
285 |   async function closeChat() {
286 |     document.body.classList.add("chat-collapsed");
287 |     document.body.classList.remove("chat-visible");
288 |     clearStateSource("chat");
289 |     window.__tablePetLastChatVisible = false;
290 |     await window.tablePet.setChatVisible(false);
291 |   }
292 | 
293 |   function handleTouch() {
294 |     markUserInteraction();
295 |     const wasVisible = document.body.classList.contains("chat-visible");
296 |     if (!wasVisible) setTemporaryState("touch", 2200);
297 |     if (wasVisible) return;
298 |     showLocalReply(randomItem(TOUCH_LINES));
299 |   }
300 | 
301 |   function handleRandomLine() {
302 |     markUserInteraction();
303 |     if (document.body.classList.contains("chat-visible")) return;
304 |     showLocalReply(randomItem(RANDOM_LINES));
305 |   }
306 | 
307 |   function handleAngryClick() {
308 |     markUserInteraction();
309 |     setTemporaryState("angry", 3000);
310 |     showLocalReply(randomItem(ANGRY_LINES));
311 |   }
312 | 
313 |   function enterRestState() {
314 |     markUserInteraction();
315 |     setStateSource("rest", "sleep", { priority: STATE_PRIORITY.sleep });
316 |     showLocalReply("[Emotion: Neutral]\n我先安静待机。点我或者双击我就会回来。", { open: false });
317 |   }
318 | 
319 |   function leaveRestState() {
320 |     if (stateSources.has("rest")) clearStateSource("rest");
321 |   }
322 | 
323 |   function isTouchOnHead(event) {
324 |     const rect = portrait.getBoundingClientRect();
325 |     return event.clientY - rect.top <= rect.height * 0.36;
326 |   }
327 | 
328 |   function registerRapidTap() {
329 |     const now = Date.now();
330 |     lastTapTimes = lastTapTimes.filter((time) => now - time < 2200);
331 |     lastTapTimes.push(now);
332 |     return lastTapTimes.length;
333 |   }
334 | 
335 |   function handlePortraitClick(event) {
336 |     if (settingsDialog?.open) return;
337 |     if (event.button !== 0) return;
338 |     event.preventDefault();
339 |     event.stopPropagation();
340 |     event.stopImmediatePropagation();
341 |     if (event.detail && event.detail > 1) {
342 |       window.clearTimeout(singleClickTimer);
343 |       singleClickTimer = null;
344 |       return;
345 |     }
346 |     window.clearTimeout(singleClickTimer);
347 |     singleClickTimer = null;
348 | 
349 |     hideContextMenu();
350 |     leaveRestState();
351 | 
352 |     const tapCount = registerRapidTap();
353 |     const touchOnHead = isTouchOnHead(event);
354 | 
355 |     if (tapCount >= 5) {
356 |       lastTapTimes = [];
357 |       handleAngryClick();
358 |       return;
359 |     }
360 | 
361 |     singleClickTimer = window.setTimeout(() => {
362 |       if (touchOnHead) {
363 |         handleTouch();
364 |       } else {
365 |         handleRandomLine();
366 |       }
367 |       singleClickTimer = null;
368 |     }, 180);
369 |   }
370 | 
371 |   function handlePortraitDoubleClick(event) {
372 |     event.preventDefault();
373 |     event.stopPropagation();
374 |     event.stopImmediatePropagation();
375 |     markUserInteraction();
376 |     leaveRestState();
377 |     window.clearTimeout(singleClickTimer);
378 |     setTemporaryState("touch", 1200);
379 |     openChat().catch(() => undefined);
380 |   }
381 | 
382 |   function showContextMenu(event) {
383 |     if (!petContextMenu || settingsDialog?.open) return;
384 |     event.preventDefault();
385 |     event.stopPropagation();
386 |     event.stopImmediatePropagation();
387 |     markUserInteraction();
388 | 
389 |     const x = Math.min(event.clientX, window.innerWidth - 154);
390 |     const y = Math.min(event.clientY, window.innerHeight - 288);
391 |     petContextMenu.style.left = `${Math.max(8, x)}px`;
392 |     petContextMenu.style.top = `${Math.max(8, y)}px`;
393 |     petContextMenu.hidden = false;
394 |   }
395 | 
396 |   function hideContextMenu() {
397 |     if (petContextMenu) petContextMenu.hidden = true;
398 |   }
399 | 
400 |   async function handleContextAction(event) {
401 |     const button = event.target.closest("button[data-pet-action]");
402 |     if (!button) return;
403 |     const action = button.dataset.petAction;
404 |     hideContextMenu();
405 |     markUserInteraction();
406 | 
407 |     if (action === "chat") {
408 |       await openChat();
409 |       return;
410 |     }
411 |     if (action === "close-chat") {
412 |       await closeChat();
413 |       return;
414 |     }
415 |     if (action === "random") {
416 |       handleRandomLine();
417 |       return;
418 |     }
419 |     if (action === "touch") {
420 |       handleTouch();
421 |       return;
422 |     }
423 |     if (action === "pin") {
424 |       const pinned = await window.tablePet.togglePin();
425 |       showLocalReply(pinned ? "[Emotion: Happy]\n我会保持在最前面。" : "[Emotion: Neutral]\n好，我不再强制置顶。", { open: true });
426 |       return;
427 |     }
428 |     if (action === "rest") {
429 |       enterRestState();
430 |       return;
431 |     }
432 |     if (action === "debug") {
433 |       toggleDebugPanel();
434 |       return;
435 |     }
436 |     if (action === "settings") {
437 |       settingsButton?.click();
438 |       return;
439 |     }
440 |     if (action === "hide") {
441 |       await window.tablePet.minimize();
442 |     }
443 |   }
444 | 
445 |   function statusText(hasImage) {
446 |     return hasImage ? "已设置" : "未设置";
447 |   }
448 | 
449 |   function formatBytes(bytes) {
450 |     const value = Number(bytes || 0);
451 |     if (!value) return "";
452 |     if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
453 |     return `${Math.max(1, Math.round(value / 1024))}KB`;
454 |   }
455 | 
456 |   function portraitMetaText(meta, fallbackText) {
457 |     if (!meta) return fallbackText || "将使用 fallback";
458 |     const size = meta.width && meta.height ? `${meta.width}×${meta.height}` : "未知尺寸";
459 |     const alpha = meta.hasAlpha ? "透明" : "非透明";
460 |     return `${size} · ${formatBytes(meta.bytes)} · ${alpha}`;
461 |   }
462 | 
463 |   function fallbackTextFor(dataName, key, urls) {
464 |     if (urls[key]) return "";
465 |     if (dataName === "interaction") {
466 |       if (key !== "idle" && urls.idle) return "fallback：普通待机";
467 |       return "fallback：当前心情立绘";
468 |     }
469 |     return "fallback：相邻心情立绘";
470 |   }
471 | 
472 |   function ensurePreviewDialog() {
473 |     let dialog = document.querySelector("#portraitPreviewDialog");
474 |     if (dialog) return dialog;
475 |     dialog = document.createElement("dialog");
476 |     dialog.id = "portraitPreviewDialog";
477 |     dialog.className = "portrait-preview-dialog";
478 |     dialog.innerHTML = `
479 |       <button type="button" class="portrait-preview-close" aria-label="关闭预览">×</button>
480 |       <img alt="立绘预览" />
481 |       <p></p>
482 |     `;
483 |     dialog.addEventListener("click", (event) => {
484 |       if (event.target === dialog || event.target.closest(".portrait-preview-close")) dialog.close();
485 |     });
486 |     document.body.append(dialog);
487 |     return dialog;
488 |   }
489 | 
490 |   function openPortraitPreview(url, label, meta) {
491 |     if (!url) return;
492 |     const dialog = ensurePreviewDialog();
493 |     dialog.querySelector("img").src = url;
494 |     dialog.querySelector("p").textContent = `${label} · ${portraitMetaText(meta, "")}`;
495 |     dialog.showModal();
496 |   }
497 | 
498 |   function ensurePickerActions(container, title) {
499 |     if (!container || container.previousElementSibling?.classList.contains("portrait-bulk-actions")) return;
500 |     const row = document.createElement("div");
501 |     row.className = "portrait-bulk-actions";
502 |     row.innerHTML = `
503 |       <span>${escapeHtml(title)}</span>
504 |       <div class="portrait-bulk-buttons">
505 |         <button type="button" data-portrait-open-folder>打开目录</button>
506 |         <button type="button" data-portrait-clean-unused>清理未用</button>
507 |         <button type="button" data-portrait-bulk-clear="${title.includes("心情") ? "mood" : "interaction"}">清空本组</button>
508 |       </div>
509 |     `;
510 |     container.before(row);
511 |   }
512 | 
513 |   function renderPortraitPickerList(container, items, urls, dataName, metaMap = {}) {
514 |     if (!container) return;
515 |     ensurePickerActions(container, dataName === "mood" ? "心情图片" : "互动图片");
516 |     container.innerHTML = items
517 |       .map((item) => {
518 |         const url = urls[item.key] || "";
519 |         const meta = metaMap[item.key] || null;
520 |         const fallback = fallbackTextFor(dataName, item.key, urls);
521 |         const attrName = dataName === "mood" ? "data-mood-key" : "data-interaction-key";
522 |         const resetAttr = dataName === "mood" ? "data-reset-mood" : "data-reset-interaction";
523 |         return `
524 |           <div class="portrait-picker-item">
525 |             <button type="button" class="portrait-picker-preview ${url ? "has-image" : ""}" data-preview-url="${escapeHtml(url)}" data-preview-label="${escapeHtml(item.label || item.key)}" data-preview-kind="${escapeHtml(dataName)}" data-preview-key="${escapeHtml(item.key)}" ${url ? "" : "disabled"}>
526 |               ${url ? `<img src="${escapeHtml(url)}" alt="" />` : "图"}
527 |             </button>
528 |             <div class="portrait-picker-copy">
529 |               <strong>${escapeHtml(item.label || item.key)}</strong>
530 |               <span>${statusText(Boolean(url))}${url ? " · 可预览/清除" : ` · ${escapeHtml(fallback)}`}</span>
531 |               <small>${escapeHtml(portraitMetaText(meta, fallback))}</small>
532 |             </div>
533 |             <div class="portrait-picker-buttons">
534 |               <button type="button" ${attrName}="${escapeHtml(item.key)}">选择</button>
535 |               <button type="button" class="ghost" ${resetAttr}="${escapeHtml(item.key)}">清除</button>
536 |             </div>
537 |           </div>
538 |         `;
539 |       })
540 |       .join("");
541 |   }
542 | 
543 |   function mergeInteractionSlots(slots) {
544 |     const map = new Map(DEFAULT_INTERACTION_SLOTS.map((slot) => [slot.key, slot]));
545 |     (slots || []).forEach((slot) => map.set(slot.key, slot));
546 |     return [...map.values()];
547 |   }
548 | 
549 |   function renderPortraitPickers(settings) {
550 |     const moodOptions = settings?.moodOptions || [];
551 |     interactionSlots = mergeInteractionSlots(settings?.interactionPortraitSlots);
552 |     moodPortraitUrls = settings?.moodPortraitUrls || {};
553 |     moodPortraitMeta = settings?.moodPortraitMeta || {};
554 |     interactionPortraitUrls = settings?.interactionPortraitUrls || {};
555 |     interactionPortraitMeta = settings?.interactionPortraitMeta || {};
556 | 
557 |     renderPortraitPickerList(moodPortraitList, moodOptions, moodPortraitUrls, "mood", moodPortraitMeta);
558 |     renderPortraitPickerList(interactionPortraitList, interactionSlots, interactionPortraitUrls, "interaction", interactionPortraitMeta);
559 |     renderState();
560 |   }
561 | 
562 |   async function refreshInteractionSettings() {
563 |     try {
564 |       settingsSnapshot = await window.tablePet.getSettings();
565 |       renderPortraitPickers(settingsSnapshot);
566 |       renderDebugPanel();
567 |     } catch (error) {
568 |       notifyError(`刷新立绘设置失败：${error.message || error}`);
569 |     }
570 |   }
571 | 
572 |   async function savePortraitPaths(patch) {
573 |     const current = settingsSnapshot || await window.tablePet.getSettings();
574 |     const next = await window.tablePet.saveSettings({
575 |       ...current,
576 |       ...patch,
577 |       moodPortraitPaths: {
578 |         ...(current.moodPortraitPaths || {}),
579 |         ...(patch.moodPortraitPaths || {})
580 |       },
581 |       interactionPortraitPaths: {
582 |         ...(current.interactionPortraitPaths || {}),
583 |         ...(patch.interactionPortraitPaths || {})
584 |       }
585 |     });
586 |     settingsSnapshot = next;
587 |     renderPortraitPickers(next);
588 |     return next;
589 |   }
590 | 
591 |   async function importPortraitFromButton(event) {
592 |     const previewButton = event.target.closest("button[data-preview-url]");
593 |     const moodButton = event.target.closest("button[data-mood-key]");
594 |     const interactionButton = event.target.closest("button[data-interaction-key]");
595 |     const resetMoodButton = event.target.closest("button[data-reset-mood]");
596 |     const resetInteractionButton = event.target.closest("button[data-reset-interaction]");
597 |     const bulkClearButton = event.target.closest("button[data-portrait-bulk-clear]");
598 |     const openFolderButton = event.target.closest("button[data-portrait-open-folder]");
599 |     const cleanUnusedButton = event.target.closest("button[data-portrait-clean-unused]");
600 | 
601 |     if (previewButton?.dataset.previewUrl) {
602 |       const metaMap = previewButton.dataset.previewKind === "mood" ? moodPortraitMeta : interactionPortraitMeta;
603 |       openPortraitPreview(previewButton.dataset.previewUrl, previewButton.dataset.previewLabel, metaMap[previewButton.dataset.previewKey]);
604 |       return;
605 |     }
606 | 
607 |     if (openFolderButton) {
608 |       await window.tablePet.openPortraitFolder?.();
609 |       notifySuccess("已打开图片目录");
610 |       return;
611 |     }
612 | 
613 |     if (cleanUnusedButton) {
614 |       if (!confirm("清理 data/portraits 中未被任何状态引用的旧图片？")) return;
615 |       const result = await window.tablePet.cleanupUnusedPortraits?.();
616 |       notifySuccess(`已清理 ${result?.removedCount || 0} 个未使用图片，保留 ${result?.keptCount || 0} 个。`);
617 |       return;
618 |     }
619 | 
620 |     if (bulkClearButton) {
621 |       const type = bulkClearButton.dataset.portraitBulkClear;
622 |       if (!confirm(`确定清空${type === "mood" ? "心情" : "互动"}图片吗？`)) return;
623 |       const keys = type === "mood"
624 |         ? (settingsSnapshot?.moodOptions || []).map((item) => item.key)
625 |         : interactionSlots.map((item) => item.key);
626 |       const emptyPaths = Object.fromEntries(keys.map((key) => [key, ""]));
627 |       await savePortraitPaths(type === "mood" ? { moodPortraitPaths: emptyPaths } : { interactionPortraitPaths: emptyPaths });
628 |       notifySuccess("本组图片已清空");
629 |       return;
630 |     }
631 | 
632 |     if (resetMoodButton) {
633 |       const result = await window.tablePet.resetMoodPortrait?.(resetMoodButton.dataset.resetMood);
634 |       if (result?.settings) {
635 |         settingsSnapshot = result.settings;
636 |         renderPortraitPickers(result.settings);
637 |       } else {
638 |         await savePortraitPaths({ moodPortraitPaths: { [resetMoodButton.dataset.resetMood]: "" } });
639 |       }
640 |       notifySuccess("图片已清除");
641 |       return;
642 |     }
643 | 
644 |     if (resetInteractionButton) {
645 |       const result = await window.tablePet.resetInteractionPortrait?.(resetInteractionButton.dataset.resetInteraction);
646 |       if (result?.settings) {
647 |         settingsSnapshot = result.settings;
648 |         renderPortraitPickers(result.settings);
649 |       } else {
650 |         await savePortraitPaths({ interactionPortraitPaths: { [resetInteractionButton.dataset.resetInteraction]: "" } });
651 |       }
652 |       notifySuccess("图片已清除");
653 |       return;
654 |     }
655 | 
656 |     if (!moodButton && !interactionButton) return;
657 | 
658 |     const result = moodButton
659 |       ? await window.tablePet.importMoodPortrait(moodButton.dataset.moodKey)
660 |       : await window.tablePet.importInteractionPortrait(interactionButton.dataset.interactionKey);
661 | 
662 |     if (result?.error) {
663 |       notifyError(`导入失败：${result.error}`);
664 |       return;
665 |     }
666 | 
667 |     if (result?.warnings?.length) {
668 |       notifyWarning(`图片已导入，但有建议：${result.warnings.join("；")}`);
669 |     } else if (result?.settings) {
670 |       notifySuccess("图片已导入");
671 |     }
672 | 
673 |     if (result?.settings) {
674 |       settingsSnapshot = result.settings;
675 |       renderPortraitPickers(result.settings);
676 |     }
677 |   }
678 | 
679 |   function handleDockState(event) {
680 |     const dockState = event.detail || {};
681 |     if (dockState.bottom) {
682 |       setStateSource("dock", "bottom", { priority: STATE_PRIORITY.bottom, duration: 5200 });
683 |       showLocalReply("[Emotion: Neutral]\n我先坐在任务栏附近，别再把聊天框拖出屏幕。", { open: false });
684 |       return;
685 |     }
686 | 
687 |     if (dockState.edge && dockState.edge !== "none") {
688 |       setStateSource("dock", "edge", { priority: STATE_PRIORITY.edge, duration: 4600 });
689 |       showLocalReply(EDGE_LINES[dockState.edge] || EDGE_LINES.none, { open: false });
690 |       return;
691 |     }
692 | 
693 |     clearStateSource("dock");
694 |   }
695 | 
696 |   function setupPortraitStabilityGuard() {
697 |     if (!portraitImage) return;
698 |     let restoring = false;
699 |     let repairTimer = null;
700 |     const observer = new MutationObserver(() => {
701 |       if (document.body.classList.contains("settings-open")) return;
702 |       if (restoring) return;
703 |       try {
704 |         restoring = true;
705 |         if (lastRenderedSrc && !portraitImage.getAttribute("src")) {
706 |           portraitImage.setAttribute("src", lastRenderedSrc);
707 |         }
708 |         if (!portrait.classList.contains(`interaction-${activeState}`) && !repairTimer && !portrait.classList.contains("pet-visual-dirty") && activeState !== "idle" && activeState !== "chat") {
709 |           lastRenderedState = "";
710 |           repairTimer = window.setTimeout(() => {
711 |             repairTimer = null;
712 |             renderState();
713 |           }, 0);
714 |         }
715 |       } finally {
716 |         restoring = false;
717 |       }
718 |     });
719 |     observer.observe(portraitImage, { attributes: true, attributeFilter: ["src"] });
720 |     observer.observe(portrait, { attributes: true, attributeFilter: ["class"] });
721 |   }
722 | 
723 |   function setupRuntimeHooks() {
724 |     if (window.tablePet.__interactionHooksInstalled) return;
725 |     window.tablePet.__interactionHooksInstalled = true;
726 | 
727 |     const originalSendChat = window.tablePet.sendChat?.bind(window.tablePet);
728 |     if (originalSendChat) {
729 |       window.tablePet.sendChat = async (...args) => {
730 |         markUserInteraction();
731 |         setStateSource("runtime", "thinking", { priority: STATE_PRIORITY.thinking });
732 |         try {
733 |           return await originalSendChat(...args);
734 |         } finally {
735 |           clearStateSource("runtime");
736 |         }
737 |       };
738 |     }
739 | 
740 |     const originalSpeak = window.tablePet.speak?.bind(window.tablePet);
741 |     if (originalSpeak) {
742 |       window.tablePet.speak = async (...args) => {
743 |         setStateSource("voice", "speaking", { priority: STATE_PRIORITY.speaking });
744 |         try {
745 |           return await originalSpeak(...args);
746 |         } finally {
747 |           window.setTimeout(() => clearStateSource("voice"), 900);
748 |         }
749 |       };
750 |     }
751 |   }
752 | 
753 |   function setupVoiceObserver() {
754 |     if (!voiceStatusText) return;
755 |     const updateFromVoiceText = () => {
756 |       const text = voiceStatusText.textContent || "";
757 |       if (/播放中|生成|推理|发送|加载|接收/.test(text)) {
758 |         setStateSource("voiceText", /播放中/.test(text) ? "speaking" : "thinking", {
759 |           priority: /播放中/.test(text) ? STATE_PRIORITY.speaking : STATE_PRIORITY.thinking,
760 |           duration: 1800
761 |         });
762 |       }
763 |     };
764 |     new MutationObserver(updateFromVoiceText).observe(voiceStatusText, { childList: true, characterData: true, subtree: true });
765 |   }
766 | 
767 |   function setupSettingsTabs() {
768 |     if (!settingsForm || settingsTabsReady) return;
769 |     settingsTabsReady = true;
770 |     const sections = [...settingsForm.querySelectorAll(":scope > .settings-section, :scope > details.settings-section")];
771 |     if (!sections.length) return;
772 | 
773 |     const tabs = document.createElement("div");
774 |     tabs.className = "settings-tabs";
775 |     const labels = sections.map((section, index) => {
776 |       const divider = section.querySelector(":scope > .settings-divider")?.textContent;
777 |       const summary = section.querySelector(":scope > summary")?.textContent;
778 |       return (divider || summary || `设置 ${index + 1}`).trim();
779 |     });
780 | 
781 |     tabs.innerHTML = labels
782 |       .map((label, index) => `<button type="button" data-settings-tab="${index}" ${index === 0 ? "class=\"active\"" : ""}>${escapeHtml(label)}</button>`)
783 |       .join("");
784 |     settingsForm.querySelector(".settings-head")?.after(tabs);
785 | 
786 |     function activate(index) {
787 |       sections.forEach((section, sectionIndex) => {
788 |         section.classList.toggle("settings-tab-hidden", sectionIndex !== index);
789 |         if (section.tagName.toLowerCase() === "details") section.open = sectionIndex === index;
790 |       });
791 |       tabs.querySelectorAll("button").forEach((button, buttonIndex) => {
792 |         button.classList.toggle("active", buttonIndex === index);
793 |       });
794 |     }
795 | 
796 |     tabs.addEventListener("click", (event) => {
797 |       const button = event.target.closest("button[data-settings-tab]");
798 |       if (!button) return;
799 |       activate(Number(button.dataset.settingsTab));
800 |     });
801 |     activate(0);
802 |   }
803 | 
804 |   function setupIdleBehavior() {
805 |     window.setInterval(() => {
806 |       if (settingsDialog?.open || document.body.classList.contains("chat-visible")) return;
807 |       if (stateSources.has("runtime") || stateSources.has("voice") || stateSources.has("drag")) return;
808 |       const now = Date.now();
809 |       const idleMs = now - lastUserInteractionAt;
810 |       if (idleMs > 15 * 60 * 1000) {
811 |         setStateSource("idleAuto", "sleep", { priority: STATE_PRIORITY.sleep, duration: 90 * 1000 });
812 |         return;
813 |       }
814 |       if (idleMs > 5 * 60 * 1000 && now - idleReminderAt > 10 * 60 * 1000) {
815 |         idleReminderAt = now;
816 |         setStateSource("idleAuto", "thinking", { priority: STATE_PRIORITY.thinking, duration: 3600 });
817 |         showLocalReply(randomItem(IDLE_LINES), { open: true });
818 |       }
819 |     }, 30 * 1000);
820 |   }
821 | 
822 |   function debugRows() {
823 |     return [
824 |       ["状态", activeState],
825 |       ["来源", activeSource],
826 |       ["聊天", document.body.classList.contains("chat-visible") ? "打开" : "收起"],
827 |       ["心情", currentMoodKey()],
828 |       ["当前图", portraitImage?.getAttribute("src") || "默认/未设置"],
829 |       ["语音", voiceStatusText?.textContent || "无"],
830 |       ["空闲", `${Math.round((Date.now() - lastUserInteractionAt) / 1000)}s`]
831 |     ];
832 |   }
833 | 
834 |   function renderDebugPanel() {
835 |     if (!debugPanel || debugPanel.hidden) return;
836 |     debugPanel.querySelector(".debug-content").innerHTML = debugRows()
837 |       .map(([key, value]) => `<div><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`)
838 |       .join("");
839 |   }
840 | 
841 |   function toggleDebugPanel() {
842 |     if (!debugPanel) {
843 |       debugPanel = document.createElement("aside");
844 |       debugPanel.className = "pet-debug-panel";
845 |       debugPanel.innerHTML = `
846 |         <div class="debug-head">
847 |           <strong>桌宠调试</strong>
848 |           <button type="button" data-debug-close>×</button>
849 |         </div>
850 |         <div class="debug-content"></div>
851 |       `;
852 |       document.body.append(debugPanel);
853 |       debugPanel.addEventListener("click", (event) => {
854 |         if (event.target.closest("button[data-debug-close]")) {
855 |           debugPanel.hidden = true;
856 |           document.body.classList.remove("pet-debug-open");
857 |         }
858 |       });
859 |     }
860 |     debugPanel.hidden = !debugPanel.hidden;
861 |     document.body.classList.toggle("pet-debug-open", !debugPanel.hidden);
862 |     renderDebugPanel();
863 |   }
864 | 
865 |   portrait.addEventListener("click", handlePortraitClick, true);
866 |   portrait.addEventListener("dblclick", handlePortraitDoubleClick, true);
867 |   portrait.addEventListener("contextmenu", showContextMenu, true);
868 |   petContextMenu?.addEventListener("click", (event) => {
869 |     handleContextAction(event).catch((error) => notifyError(`快捷菜单操作失败：${error.message || error}`));
870 |   });
871 |   document.addEventListener("pointerdown", (event) => {
872 |     if (!petContextMenu || petContextMenu.hidden) return;
873 |     if (!event.target.closest("#petContextMenu")) hideContextMenu();
874 |   });
875 |   document.addEventListener("keydown", (event) => {
876 |     if (event.key === "Escape") hideContextMenu();
877 |   });
878 |   document.addEventListener("pointerdown", (event) => {
879 |     if (event.target.closest(".portrait")) return;
880 |     markUserInteraction();
881 |   }, true);
882 |   document.addEventListener("keydown", markUserInteraction, true);
883 |   sendButton?.addEventListener("click", () => setStateSource("runtime", "thinking", { priority: STATE_PRIORITY.thinking, duration: 4500 }), true);
884 | 
885 |   window.addEventListener("tablepet:interaction", (event) => {
886 |     const detail = event.detail || {};
887 |     if (detail.state === "drag") {
888 |       setStateSource("drag", "drag", { priority: STATE_PRIORITY.drag });
889 |     } else {
890 |       setTemporaryState(detail.state, Number(detail.duration || 0));
891 |     }
892 |   });
893 |   window.addEventListener("tablepet:dockState", (event) => {
894 |     clearStateSource("drag");
895 |     handleDockState(event);
896 |   });
897 |   window.addEventListener("tablepet:tts-state", (event) => {
898 |     const stage = event.detail?.stage;
899 |     if (stage === "playing") setStateSource("voice", "speaking", { priority: STATE_PRIORITY.speaking });
900 |     else if (stage === "synthesizing" || stage === "starting") setStateSource("voice", "thinking", { priority: STATE_PRIORITY.thinking });
901 |     else if (stage === "error") setStateSource("voice", "angry", { priority: STATE_PRIORITY.angry, duration: 1800 });
902 |     else clearStateSource("voice");
903 |   });
904 |   window.addEventListener("tablepet:pomodoro-state", (event) => {
905 |     const { mode, status } = event.detail || {};
906 |     if (status === "running" && mode === "focus") setStateSource("pomodoro", "studyFocus", { priority: STATE_PRIORITY.studyFocus });
907 |     else if (status === "running" && mode === "break") setStateSource("pomodoro", "studyBreak", { priority: STATE_PRIORITY.studyBreak });
908 |     else clearStateSource("pomodoro");
909 |   });
910 |   window.tablePet.onChatVisibilityChanged?.((visible) => {
911 |     window.__tablePetLastChatVisible = Boolean(visible);
912 |     if (visible) setStateSource("chat", "chat", { priority: STATE_PRIORITY.chat });
913 |     else clearStateSource("chat");
914 |   });
915 |   settingsButton?.addEventListener("click", () => {
916 |     window.tablePet.setSettingsVisible?.(true).catch(() => undefined);
917 |     hideContextMenu();
918 |     setupSettingsTabs();
919 |     window.setTimeout(() => {
920 |       setupSettingsTabs();
921 |       refreshInteractionSettings();
922 |     }, 80);
923 |   }, true);
924 |   settingsDialog?.addEventListener("close", () => {
925 |     window.tablePet.setSettingsVisible?.(false).catch(() => undefined);
926 |   });
927 |   moodPortraitList?.addEventListener("click", (event) => {
928 |     importPortraitFromButton(event).catch((error) => notifyError(`立绘操作失败：${error.message || error}`));
929 |   });
930 |   interactionPortraitList?.addEventListener("click", (event) => {
931 |     importPortraitFromButton(event).catch((error) => notifyError(`立绘操作失败：${error.message || error}`));
932 |   });
933 | 
934 |   window.__tablePetLastChatVisible = document.body.classList.contains("chat-visible");
935 |   injectInteractionStyles();
936 |   setupPortraitStabilityGuard();
937 |   setupRuntimeHooks();
938 |   setupVoiceObserver();
939 |   setupIdleBehavior();
940 |   refreshInteractionSettings().then(() => resolveState()).catch(() => resolveState());
941 | })();
942 | 
```

### todeskpet/src/renderer/pomodoroUi.css

Bytes: 2409
SHA-256: 367f61bddd865bff1d19b1babe9d0fc0fc40d5fa43c1fe0c71360d82e8e4b44d
Lines: 1-1 of 1

```css
1 | .pomodoro-panel{width:min(460px,calc(100vw - 28px));border:0;border-radius:24px;padding:0;background:rgba(255,246,251,.97);box-shadow:0 28px 88px rgba(92,38,66,.28);color:var(--text);-webkit-app-region:no-drag}.pomodoro-panel::backdrop{background:rgba(35,18,28,.28);backdrop-filter:blur(4px)}.pomodoro-panel form{display:grid;gap:14px;padding:18px}.pomodoro-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.pomodoro-head h2{margin:0;font-size:22px}.pomodoro-head p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.pomodoro-clock{display:grid;justify-items:center;gap:8px;padding:18px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,.48))}.pomodoro-clock span{font-size:13px;color:var(--accent-strong);font-weight:700}.pomodoro-clock strong{font-size:54px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:.04em}.pomodoro-clock small{color:var(--muted);font-size:12px}.pomodoro-progress{width:100%;height:8px;border-radius:999px;background:rgba(120,64,92,.12);overflow:hidden}.pomodoro-progress i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent-strong));transition:width .24s ease}.pomodoro-settings{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pomodoro-settings label{display:grid;gap:6px;color:var(--muted);font-size:12px}.pomodoro-settings input{height:36px;border:0;border-radius:12px;padding:0 12px;background:rgba(255,255,255,.78);color:var(--text);outline:0}.pomodoro-presets,.pomodoro-actions,.pomodoro-foot{display:flex;gap:8px;flex-wrap:wrap}.pomodoro-panel button{border:0;border-radius:12px;min-height:34px;padding:0 12px;background:rgba(255,255,255,.74);color:var(--accent-strong);cursor:pointer}.pomodoro-actions button:first-child{background:var(--accent);color:#fff}.pomodoro-panel button:hover{transform:translateY(-1px)}.pomodoro-panel button:disabled{opacity:.45;cursor:not-allowed;transform:none}.pomodoro-panel button.ghost{color:var(--muted);background:rgba(255,255,255,.52)}.pomodoro-foot{align-items:center;justify-content:space-between;color:var(--muted);font-size:12px}body[data-pomodoro-status="running"][data-pomodoro-mode="focus"] .titlebar::after{content:"学习模式";margin-left:auto;font-size:11px;color:var(--accent-strong);background:rgba(255,255,255,.68);border-radius:999px;padding:3px 8px}
```

### todeskpet/src/renderer/pomodoroUi.js

Bytes: 12804
SHA-256: 7f513117a0a0e9bc26947cba9a8ab37dee44362f8dbec681ddd60e31e8874034
Lines: 1-330 of 330

```javascript
  1 | (() => {
  2 |   const STORAGE_KEY = "tablePet.pomodoro.v1";
  3 |   const DEFAULT_STATE = {
  4 |     mode: "focus",
  5 |     status: "idle",
  6 |     focusMinutes: 25,
  7 |     breakMinutes: 5,
  8 |     endAt: 0,
  9 |     remainingSeconds: 25 * 60,
 10 |     completedFocusCount: 0,
 11 |     lastCompletedAt: ""
 12 |   };
 13 | 
 14 |   let state = loadState();
 15 |   let panel = null;
 16 |   let ticker = null;
 17 | 
 18 |   function safeNumber(value, fallback) {
 19 |     const number = Number(value);
 20 |     return Number.isFinite(number) && number > 0 ? number : fallback;
 21 |   }
 22 | 
 23 |   function clampMinutes(value, fallback) {
 24 |     return Math.max(1, Math.min(180, Math.round(safeNumber(value, fallback))));
 25 |   }
 26 | 
 27 |   function loadState() {
 28 |     try {
 29 |       const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
 30 |       return normalizeState({ ...DEFAULT_STATE, ...raw });
 31 |     } catch {
 32 |       return { ...DEFAULT_STATE };
 33 |     }
 34 |   }
 35 | 
 36 |   function normalizeState(next) {
 37 |     const focusMinutes = clampMinutes(next.focusMinutes, DEFAULT_STATE.focusMinutes);
 38 |     const breakMinutes = clampMinutes(next.breakMinutes, DEFAULT_STATE.breakMinutes);
 39 |     const mode = next.mode === "break" ? "break" : "focus";
 40 |     const status = ["idle", "running", "paused"].includes(next.status) ? next.status : "idle";
 41 |     const fallbackSeconds = (mode === "break" ? breakMinutes : focusMinutes) * 60;
 42 |     return {
 43 |       ...DEFAULT_STATE,
 44 |       ...next,
 45 |       mode,
 46 |       status,
 47 |       focusMinutes,
 48 |       breakMinutes,
 49 |       endAt: Number(next.endAt || 0),
 50 |       remainingSeconds: Math.max(0, Math.round(safeNumber(next.remainingSeconds, fallbackSeconds)))
 51 |     };
 52 |   }
 53 | 
 54 |   function saveState() {
 55 |     localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
 56 |   }
 57 | 
 58 |   function stageSeconds(mode = state.mode) {
 59 |     return (mode === "break" ? state.breakMinutes : state.focusMinutes) * 60;
 60 |   }
 61 | 
 62 |   function formatTime(seconds) {
 63 |     const safeSeconds = Math.max(0, Math.round(seconds || 0));
 64 |     const minutes = Math.floor(safeSeconds / 60);
 65 |     const rest = safeSeconds % 60;
 66 |     return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
 67 |   }
 68 | 
 69 |   function modeLabel(mode = state.mode) {
 70 |     return mode === "break" ? "休息" : "专注";
 71 |   }
 72 | 
 73 |   function notify(type, message, options) {
 74 |     const api = window.tablePetNotify;
 75 |     if (api?.[type]) return api[type](message, options);
 76 |     return null;
 77 |   }
 78 | 
 79 |   function dispatchPomodoroState() {
 80 |     document.body.dataset.pomodoroMode = state.mode;
 81 |     document.body.dataset.pomodoroStatus = state.status;
 82 |     window.dispatchEvent(new CustomEvent("tablepet:pomodoro-state", { detail: { ...state } }));
 83 |   }
 84 | 
 85 |   function setState(patch) {
 86 |     state = normalizeState({ ...state, ...patch });
 87 |     saveState();
 88 |     renderPanel();
 89 |     dispatchPomodoroState();
 90 |   }
 91 | 
 92 |   async function track(eventName, payload = {}) {
 93 |     try {
 94 |       await window.tablePetAchievements?.track?.(eventName, payload);
 95 |     } catch {
 96 |       // Achievement tracking must never break the timer.
 97 |     }
 98 |   }
 99 | 
100 |   function ensureContextMenuEntry() {
101 |     const menu = document.querySelector("#petContextMenu");
102 |     if (!menu || menu.querySelector("[data-pet-action='pomodoro']")) return;
103 |     const button = document.createElement("button");
104 |     button.type = "button";
105 |     button.dataset.petAction = "pomodoro";
106 |     button.textContent = "番茄钟";
107 |     const achievementsButton = menu.querySelector("[data-pet-action='achievements']");
108 |     const settingsButton = menu.querySelector("[data-pet-action='settings']");
109 |     menu.insertBefore(button, achievementsButton || settingsButton || null);
110 |   }
111 | 
112 |   function ensurePanel() {
113 |     if (panel) return panel;
114 |     panel = document.createElement("dialog");
115 |     panel.id = "pomodoroPanel";
116 |     panel.className = "pomodoro-panel";
117 |     panel.innerHTML = `
118 |       <form method="dialog">
119 |         <header class="pomodoro-head">
120 |           <div>
121 |             <h2>番茄钟</h2>
122 |             <p>专注时自动进入学习模式立绘，完成后推进专注成就。</p>
123 |           </div>
124 |           <button type="submit" class="icon-button" aria-label="关闭">×</button>
125 |         </header>
126 |         <section class="pomodoro-clock" aria-live="polite">
127 |           <span id="pomodoroModeText">专注</span>
128 |           <strong id="pomodoroTimeText">25:00</strong>
129 |           <small id="pomodoroStatusText">未开始</small>
130 |           <div class="pomodoro-progress"><i id="pomodoroProgressBar"></i></div>
131 |         </section>
132 |         <section class="pomodoro-settings">
133 |           <label><span>专注分钟</span><input id="pomodoroFocusInput" type="number" min="1" max="180" value="25" /></label>
134 |           <label><span>休息分钟</span><input id="pomodoroBreakInput" type="number" min="1" max="60" value="5" /></label>
135 |         </section>
136 |         <section class="pomodoro-presets">
137 |           <button type="button" data-pomodoro-preset="25,5">25 / 5</button>
138 |           <button type="button" data-pomodoro-preset="50,10">50 / 10</button>
139 |           <button type="button" data-pomodoro-preset="90,15">90 / 15</button>
140 |         </section>
141 |         <section class="pomodoro-actions">
142 |           <button type="button" data-pomodoro-action="start">开始专注</button>
143 |           <button type="button" data-pomodoro-action="pause">暂停</button>
144 |           <button type="button" data-pomodoro-action="resume">继续</button>
145 |           <button type="button" data-pomodoro-action="skip">跳过本轮</button>
146 |           <button type="button" data-pomodoro-action="stop" class="ghost">停止</button>
147 |         </section>
148 |         <footer class="pomodoro-foot">
149 |           <span id="pomodoroStatsText">已完成 0 个番茄钟</span>
150 |           <button type="button" data-pomodoro-action="focus-costume">预览学习模式</button>
151 |         </footer>
152 |       </form>
153 |     `;
154 |     panel.addEventListener("click", handlePanelClick);
155 |     panel.addEventListener("input", handlePanelInput);
156 |     document.body.append(panel);
157 |     renderPanel();
158 |     return panel;
159 |   }
160 | 
161 |   function renderPanel() {
162 |     if (!panel) return;
163 |     const now = Date.now();
164 |     const remaining = state.status === "running" ? Math.max(0, Math.ceil((state.endAt - now) / 1000)) : state.remainingSeconds;
165 |     const total = stageSeconds();
166 |     const percent = total ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 0;
167 |     panel.querySelector("#pomodoroModeText").textContent = modeLabel();
168 |     panel.querySelector("#pomodoroTimeText").textContent = formatTime(remaining);
169 |     panel.querySelector("#pomodoroStatusText").textContent = {
170 |       idle: "未开始",
171 |       running: `${modeLabel()}中 · 学习模式已启用`,
172 |       paused: "已暂停"
173 |     }[state.status] || "未开始";
174 |     panel.querySelector("#pomodoroProgressBar").style.width = `${percent}%`;
175 |     panel.querySelector("#pomodoroFocusInput").value = state.focusMinutes;
176 |     panel.querySelector("#pomodoroBreakInput").value = state.breakMinutes;
177 |     panel.querySelector("#pomodoroStatsText").textContent = `已完成 ${state.completedFocusCount || 0} 个番茄钟`;
178 |     panel.querySelector("[data-pomodoro-action='start']").disabled = state.status === "running";
179 |     panel.querySelector("[data-pomodoro-action='pause']").disabled = state.status !== "running";
180 |     panel.querySelector("[data-pomodoro-action='resume']").disabled = state.status !== "paused";
181 |     panel.querySelector("[data-pomodoro-action='skip']").disabled = state.status === "idle";
182 |     panel.querySelector("[data-pomodoro-action='stop']").disabled = state.status === "idle";
183 |   }
184 | 
185 |   function startStage(mode) {
186 |     const seconds = stageSeconds(mode);
187 |     setState({ mode, status: "running", remainingSeconds: seconds, endAt: Date.now() + seconds * 1000 });
188 |     ensureTicker();
189 |     notify("info", mode === "focus" ? "学习模式开始：专注时我会少打扰你。" : "休息开始：离开屏幕、喝水、活动一下。");
190 |   }
191 | 
192 |   function startFocus() {
193 |     const focusInput = panel?.querySelector("#pomodoroFocusInput");
194 |     const breakInput = panel?.querySelector("#pomodoroBreakInput");
195 |     state.focusMinutes = clampMinutes(focusInput?.value, state.focusMinutes);
196 |     state.breakMinutes = clampMinutes(breakInput?.value, state.breakMinutes);
197 |     startStage("focus");
198 |   }
199 | 
200 |   function pauseTimer() {
201 |     if (state.status !== "running") return;
202 |     const remainingSeconds = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
203 |     setState({ status: "paused", remainingSeconds, endAt: 0 });
204 |     notify("warning", "番茄钟已暂停。别暂停太久。");
205 |   }
206 | 
207 |   function resumeTimer() {
208 |     if (state.status !== "paused") return;
209 |     setState({ status: "running", endAt: Date.now() + state.remainingSeconds * 1000 });
210 |     ensureTicker();
211 |   }
212 | 
213 |   function stopTimer({ silent = false } = {}) {
214 |     setState({ status: "idle", mode: "focus", remainingSeconds: state.focusMinutes * 60, endAt: 0 });
215 |     if (!silent) notify("info", "番茄钟已停止。学习模式已退出。");
216 |   }
217 | 
218 |   async function finishStage() {
219 |     if (state.mode === "focus") {
220 |       const minutes = state.focusMinutes;
221 |       const completedFocusCount = Number(state.completedFocusCount || 0) + 1;
222 |       setState({ completedFocusCount, lastCompletedAt: new Date().toISOString() });
223 |       await track("focus_done", { minutes });
224 |       notify("success", `完成 ${minutes} 分钟专注。休息时间到了。`);
225 |       startStage("break");
226 |       return;
227 |     }
228 |     notify("success", "休息结束。准备进入下一轮专注。");
229 |     stopTimer({ silent: true });
230 |   }
231 | 
232 |   function skipStage() {
233 |     if (state.status === "idle") return;
234 |     finishStage().catch((error) => window.tablePetNotify?.capture?.(error, "跳过番茄钟失败"));
235 |   }
236 | 
237 |   function ensureTicker() {
238 |     if (ticker) return;
239 |     ticker = window.setInterval(() => {
240 |       if (state.status !== "running") {
241 |         renderPanel();
242 |         return;
243 |       }
244 |       const remainingSeconds = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
245 |       state.remainingSeconds = remainingSeconds;
246 |       saveState();
247 |       renderPanel();
248 |       dispatchPomodoroState();
249 |       if (remainingSeconds <= 0) {
250 |         finishStage().catch((error) => window.tablePetNotify?.capture?.(error, "番茄钟完成处理失败"));
251 |       }
252 |     }, 1000);
253 |   }
254 | 
255 |   function handlePanelClick(event) {
256 |     const preset = event.target.closest("button[data-pomodoro-preset]");
257 |     if (preset) {
258 |       const [focus, rest] = preset.dataset.pomodoroPreset.split(",").map(Number);
259 |       setState({ focusMinutes: focus, breakMinutes: rest, remainingSeconds: focus * 60, mode: "focus", status: "idle", endAt: 0 });
260 |       return;
261 |     }
262 | 
263 |     const actionButton = event.target.closest("button[data-pomodoro-action]");
264 |     if (!actionButton) return;
265 |     const action = actionButton.dataset.pomodoroAction;
266 |     if (action === "start") startFocus();
267 |     if (action === "pause") pauseTimer();
268 |     if (action === "resume") resumeTimer();
269 |     if (action === "skip") skipStage();
270 |     if (action === "stop") stopTimer();
271 |     if (action === "focus-costume") {
272 |       window.dispatchEvent(new CustomEvent("tablepet:pomodoro-state", { detail: { mode: "focus", status: "running", preview: true } }));
273 |       notify("info", "已预览学习模式立绘。可在设置图片里给“学习专注 / 学习休息”导入专用图片。", { timeout: 5200 });
274 |       window.setTimeout(dispatchPomodoroState, 2200);
275 |     }
276 |   }
277 | 
278 |   function handlePanelInput(event) {
279 |     if (!event.target.matches("#pomodoroFocusInput, #pomodoroBreakInput")) return;
280 |     if (state.status !== "idle") return;
281 |     const focusMinutes = clampMinutes(panel.querySelector("#pomodoroFocusInput")?.value, state.focusMinutes);
282 |     const breakMinutes = clampMinutes(panel.querySelector("#pomodoroBreakInput")?.value, state.breakMinutes);
283 |     setState({ focusMinutes, breakMinutes, remainingSeconds: focusMinutes * 60 });
284 |   }
285 | 
286 |   function openPanel() {
287 |     ensurePanel();
288 |     renderPanel();
289 |     panel.showModal();
290 |   }
291 | 
292 |   function install() {
293 |     ensureContextMenuEntry();
294 |     ensurePanel();
295 |     document.addEventListener("click", (event) => {
296 |       const button = event.target.closest("[data-pet-action='pomodoro']");
297 |       if (!button) return;
298 |       event.preventDefault();
299 |       event.stopPropagation();
300 |       event.stopImmediatePropagation();
301 |       document.querySelector("#petContextMenu")?.setAttribute("hidden", "");
302 |       openPanel();
303 |     }, true);
304 | 
305 |     if (state.status === "running") {
306 |       if (state.endAt <= Date.now()) {
307 |         finishStage().catch(() => undefined);
308 |       } else {
309 |         ensureTicker();
310 |       }
311 |     }
312 |     renderPanel();
313 |     dispatchPomodoroState();
314 |   }
315 | 
316 |   window.tablePetPomodoro = {
317 |     open: openPanel,
318 |     start: startFocus,
319 |     pause: pauseTimer,
320 |     resume: resumeTimer,
321 |     stop: stopTimer,
322 |     getState: () => ({ ...state })
323 |   };
324 | 
325 |   window.addEventListener("DOMContentLoaded", install);
326 |   window.addEventListener("beforeunload", () => {
327 |     if (ticker) window.clearInterval(ticker);
328 |   });
329 | })();
330 | 
```

## Skipped Files

- todeskpet/src/main/main.js [File is too large (105348 bytes). Limit: 60000 bytes.]
