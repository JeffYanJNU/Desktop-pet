$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$audioDir = Join-Path $root "audio"
$venvPython = Join-Path $audioDir ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

Push-Location $audioDir
try {
  & $python "scripts\qwen_tts_api.py"
}
finally {
  Pop-Location
}
