param(
    [string]$PublicRoot
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($PublicRoot)) {
    $PublicRoot = Join-Path $PSScriptRoot 'frontend\public'
} elseif (-not [System.IO.Path]::IsPathRooted($PublicRoot)) {
    $PublicRoot = Join-Path $PSScriptRoot $PublicRoot
}

if (-not (Test-Path -LiteralPath $PublicRoot -PathType Container)) {
    throw "Public root does not exist: $PublicRoot"
}

$public = (Resolve-Path -LiteralPath $PublicRoot).Path
$violations = [System.Collections.Generic.List[string]]::new()

function Get-PublicRelativePath([System.IO.FileSystemInfo]$Item) {
    return $Item.FullName.Substring($public.Length + 1).Replace('\', '/')
}

foreach ($directory in Get-ChildItem -LiteralPath $public -Recurse -Directory -Force) {
    $relative = Get-PublicRelativePath $directory
    if ($relative -match '(?i)(^|/)_claude-(ready|rework)(/|$)') {
        $violations.Add("directory:$relative")
    }
}

foreach ($file in Get-ChildItem -LiteralPath $public -Recurse -File -Force) {
    $relative = Get-PublicRelativePath $file
    $isForbidden =
        $relative -match '(?i)(^|/)_claude-(ready|rework)(/|$)' -or
        $file.Name -ieq '_flagged.txt' -or
        $file.Name -ilike '*.prev' -or
        $file.Name -ilike '*.verification.json' -or
        $file.Extension -ieq '.csv'

    if ($isForbidden) {
        $violations.Add("file:$relative")
    }
}

$violations = @($violations | Sort-Object -Unique)
if ($violations.Count -gt 0) {
    $details = $violations -join [Environment]::NewLine
    throw "Public hygiene verification failed: forbidden=$($violations.Count)$([Environment]::NewLine)$details"
}

$files = @(Get-ChildItem -LiteralPath $public -Recurse -File -Force)
$bytes = [int64](($files | Measure-Object -Property Length -Sum).Sum)
Write-Host "VERIFY-PUBLIC: OK | files=$($files.Count) | bytes=$bytes | forbidden=0"
