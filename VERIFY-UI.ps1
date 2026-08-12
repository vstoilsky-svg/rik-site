param(
  [string]$CssPath,
  [string]$SourceRoot
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($CssPath)) {
  $CssPath = Join-Path $root "frontend/src/home-sections.css"
} elseif (-not [System.IO.Path]::IsPathRooted($CssPath)) {
  $CssPath = Join-Path $root $CssPath
}
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  $SourceRoot = Join-Path $root "frontend/src"
} elseif (-not [System.IO.Path]::IsPathRooted($SourceRoot)) {
  $SourceRoot = Join-Path $root $SourceRoot
}
$css = Get-Content -LiteralPath $CssPath -Raw

function Get-CssRule([string]$selector) {
  $pattern = "(?s)" + [regex]::Escape($selector) + "\s*\{(?<body>[^}]*)\}"
  $match = [regex]::Match($css, $pattern)
  if (-not $match.Success) {
    throw "Missing CSS rule: $selector"
  }
  return $match.Groups["body"].Value
}

function Assert-Declaration([string]$rule, [string]$property, [string]$value) {
  $pattern = "(?i)(?:^|;)\s*" + [regex]::Escape($property) + "\s*:\s*" + [regex]::Escape($value) + "\s*(?:;|$)"
  if (-not [regex]::IsMatch($rule, $pattern)) {
    throw "Missing UI containment invariant: ${property}: $value"
  }
}

$mediaRule = Get-CssRule ".home-category-media"
$imageRule = Get-CssRule ".home-category-media img"

Assert-Declaration $mediaRule "min-height" "0"
Assert-Declaration $mediaRule "overflow" "hidden"
Assert-Declaration $imageRule "min-width" "0"
Assert-Declaration $imageRule "min-height" "0"
Assert-Declaration $imageRule "max-width" "100%"
Assert-Declaration $imageRule "max-height" "100%"
Assert-Declaration $imageRule "object-fit" "contain"

if (-not (Test-Path -LiteralPath $SourceRoot -PathType Container)) {
  throw "Missing frontend source root: $SourceRoot"
}

$layoutCssPath = Join-Path $SourceRoot "layout.css"
if (-not (Test-Path -LiteralPath $layoutCssPath -PathType Leaf)) {
  throw "Missing layout CSS: layout.css"
}
$layoutCss = Get-Content -LiteralPath $layoutCssPath -Raw -Encoding UTF8
foreach ($logoContract in @(
  @{ Selector = '.logo img'; Width = 'auto'; Height = '42px' },
  @{ Selector = '.footer-logo-img'; Width = 'auto'; Height = '38px' }
)) {
  $match = [regex]::Match($layoutCss, "(?s)" + [regex]::Escape($logoContract.Selector) + "\s*\{(?<body>[^}]*)\}")
  if (-not $match.Success) {
    throw "Missing intrinsic-aspect logo rule: $($logoContract.Selector)"
  }
  Assert-Declaration $match.Groups['body'].Value 'width' $logoContract.Width
  Assert-Declaration $match.Groups['body'].Value 'height' $logoContract.Height
}
$burgerMatch = [regex]::Match($layoutCss, "(?s)\.burger\s*\{(?<body>[^}]*)\}")
if (-not $burgerMatch.Success) {
  throw "Missing header burger rule"
}
Assert-Declaration $burgerMatch.Groups['body'].Value 'width' '48px'
Assert-Declaration $burgerMatch.Groups['body'].Value 'height' '48px'
if (-not [regex]::IsMatch($layoutCss, "(?s)@media\s*\(min-width:\s*1301px\)\s*and\s*\(max-width:\s*1500px\)\s*\{.*?\.header-phone\s*\{[^}]*display\s*:\s*none")) {
  throw "1301-1500px desktop header must hide the phone before it can clip the request CTA"
}
if (-not [regex]::IsMatch($layoutCss, "(?s)@media\s*\(max-width:\s*360px\)\s*\{.*?\.header-inner\s*\{[^}]*gap\s*:\s*12px")) {
  throw "<=360px header must reserve space between logo and control rail"
}

$richCssPath = Join-Path $SourceRoot "rich.css"
if (-not (Test-Path -LiteralPath $richCssPath -PathType Leaf)) {
  throw "Missing rich CSS for central section cards: rich.css"
}
$richCss = Get-Content -LiteralPath $richCssPath -Raw -Encoding UTF8
$centralCardButtonMatch = [regex]::Match($richCss, "(?s)\.cs-card-btn\s*\{(?<body>[^}]*)\}")
if (-not $centralCardButtonMatch.Success) {
  throw "Missing CSS rule: .cs-card-btn"
}
$centralCardButtonRule = $centralCardButtonMatch.Groups["body"].Value
Assert-Declaration $centralCardButtonRule "min-height" "4.1em"
if ([regex]::IsMatch($centralCardButtonRule, "(?i)(?:^|;)\s*height\s*:")) {
  throw "Central section labels must grow with their text; fixed height clips long mobile labels"
}
if ([regex]::IsMatch($centralCardButtonRule, "(?i)(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)")) {
  throw "Central section labels must not hide overflow"
}

