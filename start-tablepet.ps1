$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Join-Path $root "tablePet"

if (-not (Test-Path (Join-Path $appDir ".env")) -and (Test-Path (Join-Path $appDir ".env.example"))) {
  Copy-Item (Join-Path $appDir ".env.example") (Join-Path $appDir ".env")
  Write-Host "Created tablePet\.env from .env.example. Fill API keys before cloud model calls."
}

Push-Location $appDir
try {
  if (-not (Test-Path "node_modules")) {
    npm install
  }
  npm start
}
finally {
  Pop-Location
}
