$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$public = Join-Path $frontend 'public'
$dist = Join-Path $frontend 'dist'
$utf8Strict = [System.Text.UTF8Encoding]::new($false, $true)

foreach ($name in @('robots.txt', 'sitemap.xml', 'llms.txt')) {
    $path = Join-Path $public $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing SEO file: $name" }
}

$seoScript = Join-Path $frontend 'scripts\seo-artifacts.mjs'
& node $seoScript --check
if ($LASTEXITCODE -ne 0) { throw "SEO source check failed: $LASTEXITCODE" }
$routesJson = & node $seoScript --routes-json
if ($LASTEXITCODE -ne 0) { throw "SEO route export failed: $LASTEXITCODE" }
$routes = $routesJson | ConvertFrom-Json
$routes = @($routes)
if ($routes.Count -ne 137) { throw "Unexpected route count: $($routes.Count)" }

$robots = Get-Content -LiteralPath (Join-Path $public 'robots.txt') -Raw -Encoding UTF8
if (-not $robots.Contains('User-agent: *')) { throw 'robots.txt has no wildcard user-agent' }
if (-not $robots.Contains('Disallow: /api/')) { throw 'robots.txt does not protect /api/' }
if (-not $robots.Contains('Sitemap: https://rik-vent.ru/sitemap.xml')) { throw 'robots.txt has no canonical sitemap URL' }

[xml]$sitemap = Get-Content -LiteralPath (Join-Path $public 'sitemap.xml') -Raw -Encoding UTF8
$urls = @($sitemap.urlset.url.loc | ForEach-Object { [string]$_ })
$expectedUrls = @($routes | ForEach-Object {
    if ($_.path -eq '/') { 'https://rik-vent.ru/' } else { "https://rik-vent.ru$($_.path)/" }
})
$missingUrls = @($expectedUrls | Where-Object { $urls -notcontains $_ })
$extraUrls = @($urls | Where-Object { $expectedUrls -notcontains $_ })
if ($urls.Count -ne $routes.Count -or $missingUrls.Count -ne 0 -or $extraUrls.Count -ne 0) {
    throw "Sitemap parity failed: routes=$($routes.Count) urls=$($urls.Count) missing=$($missingUrls.Count) extra=$($extraUrls.Count)"
}
if (($urls | Sort-Object -Unique).Count -ne $urls.Count) { throw 'Sitemap contains duplicate URLs' }

if (-not (Test-Path -LiteralPath $dist -PathType Container)) { throw 'frontend/dist is absent; run npm run build first' }
$routeIndexFiles = @(Get-ChildItem -LiteralPath $dist -Recurse -File -Filter 'index.html')
if ($routeIndexFiles.Count -ne $routes.Count) {
    throw "Prerender parity failed: routes=$($routes.Count) indexFiles=$($routeIndexFiles.Count)"
}

foreach ($route in $routes) {
    $target = if ($route.path -eq '/') {
        Join-Path $dist 'index.html'
    } else {
        $relative = ([string]$route.path).TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        Join-Path (Join-Path $dist $relative) 'index.html'
    }
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing prerendered route: $($route.path)" }
    $html = Get-Content -LiteralPath $target -Raw -Encoding UTF8
    $preloadPattern = '<link rel="preload" as="image" href="(?<href>[^"]+)"(?: imagesrcset="(?<srcset>[^"]+)" imagesizes="(?<sizes>[^"]+)")? fetchpriority="high" />'
    $preloadMatches = @([regex]::Matches($html, $preloadPattern))
    $expectedPreload = if ($route.path -eq '/' -or $route.path -eq '/products') {
        '/photo/home-hero-light.webp'
    } elseif ($route.path.StartsWith('/product/')) {
        if ($route.criticalImage) { [string]$route.criticalImage } else { [string]$route.image }
    } else {
        $null
    }
    if ($expectedPreload) {
        $isResponsive = [bool]$route.responsiveCriticalImage
        $expectedHref = if ($isResponsive) { $expectedPreload -replace '\.png$', '-responsive-640.webp' } else { $expectedPreload }
        if ($preloadMatches.Count -ne 1 -or $preloadMatches[0].Groups['href'].Value -ne $expectedHref) {
            throw "Critical image preload mismatch: $($route.path)"
        }
        if ($isResponsive) {
            $expectedSrcset = "$($expectedPreload -replace '\.png$', '-responsive-640.webp') 640w, $($expectedPreload -replace '\.png$', '-responsive-1280.webp') 1280w"
            $expectedSizes = '(max-width: 760px) calc(100vw - 84px), 600px'
            if (
                $preloadMatches[0].Groups['srcset'].Value -ne $expectedSrcset -or
                $preloadMatches[0].Groups['sizes'].Value -ne $expectedSizes
            ) {
                throw "Responsive critical image preload mismatch: $($route.path)"
            }
        } elseif ($preloadMatches[0].Groups['srcset'].Success -or $preloadMatches[0].Groups['sizes'].Success) {
            throw "Responsive preload attributes leaked into non-responsive route: $($route.path)"
        }
    } elseif ($preloadMatches.Count -ne 0) {
        throw "Critical image preload leaked into route: $($route.path)"
    }
    $titleMatch = [regex]::Match($html, '<title>(?<value>[\s\S]*?)</title>')
    if (-not $titleMatch.Success -or [System.Net.WebUtility]::HtmlDecode($titleMatch.Groups['value'].Value) -ne $route.title) {
        throw "Raw title mismatch: $($route.path)"
    }
    $canonicalMatch = [regex]::Match($html, '<link rel="canonical" href="(?<value>[^"]+)"\s*/>')
    $expectedCanonical = if ($route.path -eq '/') { 'https://rik-vent.ru/' } else { "https://rik-vent.ru$($route.path)/" }
    if (-not $canonicalMatch.Success -or $canonicalMatch.Groups['value'].Value -ne $expectedCanonical) {
        throw "Raw canonical mismatch: $($route.path)"
    }
    $jsonMatch = [regex]::Match($html, '<script id="rik-structured-data" type="application/ld\+json">(?<value>[\s\S]*?)</script>')
    if (-not $jsonMatch.Success) { throw "JSON-LD missing: $($route.path)" }
    $null = $jsonMatch.Groups['value'].Value | ConvertFrom-Json
    $jsonPosition = $html.IndexOf('id="rik-structured-data"', [System.StringComparison]::Ordinal)
    $modulePosition = $html.IndexOf('<script type="module"', [System.StringComparison]::Ordinal)
    if ($jsonPosition -lt 0 -or $modulePosition -lt 0 -or $jsonPosition -gt $modulePosition) {
        throw "Server SEO metadata is not before the module script: $($route.path)"
    }
}

