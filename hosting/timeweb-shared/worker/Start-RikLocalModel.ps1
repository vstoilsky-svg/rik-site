[CmdletBinding()]
param(
    [string] $RuntimeRoot = 'C:\Users\user2\Documents\New project\project-memory\RUNTIME\rik-chat-llm',
    [int] $Port = 18088,
    [int] $Threads = 6
)

$ErrorActionPreference = 'Stop'
$server = 'C:\Users\user2\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe'
$model = Join-Path $RuntimeRoot 'qwen2.5-3b-instruct-q4_k_m.gguf'
$expectedSha256 = '626B4A6678B86442240E33DF819E00132D3BA7DDDFE1CDC4FBB18E0A9615C62D'

if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
    throw "llama-server.exe not found: $server"
}
if (-not (Test-Path -LiteralPath $model -PathType Leaf)) {
    throw "Model not found: $model"
}
$actualSha256 = (Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash
if ($actualSha256 -ne $expectedSha256) {
    throw "Model SHA256 mismatch: $actualSha256"
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use"
}

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
$stdout = Join-Path $RuntimeRoot 'llama-server.stdout.log'
$stderr = Join-Path $RuntimeRoot 'llama-server.stderr.log'
$arguments = @(
    '--model', ('"' + $model + '"'),
    '--host', '127.0.0.1',
    '--port', [string] $Port,
    '--ctx-size', '4096',
    '--threads', [string] $Threads,
    '--threads-batch', [string] $Threads,
    '--n-gpu-layers', '0',
    '--parallel', '1'
)

$process = Start-Process -FilePath $server -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
[IO.File]::WriteAllText((Join-Path $RuntimeRoot 'llama-server.pid'), [string] $process.Id, [Text.Encoding]::ASCII)

$deadline = (Get-Date).AddSeconds(90)
$health = $null
do {
    Start-Sleep -Milliseconds 750
    if ($process.HasExited) {
        $tail = Get-Content -LiteralPath $stderr -Tail 80 -ErrorAction SilentlyContinue
        throw "llama-server exited $($process.ExitCode): $($tail -join ' ')"
    }
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3 -ErrorAction Stop
    } catch {
        $health = $null
    }
} while ($null -eq $health -and (Get-Date) -lt $deadline)

if ($null -eq $health) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw 'llama-server health timeout'
}
$models = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -TimeoutSec 10
[pscustomobject]@{
    Pid = $process.Id
    Health = $health.status
    Models = @($models.data).Count
    ModelId = $models.data[0].id
    ModelSha256 = $actualSha256
}
