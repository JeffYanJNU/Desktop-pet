# llmAPIbot

本仓库是一组本地 LLM 桌面伴侣与语音实验项目，核心目标是把聊天模型、角色风格、桌面宠物 UI、长期记忆、角色包和本地 TTS 语音串起来。

## 项目结构

| 目录 | 作用 |
| --- | --- |
| `tablePet/` | Electron 桌面宠物应用。提供透明悬浮窗、聊天、设置面板、长期记忆、角色包、角色 RAG 和语音播放。 |
| `tablePet/characters/` | 文件夹式角色包。每个角色可声明提示词、语料目录、默认语音和立绘映射。 |
| `audio/` | Qwen3-TTS 本地语音服务、测试脚本、数据处理和微调相关脚本。 |
| `llmapi/` | 本地 Tkinter API 调试窗口，只用于直接测试 OpenAI 兼容模型接口。QQ bot 功能已移除。 |
| `GALskill/` | 月姬文本语料、清洗脚本和中英日语料构建材料。 |
| `Arcueid_aru/` | 爱尔奎特立绘素材资源。 |

## 快速启动

启动桌宠：

```powershell
cd d:\CODE\llmAPIbot
.\start-tablepet.ps1
```

启动本地 TTS：

```powershell
cd d:\CODE\llmAPIbot
.\start-tts.ps1
```

同时启动 TTS 和桌宠：

```powershell
cd d:\CODE\llmAPIbot
.\start-all.ps1
```

首次运行会根据 `tablePet/.env.example` 创建 `tablePet/.env`。至少填写一个模型供应商的 key：

```env
DEEPSEEK_API_KEY=your_deepseek_key_here
SILICONFLOW_API_KEY=your_siliconflow_key_here
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
```

## 桌宠能力

- 多角色包：当前内置 `arcueid`，可在设置面板中切换角色。
- 角色 RAG：角色包可指向自己的语料目录，模型回复时自动注入相关风格上下文。
- 长期记忆：支持用户画像、摘要、对话记忆，以及项目、生活、偏好分区。
- 记忆治理：支持标签、敏感记忆标记、敏感清理、导入和导出。
- TTS 队列：本地或 SiliconFlow TTS 请求会串行执行，并缓存相同文本和声音配置的音频。
- 语音中断：播放中会停止音频；推理中会停止本地 TTS 进程，下次播报自动重启。

## 本地 Qwen3-TTS

桌宠默认连接：

```text
http://127.0.0.1:8765/tts
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

如需关闭自动启动本地 TTS，可在 `tablePet/.env` 中设置：

```env
PET_AUTO_START_TTS=false
```

## 角色包

角色包位于：

```text
tablePet/characters/<角色ID>/character.json
```

基本结构：

```json
{
  "id": "arcueid",
  "name": "爱尔奎特",
  "description": "角色说明",
  "corpusDir": "../../scene-emotion-happy-user-reply-zh",
  "systemPrompt": "角色提示词",
  "moodPortraitPaths": {},
  "ttsDefaults": {
    "provider": "local",
    "qwenTtsMode": "custom",
    "qwenTtsLanguage": "Japanese",
    "qwenTtsSpeaker": "my_voice"
  }
}
```

新增角色时复制一个目录并修改 `character.json` 即可。

## 常用命令

```powershell
cd d:\CODE\llmAPIbot\tablePet
npm run lint
npm test
```

本地 API 调试窗口：

```powershell
cd d:\CODE\llmAPIbot\llmapi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python chat_window.py
```

## 注意事项

- 不要提交真实 `.env` 密钥、用户记忆、语音样本、日志或模型权重。
- 根目录 `.gitignore` 已统一忽略依赖、运行数据、日志、权重和生成音频。
- QQ bot 功能已完全移除；仓库不再依赖 `qq-botpy`，也不再需要 QQ 开放平台凭据。