$aboutVideoMatch = [regex]::Match($richCss, "(?s)\.about-video\s*\{(?<body>[^}]*)\}")
if (-not $aboutVideoMatch.Success) {
  throw "Missing responsive CSS rule: .about-video"
}
$aboutVideoRule = $aboutVideoMatch.Groups["body"].Value
Assert-Declaration $aboutVideoRule "display" "block"
Assert-Declaration $aboutVideoRule "width" "100%"
Assert-Declaration $aboutVideoRule "max-width" "100%"
Assert-Declaration $aboutVideoRule "height" "auto"

$closedTocMatch = [regex]::Match(
  $richCss,
  "(?s)\.toc-float\s*\{(?<body>[^}]*)\}"
)
if (-not $closedTocMatch.Success) {
  throw "Missing closed floating-TOC header-slot rule"
}
$closedTocRule = $closedTocMatch.Groups["body"].Value
Assert-Declaration $closedTocRule "left" "auto"
Assert-Declaration $closedTocRule "right" "88px"
Assert-Declaration $closedTocRule "top" "13px"
Assert-Declaration $closedTocRule "bottom" "auto"
$tocButtonMatch = [regex]::Match($richCss, "(?s)\.toc-burger\s*\{(?<body>[^}]*)\}")
if (-not $tocButtonMatch.Success) {
  throw "Missing TOC trigger rule"
}
Assert-Declaration $tocButtonMatch.Groups['body'].Value 'width' '48px'
Assert-Declaration $tocButtonMatch.Groups['body'].Value 'height' '48px'
if (-not [regex]::IsMatch($richCss, "(?s)@media\s*\(max-width:\s*560px\)\s*\{.*?\.toc-float:not\(\.is-open\)\s*\{[^}]*right\s*:\s*64px[^}]*top\s*:\s*12px")) {
  throw "Mobile TOC trigger must occupy its dedicated header-rail slot"
}

$catalogCssPath = Join-Path $SourceRoot "catalog.css"
if (-not (Test-Path -LiteralPath $catalogCssPath -PathType Leaf)) {
  throw "Missing catalog CSS: catalog.css"
}
$catalogCss = Get-Content -LiteralPath $catalogCssPath -Raw -Encoding UTF8
$edge320Catalog = [regex]::Match($catalogCss, "(?s)@media\s*\(\s*max-width\s*:\s*360px\s*\)\s*\{(?<body>.*?)\n\}")
if (-not $edge320Catalog.Success) {
  throw "Missing <=360px catalog containment rules"
}
foreach ($selector in @('.req-form', '.cert-grid', '.cert-card', '.product-head h1')) {
  if (-not $edge320Catalog.Groups["body"].Value.Contains($selector)) {
    throw "Missing <=360px catalog containment selector: $selector"
  }
}
if (-not [regex]::IsMatch($catalogCss, "(?s)@media\s*\(\s*max-width\s*:\s*760px\s*\).*?\.product-grid\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)")) {
  throw "Product grid must use a shrinkable single column below 760px"
}

$edge320Rich = [regex]::Match($richCss, "(?s)@media\s*\(\s*max-width\s*:\s*360px\s*\)\s*\{(?<body>.*?)\n\}")
if (-not $edge320Rich.Success) {
  throw "Missing <=360px rich-content containment rules"
}
foreach ($selector in @('.stats-band', '.production-fact-grid article', '.steps-list li', '.step-cta')) {
  if (-not $edge320Rich.Groups["body"].Value.Contains($selector)) {
    throw "Missing <=360px rich-content containment selector: $selector"
  }
}

$chatCssPath = Join-Path $SourceRoot "components\ChatWidget.css"
if (-not (Test-Path -LiteralPath $chatCssPath -PathType Leaf)) {
  throw "Missing chat widget CSS: components/ChatWidget.css"
}
$chatCss = Get-Content -LiteralPath $chatCssPath -Raw -Encoding UTF8
$closedChatMatch = [regex]::Match(
  $chatCss,
  "(?s)\.chat-widget:not\(\.is-open\)\s*\{(?<body>[^}]*)\}"
)
if (-not $closedChatMatch.Success) {
  throw "Missing closed chat header-slot rule"
}
$closedChatRule = $closedChatMatch.Groups["body"].Value
Assert-Declaration $closedChatRule "top" "7px"
Assert-Declaration $closedChatRule "bottom" "auto"
Assert-Declaration $closedChatRule "transform" "none"