$notFoundPath = Join-Path $dist '404.html'
if (-not (Test-Path -LiteralPath $notFoundPath -PathType Leaf)) { throw 'Branded 404.html is absent' }
$notFound = Get-Content -LiteralPath $notFoundPath -Raw -Encoding UTF8
if ($notFound -notmatch 'name="robots" content="noindex, nofollow"' -or $notFound -notmatch '404') {
    throw '404.html lacks noindex or branded content'
}

$llmsPath = Join-Path $public 'llms.txt'
try { $llms = $utf8Strict.GetString([System.IO.File]::ReadAllBytes($llmsPath)) } catch { throw "llms.txt is not strict UTF-8: $($_.Exception.Message)" }
$llmsPrefix = '# ' + [char]0x0420 + [char]0x0418 + [char]0x041A
if (-not $llms.StartsWith($llmsPrefix)) { throw 'llms.txt content is corrupted' }

$nginx = Get-Content -LiteralPath (Join-Path $root 'docker\nginx.conf') -Raw -Encoding UTF8
foreach ($needle in @(
    'try_files $uri =404;',
    'try_files $uri $uri/ =404;',
    'error_page 404 /404.html;',
    'charset utf-8;',
    'max-age=31536000, immutable',
    'max-age=2592000, stale-while-revalidate=86400',
    'location = /product/ventilyatorrrry-kryshnye-krv-v',
    'return 301 /product/ventilyatory-kryshnye-krv-v/;'
)) {
    if (-not $nginx.Contains($needle)) { throw "nginx SEO guard is absent: $needle" }
}
if ($nginx.Contains('try_files $uri $uri/ /index.html')) { throw 'Legacy SPA soft-404 fallback is still present' }
if ($nginx.Contains('try_files $uri/index.html =404;')) { throw 'Legacy no-slash route serving is still present' }
if ([regex]::IsMatch($nginx, '(?s)location\s*=\s*/products/\s*\{\s*return\s+301\s+/products;\s*\}')) {
    throw 'Legacy trailing-slash removal redirect is still present'
}
if (-not [regex]::IsMatch($nginx, '(?s)location\s*=\s*/product/ventilyatorrrry-kryshnye-krv-v\s*\{\s*return\s+301\s+/product/ventilyatory-kryshnye-krv-v/;\s*\}')) {
    throw 'Legacy product redirect must target the trailing-slash canonical URL'
}

$productView = Get-Content -LiteralPath (Join-Path $frontend 'src\pages\ProductView.tsx') -Raw -Encoding UTF8
if ($productView -notmatch '<img src=\{p\.photo\} alt=\{p\.name\} loading="eager" fetchPriority="high" decoding="async" />') {
    throw 'Primary product LCP image is not eagerly prioritized'
}
if ($productView -match '<img src=\{p\.photo\} alt=\{p\.name\} loading="lazy"') {
    throw 'Primary product LCP image regressed to lazy loading'
}

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

Write-Host "SEO guard PASS: routes=$($routes.Count) prerendered=$($routeIndexFiles.Count) CTAContrast=$([Math]::Round($ratio, 2))"
