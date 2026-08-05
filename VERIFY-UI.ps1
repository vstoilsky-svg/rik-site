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

function Get-SourceText([string]$relativePath) {
  $path = Join-Path $SourceRoot $relativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing semantic UI source: $relativePath"
  }
  return Get-Content -LiteralPath $path -Raw -Encoding UTF8
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

Write-Host "UI regression guards passed: category containment; one main landmark; heading contracts 8/8; accessible sr-only utility."
