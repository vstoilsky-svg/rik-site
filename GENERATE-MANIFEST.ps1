# Regenerate MANIFEST.csv from the complete intended Git worktree.
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

$relativePaths = @(
    & git -C $root -c core.quotepath=false ls-files --cached --others --exclude-standard |
        Where-Object { $_ -and ($_ -ne 'MANIFEST.csv') } |
        Sort-Object -Unique
)
if ($LASTEXITCODE -ne 0) { throw "git ls-files failed: $LASTEXITCODE" }

$existingPaths = @($relativePaths | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) -PathType Leaf })
$sparsePaths = @($relativePaths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root $_) -PathType Leaf) })
$blobs = @(Invoke-GitHashObject -Paths @($existingPaths))
if ($blobs.Count -ne $existingPaths.Count) {
    throw "git hash-object failed: Paths=$($existingPaths.Count) Blobs=$($blobs.Count)"
}

$blobByPath = @{}
for ($index = 0; $index -lt $existingPaths.Count; $index++) {
    $blobByPath[$existingPaths[$index]] = $blobs[$index].Trim()
}
foreach ($relativePath in $sparsePaths) {
    $tag = (& git -C $root -c core.quotepath=false ls-files -t -- $relativePath).Trim()
    if ($LASTEXITCODE -ne 0 -or $tag -notmatch '^S ') {
        throw "Tracked path is missing outside sparse-checkout: $relativePath"
    }
    $stage = (& git -C $root -c core.quotepath=false ls-files -s -- $relativePath).Trim()
    if ($LASTEXITCODE -ne 0 -or $stage -notmatch '^[0-9]+ ([0-9a-f]{40}) [0-9]+\t') {
        throw "Cannot resolve sparse index blob: $relativePath"
    }
    $blobByPath[$relativePath] = $matches[1]
}

$rows = foreach ($relativePath in $relativePaths) {
    [pscustomobject]@{
        RelPath = $relativePath.Replace('\', '/')
        GitBlob = $blobByPath[$relativePath]
    }
}

$csv = @($rows | ConvertTo-Csv -NoTypeInformation)
[System.IO.File]::WriteAllText($manifestPath, (($csv -join "`n") + "`n"), $utf8)
Write-Host "MANIFEST generated: Rows=$($rows.Count)"
