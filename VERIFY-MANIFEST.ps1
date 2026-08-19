# Verifies hashes and exact parity with the intended Git worktree.
$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$root = $PSScriptRoot
$manifestPath = Join-Path $root 'MANIFEST.csv'

function Invoke-GitHashObject([string[]]$Paths) {
    if ($Paths.Count -eq 0) { return @() }
    $token = [Guid]::NewGuid().ToString('N')
    $inputPath = Join-Path ([System.IO.Path]::GetTempPath()) "rik-hash-input-$token.txt"
    $outputPath = Join-Path ([System.IO.Path]::GetTempPath()) "rik-hash-output-$token.txt"
    $errorPath = Join-Path ([System.IO.Path]::GetTempPath()) "rik-hash-error-$token.txt"
    try {
        # No trailing newline: Git for Linux treats the final empty record as
        # an empty path, while Git for Windows silently ignores it.
        [System.IO.File]::WriteAllText($inputPath, ($Paths -join "`n"), $utf8)
        $process = Start-Process -FilePath (Get-Command git).Source -ArgumentList @('hash-object', '--stdin-paths') `
            -WorkingDirectory $root -RedirectStandardInput $inputPath -RedirectStandardOutput $outputPath `
            -RedirectStandardError $errorPath -NoNewWindow -Wait -PassThru
        if ($process.ExitCode -ne 0) {
            $message = [System.IO.File]::ReadAllText($errorPath, $utf8).Trim()
            throw "git hash-object failed: Exit=$($process.ExitCode) $message"
        }
        return @([System.IO.File]::ReadAllLines($outputPath, $utf8))
    }
    finally {
        Remove-Item -LiteralPath $inputPath, $outputPath, $errorPath -Force -ErrorAction SilentlyContinue
    }
}
$rows = Import-Csv -LiteralPath $manifestPath
$missing = 0
$mismatch = 0
$manifestPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$entries = [System.Collections.Generic.List[object]]::new()

foreach ($row in $rows) {
    $relativePath = $row.RelPath.Replace('\', '/')
    if (-not $manifestPaths.Add($relativePath)) {
        Write-Host "DUPLICATE $relativePath"
        $mismatch++
        continue
    }
    $nativePath = $relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $path = Join-Path $root $nativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        $tag = (& git -C $root -c core.quotepath=false ls-files -t -- $relativePath).Trim()
        $stage = (& git -C $root -c core.quotepath=false ls-files -s -- $relativePath).Trim()
        if ($LASTEXITCODE -eq 0 -and $tag -match '^S ' -and $stage -match '^[0-9]+ ([0-9a-f]{40}) [0-9]+\t' -and $matches[1] -eq $row.GitBlob) {
            continue
        }
        Write-Host "MISSING $($row.RelPath)"
        $missing++
        continue
    }
    $entries.Add([pscustomobject]@{ Row = $row; RelPath = $relativePath })
}

$blobs = @(Invoke-GitHashObject -Paths @($entries.RelPath))
if ($blobs.Count -ne $entries.Count) {
    throw "git hash-object failed: Paths=$($entries.Count) Blobs=$($blobs.Count)"
}
for ($index = 0; $index -lt $entries.Count; $index++) {
    if ($blobs[$index].Trim() -ne $entries[$index].Row.GitBlob) {
        Write-Host "MISMATCH $($entries[$index].Row.RelPath)"
        $mismatch++
    }
}

$actualPaths = @(
    & git -C $root -c core.quotepath=false ls-files --cached --others --exclude-standard |
        Where-Object { $_ -and ($_ -ne 'MANIFEST.csv') } |
        ForEach-Object { $_.Replace('\', '/') } |
        Sort-Object -Unique
)
if ($LASTEXITCODE -ne 0) { throw "git ls-files failed: $LASTEXITCODE" }

$extra = 0
foreach ($relativePath in $actualPaths) {
    if (-not $manifestPaths.Contains($relativePath)) {
        Write-Host "UNLISTED $relativePath"
        $extra++
    }
}

$trackedMissing = 0
foreach ($relativePath in $manifestPaths) {
    if ($actualPaths -notcontains $relativePath) {
        Write-Host "NOT-IN-WORKTREE $relativePath"
        $trackedMissing++
    }
}

$forbidden = @(
    $actualPaths | Where-Object {
        ($_ -match '(^|/)\.env$') -or
        ($_ -match '(?i)\.bak($|[-0-9])')
    }
)
foreach ($relativePath in $forbidden) {
    Write-Host "FORBIDDEN $relativePath"
}

Write-Host "Rows=$($rows.Count) Actual=$($actualPaths.Count) Missing=$missing Mismatch=$mismatch Unlisted=$extra NotInWorktree=$trackedMissing Forbidden=$($forbidden.Count)"
if (($missing -ne 0) -or ($mismatch -ne 0) -or ($extra -ne 0) -or ($trackedMissing -ne 0) -or ($forbidden.Count -ne 0)) {
    exit 1
}
exit 0
