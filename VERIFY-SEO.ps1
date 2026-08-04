$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$public = Join-Path $root 'frontend\public'

$required = @('robots.txt', 'sitemap.xml', 'llms.txt')
foreach ($name in $required) {
    $path = Join-Path $public $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing SEO file: $name" }
}

$robots = Get-Content -LiteralPath (Join-Path $public 'robots.txt') -Raw
if ($robots -notmatch '(?m)^User-agent:\s*\*$') { throw 'robots.txt has no wildcard user-agent' }
if ($robots -notmatch '(?m)^Sitemap:\s*https://rik-vent\.ru/sitemap\.xml$') { throw 'robots.txt has no canonical sitemap URL' }

[xml]$sitemap = Get-Content -LiteralPath (Join-Path $public 'sitemap.xml') -Raw
$urls = @($sitemap.urlset.url.loc)
if ($urls.Count -lt 90) { throw "Sitemap is incomplete: URLs=$($urls.Count)" }
foreach ($url in @('https://rik-vent.ru/', 'https://rik-vent.ru/products', 'https://rik-vent.ru/product/centralnye-ustanovki')) {
    if ($urls -notcontains $url) { throw "Sitemap misses $url" }
}

$index = Get-Content -LiteralPath (Join-Path $root 'frontend\index.html') -Raw
foreach ($needle in @('name="description"', 'name="robots"', 'rel="canonical"', 'property="og:title"', 'property="og:description"')) {
    if (-not $index.Contains($needle)) { throw "index.html misses $needle" }
}

$nginx = Get-Content -LiteralPath (Join-Path $root 'docker\nginx.conf') -Raw
if ($nginx -notmatch 'try_files \$uri =404;') { throw 'nginx static 404 guard is absent' }

function Convert-HexToRgb([string]$hex) {
    $value = $hex.TrimStart('#')
    return @(
        [Convert]::ToInt32($value.Substring(0, 2), 16),
        [Convert]::ToInt32($value.Substring(2, 2), 16),
        [Convert]::ToInt32($value.Substring(4, 2), 16)
    )
}
function Get-Luminance([string]$hex) {
    $channels = Convert-HexToRgb $hex | ForEach-Object {
        $normalized = $_ / 255
        if ($normalized -le 0.03928) { $normalized / 12.92 } else { [Math]::Pow((($normalized + 0.055) / 1.055), 2.4) }
    }
    return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2]
}
$brandLum = Get-Luminance '#0b5fc7'
$whiteLum = Get-Luminance '#ffffff'
$ratio = ([Math]::Max($brandLum, $whiteLum) + 0.05) / ([Math]::Min($brandLum, $whiteLum) + 0.05)
if ($ratio -lt 4.5) { throw "Primary CTA contrast is below WCAG AA: $ratio" }

Write-Host "SEO guard PASS: URLs=$($urls.Count) CTAContrast=$([Math]::Round($ratio, 2))"
