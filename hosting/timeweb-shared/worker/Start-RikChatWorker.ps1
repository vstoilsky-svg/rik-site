[CmdletBinding()]
param(
    [string] $SecretsPath = 'C:\Users\user2\Documents\New project\project-memory\RUNTIME\rik-chat-llm\worker-secrets.dpapi',
    [string] $WorkerScript = '',
    [string] $Python = 'C:\Users\user2\AppData\Local\Programs\Python\Python312\python.exe',
    [switch] $Health,
    [switch] $Once
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($WorkerScript)) {
    $WorkerScript = Join-Path $PSScriptRoot 'rik_chat_worker.py'
}
if (-not (Test-Path -LiteralPath $SecretsPath -PathType Leaf)) {
    throw "Protected worker config not found: $SecretsPath"
}
if (-not (Test-Path -LiteralPath $WorkerScript -PathType Leaf)) {
    throw "Worker script not found: $WorkerScript"
}
if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) {
    throw "Python not found: $Python"
}

Add-Type -AssemblyName System.Security
$protected = [IO.File]::ReadAllBytes($SecretsPath)
$plain = [Security.Cryptography.ProtectedData]::Unprotect(
    $protected,
    [Text.Encoding]::UTF8.GetBytes('RIK-SITE-CHAT-WORKER-V1'),
    [Security.Cryptography.DataProtectionScope]::CurrentUser
)
try {
    $config = [Text.Encoding]::UTF8.GetString($plain) | ConvertFrom-Json
} finally {
    [Array]::Clear($plain, 0, $plain.Length)
}

$relayUri = [Uri] $config.RelayBaseUrl
$inferenceUri = [Uri] $config.InferenceBaseUrl
if ($relayUri.Scheme -ne 'https' -or $relayUri.Host -ne 'rik-vent.ru' -or $relayUri.AbsolutePath.TrimEnd('/') -ne '/api/chat-worker') {
    throw 'Protected relay URL failed the allowlist'
}
if ($inferenceUri.Scheme -ne 'https' -or $inferenceUri.Host -ne 'openrouter.ai' -or $inferenceUri.AbsolutePath.TrimEnd('/') -ne '/api/v1') {
    throw 'Protected inference URL failed the allowlist'
}
if ([string]::IsNullOrWhiteSpace($config.RelayToken) -or [string]::IsNullOrWhiteSpace($config.InferenceApiKey)) {
    throw 'Protected worker config is incomplete'
}

$mutex = [Threading.Mutex]::new($false, 'Local\RIKSiteChatWorker')
$ownsMutex = $false
try {
    $ownsMutex = $mutex.WaitOne(0)
    if (-not $ownsMutex) {
        throw 'RIK Site Chat Worker is already running'
    }
    $env:RIK_CHAT_WORKER_BASE_URL = [string] $config.RelayBaseUrl
    $env:RIK_CHAT_WORKER_TOKEN = [string] $config.RelayToken
    $env:RIK_CHAT_INFERENCE_BASE_URL = [string] $config.InferenceBaseUrl
    $env:RIK_CHAT_INFERENCE_API_KEY = [string] $config.InferenceApiKey
    $env:RIK_CHAT_INFERENCE_MODELS = [string] $config.Models
    $arguments = @($WorkerScript)
    if ($Health) { $arguments += '--health' }
    if ($Once) { $arguments += '--once' }
    & $Python @arguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:RIK_CHAT_WORKER_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:RIK_CHAT_INFERENCE_API_KEY -ErrorAction SilentlyContinue
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
