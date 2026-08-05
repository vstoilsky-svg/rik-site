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

# Every public file type must be served by nginx's fail-closed static location.
# This prevents real assets (for example MP4/RFA/RVT) from falling through to
# the directory-route handler and becoming user-visible 404 pages.
$nginxPath = Join-Path $PSScriptRoot 'docker\nginx.conf'
if (-not (Test-Path -LiteralPath $nginxPath -PathType Leaf)) {
    throw "Missing nginx config: $nginxPath"
}
$nginxLines = @(Get-Content -LiteralPath $nginxPath -Encoding UTF8)
$failClosedStaticLines = @($nginxLines | Where-Object { $_ -match 'location\s+~\*' -and $_ -match 'pdf' })
if ($failClosedStaticLines.Count -ne 1) {
    throw "Expected exactly one fail-closed nginx static extension location"
}
$failClosedStaticLine = $failClosedStaticLines[0]
$extensionTokens = @{
    '.ico' = 'ico'
    '.jpg' = 'jpe?g'
    '.mp4' = 'mp4'
    '.pdf' = 'pdf'
    '.png' = 'png'
    '.pptx' = 'pptx?'
    '.rfa' = 'rfa'
    '.rvt' = 'rvt'
    '.svg' = 'svg'
    '.txt' = 'txt'
    '.webp' = 'webp'
    '.xlsx' = 'xlsx?'
    '.xml' = 'xml'
}
$publicExtensions = @(
    Get-ChildItem -LiteralPath $public -Recurse -File -Force |
        ForEach-Object { $_.Extension.ToLowerInvariant() } |
        Sort-Object -Unique
)
foreach ($extension in $publicExtensions) {
    if (-not $extensionTokens.ContainsKey($extension)) {
        $violations.Add("unmapped-public-extension:$extension")
        continue
    }
    $token = $extensionTokens[$extension]
    if (-not $failClosedStaticLine.Contains($token)) {
        $violations.Add("nginx-static-extension-missing:${extension}:$token")
    }
}

function Assert-ResponsiveCardDerivatives([string]$SourcePath, [string]$PublicPrefix) {
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Missing responsive-card data source: $SourcePath"
    }

    $source = Get-Content -LiteralPath $SourcePath -Raw -Encoding UTF8
    $pattern = '(?m)^ {4}photo:\s*"(?<path>/' + [regex]::Escape($PublicPrefix.TrimStart('/')) + '/[^"\r\n]+\.png)"'
    $references = @([regex]::Matches($source, $pattern) | ForEach-Object { $_.Groups['path'].Value } | Sort-Object -Unique)
    if ($references.Count -eq 0) {
        throw "No responsive-card source references found in $SourcePath"
    }

    foreach ($reference in $references) {
        $relativeOriginal = $reference.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $originalPath = Join-Path $public $relativeOriginal
        $stem = [System.IO.Path]::Combine(
            [System.IO.Path]::GetDirectoryName($originalPath),
            [System.IO.Path]::GetFileNameWithoutExtension($originalPath)
        )
        foreach ($width in @(320, 640)) {
            $derivativePath = "$stem-card-$width.webp"
            if (-not (Test-Path -LiteralPath $derivativePath -PathType Leaf)) {
                $violations.Add("missing-responsive-card:$($reference.TrimStart('/')):$width")
            } elseif ((Get-Item -LiteralPath $derivativePath).Length -le 0) {
                $violations.Add("empty-responsive-card:$($reference.TrimStart('/')):$width")
            }
        }
    }

    return $references.Count
}

