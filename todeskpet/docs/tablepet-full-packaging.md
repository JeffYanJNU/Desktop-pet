# TablePet Full packaging

TablePet Full is the installer build for non-technical users. It packages the Electron desktop pet together with the runtime TTS resources from `audio` and `qwensteamtts`.

## User experience target

1. Install `TablePet-Full-Setup-<version>.exe`.
2. Open `TablePet Full` from the desktop shortcut.
3. Paste an API key in Settings if cloud chat is needed.
4. Use the built-in GGUF/ONNX TTS service without running PowerShell, npm, Python, or Git commands.

## Build commands

Run from `todeskpet`:

```powershell
npm install
npm run lint
npm test
npm run dist:full
```

The Full release package is written to:

```text
todeskpet/dist-full/TablePet-Full-Setup-0.1.0.zip
```

For a faster local packaging smoke test without creating the NSIS installer:

```powershell
npm run pack:full
```

## Runtime layout

In development, runtime resources are resolved from the repository root:

```text
D:\CODE\llmAPIbot\audio
D:\CODE\llmAPIbot\qwensteamtts
```

In the installed app, runtime resources are resolved from Electron's resources directory:

```text
<install-dir>\resources\audio
<install-dir>\resources\qwensteamtts
```

Writable user data is stored under Electron `userData`, not inside the install directory. This keeps settings, memory, mood, API keys, and portraits writable under `Program Files`.

## Notes

- Full includes the current Python virtual environment and the model files used by the app at runtime. Training data, logs, generated outputs, and unused model duplicates are excluded from the installer.
- The packaged GGUF/ONNX TTS mode keeps `model-base-small` only. `model-custom-small` is excluded, so the installed app exposes Voice Clone mode instead of CustomVoice.
- The Full package is too large for the NSIS single-file installer flow. NSIS fails while memory-mapping the generated multi-GB `nsis.7z` payload, so `dist:full` uses the zip target instead.
- Users should extract the zip and launch `TablePet Full.exe` from the extracted folder.
- If the copied virtual environment proves non-relocatable on a clean machine, the next hardening step is to replace `.venv` with a portable Python runtime or a PyInstaller-built TTS service executable.
- The installed app defaults to the `streaming` TTS provider because it is the better default for Windows users without CUDA.
- The Settings page can save provider API keys into the user's `.env` file, so users do not need to edit files manually.
