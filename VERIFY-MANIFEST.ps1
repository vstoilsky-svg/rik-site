# Verifies hashes and exact parity with the intended Git worktree.
$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$root = $PSScriptRoot
$manifestPath = Join-Path $root 'MANIFEST.csv'
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
        Write-Host "MISSING $($row.RelPath)"
        $missing++
        continue
    }
    $entries.Add([pscustomobject]@{ Row = $row; RelPath = $relativePath })
}

$blobs = @($entries.RelPath | & git -C $root hash-object --stdin-paths)
if ($LASTEXITCODE -ne 0 -or $blobs.Count -ne $entries.Count) {
    throw "git hash-object failed: Paths=$($entries.Count) Blobs=$($blobs.Count) Exit=$LASTEXITCODE"
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
        Where-Object {
            $nativePath = $_.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            Test-Path -LiteralPath (Join-Path $root $nativePath) -PathType Leaf
        } |
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