function Assert-GenericResponsiveDerivatives([string]$SourcePath) {
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Missing generic responsive-image data source: $SourcePath"
    }

    $source = Get-Content -LiteralPath $SourcePath -Raw -Encoding UTF8
    $block = [regex]::Match(
        $source,
        '(?s)GENERIC_RESPONSIVE_IMAGE_SOURCES\s*=\s*\[(?<items>.*?)\]\s*as const;'
    )
    if (-not $block.Success) {
        throw "Generic responsive-image source list is malformed: $SourcePath"
    }

    $references = @(
        [regex]::Matches($block.Groups['items'].Value, '"(?<path>/photo/catalog/[^"\r\n]+\.png)"') |
            ForEach-Object { $_.Groups['path'].Value } |
            Sort-Object -Unique
    )
    if ($references.Count -ne 18) {
        throw "Generic responsive-image source census drifted: expected=18 actual=$($references.Count)"
    }

    foreach ($reference in $references) {
        $relativeOriginal = $reference.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $originalPath = Join-Path $public $relativeOriginal
        if (-not (Test-Path -LiteralPath $originalPath -PathType Leaf)) {
            $violations.Add("missing-generic-original:$($reference.TrimStart('/'))")
            continue
        }
        $originalBytes = (Get-Item -LiteralPath $originalPath).Length
        $stem = [System.IO.Path]::Combine(
            [System.IO.Path]::GetDirectoryName($originalPath),
            [System.IO.Path]::GetFileNameWithoutExtension($originalPath)
        )
        foreach ($width in @(320, 640, 1280)) {
            $derivativePath = "$stem-responsive-$width.webp"
            if (-not (Test-Path -LiteralPath $derivativePath -PathType Leaf)) {
                $violations.Add("missing-generic-responsive:$($reference.TrimStart('/')):$width")
            } else {
                $derivativeBytes = (Get-Item -LiteralPath $derivativePath).Length
                if ($derivativeBytes -le 0) {
                    $violations.Add("empty-generic-responsive:$($reference.TrimStart('/')):$width")
                } elseif ($derivativeBytes -ge $originalBytes) {
                    $violations.Add("oversized-generic-responsive:$($reference.TrimStart('/')):$width")
                }
            }
        }
    }

    return $references.Count
}

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

$centralCount = Assert-ResponsiveCardDerivatives `
    (Join-Path $PSScriptRoot 'frontend\src\data\central-sections.ts') `
    '/photo/central-sections'
$roundCount = Assert-ResponsiveCardDerivatives `
    (Join-Path $PSScriptRoot 'frontend\src\data\duct-products.generated.ts') `
    '/photo/duct-products/round'
$genericCount = Assert-GenericResponsiveDerivatives `
    (Join-Path $PSScriptRoot 'frontend\src\data\responsive-images.ts')

$optimizedLogos = @(
    [pscustomobject]@{ Source = 'logo.png'; Target = 'logo-header.webp'; Component = 'frontend\src\components\Header.tsx' },
    [pscustomobject]@{ Source = 'logo-white.png'; Target = 'logo-footer.webp'; Component = 'frontend\src\components\Footer.tsx' }
)
foreach ($logo in $optimizedLogos) {
    $sourcePath = Join-Path $public $logo.Source
    $targetPath = Join-Path $public $logo.Target
    $componentPath = Join-Path $PSScriptRoot $logo.Component
    if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
        $violations.Add("missing-optimized-logo:$($logo.Target)")
        continue
    }
    if ((Get-Item -LiteralPath $targetPath).Length -ge (Get-Item -LiteralPath $sourcePath).Length) {
        $violations.Add("optimized-logo-not-smaller:$($logo.Target)")
    }
    $componentSource = Get-Content -LiteralPath $componentPath -Raw -Encoding UTF8
    if (-not $componentSource.Contains("/$($logo.Target)")) {
        $violations.Add("optimized-logo-not-referenced:$($logo.Target)")
    }
}

$violations = @($violations | Sort-Object -Unique)
if ($violations.Count -gt 0) {
    $details = $violations -join [Environment]::NewLine
    throw "Public hygiene verification failed: forbidden=$($violations.Count)$([Environment]::NewLine)$details"
}

$files = @(Get-ChildItem -LiteralPath $public -Recurse -File -Force)
$bytes = [int64](($files | Measure-Object -Property Length -Sum).Sum)
Write-Host "VERIFY-PUBLIC: OK | files=$($files.Count) | bytes=$bytes | extensions=$($publicExtensions.Count) nginx-covered | forbidden=0 | responsive-cards=$($centralCount + $roundCount) (central=$centralCount round=$roundCount) | generic-responsive=$genericCount"
