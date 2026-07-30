# ASCII-only portable launcher.
param(
    [switch]$FrontendOnly,
    [int]$FrontendPort = 5173,
    [int]$BackendPort = 8011
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$runtime = Join-Path $root 'runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null

function Assert-Port-Free([int]$port) {
    $bound = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($bound) { throw "Port $port is already in use." }
}

if (-not (Test-Path -LiteralPath (Join-Path $frontend 'node_modules\vite\bin\vite.js'))) {
    throw 'Frontend dependencies are missing. Run INSTALL.ps1 first.'
}

Assert-Port-Free $FrontendPort

if (-not $FrontendOnly) {
    Assert-Port-Free $BackendPort
    $venvPython = Join-Path $backend '.venv\Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $venvPython)) {
        throw 'Backend venv is missing. Run INSTALL.ps1 first.'
    }
    $envFile = Join-Path $backend '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {
        throw 'backend\.env is missing.'
    }
    $required = @(
        'OPENROUTER_API_KEY',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SMTP_HOST',
        'SMTP_USERNAME',
        'SMTP_PASSWORD',
        'REQUEST_RECIPIENT'
    )
    $content = Get-Content -LiteralPath $envFile -Raw
    foreach ($key in $required) {
        if ($content -notmatch "(?m)^$key=(?!<SET_SEPARATELY>)(.+)$") {
            throw "Missing protected value in backend\.env: $key"
        }
    }

    $backendProcess = Start-Process -FilePath $venvPython `
        -ArgumentList @('-m','uvicorn','backend.app.main:app','--host','127.0.0.1','--port',"$BackendPort",'--log-level','warning') `
        -WorkingDirectory $backend `
        -RedirectStandardOutput (Join-Path $runtime 'backend.stdout.log') `
        -RedirectStandardError (Join-Path $runtime 'backend.stderr.log') `
        -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath (Join-Path $runtime 'backend.pid') -Value $backendProcess.Id -Encoding ascii
}

$frontendProcess = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run','dev','--','--host','0.0.0.0','--port',"$FrontendPort") `
    -WorkingDirectory $frontend `
    -RedirectStandardOutput (Join-Path $runtime 'frontend.stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'frontend.stderr.log') `
    -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $runtime 'frontend.pid') -Value $frontendProcess.Id -Encoding ascii

$deadline = (Get-Date).AddSeconds(40)
do {
    Start-Sleep -Milliseconds 500
    $frontReady = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
    $backReady = $FrontendOnly -or (Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue)
} until (($frontReady -and $backReady) -or ((Get-Date) -gt $deadline))

if (-not ($frontReady -and $backReady)) {
    throw 'Startup timed out. Inspect RUNNABLE\runtime logs.'
}

$frontListenerPid = (Get-NetTCPConnection -LocalPort $FrontendPort -State Listen |
    Select-Object -First 1 -ExpandProperty OwningProcess)
Set-Content -LiteralPath (Join-Path $runtime 'frontend.listener.pid') -Value $frontListenerPid -Encoding ascii
Set-Content -LiteralPath (Join-Path $runtime 'frontend.port') -Value $FrontendPort -Encoding ascii

if (-not $FrontendOnly) {
    $backListenerPid = (Get-NetTCPConnection -LocalPort $BackendPort -State Listen |
        Select-Object -First 1 -ExpandProperty OwningProcess)
    Set-Content -LiteralPath (Join-Path $runtime 'backend.listener.pid') -Value $backListenerPid -Encoding ascii
    Set-Content -LiteralPath (Join-Path $runtime 'backend.port') -Value $BackendPort -Encoding ascii
}

Write-Host "Frontend: http://localhost:$FrontendPort/"
if (-not $FrontendOnly) { Write-Host "Backend:  http://127.0.0.1:$BackendPort/" }
