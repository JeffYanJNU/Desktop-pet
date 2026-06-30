$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$env:PYTHONIOENCODING = "utf-8"

Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $root "start-tts.ps1")
)

& (Join-Path $root "start-tablepet.ps1")
