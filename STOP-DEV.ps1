# Stops only PIDs created by START-DEV.ps1.
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot 'runtime'
$seen = @{}

foreach ($name in 'frontend.listener','backend.listener','frontend','backend') {
    $pidFile = Join-Path $runtime ($name + '.pid')
    if (-not (Test-Path -LiteralPath $pidFile)) { continue }
    $savedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    if ($seen.ContainsKey($savedPid)) {
        Remove-Item -LiteralPath $pidFile -Force
        continue
    }
    $seen[$savedPid] = $true
    $proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $savedPid) -ErrorAction SilentlyContinue
    if ($proc) {
        $cmd = [string]$proc.CommandLine
        if ($cmd -notmatch '(vite|uvicorn|npm|node)') {
            Write-Warning "PID $savedPid no longer belongs to the recorded dev process; it was not stopped."
        } else {
            Stop-Process -Id $savedPid -Force
        }
    }
    Remove-Item -LiteralPath $pidFile -Force
}

foreach ($portFile in 'frontend.port','backend.port') {
    $path = Join-Path $runtime $portFile
    if (Test-Path -LiteralPath $path) {
        $port = [int](Get-Content -LiteralPath $path -Raw)
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
            throw "Recorded port $port is still listening; inspect RUNNABLE\runtime logs."
        }
        Remove-Item -LiteralPath $path -Force
    }
}

Write-Host 'Recorded dev processes stopped.'
