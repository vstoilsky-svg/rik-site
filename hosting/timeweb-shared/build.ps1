[CmdletBinding()]
param(
    [string] $OutputRoot = 'C:\RIK-SITE-DEPLOY',
    [string] $ContainerName = 'rik-site-timeweb-final',
    [string] $ReleaseName = ('rik-site-timeweb-shared-' + (Get-Date -Format 'yyyyMMdd-HHmmss')),
    [switch] $SkipNpmCi
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$frontendRoot = Join-Path $repoRoot 'frontend'
$releaseRoot = Join-Path $OutputRoot $ReleaseName
$zipPath = $releaseRoot + '.zip'

if (Test-Path -LiteralPath $releaseRoot) {
    throw "Release directory already exists: $releaseRoot"
}
if (Test-Path -LiteralPath $zipPath) {
    throw "Release archive already exists: $zipPath"
}

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

Push-Location $frontendRoot
try {
    if (-not $SkipNpmCi) {
        & npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'frontend build failed' }
} finally {
    Pop-Location
}

$publicRoot = Join-Path $releaseRoot 'public_html_new'
$appRoot = Join-Path $releaseRoot 'rik_app'
New-Item -ItemType Directory -Path $publicRoot | Out-Null
New-Item -ItemType Directory -Path $appRoot | Out-Null

Copy-Item -Path (Join-Path $frontendRoot 'dist\*') -Destination $publicRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'public_html\.htaccess') -Destination (Join-Path $publicRoot '.htaccess')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'public_html\api') -Destination (Join-Path $publicRoot 'api') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'rik_app\lib') -Destination (Join-Path $appRoot 'lib') -Recurse
New-Item -ItemType Directory -Path (Join-Path $appRoot 'data') | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'rik_app\data\.gitignore') -Destination (Join-Path $appRoot 'data\.gitignore')
Copy-Item -LiteralPath (Join-Path $repoRoot 'backend\prompts') -Destination (Join-Path $appRoot 'prompts') -Recurse
Copy-Item -LiteralPath (Join-Path $repoRoot 'backend\knowledge') -Destination (Join-Path $appRoot 'knowledge') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'DEPLOY-INSTRUCTIONS.txt') -Destination (Join-Path $releaseRoot 'DEPLOY-INSTRUCTIONS.txt')

$containerEnv = & docker inspect $ContainerName --format '{{range .Config.Env}}{{println .}}{{end}}'
if ($LASTEXITCODE -ne 0) { throw "Cannot inspect container: $ContainerName" }
$environment = @{}
foreach ($line in $containerEnv) {
    if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
        $environment[$matches[1]] = $matches[2]
    }
}

$required = @(
    'OPENROUTER_API_KEY', 'OPENROUTER_MODELS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_FROM',
    'SMTP_USE_TLS', 'SMTP_USE_SSL', 'REQUEST_RECIPIENT'
)
foreach ($name in $required) {
    if (-not $environment.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($environment[$name])) {
        throw "Required container variable is missing: $name"
    }
}

$exampleLines = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'rik_app\config.env.example') -Encoding utf8
$configLines = foreach ($line in $exampleLines) {
    if ($line -match '^([A-Z][A-Z0-9_]*)=') {
        $name = $matches[1]
        if ($environment.ContainsKey($name)) {
            $value = [string] $environment[$name]
            if ($value.Contains("`r") -or $value.Contains("`n")) {
                throw "Container variable contains a newline: $name"
            }
            "$name=$value"
            continue
        }
    }
    $line
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Join-Path $appRoot 'config.env'), [string[]] $configLines, $utf8NoBom)

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve source commit' }
$files = Get-ChildItem -LiteralPath $releaseRoot -Recurse -File | Sort-Object FullName
$fileEntries = foreach ($file in $files) {
    [ordered]@{
        path = $file.FullName.Substring($releaseRoot.Length + 1).Replace('\', '/')
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}
$manifest = [ordered]@{
    release = $ReleaseName
    sourceCommit = $sourceCommit
    builtAtUtc = [DateTime]::UtcNow.ToString('o')
    fileCount = $fileEntries.Count
    totalBytes = ($files | Measure-Object Length -Sum).Sum
    files = $fileEntries
}
[System.IO.File]::WriteAllText(
    (Join-Path $releaseRoot 'DEPLOY-MANIFEST.json'),
    ($manifest | ConvertTo-Json -Depth 5),
    $utf8NoBom
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $releaseRoot,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($requiredEntry in @('public_html_new/.htaccess', 'public_html_new/api/index.php', 'rik_app/config.env', 'DEPLOY-MANIFEST.json')) {
        if ($entryNames -notcontains $requiredEntry) {
            throw "Release archive is missing: $requiredEntry"
        }
    }
    if ($entryNames -contains 'public_html_new/config.env') {
        throw 'Secret config was placed inside public_html_new'
    }
} finally {
    $archive.Dispose()
}

Write-Output ('RELEASE_DIRECTORY=' + $releaseRoot)
Write-Output ('RELEASE_ARCHIVE=' + $zipPath)
Write-Output ('ARCHIVE_BYTES=' + (Get-Item -LiteralPath $zipPath).Length)
Write-Output ('ARCHIVE_SHA256=' + (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash)
Write-Output ('SOURCE_COMMIT=' + $sourceCommit)
Write-Output ('SECRETS_COPIED_OUTSIDE_PUBLIC_ROOT=true')
