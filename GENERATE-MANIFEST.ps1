# Regenerate MANIFEST.csv from the complete intended Git worktree.
$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$root = $PSScriptRoot
$manifestPath = Join-Path $root 'MANIFEST.csv'

$relativePaths = @(
    & git -C $root -c core.quotepath=false ls-files --cached --others --exclude-standard |
        Where-Object { $_ -and ($_ -ne 'MANIFEST.csv') } |
        Sort-Object -Unique
)
if ($LASTEXITCODE -ne 0) { throw "git ls-files failed: $LASTEXITCODE" }

$existingPaths = @(
    $relativePaths | Where-Object {
        Test-Path -LiteralPath (Join-Path $root $_) -PathType Leaf
    }
)
$blobs = @($existingPaths | & git -C $root hash-object --stdin-paths)
if ($LASTEXITCODE -ne 0 -or $blobs.Count -ne $existingPaths.Count) {
    throw "git hash-object failed: Paths=$($existingPaths.Count) Blobs=$($blobs.Count) Exit=$LASTEXITCODE"
}

$rows = for ($index = 0; $index -lt $existingPaths.Count; $index++) {
    [pscustomobject]@{
        RelPath = $existingPaths[$index].Replace('\', '/')
        GitBlob = $blobs[$index].Trim()
    }
}

$rows | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8
Write-Host "MANIFEST generated: Rows=$($rows.Count)"
