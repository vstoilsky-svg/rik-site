# ASCII-only portable installer.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw 'Node.js is not installed. Install Node.js 24.x.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm is not installed.'
}

$pythonLauncher = $null
if (Get-Command py.exe -ErrorAction SilentlyContinue) {
    $pythonLauncher = 'py.exe'
} elseif (Get-Command python.exe -ErrorAction SilentlyContinue) {
    $pythonLauncher = 'python.exe'
} else {
    throw 'Python 3.12+ is not installed.'
}

Push-Location $frontend
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }
} finally {
    Pop-Location
}

$venv = Join-Path $backend '.venv'
if (-not (Test-Path -LiteralPath (Join-Path $venv 'Scripts\python.exe'))) {
    if ($pythonLauncher -eq 'py.exe') {
        & py.exe -3 -m venv $venv
    } else {
        & python.exe -m venv $venv
    }
    if ($LASTEXITCODE -ne 0) { throw "venv creation failed: $LASTEXITCODE" }
}

$venvPython = Join-Path $venv 'Scripts\python.exe'
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed: $LASTEXITCODE" }
& $venvPython -m pip install -r (Join-Path $backend 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw "pip install failed: $LASTEXITCODE" }

$envFile = Join-Path $backend '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath (Join-Path $backend '.env.example') -Destination $envFile
}

New-Item -ItemType Directory -Path (Join-Path $backend 'data') -Force | Out-Null
Write-Host 'Install complete. Fill backend\.env, then run VERIFY.ps1.'

