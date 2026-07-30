# Verifies all source files captured by MANIFEST.csv. Extra runtime files are allowed.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$manifestPath = Join-Path $root 'MANIFEST.csv'
$rows = Import-Csv -LiteralPath $manifestPath
$missing = 0
$mismatch = 0

foreach ($row in $rows) {
    $path = Join-Path $root $row.RelPath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Write-Host "MISSING $($row.RelPath)"
        $missing++
        continue
    }
    $item = Get-Item -LiteralPath $path
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if (($item.Length -ne [int64]$row.Bytes) -or ($hash -ne $row.SHA256)) {
        Write-Host "MISMATCH $($row.RelPath)"
        $mismatch++
    }
}

Write-Host "Rows=$($rows.Count) Missing=$missing Mismatch=$mismatch"
if (($missing -ne 0) -or ($mismatch -ne 0)) {
    exit 1
}
exit 0