$certModalMatch = [regex]::Match($catalogCss, "(?s)\.cert-modal\s*\{(?<body>[^}]*)\}")
if (-not $certModalMatch.Success -or
    -not $certModalMatch.Groups["body"].Value.Contains('width: min(1000px, calc(100vw - 48px))') -or
    -not $certModalMatch.Groups["body"].Value.Contains('position: relative')) {
  throw "Certificate modal width must account for both 24px backdrop gutters"
}

$chatComponentPath = Join-Path $SourceRoot "components\ChatWidget.jsx"
if (-not (Test-Path -LiteralPath $chatComponentPath -PathType Leaf)) {
  throw "Missing chat widget component: components/ChatWidget.jsx"
}
$chatComponent = Get-Content -LiteralPath $chatComponentPath -Raw -Encoding UTF8
foreach ($requiredEscapeContract in @(
  'event.key !== "Escape"',
  'setIsOpen(false)',
  'toggleRef.current?.focus()',
  'document.addEventListener("keydown", closeOnEscape)',
  'document.removeEventListener("keydown", closeOnEscape)'
)) {
  if (-not $chatComponent.Contains($requiredEscapeContract)) {
    throw "Chat Escape accessibility contract missing: $requiredEscapeContract"
  }
}

$headerComponentPath = Join-Path $SourceRoot "components\Header.tsx"
if (-not (Test-Path -LiteralPath $headerComponentPath -PathType Leaf)) {
  throw "Missing header component: components/Header.tsx"
}
$headerComponent = Get-Content -LiteralPath $headerComponentPath -Raw -Encoding UTF8
foreach ($requiredEscapeContract in @(
  'if (event.key !== "Escape") return',
  'setOpen(false)',
  'setMobilePanel("root")',
  'burgerRef.current?.focus()',
  'document.addEventListener("keydown", closeOnEscape)',
  'document.removeEventListener("keydown", closeOnEscape)',
  'ref={burgerRef}'
)) {
  if (-not $headerComponent.Contains($requiredEscapeContract)) {
    throw "Header Escape accessibility contract missing: $requiredEscapeContract"
  }
}

function Get-SourceText([string]$relativePath) {
  $path = Join-Path $SourceRoot $relativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing semantic UI source: $relativePath"
  }
  return Get-Content -LiteralPath $path -Raw -Encoding UTF8
}

$appSource = Get-SourceText "App.tsx"
foreach ($eagerRoute in @('import Home from "./pages/Home"', 'import Catalog from "./pages/Catalog"')) {
  if (-not $appSource.Contains($eagerRoute)) {
    throw "Above-the-fold route must be eagerly available: $eagerRoute"
  }
}

$productViewSource = Get-SourceText "pages/ProductView.tsx"
$productHeroSizes = '(max-width: 760px) calc(100vw - 84px), 600px'
if (-not $productViewSource.Contains($productHeroSizes)) {
  throw "Product responsive sizes must match the rendered mobile media slot"
}
foreach ($productHeadingContract in @(
  'import { productDisplayName } from "../seo/routes"',
  '<h1>{productDisplayName(p)}</h1>'
)) {
  if (-not $productViewSource.Contains($productHeadingContract)) {
    throw "Hydrated product H1 must reuse the canonical SEO display name: $productHeadingContract"
  }
}

$catalogSource = Get-SourceText "pages/Catalog.tsx"
if ($catalogSource.Contains('aria-label={p.name}') -or $catalogSource.Contains('alt={p.name}')) {
  throw "Catalog cards must derive accessible names from visible labels and keep duplicate thumbnails decorative"
}

$techSheetsSource = Get-SourceText "pages/TechSheets.tsx"
$foundPositionsLabel = ((@(
  0x041D, 0x0430, 0x0439, 0x0434, 0x0435, 0x043D, 0x043E, 0x0020,
  0x043F, 0x043E, 0x0437, 0x0438, 0x0446, 0x0438, 0x0439
) | ForEach-Object { [char]$_ }) -join '') + ': {resultCount}'
if (-not $techSheetsSource.Contains($foundPositionsLabel)) {
  throw "Technical-sheet result counter must identify that it counts positions"
}

$safeHtmlSource = Get-SourceText "components/SafeHtml.tsx"
foreach ($tableHeaderContract in @('RETURN_DOM: true', 'header.scope = isColumnHeaderRow ? "col" : "row"', 'cell.replaceWith(header)')) {
  if (-not $safeHtmlSource.Contains($tableHeaderContract)) {
    throw "Imported table header normalization contract missing: $tableHeaderContract"
  }
}

