$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"
$env:KMP_DUPLICATE_LIB_OK = "TRUE"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$audioDir = Join-Path $root "audio"
$venvPython = Join-Path $audioDir ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

$settingsPath = Join-Path $root "todeskpet\data\settings.json"
$ttsProvider = "local"
if (Test-Path $settingsPath) {
  try {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    if ($settings.ttsProvider) {
      $ttsProvider = $settings.ttsProvider
    }
  } catch {
    # Ignore errors and default to local
  }
}

if ($ttsProvider -eq "streaming") {
  $ggufDir = Join-Path $root "qwensteamtts"
  Push-Location $ggufDir
  try {
    & $python "qwen_tts_gguf_api.py"
  } finally {
    Pop-Location
  }
} else {
  Push-Location $audioDir
  try {
    & $python "scripts\qwen_tts_api.py"
  } finally {
    Pop-Location
  }
}
