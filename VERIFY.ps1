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

Write-Host 'VERIFY PASS. Review known audit findings before production use.'