$semanticFailures = New-Object System.Collections.Generic.List[string]
$jsxFiles = @(Get-ChildItem -LiteralPath $SourceRoot -Recurse -File | Where-Object { $_.Extension -in @(".tsx", ".jsx") })
$jsxText = ($jsxFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 }) -join "`n"
$mainOpenCount = ([regex]::Matches($jsxText, "<main(?:\s|>)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
$mainCloseCount = ([regex]::Matches($jsxText, "</main\s*>", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
if ($mainOpenCount -ne 1 -or $mainCloseCount -ne 1) {
  [void]$semanticFailures.Add("Expected one application <main> landmark, found openings=$mainOpenCount closings=$mainCloseCount")
}

$nestedMainPages = @(
  "pages/Home.tsx",
  "pages/ForContractors.tsx",
  "pages/Production.tsx",
  "pages/TechSheets.tsx"
)
foreach ($relativePath in $nestedMainPages) {
  $source = Get-SourceText $relativePath
  if ([regex]::IsMatch($source, "</?main(?:\s|>)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    [void]$semanticFailures.Add("Page-level <main> would nest inside App layout: $relativePath")
  }
}

$headingContracts = @(
  [pscustomobject]@{ Path = "pages/BimLibrary.tsx"; Marker = 'id="bim-library-section-title"'; Anchor = 'className="bim-lib"' },
  [pscustomobject]@{ Path = "pages/Careers.tsx"; Marker = 'id="careers-benefits-section-title"'; Anchor = 'className="tiles"' },
  [pscustomobject]@{ Path = "pages/Certificates.tsx"; Marker = 'id="certificates-list-section-title"'; Anchor = 'className="cert-grid"' },
  [pscustomobject]@{ Path = "pages/Contacts.tsx"; Marker = 'id="contacts-info-section-title"'; Anchor = 'className="contacts-grid"' },
  [pscustomobject]@{ Path = "pages/ForDesigners.tsx"; Marker = 'id="designer-resources-section-title"'; Anchor = 'className="tiles"' },
  [pscustomobject]@{ Path = "pages/News.tsx"; Marker = 'id="company-news-section-title"'; Anchor = 'className="news-list"' },
  [pscustomobject]@{ Path = "pages/Questionnaires.tsx"; Marker = 'id="questionnaires-list-section-title"'; Anchor = 'className="cert-grid"' },
  [pscustomobject]@{ Path = "pages/Services.tsx"; Marker = 'id="services-list-section-title"'; Anchor = 'className="tiles"' }
)
foreach ($contract in $headingContracts) {
  $source = Get-SourceText $contract.Path
  $renderIndex = $source.IndexOf("export default function", [System.StringComparison]::Ordinal)
  $headingIndex = if ($renderIndex -ge 0) { $source.IndexOf($contract.Marker, $renderIndex, [System.StringComparison]::Ordinal) } else { -1 }
  $anchorIndex = if ($renderIndex -ge 0) { $source.IndexOf($contract.Anchor, $renderIndex, [System.StringComparison]::Ordinal) } else { -1 }
  if ($renderIndex -lt 0 -or $headingIndex -lt 0 -or $anchorIndex -lt 0 -or $headingIndex -gt $anchorIndex) {
    [void]$semanticFailures.Add("Missing h2 section heading before h3 collection: $($contract.Path)")
  }
}

$indexCssPath = Join-Path $SourceRoot "index.css"
if (-not (Test-Path -LiteralPath $indexCssPath -PathType Leaf)) {
  [void]$semanticFailures.Add("Missing global CSS for .sr-only headings: index.css")
} else {
  $indexCss = Get-Content -LiteralPath $indexCssPath -Raw -Encoding UTF8
  $srOnlyMatch = [regex]::Match($indexCss, "(?s)\.sr-only\s*\{(?<body>[^}]*)\}")
  if (-not $srOnlyMatch.Success) {
    [void]$semanticFailures.Add("Missing accessible .sr-only utility in index.css")
  } else {
    $srOnlyBody = $srOnlyMatch.Groups["body"].Value
    foreach ($requiredDeclaration in @("position\s*:\s*absolute", "overflow\s*:\s*hidden", "clip-path\s*:\s*inset\(50%\)", "white-space\s*:\s*nowrap")) {
      if (-not [regex]::IsMatch($srOnlyBody, $requiredDeclaration, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
        [void]$semanticFailures.Add("Incomplete .sr-only utility, missing: $requiredDeclaration")
      }
    }
  }
}

if ($semanticFailures.Count -gt 0) {
  throw ("Semantic UI invariants failed:`n - " + ($semanticFailures -join "`n - "))
}

Write-Host "UI regression guards passed: category containment; <=320px component containment and product headings; unclipped central-card labels; responsive about video; intrinsic-aspect logos; 48px header controls; desktop/mobile header rail; closed TOC/chat header slots; certificate modal gutters; chat Escape focus return; one main landmark; heading contracts 8/8; accessible sr-only utility."
