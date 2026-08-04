# ASCII-only portable verification.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath (Join-Path $frontend 'node_modules'))) {
    throw 'Run INSTALL.ps1 first.'
}
if (-not (Test-Path -LiteralPath $venvPython)) {
    throw 'Run INSTALL.ps1 first.'
}

Push-Location $frontend
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed: $LASTEXITCODE" }
    & npm.cmd run lint
    if ($LASTEXITCODE -ne 0) { throw "Frontend lint failed: $LASTEXITCODE" }
} finally {
    Pop-Location
}

& $venvPython -m compileall -q (Join-Path $backend 'backend')
if ($LASTEXITCODE -ne 0) { throw "Python compile failed: $LASTEXITCODE" }
& $venvPython -m pip check
if ($LASTEXITCODE -ne 0) { throw "pip check failed: $LASTEXITCODE" }

$env:PYTHONPATH = $backend
& $venvPython -m unittest discover -s (Join-Path $backend 'tests') -v
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed: $LASTEXITCODE" }

& (Join-Path $root 'VERIFY-MANIFEST.ps1')
if ($LASTEXITCODE -ne 0) { throw "Manifest verification failed: $LASTEXITCODE" }

Write-Host 'VERIFY PASS.'
