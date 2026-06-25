# Table Pet

本地智能桌面精灵原型。它用 Electron 运行一个透明悬浮窗，支持情绪标签驱动立绘、口语化聊天、屏幕文本上下文输入、本地 GPT-SoVITS 语音播报，以及导入自定义立绘图片。

## 运行

```powershell
npm install
npm start
```

## 环境文件

项目根目录的 `.env` 用来存放 DeepSeek、硅基流动 API key 和本地 GPT-SoVITS 地址：

```env
DEEPSEEK_API_KEY=你的 DeepSeek key
SILICONFLOW_API_KEY=你的硅基流动 key
SOVITS_URL=http://127.0.0.1:9880/tts
GPT_SOVITS_DIR=D:\GPT-SoVITS
GPT_SOVITS_PYTHON=python
GPT_SOVITS_API_SCRIPT=api_v2.py
SOVITS_REF_AUDIO_PATH=D:\voices\ref.wav
SOVITS_PROMPT_TEXT=参考音频里说的原文
SOVITS_PROMPT_LANG=zh
SOVITS_TEXT_LANG=zh
SOVITS_TEXT_SPLIT_METHOD=cut5
SOVITS_MEDIA_TYPE=wav
SOVITS_SPEED_FACTOR=1
PET_TTS_PROVIDER=local
QWEN_TTS_MODE=custom
QWEN_TTS_LANGUAGE=Japanese
QWEN_TTS_REF_AUDIO=
QWEN_TTS_REF_TEXT=
QWEN_TTS_CLONE_ZERO_SHOT=true
SILICONFLOW_TTS_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_TTS_MODEL=FunAudioLLM/CosyVoice2-0.5B
SILICONFLOW_TTS_VOICE=FunAudioLLM/CosyVoice2-0.5B:anna
SILICONFLOW_TTS_REF_AUDIO_URL=
SILICONFLOW_TTS_REF_TEXT=
SILICONFLOW_TTS_RESPONSE_FORMAT=mp3
SILICONFLOW_TTS_SPEED=1
SILICONFLOW_TTS_SAMPLE_RATE=44100
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
PET_PORTRAIT=armsStanding
```

如果当前供应商没有配置 API key，应用会使用本地规则回复，方便先验证桌面精灵 UI 和情绪切换。

## 设置面板

点击窗口右上角的齿轮按钮可以调整：

- API 供应商：DeepSeek 或硅基流动
- 使用的模型
- 本地 GPT-SoVITS 部署目录、Python 命令、API 脚本、服务地址、参考音频、参考文本、语言、切分方式、音频格式和语速
- 桌面精灵系统提示词
- 内置抱臂站立立绘会按 Neutral、Happy、Thinking、Confused、Encouraging 自动切换
- 导入自定义立绘图片

API key 不会出现在设置表单里，只从 `.env` 读取。供应商、模型、提示词、GPT-SoVITS 地址和立绘会保存到 Electron 的用户数据目录，重启后仍然生效。

TTS 可以在设置面板的“语音服务”里切换“本地微调模型”和“硅基流动 API”。硅基流动的模型、密钥、固定音色以及克隆参考音频地址只从 `.env` 读取；如果填写 `SILICONFLOW_TTS_REF_AUDIO_URL`，会作为动态音色克隆参考音频发送，并可用 `SILICONFLOW_TTS_REF_TEXT` 填写参考音频原文。

本地 Qwen3-TTS 的“合成模式”可以在 `CustomVoice / 内置音色` 和 `Voice Clone / 参考音频克隆` 之间切换。克隆模式会使用设置里的参考音频、参考原文和 Zero-shot 选项，并调用本地 `/tts` 的 `generate_voice_clone`；请把本地模型路径切到 Base 模型权重，CustomVoice 微调模型不支持克隆接口。

本地 Qwen3-TTS 的“播报语言”下拉使用 qwensteamtts 的语言选项：Chinese、English、Japanese、Korean、German、French、Russian、Italian、Portuguese、Spanish、beijing_dialect 和 sichuan_dialect。保存后会同时影响聊天回复的目标语言段和发往 `/tts` 的 `language` 参数。

## 本地部署 GPT-SoVITS

先把 GPT-SoVITS 克隆并按它的官方说明安装依赖、下载模型权重。确认你能在 GPT-SoVITS 项目目录里启动 API：

```powershell
cd D:\GPT-SoVITS
python api_v2.py
```

如果你使用虚拟环境，可以把 `GPT_SOVITS_PYTHON` 设置成虚拟环境里的 Python，例如：

```env
GPT_SOVITS_PYTHON=D:\GPT-SoVITS\.venv\Scripts\python.exe
```

在桌面精灵设置面板里可以直接：

- 选择本地 GPT-SoVITS 项目目录
- 填写 Python 命令和 API 脚本名
- 点击“启动服务”让桌面精灵拉起本地 `api_v2.py`
- 选择参考音频并填写参考音频原文

桌面精灵播报时会把回复正文发送到本地 GPT-SoVITS `/tts` 接口，本地服务返回音频后由前端直接播放；如果本地服务没有启动或配置不完整，会自动回退到系统语音。

## 回复协议

模型回复必须以下列标签之一开头：

- `[Emotion: Neutral]`
- `[Emotion: Happy]`
- `[Emotion: Thinking]`
- `[Emotion: Confused]`
- `[Emotion: Encouraging]`

渲染层会解析标签并切换立绘状态；纯文本会优先送入本地 GPT-SoVITS，未配置或调用失败时回退到系统语音。
